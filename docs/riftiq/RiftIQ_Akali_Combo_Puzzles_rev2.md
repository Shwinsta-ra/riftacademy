# RiftIQ - Akali Re-entry Combo Puzzles (Batch V, additions) - rev 2

**Module:** M5 (RiftIQ) - **Date:** 2026-07-23 - **Status:** V5 rewritten and ready; V6 held pending tonight's Inventory upload.
Supersedes rev 1. V5 redesigned per Ashwin: M5 and M7 defenders so Akali's full Might range is used, and she wins **both** fights.

---

## 0. What changed in rev 2

**V5 is no longer a feint.** Previous draft parked a throwaway M4 on BF1 and Akali left
without fighting. Ashwin's redesign puts an **M5 on BF1 and an M7 on BF2**, so each arrival
is sized to exactly one of her two Might steps:

| Arrival | Akali's Might | Defender | Result |
|---|---|---|---|
| first (BF1) | 4 + 2 = **6** | M5 | 6 beats 5, she survives |
| second (BF2) | 4 + 2 + 2 = **8** | M7 | 8 beats 7, she survives |

She conquers **both battlefields in a single turn** with one unit. That is a legal winning
line in its own right, which makes this a game-ending puzzle rather than a tempo one.

**This introduces a hard dependency on a rule that is documented nowhere.** See section 1.

**V6 (Riven + Pendulum Blade) stays held**, but is no longer blocked indefinitely - Ashwin is
uploading the corrected Pendulum Blade text to the Master Card Inventory tonight. Once the
corrected data reaches `cards.json`, V6 can be authored and verified. The data-gap finding in
rev 1 section 0 still stands and still needs a pipeline audit, because the same truncation
affects other Equipment.

---

## 1. The healing dependency - flagging this prominently

The redesign only works if **damage marked on a unit clears between combats.**

- **With healing:** Akali takes 5 at BF1, heals, arrives at BF2 clean at M8, takes 7, survives.
- **Without healing:** she carries 5 marked damage into BF2, takes 7 more for **12 total
  against 8 Might**, and dies. The puzzle's correct answer would be wrong.

**Evidence check:** I searched `docs/design/RiftCore_Data_Model.md`, `docs/riftiq/*.md`,
`CLAUDE.md`, and all of `src/` for any healing, damage-clearing, or end-of-combat rule.
**Zero matches.** Command run in-session; nothing in the repo documents this.

So this rests entirely on **Ashwin's ruling** ("she also heals after each combat"), which I
have taken as authoritative and used. Two consequences:

1. **It belongs in `RA_Game Rules Config`** (gid=1646339458) as a codified rule, alongside the
   ten already queued in the Data Asks doc. It is now load-bearing for shipped puzzle content,
   not just a background detail.
2. **RiftCore needs it too.** Any future kernel that resolves multi-combat turns has to model
   damage clearing, or it will compute V5 as a loss. Worth routing to the Core thread as a
   model requirement, separate from the multi-step ability work.

---

## 2. V5 - "Two swings, one blade" - Calm - Hard - READY

All card text verified against `src/data/cards.json`.

```
LEGENDS  You: Akali, Rogue Assassin (Fury/Calm)   Opp: Leona, Radiant Dawn (Calm/Order)
SCORE    You 6/8   Opp 5/8      TURN  T9, YOUR Action phase, YOU active

BATTLEFIELDS
  BF1 "Kinkou Waystation"  controller: opponent
  BF2 "Sunlit Terrace"     controller: opponent

YOU
  In play  Base: Akali, Silent M4 (Calm) [ready]
  Legend   Akali, Rogue Assassin - NOT Empowered, untapped
  Runes    4 ready (Calm, Calm, Fury, Fury) - exactly enough to Empower, nothing left over
  Hand     (1 card)   Trash -  Deck 15  Banish 0  Hidden 0  XP 0

OPP
  In play  BF1: Playful Phantom M5 (Calm) [lone defender]
           BF2: Astral Heron M7 (Calm) [lone defender]
  Runes    2 ready / 7 total    Legend untapped
  Hand     2 cards (hidden)   Trash -  Deck 12  Banish 0  Hidden 0  XP 0
```

**Akali, Silent** (`ven-038-166`, M4 Calm): *"I can't be chosen by enemy spells and abilities
unless I'm in combat. When I move to a battlefield, give me +2 Might this turn."*

**Akali, Rogue Assassin** (`ven-139-166`, Legend, Fury/Calm): *"[Empower (3)(Any)] [Action]
[Tap]: If it's your turn, move a friendly unit in a showdown to base and if I'm [Empowered],
ready it."*

You are at **6/8**. Conquering both battlefields on one turn is a legal winning line.

**Goal:** conquer **both** battlefields this turn.

- **[CORRECT] `small_first`** - Empower the legend, send Akali to **BF1** first (+2, she
  arrives at **6**), where she beats the M5 Phantom - it dies, she takes 5 against 6 and
  survives, **BF1 conquered**. Her damage clears. Tap the legend to pull her back to base
  **and ready her** (Empowered). Send her to **BF2**: her arrival trigger fires again for
  another +2, and because both read "this turn" they stack to **8**. She beats the M7 Heron,
  takes 7 against 8, survives. **BF2 conquered. Both battlefields, one unit, one turn.**
- **[wrong] `big_first`** - the sequencing trap. Send her to **BF2** first. One arrival puts
  her at **6**, and the Heron is **7**: she dies immediately. Her second +2 never happens
  because there is no second arrival. Order is the whole puzzle - she is only big enough for
  the M7 on her *second* trip.
- **[wrong] `no_empower`** - skip the Empower and run the same route. She conquers BF1 at 6,
  and the legend pulls her back to base - but the ready clause requires **[Empowered]**, so
  she sits exhausted at base. BF2 is untouched and you have spent your turn.
- **[wrong] `stop_at_one`** - take BF1 and hold. One conquer, and the opponent still holds
  BF2. A single mid-turn conquer is not a winning line.

**Hint.** Akali gets bigger every time she *arrives* at a battlefield, and your legend can
send her home to arrive again. She is only big enough for one of these two defenders on her
first trip - which one, and what does the legend need before there is a second trip?
**Key concept.** The legend turns an arrival trigger into a repeatable one, and the bonuses
stack within the turn. That makes Akali exactly a 6 on her first arrival and an 8 on her
second, so the small defender has to come first. Empower is not optional: without it she is
pulled back but never readied.
**Rules.** Akali, Silent gains +2 Might on arriving at a battlefield, this turn, and instances
stack. Damage marked on a unit clears between combats (**Ashwin's ruling - see section 1**).
The legend's action needs your turn, a unit in a showdown, and [Empowered] to ready.
Conquering both battlefields in one turn is a winning line.
**Guided.** 1) "she is a 4 - one arrival makes her 6, two arrivals make her 8." 2) "6 beats
the M5 but loses to the M7, so the M5 has to be first." 3) "Empower before you start, or the
legend pulls her back without readying her and there is no second trip."
**Gate checks.** (A) Every card is inside its legend's domains - Akali Silent is Calm under
Fury/Calm; both defenders are Calm under Calm/Order. (G) Leona's passive triggers only on
stunning an enemy; nothing here stuns, so it is inert. Astral Heron's text reduces the cost of
the *controller's* next card and has no combat effect. Playful Phantom is vanilla. (H) The
opponent is at 5/8 and it is your turn; they cannot win before your line resolves. (I) The
entire line sits on your turn.
**Multi-step flag.** The legend's action is compound ("move ... and if Empowered, ready it"),
so this is **hand-verified, not kernel-verifiable** until RiftCore's multi-step model lands.
Acceptable under the standing decision that puzzles are hand-authored for now.
**Cards.** `ven-139-166`, `ven-038-166`, `ogn-049-298`, `ven-044-166`, `ogn-261-298`.

---

## 3. Rules questions still gating V5

Reduced from rev 1, because the redesign resolved two of them (she now fights at BF1 rather
than leaving without combat, so the "does leaving cancel combat" question no longer applies,
and the two-battlefield route already sidesteps same-battlefield re-entry).

1. **Showdown window.** The legend pulls "a friendly unit **in a showdown**." V5 assumes she
   can be pulled *after* the BF1 combat resolves and she has conquered. If the pull must
   happen *during* the showdown - before damage - then she never kills the M5 and never
   conquers BF1, and the puzzle needs reshaping. **This is the one that most affects the
   board.**
2. **Damage clearing.** Confirmed by your ruling; flagged in section 1 because it is
   undocumented in the repo and now load-bearing.
3. **Stacking.** Two instances of "+2 this turn" both apply, giving 8. Taken as confirmed from
   your description.
4. **Move limits.** Any per-turn cap on how many times a unit may move to a battlefield,
   independent of being ready?
5. **Empower cost.** `cards.json` says `(3)(Any)`; the reveal image looks like `(3)(Calm)`.
   The board carries Calm runes so it works either way, but the Inventory should be reconciled.

---

## 4. Status across today's Vendetta work

| id | domain | teaches | status |
|---|---|---|---|
| `V1` | Order | read the drawback - Sacred Protector is not a wall | ready |
| `V2` | Chaos | bounce instead of kill; the same card traps your own small unit | ready |
| `V3` | Order | attack the condition, not the threat | **broken** - M4 companion vs Lacerate's 3-or-less |
| `V4` | Body | board-relative removal; pump beats a fixed threshold | ready |
| `V5` | Calm | re-entry stacks arrival triggers; sequence small before big | **ready** (5 rules [CHECK]s) |
| `V6` | Calm | the same engine driving Equipment and damage triggers | held - unblocks with tonight's Inventory upload |

Four ready, one broken and flagged, one queued behind a data fix.
