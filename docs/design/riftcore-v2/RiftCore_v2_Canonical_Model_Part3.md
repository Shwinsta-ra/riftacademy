# RiftCore v2 — Canonical Model · Part 3: Game Concepts, Zones, Economy, Control, Cleanup

**Source:** Riftbound Core Rules RUP4 (2026-07-16, post-Vendetta). Clean-room; CR-cited throughout.

---

## 1. Deck construction (CR 101–103)

- A deck = Main Deck + Rune Deck + Champion Legend + Battlefields (count per Mode of Play) (103).
- **Champion Legend** (103.1): sets **Domain Identity**. Single-domain cards need that domain in identity; **multi-domain cards need ALL their domains in identity** (103.1.b.4). Effects can grant identity exceptions (103.1.b.5).
- **Main Deck: at least 40 cards, INCLUDING the Chosen Champion** (103.2 — "A Main Deck of at least 40 cards: A Chosen Champion Unit, as well as Units, Gear, and Spells"). Tournament constructed: exactly 40 including champion (TR 402.1).
- **Chosen Champion** (103.2.a): must be a champion unit whose champion tag matches the Legend's tag. **Name-based status**: any copy of the same-named card is "your Chosen Champion" for all rules/effects during play (103.2.a.3).
- **Copies: up to 3 per name** (103.2.b), champion included (a chosen Volibear + 2 more copies is legal). Different subtitles = different names (132.4).
- **Signature cards: max 3 total**, all must match the Legend's champion tag; never placeable in the Champion Zone (103.2.d).
- **Rune Deck: exactly 12 runes**, domain-identity constrained (103.3).
- **Battlefields**: unique names when multiple required (103.4.c).

## 2. Zones (CR 105–108) — the complete space model

**Board:** Bases (per-player Locations; your permanents+runes live there; public — 107.1) · Battlefield Zone (each Battlefield a Location; public — 107.2) · **Facedown Zones** (one sub-zone per Battlefield; **max occupancy 1**, adjustable, overflow trashed by controller; only placeable by the Battlefield's controller; **removed at next Cleanup on control loss**; NOT Locations; zone public, cards Private — 107.3) · Legend Zone (not a Location; Champion Legend immovable; non-champion legends can exist and leave — 107.4).

**Non-Board:** Chain (public) · Trash (per-player, unordered, public) · Champion Zone (public; champion playable from here normally; no return by normal means, and only if empty — 108.3.c) · Main Deck Zone (**order Secret**) · Rune Deck Zone (order Secret) · Banishment (per-player, unordered, public) · **Hand (contents Private; count PUBLIC — 108.7.e; unordered; targetable as a zone)**.

## 3. Setup (CR 110–118)

Legend → Legend Zone; Chosen Champion → Champion Zone; Battlefields set aside per Mode; shuffle both decks; determine Turn Order (random; mode sets First Player; clockwise default); **each player draws 4** (116); **Mulligan in turn order (117): set aside up to 2 → draw that many → THEN Recycle the set-asides** (bottom of deck; no shuffle); First Player begins.

## 4. Privacy (CR 128)

Three levels: **Secret** (no one may look — deck order), **Private** (controller/owner only — hand, own facedown cards), **Public** (anyone). A card's privacy defaults to its zone's. **Compulsion rule (128.6): a player cannot be compelled to act on secret/private cards when the effect specifies a card type/quality — the instruction may be ignored and is "deemed impossible"** (even without "may").

## 5. Game Objects (CR 119–127)

- Game Object = any piece that produces Game Effects or enables Game Actions (120); literal or logical (122); includes cards anywhere, runes, legends, battlefields, tokens, abilities on the chain, counters/status markers (123).
- **⭐ Object identity rule (124): an object changing zones to or from a Non-Board Zone becomes a NEW object; ALL temporary modifications cease — damage cleared, counters removed, granted keywords lost, statuses cleared.** The schema's instance lifecycle must mint a new instance id on such transitions; Engine's retroactive reasoning must respect it.
- Status vocabulary (124.2, non-exhaustive): Attached, Attacking, Buffed, Banished, Controlled, Defending, Empowered, Equipped, Exhausted, Facedown, Readied, Replaced, Revealed, Stunned, + Layer alterations.
- **Ownership** (127): who brought the card into the game (or created it).

## 6. Card anatomy & categories (CR 129–159, 176–187)

- Facedown = back presented on Board; front face = public even in piles (Trash) (129–130).
- Cost = Energy numeral + vertical Power symbols (131). **Name = "Short Name, Subtitle"; the full comma form IS the name** for all purposes (132.4).
- **Categories (133):** Main Deck cards → **Permanents (Units, Gear)** + **Spells** (trash after execution). Rune Deck → **Runes: channeled not played; remain on board but are NOT Permanents** (133.5.a.1, 161.1.a). Other → **Battlefields** and **Legends: NOT Permanents** (171, 175), never played, immovable, unkillable, but targetable and can carry all three ability kinds.
- **Supertypes:** Champion (units only), Signature (any type) (133.7). **Tags:** no innate rules meaning; Champion Tags link Legend/Champion/Signature (133.8).
- **Domains (134.2):** Fury [R] red · Calm [G] green · Mind [B] blue · Body [O] orange · Chaos [P] purple · Order [Y] yellow — the color-letter shorthands are CR-canonical.
- Rules Text = Abilities + **Instructions** (imperative; = game action + complement; execute at self-described timing, else at resolution — 135.2.b).
- **Multi-type objects (178):** union of properties/permissions; precedence: a Unit (regardless of other types) has Might, marks damage, enters exhausted, plays to any valid location, and is NOT recalled by Cleanup step 5 (178.1.a.1.a); a Rune always recycles to the Rune Deck. Multi-type objects are hit by effects touching ANY of their types (unit-gear dies to both "kill all units" and "kill all gear").
- **Tokens (179–185):** Game Objects created in play; controller = creator's controller unless specified; owner = creator's controller; creation effects may alter entry state/location/abilities (184). **Tokens are not cards; token-nature and card-nature are immutable** (185.1). Playable if their type is playable, per the normal Process of Play + creation stipulations.

## 7. Rune economy (CR 160–168)

- Exactly 12 runes; recycled runes return to the **Rune Deck** (161.2.b).
- Runes produce **Energy** (numeric, domainless) and **Power** (domain-typed; some Universal — 163.2.b).
- **Basic Rune abilities (164.2):** `[E]: [Reaction] — Add [1]` (exhaust for 1 Energy) and `Recycle this: [Reaction] — Add [C]` (Power of its own domain). Both are Reaction-speed **Add** abilities → per 337.2 they resolve immediately on finalization.
- **Rune Pool (165–167):** conceptual holder of available Energy/Power. **Empties at the start of each player's Main Phase AND at the end of each player's turn** (167) — floating resources have exact lifetimes; unspent is lost.
- Any ability with "Add" is a Rune-Pool addition (168).

## 8. Control & Contested (CR 188–196)

- Battlefield Control is binary (controlled-by-X or uncontrolled) (190.2).
- **Contested lifecycle (190.3):** applied when a non-controller's unit moves/is played/becomes present (if not already Contested); once a Showdown/Combat begins there it stays Contested until control is (re)established; contester-gone + no showdown → removed next Cleanup (190.3.b.1); **Game Effects cannot reference Contested** (190.3.d).
- **Establishing control (190.4):** by having units at the Battlefield at the end of a Showdown/Combat after Contested; maintained while your units remain (outside combat); **lost at Cleanup if no units + Open state + no ongoing Showdown/Combat** (190.4.c); frozen during Showdown/Combat (190.4.b).
- **Ability accountability (190.6):** Battlefield's controller controls its abilities (adds to chain, makes choices). **Uncontrolled battlefield → the Turn Player is responsible** and is treated as controller where needed (Arena's Greatest). **If the ability names a choosing player, that player controls the ability regardless of battlefield control** (Abandoned Hall — the accountable-player rule behind the Huwei missed-trigger case).

## 9. Cleanups — the state machine (CR 318–324) & Ending Phase (317)

**Cleanup triggers (319):** Open/Closed transition; phase transition; Pending Item added; item Finalized; item leaves the Chain; objects enter/leave Board; any status change; Move completed. Cleanups exclude chain finalize/resolve while running (320–321); state-changing Cleanups re-run to a fixed point (322).

**⭐ Cleanup task order (323):**
1. **Win check**: Points ≥ Victory Score AND strictly more than any opponent → win.
2. Attacker/Defender designation sync at the combat Battlefield (gain controller's designation; strip designations elsewhere).
3. Board state: **3a. Deathknell/on-death triggers noted** (location/attributes captured) → **3b. lethal-damage units killed to owners' Trash**.
4. Lose control of unoccupied controlled Battlefields (Open state, no ongoing Showdown/Combat).
5. **Recall**: unattached non-Unit Gear and non-Unit Runes at Battlefields; Permanents/Runes in bases other than their controller's; **remove Hidden cards from Battlefields not controlled by their owner → owner's Trash**.
6. Mark **Showdown Staged** at each Contested Battlefield (persists while Contested + contester's units present).
7. Mark **Combat Staged** where opposing players' units are present (persists while both sides present).

**Ending Phase (317):** Ending Step (end-of-turn effects) → **Expiration Step**: an Ending Special Cleanup inserting **"Heal all Units"**, **"all 'this turn' effects expire simultaneously"**, **"Rune Pools empty"** — looping if any FEPR occurred → next player becomes Turn Player.

## 10. Process of Play — tail (CR 357–359)

- **Step 4 Pay (357):** pay combined Energy+Power; **during payment the controller may use Reaction-tagged Add abilities** (this is when runes are tapped/recycled — 357.1.a); non-standard costs in any order (357.2); **replaced costs still count as paid** (Zhonya's Hourglass example, 357.2.a); may not pay in ways that deterministically force illegal later choices, unless no alternative (357.3).
- **Step 5 Check Legality (358):** targets legal; costs paid; **outcome would not create an illegal state** (e.g. 3-player battlefield); timing permissions. **A Game Effect preventing an action does NOT make cards instructing that action illegal to play — the action is simply skipped at resolution as impossible** (358.3.a).

## 11. Findings (Part 3 additions to the Phase-2 diff)

| Finding | Status |
|---|---|
| **Chosen Champion counts INSIDE the Main Deck total** | 103.2 + TR 402.1 ("exactly 40 including a chosen champion"). Contradicts the legacy "champion is card N+1, uncounted" framing → register |
| **Mulligan = up to 2, draw replacements FIRST, then Recycle set-asides to deck bottom** | 117 — no shuffle. Corrects the legacy shuffle-back placeholder |
| **Object identity: zone change to/from Non-Board = NEW object, all temp mods wiped** | 124 — instance-id lifecycle rule for the schema; constrains Engine's retroactive identity claims |
| **Hand count is Public Information** | 108.7.e — CR-grounds the capture framework's hand-size-required rule |
| **Damage heals at the end of EVERY turn** | 317.2.b Ending Special Cleanup "Heal all Units" — extends the combat-heal ruling; damage never persists across turns |
| **Rune Pool lifetimes** | 167 — empties at start of each Main Phase and end of each turn; floating-resource model required |
| **Basic runes are Reaction Adds** | 164.2 — resource generation is chain-participating (immediate-resolve per 337.2), usable mid-payment (357.1.a) |
| **Cleanup 7-step order with win-check FIRST and Deathknell-before-kill** | 323 — the kernel's Cleanup must implement this exact sequence |
| **Contested is effect-invisible** | 190.3.d — no card may reference it; kernel-internal only |
| **Battlefield ability accountability** | 190.6 — controller / Turn-Player-if-uncontrolled / ability-named-player. Foundation for Engine's trigger checks |
| **Prevented actions don't block playing** | 358.3.a — legality ≠ effectiveness; skip-as-impossible at resolution |
| **Compulsion rule for hidden zones** | 128.6 — type-specific instructions on private/secret cards are ignorable |
| **Runes, Battlefields, Legends are NOT Permanents** | 133.5, 171, 175 — type-system distinction |
| **Facedown Zone mechanics** | 107.3 — occupancy 1 (adjustable), controller-locked, cleanup-purged on control loss |

## 12. Open adjudications register — additions
5. Deck-size framing: champion-in-40 (constructed) — re-verify every deck-construction reference; check whether the sealed "25-minimum" also counts the champion (TR 602.4.a.2 wording) before re-ruling the legacy "card 26" claim.
6. Any analysis that assumed damage persists across turns, or that resources float across phase boundaries — re-derive under 317.2 / 167.

## 13. Next (Part 4)
Abilities in full (360–406): passive/activated/triggered/reflexive/delayed/linked, replacement effects, presence rules; then the 32 Game Action definitions (413–444) verbatim — the complete effect vocabulary for the Phase-4 rebuild.
