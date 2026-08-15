## Thread/topic: claude-md-refactor

**Sections likely affected:** 6 (standing infrastructure rules), 9 (log)

**Customer-facing:**
None — internal documentation refactor, no player-visible change.

**Team-facing:**
Refactor pass on `CLAUDE.md` under the standing authorization in `docs/admin/ADMIN_THREAD_REMIT.md` §8 ("when `CLAUDE.md` starts feeling long or redundant... remove duplication, simplify wording, resolve any rules that now conflict with each other"). **In-place refactor only — no split into separate convention files, no pointer/`@`-import restructure.** That option was measured and explicitly rejected (see below).

All 84 rule markers from the previous version were verified present in the new one by automated string check against `git show HEAD:CLAUDE.md` before commit; no rule was dropped. Net size change is −3.6% (15,239 → 14,683 chars, ~3,809 → ~3,670 tokens), because roughly 360 tokens of deduplication were partly offset by ~220 tokens of *newly added* content resolving two real conflicts.

Structural changes:
- **Merged the two git-identity sections** (`## Git identity` + `## Git identity conflict with platform Stop-hook`) into one `## Git identity` section. Same rules, three paragraphs instead of five.
- **Moved the untested author-vs-committer-email idea out to `docs/design/2026-08-15-git-author-committer-split.md`**, leaving a one-line pointer in `CLAUDE.md`. Ashwin's call: it's a research hypothesis, not a standing rule, so it doesn't need to load into every session's context. The design doc adds what the inline note lacked — an actual reproducible test procedure, and a result-interpretation table so the outcome gets recorded either way rather than re-derived in a few months.
- **Removed a genuine internal duplicate**: "check `docs/updates/pending/` before starting" appeared twice (once under the canonical-doc section, once as a bullet under "What Claude Code should and shouldn't do"). Now stated once, phrased to cover both triggers.
- **Folded `## Fragment verification claims must cite evidence` into the canonical-project-doc section**, where the rest of the fragment rules live.
- **Grouped five scattered delivery-related sections under one `## Deliverables` heading** as subsections: General style, PNG-only UI delivery, Reporting format, Printed-reference style, Deliverable consolidation. Content unchanged; previously these were spread across the file with unrelated sections between them.

Two rule conflicts found and resolved, both verified against the actual CI config rather than the prose:
1. **`hotfix/*` routing.** `CLAUDE.md` showed the pipeline as `hotfix/* → integration` only, but `.github/workflows/enforce-branch-flow.yml` allows `hotfix/*` into `integration`, `staging`, **and** `main` directly. `ADMIN_THREAD_REMIT.md` §6 already had this right; `CLAUDE.md` didn't. Added an explicit allowed-source-per-target table transcribed from the workflow's `case` statement, so the file now matches CI exactly.
2. **`gh` availability.** `CLAUDE.md` said to open PRs "via `gh`" unconditionally, but remote/web Code sessions (Claude Code on the web, Dispatch-triggered) have no `gh` CLI at all and must use the GitHub MCP tools. Reworded to name both paths. This one bit this very session.

Also pulled in one fact from `ADMIN_THREAD_REMIT.md` §6 that `CLAUDE.md` was missing: every branch/PR gets an auto-generated, unindexed Vercel preview URL, which is the default "let me look before it's official" mechanism.

Deliberately **not** deduplicated against `ADMIN_THREAD_REMIT.md` — the git-identity conflict, handoff convention, and deliverable-consolidation rule intentionally remain in both files. Ashwin's explicit call this session: the two documents serve different readers (Code sessions vs. the admin thread) and each should stand alone.

**New standing rule or convention worth capturing:**
None. This pass changed no rules — it only reorganized them and corrected two places where `CLAUDE.md` contradicted the CI config or the environment.

**Anything another thread working today should know before touching related code:**
`CLAUDE.md` section headings changed. If your thread has a saved reference to `## Deliverable style`, `## Printed-reference style`, `## Reporting format preferences`, `## PNG-only UI delivery`, `## Fragment verification claims must cite evidence`, or `## Git identity conflict with platform Stop-hook`, those are no longer top-level headings — they're now subsections under `## Deliverables`, or folded into `## Canonical project doc` / `## Git identity`. The rules themselves are unchanged and all still present.

**Decision recorded — CLAUDE.md stays a single self-contained file (2026-08-15).**
A split into `docs/conventions/*.md` with pointers was proposed and costed before being rejected. The measurements, for anyone who proposes it again:

| Option | Startup tokens | Change vs. today |
|---|---:|---:|
| In-place refactor (chosen) | ~3,670 | −139 |
| Hybrid split (4 task-specific sections moved out) | ~2,860 | −945 |
| Full split via `@`-imports | ~3,850 | **+45** |

Reasons it was rejected, in order of weight:
1. **`@`-imports cannot save context by construction.** Claude Code resolves `@path` imports at session start and inlines the content, so every byte still lands in the startup context — plus the import lines and per-file path markers. It's a small net *increase*.
2. **The savings are inside the noise.** The largest available saving (~945 tokens) is 0.5% of a 200K context window, on content that sits in the prompt-cached prefix. No measurable speed difference.
3. **Plain-path pointers are net-negative for the sessions that need them.** A session doing Riftcodex ingestion would pay back the section's ~284 tokens *plus* tool-call overhead *plus* a full extra model round trip to `Read` the file — worse in both tokens and wall-clock than having it inline.
4. **It re-creates a failure mode this repo has already hit.** Anything moved out of `CLAUDE.md` becomes an opt-in read a session can skip. The PNG-only rule is the documented precedent: it existed in Claude's memory but not in `CLAUDE.md`, and a session missed it and cost a round trip.

At ~128 lines the file is still comfortable to read, which is the actual problem a split would solve. Revisit only if it grows past the point where a session can reasonably skim it — and if so, prefer the hybrid split (move task-specific reference sections, keep every hard rule inline) over a full pointer file.
