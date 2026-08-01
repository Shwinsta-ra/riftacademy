import { describe, expect, it } from "vitest";
import { makeFormatContext } from "../format";
import { canScore, checkWin, recordScore, resolveScore, scoredEveryBattlefield } from "../scoring";
import { emptyPlayerState, makeState } from "./fixtures";

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
});
