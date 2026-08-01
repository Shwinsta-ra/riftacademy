// Card effect registry — EMPTY BY DESIGN until Phase 4.
//
// The legacy EffectPrimitive vocabulary (10 invented ops) is deleted: the 32
// CR Game Actions in ./actions.ts are now the only effect verbs (naming
// charter item 3). The 15 legacy registry programs were all authored against
// those primitives and against the chain-fold Might model, both of which the
// v2 rebuild replaces — so they are re-authored from scratch in Phase 4
// rather than mechanically translated.
//
// Phase 4 is BLOCKED on the Supabase card inventory and is explicitly out of
// scope for this PR. See docs/design/riftcore-v2/CODE_riftcore_v2_phase3.md §5
// and docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §12.
//
// The Phase-4 shape is known even though the content isn't: a card's entry
// will be a set of Abilities (see ./abilities.ts) classified by CR ability
// kind — passive / replacement / activated / triggered / reflexive / delayed
// / linked — NOT a flat step list. Part 4 §6 calls the absence of that
// classification the single largest structural gap in the legacy model, and
// Part 4 §7 register item 7 requires every modeled card to be re-classified
// by ability type before its program is rebuilt.

import type { Ability, CardId } from "./schema";

/** A card's modeled abilities, classified by CR ability kind (CR 360-397). */
export type CardEffectEntry = { abilities: Ability[] };

/** Empty until Phase 4 (blocked on the Supabase card inventory). */
export const CARD_EFFECT_REGISTRY: Record<CardId, CardEffectEntry> = {};

export function getEffectEntry(cardId: CardId): CardEffectEntry | undefined {
  return CARD_EFFECT_REGISTRY[cardId];
}
