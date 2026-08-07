# Findings from transcribing spec v2 §8 into `printing_code_fixtures.json`

**Date raised:** 2026-08-06 · **Raised by:** Code, during the transcription task
**Status: ALL THREE RESOLVED** by `RiftCore_PrintingCode_Spec_v2_2_Amendment.md`, same day.
**Against:** `RiftCore_PrintingCode_Spec_v2_CONSOLIDATED.md` as amended by v2.1 and v2.2

> **Reading this after 2026-08-07:** v2, v2.1 and v2.2 were consolidated into
> **`RiftCore_PrintingCode_Spec_v3.md`** and deleted in the same commit. The `§` citations
> below refer to those documents **as they stood when the findings were raised**, and are
> left unrewritten — a record that silently renumbers itself is not a record. For where each
> ruling lives now, see v3 §13's carry-forward table. Current spec references: Finding 1 →
> v3 §4; Finding 2 → v3 §8 rows 17a/17b; Finding 3 → v3 §3; fixture 13 → v3 §8.4; the
> counting section below → v3 §8.1, which supersedes it (see the note there).

This document is kept rather than deleted now that the findings are closed. Same reasoning Core applied to withdrawn fixture 13 in v2.2 §4: *a record carrying its reason is a record; a deleted one is a gap someone re-derives wrongly.* The resolutions are recorded inline against each finding.

The task specified: *"Flag any ambiguity in the markdown table rather than resolving it — an ambiguous fixture is a Core finding."* Three were flagged and none was resolved unilaterally. Every fixture value in `printing_code_fixtures.json` was transcribed verbatim from the §8 table; transcription was verified mechanically by parsing the table out of the markdown and comparing every quoted token, not by eye.

---

## Finding 1 ⭐ — §4 and fixture 19 are mutually inconsistent for `r` / `t` / `sp` prefixes

### ✅ RESOLVED — v2.2 §1. **§4 was incomplete. §8's external column stands.**

§4 originally read, for internal → external:

> uppercase **the set prefix only**; restore `/` before TOTAL when present.

Fixture 19 asserts that external → internal → external equals the input for every fixture except 15, 16 and 17. Implementing §4 literally and running fixture 19 over the table, **five fixtures failed**:

| # | Fixture's external | §4 as written produced | |
|---|---|---|---|
| 7 | `OP-R06c` | `OP-r06c` | ✗ |
| 8 | `VEN-R01` | `VEN-r01` | ✗ |
| 9 | `VEN-R03a` | `VEN-r03a` | ✗ |
| 10 | `UNL-T01` | `UNL-t01` | ✗ |
| 11 | `VEN-SP1/006` | `VEN-sp1/006` | ✗ |

Exactly the fixtures whose NUMBER carries an `r`, `t` or `sp` prefix. It could not be patched with a blanket uppercase, because fixture 5 requires `135a` to stay lowercase — and **fixture 9 (`VEN-R03a`) contains both cases in one code**, which is why no single blanket rule satisfies it.

**Core's ruling (v2.2 §1).** The corrected internal → external rule:

1. Uppercase the **SET** component.
2. Uppercase the **NUMBER's alphabetic prefix** if present (`r`→`R`, `t`→`T`, `sp`→`SP`).
3. **Preserve the variant suffix letter in lowercase.**
4. Preserve the asterisk verbatim.
5. Insert `/` before TOTAL when a total is present.

External → internal is unchanged (lowercase everything) — which is why only the round-trip assertion caught this.

The principle: the set code and the number prefix both identify a **namespace** (which set, which numbering space — main, rune, token, special); the trailing letter is a **variant discriminator within** that namespace. Core confirmed it against two independent live populations rather than by symmetry alone — M8's 614-row Holdings (`OP-R06c` shows `R` upper and `c` lower in one code) and the 1,422-printing TCGplayer catalogue.

**Verified after the ruling:** the corrected rule was implemented and fixture 19 re-run across the table. It now holds for all 16 round-tripping fixtures, and all three must-raise fixtures still raise. `VEN-R03a` renders correctly.

**Core recorded its own error** (v2.2 §1): §4 was written while warning against the `135A` trap and over-corrected — *"guarding against uppercasing too much produced a rule that uppercases too little."* The ⚠ warning and the rule it accompanied pulled in opposite directions.

## Finding 2 — Fixture 17's expected value is unspecified, not merely abbreviated

### ✅ RESOLVED — v2.2 §2. **Split; the testable half stays in §8.**

§8 row 17's internal column read `[…t05, …t06]`. The ellipsis was not shorthand for a value stated elsewhere — the set prefix resolves from `group_id` through the `tcgplayer_groups` mapping table, which v2 §12 records as not yet built. The fixture was therefore not executable, and it was transcribed verbatim and marked unresolved rather than filled in with a guessed prefix.

**Core's ruling.** An unexecutable fixture makes §8's binding rule (*"no implementation ships without passing §8 verbatim"*) unsatisfiable, which weakens it for every other fixture. But only the second half needs the group mapping:

- **17a — splitting.** In §8, **executable now.** Input `"T05 // T06"` returns `["T05", "T06"]`. Asserts the ` // ` split and that one product yields a list rather than a parse failure.
- **17b — full translation.** **Deferred**, `blocked_on: tcgplayer_groups`. `(group_id, "T05 // T06")` → `["unl-t05", "unl-t06"]`. Activates when the group mapping lands.

Same treatment for any future fixture requiring the group mapping. The harness must skip 17b and **report the skip**, never count it as a pass.

## Finding 3 — `OP` remains in §3's set enumeration after v2.1 removed the model that justified it

### ✅ RESOLVED — v2.2 §3, and the fix is broader than the finding.

v2.1 §2 established `OP` as a distribution marker rather than a set, withdrew fixture 13 on that basis, and forbade creating internal set codes `op`/`opp`/`pr` — but §3 still enumerated `OP` among known sets, and v2.1's fold-in list did not mention removing it.

**Core removed it, and went further:**

> **Set codes are data, not grammar.** The parser accepts any 2–4 letter set component. Whether that set exists is answered by the join, not by the regex — a well-formed code for an unknown set is **situation C** (a data gap), not situation A (malformed).

This is the more valuable half. It keeps fixture 7 (`OP-R06c`) valid as a lowercasing and suffix-range assertion even though `op` is not a sanctioned internal set, and it prevents the enumeration from silently hardening into a validator during implementation — which is how this leftover would have caused a real failure rather than a documentation inconsistency.

**Note for implementers:** fixture 22 (`VEN-ZZ1/006` must raise) is an unknown **NUMBER prefix** check, not a set check. Under this ruling an unknown *set* must NOT raise.

## Fixture 13 representation — Code's reading confirmed

Fixture 13 was kept in the file marked `"withdrawn": true` rather than deleted, against v2.1's literal instruction to *"remove it from §8."* v2.2 §4 confirms this and records that Core's original instruction was worse: deleting the fixture would erase the withdrawal from the artifact, leaving the reasoning discoverable only in a superseded amendment — the exact failure mode of *"consolidation is where rulings disappear silently."* Re-deriving it would reinstate the false model that `op` is a set.

Core's required inline `reason` field has been added verbatim.

---

## Counting, recorded so it is not re-derived differently

### ✅ RESOLVED — Core ruling 2026-08-07, now **v3 §8.1**, which supersedes this section.

The reading below was **confirmed**: the meta-assertion is excluded from the fixture count, on the merits — fixture 19 has no external/internal pair, so it is a property assertion *over* the other fixtures rather than a data fixture. The derivation stands as recorded.

Core also recorded that v2.2 §5.5's own arithmetic was wrong and reached the right figure by coincidence: it used 22 as the base — the **pre-split** count — having forgotten that splitting 17 adds an entry. The derivation below was reverse-engineered as a coherent rationale for a carelessly produced number, and it is the correct one.

**One addition, because "20" alone is misleading** — it invites the reading *"the harness runs 20 things,"* when it runs 21. v3 §8.1 requires both figures be reported: **20 executable data fixtures** and **21 harness assertions today** (20 data + 1 meta). Both are now asserted programmatically by `scripts/verify_printing_code_fixtures.py`, which recomputes them from the fixtures array rather than trusting the recorded block.

The original reading, retained:

v2.2 §5.5 states **21 executable, 20 executable today.** That reconciles only if the meta-assertion is excluded from the fixture count, which is not stated explicitly:

| | |
|---|---|
| Entries in the file | 23 (ids 1–22, with 17 split into 17a and 17b) |
| minus the meta-assertion (19) | 22 data fixtures |
| minus withdrawn (13) | **21 executable** |
| minus deferred (17b) | **20 executable today** |

Matches v2.2 §5.5 exactly under that reading. The derivation is recorded in the JSON's `counts.derivation` field so a future reader does not arrive at 21 or 22 by counting differently.

## One representation choice, flagged for confirmation

### ✅ RESOLVED — Core ruling 2026-08-07, now **v3 §8.2**. `(id, part)` **confirmed; keep it.**

The type argument below was accepted as the smaller half of the reasoning. **The larger half: fixture ids must stay traceable to §8's numbering**, because that is how a human cross-references a failing test against the specification. Renumbering 1–23 would break that traceability; literal string ids preserve it but impose a `number | string` union on every loader for the sake of two entries. `(id, part)` preserves both properties.

**One addition:** human-facing output derives a **display key** — `str(id) + (part or "")`, giving `"5"`, `"17a"`, `"17b"` — for test names and reports, so reports read naturally while the key stays typed. Uniqueness is asserted on `(id, part)`; the display form is presentation only and is never a key. Recorded in the JSON's `harness_rules` and asserted by `scripts/verify_printing_code_fixtures.py`.

The original flag, retained:

Splitting fixture 17 into `17a` and `17b` needs a unique key. Rather than making `id` a string for two entries and an integer for the other 21 — awkward for a typed TypeScript loader — the file keys fixtures on **`(id, part)`**, where `part` is absent everywhere except `(17, "a")` and `(17, "b")`. Recorded in the JSON's `harness_rules`. Say if Core would rather have literal string ids `"17a"` / `"17b"`.

## Also observed, outside this task's scope

`supabase/seed/core_grammar_validation.sql` validates against `^([a-z]{2,4})-((?:[rt])?[0-9]+[a-z]?\*?)(?:-([0-9]+))?$` — the pre-`sp` grammar. That is correct for what it was written to do (it predicts the six `ven-sp*-006` codes as failures, which is how the Crystal Rose gap was found), but it is **not** v2 §3's canonical regex, which admits `sp`. Anyone re-running that file expecting a v2 conformance check will read the six failures as a defect rather than as the intended result. Worth a comment on the file when it is next touched.
