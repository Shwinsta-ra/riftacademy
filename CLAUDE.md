# RiftAcademy — Claude Code Project Memory

This file is read automatically by Claude Code at the start of every session in this repo. It exists so every session — including ones triggered remotely via Dispatch — inherits the same conventions without being re-taught.

## Canonical project doc
`docs/RiftAcademy_Project Management.md` is the single canonical project-management doc: status, roadmap, standing rules, full deploy workflow, conventions. Read it before any non-trivial task. **Update it in the same PR as any structural change** (new feature, convention change, decision) — never as a separate doc-only PR that lands ahead of or behind the code it describes. This guarantees the doc on `main` never describes changes that haven't landed on `main` yet.

## Branch pipeline
`feature/*` / `fix/*` / `hotfix/*` → `integration` → `beta` → `staging` → `main`
- `main` = production — `riftacademy-tau.vercel.app`
- `staging` = public preview — `riftacademy-staging.vercel.app` — hotfix validation + final pre-release check
- `beta` = premium/beta-tester tier, no public domain yet
- `integration` = first line of defense, combines feature/fix work for testing

All four branches require a PR + passing status checks (`typecheck`, `check-source-branch`) before merging.

## What Claude Code should and shouldn't do
- **DO**: create branches off latest `integration` (or `main` for hotfixes), commit, push, and open PRs via `gh`.
- **DO NOT** merge any PR into `main` — Ashwin always merges to `main` himself, manually, after testing on staging. This is a hard rule, not a default to override even if asked to "just finish it."
- Always confirm the PR base branch explicitly before opening one — GitHub's compare view defaults to `main`, which has caused accidental wrong-target PRs before.
- Never delete branches. If a branch looks stale or wrong, surface `git fetch origin` + `git diff origin/X origin/Y` output to Ashwin rather than acting on it.
- Vercel's Hobby plan allows 1 concurrent build account-wide — pushing several branches in quick succession queues builds sequentially; a full promotion chain can take 10–20 minutes to show up. That's normal, not a failure.

## Git identity
Global git email must be `ashwin.sathe86@gmail.com` (matches GitHub `shwinsta-ra`) or Vercel blocks the deploy with "commit author email is not valid."

## Card data conventions (Riftcodex ingestion)
- Trailing-letter codes (`ven-088a-166`) = alt art → drop, use base numeric.
- Over-total numbers (`ven-177-166` when total=166) = overnumbered dup → drop for the normal-range code, UNLESS no lower twin exists yet → keep temporarily, reconcile later.
- Champion apostrophes: **Kaisa, Khazix, Leblanc, Reksai — no apostrophes** (override source styling).
- Card naming: always **"Name, Epithet"**, sentence case, minor words (of/the) lowercase.
- Card-text domain color-letter codes (in-text parens): Fury (R), Calm (G), Mind (B), Body (O), Chaos (P), Order (Y) — color-based, not first-letter. (Any)/rainbow spelled out, never abbreviated.
- `TYPE_FILTER_PREDICATES`: Unit includes all champions; Champion = subtype Champion only. Gear includes all equipment; Equipment = subtype Equipment only.
- Never name a feature RiftMind / RiftBody / RiftCalm / RiftFury / RiftChaos / RiftOrder — collides with the six domain names.

## Design tokens
- `REQUIRED` magenta `#EA6FD0` (from `src/lib/theme.ts`) = required-field indication only. Never repurpose for CTAs or anything else.
- Domain hex: Fury `#CC2929`, Calm `#3FA34D`, Mind `#2B73C2`, Body `#E57921`, Chaos `#8629B3`, Order `#EBB113`.

## Deliverable style
- Terminal commands handed to Ashwin must be bare, with **no inline `#` comments** — they break copy-paste into his terminal. Put explanations in prose before/after the code block, never inside it.
- Instructions should be granular and exact: full paths, explicit commands, no assumed context.
