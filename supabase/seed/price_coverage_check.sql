-- Coverage check. Run after loading a price ingest.

select 'products by kind and printing resolution' as section;
select product_kind,
       count(*) as products,
       count(printing_code) as resolved_to_a_printing,
       count(*) - count(printing_code) as unresolved
from priceable_products
group by 1 order by 1;

select 'unresolved singles by set (expected: promo sets only)' as section;
select set_code, count(*) as unresolved
from priceable_products
where product_kind = 'single' and printing_code is null
group by 1 order by 2 desc;

select 'sealed products found' as section;
select sealed_kind, count(*) from priceable_products
where product_kind = 'sealed' group by 1 order by 2 desc;

select 'observations written today' as section;
select observed_on, count(*) as rows,
       count(market) as with_market,
       count(*) - count(market) as null_market_not_trading
from price_observations group by 1 order by 1 desc;

select 'ingest run log' as section;
select run_id, source_built_at, groups_seen, rows_in, rows_kept,
       rows_skipped_foil, observations_written, status
from price_ingest_runs order by run_id desc limit 5;

select 'sanity: most valuable singles that resolved to a real printing' as section;
select p.set_code, p.collector_number, c.name, o.market, o.mid,
       round(o.mid / nullif(o.market,0), 2) as mid_over_market
from price_observations o
join priceable_products p using (product_id)
join card_printings cp on cp.printing_code = p.printing_code
join cards c on c.card_code = cp.card_code
where o.observed_on = current_date and o.market is not null
order by o.market desc limit 10;
