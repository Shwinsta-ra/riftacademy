## Thread/topic: riftiq-remove-new-match-alpha-prep

**Sections likely affected:** 2, 3, 9

**Customer-facing:**
Ahead of soft alpha launch to communities, the RiftIQ section on Home now only shows "Daily Puzzle (coming soon)" — the "New Match" button is removed, since match analysis isn't shipping in its current state for this launch. RiftIQ's subheadline changed from "Match analysis & strategy puzzles" to "Game puzzles & tutorials" to match what's actually being offered.

**Team-facing:**
`HomeScreen.tsx`'s RiftIQ `FeatureBox` no longer renders the `GlowButton` that navigated to `MatchList`. Scope was deliberately narrow, per Ashwin's explicit ask: remove the Home-screen entry point only. The underlying `MatchList`/`MatchDetail` screens and their routes in `App.tsx`'s navigation stack are untouched — the feature's code still exists, it's just unreachable from Home now. Nothing else on the RiftRecall side of Home changed.

Verified live (Expo web): RiftIQ box now shows exactly the subheadline + the single greyed-out "Daily Puzzle (coming soon)" button, no "New Match" CTA. `npm run typecheck` and `npm run test` (959 tests) both pass clean — no other code referenced the removed button or its handler.

**Anything another thread working today should know:**
`MatchList`/`MatchDetail` are now orphaned from the UI (still fully functional if navigated to directly, e.g. via deep link or dev tools, just no longer linked from Home) — if a future thread wants to fully retire the match-analysis feature rather than just hide its entry point, those screens/routes are the next thing to remove, not touched here since that wasn't today's ask.
