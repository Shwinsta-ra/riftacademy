# RiftIQ thread - data & rulings owed (Master Card Inventory + Card Questions control sheet)

From: RiftIQ (M5) thread. For: control thread, to merge with other threads' asks.
Scope: strictly the two canonical workbooks. Cross-thread items (RiftCore registry) are
listed at the end as linkage only, not as asks on these sheets.

All card codes verified against cards.json. Use BASE codes only: ignore alternate-art
(trailing letter, e.g. -090a-), Signature (asterisk), and Overnumbered variants.

====================================================================
A. MASTER CARD INVENTORY  (canonical for domain + card metadata)
====================================================================

--- A1. Confirm / lock domains for every card the puzzles use ---
These are the exact cards in Batch 1 (v3). Confirm each domain matches the Master
Inventory (it overrides the JSON if they differ).

UNITS
  Chemtech Enforcer            ogn-003-298   Fury    M2   [Assault 2]
  Eager Drakehound             sfd-006-221   Fury    M3
  Magma Wurm                   ogn-011-298   Fury    M8
  Playful Phantom              ogn-049-298   Calm    M5
  Pit Crew                     ogn-091-298   Mind    M3
  Mega-Mech                    ogn-088-298   Mind    M8
  LeBlanc, Everywhere At Once  unl-090-219   Mind    M4   [Backline]
  Demacian Diplomat            unl-092-219   Body    M2
  First Mate                   ogn-132-298   Body    M3   (on-play: ready a unit)
  Fiora, Peerless              sfd-110-221   Body    M3   (double Might one-on-one)
  Bilgewater Bully             ogn-125-298   Body    M6
  Vanguard Sergeant            ogn-219-298   Order   M4
  Vanguard Attendant           ogs-016-024   Order   M5
  Renata Glasc, Industrialist  sfd-171-221   Order   M4
  Harnessed Dragon             ogn-234-298   Order   M6
  Shipyard Skulker             ogn-175-298   Chaos   M3
  Evershade Stalker            unl-123-219   Chaos   M3
  Jae Medarda                  sfd-142-221   Chaos   M5
  Kha'Zix, Mutating Horror     unl-143-219   Chaos   M4   [Ambush]

SPELLS / KEY CARDS
  Charm                        ogn-043-298   Calm         (move an enemy unit)
  En Garde                     ogn-046-298   Calm         [Reaction] +1, +1 if solo
  Smoke Screen                 ogn-093-298   Mind         [Reaction] debuff
  Thousand-Tailed Watcher      ogn-116-298   Mind         [Accelerate] mass -3 Might
  Bellows Breath               sfd-080-221   Mind         [Action][Repeat] damage
  Punch First                  sfd-097-221   Body         [Action] +5 Might this turn
  Death from Below             unl-186-219   Fury/Chaos   [Action] kill a unit at a BF
  Shen, Kinkou                 ogn-241-298   Order        [Reaction][Shield 2][Tank]

--- A2. Legend -> domain-pair map (needed for deck-legality validation) ---
Every card a player controls must sit inside the legend's two domains. Confirm this map;
this is the gate the puzzle checklist runs.

  Vi, Piltover Enforcer        unl-187-219   Fury/Order
  Pyke, Bloodharbor Ripper     unl-185-219   Fury/Chaos
  Volibear, Relentless Storm   ogn-249-298   Fury/Body
  Master Yi, Wuju Master       unl-191-219   Calm/Body
  Yasuo, Unforgiven            ogn-259-298   Calm/Chaos
  Leona, Radiant Dawn          ogn-261-298   Calm/Order
  LeBlanc, Deceiver            unl-199-219   Mind/Order
  Kha'Zix, Voidreaver          unl-201-219   Body/Chaos
  Poppy, Keeper of the Hammer  unl-203-219   Body/Order
  Fiora, Grand Duelist         sfd-205-221   Body/Order

  NOTE: Master Yi has two legend cards - Wuju Master unl-191-219 and the Starter
  "Wuju Bladesman" ogs-019-024 (both Calm/Body, your primary deck). Confirm which is the
  canonical legend id for puzzles, or that both are interchangeable.

--- A3. Structured combat-timing keyword flags (CRITICAL) ---
Combat legality depends entirely on which cards can join a defense AFTER an attack. I need
a canonical per-card flag (ideally a dedicated column so the harness does not parse text)
for: Reaction / Ambush / Hidden / Quick-Draw. Confirm for these, and ideally give me the
full list of cards carrying each so future batches are legal by construction.

  Shen, Kinkou                 ogn-241-298   Reaction   (also Shield 2, Tank)
  En Garde                     ogn-046-298   Reaction
  Smoke Screen                 ogn-093-298   Reaction
  Kha'Zix, Mutating Horror     unl-143-219   Ambush
  REQUEST: full roster of Reaction / Ambush / Hidden / Quick-Draw cards.

--- A4. Structured keyword + value column (combat-math harness) ---
Assault X / Shield X / Tank / Backline / Stun, with values. Confirm:
  Chemtech Enforcer            ogn-003-298   Assault 2
  LeBlanc, Everywhere At Once  unl-090-219   Backline
  Shen, Kinkou                 ogn-241-298   Shield 2, Tank
  REQUEST: the same structured keyword+value for the broader keyword-bearing set as we scale.

--- A5. Function / spell Subtype / Ability Target (the provisional columns) ---
These are flagged provisional in the Inventory. Refining them for the cards below unlocks
(a) function-tag-driven puzzle generation for the per-card program and (b) the RiftCore
registry adds (section C). Proposed values for your edit:

  card                         code          Function                          Subtype        Ability Target
  Fiora, Peerless              sfd-110-221   self-buff: double Might if 1v1     Unit           self
  First Mate                   ogn-132-298   ready a unit (on-play)             Unit           friendly unit
  Punch First                  sfd-097-221   buff +5 this turn                  Action spell   a unit
  En Garde                     ogn-046-298   buff +1 (+1 if solo)               Reaction spell a friendly unit
  Kha'Zix, Mutating Horror     unl-143-219   self-buff +2 vs lone enemy; Ambush Unit           self
  Death from Below             unl-186-219   removal: kill a unit at a BF       Action spell   a unit at a battlefield
  Charm                        ogn-043-298   movement: move an enemy unit       Action spell   an enemy unit
  Smoke Screen                 ogn-093-298   debuff: -Might (floor?)            Reaction spell an enemy unit(s)?
  Thousand-Tailed Watcher      ogn-116-298   mass debuff: -3 Might to enemies   Unit           all enemy units
  Bellows Breath               sfd-080-221   damage (repeatable)                Action spell   a unit? (confirm target)

====================================================================
B. CARD QUESTIONS CONTROL SHEET
   (workbook file id 1ObVFO_XPcddGhsp06FOuZ5FamQ0ccQ2Mm_SmDf4hRVM)
====================================================================

--- B1. RA_Game Rules Config  (gid=1646339458) - rulings to codify ---
Puzzle correctness and the RiftCore kernel both depend on these. Each needs your table
ruling. (Numbers 1-4 are the live Batch 1 [CHECK]s; 5-10 are recurring rules I encoded and
want locked.)

  1. Ambush vs removal (chaos-1): can an [Ambush] unit be played as a Reaction to a
     battlefield where your unit currently sits, in response to a spell that will remove
     that unit? (You satisfy "where you have units" at the instant of the reaction.)
  2. "alone" vs "solo" definitions:
     - Kha'Zix "if an enemy unit is alone here": alone = the only ENEMY unit at that
       battlefield, regardless of your units present?
     - En Garde "solo": your unit is the only FRIENDLY unit at its location?
  3. holdAtSeven timing: a held battlefield scores at YOUR Beginning Phase; confirm a single
     mid-turn conquer cannot be the final / winning point.
  4. Point race: at 7, if the opponent conquers to reach 6/8 on their own turn, they do NOT
     win before your hold scores. Confirm the ordering.
  5. Tank spill: excess damage beyond a Tank unit's lethal spills freely onto your other
     units at that battlefield? (order-1)
  6. Backline assignment: a Backline unit is assigned lethal LAST, after every non-Backline
     unit is dealt lethal? (mind-1)
  7. one-on-one (Fiora): exactly one attacking unit vs one defending unit at a battlefield,
     with no other units on either side there? (body-1)
  8. Multi-defender combat: one attacker vs multiple defenders - who assigns the attacker's
     damage among them, and how do Tank / Backline constrain that assignment? (body-1:
     Diplomat +5 vs two M3s)
  9. Stun: a stunned unit deals 0 but still contests / holds its battlefield? (prior [CHECK])
  10. Minimum-Might floor: when a debuff would drop a unit below the floor (e.g. min 1),
      at what point is the floor applied? (prior [CHECK], relevant to Smoke Screen)

--- B2. RA_Box Positions  (gid=803528264) - board layout for puzzle rendering ---
If this tab drives the top-down board layout, confirm / extend it to cover the puzzle board
zones for BOTH players: base, BF1, BF2 (and BF3 if used), hand, rune pool, trash. Needed by
the puzzle UI to render the full board state. If Box Positions is UI-only and not the right
home, tell me where the puzzle-board zone layout should live.

--- B3. RA_Card Question Bank (gid=1395588089) & RA_Card Attribute Toggles (gid=516085893) ---
No asks from RiftIQ. These are RiftRecall's surface. Noted so any asks there in the merge
are attributed to the right thread, not to RiftIQ.

====================================================================
C. CROSS-THREAD LINKAGE (not asks on these two sheets)
====================================================================
The RiftCore registry adds that move body-1 and chaos-1 from cardTruth+author to kernel
(Fiora one-on-one double, First Mate ready, Kha'Zix +2 / Ambush, Death from Below removal)
go to the Core thread. They are SOURCED from the A5 Function / Subtype / Ability Target
definitions above, so completing A5 for those five cards unblocks the registry work.
Flagging the dependency so the merge sequences A5 before the Core registry tickets.
