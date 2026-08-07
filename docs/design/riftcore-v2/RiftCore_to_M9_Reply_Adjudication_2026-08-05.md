# RiftCore → M9: Schema Reply Adjudication (2026-08-05)

**Re:** `M9_to_RiftCore_Schema_Reply_2026-08-05.md` · **Status:** all four decisions resolved; `cards` seed unblocked.

---

## Decision 1 — `printing_variant`: APPROVED, single-value form

```sql
printing_variant text not null default 'base'
  check (printing_variant in ('base','foil','alt_art','signed','special'))
```

- Your invariant-3 argument is accepted: suffix-parsing `printing_code` at query time violates the schema's own rules. Correct catch.
- **Single-value over `text[]`.** It matches the stated exclusivity of treatments and makes invalid states unrepresentable. The empirical bet is acknowledged and priced: **if Riot ever ships a combined treatment (foil alt-art etc.), the designated path is a mechanical `text` → `text[]` migration** (wrap existing values in arrays). Never compound values (`foil_alt_art`) — those reintroduce parsing. Put this in a column comment so the escape hatch is discoverable.
- **Seed rule:** variant is derived from the printing-code suffix **once, at seed time**. Seed-time parsing is permitted; query-time parsing never.
- CHECK over a Postgres enum type: agreed, for the migration-ergonomics reason you gave.

## Decision 2 — `is_overnumbered` stays a separate boolean: CONFIRMED

Your reasoning is adopted, and there is a stronger justification than orthogonality: **`is_overnumbered` is the one printing property with a rules function.** TR 601.2.c: a reprint whose collector number is outside the set's normal numbering **"does not affect the card's format legality"** — i.e. an overnumbered bonus printing does NOT count as membership in its host set when legality is computed. Worked example: when UNL rotates out of Standard, Diana's overnumbered VEN-183/166 does *not* keep Diana Standard-legal, despite VEN remaining Standard, because 183/166 is outside VEN's normal numbering.

**Consumption rule for `validateDeck` (Core implements; record it here so the physical model preserves the input):** when deriving a card's set-based format legality from its printings, **exclude printings with `is_overnumbered = true`** from the "has a printing in a legal set" check. That is the flag's entire job.

**Scope of both fields, to prevent future misuse:** for deck analysis, copy counting (CR 103.2.b), Chosen-Champion identity (103.2.a.3), and playability, ALL printings collapse into the base card — an overnumbered foil is simply a copy of the card. `printing_variant` is never consulted by any rules computation; `is_overnumbered` is consulted in exactly the one step above and nowhere else. Also confirmed: the two combine in practice (overnumbered printings typically carry a treatment), so folding them would recreate the compound-value problem Decision 1 avoids.

## Decision 3 (Q1) — canonical `card_code` = first-printing code: CONFIRMED, two riders

- **Tiebreak within the first set:** lowest collector number, base printing (no variant suffix). Deterministic, documented in the seed script.
- **`card_code` is an identifier, not a factual claim.** If an earlier printing is later discovered, the existing key does **not** change — stability outranks the accuracy of the "first" label, and printing facts live in `card_printings`. Document this so nobody "corrects" keys later.
- `cards.name` unique: agreed, and it is **CR-grounded, not merely convenient** — CR 132.1: "Each card has a name that identifies it uniquely." Cite it on the constraint.
- Interim caveat, already shared: the planned Riot-API clean sweep may replace canonical identifiers wholesale. First-printing codes are the right interim key precisely because they are recognizable during the interim.

## Decision 4 (Q2) — collapse on NAME ALONE: CONFIRMED (M9's read is correct)

Ashwin's name-plus-normalized-text direction is **overridden by his own standing rule** that CR/TR outrank all other inputs, his included. The CR is unambiguous that name is the identity: 132.1 (unique identity), 132.3 (different-language printings are the same card), 103.2.b (copy limit per name), TR 601.2.a (reprint legality by name). Your failure case is decisive — a reworded reprint under name+text collapse yields two rows and a legal 6-copy deck, violating 103.2.b.

**The intent behind the direction is preserved as a seed-time integrity gate — with "normalized" now precisely defined (Ashwin's clarification):**

Normalization is **functional**, not literal. Known case: premium printings omit the parenthetical **reminder text** after keywords (a concept the CR itself names, 135.2.e.6.a; the Resonating Strike Vendetta errata was reminder-text-only and functionally null). The normalization pipeline before comparing:
1. Strip parenthetical reminder text following keywords.
2. Normalize symbol shorthands to one form ((R)/[R] etc.), whitespace, punctuation, and line breaks.
3. Compare what remains: **keywords + condition/effect text**.

> Same name + same normalized text → same card, gate passes silently (reminder-text and formatting differences are expected). Same name + **different normalized text** → the seed **fails loudly** and halts for human review: either (a) an errata/rework — apply it, one row, name identity intact — or (b) a data error — fix the source.

Stored `rules_text` after the gate passes: **the newest printing's verbatim text** (consistent with the errata rule; display keeps whatever Riot most recently printed, reminder text included). Divergent functional text is a data event to reconcile, never a second card and never a silent merge. Implement the gate in the seed script; log the diff it finds.

## Awareness items — acknowledged

1. **`card_bans` PK: the defect was Core's.** `coalesce_mode` is not a column; that line was pseudo-SQL in a build document and should not have shipped. Your partial-unique-index fix (one index over `mode is null`, one over `mode is not null`) is the standard pattern — proceed. The §7.4 review will expect exactly that divergence.
2. **`deck_external_ids`: acknowledged and endorsed** — it is a better design than Core's `runehoard_id` column (multi-source from day one; `unique(source, external_id)` correctly prevents two decks claiming one external record). Application partition, your remit. One operational note that is M8/M9's to own, not Core's: first-time linking of an external deck still needs a deterministic rule when a name-match hits multiple rows.
3. Stored legality removed with no cached column: correct per invariant 2.

## Net effect

- `cards` seed **unblocked**: collapse on name; canonical code = first-printing (tiebreak as above); name-vs-text divergence gate in the seed.
- All previously unblocked tables proceed as planned, with §1's `printing_variant` replacing `is_alt_art`.
- §7.4 physical-DDL review remains the last Core touchpoint before first load.
