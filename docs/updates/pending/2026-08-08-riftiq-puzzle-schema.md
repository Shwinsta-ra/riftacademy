# Daily Update Fragment

## Thread/topic: riftiq-puzzle-schema

**Sections likely affected:** 2 (Shipped features), 3 (feature tracker), 9 (log)

**Customer-facing:**
Nothing user-visible yet. This is the database groundwork RiftIQ daily puzzles will be built on — no app surface ships with it.

**Team-facing:**

Three SQL files that had been sitting uncommitted in the working tree are now in the repo. Two are migrations, one is a read-only diagnostic script.

| File | What it is |
|---|---|
| `supabase/migrations/20260806000013_riftiq_puzzle_content.sql` | 7 puzzle **content** tables (protected partition) |
| `supabase/migrations/20260806000014_riftiq_puzzle_attempts.sql` | 1 puzzle **attempts** table + the database's first RLS policies |
| `supabase/seed/ligature_encoding_audit.sql` | Read-only encoding audit for the Core Phase 4 Stage 1 gate |

**013 — puzzle content.** `puzzle_question_modes`, `puzzles`, `puzzle_cards`, `puzzle_answers`,
`puzzle_guided_steps`, `puzzle_rules_refs`, `puzzle_schedule`. RLS enabled on all seven, no
policies (content is public/read-through-artifact). Design points worth carrying forward:

- **`puzzle_cards` is the referential-integrity backbone.** Every `card_code` appearing anywhere
  in `board_state` or `puzzle_answers` must have a row here. It is what answers "which puzzles
  reference a card that was just banned or errata'd" without parsing jsonb.
- **Card references inside `board_state` jsonb have no FK** and Postgres will not catch a bad
  code. The only defence is the board-to-junction closure check, which must run in **both** the
  RiftIQ content build and the M9 load migration.
- **No stored judgments.** No `is_valid`, `is_legal`, `is_solvable`, no stored effective Might.
  Validity is recomputed at every build.
- **`question_mode` is deliberately not named `mode`** — `puzzles.game_mode` already FKs the CR
  modes table (CR 483–489). Both live on the same row and confusing them would be silent.
- **`puzzle_id` is immutable once shipped.** Human-readable slug (`calm-1`, `ven-v1`), not a UUID.
  Five tables FK to it. Rename the title, never the id.
- At most one correct answer per puzzle is enforced structurally by a partial unique index; *at
  least* one is a build-time check, not a trigger (deliberate — triggers are invisible at read time).

**014 — puzzle attempts.** Split from 013 on purpose: it is the one puzzle table needing real RLS
before launch, and a policy bug should never be confusable with a content-load bug. Not protected
under change detection (per-user churn). SELECT and INSERT policies scoped to `auth.uid()`; **no
UPDATE or DELETE policy by design** — an attempt is an immutable historical record. `is_correct`
is denormalised at attempt time so an errata never retroactively rewrites history.

**This is the first table in the database with RLS policies**, and the pattern set here is meant
to be reused for user profiles and any other per-user table.

**Offline is the reason for the content/attempts split.** Puzzle content is emitted into the
committed artifact so puzzles work with no connectivity at a venue (LA Regional Qualifier,
2026-09-25). Supabase is the source of truth; the artifact is the runtime. Attempts are online-only.

**Encoding audit script.** `supabase/seed/ligature_encoding_audit.sql` is read-only, run manually,
and follows on from the ligature findings in PRs #172–#174. Its most important line is an
interpretation warning, not a query: a ligature showing up as an unmatched bracketed token reads
like an *unknown keyword*, and the natural fix — adding it to the vocabulary — would silently
enshrine a ligature as a 26th keyword. Any finding must be reported as an **encoding fault**.

**Verification performed on this PR:** every FK target confirmed to exist in an earlier migration —
`modes` and `keywords` in `20260805000001_reference.sql:9,34`; `cards` and `card_printings` in
`20260805000002_cards.sql:7,93`; `card_bans` in `20260805000003_legality.sql:13`; `analysis_tags`
in `20260805000005_analysis.sql:5`; `priceable_products` in `20260806000010_market_price_history.sql:52`.
Migration numbering 013/014 follows 012 with no gap or collision (`ls supabase/migrations`).
**Not verified:** these migrations have not been applied against a live Supabase instance from this
session — the check above is static, not an execution result.

**Anything another thread working today should know before touching related code:**

- **`RiftIQ_Puzzle_Storage_Spec.md` v2 (2026-08-06) is cited as the source spec in both migration
  headers but does not exist anywhere in the repo** (`grep -ril "Puzzle_Storage_Spec"` matches only
  the two migrations themselves). Under the 2026-08-06 standing rule, a document another module
  implements against belongs in `docs/contracts/`. Whoever holds that spec should commit it — right
  now the migration comments are the only surviving record of its rulings.
- If RiftCoach wants puzzle performance for KPIs, it should **read `puzzle_attempts`** rather than
  define its own table, so the no-cross-user-comparison constraint from the Riot API application is
  implemented once rather than twice.
- Daily puzzles are duel-only at launch (Ashwin, 2026-08-06). That is a population decision, not a
  schema one — `puzzle_schedule` is keyed on `game_mode` and needs no change when other modes land.
