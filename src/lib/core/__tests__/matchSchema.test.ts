import { describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { applyEvent } from "../rulesKernel";
import type { GameEvent } from "../schema";
import { emptyPlayerState, makeState, makeUnit, stateWithObjects } from "./fixtures";

describe("revealed — the belief-state primitive (G1)", () => {
  it("resolves a null cardId to the revealed identity", () => {
    const hidden = makeUnit({ objectId: "obj-1", printedMight: 2, cardId: null, zone: { kind: "hand", player: "A" } });
    const state = stateWithObjects([hidden]);

    const event: GameEvent = {
      type: "revealed",
      objectId: "obj-1",
      cardId: "ven-001-166",
      toPlayer: "B",
      source: "combat",
    };

    const next = applyEvent(state, event);
    expect(next.objects["obj-1"].cardId).toBe("ven-001-166");
    expect(next.objects["obj-1"].statuses.has("revealed")).toBe(true);
  });
});

describe("played — enriched (G3)", () => {
  it("folds with targets/battlefieldId/fromZone/costPaid present", () => {
    const card = makeUnit({ objectId: "hand-1", printedMight: 2, zone: { kind: "hand", player: "A" } });
    const state = stateWithObjects([card]);

    const next = applyEvent(state, {
      type: "played",
      objectId: "hand-1",
      player: "A",
      targets: ["some-unit"],
      battlefieldId: "BF1",
      fromZone: { kind: "hand", player: "A" },
      costPaid: { energy: 1, power: [{ kind: "any" }] },
    });

    expect(next.chainEngine.chain.pending).toHaveLength(1);
    expect(next.turn.openState).toBe("closed"); // CR 354 — moving to the Chain Closes the State
  });

  it("still folds as a bare event (back-compat)", () => {
    const card = makeUnit({ objectId: "hand-1", printedMight: 2, zone: { kind: "hand", player: "A" } });
    const state = stateWithObjects([card]);
    const next = applyEvent(state, { type: "played", objectId: "hand-1", player: "A" });
    expect(next.chainEngine.chain.pending).toHaveLength(1);
  });
});

describe("setup + rune events (G4/G5)", () => {
  it("gameStarted sets the first player as the Turn Player", () => {
    const next = applyEvent(makeState(), { type: "gameStarted", firstPlayer: "B" });
    expect(next.turn.turnPlayer).toBe("B");
  });

  it("mulligan draws replacements FIRST, then recycles the set-asides to the deck bottom (CR 117)", () => {
    // The legacy model shuffled them back, which is not the rule: CR 117 is
    // set aside -> draw that many -> THEN recycle the set-asides. No shuffle.
    const keep = makeUnit({ objectId: "keep-1", printedMight: 1, zone: { kind: "hand", player: "A" } });
    const toss = makeUnit({ objectId: "toss-1", printedMight: 1, zone: { kind: "hand", player: "A" } });
    const fresh = makeUnit({ objectId: "fresh-1", printedMight: 1, zone: { kind: "mainDeck", player: "A" } });
    const state = stateWithObjects([keep, toss, fresh], {
      deckOrder: { A: ["fresh-1"], B: [] },
      players: { A: emptyPlayerState("A", { handCount: 2 }), B: emptyPlayerState("B") },
    });

    const next = applyEvent(state, { type: "mulligan", player: "A", setAsideObjectIds: ["toss-1"] });

    expect(next.objects["fresh-1"].zone).toEqual({ kind: "hand", player: "A" }); // drawn first
    expect(next.deckOrder.A).toEqual(["toss-1"]); // set-aside recycled to the bottom after
  });

  it("channeled moves a rune from the Rune Deck to the board", () => {
    const rune = makeUnit({
      objectId: "rune-1",
      printedMight: null,
      categories: ["rune"],
      zone: { kind: "runeDeck", player: "A" },
    });
    const state = stateWithObjects([rune], { runeDeckOrder: { A: ["rune-1"], B: [] } });

    const next = applyEvent(state, { type: "channeled", objectId: "rune-1", player: "A" });
    expect(next.objects["rune-1"].zone).toEqual({ kind: "base", player: "A" });
  });
});

describe("pointScored (CR 471)", () => {
  it("records the point and the battlefield scored this turn", () => {
    const next = applyEvent(makeState(), {
      type: "pointScored",
      player: "A",
      method: "conquer",
      battlefieldId: "BF1",
      drewCardInstead: false,
    });
    expect(next.players.A.points).toBe(1);
    expect(next.players.A.scoredBattlefieldsThisTurn.has("BF1")).toBe(true);
  });

  it("draws a card INSTEAD when the final-point condition failed (471.1.b.1)", () => {
    const card = makeUnit({ objectId: "c1", printedMight: 1, zone: { kind: "mainDeck", player: "A" } });
    const state = stateWithObjects([card], {
      deckOrder: { A: ["c1"], B: [] },
      players: { A: emptyPlayerState("A", { points: 7 }), B: emptyPlayerState("B") },
    });

    const next = applyEvent(state, {
      type: "pointScored",
      player: "A",
      method: "conquer",
      battlefieldId: "BF1",
      drewCardInstead: true,
    });

    expect(next.players.A.points).toBe(7); // no point landed
    expect(next.objects.c1.zone).toEqual({ kind: "hand", player: "A" }); // drew instead
  });
});

describe("buffed — the already-buffed no-op (CR 426.1.c)", () => {
  it("applied:false records that the buff DID NOT happen", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, buffCount: 1 });
    const next = applyEvent(stateWithObjects([unit]), { type: "buffed", objectId: "u1", applied: false });
    expect(next.objects.u1.buffCount).toBe(1); // unchanged
  });
});

describe("unknown event types", () => {
  // Silent tolerance is the wrong contract — it fabricates "nothing happened"
  // with no record of what was skipped. That's foldEvents' job (see
  // matchPipeline.test.ts): it routes unknown types to an UnrecognizedEvent
  // rather than calling applyEvent at all. applyEvent throws defensively if
  // it's ever reached with one.
  it("applyEvent throws for an unrecognized event type reaching it directly", () => {
    const futureEvent = { type: "someFutureEventNotYetDefined", foo: "bar" } as unknown as GameEvent;
    expect(() => applyEvent(makeState(), futureEvent)).toThrow(/unreachable/);
  });
});

describe("migrate", () => {
  it("is an identity pass from v2 to v2", () => {
    const events: GameEvent[] = [{ type: "gameStarted", firstPlayer: "A" }];
    expect(migrate(events, 2, 2)).toEqual(events);
  });

  it("refuses to fabricate a v1 -> v2 lift (the rules model was replaced wholesale)", () => {
    expect(() => migrate([], 1, 2)).toThrow(/no migration registered/);
  });
});
