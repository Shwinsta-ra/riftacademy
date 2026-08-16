## Thread/topic: supabase-migration-version-note

**Sections likely affected:** 9 (log), possibly 5/standing rules

**Team-facing:**

Documents a trap hit while applying migration 020 to live on 2026-08-16, added to `supabase/README.md` as rule 4 plus a new subsection under Migrations.

**The Supabase MCP's `apply_migration` ignores the version in your migration filename and stamps its own `YYYYMMDDHHMMSS` timestamp.** The `name` argument is honoured; the version is not derived from it, and there is no argument to set it. So the ledger ends up holding a version no file corresponds to, and `migrations/` holds a file the ledger has never heard of. The next `supabase db push` sees the file as unapplied and re-runs it, which for any `add column` / `create index` migration fails on "already exists".

Concretely: `20260816000020_promo_treatment.sql` was recorded as `20260816142621`. The DDL was correct and complete; only the version was wrong. Corrected in place with a scoped `update supabase_migrations.schema_migrations set version = ...` and verified with `list_migrations` — the ledger now reads `20260816000020 / promo_treatment` as its last entry, in sequence, no gaps.

**Why this needed its own rule rather than folding into rule 1.** Rule 1 already says never apply DDL through the dashboard or the MCP *SQL connector*. That covers paths which record **nothing** — the 008–014 incident. `apply_migration` is a third path the rule did not distinguish: it *does* write a ledger row, just with the wrong version. A ledger that is silently wrong is harder to spot than one that is visibly empty, which is exactly why it earned its own entry instead of a clause appended to an existing one.

**New standing rule or convention worth capturing:**

If you apply a migration through the Supabase MCP's `apply_migration`, **fixing the recorded version is part of applying it, not cleanup for later.** Verify with `list_migrations` rather than trusting the tool's `success: true` — the flag reports that the SQL ran, not that the ledger is coherent with the repo. Prefer updating the tool's own row over inserting a second one; an insert leaves the phantom version behind, which is the same desync in the other direction.

`supabase db push` remains the intended path precisely because it takes the version from the filename and the problem does not arise. `apply_migration` is for when pushing is genuinely unavailable.

**Anything another thread working today should know:**

- **Migration 020 is now applied to live** (`aqhtqgiwvcunbllmbdrq`), ledger version `20260816000020`. `card_printings` has `promo_treatment` (text, nullable), the `card_printings_identity_uniq` functional unique index, and the `card_printings_promo_treatment_nonblank` CHECK. Data untouched: 1,165 rows, 1,165 distinct identity triples, 0 non-null treatments, 0 OP rows. The backfill is still blocked on Infrastructure's `tcgplayer_groups` mapping and must not be guessed.
- Constraint enforcement was verified behaviourally on live, not just by existence check: duplicate identity with both treatments NULL is rejected by the index, the same identity with a distinct treatment is accepted, and a whitespace-only treatment is rejected by the CHECK. Each probe ran inside a self-rolling-back block and zero probe rows persisted.
- This branch touches only `supabase/README.md` and this fragment. No schema, no code.
