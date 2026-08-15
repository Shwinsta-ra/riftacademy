# Git author/committer split — untested idea for satisfying Vercel and the Verified badge simultaneously

**Status:** untested hypothesis. Do not rely on any part of this without running the test below.
**Moved here from `CLAUDE.md` on 2026-08-15** — it's a research idea, not a standing rule, so it doesn't need to load into every Code session's context.

## The conflict

Two checks want opposite values in the same field:

| Check | Wants | Consequence if unsatisfied |
|---|---|---|
| Vercel deploy | author email `ashwin.sathe86@gmail.com` | Blocks the deploy: "commit author email is not valid" |
| CCR registered signing key | `noreply@anthropic.com` | No GitHub "Verified" badge; platform Stop-hook nags |

The repo resolves this in Vercel's favour — `CLAUDE.md` mandates `ashwin.sathe86@gmail.com`, which is why every real commit in this repo's history shows "Unverified". That is deliberate and expected, not a bug.

## The hypothesis

Every git commit carries **two** identities, not one:

- **author** — who wrote the change (`GIT_AUTHOR_EMAIL`, `git commit --author`)
- **committer** — who created the commit object (`GIT_COMMITTER_EMAIL`)

They're normally identical, but git permits them to differ; this is routine in patch-and-apply and rebase workflows. So:

```
GIT_AUTHOR_EMAIL=ashwin.sathe86@gmail.com
GIT_COMMITTER_EMAIL=noreply@anthropic.com
```

might satisfy both checks at once — Vercel reading the author field, the signing/badge check reading the committer field.

**This only works if Vercel's validation reads the author field specifically.** If it reads the committer field, or requires both to be valid, the split fails and the deploy still breaks. Nobody has checked which. That single unknown is the whole reason this is a hypothesis rather than a rule.

## How to test it

Must be tested against a **real Vercel deploy** — the check runs on Vercel's side and can't be verified locally or by inspecting the commit.

1. Branch off `integration` with an allowed prefix (`fix/git-identity-split-test`) so `check-source-branch` passes and CI actually runs.
2. Make a trivial no-op change that still triggers a build (a whitespace edit in a file under `src/`; a `.md`-only change may not produce a meaningful deploy).
3. Commit with the two identities deliberately split:
   ```
   GIT_COMMITTER_EMAIL=noreply@anthropic.com GIT_COMMITTER_NAME=Claude git -c user.email=ashwin.sathe86@gmail.com -c user.name="Ashwin Sathe" commit -m "Test: author/committer identity split"
   ```
4. Confirm the split actually landed before pushing — don't assume the flags took:
   ```
   git log -1 --format='author=%ae committer=%ce'
   ```
   Expect `author=ashwin.sathe86@gmail.com committer=noreply@anthropic.com`.
5. Push and read **both** signals on the resulting PR:
   - Does the Vercel preview build succeed, or fail with "commit author email is not valid"?
   - Does GitHub show "Verified" on the commit?

## Interpreting the result

| Vercel | Verified badge | Conclusion |
|---|---|---|
| ✅ builds | ✅ shows | Hypothesis holds — worth adopting as the standing commit convention |
| ✅ builds | ❌ absent | Vercel reads author, but the badge needs committer *and* a matching signature — split gains nothing |
| ❌ fails | either | Vercel reads committer or requires both — hypothesis dead, keep the current rule |

Record the outcome here either way. A refuted hypothesis is worth writing down; otherwise it gets re-derived every few months.

## Secondary benefit, if it holds

Because `CLAUDE.md` mandates Ashwin's email as the author, **Claude-authored commits are currently indistinguishable from hand-written ones in git itself** — authorship survives only in the PR body footer. If the split works, `committer=noreply@anthropic.com` restores that signal inside git history at no cost, which is directly relevant to the 2026-08-15 discussion about whether a `claude/*` branch prefix is needed to mark Claude's work. It would be a better mechanism than the prefix: it marks the *commits* rather than overloading the branch namespace, which in this repo carries merge-routing semantics (see `.github/workflows/enforce-branch-flow.yml`).
