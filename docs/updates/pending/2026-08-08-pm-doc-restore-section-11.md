# Daily Update Fragment

## Thread/topic: pm-doc-restore-section-11

**Sections likely affected:** 10 (item 6), 11 (new)

**Customer-facing:**
Nothing.

**Team-facing:**

**Section 11, "Troubleshooting & manual state reversions", is back in the master doc.** It was
written on 2026-07-19 on `fix/doc-reconcile-v2`, that branch never merged, and the three later
reconciliation passes (07-23, 07-28, 08-06) did not restore it. It sat only on one local machine
for three weeks. It is a 68-line operational runbook: 11.0 wrong-base and wrong-prefix PRs, 11.1
Vercel instant rollback, 11.2 reverting an accidental merge into `main`, 11.3 un-promoting a
failed hotfix, 11.4 the clean non-emergency path, 11.5 the re-merge-after-revert gotcha, 11.6
diagnosis discipline.

Restored **verbatim, em dashes and all**, following the 2026-08-06 precedent: new additions comply
with the Section 6 em-dash rule, legacy text is not silently rewritten. This keeps open decision 7
(the doc's em-dash inconsistency) exactly as it was rather than half-resolving it.

**New 11.7 added, written in compliance (zero em dashes):** the stale-PR-head failure hit today on
PR #175. A PR can merge the wrong commit with no error and no failed check, because GitHub's PR
object caches `head.sha` separately from the branch ref and that cache can fail to catch up. The
checks go green against the old head. The best diagnostic is counter-intuitive and worth knowing:
**a branch that survives its own merge, on a repo with auto-delete-on-merge enabled, is a signal
that the merge took a stale head** — that is how both leftovers in this repo were spotted. 11.0
now points at 11.7.

**Section 10 item 6 closed.** "Stale GitHub branch cleanup, process documented, not yet executed"
is now done: 61 merged local branches deleted after verifying each was an ancestor of
`origin/staging`, plus two merged remote leftovers.

**Anything another thread working today should know:**

- **Ancestry is the only proof a commit merged.** Content being present is not the same thing. A
  cherry-pick puts content on the target while the original commit stays a non-ancestor, which is
  why `git branch --merged` still lists such a branch as unmerged. Use
  `git merge-base --is-ancestor <sha> origin/<branch>`.
- **`fix/doc-reconcile-v2` also carried an older §1a, which was deliberately NOT restored.**
  Integration's §1a supersedes it: the branch predates the fragment system and describes the
  "doc rides with the code" model that the fragment system replaced. Restoring it would have
  regressed the doc. Anyone mining that branch for anything else should apply the same check.
- Three previously local-only branches are now pushed to origin as backup:
  `feature/riftnotes-inactive-player`, `fix/doc-reconcile-v2`, `fix/remove-live-match-tracking`.
  RiftNotes in that form is **not shipping** (Ashwin, 2026-08-08), so that branch is an archive,
  not pending work.
