## Thread/topic: winning-line-taxonomy-audit

**Sections likely affected:** 2 (Shipped features), 3 (tracker), 9 (log)

**Customer-facing:**
None — RiftCore's kernel isn't wired into the app yet (nothing outside `src/lib/core/` imports it).

**Team-facing:**
The 2026-07-21 EOD check-in fragment (`docs/updates/pending/2026-07-21-riftcore-checkin.md`) claimed the `WinningLine`/`PointSource` schema reconciliation was already merged to `integration`. That claim was false (see the correction annotated onto that fragment). This PR does the actual reconciliation, designed together with the RiftCore thread:

- `schema.ts`: `WinningLine` is the 6-value match-ending taxonomy (`holdAtSeven`, `conquerBothAtSix`, `holdOneConquerOneAtSix`, `cardEffect`, `deckDepletion`, `altWin`). `PointSource` is now a flat 5-value string union (`conquer`, `holdIntoBeginning`, `cardEffect`, `deckDepletion`, `altWin`) — no longer an object.
- New `ScoreEvent = { player, amount, source, isWinningPoint, battlefieldId? }` replaces the old object-shaped `PointSource` — `battlefieldId` lives here now (present iff `source` is `"conquer"` or `"holdIntoBeginning"`).
- New `GameState.pointsToWin: number` (format-dependent — callers set 8 for 1v1, 11 for 2v2; never hardcoded in the kernel) and `PlayerState.pointsAtTurnStart: number`, snapshotted from `points` via a new `phaseChange` event (`applyEvent` case, fires on `phase === "beginning"`).
- `rulesKernel.ts`: `canScoreWinningPoint` now gates the three battlefield-based lines on exact equality against `pointsAtTurnStart`/`pointsToWin` (not live `points` — a mid-turn conquer can't retroactively satisfy a threshold the turn didn't start at), scaling with `pointsToWin` rather than hardcoding 7/6.
- `Domain`'s 7th value (`"Colorless"`) was already correct and untouched.

**New standing rule or convention worth capturing:**
None new.

**Anything another thread working today should know before touching related code:**
Two known gaps, surfaced rather than guessed at:
1. `conquerBothAtSix`'s check ("both battlefields currently Might-won in this snapshot") is a proxy for "both conquered this turn" — the real rule doesn't require the two conquer points to land simultaneously, but `GameState` has no "already conquered earlier this turn" tracking independent of current board state, so a battlefield secured earlier this turn (defenders already gone) reads as hold-eligible, not conquer-eligible, by the time you check again. Documented in a code comment at `canScoreWinningPoint`.
2. `deckDepletion` and `altWin` have no corresponding `GameState` field yet (no opponent-deck-empty flag, no alt-win-condition flag) — `canScoreWinningPoint` can never emit them today; they exist on `WinningLine` for completeness only.
