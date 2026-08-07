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
| `printing_code_fixtures.json` | `docs/contracts/` — new, see below |
| `printing_code_fixtures_FINDINGS.md` | `docs/contracts/` — new, see below |
| `RiftCore_to_M8_M9_v2_Acceptance_Notes_2026-08-06.md` | `docs/design/riftcore-v2/` |

Superseded printing-code documents (v1, Addenda A/B/C) are deliberately **not** committed. v2 states what it supersedes; committing dead documents adds noise without adding recoverability.

**The fixtures are now machine-readable.** Spec v2 §8 says *"no implementation ships without passing §8 verbatim,"* but §8 was a prose instruction against a markdown table, so each of the two required implementations (Python for M9 ingest, TypeScript for app/kernel) had to transcribe 22 fixtures by hand — a transcription step that can drift, in a document whose entire purpose is preventing drift. `printing_code_fixtures.json` holds all 22 (13 marked withdrawn per v2.1, not deleted, so the withdrawal stays visible). Both implementations should **load this file** rather than retranscribe the table, which makes "passes the fixtures verbatim" mechanically true instead of a promise.

Transcription was verified by parsing the §8 table out of the markdown and comparing every quoted token against the JSON, not by eye. All 22 ids present, every external/internal pair matching character-for-character.

**Three ambiguities found in §8 and flagged rather than resolved,** in `printing_code_fixtures_FINDINGS.md`:

1. **⭐ §4 and fixture 19 are mutually inconsistent.** §4 says internal→external should "uppercase the set prefix only"; fixture 19 asserts external→internal→external equals the input. Implementing §4 literally and running fixture 19 over the table fails **five fixtures** — 7, 8, 9, 10, 11, exactly those whose NUMBER carries an `r`, `t` or `sp` prefix. It cannot be patched with a blanket uppercase, because fixture 5 requires `135a` to stay lowercase. Fixture 9 (`VEN-R03a`) contains both cases in one code and is the decisive example. Two readings are available and they are not equivalent; the choice is a Core call.
2. **Fixture 17's expected value is unspecified, not abbreviated.** The ellipsis in `[…t05, …t06]` resolves from the `tcgplayer_groups` mapping table, which v2 §12 records as not yet built. Transcribed verbatim and marked unresolved rather than filled in with a guessed prefix.
3. **`OP` remains in §3's set enumeration** after v2.1 §2.3 established it is a distribution marker and forbade creating an internal `op` set code. v2.1's fold-in list does not mention removing it from §3.

**New standing rule or convention worth capturing:**

Added to `CLAUDE.md`: *analytical and specification documents are committed, not circulated* — same session they are produced, `docs/contracts/` for cross-module contracts, `docs/design/` for internal design and decision records, `docs/rules/` for rules-derived reference. And: **when a document supersedes others, the superseding commit must delete them in the same commit,** because the diff is the record that nothing was dropped. This exists because consolidating five Core documents into v2 on 2026-08-06 dropped a ruling that had already been made, and M9 caught it rather than review.

**Anything another thread working today should know before touching related code:**

- **Six required documents could not be committed — they are not on this machine.** `RiftCore_to_M9_Supabase_DDL_AUDITED_FINAL.md`, `RiftAcademy_Rules_Questions_Register.md` (flagged uncommitted since 2026-08-04), and four 2026-08-05 adjudication records: `RiftCore_to_M9_Reply_Adjudication`, `RiftCore_to_M9_DDL_Signoff`, `RiftCore_to_M9_DryRun_Adjudication`, `RiftCore_to_M9_MasterInventory_Adjudication`. Searched `~/Downloads` and the whole repo working tree; none present under those names. They need a second pass once the files are supplied.
- Anyone building a printing-code translator: **read `printing_code_fixtures_FINDINGS.md` before implementing.** Finding 1 will make the Python and TypeScript implementations disagree on rune, token and Crystal Rose codes until Core rules on it, and per §4's own warning the symptom is a silently empty join rather than an error.
