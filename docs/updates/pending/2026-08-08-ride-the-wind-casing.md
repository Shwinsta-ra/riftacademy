## Thread/topic: ride-the-wind-casing

**Sections likely affected:** 3 (feature tracker — card data), 9 (log)

**Team-facing:**

`src/data/decks.json`, `src/data/model/abilities.json`, and `supabase/seed/seed_cards.sql` spelled card `ogn-173-298` as **"Ride The Wind"** (capital T). The authoritative source, `src/data/cards.json:5544`, spells it **"Ride the Wind"** (lowercase t) — confirmed correct by Ashwin 2026-08-08. Six occurrences corrected to match:

| File | Occurrences |
|---|---|
| `src/data/decks.json` | 4 (lines 154, 584, 888, 1568) |
| `src/data/model/abilities.json` | 1 (line 1211) |
| `supabase/seed/seed_cards.sql` | 1 (line 180, `name` field only) |

**This is a casing exact-match bug, not the substring class** already fixed and closed 2026-07-31 (TickTick `6a6c28618f084f9116957b7f`). Different root cause — do not reopen that ticket for it.

Nothing was corrupted by it: the Irelia lesson 1/2 numbers were cross-referenced by hand and are correct. The risk was forward-looking — any exact-name join against `decks.json` would have silently missed this card, including the **buy-list generator due Aug 11**, which joins on card name.

Diff is exactly six lines, all `name`/`cardName` fields. Same string length, so no line numbers shifted. Both JSON files re-validated after the edit.

**Anything another thread working today should know before touching related code:**

`supabase/seed/seed_cards.sql` is a **stale legacy snapshot, not a mirror of `cards.json`** — treat it as such until someone reconciles it. Two independent divergences confirmed while making this fix:

1. **Rules text carries explanatory keyword prose that `cards.json` strips.** Line 180 seed text is `[Action] (Play on your turn or in showdowns.)Move a friendly unit and ready it.` vs `cards.json`'s `[Action] Move a friendly unit and ready it.` Ashwin confirmed 2026-08-08 this is **expected and not a defect** — the parenthetical is human-facing keyword explanation with no mechanical effect, deliberately stripped from `cards.json`. Some printed/legacy sources carry it, some don't. **Do not "normalize" it.** Only the name casing was touched on that line.
2. **`power_cost` is broadly unpopulated in the seed.** Spot-checking 400 seed rows against `cards.json`, 181 disagree on whether a power cost exists at all — the seed has `power_cost=null` where `cards.json` has a power cost (e.g. `ogn-008-298` Get Excited!, `ogn-009-298` Hextech Ray, `ogn-011-298` Magma Wurm). The pattern is one-directional and systemic, so this reads as the seed predating power-cost population rather than per-card corruption. **Not investigated further and deliberately not fixed here** — out of scope for a casing fix, and it needs a decision about whether the seed is still meant to be authoritative for anything.

Open item for whoever does the next data reconciliation: decide whether `seed_cards.sql` should be regenerated from `cards.json` or formally retired. Right now it is neither current nor clearly deprecated, which is the worst of both.

**New standing rule or convention worth capturing:**

Card names are exact-match join keys across `cards.json`, `decks.json`, `abilities.json`, and the Supabase seed. `cards.json` is authoritative for name spelling and casing, per the existing card-data authority convention. Worth a CI check rather than another hand-caught instance — this is the second name-matching bug in ten days, and both were found incidentally while doing unrelated work.
