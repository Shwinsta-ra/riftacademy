# Decision: the daily price ingest runs on GitHub Actions, not in Supabase

**Date:** 2026-08-08
**Status:** Decided (Ashwin approved), implemented in `.github/workflows/price-ingest.yml`
**Module:** Infra
**Supersedes:** nothing. Records a choice that previously existed only in a TickTick comment and a handoff file.

## What forced the decision

A live query against Supabase on 2026-08-08 found `price_observations` held a single
day, `2026-08-06`. Both `2026-08-07` and `2026-08-08` were missing.

tcgcsv publishes only its current build and offers no backfill endpoint, so a day that
is not fetched on the day is gone permanently. `2026-08-07` is therefore unrecoverable.
`2026-08-08` was still on the wire when this was caught and has since been ingested by
hand (1,986 observations, tcgcsv build `2026-08-08T20:05:59+0000`).

The cause was not a bug. The ingest was manual and depended on Ashwin remembering to
run it. This is the second time the gap has been caught this way, which makes the
scheduling itself the defect.

## Options considered

| Option | Verdict | Reason |
|---|---|---|
| **GitHub Actions scheduled workflow** | **Chosen** | General-purpose runner, reusable beyond Supabase; runs the existing Python script unchanged; shares alerting/logging with work already committed to this runtime |
| Supabase Edge Function | Rejected | Deno/TypeScript only. `scripts/ingest_tcgcsv.py` is Python, so this means a full rewrite for no functional gain |
| `pg_cron` / `pg_net` | Rejected | Same objection the transition doc already raised for the change-detection checker: a job running inside the database it depends on cannot detect its own bypass. Keeping ingest external preserves that separation |

Two supporting points for GitHub Actions specifically:

- The transition doc (section 5) already commits the Discord poller and the game-truth
  change-detection checker to GitHub Actions at 21:00 UTC. Putting the price ingest on
  the same runtime means the alerting and logging plumbing is built once rather than
  twice across two platforms.
- Ashwin wants a general automation runner, not one scoped to a single data store.

## What was built

Daily at **21:00 UTC**, one hour after tcgcsv's ~20:00 UTC build:

1. Read the high-water mark from `price_ingest_runs.source_built_at`.
2. Run `scripts/ingest_tcgcsv.py`, which emits `price_ingest_<date>.sql`.
3. Apply it with `psql -v ON_ERROR_STOP=1`.
4. Verify observations actually exist for that date.
5. Upload the generated SQL as a 90-day workflow artifact.
6. Check database size against the 500 MB free-tier ceiling, alerting at 350 MB.
7. Alert to Discord on failure.

### Generate-then-apply was kept

The script emits SQL rather than writing to the database directly. That could have been
collapsed now that a machine runs it, and it deliberately was not: the reviewable
artifact is the only reason several past silent defects in this pipeline were
diagnosable after the fact. Nobody reads the SQL daily — the artifact upload exists so
that "what exactly did we write that day" remains answerable.

### State moved from a local file to the database

The script kept its high-water mark in `~/.riftacademy_tcgcsv_state.json`. That file
cannot survive an ephemeral runner, which would read "never ingested" and re-ingest on
every single run. The scheduled workflow now reads `price_ingest_runs.source_built_at`
and passes it in via `--last-built-at`; the local file remains the default for manual
runs.

Two details that are easy to get wrong and are worth stating:

- **The comparison had to stop being string equality.** tcgcsv writes
  `2026-08-08T20:05:59+0000`; Postgres renders that same instant back through `psql` as
  `2026-08-08 20:05:59+00`. Those strings are never equal, so a naive port would have
  re-ingested every scheduled run forever while looking like it worked. The check now
  parses both and compares instants.
- **CI runs must not write the local state file.** Doing so would mark a build ingested
  at SQL-generation time — before `psql` has run — so a failed apply would be recorded
  as a success and the day would be skipped on the retry.

## Known limitation, not yet resolved

GitHub's `schedule` trigger only fires from the repository's **default branch**. This
workflow therefore does nothing on a timer until it has been promoted through
`integration` → `beta` → `staging` → `main`. `workflow_dispatch` has the same
constraint. Until that promotion completes, the ingest is still manual and days can
still be lost.

## Required configuration

Two repository secrets, neither of which can be set from a Code session:

- `RA_DB` — Supabase **session pooler** connection string, port 5432. Not the direct
  hostname, which is IPv6-only and unreachable from GitHub-hosted runners.
- `DISCORD_WEBHOOK_URL` — failure and database-size alerts. If unset the workflow still
  runs and still fails loudly in the Actions UI; it just emits a warning instead of a
  Discord message.
