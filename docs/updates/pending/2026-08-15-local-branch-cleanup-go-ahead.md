## Thread/topic: local-branch-cleanup-go-ahead

**Sections likely affected:** 6 (standing rules/conventions), 9 (log)

**Team-facing:**

Follow-up to the branch-deletion rule narrowed earlier today (PR #240). That change let Claude delete **remote** branches verified promoted to `staging`, but left a gap: the harness still denies local-ref deletion, so the rule promised something a session couldn't actually do.

`CLAUDE.md` now says explicitly that deleting a **local** branch ref needs Ashwin's go-ahead in the session, every time. Three parts:

1. **The deny rule is deliberate.** `Bash(git branch -d:*)` and `Bash(git branch -D:*)` are in the `deny` list in `.claude/settings.json` and are staying there — Ashwin's decision, made after seeing the gap. Remote deletion is unaffected: `git push origin --delete` matches the `ask` rule and works normally.

2. **Don't route around it unprompted.** `git update-ref -d refs/heads/<name>` deletes the same ref through git's plumbing and doesn't match the denied pattern. It's named in the rule specifically so nobody "discovers" it and quietly treats the guard as decorative. If Ashwin authorises a one-off, state which command is being used and why it differs from the denied one *before* running it, per the existing security-sensitive-command rule.

3. **Ask when the PR is promoted, not in a cleanup sweep later.** The moment a PR reaches `staging`, its local branch is redundant — that's the point to ask, with verification already done and the SHA recorded. One line in a message Ashwin is already reading.

**Why part 3 is the substantive half:** the alternative is what this repo actually did. Sixteen dead local refs accumulated before anyone noticed, and clearing them needed a dedicated task. One (`fix/config-toml-seed-path`) looked like unmerged work and had to be diffed against a merged twin (`93eab61`, PR #196) before it could be cleared — the two were byte-identical on `supabase/README.md` and `supabase/config.toml`, differing only in a since-reconciled fragment. That verification is cheap the day the PR merges and expensive a week later.

The rule also warns against batch-deleting on the `[gone]` remote marker alone: a gone remote usually means merged, but not always, and it's exactly the shortcut that would have deleted `fix/config-toml-seed-path` without anyone checking.

**New standing rule or convention worth capturing:**

Yes — amends the "What Claude Code should and shouldn't do" list, and is a behavioural expectation (ask proactively at promotion time), not just a prohibition.

**Anything another thread working today should know before touching related code:**

The repo was swept clean on 2026-08-15: all remote work branches gone, all stale local refs gone. Nineteen branches total (3 remote, 16 local), every one verified present in `staging` first, SHAs recorded in-session for recovery. Starting state is now pipeline branches only, so any local ref accumulating from here is new and should be raised at promotion time under this rule rather than left to a future sweep.
