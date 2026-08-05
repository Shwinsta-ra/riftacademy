-- RiftAcademy Supabase — Migration 006: narrow card_keywords primary key
--
-- Amends migration 002. That migration has been applied and is therefore immutable;
-- this file carries the change instead.
--
-- Authority: RiftCore confirmation 2026-08-05. `card_keywords.sequence` is CARD-WIDE
-- printed order, not a per-keyword instance counter. Core granted M9 latitude to narrow
-- the primary key as a physical choice.
--
-- Why narrow: migration 002 shipped primary key (card_code, keyword, sequence) plus a
-- separate unique (card_code, sequence). The latter is strictly stronger than the former,
-- so the three-column key enforced nothing additional while costing a second index on
-- every write. Collapsing to (card_code, sequence) gives identical enforcement with one
-- index instead of two.
--
-- Statement order is deliberate. The redundant unique constraint is dropped LAST so that
-- uniqueness on (card_code, sequence) is continuously enforced and there is no window in
-- which a duplicate could be inserted.

alter table card_keywords
  drop constraint card_keywords_pkey;

alter table card_keywords
  add constraint card_keywords_pkey primary key (card_code, sequence);

alter table card_keywords
  drop constraint card_keywords_printed_order_uniq;

-- Supersedes the provisional note left in migration 002, which flagged the per-keyword
-- versus card-wide ambiguity as open. Core has now closed it.
comment on column card_keywords.sequence is
  'Card-wide printed order, NOT a per-keyword instance counter (confirmed by Core 2026-08-05).
   Printed order is a property of the card: a per-keyword counter would collapse
   [Quick-Draw] [Equip (R)] to sequence 1 for both and destroy their relative ordering.
   Duplicate keyword instances are handled naturally, a second Deathknell is simply a later
   sequence number. The seed must number across all of a card printed keywords without
   restarting per keyword.
   Primary key narrowed from the Core logical spec (card_code, keyword, sequence) to
   (card_code, sequence) in migration 006, under the physical-choice latitude Core granted.
   The `keyword` element of the wider key was defensive redundancy, not a signal of
   per-keyword counting.';
