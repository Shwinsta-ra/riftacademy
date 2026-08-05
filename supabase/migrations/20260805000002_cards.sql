-- RiftAcademy Supabase — Migration 002: cards and printings
-- Game-truth partition. Every element cited per Core invariant 1.

-- =========================================================================
-- cards — one row per gameplay-distinct card. Collapse key is name.
-- =========================================================================
create table cards (
  card_code   text primary key,
  name        text not null,
  card_type   text[] not null,
  supertypes  text[] not null default '{}',
  tags        text[] not null default '{}',
  domains     text[] not null default '{}',
  energy_cost int,
  power_cost  jsonb,
  might       int,
  might_bonus int,
  is_token    boolean not null default false,
  rules_text  text,

  constraint cards_name_unique unique (name),

  constraint cards_card_type_valid check (
    card_type <@ array['Unit','Gear','Spell','Rune','Battlefield','Legend']::text[]
    and array_length(card_type, 1) >= 1
  ),
  constraint cards_supertypes_valid check (
    supertypes <@ array['Champion','Signature']::text[]
  ),
  constraint cards_domains_valid check (
    domains <@ array['Fury','Calm','Mind','Body','Chaos','Order']::text[]
  ),

  -- CR 133.7.a: Champion is a supertype that applies exclusively to units.
  -- Required by Core DDL sign-off 2026-08-05. Makes the seed source's
  -- "Legend with supertype Champion" rows unrepresentable rather than merely wrong.
  -- What that source field is groping at is the Champion Tag (CR 133.8.b), which
  -- belongs in cards.tags. The seed must never synthesize a supertype from it.
  constraint cards_champion_units_only check (
    not ('Champion' = any(supertypes)) or 'Unit' = any(card_type)
  )
);

comment on table cards is
  'Playability partition. One row per gameplay-distinct card; all printings of the same name
   collapse here (RiftCore adjudication 2026-08-05, Decision 4). Printing facts live in card_printings.';

comment on column cards.card_code is
  'Canonical identifier = the first-printing code, tiebroken within that set by lowest collector
   number, base printing. IDENTIFIER, NOT A FACTUAL CLAIM: if an earlier printing is later
   discovered the key does NOT change. Stability outranks the accuracy of the "first" label.
   Printing facts belong in card_printings. (Core adjudication Decision 3.)';

comment on column cards.name is
  'CR 132.1: each card has a name that identifies it uniquely. This is the collapse key.
   CR 132.4: full "Name, Subtitle" comma form is the name. CR 132.3: different-language
   printings are the same card.';

comment on column cards.card_type is
  'CR 133.4 (Units/Gear/Spells), 133.5.a (Runes), 133.6.a/.b (Battlefields/Legends).
   Array per CR 178 multi-type. Seed from cards.json is KNOWN-LOSSY: the source stores a
   scalar type, so multi-type cards (e.g. Patched Porobot = [Unit,Gear]) arrive as Unit only.
   Re-pull when a multi-type-preserving source is available.';

comment on column cards.supertypes is
  'CR 133.7: Champion (133.7.a, units only) and Signature (133.7.b) ONLY.
   The source string "(Signature)" appearing in a card name is a PRINTING treatment,
   not this supertype, and must never be routed here.';

comment on column cards.tags is
  'CR 133.8: open vocabulary, no innate meaning. 133.8.b Champion Tags. Equipment is a tag (CR 150.1).';

comment on column cards.domains is
  'CR 134.1-134.2. Empty array MEANS "no domain requirement" (CR 103.1.b), never "unknown".
   Unparseable domains must fail the seed loudly rather than defaulting to empty.';

comment on column cards.energy_cost is
  'CR 131.2. NULL is not 0: CR 131.3.b permits a cost element to be absent entirely.';

comment on column cards.power_cost is
  'CR 131.3 + 135.2.e. Ordered symbol array, never pre-resolved:
     {"kind":"domain","domain":D} | {"kind":"selfDomain"} [C] 135.2.e.6 | {"kind":"any"} [A] 135.2.e.5
   Kernel rule: [C] on a domainless card resolves to [A] (CR 135.2.e.6.b).';

comment on column cards.might       is 'CR 178.1.a.1: a Unit has Might regardless of its other types. Units CR 140-141.';
comment on column cards.might_bonus is 'CR 137. Distinct concept from Might. May be +0 (137.2). Ignored when host has no Might (137.3.b). Equipment CR 150.2.';
comment on column cards.is_token    is 'CR 185.1: intrinsic category, immutable. NOT a supertype.';
comment on column cards.rules_text  is 'CR 135. Verbatim printed Rules Text, display only. Nothing parses this at query time (invariant 3). Holds the NEWEST printing text per Core adjudication Decision 4.';

-- =========================================================================
-- card_printings — one row per physical printing
-- =========================================================================
create table card_printings (
  printing_code    text primary key,
  card_code        text not null references cards on delete restrict,
  set_code         text not null,
  collector_number text not null,
  rarity           text,
  is_overnumbered  boolean not null default false,
  printing_variant text not null default 'base',
  image_url        text,

  constraint card_printings_variant_valid check (
    printing_variant in ('base','foil','alt_art','signed','special')
  )
);

create index card_printings_card_code_idx on card_printings (card_code);
create index card_printings_set_code_idx  on card_printings (set_code);

comment on table card_printings is
  'Printing facts. A card_code may have many printings. Rarity lives here, not on cards:
   it is a printing fact (TR 602.2.b) with no playability effect.';

comment on column card_printings.printing_code is
  'Full unique per-printing code. Note collector_number alone is NOT unique: unl-231-219 and
   unl-231*-219 share collector number 231.';

comment on column card_printings.collector_number is
  'TR 601.2.c. Text, not int: rune and token codes (R01, T01) are not numeric, and
   overnumbered values legitimately exceed the set total.';

comment on column card_printings.is_overnumbered is
  'TR 601.2.c. THE ONE PRINTING PROPERTY WITH A RULES FUNCTION.
   A reprint numbered outside the set normal numbering does not affect format legality.
   validateDeck MUST exclude is_overnumbered = true printings from the
   "has a printing in a legal set" check, and must consult this flag NOWHERE else.
   (Core adjudication Decision 2.)';

comment on column card_printings.printing_variant is
  'Operational, permitted under Core invariant 2.6. Replaces the earlier is_alt_art boolean.
   Single-value by design: treatments are currently mutually exclusive, so invalid states are
   unrepresentable rather than merely prohibited.
   ESCAPE HATCH: if Riot ever ships a combined treatment (foil alt-art etc.), the designated
   path is a mechanical text -> text[] migration wrapping existing values in arrays.
   NEVER introduce compound values like "foil_alt_art" - those reintroduce parsing.
   Derived from the printing-code suffix ONCE at seed time. Seed-time parsing is permitted;
   query-time parsing never (invariant 3).
   Never consulted by any rules computation. (Core adjudication Decisions 1 and 2.)';

comment on column card_printings.image_url is 'Operational, flagged per Core invariant 2.6. No CR/TR concept.';

-- =========================================================================
-- card_keywords — PRINTED keywords only. Runtime grants are game state.
-- =========================================================================
create table card_keywords (
  card_code    text not null references cards   on delete cascade,
  keyword      text not null references keywords on delete restrict,
  value_number int,
  value_cost   jsonb,
  sequence     int  not null,
  primary key (card_code, keyword, sequence)
);

create index card_keywords_keyword_idx on card_keywords (keyword);

-- Core DDL sign-off recommendation 1: duplicate sequence numbers are always a data error.
-- IMPLICATION, FLAGGED FOR CORE: this constraint only holds if `sequence` is card-wide
-- printed order rather than a per-keyword instance counter. Under card-wide ordering the
-- `keyword` element of the primary key is redundant. The seed must assign sequence across
-- all of a card's printed keywords, not restart it per keyword.
alter table card_keywords
  add constraint card_keywords_printed_order_uniq unique (card_code, sequence);

comment on table card_keywords is
  'PRINTED keywords only. Keywords granted at runtime are game state and do not belong here.';
comment on column card_keywords.value_number is
  'Numeric keyword parameter: Assault 2 -> 2, Level 6 -> 6. Applies when keywords.param_kind = number.';
comment on column card_keywords.value_cost is
  'Cost-bearing keyword parameter: Equip (1)(R) -> {"energy":1,"power":[{"kind":"domain","domain":"Fury"}]}.
   Applies when keywords.param_kind = cost. A single int cannot hold these (CR 805, 811, 818, 820, 827, 829).';

-- =========================================================================
-- card_abilities — Core-owned schema and content
-- =========================================================================
create table card_abilities (
  ability_id        text primary key,
  card_code         text not null references cards on delete cascade,
  sequence          int  not null,
  kind              text not null,
  cost              jsonb,
  trigger_condition jsonb,
  effect            jsonb,
  is_effect_text    boolean not null default false,
  active_zones      text[] not null default '{board}',

  constraint card_abilities_kind_valid check (
    kind in ('passive','replacement','activated','triggered','reflexive','delayed','linked')
  )
);

create index card_abilities_card_code_idx on card_abilities (card_code);

-- Core DDL sign-off recommendation 1: duplicate sequence numbers are always a data error.
alter table card_abilities
  add constraint card_abilities_printed_order_uniq unique (card_code, sequence);

comment on table card_abilities is
  'RiftCore owns this schema and its contents. M9 maintains the table; Core authors the rows.';
comment on column card_abilities.kind is 'CR 361.1, plus reflexive CR 386 and linked CR 393.';
comment on column card_abilities.cost is 'CR 376/403. Activated cost, the portion before the colon. Cost shape per Core kernel schema.ts (PR #151).';
comment on column card_abilities.trigger_condition is
  'CR 383.2. MUST honor the adjacency rule (383.2.a.1): an "if" immediately following the timing
   clause is a Condition; anywhere else it is Effect.';
comment on column card_abilities.effect is 'Kernel Predicate/Selector/EventPredicate shapes (PR #151). Authored in Phase 4.';
comment on column card_abilities.is_effect_text is 'CR 136 + 723-724: Effect Text is Inactive unless Attached.';
comment on column card_abilities.active_zones is 'CR 365.1 default board; off-board abilities self-describe (CR 366.1, 385.2).';

alter table cards          enable row level security;
alter table card_printings enable row level security;
alter table card_keywords  enable row level security;
alter table card_abilities enable row level security;
