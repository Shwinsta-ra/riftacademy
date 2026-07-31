import { describe, expect, it } from "vitest";
import {
  chainExists,
  finalize,
  isCounterable,
  newestFinalized,
  oldestPending,
  resolveTop,
  resolvesImmediately,
  runCleanup,
} from "../chain";
import { makeState, makeTurnState, makeUnit, stateWithObjects } from "./fixtures";
import type { PendingChainItem } from "../schema";

function pending(itemId: string, addedSeq: number, objectId: string | null = null): PendingChainItem {
  return { itemId, objectId, controller: "A", kind: objectId ? "card" : "ability", addedSeq };
}

describe("chain ordering — FIFO finalize, LIFO resolve (CR 337.1.b / 340.1)", () => {
  it("finalizes the OLDEST pending item first (FIFO)", () => {
    const chain = { pending: [pending("b", 2), pending("a", 1), pending("c", 3)], finalized: [] };
    expect(oldestPending(chain)?.itemId).toBe("a");
  });

  it("resolves the NEWEST finalized item first (LIFO)", () => {
    const chain = {
      pending: [],
      finalized: [
        { itemId: "a", objectId: null, controller: "A", choices: {}, totalCost: { energy: 0, power: [] }, finalizedSeq: 1 },
        { itemId: "c", objectId: null, controller: "A", choices: {}, totalCost: { energy: 0, power: [] }, finalizedSeq: 3 },
        { itemId: "b", objectId: null, controller: "A", choices: {}, totalCost: { energy: 0, power: [] }, finalizedSeq: 2 },
      ],
    };
    expect(newestFinalized(chain)?.itemId).toBe("c");
  });

  it("the Chain exists only while it holds items (CR 328-330)", () => {
    expect(chainExists({ pending: [], finalized: [] })).toBe(false);
    expect(chainExists({ pending: [pending("a", 1)], finalized: [] })).toBe(true);
  });
});

describe("immediate resolution for Units, Gear and Adds (CR 337.2 / 400.2)", () => {
  it("a Unit resolves immediately on finalization", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, categories: ["unit"] });
    const state = stateWithObjects([unit]);
    expect(resolvesImmediately(state, pending("i1", 1, "u1"))).toBe(true);
  });

  it("Gear resolves immediately too", () => {
    const gear = makeUnit({ objectId: "g1", printedMight: null, categories: ["gear"] });
    const state = stateWithObjects([gear]);
    expect(resolvesImmediately(state, pending("i1", 1, "g1"))).toBe(true);
  });

  it("a Spell does NOT resolve immediately — it waits on the chain", () => {
    const spell = makeUnit({ objectId: "s1", printedMight: null, categories: ["spell"] });
    const state = stateWithObjects([spell]);
    expect(resolvesImmediately(state, pending("i1", 1, "s1"))).toBe(false);
  });

  it("an Add ability resolves immediately regardless of its source (429.2)", () => {
    expect(resolvesImmediately(makeState(), pending("i1", 1), true)).toBe(true);
  });

  it("finalize() routes an immediate-resolve Unit straight past the finalized queue", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, categories: ["unit"] });
    const state = stateWithObjects([unit], {
      chainEngine: { tasks: [], chain: { pending: [pending("i1", 1, "u1")], finalized: [] }, showdown: null },
    });

    const next = finalize(state);
    expect(next.chainEngine.chain.pending).toHaveLength(0);
    expect(next.chainEngine.chain.finalized).toHaveLength(0); // never queued — resolved on the spot
  });

  it("finalize() queues a Spell for later LIFO resolution", () => {
    const spell = makeUnit({ objectId: "s1", printedMight: null, categories: ["spell"] });
    const state = stateWithObjects([spell], {
      chainEngine: { tasks: [], chain: { pending: [pending("i1", 1, "s1")], finalized: [] }, showdown: null },
    });

    const next = finalize(state);
    expect(next.chainEngine.chain.pending).toHaveLength(0);
    expect(next.chainEngine.chain.finalized).toHaveLength(1);
  });
});

describe("counterability follows from immediate resolution (CR 425 + 337.2)", () => {
  it("a Unit is NEVER counterable — there is no reaction window against it", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, categories: ["unit"] });
    expect(isCounterable(stateWithObjects([unit]), pending("i1", 1, "u1"))).toBe(false);
  });

  it("a Spell on the chain IS counterable", () => {
    const spell = makeUnit({ objectId: "s1", printedMight: null, categories: ["spell"] });
    expect(isCounterable(stateWithObjects([spell]), pending("i1", 1, "s1"))).toBe(true);
  });
});

describe("resolveTop returns to an Open State when the chain empties (CR 340.2)", () => {
  it("reopens the state", () => {
    const state = makeState({
      turn: makeTurnState({ openState: "closed" }),
      chainEngine: {
        tasks: [],
        chain: {
          pending: [],
          finalized: [
            { itemId: "a", objectId: null, controller: "A", choices: {}, totalCost: { energy: 0, power: [] }, finalizedSeq: 1 },
          ],
        },
        showdown: null,
      },
    });
    expect(resolveTop(state).turn.openState).toBe("open");
  });
});

describe("runCleanup — the seven-step order (CR 323)", () => {
  it("kills lethally-damaged units to the owner's Trash (task 3b)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, damage: 3, owner: "A", controller: "A" });
    const next = runCleanup(stateWithObjects([unit]));
    expect(next.objects.u1.zone).toEqual({ kind: "trash", player: "A" });
  });

  it("wipes temporary modifications when the unit crosses to a Non-Board Zone (CR 124)", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 2,
      damage: 3,
      buffCount: 1,
      statuses: new Set(["stunned"]),
      counters: { charge: 2 },
    });
    const next = runCleanup(stateWithObjects([unit]));
    expect(next.objects.u1.damage).toBe(0);
    expect(next.objects.u1.buffCount).toBe(0);
    expect(next.objects.u1.counters).toEqual({});
    expect(next.objects.u1.statuses.size).toBe(0);
  });

  it("does NOT kill a unit whose damage is below its Might", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damage: 3 });
    const next = runCleanup(stateWithObjects([unit]));
    expect(next.objects.u1.zone.kind).toBe("base");
  });

  it("task 1 (win check) short-circuits the remaining tasks (323.1)", () => {
    // A wins on points; the lethally-damaged unit is NOT swept, because the
    // game has already ended at task 1.
    const unit = makeUnit({ objectId: "u1", printedMight: 2, damage: 3 });
    const state = stateWithObjects([unit]);
    const won = { ...state, players: { ...state.players, A: { ...state.players.A, points: 8 } } };
    expect(runCleanup(won).objects.u1.zone.kind).toBe("base");
  });

  it("stages Combat where opposing players' units share a Battlefield (task 7 / 461)", () => {
    const bf = { kind: "battlefield" as const, battlefieldId: "bf1" };
    const mine = makeUnit({ objectId: "a1", printedMight: 2, controller: "A", zone: bf });
    const theirs = makeUnit({ objectId: "b1", printedMight: 2, controller: "B", zone: bf });
    const state = stateWithObjects([mine, theirs], { battlefieldIds: ["bf1"] });
    expect(runCleanup(state).stagedCombats).toEqual(["bf1"]);
  });

  it("does not stage Combat when only one player has units there", () => {
    const bf = { kind: "battlefield" as const, battlefieldId: "bf1" };
    const mine = makeUnit({ objectId: "a1", printedMight: 2, controller: "A", zone: bf });
    const state = stateWithObjects([mine], { battlefieldIds: ["bf1"] });
    expect(runCleanup(state).stagedCombats).toEqual([]);
  });

  it("the ending Cleanup clears Stun (CR 423.1.a.2, step 3d)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, statuses: new Set(["stunned"]) });
    const next = runCleanup(stateWithObjects([unit]), "ending");
    expect(next.objects.u1.statuses.has("stunned")).toBe(false);
  });

  it("the ending Cleanup heals all units and empties Rune Pools (CR 317.2.b / 167)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damage: 2 });
    const state = stateWithObjects([unit]);
    const withPool = {
      ...state,
      players: { ...state.players, A: { ...state.players.A, runePool: { energy: 3, power: [] } } },
    };

    const next = runCleanup(withPool, "ending");
    expect(next.objects.u1.damage).toBe(0);
    expect(next.players.A.runePool).toEqual({ energy: 0, power: [] });
  });

  it("the ending Cleanup expires 'this turn' effects simultaneously (CR 317.2.b)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [
        {
          layer: 3,
          sourceObjectId: "src",
          targetSelector: { kind: "target", index: 0 },
          targets: ["u1"],
          op: { attr: "might", delta: 2 },
          fromPassive: false,
          duration: "thisTurn",
          timestamp: 1,
        },
        {
          layer: 3,
          sourceObjectId: "src",
          targetSelector: { kind: "target", index: 0 },
          targets: ["u1"],
          op: { attr: "might", delta: 1 },
          fromPassive: false,
          duration: "permanent",
          timestamp: 2,
        },
      ],
    });

    const next = runCleanup(state, "ending");
    expect(next.activeLayerEffects).toHaveLength(1);
    expect(next.activeLayerEffects[0].duration).toBe("permanent");
  });

  it("loses control of a battlefield with no remaining units (task 4 / 190.4.c)", () => {
    const battlefield = makeUnit({
      objectId: "bf1",
      printedMight: null,
      categories: ["battlefield"],
      controller: "A",
      zone: { kind: "battlefield", battlefieldId: "bf1" },
    });
    const state = stateWithObjects([battlefield], { battlefieldIds: ["bf1"] });
    expect(runCleanup(state).objects.bf1.controller).toBeNull();
  });
});
