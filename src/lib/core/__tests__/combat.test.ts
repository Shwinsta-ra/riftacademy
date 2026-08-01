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
import { currentMight } from "../layers";
import { arithmeticEffect, grant, makeUnit, stateWithObjects } from "./fixtures";

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
    const tank = makeUnit({ objectId: "tank", printedMight: 1, grantedKeywords: [grant("Tank")] });
    const ordinary = makeUnit({ objectId: "ord", printedMight: 1 });
    const backline = makeUnit({ objectId: "back", printedMight: 1, grantedKeywords: [grant("Backline")] });
    const state = stateWithObjects([tank, ordinary, backline]);

    expect(tierOf(state, "tank")).toBe("tank");
    expect(tierOf(state, "ord")).toBe("ordinary");
    expect(tierOf(state, "back")).toBe("backline");
  });

  it("classifies a PRINTED keyword, not just a granted one (CR 801 / 477.2)", () => {
    // The legacy hasKeyword read only the granted list, so a printed Tank was
    // invisible to assignment ordering. Phase 2 diff §1 flagged this.
    const printedTank = makeUnit({ objectId: "pt", printedMight: 1, printedKeywords: [{ keyword: "Tank" }] });
    expect(tierOf(stateWithObjects([printedTank]), "pt")).toBe("tank");
  });

  it("a Tank+Backline unit resolves to whichever the ASSIGNER picks, never in between (465.2.c.8)", () => {
    const both = makeUnit({
      objectId: "both",
      printedMight: 1,
      grantedKeywords: [grant("Tank"), grant("Backline")],
    });
    const state = stateWithObjects([both]);
    expect(tierOf(state, "both", "tank")).toBe("tank");
    expect(tierOf(state, "both", "backline")).toBe("backline");
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

// ---------------------------------------------------------------------------
// Tier A — goldens transcribed from the CR's own worked examples
// ---------------------------------------------------------------------------

describe("damage assignment — GOLDEN cases from CR 465.2.c", () => {
  // GOLDEN — CR 465.2.c.3 (D-A1). "If a player has 5 damage to distribute
  // among four 3 Might units, they may not choose to assign 2 damage to one of
  // the units and 1 damage to each of the remaining 3. They must assign at
  // least 3 damage to one, and the remaining 2 to another."
  // Expected value is from the CR text. Do not adjust to match the code.
  it("CR 465.2.c.3 — lethal-first: 5 damage among four 3M units may not be 2/1/1/1", () => {
    const units = [1, 2, 3, 4].map((n) => makeUnit({ objectId: `u${n}`, printedMight: 3, controller: "B" }));
    const state = stateWithObjects(units);
    const results = asMaps(legalDamageAssignments(state, "A", ["u1", "u2", "u3", "u4"], 5, "defender"));

    // The CR's named illegal shape must not appear anywhere in the legal set.
    expect(results).not.toContainEqual({ u1: 2, u2: 1, u3: 1, u4: 1 });
    for (const result of results) {
      const spread = Object.values(result).sort((a, b) => b - a);
      expect(spread[0]).toBe(3); // "at least 3 damage to one"
      expect(spread[1]).toBe(2); // "and the remaining 2 to another"
      expect(spread.length).toBe(2);
    }
    // And the CR's named legal shape IS available.
    expect(results).toContainEqual({ u1: 3, u2: 2 });
  });

  // GOLDEN — CR 465.2.c.4 (D-A2). "If a player has 5 damage to distribute
  // among four 3 Might units and those units each have 1 damage already marked
  // on them, that player may not assign more than 2 damage to any of those
  // units." Expected value is from the CR text.
  it("CR 465.2.c.4 — with 1 damage already marked, no unit may be assigned more than 2", () => {
    const units = [1, 2, 3, 4].map((n) =>
      makeUnit({ objectId: `u${n}`, printedMight: 3, damage: 1, controller: "B" })
    );
    const state = stateWithObjects(units);
    const results = asMaps(legalDamageAssignments(state, "A", ["u1", "u2", "u3", "u4"], 5, "defender"));

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      for (const amount of Object.values(result)) {
        expect(amount).toBeLessThanOrEqual(2);
      }
      expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(5);
    }
  });

  // GOLDEN — CR 465.2.c.5 (D-A4). "A unit with 2 [M] is being assigned damage
  // in the combat damage step. The unit has 'prevent the first 3 damage I
  // would take each combat.' The unit would need to be assigned 5 damage in
  // order to have lethal damage assigned to it."
  it("CR 465.2.c.5 — a 2M unit with 'prevent the first 3' needs 5 damage ASSIGNED for lethal", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, preventValue: 3, controller: "B" });
    const state = stateWithObjects([unit]);
    expect(minimumLethal(state, "u1", "defender")).toBe(5);

    // 4 assigned is not lethal; 5 is.
    expect(asMaps(legalDamageAssignments(state, "A", ["u1"], 4, "defender"))).toEqual([{ u1: 4 }]);
    expect(asMaps(legalDamageAssignments(state, "A", ["u1"], 5, "defender"))).toContainEqual({ u1: 5 });
  });

  // GOLDEN — CR 465.2.c.6 (D-A6). "That player must assign combat damage first
  // to the unit with Tank, then to the unit with no abilities, then to the unit
  // with Backline." Order is observed through pool sufficiency: a pool that
  // only covers one unit may reach only the unit whose turn it is.
  it("CR 465.2.c.6 — order is Tank, then plain, then Backline", () => {
    const tank = makeUnit({ objectId: "tank", printedMight: 2, controller: "B", printedKeywords: [{ keyword: "Tank" }] });
    const plain = makeUnit({ objectId: "plain", printedMight: 2, controller: "B" });
    const back = makeUnit({ objectId: "back", printedMight: 2, controller: "B", printedKeywords: [{ keyword: "Backline" }] });
    const state = stateWithObjects([tank, plain, back]);
    const ids = ["tank", "plain", "back"];

    expect(asMaps(legalDamageAssignments(state, "A", ids, 2, "defender"))).toEqual([{ tank: 2 }]);
    expect(asMaps(legalDamageAssignments(state, "A", ids, 4, "defender"))).toEqual([{ plain: 2, tank: 2 }]);
    expect(asMaps(legalDamageAssignments(state, "A", ids, 6, "defender"))).toContainEqual({ back: 2, plain: 2, tank: 2 });
  });

  // GOLDEN — CR 465.2.c.7 (D-A7). "That player chooses one of the units with
  // Tank and assigns combat damage to it. Then they must assign any remaining
  // damage first to the other unit with Tank, then to the unit with no
  // abilities."
  it("CR 465.2.c.7 — with two Tanks, either may go first, but both precede the plain unit", () => {
    const t1 = makeUnit({ objectId: "t1", printedMight: 2, controller: "B", printedKeywords: [{ keyword: "Tank" }] });
    const t2 = makeUnit({ objectId: "t2", printedMight: 2, controller: "B", printedKeywords: [{ keyword: "Tank" }] });
    const plain = makeUnit({ objectId: "plain", printedMight: 2, controller: "B" });
    const state = stateWithObjects([t1, t2, plain]);
    const ids = ["t1", "t2", "plain"];

    // Enough for exactly one unit — either Tank is a legal choice, the plain unit is not.
    const one = asMaps(legalDamageAssignments(state, "A", ids, 2, "defender"));
    expect(one).toContainEqual({ t1: 2 });
    expect(one).toContainEqual({ t2: 2 });
    expect(one).not.toContainEqual({ plain: 2 });

    // Enough for two — both Tanks, never a Tank plus the plain unit.
    expect(asMaps(legalDamageAssignments(state, "A", ids, 4, "defender"))).toEqual([{ t1: 2, t2: 2 }]);
  });

  // GOLDEN — CR 465.2.c.8 (D-A8). "That player can't fulfill both of Caitlyn's
  // damage requirements, so they may choose to assign damage to Caitlyn first,
  // fulfilling the Tank requirement, or last, fulfilling the Backline
  // requirement. They can't choose to apply damage to Caitlyn in between the
  // other two units."
  it("CR 465.2.c.8 — Tank+Backline Caitlyn is assigned first or last, never in between", () => {
    const caitlyn = makeUnit({
      objectId: "caitlyn",
      printedMight: 2,
      controller: "B",
      printedKeywords: [{ keyword: "Backline" }],
      grantedKeywords: [grant("Tank")],
    });
    const p1 = makeUnit({ objectId: "p1", printedMight: 2, controller: "B" });
    const p2 = makeUnit({ objectId: "p2", printedMight: 2, controller: "B" });
    const state = stateWithObjects([caitlyn, p1, p2]);
    const ids = ["caitlyn", "p1", "p2"];

    // FIRST (assigner applies Tank): a 2-damage pool must go to Caitlyn.
    expect(asMaps(legalDamageAssignments(state, "A", ids, 2, "defender", { caitlyn: "tank" }))).toEqual([
      { caitlyn: 2 },
    ]);

    // LAST (assigner applies Backline): Caitlyn gets nothing until both plain
    // units have lethal — so at 4 damage she is untouched, and only at 6 is
    // she reached. "In between" (one plain unit, then Caitlyn) never appears.
    const backlineChoice = { caitlyn: "backline" as const };
    const four = asMaps(legalDamageAssignments(state, "A", ids, 4, "defender", backlineChoice));
    expect(four).toEqual([{ p1: 2, p2: 2 }]);
    for (const result of four) expect(result.caitlyn).toBeUndefined();

    const six = asMaps(legalDamageAssignments(state, "A", ids, 6, "defender", backlineChoice));
    expect(six).toContainEqual({ caitlyn: 2, p1: 2, p2: 2 });
  });
});

// ---------------------------------------------------------------------------
// Tier B — systematic
// ---------------------------------------------------------------------------

describe("damage assignment — systematic (CR 465.2.c, 815, 826)", () => {
  // REGRESSION for the `tierOf` printed-Tank bug found in #148: printed and
  // granted Tank must tier identically. Under CR 815.1.c.2 a printed-Tank unit
  // makes non-Tank units INVALID assignment targets, so mis-tiering silently
  // produced illegal assignments.
  it("CR 801 — printed Tank and granted Tank gate the ordinary tier identically (regression)", () => {
    const build = (printed: boolean) => {
      const tank = makeUnit({
        objectId: "tank",
        printedMight: 4,
        controller: "B",
        printedKeywords: printed ? [{ keyword: "Tank" as const }] : [],
        grantedKeywords: printed ? [] : [grant("Tank")],
      });
      const plain = makeUnit({ objectId: "plain", printedMight: 2, controller: "B" });
      const state = stateWithObjects([tank, plain]);
      return asMaps(legalDamageAssignments(state, "A", ["tank", "plain"], 3, "defender"));
    };
    // 3 damage cannot kill the 4-Might Tank, so it may not reach the plain unit.
    expect(build(true)).toEqual([{ tank: 3 }]);
    expect(build(true)).toEqual(build(false));
  });

  it("CR 826.3 — an ordinary unit is NOT treated as Backline", () => {
    const plain = makeUnit({ objectId: "plain", printedMight: 2, controller: "B" });
    const back = makeUnit({ objectId: "back", printedMight: 2, controller: "B", printedKeywords: [{ keyword: "Backline" }] });
    const state = stateWithObjects([plain, back]);
    expect(tierOf(state, "plain")).toBe("ordinary");
    expect(tierOf(state, "back")).toBe("backline");
    // The ordinary unit is reached first, proving the tiers are distinct.
    expect(asMaps(legalDamageAssignments(state, "A", ["plain", "back"], 2, "defender"))).toEqual([{ plain: 2 }]);
  });

  it("CR 465.2.c.4 — over-assignment becomes legal exactly when no unit remains unassigned", () => {
    const a = makeUnit({ objectId: "a", printedMight: 2, controller: "B" });
    const b = makeUnit({ objectId: "b", printedMight: 2, controller: "B" });
    const state = stateWithObjects([a, b]);

    // 3 damage, b still unassigned — a may not take more than its lethal 2.
    for (const result of asMaps(legalDamageAssignments(state, "A", ["a", "b"], 3, "defender"))) {
      expect(result.a ?? 0).toBeLessThanOrEqual(2);
      expect(result.b ?? 0).toBeLessThanOrEqual(2);
    }
    // 5 damage — both are lethal at 2, so the last 1 may pile on.
    const spill = asMaps(legalDamageAssignments(state, "A", ["a", "b"], 5, "defender"));
    expect(spill).toContainEqual({ a: 3, b: 2 });
  });

  it("CR 423.1.b/.c — a Stunned unit contributes 0 Might but still needs full Might to die", () => {
    const stunned = makeUnit({ objectId: "s", printedMight: 4, controller: "B", statuses: new Set(["stunned"]) });
    const state = stateWithObjects([stunned]);
    expect(damageContributed(state, "s", "attacker")).toBe(0);
    expect(minimumLethal(state, "s", "defender")).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Tier C — adversarial / negative
// ---------------------------------------------------------------------------

describe("damage assignment — adversarial (CR 465.2.c)", () => {
  it("damage below the smallest lethal still yields a legal assignment, killing nothing", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, controller: "B" });
    const state = stateWithObjects([unit]);
    const results = asMaps(legalDamageAssignments(state, "A", ["u1"], 2, "defender"));
    expect(results).toEqual([{ u1: 2 }]);
    expect(isKilled(2, 5)).toBe(false);
  });

  it("a zero pool yields one empty assignment, not an error", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, controller: "B" });
    const state = stateWithObjects([unit]);
    expect(legalDamageAssignments(state, "A", ["u1"], 0, "defender")).toEqual([{ fromPlayer: "A", assignments: [] }]);
  });

  it("no targets yields one empty assignment", () => {
    expect(legalDamageAssignments(stateWithObjects([]), "A", [], 5, "defender")).toEqual([
      { fromPlayer: "A", assignments: [] },
    ]);
  });

  it("CR 437.5.b — when every defender prevents All, nothing is ever lethal but assignment stays legal", () => {
    const a = makeUnit({ objectId: "a", printedMight: 2, controller: "B", preventValue: "all" });
    const b = makeUnit({ objectId: "b", printedMight: 2, controller: "B", preventValue: "all" });
    const state = stateWithObjects([a, b]);

    expect(minimumLethal(state, "a", "defender")).toBe("unkillable");
    const results = asMaps(legalDamageAssignments(state, "A", ["a", "b"], 4, "defender"));
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(Object.values(result).reduce((sum, n) => sum + n, 0)).toBe(4);
    }
    // And dealing it kills nobody.
    const dealt = resolveCombatDamage(
      state,
      [{ fromPlayer: "A", assignments: [{ targetObjectId: "a", amount: 4 }] }],
      { a: "defender" }
    );
    expect(dealt.killed).toEqual([]);
  });

  it("every unit a Tank collapses to a single tier, still lethal-first", () => {
    const units = [1, 2, 3].map((n) =>
      makeUnit({ objectId: `t${n}`, printedMight: 2, controller: "B", printedKeywords: [{ keyword: "Tank" as const }] })
    );
    const state = stateWithObjects(units);
    const results = asMaps(legalDamageAssignments(state, "A", ["t1", "t2", "t3"], 4, "defender"));
    for (const result of results) {
      expect(Object.values(result).every((n) => n === 2)).toBe(true);
      expect(Object.keys(result).length).toBe(2);
    }
  });

  it("every unit Backline behaves like a single tier", () => {
    const units = [1, 2].map((n) =>
      makeUnit({ objectId: `b${n}`, printedMight: 2, controller: "B", printedKeywords: [{ keyword: "Backline" as const }] })
    );
    const state = stateWithObjects(units);
    const results = asMaps(legalDamageAssignments(state, "A", ["b1", "b2"], 2, "defender"));
    expect(results).toContainEqual({ b1: 2 });
    expect(results).toContainEqual({ b2: 2 });
  });

  it("a single unit takes the whole pool once it is the only one left", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, controller: "B" });
    const state = stateWithObjects([unit]);
    expect(asMaps(legalDamageAssignments(state, "A", ["u1"], 7, "defender"))).toEqual([{ u1: 7 }]);
  });

  it("a negative-Might unit is lethal to 1 damage and never demands more", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, controller: "B" });
    const state = stateWithObjects([unit], { activeLayerEffects: [arithmeticEffect("u1", -5)] });
    expect(currentMight(state, "u1")).toBe(-2);
    // CR 465.2.c.2 — lethal is non-zero damage >= Might; minimum-lethal floors at 1.
    expect(minimumLethal(state, "u1", "defender")).toBe(1);
    expect(isKilled(1, -2)).toBe(true);
  });

  it("NEGATIVE: no returned assignment ever exceeds a unit's minimum-lethal while another is unassigned", () => {
    const a = makeUnit({ objectId: "a", printedMight: 3, controller: "B" });
    const b = makeUnit({ objectId: "b", printedMight: 3, controller: "B" });
    const c = makeUnit({ objectId: "c", printedMight: 3, controller: "B" });
    const state = stateWithObjects([a, b, c]);

    for (const pool of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const result of asMaps(legalDamageAssignments(state, "A", ["a", "b", "c"], pool, "defender"))) {
        const total = Object.values(result).reduce((sum, n) => sum + n, 0);
        expect(total).toBe(pool);
        const assignedCount = Object.keys(result).length;
        const everyoneAssigned = assignedCount === 3 && Object.values(result).every((n) => n >= 3);
        if (!everyoneAssigned) {
          for (const amount of Object.values(result)) expect(amount).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// ESCALATED — Tier A goldens blocked on the canonical model's SHAPE
// ---------------------------------------------------------------------------
//
// Both need a damage-MULTIPLYING replacement effect. `GameObject` models
// replacement effects on damage with exactly one field, `preventValue:
// number | "all" | null`, which can only ever REDUCE. There is no way to
// express "Double all damage dealt to it", so `minimumLethal` cannot compute
// through it. Per the failure protocol this is a type gaining a field, not a
// computation to fix, so it is reported rather than patched.
//
// Note CR 465.2.c.5's third example makes this harder than a single extra
// number: prevent and doubling are BOTH replacement effects on the assignment,
// applied "in the order of the controller of the unit's choice", and the two
// orders give different results (4 assigned vs 6). A faithful model needs an
// ordered LIST of assignment-time replacements, not a second scalar.

describe.skip("ESCALATED — damage-assignment goldens blocked on model shape", () => {
  // GOLDEN — CR 465.2.c.4.a (D-A3). "A unit with 3 [M]... has a delayed
  // replacement effect applied to it that reads 'Double all damage that would
  // be dealt to it this turn.' When assigning damage, the assigning player can
  // only choose to assign 1 or 2 damage to this unit — when doing so, the
  // assigned damage is doubled to 2 or 4 damage respectively. The minimum
  // applied value such that the unit would take lethal damage in this way is 4
  // damage."
  //
  // So: legal assigned values are exactly {1, 2}, and minimum-lethal ASSIGNED
  // is 2. The kernel has no doubling to compute through and returns 3.
  it("CR 465.2.c.4.a — a 3M unit with damage doubling may be assigned only 1 or 2; lethal is 2", () => {});

  // GOLDEN — CR 465.2.c.5 (D-A5). "The attacking player is assigning their 3
  // [M] worth of damage to two defending units with 2 [M] each. One of the
  // units has... 'Double all damage that would be dealt to it this turn.' The
  // attacking player assigns two damage to the other defending unit, then...
  // they assign 2 damage to it; 1 damage that doubles to 2 damage as it is
  // assigned to the unit."
  //
  // So a 3 pool kills BOTH 2-Might units: 2 to the plain one, 1 to the doubler.
  // The kernel needs 2+2=4 and so kills only one.
  it("CR 465.2.c.5 — 3 damage kills both 2M defenders when one doubles incoming damage", () => {});

  // CR 465.2.c.5, third example — the ordering choice between two
  // assignment-time replacements. Recorded with the goldens because it is what
  // makes a single extra scalar insufficient as a fix.
  it("CR 465.2.c.5 — prevent-then-double and double-then-prevent give 4 vs 6 assigned, controller's choice", () => {});
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
