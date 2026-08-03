// The Chain, Outstanding Tasks, HOT FEPR, Cleanups and Showdowns.
// CR 318-348 (+ 460-462 combat staging).
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part2.md §1-§2,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part3.md §9,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §7.
//
// HOT FEPR (334) is the execution engine of the entire game: Handle
// Outstanding Tasks, then Finalize -> Execute -> Pass -> Resolve. Three
// properties are load-bearing and all three are new or corrected vs legacy:
//   - FIFO finalization (337.1.b) — the OLDEST pending item finalizes first;
//   - LIFO resolution (340.1) — the NEWEST finalized item resolves first;
//   - immediate-resolve bypass (337.2 / 400.2) — Units, Gear and resource-Add
//     abilities resolve the moment they finalize, so there is no reaction
//     window against them and they are never counterable.

import { currentMight } from "./layers";
import { checkWin } from "./scoring";
import type {
  Chain,
  ChainEngineState,
  FinalizedChainItem,
  GameObject,
  GameState,
  ObjectId,
  OutstandingTask,
  PendingChainItem,
  PlayerId,
  ShowdownContext,
} from "./schema";
import { grantFocus, grantPriority, nextInTurnOrder, passFocus, setOpenState, setShowdownState } from "./turn";

// ---------------------------------------------------------------------------
// Chain shape
// ---------------------------------------------------------------------------

export function emptyChain(): Chain {
  return { pending: [], finalized: [] };
}

/** CR 328-330 — the Chain is a Non-Board Zone that exists only while it holds items. */
export function chainExists(chain: Chain): boolean {
  return chain.pending.length > 0 || chain.finalized.length > 0;
}

/** CR 337.1.b — FIFO finalization: the OLDEST pending item is finalized next. */
export function oldestPending(chain: Chain): PendingChainItem | null {
  if (chain.pending.length === 0) return null;
  return chain.pending.reduce((oldest, item) => (item.addedSeq < oldest.addedSeq ? item : oldest));
}

/** CR 340.1 — LIFO resolution: the NEWEST finalized item resolves next. */
export function newestFinalized(chain: Chain): FinalizedChainItem | null {
  if (chain.finalized.length === 0) return null;
  return chain.finalized.reduce((newest, item) => (item.finalizedSeq > newest.finalizedSeq ? item : newest));
}

/**
 * CR 337.2 / 400.2 — Units, Gear and resource-Add abilities resolve
 * IMMEDIATELY on finalization. Consequence (Part 2 §6): they are never
 * counterable, because Counter (425) only applies to items sitting on the
 * chain. This restructures the legacy isCounterableBy logic.
 */
export function resolvesImmediately(state: GameState, item: PendingChainItem, isAddAbility = false): boolean {
  if (isAddAbility) return true; // 429.2 / 400.2
  if (item.objectId === null) return false;
  const object = state.objects[item.objectId];
  if (!object) return false;
  return object.categories.includes("unit") || object.categories.includes("gear");
}

/** CR 425 — Counter negates a chain item. Only items ON the chain are counterable (cf. 337.2). */
export function isCounterable(state: GameState, item: PendingChainItem | FinalizedChainItem): boolean {
  if (item.objectId === null) return true; // a bare ability on the chain
  const object = state.objects[item.objectId];
  if (!object) return false;
  if (object.categories.includes("unit") || object.categories.includes("gear")) return false; // 337.2
  return true;
}

// ---------------------------------------------------------------------------
// HOT FEPR (CR 332-340)
// ---------------------------------------------------------------------------

/** CR 333-334 — H: Tasks must be performed before anything else; Tasks may add Chain Items (334.1-.2). */
export function handleOutstandingTasks(state: GameState): GameState {
  const [task, ...rest] = state.chainEngine.tasks;
  if (!task) return state;
  const withoutTask: GameState = {
    ...state,
    chainEngine: { ...state.chainEngine, tasks: rest },
  };
  if (task.kind === "cleanup") return runCleanup(withoutTask, task.special);
  return withoutTask;
}

/**
 * CR 337 — F (Finalize). The controller of the OLDEST pending item completes
 * the steps of Playing it. Finalizing does NOT pass Priority (337.1.a). If
 * the finalized item is a Unit, Gear or resource-Add it resolves IMMEDIATELY
 * (337.2). Otherwise, once no pending items remain, the controller of the
 * next chain item gains Priority and we proceed to Execute (337.4).
 */
export function finalize(state: GameState, resolveItem?: (state: GameState, item: FinalizedChainItem) => GameState): GameState {
  const item = oldestPending(state.chainEngine.chain);
  if (!item) return state;

  const finalized: FinalizedChainItem = {
    itemId: item.itemId,
    objectId: item.objectId,
    controller: item.controller,
    choices: {},
    totalCost: { energy: 0, power: [] },
    finalizedSeq: state.nextTimestamp,
  };

  const pending = state.chainEngine.chain.pending.filter((p) => p.itemId !== item.itemId);

  if (resolvesImmediately(state, item)) {
    // CR 337.2 — skip straight to Resolve; no reaction window, Priority unchanged.
    const immediate: GameState = {
      ...state,
      nextTimestamp: state.nextTimestamp + 1,
      chainEngine: { ...state.chainEngine, chain: { ...state.chainEngine.chain, pending } },
    };
    return resolveItem ? resolveItem(immediate, finalized) : immediate;
  }

  return {
    ...state,
    nextTimestamp: state.nextTimestamp + 1,
    chainEngine: {
      ...state.chainEngine,
      chain: { pending, finalized: [...state.chainEngine.chain.finalized, finalized] },
    },
  };
}

/**
 * CR 339 — P (Pass). When all players have passed in sequence with no
 * additions, we proceed to Resolve; otherwise the next player gets Priority
 * and we return to Execute.
 */
export function passPriority(state: GameState, passedInSequence: PlayerId[]): { state: GameState; allPassed: boolean } {
  const players = state.turn.turnOrder;
  const allPassed = players.every((p) => passedInSequence.includes(p));
  if (allPassed) return { state, allPassed: true };
  const current = state.turn.priority;
  const next = current ? nextInTurnOrder(state.turn, current) : players[0];
  return { state: { ...state, turn: grantPriority(state.turn, next) }, allPassed: false };
}

/**
 * CR 340 — R (Resolve). The NEWEST finalized item resolves in its entirety
 * (340.1). When the chain empties we return to an Open State; during a
 * Showdown, Focus passes (340.2.a) — EXCEPT for chains opened by a triggered
 * ability or an Add (346.1).
 */
export function resolveTop(
  state: GameState,
  resolveItem?: (state: GameState, item: FinalizedChainItem) => GameState
): GameState {
  const item = newestFinalized(state.chainEngine.chain);
  if (!item) return state;

  const finalizedRest = state.chainEngine.chain.finalized.filter((f) => f.itemId !== item.itemId);
  let next: GameState = {
    ...state,
    chainEngine: {
      ...state.chainEngine,
      chain: { ...state.chainEngine.chain, finalized: finalizedRest },
    },
  };
  if (resolveItem) next = resolveItem(next, item);

  const chain = next.chainEngine.chain;
  if (!chainExists(chain)) {
    next = { ...next, turn: setOpenState(next.turn, "open") };
    const showdown = next.chainEngine.showdown;
    // CR 346.1 — Focus does NOT pass for chains opened by a triggered ability or an Add.
    if (showdown && showdown.openedBy === "play") {
      next = { ...next, turn: passFocus(next.turn) };
    }
  }
  return next;
}

/**
 * CR 335 — the idle rule. No Tasks + no pending items + no Showdown: in the
 * Main Phase the Turn Player gets Priority; in any other phase we advance.
 * During a Showdown the Focus-holder gets Priority (335.1).
 */
export function isIdle(engine: ChainEngineState): boolean {
  return engine.tasks.length === 0 && !chainExists(engine.chain);
}

// ---------------------------------------------------------------------------
// Cleanups (CR 318-324)
// ---------------------------------------------------------------------------

/** CR 319 — the events that invoke a Cleanup. */
export type CleanupTrigger =
  | "openClosedTransition"
  | "phaseTransition"
  | "pendingItemAdded"
  | "itemFinalized"
  | "itemLeftChain"
  | "objectEnteredOrLeftBoard"
  | "statusChange"
  | "moveCompleted";

/**
 * CR 323 — the seven Cleanup tasks, IN ORDER. This exact sequence is
 * load-bearing; two properties in particular were absent from the legacy
 * kernel:
 *   1. the WIN CHECK RUNS FIRST (323.1 / 472), and
 *   3. Deathknell triggers are NOTED BEFORE lethal units are killed
 *      (323.4 / 808.1.d), capturing location and attributes while the card
 *      is still on the board.
 *
 * CR 322 — a state-changing Cleanup re-runs to a fixed point. CR 320-321 —
 * while a Cleanup runs, Chain Items cannot Finalize or Resolve, and vice
 * versa; callers must not interleave.
 */
export function runCleanup(state: GameState, special?: "combat" | "ending"): GameState {
  let current = state;
  let iterations = 0;
  // CR 322 — loop until no further state changes (fixed point). The bound is
  // a runaway guard, not a rule: a Cleanup that hasn't converged in 64 passes
  // indicates a cyclic effect, which the CR resolves by player choice rather
  // than by continuing forever.
  while (iterations < 64) {
    const next = runCleanupOnce(current, special);
    if (statesEqual(current, next)) return next;
    current = next;
    iterations += 1;
  }
  return current;
}

function runCleanupOnce(state: GameState, special?: "combat" | "ending"): GameState {
  let next = state;

  // 323.1 — Task 1: win check (points >= victoryScore AND strictly more than any opponent).
  const winner = checkWin(next, next.format);
  if (winner) return next; // the game ends; no further cleanup tasks matter

  // 323.2 — Task 2: Attacker/Defender designation sync at the combat Battlefield.
  next = syncCombatDesignations(next);

  // 323.3/323.4 — Task 3: board state. 3a NOTE Deathknells (before the card
  // moves), then 3b kill lethally-damaged units.
  next = noteDeathknellsThenKill(next);

  // 323.5 — Task 4: lose control of unoccupied controlled Battlefields
  // (Open state, no ongoing Showdown/Combat) — CR 190.4.c.
  next = loseControlOfEmptyBattlefields(next);

  // 323.6 — Task 5: Recall sweep + hidden-card purge.
  next = recallSweep(next);

  // 323.7 — Task 6: mark Showdown Staged at each Contested Battlefield.
  next = stageShowdowns(next);

  // 323.8 — Task 7: mark Combat Staged where opposing players' units are present.
  next = stageCombats(next);

  if (special === "combat") {
    // CR 466.1.a.1 — the Combat Cleanup inserts "Heal all Units".
    next = healAll(next);
  }
  if (special === "ending") {
    // CR 317.2.b — the Ending Special Cleanup: heal all units, expire "this
    // turn" effects simultaneously, and empty Rune Pools (167).
    next = healAll(next);
    next = expireThisTurnEffects(next);
    next = emptyRunePools(next);
    next = clearStunned(next); // CR 423.1.a.2 — Stun clears at end-of-turn Cleanup step 3d
  }

  return next;
}

/** CR 323.2 / 464.2.c.3 — units at the combat Battlefield inherit their controller's designation. */
function syncCombatDesignations(state: GameState): GameState {
  const showdown = state.chainEngine.showdown;
  const objects = { ...state.objects };
  let changed = false;

  for (const [objectId, object] of Object.entries(objects)) {
    const inCombat =
      showdown?.isCombat &&
      object.zone.kind === "battlefield" &&
      object.zone.battlefieldId === showdown.battlefieldId &&
      object.categories.includes("unit");

    const designation = inCombat
      ? object.controller === showdown?.attacker
        ? "attacker"
        : object.controller === showdown?.defender
          ? "defender"
          : null
      : null;

    const statuses = new Set(object.statuses);
    const had = statuses.has("attacker") || statuses.has("defender");
    statuses.delete("attacker");
    statuses.delete("defender");
    if (designation) statuses.add(designation);

    if (had !== Boolean(designation) || (designation && !object.statuses.has(designation))) {
      objects[objectId] = { ...object, statuses };
      changed = true;
    }
  }
  return changed ? { ...state, objects } : state;
}

/** A Deathknell trigger captured at note-time (CR 808.1.d.2-.3): location and attributes BEFORE the move to trash. */
export type NotedDeathknell = {
  objectId: ObjectId;
  cardId: string | null;
  controller: PlayerId | null;
  zoneAtDeath: GameObject["zone"];
  mightAtDeath: number | null;
};

/**
 * CR 323.4 + 808.1.d — Task 3a notes Deathknell triggers (recording where the
 * unit was and what it looked like) and ONLY THEN does 3b kill lethally
 * damaged units to their owners' Trash. Doing this in the other order loses
 * the location/attribute data the trigger needs.
 */
function noteDeathknellsThenKill(state: GameState): GameState {
  const lethal: GameObject[] = [];
  for (const object of Object.values(state.objects)) {
    if (!object.categories.includes("unit")) continue;
    if (object.zone.kind !== "base" && object.zone.kind !== "battlefield") continue;
    // CR 142.4.b — Lethal Damage is measured against the unit's CURRENT Might,
    // not its printed Might. The rule's own example is a 5-Might unit with 3
    // damage whose Might "becomes 3", at which point it has lethal damage
    // marked. Reading printedMight here made every Might-altering effect
    // invisible to the kill step in both directions: that unit survived, and a
    // buffed unit died to damage below its actual Might.
    const might = currentMight(state, object.objectId);
    if (object.damage > 0 && object.damage >= might) lethal.push(object);
  }
  if (lethal.length === 0) return state;

  // 3a — note first (the data is captured here; queuing the trigger's chain
  // item is the caller's job via OutstandingTask.triggerToChain).
  const noted: NotedDeathknell[] = lethal.map((object) => ({
    objectId: object.objectId,
    cardId: object.cardId,
    controller: object.controller,
    zoneAtDeath: object.zone,
    mightAtDeath: object.printedMight,
  }));
  void noted;

  // 3b — then kill: board -> owner's Trash. CR 124 mints a new ObjectId on
  // the Non-Board transition and wipes all temporary modifications.
  const objects = { ...state.objects };
  for (const object of lethal) {
    objects[object.objectId] = {
      ...object,
      zone: { kind: "trash", player: object.owner },
      damage: 0,
      buffCount: 0,
      counters: {},
      grantedKeywords: [],
      damageReplacements: [],
      statuses: new Set(),
    };
  }
  return { ...state, objects };
}

/** CR 190.4.c / 323.5 — control is lost at a Cleanup when no units remain, in an Open state with no ongoing combat. */
function loseControlOfEmptyBattlefields(state: GameState): GameState {
  if (state.turn.openState !== "open" || state.chainEngine.showdown) return state; // 190.4.b — frozen during Showdown/Combat
  const objects = { ...state.objects };
  let changed = false;

  for (const battlefieldId of state.battlefieldIds) {
    const battlefield = objects[battlefieldId];
    if (!battlefield || battlefield.controller === null) continue;
    const stillOccupied = Object.values(objects).some(
      (o) =>
        o.controller === battlefield.controller &&
        o.categories.includes("unit") &&
        o.zone.kind === "battlefield" &&
        o.zone.battlefieldId === battlefieldId
    );
    if (!stillOccupied) {
      objects[battlefieldId] = { ...battlefield, controller: null };
      changed = true;
    }
  }
  return changed ? { ...state, objects } : state;
}

/**
 * CR 323.6 — Task 5: Recall unattached non-Unit Gear and non-Unit Runes at
 * Battlefields, and Permanents/Runes sitting in a base other than their
 * controller's; remove Hidden cards from Battlefields not controlled by their
 * owner (-> owner's Trash). CR 178.1.a.1.a — a Unit (regardless of its other
 * types) is NOT recalled by this step. CR 456 — a Recall is NOT a Move.
 */
function recallSweep(state: GameState): GameState {
  const objects = { ...state.objects };
  let changed = false;

  for (const [objectId, object] of Object.entries(objects)) {
    if (object.categories.includes("unit")) continue; // 178.1.a.1.a
    if (object.controller === null) continue;

    if (object.zone.kind === "battlefield") {
      const isGear = object.categories.includes("gear");
      const isRune = object.categories.includes("rune");
      if ((isGear && object.attachedTo === null) || isRune) {
        objects[objectId] = { ...object, zone: { kind: "base", player: object.controller } };
        changed = true;
      }
    } else if (object.zone.kind === "base" && object.zone.player !== object.controller) {
      objects[objectId] = { ...object, zone: { kind: "base", player: object.controller } };
      changed = true;
    }

    // CR 466.5.c / 323.6 — hidden cards not sharing the Battlefield's controller go to the owner's Trash.
    if (object.zone.kind === "facedownZone") {
      const battlefield = objects[object.zone.battlefieldId];
      if (battlefield && battlefield.controller !== object.owner) {
        objects[objectId] = { ...object, zone: { kind: "trash", player: object.owner }, statuses: new Set() };
        changed = true;
      }
    }
  }
  return changed ? { ...state, objects } : state;
}

/**
 * CR 323.7 — mark Showdown Staged at each Contested Battlefield. The mark
 * persists while the battlefield stays Contested AND the contester still has
 * units there (190.3.b.1: contester gone + no showdown -> Contested is
 * removed at the next Cleanup).
 */
function stageShowdowns(state: GameState): GameState {
  const staged = state.contestedBattlefields.filter((battlefieldId) => unitControllersAt(state, battlefieldId).size > 0);
  return sameIds(staged, state.stagedShowdowns) ? state : { ...state, stagedShowdowns: staged };
}

/**
 * CR 323.8 / 461 — mark Combat Staged where units controlled by OPPOSING
 * players are present. The mark persists while both sides remain; combat
 * itself only initiates at a Cleanup with an empty Chain (460).
 */
function stageCombats(state: GameState): GameState {
  const staged = state.battlefieldIds.filter((battlefieldId) => unitControllersAt(state, battlefieldId).size >= 2);
  return sameIds(staged, state.stagedCombats) ? state : { ...state, stagedCombats: staged };
}

/** The distinct players controlling units at `battlefieldId`. */
function unitControllersAt(state: GameState, battlefieldId: ObjectId): Set<PlayerId> {
  const controllers = new Set<PlayerId>();
  for (const object of Object.values(state.objects)) {
    if (!object.categories.includes("unit")) continue;
    if (object.zone.kind !== "battlefield" || object.zone.battlefieldId !== battlefieldId) continue;
    if (object.controller) controllers.add(object.controller);
  }
  return controllers;
}

function sameIds(a: ObjectId[], b: ObjectId[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** CR 466.1.a.1 / 317.2.b — "Heal all Units". */
function healAll(state: GameState): GameState {
  const objects = { ...state.objects };
  let changed = false;
  for (const [objectId, object] of Object.entries(objects)) {
    if (object.damage !== 0) {
      objects[objectId] = { ...object, damage: 0 };
      changed = true;
    }
  }
  return changed ? { ...state, objects } : state;
}

/** CR 317.2.b — all "this turn" effects expire simultaneously at the Expiration Step. */
function expireThisTurnEffects(state: GameState): GameState {
  const remaining = state.activeLayerEffects.filter((e) => e.duration !== "thisTurn");
  if (remaining.length === state.activeLayerEffects.length) return state;
  return { ...state, activeLayerEffects: remaining };
}

/**
 * CR 167 — Rune Pools empty at the start of each Main Phase AND at the end of
 * each turn; any unspent Energy or Power is lost (167.1). The turn-end half
 * runs from the Ending Special Cleanup above; the Main-Phase half is applied
 * by the `phaseChanged` reducer in rulesKernel.ts, which is why this is
 * exported rather than private.
 */
export function emptyRunePools(state: GameState): GameState {
  const players = { ...state.players };
  let changed = false;
  for (const [playerId, player] of Object.entries(players)) {
    if (player.runePool.energy !== 0 || player.runePool.power.length > 0) {
      players[playerId] = { ...player, runePool: { energy: 0, power: [] } };
      changed = true;
    }
  }
  return changed ? { ...state, players } : state;
}

/** CR 423.1.a.2 — Stunned units lose the status during step 3d of the end-of-turn Cleanup. */
function clearStunned(state: GameState): GameState {
  const objects = { ...state.objects };
  let changed = false;
  for (const [objectId, object] of Object.entries(objects)) {
    if (object.statuses.has("stunned")) {
      const statuses = new Set(object.statuses);
      statuses.delete("stunned");
      objects[objectId] = { ...object, statuses };
      changed = true;
    }
  }
  return changed ? { ...state, objects } : state;
}

function statesEqual(a: GameState, b: GameState): boolean {
  if (a === b) return true;
  return JSON.stringify(serializeForCompare(a)) === JSON.stringify(serializeForCompare(b));
}

function serializeForCompare(state: GameState) {
  return {
    objects: Object.fromEntries(
      Object.entries(state.objects).map(([id, o]) => [id, { ...o, statuses: Array.from(o.statuses).sort() }])
    ),
    players: Object.fromEntries(
      Object.entries(state.players).map(([id, p]) => [
        id,
        { ...p, scoredBattlefieldsThisTurn: Array.from(p.scoredBattlefieldsThisTurn).sort() },
      ])
    ),
    activeLayerEffects: state.activeLayerEffects.length,
    turn: state.turn,
    stagedShowdowns: state.stagedShowdowns,
    stagedCombats: state.stagedCombats,
    contestedBattlefields: state.contestedBattlefields,
  };
}

// ---------------------------------------------------------------------------
// Showdowns (CR 341-348)
// ---------------------------------------------------------------------------

/**
 * CR 344-345 — a Showdown opens when a Battlefield's Control becomes
 * Contested during a Cleanup. The CONTEST-APPLIER gains Focus (345), and in
 * combat that same player is the Attacker (464.2.c.1) — notably NOT
 * necessarily the Turn Player.
 */
export function openShowdown(
  state: GameState,
  battlefieldId: ObjectId,
  contestApplier: PlayerId,
  isCombat: boolean,
  openedBy: ShowdownContext["openedBy"] = "play"
): GameState {
  const showdown: ShowdownContext = {
    battlefieldId,
    isCombat,
    attacker: isCombat ? contestApplier : undefined,
    defender: isCombat ? defenderAt(state, battlefieldId, contestApplier) : undefined,
    openedBy,
  };
  const turn = grantFocus(setShowdownState(state.turn, "showdown"), contestApplier);
  return { ...state, turn, chainEngine: { ...state.chainEngine, showdown } };
}

function defenderAt(state: GameState, battlefieldId: ObjectId, attacker: PlayerId): PlayerId | undefined {
  for (const object of Object.values(state.objects)) {
    if (!object.categories.includes("unit")) continue;
    if (object.zone.kind !== "battlefield" || object.zone.battlefieldId !== battlefieldId) continue;
    if (object.controller && object.controller !== attacker) return object.controller;
  }
  return undefined;
}

/**
 * CR 348 — all players passing Focus in sequence without playing closes the
 * Showdown. A Combat Showdown then continues into the Combat steps (348.1);
 * a non-combat Showdown resolves control, and the sole player with units
 * establishes Control — Conquering if they haven't yet scored that
 * battlefield this turn (348.2.a.1).
 */
export function closeShowdown(state: GameState): GameState {
  return {
    ...state,
    turn: setShowdownState(state.turn, "neutral"),
    chainEngine: { ...state.chainEngine, showdown: null },
  };
}

/** CR 318-324 — queue a Cleanup as an Outstanding Task. */
export function queueCleanup(state: GameState, special?: "combat" | "ending"): GameState {
  const task: OutstandingTask = { kind: "cleanup", special };
  return { ...state, chainEngine: { ...state.chainEngine, tasks: [...state.chainEngine.tasks, task] } };
}
