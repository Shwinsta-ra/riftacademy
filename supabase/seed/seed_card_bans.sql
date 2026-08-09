-- RiftAcademy Supabase — card_bans seed
-- MUST RUN AFTER the cards table is seeded. card_bans.card_code is a foreign key into cards.
-- MUST RUN AFTER the section 6 name normalization (comma form, treatments stripped), because
-- the name predicates below match post-transform names.
--
-- Values from RiftCore_to_M9_Supabase_DDL_AUDITED_FINAL.md section 3.6, with open items
-- resolved by RiftCore_to_M9_DDL_Signoff_2026-08-05.md section 1 (required change 2).
--
-- effective_date 2026-07-24: July Ban List Updates, verified by Core against the announcement.
--
-- Ban target confirmed by Core as the OGS Legend ogs-019-024, post-transform name
-- "Master Yi, Wuju Bladesman". "Master Yi, Wuju Master" (UNL) is a DIFFERENT card
-- (different subtitle = different name, CR 132.4) and is NOT banned.
--
-- Name verification: Core's ban list is comma-separated while CR 132.4 names are themselves
-- comma forms. Checked against the Riftcodex snapshots: "Stealthy Pursuer",
-- "The Arena's Greatest" and "Aspirant's Climb" are three separate cards, not comma-form names.

insert into card_bans (card_code, format, mode, effective_date)
select c.card_code, 'constructed', null, date '2026-07-24'
from cards c
where c.name in ('Stealthy Pursuer', 'The Arena''s Greatest', 'Aspirant''s Climb');

insert into card_bans (card_code, format, mode, effective_date)
select c.card_code, 'constructed', 'magma_chamber', date '2026-07-24'
from cards c
where c.name = 'Master Yi, Wuju Bladesman';

-- Verification gate, retained at Core's instruction: a name that fails to match is a seed
-- failure, not an acceptable silent outcome.
--
-- Reworked 2026-08-09. It previously asserted a flat "expected 4 rows", which assumed card
-- data is always present -- true while seed_cards.sql was auto-loaded, false now that it is
-- retired (see supabase/README.md). On a fresh `db reset` only migration 008's 25 cards
-- exist, none of them ban targets, so the flat assertion made `db reset` fail every time.
--
-- The invariant that survives that: every ban-target card THAT EXISTS must have produced its
-- ban row. A missing target card is a not-loaded-yet condition (notice); a present target
-- card with no ban row is a real name-matching failure (exception), which is what Core
-- actually asked to catch.
do $$
declare
  n        int;
  expected int;
begin
  select count(*) into expected from cards
  where name in (
    'Stealthy Pursuer', 'The Arena''s Greatest', 'Aspirant''s Climb',
    'Master Yi, Wuju Bladesman'
  );

  select count(*) into n from card_bans;

  if n <> expected then
    raise exception
      'card_bans seed produced % rows, but % of the 4 ban-target cards are present in cards. A card name failed to match; check that the section 6 name normalization has run.',
      n, expected;
  end if;

  if expected <> 4 then
    raise notice
      'card_bans seed: only % of the 4 ban-target cards exist in cards, so % ban row(s) were created. Expected on a fresh local db reset -- card data is no longer seeded from the repo. Load card data (see supabase/README.md), then re-run this file.',
      expected, n;
  end if;
end $$;
