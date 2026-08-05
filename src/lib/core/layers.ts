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
// CR 476 — the fixed point lives HERE. `applyLayers` re-evaluates every
// conditional PassiveAbility against the current state on each iteration,
// emitting or withdrawing its layerEffects, then runs the layer sequence, and
// repeats until a pass changes nothing (476.2: "recur the process, and
// evaluate each layer again applying any effects that may now be
// applicable"). An earlier version delegated that re-check to an external
// driver that was never implemented, which made the CR's own flagship example
// unrepresentable: buffing Fiora, Victorious raised her Might in Layer 3 but
// nothing ever re-checked Layer 2 to grant her Deflect/Ganking/Shield. See
// Model Corrections 001, adjudication 1.

import { evaluatePredicate, resolveSelector } from "./predicates";
import type { ArithmeticOp, GameState, Keyword, LayerEffect, ObjectId, PassiveAbility, TraitOp, Zone } from "./schema";

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
 * CR 477.3.e — increases first, then decreases; each snapshots independently.
 *
 * Layer 3 has two SUBLAYERS: every increase applies first (477.3.e.1.a), every
 * decrease last (477.3.e.2.a), and each sublayer snapshots its own limitation
 * (477.3.e.1.b / .e.2.b). Timestamp orders within a sublayer, not across them
 * — CR 480.3 orders "within each Layer and Sublayer".
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

/**
 * CR 477.3.b — the effective delta an arithmetic effect contributes to ONE
 * object, snapshotting on first application to that object. The snapshot is
 * per-object because the limitation is computed "at the time of its
 * application" and an application is per-object.
 */
function effectiveDelta(effect: LayerEffect, op: ArithmeticOp, baseBeforeThisEffect: number, objectId: ObjectId): number {
  if (!effect.fromPassive) {
    const remembered = effect.snapshotted?.[objectId];
    if (remembered !== undefined) return remembered; // frozen for the duration
  }
  // Passives are continuously re-evaluated — never snapshot (477.3.b).
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

/**
 * CR 476 — apply the layers repeatedly until nothing changes.
 *
 * Each iteration: (a) re-derive the effects contributed by conditional
 * Passive Abilities against the CURRENT state, emitting newly-qualifying ones
 * and withdrawing ones that stopped qualifying (476.2, 476.3); (b) freeze the
 * per-object snapshot of any limited non-passive arithmetic effect that has
 * now applied to an object it hadn't before (477.3.b). Layers 1->2->3 are
 * read on demand by `currentMight` / `activeGrantedKeywords`, so a "pass" is
 * exactly this pair of steps.
 *
 * The iteration bound is a runaway guard, not a rule — two effects that keep
 * flipping each other's conditions have no fixed point, and the CR resolves
 * that by player choice rather than by looping forever.
 */
export function applyLayers(state: GameState): GameState {
  let current = state;
  for (let i = 0; i < 64; i++) {
    const next = snapshotLimitedEffects(syncPassiveEffects(current));
    if (next === current) return current;
    current = next;
  }
  return current;
}

/**
 * CR 476.2 / 476.3 — re-derive conditional Passive Abilities' layer effects.
 *
 * An ability contributes its `layerEffects` exactly while it is active in its
 * source's zone (365.1/366.1) and its condition holds. Withdrawal is separate
 * from application: an ability that stops qualifying has its effects removed,
 * and re-qualifying re-emits them fresh (so a re-emitted limited effect
 * snapshots again, per 480.2's "when it ceases to be Inactive, a new Timestamp
 * is established").
 */
function syncPassiveEffects(state: GameState): GameState {
  const passives = Object.values(state.abilities).filter((a): a is PassiveAbility => a.kind === "passive");

  const authored = state.activeLayerEffects.filter((e) => e.fromAbilityId === undefined);
  const existingByAbility = new Map<string, LayerEffect[]>();
  for (const effect of state.activeLayerEffects) {
    if (effect.fromAbilityId === undefined) continue;
    const list = existingByAbility.get(effect.fromAbilityId) ?? [];
    list.push(effect);
    existingByAbility.set(effect.fromAbilityId, list);
  }

  const derived: LayerEffect[] = [];
  for (const ability of passives) {
    const source = state.objects[ability.sourceObjectId];
    const active = Boolean(source) && ability.activeZones.includes(source!.zone.kind);
    const holds =
      active &&
      (ability.condition === undefined ||
        evaluatePredicate(state, ability.condition, ability.sourceObjectId, { sourceObjectId: ability.sourceObjectId }));
    if (!holds) continue; // withdrawn — simply not re-emitted this pass

    // Already emitted? Keep the existing entries so snapshots and timestamps survive.
    const existing = existingByAbility.get(ability.abilityId);
    if (existing) {
      derived.push(...existing);
      continue;
    }
    derived.push(
      ...ability.layerEffects.map((effect) => ({
        ...effect,
        fromAbilityId: ability.abilityId,
        sourceObjectId: effect.sourceObjectId || ability.sourceObjectId,
      }))
    );
  }

  const nextEffects = [...authored, ...derived];
  return sameEffectList(state.activeLayerEffects, nextEffects) ? state : { ...state, activeLayerEffects: nextEffects };
}

/** Reference-identity comparison — every path above reuses entries it did not change. */
function sameEffectList(a: LayerEffect[], b: LayerEffect[]): boolean {
  return a.length === b.length && a.every((effect, i) => effect === b[i]);
}

/** CR 477.3.b — freeze the limited value of each non-passive arithmetic effect, once per object it applies to. */
function snapshotLimitedEffects(state: GameState): GameState {
  let changed = false;
  const nextEffects = state.activeLayerEffects.map((effect) => {
    if (effect.layer !== 3 || effect.fromPassive) return effect;
    const op = effect.op as ArithmeticOp;
    if (op.minimum === undefined && op.maximum === undefined) return effect; // no limitation — nothing to snapshot

    const snapshotted = { ...(effect.snapshotted ?? {}) };
    let added = false;
    for (const objectId of targetsOf(state, effect)) {
      if (snapshotted[objectId] !== undefined) continue; // already frozen for this object
      // Freeze against the value this effect sees when it applies to THIS
      // object — everything ordered before it in Layer 3 already folded in.
      const base = baseBeforeArithmetic(state, objectId, op.attr, effect);
      snapshotted[objectId] = effectiveDelta(effect, op, base, objectId);
      added = true;
    }
    if (!added) return effect;
    changed = true;
    return { ...effect, snapshotted };
  });
  return changed ? { ...state, activeLayerEffects: nextEffects } : state;
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
  return earlier.reduce((acc, e) => acc + effectiveDelta(e, e.op as ArithmeticOp, acc, objectId), withBuffs);
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
    const delta = effectiveDelta(effect, effect.op as ArithmeticOp, value, objectId);
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
