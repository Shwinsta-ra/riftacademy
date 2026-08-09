## Thread/topic: retire-seed-cards

**Sections likely affected:** 2, 3, 9 — and **Section on standing rules** (one existing rule needs its example replaced, see below)

**Team-facing:**

`supabase/seed/seed_cards.sql` is **retired and deleted**. Ashwin's decision, 2026-08-09, after the regeneration task was investigated and paused.

The file was stale on two axes (905 of 929 cards; `power_cost` / `might_bonus` / `rules_text` outdated on hundreds more), but the decisive fact is that **it had no consumer**: `supabase/config.toml`'s `[db.seed] sql_paths` points at `./seed.sql`, a path that does not exist, so `supabase db reset` never loaded it. Regenerating would have produced a 550KB file that nothing reads and that re-stales the moment live changes again.

Replaced by `supabase/README.md`, which records: live Supabase is authoritative for `cards`/`card_printings`, how to recover the old file from git history, how to take a fresh dump, the migration rules below, and the RLS decision.

**Nothing was lost.** The file's content remains in git history (`git log --diff-filter=D -- supabase/seed/seed_cards.sql`, then `git show <commit>^:<path>`). The README documents the recovery command.

**One standing rule needs its example updated at reconciliation.** `docs/RiftAcademy_Project Management.md` line ~362 reads: *"A recurring generated artifact is not committed; a one-time record of a load that will never repeat is... `seed_cards.sql` is committed because that load happened once."* The rule itself still stands — retiring the file doesn't contradict its intent (preventing per-day artifact accumulation), and git history preserves the record regardless. But the cited example no longer exists and should be swapped for a current one. **Not edited here**, per the rule against touching the master doc outside reconciliation.

`supabase/seed/postload_verification.sql` had a header line reading "Run AFTER seed_cards.sql" — updated to "Run AFTER any bulk card load," with a note pointing at the README. The script itself is unchanged and still valid.

**Migration ledger reconciled (live change, Ashwin-approved).**

Migrations 008–014 were live but unrecorded in `supabase_migrations.schema_migrations` — they had been applied through the SQL connector/dashboard. `supabase db push` would have tried to re-apply all seven, and migration 008 alone does 25 `insert into cards` on existing rows (primary-key violation). Seven rows inserted; the ledger now reads 001–014. `statements` is null on the backfilled rows, which is exactly what `supabase migration repair --status applied` writes.

**015 and 016 were deliberately NOT recorded** — they are committed in PR #192 but not applied to live. `display_name` does not exist in the live schema yet.

**New conventions written into `supabase/README.md`:**

1. **Every schema change goes through a migration file.** Never apply DDL via the dashboard or the MCP SQL connector — that is precisely what desynchronised the ledger.
2. **If something was applied out of band, record it immediately** with `supabase migration repair --status applied <version>`.
3. **A migration must be replayable on an empty database.** Migrations run *before* seed data, so asserting a fixed row count against seeded data can never succeed on a fresh rebuild. Assert "no row is left in the bad state," not "exactly N rows exist." Migrations 015 and 016 both follow this.

**Data writes are explicitly NOT migrations.** Scheduled inserts — the daily tcgcsv price ingest, and the financial-table writes being planned — must not go in the migration ledger; recurring DML there would destroy its value as a schema-version record. They get a run-log audit trail instead, following the pattern `price_ingest_runs` already establishes: one row per execution written at start and completed at finish, carrying the upstream source id and build timestamp, the CI run id and commit SHA, and row counts, with target rows referencing the run that produced them. "What was inserted, when, by what" is answered by querying that table, never the migration ledger.

**Anything another thread working today should know:**

- **`supabase db push` is now safe to run** against this project. It was not before today.
- **Do not add an anon read policy to `cards`/`card_printings`.** RLS-enabled-with-no-policies is intentional (confirmed 2026-08-09): service-role-only, server-side access. Client-side reads with the anon key return **zero rows, not an error** — worth knowing, because it looks exactly like a data bug.
- `config.toml`'s dead `sql_paths` is still unfixed and still Infra's call. It is now moot for `seed_cards.sql` specifically, but it means **no** seed file in `supabase/seed/` loads on `db reset` — including `seed_card_bans.sql`, which is still live data.
