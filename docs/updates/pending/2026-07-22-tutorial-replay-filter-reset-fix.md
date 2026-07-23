## Thread/topic: tutorial-replay-filter-reset-fix

**Sections likely affected:** 2, 9

**Customer-facing:**
Fixed a bug where replaying the onboarding tutorial (Progress screen → "Replay tutorial") could leave a returning user stuck: if they already had a filter set (e.g. Vendetta), tapping the Vendetta chip per the tutorial's own instruction would deselect it instead of selecting it, and re-selecting it landed back on their already-saved filters, permanently disabling the "Set filters" button with no way to continue.

**Team-facing:**
Root cause: `restart()` in `src/lib/tutorialContext.tsx` only reset the tutorial's own step pointer (`stepIndex`/`targetRect`) — it never touched the filters store. `SettingsScreen.tsx`'s "Set filters" button is `disabled={!dirty}`, where `dirty = JSON.stringify(staged) !== JSON.stringify(filters)`. For a user replaying with Vendetta already selected: `staged === filters` at mount (`dirty=false`) → tapping the chip toggles Vendetta OFF (already present) → `dirty=true`, button enables, tutorial step advances (it completes unconditionally on tap, not on the chip ending up selected) → user, seeing it deselected, taps again to reselect → `staged` now exactly equals the original saved `filters` again → `dirty=false` → button disables again, permanently, since nothing else changes `staged` after that.

Fix (exactly as specified — clear all filters before restarting, same as first entry): `restart()` now calls `setFilters(DEFAULT_FILTERS)` before resetting the step index. `DEFAULT_FILTERS` was made an exported const in `src/lib/filtersStore.tsx` (was previously local-only) so `tutorialContext.tsx` doesn't have to duplicate the literal. `TutorialProvider` already renders inside `FiltersProvider` in `App.tsx`, so `useFilters()` is safe to call there.

With filters cleared before every replay, the tutorial's `newestSetChip` step now always starts from the same unselected state as a genuine first launch — tapping the chip selects it (never deselects), and "Set filters" enables and stays enabled through to commit, matching first-launch behavior exactly.

**Verification:** Reproduced and confirmed fixed live (Expo web): pre-set `sets: ["VEN"]` + tutorial-seen flags via localStorage (simulating a returning user), clicked "Replay tutorial" — filters immediately cleared to `{sets:[],...}` (confirmed via localStorage read). Walked the tutorial to the Settings screen: Vendetta chip rendered unselected; tapping it selected (not deselected) it; "Set filters" was enabled (not greyed out); committing correctly saved `{sets:["VEN"]}` and the tutorial advanced to its final step on Home ("You're ready. Tap here to start studying!"). `npm run typecheck` and `npm run test` (959 tests) both pass clean.

**Anything another thread working today should know:**
Noticed but did NOT fix (out of scope for this bug, flagging for awareness): at a short/desktop-sized viewport (1280×720), the tutorial callout bubble on the `setFiltersCTA` step can render overlapping the "Set filters" button itself (the bubble sits at `pointerEvents: auto` and its bounding box overlaps part of the button beneath it), which can swallow a tap landing in the overlapping region. Not reproduced as an issue in the actual fix verification (clicking a non-overlapped part of the button worked fine), and unclear whether it reproduces at real phone viewport sizes this app targets — worth a look if a "can't tap Set filters" report ever comes in that ISN'T explained by the stale-filters bug fixed here.
