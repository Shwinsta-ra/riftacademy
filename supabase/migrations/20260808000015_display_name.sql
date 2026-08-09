-- RiftAcademy Supabase - Migration 015: cards.display_name
--
-- Authority: Ashwin ruling, 2026-08-08 (Core thread). Champion apostrophes
-- (CLAUDE.md: "Kaisa, Khazix, Leblanc, Reksai - no apostrophes") stay the
-- override for `name`, because `name` is the rules-semantic join key (3-copy
-- limit 103.2.b, Unique 825, Chosen-Champion identity 103.2.a.3, ban
-- application TR 601.2.a) and apostrophes cause real friction there - string
-- escaping, CSV round-trips, URL slugs, exact-match search.
--
-- But authenticity matters for what players actually see. This column
-- carries the true printed spelling for UI/display ONLY. NEVER join, match,
-- or run rules logic on this column - always use `name` for that. NULL
-- means display_name equals name (no correction needed); a non-null value
-- is self-documenting metadata for exactly which cards need special-case
-- rendering, with no separate lookup table required.
--
-- Scope: the 12 known cards covered by the champion-apostrophe rule. Not a
-- general restyling column - if another authenticity gap turns up later
-- (accents, trademark symbols, etc.), extend this same column rather than
-- adding a parallel one.

begin;

alter table cards add column display_name text;

comment on column cards.display_name is
  'Authentic printed spelling for user-facing display ONLY (e.g. Kai''Sa vs
   canonical name "Kaisa"). NEVER used for joins, matching, or rules logic -
   those key on cards.name. NULL means display_name equals name.';

update cards set display_name = 'Kai''Sa, Survivor' where card_code = 'ogn-039-298';
update cards set display_name = 'Kai''Sa, Evolutionary' where card_code = 'ogn-112-298';
update cards set display_name = 'Kai''Sa, Daughter of the Void' where card_code = 'ogn-247-298';
update cards set display_name = 'Kha''Zix, Evolving Hunter' where card_code = 'unl-119-219';
update cards set display_name = 'Kha''Zix, Mutating Horror' where card_code = 'unl-143-219';
update cards set display_name = 'Kha''Zix, Voidreaver' where card_code = 'unl-201-219';
update cards set display_name = 'LeBlanc, Deceiver' where card_code = 'unl-199-219';
update cards set display_name = 'LeBlanc, Fragmented' where card_code = 'unl-172-219';
update cards set display_name = 'LeBlanc, Everywhere at Once' where card_code = 'unl-090-219';
update cards set display_name = 'Rek''Sai, Breacher' where card_code = 'sfd-029-221';
update cards set display_name = 'Rek''Sai, Swarm Queen' where card_code = 'sfd-170-221';
update cards set display_name = 'Rek''Sai, Void Burrower' where card_code = 'sfd-187-221';

-- Replay-safety: none of the 12 target cards are inserted by any migration --
-- they arrive with the seed, which loads AFTER migrations. So on a from-scratch
-- rebuild `cards` does not contain them yet and the backfill above touches zero
-- rows. Asserting a flat "expected 12" would make this migration impossible to
-- replay on a fresh database. Instead, assert the invariant that actually
-- matters: every target card THAT EXISTS must have been backfilled.
do $$
declare
  targets   int;
  populated int;
begin
  select count(*) into targets from cards where card_code in (
    'ogn-039-298','ogn-112-298','ogn-247-298',
    'unl-119-219','unl-143-219','unl-201-219',
    'unl-199-219','unl-172-219','unl-090-219',
    'sfd-029-221','sfd-170-221','sfd-187-221'
  );
  select count(*) into populated from cards where display_name is not null;

  if populated <> targets then
    raise exception 'display_name populated on % cards, expected % (one per target card present)', populated, targets;
  end if;

  if targets <> 12 then
    raise notice 'display_name: only % of the 12 target cards are present in this database', targets;
  end if;
end $$;

commit;
