// Cleanup ordering — CR 318-324.
//
// The seven-task order is the whole point of this subsystem: a Cleanup that
// runs its tasks out of order produces a legal-looking board that is wrong in
// ways nothing downstream can detect. chain.test.ts covers a few Cleanup cases
// alongside the FEPR machinery; this file is the systematic pass over 323.

import { describe, expect, it } from "vitest";
import { runCleanup } from "../chain";
import { checkWin } from "../scoring";
import { currentMight } from "../layers";
import {
  arithmeticEffect,
  emptyPlayerState,
  makeBattlefieldObject,
  makeRune,
  makeTurnState,
  makeUnit,
  setMightEffect,
  stateWithObjects,
} from "./fixtures";

const bf = (battlefieldId = "bf1") => ({ kind: "battlefield" as const, battlefieldId });

describe("Cleanup task 1 — the win check runs FIRST (CR 323.1)", () => {
  it("CR 323.1 — a player at threshold wins BEFORE any board change in the same Cleanup", () => {
    // A lethally-damaged unit would normally die in task 3b. Because the win
    // check is task 1, the game ends first and the unit is still on the board.
    const unit = makeUnit({ objectId: "u1", printedMight: 2, damage: 5, owner: "A", controller: "A" });
    const state = stateWithObjects([unit], {
      players: { A: emptyPlayerState("A", { points: 8 }), B: emptyPlayerState("B", { points: 0 }) },
    });

    const after = runCleanup(state);
    expect(after.objects.u1.zone.kind).toBe("base"); // not moved to trash
    expect(after.objects.u1.damage).toBe(5); // not wiped
    expect(checkWin(after, after.format)).toBe("A");
  });

  it("CR 472 — a TIE at threshold is not a win, and the Cleanup proceeds normally", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, damage: 5, owner: "A", controller: "A" });
    const state = stateWithObjects([unit], {
      players: { A: emptyPlayerState("A", { points: 8 }), B: emptyPlayerState("B", { points: 8 }) },
    });

    expect(checkWin(state, state.format)).toBeNull();
    const after = runCleanup(state);
    expect(after.objects.u1.zone.kind).toBe("trash"); // task 3b ran
  });

  it("CR 472 — the win check reads FormatContext.victoryScore, with nothing hardcoded to 8", () => {
    const state = stateWithObjects([], {
      players: { A: emptyPlayerState("A", { points: 8 }), B: emptyPlayerState("B") },
    });
    expect(checkWin(state, state.format)).toBe("A"); // 1v1 default = 8
    expect(checkWin(state, { ...state.format, victoryScore: 11 })).toBeNull(); // 2v2 = 11
  });
});

describe("Cleanup task 3 — kill lethally-damaged units (CR 323.4-.5)", () => {
  it("CR 124 — crossing to a Non-Board Zone wipes damage, counters, grants and statuses", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 2,
      damage: 3,
      owner: "A",
      controller: "A",
      buffCount: 1,
      counters: { charge: 2 },
      statuses: new Set(["stunned"]),
    });
    const after = runCleanup(stateWithObjects([unit]));
    const dead = after.objects.u1;

    expect(dead.zone).toEqual({ kind: "trash", player: "A" });
    expect(dead.damage).toBe(0);
    expect(dead.buffCount).toBe(0);
    expect(dead.counters).toEqual({});
    expect(dead.grantedKeywords).toEqual([]);
    expect(dead.statuses.size).toBe(0);
  });

  // GOLDEN — CR 142.4.b. "A unit has 5 [M] and 3 damage marked on it. Frigid
  // Touch is played targeting that unit. When it resolves, the unit's Might
  // becomes 3, and it will have lethal damage marked on it."
  // Expected value is from the CR text. Do not adjust to match the code.
  //
  // REGRESSION: the kill sweep read `printedMight`, so this unit survived.
  it("CR 142.4.b — lowering a 5M unit's Might to 3 makes its 3 marked damage lethal", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damage: 3, owner: "A", controller: "A" });
    const state = stateWithObjects([unit], { activeLayerEffects: [setMightEffect("u1", 3, 1)] });
    expect(currentMight(state, "u1")).toBe(3);
    expect(runCleanup(state).objects.u1.zone).toEqual({ kind: "trash", player: "A" });
  });

  it("CR 142.4.b — the converse: a Buff raising Might above the marked damage saves the unit", () => {
    // 3 printed + 1 Buff = 4 current Might, 3 damage marked. Reading printed
    // Might killed this unit; reading current Might correctly spares it.
    const unit = makeUnit({ objectId: "u1", printedMight: 3, damage: 3, buffCount: 1, owner: "A", controller: "A" });
    const state = stateWithObjects([unit]);
    expect(currentMight(state, "u1")).toBe(4);
    expect(runCleanup(state).objects.u1.zone.kind).toBe("base");
  });

  it("CR 142.4.b — a 0-Might unit needs at least 1 damage to have lethal damage", () => {
    const untouched = makeUnit({ objectId: "u1", printedMight: 0, damage: 0, owner: "A", controller: "A" });
    expect(runCleanup(stateWithObjects([untouched])).objects.u1.zone.kind).toBe("base");

    const marked = makeUnit({ objectId: "u2", printedMight: 0, damage: 1, owner: "A", controller: "A" });
    expect(runCleanup(stateWithObjects([marked])).objects.u2.zone.kind).toBe("trash");
  });

  it("a unit whose damage is below its Might survives", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damage: 4, owner: "A", controller: "A" });
    const after = runCleanup(stateWithObjects([unit]));
    expect(after.objects.u1.zone.kind).toBe("base");
  });

  it("a unit in a Non-Board Zone is never killed by the sweep, however much damage it carries", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 2,
      damage: 9,
      owner: "A",
      controller: "A",
      zone: { kind: "hand", player: "A" },
    });
    const after = runCleanup(stateWithObjects([unit]));
    expect(after.objects.u1.zone.kind).toBe("hand");
  });

  it("simultaneous lethal on both sides kills both units", () => {
    const a = makeUnit({ objectId: "a1", printedMight: 2, damage: 2, owner: "A", controller: "A", zone: bf() });
    const b = makeUnit({ objectId: "b1", printedMight: 2, damage: 2, owner: "B", controller: "B", zone: bf() });
    const after = runCleanup(stateWithObjects([a, b], { battlefieldIds: [] }));
    expect(after.objects.a1.zone).toEqual({ kind: "trash", player: "A" });
    expect(after.objects.b1.zone).toEqual({ kind: "trash", player: "B" });
  });
});

describe("Cleanup task 4 — losing control of empty Battlefields (CR 323.6 / 190.4.c)", () => {
  it("control is lost when no controlled unit remains, in an Open state with no Showdown", () => {
    const battlefield = makeBattlefieldObject({ objectId: "bf1", controller: "A", zone: bf() });
    const state = stateWithObjects([battlefield], {
      battlefieldIds: ["bf1"],
      turn: makeTurnState({ openState: "open" }),
    });
    expect(runCleanup(state).objects.bf1.controller).toBeNull();
  });

  it("control is RETAINED while a unit still occupies the Battlefield", () => {
    const battlefield = makeBattlefieldObject({ objectId: "bf1", controller: "A", zone: bf() });
    const holder = makeUnit({ objectId: "u1", printedMight: 2, controller: "A", zone: bf() });
    const state = stateWithObjects([battlefield, holder], {
      battlefieldIds: ["bf1"],
      turn: makeTurnState({ openState: "open" }),
    });
    expect(runCleanup(state).objects.bf1.controller).toBe("A");
  });

  it("CR 190.4.b — control is frozen in a Closed state, even with the Battlefield empty", () => {
    const battlefield = makeBattlefieldObject({ objectId: "bf1", controller: "A", zone: bf() });
    const state = stateWithObjects([battlefield], {
      battlefieldIds: ["bf1"],
      turn: makeTurnState({ openState: "closed" }),
    });
    expect(runCleanup(state).objects.bf1.controller).toBe("A");
  });
});

describe("Cleanup task 5 — the Recall sweep (CR 323.7)", () => {
  it("recalls an unattached non-Unit Rune from a Battlefield to its controller's base", () => {
    const rune = makeRune({ objectId: "r1", controller: "A", owner: "A", zone: bf() });
    const after = runCleanup(stateWithObjects([rune]));
    expect(after.objects.r1.zone).toEqual({ kind: "base", player: "A" });
  });

  it("CR 178.1.a.1.a — a UNIT at a Battlefield is never recalled by this step", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, controller: "A", owner: "A", zone: bf() });
    const after = runCleanup(stateWithObjects([unit]));
    expect(after.objects.u1.zone).toEqual(bf());
  });

  it("recalls a permanent sitting in a base other than its controller's", () => {
    const rune = makeRune({ objectId: "r1", controller: "A", owner: "A", zone: { kind: "base", player: "B" } });
    const after = runCleanup(stateWithObjects([rune]));
    expect(after.objects.r1.zone).toEqual({ kind: "base", player: "A" });
  });
});

describe("Cleanup task 7 — staging Combat (CR 323.9)", () => {
  it("stages Combat where opposing players' units share a Battlefield", () => {
    const mine = makeUnit({ objectId: "a1", printedMight: 2, controller: "A", zone: bf() });
    const theirs = makeUnit({ objectId: "b1", printedMight: 2, controller: "B", zone: bf() });
    const after = runCleanup(stateWithObjects([mine, theirs], { battlefieldIds: ["bf1"] }));
    expect(after.stagedCombats).toContain("bf1");
  });

  it("does not stage Combat when only one player has units there", () => {
    const mine = makeUnit({ objectId: "a1", printedMight: 2, controller: "A", zone: bf() });
    const after = runCleanup(stateWithObjects([mine], { battlefieldIds: ["bf1"] }));
    expect(after.stagedCombats).toEqual([]);
  });
});

describe("Cleanup convergence (CR 322)", () => {
  it("a stable state is a fixed point — running twice changes nothing further", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, damage: 1, controller: "A", owner: "A" });
    const once = runCleanup(stateWithObjects([unit]));
    const twice = runCleanup(once);
    expect(twice.objects).toEqual(once.objects);
  });

  it("CR 322 — a Cleanup that changes state re-runs until nothing changes", () => {
    // The kill in task 3b empties the Battlefield, which must then cost its
    // controller control in task 4 — a change produced BY this Cleanup, so it
    // has to be picked up by the repeat rather than left for the next one.
    const battlefield = makeBattlefieldObject({ objectId: "bf1", controller: "A", zone: bf() });
    const dying = makeUnit({
      objectId: "u1",
      printedMight: 2,
      damage: 3,
      controller: "A",
      owner: "A",
      zone: bf(),
    });
    const state = stateWithObjects([battlefield, dying], {
      battlefieldIds: ["bf1"],
      turn: makeTurnState({ openState: "open" }),
    });

    const after = runCleanup(state);
    expect(after.objects.u1.zone.kind).toBe("trash");
    expect(after.objects.bf1.controller).toBeNull();
  });

  it("terminates on a cascade rather than looping forever", () => {
    const units = Array.from({ length: 8 }, (_, i) =>
      makeUnit({ objectId: `u${i}`, printedMight: 1, damage: 2, controller: "A", owner: "A", zone: bf() })
    );
    const battlefield = makeBattlefieldObject({ objectId: "bf1", controller: "A", zone: bf() });
    const after = runCleanup(
      stateWithObjects([battlefield, ...units], { battlefieldIds: ["bf1"], turn: makeTurnState({ openState: "open" }) })
    );
    for (let i = 0; i < 8; i++) expect(after.objects[`u${i}`].zone.kind).toBe("trash");
  });
});

describe("End-of-turn Special Cleanup (CR 317.2, 324)", () => {
  const endingState = () => {
    const damaged = makeUnit({ objectId: "u1", printedMight: 5, damage: 3, controller: "A", owner: "A" });
    const stunned = makeUnit({
      objectId: "u2",
      printedMight: 3,
      controller: "A",
      owner: "A",
      statuses: new Set(["stunned"] as const),
    });
    return stateWithObjects([damaged, stunned], {
      players: {
        A: emptyPlayerState("A", { runePool: { energy: 3, power: [{ domain: "Mind", universal: false }] } }),
        B: emptyPlayerState("B", { runePool: { energy: 1, power: [] } }),
      },
      activeLayerEffects: [arithmeticEffect("u1", +2, { duration: "thisTurn", timestamp: 1 })],
    });
  };

  it("CR 466.1.a.1 — heals all Units", () => {
    expect(runCleanup(endingState(), "ending").objects.u1.damage).toBe(0);
  });

  it("CR 423.1.a.2 — clears Stun at step 3d", () => {
    expect(runCleanup(endingState(), "ending").objects.u2.statuses.has("stunned")).toBe(false);
  });

  it("CR 167 — empties every player's Rune Pool, losing floating resources", () => {
    const after = runCleanup(endingState(), "ending");
    expect(after.players.A.runePool).toEqual({ energy: 0, power: [] });
    expect(after.players.B.runePool).toEqual({ energy: 0, power: [] });
  });

  it("CR 317.2 — 'this turn' effects expire simultaneously", () => {
    const before = endingState();
    expect(currentMight(before, "u1")).toBe(7); // 5 printed + 2

    const after = runCleanup(before, "ending");
    expect(after.activeLayerEffects.filter((e) => e.duration === "thisTurn")).toEqual([]);
    expect(currentMight(after, "u1")).toBe(5);
  });

  it("a NORMAL Cleanup does none of the ending-only steps (324.1)", () => {
    const after = runCleanup(endingState());
    expect(after.objects.u1.damage).toBe(3); // no heal
    expect(after.objects.u2.statuses.has("stunned")).toBe(true); // no stun clear
    expect(after.players.A.runePool.energy).toBe(3); // pool intact
  });

  it("CR 466.1.a.1 — the combat Special Cleanup heals but does not clear Stun or Rune Pools", () => {
    const after = runCleanup(endingState(), "combat");
    expect(after.objects.u1.damage).toBe(0);
    expect(after.objects.u2.statuses.has("stunned")).toBe(true);
    expect(after.players.A.runePool.energy).toBe(3);
  });
});
