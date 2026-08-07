-- RiftAcademy Supabase — Migration 010: market price history
--
-- Source spec: M9_Market_Price_History_Design_Input_2026-08-06.md (M8), v1.2
-- Build owner: M9. Spec and validation: M8. Consumers: M8, RiftLab, RiftCoach.
--
-- BOUNDARY RULE, narrowed by Ashwin 2026-08-06 and enforced structurally here:
--   Ashwin's PERSONAL financial data (cost basis, purchase price, P&L, ROI, sale
--   proceeds) lives in Google Drive only and never enters this database.
--   MARKET price data (what any card is worth on any site on any date) is public
--   information and belongs here.
--   The test is WHOSE MONEY the number describes, not whether it has a dollar sign.
--   Consequently price_observations has no cost_basis, no acquired_for, and no
--   realized-gain column, and must never gain one.
--
-- FOILS ARE OUT OF SCOPE. Decided by Ashwin 2026-08-06: special printings
-- (overnumbered, signed, alt art) are foil by default, as are rares and epics.
-- Some commons and uncommons exist in foil but the price delta does not justify
-- the modelling cost. The ingestion job discards every row whose subTypeName is
-- not 'Normal'. This also resolves the open question of foil rows having no
-- corresponding printing, since card_printings contains zero foil rows.
--
-- Partition: APPLICATION, not game-truth. These tables are outside the scope of
-- the game-truth change-detection work specced by Core on 2026-08-06.

-- =========================================================================
-- price_sources
-- =========================================================================
create table price_sources (
  source_id       text primary key,
  display_name    text not null,
  kind            text not null,
  derived_from    text references price_sources on delete set null,
  notes           text,

  constraint price_sources_kind_valid check (kind in ('api','mirror','scrape','manual'))
);

comment on column price_sources.derived_from is
  'Set when this source republishes another source rather than observing the market
   independently. M8 assessment 2026-08-06: riftdecks displays a TCGplayer affiliate link
   and appears to publish TCGplayer figures, so agreement between them is NOT corroboration,
   it measures their refresh lag. Recording the relationship so no analysis mistakes one
   for the other.';

insert into price_sources (source_id, display_name, kind, derived_from, notes) values
  ('tcgplayer', 'TCGplayer via tcgcsv.com', 'mirror', null,
   'Nightly mirror of TCGplayer official API, category 89. Built once daily at 20:00 UTC.');

-- =========================================================================
-- priceable_products — the spine. Singles and sealed in one table.
-- =========================================================================
create table priceable_products (
  product_id            bigint generated always as identity primary key,
  product_kind          text not null,
  printing_code         text references card_printings on delete restrict,
  sealed_kind           text,
  set_code              text,
  collector_number      text,
  tcgplayer_product_id  int  not null,
  tcgplayer_sub_type    text not null,
  tcgplayer_name        text not null,
  tcgplayer_url         text,
  rarity                text,
  card_type             text,
  domain                text,
  first_seen_on         date not null default current_date,

  constraint priceable_products_kind_valid check (product_kind in ('single','sealed')),
  constraint priceable_products_sealed_kind_valid check (
    sealed_kind is null or sealed_kind in
      ('booster_pack','booster_display','display_case','pre_rift_kit',
       'vault_bundle','starter','showdown_deck','other')
  ),
  constraint priceable_products_shape check (
    (product_kind = 'single' and sealed_kind is null) or
    (product_kind = 'sealed' and printing_code is null)
  ),
  constraint priceable_products_tcg_key unique (tcgplayer_product_id, tcgplayer_sub_type)
);

create index priceable_products_printing_idx on priceable_products (printing_code);
create index priceable_products_set_idx      on priceable_products (set_code);

comment on table priceable_products is
  'One row per sellable thing: a single printing, or a sealed product. One spine rather
   than two parallel tables, because sealed products arrive in the same CSV rows, carry the
   same five price fields, and want the same time series. Splitting them would force every
   query to union across two tables of identical shape.';

comment on column priceable_products.printing_code is
  'Join to card_printings.printing_code, NOT to cards.card_code.
   This distinction is load-bearing. cards.card_code is the canonical GAMEPLAY card,
   collapsed across printings: ven-149-166 covers both Jayce base and Jayce overnumbered
   because they play identically. Prices do not work that way - an alt art and a base
   printing have identical rules text and very different market prices.
   NULLABLE ON PURPOSE: a TCGplayer product with no resolvable printing is recorded with a
   null here rather than dropped, so coverage gaps are visible instead of silent.';

comment on column priceable_products.tcgplayer_product_id is
  'Per tcgcsv docs, productId alone is NOT a valid key: "Not safe to use as a primary key.
   Must be combined into a composite key with subTypeName." Hence the composite unique.';

comment on column priceable_products.tcgplayer_sub_type is
  'Expected to be Normal for every row. The ingestion job discards non-Normal rows per the
   foil decision above. Retained as a column so that if a future subtype appears, it lands
   visibly rather than colliding with an existing row.';

-- =========================================================================
-- price_observations — the time series. Append-only in practice.
-- =========================================================================
create table price_observations (
  product_id    bigint not null references priceable_products on delete cascade,
  source_id     text   not null references price_sources      on delete restrict,
  observed_on   date   not null,
  market        numeric(10,2),
  low           numeric(10,2),
  mid           numeric(10,2),
  high          numeric(10,2),
  direct_low    numeric(10,2),
  primary key (product_id, source_id, observed_on)
);

create index price_observations_observed_idx on price_observations (observed_on);

comment on table price_observations is
  'Prices are USD (tcgcsv docs). The composite primary key makes the daily job idempotent:
   re-running a day overwrites rather than duplicating.';

comment on column price_observations.market is
  'NULLABLE AND THE NULL IS MEANINGFUL. TCGplayer returns null when sales volume is too low.
   Never coalesce to zero. A null market alongside a live mid says the card is not trading,
   which is a real signal, and zeroing it silently turns that into a false price crash.';

comment on column price_observations.mid is
  'Median LISTING price, an asking price. Distinct from market, which is a selling price.
   M8 measured mid/market at 1.12x-1.22x above one dollar and up to 1.82x on sub-25c commons.
   Both RuneHoard and riftdecks appear to track mid rather than market, which is why their
   figures read high. The mid minus market spread is itself a liquidity indicator: widening
   means listings are outrunning sales.';

comment on column price_observations.high is
  'Retained for completeness but treat with suspicion. tcgcsv documents "price parking",
   where sellers list at absurd prices, so high is frequently not a real market signal.';

-- =========================================================================
-- Ingestion run log. Operational, M9-owned.
-- =========================================================================
create table price_ingest_runs (
  run_id             bigint generated always as identity primary key,
  started_at         timestamptz not null default now(),
  source_id          text not null references price_sources on delete restrict,
  source_built_at    timestamptz,
  groups_seen        int,
  rows_in            int,
  rows_kept          int,
  rows_skipped_foil  int,
  products_new       int,
  observations_written int,
  printings_matched  int,
  printings_unmatched int,
  status             text not null,
  notes              text,

  constraint price_ingest_runs_status_valid check (status in ('ok','partial','failed'))
);

comment on table price_ingest_runs is
  'One row per ingestion attempt. Exists because a scheduled job that fails silently is
   worse than no job: the series develops holes that are invisible until someone queries a
   date range and gets a wrong answer. printings_unmatched is the coverage metric to watch;
   a sudden jump means TCGplayer changed its collector-number format.';

comment on column price_ingest_runs.source_built_at is
  'Value of tcgcsv last-updated.txt at fetch time. The job skips entirely if this is not
   newer than the previous successful run, per tcgcsv operator guidance.';

alter table price_sources        enable row level security;
alter table priceable_products   enable row level security;
alter table price_observations   enable row level security;
alter table price_ingest_runs    enable row level security;
