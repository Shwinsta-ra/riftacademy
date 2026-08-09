# RiftAcademy Supabase — how this directory works

Project: `riftacademy` (`aqhtqgiwvcunbllmbdrq`), Postgres 17, us-west-1.

## Live is the source of truth for card data

**The live database is authoritative for `cards` and `card_printings`.** Not `src/data/cards.json`, which is a documented lossy interim source that seeds values only and never structure (see `docs/contracts/RiftCore_to_M9_Supabase_DDL_AUDITED_FINAL.md`). Corrections are applied to live and then, where the repo needs to agree, mirrored into `cards.json`.

`seed_cards.sql` was **retired on 2026-08-09** and is no longer in this directory. It had drifted to 905 of 929 cards with stale `power_cost` / `might_bonus` / `rules_text` on hundreds more, and nothing loaded it — `config.toml`'s `[db.seed] sql_paths` points at `./seed.sql`, a path that does not exist. It was a 550KB file with no consumer that re-staled on every change to live.

Its content is not lost: it is preserved in git history. To recover it:

```
git log --diff-filter=D --oneline -- supabase/seed/seed_cards.sql
git show <commit>^:supabase/seed/seed_cards.sql > seed_cards.sql
```

To produce a fresh dump from live instead (preferred, since it will be current):

```
supabase db dump --linked --data-only -s public -f dump.sql
```

That needs Docker running. `psql "$RA_DB" -c "\copy ..."` against the session pooler works too.

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

## Row-level security

**`cards` and `card_printings` have RLS enabled with no policies. This is intentional** (confirmed 2026-08-09) — card data is reachable only via `service_role`, server-side. It is not a misconfiguration and should not be "fixed" by adding an anon read policy.

Practical consequence: any client-side read of these tables using the anon/publishable key returns **zero rows, not an error**. If card data appears mysteriously empty in a client, this is why. Read card data server-side, or from `src/data/cards.json`.

## Verification scripts

The remaining `seed/*.sql` files are read-only checks, not seed data:

| File | Purpose |
|---|---|
| `postload_verification.sql` | Row counts and integrity checks after a bulk load |
| `core_grammar_validation.sql` | Rules-text grammar conformance |
| `ligature_encoding_audit.sql` | Detects ligature glyphs that break grep |
| `price_coverage_check.sql` | Price data completeness |
| `price_diagnostics.sql` | Price ingest troubleshooting |
| `seed_card_bans.sql` | Ban list seed (still live data, not retired) |
