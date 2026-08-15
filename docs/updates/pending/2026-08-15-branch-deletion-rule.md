## Thread/topic: branch-deletion-rule

**Sections likely affected:** 6 (standing rules/conventions), 9 (log)

**Team-facing:**

The blanket `CLAUDE.md` rule "Never delete branches — surface the diff to Ashwin rather than acting on it" is narrowed, at Ashwin's direction. Claude may now delete a **`feature/*` or `fix/*`** branch once its work is verified fully promoted to `staging`. Those two prefixes only; `hotfix/*`, `claude/*`, and anything unverified stay under the old surface-don't-act behaviour, and protected branches (`integration`, `beta`, `staging`, `main`) are never deletable.

Three conditions, all required: no open PR, work present in `staging`, and the tip SHA recorded in the response before deleting — `git push origin <sha>:refs/heads/<name>` restores a deleted branch, which is what keeps this reversible rather than destructive.

**Why the rule now specifies *how* to verify:** the obvious check is wrong on its own, and this was found the hard way while cleaning up three branches today.

- `git branch -r --merged origin/staging` only finds branches that are literal ancestors. It **misses squash merges**, which is how most of this repo's PRs land. Two of the three branches cleaned up today did not appear in its output despite being fully promoted.
- `git cherry origin/staging origin/<branch>` compares per-commit patch IDs, so it catches the squash case — but it answers "does this branch add commits" and not "does `staging` have every file". A branch that has fallen behind `staging` can report clean while still holding a file `staging` lacks.
- `git diff origin/staging...origin/<branch>` (three-dot) is actively misleading here: with multiple merge bases it silently picks one and warns, and it reports what the branch changed since divergence, not what is missing from `staging`. It read as "181 insertions of unmerged work" on a branch that had none.

The rule now requires both checks plus a `comm -13` file-presence comparison, and says to surface rather than delete when they disagree.

**Gotcha worth keeping:** a `docs/updates/pending/` fragment present on a branch but absent from `staging` is the *expected* end state, not evidence of lost work — reconciliation folds fragments into the master doc and deletes them. Check which pass folded it (the master doc header names them) before treating it as unmerged.

**New standing rule or convention worth capturing:**

Yes — this is a direct amendment to the "What Claude Code should and shouldn't do" list in `CLAUDE.md`, and adds an explicit "never delete or force-push a protected branch" line that was previously only implied.

**Anything another thread working today should know before touching related code:**

Three remote branches were deleted today under the new rule, all verified fully promoted to `staging` with no open PRs. SHAs recorded for recovery:

| Branch | Tip SHA | Evidence it was promoted |
|---|---|---|
| `claude/tcgcsv-run-failure-otgpyh` | `d64d0b12d93b2b247d4a52d04f0f09d64b27b732` | Ancestor of `staging`, `beta`, and `main` |
| `fix/price-ingest-observability` | `c15335982d302def63688d47fbd3dfea31d30be6` | Only unique commit was a `Merge main into branch` with no original work |
| `claude/md-pointer-tw5fue` | `078b5d962454deebc19555e29df33c5715222629` | Both commits patch-equivalent in `staging`; superseded by PR #229, which added rules the branch lacked |

`claude/md-pointer-tw5fue` is a `claude/*` branch, which the narrowed rule would not normally permit deleting — it was included on Ashwin's explicit instruction in that same conversation, not by the rule.

Also note: the shared worktree at `/Users/ashwinsathe/Projects/riftacademy` was left with an uncommitted `CLAUDE.md` diff on `fix/pm-doc-code-routing`, a branch whose remote is already deleted. That diff re-adds rules `integration` already carries and appears superseded. It was deliberately left untouched — this change was made in a separate worktree to avoid disturbing it. Worth someone confirming it can be discarded.
