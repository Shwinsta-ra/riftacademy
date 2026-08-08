# Daily Update Fragment

## Thread/topic: riftiq-puzzle-schema

**Sections likely affected:** 2 (Shipped features), 3 (feature tracker), 9 (log)

**Customer-facing:**
Nothing user-visible yet. This is the database groundwork RiftIQ daily puzzles will be built on — no app surface ships with it.

**Team-facing:**

Three SQL files that had been sitting uncommitted in the working tree are now in the repo. Two are migrations, one is a read-only diagnostic script.

| File | What it is |
|---|---|
| `docs/contracts/RiftIQ_to_M9_Puzzle_Storage_Spec_v2.md` | The source spec both migrations implement |
| `supabase/migrations/20260806000013_riftiq_puzzle_content.sql` | 7 puzzle **content** tables (protected partition) |
| `supabase/migrations/20260806000014_riftiq_puzzle_attempts.sql` | 1 puzzle **attempts** table + the database's first RLS policies |
| `supabase/seed/ligature_encoding_audit.sql` | Read-only encoding audit for the Core Phase 4 Stage 1 gate |

**The source spec is now committed.** `RiftIQ_to_M9_Puzzle_Storage_Spec_v2.md` (RiftIQ → M9,
v2, 2026-08-06, M9 technical review incorporated) lands in `docs/contracts/` — a contract rather
than a design doc because M9 is on the other side of it and must comply. Both migration headers
were updated to cite the committed path, so the reference now resolves. The spec carries material
the DDL comments do not: the `board_state` jsonb schema (§4), the offline pipeline (§5), the
ban-join predicate with the nullable-`mode` trap (§6.3), and the authoring workflow and
lightweight-validator gate list (§10).

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

**DDL checked against the spec (2026-08-08).** All seven tables in migration 013 match §3.1–3.6
plus the `puzzle_question_modes` reference table. Every CHECK vocabulary matches the spec
verbatim: `role` (all 9 values, §3.2), `verdict` (§3.3), `provenance`, `authoring_status`,
`format`, `verification_method` (§3.1). Migration split matches §9.4 (013 content, 014 attempts
with RLS). §9.3's three mechanism rulings are all honoured — reference table for `question_mode`,
CHECK for the rest, partial unique index rather than a trigger for one-correct-answer.

One internal inconsistency in the spec, now **corrected**: §3.1 described `format` as "FK-checked"
while §9.3 resolves it to a CHECK constraint. §3.1 was corrected to match §9.3, the
decision-of-record section, with a dated correction note in the spec header. No behaviour change —
migration 013 already implements `puzzles_format_valid` as a CHECK, so only the prose disagreed
with itself.

**PROCESS INCIDENT — a merged PR silently dropped a commit.** Worth knowing because it will
recur. PR #175 was pushed a second commit (the spec). GitHub's PR object went stale: the branch
ref on the server was at `e6f6645` while the PR's `head.sha` still reported `008c46b`, and it
never caught up. Merging the PR merged the **stale head**, so the spec commit was never merged
even though the PR looked complete. Nothing errored and nothing warned.

Caught by Ashwin asking for a re-verification, not by any check. Recovered by cherry-picking
`e6f6645` onto a fresh branch; the commit was intact on the origin branch the whole time.

**The lesson, generalised: after pushing to an open PR, verify the PR's `head.sha` matches the
pushed commit before merging.** The two are not the same object and can disagree:

```
git rev-parse HEAD
gh api repos/OWNER/REPO/pulls/N --jq .head.sha
```

If they differ, the PR is not ready to merge regardless of what the UI shows. A green check mark
on a PR is a statement about the head it *thinks* it has.

**Verification performed on this PR:** every FK target confirmed to exist in an earlier migration —
`modes` and `keywords` in `20260805000001_reference.sql:9,34`; `cards` and `card_printings` in
`20260805000002_cards.sql:7,93`; `card_bans` in `20260805000003_legality.sql:13`; `analysis_tags`
in `20260805000005_analysis.sql:5`; `priceable_products` in `20260806000010_market_price_history.sql:52`.
Migration numbering 013/014 follows 012 with no gap or collision (`ls supabase/migrations`).
**Not verified:** these migrations have not been applied against a live Supabase instance from this
session — the check above is static, not an execution result.

**Anything another thread working today should know before touching related code:**

- **Content loading is a separate, later-numbered migration** (§9.4, §10.6). Expect periodic
  content-load migrations after 013/014, not a single one — batches of 10–20 puzzles land per
  load, every week or two (§10.1).
- **The closure check must be implemented once and run twice** (§6.2, §10.6): the content build
  (RiftIQ) and a database-side assertion in the load migration (M9) share one implementation. Two
  reference classes are unenforced by Postgres and both must be closed — `card_code` strings and
  `puzzle_guided_steps.anchor` values.
- **The ban-awareness join has a live trap** (§6.3): `card_bans.mode` is nullable and NULL means
  "all modes" (10 of 11 current rows). A plain equality join silently misses them — the same bug
  that invalidated Core's original `card_bans` primary key. The correct predicate is in §6.3.
- **A puzzle referencing a `card_code` absent from the artifact renders as a blank card offline.**
  Per §5 the Supabase-to-artifact drift check must treat this as a **build failure, not a
  warning** — a silent failure at a venue with no connectivity is the worst place for it.
- **Kernel verification needs M10 clearance before the harness is wired** (§9.7). Storing puzzles
  invokes no kernel and is unaffected, but the Riot API application declares no general rules
  engine within its four declared features.
- If RiftCoach wants puzzle performance for KPIs, it should **read `puzzle_attempts`** rather than
  define its own table, so the no-cross-user-comparison constraint from the Riot API application is
  implemented once rather than twice.
- Daily puzzles are duel-only at launch (Ashwin, 2026-08-06). That is a population decision, not a
  schema one — `puzzle_schedule` is keyed on `game_mode` and needs no change when other modes land.
