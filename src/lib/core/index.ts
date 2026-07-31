// RiftCore public exports — the shared contract surface every other
// Riftbound module imports.
//
// Module layout (docs/design/riftcore-v2/CODE_riftcore_v2_phase3.md §1):
//   schema.ts      types (Part 7 §1-§10) + the capture/pipeline layer
//   layers.ts      CR 473-480
//   turn.ts        CR 300-317
//   chain.ts       CR 318-348
//   abilities.ts   CR 360-406
//   actions.ts     CR 413-444 (the 32 Game Actions)
//   combat.ts      CR 459-466
//   scoring.ts     CR 467-472
//   format.ts      TR 104.1 / 601-603
//   rulesKernel.ts orchestration + the event fold + the match pipeline

export * from "./schema";

export { migrate, migrateToCurrent } from "./migrate";

export { getCard, cardName, cardMight, cardKeywords, toCost, costOf, cardTruth } from "./cards";
export type { CardJson } from "./cards";

export { CARD_EFFECT_REGISTRY, getEffectEntry } from "./effects";
export type { CardEffectEntry } from "./effects";

// --- Layers (CR 473-480) ---
export { applyLayers, currentMight, isMighty, activeGrantedKeywords } from "./layers";

// --- Predicate / Selector / EventPredicate evaluation (the ONLY interpreter) ---
export {
  evaluatePredicate,
  resolveSelector,
  matchesEvent,
  resolvePlayerRef,
  resolveKeywords,
  hasKeyword,
  sumKeywordValue,
} from "./predicates";
export type { EvalContext } from "./predicates";

// --- Turn / states / Priority / Focus (CR 300-317) ---
export {
  PHASE_ORDER,
  STEPS_BY_PHASE,
  turnStateLabel,
  isTimingPermitted,
  grantPriority,
  grantFocus,
  passPriorityTo,
  passFocus,
  nextInTurnOrder,
  setShowdownState,
  setOpenState,
  advancePhase,
  beginNextTurn,
} from "./turn";
export type { TurnStateLabel, PriorityGrant } from "./turn";

// --- Chain / Tasks / Cleanup / Showdown (CR 318-348) ---
export {
  emptyChain,
  chainExists,
  oldestPending,
  newestFinalized,
  resolvesImmediately,
  isCounterable,
  handleOutstandingTasks,
  finalize,
  passPriority,
  resolveTop,
  isIdle,
  runCleanup,
  openShowdown,
  closeShowdown,
  queueCleanup,
} from "./chain";
export type { CleanupTrigger, NotedDeathknell } from "./chain";

// --- Abilities / replacement effects (CR 360-406) ---
export {
  isAbilityActive,
  canActivate,
  shouldTrigger,
  resolveNthTimeTrigger,
  isUsable,
  orderReplacements,
  replacementOrderingPlayer,
  applyReplacements,
  areSimultaneous,
  resolveChoiceStep,
  resolvesImmediatelyOnFinalization,
  isIgnored,
  isTextActive,
  isValidTarget,
  mistargetsOnResolution,
  canBeCompelled,
  legionSatisfied,
  levelSatisfied,
  dependentAbilityActive,
  countsAsTriggered,
  battlefieldAbilityController,
  OBSERVABLE_IMPACT_MOMENTS,
} from "./abilities";
export type { ReplacementOutcome, ReplacementUsage, IgnoreScope, ObservableImpact } from "./abilities";

// --- The 32 Game Actions (CR 413-444) ---
export {
  draw,
  exhaust,
  ready,
  readyAll,
  recycle,
  deal,
  heal,
  play,
  move,
  recall,
  hide,
  discard,
  stun,
  reveal,
  counter,
  buff,
  spendBuff,
  banish,
  kill,
  add,
  channel,
  burnOut,
  double,
  swap,
  attach,
  detach,
  predict,
  prevent,
  replace,
  create,
  burn,
  empower,
  disempower,
  skip,
  pay,
  canPay,
  changeZone,
  isNonBoardZone,
} from "./actions";

// --- Combat (CR 459-466) ---
// hasKeyword / sumKeywordValue are exported from the predicates block above —
// keyword resolution is a Layers concern (CR 477.2), not a combat one.
export {
  combatMight,
  damageContributed,
  isKilled,
  minimumLethal,
  tierOf,
  legalDamageAssignments,
  resolveCombatDamage,
  healAllUnits,
  determineCombatResult,
} from "./combat";
export type { CombatRole, AssignmentTier } from "./combat";

// --- Scoring (CR 467-472) ---
export { canScore, resolveScore, scoredEveryBattlefield, checkWin, clearScoredThisTurn, recordScore } from "./scoring";

// --- Format context + deck construction (TR 104.1 / 402.1 / 601-603) ---
export { BAN_LIST, cardLegality, makeFormatContext, teamTurnOrder, validateDeck } from "./format";
export type { FormatLegality, CardFacts, DeckList, DeckValidation } from "./format";

// --- Kernel orchestration + match pipeline ---
export {
  checkLegality,
  legalCandidateActions,
  determineTotalCost,
  applyEvent,
  foldEvents,
  materialize,
  checkClean,
  readSnapshot,
  findObject,
  isLethallyDamaged,
} from "./rulesKernel";
