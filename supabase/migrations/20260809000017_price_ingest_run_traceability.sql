-- RiftAcademy Supabase - Migration 017: price_ingest_runs traceability
--
-- Authority: Infra handoff, 2026-08-09, from Code's own Supabase directory review.
--
-- price_ingest_runs already records WHAT an ingest did (rows_in, rows_kept,
-- printings_matched, status). It does not record WHO ran it or WHICH CODE ran it,
-- and that gap has a concrete cost. On 2026-08-06 the ingest used the machine's
-- local Pacific date instead of tcgcsv's UTC build timestamp, so observations
-- landed under the wrong day. Finding a suspect stretch of prices today tells you
-- THAT something is wrong; it does not tell you which script version wrote it, so
-- the affected date range has to be reconstructed by hand from commit dates.
--
-- These two columns close that. commit_sha bounds the blast radius of a defect to
-- the exact code that produced the rows; ci_run_id leads to that workflow run's
-- logs and, more usefully, to the generated SQL uploaded as its artifact - the
-- literal statements that were applied that day.
--
-- Both are deliberately NULLABLE, and NULL is meaningful rather than missing:
-- it means the run did not come from CI. Manual runs have no GitHub run and no
-- checked-out commit, so there is nothing truthful to record. This is why the
-- columns are not backfilled with a placeholder - `where ci_run_id is null` is
-- the query that finds every hand-applied run in the history, and filling it with
-- 'manual' or -1 would make every row look CI-produced and destroy that signal.
--
-- The two rows that exist when this lands (2026-08-06 and 2026-08-09's catch-up)
-- were both applied by hand and correctly read NULL.
--
-- text rather than bigint for ci_run_id: it is an opaque identifier we only ever
-- echo back into a URL, never do arithmetic on, and keeping it text leaves room
-- for the run_id/run_attempt form without another migration.

alter table price_ingest_runs
  add column if not exists ci_run_id  text,
  add column if not exists commit_sha text;

comment on column price_ingest_runs.ci_run_id is
  'GitHub Actions run id (github.run_id) that produced this row. NULL means the run '
  'was NOT from CI - a manual/local ingest. NULL is meaningful, not missing data: '
  'query `where ci_run_id is null` to find every hand-applied run. Resolve to a run '
  'at https://github.com/Shwinsta-ra/riftacademy/actions/runs/<ci_run_id>, whose '
  'artifact holds the exact SQL applied.';

comment on column price_ingest_runs.commit_sha is
  'Commit SHA the runner checked out (github.sha), i.e. the exact version of '
  'scripts/ingest_tcgcsv.py that produced this row. NULL means a manual run. Use '
  'this to bound which date ranges a given ingest defect could have affected.';
