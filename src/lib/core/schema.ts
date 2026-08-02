// RiftCore schema (v2). Pure types — no imports beyond TS.
//
// Clean-room rebuild against Riftbound Core Rules RUP4 (2026-07-16) +
// Tournament Rules RUP4. See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part1..7.md
// for the full derivation and docs/design/riftcore-v2/RiftCore_v2_Phase2_Diff.md
// for what changed vs the legacy (v1) model.
//
// Naming charter (binding — Part 7 §0):
//  1. CR nouns/verbs only.
//  2. "Play" only as the CR uses it (349-353, 419) — a candidate move at a
//     decision point is CandidateAction, never Play.
//  3. The 32 Game Actions (413-444) are the only effect verbs.
//  4. Every exported symbol cites its rule.
//  5. Where the CR distinguishes, the code distinguishes (Move != Recall, etc).
//
// This file is the shared contract every other Riftbound module (RiftEngine,
// RiftLab, RiftCoach, RiftIQ) imports. It intentionally has zero dependency
// on the rest of this app (no React, no storage, no screens/, no puzzle
// types) so it can be lifted into a standalone package.

// ---------------------------------------------------------------------------
// 1. Identity & primitives (Part 7 §1)
// ---------------------------------------------------------------------------

/** CR 134.2 — color-canonical, not first-letter. */
export type Domain = "Fury" | "Calm" | "Mind" | "Body" | "Chaos" | "Order";

/** CR 163, 805.1.a — symbolic; never pre-resolve [C]/[A] (Part 6 §4). */
export type PowerSymbol =
  | { kind: "domain"; domain: Domain }
  | { kind: "selfDomain" } // [C]
  | { kind: "any" }; // [A]

export type Cost = { energy: number; power: PowerSymbol[] };

export type PlayerId = string;
/** CR 124 — a NEW ObjectId is minted whenever an object crosses to/from a Non-Board Zone. */
export type ObjectId = string;
/** Catalog identity (cards.json / Supabase). */
export type CardId = string;

// ---------------------------------------------------------------------------
// 2. Zones & locations (Part 7 §2; CR 105-108, 197)
// ---------------------------------------------------------------------------

export type BoardZone =
  | { kind: "base"; player: PlayerId } // CR 107.1 — a Location
  | { kind: "battlefield"; battlefieldId: ObjectId } // CR 107.2 — a Location
  | { kind: "facedownZone"; battlefieldId: ObjectId } // CR 107.3 — NOT a Location
  | { kind: "legendZone"; player: PlayerId }; // CR 107.4 — NOT a Location

export type NonBoardZone =
  | { kind: "chain" } // CR 108.1
  | { kind: "trash"; player: PlayerId } // CR 108.2 (unordered, public)
  | { kind: "championZone"; player: PlayerId } // CR 108.3
  | { kind: "mainDeck"; player: PlayerId } // CR 108.4 (order Secret)
  | { kind: "runeDeck"; player: PlayerId } // CR 108.5 (order Secret)
  | { kind: "banishment"; player: PlayerId } // CR 108.6
  | { kind: "hand"; player: PlayerId }; // CR 108.7 (contents Private, COUNT public)

export type Zone = BoardZone | NonBoardZone;
/** CR 197 — only these are Locations (Move Origins/Destinations). */
export type Location = Extract<BoardZone, { kind: "base" | "battlefield" }>;

/** CR 128 */
export type Privacy = "secret" | "private" | "public";

// ---------------------------------------------------------------------------
// 3. Game Objects (Part 7 §3; CR 119-127, 178, 185)
// ---------------------------------------------------------------------------

/** CR 133 */
export type CardCategory = "unit" | "gear" | "spell" | "rune" | "battlefield" | "legend";
/** CR 133.7 */
export type Supertype = "champion" | "signature";

/**
 * CR 124.2 — non-exhaustive per CR; extend additively.
 *
 * Declared as a runtime list so the audit in `predicates.test.ts` can assert
 * what is NOT here. In particular **Contested must never be an ObjectStatus**:
 * CR 190.3.d says Game Effects cannot reference Contested, and every member of
 * this union is reachable by an effect through `{op:"hasStatus"}`. Contested
 * lives on `GameState.contestedBattlefields` as kernel-internal bookkeeping.
 */
export const OBJECT_STATUSES = [
  "attached",
  "attacker",
  "defender",
  "buffed",
  "controlled",
  "empowered",
  "equipped",
  "exhausted",
  "facedown",
  "ready",
  "replaced",
  "revealed",
  "stunned",
] as const;

export type ObjectStatus = (typeof OBJECT_STATUSES)[number];

/** How long a temporary modification/grant lasts. CR 801.3.a.3 — default = while it stays in its current zone. */
export type Duration = "thisTurn" | "thisCombat" | "whileInZone" | "permanent" | { untilCleanupTag: string };

/** CR 801.3 (duration-bearing keyword grant). */
export interface GrantedKeyword {
  keyword: Keyword;
  value?: number;
  duration: Duration;
  sourceObjectId: ObjectId;
}

/**
 * CR 437 / 465.2.c.4.a — one assignment-time damage replacement.
 *
 * `prevent` carries its own residual: it DECREMENTS as it absorbs (437.3),
 * and `"all"` is never lethal (437.5.b). `multiply` is the 465.2.c.4.a
 * "Double all damage that would be dealt to it" shape.
 */
export type DamageReplacement =
  | { kind: "prevent"; value: number | "all" }
  | { kind: "multiply"; factor: number };

export interface GameObject {
  objectId: ObjectId;
  cardId: CardId | null; // null = identity unknown from this perspective
  /**
   * CR 132.4 — the full "Name, Subtitle" comma form IS the card's name for all
   * purposes. Carried on the object, like `printedKeywords` and `domains`, so
   * the kernel never reaches into the card catalog.
   *
   * This is NOT derivable from `cardId`. Reprints share a name across sets with
   * different ids (TR 601.2.a makes a card legal if it merely shares a name
   * with one from a legal set — a rule that only exists because that happens),
   * and our ids are set-prefixed. Every name-keyed rule — the 3-per-name copy
   * limit (CR 103.2.b), name-based Chosen Champion status (CR 103.2.a.3),
   * Unique (CR 825), and naming a card (CR 760-763) — is wrong under id
   * comparison. Empty string for a nameless object (an anonymous token).
   */
  name: string;
  owner: PlayerId; // CR 127
  controller: PlayerId | null; // CR 188; null only for uncontrolled battlefields
  isToken: boolean; // CR 185.1 — immutable nature
  categories: CardCategory[]; // CR 178 — multi-type objects hold ALL type properties
  supertypes: Supertype[];
  tags: string[]; // CR 133.8 — no innate meaning
  zone: Zone;
  privacy: Privacy;
  statuses: Set<ObjectStatus>;
  printedMight: number | null; // units only; non-board zones use printed Might (CR 711)
  /**
   * CR 801 — the card's PRINTED keywords, carried on the object so the kernel
   * never has to reach into the card catalog. Keyword resolution is printed
   * union granted (see predicates.ts `resolveKeywords`); reading only the
   * granted list was a legacy defect that made printed keywords invisible.
   * `value` carries the X of a valued keyword (Assault 3); absent means the
   * CR default of 1 for valued keywords (807/809/814/823).
   */
  printedKeywords: { keyword: Keyword; value?: number }[];
  /** CR 134.2 — the card's domains, mirrored onto the object for the same catalog-free reason. */
  domains: Domain[];
  damage: number; // CR 417 — units only
  buffCount: 0 | 1; // CR 702.3 — hard cap of one
  counters: Record<string, number>; // CR 741-749 (no controller)
  attachedTo: ObjectId | null; // CR 716-719
  attachments: ObjectId[]; // this object as TopMostCard
  /**
   * CR 465.2.c.5 — replacement effects that apply AT ASSIGNMENT of damage,
   * as an ORDERED list. Order is the affected unit's CONTROLLER's choice and
   * is load-bearing: a 2-Might unit with prevent 2 and a doubler takes 2
   * damage if prevent goes first and 4 if the doubler does.
   *
   * This replaced a single `preventValue: number | "all" | null`, which could
   * only ever reduce and so could not express "Double all damage dealt to it"
   * (465.2.c.4.a) at all. See Model Corrections 001, adjudications 3-5.
   */
  damageReplacements: DamageReplacement[];
  grantedKeywords: GrantedKeyword[]; // CR 801.3
}

// ---------------------------------------------------------------------------
// 4. Keywords (Part 7 §4; CR 800-829)
// ---------------------------------------------------------------------------

export type Keyword =
  | "Accelerate"
  | "Action"
  | "Assault"
  | "Deathknell"
  | "Deflect"
  | "Ganking"
  | "Hidden"
  | "Legion"
  | "Reaction"
  | "Shield"
  | "Tank"
  | "Temporary"
  | "Vision"
  | "Equip"
  | "QuickDraw"
  | "Repeat"
  | "Weaponmaster"
  | "Ambush"
  | "Hunt"
  | "Level"
  | "Unique"
  | "Backline"
  | "Empower"
  | "Empowered"
  | "Flow";

/** Part 5 §1 — every keyword carries its ability class + stacking rule. */
export type KeywordClass =
  | "passive"
  | "triggered"
  | "activated"
  | "permissive"
  | "dependent"
  | "optionalAdditionalCost"
  | "deckConstraint"
  | "prerequisite";
export type KeywordStacking = "sums" | "redundant" | "separateInstances" | "multipleAbilities" | "na";
export interface KeywordDef {
  keyword: Keyword;
  class: KeywordClass;
  stacking: KeywordStacking;
  valued: boolean;
  cr: string;
}

/** Canonical keyword table — Part 5 §2, stacking rules per §1. */
export const KEYWORD_DEFS: Record<Keyword, KeywordDef> = {
  Accelerate: { keyword: "Accelerate", class: "optionalAdditionalCost", stacking: "redundant", valued: false, cr: "805" },
  Action: { keyword: "Action", class: "permissive", stacking: "na", valued: false, cr: "806" },
  Assault: { keyword: "Assault", class: "passive", stacking: "sums", valued: true, cr: "807" },
  Deathknell: { keyword: "Deathknell", class: "triggered", stacking: "separateInstances", valued: false, cr: "808" },
  Deflect: { keyword: "Deflect", class: "passive", stacking: "sums", valued: true, cr: "809" },
  Ganking: { keyword: "Ganking", class: "passive", stacking: "redundant", valued: false, cr: "810" },
  Hidden: { keyword: "Hidden", class: "prerequisite", stacking: "redundant", valued: false, cr: "811" },
  Legion: { keyword: "Legion", class: "dependent", stacking: "na", valued: false, cr: "812" },
  Reaction: { keyword: "Reaction", class: "permissive", stacking: "na", valued: false, cr: "813" },
  Shield: { keyword: "Shield", class: "passive", stacking: "sums", valued: true, cr: "814" },
  Tank: { keyword: "Tank", class: "passive", stacking: "redundant", valued: false, cr: "815" },
  Temporary: { keyword: "Temporary", class: "triggered", stacking: "redundant", valued: false, cr: "816" },
  Vision: { keyword: "Vision", class: "triggered", stacking: "separateInstances", valued: false, cr: "817" },
  Equip: { keyword: "Equip", class: "activated", stacking: "multipleAbilities", valued: true, cr: "818" },
  QuickDraw: { keyword: "QuickDraw", class: "triggered", stacking: "redundant", valued: false, cr: "819" },
  Repeat: { keyword: "Repeat", class: "optionalAdditionalCost", stacking: "separateInstances", valued: true, cr: "820" },
  Weaponmaster: { keyword: "Weaponmaster", class: "triggered", stacking: "separateInstances", valued: false, cr: "821" },
  Ambush: { keyword: "Ambush", class: "passive", stacking: "redundant", valued: false, cr: "822" },
  Hunt: { keyword: "Hunt", class: "triggered", stacking: "sums", valued: true, cr: "823" },
  Level: { keyword: "Level", class: "dependent", stacking: "na", valued: true, cr: "824" },
  Unique: { keyword: "Unique", class: "deckConstraint", stacking: "na", valued: false, cr: "825" },
  Backline: { keyword: "Backline", class: "passive", stacking: "redundant", valued: false, cr: "826" },
  Empower: { keyword: "Empower", class: "activated", stacking: "multipleAbilities", valued: false, cr: "827" },
  Empowered: { keyword: "Empowered", class: "dependent", stacking: "na", valued: false, cr: "828" },
  Flow: { keyword: "Flow", class: "passive", stacking: "na", valued: false, cr: "829" },
};

// ---------------------------------------------------------------------------
// 5. Abilities (Part 7 §5; CR 360-406)
// ---------------------------------------------------------------------------

export type AbilityKind = "passive" | "replacement" | "activated" | "triggered" | "reflexive" | "delayed" | "linked";

// Predicate / EventPredicate / Selector are DATA, not closures.
//
// Phase 4 loads ability definitions from Supabase, and functions cannot
// round-trip through a database — closures would make abilities
// unpersistable. Beyond serialization, data buys three things closures
// can't: abilities become INSPECTABLE (RiftIQ can explain *why* a line is
// legal, not just that it is), DIFFABLE (RiftEngine can compare a
// reconstructed ability against the catalog), and COVERAGE-VISIBLE (a card
// that can't be expressed fails loudly against the vocabulary instead of
// being silently papered over with a lambda).
//
// The vocabulary below is expected to be INCOMPLETE. Phase 4 will find cards
// needing ops that aren't here; that is by design — the unions are additive.
// When a card can't be expressed, extend the union and file a schema-gap
// fragment per docs/design/RiftCore_Schema_Change_Protocol.md. There is
// deliberately NO escape hatch (no `{ op:"custom"; fn:... }`) — that would
// reintroduce exactly the un-serializable, invisible-gap problem this shape
// removes.
//
// These are interpreted in exactly one place: ./predicates.ts.

/** Refers to a player without naming one, so an ability is reusable across controllers. */
export type PlayerRef =
  | { kind: "sourceController" }
  | { kind: "turnPlayer" }
  | { kind: "opponentOf"; of: PlayerRef }
  | { kind: "explicit"; player: PlayerId };

/** Resolves the object(s) a Layer/targeted effect applies to (CR 355.6-.10, 477). */
export type Selector =
  | { kind: "self" }
  | { kind: "target"; index: number } // CR 355.6 — chosen at the choices step
  | { kind: "unitsAtLocation"; location: Location }
  | { kind: "unitsControlledBy"; player: PlayerRef }
  | { kind: "objectsInZone"; zone: Zone["kind"]; player?: PlayerRef }
  | { kind: "attachedTo" } // CR 716-719 — TopMostCard
  | { kind: "sourceController" }
  | { kind: "filter"; from: Selector; where: Predicate };

/** A predicate over game state (e.g. a passive ability's "while" condition, CR 363-366). */
export type Predicate =
  // object properties
  | { op: "hasKeyword"; keyword: Keyword } // CR 801 — printed AND granted; see predicates.ts
  | { op: "hasStatus"; status: ObjectStatus }
  | { op: "isCategory"; category: CardCategory }
  | { op: "hasSupertype"; supertype: Supertype }
  | { op: "hasTag"; tag: string }
  | { op: "hasDomain"; domain: Domain }
  | { op: "nameIs"; name: string } // CR 132.4 — matches GameObject.name, NOT cardId (reprints share a name)
  | { op: "mightAtLeast"; value: number }
  | { op: "mightAtMost"; value: number }
  | { op: "isMighty" } // CR 708 — derived (>= 5), NOT a keyword
  | { op: "isAtLocation"; location: Location }
  | { op: "controlledBy"; player: PlayerRef }
  | { op: "hasDesignation"; designation: "attacker" | "defender" } // CR 464.2.c
  // player / game properties
  | { op: "xpAtLeast"; player: PlayerRef; value: number } // CR 824 Level
  | { op: "playedCardThisTurn"; player: PlayerRef } // CR 812 Legion
  | { op: "countAtLeast"; from: Selector; value: number }
  // composition
  | { op: "and"; terms: Predicate[] }
  | { op: "or"; terms: Predicate[] }
  | { op: "not"; term: Predicate };

/** CR 367-375 — what a replacement effect intercedes on. */
export type EventPredicate =
  | { on: "deal"; to?: Predicate; from?: Predicate } // CR 417
  | { on: "kill"; object?: Predicate } // CR 428
  | { on: "draw"; player?: PlayerRef } // CR 413
  | { on: "enterZone"; zone: Zone["kind"]; object?: Predicate }
  | { on: "becomeStatus"; status: ObjectStatus; object?: Predicate } // CR 441.2.a, 709
  | { on: "score"; method: ScoreMethod; player?: PlayerRef } // CR 469
  | { on: "burnOut"; player?: PlayerRef } // CR 431
  | { on: "turnProcedure"; phase: Phase; step?: Step }; // CR 443 Skip

/** One step of an ability's effect (CR 135.2.b — game action + complement); opaque to the kernel. */
export type Instruction = { description: string };
/** A resolved set of "as I am played" choices (CR 355) — opaque payload keyed by choice id. */
export type ResolvedChoices = Record<string, unknown>;

/** CR 366/385 — self-describing active zones for off-Board abilities. */
export interface AbilityBase {
  abilityId: string;
  kind: AbilityKind;
  sourceObjectId: ObjectId;
  activeZones: Zone["kind"][];
}

export interface PassiveAbility extends AbilityBase {
  kind: "passive";
  condition?: Predicate;
  layerEffects: LayerEffect[];
}
export interface ActivatedAbility extends AbilityBase {
  kind: "activated";
  cost: Cost;
  effect: Instruction[];
  /** CR 381 — own turn + Open State only, unless Action/Reaction granted. */
  timing: TimingPermission;
}
export interface TriggeredAbility extends AbilityBase {
  kind: "triggered";
  /** CR 383.2.a.1 — the adjacent if-clause belongs to the CONDITION, not the effect. */
  condition: Predicate;
  effect: Instruction[];
  optionalAtChoiceStep: boolean; // CR 402.1
}
export interface ReplacementEffect extends AbilityBase {
  kind: "replacement";
  appliesTo: EventPredicate;
  replacement: Instruction[];
  usageLimit?: { perTurn: number }; // CR 371
  optional: boolean;
}
export interface ReflexiveTrigger extends AbilityBase {
  kind: "reflexive";
  condition?: Predicate;
  instances: number; // CR 387
}
export interface DelayedAbility extends AbilityBase {
  kind: "delayed";
  window: Duration; // CR 389-392
  inner: Ability;
}
export interface LinkedAbility extends AbilityBase {
  kind: "linked";
  componentIds: string[]; // CR 393-397
}

export type Ability =
  | PassiveAbility
  | ActivatedAbility
  | TriggeredAbility
  | ReplacementEffect
  | ReflexiveTrigger
  | DelayedAbility
  | LinkedAbility;

/** CR 806/813 */
export type TimingPermission = { openStateOwnTurnOnly: boolean; action: boolean; reaction: boolean };

// ---------------------------------------------------------------------------
// 6. Turn, states, Priority/Focus (Part 7 §6; CR 300-317)
// ---------------------------------------------------------------------------

export type Phase = "awaken" | "beginning" | "channel" | "draw" | "main" | "ending"; // CR 315-317
export type Step = "beginningStep" | "scoringStep" | "endingStep" | "expirationStep"; // CR 315.2, 317
export type ShowdownState = "neutral" | "showdown"; // CR 308
export type OpenState = "open" | "closed"; // CR 309

export interface TurnState {
  turnPlayer: PlayerId; // CR 304
  turnOrder: PlayerId[]; // CR 115.1 (looping queue)
  additionalTurns: PlayerId[]; // CR 734-738 (queue-inserted, order unchanged)
  phase: Phase;
  step?: Step;
  showdownState: ShowdownState;
  openState: OpenState; // CR 310 — the four states
  priority: PlayerId | null; // CR 312
  focus: PlayerId | null; // CR 313 (null in Neutral, 313.5)
}

// ---------------------------------------------------------------------------
// 7. Chain, Tasks, HOT FEPR (Part 7 §7; CR 325-348)
// ---------------------------------------------------------------------------

export interface PendingChainItem {
  itemId: string;
  objectId: ObjectId | null;
  controller: PlayerId;
  kind: "card" | "ability";
  addedSeq: number;
}
export interface FinalizedChainItem {
  itemId: string;
  objectId: ObjectId | null;
  controller: PlayerId;
  choices: ResolvedChoices;
  totalCost: Cost;
  finalizedSeq: number;
}

export interface Chain {
  pending: PendingChainItem[];
  finalized: FinalizedChainItem[];
} // CR 328-330
// FIFO finalize (337.1.b) = min addedSeq; LIFO resolve (340.1) = max finalizedSeq

export type OutstandingTask =
  | { kind: "cleanup"; special?: "combat" | "ending" } // CR 318-324
  | { kind: "phaseTask"; phase: Phase; step?: Step }
  | { kind: "combatStep"; step: 1 | 2 | 3 } // CR 463-466
  | { kind: "triggerToChain"; abilityId: string; controller: PlayerId };

export interface ChainEngineState {
  tasks: OutstandingTask[];
  chain: Chain;
  showdown: ShowdownContext | null;
}
export interface ShowdownContext {
  battlefieldId: ObjectId;
  isCombat: boolean;
  attacker?: PlayerId;
  defender?: PlayerId;
  openedBy: "trigger" | "add" | "play";
} // CR 346.1

// ---------------------------------------------------------------------------
// 8. Layers (Part 7 §8; CR 473-480)
// ---------------------------------------------------------------------------

export type LayerNumber = 1 | 2 | 3; // 1 Trait-Altering, 2 Ability-Altering, 3 Arithmetic

export interface LayerEffect {
  layer: LayerNumber;
  sourceObjectId: ObjectId;
  targetSelector: Selector;
  /** Targets chosen at the choices step, resolved for a `{kind:"target"}` selector (CR 355.6). */
  targets?: ObjectId[];
  op: TraitOp | AbilityOp | ArithmeticOp;
  fromPassive: boolean; // CR 477.3.b — passives do NOT snapshot
  /**
   * CR 477.3.b — the limited value is computed "at the time of its
   * application", and an application is PER OBJECT: one "-4 [M] to a min of 1"
   * over a 2-Might and a 9-Might unit remembers -1 for the first and -4 for
   * the second. Keyed by ObjectId for exactly that reason; a scalar applied
   * one object's snapshot to every target. See Model Corrections 001,
   * adjudication 2.
   */
  snapshotted?: Record<ObjectId, number>;
  duration: Duration;
  timestamp: number;
  /**
   * Set when this effect was emitted by a conditional PassiveAbility. CR 476.2
   * requires those to be re-derived on every fixed-point iteration, so
   * `applyLayers` owns them: it emits them while the condition holds and
   * withdraws them when it stops. Author-supplied effects leave this undefined
   * and are never touched.
   */
  fromAbilityId?: string;
}
export type ArithmeticOp = { attr: "might" | "energyCost" | "powerCost"; delta: number; minimum?: number; maximum?: number };
export type TraitOp =
  | { set: "might" | "name" | "type" | "tags" | "controller" | "cost" | "domain"; value: unknown }
  | { copyFrom: ObjectId };
export type AbilityOp = { grantKeyword?: Keyword; removeKeyword?: Keyword; appendText?: string; removeText?: string };

// ---------------------------------------------------------------------------
// 9. Players & format context (Part 7 §9)
// ---------------------------------------------------------------------------

export interface PlayerState {
  playerId: PlayerId;
  points: number;
  xp: number; // CR 728-733 (public, uncapped, not a Game Object)
  runePool: { energy: number; power: { domain: Domain; universal: boolean }[] }; // CR 165-167
  handCount: number; // CR 108.7.e — public even when contents are private
  legendObjectId: ObjectId;
  /**
   * CR 103.2.a.3 — Chosen Champion status is NAME-based, not card-based: any
   * Champion Unit sharing the chosen card's name is also your Chosen Champion,
   * in any zone, for every rule and effect that cares. Stored as the name (not
   * a CardId) so a reprint copy is recognized; see `GameObject.name`.
   */
  chosenChampionName: string;
  scoredBattlefieldsThisTurn: Set<ObjectId>; // CR 470 — once per BF per turn, both methods
}

/** TR 104.1 — tournament rules override CR in competition; kernel takes a context. */
export interface FormatContext {
  mode: "1v1" | "2v2" | "ffa3" | "ffa4"; // CR 481-488
  format: "constructed" | "sealed" | "draft";
  victoryScore: number;
  battlefieldCount: number;
  mainDeckMin: number; // 40 constructed / 25 sealed / 20 draft
  /** TR 402.1 — constructed is EXACTLY 40, so min === max. null = no upper bound (limited formats). */
  mainDeckMax: number | null;
  championCountsInMain: boolean; // TR 402.1 constructed = true
  uniqueApplies: boolean; // TR 602.4.a.6.a — false in sealed/draft
  copyLimitApplies: boolean;
  legality: (cardId: CardId) => "legal" | "banned";
}

// ---------------------------------------------------------------------------
// 10. Combat & scoring (Part 7 §10; CR 459-472)
// ---------------------------------------------------------------------------

export interface CombatState {
  // CR 459-466
  battlefieldId: ObjectId;
  attacker: PlayerId; // CR 464.2.c.1 — the CONTEST APPLIER
  defender: PlayerId;
  step: 1 | 2 | 3;
}
export interface DamageAssignment {
  fromPlayer: PlayerId;
  /**
   * `raw` is what the assigning player spends from their Might pool, and it is
   * what the pool is conserved in — a doubler on the receiving unit does NOT
   * let the assigner spend more. It is deliberately NOT the CR's "assigned"
   * figure, which is post-replacement and can exceed the pool (raw 3 -> 6
   * assigned under double-then-prevent). See Model Corrections 001 Addendum A;
   * the CR overloads "assigned" for both, which is what made it ambiguous.
   */
  assignments: { targetObjectId: ObjectId; raw: number }[];
}

export type ScoreMethod = "conquer" | "hold";

// ---------------------------------------------------------------------------
// 11. GameState — the aggregate root
// ---------------------------------------------------------------------------
// Not explicitly assembled in Part 7 (its kernel signatures thread `state:
// GameState` through every function but the type itself is left implicit).
// Constructed here from what §3/§6/§7/§8/§9/§10 require it to hold: every
// Game Object (board and non-board) keyed by id, per-player aggregate state,
// deck/rune-deck ORDER (Zone alone can't express "top of deck" — Secret zones
// still need a real order for Draw/Recycle/Predict/Channel/Burn to operate
// on), turn/chain/layer/ability state, and the active format.

export interface GameState {
  objects: Record<ObjectId, GameObject>;
  players: Record<PlayerId, PlayerState>;
  /** Ordered battlefield objectIds (CR 103.4.c — unique names, set order at setup). */
  battlefieldIds: ObjectId[];
  /** CR 108.4/108.5 — order is Secret in-fiction but the engine must track it; index 0 = top. */
  deckOrder: Record<PlayerId, ObjectId[]>;
  runeDeckOrder: Record<PlayerId, ObjectId[]>;
  turn: TurnState;
  chainEngine: ChainEngineState;
  /** CR 323.7 — battlefields marked Showdown Staged by Cleanup task 6 (persists while Contested + contester present). */
  stagedShowdowns: ObjectId[];
  /** CR 323.8 / 461 — battlefields marked Combat Staged by Cleanup task 7 (persists while both sides present). */
  stagedCombats: ObjectId[];
  /** CR 190.3 — battlefields currently Contested. Kernel-internal: Game Effects cannot reference Contested (190.3.d). */
  contestedBattlefields: ObjectId[];
  /** Effects awaiting the next Layers fixed-point pass (CR 473-480). */
  activeLayerEffects: LayerEffect[];
  abilities: Record<string, Ability>;
  format: FormatContext;
  /** CR 812 — cards played per player this turn; Legion keys off "played another card this turn". */
  cardsPlayedThisTurn: Record<PlayerId, number>;
  /** Monotonic counter — LayerEffect.timestamp / same-layer default ordering (CR 480). */
  nextTimestamp: number;
}

// ---------------------------------------------------------------------------
// 12. CandidateAction & decision points — RiftIQ-facing (Part 7 §0.2)
// ---------------------------------------------------------------------------
// The legacy `Play` type is retired per the naming charter (item 2): "Play"
// is reserved for the CR's own sense (349-353, 419). A candidate move at a
// decision point is a CandidateAction. Kept deliberately close to the legacy
// `Play` shape (updated to ObjectId/Location) — redesigning RiftIQ's puzzle
// surface is out of scope for this PR (Phase 3 §5: "do NOT notify or adapt
// for other modules").

export type CandidateAction =
  | { kind: "play"; objectId: ObjectId; targets: ObjectId[]; location?: Location; repeat?: boolean }
  | { kind: "activate"; abilityId: string; targets: ObjectId[]; repeat?: boolean }
  | { kind: "standardMove"; objectId: ObjectId; to: Location }
  | { kind: "attack"; attackerObjectIds: ObjectId[]; battlefieldId: ObjectId }
  | { kind: "pass" };

export interface Candidate {
  id: string;
  action: CandidateAction | CandidateAction[];
  isCorrect: boolean;
}

export interface DecisionPoint {
  snapshot: MatchStateSnapshot;
  goal?: string;
  candidates: Candidate[];
}

// ---------------------------------------------------------------------------
// 13. Match snapshot envelope
// ---------------------------------------------------------------------------

export type MatchStateSnapshot = {
  state: GameState;
  perspective?: PlayerId;
  completeness?: "full" | "partial";
  confidence?: number;
  provenance?: {
    source: "authored" | "field" | "player" | "selfplay";
    fidelity?: number;
  };
};

// ---------------------------------------------------------------------------
// 14. GameEvent — the event-sourced substrate (rewritten for the GameObject
// model). A GameState snapshot is a fold of a GameEvent[] via applyEvent.
// Every variant maps to one of the 32 Game Actions (413-444) plus the
// minimal structural events (turn/chain/priority) needed to replay a real
// captured match. See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part4.md §5.
// ---------------------------------------------------------------------------

export type GameEvent =
  /** CR 124 — an object enters existence, or crosses to/from a Non-Board Zone (new ObjectId). */
  | { type: "objectCreated"; objectId: ObjectId; cardId: CardId | null; owner: PlayerId; controller: PlayerId | null; zone: Zone }
  | { type: "objectMoved"; objectId: ObjectId; to: Zone; newObjectId?: ObjectId }
  | { type: "drew"; player: PlayerId; objectIds: ObjectId[] } // Draw 413
  | { type: "exhausted"; objectId: ObjectId } // Exhaust 414
  | { type: "readied"; objectId: ObjectId } // Ready 415
  | { type: "recycled"; objectId: ObjectId; to: "mainDeck" | "runeDeck" } // Recycle 416
  | { type: "dealt"; sourceObjectId: ObjectId | null; targetObjectId: ObjectId; amount: number } // Deal 417
  | { type: "healed"; objectId: ObjectId; amount: number } // Heal 418
  | {
      type: "played";
      objectId: ObjectId;
      player: PlayerId;
      targets?: ObjectId[];
      battlefieldId?: ObjectId;
      fromZone?: Zone;
      costPaid?: Cost;
    } // Play 419
  | { type: "unitMoved"; objectId: ObjectId; to: Location } // Move 420
  | { type: "hidden"; objectId: ObjectId; battlefieldId: ObjectId } // Hide 421
  | { type: "discarded"; objectId: ObjectId } // Discard 422
  | { type: "stunned"; objectId: ObjectId } // Stun 423
  | { type: "revealed"; objectId: ObjectId; cardId: CardId; toPlayer: PlayerId; source: string } // Reveal 424 (+ belief-state, G1)
  | { type: "countered"; objectId: ObjectId } // Counter 425
  | { type: "buffed"; objectId: ObjectId; applied: boolean } // Buff 426 (426.1.c — applied:false = already-buffed no-op)
  | { type: "banished"; objectId: ObjectId } // Banish 427
  | { type: "killed"; objectId: ObjectId } // Kill 428
  | { type: "added"; player: PlayerId; energy: number; power: PowerSymbol[] } // Add 429
  | { type: "channeled"; objectId: ObjectId; player: PlayerId } // Channel 430
  | { type: "burnedOut"; player: PlayerId; opponentAwarded: PlayerId } // Burn Out 431
  | { type: "doubled"; objectId: ObjectId; attr: "might" | "energyCost" | "powerCost" } // Double 432
  | { type: "swapped"; objectIdA: ObjectId; objectIdB: ObjectId; attr: "might" } // Swap 433
  | { type: "attached"; objectId: ObjectId; hostObjectId: ObjectId } // Attach 434
  | { type: "detached"; objectId: ObjectId } // Detach 435
  | { type: "predicted"; player: PlayerId; recycled: ObjectId[]; kept: ObjectId[] } // Predict 436
  | { type: "prevented"; objectId: ObjectId; value: number | "all" } // Prevent 437
  | { type: "replaced"; objectId: ObjectId; tokenObjectId: ObjectId } // Replace 438
  | { type: "burned"; player: PlayerId; objectIds: ObjectId[] } // Burn 440
  | { type: "empowered"; objectId: ObjectId } // Empower 441
  | { type: "disempowered"; objectId: ObjectId } // Disempower 442
  | { type: "skipped"; description: string } // Skip 443
  | { type: "paid"; player: PlayerId; cost: Cost } // Pay 444
  | { type: "pointScored"; player: PlayerId; method: ScoreMethod; battlefieldId?: ObjectId; drewCardInstead: boolean } // Scoring 471
  | { type: "gameWon"; player: PlayerId } // CR 472
  | { type: "phaseChanged"; player: PlayerId; phase: Phase; step?: Step }
  | { type: "priorityChanged"; player: PlayerId | null }
  | { type: "focusChanged"; player: PlayerId | null }
  | { type: "cleanupRan"; special?: "combat" | "ending" }
  | { type: "gameStarted"; firstPlayer: PlayerId }
  | { type: "mulligan"; player: PlayerId; setAsideObjectIds: ObjectId[] };

// ---------------------------------------------------------------------------
// 15. CapturedMatch — versioned container for a persisted match. RiftNotes
// produces this; every consumer keys migrations off `schemaVersion` (see
// ./migrate.ts). See docs/design/RiftCore_Match_Event_Schema.md.
// ---------------------------------------------------------------------------

// Bump on every schema change; migrations in ./migrate.ts chain off this.
export const CURRENT_SCHEMA_VERSION = 2;

// Orthogonal capture tags. Extensible: add a member when a genuinely new
// capture characteristic appears.
export type CaptureTag =
  | "physical"
  | "digital" // medium
  | "first-person"
  | "third-person" // perspective
  | "fog-of-war"
  | "partial" // hidden-state visibility
  | "reExaminable"
  | "not-reExaminable"; // is the source machine/human re-checkable?

export type CapturedMatch = {
  schemaVersion: number;
  gameId: string;
  reviewerId: string;
  captureProfile: CaptureTag[];
  initialState: GameState;
  events: GameEvent[];
  sourceRef?: { kind: "vod" | "screenshots" | "actionlog" | "none"; url?: string };
  turnSourceRefs?: Record<number, string>;
  meta?: { source?: "field" | "player" | "selfplay"; capturedAt?: string; perspective?: PlayerId };
  captureMeta?: {
    lossy?: boolean;
    flags?: { eventIndex: number; flag: "!" | "?"; note?: string }[];
    uncertain?: { eventIndex: number; candidates?: string[]; note?: string }[];
  };
};

// ---------------------------------------------------------------------------
// 16. Match pipeline — writer/parser/reader roles. RiftCore defines these
// primitives; RiftEngine (M2) is the only role that produces a
// ReconstructedMatch or resolves an UnrecognizedEvent — see rulesKernel.ts's
// foldEvents/materialize/checkClean/readSnapshot.
// ---------------------------------------------------------------------------

export type UnrecognizedEvent = {
  index: number;
  rawEvent: unknown;
  schemaVersion: number;
  reason: "unrecognized-type";
};

export type StreamStatus = "raw" | "reconstructed" | "verified";

export type ReconstructedMatch = {
  schemaVersion: number;
  events: GameEvent[];
  snapshots: MatchStateSnapshot[];
  status: StreamStatus;
  unresolved: UnrecognizedEvent[];
  deductiveConfidence?: number;
  deductiveEvents?: GameEvent[];
  gate?: GateResult;
};

export type GateResult = {
  pass: boolean;
  foldable: boolean;
  noBlackBoxes: boolean;
  allLegal: boolean;
  outcomeConsistent: boolean;
  failures: string[];
};
