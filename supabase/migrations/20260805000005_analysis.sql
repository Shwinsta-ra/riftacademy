-- RiftAcademy Supabase — Migration 005: analysis layer
-- Core invariant 4: ground truth is not analysis. This partition is physically separate and
-- never feeds any rules computation.

create table analysis_tags (
  analysis_tag text primary key,
  description  text,
  owner_module text
);

create table card_analysis_tags (
  card_code    text not null references cards         on delete cascade,
  analysis_tag text not null references analysis_tags on delete cascade,
  primary key (card_code, analysis_tag)
);

create index card_analysis_tags_tag_idx on card_analysis_tags (analysis_tag);

comment on table analysis_tags is
  'Owner: RiftLab, extended by RiftCoach. Interpretive labels only.
   These are NOT CR 133.8 tags. CR tags live in cards.tags and come from printed cards;
   these are RiftAcademy judgments about cards and must never be consulted by validateDeck
   or any other rules computation.';

insert into analysis_tags (analysis_tag, description, owner_module) values
  ('Combat Trick',  'Played during combat to alter its outcome',        'M3'),
  ('Removal',       'Removes an opposing unit or permanent from play',  'M3'),
  ('Utility',       'Flexible effect not fitting a narrower category',  'M3'),
  ('Counterspell',  'Responds to and negates an opposing card or chain','M3');

alter table analysis_tags      enable row level security;
alter table card_analysis_tags enable row level security;
