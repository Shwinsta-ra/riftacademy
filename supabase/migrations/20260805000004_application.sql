-- RiftAcademy Supabase — Migration 004: application partition
-- Non-CR operational fields are explicitly permitted here (Core invariant 2.6).
-- Standing rule, no exceptions: NO financial data in this schema. Google Drive only.

-- =========================================================================
-- decks
-- =========================================================================
create table decks (
  deck_id                   uuid primary key default gen_random_uuid(),
  name                      text not null,
  format                    text not null,
  mode                      text not null references modes on delete restrict,
  legend_card_code          text references cards on delete restrict,
  chosen_champion_card_code text references cards on delete restrict,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint decks_format_valid check (format in ('constructed','sealed','draft'))
);

comment on table decks is
  'Application partition. Deck identity is deck_id, an internally generated UUID.
   External application identifiers live in deck_external_ids, never as columns here.';

comment on column decks.name is
  'Deliberately NOT unique. The same deck name across different formats is legitimate,
   and multiple configurations of one Legend are a valid testing pattern.';

comment on column decks.format is
  'TR 202.1 + 602.4. Sealed and draft enum values exist but Core has DEFERRED their
   construction rules (approximately 3 months). Until then validateDeck will neither
   pass nor fail a sealed or draft deck rather than reporting an incorrect result.';

comment on column decks.mode is 'CR 484-489 via the modes reference table.';
comment on column decks.legend_card_code is 'CR 103.1.';
comment on column decks.chosen_champion_card_code is
  'CR 103.2.a. Must also appear as a main-section row in deck_cards. Validated by Core, not by
   a database constraint, because the rule is format-dependent.';

-- NO is_legal COLUMN AND NO CACHED VALIDATION COLUMN, BY DESIGN.
-- Core invariant 2: the database stores facts, Core computes judgments.
-- Legality is computed at runtime by validateDeck(deck, FormatContext).

-- =========================================================================
-- deck_cards
-- =========================================================================
create table deck_cards (
  deck_id      uuid not null references decks on delete cascade,
  card_code    text not null references cards on delete restrict,
  deck_section text not null,
  quantity     int  not null check (quantity > 0),
  primary key (deck_id, card_code, deck_section),

  constraint deck_cards_section_valid check (
    deck_section in ('main','sideboard','runes','battlefields')
  )
);

create index deck_cards_card_code_idx on deck_cards (card_code);

comment on column deck_cards.deck_section is
  'Named deck_section, NOT "zone": Zone is CR vocabulary (CR 105-108) for play areas and must
   not be repurposed. Values: main CR 103.2, sideboard TR 403.1, runes CR 103.3,
   battlefields CR 103.4.';

-- Constraints deliberately absent from the database because they are format-dependent and
-- are computed by Core's validateDeck(deck, FormatContext):
--   exactly 40 including champion (TR 402.1)
--   at most 3 per NAME across main + sideboard (CR 103.2.b, TR 601.1.c.3)
--   at most 3 Signature matching the Legend's champion tag (CR 103.2.d)
--   exactly 12 runes (CR 103.3)
--   3 uniquely named battlefields (CR 103.4.c, TR 402.1)
--   domain identity including multi-domain-needs-all (CR 103.1.b.4)
--   bans, with sealed/draft mapped to limited

-- =========================================================================
-- deck_external_ids
-- =========================================================================
create table deck_external_ids (
  deck_id     uuid not null references decks on delete cascade,
  source      text not null,
  external_id text not null,
  linked_at   timestamptz not null default now(),
  primary key (deck_id, source),
  unique (source, external_id)
);

comment on table deck_external_ids is
  'Multi-source external identifier mapping: runehoard, piltoverarchive, riftdecks, and future
   sources. Replaces the earlier decks.runehoard_id column so RiftAcademy keeps its own identity
   while staying compatible with the wider ecosystem.
   The unique (source, external_id) pair prevents two decks claiming the same external record.
   PK on (deck_id, source) allows one deck to hold at most one id per source.';

-- =========================================================================
-- card_inventory
-- =========================================================================
create table card_inventory (
  printing_code text primary key references card_printings on delete restrict,
  quantity      int not null check (quantity >= 0),
  updated_at    timestamptz not null default now()
);

comment on table card_inventory is
  'Collection quantities, keyed by PRINTING because a foil and a base copy are different objects
   to own but the same card to play.
   NO FINANCIAL COLUMNS, EVER. Cost basis, P&L, and ROI live in Google Drive only. Standing rule.
   Quantities come from photo ingest of pulls, never from RuneHoard displayed counts, which have
   disagreed with RuneHoard own exports by 13+ cards.';

alter table decks             enable row level security;
alter table deck_cards        enable row level security;
alter table deck_external_ids enable row level security;
alter table card_inventory    enable row level security;
