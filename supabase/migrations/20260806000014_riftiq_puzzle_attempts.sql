-- RiftAcademy Supabase — Migration 014: RiftIQ puzzle attempts (user data)
--
-- Source spec: RiftIQ_Puzzle_Storage_Spec.md v2 (2026-08-06) section 3.7.
--
-- SEPARATED FROM MIGRATION 013 DELIBERATELY. This is the one puzzle table that needs real RLS
-- policies before launch, and a policy bug should never be confusable with a content-load bug.
-- Same reasoning M9 used when deferring RLS during the card load on 2026-08-05.
--
-- NOT PROTECTED under change detection. This is per-user churn, and changing constantly is the
-- point - the card_analysis_tags precedent rather than the analysis_tags one. An alerting
-- system that fires on user activity gets muted within a week and then catches nothing.
--
-- ONLINE ONLY. Unlike puzzle content, attempts have no offline requirement and are not emitted
-- into the artifact. A player solving offline at a venue simply records nothing until the app
-- reconnects; that is acceptable and is a product decision already implied by the split.

create table puzzle_attempts (
  attempt_id         uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  puzzle_id          text not null references puzzles on delete restrict,
  chosen_answer_key  text,
  sequence_submitted jsonb,
  is_correct         boolean not null,
  used_hint          boolean not null default false,
  revealed           boolean not null default false,
  attempted_at       timestamptz not null default now()
);

create index puzzle_attempts_user_idx   on puzzle_attempts (user_id, attempted_at desc);
create index puzzle_attempts_puzzle_idx on puzzle_attempts (puzzle_id);

comment on column puzzle_attempts.is_correct is
  'DENORMALISED AT ATTEMPT TIME, AND THIS IS CORRECT. It is a fact about that attempt, not a
   claim about the puzzle. If the accepted answer later changes - an errata, a ruling, a
   re-verification - historical attempts must NOT retroactively change verdict. Recomputing
   this by joining to puzzle_answers would silently rewrite history.';

comment on column puzzle_attempts.puzzle_id is
  'ON DELETE RESTRICT, not CASCADE. A puzzle with attempt history cannot be deleted out from
   under it. Retire a puzzle by setting authoring_status, never by deleting the row.';

comment on column puzzle_attempts.chosen_answer_key is
  'For pick modes (best_line, predict_outcome). NULL for sequencing, which uses
   sequence_submitted. Deliberately NOT a foreign key to puzzle_answers: an answer key could be
   retired from a puzzle, and the attempt must still record what the user actually chose.';

alter table puzzle_attempts enable row level security;

-- POLICIES. This is the first table in the database to get them, and the pattern set here will
-- be reused for user profiles and any other per-user table.
--
-- auth.uid() returns the authenticated user's id. An anonymous request gets NULL, which matches
-- no row, so unauthenticated access reads and writes nothing rather than erroring.
--
-- No UPDATE and no DELETE policy, by design: an attempt is an immutable historical record.
-- Without a permissive policy those operations are denied, which is the intent. Do not add them
-- without deciding what it means to edit history.

create policy puzzle_attempts_select_own
  on puzzle_attempts for select
  using (auth.uid() = user_id);

create policy puzzle_attempts_insert_own
  on puzzle_attempts for insert
  with check (auth.uid() = user_id);

comment on table puzzle_attempts is
  'Per-user puzzle attempt history. RLS user-scoped: a user reads and writes only their own rows.
   RiftIQ-owned. If RiftCoach wants puzzle performance for KPIs it should READ THIS TABLE rather
   than define its own, so the no-cross-user-comparison constraint from the Riot API application
   is implemented once rather than twice.';
