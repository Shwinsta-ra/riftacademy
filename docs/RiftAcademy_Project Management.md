# RiftAcademy — Master Project Doc

**Owner:** Ashwin Sathe (sole dev, Sathe Consulting LLC) · **Repo:** `github.com/shwinsta-ra/riftacademy` (private, GitHub Pro)
**Hard deadline:** **July 31, 2026** (Vendetta set release) · **Launch posture:** web-only, free, LJJ-compliant
**Last updated:** July 23, 2026 (evening, plus a small same-day true-up patch). Full reconciliation of 20 pending fragments (July 21–23), plus a follow-up correction pass: Section 0 refreshed to reflect actual current state (RiftIQ v4, not v1; RiftCoach deep into pre-rift prep, not "beginning"; the puzzle-catalog file confirmed genuinely landed, not still missing), three stale Section 3 rows corrected (VEN count, Vendetta repull status, puzzle content status), and three shipped features added to Section 3's table that had only ever gotten Section 2 prose (RiftCore Phase A compiler, the winning-line taxonomy, RiftIQ's Home narrowing) - this doc's own rule says feature status lives in one place, the Section 3 table, and these had drifted from that. All 20 fragments are folded in and deleted per the fragment lifecycle. **This doc is no longer edited directly by feature/fix PRs — see Section 1a and `docs/updates/TEMPLATE.md`.**
**Canonical file name:** `RiftAcademy_Project Management` — fixed name across GitHub, Project Knowledge, and Google Drive.
**Status:** This is the single canonical project doc. If you're holding any other copy — a download from earlier today, a different thread's local merge — discard it.

> **Three forks happened today before this system existed** (see prior git history / PR #44 if curious). The root cause each time: either a stale pasted copy, or multiple PRs editing this same file concurrently. Both are now structurally prevented: new threads read the doc from a freshly-generated zip (Section 5) instead of a pasted copy, and day-to-day updates go into per-thread fragment files (Section 1a) instead of direct edits to this file. This is the last manual full reconciliation this doc should need under normal conditions.

> **What this doc is.** The one cross-thread source of truth for RiftAcademy, kept in **Project Knowledge** so every thread (chat, Cowork, Claude Code) can read it. Real edits happen via the fragment system (Section 1a) and land here only at end-of-day reconciliation.

---

## 0. Open this section first — what to do right now

**Today (July 23) is the last full day before Vendetta Pre-Rift Session 1 (Friday July 24).**

**RiftCoach:** deep into pre-rift prep, not "beginning" — multiple sim-triage rounds today, writing the RiftLab prep brief + Friday observation instrument (needed before Friday, not before Monday).

**RiftIQ:** Batch 1 is at **v4** (6 puzzles, one per domain, all rules-legal) — awaiting Ashwin's review, which unblocks 3 open questions (calm-1 difficulty, Batch 2 Easy-slot rotation, legacy-14 audit decision — see Section 10). Confirmed **not blocked on RiftCore** (71% of the 924-card pool is authorable now with single-step abilities). `RiftIQ_Puzzle_Design_Catalog.md` is now genuinely present in `docs/riftiq/`, independently verified three ways (local disk, GitHub's branch copy, the Contents API) — the earlier "still missing" note in this section was itself stale by the time it was written; resolved as of PR #117.

**Master Card Inventory:** fill Function, Ability Target, Keywords, and Subtype for Vendetta cards (Ashwin) — partially done (90-row decision sheet applied); rows for the new Empower mechanic still have no tagged analog to fill from.

**RiftRecall:** clear all outstanding Discord bug reports related to card questions.

**Format note:** refresh this section every session; move completed items to Section 9's log rather than deleting them silently.

---

## 1. How to use this project (coordination protocol)

- **One project, many threads.** This doc + the card JSON files live in Project Knowledge; every thread inherits them.
- **Standing rules** (Section 6) belong in the project's custom-instructions field so new threads inherit them automatically without re-pasting.
- **Grounding sources by purpose:**
  - Card truth → the project JSON files (authoritative, overrides the web).
  - Meta / deck power vs. complexity → riftmeta.net
  - Deck components & lists → riftdecks.com, piltoverarchive.com
  - News / ecosystem updates → riftbound.gg
  - Prices / inventory / market → tcgplayer.com
- **Every strategic recommendation shows its reasoning + evidence.**
- **TickTick** (`RiftAcademy` list) is the live task backlog — see Section 8. This doc holds status/history/decisions; TickTick holds the granular day-to-day task queue.
- **Feature status lives in ONE place** — the table in Section 3. Don't re-describe status elsewhere.

### 1a. Two systems working together: three-copy sync model + daily fragment files

**The three-copy model** (unchanged in principle, refined below):

| Copy | Role | Who writes it | Written how |
|---|---|---|---|
| **GitHub** (`docs/RiftAcademy_Project Management.md`) | Canonical, version-controlled source of truth. | This control thread, once daily | **End-of-day reconciliation only** — reads every fragment in `docs/updates/pending/` dated that day, folds them into the real sections, commits the updated doc, and deletes the day's fragments, all in one PR. Never edited by a feature/fix PR directly anymore. |
| **Claude Project Knowledge** | Ambient reference cache for threads without a fresh zip in hand. Never authoritative for a substantial rewrite. | Ashwin, manually | One upload after each day's reconciliation PR merges. |
| **Google Drive** (local Drive-for-Desktop synced path) | Disaster-recovery backup only. | Claude Code, writing directly to the local synced folder so Drive versions it in place | `/Users/ashwinsathe/Library/CloudStorage/GoogleDrive-ashwin.sathe86@gmail.com/My Drive/RiftAcademy/RiftAcademy_Project Management.md` |

**The fragment system** (new as of tonight — this is what actually prevents the conflicts from recurring):
- Every thread doing a feature/fix PR adds one new file at `docs/updates/pending/YYYY-MM-DD-short-topic.md` (template at `docs/updates/TEMPLATE.md`) **instead of** editing this doc directly.
- Unique filenames mean concurrent threads never conflict on this — the exact failure mode that killed PR #44 and silently dropped RiftRecall's build-out from ever reaching this doc.
- Because fragments merge into `integration` progressively (riding each PR, same as any other file), **a thread starting later the same day already sees earlier threads' fragments** just by pulling — this is same-day cross-thread visibility without waiting for nightly reconciliation, for anything already merged. It does not solve two threads editing genuinely simultaneously on branches neither has merged yet; that residual overlap risk is accepted, same as it would be for any solo-dev parallel workflow — git's merge-conflict detection at the code level remains the real backstop for anything that actually collides.
- **Why this replaces "doc rides with the code" rather than refining it:** that rule sounded right but failed in both directions today — it caused a conflict (PR #44) and it silently didn't happen (RiftRecall's PRs shipped without updating the doc at all). A shared mutable file edited by many concurrent writers is the actual problem, independent of how carefully anyone follows the rule.
- **Concurrency/locking for the reconciliation step itself:** unchanged — Ashwin manually merges every PR to `main`/`integration`, so the reconciliation PR is subject to the same single-human-checkpoint protection as everything else.

**Sync cadence:** fragments accumulate all day; reconciliation + all three copies get synced once, end of session.

---

## 2. Current state (snapshot)

### Infrastructure
- Branch pipeline: `main` (prod, `riftacademy-tau.vercel.app`) → `staging` (public preview, `riftacademy-staging.vercel.app`, also hotfix validation) → `beta` (premium testers, no domain yet) → `integration` (target for `feature/*`, `fix/*`, `hotfix/*`).
- All four core branches: branch protection + 2 required checks — `typecheck` (`ci.yml`) and `check-source-branch` (`enforce-branch-flow.yml`).
- Vercel via GitHub integration (push → auto preview deploy). Hobby plan = 1 concurrent build; a full promotion chain takes 10–20 min.
- Mac git identity (global): `shwinsta-ra` / `ashwin.sathe86@gmail.com` — required, or Vercel blocks the deploy.
- **GitHub CLI (`gh`) authenticated via OAuth device flow**, scopes `repo`/`workflow`/`read:org`/`gist` — this is what Claude Code uses for all push/PR operations. Not a Personal Access Token (a PAT was found and revoked July 19 — see Section 9 — it was never load-bearing).
- **Claude plan: Max** — Cowork on web/mobile, computer-use preview, and phone-based Remote Control/Dispatch all available.

### Card database
- **Two legitimately different counts, both current:** Master Card Inventory (spreadsheet, source of truth) = **928 rows** across all sets. `cards.json` (app runtime data) = **918 cards** (928 minus 10 removed by the existing 1v1 ban filter — expected, not data loss). Both confirm **166/166 Vendetta base cards** now present (up from 141/166) — all numbered 1–166, no dups, no over-total codes.
- Applied all 90 rows from a decision sheet (`Master_Inventory_Decisions_For_Code.csv`) to the inventory: Domain(s)/Function/Subtype/Ability Target corrections, plus a blanket rule that Battlefield/Token cards' **Domain(s) column now reads "Colorless" instead of "None."**
- Vendetta card text cleaned up: raw API placeholders (`:rb_energy_N:`, `:rb_rune_X:`, `:rb_might:`, `:rb_exhaust:`) converted to the app's plain-text/bracket convention, `&gt;` unescaped, floating costs folded back inside their bracket (e.g. `[Empower] (5)` → `[Empower (5)]`). Speed/Keywords auto-filled for previously-blank Vendetta rows (validated at 99.86%+ match rate against the non-Vendetta corpus). Ability Target/Function left blank for most new-mechanic (`Empower`) rows — no existing tagged analog exists yet.
- Legend cards no longer generate "what champion is this?" (name-mode) quiz questions — ability and speed questions for them are unaffected. `eligibleModes()` in `src/lib/attributeQuiz.ts` hard-excludes `"name"` for `card.type === "Legend"`, same treatment as `"trigger"` (a per-card override can't reinstate it).
- `cleanup_ven_reprints.py` removed 20 cards from the earlier 161 count: 8 provisional overnumbered champion codes (Vi/Jinx/Jayce/Viktor/Rengar/Khazix/Diana/Leona), 6 signature "SP" champion reprints, 6 VEN domain runes — each an exact duplicate of a card already in an earlier set.
- All present VEN cards (and all cards overall) confirmed to have non-null `imageUrl`. RiftRecall's art-exclusion logic in `src/lib/quiz.ts` keys strictly off `imageUrl === null` — there is no `new` flag in `cards.json`, so no stale-flag path can bench a card that has art.
- Baron Nashor (Ultimate) permanently blacklisted (`BLACKLISTED_IDS`).
- Champion/Equipment stored as `Unit`/`Gear` + `subtype`; `Champion`/`Equipment` no longer valid `type` values.
- Set filters grouped: Origins & Proving Grounds / Spiritforged / Unleashed / Vendetta. Speed filter (Action/Reaction) added.
- Only 4 old Unleashed tokens remain without art — unrelated, low priority.
- **Known regression risk:** the Master Card Inventory spreadsheet itself still has the same missing-space-after-period issue that was fixed directly in `cards.json` (see Section 3) — if `merge_sheet.py` re-runs against the sheet before that's cleaned up, the fix regresses. Already tracked in TickTick for Ashwin, not duplicated here.

### Shipped app features
- **RiftRecall** (renamed from "Card Recall"/"Memory Game"), fully overhauled July 18–19 across PRs #29/#32/#33 — **this build-out shipped in code well before tonight but was never reflected here until now:**
  - **Session persistence & batch pacing:** long-term box/due-date state persists across sessions; in-session progress survives refresh; sessions capped at 20 cards with round-robin missed/new/review composition and a mandatory 10-minute gate between batches.
  - **Question-quality overhaul:** split Energy/Power cost into independently-testable modes; sane non-negative sequential numeric distractors; battlefield/equipment text-question handling that never leaks the answer; recency-weighted mode picker; fill-in-the-blank mode for cards with exactly 2 numeric effect values; champion name-quiz distractors restricted to the same champion's other epithets (189 authored synthetic epithets, pending Ashwin's review).
  - **Control-sheet pipeline:** `build_master_sheet.py`/`apply_master_sheet.py` — one XLSX matching Ashwin's exact format, blank = auto-generated question, filled = permanently pinned.
  - **UI:** 2×2 answer grid (1×3 for exactly 3 options), larger card, bottom-anchored controls.
  - **Home screen rebuild:** `RIFT_BRAND` gold wordmark convention across RiftAcademy/RiftRecall/RiftIQ; RiftIQ introduced as an umbrella (placeholder content); live review-count preview; "What's New" box; fixed LJJ footer.
  - **Group B general card-text question parsing — fully implemented** (July 21, `attributeQuiz.ts`), not just spec'd: 1-number and 3+-number fill-in-the-blank (extends the existing exactly-2-number case), a same-domain/type/subtype fallback tier for 0-number/no-bracket cards, and a new 6-option `bracketSwap` mode for cards with a permutable keyword bracket (Action/Reaction swap or curated keyword swap). Verb-context classifier (`classifyKind`) rebuilt from scratch — the original Group A version was never committed to the repo. Covered by a 12-case unit suite plus an 879-card full-pool smoke test, all passing.
  - **Battlefield quiz-mask positions re-measured and fixed** (July 22, three same-night rounds against real staging screenshots, all 4 sets) — final values: `name.Battlefield.top` = 67.0, top-copy `text.Battlefield[0].top` = 7.5, bottom-copy `text.Battlefield[1].top` = 79.0. Scope stayed narrow to Battlefield only; standard name/text and cost/might/power masks untouched.
  - **Study-batch cooldown now scoped per-filter** (`filterKey`, July 22) — changing filters immediately shows new/eligible cards instead of staying blocked by an unrelated batch's 10-minute timer; switching back to the original filter re-blocks with the countdown continuing from where it was (not reset).
  - **RiftIQ Home entry narrowed ahead of soft alpha launch** (July 22): the "New Match" button is removed from Home (match analysis isn't shipping in this state for alpha); subheadline changed from "Match analysis & strategy puzzles" to "Game puzzles & tutorials." `MatchList`/`MatchDetail` screens and routes still exist, just unreachable from Home.
- **Visual-direction "Rune Glow" pass** (PR #45, merged): ambient screen glow, glowing primary buttons (`GlowButton`), a `Sparklet` mascot that celebrates correct answers (respects reduce-motion). `RIFT_BRAND` gold widened to also cover the Sparklet cap only. No Reanimated/expo-blur in the project; glows use RN `shadow*`, Sparklet uses `react-native-svg`. The original holographic foil card-art frame (`QuizCardArt`) was dropped in favor of glow-behind only (PR #52); `FOIL` removed from `theme.ts`.
- **First-launch onboarding tutorial** (PRs #46, #52, #55, #58, #64, #67, all merged): coach-mark style — highlighted ring + tip bubble walks through setting filters and starting a session using the real UI, advances on real taps, preceded by a one-time Welcome/alpha screen. Content-agnostic engine (`tutorialContext.tsx`) separate from the swappable 4-step script (`tutorialSteps.ts`) — deliberately temporary per Ashwin, meant to be replaced by a broader tour later without an engine rewrite. See Section 9 for the full run of staging-feedback fixes. Web fully verified; native (iOS/Android) still not explicitly confirmed.
- **Match Tracker (core):** full live match dashboard.
- **Feedback widget:** draggable bubble, screenshot/annotation, Discord webhook. `REQUIRED` tag removed from the "What happened" field (PR #55).
- **Opponent Deck Knowledge Filter**, **GitHub + Vercel pipeline**, **Claude Code + Cowork** (both authenticated and validated July 19).
- Unified `AppModal` across 6 modals; platform-aware CSV export. `AppModal` gained an optional `ctaDestructive` prop (solid `theme.incorrect` red CTA) for destructive confirmations (used by the new "Reset progress" modal, see Section 3).
- **RiftCore data-model Phase A** (July 21) — `scripts/compile_abilities.py`, a rule-based compiler parsing `cards.json` card text into candidate `card_abilities`/`ability_steps` rows. Calibrated at **52/52 exact match** against the locked decisions fixture; run against all 918 cards — 134 auto-accepted into `src/data/model/abilities.json`, 784 queued into `abilities.review.json` for human adjudication. Fully inert: nothing outside `src/data/model/` imports it yet, `cards.json` untouched, no CI wiring.
- **Winning-line taxonomy — actually built now** (July 22) — `schema.ts`'s `WinningLine` is the real 6-value match-ending taxonomy (`holdAtSeven`, `conquerBothAtSix`, `holdOneConquerOneAtSix`, `cardEffect`, `deckDepletion`, `altWin`); `PointSource` is a flat 5-value union; `rulesKernel.ts`'s `canScoreWinningPoint` gates on it, scaling with `GameState.pointsToWin` rather than hardcoding 7/6. **This corrects a false claim from the July 21 EOD check-in that this schema work was already merged — it was not; see Section 9 for both the original claim and its correction, preserved per the evidence-citing rule.** Two known gaps carry forward as open items: (1) `conquerBothAtSix`'s check is a same-snapshot proxy for "both conquered this turn," not independent tracking of when each was conquered; (2) `deckDepletion`/`altWin` have no backing `GameState` field yet, so `canScoreWinningPoint` can never emit them today. Not customer-facing — `src/lib/core/` isn't wired into the app yet.

### Data pipeline
- Google Sheets master workbook = source of truth; `merge_sheet.py`/`apply_*.py`/`build_master_sheet.py`/`apply_master_sheet.py` do CSV/XLSX↔JSON.
- `merge_sheet.py` applies canonical champion-name transforms, dynamic ban filter, and permanent blacklist on every run.
- Supabase migration deferred until Vendetta fully stabilizes.

---

## 3. Feature tracker & roadmap

*Single row per feature — update in place. Status legend: **Completed** — **Not started** — **Unresolved** — **Deferred** — **Blocked** — **Pending import**.*

| Feature | Status | Description | Target | Dependencies / Blockers | Notes |
|---|---|---|---|---|---|
| **SHIPPED** |
| Match Tracker (core) | Completed | Full live match dashboard | Shipped | — | — |
| Feedback widget | Completed | In-app feedback form | Shipped | — | `REQUIRED` tag removed from "What happened" (PR #55); both fields now single-line |
| Opponent Deck Knowledge Filter | Completed | "Deck" filter for quiz drilling | Shipped Jul 16 | — | — |
| GitHub integration | Completed | Repo + Vercel pipeline | Shipped Jul 16 | — | — |
| Master Card Inventory + Vendetta prep | Completed | Full DB refresh, dedup/ban cleanup | Shipped | — | — |
| Vendetta card images | Completed | All VEN cards have real art | Shipped Jul 17 | — | Re-verified Jul 19 |
| VEN card-count reconciliation | Completed | 161 → 141 → 166 of 166, full reasoning documented across both passes | Fixed Jul 21 | — | PR #40 (initial), card-data reconciliation Jul 21 (final 25 cards) |
| RiftRecall — session persistence & batch pacing | Completed | Long-term + in-session state, 20-card capped batches | Shipped | — | PR #29/#33 — **previously undocumented here** |
| RiftRecall — question-quality overhaul | Completed | Split cost modes, sane distractors, epithet-restricted name quiz | Shipped | Epithet CSV review pending | PR #29/#32/#33 — **previously undocumented here** |
| RiftRecall — control-sheet pipeline | Completed | `build_master_sheet.py`/`apply_master_sheet.py` | Shipped | — | PR #29 — **previously undocumented here** |
| Home screen rebuild | Completed | `RIFT_BRAND` convention, RiftIQ umbrella, What's New | Shipped | — | PR #33 — **previously undocumented here** |
| Visual-direction "Rune Glow" pass | Completed | Ambient glow, Sparklet mascot (foil-rim art later dropped, see notes) | Shipped Jul 19 | — | PR #45; foil-rim card treatment dropped for glow-behind only (PR #52), `FOIL` removed from `theme.ts` |
| Claude Code + Cowork setup | Completed | Both authenticated and validated | Done Jul 19 | — | PAT found + revoked same day, non-load-bearing |
| First-launch onboarding tutorial | Completed | 4-step coach-mark tour, real-tap advancement, plus a first-launch Welcome/alpha screen ahead of it | Shipped (PRs #46, #52, #55, #58, #64, #67) | None | Multiple staging-feedback rounds polished mask sizing, timing, and copy; native on-device check still not explicitly confirmed |
| RiftCore package (M0) | Completed | Schema, forward rules kernel, effects, cards adapter (`src/lib/core/`); the shared kernel RiftEngine/RiftLab/RiftCoach/RiftIQ will import | Shipped Jul 20 | None | PR #69; shipped without a fragment, a real documentation gap caught at this reconciliation, not a stylistic one; added vitest as the project's first test runner; see docs/design/riftbound-module-architecture.md |
| RiftRecall — filters persist across reload | Completed | `FiltersProvider` now backed by settings-table/localStorage, loaded on mount, saved on every change | Shipped Jul 22 | None | Launch-day batch |
| RiftRecall — countdown-flash fix | Completed | `nowTick` re-stamped at every `batchGateUntil`-setting call site so the countdown never flashes an inflated value | Shipped Jul 22 | None | Launch-day batch fixed 2 of 3 sites; `quiz-countdown-jump-fix` (Jul 22) found and fixed the third (`handleNext`) — that's the final, precise fix |
| RiftRecall — bracket-swap option-count fix | Completed | `buildBracketSwapQuestion` now samples down to 4 options like every other mode (was rendering up to 6) | Shipped Jul 22 | None | Launch-day batch; a pre-existing test had asserted the buggy behavior as correct, now fixed plus a blanket `options.length <= 4` regression guard |
| RiftRecall — domain filter chip list fix | Completed | Settings now shows exactly the 7 real domains (Fury/Calm/Mind/Body/Chaos/Order/Colorless) instead of 15+ dual-domain combo chips; filtering is now component-based (splits on "/"), not exact-string | Shipped Jul 22 | None | Launch-day batch |
| RiftRecall — reset-progress confirmation modal | Completed | "Reset progress" previously silently did nothing (`Alert.alert()` has no RN-web implementation); now a real `AppModal` confirmation with a solid red destructive CTA | Shipped Jul 22 | None | Launch-day batch |
| Card text — missing space after period (39 cards) | Completed | Regex sweep fixed 38 VEN + 1 UNL card in `cards.json` (e.g. "Kill a gear.[Flow (4)(R)]") | Shipped Jul 22 | None | Launch-day batch; fixes `cards.json` only — the Master Card Inventory source sheet still needs the same cleanup, already tracked in TickTick for Ashwin, not duplicated here |
| Tutorial replay — stuck "Set filters" button | Completed | `restart()` now clears filters to `DEFAULT_FILTERS` before resetting the tutorial step, so a returning user with filters already set can't get the chip stuck toggling back to a disabled state | Shipped Jul 22 | None | A separate, unfixed, low-confidence viewport-overlap issue (tutorial bubble overlapping "Set filters" at small desktop widths) was flagged for awareness only, not fixed |
| Sparklet lingering on fast "Next" taps | Completed | New `activeKey` prop snaps all animated channels to hidden via `useLayoutEffect` when the active card changes, so the old card's fading celebration can't render on top of the new one | Shipped Jul 23 (PR #112) | None | Verified by code read only — `npm run typecheck` could not run this session (`node_modules` not installed); needs a real typecheck run before treating as fully proven |
| Hand-authored fill-in-blank caption split | Completed | `apply_master_sheet.py`'s `split_fillblank_prompt()` gives hand-authored fillBlank rows the same prompt/caption rendering auto-generated ones already have | Shipped Jul 23 (PR #112) | None | Verified only against a synthetic 5-row CSV in this session — no real master-sheet export was available; needs real-data verification before treating as fully proven |
| RiftCore data-model Phase A | Completed | `compile_abilities.py` compiler, 52/52 calibration match, run against all 918 cards | Shipped Jul 21 | None | 134 auto-accepted, 784 queued for review; fully inert, zero-impact by design |
| Winning-line taxonomy | Completed | 6-value `WinningLine`/`PointSource` in `schema.ts`/`rulesKernel.ts` | Shipped Jul 22 | None | Corrects a false "already merged" claim from Jul 21 - see Section 9. Two known gaps carry forward: same-turn-conquer proxy limitation, deckDepletion/altWin have no backing GameState field yet |
| RiftIQ Home entry narrowed for soft alpha | Completed | "New Match" button removed, subheadline now "Game puzzles & tutorials", version label "Alpha v1.0" | Shipped Jul 22 | None | `MatchList`/`MatchDetail` screens/routes untouched, just unreachable from Home |
| **ACTIVE THIS WEEK** |
| Power-cost mask visual tuning | Unresolved | Mask is now a fixed-size rect (no longer scaled to a card's true `power` value, closing the same leak class as the might/cost fix) | Structurally done Jul 22 | Needs a real visual pass | Not visually verified against real card art — the session that built this had its CDN access blocked; distinct from the Battlefield mask *positioning* work above, which IS resolved — don't conflate the two |
| Mystic Vortex / Piltovan Forge rendering bug | Unresolved | Reported as "renders rotated 180° / renders twice"; a 10-card spot-check (including both named cards) found clean rendering, no rotation/duplication | Investigated Jul 22 | Needs a live re-check | Inconclusive positive evidence only, not a confirmed fix — a bug not reproduced once isn't necessarily gone; distinct from the Battlefield mask *positioning* work above, which IS resolved — don't conflate the two |
| RiftIQ Batch 1 v4 | Awaiting review | 6 combat puzzles, one per domain, all rules-legal | For app launch | Ashwin's review + 3 open questions (Section 10) | Confirmed NOT blocked on RiftCore - 71% of the 924-card pool is authorable now with single-step abilities |
| RiftIQ puzzle UI | In progress | Top-down board, code-driven | This week | Ashwin's own mockup | Working with Ashwin directly on visual direction |
| Vendetta full-set repull | Completed | Brought VEN from 141 to full 166 | Jul 21 | — | See Section 2; superseded the "ahead of next week's pre-rift" framing - it's this week's pre-rift now |
| New User Ingestion Flow | Not started | Onboarding survey, user segmentation | Before next invite push | Survey design | — |
| **THIS MONTH (BEFORE JULY 31)** |
| Deckbuilder v1 | Not started | Template deck, save personal version | Before Jul 31 | None | — |
| Game-log / match-state schema | Not started | Shared snapshot schema, RiftIQ + RiftNotes | Needs further iteration | Dedicated RiftIQ/RiftEngine thread | See Section 10; see docs/design/riftbound-module-architecture.md |
| RiftIQ real module design | Not started | What goes in the umbrella beyond placeholders | This month | None | See docs/design/riftbound-module-architecture.md |
| **DEFERRED / UNSCHEDULED** |
| RiftNotes (M1) | Deferred | Capture/transcription module; field-first, no near-term at-the-table capture build | Design-only until post-Vendetta | None | Formerly "RiftNotes rework"; must not pull from July-31 items (RiftRecall, RiftIQ Daily Puzzle); see docs/design/riftbound-module-architecture.md |
| RiftEngine (M2) | Not started | Reconstruction/abduction (`inferEvents`), RiftCore kernel's inverse; stateless per-capture; owns the player/field fork | TBD, depends on RiftCore | Depends on RiftCore (M0, shipped) | Player data reaches RiftCoach only, never RiftLab, by construction; see docs/design/riftbound-module-architecture.md |
| Non-Vendetta long-text-distractor conversion | Deferred | 228 cards identified (OGN 73, SFD 66, UNL 87, OGS 2), not yet converted | Whenever ready to expand | None | Same detector/generator as the 60 Vendetta conversions |
| Discord integration via Cowork/TickTick | Deferred | — | Next week | None | — |
| Cowork-scheduled recurring TickTick cleanup | Deferred | — | Next week | None | — |
| Riftbound ROI thread task follow-up | Deferred | — | Next week | None | — |
| Sync-down automation + Jest suite | Deferred | Both written, unmerged | Paused | None | — |
| Price-history storage | Deferred | Own store, non-destructive ROI import | Wait for Supabase | — | — |
| Keyword badge styling | Unresolved | — | — | Contingent on Riot API | — |
| Local/in-app reminders | Deferred | — | After TestFlight | — | — |
| Riot API exploration | Deferred | — | → August | Attorney consult first | — |
| Structured Discord community | Deferred | — | After consistent retention | Intake architecture (Section 8) | — |
| Donate link | Unresolved | — | TBD | LJJ policy check | — |
| Account management | Deferred | — | Longer-term | — | Interim: session persistence per feature |
| Stale GitHub branch cleanup | Deferred, low priority | Safe process documented | Whenever there's a lull | None | Tracked in TickTick "New" bucket |

---

## 4. Deploy workflow (GitHub + Vercel)

Branch pipeline: `feature/*` / `fix/*` / `hotfix/*` → `integration` → `beta` → `staging` → `main`.

- `main` = production — `riftacademy-tau.vercel.app`
- `staging` = public preview — `riftacademy-staging.vercel.app`
- `beta` = premium/beta-tester tier
- `integration` = first line of defense

All four branches require a PR + passing status checks (`typecheck`, `check-source-branch`).

**Step 1 — create and push your branch (Terminal):**
```
cd ~/Projects/riftacademy
git checkout integration
git pull
git checkout -b feature/<short-name>
git add .
git commit -m "<describe what changed>"
git push -u origin feature/<short-name>
```

**Steps 2–4 — promote up the chain (Browser):**
1. `compare/integration...feature/<short-name>` → create PR → merge.
2. `compare/beta...integration` → create → merge.
3. `compare/staging...beta` → create → merge (triggers Vercel staging build).
4. Test on staging, then `compare/main...staging` → create → merge (triggers production).

**Gotchas:**
- Double-check the base branch — GitHub defaults to `main`.
- Branch prefix must match the target's allowed pattern (`feature|fix|hotfix` for `integration`) — mismatches fail `check-source-branch` instantly regardless of content.
- Vercel Hobby = 1 concurrent build; promotion chains queue sequentially, 10–20 min normal.

**Git identity:** global email must be `ashwin.sathe86@gmail.com`.

**GitHub CLI auth:** OAuth device flow (`gho_` token), not a PAT.

---

## 5. New thread creation flow

**Every morning, before starting any thread's work — a single message to Code, not manual terminal commands.** Paste this exact prompt:

> "Good morning — start today's routine: checkout and pull the latest integration, then (1) generate a fresh zip of HEAD as usual, and (2) separately extract `docs/RiftAcademy_Project Management.md` as its own standalone file. Save both to `~/Downloads`. Confirm both files are there when done."

Code then runs the equivalent of the old manual commands (checkout `integration`, pull, `git archive` for the zip, and a direct copy/extraction of the PM doc to its own file) and places both in `~/Downloads` for Ashwin to route from there — Downloads stays the temporary daily drop point, never a working location.

*(For a hotfix, say `main` instead of `integration` in the prompt.)*

**Then, in the new thread:**
- Attach `~/Downloads/riftacademy-upload.zip`. **Don't separately paste another copy of this doc** — the zip already contains the current version at `docs/RiftAcademy_Project Management.md`, and the `git pull` immediately before archiving guarantees it's as current as GitHub, seconds old.
- **Also check `docs/updates/pending/` inside the zip** for today's fragments from other threads — that's your cheapest way to learn what else changed today.
- Give the thread a one-line status note — use the latest dated entry from **Section 9** (not Section 7 — that was a stale cross-reference in an earlier version of this doc).
- If the thread runs long (hours) and is about to make a substantial change, re-verify against GitHub directly rather than trusting an aging zip snapshot: `git show origin/main:"docs/RiftAcademy_Project Management.md"`.

---

## 6. Standing rules & conventions

**Workflow**
- Hotfixes go through **staging for validation first**, never straight to `main`.
- Batch staging changes before promoting to `main`.
- Deliverables as complete ready-to-deploy zips. Deploy commands = bare terminal commands, **no inline `#` comments**.
- Instructions must be granular, exact, full paths.
- Diagnose real git state with `git fetch origin` + `git diff origin/X origin/Y`, never the GitHub UI's "Delete branch."
- **Doc updates use the fragment system (Section 1a), not direct edits to this file** — the single most important process rule as of tonight.
- **No credentials in TickTick, docs, or any note-taking tool.** A GitHub PAT was found pasted in plaintext in a TickTick task July 19 — revoked immediately, never load-bearing (Claude Code uses `gh` OAuth). Use macOS Keychain or a real password manager if a credential must be stored anywhere retrievable.
- **File placement is always Claude Code's job, never Ashwin's.** Any file that needs to land in the repo (new CSVs, generated content, config, source data exports) — Code locates the correct destination itself and places it directly, rather than asking Ashwin to run terminal `mv`/`cp` commands. Goal: minimize Ashwin's terminal use toward zero. Prefer Claude Desktop's Code tab over the terminal `claude` CLI for launching sessions, since that removes the one remaining terminal dependency. (Already adopted in `CLAUDE.md`; added here since this doc's Section 6 hadn't caught up.)
- **Session topology:** separate Code sessions (via git worktrees) for independent module-level daily work; one unified session handles the nightly cross-cutting reconciliation. Working-style decision from the admin thread, not tied to any single fragment.

**Terminology**
- **"60 Vendetta distractor conversions"** (referenced in Section 0): a one-time manual CSV conversion pass from July 20, 2026. Confirmed **not yet imported** into the live Card Questions Control Sheet as of July 22 — tracked as a TickTick task for Ashwin, not duplicated here. This supersedes an earlier flagged uncertainty about the phrase's meaning; treat as settled.

**Card data (Riftcodex ingestion)**
- Trailing-letter codes = alt art → drop, use base numeric.
- Over-total numbers = overnumbered dup → drop, unless no lower twin exists yet.
- Champion apostrophes: Kaisa, Khazix, Leblanc, Reksai — no apostrophes.
- Naming: "Name, Epithet", sentence case matching the physical card exactly.
- Domain color-letter codes (in-text parens): Fury (R), Calm (G), Mind (B), Body (O), Chaos (P), Order (Y).
- `TYPE_FILTER_PREDICATES`: Unit includes all champions; Champion = subtype Champion only. Same pattern for Gear/Equipment.
- Competitive bans are dynamic (`Bans` column, every merge run): 1v1 bans auto-remove; 2v2-only bans stay.
- Never name a feature RiftMind/RiftBody/RiftCalm/RiftFury/RiftChaos/RiftOrder — collides with domain names.

**Design / theme**
- `REQUIRED` magenta `#EA6FD0` = required fields only, never CTAs.
- Domain hex: Fury `#CC2929`, Calm `#3FA34D`, Mind `#2B73C2`, Body `#E57921`, Chaos `#8629B3`, Order `#EBB113`.
- `RIFT_BRAND` gold `#E8B44A` = the word "Rift" in every product name, plus (as of Rune Glow) the foil rim/trim + Sparklet cap only. No other new use without explicit sign-off.
- Visual direction reflects Riftbound card-art aesthetic (cartoony, colorful, intense) — the Rune Glow treatment is the first delivery of this.

**Content style**
- No em dashes in app-facing text (prompts, labels, tutorial copy, alerts, changelog entries) or in any project document (specs, this doc, fragments, commit messages), effective July 19, 2026.

**Culture**
- Explicit correction culture: apply corrections immediately, carry forward.
- Feature deferral is explicit and intentional.
- Defer legal/architecture decisions until PMF.

**Deliverable consolidation**
- Any substantial response ends with two sections, in this order — (1) "Decisions needed from you": every question/confirmation/decision raised anywhere in the message, even if already inline; (2) "Action items for you": every task you need to do, even if already inline. Inline mentions stay in the body.
- Adopted 2026-07-23, practiced since but never actually written down until now.

---

## 7. Tooling & model routing decisions

**Model routing:**
- Menial/mechanical → Haiku 4.5 (or Sonnet 5 if judgment needed).
- Feature building → Sonnet 5 (default).
- Gnarly bugs, architecture, strategy → Opus 4.8.
- Cowork runs flagship-class under the hood — reserve for genuine multi-step work.

**Capability decisions:**
- GitHub/PRs: Claude Code, via `gh` OAuth. Claude opens PRs; Ashwin merges to `main`.
- Google Drive: local-path write for this doc (Section 1a); API connector can only create, not update in place, for anything else.
- Discord: no connector — intake goes through TickTick manually.
- Strategic training (RiftIQ): Opus track, every claim tied to card truth + meta.
- Pro-footage analysis: no video ingestion — transcripts, screenshots, game-log schema instead.
- Claude plan: Max.
- When Claude Code flags its own command as security-sensitive: explain before approving, prefer a scratchpad file over an inline one-liner.

---

## 8. TickTick task management design

- **Columns**: `New` (added Jul 19 — intake bucket for Cowork/system-created tasks), `Riftbound Gameplay` (renamed Jul 19 from "Riftbound Gameplay Improvements" — now personal skill-improvement work, not app features), `Notes`, `Feature Ideas`, `Marketing & Community`, `App Development`.
- **Tags** layer workflow state/type/area on top of columns:
  - Type: `#feature` `#bug` `#puzzle` `#idea` `#chore` `#legal`
  - State: `#inbox-triage` `#this-week` `#in-progress` `#review-deploy`
  - Area: `#riftrecall` `#riftiq` `#riftnotes` `#tracker` `#data-pipeline` `#infra` `#community`
- Priority uses TickTick's native High/Med/Low field.
- Discord → TickTick stays manual until volume demands automation.
- No credentials in task content — see Section 6.

---

## 9. Recent updates log

*Customer-facing lines are copyable into changelogs. Team-facing lines are internal context.*

**July 23 (evening, fillblank caption split + Sparklet fix, PR #112)**
- Customer-facing: Hand-authored fill-in-the-blank questions now render with the same short-label-plus-caption style auto-generated ones already use. Fixed the correct-answer Sparklet mascot lingering onto the next card on a fast "Next" tap.
- Team-facing: `apply_master_sheet.py`'s new `split_fillblank_prompt()` splits hand-authored `fillBlank` custom prompts into `prompt`/`caption`, gated strictly to that mode; verified only against a synthetic sheet (no real master-sheet export available), flagged for real-data verification (Section 3). `Sparklet` gained a required `activeKey` prop (`card.id`) with a `useLayoutEffect` that snaps its animation state on card change; verified by code read only, `npm run typecheck` could not run this session (`node_modules` missing), flagged for a real typecheck run (Section 3).

**July 22 (late night, winning-line taxonomy audit — corrects the July 21 RiftCore check-in below)**
- Customer-facing: No visible change — RiftCore's kernel isn't wired into the app yet.
- Team-facing: The July 21 EOD check-in (entry below) claimed the `WinningLine`/`PointSource` schema reconciliation was already merged to `integration`. **That claim was false.** Checked directly against `schema.ts`/`rulesKernel.ts` on every branch: the older 3-value reconstruction was still live, nothing had actually merged. This entry is the real build, done from scratch on `claude/audit-winning-point-values-45ra7y` off `integration`: `WinningLine` is now the real 6-value taxonomy, `PointSource` a flat 5-value union, `canScoreWinningPoint` gates on `GameState.pointsToWin`/`PlayerState.pointsAtTurnStart` rather than hardcoded 7/6. Two known gaps remain open (see Section 2). Per the evidence-citing standing rule, the original false claim below is left unedited rather than deleted — this entry is the correction of record.

**July 22 (night, tutorial-replay filter-reset fix)**
- Customer-facing: Fixed a bug where replaying the onboarding tutorial with a filter already set (e.g. Vendetta) could leave the "Set filters" button permanently disabled, stranding a returning user mid-tutorial.
- Team-facing: `restart()` in `tutorialContext.tsx` now calls `setFilters(DEFAULT_FILTERS)` before resetting the tutorial step, so every replay starts from the same unselected state as a genuine first launch. `DEFAULT_FILTERS` exported from `filtersStore.tsx` for this. A separate, unfixed, low-confidence issue was flagged for awareness only (not fixed): at short/desktop viewport widths, the tutorial callout bubble can visually overlap the "Set filters" button.

**July 22 (evening, RiftIQ Home entry narrowed for soft alpha)**
- Customer-facing: Ahead of soft alpha launch to communities, the RiftIQ section on Home now only shows "Daily Puzzle (coming soon)" — the "New Match" button is removed, and the subheadline now reads "Game puzzles & tutorials" instead of "Match analysis & strategy puzzles."
- Team-facing: Scope deliberately narrow, per explicit ask — only the Home entry point removed. `MatchList`/`MatchDetail` screens and routes are untouched, just unreachable from Home now.

**July 22 (evening, morning-batch followups — investigative, no code shipped)**
- Customer-facing: —
- Team-facing: Resolved two questions left open from the morning handoff. (1) The 25 new Vendetta cards' visual verification had genuinely never been completed (that session's CDN access was blocked) — did a real 10-card spot-check this session across all three card types present, all rendered cleanly, including the two cards previously flagged for a rendering bug (see below). (2) Traced "the 60 Vendetta distractor conversions" phrase back through git history to a best-supported but unconfirmed reconstruction (likely the earlier exactly-2-number fill-in-blank engine's output, ~60 of 166 Vendetta cards) — **since superseded by a settled definition, see Section 6.**

**July 22 (evening, launch-day fixes batch, 8 items)**
- Customer-facing: Filters no longer reset on reload during the study-batch cooldown. Countdown no longer flashes a wrong number on load (refined further the same night by the dedicated countdown-jump fix below — that fix is the final, precise one). Text-effect questions always show exactly 4 options, never 6. Domain filter shows the real 7 domains instead of 15+ combo chips, with correct dual-domain inclusion. "Reset progress" now has a real confirmation modal and reads as a destructive action. Power-cost questions no longer leak the answer through box size. 39 cards' missing-space-after-period text bug fixed.
- Team-facing: Root causes and fixes: `FiltersProvider` never persisted (now backed by settings-table/localStorage); `buildBracketSwapQuestion` (Group B Bucket 1) never sampled its up-to-5-distractor pool down to 4 (now does, plus a regression guard); `getAvailableDomains()` was deriving chips straight off raw dual-domain strings (now a fixed 7-item list, matching filtering logic now split on "/"); "Reset progress" used `Alert.alert()`, which has no RN-web implementation (replaced with `AppModal` + new `ctaDestructive` prop); `powerCost`'s mask height scaled with a card's true power value, itself a leak (now a fixed-size rect, sized to worst case) — **not visually tuned against real card art, that session's CDN access was blocked; still open, see Section 3.** A reported Battlefield-rendering bug (Mystic Vortex, Piltovan Forge — "rotated / renders twice") was investigated thoroughly with no code-level cause found; also blocked on CDN access; **still open pending a live re-check, see Section 3** (partially addressed by the July 22 morning-batch-followups spot-check above — inconclusive, not a confirmed fix).

**July 22 (afternoon–evening, Battlefield quiz-mask tuning, 3 same-night rounds)**
- Customer-facing: The RiftRecall quiz mask overlay for Battlefield cards now lines up correctly with the name and ability-text on the actual card art, after three rounds of same-night refinement based on direct feedback.
- Team-facing: Final values only (see Section 2 for the numbers) — round 1 re-measured pixel-for-pixel against real staging screenshots; rounds 2–3 were direct feedback nudges, including the correct-answer Sparklet mascot's position and a filter-scoped batch-cooldown fix (cooldown now keyed to `filterKey`, not one global gate — see Section 2). Scope stayed narrow to Battlefield only throughout.

**July 21 (night, zero-terminal file placement policy)**
- Customer-facing: —
- Team-facing: New standing rule adopted (see Section 6): file placement into the repo is always Claude Code's job, never Ashwin's.

**July 21 (night, RiftIQ Batch 1 v4 + authoring gate)**
- Customer-facing: No shipped in-app change yet — six Batch 1 combat puzzles (one per domain) landed in design/review form, awaiting Ashwin's review.
- Team-facing: v3 → v4 fixed two puzzles silently broken by a legend's passive ability changing the combat math (puzzles were being validated card-by-card, not legend-by-legend). New validation checklist items adopted, applying beyond RiftIQ to any thread authoring board states: **G** (legend-passive audit), **H** (point-race safety), **I** (simultaneous-damage wording). A separately referenced `RiftIQ_Puzzle_Design_Catalog.md` could not be located in this session (checked Downloads, Drive, full-account search) — **as of this reconciliation it is still not present in `docs/riftiq/`, remains an open gap** (see Section 0).

**July 21 (night, RiftCore data-model Phase A)**
- Customer-facing: None — inert in-repo groundwork for the post-July-31 Supabase migration.
- Team-facing: See Section 2 for the compiler/calibration details. Zero-impact verified: nothing outside `src/data/model/` imports it, `cards.json` untouched, no CI wiring.

**July 21 (evening, RiftCore EOD check-in)**
- Customer-facing: No visible change.
- Team-facing: Database direction decided — Postgres via Supabase, load after July 31, same schema both phases. Ability-encoding decision — one row per ability-stage, compiler-derived. Two prior card rulings (Hidden Blade, Bellows Breath) double-checked and confirmed already correct in committed data, no fix needed. Also noted: the ability compiler landed a day earlier than that night's own control-summary plan called for — flagged for awareness, not acted on further. **Schema-reconciliation status claimed here: "confirmed merged to `integration`." This claim was false — see the July 22 correction entry above ("winning-line taxonomy audit"), preserved here unedited per the evidence-citing standing rule.**

**July 21 (evening, RiftCoach pre-rift playbook v2)**
- Customer-facing: No player-facing app change — Ashwin's personal Pre-Rift Vendetta Sealed prep material, not an in-app feature.
- Team-facing: Landed `docs/riftcoach/pre-rift-playbook-vendetta.md` v2 — event/rules primer, the three new Vendetta mechanics (Empower/Flow/Burn), an on-sight evaluation rubric (explicitly parked as possible future in-app content only, not a current build), a rebuilt Vendetta-only rep deck. No RiftIQ/RiftLab/RiftCore code touched.

**July 21 (afternoon, Group B general card-text question parsing — implemented)**
- Customer-facing: The quiz now asks a sharper, more specific question for almost every card instead of falling back to "pick the real text out of a lineup" so often.
- Team-facing: All four Group B buckets implemented in `attributeQuiz.ts` (see Section 2). The full spec lives in a Drive handoff doc (`group-b-text-parsing-handoff.md`), already answered by Ashwin prior to this — not re-derived from scratch. Covered by a new unit suite plus an 879-card smoke test; `npm run test`/`typecheck` both pass.

**July 21 (afternoon, card data reconciliation)**
- Customer-facing: Card data refresh across ~90 cards (domain/function/subtype corrections), Battlefield/Token cards now show "Colorless" instead of "None," Legend cards no longer generate "name" quiz questions, Vendetta card text cleaned up, and 166/166 Vendetta base cards are now in the app (up from 141/166).
- Team-facing: See Section 2 for full detail. `cards.json` is now 918 cards (928 in the source inventory minus 10 removed by the existing 1v1 ban filter).

**July 20 (late evening, RiftCore package)**
- Customer-facing: No visible change.
- Team-facing: Shipped `src/lib/core/` (PR #69), a pure dependency-free package with the shared schema, forward rules kernel, effects, and a cards adapter, the kernel every other Riftbound module (RiftEngine/RiftLab/RiftCoach/RiftIQ) will import per `RiftCore_Spec.md` v1. Added vitest as the repo's first test runner. Shipped without a fragment, a real documentation gap caught at this reconciliation (same failure mode as RiftRecall's build-out on July 19), not a stylistic one.

**July 20 (evening, staging feedback round 4, PR #67)**
- Customer-facing: Fixed a real answer-leak bug: "What's this card's Power cost?" questions were covering the wrong part of the card, leaving the actual pips visible. The might mask now matches the cost mask's size. Two tutorial lines tightened.
- Team-facing: `powerCost` now gets its own dynamically-sized mask region (`getMaskRegions` computes the capsule's height per card's own `power` value) instead of sharing the `energyCost` region. `might.default` resized to match `cost.default` exactly; `might.Gear` deliberately left larger (equipment "+N" text runs too wide to safely shrink).

**July 20 (afternoon, tutorial timing + welcome screen, PR #64)**
- Customer-facing: The onboarding tutorial's guide box no longer flashes in the wrong spot before snapping into place. First-time users now see a one-time welcome screen before Home, introducing RiftAcademy, flagging the alpha build, and previewing the tutorial.
- Team-facing: `TutorialCallout` now holds the bubble hidden for 500ms after every step change so it only ever renders already correctly positioned. New `WelcomeScreen.tsx` gated by its own `hasSeenWelcome` flag, independent of `hasSeenTutorial`. `RiftWord` extracted out of `HomeScreen.tsx` into `src/components/RiftWord.tsx` for reuse.

**July 20 (midday, six-module architecture ratified, PR #60)**
- Customer-facing: No app change.
- Team-facing: Final six-module topology locked (RiftCore M0, RiftNotes M1, RiftEngine M2, RiftLab M3, RiftCoach M4, RiftIQ M5, plus RiftRecall M6). Canonical doc `docs/design/riftbound-module-architecture.md`, resolved decision record `docs/design/riftbound-reconciliation-resolved.md`, diagram `docs/design/riftbound-module-architecture.svg`. "RiftPlay" retired in favor of RiftLab (no prior reference to it existed in this doc). Player data reaches RiftCoach only, never RiftLab, by construction (RiftEngine's stateless per-capture reconstruction).

**July 20 (midday, staging feedback round 3, PR #58)**
- Customer-facing: The might/power badge mask is smaller and tighter, the correct-answer mascot celebration lasts about a second longer, the end-of-session screen is back to one centered block, and study batches now shuffle instead of repeating the same order.
- Team-facing: Might/power circle re-measured against multiple card templates (a basic Unit's digit renders much smaller than a Champion's) and resized to the worst-case digit plus margin. Session-complete screen reverted to a single centered column. `buildBatch()` in `leitner.ts` now shuffles each pool before its stable sort, fixing a bug where every never-seen card tied and always resolved back to array order.

**July 20 (morning, staging feedback round 2, PR #55)**
- Customer-facing: The tutorial bubble no longer covers the "Set Filters" button, the quiz question sits closer to the card, question titles no longer strand a single word on their own line, the might/power badge mask is now circular, fill-in-the-blank questions read in normal style, the feedback form is quicker to fill out, and the end-of-session screen has a cleaner layout.
- Team-facing: Fixed a tutorial tooltip race between `SettingsScreen`'s auto-scroll and the tutorial's re-measure effect. Added `preventOrphanWord()` in `textDisplay.ts`. Extended `isCircularMask` to cover `might`. Split all 66 hand-authored `fillBlank` entries in `quizQuestions.json` into separate `prompt`/`caption` fields. `FeedbackSheet.tsx`'s "What happened?" field is no longer required; both text inputs are now single-line.

**July 19 (late evening, tutorial visual polish, PR #52)**
- Customer-facing: The correct-answer mascot no longer overlaps quiz cards, the card art dropped its gold foil trim for a softer ambient glow, the legal footer scrolls normally again, and the boxes hiding quiz answers are now shaped to the actual card element they cover.
- Team-facing: `TutorialCallout` no longer draws a separately-measured ring; each screen now applies a conditional border directly to its own target element. Dropped the foil-rim card treatment in favor of glow-behind only; `FOIL` removed from `theme.ts`. Fixed a portrait-only aspect-ratio assumption in `QuizScreen` that was letterboxing Battlefield cards. Quiz answer-mask zones re-measured against real card pixels per card type; fixed a real answer-leak bug where a semi-transparent might mask let the value show through. New standing rule adopted: no em dashes in app-facing text or project documents, see Section 6.

**July 19 (evening — fragment system adopted, full reconciliation)**
- Customer-facing: —
- Team-facing: This is the last manual full reconciliation of this doc under normal conditions. Adopted a fragment-file system (`docs/updates/pending/`, template at `docs/updates/TEMPLATE.md`) to replace direct doc edits in feature/fix PRs — root-caused to two failure modes today: a shared-file conflict (PR #44) and a silent no-update (RiftRecall's build-out shipping in code across PRs #29/#32/#33 without ever reaching this doc). Folded that entire build-out into Sections 2/3 tonight since it was real, already-shipped work that had simply never been documented here. Fixed a stale cross-reference (Section 5 pointed to "Section 7" for the log; corrected to Section 9). Full PR history reviewed #1–46: only #44 (doc reconcile, now superseded/closeable) and #46 (onboarding, clean and ready) were open; everything else merged cleanly with a healthy linear `integration` history.
- Team-facing (security): Found and revoked a GitHub Personal Access Token pasted in plaintext in a TickTick task — confirmed via `gh auth status` that Claude Code never depended on it (uses OAuth device flow).
- Team-facing (TickTick): Added a "New" intake bucket for Cowork/system tasks; renamed "Riftbound Gameplay Improvements" → "Riftbound Gameplay" (personal skill-improvement scope, separate from app features).

**July 19 (afternoon)**
- Customer-facing: New RiftRecall users now get a short guided tutorial on first launch — a highlighted ring + tip bubble walks through setting filters and starting a study session using the real buttons. Replayable via "Replay tutorial" on the Progress screen.
- Team-facing (onboarding tutorial, PR #46): Content-agnostic engine (`tutorialContext.tsx`) walks a swappable script (`tutorialSteps.ts`) by id — replacing the script later is not an engine change. `setGroups.ts` extracted `SET_GROUPS` out of `SettingsScreen.tsx` so the tutorial can reference the newest set without a circular import. Two real conflicts surfaced against the just-merged Rune Glow PR (integration moved forward mid-session): (1) the step-4 target ("Review Cards") had become a `GlowButton` with no ref/onLayout passthrough — resolved by wrapping it in a `View` rather than modifying `GlowButton`, matching the existing pattern used for `SettingsScreen`'s chip wrapping; (2) the ring/bubble rendered ~400px off-target on desktop-width web — `TutorialCallout` was double-applying `App.tsx`'s centered-column margin by measuring the raw window instead of its own container; fixed by measuring its own container's rect instead, verified at both mobile and 1280px desktop widths. Also fixed two unrelated pre-existing `HomeScreen.tsx` bugs found during testing: a bare ★ and — sitting directly in JSX text instead of `{"★"}`/`{"—"}` expressions. Full click-through tested in-browser (all 4 steps, persistence, replay, both bugfixes); native iOS/Android unverified.

**July 19 (midday — Rune Glow)**
- Customer-facing: RiftRecall got a visual glow-up — a soft ambient glow, glowing action buttons, a holographic "foil" frame around each card, and a mascot that celebrates correct answers (respects reduce-motion).
- Team-facing (PR #45): New glow/foil tokens in `theme.ts` (`GLOW.*`, `FOIL.*`, `GLOW_AMBIENT`, `accentLight`/`accentDeep`). Four new components: `ScreenGlow`, `GlowButton`, `QuizCardArt`, `Sparklet` (uses RN's built-in `Animated`, no Reanimated in the project; fires non-blocking on correct answers). `RIFT_BRAND` gold widened to the foil rim/trim + Sparklet cap only. Deliberate deviation flagged for review: quiz answer options keep green/red correct-incorrect semantics rather than the spec's blurple variant, to avoid encoding state in color/glow alone (accessibility). No expo-blur/gradient lib available — glows use RN `shadow*`, foil/Sparklet use `react-native-svg`.

**July 19 (midday — VEN reconciliation, PR #40)**
- Team-facing: `cleanup_ven_reprints.py` removed 20 VEN cards (8 overnumbered champion reprints, 6 SP reprints, 6 domain runes) — all exact duplicates of earlier-set cards with degraded data. VEN went 161 → 141 of a 166 total; the 25 absent numbers are unreleased slots, not errors. Confirmed the art-exclusion logic keys strictly off `imageUrl`, not any `new` flag.

**July 19 (morning — Claude Code + Cowork setup)**
- Team-facing: Feature formerly "Card Recall"/"Memory Game" named **RiftRecall**. Set up and validated Claude Code (branch/PR workflow) and Claude Cowork (Drive + TickTick connectors). TickTick tagged for type/state/area.

**July 17**
- Customer-facing: All Vendetta cards now show real card art in RiftRecall.
- Team-facing: `apply_vendetta_images.py` backfills `imageUrl` from Riftcodex, handling the signature-champion `-006` id quirk.

**July 16**
- Customer-facing: Vendetta card data added ahead of July 31 release. Duplicate "Ultimate" Baron Nashor removed. Champion/Equipment filtering fixed. Speed filter added. Sets broken out individually. Quiz layout improved.
- Team-facing: GitHub repo live with branch protection + CI. Vercel connected. `merge_sheet.py` supports a permanent blacklist.

**July 14**
- Customer-facing: Match Tracker shipped. Feedback form added. "Deck" filter for quiz practice.

---

## 10. Open decisions / questions

1. Game-log / match-state snapshot schema — needs further iteration in a dedicated RiftIQ/RiftEngine thread, bundled with the decision-tree and pen-and-paper capture-format tasks (one workstream, see Section 0). Architecture resolved: RiftCore (M0, shipped) owns the schema envelope and forward rules kernel; RiftEngine (M2, not started) will own reconstruction/abduction from raw captures. See docs/design/riftbound-module-architecture.md and docs/design/riftbound-reconciliation-resolved.md.
2. New-user ingestion survey: exact questions/segments not yet decided.
3. Donate link platform + Riot LJJ policy check — unresolved, not urgent.
4. Keyword badge styling — undecided, low priority.
5. RiftIQ real module design — what goes in it beyond placeholders.
6. Stale GitHub branch cleanup — process documented, not yet executed.
