-- RiftAcademy Supabase — Migration 003: legality FACTS
-- Judgments are computed by Core's validateDeck(deck, FormatContext) and are never stored.

-- =========================================================================
-- card_bans
-- =========================================================================
-- DIVERGENCE FROM CORE'S LOGICAL DOCUMENT, acknowledged by Core in the 2026-08-05
-- adjudication as a defect in that document. Core wrote:
--     primary key (card_code, format, coalesce_mode, effective_date)
-- coalesce_mode is not a column. Physical handling of the nullable mode was delegated to M9.
-- Implemented below as a surrogate key plus two partial unique indexes, the standard pattern
-- for uniqueness across a nullable column.
create table card_bans (
  ban_id         uuid primary key default gen_random_uuid(),
  card_code      text not null references cards on delete restrict,
  format         text not null,
  mode           text references modes on delete restrict,
  effective_date date not null,

  constraint card_bans_format_valid check (format in ('constructed','limited'))
);

create unique index card_bans_all_modes_uniq
  on card_bans (card_code, format, effective_date)
  where mode is null;

create unique index card_bans_single_mode_uniq
  on card_bans (card_code, format, mode, effective_date)
  where mode is not null;

create index card_bans_card_code_idx on card_bans (card_code);

comment on table card_bans is
  'TR 601.2.d, 602.1.b. Bans apply across printings via name semantics (TR 601.2.a),
   which is why the key is card_code and not printing_code.';
comment on column card_bans.format is
  'TR 202.1: competition formats are Limited and Constructed. Sealed and Draft are kinds of
   Limited (TR 602.4), so validateDeck maps a deck format of sealed or draft to limited here.';
comment on column card_bans.mode is
  'NULL means the ban applies in all modes. A non-null value scopes the ban to one mode,
   e.g. the magma_chamber-only ban.';

-- =========================================================================
-- format_sets — TR 601.3, Standard as data
-- =========================================================================
create table format_sets (
  format_name text not null,
  set_code    text not null,
  primary key (format_name, set_code)
);

comment on table format_sets is
  'TR 601.3.a-c. Set membership per format. Never hardcode the Standard set list in application code.';

insert into format_sets (format_name, set_code) values
  ('standard', 'OGS'),
  ('standard', 'OGN'),
  ('standard', 'SFD'),
  ('standard', 'UNL'),
  ('standard', 'VEN');

alter table card_bans   enable row level security;
alter table format_sets enable row level security;
