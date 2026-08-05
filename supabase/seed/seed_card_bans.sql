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

-- Verification gate, retained at Core's instruction. Expect exactly 4 rows.
-- A lower count means a name failed to match, which usually means the section 6 name
-- normalization has not run. That is a seed failure, not an acceptable silent outcome.
do $$
declare n int;
begin
  select count(*) into n from card_bans;
  if n <> 4 then
    raise exception 'card_bans seed produced % rows, expected 4. A card name failed to match; check that the section 6 name normalization has run.', n;
  end if;
end $$;
