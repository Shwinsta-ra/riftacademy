# RiftCore v2 — Canonical Model · Part 2: Execution, Play, Combat, Scoring

**Source:** Riftbound Core Rules RUP4 (2026-07-16, post-Vendetta — verified). Clean-room; legacy not consulted. CR-cited throughout.

---

## 1. HOT FEPR — the game's main loop (CR 332–340)

**H**andle **O**utstanding **T**asks; then **F**inalize → **E**xecute → **P**ass → **R**esolve (334). This is the execution engine of the entire game — the v2 kernel's core loop.

- **Task** (333): steps players must perform before anything else — Cleanups, Start-of-Turn process, Combat steps, End-of-Turn. Tasks may add Chain Items, which wait until Tasks complete (334.1–.2). FEPR itself can incur new Tasks: pause, handle, continue (334.2.a).
- **Idle rule (335):** no Tasks + no pending items + no Showdown → Main Phase: Turn Player gets Priority; any other phase: advance to next substep/step/phase/turn. During a Showdown: Focus-holder gets Priority (335.1).
- **Step 1 — Finalize (337):** the controller of the **OLDEST** pending item completes the steps of Playing it (FIFO finalization, 337.1.b). Finalizing does not pass Priority (337.1.a). **If the finalized item is a Unit, Gear, or resource-Add ability, it resolves IMMEDIATELY → skip to Resolve (337.2)** — no reaction window against these. Still pending items → repeat; none → controller of next chain item gains Priority → Execute (337.4).
- **Step 2 — Execute (338):** Priority-holder either plays a legally-timed card/ability (Closed State ⇒ Reaction-speed required, 338.1.a.1–.2; new pending items → back to Finalize) or passes → Pass step.
- **Step 3 — Pass (339):** all players passed in sequence with no additions → Resolve; else next player gets Priority → Execute.
- **Step 4 — Resolve (340):** the **NEWEST** Finalized item resolves in its entirety (LIFO resolution, 340.1). Chain empty → Open State (during a Showdown, Focus passes — unless the chain was opened by a triggered ability or an Add, 340.2.a / 346.1). Pending items remain → Finalize; only finalized remain → newest item's controller gets Priority → Execute.

**Chain shape:** FIFO-finalize, LIFO-resolve, with immediate-resolve bypass for Units/Gear/Adds. All three properties are load-bearing for the kernel.

## 2. Showdowns (CR 341–348)

- A Showdown = a Window of Opportunity where players alternate playing spells, each creating a Chain as normal (342). Showdown State: only Action/Reaction cards playable (343.1.a).
- **Opens** when a Battlefield's Control becomes Contested during a Cleanup in Neutral Open (344); contested-between-two-players → it opens as the first step of Combat (344.1); contested with no opposing units → non-combat Showdown at next Cleanup (344.2).
- **Focus:** the contest-applier gains Focus at open (345). When a chain empties during a Showdown, Focus passes to next in turn order (346) — except chains opened by triggered abilities or Adds (346.1).
- Focus-holder may play (chain resolves → Focus passes, 347.1.b) or pass (347.2). **All players pass in sequence without playing → Showdown closes (348).** Combat Showdown → continue Combat steps (348.1). Non-combat: sole player with units establishes Control if they didn't have it → **Conquer if not yet scored this turn** (348.2.a.1).

## 3. The Process of Play (CR 349–359)

A card is "Played" only when the whole process completes (350.1). Permanents become Game Objects; Spells execute then trash (351). Steps:

1. **Move card to the Chain** (354) — Closes the State; item becomes Pending; outstanding Tasks/resolving effects finish first.
2. **Make relevant choices** (355) — "As I am played" choices incl. optional-additional-cost decisions (355.1); Unit destination (Base or controlled Battlefield by default; effects can extend validity, 355.2); modes (355.3); Move destinations (355.4); explicit Game-Object choices (355.5 — criteria-effects like "kill all gear" are NOT choices; triggered/delayed-ability choices are NOT made now, 355.5.b).
   **Targeting (355.6–.10):** choosing specific Game Objects = Targeting. Valid target: right zone-category (board for unit/gear/rune; chain for spell/ability; 355.9.a), meets all restrictions incl. untargetability (355.9.b), not the spell itself (355.9.c). All targets must be validly chosen to put the item on the chain (355.8).
3. **Determine Total Cost (356)** — a pipeline: base-cost modifications ("for [Cost]" replacement; "ignore" → zero, 356.1) → additional costs (Mandatory vs Optional — "as an additional cost" ± "may", 356.2; Deflect's cost is Mandatory, 356.2.a.2) → cost increases (356.3) → discounts (component-level before total-level; per-discount minimums, 356.4).
4–5. *(Pay costs; Finalize — detail completes in Part 3's read; the "Check Legality" step referenced at 338.1.a.6 lives here.)*

## 4. Combat (CR 459–466) — complete

**Preconditions (460–462):** Combat occurs at a Cleanup with empty Chain and a staged Combat; staged = opposing units co-located, steps not yet initiated (461); Turn Player picks order among multiple staged combats (461.1); un-staging before initiation → nothing resolves (461.2). Exactly two players (462); multiplayer join-in prevention (462.1–.3).

### Step 1 — Combat Showdown Step (464)
Ordered Tasks: (1) start-of-combat effects; (2) establish **Attacker = the player whose units applied Contested** (464.2.c.1), Defender = the other; designations applied to players and their units (late arrivals designate at next Cleanup, 464.2.c.3.a); (3) **Attacker gains Focus**; (4) triggered abilities to the Combat Chain — Attacker first, then non-defenders in turn order, then Defender (464.2.e.1). Chain created → State Closes; else Combat Showdown proceeds Open.

### Step 2 — Combat Damage Step (465) — the assignment constraint system
When the Showdown closes with both sides' units present: sum Attacker Might; sum Defender Might; **starting with the Attacker, each player assigns their sum among the other's units** (465.2.c). **Assigning ≠ Dealing; when all assigned, dealt simultaneously** (465.2.c.1).

Assignment constraints (all mandatory):
- **Lethal-first (465.2.c.3):** a unit must receive lethal in full before any damage goes to a different unit. (5 damage vs four 3-Might units: must be 3+2, never 2+1+1+1.)
- **No over-assignment (465.2.c.4):** cannot assign more than minimum-lethal to a unit **unless no further units remain**. (Marked damage counts: 3-Might units with 1 damage each cap at 2 assigned.)
- **Replacement effects apply at assignment (465.2.c.5, Vendetta):** prevent/double/etc. modify the assignment math — minimum-lethal is computed *through* them (a "prevent 3" 2-Might unit needs 5 assigned; a doubled unit's minimum is the smallest pre-double value that lands lethal, 465.2.c.4.a). Multiple replacement effects on one unit: applied in the order chosen by that unit's controller.
- **Ordering requirements (465.2.c.6):** Tank = assigned first; Backline = assigned last; requirements obeyed if able; ties within a priority in any order (465.2.c.7); contradictory requirements on one unit (Tank+Backline) → assigning player picks ONE to satisfy, never in between (465.2.c.8), resolved per-unit (465.2.c.9).

### Step 3 — Resolution Step (466)
1. **Combat Cleanup** — inserts **"Heal all Units"** (466.1.a.1 — combat damage clears here) and **"Recall Attackers if Defenders still present"** (466.1.a.2).
2. **Determine Combat Result** (466.3): winner = the designated player who alone has units remaining; loser = alone in having none; units inherit their controller's result (466.3.c); **No Result** if recalls happened at 3d, both have units, or neither does (466.3.d) — No-Result-with-both-present re-stages a Showdown+Combat (466.3.d.1).
3. **Establish Control** (466.5): sole player with units gains Control if lacking → **Conquer if not yet scored this turn** (466.5.d — need NOT be the contest-applier, 466.5.e); clear Contested; no units → Uncontrolled (466.5.b); **remove Hidden cards not sharing the Battlefield's controller** (466.5.c).
4. **Combat ends** (466.7): designations removed; end-of-combat triggers; all "this combat" effects expire simultaneously.

## 5. Scoring (CR 467–472) — the REAL final-point rule

- Two ways to Score (469): **Conquer** — gain Control of a Battlefield not yet scored by you this turn (469.1); **Hold** — maintain Control during your Beginning Phase (Scoring Step) of a Battlefield not yet scored this turn (469.2). Team modes: teammate-controlled-at-scoring-step disqualified (469.1.a).
- **Once per Battlefield per turn, across both methods** (470).
- On Scoring (471): gain up to one Point + trigger that Battlefield's Score abilities (Conquer/Hold abilities per method; max once per turn per player, 471.2.c).
- **THE FINAL-POINT RULE (471.1.a–b):** restrictions apply **to Conquer only** — points from non-Conquer sources (including **Hold**) are explicitly NOT restricted (471.1.a.1). When a player attempts to gain a point via Conquer while their total is **≥ VictoryScore − 1**: **if they have Scored EVERY Battlefield this turn → they gain the Final Point; otherwise → they DRAW A CARD instead** (471.1.b.1).
- **Winning (472):** checked **when a Cleanup occurs** — Points ≥ Victory Score **AND strictly more points than any opponent** → Win.

## 6. Findings vs. prior model (Part 2 additions to the Phase-2 diff)

| Finding | Status |
|---|---|
| **Winning-line taxonomy is replaced — again** | Our canonical `WinningLine` (holdAtSeven / conquerBothAtSix / holdOneConquerOneAtSix, keyed on `pointsAtTurnStart`) was an approximation. The real rule: **Hold is unrestricted** (471.1.a.1) — "holding at 7" isn't a special line, it just scores; the restriction gates **Conquer only**, keys on **current total ≥ VictoryScore−1** (not pre-turn total), and the condition is **"Scored every Battlefield this turn"** (either method — which generalizes hold-one-conquer-one and conquer-both to any Battlefield count/mode); failing it yields a **draw-a-card consolation** we never modeled. |
| **Win check is at Cleanup, with strict majority** | 472: win when Points ≥ VictoryScore **and more than any opponent**, evaluated at a Cleanup — not "the instant the point lands," and ties do not win. Both new. |
| **Damage clears after combat** | Confirmed by CR: the Combat Cleanup inserts "Heal all Units" (466.1.a.1). The old ruling survives, now cited. |
| **Combat assignment: simultaneous dealing, both controllers assign** | Confirmed by CR (465.2.c, 465.2.c.1). |
| **Over-assignment is ILLEGAL** | 465.2.c.4 — never more than minimum-lethal while unassigned units remain. The legacy "spill freely past a Tank's lethal" was wrong; spill exists only when all units have lethal. Tank/Backline are *ordering* constraints (first/last), not the source of spill. Any puzzle whose answer involved over-assigning needs re-validation. |
| **Lethal-first is universal** | 465.2.c.3 applies to ALL units, not a Tank special case. |
| **Replacement effects at assignment** | 465.2.c.5 (Vendetta): prevent/double reshape assignment math; minimum-lethal computed through them; controller of the affected unit orders multiple effects. Entirely new surface. |
| **Attacker = contest-applier** | 464.2.c.1 — not "turn player." Attacker gains Focus; triggered-ability stacking order Attacker→others→Defender (464.2.e.1). |
| **Units/Gear/Adds resolve immediately on finalization** | 337.2 — no reaction window against them; counterplay windows exist only against spells/abilities on the chain. Restructures `isCounterableBy`-class logic. |
| **FIFO-finalize / LIFO-resolve** | 337.1.b / 340.1 — LIFO resolution confirmed; FIFO finalization is new structure. |
| **Conquer-on-showdown-close and combat-control need NOT be the contester** | 348.2.a, 466.5.e. |
| **Hidden-card cleanup at combat end** | 466.5.c — hidden cards not sharing the Battlefield's controller are removed. New; touches the belief-state model. |
| **Cost determination is a pipeline** | 356: base-mods → additional (mandatory/optional) → increases → component-then-total discounts with per-discount minimums. Legacy `toCost` modeled none of this. |

## 7. Open adjudications register (questions to REMAKE post-rebuild — prior answers quarantined)
1. Ordering-dependent Might puzzles (Smoke Screen/Frigid Touch class) — re-derive under Layers + snapshotting (Part 1 §7).
2. Any puzzle answer involving damage over-assignment or Tank-spill — re-derive under 465.2.c.3–.4.
3. "Win the instant the 2nd point lands" — re-derive under 472's Cleanup-check + strict-majority.
4. Every winning-line-dependent puzzle — re-validate under 471.1.b (scored-every-Battlefield + draw consolation).

## 8. Next (Part 3)
Game Concepts (100s): deck construction, setup, zones/spaces, Game Object taxonomy, rune economy (160–168), Control (188–190); plus the Play-process tail (pay/finalize + Check Legality step) and Ending Phase / Cleanup task-order detail (317–324).
