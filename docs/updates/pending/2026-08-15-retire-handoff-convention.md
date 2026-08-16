## Thread/topic: retire-handoff-convention

**Sections likely affected:** 1 (conventions), 6 (cross-thread routing), 9 (log)

**Team-facing:**

Two cleanups, both decided by Ashwin on 2026-08-15 in the claude-md-pointer session, following on from that session's flagged findings.

**1. `CLAUDE.md`'s "Handoff file convention" section is retired**, deleted outright rather than narrowed. It described the pre-`Code/` model: Ashwin hands a task from a chat thread to a Code session as a single markdown instruction file, or as an instruction file plus a separate data/content file it names. That model is fully superseded by the `Code/<slug>/` folder system — a Cowork thread now writes a self-contained feature folder with an `implementation_spec.md` and a `_STATUS.md`, and Code picks it up on "start session". Nothing routes through attached chat files any more, so the section described a path that no longer exists. `CLAUDE.md`'s pointer section (added the same day) plus `Code/README.md` are now the whole story on how work reaches Code.

**2. `docs/handoffs-code-inbox/` is deleted.** PM.md had called it safe to delete since 2026-08-09, on the stated grounds that Drive held the canonical copies. That turned out to be only partly true, so it was checked before deleting rather than taken on trust:

- The tree was untracked, and `git log --all -- docs/handoffs-code-inbox` returns zero commits. It was never in git history on any branch, so deletion was not recoverable from the repo.
- `CODE_HANDOFF_2026-08-08_price-ingest-github-actions.md` and `AUDIT_LOG.md` had **no** counterpart in Drive's `Archive - Handoffs-Code/` at all.
- `handoff_code-to-ashwin_2026-08-08_supabase-seed-and-schema-decisions.md` had a Drive counterpart, but a **different** one — the Drive version is the State-2 request with Ashwin's inline answers, while the repo version is Code's later post-answer outcomes table. Neither contains the other.

All three were copied into `Archive - Handoffs-Code/` and verified byte-identical with `cmp` before the tree was removed: the price-ingest handoff into `0-Cowork-Instructions-for-Code/`, `AUDIT_LOG.md` as `AUDIT_LOG_from-retired-repo-inbox.md` at the archive root, and the supabase-seed outcomes version as `..._code-outcome-summary.md` in `3-Code-Approved/` alongside the existing request version.

**New standing rule or convention worth capturing:**

"The Drive copies are canonical, safe to delete the repo originals" was recorded in PM.md as settled fact and was wrong for two of three files. Before deleting anything on the strength of a note saying a copy exists elsewhere, confirm the copy exists and matches. A `cmp` is cheap; the files here were never in git history, so a wrong assumption would have been unrecoverable.

**Anything another thread working today should know before touching related code:**

Ashwin also decided that Cowork should author `_STATUS.md` in `Code/<slug>/` folders as a **plain `.md`, not a Google Doc**. Code can read Google Docs but has no tool that rewrites one, so every Code status update currently lands as a plain `.md` next to a `.gdoc` still showing the stale status — two files, one name, divergent contents, in both completed feature folders so far. That change is Cowork-side and not actionable in this repo; it is recorded here only so the reconciler and any thread reading PM.md sees it. It needs writing into `Admin_Decisions.md` by an Admin thread — Code deliberately does not append to that doc.
