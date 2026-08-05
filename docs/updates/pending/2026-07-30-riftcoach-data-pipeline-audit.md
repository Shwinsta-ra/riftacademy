## Thread/topic: riftcoach-data-pipeline-audit

**Sections likely affected:** 9 (log), plus wherever `docs/updates/pending/2026-07-28-card-data-authority.md`'s "known follow-up" note lives once reconciled

**Team-facing:**
Two follow-ups from the 2026-07-30 RiftCoach handoff (PR #131 item 3's repo-wide ask, and item 5), both closing gaps the 2026-07-28 card-data-authority fragment flagged but didn't fix yet.

**1. Substring card-name matching, repo-wide audit + fix.** A full-repo sweep for `SEARCH(`, `.contains(`, `.includes(`, `LIKE '%...%'`, and unanchored regex against card-name fields found two live instances of the exact bug class that once caused the "Poro" turn-1 undercount: `find()` in both `docs/riftcoach/build_guide.py` and `docs/riftcoach/pool_workbook.py` had a `startswith()` fallback (`k.startswith(n) or n.startswith(k)`) used to resolve every V7 tier-list, pool, and deck lookup — not just the turn-1 counter, which was the only site patched on 2026-07-30. Today's tier-list/pool/deck data happens not to trigger it (no current name is a prefix of another), but it's the same latent risk. Removed from both; `find()` in each file is now exact-name-only (build_guide.py keeps a whole-word token-overlap fallback requiring 2+ shared words, which can't reproduce the Poro-style collision since single shared tokens like "poro" don't clear that bar). Everywhere else checked (`src/lib/deckPool.ts`'s `resolveCardByName`, `scripts/merge_sheet.py`'s `names_close_enough` edit-distance matcher, UI search-box filters in `MatchDetailScreen.tsx`) already does exact or non-name matching — no other fix needed.

**2. Energy/might/speed/keyword cross-check moved into the actual merge pipeline.** `scripts/validate_cards.py` (added 2026-07-28) already did this check correctly but stood alone, unwired — the prior fragment called this "a known follow-up, not urgent." `scripts/merge_sheet.py` now runs the same check inline, per-card, immediately before it overwrites `cards.json`'s energy/might/speed/keywords with the incoming CSV row, printing a `MISMATCH` line (same format as `build_guide.py`'s existing print) for every field that's about to change. This runs on every real merge, for every set, not just the ad hoc VEN-only check `build_guide.py` did on its own. `validate_cards.py` still exists for a read-only check without running a merge; its docstring now says so.

Neither change touches Subtype/Function/Ability Target/Used In — those stay CSV-authoritative and out of scope for this check, per the existing rule.

**Anything another thread should know:**
If you're writing new tooling that reads both the CSV and `cards.json`, you no longer need to hand-roll the energy/might/speed/keyword divergence check — `scripts/merge_sheet.py` surfaces it automatically on every merge, and `scripts/validate_cards.py` is there for a standalone dry run.
