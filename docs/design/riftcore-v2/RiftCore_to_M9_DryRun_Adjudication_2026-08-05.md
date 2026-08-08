# RiftCore → M9: Seed Dry-Run Adjudication (2026-08-05)

**Re:** `M9_to_RiftCore_Seed_DryRun_Report_2026-08-05.md`. All four decisions resolved below. **After applying these, the load is cleared to run.**

First, on the report itself: the 67-row quantification of the numeric `is_overnumbered` rule, the `clean_name` trap catch, and the newest-wins dedup finding (36 alt-arts saved from misclassification) are exactly the evidence discipline this pipeline was designed for. GATE 6 passing clean is the load-bearing result of the run: **the name collapse is attribute-safe on everything except rules text** — which is the one attribute the gates were built to interrogate.

---

## Decision 1 (GATE 1) — `(Ultimate)` maps to a NEW enum value: `'ultimate'`

Not `'special'`. Add it:

```sql
-- migration: extend printing_variant check
check (printing_variant in ('base','foil','alt_art','signed','ultimate','special'))
```

Rationale: **"Ultimate" is the product's own name for a treatment class, not an oddity.** The naming principle that governs game-truth tables (use the source-of-truth's vocabulary) applies to product vocabulary too: where the product names a treatment, we use its name. `'special'` is a catch-all, and every value that lands in a catch-all loses information — it should stay empty as long as possible. The practical consumer is collection valuation (M8's remit): chase-tier treatments are precisely what gets queried for pricing, and `variant = 'ultimate'` must be answerable without string archaeology. Cost is a one-line CHECK migration, which is why CHECK-over-enum was chosen in the first place.

`unl-238-219` therefore lands as `printing_variant='ultimate'`, and — collector 238 > 219 — `is_overnumbered=true` via the numeric rule, no special-casing.

One related observation from your headline numbers: **zero `foil` rows.** The source evidently does not model foils as distinct printings, which means foil-ness is a property of the *physical copy*, not the printing. Leave `'foil'` in the enum (harmless, future-proof), but note for M8: if foil copies ever need tracking, that is an **inventory-level** attribute, not a `printing_variant` — do not force it into this field later.

## Decision 2 (GATE 3) — CONFIRMED: the four OGS Legends drop the Champion supertype

Exactly as §3 of the sign-off directed, now with the concrete rows in hand: `supertypes = '{}'` for all four; **no synthesized supertype**; the Legend↔champion linkage is the Champion Tag (CR 133.8.b) living in `tags`. The `cards_champion_units_only` constraint stays and is doing its job — this is the second time it has caught the exact defect it encodes (CR 133.7.a).

Ban-seed dependency acknowledged: `ogs-019-024` resolves cleanly under this handling; the ban rows are unaffected (they key on `card_code`, and the name gate matches the post-transform "Master Yi, Wuju Bladesman").

One soft check to add, at **validation time, not seed time**: when `validateDeck` matches Signature cards and the Chosen Champion against the Legend's Champion Tag, a Legend row whose `tags` lack any champion tag should surface as a data gap. Do not enforce it at seed (we don't yet know the source's tag coverage is complete); let the validator report it.

## Decision 3 (GATE 5) — the 11 divergences: 10 errata-to-apply, 1 source error

Standing rule applied: one row per name always; the classification decides *which text* wins.

| Card | Ruling | Winning text | Note |
|---|---|---|---|
| Teemo, Strategist | **errata-to-apply** | newest | Substantive functional change (Hidden-play clause added, targeting reworked). Not in the 2026-07-23 errata list, so it predates it or is a set-rework — either way newest is current |
| Sett, The Boss | **errata-to-apply** | newest | Substantive (entry-state retemplating; if→when is trigger templating per CR 383) |
| Yone, Blademaster | **errata-to-apply** | newest | Removing "that was uncontrolled" deletes a restriction — functional |
| Rek'sai, Void Burrower | **errata-to-apply** | newest | banish→play is a functional restructure |
| Sett, Brawler | **errata-to-apply** | newest | and→or is functional; "I'm played"→"you play me" is controller-scoping (CR 419.4) |
| Lux, Crownguard | **errata-to-apply** | newest | Templating cleanup, functionally equivalent; newest is current text either way |
| Karma, Channeler | **errata-to-apply** | newest | Destination clarification ("to your main deck") |
| Viktor, Innovator | **errata-to-apply** | newest | Origin/Destination preposition templating (CR 447 family) |
| Azir, Emperor of the Sands | **errata-to-apply** | newest | Wording-level; newest is current |
| Renekton, Brute | **errata-to-apply** | newest | Pure clause reordering — but see the pipeline note below: we adjudicate this once rather than teach the pipeline to tolerate reordering |
| **Mel, Defiant Soul** | **SOURCE ERROR** | **the correct (spaced) text, regardless of recency** | "spellwhen" is a missing space in the source. Important: newest-wins does NOT apply to source errors — if the broken snapshot is the newer one, newest-wins would store broken text. Rule: source error → correct text wins, and log a source-fix note for the upstream report |

**Why the pipeline is NOT extended for Renekton or Mel:** clause order is semantically load-bearing in this game — the trigger-condition adjacency rule (CR 383.2.a.1) means an "if" clause's *position* changes what it gates. A normalization pipeline that tolerates reordering, or that heuristically joins/splits words, would be blind to real functional differences. Both stay order- and token-sensitive by design; one-off cases route to adjudication, which is what just happened and it worked.

**Post-load verification (add to the load script):** the eight cards from the 2026-07-23 errata (Draven Vanquisher, Emperor's Dais, Fizz Trickster, Diana Lunari, Stalking Wolf, Astral Heron, Gangplank Naval, Resonating Strike) must carry post-errata `rules_text` after newest-wins resolution — the same 8/8 check that passed against `cards.json` in the Part 6 audit, now run against the loaded table. Any miss is a blocking finding.

## Decision 4 — the three normalization additions: ACCEPTED into canonical §6 step 5

All three are correct and are now canon:
1. Bracket removal substitutes a space (tokenization integrity).
2. HTML entities decode **before** tag stripping (ordering requirement).
3. `:rb_*:` symbol tokens are padded as word boundaries.

Canonical §6 step 5 is restated in full, one place, as requested:

> **Normalization pipeline (canonical):** decode HTML entities → strip tags → remove keyword reminder parentheticals → replace `[...]` brackets and `:rb_*:` tokens with space-padded canonical forms → unify symbol shorthands → collapse whitespace runs → compare remaining keywords + condition/effect text, **order-sensitive and token-exact**. No reorder tolerance; no word-joining heuristics. Anything that diverges after this pipeline goes to adjudication, never to a pipeline patch.

## Awareness items — acknowledged
1. Migrations live, `card_keywords` PK narrowed per the card-wide confirmation — good.
2. `clean_name` unused, newest-`updated_on` dedup — both correct calls, endorsed.
3. The `classification.supertype='Signature'` (57 rows) vs `(Signature)` treatment (36 rows) separation landing cleanly is the §3 design vindicated in data.
4. **One reconciliation to run post-load, non-blocking:** this source collapses to **905** names; the legacy `cards.json` held **928** distinct names. Identify the ~23-name delta (likely tokens/runes/coverage differences between pulls) and report it — not a gate, but the BIG CLEAN SWEEP will want the list.

## Net state
GATE 1 mapped (`ultimate`, one-line migration), GATE 3 confirmed, GATE 5 fully adjudicated (10 newest-wins + Mel corrected-text), normalization canon updated. **Load is cleared.** Report the post-load errata 8/8 check and the 905-vs-928 reconciliation when done.
