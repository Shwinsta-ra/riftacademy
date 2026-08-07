-- Diagnostics for the 2026-08-06 first ingest.
-- 1. Confirms the data is present regardless of timezone.
-- 2. Identifies which non-promo singles failed to resolve to a printing.

select '1. what dates exist in price_observations' as section;
select observed_on, count(*) from price_observations group by 1 order by 1;

select '2. top singles by market, no current_date filter' as section;
select p.set_code, p.collector_number, c.name,
       o.market, o.mid, round(o.mid / nullif(o.market,0), 2) as mid_over_market
from price_observations o
join priceable_products p using (product_id)
join card_printings cp on cp.printing_code = p.printing_code
join cards c on c.card_code = cp.card_code
where o.market is not null
order by o.market desc limit 15;

select '3. sealed products by market value' as section;
select p.sealed_kind, p.tcgplayer_name, o.market, o.low, o.mid
from price_observations o
join priceable_products p using (product_id)
where p.product_kind = 'sealed' and o.market is not null
order by o.market desc limit 15;

select '4. UNRESOLVED singles in OUR sets - these need the mapping fixed' as section;
select set_code, collector_number, tcgplayer_name
from priceable_products
where product_kind = 'single' and printing_code is null
  and set_code in ('VEN','UNL','SFD','OGN','OGS')
order by set_code, collector_number;

select '5. does a near-miss printing exist for those collector numbers' as section;
select pp.set_code, pp.collector_number, pp.tcgplayer_name,
       (select count(*) from card_printings cp
         where cp.set_code = pp.set_code
           and cp.collector_number = regexp_replace(pp.collector_number, '/.*$', '')
       ) as printings_with_that_collector_number
from priceable_products pp
where pp.product_kind = 'single' and pp.printing_code is null
  and pp.set_code in ('VEN','UNL','SFD','OGN','OGS')
order by 1, 2;
