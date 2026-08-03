# RiftCore v2 — Mechanics-Layer Test Plan

**Where this lands:** branch `fix/rules-clarification-name-based-identity`, added to the **existing PR #151** (name-identity fix). PR title: **"Rules Clarification: name-based identity + mechanics-layer test suite"**. No new branches or PRs. Note the prefix must be `fix/` — `rules-clarification/*` is rejected by `enforce-branch-flow.yml` and skips typecheck.

**Scope:** the rules kernel only. **Card interaction tests are deliberately excluded** — `CARD_EFFECT_REGISTRY` is empty until Phase 4 (Supabase), so any test needing a specific card's effect program waits. The 12 quarantined register questions stay quarantined.
**Ordering:** by blast radius — Layers → Damage Assignment → Cleanup → Scoring → then the rest.

---

## 0. Why golden tests come first

A test written from the same reading that produced the code inherits that reading's blind spots. If Phase 1 misread a rule, a test derived from Phase 1 confirms the misreading and Core's measured error rate reads zero while the fault sits there — the precise failure the defect contract exists to prevent.

The escape is a source independent of our interpretation. **The CR contains the rules author's own worked examples with stated answers.** Those are ground truth we did not write. **Tier A tests below transcribe them verbatim** — expected values come from the CR, never from our model.

**Rule for Tier A: if a golden test fails, the code is wrong until a human adjudicates otherwise. Never "fix" a golden test to match the implementation.**

Test tiers used throughout: **A** = CR worked example (golden) · **B** = systematic coverage of a stated rule · **C** = adversarial/edge/negative.

---

## 1. Layers (CR 473–480) — highest blast radius

### Tier A — golden (verbatim from CR)
| # | CR | Setup | Expected |
|---|---|---|---|
| L-A1 | **477.3.b** | "-4 [M] to a min of 1 this turn" applied to a **2 [M]** unit | Effect **generates -1 [M]**, and stays -1 for the duration **even if base Might later changes** |
| L-A2 | **477.1.a.1** | Spell: "A unit's Might becomes 4 this turn" | Might set to 4 **in Layer 1**, before all arithmetic, regardless of cast order |
| L-A3 | **476.3** | Fiora, Victorious, printed 4 [M], "While I'm Mighty, I have Deflect, Ganking, Shield"; a buff is placed | Buff applies in Arithmetic (layer 3) → Might 5 → **re-iterate**: Ability-Altering layer now grants Deflect/Ganking/Shield |
| L-A4 | **476.3** | Buffed Fiora **in combat as defender**, buff removed | Re-evaluate: loses Deflect/Ganking/Shield in layer 2, **then** Shield's +Might no longer applies in layer 3 — cascade in the correct direction |
| L-A5 | **477.1.c** | Permanent: "Other friendly units are Yordles" | Tag granted in **Layer 1** |
| L-A6 | **477.2.b** | Permanent: "Other friendly units have [Vision]" | Keyword granted in **Layer 2** |
| L-A7 | **477.3.c** | Last Stand ("Double a friendly unit's Might this turn") targets a **2 [M]** unit; opponent reacts with an effect making it negative before resolution | Double applies to the **current** value; **increase-by-negative → 0**, never a negative increase |
| L-A8 | **477.3.b** | "Units you control here have their Might increased to 5 [M]" (passive) | **Passive → no snapshot**; continuously re-evaluated as the unit's Might changes |

### Tier B — systematic
- Layer sequence: a Layer-1 set-Might applied *after* a Layer-3 arithmetic in timestamp order still resolves **first**.
- Fixed-point convergence: each effect applied exactly once per pass; iteration halts when a pass produces no change.
- Snapshot durability: snapshotted delta survives base-Might changes; expires exactly at its `Duration`.
- Passive vs non-passive: identical text, one passive one not — passive re-evaluates, non-passive snapshots.
- Same-layer conflict: dependency ordering (478–479); fall back to timestamp (480).
- Negative Might: unit reaches -2 and is a legal state (477.3.c).

### Tier C — adversarial
- Mutual dependency between two Layer-2 effects → must terminate (no infinite loop), deterministic result.
- Effect whose source leaves the board mid-iteration.
- Set-Might and a snapshot-limited arithmetic on the same unit in both orders → identical result.
- Zero-effect fixed point: `applyLayers` on a clean state is a no-op (idempotent).
- 100 stacked arithmetic effects → no perf cliff, no overflow.

---

## 2. Damage assignment (CR 465.2.c + 815/826) — the live-bug subsystem

The `tierOf` printed-Tank defect landed here. Highest test density.

### Tier A — golden (verbatim)
| # | CR | Setup | Expected |
|---|---|---|---|
| D-A1 | **465.2.c.3** | 5 damage among **four 3 [M]** units | **Illegal:** 2/1/1/1. **Legal:** ≥3 to one, remainder to the next |
| D-A2 | **465.2.c.4** | 5 damage among four 3 [M] units **each already marked with 1 damage** | May **not** assign more than **2** to any of them |
| D-A3 | **465.2.c.4.a** | 3 [M] unit with "Double all damage dealt to it this turn"; other undamaged units share its controller | Assignable values are **only 1 or 2** (→2 or 4 dealt); **minimum lethal = assign 2** |
| D-A4 | **465.2.c.5** | 2 [M] unit with "prevent the first 3 damage I would take each combat" | Needs **5 assigned** for lethal |
| D-A5 | **465.2.c.5** | Attacker with 3 [M] vs two 2 [M] defenders, one with "Double all damage dealt to it" | Assign **2** to the plain unit, then **1** to the doubling unit (doubles to 2) |
| D-A6 | **465.2.c.6** | One Tank, one Backline, one plain unit | Order **must** be Tank → plain → Backline |
| D-A7 | **465.2.c.7** | **Two** Tanks + one plain unit | Either Tank may go first; then the **other Tank**; then plain |
| D-A8 | **465.2.c.8** | Caitlyn with **both** Backline (printed) and Tank (granted), plus two plain units | Assigner picks **first or last** — **never in between**. Both are legal; the middle is not |

### Tier B — systematic
- Lethal-first is universal, not Tank-specific (465.2.c.3).
- Over-assignment permitted **only** when every remaining unit already has lethal (465.2.c.4).
- **Printed Tank** and **granted Tank** tier identically ← *regression for the `tierOf` bug*.
- Three tiers distinct: Tank / ordinary / Backline (826.3) — assert an ordinary unit is **not** treated as Backline.
- Stun: contributes **0 Might** to the attacker's pool (423.1.b) but still needs **full printed Might** in damage to die (423.1.c).
- Assign-all-then-deal: no death is evaluated until every assignment is made (465.2.c.1).
- Both players assign; Attacker (the **contest-applier**, 464.2.c.1) assigns first.

### Tier C — adversarial / negative
- Damage < smallest lethal → legal assignments exist but nothing dies.
- Zero total Might → empty assignment, no error.
- All defenders have Prevent "All" → **never lethal** (437.5.b); assignment still legal.
- A unit with Prevent whose value partially absorbs, then decrements (437.3).
- Every unit is a Tank; every unit is Backline; one unit total.
- Negative-Might unit as a damage target.
- **Negative:** any assignment violating c.3/c.4/c.6 is rejected by `legalDamageAssignments` and never returned.

---

## 3. Cleanup ordering (CR 318–324)

### Tier A/B — the seven-step order (323)
- **Win check runs FIRST** (323.1) — a player at threshold wins before any board change in the same Cleanup.
- **Deathknell noted (3a) BEFORE lethal kills (3b)** — trigger captures the dying unit's **location and attributes** (808.1.d.2–.3).
- Step order end-to-end: win → designation sync → deathknell/kill → control loss → recall sweep + hidden purge → Showdown staging → Combat staging.
- Fixed-point re-run: a Cleanup that changes state re-runs (322); a stable state runs once.
- Cleanup ↔ chain exclusion: no Finalize/Resolve while a Cleanup runs (320–321).
- Trigger invocations (319): open/closed transition, phase transition, pending item added, item finalized, item leaves chain, board entry/exit, status change, move completed.
- **End-of-turn Special Cleanup (317.2):** Heal all Units · "this turn" effects expire simultaneously · Rune Pools empty · **stun clears at step 3d** (423.1.a.2).
- Control lost only when unoccupied **and** Open **and** no ongoing Showdown/Combat (190.4.c).

### Tier C
- Cleanup cascade: a kill in one Cleanup triggers a Deathknell that kills again → terminates, correct order.
- Simultaneous lethal on both sides → both die, both Deathknells captured.
- Win check with **tie** at threshold → **no winner** (472, strict majority) and the Cleanup proceeds.

---

## 4. Scoring & win (CR 467–472)

### Tier A/B
- **Hold is unrestricted** (471.1.a.1): at VictoryScore−1, a Hold scores the final point with **no** every-battlefield condition.
- **Conquer at ≥ VictoryScore−1**: scored every battlefield this turn → **final point**; otherwise → **draw a card instead** (471.1.b.1).
- Below VictoryScore−1, Conquer is unrestricted.
- **Once per battlefield per turn across both methods** (470): conquer then hold the same battlefield → second scores nothing.
- **Win = points ≥ VictoryScore AND strictly greater than every opponent** (472), evaluated at Cleanup step 1 — **not** on point-landing.
- Scoring abilities fire per method, max once per turn per player (471.2.c).
- `FormatContext.victoryScore` drives everything (2v2 = 11) — nothing hardcodes 8.

### Tier C
- Tie at threshold → no win; game continues.
- Both players cross threshold in the same Cleanup → strict majority decides; equal → no winner.
- **Burn Out (431):** deck-out → recycle trash randomized → **an opponent gains a point** → repeat; points after the first are **unpreventable** (431.3.b). Assert deck-out is **not** a loss.
- Score with zero battlefields controlled; score on a battlefield that becomes uncontrolled in the same Cleanup.

---

## 5. Remaining subsystems (Tier B/C)

**Turn states & timing (307–313):** four states gate speed — Closed ⇒ Reaction only; Showdown Open ⇒ Action or Reaction; Neutral Open ⇒ anything with Priority. **Negative:** an Action-speed card is rejected in a Closed state. Priority/Focus are independent slots; Focus grants Priority (313.2); **passing Priority retains Focus** (313.3); Focus is null in Neutral (313.5). Activated abilities: **own turn + Open State only** (381).

**FEPR (332–340):** FIFO finalize (337.1.b) vs LIFO resolve (340.1) — assert with 3+ items that finalize and resolve orders are **opposite**. Units/Gear/resource-Adds **resolve immediately on finalization** (337.2, 400.2) and are therefore **never counterable** (negative test on `Counter`). Tasks pre-empt chain work (334). Focus-pass exceptions for trigger- and Add-opened chains (346.1).

**Rune economy (160–168):** Pool empties at **Main-Phase start and turn end** (167) — floating resources lost. Channel 2 in Channel Phase; short deck → as many as possible. Basic runes are **Reaction Adds** usable **mid-payment** (357.1.a, 444.2.c). Recycle → **bottom**; Main randomized, Rune **owner-ordered** (416.5).

**Keywords (800s):** Assault/Shield/Deflect/Hunt **sum** (golden: **814.2** Stalwart Poro + Block = **Shield 4**); Tank/Ganking/Temporary/Ambush/Backline redundant; Deathknell/Vision trigger **per instance**. Assault applies only while attacker, Shield only while defender. `isMighty` = Might ≥ 5 (708); **"becomes Mighty" fires only on the <5→≥5 transition** — 5→6 does **not** re-trigger (709); non-board zones use **printed** Might (711).

**Buffs (701–705, 426.1):** cap 1; **buffing an already-buffed unit means the buff did not happen** — "if it was buffed this way" fails and "when you buff me" does **not** trigger (426.1.c). Buff = +1 Might; removed when the unit leaves play.

**Stun (423):** cannot re-stun; **re-stunning fires no trigger** (423.1.a.1); clears at end-of-turn Cleanup step 3d (423.1.a.2).

**Object identity (124):** any zone change to/from a **Non-Board** zone mints a **new ObjectId** and wipes damage, counters, granted keywords, statuses. **Negative:** damage does **not** survive a hand→board round trip.

**Deck validation (103, TR 402/601):** exactly 40 **including** the Chosen Champion; ≤3 per **name** (reprint case: 2+2 of one name across sets is **illegal** — *already covered by the #151 regression tests; extend, do not duplicate*); ≤3 signatures matching the Legend's champion tag; exactly 12 runes; **multi-domain cards require ALL domains in identity** (103.1.b.4); unique battlefield names; ban legality. **Negative:** 41-including-champion rejected; sealed/draft construction **not** implemented (deferred guard).

**Predicates/selectors:** JSON round-trip preserves evaluation (a round-trip test exists from #148 — **extend** to every union member, don't rewrite). `isChosenChampion` (#151) is name+supertype across **any zone** (CR 103.2.a.3) — add zone-coverage cases. `hasKeyword` = **printed ∪ granted minus Layer-2 removals**. `unitsControlledBy` returns **board units only**, never hand ← *regression*. **Negative:** no predicate or selector can reach **Contested** or the staging marks (190.3.d) — `OBJECT_STATUSES` regression test.

---

## 6. Conventions

- Every test names its rule: `it("CR 465.2.c.3 — lethal-first: 5 damage among four 3M units may not be 2/1/1/1", …)`.
- Tier A tests carry a `// GOLDEN — expected value from CR text, do not adjust to match implementation` comment.
- Failures on Tier A escalate to human adjudication (they may reveal a **Phase-1 reading error**, which is a Core fault worth recording).
- Test data uses synthetic objects, never `cards.json` — the kernel stays catalog-free.
- Prefer table-driven cases for the assignment matrix; each row cites its rule.

## 7. Suggested sequencing
1. Layers Tier A (8 golden) → Tier B → Tier C.
2. Damage assignment Tier A (8 golden) → B → C. *Highest defect density; a live bug already found here.*
3. Cleanup ordering.
4. Scoring & win.
5. §5 subsystems, in the order listed.

## 8. Out of scope (explicit)
Card effect programs · the 12 quarantined register questions · sealed/draft construction · RiftEngine inference · anything requiring `CARD_EFFECT_REGISTRY`.
