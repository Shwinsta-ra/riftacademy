## Thread/topic: pm-doc-code-routing

**Sections likely affected:** 0 (line 34), 1 (line 91), 6 (the handoff-routing table and the three paragraphs under it, lines 396 to 407), 9 (needs a log entry for the cutover itself, which this doc has never recorded)

**Source:** `Code/pm-doc-code-routing/implementation_spec.md` in Drive (id `1qHK85YLxhPVJtFMN7W9YFmC83bCzTbLe`), written by Cowork 2026-08-15 with Ashwin's approval. Checked out from that folder's `_STATUS.md` at AVAILABLE. This fragment is the whole of the requested change; Cowork has no repo access, and per the three-copy model in Section 1a the Drive copies of PM.md are disaster-recovery backups only, so the fix has to land here.

**Date note:** filed as 2026-08-15 to match the spec, `_STATUS.md`, and the Code/README cutover events, all of which are stamped in UTC. Local clock was still 2026-08-14 evening when this was written.

**Team-facing:**

**PM.md's cross-thread routing rules describe a folder system that no longer exists.** `Handoffs-Cowork/` and `Handoffs-Code/` were both physically archived in Drive on 2026-08-15 (renamed `Archive - Handoffs-Cowork` and `Archive - Handoffs-Code`) and replaced by a `Code/<slug>/` model. Every path in Section 6's routing table now points at an archived tree. A thread that follows this doc literally today will write a handoff into a folder nobody reads.

**Two earlier attempts at this same fix are both superseded and neither should be used.**

1. The pre-2026-08-09 version of the routing row. It predates the `Code/<slug>/` model entirely.
2. `CODE_HANDOFF_2026-08-09_pm-doc-code-addressing-correction.md`, now in the archived Handoffs-Code tree (id `1MM6RcFMW0tLVvbRDD7cZa2Sg-dBhixc3`). It was never applied to PM.md, and it was wrong on its own terms: it still cited `Handoffs-Code/1-Code-Questions/` as the target path.

**The current model**, verified against `Code/README.md` in Drive (id `16RMSXIQQ02Cw--OfjliZRjw9ebYKGU9_6cHr73CeB5s`) and Admin_Decisions.md decision 10:

- One folder per feature or design spec: `Code/<slug>/`, where the slug is kebab-case, 2 to 3 words, about 25 characters max, because it gets typed by hand as part of both trigger phrases. Good: `promo-op-codes`, `pm-doc-code-routing`.
- Each subfolder is a self-contained unit of work for exactly one Code session, and holds a `_STATUS.md` acting as its checkout lock. **Only one Code session may work in a given subfolder at a time.** Read `_STATUS.md` first; if it says AVAILABLE, set it to IN_PROGRESS with today's date before starting; if it says anything else, do not touch the subfolder.
- Status values: `AVAILABLE | IN_PROGRESS | AWAITING_COWORK_DECISION | AWAITING_CODE | READY_FOR_STAGING_PR | COMPLETE`.
- Open work is any non-`Archive - ` prefixed subfolder in `Code/`. Check the top level of `Code/` every session.
- On merge, prepend `Archive - ` to the subfolder name and set `_STATUS.md` to COMPLETE.
- Trigger words are exactly "question" and "answer" (final, Admin_Decisions.md decision 10, after two rounds of shortening from "request pending"/"response received" then "ask"/"go"). Both always include the slug and never rely on a thread remembering prior conversation, because Cowork memory does not persist across threads (Admin_Decisions.md decision 1).

**Suggested Section 6 replacement.** Replace the four-row table at lines 398 to 401 and the three paragraphs beneath it (lines 403, 405, 407) with:

| From | To | Mechanism |
|---|---|---|
| Code (blocked, needs a decision) | Cowork/Ashwin | Code writes `Code/<slug>/decision_request*.md`, sets `_STATUS.md` to AWAITING_COWORK_DECISION. Ashwin triggers with `question: <slug>` in any Cowork thread. |
| Cowork/Ashwin (answer ready) | Code | Cowork writes `Code/<slug>/decision_response*.md`, sets `_STATUS.md` to AWAITING_CODE. Ashwin triggers with `answer: <slug>` in a Code session. |

Follow-ups are numbered in pairs: `decision_request_2.md` gets `decision_response_2.md`.

The three paragraphs being dropped are all reasoning about the archived system: the Finder-sidebar argument for system prefixes on subfolder names, the repo-to-Drive move, why a decision skipped `1-Code-Questions/`, and the known-leftover note. None of it survives the cutover. The repo-tree leftover it describes is covered separately below.

**Also needs fixing, same cutover:**

- **Line 34 (Section 0)** still tells threads that work for Code goes in `Handoffs-Code/0-Cowork-Instructions-for-Code/` and decisions in `Handoffs-Code/2-Code-Pending Review/`. Both paths are archived. Replace with a one-line pointer to `Code/<slug>/` and its `_STATUS.md` checkout rule, keeping the existing and still-correct point that nothing handoff-related belongs in this repo.
- **Line 91 (Section 1)** still names `Handoffs-Cowork/` and `Handoffs-Code/` as the handoff route. Same replacement.
- **Line 403's** reference to `Handoffs-Cowork/README_Handoffs_System.md` as the full spec is doubly stale: that README was already superseded by `RiftAcademy/Handoffs-README.md` on 2026-08-11, and both are now behind `Code/README.md`, which is the current spec.
- **Lines 8 and 563 are historical log entries** describing the 2026-08-09 reconciliation pass. They should be left as written. They are dated records of what was true then, not live instructions, and rewriting them would falsify the log. Worth a one-line "superseded 2026-08-15" marker if the reconciler wants the grep to come back clean.

**Not in this fragment, flagged for whoever picks it up:**

- **`CLAUDE.md` has an uncommitted 59-line addition sitting in the working tree that documents the archived system in detail** (three new sections on `Handoffs-Code/2-Code-Pending Review/`, `1-Code-Questions/`, and the never-write-to-`Handoffs-Cowork/` rule). It predates the cutover and would land more stale routing if committed as is. Not touched here, since it is another session's in-flight work. `Code/README.md`'s own open-items list already carries "CLAUDE.md needs a pointer added to this folder, repo access needed" as a separate task, and these two should be resolved together rather than in sequence.
- **`docs/handoffs-code-inbox/` still exists in the working tree, untracked.** Section 6 line 407 has called it safe to delete since 2026-08-09. Left alone here to keep this a documentation-only change.
- **Section 6's Drive root path is wrong, and this fragment is the first thing to catch it.** Section 6 gives `/Users/ashwinsathe/My Google Drive/Personal/Games/Riftbound/RiftAcademy/`. The real path is `/Users/ashwinsathe/My Google Drive/Ashwin/Games/Riftbound/RiftAcademy/`: `Ashwin`, not `Personal`. Confirmed by Ashwin and verified by directory listing 2026-08-15. Fix this wherever Section 6 states it.

  There is also a second mount alias for the same content, `.../CloudStorage/GoogleDrive-ashwin.sathe86@gmail.com/.shortcut-targets-by-id/145sHHILhOGI5GjOa0agpqy5np96cXJJ9/RiftAcademy/`, and **it is not a reliable view.** This session started there and `Code/pm-doc-code-routing/` was simply absent from it, hours after creation, while the same folder was present and current under the `My Google Drive/Ashwin/` path. A session pointed at the shortcut mount can conclude a subfolder does not exist when it does, which under the checkout rule means two sessions can believe the same slug is unclaimed. **Use the `My Google Drive/Ashwin/` path.**

**New standing rule worth capturing:**

**A routing rule that names a folder should name the folder's canonical spec too, so a stale path is self-evident.** This row has now been wrong three separate times (the pre-08-09 version, the 08-09 correction fragment that was itself wrong, and the current text), and each time it was rediscovered by a thread following it into an empty folder rather than by reading the doc. `Code/README.md` is the spec for the current model; a pointer to it in the row is what makes the next drift visible.

**Anything another thread working today should know:**

Do not write to `Handoffs-Code/` or `Handoffs-Cowork/` for any reason. Both are archived. Use `Code/<slug>/`, read `_STATUS.md` before touching a subfolder, and claim a document lock through `ops.claim_document_lock(...)` in the `riftacademy` Supabase project (id `aqhtqgiwvcunbllmbdrq`) before writing to any shared doc such as a module's Context.md or Decisions.md. The interim `<doc-name>.LOCKED.md` file convention is retired; a 2026-08-15 sweep found no orphans to migrate.
