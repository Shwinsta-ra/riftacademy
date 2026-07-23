## Thread/topic: riftcore-data-model-phase-a

**Sections likely affected:** 2 (Shipped features), 3 (tracker), 9 (log)

**Customer-facing:**
None — this is inert, in-repo groundwork for the post-July-31 Supabase migration. Nothing about the running app changed.

**Team-facing:**
Landed Phase A of the RiftCore card/ability data model (design spec `docs/design/RiftCore_Data_Model.md`, decisions fixture `src/data/model/riftcore-function-decisions.json`):
- `scripts/compile_abilities.py` — rule-based compiler, parses `src/data/cards.json` card text (cross-referenced against `~/Downloads/Master Card Inventory.csv`'s Function/Ability Target columns as a disambiguation signal, not the primary source) into candidate `card_abilities`/`ability_steps` rows per the spec's §2 schema shape, with a per-card confidence score.
- Calibrated against the 52 locked decisions in the fixture: **52/52 exact match.** (One bug found and fixed along the way: the keyword-grant regex was missing a `\s*` before the optional "this turn" suffix, silently failing to match on 4 of the 52 — e.g. Cleave, Block, Vault Breaker.)
- Ran against all 918 cards in `cards.json`: 134 high-confidence (auto-accepted into `src/data/model/abilities.json`), 784 queued into `src/data/model/abilities.review.json` (each with its parsed guess, confidence score, and full source text for fast human adjudication). The high queue fraction is expected — the calibration set is skewed toward simple single-clause removal/combat-trick spells; the long tail (multi-ability champions, gear, complex conditionals) is exactly what §4 designed the review queue for.
- Zero-impact verified: nothing outside `src/data/model/` imports it (grepped clean), `src/data/cards.json` untouched, no build/CI changes, compiler is manual-only (`python scripts/compile_abilities.py`), `src/lib/core/` untouched. `tsc --noEmit` and the existing test suite (30 tests) both pass clean.

**New standing rule or convention worth capturing:**
None new — this follows the existing zero-terminal-file-placement and doc-fragment conventions already in `CLAUDE.md`.

**Anything another thread working today should know before touching related code:**
This is Phase A only (inert JSON artifacts). Phase B (promoting this schema to Supabase/Postgres, app reads from DB) and the `core/effects.ts` registry expansion (15 missing functions surfaced by the decisions fixture) are both explicitly deferred — not started, not scoped into this PR. If your thread touches `src/lib/core/` today, this PR has no bearing on it.
