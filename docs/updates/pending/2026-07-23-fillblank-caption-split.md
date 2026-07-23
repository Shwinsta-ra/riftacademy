## Thread/topic: fillblank-caption-split

**Sections likely affected:** 2, 9

**Customer-facing:**
Hand-authored fill-in-the-blank questions in RiftRecall now render the same way auto-generated ones already do -- a short label ("Fill in the blank(s):") in the big prompt font, and the actual blanked sentence below it in the smaller caption font, instead of one run-on block of text.

**Team-facing:**
`scripts/apply_master_sheet.py`: when `mode == "fillBlank"`, `custom_prompt` is now run through a new `split_fillblank_prompt()` before the `variant` dict is built. Deliberately conservative, per spec (attached to this thread as `2026-07-23-fillblank-caption-split-spec.md`): matches only the two exact auto-generated label strings (`"Fill in the blank:"` / `"Fill in the blanks:"`), and only strips the outermost `[...]` wrapping the *entire* remainder -- never searches for brackets mid-string, so a card's own real bracketed keyword tags (e.g. `[Empower]`) inside the blanked sentence survive untouched in the caption. Any mismatch (no label, missing/partial brackets, wrong case) falls back to today's exact behavior: whole string as `prompt`, no `caption` key. Every other mode (`might`/`cost`/`keyword`/`speed`/`name`/`text`/`trigger`) is completely untouched -- the split logic is gated strictly behind `mode == "fillBlank"`.

No changes needed on the TypeScript side -- `QuizScreen.tsx` and `attributeQuiz.ts`'s `buildQuestionFromVariant` already correctly render/consume an optional `caption` field (`variant.caption ?? null`); they just never received one for hand-authored rows until now.

Added a new reporting block at the end of the script's run (same style as the existing `skipped_incomplete`/`skipped_bad_category` summaries): total fill-in-the-blank custom rows found, how many split successfully, how many fell back -- with fallback card codes listed -- so a row that doesn't quite match the expected pattern is surfaced immediately rather than requiring an app spot-check to notice.

**Verification (no master-sheet CSV export was available in this session to run the real thing end-to-end, so verified via a synthetic CSV matching the real column layout):** ran `scripts/apply_master_sheet.py` against a 5-row synthetic sheet (`/tmp` scratch, not committed) covering: a plural-label split, a singular-label split with a real `[Empower]` tag *inside* the blanked sentence (confirmed survives untouched in the output `caption`), a no-label fallback, a label-but-no-brackets fallback, and an unrelated `might` custom row (confirmed byte-for-byte identical `variant` shape to before this change). Output JSON and the printed summary both matched expectations exactly (`2 found... 2 split... 2 fell back`, fallback codes listed). Also unit-exercised `split_fillblank_prompt()` directly against 9 cases including case-sensitivity and missing-bracket edge cases -- all passed. `npm run typecheck` and `npm test` (959 tests) both still pass, as expected since no TS/JS files changed.

**Anything another thread working today should know:**
This landed in the same PR as the two RiftRecall UI fixes from earlier today (Sparklet lingering-on-next-card fix, mask "?" size bump) at Ashwin's request -- PR #112, `fix/sparklet-persistence-bug` -> `integration`. If your thread also has small RiftRecall-scoped changes queued for today, check with Ashwin before opening a second PR -- he may want those folded in here too rather than a competing PR against the same base.
