# RiftAcademy — Claude Code Project Memory

This file is read automatically by Claude Code at the start of every session in this repo. It exists so every session — including ones triggered remotely via Dispatch — inherits the same conventions without being re-taught.

## Canonical project doc
`docs/RiftAcademy_Project Management.md` is the single canonical project-management doc: status, roadmap, standing rules, full deploy workflow, conventions. Read it before any non-trivial task.

**Never edit it in a feature/fix PR.** Doc updates use a fragment system instead (adopted July 19 evening, after a single shared file conflicted twice in one day across concurrent PRs — many small, uniquely-named files can't conflict by construction):

- Add a new file at `docs/updates/pending/YYYY-MM-DD-short-topic.md`, following `docs/updates/TEMPLATE.md`. The filename must be unique — date + a short slug matching your branch/topic.
- Commit the fragment in the same PR as your code change; the update travels with the code.
- The master doc itself is edited **only** during the end-of-day reconciliation pass — a distinct, explicit task, never a side effect of a feature PR.
- **Check `docs/updates/pending/` before starting any work**, and especially before a large or ambiguous task. It's the cheapest source of "what else changed today, before my session started," without waiting for the nightly reconciliation.

**Any fragment asserting a verification** ("confirmed merged," "verified working") **must cite its evidence** — branch, `file:line`, or the actual command run. A claim with no evidence trail is not acceptable. A false "confirmed merged to integration" claim shipped on 2026-07-21, sat wrong for a day, and gated real work (RiftIQ) on the wrong assumption before another thread caught it by direct code verification.

## Branch pipeline
`feature/*` / `fix/*` / `hotfix/*` → `integration` → `beta` → `staging` → `main`

- `main` = production — `riftacademy-tau.vercel.app`
- `staging` = public preview — `riftacademy-staging.vercel.app` — hotfix validation + final pre-release check
- `beta` = premium/beta-tester tier, no public domain yet
- `integration` = first line of defense, combines feature/fix work for testing

All four protected branches require a PR + passing `typecheck` and `check-source-branch` before merging.

Allowed sources per target, verified against `.github/workflows/enforce-branch-flow.yml`:

| Target | Allowed source branches |
|---|---|
| `integration` | `feature/*`, `fix/*`, `hotfix/*` |
| `beta` | `integration` |
| `staging` | `beta`, `hotfix/*` |
| `main` | `staging`, `hotfix/*` |

`hotfix/*` may therefore target `staging` or `main` directly — more permissive than the linear chain suggests. Note that a linear branch model can't selectively hold one feature back once it's merged into a shared branch; use a feature flag or keep it on its own branch instead.

## What Claude Code should and shouldn't do
- **DO**: create branches off latest `integration` (or `main` for hotfixes), commit, push, and open PRs. Local sessions use `gh`; remote/web sessions have no `gh` CLI and use the GitHub MCP tools instead.
- **DO NOT** merge any PR into `main` — Ashwin always merges to `main` himself, manually, after testing on staging. This is a hard rule, not a default to override even if asked to "just finish it."
- Always confirm the PR base branch explicitly before opening one — GitHub's compare view defaults to `main`, which has caused accidental wrong-target PRs before.
- Branch name must match the target's allowed prefix (see the table above). A mismatched prefix (e.g. `docs/*`) fails `check-source-branch` immediately regardless of content. Push a new branch with an allowed prefix and open a fresh PR; don't try to rename a branch under an open PR.
- Never delete branches. If a branch looks stale or wrong, surface `git fetch origin` + `git diff origin/X origin/Y` output to Ashwin rather than acting on it.
- Vercel's Hobby plan allows 1 concurrent build account-wide — pushing several branches in quick succession queues builds sequentially, so a full promotion chain can take 10–20 minutes to appear. That's normal, not a failure.
- Every branch/PR gets an auto-generated Vercel preview URL — unindexed and unlinked, so effectively private. That's the default mechanism for "let me look at this before it's official."
- **When you flag your own command as security-sensitive** (e.g. a shell-injection-shaped pattern warning), stop and explain the exact command and why the pattern appears before running it — don't just proceed once approved without having actually explained it. Prefer writing a scratchpad script file over a complex inline one-liner, especially for anything Ashwin might be approving from his phone.

## File placement — always Code's job, never Ashwin's
Whenever a file needs to land somewhere in this repo (new CSVs, generated data, config, source exports, etc.), Claude Code places it. Locate and verify the correct destination yourself — check existing pipeline scripts, file locations, naming conventions — and move the file there as part of the task. Never hand Ashwin an `mv`/`cp` command to run; if a file needs to get from his Downloads folder into the repo, that's your job to do directly. Ashwin's goal is zero terminal use.

## Handoff file convention
When Ashwin hands off a task from a chat thread to a Code session, the default is a **single** markdown instruction file — if there's nothing else to preserve, that one file *is* the instruction, drop-in ready, no separate blurb needed.

Two cases keep instructions and content in **separate** files, never merged:

- **Raw data files** (CSV, JSON) that Code parses programmatically. Embedded prose breaks the format — a CSV can't have an instructional header row, JSON can't have prepended prose.
- **Permanent content** meant to be committed as-is (design docs, specs, fragments, playbooks). Baking transient instructions into the final artifact either requires remembering to strip them or leaves throwaway text in the repo forever.

In both cases the instruction file names the exact filename of the file to attach alongside it, so nothing is ambiguous about what goes together. Net effect: pure instructions are one file; anything involving data or permanent content is two files handed over in the same message, never one file trying to be both.

## Git identity
Commits must use author email `ashwin.sathe86@gmail.com` (matches GitHub `shwinsta-ra`), or Vercel blocks the deploy with "commit author email is not valid."

This conflicts with the environment's platform-level hooks (`session-start-git-identity.sh`, `stop-hook-git-check.sh`, both root-owned in `/root/.claude/launcher-settings.json`, outside this repo), which reset identity to `noreply@anthropic.com` so commits earn GitHub's "Verified" badge via CCR's registered signing key. **This repo's rule wins** — every real commit here already shows "Unverified" for exactly this reason. That's expected, not a bug.

When the Stop hook nags about it, it's a known false positive for this repo. Don't edit the root-owned hook/config files to silence it — they're outside this repo, may not survive container reprovisioning, and affect every other repo and session. Just push with `ashwin.sathe86@gmail.com` as already configured, and don't ask for confirmation again once this specific nag appears.

*Untested idea, do not rely on without verifying:* git allows author and committer email to differ, so committer=`noreply@anthropic.com` (satisfies the signing/Verified check) with author=`ashwin.sathe86@gmail.com` (satisfies Vercel) might satisfy both — but only if Vercel's check reads the author field specifically. Test on a throwaway branch with a real Vercel deploy before relying on it.

## GitHub CLI auth
`gh auth login` uses OAuth device flow (token prefix `gho_`), not a Personal Access Token (`ghp_`). That's what all push/PR/branch operations use. No PAT is needed for anything Claude Code does — if one exists for another purpose, it's a separate, revocable credential, not a dependency.

## No credentials in task trackers or docs
Never place tokens, passwords, or API keys in TickTick, this doc, or any note-taking tool — even temporarily. macOS Keychain or a real password manager only.

## Card data conventions (Riftcodex ingestion)
- Trailing-letter codes (`ven-088a-166`) = alt art → drop, use base numeric.
- Over-total numbers (`ven-177-166` when total=166) = overnumbered dup → drop for the normal-range code, UNLESS no lower twin exists yet → keep temporarily, reconcile later.
- Champion apostrophes: **Kaisa, Khazix, Leblanc, Reksai — no apostrophes** (override source styling).
- Card naming: always **"Name, Epithet"**, sentence case matching the physical card exactly.
- Card-text domain color-letter codes (in-text parens): Fury (R), Calm (G), Mind (B), Body (O), Chaos (P), Order (Y) — color-based, not first-letter. (Any)/rainbow spelled out, never abbreviated.
- `TYPE_FILTER_PREDICATES`: Unit includes all champions; Champion = subtype Champion only. Gear includes all equipment; Equipment = subtype Equipment only.
- Competitive bans are dynamic, read from the inventory's `Bans` column every merge run: 1v1 bans (any combination) auto-remove the card; 2v2-only bans keep it.
- Never name a feature RiftMind / RiftBody / RiftCalm / RiftFury / RiftChaos / RiftOrder — collides with the six domain names.

## Design tokens
- `REQUIRED` magenta `#EA6FD0` (from `src/lib/theme.ts`) = required-field indication only. Never repurpose for CTAs or anything else.
- Domain hex: Fury `#CC2929`, Calm `#3FA34D`, Mind `#2B73C2`, Body `#E57921`, Chaos `#8629B3`, Order `#EBB113`.
- `RIFT_BRAND` gold `#E8B44A` = the literal word "Rift" in every product name, plus (as of the Rune Glow pass) the foil card-art rim/trim and the Sparklet cap only. Nowhere else — it does not carry general semantic meaning.

## Analytical and specification documents are committed, not circulated (adopted 2026-08-06)
Any document that another module implements against, or that records a decision, is committed to the repo in the same session it is produced — `docs/contracts/` for cross-module contracts, `docs/design/` for internal design and decision records, `docs/rules/` for rules-derived reference.

`docs/contracts/` is distinct from `docs/design/` on purpose: a contract has someone on the other side who must comply. A spec nobody can diff is a spec nobody can be held to.

**When a document supersedes others, the superseding commit must delete them in the same commit.** The diff is the record that nothing was dropped. Consolidation is where rulings disappear silently, and a deletion visible next to an addition is what makes that reviewable — consolidating five Core documents into one on 2026-08-06 silently dropped an already-made ruling, and another thread caught it rather than review.

## Deliverables

### General style
- Terminal commands handed to Ashwin must be bare, with **no inline `#` comments** — they break copy-paste into his terminal. Put explanations in prose before or after the code block, never inside it.
- Instructions should be granular and exact: full paths, explicit commands, no assumed context.

### PNG-only UI delivery (cross-thread, learned 2026-07-22)
UI screenshots and mockups must always be delivered as PNG, rendered at 2x for phone legibility (e.g. `wkhtmltoimage` at width 430, zoom 2). Ashwin reviews on his phone and can't open HTML, `.jsx`/React artifacts, or interactive previews there — HTML downloads instead of rendering. An interactive version is a supplement, never a replacement.

This rule already existed in Claude's persistent memory but hadn't been written here, so a session hit it fresh and cost a round trip. The lesson generalizes: **rules Claude "knows" from memory don't reach Code sessions unless they're written into this file.**

### Reporting format (adopted 2026-07-28, from Finance/ROI EOD — applies everywhere)
- Tables over prose blocks, always, for reference and reporting content.
- Card lists: domain first, then alphabetical (for searching/locating) or energy cost (for deckbuilding/gameplay).
- Large lists always get pivot-style summary stats (counts/breakdowns) alongside the raw data.

### Printed-reference style (adopted 2026-07-25)
Applies to any artifact Ashwin prints, fills in by hand, or reads at a table under a clock — build guides, capture instruments, cheat-sheets, one-pagers. The reference implementation is `docs/riftcoach/build_guide.py`'s output; when in doubt, open it and match it.

1. **Say it once, in the place it's used.** Cross-reference by page number rather than repeating a target. A steps section is a sequence and a box to write the time in — not a summary of the detail printed below it.
2. **Generate from the source of truth.** Card tables come from `cards.json` or the inventory CSV via script. Hand-typed tables drift.
3. **Encode, don't describe.** `1O`, `2PP`, `(A)`, `(R)`, `†`, tier digits 1–4. One legend line, then symbols.
4. **One job per page, and fill it.** Below roughly 85% vertical fill the page is carrying too little and should absorb something or be merged. Above 100% it silently spills — check the page count.
5. **Blank space, never underscores.** Left-justify everything. Underscores fight handwriting; centred columns break the eye's scan down a page.
6. **Instructions must not contradict the form.** A line reading "mark C or A, don't write" sitting directly above a write-in column confused the user once — read every instruction against the thing it labels.
7. **PDF for anything printed.** Not Google Docs — its formatting isn't reliable enough to specify against, and this cost a rebuild.
8. **Verify by measuring, not by assuming.** Page count, vertical fill percentage, and right-margin overflow are all checkable programmatically (`pdfplumber`: `extract_words()`, then compare `max(x1)` against the frame width). A card name silently overhung the page edge through two passes and only measurement caught it. Render to image and look as well, but don't rely on eyes alone.
9. **Let the visual design carry the meaning.** Colour-coded headers, column position, and a single digit beat a paragraph of explanation. Prose is the fallback, not the default.

### Deliverable consolidation (adopted 2026-07-23)
Any substantial response ends with two sections, in this order — (1) **"Decisions needed from you"**: every question, confirmation, or decision raised anywhere in the message, even if already inline; (2) **"Action items for you"**: every task Ashwin needs to do, even if already inline. Inline mentions stay in the body.
