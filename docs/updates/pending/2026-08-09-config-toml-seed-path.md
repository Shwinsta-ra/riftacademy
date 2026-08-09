## Thread/topic: config-toml-seed-path

**Sections likely affected:** 3, 9

**Team-facing:**

`supabase/config.toml`'s `[db.seed] sql_paths` was `["./seed.sql"]` — a path that has **never existed**. Paths resolve relative to the `supabase/` directory, and the real files are in `supabase/seed/`. Net effect: **`supabase db reset` has been seeding nothing at all.** Now `["./seed/seed_card_bans.sql"]`.

Scope is local dev and ephemeral CI resets only. Live is untouched and remains the source of truth for card data, so there was never production risk here — just broken local dev.

Two deliberate choices in the fix:

- **Not a glob** over `./seed/*.sql`. That directory also holds read-only verification scripts (`postload_verification.sql`, `ligature_encoding_audit.sql`, and three others) which must not run as part of seeding. Only genuine seed data is listed.
- **`seed_cards.sql` is deliberately excluded**, and stays excluded even though it is still on disk on `integration` (its deletion is in PR #193, not yet merged). Auto-loading a 556KB committed card dump on every reset reintroduces exactly the staleness it was flagged for. Bans are a genuine one-time load worth auto-seeding; cards are not, by the project's own stated reasoning.

**The bans seed's verification gate had to be reworked, and this is the part worth reviewing.**

`seed_card_bans.sql` inserts by matching card *names* (`select ... from cards where c.name in (...)`), and its header says "MUST RUN AFTER the cards table is seeded." It ended with a gate asserting **exactly 4 rows or raise**, retained at Core's instruction.

That assertion assumed card data is always present — true while `seed_cards.sql` was auto-loaded, false now. On a fresh `db reset` only migration 008's 25 cards exist, and **none of the 4 ban targets are among them** (verified: 0 of 4 appear in 008's inserts). So simply pointing `sql_paths` at the bans seed would have made **`db reset` fail on every run** with "produced 0 rows, expected 4."

Reworked to assert the invariant that survives an unseeded database: **every ban-target card that exists must have produced its ban row.**

- A target card present but with no ban row → **exception**. This is the name-matching failure Core actually wanted caught, and it still fires.
- Target cards simply absent → **notice**, naming the count and pointing at the bootstrap. Expected on a fresh reset.

Core's intent is preserved; only the assumption that card data is always loaded is dropped. Same reasoning already applied to migrations 015 and 016 — assert what holds at any row count, because seeds load after migrations. **Flagged for Core**, since it modifies a gate they explicitly asked to retain.

**Anything another thread working today should know:**

- **Local `db reset` now seeds bans and nothing else.** You will get a notice that fewer than 4 ban rows were created, and that is correct, not a failure. To get a working local card set, pull from live rather than expecting the repo to provide it.
- **Not verified by running it.** `supabase db reset` needs Docker, which is installed on this machine but not running, and the reset pulls a multi-hundred-MB postgres image. The failure mode above was established by static analysis — reading the seed's SQL and confirming 0 of 4 ban-target names appear in migration 008's inserts — not by executing a reset. **Someone should run `supabase db reset` with Docker up before this is trusted**, per the project's own "labels vs. outcome" lesson. What to expect on success: reset completes, `select count(*) from card_bans` returns a small number with a notice explaining it, and no exception.
