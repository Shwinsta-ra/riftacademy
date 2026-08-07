# RiftCore: Printing Code Spec — **v2.1 Amendment** (2026-08-06)

**Amends** `RiftCore_PrintingCode_Spec_v2_CONSOLIDATED.md`. Two decisions; the second **withdraws a fixture** and corrects a model error.

---

## 1. §3a — `special` CONFIRMED for Crystal Rose

**Ruling stands: `special`.** Migration 012 is correct; no change.

The reasoning (originally issued in Addendum C and **dropped when consolidating — Core's error**): two axes are in play.

- **Treatment / numbering axis** — Riot's own designation is **SP = Special**. That is the axis `printing_variant` models.
- **Artwork axis** — "Crystal Rose" is a **Wild Rift skinline**, i.e. *which* collaboration. It will recur under different names (a future Star Guardian or Project set would be an equally valid "special").

`crystal_rose` would put the artwork axis into the treatment column and require a new enum value **per collaboration** — unbounded growth keyed to something that is not a treatment class. So `special` uses Riot's own name **for the axis the column actually models**, consistent with the `ultimate` precedent rather than an exception to it.

**Revisit trigger:** a second *structurally distinct* special product (different numbering, pull rate, or pricing tier). If collaboration identity ever needs querying, that is an **additive field**, not a repurposed enum.

*Noted for the record: consolidating five documents into v2 removed a drift risk and simultaneously dropped this ruling. Consolidation is not free — anything decided in a superseded document must be carried forward explicitly. M9 caught the omission.*

## 2. ⭐ §3b — `OP` is NOT a set code. Fixture 13 is WITHDRAWN.

M9's instinct that an error in the fixtures propagates into every implementation was right, and there is one. Testing all seven of M8's live `OP` holdings against base-set numbering:

| M8's code | Mirrors | Card | |
|---|---|---|---|
| `OP-011/024` | `ogs-011-024` | Flash | ✓ |
| `OP-127/219` | `unl-127-219` | Mister Root | ✓ |
| `OP-093/219` | `unl-093-219` | Dragonsoul Sage | ✓ |
| `OP-125/219` | `unl-125-219` | Lunar Boon | ✓ |
| `OP-009/219` | `unl-009-219` | Upstage Comedy | ✓ |
| `OP-041/166` | `ven-041-166` | Riven, Shattered | ✓ |
| `OP-169/219` | `unl-169-219` | Ashe, Focused | ✓ |

**7 of 7.** Every `OP` code carries the **collector number and total of the card's original set** — `/219` is UNL's total, `/166` is VEN's, `/024` is OGS's. `OP` is therefore a **distribution marker**, not a set: an OP printing is a promo printing *of a card that lives in another set*.

**Consequences:**

1. **Fixture 13 (`OP-041/166` ↔ `op-041-166`) is withdrawn.** It asserts `op` as a set prefix, which encodes a false model, and M9 is right that a wrong fixture propagates into every conforming implementation. **Remove it from §8**; do not implement against it.
2. **Fixture 7 (`OP-R06c` ↔ `op-r06c`) is retained but reduced to a *lowercasing* assertion**, marked provisional. Its real purpose is proving the suffix reaches `[a-z]` beyond `[ab]` — that part is sound regardless of how `OP` is eventually modelled.
3. **Do not create internal set codes `op`, `opp`, or `pr`.** None of them is a set. TCGplayer's `OPP` (Organized Play Promotional) and `PR` (Promotional) are **distribution channels**, and mapping either to a fabricated internal set would bake the same error deeper.
4. **M9's namespace reading is half right.** The internal/TCGplayer separation is correct and `tcgplayer_groups` is the right reconciliation point. The wrong half is the premise that `op` is the internal *set*.

**Why this can wait:** `card_printings` holds **zero** promo printings, so nothing resolves today and nothing breaks. The correct internal representation is a real design question — a promo printing shares its collector number with the base printing, so it needs a distinguishing element in a **primary key**, and the options (a variant suffix in the code, a composite key, or a separate promo table) have different costs. **Deferred to the asset-migration sweep**, when actual promo rows exist to design against. Designing it now against seven rows in a spreadsheet would repeat exactly the mistake fixture 13 embodies.

**One fragility to record for that design:** today the TOTAL disambiguates the source set only because all five set totals happen to be distinct (298, 221, 219, 166, 024). That is a coincidence, not a property. Any promo model relying on it breaks the first time two sets share a total.

## 3. Amendments to fold into v2
1. §11 gains the Crystal Rose ruling: `printing_variant = 'special'`, with the two-axis reasoning and the revisit trigger.
2. §8 fixture 13 **removed**.
3. §8 fixture 7 retained, annotated *"asserts lowercasing and the `[a-z]` suffix range only; the `op` prefix model is unresolved."*
4. §5 gains: `OPP` and `PR` are TCGplayer **distribution channels**, not sets. `tcgplayer_groups` maps them; no internal set code is created for either.
5. §12 gains: internal representation of promo printings — deferred to the asset-migration sweep; note the set-total-collision fragility.

## 4. Acknowledged, no action
- Dual-face products (fixture 17) — M9's *"had it wrong by omission"* is a fair reading; the ` // ` split is the fix.
- §10 derivation principle applied to the seed transform — correct scope; it is a seed change, not a translator change.
- §9 consumer contract accepted for the RuneHoard pipeline when built.
- Implementation sequenced with workstream #4; nothing fails meanwhile because `to_printing_code()` still works.
