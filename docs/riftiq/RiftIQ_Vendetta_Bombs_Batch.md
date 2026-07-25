# RiftIQ - Vendetta Bomb-Answer Puzzles (Batch V)

**Module:** M5 (RiftIQ) - **Date:** 2026-07-23 - **Status:** for Ashwin review.
Task: "RiftIQ: author puzzles testing Vendetta sealed bombs" (TickTick `6a5f96af8f0846c75cf35d2f`).

This is a **themed set, not Batch 2.** Batch 2 content authoring remains held pending the
three open questions. Domain rotation for Batch 2 is unaffected by this set.

All card data rebaselined against the repo's canonical `src/data/cards.json` (918 cards)
today, not the July 10-14 TickTick snapshot. Every puzzle passes validation gates A-I from
`docs/riftiq/RiftIQ_Batch1_v4.md`, including gate G (legend-passive audit, both sides).

---

## 0. Format resolution: these are legal in BOTH sealed and constructed

The task says "sealed bombs," but our authoring rule is constructed two-domain (every card
inside the legend's two domains). Sealed permits up to three domains, so a sealed board is
not automatically a legal constructed board.

**Resolution: every board below is built two-domain.** A two-domain board is legal in
constructed *and* legal in sealed, since sealed allows up to three. So these puzzles need no
new format gate, no new board chrome, and they are directly useful for pre-rift sealed prep.
This is the safe subset, and it is why no puzzle here uses the three-domain combos flagged in
yesterday's RiftCoach brief validation.

---

## 1. The rebaseline (what changed vs the cached list)

**Evidence:** `src/data/cards.json`, filtered `setId == "VEN"`, `type == "Unit"`,
`might >= 6`. Command run in-session; results below.

**All 11 cached bombs verified correct** - every name and Might value in the TickTick
snapshot matches today's `cards.json`. No drift. Base codes confirmed (the pipeline is
already dropping alternate-art suffixes, so `Renekton, Rage Fueled` correctly resolves to
`ven-019-166`, not `ven-019a-166`).

**But the cached list is incomplete: there are 19 Vendetta units at M6+, not 11.** Eight were
missing:

| Card | Code | Might | Energy | Domain | Why it matters |
|---|---|---|---|---|---|
| **Sandstone Chimera** | `ven-036-166` | 8 | **7** | Calm | The most efficient M8 in the set, and it was absent entirely. Cheaper than Eclipse Dragon (E8) and Nasus Ascended (E8), far cheaper than Plaza Guardian (E10). Also warps the game: "players only channel 1 rune at the start of their Channel Phase." |
| Shen, Scourge of Shadows | `ven-042-166` | 6 | 5 | Calm | M6 for 5 |
| Nasus, Guardian of Knowledge | `ven-063-166` | 6 | 5 | Mind | M6 for 5 |
| Swain, Visionary | `ven-065-166` | 6 | 6 | Mind | Vision, conquer trigger |
| Baccai Sandspinner | `ven-001-166` | 6 | 6 | Fury | Empower/Deflect/Assault |
| Minah Swiftfoot | `ven-111-166` | 6 | 6 | Chaos | Move trigger, discard/draw |
| Horns of the Dragon | `ven-118-166` | 6 | 6 | Order | Pure vanilla **[Tank]**, ideal clean combat-math body |
| Ocean Drake *(was listed)* | `ven-115-166` | 7 | 8 | Chaos | Confirmed |

**Also reconciled:** yesterday's flagged discrepancy in the RiftCoach brief's Might
distribution. The brief said 91 Vendetta units; I said 95 and flagged it. **The brief was
right and I was wrong** - I had counted alternate-art duplicates from the raw riftcodex JSON.
The repo's deduplicated `cards.json` gives exactly 91 units, and every bucket matches the
brief (M0×1, M1×3, M2×11, M3×20, M4×25, M5×13, M6×10, M7×3, M8×4, M10×1). No correction
needed on RiftCoach's side; the correction is mine.

---

## 2. The pedagogical spine: there is no removal for a bomb

Verified against every Vendetta card whose text can affect a unit. **Every hard-kill effect in
the set is threshold-capped at 3 Might or less:**

| Card | Code | Cap |
|---|---|---|
| Lacerate | `ven-127-166` | kill if 3 or less |
| Wind and Ghosts | `ven-106-166` | banish if 3 or less, **otherwise return to hand** |
| Mel, Defiant Soul | `ven-110-166` | banish if 3 or less |
| Twilight Step | `ven-105-166` | move if 3 or less |

And the damage ceiling is low: Siphoning Strike 4 (7 with seven-plus runes), Shock Blast 4,
Ruthless Strike 3 (5 with discard), Decree of Rage 4 (Calm targets only), Consuming Curse 2
plus bonus.

**So nothing in Vendetta kills an M6+ body outright.** The answers that do exist are all
*indirect*, and that taxonomy is what this set teaches:

| Answer pattern | Cards | Puzzle |
|---|---|---|
| Read the drawback (the bomb is not what it looks like) | Sacred Protector's own text | **V1** |
| Bounce instead of kill | Wind and Ghosts, Ocean Drake | **V2** |
| Attack the condition, not the threat | any small-unit removal | **V3** |
| Out-size it (board-relative removal) | Onslaught + Public Execution | **V4** |
| Shrink into threshold | Decree of Insight, Mesmerize + Mel legend | deferred (multi-step) |
| Mass reset | Cataclysmic Duel `ven-090-166` | future |

---

## 3. The puzzles

### V1 - "The bomb that can't punch" - Order - Easy

```
LEGENDS  You: Fiora, Grand Duelist (Body/Order)   Opp: Lux, Lady of Luminosity (Mind/Order)
SCORE    You 3/8   Opp 4/8      TURN  T6, YOUR Action phase, YOU active

BATTLEFIELDS
  BF1 "Sunward Steps"   controller: opponent
  BF2 "Quarry Road"     controller: neutral

YOU
  In play  Base: Vanguard Sergeant M4 (Order) [ready] ; First Mate M3 (Body) [ready]
  Runes    5 ready (Body,Body,Order,Order,Order)
  Hand     (2 cards)   Trash -  Deck 19  Banish 0  Hidden 0  XP 0

OPP
  In play  BF1: Sacred Protector M6 (Order) [alone, lone defender]
  Runes    2 ready / 4 total    Legend exhausted
  Hand     3 cards (hidden)   Trash -  Deck 20  Banish 0  Hidden 0  XP 0
```

Sacred Protector reads: *"I don't deal combat damage unless I'm at a battlefield with exactly
one other unit you control."* It is alone, so the opponent controls **zero** other units
there.

**Goal:** conquer BF1.

- **[CORRECT] `attack_both`** - move Vanguard Sergeant and First Mate to BF1 and attack.
  The Protector deals **no combat damage** (it is alone, not "exactly one other"). Your two
  units deal 4 + 3 = **7 >= 6**, so it dies, and both of yours take zero and survive. You
  conquer BF1.
- **[wrong] `attack_sergeant`** - attack with Vanguard Sergeant alone. It deals 4 < 6, so the
  Protector lives. Your unit takes zero and survives, but nothing is conquered.
- **[wrong] `attack_firstmate`** - attack with First Mate alone. 3 < 6. Same failure, less
  damage.
- **[wrong] `hold`** - keep both at base out of respect for a 6-Might body. Nothing happens,
  and the opponent keeps BF1.

**Hint.** Read the Protector's own text before you read its Might. What does it need in order
to hit back, and does it have that right now?
**Key concept.** A large Might number is not automatically a wall. Sacred Protector only deals
combat damage with *exactly one* other friendly unit beside it, so alone it is a 6-Might
punching bag. Attack it with two small bodies and you lose nothing.
**Rules.** Death = damage dealt is greater than or equal to Might. Damage is assigned
simultaneously by both sides. Conquer = clear every defender and survive.
**Gate checks.** (G) Fiora's legend triggers only when a unit becomes Mighty and merely
channels a rune - no combat effect. Lux's legend draws on a spell costing 5 or more - no
combat effect, and the opponent's legend is exhausted. (H) Opponent maximum this turn is
4/8 on their own turn; they cannot win before your line resolves. (F) Sacred Protector's
ability is a single static clause. First Mate's on-play already resolved; only its Might is
load-bearing. (I) Decision sits on your turn, before any pass-priority.
**Cards.** `ven-129-166`, `ogn-219-298`, `ogn-132-298`, `sfd-205-221`, `ogs-021-024`.

---

### V2 - "Bounce, don't kill" - Chaos - Easy

```
LEGENDS  You: Khazix, Voidreaver (Body/Chaos)   Opp: Volibear, Relentless Storm (Fury/Body)
SCORE    You 5/8   Opp 4/8      TURN  T8, opponent's Action phase, OPP active
         (attack declared on BF1; showdown open, you hold priority)

BATTLEFIELDS
  BF1 "Ashen Causeway"  controller: you (must hold)
  BF2 "Tidewater Gate"  controller: opponent

YOU
  In play  BF1: Shipyard Skulker M3 (Chaos) [defending]
  Runes    4 ready (Chaos,Chaos,Chaos,Body)
  Hand     Wind and Ghosts (Chaos, E3, [Action]) ; (1 card)
  Trash -  Deck 16  Banish 0  Hidden 0  XP 0

OPP
  In play  BF1: Eclipse Dragon M8 (Fury) [attacking, alone]
  Runes    0 ready / 8 total
  Hand     2 cards (hidden)   Trash -  Deck 14  Banish 0  Hidden 0  XP 0
```

Wind and Ghosts reads: *"Choose a unit at a battlefield. If it has 3 Might or less, banish it.
Otherwise, return it to its owner's hand."* It is **[Action]** speed, so it is legal in this
showdown.

**Goal:** hold BF1.

- **[CORRECT] `bounce_dragon`** - Wind and Ghosts targeting Eclipse Dragon.
  The Dragon has 8 Might, which is more than 3, so it is **returned to its owner's hand**
  rather than banished. The attack evaporates, you hold BF1, and they must find eight energy
  again to redeploy it. You cannot kill this thing, so you undo it instead.
- **[wrong] `bounce_own`** - Wind and Ghosts targeting your own Shipyard Skulker.
  The trap. Your Skulker has 3 Might, which is **3 or less**, so it is **banished**, not
  returned. You destroy your own defender and hand over BF1.
- **[wrong] `take_it`** - do nothing. Your M3 takes 8 and dies; it deals 3, nowhere near
  lethal to an 8. The Dragon conquers BF1.
- **[wrong] `save_it`** - hold Wind and Ghosts for a smaller target later. There is no later
  that matters; BF1 falls now.

**Hint.** Wind and Ghosts does two different things depending on one number. Check that number
against both units on this battlefield before you choose a target.
**Key concept.** The same card banishes small units and merely bounces big ones. Against a
bomb you cannot kill, bouncing is the answer: it costs them the whole eight-energy investment
and buys you the battlefield. Pointed at your own small unit, the identical card is a
disaster.
**Rules.** Wind and Ghosts: banish at 3 Might or less, otherwise return to hand. [Action]
speed is legal in a showdown. Death = damage greater than or equal to Might.
**Gate checks.** (G) Your legend's abilities are XP-gated and you are at **XP 0**. Volibear's
legend triggers on *playing* a Mighty unit; the Dragon is already in play, and the opponent
has 0 ready runes regardless. (H) Opponent maximum this turn is 5/8. (F) Wind and Ghosts is
one conditional effect; Eclipse Dragon's Accelerate/draw trigger fires on *moving*, already
resolved. (I) The decision sits in the showdown, before both players pass priority into
damage.
**Cards.** `ven-106-166`, `ven-016-166`, `ogn-175-298`, `unl-201-219`, `ogn-249-298`.

---

### V3 - "Kill the condition, not the threat" - Order - Hard

```
LEGENDS  You: Lux, Lady of Luminosity (Mind/Order)   Opp: Shen, Eye of Twilight (Calm/Order)
SCORE    You 4/8   Opp 7/8      TURN  T9, YOUR Action phase, YOU active

BATTLEFIELDS
  BF1 "Kinkou Sanctum"  controller: opponent (held since T8)
  BF2 "Lantern Row"     controller: you

YOU
  In play  BF2: Pit Crew M3 (Mind)
  Runes    4 ready (Mind,Order,Order,Order)
  Hand     Lacerate (Order, E2) ; (1 card)
  Trash -  Deck 15  Banish 0  Hidden 0  XP 0

OPP
  In play  BF1: Shen, Leader of the Kinkou Order M7 [Shield 1] (Order)
                + Vanguard Sergeant M4 (Order)
  Runes    3 ready / 6 total    Legend exhausted
  Hand     2 cards (hidden)   Trash -  Deck 13  Banish 0  Hidden 0  XP 0
```

Shen, Leader of the Kinkou Order reads: *"[Shield 1] When I hold, if there is exactly one
other unit you control here, you score 1 point."* The opponent is at **7/8** and holds BF1
with Shen plus **exactly one** other unit. If that board survives into their Beginning Phase,
Shen's trigger scores their 8th point and they win.

Lacerate reads: *"Choose a unit. If it's [Empowered], disempower it. Then kill it if it has 3
Might or less."*

**Goal:** prevent the opponent from scoring (survive their next Beginning Phase).

- **[wrong] `lacerate_shen`** - Lacerate targeting Shen. Shen has **7 Might**, far above
  Lacerate's 3-or-less threshold, so nothing happens. Your only answer is spent and they score.
- **[wrong] `attack_shen`** - move Pit Crew to BF1 and attack Shen. Defending, Shen is
  7 + **Shield 1** = 8. Your M3 dies, deals 3, and the board is unchanged - except you have
  now also abandoned BF2.
- **[wrong] `hold_bf2`** - stay home and hold BF2. Safe, and irrelevant: Shen's trigger fires
  on *their* turn and wins the game regardless of what you hold.
- **[CORRECT] `lacerate_sergeant`** - Lacerate targeting the Vanguard Sergeant (M4)...

> **AUTHORING ERROR - THIS PUZZLE IS BROKEN AS DRAFTED.** Vanguard Sergeant is **M4**, which
> is above Lacerate's 3-or-less threshold, so the intended correct answer does not work
> either. The companion unit must be **3 Might or less** for this puzzle to function. Fix
> before review: replace Vanguard Sergeant with a 3-Might Order body (for example
> **Reluctant Leader** `ven-121-166`, M3 Order, though its "+2 Might when you play another
> unit" trigger needs checking, or a base-set Order M3). I am flagging rather than silently
> patching because the swap changes the opponent's board and needs a fresh gate pass.
> **Do not ship V3 until this is corrected and re-verified.**

**Intended key concept** (once fixed). Shen is unkillable with what you hold, but its trigger
has a *condition*: exactly one other friendly unit. Remove the companion and the trigger stops
firing. When you cannot answer the threat, answer the thing the threat depends on.
**Cards.** `ven-138-166`, `ven-127-166`, `ogn-091-298`, `ogs-021-024`, `ven-147-166`.

---

### V4 - "Out-size what you cannot kill" - Body - Hard

```
LEGENDS  You: Ambessa, Matriarch of War (Body/Order)   Opp: Miss Fortune, Bounty Hunter (Body/Chaos)
SCORE    You 6/8   Opp 7/8      TURN  T10, YOUR Action phase, YOU active

BATTLEFIELDS
  BF1 "Noxian Approach"  controller: opponent (held since T9)
  BF2 "Iron Ford"        controller: you (held since T9)

YOU
  In play  BF2: Vanguard Attendant M5 (Order) [your only unit]
  Runes    6 ready (Body,Body,Body,Order,Order,Order)
  Hand     Onslaught (Body, E4) ; Public Execution (Body/Order, E2)
  Trash -  Deck 12  Banish 0  Hidden 0  XP 0

OPP
  In play  BF1: Corrupted Dragon M10 (Body) [holding]
  Runes    1 ready / 10 total    Legend exhausted
  Hand     2 cards (hidden)   Trash -  Deck 11  Banish 0  Hidden 0  XP 0
```

The opponent is at **7/8** and holds BF1 with an M10. If that holds into their Beginning
Phase, they score and win. You hold BF2 and must keep holding it.

Onslaught: *"Give a unit +6 Might this turn."* (E4, Normal speed.)
Public Execution: *"Choose a friendly unit. Kill an enemy unit with less Might than it."*
(E2, Normal speed.) You have exactly 6 energy.

**Goal:** remove the Corrupted Dragon **and** still hold BF2.

- **[CORRECT] `pump_then_execute`** - Onslaught your Vanguard Attendant (5 + 6 = **11**), then
  Public Execution choosing it. The Dragon's 10 is **less than 11**, so it dies. Your unit
  never left BF2, so you still hold it. Total cost 4 + 2 = 6, exactly your runes.
- **[wrong] `execute_only`** - Public Execution without the pump. Your only friendly is M5,
  and the Dragon's 10 is not less than 5, so there is no legal kill. Two energy wasted.
- **[wrong] `pump_and_attack`** - Onslaught to 11, then move to BF1 and attack. You would win
  that combat, but moving your only unit **abandons BF2**. You trade one battlefield for
  another while they sit at 7/8, and you have spent your whole turn.
- **[wrong] `pump_only`** - Onslaught and hold. A bigger unit that kills nothing. They score
  on their Beginning Phase.

**Hint.** Nothing in your hand kills a 10 by itself, and you cannot afford to move the only
unit holding your battlefield. Is there a way to make your unit bigger than the Dragon without
going anywhere?
**Key concept.** Public Execution is *board-relative* removal: its ceiling is whatever your
own biggest unit is, not a printed number. Pump first and it answers anything in the set,
without committing a single unit to combat. Against bombs, removal that scales off your board
beats removal with a fixed threshold.
**Rules.** Onslaught +6 this turn; Public Execution kills an enemy with strictly less Might
than a chosen friendly; both are Normal speed, so this is a your-turn line. Holding a
battlefield requires a unit to remain there.
**Gate checks.** (G) Your legend's ability is empower-gated and nothing here is Empowered.
Miss Fortune's legend grants Ganking on tap, and the opponent's legend is **exhausted**;
Ganking would not stop a kill spell in any case. (H) The opponent is at 7/8, which is the
dangerous case: verified they cannot act first because it is **your** turn and their scoring
trigger resolves in *their* Beginning Phase, after your line. (F) Onslaught and Public
Execution are each a single effect. Corrupted Dragon's "enters ready" clause is conditional on
score distance and it is already in play; its attack trigger cannot fire on your turn - both
provably inert. (I) The decision sits on your turn, before any combat.
**Cards.** `ven-091-166`, `ven-081-166`, `ven-154-166`, `ogs-016-024`, `ven-153-166`,
`ogn-267-298`.

---

## 4. Summary

| id | domain | mode | diff | teaches | status |
|---|---|---|---|---|---|
| `V1` | Order | BestLine | Easy | read the drawback; a big body is not always a wall | ready for review |
| `V2` | Chaos | BestLine | Easy | bounce instead of kill; the same card is a trap on your own unit | ready for review |
| `V3` | Order | BestLine | Hard | attack the condition, not the threat | **BROKEN - see inline flag** |
| `V4` | Body | BestLine | Hard | board-relative removal; pump beats a fixed threshold | ready for review |

Three of four are ready. V3 has an authoring error I caught during the gate pass and flagged
rather than patched, because the fix changes the opponent's board and needs a fresh audit.

## 5. Open items

1. **V3 fix** - needs a 3-Might-or-less companion unit for Shen, then a fresh gate pass.
2. **Sandstone Chimera** (`ven-036-166`) deserves its own puzzle. It is the most efficient M8
   in the set, was missing from the cached list entirely, and its "players only channel 1 rune"
   clause is a resource-denial effect nothing else in this batch teaches.
3. **Cataclysmic Duel** (`ven-090-166`, Body, E8: *"Each player chooses a unit they control.
   Kill the rest."*) is the only mass answer in the set and is unrepresented here.
4. **Difficulty spread** is 2 Easy / 2 Hard. If this set grows to six, the Batch 1 convention
   would be 2 Easy / 4 Hard.
5. **Is this set its own daily track** (a Vendetta-launch themed run) or does it fold into the
   main rotation? Affects the daily mechanic's track composition.
