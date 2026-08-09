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

## 10. Conceding & Removal of a Player (CR 649–652) — addendum, 2026-08-08

**Gap history:** absent from all seven Parts and cited nowhere in this model until now. Root cause: the CR's own numbering jumps from ~489 straight to 649 (700 "Additional Rules" follows immediately after 652), and Phase 1's sectional reading stepped over the discontinuity — a coverage failure, not a searchability one (a keyword search for "concede" would have found nothing either, since the text is present but never read). Found by a 2026-08-07 coverage reconciliation (enumerable CR section numbers checked against what the model cites), not by any content-based scan.

**⭐ Two independent win triggers exist, not one.** §9 above (Cleanup task order, 323.1) covers the points-based win check. **651.1 is a second, structurally different trigger: if a concession leaves exactly one other player, that player Wins outright**, no points check involved. The kernel must not treat "win" as a single Cleanup-task predicate — it needs to also fire on this concession-driven path.

- **Concede (650):** any player, at any time — a Discretionary action available regardless of Priority/timing restrictions (no cost, no window).
- **651. On concession, the player is removed from the game in progress:**
  - **651.1:** exactly one other player remains → that player **Wins** (see ⭐ above).
  - **651.2:** more than one player remains → proceed to **Removal of a Player** (652). *(Inert in 1v1 — a 1v1 concession always hits 651.1 and ends the game; there is no "more than one remains" case with only two players to begin with.)*
  - **651.3:** Removal means the player can no longer make choices or otherwise influence the game — a status distinct from simply losing; the game continues around them.
  - **⭐ 651.4 — Teammates cascade:** if the conceding player has Teammates (Mode of Play with teams — 2v2/`magma_chamber`), **those Teammates also lose and are removed**, consistent with the already-modeled **489.6.a "Teammates win or lose together"** (Part 1/2 references). This is the load-bearing case for 2v2: one concession can end the game for a whole team in a single step, potentially triggering 651.1 for the opposing team.

- **652. Removal of a Player — steps, in order:**
  1. **652.1** Banish (→ Banishment zone, already modeled at Part 3 §2) all permanents, runes, and facedown cards they **currently control**, plus all such cards they **own** (a broader set than "control" — catches cards they own but a teammate or opponent currently controls, e.g. a stolen unit).
  2. **652.2** Remove the Battlefield they contributed to the game, if in use: **replace it with a token battlefield with no abilities**.
     - **652.2.a** — this is a **Replace** operation, **rule 438**, first citation of that rule anywhere in this model; register it as a kernel primitive still to be specified.
     - **652.2.b** — units and hidden cards already at that location do **not** move and are otherwise unaffected by the swap itself.
     - **652.2.c** — any continuous effects the removed battlefield was applying **cease immediately**, which can change characteristics of units/hidden cards there (CR's own example: a "+1 Might here" battlefield disappears, units there lose the buff immediately, not at next Cleanup).
  3. **652.3** Remove **all** cards they own from the game — broader than 652.1's Banish step; this reaches cards never in play (hand, Main/Rune Deck, Trash, Champion Zone, Banishment already).
  4. **652.4** Counter all spells and abilities of all types they control that are currently on the Chain.
  5. **652.5** Proceed with the game — three independent hand-off rules, all keyed off whether the removed player held the relevant role:
     - **Turn (652.5.a):** if they were Turn Player, play proceeds in Turn Order to the next available player.
     - **Focus (652.5.b):** if they held Focus in a Showdown, the next player in order receives it; if their removal leaves all remaining players having passed Focus, the Showdown ends and play proceeds (Combat resolves, or a Cleanup completes).
     - **Priority (652.5.c):** if they held Priority on the Chain, the next player in order receives it; if their removal leaves all remaining players having passed Priority, the most recent Chain item resolves, with Priority re-established afterward per normal post-resolution rules.

**Materiality, confirmed:**
- **Inert in 1v1** — the game simply ends at 651.1.
- **Load-bearing in FFA3 (skirmish) and FFA4 (war)** — 651.2/652 apply directly; play must continue correctly with 2–3 remaining players.
- **Load-bearing in 2v2 (`magma_chamber`)** — 651.4's teammate cascade means a single concession can remove two players at once, immediately followed by a 651.1 check for the surviving team.
- All five modes are seeded in the `modes` table now, so nothing here is speculative scope — this addendum should land **before any multiplayer-mode work begins**, per the original ticket.

**Correction to the original ticket's materiality note:** the ticket that opened this gap stated "the tournament side IS covered (Part 6 records TR 410 Concessions and Intentional Draws)." **That is not accurate — verified directly against `docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part6.md`, which has zero mentions of "concession," "concede," or TR 410.** TR 410 (Concessions and Intentional Draws — a *different* rules document, Tournament Rules, not Core Rules 410 which is the unrelated Discretionary/Limited Actions classification already cited at Part 1 §5) governs conceding a **game or match** at the tournament-procedure level (410.1–410.2), plus policy items already out of Core's scope per Part 6 §2's "Pure policy" bucket (410.3 anti-bribery, 410.4 no-scouting, 410.5 officiate-as-concession-on-refusal). CR 649–652, covered here, is the complementary **in-game mechanical** question — what happens to the conceding player's board state and the remaining players' turn/Focus/Priority. Both are real gaps; this addendum closes the CR side only. **Recommend a short Part 6 follow-up** citing TR 410.1–410.2 as a one-line cross-reference to this section, and 410.3–410.5 filed under Part 6's existing "Pure policy — NOT Core's concern" table.

## 11. Process of Play — tail (CR 357–359)

- **Step 4 Pay (357):** pay combined Energy+Power; **during payment the controller may use Reaction-tagged Add abilities** (this is when runes are tapped/recycled — 357.1.a); non-standard costs in any order (357.2); **replaced costs still count as paid** (Zhonya's Hourglass example, 357.2.a); may not pay in ways that deterministically force illegal later choices, unless no alternative (357.3).
- **Step 5 Check Legality (358):** targets legal; costs paid; **outcome would not create an illegal state** (e.g. 3-player battlefield); timing permissions. **A Game Effect preventing an action does NOT make cards instructing that action illegal to play — the action is simply skipped at resolution as impossible** (358.3.a).

## 12. Findings (Part 3 additions to the Phase-2 diff)

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
| **⭐ Concession is a second, independent win trigger** | 651.1 — last-player-standing, distinct from the points-based Cleanup win check (323.1); kernel must check both paths |
| **⭐ 2v2 concession cascades to Teammates** | 651.4 + 489.6.a — one concession can remove two players and immediately re-trigger the 651.1 check for the survivors |
| **Removal of a Player: 5-step sequence (Banish → replace Battlefield → remove owned cards → counter their chain items → hand off Turn/Focus/Priority)** | 652.1–652.5 — first full model of what happens to a removed player's board state; load-bearing for FFA3/FFA4/2v2, inert in 1v1 |
| **First citation of Replace (rule 438)** | 652.2.a — battlefield-replacement primitive not yet specified anywhere else in this model; register as an open kernel primitive |
| **TR 410 (Concessions and Intentional Draws) is still absent from Part 6**, despite the originating ticket's claim that it was already covered | Verified by direct grep against `RiftCore_v2_Canonical_Model_Part6.md` — zero hits. Distinct from CR 410 (Discretionary/Limited Actions, already cited Part 1 §5). Recommend a short Part 6 follow-up |

## 13. Open adjudications register — additions
5. Deck-size framing: champion-in-40 (constructed) — re-verify every deck-construction reference; check whether the sealed "25-minimum" also counts the champion (TR 602.4.a.2 wording) before re-ruling the legacy "card 26" claim.
6. Any analysis that assumed damage persists across turns, or that resources float across phase boundaries — re-derive under 317.2 / 167.
7. Rule 438 (Replace) needs its own full citation and kernel primitive spec — this addendum only establishes that it exists and what one call site (652.2.a) requires of it.
8. Part 6 needs a follow-up addendum citing TR 410.1–410.2 (cross-reference to this section) and filing 410.3–410.5 under its existing "Pure policy" table.

## 14. Next (Part 4)
Abilities in full (360–406): passive/activated/triggered/reflexive/delayed/linked, replacement effects, presence rules; then the 32 Game Action definitions (413–444) verbatim — the complete effect vocabulary for the Phase-4 rebuild.
