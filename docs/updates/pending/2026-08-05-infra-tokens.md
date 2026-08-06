# Infra fragment: token handling in the Supabase card model

**Date:** 2026-08-05
**Owner:** M9 (Infrastructure)
**Status:** Decided by Ashwin. Recorded for RiftCore and any downstream consumer.
**Path:** `docs/updates/pending/2026-08-05-infra-tokens.md`

---

## Decision

**Tokens have no gameplay function and are physical placeholders only. They are excluded from card data enrichment and no source is expected to cover them.**

This closes the open item from the migration 008 build, where `sfd-t03` (`Gold // Buff`) appeared as a loaded card with no counterpart row in the Master Card Inventory CSV.

## What this means concretely

| Aspect | Handling |
|---|---|
| Presence in `cards` | Retained, not deleted |
| `is_token` flag | Already the discriminator (CR 185.1, intrinsic and immutable) |
| `rules_text`, `power_cost`, `might_bonus` | Not backfilled. Absence is expected, not a gap |
| Source | Riftcodex only. The Master Inventory CSV deliberately omits them |
| Gates | Token rows must not count as failures in coverage or completeness checks |

Tokens are **flagged, not removed**, consistent with the existing precedent for 1v1-banned cards: exclusion happens at the consuming layer, never by deleting from the data source. Deleting would make the absence indistinguishable from a coverage gap, which is exactly the ambiguity that the flag exists to prevent.

## Why this matters beyond bookkeeping

Two failure modes this prevents:

1. **False gap reports.** Without this rule, every future reconciliation between the CSV and the database will re-surface tokens as "missing data" and consume adjudication cycles on a non-issue. This already happened once during the 928-versus-905 reconciliation, where token naming differences (`Recruit (271) // Buff` versus `Recruit, DE`) inflated the apparent delta.

2. **False completeness signals.** Any check of the form "every card has rules text" will fail on tokens forever. Such checks need `where not is_token`, or they will either stay permanently red or get relaxed in ways that mask real gaps.

## Affected rows as of 2026-08-05

The Riftcodex source carries 5 records with `classification.supertype = 'Token'`, plus `sfd-t03` (`Gold // Buff`). Token codes follow the `SET-TNN` pattern and, like basic runes, have no collector-number total in their identifier, which is why `card_printings.collector_number` is `text` and `is_overnumbered` derives to false for them.

Separately worth noting for M8: RuneHoard does not track basic runes or tokens either, roughly 10 of each per booster box, and that absence is likewise deliberate rather than a data gap.

## Request to RiftCore

No adjudication needed, this is Ashwin's call on non-game-truth scope. Two things to absorb:

1. `validateDeck` and any other rules computation should treat token rows as inert. They are not deck-legal cards and should never enter copy counting, domain identity, or ban checks.
2. If Core authors `card_abilities` or `card_keywords` content, tokens can be skipped entirely rather than producing empty rows.

## Related open item, not covered by this fragment

The Signature count question remains open with Core: two sources agree on 50 cards and disagree on exactly one, `Shadow` (UNL-194-219). Noted here only so the two are not conflated, since both surfaced from the same reconciliation work.
