## Thread/topic: migration-008-not-replayable

**Sections likely affected:** 2, 3 (tracker rows for PR #193/#194), 6 (standing rules), 9, 10 — **and it corrects text reconciled earlier today by PR #195**

**Team-facing:**

`supabase db reset --local` was executed on 2026-08-09 with Docker running, closing the verification gap that PR #194's fragment explicitly flagged as open. **It failed** — and not at the seed step:

```
Applying migration 20260805000008_backfill_master_inventory.sql...
ERROR: card_bans has 0, expected 11. A name failed to match.
```

**Migration 008 is not replayable on an empty database, and never has been.** Every one of its 11 ban inserts resolves `card_code` via `select ... from cards where name = '...'`. On a fresh database, migrations 001–007 create **schema only** — there is no card data — and 008's own 25 inserts are Vendetta cards, none of them ban targets. All 11 selects match nothing, 008's own assertion fires, and the entire migration rolls back.

**This resolves the migration-ledger mystery as well.** Migration 008 was applied by hand against the already-populated live database *because it cannot run as a migration*. The out-of-band application and the broken from-scratch rebuild are one root cause, not two coincidences.

### ⚠️ Corrections to text PR #195 reconciled into the master doc earlier today

The reconciliation folded in a claim that is **false**. It originated in my own PR #194 fragment, written from static analysis before the reset had ever been run. These need fixing at the next reconciliation:

| Master doc location | Problem |
|---|---|
| Section 2, "`db reset` now seeds nothing" bullet | States "**migrations 001 to 016 are the complete, self-sufficient path to a correct database**". False — `db reset` fails at 008 |
| Section 3 tracker row, "`config.toml` seed path + retire `seed_card_bans.sql`" | Same claim: "migrations 001 to 016 are the complete path" |
| Section 9 daily entry, team-facing bullet | Same claim repeated |
| Section 2, "Verification boundary" bullet | Says `db reset` "was never actually executed… Docker is installed but not running". **Now superseded** — it was executed, and it failed |

Everything else the reconciliation captured about #193/#194 remains accurate: the duplicate-ban analysis, the surrogate-key finding, and both standing rules in Section 6 are unaffected and still correct.

### Scope — what is and is not broken

- **`supabase db reset` has never worked on this project.** Not caused by retiring the seeds; it fails at 008 long before seeding runs, whatever `sql_paths` contains. The dead `./seed.sql` path meant nobody ever got far enough to find out.
- **`supabase db push` is unaffected and remains safe.** It applies only *unapplied* migrations to the remote. Used on 2026-08-09 to apply 015 and 016 to live successfully.
- **Live is entirely unaffected.** This is a from-scratch-rebuild problem only.

### Applied to live on 2026-08-09 (verified after push)

`display_name` column present with 12 rows populated; 0 stale apostrophe'd tags and 16 normalized; `card_bans` still exactly 11 rows (**no duplicates — independent confirmation that retiring the bans seed was correct**); ledger now records `20260808000015` and `20260808000016`.

### Open decision — Core/Infra

Migration 008 is recorded as applied, and this repo treats applied migrations as immutable. Options, in rough order of preference:

1. **Amend 008's ban section to be replay-safe** — assert against ban-target cards *present*, as migrations 015 and 016 do. Defensible despite the immutability rule: 008 is already recorded as applied on live, so editing the file cannot re-run or change anything there. It only affects future from-scratch rebuilds, which have never worked.
2. **Accept that from-scratch rebuild is unsupported** and document the real bootstrap: apply 001–007, load card data from a live dump, then 008 onward.
3. **Split 008's data-dependent parts** into a later migration that runs after a card load.

Worth deciding on the basis of whether ephemeral CI databases are ever wanted — if not, option 2 is nearly free; if so, this blocks it.

**New standing rule worth capturing:**

**A migration is not proven by review, by CI, or even by being recorded as applied — only by running it against an empty database.** Migration 008 sat green in the repo for four days, was live in production, and was recorded in the ledger, while being incapable of executing from scratch. Three separate signals all read "fine." The only thing that surfaced it was `supabase db reset`. Any migration that resolves its own keys by querying data it did not itself insert should be assumed unreplayable until demonstrated otherwise.

**Anything another thread working today should know:**

Do not trust "migrations 001–016 are self-sufficient" if you read it in the master doc — it is being corrected by this fragment. A local `db reset` will fail at 008 until the decision above is made.
