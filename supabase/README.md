# RiftAcademy Supabase — how this directory works

Project: `riftacademy` (`aqhtqgiwvcunbllmbdrq`), Postgres 17, us-west-1.

## Live is the source of truth for card data

**The live database is authoritative for `cards` and `card_printings`.** Not `src/data/cards.json`, which is a documented lossy interim source that seeds values only and never structure (see `docs/contracts/RiftCore_to_M9_Supabase_DDL_AUDITED_FINAL.md`). Corrections are applied to live and then, where the repo needs to agree, mirrored into `cards.json`.

`seed_cards.sql` is **retired**. It had drifted to 905 of 929 cards with stale `power_cost` / `might_bonus` / `rules_text` on hundreds more, and nothing loaded it — `config.toml`'s `[db.seed] sql_paths` pointed at `./seed.sql`, a path that does not exist. It was a 550KB file with no consumer that re-staled on every change to live.

> **If you can still see `seed/seed_cards.sql`, you are on a branch that predates the deletion.** The file is removed in the same commit that adds this README (branch `fix/retire-seed-cards`, PR #193) and is still present on `main`, `integration`, and every branch cut before that PR merges. Check with `git log --diff-filter=D -- supabase/seed/seed_cards.sql`. Either way it is **not** wired into `sql_paths`, so it does not auto-load on `db reset` — see `config.toml` (PR #194).

Its content is not lost: it is preserved in git history. To recover it:

```
git log --diff-filter=D --oneline -- supabase/seed/seed_cards.sql
git show <commit>^:supabase/seed/seed_cards.sql > seed_cards.sql
```

To produce a fresh dump from live instead:

```
supabase db dump --linked --data-only -s public -f dump.sql
```

**Verified scope of that claim, so nobody has to re-derive it:** `--linked` *is* a real flag on `db dump` and `db push` on CLI **2.111.0** (confirmed from `--help` on 2026-08-09). This supersedes the transition doc's note that "there is no reliable `--linked` flag on the installed CLI version" — that may still hold for `db query`, which is a different subcommand, but not for these two.

**However, this exact dump command has NOT been run successfully here.** It was attempted on 2026-08-09 and failed: `db dump` shells out to a `supabase/postgres` container, so it needs Docker running, and Docker was not. Treat the command as unverified end-to-end until someone runs it with Docker up. `psql "$RA_DB" -f ...` against the session pooler (port 5432 — not the direct hostname, which is IPv6-only) avoids Docker entirely and is the safer bet if you just need the data.

`db push` is different: it applies migrations to the remote directly and does **not** need Docker.

> **Note on the standing rule.** `docs/RiftAcademy_Project Management.md` cites `seed_cards.sql` as its example of "a one-time record of a load that will never repeat is committed." That rule still stands — the example just needs replacing at the next reconciliation. Retiring the file does not violate its intent (preventing per-day artifact accumulation), and git history keeps the record either way.

## Migrations

Files live in `migrations/`, named `<version>_<name>.sql`. The applied set is tracked in `supabase_migrations.schema_migrations`.

**Every schema change goes through a migration file. No exceptions.**

This directory learned that the hard way: migrations 008–014 were applied through the SQL connector/dashboard without ever being recorded in the ledger. The repo said one thing, the database another, and `supabase db push` would have tried to re-apply all seven — migration 008 alone does 25 `insert into cards` on rows that already exist, a primary-key violation. The ledger was reconciled on 2026-08-09 by recording 008–014 as applied (`statements` is null on those rows, which is exactly what `supabase migration repair` writes).

Rules that follow from that:

1. **Never apply DDL through the dashboard or the MCP SQL connector.** Write a migration file and apply it with `supabase db push`. Ad-hoc DDL is what desynchronised the ledger.
2. **If something *was* applied out of band**, record it immediately:
   `supabase migration repair --status applied <version>`
3. **A migration must be replayable on an empty database.** Migrations run *before* any seed data loads, so a migration that asserts a fixed row count against seeded data can never succeed on a fresh rebuild. Assert invariants that hold at any row count — see `20260808000015_display_name.sql` and `20260808000016_normalize_champion_tags.sql`, both of which assert "no row is left in the bad state" rather than "exactly N rows exist."

### Data writes are not migrations

Scheduled jobs that insert rows — the daily tcgcsv price ingest, and any future financial-table writes — are **not** schema migrations and must not be recorded in the migration ledger. Putting recurring DML there would make the ledger meaningless as a schema-version record.

Those get their own audit trail instead, following the pattern `price_ingest_runs` already establishes: an append-only run table recording what ran, when, from which source, and how many rows it wrote, with the target rows carrying a foreign key back to the run that produced them. The properties worth preserving in any new ingest:

- one row per execution, written at start and completed at finish, so a crashed run is visibly incomplete rather than invisible;
- the upstream source identifier and its build timestamp, so a re-run of unchanged source can skip cleanly instead of double-inserting;
- the CI run identifier and commit SHA, so any row traces back to the exact workflow execution and code that produced it;
- row counts, so a silently-empty run is detectable;
- the generated SQL retained as a workflow artifact.

The answer to "what was inserted, when, and by what" should come from querying that run table, never from reading the migration ledger.

**`price_ingest_runs` does not yet support all of that** (live schema checked 2026-08-09). It has `run_id`, `started_at`, `source_id`, `source_built_at`, the row counters, `status`, and `notes` — which already covers skip-on-unchanged-source and empty-run detection. It is **missing**:

| Column | Why it is needed |
|---|---|
| `ci_run_id` | Trace a row back to the exact GitHub Actions execution |
| `commit_sha` | Trace a row back to the exact code that produced it |
| `finished_at` | Distinguish a crashed run from a completed one by more than `status` |

So the CI-traceability half of this pattern **is not documentation — it needs its own migration** before a scheduled workflow can populate it. That migration is in scope for the price-ingest automation work, not yet written.

## Row-level security

**`cards` and `card_printings` have RLS enabled with no policies. This is intentional** (confirmed 2026-08-09) — card data is reachable only via `service_role`, server-side. It is not a misconfiguration and should not be "fixed" by adding an anon read policy.

Practical consequence: any client-side read of these tables using the anon/publishable key returns **zero rows, not an error**. If card data appears mysteriously empty in a client, this is why. Read card data server-side, or from `src/data/cards.json`.

## There is no seed data any more

**`config.toml`'s `[db.seed] sql_paths` is deliberately empty, and everything left in `seed/` is read-only.** Migrations 001–016 are the complete, self-sufficient path to a correct database. If you ever need seeded rows again, write a migration — not a seed file competing with one that already ran.

Both files that once lived here are retired. `seed_cards.sql` is covered above.

**`seed_card_bans.sql`** was retired because it was **entirely redundant with migration `20260805000008_backfill_master_inventory.sql`**, which is applied and immutable. Migration 008 inserts **11** ban rows — the 7 March-2026 bans plus the *same* 4 July-2026 bans the seed inserted, with identical `card_code` / `format` / `mode` / `effective_date`. It is a strict superset, and live `card_bans` holds exactly 11 rows, confirming migration 008 alone fully seeds bans.

Re-running the seed on top of that **did not error — it silently inserted 4 duplicates.** `card_bans`'s primary key is a surrogate `ban_id`; there is **no** uniqueness constraint on `(card_code, format, mode, effective_date)`, so nothing rejected the second copy.

That made the file unrunnable from the moment migration 008 landed on 2026-08-05: any gate comparing `card_bans` totals sees migration 008's 11 rows and fails. The dead `./seed.sql` path was the only reason nobody noticed — wiring it up surfaced a bug that had been latent for days rather than creating a new one.

Recover it from git history if ever needed: `git log --diff-filter=D -- supabase/seed/seed_card_bans.sql`.

> **Verification-gate lesson worth keeping.** Before deletion, that file's gate was reworked to assert what survives an unseeded database — separating "target data not loaded yet" (a notice) from "a name failed to match" (an exception) — rather than asserting a flat expected row count. That is the right template for any future seed or migration gate, and it is the same reasoning behind the assertions in migrations 015 and 016. The gate is gone with the file; the pattern should not be.

**Read-only verification scripts (write nothing, and never auto-run):**

| File | Purpose |
|---|---|
| `postload_verification.sql` | Row counts and integrity checks after a bulk load |
| `core_grammar_validation.sql` | Rules-text grammar conformance |
| `ligature_encoding_audit.sql` | Detects ligature glyphs that break grep |
| `price_coverage_check.sql` | Price data completeness |
| `price_diagnostics.sql` | Price ingest troubleshooting |

None of these run automatically. Invoke them by hand against whichever database you want to check.
