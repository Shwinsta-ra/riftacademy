-- RiftAcademy Supabase — Migration 012: Crystal Rose printings are 'special', not 'base'
--
-- Identified 2026-08-06 by Ashwin while answering RiftCore's §7.1 grammar question.
-- The six ven-sp*-006 codes are CRYSTAL ROSE variants: special printings of six
-- previously-released champion cards, numbered 1 through 6 within their own subset of 6.
--
-- WHY THEY LOADED WRONG. The seed derives printing_variant from a trailing parenthetical
-- in the source name: (Alternate Art), (Signature), (Ultimate), (Overnumbered), (Starter).
-- Crystal Rose printings carry NO parenthetical - the source names them plainly as
-- "Kai'Sa, Survivor", "Ahri, Inquisitive" and so on. So the transform saw nothing to strip
-- and defaulted every one of them to 'base'.
--
-- This is a gap in the derivation rule, not a bad row: a treatment that is signalled only
-- by the CODE and never by the NAME is invisible to a name-based parser. Recorded on the
-- asset-migration sweep task so the replacement source is checked for the same class of
-- silent treatment.
--
-- 'special' is the correct value. Core reserved it for exactly this on 2026-08-05, when
-- ruling that (Ultimate) warranted its own enum value rather than a catch-all: "'special'
-- is a catch-all, and every value that lands in a catch-all loses information - it should
-- stay empty as long as possible." Crystal Rose is the first thing to legitimately land
-- there. If Riot ships further named treatments, they get their own values on the same
-- reasoning, and this one may warrant renaming to 'crystal_rose' at that point.
--
-- NOT CHANGED, and correctly so:
--   - card_code. Crystal Rose printings are variants of EXISTING champion cards, so they
--     collapse onto the original card by name (Core adjudication 2026-08-05, Decision 4).
--     That is the intended behaviour and already happened at load.
--   - is_overnumbered. Numeric derivation gives 1..6 against a total of 6, so false for
--     all six. Correct: the total is the subset size, not the Vendetta set total of 166.

update card_printings
set printing_variant = 'special'
where printing_code in (
  'ven-sp1-006','ven-sp2-006','ven-sp3-006',
  'ven-sp4-006','ven-sp5-006','ven-sp6-006'
);

do $$
declare n int;
begin
  select count(*) into n from card_printings
   where printing_variant = 'special' and printing_code like 'ven-sp%';
  if n <> 6 then
    raise exception 'expected 6 Crystal Rose printings marked special, found %', n;
  end if;
end $$;

comment on column card_printings.printing_variant is
  'Operational, permitted under Core invariant 2.6. Replaces the earlier is_alt_art boolean.
   Values: base, foil, alt_art, signed, ultimate, special.
   DERIVATION IS NAME-BASED AND THEREFORE INCOMPLETE. The seed reads a trailing parenthetical
   from the source name. A treatment signalled only by the printing CODE is invisible to it:
   the six ven-sp*-006 Crystal Rose printings loaded as base for exactly this reason and were
   corrected in migration 012. Any future source change must be re-checked for code-only
   treatments.
   FOIL IS NOT MODELLED BY THE SOURCE and loads zero rows here; foil-ness is a property of the
   physical copy and lives on priceable_products.tcgplayer_sub_type instead.
   ESCAPE HATCH: if a combined treatment ever ships, migrate text -> text[] and wrap existing
   values. NEVER introduce compound values like "foil_alt_art" - those reintroduce parsing.
   Never consulted by any rules computation.';
