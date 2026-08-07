## Thread/topic: market-price-pipeline

**Sections likely affected:** 2 (Shipped features), 3 (feature tracker), 6 (standing rules), 9 (log)

**Team-facing:**

M9 built a daily TCGplayer market-price pipeline and committed it in PR #166 into `integration`. Migrations 010–012 plus the ingest generator and three diagnostic seed files.

| File | What it does |
|---|---|
| `supabase/migrations/20260806000010_market_price_history.sql` | Creates `price_sources`, `priceable_products`, `price_observations`, `price_ingest_runs`. RLS enabled on all four. |
| `supabase/migrations/20260806000011_capture_foils.sql` | Comment-only correction to 010, which shipped hours earlier stating foils were out of scope. |
| `supabase/migrations/20260806000012_crystal_rose_special.sql` | `ven-sp1-006` … `ven-sp6-006` moved from `printing_variant = 'base'` to `'special'`. |
| `scripts/ingest_tcgcsv.py` | Daily generator. Emits a SQL file rather than writing to the DB. |
| `supabase/seed/price_coverage_check.sql` | Post-load coverage queries. |
| `supabase/seed/price_diagnostics.sql` | Diagnostics for the 2026-08-06 first ingest. |
| `supabase/seed/core_grammar_validation.sql` | Core spec v2 §7 grammar validation against live `card_printings`. |

First run, from the run-log row in the generated `price_ingest_2026-08-06.sql`:

| Metric | Value |
|---|---|
| tcgcsv build | `2026-08-06T20:05:48+0000` |
| Groups seen | 10 |
| Rows in / kept | 1987 / 1987 |
| Subtypes captured | Foil 1333, Normal 654 |
| Codes constructible / not | 1935 / 2 |
| Observations written | 1987 |

**Three decisions embedded in this work, each recorded in the file that implements it:**

- **Boundary rule (010 header).** Ashwin's personal financial data — cost basis, purchase price, P&L, ROI, sale proceeds — lives in Google Drive only and never enters this database. Market price data is public and belongs here. The test is *whose money the number describes*, not whether it has a dollar sign. `price_observations` therefore has no cost-basis column and must never gain one.
- **Foils reversed same day (011 header).** Foils were excluded in the morning on the premise that the price delta did not justify the modelling cost. M8 measured it: foil/Normal median 2.88x, and Vendetta's chase cards (Zed `VEN-112/166`, Swain `VEN-065/166`, Lightning Rush `VEN-156/166`) are foil-only with no Normal row. Exclusion left the newest set's most valuable cards with no price at all. Reversed before the next daily build could overwrite the snapshot — tcgcsv publishes only the current day, so the loss would have been permanent.
- **Crystal Rose (012 header).** The six `ven-sp*-006` printings loaded as `base` because the seed derives `printing_variant` from a trailing parenthetical in the source name, and Crystal Rose printings carry none. A treatment signalled only by the *code* and never by the *name* is invisible to a name-based parser.

**New standing rule or convention worth capturing:**

`price_ingest_*.sql` is now in `.gitignore`. The distinction, worth stating generally: a **one-time record of a load that will never repeat** gets committed (`seed_cards.sql`); **recurring generated output** does not. The generator is committed, its daily output is not. Otherwise the repo accumulates one file per day forever.

**Anything another thread working today should know before touching related code:**

- `priceable_products.printing_code` joins to `card_printings.printing_code`, **not** to `cards.card_code`. This is load-bearing: `card_code` is the canonical gameplay card collapsed across printings, and an alt art and a base printing have identical rules text but very different market prices.
- `price_observations.market` is nullable and **the null is meaningful** — TCGplayer returns null when sales volume is too low. Never coalesce to zero; that turns "not trading" into a false price crash.
- `observed_on` comes from tcgcsv's UTC build timestamp, not `date.today()`. Local Pacific date and Postgres `current_date` in UTC disagree after 17:00 Pacific, which silently empties every `current_date`-filtered query. That bug shipped and was fixed the same day.
- **Known nit — FIXED after this PR, in PR #168.** `scripts/ingest_tcgcsv.py:216` wrote `-- Foil rows discarded at source` into every generated SQL header, false as of migration 011. It was left out of PR #166 to keep the diff to the stated scope, then fixed immediately afterwards. The generated header now reports the actual subtype tally for the run rather than restating a policy, so it cannot go stale the same way again. **Reconciler: fold the fixed state, not the nit.**
