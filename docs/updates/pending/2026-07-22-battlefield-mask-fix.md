## Thread/topic: battlefield-mask-fix

**Sections likely affected:** 2 (Shipped features), 9 (log)

**Customer-facing:**
Fixed the RiftRecall quiz mask overlay for Battlefield cards — the name and ability-text boxes now line up correctly with where those elements actually sit on current Battlefield card art, instead of drifting low/off-target.

**Team-facing:**
`quizPositions.json`'s `name.Battlefield` and `text.Battlefield` entries were stale (originally eyeballed against older card renders). Re-measured pixel-for-pixel against real staging screenshots (Altar of Blood for name, Marai Spire for text), isolating each card image's true content region before computing percentages. Cross-checked the measurement method against the *current* (wrong) values first (they came out close to the old config, confirming the method itself is sound) before trusting the new targets.

New values:
- `name.Battlefield`: top 54.0 → 64.0 (height/left/width unchanged)
- `text.Battlefield[0]` (top copy): top 30.0 → 10.0, height 7.5 → 11.0
- `text.Battlefield[1]` (bottom copy): top 64.0 → 79.0, height 7.5 → 11.0

Scope was deliberately narrow: only these two Battlefield mask entries changed. Standard (non-Battlefield) name/text boxes are untouched (postponed post-launch per Ashwin's earlier call), and cost/might/power masks are untouched (unrelated, already correct). `BATTLEFIELD_ASPECT_RATIO` in `QuizScreen.tsx` was not touched — this was purely a data-tuning fix, not a rendering/rotation bug.

Verified locally (Expo web dev server, not yet on staging since this hasn't deployed) across 9 distinct Battlefield cards spanning all 4 sets (OGN, SFD, UNL, VEN) — both name-mode and text-mode questions — confirming: masks land on-target without clipping into art, and both printed text copies (top rotated + bottom) stay independently masked in text mode (no answer-leak regression). Cards checked: Navori Fighting Pit, The Grand Plaza, Startipped Peak, Sigil of the Storm, Monastery of Hirana (OGN); Frozen Fortress, Forgotten Library, Altar of Blood, The Academy (UNL); Minefield (SFD); Kinkou Temple (VEN). No drift observed on any spot-checked card — no safety-margin adjustment needed.

**Anything another thread working today should know:**
Local Battlefield-card preview convention: filter Settings screen to a Set + Type=Battlefield (Battlefields have no cost/power/might, so `eligibleModes` only ever offers name/text — every question you hit is one of the two types being fixed here, no noise). Added `.claude/launch.json` (untracked, not part of this PR) with an `expo-web` config for local Browser-pane preview via `preview_start` — useful if another thread needs to visually check quiz rendering again.
