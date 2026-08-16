## Thread/topic: claude-md-readme-pointer-name

**Sections likely affected:** 0, 1, 6, 9

**Team-facing:**

`Code/README.md` in Drive was **renamed to `Code/README-Code.md` on 2026-08-16** by an in-flight Cowork restructure (the `code-cowork-redesign` thread, which also created `Code/historical-context-archive/` and a new `process-doc-fixes` feature folder). Every pointer in this repo still named the old file, so **a fresh Code session following `CLAUDE.md` would have looked for a file that no longer exists** — the exact failure this project has now hit four times on this one row.

Fixed in both places that carry a live pointer:

- **`CLAUDE.md`** — the pointer section heading and body now name `README-Code.md`, plus a short note recording the rename, so a session holding an older `CLAUDE.md` can recognise the mismatch instead of concluding `Code/` is empty. It also now says: **if neither name resolves, list `Code/` and read whatever README-shaped file is at the top level rather than guessing.** That is the general fix; the rename is the instance.
- **PM.md** — five live pointers updated (Sections 0, 1 and three in Section 6). **Section 9's log entries were deliberately left alone**: they describe what happened on 2026-08-15, when the file genuinely was `README.md`, and rewriting history to match today's name would make the record wrong.

**A second defect found while fixing the first:** Section 6's cutover block recorded the spec's Drive doc id as `16RMSXIQQ02Cw--OfjliZRjw9ebYKGU9_6cHr73CeB5s`. **That id resolves to neither the old file nor the new one** — it was wrong independently of, and prior to, the rename, so anyone who had used it to fetch the spec would have failed for a different reason than they thought. Replaced with `1LsyWVRnoPHSu9RTz6La6sPGEf1eAK9iCkLAd9tn7x7Q`, read live 2026-08-16.

**The standing rule earned its keep.** Section 6's "a routing rule that names a folder must name that folder's canonical spec too, so a stale path is self-evident" was adopted 2026-08-15 after this row had been wrong three times. It worked here: because both `CLAUDE.md` and PM.md named the file, the break was findable by grep at the end of a session rather than being rediscovered weeks later by a thread walking into an empty folder. Section 6 now records that fourth instance as evidence the rule works, not just as another failure.

**Anything another thread working today should know before touching related code:**

- **`Code/process-doc-fixes/` exists and is `AVAILABLE`** (TickTick `6a81f4d08f083a5cfc9d4596`), created 2026-08-16 by the Cowork redesign thread. **It was deliberately not picked up by this change** — different task, not checked out, and no `start session` was given. Its spec covers three items: a `CLAUDE.md` branch-deletion exception, a PM.md EOD/BOD sweep, and reconciling `docs/updates/pending/2026-08-16-op-promo-treatment.md`.
- **That third item is already done.** The OP fragment was folded into PM.md and deleted in PR #260, promoted to `staging`. The spec anticipates this — it says to verify the file exists and, if not, note that in `_STATUS.md` and skip rather than recreating content from memory. **Whoever picks up `process-doc-fixes` should do exactly that**, not re-fold it.
- **Its first item may conflict with what shipped today.** The spec describes "end session" as auto-deleting a feature's branch, both local and remote. That is a **newer** `README-Code.md` behaviour than the rules reconciled into PM.md and `CLAUDE.md` earlier on 2026-08-16, which require Ashwin's per-session go-ahead for local ref deletion and keep `git branch -d/-D` denied. **These two are not obviously compatible and should be reconciled deliberately, not merged by whoever edits second.**
