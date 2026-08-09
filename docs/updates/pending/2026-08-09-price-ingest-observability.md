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

**3. The run row is now written at start and closed at finish (migration 018).**

`supabase/README.md` (PR #193) specifies the run-log pattern as *"one row per execution, written at start and completed at finish, so a crashed run is visibly incomplete rather than invisible."* The table could not express that. A row was only ever written at the **end**, inside the generated SQL, so a run that fetched for ten minutes and then died left **no row at all** — precisely the invisible case the README exists to eliminate. It also made `started_at` a misnomer: it defaults to `now()` at insert time, so it recorded when the SQL was *applied*.

The fix is timing, not naming. The workflow now opens a `status='running'` row before the fetch; the generated SQL closes it to `'ok'` in the same transaction as the observations, so a row can never claim `'ok'` unless the data actually landed. `started_at` now means what it says, and needs no rename.

Migration 018 adds `finished_at` (the third column the README's own gap table names, alongside 017's two) and widens the status vocabulary from `('ok','partial','failed')` to include `running` and `skipped`. Both new values sit deliberately outside the `where status='ok'` high-water-mark query, so neither a crashed run nor a skipped one can make the next day look already-ingested.

**Asymmetry worth knowing if you touch the close logic:** the skip path is guarded on `status='running'` so it can never overwrite an `'ok'`, but the failure path is deliberately **unguarded**. Marking a run failed when its data did land costs one redundant re-ingest, and re-ingest is idempotent. Leaving it `'ok'` when the data did *not* land advances the high-water mark, the next run skips, and that day is lost permanently. Always bias to the recoverable error.

**New standing rule or convention worth capturing:**

**NULL in `ci_run_id`/`commit_sha` is meaningful, not missing.** It means the run did not come from CI — a manual or local ingest. The columns are deliberately not backfilled with a placeholder: `where ci_run_id is null` is the query that finds every hand-applied run in the history, and filling it with `'manual'` or `-1` would make every row look CI-produced and destroy that signal. Both existing rows (2026-08-06 and the 2026-08-08 catch-up) were applied by hand and correctly read NULL. The meaning is documented in the column comments so it cannot be misread as corrupt data.

**Open item deliberately NOT built — needs an owner's call:**

The README also says the run-log pattern has *"the target rows carrying a foreign key back to the run that produced them."* `price_observations` has no such FK and this PR does not add one, for two reasons. First, the README's own gap table for `price_ingest_runs` lists exactly three missing columns (`ci_run_id`, `commit_sha`, `finished_at`) and does not mention `price_observations` at all, so the prose and the gap analysis disagree about scope. Second, there is a real design question underneath: with `on conflict do update`, a re-ingest of the same day overwrites the FK, so the column would mean "the run that *last wrote* this row," not "the run that produced it" — a weaker guarantee than the sentence implies, and worth deciding deliberately rather than inferring. Whoever owns the Supabase conventions doc should settle it.

**Anything another thread working today should know:**

- **Migrations are applied BY HAND in this project** — there is no merge-to-`main` hook (`supabase/README.md`, PR #193). Migrations 017 and 018 were therefore applied manually on 2026-08-09, ahead of the code that needs them, and recorded in `supabase_migrations.schema_migrations` under versions matching their filenames exactly.
- **Deployment ordering matters here.** Both migrations had to reach the database *before* the updated `scripts/ingest_tcgcsv.py` reaches `main`, because the new script writes `ci_run_id`/`commit_sha` and updates a pre-opened run row; those statements abort on missing columns, which would fail the whole ingest transaction and lose a day. Both are additive/nullable and the status constraint only widens, so applying them early is backward compatible with the code currently on `main`. **This is already done** — no ordering constraint remains on merging this PR.
- **Exception on the record:** `supabase/README.md` says never to apply DDL through the MCP connector. Both migrations were applied that way, on Ashwin's explicit instruction and because nothing else applies them. The harm that rule guards against — an unrecorded migration desynchronising the ledger — did not occur: `apply_migration` records the migration, and both versions were realigned to their filenames so `supabase db push` sees them as applied rather than pending.
- The workflow is live on `main` as of 2026-08-09 and the 21:00 UTC schedule is running on its own.
- Verified this session: the 20:01 UTC manual run read `2026-08-08 20:05:59+00` from `price_ingest_runs` and compared it against tcgcsv's `2026-08-08T20:05:59+0000`. Those strings are not equal; the instant-parsing check introduced in PR #191 correctly skipped. Under the old string-equality comparison this would have re-ingested — the guard is confirmed in production, not just in tests.
