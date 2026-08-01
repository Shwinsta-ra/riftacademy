# RiftCore v2 — Canonical Model · Part 7: The v2 Type-System Spec

**Source:** Parts 1–6 (Core Rules RUP4 + Tournament Rules RUP4 + errata/bans). Clean-room. Every type CR-cited.
**Purpose:** the implementable specification. This is the input to **Phase 2** (diff vs legacy), **Phase 3** (one consolidated migration), **Phase 4** (effects/ability layer vs the Supabase card inventory).

---

## 0. Naming charter (binding)

1. CR nouns/verbs only: `Chain`, `PendingChainItem`, `FinalizedChainItem`, `Finalize`, `Resolve`, `Cleanup`, `OutstandingTask`, `Priority`, `Focus`, `Showdown`, `AwakenPhase`, `ScoringStep`, `Channel`, `Recall`, `Layer`, `Snapshot`, `RunePool`, `TopMostCard`.
2. **"Play" only as the CR uses it** (349–353, 419). Legacy `Play` → **`CandidateAction`** (confirmed).
3. The **32 Game Actions (413–444)** are the only effect verbs.
4. Every exported symbol carries `/** CR nnn */`.
5. Where the CR distinguishes, the code distinguishes: `Move` ≠ `Recall` (456); `Banish` ⊄ `Kill` (427.2.a); `Attach` ⊄ `Move` (434.4.a); `Assign` ≠ `Deal` (417.1.a); `Hide` ⊄ `Play` (811.1.c.1).

---

## 1. Identity & primitives

```ts
/** CR 134.2 — color-canonical, not first-letter */
type Domain = "Fury"|"Calm"|"Mind"|"Body"|"Chaos"|"Order";        // [R][G][B][O][P][Y]

/** CR 163, 805.1.a — symbolic; never pre-resolve [C]/[A] (Part 6 §4) */
type PowerSymbol = { kind:"domain"; domain:Domain } | { kind:"selfDomain" } /*[C]*/ | { kind:"any" } /*[A]*/;
type Cost = { energy:number; power:PowerSymbol[] };

type PlayerId = string;
/** CR 124 — a NEW ObjectId is minted whenever an object crosses to/from a Non-Board Zone */
type ObjectId = string;
type CardId = string;            // catalog identity (cards.json / Supabase)
```

## 2. Zones & locations (CR 105–108, 197)

```ts
type BoardZone =
  | { kind:"base"; player:PlayerId }                    // CR 107.1 — a Location
  | { kind:"battlefield"; battlefieldId:ObjectId }      // CR 107.2 — a Location
  | { kind:"facedownZone"; battlefieldId:ObjectId }     // CR 107.3 — NOT a Location
  | { kind:"legendZone"; player:PlayerId };             // CR 107.4 — NOT a Location

type NonBoardZone =
  | { kind:"chain" }                                     // CR 108.1
  | { kind:"trash"; player:PlayerId }                    // CR 108.2 (unordered, public)
  | { kind:"championZone"; player:PlayerId }             // CR 108.3
  | { kind:"mainDeck"; player:PlayerId }                 // CR 108.4 (order Secret)
  | { kind:"runeDeck"; player:PlayerId }                 // CR 108.5 (order Secret)
  | { kind:"banishment"; player:PlayerId }               // CR 108.6
  | { kind:"hand"; player:PlayerId };                    // CR 108.7 (contents Private, COUNT public)

type Zone = BoardZone | NonBoardZone;
/** CR 197 — only these are Locations (move Origins/Destinations) */
type Location = Extract<BoardZone, {kind:"base"|"battlefield"}>;

/** CR 128 */
type Privacy = "secret" | "private" | "public";
```

## 3. Game Objects (CR 119–127, 178, 185)

```ts
/** CR 133 */
type CardCategory = "unit"|"gear"|"spell"|"rune"|"battlefield"|"legend";
type Supertype = "champion"|"signature";                        // CR 133.7

/** CR 124.2 — non-exhaustive per CR; extend additively */
type ObjectStatus =
  | "attached"|"attacker"|"defender"|"buffed"|"controlled"|"empowered"
  | "equipped"|"exhausted"|"facedown"|"ready"|"replaced"|"revealed"|"stunned";

interface GameObject {
  objectId: ObjectId;
  cardId: CardId | null;          // null = identity unknown from this perspective
  owner: PlayerId;                // CR 127
  controller: PlayerId | null;    // CR 188; null only for uncontrolled battlefields
  isToken: boolean;               // CR 185.1 — immutable nature
  categories: CardCategory[];     // CR 178 — multi-type objects hold ALL type properties
  supertypes: Supertype[];
  tags: string[];                 // CR 133.8 — no innate meaning
  zone: Zone;
  statuses: Set<ObjectStatus>;
  damage: number;                 // CR 417 — units only
  buffCount: 0 | 1;               // CR 702.3 — hard cap of one
  counters: Record<string, number>;               // CR 741–749 (no controller)
  attachedTo: ObjectId | null;                    // CR 716–719
  attachments: ObjectId[];                        // this object as TopMostCard
  preventValue: number | "all" | null;            // CR 437 — decrementing tracked value
  grantedKeywords: GrantedKeyword[];              // CR 801.3 (duration-bearing)
}

/** CR 801.3.a.3 — default duration = while it stays in its current zone */
interface GrantedKeyword { keyword: Keyword; value?: number; duration: Duration; sourceObjectId: ObjectId }
type Duration = "thisTurn"|"thisCombat"|"whileInZone"|"permanent"|{ untilCleanupTag:string };
```

## 4. Keywords (CR 800–829)

```ts
type Keyword =
  | "Accelerate"|"Action"|"Assault"|"Deathknell"|"Deflect"|"Ganking"|"Hidden"|"Legion"
  | "Reaction"|"Shield"|"Tank"|"Temporary"|"Vision"|"Equip"|"QuickDraw"|"Repeat"
  | "Weaponmaster"|"Ambush"|"Hunt"|"Level"|"Unique"|"Backline"|"Empower"|"Empowered"|"Flow";

/** Part 5 §1 — every keyword carries its ability class + stacking rule */
type KeywordClass = "passive"|"triggered"|"activated"|"permissive"|"dependent"|"optionalAdditionalCost"|"deckConstraint"|"prerequisite";
type KeywordStacking = "sums"|"redundant"|"separateInstances"|"multipleAbilities"|"na";
interface KeywordDef { keyword:Keyword; class:KeywordClass; stacking:KeywordStacking; valued:boolean; cr:string }
```
Stacking is **per-keyword, not uniform**: `sums` = Assault/Shield/Deflect/Hunt; `separateInstances` = Deathknell/Vision; `multipleAbilities` = Equip/Empower; `redundant` = Tank/Ganking/Temporary/Ambush/Backline/Accelerate/Hidden/QuickDraw.

## 5. Abilities (CR 360–406)

```ts
type AbilityKind = "passive"|"replacement"|"activated"|"triggered"|"reflexive"|"delayed"|"linked";

interface AbilityBase { abilityId:string; kind:AbilityKind; sourceObjectId:ObjectId; activeZones:Zone["kind"][] } // CR 366/385 self-describing zones

interface PassiveAbility   extends AbilityBase { kind:"passive"; condition?:Predicate; layerEffects:LayerEffect[] }
interface ActivatedAbility extends AbilityBase { kind:"activated"; cost:AbilityCost; effect:Instruction[];
  /** CR 381 — own turn + Open State only, unless Action/Reaction granted */ timing:TimingPermission }
interface TriggeredAbility extends AbilityBase { kind:"triggered";
  /** CR 383.2.a.1 — the adjacent if-clause belongs to the CONDITION, not the effect */
  condition:TriggerCondition; effect:Instruction[]; optionalAtChoiceStep:boolean /* CR 402.1 */ }
interface ReplacementEffect extends AbilityBase { kind:"replacement";
  appliesTo:EventPredicate; replacement:Instruction[];
  usageLimit?:{ perTurn:number }; optional:boolean }        // CR 371
interface ReflexiveTrigger extends AbilityBase { kind:"reflexive"; condition?:TriggerCondition; instances:number } // CR 387
interface DelayedAbility   extends AbilityBase { kind:"delayed"; window:Duration; inner:Ability }                  // CR 389–392
interface LinkedAbility    extends AbilityBase { kind:"linked"; componentIds:string[] }                            // CR 393–397

type TimingPermission = { openStateOwnTurnOnly:boolean; action:boolean; reaction:boolean }; // CR 806/813
```

## 6. Turn, states, Priority/Focus (CR 300–317)

```ts
type Phase = "awaken"|"beginning"|"channel"|"draw"|"main"|"ending";        // CR 315–317
type Step  = "beginningStep"|"scoringStep"|"endingStep"|"expirationStep";  // CR 315.2, 317
type ShowdownState = "neutral"|"showdown";   // CR 308
type OpenState     = "open"|"closed";        // CR 309

interface TurnState {
  turnPlayer: PlayerId;                      // CR 304
  turnOrder: PlayerId[];                     // CR 115.1 (looping queue)
  additionalTurns: PlayerId[];               // CR 734–738 (queue-inserted, order unchanged)
  phase: Phase; step?: Step;
  showdownState: ShowdownState; openState: OpenState;   // CR 310 — the four states
  priority: PlayerId | null;                 // CR 312
  focus: PlayerId | null;                    // CR 313 (null in Neutral, 313.5)
}
```

## 7. Chain, Tasks, HOT FEPR (CR 325–348)

```ts
interface PendingChainItem   { itemId:string; objectId:ObjectId|null; controller:PlayerId; kind:"card"|"ability"; addedSeq:number }
interface FinalizedChainItem { itemId:string; objectId:ObjectId|null; controller:PlayerId; choices:ResolvedChoices; totalCost:Cost; finalizedSeq:number }

interface Chain { pending:PendingChainItem[]; finalized:FinalizedChainItem[] }   // CR 328–330
// FIFO finalize (337.1.b) = min addedSeq; LIFO resolve (340.1) = max finalizedSeq

type OutstandingTask =
  | { kind:"cleanup"; special?:"combat"|"ending" }            // CR 318–324
  | { kind:"phaseTask"; phase:Phase; step?:Step }
  | { kind:"combatStep"; step:1|2|3 }                          // CR 463–466
  | { kind:"triggerToChain"; abilityId:string; controller:PlayerId };

interface ChainEngineState { tasks:OutstandingTask[]; chain:Chain; showdown:ShowdownContext|null }
interface ShowdownContext { battlefieldId:ObjectId; isCombat:boolean; attacker?:PlayerId; defender?:PlayerId; openedBy:"trigger"|"add"|"play" } // CR 346.1
```

## 8. Layers (CR 473–480)

```ts
type LayerNumber = 1|2|3;   // 1 Trait-Altering, 2 Ability-Altering, 3 Arithmetic

interface LayerEffect {
  layer: LayerNumber; sourceObjectId:ObjectId; targetSelector:Selector;
  op: TraitOp | AbilityOp | ArithmeticOp;
  fromPassive: boolean;             // CR 477.3.b — passives do NOT snapshot
  snapshotted?: number;             // resolved limited value, remembered for the duration
  duration: Duration; timestamp:number;
}
type ArithmeticOp = { attr:"might"|"energyCost"|"powerCost"; delta:number; minimum?:number; maximum?:number };
type TraitOp      = { set:"might"|"name"|"type"|"tags"|"controller"|"cost"|"domain"; value:unknown } | { copyFrom:ObjectId };
type AbilityOp    = { grantKeyword?:Keyword; removeKeyword?:Keyword; appendText?:string; removeText?:string };
```
**Resolution:** apply layers 1→2→3, each effect once, **iterate to a fixed point** (476). **Snapshot** non-passive limited arithmetic at application (477.3.b). **Increase-by-negative → 0** (477.3.c). Negative Might is legal (477.3.c).

## 9. Players & format context

```ts
interface PlayerState {
  playerId: PlayerId;
  points: number;
  xp: number;                                  // CR 728–733 — NEW (public, uncapped, not a Game Object)
  runePool: { energy:number; power:{ domain:Domain; universal:boolean }[] };  // CR 165–167
  handCount: number;                           // CR 108.7.e — public even when contents are private
  legendObjectId: ObjectId;
  chosenChampionCardId: CardId;                // CR 103.2.a.3 — name-based status
  scoredBattlefieldsThisTurn: Set<ObjectId>;   // CR 470 — once per BF per turn, both methods
}

/** TR 104.1 — tournament rules override CR in competition; kernel takes a context */
interface FormatContext {
  mode: "1v1"|"2v2"|"ffa3"|"ffa4";             // CR 481–488
  format: "constructed"|"sealed"|"draft";
  victoryScore: number;
  battlefieldCount: number;
  mainDeckMin: number;                         // 40 constructed / 25 sealed / 20 draft
  championCountsInMain: boolean;               // TR 402.1 constructed = true (sealed: register item 13)
  uniqueApplies: boolean;                      // TR 602.4.a.6.a — false in sealed/draft
  copyLimitApplies: boolean;
  legality: (cardId:CardId) => "legal"|"banned";
}
```

## 10. Combat & scoring

```ts
interface CombatState {                        // CR 459–466
  battlefieldId: ObjectId;
  attacker: PlayerId;                          // CR 464.2.c.1 — the CONTEST APPLIER
  defender: PlayerId;
  step: 1|2|3;
}
interface DamageAssignment { fromPlayer:PlayerId; assignments:{ targetObjectId:ObjectId; amount:number }[] }
```
**Assignment constraints (465.2.c + 815/826):** lethal-first universal (c.3); **never exceed minimum-lethal while unassigned units remain** (c.4); replacement effects apply **at assignment**, minimum-lethal computed through them (c.5, c.4.a); Tank-first / Backline-last as validity gates; contradictory requirements → choose one (c.8).

**Scoring (467–472):**
```ts
type ScoreMethod = "conquer"|"hold";
/** CR 471.1.b — restrictions gate CONQUER ONLY; Hold is unrestricted (471.1.a.1) */
function resolveScore(p:PlayerState, method:ScoreMethod, ctx:FormatContext, scoredEveryBattlefieldThisTurn:boolean):
  { gainPoint:boolean; drawCardInstead:boolean };
// if method==="conquer" && p.points >= ctx.victoryScore-1:
//    scoredEveryBattlefieldThisTurn ? gainPoint : drawCardInstead
```
**Win check (472) runs as Cleanup task #1 (323.1): `points >= victoryScore && points > every opponent`** — strict majority, at Cleanup, not on point-landing.

## 11. Kernel signatures

```ts
// --- Layers ---
function applyLayers(state:GameState): GameState;                       // CR 476 fixed-point
function currentMight(state:GameState, objectId:ObjectId): number;      // through layers + buffs (703)
function isMighty(state:GameState, objectId:ObjectId): boolean;         // CR 708 (>=5); non-board uses printed (711)

// --- Turn / chain engine (HOT FEPR, CR 334) ---
function handleOutstandingTasks(state:GameState): GameState;            // H
function finalize(state:GameState): GameState;                          // F — FIFO; Units/Gear/Adds resolve immediately (337.2)
function execute(state:GameState, action:CandidateAction): GameState;   // E
function passPriority(state:GameState): GameState;                      // P
function resolveTop(state:GameState): GameState;                        // R — LIFO (340.1)
function runCleanup(state:GameState, special?:"combat"|"ending"): GameState;  // CR 323 seven-step order

// --- Legality (CR 358) ---
function legalCandidateActions(state:GameState, player:PlayerId, ctx:FormatContext): CandidateAction[];
function checkLegality(state:GameState, item:PendingChainItem): { legal:boolean; reasons:string[] };
function isTimingPermitted(state:GameState, ability:TimingPermission): boolean;   // CR 310 four-state gate

// --- Costs (CR 356–357) ---
function determineTotalCost(state:GameState, item:PendingChainItem): Cost;  // base-mods → additional → increases → component-then-total discounts
function canPay(state:GameState, player:PlayerId, cost:Cost): boolean;

// --- Combat (CR 463–466) ---
function legalDamageAssignments(state:GameState, from:PlayerId): DamageAssignment[];  // enforces 465.2.c.3–.9
function resolveCombatDamage(state:GameState, a:DamageAssignment[]): GameState;       // assign-all-then-deal-simultaneously

// --- Scoring ---
function resolveScore(...): { gainPoint:boolean; drawCardInstead:boolean };  // CR 471
function checkWin(state:GameState, ctx:FormatContext): PlayerId | null;      // CR 472 (called from Cleanup #1)

// --- Game actions (CR 413–444): one function per action, CR-named ---
// draw exhaust ready recycle deal heal play move hide discard stun reveal counter buff
// banish kill add channel burnOut double swap attach detach predict prevent replace create
// burn empower disempower skip pay
```

## 12. Deliberately out of scope for the v2 kernel
- **Effect programs per card** — Phase 4, against the Supabase inventory.
- **Engine inference** (`inferEvents`, cascade, corpus) — RiftEngine, imports Core, never the reverse.
- **Tournament policy** (OPL, penalties, judges) — not modeled (Part 6 §2).
- **FFA3/FFA4 specifics** beyond `FormatContext` — additive later.

## 13. Handoff to Phase 2 (the diff)

Buckets to sort the legacy `src/lib/core/` into:
- **Match** — keep behavior, **rename to CR vocabulary** (e.g. damage-clears → Combat/Ending Cleanup "Heal all Units"; LIFO resolution; simultaneous damage).
- **Missing** — build fresh: Layers, Priority/Focus, HOT FEPR + Tasks/Cleanup, ability taxonomy, replacement effects, the 32 actions, XP, rune pool, Burn Out, per-format legality, Attachment/Inactive, targeting/untargetability, Facedown Zones, Additional Turns.
- **Conflict** — drop the test, rebuild as-if-missing (per your instruction): flat turn-phase enum; `WinningLine` taxonomy; over-assignment/Tank-spill; instant win-on-point; champion-outside-40; mulligan shuffle-back; `keywords: string[]`; single-boolean bans; pre-resolved `[C]`.

**Open adjudications register: 14 question families** carried forward for your post-rebuild re-ruling (Parts 2 §7, 3 §12, 4 §7, 5 §9, 6 §6). Prior answers stay quarantined until re-ruled against this model.
