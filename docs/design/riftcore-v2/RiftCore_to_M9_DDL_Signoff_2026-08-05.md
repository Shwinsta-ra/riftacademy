# RiftCore → M9: Physical DDL Sign-off + Seed Transform Rules (2026-08-05)

**Re:** migrations 001–005 + `seed_card_bans.sql`, and the three seed findings.
**Verdict: APPROVED, with two required changes and two recommendations (§1). Findings adjudicated in §2–§4; both open decisions resolved in §5. The `cards` seed transform rules are consolidated in §6 — the seed script implements §6 exactly.**

---

## 1. DDL review results

**Verified, no action:** keyword seed matches Core's deliverable **25/25 row-exact** (checked programmatically, not by eye). Modes seed matches CR 485–489 verbatim including Magma Chamber's Victory Score 11. `card_bans` partial-unique-index pattern approved as the fix for Core's `coalesce_mode` defect. `collector_number text` approved with your reasoning (R01/T01 non-numeric; overnumbered exceed totals). No stored legality, no financial columns, analysis partition commented correctly. The migration comments carrying CR citations are exactly what invariant 1 wanted at the physical layer.

**Required change 1 — enforce CR 133.7.a in the schema.** Finding 2's Legend-with-Champion-supertype is a seed error the database can make unrepresentable:
```sql
alter table cards add constraint cards_champion_units_only check (
  not ('Champion' = any(supertypes)) or 'Unit' = any(card_type)
);  -- CR 133.7.a: Champion is a supertype that applies exclusively to units
```

**Required change 2 — `seed_card_bans.sql` open items, resolved:**
- `effective_date` = **`date '2026-07-24'`** for all four rows (July Ban List Updates, effective 2026-07-24 — verified against the announcement during the Part 6 errata audit).
- Ban target confirmed: **the OGS Legend, `ogs-019-024`**, post-transform name **"Master Yi, Wuju Bladesman"**. "Master Yi, Wuju Master" (UNL) is a different card (different subtitle = different name, CR 132.4) and is **not** banned.
- Note the dependency: the `where c.name = …` clauses assume the §6 name normalization has run (comma form, treatments stripped). Your 4-row verification gate correctly catches it if not — keep the gate.

**Recommendation 1:** `unique (card_code, sequence)` on `card_abilities` and a matching uniqueness expectation on `card_keywords` printed order — duplicate sequence numbers are always a data error.
**Recommendation 2:** RLS is enabled with no policies (deny-all). Fine for build order, but flagging so app reads aren't mysteriously empty at first integration — policies are your platform remit.

## 2. Finding 1 adjudicated — treatments baked into names

Correct catch, and the collapse would indeed have been wrong (three rows for Master Yi, Wuju Master; a silent 9-copy limit). The parenthetical is printing metadata polluting the identity field. Rules in §6.

**One better derivation than the label:** your own worked example proves the `(Overnumbered)` label is unreliable — `unl-231*-219` is labeled `(Signature)` yet its collector number 231 **exceeds the set total 219**, so it is *also* overnumbered. Therefore: **`is_overnumbered` is derived numerically, never from the label** — `numeric_part(collector_number) > set_total` (the total is the code's own TTT suffix), non-numeric collector numbers (R01/T01) → false. The `(Overnumbered)` label then merely corroborates.

This is also live proof of Decision 2's design: `unl-231*-219` lands as `printing_variant='signed'` **and** `is_overnumbered=true` simultaneously — the orthogonality was not hypothetical. (The treatments *among themselves* remain exclusive so far, so the single-value `printing_variant` bet still holds.)

## 3. Finding 2 adjudicated — "(Signature)" and the supertype conflicts

- **`(Signature)` name-parenthetical → `printing_variant = 'signed'`.** It is the autograph-style premium treatment; `signed` is its semantic home. `special` stays reserved for future oddities (promos etc.). It must **never** feed `cards.supertypes` — the CR 133.7.b supertype comes only from a rules-true source field (interim: `cards.json`'s `isSignature`), never from name text.
- **`(Starter)` → treatment `base`.** A starter-product printing is not a print treatment; product membership is already `set_code`. Strip the parenthetical, keep variant `base`.
- **Source `supertype: Champion` on a Legend → rejected by the seed** (and by Required change 1's constraint). CR 133.7.a restricts Champion to units. What the source is groping at is the **Champion Tag** (CR 133.8.b) that links a Legend to its champion — which lives in `tags`, where the seed already routes tag data. Do not synthesize a supertype from it.

## 4. Finding 3 adjudicated — code patterns

- The `*` suffix and the shared collector number are handled by your own schema comments (printing_code unique; collector_number explicitly non-unique). No change.
- Flag for **M8's card-ID format table** (their doc, not this schema): the asterisk pattern for Signature printings is missing from it.

## 5. The two open decisions

**Decision 1 — `printing_code` form: keep the source's all-hyphen form VERBATIM (`unl-231*-219`).**
Reasons: (a) it is the join key to external data for the entire interim era — byte-for-byte identity with the API response eliminates a whole class of ingest translation bugs, and the Riot-API clean sweep will replace identifiers wholesale anyway; (b) identifiers are identifiers, display is display — the project's human-facing `UNL-231*/219` form is **derivable from `set_code` + `collector_number` at display time** without ever parsing `printing_code`, which invariant 3 would prohibit; (c) a normalized key requires a maintained, tested bidirectional mapping; verbatim requires nothing. Document a display-formatter helper as the sanctioned way to render project-style codes.

**Decision 2 — first-sync deck linking: propose-by-name, confirm-by-human, write once.**
Neither pure option is right. Pure manual is needless toil; pure auto-write persists wrong links silently, and `decks.name` is deliberately non-unique so collisions are possible by design. Rule: exact-name match to **exactly one** deck → propose the link for one-click confirmation; zero or multiple matches → manual selection. On confirmation, write `deck_external_ids` and never name-match that (source, deck) again — the external id is thereafter authoritative. The deck count makes the confirmation pass a five-minute one-time cost for permanent determinism.

## 6. Consolidated `cards` seed transform (implement exactly; supersedes all prior seed notes)

Order matters. Per source row:
1. **Strip the trailing parenthetical treatment** from the name, mapping: `(Alternate Art)` → variant `alt_art` · `(Signature)` → variant `signed` · `(Starter)` → variant `base` · `(Overnumbered)` → variant `base` (label ignored for the flag; see step 3). Unknown parenthetical → **fail loudly** (new treatment needs a Core mapping, not a guess).
2. **Normalize the name separator to the CR comma form**: `"Master Yi - Wuju Master"` → `"Master Yi, Wuju Master"` (CR 132.4 — the comma form IS the name). The cleaned comma-form name is the collapse key.
3. **Derive `is_overnumbered` numerically**: numeric collector number > set total (TTT suffix) → true; non-numeric → false. Never from the label.
4. **Collapse on cleaned name** → one `cards` row per name; `card_code` = first-printing code (Decision 3 rules: earliest set, lowest collector number, base printing; identifier-not-fact).
5. **Functional-text integrity gate** (adjudication Decision 4): normalize (strip keyword reminder parentheticals, unify symbol shorthands/whitespace) → same name + different normalized text = **loud seed failure** for human review; stored `rules_text` = newest printing's verbatim text.
6. **Supertypes** only from rules-true fields (`isSignature`; Champion only where type contains Unit — constraint enforces). **Never from name text.**
7. All previously agreed transforms stand: power symbol array with `[C]`/`[A]` symbolic; gear `might` → `might_bonus`; speed → Action/Reaction keyword rows; subtype four-way split; `Basic` dropped; `Colorless` → `'{}'` with loud-fail on unparseable; `banned1v1` → ignored (superseded by `card_bans` seed); scalar type → `card_type[]` known-lossy.

## 7. Net state
All six files approved with §1's two required changes. `cards` seed fully specified and unblocked. Nothing further needed from Core before first load; report the seed's gate output (any loud failures) back for adjudication.
