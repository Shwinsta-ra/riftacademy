-- RiftAcademy Supabase — Migration 011: foils are captured after all
--
-- Migration 010 shipped hours earlier stating that foils were out of scope. That is now
-- wrong, and a wrong comment is worse than no comment, so this corrects it. 010 itself is
-- applied and therefore immutable.
--
-- WHAT CHANGED. Ashwin excluded foils on 2026-08-06, reasoning that special printings are
-- foil by default and that the price delta on commons and uncommons did not justify the
-- modelling cost. M8 then measured it and the premise did not survive:
--
--   Foil / Normal market ratio: median 2.88x, mean 3.43x, p90 5.52x.
--   487 of 513 dual-priced printings have foil above 1.5x Normal.
--   Vendetta's high-value cards are FOIL-ONLY, with no Normal row at all:
--     Zed VEN-112/166, Swain VEN-065/166, Lightning Rush VEN-156/166.
--
-- The second finding is the decisive one. Excluding foils did not drop a cheap variant, it
-- left the newest set's chase cards with no price in the database whatsoever. Ashwin
-- reversed the decision the same day, before a second daily build could overwrite the
-- snapshot, since tcgcsv publishes only the current day and the loss would be permanent.
--
-- NO STRUCTURAL CHANGE WAS NEEDED. priceable_products was already keyed on
-- (tcgplayer_product_id, tcgplayer_sub_type) with no unique constraint on printing_code,
-- so both subtypes of one printing already coexist as separate rows. card_printings is
-- untouched and stays gameplay-shaped, per Core's read that foil-ness is a property of the
-- physical copy rather than the printing. That read is correct for a gameplay model and
-- wrong for a pricing model, which is exactly why the discriminator belongs on the price
-- spine and not in Core's schema.

comment on column priceable_products.tcgplayer_sub_type is
  'TCGplayer printing variant, typically Normal or Foil. Part of the product key: per
   tcgcsv docs, productId alone is "Not safe to use as a primary key. Must be combined
   into a composite key with subTypeName."
   Both subtypes of one printing share a printing_code and differ only here. Foil is not a
   separate printing in card_printings and must never become one - Core deliberately
   excluded it from the gameplay model, and many Vendetta cards exist ONLY as Foil, so a
   foil printing would need a phantom Normal counterpart that has never physically existed.
   Foil runs about 2.88x Normal at the median (M8, 2026-08-06), so collapsing the two would
   discard roughly two thirds of the value on the 37% of printings that carry both.';

comment on column price_ingest_runs.rows_skipped_foil is
  'Retained from migration 010, when foils were excluded. Now always 0: every subtype is
   captured. Kept rather than dropped so the 2026-08-06 run that predates the reversal
   stays legible in the log. The subtype breakdown for each run is recorded in notes.';

comment on table priceable_products is
  'One row per sellable thing: a printing in a given subtype, or a sealed product. One
   spine rather than two parallel tables, because sealed products arrive in the same CSV
   rows, carry the same five price fields, and want the same time series. Splitting them
   would force every query to union across two tables of identical shape.';
