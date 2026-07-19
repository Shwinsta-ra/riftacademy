# RiftAcademy — Master Project Doc

**Owner:** Ashwin Sathe (sole dev, Sathe Consulting LLC) · **Repo:** `github.com/shwinsta-ra/riftacademy` (private, GitHub Pro)
**Hard deadline:** **July 31, 2026** (Vendetta set release) · **Launch posture:** web-only, free, LJJ-compliant
**Last updated:** July 19, 2026
**Status:** This is now the **single** canonical project doc. `RiftAcademy_Project_Management.docx` has been merged into this file and should be removed from Project Knowledge — its content lives here now (Sections 4–8).

> **What this doc is.** The one cross-thread source of truth for RiftAcademy, kept in **Project Knowledge** so every thread (chat, Cowork, Claude Code) can read and update it. When a thread changes something structural — ships a feature, changes a convention, makes a decision — it updates this doc and re-uploads it. That upload is the "commit" to shared context. Do **not** create a second project-level doc; append to this one.

---

## 0. Open this section first — what to do right now

**In progress / right now:**
- RiftRecall (renamed from "Card Recall") cleanup + polish pass, targeting shareable-to-Discord state by Sun July 19 (Mon–Tue acceptable) ahead of Friday's pre-rifts. Being handled in a dedicated RiftRecall thread.
- RiftNotes rework (simpler, fast-game-usable) — separate thread, in parallel today.
- Setting up Claude Code + Claude Cowork for this project (this thread).

**Waiting / not yet done:**
- Sync-down automation (`sync-down.yml`) and the Jest test suite are both fully written but deliberately unmerged — revisit once feature work slows down.
- Game-log / match-state snapshot schema (feeds both RiftIQ puzzles and RiftNotes) — needs dedicated iteration with Opus in a separate RiftIQ thread. **Reminder flagged for later today**, once RiftRecall is in good shape.

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

---

## 2. Current state (snapshot)

### Infrastructure
- Branch pipeline: `main` (prod, `riftacademy-tau.vercel.app`) → `staging` (public preview, `riftacademy-staging.vercel.app`, also hotfix validation) → `beta` (premium testers, no domain yet) → `integration` (target for `feature/*`, `fix/*`, `hotfix/*`).
- All four core branches: branch protection + 2 required checks — `typecheck` (`ci.yml`) and `check-source-branch` (`enforce-branch-flow.yml`). Requires GitHub Pro (private repo).
- Vercel via GitHub integration (push → auto preview deploy). Hobby plan = 1 concurrent build; a full promotion chain takes 10–20 min, that's normal.
- Mac git identity (global): `shwinsta-ra` / `ashwin.sathe86@gmail.com` — required, or Vercel blocks the deploy with a "commit author email is not valid" error. npm global prefix `~/.npm-global`.

### Card database
- Master Card Inventory: 929+ cards across OGN, OGS, SFD, UNL, VEN.
- Vendetta ingestion complete: 327 raw rows → 161 unique base cards (196 unique `riftbound_id`s counting variants).
- **Verified July 19:** all Vendetta cards in the current Riftcodex export have valid `image_url` values (checked directly against raw source — zero null/empty). The earlier "art-less new VEN cards excluded from quiz pool" note describes a now-stale pre-backfill state; if the live app still shows gaps, it's a merge-step or `new`-flag issue, not missing source art.
- 8 VEN champions (Vi, Jinx, Jayce, Viktor, Rengar, Khazix, Diana, Leona) kept with provisional overnumbered codes until Riftcodex ingests real slots.
- Baron Nashor (Ultimate) permanently blacklisted (`BLACKLISTED_IDS`) — `merge_sheet.py` won't let it silently return on re-run.
- Champion/Equipment stored as `Unit`/`Gear` + `subtype`; `Champion`/`Equipment` no longer valid `type` values.
- Set filters grouped: Origins & Proving Grounds / Spiritforged / Unleashed / Vendetta. Speed filter (Action/Reaction) added.
- Only the 4 old Unleashed tokens (Baron Pit, Bird, Brush, Reflection) remain without art — unrelated, unchanged, low priority.

### Shipped app features
- **Match Tracker (core):** full live match dashboard — points/hand/deck/rune tracking, undo, CSV export, Conquer/Hold, Hidden-play mechanic, 20 real Hartford decklists.
- **Feedback widget:** draggable floating bubble, category dropdown + free text + screenshot capture/annotation, Discord webhook delivery, offline queue.
- **Opponent Deck Knowledge Filter:** "Deck" filter on quiz Settings, using the 20-deck library, to drill "what could this specific opponent have had."
- **GitHub + Vercel pipeline:** live, branch-protected, connected (see Infrastructure above).
- **Card database refresh + Vendetta prep:** corrected names/text/speeds/domains, new `subtype` field, Vendetta cards added, Baron Nashor dup removed, Champion/Equipment filter semantics fixed, Speed filter added, quiz layout reordered (question now below card image, larger).
- **Vendetta card images:** backfilled via `apply_vendetta_images.py` (matches Riftcodex data to `cards.json`, handles the signature-champion `-006` id quirk; safe to re-run as more art is revealed pre-July 31).
- Unified `AppModal` across 6 modals; platform-aware CSV export (Web Share API mobile / clipboard desktop).

### Data pipeline
- Google Sheets master workbook = source of truth; Python (`merge_sheet.py`, `apply_*.py`) does CSV→JSON.
- `merge_sheet.py` applies canonical champion-name transforms + permanent blacklist on every run.
- Supabase migration deferred until Vendetta fully stabilizes (single combined ingestion then — card inventory, archetype index, decklists, app config/rules files).

---

## 3. Feature tracker & roadmap

*Single row per feature — update in place rather than re-describing elsewhere in this doc. Status legend: **Completed** — **Not started** (scheduled) — **Unresolved** (needs a decision before scheduling) — **Deferred** (deliberate) — **Blocked** — **Pending import** (waiting on external data).*

| Feature | Status | Description | Target | Dependencies / Blockers | Notes |
|---|---|---|---|---|---|
| **SHIPPED** |
| Match Tracker (core) | Completed | Full live match dashboard | Shipped | — | Largest feature to date |
| Feedback widget | Completed | In-app feedback form | Shipped | — | Built in a separate thread |
| Opponent Deck Knowledge Filter | Completed | "Deck" filter dimension for quiz drilling | Shipped July 16 | — | — |
| GitHub integration | Completed | Repo + Vercel deploy pipeline | Shipped July 16 | — | Branch model as above |
| Master Card Inventory + Vendetta prep | Completed | Full DB refresh, 161 VEN cards, Baron dup removed | Shipped to staging July 16 | — | — |
| Vendetta card images | Completed | All VEN cards have real art | Shipped July 17 | — | Verified again July 19 against raw source |
| **ACTIVE THIS WEEK** |
| RiftRecall cleanup/polish/rename | In progress | Vendetta Prep highlight + 3-step guided tour, zero-typing UI, question-quality pass, art/theme polish, session persistence | Target Sun Jul 19, Mon–Tue acceptable | Pre-rifts is Friday | Dedicated RiftRecall thread |
| RiftNotes rework | In progress | Simpler, fast-game-usable post-match coaching flow | This week | Shares schema work with RiftIQ (see below) | Separate thread, parallel today |
| TickTick integration | Completed (setup) | RiftAcademy list tagged (type/state/area); columns unchanged | Done July 19 | — | Task-level detail now lives in TickTick, not this doc |
| New User Ingestion Flow | Not started | Short onboarding survey, segments new users | Before next invite push | Needs decision on survey questions/segments | Time-sensitive once mass invites resume |
| New-user guided app intro | Not started | First-open walkthrough | Soon after ingestion flow | None | Sequence after ingestion flow |
| **THIS MONTH (BEFORE JULY 31)** |
| Deckbuilder v1 | Not started | Template deck, swap cards, save personal version | Hard deadline: before Jul 31 | None blocking | Don't let it crowd out ingestion flow |
| Game-log / match-state schema | Not started | Shared snapshot schema for RiftIQ puzzles + RiftNotes | ASAP, needs Opus iteration | Needs dedicated RiftIQ thread | Reminder flagged in Section 0 |
| **DEFERRED / UNSCHEDULED** |
| Sync-down automation + Jest test suite | Deferred | Both written, not merged | Paused | None blocking | Pick back up once feature velocity slows |
| Price-history storage + non-destructive ROI import | Deferred | Own stable price-history store | Wait for Supabase/Firebase | Supabase migration | Nice-to-have, unrelated to gameplay improvement |
| Keyword badge styling | Unresolved | Styled badges/icons for `[Deflect]`-style keywords | Undecided | Was contingent on Riot API, now deferred | — |
| Local daily reminder (OS push) | Deferred | Push notification for daily practice | After TestFlight | Needs on-device permission; not possible from Vercel web build | — |
| In-app daily/weekly quiz reminders | Deferred | In-app streak/reminder indicator | After TestFlight | Bundled with above | — |
| Riot API exploration | Deferred | Card data/images/tournament stats access | → August | IP/policy caution; attorney consult first | Precondition for monetization, not an obstacle to current dev |
| Structured Discord community | Deferred | Discussion, growth, PMF signal | After a build people return to consistently | Needs intake architecture (Section 8) first | — |
| Donate link | Unresolved | Community support toward hosting/dev costs, possibly tiered | TBD | Riot LJJ policy check first | Leaning Ko-fi/Patreon; Freshbooks available once launched; not urgent |
| Account management | Deferred | Persistent user identity on web app | Longer-term roadmap | None blocking, just unscheduled | Interim: session/local-storage persistence per feature |

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
- Double-check the base branch on GitHub's compare page before creating a PR — it defaults to `main`, which has caused accidental wrong-target PRs before.
- Vercel Hobby plan allows 1 concurrent build account-wide — a full promotion chain queues sequentially and can take 10–20 minutes to show up. That's normal.

**Git identity:** Mac's global git email must match a verified GitHub email (`ashwin.sathe86@gmail.com`), or Vercel blocks the deploy with "commit author email is not valid."

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
- Give the thread a one-line status note — use the latest dated entry from Section 7.
- This doc is in Project Knowledge, so you don't need to re-upload it — the new thread already has it.

---

## 6. Standing rules & conventions

**Workflow**
- Hotfixes go through **staging for validation first**, never straight to `main`.
- **Batch staging changes** before promoting to `main` (not continuous deploy).
- Deliverables as **complete ready-to-deploy zips**, not snippets. Deploy commands = **bare terminal commands, no inline `#` comments** (they break copy-paste into terminal). Any explanation goes as prose before/after the code block.
- Instructions must be **granular, exact commands, full paths with version numbers**.
- Git UI caution: GitHub's "Delete branch" has nuked core branches before. Diagnose real state with `git fetch origin` + `git diff origin/X origin/Y`, not the GitHub UI.

**Card data (Riftcodex ingestion)**
- Trailing-letter codes (`ven-088a-166`) = alt art → drop, use base numeric.
- Over-total numbers (`ven-177-166`, total=166) = overnumbered dup → drop for normal-range code, UNLESS no lower twin exists yet → keep temporarily, reconcile later.
- Champion apostrophes: **Kaisa, Khazix, Leblanc, Reksai — no apostrophes** (override source styling).
- Naming: always **"Name, Epithet"**, sentence case, minor words (of/the) lowercase.
- Card-text domain color-letter codes (in-text parens): Fury (R), Calm (G), Mind (B), Body (O), Chaos (P), Order (Y) — color-based, not first-letter. (Any)/rainbow spelled out.
- `TYPE_FILTER_PREDICATES`: Unit includes all champions; Champion = subtype Champion only. Gear includes all equipment; Equipment = subtype Equipment only.
- **Naming collision guard:** never name a feature RiftMind / RiftBody / RiftCalm / RiftFury / RiftChaos / RiftOrder — these collide with the six domain names.

**Design / theme**
- `REQUIRED` magenta `#EA6FD0` (from `src/lib/theme.ts`) = required fields only, never reused for anything else (including CTAs).
- Domain hex: Fury `#CC2929`, Calm `#3FA34D`, Mind `#2B73C2`, Body `#E57921`, Chaos `#8629B3`, Order `#EBB113`.
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
- **GitHub/PRs:** use **Claude Code** for branch/commit/PR/push. Keep branch protection + 2 checks. Claude opens PRs; human merges to `main`. Credentials stay manual.
- **Google Drive hygiene:** "update in place, don't duplicate" so Drive's native version history handles versions; scheduled Cowork task can enforce naming/folders; hard deletes stay manual. (Drive read tool ignores `gid` tabs → keep per-tab CSV exports.)
- **Discord:** no first-party connector. Fix is architectural — route intake (bugs/puzzles/feedback) into TickTick manually for now; Cowork prioritizes from there. Revisit automation once bug-report volume exceeds manual capacity.
- **Strategic training (RiftIQ):** strong Opus fit — matchup matrices, sequencing flowcharts, decision filters, archetype trees, every claim tied to JSON card truth + current meta.
- **Pro-footage analysis:** no direct video ingestion. Use transcripts, board-state screenshots, and the game-log schema (Section 0) as the durable path to the puzzle pipeline.
- **Claude plan:** Max — Cowork on web/mobile, computer-use preview, and phone-based Remote Control/Dispatch are all available.

---

## 8. Discord intake → TickTick design

- TickTick's `RiftAcademy` list keeps its existing **area-based columns** (Notes, Riftbound Gameplay Improvements, Feature Ideas, Marketing & Community, App Development) — unchanged, not workflow states.
- **Workflow state, type, and area are tags**, layered on top so a task can live in any column and still carry status:
  - Type: `#feature` `#bug` `#puzzle` `#idea` `#chore` `#legal`
  - State: `#inbox-triage` `#this-week` `#in-progress` `#review-deploy` (no tag = backlog; completing the task = done)
  - Area: `#riftrecall` `#riftiq` `#riftnotes` `#tracker` `#data-pipeline` `#infra` `#community`
- Priority uses TickTick's native High/Med/Low field — no separate tag.
- Discord → TickTick stays **manual** until bug-report volume exceeds manual capacity; automation revisited then.

---

## 9. Recent updates log

*Two audiences: customer-facing lines are copyable straight into app-store notes, in-app changelogs, or Discord announcements. Team-facing lines are internal context for future threads.*

**July 19**
- Customer-facing: —
- Team-facing: Feature formerly "Card Recall"/"Memory Game" is now named **RiftRecall**. Merged the two project-management docs (this file + the prior `.docx`) into one canonical doc — the `.docx` should be removed from Project Knowledge. TickTick `RiftAcademy` list tagged for type/state/area (columns unchanged). Verified all Vendetta cards have valid art directly against raw Riftcodex source files (zero null `image_url`) — any remaining app-side gap is a merge-step or `new`-flag issue, not missing source data.

**July 17**
- Customer-facing: All Vendetta cards now show their real card art in Card Recall — no longer placeholder-only.
- Team-facing: Riftcodex ingested Vendetta card images ahead of the July 31 release. New reusable script (`scripts/apply_vendetta_images.py`) backfills `imageUrl` on `cards.json` by matching Riftcodex, handling the signature-champion `-006` id quirk. Deployed via `feature/vendetta-images` → `integration` → promoted as usual.

**July 16**
- Customer-facing: Added Vendetta card data ahead of the set's July 31 release (art followed July 17). Removed a duplicate "Ultimate" Baron Nashor. Corrected card types/subtypes — Champions and Equipment now filter correctly and independently from Units and Gear. Added a Speed filter (Action/Reaction). Sets filter now breaks out Origins & Proving Grounds, Spiritforged, Unleashed, Vendetta individually. Quiz screen layout improved.
- Team-facing: GitHub repo live with branch protection + required CI checks. Vercel connected: `main` = production, `staging` = public preview. `merge_sheet.py` now supports a permanent blacklist (used for Baron Nashor removal). Sync-down automation + first Jest suite written, not yet merged. Resolved a git-identity issue silently blocking Vercel deploys.

**July 14**
- Customer-facing: Match Tracker shipped — full live match dashboard with point/hand/deck/rune tracking, undo, CSV export. In-app feedback form added. New "Deck" filter for quiz practice.
- Team-facing: None beyond the above — entirely customer-facing feature work.

---

## 10. Open decisions / questions

1. Game-log / match-state snapshot schema — needs Opus iteration in a dedicated RiftIQ thread (reminder flagged, Section 0).
2. New-user ingestion survey: exact questions/segments not yet decided.
3. Donate link platform + Riot LJJ policy check — unresolved, not urgent.
4. Keyword badge styling — undecided, low priority.
