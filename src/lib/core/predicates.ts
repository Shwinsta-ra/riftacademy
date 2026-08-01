// Evaluators for the Predicate / Selector / EventPredicate data vocabulary.
//
// These unions are DATA so ability definitions can round-trip through
// Supabase (Phase 4), be inspected by RiftIQ, and be diffed by RiftEngine —
// see the commentary above their declarations in ./schema.ts. This module is
// the ONLY place they are interpreted; nothing else should switch on `op`,
// `kind`, or `on`.
//
// Note the deliberate import cycle with ./layers.ts: a Selector's `filter`
// needs Predicate evaluation, a Predicate's Might tests need the Layers
// fixed-point, and a LayerEffect's targetSelector needs Selector resolution.
// All participants are hoisted function declarations resolved at call time,
// never at module-init time, so the cycle is safe.

import { activeGrantedKeywords, currentMight, isMighty } from "./layers";
import type {
  EventPredicate,
  GameEvent,
  GameObject,
  GameState,
  Keyword,
  Location,
  ObjectId,
  PlayerId,
  PlayerRef,
  Predicate,
  Selector,
} from "./schema";

/** Context a Selector/Predicate is evaluated against: the ability's source and its chosen targets. */
export type EvalContext = {
  /** The object whose ability is being evaluated (Selector `self`, PlayerRef `sourceController`). */
  sourceObjectId: ObjectId;
  /** Targets chosen at the choices step, in order (CR 355.6-.10). */
  targets?: ObjectId[];
};

// ---------------------------------------------------------------------------
// Keyword resolution (CR 477.2, 801.3)
// ---------------------------------------------------------------------------

/**
 * CR 801 + 477.2 — an object's keywords are PRINTED union GRANTED, minus any
 * removed by a Layer-2 Ability-Altering effect.
 *
 * The legacy `hasKeyword` read only the granted list, so printed keywords
 * were invisible to it — they existed solely as `static` registry entries
 * covering 15 of 928 cards (Phase 2 diff §1, "partial match"). That behavior
 * is deliberately NOT carried forward.
 */
export function resolveKeywords(state: GameState, objectId: ObjectId): { keyword: Keyword; value?: number }[] {
  const object = state.objects[objectId];
  if (!object) return [];

  const { granted, removed } = activeGrantedKeywords(state, objectId);
  const all: { keyword: Keyword; value?: number }[] = [
    ...object.printedKeywords,
    ...object.grantedKeywords.map((g) => ({ keyword: g.keyword, value: g.value })),
    ...granted.map((keyword) => ({ keyword })),
  ];
  return all.filter((entry) => !removed.includes(entry.keyword));
}

/** CR 801 — does this object have `keyword` right now, printed or granted? */
export function hasKeyword(state: GameState, objectId: ObjectId, keyword: Keyword): boolean {
  return resolveKeywords(state, objectId).some((entry) => entry.keyword === keyword);
}

/**
 * CR 807.2 / 809.2 / 814.2 / 823.2 — the summed X of a valued keyword.
 * A valued keyword with no explicit X contributes the CR default of 1.
 */
export function sumKeywordValue(state: GameState, objectId: ObjectId, keyword: Keyword): number {
  return resolveKeywords(state, objectId)
    .filter((entry) => entry.keyword === keyword)
    .reduce((sum, entry) => sum + (entry.value ?? 1), 0);
}

// ---------------------------------------------------------------------------
// Player references
// ---------------------------------------------------------------------------

/** Resolves a PlayerRef against the current state. */
export function resolvePlayerRef(state: GameState, ref: PlayerRef, ctx: EvalContext): PlayerId | null {
  switch (ref.kind) {
    case "explicit":
      return ref.player;
    case "turnPlayer":
      return state.turn.turnPlayer;
    case "sourceController":
      return state.objects[ctx.sourceObjectId]?.controller ?? null;
    case "opponentOf": {
      const of = resolvePlayerRef(state, ref.of, ctx);
      if (of === null) return null;
      return state.turn.turnOrder.find((p) => p !== of) ?? null;
    }
  }
}

// ---------------------------------------------------------------------------
// Selectors (CR 355.6-.10, 477)
// ---------------------------------------------------------------------------

const BOARD_ZONE_KINDS: ReadonlySet<GameObject["zone"]["kind"]> = new Set([
  "base",
  "battlefield",
  "facedownZone",
  "legendZone",
]);

/** CR 105-107 — is this a Board zone (as opposed to a Non-Board zone)? */
function isBoardZone(zone: GameObject["zone"]): boolean {
  return BOARD_ZONE_KINDS.has(zone.kind);
}

function sameLocation(zone: GameObject["zone"], location: Location): boolean {
  if (location.kind === "base") return zone.kind === "base" && zone.player === location.player;
  return zone.kind === "battlefield" && zone.battlefieldId === location.battlefieldId;
}

/** Resolves a Selector to the object ids it currently designates. */
export function resolveSelector(state: GameState, selector: Selector, ctx: EvalContext): ObjectId[] {
  switch (selector.kind) {
    case "self":
      return state.objects[ctx.sourceObjectId] ? [ctx.sourceObjectId] : [];

    case "target": {
      const target = ctx.targets?.[selector.index];
      return target && state.objects[target] ? [target] : [];
    }

    case "unitsAtLocation":
      return Object.values(state.objects)
        .filter((o) => o.categories.includes("unit") && sameLocation(o.zone, selector.location))
        .map((o) => o.objectId);

    case "unitsControlledBy": {
      // "Units you control" means units ON THE BOARD (CR 365.1 — abilities are
      // active on the Board by default). A unit card sitting in hand or trash
      // is not a unit you control for effect purposes; reach those with
      // `objectsInZone` instead.
      const player = resolvePlayerRef(state, selector.player, ctx);
      if (player === null) return [];
      return Object.values(state.objects)
        .filter((o) => o.categories.includes("unit") && o.controller === player && isBoardZone(o.zone))
        .map((o) => o.objectId);
    }

    case "objectsInZone": {
      const player = selector.player ? resolvePlayerRef(state, selector.player, ctx) : null;
      return Object.values(state.objects)
        .filter((o) => {
          if (o.zone.kind !== selector.zone) return false;
          if (!selector.player) return true;
          return "player" in o.zone && o.zone.player === player;
        })
        .map((o) => o.objectId);
    }

    case "attachedTo": {
      const attachedTo = state.objects[ctx.sourceObjectId]?.attachedTo;
      return attachedTo && state.objects[attachedTo] ? [attachedTo] : [];
    }

    case "sourceController": {
      // The controller's own objects on the board — used by "units you control"-style effects.
      const player = state.objects[ctx.sourceObjectId]?.controller ?? null;
      if (player === null) return [];
      return Object.values(state.objects)
        .filter((o) => o.controller === player)
        .map((o) => o.objectId);
    }

    case "filter":
      return resolveSelector(state, selector.from, ctx).filter((objectId) =>
        evaluatePredicate(state, selector.where, objectId, ctx)
      );
  }
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/** Evaluates a Predicate about `subject` (the object under test). */
export function evaluatePredicate(state: GameState, predicate: Predicate, subject: ObjectId, ctx: EvalContext): boolean {
  const object = state.objects[subject];

  switch (predicate.op) {
    case "hasKeyword":
      return hasKeyword(state, subject, predicate.keyword);
    case "hasStatus":
      return object?.statuses.has(predicate.status) ?? false;
    case "isCategory":
      return object?.categories.includes(predicate.category) ?? false;
    case "hasSupertype":
      return object?.supertypes.includes(predicate.supertype) ?? false;
    case "hasTag":
      return object?.tags.includes(predicate.tag) ?? false;
    case "hasDomain":
      return object?.domains.includes(predicate.domain) ?? false; // CR 134.2
    case "nameIs":
      // CR 132.4 — the full "Name, Subtitle" comma form IS the name. Matching
      // is by cardId because that is the object's catalog identity; resolving
      // a display name would require the card catalog, which the kernel
      // deliberately does not import.
      return object?.cardId === predicate.name;
    case "mightAtLeast":
      return object ? currentMight(state, subject) >= predicate.value : false;
    case "mightAtMost":
      return object ? currentMight(state, subject) <= predicate.value : false;
    case "isMighty":
      return object ? isMighty(state, subject) : false; // CR 708
    case "isAtLocation":
      return object ? sameLocation(object.zone, predicate.location) : false;
    case "controlledBy":
      return object ? object.controller === resolvePlayerRef(state, predicate.player, ctx) : false;
    case "hasDesignation":
      return object?.statuses.has(predicate.designation) ?? false; // CR 464.2.c

    case "xpAtLeast": {
      const player = resolvePlayerRef(state, predicate.player, ctx);
      return player !== null && (state.players[player]?.xp ?? 0) >= predicate.value; // CR 824
    }
    case "playedCardThisTurn": {
      const player = resolvePlayerRef(state, predicate.player, ctx);
      return player !== null && (state.cardsPlayedThisTurn[player] ?? 0) >= 1; // CR 812
    }
    case "countAtLeast":
      return resolveSelector(state, predicate.from, ctx).length >= predicate.value;

    case "and":
      return predicate.terms.every((term) => evaluatePredicate(state, term, subject, ctx));
    case "or":
      return predicate.terms.some((term) => evaluatePredicate(state, term, subject, ctx));
    case "not":
      return !evaluatePredicate(state, predicate.term, subject, ctx);
  }
}

// ---------------------------------------------------------------------------
// Event predicates (CR 367-375)
// ---------------------------------------------------------------------------

/** Does `event` match what this replacement effect intercedes on? */
export function matchesEvent(state: GameState, ep: EventPredicate, event: GameEvent, ctx: EvalContext): boolean {
  const testObject = (predicate: Predicate | undefined, objectId: ObjectId | null | undefined): boolean => {
    if (!predicate) return true;
    if (!objectId) return false;
    return evaluatePredicate(state, predicate, objectId, ctx);
  };
  const testPlayer = (ref: PlayerRef | undefined, player: PlayerId | undefined): boolean => {
    if (!ref) return true;
    if (!player) return false;
    return resolvePlayerRef(state, ref, ctx) === player;
  };

  switch (ep.on) {
    case "deal":
      return (
        event.type === "dealt" && testObject(ep.to, event.targetObjectId) && testObject(ep.from, event.sourceObjectId)
      );
    case "kill":
      return event.type === "killed" && testObject(ep.object, event.objectId);
    case "draw":
      return event.type === "drew" && testPlayer(ep.player, event.player);
    case "enterZone":
      return (
        (event.type === "objectMoved" && event.to.kind === ep.zone && testObject(ep.object, event.objectId)) ||
        (event.type === "objectCreated" && event.zone.kind === ep.zone && testObject(ep.object, event.objectId))
      );
    case "becomeStatus": {
      // CR 441.2.a / 709 — "becomes X" is the TRANSITION, so only the events
      // that apply the status match, not every event touching an object that
      // already has it.
      const statusEvent =
        (ep.status === "stunned" && event.type === "stunned") ||
        (ep.status === "empowered" && event.type === "empowered") ||
        (ep.status === "buffed" && event.type === "buffed" && event.applied) ||
        (ep.status === "attached" && event.type === "attached") ||
        (ep.status === "exhausted" && event.type === "exhausted") ||
        (ep.status === "revealed" && event.type === "revealed");
      if (!statusEvent) return false;
      return testObject(ep.object, "objectId" in event ? event.objectId : null);
    }
    case "score":
      return event.type === "pointScored" && event.method === ep.method && testPlayer(ep.player, event.player);
    case "burnOut":
      return event.type === "burnedOut" && testPlayer(ep.player, event.player);
    case "turnProcedure":
      return (
        event.type === "phaseChanged" &&
        event.phase === ep.phase &&
        (ep.step === undefined || event.step === ep.step)
      );
  }
}
