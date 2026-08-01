// Scoring and winning. CR 467-472.
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part2.md §5,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §10.
//
// This replaces the legacy WinningLine taxonomy entirely (holdAtSeven /
// conquerBothAtSix / holdOneConquerOneAtSix keyed on pointsAtTurnStart). The
// real rule: restrictions gate CONQUER ONLY — Hold is explicitly unrestricted
// (471.1.a.1) — the gate keys on the player's CURRENT total (not turn-start),
// and the condition is "Scored EVERY Battlefield this turn" by either method,
// which generalizes to any battlefield count and any mode. Failing it draws a
// card instead (471.1.b.1).

import type { FormatContext, GameState, ObjectId, PlayerId, PlayerState, ScoreMethod } from "./schema";

/** CR 470 — a player may Score each Battlefield only once per turn, across BOTH methods. */
export function canScore(player: PlayerState, battlefieldId: ObjectId): boolean {
  return !player.scoredBattlefieldsThisTurn.has(battlefieldId);
}

/**
 * CR 471.1 — the real final-point rule.
 *
 * Restrictions apply to Conquer ONLY; points from non-Conquer sources
 * (including Hold) are explicitly NOT restricted (471.1.a.1). When a player
 * attempts to gain a point via Conquer while their total is >= VictoryScore
 * - 1: if they have Scored EVERY Battlefield this turn they gain the Final
 * Point, otherwise they DRAW A CARD instead (471.1.b.1).
 */
export function resolveScore(
  player: PlayerState,
  method: ScoreMethod,
  ctx: FormatContext,
  scoredEveryBattlefieldThisTurn: boolean
): { gainPoint: boolean; drawCardInstead: boolean } {
  if (method === "conquer" && player.points >= ctx.victoryScore - 1) {
    return scoredEveryBattlefieldThisTurn
      ? { gainPoint: true, drawCardInstead: false }
      : { gainPoint: false, drawCardInstead: true };
  }
  return { gainPoint: true, drawCardInstead: false };
}

/** CR 471.1.b — has this player Scored every Battlefield in play this turn (either method)? */
export function scoredEveryBattlefield(state: GameState, playerId: PlayerId): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  return state.battlefieldIds.every((id) => player.scoredBattlefieldsThisTurn.has(id));
}

/**
 * CR 472 — the win check. Points >= Victory Score AND strictly more points
 * than any opponent. Ties do NOT win, and this is evaluated at a Cleanup
 * (it runs as Cleanup task #1, CR 323.1) rather than at the instant a point
 * lands. Both properties are corrections over the legacy model.
 */
export function checkWin(state: GameState, ctx: FormatContext): PlayerId | null {
  const entries = Object.values(state.players);
  for (const player of entries) {
    if (player.points < ctx.victoryScore) continue;
    const beatsEveryone = entries.every((other) => other.playerId === player.playerId || player.points > other.points);
    if (beatsEveryone) return player.playerId;
  }
  return null;
}

/** CR 470 — clear per-turn scoring records. Called as part of turn handoff. */
export function clearScoredThisTurn(player: PlayerState): PlayerState {
  return { ...player, scoredBattlefieldsThisTurn: new Set() };
}

/** CR 471.2 + 823 — record a Score and apply Hunt XP if the scoring unit carries it. */
export function recordScore(player: PlayerState, battlefieldId: ObjectId, huntValue = 0): PlayerState {
  const scored = new Set(player.scoredBattlefieldsThisTurn);
  scored.add(battlefieldId);
  return { ...player, scoredBattlefieldsThisTurn: scored, xp: player.xp + huntValue };
}
