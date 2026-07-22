# RiftIQ - Combat Puzzle Batch 1 (v4)

**Module:** M5 (RiftIQ) - **Date:** 2026-07-21 - **Status:** for Ashwin review. Supersedes v3. Incorporates the reconciliation digest rulings, the Wuju Bladesman switch, the single-step-ability constraint, and the Riftdle UI reference.

  

## 0\. What changed from v3 (read this first)

**1. Wuju Bladesman broke two puzzles. Both rebuilt.** Bladesman reads: *"While a friendly unit defends alone, it gets +2 Might."* That is a combat-math passive, and it silently rewrote two boards:

  

  - **calm-1** - your Phantom (M5) defending alone became **M7**, which already beat the M6 attacker, so "do nothing" won and the puzzle had no decision. Rebuilt around a bigger attacker so the legend bonus alone is not enough.
  - **fury-1** - Master Yi was the **opponent** there, and their First Mate was defending alone, making it **M5** instead of M3. Your attacker could no longer win. Fixed by switching that opponent to a legend with no combat passive.

  

**2. New checklist item: legend-passive audit (both sides).** This is the systemic gap the above exposed. Every puzzle must now check *both* legends' abilities against the combat math, not just the cards on the board. I audited all ten legends; results in section 2.

  

**3. New checklist item: point-race safety.** Per the ruling that a player at 6/8 scoring 2 wins immediately, every board must verify the opponent's *maximum* points this turn cannot end the game before your line resolves. All six pass (verified per puzzle below).

  

**4. Simultaneous damage.** Wording corrected throughout: once both players pass priority, both controllers assign their own damage **at the same time**, dealt instantly, no reactions. Tank and Backline constrain assignment *within* that simultaneous exchange; they are not a turn order. No math changed, but several explanations implied sequencing that does not exist.

  

**5. Single-step abilities only.** Per your instruction, pending RiftCore's multi-step resolution model. Any ability that must **resolve as part of the answer** is now single-step. Two swaps were needed:

  

  - body-1 and chaos-1 used **Evershade Stalker** (*"discard 1, then draw 1"* - two sequential effects). Replaced with **Sneaky Deckhand** (ogn-176-298, M2 Chaos), whose ability is single-step and inert once in play.
  - chaos-1 keeps **Death from Below**, and this is deliberate: its second clause only fires *"if it had 3 Might or less."* The target is a **6-Might** unit, so that clause is dead and the spell resolves as a single effect. Sizing the target above 3 is what keeps it legal.

  

Cards already in play whose on-play triggers resolved before the snapshot (First Mate's ready in body-1 is the exception - it resolves *during* the answer, and is single-step) are fine; they contribute only their body and static keywords.

  

**6. Verification status.** Per your note that puzzles are hand-authored for now with kernel verification later, I dropped the per-candidate kernel / cardTruth+author tags. Every puzzle is now **hand-verified** (math checked against card text and the A.2 rules). The verifiedBy field returns when the harness runs.

  

## 1\. The rulings, applied

| Ruling | Where it lands |
|---|---|
| Ambush is "last in, first out" | chaos-1 confirmed: Kha'Zix resolves onto BF2 first, *then* the removal kills Bully. You keep presence either way. |
| "Alone" (Kha'Zix) = only **enemy** unit there; your units irrelevant | chaos-1 crux holds: BF2's lone attacker triggers +2 even though your unit is present. |
| "Solo" (En Garde) = no other **friendly** unit there, at cast time | calm-1: stacks with Bladesman, since both key off your unit being the only friendly one. |
| 6/8 + 2 points = immediate win | New checklist item H; all six boards verified safe. |
| Damage is simultaneous, unreactable | Wording fixed in mind-1, body-1, order-1. Decisions must sit *before* the pass-priority point (all six do). |
| Master Yi dual-legend: pick per mechanic | calm-1 now uses **Wuju Bladesman** (ogs-019-024) and exercises its trigger directly. |

  

## 2\. Legend-passive audit (new gate)

Every legend used, and whether its ability touches the puzzle's math:

  

| Legend | Code | Domains | Ability | Effect on puzzle |
|---|---|---|---|---|
| Master Yi, Wuju Bladesman | ogs-019-024 | Calm/Body | +2 Might while a friendly unit defends alone | **LIVE - exercised** in calm-1 |
| Vi, Piltover Enforcer | unl-187-219 | Fury/Order | On conquer with 3+ excess damage, may ready a unit | Inert (fury-1 excess = 1); post-conquer anyway |
| Poppy, Keeper of the Hammer | unl-203-219 | Body/Order | On hold, gain 1 XP; spend 3 XP to draw | No combat effect - safe opponent |
| Volibear, Relentless Storm | ogn-249-298 | Fury/Body | On playing a Mighty unit, may channel a rune | Inert (unit already in play) |
| LeBlanc, Deceiver | unl-199-219 | Mind/Order | On conquer/hold, may make a Reflection token | Post-combat, optional |
| Yasuo, Unforgiven | ogn-259-298 | Calm/Chaos | 2 energy + exhaust: move a friendly unit | **Unaffordable** in both boards (0-1 ready runes) |
| Fiora, Grand Duelist | sfd-205-221 | Body/Order | When your unit becomes Mighty, may channel a rune | Fires in body-1 but only channels a rune - no combat effect |
| Kha'Zix, Voidreaver | unl-201-219 | Body/Chaos | XP: buff a unit / move a unit | Gated on XP - board states **XP 0** |
| Pyke, Bloodharbor Ripper | unl-185-219 | Fury/Chaos | 1 energy + exhaust: bounce own unit, make gear | Self-targeting, no benefit to them |
| Leona, Radiant Dawn | ogn-261-298 | Calm/Order | On stunning enemies, buff a friendly unit | Inert (no stun in puzzle) |

  

## 3\. Updated validation checklist (additions in bold)

**A. Legend and domain legality** - both players named with two domains; every controlled or held card inside those domains. **B. Board-state completeness** - both sides: units/gear per zone with Might and keywords; runes ready/exhausted with domains; hand (yours listed, opponent's a count); trash, deck, banish, hidden counts; score, turn, phase, active player; battlefields named with controller. **C. Combat legality** - blockers are units already at the attacked battlefield, plus legal Reaction-speed additions (Reaction, Ambush to a battlefield where you have units, Hidden, Quick-Draw). No moving in to block post-declaration. Conquer needs effective Might to clear every defender and survive. **D. Privacy** - opponent hand as a count; trash public; hidden as a face-down count. **E. Answer legality** - exactly one correct candidate; correct line affordable and legal; every wrong candidate provably illegal, unaffordable, or losing. **F. Single-step abilities** - **any ability that resolves as part of the answer must be a single effect.** Multi-step cards are allowed only if their extra clauses are provably inert (already resolved, or condition cannot be met). **G. Legend-passive audit (NEW)** - **check BOTH legends' abilities against the combat math. State XP when a legend has XP-gated abilities. Confirm the opponent cannot afford an activated ability that would change the answer.** **H. Point-race safety (NEW)** - **compute the opponent's maximum points this turn and confirm it cannot win before your line resolves.** **I. Simultaneous damage** - **the decision must sit before the pass-priority point. No puzzle may hinge on reacting during damage assignment.**

  

## 4\. The six puzzles

### FURY - "Strike, don't sit" (fury-1) - BestLine - Easy

*Changed: opponent legend Master Yi -> Poppy, because Bladesman was inflating their lone defender to M5.*

  

LEGENDS  You: Vi, Piltover Enforcer (Fury/Order)   Opp: Poppy, Keeper of the Hammer (Body/Order)

  

SCORE    You 3/8   Opp 3/8        TURN  T5, Action phase, YOU active

  

BATTLEFIELDS

  

  BF1 "Yordle Village"  controller: opponent

  

  BF2 "Ionian Gates"    controller: neutral

  

YOU

  

  In play  Base: Chemtech Enforcer M2 [Assault 2] (Fury) ; Eager Drakehound M3 (Fury)

  

  Runes    4 ready (Fury,Fury,Order,Order)

  

  Hand     (2 cards)    Trash -  Deck 21  Banish 0  Hidden 0   XP 0

  

OPP

  

  In play  BF1: First Mate M3 (Body) [lone defender]

  

  Runes    3 ready / 3 total

  

  Hand     4 cards (hidden)   Trash -  Deck 20  Banish 0  Hidden 0   XP 1

  

**Goal:** conquer BF1.

  

  - **[CORRECT]** **attack_chem** - move Chemtech Enforcer to BF1 and attack. Attacking, it is 2 + Assault 2 = **4 > 3**. Damage is simultaneous: you deal 4 (lethal to the M3), it deals 3, and 3 < 4 so Chemtech survives. You conquer.
  - **[wrong]** **attack_hound** - Eager Drakehound (M3) attacks. 3 vs 3, both deal lethal simultaneously, both die. Nobody holds the battlefield: no conquer.
  - **[wrong]** **hold** - keep Chemtech at base. Assault is attacking-only, and sitting still never takes a battlefield.

  

**Hint.** One of your units gets bigger, but only under one condition. Read [Assault]. **Key concept.** Assault X adds Might only while attacking. A body that loses a fight standing still can win it by being the aggressor. **Rules.** Assault 807 (attacking only); conquer = clear every defender and survive. **Checks.** Poppy has no combat passive (G). Vi's conquer trigger needs 3+ excess damage; excess here is 1, so it never fires (G). Opponent max this turn 3/8 (H). Chemtech's on-play discard already resolved; only the static Assault is live (F). **Cards.** ogn-003-298, sfd-006-221, ogn-132-298.

  

### CALM - "Alone is stronger" (calm-1) - BestLine - Easy

*Rebuilt for Wuju Bladesman. This is now the puzzle that teaches the legend.*

  

LEGENDS  You: Master Yi, Wuju Bladesman (Calm/Body)   Opp: Volibear, Relentless Storm (Fury/Body)

  

SCORE    You 4/8   Opp 5/8        TURN  T7, opponent's Action phase, OPP active

  

         (attack declared on BF1; both players still hold priority)

  

BATTLEFIELDS

  

  BF1 "Placidium"    controller: you (since T6)

  

  BF2 "Navori Road"  controller: opponent

  

YOU

  

  In play  BF1: Playful Phantom M5 (Calm) [your only unit here]

  

           Base: Demacian Diplomat M2 (Body)

  

  Runes    3 ready (Calm,Calm,Body), 1 exhausted

  

  Hand     En Garde (Calm, E1, Reaction) ; (1 card)

  

  Trash -  Deck 18  Banish 0  Hidden 0   XP 0

  

OPP

  

  In play  BF1: Magma Wurm M8 (Fury) [attacking, alone]

  

  Runes    2 ready / 4 total

  

  Hand     3 cards (hidden)   Trash -  Deck 17  Banish 0  Hidden 0   XP 2

  

Your legend gives a friendly unit **+2 Might while it defends alone**, so your Phantom is already **7**. That is still not enough against an 8.

  

**Goal:** hold BF1.

  

  - **[CORRECT]** **en_garde** - cast En Garde on your Phantom. Base 5, **+2** (Bladesman: defending alone), **+2** from En Garde (+1, and +1 more because it is the only unit you control there) = **9**. Simultaneous damage: you deal 9 (the M8 dies), it deals 8, and 8 < 9 so your Phantom lives. You hold.
  - **[wrong]** **take_it** - do nothing. Your Phantom is 7 < 8: it dies, deals 7 which is not lethal to the M8, and the attacker conquers BF1.
  - **[wrong]** **add_diplomat** - move Demacian Diplomat from base to BF1 to help. Illegal twice over. You cannot move a unit in to block after an attack is declared, and even if you could it would **switch off both bonuses** - Bladesman needs your unit defending *alone*, En Garde needs it to be the *only* unit you control there. Your Phantom would drop from 9 to 5.

  

**Hint.** Your unit is alone, and two different things on your side care about that. What happens to both if you add a second body? **Key concept.** Wuju Bladesman and En Garde both reward a lone defender, and they stack: 5 -> 7 -> 9. Reinforcing the battlefield would *reduce* your defense. Fewer units can be stronger than more. **Rules.** Wuju Bladesman +2 while defending alone; En Garde +1, +1 more if it is your only unit there (Reaction); no non-Reaction blockers added after declaration. **Guided.** 1) "your legend already has the Phantom at 7, not 5." 2) "7 < 8, so you still lose without help." 3) "En Garde adds +1 and +1 (only unit there) = 9 > 8." 4) "adding the Diplomat would turn both bonuses off." **Checks.** Volibear's passive needs a Mighty unit to be *played*; the Wurm is already in play (G). Opponent max this turn 6/8 (H). All abilities single-step (F). **Cards.** ogs-019-024, ogn-049-298, ogn-046-298, unl-092-219, ogn-011-298.

  

### MIND - "Where does it land?" (mind-1) - PredictOutcome - Hard

*Unchanged math; damage wording corrected to simultaneous.*

  

LEGENDS  You: LeBlanc, Deceiver (Mind/Order)   Opp: Yasuo, Unforgiven (Calm/Chaos)

  

SCORE    You 5/8   Opp 4/8        TURN  T8, opponent's Action phase, OPP active (attack on BF1)

  

BATTLEFIELDS

  

  BF1 "Fae Hollow"    controller: you (must hold)

  

  BF2 "Shadow Isles"  controller: neutral

  

YOU

  

  In play  BF1: LeBlanc, Everywhere At Once M4 [Backline] (Mind) ; Pit Crew M3 (Mind)

  

  Runes    2 ready (Mind,Order), 2 exhausted

  

  Hand     (1 card)   Trash -  Deck 16  Banish 0  Hidden 0   XP 0

  

OPP

  

  In play  BF1: Playful Phantom M5 (Calm) [attacking, alone]

  

  Runes    1 ready / 5 total

  

  Hand     2 cards (hidden)   Trash -  Deck 15  Banish 0  Hidden 0   XP 1

  

**Fixed line:** both players have passed priority; damage is assigned simultaneously. **Prompt:** which of your units die?

  

  - **[CORRECT]** **front_only** - only Pit Crew dies; LeBlanc survives; you hold. Backline forces the attacker's assignment to give lethal to every non-Backline unit first: 3 to Pit Crew (dies), leaving 5 - 3 = **2** for LeBlanc, and 2 < 4 so she lives. Simultaneously your side deals 3 + 4 = **7**, which kills the M5. You hold.
  - **[wrong]** **both** - would require assigning to LeBlanc before Pit Crew, which Backline forbids.
  - **[wrong]** **leblanc_only** - Backline means LeBlanc is assigned last, not first.
  - **[wrong]** **neither** - Pit Crew has no protection and must be dealt lethal.

  

**Hint.** One of your units must be assigned damage last. Who absorbs the lethal, and how much is left over? **Key concept.** Backline is the mirror of Tank: the carry is assigned lethal last, so a cheap body absorbs it and the remainder only kills the carry if it reaches her Might. **Rules.** Backline 826 (assigned last); death = damage >= Might; holding needs a survivor. **Checks.** LeBlanc's legend triggers only on conquer/hold and is optional (G). Yasuo's move costs 2 energy; opponent has 1 ready rune (G). Opponent max this turn 5/8 (H). LeBlanc's second line (Temporary effects) is inert - none present (F). **Cards.** unl-090-219, ogn-091-298, ogn-049-298.

  

### BODY - "Ready the right blade" (body-1) - BestLine - Hard

*Changed: Evershade Stalker -> Sneaky Deckhand (single-step). Wrong options reworked to avoid a buff-ordering ambiguity.*

  

LEGENDS  You: Fiora, Grand Duelist (Body/Order)   Opp: Yasuo, Unforgiven (Calm/Chaos)

  

SCORE    You 4/8   Opp 4/8        TURN  T6, YOUR Action phase, YOU active

  

BATTLEFIELDS

  

  BF1 "Duelist's Court"  controller: opponent

  

  BF2 "Market Row"       controller: opponent

  

YOU

  

  In play  Base: Demacian Diplomat M2 (Body) [READY]

  

                 Fiora, Peerless M3 (Body) [EXHAUSTED]

  

                 Vanguard Sergeant M4 (Order) [EXHAUSTED]

  

  Runes    6 ready (Body,Body,Body,Order,Order,Order)

  

  Hand     First Mate (Body, E3: when played, ready another unit)

  

           Punch First (Body, E1: give a unit +5 Might this turn)

  

  Trash -  Deck 17  Banish 0  Hidden 0   XP 0

  

OPP

  

  In play  BF1: Playful Phantom M5 (Calm) [lone defender]

  

           BF2: Shipyard Skulker M3 (Chaos) + Sneaky Deckhand M2 (Chaos) [two defenders]

  

  Runes    0 ready / 4 total

  

  Hand     3 cards (hidden)   Trash -  Deck 18  Banish 0  Hidden 0   XP 0

  

Fiora, Peerless: *when she attacks or defends one on one, double her Might this combat.* You can ready exactly one unit and buff exactly one attacker.

  

**Goal:** conquer BOTH battlefields this turn.

  

  - **[CORRECT]** **ready_fiora** - play First Mate to ready **Fiora**; send Fiora **alone** to BF1; send Demacian Diplomat + Punch First to BF2. Fiora at BF1 is one on one, so 3 doubles to **6 > 5**: the Phantom dies, she takes 5 < 6 and survives. Diplomat is 2 + 5 = **7** at BF2 and must clear 3 + 2 = 5 of Might: it assigns lethal to both (5 of its 7) and takes 5 < 7, surviving. **Both conquered.**
  - **[wrong]** **fiora_no_buff** - ready Fiora, send her alone to BF1, send Diplomat to BF2 **without** Punch First. BF1 is won, but a raw 2 cannot clear a 3 and a 2: the Diplomat dies. One battlefield.
  - **[wrong]** **fiora_to_bf2** - ready Fiora, send her to BF2 and Diplomat + Punch First to BF1. BF2 has two defenders, so Fiora is **not** one on one and stays 3: she dies. Diplomat at 7 takes BF1. One battlefield.
  - **[wrong]** **ready_sergeant** - play First Mate to ready **Vanguard Sergeant**; Sergeant + Punch First to BF1, Diplomat to BF2. Sergeant at 9 takes BF1, but Diplomat at 2 cannot clear BF2, and Fiora is still exhausted. One battlefield.

  

**Hint.** One of your units can win a fight for free, but only in the right kind of fight. Which one, and where does that fight have to be? **Key concept.** Fiora's one-on-one double is a free buff that only exists against a *single* defender. Send her solo at the lone unit, which frees your only Punch First for the crowded battlefield. Ready the unit that unlocks the free win, not the biggest body. **Rules.** First Mate readies a unit on play; Fiora doubles when one on one (one unit per side); Punch First +5 this turn; conquer = clear every defender and survive; damage is assigned simultaneously by both sides. **Guided.** 1) "BF1 is a lone 5 - Fiora one on one is 6, free." 2) "so ready Fiora, not the Sergeant." 3) "spend Punch First at BF2: 2 + 5 = 7 clears a 3 and a 2 and survives 5." **Checks.** Fiora's legend fires when a unit becomes Mighty but only channels a rune - no combat effect (G). Yasuo's move needs 2 energy; opponent has 0 ready runes (G). Opponent max this turn 4/8 (H). First Mate's ready is single-step; all other on-plays already resolved (F). **Cards.** sfd-205-221, sfd-110-221, ogn-132-298, sfd-097-221, unl-092-219, ogn-219-298, ogn-049-298, ogn-175-298, ogn-176-298.

  

### CHAOS - "Ambush the removal" (chaos-1) - BestLine - Hard

*Changed: Evershade Stalker -> Shipyard Skulker / Sneaky Deckhand (single-step). Ambush timing now confirmed by your ruling.*

  

LEGENDS  You: Kha'Zix, Voidreaver (Body/Chaos)   Opp: Pyke, Bloodharbor Ripper (Fury/Chaos)

  

SCORE    You 7/8   Opp 5/8        TURN  T9, opponent's Action phase, OPP active

  

         (attacks declared on BOTH battlefields; at start of combat they cast Death from

  

          Below on your unit at BF2, and you hold priority to respond)

  

BATTLEFIELDS

  

  BF1 "Sunken Docks"  controller: you (since T8)

  

  BF2 "Void Breach"   controller: you (since T8)

  

YOU

  

  In play  BF1: Shipyard Skulker M3 (Chaos)

  

           BF2: Bilgewater Bully M6 (Body)   <- targeted by Death from Below

  

  Runes    4 ready (Chaos,Chaos,Body,Body)

  

  Hand     Kha'Zix, Mutating Horror M4 [Ambush] (Chaos, E4)

  

  Trash -  Deck 14  Banish 0  Hidden 0   XP 0

  

OPP

  

  In play  BF1: Eager Drakehound M3 (Fury) + Sneaky Deckhand M2 (Chaos) [two attackers]

  

           BF2: Jae Medarda M5 (Chaos) [one attacker, ALONE]

  

  On chain Death from Below (Fury/Chaos, E4): "Kill a unit at a battlefield" -> Bilgewater Bully

  

  Runes    2 ready / 7 total

  

  Hand     2 cards (hidden)   Trash -  Deck 12  Banish 0  Hidden 0   XP 0

  

At 7/8, holding **either** battlefield into your Beginning Phase scores your 8th point and wins. BF1 is being overrun by two attackers. At BF2 your M6 would have out-held the lone M5, which is why they are removing it. Kha'Zix has **[Ambush]**: you may play him now as a Reaction to a battlefield where you have units. His trigger: *when he attacks or defends, if an enemy unit is alone there, give him +2 Might this turn.*

  

**Goal:** hold a battlefield into your Beginning Phase.

  

  - **[CORRECT]** **ambush_BF2** - Ambush Kha'Zix to BF2 in response to the removal. You have a unit at BF2 when you play him, so Ambush is legal. Your reaction is last in and therefore first out: **Kha'Zix resolves onto BF2 first**, then Death from Below resolves and kills the Bully. Kha'Zix remains. Defending against a lone enemy he is 4 + 2 = **6**: he deals lethal to the M5 and takes 5 < 6, surviving. You hold BF2, lose BF1, and your hold into the Beginning Phase wins the game.
  - **[wrong]** **ambush_BF1** - Ambush to BF1. The enemy is not alone there, so no +2: Kha'Zix is 4 against 3 + 2 of attackers and dies. Meanwhile BF2's holder is removed and the lone M5 takes it. You hold neither.
  - **[wrong]** **hold_reaction** - keep him in hand. The removal clears BF2, the two attackers take BF1, and you hold nothing.

  

**Hint.** Kha'Zix only grows against a lone enemy, and you only need to hold one battlefield. Which flank has exactly one attacker - and can you get him there before your unit is removed? **Key concept.** Answer removal with an Ambush at Reaction speed onto the *lone-attacker* flank. Your reaction resolves before the spell, the "enemy alone" trigger lifts him to 6, and one hold at 7 ends the game. Give up the flank you cannot save. **Rules.** Ambush (Reaction to a battlefield where you have units); reactions resolve before the spell they answer; Kha'Zix +2 when an enemy is alone there; a held battlefield scores at your Beginning Phase. **Guided.** 1) "you win by holding one battlefield into your turn." 2) "BF2 has a lone attacker, so Kha'Zix is 6 there; BF1's two attackers give him nothing." 3) "Ambush in response - he lands before the removal resolves." 4) "6 beats the 5, you hold BF2 and win." **Checks.** Your legend's abilities are XP-gated and you have **XP 0** (G). Pyke's ability bounces *his own* unit, no benefit (G). Opponent max this turn is 7/8 - conquering both battlefields from 5 - so they cannot win first (H). Death from Below's second clause needs a target of 3 Might or less; the Bully is 6, so it resolves as a single effect (F). **Cards.** unl-201-219, unl-143-219, ogn-125-298, ogn-175-298, sfd-142-221, sfd-006-221, ogn-176-298, unl-186-219.

  

### ORDER - "The wall you flash in" (order-1) - BestLine - Hard

*Unchanged math; damage wording corrected to simultaneous.*

  

LEGENDS  You: Leona, Radiant Dawn (Calm/Order)   Opp: Volibear, Relentless Storm (Fury/Body)

  

SCORE    You 6/8   Opp 5/8        TURN  T8, opponent's Action phase, OPP active

  

         (attack declared on BF1; you hold priority)

  

BATTLEFIELDS

  

  BF1 "Solari Peak"    controller: you (must hold)

  

  BF2 "Freljord Pass"  controller: opponent

  

YOU

  

  In play  BF1: Harnessed Dragon M6 (Order) [already defending]

  

           Base: Vanguard Sergeant M4 (Order)

  

  Runes    4 ready (Order,Order,Order,Calm)

  

  Hand     Shen, Kinkou M3 [Reaction][Shield 2][Tank] (Order, E3)

  

  Trash -  Deck 15  Banish 0  Hidden 0   XP 0

  

OPP

  

  In play  BF1: Magma Wurm M8 (Fury) [attacking, alone]

  

  Runes    1 ready / 5 total

  

  Hand     2 cards (hidden)   Trash -  Deck 16  Banish 0  Hidden 0   XP 0

  

**Goal:** hold BF1 **and** keep the Dragon alive.

  

  - **[CORRECT]** **flash_shen** - flash Shen to BF1. Shen has **[Reaction]**, so he may be played to a battlefield you control even after the attack. Defending he is 3 + **Shield 2** = 5, and he has **Tank**. Damage is simultaneous: your side deals 5 + 6 = **11**, killing the M8; the M8's 8 must be assigned to Shen first (Tank), 5 of which is lethal, and the remaining 3 spills to the Dragon - 3 < 6, so the **Dragon survives**. You hold and keep your carry.
  - **[wrong]** **no_react** - do nothing. The Dragon is 6 < 8: it dies, deals 6 which is not lethal to the M8, and the attacker conquers.
  - **[wrong]** **move_sergeant** - move Vanguard Sergeant from base to BF1 to help block. **Illegal.** You cannot move a unit in to block after an attack is declared. Only units already at BF1, or a legal Reaction like Shen, can join.

  

**Hint.** Two of Shen's words matter: one lets him arrive after the attack, the other decides who is assigned damage first. Then check whether your total actually kills the attacker. **Key concept.** A Reaction unit can join a defense after declaration when a normal unit cannot. Tank plus Shield then absorbs the lethal so your carry survives - but only if your combined Might kills the attacker and the spill is smaller than the carry's Might. Tank is a finite wall, not immunity. **Rules.** Reaction speed; Shield 814 (+X while defending); Tank 815 (assigned damage first, excess spills); no non-Reaction blockers after declaration. **Guided.** 1) "Shen is a Reaction, so he can arrive now." 2) "Shen 5 + Dragon 6 = 11, enough to kill the 8." 3) "Tank puts the lethal 5 on Shen; the leftover 3 is less than the Dragon's 6, so she lives." **Checks.** Leona's passive needs a stun; none occurs (G). Volibear's needs a Mighty unit to be played; the Wurm is already in play (G). Opponent max this turn 6/8 (H). All abilities single-step or already resolved (F). **Cards.** ogn-241-298, ogn-234-298, ogn-219-298, ogn-011-298.

  

## 5\. Summary

| id | domain | mode | diff | teaches |
|---|---|---|---|---|
| fury-1 | Fury | BestLine | Easy | Assault is attacking-only |
| calm-1 | Calm | BestLine | Easy | legend + En Garde both reward defending alone, and they stack |
| mind-1 | Mind | PredictOutcome | Hard | Backline is assigned lethal last |
| body-1 | Body | BestLine | Hard | ready the right unit; Fiora's free one-on-one win; buff allocation |
| chaos-1 | Chaos | BestLine | Hard | Ambush answers removal; conditional trigger; hold-to-win at 7 |
| order-1 | Order | BestLine | Hard | Reaction wall; Tank is finite |

  

Rotation holds: Easy = Fury, Calm this batch; Batch 2 = Mind, Order; Batch 3 = Body, Chaos.

  

## 6\. UI notes from the Riftdle reference

The reference confirms the top-down zone layout in our board template, and it maps almost one to one:

  

| Riftdle | Ours |
|---|---|
| Opponent strip: base, hand, runes, points badge | Same, plus explicit trash/deck/banish counts |
| Two battlefield columns, units above, battlefield card below | Same; we name battlefields |
| Your strip: legend, base, hand, runes, points badge | Same, with legend called out (it matters - see calm-1) |
| Side rail: tokens, discard, reset, zoom-hold | Same, plus our hint reveal |
| Single "Reveal Answer" button | Ours is staged: hint -> answer -> guided explanation on a wrong pick |

  

Three places we should be better, in priority order for v1:

  

1.  **Legend visibility.** Riftdle shows the legend as just another card. After calm-1 and fury-1 broke on legend passives, the legend's *active passive text* needs to be readable on the board, not buried in the card art. This is a correctness issue, not decoration.
2.  **Card resolution.** Their card text is unreadable at board scale, forcing zoom-hold. Real card images plus a tap-to-inspect overlay with legible text and keyword definitions.
3.  **Staged hint / answer.** Their single reveal button dumps the answer. Ours: hint first, then answer, then the guided explanation keyed to *which* wrong option was chosen (reusing the Vendetta coach-mark engine).

  

Everything else (flashy toggles, animation) is post-v1. Function first, as you said.

  

## 7\. Open items

1.  **calm-1** **difficulty.** It is still an Easy (one card, one obvious target), but it now teaches three interacting things. Keep it Easy, or promote it and rotate another domain in?
2.  **Batch 2 targets.** Rotation says Mind and Order are the Easy slots. Confirm and I will author six more under the v4 checklist.
3.  **The existing ~14 puzzles.** They predate every rule in this checklist - particularly the legend-passive audit, which is likely to break several. Say the word and I will audit them and rebuild the failures.
