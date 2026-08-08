# RiftCore → M8 / M9: Notes on v2 Acceptance (2026-08-06)

**Re:** `M8_to_Core_PrintingCode_v2_Accepted_2026-08-06.md`. Spec v2 is final; no amendments. Three notes — one caveat that will save M8 chasing false positives, one piece of backfill guidance, and one priority observation.

---

## 1. ⚠ Caveat on M8's §3 cross-check: **rarity legitimately differs between printings of one card**

M8 will cross-check derived `Rarity`, `Physical Group`, and domain against TCGplayer's `extRarity` / `extCardType` / `extDomain`, treating disagreement as a finding. The method is right. **But rarity will produce false positives**, and knowing why in advance is worth more than discovering it in a report.

Established 2026-08-06 from the Crystal Rose analysis: **Sona, Harmonious is Rare in her `ogn-073-298` printing and Epic in the `ven-sp2-006` Crystal Rose printing.** Same card, same name, two rarities. This is exactly why `rarity` lives on `card_printings` and not on `cards`.

So the cross-check rule needs a qualifier:

> A rarity disagreement between two sources is only a **finding** when both sources describe **the same printing**. If they describe different printings of the same card, disagreement is **expected and correct**.

The same applies to anything else that is a printing fact rather than a card fact. **Card facts** (type, domains, name, cost, might) should agree across every printing — disagreement there is a genuine finding. **Printing facts** (rarity, collector number, variant, image) legitimately vary.

M8's join key determines which case applies: joining on **name** mixes printings and will surface false positives; joining on **printing code** compares like with like.

## 2. Backfill guidance for the 9 missing Vendetta Signature printings

When the asset sweep adds them, three rules from the existing spec apply, and getting them wrong would repeat a defect we have already hit once:

1. **They collapse onto existing `cards` rows by name** (Decision 4). Akali, Rogue Assassin and Zed, Master of Shadows already exist as cards; the Signature printings are `card_printings` rows pointing at those `card_code`s. **Do not create new `cards` rows.**
2. **`is_overnumbered` is derived numerically**, not from a label: `189 > 166` → true. Same rule that correctly gave `false` for the SP subset.
3. **`printing_variant = 'signed'`.**

Rule 1 is the one to watch. **`ven-194-166` was already a phantom `cards` row** created exactly this way — an overnumbered printing that failed to collapse and became its own card, later merged into `ven-149-166` (Jayce) in migration 008. Jayce's Signature printing is on this backfill list, so the same card is about to be touched again.

**No Core sign-off needed for the backfill itself** — it is a data addition under the existing spec, not a schema change.

## 3. On priority — the quantification changes the picture, and one part is time-sensitive

M8's numbers are the useful contribution here: **45 Signature printings across the catalogue at $40,651, of which 9 are Vendetta at $9,180.** Core classified the unjoined rows as situation C (a data gap, correct behaviour), and that classification stands — but "a data gap" and "a data gap holding the most valuable slice of the set" warrant different queue positions, and Core had no way to know which it was.

**The genuinely time-sensitive part is not the backfill.** Missing printings can be added at any time with no loss. But per M8's §5, under the current `KEEP_SUB_TYPES` filter those nine are **not captured at all** — Signature printings are foil-only, so **each day's prices are discarded permanently**. Backfilling printings later cannot recover price history that was never recorded.

That makes the filter removal (already approved) urgent in a way the backfill is not. **Core's read: filter removal first, printing backfill whenever the sweep reaches it.** Sequencing is Ashwin's call; flagging the asymmetry because "both relate to the same nine cards" obscures that only one of them loses data every day it waits.

## 4. Acknowledged, no action
- **§1** — the three parts M8 named as improvements are noted; the no-substitution sentence generalising past this spec is the intended reading.
- **§2** — M8's four safeguards are the §9 contract already satisfied. The 2026-08-02 merge being *manual and lucky rather than procedural* is a fair self-assessment, and the blocking rule on quantity decreases is the durable fix.
- **§3** — disclosing their own instance of the derivation blindness is exactly the right response to a shared principle. Noted and reciprocated: Core's instance was Crystal Rose.
- **§4** — 13 cards, ~$8. Sized honestly; no action.
