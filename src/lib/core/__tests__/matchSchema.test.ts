import { describe, expect, it } from "vitest";
import { applyEvent } from "../rulesKernel";
import { migrate } from "../migrate";
import type { GameEvent, ObjectInstance } from "../schema";
import { emptyPlayerState, makeObject, makeState } from "./fixtures";

describe("cardRevealed — the belief-state primitive (G1)", () => {
  it("resolves a null cardId to the revealed identity", () => {
    const hidden = makeObject({ instanceId: "obj-1", cardId: null, knownToOpponent: false });
    const state = makeState({
      players: {
        A: emptyPlayerState("A", { hand: [hidden] }),
        B: emptyPlayerState("B"),
      },
    });

    const event: GameEvent = {
      type: "cardRevealed",
      cardInstanceId: "obj-1",
      cardId: "ven-001-166",
      toPlayer: "B",
      source: "combat",
    };

    const next = applyEvent(state, event);
    const revealed = next.players.A.hand.find((o) => o.instanceId === "obj-1") as ObjectInstance;
    expect(revealed.cardId).toBe("ven-001-166");
    expect(revealed.knownToOpponent).toBe(true);
  });

  it("leaves knownToOpponent unchanged when revealed to the owner themself", () => {
    const hidden = makeObject({ instanceId: "obj-2", cardId: null, knownToOpponent: false });
    const state = makeState({
      players: {
        A: emptyPlayerState("A", { hand: [hidden] }),
        B: emptyPlayerState("B"),
      },
    });

    const next = applyEvent(state, {
      type: "cardRevealed",
      cardInstanceId: "obj-2",
      cardId: "ven-002-166",
      toPlayer: "A",
      source: "mulligan-peek",
    });

    const revealed = next.players.A.hand.find((o) => o.instanceId === "obj-2") as ObjectInstance;
    expect(revealed.cardId).toBe("ven-002-166");
    expect(revealed.knownToOpponent).toBe(false);
  });
});

describe("cardPlayed — enriched (G3)", () => {
  function stateWithHandCard() {
    const card = makeObject({ instanceId: "hand-1", cardId: "ven-010-166" });
    return makeState({
      players: {
        A: emptyPlayerState("A", { hand: [card] }),
        B: emptyPlayerState("B"),
      },
    });
  }

  it("folds with targets/battlefieldId/fromZone/costPaid present", () => {
    const state = stateWithHandCard();
    const next = applyEvent(state, {
      type: "cardPlayed",
      player: "A",
      cardInstanceId: "hand-1",
      targets: ["some-unit"],
      battlefieldId: "BF1",
      fromZone: "hand",
      costPaid: { energy: 1, powerCount: 1, powerPips: [] },
    });
    expect(next.players.A.hand).toHaveLength(0);
    expect(next.players.A.discard.map((o) => o.instanceId)).toEqual(["hand-1"]);
  });

  it("still folds as a bare 2-field event (back-compat)", () => {
    const state = stateWithHandCard();
    const next = applyEvent(state, { type: "cardPlayed", player: "A", cardInstanceId: "hand-1" });
    expect(next.players.A.hand).toHaveLength(0);
    expect(next.players.A.discard.map((o) => o.instanceId)).toEqual(["hand-1"]);
  });
});

describe("setup + rune events (G4/G5)", () => {
  it("gameStarted sets the first player as active", () => {
    const state = makeState({ activePlayer: "A" });
    const next = applyEvent(state, { type: "gameStarted", firstPlayer: "B" });
    expect(next.activePlayer).toBe("B");
  });

  it("mulligan returns named hand cards to the deck", () => {
    const keep = makeObject({ instanceId: "keep-1" });
    const toss = makeObject({ instanceId: "toss-1" });
    const state = makeState({
      players: {
        A: emptyPlayerState("A", { hand: [keep, toss], deck: [] }),
        B: emptyPlayerState("B"),
      },
    });

    const next = applyEvent(state, { type: "mulligan", player: "A", returnedInstanceIds: ["toss-1"] });
    expect(next.players.A.hand.map((o) => o.instanceId)).toEqual(["keep-1"]);
    expect(next.players.A.deck.map((o) => o.instanceId)).toEqual(["toss-1"]);
  });

  it("runeChanneled adds a rune to the player's pool", () => {
    const state = makeState({
      players: {
        A: emptyPlayerState("A", { runes: [] }),
        B: emptyPlayerState("B"),
      },
    });

    const next = applyEvent(state, { type: "runeChanneled", player: "A", instanceId: "rune-1", domain: "Fury" });
    expect(next.players.A.runes).toEqual([{ instanceId: "rune-1", domain: "Fury", tapped: false }]);
  });
});

describe("unknown event types (superseded by docs/design/RiftCore_Match_Pipeline_Contract.md §5)", () => {
  // Silent tolerance turned out to be the wrong contract — it fabricates
  // "nothing happened" with no record of what was skipped. That's now
  // foldEvents' job (see matchPipeline.test.ts): it routes an unknown type
  // to an UnrecognizedEvent instead of calling applyEvent at all.
  // applyEvent itself now throws if it's ever reached with an unknown type,
  // as a defensive invariant for callers that bypass foldEvents.
  it("applyEvent throws (defensively) for an unrecognized event type reaching it directly", () => {
    const state = makeState();
    const futureEvent = { type: "someFutureEventNotYetDefined", foo: "bar" } as unknown as GameEvent;
    expect(() => applyEvent(state, futureEvent)).toThrow(/unreachable/);
  });
});

describe("round-trip — Game-A-style event stream", () => {
  it("folds a short representative capture to a coherent snapshot", () => {
    const unitCard = makeObject({ instanceId: "A-u1", cardId: "ven-020-166" });
    const initial = makeState({
      players: {
        A: emptyPlayerState("A", { hand: [unitCard] }),
        B: emptyPlayerState("B"),
      },
      battlefields: [{ battlefieldId: "BF2", units: [] }],
      pointsToWin: 8,
    });

    const events: GameEvent[] = [
      { type: "gameStarted", firstPlayer: "A" },
      { type: "cardPlayed", player: "A", cardInstanceId: "A-u1", fromZone: "hand" },
      {
        type: "unitEntered",
        handInstanceId: "A-u1",
        unit: {
          instanceId: "A-u1",
          cardId: "ven-020-166",
          controller: "A",
          might: 3,
          mightMods: [],
          keywordGrants: [],
          damage: 0,
          stunned: false,
          tapped: false,
          zone: "battlefield",
          battlefieldId: "BF2",
        },
      },
      { type: "pointScored", player: "A", amount: 1, source: "conquer", isWinningPoint: false, battlefieldId: "BF2" },
    ];

    const final = events.reduce(applyEvent, initial);
    expect(final.activePlayer).toBe("A");
    expect(final.players.A.hand).toHaveLength(0);
    expect(final.battlefields.find((bf) => bf.battlefieldId === "BF2")?.units.map((u) => u.instanceId)).toEqual([
      "A-u1",
    ]);
    expect(final.players.A.points).toBe(1);
  });
});

describe("migrate", () => {
  it("is an identity pass from v1 to v1", () => {
    const events: GameEvent[] = [{ type: "gameStarted", firstPlayer: "A" }];
    expect(migrate(events, 1, 1)).toEqual(events);
  });
});
