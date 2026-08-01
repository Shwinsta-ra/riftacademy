import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "../schema";
import type { CapturedMatch, CaptureTag } from "../schema";
import { makeState } from "./fixtures";

// GameState now carries Sets (statuses, scoredBattlefieldsThisTurn) and a
// function (format.legality), so a raw JSON round-trip is no longer the right
// serialization check for the capture envelope. These tests target the
// capture-provenance FIELDS, which are all plain data.

function makeCapturedMatch(overrides: Partial<CapturedMatch> = {}): CapturedMatch {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    gameId: "game-1",
    reviewerId: "ashwin",
    captureProfile: ["digital", "third-person", "fog-of-war", "reExaminable"],
    initialState: makeState(),
    events: [],
    ...overrides,
  };
}

describe("CapturedMatch — capture-provenance fields", () => {
  it("round-trips captureProfile, gameId, reviewerId, sourceRef, and turnSourceRefs", () => {
    const tags: CaptureTag[] = ["physical", "first-person", "partial", "not-reExaminable"];
    const match = makeCapturedMatch({
      captureProfile: tags,
      sourceRef: { kind: "vod", url: "https://example.com/vod" },
      turnSourceRefs: { 1: "00:01:23", 2: "00:04:56" },
    });

    const { initialState: _initialState, ...provenance } = match;
    const serialized = JSON.parse(JSON.stringify(provenance)) as Omit<CapturedMatch, "initialState">;

    expect(serialized.gameId).toBe("game-1");
    expect(serialized.reviewerId).toBe("ashwin");
    expect(serialized.captureProfile).toEqual(tags);
    expect(serialized.sourceRef).toEqual({ kind: "vod", url: "https://example.com/vod" });
    expect(serialized.turnSourceRefs).toEqual({ 1: "00:01:23", 2: "00:04:56" });
  });

  it("distinguishes two artifacts of the same game by reviewerId", () => {
    const humanPass = makeCapturedMatch({ gameId: "game-42", reviewerId: "ashwin" });
    const enginePass = makeCapturedMatch({ gameId: "game-42", reviewerId: "code" });

    expect(humanPass.gameId).toBe(enginePass.gameId);
    expect(humanPass.reviewerId).not.toBe(enginePass.reviewerId);
  });
});
