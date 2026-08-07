# RiftCore: Printing Code Grammar & Translation Spec — **v2 (CONSOLIDATED)**

**Date:** 2026-08-06 · **Supersedes:** the 2026-08-06 spec and Addenda A, B, and C, in full. **Implement from this document only.**
**Why consolidated:** five documents containing one reversal (Addendum B's generalised prefix, withdrawn in C) is itself a drift risk. This is the single implementable artifact.

**Live-validated against two independent populations:** `card_printings` (1,165 rows, M9, live query) and the TCGplayer catalogue (1,422 printings, M8).

---

## 1. Ownership — specification and fixtures, not a function

The translator must exist in **Python** (M9 ingest) and **TypeScript** (app/kernel). A single canonical implementation is therefore impossible, and pretending otherwise guarantees drift.

| Artifact | Owner |
|---|---|
| Grammar, transformation rules, error policy (§3–§7) | **Core** |
| **Conformance fixtures** (§8) | **Core** |
| Python implementation | **M9** |
| TypeScript implementation | **M9 / app** |
| Any further implementation | Its consumer |

**Binding rule: no implementation ships without passing §8 verbatim.** Drift becomes a red test rather than a silently empty join. M9 deletes `to_printing_code()` once a replacement passes.

## 2. Set aliases

**`PG` → `OGS`.** TR 601.3.c.1: *"The Origins supplemental set contained in Proving Grounds (OGS)."* Same product, two labels. **Accept `PG` on input; never emit it.**

Not cosmetic: `OGS-019-024` is **Master Yi, Wuju Bladesman**, banned in 2v2 Constructed. A wrong alias silently drops a banned card from a legality check. *Alias errors are not cosmetic when the aliased card is rules-relevant.*

## 3. Grammar

**Internal** (Supabase `card_printings.printing_code`): lowercase, all hyphens.
**External** (RuneHoard, ROI tracker): uppercase set, slash before total.

```
external := SET "-" NUMBER [ "/" TOTAL ]
internal := set "-" number [ "-" total ]

SET    := 2–4 letters       (OGN, OGS, SFD, UNL, VEN, OP; alias PG→OGS)
NUMBER := (?:sp|[rt])? digits [ letter ] [ "*" ]
TOTAL  := digits            -- the NUMBERING-SPACE total, not the set size
```

Canonical internal regex:
```
^([a-z]{2,4})-((?:sp|[rt])?\d+[a-z]?\*?)(?:-(\d+))?$
```

| Component | Meaning |
|---|---|
| `r` / `t` prefix | Rune / Token numbering — **carries no total** |
| `sp` prefix | Special subset (Crystal Rose) — **carries its own total** (`006` = 6-card subset) |
| trailing letter | alt-art variant. **`[a-z]`, not `[ab]`** — live data reaches `c` (`OP-R06c`) |
| `*` | Signature printing |
| absent TOTAL | rune/token — **not an error** |

**Unknown prefixes must FAIL to parse, not be accepted.** The prefix set is deliberately enumerated rather than generalised: a card form we have never seen is a **finding**, and findings must be loud. (§7 makes this non-blocking.) Note `sp` first in the alternation — ordering is not required today, since `[rt]` cannot match `s`, but it is correct defensively.

**Parse with the regex, never by splitting.** `split('/')` breaks on runes; `split('-')` breaks on foil suffixes.

## 4. Transformation

**External → internal:** lowercase everything; `/` before TOTAL becomes `-`; preserve letter suffix and asterisk verbatim.

**Internal → external:** uppercase **the set prefix only**; restore `/` before TOTAL when present.

> ⚠ **The `.upper()` trap.** `ven-135a-166` → `VEN-135a/166`, **never** `VEN-135A/166`. The set uppercases; the collector-number letter suffix stays lowercase. A whole-string uppercase yields a code RuneHoard will not match — failing with **zero rows, not an error**. This bites hardest at the layer that renders RuneHoard imports.

**Foil suffix `-f`:** strip and return the base printing, **returning a foil flag alongside** rather than discarding it. Core does not model foil as a printing (foil-ness belongs to the physical copy); M8's price spine carries it on `sub_type`. **Never emit `-f` internally.**

## 5. TCGplayer — a third format

TCGplayer supplies **(group_id, number_fragment)**; the set arrives as a group id, and runes arrive as bare `R01`–`R06` with no set information in the code.

```
tcgplayer := (group_id, number_fragment)
  number_fragment := NUMBER [ "/" TOTAL ]        -- no set prefix
                   | NUMBER " // " NUMBER        -- dual-face product, see below
```

- `translate_from_tcgplayer(group_id, fragment)` resolves `group_id` via a **stored** `tcgplayer_groups(group_id, set_code)` mapping — data, not hardcoded. **Unmapped group_id raises.**
- **Dual-face tokens (`T05 // T06`, 15 printings):** this is a TCGplayer *product* identifier, not a printing code. The adapter **splits on ` // `, translates each half, and returns a list**. One product mapping to two cards is a real relationship, not a parse failure. **No grammar change.** Tokens are out of scope for gameplay and pricing, so behaviour beyond the split is the ingest's policy.

## 6. Direction constraints

**Translate from `card_printings.printing_code` only — never from `cards.card_code`.** A `card_code` is a gameplay card **collapsed across printings**; it cannot round-trip. Translating one yields a *plausible-looking string pointing at the wrong physical object* — passes every format check, silently wrong.

**Enforce this with types, not documentation.** `CardCode` and `PrintingCode` must be **distinct types** — TypeScript branded types, Python `NewType`. Passing a `card_code` where a `printing_code` is required must be a **compile error**.

## 7. Error policy — three situations, three behaviours

| Situation | Behaviour | Decided by |
|---|---|---|
| **A. Malformed input** — `VEN-?/166`, empty, unknown prefix | **Raise** | the **function** |
| **B. Insufficient source data to construct a code** | **Return null; record the row with a null code** — never drop it | the **caller** (ingest policy) |
| **C. Well-formed code with no matching printing** — e.g. `ven-189*-166` | Return the code; the join finds nothing. This is a **data gap** | neither — it's a finding |

**The function is strict; the caller sets policy.** The ingest **must** catch A, or the daily job aborts on the first unresolvable promo code.

**No-substitution prohibition:** the translator must never return an approximate, nearest, or base-printing substitute for a code that does not resolve. Permitted outputs are the exact translation, a raise (A), or null-by-caller-policy (B). A helpful fallback converts a **visible gap into a wrong answer**, and would do so on the highest-value rows in the catalogue.

## 8. Conformance fixtures — every implementation passes these unchanged

Ordered by risk.

| # | Case | External | Internal | Note |
|---|---|---|---|---|
| 1 | Signature asterisk | `SFD-227*/221` | `sfd-227*-221` | Ahri, Inquisitive — $3,089 |
| 2 | Signature asterisk | `OGN-303*/298` | `ogn-303*-298` | |
| 3 | Signature asterisk | `VEN-189*/166` | `ven-189*-166` | |
| 4 | Signature asterisk | `UNL-234*/219` | `unl-234*-219` | |
| 5 | Alt-art, case preserved | `VEN-135a/166` | `ven-135a-166` | **must not become `135A`** |
| 6 | Alt-art | `SFD-110a/221` | `sfd-110a-221` | |
| 7 | **Rune suffix beyond `b`** | `OP-R06c` | `op-r06c` | `[a-z]`, not `[ab]` |
| 8 | Rune, no total | `VEN-R01` | `ven-r01` | |
| 9 | Rune variant | `VEN-R03a` | `ven-r03a` | |
| 10 | Token, no total | `UNL-T01` | `unl-t01` | |
| 11 | **Special subset** | `VEN-SP1/006` | `ven-sp1-006` | total = subset size |
| 12 | Standard | `VEN-142/166` | `ven-142-166` | |
| 13 | Promo prefix | `OP-041/166` | `op-041-166` | |
| 14 | Starter | `OGS-009/024` | `ogs-009-024` | |
| 15 | **Alias, input only** | `PG-019/024` | `ogs-019-024` | must not round-trip to `PG` |
| 16 | **Foil, strip + flag** | `VEN-081/166-f` | `ven-081-166` + `foil=true` | never emit `-f` internally |
| 17 | **Dual-face (TCGplayer)** | `(group, "T05 // T06")` | `[…t05, …t06]` | returns a **list** |
| 18 | **Forward-looking** | `VEN-135a*/166` | `ven-135a*-166` | **zero occurrences** in both populations as of 2026-08-06. Do not delete as redundant |
| 19 | **Round-trip** | all above | — | external→internal→external equals input, except #15 (`PG`→`OGS`), #16 (`-f`→flag), #17 (list) |
| 20 | **Malformed** | `VEN-?/166` | — | **must raise** (2026-08-02 placeholder) |
| 21 | **Malformed** | `` (empty) | — | must raise |
| 22 | **Unknown prefix** | `VEN-ZZ1/006` | — | **must raise** — new forms are findings |

## 9. Consumer contract (beyond the grammar)

**A raise on malformed input is necessary but not sufficient.** In the 2026-08-02 incident the damage came *after* resolution: the resolved codes already existed in Holdings, and **merging rather than overwriting** is what saved five cards. Not merging would have written Arena Kingpin as 1 instead of 5 with no error.

> **Any consumer resolving a placeholder or importing a translated code must check for a pre-existing row before writing, and merge rather than overwrite.**

This belongs to the consumer, not the grammar — it is the half of the lesson a fixture cannot encode.

## 10. Derivation principle (from the Crystal Rose finding)

**Any attribute derived from one signal is blind to instances carried by a different signal.** The seed derived `printing_variant` from a trailing parenthetical in the source name; Crystal Rose printings carry none, so all six defaulted to `base` — nothing diverged, no gate fired, the data was wrong and looked fine.

**Variant derivation must cross-check the name parenthetical against the code shape, and a disagreement between them is itself a finding.**

## 11. Validated state as of 2026-08-06

| Check | Result |
|---|---|
| `card_printings` shapes | 1,014 standard · 102 alt-art · 36 signature · 7 rune/token · 6 `sp` = **1,165** ✓ |
| M8 Holdings conformance | **614 / 614 parse**, zero failures |
| Letter suffix **and** asterisk together | **0** in both populations (1,165 and 1,422) |
| `-f`, uppercase, or `pg-` in `card_printings` | **0** on all three |
| Set coverage gap | `card_printings` holds only OGN/OGS/SFD/UNL/VEN; TCGplayer also carries OPP, PR, JDG, SGN, RWB |
| Vendetta Signature printings | **0 exist** — `ven-189*-166` / `ven-191*-166` translate correctly and resolve to nothing (situation C) |

## 12. Open, not blocking
- Set-coverage gap (promo sets absent from `card_printings`) — tracked on the asset-migration sweep.
- `tcgplayer_groups` mapping table — owner of the price spine; fixtures for §5 added once group ids are known.
