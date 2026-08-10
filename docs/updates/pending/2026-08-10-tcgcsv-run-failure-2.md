## Thread/topic: tcgcsv-run-failure (part 2 - command tag leak)

**Sections likely affected:** 9 (log)

**Customer-facing:**
None — internal CI fix, no player-visible change.

**Team-facing:**
Follow-up to the same-day fragment `2026-08-10-tcgcsv-run-failure.md`. After that fix landed on `main` (PR #217 → #218 → #219 → #220), the very next dispatched run (https://github.com/Shwinsta-ra/riftacademy/actions/runs/31436134246/job/93610557627, 21:56 UTC) failed again at "Open the run row" — but with a different error: `##[error]Unable to process file command 'output' successfully. ##[error]Invalid format 'INSERT 0 1'`.

Root cause #2: `psql -t` (tuples-only) suppresses the row-count *footer* (`(1 row)`) but does **not** suppress the command-completion *tag* (`INSERT 0 1`, `UPDATE n`) for a data-modifying statement, even when reading via stdin/heredoc. A bare `insert ... returning run_id` therefore prints two lines - the returned value, then `INSERT 0 1` - and `run_id=$(...)` captured both, producing a two-line `$run_id` that corrupted the `$GITHUB_OUTPUT` write (GITHUB_OUTPUT requires single-line `key=value`, or the `key<<DELIM` multi-line form, for any value with an embedded newline).

Reproduced locally against Postgres 16.13: `insert ... returning run_id` via heredoc/stdin reliably prints `run_id\nINSERT 0 1`. A plain `select` via the same path does not print a tag under `-t` (confirmed in the part-1 investigation) - the tag suppression applies to `SELECT`'s tag but not to DML's. Fixed by wrapping the insert in a CTE so the top-level statement is a `select`: `with ins as (insert ... returning run_id) select run_id from ins` - this reliably produces a single-line, tag-free capture. Verified locally end-to-end, including simulating the exact YAML block-scalar dedent.

The two `UPDATE ... where status='running'` statements in "Close the run row for skip or failure" (fixed in part 1) have the same tag-printing behavior, but are unaffected functionally since their output is never captured into a shell variable - the leaked `UPDATE 1` line is cosmetic log noise only, not fixed here.

**New standing rule or convention worth capturing:**
When capturing a psql `... returning ...` value via `$(...)` for use in a script (e.g. `$GITHUB_OUTPUT`), don't rely on `-t` to suppress the DML command tag - it doesn't, for INSERT/UPDATE/DELETE. Wrap the statement in a CTE and `select` from it instead: `with x as (insert/update/delete ... returning col) select col from x`. This is now the second latent psql bug found in `price-ingest.yml` in one day; the first fragment covers the `-c`-doesn't-interpolate-`:'var'` bug.

**Anything another thread working today should know before touching related code:**
`.github/workflows/price-ingest.yml`'s "Open the run row" step now uses a CTE-wrapped insert, not a bare one. If you add another psql call anywhere that captures a `returning` value into a shell variable, use the same CTE-wrap pattern.
