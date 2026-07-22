import { describe, expect, it } from "vitest";
import {
  applyEvent,
  canAfford,
  canScoreWinningPoint,
  isKilled,
  resolveCombat,
  resolveMightChain,
  trueMight,
} from "../rulesKernel";
import type { GameEvent } from "../schema";
import { emptyPlayerState, grant, makeBattlefield, makeObject, makeRune, makeState, makeUnit, mod } from "./fixtures";

describe("resolveMightChain", () => {
  it("may go negative when no mod carries a floor", () => {
    expect(resolveMightChain(2, [mod(-5)])).toBe(-3);
  });

  it("applies a per-effect floor only at the moment that mod resolves — order-dependent (seq-mind-1)", () => {
    const floored = mod(-4, 1); // e.g. Smoke Screen
    const plain = mod(-1);

    // Floored mod resolves first: max(1, 5-4)=1, then plain: 1-1=0.
    expect(resolveMightChain(5, [floored, plain])).toBe(0);

    // Plain mod resolves first: 5-1=4, then floored: max(1, 4-4)=1.
    expect(resolveMightChain(5, [plain, floored])).toBe(1);
  });
});

describe("trueMight", () => {
  it("Assault only bonuses while attacking", () => {
    const unit = makeUnit({ might: 2, keywordGrants: [grant("Assault", 3)] });
    expect(trueMight(unit, "attacker")).toBe(5);
    expect(trueMight(unit, "defender")).toBe(2);
  });

  it("Shield only bonuses while defending, and sums multiple grants", () => {
    const unit = makeUnit({ might: 3, keywordGrants: [grant("Shield", 2), grant("Shield", 1)] });
    expect(trueMight(unit, "defender")).toBe(6);
    expect(trueMight(unit, "attacker")).toBe(3);
  });
});

describe("isKilled", () => {
  it("requires positive damage and damage >= might", () => {
    expect(isKilled(5, 5)).toBe(true);
    expect(isKilled(4, 5)).toBe(false);
    expect(isKilled(0, 0)).toBe(false); // damage must be > 0
  });

  it("a unit with negative Might dies to any positive damage", () => {
    expect(isKilled(1, -1)).toBe(true);
    expect(isKilled(0, -1)).toBe(false);
  });
});

describe("resolveCombat", () => {
  it("assigns lethal to a Tank before spilling to Backline", () => {
    const attacker = makeUnit({ might: 4, controller: "A" });
    const tank = makeUnit({ might: 3, controller: "B", keywordGrants: [grant("Tank")] });
    const backline = makeUnit({ might: 2, controller: "B" });

    const result = resolveCombat([attacker], [tank, backline]);

    expect(result.damageToDefenders).toEqual(
      expect.arrayContaining([
        { targetInstanceId: tank.instanceId, amount: 3 },
        { targetInstanceId: backline.instanceId, amount: 1 },
      ])
    );
    expect(result.killed).toContain(tank.instanceId);
    expect(result.killed).not.toContain(backline.instanceId); // only 1 damage, not lethal
  });

  it("spills past the Tank's lethal to kill Backline too when there's no other Tank", () => {
    const attacker = makeUnit({ might: 5, controller: "A" });
    const tank = makeUnit({ might: 3, controller: "B", keywordGrants: [grant("Tank")] });
    const backline = makeUnit({ might: 2, controller: "B" });

    const result = resolveCombat([attacker], [tank, backline]);

    expect(result.killed).toContain(tank.instanceId);
    expect(result.killed).toContain(backline.instanceId);
  });

  it("Stun deals 0 damage but the unit still contests (still assigned combat role, present on board)", () => {
    const stunnedAttacker = makeUnit({ might: 5, controller: "A", stunned: true });
    const defender = makeUnit({ might: 3, controller: "B" });

    const result = resolveCombat([stunnedAttacker], [defender]);

    expect(result.damageToDefenders).toEqual([]);
    expect(result.killed).toEqual([]);
    // The stunned unit is still a legal combat participant — it isn't
    // removed or skipped, it simply deals 0.
    expect(stunnedAttacker.might).toBe(5);
  });
});

describe("canAfford", () => {
  it("satisfies domain-specific pips first, then energy/remainder from any ready rune", () => {
    // Punch First-shaped cost: energy 1, powerCount 2, pips [{Body, 2}]
    const cost = { energy: 1, powerCount: 2, powerPips: [{ domain: "Body" as const, count: 2 }] };
    const runes = [makeRune({ domain: "Body" }), makeRune({ domain: "Body" }), makeRune({ domain: "Fury" })];
    expect(canAfford(cost, runes)).toBe(true);
  });

  it("fails when the specific domain pip requirement isn't met, even with enough total runes", () => {
    const cost = { energy: 1, powerCount: 2, powerPips: [{ domain: "Body" as const, count: 2 }] };
    const runes = [makeRune({ domain: "Body" }), makeRune({ domain: "Fury" }), makeRune({ domain: "Fury" })];
    expect(canAfford(cost, runes)).toBe(false);
  });

  it("ignores tapped runes", () => {
    const cost = { energy: 1, powerCount: 0, powerPips: [] };
    const runes = [makeRune({ tapped: true })];
    expect(canAfford(cost, runes)).toBe(false);
  });
});

describe("canScoreWinningPoint", () => {
  it("holdAtSeven: uncontested presence at a battlefield when the resulting point reaches 7", () => {
    const bf = makeBattlefield({ units: [makeUnit({ might: 2, controller: "A" })] });
    const state = makeState({
      battlefields: [bf],
      players: { A: emptyPlayerState("A", { points: 6 }), B: emptyPlayerState("B") },
    });
    expect(canScoreWinningPoint(state, "A")).toEqual(["holdAtSeven"]);
  });

  it("no line yet when an eligible hold wouldn't reach the 7-point threshold", () => {
    const bf = makeBattlefield({ units: [makeUnit({ might: 2, controller: "A" })] });
    const state = makeState({ battlefields: [bf] }); // points default to 0
    expect(canScoreWinningPoint(state, "A")).toEqual([]);
  });

  it("conquerBothAtSix: both battlefields Might-won when the resulting points reach 6", () => {
    const bfA = makeBattlefield({
      units: [makeUnit({ might: 5, controller: "A" }), makeUnit({ might: 2, controller: "B" })],
    });
    const bfB = makeBattlefield({
      units: [makeUnit({ might: 4, controller: "A" }), makeUnit({ might: 1, controller: "B" })],
    });
    const state = makeState({
      battlefields: [bfA, bfB],
      players: { A: emptyPlayerState("A", { points: 4 }), B: emptyPlayerState("B") },
    });
    expect(canScoreWinningPoint(state, "A")).toEqual(["conquerBothAtSix"]);
    expect(canScoreWinningPoint(state, "B")).toEqual([]);
  });

  it("holdOneConquerOneAtSix: one battlefield held uncontested, the other Might-won", () => {
    const held = makeBattlefield({ units: [makeUnit({ might: 2, controller: "A" })] });
    const conquered = makeBattlefield({
      units: [makeUnit({ might: 5, controller: "A" }), makeUnit({ might: 2, controller: "B" })],
    });
    const state = makeState({
      battlefields: [held, conquered],
      players: { A: emptyPlayerState("A", { points: 4 }), B: emptyPlayerState("B") },
    });
    expect(canScoreWinningPoint(state, "A")).toEqual(["holdOneConquerOneAtSix"]);
  });

  it("cardEffect: a pending direct point award bypasses battlefields entirely", () => {
    const state = makeState({ pendingDirectPoints: { A: 1, B: 0 } });
    expect(canScoreWinningPoint(state, "A")).toEqual(["cardEffect"]);
  });
});

describe("applyEvent fold round-trip", () => {
  it("folds a small event stream into the expected snapshot", () => {
    const unit = makeUnit({ instanceId: "unitX", cardId: "card-x", might: 2, controller: "A", zone: "base" });
    const initial = makeState({
      players: {
        A: emptyPlayerState("A", { deck: [makeObject({ instanceId: "obj1" }), makeObject({ instanceId: "obj2" })], base: [unit] }),
        B: emptyPlayerState("B"),
      },
    });

    const events: GameEvent[] = [
      { type: "cardDrawn", player: "A", count: 1 },
      { type: "damageDealt", targetInstanceId: "unitX", amount: 5 },
      { type: "unitKilled", targetInstanceId: "unitX" },
      { type: "pointScored", player: "A", source: { line: "cardEffect", amount: 1 } },
    ];

    const final = events.reduce(applyEvent, initial);

    expect(final.players.A.hand.map((o) => o.instanceId)).toEqual(["obj1"]);
    expect(final.players.A.deck.map((o) => o.instanceId)).toEqual(["obj2"]);
    expect(final.players.A.base).toEqual([]);
    expect(final.players.A.discard.some((o) => o.instanceId === "unitX")).toBe(true);
    expect(final.players.A.points).toBe(1);
  });
});
