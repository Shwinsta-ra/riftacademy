## Thread/topic: supabase-readme-refresh

**Sections likely affected:** 2 (Card database), 9 (log), 10 (item 19 closes)

**Team-facing:**

`supabase/README.md` refreshed. It had accumulated statements that were true when written and were no longer true by the end of 2026-08-09, a day on which seven PRs touched this directory. Requested by Infra after reviewing the bootstrap handoff.

**Section 10 item 19 is resolved and the README now carries the answer.** Core ruled on Infra's proposal: **migration 008 is not edited.** The approved bootstrap is documented in a new "Bootstrapping a database from scratch" section: apply migrations 001 to 007 (pure schema, replay cleanly), restore a live data dump of `cards` / `card_printings` / `card_bans` / **`card_keywords`**, then `supabase migration repair --status applied` for 008 onward so they are recorded without re-executing, then push later migrations normally. Both alternatives were rejected for reasons now recorded in the file: editing 008 breaks immutability and drift detection, and splitting it into a migration that re-inserts the same rows is the exact shape of the `seed_card_bans.sql` duplicate-row bug, which a surrogate primary key let pass silently.

**What was stale and is now corrected:**

| Claim | Why it was wrong |
|---|---|
| "`seed_cards.sql` is still present on `main`, `integration`, and every branch cut before that PR merges" | PR #193 merged; it is gone from `integration` and downstream |
| PM.md's standing-rule example "just needs replacing at the next reconciliation" | Already replaced at that reconciliation (PR #195); it now cites `migrations/` |
| "`db push` ... now means 015 and 016 against live" | Both were applied 2026-08-09; the ledger records through 019 |
| "Unresolved. Fixing it needs a decision from Core/Infra" | Core decided; the procedure is now documented |
| "`db dump` has NOT been run: Docker was not running" | Docker has since been used on that machine (it is how `db reset` was finally run). The blocker is no longer inherent, only untried |

**One correction made in the opposite direction, because precision matters here.** An earlier draft of this refresh said the ledger "records through 019" as an inference from PR #206 merging. That was checked against live before committing rather than asserted: the ledger holds **19 rows with `20260809000019` as the latest**. It is recorded but its body never executed, which is the `migration repair --status applied` pattern working as designed and the same treatment migration 008 gets under the bootstrap. The README now says that explicitly, because "recorded" and "executed" are different states and conflating them is what produced the original ledger drift.

**New general lesson recorded in the README**, since more Phase 4 output will land the same way: **a table populated only by hand against live is invisible to every bootstrap, backup-scope and rebuild procedure that enumerates tables.** `card_keywords` existed in exactly one place and nothing would have reported it missing. If you author data directly in live, give it a migration in the same session.

**Anything another thread working today should know:**

- **The bootstrap procedure is now in `supabase/README.md`, not only in a fragment or a handoff doc.** Read it there rather than reconstructing it.
- **`card_keywords` belongs in any dump, backup or restore scope.** Adding it to Infra's runbook is still Infra's open action item; the README documents the requirement regardless of whether that has happened yet.
- This directory changed seven times on 2026-08-09. If you are working from a zip or a branch cut earlier in the day, re-read the README rather than trusting a cached copy.
