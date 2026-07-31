import { describe, expect, it } from "vitest";
import {
  combatMight,
  damageContributed,
  determineCombatResult,
  healAllUnits,
  isKilled,
  legalDamageAssignments,
  minimumLethal,
  resolveCombatDamage,
  tierOf,
} from "../combat";
import { grant, makeUnit, stateWithObjects } from "./fixtures";

/** Every assignment returned, normalized to a comparable {id: amount} map. */
function asMaps(assignments: ReturnType<typeof legalDamageAssignments>) {
  return assignments.map((a) =>
    Object.fromEntries(a.assignments.map((x) => [x.targetObjectId, x.amount]))
  );
}

describe("combat Might (CR 807 / 814)", () => {
  it("Assault bonuses only while attacking, and SUMS (807.2)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, grantedKeywords: [grant("Assault", 3)] });
    const state = stateWithObjects([unit]);
    expect(combatMight(state, "u1", "attacker")).toBe(5);
    expect(combatMight(state, "u1", "defender")).toBe(2);
  });

  it("Shield bonuses only while defending, and SUMS (814.2)", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 3,
      grantedKeywords: [grant("Shield", 2), grant("Shield", 1)],
    });
    const state = stateWithObjects([unit]);
    expect(combatMight(state, "u1", "defender")).toBe(6);
    expect(combatMight(state, "u1", "attacker")).toBe(3);
  });
});

describe("Stun is asymmetric (CR 423.1.b vs 423.1.c)", () => {
  it("contributes NO Might in the damage step (423.1.b)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, statuses: new Set(["stunned"]) });
    expect(damageContributed(stateWithObjects([unit]), "u1", "attacker")).toBe(0);
  });

  it("but STILL needs full Might damage to be killed (423.1.c)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, statuses: new Set(["stunned"]) });
    const state = stateWithObjects([unit]);
    // A naive "stunned = 0 Might" model would make this trivially killable.
    expect(minimumLethal(state, "u1", "defender")).toBe(5);
    expect(isKilled(4, combatMight(state, "u1", "defender"))).toBe(false);
    expect(isKilled(5, combatMight(state, "u1", "defender"))).toBe(true);
  });
});

describe("isKilled (CR 465.2.c.2)", () => {
  it("requires positive damage and damage >= might", () => {
    expect(isKilled(5, 5)).toBe(true);
    expect(isKilled(4, 5)).toBe(false);
    expect(isKilled(0, 0)).toBe(false);
  });

  it("a negative-Might unit dies to any positive damage", () => {
    expect(isKilled(1, -1)).toBe(true);
    expect(isKilled(0, -1)).toBe(false);
  });
});

describe("minimumLethal computed THROUGH replacement effects (CR 465.2.c.4.a, .c.5)", () => {
  it("a 'prevent 3' 2-Might unit needs 5 assigned", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, preventValue: 3 });
    expect(minimumLethal(stateWithObjects([unit]), "u1", "defender")).toBe(5);
  });

  it("marked damage reduces what's still needed (465.2.c.4)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, damage: 1 });
    expect(minimumLethal(stateWithObjects([unit]), "u1", "defender")).toBe(2);
  });

  it("'prevent All' is NEVER lethal (437.5.b)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, preventValue: "all" });
    expect(minimumLethal(stateWithObjects([unit]), "u1", "defender")).toBe("unkillable");
  });
});

describe("assignment tiers (CR 815 / 826 / 465.2.c.8)", () => {
  it("classifies Tank, ordinary and Backline as three distinct tiers", () => {
    expect(tierOf(makeUnit({ printedMight: 1, grantedKeywords: [grant("Tank")] }))).toBe("tank");
    expect(tierOf(makeUnit({ printedMight: 1 }))).toBe("ordinary");
    expect(tierOf(makeUnit({ printedMight: 1, grantedKeywords: [grant("Backline")] }))).toBe("backline");
  });

  it("a Tank+Backline unit resolves to whichever the ASSIGNER picks, never in between (465.2.c.8)", () => {
    const both = makeUnit({ printedMight: 1, grantedKeywords: [grant("Tank"), grant("Backline")] });
    expect(tierOf(both, "tank")).toBe("tank");
    expect(tierOf(both, "backline")).toBe("backline");
  });
});

describe("legalDamageAssignments — the constraint system (CR 465.2.c)", () => {
  it("lethal-first is UNIVERSAL, not a Tank special case (465.2.c.3)", () => {
    // 5 damage vs four 3-Might units must be 3+2, never 2+1+1+1.
    const units = [1, 2, 3, 4].map((n) => makeUnit({ objectId: `u${n}`, printedMight: 3, controller: "B" }));
    const state = stateWithObjects(units);
    const results = asMaps(legalDamageAssignments(state, "A", ["u1", "u2", "u3", "u4"], 5, "defender"));

    for (const result of results) {
      const amounts = Object.values(result).sort((a, b) => b - a);
      expect(amounts[0]).toBe(3); // one unit takes full lethal first
      expect(amounts.filter((a) => a > 0).length).toBeLessThanOrEqual(2);
    }
  });

  it("over-assignment is ILLEGAL while unassigned units remain (465.2.c.4)", () => {
    // The legacy kernel spilled leftover damage onto the last target as
    // overkill. With a second unit still unassigned, that is not legal.
    const tank = makeUnit({ objectId: "tank", printedMight: 3, controller: "B", grantedKeywords: [grant("Tank")] });
    const other = makeUnit({ objectId: "other", printedMight: 2, controller: "B" });
    const state = stateWithObjects([tank, other]);

    const results = asMaps(legalDamageAssignments(state, "A", ["tank", "other"], 4, "defender"));
    for (const result of results) {
      expect(result.tank).toBeLessThanOrEqual(3); // never more than minimum-lethal
    }
    // 4 damage: 3 to the Tank (lethal), 1 to the other — not 4 onto the Tank.
    expect(results).toContainEqual({ tank: 3, other: 1 });
  });

  it("Tank gates ordinary units: a non-Tank is an invalid assignment until every Tank has lethal (815.1.c.2)", () => {
    const tank = makeUnit({ objectId: "tank", printedMight: 5, controller: "B", grantedKeywords: [grant("Tank")] });
    const other = makeUnit({ objectId: "other", printedMight: 2, controller: "B" });
    const state = stateWithObjects([tank, other]);

    // Only 3 damage — not enough to kill the 5-Might Tank, so ALL of it must
    // go to the Tank; the ordinary unit is not a legal target yet.
    const results = asMaps(legalDamageAssignments(state, "A", ["tank", "other"], 3, "defender"));
    expect(results).toEqual([{ tank: 3 }]);
  });

  it("Backline is assigned LAST — invalid until every non-Backline has lethal (826.4.b)", () => {
    const ordinary = makeUnit({ objectId: "ord", printedMight: 2, controller: "B" });
    const backline = makeUnit({
      objectId: "back",
      printedMight: 2,
      controller: "B",
      grantedKeywords: [grant("Backline")],
    });
    const state = stateWithObjects([ordinary, backline]);

    const results = asMaps(legalDamageAssignments(state, "A", ["ord", "back"], 2, "defender"));
    expect(results).toEqual([{ ord: 2 }]); // all of it to the ordinary unit first
  });

  it("spill exists only once EVERY unit has lethal", () => {
    const a = makeUnit({ objectId: "a", printedMight: 1, controller: "B" });
    const b = makeUnit({ objectId: "b", printedMight: 1, controller: "B" });
    const state = stateWithObjects([a, b]);

    const results = asMaps(legalDamageAssignments(state, "A", ["a", "b"], 5, "defender"));
    // Both are lethal at 1 each; the remaining 3 may then pile onto either.
    for (const result of results) {
      expect((result.a ?? 0) + (result.b ?? 0)).toBe(5);
      expect(Math.min(result.a ?? 0, result.b ?? 0)).toBeGreaterThanOrEqual(1);
    }
  });

  it("an unkillable unit (prevent All) does not block the tier below it", () => {
    const tank = makeUnit({
      objectId: "tank",
      printedMight: 2,
      controller: "B",
      preventValue: "all",
      grantedKeywords: [grant("Tank")],
    });
    const other = makeUnit({ objectId: "other", printedMight: 2, controller: "B" });
    const state = stateWithObjects([tank, other]);

    const results = asMaps(legalDamageAssignments(state, "A", ["tank", "other"], 2, "defender"));
    expect(results).toContainEqual({ other: 2 });
  });
});

describe("resolveCombatDamage — assign all, THEN deal simultaneously (CR 465.2.c.1)", () => {
  it("kills are determined only after every assignment is known", () => {
    const attacker = makeUnit({ objectId: "atk", printedMight: 3, controller: "A" });
    const defender = makeUnit({ objectId: "def", printedMight: 3, controller: "B" });
    const state = stateWithObjects([attacker, defender]);

    const { killed } = resolveCombatDamage(
      state,
      [
        { fromPlayer: "A", assignments: [{ targetObjectId: "def", amount: 3 }] },
        { fromPlayer: "B", assignments: [{ targetObjectId: "atk", amount: 3 }] },
      ],
      { atk: "attacker", def: "defender" }
    );
    // Simultaneous: both die. A sequential model would let the first killed
    // unit stop dealing.
    expect(killed.sort()).toEqual(["atk", "def"]);
  });

  it("Prevent absorbs first and DECREMENTS (437.3); fully-prevented damage was never dealt (437.4)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, preventValue: 3 });
    const state = stateWithObjects([unit]);

    const result = resolveCombatDamage(
      state,
      [{ fromPlayer: "A", assignments: [{ targetObjectId: "u1", amount: 2 }] }],
      { u1: "defender" }
    );
    expect(result.state.objects.u1.damage).toBe(0); // fully prevented
    expect(result.state.objects.u1.preventValue).toBe(1); // decremented by the 2 absorbed
    expect(result.killed).toEqual([]);
  });
});

describe("Combat Cleanup heals all units (CR 466.1.a.1)", () => {
  it("clears combat damage", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, damage: 2 });
    const healed = healAllUnits(stateWithObjects([unit]));
    expect(healed.objects.u1.damage).toBe(0);
  });
});

describe("determineCombatResult (CR 466.3)", () => {
  const bf = { kind: "battlefield" as const, battlefieldId: "bf1" };

  it("the sole player with units remaining wins", () => {
    const attacker = makeUnit({ objectId: "atk", printedMight: 3, controller: "A", zone: bf });
    const state = stateWithObjects([attacker]);
    expect(determineCombatResult(state, "bf1", "A", "B")).toEqual({ winner: "A", loser: "B", noResult: false });
  });

  it("is No Result when BOTH still have units (466.3.d)", () => {
    const attacker = makeUnit({ objectId: "atk", printedMight: 3, controller: "A", zone: bf });
    const defender = makeUnit({ objectId: "def", printedMight: 3, controller: "B", zone: bf });
    const state = stateWithObjects([attacker, defender]);
    expect(determineCombatResult(state, "bf1", "A", "B").noResult).toBe(true);
  });

  it("is No Result when NEITHER has units (466.3.d)", () => {
    expect(determineCombatResult(stateWithObjects([]), "bf1", "A", "B").noResult).toBe(true);
  });
});
