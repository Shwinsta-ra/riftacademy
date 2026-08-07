# RiftCore → M9: Supabase Logical Schema — AUDITED FINAL (2026-08-04)

**This document replaces all prior schema docs. Implement this one.**

**Audit method:** two passes, per Ashwin's directive. **Pass 1** — every table, column, and enumerated value verified against the Core Rules (RUP4) and Tournament Rules **text**, explicitly, no inference; each element carries its citation, collected in the Appendix. **Pass 2** — anything not grounded in CR/TR removed from the game-truth tables or relocated to the application partition, regardless of origin (including prior Core drafts and Ashwin's inputs).

**Authority:** CR/TR define all game vocabulary. `cards.json` and the Master Card Inventory are known-lossy interim sources: they seed **values only** (§6), never structure, and are dropped entirely when Riot API access lands.

---

## 1. What the audit changed (vs. the previous draft)

| Finding | Correction |
|---|---|
| **Mode names were wrong.** CR 484–489 sanctions five named modes: **1v1 (Duel)** 485, **1v1 (Match)** 486, **FFA3 (Skirmish)** 487, **FFA4 (War)** 488, **2v2 (Magma Chamber)** 489 — *two distinct 1v1 modes*, and 2v2's Victory Score is **11** with Battlefield Count 3 | `mode` is no longer a guessed enum: a **`modes` reference table** seeded verbatim from CR 483–489, which itself defines modes as data (number of players, victory score, battlefield count) |
| **Keyword parameters are not all numbers.** Assault X / Deflect X / Shield X / Hunt X / Level N are numeric, but **Equip [Cost], Accelerate, Repeat [Cost], Flow [Cost], Empower [Cost], Hidden (Cost)** carry *costs* (805, 811, 818, 820, 827, 829) — a single `value int` cannot hold them | `card_keywords` splits into `value_number int` + `value_cost jsonb`; `keywords.param_kind ∈ {none, number, cost}` |
| **Quick-Draw belongs to two ability classes** (819: a Triggered ability *and* Reaction-permissive) | `keywords.class` → **`classes text[]`** |
| **`[C]`/`[A]` have formal definitions** at CR **135.2.e.5–.6** (better than the 805 citation), including a rule previously missed: **a [C] on a card with no Domain is processed as [A]** (135.2.e.6.b) | Symbol semantics note updated; kernel must implement 135.2.e.6.b |
| **Formats clarified.** TR 202.1: competition formats are **Limited** and **Constructed**; Sealed and Draft are *kinds of Limited* (TR 602.4); ban lists distinguish constructed vs limited (TR 601.2.d, 602.1.b) | `decks.format ∈ {constructed, sealed, draft}`; `card_bans.format ∈ {constructed, limited}`; `validateDeck` maps sealed/draft → limited for ban checks |
| **Schema partitioned** into game-truth vs application | §3 vs §4. Game-truth tables contain **nothing** without a CR/TR citation. Operational fields (sync ids, timestamps, image URLs) live only in the application partition or as flagged printing metadata |
| Q-004 citation upgraded | CR **133.3** states the multi-type negative-criterion answer verbatim ("a 'non-unit card' is any card that is not a unit… regardless of any other categories") |

## 2. Design invariants
1. **CR/TR vocabulary only** in game-truth tables; a CR term is never repurposed; a non-CR term never masquerades as one.
2. **Database stores facts; Core computes judgments** (`validateDeck` + `FormatContext`; no stored legality).
3. **Display and machine-readable kept separately**; nothing parses printed text at query time.
4. **Ground truth ≠ analysis** — RiftAcademy's interpretive layer is physically separate (§4.3).
5. **No financial data anywhere in this schema.** Google Drive only. Standing rule.
6. **M9 may add operational metadata** (timestamps, provenance) anywhere, provided names cannot collide with CR vocabulary; anything *semantic* added to game-truth tables requires Core review per `RiftCore_Schema_Change_Protocol.md`.

## 3. GAME-TRUTH PARTITION (every element cited; see Appendix)

### 3.1 `modes` — CR 483–489 as data
```sql
create table modes (
  mode              text primary key,   -- 'duel' | 'match' | 'skirmish' | 'war' | 'magma_chamber'
  display_name      text not null,      -- '1v1 (Duel)' etc., verbatim CR headers 485–489
  number_of_players int not null,       -- CR 483.1
  victory_score     int not null,       -- CR 483.3  (8,8,8,8,11)
  battlefield_count int not null,       -- CR 483.4  (2,2,3,3,3)
  cr_citation       text not null
);
```
Seed: `duel(2,8,2,'CR 485')`, `match(2,8,2,'CR 486')`, `skirmish(3,8,3,'CR 487')`, `war(4,8,3,'CR 488')`, `magma_chamber(4,11,3,'CR 489')`.

### 3.2 `cards`
```sql
create table cards (
  card_code   text primary key,                     -- canonical code (join key; NOT the identity for name-based rules)
  name        text not null,                        -- CR 132.1/132.4: full "Name, Subtitle" IS the name
  card_type   text[] not null,                      -- CR 133.4–133.6 + 178 (multi-type):
                                                    -- ⊆ {Unit(140–141), Gear(148–150), Spell(151+), Rune(133.5.a),
                                                    --    Battlefield(133.6.a/169+), Legend(133.6.b/173+)}
  supertypes  text[] not null default '{}',         -- CR 133.7: ⊆ {Champion(133.7.a, units only), Signature(133.7.b)}
  tags        text[] not null default '{}',         -- CR 133.8: open vocabulary, no innate meaning; Equipment is a tag (150.1)
  domains     text[] not null default '{}',         -- CR 134.2: ⊆ {Fury,Calm,Mind,Body,Chaos,Order}; '{}' = domainless
                                                    -- ('{}' MEANS "no domain requirement", CR 103.1.b — never "unknown")
  energy_cost int,                                  -- CR 131.2; NULLABLE ≠ 0 (131.3.b: cost element may be absent)
  power_cost  jsonb,                                -- CR 131.3 + 135.2.e: ordered symbol array
                                                    -- {"kind":"domain","domain":D} | {"kind":"selfDomain"} /*[C], 135.2.e.6*/
                                                    -- | {"kind":"any"} /*[A], 135.2.e.5*/
                                                    -- NEVER pre-resolved; kernel rule: [C] on a domainless card ⇒ [A] (135.2.e.6.b)
  might       int,                                  -- units only (178.1.a.1: a Unit has Might regardless of other types)
  might_bonus int,                                  -- Equipment gear only — CR 137: distinct concept; may be +0 (137.2);
                                                    -- ignored when host has no Might (137.3.b); Equipment = effect text + Might bonus (150.2)
  is_token    boolean not null default false,       -- CR 185.1: intrinsic category, immutable, NOT a supertype
  rules_text  text                                  -- CR 135: verbatim printed Rules Text, display only
);
```

### 3.3 `card_printings`
```sql
create table card_printings (
  printing_code    text primary key,
  card_code        text not null references cards,
  set_code         text not null,          -- TR 601.3.c set identifiers (OGS/OGN/SFD/UNL/VEN)
  collector_number text not null,          -- TR 601.2.c (collector numbers govern reprint legality)
  rarity           text,                   -- TR 602.2.b (rarity is TR vocabulary; a printing fact, not a card fact)
  is_overnumbered  boolean not null default false,  -- TR 601.2.c ("collector number not within the normal numbering")
  is_alt_art       boolean not null default false,  -- printing metadata (operational; no CR/TR concept — flagged per §2.6)
  image_url        text                             -- operational (flagged per §2.6)
);
```
Reprint semantics: same-name printings share one `card_code`; **all name-based rules key on `cards.name`** — 3-copy limit (103.2.b), Unique (825), Chosen-Champion identity (103.2.a.3), same-name-different-language (132.3), reprint legality (TR 601.2.a).

### 3.4 `keywords` + `card_keywords`
```sql
create table keywords (
  keyword     text primary key,
  classes     text[] not null,   -- ⊆ {passive,triggered,activated,permissive,dependent,optionalAdditionalCost,deckConstraint,prerequisite}
  stacking    text not null,     -- sums | redundant | separateInstances | multipleAbilities | na
  param_kind  text not null,     -- none | number | cost
  cr_citation text not null
);

create table card_keywords (     -- PRINTED keywords only; runtime grants are game state
  card_code    text not null references cards,
  keyword      text not null references keywords,
  value_number int,              -- Assault 2 → 2; Level 6 → 6
  value_cost   jsonb,            -- Equip (1)(R) → {energy:1, power:[{"kind":"domain","domain":"Fury"}]}
  sequence     int not null,
  primary key (card_code, keyword, sequence)
);
```
**Seed (25 rows — this IS Core's deliverable, implement verbatim):**

| keyword | classes | stacking | param | CR |
|---|---|---|---|---|
| Accelerate | optionalAdditionalCost | redundant | cost | 805 |
| Action | permissive | na | none | 806 |
| Assault | passive | sums | number | 807 |
| Deathknell | triggered | separateInstances | none | 808 |
| Deflect | passive | sums | number | 809 |
| Ganking | passive | redundant | none | 810 |
| Hidden | prerequisite | redundant | cost | 811 |
| Legion | dependent | na | none | 812 |
| Reaction | permissive | na | none | 813 |
| Shield | passive | sums | number | 814 |
| Tank | passive | redundant | none | 815 |
| Temporary | triggered | redundant | none | 816 |
| Vision | triggered | separateInstances | none | 817 |
| Equip | activated | multipleAbilities | cost | 818 |
| Quick-Draw | triggered, permissive | redundant | none | 819 |
| Repeat | optionalAdditionalCost | separateInstances | cost | 820 |
| Weaponmaster | triggered | separateInstances | none | 821 |
| Ambush | passive | redundant | none | 822 |
| Hunt | triggered | sums | number | 823 |
| Level | dependent | na | number | 824 |
| Unique | deckConstraint | na | none | 825 |
| Backline | passive | redundant | none | 826 |
| Empower | activated | multipleAbilities | cost | 827 |
| Empowered | dependent | na | none | 828 |
| Flow | passive | na | cost | 829 |

### 3.5 `card_abilities`
```sql
create table card_abilities (
  ability_id        text primary key,
  card_code         text not null references cards,
  sequence          int not null,                    -- printed order
  kind              text not null,                   -- CR 361.1 (+386/393): passive|replacement|activated|triggered|reflexive|delayed|linked
  cost              jsonb,                           -- CR 376/403: activated cost (pre-':'); Cost shape of §3.2
  trigger_condition jsonb,                           -- CR 383.2 — MUST honor the adjacency rule (383.2.a.1):
                                                     -- an "if" immediately after the timing clause is Condition; elsewhere it is Effect
  effect            jsonb,                           -- Phase 4 authors these (kernel Predicate/Selector/EventPredicate shapes, PR #151)
  is_effect_text    boolean not null default false,  -- CR 136 + 723–724: Effect Text is Inactive unless Attached
  active_zones      text[] not null default '{board}' -- CR 365.1 default; off-board self-described (366.1, 385.2)
);
```

### 3.6 Legality facts (judgments computed by Core, never stored)
```sql
create table card_bans (
  card_code      text not null references cards,    -- applies across printings via name semantics (TR 601.2.a)
  format         text not null,                     -- 'constructed' | 'limited'  (TR 601.2.d, 602.1.b)
  mode           text references modes,             -- NULL = all modes; 'magma_chamber' for the 2v2-only ban
  effective_date date not null,
  primary key (card_code, format, coalesce_mode, effective_date)  -- M9: physical PK handling of NULL mode is yours
);

create table format_sets (                          -- TR 601.3: Standard as data
  format_name text not null,                        -- 'standard'
  set_code    text not null,
  primary key (format_name, set_code)
);
```
Seeds from Core: current bans (Stealthy Pursuer, The Arena's Greatest, Aspirant's Climb — constructed, all modes; Master Yi, Wuju Bladesman — constructed, `magma_chamber` only) and Standard = {OGS, OGN, SFD, UNL, VEN} (TR 601.3.c).

## 4. APPLICATION PARTITION (operational; non-CR fields explicitly allowed here)

### 4.1 `decks` + `deck_cards`
```sql
create table decks (
  deck_id                   uuid primary key,
  name                      text not null,           -- app field; NOT unique (same name across formats is legitimate)
  runehoard_id              text unique,             -- app sync key (operational, non-CR)
  format                    text not null,           -- 'constructed' | 'sealed' | 'draft' (TR 202.1 + 602.4)
  mode                      text not null references modes,   -- CR 484–489
  legend_card_code          text references cards,   -- CR 103.1
  chosen_champion_card_code text references cards    -- CR 103.2.a; must also appear in deck_cards 'main' (validated by Core)
);

create table deck_cards (
  deck_id      uuid not null references decks,
  card_code    text not null references cards,
  deck_section text not null,   -- 'main'(CR 103.2) | 'sideboard'(TR 403.1) | 'runes'(CR 103.3) | 'battlefields'(CR 103.4)
                                -- named deck_section, NOT "zone" — Zone is a CR term (105–108) for play areas
  quantity     int not null check (quantity > 0),
  primary key (deck_id, card_code, deck_section)
);
```
Constraints deliberately NOT in the database (format-dependent; computed by Core's `validateDeck(deck, FormatContext)`): exactly-40-including-champion (TR 402.1), ≤3 per **name** across main+sideboard (CR 103.2.b, TR 601.1.c.3), ≤3 Signature matching the Legend's champion tag (103.2.d), exactly 12 runes (103.3), 3 uniquely-**named** battlefields (103.4.c, TR 402.1), domain identity incl. multi-domain-needs-all (103.1.b.4), bans (§3.6 with sealed/draft→limited mapping). **Sealed/draft construction rules are deferred** (~3 months; rebuilt from TR 602.4 when live — enum values exist, no validation implemented, no guessing).

### 4.2 `card_inventory`
```sql
create table card_inventory (
  printing_code text primary key references card_printings,
  quantity      int not null check (quantity >= 0)
  -- NO financial columns, ever (§2.5)
);
```

### 4.3 Analysis layer (owner: Lab; never touches game-truth)
```sql
create table analysis_tags (analysis_tag text primary key, description text, owner_module text);
create table card_analysis_tags (
  card_code text not null references cards,
  analysis_tag text not null references analysis_tags,
  primary key (card_code, analysis_tag)
);
```
Seeded from the old inventory's interpretive labels (Combat Trick, Removal, Utility, Counterspell) and extended by Lab/Coach.

## 5. Seed transformations (`cards.json` → this schema; values only, structure never)

| Source | → | Rule |
|---|---|---|
| `power` + `recycleCost` | `power_cost` symbol array | "recycleCost" conflates a cost with one payment method (164.2.b); keep [C]/[A] symbolic (135.2.e.5–.6) |
| gear `might` (36 cards) | `might_bonus` | CR 137 ≠ Might |
| `speed` enum | Action/Reaction rows in `card_keywords`; 'Normal' → nothing | CR 806/813: permissive keywords, no speed concept |
| `subtype` | Champion → `supertypes`; Token → `is_token`; Equipment → `tags`; Combat Trick/Removal/Utility/Counterspell → `card_analysis_tags` | "subtype" is not CR vocabulary (0 occurrences); field mixes four concepts |
| `supertype:'Basic'` (149 cards across all six types) | **dropped entirely** | not CR vocabulary (133.7 = Champion, Signature only) and not rules-meaningful; product membership derives from `card_printings.set_code` |
| `domain:['Colorless']` (59 Battlefields + 4 Units) | `domains='{}'` | not a CR domain (134.2); '{}' = "no domain requirement" (103.1.b); **unparseable domains fail the seed loudly, never default to '{}'** |
| slash-strings `['Fury/Chaos']` | two `domains` entries | CR 134.1 "one or more" |
| `type` scalar | `card_type[]` — **known-lossy**: Patched Porobot is [Unit,Gear] stored as Unit | CR 178; re-pull typing when a multi-type-preserving source is available |
| `banned1v1` | `card_bans` rows | single boolean cannot express TR 601.2.d/602.1.b |
| `name` | full "Name, Subtitle" preserved exactly | CR 132.4 |

## 6. Appendix — column-by-column citation audit

| Element | Citation |
|---|---|
| modes table + seed values | CR 483.1/.3/.4; 485–489 |
| cards.name | CR 132.1, 132.4 (comma form), 132.3 (languages) |
| cards.card_type values | CR 133.4 (Main Deck: Units/Gear/Spells), 133.5.a (Runes), 133.6.a/.b (Battlefields/Legends); array per 178 |
| cards.supertypes | CR 133.7.a (Champion, units only), 133.7.b (Signature) |
| cards.tags | CR 133.8, 133.8.a (no innate meaning), 133.8.b (Champion Tags); Equipment 150.1 |
| cards.domains | CR 134.1–134.2.a–f (six, named); '{}' semantics 103.1.b |
| cards.energy_cost | CR 131.2; nullable per 131.3.b |
| cards.power_cost symbols | CR 131.3; [A] 135.2.e.5; [C] 135.2.e.6; [C]-on-domainless⇒[A] 135.2.e.6.b |
| cards.might | CR 178.1.a.1 (a Unit has Might regardless of other types); Units 140–141 |
| cards.might_bonus | CR 137, 137.2 (+0 legal), 137.3.b (ignored w/o host Might), 150.2 |
| cards.is_token | CR 185.1 (intrinsic, immutable) |
| cards.rules_text | CR 135 |
| card_printings.set_code / collector_number / rarity / is_overnumbered | TR 601.3.c / 601.2.c / 602.2.b / 601.2.c |
| keywords (25) + classes/stacking/params | CR 805–829 (per-row citations in §3.4) |
| card_abilities.kind | CR 361.1; reflexive 386; linked 393 |
| card_abilities.cost | CR 376, 403 |
| card_abilities.trigger_condition adjacency | CR 383.2.a.1 |
| card_abilities.is_effect_text | CR 136, 723–724 |
| card_abilities.active_zones | CR 365.1, 366.1, 385.2 |
| card_bans.format | TR 601.2.d, 602.1.b |
| format_sets | TR 601.3.a–c |
| decks.format | TR 202.1.a–b, 602.4.a–b |
| decks.mode | CR 484–489 |
| decks.legend / chosen_champion | CR 103.1, 103.2.a |
| deck_cards.deck_section values | main CR 103.2 · sideboard TR 403.1 · runes CR 103.3 · battlefields CR 103.4 |
| Validation rules (computed) | TR 402.1; CR 103.2.b/.d, 103.3, 103.4.c, 103.1.b.4; TR 601.1.c.3 |
| Multi-type semantics | CR 133.3 (inclusive/exclusive reference), 178.1–178.3 |
| Non-CR fields (flagged operational): runehoard_id, decks.name, image_url, is_alt_art, analysis tables | §2.6 — application partition or flagged printing metadata; may never collide with CR names |

## 7. Core's remaining deliverables to M9
1. ~~Keywords seed~~ — **included above, §3.4**.
2. ~~Bans + Standard seed~~ — **included above, §3.6**.
3. Cost/Predicate/Selector JSON shapes: match kernel `schema.ts` (PR #151); Core will export a versioned reference file on request.
4. One-pass review of M9's physical DDL + migration before first load.
