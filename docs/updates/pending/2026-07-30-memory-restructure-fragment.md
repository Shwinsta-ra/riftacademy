# Admin thread — memory restructure, 2026-07-30

**Type:** infrastructure / housekeeping, not app-facing. No code changes, no cards.json/CSV impact.

## What happened

The shared Claude memory file `riftbound-competitive.md` — written to by both the RiftLab and RiftCoach threads — was nearing its size cap (~30KB of 32KB). Split into two files along a durability line:

- **`riftbound-competitive.md`** (now ~13KB): the stuff that barely changes — six-module topology, thread/handoff conventions, KPI framework, milestone ladder, the Lane B routing caution, cross-thread status notes (RiftNotes, Finance/ROI, PR summaries), and general cross-cutting infra lessons (the `git merge-base` correction, the "no Master Card Inventory CSV anywhere" finding).
- **`vendetta-prerift-build.md`** (new, ~18KB): the dense, Vendetta-launch-cycle-specific record — the v7→v9 build-guide history, the CSV-vs-cards.json data-authority findings, pool-structure decoding, judge rulings obtained this cycle, and the printed-reference style standard. This will matter far less once Vendetta stabilizes post-launch.

## Why this matters for other threads

Both RiftLab and RiftCoach have historically written to and read from the single combined file. Going forward:
- Durable architecture/convention facts → `riftbound-competitive.md`, as before.
- Anything specifically about the current pre-rift/build-guide cycle → `vendetta-prerift-build.md`.

No content was lost or edited — every `[stated]` line moved verbatim into whichever file it now belongs in. If a thread's next write targets the old combined shape, a stale-version notice will show the new split; read before writing, same as any other cross-surface memory conflict.

## Not touched

App code, cards.json, the Master Card Inventory CSV, TickTick. This fragment exists purely so the split is discoverable by anyone reconciling `docs/updates/pending/` later, not because anything here needs a PR review beyond landing the file.
