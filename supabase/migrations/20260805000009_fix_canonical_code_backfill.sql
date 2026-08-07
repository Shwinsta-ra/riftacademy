-- RiftAcademy Supabase - Migration 009: repair 40 rows missed by migration 008
--
-- DEFECT, M9's own: migration 008's generator reconstructed each card's canonical
-- card_code WITHOUT the base-printing tiebreak that the original seed loader used.
-- The seed sorts printings by (set order, collector number, base-before-variant);
-- the 008 generator omitted the third key. Where a base printing and an alt-art
-- printing share a collector number (ven-019-166 vs ven-019a-166), 008 targeted the
-- alt-art code, which is a printing_code and never a card_code.
--
-- Those UPDATE statements matched ZERO rows and reported no error, because a WHERE
-- clause matching nothing is not a failure in SQL. 40 cards therefore kept their
-- pre-errata rules_text and null power_cost. Confirmed by the row count: 929 - 579
-- null power_cost = 350 populated, against 374 expected. The 24-row gap is exactly
-- the subset of these 40 that carry a power cost.
--
-- Diana, Lunari is among the 40, which is why the errata assertions report 6/7.
--
-- LESSON: a backfill keyed on a DERIVED identifier must assert its match count.
-- The assertions in 008 checked totals, not that each update found its target.
-- This migration asserts per-statement using a row-count check on the affected set.

begin;

update cards set rules_text='(G): [Action] - Choose a unit you control. Move me to its location and it to my original location. If it''s equipped, you may attach one of its Equipment to me. Use only once per turn.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-050-221';
update cards set rules_text='[Accelerate (1)(Y)] When I attack, you may move any number of your token units to this battlefield.', power_cost=null, might_bonus=null where card_code='sfd-177-221';
update cards set rules_text='[Shield 2] Your hold effects for holding here trigger an additional time.
When I hold, [Add (Any)] at the start of your next Main Phase.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='unl-087-219';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-166-298';
update cards set rules_text='When a showdown begins here, you may pay (1) to [Predict], then reveal the top card of your Main Deck. If it''s a spell, draw it.', power_cost=null, might_bonus=null where card_code='unl-079-219';
update cards set rules_text='[Ambush] When you play a spell, give me +2 Might this turn.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-149-219';
update cards set rules_text='[Deflect (Any)] The first time I win a combat each turn, you score 1 point.
When I die in combat, choose an opponent. They score 1 point.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='sfd-148-221';
update cards set rules_text='When I attack or defend, deal damage equal to my Might to an enemy unit here.
I don''t deal combat damage.
(B): [Action] - Move me to your base.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='sfd-082-221';
update cards set rules_text='When a unit you control becomes [Mighty], you may pay (Y) to ready it.', power_cost=null, might_bonus=null where card_code='sfd-180-221';
update cards set rules_text='-', power_cost=null, might_bonus=null where card_code='ogn-007-298';
update cards set rules_text='As you play me, choose Bird, Cat, Dog, or Poro. I gain that tag.
When I conquer or hold, score 1 point if your units have all of the following tags among them - Bird, Cat, Dog, and Poro.', power_cost=null, might_bonus=null where card_code='unl-177-219';
update cards set rules_text='[Deflect (Any)] [Ganking] When I move, [Add (1)(Any)].', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-022-219';
update cards set rules_text='[Ambush] When I attack or defend, if an enemy unit is alone here, give me +2 Might this turn and gain 2 XP.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='unl-143-219';
update cards set rules_text='[Accelerate (1)(O)] Other buffed friendly units at my battlefield have +2 Might.', power_cost=null, might_bonus=null where card_code='ogn-151-298';
update cards set rules_text='When you play a token unit, give me +1 Might this turn.
Your token units have [Tank].', power_cost=null, might_bonus=null where card_code='unl-058-219';
update cards set rules_text='[Assault 1] When I attack, deal damage equal to my [Assault] to an enemy unit here.', power_cost=null, might_bonus=null where card_code='sfd-028-221';
update cards set rules_text='[Weaponmaster (Any)] The first time I conquer each turn, ready me.', power_cost=null, might_bonus=null where card_code='sfd-113-221';
update cards set rules_text='When you play me, draw 1.[Empower (3)] [Empowered] Your spells and abilities can''t be countered. If a spell or ability you control would give -Might to a unit it chooses, it gives an additional -1 Might.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-069-166';
update cards set rules_text='[Accelerate (1)(O)] [Ganking] The first time I move each turn, you may ready something else that''s exhausted.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='ogn-162-298';
update cards set rules_text='Once each turn, when an enemy unit here dies, channel 1 rune exhausted.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ven-063-166';
update cards set rules_text='When you play me or when I hold, look at the top 4 cards of your Main Deck. You may reveal a gear from among them and draw it. Then recycle the rest.', power_cost='[{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='sfd-058-221';
update cards set rules_text='[Deflect 2 (Any)(Any)] [Weaponmaster (Any)] I have +1 Might for each friendly gear.', power_cost=null, might_bonus=null where card_code='sfd-085-221';
update cards set rules_text='You may spend 3 XP as an additional cost to play me. If you do, I cost (3) less.
[Ambush] [Tank]', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-178-219';
update cards set rules_text='[Accelerate (1)(R)] Your conquer effects for conquering here trigger an additional time.
When I conquer, [Buff] a friendly unit.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-029-219';
update cards set rules_text='Your tokens enter ready.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='sfd-171-221';
update cards set rules_text='(1)(B): Draw 1.
(4)(B)(B)(B)(B), [Tap]: Score 1 point.
Use my abilities only while I''m at a battlefield.', power_cost=null, might_bonus=null where card_code='sfd-088-221';
update cards set rules_text='[Accelerate] When I attack, if you control 4 or fewer runes, deal 2 to all enemy units here.', power_cost=null, might_bonus=null where card_code='ven-019-166';
update cards set rules_text='[Ambush] I can [Ambush] to a battlefield where there are enemy units, even if you don''t have units there.', power_cost='[{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='unl-120-219';
update cards set rules_text='[Accelerate (1)(R)] [Assault 2] [Deflect (Any)] [Ganking]', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='unl-024-219';
update cards set rules_text='Your Mechs each have [Assault 1].
When I conquer, you may recycle another friendly unit to play a Mech from your trash. Reduce its Energy cost by the Might of the unit you recycled.', power_cost=null, might_bonus=null where card_code='sfd-026-221';
update cards set rules_text='[Tank] I get +1 Might for each buffed friendly unit at my battlefield.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='ogn-240-298';
update cards set rules_text='[Deflect 2 (Any)(Any)] When I conquer after an attack, if you assigned 5 or more excess damage to enemy units, you may deal that much to an enemy unit.', power_cost='[{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"},{"kind":"domain","domain":"Body"}]'::jsonb, might_bonus=null where card_code='sfd-120-221';
update cards set rules_text='[Hidden (Any)] When I defend, choose an enemy unit here and reveal the top 5 cards of your Main Deck. Deal 1 to that unit for each card with [Hidden] revealed this way, then recycle the revealed cards.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-121-298';
update cards set rules_text='[Deflect (Any)] (2)(R): Double my Might this turn.', power_cost=null, might_bonus=null where card_code='unl-030-219';
update cards set rules_text='[Ambush] When I attack, [Stun] an enemy unit here.', power_cost='[{"kind":"domain","domain":"Order"}]'::jsonb, might_bonus=null where card_code='unl-176-219';
update cards set rules_text='When you play a card on an opponent''s turn, play a 1 Might Recruit unit token in your base.', power_cost='[{"kind":"domain","domain":"Mind"}]'::jsonb, might_bonus=null where card_code='ogn-117-298';
update cards set rules_text='[Ambush] Enemy units here with less Might than me don''t deal combat damage.
When I hold, draw 1.', power_cost='[{"kind":"domain","domain":"Calm"},{"kind":"domain","domain":"Calm"}]'::jsonb, might_bonus=null where card_code='unl-060-219';
update cards set rules_text='[Ganking] The third time I move in a turn, you score 1 point.', power_cost='[{"kind":"domain","domain":"Chaos"}]'::jsonb, might_bonus=null where card_code='ogn-205-298';
update cards set rules_text='You may discard 1 as an additional cost to play me. When you play me, if you paid the additional cost, play a 0 Might Shadow Clone unit token.', power_cost='[{"kind":"domain","domain":"Fury"}]'::jsonb, might_bonus=null where card_code='ven-023-166';
update cards set rules_text='When I conquer, play a 0 Might Shadow Clone unit token to your base. [Action (1)(P)]: Move me and a Shadow Clone you control to each other''s locations.', power_cost=null, might_bonus=null where card_code='ven-112-166';

-- Assertion: every one of these card_codes must exist and now carry rules_text.
do $$
declare missing int; pw int;
begin
  select count(*) into missing from (values ('sfd-050-221'),('sfd-177-221'),('unl-087-219'),('ogn-166-298'),('unl-079-219'),('unl-149-219'),('sfd-148-221'),('sfd-082-221'),('sfd-180-221'),('ogn-007-298'),('unl-177-219'),('unl-022-219'),('unl-143-219'),('ogn-151-298'),('unl-058-219'),('sfd-028-221'),('sfd-113-221'),('ven-069-166'),('ogn-162-298'),('ven-063-166'),('sfd-058-221'),('sfd-085-221'),('unl-178-219'),('unl-029-219'),('sfd-171-221'),('sfd-088-221'),('ven-019-166'),('unl-120-219'),('unl-024-219'),('sfd-026-221'),('ogn-240-298'),('sfd-120-221'),('ogn-121-298'),('unl-030-219'),('unl-176-219'),('ogn-117-298'),('unl-060-219'),('ogn-205-298'),('ven-023-166'),('ven-112-166')) as t(code) where not exists (select 1 from cards where card_code = t.code);
  if missing > 0 then raise exception '% of the targeted card_codes do not exist in cards', missing; end if;
  select count(*) into pw from cards where power_cost is not null;
  if pw <> 374 then raise exception 'power_cost populated on %, expected 374', pw; end if;
end $$;

commit;
