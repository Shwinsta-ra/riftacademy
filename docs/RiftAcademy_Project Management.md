# RiftAcademy — Master Project Doc

**Owner:** Ashwin Sathe (sole dev, Sathe Consulting LLC) · **Repo:** `github.com/shwinsta-ra/riftacademy` (private, GitHub Pro)
**July 31, 2026 deadline:** passed. Vendetta shipped and the alpha is out; the July-31 freeze is lifted and beta is pushed 1 to 2 weeks (evidence: `2026-07-30-riftcore-match-schema` fragment, "Status update, IMPLEMENT NOW"). **Launch posture:** web-only, free, LJJ-compliant
**Last updated:** August 6, 2026 (backlog reconciliation). **This pass cleared a 12-day backlog, not a single day.** Eleven fragments dated July 25 through August 5 had accumulated in `docs/updates/pending/` because no reconciliation ran between July 28 and today; all eleven are folded in below and deleted per the fragment lifecycle. Every fragment's PR number was verified against the real merge history rather than taken from the fragment text.

Corrections this pass made to previously-stated fact, each because a fragment contradicted the doc:
1. **The winning-line taxonomy is gone**, not shipped. RiftCore v2 (PR #148) deleted it outright; Sections 2 and 3 described it as a completed feature. See Section 9, July 31.
2. **`staging` is not a public preview domain.** It sits behind Vercel SSO and 302s every path, measured 2026-08-05. Sections 2, 4 and 5 all claimed otherwise.
3. **The Supabase migration is no longer deferred.** Schema and card load shipped (PR #154); Section 2's data-pipeline line still said "deferred until Vendetta stabilizes."
4. **Section 10's game-log/match-state schema question is resolved**, not open. Ownership landed with RiftCore and the schema already existed in code (PR #134).

**Two PRs shipped with no fragment at all** and were reconstructed here from their merge commits: PR #145 (`feature/riftcore-capture-profile`) and PR #154 (`feature/supabase-schema`). Same failure mode as RiftCore M0 on July 20 and RiftRecall on July 19. See Section 9, August 5.

**Known style inconsistency, not resolved this pass:** Section 6 bans em dashes in project documents effective July 19, yet the existing body of this doc uses them throughout, including in entries written after that date. New text added by this reconciliation complies with the rule; legacy text was left alone rather than rewritten silently. Flagged for a decision, see Section 10.

**This doc is no longer edited directly by feature/fix PRs.** See Section 1a and `docs/updates/TEMPLATE.md`.
**Canonical file name:** `RiftAcademy_Project Management` — fixed name across GitHub, Project Knowledge, and Google Drive.
**Status:** This is the single canonical project doc. If you're holding any other copy — a download from earlier today, a different thread's local merge — discard it.

> **Three forks happened today before this system existed** (see prior git history / PR #44 if curious). The root cause each time: either a stale pasted copy, or multiple PRs editing this same file concurrently. Both are now structurally prevented: new threads read the doc from a freshly-generated zip (Section 5) instead of a pasted copy, and day-to-day updates go into per-thread fragment files (Section 1a) instead of direct edits to this file. This is the last manual full reconciliation this doc should need under normal conditions.

> **What this doc is.** The one cross-thread source of truth for RiftAcademy, kept in **Project Knowledge** so every thread (chat, Cowork, Claude Code) can read it. Real edits happen via the fragment system (Section 1a) and land here only at end-of-day reconciliation.

---

## 0. Open this section first — what to do right now

**Refreshed 2026-08-06 from the 11-fragment backlog.** Items below are sourced from fragment evidence unless marked otherwise. Anything carried forward without new evidence is labelled as such rather than restated as current fact.

**Needs Ashwin, one-time, dashboard only (blocking real data):** Vercel Web Analytics is coded and merged (PR #140) but still switched off. There is no API or CLI to flip it; it has to be done in the Vercel dashboard, riftacademy project, Analytics tab, Enable. Until then the injected script no-ops in production and no traffic data is collected at all.

**Riot domain verification can only be confirmed on `main`.** `public/riot.txt` is merged (PR #158) but the token only takes effect once it promotes through `integration → beta → staging → main`. Preview and staging both sit behind Vercel SSO and 302 every path, so a 302 there is deployment protection, not a broken file. Post-deploy check is in Section 9's August 5 entry.

**RiftCore Phase 4 may now be unblocked, needs confirming.** Phase 4 (re-authoring the 15 legacy card programs against the 32 Game Actions) was recorded as blocked on the Supabase card inventory. That inventory has since loaded (PR #154, plus the backfill in PR #162). Nobody has confirmed the blocker is actually cleared; this is an inference from two fragments, not a stated fact from either.

**The 14-question open adjudications register stays quarantined.** Every prior ruling on ordering-dependent Might puzzles, Tank-spill/over-assignment, instant-win-on-point, and winning lines must be re-derived against the v2 model before being trusted. Carried forward from PR #148, unchanged.

**RiftIQ Vendetta Bombs:** 3 of 4 puzzles (V1, V2, V4) ready; **V3 is blocked**, its intended answer targets a companion unit given 4 Might, above Lacerate's 3-or-less threshold, so the correct answer fails the same gate as the wrong ones. Needs the companion's Might corrected and a fresh gate audit. **No fragment has touched this since July 23**, so treat as unverified current state. The TickTick task backing it still shows the pre-correction 11-bomb list; update to 18 (Section 9) or point it at `docs/riftiq/RiftIQ_Vendetta_Bombs_Batch.md` §1.

**RiftIQ Batch 1** is at v4 (6 puzzles, one per domain, all rules-legal), awaiting Ashwin's review, which unblocks 3 open questions (Section 10). **No fragment since July 23**, same caveat. Note the "71% of the pool is authorable" figure predates the RiftCore v2 rebuild and was measured against the old model.

**RiftCoach:** Vendetta Pre-Rift v8 shipped as a single four-page printed reference, replacing both v7 and the separate observation instrument. Two items still open with Ashwin: the exact Repair Specialist gear threshold, and whether MUST-play cards get added to page 4's slack (that page runs about 72% full against 86 to 95% on the other three).

**Master Card Inventory:** Subtype is now closed (166/166 via the 2026-07-25 CSV, which also completed Speed and Keywords). **`Function` remains the gap at 904/928.** Rows for the Empower mechanic still have no tagged analog to fill from.

**Open with RiftCore:** the Signature count question. Two sources agree on 50 cards and disagree on exactly one, `Shadow` (UNL-194-219).

**RiftRecall:** clear outstanding Discord bug reports related to card questions. Carried forward from July 23, no fragment evidence either way.

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
- Branch pipeline: `main` (prod, `riftacademy-tau.vercel.app`) → `staging` (`riftacademy-staging.vercel.app`, hotfix validation) → `beta` (premium testers, no domain yet) → `integration` (target for `feature/*`, `fix/*`, `hotfix/*`).
- **`staging` is NOT publicly reachable** (measured 2026-08-05, PR #158). It sits behind Vercel SSO and 302s every path to `vercel.com/sso-api`, as does every PR preview deploy. `main` is the only publicly reachable host. Two consequences: a 302 on preview or staging is deployment protection rather than a broken file, and **any unauthenticated third-party crawler (Riot's domain verification, and anything similar) can only ever see production**. Do not hand a staging link to anyone outside the team expecting it to load.
- All four core branches: branch protection + 2 required checks — `typecheck` (`ci.yml`) and `check-source-branch` (`enforce-branch-flow.yml`).
- Vercel via GitHub integration (push → auto preview deploy). Hobby plan = 1 concurrent build; a full promotion chain takes 10–20 min.
- Mac git identity (global): `shwinsta-ra` / `ashwin.sathe86@gmail.com` — required, or Vercel blocks the deploy.
- **GitHub CLI (`gh`) authenticated via OAuth device flow**, scopes `repo`/`workflow`/`read:org`/`gist` — this is what Claude Code uses for all push/PR operations. Not a Personal Access Token (a PAT was found and revoked July 19 — see Section 9 — it was never load-bearing).
- **Claude plan: Max** — Cowork on web/mobile, computer-use preview, and phone-based Remote Control/Dispatch all available.

### Card database
- **Counts now match, by design:** Master Card Inventory (spreadsheet, source of truth) and `cards.json` (app runtime data) both = **928 cards** across all sets, as of the July 27 re-merge (PR #127). Previously these diverged (918 vs 928) because 1v1-banned cards were deleted from `cards.json`; that's no longer how bans are enforced (see below and Section 6). Both confirm **166/166 Vendetta base cards** present (up from 141/166) — all numbered 1–166, no dups, no over-total codes.
- **1v1-banned cards are no longer deleted from `cards.json`** (July 27, PR #127) — they're flagged `banned1v1: true` (new field on `Card` in `types.ts`) and excluded from quiz eligibility by `getFilteredCards` in `quiz.ts`, the same pattern as the existing `imageUrl === null`/`isToken` exclusions. Fixes a prior bug where a card both brand-new and 1v1-banned in the same sheet run (Draven, Vanquisher) was inserted then deleted in the same script run, so its verified errata text could never render anywhere.
- **Recruit tokens now display as "Recruit, DE/NX/ZN"** (July 27) — `normalize_name()` in `scripts/merge_sheet.py` now converts a sheet name's trailing `"(X)"` into `", X"` (matching the "Name, Epithet" convention) instead of stripping it; previously the mismatch guard silently skipped the entire row, not just the name.
- **Dual-domain parsing fixed** (July 27) — the sheet's `Domain(s)` column writes dual-domain cards comma-separated (`"Fury, Body"`); the generic `parse_list()` was splitting that into two array elements instead of one `/`-joined element, silently breaking domain-filter matching for all 100 dual-domain cards in the dataset (not just Vendetta). New `parse_domain()` joins with `/` as `cardMatchesDomainFilter` expects. Caught by `src/lib/__tests__/quiz.test.ts`'s domain-filter tests.
- **`ven-112-166` (Zed, Without a Sound) bracket-convention fix** (July 27) — Card Text `[Action] (1)(P):` corrected to `[Action (1)(P)]:` in the source CSV to match the rest of the sheet, pulled through the normal `merge_sheet.py` path. `src/lib/__tests__/attributeQuiz.test.ts` back to 971/971 passing.
- **`apply_master_sheet.py`'s `CATEGORY_MAP`** now accepts both singular `"fill in the blank"` and plural `"fill in the blanks"` sheet Category values (both appear in the live sheet). One new hand-authored fill-in-the-blank question added for Forgotten Relic.
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
- **Source authority is per-field, and it is not the same as merge direction** (PR #131, 2026-07-28). Getting these backwards is what let six energy errors and five Might errors reach a printed sheet at a live event (Covert Informant, Repair Specialist, Baccai Witherclaw, Mask Mother, Minah Swiftfoot, Aurok General). All since corrected by Ashwin; zero diffs across all 166 Vendetta rows as of 2026-07-30. The rule now lives in Section 6, and the canonical statement is `docs/riftcoach/build_guide.py`'s own data-authority docstring.
- **Supabase is loaded, no longer deferred** (PR #154, plus PR #162). Nine migrations at `supabase/migrations/`, covering reference, cards, legality, application and analysis schemas, then the Master Inventory backfill. The CSV is authoritative for card data there (7/7 post-errata markers against Riftcodex's 0/7, since every Riftcodex snapshot predates the 2026-07-23 errata); Riftcodex stays authoritative for `card_printings`, which the CSV does not cover. Post-load checks live in `supabase/seed/postload_verification.sql`.
- **Tokens are physical placeholders with no gameplay function** (Ashwin's call, 2026-08-05). They are excluded from card-data enrichment and no source is expected to cover them. Retained in `cards`, flagged by `is_token` (CR 185.1, intrinsic and immutable), never deleted. `rules_text`/`power_cost`/`might_bonus` are deliberately absent, and **token rows must not count as failures in coverage or completeness checks** — any "every card has rules text" gate needs `where not is_token` or it stays permanently red. Flagged rather than removed for the same reason 1v1 bans are: deleting would make absence indistinguishable from a coverage gap. Five Riftcodex records carry `supertype = 'Token'`, plus `sfd-t03` (`Gold // Buff`). RuneHoard likewise does not track basic runes or tokens, roughly 10 of each per booster box, also deliberate.

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
- ~~**Winning-line taxonomy** (July 22)~~ — **SUPERSEDED AND DELETED by the RiftCore v2 rebuild** (July 31, PR #148). The 6-value `WinningLine` taxonomy, `PointSource`, `canScoreWinningPoint` and `pointsAtTurnStart` are all gone from the codebase; the two "known gaps" this bullet used to carry forward are moot. Under the CR, restrictions gate **Conquer only** (Hold is unrestricted, 471.1.a.1), keyed on the player's *current* total, with the condition "Scored every Battlefield this turn," and failing it **draws a card** (471.1.b.1). The win check happens at Cleanup with strict majority (472), ties do not win, and it is not instantaneous. Kept here rather than deleted because two prior entries in Section 9 (July 21's false "already merged" claim and July 22's correction of it) both reference this work, and the evidence trail is worth preserving. See the July 31 entry.
- **RiftCore v2 — full rules-model rebuild** (July 31, PR #148), rebuilt from scratch against Core Rules RUP4 and Tournament Rules RUP4 (2026-07-16). Nine kernel modules (`layers`, `turn`, `chain`, `abilities`, `actions`, `combat`, `scoring`, `format`, `predicates`, plus a rebuilt `schema.ts` and slimmed `rulesKernel.ts`), all 9 design docs at `docs/design/riftcore-v2/`, and all 4 rules sources at `docs/rules/` so every CR citation in code resolves to a file in the repo. `tsc --noEmit` green, 1138 tests passing at the time of that PR. **Nothing was persisted at the old model, so every breaking change was free then and would have been expensive later.** Structural corrections that matter to other modules: layers replace the might-chain (CR 476, with per-object snapshotting rather than per-effect floors); damage assignment is a three-tier constraint system rather than two-tier spill, and `legalDamageAssignments()` returns the legal *set*, not one greedy answer; Units, Gear and Adds resolve immediately on finalization (337.2) and are therefore **never counterable**; per-format legality replaces the single `banned1v1` boolean inside the kernel, since the 2v2 ban list (Master Yi is 1v1-legal, 2v2-banned) was structurally unrepresentable before. Note this last point applies to `src/lib/core/` only: `cards.json` still carries a `banned1v1` field on all 928 cards and the app still reads it.
- **RiftCore rules-clarification pass** (August 1, PR #151) — name-based identity. `nameIs` compared `GameObject.cardId` against a name, but ids are set-prefixed (`ogn-177-298` vs `ogs-019-024`), so two printings of one card have different ids. Four CR rules are keyed on name and were all wrong under id comparison: the 3-per-name copy limit (103.2.b), name-based Chosen Champion status (103.2.a.3), `Unique` (825), and naming a card (760 to 763). `GameObject` gains `name`, `PlayerState.chosenChampionCardId` becomes `chosenChampionName`. **The reprint case is not live in our data**: 928 cards carry 928 distinct names, zero same-name/different-id pairs, so no shipping deck was mis-validated. Nobody should cite this PR as fixing a live data bug. Same PR added the mechanics-layer test suite (256 to 338 passing) and Model Corrections 001, which found four genuine Core faults; suite finished at 1293 passing with **no skipped tests in the repo**.
- **Feedback widget silent-failure fix** (July 30, PR #135) — submitting the in-app feedback form with "What happened?" blank reported "Report sent" while nothing reached Discord. `e2b7134` had made the field optional client-side but left the `< 3` char rejection server-side, so every tags-only submission got a 400, and `transport.ts` treated any non-429 4xx as "handled, don't retry," returning the same boolean as a real success. **This was live on `main`.** Fixed in two parts: the stale length check is gone from `api/feedback.ts` (empty descriptions render as `_no description given_`), and `transport.ts`/`queue.ts` now return three-state results rather than collapsing "permanently rejected" into "sent." New `src/feedback/__tests__/queue.test.ts` covers 200/400/429/500 and flush-drops-rejected.
- **Vercel Web Analytics** (July 30, PR #140) — `@vercel/analytics` mounted at the root of `App.tsx`, gated on `Platform.OS === "web"` since native Expo builds ship alongside the web export Vercel deploys. **Not yet collecting data**: enabling it is dashboard-only, see Section 0. `@vercel/speed-insights` was explicitly out of scope.
- **Riot domain-verification token** (August 5, PR #158) — `public/riot.txt`, the repo's **first `public/` directory**. Expo SDK 54's `expo export --platform web` copies `public/` verbatim to the root of `dist/`; verified byte-identical after a local export. Note `expo export`'s "Files (N)" summary does not list `public/` passthrough assets, so read the actual `dist/` listing rather than trusting the summary.

### Data pipeline
- Google Sheets master workbook = source of truth; `merge_sheet.py`/`apply_*.py`/`build_master_sheet.py`/`apply_master_sheet.py` do CSV/XLSX↔JSON.
- `merge_sheet.py` applies canonical champion-name transforms, dynamic ban filter, and permanent blacklist on every run.
- **`merge_sheet.py` now runs the energy/might/speed/keyword divergence check inline** (July 30, PR #144), per-card, immediately before it overwrites `cards.json` with the incoming CSV row, printing a `MISMATCH` line for every field about to change. This runs on every real merge for every set, replacing the ad hoc VEN-only check `build_guide.py` did alone. `scripts/validate_cards.py` (added July 28, PR #131) still exists for a read-only check without running a merge. **If you are writing new tooling that reads both the CSV and `cards.json`, do not hand-roll this check.** Neither touches Subtype/Function/Ability Target/Used In, which stay CSV-authoritative and out of scope.
- **Substring card-name matching is banned, and was swept repo-wide** (July 30, PR #144). A full sweep for `SEARCH(`, `.contains(`, `.includes(`, `LIKE '%...%'` and unanchored regex against card-name fields found two live instances of the bug class that caused the "Poro" turn-1 undercount: `find()` in both `docs/riftcoach/build_guide.py` and `docs/riftcoach/pool_workbook.py` carried a `startswith()` fallback resolving every tier-list, pool and deck lookup. Current data happens not to trigger it (no name is a prefix of another) but the latent risk was identical. Both are now exact-name-only; `build_guide.py` keeps a whole-word token-overlap fallback requiring 2+ shared words, which cannot reproduce a Poro-style collision. Everywhere else checked (`src/lib/deckPool.ts`, `merge_sheet.py`'s edit-distance matcher, UI search filters) already matched exactly.
- **Supabase is live** (August 5, PR #154, backfilled by PR #162). Previously recorded here as "deferred until Vendetta fully stabilizes"; that is no longer true. See the Card database block above.

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
| RiftCore package (M0) v1 | **Superseded** | Schema, forward rules kernel, effects, cards adapter (`src/lib/core/`) | Shipped Jul 20, **rebuilt Jul 31** | — | PR #69; added vitest as the project's first test runner. Replaced wholesale by the v2 rebuild below, see docs/design/riftbound-module-architecture.md |
| RiftCore v2 rules-model rebuild (Phase 3) | Completed | Nine kernel modules rebuilt against Core + Tournament Rules RUP4; layers replace the might-chain; three-tier damage assignment; per-format legality | Shipped Jul 31 | None | PR #148. `schema.ts` is a full replacement, not a patch. `CURRENT_SCHEMA_VERSION` = 2 with deliberately no v1→v2 migration (`migrate()` throws). 9 design docs at docs/design/riftcore-v2/, 4 rules sources at docs/rules/ |
| RiftCore Phase 4 (card programs) | Blocked → **likely unblocked, unconfirmed** | Re-authors the 15 legacy card programs against the 32 Game Actions and the ability taxonomy | Next | Was blocked on the Supabase card inventory, which has now loaded (PR #154/#162) | `CARD_EFFECT_REGISTRY` is intentionally empty until this lands. Entry shape is classified `Ability` objects, NOT a flat step list. Nobody has confirmed the blocker cleared, see Section 0 |
| RiftCore rules clarification — name-based identity | Completed | `nameIs` and Chosen Champion now key on card name, not set-prefixed `cardId` | Shipped Aug 1 | None | PR #151. First PR of the "Rules Clarification" class. Reprint case is NOT live in our data (928 cards, 928 distinct names) — do not cite as a live data fix |
| RiftCore mechanics test suite + Model Corrections 001 | Completed | Layers, damage assignment, Cleanup, scoring/win, §5 subsystems | Shipped Aug 1 | None | Same PR #151. Four real defects found via CR worked examples; five escalations adjudicated as canonical-model errors, all implemented. 1293 passing, **zero skipped tests in the repo** |
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
| Winning-line taxonomy | **Superseded** | 6-value `WinningLine`/`PointSource` in `schema.ts`/`rulesKernel.ts` | Shipped Jul 22, **deleted Jul 31** | — | Removed wholesale by the RiftCore v2 rebuild (PR #148); the CR gates Conquer only, Hold is unrestricted. Row kept because two Section 9 entries reference it. Its two "known gaps" are moot |
| RiftIQ Home entry narrowed for soft alpha | Completed | "New Match" button removed, subheadline now "Game puzzles & tutorials", version label "Alpha v1.0" | Shipped Jul 22 | None | `MatchList`/`MatchDetail` screens/routes untouched, just unreachable from Home |
| Card data pipeline — 1v1-ban preservation, Recruit tokens, dual-domain parsing | Completed | `banned1v1` field replaces delete-on-ban; Recruit token renaming fixed; 100 dual-domain cards' filter matching fixed; `ven-112-166` bracket-notation fix | Shipped Jul 27 (PR #127) | — | `cards.json` now 928, matching the source inventory; see Section 2 & 6 |
| RiftCoach Vendetta Pre-Rift v8 | Completed | One four-page printed reference replacing both the v7 build guide and the separate observation instrument | Shipped Jul 25 | Two items open with Ashwin | Script-generated from `cards.json` + the 2026-07-25 inventory CSV, so regenerating after a data change is a re-run, not a re-type. Open: Repair Specialist gear threshold; MUST-play cards for page 4's slack. Hextech Formula and Fretful Feline remain untiered |
| Card-data authority rule + `validate_cards.py` | Completed | Per-field source-of-truth rule, plus a read-only CSV↔`cards.json` divergence checker | Shipped Jul 28 (PR #131) | None | Independently rediscovered twice (RiftLab Jul 26, RiftCoach Jul 28) before being written down. See Section 6 |
| Feedback widget — Discord silent-failure fix | Completed | Blank "What happened?" reported success while nothing reached Discord; was live on `main` | Shipped Jul 30 (PR #135) | None | Client/server validation drift plus a transport layer collapsing "rejected" into "sent". Now three-state; new `queue.test.ts` covers 200/400/429/500 |
| Substring card-name match sweep + merge-pipeline check | Completed | Repo-wide removal of `startswith()` name fallbacks; energy/might/speed/keyword check moved inline into `merge_sheet.py` | Shipped Jul 30 (PR #144) | None | Closes both follow-ups the Jul 28 data-authority work flagged but didn't fix |
| Vercel Web Analytics | Completed (code) / **Blocked (dashboard)** | Anonymous real-user page-view tracking on the production site | Shipped Jul 30 (PR #140) | **Ashwin must enable it in the Vercel dashboard** | No API or CLI exists to flip the setting. Until enabled the script no-ops and zero data is collected. See Section 0 |
| RiftCore capture profile | Completed | Capture-profile work referenced by the v2 rebuild's test disposition | Shipped ~Jul 30 (PR #145) | — | **Shipped with no fragment**; reconstructed at this reconciliation from the merge commit. Detail is thin here because no fragment recorded it |
| Supabase schema + card load (M9) | Completed | Reference/cards/legality/application/analysis schemas, card + printing load, post-load verification | Shipped Aug 5 (PR #154) | None | **Shipped with no fragment**; reconstructed from the merge commit. Supersedes "Supabase migration deferred" in Section 2 |
| Supabase Master Inventory backfill | **PR open** | Migrations 008/009: ban-list completeness, post-errata rules text, 40 rows missed by 008's own generator | PR #162, opened Aug 6 | Ashwin to review + merge | Recovers finished M9 work that was sitting untracked and uncommitted. Errata assertions go 0/7 → 7/7 |
| Riot domain-verification token | Completed (code) / **Unverifiable until `main`** | `public/riot.txt`, the repo's first `public/` directory | Shipped Aug 5 (PR #158) | Must reach `main` before Riot can see it | Preview and staging are behind Vercel SSO; Riot's crawler is unauthenticated so only production is reachable. See Section 0 |
| **ACTIVE THIS WEEK** |
| RiftIQ Vendetta Bombs (themed puzzle set) | Blocked (partial) | 4-puzzle set on Vendetta's biggest units; V1/V2/V4 ready, V3's answer fails its own gate (companion Might too high) | This week | Companion unit Might needs correcting + fresh gate audit | Distinct from Batch 1/Batch 2; content doc `docs/riftiq/RiftIQ_Vendetta_Bombs_Batch.md` |
| Power-cost mask visual tuning | Unresolved | Mask is now a fixed-size rect (no longer scaled to a card's true `power` value, closing the same leak class as the might/cost fix) | Structurally done Jul 22 | Needs a real visual pass | Not visually verified against real card art — the session that built this had its CDN access blocked; distinct from the Battlefield mask *positioning* work above, which IS resolved — don't conflate the two |
| Mystic Vortex / Piltovan Forge rendering bug | Unresolved | Reported as "renders rotated 180° / renders twice"; a 10-card spot-check (including both named cards) found clean rendering, no rotation/duplication | Investigated Jul 22 | Needs a live re-check | Inconclusive positive evidence only, not a confirmed fix — a bug not reproduced once isn't necessarily gone; distinct from the Battlefield mask *positioning* work above, which IS resolved — don't conflate the two |
| RiftIQ Batch 1 v4 | Awaiting review | 6 combat puzzles, one per domain, all rules-legal | For app launch | Ashwin's review + 3 open questions (Section 10) | Confirmed NOT blocked on RiftCore - 71% of the 924-card pool is authorable now with single-step abilities |
| RiftIQ puzzle UI | In progress | Top-down board, code-driven | This week | Ashwin's own mockup | Working with Ashwin directly on visual direction |
| Vendetta full-set repull | Completed | Brought VEN from 141 to full 166 | Jul 21 | — | See Section 2; superseded the "ahead of next week's pre-rift" framing - it's this week's pre-rift now |
| New User Ingestion Flow | Not started | Onboarding survey, user segmentation | Before next invite push | Survey design | — |
| **THIS MONTH (BEFORE JULY 31)** |
| Deckbuilder v1 | Not started | Template deck, save personal version | Before Jul 31 | None | — |
| Game-log / match-state schema | **Completed** | Ownership resolved to RiftCore (M0); schema already existed in `src/lib/core/schema.ts` and is now documented, with §4 additive deltas implemented | Shipped Jul 30 | None | PR #134. Was "Not started" here while the code already existed and was simply undocumented — RiftNotes looked in `docs/` and reasonably concluded it didn't exist. Doc at docs/design/RiftCore_Match_Event_Schema.md. Resolves Section 10 item 1 |
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

- `main` = production — `riftacademy-tau.vercel.app` — **the only publicly reachable host**
- `staging` = hotfix validation — `riftacademy-staging.vercel.app` — **behind Vercel SSO, not publicly reachable** (measured 2026-08-05)
- `beta` = premium/beta-tester tier
- `integration` = first line of defense

All four branches require a PR + passing status checks (`typecheck`, `check-source-branch`).

**Deployment protection.** Every PR preview and `staging` itself 302 every path to `vercel.com/sso-api`. Anything that has to be checked by an unauthenticated outside party (a domain-verification crawler, a link handed to someone off the team) can only be confirmed on `main`. A 302 on preview or staging is protection working as configured, not a broken deploy.

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
- **Static files served verbatim at the web root go in `public/`** at the project root. Not `dist/` (gitignored, rebuilt every deploy) and not `src/assets/`. Covers domain-verification tokens, `robots.txt`, `.well-known/*`. Expo's `expo export --platform web` copies `public/` verbatim to the root of `dist/`. **Corollary, before anyone adds SPA deep-link routing:** this app currently has no catch-all rewrite, which is exactly why `/riot.txt` resolves. If a future change adds one so deep links land on `index.html`, it must exclude `/riot.txt` and every other root static file ahead of the catch-all, or Riot's verification silently starts returning HTML and fails.
- **A "Rules Clarification" PR uses a `fix/rules-clarification-<topic>` branch with the class in the PR *title*, never the branch prefix.** `enforce-branch-flow.yml:17` allows only `^(feature/.*|fix/.*|hotfix/.*)$` into `integration`, and `ci.yml:7` only runs `typecheck` on those three, so a `rules-clarification/*` branch would fail `check-source-branch` *and* never typecheck. Do not add the prefix to the workflow files.
- **Printed-reference style is the house standard** for anything Ashwin prints, fills in by hand, or reads at a table under a clock. Adopted 2026-07-25. Nine rules, held in full in `CLAUDE.md`; the reference implementation is `docs/riftcoach/build_guide.py`'s output. Load-bearing ones: generate from the source of truth rather than hand-typing; encode rather than describe; one job per page and fill it to at least ~85%; blank space never underscores; **verify by measuring, not by assuming** (page count, fill percentage and right-margin overflow are all checkable programmatically, and a card name silently overhung the page edge through two passes before measurement caught it).
- **UI screenshots and mockups are delivered as PNG, rendered at 2x** (e.g. width 430, zoom 2). Ashwin reviews on his phone and cannot open HTML, `.jsx`, or interactive previews there. An interactive version is a supplement, never a replacement.

**Terminology**
- **"60 Vendetta distractor conversions"** (referenced in Section 0): a one-time manual CSV conversion pass from July 20, 2026. Confirmed **not yet imported** into the live Card Questions Control Sheet as of July 22 — tracked as a TickTick task for Ashwin, not duplicated here. This supersedes an earlier flagged uncertainty about the phrase's meaning; treat as settled.

**Card data (Riftcodex ingestion)**
- Trailing-letter codes = alt art → drop, use base numeric.
- Over-total numbers = overnumbered dup → drop, unless no lower twin exists yet.
- Champion apostrophes: Kaisa, Khazix, Leblanc, Reksai — no apostrophes.
- Naming: "Name, Epithet", sentence case matching the physical card exactly.
- Domain color-letter codes (in-text parens): Fury (R), Calm (G), Mind (B), Body (O), Chaos (P), Order (Y).
- `TYPE_FILTER_PREDICATES`: Unit includes all champions; Champion = subtype Champion only. Same pattern for Gear/Equipment.
- Competitive bans are dynamic (`Bans` column, every merge run) — but as of July 27 (PR #127), 1v1-banned cards are no longer removed from `cards.json`; they're flagged `card.banned1v1` and excluded at quiz-eligibility time (`getFilteredCards` in `quiz.ts`), not at dataset-membership time (`merge_sheet.py`). 2v2-only bans still leave the card untouched. Any feature needing "is this card tournament-legal" should read `card.banned1v1` directly rather than assuming banned cards are absent from `cards.json`.
- Never name a feature RiftMind/RiftBody/RiftCalm/RiftFury/RiftChaos/RiftOrder — collides with domain names.
- **Source authority is per-field.** Adopted 2026-07-28 (PR #131) after six energy and five Might errors reached a printed sheet at a live event. Two questions that look like one and are not: which direction data *mechanically flows* on a merge, and which value to *trust* when the two sources disagree between merges.

  | Field | Authoritative source |
  |---|---|
  | energy, might, speed, keywords | `cards.json` |
  | Subtype, Function, Ability Target, Used In | the Master Inventory CSV |

  The CSV is Ashwin's live editing surface, so a typo there stands uncorrected until the next `merge_sheet.py` run; `cards.json` holds the last-reconciled-good state. **Never hand-edit `cards.json` to fix energy/might/speed/keywords — fix the CSV and re-run the merge.** If you cannot wait for a merge (generating a printed guide from a fresh CSV export, say), prefer `cards.json`'s value and flag the CSV as stale. Function, Ability Target and Used In are CSV-only and never appear in `cards.json` at all, so there is nothing to diff; do not build tooling that expects them there. Canonical statement: `docs/riftcoach/build_guide.py`'s data-authority docstring.
- **Never match card names by substring.** No `.contains`/`.includes`/`startswith`/`LIKE '%…%'`/unanchored regex against a card-name field. This bug class caused the "Poro" turn-1 undercount and was found twice more in a July 30 sweep. Exact match, or a whole-word token-overlap requiring 2+ shared words.
- **Tokens are excluded from card-data enrichment.** They have no gameplay function and no source is expected to cover them. Flag with `is_token`, never delete. Any completeness or coverage gate must say `where not is_token` or it stays permanently red forever. Same principle as bans: exclusion happens at the consuming layer, never by deleting from the data source, because deleting makes absence indistinguishable from a coverage gap.
- **Per-format legality, not a single ban boolean** (inside RiftCore only, as of PR #148). The 2v2 ban list was structurally unrepresentable under one `banned1v1` flag; Master Yi is 1v1-legal and 2v2-banned. `cards.json` still carries `banned1v1` and the app still reads it, so check which layer you are in before assuming either model.

**RiftCore rules model (v2 onward)**
- **The v2 naming charter is binding on all future RiftCore work.** CR nouns and verbs only. "Play" only in the CR's sense. The 32 Game Actions are the only effect verbs. Every exported symbol carries a `/** CR nnn */` citation. Where the CR distinguishes, the code distinguishes: `Move` ≠ `Recall`, `Banish` ⊄ `Kill`, `Attach` ⊄ `Move`, `Assign` ≠ `Deal`, `Hide` ⊄ `Play`. Note especially that **`Buff` means "place a Buff counter" (CR 426), not arbitrary Might arithmetic** — the legacy `BuffMight` name collided with a real mechanic, and arbitrary arithmetic is now a Layer-3 `ArithmeticOp`.
- **`raw` / `assigned` / `dealt` must be named verbatim in every module** — RiftNotes, RiftEngine, RiftLab, RiftCoach, RiftIQ, not just RiftCore. `raw` is what the assigner spends from their Might pool and is **conserved** (a doubler does not let them spend more). `assigned` is the CR's reported post-replacement figure, accounting only, and **may exceed the pool** (raw 3 becomes 6 assigned). `dealt` is what lands and marks damage, and **lethality is tested on `dealt`, never on `assigned`**. Never call the raw pool spend "assigned"; that overload is what made CR 465.2.c.5 ambiguous and cost a round trip to resolve.
- **Do not extend the schema locally when your module hits something it cannot represent.** File a schema-gap fragment per `docs/design/RiftCore_Schema_Change_Protocol.md`. Additive changes are free and lazy-migrate raw streams; derived outputs are re-derived, never migrated. The dropped reveal event was caught exactly this way. Route gaps there, do not route around them.
- **Predicates and selectors are serializable data, never closures.** Phase 4 loads ability definitions from Supabase and functions cannot round-trip through a database. The vocabulary is deliberately incomplete and additive; when you hit a card it cannot express, extend the union and file a gap fragment. There is deliberately **no escape hatch** — adding `{op:"custom"; fn:...}` would reintroduce exactly the problem this removes.
- **Rules corrections are called "Rules Clarification", never the acronym "CR".** In this repo `CR` always means Comprehensive Rules, and there are hundreds of such citations in `src/lib/core/**` and `docs/design/riftcore-v2/**`. Reusing it would make every one of them ambiguous.

**Puzzle authoring (RiftIQ)**
- Verify the `speed` field (`Normal`/`Action`/`Reaction`) of every card in a puzzle's intended solution against the phase the puzzle is set in — a `Normal`-speed card cannot answer an attack. Sits alongside the existing legend-passive audit (gate C) in the RiftIQ authoring checklist.

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

**August 6 (backlog reconciliation, 11 fragments, no code change)**
- Customer-facing: —
- Team-facing: Cleared a 12-day fragment backlog (July 25 through August 5) that had accumulated because no reconciliation ran after July 28. Every fragment's PR number was verified against the real merge history rather than trusted from the fragment text. Four previously-stated facts in this doc were contradicted by fragment evidence and corrected: the winning-line taxonomy was deleted rather than shipped, `staging` is not publicly reachable, the Supabase migration is no longer deferred, and Section 10's match-state schema question was already resolved. Two PRs were found to have shipped with **no fragment at all** (#145 capture profile, #154 Supabase schema) and were reconstructed from merge commits; their entries here are correspondingly thin, which is the cost of the gap. Separately, recovered finished M9 work (migrations 008/009, the errata assertions, and the tokens fragment) that was sitting untracked and uncommitted in the working tree, and opened PR #162 for it.

**August 5 (Supabase Master Inventory backfill + tokens decision, PR #162 open)**
- Customer-facing: —
- Team-facing: Migration 008 makes the Master Card Inventory CSV authoritative for card data in Supabase, correcting three defect classes in the original Riftcodex load. **The `card_bans` seed captured only the July 2026 ban announcement and missed the March 2026 list entirely, understating bans by 7 of 11**; Riftbound's first bans were effective 2026-03-31. Every Riftcodex snapshot predates the 2026-07-23 errata, so `rules_text` was pre-errata across the board (0/7 on errata markers). `ven-194-166` was an overnumbered printing of Jayce that had collapsed into its own `cards` row, now repointed and merged. Migration 009 repairs a defect in 008's own generator: it reconstructed canonical `card_code` without the base-before-variant tiebreak the seed loader uses, so 40 UPDATEs targeted alt-art printing codes, **matched zero rows, and reported no error**, because a WHERE clause matching nothing is not a SQL failure. Those cards kept pre-errata text and null `power_cost`. New standing rule from this: a backfill keyed on a derived identifier must assert its per-statement match count, not just totals. Also recorded Ashwin's decision that tokens are physical placeholders excluded from enrichment (Section 6).
- Team-facing (standing rule): **Any ruleset that accumulates over time must be assembled from the COMPLETE announcement history, never the latest announcement.**

**August 5 (Riot domain-verification token, PR #158)**
- Customer-facing: —
- Team-facing: Added `public/riot.txt` holding only Riot's verification token (37 bytes, UUID plus one newline, no BOM), creating the repo's first `public/` directory. Verified `dist/riot.txt` is byte-identical after a local export; note `expo export`'s "Files (N)" summary does not list `public/` passthrough assets, so read the actual `dist/` listing. No rewrite exclusion was needed: `vercel.json` has no rewrites/redirects/routes block, and production was probed directly to confirm no SPA catch-all (an unknown path returns a genuine `x-vercel-error: NOT_FOUND`, not a rewritten `index.html`). **Measured and worth knowing beyond this feature: neither PR previews nor `staging` are publicly reachable**, both 302 to Vercel SSO on every path, so this can only be verified once it reaches `main`. Post-deploy check: `curl -sD - https://riftacademy-tau.vercel.app/riot.txt`, expecting `200`, `content-type: text/plain`, and the bare token as the body.

**August 5 (Supabase schema + card load, PR #154) — reconstructed, no fragment**
- Customer-facing: —
- Team-facing: Shipped the Supabase schema and card/printing load across seven migrations (reference, cards, legality, application, analysis, plus a keywords PK and a printing-variant fix) with post-load checks at `supabase/seed/postload_verification.sql`. **This PR shipped without a fragment**, so this entry is reconstructed from the merge commit and the migration files rather than from an authored record; detail is thinner than it should be. Supersedes the long-standing "Supabase migration deferred until Vendetta fully stabilizes" line in Section 2.

**August 1 (RiftCore rules clarification, mechanics suite, Model Corrections 001, PR #151)**
- Customer-facing: Nothing user-visible. Rules-engine correctness only: RiftCore now applies name-based rules (the 3-copies limit, Chosen Champion status, Unique) to a card's name rather than its printing, so a reprint counts as the same card.
- Team-facing: `nameIs` compared `GameObject.cardId` against a name, but ids are set-prefixed and Standard lists OGS separately from OGN, so two printings of one card have different ids. TR 601.2.a exists precisely for this. Four CR rules keyed on name were all wrong under id comparison. **The reprint case is not live in our data**: 928 cards carry 928 distinct names, zero same-name/different-id pairs, so no shipping deck was mis-validated; nobody should cite this PR as fixing a live data bug. A scope note worth preserving: the handoff listed the `validateDeck` copy-limit and `Unique` grouping as work to do, but it was **already name-keyed** before this PR, verified by reading the pre-change file and by the two new tests passing against the old code. Those two are regression guards, not bug fixes. The three tests asserting genuinely new behaviour were confirmed non-vacuous by temporarily restoring the old code and watching only those fail. Same PR grew the mechanics suite from 256 to 338 passing and found **four real defects, each caught by a CR worked example rather than by our own reading**: Layer 3 sorted by timestamp alone and ignored the increase/decrease sublayer split (477.3.e/480.3); Cleanup's kill sweep measured lethal damage against `printedMight` rather than `currentMight` (142.4.b), which also put Cleanup out of step with combat so the same board could be lethal in one subsystem and not the other; and Rune Pools emptied only at turn end rather than at Main-Phase start (167). Six Tier A goldens were escalated rather than patched, then adjudicated as canonical-model errors (four confirmed Core faults) and implemented as Model Corrections 001. Final state: 1293 passing, **no skipped tests anywhere in the repo**. One earlier escalation (CR 477.3.c) was retracted as too broad and is now a passing golden.
- Team-facing (breaking): `GameObject.preventValue` is gone, use `damageReplacements`. `LayerEffect.snapshotted` is a map, not a number. Every `GameObject` literal now needs `name: string`. `PlayerState.chosenChampionCardId` is replaced by `chosenChampionName`. `DamageAssignment.assignments[].amount` is now `.raw`. `layers.ts`, `chain.ts` and `rulesKernel.ts` changed **behaviour, not just signatures**: if your branch depends on Might folding order, on when a unit dies in Cleanup, or on Rune Pool contents during the Main Phase, re-check it rather than assuming.

**July 31 (RiftCore v2 rules-model rebuild, Phase 3, PR #148)**
- Customer-facing: No visible change. App features that depended on the old rules model (puzzle validation paths) may be non-functional; that is expected and accepted, and they are re-pointed in Phase 4.
- Team-facing: Rebuilt RiftCore's rules model from scratch against Core Rules RUP4 and Tournament Rules RUP4. One consolidated PR, diff limited to `src/lib/core/**` and `docs/**`. **Nothing was persisted at the old model, so every breaking change was free then and would have been expensive later.** Landed all 9 design docs at `docs/design/riftcore-v2/` and all 4 rules sources at `docs/rules/`, so every CR citation in code resolves to a file in the repo. `tsc --noEmit` green, 1138 tests passing, `expo export --platform web` clean. **The winning-line taxonomy is gone**: restrictions gate Conquer only, Hold is unrestricted (471.1.a.1), keyed on the player's current total, and failing the condition draws a card (471.1.b.1). The win check is at Cleanup with strict majority (472); ties do not win and it is not instantaneous. Layers replace the might-chain (476) with per-object snapshotting (477.3.b) rather than per-effect floors, and Set-Might is Layer 1 applying before all arithmetic regardless of cast order. Damage assignment became a three-tier constraint system rather than two-tier spill. Units, Gear and Adds resolve immediately on finalization (337.2) and are therefore never counterable. Per-format legality replaced the single `banned1v1` boolean inside the kernel. Whole subsystems that did not previously exist: Priority/Focus, HOT FEPR, the 7-step Cleanup, the ability taxonomy, replacement effects, 26 of the 32 Game Actions, XP, the Rune Pool, Burn Out, Attachment/Inactive, Facedown Zones, Additional Turns.
- Team-facing (breaking): `schema.ts` is a full replacement, not a patch. `UnitState`, `ObjectInstance`, `MightMod`, `WinningLine`, `EffectPrimitive`, `TurnPhase`, `Speed`, `ZoneKind` and the old 2-value `Privacy` are **deleted**; the unified type is `GameObject`. `PlayerState` no longer holds zone arrays, since zone membership lives on each object's `zone` field and `GameState.objects` is the single keyed store. `CURRENT_SCHEMA_VERSION` is 2 with **deliberately no v1→v2 migration** — `migrate()` throws rather than fabricating a stream, which is safe only because nothing is persisted at v1. `GameEvent` variants are renamed to CR vocabulary. `CARD_EFFECT_REGISTRY` is intentionally empty until Phase 4. Test disposition: dropped the might-chain floor/order test, all six `canScoreWinningPoint` tests, the `pointsAtTurnStart` phaseChange test, both Tank-spill tests, and all of `effects.test.ts`, every one of which encoded behaviour the CR contradicts.
- Team-facing (quarantined): the 14-question open adjudications register. Every prior ruling on ordering-dependent Might puzzles, Tank-spill/over-assignment, instant-win-on-point, and winning lines must be re-derived against this model before being trusted again.

**July 30 (RiftCore match-event schema, ownership resolved, PR #134)**
- Customer-facing: —
- Team-facing: Answered the RiftNotes dependency flag from July 28. **The match-event schema is RiftCore's (M0)**; Core owns the representation, RiftEngine (M2) owns reconstruction over it. Do not re-route this to the Engine thread. The finding that matters: the schema RiftNotes needed **already existed** in `src/lib/core/schema.ts` and was simply undocumented, so RiftNotes looked in `docs/`, found nothing, and reasonably concluded it did not exist. Now documented at `docs/design/RiftCore_Match_Event_Schema.md` with a 6-item gap analysis, additive deltas, per-module usage verified against the real v0.4 cheat card, and a schema evolution and migration policy. Validation gate passed: a real transcribed game (Game A of the 2026-07-27 pilot) serialized end-to-end into `GameEvent[]` with **zero unrepresentable game facts**; the one bounded finding (lossy-capture annotations needing a home outside `GameEvent[]`) was resolved with a `CapturedMatch.captureMeta` sidecar. A regression was caught in passing: the original design named `revealCard` the belief-state primitive and it had been dropped from the built `GameEvent` union, now restored. Note this entry predates the v2 rebuild the following day, which renamed these variants to CR vocabulary.

**July 30 (feedback widget silent failure, PR #135)**
- Customer-facing: Fixed a bug where submitting the in-app feedback form with "What happened?" left blank silently failed. The app said "Report sent" but nothing reached the dev channel. Reports without that field now go through correctly.
- Team-facing: `e2b7134` made the field optional on the client but left the matching `< 3` character rejection in place server-side, so every tags-only submission got a 400. `transport.ts`'s `sendViaProxy` treated any non-429 4xx as "handled, don't retry", returning **the same boolean as an actual successful send**, which `queue.ts` read as "sent" and the UI reported as success. **This was live on `main`** (confirmed `e2b7134` is an ancestor of integration/beta/staging/main). Fixed in two parts: removed the stale length check from `api/feedback.ts` so empty descriptions render as `_no description given_`, and made `transport.ts`/`queue.ts` return three-state results rather than collapsing "permanently rejected" and "actually sent" into one `true`. The UI now shows an honest failure message for any future case where the server rejects a report on its merits. Added `src/feedback/__tests__/queue.test.ts` covering 200/400/429/500 and flush-drops-rejected, since nothing previously covered this path. Ruled out: the Discord webhook env var is present and valid, so the validation mismatch is the real root cause. **If you touch `FeedbackSheet.tsx`'s required-field gating again, check `api/feedback.ts` and `transport.ts`'s `buildDiscordPayload` for a matching change** — they are deliberately separate implementations and will not fail loudly if they drift.

**July 30 (substring name-match sweep + merge-pipeline check, PR #144)**
- Customer-facing: —
- Team-facing: Two follow-ups from the July 28 data-authority work, both closing gaps that fragment flagged but did not fix. A full-repo sweep for substring matching against card-name fields found two live instances of the bug class behind the "Poro" turn-1 undercount: `find()` in both `build_guide.py` and `pool_workbook.py` carried a `startswith()` fallback resolving every tier-list, pool and deck lookup, not just the turn-1 counter that was the only site patched earlier that day. Current data happens not to trigger it, but the latent risk was identical. Both are now exact-name-only. Separately, `scripts/validate_cards.py` already did the energy/might/speed/keyword cross-check correctly but stood unwired; `merge_sheet.py` now runs the same check inline, per-card, immediately before it overwrites `cards.json`, on every real merge for every set rather than the ad hoc VEN-only check `build_guide.py` did alone.

**July 30 (Vercel Web Analytics, PR #140)**
- Customer-facing: No visible change. Adds anonymous real-user page-view tracking on the production site.
- Team-facing: `@vercel/analytics` mounted in the root `App` component, gated behind `Platform.OS === "web"` because this app ships native Expo builds alongside the web export Vercel deploys. The guard is not strictly load-bearing (the package's own `isBrowser()` makes it a safe no-op without `window`) but keeps the intent explicit. **Still not collecting data**: there is no public Vercel API or CLI endpoint to toggle the setting, confirmed via `vercel api list`, so Ashwin has to enable it in the dashboard. Until then the injected script 404s and no-ops, harmlessly. If `App.tsx`'s root is restructured, keep `<Analytics />` mounted once at the root on web; it renders `null` and has no layout impact.

**July 30 (shared memory file split, no code change)**
- Customer-facing: —
- Team-facing: The shared Claude memory file `riftbound-competitive.md`, written to by both the RiftLab and RiftCoach threads, was nearing its size cap (about 30KB of 32KB). Split along a durability line: `riftbound-competitive.md` (about 13KB) keeps what barely changes (six-module topology, thread/handoff conventions, KPI framework, milestone ladder, the Lane B routing caution, cross-cutting infra lessons), and a new `vendetta-prerift-build.md` (about 18KB) holds the dense launch-cycle-specific record (v7 to v9 build-guide history, data-authority findings, pool-structure decoding, judge rulings, the printed-reference standard), which will matter far less once Vendetta stabilizes. No content was lost or edited; every line moved verbatim. Going forward, durable architecture and convention facts go to the first file, current pre-rift/build-guide material to the second.

**July 28 (card-data authority rule, PR #131)**
- Customer-facing: —
- Team-facing: Written down once rather than left as tribal knowledge, after being independently discovered and corroborated twice in one week (RiftLab July 26, RiftCoach July 28) with matching conclusions. Getting the two questions backwards (which direction data flows on a merge, versus which value to trust when the sources disagree between merges) is **exactly the mistake that let six energy errors and five Might errors reach a printed sheet at a live event**: Covert Informant, Repair Specialist, Baccai Witherclaw, Mask Mother, Minah Swiftfoot, Aurok General. All since corrected by Ashwin, with zero diffs across all 166 Vendetta rows as of July 30. The rule now lives in Section 6. Added `scripts/validate_cards.py`, a read-only cross-check that writes nothing.

**July 25 (RiftCoach Vendetta Pre-Rift v8 printed reference)**
- Customer-facing: None, internal personal-strategy artifact.
- Team-facing: Shipped `Vendetta_Pre-Rift_v8.pdf`, **merging the v7 build guide and the observation instrument into one four-page printed reference** that replaces both. Generated by script from `cards.json` and the 2026-07-25 Master Card Inventory CSV, so regenerating after a data change is a re-run rather than a re-type. Three data points folded in from Session 1 and set-wide analysis: v7's "at least 10 units at M5+" target is **unreachable and is now at least 5** (91 Vendetta units, 31 at M5+, near-uniform across domains, and the best possible 3-domain combination holds 16 M5+ units in the entire set while a Pre-Rift pool carries roughly 35% of distinct cards; Session 1 finished at 5); deck size 25 is a **minimum, not a target**, since v7's own two-drop table spans 25 to 30 and the "BUILD 25" heading read as a cap and caused a bad review; and Repair Specialist moves BODY GOOD to SIT, gear-gated, because v7 already gear-gated it under Jayce so the baseline contradicted the Legend page. Hextech Formula and Fretful Feline remain untiered because v7 never rated them. For RiftLab: page 3 is the Lane A capture surface and **the result row has been removed**, since Ashwin's W/L is Lane B and does not travel with field data. Data note for anyone regenerating: `subtype` was the blocker in `cards.json` (41/166 filled) and the 2026-07-25 CSV closes it at 166/166 with complete Speed and Keywords; **`Function` remains partial at 904/928 and is the outstanding gap.** New standing rule adopted, printed-reference style, see Section 6.

**July 27 (day, card inventory re-merge — 1v1-ban preservation, Recruit tokens, domain-parsing fix, PR #127)**
- Customer-facing: Master card data refreshed across the board (928 cards total, up from 918) — Vendetta text/keyword/shorthand corrections, Recruit tokens now display as "Recruit, DE/NX/ZN", and a new hand-authored fill-in-the-blank question for Forgotten Relic. Cards banned in 1v1 (e.g. Draven, Vanquisher) no longer surface in RiftRecall's Review Cards, but stay in the app's total card count.
- Team-facing: Three real bugs found and fixed in `scripts/merge_sheet.py` during this merge. (1) 1v1-banned cards are no longer deleted from `cards.json` — flagged `banned1v1: true` instead (new field on `Card` in `types.ts`), excluded from quiz eligibility in `quiz.ts`'s `getFilteredCards`; previously a card both brand-new and 1v1-banned in the same run (Draven, Vanquisher) got inserted then deleted before its errata text could ever render. (2) `normalize_name()` now converts a sheet name's trailing `"(X)"` into `", X"` instead of stripping it, fixing the Recruit token rename, which was previously silently skipped entirely (not just the name) because the mismatch guard misread the sheet's comma-format name as an unrelated card. (3) Found while regression-testing: the sheet's `Domain(s)` column writes dual-domain cards comma-separated; the generic `parse_list()` was splitting that into two array elements instead of one `/`-joined element, silently breaking domain-filter matching for all 100 dual-domain cards, not just Vendetta — caught by `quiz.test.ts`'s domain-filter tests. New `parse_domain()` fixes it. Also: `apply_master_sheet.py`'s `CATEGORY_MAP` now accepts both singular/plural "fill in the blank(s)" sheet values, and `ven-112-166`'s Card Text bracket convention (`[Action] (1)(P):` → `[Action (1)(P)]:`) was fixed to match the rest of the sheet — `attributeQuiz.test.ts` back to 971/971 passing. New standing rule adopted (Section 6): 1v1 bans are now a quiz-eligibility concern, not a dataset-membership concern.

**July 23 (evening, fillblank caption split + Sparklet fix, PR #112)**
- Customer-facing: Hand-authored fill-in-the-blank questions now render with the same short-label-plus-caption style auto-generated ones already use. Fixed the correct-answer Sparklet mascot lingering onto the next card on a fast "Next" tap.
- Team-facing: `apply_master_sheet.py`'s new `split_fillblank_prompt()` splits hand-authored `fillBlank` custom prompts into `prompt`/`caption`, gated strictly to that mode; verified only against a synthetic sheet (no real master-sheet export available), flagged for real-data verification (Section 3). `Sparklet` gained a required `activeKey` prop (`card.id`) with a `useLayoutEffect` that snaps its animation state on card change; verified by code read only, `npm run typecheck` could not run this session (`node_modules` missing), flagged for a real typecheck run (Section 3).

**July 23 (afternoon, RiftIQ Vendetta Bombs puzzle set authored + rebaseline)**
- Customer-facing: Four new RiftIQ puzzles built around the biggest units in the Vendetta set, teaching how to answer a threat too large to remove. Three are ready; one is held back for a fix.
- Team-facing: Authored the Vendetta bomb-answer puzzle set (TickTick `6a5f96af8f0846c75cf35d2f`, column M5 - IQ; content doc `docs/riftiq/RiftIQ_Vendetta_Bombs_Batch.md`). A themed set, not Batch 2 — Batch 2 authoring stays held pending Ashwin's three open questions (Section 10), and its Easy-slot rotation is unaffected. Rebaselined the cached bomb list against `cards.json` (918 cards at the time): all 11 originally-cached bombs verified accurate, no drift; alt-art suffix stripping confirmed already clean in the repo's processed data. **The cached list was incomplete — 18 Vendetta units sit at M6+, not 11** (corrected from an initial miscount of 19 on July 25 — Ocean Drake was already correctly in the cached 11 and got double-counted as an eighth omission; confirmed by RiftIQ, see `docs/riftiq/RiftIQ_Vendetta_Bombs_Batch.md`). Seven missing: Sandstone Chimera (`ven-036-166`, the most efficient M8 in the set, absent from the list entirely), Shen Scourge of Shadows, Nasus Guardian of Knowledge, Swain Visionary, Baccai Sandspinner, Minah Swiftfoot, Horns of the Dragon. Separately corrected a self-flagged error from a prior day's validation of RiftCoach's Vendetta combo brief: RiftCoach's 91-unit Might distribution was right, the earlier flag (counting 95) came from counting alternate-art duplicates in the raw API JSON — no action needed from RiftCoach. Design spine: every hard-kill effect in the set caps at 3 Might or less and the damage ceiling is 7, so no card can outright kill an M6+ body — the set teaches the taxonomy of indirect answers (read the drawback, bounce instead of kill, attack the condition not the threat, out-size with board-relative removal) rather than one card each. **V3 is blocked:** its intended answer targets a companion unit that was given 4 Might, above Lacerate's 3-or-less threshold, so the correct answer fails alongside the wrong ones — caught during the gate pass, not silently patched, since the fix changes the opponent's board and needs a fresh gate audit. New standing rule adopted (Section 6): verify every puzzle-solution card's `speed` field against the phase the puzzle is set in.

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

1. ~~Game-log / match-state snapshot schema~~ — **RESOLVED July 30 (PR #134).** Ownership is RiftCore's (M0) for the representation, RiftEngine's (M2) for reconstruction over it. The schema already existed in `src/lib/core/schema.ts` and is now documented at `docs/design/RiftCore_Match_Event_Schema.md`. Kept here rather than deleted so anyone holding an older copy of this doc can see it was answered rather than dropped.
2. New-user ingestion survey: exact questions/segments not yet decided.
3. Donate link platform + Riot LJJ policy check — unresolved, not urgent.
4. Keyword badge styling — undecided, low priority.
5. RiftIQ real module design — what goes in it beyond placeholders.
6. Stale GitHub branch cleanup — process documented, not yet executed.
7. **Em dashes in this doc.** Section 6 bans them in project documents effective July 19, 2026, but the existing body of this doc uses them throughout, including in entries written well after that date. The August 6 reconciliation wrote its own additions in compliance and left legacy text alone rather than silently rewriting it. Decide: enforce the rule with a cleanup pass, narrow it to app-facing text only, or drop it. Until then the doc is visibly inconsistent with its own stated rule.
8. **Repair Specialist gear threshold** — the exact gear number is still open with Ashwin (RiftCoach v8, July 25).
9. **MUST-play cards on the v8 page-4 slack** — page 4 runs about 72% full against 86 to 95% on the other three, and the printed-reference standard says below roughly 85% a page should absorb something. Open with Ashwin.
10. **Signature count** — two sources agree on 50 cards and disagree on exactly one, `Shadow` (UNL-194-219). Open with RiftCore. Surfaced from the same reconciliation work as the tokens decision; do not conflate the two.
11. **RiftCore G6, turn-phase and priority granularity** — left nominal. RiftEngine to confirm it will not need finer combat-window events before this is locked as won't-build.
12. **Sealed/draft deck construction** — explicitly deferred rather than guessed. That format is roughly three months out and will be rebuilt from TR 602.4 when live; in particular **whether sealed's 25-card minimum includes the champion is deliberately unresolved.**
13. **Is RiftCore Phase 4 actually unblocked?** It was recorded as blocked on the Supabase card inventory, which has since loaded. Nobody has confirmed the blocker cleared; this is an inference across two fragments, not a stated fact from either.
