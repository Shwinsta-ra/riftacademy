import { describe, expect, it } from "vitest";
import { checkClean, foldEvents, materialize, readSnapshot } from "../rulesKernel";
import { CURRENT_SCHEMA_VERSION } from "../schema";
import type { GameEvent, ReconstructedMatch } from "../schema";
import { emptyPlayerState, makeState, makeUnit, stateWithObjects } from "./fixtures";

describe("foldEvents — record-don't-skip", () => {
  it("records an unknown event type without throwing or corrupting state, and keeps folding after it", () => {
    const state = makeState();
    const unknownEvent = { type: "someFutureEventNotYetDefined", foo: "bar" } as unknown as GameEvent;
    const events: GameEvent[] = [
      { type: "gameStarted", firstPlayer: "B" },
      unknownEvent,
      { type: "gameStarted", firstPlayer: "A" },
    ];

    let result: ReturnType<typeof foldEvents>;
    expect(() => {
      result = foldEvents(state, events);
    }).not.toThrow();

    const { finalState, snapshots, unresolved } = result!;
    expect(unresolved).toEqual([
      { index: 1, rawEvent: unknownEvent, schemaVersion: CURRENT_SCHEMA_VERSION, reason: "unrecognized-type" },
    ]);
    expect(snapshots).toHaveLength(3);
    expect(snapshots[0].completeness).toBe("full");
    expect(snapshots[1].completeness).toBe("partial");
    // The unknown event carries the PRIOR state forward unchanged, not corrupted.
    expect(snapshots[1].state).toEqual(snapshots[0].state);
    expect(snapshots[2].completeness).toBe("full");
    // Folding resumes correctly after the unknown event.
    expect(finalState.turn.turnPlayer).toBe("A");
  });
});

describe("materialize", () => {
  it("returns one snapshot per event", () => {
    const events: GameEvent[] = [
      { type: "gameStarted", firstPlayer: "A" },
      { type: "gameStarted", firstPlayer: "B" },
      { type: "gameStarted", firstPlayer: "A" },
    ];
    expect(materialize(makeState(), events)).toHaveLength(3);
  });
});

describe("readSnapshot — the reader accessor", () => {
  const baseMatch: ReconstructedMatch = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    events: [],
    snapshots: [{ state: makeState(), completeness: "full" }],
    status: "raw",
    unresolved: [],
  };

  it('throws when status is "raw"', () => {
    expect(() => readSnapshot(baseMatch, 0)).toThrow(/verified/);
  });

  it('throws when status is "reconstructed"', () => {
    expect(() => readSnapshot({ ...baseMatch, status: "reconstructed" }, 0)).toThrow(/verified/);
  });

  it('succeeds when status is "verified"', () => {
    const verified = { ...baseMatch, status: "verified" as const };
    expect(readSnapshot(verified, 0)).toBe(verified.snapshots[0]);
  });

  it("throws for an out-of-range index even when verified", () => {
    expect(() => readSnapshot({ ...baseMatch, status: "verified" }, 5)).toThrow(/no snapshot/);
  });
});

describe("checkClean — the deductive gate", () => {
  // A minimal clean stream: A has an affordable Rune Pool and plays a card,
  // then scores a point. costPaid lives on the SECOND event so checkClean's
  // affordability check has a preceding snapshot to check against (the first
  // event in a stream has no "before" state).
  function cleanMatch(): ReconstructedMatch {
    const card = makeUnit({ objectId: "hand-1", printedMight: 2, zone: { kind: "hand", player: "A" } });
    const initial = stateWithObjects([card], {
      players: {
        A: emptyPlayerState("A", { runePool: { energy: 1, power: [] } }),
        B: emptyPlayerState("B"),
      },
    });
    const events: GameEvent[] = [
      { type: "pointScored", player: "A", method: "conquer", battlefieldId: "BF1", drewCardInstead: false },
      { type: "played", objectId: "hand-1", player: "A", costPaid: { energy: 1, power: [] } },
    ];
    const { snapshots, unresolved } = foldEvents(initial, events);
    return { schemaVersion: CURRENT_SCHEMA_VERSION, events, snapshots, status: "reconstructed", unresolved };
  }

  it("passes on a clean legal stream whose folded outcome matches", () => {
    const result = checkClean(cleanMatch(), { finalPoints: { A: 1, B: 0 } });
    expect(result).toMatchObject({
      pass: true,
      foldable: true,
      noBlackBoxes: true,
      allLegal: true,
      outcomeConsistent: true,
      failures: [],
    });
  });

  it("fails when unresolved is non-empty", () => {
    const m = cleanMatch();
    const withUnresolved: ReconstructedMatch = {
      ...m,
      unresolved: [{ index: 0, rawEvent: {}, schemaVersion: CURRENT_SCHEMA_VERSION, reason: "unrecognized-type" }],
    };
    const result = checkClean(withUnresolved, { finalPoints: { A: 1, B: 0 } });
    expect(result.pass).toBe(false);
    expect(result.noBlackBoxes).toBe(false);
  });

  it("fails on an injected illegal play (unaffordable costPaid)", () => {
    const m = cleanMatch();
    const illegalEvents = m.events.map((e, i) =>
      i === 1 && e.type === "played" ? { ...e, costPaid: { energy: 99, power: [] } } : e
    );
    const result = checkClean({ ...m, events: illegalEvents }, { finalPoints: { A: 1, B: 0 } });
    expect(result.pass).toBe(false);
    expect(result.allLegal).toBe(false);
  });

  it("fails on an outcome mismatch", () => {
    const result = checkClean(cleanMatch(), { finalPoints: { A: 99, B: 0 } });
    expect(result.pass).toBe(false);
    expect(result.outcomeConsistent).toBe(false);
  });

  it("checks the winner via CR 472's strict-majority rule", () => {
    const m = cleanMatch();
    // A has 1 point, nowhere near the victory score — so claiming A won fails.
    const result = checkClean(m, { winner: "A" });
    expect(result.outcomeConsistent).toBe(false);
  });
});
