## Thread/topic: core-spec-commit

**Sections likely affected:** 6 (standing rules), 9 (log)

**Team-facing:**

Core's cross-module specs had no version-controlled home — they existed only as thread attachments, invisible to anyone starting from a fresh zip and undiffable. This creates `docs/contracts/` and commits what was available.

New directory `docs/contracts/`, for **published contracts with conformance obligations on other modules**. This is distinct from `docs/design/`, which holds Core's internal design. The distinction is not filing tidiness: a contract has someone on the other side who must comply.

| File | Where |
|---|---|
| `RiftCore_PrintingCode_Spec_v2_CONSOLIDATED.md` | `docs/contracts/` |
| `RiftCore_PrintingCode_Spec_v2_1_Amendment.md` | `docs/contracts/` |
| `RiftCore_to_M9_ChangeDetection_Requirements_2026-08-06.md` | `docs/contracts/` |
| `RiftCore_to_M9_ChangeDetection_Answers_2026-08-06.md` | `docs/contracts/` |
| `RiftCore_to_M9_Supabase_DDL_AUDITED_FINAL.md` | `docs/contracts/` |
| `printing_code_fixtures.json` | `docs/contracts/` — new, see below |
| `printing_code_fixtures_FINDINGS.md` | `docs/contracts/` — new, see below |
| `RiftAcademy_Rules_Questions_Register.md` | `docs/rules/` |
| `RiftCore_to_M8_M9_v2_Acceptance_Notes_2026-08-06.md` | `docs/design/riftcore-v2/` |
| `RiftCore_to_M9_Reply_Adjudication_2026-08-05.md` | `docs/design/riftcore-v2/` |
| `RiftCore_to_M9_DDL_Signoff_2026-08-05.md` | `docs/design/riftcore-v2/` |
| `RiftCore_to_M9_DryRun_Adjudication_2026-08-05.md` | `docs/design/riftcore-v2/` |
| `RiftCore_to_M9_MasterInventory_Adjudication_2026-08-05.md` | `docs/design/riftcore-v2/` |

**The Rules Questions Register is the one that matters most going forward.** It is a *persistent, accumulating* record, not a point-in-time document: four entries so far (Q-001 to Q-004), all `CR-CLEAR`, all pending judge confirmation, each carrying its CR citation and a "downstream impact if corrected" note. It had been uncommitted since 2026-08-04. New rules questions append to it, and a `JUDGE-CORRECTED` status is the signal to check what was built on the old answer — so it needs to live in git, where that history is visible, rather than in a thread.

Superseded printing-code documents (v1, Addenda A/B/C) are deliberately **not** committed. v2 states what it supersedes; committing dead documents adds noise without adding recoverability.

**The fixtures are now machine-readable.** Spec v2 §8 says *"no implementation ships without passing §8 verbatim,"* but §8 was a prose instruction against a markdown table, so each of the two required implementations (Python for M9 ingest, TypeScript for app/kernel) had to transcribe 22 fixtures by hand — a transcription step that can drift, in a document whose entire purpose is preventing drift. `printing_code_fixtures.json` holds all 22 (13 marked withdrawn per v2.1, not deleted, so the withdrawal stays visible). Both implementations should **load this file** rather than retranscribe the table, which makes "passes the fixtures verbatim" mechanically true instead of a promise.

Transcription was verified by parsing the §8 table out of the markdown and comparing every quoted token against the JSON, not by eye. All 22 ids present, every external/internal pair matching character-for-character.

**Three ambiguities found in §8, flagged rather than resolved — and all three ruled on by Core the same day** in `RiftCore_PrintingCode_Spec_v2_2_Amendment.md`, also committed here. `printing_code_fixtures_FINDINGS.md` is kept as a closed record with each resolution inline.

1. **⭐ §4 and fixture 19 were mutually inconsistent — BLOCKING, now resolved.** §4 said internal→external should "uppercase the set prefix only"; fixture 19 asserts external→internal→external equals the input. Implementing §4 literally and running fixture 19 over the table failed **five fixtures** — 7, 8, 9, 10, 11, exactly those whose NUMBER carries an `r`, `t` or `sp` prefix. No blanket uppercase resolves it, because fixture 5 requires `135a` to stay lowercase and fixture 9 (`VEN-R03a`) contains both cases in one code. **Core ruled: §4 was incomplete, §8's external column stands.** The corrected rule uppercases the set component *and* the number's alphabetic prefix (`r`→`R`, `t`→`T`, `sp`→`SP`) while preserving the variant suffix in lowercase — the set and number prefix identify a namespace, the trailing letter is a variant discriminator within it. Core confirmed against two independent live populations. Re-verified after the ruling: fixture 19 now holds for all 16 round-tripping fixtures, all 3 must-raise fixtures still raise.
2. **Fixture 17's expected value was unspecified, not abbreviated.** **Core ruled: split it.** `17a` (the ` // ` split, executable now) stays in §8; `17b` (full translation) is deferred with `blocked_on: tcgplayer_groups`. An unexecutable fixture makes §8's "no implementation ships without passing §8 verbatim" unsatisfiable, which weakens it for every other fixture.
3. **`OP` remained in §3's set enumeration** after v2.1 established it is a distribution marker. **Core removed it and went further:** *set codes are data, not grammar* — the parser must not validate the set component at all. A well-formed code for an unknown set is a data gap (situation C), not malformed (situation A). That is the more valuable half: it stops the enumeration silently hardening into a validator during implementation.

**Fixture 13's representation was confirmed.** It was kept marked `"withdrawn": true` rather than deleted, against v2.1's literal instruction to remove it. v2.2 §4 confirms this and records that Core's original instruction was worse — deleting it would erase the withdrawal from the artifact, the exact failure mode of "consolidation is where rulings disappear silently," and re-deriving it would reinstate the false model that `op` is a set.

**New standing rule or convention worth capturing:**

Added to `CLAUDE.md`: *analytical and specification documents are committed, not circulated* — same session they are produced, `docs/contracts/` for cross-module contracts, `docs/design/` for internal design and decision records, `docs/rules/` for rules-derived reference. And: **when a document supersedes others, the superseding commit must delete them in the same commit,** because the diff is the record that nothing was dropped. This exists because consolidating five Core documents into v2 on 2026-08-06 dropped a ruling that had already been made, and M9 caught it rather than review.

**Anything another thread working today should know before touching related code:**

- **All twelve documents are now committed.** Six were missing on the first pass and were supplied by Core the same day; a second pass added them before this PR merged. Nothing is outstanding.
- Anyone building a printing-code translator: **implement from v2 as amended by v2.1 AND v2.2, and load `printing_code_fixtures.json` rather than retranscribing the table.** The blocker is cleared, so both implementations may proceed. Three harness obligations: skip `"withdrawn": true` fixtures, skip `"deferred": true` fixtures *and report the skip* rather than counting a pass, and do not validate set codes against any enumeration.
- **The generalisable lesson, and the reason this was worth doing.** The §4 defect survived review by M8, M9 and Core across five document versions. It was caught within one session of the fixtures becoming machine-readable, by executing a round-trip assertion that had until then existed only as a sentence in a table. Core's framing: *a conformance rule that cannot be executed is a statement of intent.* Worth applying wherever else a spec asserts conformance in prose.
