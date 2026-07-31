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

/** CR 124.2 — non-exhaustive per CR; extend additively. */
export type ObjectStatus =
  | "attached"
  | "attacker"
  | "defender"
  | "buffed"
  | "controlled"
  | "empowered"
  | "equipped"
  | "exhausted"
  | "facedown"
  | "ready"
  | "replaced"
  | "revealed"
  | "stunned";

/** How long a temporary modification/grant lasts. CR 801.3.a.3 — default = while it stays in its current zone. */
export type Duration = "thisTurn" | "thisCombat" | "whileInZone" | "permanent" | { untilCleanupTag: string };

/** CR 801.3 (duration-bearing keyword grant). */
export interface GrantedKeyword {
  keyword: Keyword;
  value?: number;
  duration: Duration;
  sourceObjectId: ObjectId;
}

export interface GameObject {
  objectId: ObjectId;
  cardId: CardId | null; // null = identity unknown from this perspective
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
  damage: number; // CR 417 — units only
  buffCount: 0 | 1; // CR 702.3 — hard cap of one
  counters: Record<string, number>; // CR 741-749 (no controller)
  attachedTo: ObjectId | null; // CR 716-719
  attachments: ObjectId[]; // this object as TopMostCard
  preventValue: number | "all" | null; // CR 437 — decrementing tracked value
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

// Predicate/EventPredicate/Selector/Instruction are left as callable shapes
// rather than data — interpreting raw card text into these is Phase 4 work
// (against the Supabase inventory, explicitly out of scope here per Part 7
// §12); the v2 kernel only needs to know how to *evaluate* an already-built
// one. Phase 4 (or a test fixture) constructs the closures.
/** A predicate over game state (e.g. a passive ability's "while" condition, CR 363-366). */
export type Predicate = (state: GameState) => boolean;
/** A predicate over a GameEvent in context (e.g. a replacement effect's appliesTo, CR 367-375). */
export type EventPredicate = (event: GameEvent, state: GameState) => boolean;
/** Resolves the object(s) a Layer/targeted effect applies to (CR 355.6-.10, 477). */
export type Selector = (state: GameState) => ObjectId[];
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
  op: TraitOp | AbilityOp | ArithmeticOp;
  fromPassive: boolean; // CR 477.3.b — passives do NOT snapshot
  snapshotted?: number; // resolved limited value, remembered for the duration
  duration: Duration;
  timestamp: number;
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
  chosenChampionCardId: CardId; // CR 103.2.a.3 — name-based status
  scoredBattlefieldsThisTurn: Set<ObjectId>; // CR 470 — once per BF per turn, both methods
}

/** TR 104.1 — tournament rules override CR in competition; kernel takes a context. */
export interface FormatContext {
  mode: "1v1" | "2v2" | "ffa3" | "ffa4"; // CR 481-488
  format: "constructed" | "sealed" | "draft";
  victoryScore: number;
  battlefieldCount: number;
  mainDeckMin: number; // 40 constructed / 25 sealed / 20 draft
  championCountsInMain: boolean; // TR 402.1 constructed = true (sealed: Part 3 §12 item 5)
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
  assignments: { targetObjectId: ObjectId; amount: number }[];
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
