# Findings from transcribing spec v2 §8 into `printing_code_fixtures.json`

**Date:** 2026-08-06 · **Raised by:** Code, during the transcription task
**Against:** `RiftCore_PrintingCode_Spec_v2_CONSOLIDATED.md` as amended by `RiftCore_PrintingCode_Spec_v2_1_Amendment.md`

The task specified: *"Flag any ambiguity in the markdown table rather than resolving it — an ambiguous fixture is a Core finding."* Three are flagged below. **None is resolved in the JSON.** Every fixture value in `printing_code_fixtures.json` is transcribed verbatim from the §8 table; where §8 is ambiguous, the ambiguity is carried forward and marked, not decided.

Transcription was verified mechanically rather than by eye: the §8 table was parsed out of the markdown and every quoted token compared against the JSON. All 22 ids are present and every external/internal pair matches character-for-character.

---

## Finding 1 ⭐ — §4 and fixture 19 are mutually inconsistent for `r` / `t` / `sp` prefixes

**Severity: this one propagates.** It is the exact failure mode §8 exists to prevent, and it is currently *inside* §8.

§4 states, for internal → external:

> uppercase **the set prefix only**; restore `/` before TOTAL when present.

Fixture 19 asserts that external → internal → external equals the input for every fixture except 15, 16 and 17.

Implementing §4 literally and running fixture 19 over the table, **five fixtures fail**:

| # | Fixture's external | §4 as written produces | |
|---|---|---|---|
| 7 | `OP-R06c` | `OP-r06c` | ✗ |
| 8 | `VEN-R01` | `VEN-r01` | ✗ |
| 9 | `VEN-R03a` | `VEN-r03a` | ✗ |
| 10 | `UNL-T01` | `UNL-t01` | ✗ |
| 11 | `VEN-SP1/006` | `VEN-sp1/006` | ✗ |

The other eleven round-tripping fixtures pass. The five failures are exactly the fixtures whose NUMBER carries an `r`, `t` or `sp` prefix — §8 writes those uppercase in the external column, but §4 authorises uppercasing the set prefix and nothing else.

**Why this cannot be patched with a blanket uppercase.** Fixture 5's note is explicit that `ven-135a-166` must render as `VEN-135a/166` and **must not become `135A`**. So the trailing alt-art letter must stay lowercase while the leading `r`/`t`/`sp` prefix uppercases.

**Fixture 9 is the decisive case, and it already contains both.** `VEN-R03a` needs `R` uppercased and `a` left alone, in one code. Any rule stated as "uppercase the set prefix only" or as "uppercase everything except the last character" gets one of these wrong.

**Not resolved here.** Two readings are available and they are not equivalent:

- **(a)** §4 is incomplete and should read *"uppercase the set prefix and the `r`/`t`/`sp` number prefix; never the trailing letter suffix."* Fixtures unchanged.
- **(b)** §8's external column is wrong for those five and should read `VEN-r01`, `UNL-t01`, `VEN-sp1/006`, etc. §4 unchanged.

Reading (b) has an external consequence that reading (a) does not: RuneHoard and the ROI tracker consume the external form, and §4's own `.upper()` warning notes that a mismatched external code fails with **zero rows rather than an error**. Which reading is correct is a Core call about what those consumers actually emit — it is not inferable from the spec text, and this document does not guess.

**Until it is decided,** the two implementations will disagree on rune, token and Crystal Rose codes, and — per fixture 19's own logic — a silently empty join is the symptom.

## Finding 2 — Fixture 17's expected value is unspecified, not merely abbreviated

§8 row 17 reads:

| # | Case | External | Internal |
|---|---|---|---|
| 17 | Dual-face (TCGplayer) | `(group, "T05 // T06")` | `[…t05, …t06]` |

The ellipsis is not shorthand for a value that exists elsewhere in the document. The set prefix resolves from `group_id` through the `tcgplayer_groups(group_id, set_code)` mapping table, and v2 §12 records that table as **not yet built** — *"fixtures for §5 added once group ids are known."*

So fixture 17 is **not executable today**. An implementation can assert the ` // ` split and that a list of two is returned; it cannot assert what the two elements are.

Transcribed verbatim as `["...t05", "...t06"]` and marked `"unresolved": true`. It is deliberately not filled in with a guessed prefix — guessing here would fabricate a passing test for behaviour nobody has specified.

**Ask:** confirm whether fixture 17 should stay in §8 as unexecutable, or move to the §5 fixture set that arrives with the group-id mapping.

## Finding 3 — `OP` remains in §3's set enumeration after v2.1 removed the model that justified it

v2.1 §2 establishes that `OP` is a **distribution marker, not a set** (7 of 7 live holdings carry their original set's collector number and total), withdraws fixture 13 on that basis, and states in §2.3: *"Do not create internal set codes `op`, `opp`, or `pr`."*

Two things in v2 were not updated to match:

1. **§3's grammar still enumerates it:** `SET := 2–4 letters (OGN, OGS, SFD, UNL, VEN, OP; alias PG→OGS)`.
2. **Fixture 7 still carries the internal value `op-r06c`.** v2.1 §2.2 retains fixture 7 but reduces it to *"a lowercasing assertion, marked provisional"* — which leaves an internal value in the table that §2.3 says must not exist as a set code.

v2.1 §3 lists five amendments to fold into v2; **removing `OP` from §3's SET enumeration is not among them.** That looks like an oversight rather than a decision, but it is Core's call, so it is flagged rather than corrected.

The JSON marks fixture 7 `"provisional": true` and records in its note that the `op` prefix model is unresolved and that the internal value must not be read as endorsing `op` as a set.

**No live impact today** — `card_printings` holds zero promo printings, so nothing resolves and nothing breaks. The risk is that an implementer reads §3, sees `OP` enumerated, and hardcodes it.

---

## Also observed, outside this task's scope

`supabase/seed/core_grammar_validation.sql` (committed separately, PR #166) validates against `^([a-z]{2,4})-((?:[rt])?[0-9]+[a-z]?\*?)(?:-([0-9]+))?$` — the pre-`sp` grammar. That is correct for what it was written to do (it predicts the six `ven-sp*-006` codes as failures, which is how the Crystal Rose gap was found), but it is **not** v2 §3's canonical regex, which admits `sp`. Anyone re-running that file expecting a v2 conformance check will read the six failures as a defect rather than as the intended result. Worth a comment on the file when it is next touched.
