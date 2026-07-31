// Ability taxonomy and replacement effects. CR 360-406.
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part4.md §1-§4,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §5.
//
// The legacy model had a flat EffectProgram with no ability-type distinction
// at all — Part 4 §6 calls that the single largest structural gap. The CR
// defines five structures (361.1) plus two subtypes, and replacement effects
// are a first-class subsystem with their own event semantics and ordering
// rules that Vendetta combat (465.2.c.5) directly depends on.

import type {
  Ability,
  ActivatedAbility,
  GameEvent,
  GameState,
  ObjectId,
  PlayerId,
  ReplacementEffect,
  TriggeredAbility,
  TurnState,
  Zone,
} from "./schema";
import { isTimingPermitted } from "./turn";

/** CR 365.1 / 366.1 / 384.2 / 385.2 — is this ability active where its source currently sits? */
export function isAbilityActive(state: GameState, ability: Ability): boolean {
  const source = state.objects[ability.sourceObjectId];
  if (!source) return false;
  return ability.activeZones.includes(source.zone.kind);
}

/**
 * CR 381 — an Activated Ability may be used only on your own turn in an Open
 * State, unless it carries Action (806) or Reaction (813). CR 402.3 — an
 * activated ability with no legal options is illegal to activate.
 */
export function canActivate(
  state: GameState,
  ability: ActivatedAbility,
  player: PlayerId,
  hasLegalOptions = true
): boolean {
  if (!isAbilityActive(state, ability)) return false;
  if (!hasLegalOptions) return false; // 402.3
  if (state.turn.priority !== player) return false; // 312 — activating is Discretionary
  return isTimingPermitted(state.turn, ability.timing, player);
}

/**
 * CR 383.2 — the Condition is the "When/At/Nth time" clause PLUS any
 * conditional statement IMMEDIATELY following it (383.2.a.1, the adjacency
 * rule); anything else is Effect and is checked at resolution instead.
 * CR 383.2.c — conditions are evaluated AFTER the inciting event is
 * processed, so an object entering a zone at the same moment its condition
 * becomes true DOES trigger (383.2.c.1).
 */
export function shouldTrigger(state: GameState, ability: TriggeredAbility): boolean {
  if (!isAbilityActive(state, ability)) return false;
  return ability.condition(state);
}

/**
 * CR 383.1.b — "the Nth time" with multiple simultaneous qualifying
 * instances: the controller picks ONE instance as the trigger and the
 * ability triggers ONCE, not once per instance.
 */
export function resolveNthTimeTrigger<T>(instances: T[], chosenIndex = 0): T | null {
  if (instances.length === 0) return null;
  return instances[chosenIndex] ?? instances[0];
}

// ---------------------------------------------------------------------------
// Replacement effects (CR 367-375)
// ---------------------------------------------------------------------------

/**
 * CR 370.1.a — an *event* is the singular moment resulting from a Game Action
 * or state change. Replacing an event means THE GENERATING ACTION NEVER
 * OCCURRED (370.1.a.1): a replaced death means the kill didn't happen; a
 * replaced "becomes Mighty" means it never became Mighty, so nothing that
 * keys on that transition triggers.
 */
export type ReplacementOutcome = {
  /** The event(s) that actually occur. Empty = the event was replaced with nothing (cf. Skip, 443). */
  events: GameEvent[];
  /** Which replacement effects were consumed (for usage-limit accounting, 371). */
  applied: string[];
};

/** CR 371 — "once each turn" / "N times each turn" caps applications. */
export type ReplacementUsage = Record<string, number>;

export function isUsable(effect: ReplacementEffect, usage: ReplacementUsage): boolean {
  if (!effect.usageLimit) return true;
  return (usage[effect.abilityId] ?? 0) < effect.usageLimit.perTurn;
}

/**
 * CR 372-373 — ordering. Multiple replacements on one event: the CONTROLLER
 * OF THE OBJECT BEING ACTED ON chooses the order (372); for an uncontrolled
 * battlefield that's the Turn Player. Different controllers across
 * simultaneous events execute in turn order (373.1).
 *
 * `chooseOrder` expresses the acted-upon object's controller's choice; the
 * default is timestamp/registration order.
 */
export function orderReplacements(
  effects: ReplacementEffect[],
  chooseOrder?: (effects: ReplacementEffect[]) => ReplacementEffect[]
): ReplacementEffect[] {
  return chooseOrder ? chooseOrder(effects) : effects;
}

/** CR 372 — who orders the replacements applying to an event on `objectId`. */
export function replacementOrderingPlayer(state: GameState, objectId: ObjectId): PlayerId {
  const object = state.objects[objectId];
  if (!object) return state.turn.turnPlayer;
  // An uncontrolled battlefield's replacements are ordered by the Turn Player (190.6).
  return object.controller ?? state.turn.turnPlayer;
}

/**
 * CR 369 / 370-373 — apply every applicable, still-usable replacement effect
 * to `event`, in the order chosen by the acted-upon object's controller.
 * CR 373.2 — one replacement may only be applied once in a given sequence.
 */
export function applyReplacements(
  state: GameState,
  event: GameEvent,
  candidates: ReplacementEffect[],
  usage: ReplacementUsage,
  options: {
    chooseOrder?: (effects: ReplacementEffect[]) => ReplacementEffect[];
    /** CR 371.2.b — an optional ("may") replacement the controller declines doesn't consume its cap. */
    accept?: (effect: ReplacementEffect) => boolean;
    /** Produces the replacing event(s); empty array = replaced with nothing. */
    replaceWith: (effect: ReplacementEffect, event: GameEvent) => GameEvent[];
  }
): ReplacementOutcome {
  const applicable = candidates.filter((e) => e.appliesTo(event, state)).filter((e) => isUsable(e, usage));
  const ordered = orderReplacements(applicable, options.chooseOrder);

  let events: GameEvent[] = [event];
  const applied: string[] = [];

  for (const effect of ordered) {
    if (applied.includes(effect.abilityId)) continue; // 373.2
    if (effect.optional && options.accept && !options.accept(effect)) continue; // 371.2.b
    const next: GameEvent[] = [];
    let matchedAny = false;
    for (const current of events) {
      if (effect.appliesTo(current, state)) {
        matchedAny = true;
        next.push(...options.replaceWith(effect, current));
      } else {
        next.push(current);
      }
    }
    if (matchedAny) applied.push(effect.abilityId);
    events = next;
  }

  return { events, applied };
}

/**
 * CR 370.1.a.2 — events are simultaneous only when produced by the SAME game
 * action. "Kill up to two units" is simultaneous; "Kill A. If you do, kill B."
 * is two sequential actions. Callers group by action, not by timestamp.
 */
export function areSimultaneous(actionIdA: string, actionIdB: string): boolean {
  return actionIdA === actionIdB;
}

/**
 * CR 402.1 / 402.4 — the choices step for a triggered ability already on the
 * chain. If its effect begins "you may", the controller decides NOW and
 * declining removes it from the chain (402.1.a). If it has no legal options
 * it is REMOVED, never finalized — and that is explicitly NOT a counter
 * (402.4.a). If legal options exist, the controller MUST choose (402.4.b).
 */
export function resolveChoiceStep(
  ability: TriggeredAbility,
  hasLegalOptions: boolean,
  playerAccepts: boolean
): { staysOnChain: boolean; countered: false; reason?: "declined" | "noLegalOptions" } {
  if (!hasLegalOptions) return { staysOnChain: false, countered: false, reason: "noLegalOptions" }; // 402.4
  if (ability.optionalAtChoiceStep && !playerAccepts) {
    return { staysOnChain: false, countered: false, reason: "declined" }; // 402.1.a
  }
  return { staysOnChain: true, countered: false };
}

/** CR 400.2 / 429.2 — an ability carrying [Add] resolves immediately on finalization, like a Unit or Gear. */
export function resolvesImmediatelyOnFinalization(ability: Ability): boolean {
  return ability.kind === "activated" || ability.kind === "triggered"
    ? abilityIsAdd(ability)
    : false;
}

/** An ability is an "Add" ability when any of its instructions is the Add game action (CR 429, 168). */
function abilityIsAdd(ability: ActivatedAbility | TriggeredAbility): boolean {
  return ability.effect.some((instruction) => /\badd\b/i.test(instruction.description));
}

/**
 * CR 765-767 + 722.1 — Ignore. An ignored ability is treated as INACTIVE for
 * that specific game action or procedure ONLY, and only for the players the
 * effect directs. Ignore is scoped by (action, player), never global, and
 * never removes the keyword — the card still HAS it for reference purposes.
 */
export type IgnoreScope = { action: string; players: PlayerId[]; abilityId: string };

export function isIgnored(scopes: IgnoreScope[], abilityId: string, action: string, player: PlayerId): boolean {
  return scopes.some((s) => s.abilityId === abilityId && s.action === action && s.players.includes(player));
}

/**
 * CR 720-725 — Inactive text is not applied at all: it doesn't trigger,
 * doesn't apply, and can't be activated (721.2). But the text is STILL
 * PRESENT, so keyword-checking effects still see it (722.1). CR 723-724 —
 * Rules Text is never Inactive by default; Effect Text is Inactive unless the
 * card is Attached.
 */
export function isTextActive(kind: "rules" | "effect", isAttached: boolean): boolean {
  return kind === "rules" ? true : isAttached;
}

/** CR 757-759 — untargetability. Not a legal target while the restriction applies (758). */
export function isValidTarget(
  state: GameState,
  targetId: ObjectId,
  requiredZoneKinds: Zone["kind"][],
  untargetableBy: (state: GameState, targetId: ObjectId) => boolean = () => false
): boolean {
  const object = state.objects[targetId];
  if (!object) return false;
  if (!requiredZoneKinds.includes(object.zone.kind)) return false; // 355.9.a
  if (untargetableBy(state, targetId)) return false; // 355.9.b / 758
  return true;
}

/**
 * CR 758.1 — becoming untargetable AFTER targeting but BEFORE resolution
 * means the spell MISTARGETS on resolution: instructions about that object
 * are ignored (the rest of the spell still resolves). CR 758.2 — if the spell
 * changes out of the restricted category, the object becomes legal again.
 */
export function mistargetsOnResolution(
  state: GameState,
  targetId: ObjectId,
  untargetableBy: (state: GameState, targetId: ObjectId) => boolean
): boolean {
  return untargetableBy(state, targetId);
}

/** CR 128.6 — the compulsion rule: a player cannot be compelled to act on secret/private cards. */
export function canBeCompelled(zone: Zone, specifiesCardQuality: boolean): boolean {
  const isHiddenZone = zone.kind === "hand" || zone.kind === "mainDeck" || zone.kind === "runeDeck";
  if (!isHiddenZone) return true;
  return !specifiesCardQuality; // instruction is "deemed impossible" and may be ignored
}

/** CR 812.2 — one card played satisfies ALL Legion instances you control. */
export function legionSatisfied(cardsPlayedThisTurn: number): boolean {
  return cardsPlayedThisTurn >= 1;
}

/** CR 824 — Level N gates a dependent ability on an XP threshold; re-evaluated on controller change (824.1.c.1). */
export function levelSatisfied(xp: number, threshold: number): boolean {
  return xp >= threshold;
}

/** CR 727.1.b — a Dependent Keyword's ability is Inactive until its condition is met. */
export function dependentAbilityActive(conditionMet: boolean): boolean {
  return conditionMet;
}

/** CR 506.3.e (TR) — the observable-impact moments by which a trigger must be acknowledged, else forgotten (506.4). */
export const OBSERVABLE_IMPACT_MOMENTS = [
  "pointTotalChange",
  "runeTotalChange",
  "buffAdded",
  "combatOrProcedureImpact",
  "drawOrDiscard",
  "exhaustOrReady",
  "moveCaused",
  "opponentAskedForPublicInfo",
] as const;
export type ObservableImpact = (typeof OBSERVABLE_IMPACT_MOMENTS)[number];

/** TR 506.5 — a FORGOTTEN trigger still counts as having triggered for "first time"/limited-trigger accounting. */
export function countsAsTriggered(_acknowledged: boolean): boolean {
  return true;
}

/** CR 190.6 — who is accountable for a Battlefield's ability. */
export function battlefieldAbilityController(
  turn: TurnState,
  battlefieldController: PlayerId | null,
  abilityNamesPlayer?: PlayerId
): PlayerId {
  if (abilityNamesPlayer) return abilityNamesPlayer; // named player controls it regardless (Abandoned Hall)
  return battlefieldController ?? turn.turnPlayer; // uncontrolled -> Turn Player (Arena's Greatest)
}
