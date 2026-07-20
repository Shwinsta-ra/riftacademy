# Daily Update Fragment — Template

Copy this into a new file at `docs/updates/pending/YYYY-MM-DD-short-topic.md` as part of your PR — **never edit `docs/RiftAcademy_Project Management.md` directly.** The filename must be unique (date + short topic slug) so two threads writing on the same day never collide. This file gets folded into the master doc and deleted at the end-of-day reconciliation.

Delete every instruction line below before committing — only your actual content should remain in the fragment.

---

## Thread/topic: <short name, matches your branch>

**Sections likely affected:** <e.g. "2 (Shipped features), 3 (tracker), 9 (log)" — a guess is fine, the reconciler will sort out the actual placement>

**Customer-facing** (copyable into changelog/app notes — omit if nothing user-visible changed):
<one or two plain-language sentences describing what a player would notice>

**Team-facing** (context for future threads and the reconciler):
<what changed, why, any gotchas, any decisions made, anything a thread picking this up cold would need to know>

**Suggested Section 0 change** (only if this affects "what to do right now" — e.g. something just got completed, something new is now blocking):
<optional>

**Suggested Section 3 (feature tracker) row update** (only if a feature's status changed):
<optional — feature name, new status, new notes>

**New standing rule or convention worth capturing** (only if you hit something that should become a permanent rule, e.g. a naming convention, a gotcha, a design-token decision):
<optional>

**Anything another thread working today should know before touching related code:**
<optional but valuable — this is what gives same-day cross-thread visibility>

---

### Example (real, from today — for reference only, delete when copying this template)

## Thread/topic: visual-direction-rune-glow

**Sections likely affected:** 2, 6, 9

**Customer-facing:**
RiftRecall got a visual glow-up — ambient glow, glowing buttons, holographic foil card frames, and a mascot that celebrates correct answers.

**Team-facing:**
New glow/foil tokens in `theme.ts`. Four new components: `ScreenGlow`, `GlowButton`, `QuizCardArt`, `Sparklet`. `RIFT_BRAND` gold widened to cover the foil rim + Sparklet cap only — nowhere else. No Reanimated/expo-blur available; used RN `shadow*` + `react-native-svg` instead.

**Anything another thread should know:**
`HomeScreen.tsx`'s "Review Cards" button is now a `GlowButton` component, not a plain `TouchableOpacity` — if your thread needs a ref/onLayout on it, wrap it in a `View` rather than modifying `GlowButton` itself (that's what the onboarding-tutorial thread had to do).
