// Turn structure, the four turn states, Priority and Focus. CR 300-317.
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part1.md §2-§3,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §6.
//
// Phases are rigid; actions within them are flexible (303). Speed legality is
// a pure function of the four turn states (310) rather than an ad-hoc check —
// that's the structural correction over the legacy flat TurnPhase enum.

import type { OpenState, Phase, PlayerId, ShowdownState, Step, TimingPermission, TurnState } from "./schema";

/** CR 315-317 — the rigid phase sequence. Combat is NOT a phase (it's a Cleanup-triggered procedure, 460). */
export const PHASE_ORDER: readonly Phase[] = ["awaken", "beginning", "channel", "draw", "main", "ending"] as const;

/** CR 315.2 / 317 — the steps that live inside a phase, in order. */
export const STEPS_BY_PHASE: Partial<Record<Phase, readonly Step[]>> = {
  beginning: ["beginningStep", "scoringStep"], // CR 315.2.a / 315.2.b
  ending: ["endingStep", "expirationStep"], // CR 317.1 / 317.2
};

/** CR 310 — the four turn states as a single discriminated label. */
export type TurnStateLabel = "neutralOpen" | "neutralClosed" | "showdownOpen" | "showdownClosed";

/** CR 310 */
export function turnStateLabel(showdown: ShowdownState, open: OpenState): TurnStateLabel {
  if (showdown === "neutral") return open === "open" ? "neutralOpen" : "neutralClosed";
  return open === "open" ? "showdownOpen" : "showdownClosed";
}

/**
 * CR 308-310 — speed legality is a pure function of turn state.
 *  - Neutral Open (310.1): anything, with Priority, on your turn.
 *  - Neutral Closed (310.2): Reaction only (309.1.a).
 *  - Showdown Open (310.3): Action or Reaction (308.1.a).
 *  - Showdown Closed (310.4): Reaction only (309.1.a n 308.1.a).
 */
export function isTimingPermitted(
  turn: TurnState,
  timing: TimingPermission,
  player: PlayerId
): boolean {
  const label = turnStateLabel(turn.showdownState, turn.openState);
  switch (label) {
    case "neutralOpen": {
      // CR 381 — activated abilities without Action/Reaction are own-turn + Open only.
      if (timing.openStateOwnTurnOnly && turn.turnPlayer !== player) return false;
      return true;
    }
    case "neutralClosed":
      return timing.reaction; // 309.1.a
    case "showdownOpen":
      return timing.action || timing.reaction; // 308.1.a
    case "showdownClosed":
      return timing.reaction; // 309.1.a n 308.1.a
  }
}

/** CR 312.2 — the four ways Priority is granted. */
export type PriorityGrant =
  | { reason: "mainPhaseOpen" } // 312.2.a
  | { reason: "gainedFocus" } // 312.2.b
  | { reason: "controlsNextChainItem" } // 312.2.c
  | { reason: "priorPassedInClosedState" }; // 312.2.d

/** CR 312 — grant Priority to `player`. Gaining Focus also grants Priority (313.2), handled in grantFocus. */
export function grantPriority(turn: TurnState, player: PlayerId): TurnState {
  return { ...turn, priority: player };
}

/** CR 313.2 — gaining Focus grants Priority. CR 313.5 — no Focus in Neutral states. */
export function grantFocus(turn: TurnState, player: PlayerId): TurnState {
  if (turn.showdownState === "neutral") return turn; // 313.5
  return { ...turn, focus: player, priority: player };
}

/** CR 313.3 — passing Priority RETAINS Focus. The two slots are independent. */
export function passPriorityTo(turn: TurnState, next: PlayerId | null): TurnState {
  return { ...turn, priority: next };
}

/** CR 306 / 115.1 — the player after `player` in turn order (looping). */
export function nextInTurnOrder(turn: TurnState, player: PlayerId): PlayerId {
  const index = turn.turnOrder.indexOf(player);
  if (index === -1) return turn.turnOrder[0];
  return turn.turnOrder[(index + 1) % turn.turnOrder.length];
}

/** CR 346 — during a Showdown, Focus passes to the next player in turn order when a chain empties. */
export function passFocus(turn: TurnState): TurnState {
  if (turn.focus === null) return turn;
  const next = nextInTurnOrder(turn, turn.focus);
  return { ...turn, focus: next, priority: next }; // 313.2 — gaining Focus grants Priority
}

/** CR 313.5 — Focus exists only in Showdown states; clear it on returning to Neutral. */
export function setShowdownState(turn: TurnState, showdownState: ShowdownState): TurnState {
  if (showdownState === "neutral") return { ...turn, showdownState, focus: null };
  return { ...turn, showdownState };
}

export function setOpenState(turn: TurnState, openState: OpenState): TurnState {
  return { ...turn, openState };
}

/**
 * CR 315-317 — advance to the next step within the phase, or to the next
 * phase. Returns null at the end of the Ending Phase, meaning the turn is
 * over and the caller should hand off to the next Turn Player (306).
 */
export function advancePhase(turn: TurnState): TurnState | null {
  const steps = STEPS_BY_PHASE[turn.phase];
  if (steps && turn.step) {
    const stepIndex = steps.indexOf(turn.step);
    if (stepIndex !== -1 && stepIndex < steps.length - 1) {
      return { ...turn, step: steps[stepIndex + 1] };
    }
  }
  const phaseIndex = PHASE_ORDER.indexOf(turn.phase);
  if (phaseIndex === PHASE_ORDER.length - 1) return null; // end of Ending Phase — turn is over
  const nextPhase = PHASE_ORDER[phaseIndex + 1];
  const nextSteps = STEPS_BY_PHASE[nextPhase];
  return { ...turn, phase: nextPhase, step: nextSteps ? nextSteps[0] : undefined };
}

/**
 * CR 306 + 734-738 — hand the turn to the next player. An Additional Turn
 * (737) is inserted into the queue WITHOUT changing turn order: it's consumed
 * here in generation order (738) before falling through to normal rotation.
 */
export function beginNextTurn(turn: TurnState): TurnState {
  const [additional, ...restAdditional] = turn.additionalTurns;
  const nextPlayer = additional ?? nextInTurnOrder(turn, turn.turnPlayer);
  return {
    ...turn,
    turnPlayer: nextPlayer,
    additionalTurns: additional ? restAdditional : turn.additionalTurns,
    phase: "awaken",
    step: undefined,
    showdownState: "neutral",
    openState: "open",
    priority: null,
    focus: null,
  };
}
