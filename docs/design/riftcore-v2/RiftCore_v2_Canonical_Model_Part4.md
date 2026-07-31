# RiftCore v2 — Canonical Model · Part 4: Abilities & the 32 Game Actions

**Source:** Riftbound Core Rules RUP4 (2026-07-16, post-Vendetta). Clean-room; CR-cited throughout.
This part is the **direct input to the Phase-4 effects/ability layer.**

---

## 1. Ability taxonomy (CR 360–397)

Five structures (361.1). One card may carry several of several types (362).

| Type | Recognition | Chain? | Key rules |
|---|---|---|---|
| **Passive** (363–366) | statements of fact; conditional via "if"/"while" | no | active on Board by default (365.1); off-Board passives **self-describe their zone** (366.1 — "play me from your trash"); **cost-altering passives apply in any zone the card can be played from** (366.2.a) |
| **Replacement** (367–375) | "as", "would", "instead" | no | see §2 |
| **Activated** (376–381) | `cost : effect` (the ":" is the tell) | yes | **only on your own turn, in an Open State** (381); referred to as "use"/"play"; trigger-on-use fulfills **when it resolves** (377.2.a); usage conditions gate activation (377.2.b) |
| **Triggered** (382–385) | "when" + event; "at" + turn point; "the [Nth] time" | yes | see §3 |
| **Delayed** (389–392) | window of applicability | varies | can be any other type (Delayed Trigger/Replacement/Passive/Linked); **not attached to units/gear — independently created objects** (392) |
| **Reflexive** (386–388) | "Do this:" / "Do one of the following:" | yes | a Triggered subtype creating N chain items; "Do this N times" adds it N times (387.1.a); multi-item creation adds all in order but stops at step 1 (388.2) |
| **Linked** (393–397) | components referencing each other | n/a | must be present in the same rules text (395); any component types (396) |

## 2. Replacement effects (CR 367–375) — a first-class subsystem

- Alters the application of another effect or rule (368); intercedes during execution (369). **Some Game Actions ARE replacement effects: Burn Out (431.5), Prevent (437.7), Skip (443.4).**
- **Event model (370.1.a):** an *event* is the singular moment resulting from a Game Action or state change. **Replacing an event = the generating action never occurred** (370.1.a.1 — a replaced death means the kill didn't happen; a replaced "becomes Mighty" means it never became Mighty, so nothing triggers).
- **Simultaneity (370.1.a.2):** events are simultaneous only when produced by the *same* game action. "Kill up to two units" → simultaneous. "Kill A. If you do, kill B." → sequential (two actions).
- **Entry replacements (369.3):** "I enter ready", "I enter there" — replacements of the default entry event.
- **Limits & choice (371):** "once each turn" / "N times each turn" caps applications; "may" versions are optional and an unapplied instance doesn't consume the cap (371.2.b).
- **Ordering (372–373):** multiple replacements on one event → **the controller of the object being acted on chooses order** (player if a player; Turn Player if an uncontrolled battlefield). Simultaneous events → each treated separately; same controller orders theirs; different controllers execute **in turn order** (373.1). **Replacement-effect game actions execute BEFORE any simultaneous unmodified events** (373.1.a). One replacement may only be applied in one sequence (373.2).

## 3. Triggered abilities (CR 382–385) — condition semantics

- **Condition vs Effect (383.2):** the Condition is the "When/At/Nth time" clause **plus any conditional statement immediately following it**; anything else is Effect. CR's own contrast: Sona ("At the end of your turn, **if I'm at a battlefield**, ready…") → the if-clause is part of the Condition (checked at trigger time, ability won't go on the chain if false, but *will* still resolve if she leaves in response); Loose Cannon ("At the start of your Beginning Phase, draw 1 **if you have one or fewer cards**") → the if-clause is not adjacent, so it's part of the Effect (checked on resolution).
- **Evaluation timing (383.2.c):** conditions are evaluated *after* the inciting event is processed. An object entering a zone at the same moment its condition is met **does** trigger (383.2.c.1 — Immortal Phoenix triggers on its own spell-kill).
- **"Nth time" with simultaneous instances (383.1.b):** controller picks ONE instance as the trigger; the ability triggers once.
- Presence: permanents' triggers evaluate only on the Board (384.2); off-Board triggers self-describe their zone (385.2).

## 4. Playing/activating abilities (CR 398–406)

Same steps as playing cards (399). Abilities become Pending Items (400); **an ability with [Add] resolves immediately on finalization, like a Unit or Gear** (400.2). Notable step differences:
- **Step 2 choices (402):** if a Triggered Ability's effect begins "you may", the controller decides **now** whether to perform it; declining removes it from the chain (402.1.a). **No legal options for an Activated Ability → illegal to activate** (402.3); **no legal options for a Triggered Ability already on the chain → removed, never finalized, and this is NOT a counter** (402.4). If legal options exist, the controller **must** choose — cannot decline at this stage (402.4.b).
- **Step 3 cost (403):** activated cost precedes the ":"; triggered abilities usually have no base cost, but a cost *within* an instruction ("[do X] to [do Y]") is taken as the base cost (403.1.b.1).
- **Step 4 pay (404.2):** players may decline to pay costs incurred by Triggered Abilities.

## 5. The 32 Game Actions (CR 413–444) — canonical effect vocabulary

**Discretionary** = requires Priority (Play, Standard Move, Hide). **Limited** = performed when instructed. Everything below is verbatim-derived.

| Action | Definition & key rules |
|---|---|
| **Draw (413)** | take top card(s) of Main Deck to Hand. Deck short → draw as many as possible, **Burn Out**, then draw the remainder (413.4) |
| **Exhaust (414)** | mark a non-spell board object spent; already-exhausted can't be exhausted (so it fails as a cost — 414.4) |
| **Ready (415)** | inverse; already-ready can't be readied; Awaken Phase readies all you control |
| **Recycle (416)** | to the **bottom** of the corresponding deck (Main→Main, Runes→Rune Deck); always to the **owner's** decks (416.1.c); recycle as many as possible (416.4); **2+ to Main Deck → random order**; **2+ to Rune Deck → owner's chosen order** (416.5.a) |
| **Deal (417)** | mark damage on units; **assigning ≠ dealing** (417.1.a); valid damage ≥1 (417.1.e); **only damage can be dealt** (417.2); source attribution rules (417.6); Bonus Damage is a property of dealing (417.4–.5) |
| **Heal (418)** | any clearing of damage is Healing (418.1.a) |
| **Play (419)** | put on chain and queue for finalization; **by default only from hand or Champion Zone** (419.1.a); **Discretionary**, but effect-driven play is **Limited** (419.3.a); no eligible card → nothing happens (419.3.c); **play-triggers fire when the card's resolution completes the act** (419.4.a) |
| **Move (420)** | between Locations; **Limited**, except the Standard Move which is **Discretionary** with cost = exhaust the unit(s) (420.3) |
| **Hide (421)** | place a card facedown at a Battlefield you control; **Discretionary** (421.2); facedown properties defined by the effect that placed it; **zone change or game end → owner reveals** (421.4) |
| **Discard (422)** | hand → trash without executing text; performer chooses using private info (422.1.a); discard-triggers fire after |
| **Stun (423)** | binary state; **stunned unit contributes no Might in the damage step** (423.1.b) but **still needs full-Might damage to be killed** (423.1.c) |
| **Reveal (424)** | temporary known-state, **not a zone** (424.1.a); voluntarily showing private info is **not** revealing and triggers nothing (424.2.b) |
| **Counter (425)** | negate a chain item; countered card **is not "played"** for play-triggers (425.1.b); **costs are not refunded** (425.1.c) |
| **Buff (426)** | place a Buff counter (a Buff is itself an object, 426.1.a); one per unit max (426.1.b) |
| **Banish (427)** | any zone → Banishment; **not a subset of Kill or Discard** (427.2.a–b) |
| **Kill (428)** | permanent goes board → trash; **only counts as Killed if origin was a board zone** (428.2.a); **not a subset of Move** (428.2.b); attribution: cleanup-kills attribute to the spell/ability that dealt the damage (428.5.c) |
| **Add (429)** | put resources in the Rune Pool. **Triggered/activated Adds resolve as soon as finalized; Priority/Focus don't pass; they resolve before other chain items finalize** (429.2–.2.a). **Spells that Add linger on the chain normally** (429.2.b) |
| **Channel (430)** | top of Rune Deck → board; **ready by default** (430.2.a); short deck → as many as possible; 2 during Channel Phase |
| **Burn Out (431)** | on deck-exhaustion: do as much as possible → **recycle trash into Main Deck (randomized)** → **choose an opponent to gain 1 point** → complete the action. Repeats if still empty; **points after the first cannot be replaced or prevented** (431.3.b). Is a **Replacement Effect** (431.5) |
| **Double (432)** | increase a numeric attribute by its current value |
| **Swap (433)** | reverse two numeric values via paired increase/decrease of the difference; equal values → no effect (433.1.c) |
| **Attach (434)** | link cards; Top-Most gains attached Effect Text + Might Bonus; attached card's **printed Rules Text goes Inactive** (434.1.e); re-attaching detaches from the old host; **attaching is not a Move** (434.4.a); states unchanged (434.5) |
| **Detach (435)** | inverse; a detached Gear at a Battlefield is **Recalled next Cleanup** (435.4.a); zone-change detach resolves to the host's last board location (435.4.b) |
| **Predict (436)** | look at top N, recycle any number, rest back on top in any order (436.1.a); short deck → predict as many as possible and **no Burn Out** (436.4.a) |
| **Prevent (437)** | reduce damage via a tracked **Prevent Value** on the unit; dealt damage floors at 0; the value decrements as it absorbs (437.3); fully-prevented damage **was never dealt** (437.4); damage can still be *assigned* to prevented units (437.5); **"All" is never lethal** (437.5.b). Is a **Delayed Replacement Effect** (437.7) |
| **Replace (438)** | create a token in place of a card/token, **inheriting all effects and statuses** (438.1); replaced card → Banishment but counts as *Replaced*, not Banished (438.5.a); **Swap Back** returns the original inheriting current effects (438.7) |
| **Create (439)** | produce a Game Object that didn't exist; created directly into a specified (or type-appropriate) zone; owner = creator; created permanents/runes/legends/spells controlled by owner; **created battlefields are uncontrolled** (439.4.b) |
| **Burn (440)** | top of Main Deck → trash; burn as many as possible, **Burn Out** if short, then finish (440.4) |
| **Empower (441)** | binary state; can't empower the already-Empowered; **becoming Empowered is a referenceable event** (441.2.a) |
| **Disempower (442)** | remove Empowered; only affects currently-Empowered objects |
| **Skip (443)** | replace an event/turn-procedure **with nothing**; **nothing that triggers on it triggers** (443.2.a). Is a **Replacement Effect** (443.4) |
| **Pay (444)** | remove resources from the Rune Pool; declining to pay for a card/ability **undoes playing it** (444.2.a); **Reaction-keyword Add abilities may be activated any time you're instructed to Pay, finalizing and resolving immediately, ignoring normal restrictions** (444.2.c) |

## 6. Findings (Part 4 additions to the Phase-2 diff)

| Finding | Status |
|---|---|
| **Ability taxonomy is 5 types + 2 subtypes** | Passive/Replacement/Activated/Triggered/Delayed, with Reflexive and Linked. Legacy modeled a flat `EffectProgram` with no ability-type distinction at all — the single largest structural gap |
| **Replacement effects are a first-class subsystem** | 367–375 with event semantics, ordering by acted-upon object's controller, turn-order tiebreak, and pre-emption of simultaneous unmodified events. Legacy had none. Vendetta combat (465.2.c.5) depends on it |
| **Activated abilities: own-turn + Open State only** | 381 — a hard timing constraint the legacy never encoded |
| **Trigger Condition includes the immediately-following if-clause** | 383.2.a.1 — adjacency determines whether a conditional is checked at trigger time or at resolution. Card-text parsing must respect word order |
| **"You may" triggers are declined at step 2, not resolution** | 402.1 |
| **Trigger with no legal options is removed, not countered** | 402.4–.4.a |
| **Add abilities resolve immediately and pre-empt the chain** | 429.2, 400.2 — plus Reaction-Adds usable mid-payment ignoring normal restrictions (444.2.c). Legacy's `canAfford` was static; the real model is an interactive payment window |
| **Burn Out gives an opponent a point** | 431.2.c — deck-out is not a loss condition; it's a point-donation loop that ends when an opponent wins. Legacy had no burn-out model |
| **Stun: no Might contributed, but full Might still needed to kill** | 423.1.b–c — asymmetric; a naive "stunned = 0 Might" model would wrongly make stunned units trivially killable |
| **Countered cards were never "played"** | 425.1.b — play-triggers don't fire; costs still lost |
| **Kill only counts from board zones; Banish ⊄ Kill; Attach ⊄ Move** | 428.2, 427.2, 434.4.a — the action taxonomy has explicit non-subset relations that trigger-matching must honor |
| **Prevent is a tracked decrementing value, not a flag** | 437.2–.3; "All" never lethal |
| **Replace preserves statuses and can Swap Back** | 438.1, 438.7 |
| **Recycle ordering: Main random, Rune owner-chosen** | 416.5 — asymmetric randomization matters for Engine's deck-state reasoning |
| **Predict never triggers Burn Out** | 436.4.a — unlike Draw/Burn |

## 7. Open adjudications register — additions
7. Any card modeled with a flat effect program whose real text is a *triggered* or *replacement* ability — re-classify all 52 modeled cards by ability type before rebuilding their programs.
8. Any prior reasoning treating deck-out as a loss — re-derive under Burn Out (431).
9. Stun modeling — re-derive under 423.1.b–c.

## 8. Next (Part 5)
Keywords (800s, incl. Vendetta additions) and Additional Rules (700s: Buffs, Bonus Damage, Attachment, costs-within-instructions, XP if present, Modes of Play/2v2).
