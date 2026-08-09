## Thread/topic: config-toml-seed-path

**Sections likely affected:** 3, 9

**Team-facing:**

**`supabase db reset` now seeds nothing, by design.** `[db.seed] sql_paths` is `[]`, and both files that lived in `supabase/seed/` are retired. Migrations 001–016 are the complete, self-sufficient path to a correct database.

Two separate problems, found in sequence:

**1. The path was broken.** `sql_paths` was `["./seed.sql"]` — a path that has **never existed**. Paths resolve relative to `supabase/`; the real files were in `supabase/seed/`. So `db reset` had been silently seeding nothing. Local dev and ephemeral CI only; live was never affected. Found by Infra review.

**2. The remaining seed file was redundant and actively harmful.** The obvious fix — point `sql_paths` at `seed_card_bans.sql` — was **wrong**, and this is the part worth remembering.

`seed_card_bans.sql` fully duplicated migration `20260805000008_backfill_master_inventory.sql`, which is applied and immutable:

| Check | Result |
|---|---|
| Ban rows inserted by migration 008 | **11** (7 March-2026 + 4 July-2026) |
| Ban rows inserted by `seed_card_bans.sql` | 4 — the *same* July-2026 four, identical `card_code`/`format`/`mode`/`effective_date` |
| Live `card_bans` today | exactly **11**, confirming migration 008 alone fully seeds bans |
| `card_bans` constraints | `PRIMARY KEY (ban_id)` only — a **surrogate** key, no uniqueness on `(card_code, format, mode, effective_date)` |

Because the primary key is surrogate, re-running the seed after migration 008 **does not error — it silently inserts 4 duplicate rows.** Seed files always run after migrations, so `sql_paths` ordering guaranteed exactly that.

**This file has been unrunnable since migration 008 landed on 2026-08-05.** Any gate comparing `card_bans` totals sees migration 008's 11 rows and fails. The dead `./seed.sql` path was the only thing hiding it — wiring it up surfaced a latent bug rather than creating a new one.

So the file is deleted and `sql_paths` is empty. Content preserved in git history: `git log --diff-filter=D -- supabase/seed/seed_card_bans.sql`.

**Verification-gate pattern worth keeping even though its file is gone.** Before deletion, that gate was reworked to assert what survives an unseeded database — separating "target data not loaded yet" (a notice) from "a name failed to match" (an exception) — rather than a flat expected row count. That is the right template for any future seed or migration gate, and the same reasoning behind the assertions in migrations 015 and 016. Recorded in `supabase/README.md` so the reasoning outlives the file.

**Anything another thread working today should know:**

- **`db reset` seeds nothing now, and that is correct.** A local reset gives you migrations only. Card data comes from a fresh pull against live, not from the repo.
- **Do not re-wire `sql_paths` with a glob** over `./seed/*.sql`. That directory now holds only read-only verification scripts, which must never run as part of seeding.
- **If ban seeding is ever needed again, write a new migration** — not a seed file competing with one that already ran.
- **Still not verified by execution.** `supabase db reset` needs Docker, which is installed on this machine but not running, and the reset pulls a multi-hundred-MB postgres image. Everything above rests on static analysis plus live queries against `card_bans` and its constraints. With `sql_paths = []` the risk is now much lower — there is no seed step left to fail — but a reset with Docker up is still the only true confirmation.
