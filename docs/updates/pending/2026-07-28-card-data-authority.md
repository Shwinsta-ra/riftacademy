## Thread/topic: card-data-authority

**Sections likely affected:** 9 (log), plus wherever standing conventions live — this is a durable rule, not a one-off change

**Team-facing:**
Independently discovered and corroborated twice this week (RiftLab, 2026-07-26; RiftCoach, 2026-07-28) with matching conclusions, so writing it down once rather than leaving it as tribal knowledge two threads separately rediscovered.

There are two distinct questions here that earlier drafts of this fragment conflated, and getting them backwards is exactly the mistake that let six energy errors and five Might errors reach a printed sheet at a live event (all six: Covert Informant, Repair Specialist, Baccai Witherclaw, Mask Mother, Minah Swiftfoot, Aurok General — all since corrected by Ashwin, zero diffs remaining across all 166 Vendetta rows as of 2026-07-30):

1. **Which direction data mechanically flows** on a merge (`scripts/merge_sheet.py`).
2. **Which value to trust when the two sources disagree** at some point in time between merges — these are not the same answer.

**1. Mechanical merge direction** (`scripts/merge_sheet.py:384-421`): on every run, the CSV is copied into `cards.json` for `domain`, `energy`, `power`/`recycleCost`, `might`, `rarity`, `text`, `keywords`, `speed`, `tags`, `shorthand`, `type`, `subtype`, `isToken`, `isSignature`, `name`, `banned1v1` (derived from the CSV's `Bans` column). `abilityTrigger` is computed from the merged `text`, not copied from either source. `id`, `collectorNumber`, `flavour`, `setId`, `setLabel`, `imageUrl` are cards.json-only, set once at insertion (`build_new_card`) and never touched again.

**2. Which value to trust on disagreement** — per `docs/riftcoach/build_guide.py:12-18` (its own data-authority docstring, now the canonical statement of this rule):

| Field | Authoritative source |
|---|---|
| energy, might, speed, keywords | `cards.json` |
| Subtype (Champion/Equipment/None — card typing), Function, Ability Target, Used In | the CSV |

The reason these can point opposite ways from the mechanical merge direction: the CSV is Ashwin's live editing surface, and a typo there is uncorrected until the next `merge_sheet.py` run closes the loop. Between merges, `cards.json` reflects the last-reconciled-good state, so for energy/might/speed/keywords it's the one to trust if a build script needs to consume the CSV directly before the next merge. **Never hand-edit `cards.json` to "fix" one of these four fields — fix the CSV and re-run the merge**, but if you can't wait for a merge (e.g. generating a printed guide from a fresh CSV export), prefer `cards.json`'s value and flag the CSV as stale, per `build_guide.py`'s own cross-check (lines 65–81 there print a `MISMATCH` line and override the CSV value with cards.json's).

**Function, Ability Target, Used In are CSV-only and never appear in `cards.json` at all** (confirmed: `scripts/merge_sheet.py`'s own docstring, "NEVER reads Ability Target / Function / Used In / Notes") — there is nothing to diff for these; don't build tooling that expects them in `cards.json`. `Subtype` is the one field in this row that IS also mechanically copied into `cards.json`'s own `subtype` field (see part 1 above) — but per `build_guide.py`'s docstring it's still the CSV's authored value that should be treated as ground truth if the two ever diverge, since `cards.json`'s copy is only as fresh as the last merge.

**Related:** `scripts/validate_cards.py` (added 2026-07-28) cross-checks energy/might/speed/keyword divergence between the CSV and `cards.json` without writing anything — see that script's docstring for usage. `docs/riftcoach/build_guide.py` does its own narrower version of the same energy/might check inline (VEN-only, cards.json wins on mismatch) — the two aren't yet unified; that's a known follow-up, not urgent.
