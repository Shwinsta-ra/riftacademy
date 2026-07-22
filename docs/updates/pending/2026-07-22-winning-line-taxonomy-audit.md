## Thread/topic: winning-line-taxonomy-audit

**Sections likely affected:** 2 (Shipped features), 3 (tracker), 9 (log)

**Customer-facing:**
None — RiftCore's kernel isn't wired into the app yet (nothing outside `src/lib/core/` imports it).

**Team-facing:**
The 2026-07-21 EOD check-in fragment (`docs/updates/pending/2026-07-21-riftcore-checkin.md`) claimed the `WinningLine`/`PointSource` schema reconciliation was already merged to `integration` with `canScoreWinningPoint` built on the canonical taxonomy. That claim was **false** — verified directly against `src/lib/core/schema.ts` and `rulesKernel.ts` on `integration`, both still had the older 3-value reconstruction (`"conquer" | "hold" | "direct"`), and no unmerged branch had the canonical version either. Flagging this rather than leaving the false claim uncorrected: whoever/whatever wrote that check-in either checked the wrong branch/file or fabricated the verification.

This PR does the actual reconciliation:
- `schema.ts`: `WinningLine` is now the 6-value match-ending taxonomy (`holdAtSeven`, `conquerBothAtSix`, `holdOneConquerOneAtSix`, `cardEffect`, `deckDepletion`, `altWin`). `PointSource.line` is now the 5-value per-point-cause taxonomy (`conquer`, `holdIntoBeginning`, `cardEffect`, `deckDepletion`, `altWin`) — these are now two distinct concepts (a WinningLine is the match-ending pattern; a PointSource is what caused one point along the way), where before `WinningLine` served both roles.
- `rulesKernel.ts`: `canScoreWinningPoint` returns `WinningLine[]` using the new taxonomy. `Domain`'s 7th value (`"Colorless"`) was already correct and untouched.

**New standing rule or convention worth capturing:**
None new.

**Anything another thread working today should know before touching related code:**
`canScoreWinningPoint`'s point-threshold logic (7 for a hold-sourced win, 6 for a conquer-sourced win, gated on exactly 2 battlefields for the mixed/both lines) is **explicitly provisional** — flagged in a code comment at its definition. It's a best-effort reading of the `WinningLine` names, not a ruling Ashwin has confirmed; `docs/riftiq/RiftIQ_Data_Asks_for_Inventory_and_QuestionSheet.md` B1 items 3–4 ("holdAtSeven timing", "point race") list this exact threshold/timing logic as still-open `[CHECK]`s. `GameState` also has no phase field yet, so the function can't gate `holdAtSeven` on "only at YOUR Beginning Phase" per item 3 — it just checks whether an uncontested hold is available. `deckDepletion` and `altWin` have no corresponding `GameState` field yet, so `canScoreWinningPoint` can never emit them today. Once Ashwin rules on B1 items 3–4, this logic needs a follow-up pass.
