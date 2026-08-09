-- RiftAcademy Supabase - Migration 018: price_ingest_runs lifecycle
--
-- Authority: supabase/README.md (PR #193), "Data writes are not migrations". That
-- section specifies the run-log pattern and names exactly what price_ingest_runs is
-- missing: ci_run_id, commit_sha (migration 017) and finished_at (here). It also
-- states the property those columns exist to serve:
--
--   "one row per execution, written at start and completed at finish, so a crashed
--    run is visibly incomplete rather than invisible"
--
-- The table could not express that. A row was only ever written at the END of a run,
-- inside the generated SQL, so a run that fetched for ten minutes and then died left
-- NO row at all - the invisible case the README is trying to eliminate. It also made
-- started_at a misnomer: it defaults to now() at insert time, so it recorded when the
-- SQL was applied, not when the run began. Writing the row at the start fixes the
-- value rather than the name; started_at then means what it says.
--
-- Two changes make the lifecycle representable:
--
-- 1. finished_at. NULL means "started, never finished" - i.e. crashed or still
--    running. `where finished_at is null and started_at < now() - interval '1 hour'`
--    finds abandoned runs.
--
-- 2. The status vocabulary. It was ('ok','partial','failed'), which has no value for
--    a run that is in flight, and none for a run that correctly did nothing because
--    tcgcsv had not rebuilt. Both are now representable:
--
--      running  - row written at start; still executing, or crashed if finished_at
--                 stays null. Deliberately NOT 'ok', so it cannot advance the
--                 high-water mark that the next run reads.
--      skipped  - executed, found no new upstream build, correctly wrote nothing.
--                 Distinct from 'ok' so a skip never looks like a successful ingest.
--      ok / partial / failed - unchanged.
--
-- The high-water-mark query the workflow runs is
--   `select max(source_built_at) ... where status = 'ok'`
-- and both new values are deliberately outside that filter, so neither an in-flight
-- run nor a skipped one can cause the following day to be silently skipped.
--
-- Backward compatible in both directions: the column is nullable and the constraint
-- only ever widens, so code deployed before this migration keeps working unchanged.
-- That is what makes it safe to apply ahead of the code that uses it.

alter table price_ingest_runs
  add column if not exists finished_at timestamptz;

alter table price_ingest_runs
  drop constraint if exists price_ingest_runs_status_valid;

alter table price_ingest_runs
  add constraint price_ingest_runs_status_valid
  check (status = any (array['running'::text,'ok'::text,'skipped'::text,
                             'partial'::text,'failed'::text]));

comment on column price_ingest_runs.started_at is
  'When the run BEGAN. The row is written at start, before the upstream fetch, so a '
  'crashed run is visibly incomplete rather than absent entirely.';

comment on column price_ingest_runs.finished_at is
  'When the run completed, whatever its outcome. NULL means started and never '
  'finished - crashed, or still in flight. Find abandoned runs with `where '
  'finished_at is null and started_at < now() - interval ''1 hour''`.';

comment on column price_ingest_runs.status is
  'running = written at start, still executing (or crashed if finished_at is null). '
  'ok = ingested. skipped = ran, upstream had not rebuilt, correctly wrote nothing. '
  'partial / failed = errors. Only ''ok'' advances the high-water mark that the next '
  'run reads from source_built_at.';
