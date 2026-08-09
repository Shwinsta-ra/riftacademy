## Thread/topic: supabase-readme-runlog-scope

**Sections likely affected:** 9 (log). No feature status changes.

**Team-facing:**

Closes an open question raised by the price-ingest observability work (`2026-08-09-price-ingest-observability.md`), which flagged that `supabase/README.md` contradicted itself on scope and declined to guess.

The "Data writes are not migrations" section described the run-log pattern as including *"the target rows carrying a foreign key back to the run that produced them"*, while its own gap table listed only three `price_ingest_runs` columns and never proposed anything on `price_observations`. Read fresh, that looks like an unimplemented requirement rather than a drafting slip.

**Ashwin's ruling, 2026-08-09: the prose was the error. No FK is added to `price_observations`.** Two reasons, both now recorded in the README itself so this does not resurface:

1. `price_observations` is written with `on conflict (product_id, source_id, observed_on) do update`. A re-ingest of the same day overwrites the reference, so the column would mean "the run that *last wrote* this row", not "the run that produced it" — weaker than the name implies, and it degrades every time a day is re-ingested.
2. The traceability actually wanted is already delivered by `ci_run_id` + `commit_sha` on `price_ingest_runs` (migrations 017/018), which bound a suspect date range to the exact code and workflow execution, and that run's artifact holds the SQL applied. An FK on the largest, fastest-growing table adds nothing beyond that.

The README's gap table is also updated from "missing" to delivered — 017 for `ci_run_id`/`commit_sha`, 018 for `finished_at` — because it still read *"not yet written"* after both had shipped and been applied. Evidence: `supabase_migrations.schema_migrations` reads `20260809000017 price_ingest_run_traceability` and `20260809000018 price_ingest_run_lifecycle`, versions matching their filenames; `pg_get_constraintdef` confirms the widened status vocabulary live.

**New standing rule or convention worth capturing:**

Where a spec's prose and its own gap analysis disagree, treat that as an open question for the document's owner rather than implementing the broader reading. Implementing the prose here would have added a column to the schema's fastest-growing table on the strength of one sentence, with semantics ("last wrote" vs "produced by") nobody had actually decided. The cost of asking was one round trip; the cost of guessing would have been a migration on ~700k rows/year encoding a guarantee the column name misstates.

**Anything another thread working today should know:**

- This edits `supabase/README.md`, which landed via PR #193 earlier today. It is a correction to that document, not a competing one — no content is superseded or deleted, and the decision is recorded inline rather than in a separate file.
- The README now also records the deployment-ordering constraint the price-ingest work hit: schema columns must exist in the database *before* the workflow writing them reaches `main`, or the run-row statement aborts and takes the day's ingest transaction with it. That generalises to any future change of the same shape.
