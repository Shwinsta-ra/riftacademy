-- Core §7 validation, run against the LIVE card_printings table.
-- M9 has already run the equivalent against a reconstruction of the same source data;
-- results are in M9_to_RiftCore_Grammar_Validation_2026-08-06.md. This is the
-- authoritative version. Run it and compare.

select '7.1 codes that FAIL Core grammar' as section;
select printing_code
from card_printings
where printing_code !~ '^([a-z]{2,4})-((?:[rt])?[0-9]+[a-z]?\*?)(?:-([0-9]+))?$'
order by 1;
-- M9 predicts 6: ven-sp1-006 through ven-sp6-006

select '7.2 distinct shapes with counts' as section;
select regexp_replace(regexp_replace(printing_code, '[0-9]', 'N', 'g'), '[a-z]', 'A', 'g') as shape,
       count(*)
from card_printings group by 1 order by 2 desc;
-- M9 predicts: AAA-NNN-NNN 1014, AAA-NNNA-NNN 102, AAA-NNN*-NNN 36,
--              AAA-ANN 7, AAA-AAN-NNN 6

select '7.2b letter suffix AND asterisk together (Core''s suspected missing fixture)' as section;
select count(*) as both_letter_and_asterisk
from card_printings where printing_code ~ '[0-9][a-z]\*';
-- M9 predicts 0

select '7.3 forbidden patterns' as section;
select count(*) filter (where printing_code like '%-f')        as contains_dash_f,
       count(*) filter (where printing_code <> lower(printing_code)) as has_uppercase,
       count(*) filter (where printing_code like 'pg-%')       as starts_pg,
       count(*)                                                as total
from card_printings;
-- M9 predicts 0, 0, 0, 1165

select 'extra: set prefixes present' as section;
select split_part(printing_code, '-', 1) as set_prefix, count(*)
from card_printings group by 1 order by 2 desc;

select 'extra: the sp-prefix exception in full' as section;
select p.printing_code, p.set_code, p.collector_number, p.rarity,
       p.printing_variant, p.is_overnumbered, c.name, c.card_type, c.supertypes
from card_printings p join cards c on c.card_code = p.card_code
where p.printing_code like '%-sp%'
order by p.printing_code;
