## Thread/topic: core-spec-v3-consolidation

**Sections likely affected:** 6 (standing rules), 9 (log)

**Team-facing:**

Core confirmed the three items PR #167 flagged for ruling, and instructed consolidation to v3 once #167 and #168 merged. Both merged into `integration` on 2026-08-07 (verified: `mcp__github__pull_request_read` reports `merged: true`, `merged_at: 2026-08-07T15:52:03Z` for #167 and `15:53:58Z` for #168), so this PR does the consolidation.

### `docs/contracts/RiftCore_PrintingCode_Spec_v3.md` replaces three documents

`v2_CONSOLIDATED`, `v2_1_Amendment` and `v2_2_Amendment` are **deleted in the same commit that adds v3**, per the standing rule added in #167. Three deletions beside one addition in a single diff is the record that nothing was dropped — that is the whole point of the rule.

**Section numbering is deliberately unchanged from v2.** `§3a` is inserted rather than renumbering `§4` onward, so existing `§n` cross-references in the fixtures JSON, in M8's and M9's threads, and in `printing_code_fixtures_FINDINGS.md` still resolve.

**Carry-forward was verified mechanically, not from memory.** This spec has already lost a ruling once during consolidation — the Crystal Rose ruling, dropped from v2, caught by M9 rather than by review. Core supplied a 17-item checklist; each item was checked by grepping v3 for a distinguishing phrase drawn from the **source** document, so v3's own §13 table claiming an item is present cannot satisfy the check. All 17 pass. Separately, a line-level diff of v2 against v3 surfaced 21 differing lines, each confirmed to be an intended amendment (the `OP` enumeration removal, the §4 casing rewrite, the ⚠ note's subordination, the fixture-13 withdrawal, the 17a/17b split, and the §12 promo deferral), with every v2 section title surviving.

### The three confirmations

1. **Count derivation — confirmed, and both counts are now reported.** Core confirmed the meta-assertion (fixture 19) is excluded from the fixture count on the merits: it has no external/internal pair, so it is a property assertion *over* the other fixtures. Core also recorded that v2.2 §5.5's arithmetic was wrong and hit the right figure by coincidence — it used 22 as the base, the pre-split count, having forgotten that splitting 17 adds an entry. **"20" alone is misleading**, because it reads as "the harness runs 20 things" when it runs 21. v3 §8.1 now requires both: **20 executable data fixtures** and **21 harness assertions today** (20 data + 1 meta).
2. **`(id, part)` composite key — confirmed, keep it.** The type argument was the smaller half; the larger half is that **fixture ids must stay traceable to §8's numbering**, which is how a human cross-references a failing test against the spec. Added: a derived **display key** (`str(id) + (part or "")` → `"5"`, `"17a"`, `"17b"`) for test names and reports. Uniqueness is asserted on `(id, part)`; the display form is presentation only and is never a key.
3. **`CAPTURE_ALL_SUB_TYPES` — deleted from `scripts/ingest_tcgcsv.py`.** It was referenced nowhere; setting it `False` changed nothing. Core's ruling: a control that silently controls nothing is worse than no control, and this project has now catalogued that failure class five times. Deleted rather than wired, because capturing every subtype is the decided behaviour and a toggle implies a supported off-state that was never designed. A comment records what was removed and why, so it is not resurrected.

### New: `scripts/verify_printing_code_fixtures.py`

Core said *"assert both programmatically."* A count recorded as prose beside the data it describes is a claim, not a count — which is exactly how v2.2 §5.5 published a right answer from wrong arithmetic. The script **recomputes every count from the fixtures array** rather than trusting the recorded block, and also asserts `(id, part)` uniqueness, display-key derivation, that withdrawn fixtures carry a reason and deferred ones carry `blocked_on`, and that no live pointer to a deleted document survives. **30 checks, all passing.**

It deliberately does **not** implement the translator. v3 §1 rules that a single canonical implementation is impossible (Python for M9 ingest, TypeScript for app/kernel), and a reference implementation sitting next to the fixtures would quietly become one. Round-trip conformance stays each implementation's own job, loading the same JSON.

**New standing rule or convention worth capturing:**

Nothing new — this PR *applies* two rules added in #167 (specs are committed not circulated; a superseding document deletes what it supersedes in the same commit) rather than adding any. Worth noting that both earned their keep on first use: the same-commit rule is what makes this consolidation reviewable, and the 17-item checklist is what stopped it repeating the Crystal Rose loss.

**Anything another thread working today should know before touching related code:**

- **Implement from `RiftCore_PrintingCode_Spec_v3.md` only.** v2, v2.1 and v2.2 no longer exist; any thread holding a link or a `§` reference to them should re-resolve it against v3 §13's carry-forward table. Section numbers 1–12 are unchanged, so most references still land correctly.
- `printing_code_fixtures.json` is now `"version": "3"` and its `source` points at v3. **No fixture data changed** — the edits are provenance, the expanded `counts` block, and two new harness rules (display key, report both counts). An implementation already loading the file needs no change.
- `printing_code_fixtures_FINDINGS.md` stays as a closed record and is **referenced by v3, not absorbed into it** — same reasoning as keeping fixture 13 withdrawn rather than deleted. Its `§` citations point at the deleted documents *as they stood when the findings were raised* and are deliberately left unrewritten; a header note maps each to its current v3 location.
- **`scripts/ingest_tcgcsv.py` is M9's file.** Core flagged the boundary explicitly when ruling on `CAPTURE_ALL_SUB_TYPES`: Core is ruling on the correctness hazard, not claiming the file, and M9's objection wins on anything implementation-shaped. The change is a deletion plus a comment, no behaviour change — the script still compiles and every subtype is still captured.
- Still open, unchanged and not touched here: `supabase/seed/core_grammar_validation.sql` validates against the pre-`sp` grammar, so a reader re-running it as a v3 conformance check will read its six intended `ven-sp*-006` failures as a defect. Worth a comment on that file when it is next touched.
