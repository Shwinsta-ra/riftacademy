# RiftCore v2 — Phase 2: Diff vs. Legacy `src/lib/core/`

**Method:** the Phase-1 canonical model (Parts 1–7) was built clean-room. Only now is the legacy code opened. Every row cites **legacy `file:line`** and the **CR rule** it is measured against.
**Legacy surface:** `schema.ts` (440 lines), `rulesKernel.ts` (1011), `effects.ts` (207), `cards.ts` (115), `migrate.ts` (35), `index.ts` (37), tests (~1,050 lines / 991 passing).

Buckets per your instruction: **MATCH** (keep behavior, rename to CR vocabulary) · **MISSING** (build fresh) · **CONFLICT** (drop the test, rebuild as-if-missing).

---

## 1. MATCH — validated behavior, keep, rename only

> **Correction (post-review).** An earlier summary of this section claimed "damage, lethality, stun, keyword bonuses, affordability, LIFO — all validated and kept." That was too clean. **Four of those are PARTIAL**, and re-checking surfaced two CR rules missed in the Phase-1 read. Corrected table below; partial rows are marked **⚠ PARTIAL** and their missing halves are listed in §2/§3.
>
> **Two Part-5 omissions found during this re-check (Stun):**
> - **CR 423.1.a.2 — Stunned units lose the status during step 3d of the end-of-turn Cleanup.** Stun has a defined lifetime; Part 5 recorded none, and the legacy has no clearing logic. (Also refines Part 3 §9: the Expiration Step's 3d does double duty — "this turn" effects expire *and* stun clears.)
> - **CR 423.1.a.1 — a Stunned unit cannot be Stunned again**, and re-stunning does **not** fire "when you stun" triggers (Eclipse Herald example). This is the same already-in-state pattern as Buff (426.1.c).
>
> **One inference upgraded to verified:** Shield summing was inferred by analogy in Part 5; **CR 814.2 confirms it explicitly** (Stalwart Poro + Block → Shield 4).

| Legacy | Evidence | CR | Action |
|---|---|---|---|
### Full matches
| Legacy | Evidence | CR | Action |
|---|---|---|---|
| Negative Might allowed | `rulesKernel.ts:67` `trueMight` signed; test "may go negative when no mod carries a floor" | **477.3.c** (CR's own example shows a unit at -2) | Keep. Now CR-cited rather than ruling-cited |
| Assault attacker-only, values **sum** | `rulesKernel.ts:55-70` `sumKeywordValue` | **807.1.c / 807.2** | Keep; `stacking:"sums"` |
| Shield defender-only, values **sum** | same | **814.1.c / 814.2** (verified this pass) | Keep; `stacking:"sums"` |
| `pointsToWin` configurable, not hardcoded | `schema.ts:192+`; test "scales with a non-default pointsToWin (2v2, 11)" | **483** Modes of Play | Keep → `FormatContext.victoryScore` |
| `foldEvents` record-don't-skip + `UnrecognizedEvent` | `rulesKernel.ts:588` | pipeline contract (our own) | Keep unchanged — not a CR concern |
| Null-`cardId` guard scoped to own hand via `findHandOwner` | `rulesKernel.ts:363` | — | Keep; verified correct in PR #134 review |

### ⚠ Partial matches — correct as far as they go, but incomplete
| Legacy | What matches | What's MISSING (→ bucket) |
|---|---|---|
| **Lethality** — `isKilled` = damage > 0 && damage ≥ might (`rulesKernel.ts:77`) | Matches the **dealing-step** predicate, **465.2.c.2** | (a) **Prevent "All" is never lethal** (437.5.b); (b) at the **assignment** step, minimum-lethal must be computed **through replacement effects** (465.2.c.4.a, .c.5) — a different, richer computation than this predicate. → §3 |
| **Stun** — 0 damage contributed; full Might still needed to kill (`rulesKernel.ts:72-75`, `stunned:boolean` `schema.ts:128+`) | Both **combat** rules match exactly: **423.1.b**, **423.1.c** | The **lifecycle**: no clearing at end-of-turn Cleanup step 3d (**423.1.a.2**); no "cannot re-stun / re-stun doesn't trigger" (**423.1.a.1**). → §3 |
| **Keyword detection** — `hasKeyword` (`rulesKernel.ts:61-65`) | Correct *for granted keywords* | Reads **only `keywordGrants`**; printed keywords exist solely as `static` registry entries (`effects.ts:189+`), covering **15 of 928 cards**. Validated for the modeled subset, not generally. → §2.7 / Phase 4 |
| **Affordability** — `canAfford`/`pickPaymentRunes` (`rulesKernel.ts:169-207`) | Concrete-domain pip-first algorithm matches **163.1–163.2** | Cost model can't express **`[C]` (self-domain) or `[A]` (any)** (805.1.a.1); payment is **static** where the CR is an **interactive window** admitting Reaction-Adds (357.1.a, 444.2.c). → §2.11 / §3 |
| **Simultaneous damage** — `resolveCombat` (`rulesKernel.ts:138`) | Assign-all-then-deal ordering matches **465.2.c.1** | The assignment feeding it is the wrong two-tier model (§2.5), and replacement-at-assignment is absent (465.2.c.5) |
| **LIFO resolution** | Asserted correctly (**340.1**) in `schema.ts:184` comment + mod ordering | There is **no FEPR engine** to validate it against — what survives is the *principle*, not an implementation. → §3 |

## 2. CONFLICT — drop the test, rebuild as-if-missing

### 2.1 ⭐ Might resolution: chain-fold + per-mod floor → **Layers + snapshotting**
- **Legacy:** `rulesKernel.ts:43-48` `resolveMightChain` reduces mods in order, clamping the *running total* at `mod.floor` when that mod resolves; a **later mod can push the total back below the floor**. Test: `rulesKernel.test.ts` *"applies a per-effect floor only at the moment that mod resolves — order-dependent (seq-mind-1)"*.
- **CR 473–480:** effects apply in **three ordered layers** (Trait → Ability → Arithmetic), **iterated to a fixed point** (476). A **non-passive limited arithmetic effect snapshots at application and is remembered at that limited value for its duration** (477.3.b): "-4 [M] to a min of 1" on a 2-Might unit **generates -1 [M]**, permanently -1 for the duration. Passive abilities do **not** snapshot.
- **Difference:** legacy clamps a *running total*; CR snapshots a *per-effect delta*. These diverge whenever a later effect changes the base — the legacy total can be re-pushed below the floor, the CR delta cannot.
- **Action:** delete `resolveMightChain`, `MightMod.floor`, and `UnitState.mightMods`. Rebuild as `applyLayers` + `LayerEffect.snapshotted`. **Drop the seq-mind-1 test** and re-derive that puzzle (register #1).

### 2.2 ⭐ `SetMight` is arithmetic → **must be Layer 1 (Trait-Altering)**
- **Legacy:** `effects.ts:19` `{ op:"SetMight"; toSourceUnit:true }` folded through the same might chain. Test: *"Convergent Mutation copies the resolved source Might onto the target"*.
- **CR 477.1.a.1:** "A unit's Might becomes 4" is resolved in **Layer 1**, i.e. **before all arithmetic regardless of cast order**.
- **Action:** reclassify as `TraitOp.set:"might"`. Drop the test; re-derive Convergent Mutation.

### 2.3 ⭐ `WinningLine` taxonomy → **CR 471 final-point rule**
- **Legacy:** `schema.ts:220-230` + `rulesKernel.ts:234-275` `canScoreWinningPoint`. Keys off `pointsAtTurnStart` (`schema.ts:153+`, snapshotted on phaseChange), treats **hold** as a restricted line (`holdAtSeven`), hardcodes `state.battlefields.length === 2`, and has no draw-consolation. Six tests encode it.
- **CR 471.1:** restrictions gate **Conquer ONLY** — **Hold is explicitly unrestricted** (471.1.a.1). The gate keys on **current point total ≥ VictoryScore − 1** (not turn-start), and the condition is **"Scored EVERY Battlefield this turn"** (either method — which generalizes `conquerBothAtSix`/`holdOneConquerOneAtSix` to any battlefield count). Failing it → **draw a card instead** (471.1.b.1).
- **Action:** delete `WinningLine`, `canScoreWinningPoint`, and `PlayerState.pointsAtTurnStart` entirely. Rebuild as `resolveScore()` (Part 7 §10). **Drop all six tests.** Re-derive every winning-line puzzle (register #4).

### 2.4 Win timing → **Cleanup check with strict majority**
- **Legacy:** `ScoreEvent.isWinningPoint` (`schema.ts:233+`) marks the win at the moment the point lands; `foldedWinner` (`rulesKernel.ts:915`).
- **CR 472 + 323.1:** the win check is **Cleanup task #1**: `points ≥ VictoryScore` **AND** `points > every opponent`. **Ties do not win**, and it is not instantaneous.
- **Action:** move the check into `runCleanup` step 1. Re-derive (register #3).

### 2.5 Damage assignment: two-tier Tank/non-Tank → **three-tier + validity gates**
- **Legacy:** `rulesKernel.ts:104-136` `assignDamage` splits targets into `tanks` and `backline = !Tank` — **conflating ordinary units with Backline units**. Tests: *"assigns lethal to a Tank before spilling"*, *"spills past the Tank's lethal"*.
- **CR 815 / 826 / 465.2.c:** three tiers — **Tank first, ordinary next, Backline last** (826.3). Non-Tank units are **invalid assignments** until every Tank has lethal (815.1.c.2); Backline units are invalid until every non-Backline has lethal (826.4.b). Plus: **no over-assignment while unassigned units remain** (465.2.c.4 — legacy honors this, see §1), **contradictory Tank+Backline on one unit → assigner picks one** (465.2.c.8), and **replacement effects apply at assignment** (465.2.c.5).
- **Action:** rebuild as `legalDamageAssignments()` returning the legal set under all constraints, rather than one greedy assignment. Drop both tests. Re-derive (register #2, #12).

### 2.6 `Keyword` union contains non-keywords
- **Legacy:** `schema.ts:35-63` lists 27 entries including **`Buff`, `Burn`, `Predict`, `Stun`** (these are **Game Actions**, CR 426/440/436/423) and **`Mighty`** (a *description*, CR 706–711). Missing the real keywords **`Action`, `Reaction`, `Empowered`**.
- **CR 805–829:** exactly **25 keywords**, each with an ability class and stacking rule.
- **Action:** replace with the Part 7 `Keyword` union + `KeywordDef` table. The four action-names move to the Game Action vocabulary; `Mighty` becomes a derived predicate `isMighty()` (CR 708).

### 2.7 `EffectPrimitive` → the 32 Game Actions
- **Legacy:** `effects.ts:15-25`, 10 invented ops.
- **Naming collision (charter violation):** legacy **`BuffMight`** means arbitrary Might arithmetic; CR **`Buff` (426)** means *place a Buff counter* (+1 Might, **max one per unit**, and adding to an already-buffed unit means **the buff did not happen** — 702.3 / 426.1.c). These are different mechanics sharing a name.
- **Mapping:** `Damage`→`Deal`(417) · `BuffMight`/`DebuffMight`→Layer-3 `ArithmeticOp` (**not** `Buff`) · `SetMight`→Layer-1 `TraitOp` · `GrantKeyword`→Layer-2 `AbilityOp` · `MoveUnit`→`Move`(420) · `Stun`→`Stun`(423) · `Draw`→`Draw`(413) · `Counter`→`Counter`(425) · `ReturnToHand`→ zone change (no CR action of that name).
- **Missing entirely:** Exhaust, Ready, Recycle, Heal, Play, Hide, Discard, Reveal, Banish, Kill, Add, Channel, BurnOut, Double, Swap, Attach, Detach, Predict, Prevent, Replace, Create, Burn, Empower, Disempower, Skip, Pay — **26 of 32**.
- **Action:** delete `EffectPrimitive`; rebuild the vocabulary as the 32 CR actions. All 15 registry programs (`effects.ts:137+`) re-authored in Phase 4.

### 2.8 `TurnPhase` shape
- **Legacy:** `schema.ts:254` `"beginning"|"main"|"combat"|"end"` — and **combat is not a phase**.
- **CR 315–317:** `awaken → beginning(beginningStep, scoringStep) → channel → draw → main → ending(endingStep, expirationStep)`. Combat is a Cleanup-triggered procedure (460), not a phase.
- **Action:** replace with Part 7 `Phase`/`Step`.

### 2.9 Zones, privacy, players
| Legacy | CR | Action |
|---|---|---|
| `ZoneKind` = hand/deck/discard/banished/base/battlefield (`schema.ts:65`) | 105–108: also **chain, championZone, runeDeck, legendZone, facedownZone**; "discard"→**trash**, "deck"→**mainDeck** | Replace with `Zone` union; **Location** distinguished (197) |
| `Privacy` = public/hidden (`schema.ts:68`) | 128: **secret / private / public** | Replace; "secret" (deck order) is missing |
| `PlayerId = "A" \| "B"` (`schema.ts:72`) | 481–488: 2v2, FFA3, FFA4 | Widen to `string`; drive count from `FormatContext` |
| `Speed = Action\|Reaction\|Normal` (`schema.ts:33`) | 806/813: Action and Reaction are **Permissive keywords**, not a speed enum | Replace with `TimingPermission` |
| `Duration` (`schema.ts:75`) | 801.3.a.3 adds **whileInZone** as the *default* grant duration | Extend |

### 2.10 Ban model is single-format
- **Legacy:** `cards.json` carries only `banned1v1` (verified Part 6 §3).
- **Ban list 2026-07-24 + TR 602.1.b:** a 2v2-Constructed list now exists (Master Yi, Wuju Bladesman is 2v2-banned, 1v1-legal), and constructed-banned cards remain **limited-legal**.
- **Action:** per-format `legality` in `FormatContext`.

### 2.11 Smaller conflicts
- **`ChainItem.mightMod`** (`schema.ts:184+`): chain items don't carry Might mods in the CR; alterations apply through Layers. Remove.
- **`isCounterableBy`** (`rulesKernel.ts:621`): must reflect **337.2** — Units, Gear, and resource-Adds **resolve immediately on finalization** and are therefore **never counterable**. Counter (425) applies only to items on the chain.
- **`canAfford`** (`rulesKernel.ts:200`): static; CR payment is an **interactive window** where Reaction-tagged Add abilities may be activated (357.1.a, 444.2.c).
- **`WinningLine:"deckDepletion"`**: CR 431 Burn Out gives **an opponent a point** — it is not a win line. `PointSource:"deckDepletion"` survives in spirit; the WinningLine does not.
- **`Battlefield`** (`schema.ts:175`): no controller, no Contested status, no facedown zone, no abilities. Rebuild per 107.2/107.3/190.

## 3. MISSING — build fresh (nothing legacy to keep)

| Subsystem | CR | Notes |
|---|---|---|
| **Layers engine** | 473–480 | fixed-point iteration, snapshotting, increase-by-negative→0 |
| **Priority & Focus** | 311–313 | two distinct slots, grant/retain rules |
| **Four turn states** | 307–310 | Neutral/Showdown × Open/Closed; speed legality derives from this |
| **HOT FEPR + Outstanding Tasks** | 332–340 | FIFO-finalize, LIFO-resolve, **immediate resolve for Units/Gear/Adds** (337.2) |
| **Cleanup engine** | 318–324 | 7-step order, win-check first, Deathknell-before-kill, fixed-point re-run |
| **Showdown model** | 341–348 | contest-applier gains Focus; Focus-pass exceptions (346.1) |
| **Ability taxonomy** | 360–397 | passive/replacement/activated/triggered/reflexive/delayed/linked |
| **Replacement effects** | 367–375 | event semantics, ordering, simultaneity, usage limits |
| **26 of 32 Game Actions** | 413–444 | see §2.7 |
| **Cost pipeline** | 356–357 | base-mods → additional → increases → component-then-total discounts, per-discount minimums |
| **Check Legality step** | 358 | incl. "prevented action ≠ illegal to play" (358.3.a) |
| **Targeting & untargetability** | 355.6–.10, 757–759 | mistarget-on-resolution semantics |
| **XP** | 728–733 | `PlayerState.xp`; consumed by Hunt (823) / Level (824) |
| **Rune Pool** | 165–168 | empties at Main-Phase start **and** turn end |
| **Burn Out** | 431 | recycle trash → **opponent gains a point** → repeat |
| **Attachment / Inactive** | 716–725 | TopMostCard, Effect Text append, Might Bonus, status independence |
| **Facedown Zones** | 107.3 | occupancy 1, controller-locked, cleanup-purged |
| **Object identity on zone change** | 124 | new ObjectId; all temp modifications wiped |
| **Buff counters** | 701–705, 426.1 | max 1; "already buffed" ⇒ the buff did not happen |
| **Stun lifecycle** | 423.1.a.1–.a.2 | cannot re-stun; re-stunning fires no trigger; **clears at end-of-turn Cleanup step 3d** |
| **Prevent-aware lethality** | 437.5.b, 465.2.c.4.a–.c.5 | "All" is never lethal; assignment-time minimum-lethal computed through replacements |
| **Mighty** | 706–711 | ≥5; "becomes Mighty" is the transition; non-board uses printed |
| **Bonus Damage** | 712–715 | sums, positive-only, applies to the action total |
| **Counters** | 741–749 | no controller, not targetable, wiped on non-board transition |
| **Additional Turns** | 734–738 | queue insertion without changing turn order |
| **Format context** | TR 104.1, 601–603 | deck minimums, Unique on/off, copy limits, legality, victory score |
| **Deck construction & setup** | 101–118 | domain identity, 3-copy, signature cap, mulligan (draw-then-recycle) |
| **Deathknell trigger capture** | 323.4, 808.1.d | note location/attributes **before** the card moves to trash |

## 4. Test disposition

| Test file | Tests | Disposition |
|---|---|---|
| `rulesKernel.test.ts` | might-chain floor/order (seq-mind-1); all 6 `canScoreWinningPoint`; both Tank-spill | **DROP** (§2.1, §2.3, §2.5) |
| `rulesKernel.test.ts` | negative Might; `isKilled`; Assault/Shield; Stun; `canAfford` ×3; phaseChange snapshot | **KEEP** (rename) — except the phaseChange/`pointsAtTurnStart` test, which **drops** with §2.3 |
| `effects.test.ts` | Smoke Screen → 1; Convergent Mutation; Gust; Existential Dread; `isCounterableBy`; registry-completeness | **DROP** — all depend on `EffectPrimitive`/might-chain (§2.1, §2.2, §2.7, §2.11); re-author in Phase 4 |
| `matchSchema.test.ts`, `matchPipeline.test.ts`, `captureProfile.test.ts`, `cards.test.ts` | schema/fold/gate/capture | **KEEP** — pipeline layer, not rules-model dependent |

**Estimated:** ~15 tests dropped of ~991 assertions; the pipeline and capture suites (the PR #134/#145 work) survive intact.

## 5. Headline

The legacy kernel is **partially correct on the physics it happened to touch** — six clean matches, six *partial* ones where the combat-moment behavior is right but the lifecycle, cost model, or assignment math around it is missing (§1) and **wrong or absent on every structural system** (Layers, phases, priority, chain execution, cleanups, ability types, replacement effects, the action vocabulary, formats, XP). That is the exact signature of reactive construction — and it is why the rebuild is the right call rather than a patch.

**Nothing here is persisted**, so all of §2 is free to break now.

## 6. Next: Phase 3
One consolidated migration: land the v2 types + kernel, drop the conflicting tests, rebuild them as-if-missing against the CR, and notify no module until it is built and implemented (your standing instruction). Then Phase 4: the effects/ability layer against the Supabase card inventory.
