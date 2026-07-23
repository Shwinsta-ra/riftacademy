## Thread/topic: sparklet-persistence-bug

**Sections likely affected:** 2, 9

**Customer-facing:**
Fixed a bug where the "Correct!" celebration mascot could linger onto the next card if you tapped "Next" quickly — it now disappears immediately when the card changes.

**Team-facing:**
`Sparklet` (`src/components/Sparklet.tsx`) stays mounted across question changes — `QuizCardArt` renders it into a fixed `decoration` slot rather than remounting per-question. Its fade-out is a self-contained ~1.9s `Animated` sequence keyed only off `playKey` (bumped on correct answers), so if `handleNext` fired before that sequence finished, the still-fading reaction from the OLD card rendered on top of the NEW one.

Fix: added a new required `activeKey` prop (QuizScreen passes `card.id`) and a `useLayoutEffect` keyed on it that immediately `stopAnimation()` + `setValue(0)`s every animated channel (`body`, `cap`, `spark`, `toast`, `shown`) whenever the active card changes — runs before paint, so there's no visible frame of overlap. `playKey`'s existing effect (which fires the celebration) is untouched; the two keys change independently (`playKey` on a correct answer while the card is still the same, `activeKey` on `handleNext`), so they don't interfere with each other.

Verified via direct code read: `src/components/Sparklet.tsx` and `src/screens/QuizScreen.tsx:547` (the `<Sparklet playKey={correctPlayKey} activeKey={card.id} />` call site). Could not run `npm run typecheck` in this session — `node_modules` is not installed in this container — so this has not been verified by the type checker or in a running app; flagging that gap explicitly rather than claiming a check that didn't happen.

**Anything another thread working today should know:**
`Sparklet`'s props now require `activeKey` (a string) in addition to `playKey` — if another thread adds a second call site for `Sparklet`, it needs to pass something that changes per-card/question, not just per-correct-answer.
