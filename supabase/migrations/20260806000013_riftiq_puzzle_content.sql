-- RiftAcademy Supabase — Migration 013: RiftIQ puzzle content tables
--
-- Source spec: docs/contracts/RiftIQ_to_M9_Puzzle_Storage_Spec_v2.md (v2, 2026-08-06),
-- M9 technical review incorporated. Committed 2026-08-08 alongside this migration.
-- Design owner: RiftIQ (M5). Physical build: M9. Partition: APPLICATION.
--
-- CHANGE DETECTION: every table here is PROTECTED. Core's corrected criterion (2026-08-06) is
-- "protect anything that should only change via a committed artifact", which is NOT the same
-- set as "CR-derived". Authored puzzle content changes only by migration, so it is protected
-- on the analysis_tags precedent. puzzle_attempts is per-user churn and is excluded; it lives
-- in migration 014.
--
-- RUNTIME: the app does NOT query these tables. Puzzle content is emitted into the committed
-- artifact so puzzles work OFFLINE at a venue with no connectivity, which is the whole point
-- (LA Regional Qualifier 2026-09-25). Supabase is the source of truth; the artifact is the
-- runtime. Flow: repo content files -> Supabase -> artifact.
--
-- STORE FACTS, COMPUTE JUDGMENTS. There is deliberately no is_valid, no is_legal, no
-- is_solvable, and no stored effective Might anywhere below. Validity against the current
-- rule set is recomputed at every build. This principle has paid off twice already: a stored
-- legality flag would have been silently wrong across 900+ rows when both the missing ban list
-- and the wholesale pre-errata rules text were found.

-- =========================================================================
-- puzzle_question_modes — reference table, not a CHECK
-- =========================================================================
-- Reference table rather than CHECK because this vocabulary plausibly grows columns of its
-- own (per-mode UI behaviour, scoring rules). CHECK is used elsewhere in this migration for
-- vocabularies that are small, stable and edited by migration.
create table puzzle_question_modes (
  question_mode text primary key,
  display_name  text not null,
  description   text
);

insert into puzzle_question_modes (question_mode, display_name, description) values
  ('best_line',       'Best Line',       'Pick the strongest available line of play'),
  ('sequencing',      'Sequencing',      'Order a set of actions correctly'),
  ('predict_outcome', 'Predict Outcome', 'Predict the result of a given line');

-- =========================================================================
-- puzzles
-- =========================================================================
create table puzzles (
  puzzle_id           text primary key,
  title               text not null,
  question_mode       text not null references puzzle_question_modes on delete restrict,
  game_mode           text not null default 'duel' references modes on delete restrict,
  format              text not null default 'constructed',
  theme_domains       text[] not null default '{}',
  difficulty          text,
  goal                text,
  prompt              text,
  hint                text,
  key_concept         text,
  board_state         jsonb not null,
  solution_sequence   jsonb,
  provenance          text not null default 'original',
  provenance_ref      text,
  verification_method text not null default 'hand',
  authoring_status    text not null default 'draft',
  source_migration    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint puzzles_format_valid check (format in ('constructed','limited')),
  constraint puzzles_provenance_valid check (
    provenance in ('original','community','coach_brief','reddit')
  ),
  constraint puzzles_verification_valid check (verification_method in ('hand','kernel')),
  constraint puzzles_status_valid check (
    authoring_status in ('draft','ready','broken','held')
  ),
  constraint puzzles_theme_domains_valid check (
    theme_domains <@ array['Fury','Calm','Mind','Body','Chaos','Order']::text[]
  ),
  -- board_state must declare its shape version so an artifact build can reject a board it
  -- does not understand rather than rendering it wrong. The shape WILL change: marked_damage
  -- was added because Vendetta needed it.
  constraint puzzles_board_versioned check (
    board_state ? 'schema_version'
  ),
  -- solution_sequence belongs to sequencing puzzles only.
  constraint puzzles_sequence_only_for_sequencing check (
    (question_mode = 'sequencing') or (solution_sequence is null)
  )
);

create index puzzles_game_mode_idx on puzzles (game_mode);
create index puzzles_status_idx    on puzzles (authoring_status);

comment on column puzzles.puzzle_id is
  'IMMUTABLE ONCE SHIPPED. A human-meaningful slug (calm-1, ven-v1, combo-findlethal), not a
   UUID, because puzzles are cross-referenced by hand in docs and tasks. Five tables foreign-key
   to it and attempt history references it forever, so a rename either cascades and orphans
   history or does not cascade and breaks it. THE SLUG IS AN IDENTIFIER, NOT A TITLE - rename
   the title, never the id. Same rule Core applied to cards.card_code, where the first-printing
   code stays fixed even if an earlier printing is later discovered.';

comment on column puzzles.question_mode is
  'The interaction type. Named question_mode, NOT mode, to avoid colliding with the CR game
   modes table (CR 483-489). Both live on this row and confusing them would be silent.';

comment on column puzzles.game_mode is
  'CR 483-489 via the modes reference table. Board state and win condition are validated against
   that mode victory_score and battlefield_count. Magma Chamber scores to 11, not 8 - never
   hardcode it, and never assume a puzzle is 1v1.';

comment on column puzzles.format is
  'Required by the ban-awareness join: card_bans.format is constructed or limited, so a puzzle
   needs a format to filter on. Defaults to constructed. Present so sealed and draft puzzles are
   expressible later without a migration.';

comment on column puzzles.theme_domains is
  'Thematic categorisation only, not a legality constraint. Empty array means NO SINGLE-DOMAIN
   THEME, never unknown - same convention as cards.domains.';

comment on column puzzles.difficulty is
  'AUTHORED label, a fact about the author intent. If a computed difficulty is ever added it
   gets its own column and must cross-check against a second signal, per the derivation
   principle: any attribute derived from one signal is blind to instances carried by another.';

comment on column puzzles.board_state is
  'Structured board, never prose. Nothing parses text here at query time.
   CARD REFERENCES INSIDE THIS DOCUMENT HAVE NO FOREIGN KEY. Postgres will not reject
   ven-9999-166 in a jsonb value. The only defence is the board-to-junction closure check, which
   must run in BOTH the content build (RiftIQ) and the load migration (M9). Two independent
   checks against one defect, because one will eventually be skipped - migration 008 shipped 40
   UPDATE statements that matched zero rows and reported nothing.';

comment on column puzzles.verification_method is
  'How the puzzle was verified AT AUTHORING TIME. Not a claim about current validity.
   Flips from hand to kernel per puzzle once Core Phase 4 populates card_abilities and the
   verification harness exists.';

comment on column puzzles.authoring_status is
  'A workflow fact, NOT a computed "is currently legal" flag. Legality is never stored.';

-- =========================================================================
-- puzzle_cards — the referential-integrity backbone
-- =========================================================================
create table puzzle_cards (
  puzzle_id     text not null references puzzles on delete cascade,
  card_code     text not null references cards on delete restrict,
  role          text not null,
  printing_code text references card_printings on delete restrict,
  primary key (puzzle_id, card_code, role),

  constraint puzzle_cards_role_valid check (
    role in ('player_unit','opponent_unit','player_hand','player_base','trash',
             'legend_player','legend_opponent','answer_reference','battlefield')
  )
);

create index puzzle_cards_card_code_idx on puzzle_cards (card_code);

comment on table puzzle_cards is
  'Every card_code appearing anywhere in board_state or puzzle_answers MUST have a row here.
   This is what makes the design safe when the card pool changes: it is the join that answers
   "which puzzles reference a card that was just banned, errata''d or retired" without parsing
   a jsonb document or any text.';

comment on column puzzle_cards.card_code is
  'CARD, NOT PRINTING. Puzzles are about gameplay, and cards.card_code is the gameplay card
   collapsed across printings. Using printing_code here would make a puzzle depend on which
   physical object was scanned.';

comment on column puzzle_cards.printing_code is
  'Set ONLY when a specific printing artwork is intended. NULL means the app resolves the
   canonical printing image. This is the one place printing identity legitimately enters a
   puzzle, and it is presentation, never gameplay.';

-- =========================================================================
-- puzzle_answers
-- =========================================================================
create table puzzle_answers (
  puzzle_id   text not null references puzzles on delete cascade,
  answer_key  text not null,
  is_correct  boolean not null default false,
  verdict     text not null,
  label       text,
  explanation text,
  sort_order  int not null default 0,
  primary key (puzzle_id, answer_key),

  constraint puzzle_answers_verdict_valid check (
    verdict in ('correct','illegal','loses','suboptimal')
  ),
  -- verdict and is_correct must agree; two fields describing one fact can otherwise drift.
  constraint puzzle_answers_verdict_agrees check (
    (is_correct and verdict = 'correct') or (not is_correct and verdict <> 'correct')
  )
);

-- Enforces AT MOST ONE correct answer per puzzle, structurally.
-- AT LEAST ONE cannot be enforced by an index and is a build-time check instead. A trigger was
-- rejected deliberately: triggers are invisible at read time and surprise people later, and the
-- content build is already where integrity is verified.
-- Permits zero, which is correct - a sequencing puzzle has no is_correct row at all.
create unique index puzzle_answers_one_correct
  on puzzle_answers (puzzle_id) where is_correct;

-- =========================================================================
-- puzzle_guided_steps
-- =========================================================================
create table puzzle_guided_steps (
  puzzle_id  text not null references puzzles on delete cascade,
  step_order int  not null,
  body       text not null,
  anchor     text,
  primary key (puzzle_id, step_order)
);

comment on column puzzle_guided_steps.anchor is
  'Which board element the bubble points at: piece:u_phantom, legend:player, battlefield:BF1.
   Ties the guided flow to board geometry. Values reference instance_key and battlefield key
   from board_state, so the closure check should cover anchors too.';

-- =========================================================================
-- puzzle_rules_refs
-- =========================================================================
create table puzzle_rules_refs (
  puzzle_id text not null references puzzles on delete cascade,
  rule_ref  text not null,
  primary key (puzzle_id, rule_ref)
);

create index puzzle_rules_refs_rule_idx on puzzle_rules_refs (rule_ref);

comment on table puzzle_rules_refs is
  'Which CR/TR rules or named rulings a puzzle correctness depends on: CR 807, TR 601.2, or
   ruling:healing_between_combats. Many authored puzzles depend on rulings still being settled
   (damage clearing between combats, arrival-trigger stacking, showdown-pull timing). When a
   ruling changes, this answers "which puzzles must be re-verified" without parsing text.
   Deliberately free-text rather than an FK: Core owns the rulings register and it is not in
   this database.';

-- =========================================================================
-- puzzle_schedule
-- =========================================================================
create table puzzle_schedule (
  schedule_date date not null,
  game_mode     text not null references modes on delete restrict,
  puzzle_id     text not null references puzzles on delete restrict,
  primary key (schedule_date, game_mode)
);

comment on table puzzle_schedule is
  'Daily puzzle assignment. Protected and travels in the artifact because OFFLINE MUST KNOW
   TODAY PUZZLE - a player at a venue with no connectivity cannot fetch the schedule.
   Keyed on game_mode so a daily can differ per mode. Duel-only at launch (Ashwin, 2026-08-06);
   that is a population decision, not a schema one, so no change is needed when other modes
   are added.';

alter table puzzle_question_modes enable row level security;
alter table puzzles               enable row level security;
alter table puzzle_cards          enable row level security;
alter table puzzle_answers        enable row level security;
alter table puzzle_guided_steps   enable row level security;
alter table puzzle_rules_refs     enable row level security;
alter table puzzle_schedule       enable row level security;
