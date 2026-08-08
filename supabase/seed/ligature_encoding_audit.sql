-- Encoding audit for RiftCore Phase 4 Stage 1 gate.
-- Read-only. Scans every text column in the database that carries card-derived text.
--
-- CONTEXT: Code found that both rules .txt files preserve typographic ligatures as single
-- glyphs (778 in the Core Rules, 190 in the Tournament Rules), so `grep battlefield` returns
-- zero lines while the ligature form returns 138. cards.json is clean. Supabase rules_text was
-- replaced wholesale from the Master Card Inventory CSV in migration 008, a corpus nobody had
-- inspected until now.
--
-- INTERPRETATION IS THE WEAK POINT, NOT DETECTION. Stage 1's gate WOULD fire on a token like
-- [Deflect-with-ligature]: unmatched bracketed token, fails loudly, working as designed. The
-- danger is that an unmatched token reads as an UNKNOWN KEYWORD, and the natural fix is to add
-- it to the vocabulary - silently enshrining a ligature as a 26th keyword. Any finding here
-- must be reported as an ENCODING FAULT, never as an unknown keyword.

select '1. LIGATURES U+FB00-FB04 across all card text columns' as section;
select 'cards.rules_text' as col, count(*) as rows_with_ligature
  from cards where rules_text ~ '[\uFB00-\uFB04]'
union all select 'cards.name', count(*) from cards where name ~ '[\uFB00-\uFB04]'
union all select 'cards.tags', count(*) from cards
  where array_to_string(tags, ' ') ~ '[\uFB00-\uFB04]'
union all select 'cards.supertypes', count(*) from cards
  where array_to_string(supertypes, ' ') ~ '[\uFB00-\uFB04]'
union all select 'cards.card_type', count(*) from cards
  where array_to_string(card_type, ' ') ~ '[\uFB00-\uFB04]'
union all select 'card_printings.set_code', count(*) from card_printings
  where set_code ~ '[\uFB00-\uFB04]'
union all select 'keywords.keyword', count(*) from keywords
  where keyword ~ '[\uFB00-\uFB04]'
union all select 'analysis_tags.description', count(*) from analysis_tags
  where coalesce(description,'') ~ '[\uFB00-\uFB04]'
union all select 'priceable_products.tcgplayer_name', count(*) from priceable_products
  where tcgplayer_name ~ '[\uFB00-\uFB04]'
order by 2 desc, 1;
-- EXPECTED: 0 everywhere.

select '2. FULL non-ASCII inventory in cards.rules_text (the migration-008 corpus)' as section;
select ch, 'U+' || upper(to_hex(ascii(ch))) as codepoint, count(*) as occurrences
from cards, lateral regexp_matches(rules_text, '([^\x01-\x7F])', 'g') as m(arr),
     lateral (select m.arr[1]) as x(ch)
group by ch order by 3 desc;
-- EXPECTED: exactly one row, U+2019 RIGHT SINGLE QUOTATION MARK, 1 occurrence.
-- M9 verified the source CSV directly: 1 non-ASCII character in 216,515 bytes, a curly
-- apostrophe in Ava Achiever (OGN-107-298). Every other apostrophe, including Kai'Sa,
-- Kha'Zix, Kog'Maw and Ol', is straight ASCII.

select '3. Non-ASCII in cards.name (Riftcodex corpus, NOT replaced by migration 008)' as section;
select card_code, name
from cards where name ~ '[^\x01-\x7F]'
order by card_code;
-- cards.name still holds Riftcodex values; only rules_text, power_cost and might_bonus were
-- replaced in 008, plus five name corrections. This is a DIFFERENT corpus from the CSV and
-- has not been separately inspected.

select '4. Rows whose rules_text was never replaced by migration 008 or 009' as section;
select c.card_code, c.name, left(c.rules_text, 60) as text_head
from cards c
where c.rules_text is not null
  and c.rules_text ~ '\u2014'
order by 1;
-- The Riftcodex corpus used EM DASH heavily (60 occurrences in the original seed) while the
-- CSV uses none. Any row still containing an em dash in rules_text is therefore one the
-- migration-008 backfill did not reach, which is itself worth knowing regardless of ligatures.
-- EXPECTED: 0, or only sfd-t03 (Gold // Buff), the one loaded card with no CSV counterpart.

select '5. Ava Achiever, the one known non-ASCII row' as section;
select card_code, name, rules_text from cards where card_code = 'ogn-107-298';
