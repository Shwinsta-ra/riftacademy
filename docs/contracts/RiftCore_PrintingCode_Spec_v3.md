# RiftCore: Printing Code Grammar & Translation Spec — **v3**

**Date:** 2026-08-07 · **Supersedes:** `RiftCore_PrintingCode_Spec_v2_CONSOLIDATED.md`, `RiftCore_PrintingCode_Spec_v2_1_Amendment.md`, and `RiftCore_PrintingCode_Spec_v2_2_Amendment.md`, in full. All three are deleted in the same commit that adds this file. **Implement from this document only.**

**Why v3:** v2 plus two live amendments is the same three-documents-side-by-side shape that produced the original drift. The amendments are now validated by a passing implementation, so they fold in. Consolidation is the moment rulings disappear — see §13 for the carry-forward record and how it was checked.

**Live-validated against two independent populations:** `card_printings` (1,165 rows, M9, live query) and the TCGplayer catalogue (1,422 printings, M8).

**Machine-readable fixtures:** `docs/contracts/printing_code_fixtures.json`. §8 below is the human-readable rendering; the JSON is what implementations load. See §8.3.

**Section numbering is deliberately unchanged from v2** so that existing `§n` cross-references — in the fixtures JSON, in M9's and M8's threads, and in `printing_code_fixtures_FINDINGS.md` — still resolve. §3a is inserted rather than renumbering §4 onward, for the same reason.

---

## 1. Ownership — specification and fixtures, not a function

The translator must exist in **Python** (M9 ingest) and **TypeScript** (app/kernel). A single canonical implementation is therefore impossible, and pretending otherwise guarantees drift.

| Artifact | Owner |
|---|---|
| Grammar, transformation rules, error policy (§3–§7) | **Core** |
| **Conformance fixtures** (§8) | **Core** |
| Python implementation | **M9** |
| TypeScript implementation | **M9 / app** |
| Any further implementation | Its consumer |

**Binding rule: no implementation ships without passing §8 verbatim.** Drift becomes a red test rather than a silently empty join. M9 deletes `to_printing_code()` once a replacement passes.

## 2. Set aliases

**`PG` → `OGS`.** TR 601.3.c.1: *"The Origins supplemental set contained in Proving Grounds (OGS)."* Same product, two labels. **Accept `PG` on input; never emit it.**

Not cosmetic: `OGS-019-024` is **Master Yi, Wuju Bladesman**, banned in 2v2 Constructed. A wrong alias silently drops a banned card from a legality check. *Alias errors are not cosmetic when the aliased card is rules-relevant.*

## 3. Grammar

**Internal** (Supabase `card_printings.printing_code`): lowercase, all hyphens.
**External** (RuneHoard, ROI tracker): uppercase set, slash before total.

```
external := SET "-" NUMBER [ "/" TOTAL ]
internal := set "-" number [ "-" total ]

SET    := 2–4 letters       (alias PG→OGS; see "set codes are data" below)
NUMBER := (?:sp|[rt])? digits [ letter ] [ "*" ]
TOTAL  := digits            -- the NUMBERING-SPACE total, not the set size
```

Canonical internal regex:
```
^([a-z]{2,4})-((?:sp|[rt])?\d+[a-z]?\*?)(?:-(\d+))?$
```

| Component | Meaning |
|---|---|
| `r` / `t` prefix | Rune / Token numbering — **carries no total** |
| `sp` prefix | Special subset (Crystal Rose) — **carries its own total** (`006` = 6-card subset) |
| trailing letter | alt-art variant. **`[a-z]`, not `[ab]`** — live data reaches `c` (`OP-R06c`) |
| `*` | Signature printing |
| absent TOTAL | rune/token — **not an error** |

**`TOTAL` is the total of the numbering space the card is numbered within, not the size of the set.** `VEN-SP1/006` carries `006` because the Crystal Rose special subset holds six cards, while Vendetta itself holds 166. Reading `TOTAL` as a set size makes every `sp` code look corrupt.

### Set codes are data, not grammar

> **The parser MUST NOT validate the set component against any enumeration.** It accepts any 2–4 letter set. Whether that set exists is answered by the join, not by the regex — a well-formed code for an unknown set is **situation C** (a data gap, §7), not situation A (malformed).

Sets observed in `card_printings` today are OGN, OGS, SFD, UNL and VEN; TCGplayer additionally carries OPP, PR, JDG, SGN and RWB. **That list is illustrative documentation, not a validation rule, and it is deliberately not reproduced in the grammar block above.** v2 enumerated `OP` there, v2.1 then established that `OP` is not a set at all, and the stale entry survived into two more document versions. An enumeration sitting inside a grammar block will eventually be implemented as a validator; keeping the list out of the grammar is what prevents that.

**Unknown NUMBER prefixes must FAIL to parse, not be accepted.** The prefix set (`sp`, `r`, `t`) is deliberately enumerated rather than generalised: a card form we have never seen is a **finding**, and findings must be loud. (§7 makes this non-blocking.) Note `sp` first in the alternation — ordering is not required today, since `[rt]` cannot match `s`, but it is correct defensively.

**This is a prefix check, not a set check.** Fixture 22 (`VEN-ZZ1/006`) raises because `ZZ` is an unknown *number* prefix. An unknown *set* must **not** raise. The two rules point in opposite directions and are easy to conflate during implementation.

**Parse with the regex, never by splitting.** `split('/')` breaks on runes; `split('-')` breaks on foil suffixes.

## 3a. Printing variant — `special` for Crystal Rose

**Ruling: `printing_variant = 'special'`.** Migration 012 is correct; no change.

Two axes are in play, and the ruling turns on keeping them apart:

- **Treatment / numbering axis** — Riot's own designation is **SP = Special**. That is the axis `printing_variant` models.
- **Artwork axis** — "Crystal Rose" is a **Wild Rift skinline**, i.e. *which* collaboration. It will recur under different names (a future Star Guardian or Project set would be an equally valid "special").

`crystal_rose` would put the artwork axis into the treatment column and require a new enum value **per collaboration** — unbounded growth keyed to something that is not a treatment class. So `special` uses Riot's own name **for the axis the column actually models**, consistent with the `ultimate` precedent rather than an exception to it.

**Revisit trigger:** a second *structurally distinct* special product (different numbering, pull rate, or pricing tier). If collaboration identity ever needs querying, that is an **additive field**, not a repurposed enum.

> *Recorded, because it is the reason §13 exists:* this ruling was issued in Addendum C and **dropped when five documents were consolidated into v2 — Core's error.** M9 caught the omission. Consolidation is not free; anything decided in a superseded document must be carried forward explicitly.

## 4. Transformation

**External → internal:** lowercase everything; `/` before TOTAL becomes `-`; preserve letter suffix and asterisk verbatim. *This direction was always correct — which is exactly why only an executable round-trip assertion caught the defect in the other direction.*

**Internal → external — the three-part casing rule.** Apply in order:

1. Uppercase the **SET** component.
2. Uppercase the **NUMBER's alphabetic prefix** if present (`r`→`R`, `t`→`T`, `sp`→`SP`).
3. **Preserve the variant suffix letter in lowercase.**
4. Preserve the asterisk verbatim.
5. Insert `/` before TOTAL when a total is present.

**Why the distinction is principled rather than arbitrary:** the set code and the number prefix both identify a **namespace** (which set; which numbering space — main, rune, token, special). The trailing letter is a **variant discriminator within** that namespace. Different roles, different casing, consistently rendered that way by every external source.

Confirmed against live external data, not symmetry:

| Evidence | Source | Shows |
|---|---|---|
| `OP-R06c`, `OP-R05c` | M8 Holdings (614 rows, 614/614 parse) | `R` **upper**, `c` **lower**, in one code |
| Shape `ANNa` for `R03a` / `R06c` | M8 TCGplayer catalogue (1,422 printings) | prefix upper, suffix lower |
| Shape `ANN` for `R01`, `T01` | same | prefix upper |
| Shape `AAN/NNN` for `SP3/006` | same | `SP` upper |
| Shape `NNNa/NNN` for `135a/166` | same | suffix lower |

Fixture 9 (`VEN-R03a`) contains both cases in one code, which is why **no blanket rule resolves it** — neither `.upper()` nor "uppercase the set only".

> ⚠ **The `.upper()` trap — a consequence of rule 3, not a competing rule.** `ven-135a-166` → `VEN-135a/166`, **never** `VEN-135A/166`. A whole-string uppercase yields a code RuneHoard will not match — failing with **zero rows, not an error**. This bites hardest at the layer that renders RuneHoard imports.
>
> This note is **subordinate to the five-step rule above.** It warns against uppercasing the *variant suffix* (rule 3) and says nothing about the *number prefix* (rule 2). Read as a standalone instruction it produces a rule that uppercases too little.

**Core's error, recorded.** v2 §4 read *"uppercase the set prefix only."* It was written while warning against the `135A` trap and over-corrected: guarding against uppercasing too much produced a rule that uppercases too little. The ⚠ warning and the rule it accompanied were pulling in opposite directions, and only an executable round-trip assertion exposed it — after the defect had survived review by M8, M9 and Core across five document versions. The note is subordinated here so the two can no longer conflict.

**Foil suffix `-f`:** strip and return the base printing, **returning a foil flag alongside** rather than discarding it. Core does not model foil as a printing (foil-ness belongs to the physical copy); M8's price spine carries it on `sub_type`. **Never emit `-f` internally.**

## 5. TCGplayer — a third format

TCGplayer supplies **(group_id, number_fragment)**; the set arrives as a group id, and runes arrive as bare `R01`–`R06` with no set information in the code.

```
tcgplayer := (group_id, number_fragment)
  number_fragment := NUMBER [ "/" TOTAL ]        -- no set prefix
                   | NUMBER " // " NUMBER        -- dual-face product, see below
```

- `translate_from_tcgplayer(group_id, fragment)` resolves `group_id` via a **stored** `tcgplayer_groups(group_id, set_code)` mapping — data, not hardcoded. **Unmapped group_id raises.**
- **Dual-face tokens (`T05 // T06`, 15 printings):** this is a TCGplayer *product* identifier, not a printing code. The adapter **splits on ` // `, translates each half, and returns a list**. One product mapping to two cards is a real relationship, not a parse failure. **No grammar change.** Tokens are out of scope for gameplay and pricing, so behaviour beyond the split is the ingest's policy.

**`OPP` and `PR` are distribution channels, not sets.** TCGplayer's `OPP` (Organized Play Promotional) and `PR` (Promotional) are mapped through `tcgplayer_groups` like any other group id. **Do not create internal set codes `op`, `opp`, or `pr`** — none of them is a set, and fabricating one bakes the error deeper. See §12 for what is deferred here.

## 6. Direction constraints

**Translate from `card_printings.printing_code` only — never from `cards.card_code`.** A `card_code` is a gameplay card **collapsed across printings**; it cannot round-trip. Translating one yields a *plausible-looking string pointing at the wrong physical object* — passes every format check, silently wrong.

**Enforce this with types, not documentation.** `CardCode` and `PrintingCode` must be **distinct types** — TypeScript branded types, Python `NewType`. Passing a `card_code` where a `printing_code` is required must be a **compile error**.

## 7. Error policy — three situations, three behaviours

| Situation | Behaviour | Decided by |
|---|---|---|
| **A. Malformed input** — `VEN-?/166`, empty, unknown **number** prefix | **Raise** | the **function** |
| **B. Insufficient source data to construct a code** | **Return null; record the row with a null code** — never drop it | the **caller** (ingest policy) |
| **C. Well-formed code with no matching printing** — e.g. `ven-189*-166`, or any code for an unknown **set** | Return the code; the join finds nothing. This is a **data gap** | neither — it's a finding |

**The function is strict; the caller sets policy.** The ingest **must** catch A, or the daily job aborts on the first unresolvable promo code.

**No-substitution prohibition:** the translator must never return an approximate, nearest, or base-printing substitute for a code that does not resolve. Permitted outputs are the exact translation, a raise (A), or null-by-caller-policy (B). A helpful fallback converts a **visible gap into a wrong answer**, and would do so on the highest-value rows in the catalogue.

## 8. Conformance fixtures — every implementation passes these unchanged

Ordered by risk. **`docs/contracts/printing_code_fixtures.json` is the authoritative form**; this table is its rendering. Implementations load the JSON rather than retranscribing the table — a transcription step that can drift, in a document whose entire purpose is preventing drift.

| # | Case | External | Internal | Note |
|---|---|---|---|---|
| 1 | Signature asterisk | `SFD-227*/221` | `sfd-227*-221` | Ahri, Inquisitive — $3,089 |
| 2 | Signature asterisk | `OGN-303*/298` | `ogn-303*-298` | |
| 3 | Signature asterisk | `VEN-189*/166` | `ven-189*-166` | |
| 4 | Signature asterisk | `UNL-234*/219` | `unl-234*-219` | |
| 5 | Alt-art, case preserved | `VEN-135a/166` | `ven-135a-166` | **must not become `135A`** (§4 rule 3) |
| 6 | Alt-art | `SFD-110a/221` | `sfd-110a-221` | |
| 7 | **Rune suffix beyond `b`** | `OP-R06c` | `op-r06c` | Asserts lowercasing and that the suffix range reaches `[a-z]`, not `[ab]`. **Valid despite `op` not being a sanctioned internal set** — §3 forbids validating set codes, so this tests casing and suffix range, not set membership |
| 8 | Rune, no total | `VEN-R01` | `ven-r01` | `R` uppercases (§4 rule 2) |
| 9 | **Rune variant** | `VEN-R03a` | `ven-r03a` | **Decisive for §4:** `R` upper and `a` lower in one code. No blanket rule satisfies both |
| 10 | Token, no total | `UNL-T01` | `unl-t01` | |
| 11 | **Special subset** | `VEN-SP1/006` | `ven-sp1-006` | total = subset size, not VEN's 166. `SP` uppercases |
| 12 | Standard | `VEN-142/166` | `ven-142-166` | |
| 13 | ~~Promo prefix~~ | ~~`OP-041/166`~~ | ~~`op-041-166`~~ | **WITHDRAWN — harness must skip.** See §8.4 |
| 14 | Starter | `OGS-009/024` | `ogs-009-024` | |
| 15 | **Alias, input only** | `PG-019/024` | `ogs-019-024` | must not round-trip to `PG` |
| 16 | **Foil, strip + flag** | `VEN-081/166-f` | `ven-081-166` + `foil=true` | never emit `-f` internally |
| 17a | **Dual-face split** | `"T05 // T06"` | `["T05", "T06"]` | **Executable now.** Asserts the ` // ` split and that one product yields a **list**, not a parse failure. Stops before translation, so needs no group mapping |
| 17b | **Dual-face translation** | `(group_id, "T05 // T06")` | `["unl-t05", "unl-t06"]` | **DEFERRED**, `blocked_on: tcgplayer_groups`. Harness skips **and reports the skip** |
| 18 | **Forward-looking** | `VEN-135a*/166` | `ven-135a*-166` | **zero occurrences** in both populations as of 2026-08-06. Do not delete as redundant |
| 19 | **Round-trip** (meta-assertion) | all above | — | external→internal→external equals input, except #15 (`PG`→`OGS`), #16 (`-f`→flag), #17 (list). See §8.1 |
| 20 | **Malformed** | `VEN-?/166` | — | **must raise** (2026-08-02 placeholder) |
| 21 | **Malformed** | `` (empty) | — | must raise |
| 22 | **Unknown number prefix** | `VEN-ZZ1/006` | — | **must raise** — new forms are findings. A prefix check, **not** a set check (§3) |

### 8.1 Counts — report both figures, always

"20" alone is misleading, because it invites the reading *"the harness runs 20 things."* It does not; it runs 21.

```
entries                     23
meta-assertions              1   (fixture 19 — excluded from the fixture count, but EXECUTABLE)
data fixtures               22
  withdrawn                  1   (13)
  deferred                   1   (17b)
data fixtures executable    20
harness assertions today    21   (20 data + 1 meta)
```

Derivation: `23 entries − 1 meta-assertion = 22 data fixtures − 1 withdrawn = 21 executable − 1 deferred = 20 executable today`.

**The meta-assertion is excluded from "fixture count" on the merits:** fixture 19 has no external/internal pair; it is a property assertion *over* the other fixtures, not a data fixture. It is nonetheless the assertion that found the §4 casing defect, so excluding it from the count must never be read as excluding it from execution.

Both figures are recorded in the JSON's `counts` block and **asserted programmatically** by `scripts/verify_printing_code_fixtures.py`, which recomputes every count from the fixture array rather than trusting the block. A count that cannot be re-derived from the data is a claim, not a count.

> *How v2.2 §5.5 arrived here, recorded so it is not re-derived differently:* v2.2 stated *"21 executable (22 minus withdrawn 13)"* using 22 as the base — the **pre-split** count, having forgotten that splitting 17 adds an entry. The figure was right and the arithmetic was not; it landed on a valid answer by coincidence. The derivation above is the intended one.

### 8.2 Fixture keys

Fixtures are keyed on **`(id, part)`**. `part` is absent everywhere except the two halves of 17, which are `(17, "a")` and `(17, "b")`.

Two reasons, the larger one first:

1. **Fixture ids must stay traceable to §8's numbering**, because that is how a human cross-references a failing test against the specification. Renumbering 1–23 would break that traceability.
2. String ids preserve traceability but impose a `number | string` union on every loader for the sake of two entries.

`(id, part)` preserves both. Uniqueness is asserted on `(id, part)`.

**Human-facing output derives a display key** — `String(id) + (part or "")`, giving `"5"`, `"17a"`, `"17b"` — for test names and reports, so reports read naturally while the key stays typed. **The display form is presentation only and is never a key.**

### 8.3 Harness obligations

1. **Skip `"withdrawn": true` fixtures** — never execute them.
2. **Skip `"deferred": true` fixtures and REPORT the skip** — never count a skip as a pass.
3. **Do not validate set codes against any enumeration** (§3).
4. Dispatch on `"kind": "assertion"` rather than parsing an external value — fixture 19 has none.
5. Report the display key (§8.2), and report both counts (§8.1).

> **A conformance rule that cannot be executed is a statement of intent.** The §4 casing defect survived review by M8, M9 and Core across five document versions, and was caught within one session of the fixtures becoming machine-readable — by executing a round-trip assertion that had until then existed only as a sentence in a table. This is also why 13 and 17b are labelled withdrawn and deferred rather than quietly assumed to pass, and why obligation 2 requires reporting the skip: a silent skip is indistinguishable from a pass.

### 8.4 Fixture 13 — withdrawn, retained, not deleted

`OP` is a **distribution marker, not a set code.** All seven live `OP` holdings carry the collector number and total of the card's *original* set:

| M8's code | Mirrors | Card | |
|---|---|---|---|
| `OP-011/024` | `ogs-011-024` | Flash | ✓ |
| `OP-127/219` | `unl-127-219` | Mister Root | ✓ |
| `OP-093/219` | `unl-093-219` | Dragonsoul Sage | ✓ |
| `OP-125/219` | `unl-125-219` | Lunar Boon | ✓ |
| `OP-009/219` | `unl-009-219` | Upstage Comedy | ✓ |
| `OP-041/166` | `ven-041-166` | Riven, Shattered | ✓ |
| `OP-169/219` | `unl-169-219` | Ashe, Focused | ✓ |

**7 of 7.** Fixture 13 asserted `op` as a set prefix, which encodes a false model, and a wrong fixture propagates into every conforming implementation. It is therefore **withdrawn**.

**It is retained with `"withdrawn": true` and its reason, not deleted.** Deleting it would erase the withdrawal from the artifact, leaving the reasoning discoverable only in a superseded document — precisely the failure mode this spec keeps catalogueing. A withdrawn fixture carrying its reason is a **record**; a deleted one is a gap someone re-derives wrongly, and here re-deriving would reinstate the false model that `op` is a set.

## 9. Consumer contract (beyond the grammar)

**A raise on malformed input is necessary but not sufficient.** In the 2026-08-02 incident the damage came *after* resolution: the resolved codes already existed in Holdings, and **merging rather than overwriting** is what saved five cards. Not merging would have written Arena Kingpin as 1 instead of 5 with no error.

> **Any consumer resolving a placeholder or importing a translated code must check for a pre-existing row before writing, and merge rather than overwrite.**

This belongs to the consumer, not the grammar — it is the half of the lesson a fixture cannot encode.

## 10. Derivation principle (from the Crystal Rose finding)

**Any attribute derived from one signal is blind to instances carried by a different signal.** The seed derived `printing_variant` from a trailing parenthetical in the source name; Crystal Rose printings carry none, so all six defaulted to `base` — nothing diverged, no gate fired, the data was wrong and looked fine.

**Variant derivation must cross-check the name parenthetical against the code shape, and a disagreement between them is itself a finding.**

## 11. Validated state as of 2026-08-06

| Check | Result |
|---|---|
| `card_printings` shapes | 1,014 standard · 102 alt-art · 36 signature · 7 rune/token · 6 `sp` = **1,165** ✓ |
| M8 Holdings conformance | **614 / 614 parse**, zero failures |
| Letter suffix **and** asterisk together | **0** in both populations (1,165 and 1,422) |
| `-f`, uppercase, or `pg-` in `card_printings` | **0** on all three |
| Set coverage gap | `card_printings` holds only OGN/OGS/SFD/UNL/VEN; TCGplayer also carries OPP, PR, JDG, SGN, RWB |
| Vendetta Signature printings | **0 exist** — `ven-189*-166` / `ven-191*-166` translate correctly and resolve to nothing (situation C) |
| Fixture 19 round-trip under §4's corrected rule | **holds** for all 16 round-tripping fixtures; all 3 must-raise fixtures still raise |

## 12. Open, not blocking

- **Internal representation of promo printings — deferred to the asset-migration sweep.** `card_printings` holds **zero** promo printings, so nothing resolves today and nothing breaks. It is a real design question: a promo printing shares its collector number with the base printing, so it needs a distinguishing element in a **primary key**, and the options (a variant suffix in the code, a composite key, or a separate promo table) have different costs. Designing it now against seven rows in a spreadsheet would repeat exactly the mistake fixture 13 embodies.
  - **One fragility to carry into that design:** today the TOTAL disambiguates the source set only because all five set totals happen to be distinct (298, 221, 219, 166, 024). **That is a coincidence, not a property.** Any promo model relying on it breaks the first time two sets share a total.
- Set-coverage gap (promo sets absent from `card_printings`) — tracked on the same sweep.
- `tcgplayer_groups` mapping table — owner of the price spine; §5 fixtures and fixture 17b activate once group ids are known.

## 13. Consolidation record

### What v3 replaces

| Document | Status |
|---|---|
| `RiftCore_PrintingCode_Spec_v2_CONSOLIDATED.md` | Superseded, **deleted in the commit that added v3** |
| `RiftCore_PrintingCode_Spec_v2_1_Amendment.md` | Superseded, deleted in the same commit |
| `RiftCore_PrintingCode_Spec_v2_2_Amendment.md` | Superseded, deleted in the same commit |
| v1 and Addenda A/B/C | Superseded by v2; never committed |

**The single diff showing three deletions beside one addition is the record that nothing was dropped.** That is the whole point of the same-commit rule.

### Carry-forward checklist

This spec has **already lost a ruling once** during consolidation — the Crystal Rose ruling (§3a), dropped from v2 and caught by M9 rather than by review. v3 was therefore not consolidated from a reading of the current document; each item below was located in its source document and confirmed present here.

| # | Ruling | Source | In v3 |
|---|---|---|---|
| 1 | Three-part casing rule: uppercase SET, uppercase NUMBER's alphabetic prefix, preserve variant suffix lowercase | v2.2 §1 | §4 |
| 2 | ⚠ `135A` trap note, **subordinated** to the casing rule so the two cannot conflict | v2.2 §5.1 | §4 |
| 3 | `printing_variant = 'special'` for Crystal Rose, two-axis reasoning, revisit trigger — **the one dropped before** | v2.1 §1 | §3a |
| 4 | `OP` is a distribution marker, not a set. Fixture 13 withdrawn, retained with `withdrawn: true` and reason | v2.1 §2 | §8 row 13, §8.4 |
| 5 | **Set codes are data, not grammar** — parser never validates the set component | v2.2 §3 | §3 |
| 6 | Fixture 17 split: 17a executable, 17b deferred on `tcgplayer_groups` | v2.2 §2 | §8 rows 17a/17b, §8.3 |
| 7 | No internal set codes `op` / `opp` / `pr`; `OPP` and `PR` are distribution channels | v2.1 §2 | §5 |
| 8 | Promo printing representation deferred to the asset sweep, incl. the set-total-collision fragility | v2.1 §2 | §12 |
| 9 | Enumerated number prefix `(?:sp\|[rt])?`; unknown prefixes **raise** | v2 §3 | §3 |
| 10 | `TOTAL` = numbering-space total, not set total | v2 §3 | §3 |
| 11 | Three-situation error policy; function strict, caller sets policy | v2 §7 | §7 |
| 12 | No-substitution prohibition | v2 §7 | §7 |
| 13 | `CardCode` / `PrintingCode` as distinct types | v2 §6 | §6 |
| 14 | Consumer contract: check for a pre-existing row and merge, never overwrite | v2 §9 | §9 |
| 15 | Derivation principle: one signal is blind to instances carried by another | v2 §10 | §10 |
| 16 | `PG` → `OGS` alias, input only, TR 601.3.c.1 | v2 §2 | §2 |
| 17 | Count derivation, and both counts reported | 2026-08-06 ruling | §8.1 |

### Related records, referenced rather than absorbed

- **`printing_code_fixtures_FINDINGS.md`** — the closed record of the three findings raised while transcribing §8 into JSON, with Core's resolution against each. Kept as a record; **not folded into this spec**, for the same reason fixture 13 is kept withdrawn rather than deleted.
- **`scripts/verify_printing_code_fixtures.py`** — asserts the fixture file's structural invariants and both counts. It deliberately does **not** implement the translator: §1 rules that a single canonical implementation is impossible, and a reference implementation living next to the fixtures would quietly become one.
