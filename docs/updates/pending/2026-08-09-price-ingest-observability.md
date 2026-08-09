## Thread/topic: price-ingest-observability

**Sections likely affected:** 3 (feature tracker — price/market data pipeline), 9 (log)

**Team-facing:**

Follow-up to the price-ingest automation (PR #191, merged and now live on `main`). Two changes, both observability.

**1. The daily Discord message now always sends.**

The first build alerted only on failure. Ashwin ran the workflow manually on 2026-08-09, got nothing in `infra-alerts`, and correctly could not tell whether that meant "worked" or "never fired." That ambiguity is a real hole, not a preference: silence conflated three states — ingested a day, correctly skipped, and *never executed at all*. The third is precisely how 2026-08-07 was lost (nobody ran the ingest and nothing said so), and an alert that only fires on failure structurally cannot report the absence of a run.

There is now exactly one message per run:

- `:white_check_mark: Price ingest OK. 1988 observations for 2026-08-09. DB 14 MB / 500 MB.`
- `:fast_forward: Price ingest: nothing to do. tcgcsv has not rebuilt since <ts>, so there was no new data. DB 13 MB / 500 MB.`
- `:x: Price ingest FAILED. ... <run url>`

The 350 MB warning is appended to whichever message applies rather than being its own alert, so the count stays at one per day. The notifier cannot fail the job — a successful ingest that could not be announced is still a successful ingest, and flipping it red would itself be a false alarm.

**Known limit, accepted by Ashwin 2026-08-09:** a heartbeat sent *by* the job cannot report the job never starting — workflow disabled, Actions outage, or GitHub's 60-day-inactivity disabling of scheduled workflows. Catching that needs an external watchdog, which was explicitly declined for now. Worth revisiting if the repo goes quiet for long stretches, since the 60-day rule is a real trigger for exactly this.

**2. `price_ingest_runs` gained `ci_run_id` and `commit_sha` (migration 017).**

The ledger recorded what an ingest did but not which code did it. With `commit_sha` a suspect stretch of prices can be bounded to the exact version of `ingest_tcgcsv.py` that wrote it; with `ci_run_id` you can open that workflow run and pull the SQL artifact it uploaded — the literal statements applied. This is the same argument that kept generate-then-apply: the 2026-08-06 local-Pacific-date defect was diagnosable only because the evidence still existed.

**New standing rule or convention worth capturing:**

**NULL in `ci_run_id`/`commit_sha` is meaningful, not missing.** It means the run did not come from CI — a manual or local ingest. The columns are deliberately not backfilled with a placeholder: `where ci_run_id is null` is the query that finds every hand-applied run in the history, and filling it with `'manual'` or `-1` would make every row look CI-produced and destroy that signal. Both existing rows (2026-08-06 and the 2026-08-08 catch-up) were applied by hand and correctly read NULL. The meaning is documented in the column comments so it cannot be misread as corrupt data.

**Anything another thread working today should know:**

- **Deployment ordering matters here.** Migration 017 must be applied to the database *before* the updated `scripts/ingest_tcgcsv.py` reaches `main`, because the new script writes `ci_run_id`/`commit_sha` in its `price_ingest_runs` insert and that statement aborts if the columns do not exist — which would fail the whole ingest transaction and lose a day. The migration is additive, nullable and `add column if not exists`, so applying it early is harmless and is the safe order.
- The workflow is live on `main` as of 2026-08-09 and the 21:00 UTC schedule is running on its own.
- Verified this session: the 20:01 UTC manual run read `2026-08-08 20:05:59+00` from `price_ingest_runs` and compared it against tcgcsv's `2026-08-08T20:05:59+0000`. Those strings are not equal; the instant-parsing check introduced in PR #191 correctly skipped. Under the old string-equality comparison this would have re-ingested — the guard is confirmed in production, not just in tests.
