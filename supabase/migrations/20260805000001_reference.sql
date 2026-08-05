-- RiftAcademy Supabase — Migration 001: game-truth reference tables
-- Source of authority: RiftCore_to_M9_Supabase_DDL_AUDITED_FINAL.md (2026-08-04)
--   as adjudicated by RiftCore_to_M9_Reply_Adjudication_2026-08-05.md
-- Every element in this file carries a CR/TR citation per Core invariant 1.

-- =========================================================================
-- modes — CR 483-489 expressed as data
-- =========================================================================
create table modes (
  mode              text primary key,
  display_name      text not null,
  number_of_players int  not null,
  victory_score     int  not null,
  battlefield_count int  not null,
  cr_citation       text not null
);

comment on table modes is
  'CR 483-489. Sanctioned play modes as data. Never hardcode mode properties in application logic.';
comment on column modes.number_of_players is 'CR 483.1';
comment on column modes.victory_score     is 'CR 483.3';
comment on column modes.battlefield_count is 'CR 483.4';

insert into modes (mode, display_name, number_of_players, victory_score, battlefield_count, cr_citation) values
  ('duel',          '1v1 (Duel)',         2,  8, 2, 'CR 485'),
  ('match',         '1v1 (Match)',        2,  8, 2, 'CR 486'),
  ('skirmish',      'FFA3 (Skirmish)',    3,  8, 3, 'CR 487'),
  ('war',           'FFA4 (War)',         4,  8, 3, 'CR 488'),
  ('magma_chamber', '2v2 (Magma Chamber)', 4, 11, 3, 'CR 489');

-- =========================================================================
-- keywords — CR 805-829. Core's deliverable, seeded verbatim.
-- =========================================================================
create table keywords (
  keyword     text primary key,
  classes     text[] not null,
  stacking    text   not null,
  param_kind  text   not null,
  cr_citation text   not null,
  constraint keywords_classes_valid check (
    classes <@ array['passive','triggered','activated','permissive','dependent',
                     'optionalAdditionalCost','deckConstraint','prerequisite']::text[]
    and array_length(classes, 1) >= 1
  ),
  constraint keywords_stacking_valid check (
    stacking in ('sums','redundant','separateInstances','multipleAbilities','na')
  ),
  constraint keywords_param_kind_valid check (
    param_kind in ('none','number','cost')
  )
);

comment on table keywords is
  'CR 805-829. Keyword vocabulary owned by RiftCore. Do not add rows without Core review
   per RiftCore_Schema_Change_Protocol.md.';
comment on column keywords.classes is
  'Array, not scalar: Quick-Draw (CR 819) is both a Triggered ability and Reaction-permissive.';
comment on column keywords.param_kind is
  'Determines which value column applies in card_keywords: number -> value_number, cost -> value_cost.';

insert into keywords (keyword, classes, stacking, param_kind, cr_citation) values
  ('Accelerate',   '{optionalAdditionalCost}',  'redundant',         'cost',   'CR 805'),
  ('Action',       '{permissive}',              'na',                'none',   'CR 806'),
  ('Assault',      '{passive}',                 'sums',              'number', 'CR 807'),
  ('Deathknell',   '{triggered}',               'separateInstances', 'none',   'CR 808'),
  ('Deflect',      '{passive}',                 'sums',              'number', 'CR 809'),
  ('Ganking',      '{passive}',                 'redundant',         'none',   'CR 810'),
  ('Hidden',       '{prerequisite}',            'redundant',         'cost',   'CR 811'),
  ('Legion',       '{dependent}',               'na',                'none',   'CR 812'),
  ('Reaction',     '{permissive}',              'na',                'none',   'CR 813'),
  ('Shield',       '{passive}',                 'sums',              'number', 'CR 814'),
  ('Tank',         '{passive}',                 'redundant',         'none',   'CR 815'),
  ('Temporary',    '{triggered}',               'redundant',         'none',   'CR 816'),
  ('Vision',       '{triggered}',               'separateInstances', 'none',   'CR 817'),
  ('Equip',        '{activated}',               'multipleAbilities', 'cost',   'CR 818'),
  ('Quick-Draw',   '{triggered,permissive}',    'redundant',         'none',   'CR 819'),
  ('Repeat',       '{optionalAdditionalCost}',  'separateInstances', 'cost',   'CR 820'),
  ('Weaponmaster', '{triggered}',               'separateInstances', 'none',   'CR 821'),
  ('Ambush',       '{passive}',                 'redundant',         'none',   'CR 822'),
  ('Hunt',         '{triggered}',               'sums',              'number', 'CR 823'),
  ('Level',        '{dependent}',               'na',                'number', 'CR 824'),
  ('Unique',       '{deckConstraint}',          'na',                'none',   'CR 825'),
  ('Backline',     '{passive}',                 'redundant',         'none',   'CR 826'),
  ('Empower',      '{activated}',               'multipleAbilities', 'cost',   'CR 827'),
  ('Empowered',    '{dependent}',               'na',                'none',   'CR 828'),
  ('Flow',         '{passive}',                 'na',                'cost',   'CR 829');

alter table modes    enable row level security;
alter table keywords enable row level security;
