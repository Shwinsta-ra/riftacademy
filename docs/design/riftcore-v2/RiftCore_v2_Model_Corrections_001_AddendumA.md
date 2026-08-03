# RiftCore v2 — Model Corrections 001, Addendum A: damage-quantity vocabulary (CR 465.2.c.5)

**Question raised by Code (PR #151):** CR 465.2.c.5 reports three different figures for the same event. Code inferred **assigned = prevented + dealt** and asked for confirmation, noting the CR never states it outright.

**Ruling: CONFIRMED.** The identity holds against all three worked examples in 465.2.c.5 plus the assignment examples in .c.4.a. The implementation stands.

## Why it holds — all four CR examples

| CR example | raw | assigned | prevented | dealt | assigned = prevented + dealt |
|---|---|---|---|---|---|
| 2M unit, "prevent the first 3 damage each combat" | 5 | 5 | 3 | 2 | 5 = 3 + 2 ✓ |
| 3M attacker vs two 2M defenders, one doubling | 1 (to the doubler) | 2 | 0 | 2 | 2 = 0 + 2 ✓ |
| 2M unit, prevent 2 **then** Lotus Trap double | 3 | 4 | 2 | 2 | 4 = 2 + 2 ✓ |
| 2M unit, Lotus Trap double **then** prevent 2 | 3 | 6 | 2 | 4 | 6 = 2 + 4 ✓ |

## The three quantities — codify these names, they are distinct

The CR uses "assigned" for two different things in adjacent sentences, which is what made this ambiguous. Three quantities must be tracked separately:

1. **Raw** — what the assigning player spends from their Might pool. Conserved: in the two-defender example the attacker's 3 Might is spent as 2 + 1, and the doubling does **not** let them spend more than 3.
2. **Assigned** — the post-replacement figure the CR reports, equal to **prevented + dealt**. It may **exceed** the assigner's pool (raw 3 → 6 assigned under double-then-prevent). It is an accounting figure, not a budget.
3. **Dealt** — what actually lands on the unit and marks damage.

**Lethality is tested on `dealt`, never on `assigned`.** Example 1 makes this unambiguous: a **2 Might** unit "would need to be assigned **5** damage in order to have lethal damage assigned to it" — if lethality tested `assigned ≥ might`, 2 would suffice. It takes 5 because 5 assigned yields **2 dealt**, and 2 dealt is lethal for a 2 Might unit.

This is exactly what Code implemented: `minimumLethal` searching for the smallest **raw** assignment whose **dealt** result reaches lethal, computed through the ordered replacement chain.

## Consequences to preserve
- The assigner's budget is spent in **raw** units; over-assignment limits (465.2.c.4) are evaluated against **minimum-lethal in raw terms** — hence the 3M doubler's assignable set being exactly {1, 2}.
- Ordering the replacement list changes both `assigned` and `dealt` (4/2 vs 6/4). The affected unit's controller chooses the order (465.2.c.5), which `orderDamageReplacements` correctly surfaces rather than fixing.
- If a future replacement kind is neither purely reductive nor purely multiplicative, re-verify the identity against it before assuming it carries over.

## Naming
Use `raw`, `assigned`, `dealt` verbatim in code and tests. Do not use "assigned" for the raw pool spend anywhere — that overload is the source of the original ambiguity. Where a test asserts the 3M-doubler case, state it as "raw 2 → 4 dealt" rather than "assigned 2".

**No sixth escalation.** This was an inference gap in the CR's prose, resolved by reconciling its own examples — the correct method, and the conclusion is sound.
