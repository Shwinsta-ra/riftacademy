## Thread/topic: feedback-discord-silent-failure

**Sections likely affected:** 2 (Shipped features), 9 (log)

**Customer-facing:**
Fixed a bug where submitting the in-app feedback form with "What happened?" left blank silently failed — the app said "Report sent" but nothing reached the Discord dev channel. Reports without that field now go through correctly.

**Team-facing:**
`e2b7134` ("Fix second round of staging feedback...") made "What happened?" optional on the client (`FeedbackSheet.tsx`'s `canSend` dropped the `happened.trim().length > 2` gate) but left the matching `< 3` char rejection in place server-side (`api/feedback.ts`). Every tags-only submission got a 400 from `/api/feedback`, and `transport.ts`'s `sendViaProxy` treated any non-429 4xx as "handled, don't retry" — returning the same boolean as an actual successful send. `queue.ts`'s `submit()` read that boolean as `"sent"` and the UI reported success. This was live on `main` (confirmed `e2b7134` is an ancestor of integration/beta/staging/main).

Fixed in two parts:
1. Removed the stale `whatHappened` length check from `api/feedback.ts`, matching the client. Empty descriptions now render as `_no description given_` in the Discord embed (same pattern already used for the "Expected" field).
2. `transport.ts`'s `send()` and `queue.ts`'s `submit()`/`flush()` now return a three-state result (`"sent" | "rejected" | "retry"` / `"sent" | "queued" | "rejected"`) instead of collapsing "permanently rejected" and "actually sent" into the same `true`. `FeedbackSheet.tsx` now shows an honest "Report didn't go through" (Fury red, the platform's existing "something is broken" convention) instead of falsely claiming success for any future case where the server rejects a report on its merits.

Added `src/feedback/__tests__/queue.test.ts` covering the 200/400/429/500 outcomes and the flush-drops-rejected behavior, since nothing previously covered this path and it's exactly the kind of drift that caused the original bug.

**Anything another thread working today should know before touching related code:**
If you touch `FeedbackSheet.tsx`'s required-field gating again, check `api/feedback.ts` and `src/feedback/transport.ts`'s `buildDiscordPayload` (used by the direct-send path) for a matching change — they're deliberately separate implementations (see the "imports nothing" comment in `api/feedback.ts`) and won't fail loudly if they drift.

**Still open, not fixed here — needs Ashwin to check in the Vercel dashboard:** whether `DISCORD_FEEDBACK_WEBHOOK` is actually set and valid in the Vercel project's env vars. That's separate from this bug and I have no way to verify it from the repo.
