## Thread/topic: price-ingest-github-actions

**Sections likely affected:** 3 (feature tracker — price/market data pipeline), 9 (log), and Section 0 if the promotion to `main` is treated as blocking

**Team-facing:**

Two separate things happened: a data gap was closed by hand, and the automation that prevents it was built.

**1. Data gap — one of two missing days was recovered, one is gone for good.**

Verified live against Supabase (project `aqhtqgiwvcunbllmbdrq`) that `price_observations` held only `2026-08-06` (1,987 rows). Both `2026-08-07` and `2026-08-08` were absent.

tcgcsv publishes only its current build and has no backfill endpoint, so:
- **`2026-08-07` is permanently lost.** Nothing can recover it.
- **`2026-08-08` was recovered** — it was still the current build (`2026-08-08T20:05:59+0000`) when this ran. `price_observations` now shows 1,986 rows for `2026-08-08`, and a matching `price_ingest_runs` row was written.

Evidence: `select observed_on, count(*) from price_observations group by observed_on` → `2026-08-06: 1987`, `2026-08-08: 1986`.

Three products that tcgcsv served today did not exist in `priceable_products` yet and were inserted as part of the catch-up, or their observations would have been silently dropped by the join: `678690` Spiritforged Pre-Rift Event Kit (sealed), `689191` Rek'sai - Void Burrower (Metal) (Prize Wall) (`opp-187-221`), `710699` Riven - Shattered (`pr-041a-166`, Foil).

Note on method: the catch-up was applied through the Supabase MCP connector, not `psql`, because no `RA_DB` connection string exists on this machine. The generated `price_ingest_2026-08-08.sql` was rewritten into bulk-insert form to do it. This is a one-off; the automation uses `psql` as designed.

**2. Automation — built, but not yet live.**

New workflow `.github/workflows/price-ingest.yml`: daily at 21:00 UTC, generate SQL → apply with `psql -v ON_ERROR_STOP=1` → verify rows landed → upload the SQL as a 90-day artifact → check DB size (alert at 350 MB against the 500 MB free-tier ceiling; currently 14 MB) → Discord alert on failure. Decision record for why GitHub Actions rather than Supabase Edge Functions or `pg_cron` is committed at `docs/design/2026-08-08-price-ingest-automation-runtime.md`.

`scripts/ingest_tcgcsv.py` gained `--last-built-at`. The high-water mark used to live in `~/.riftacademy_tcgcsv_state.json`, which cannot survive an ephemeral runner; CI now reads `price_ingest_runs.source_built_at` and passes it in. Manual runs are unchanged and still use the local file.

**New standing rule or convention worth capturing:**

When a value crosses the Python/Postgres boundary and gets compared, compare parsed values, not strings. tcgcsv writes `2026-08-08T20:05:59+0000`; `psql` renders that same instant back as `2026-08-08 20:05:59+00`. A direct port of the old string-equality check would have re-ingested on every single scheduled run while appearing to work correctly. This is now covered by `already_ingested()` / `parse_ts()` in the ingest script.

**Anything another thread working today should know:**

- **The workflow does not run yet, and this is the important caveat.** GitHub's `schedule` trigger only fires from the repository's **default branch**, and `workflow_dispatch` requires the file to be on `main` too. Until this PR is promoted `integration` → `beta` → `staging` → `main`, the ingest is still manual and days can still be lost the same way `2026-08-07` was. Anyone treating this task as "done" before that promotion completes is wrong about the risk.
- **Two repository secrets must exist before the first run, and only Ashwin can set them:** `RA_DB` (Supabase **session pooler** string, port 5432 — not the direct hostname, which is IPv6-only and unreachable from GitHub runners) and `DISCORD_WEBHOOK_URL`. Without `RA_DB` the workflow fails immediately with an explicit error rather than silently doing nothing.
- Another session was editing `CLAUDE.md` and `docs/handoffs-code-inbox/` in this same working tree while this work was in progress. Those changes are deliberately **not** part of this PR.
