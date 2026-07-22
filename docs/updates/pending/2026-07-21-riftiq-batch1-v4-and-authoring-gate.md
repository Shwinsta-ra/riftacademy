## Thread/topic: riftiq-batch1-v4-and-authoring-gate

**Sections likely affected:** 2 (Shipped features), 3 (tracker), 9 (log)

**Customer-facing:**
No shipped in-app change yet — these are the six Batch 1 combat puzzles (one per domain) in design/review form, not yet wired into a puzzle UI.

**Team-facing:**
Landed `docs/riftiq/RiftIQ_Batch1_v4.md` (six puzzles, status: awaiting Ashwin's review, supersedes v3) and `docs/riftiq/RiftIQ_Data_Asks_for_Inventory_and_QuestionSheet.md`. `RiftIQ_Puzzle_Design_Catalog.md` could **not** be landed — it's referenced in RiftIQ's own EOD check-in as "session output" but doesn't exist as a file anywhere checked (Downloads, the Drive RiftAcademy folder, or a full-account Drive search by title/fulltext). Flagging rather than fabricating; RiftIQ's thread needs to re-export or re-produce it.

v3 -> v4 fixed real illegalities: two puzzles (`calm-1`, `fury-1`) were silently broken by which Master Yi legend card was on the board — Wuju Bladesman's "+2 Might while defending alone" passive changed the combat math enough to erase the intended decision in both. Root cause: puzzles were being validated card-by-card, not legend-by-legend.

**New standing rule or convention worth capturing:**
New validation checklist item **G: legend-passive audit** — every puzzle/board-state must check *both* legends' abilities against the combat math, not just the units on the board, and state XP wherever a legend has XP-gated abilities. A legend's passive is invisible in a card list but changes combat math outright. **This applies beyond RiftIQ** — any thread authoring or validating board states (RiftEngine reconstruction, RiftCore kernel tests, future RiftIQ batches) needs the same gate, not just puzzle authoring.

Also new: checklist item H (point-race safety — verify the opponent's max points this turn can't end the game before your line resolves) and I (simultaneous-damage wording — the decision must sit before the pass-priority point).

**Anything another thread working today should know before touching related code:**
v4's puzzles are hand-authored and hand-verified; kernel verification is deferred by decision, not a blocker. Three open questions are waiting on Ashwin (calm-1 difficulty rating, Batch 2 domain rotation, whether to audit/rebuild the existing ~14 legacy puzzles against the new gate) — see `docs/riftiq/RiftIQ_Batch1_v4.md` section 7.
