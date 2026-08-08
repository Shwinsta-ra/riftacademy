# RiftIQ to M9: Puzzle Storage - Logical Data Model Spec (v2)

**Module:** M5 (RiftIQ) - **Date:** 2026-08-06 - **Status:** v2, M9 technical review incorporated (approved to build).
**Changes from v1:** ban join predicate corrected for nullable `mode` (§6.3); `format` column
added to `puzzles` (§3.1); `board_state.schema_version` added (§4); closure check now
double-enforced (§6.2); `puzzle_id` immutability comment (§3.1); the stale 918 card figure
corrected to 929 Supabase / 928 artifact / 1 expected token gap (§5); product confirmations
resolved (§9: format default constructed, daily duel-only); **authoring workflow and operating
model added (§10); **anchor closure added to the §6.2 check and §10.4 validator (guided-step
anchors are a second unenforced jsonb reference class, per M9 flag).**
**Purpose:** define how puzzle content and puzzle attempts are stored, aligned to the M9 data
model overview (2026-08-06). This is the logical POV. M9 owns the technical build and the
migration; nothing here is applied until M9 reviews it against the partition and
change-detection constraints.

Read §1 first: it answers the six questions M9 said it needs before building, because those
answers determine the whole shape.

---

## 1. Answers to M9's six questions (these drive everything below)

| # | Question | Answer |
|---|---|---|
| 1 | Do puzzles need to work offline? | **Yes.** A player solving a puzzle at the LA Regional (2026-09-25) is the exact venue case. Puzzle content belongs in the **artifact**, with **Supabase as source of truth**, same as card facts. |
| 2 | Authored in repo or database? | **Authored in the repo** as structured content files, loaded to Supabase by migration. Origin repo, source of truth Supabase, runtime artifact. Flow: **repo to Supabase to artifact.** Reasoning in §5. |
| 3 | Is content protected; is attempt history excluded? | **Yes and yes.** Puzzle content changes only via committed migration, so it is **protected** (the `analysis_tags` precedent). Attempt history is per-user churn, so it is **not** protected (the `card_analysis_tags` precedent). |
| 4 | Does a puzzle carry a `mode`? | **Yes.** `game_mode` FK to `modes.mode`, NOT NULL, default `duel`. Board state and win condition are validated against that mode's `victory_score` and `battlefield_count`. Magma Chamber scoring to 11 is handled by the reference, never hardcoded. |
| 5 | How is the accepted solution represented? | As **authored answer rows** (the correct candidate plus explanations), referencing cards by `card_code` and moves by descriptive keys. This is authored content, **not** resolved ability semantics, so **storing solutions is not blocked on Core Phase 4.** Kernel *verification* of those solutions is a separate step and stays deferred. See §7. |
| 6 | Do puzzles reference specific printings for art? | **Optionally.** Gameplay references `card_code`. A puzzle may set an optional `printing_code` per card only when a specific printing's art is intended; otherwise the app resolves the canonical printing's `image_url`. See `puzzle_cards` in §3. |

---

## 2. Placement and change detection

**Partition:** application. All puzzle tables are RiftIQ-owned operational data, not game-truth.
They read `cards`, `card_printings`, `modes`, `keywords`, `card_bans` freely and write to none
of them.

**Change-detection split, stated explicitly per the M9 criterion ("protect anything that
should only change via a committed artifact"):**

| Table | Protected? | Why |
|---|---|---|
| `puzzles` | **Yes** | authored content; changes only by migration |
| `puzzle_cards` | **Yes** | authored card references; part of the content |
| `puzzle_answers` | **Yes** | authored solution and explanations |
| `puzzle_guided_steps` | **Yes** | authored teaching text |
| `puzzle_rules_refs` | **Yes** | authored rule dependencies |
| `puzzle_schedule` | **Yes** | curated daily assignment; offline must know today's puzzle |
| `puzzle_attempts` | **No** | per-user churn; inherently online; no offline requirement |

---

## 3. The tables (logical)

Types are logical. Column names avoid the naming traps in M9 §6 (no bare `zone`; `card_code`
never `printing_code`; no `Rift<Domain>` names).

### 3.1 `puzzles` (protected)

One row per puzzle.

| Column | Type | Notes |
|---|---|---|
| `puzzle_id` | text PK | stable human-meaningful slug, like `calm-1`, `ven-v1`, `combo-findlethal`. Mirrors the `card_code` pattern of a readable stable key, not a UUID, because puzzles are cross-referenced by hand in docs and tasks. **Immutable once shipped** (column comment required): five tables FK to it and attempt history references it forever, so a rename would orphan or break history. Same rule Core applied to `card_code`. |
| `title` | text | display |
| `question_mode` | text FK to `puzzle_question_modes` | `best_line` / `sequencing` / `predict_outcome`. **Named `question_mode`, not `mode`,** to avoid colliding with the CR game `modes` table. Reference table (not CHECK) per M9 §4.3, since it plausibly grows columns of its own. |
| `game_mode` | text FK to `modes.mode` | NOT NULL, default `duel`. Resolves Q4. |
| `format` | text | `constructed` / `limited`, FK-checked, **default `constructed`**. Added per M9 §2b: the ban join needs a format to filter on, and this makes sealed and draft puzzles expressible later without a migration. |
| `theme_domains` | text[] | thematic categorization (Fury, Calm, ...). `text[]` to match `cards.domains`. Empty array means "no single-domain theme", never unknown, per the M9 empty-array convention. |
| `difficulty` | text | **authored** label: `easy` / `hard` (extensible). A fact about the author's intent, not a computed value. If a computed difficulty is ever added, it is a separate column and follows the multi-signal cross-check caution (M9 §5). |
| `goal` | text | display |
| `prompt` | text | display |
| `hint` | text NULL | display |
| `key_concept` | text NULL | display, shown on reveal |
| `board_state` | jsonb | the full structured board. Schema defined in §4. Structured, not free text: nothing parses prose here. |
| `solution_sequence` | jsonb NULL | ordered array of answer keys, for `sequencing` puzzles only. NULL for the pick-based modes. |
| `provenance` | text | `original` / `community` / `coach_brief` / `reddit`. Authored. CHECK vocabulary (small, stable, edit-by-migration) per M9 §4.3. |
| `provenance_ref` | text NULL | source URL or note |
| `verification_method` | text | `hand` / `kernel`. A fact about how it was verified at authoring time, not a claim about current validity. |
| `authoring_status` | text | workflow fact: `draft` / `ready` / `broken` / `held`. **Not** a computed "is currently legal" flag; that is never stored (M9 §5). |
| `source_migration` | text | the migration that introduced or last changed the row, for audit |
| `created_at`, `updated_at` | timestamptz | |

**Deliberately absent, per "store facts, compute judgments":** no `is_valid`, no `is_legal`, no
`is_solvable`, no stored effective Might. Validity is recomputed at build against current bans
and errata (§6); effective Might is computed from base plus modifiers at render (§4).

### 3.2 `puzzle_cards` (protected)

The referential-integrity backbone. One row per (puzzle, card, role). Every `card_code` that
appears anywhere in `board_state` or `puzzle_answers` must have a row here, enforced at build.

| Column | Type | Notes |
|---|---|---|
| `puzzle_id` | text FK to `puzzles` | |
| `card_code` | text FK to `cards.card_code` | **card, not printing.** M9 §6: puzzles are about gameplay. |
| `role` | text | where it appears: `player_unit` / `opponent_unit` / `player_hand` / `player_base` / `trash` / `legend_player` / `legend_opponent` / `answer_reference` / `battlefield`. Lets us query "puzzles where card X is the answer" vs "merely on the board". |
| `printing_code` | text FK to `card_printings.printing_code` NULL | set only when a specific printing's art is required (Q6). NULL means the app resolves the canonical printing image. |
| PK | (`puzzle_id`, `card_code`, `role`) | |

This table is what makes the whole design safe when the card pool changes: it is the join that
answers "which puzzles reference a card that was just banned, errata'd, or retired" (§6).

### 3.3 `puzzle_answers` (protected)

Candidate answers for `best_line` and `predict_outcome`. Exactly one `is_correct` per puzzle
for those modes (enforced by a partial unique index, M9's mechanism to choose).

| Column | Type | Notes |
|---|---|---|
| `puzzle_id` | text FK | |
| `answer_key` | text | stable id, like `en_garde`, `take_it`. Matches the authored candidate ids in the content docs. |
| `is_correct` | boolean | the accepted solution marker (authored fact) |
| `verdict` | text | for wrong answers: `illegal` / `loses` / `suboptimal`. Drives the UI's distinct coloring (illegal red vs loses grey). `correct` for the right one. |
| `label` | text | display |
| `explanation` | text | display |
| `sort_order` | int | |
| PK | (`puzzle_id`, `answer_key`) | |

### 3.4 `puzzle_guided_steps` (protected)

The staged comment-bubble reveal (the RiftRecall-style guided flow).

| Column | Type | Notes |
|---|---|---|
| `puzzle_id` | text FK | |
| `step_order` | int | |
| `body` | text | bubble text |
| `anchor` | text NULL | which board element the bubble points at: `piece:<instance_key>` (e.g. `piece:u_phantom`), `battlefield:<key>` (e.g. `battlefield:BF1`), or `legend:player` / `legend:opponent`. The target must resolve to an element that exists in `board_state`; this is a second class of unenforced jsonb reference and is covered by the anchor closure check (§6.2). |
| PK | (`puzzle_id`, `step_order`) | |

### 3.5 `puzzle_rules_refs` (protected)

Which CR/TR rules or named rulings a puzzle's correctness depends on. Same integrity pattern as
`puzzle_cards`, but for rules.

| Column | Type | Notes |
|---|---|---|
| `puzzle_id` | text FK | |
| `rule_ref` | text | `CR 807`, `TR 601.2`, or a named ruling id like `ruling:healing_between_combats`, `ruling:arrival_trigger_stacking`. |
| PK | (`puzzle_id`, `rule_ref`) | |

Why this earns its place: many authored puzzles depend on specific rulings that are still being
settled (damage clearing between combats, arrival-trigger stacking, showdown-pull timing). When
a ruling changes, this table answers "which puzzles must be re-verified" without parsing text.

### 3.6 `puzzle_schedule` (protected)

The daily-puzzle assignment. Curated content, and offline must know the schedule, so it is
protected and travels in the artifact.

| Column | Type | Notes |
|---|---|---|
| `schedule_date` | date | |
| `game_mode` | text FK to `modes.mode` | a daily can differ per mode |
| `puzzle_id` | text FK | |
| PK | (`schedule_date`, `game_mode`) | |

### 3.7 `puzzle_attempts` (NOT protected, user data)

Per-user attempt history. Online only, no offline requirement. RLS user-scoped when policies
are added.

| Column | Type | Notes |
|---|---|---|
| `attempt_id` | uuid PK | |
| `user_id` | uuid | auth user |
| `puzzle_id` | text FK | |
| `chosen_answer_key` | text NULL | for pick modes |
| `sequence_submitted` | jsonb NULL | for sequencing |
| `is_correct` | boolean | denormalized at attempt time (a fact about that attempt, not about the puzzle) |
| `used_hint` | boolean | |
| `revealed` | boolean | |
| `attempted_at` | timestamptz | |

RLS: a user reads and writes only their own rows. This is the one table that genuinely needs
policies before launch; the content tables are served from the artifact, not queried live.

---

## 4. The `board_state` jsonb schema

Defined precisely so it is a structured value, not unparsed text. This is the shape the
artifact serializes and the UI renders.

```
board_state = {
  schema_version: int,           // per M9 4.1: a build can reject a board shape it does not understand
  score:   { player: int, opponent: int },
  turn:    { number: int, phase: text, active: "player" | "opponent" },
  battlefields: [
    { key: "BF1", name: text, controller: "player"|"opponent"|"neutral", contested: bool }
  ],
  sides: {
    player:   <side>,
    opponent: <side>
  }
}

side = {
  legend: { card_code, empowered: bool, xp: int, tapped: bool },
  runes:  { ready_domains: [text], exhausted_count: int },
  hand:   { cards: [ hand_card ] }        // player: listed
          | { count: int },                // opponent: count only (privacy)
  counts: { deck: int, banish: int, hidden: int, trash_public: [card_code] },
  pieces: [ piece ]                        // units and gear in play
}

piece = {
  instance_key: text,          // stable within the puzzle, e.g. "u_phantom"
  card_code: text,
  location: "base" | "battlefield:BF1" | "battlefield:BF2" | ...,
  might_base: int | null,      // null for non-units
  keywords: [text],            // authored keyword instances with values, e.g. "Assault 2"
  modifiers: [ { source: text, value: int, label: text, rule_ref: text? } ],
  marked_damage: int,          // 0 default; supports the Morgana / combat-math puzzles
  status: [ "ready" | "exhausted" | "attacking" | "defending" ],
  printing_code: text | null
}

hand_card = { card_code, printing_code? }
```

Two design points that honor M9 §5:

1. **Effective Might is not stored.** A piece stores `might_base` and `modifiers[]` as authored
   facts. The UI computes `5 + 2 = 7` at render. If a rule changes so a modifier no longer
   applies, we recompute, we do not read a stale stored `7`.
2. **`location`, not `zone`.** Pieces sit at `base` or at a named battlefield, which is the CR
   play-area concept. Hand, trash, deck, banish, and hidden are represented in `hand`/`counts`,
   not as piece locations. This respects the M9 warning: where the meaning is the CR one, the
   name reflects it; the deck-section sense of `zone` never appears here.

`marked_damage` is a first-class field because the Vendetta work needs it: Morgana keys off it,
and it is the board element the current UI template cannot yet show. Putting it in the schema
now means the UI and the data agree from day one.

`schema_version` starts at 1. The artifact build rejects any board whose version it does not
recognise rather than rendering it wrong. `marked_damage` was itself a shape change forced by
Vendetta; the next one is a matter of when, not if, so the version gate is not speculative.

---

## 5. The offline pipeline and why authoring lives in the repo

The M9 model gives two established flow directions. Puzzles use both, in sequence:

```
   author (RiftIQ)                M9 migration            CI build
   structured content   ---->     Supabase        ---->  artifact (repo)
   files in the repo              (source of truth)       app reads this offline
      repo -> Supabase              Supabase -> artifact
      (drift-checked, like          (regenerated, fails on
       ability programs)             mismatch, like card facts)
```

**Origin is the repo** because authored puzzle content should be reviewable in a pull request,
the same way Core authors ability programs in the repo. A puzzle is a designed object with a
correct answer and teaching text; it deserves diff review, not a direct database insert.

**Source of truth is Supabase** so the artifact is regenerated from one place, exactly like card
facts, and the same CI that fails on card drift fails on puzzle drift.

**Runtime is the artifact** so puzzles work at a venue with no connectivity.

**Two card-identity notes M9 will need:**
- The artifact `cards.json` keys cards by an `id` in printing-code form (for example
  `ven-038-166`); the Supabase `cards` table keys by `card_code`. The puzzle artifact build must
  resolve `card_code` to whatever identity the app's card lookup uses. **Counts (corrected per
  M9's review):** Supabase `cards` is **929**; the current artifact is **928** distinct names
  (M9 reconciliation 2026-08-05); the gap is **1 row**, the `sfd-t03` token with no Master
  Inventory counterpart, which is expected and out of scope. The v1 figure of 918 was a stale
  pre-PR-127 copy of `cards.json` (it carries no banned flag at all, placing it before banned
  cards switched from deleted to flagged); there is no real 11-row drift.
- **A puzzle referencing a `card_code` absent from the artifact renders as a blank card
  offline** - a silent failure at a venue with no connectivity, the worst place for it. The
  Supabase-to-artifact drift check must treat a puzzle-referenced card missing from the artifact
  as a **build failure, not a warning** (M9 §3, endorsed).
- Because `card_code` and `printing_code` are load-bearing and must be distinct types (M9 §6),
  the content files and the artifact should carry them as named fields, never as bare strings
  that could be swapped without a type error.

---

## 6. Integrity and drift, computed not stored

Everything here is a build-time or query-time computation, never a stored flag.

1. **Card existence.** Every `puzzle_cards.card_code` must exist in `cards`. Build fails
   otherwise.
2. **Board-to-junction and anchor closure, enforced twice.** Two classes of jsonb string
   reference have no foreign key and must both be closed:
   - **Card references:** every `card_code` appearing in `board_state` or `puzzle_answers` must
     have a `puzzle_cards` row.
   - **Anchor references:** every `puzzle_guided_steps.anchor` must resolve to an element that
     actually exists in that puzzle's `board_state` - a `piece:` anchor to a real
     `instance_key`, a `battlefield:` anchor to a real battlefield `key`, a `legend:` anchor to
     `player` or `opponent`. A typo'd anchor points a callout at nothing, and Postgres will no
     more reject `piece:u_phantomm` than it rejects `ven-9999-166`.

   Both are the same defect class: a string inside a document that names something which may not
   exist. Per M9 §2c both run in **two independent places**: the content build (RiftIQ owns) and
   a database-side assertion in the load migration (M9 owns). The migration-008 precedent (40
   UPDATEs matched zero rows, reported nothing) is why a single actively-run check is not enough.
3. **Ban awareness, with the nullable-mode trap handled.** `card_bans.mode` is nullable and NULL
   means "all modes" (10 of 11 current rows). A plain equality join silently misses those, the
   same bug that made Core's original `card_bans` primary key invalid. Correct predicate:

   ```sql
   join card_bans b on b.card_code = pc.card_code
    and (b.mode is null or b.mode = p.game_mode)
    and b.format = p.format
    and b.effective_date <= current_date
   ```

   A puzzle referencing a currently banned card is **flagged for re-review**, not deleted and
   not silently invalidated. Bans change; the flag is computed each build.
4. **Errata awareness.** `cards.rules_text` is post-errata as of migration 008. A puzzle whose
   authored board predates an errata to a card it uses is flagged for re-review. Store the
   authoring timestamp and compare; do not store "still correct".
5. **Ruling awareness.** When a named ruling in `puzzle_rules_refs` changes, list the affected
   puzzles for re-verification.

This is the "store facts, compute judgments" principle applied end to end: the tables hold the
authored puzzle; validity against the current rule set is always recomputed.

---

## 7. What is authorable now versus blocked on Core Phase 4

The M9 spec is right that `card_abilities` being empty is RiftIQ's largest dependency, but it
affects **verification**, not **storage**:

| | Storable now | Kernel-verifiable now |
|---|---|---|
| Puzzles needing only cost, Might, domains, keywords | Yes | Yes, once the harness exists |
| Puzzles needing resolved ability semantics (Empower stacks, triggered/activated abilities, re-entry loops) | **Yes, hand-authored** | **No** - blocked on `card_abilities` (Core Phase 4) |

The schema stores the authored board and the authored accepted answer regardless of ability
complexity, because a modifier is recorded as an authored fact on a piece, with an optional
`rule_ref`. So the ~29 percent multi-step tail and the community combo puzzles (the Akali
re-entry set, the Find Lethal chain) are all **storable today**; they simply carry
`verification_method = hand` until the kernel can check them. Nothing about the schema is
blocked on Core.

---

## 8. Naming-trap compliance (M9 §6 checklist)

| Trap | Compliance |
|---|---|
| No bare `zone` | Used `location` for CR play areas and `deck_section`-style separation for hand/trash/counts. `zone` appears nowhere. |
| `card_code` not `printing_code` | Gameplay references are `card_code`; `printing_code` appears only as the optional art override, typed distinctly. |
| No `Rift<Domain>` names | No table or column uses a domain-colliding name. |
| `mode` collision | The game mode is `game_mode` (FK to `modes`); the interaction mode is `question_mode`. Neither is bare `mode`. |

---

## 9. Decisions (M9's four resolved in review; product confirmations remain)

**M9's four technical decisions - RESOLVED in the 2026-08-06 review, folded in above:**
1. `board_state` jsonb: **approved**, with the §6.2 double-closure condition and a
   `schema_version` field.
2. Exactly-one-correct: **partial unique index** `where is_correct` (enforces at-most-one),
   plus a build check for at-least-one. No trigger.
3. CHECK vs reference: **reference table** for `question_mode`, **CHECK** for `verdict`,
   `provenance`, `authoring_status`, `format`.
4. Migrations: **013** (content tables plus the `question_mode` reference table, all protected),
   **014** (`puzzle_attempts` with RLS). Content loading is its own later numbered migration once
   the content files exist.

**From Ashwin (product) - CONFIRMED 2026-08-06:**
5. Puzzles are **authored in the repo and reviewed** before load, not inserted directly into the
   database. The near-term workflow is the human-in-the-loop path in §10 (lightweight rules
   check now, full kernel review once generation is automated).
6. The daily mechanic is **duel-only at launch.** No schema change: `puzzle_schedule` already
   keys on `game_mode`, so this just means only duel rows are populated for now.

**Cross-module flags:**
7. **M10 (legal):** M9 §4 notes the Riot API application declares no general rules engine inside
   the four declared features, and that how RiftIQ consumes a kernel may be constrained. Storing
   puzzles does not invoke a kernel, so this spec is unaffected, but **kernel verification of
   solutions** should be cleared with M10 before the harness is wired.
8. **Core:** no new dependency created here. The schema is ready ahead of `card_abilities`;
   when Phase 4 lands, kernel verification reads `card_abilities` and flips
   `verification_method` from `hand` to `kernel` per puzzle. The artifact format Core produces
   in Phase 4 Stage 3 is where puzzle content should be emitted alongside card facts, so the two
   builds should share a step.
9. **RiftCoach / RiftRecall:** `puzzle_attempts` is RiftIQ-owned. If RiftCoach wants puzzle
   performance for KPIs, it should read this table, not define its own, to avoid the
   cross-user-comparison constraint being implemented twice.

---

## 10. Authoring workflow and operating model

This section is the operating model that fills the tables in §3. It is deliberately
low-effort for the first phase (roughly the first 50 to 100 puzzles, next few months) and is
designed so that automating puzzle generation later is a swap-in, not a rewrite.

### 10.1 Two cadences, deliberately decoupled

The friction in a repo-authored model is the git and CI round trip. We remove almost all of it
by separating how often puzzles are *created* from how often they are *loaded*.

| Cadence | Frequency | What happens | Git touched? |
|---|---|---|---|
| **Per puzzle** | whenever | draft, convert, quick rules check, approve | no |
| **Per batch** | every week or two, or before a release | 10 to 20 finished puzzles land in one commit, M9 loads them, artifact regenerates | yes, once per batch |

Ashwin authors puzzles on his own schedule. The git and pipeline work happens in batches, so
the round trip is paid maybe 6 to 8 times total across the first phase, each time for a stack,
never once per puzzle.

### 10.2 The per-puzzle steps

1. **Draft (Ashwin).** From scratch, or heavily editing a sourced puzzle (Reddit, coach brief).
   Stays in plain markdown, the format used throughout this project. This is the only creative
   step.
2. **Convert (RiftIQ thread).** The markdown draft is turned into the structured content file
   matching §3 and §4: `board_state`, `puzzle_answers`, `puzzle_guided_steps`, `puzzle_cards`,
   `puzzle_rules_refs`. Ashwin never hand-writes JSON.
3. **Quick rules check (RiftIQ thread or Claude Code).** The lightweight validator in §10.4 runs
   in-thread and reports pass or fail with reasons. Failures are fixed before Ashwin sees the
   puzzle as done. Each puzzle is stamped `verification_method = 'hand'`.
4. **Approve (Ashwin).** Reviewed as a rendered PNG on mobile (per the standing PNG-only rule),
   then shipped or sent back with edits.

### 10.3 The two gates: now versus later

The validator is a real gate, not a placeholder. It catches the defects actually hit during
authoring: the V3 threshold break, domain-illegal decks, wrong-speed answers, silent
legend-passive interference. It simply does not *simulate* the game.

| | Now (lightweight) | Later (full) |
|---|---|---|
| Who runs it | RiftIQ thread or Claude Code, a script | the Core rules engine (kernel) |
| What it proves | cards exist, board legal, exactly one correct answer, speeds and phases valid, gates A to I | plays the solution out and proves it wins under the rules |
| Depends on | `cards.json` facts only | `card_abilities` populated (Core Phase 4) |
| Stamp on the puzzle | `verification_method = 'hand'` | flips to `'kernel'` |

The upgrade is per-puzzle and non-destructive: when the kernel lands, it re-verifies existing
puzzles and flips the stamp; nothing is re-authored.

### 10.4 What the lightweight validator checks

Runs against a single content file plus `cards.json`. This is the scripted form of the §2
validation checklist from the Batch 1 work, so the standard is already defined.

1. **Card existence** - every `card_code` in `board_state`, `puzzle_answers`, and `puzzle_cards`
   exists in `cards.json`.
2. **Closure** - every `card_code` in `board_state` or `puzzle_answers` has a `puzzle_cards`
   row, and every `puzzle_guided_steps.anchor` resolves to a real `board_state` element (a
   `piece:` to an `instance_key`, a `battlefield:` to a battlefield `key`, a `legend:` to a
   side). This is the §6.2 build-side half; both reference classes are checked.
3. **Domain legality (gate A)** - every controlled or held card sits inside its side's legend
   domains, or is colorless.
4. **Board completeness (gate B)** - both sides have score, legend, runes, hand or count, and
   the required counts; every battlefield is named with a controller.
5. **Exactly one correct answer** - for `best_line` and `predict_outcome`, exactly one
   `is_correct`; for `sequencing`, a `solution_sequence` is present and none is `is_correct`.
6. **Speed versus phase** - any card in the accepted solution that must act during the
   opponent's turn is `Reaction` or `Action`, never `Normal`. (The standing rule from the
   Vendetta work.)
7. **Legend-passive audit (gate G)** - both legends' abilities are checked against the board;
   XP is stated where a legend has XP-gated abilities.
8. **Point-race safety (gate H)** - the opponent's maximum points this turn cannot end the game
   before the solution resolves, computed against the mode's `victory_score`.
9. **Mode consistency** - `game_mode` is a real `modes` row and the board's `battlefield_count`
   and `victory_score` assumptions match it (Magma Chamber scores to 11, not 8).
10. **schema_version** - present and recognised.

Checks 7 and 8 are the ones that silently broke puzzles before, so they are gates, not warnings.
Anything the lightweight validator cannot prove (that a multi-step line actually resolves as
claimed) is exactly what `verification_method = 'hand'` records as not-yet-machine-verified.

### 10.5 The design rule that keeps automation cheap

**Whatever a human authors by hand, a generator must be able to emit the same way.** The
content file format (§3, §4) and the validator (§10.4) are identical whether a puzzle came from
Ashwin or from a future generator. When generation is automated, only two things change:

- the **draft** step (10.2 step 1) becomes a generator instead of a person, and
- the **gate** (10.3) upgrades from lightweight to full kernel review before ship, which is the
  point at which Ashwin wants every auto-generated puzzle machine-proven.

The tables, the pipeline, the file shape, and the daily and attempt mechanics all stay. That is
the payoff of designing the low-effort path against the same schema as the eventual automated
one, rather than as a throwaway.

### 10.6 What this asks of M9

Nothing new in the schema. The workflow lives on top of the tables already specified. The only
M9-facing implications:

- The **content build check** M9 and RiftIQ agreed to double-enforce (§6.2) is the same script
  as the lightweight validator's closure check, so they should share one implementation.
- Batches load via their own numbered migration (per §4.4, content loading is separate from
  DDL), so M9 should expect periodic content-load migrations after 013 and 014, not a single
  one.
