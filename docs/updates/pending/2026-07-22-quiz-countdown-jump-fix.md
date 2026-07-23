## Thread/topic: quiz-countdown-jump-fix

**Sections likely affected:** 2 (Shipped features), 9 (log)

**Customer-facing:**
Fixed a visual glitch on RiftRecall's "next batch unlocks in" countdown screen: right after finishing a batch, the timer would briefly flash a too-high number before jumping down to the correct one a moment later.

**Team-facing:**
Root cause, found from a screen recording showing the jump at ~2.6s into the clip: `QuizScreen.tsx`'s `nowTick` state only advances via the countdown's own 1-second `setInterval`, which doesn't start running until `batchGateUntil` is truthy. During an active study session `batchGateUntil` is `null`, so `nowTick` sits frozen at whatever it was last stamped to — which, for a session that never hit a gate before finishing, is this screen's own mount time.

`handleNext`'s batch-completion branch (`remaining.length === 0`) set `batchGateUntil = now + BATCH_COOLDOWN_MIN * 60_000` but never re-stamped `nowTick`. So the very first countdown render computed `msLeft = batchGateUntil - nowTick`, which included the ENTIRE elapsed study-session duration on top of the real 10-minute cooldown (mount time could be minutes before the batch actually finished). It then visibly snapped down to the correct value about a second later once the interval's first tick fired and set `nowTick` to the real current time.

`loadSession`'s two gate-setting branches already guarded against exactly this failure mode (see their existing comment — they pair `setBatchGateUntil` with `setNowTick(now)` for precisely this reason), but the fix was never applied to `handleNext`'s branch, which has the same hazard and a worse magnitude (a full study session's length, not just an async await gap).

Fix: added the matching `setNowTick(now)` call to `handleNext`'s batch-completion branch.

**Verification:** Reproduced via a controlled Expo-web test — forced a filtered review batch down to exactly one due card (all other Battlefield/OGN cards given far-future `dueAt` via direct `localStorage` progress injection), let the quiz screen sit mounted for ~30s before answering the single card (simulating a real study session's elapsed time), then answered and advanced. Countdown's first render showed the correct `9:56` (not inflated by the 30s), and continued ticking down smoothly with no correction jump on subsequent frames.

**Anything another thread working today should know:**
Any future `setBatchGateUntil(...)` call site needs a paired `setNowTick(now)` using the exact same `now` value — there are now three call sites doing this (two in `loadSession`, one in `handleNext`) and the reasoning comment is duplicated at each rather than factored out, since they're each guarding a distinct code path.
