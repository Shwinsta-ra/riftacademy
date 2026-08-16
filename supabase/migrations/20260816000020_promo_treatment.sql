-- RiftAcademy Supabase - Migration 020: card_printings.promo_treatment
--
-- Authority: RiftCore_Decisions.md, decision B16 (OP printing treatment
-- discriminator, 2026-08-14 evening). Implementation checklist:
-- Code/promo-op-codes/implementation_spec.md.
--
-- THE PROBLEM. 32 OP (Organized Play) collector numbers each carry 2-3
-- physically distinct products, distinguished only by a name parenthetical -
-- "(Metal) (Prize Wall)" vs "(Metal) (Best Of)" vs "(Champion)" vs "(Top 8)".
-- printing_variant's value set (base/foil/alt_art/signed/ultimate/special)
-- holds none of these. Backfilling card_printings for OP without a
-- discriminator would silently collide several real products onto one
-- printing_code, converting today's honest NULL gap into a WRONG JOIN on some
-- of the highest-value rows in the catalogue - 10 of the top 15 most valuable
-- printings sit on ambiguous OP codes.
--
-- WHY A SECOND COLUMN RATHER THAN MORE printing_variant VALUES. B16 rejected
-- extending printing_variant: it already carries real semantic weight in
-- Finance's foil-vs-base pricing logic, and two of the four observed
-- treatments (Champion, Top 8) describe DISTRIBUTION CONTEXT, not a print-run
-- characteristic like foil. Conflating them would make printing_variant mean
-- two different kinds of thing depending on set. Note this is also why the
-- 007 comment's "single-value by design" escape hatch (text -> text[]) is NOT
-- the right lever here: that hatch is for COMBINED treatments on one axis, and
-- this is a second axis.
--
-- STORED VERBATIM. The parenthetical is a first-class identity component, not
-- disposable formatting, so it is never normalised away or stripped. The
-- slugified form belongs in the printing_code (see the v3 spec's new section
-- 3b), not in this column.
--
-- BACKFILL IS DELIBERATELY NOT ATTEMPTED HERE. The actual product-to-treatment
-- mapping depends on tcgplayer_groups, which is Infrastructure's data, not
-- Core's and not derivable from B16. Per B16's explicit routing this migration
-- ships the schema only, leaving card_printings with zero OP rows - the same
-- honest-NULL state as today (verified live 2026-08-16: set_code is one of
-- OGN/OGS/SFD/UNL/VEN only, zero OP rows). Guessing treatment strings to make
-- progress is exactly the failure mode B16 was written to prevent.

begin;

alter table card_printings add column promo_treatment text;

-- An empty string is NOT a spelling of "no treatment". Under the coalesce in
-- the index below, '' and NULL map to the same key, so allowing '' would
-- silently reintroduce the very collision this migration exists to close -
-- and would do it invisibly, since the row would look populated. Reject it at
-- the boundary rather than relying on every future writer to remember.
alter table card_printings
  add constraint card_printings_promo_treatment_nonblank check (
    promo_treatment is null or length(btrim(promo_treatment)) > 0
  );

-- IDENTITY, NOT AN ATTRIBUTE (B16). coalesce() is load-bearing: under standard
-- SQL NULL-inequality semantics a plain multi-column unique index treats every
-- NULL as distinct, so an index on (..., promo_treatment) would let unlimited
-- NULL-treatment rows collide on the same physical identity - i.e. it would
-- enforce nothing precisely where OP rows land. Mapping NULL to '' closes that.
--
-- Column names differ from B16's prose, which wrote (set_id, collector_number,
-- variant, ...). The live table has no set_id or variant; the real columns are
-- set_code, collector_number and printing_variant. Same three concepts.
--
-- FINDING, recorded rather than glossed: B16 and the implementation spec both
-- say "replace or supplement THE EXISTING uniqueness constraint". There is no
-- existing one. card_printings has only its printing_code primary key (see
-- 20260805000002_cards.sql), and printing_code is a derived string, so nothing
-- has ever stopped two rows describing the same physical printing under two
-- different codes. This index is therefore strictly NEW and strictly stricter,
-- not a replacement - which is a bigger change than "supplement" implies and is
-- called out here so nobody later reads it as a no-op refactor.
--
-- Verified safe against live before writing (2026-08-16): card_printings holds
-- 1,165 rows and 1,165 distinct (set_code, collector_number, printing_variant)
-- triples, so this index builds on live without a uniqueness violation. It is
-- an assertion about today's data, not a proof about tomorrow's; the guard
-- below re-checks at apply time on whatever database it actually runs against.
create unique index card_printings_identity_uniq
  on card_printings (
    set_code, collector_number, printing_variant, coalesce(promo_treatment, '')
  );

comment on column card_printings.promo_treatment is
  'OP (Organized Play) product treatment, stored VERBATIM as the name
   parenthetical reads - e.g. "Metal, Prize Wall". Never normalised, stripped,
   or lower-cased: the parenthetical is a first-class identity component, not
   formatting. NULL means "no treatment", and is correct for every non-OP
   printing. Empty string is rejected by card_printings_promo_treatment_nonblank
   because '''' and NULL share a key under card_printings_identity_uniq.
   Part of printing identity, not a loose attribute: it participates in
   card_printings_identity_uniq and its slugified form is appended to
   printing_code (RiftCore_PrintingCode_Spec_v3.md section 3b).
   Populating this for OP rows requires Infrastructure''s tcgplayer_groups
   product mapping - do NOT guess values to fill it (RiftCore_Decisions.md B16).';

-- Replay-safety, per the lesson recorded in 015: assert an invariant that holds
-- on a fresh database as well as a populated one. A flat "expected N rows"
-- would make this migration unreplayable. The column is brand new in this same
-- transaction, so "every row has NULL" is true on an empty database and on
-- live, and is falsifiable if this file is ever edited to add a backfill
-- without updating the guard alongside it.
do $$
declare
  indexes  int;
  treated  int;
  op_rows  int;
begin
  select count(*) into indexes from pg_indexes
   where schemaname = 'public' and indexname = 'card_printings_identity_uniq';
  if indexes <> 1 then
    raise exception 'card_printings_identity_uniq was not created';
  end if;

  select count(*) into treated from card_printings where promo_treatment is not null;
  if treated <> 0 then
    raise exception 'promo_treatment is non-null on % rows; this migration adds the column and must not populate it', treated;
  end if;

  -- Acceptance criterion 4: no OP row may exist without a real treatment.
  -- Today that is satisfied vacuously (zero OP rows). Stated anyway so a later
  -- backfill landing OP rows with NULL treatments trips this on replay.
  select count(*) into op_rows from card_printings
   where set_code in ('OP', 'OPP', 'PR') and promo_treatment is null;
  if op_rows <> 0 then
    raise exception '% promo-channel printings carry no promo_treatment', op_rows;
  end if;

  raise notice 'promo_treatment added; % printings, all treatments NULL (backfill routed to Infrastructure)',
    (select count(*) from card_printings);
end $$;

commit;
