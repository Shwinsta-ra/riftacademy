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
- **`cards` and `card_printings` have RLS enabled with zero policies** — nothing but `service_role` can read them. Any client-side code reading card data with the anon key gets empty results. Confirmed by Ashwin as **intended and by design**, and now written down in `supabase/README.md` so it stops being rediscovered as a bug.

---

## Addendum: champion tags normalized (migration 016)

`cards.tags` carried the apostrophe'd champion spellings (`Kai'Sa`, `Kha'Zix`, `LeBlanc`, `Rek'Sai`) even after `name` was corrected. Migration `20260808000016_normalize_champion_tags.sql` converts them to the canonical `Kaisa` / `Khazix` / `Leblanc` / `Reksai`.

Tags get the opposite treatment from `name` on purpose: they are a **join/match key** (CR 133.8 open vocabulary, CR 103.2.d Signature-must-match-the-Legend's-champion-tag), not printed text a player reads, so there is no authenticity claim to preserve — no `display_name` equivalent is needed. Done now rather than deferred because `card_abilities` is **0 rows** (verified), so no effect program yet embeds the old spelling as a `predicate.tag` literal. `src/lib/core/predicates.ts:221` is the consumer that would have baked it in.

**Scope is 16 rows, not 12.** Four extra cards carry the tag through Signature-to-champion linkage: `ogn-248-298` Icathian Rain, `sfd-188-221` Void Rush, `unl-200-219` Mirror Image, `unl-202-219` Void Assault. Verified against live before committing — exactly 16 rows, and no `Rek'sai` (lowercase) variant survives in tags.

**`src/data/cards.json` was normalized in the same PR, as a separate commit.** It carried the identical 16 apostrophe'd tag arrays, so migrating only the database would have re-created a cards.json↔Supabase divergence — the same bug class as the "Ride The Wind" casing mismatch fixed earlier. This completes a convention the repo had already adopted: per the comment at `src/lib/deckPool.ts:40-50`, cards.json and decks.json were previously migrated to no-apostrophe champion **names**, and tags were simply missed in that pass.

Two things deliberately left alone:

- **Flavour text keeps the authentic spelling.** Four cards quote the character in `flavour` (`-Kai'Sa`, `Rek'Sai's children…`, `- LeBlanc`, `- Kha'Zix`). That is printed display text and is exactly the authenticity case `display_name` exists to protect. The replacement targeted quoted tag tokens only; a naive global find-and-replace would have corrupted all four.
- **`decks.json` tournament deck titles** (`"Rek'Sai, Void Burrower — Hartford 12th (Zult)"`, and 3 more) keep their apostrophes. Those are free-text deck names, not join keys.
