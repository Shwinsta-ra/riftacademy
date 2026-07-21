// RiftCore public exports — the shared contract surface every other
// Riftbound module imports. See RiftCore_Spec.md §1, §9.

export * from "./schema";

export { getCard, cardName, cardMight, cardKeywords, toCost, costOf, cardTruth } from "./cards";
export type { CardJson } from "./cards";

export {
  primitiveToEvents,
  getEffectEntry,
  CARD_EFFECT_REGISTRY,
} from "./effects";
export type { EffectPrimitive, Trigger, EffectProgram, CardEffectEntry, PrimitiveContext } from "./effects";

export {
  resolveMightChain,
  currentMight,
  hasKeyword,
  trueMight,
  combatDamageDealt,
  isKilled,
  resolveCombat,
  canAfford,
  canScoreWinningPoint,
  applyEvent,
  isCounterableBy,
  applyPlay,
  findUnit,
} from "./rulesKernel";
export type { DamageAssignment, CombatResult, PlayResult } from "./rulesKernel";
