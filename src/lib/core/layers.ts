// Layers — the effect-application system. CR 473-480.
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part1.md §7,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §8.
//
// All alterations to Game Objects apply through three ordered layers,
// iterated to a fixed point (476): Trait-Altering (1) -> Ability-Altering
// (2) -> Arithmetic (3). A non-passive arithmetic effect with a limitation
// (min/max) snapshots its EFFECTIVE DELTA at first application and reuses it
// for the rest of its duration (477.3.b) — passives never snapshot, they're
// re-evaluated fresh every time. Negative Might is legal (477.3.c).
//
// Scope note: this engine operates on already-instantiated LayerEffect
// entries (state.activeLayerEffects) — it does not interpret card text or
// evaluate conditional-passive activation (Predicate is a caller-supplied
// function; deriving one from a card's rules text is Phase 4 work, against
// the Supabase inventory, explicitly out of scope here). The CR 476.3
// "conditional keyword via recursion" case (Fiora becomes Mighty -> gains
// Deflect) is the RESPONSIBILITY of whatever adds/removes the conditional
// passive's LayerEffects to activeLayerEffects (re-run applyLayers after
// re-checking conditions) — applyLayers itself is a deterministic pass plus
// snapshot-freezing over whatever effect list it's handed.

import { resolveSelector } from "./predicates";
import type { ArithmeticOp, GameState, Keyword, LayerEffect, ObjectId, TraitOp, Zone } from "./schema";

const BOARD_ZONE_KINDS: ReadonlySet<Zone["kind"]> = new Set(["base", "battlefield", "facedownZone", "legendZone"]);

function isBoardZone(zone: Zone): boolean {
  return BOARD_ZONE_KINDS.has(zone.kind);
}

/** The objects a LayerEffect currently applies to (its Selector, resolved against `state`). */
function targetsOf(state: GameState, effect: LayerEffect): ObjectId[] {
  return resolveSelector(state, effect.targetSelector, { sourceObjectId: effect.sourceObjectId, targets: effect.targets });
}

function effectsTargeting(state: GameState, objectId: ObjectId, layer: 1 | 2 | 3): LayerEffect[] {
  return state.activeLayerEffects
    .filter((e) => e.layer === layer)
    .filter((e) => targetsOf(state, e).includes(objectId))
    .sort((a, b) => a.timestamp - b.timestamp); // CR 480 — default order when no dependency is modeled
}

/**
 * CR 477.3.e — Layer 3 has two SUBLAYERS: every increase applies first
 * (477.3.e.1.a), every decrease last (477.3.e.2.a). Timestamp orders within a
 * sublayer, not across them — CR 480.3 orders "within each Layer and Sublayer".
 *
 * Sorting by timestamp alone was wrong, and visibly so: a 2-Might unit under
 * "-4 to a min of 1" (ts 1) and "+3" (ts 2) folded to 4, because the decrease
 * clamped against 2 before the increase was seen. Increases first gives
 * 2+3=5, then clamp(5-4, min 1)=1 — the unit ends at 1.
 *
 * The sign of `delta` is the sublayer key. That is exact so long as callers
 * honour 477.3.c (an increase computing a negative amount increases by 0
 * instead), which the model cannot currently enforce — see the escalation
 * note in layers.test.ts for CR 477.3.c.
 */
function orderedArithmetic(state: GameState, objectId: ObjectId, attr: ArithmeticOp["attr"]): LayerEffect[] {
  const sublayer = (e: LayerEffect) => ((e.op as ArithmeticOp).delta < 0 ? 1 : 0);
  return effectsTargeting(state, objectId, 3)
    .filter((e) => (e.op as ArithmeticOp).attr === attr)
    .sort((a, b) => sublayer(a) - sublayer(b) || a.timestamp - b.timestamp);
}

/** CR 477.3.b — the effective delta an arithmetic effect contributes, snapshotting on first application. */
function effectiveDelta(effect: LayerEffect, op: ArithmeticOp, baseBeforeThisEffect: number): number {
  if (effect.fromPassive) {
    // Passives are continuously re-evaluated — never snapshot.
    const raw = baseBeforeThisEffect + op.delta;
    const clamped = clamp(raw, op.minimum, op.maximum);
    return clamped - baseBeforeThisEffect;
  }
  if (effect.snapshotted !== undefined) return effect.snapshotted;
  const raw = baseBeforeThisEffect + op.delta;
  const clamped = clamp(raw, op.minimum, op.maximum);
  return clamped - baseBeforeThisEffect;
}

function clamp(value: number, minimum?: number, maximum?: number): number {
  let v = value;
  if (minimum !== undefined) v = Math.max(minimum, v);
  if (maximum !== undefined) v = Math.min(maximum, v);
  return v;
}

/** CR 476 — apply layers 1->2->3, freezing (snapshotting) any newly-applied limited non-passive arithmetic effects. */
export function applyLayers(state: GameState): GameState {
  let changed = false;
  const nextEffects = state.activeLayerEffects.map((effect) => {
    if (effect.layer !== 3 || effect.fromPassive || effect.snapshotted !== undefined) return effect;
    const op = effect.op as ArithmeticOp;
    if (op.minimum === undefined && op.maximum === undefined) return effect; // no limitation — nothing to snapshot
    // Freeze against the Might this effect would see applied first-in-layer
    // (i.e. only earlier-timestamped Layer-3 effects on the same object/attr
    // already folded in). This mirrors currentMight's own fold order.
    const targets = targetsOf(state, effect);
    const objectId = targets[0];
    if (objectId === undefined) return effect;
    const base = baseBeforeArithmetic(state, objectId, op.attr, effect);
    const delta = effectiveDelta(effect, op, base);
    changed = true;
    return { ...effect, snapshotted: delta };
  });
  if (!changed) return state;
  return { ...state, activeLayerEffects: nextEffects };
}

/** The value `effect` sees when it applies: everything ordered before it in Layer 3, already folded in. */
function baseBeforeArithmetic(state: GameState, objectId: ObjectId, attr: ArithmeticOp["attr"], effect: LayerEffect): number {
  const object = state.objects[objectId];
  const printed = attr === "might" ? object?.printedMight ?? 0 : 0;
  const traited = attr === "might" ? applyTraitLayer(state, objectId, printed) : printed;
  const withBuffs = attr === "might" ? traited + (object?.buffCount ?? 0) : traited;
  const ordered = orderedArithmetic(state, objectId, attr);
  const index = ordered.findIndex((e) => e === effect);
  const earlier = index === -1 ? ordered : ordered.slice(0, index);
  return earlier.reduce((acc, e) => acc + effectiveDelta(e, e.op as ArithmeticOp, acc), withBuffs);
}

/** CR 477.1 — Layer 1 Trait-Altering effects; set-Might lives here, applied before all arithmetic. */
function applyTraitLayer(state: GameState, objectId: ObjectId, base: number): number {
  const effects = effectsTargeting(state, objectId, 1);
  let value = base;
  for (const effect of effects) {
    const op = effect.op as TraitOp;
    if ("set" in op && op.set === "might" && typeof op.value === "number") {
      value = op.value;
    } else if ("copyFrom" in op && state.objects[op.copyFrom]) {
      value = currentMight(state, op.copyFrom);
    }
  }
  return value;
}

/** CR 703 + 473-480 — Might through Layers, snapshotting, and Buff counters. Negative Might is legal (477.3.c). */
export function currentMight(state: GameState, objectId: ObjectId): number {
  const object = state.objects[objectId];
  if (!object) return 0;
  const printed = object.printedMight ?? 0;
  // CR 711 — units in Non-Board Zones use printed Might; Layers don't apply off-Board.
  if (!isBoardZone(object.zone)) return printed;

  const afterTrait = applyTraitLayer(state, objectId, printed);
  const withBuffs = afterTrait + object.buffCount;

  const arithmeticEffects = orderedArithmetic(state, objectId, "might");
  return arithmeticEffects.reduce((value, effect) => {
    const delta = effectiveDelta(effect, effect.op as ArithmeticOp, value);
    return value + delta;
  }, withBuffs);
}

/** CR 708-709 — a unit "is Mighty" while Might >= 5; non-board zones use printed Might (711). */
export function isMighty(state: GameState, objectId: ObjectId): boolean {
  return currentMight(state, objectId) >= 5;
}

/** CR 477.2 — keywords actively granted to `objectId` by Layer-2 effects right now (does not include printed keywords). */
export function activeGrantedKeywords(state: GameState, objectId: ObjectId): { granted: Keyword[]; removed: Keyword[] } {
  const effects = effectsTargeting(state, objectId, 2);
  const granted: Keyword[] = [];
  const removed: Keyword[] = [];
  for (const effect of effects) {
    const op = effect.op as { grantKeyword?: Keyword; removeKeyword?: Keyword };
    if (op.grantKeyword) granted.push(op.grantKeyword);
    if (op.removeKeyword) removed.push(op.removeKeyword);
  }
  return { granted, removed };
}
