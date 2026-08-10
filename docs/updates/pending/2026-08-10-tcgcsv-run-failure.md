## Thread/topic: tcgcsv-run-failure

**Sections likely affected:** 9 (log)

**Customer-facing:**
None — internal CI fix, no player-visible change.

**Team-facing:**
The 2026-08-10 21:34 UTC scheduled price-ingest run failed at the "Open the run row" step with `ERROR: syntax error at or near ":"` (run https://github.com/Shwinsta-ra/riftacademy/actions/runs/31434472544/job/93605375602). Root cause: `psql -v name=value -c "... :'name' ..."` does **not** interpolate the `:'name'` colon-variable syntax — that substitution only fires when the SQL is read via stdin or `-f`, never via `-c`. The literal colon reaches the server and fails to parse. Verified by reproducing locally against a real Postgres 16.13 instance: `psql -v ci=hello -c "select :'ci'"` fails with the identical error; the same query piped via stdin or `-f` succeeds.

This was not isolated to the one step that happened to run today — all three `psql -v ... -c "... :'var' ..."` calls in `.github/workflows/price-ingest.yml` had the same bug: "Open the run row", and both branches of "Close the run row for skip or failure" (skip and failure). The failure-close branch is the one designed to record that a run died, so it was a silent single point of failure: any mid-run crash after the row opened would have failed to record `status='failed'` too, leaving the row stuck at `status='running'` forever with no failure signal beyond the Discord message. Fixed by converting all three to pipe the SQL via a `<<'SQL' ... SQL` heredoc on stdin instead of `-c "..."`, keeping the same `-v` variable declarations. Re-verified all three end-to-end against a local Postgres instance after the fix (`git show`, or diff of `.github/workflows/price-ingest.yml` in this branch — `open-run`, `skip`-branch, `failure`-branch inserts/updates all returned expected rows with correctly-substituted values including a note string containing a colon).

No code in `scripts/ingest_tcgcsv.py` or elsewhere in the repo uses this `-v`/`-c` pattern — grepped `psql.*-v` and `-c ".*:` across the repo; the only other two-column `-c` usages in the workflow (`::text`, `::bigint` casts, no `-v` vars involved) are unaffected type casts, not variable interpolation.

**New standing rule or convention worth capturing:**
Never use `psql -v name=value -c "... :'name' ..."`. The `-c` flag does not perform colon-variable interpolation — only stdin/`-f` do. Always pipe parameterized SQL into psql via a heredoc (`<<'SQL' ... SQL`) or a `-f` script file when using `-v` substitution.

**Anything another thread working today should know before touching related code:**
`.github/workflows/price-ingest.yml`'s three psql-with-variables calls now use heredocs, not `-c`. If you add a new psql step there with `-v` variables, follow the same heredoc pattern — do not add another `-c "... :'var' ..."` call.
