// RiftCore schema (v1). Pure types — no imports beyond TS. See
// docs/design/RiftCore_Spec.md §2, §5, §8 for the source spec.
//
// This file is the shared contract every other Riftbound module (RiftEngine,
// RiftLab, RiftCoach, RiftIQ) imports. It intentionally has zero dependency
// on the rest of this app (no React, no storage, no screens/, no puzzle
// types) so it can be lifted into a standalone package.

// ---------------------------------------------------------------------------
// Card-level enums (mirror src/data/cards.json's actual value set)
// ---------------------------------------------------------------------------

export type Domain =
  | "Fury"
  | "Calm"
  | "Body"
  | "Mind"
  | "Order"
  | "Chaos"
  | "Colorless";

export type CardType = "Unit" | "Spell" | "Gear" | "Battlefield" | "Legend" | "Rune";

export type CardSubtype =
  | "Champion"
  | "Equipment"
  | "Combat Trick"
  | "Removal"
  | "Counterspell"
  | "Utility"
  | null;

export type Speed = "Action" | "Reaction" | "Normal";

export type Keyword =
  | "Accelerate"
  | "Ambush"
  | "Assault"
  | "Backline"
  | "Buff"
  | "Burn"
  | "Deathknell"
  | "Deflect"
  | "Empower"
  | "Equip"
  | "Flow"
  | "Ganking"
  | "Hidden"
  | "Hunt"
  | "Legion"
  | "Level"
  | "Mighty"
  | "Predict"
  | "Quick-Draw"
  | "Repeat"
  | "Shield"
  | "Stun"
  | "Tank"
  | "Temporary"
  | "Unique"
  | "Vision"
  | "Weaponmaster";

// Physical locations a card/unit instance can occupy.
export type ZoneKind = "hand" | "deck" | "discard" | "banished" | "base" | "battlefield";

// Info-state of an object instance — faceDown ("hidden") vs face up.
export type Privacy = "public" | "hidden";

export type CombatRole = "attacker" | "defender";

export type PlayerId = "A" | "B";

// How long a temporary modification/grant lasts.
export type Duration = "thisCombat" | "thisTurn" | "permanent";

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export type PowerPip = { domain: Domain; count: number };

export type Cost = {
  energy: number;
  powerCount: number; // total recycles required
  powerPips: PowerPip[]; // Σcount ≤ powerCount; remainder = "Any" recycles
};

// ---------------------------------------------------------------------------
// Might chain
// ---------------------------------------------------------------------------

// A single Might modification in a resolution chain. `floor` — when present —
// clamps the running total no lower than `floor` at the moment THIS mod is
// applied; later mods in the chain may still push the result below that
// floor. This is what makes chain order observable (see rulesKernel.test.ts).
export type MightMod = {
  amount: number;
  floor?: number;
  duration?: Duration;
  source?: string;
};

// A temporary or permanent keyword grant (e.g. Cleave granting Assault 3).
export type KeywordGrant = {
  keyword: Keyword;
  value?: number;
  duration: Duration;
  source?: string;
};

// ---------------------------------------------------------------------------
// Object / unit / rune instances
// ---------------------------------------------------------------------------

// A card instance sitting in a zone that doesn't need full battle state
// (hand, deck, discard, banished). `cardId: null` = identity unknown to the
// perspective holding this instance (e.g. an opponent's hidden hand as
// captured by RiftNotes) — resolved by a later "cardRevealed" event.
export type ObjectInstance = {
  instanceId: string;
  cardId: string | null;
  privacy: Privacy;
  knownToOpponent: boolean;
};

// A unit instance in play (at base or a battlefield).
export type UnitState = {
  instanceId: string;
  cardId: string;
  controller: PlayerId;
  might: number; // current base Might (post-permanent mods, pre-combat)
  mightMods: MightMod[]; // active chain-style mods, in LIFO-resolution order
  keywordGrants: KeywordGrant[]; // dynamic grants; printed keywords come from the card itself
  damage: number; // damage marked on this unit
  stunned: boolean;
  tapped: boolean;
  zone: "base" | "battlefield";
  battlefieldId?: string;
  role?: CombatRole; // set while this unit is participating in combat
};

export type RuneState = {
  instanceId: string;
  domain: Domain;
  tapped: boolean;
};

// ---------------------------------------------------------------------------
// Player / battlefield / game state
// ---------------------------------------------------------------------------

export type PlayerState = {
  id: PlayerId;
  hand: ObjectInstance[];
  deck: ObjectInstance[];
  discard: ObjectInstance[];
  banished: ObjectInstance[];
  base: UnitState[];
  runes: RuneState[];
  points: number;
  // Snapshot of `points` taken at this player's most recent Beginning Phase
  // (see applyEvent's "phaseChange" case). The battlefield-based WinningLines
  // key off this, not live `points` — a mid-turn conquer must not retroactively
  // satisfy a threshold that was only reached after the turn started.
  pointsAtTurnStart: number;
  // Game-setup state (§4 match-event schema deltas). Puzzles start mid-game
  // and leave these empty; a captured full match populates them from the
  // "gameStarted"/"mulligan" events.
  legendCardId?: string;
  champion?: UnitState;
  runeDeck?: { count: number; byDomain?: Partial<Record<Domain, number>> };
};

export type Battlefield = {
  battlefieldId: string;
  cardId?: string;
  units: UnitState[];
};

// An item queued on the resolution chain. `mightMod`, when present, is what
// resolveMightChain folds — LIFO order is a property of how the chain is
// built (most-recently-added item resolves first), not of this type itself.
export type ChainItem = {
  id: string;
  controller: PlayerId;
  sourceCardInstanceId: string;
  targets: string[];
  mightMod?: MightMod;
};

export type GameState = {
  players: Record<PlayerId, PlayerState>;
  battlefields: Battlefield[];
  chain: ChainItem[];
  turn: number;
  activePlayer: PlayerId;
  pendingDirectPoints: Record<PlayerId, number>;
  // Points required to win. Format-dependent (1v1 vs 2v2) — callers set this
  // per match; never assume a fixed value here.
  pointsToWin: number;
};

// ---------------------------------------------------------------------------
// Winning lines / scoring
// ---------------------------------------------------------------------------

// The winning lines that end a match (RiftCore_Spec §5). Names reflect the
// standard 8-point (1v1) match — "AtSeven"/"AtSix" name the points a player
// holds at the *start* of the winning turn (state.players[p].pointsAtTurnStart),
// not the winning total itself, and scale with pointsToWin (e.g. a 2v2 match
// at pointsToWin=11 checks pointsAtTurnStart against 10/9, not 7/6):
//   - holdAtSeven: pointsAtTurnStart === pointsToWin - 1, holding >=1 BF
//   - conquerBothAtSix: pointsAtTurnStart === pointsToWin - 2, conquering
//     both BFs this turn (the two conquer points need not land simultaneously
//     — see canScoreWinningPoint's comment on what this check can and can't see)
//   - holdOneConquerOneAtSix: pointsAtTurnStart === pointsToWin - 2, holding
//     one BF and conquering the other
// plus three non-battlefield win paths that bypass the point race entirely.
export type WinningLine =
  | "holdAtSeven"
  | "conquerBothAtSix"
  | "holdOneConquerOneAtSix"
  | "cardEffect"
  | "deckDepletion"
  | "altWin";

// The source of a single scored point (distinct from WinningLine — a
// WinningLine is the match-ending pattern; a PointSource is what caused one
// point along the way).
export type PointSource = "conquer" | "holdIntoBeginning" | "cardEffect" | "deckDepletion" | "altWin";

export type ScoreEvent = {
  player: PlayerId;
  amount: number;
  source: PointSource;
  isWinningPoint: boolean;
  // Which battlefield this point came from. Present iff source is "conquer"
  // or "holdIntoBeginning" — cardEffect/deckDepletion/altWin points aren't
  // tied to a battlefield.
  battlefieldId?: string;
};

// ---------------------------------------------------------------------------
// Game events — the event-sourced substrate. A GameState snapshot is a fold
// of a GameEvent[] via applyEvent.
// ---------------------------------------------------------------------------

export type ZoneRef = { zone: ZoneKind; battlefieldId?: string; player: PlayerId };

// Only "beginning" currently drives kernel logic (applyEvent snapshots
// pointsAtTurnStart on it) — the rest are named for a conventional turn
// structure but aren't modeled/consumed anywhere yet.
export type TurnPhase = "beginning" | "main" | "combat" | "end";

export type GameEvent =
  | {
      type: "cardPlayed";
      player: PlayerId;
      cardInstanceId: string;
      // Capture/reconstruction extensions (§4 match-event schema deltas) —
      // all optional, so a bare 2-field "cardPlayed" still folds unchanged.
      targets?: string[];
      battlefieldId?: string;
      fromZone?: ZoneKind;
      costPaid?: Cost;
    }
  | { type: "unitEntered"; handInstanceId: string; unit: UnitState }
  | { type: "damageDealt"; targetInstanceId: string; amount: number }
  | { type: "mightModApplied"; targetInstanceId: string; mod: MightMod }
  | { type: "mightSet"; targetInstanceId: string; value: number; duration: Duration }
  | { type: "keywordGranted"; targetInstanceId: string; grant: KeywordGrant }
  | { type: "unitStunned"; targetInstanceId: string }
  | { type: "unitKilled"; targetInstanceId: string }
  | { type: "unitMoved"; unitInstanceId: string; to: ZoneRef }
  | { type: "unitReturnedToHand"; unitInstanceId: string }
  | { type: "cardDrawn"; player: PlayerId; count: number }
  | { type: "runeExhausted"; instanceId: string }
  | { type: "runeRecycled"; instanceId: string }
  | { type: "spellCountered"; chainItemId: string }
  | ({ type: "pointScored" } & ScoreEvent)
  | { type: "phaseChange"; player: PlayerId; phase: TurnPhase }
  // The belief-state primitive (restored — see §3 G1 of the match-event
  // schema doc): records when a hidden card became known to whom.
  | { type: "cardRevealed"; cardInstanceId: string; cardId: string; toPlayer: PlayerId; source: string }
  | { type: "gameStarted"; firstPlayer: PlayerId }
  | { type: "mulligan"; player: PlayerId; returnedInstanceIds: string[] }
  | { type: "runeChanneled"; player: PlayerId; instanceId: string; domain: Domain };

// ---------------------------------------------------------------------------
// E1 envelope (deferred, optional, unpopulated) — §2 deltas
// ---------------------------------------------------------------------------

export type MatchStateSnapshot = {
  state: GameState;
  // Optional (widened from required — no existing consumer set this field;
  // see docs/design/RiftCore_Match_Pipeline_Contract.md §8): an authored
  // puzzle snapshot is inherently one player's view and sets this, but a
  // materialized snapshot from foldEvents/materialize is the omniscient
  // fold result and has no single perspective to name.
  perspective?: PlayerId;
  completeness?: "full" | "partial";
  confidence?: number;
  provenance?: {
    source: "authored" | "field" | "player" | "selfplay";
    fidelity?: number;
  };
};

// ---------------------------------------------------------------------------
// CapturedMatch — versioned container for a persisted match (§4, §7 of
// docs/design/RiftCore_Match_Event_Schema.md). RiftNotes produces this;
// every consumer keys migrations off `schemaVersion` (see ./migrate.ts).
// ---------------------------------------------------------------------------

// Bump on every schema change; migrations in ./migrate.ts chain off this.
export const CURRENT_SCHEMA_VERSION = 1;

export type CapturedMatch = {
  schemaVersion: number;
  initialState: GameState;
  events: GameEvent[];
  meta?: { source: "field" | "player" | "selfplay"; capturedAt?: string; perspective?: PlayerId };
  // Capture-layer annotations — NOT game facts, so they stay OUT of
  // GameEvent[]. A real lossy capture carries misplay flags ("!") and
  // uncertainty ("?") that must travel with the match without polluting the
  // canonical event stream (validated 2026-07-30, see
  // docs/design/RiftNotes_v04_Validation_2026-07-30.md). RiftNotes
  // populates; RiftCoach reads flags (coaching signal), RiftEngine reads
  // uncertainty (reconstruction priors).
  captureMeta?: {
    tier?: "live-personal" | "digital-personal" | "field-digital";
    lossy?: boolean;
    flags?: { eventIndex: number; flag: "!" | "?"; note?: string }[];
    uncertain?: { eventIndex: number; candidates?: string[]; note?: string }[];
  };
};

// ---------------------------------------------------------------------------
// Match pipeline — writer/parser/reader roles (see
// docs/design/RiftCore_Match_Pipeline_Contract.md). RiftCore defines these
// primitives; RiftEngine (M2) is the only role that produces a
// ReconstructedMatch or resolves an UnrecognizedEvent — see rulesKernel.ts's
// foldEvents/materialize/checkClean/readSnapshot.
// ---------------------------------------------------------------------------

// An event whose `type` isn't a known GameEvent variant at the fold's
// schemaVersion — recorded, never skipped or corrupted. Distinct from
// migrate(): a known type whose *meaning* changed across versions is a
// migration concern; an unknown type is an UnrecognizedEvent.
export type UnrecognizedEvent = {
  index: number;
  rawEvent: unknown;
  schemaVersion: number;
  reason: "unrecognized-type";
};

export type StreamStatus = "raw" | "reconstructed" | "verified";

// RiftEngine's output; what a reader's readSnapshot() accepts as input.
export type ReconstructedMatch = {
  schemaVersion: number;
  events: GameEvent[]; // the cleaned stream (Engine's product)
  snapshots: MatchStateSnapshot[]; // materialized; what readers consume
  status: StreamStatus;
  unresolved: UnrecognizedEvent[]; // must be empty to pass the gate
  deductiveConfidence?: number; // 0..1, computed by Engine (field only here)
  // Retained tier-1 reconstruction from BEFORE human review, so
  // deductive-vs-human divergence is computable later (calibration,
  // contract §4b). RiftCore only retains this field; Engine populates it.
  deductiveEvents?: GameEvent[];
  gate?: GateResult;
};

// The four deductive clean-stream gate checks (contract §3). Pure — no
// inference; RiftCore's checkClean() computes this over an already-built
// ReconstructedMatch.
export type GateResult = {
  pass: boolean;
  foldable: boolean;
  noBlackBoxes: boolean;
  allLegal: boolean;
  outcomeConsistent: boolean;
  failures: string[];
};

// ---------------------------------------------------------------------------
// Play (§5) — one candidate move at a decision point
// ---------------------------------------------------------------------------

export type Play =
  | { kind: "castSpell"; cardInstanceId: string; targets: string[]; repeat?: boolean }
  | { kind: "playUnit"; cardInstanceId: string; battlefieldId?: string; targets?: string[] }
  | { kind: "activateAbility"; sourceInstanceId: string; targets: string[]; repeat?: boolean }
  | { kind: "moveUnit"; unitInstanceId: string; to: ZoneRef }
  | { kind: "attack"; attackerInstanceIds: string[]; battlefieldId: string }
  | { kind: "block"; blockerInstanceIds: string[]; battlefieldId: string }
  | { kind: "pass" };

// ---------------------------------------------------------------------------
// Decision point (§8) — RiftCore-owned; RiftIQ's Puzzle wraps this
// ---------------------------------------------------------------------------

export type Candidate = {
  id: string;
  play: Play | Play[];
  isCorrect: boolean;
};

export type DecisionPoint = {
  snapshot: MatchStateSnapshot;
  goal?: string;
  candidates: Candidate[];
};
