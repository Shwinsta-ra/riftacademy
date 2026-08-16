## Thread/topic: branch-deletion-exception (Code/process-doc-fixes, item 2 of 4)

**Sections likely affected:** 9 (log), plus wherever standing branch rules are summarised

**Customer-facing:**
Nothing user-visible.

**Team-facing:**
Resolves the last open item of the `process-doc-fixes` feature. The other three items of that spec were already shipped by other work and needed no change — verified directly against `origin/integration` (HEAD `1536aba`), not taken on trust:

| Spec item | State | Evidence |
|---|---|---|
| 1. CLAUDE.md README pointer | Already done | PR #264 / commit `5c73b72`; `CLAUDE.md:5,6,14,16` all read `Code/README-Code.md`, no `Code/README.md` mention remains |
| 2. Branch-deletion exception | **This PR** | See below |
| 3. PM.md EOD/BOD sweep | Already done | Searched PM.md for `EOD`/`BOD`/`end-of-day`/`beginning-of-day`/`eod_`. Four hits, all correct to keep: lines 809, 843 are historical log entries about 2026-07-21; lines 32, 121 say "end-of-day reconciliation", which is the live doc-fragment pass, a different thing from the retired EOD/BOD task ritual |
| 4. promo-op-codes fragment | Already done, nothing to reconcile | `docs/updates/pending/2026-08-16-op-promo-treatment.md` does not exist on `origin/integration`, and no path matching `op-promo` exists anywhere in that tree. Skipped rather than recreated from memory, per the spec's own instruction |

Also confirmed untouched, as the spec's acceptance criteria require: the migration-008 claim. Its fragment (`docs/updates/pending/2026-08-09-migration-008-not-replayable.md`) is absent from `pending/` because it was already folded in — commits `1be79bb`, then `b982922` ("Correct three false claims folded in by PR #195"). Not lost, and not edited here. `docs/updates/pending/2026-08-16-code-readme-pointer-rename.md` belongs to a different closed feature and was left alone.

**The actual change (item 2).** `Code/README-Code.md`'s "end session" step 3 auto-deletes the closed feature's branch, with the command itself as the only confirmation. `CLAUDE.md` (2026-08-15) said the opposite for local refs — go-ahead every time — and `.claude/settings.json` denied `Bash(git branch -d:*)`/`-D` outright. So "end session" promised a step it could not perform: the deny is enforced at the permission layer regardless of what any prose says. Ashwin's call, 2026-08-16, was Option B of `Code/process-doc-fixes/decision_request.md`: loosen the permission to exactly the prefixes "end session" needs, keep it closed everywhere else.

`.claude/settings.json` now:
- **allows** `git branch -d`/`-D` on `feature/` and `fix/` prefixed names — four entries, no prompt.
- **denies** `git branch -d`/`-D` on `main`, `staging`, `beta`, `integration`, and any `hotfix/*` — ten entries, blocked outright rather than merely asked about. `hotfix/*` is excluded by design: it's the one prefix that can target `main` directly.
- Anything else (a `claude/*` branch, a bare name) matches neither list and falls through to a normal prompt.

The prefix set matches `.github/workflows/enforce-branch-flow.yml:17` (`^(feature/.*|fix/.*|hotfix/.*)$` into `integration`), cited rather than restated independently.

**Gotcha worth recording:** an earlier draft of this fix (prepared in a Cowork thread, `Code/process-doc-fixes/branch-deletion-fix-ready-to-apply.patch.md` in Drive) removed the blanket deny but added no `allow` entries, relying on `defaultMode: "acceptEdits"`. That would not have worked — `acceptEdits` auto-accepts file edits only; Bash commands still prompt. The deletion would have gone from "denied" to "prompts every time", which is the same friction the change was meant to remove, while the CLAUDE.md prose alongside it claimed no prompt. Removing a deny is not the same as granting an allow. That draft also used exact-match deny patterns (`Bash(git branch -d integration)`); this PR uses the `:*` prefix form so trailing flags or arguments can't slip past.

**New standing rule or convention worth capturing:**
Local `feature/*` and `fix/*` branch refs may now be deleted without asking. **Verification is still required** — `git branch -r --merged origin/staging` *and* `git cherry origin/staging origin/<branch>`, tip SHA recorded, evidence cited. Not prompting is not the same as not checking; the allow removed the prompt, not the evidence requirement. Restore path stays `git push origin <sha>:refs/heads/<name>`.

**Anything another thread working today should know before touching related code:**
`.claude/settings.json` changed shape — it now has an `allow` key it didn't have before. If your thread also edits that file, rebase rather than hand-merging; the deny list went from 5 entries to 13.
