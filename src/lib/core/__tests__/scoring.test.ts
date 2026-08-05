import { describe, expect, it } from "vitest";
import { makeFormatContext } from "../format";
import { burnOut } from "../actions";
import { canScore, checkWin, recordScore, resolveScore, scoredEveryBattlefield } from "../scoring";
import { emptyPlayerState, makeState, makeUnit, stateWithObjects } from "./fixtures";

const ctx = makeFormatContext("1v1", "constructed"); // victoryScore 8

describe("resolveScore — restrictions gate CONQUER ONLY (CR 471.1.a.1)", () => {
  it("Hold is UNRESTRICTED even at VictoryScore - 1", () => {
    // This is the correction that kills the legacy "holdAtSeven" winning
    // line: holding at 7 isn't a special line, it just scores.
    const player = emptyPlayerState("A", { points: 7 });
    expect(resolveScore(player, "hold", ctx, false)).toEqual({ gainPoint: true, drawCardInstead: false });
  });

  it("Conquer at VictoryScore - 1 grants the Final Point when every Battlefield was Scored this turn", () => {
    const player = emptyPlayerState("A", { points: 7 });
    expect(resolveScore(player, "conquer", ctx, true)).toEqual({ gainPoint: true, drawCardInstead: false });
  });

  it("Conquer at VictoryScore - 1 DRAWS A CARD INSTEAD when it wasn't (471.1.b.1)", () => {
    const player = emptyPlayerState("A", { points: 7 });
    expect(resolveScore(player, "conquer", ctx, false)).toEqual({ gainPoint: false, drawCardInstead: true });
  });

  it("Conquer below the threshold is unrestricted", () => {
    const player = emptyPlayerState("A", { points: 3 });
    expect(resolveScore(player, "conquer", ctx, false)).toEqual({ gainPoint: true, drawCardInstead: false });
  });

  it("keys on the player's CURRENT total, not a turn-start snapshot", () => {
    // The legacy model snapshotted pointsAtTurnStart and keyed off it. CR
    // 471.1.b keys on the live total, so a mid-turn conquer that reaches 7
    // DOES gate the next conquer.
    const reachedMidTurn = emptyPlayerState("A", { points: 7 });
    expect(resolveScore(reachedMidTurn, "conquer", ctx, false).drawCardInstead).toBe(true);
  });

  it("scales with a non-default victoryScore (2v2 at 11)", () => {
    const teamCtx = makeFormatContext("2v2", "constructed");
    expect(teamCtx.victoryScore).toBe(11);
    expect(resolveScore(emptyPlayerState("A", { points: 10 }), "conquer", teamCtx, false).drawCardInstead).toBe(true);
    expect(resolveScore(emptyPlayerState("A", { points: 9 }), "conquer", teamCtx, false).gainPoint).toBe(true);
  });
});

describe("once per Battlefield per turn, across BOTH methods (CR 470)", () => {
  it("blocks a second Score of the same battlefield", () => {
    let player = emptyPlayerState("A");
    expect(canScore(player, "bf1")).toBe(true);
    player = recordScore(player, "bf1");
    expect(canScore(player, "bf1")).toBe(false);
    expect(canScore(player, "bf2")).toBe(true);
  });

  it("Hunt X grants XP on Conquer or Hold (CR 823)", () => {
    const player = recordScore(emptyPlayerState("A"), "bf1", 2);
    expect(player.xp).toBe(2);
  });
});

describe("scoredEveryBattlefield (CR 471.1.b)", () => {
  it("is true only once every battlefield in play has been scored", () => {
    const state = makeState({
      battlefieldIds: ["bf1", "bf2"],
      players: { A: recordScore(emptyPlayerState("A"), "bf1"), B: emptyPlayerState("B") },
    });
    expect(scoredEveryBattlefield(state, "A")).toBe(false);

    const both = makeState({
      battlefieldIds: ["bf1", "bf2"],
      players: { A: recordScore(recordScore(emptyPlayerState("A"), "bf1"), "bf2"), B: emptyPlayerState("B") },
    });
    expect(scoredEveryBattlefield(both, "A")).toBe(true);
  });

  it("generalizes past two battlefields (the legacy model hardcoded exactly 2)", () => {
    const state = makeState({
      battlefieldIds: ["bf1", "bf2", "bf3"],
      players: { A: recordScore(recordScore(emptyPlayerState("A"), "bf1"), "bf2"), B: emptyPlayerState("B") },
    });
    expect(scoredEveryBattlefield(state, "A")).toBe(false);
  });
});

describe("checkWin — strict majority at a Cleanup (CR 472)", () => {
  it("wins at the victory score when strictly ahead", () => {
    const state = makeState({
      players: { A: emptyPlayerState("A", { points: 8 }), B: emptyPlayerState("B", { points: 5 }) },
    });
    expect(checkWin(state, ctx)).toBe("A");
  });

  it("a TIE at the victory score does NOT win", () => {
    const state = makeState({
      players: { A: emptyPlayerState("A", { points: 8 }), B: emptyPlayerState("B", { points: 8 }) },
    });
    expect(checkWin(state, ctx)).toBeNull();
  });

  it("does not win below the victory score even when far ahead", () => {
    const state = makeState({
      players: { A: emptyPlayerState("A", { points: 7 }), B: emptyPlayerState("B", { points: 0 }) },
    });
    expect(checkWin(state, ctx)).toBeNull();
  });

  it("CR 472 — both players over the threshold: strict majority decides", () => {
    const state = makeState({
      players: { A: emptyPlayerState("A", { points: 9 }), B: emptyPlayerState("B", { points: 8 }) },
    });
    expect(checkWin(state, ctx)).toBe("A");
  });

  it("CR 472 — both over the threshold and EQUAL: no winner", () => {
    const state = makeState({
      players: { A: emptyPlayerState("A", { points: 12 }), B: emptyPlayerState("B", { points: 12 }) },
    });
    expect(checkWin(state, ctx)).toBeNull();
  });

  it("CR 483.3 — victoryScore comes from the FormatContext; nothing hardcodes 8", () => {
    const state = makeState({
      players: { A: emptyPlayerState("A", { points: 8 }), B: emptyPlayerState("B", { points: 0 }) },
    });
    expect(checkWin(state, makeFormatContext("1v1", "constructed"))).toBe("A");
    expect(checkWin(state, makeFormatContext("2v2", "constructed"))).toBeNull(); // 11 in 2v2
  });

  it("scales past three players — the leader must beat EVERY opponent", () => {
    const state = makeState({
      players: {
        A: emptyPlayerState("A", { points: 8 }),
        B: emptyPlayerState("B", { points: 8 }),
        C: emptyPlayerState("C", { points: 1 }),
      },
    });
    expect(checkWin(state, ctx)).toBeNull(); // A ties B
  });
});

describe("Burn Out — deck-out donates points, it is NOT a loss (CR 431)", () => {
  const deckedOut = () => {
    const trashed = makeUnit({
      objectId: "t1",
      printedMight: 2,
      owner: "A",
      controller: "A",
      zone: { kind: "trash", player: "A" },
    });
    return stateWithObjects([trashed], {
      deckOrder: { A: [], B: [] },
      players: { A: emptyPlayerState("A", { points: 3 }), B: emptyPlayerState("B", { points: 5 }) },
    });
  };

  it("CR 431.2.b/.c — recycles the trash into the Main Deck and gives an opponent 1 point", () => {
    const after = burnOut(deckedOut(), "A", "B");
    expect(after.players.B.points).toBe(6); // 431.2.c
    expect(after.players.A.points).toBe(3); // the burning player loses nothing
    expect(after.objects.t1.zone.kind).toBe("mainDeck"); // 431.2.b
  });

  it("CR 431 — running out of deck is not a loss condition for the burning player", () => {
    const after = burnOut(deckedOut(), "A", "B");
    expect(checkWin(after, ctx)).toBeNull(); // nobody has won; A is still playing
  });

  it("CR 431.3.a — repeated Burn Outs walk an opponent to the Victory Score", () => {
    // Empty deck AND empty trash: each attempt burns out again, donating a
    // point every time, until the opponent wins. Nothing about this ends the
    // game for the player who decked out.
    let state = stateWithObjects([], {
      deckOrder: { A: [], B: [] },
      players: { A: emptyPlayerState("A"), B: emptyPlayerState("B", { points: 5 }) },
    });
    for (let i = 0; i < 3; i++) state = burnOut(state, "A", "B");
    expect(state.players.B.points).toBe(8);
    expect(checkWin(state, ctx)).toBe("B"); // 431.3.c
  });

  it("CR 431.2.c — the burning player CHOOSES which opponent gains the point", () => {
    const state = stateWithObjects([], {
      deckOrder: { A: [], B: [], C: [] },
      players: {
        A: emptyPlayerState("A"),
        B: emptyPlayerState("B"),
        C: emptyPlayerState("C"),
      },
    });
    const after = burnOut(state, "A", "C");
    expect(after.players.C.points).toBe(1);
    expect(after.players.B.points).toBe(0);
  });
});
