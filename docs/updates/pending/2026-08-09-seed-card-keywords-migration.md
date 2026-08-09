## Thread/topic: seed-card-keywords-migration

**Sections likely affected:** 2 (Card database), 3 (tracker), 6 (standing rules), 9 (log), 10 (item 19 context)

**Team-facing:**

`card_keywords` now has a durable source of truth in the repo: `supabase/migrations/20260809000019_seed_card_keywords.sql`, 740 inserts across 522 cards. Authored by the Core thread from live Supabase; delivered through the Drive handoff folder and committed here unmodified apart from its header.

**The gap this closes.** `card_keywords` is the full output of Phase 4 Stage 1 (keyword extraction from `cards.rules_text`, per CR 807.1.b.3 / 809.1.b.3 / 814.1.b.3 / 823.1.c.2) and had existed **only in live Supabase**, never in any migration or seed file. Verified rather than assumed: `git grep "insert into card_keywords" origin/integration -- supabase/` returned nothing before this file. Infra's proposed bootstrap dump scope was `cards` / `card_printings` / `card_bans`, so a from-scratch rebuild would have restored a database with **zero rows in `card_keywords`** and nothing would have flagged it short of someone noticing the count was wrong.

Core closed it from both ends: this migration, and a scope addition to the dump (below).

**Renumbered 017 to 019, and the reason is worth recording.** Core authored the file as `20260809000017`. In the hours between authoring and delivery, two price-ingest migrations claimed both 017 and 018:

| Version | Migration | Status when this landed |
|---|---|---|
| `20260809000017` | `price_ingest_run_traceability` | PR #201, merged to `integration` |
| `20260809000018` | `price_ingest_run_lifecycle` | PR #205, open |

Both were **already applied to live**, confirmed against `supabase_migrations.schema_migrations` (latest version `20260809000018`), so they were genuinely taken rather than merely reserved on a branch. 019 was confirmed free across every remote branch before being used. Only the header comment changed; the 740 inserts and the guard/assertion blocks are byte-identical to Core's file, verified by diff.

**Do not run this against live.** `card_keywords` is already populated there (740 rows, 522 cards, verified). This migration exists for the ledger and for any future from-scratch database: test environments, CI, disaster recovery.

**Design points from Core worth carrying:**

- **The `if not exists (select 1 from cards limit 1)` guard is necessary, not defensive styling.** `card_keywords.card_code` has an FK to `cards(card_code)`, so unlike migrations 015 and 016 (UPDATE statements, which no-op harmlessly to zero rows against an empty `cards`), a bare INSERT against an unpopulated `cards` **hard-fails on FK violation and aborts the whole migration**. The guard is what makes a plain `supabase db reset` skip cleanly instead of breaking. Constraints confirmed live: `card_keywords_card_code_fkey`, `card_keywords_keyword_fkey`, `card_keywords_pkey`.
- **The closing assertion is two-valued (0 or exactly 740), not a fixed count.** Everything runs inside one transaction, so the outcome is all-or-nothing: either the guard skipped everything, or all 740 landed. A partial state would have raised an FK violation and aborted before reaching the assertion. Same principle as 015 and 016 ("assert only the invariant that can actually vary"), adapted for INSERT's fail-hard semantics versus UPDATE's silent no-op.
- **`value_cost` jsonb shape:** `{"energy": N, "power": [...]}`, with `{"kind": "any"}` domain entries; `{"power": []}` means any energy and no domain pips required; alternative costs use `{"alternatives": [...]}`. The one live alternatives case is `ven-074-166`'s Empower (1 energy OR one Body pip), approved by Ashwin 2026-08-08. The file already reflects Core's fix making `sequence` card-wide rather than per-keyword; a first attempt at per-keyword numbering hit a PK collision.

**Core's ruling on the migration-008 bootstrap, recorded here because it answers an open question.** This resolves Section 10 item 19 in favour of option (b): **do not edit migration 008; document the real bootstrap instead.** Core approved Infra's procedure — run migrations 001 to 007, restore a live dump, then `supabase migration repair --status applied` for 008 onward so they are marked applied without re-executing. Both alternatives were rejected: editing 008 in place breaks migration immutability and drift detection, and splitting it into a new migration that re-inserts the same rows is **the exact shape of the `seed_card_bans.sql` bug found earlier the same day**, where a surrogate primary key let a re-run silently create duplicates instead of erroring. `migration repair` never runs 008's body at all, which sidesteps the whole class.

**Anything another thread working today should know:**

- **If you script the bootstrap dump, `card_keywords` must be in the table list.** `pg_dump -t cards -t card_printings -t card_bans` is incomplete. This is Infra's action item.
- **Take the dump from current live state**, after 015, 016 and the `seed_card_bans.sql` retirement, not from an earlier snapshot. `card_keywords` has only ever existed in its current form, so there is no earlier clean version to prefer.
- **`supabase/migrations/20260805000008_backfill_master_inventory.sql` stays immutable.** Do not edit it.
- Migration numbering is now contended: three separate threads claimed 017, 018 and 019 within a few hours on 2026-08-09. **Check `supabase_migrations.schema_migrations` on live and every remote branch before claiming a number**, not just `ls supabase/migrations/` on your own branch.
