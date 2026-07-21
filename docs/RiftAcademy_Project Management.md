# RiftAcademy — Master Project Doc

**Owner:** Ashwin Sathe (sole dev, Sathe Consulting LLC) · **Repo:** `github.com/shwinsta-ra/riftacademy` (private, GitHub Pro)
**Hard deadline:** **July 31, 2026** (Vendetta set release) · **Launch posture:** web-only, free, LJJ-compliant
**Last updated:** July 20, 2026 (evening). Full reconciliation. Folds in: tutorial visual polish and the no-em-dash content rule (PR #52), three rounds of staging feedback (PRs #55/#58/#67), a tutorial timing fix plus first-launch welcome screen (PR #64), the ratified six-module architecture (PR #60), and the RiftCore package (PR #69), which shipped in code without a fragment, another real documentation gap caught here, not a stylistic one. Also resolves the Vendetta Prep vs. onboarding-tutorial tracking overlap. **This doc is no longer edited directly by feature/fix PRs — see Section 1a and `docs/updates/TEMPLATE.md`.**
**Canonical file name:** `RiftAcademy_Project Management` — fixed name across GitHub, Project Knowledge, and Google Drive.
**Status:** This is the single canonical project doc. If you're holding any other copy — a download from earlier today, a different thread's local merge — discard it.

> **Three forks happened today before this system existed** (see prior git history / PR #44 if curious). The root cause each time: either a stale pasted copy, or multiple PRs editing this same file concurrently. Both are now structurally prevented: new threads read the doc from a freshly-generated zip (Section 5) instead of a pasted copy, and day-to-day updates go into per-thread fragment files (Section 1a) instead of direct edits to this file. This is the last manual full reconciliation this doc should need under normal conditions.

> **What this doc is.** The one cross-thread source of truth for RiftAcademy, kept in **Project Knowledge** so every thread (chat, Cowork, Claude Code) can read it. Real edits happen via the fragment system (Section 1a) and land here only at end-of-day reconciliation.

---

## 0. Open this section first — what to do right now

**Highest priority:** RiftIQ. Verify v1 puzzles, build the puzzle UI, add a homepage module for RiftIQ.

**2nd priority:** RiftCoach. Begin the pre-rift plan.

**Unprioritized:**
- Validate the 60 Vendetta distractor conversions plus 7 flagged cards (Ashwin).
- Group B card-question follow-up (Ashwin + Claude).
- Clean up the Master Card Inventory Function column for Vendetta cards (Ashwin).

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
- Master Card Inventory: 929+ cards across OGN, OGS, SFD, UNL, VEN.
- **VEN: 141 of 166 base cards** currently in `cards.json` (all numbered 1–166, no dups, no over-total codes). The remaining 25 collector numbers are genuinely unreleased/not-yet-on-Riftcodex slots ahead of the July 31 launch, not ingestion errors.
- `cleanup_ven_reprints.py` removed 20 cards from the earlier 161 count: 8 provisional overnumbered champion codes (Vi/Jinx/Jayce/Viktor/Rengar/Khazix/Diana/Leona), 6 signature "SP" champion reprints, 6 VEN domain runes — each an exact duplicate of a card already in an earlier set.
- All present VEN cards (and all cards overall) confirmed to have non-null `imageUrl`. RiftRecall's art-exclusion logic in `src/lib/quiz.ts` keys strictly off `imageUrl === null` — there is no `new` flag in `cards.json`, so no stale-flag path can bench a card that has art.
- Baron Nashor (Ultimate) permanently blacklisted (`BLACKLISTED_IDS`).
- Champion/Equipment stored as `Unit`/`Gear` + `subtype`; `Champion`/`Equipment` no longer valid `type` values.
- Set filters grouped: Origins & Proving Grounds / Spiritforged / Unleashed / Vendetta. Speed filter (Action/Reaction) added.
- Only 4 old Unleashed tokens remain without art — unrelated, low priority.

### Shipped app features
- **RiftRecall** (renamed from "Card Recall"/"Memory Game"), fully overhauled July 18–19 across PRs #29/#32/#33 — **this build-out shipped in code well before tonight but was never reflected here until now:**
  - **Session persistence & batch pacing:** long-term box/due-date state persists across sessions; in-session progress survives refresh; sessions capped at 20 cards with round-robin missed/new/review composition and a mandatory 10-minute gate between batches.
  - **Question-quality overhaul:** split Energy/Power cost into independently-testable modes; sane non-negative sequential numeric distractors; battlefield/equipment text-question handling that never leaks the answer; recency-weighted mode picker; fill-in-the-blank mode for cards with exactly 2 numeric effect values; champion name-quiz distractors restricted to the same champion's other epithets (189 authored synthetic epithets, pending Ashwin's review).
  - **Control-sheet pipeline:** `build_master_sheet.py`/`apply_master_sheet.py` — one XLSX matching Ashwin's exact format, blank = auto-generated question, filled = permanently pinned.
  - **UI:** 2×2 answer grid (1×3 for exactly 3 options), larger card, bottom-anchored controls.
  - **Home screen rebuild:** `RIFT_BRAND` gold wordmark convention across RiftAcademy/RiftRecall/RiftIQ; RiftIQ introduced as an umbrella (placeholder content); live review-count preview; "What's New" box; fixed LJJ footer.
- **Visual-direction "Rune Glow" pass** (PR #45, merged): ambient screen glow, glowing primary buttons (`GlowButton`), a `Sparklet` mascot that celebrates correct answers (respects reduce-motion). `RIFT_BRAND` gold widened to also cover the Sparklet cap only. No Reanimated/expo-blur in the project; glows use RN `shadow*`, Sparklet uses `react-native-svg`. The original holographic foil card-art frame (`QuizCardArt`) was dropped in favor of glow-behind only (PR #52); `FOIL` removed from `theme.ts`.
- **First-launch onboarding tutorial** (PRs #46, #52, #55, #58, #64, #67, all merged): coach-mark style — highlighted ring + tip bubble walks through setting filters and starting a session using the real UI, advances on real taps, preceded by a one-time Welcome/alpha screen. Content-agnostic engine (`tutorialContext.tsx`) separate from the swappable 4-step script (`tutorialSteps.ts`) — deliberately temporary per Ashwin, meant to be replaced by a broader tour later without an engine rewrite. See Section 9 for the full run of staging-feedback fixes. Web fully verified; native (iOS/Android) still not explicitly confirmed.
- **Match Tracker (core):** full live match dashboard.
- **Feedback widget:** draggable bubble, screenshot/annotation, Discord webhook. `REQUIRED` tag removed from the "What happened" field (PR #55).
- **Opponent Deck Knowledge Filter**, **GitHub + Vercel pipeline**, **Claude Code + Cowork** (both authenticated and validated July 19).
- Unified `AppModal` across 6 modals; platform-aware CSV export.

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
| VEN card-count reconciliation | Completed | 161 → 141 of 166, full reasoning documented | Fixed Jul 19 | — | PR #40 |
| RiftRecall — session persistence & batch pacing | Completed | Long-term + in-session state, 20-card capped batches | Shipped | — | PR #29/#33 — **previously undocumented here** |
| RiftRecall — question-quality overhaul | Completed | Split cost modes, sane distractors, epithet-restricted name quiz | Shipped | Epithet CSV review pending | PR #29/#32/#33 — **previously undocumented here** |
| RiftRecall — control-sheet pipeline | Completed | `build_master_sheet.py`/`apply_master_sheet.py` | Shipped | — | PR #29 — **previously undocumented here** |
| Home screen rebuild | Completed | `RIFT_BRAND` convention, RiftIQ umbrella, What's New | Shipped | — | PR #33 — **previously undocumented here** |
| Visual-direction "Rune Glow" pass | Completed | Ambient glow, Sparklet mascot (foil-rim art later dropped, see notes) | Shipped Jul 19 | — | PR #45; foil-rim card treatment dropped for glow-behind only (PR #52), `FOIL` removed from `theme.ts` |
| Claude Code + Cowork setup | Completed | Both authenticated and validated | Done Jul 19 | — | PAT found + revoked same day, non-load-bearing |
| First-launch onboarding tutorial | Completed | 4-step coach-mark tour, real-tap advancement, plus a first-launch Welcome/alpha screen ahead of it | Shipped (PRs #46, #52, #55, #58, #64, #67) | None | Multiple staging-feedback rounds polished mask sizing, timing, and copy; native on-device check still not explicitly confirmed |
| RiftCore package (M0) | Completed | Schema, forward rules kernel, effects, cards adapter (`src/lib/core/`); the shared kernel RiftEngine/RiftLab/RiftCoach/RiftIQ will import | Shipped Jul 20 | None | PR #69; shipped without a fragment, a real documentation gap caught at this reconciliation, not a stylistic one; added vitest as the project's first test runner; see docs/design/riftbound-module-architecture.md |
| **ACTIVE THIS WEEK** |
| Puzzle content (initial + Vendetta) | Not started | 3–5 strategy + 3–5 Vendetta puzzles; verify v1 puzzles, build puzzle UI, add RiftIQ homepage module | For app launch | None | Highest priority per Section 0; see docs/design/riftbound-module-architecture.md |
| Vendetta full-set repull | In progress | Bring VEN from 141 to full 166 | Ahead of next week's pre-rift | Riftcodex indexing pace | — |
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
cd ~/Downloads/riftacademy-current
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

**Every time (Terminal):**
```
cd ~/Downloads/riftacademy-current
git checkout integration
git pull
git archive --format=zip -o ~/Downloads/riftacademy-upload.zip HEAD
```
*(use `main` instead of `integration` for a hotfix)*

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
