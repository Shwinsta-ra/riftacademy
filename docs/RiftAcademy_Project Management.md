# RiftAcademy — Master Project Doc

**Owner:** Ashwin Sathe (sole dev, Sathe Consulting LLC) · **Repo:** `github.com/shwinsta-ra/riftacademy` (private, GitHub Pro)
**Hard deadline:** **July 31, 2026** (Vendetta set release) · **Launch posture:** web-only, free, LJJ-compliant
**Last updated:** July 19, 2026 (evening) — final manual full reconciliation. Folds in: RiftRecall's overnight build-out (shipped in code via PRs #29/#32/#33, but never previously reflected in this doc — a real gap, not a stylistic gap), the three-copy sync model, the GitHub PAT security incident, the TickTick restructure, and PR #45 (Rune Glow)/#46 (onboarding) detail already present. **Starting tonight, this doc is no longer edited directly by feature/fix PRs — see Section 1a and `docs/updates/TEMPLATE.md`.**
**Canonical file name:** `RiftAcademy_Project Management` — fixed name across GitHub, Project Knowledge, and Google Drive.
**Status:** This is the single canonical project doc. If you're holding any other copy — a download from earlier today, a different thread's local merge — discard it.

> **Three forks happened today before this system existed** (see prior git history / PR #44 if curious). The root cause each time: either a stale pasted copy, or multiple PRs editing this same file concurrently. Both are now structurally prevented: new threads read the doc from a freshly-generated zip (Section 5) instead of a pasted copy, and day-to-day updates go into per-thread fragment files (Section 1a) instead of direct edits to this file. This is the last manual full reconciliation this doc should need under normal conditions.

> **What this doc is.** The one cross-thread source of truth for RiftAcademy, kept in **Project Knowledge** so every thread (chat, Cowork, Claude Code) can read it. Real edits happen via the fragment system (Section 1a) and land here only at end-of-day reconciliation.

---

## 0. Open this section first — what to do right now

**Just shipped (today):**
- Vendetta card-count reconciliation (161 → 141 of 166, with full reasoning) — PR #40.
- Visual-direction "Rune Glow" pass (ambient glow, foil card art, Sparklet mascot) — PR #45, merged.
- First-launch onboarding tutorial for RiftRecall — PR #46, open, clean, ready to merge pending an on-device native check (web fully verified).

**Active right now:**
- RiftNotes rework — separate thread, in parallel.
- Whichever new parallel threads get kicked off this evening to test the fragment-file process for the first time.

**Big features still open, priority order:**
1. **Vendetta Prep highlight + 3-step guided tour** — distinct from the onboarding tutorial (#46); this is specifically the "filter to Vendetta → quiz" fast path for Discord-referred players ahead of Friday's pre-rifts. Still not started as its own piece — confirm with the RiftRecall thread whether #46's tutorial already covers this or whether it's still a separate task.
2. **Puzzle content**: 3–5 strategy puzzles + 3–5 Vendetta-card puzzles, for app launch.
3. **Opus strategy track** (parallel, doesn't block launch): the decision-tree task, the pen-and-paper game-state capture task, and the game-log/match-state schema (feeds both RiftIQ and RiftNotes) — these are one workstream, not three; see Section 10.

**Waiting on Ashwin:**
- Review `champion_epithet_review.csv` (94 champions, ~189 authored synthetic epithets).
- Updated master card inventory upload (casing fixes, ban dates).
- Confirm whether the onboarding tutorial (#46) needs on-device (iOS/Android) verification before merging, or whether web verification is sufficient to ship.

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
- **Visual-direction "Rune Glow" pass** (PR #45, merged): ambient screen glow, glowing primary buttons (`GlowButton`), holographic foil card-art frames (`QuizCardArt`), a `Sparklet` mascot that celebrates correct answers (respects reduce-motion). `RIFT_BRAND` gold widened to also cover the foil rim/trim + Sparklet cap only — nowhere else. No Reanimated/expo-blur in the project; glows use RN `shadow*`, foil/Sparklet use `react-native-svg`.
- **First-launch onboarding tutorial** (PR #46, open): coach-mark style — highlighted ring + tip bubble walks through setting filters and starting a session using the real UI, advances on real taps. Content-agnostic engine (`tutorialContext.tsx`) separate from the swappable 4-step script (`tutorialSteps.ts`) — deliberately temporary per Ashwin, meant to be replaced by a broader tour later without an engine rewrite. Two real conflicts surfaced against the just-merged Rune Glow work and were resolved without touching `GlowButton` itself (wrapped in a `View` instead) — see Section 9 for full detail. Web fully verified; native (iOS/Android) unverified.
- **Match Tracker (core):** full live match dashboard.
- **Feedback widget:** draggable bubble, screenshot/annotation, Discord webhook. (`REQUIRED` tag removal on the "What happened" field still pending — see Section 0/3.)
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
| Feedback widget | Completed | In-app feedback form | Shipped | — | `REQUIRED` tag removal still pending |
| Opponent Deck Knowledge Filter | Completed | "Deck" filter for quiz drilling | Shipped Jul 16 | — | — |
| GitHub integration | Completed | Repo + Vercel pipeline | Shipped Jul 16 | — | — |
| Master Card Inventory + Vendetta prep | Completed | Full DB refresh, dedup/ban cleanup | Shipped | — | — |
| Vendetta card images | Completed | All VEN cards have real art | Shipped Jul 17 | — | Re-verified Jul 19 |
| VEN card-count reconciliation | Completed | 161 → 141 of 166, full reasoning documented | Fixed Jul 19 | — | PR #40 |
| RiftRecall — session persistence & batch pacing | Completed | Long-term + in-session state, 20-card capped batches | Shipped | — | PR #29/#33 — **previously undocumented here** |
| RiftRecall — question-quality overhaul | Completed | Split cost modes, sane distractors, epithet-restricted name quiz | Shipped | Epithet CSV review pending | PR #29/#32/#33 — **previously undocumented here** |
| RiftRecall — control-sheet pipeline | Completed | `build_master_sheet.py`/`apply_master_sheet.py` | Shipped | — | PR #29 — **previously undocumented here** |
| Home screen rebuild | Completed | `RIFT_BRAND` convention, RiftIQ umbrella, What's New | Shipped | — | PR #33 — **previously undocumented here** |
| Visual-direction "Rune Glow" pass | Completed | Ambient glow, foil art, Sparklet mascot | Shipped Jul 19 | — | PR #45 |
| Claude Code + Cowork setup | Completed | Both authenticated and validated | Done Jul 19 | — | PAT found + revoked same day, non-load-bearing |
| **IN REVIEW** |
| First-launch onboarding tutorial | In review | 4-step coach-mark tour, real-tap advancement | PR #46 open, clean | Native on-device check | Deliberately temporary script; engine is reusable |
| **ACTIVE THIS WEEK** |
| Vendetta Prep highlight + guided tour | Not started | Distinct from #46 — confirm scope isn't already covered | This week, launch-blocking | Depends on #46's scope | See Section 0 |
| Puzzle content (initial + Vendetta) | Not started | 3–5 strategy + 3–5 Vendetta puzzles | For app launch | None | — |
| RiftNotes rework | In progress | Simpler, fast-game-usable coaching flow | This week | Shares schema w/ RiftIQ | Separate thread |
| Vendetta full-set repull | In progress | Bring VEN from 141 to full 166 | Ahead of next week's pre-rift | Riftcodex indexing pace | — |
| New User Ingestion Flow | Not started | Onboarding survey, user segmentation | Before next invite push | Survey design | — |
| **THIS MONTH (BEFORE JULY 31)** |
| Deckbuilder v1 | Not started | Template deck, save personal version | Before Jul 31 | None | — |
| Game-log / match-state schema | Not started | Shared snapshot schema, RiftIQ + RiftNotes | Needs Opus iteration | Dedicated RiftIQ thread | See Section 10 |
| RiftIQ real module design | Not started | What goes in the umbrella beyond placeholders | This month | None | — |
| **DEFERRED / UNSCHEDULED** |
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

1. Game-log / match-state snapshot schema — needs Opus iteration in a dedicated RiftIQ thread, bundled with the decision-tree and pen-and-paper capture-format tasks (one workstream, see Section 0).
2. New-user ingestion survey: exact questions/segments not yet decided.
3. Donate link platform + Riot LJJ policy check — unresolved, not urgent.
4. Keyword badge styling — undecided, low priority.
5. RiftIQ real module design — what goes in it beyond placeholders.
6. Whether the onboarding tutorial (#46) already covers the "Vendetta Prep guided tour" scope from Section 0, or whether that's still a distinct piece of work — needs a decision before more effort goes into either.
7. Stale GitHub branch cleanup — process documented, not yet executed.
