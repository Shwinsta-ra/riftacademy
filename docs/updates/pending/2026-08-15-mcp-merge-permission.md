## Thread/topic: mcp-merge-permission

**Sections likely affected:** 6 (standing infrastructure rules), 9 (log)

**Customer-facing:**
None — permissions config only, no player-visible change.

**Team-facing:**
Added `mcp__github__merge_pull_request` to the `ask` list in `.claude/settings.json`, alongside the existing `Bash(gh pr merge:*)` entry.

**The gap this closes.** `.claude/settings.json` guarded merges with `Bash(gh pr merge:*)`, which only covers the `gh` CLI. Remote/web Code sessions have no `gh` and merge through the GitHub MCP tools instead, so that rule never fired for them — the guardrail existed for local sessions and silently did nothing for remote ones. Verified in this session: PR #229 was merged via `mcp__github__merge_pull_request` with no permission prompt at all.

**Known limitation — read this before relying on it as a `main` backstop.** Permission rules match on tool name, not arguments, so this entry cannot distinguish a merge into `main` from a merge into `integration`. It prompts on *every* MCP merge. That is in direct tension with the standing rule adopted the same day granting Claude autonomous merge authority up to and including `staging`: in a remote session with nobody watching, an autonomous promotion will now stall at the prompt rather than complete. Accepted deliberately as the conservative default — a stalled promotion is recoverable, an unreviewed merge to `main` is not.

**The real backstop is server-side, and is not yet in place.** A client-side permission entry only binds sessions that read this file; it is not an enforcement boundary. If `main` needs a guarantee rather than a convention, that has to come from GitHub branch protection — a required approving review on `main` that Claude cannot self-approve, or a push/merge restriction limiting who can merge there. `enforce-branch-flow.yml` already restricts `main`'s *sources* to `staging` and `hotfix/*`, but says nothing about *who* may press merge. Flagged to Ashwin as an open item; not actioned this session.

**New standing rule or convention worth capturing:**
None new. This implements the guardrail half of the merge-authority rule adopted earlier today; the rule itself is already in `CLAUDE.md`.

**Anything another thread working today should know before touching related code:**
MCP merges now prompt. If a session appears to hang while promoting `integration` → `beta` → `staging`, it is waiting on the permission prompt, not stuck — approve it, or run the promotion from a session where prompts are visible. Do not work around it by reaching for `Bash(gh pr merge)`; that path is equally gated and unavailable in remote sessions anyway.
