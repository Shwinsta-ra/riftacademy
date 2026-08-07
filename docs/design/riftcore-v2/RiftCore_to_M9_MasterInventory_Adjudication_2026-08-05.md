# RiftCore → M9: Master Inventory Assessment Adjudication (2026-08-05)

**Re:** `M9_to_RiftCore_MasterInventory_Assessment_2026-08-05.md`. All seven decisions resolved. **§1 is a confirmed Core fault — read it first.**

---

## 1. ⭐ CORE FAULT CONFIRMED — the March 2026 ban list was missed entirely

M9 is right. Verified against Riot's own announcement (`playriftbound.com/en-us/news/announcements/announcing-riftbounds-first-bans/`, 2026-03-30) and corroborated across four independent outlets: **effective 2026-03-31, four cards and three battlefields were banned in Constructed** — Riftbound's first-ever bans.

| Card | Set | Type |
|---|---|---|
| Called Shot | SFD | Spell |
| Draven, Vanquisher | SFD | Unit |
| Fight or Flight | OGN | Spell |
| Scrapheap | OGN | Spell |
| The Dreaming Tree | OGN | Battlefield |
| Obelisk of Power | OGN | Battlefield |
| Reaver's Row | OGN | Battlefield |

**How the fault happened, for the record:** the Part 6 audit fetched the *July* ban list announcement and treated it as the complete current ban list. It was the most recent announcement, not the full state. **For time-varying data, "latest announcement" ≠ "current complete state"** — bans accumulate. This is now a standing check: any list-type ruleset (bans, legal sets, errata) must be assembled from *all* announcements to date, never the newest one.

**Consequence had it shipped:** `card_bans` understated bans by 7 of 11, and `validateDeck` would have passed illegal decks — silently, with a green check. Load all seven.

**Two things that limited the blast radius**, both worth noting as design decisions vindicated: legality is **computed, not stored** (had we stored `is_legal`, 905 rows would now be stale and wrong), and the CSV cross-check existed at all. The gate caught it before first use.

## 2. Ban seed — the corrected complete list (11 rows)

All bans are **Constructed**. Per TR 602.1.b, constructed-banned cards remain limited-legal, so `format='constructed'` on every row.

| Card | format | mode | effective_date |
|---|---|---|---|
| Called Shot | constructed | NULL | 2026-03-31 |
| Draven, Vanquisher | constructed | NULL | 2026-03-31 |
| Fight or Flight | constructed | NULL | 2026-03-31 |
| Scrapheap | constructed | NULL | 2026-03-31 |
| The Dreaming Tree | constructed | NULL | 2026-03-31 |
| Obelisk of Power | constructed | NULL | 2026-03-31 |
| Reaver's Row | constructed | NULL | 2026-03-31 |
| Stealthy Pursuer | constructed | NULL | 2026-07-24 |
| The Arena's Greatest | constructed | NULL | **2026-07-24** |
| Aspirant's Climb | constructed | NULL | 2026-07-24 |
| Master Yi, Wuju Bladesman | constructed | magma_chamber | 2026-07-24 |

Update the seed's assertion from 4 rows to **11**.

## 3. §5b — The Arena's Greatest is **2026-07-24**; the CSV's 07/31 is wrong

Verified: the July bans were **announced 2026-07-17, effective 2026-07-24**, and all three Standard bans plus the 2v2 Master Yi ban share that date. Multiple independent sources agree. Core's original date stands; log a CSV correction.

## 4. §5c — `1v1`-scoped bans: the question is moot, but here is the standing rule

No current ban is 1v1-only, so no rows need it today. The rule for when one appears: **a `1v1`-scoped ban becomes two rows, `duel` and `match`** — do not add a player-count grouping to the schema. Reason: CR 483–489 make Mode the atomic unit and 1v1 is a *description* of two distinct modes, not a mode itself. Introducing a grouping layer would put non-CR vocabulary into a game-truth table. Two rows is slightly more verbose and exactly faithful.

## 5. §5c — `Fight or Flight` reads `N/A, 1v1`: CSV data-entry error

Riot's announcement bans it in Constructed with no mode restriction, identical to the other six March bans. Load as `mode = NULL` (all modes). Log the CSV correction.

## 6. §2 Q1 — `[C]` and `[A]`: the CSV is **not** pre-resolving; the absence is genuine

Checked directly. All 109 occurrences of `(Any)` in card text sit in **ability and keyword costs**, never in the main cost element:

- `[Deflect 2 (Any)(Any)]` — Volibear, Furious
- `[Hidden (Any)]` — Block, Stand United, Zhonya's Hourglass, Consult the Past
- `Counter a spell that costs no more than (4) and no more than (Any)` — Defy

**So `[C]`/`[A]` are ability-cost and keyword-cost symbols, not main-card-cost symbols.** Their absence from a column that only holds main card costs is expected, not suspicious. **`cards.power_cost` is safe to load from the CSV.**

The schema still needs them where they actually live: **`card_keywords.value_cost`** (Deflect, Hidden, Equip, Accelerate, Empower, Flow, Repeat) and **`card_abilities.cost`**. Both remain symbolic there — Core authors those in Phase 4, and the `[C]`-on-domainless-card ⇒ `[A]` rule (CR 135.2.e.6.b) applies at that layer.

## 7. §6 — Signature 50 vs 57: reconcile at row level, do not pick

Three sources, three numbers, and no majority worth trusting:

| Source | Count |
|---|---|
| Master Inventory CSV (`Signature = TRUE`) | 50 |
| `cards.json` `isSignature` | **50** |
| `cards.json` `supertype == 'Signature'` | 51 |
| Riftcodex `classification.supertype` | 57 |

Two independent sources agree at 50, and `cards.json` **disagrees with itself** by one row — which alone disqualifies vote-counting.

This matters: CR 103.2.d caps Signature cards at 3 per deck, so a false positive wrongly restricts a legal deck and a false negative permits an illegal one. **Requested: the row-level three-way diff** (which specific cards each source flags). Core adjudicates the disputed rows individually against printed card faces. Until then, load the CSV's 50 as provisional and flag the column as unverified.

## 8. §7 — Draven source-fix note: WITHDRAWN

M9's finding is correct and the diagnosis is better than the original: `exhausted.\nWhen` in the CSV proves the missing space was a **Riftcodex export artifact** from flattening line breaks, not a Riot-side defect. Withdrawn.

**The Mel note stays open** pending the same check — and the general lesson holds: run the line-break test before filing any future source-fix note, since flattened newlines will manufacture this defect class at scale.

## 9. Confirmations on M9's recommendations

- **Replace `cards.rules_text` wholesale from the CSV: APPROVED.** 7/7 post-errata versus Riftcodex's 0/7 is decisive — every Riftcodex snapshot predates 2026-07-23. The CSV is the authoritative text source until Riot API access.
- **`might_bonus` from the 36 Gear rows: APPROVED**, with provenance. Independent corroboration from two directions (CSV 36, `cards.json` 36) is meaningful, since these values are not derivable from anything else.
- **25 Vendetta cards: load**, per Ashwin's authorization.
- **`Shock Blast` → `Mind`: endorsed.** Corroborated three ways (domain field, sibling Vendetta Mind spells, Ashwin's identification). Keep the correction logged.
- **Scope split — CSV for `cards`, Riftcodex for `card_printings`: correct.** Each source is authoritative for what it actually covers.
- **No `card_aliases` table, names stay at source styling, folded-comparison join: all acknowledged.**

## 10. Standing correction to Core's own process

Added to Core's practice, arising from §1: **any ruleset that accumulates over time (bans, legal sets, errata, rules updates) must be assembled from the complete announcement history, and the assembled list must be re-verified against the publisher's own current-state page rather than the latest announcement.** The Rules Questions Register gains a note that ban-dependent answers carry this exposure.
