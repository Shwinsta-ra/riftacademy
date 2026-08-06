-- RiftAcademy Supabase - Migration 008: backfill from Master Card Inventory
--
-- Authority: RiftCore_to_M9_MasterInventory_Adjudication_2026-08-05.md
--
-- CORE FAULT CORRECTED HERE (adjudication section 1): the original card_bans seed
-- captured only the July 2026 ban announcement and missed the March 2026 list
-- entirely, understating bans by 7 of 11. Riftbound's first bans were effective
-- 2026-03-31. Standing rule now: any ruleset that accumulates over time must be
-- assembled from the COMPLETE announcement history, never the latest announcement.
--
-- Source split: this CSV is authoritative for cards (7/7 post-errata markers vs
-- Riftcodex 0/7, whose every snapshot predates the 2026-07-23 errata). Riftcodex
-- remains authoritative for card_printings, which the CSV does not cover.
--
-- LOGGED CSV CORRECTIONS, applied here rather than silently:
--   Shock Blast [Power]: '1' -> 'Mind'
--   Fight or Flight [Bans]: 'N/A, 1v1' -> 'all modes'
--   The Arena's Greatest [Ban effective date]: '07/31/2026' -> '2026-07-24'

begin;

-- 1. Merge the spurious Jayce row before anything else.
--    ven-194-166 is the OVERNUMBERED printing of ven-149-166 (collector 194 > set
--    total 166). The Riftcodex source dropped the champion prefix on that printing
--    only, so it collapsed into its own cards row instead of joining Jayce. Same
--    type, rarity and domains confirm identity. Repoint the printing, drop the row.
update card_printings set card_code='ven-149-166' where printing_code='ven-194-166';
delete from cards where card_code='ven-194-166';

-- 2. Correct names that are source defects in the Riftcodex load.
update cards set name='Recruit, DE' where card_code='ogn-271-298';
update cards set name='Recruit, NX' where card_code='ogn-272-298';
update cards set name='Recruit, ZN' where card_code='ogn-273-298';
update cards set name='Mischievous Marai' where card_code='unl-003-219';
update cards set name='Kennen, Heart of the Tempest' where card_code='ven-155-166';

-- 3. Backfill: rules_text wholesale, power_cost, might_bonus.
update cards set rules_text='[Accelerate (1)(R)]', power_cost=null, might_bonus=null where card_code='ogn-001-298';
update cards set rules_text='As you play me, you may discard 1 as an additional cost. If you do, reduce my cost by (2).', power_cost=null, might_bonus=null where card_code='ogn-002-298';
update cards set rules_text='[Assault 2] When you play me, discard 1.', power_cost=null, might_bonus=null where card_code='ogn-003-298';
update cards set rules_text='[Action] Give a unit [Assault 3] this turn.', power_cost=null, might_bonus=null where card_code='ogn-004-298';
update cards set rules_text='[Action] Deal 3 to a unit at a battlefield. If this kills it, do this: draw 1.', power_cost=null, might_bonus=null where card_code='ogn-005-298';
update cards set rules_text='When you discard me, you may pay (R) to play me.', power_cost=null, might_bonus=null where card_code='ogn-006-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-007a-298';
update cards set rules_text='[Action] Discard 1. Deal its Energy cost as damage to a unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-008-298';
update cards set rules_text='[Action] Deal 3 to a unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-009-298';
update cards set rules_text='[Accelerate (1)(R)]', power_cost=null, might_bonus=null where card_code='ogn-010-298';
update cards set rules_text='Other friendly units enter ready.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-011-298';
update cards set rules_text='[Legion] - I cost (2) less.', power_cost=null, might_bonus=null where card_code='ogn-012-298';
update cards set rules_text='[Deflect (Any)]', power_cost=null, might_bonus=null where card_code='ogn-013-298';
update cards set rules_text='[Action] This spell''s Energy cost is reduced by the highest Might among units you control.
Deal 5 to a unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-014-298';
update cards set rules_text='Other friendly units here have [Assault 1].', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-015-298';
update cards set rules_text='[Legion] - When you play me, give a unit +2 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-016-298';
update cards set rules_text='This enters exhausted.
[Tap]: Deal 2 to a unit at a battlefield.', power_cost=null, might_bonus=null where card_code='ogn-017-298';
update cards set rules_text='Your opponents'' [Hidden] cards can''t be revealed here.', power_cost=null, might_bonus=null where card_code='ogn-018-298';
update cards set rules_text='If you''ve discarded a card this turn, I have [Assault 1] and [Ganking].', power_cost=null, might_bonus=null where card_code='ogn-019-298';
update cards set rules_text='[Legion] - When you play me, discard 2, then draw 2.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-020-298';
update cards set rules_text='[Tap]: [Legion] - The next unit you play this turn enters ready.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-021-298';
update cards set rules_text='[Action] Kill all gear.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-022-298';
update cards set rules_text='Discard 1, [Tap]: Choose a friendly unit. The next time it would die this turn, you may pay (R) to heal it, exhaust it, and recall it instead.', power_cost=null, might_bonus=null where card_code='ogn-023-298';
update cards set rules_text='[Action] Deal 4 to a unit at a battlefield. Draw 1.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-024-298';
update cards set rules_text='[Action] Each opponent reveals the top card of their Main Deck. Choose one and banish it, then play it, ignoring its cost. Then recycle the rest.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-025-298';
update cards set rules_text='When you play me, opponents can''t play cards this turn.', power_cost=null, might_bonus=null where card_code='ogn-026-298';
update cards set rules_text='When you play your second card in a turn, give me +2 Might this turn and ready me.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-027-298';
update cards set rules_text='My Might is increased by your points.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-028-298';
update cards set rules_text='Deal 3 to a unit.
Deal 3 to a unit.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-029-298';
update cards set rules_text='[Accelerate (1)(R)] [Assault 2] When you play me, discard 2.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-030-298';
update cards set rules_text='When you play me, the next spell you play this turn costs (5) less.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-031-298';
update cards set rules_text='[Tap]: The next spell you play this turn deals 1 Bonus Damage.', power_cost=null, might_bonus=null where card_code='ogn-032-298';
update cards set rules_text='[Reaction] Choose an enemy unit. Deal 6 to it unless its controller has you draw 2.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-033-298';
update cards set rules_text='When I conquer after an attack, if you assigned 5 or more excess damage to enemy units, you score 1 point.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-034-298';
update cards set rules_text='[Assault 3] If an opponent controls a battlefield, I enter ready.
When I conquer, you may pay (1) to return me to my owner''s hand.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-035-298';
update cards set rules_text='[Ganking] Recycle 1 from your trash: Give me +1 Might this turn.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-036-298';
update cards set rules_text='[Assault 2] When you kill a unit with a spell, you may pay (1)(R) to play me from your trash.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-037-298';
update cards set rules_text='When you play me, draw 1 for each of your [Mighty] units.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-038-298';
update cards set rules_text='[Accelerate (1)(R)] When I conquer, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-039-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (R)].', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-040-298';
update cards set rules_text='[Deflect 2 (Any)(Any)] When I attack, deal 5 damage split among any number of enemy units here.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogn-041-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-042-298';
update cards set rules_text='Move an enemy unit.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-043-298';
update cards set rules_text='You may pay (G) as an additional cost to play me.
When you play me, if you paid the additional cost, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-044-298';
update cards set rules_text='[Reaction] Counter a spell that costs no more than (4) and no more than (Any).', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-045-298';
update cards set rules_text='[Reaction] Give a friendly unit +1 Might this turn, then an additional +1 Might this turn if it is the only unit you control there.', power_cost=null, might_bonus=null where card_code='ogn-046-298';
update cards set rules_text='[Action] If an opponent''s score is within 3 points of the Victory Score, this costs (2) less.
Draw 1 and channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-047-298';
update cards set rules_text='[Reaction] As an additional cost to play this, you may exhaust a friendly unit. If you do, draw 2. Otherwise, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-048-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-049-298';
update cards set rules_text='[Action] Stun a unit.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-050-298';
update cards set rules_text='When you play me, stun a unit.', power_cost=null, might_bonus=null where card_code='ogn-051-298';
update cards set rules_text='[Shield 1]', power_cost=null, might_bonus=null where card_code='ogn-052-298';
update cards set rules_text='[Hidden (Any)] [Action] Buff a friendly unit. Buffs give an additional +1 Might to friendly units this turn.', power_cost=null, might_bonus=null where card_code='ogn-053-298';
update cards set rules_text='[Shield 1] [Tank]', power_cost=null, might_bonus=null where card_code='ogn-054-298';
update cards set rules_text='While I''m attacking or defending alone, I have +2 Might.', power_cost=null, might_bonus=null where card_code='ogn-055-298';
update cards set rules_text='When I conquer, you may kill a gear. If you do, buff me.', power_cost=null, might_bonus=null where card_code='ogn-056-298';
update cards set rules_text='[Hidden (Any)] [Action] Give a unit [Shield 3] and [Tank] this turn.', power_cost=null, might_bonus=null where card_code='ogn-057-298';
update cards set rules_text='[Reaction] Give a unit +2 Might this turn. Draw 1.', power_cost=null, might_bonus=null where card_code='ogn-058-298';
update cards set rules_text='When you stun an enemy unit, ready me and give me +1 Might this turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-059-298';
update cards set rules_text='When a friendly unit attacks or defends alone, give it +1 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-060-298';
update cards set rules_text='When you play me, if you control a Poro, buff me and draw 1.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-061-298';
update cards set rules_text='Look at the top 5 cards of your Main Deck. You may banish a unit from among them, then play it, reducing its cost by (5). Recycle the remaining cards.', power_cost=null, might_bonus=null where card_code='ogn-062-298';
update cards set rules_text='When you play this, buff a friendly unit.
Friendly buffed units have [Deflect] if they didn''t already.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-063-298';
update cards set rules_text='[Reaction] Counter a spell.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-064-298';
update cards set rules_text='While I''m buffed, I have an additional +1 Might.', power_cost=null, might_bonus=null where card_code='ogn-065-298';
update cards set rules_text='When I hold, you score 1 point.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-066-298';
update cards set rules_text='[Tank] When you play me to a battlefield, you may move an enemy unit to here.
When I hold, return me to my owner''s hand.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-067-298';
update cards set rules_text='I must be assigned combat damage last.
[Tap]: Deal damage equal to my Might to a unit at a battlefield. Use this ability only while I''m at a battlefield.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-068-298';
update cards set rules_text='[Action] Double a friendly unit''s Might this turn. Give it [Temporary].', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-069-298';
update cards set rules_text='While I''m at a battlefield, opponents can only play units to their base.
While I''m at a battlefield, spells and abilities can''t ready enemy units and gear.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-070-298';
update cards set rules_text='Each other player chooses Cards or Runes. For each player that chooses Cards, you and that player each draw 1. For each player that chooses Runes, you and that player each channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-071-298';
update cards set rules_text='When you kill a stunned enemy unit, you may exhaust this to draw 1.', power_cost=null, might_bonus=null where card_code='ogn-072-298';
update cards set rules_text='At the end of your turn, if I''m at a battlefield, ready up to 4 friendly runes.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-073-298';
update cards set rules_text='[Shield 1] [Tank] Other friendly units here have [Shield 1].', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-074-298';
update cards set rules_text='[Accelerate (1)(G)] [Deathknell] - Channel 2 runes exhausted and draw 1.', power_cost=null, might_bonus=null where card_code='ogn-075-298';
update cards set rules_text='When I attack, deal damage equal to my Might to an enemy unit here.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-076-298';
update cards set rules_text='[Hidden (Any)] If a friendly unit would die, kill this instead. Heal that unit, exhaust it, and recall it.', power_cost=null, might_bonus=null where card_code='ogn-077-298';
update cards set rules_text='[Shield 1] [Tap]: Buff me.
I can have any number of buffs.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-078-298';
update cards set rules_text='If an opponent''s score is within 3 points of the Victory Score, I enter ready.
Stunned enemy units here have -8 Might, to a minimum of 1 Might.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-079-298';
update cards set rules_text='[Reaction] Gain control of a spell. You may make new choices for it.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-080-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (G)].', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-081-298';
update cards set rules_text='When you play me, give a unit +8 Might this turn.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogn-082-298';
update cards set rules_text='[Hidden (Any)] [Reaction] Draw 2.', power_cost=null, might_bonus=null where card_code='ogn-083-298';
update cards set rules_text='While I''m at a battlefield, the Energy costs for spells you play is reduced by (1), to a minimum of (1).', power_cost=null, might_bonus=null where card_code='ogn-084-298';
update cards set rules_text='[Action] Deal 6 to a unit at a battlefield.', power_cost=null, might_bonus=null where card_code='ogn-085-298';
update cards set rules_text='[Vision] [Shield 1]', power_cost=null, might_bonus=null where card_code='ogn-086-298';
update cards set rules_text='[Tank] When you play me, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-087-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-088-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-089-298';
update cards set rules_text='[Tap]: Give a unit -1 Might this turn, to a minimum of 1 Might.', power_cost=null, might_bonus=null where card_code='ogn-090-298';
update cards set rules_text='When you play a gear, ready me.', power_cost=null, might_bonus=null where card_code='ogn-091-298';
update cards set rules_text='When you play me, deal 6 to an enemy unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-092-298';
update cards set rules_text='[Reaction] Give a unit -4 Might this turn, to a minimum of 1 Might.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-093-298';
update cards set rules_text='[Hidden (Any)] [Action] Play a ready 3 Might Sprite unit token with [Temporary].', power_cost=null, might_bonus=null where card_code='ogn-094-298';
update cards set rules_text='[Reaction] Give a unit -1 Might this turn, to a minimum of 1 Might. Draw 1.', power_cost=null, might_bonus=null where card_code='ogn-095-298';
update cards set rules_text='[Deathknell] - Draw 1.', power_cost=null, might_bonus=null where card_code='ogn-096-298';
update cards set rules_text='[Hidden (Any)] When you play me, give a unit -2 Might this turn, to a minimum of 1 Might.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-097-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (1)].', power_cost=null, might_bonus=null where card_code='ogn-098-298';
update cards set rules_text='Recycle 3 from your trash, (1), [Tap]: Draw 1.', power_cost=null, might_bonus=null where card_code='ogn-099-298';
update cards set rules_text='[Vision] Other friendly units have [Vision].', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-100-298';
update cards set rules_text='At the start of your Beginning Phase, if you control a facedown card at a battlefield, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-101-298';
update cards set rules_text='[Action] Banish a friendly unit, then its owner plays it to their base, ignoring its cost.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-102-298';
update cards set rules_text='When you play a spell, give me +1 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-103-298';
update cards set rules_text='[Reaction] Return a friendly unit to its owner''s hand. Its owner channels 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-104-298';
update cards set rules_text='Deal 6 to each of up to two units.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-105-298';
update cards set rules_text='When you play me, play a ready 3 Might Sprite unit token with [Temporary] here.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-106-298';
update cards set rules_text='When I attack, you may pay (B) to play a card with [Hidden] from your hand, ignoring its cost. If it’s a unit, play it here.', power_cost=null, might_bonus=null where card_code='ogn-107-298';
update cards set rules_text='[Reaction] Choose a friendly unit. This turn, increase its Might to the Might of another friendly unit.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-108-298';
update cards set rules_text='My Might is increased by the number of cards in your trash.
At the start of your Beginning Phase, recycle 3 from your trash.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-109-298';
update cards set rules_text='[Accelerate (1)(B)] [Deathknell] - Recycle me to ready your runes.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-110-298';
update cards set rules_text='I have all [Tap] abilities of all friendly legends, units, and gear.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-111-298';
update cards set rules_text='[Ganking] When I conquer, you may play a spell from your trash with Energy cost less than your points without paying its Energy cost. Then recycle it.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-112-298';
update cards set rules_text='Kill a friendly unit or gear, [Tap]: [Action] - [Add (Any)(Any)].', power_cost=null, might_bonus=null where card_code='ogn-113-298';
update cards set rules_text='Draw 4.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-114-298';
update cards set rules_text='Each player looks at the top 5 cards of their Main Deck, banishes one of them, then recycles the rest. Starting with the next player, each player plays those cards, ignoring Energy costs.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-115-298';
update cards set rules_text='[Accelerate (1)(B)] When you play me, give enemy units -3 Might this turn, to a minimum of 1 Might.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-116-298';
update cards set rules_text='When you play a card on an opponent''s turn, play a 1 Might Recruit unit token in your base.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-117a-298';
update cards set rules_text='The first time a friendly unit dies each turn, draw 1.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-118-298';
update cards set rules_text='When I attack or defend, give an enemy unit here -2 Might this turn, to a minimum of 1 Might.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-119-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (B)].', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-120-298';
update cards set rules_text='[Hidden (Any)] When I defend, choose an enemy unit here and reveal the top 5 cards of your Main Deck. Deal 1 to that unit for each card with [Hidden] revealed this way, then recycle the revealed cards.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-121a-298';
update cards set rules_text='Take a turn after this one. Banish this.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-122-298';
update cards set rules_text='Exhaust all friendly units, then deal 12 to ALL units at battlefields.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-123-298';
update cards set rules_text='[Tap]: Buff an exhausted friendly unit.', power_cost=null, might_bonus=null where card_code='ogn-124-298';
update cards set rules_text='While I''m buffed, I have [Ganking].', power_cost=null, might_bonus=null where card_code='ogn-125-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-126-298';
update cards set rules_text='[Reaction] Deal 2 to all enemy units in combat.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-127-298';
update cards set rules_text='[Action] Choose a friendly unit and an enemy unit. They deal damage equal to their Mights to each other.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-128-298';
update cards set rules_text='[Action] Units you play this turn enter ready. Draw 1.', power_cost=null, might_bonus=null where card_code='ogn-129-298';
update cards set rules_text='When I attack, deal 1 to an enemy unit here.', power_cost=null, might_bonus=null where card_code='ogn-130-298';
update cards set rules_text='When I attack, give me +2 Might this turn if there is a ready enemy unit here.', power_cost=null, might_bonus=null where card_code='ogn-131-298';
update cards set rules_text='When you play me, ready another unit.', power_cost=null, might_bonus=null where card_code='ogn-132-298';
update cards set rules_text='[Reaction] Deal 1 to all units at battlefields.', power_cost=null, might_bonus=null where card_code='ogn-133-298';
update cards set rules_text='Channel 1 rune exhausted. If you can''t, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-134-298';
update cards set rules_text='[Hidden (Any)]', power_cost=null, might_bonus=null where card_code='ogn-135-298';
update cards set rules_text='When you play me, buff another friendly unit.', power_cost=null, might_bonus=null where card_code='ogn-136-298';
update cards set rules_text='[Tank] When you play me, channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-137-298';
update cards set rules_text='Channel 2 runes exhausted. If you couldn''t channel 2 runes this way, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-138-298';
update cards set rules_text='When you play another unit, buff me.', power_cost=null, might_bonus=null where card_code='ogn-139-298';
update cards set rules_text='Your Dragons'' Energy costs are reduced by (2), to a minimum of (1).', power_cost=null, might_bonus=null where card_code='ogn-140-298';
update cards set rules_text='When you play me, buff up to two other friendly units.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-141-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-142-298';
update cards set rules_text='When you ready a friendly unit, give it +1 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-143-298';
update cards set rules_text='[Reaction] If an enemy unit has died this turn, this costs (2) less.
Draw 2.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-144-298';
update cards set rules_text='[Reaction] Prevent all spell and ability damage this turn.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-145-298';
update cards set rules_text='[Action] As you play this, you may spend a buff as an additional cost. If you do, ignore this spell''s cost.
Ready a unit.', power_cost=null, might_bonus=null where card_code='ogn-146-298';
update cards set rules_text='When you play me, you may spend a buff to buff me and ready me.', power_cost=null, might_bonus=null where card_code='ogn-147-298';
update cards set rules_text='When I attack, deal 3 to all enemy units here.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-148-298';
update cards set rules_text='When you play me, choose an enemy unit at a battlefield. We deal damage equal to our Mights to each other.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-149-298';
update cards set rules_text='[Accelerate (1)(O)] [Assault 1] As you play me, you may spend any number of buffs as an additional cost. Reduce my cost by (O) for each buff you spend.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-150-298';
update cards set rules_text='[Accelerate (1)(O)] Other buffed friendly units at my battlefield have +2 Might.', power_cost=null, might_bonus=null where card_code='ogn-151a-298';
update cards set rules_text='When you buff a friendly unit, you may pay (O) and exhaust this to ready it.', power_cost=null, might_bonus=null where card_code='ogn-152-298';
update cards set rules_text='[Action] For each friendly unit, you may spend its buff to ready it. Then buff all friendly units.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-153-298';
update cards set rules_text='[Action] Give a unit +7 Might this turn.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-154-298';
update cards set rules_text='[Deflect (Any)] When I conquer, draw 1 or channel 1 rune exhausted.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-155-298';
update cards set rules_text='Choose an opponent. They reveal their hand. Choose a non-unit card from it, and recycle that card.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-156-298';
update cards set rules_text='Spend my buff: Choose one you''ve not chosen this turn -
- Deal 2 to a unit at a battlefield.
- Stun a unit at a battlefield.
- Ready me.
- Give me [Ganking] this turn.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-157-298';
update cards set rules_text='[Shield 3] [Tank] When an opponent moves to a battlefield other than mine, draw 1.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-158-298';
update cards set rules_text='I enter ready.
When I attack, kill all damaged enemy units here.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-159-298';
update cards set rules_text='At the end of your turn, reveal cards from the top of your Main Deck until you reveal a unit and banish it. Play it, ignoring its cost, and recycle the rest.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-160-298';
update cards set rules_text='[Deflect (Any)] You may play me to an occupied enemy battlefield.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-161-298';
update cards set rules_text='[Accelerate (1)(O)] [Ganking] The first time I move each turn, you may ready something else that''s exhausted.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-162a-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (O)].', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-163-298';
update cards set rules_text='When I''m played and when I conquer, buff me.
Spend my buff: Give me +4 Might this turn.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-164-298';
update cards set rules_text='When you play me, return a unit from your trash to your hand.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-165-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-166a-298';
update cards set rules_text='When you play a card from [Hidden], give me +2 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-167-298';
update cards set rules_text='[Hidden (Any)] [Action] Move a unit from a battlefield to its base.', power_cost=null, might_bonus=null where card_code='ogn-168-298';
update cards set rules_text='[Reaction] Return a unit at a battlefield with 3 Might or less to its owner''s hand.', power_cost=null, might_bonus=null where card_code='ogn-169-298';
update cards set rules_text='[Action] Return a unit from your trash to your hand.', power_cost=null, might_bonus=null where card_code='ogn-170-298';
update cards set rules_text='[Vision]', power_cost=null, might_bonus=null where card_code='ogn-171-298';
update cards set rules_text='[Action] Return a unit at a battlefield to its owner''s hand.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-172-298';
update cards set rules_text='[Action] Move a friendly unit and ready it.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-173-298';
update cards set rules_text='[Vision] You may play me to an open battlefield.', power_cost=null, might_bonus=null where card_code='ogn-174-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-175-298';
update cards set rules_text='You may play me to an open battlefield.', power_cost=null, might_bonus=null where card_code='ogn-176-298';
update cards set rules_text='When a friendly unit moves from my location, I may be moved with it.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-177-298';
update cards set rules_text='[Deathknell] - Discard 2, then draw 2.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-178-298';
update cards set rules_text='[Action] Each player kills one of their gear.', power_cost=null, might_bonus=null where card_code='ogn-179-298';
update cards set rules_text='Give a unit at a battlefield or a gear [Temporary].', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-180-298';
update cards set rules_text='[Tap]: Return another friendly gear, unit, or facedown card to its owner''s hand.', power_cost=null, might_bonus=null where card_code='ogn-181-298';
update cards set rules_text='When this is played, discarded, or killed, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-182-298';
update cards set rules_text='[Action] Look at the top 3 cards of your Main Deck. Put 1 into your hand and recycle the rest.', power_cost=null, might_bonus=null where card_code='ogn-183-298';
update cards set rules_text='(1), [Tap]: Move a friendly unit at a battlefield to its base.', power_cost=null, might_bonus=null where card_code='ogn-184-298';
update cards set rules_text='When I move, discard 1, then draw 1.', power_cost=null, might_bonus=null where card_code='ogn-185-298';
update cards set rules_text='When this leaves the board, draw 1 and channel 1 rune exhausted.
(P), [Tap]: Kill this.', power_cost=null, might_bonus=null where card_code='ogn-186-298';
update cards set rules_text='Starting with the next player, each player may return a unit to its owner''s hand.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-187-298';
update cards set rules_text='When you play me, return another unit at a battlefield to its owner''s hand.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-188-298';
update cards set rules_text='[Ganking] If I have moved twice this turn, I don''t take damage.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-189-298';
update cards set rules_text='[Deathknell] - Deal 4 to all units at my battlefield.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-190-298';
update cards set rules_text='[Tank] When you play me, move a unit from a battlefield to its base.', power_cost=null, might_bonus=null where card_code='ogn-191-298';
update cards set rules_text='When you play me, choose an opponent. They reveal their hand. Choose a card from it, and they discard that card.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-192-298';
update cards set rules_text='You may play me to an open battlefield.
Friendly units may be played to open battlefields.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-193-298';
update cards set rules_text='[Ganking] As you look at or reveal me from the top of your deck, you may banish me. If you do, you may play me for (Any).', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-194-298';
update cards set rules_text='I cost (1) less for each card in your trash.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-195-298';
update cards set rules_text='When you play me, you may play a unit from your trash, ignoring its Energy cost.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-196-298';
update cards set rules_text='[Hidden (Any)] When you play me, give me +3 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-197-298';
update cards set rules_text='Play a unit from your trash, ignoring its Energy cost.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-198-298';
update cards set rules_text='[Hidden (Any)] When you play me, you may choose a unit you control at another location. Move me to its location and it to my original location.', power_cost=null, might_bonus=null where card_code='ogn-199-298';
update cards set rules_text='When I attack, reveal the top rune of your rune deck, then recycle it. Do one of the following based on its domain:
- (R) - Deal 2 to an enemy unit here and 1 to all other enemy units here.
- (B) - Draw 1.
- (Y) - Stun an enemy unit.', power_cost=null, might_bonus=null where card_code='ogn-200-298';
update cards set rules_text='Each player discards their hand, then draws 4.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-201-298';
update cards set rules_text='When you discard one or more cards, ready me and give me +1 Might this turn.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-202-298';
update cards set rules_text='[Action] Choose an enemy unit at a battlefield. Take control of it and recall it.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-203-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (P)].', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-204-298';
update cards set rules_text='[Ganking] The third time I move in a turn, you score 1 point.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-205a-298';
update cards set rules_text='[Reaction] Give two friendly units each +2 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-206-298';
update cards set rules_text='[Reaction] As you play this, you may spend a buff as an additional cost. If you do, ignore this spell''s cost.
Give a unit +3 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-207-298';
update cards set rules_text='As an additional cost to play me, kill a friendly unit.', power_cost=null, might_bonus=null where card_code='ogn-208-298';
update cards set rules_text='Each player kills one of their units.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-209-298';
update cards set rules_text='[Assault 1]', power_cost=null, might_bonus=null where card_code='ogn-210-298';
update cards set rules_text='When you play me, play a 1 Might Recruit unit token here.', power_cost=null, might_bonus=null where card_code='ogn-211-298';
update cards set rules_text='When you play this, play a 1 Might Recruit unit token at your base.
Kill this: Recycle up to 4 cards from trashes.', power_cost=null, might_bonus=null where card_code='ogn-212-298';
update cards set rules_text='[Hidden (Any)] [Action] Kill a unit at a battlefield. Its controller draws 2.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-213-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-214-298';
update cards set rules_text='[Assault 1]', power_cost=null, might_bonus=null where card_code='ogn-215-298';
update cards set rules_text='[Deathknell] - Channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-216-298';
update cards set rules_text='[Legion] - When you play me, buff me.', power_cost=null, might_bonus=null where card_code='ogn-217-298';
update cards set rules_text='[Legion] - When you play me, play two 1 Might Recruit unit tokens here.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-218-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-219-298';
update cards set rules_text='[Hidden (Any)] [Action] Stun a friendly unit and an enemy unit at the same battlefield.', power_cost=null, might_bonus=null where card_code='ogn-220-298';
update cards set rules_text='[Action] When any unit takes damage this turn, kill it.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-221-298';
update cards set rules_text='When I move to a battlefield, play a 1 Might Recruit unit token here.', power_cost=null, might_bonus=null where card_code='ogn-222-298';
update cards set rules_text='When you play me, buff me. Then, if I am at a battlefield, buff all other friendly units there.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-223-298';
update cards set rules_text='[Action] You may kill up to one gear. Draw 1.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-224-298';
update cards set rules_text='When you play me, choose an enemy unit. If it is stunned, kill it. Otherwise, stun it.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-225-298';
update cards set rules_text='When you play me, you may play a unit costing no more than (3) and no more than (Any) from your trash, ignoring its cost.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-226-298';
update cards set rules_text='If a combat where you are the attacker ends in a tie, recall ALL units instead.', power_cost=null, might_bonus=null where card_code='ogn-227-298';
update cards set rules_text='When a buffed friendly unit dies, buff another friendly unit.', power_cost=null, might_bonus=null where card_code='ogn-228-298';
update cards set rules_text='Kill a unit.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-229-298';
update cards set rules_text='When you play me, spend any number of buffs. For each buff spent, channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-230-298';
update cards set rules_text='As you play me, you may kill any number of friendly units as an additional cost. Reduce my cost by (Y) for each killed this way.
[Deflect (Any)] [Ganking]', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-231-298';
update cards set rules_text='While I''m [Mighty], I have [Deflect], [Ganking], and [Shield 1].', power_cost=null, might_bonus=null where card_code='ogn-232-298';
update cards set rules_text='[Action] Give friendly units +5 Might this turn.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-233-298';
update cards set rules_text='When you play me, kill an enemy unit.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-234-298';
update cards set rules_text='[Vision] When you recycle one or more cards to your Main Deck, buff a friendly unit.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-235-298';
update cards set rules_text='Your [Deathknell] effects trigger an additional time.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-236-298';
update cards set rules_text='Starting with the next player, each other player chooses a unit you don''t control that hasn''t been chosen for this spell. Kill those units.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-237-298';
update cards set rules_text='[Shield 1] When I attack, stun an enemy unit here.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-238-298';
update cards set rules_text='[Deathknell] - Play three 1 Might Recruit unit tokens into your base.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-239-298';
update cards set rules_text='[Tank] I get +1 Might for each buffed friendly unit at my battlefield.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-240a-298';
update cards set rules_text='[Reaction] [Shield 2] [Tank]', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-241-298';
update cards set rules_text='(1)(Y), [Tap]: Kill a friendly unit. Look at the top 5 cards of your Main Deck. You may banish a unit from among them that has Might up to 1 more than the killed unit and play it, ignoring its cost. Then recycle the rest.', power_cost=null, might_bonus=null where card_code='ogn-242-298';
update cards set rules_text='(1)(Y), [Tap]: Kill a friendly unit. Look at the top 5 cards of your Main Deck. You may banish a unit from among them that has Might up to 1 more than the killed unit and play it, ignoring its cost. Then recycle the rest.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-243-298';
update cards set rules_text='Each player chooses 2 units, 2 gear, 2 runes, and 2 cards in their hands. Recycle the rest.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-244-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (Y)].', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-245-298';
update cards set rules_text='When another non-Recruit unit you control dies, play a 1 Might Recruit unit token into your base.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-246-298';
update cards set rules_text='[Tap]: [Reaction] - [Add (Any)]. Use only to play spells.', power_cost=null, might_bonus=null where card_code='ogn-247-298';
update cards set rules_text='Deal 2 to a unit.
Deal 2 to a unit.
Deal 2 to a unit.
Deal 2 to a unit.
Deal 2 to a unit.
Deal 2 to a unit.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-248-298';
update cards set rules_text='When you play a [Mighty] unit, you may exhaust me to channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-249-298';
update cards set rules_text='Choose a friendly unit in your base. Deal damage equal to its Might to all enemy units at a battlefield, then move your unit there.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-250-298';
update cards set rules_text='At start of your Beginning Phase, draw 1 if you have one or fewer cards in your hand.', power_cost=null, might_bonus=null where card_code='ogn-251-298';
update cards set rules_text='Deal 5 to a unit.
When you conquer, you may discard 1 to return this from your trash to your hand.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-252-298';
update cards set rules_text='[Tap]: [Reaction], [Legion] - [Add (1)].', power_cost=null, might_bonus=null where card_code='ogn-253-298';
update cards set rules_text='[Action] Choose a unit. Kill it the next time it takes damage this turn.
[Legion] - Kill it now instead.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-254-298';
update cards set rules_text='When an enemy unit attacks a battlefield you control, give it -1 Might this turn, to a minimum of 1 Might.', power_cost=null, might_bonus=null where card_code='ogn-255-298';
update cards set rules_text='[Hidden (Any)] [Action] Kill any number of units at a battlefield with total Might 4 or less.', power_cost=null, might_bonus=null where card_code='ogn-256-298';
update cards set rules_text='(1), [Tap]: Buff a friendly unit.', power_cost=null, might_bonus=null where card_code='ogn-257-298';
update cards set rules_text='Move an enemy unit. Then do this: Choose another enemy unit at its destination. They deal damage equal to their Mights to each other.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-258-298';
update cards set rules_text='(2), [Tap]: Move a friendly unit to or from its base.', power_cost=null, might_bonus=null where card_code='ogn-259-298';
update cards set rules_text='[Action] Ready a friendly unit. It deals damage equal to its Might to an enemy unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-260-298';
update cards set rules_text='When you stun one or more enemy units, buff a friendly unit.', power_cost=null, might_bonus=null where card_code='ogn-261-298';
update cards set rules_text='[Action] Stun an enemy unit at a battlefield. You may move a friendly unit to that enemy unit''s battlefield.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-262-298';
update cards set rules_text='You may pay (1) to hide a card with [Hidden] instead of (Any).
(1), [Tap]: Put a Teemo unit you own into your hand from your Champion Zone or the board.', power_cost=null, might_bonus=null where card_code='ogn-263-298';
update cards set rules_text='Return up to two cards with [Hidden] from your trash to your hand. You can hide cards ignoring costs this turn.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-264-298';
update cards set rules_text='(1), [Tap]: Play a 1 Might Recruit unit token.', power_cost=null, might_bonus=null where card_code='ogn-265-298';
update cards set rules_text='[Reaction] Choose a battlefield. Give friendly units there +1 Might this turn and enemy units there -1 Might this turn, to a minimum of 1 Might.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-266-298';
update cards set rules_text='[Tap]: Give a unit [Ganking] this turn.', power_cost=null, might_bonus=null where card_code='ogn-267-298';
update cards set rules_text='[Action] Pay any amount of (Any) to deal that much damage to all enemy units at a battlefield.', power_cost=null, might_bonus=null where card_code='ogn-268-298';
update cards set rules_text='If a buffed unit you control would die, you may pay (Any), exhaust me, and spend its buff to heal it, exhaust it, and recall it instead.
When you conquer, ready me.', power_cost=null, might_bonus=null where card_code='ogn-269-298';
update cards set rules_text='Buff a friendly unit in your base, then move it to a battlefield.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-270-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-271-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-272-298';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-273-298';
update cards set rules_text='[Temporary]', power_cost=null, might_bonus=null where card_code='ogn-274-298';
update cards set rules_text='When you hold here, play a 1 Might Recruit unit token in your base.', power_cost=null, might_bonus=null where card_code='ogn-275-298';
update cards set rules_text='Increase the points needed to win the game by 1.', power_cost=null, might_bonus=null where card_code='ogn-276-298';
update cards set rules_text='When a unit moves from here, give it +1 Might this turn.', power_cost=null, might_bonus=null where card_code='ogn-277-298';
update cards set rules_text='You may hide an additional card here.', power_cost=null, might_bonus=null where card_code='ogn-278-298';
update cards set rules_text='When you defend here, choose a unit. It gains [Shield 2] this combat.', power_cost=null, might_bonus=null where card_code='ogn-279-298';
update cards set rules_text='When you hold here, draw 1.', power_cost=null, might_bonus=null where card_code='ogn-280-298';
update cards set rules_text='When you hold here, you may return your Chosen Champion from your trash to your Champion Zone if it is empty.', power_cost=null, might_bonus=null where card_code='ogn-281-298';
update cards set rules_text='When you conquer here, you may spend a buff to draw 1.', power_cost=null, might_bonus=null where card_code='ogn-282-298';
update cards set rules_text='When you hold here, buff a unit here.', power_cost=null, might_bonus=null where card_code='ogn-283-298';
update cards set rules_text='At the start of each player''s first Beginning Phase, that player channels 1 rune.', power_cost=null, might_bonus=null where card_code='ogn-284-298';
update cards set rules_text='When you defend here, you may move a friendly unit here to base.', power_cost=null, might_bonus=null where card_code='ogn-285-298';
update cards set rules_text='When you hold here, activate the conquer effects of units here.', power_cost=null, might_bonus=null where card_code='ogn-286-298';
update cards set rules_text='When you conquer here, you must recycle one of your runes.', power_cost=null, might_bonus=null where card_code='ogn-287-298';
update cards set rules_text='When you hold here, you may channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ogn-288-298';
update cards set rules_text='When you conquer here, ready up to 2 runes at the end of this turn.', power_cost=null, might_bonus=null where card_code='ogn-289-298';
update cards set rules_text='At the start of each player''s first Beginning Phase, that player gains 1 point.', power_cost=null, might_bonus=null where card_code='ogn-290-298';
update cards set rules_text='When you conquer here, look at the top two cards of your Main Deck. You may recycle one or both of them. Put those you don''t back in any order.', power_cost=null, might_bonus=null where card_code='ogn-291-298';
update cards set rules_text='When a player chooses a friendly unit here with a spell for the first time each turn, they draw 1.', power_cost=null, might_bonus=null where card_code='ogn-292-298';
update cards set rules_text='When you hold here, if you have 7+ units here, you win the game.', power_cost=null, might_bonus=null where card_code='ogn-293-298';
update cards set rules_text='Units here have +1 Might.', power_cost=null, might_bonus=null where card_code='ogn-294-298';
update cards set rules_text='Units can''t move from here to base.', power_cost=null, might_bonus=null where card_code='ogn-295-298';
update cards set rules_text='Spells and abilities deal 1 Bonus Damage to units here.', power_cost=null, might_bonus=null where card_code='ogn-296-298';
update cards set rules_text='Units here have [Ganking].', power_cost=null, might_bonus=null where card_code='ogn-297-298';
update cards set rules_text='When you conquer here, discard 1, then draw 1.', power_cost=null, might_bonus=null where card_code='ogn-298-298';
update cards set rules_text='Your spells and abilities deal 1 Bonus Damage.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogs-001-024';
update cards set rules_text='Deal 3 to all enemy units at a battlefield.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ogs-002-024';
update cards set rules_text='[Action] Deal 2 to a unit at a battlefield.', power_cost=null, might_bonus=null where card_code='ogs-003-024';
update cards set rules_text='While you have 8+ runes, I have +4 Might.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogs-004-024';
update cards set rules_text='[Shield 1]', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ogs-005-024';
update cards set rules_text='When you play a spell that costs (5) or more, give me +3 Might this turn.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogs-006-024';
update cards set rules_text='[Assault 2], [Shield 2]', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogs-007-024';
update cards set rules_text='[Action] Give a friendly unit +3 Might this turn. Then choose an enemy unit. They deal damage equal to their Mights to each other.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogs-008-024';
update cards set rules_text='[Ganking] I enter ready.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogs-009-024';
update cards set rules_text='When you play me, return a spell from your trash to your hand.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogs-010-024';
update cards set rules_text='[Reaction] Move up to 2 friendly units to base.', power_cost=null, might_bonus=null where card_code='ogs-011-024';
update cards set rules_text='[Action] Kill a unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogs-012-024';
update cards set rules_text='Other friendly units have +1 Might here.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogs-013-024';
update cards set rules_text='[Tap]: [Reaction] - [Add (2)]. Use only to play spells.', power_cost=null, might_bonus=null where card_code='ogs-014-024';
update cards set rules_text='[Action] Play four 1 Might Recruit unit tokens.', power_cost=null, might_bonus=null where card_code='ogs-015-024';
update cards set rules_text='I enter ready.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogs-016-024';
update cards set rules_text='At the end of your turn, ready up to 2 runes.', power_cost=null, might_bonus=null where card_code='ogs-017-024';
update cards set rules_text='When you play me, deal 3 to all units at battlefields.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogs-018-024';
update cards set rules_text='While a friendly unit defends alone, it gets +2 Might.', power_cost=null, might_bonus=null where card_code='ogs-019-024';
update cards set rules_text='[Reaction] Choose a friendly unit. The next time it would die this turn, heal it, exhaust it, and recall it instead.', power_cost=null, might_bonus=null where card_code='ogs-020-024';
update cards set rules_text='When you play a spell that costs (5) or more, draw 1.', power_cost=null, might_bonus=null where card_code='ogs-021-024';
update cards set rules_text='[Action] Deal 8 to a unit.', power_cost=null, might_bonus=null where card_code='ogs-022-024';
update cards set rules_text='When you conquer, if you have 4+ units at that battlefield, draw 2.', power_cost=null, might_bonus=null where card_code='ogs-023-024';
update cards set rules_text='[Action] Give friendly units +2 Might this turn.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogs-024-024';
update cards set rules_text='[Reaction] Give a friendly unit at a battlefield +2 Might this turn for each enemy unit there.', power_cost=null, might_bonus=null where card_code='sfd-001-221';
update cards set rules_text='[Accelerate (1)(R)] [Weaponmaster (Any)]', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-002-221';
update cards set rules_text='[Action] [Repeat (1)] Give a unit [Assault 2] this turn.', power_cost=null, might_bonus=null where card_code='sfd-003-221';
update cards set rules_text='[Hidden (Any)] Friendly units enter ready this turn. Play a Gold gear token exhausted.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-004-221';
update cards set rules_text='Kill a gear. Its controller draws 2.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-005-221';
update cards set rules_text='I enter ready.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-006-221';
update cards set rules_text='When you play me, give a unit [Ganking] this turn.', power_cost=null, might_bonus=null where card_code='sfd-007-221';
update cards set rules_text='[Weaponmaster (Any)]', power_cost=null, might_bonus=null where card_code='sfd-008-221';
update cards set rules_text='[Equip (R)]
[Assault 2]', power_cost=null, might_bonus=0 where card_code='sfd-009-221';
update cards set rules_text='I cost (2) less to play from anywhere other than your hand.', power_cost=null, might_bonus=null where card_code='sfd-010-221';
update cards set rules_text='[Reaction] Choose a unit and an Equipment with the same controller. Attach that Equipment to that unit or detach that Equipment from that unit. Draw 1.', power_cost=null, might_bonus=null where card_code='sfd-011-221';
update cards set rules_text='I cost (1) less for each card you''ve played this turn, to a minimum of (1).', power_cost=null, might_bonus=null where card_code='sfd-012-221';
update cards set rules_text='You may pay (1)(R) as an additional cost to play me.
When you play me, if you paid the additional cost, deal 2 to a unit at a battlefield.', power_cost=null, might_bonus=null where card_code='sfd-013-221';
update cards set rules_text='Units can''t move to base.', power_cost=null, might_bonus=null where card_code='sfd-014-221';
update cards set rules_text='Play me only to a battlefield you conquered this turn.', power_cost=null, might_bonus=null where card_code='sfd-015-221';
update cards set rules_text='[Equip (R)]
When I attack or defend, deal 2 to an enemy unit here.', power_cost=null, might_bonus=0 where card_code='sfd-016-221';
update cards set rules_text='[Hidden (Any)] [Action] Deal 2 to a unit at a battlefield. If it''s attacking, deal 4 to it instead.', power_cost=null, might_bonus=null where card_code='sfd-017-221';
update cards set rules_text='If you would reveal cards from a deck, look at the top card first. You may recycle it. Then reveal those cards.', power_cost=null, might_bonus=null where card_code='sfd-018-221';
update cards set rules_text='(1)(R), Recycle a unit from your trash, [Tap]: Play a 3 Might Mech unit token to your base.', power_cost=null, might_bonus=null where card_code='sfd-019-221';
update cards set rules_text='When I win a combat, play a Gold gear token exhausted.
When I attack or defend, you may pay (R) to give me +2 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-020-221';
update cards set rules_text='[Deathknell] - Play two 3 Might Mech unit tokens to your base.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-021-221';
update cards set rules_text='[Quick-Draw] [Equip (R)]', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=2 where card_code='sfd-022-221';
update cards set rules_text='[Repeat (2)(R)] Deal 2 to a unit at a battlefield, then deal 2 to up to one other unit.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-023-221';
update cards set rules_text='[Tank] When I attack, you may play an Equipment with Energy cost no more than (2), ignoring its cost. If you do, then do this: Attach it to me.', power_cost=null, might_bonus=null where card_code='sfd-024-221';
update cards set rules_text='[Reaction] [Assault 2] I can be played to a battlefield you''re attacking.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-025-221';
update cards set rules_text='Your Mechs each have [Assault 1].
When I conquer, you may recycle another friendly unit to play a Mech from your trash. Reduce its Energy cost by the Might of the unit you recycled.', power_cost=null, might_bonus=null where card_code='sfd-026a-221';
update cards set rules_text='If you have two or fewer cards in your hand, I enter ready.
When I hold, draw 2.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='sfd-027-221';
update cards set rules_text='[Assault 1] When I attack, deal damage equal to my [Assault] to an enemy unit here.', power_cost=null, might_bonus=null where card_code='sfd-028a-221';
update cards set rules_text='[Accelerate (1)(R)] [Assault 1] Friendly units played from anywhere other than a player''s hand have [Accelerate].', power_cost=null, might_bonus=null where card_code='sfd-029-221';
update cards set rules_text='[Equip (1)(R)]
My hold effects are also conquer effects, and vice versa.', power_cost=null, might_bonus=2 where card_code='sfd-030-221';
update cards set rules_text='[Repeat (2)] Play a 2 Might Sand Soldier unit token.', power_cost=null, might_bonus=null where card_code='sfd-031-221';
update cards set rules_text='When you play me, you may kill a gear.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-032-221';
update cards set rules_text='[Equip (G)]
[Tank]', power_cost=null, might_bonus=1 where card_code='sfd-033-221';
update cards set rules_text='[Reaction] [Repeat (2)] Give a unit +2 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-034-221';
update cards set rules_text='When I hold, you may return a unit or gear from your trash to your hand.', power_cost=null, might_bonus=null where card_code='sfd-035-221';
update cards set rules_text='[Deathknell] - If I died alone, draw 1.', power_cost=null, might_bonus=null where card_code='sfd-036-221';
update cards set rules_text='[Deflect (Any)]', power_cost=null, might_bonus=null where card_code='sfd-037-221';
update cards set rules_text='When I move to a battlefield, give another friendly unit +1 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-038-221';
update cards set rules_text='When you play me, ready or exhaust a legend.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-039-221';
update cards set rules_text='[Action] [Repeat (2)] Stun an attacking unit.', power_cost=null, might_bonus=null where card_code='sfd-040-221';
update cards set rules_text='When I move, reveal the top card of your Main Deck. If it''s a gear, draw it. Otherwise, recycle it.', power_cost=null, might_bonus=null where card_code='sfd-041-221';
update cards set rules_text='[Equip (G)]
If this was attached to me this turn, I have an additional +2 .', power_cost=null, might_bonus=1 where card_code='sfd-042-221';
update cards set rules_text='[Hidden (Any)] [Action] Move any number of friendly units at a battlefield to their base.', power_cost=null, might_bonus=null where card_code='sfd-043-221';
update cards set rules_text='As an additional cost to play me, return a friendly gear to its owner''s hand.', power_cost=null, might_bonus=null where card_code='sfd-044-221';
update cards set rules_text='[Reaction] Counter an enemy spell or ability that chooses a friendly unit or gear.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-045-221';
update cards set rules_text='When you play this, draw 1.
(1)(G), [Tap], Kill this: Draw 1.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-046-221';
update cards set rules_text='When you buff me, ready me.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-047-221';
update cards set rules_text='When I move, draw 1.', power_cost=null, might_bonus=null where card_code='sfd-048-221';
update cards set rules_text='When you attach an Equipment to me, choose one that hasn''t been chosen this turn -
- Ready 2 runes.
- Channel 1 rune exhausted.
- Buff a friendly unit.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-049-221';
update cards set rules_text='(G): [Action] - Choose a unit you control. Move me to its location and it to my original location. If it''s equipped, you may attach one of its Equipment to me. Use only once per turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-050a-221';
update cards set rules_text='[Equip (G)]
If I would die, kill Guardian Angel instead. Heal me, exhaust me, and recall me.', power_cost=null, might_bonus=1 where card_code='sfd-051-221';
update cards set rules_text='[Tap]: Give a unit +3 Might this turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-052-221';
update cards set rules_text='[Reaction] When you play me, heal your units here, then move up to one enemy unit from here to its base.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-053-221';
update cards set rules_text='[Deflect] Your Equipment everywhere have [Quick-Draw]. When you play it, attach it to a unit you control.)', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-054-221';
update cards set rules_text='[Shield 5] [Tank] I cost (2)(G) less for each point you scored from holding this turn.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-055-221';
update cards set rules_text='[Equip (G)]
[Quick-Draw]', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=3 where card_code='sfd-056-221';
update cards set rules_text='[Deflect (Any)] When you choose or ready me, give me +1 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-057-221';
update cards set rules_text='When you play me or when I hold, look at the top 4 cards of your Main Deck. You may reveal a gear from among them and draw it. Then recycle the rest.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-058a-221';
update cards set rules_text='[Equip (1)(G)] As this is attached to a unit, copy that unit''s text to this Equipment''s effect text for as long as this is attached to it.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=0 where card_code='sfd-059-221';
update cards set rules_text='[Deflect] While I''m at a battlefield, opponents can''t gain points.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-060-221';
update cards set rules_text='When you play me, return a gear from your trash to your hand.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-061-221';
update cards set rules_text='When you play me, ready another friendly Mech.', power_cost=null, might_bonus=null where card_code='sfd-062-221';
update cards set rules_text='When you play a spell on an opponent''s turn, you may exhaust me to play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-063-221';
update cards set rules_text='[Quick-Draw] [Equip (B)]
[Shield 2]', power_cost=null, might_bonus=0 where card_code='sfd-064-221';
update cards set rules_text='Your Mechs have [Vision].', power_cost=null, might_bonus=null where card_code='sfd-065-221';
update cards set rules_text='[Reaction] [Repeat (2)] Give a unit -2 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-066-221';
update cards set rules_text='You may pay (B) as an additional cost to play me.
When you play me, if you paid the additional cost, give a unit -2 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-067-221';
update cards set rules_text='[Accelerate (1)(B)] Each Equipment attached to me gives double its base Might bonus.', power_cost=null, might_bonus=null where card_code='sfd-068-221';
update cards set rules_text='When I conquer, play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-069-221';
update cards set rules_text='[Hidden (Any)] [Action] Deal 3 to a unit at a battlefield. Play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-070-221';
update cards set rules_text='Your Mechs have [Deflect] and [Ganking].
I enter ready if you control another Mech.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-071-221';
update cards set rules_text='When you play me, if you control two or more gear, ready me.', power_cost=null, might_bonus=null where card_code='sfd-072-221';
update cards set rules_text='[Equip (B)]
I am a Mech.', power_cost=null, might_bonus=1 where card_code='sfd-073-221';
update cards set rules_text='When you play me, you may kill a gear with Energy cost no more than (1). If you do, play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-074-221';
update cards set rules_text='When you use an activated ability of a gear, give me +1 Might this turn.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-075-221';
update cards set rules_text='This costs (2) less if you control a Mech.
Play a 3 Might Mech unit token to your base.
Draw 1.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-076-221';
update cards set rules_text='[Repeat (4)(B)] Choose one -
- Deal 4 to a unit in a base.
- Kill a gear.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-077-221';
update cards set rules_text='(Any), [Tap]: Give the next spell you play this turn [Repeat] equal to its cost.', power_cost=null, might_bonus=null where card_code='sfd-078-221';
update cards set rules_text='You may exhaust your legend as an additional cost to play me.
When you play me, if you paid the additional cost, move any number of your units to an open battlefield.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-079-221';
update cards set rules_text='[Action] [Repeat (1)(B)] Deal 1 to up to three units at the same location.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-080-221';
update cards set rules_text='When you play me, you and each opponent may play a Gold gear token exhausted. For each opponent who did, you play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-081-221';
update cards set rules_text='When I attack or defend, deal damage equal to my Might to an enemy unit here.
I don''t deal combat damage.
(B): [Action] - Move me to your base.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-082a-221';
update cards set rules_text='[Tap]: [Reaction] - Pay any amount of (Any) to [Add] that much Energy.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-083-221';
update cards set rules_text='When you play me, you may kill a friendly gear. If you do, you may play a gear with Energy cost no more than (7) from hand this turn, ignoring its Energy cost.', power_cost=null, might_bonus=null where card_code='sfd-084-221';
update cards set rules_text='[Deflect 2 (Any)(Any)] [Weaponmaster (Any)] I have +1 Might for each friendly gear.', power_cost=null, might_bonus=null where card_code='sfd-085a-221';
update cards set rules_text='[Equip (B)]
When I hold, play two Gold gear tokens exhausted.', power_cost=null, might_bonus=2 where card_code='sfd-086-221';
update cards set rules_text='[Reaction] Draw 3.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-087-221';
update cards set rules_text='(1)(B): Draw 1.
(4)(B)(B)(B)(B), [Tap]: Score 1 point.
Use my abilities only while I''m at a battlefield.', power_cost=null, might_bonus=null where card_code='sfd-088a-221';
update cards set rules_text='Your Mechs have +1 Might.
When I hold, play a 3 Might Mech unit token to your base.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-089-221';
update cards set rules_text='[Equip (1)(B)] (3)(B), Banish this: Play all units banished with this, ignoring their costs.
[Deathknell] - Banish me.', power_cost=null, might_bonus=2 where card_code='sfd-090-221';
update cards set rules_text='When you play me, you may draw 1 or buff me.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-091-221';
update cards set rules_text='[Weaponmaster (Any)]', power_cost=null, might_bonus=null where card_code='sfd-092-221';
update cards set rules_text='You may play me to an occupied enemy battlefield.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-093-221';
update cards set rules_text='I enter ready if you control another Dragon.', power_cost=null, might_bonus=null where card_code='sfd-094-221';
update cards set rules_text='[Equip (O)]', power_cost=null, might_bonus=2 where card_code='sfd-095-221';
update cards set rules_text='Ganking', power_cost=null, might_bonus=null where card_code='sfd-096-221';
update cards set rules_text='[Action] Give a unit +5 Might this turn.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-097-221';
update cards set rules_text='You may pay (1) as an additional cost to play me.
When you play me, if you paid the additional cost, buff me.', power_cost=null, might_bonus=null where card_code='sfd-098-221';
update cards set rules_text='[Weaponmaster (Any)]', power_cost=null, might_bonus=null where card_code='sfd-099-221';
update cards set rules_text='When you play a card with Power cost (Any)(Any) or more, draw 1.', power_cost=null, might_bonus=null where card_code='sfd-100-221';
update cards set rules_text='When you play me, buff up to four friendly units.
When you spend a buff, play a Gold gear token exhausted.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-101-221';
update cards set rules_text='[Equip (O)]
[Deflect]', power_cost=null, might_bonus=1 where card_code='sfd-102-221';
update cards set rules_text='[Accelerate (1)(O)] I cost (2) less for each of your [Mighty] units.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-103-221';
update cards set rules_text='[Temporary] Friendly units have [Deflect].', power_cost=null, might_bonus=null where card_code='sfd-104-221';
update cards set rules_text='I can''t be chosen by enemy spells and abilities.', power_cost=null, might_bonus=null where card_code='sfd-105-221';
update cards set rules_text='[Reaction] Draw 1 for each of your [Mighty] units.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-106-221';
update cards set rules_text='Choose an equipped friendly unit. It deals damage equal to its Might to an enemy unit. Then detach an Equipment from it.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-107-221';
update cards set rules_text='[Equip (O)]
When I conquer, buff me.', power_cost=null, might_bonus=1 where card_code='sfd-108-221';
update cards set rules_text='[Weaponmaster] You may pay (O)(O) as an additional cost to play me.
When you play me, if you paid the additional cost, move an enemy gear to your base. You control it until I leave the board. If it''s an Equipment, attach it to me.', power_cost=null, might_bonus=null where card_code='sfd-109-221';
update cards set rules_text='When I attack or defend one on one, double my Might this combat.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-110-221';
update cards set rules_text='[Hidden (Any)] [Action] You may play a unit from hand to a battlefield you control, reducing its cost by (3).', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-111-221';
update cards set rules_text='[Deflect (Any)] When I move to a battlefield, give another friendly unit my keywords and +Might equal to my Might this turn.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-112-221';
update cards set rules_text='[Weaponmaster (Any)] The first time I conquer each turn, ready me.', power_cost=null, might_bonus=null where card_code='sfd-113a-221';
update cards set rules_text='[Action] [Repeat (3)] Choose a friendly unit anywhere and an enemy unit at a battlefield. They deal damage equal to their Mights to each other.', power_cost=null, might_bonus=null where card_code='sfd-114-221';
update cards set rules_text='[Equip (O)]
When I hold, score 1 point.', power_cost=null, might_bonus=2 where card_code='sfd-115-221';
update cards set rules_text='[Weaponmaster (Any)] When I conquer a battlefield that was uncontrolled, deal damage equal to my Might to an enemy unit in a base.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-116-221';
update cards set rules_text='[Tap]: [Reaction] - Pay any amount of Energy to [Add] that much (Any).', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-117-221';
update cards set rules_text='[Equip (1)(O)]
When I conquer, channel 1 rune exhausted.', power_cost=null, might_bonus=2 where card_code='sfd-118-221';
update cards set rules_text='[Weaponmaster (Any)] When you attach an Equipment to me, you may pay (1) to draw 1.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-119-221';
update cards set rules_text='[Deflect 2 (Any)(Any)] When I conquer after an attack, if you assigned 5 or more excess damage to enemy units, you may deal that much to an enemy unit.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-120a-221';
update cards set rules_text='When you play a card from face down, play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-121-221';
update cards set rules_text='[Action] [Repeat (P)] Look at the top 2 cards of your Main Deck. Draw one and recycle the other.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-122-221';
update cards set rules_text='When I move to a battlefield, discard 1.
When I win a combat, draw 1.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-123-221';
update cards set rules_text='[Equip (P)]
When I conquer, discard 1, then draw 1.', power_cost=null, might_bonus=1 where card_code='sfd-124-221';
update cards set rules_text='When I move to a battlefield, you may pay (P) to move a unit you control to the same battlefield.', power_cost=null, might_bonus=null where card_code='sfd-125-221';
update cards set rules_text='When you defend at a battlefield, you may move me there.', power_cost=null, might_bonus=null where card_code='sfd-126-221';
update cards set rules_text='[Weaponmaster (Any)]', power_cost=null, might_bonus=null where card_code='sfd-127-221';
update cards set rules_text='When I defend, you may kill me to move an attacking unit to its base.', power_cost=null, might_bonus=null where card_code='sfd-128-221';
update cards set rules_text='[Repeat (2)] Move an enemy unit to a location where there''s a unit with the same controller.', power_cost=null, might_bonus=null where card_code='sfd-129-221';
update cards set rules_text='When I move, play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-130-221';
update cards set rules_text='[Accelerate (1)(P)] I have [Assault 1] equal to the number of enemy units here.', power_cost=null, might_bonus=null where card_code='sfd-131-221';
update cards set rules_text='When you play me, return another friendly unit and an enemy unit to their owners'' hands.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-132-221';
update cards set rules_text='[Equip (P)]
[Ganking]', power_cost=null, might_bonus=2 where card_code='sfd-133-221';
update cards set rules_text='[Equip (P)]
When I conquer, play a Gold gear token exhausted.', power_cost=null, might_bonus=1 where card_code='sfd-134-221';
update cards set rules_text='[Action] Return a gear to its owner''s hand.', power_cost=null, might_bonus=null where card_code='sfd-135-221';
update cards set rules_text='[Reaction] [Repeat (2)] Counter a spell unless its controller pays (2).', power_cost=null, might_bonus=null where card_code='sfd-136-221';
update cards set rules_text='When I move from a battlefield, give me +2 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-137-221';
update cards set rules_text='[Hidden]
When you play me, you may return another unit at a battlefield with 3 Might or less to its owner''s hand.', power_cost=null, might_bonus=null where card_code='sfd-138-221';
update cards set rules_text='[Equip (P)]
[Hidden] When you play this from face down, attach it to a unit you control here.', power_cost=null, might_bonus=2 where card_code='sfd-139-221';
update cards set rules_text='When you play me, you may play a spell from your trash with Energy cost no more than (3), ignoring its Energy cost. Then recycle it.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-140-221';
update cards set rules_text='Your spells that choose me cost (1) or (Any) less.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-141-221';
update cards set rules_text='When you choose me with a spell, draw 1.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-142-221';
update cards set rules_text='[Accelerate (1)(P)] If you''ve spent at least (Any)(Any) this turn, I have +2 Might and [Ganking].', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-143-221';
update cards set rules_text='When you choose a friendly unit, you may pay (1) and exhaust this to draw 1.', power_cost=null, might_bonus=null where card_code='sfd-144-221';
update cards set rules_text='[Hidden (Any)] [Action] Swap the Might of two units at the same battlefield this turn.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-145-221';
update cards set rules_text='While I''m in combat, friendly spells cost (1)(Any) less to a minimum of (1), and enemy spells cost (1)(Any) more.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-146-221';
update cards set rules_text='Return all units and gear to their owners'' hands.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-147-221';
update cards set rules_text='[Deflect (Any)] The first time I win a combat each turn, you score 1 point.
When I die in combat, choose an opponent. They score 1 point.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-148a-221';
update cards set rules_text='When you play me, discard 1, then draw 2.
Optional additional costs you pay cost (1) or (Any) less.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-149-221';
update cards set rules_text='[Equip] - (P), Recycle 2 cards from your trash
When I conquer or hold, you may play a unit from your trash.', power_cost=null, might_bonus=2 where card_code='sfd-150-221';
update cards set rules_text='[Reaction] [Repeat (2)] Give two friendly units each +1 Might this turn.', power_cost=null, might_bonus=null where card_code='sfd-151-221';
update cards set rules_text='When I hold, play two Gold gear tokens exhausted.', power_cost=null, might_bonus=null where card_code='sfd-152-221';
update cards set rules_text='[Equip (Y)]
When I move, play a 1 Might Recruit unit token here.', power_cost=null, might_bonus=0 where card_code='sfd-153-221';
update cards set rules_text='[Hidden] Play a 2 Might Sand Soldier unit token. Then do this: You may pay [C] to ready it.', power_cost=null, might_bonus=null where card_code='sfd-154-221';
update cards set rules_text='[Deathknell] - Play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-155-221';
update cards set rules_text='[Assault 2]', power_cost=null, might_bonus=null where card_code='sfd-156-221';
update cards set rules_text='When you play me, play a 2 Might Sand Soldier unit token here.', power_cost=null, might_bonus=null where card_code='sfd-157-221';
update cards set rules_text='When you play me, kill an enemy unit with 3 Might or less.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-158-221';
update cards set rules_text='While you have another unit here, I have +1 Might.', power_cost=null, might_bonus=null where card_code='sfd-159-221';
update cards set rules_text='You may kill a friendly gear as an additional cost to play me.
When you play me, if you paid the additional cost, kill a gear.', power_cost=null, might_bonus=null where card_code='sfd-160-221';
update cards set rules_text='[Equip (Y)]', power_cost=null, might_bonus=3 where card_code='sfd-161-221';
update cards set rules_text='[Action] Kill a unit at a battlefield with 2 Might or less. If it was an enemy unit, play a Gold gear token exhausted. If it was a friendly unit, play two Gold gear tokens exhausted.', power_cost=null, might_bonus=null where card_code='sfd-162-221';
update cards set rules_text='[Reaction] Kill a friendly unit. If you do, give +Might equal to its Might to another friendly unit this turn.
Draw 1.', power_cost=null, might_bonus=null where card_code='sfd-163-221';
update cards set rules_text='[Action] I cost (2) less to play from anywhere other than your hand.
Kill a unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-164-221';
update cards set rules_text='[Deathknell] - You may play a unit with cost no more than (3) and no more than (Any) from your trash, ignoring its cost.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-165-221';
update cards set rules_text='[Action] When a friendly unit is played this turn, buff it.
Draw 1.', power_cost=null, might_bonus=null where card_code='sfd-166-221';
update cards set rules_text='[Deathknell] - If I was [Mighty], draw 2.', power_cost=null, might_bonus=null where card_code='sfd-167-221';
update cards set rules_text='[Tap]: Play three 1 Might Recruit unit tokens.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-168-221';
update cards set rules_text='When a friendly unit dies, you may exhaust me to draw 1, then put a card from your hand on the top or bottom of your Main Deck.', power_cost=null, might_bonus=null where card_code='sfd-169-221';
update cards set rules_text='When I attack, you may reveal the top 2 cards of your Main Deck. You may banish one, then play it. If it is a unit, you may play it here. Recycle the rest.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-170-221';
update cards set rules_text='Your tokens enter ready.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-171a-221';
update cards set rules_text='[Equip (Y)]
[Deathknell] - Draw 1.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=1 where card_code='sfd-172-221';
update cards set rules_text='I must be assigned combat damage last.
If another unit you control here would die, if it has less Might than me, instead heal it, exhaust it, and recall it.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-173-221';
update cards set rules_text='When you play me, play four Gold gear tokens exhausted.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-174-221';
update cards set rules_text='When you play me, give your other units +2 Might this turn.
As I''m revealed from your deck, [Add (2)].', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-175-221';
update cards set rules_text='[Tank] I enter ready if you have two or more other units in your base.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-176-221';
update cards set rules_text='[Accelerate (1)(Y)] When I attack, you may move any number of your token units to this battlefield.', power_cost=null, might_bonus=null where card_code='sfd-177a-221';
update cards set rules_text='[Equip (Y)], Kill a friendly unit', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=4 where card_code='sfd-178-221';
update cards set rules_text='[Accelerate (1)(Y)] When I move to a battlefield, play three 1 Might Recruit unit tokens here.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-179-221';
update cards set rules_text='When a unit you control becomes [Mighty], you may pay (Y) to ready it.', power_cost=null, might_bonus=null where card_code='sfd-180a-221';
update cards set rules_text='Your Mechs have [Shield 1].', power_cost=null, might_bonus=null where card_code='sfd-181-221';
update cards set rules_text='[Reaction] [Repeat (1)(Any)] Give your Mechs +1 Might this turn.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-182-221';
update cards set rules_text='Your Equipment each give [Assault 1].', power_cost=null, might_bonus=null where card_code='sfd-183-221';
update cards set rules_text='[Action] Move a friendly unit. You may attach up to one Equipment with the same controller to it. This turn, that unit has "When I conquer, you may move me to my base."', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-184-221';
update cards set rules_text='When you win a combat, draw 1.', power_cost=null, might_bonus=null where card_code='sfd-185-221';
update cards set rules_text='[Quick-Draw] [Equip (Any)] [Temporary]', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=3 where card_code='sfd-186-221';
update cards set rules_text='When you conquer, you may exhaust me to reveal the top 2 cards of your Main Deck. You may banish one, then play it. Recycle the rest.', power_cost=null, might_bonus=null where card_code='sfd-187-221';
update cards set rules_text='Reveal the top 2 cards of your Main Deck. You may banish one, then play it, reducing its cost by (2). Draw any you didn''t banish.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-188-221';
update cards set rules_text='[Tap]: [Reaction] - [Add (Any)]. Use only to play gear or use gear abilities.', power_cost=null, might_bonus=null where card_code='sfd-189-221';
update cards set rules_text='[Unique] [Equip (Any)]', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-190-221';
update cards set rules_text='[Unique] [Equip (Any)]', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-191-221';
update cards set rules_text='[Unique] [Equip (Any)] When you play this, ready your units.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-192-221';
update cards set rules_text='(1), [Tap]: Attach a detached Equipment you control to a unit you control.
[Tap]: Attach an attached Equipment you control to a unit you control.', power_cost=null, might_bonus=null where card_code='sfd-193-221';
update cards set rules_text='[Reaction] Choose a unit. The next time that unit would be dealt damage this turn, prevent it. Draw 1.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-194-221';
update cards set rules_text='When you choose a friendly unit, you may exhaust me and pay (Any) to ready it.
When you conquer, you may pay (1) to ready me.', power_cost=null, might_bonus=null where card_code='sfd-195-221';
update cards set rules_text='[Reaction] Give a unit +2 Might this turn and another unit -2 Might this turn.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-196-221';
update cards set rules_text='Your Sand Soldiers have [Weaponmaster].
(1), [Tap]: Play a 2 Might Sand Soldier unit token to your base. Use only if you''ve played an Equipment this turn.', power_cost=null, might_bonus=null where card_code='sfd-197-221';
update cards set rules_text='Play a 2 Might Sand Soldier unit token for each Equipment you control. Then do this: Ready up to two of them.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-198-221';
update cards set rules_text='[Tap]: [Reaction] - Draw 1. Use only if you''ve chosen enemy units and/or gear twice this turn with spells or unit abilities.', power_cost=null, might_bonus=null where card_code='sfd-199-221';
update cards set rules_text='[Action] Banish a friendly unit, then its owner plays it, ignoring its cost. Deal 3 to an enemy unit at a battlefield. Banish this.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-200-221';
update cards set rules_text='When you or an ally hold, you may exhaust me to play a Gold gear token exhausted.
While your score is within 3 points of the Victory Score, your Gold [ADD] an additional (1).', power_cost=null, might_bonus=null where card_code='sfd-201-221';
update cards set rules_text='[Hidden (Any)] Take control of an enemy unit at a battlefield. Ready it.
Lose control of that unit and recall it at end of turn.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-202-221';
update cards set rules_text='When you recycle a rune, you may exhaust me to play a Gold gear token exhausted.
When one or more enemy units die, ready me.', power_cost=null, might_bonus=null where card_code='sfd-203-221';
update cards set rules_text='Ready your units.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-204-221';
update cards set rules_text='When one of your units becomes [Mighty], you may exhaust me to channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='sfd-205-221';
update cards set rules_text='[Reaction] Choose a friendly unit and a spell. Counter that spell and give that unit +Might equal to that spell''s Energy cost this turn.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-206-221';
update cards set rules_text='When you conquer here, you may pay (1) and return a unit you control here to its owner''s hand to play a 2 Might Sand Soldier unit token here.', power_cost=null, might_bonus=null where card_code='sfd-207-221';
update cards set rules_text='While you control this battlefield, friendly legends have "[Tap]: Attach an Equipment you control to a unit you control."', power_cost=null, might_bonus=null where card_code='sfd-208-221';
update cards set rules_text='Players can''t score here until their third turn.', power_cost=null, might_bonus=null where card_code='sfd-209-221';
update cards set rules_text='When you conquer here, you may pay (1) to ready your legend.', power_cost=null, might_bonus=null where card_code='sfd-210-221';
update cards set rules_text='While you control this battlefield, friendly [Repeat] costs cost (1) less.', power_cost=null, might_bonus=null where card_code='sfd-211-221';
update cards set rules_text='When you conquer here, put the top 2 cards of your Main Deck into your trash.', power_cost=null, might_bonus=null where card_code='sfd-212-221';
update cards set rules_text='While you control this battlefield, the first friendly non-token gear played each turn costs (1) less.', power_cost=null, might_bonus=null where card_code='sfd-213-221';
update cards set rules_text='When you hold here, you may pay (Any)(Any)(Any)(Any) to score 1 point.', power_cost=null, might_bonus=null where card_code='sfd-214-221';
update cards set rules_text='When you defend here, reveal the top card of your Main Deck. If it''s a spell, put it in your hand. Otherwise, recycle it.', power_cost=null, might_bonus=null where card_code='sfd-215-221';
update cards set rules_text='Units can''t be played here.', power_cost=null, might_bonus=null where card_code='sfd-216-221';
update cards set rules_text='When you conquer here, draw 1 for each other battlefield you or allies control.', power_cost=null, might_bonus=null where card_code='sfd-217-221';
update cards set rules_text='When you conquer here with one or more [Mighty] units, you may pay (1) to draw 1.', power_cost=null, might_bonus=null where card_code='sfd-218-221';
update cards set rules_text='When you hold here, each player channels 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='sfd-219-221';
update cards set rules_text='When you conquer here, you may pay (1) to play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='sfd-220-221';
update cards set rules_text='When you conquer here, you may ready a friendly gear. If it''s an Equipment, you may detach it.', power_cost=null, might_bonus=null where card_code='sfd-221-221';
update cards set rules_text='I enter ready.
[Tap]: Give a unit +3 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-001-219';
update cards set rules_text='[Ambush] [Assault 2]', power_cost=null, might_bonus=null where card_code='unl-002-219';
update cards set rules_text='[Hidden (Any)] When you play me to a battlefield, deal 2 to an enemy unit here.', power_cost=null, might_bonus=null where card_code='unl-003-219';
update cards set rules_text='If you''ve spent (4) or more to play a spell this turn, I have +4 Might.', power_cost=null, might_bonus=null where card_code='unl-004-219';
update cards set rules_text='[Ganking] When you play a spell, if you spent (4) or more, ready me.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-005-219';
update cards set rules_text='[Accelerate (1)(R)] [Assault 4]', power_cost=null, might_bonus=null where card_code='unl-006-219';
update cards set rules_text='[Action] Deal 3 to a unit at a battlefield. If it would die this turn, banish it instead.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-007-219';
update cards set rules_text='[Assault 1] If a unit died this turn, I enter ready.', power_cost=null, might_bonus=null where card_code='unl-008-219';
update cards set rules_text='[Repeat (2)] Ready a unit.', power_cost=null, might_bonus=null where card_code='unl-009-219';
update cards set rules_text='[Action] Give a unit [Assault 2] and [Ganking] this turn.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-010-219';
update cards set rules_text='When you play a unit during a showdown, you may exhaust this to draw 1.', power_cost=null, might_bonus=null where card_code='unl-011-219';
update cards set rules_text='[Ambush] When you play me, give your other units here [Assault 1] this turn.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-012-219';
update cards set rules_text='[Hidden (Any)] [Reaction] Choose a unit. Double all damage that would be dealt to it this turn.', power_cost=null, might_bonus=null where card_code='unl-013-219';
update cards set rules_text='[Action] Deal 2 to a unit at a battlefield. If you control a facedown card, deal 4 to it instead.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-014-219';
update cards set rules_text='Draw 1, then draw 1 for each battlefield you or allies control.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-015-219';
update cards set rules_text='[Hunt 2] [Level 3] I have +1 Might and enter ready.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-016-219';
update cards set rules_text='[Repeat] - Discard 1
Give a unit [Assault 4] this turn.', power_cost=null, might_bonus=null where card_code='unl-017-219';
update cards set rules_text='When I conquer, if you assigned 3 or more excess damage, play two Gold gear tokens exhausted.', power_cost=null, might_bonus=null where card_code='unl-018-219';
update cards set rules_text='[Equip (1)(R)]
At the end of your turn, if I didn''t conquer this turn, unattach this and deal 4 to me.', power_cost=null, might_bonus=4 where card_code='unl-019-219';
update cards set rules_text='Deal 2 to a unit. Its controller may play this spell again for (Any). If they do, this deals 1 additional Bonus Damage for each time this spell has dealt damage this turn.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-020-219';
update cards set rules_text='[Ambush] When you play me, you may return a friendly unit at a battlefield to its owner''s hand.', power_cost=null, might_bonus=null where card_code='unl-021-219';
update cards set rules_text='[Deflect (Any)] [Ganking] When I move, [Add (1)(Any)].', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-022a-219';
update cards set rules_text='When you hide a card, ready me.
When you play a card from face down, deal 2 to an enemy unit.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-023-219';
update cards set rules_text='[Accelerate (1)(R)] [Assault 2] [Deflect (Any)] [Ganking]', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-024a-219';
update cards set rules_text='[Legion] You may play me from your trash for (3)(R).', power_cost=null, might_bonus=null where card_code='unl-025-219';
update cards set rules_text='(R), [Tap]: Deal 3 to a unit. Use this ability only while I''m at a battlefield.', power_cost=null, might_bonus=null where card_code='unl-026-219';
update cards set rules_text='When I conquer, give a friendly unit +8 Might this turn.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-027-219';
update cards set rules_text='[Hidden (Any)] [Ganking] You may pay (R) as an additional cost to play me.
When you play me, if you paid the additional cost, ready me and give me +2 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-028-219';
update cards set rules_text='[Accelerate (1)(R)] Your conquer effects for conquering here trigger an additional time.
When I conquer, [Buff] a friendly unit.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-029a-219';
update cards set rules_text='[Deflect (Any)] (2)(R): Double my Might this turn.', power_cost=null, might_bonus=null where card_code='unl-030a-219';
update cards set rules_text='[Reaction] Give a unit +1 Might this turn.
[Level 6] Give it +3 Might this turn instead.', power_cost=null, might_bonus=null where card_code='unl-031-219';
update cards set rules_text='[Repeat (2)] Look at the top 3 cards of your Main Deck. You may reveal a unit from among them and draw it. Recycle the rest.', power_cost=null, might_bonus=null where card_code='unl-032-219';
update cards set rules_text='When you play me, play a 1 Might Bird unit token with [Deflect] here.', power_cost=null, might_bonus=null where card_code='unl-033-219';
update cards set rules_text='[Hunt] When you play me, gain 2 XP.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-034-219';
update cards set rules_text='If an opponent controls a stunned unit, I cost (2) less and enter ready.', power_cost=null, might_bonus=null where card_code='unl-035-219';
update cards set rules_text='[Shield 2] [Tank]', power_cost=null, might_bonus=null where card_code='unl-036-219';
update cards set rules_text='If a friendly unit died during your Beginning Phase this turn, I enter ready.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-037-219';
update cards set rules_text='Move an enemy unit.
[Level 6] [Stun] an enemy unit.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-038-219';
update cards set rules_text='[Equip (G)]
[Level 3] I have an additional +1 Might', power_cost=null, might_bonus=1 where card_code='unl-039-219';
update cards set rules_text='[Hunt] [Level 6] When you play me, draw 1.', power_cost=null, might_bonus=null where card_code='unl-040-219';
update cards set rules_text='[Deflect (Any)] While I''m at a battlefield, your other units here have [Deflect].', power_cost=null, might_bonus=null where card_code='unl-041-219';
update cards set rules_text='[Hidden (Any)] [Action] [Stun] a unit.
If you played this from your hand, draw 1.', power_cost=null, might_bonus=null where card_code='unl-042-219';
update cards set rules_text='[Backline] When I hold, [Buff] all units here.', power_cost=null, might_bonus=null where card_code='unl-043-219';
update cards set rules_text='[Reaction] Choose one -
- Counter a spell.
- Play four 1 Might Bird unit tokens with [Deflect].', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-044-219';
update cards set rules_text='[Action] Exhaust a unit you control, [Tap]: Move a different unit you control to the location of the unit you exhausted to pay for this ability.', power_cost=null, might_bonus=null where card_code='unl-045-219';
update cards set rules_text='[Reaction] Choose a unit. Give it +1 Might this turn for each of the following tags among your units - Bird, Cat, Dog, and Poro.', power_cost=null, might_bonus=null where card_code='unl-046-219';
update cards set rules_text='[Hunt 2] [Level 3] I have +1 Might and [Deflect].', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-047-219';
update cards set rules_text='[Shield 1] When I hold, play a ready 3 Might Sprite unit token with [Temporary] here.', power_cost=null, might_bonus=null where card_code='unl-048-219';
update cards set rules_text='This enters exhausted.
[Reaction [Tap]]: [Add (Any)].
[Level 6] [Reaction [Tap]]: [Add (1)(Any)].', power_cost=null, might_bonus=null where card_code='unl-049-219';
update cards set rules_text='When I hold, at the start of your next Main Phase, you may move an enemy unit to this battlefield.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-050-219';
update cards set rules_text='When you play me or when I hold, look at the top 3 cards of your Main Deck. You may reveal a unit from among them and draw it. Recycle the rest. Then if you revealed a Bird, Cat, Dog, or Poro, do this: [Buff] a friendly unit.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-051-219';
update cards set rules_text='You may pay (G) as an additional cost to play me.
When you play me, if you paid the additional cost, [Stun] an enemy unit.
When I hold, the next time you play a unit this turn, ready it and [Buff] it.', power_cost=null, might_bonus=null where card_code='unl-052-219';
update cards set rules_text='When you play me, draw 1.
[Deathknell] Choose an opponent. They reveal their hand. You can look at their facedown cards this turn. Gain 1 XP.', power_cost=null, might_bonus=null where card_code='unl-053-219';
update cards set rules_text='Move any number of enemy units with the same controller and a total Might of 8 or less to a single location.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-054-219';
update cards set rules_text='[Shield 1] [Tank] When you [Stun] an enemy unit at a battlefield, you may move me to that battlefield.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-055-219';
update cards set rules_text='When I attack or defend, give one of your other units here +3 Might and [Tank] this turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-056-219';
update cards set rules_text='[Tank] Your units here with less Might than me can''t be chosen by enemy spells and abilities.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-057-219';
update cards set rules_text='When you play a token unit, give me +1 Might this turn.
Your token units have [Tank].', power_cost=null, might_bonus=null where card_code='unl-058a-219';
update cards set rules_text='[Level 3] I cost (2)(G) less.
[Level 6] I cost (4)(G)(G) less instead.
[Level 11] I cost (6)(G)(G)(G) less instead.
[Level 16] I can''t be chosen by enemy spells and abilities.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-059-219';
update cards set rules_text='[Ambush] Enemy units here with less Might than me don''t deal combat damage.
When I hold, draw 1.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-060a-219';
update cards set rules_text='[Reaction] [Repeat (2)] Draw 1.', power_cost=null, might_bonus=null where card_code='unl-061-219';
update cards set rules_text='[Deathknell] [Predict 2].', power_cost=null, might_bonus=null where card_code='unl-062-219';
update cards set rules_text='[Reaction] Give a unit -4 Might this turn.
[Predict].', power_cost=null, might_bonus=null where card_code='unl-063-219';
update cards set rules_text='When you play me, look at the top 4 cards of your Main Deck. You may reveal a spell with Energy cost (4) or more from among them and draw it. Recycle the rest.', power_cost=null, might_bonus=null where card_code='unl-064-219';
update cards set rules_text='When I attack, you may pay (1) to give a unit here -1 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-065-219';
update cards set rules_text='[Reaction] Give a unit -10 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-066-219';
update cards set rules_text='[Deathknell] Deal 4 to an enemy unit.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-067-219';
update cards set rules_text='When another friendly unit dies, give me +2 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-068-219';
update cards set rules_text='Play two ready 3 Might Sprite unit tokens with [Temporary].', power_cost=null, might_bonus=null where card_code='unl-069-219';
update cards set rules_text='Give a gear [Temporary].', power_cost=null, might_bonus=null where card_code='unl-070-219';
update cards set rules_text='[Ambush] When you play me, give your other units here [Shield 1] this turn.', power_cost=null, might_bonus=null where card_code='unl-071-219';
update cards set rules_text='[Action] Choose a battlefield and an enemy unit there. Deal 4 to that unit and 1 to each other enemy unit there.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-072-219';
update cards set rules_text='Deal 3 to an enemy unit. When it dies this turn, play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='unl-073-219';
update cards set rules_text='When you draw your second card each turn, give a friendly unit +2 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-074-219';
update cards set rules_text='[Hunt 2] [Level 3] I have +1 Might and [Ganking].', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-075-219';
update cards set rules_text='I have +1 Might for each of your units with [Temporary] at my battlefield.', power_cost=null, might_bonus=null where card_code='unl-076-219';
update cards set rules_text='Your token units have +1 Might.', power_cost=null, might_bonus=null where card_code='unl-077-219';
update cards set rules_text='[Temporary] When you play this, play a ready 3 Might Sprite unit token with [Temporary] to your base.
[Deathknell] Repeat this gear''s play effect.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-078-219';
update cards set rules_text='When a showdown begins here, you may pay (1) to [Predict], then reveal the top card of your Main Deck. If it''s a spell, draw it.', power_cost=null, might_bonus=null where card_code='unl-079a-219';
update cards set rules_text='When I move, draw 1, then discard 1. Then, do the following based on the discarded card''s type:
- Spell - Draw 1.
- Gear - Ready up to 2 runes.
- Unit - Give me +3 Might this turn.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-080-219';
update cards set rules_text='[Hidden] [Temporary] When you play me, play two Reflection unit tokens here. Then do this: They become copies of me.', power_cost=null, might_bonus=null where card_code='unl-081-219';
update cards set rules_text='[Accelerate (1)(B)] When I move from a location, play a 3 Might Sprite unit token with [Temporary] there.', power_cost=null, might_bonus=null where card_code='unl-082-219';
update cards set rules_text='[Hidden (Any)] [Action] Choose a unit you control and another unit you control at a different location. If at least one of them has [Temporary], move each to the other''s location. Draw 1.', power_cost=null, might_bonus=null where card_code='unl-083-219';
update cards set rules_text='When you play me or at the start of your Beginning Phase, play a ready 3 Might Sprite unit token with [Temporary] to your base.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-084-219';
update cards set rules_text='[Reaction] [Temporary] When an opponent scores, draw 1.', power_cost=null, might_bonus=null where card_code='unl-085-219';
update cards set rules_text='Once each turn, if you would play a token unit while I''m at a battlefield, you may play that token and an additional copy of it instead.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-086-219';
update cards set rules_text='[Shield 2] Your hold effects for holding here trigger an additional time.
When I hold, [Add (Any)] at the start of your next Main Phase.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-087a-219';
update cards set rules_text='At the start of your Beginning Phase, if you have exactly 4 cards in hand and exactly 4 units at battlefields, you win the game.
Discard 1, [Tap]: Play a 1 Might Bird unit token with [Deflect].', power_cost=null, might_bonus=null where card_code='unl-088-219';
update cards set rules_text='[Vision] If you''ve spent (4) or more to play a spell this turn, you may play me for (B).', power_cost=null, might_bonus=null where card_code='unl-089-219';
update cards set rules_text='[Backline] Your [Temporary] effects at my battlefield don''t trigger.', power_cost=null, might_bonus=null where card_code='unl-090-219';
update cards set rules_text='Draw 2.
[Level 6] This costs (2) less.
[Level 11] This costs (4) less instead.', power_cost=null, might_bonus=null where card_code='unl-091-219';
update cards set rules_text='When you play me, gain 1 XP.', power_cost=null, might_bonus=null where card_code='unl-092-219';
update cards set rules_text='[Reaction [Tap]]: [Add (1)].', power_cost=null, might_bonus=null where card_code='unl-093-219';
update cards set rules_text='[Hunt] [Level 6] I have +1 Might.', power_cost=null, might_bonus=null where card_code='unl-094-219';
update cards set rules_text='[Action] Give a friendly unit +3 Might this turn. When it wins a combat this turn, gain 2 XP.', power_cost=null, might_bonus=null where card_code='unl-095-219';
update cards set rules_text='[Equip (O)]
[Hunt 1]', power_cost=null, might_bonus=2 where card_code='unl-096-219';
update cards set rules_text='When you play me, draw 1 if your other units have total Might 5 or more.', power_cost=null, might_bonus=null where card_code='unl-097-219';
update cards set rules_text='[Level 11] I have +4 Might.', power_cost=null, might_bonus=null where card_code='unl-098-219';
update cards set rules_text='[Shield 2] [Tank]', power_cost=null, might_bonus=null where card_code='unl-099-219';
update cards set rules_text='[Hunt 3]', power_cost=null, might_bonus=null where card_code='unl-100-219';
update cards set rules_text='Move a unit you control to a battlefield you control. Then, choose an opponent. They move a unit they control to the same battlefield.', power_cost=null, might_bonus=null where card_code='unl-101-219';
update cards set rules_text='[Hunt] Spend 2 XP: [Buff] me.', power_cost=null, might_bonus=null where card_code='unl-102-219';
update cards set rules_text='[Reaction] Choose one -
- Choose up to 3 cards from opponents'' trashes. Their owners recycle them.
- Draw 1.', power_cost=null, might_bonus=null where card_code='unl-103-219';
update cards set rules_text='When you play me or another Dragon, ready up to 2 runes.', power_cost=null, might_bonus=null where card_code='unl-104-219';
update cards set rules_text='When I move, you may move an enemy unit here with less Might than me to a different battlefield.', power_cost=null, might_bonus=null where card_code='unl-105-219';
update cards set rules_text='[Reaction] Choose a friendly unit at a battlefield. Counter an enemy spell or ability that chooses it and no other friendly unit.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-106-219';
update cards set rules_text='Choose a friendly unit and a battlefield. Move all enemy units at that battlefield with less Might than the chosen unit to their base. Gain 1 XP.', power_cost=null, might_bonus=null where card_code='unl-107-219';
update cards set rules_text='If you''ve gained XP this turn, I have +1 Might and [Ganking].', power_cost=null, might_bonus=null where card_code='unl-108-219';
update cards set rules_text='When you play a unit, you may pay (1) to gain 1 XP.
Spend 3 XP, [Tap]: Ready a unit.', power_cost=null, might_bonus=null where card_code='unl-109-219';
update cards set rules_text='Choose two units. They deal damage equal to their Mights to each other.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-110-219';
update cards set rules_text='I can''t move to base.', power_cost=null, might_bonus=null where card_code='unl-111-219';
update cards set rules_text='When I move to a battlefield, you may move an enemy unit to that battlefield.', power_cost=null, might_bonus=null where card_code='unl-112-219';
update cards set rules_text='[Hunt 2] [Level 6] I have [Deflect] and [Ganking].', power_cost=null, might_bonus=null where card_code='unl-113-219';
update cards set rules_text='[Ambush] When I win a combat, draw 1.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-114-219';
update cards set rules_text='[Accelerate (1)(O)] [Ganking] When I move, gain 1 XP.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-115-219';
update cards set rules_text='[Deflect (Any)] When you play me, if an opponent''s score is within 3 points of the Victory Score, ready me and gain 3 XP.', power_cost=null, might_bonus=null where card_code='unl-116-219';
update cards set rules_text='[Hunt 2] I can be played to an occupied battlefield if an enemy unit is alone there.
Friendly units can be played to an occupied battlefield if an enemy unit is alone there.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-117-219';
update cards set rules_text='Any amount of your damage is enough to kill enemy units.
When you play me, choose up to one enemy unit at each location. Deal 1 to them.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-118-219';
update cards set rules_text='[Hunt] When I attack, you may spend 3 XP to deal damage equal to my Might to an enemy unit here.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-119-219';
update cards set rules_text='[Ambush] I can [Ambush] to a battlefield where there are enemy units, even if you don''t have units there.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-120a-219';
update cards set rules_text='When you play me, choose a player. They discard 1.', power_cost=null, might_bonus=null where card_code='unl-121-219';
update cards set rules_text='If you''ve played a spell this turn, you may pay (P) as an additional cost to play me. If you do, I enter ready.', power_cost=null, might_bonus=null where card_code='unl-122-219';
update cards set rules_text='When you play me, discard 1, then draw 1.', power_cost=null, might_bonus=null where card_code='unl-123-219';
update cards set rules_text='Move an enemy unit from a battlefield to its base. Then, if there''s an enemy unit alone at that battlefield, draw 1.', power_cost=null, might_bonus=null where card_code='unl-124-219';
update cards set rules_text='[Reaction] Discard 1, then draw 2.', power_cost=null, might_bonus=null where card_code='unl-125-219';
update cards set rules_text='Spend 3 XP: Give your units here [Ganking] this turn.', power_cost=null, might_bonus=null where card_code='unl-126-219';
update cards set rules_text='[Accelerate (1)(P)] When I move to a battlefield, gain 2 XP.', power_cost=null, might_bonus=null where card_code='unl-127-219';
update cards set rules_text='[Reaction] Return a friendly unit and an enemy unit to their owners'' hands.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-128-219';
update cards set rules_text='When another friendly unit dies, gain 1 XP.', power_cost=null, might_bonus=null where card_code='unl-129-219';
update cards set rules_text='[Deflect (Any)] When you play me, choose an opponent. They play a 1 Might Bird unit token with [Deflect].', power_cost=null, might_bonus=null where card_code='unl-130-219';
update cards set rules_text='[Reaction] Counter a spell. Return it to its owner''s hand instead of putting it in their trash.
[Predict].', power_cost=null, might_bonus=null where card_code='unl-131-219';
update cards set rules_text='When you play me, return all units with 2 Might or less to their owners'' hands.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-132-219';
update cards set rules_text='When you play this, you may move an enemy unit.
When you move an enemy unit, you may exhaust this to [Stun] it.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-133-219';
update cards set rules_text='[Action] [Repeat (2)] [Stun] an attacking enemy unit. If it''s already stunned, return it to its owner''s hand instead.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-134-219';
update cards set rules_text='When you play me, choose an opponent. They reveal their hand. You may pay 2 XP to choose a card from their hand. If you do, they discard that card and draw 1.', power_cost=null, might_bonus=null where card_code='unl-135-219';
update cards set rules_text='This enters exhausted.
Kill this, (1), [Tap]: [Predict 2], then draw 1. Gain 1 XP.', power_cost=null, might_bonus=null where card_code='unl-136-219';
update cards set rules_text='When I attack, you may pay (1) to move an enemy unit here to its base.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-137-219';
update cards set rules_text='As you play this, name a tag.
[Tap]: Give a unit with the named tag -2 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-138-219';
update cards set rules_text='[Hidden] Choose a battlefield. An opponent reveals their hand. You may choose a unit from it. They play that unit to that battlefield, ignoring any and all costs. If they do, then do this: [Stun] it.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-139-219';
update cards set rules_text='You may spend 5 XP as an additional cost to play this.
Choose an enemy unit at a battlefield with 3 Might or less. If you paid the additional cost, choose any enemy unit at a battlefield instead. Take control of it, exhaust it, and recall it.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-140-219';
update cards set rules_text='[Hidden (Any)] [Backline] When you play me from face down on your turn, you may move an enemy unit at a different location to my battlefield.', power_cost=null, might_bonus=null where card_code='unl-141-219';
update cards set rules_text='[Reaction] As an additional cost to play this, kill a friendly unit.
Play a unit from your trash that costs no more Energy and no more Power than the killed unit, ignoring its cost.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-142-219';
update cards set rules_text='[Ambush] When I attack or defend, if an enemy unit is alone here, give me +2 Might this turn and gain 2 XP.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-143a-219';
update cards set rules_text='I can''t be readied.
(P): Move me to an occupied enemy battlefield if my Might is greater than the total Might of enemy units there.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-144-219';
update cards set rules_text='[Hidden (Any)] [Backline] Once each turn, when an enemy unit dies while I''m at a battlefield, play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='unl-145-219';
update cards set rules_text='While I''m in a showdown, your spells have [Repeat (2)(P)].', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-146-219';
update cards set rules_text='As you play me, add the Baron Pit battlefield token to the board if it''s not there already. If you do, I enter there.
I can''t be chosen by enemy spells and abilities.
Other friendly units have +2 Might.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-147-219';
update cards set rules_text='When you play this, banish all units from your trash.
[Tap]: Play a unit banished with this.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-148-219';
update cards set rules_text='[Ambush] When you play a spell, give me +2 Might this turn.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-149a-219';
update cards set rules_text='[Deflect (Any)] When an opponent plays a unit while I''m at a battlefield, [Stun] it. They can''t move it this turn.', power_cost=null, might_bonus=null where card_code='unl-150-219';
update cards set rules_text='[Level 3] I enter ready.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-151-219';
update cards set rules_text='[Assault 1] [Deathknell] Channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='unl-152-219';
update cards set rules_text='[Deathknell] Play a 1 Might Bird unit token with [Deflect] to your base.', power_cost=null, might_bonus=null where card_code='unl-153-219';
update cards set rules_text='I have +2 Might while I''m attacking with another unit.', power_cost=null, might_bonus=null where card_code='unl-154-219';
update cards set rules_text='[Action] Give a friendly unit +1 Might this turn and [Stun] an enemy unit at its location.', power_cost=null, might_bonus=null where card_code='unl-155-219';
update cards set rules_text='[Deathknell] If I didn''t die alone, draw 1.', power_cost=null, might_bonus=null where card_code='unl-156-219';
update cards set rules_text='When you play me, gain 1 XP for each friendly unit.', power_cost=null, might_bonus=null where card_code='unl-157-219';
update cards set rules_text='When you play this, gain 1 XP.
[Equip] - Spend 1 XP', power_cost=null, might_bonus=2 where card_code='unl-158-219';
update cards set rules_text='Kill a unit at a battlefield with 3 Might or less.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-159-219';
update cards set rules_text='[Tap]: Play two (1) Might Bird unit tokens with [Deflect]. Use this ability only while I''m at a battlefield.', power_cost=null, might_bonus=null where card_code='unl-160-219';
update cards set rules_text='[Vision] [Action] Kill this, [Tap]: Give a unit +2 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-161-219';
update cards set rules_text='[Hunt] Spend 2 XP: [Buff] me.', power_cost=null, might_bonus=null where card_code='unl-162-219';
update cards set rules_text='Opponents must pay (Any) for each unit beyond the first to move multiple units to my battlefield at the same time.', power_cost=null, might_bonus=null where card_code='unl-163-219';
update cards set rules_text='You may spend 3 XP as an additional cost to play me.
When you play me, each player must kill one of their units. If you paid my additional cost, you don''t kill a unit this way.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-164-219';
update cards set rules_text='Choose a friendly unit without [Temporary]. Give it [Temporary]. Draw 2.', power_cost=null, might_bonus=null where card_code='unl-165-219';
update cards set rules_text='[Ambush] As an additional cost to play me, kill a Bird, Cat, Dog, or Poro you control. You may [Ambush] me to its battlefield, even if you don''t have other units there.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-166-219';
update cards set rules_text='When you play me, return a Bird, Cat, Dog, or Poro from your trash to your hand.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-167-219';
update cards set rules_text='This costs (2) less if you choose a Bird, Cat, Dog, or Poro.
Play a unit with cost no more than (2) and no more than (Any) from your trash, ignoring its cost.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-168-219';
update cards set rules_text='When you play me, choose an opponent. They reveal their hand. Choose a card revealed this way and banish it. When they hold, return it to their hand.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-169-219';
update cards set rules_text='You may kill a friendly unit as an additional cost to play me. If you do, I cost (1) less for each Energy it costs and (Y) less for each Power it costs.
[Ganking] When I attack, the defender must kill one of their units here.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-170-219';
update cards set rules_text='[Deflect (Any)] [Tank] I don''t deal combat damage.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-171-219';
update cards set rules_text='[Assault 1] [Deathknell] Draw 1. If it''s your Beginning Phase, draw 2 instead.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-172-219';
update cards set rules_text='[Reaction] As an additional cost to play this, kill a friendly [Mighty] unit.
Draw 2 and channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='unl-173-219';
update cards set rules_text='The first time a friendly unit dies during your Beginning Phase each turn, each opponent must kill one of their units.', power_cost=null, might_bonus=null where card_code='unl-174-219';
update cards set rules_text='[Reaction] Choose a friendly unit. The next time it would die this turn, heal it, exhaust it, and recall it instead.', power_cost=null, might_bonus=null where card_code='unl-175-219';
update cards set rules_text='[Ambush] When I attack, [Stun] an enemy unit here.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-176a-219';
update cards set rules_text='As you play me, choose Bird, Cat, Dog, or Poro. I gain that tag.
When I conquer or hold, score 1 point if your units have all of the following tags among them - Bird, Cat, Dog, and Poro.', power_cost=null, might_bonus=null where card_code='unl-177a-219';
update cards set rules_text='You may spend 3 XP as an additional cost to play me. If you do, I cost (3) less.
[Ambush] [Tank]', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-178a-219';
update cards set rules_text='When I move to a battlefield, look at the top 3 cards of your Main Deck. You may reveal a unit from among them and draw it. Recycle the rest.
[Deathknell] Play a unit from your hand to your base, ignoring its Energy cost.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-179-219';
update cards set rules_text='Kill all units.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-180-219';
update cards set rules_text='When you play a spell, if you spent (4) or more, you may banish it. Then, if there are four spells banished with me, put each in its trash, channel 4 runes, and draw 1.', power_cost=null, might_bonus=null where card_code='unl-181-219';
update cards set rules_text='[Repeat] - (1) / (Any) / (1)(Any)
Choose one you haven''t already chosen -
- Draw 1.
- Deal 2 to a unit at a battlefield.
- Deal 3 to a unit at a base.
- Give a unit at a battlefield -4 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-182-219';
update cards set rules_text='When you play a unit, give a unit +1 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-183-219';
update cards set rules_text='[Reaction] Banish a friendly unit, then its owner plays it to any battlefield, ignoring its cost.', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-184-219';
update cards set rules_text='(1), [Tap]: Return a friendly unit at a battlefield to its owner''s hand. Play a Gold gear token exhausted.', power_cost=null, might_bonus=null where card_code='unl-185-219';
update cards set rules_text='Kill a unit at a battlefield. Then, if it had 3 Might or less, do this: You may play this from your trash for (Any).', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-186-219';
update cards set rules_text='When you conquer, if you assigned 3 or more excess damage, you may exhaust me to ready a unit.', power_cost=null, might_bonus=null where card_code='unl-187-219';
update cards set rules_text='[Equip (3)(Any)]. This ability''s Energy cost is reduced by the Might of the unit you choose.', power_cost=null, might_bonus=null where card_code='unl-188-219';
update cards set rules_text='(4), [Tap]: Play a ready 3 Might Sprite unit token with [Temporary]. This ability costs (1) less for each friendly unit with [Temporary].', power_cost=null, might_bonus=null where card_code='unl-189-219';
update cards set rules_text='[Reaction] Counter a spell. Its controller can''t play spells this turn.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-190-219';
update cards set rules_text='[Level 6] Your units have +1 Might.
[Level 11] Your units enter ready.', power_cost=null, might_bonus=null where card_code='unl-191-219';
update cards set rules_text='[Action] Choose a friendly unit. It deals damage equal to its Might split among enemy units at battlefields. Then for each unit this kills, do this: Gain 1 XP.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-192-219';
update cards set rules_text='When you or an ally hold, you may exhaust me to draw 1.', power_cost=null, might_bonus=null where card_code='unl-193-219';
update cards set rules_text='If you play me to a battlefield, I enter ready.
[Action (1)(Any)], [Tap]: [Stun] an enemy unit attacking here.', power_cost=null, might_bonus=null where card_code='unl-194-219';
update cards set rules_text='When you conquer or hold, you may exhaust me to replace that battlefield with a Brush battlefield token.', power_cost=null, might_bonus=null where card_code='unl-195-219';
update cards set rules_text='I enter ready.
Reduce my cost by (1) for each of the following tags among your units - Bird, Cat, Dog, and Poro.
When I attack while your units have all 4 tags, [Stun] an enemy unit here.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-196-219';
update cards set rules_text='[Reaction [Tap]]: [Add (1)]. Spend this Energy only during showdowns.', power_cost=null, might_bonus=null where card_code='unl-197-219';
update cards set rules_text='[Action] Choose a battlefield where you have units. You may move up to one enemy unit to that battlefield. Then give enemy units there -2 Might this turn.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-198-219';
update cards set rules_text='When you conquer or hold, you may discard 1 and exhaust me to play a ready Reflection unit token there. Then do this: It becomes a copy of another unit there. Give it [Temporary].', power_cost=null, might_bonus=null where card_code='unl-199-219';
update cards set rules_text='Choose a unit. Play a ready Reflection unit token to your base. Then do this: It becomes a copy of that unit. Give it [Temporary].', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-200-219';
update cards set rules_text='When you win a combat, gain 1 XP.
Spend 1 XP, [Tap]: [Buff] a unit.
Spend 2 XP, [Tap]: Move an exhausted friendly unit from a battlefield to its base.', power_cost=null, might_bonus=null where card_code='unl-201-219';
update cards set rules_text='Move a friendly unit, then move an enemy unit.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-202-219';
update cards set rules_text='When you hold, gain 1 XP.
Spend 3 XP, [Tap]: Draw 1.', power_cost=null, might_bonus=null where card_code='unl-203-219';
update cards set rules_text='[Action] Choose an enemy unit at a battlefield. Its owner places it on the top or bottom of their Main Deck.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-204-219';
update cards set rules_text='When a player plays a spell, they may give a unit they control here +1 Might this turn.', power_cost=null, might_bonus=null where card_code='unl-205-219';
update cards set rules_text='If a unit here would die during combat, its controller may pay (Any)(Any)(Any) to heal it, exhaust it, and recall it instead.', power_cost=null, might_bonus=null where card_code='unl-206-219';
update cards set rules_text='When you hold here, you may move a unit at a battlefield to its base.', power_cost=null, might_bonus=null where card_code='unl-207-219';
update cards set rules_text='Units here with [Temporary] have [Shield 1].', power_cost=null, might_bonus=null where card_code='unl-208-219';
update cards set rules_text='At the start of your Beginning Phase, you may kill a unit you control here to draw 1.', power_cost=null, might_bonus=null where card_code='unl-209-219';
update cards set rules_text='While a unit here is defending alone, it has -2 Might.', power_cost=null, might_bonus=null where card_code='unl-210-219';
update cards set rules_text='While you control this battlefield, when you play a spell, if you spent (4) or more, [Predict].', power_cost=null, might_bonus=null where card_code='unl-211-219';
update cards set rules_text='At the start of each player''s Beginning Phase, deal 1 to each unit here.', power_cost=null, might_bonus=null where card_code='unl-212-219';
update cards set rules_text='Units here have "[Tap]: Gain 1 XP."', power_cost=null, might_bonus=null where card_code='unl-213-219';
update cards set rules_text='When a unit here is returned to a player''s hand, that player may pay (1) to channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='unl-214-219';
update cards set rules_text='The first time a player plays a non-token unit here each turn, they may move another unit they control here to its base.', power_cost=null, might_bonus=null where card_code='unl-215-219';
update cards set rules_text='When you hold here, give your next spell this turn [Repeat] equal to its base cost.', power_cost=null, might_bonus=null where card_code='unl-216-219';
update cards set rules_text='When you conquer here, if you assigned 3 or more excess damage, play a 1 Might Bird unit token with [Deflect].', power_cost=null, might_bonus=null where card_code='unl-217-219';
update cards set rules_text='When a player plays a unit here, they may pay (1) to [Buff] it.', power_cost=null, might_bonus=null where card_code='unl-218-219';
update cards set rules_text='When you hold here, your non-token units cost (1) more to play this turn.', power_cost=null, might_bonus=null where card_code='unl-219-219';
update cards set rules_text='The first time I move each turn, choose a player. They [Burn 1]', power_cost=null, might_bonus=null where card_code='ven-002-166';
update cards set rules_text='Kill a gear.[Flow (4)(R)]', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-003-166';
update cards set rules_text='You ignore [Tank] while assigning combat damage here.', power_cost=null, might_bonus=null where card_code='ven-004-166';
update cards set rules_text='If you control fewer runes than an opponent at the start of your Beginning Phase, give me +2 Might and [Ganking] this turn.', power_cost=null, might_bonus=null where card_code='ven-006-166';
update cards set rules_text='[Empower] - Discard 1
[Empowered] I have +1 Might.', power_cost=null, might_bonus=null where card_code='ven-007-166';
update cards set rules_text='[Action] As an additional cost to play this, you may discard 1. Deal 3 to a unit at a battlefield. If you paid the additional cost, deal 5 to it instead.', power_cost=null, might_bonus=null where card_code='ven-008-166';
update cards set rules_text='When I attack, you may pay Fury to give me [Assault 2] this turn.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-009-166';
update cards set rules_text='[Action] Deal 2 to a unit at a battlefield. This deals 1 Bonus Damage for each card with this name in your trash.', power_cost=null, might_bonus=null where card_code='ven-010-166';
update cards set rules_text='[Equip (R)]
When I move to a battlefield, give me +2 Might this turn.', power_cost=null, might_bonus=1 where card_code='ven-011-166';
update cards set rules_text='Ready a unit and give it [Assault 3] this turn. [Flow (3)(R)]', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-012-166';
update cards set rules_text='I enter ready if you have a card with my name in your trash.', power_cost=null, might_bonus=null where card_code='ven-013-166';
update cards set rules_text='[Action] This can''t be countered.Deal 4 to an enemy Calm unit.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-015-166';
update cards set rules_text='[Accelerate] When I move, if you control 4 or fewer runes, draw 1.', power_cost=null, might_bonus=null where card_code='ven-016-166';
update cards set rules_text='[Ambush] When you play me, deal damage to a unit equal to the damage marked on it.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-017-166';
update cards set rules_text='[Empower (6)(R)] Your units have +1 Might. If I''m [Empowered], they have +2 Might instead.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-018-166';
update cards set rules_text='[Accelerate] When I attack, if you control 4 or fewer runes, deal 2 to all enemy units here.', power_cost=null, might_bonus=null where card_code='ven-019a-166';
update cards set rules_text='[Empower (2)(R)] When I move, you may deal 1 to a unit at a battlefield I moved to or from. If I''m [Empowered], deal 2 instead.[Empowered] I have +1 Might.', power_cost=null, might_bonus=null where card_code='ven-021-166';
update cards set rules_text='When you play this, banish your hand and trash, then [Burn 7].Skip your Draw Phase.You may play cards from your trash.If a card would go to your trash from anywhere other than your Main Deck, banish it instead.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-022-166';
update cards set rules_text='You may discard 1 as an additional cost to play me. When you play me, if you paid the additional cost, play a 0 Might Shadow Clone unit token.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-023a-166';
update cards set rules_text='When a combat that I was in ends, if I haven''t been dealt damage this turn, draw 1.', power_cost=null, might_bonus=null where card_code='ven-024-166';
update cards set rules_text='While you control 7 or more runes, prevent all damage that enemy spells and abilities would deal to me.', power_cost=null, might_bonus=null where card_code='ven-025-166';
update cards set rules_text='When you play me, give a unit +3 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-026-166';
update cards set rules_text='[Equip (G)]
I have +2 Might while I''m at a battlefield with exactly one other unit you control.', power_cost=null, might_bonus=1 where card_code='ven-027-166';
update cards set rules_text='When a combat that I was in ends, empower me. [Empowered] I have +2 Might.', power_cost=null, might_bonus=null where card_code='ven-028-166';
update cards set rules_text='I can''t be played on your first, second, or third turns.', power_cost=null, might_bonus=null where card_code='ven-029-166';
update cards set rules_text='Give a friendly unit +1 Might this turn. It can''t be chosen by enemy spells and abilities this turn.[Flow (2)]', power_cost=null, might_bonus=null where card_code='ven-031-166';
update cards set rules_text='When I move, reveal the top card of your Main Deck. If it''s a unit, draw it. Otherwise, put it in your trash and give me +2 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-033-166';
update cards set rules_text='[Hidden] [Reaction] Choose a battlefield you control and a unit you control at a different location. Move that unit to that battlefield and give it +2 Might this turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-034-166';
update cards set rules_text='[Reaction] Choose one - Empower a unit. Disempower it at end of turn. Disempower a unit that''s [Empowered]. Empower it at end of turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-035-166';
update cards set rules_text='While I''m at a battlefield, players only channel 1 rune at the start of their Channel Phase.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-036-166';
update cards set rules_text='When you play me, if you control 7 or more runes, choose an enemy gear. If it''s [Empowered], disempower it. Otherwise, kill it.', power_cost=null, might_bonus=null where card_code='ven-037-166';
update cards set rules_text='I can''t be chosen by enemy spells and abilities unless I''m in combat.When I move to a battlefield, give me +2 Might this turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-038-166';
update cards set rules_text='[Reaction] Counter a spell if an opponent has played another spell this turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-039-166';
update cards set rules_text='[Reaction] Choose a friendly unit that''s in combat with an enemy Fury unit or that''s being chosen by an enemy Fury spell. Give it +4 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-040-166';
update cards set rules_text='[Weaponmaster] When I attack, choose an enemy unit here. Deal 2 to it for each Equipment attached to me.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-041-166';
update cards set rules_text='When I hold, if there is exactly one other unit you control here, draw 1.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-042-166';
update cards set rules_text='[Deflect] [Empower (7)] [Empowered] I have +7 Might.', power_cost=null, might_bonus=null where card_code='ven-043-166';
update cards set rules_text='When you play your first card each turn, if I''m at a battlefield, the next card you play this turn costs (2)(Any)(Any) less.', power_cost=null, might_bonus=null where card_code='ven-044-166';
update cards set rules_text='[Empower (4)(G)] Opponents'' spells cost (1) more. If this is [Empowered], they cost (1)(Any) more instead.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-045-166';
update cards set rules_text='[Deflect 2] [Empower (8)] [Empowered] When I conquer, you score 1 point.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-046-166';
update cards set rules_text='[Empower (2)] When I become [Empowered], [Predict 2]. [Empowered] I have +1 Might.', power_cost=null, might_bonus=null where card_code='ven-047-166';
update cards set rules_text='When you play me, draw 1.', power_cost=null, might_bonus=null where card_code='ven-048-166';
update cards set rules_text='Draw 1.[Flow (2)]', power_cost=null, might_bonus=null where card_code='ven-049-166';
update cards set rules_text='Play a 3 Might Mech unit token.[Flow (2)(B)]', power_cost=null, might_bonus=null where card_code='ven-051-166';
update cards set rules_text='[Reaction] Choose one -Return a friendly unit to its owner''s hand.Give an enemy unit -2 Might this turn.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-052-166';
update cards set rules_text='If a player would score 1 point from conquering or holding during their first or second turn, they draw 1 instead.', power_cost=null, might_bonus=null where card_code='ven-053-166';
update cards set rules_text='[Empower] - [Tap] Disempower this, (1), [Tap]: Draw 1.', power_cost=null, might_bonus=null where card_code='ven-054-166';
update cards set rules_text='[Empower (3)] [Empowered] Your spells cost (1)(Any) less, to a minimum of (1).', power_cost=null, might_bonus=null where card_code='ven-055-166';
update cards set rules_text='[Reaction] [Predict 5] Draw 2.', power_cost=null, might_bonus=null where card_code='ven-056-166';
update cards set rules_text='When you play me, if you control 3 or more other gear, draw 1.', power_cost=null, might_bonus=null where card_code='ven-058-166';
update cards set rules_text='Discard a gear, (1), [Tap]: Deal 4 to a unit at a battlefield.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-060-166';
update cards set rules_text='[Reaction] Ignore [Deflect] while paying this spell''s cost. Give an enemy Body unit -5 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-061-166';
update cards set rules_text='This enters exhausted.[Tap]: Empower another gear.', power_cost=null, might_bonus=null where card_code='ven-062-166';
update cards set rules_text='Once each turn, when an enemy unit here dies, channel 1 rune exhausted.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-063a-166';
update cards set rules_text='I cost (1) less for each gear you control.[Deflect]', power_cost=null, might_bonus=null where card_code='ven-064-166';
update cards set rules_text='[Hidden] Banish a unit, then its owner plays it to the same location, ignoring its cost.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-066-166';
update cards set rules_text='At the start of your Main Phase, you may kill 3 other friendly units and/or gear to score 1 point.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-067-166';
update cards set rules_text='When you play me or the first time you play a non-token gear each turn, you may ready something besides me that''s exhausted.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-068-166';
update cards set rules_text='When you play me, draw 1.[Empower (3)] [Empowered] Your spells and abilities can''t be countered. If a spell or ability you control would give -Might to a unit it chooses, it gives an additional -1 Might.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-069a-166';
update cards set rules_text='[Empower (3)] [Empowered] I have +2 Might and [Ganking].', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ven-070-166';
update cards set rules_text='When I become ready, give me +2 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-071-166';
update cards set rules_text='[Equip (O)]
I can''t be moved by enemy spells and abilities.', power_cost=null, might_bonus=2 where card_code='ven-073-166';
update cards set rules_text='[Empower (2)] [Tap]: Give a unit +2 Might this turn. If this is [Empowered], give that unit +4 Might this turn instead.', power_cost=null, might_bonus=null where card_code='ven-077-166';
update cards set rules_text='[Empower (5)(O)] [Empowered] When I attack or defend, choose a unit here. Increase my Might to its Might this turn, then give me +1 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-079-166';
update cards set rules_text='When I conquer, you may kill a gear with Energy cost no more than my Might.', power_cost=null, might_bonus=null where card_code='ven-080-166';
update cards set rules_text='Give a unit +6 Might this turn.[Flow (4)]', power_cost=null, might_bonus=null where card_code='ven-081-166';
update cards set rules_text='When you play me, you may disempower something you control to empower a legend, unit, or gear.', power_cost=null, might_bonus=null where card_code='ven-082-166';
update cards set rules_text='As you play this, you may pay (O) as an additional cost.Choose a friendly unit and an enemy unit. If you paid the additional cost, give the friendly unit +2 Might this turn. They deal damage equal to their Mights to each other.', power_cost=null, might_bonus=null where card_code='ven-083-166';
update cards set rules_text='[Empower (3)(O)] [Empowered] I have +3 Might and can''t be dealt damage unless I''m in combat.', power_cost=null, might_bonus=null where card_code='ven-084-166';
update cards set rules_text='[Empower (O)(O)]
[Empowered] If a spell or ability that chooses me would stun me, give me -Might, or return me to hand, give me +3 Might this turn instead.', power_cost=null, might_bonus=null where card_code='ven-086-166';
update cards set rules_text='[Empower] - [Tap] Disempower this, (1), [Tap]: Play a 3 Might Mech unit token to your base.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ven-087-166';
update cards set rules_text='When I become ready, choose one to give me this turn -[Assault 2] [Deflect 2] [Ganking]', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ven-088-166';
update cards set rules_text='Look at the top 5 cards of your Main Deck. You may banish a unit or gear from among them and play it, reducing its Energy cost by (5). Recycle the rest. Then you may do this: Empower it.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ven-089-166';
update cards set rules_text='Each player chooses a unit they control. Kill the rest.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ven-090-166';
update cards set rules_text='If your score is not within 3 points of the Victory Score, I enter ready.When I attack, you may move any number of enemy units here each with 5 Might or less to their base.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ven-091-166';
update cards set rules_text='(1): Give me +1 Might this turn.When my Might becomes 10 or more, empower me. [Empowered] I have [Deflect] and [Ganking].', power_cost=null, might_bonus=null where card_code='ven-092-166';
update cards set rules_text='[Empower (2)] [Empowered] I have +1 Might and [Ganking].', power_cost=null, might_bonus=null where card_code='ven-093-166';
update cards set rules_text='When I move, you may [Burn 1] to give me +1 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-095-166';
update cards set rules_text='I cost (2) less for each card with my name in your trash.', power_cost=null, might_bonus=null where card_code='ven-096-166';
update cards set rules_text='[Hidden] I have +1 Might for each other unit you control here with my name.Your deck can have any number of cards named Spiderling.', power_cost=null, might_bonus=null where card_code='ven-097-166';
update cards set rules_text='Spells with [Flow] you play from your trash cost (2) less, to a minimum of (1).', power_cost=null, might_bonus=null where card_code='ven-098-166';
update cards set rules_text='Play two 1 Might Tentacle unit tokens from Bilgewater.[Flow (3)]', power_cost=null, might_bonus=null where card_code='ven-100-166';
update cards set rules_text='You may pay 1 Energy as an additional cost to play me.When you play me, if you paid the additional cost, banish a card from any trash to give a unit [Assault 2] this turn.', power_cost=null, might_bonus=null where card_code='ven-101-166';
update cards set rules_text='When an opponent plays a gear, you may banish me to banish it.', power_cost=null, might_bonus=null where card_code='ven-102-166';
update cards set rules_text='Return up to 2 units from trashes to their owners'' hands.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-103-166';
update cards set rules_text='[Empower (2)(P)] When I become [Empowered], you may choose a unit in your trash with Energy cost no more than (3) and Power cost no more than (Any). Play it to your base, ignoring its cost.', power_cost=null, might_bonus=null where card_code='ven-104-166';
update cards set rules_text='Move a unit with 3 Might or less.[Flow (4)(P)]', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-105-166';
update cards set rules_text='[Action] Choose a unit at a battlefield. If it has 3 Might or less, banish it. Otherwise, return it to its owner''s hand.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-106-166';
update cards set rules_text='Return any number of enemy Order units with total Might 5 or less to their owners'' hands.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-107-166';
update cards set rules_text='When you play this or at the start of your Beginning Phase, [Burn 1]. When you burn a unit this way, do this: Give a friendly unit +Might equal to the burned card''s Might this turn.', power_cost=null, might_bonus=null where card_code='ven-108-166';
update cards set rules_text='When you play me or when I score, play a 1 Energy Might Tentacle unit token from Bilgewater.I have +1 Might for each token unit you control.', power_cost=null, might_bonus=null where card_code='ven-109-166';
update cards set rules_text='[Empower] - Discard a spell When I become [Empowered], banish an enemy unit at a battlefield with 3 Might or less.', power_cost=null, might_bonus=null where card_code='ven-110-166';
update cards set rules_text='When I conquer, play a 0 Might Shadow Clone unit token to your base. [Action (1)(P)]: Move me and a Shadow Clone you control to each other''s locations.', power_cost=null, might_bonus=null where card_code='ven-112a-166';
update cards set rules_text='When you play me, [Burn 2]. When I conquer, give a spell in your trash [Flow] equal to its cost this turn.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-113a-166';
update cards set rules_text='[Empower (6)(P)(P)] When I become [Empowered], choose an opponent. They [Burn 3]. Then you may do this: Choose a unit in their trash and play it, ignoring its cost.', power_cost=null, might_bonus=null where card_code='ven-114-166';
update cards set rules_text='You may play me to an open battlefield.When you play me, you may return a non-Dragon unit to its owner''s hand.', power_cost='[{"kind":"domain","domain":"Chaos"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-115-166';
update cards set rules_text='Choose a unit. Its base Might becomes 5 this turn.[Flow (3)]', power_cost=null, might_bonus=null where card_code='ven-116-166';
update cards set rules_text='[Hidden] I have [Shield 3] while I''m at a battlefield with exactly one other unit you control.', power_cost=null, might_bonus=null where card_code='ven-117-166';
update cards set rules_text='[Tank]', power_cost=null, might_bonus=null where card_code='ven-118-166';
update cards set rules_text='I cost (2)(Y) less if you control a battlefield with exactly two units there.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-119-166';
update cards set rules_text='You may pay (Y) as an additional cost to play me.When you play me, if you paid the additional cost, [Stun] an enemy unit at a battlefield.', power_cost=null, might_bonus=null where card_code='ven-120-166';
update cards set rules_text='When you play another unit, give me +2 Might this turn.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-121-166';
update cards set rules_text='[Empower] - Kill a friendly unit [Empowered] I have +2 Might.', power_cost=null, might_bonus=null where card_code='ven-124-166';
update cards set rules_text='(Y): Ready me and give me +1 Might this turn. Use only if you''ve chosen an enemy unit this turn and only once each turn.', power_cost=null, might_bonus=null where card_code='ven-125-166';
update cards set rules_text='[Reaction] Choose a unit. Prevent the next 7 damage that would be dealt to it this turn.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-126-166';
update cards set rules_text='Choose a unit. If it''s [Empowered], disempower it. Then kill it if it has 3 Might or less.[Flow (4)(Y)(Y)]', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-127-166';
update cards set rules_text='[Empower (1)(Y)] [Empowered] [Deathknell] Play two 1 Might Recruit unit tokens to your base.', power_cost=null, might_bonus=null where card_code='ven-128-166';
update cards set rules_text='I don''t deal combat damage unless I''m at a battlefield with exactly one other unit you control.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-129-166';
update cards set rules_text='When you play me, name a spell.While I''m at a battlefield, opponents can''t play spells with that name.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-132-166';
update cards set rules_text='[Empower (Any)(Any)] Disempower this, [Tap]: Choose a player. They gain control of this and recall it. At the end of your turn, kill this and deal 5 to all units you control.', power_cost=null, might_bonus=null where card_code='ven-133-166';
update cards set rules_text='[Empower (3)] I can be [Empowered] up to three times.I have +2 Might for each time I''m [Empowered].While I''m [Empowered] three times, I have [Deflect 3] and [Ganking].', power_cost=null, might_bonus=null where card_code='ven-134-166';
update cards set rules_text='[Hidden] When you play me or I attack, you may pay 2 Energy to [Stun] a unit. While there''s a stunned enemy unit here, I have +2 Might.', power_cost=null, might_bonus=null where card_code='ven-135-166';
update cards set rules_text='[Empower (1)(Y)(Y)] [Empowered] I have [Assault 2]. [Empowered] When I attack, kill an enemy unit here with less Might than me.', power_cost=null, might_bonus=null where card_code='ven-136-166';
update cards set rules_text='[Equip (1)(Y)] As this is attached to a unit, choose another friendly unit. The equipped unit becomes a copy of that unit for as long as this is attached to it.', power_cost=null, might_bonus=0 where card_code='ven-137-166';
update cards set rules_text='[Shield 1] When I hold, if there is exactly one other unit you control here, you score 1 point.', power_cost='[{"kind":"domain","domain":"Order"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-138-166';
update cards set rules_text='[Empower (3)(Any)] [Action] [Tap]: If it''s your turn, move a friendly unit in a showdown to base and if I''m [Empowered], ready it.', power_cost=null, might_bonus=null where card_code='ven-139-166';
update cards set rules_text='Deal 2 to up to one enemy unit at a battlefield, then move a friendly unit.[Flow (3)(Any)]', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='ven-140-166';
update cards set rules_text='[Reaction] (Any)(Any), [Tap]: [Add (2)]. Spend this Energy only to play units or activated abilities of units.', power_cost=null, might_bonus=null where card_code='ven-141-166';
update cards set rules_text='[Action] This turn, double a unit''s Might and give it "(Any)(Any): Ready me."', power_cost=null, might_bonus=null where card_code='ven-142-166';
update cards set rules_text='When you banish a card you own, empower me. [Action] Disempower me, [Tap]: Discard 1, then draw 1.', power_cost=null, might_bonus=null where card_code='ven-143-166';
update cards set rules_text='[Burn 3]. Play a 0 Might Shadow Clone unit token. [Flow (1)(Any)(Any)]', power_cost='[{"kind":"domain","domain":"Fury"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-144-166';
update cards set rules_text='When you play a unit, gear, or activated ability with Energy cost (7) or more, you may exhaust me to ready up to 2 runes.', power_cost=null, might_bonus=null where card_code='ven-145-166';
update cards set rules_text='Deal 4 to a unit at a battlefield. If you control 7 or more runes, deal 7 to it instead. When it dies this turn, channel 1 rune exhausted.', power_cost=null, might_bonus=null where card_code='ven-146-166';
update cards set rules_text='[Action] [Tap]: Give a friendly unit [Tank] this turn.', power_cost=null, might_bonus=null where card_code='ven-147-166';
update cards set rules_text='Move an enemy unit to a battlefield where you have units. If you have exactly two units there, they each get +1 Might this turn.[Flow (5)(Any)(Any)]', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-148-166';
update cards set rules_text='[Empower (2)(Any)(Any)] (1), [Tap]: Ready a gear.[Empowered] (1), [Tap]: Ready 2 gear.', power_cost=null, might_bonus=null where card_code='ven-149-166';
update cards set rules_text='Ready up to 4 units, gear, and/or runes.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ven-150-166';
update cards set rules_text='When you empower something else, empower me. Disempower me, [Tap]: Give a unit at a battlefield -2 Might this turn.', power_cost=null, might_bonus=null where card_code='ven-151-166';
update cards set rules_text='[Reaction] Choose a spell with Energy cost no more than (4). You may pay (Any). If you do, gain control of it and you may make new choices for it. Otherwise, counter it.', power_cost='[{"kind":"domain","domain":"Mind"},{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ven-152-166';
update cards set rules_text='When you empower something else, empower me. Disempower me, (Any), [Tap]: Ready a unit.', power_cost=null, might_bonus=null where card_code='ven-153-166';
update cards set rules_text='Choose a friendly unit. Kill an enemy unit with less Might than it.[Flow (5)(Any)(Any)]', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ven-154-166';
update cards set rules_text='When you play a card from anywhere other than your hand, empower me. 
[Action] Disempower me, [Tap]: Give a unit [Assault 2] this turn.', power_cost=null, might_bonus=null where card_code='ven-155-166';
update cards set rules_text='Look at the top 3 cards of your Main Deck. You may choose a card from among them and draw it. Put the rest into your trash.[Flow (2)(Any)]', power_cost=null, might_bonus=null where card_code='ven-156-166';
update cards set rules_text='Any player may pay AnyAny as an additional cost to play a Dragon. If they do, they play it to this battlefield.', power_cost=null, might_bonus=null where card_code='ven-157-166';
update cards set rules_text='Players ignore [Deflect] while paying for spells and abilities choosing something here.', power_cost=null, might_bonus=null where card_code='ven-158-166';
update cards set rules_text='Units here with [Tank] have +1 Might.', power_cost=null, might_bonus=null where card_code='ven-159-166';
update cards set rules_text='During showdowns here, cards with [Reaction] cost (Any) more to play.', power_cost=null, might_bonus=null where card_code='ven-160-166';
update cards set rules_text='While you control this battlefield, the first friendly gear activated ability played each turn costs (1) less.', power_cost=null, might_bonus=null where card_code='ven-161-166';
update cards set rules_text='When you conquer here, if you control 4 or fewer runes, you may pay 1 Energy to draw 1.', power_cost=null, might_bonus=null where card_code='ven-162-166';
update cards set rules_text='[Empower] costs of your units here cost (1) or (Any) less.', power_cost=null, might_bonus=null where card_code='ven-163-166';
update cards set rules_text='Each spell that chooses one or more units here that are friendly to it costs Any less.', power_cost=null, might_bonus=null where card_code='ven-164-166';

-- 4. Insert the 25 cards absent from the Riftcodex load.
--    Expected to be the 25 Vendetta cards from the known snapshot gap.
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-001-166','Baccai Sandspinner','{"Unit"}','{}','{}','{"Fury"}',6,null,6,null,false,'[Empower (5)] This ability costs (3) less if you control 4 or fewer runes.
[Empowered] I have [Deflect] and [Assault 2].');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-005-166','Forsaken Baccai','{"Unit"}','{}','{}','{"Fury"}',2,null,2,null,false,'If you control fewer runes than an opponent at the start of your Beginning Phase, give me +1 Might this turn.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-014-166','Shadow Fiend','{"Unit"}','{}','{}','{"Fury"}',2,null,2,null,false,'[Empower (2) (R)]
[Empowered] I have [Assault 3]');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-020-166','Twilight Reveler','{"Unit"}','{}','{}','{"Fury"}',3,null,3,null,false,'When I attack, ready another friendly unit.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-030-166','Serene Ascetic','{"Unit"}','{}','{}','{"Calm"}',3,null,3,null,false,'[Empower (3)]
[Empowered] I have [Deflect] and [Shield 3]');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-032-166','Frostcoat Mother','{"Unit"}','{}','{}','{"Calm"}',3,null,3,null,false,'[Empower (12)]
[Empowered] I have +3 .');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-050-166','Grumpy Rockbear','{"Unit"}','{}','{}','{"Mind"}',4,null,4,null,false,'[Empower (12)]
[Empowered] I have [Deflect] and [Shield 3]');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-057-166','Covert Informant','{"Unit"}','{}','{}','{"Mind"}',3,'[{"kind":"domain","domain":"Mind"}]'::jsonb,4,null,false,'[Empower (3)] 
[Empowered] When I move, draw 1.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-059-166','Shock Blast','{"Spell"}','{}','{}','{"Mind"}',3,'[{"kind":"domain","domain":"Mind"}]'::jsonb,null,null,false,'[Action] This costs (2) less if you control something that''s [Empowered].
Deal 4 to a unit at a battlefield.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-065-166','Swain, Visionary','{"Unit"}','{}','{}','{"Mind"}',6,'[{"kind":"domain","domain":"Mind"}]'::jsonb,6,null,false,'[Vision] When I conquer, if you''ve played a non-token unit, a non-token gear, and a spell this turn, you score 1 point.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-072-166','Guttural Roar','{"Spell"}','{}','{}','{"Body"}',2,null,null,null,false,'[Action] Give a unit +2 Might this turn. If it''s [Empowered], give it +4 Might this turn instead.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-074-166','Legion Marauder','{"Unit"}','{}','{}','{"Body"}',2,null,2,null,false,'[Empower (1) OR (O)]
[Empowered] I have +1 .');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-075-166','Platewyrm Egg','{"Gear"}','{}','{}','{"Body"}',3,null,null,null,false,'This enters exhausted.
[Empower (1)[Tap]]
[Reaction] [Tap]: [Add] (1). If this is [Empowered], [Add] (2) instead.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-076-166','Repair Specialist','{"Unit"}','{}','{}','{"Body"}',3,null,3,null,false,'I have [Assault 1] equal to the number of gear you control.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-078-166','Baccai Witherclaw','{"Unit"}','{}','{}','{"Body"}',4,null,4,null,false,'[Empower (1)(Any)(Any)]
[Empowered] I have +2 Might.
[Empowered][Deathknell] Channel 2 runes exhausted.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-085-166','Decree of Strength','{"Spell"}','{}','{}','{"Body"}',1,null,null,null,false,'Choose an opponent. They reveal their hand and you choose a Mind (B) card from it. They recycle that card.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-094-166','Mask Mother','{"Unit"}','{}','{}','{"Chaos"}',3,null,3,null,false,'When you discard me, you may pay (1) to give a friendly unit +2 Might this turn.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-099-166','Tornado Warrior','{"Unit"}','{}','{}','{"Chaos"}',3,null,3,null,false,'[Hidden] When you play me from face down, you may empower something here. Disempower it at end of turn.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-111-166','Minah Swiftfoot','{"Unit"}','{}','{}','{"Chaos"}',6,'[{"kind":"domain","domain":"Chaos"}]'::jsonb,6,null,false,'When I move to a battlefield, choose one: 
Each player discards 1.
Each player draws 1.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-122-166','Solari Sunhawk','{"Unit"}','{}','{}','{"Order"}',3,null,3,null,false,'[Empower (2)]
[Empowered] I have +1 Might and [Deflect 2].');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-123-166','Soulspinner','{"Unit"}','{}','{}','{"Order"}',3,null,3,null,false,'[Ambush]');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-130-166','Aurok General','{"Unit"}','{}','{}','{"Order"}',5,null,5,null,false,'[Empower (3)(Y)]
[Empowered] Your units that are [Empowered] have +2 Might (including me).');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-131-166','Decree of Unity','{"Spell"}','{}','{}','{"Order"}',2,'[{"kind":"domain","domain":"Order"}]'::jsonb,null,null,false,'Kill an enemy Chaos (P) unit or gear.');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-165-166','Shadow Temple','{"Battlefield"}','{}','{}','{}',null,null,null,null,false,'When you hold here, [Burn 3].');
insert into cards (card_code,name,card_type,supertypes,tags,domains,energy_cost,power_cost,might,might_bonus,is_token,rules_text) values ('ven-166-166','Threshold of the Gray','{"Battlefield"}','{}','{}','{}',null,null,null,null,false,'When combat starts here, the attacker and defender each [Add] (1) .');

--    Matching printings. The CSV has no variant rows, so each gets one base printing.
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-001-166','ven-001-166','VEN','001','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-005-166','ven-005-166','VEN','005','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-014-166','ven-014-166','VEN','014','Uncommon',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-020-166','ven-020-166','VEN','020','Rare',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-030-166','ven-030-166','VEN','030','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-032-166','ven-032-166','VEN','032','Uncommon',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-050-166','ven-050-166','VEN','050','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-057-166','ven-057-166','VEN','057','Uncommon',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-059-166','ven-059-166','VEN','059','Uncommon',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-065-166','ven-065-166','VEN','065','Rare',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-072-166','ven-072-166','VEN','072','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-074-166','ven-074-166','VEN','074','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-075-166','ven-075-166','VEN','075','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-076-166','ven-076-166','VEN','076','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-078-166','ven-078-166','VEN','078','Uncommon',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-085-166','ven-085-166','VEN','085','Rare',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-094-166','ven-094-166','VEN','094','Uncommon',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-099-166','ven-099-166','VEN','099','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-111-166','ven-111-166','VEN','111','Rare',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-122-166','ven-122-166','VEN','122','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-123-166','ven-123-166','VEN','123','Common',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-130-166','ven-130-166','VEN','130','Rare',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-131-166','ven-131-166','VEN','131','Rare',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-165-166','ven-165-166','VEN','165','Uncommon',false,'base',null);
insert into card_printings (printing_code,card_code,set_code,collector_number,rarity,is_overnumbered,printing_variant,image_url) values ('ven-166-166','ven-166-166','VEN','166','Uncommon',false,'base',null);

-- 5. Rebuild card_bans to the corrected 11-row list (adjudication section 2).
--    All bans are Constructed: per TR 602.1.b constructed-banned cards stay
--    limited-legal, so format='constructed' on every row.
delete from card_bans;
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-03-31' from cards where name = 'Called Shot';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-03-31' from cards where name = 'Draven, Vanquisher';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-03-31' from cards where name = 'Fight or Flight';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-03-31' from cards where name = 'Scrapheap';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-03-31' from cards where name = 'The Dreaming Tree';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-03-31' from cards where name = 'Obelisk of Power';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-03-31' from cards where name = 'Reaver''s Row';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-07-24' from cards where name = 'Stealthy Pursuer';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-07-24' from cards where name = 'The Arena''s Greatest';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', null, date '2026-07-24' from cards where name = 'Aspirant''s Climb';
insert into card_bans (card_code, format, mode, effective_date)
select card_code, 'constructed', 'magma_chamber', date '2026-07-24' from cards where name = 'Master Yi, Wuju Bladesman';

-- 6. Assertions. Any failure rolls back the entire migration.
do $$
declare n int;
begin
  select count(*) into n from card_bans;
  if n <> 11 then raise exception 'card_bans has %, expected 11. A name failed to match.', n; end if;
  select count(*) into n from cards where power_cost is not null;
  if n = 0 then raise exception 'power_cost backfill wrote nothing'; end if;
  select count(*) into n from cards where might_bonus is not null;
  if n <> 36 then raise exception 'might_bonus populated on %, expected 36', n; end if;
end $$;

commit;
