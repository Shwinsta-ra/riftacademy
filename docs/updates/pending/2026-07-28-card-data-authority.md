## Thread/topic: card-data-authority

**Sections likely affected:** 9 (log), plus wherever standing conventions live — this is a durable rule, not a one-off change

**Team-facing:**
Independently discovered and corroborated twice this week (RiftLab, 2026-07-26; RiftCoach, 2026-07-28) with matching conclusions, so writing it down once rather than leaving it as tribal knowledge two threads separately rediscovered.

There are two sources of card data and they don't have equal authority — `cards.json` is a generated artifact, the Master Card Inventory CSV is the actual source of truth for most fields, and a handful of fields exist only in the CSV and are deliberately never copied into `cards.json` at all.

**Which source wins, by field** (per `scripts/merge_sheet.py`'s own merge logic, `scripts/merge_sheet.py:1-70` docstring + the field list written at `scripts/merge_sheet.py:384-421`):

- **CSV wins, copied into `cards.json` on every merge:** `domain`, `energy`, `power`/`recycleCost`, `might`, `rarity`, `text`, `keywords`, `speed`, `tags`, `shorthand`, `type`, `subtype`, `isToken`, `isSignature`, `name` (champions/Legends go through `canonical_champion_name` first), `banned1v1` (derived from the CSV's `Bans` column every run).
- **Computed, not copied from either:** `abilityTrigger` — derived from the final merged `text` via `classify_ability_trigger()`, not read from any sheet column.
- **CSV-only, never written to `cards.json` — the never-diff columns:** per the script's own docstring, **Ability Target, Function, Used In, Notes**. These are Ashwin-authored columns that exist purely for his own reference inside the sheet and have no representation in `cards.json` or the app at all. Never add code that tries to read or diff these from `cards.json` — they don't exist there by design, not by omission.
- **cards.json-only, no CSV equivalent:** `id`, `collectorNumber`, `flavour`, `setId`, `setLabel`, `imageUrl` — populated once at card-insertion time (`build_new_card` in `merge_sheet.py`) and never touched by later merges.

**The rule going forward:** if `cards.json` and the CSV ever disagree on a CSV-owned field, the CSV wins — `cards.json` is what merge_sheet.py produces *from* the CSV, not an independent record. Never hand-edit `cards.json` to fix a CSV-owned field; fix the CSV and re-run the merge. The one exception is the CSV-only authored columns above: those never appear in `cards.json` at all, so there's nothing to diff — don't build tooling that expects them there.

**Related:** `scripts/validate_cards.py` (added today) cross-checks energy/might/speed/keyword divergence between the CSV and `cards.json` before a merge — see that script's docstring for usage.
