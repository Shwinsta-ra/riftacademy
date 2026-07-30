// Forward rules kernel + applyPlay bridge. See RiftCore_Spec.md §6.
//
// Pure, deterministic, no UI/storage. This is the accuracy contract every
// other module (RiftEngine's abduction, RiftLab's sim, RiftCoach's grading,
// RiftIQ's puzzle validation) leans on — see §3.

import { costOf, getCard } from "./cards";
import { getEffectEntry, primitiveToEvents, type EffectPrimitive } from "./effects";
import { CURRENT_SCHEMA_VERSION } from "./schema";
import type {
  Battlefield,
  Cost,
  CombatRole,
  Domain,
  GameEvent,
  GameState,
  GateResult,
  KeywordGrant,
  MatchStateSnapshot,
  MightMod,
  ObjectInstance,
  Play,
  PlayerId,
  PlayerState,
  ReconstructedMatch,
  RuneState,
  UnitState,
  UnrecognizedEvent,
  WinningLine,
  ZoneRef,
} from "./schema";

// ---------------------------------------------------------------------------
// Might chain
// ---------------------------------------------------------------------------

// Applies mods in the given order. `floor`, when present on a mod, clamps
// the running total no lower than that value at the moment THIS mod
// resolves — a later mod in the chain can still push the total below it.
// The caller (applyPlay, when building unit.mightMods) is responsible for
// ordering `orderedEffects` LIFO relative to chain resolution; this function
// is order-agnostic given whatever order it's handed.
export function resolveMightChain(startMight: number, orderedEffects: MightMod[]): number {
  return orderedEffects.reduce((might, mod) => {
    const next = might + mod.amount;
    return mod.floor !== undefined ? Math.max(mod.floor, next) : next;
  }, startMight);
}

// Current Might with all chain mods folded in, but no combat role bonus.
export function currentMight(unit: UnitState): number {
  return resolveMightChain(unit.might, unit.mightMods);
}

function sumKeywordValue(unit: UnitState, keyword: string): number {
  return unit.keywordGrants
    .filter((g) => g.keyword === keyword)
    .reduce((sum, g) => sum + (g.value ?? 0), 0);
}

export function hasKeyword(unit: UnitState, keyword: string): boolean {
  return unit.keywordGrants.some((g) => g.keyword === keyword);
}

// trueMight(unit, role) = resolveMightChain(base, mods) + roleBonus; signed
// (may go negative).
export function trueMight(unit: UnitState, role: CombatRole): number {
  const roleBonus = role === "attacker" ? sumKeywordValue(unit, "Assault") : sumKeywordValue(unit, "Shield");
  return currentMight(unit) + roleBonus;
}

export function combatDamageDealt(unit: UnitState, role: CombatRole): number {
  if (unit.stunned) return 0; // Stun: 0 damage, but the unit still contests (see canScoreWinningPoint)
  return Math.max(0, trueMight(unit, role));
}

export function isKilled(damage: number, might: number): boolean {
  return damage > 0 && damage >= might;
}

// Minimum cumulative damage needed to satisfy isKilled against `might`.
function lethalTotal(might: number): number {
  return Math.max(might, 1);
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export type DamageAssignment = { targetInstanceId: string; amount: number };

export type CombatResult = {
  damageToDefenders: DamageAssignment[];
  damageToAttackers: DamageAssignment[];
  killed: string[];
  events: GameEvent[];
};

// Assigns a damage pool across targets: Tanks must reach lethal before any
// spill to Backline; once every Tank present has reached lethal (or there
// are none), remaining damage spills to Backline. Any final leftover (all
// targets already lethal) piles onto the last-assigned target as overkill —
// it doesn't change kill status.
function assignDamage(pool: number, targets: UnitState[], role: CombatRole): DamageAssignment[] {
  const tanks = targets.filter((t) => hasKeyword(t, "Tank"));
  const backline = targets.filter((t) => !hasKeyword(t, "Tank"));
  const assignments: DamageAssignment[] = [];
  let remaining = pool;

  const give = (target: UnitState, amount: number) => {
    if (amount <= 0) return;
    const existing = assignments.find((a) => a.targetInstanceId === target.instanceId);
    if (existing) existing.amount += amount;
    else assignments.push({ targetInstanceId: target.instanceId, amount });
    remaining -= amount;
  };

  const lethalRemaining = (t: UnitState) => Math.max(0, lethalTotal(trueMight(t, role)) - t.damage);

  for (const tank of tanks) {
    if (remaining <= 0) break;
    give(tank, Math.min(remaining, lethalRemaining(tank)));
  }
  for (const unit of backline) {
    if (remaining <= 0) break;
    give(unit, Math.min(remaining, lethalRemaining(unit)));
  }
  if (remaining > 0) {
    const last = backline[backline.length - 1] ?? tanks[tanks.length - 1];
    if (last) give(last, remaining);
  }
  return assignments;
}

// Simultaneous combat resolution. Attackers' combined damage pool assigns
// across defenders (and vice versa) via assignDamage; deaths are determined
// after both assignments are known.
export function resolveCombat(attackers: UnitState[], defenders: UnitState[]): CombatResult {
  const attackPool = attackers.reduce((sum, a) => sum + combatDamageDealt(a, "attacker"), 0);
  const defendPool = defenders.reduce((sum, d) => sum + combatDamageDealt(d, "defender"), 0);

  const damageToDefenders = assignDamage(attackPool, defenders, "defender");
  const damageToAttackers = assignDamage(defendPool, attackers, "attacker");

  const killed: string[] = [];
  const events: GameEvent[] = [];

  const checkKills = (units: UnitState[], assignments: DamageAssignment[], role: CombatRole) => {
    for (const unit of units) {
      const dealt = assignments.find((a) => a.targetInstanceId === unit.instanceId)?.amount ?? 0;
      if (dealt > 0) events.push({ type: "damageDealt", targetInstanceId: unit.instanceId, amount: dealt });
      const totalDamage = unit.damage + dealt;
      if (isKilled(totalDamage, trueMight(unit, role))) {
        killed.push(unit.instanceId);
        events.push({ type: "unitKilled", targetInstanceId: unit.instanceId });
      }
    }
  };
  checkKills(defenders, damageToDefenders, "defender");
  checkKills(attackers, damageToAttackers, "attacker");

  return { damageToDefenders, damageToAttackers, killed, events };
}

// ---------------------------------------------------------------------------
// Affordability
// ---------------------------------------------------------------------------

function pickPaymentRunes(cost: Cost, runePool: RuneState[]): { toRecycle: string[]; toExhaust: string[] } | null {
  const ready = runePool.filter((r) => !r.tapped);
  if (ready.length < cost.energy + cost.powerCount) return null;

  const byDomain = new Map<Domain, RuneState[]>();
  for (const r of ready) byDomain.set(r.domain, [...(byDomain.get(r.domain) ?? []), r]);

  const used = new Set<string>();
  for (const pip of cost.powerPips) {
    const pool = (byDomain.get(pip.domain) ?? []).filter((r) => !used.has(r.instanceId));
    if (pool.length < pip.count) return null;
    pool.slice(0, pip.count).forEach((r) => used.add(r.instanceId));
  }

  const pippedCount = cost.powerPips.reduce((sum, p) => sum + p.count, 0);
  const remainingForPower = cost.powerCount - pippedCount;
  const stillReady = ready.filter((r) => !used.has(r.instanceId));
  if (stillReady.length < remainingForPower) return null;
  const toRecycle = Array.from(used);
  stillReady.slice(0, remainingForPower).forEach((r) => {
    used.add(r.instanceId);
    toRecycle.push(r.instanceId);
  });

  const finalReady = ready.filter((r) => !used.has(r.instanceId));
  if (finalReady.length < cost.energy) return null;
  const toExhaust = finalReady.slice(0, cost.energy).map((r) => r.instanceId);

  return { toRecycle, toExhaust };
}

export function canAfford(cost: Cost, runePool: RuneState[]): boolean {
  return pickPaymentRunes(cost, runePool) !== null;
}

// ---------------------------------------------------------------------------
// Winning lines
// ---------------------------------------------------------------------------

function opponentOf(player: PlayerId): PlayerId {
  return player === "A" ? "B" : "A";
}

function unitsPresent(bf: Battlefield, player: PlayerId): UnitState[] {
  return bf.units.filter((u) => u.controller === player);
}

function totalDefensiveMight(units: UnitState[]): number {
  return units.reduce((sum, u) => sum + Math.max(0, trueMight(u, "defender")), 0);
}

// The battlefield-based lines key off pointsAtTurnStart (snapshotted at this
// player's Beginning Phase — see applyEvent's "phaseChange" case), not live
// `points`: a mid-turn conquer must not retroactively satisfy a threshold
// that was only reached after the turn started. conquerBothAtSix's "both
// conquered this turn" is checked as "both currently Might-won in this
// snapshot" — the two conquer points don't need to land simultaneously in
// the real game, but GameState doesn't track "already conquered earlier this
// turn" separately from current board state, so a battlefield already
// secured earlier this turn (its defenders gone) reads as hold-eligible, not
// conquer-eligible, here. Known limitation, not a guess to revisit later.
//
// deckDepletion and altWin have no corresponding GameState field yet (no
// opponent-deck-empty flag, no alt-win-condition flag), so this function can
// never emit them today — they exist on WinningLine for completeness only.
export function canScoreWinningPoint(state: GameState, player: PlayerId): WinningLine[] {
  const lines = new Set<WinningLine>();
  const opponent = opponentOf(player);
  const startPoints = state.players[player].pointsAtTurnStart;
  const pointsToWin = state.pointsToWin;

  const holdEligible: Battlefield[] = [];
  const conquerEligible: Battlefield[] = [];
  for (const bf of state.battlefields) {
    const mine = unitsPresent(bf, player);
    const theirs = unitsPresent(bf, opponent);
    if (mine.length === 0) continue;
    if (theirs.length === 0) {
      holdEligible.push(bf);
    } else if (totalDefensiveMight(mine) > totalDefensiveMight(theirs)) {
      conquerEligible.push(bf);
    }
  }

  if (holdEligible.length > 0 && startPoints === pointsToWin - 1) {
    lines.add("holdAtSeven");
  }

  if (state.battlefields.length === 2 && startPoints === pointsToWin - 2) {
    if (conquerEligible.length === 2) {
      lines.add("conquerBothAtSix");
    } else if (holdEligible.length === 1 && conquerEligible.length === 1) {
      lines.add("holdOneConquerOneAtSix");
    }
  }

  if ((state.pendingDirectPoints[player] ?? 0) > 0) {
    lines.add("cardEffect");
  }

  return Array.from(lines);
}

// ---------------------------------------------------------------------------
// applyEvent — folds one GameEvent into GameState
// ---------------------------------------------------------------------------

function findUnitOwner(state: GameState, instanceId: string): PlayerId | null {
  for (const pid of Object.keys(state.players) as PlayerId[]) {
    if (state.players[pid].base.some((u) => u.instanceId === instanceId)) return pid;
  }
  for (const bf of state.battlefields) {
    const unit = bf.units.find((u) => u.instanceId === instanceId);
    if (unit) return unit.controller;
  }
  return null;
}

export function findUnit(state: GameState, instanceId: string): UnitState | undefined {
  for (const pid of Object.keys(state.players) as PlayerId[]) {
    const found = state.players[pid].base.find((u) => u.instanceId === instanceId);
    if (found) return found;
  }
  for (const bf of state.battlefields) {
    const found = bf.units.find((u) => u.instanceId === instanceId);
    if (found) return found;
  }
  return undefined;
}

function mapUnit(state: GameState, instanceId: string, fn: (u: UnitState) => UnitState): GameState {
  const players = { ...state.players };
  for (const pid of Object.keys(players) as PlayerId[]) {
    const p = players[pid];
    const idx = p.base.findIndex((u) => u.instanceId === instanceId);
    if (idx !== -1) {
      const base = [...p.base];
      base[idx] = fn(base[idx]);
      return { ...state, players: { ...players, [pid]: { ...p, base } } };
    }
  }
  const battlefields = state.battlefields.map((bf) => {
    const idx = bf.units.findIndex((u) => u.instanceId === instanceId);
    if (idx === -1) return bf;
    const units = [...bf.units];
    units[idx] = fn(units[idx]);
    return { ...bf, units };
  });
  return { ...state, battlefields };
}

function removeUnit(state: GameState, instanceId: string): { state: GameState; removed?: UnitState } {
  let removed: UnitState | undefined;
  const players = { ...state.players };
  for (const pid of Object.keys(players) as PlayerId[]) {
    const p = players[pid];
    const found = p.base.find((u) => u.instanceId === instanceId);
    if (found) {
      removed = found;
      players[pid] = { ...p, base: p.base.filter((u) => u.instanceId !== instanceId) };
    }
  }
  const battlefields = state.battlefields.map((bf) => {
    const found = bf.units.find((u) => u.instanceId === instanceId);
    if (!found) return bf;
    removed = found;
    return { ...bf, units: bf.units.filter((u) => u.instanceId !== instanceId) };
  });
  return { state: { ...state, players, battlefields }, removed };
}

function mapRune(state: GameState, instanceId: string, fn: (r: RuneState) => RuneState): GameState {
  for (const pid of Object.keys(state.players) as PlayerId[]) {
    const p = state.players[pid];
    const idx = p.runes.findIndex((r) => r.instanceId === instanceId);
    if (idx !== -1) {
      const runes = [...p.runes];
      runes[idx] = fn(runes[idx]);
      return { ...state, players: { ...state.players, [pid]: { ...p, runes } } };
    }
  }
  return state;
}

function removeRune(state: GameState, instanceId: string): GameState {
  for (const pid of Object.keys(state.players) as PlayerId[]) {
    const p = state.players[pid];
    if (p.runes.some((r) => r.instanceId === instanceId)) {
      return { ...state, players: { ...state.players, [pid]: { ...p, runes: p.runes.filter((r) => r.instanceId !== instanceId) } } };
    }
  }
  return state;
}

function findHandOwner(state: GameState, instanceId: string): PlayerId | null {
  for (const pid of Object.keys(state.players) as PlayerId[]) {
    if (state.players[pid].hand.some((o) => o.instanceId === instanceId)) return pid;
  }
  return null;
}

const OBJECT_ZONES = ["hand", "deck", "discard", "banished"] as const;

// Finds an ObjectInstance across any of a player's non-battlefield zones
// (both players) and applies `fn`. Used by "cardRevealed" to resolve a
// cardId:null placeholder once its identity becomes known.
function mapObject(
  state: GameState,
  instanceId: string,
  fn: (o: ObjectInstance, owner: PlayerId) => ObjectInstance
): GameState {
  for (const pid of Object.keys(state.players) as PlayerId[]) {
    const p = state.players[pid];
    for (const zoneKey of OBJECT_ZONES) {
      const idx = p[zoneKey].findIndex((o) => o.instanceId === instanceId);
      if (idx !== -1) {
        const zone = [...p[zoneKey]];
        zone[idx] = fn(zone[idx], pid);
        return { ...state, players: { ...state.players, [pid]: { ...p, [zoneKey]: zone } } };
      }
    }
  }
  return state;
}

// Every known GameEvent variant's `type` string. Used by foldEvents to
// route unknown types to UnrecognizedEvent *before* calling applyEvent —
// see the docstring on applyEvent's default branch below.
const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  "cardPlayed",
  "unitEntered",
  "damageDealt",
  "mightModApplied",
  "mightSet",
  "keywordGranted",
  "unitStunned",
  "unitKilled",
  "unitMoved",
  "unitReturnedToHand",
  "cardDrawn",
  "runeExhausted",
  "runeRecycled",
  "spellCountered",
  "pointScored",
  "phaseChange",
  "cardRevealed",
  "gameStarted",
  "mulligan",
  "runeChanneled",
]);

// Parser-only (RiftEngine). Folds one known GameEvent into GameState. Do
// not call this directly on unvalidated/external data — an unknown event
// `type` here throws (see the default branch) rather than being tolerated,
// because tolerance-without-corruption requires recording *which* event was
// skipped, and applyEvent has no return channel for that. Use foldEvents
// (below) instead, which routes unknown types to UnrecognizedEvent before
// ever calling this. See docs/design/RiftCore_Match_Pipeline_Contract.md §5.
export function applyEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "cardPlayed": {
      const p = state.players[event.player];
      const card = p.hand.find((o) => o.instanceId === event.cardInstanceId);
      if (!card) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [event.player]: {
            ...p,
            hand: p.hand.filter((o) => o.instanceId !== event.cardInstanceId),
            discard: [...p.discard, card],
          },
        },
      };
    }
    case "unitEntered": {
      const owner = findHandOwner(state, event.handInstanceId) ?? event.unit.controller;
      const p = state.players[owner];
      const hand = p.hand.filter((o) => o.instanceId !== event.handInstanceId);
      if (event.unit.zone === "battlefield" && event.unit.battlefieldId) {
        const battlefields = state.battlefields.map((bf) =>
          bf.battlefieldId === event.unit.battlefieldId ? { ...bf, units: [...bf.units, event.unit] } : bf
        );
        return { ...state, battlefields, players: { ...state.players, [owner]: { ...p, hand } } };
      }
      return {
        ...state,
        players: { ...state.players, [owner]: { ...p, hand, base: [...p.base, event.unit] } },
      };
    }
    case "damageDealt":
      return mapUnit(state, event.targetInstanceId, (u) => ({ ...u, damage: u.damage + event.amount }));
    case "mightModApplied":
      return mapUnit(state, event.targetInstanceId, (u) => ({ ...u, mightMods: [...u.mightMods, event.mod] }));
    case "mightSet":
      return mapUnit(state, event.targetInstanceId, (u) => ({ ...u, might: event.value }));
    case "keywordGranted":
      return mapUnit(state, event.targetInstanceId, (u) => ({
        ...u,
        keywordGrants: [...u.keywordGrants, event.grant],
      }));
    case "unitStunned":
      return mapUnit(state, event.targetInstanceId, (u) => ({ ...u, stunned: true }));
    case "unitKilled": {
      const { state: next, removed } = removeUnit(state, event.targetInstanceId);
      if (!removed) return next;
      const p = next.players[removed.controller];
      const obj: ObjectInstance = {
        instanceId: removed.instanceId,
        cardId: removed.cardId,
        privacy: "public",
        knownToOpponent: true,
      };
      return { ...next, players: { ...next.players, [removed.controller]: { ...p, discard: [...p.discard, obj] } } };
    }
    case "unitMoved": {
      const { state: next, removed } = removeUnit(state, event.unitInstanceId);
      if (!removed) return next;
      const updated: UnitState =
        event.to.zone === "battlefield"
          ? { ...removed, zone: "battlefield", battlefieldId: event.to.battlefieldId }
          : { ...removed, zone: "base", battlefieldId: undefined };
      if (updated.zone === "battlefield") {
        const battlefields = next.battlefields.map((bf) =>
          bf.battlefieldId === updated.battlefieldId ? { ...bf, units: [...bf.units, updated] } : bf
        );
        return { ...next, battlefields };
      }
      const p = next.players[updated.controller];
      return { ...next, players: { ...next.players, [updated.controller]: { ...p, base: [...p.base, updated] } } };
    }
    case "unitReturnedToHand": {
      const { state: next, removed } = removeUnit(state, event.unitInstanceId);
      if (!removed) return next;
      const obj: ObjectInstance = {
        instanceId: removed.instanceId,
        cardId: removed.cardId,
        privacy: "hidden",
        knownToOpponent: false,
      };
      const p = next.players[removed.controller];
      return { ...next, players: { ...next.players, [removed.controller]: { ...p, hand: [...p.hand, obj] } } };
    }
    case "cardDrawn": {
      const p = state.players[event.player];
      const drawn = p.deck.slice(0, event.count);
      const deck = p.deck.slice(event.count);
      return { ...state, players: { ...state.players, [event.player]: { ...p, deck, hand: [...p.hand, ...drawn] } } };
    }
    case "runeExhausted":
      return mapRune(state, event.instanceId, (r) => ({ ...r, tapped: true }));
    case "runeRecycled":
      return removeRune(state, event.instanceId);
    case "spellCountered":
      return { ...state, chain: state.chain.filter((c) => c.id !== event.chainItemId) };
    case "pointScored": {
      const p = state.players[event.player];
      return {
        ...state,
        players: { ...state.players, [event.player]: { ...p, points: p.points + event.amount } },
      };
    }
    case "phaseChange": {
      if (event.phase !== "beginning") return state;
      const p = state.players[event.player];
      return {
        ...state,
        players: { ...state.players, [event.player]: { ...p, pointsAtTurnStart: p.points } },
      };
    }
    case "cardRevealed":
      return mapObject(state, event.cardInstanceId, (o, owner) => ({
        ...o,
        cardId: event.cardId,
        knownToOpponent: owner !== event.toPlayer ? true : o.knownToOpponent,
      }));
    case "gameStarted":
      return { ...state, activePlayer: event.firstPlayer };
    case "mulligan": {
      const p = state.players[event.player];
      const returned = p.hand.filter((o) => event.returnedInstanceIds.includes(o.instanceId));
      const hand = p.hand.filter((o) => !event.returnedInstanceIds.includes(o.instanceId));
      // Shuffle semantics are a no-op placeholder here (returned cards land
      // at the back of the deck, unshuffled) — a real shuffle isn't needed
      // for folding to a coherent snapshot.
      return {
        ...state,
        players: { ...state.players, [event.player]: { ...p, hand, deck: [...p.deck, ...returned] } },
      };
    }
    case "runeChanneled": {
      const p = state.players[event.player];
      const rune: RuneState = { instanceId: event.instanceId, domain: event.domain, tapped: false };
      return { ...state, players: { ...state.players, [event.player]: { ...p, runes: [...p.runes, rune] } } };
    }
    default: {
      // Exhaustiveness check for known variants — TS errors here if a new
      // GameEvent variant is added without a case above. At runtime this
      // must be unreachable: foldEvents (the only sanctioned fold entry
      // point) filters unknown event types into UnrecognizedEvent before
      // ever calling applyEvent. Reaching here means a caller bypassed
      // foldEvents and called applyEvent directly on unvalidated data —
      // that's a caller bug, so this throws rather than silently
      // tolerating (silent tolerance here would fabricate "nothing
      // happened" with no record of what was skipped; see contract §5).
      const _exhaustive: never = event;
      const raw = _exhaustive as unknown as { type?: string };
      throw new Error(`applyEvent: unreachable — unrecognized event type "${raw?.type}". Use foldEvents instead.`);
    }
  }
}

// Parser-only (RiftEngine). The one sanctioned fold entry point over a raw
// GameEvent[] — record-don't-skip: a known event type folds via applyEvent
// and gets a "full" snapshot; an unknown type is recorded as an
// UnrecognizedEvent (never thrown, never silently dropped) and the *prior*
// state carries forward unchanged with a "partial" snapshot. See
// docs/design/RiftCore_Match_Pipeline_Contract.md §5, §8.
export function foldEvents(
  initial: GameState,
  events: GameEvent[]
): { finalState: GameState; snapshots: MatchStateSnapshot[]; unresolved: UnrecognizedEvent[] } {
  let state = initial;
  const snapshots: MatchStateSnapshot[] = [];
  const unresolved: UnrecognizedEvent[] = [];

  events.forEach((event, index) => {
    if (KNOWN_EVENT_TYPES.has(event.type)) {
      state = applyEvent(state, event);
      snapshots.push({ state, completeness: "full" });
    } else {
      unresolved.push({ index, rawEvent: event, schemaVersion: CURRENT_SCHEMA_VERSION, reason: "unrecognized-type" });
      snapshots.push({ state, completeness: "partial" });
    }
  });

  return { finalState: state, snapshots, unresolved };
}

// Parser-only (RiftEngine). Thin wrapper over foldEvents returning just the
// per-step snapshots — this is how Engine produces the reader-facing
// materialized state. Readers consume these snapshots (via readSnapshot);
// they never call foldEvents/materialize/applyEvent themselves (contract §1).
export function materialize(initial: GameState, events: GameEvent[]): MatchStateSnapshot[] {
  return foldEvents(initial, events).snapshots;
}

// ---------------------------------------------------------------------------
// isCounterableBy — Counter is a predicate the kernel evaluates (§7.2)
// ---------------------------------------------------------------------------

export function isCounterableBy(play: Play, counterCardId: string, state: GameState): boolean {
  if (play.kind !== "castSpell") return false;
  const owner = findHandOwner(state, play.cardInstanceId);
  if (!owner) return false;
  const handCard = state.players[owner].hand.find((o) => o.instanceId === play.cardInstanceId);
  // A card in a player's own hand always has a known identity — cardId is
  // only ever null for an opponent's hidden hand as captured by RiftNotes.
  if (!handCard || handCard.cardId === null) return false;
  const cardId = handCard.cardId;
  const card = getCard(cardId);
  if (card.type !== "Spell") return false;

  const entry = getEffectEntry(counterCardId);
  if (!entry || entry.kind !== "program") return false;
  const counterPrimitive = entry.program.steps.find((s): s is EffectPrimitive & { op: "Counter" } => s.op === "Counter");
  if (!counterPrimitive) return false;

  if (counterPrimitive.maxCost === undefined) return true;
  const cost = costOf(cardId);
  return cost.energy + cost.powerCount <= counterPrimitive.maxCost;
}

// ---------------------------------------------------------------------------
// applyPlay — the bridge RiftIQ validates against (§6)
// ---------------------------------------------------------------------------

export type PlayResult = {
  legal: boolean;
  reason?: string;
  events: GameEvent[];
  resultState: GameState;
  resolution: "computed" | "partial";
};

function illegal(state: GameState, reason: string): PlayResult {
  return { legal: false, reason, events: [], resultState: state, resolution: "computed" };
}

function fold(state: GameState, events: GameEvent[]): GameState {
  return events.reduce(applyEvent, state);
}

function applyOnePlay(state: GameState, play: Play): PlayResult {
  switch (play.kind) {
    case "pass":
      return { legal: true, events: [], resultState: state, resolution: "computed" };

    case "castSpell": {
      const owner = findHandOwner(state, play.cardInstanceId);
      if (!owner) return illegal(state, "card not in hand");
      const handCard = state.players[owner].hand.find((o) => o.instanceId === play.cardInstanceId)!;
      // A card in a player's own hand always has a known identity — cardId
      // is only ever null for an opponent's hidden hand as captured by
      // RiftNotes, which never reaches applyPlay directly.
      if (handCard.cardId === null) return illegal(state, "card identity unknown");
      const cardId = handCard.cardId;
      const card = getCard(cardId);

      if (card.speed === "Action" && state.activePlayer !== owner) {
        return illegal(state, "wrong speed: Action requires your turn");
      }

      const baseCost = costOf(cardId);
      const cost: Cost = play.repeat
        ? {
            energy: baseCost.energy * 2,
            powerCount: baseCost.powerCount * 2,
            powerPips: baseCost.powerPips.map((p) => ({ ...p, count: p.count * 2 })),
          }
        : baseCost;

      const payment = pickPaymentRunes(cost, state.players[owner].runes);
      if (!payment) return illegal(state, "unaffordable");

      const entry = getEffectEntry(cardId);
      const target = play.targets[0];

      if (entry?.kind === "program") {
        const primitive = entry.program.steps.find((s) => s.op === "ReturnToHand" && s.maxMight !== undefined) as
          | (EffectPrimitive & { op: "ReturnToHand" })
          | undefined;
        if (primitive?.maxMight !== undefined && target) {
          const targetUnit = findUnit(state, target);
          if (!targetUnit || currentMight(targetUnit) > primitive.maxMight) {
            return illegal(state, "invalid target: exceeds maxMight");
          }
        }
      }

      const events: GameEvent[] = [
        { type: "cardPlayed", player: owner, cardInstanceId: play.cardInstanceId },
        ...payment.toExhaust.map((instanceId): GameEvent => ({ type: "runeExhausted", instanceId })),
        ...payment.toRecycle.map((instanceId): GameEvent => ({ type: "runeRecycled", instanceId })),
      ];

      if (!entry) {
        return { legal: true, events, resultState: fold(state, events), resolution: "partial" };
      }
      if (entry.kind === "static") {
        return { legal: true, events, resultState: fold(state, events), resolution: "computed" };
      }

      const preCastTarget = target ? findUnit(state, target) : undefined;
      const wasAlreadyStunned = preCastTarget?.stunned ?? false;

      for (const step of entry.program.steps) {
        const ctx = buildPrimitiveContext(step, state, owner, target);
        events.push(...primitiveToEvents(step, ctx));
      }
      if (play.repeat) {
        for (const step of entry.program.repeatSteps ?? []) {
          // Existential Dread: the bounce only fires if the target was
          // already stunned BEFORE this cast (Gust's maxMight-gated
          // ReturnToHand is unaffected — it always carries maxMight).
          if (step.op === "ReturnToHand" && step.maxMight === undefined && !wasAlreadyStunned) {
            continue;
          }
          const ctx = buildPrimitiveContext(step, state, owner, target);
          events.push(...primitiveToEvents(step, ctx));
        }
      }

      return { legal: true, events, resultState: fold(state, events), resolution: "computed" };
    }

    case "playUnit": {
      const owner = findHandOwner(state, play.cardInstanceId);
      if (!owner) return illegal(state, "card not in hand");
      if (state.activePlayer !== owner) return illegal(state, "wrong speed: units require your turn");
      const handCard = state.players[owner].hand.find((o) => o.instanceId === play.cardInstanceId)!;
      // See castSpell above: a player's own hand card always has a known
      // identity by the time it reaches applyPlay.
      if (handCard.cardId === null) return illegal(state, "card identity unknown");
      const cardId = handCard.cardId;
      const card = getCard(cardId);

      const cost = costOf(cardId);
      const payment = pickPaymentRunes(cost, state.players[owner].runes);
      if (!payment) return illegal(state, "unaffordable");

      const entry = getEffectEntry(cardId);
      const unit: UnitState = {
        instanceId: play.cardInstanceId,
        cardId,
        controller: owner,
        might: card.might ?? 0,
        mightMods: [],
        keywordGrants: entry?.kind === "static" ? entry.keywordGrants : [],
        damage: 0,
        stunned: false,
        tapped: false,
        zone: play.battlefieldId ? "battlefield" : "base",
        battlefieldId: play.battlefieldId,
      };

      const events: GameEvent[] = [
        ...payment.toExhaust.map((instanceId): GameEvent => ({ type: "runeExhausted", instanceId })),
        ...payment.toRecycle.map((instanceId): GameEvent => ({ type: "runeRecycled", instanceId })),
        { type: "unitEntered", handInstanceId: play.cardInstanceId, unit },
      ];

      if (entry?.kind === "program" && entry.program.trigger === "OnPlay" && play.targets?.[0]) {
        for (const step of entry.program.steps) {
          const ctx = buildPrimitiveContext(step, state, owner, play.targets[0]);
          events.push(...primitiveToEvents(step, ctx));
        }
      }

      return {
        legal: true,
        events,
        resultState: fold(state, events),
        resolution: entry ? "computed" : "partial",
      };
    }

    case "activateAbility": {
      const controllerId = findUnitOwner(state, play.sourceInstanceId);
      if (!controllerId) return illegal(state, "source not found");
      // No activated-ability card is in the launch registry; legality is
      // checked, but the effect isn't modeled yet.
      return { legal: true, events: [], resultState: state, resolution: "partial" };
    }

    case "moveUnit": {
      const owner = findUnitOwner(state, play.unitInstanceId);
      if (!owner) return illegal(state, "unit not found");
      const events: GameEvent[] = [{ type: "unitMoved", unitInstanceId: play.unitInstanceId, to: play.to }];
      return { legal: true, events, resultState: fold(state, events), resolution: "computed" };
    }

    case "attack": {
      const owners = new Set(play.attackerInstanceIds.map((id) => findUnitOwner(state, id)));
      if (owners.size !== 1 || owners.has(null)) return illegal(state, "invalid attackers");
      const battlefield = state.battlefields.find((bf) => bf.battlefieldId === play.battlefieldId);
      if (!battlefield) return illegal(state, "battlefield not found");
      const attackers = play.attackerInstanceIds.map((id) => findUnit(state, id)).filter((u): u is UnitState => !!u);
      const attackerId = Array.from(owners)[0]!;
      const defenders = battlefield.units.filter((u) => u.controller !== attackerId);
      const result = resolveCombat(attackers, defenders);
      return { legal: true, events: result.events, resultState: fold(state, result.events), resolution: "computed" };
    }

    case "block": {
      const owners = new Set(play.blockerInstanceIds.map((id) => findUnitOwner(state, id)));
      if (owners.size !== 1 || owners.has(null)) return illegal(state, "invalid blockers");
      const battlefield = state.battlefields.find((bf) => bf.battlefieldId === play.battlefieldId);
      if (!battlefield) return illegal(state, "battlefield not found");
      const blockers = play.blockerInstanceIds.map((id) => findUnit(state, id)).filter((u): u is UnitState => !!u);
      const blockerId = Array.from(owners)[0]!;
      const attackers = battlefield.units.filter((u) => u.controller !== blockerId);
      const result = resolveCombat(attackers, blockers);
      return { legal: true, events: result.events, resultState: fold(state, result.events), resolution: "computed" };
    }

    default: {
      const _exhaustive: never = play;
      return illegal(state, "unknown play kind");
    }
  }
}

function buildPrimitiveContext(
  step: EffectPrimitive,
  state: GameState,
  controller: PlayerId,
  target: string | undefined
) {
  const targetUnit = target ? findUnit(state, target) : undefined;
  if (step.op === "SetMight") {
    return {
      targetInstanceId: target,
      controller,
      targetController: targetUnit?.controller,
      setValue: currentMight({ ...targetUnit, might: targetUnit?.might ?? 0 } as UnitState),
    };
  }
  if (step.op === "MoveUnit") {
    // "chosenBattlefield" — the destination is encoded as targets[1] by
    // convention (targets[0] = the unit being moved).
    return {
      targetInstanceId: target,
      controller,
      targetController: targetUnit?.controller,
      destinationBattlefieldId: undefined,
    };
  }
  if (step.op === "BuffMight" && step.ifSoloAtLocation !== undefined) {
    const isSolo = targetUnit ? isSoloAtUnitLocation(state, targetUnit) : false;
    return { targetInstanceId: target, controller, targetController: targetUnit?.controller, isSoloAtLocation: isSolo };
  }
  return { targetInstanceId: target, controller, targetController: targetUnit?.controller };
}

function isSoloAtUnitLocation(state: GameState, unit: UnitState): boolean {
  if (unit.zone === "base") {
    return state.players[unit.controller].base.length === 1;
  }
  const bf = state.battlefields.find((b) => b.battlefieldId === unit.battlefieldId);
  if (!bf) return false;
  return bf.units.filter((u) => u.controller === unit.controller).length === 1;
}

// A Play[] folds left-to-right. Spells resolve LIFO relative to each other
// on the chain — for this launch set (no card lets you respond mid-sequence
// with another chain item), that reduces to: later Plays in the array see
// the effects of earlier ones already applied, and each spell's own
// mightMod (if any) is appended in the order it resolves.
export function applyPlay(state: GameState, play: Play | Play[]): PlayResult {
  const plays = Array.isArray(play) ? play : [play];
  let current = state;
  const allEvents: GameEvent[] = [];
  let resolution: "computed" | "partial" = "computed";

  for (const p of plays) {
    const result = applyOnePlay(current, p);
    if (!result.legal) {
      return { ...result, events: allEvents, resultState: current };
    }
    allEvents.push(...result.events);
    current = result.resultState;
    if (result.resolution === "partial") resolution = "partial";
  }

  return { legal: true, events: allEvents, resultState: current, resolution };
}

// ---------------------------------------------------------------------------
// checkClean — the clean-stream gate (contract §3). Pure, no inference: it
// only checks what's already present on `m` (built by Engine's foldEvents /
// materialize) against an independently captured outcome. It does not
// re-run reconstruction and does not guess.
// ---------------------------------------------------------------------------

function foldedWinner(state: GameState): PlayerId | undefined {
  return (Object.keys(state.players) as PlayerId[]).find((pid) => state.players[pid].points >= state.pointsToWin);
}

export function checkClean(
  m: ReconstructedMatch,
  capturedOutcome: { winner?: PlayerId; finalPoints?: Record<PlayerId, number> }
): GateResult {
  const failures: string[] = [];

  // 1. Foldable — foldEvents produced one snapshot per event (it never
  // throws or drops an event; a mismatch here means `m` wasn't actually
  // built by foldEvents/materialize).
  const foldable = m.snapshots.length === m.events.length;
  if (!foldable) {
    failures.push(`snapshot count (${m.snapshots.length}) does not match event count (${m.events.length})`);
  }

  // 2. No black boxes — every event resolved to a known type.
  const noBlackBoxes = m.unresolved.length === 0;
  if (!noBlackBoxes) {
    failures.push(`${m.unresolved.length} unresolved event(s) at index ${m.unresolved.map((u) => u.index).join(", ")}`);
  }

  // 3. Legal — verifiable only where an event actually carries the data to
  // check against (costPaid on cardPlayed, checked against the runes
  // available in the immediately preceding snapshot). An event without
  // that data isn't flagged illegal — there's nothing to deductively
  // disprove — but it also isn't proof of legality; this is a check on
  // what's present, not a legality *inference*.
  let allLegal = true;
  m.events.forEach((event, index) => {
    if (event.type !== "cardPlayed" || !event.costPaid) return;
    const before = index > 0 ? m.snapshots[index - 1]?.state : undefined;
    if (!before) return;
    if (!canAfford(event.costPaid, before.players[event.player].runes)) {
      allLegal = false;
      failures.push(`event ${index}: cardPlayed by ${event.player} is unaffordable per its costPaid`);
    }
  });

  // 4. Outcome-consistent — the folded final state vs. the independently
  // captured result.
  let outcomeConsistent = true;
  const finalState = m.snapshots[m.snapshots.length - 1]?.state;
  if (!finalState) {
    if (capturedOutcome.winner || capturedOutcome.finalPoints) {
      outcomeConsistent = false;
      failures.push("no final state to check outcome against (empty snapshots)");
    }
  } else {
    if (capturedOutcome.finalPoints) {
      for (const pid of Object.keys(capturedOutcome.finalPoints) as PlayerId[]) {
        const expected = capturedOutcome.finalPoints[pid];
        const actual = finalState.players[pid].points;
        if (actual !== expected) {
          outcomeConsistent = false;
          failures.push(`final points for ${pid}: expected ${expected}, folded to ${actual}`);
        }
      }
    }
    if (capturedOutcome.winner) {
      const winner = foldedWinner(finalState);
      if (winner !== capturedOutcome.winner) {
        outcomeConsistent = false;
        failures.push(`winner: expected ${capturedOutcome.winner}, folded winner is ${winner ?? "none"}`);
      }
    }
  }

  return {
    pass: foldable && noBlackBoxes && allLegal && outcomeConsistent,
    foldable,
    noBlackBoxes,
    allLegal,
    outcomeConsistent,
    failures,
  };
}

// ---------------------------------------------------------------------------
// readSnapshot — the reader accessor (contract §1, §7). Readers import
// *only* this (plus the snapshot/state types) and never foldEvents /
// materialize / applyEvent directly — that structural gap is what makes it
// impossible for a reader to accidentally parse.
// ---------------------------------------------------------------------------

export function readSnapshot(m: ReconstructedMatch, at: number): MatchStateSnapshot {
  if (m.status !== "verified") {
    throw new Error(`readSnapshot: match status is "${m.status}", not "verified" — readers may only consume verified streams`);
  }
  const snapshot = m.snapshots[at];
  if (!snapshot) {
    throw new Error(`readSnapshot: no snapshot at index ${at} (stream has ${m.snapshots.length})`);
  }
  return snapshot;
}
