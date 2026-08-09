## Thread/topic: cards-display-name-column

**Sections likely affected:** 2 (shipped features), 3 (tracker), 9 (log)

**Customer-facing:**
Champion cards will show their real printed spelling — Kai'Sa, Kha'Zix, LeBlanc, Rek'Sai — wherever a card name is displayed, instead of the apostrophe-free internal form.

**Team-facing:**

Adds `cards.display_name text` (nullable) plus the cross-module contract at `docs/contracts/RiftCore_DisplayName_Contract.md`. Ashwin's ruling, 2026-08-08.

The split exists because `name` is the **rules-semantic join key** (3-copy limit CR 103.2.b, Unique CR 825, Chosen-Champion identity CR 103.2.a.3, ban application TR 601.2.a), and apostrophes cause real friction there — SQL escaping, CSV round-trips, URL slugs, exact-match search. Rather than revert the apostrophe-free convention, authenticity moves to a separate display-only column.

**The rule: render `coalesce(display_name, name)`; join, match, and validate on `name` only.** 12 of 929 cards carry a non-null `display_name` — it is not a usable key for anything. NULL is the intended default and is self-documenting: a non-null value means "this card needs special-case rendering."

Scope is the 12 rows covered by the champion-apostrophe rule (Kaisa/Khazix/Leblanc/Reksai × 3 printings each). Legitimate possessives — Zhonya's Hourglass, Doran's Shield — were never part of the override and get no entry.

**Two defects found and one fixed while landing this:**

1. **Fixed — the migration could never have run on a fresh database.** None of the 12 target `card_code`s are inserted by any migration; they arrive with the seed, which loads *after* all migrations. So on a from-scratch rebuild the backfill touches zero rows and the original `if n <> 12 then raise` assertion would abort the migration. It only passed against live, which already holds all 929 rows. Replaced with a replay-safe assertion: *every target card that exists must have been backfilled* (`populated = targets`), plus a `notice` when fewer than 12 targets are present. Verified against live: targets=12, populated=12, passes; on an empty database both are 0, also passes. The migration was unapplied and uncommitted, so this was still editable — no immutability rule was broken.

2. **NOT fixed, needs a decision — the migration ledger is out of sync with reality.** `supabase_migrations.schema_migrations` records only `20260805000001` through `...0007` as applied, but migrations 008–014 exist in the repo and their effects are plainly live (929 cards, `power_cost` populated on 374 rows). They were applied through the SQL connector/dashboard without being recorded. Consequence: **`supabase db push` would try to re-apply 008–014 against live**, and 008 alone does 25 `insert into cards` on rows that already exist — a primary-key violation. Nobody should run `db push` against this project until the ledger is reconciled.

**Anything another thread working today should know before touching related code:**

- **`display_name` is not live yet.** This PR only lands the migration file and the contract. Live Supabase has no `display_name` column (verified). Anything rendering `coalesce(display_name, name)` will fail until the migration is actually applied — and per the ledger problem above, applying it is currently a manual step, not `db push`.
- **The 14 live name corrections from earlier tonight are already applied** to Supabase (see `2026-08-08-ride-the-wind-casing.md`): `Ride the Wind`, the 12 champion rows de-apostrophised, and `Jax, Grandmaster at Arms`. `display_name` restores the authentic spelling for the 12 champions on top of that.
- **`cards.tags` still contains apostrophe'd forms** (`Kai'Sa`, `"The Void"` etc.) because only `name` was in scope for the correction. If tags are ever used as display text, they need the same treatment; as filter keys they're fine.
- **`cards` and `card_printings` have RLS enabled with zero policies** — nothing but `service_role` can read them. Any client-side code reading card data with the anon key gets empty results. Unrelated to this PR, flagged because it is easy to lose.
