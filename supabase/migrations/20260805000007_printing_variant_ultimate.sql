-- RiftAcademy Supabase — Migration 007: add 'ultimate' printing_variant
--
-- Authority: RiftCore seed dry-run adjudication 2026-08-05, Decision 1.
--
-- GATE 1 of the dry-run surfaced one unmapped name parenthetical, "(Ultimate)" on
-- unl-238-219 (Baron Nashor). Core mapped it to a NEW enum value rather than to 'special'.
--
-- Rationale, recorded here so the value is not later "cleaned up" into 'special':
-- Ultimate is the product's own name for a treatment class, not an oddity. Where the product
-- names a treatment we use its name, the same principle that governs CR vocabulary in the
-- game-truth tables. 'special' is a catch-all, and anything landing in a catch-all loses
-- information; it stays empty as long as possible. The practical consumer is collection
-- valuation, where chase-tier treatments must be queryable without string archaeology.
--
-- This one-line change is the reason printing_variant was built as a CHECK constraint rather
-- than a Postgres enum type.

alter table card_printings
  drop constraint card_printings_variant_valid;

alter table card_printings
  add constraint card_printings_variant_valid check (
    printing_variant in ('base','foil','alt_art','signed','ultimate','special')
  );

comment on column card_printings.printing_variant is
  'Operational, permitted under Core invariant 2.6. Replaces the earlier is_alt_art boolean.
   Values: base, foil, alt_art, signed, ultimate, special.
   Single-value by design: treatments are currently mutually exclusive, so invalid states are
   unrepresentable rather than merely prohibited.
   ESCAPE HATCH: if Riot ever ships a combined treatment (foil alt-art etc.), the designated
   path is a mechanical text -> text[] migration wrapping existing values in arrays.
   NEVER introduce compound values like "foil_alt_art" - those reintroduce parsing.
   Derived from the printing-code suffix ONCE at seed time. Seed-time parsing is permitted;
   query-time parsing never (invariant 3).
   FOIL IS NOT MODELLED BY THE SOURCE and loads zero rows. Core observation 2026-08-05:
   foil-ness is a property of the physical copy, not of the printing. The value is retained as
   future-proofing, but if foil copies ever need tracking that is an INVENTORY-level attribute
   and must not be forced into this column.
   Never consulted by any rules computation.';
