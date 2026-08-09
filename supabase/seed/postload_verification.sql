-- RiftAcademy — post-load verification
-- Run AFTER any bulk card load. Read-only. Required by RiftCore adjudication
-- 2026-08-05, Decision 3 ("post-load verification") and awareness item 4.
--
-- Previously read "Run AFTER seed_cards.sql"; that seed was retired 2026-08-09
-- (live Supabase is authoritative for cards/card_printings -- see ../README.md).
-- This script is unchanged and still valid against any loaded database.

select '=== 1. Row counts ===' as section;
select
  (select count(*) from cards)          as cards,
  (select count(*) from card_printings) as printings,
  (select count(*) from card_printings where is_overnumbered) as overnumbered;
-- Expect: 905 / 1140 / 122

select '=== 2. printing_variant distribution ===' as section;
select printing_variant, count(*)
from card_printings
group by 1 order by 2 desc;
-- Expect: base 1004, alt_art 99, signed 36, ultimate 1, foil 0
-- Zero foil rows is EXPECTED. Core 2026-08-05: the source does not model foils as distinct
-- printings; foil-ness is a property of the physical copy, so if it is ever tracked it
-- belongs at inventory level, not here.

select '=== 3. ERRATA 8/8 CHECK (blocking) ===' as section;
-- Core adjudication Decision 3. These eight must carry POST-errata rules_text after
-- newest-wins resolution. Any miss is a blocking finding to report back to Core.
select name,
       left(rules_text, 90) as rules_text_head,
       length(rules_text)   as len
from cards
where name in (
  'Draven, Vanquisher', 'Emperor''s Dais', 'Fizz, Trickster', 'Diana, Lunari',
  'Stalking Wolf', 'Astral Heron', 'Gangplank, Naval', 'Resonating Strike'
)
order by name;
-- Expect exactly 8 rows. Inspect each against the 2026-07-23 errata text.

select '=== 4. The two adjudicated rows ===' as section;
select p.printing_code, p.card_code, p.printing_variant, p.is_overnumbered,
       c.name, c.supertypes, c.tags
from card_printings p
join cards c on c.card_code = p.card_code
where p.printing_code in ('unl-238-219', 'ogs-019-024');
-- unl-238-219: printing_variant = ultimate, is_overnumbered = true (238 > 219)
-- ogs-019-024: supertypes = {} (Champion dropped per CR 133.7.a), Champion Tag kept in tags

select '=== 5. Constraint sanity: no Champion supertype on a non-Unit ===' as section;
select count(*) as violations
from cards
where 'Champion' = any(supertypes) and not ('Unit' = any(card_type));
-- Expect 0. The cards_champion_units_only constraint should make this impossible.

select '=== 6. Orphan check: every printing resolves to a card ===' as section;
select count(*) as orphans
from card_printings p
left join cards c on c.card_code = p.card_code
where c.card_code is null;
-- Expect 0.

select '=== 7. Collapse spread: how many printings per card ===' as section;
select n_printings, count(*) as n_cards from (
  select card_code, count(*) as n_printings
  from card_printings group by 1
) t group by 1 order by 1;

select '=== 8. Known-null columns, expected ===' as section;
select
  count(*) filter (where power_cost is null)  as power_cost_null,
  count(*) filter (where might_bonus is null) as might_bonus_null,
  count(*)                                    as total
from cards;
-- power_cost NULL on all 905 is EXPECTED AND BLOCKING FOR LATER WORK: the source carries
-- attributes.power as a bare integer count with no symbol detail, while the schema requires
-- an ordered array distinguishing domain symbols from [C] and [A]. Deriving those from
-- classification.domain would be inference, which Core prohibits and which is RiftEngine's
-- remit. A symbol-bearing source is required before power_cost can be populated.

select '=== 9. ERRATA ASSERTIONS (Core 2026-08-05) ===' as section;
-- Markers supplied by RiftCore. Pass requires the post-errata substring to be present.
-- Markers are in the Master Card Inventory CSV's plain notation (Might, not :rb_might:),
-- which is the authoritative rules-text source as of migration 008.
-- HISTORY: these read 0/7 against the original Riftcodex load, because every Riftcodex
-- snapshot predates the 2026-07-23 errata. After migrations 008 and 009 all 7 should pass.
-- If Diana, Lunari alone fails, migration 009 has not been applied.
select name, marker, (rules_text ilike '%' || marker || '%') as passed
from (values
  ('Draven, Vanquisher',  'to give me +2'),
  ('Emperor''s Dais',     'to play a 2 Might Sand Soldier'),
  ('Fizz, Trickster',     'Then recycle it.'),
  ('Diana, Lunari',       'to [Predict]'),
  ('Stalking Wolf',       'You may [Ambush] me to its battlefield'),
  ('Astral Heron',        'the next card you play this turn'),
  ('Gangplank, Naval',    '+3 Might this turn instead')
) as e(name, marker)
join cards c using (name)
order by name;
-- Resonating Strike carries no assertion: its errata was reminder-text only and
-- functionally null, so presence in section 3 suffices.
