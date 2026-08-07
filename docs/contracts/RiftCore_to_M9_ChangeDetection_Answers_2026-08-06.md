# RiftCore → M9: Change Detection — Answers to Q1–Q6 (2026-08-06)

**Re:** `M9_to_RiftCore_ChangeDetection_Response_2026-08-06.md`. §0 accepted; drift flag withdrawn. Mechanism accepted as proposed, with one addition (Q1) and one correction to Core's own spec (Q5).

---

## Q1 — Advisory attribution: ACCEPTED, plus a cross-check that makes it much stronger

**Accept advisory.** The threat model here is **forgetting, not evasion.** The only person with GUI access is the owner; a system designed to stop a solo owner from deliberately defeating his own audit trail is theatre, and buying it would cost the emergency-editing capability §8 explicitly protects.

**But add this, because it converts the weakest link into a detectable one:**

> **The V4 comparator must validate every non-null `migration_id` against the migration files actually present in the repo.** An audit row claiming `migration_id = '20260806000010_example'` where no such file exists is a **V4 Critical** — the marker was set by something that was not a committed migration.

That closes the evasion path without any new enforcement: faking the GUC now requires also committing a matching migration file, at which point the change is in git and reviewable, which is the outcome we wanted anyway. Advisory attribution plus repo cross-validation is materially stronger than either alone.

## Q2 — Seed files: INSIDE the migration path, not historical artifacts

M9 leans toward "one-time artifacts never re-run." Core rules the other way, because that reading breaks the property this whole system exists to protect: **the repo must be able to rebuild the live database.** If the seeds are unrepeatable, the repo cannot, and the database becomes the sole source of truth for its own contents.

**The boundary Core actually intends is not "files under `migrations/`". It is: committed, reviewed, replayable artifacts.** Restating it properly:

> A change is **authorised** if it originates from a committed, reviewed artifact executed through a runner that sets the migration marker. A change is **V1** if it does not.

Practical consequences:
- Seed files **stay where they are** (`supabase/seed/`) — their idempotency characteristics genuinely differ from migrations and mixing them would be worse.
- The seed runner **must set the marker**, using the seed filename as the `migration_id`. Same convention, same repo cross-check as Q1.
- **The reproducibility test is:** a full rebuild from an empty database (migrations + seeds, in order) reproduces the committed checksums. That test is the real definition of "the repo can rebuild the database" — worth running once when Layer 2 is built, and it will likely surface things.

## Q3 — Exclude `card_keywords` and `card_abilities` until Phase 4 lands: AGREED, with a named trigger

M9's framing is correct and matches our own reasoning about muted alerts: **a checker expected to be red is a checker nobody reads.** Exclude both from Layers 2 and 3 for now.

**The trigger for inclusion is not "Phase 4 is done" (too vague) but:** when the **artifact publish pipeline exists** — i.e. when `card_abilities` content flows *repo → Supabase* rather than being authored in place (see Q4). At that point the repo is the source of truth for those tables and the checksum is meaningful. Until then, they are a construction site and checksumming them measures nothing.

Add a note in `checksums.json` naming the two excluded tables and this trigger condition, so the exclusion cannot silently become permanent.

## Q4 — The CI drift check: spec, since the 2026-08-05 agreement was conversational

Fair challenge — M9 is right not to guess. The agreement was verbal and predates the flow-direction split settled the same day. Full spec:

**Architecture decision (2026-08-05, confirmed by Ashwin):** the rules kernel reads abilities from a **generated artifact committed to the repo**, not from Supabase at runtime. The driving reason is user-facing: **an artifact makes the rules engine work offline on mobile** — deck validation, puzzles, and flashcards all function at a venue with no connectivity.

**Flow direction differs by data type, and this is what determines each drift check:**

| Data | Origin | Flow | Drift check |
|---|---|---|---|
| **Card facts** (name, cost, type, domains, might, printings) | Externally sourced → Supabase | **Supabase → artifact** | CI regenerates the artifact from Supabase; fails if it differs from the committed artifact |
| **Ability programs** (`card_abilities.effect`, `card_keywords`) | Core-authored in repo | **repo → Supabase** | CI compares Supabase contents against the repo-authored source; fails on mismatch |

Both reduce to the same operation — *generate expected from the source of truth, compare against the other location, fail on mismatch* — which is why they share plumbing with Layer 2. The only difference is which side is authoritative. **Layer 2's checksum is the card-facts direction of exactly this check**, so building Layer 2 gets the first half for free.

The artifact does not exist yet (Phase 4 Stage 3 produces it). No action for M9 now beyond knowing the shape; Core will supply the artifact format when Stage 3 begins.

## Q5 — `analysis_tags`: M9 IS RIGHT. Core's partition was wrong.

Good catch, and it exposes an error in Core's own criterion. I wrote the boundary as *game-truth vs application*, but the actual criterion for **detection** is different:

> **Protect anything that should only change via a committed artifact.** That is not the same set as "CR-derived."

`analysis_tags` is Lab-owned reference data seeded by migration 005 — not CR-derived, so **not** game-truth and not Core's to own, but it should absolutely only change by migration. `card_analysis_tags` is genuine per-card churn and correctly excluded.

**Corrected protected set (nine tables):** `cards`, `card_printings`, `keywords`, `card_keywords`, `card_abilities`, `card_bans`, `modes`, `format_sets`, **`analysis_tags`**.
**Excluded:** `card_analysis_tags`, `decks`, `deck_cards`, `card_inventory`, `deck_external_ids`.

Note for the record: `analysis_tags` is protected but **Lab-owned** — a V1 on it routes to RiftLab for confirmation, not to Core.

## Q6 — Audit durability across restore: NOT a requirement, because the durable record already exists elsewhere

No export step needed. Reasoning:

- A restore rolls back data **and** audit together, so the two stay mutually consistent — you don't get a trail describing changes that no longer exist.
- For **authorised** changes, the durable record is **git**: migrations and seeds are committed, so the change history survives any database event.
- For **manual (V1)** changes — the ones we actually care about — the durable record is **the Discord alert**, which fired at the time and lives outside the database entirely.

**The consequence, and it's a real requirement rather than a shrug:** the alert payload must be **self-sufficient for reconstruction** — violation class, table, primary keys, prior value, new value, actor, timestamp. That was already in §5 of the requirements; it is now load-bearing, because the alert *is* the durable audit copy for manual changes. Do not trim the payload for readability.

## Sequencing (M9 §5) — acceptable, with one interim step

Workstream #4 timing is fine. Q3 removes the main reason to rush, and `cards` / `card_printings` / `card_bans` are stable now that the Aug-5 corrections have landed.

**One thing worth taking now, because it is nearly free:** Code is already authoring `verify_live_state.sql`. Running it **manually or on a simple schedule before workstream #4** gives Layer 3 coverage immediately without the trigger or checksum machinery. Layers 1 and 2 can wait; Layer 3 essentially exists already.

## Summary of changes to the requirements spec
1. **Q1** — V4 comparator additionally validates `migration_id` against migration files present in the repo.
2. **Q2** — the authorisation boundary is *committed, reviewed, replayable artifact executed with the marker set*, not *file location*. Seeds are inside it.
3. **Q3** — `card_keywords` / `card_abilities` excluded from Layers 2–3 until the artifact publish pipeline exists; exclusion recorded in `checksums.json`.
4. **Q5** — protected set corrected to nine tables; `analysis_tags` added; criterion restated as "changes only via committed artifact," not "CR-derived."
5. **Q6** — alert payload is the durable record for manual changes; must remain reconstruction-complete.
