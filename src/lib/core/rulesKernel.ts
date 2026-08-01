// RiftCore kernel — orchestration, the event-fold, and the match pipeline.
//
// Pure, deterministic, no UI/storage. This is the accuracy contract every
// other module (RiftEngine's abduction, RiftLab's sim, RiftCoach's grading,
// RiftIQ's puzzle validation) leans on.
//
// The rules model proper lives in the sibling modules — layers.ts (473-480),
// turn.ts (300-317), chain.ts (318-348), abilities.ts (360-406), actions.ts
// (413-444), combat.ts (459-466), scoring.ts (467-472), format.ts (TR
// 104.1/601-603). This file holds the surviving pipeline layer (applyEvent /
// foldEvents / materialize / checkClean / readSnapshot — the PR #134/#145
// work), rebuilt over the v2 GameObject model, plus the cross-cutting
// legality entry points.

import * as actions from "./actions";
import { combatMight, isKilled } from "./combat";
import { currentMight } from "./layers";
import { checkWin } from "./scoring";
import { isTimingPermitted } from "./turn";
import { CURRENT_SCHEMA_VERSION } from "./schema";
import type {
  CandidateAction,
  Cost,
  FormatContext,
  GameEvent,
  GameState,
  GateResult,
  MatchStateSnapshot,
  ObjectId,
  PendingChainItem,
  PlayerId,
  ReconstructedMatch,
  TimingPermission,
  UnrecognizedEvent,
} from "./schema";

// Re-export the rules-model surface so `rulesKernel` stays the one import
// site for consumers that don't want to know the module layout.
export { applyLayers, currentMight, isMighty } from "./layers";
export { isTimingPermitted, advancePhase, beginNextTurn, turnStateLabel } from "./turn";
export { handleOutstandingTasks, finalize, passPriority, resolveTop, runCleanup, isCounterable } from "./chain";
export { legalDamageAssignments, resolveCombatDamage, combatMight, isKilled, minimumLethal, hasKeyword } from "./combat";
export { resolveScore, checkWin, canScore } from "./scoring";
export { makeFormatContext, cardLegality } from "./format";
export { canPay } from "./actions";

// ---------------------------------------------------------------------------
// Legality (CR 358)
// ---------------------------------------------------------------------------

/**
 * CR 358 — the Check Legality step: targets legal, costs paid, the outcome
 * would not create an illegal state, timing permissions satisfied.
 *
 * CR 358.3.a — a Game Effect PREVENTING an action does NOT make cards
 * instructing that action illegal to play; the action is simply skipped at
 * resolution as impossible. Legality is not effectiveness.
 */
export function checkLegality(
  state: GameState,
  item: PendingChainItem,
  timing?: TimingPermission
): { legal: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (item.objectId !== null && !state.objects[item.objectId]) {
    reasons.push(`unknown object "${item.objectId}"`);
  }
  if (timing && !isTimingPermitted(state.turn, timing, item.controller)) {
    reasons.push(`timing not permitted in state "${state.turn.showdownState}/${state.turn.openState}"`);
  }
  if (state.format.legality && item.objectId !== null) {
    const cardId = state.objects[item.objectId]?.cardId;
    if (cardId && state.format.legality(cardId) === "banned") {
      reasons.push(`card "${cardId}" is banned in this format`);
    }
  }
  return { legal: reasons.length === 0, reasons };
}

/**
 * CR 410 + 312 — the Discretionary Actions available to `player` right now.
 * Limited Actions are always takeable when instructed regardless of Priority
 * (312.1.b.1) and so never appear here.
 */
export function legalCandidateActions(state: GameState, player: PlayerId, _ctx: FormatContext): CandidateAction[] {
  if (state.turn.priority !== player) return [{ kind: "pass" }];

  const candidates: CandidateAction[] = [{ kind: "pass" }];

  for (const object of Object.values(state.objects)) {
    if (object.controller !== player) continue;

    // CR 419.1.a — by default a card is played only from Hand or the Champion Zone.
    if (object.zone.kind === "hand" || object.zone.kind === "championZone") {
      candidates.push({ kind: "play", objectId: object.objectId, targets: [] });
    }

    // CR 420.3 — the Standard Move is Discretionary; its cost is exhausting the unit.
    if (
      object.categories.includes("unit") &&
      (object.zone.kind === "base" || object.zone.kind === "battlefield") &&
      !object.statuses.has("exhausted")
    ) {
      for (const battlefieldId of state.battlefieldIds) {
        if (object.zone.kind === "battlefield" && object.zone.battlefieldId === battlefieldId) continue;
        candidates.push({ kind: "standardMove", objectId: object.objectId, to: { kind: "battlefield", battlefieldId } });
      }
    }
  }
  return candidates;
}

/** CR 356 — Total Cost: base-mods -> additional -> increases -> component-then-total discounts, with per-discount minimums. */
export function determineTotalCost(
  _state: GameState,
  baseCost: Cost,
  modifiers: {
    baseReplacement?: Cost; // 356.1 — "for [Cost]"; "ignore" -> zero
    additional?: Cost[]; // 356.2 — mandatory + accepted optional
    increases?: Cost[]; // 356.3
    componentDiscounts?: Cost[]; // 356.4 — component-level, applied before total-level
    totalDiscount?: number; // 356.4 — total-level energy discount
    discountMinimum?: number; // 356.4 — per-discount minimum
  } = {}
): Cost {
  let energy = (modifiers.baseReplacement ?? baseCost).energy;
  let power = [...(modifiers.baseReplacement ?? baseCost).power];

  for (const additional of modifiers.additional ?? []) {
    energy += additional.energy;
    power = [...power, ...additional.power];
  }
  for (const increase of modifiers.increases ?? []) {
    energy += increase.energy;
    power = [...power, ...increase.power];
  }
  for (const discount of modifiers.componentDiscounts ?? []) {
    energy = Math.max(modifiers.discountMinimum ?? 0, energy - discount.energy);
    for (const symbol of discount.power) {
      const index = power.findIndex((p) => JSON.stringify(p) === JSON.stringify(symbol));
      if (index !== -1) power.splice(index, 1);
    }
  }
  if (modifiers.totalDiscount) {
    energy = Math.max(modifiers.discountMinimum ?? 0, energy - modifiers.totalDiscount);
  }
  return { energy, power };
}

// ---------------------------------------------------------------------------
// applyEvent — folds one GameEvent into GameState
// ---------------------------------------------------------------------------

/** Every known GameEvent variant's `type`. foldEvents routes unknown types to UnrecognizedEvent BEFORE calling applyEvent. */
const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  "objectCreated",
  "objectMoved",
  "drew",
  "exhausted",
  "readied",
  "recycled",
  "dealt",
  "healed",
  "played",
  "unitMoved",
  "hidden",
  "discarded",
  "stunned",
  "revealed",
  "countered",
  "buffed",
  "banished",
  "killed",
  "added",
  "channeled",
  "burnedOut",
  "doubled",
  "swapped",
  "attached",
  "detached",
  "predicted",
  "prevented",
  "replaced",
  "burned",
  "empowered",
  "disempowered",
  "skipped",
  "paid",
  "pointScored",
  "gameWon",
  "phaseChanged",
  "priorityChanged",
  "focusChanged",
  "cleanupRan",
  "gameStarted",
  "mulligan",
]);

/**
 * Parser-only (RiftEngine). Folds one KNOWN GameEvent into GameState. Do not
 * call this directly on unvalidated/external data — an unknown event `type`
 * throws (see the default branch) rather than being tolerated, because
 * tolerance-without-corruption requires recording *which* event was skipped
 * and applyEvent has no return channel for that. Use foldEvents instead.
 */
export function applyEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "objectCreated":
      return actions.create(state, event.objectId, {
        cardId: event.cardId,
        owner: event.owner,
        zone: event.zone,
        categories: [],
      });
    case "objectMoved":
      return actions.changeZone(state, event.objectId, event.to, event.newObjectId);
    case "drew":
      return actions.draw(state, event.player, event.objectIds.length).state;
    case "exhausted":
      return actions.exhaust(state, event.objectId).state;
    case "readied":
      return actions.ready(state, event.objectId).state;
    case "recycled":
      return actions.recycle(state, [event.objectId], event.to);
    case "dealt":
      return actions.deal(state, event.targetObjectId, event.amount);
    case "healed":
      return actions.heal(state, event.objectId, event.amount);
    case "played":
      return actions.play(state, event.objectId, event.player);
    case "unitMoved":
      return actions.move(state, event.objectId, event.to);
    case "hidden":
      return actions.hide(state, event.objectId, event.battlefieldId);
    case "discarded":
      return actions.discard(state, event.objectId);
    case "stunned":
      return actions.stun(state, event.objectId).state;
    case "revealed":
      return actions.reveal(state, event.objectId, event.cardId);
    case "countered":
      return actions.counter(state, event.objectId);
    case "buffed":
      // CR 426.1.c — `applied: false` records an already-buffed no-op: the
      // buff did NOT happen, so follow-on "if it was buffed" clauses fail.
      return event.applied ? actions.buff(state, event.objectId).state : state;
    case "banished":
      return actions.banish(state, event.objectId);
    case "killed":
      return actions.kill(state, event.objectId).state;
    case "added":
      return actions.add(state, event.player, event.energy, event.power);
    case "channeled":
      return actions.channel(state, event.player, 1).state;
    case "burnedOut":
      return actions.burnOut(state, event.player, event.opponentAwarded);
    case "doubled": {
      const object = state.objects[event.objectId];
      if (!object || event.attr !== "might") return state;
      const doubled = actions.double(currentMight(state, event.objectId));
      return {
        ...state,
        objects: { ...state.objects, [event.objectId]: { ...object, printedMight: doubled } },
      };
    }
    case "swapped": {
      const a = state.objects[event.objectIdA];
      const b = state.objects[event.objectIdB];
      if (!a || !b) return state;
      const [nextA, nextB] = actions.swap(a.printedMight ?? 0, b.printedMight ?? 0);
      return {
        ...state,
        objects: {
          ...state.objects,
          [event.objectIdA]: { ...a, printedMight: nextA },
          [event.objectIdB]: { ...b, printedMight: nextB },
        },
      };
    }
    case "attached":
      return actions.attach(state, event.objectId, event.hostObjectId);
    case "detached":
      return actions.detach(state, event.objectId);
    case "predicted":
      return actions.recycle(state, event.recycled, "mainDeck");
    case "prevented":
      return actions.prevent(state, event.objectId, event.value);
    case "replaced":
      return actions.replace(state, event.objectId, event.tokenObjectId);
    case "burned":
      return actions.burn(state, event.player, event.objectIds.length).state;
    case "empowered":
      return actions.empower(state, event.objectId).state;
    case "disempowered":
      return actions.disempower(state, event.objectId).state;
    case "skipped":
      return actions.skip(state);
    case "paid":
      return actions.pay(state, event.player, event.cost).state;
    case "pointScored": {
      const player = state.players[event.player];
      if (!player) return state;
      // CR 471.1.b.1 — failing the final-point condition draws a card INSTEAD
      // of scoring; the point does not land.
      if (event.drewCardInstead) return actions.draw(state, event.player, 1).state;
      const scored = new Set(player.scoredBattlefieldsThisTurn);
      if (event.battlefieldId) scored.add(event.battlefieldId);
      return {
        ...state,
        players: {
          ...state.players,
          [event.player]: { ...player, points: player.points + 1, scoredBattlefieldsThisTurn: scored },
        },
      };
    }
    case "gameWon":
      return state; // terminal marker; no state mutation
    case "phaseChanged":
      return { ...state, turn: { ...state.turn, phase: event.phase, step: event.step } };
    case "priorityChanged":
      return { ...state, turn: { ...state.turn, priority: event.player } };
    case "focusChanged":
      return { ...state, turn: { ...state.turn, focus: event.player } };
    case "cleanupRan":
      return state; // the Cleanup's effects arrive as their own events
    case "gameStarted":
      return { ...state, turn: { ...state.turn, turnPlayer: event.firstPlayer } };
    case "mulligan": {
      // CR 117 — set aside up to 2, DRAW that many first, THEN Recycle the
      // set-asides to the bottom of the deck. No shuffle. (The legacy model
      // shuffled them back, which is not the rule.)
      const drawn = actions.draw(state, event.player, event.setAsideObjectIds.length);
      return actions.recycle(drawn.state, event.setAsideObjectIds, "mainDeck");
    }
    default: {
      // Exhaustiveness check — TS errors here if a GameEvent variant is added
      // without a case above. At runtime this must be unreachable: foldEvents
      // (the only sanctioned fold entry point) filters unknown types into
      // UnrecognizedEvent before ever calling applyEvent. Reaching here means
      // a caller bypassed foldEvents on unvalidated data — a caller bug, so
      // this throws rather than fabricating "nothing happened".
      const _exhaustive: never = event;
      const raw = _exhaustive as unknown as { type?: string };
      throw new Error(`applyEvent: unreachable — unrecognized event type "${raw?.type}". Use foldEvents instead.`);
    }
  }
}

/**
 * Parser-only (RiftEngine). The one sanctioned fold entry point over a raw
 * GameEvent[] — record-don't-skip: a known event type folds via applyEvent
 * and gets a "full" snapshot; an unknown type is recorded as an
 * UnrecognizedEvent (never thrown, never silently dropped) and the PRIOR
 * state carries forward unchanged with a "partial" snapshot.
 */
export function foldEvents(
  initial: GameState,
  events: GameEvent[]
): { finalState: GameState; snapshots: MatchStateSnapshot[]; unresolved: UnrecognizedEvent[] } {
  let state = initial;
  const snapshots: MatchStateSnapshot[] = [];
  const unresolved: UnrecognizedEvent[] = [];

  events.forEach((event, index) => {
    if (KNOWN_EVENT_TYPES.has(event.type)) {
      state = applyEvent(state, event);
      snapshots.push({ state, completeness: "full" });
    } else {
      unresolved.push({ index, rawEvent: event, schemaVersion: CURRENT_SCHEMA_VERSION, reason: "unrecognized-type" });
      snapshots.push({ state, completeness: "partial" });
    }
  });

  return { finalState: state, snapshots, unresolved };
}

/** Parser-only (RiftEngine). Thin wrapper over foldEvents returning just the per-step snapshots. */
export function materialize(initial: GameState, events: GameEvent[]): MatchStateSnapshot[] {
  return foldEvents(initial, events).snapshots;
}

// ---------------------------------------------------------------------------
// checkClean — the clean-stream gate. Pure, no inference: it only checks what
// is already present on `m` against an independently captured outcome.
// ---------------------------------------------------------------------------

export function checkClean(
  m: ReconstructedMatch,
  capturedOutcome: { winner?: PlayerId; finalPoints?: Record<PlayerId, number> }
): GateResult {
  const failures: string[] = [];

  // 1. Foldable — one snapshot per event.
  const foldable = m.snapshots.length === m.events.length;
  if (!foldable) {
    failures.push(`snapshot count (${m.snapshots.length}) does not match event count (${m.events.length})`);
  }

  // 2. No black boxes — every event resolved to a known type.
  const noBlackBoxes = m.unresolved.length === 0;
  if (!noBlackBoxes) {
    failures.push(`${m.unresolved.length} unresolved event(s) at index ${m.unresolved.map((u) => u.index).join(", ")}`);
  }

  // 3. Legal — verifiable only where an event actually carries the data to
  // check against (costPaid on `played`, checked against the Rune Pool in the
  // immediately preceding snapshot). An event without that data isn't flagged
  // illegal — there's nothing to deductively disprove — but it also isn't
  // proof of legality; this is a check on what's present, not an inference.
  let allLegal = true;
  m.events.forEach((event, index) => {
    if (event.type !== "played" || !event.costPaid) return;
    const before = index > 0 ? m.snapshots[index - 1]?.state : undefined;
    if (!before) return;
    const pool = before.players[event.player]?.runePool;
    if (pool && !actions.canPay(pool, event.costPaid)) {
      allLegal = false;
      failures.push(`event ${index}: played by ${event.player} is unaffordable per its costPaid`);
    }
  });

  // 4. Outcome-consistent — the folded final state vs the captured result.
  let outcomeConsistent = true;
  const finalState = m.snapshots[m.snapshots.length - 1]?.state;
  if (!finalState) {
    if (capturedOutcome.winner || capturedOutcome.finalPoints) {
      outcomeConsistent = false;
      failures.push("no final state to check outcome against (empty snapshots)");
    }
  } else {
    if (capturedOutcome.finalPoints) {
      for (const pid of Object.keys(capturedOutcome.finalPoints)) {
        const expected = capturedOutcome.finalPoints[pid];
        const actual = finalState.players[pid]?.points;
        if (actual !== expected) {
          outcomeConsistent = false;
          failures.push(`final points for ${pid}: expected ${expected}, folded to ${actual}`);
        }
      }
    }
    if (capturedOutcome.winner) {
      const winner = checkWin(finalState, finalState.format);
      if (winner !== capturedOutcome.winner) {
        outcomeConsistent = false;
        failures.push(`winner: expected ${capturedOutcome.winner}, folded winner is ${winner ?? "none"}`);
      }
    }
  }

  return {
    pass: foldable && noBlackBoxes && allLegal && outcomeConsistent,
    foldable,
    noBlackBoxes,
    allLegal,
    outcomeConsistent,
    failures,
  };
}

// ---------------------------------------------------------------------------
// readSnapshot — the reader accessor. Readers import *only* this (plus the
// snapshot/state types) and never foldEvents / materialize / applyEvent
// directly — that structural gap is what makes it impossible for a reader to
// accidentally parse.
// ---------------------------------------------------------------------------

export function readSnapshot(m: ReconstructedMatch, at: number): MatchStateSnapshot {
  if (m.status !== "verified") {
    throw new Error(`readSnapshot: match status is "${m.status}", not "verified" — readers may only consume verified streams`);
  }
  const snapshot = m.snapshots[at];
  if (!snapshot) {
    throw new Error(`readSnapshot: no snapshot at index ${at} (stream has ${m.snapshots.length})`);
  }
  return snapshot;
}

/** Locate a Game Object by id. */
export function findObject(state: GameState, objectId: ObjectId) {
  return state.objects[objectId];
}

/** CR 465.2.c.2 — is this object currently lethally damaged in the given role? */
export function isLethallyDamaged(state: GameState, objectId: ObjectId, role: "attacker" | "defender"): boolean {
  const object = state.objects[objectId];
  if (!object) return false;
  return isKilled(object.damage, combatMight(state, objectId, role));
}
