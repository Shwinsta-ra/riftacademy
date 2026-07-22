# RiftCoach Pre-Rift Playbook: Vendetta

Owner: RiftCoach (M4), personal-strategy layer. Sessions: Friday July 24 and Monday July 27, 2026. Rev. 2 — 2026-07-21. Supersedes v1.

Purpose: a single printable reference for the Vendetta Pre-Rift. Covers the format and rules, the three new mechanics, the full rule-changes summary, an on-sight card-evaluation rubric, domain scouting, a nine-Legend quick reference, the day-by-day prep plan, and a Vendetta-only Zed Burn/Flow rep deck. Everything is grounded in the project card data plus official and coach sources (cited inline).

What changed from v1: the on-sight cheat-sheet and bomb list are now re-baselined against the confirmed 166-card Vendetta base set, with card codes added; the rep deck in section 9 is rebuilt Vendetta-only (the v1 "Champions and bodies" paragraph had drifted onto Diana, Vi, and Jinx cards from earlier sets plus an SP-set Ezreal — none of those are legal Pre-Rift pulls); the simultaneous-damage-assignment ruling is folded into section 4; Legend names now carry their full "Name, Epithet" form; and the nine-Legend quick reference is pulled out into its own section (7) instead of living inline inside Scouting.

Note on data freshness: card identity, codes, and Might values below are checked against the final, reconciled cards.json (confirmed 166 base Vendetta cards, evening of 2026-07-21). Ten cards that looked like at-risk orphans in earlier passes are confirmed reprints from prior sets carrying Vendetta-range numbers, not new Vendetta cards, and are correctly excluded from everything below — if a champion you remember from an earlier draft of this doc is missing, that's why.

---

## 1. The event and the format

Pre-Rift is Vendetta's pre-release Sealed event, running July 24 to 30 ahead of the July 31 launch. Your sessions are Friday July 24 (Session 1) and Monday July 27 (Session 2).

Kit contents (official, per riftbound.gg "Preparing for the Vendetta Pre-Rift"):
- Five Vendetta booster packs.
- One Champion pack themed on one of the nine new Legends, chosen at random. It contains a Legend, a Rare Champion, a Battlefield, and support cards for that Champion. This is your seeded Legend, and it is random.
- A Riven, Shattered promo with a Pre-Rift stamp. Riven cannot go in your deck. Keep it sealed (long-term value).

Booster contents: 14-card packs (7 commons, 3 uncommons, 2 foil rares or better, 1 foil of any rarity, 1 token slot).

Format shape: 3 rounds of Best-of-One Swiss at most stores, one prize pack per round win, roughly 30 to 45 minutes of build time.

## 2. Sealed deckbuilding rules (official, with corrections)

From riftbound.gg and the July 2026 Tournament Rules. These correct two assumptions from our chat; your TickTick "Pre-rift notes" already had them right.

- Minimum 25-card Main Deck; you can go higher. Keep it tight (25 to 28); each card earns its slot.
- Use as many copies of a card as you open, including above the normal 3-copy limit.
- Up to three domains of cards and runes. A Legend or Signature card covers two of your domains.
- Runes are provided by the organizer; you are not limited to what you open. Tokens can be represented by anything.
- Your Chosen Champion and Signature cards must be within your three domains, but do NOT have to match the Champion on your Legend.
- Battlefields: use ones you open, or blank facedown substitutes (no abilities, just locations to conquer and hold).
- You CAN rebuild your deck between games and rounds. Adapt as you go. (Confirmed.)

Two corrections to what you said in chat:
- Your kit DOES include a Legend (the random Champion pack seeds one). You are effectively locked to the Legend you open, but using a Legend is optional.
- Going Legend-less is a real option: per core rules you draw an extra opening card if you run no Legend. Tradeoff: you give up the Legend's two-domain anchor and its ability for one extra card and full domain flexibility. Worth it only if your seeded Legend is off-plan and your best pool is elsewhere. (Confirm the exact draw bonus against Tournament Rules on site.)

## 3. The three new mechanics (learn these cold)

Empower is the tentpole. It appears on the most cards and every one of the nine Legends interacts with it, so learn it first.

- Empower: an activated ability with a cost. Pay it and the card becomes Empowered. You can only Empower a card that is not already Empowered.
- Empowered: a status that lasts indefinitely until the card leaves the board or is disempowered. It does nothing on its own; it is referenced by other effects (often an "[Empowered]" bonus ability on the same card).
- Disempower: removes the Empowered status. Some cards use "disempower" as a cost or an instruction. You cannot disempower something that is not Empowered.
- Legend chain pattern: several Legends (Mel, Ambessa, Kennen) read "when you empower something else, empower me." With those, every Empower you pay for advances two cards at once. This is the key sequencing skill.

Flow: a keyword on spells; a permission plus an alternate cost. You may play a spell from your trash for its Flow cost, then banish it. One use, then gone. Cards with Flow show a trash symbol on the textbox. Habit: scan your own trash for Flow spells every turn, like a second hand.

Burn: Burn X puts the top X cards of your Main Deck into your trash. It can target you (self-mill to fuel Flow) or an opponent (a slow deck-out clock). The mental flip: self-Burn is a resource when you have Flow payoffs, not a downside.

The engine: Burn fills the trash, Flow plays out of it. This is the set's core value loop and it concentrates in Chaos.

## 4. Rule-changes summary (the non-keyword updates)

From the official Vendetta Core Rules patch notes (riftbound.gg, effective July 24). Beyond the three keywords above, these are the changes worth knowing. Split by what actually matters at a Pre-Rift.

Matters for your Pre-Rift games:
- Combat damage assignment is simultaneous, not attacker-chooses-first (confirmed ruling, 2026-07-21). Attacker/defender designations only matter *before* combat resolution — who can legally join the fight, what "while attacking/defending" triggers care about. Once both players pass priority, combat moves straight to resolution: both controllers assign their own unit's damage at the same time, it's dealt instantly, and it cannot be reacted to at that point. Tank and Shield-style effects constrain *how* that simultaneous assignment is made (e.g. Tank must be assigned lethal first, with the excess spilling over) — they are not a turn order, and no trick that requires reacting mid-assignment is legal.
- Skip (new action): a card can now skip part of a turn. Skip replaces the named event or procedure with nothing; nothing that would result from it happens.
- Resource payment is now optional: if an effect instructs you to Pay Energy or Power, you may decline even if you have it floating (previously you were forced to spend it if you had it). Applies to Energy and Power only; other costs can still be compelled.
- Combat damage and replacement effects: any replacement effect that would modify damage dealt to units in combat now applies at damage ASSIGNMENT, not just when damage is dealt. Combat math with damage-modifying effects is slightly more involved but more consistent.
- "Play" now has three precise meanings: as a game action (put on the chain), in a trigger condition ("when you play me" means when it resolves), and elsewhere ("cards you've played" means finalized). Matters for reading triggers correctly.
- Multi-domain power costs: a Signature or multi-domain card's power cost must be paid with power of that card's domains (an any-symbol still allows any). Do not assume any-color power.
- Accelerate clarified: paying the Accelerate cost generates a delayed effect so the unit enters ready even if it loses the keyword during finalization.
- Untargetable: several new cards can become untargetable; if a unit becomes untargetable after being targeted, the spell mistargets and instructions for that unit are ignored.
- Naming cards/types/tags, and Ignoring effects: new rule classes added for cards that name something or instruct you to ignore an ability.

Mostly edge-case or competitive-only (know they exist):
- Token is no longer a supertype; tokens keep their token nature through any copy/alteration, and cards can never become tokens.
- Deathknell and "when I die" abilities can use information from before the source died (aligned).
- Delayed abilities whose duration ended before they were generated simply do not happen.
- Event is now formally defined; three new categories recognized as replacement effects ("enters as," "as," "then banish/recycle it").
- Contested status is removed in cleanup from battlefields with no units of the applying player and no ongoing showdown/combat.
- Best-of-5 battlefield reuse (top-cut only); split-damage, hidden-targeting, target-counting, "activate," applied-costs, battlefield-ability-control, and 2v2 clarifications.

## 5. On-sight card-evaluation rubric (the core skill)

Goal: given an unfamiliar card, place it fast into Must-play / Good / Filler / Cut for THIS Sealed pool. Synthesizes your own heuristics with two coach sources (riftbound.gg: Den's sealed guide, Theo's official prep).

Context that sets the rubric (Den): Pre-Rift has little removal (about one per domain, mostly conditional damage), so units and board presence win, and matches are decided on tempo and a strong early board more than on late-game value. Only a handful of commons/uncommons cost 6 to 7, so the 2 to 5 range and the first three turns decide most games.

Score each card on these, in order of weight:
1. Standalone board impact. Does it affect the board or win battlefields on its own, with no support? Units that fight are the premium because removal is scarce. Biggest factor.
2. Is it a unit? Units score points and hold battlefields. Aim for 15-plus units. Non-units must justify their slot as removal, a combat trick, or Might support.
3. Cost slot. Is it in the 2 to 5 range, ideally a 2-drop? You want roughly 5 two-drops minimum (your notes push 8 to 9), then a diverse curve. Early plays decide Bo1.
4. Floor vs ceiling. Build for the floor. A card that is reliably fine beats a card that is occasionally busted but often dead. Consistency wins Best-of-One.
5. Condition tax. Does it need a synergy or condition ("while you control 7 runes," "if you have X in trash")? Prefer cards good raw. Conditional cards drop a tier unless your pool clearly supports the condition.
6. Removal or combat trick. Scarce and high-value. Damage removal, kill effects, and Might swings punch above their slot. Prioritize the few you open.
7. Empower quality. A good Empower card has a fine base body AND an Empower that scales it or turns it into a late threat. Weak base plus expensive Empower is Filler; many common/uncommon Empowers are overpriced (Den).
8. Flow quality. A Flow spell is roughly two cards if the effect is generically useful. Value higher if the base effect is good on its own.
9. Power-cost discipline. Power costs are a luxury for your top cards only. Do not dilute your rune deck chasing them; run only the runes your power costs need.

Duplicates rule (your heuristic, kept): only run duplicates that each pass the floor test alone; do not rely on stacking duplicate effects. Duplicates of good commons are quietly the best cards because they make your curve honest.

Deck skeleton to build toward: 25 to 28 cards, 15-plus units, about 5 to 9 two-drops, a diverse curve up to a few 5-drops and one or two toppers, a few removal/trick spells, minimal power costs, one clear plan. Name the plan, keep the cards that serve it, cut the rest.

The one-line test per card: "Does this help me win battlefields, on turns 1 to 4, without needing anything else?" Yes to all three is Must-play.

## 6. Scouting: domains and the metagame read

Metagame read (Den, riftbound.gg): Pre-Rift decks are built on solid standalone commons/uncommons, at best one simple synergy. Flow and Empower make attrition wars last longer, so games are decided on tempo. Seize the early lead and force your opponent to answer you. Ask questions; do not be the one answering.

Mechanic density by domain (from the card data; numbering-independent):
- Chaos is the new-mechanics engine domain: it owns Burn and Flow and carries heavy Empower. Open into Chaos and you pilot the set's signature loop.
- Body is the Empower and mobility (Ganking) domain, with the strongest standalone champion units.
- Order has strong standalone units too, plus Tank and some interaction.
- Fury is the tempo domain (Accelerate, Assault) and shares the Burn/Flow secondary.
- Mind leans Empower and gear synergy (opportunistic in sealed).
- Calm is the weakest for Pre-Rift unless you open real late-game bombs; much of it wants 7-plus runes.

Best domains to pick units from (Den + the data): Body, Chaos, Order. Calm only with late bombs. Mind gear synergy is opportunistic.

See section 7 for the nine-Legend quick reference — your kit's Legend is random, so treat that section as prep for whichever one you open, not a pick.

Cards to respect if you face them (bombs; verified against the final 166-card set, evening of 2026-07-21):

| Card | Code | Might | Domain |
|---|---|---|---|
| Corrupted Dragon | ven-091-166 | 10 | Body |
| Eclipse Dragon | ven-016-166 | 8 | Fury |
| Nasus, Ascended | ven-046-166 | 8 | Calm |
| Plaza Guardian | ven-064-166 | 8 | Mind |
| Astral Heron | ven-044-166 | 7 | Calm |
| Ocean Drake | ven-115-166 | 7 | Chaos |
| Shen, Leader of the Kinkou Order | ven-138-166 | 7 | Order |
| Renekton, Rage Fueled | ven-019-166 | 6 | Fury |
| Jayce, Brilliant Inventor | ven-068-166 | 6 | Mind |
| Gangplank, Naval | ven-086-166 | 6 | Body |
| Sacred Protector | ven-129-166 | 6 | Order |

With limited removal, plan to answer these in combat or with your own bigger board.

## 7. Nine-Legend quick reference

All nine Legends can be seeded by the random Champion pack, so all nine must be rehearsed — you don't get to pick. Domains, one-line plan, and buildability read below are official/coach-sourced (Theo, cross-checked with Den) and verified against the final Legend cards.

| Legend | Code | Domains | Pre-Rift plan | Buildability |
|---|---|---|---|---|
| Ambessa, Matriarch of War | ven-153-166 | Body/Order | Aggressive; any Empower elsewhere chains to her, then disempower to ready a unit — free extra attacker most turns. | **Den's #1 pick** — two strong domains, easiest to assemble from a random pool. |
| Renekton, Butcher of the Sands | ven-141-166 | Fury/Body | Recycles a rune (Reaction, Tap) for +2 Energy restricted to units/activated abilities — double-dips Energy for an aggressive curve. | **Den's #2 pick** — needs a very aggressive build to pay off. |
| Akali, Rogue Assassin | ven-139-166 | Fury/Calm | Aggressive and tricky: move a unit out of a showdown back to base, readying it if she's Empowered. Attack-and-retreat to conquer, not hold. | Buildable — Den's top-4 shortlist. |
| Mel, Soul's Reflection | ven-151-166 | Mind/Chaos | Spell-focused control; any Empower elsewhere chains to her, then disempower to give an enemy unit -2 Might and win a fight you'd otherwise lose. | Buildable — Den's top-4 shortlist. |
| Zed, Master of Shadows | ven-143-166 | Fury/Chaos | Offense and conquer; banishing a card (including via Flow) empowers him, then disempower to loot (discard 1, draw 1). The Burn/Flow Legend — section 9's rep deck is built around him. | Build-around; needs the Burn/Flow shell to click. |
| Jayce, Defender of Tomorrow | ven-149-166 | Mind/Body | Gear manipulation: Empower to ready a gear for (1), Empowered readies 2 gear for (1) — efficient, responsive plays if your pool has gear. | Niche — gear-dependent. |
| Kennen, Heart of the Tempest | ven-155-166 | Order/Chaos | Empowers off playing any card from outside your hand (Flow plays count), then disempower to grant Assault 2 — a Flow/trash payoff. | Niche — needs a Flow-dense pool. |
| Nasus, Curator of the Sands | ven-145-166 | Calm/Mind | Rewards expensive plays (Energy 7+) by readying up to 2 runes; scales into a long game. | Niche — wants a 7-plus-rune pool, rare in Sealed. |
| Shen, Eye of Twilight | ven-147-166 | Calm/Order | Grants a friendly unit Tank for the turn; defensive holds, especially with unit pairs at a battlefield. | Niche — defensive plan, needs bodies to protect. |

Coach's shortlist (Den): of the nine, Ambessa, Renekton, Akali, and Mel are the most buildable from a random pool — the other five lean on a synergy (gear density, Flow density, a 7-plus-rune curve, a dedicated Burn/Flow shell) that's hard to assemble sight-unseen. Since the Legend is random you can't steer toward this list, but if your seed is off-plan, remember the flexibility levers from section 2: splash a third domain, use a different Chosen Champion, or go Legend-less for the extra card.

## 8. Day-by-day prep plan (Tue July 21 to Mon July 27)

Monday (done): read the bans, keywords, and launch mechanics.

Tuesday July 21 (today): mechanics reps plus first sealed sim. RiftAtlas: 3 to 4 games, one Empower deck and one Burn/Flow deck (use the Zed shell in section 9). Execute each mechanic several times; note any ruling you were unsure of. Start the RiftAtlas sealed sim (moved up): generate a pool, build against the clock, share the pool for on-the-spot evaluation feedback. RiftRecall: keep the new-keyword deck; add the nine Legends and their domain pairs.

Wednesday July 22: sealed sim reps (core feature this week) plus pool fluency. Run one or two more sim pools, build each, compare your picks against an AI-built list, and diff the differences. RiftRecall: drill commons/uncommons for on-sight evaluation. RiftAtlas: a couple of deliberately off-color games (Chaos is ideal).

Thursday July 23: sealed sim plus hygiene, then taper. One full sim build against the 30 to 45 minute clock. Then one or two games focused only on hygiene: track Empowered states, check the trash for Flow each turn, zero missed triggers. Light day; sleep well.

Friday July 24: Session 1. Arrive early, one cheat-sheet pass. Bo1 means play to consistency and a proactive plan. Build the best deck from your pool using the section 5 rubric and skeleton. Keep Riven sealed. After: log leaks tagged coverage (forgot to check) vs accuracy (checked, judged wrong).

Saturday July 25 to Sunday July 26: adjustment loop. Route each Friday leak: coverage failures to a habit rep (RiftRecall or a checklist item), accuracy failures to studying the correct line. Drill only what broke.

Monday July 27: Session 2. Execute the adjustments; same clean-play focus. This is the test of whether the prep held up. Capture what generalized as a reusable pre-rift learning for Radiance.

## 9. Vendetta-only Zed Burn/Flow rep deck (for RiftAtlas practice)

Purpose: a constructed deck to FEEL the Burn/Flow engine on RiftAtlas before Friday. This is not a Sealed list (you will not have these exact cards on the day); it is a learning shell built from the card pool. Legend: Zed, Master of Shadows (ven-143-166, Fury/Chaos), the Burn/Flow Legend.

Engine pieces (the point of the deck) — all Vendetta-set, verified against the final card list:
- Burn enablers: Blade Twirler (ven-002-166, Fury), Shadow Order Disciple (ven-095-166, Chaos), Kennen, Storm of Shuriken (ven-113-166, Chaos — Burn 2 on play), Forgotten Relic (ven-108-166, Chaos gear, recurring Burn 1), Death Mark (ven-144-166, Fury/Chaos signature, Burn 3), and Endless Riches (ven-022-166, Fury, Burn 7) as a build-around finisher.
- Flow payoffs from the trash: Twilight Step (ven-105-166, Chaos, move), Up from the Deep (ven-100-166, Chaos, tokens), Perfect Execution (ven-012-166, Fury, ready plus Assault 3), Brittle Steel (ven-003-166, Fury, kill a gear), Death Mark (also a Flow spell), Lightning Rush (ven-156-166, Order/Chaos — a splash if you want it; drop it to stay two-domain).
- Flow discount / trash payoff: Stargazer (ven-098-166, Chaos, makes Flow spells from trash cost 2 less), Shadowblade Lurker (ven-096-166, Chaos, cheaper per copy of its name in trash), Gust Monk (ven-101-166, Chaos, banish from a trash for Assault 2 value).

Champions and bodies (corrected — Vendetta-only): Zed, From the Shadows (ven-023-166, Fury, M4), Zed, Without a Sound (ven-112-166, Chaos, M5), Kennen, Storm of Shuriken (ven-113-166, Chaos, M4 — dual-role, also an engine piece above), Akali, Deadly Weapon (ven-021-166, Fury, M3 — Empower to punish movement), Illaoi, Prophet of the Great Kraken (ven-109-166, Chaos, M4 — makes a token on play and on score), Mel, Defiant Soul (ven-110-166, Chaos, M4 — Empower removal on an enemy unit at 3 Might or less).

How to pilot it (what you are drilling): use cheap units and Burn effects to fill the trash early, keep tempo with Fury bodies, then convert the trash into extra plays with Flow (using Stargazer to discount). Watch the trash every turn. The learning goal is the Burn-then-Flow rhythm and clean Empowered/trash tracking, not winning.

Caveat: this list is an engine skeleton (bodies + Burn/Flow pieces), not a finalized 40-card decklist — the curve-filling commons and exact rune split are still yours to lock in for a literal RiftAtlas build. Every named card above is now confirmed-Vendetta and code-verified against the final 166-card set, so nothing here needs a further swap when you do.

## 10. Sources and provenance

- Card data: project cards.json, reconciled against the confirmed 166-card Vendetta base set (evening of 2026-07-21). Authoritative for card identity, stats, text, and codes.
- Official rules: riftbound.gg Vendetta Core Rules patch notes; playriftbound how-to.
- Official Pre-Rift prep and kit: riftbound.gg "Preparing for the Vendetta Pre-Rift" (Theo).
- Sealed strategy and domain scouting: riftbound.gg "Vendetta Pre-Rift Sealed Event Strategy Guide" (Den).
- Rulings: 2026-07-21 Master Card Inventory / Card Questions reconciliation (simultaneous combat-damage assignment).
- Your own heuristics: TickTick "Pre-rift notes" (floor-not-ceiling, name-the-plan, duplicates-of-commons, units-are-premium).

Any content derived from real competitive play is treated as hand-authored reconstruction per Riftbound's fan-content policy.
