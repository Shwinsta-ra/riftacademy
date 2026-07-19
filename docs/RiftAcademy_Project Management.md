# RiftAcademy — Master Project Doc

**Owner:** Ashwin Sathe (sole dev, Sathe Consulting LLC) · **Repo:** `github.com/shwinsta-ra/riftacademy` (private, GitHub Pro)
**Hard deadline:** **July 31, 2026** (Vendetta set release) · **Launch posture:** web-only, free, LJJ-compliant
**Last updated:** July 19, 2026 (midday) — third reconciliation pass today. RiftRecall's overnight/morning build-out (feature work, card cleanup, question-quality overhaul) is the base; this pass restores the Claude Code/Cowork setup thread's sync-model and security-incident content, which had dropped out of RiftRecall's merge because it worked from a stale pre-sync-model copy of this doc — the same failure mode the fork note below describes, recurring one layer down.
**Canonical file name:** `RiftAcademy_Project Management` — fixed name across GitHub, Project Knowledge, and Google Drive.
**Status:** This is the **single** canonical project doc. If you're holding any other copy (a second `.md`/`.docx` from a different thread, or a download sitting in `~/Downloads` from earlier today), discard it — its content now lives here.

> **Fork note (July 19):** two threads updated this doc independently this morning — the RiftRecall thread (overnight) and the Claude Code/Cowork setup thread (this morning) — producing two different files with different section numbers, each unaware of the other's changes. Nothing was lost; both were read in full and reconciled. **The lesson, not just the fix:** before a thread edits this doc, confirm it's working from the copy actually in Project Knowledge (or, better, the copy actually merged on GitHub), not one pasted from an old download or regenerated from memory. If a thread's context shows a different version than what's canonical, stop and reconcile before editing further.

> **Second fork note (July 19, midday):** the same failure recurred immediately — RiftRecall's reconciliation above was itself built from a copy of "the other thread's" doc that predated the sync-model work below, so that content silently dropped out again. **Sharper fix, not just a repeat of the lesson:** a manual Project Knowledge upload is a single point of staleness — anyone can paste an old download into a thread and nothing catches it automatically. Going forward, before any thread does a substantial rewrite of this doc, pull the actual current copy from **GitHub** (`git show origin/main:"docs/RiftAcademy_Project Management.md"`, or ask Claude Code to fetch it) rather than trusting a pasted-in copy — GitHub is the one copy that's actually version-controlled and can't silently regress.

> **What this doc is.** The one cross-thread source of truth for RiftAcademy, kept in **Project Knowledge** so every thread (chat, Cowork, Claude Code) can read and update it. When a thread changes something structural — ships a feature, changes a convention, makes a decision — it updates this doc and re-uploads it. That upload is the "commit" to shared context. Do **not** create a second project-level doc; append to this one.

---

## 0. Open this section first — what to do right now

**Quick fixes (<30 min), priority order:**
1. Remove trigger mode entirely from RiftRecall (was paused; full removal confirmed by Ashwin).
2. Feedback form: remove the `REQUIRED` tag and the hard requirement on the "What happened" field.
3. Card data fixes once Ashwin's updated inventory lands: "Ride the Wind" / "Death from Below" casing (match the physical card), The Arena's Greatest ban effective date.

**Big features (>30 min), priority order:**
1. **Vendetta Prep highlight + 3-step guided tour** — top launch-blocking item. Prominent entry point this week; open → Vendetta filter → quiz, no dead ends. After launch week, folds back into "just another set filter" (confirm before generalizing away).
2. **Zero-typing audit** — filters flow already staged/tap-only (done). Remaining scope is just the feedback-form fix above. RiftNotes typing is explicitly out of scope right now (separate future rework thread).
3. **Visual direction pass** — Riftbound art aesthetic (colorful/cartoony, not flat/dark), poro-style delight moment on correct answers. **Hard 1-hour timebox.** Candidate to hand to Cowork to parallelize against Vendetta Prep.
4. **Puzzle content**: 3–5 strategy puzzles + 3–5 more using Vendetta-set cards, by EOD, for app launch.
5. **Opus strategy track** (doesn't block launch, runs in parallel now that Code/Cowork are set up): RiftIQ brainstorming (puzzle creation from video/podcast/write-ups), game decision-tree development, RiftAtlas/Riftlite game-log extraction, pre-rift event strategy prep for next week.

**In progress right now:**
- Claude Code is pulling in more Vendetta card art (toward the full 166-card VEN set).
- RiftNotes rework — separate thread, in parallel.

**Waiting on Ashwin (not blocking, just tracked so it doesn't get lost):**
- Review `champion_epithet_review.csv` (94 champions, ~189 authored synthetic epithets) — flag anything off-tone.
- Review Group B scope (deferred general "test one arbitrary aspect of card text" parsing) — Ashwin will spot patterns from real examples and give a rule to apply broadly.
- Updated master card inventory upload (equipment fixes + casing + ban date).

**Format note:** this section is refreshed every session — quick fixes and big features, both in priority order. Update it rather than letting it drift; completed items move to Section 9's log, not deleted silently.

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
- **TickTick** (`RiftAcademy` list) is the live task backlog — see Section 8. This doc holds status/history/decisions; TickTick holds the granular day-to-day task queue. Don't duplicate task-level detail here.
- **Feature status lives in ONE place** — the table in Section 3. Don't re-describe a feature's status in prose elsewhere in this doc; update the table row instead. (This doc forked twice in one morning partly because status was scattered across free-form sections in independently-edited copies — the table is the fix.)

### 1a. Three-copy sync model

This doc exists in three places. They are **not peers** — one is truth, one is the working cache, one is insurance.

| Copy | Role | Who writes it | Written how |
|---|---|---|---|
| **GitHub** (`docs/RiftAcademy_Project Management.md`) | **Canonical, version-controlled source of truth.** Every real edit lands here first. | Claude Code | Rides the **same branch/PR as the code it describes** — a doc change travels embedded in the relevant `feature/*`/`fix/*` branch through the normal `integration → beta → staging → main` pipeline (Section 4), never as a separate fast-tracked doc-only PR. This guarantees the doc on `main` never describes changes that haven't landed on `main` yet. |
| **Claude Project Knowledge** | **Working cache** every chat/Cowork thread reads for context. Never edited independently — always refreshed *from* GitHub. | Ashwin, manually | One drag-and-drop upload whenever a thread flags "the canonical doc changed, please re-upload." Deliberately manual — Claude has no tool to write Project Knowledge directly. **This manual step is the known weak point** — see the second fork note above. When in doubt, pull from GitHub instead of trusting what's pasted into a thread. |
| **Google Drive** (RiftAcademy folder, via the local Drive-for-Desktop synced path) | **Disaster-recovery backup only.** Never treated as truth, never diffed against — just insurance if GitHub or Project Knowledge somehow get corrupted. | Claude Code (writes to the local synced folder path so Drive for Desktop versions it in place) | `/Users/ashwinsathe/Library/CloudStorage/GoogleDrive-ashwin.sathe86@gmail.com/My Drive/RiftAcademy/RiftAcademy_Project Management.md` — a plain filesystem overwrite; Drive syncs it as a real in-place update, not a duplicate. (An earlier attempt via the Drive API connector could only create new files, not update in place — that path is deprecated in favor of the local-write workaround.) |

**Concurrency/locking:** no separate lock mechanism (no `LOCKED_BY` file, no reservation system) — git's branch → PR → merge flow already is the check-out/check-in system, and the fact that **Ashwin manually merges every PR to `main`** is the actual lock: multiple threads can edit on separate branches simultaneously, and the only moment that matters is the merge, which only he can do. If two threads' doc edits conflict, git surfaces that as a merge conflict instead of silently overwriting — the same protection as the app code gets, no custom tooling needed. **This protects the GitHub copy. It does not protect Project Knowledge or a thread's in-context copy** — those can still silently diverge if a thread works from a stale paste, as happened twice this morning. The fix for that gap is the second fork note above: pull from GitHub before a big rewrite, don't trust a paste.

**Sync cadence:** end of each work session (not a fixed clock interval) — Ashwin does this nightly before bed, so everything is synchronized again at the start of the next day. The main coordination thread is responsible for pulling together what changed across the day's threads and driving all three copies in one pass at that checkpoint.

---

## 2. Current state (snapshot)

### Infrastructure
- Branch pipeline: `main` (prod, `riftacademy-tau.vercel.app`) → `staging` (public preview, `riftacademy-staging.vercel.app`, also hotfix validation) → `beta` (premium testers, no domain yet) → `integration` (target for `feature/*`, `fix/*`, `hotfix/*`).
- All four core branches: branch protection + 2 required checks — `typecheck` (`ci.yml`) and `check-source-branch` (`enforce-branch-flow.yml`). Requires GitHub Pro (private repo).
- Vercel via GitHub integration (push → auto preview deploy). Hobby plan = 1 concurrent build; a full promotion chain takes 10–20 min, that's normal.
- Mac git identity (global): `shwinsta-ra` / `ashwin.sathe86@gmail.com` — required, or Vercel blocks the deploy with a "commit author email is not valid" error. npm global prefix `~/.npm-global`.
- **Claude plan: Max** — confirmed. Cowork on web/mobile, computer-use preview, and phone-based Remote Control/Dispatch are all available.
- **GitHub CLI (`gh`) authenticated via OAuth device flow** (`gh auth login`), scopes `repo`/`workflow`/`read:org`/`gist` — this is what Claude Code uses for all push/PR operations. **Not** a Personal Access Token — see the security note in Section 9 (July 19 log) for why that distinction mattered today.

### Card database
- Master Card Inventory: **893 cards** live in `cards.json` across OGN (290), OGS (24), SFD (219), UNL (219), VEN (141).
- Trust **Riftcodex-encoded set sizes**, not any other reference table, when a count conflicts (confirmed: OGS is 24 not 30, UNL is 219 not 222).
- VEN is intentionally short of its eventual 166 base-card total — Claude Code is pulling in more art/cards this morning; a fuller repull is scheduled ahead of next week's pre-rift.
- Removed as duplicates/non-legal (not deleted from history — see `BLACKLISTED_IDS` in `merge_sheet.py`, ~26 entries): 14 VEN champion reprints (6 "SP" cards + 8 overnumbered, all lower-quality dupes of earlier-set originals — the previously-provisional Vi/Jinx/Jayce/Viktor/Rengar/Khazix/Diana/Leona overnumbered codes among them), 6 VEN domain runes (dupes of OGN runes), 5 non-base tokens (Baron Pit, Bird, Brush, Reflection, Gold // Buff — OGN's 4 Recruit/Sprite tokens are kept, since they're numbered inside OGN's 298 base set, but excluded from the quiz via `isToken`).
- **Competitive bans are dynamic**, read from the master inventory's `Bans` column on every `merge_sheet.py` run: any card banned in **1v1** (any combination) is auto-removed; a card banned **only in 2v2** (e.g. Master Yi, Wuju Bladesman) is kept. 10 cards currently removed this way. Future banlist changes are a sheet edit, not a code change.
- Casing convention: **match the physical card exactly** (e.g. "Ride the Wind", "Death from Below" — sentence case, not the spreadsheet's inconsistent casing).
- Champion apostrophes: Kaisa, Khazix, Leblanc, Reksai — no apostrophes (override source styling).
- Champion/Equipment stored as `Unit`/`Gear` + `subtype`; `Champion`/`Equipment` no longer valid `type` values.
- Set filters grouped: Origins & Proving Grounds / Spiritforged / Unleashed / Vendetta. Speed filter (Action/Reaction) — **suppressed as a quiz question when exactly one speed is filtered** (answer would be given away); stays askable at zero or both speeds selected.
- Every card in `cards.json` currently has real art (verified against raw Riftcodex source; the previously-art-less UNL tokens were among the removed non-base tokens above).

### Shipped app features
- **RiftRecall** (final name — was "Card Recall"/"Memory Game"): Leitner-box spaced-repetition quiz, fully overhauled July 18–19:
  - **Session persistence**: long-term box/due-date state via localStorage (web) / SQLite (native); in-session score/queue/seen-set via sessionStorage, survives refresh, never hides newly-due cards on resume.
  - **Session batch pacing**: capped at 20 cards per batch, round-robin mix of missed/new/promoted-review cards (never one category dominating), mandatory 10-min wait between batches (independent of the existing 10-min per-card cooldown), gate persists through a full app close, resuming an in-progress batch always takes priority over the gate.
  - **Question quality**: split Energy/Power cost into independently-testable modes (previously Power was never asked on dual-stat cards); Gear/Equipment Might phrased as "gear's Might bonus" not "unit's Might"; sane numeric distractors (sequential, non-negative); battlefield text-distractors pull from other battlefields only (never numbers); equipment text-mode tests the effect line, never the boilerplate `[Equip (X)]` tag; trigger mode being **removed entirely** (was paused, now fully cut per Ashwin's call — see Section 0); recency-weighted mode picker so no single attribute streaks (verified: worst gap without a cost/might question dropped from 20 questions to 7); fill-in-the-blank mode for cards with exactly 2 numeric values in their effect text (e.g. "discard ___, then draw ___"); champion name-quiz distractors restricted to the **same champion's other epithets only** (real + 189 authored synthetic epithets in `championEpithets.json`, since 93 of 94 champions have fewer than 4 real printed epithets) — pending Ashwin's review.
  - **UI**: always 2×2 answer grid (1×3 for exactly 3 options), larger card (78% width), controls bottom-anchored to avoid scrolling, centered session-score header.
  - **Control-sheet pipeline**: `scripts/build_master_sheet.py` / `apply_master_sheet.py` — one XLSX (`RA_Card Questions Control Sheet`, Ashwin's exact formatting/colors/tab name) with a row per (card, question type); blank = live auto-generation, filled = permanently pinned hand-authored question. Supersedes the older single-purpose `apply_overrides.py`/`apply_questions.py` (still functional, not the primary path).
- **Home screen rebuilt**: `RiftAcademy` title + "Master the Rift." tagline; brand convention — the literal word **"Rift"** renders in warm gold (`RIFT_BRAND` in `theme.ts`) across every product name (RiftAcademy/RiftRecall/RiftIQ), suffix stays white (mirrors Google's "Google"-colored / product-name-plain pattern); **RiftIQ** introduced as the umbrella for Match Analyzer + Daily Puzzle (placeholder content, real module not yet designed); live "Review Cards (N)" session-size preview; "What's New" changelog box (italicized body text); LJJ legal notice as a **fixed footer** (pinned to the bottom of the visible screen, not the end of scrollable content) — exact required text now live.
- **Match Tracker (core):** full live match dashboard — points/hand/deck/rune tracking, undo, CSV export, Conquer/Hold, Hidden-play mechanic, 20 real Hartford decklists.
- **Feedback widget:** draggable floating bubble, category dropdown + free text + screenshot capture/annotation, Discord webhook delivery, offline queue. (Removing the required-field constraint on this — see Section 0.)
- **Opponent Deck Knowledge Filter:** "Deck" filter on quiz Settings, using the 20-deck library, to drill "what could this specific opponent have had."
- **GitHub + Vercel pipeline:** live, branch-protected, connected (see Infrastructure above).
- **Claude Code + Claude Cowork:** both set up and validated July 19 — Claude Code authenticated via `gh` OAuth, doing all branch/commit/PR work; Cowork connected to Google Drive (Riftbound parent folder, broader than just RiftAcademy) and TickTick, validated with a read-only check of both before any task was authorized.
- Unified `AppModal` across 6 modals; platform-aware CSV export (Web Share API mobile / clipboard desktop).

### Data pipeline
- Google Sheets master workbook = source of truth; Python (`merge_sheet.py`, `apply_*.py`, `build_master_sheet.py`/`apply_master_sheet.py`) does CSV/XLSX↔JSON.
- `merge_sheet.py` applies canonical champion-name transforms, the dynamic ban filter, and the permanent blacklist on every run.
- Supabase migration deferred until Vendetta fully stabilizes (single combined ingestion then — card inventory, archetype index, decklists, app config/rules files).

---

## 3. Feature tracker & roadmap

*Single row per feature — update in place rather than re-describing status elsewhere in this doc (see Section 1). Status legend: **Completed** — **Not started** (scheduled) — **Unresolved** (needs a decision before scheduling) — **Deferred** (deliberate) — **Blocked** — **Pending import** (waiting on external data).*

| Feature | Status | Description | Target | Dependencies / Blockers | Notes |
|---|---|---|---|---|---|
| **SHIPPED** |
| Match Tracker (core) | Completed | Full live match dashboard | Shipped | — | Largest feature to date |
| Feedback widget | Completed | In-app feedback form | Shipped | — | Required-field constraint being removed (Section 0) |
| Opponent Deck Knowledge Filter | Completed | "Deck" filter dimension for quiz drilling | Shipped July 16 | — | — |
| GitHub integration | Completed | Repo + Vercel deploy pipeline | Shipped July 16 | — | Branch model as above |
| Master Card Inventory + Vendetta prep | Completed | Full DB refresh, duplicate/reprint/token/ban cleanup, 893 live cards | Shipped July 18 | — | See Section 2 for full cleanup detail |
| RiftRecall — session persistence & batch pacing | Completed | localStorage/SQLite long-term + sessionStorage in-session state; 20-card batch cap with round-robin composition + 10-min gate | Shipped July 18 | — | — |
| RiftRecall — question-quality overhaul | Completed | Split cost modes, sane distractors, battlefield/equipment text handling, mode-cycling, fill-in-the-blank, champion-epithet-restricted name quiz | Shipped July 18 | Champion epithet CSV review pending | Trigger mode removal in progress (Section 0) |
| RiftRecall — control-sheet pipeline | Completed | `build_master_sheet.py`/`apply_master_sheet.py`, matches Ashwin's exact sheet format | Shipped July 18 | — | Supersedes older single-purpose apply scripts |
| Home screen rebuild | Completed | Brand-color convention, RiftIQ umbrella, live review count, What's New, fixed LJJ footer | Shipped July 19 | — | — |
| Claude Code + Cowork setup | Completed | Both tools set up, authenticated, and validated for parallel work | Done July 19 | — | GitHub PAT (unused, security risk) revoked same day — see Section 9 |
| TickTick integration | Completed (setup) | RiftAcademy list tagged (type/state/area); columns adjusted mid-day | Done July 19 | — | Task-level detail lives in TickTick, not this doc — see Section 8 for current structure |
| Card count reconciliation (VEN 161→141) | Completed | Corrected the VEN base-card count after identifying 20 non-distinct entries (provisional champion codes, SP reprints, domain runes) | Fixed July 19 | — | Landed via `fix/ven-count-reconcile`; also confirmed the art-exclusion logic keys off `image_url`, not the `new` flag |
| **ACTIVE THIS WEEK** |
| Vendetta Prep highlight + guided tour | Not started | 3-step guided tour: open → Vendetta filter → quiz | This week, launch-blocking | None | Top priority — see Section 0 |
| Zero-typing audit (remainder) | Not started | Remove `REQUIRED` tag + hard requirement on feedback form's "What happened" field | This week | None | Filters flow already done |
| Visual direction pass | Not started | Riftbound art aesthetic, poro-style delight moment | This week, 1hr timebox | None | Candidate for Cowork |
| Puzzle content (initial + Vendetta) | Not started | 3–5 strategy puzzles + 3–5 Vendetta-card puzzles | EOD today | None | For app launch |
| RiftNotes rework | In progress | Simpler, fast-game-usable post-match coaching flow | This week | Shares schema work with RiftIQ (see below) | Separate thread, parallel |
| Vendetta full-set repull | In progress | Bring VEN from 141 to full 166 base cards | Ahead of next week's pre-rift | Riftcodex indexing pace | Claude Code working on art now |
| New User Ingestion Flow | Not started | Short onboarding survey, segments new users | Before next invite push | Needs decision on survey questions/segments | Time-sensitive once mass invites resume |
| New-user guided app intro | Not started | First-open walkthrough | Soon after ingestion flow | None | May end up subsumed by the Vendetta Prep tour pattern — evaluate after launch week |
| **THIS MONTH (BEFORE JULY 31)** |
| Deckbuilder v1 | Not started | Template deck, swap cards, save personal version | Hard deadline: before Jul 31 | None blocking | Don't let it crowd out ingestion flow |
| Game-log / match-state schema | Not started | Shared snapshot schema for RiftIQ puzzles + RiftNotes | ASAP, needs Opus iteration | Needs dedicated RiftIQ thread | Reminder flagged, Section 0 — part of today's Opus strategy track |
| RiftIQ real module design | Not started | What actually goes in the RiftIQ umbrella beyond placeholders | This month | None blocking | Home-screen umbrella already shipped |
| **DEFERRED / UNSCHEDULED** |
| Group B text-question parsing | Deferred | General "test one arbitrary aspect of any card text" (beyond shipped 2-number fill-in-the-blank) | Waiting on Ashwin's pattern review | Ashwin review (Section 0) | — |
| Sync-down automation + Jest test suite | Deferred | Both written, not merged | Paused | None blocking | Pick back up once feature velocity slows |
| Price-history storage + non-destructive ROI import | Deferred | Own stable price-history store | Wait for Supabase/Firebase | Supabase migration | Nice-to-have, unrelated to gameplay improvement |
| Keyword badge styling | Unresolved | Styled badges/icons for `[Deflect]`-style keywords | Undecided | Was contingent on Riot API, now deferred | — |
| Local daily reminder (OS push) | Deferred | Push notification for daily practice | After TestFlight | Needs on-device permission; not possible from Vercel web build | — |
| In-app daily/weekly quiz reminders | Deferred | In-app streak/reminder indicator | After TestFlight | Bundled with above | — |
| Riot API exploration | Deferred | Card data/images/tournament stats access | → August | IP/policy caution; attorney consult first | Precondition for monetization, not an obstacle to current dev |
| Structured Discord community | Deferred | Discussion, growth, PMF signal | After a build people return to consistently | Needs intake architecture (Section 8) first | — |
| Donate link | Unresolved | Community support toward hosting/dev costs, possibly tiered | TBD | Riot LJJ policy check first | Leaning Ko-fi/Patreon; not urgent |
| Account management | Deferred | Persistent user identity on web app | Longer-term roadmap | None blocking, just unscheduled | Interim: session/local-storage persistence per feature, already shipped for RiftRecall |
| Deckbuilder / Supabase migration | Deferred | Single combined ingestion post-Vendetta-stabilization | Post-July 31 | Vendetta full repull first | — |
| Stale GitHub branch cleanup | Deferred, low priority | Many open feature/fix branches accumulated, unclear which are safe to delete | Whenever there's a lull | None blocking | Tracked in TickTick ("New" bucket) with the exact safe-cleanup process; not urgent |

---

## 4. Deploy workflow (GitHub + Vercel)

Branch pipeline: `feature/*` / `fix/*` / `hotfix/*` → `integration` → `beta` → `staging` → `main`.

- `main` = production — `riftacademy-tau.vercel.app`
- `staging` = public preview — `riftacademy-staging.vercel.app` — hotfix testing + final pre-release validation
- `beta` = premium/beta-tester tier, no public domain yet
- `integration` = first line of defense; combines feature/fix work for testing

All four branches require a PR + passing status checks (`typecheck`, `check-source-branch`) before merging.

**Step 1 — create and push your branch (Terminal, on your Mac):**
```
cd ~/Downloads/riftacademy-current
git checkout integration
git pull
git checkout -b feature/<short-name>
git add .
git commit -m "<describe what changed>"
git push -u origin feature/<short-name>
```
*(use `feature/<short-name>` for new functionality, `fix/<short-name>` for a bug/UI fix; make your changes between `checkout -b` and `add .`)*

**Steps 2–4 — promote up the chain (Browser, GitHub — no terminal needed):**
1. Open `compare/integration...feature/<short-name>` → create pull request → merge.
2. Open `compare/beta...integration` → create → merge.
3. Open `compare/staging...beta` → create → merge. *(This triggers the Vercel staging build.)*
4. Test on staging. Only when satisfied: open `compare/main...staging` → create → merge. *(This triggers production.)*

**Two gotchas every time:**
- Double-check the base branch on GitHub's compare page before creating a PR — it defaults to `main`, which has caused accidental wrong-target PRs before (caught cleanly by `check-source-branch` each time — see Section 11).
- Vercel Hobby plan allows 1 concurrent build account-wide — a full promotion chain queues sequentially and can take 10–20 minutes to show up. That's normal.
- Branch name must match the target's allowed prefix (`^(feature/.*|fix/.*|hotfix/.*)$` for a PR into `integration`) — a mismatched prefix (e.g. `docs/*`) fails `check-source-branch` immediately, even if the content is fine. Rename to an allowed prefix and open a fresh PR; GitHub can't rename a branch already tied to an open PR.

**Git identity:** Mac's global git email must match a verified GitHub email (`ashwin.sathe86@gmail.com`), or Vercel blocks the deploy with "commit author email is not valid."

**GitHub CLI auth:** `gh auth login` uses OAuth device flow (token prefix `gho_`), not a Personal Access Token (`ghp_`) — this is what Claude Code uses for all push/PR/branch operations. No PAT is needed for any of this; if one ever existed for another purpose, treat it as a separate, revocable credential, not something Claude Code depends on.

**Worked example (single-file data update, Vendetta images, Jul 17):**
```
cd ~/Downloads/riftacademy-current
git checkout integration
git pull
git checkout -b feature/vendetta-images
unzip -o ~/Downloads/vendetta-images-update.zip
git add src/data/cards.json scripts/apply_vendetta_images.py
git commit -m "Add Vendetta card images"
git push -u origin feature/vendetta-images
```
Then PR into `integration` on GitHub as usual → promote through `beta` → `staging` → `main`.

---

## 5. New thread creation flow

Do this before starting a new feature in a brand-new thread — even within this same Claude project.

**Every time (Terminal):**
```
cd ~/Downloads/riftacademy-current
git checkout integration
git pull
git archive --format=zip -o ~/Downloads/riftacademy-upload.zip HEAD
```
*(use `main` instead of `integration` if the new thread is for a hotfix. `git archive` packages exactly what's tracked in git — no `node_modules`, no `.git`, respects `.gitignore`. Uncommitted changes are intentionally excluded — this captures the clean merged state, not mid-work changes.)*

**Then, in the new thread:**
- Attach `~/Downloads/riftacademy-upload.zip` to your first message.
- Give the thread a one-line status note — use the latest dated entry from Section 9.
- **Don't just paste a doc copy from an old download.** If the thread is going to do any substantial rewrite of this doc, have it (or Claude Code) pull the actual current version from GitHub first: `git show origin/main:"docs/RiftAcademy_Project Management.md"`. This is the fix for the double-fork this doc just went through — see the fork notes at the top.

---

## 6. Standing rules & conventions

**Workflow**
- Hotfixes go through **staging for validation first**, never straight to `main`.
- **Batch staging changes** before promoting to `main` (not continuous deploy).
- Deliverables as **complete ready-to-deploy zips**, not snippets. Deploy commands = **bare terminal commands, no inline `#` comments** (they break copy-paste into terminal). Any explanation goes as prose before/after the code block.
- Instructions must be **granular, exact commands, full paths with version numbers**.
- Git UI caution: GitHub's "Delete branch" has nuked core branches before. Diagnose real state with `git fetch origin` + `git diff origin/X origin/Y`, not the GitHub UI.
- **Task tracking format**: active work is split into **quick fixes (<30 min)** and **big features (>30 min)**, both in priority order — see Section 0. Refresh each session rather than letting it drift.
- **No credentials in TickTick, docs, or any note-taking tool.** A GitHub PAT was found pasted in plaintext in a TickTick task July 19 — revoked immediately. Claude Code doesn't need one (it authenticates via `gh`'s OAuth device flow). If a credential ever needs to be stored somewhere retrievable, use macOS Keychain or a real password manager — never a task manager, doc, or anything a connected tool has read access to.

**Card data (Riftcodex ingestion)**
- Trailing-letter codes (`ven-088a-166`) = alt art → drop, use base numeric.
- Over-total numbers (`ven-177-166`, total=166) = overnumbered dup → drop for normal-range code, UNLESS no lower twin exists yet → keep temporarily, reconcile later.
- Champion apostrophes: **Kaisa, Khazix, Leblanc, Reksai — no apostrophes** (override source styling).
- Naming: always **"Name, Epithet"**, sentence case matching the physical card exactly (e.g. "Ride the Wind", "Death from Below") — not necessarily the spreadsheet's casing.
- Card-text domain color-letter codes (in-text parens): Fury (R), Calm (G), Mind (B), Body (O), Chaos (P), Order (Y) — color-based, not first-letter. (Any)/rainbow spelled out. Distinct from Power-column cost notation (B/C/M/F/X/O).
- `TYPE_FILTER_PREDICATES`: Unit includes all champions; Champion = subtype Champion only. Gear includes all equipment; Equipment = subtype Equipment only.
- **Competitive bans are dynamic**, read from the inventory's `Bans` column every merge run: 1v1 bans (any combination) auto-remove the card; 2v2-only bans keep it. Trust this over any hardcoded list going forward.
- **Trust Riftcodex-encoded set sizes** over any other reference table when counts conflict.
- **Naming collision guard:** never name a feature RiftMind / RiftBody / RiftCalm / RiftFury / RiftChaos / RiftOrder — these collide with the six domain names.

**Design / theme**
- `REQUIRED` magenta `#EA6FD0` (from `src/lib/theme.ts`) = required fields only, never reused for anything else (including CTAs).
- Domain hex: Fury `#CC2929`, Calm `#3FA34D`, Mind `#2B73C2`, Body `#E57921`, Chaos `#8629B3`, Order `#EBB113`.
- `RIFT_BRAND` gold `#E8B44A` (also `src/lib/theme.ts`) = the literal word "Rift" in every product name (RiftAcademy, RiftRecall, RiftIQ, ...), consistently, across the whole app. The suffix (Academy/Recall/IQ) stays plain text — color marks the repeated/shared brand element, not the varying part. Close to but a deliberate, accepted distinction from `DOMAIN_COLORS.Order`.
- Quiz answer-option layout is answer-COUNT based, not mode-based: exactly 3 options → 1×3 horizontal row; 4 options → 2×2 grid. Applies to every question type uniformly.
- Visual direction should reflect actual Riftbound card-art aesthetic (cartoony, colorful, intense) — avoid flat/black-only UI.

**Culture**
- Explicit correction culture: apply corrections immediately, carry forward, no repeated pushback.
- Feature deferral is explicit and intentional; don't re-surface deferred items unprompted.
- Defer legal/architecture decisions until PMF; don't burn cycles on compliance before core functionality is proven.

---

## 7. Tooling & model routing decisions

**Model routing** (match to cognitive load, not feature/stage):
- Menial/mechanical (CSV→JSON, file tidy, routine PR churn, moderation triage, format enforcement) → **Haiku 4.5** (or Sonnet 5 if judgment needed).
- Feature building / everyday coding → **Sonnet 5** (default workhorse).
- Gnarly bugs, architecture, strategic reasoning (RiftIQ, puzzles, matchups) → **Opus 4.8**, effort up for hard problems.
- Cowork runs flagship-class under the hood → reserve for genuine multi-step work.

**Capability decisions:**
- **Claude Code + Claude Cowork formally adopted into working norms as of July 19** — set up first thing each session so multiple threads/tasks can run in parallel (e.g. Vendetta Prep tour + visual-direction pass + Opus strategy track simultaneously). Claude Code sessions can be monitored/steered from the Claude mobile app via Remote Control (`/rc` in-session) while away from the Mac, as long as the Mac itself stays awake, powered, and online — Remote Control is a window into the local session, not a cloud migration; nothing runs if the Mac sleeps.
- **GitHub/PRs:** use **Claude Code** for branch/commit/PR/push. Keep branch protection + 2 checks. Claude opens PRs; human merges to `main`. Credentials stay manual, authenticated via `gh` OAuth (Section 4) — never a PAT.
- **Google Drive hygiene:** "update in place, don't duplicate." The Drive API connector can only create new files, not update in place — for this doc specifically, Claude Code writes directly to the local Drive-for-Desktop synced folder instead (Section 1a), which Drive then versions correctly. For other Drive hygiene, scheduled Cowork task can enforce naming/folders; hard deletes stay manual. (Drive read tool ignores `gid` tabs → keep per-tab CSV exports.)
- **Discord:** no first-party connector. Fix is architectural — route intake (bugs/puzzles/feedback) into TickTick manually for now (see Section 8); Cowork prioritizes from there. Revisit automation once bug-report volume exceeds manual capacity.
- **Strategic training (RiftIQ) — Opus track:** methodical, ongoing, parallel to (not blocking) app launch work. Covers: puzzle creation from video/podcast/write-up transcripts, game decision-tree development, RiftAtlas/Riftlite game-log extraction, pre-rift event strategy prep. Every claim tied to JSON card truth + current meta.
- **Pro-footage analysis:** no direct video ingestion. Use transcripts, board-state screenshots, and the game-log schema (Section 3) as the durable path to the puzzle pipeline.
- **Claude plan: Max** — Cowork on web/mobile, computer-use preview, and phone-based Remote Control/Dispatch are all available.
- **When Claude Code flags its own command as security-sensitive** (e.g. a shell-injection-shaped pattern warning): don't approve reflexively. Ask it to explain the exact command and why the pattern appears before approving; prefer having it write a scratchpad script file and run that instead of a complex inline one-liner, especially when reviewing from a phone away from the Mac.

---

## 8. TickTick task management design

- **Columns** are area-based swimlanes: `Notes`, `Riftbound Gameplay` (renamed July 19 from "Riftbound Gameplay Improvements" — now scoped to Ashwin's own non-RiftAcademy, personal skill-improvement work, not app features), `Feature Ideas`, `Marketing & Community`, `App Development`, and **`New`** (added July 19 — the intake bucket for tasks created by Claude Cowork or other systems, so auto-created tasks land somewhere clearly labeled rather than mixed silently into existing columns).
- **Workflow state, type, and area are tags**, layered on top so a task can live in any column and still carry status:
  - Type: `#feature` `#bug` `#puzzle` `#idea` `#chore` `#legal`
  - State: `#inbox-triage` `#this-week` `#in-progress` `#review-deploy` (no tag = backlog; completing the task = done)
  - Area: `#riftrecall` `#riftiq` `#riftnotes` `#tracker` `#data-pipeline` `#infra` `#community`
- Priority uses TickTick's native High/Med/Low field — no separate tag.
- Discord → TickTick stays **manual** until bug-report volume exceeds manual capacity; automation revisited then.
- **No credentials in task content** — see the security standing rule in Section 6.

---

## 9. Recent updates log

*Two audiences: customer-facing lines are copyable straight into app-store notes, in-app changelogs, or Discord announcements. Team-facing lines are internal context for future threads.*

**July 19 (midday — Claude Code/Cowork thread, continued)**
- Customer-facing: —
- Team-facing: Found and revoked a GitHub Personal Access Token pasted in plaintext in a TickTick task — Claude Code doesn't rely on it (uses `gh` OAuth instead), so nothing broke; confirmed via `gh auth status` post-revocation. Restructured TickTick: added a "New" intake bucket for Cowork/system-created tasks, renamed "Riftbound Gameplay Improvements" → "Riftbound Gameplay" (now personal-skill-focused, separate from app feature work). Fixed a `check-source-branch` failure on the doc's first-ever PR (wrong branch prefix, `docs/*` isn't in the allowed list for a PR into `integration`) by re-branching with an allowed prefix. Corrected the Vendetta card count from a stale "161 unique base cards" to the accurate 141-of-166, with the removed-card reasoning now documented in Section 2. Set up Claude Code Remote Control for phone monitoring during a walk; Claude Code correctly flagged one of its own commands as security-sensitive before running it, explained itself clearly when asked, and the safer alternative (scratchpad file instead of inline one-liner) was used. This doc forked twice in one morning (see fork notes at top) and is reconciled here for a second time, with a concrete process fix (pull from GitHub before big rewrites) now written into Sections 1a and 5.

**July 19 (morning)**
- Customer-facing: —
- Team-facing: Reconciled two independently-forked copies of this doc into one (see fork note at top). Confirmed Claude plan = Max. Vendetta card art pull in progress via Claude Code (toward full 166-card VEN set).

**July 18–19 (RiftRecall build-out, overnight)**
- Customer-facing: RiftRecall (formerly Card Recall) got a full pass — smarter, more varied questions, sessions now save your place if you leave and come back, and study sessions are capped at 20 cards with a short break between sets so review time is better spent. Home screen refreshed with a cleaner look and a "what's new" section.
- Team-facing: Card cleanup (14 reprint dupes, 6 rune dupes, 5 non-base tokens removed; dynamic 1v1-ban filter added, 10 cards currently banned-out). Session persistence (localStorage/SQLite + sessionStorage) and 20-card batch pacing with round-robin missed/new/review composition. Full question-quality overhaul: split cost modes, sane distractors, battlefield/equipment text handling, recency-weighted mode cycling, fill-in-the-blank mode, champion-epithet-restricted name quiz (189 authored synthetic epithets, pending review). New control-sheet pipeline (`build_master_sheet.py`/`apply_master_sheet.py`) matching Ashwin's exact sheet format. Home screen rebuilt with the `RIFT_BRAND` color convention and RiftIQ umbrella placeholder. Caught a wrong-base-branch PR cleanly via `check-source-branch` — nothing reached `main` (see Section 11).

**July 19**
- Customer-facing: —
- Team-facing: Feature formerly "Card Recall"/"Memory Game" is now named **RiftRecall**. TickTick `RiftAcademy` list tagged for type/state/area (columns unchanged at this point — see midday entry above for the later restructure). Verified all Vendetta cards have valid art directly against raw Riftcodex source files.

**July 17**
- Customer-facing: All Vendetta cards now show their real card art in RiftRecall — no longer placeholder-only.
- Team-facing: Riftcodex ingested Vendetta card images ahead of the July 31 release. New reusable script (`scripts/apply_vendetta_images.py`) backfills `imageUrl` on `cards.json` by matching Riftcodex, handling the signature-champion `-006` id quirk. Deployed via `feature/vendetta-images` → `integration` → promoted as usual.

**July 16**
- Customer-facing: Added Vendetta card data ahead of the set's July 31 release (art followed July 17). Removed a duplicate "Ultimate" Baron Nashor. Corrected card types/subtypes — Champions and Equipment now filter correctly and independently from Units and Gear. Added a Speed filter (Action/Reaction). Sets filter now breaks out Origins & Proving Grounds, Spiritforged, Unleashed, Vendetta individually. Quiz screen layout improved.
- Team-facing: GitHub repo live with branch protection + required CI checks. Vercel connected: `main` = production, `staging` = public preview. `merge_sheet.py` now supports a permanent blacklist (used for Baron Nashor removal). Sync-down automation + first Jest suite written, not yet merged. Resolved a git-identity issue silently blocking Vercel deploys.

**July 14**
- Customer-facing: Match Tracker shipped — full live match dashboard with point/hand/deck/rune tracking, undo, CSV export. In-app feedback form added. New "Deck" filter for quiz practice.
- Team-facing: None beyond the above — entirely customer-facing feature work.

---

## 10. Open decisions / questions

1. Stable price-history storage + non-destructive ROI import (avoid clearing app memory each import).
2. Discord intake architecture beyond the TickTick tagging design (Section 8) — automation stays manual until volume demands it.
3. Game-log / match-state snapshot schema — needs Opus iteration in a dedicated RiftIQ thread (part of today's Opus strategy track, Section 0).
4. New-user ingestion survey: exact questions/segments not yet decided.
5. Donate link platform + Riot LJJ policy check — unresolved, not urgent.
6. Keyword badge styling — undecided, low priority.
7. RiftIQ real module design — what actually goes in it beyond the Match Analyzer/Daily Puzzle placeholders.
8. Whether the Vendetta Prep 3-step guided tour generalizes into the permanent new-user onboarding flow (evaluate after launch week).
9. Stale GitHub branch cleanup — safe process documented (Section 3, TickTick "New" bucket), not yet executed.

---

## 11. Troubleshooting & manual state reversions

> Operational runbook for recovering from bad merges, mis-targeted PRs, and failed promotions. `main` auto-deploys to production via Vercel, so **anything that lands on `main` is live** — treat every `main` incident as a production incident. Reversions here favor *additive* fixes (revert commits, Vercel rollback) over history rewrites, because `main`/`staging` are protected and Vercel-tracked.

### 11.0 First: is it actually merged?
The `check-source-branch` guard (`enforce-branch-flow.yml`) is a **required** check on all four core branches. A PR whose source→base pair violates `feature|fix|hotfix → integration → beta → staging → main` shows a **failed check and is not mergeable**. A red ✗ on "Enforce branch flow" for a wrong-base PR means the guard **worked** — nothing merged.
- **Wrong base branch on an open (unmerged) PR:** no reversion needed. Edit the PR's base branch to the correct target, or close it and open a new one.
- **Wrong branch-name prefix on an open (unmerged) PR** (e.g. `docs/*` isn't allowed into `integration`): git can't rename a branch under an open PR. Push a new branch with an allowed prefix (`feature/*`/`fix/*`/`hotfix/*`) from the same commit, open a fresh PR referencing the old one, close the old PR without merging. Don't delete the old branch — just leave it closed.
- Confirm `main` is untouched:
```
git fetch origin
git log --oneline -5 origin/main
```

### 11.1 Fastest production recovery (decouple prod from git)
If something bad is *live* and you need it gone NOW, fix production first, git second:
- Vercel dashboard → project → Deployments → find the last known-good **Production** deployment → ⋯ → **Promote to Production** (Instant Rollback).
- This re-serves the previous good build immediately without touching git, buying time to fix `main` calmly.
- Then do 11.2 so the next `main` deploy is also correct — otherwise the next push to `main` re-deploys the bad state.

### 11.2 Revert an accidental merge into `main`
Use a **revert commit** (additive, safe). Never `git reset --hard` + force-push on `main`: it is protected and Vercel-tracked, and rewriting shared history is dangerous and blocked.

Find the bad merge commit:
```
git fetch origin
git checkout main
git pull origin main
git log --first-parent --oneline -5 origin/main
```
Copy the bad **merge commit** SHA from that log (or from the merged PR page). Create the revert on a hotfix branch:
```
git checkout -b hotfix/revert-bad-merge
git revert -m 1 <bad_merge_commit_sha>
git push -u origin hotfix/revert-bad-merge
```
`-m 1` keeps `main`'s prior state (parent 1) and undoes the changes the merged branch introduced (parent 2).

Open a PR `hotfix/revert-bad-merge` → `main`. The `check-source-branch` guard **will fail** (source isn't `staging`) — expected. For a genuine emergency, merge past it one of two ways:
- **Admin override (preferred):** in the PR merge box, use "Merge without waiting for requirements to be met" (visible to you as repo owner, unless "Include administrators" is enabled on the rule).
- **Temporary protection toggle (if override isn't offered):** Settings → Branches → `main` rule → temporarily uncheck the required `check-source-branch` (or "Require status checks to pass") → merge → **immediately re-enable it** (see 11.6).

Vercel then auto-redeploys `main` to the corrected state.

### 11.3 Un-promote a failed hotfix from `main`
Same mechanism as 11.2:
- Landed as a **merge commit** → `git revert -m 1 <merge_sha>`.
- Landed as one or more **direct commits** → `git revert <commit_sha>` for each (newest first), or a range:
```
git revert <oldest_sha>^..<newest_sha>
```
Push on a `hotfix/…` branch, PR into `main`, admin-override merge, let Vercel redeploy. Run 11.1 first if production must be clean immediately.

### 11.4 The clean (non-emergency) path
If it's not on fire, revert through the normal pipeline instead of admin-overriding:
1. Branch off `staging`, make the revert commit there (`git revert -m 1 <sha>`), PR into `staging`.
2. Validate on `riftacademy-staging.vercel.app`.
3. Promote `staging` → `main` via the normal PR (passes `check-source-branch`).

This keeps the guard intact and gives the fix a staging soak.

### 11.5 Gotcha: re-merging after a revert
Reverting a merge makes git treat those changes as "already handled." If you later *do* want that branch's work in `main`, you cannot just re-merge it — first **revert the revert** on the source branch (`git revert <revert_commit_sha>`), then bring it back through the pipeline. Relevant only when the reverted work was wanted-but-mistimed, not for a genuinely bad change.

### 11.6 Diagnosis discipline (reinforces Section 6)
- Diagnose real state with `git fetch origin` then `git diff origin/main origin/staging` — **not** the GitHub UI.
- Never use GitHub's "Delete branch" button on core branches (has nuked them before).
- After any admin-override merge or temporary protection toggle, confirm branch protection + both required checks (`typecheck`, `check-source-branch`) are re-enabled on all four core branches (`integration`, `beta`, `staging`, `main`).
