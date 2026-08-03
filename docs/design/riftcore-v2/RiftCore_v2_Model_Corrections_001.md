# RiftCore v2 — Model Corrections 001 (adjudication of PR #151 Tier A escalations)

**Verdict: all five escalations are UPHELD. These are errors in the canonical model (Parts 1–7), not in the code.** Each was re-read against the CR text before ruling. This doc is both the adjudication and the Code instruction to implement the corrections.

Under the defect-measurement contract these are **four confirmed Core faults** (three model errors + one omission), surfaced by golden tests derived from the rules author's own worked examples. That is the mechanism working exactly as designed: tests written from an independent source caught reading errors that tests written from our own model could not have caught.

---

## Adjudication 1 — CR 476: the fixed point belongs INSIDE Layers ⭐ UPHELD

**Escalation:** `layers.ts:16-21` puts the repeat-until-stable loop outside Layers, delegating to a conditional-passive driver implemented nowhere; `PassiveAbility.condition`/`.layerEffects` exist but nothing evaluates them. Both CR 476.3 Fiora examples fail.

**CR text:** 476 — "The layers are applied repeatedly until all effects operating on objects have been applied once and no changes have been processed." 476.2 — "When a sequence of applications completes, **recur the process, and evaluate each layer again applying any effects that may now be applicable**." The Fiora example is explicit: buff raises Might in Arithmetic → "**The Ability-Altering Effect layer is then re-checked** and the abilities Deflect, Ganking, and Shield applied."

**Ruling: Code is correct.** Part 1 §7 stated the fixed point correctly ("iterated to a fixed point (476)") but **Part 7's type spec never wired conditional passives into `applyLayers`** — I specified the loop and left the thing the loop exists to re-evaluate dangling in the schema. Relocating the fixed point outside Layers is not faithful to 476; a conditional passive's *effects* must be re-derived on every iteration.

**Correction:** `applyLayers` owns the whole fixed point. On each iteration it re-evaluates every `PassiveAbility.condition` against the current state and emits or withdraws that ability's `layerEffects` before the layer sequence runs. No external driver. 476.3's "removal or disqualification of an effect is separate from the application of the effect, but still can only be applied once" governs the withdrawal path — an effect that stops qualifying is withdrawn, and neither its application nor its withdrawal repeats.

## Adjudication 2 — CR 477.3.b: snapshots are per-object ⭐ UPHELD

**Escalation:** `LayerEffect.snapshotted?: number` is scalar, so a multi-target limited effect snapshots once against `targets[0]` and applies that delta to everyone. Measured: "-4 to min 1" over a 2M and a 9M unit leaves the 9M unit at 8, not 5.

**CR text:** 477.3.b — "it is limited **at the time of its application**, and is 'remembered' at that limited level for the duration of its effect." The limitation is computed per application, and an application is per-object.

**Ruling: Code is correct.** A scalar cannot represent per-object limitation. The measured 9M→8 result is wrong; correct is 9→5 (a -4 that never hits the floor) alongside 2→1 (a -4 limited to -1).

**Correction:** `LayerEffect.snapshotted?: Record<ObjectId, number>` — one remembered delta per affected object, written at first application to that object and immutable thereafter for the effect's duration.

## Adjudications 3–5 — CR 465.2.c.5: damage replacement needs an ordered list ⭐ UPHELD

**Escalation:** `GameObject.preventValue` is a single reduce-only scalar; "double all damage dealt to it" is inexpressible, and 465.2.c.5's third example has prevent **and** doubling both applying at assignment in the controller's chosen order (4 vs 6 assigned).

**CR text:** 465.2.c.5 — replacement effects apply **at assignment**, minimum-lethal is computed **through** them, and **multiple replacement effects on one unit apply in the order chosen by that unit's controller**.

**Ruling: Code is correct, and the diagnosis is mine to own.** Part 4 §2 identified replacement effects as "a first-class subsystem" with ordering by the acted-upon object's controller — then Part 7 gave `GameObject` a single `preventValue` field. I half-implemented my own finding. A second scalar would not fix it; order-dependence between heterogeneous replacements requires a list.

**Correction:** replace `preventValue` with an ordered list of assignment-time replacements on `GameObject`, each a `ReplacementEffect` reference with its own residual state (Prevent's decrementing value per 437.3, `"all"` never lethal per 437.5.b). `legalDamageAssignments` computes minimum-lethal by applying the list **in the affected unit's controller's chosen order**. Where order is ambiguous, the controller chooses; expose the choice rather than fixing an arbitrary order.

## Bonus correction — CR 477.3.e was missing from the model entirely

Code's bug fix #1 (`orderedArithmetic`) corrected a real defect, but the underlying cause is a Phase-1 omission: **Part 1 §7 never recorded 477.3.e** — the Arithmetic layer applies **all increases first, then all decreases**, each snapshotting independently (477.3.e.1–.2). I documented layers 1/2/3 and the snapshot rule but not the sublayer split. Now recorded; keep the implemented fix.

---

# Code instruction

Same branch and PR (`fix/rules-clarification-name-based-identity`, PR #151) if not yet merged; otherwise a new `fix/rules-clarification-layers-and-replacements` off `integration` with PR title **"Rules Clarification: Layers fixed point + per-object snapshots + assignment-time replacements"**.

## 1. `applyLayers` owns the fixed point (CR 476)
Move the repeat-until-stable loop **into** `layers.ts`. Each iteration: (a) re-evaluate every `PassiveAbility.condition` against current state, emitting/withdrawing its `layerEffects`; (b) run layers 1 → 2 → 3; (c) repeat until a pass produces no change. Each effect applies at most once (476.1); withdrawal is separate from application and also happens at most once (476.3). Delete the external conditional-passive driver hook.
**Un-skip both CR 476.3 Fiora goldens.** They are the acceptance test.

## 2. Per-object snapshots (CR 477.3.b)
`LayerEffect.snapshotted?: Record<ObjectId, number>`. Write the limited value on first application **to each object**; remember per object for the effect's duration. **Un-skip the multi-target golden**; assert 2M→1 and 9M→5 from one "-4 to min 1".

## 3. Assignment-time replacements (CR 465.2.c.4.a, .c.5)
Replace `GameObject.preventValue` with an **ordered list** of assignment-time replacement effects (prevent, double, and future kinds), each carrying its own residual state. `legalDamageAssignments` must compute minimum-lethal **through** the list, in the **affected unit's controller's chosen order**; surface that ordering choice rather than hardcoding one. Preserve: Prevent decrements as it absorbs (437.3); `"all"` is never lethal (437.5.b).
**Un-skip goldens 3–5**, including 465.2.c.5's third example (prevent + doubling → 4 vs 6 assigned depending on order).

## 4. Record 477.3.e
Keep `orderedArithmetic`; add a `/** CR 477.3.e — increases first, then decreases; each snapshots independently */` comment so the rule is traceable at the code.

## 5. Escalation handling (decision 2 answered)
**Keep `describe.skip`** — a permanently-red suite stops being a signal, and CI only runs `tsc`. But skipped-forever is invisible, so: every skipped Tier A block must carry a `// ESCALATED — Model Corrections 001, adjudication N` comment, and **this instruction resolves all five**, so after this task **zero Tier A blocks remain skipped**. If a future escalation is raised, the same convention applies and it goes into a numbered Model Corrections doc rather than sitting silently.

## Done =
`tsc --noEmit` clean; **all five previously-skipped Tier A goldens un-skipped and passing**; no new skips; suite green; diff limited to `src/lib/core/**` and `docs/**`; this doc committed to `docs/design/riftcore-v2/`.

## Report back
Confirm each of the five goldens now passes, and flag anything where making it pass required a further model change beyond the four corrections above — that would be a sixth escalation, not a coding decision.
