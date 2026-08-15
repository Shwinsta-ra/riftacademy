# `main` branch protection — decision and implementation spec

**Status:** decided 2026-08-15 (Ashwin chose Option B). **Not yet applied.**
**Audience:** whoever applies the settings — Cowork working with Ashwin, via the GitHub web UI.
**Repo:** `github.com/Shwinsta-ra/riftacademy` (private, personal account, GitHub Pro)

---

## 1. Why this exists

On 2026-08-15 Claude was granted authority to merge every PR up to and including `staging`, with `staging` → `main` remaining Ashwin's alone and manual. That rule lives in `CLAUDE.md` and is enforced by nothing — it is a convention Claude follows.

A permission entry was added to `.claude/settings.json` (`mcp__github__merge_pull_request` in the `ask` list) as a partial guardrail, but it has two known limits, both recorded in the 2026-08-15 log entry in `docs/RiftAcademy_Project Management.md`:

1. Permission rules match on **tool name, not arguments**, so it cannot distinguish a merge into `main` from a merge into `integration`.
2. A client-side entry only binds sessions that read that file. It is a convention, not an enforcement boundary.

This document specifies the server-side settings that harden `main` as far as is practical.

## 2. The constraint that shapes everything below

**Claude authenticates to GitHub as Ashwin's own account.** Verified 2026-08-15: `get_me` returns `login: Shwinsta-ra`, and every PR Claude opened that day shows Ashwin as the author.

The consequence is not a detail — it is the whole design constraint:

- **GitHub cannot tell Claude apart from Ashwin.** Any rule binding one binds the other identically.
- **Any rule Ashwin can bypass, Claude can bypass**, because they are the same account with the same admin rights.
- **"Restrict who can push to matching branches" achieves nothing here.** The only name it could list is `Shwinsta-ra`, which is who Claude already is. (This option is also typically unavailable on personal, non-organization repositories — confirm when you open the settings page.)

So there is no configuration in which Claude is blocked from `main` and Ashwin is not, **unless Claude is given a separate GitHub identity.** That was considered and rejected for now; see §6.

## 3. The decision: Option B

| | Option A — hard enforcement | **Option B — chosen** |
|---|---|---|
| Required approving reviews | 1 | **0** |
| "Do not allow bypassing the above settings" | ✅ checked | **❌ unchecked** |
| Can Claude merge to `main`? | No | Yes, but told not to |
| Can **Ashwin** merge to `main`? | **No** — GitHub forbids approving your own PR, so a solo owner is locked out too | Yes |
| Requires a second GitHub account | **Yes** | No |

Option A is real enforcement and would need a second free GitHub account added as a collaborator purely to click Approve. Rejected as disproportionate: the realistic failure mode is an absent-minded merge, not a determined bypass, and Option B's PR-plus-checks requirement catches that. Revisit if a second person ever works on this repo.

## 4. Settings to apply

**Path:** repo → **Settings** → **Branches** → Branch protection rules.

A rule for `main` is understood to already exist (`CLAUDE.md` states all four protected branches require a PR plus passing `typecheck` and `check-source-branch`). **The live settings could not be read from the Code session that wrote this document**, so treat the table as the target state and start by reading what is actually configured — then change only what differs.

If a rule for `main` exists, click **Edit**. If not, click **Add branch protection rule**.

| Setting | Target | Notes |
|---|---|---|
| Branch name pattern | `main` | Exact, no wildcard |
| Require a pull request before merging | ✅ **on** | |
| → Required approvals | **0** | **Load-bearing.** Any value above 0 locks Ashwin out — GitHub does not permit approving your own PR |
| → Dismiss stale pull request approvals | leave off | Moot at 0 approvals |
| → Require review from Code Owners | leave off | No CODEOWNERS file in this repo |
| Require status checks to pass before merging | ✅ **on** | |
| → Require branches to be up to date before merging | ✅ **on** | See the caveat in §7 |
| → Required checks | **`typecheck`** and **`check-source-branch`** | Type each name and select it from the search box. Both must appear in the selected list |
| Require conversation resolution before merging | ✅ **on** | Cheap. Stops a merge over an unanswered review comment |
| Require signed commits | ❌ **off** | **Do not enable.** Commits here are deliberately unsigned — the repo mandates Ashwin's author email for Vercel, which forfeits the platform signing key. Enabling this blocks every merge |
| Require linear history | ❌ **off** | The promotion chain uses merge commits |
| **Do not allow bypassing the above settings** | ❌ **off** | **This is what makes it Option B.** Checking it converts this to Option A and locks Ashwin out |
| Restrict who can push to matching branches | ❌ **off** | Achieves nothing — see §2 |
| Allow force pushes | ❌ **off** | |
| Allow deletions | ❌ **off** | |

Click **Save changes**.

### Apply the last two to the other three branches as well

`integration`, `beta` and `staging` should also have **Allow force pushes: off** and **Allow deletions: off**. These cost nothing and close a gap that neither `CLAUDE.md` nor `.claude/settings.json` covers — `.claude/settings.json` denies `git push --force` and `git push -f` for Claude, but nothing stops an accidental force-push or branch deletion from any other client.

Leave those three rules otherwise as they are. Claude legitimately merges into all three.

## 5. Verifying it worked

Read the settings back rather than trusting the save:

1. Reopen the `main` rule and confirm **Required approvals reads 0** and **"Do not allow bypassing" is unchecked.** Those two are the pair that make it Option B rather than Option A, and getting either wrong locks Ashwin out of his own repository.
2. Confirm both `typecheck` and `check-source-branch` appear in the required-checks list. A check that is merely *running* is not the same as *required* — a name typed but not selected from the dropdown silently does nothing.
3. Open the next real `staging` → `main` PR and confirm it shows a merge button, not a block.

If step 3 shows a block, the most likely cause is required approvals being set above 0.

## 6. Explicitly out of scope

**Giving Claude a separate GitHub identity.** This is the only approach that would make "Claude cannot merge to `main`" a fact rather than a promise: a machine user or GitHub App with write access everywhere except `main`, with commits still authored as `ashwin.sathe86@gmail.com` so Vercel's deploy check keeps passing (commit author and API identity are separate things). Not pursued — it adds a credential to manage for a threat model that does not currently exist. Recorded here so the option is not re-derived from scratch later.

## 7. Caveats worth knowing

- **"Require branches to be up to date" interacts with Vercel's build queue.** The Hobby plan allows one concurrent build account-wide, so every push to `staging` invalidates an open `main` PR and re-queues a build. Harmless at current volume; it can make a promotion feel slow. Drop this checkbox if it becomes annoying — it is the least load-bearing setting in the table.
- **This does not stop Claude merging to `main`.** It was never going to, given §2. What it does: guarantees a PR, guarantees both checks pass, blocks force-pushes and deletions, and blocks a merge over an unresolved conversation. The rule that Claude never merges to `main` remains a convention in `CLAUDE.md`, backed by the `ask` permission entry.
- **The `ask` permission entry does not take effect mid-session.** Permission config loads at session start, confirmed 2026-08-15 when a merge went through unprompted in the session that added the entry. New sessions should prompt; if one does not, the rule syntax is wrong and should be reported rather than assumed working.
