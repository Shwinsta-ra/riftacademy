## Thread/topic: claude-md-code-pointer

**Sections likely affected:** 0 (what to do right now), 1 (conventions), 6 (cross-thread routing), 9 (log)

**Team-facing:**

`CLAUDE.md` now opens with a pointer section, "Read `Code/README.md` in Drive first, every session," directing every Code session to `/Users/ashwinsathe/My Google Drive/Ashwin/Games/Riftbound/RiftAcademy/Code/README.md` before starting work. This closes the last open item that made the new `Code/` system depend on Ashwin remembering to say "check the Code folder" — "start session" only works if Code already knows to look there.

Implemented from `Code/claude-md-pointer/implementation_spec.md` (Drive). The spec's stated blocker — whether a Code session can actually reach Drive at all — resolved to **case 1, access already works**. Evidence: this session read `Code/README.md` (doc id `1R_4mjmZ5PMcOCYwuHx9Fn82gU8742-eEjHGtxB5cD-M`), `claude-md-pointer/implementation_spec.md` (`1j5EKB8OTeK4wMEYBOcOA7nn7S4IASd59U_FcDRUXCqI`), and `claude-md-pointer/_STATUS.md` (`16pzK-OjZWNlDCzYg0KOo2LCGdyqKaGLMiSpwBRzOaOE`) end to end, by reading the local `.gdoc` stubs for their `doc_id` and fetching content through the Google Drive MCP's `read_file_content`. No `decision_request.md` was needed.

The pointer restates none of `Code/README.md`'s mechanics — no status values, no trigger-phrase table, no folder-lifecycle rules — so it doesn't need updating when that file changes. What it does carry is access mechanics, which aren't in `Code/README.md` and which a fresh session can't guess: the files there are Google Docs, so on disk they are `<name>.md.gdoc` JSON stubs. Reading one with `cat` yields a `doc_id`, not content. Code can create plain `.md` files in those folders but has no tool that rewrites an existing Google Doc, which is why status updates get written as plain `.md` alongside the `.gdoc`.

Two traps are recorded in the same section: the Drive root is `Ashwin/`, not `Personal/` (a wrong path that sat in the docs from 2026-08-09 until 2026-08-15), and the `.shortcut-targets-by-id` mount alias must not be used to reach `Code/` — it has served a stale view that omits folders present under the real path, which silently breaks the checkout rule that keeps two sessions off the same work.

**New standing rule or convention worth capturing:**

`CLAUDE.md` does not describe the Cowork/Code handoff system; it points at `Code/README.md` and stops. Anyone tempted to "helpfully" copy the trigger phrases or status values into `CLAUDE.md` should not — the duplication is the failure mode this section is written to avoid.

**Anything another thread working today should know before touching related code:**

1. A ~59-line uncommitted addition to `CLAUDE.md` had been sitting in the shared worktree since roughly 2026-08-09, documenting the retired `Handoffs-Code/` system in full (the `1-Code-Questions/` and `2-Code-Pending Review/` folders, the 4-state model, the never-write-to-`Handoffs-Cowork/` rule) and carrying two more copies of the wrong `Personal/` Drive path. It was never committed on any branch — `origin/integration:CLAUDE.md` contains zero occurrences of "Handoffs-Code". The pm-doc-code-routing session flagged it and left it alone, noting it should be resolved together with this pointer item; this session did that, by discarding it rather than committing detailed routing for a system that no longer exists. Nothing was lost: the diff is preserved at `Code/claude-md-pointer/superseded_claude-md-worktree-diff.patch` in Drive, with a note next to it explaining the reasoning and how to restore it.

2. `CLAUDE.md`'s "Handoff file convention" section still describes the older chat-thread-to-Code model (one instruction file, or an instruction file plus a data/content file). That is at least partly superseded by the `Code/<slug>/` folder model, but rewriting it was outside this spec's scope and left alone deliberately. Worth a Cowork decision on whether it should be narrowed to "attaching data files" or retired outright.

3. `docs/handoffs-code-inbox/` still sits untracked in the working tree. PM.md has called it safe to delete since 2026-08-09 and this session left it alone again, to keep the PR to one file plus this fragment.
