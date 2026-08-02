// The 32 Game Actions — the canonical effect vocabulary. CR 413-444.
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part4.md §5,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §11.
//
// These 32 verbs REPLACE the legacy ~10 invented EffectPrimitive ops. Naming
// collisions matter here: the legacy `BuffMight` meant arbitrary Might
// arithmetic, whereas the CR's `Buff` (426) means "place a Buff counter",
// capped at one per unit. Arbitrary Might arithmetic is a Layer-3
// ArithmeticOp (see layers.ts), NOT Buff.
//
// Each function is a pure state transition. Effects that are inherently
// interactive (choices, targeting, ordering) take the already-made decision
// as a parameter rather than prompting — the kernel never guesses a choice.

import { resolveDamageThroughReplacements } from "./combat";
import type {
  CardId,
  Cost,
  DamageReplacement,
  Domain,
  GameState,
  Location,
  ObjectId,
  ObjectStatus,
  PlayerId,
  PowerSymbol,
  Zone,
} from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withObject(state: GameState, objectId: ObjectId, fn: (o: GameState["objects"][string]) => GameState["objects"][string]): GameState {
  const object = state.objects[objectId];
  if (!object) return state;
  return { ...state, objects: { ...state.objects, [objectId]: fn(object) } };
}

function withPlayer(state: GameState, playerId: PlayerId, fn: (p: GameState["players"][string]) => GameState["players"][string]): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  return { ...state, players: { ...state.players, [playerId]: fn(player) } };
}

function addStatus(state: GameState, objectId: ObjectId, status: ObjectStatus): GameState {
  return withObject(state, objectId, (o) => {
    const statuses = new Set(o.statuses);
    statuses.add(status);
    return { ...o, statuses };
  });
}

function removeStatus(state: GameState, objectId: ObjectId, status: ObjectStatus): GameState {
  return withObject(state, objectId, (o) => {
    const statuses = new Set(o.statuses);
    statuses.delete(status);
    return { ...o, statuses };
  });
}

const NON_BOARD_KINDS: ReadonlySet<Zone["kind"]> = new Set([
  "chain",
  "trash",
  "championZone",
  "mainDeck",
  "runeDeck",
  "banishment",
  "hand",
]);

export function isNonBoardZone(zone: Zone): boolean {
  return NON_BOARD_KINDS.has(zone.kind);
}

/**
 * CR 124 — an object changing zones TO or FROM a Non-Board Zone becomes a NEW
 * object: all temporary modifications cease (damage cleared, counters
 * removed, granted keywords lost, statuses cleared). The caller supplies the
 * fresh ObjectId; identity continuity is deliberately broken here.
 */
export function changeZone(state: GameState, objectId: ObjectId, to: Zone, newObjectId?: ObjectId): GameState {
  const object = state.objects[objectId];
  if (!object) return state;
  // "to or from a Non-Board Zone" — i.e. every transition EXCEPT board-to-board.
  const crossesNonBoard = isNonBoardZone(object.zone) || isNonBoardZone(to);

  if (!crossesNonBoard) {
    return withObject(state, objectId, (o) => ({ ...o, zone: to }));
  }

  const freshId = newObjectId ?? objectId;
  const objects = { ...state.objects };
  delete objects[objectId];
  objects[freshId] = {
    ...object,
    objectId: freshId,
    zone: to,
    damage: 0,
    buffCount: 0,
    counters: {},
    grantedKeywords: [],
    damageReplacements: [],
    attachedTo: null,
    attachments: [],
    statuses: new Set(),
  };
  return { ...state, objects };
}

// ---------------------------------------------------------------------------
// The 32 actions
// ---------------------------------------------------------------------------

/** CR 413 — Draw: take the top card(s) of the Main Deck to Hand. Short deck -> draw what you can, Burn Out, then the remainder (413.4). */
export function draw(state: GameState, player: PlayerId, count: number): { state: GameState; drawn: ObjectId[]; burnOut: boolean } {
  const deck = state.deckOrder[player] ?? [];
  const available = Math.min(count, deck.length);
  const drawn = deck.slice(0, available);
  const rest = deck.slice(available);

  let next: GameState = { ...state, deckOrder: { ...state.deckOrder, [player]: rest } };
  for (const objectId of drawn) {
    next = changeZone(next, objectId, { kind: "hand", player });
  }
  next = withPlayer(next, player, (p) => ({ ...p, handCount: p.handCount + drawn.length }));

  return { state: next, drawn, burnOut: available < count }; // 413.4
}

/** CR 414 — Exhaust: mark a non-spell board object spent. An already-exhausted object cannot be exhausted, so it FAILS as a cost (414.4). */
export function exhaust(state: GameState, objectId: ObjectId): { state: GameState; succeeded: boolean } {
  const object = state.objects[objectId];
  if (!object || object.statuses.has("exhausted")) return { state, succeeded: false }; // 414.4
  return { state: addStatus(state, objectId, "exhausted"), succeeded: true };
}

/** CR 415 — Ready: the inverse of Exhaust. An already-ready object cannot be readied. */
export function ready(state: GameState, objectId: ObjectId): { state: GameState; succeeded: boolean } {
  const object = state.objects[objectId];
  if (!object || !object.statuses.has("exhausted")) return { state, succeeded: false };
  return { state: removeStatus(state, objectId, "exhausted"), succeeded: true };
}

/** CR 415 — the Awaken Phase Task: the Turn Player readies all readyable objects they control. */
export function readyAll(state: GameState, player: PlayerId): GameState {
  let next = state;
  for (const object of Object.values(state.objects)) {
    if (object.controller === player && object.statuses.has("exhausted")) {
      next = removeStatus(next, object.objectId, "exhausted");
    }
  }
  return next;
}

/**
 * CR 416 — Recycle: to the BOTTOM of the corresponding deck, always the
 * OWNER's deck (416.1.c). CR 416.5.a — 2+ cards to the Main Deck go in
 * RANDOM order; 2+ to the Rune Deck go in the OWNER'S CHOSEN order. The
 * asymmetry is real and matters to Engine's deck-state reasoning.
 */
export function recycle(
  state: GameState,
  objectIds: ObjectId[],
  to: "mainDeck" | "runeDeck",
  order?: ObjectId[]
): GameState {
  if (objectIds.length === 0) return state;
  const ordered = order ?? objectIds;
  let next = state;
  const byOwner = new Map<PlayerId, ObjectId[]>();

  for (const objectId of ordered) {
    const object = next.objects[objectId];
    if (!object) continue;
    next = changeZone(next, objectId, { kind: to, player: object.owner });
    byOwner.set(object.owner, [...(byOwner.get(object.owner) ?? []), objectId]);
  }

  for (const [owner, ids] of byOwner) {
    const key = to === "mainDeck" ? "deckOrder" : "runeDeckOrder";
    const current = next[key][owner] ?? [];
    next = { ...next, [key]: { ...next[key], [owner]: [...current, ...ids] } }; // bottom
  }
  return next;
}

/**
 * CR 417 — Deal: mark damage on units. Assigning is NOT dealing (417.1.a);
 * valid damage is >= 1 (417.1.e). CR 712-715 — Bonus Damage sums and applies
 * once to the total.
 *
 * `raw` is the instructed amount BEFORE the unit's replacement chain, in the
 * Addendum A sense: dealing raw 3 to a unit that doubles marks 6 damage. The
 * name is deliberate — the number that lands is the return value's effect on
 * `damage`, never this parameter.
 */
export function deal(state: GameState, targetObjectId: ObjectId, raw: number, bonusDamage = 0): GameState {
  const total = raw + Math.max(0, bonusDamage); // 714.2 — bonus is positive-only
  if (total < 1) return state; // 417.1.e
  const object = state.objects[targetObjectId];
  if (!object) return state;

  // CR 437.3-.4 — the replacement chain absorbs and decrements; fully-prevented
  // damage was never dealt. Outside combat there is no separate assignment
  // step, so the chain runs here.
  const { dealt, next } = resolveDamageThroughReplacements(object.damageReplacements, total);
  return withObject(state, targetObjectId, (o) => ({ ...o, damage: o.damage + dealt, damageReplacements: next }));
}

/** CR 418 — Heal: any clearing of damage is Healing (418.1.a). */
export function heal(state: GameState, objectId: ObjectId, amount?: number): GameState {
  return withObject(state, objectId, (o) => ({ ...o, damage: amount === undefined ? 0 : Math.max(0, o.damage - amount) }));
}

/**
 * CR 419 — Play: put a card on the Chain and queue it for finalization. By
 * default only from Hand or the Champion Zone (419.1.a). Discretionary when
 * chosen, but effect-driven play is LIMITED (419.3.a). No eligible card ->
 * nothing happens (419.3.c). CR 425.1.b — a COUNTERED card was never
 * "played", so play-triggers don't fire.
 */
export function play(state: GameState, objectId: ObjectId, controller: PlayerId): GameState {
  const object = state.objects[objectId];
  if (!object) return state; // 419.3.c
  const item = {
    itemId: `item-${state.nextTimestamp}`,
    objectId,
    controller,
    kind: "card" as const,
    addedSeq: state.nextTimestamp,
  };
  return {
    ...state,
    nextTimestamp: state.nextTimestamp + 1,
    chainEngine: {
      ...state.chainEngine,
      chain: { ...state.chainEngine.chain, pending: [...state.chainEngine.chain.pending, item] },
    },
    turn: { ...state.turn, openState: "closed" }, // CR 354 — moving a card to the Chain Closes the State
  };
}

/** CR 420 — Move: between Locations. LIMITED, except the Standard Move which is Discretionary with cost = exhaust the unit (420.3). CR 456 — a Recall is NOT a Move. */
export function move(state: GameState, objectId: ObjectId, to: Location): GameState {
  return withObject(state, objectId, (o) => ({ ...o, zone: to }));
}

/**
 * CR 454-458 — Recall: relocation to Base that is explicitly NOT a Move
 * (456), so move-triggers do not fire. State-preserving (458). Gear can be
 * Recalled (457).
 */
export function recall(state: GameState, objectId: ObjectId): GameState {
  const object = state.objects[objectId];
  if (!object || object.controller === null) return state;
  return withObject(state, objectId, (o) => ({ ...o, zone: { kind: "base", player: object.controller as PlayerId } }));
}

/** CR 421 — Hide: place a card facedown at a Battlefield you control. Discretionary (421.2). CR 811.1.c.1 — Hide is NOT a subset of Play. */
export function hide(state: GameState, objectId: ObjectId, battlefieldId: ObjectId): GameState {
  const next = changeZone(state, objectId, { kind: "facedownZone", battlefieldId });
  return addStatus(next, objectId, "facedown");
}

/** CR 422 — Discard: hand -> trash without executing text; the performer chooses using private info (422.1.a). */
export function discard(state: GameState, objectId: ObjectId): GameState {
  const object = state.objects[objectId];
  if (!object) return state;
  const next = changeZone(state, objectId, { kind: "trash", player: object.owner });
  return withPlayer(next, object.owner, (p) => ({ ...p, handCount: Math.max(0, p.handCount - 1) }));
}

/**
 * CR 423 — Stun. A Stunned unit contributes NO Might in the damage step
 * (423.1.b) but STILL needs full-Might damage to be killed (423.1.c) — the
 * asymmetry is deliberate. CR 423.1.a.1 — a Stunned unit CANNOT be stunned
 * again, and re-stunning fires no "when you stun" trigger.
 */
export function stun(state: GameState, objectId: ObjectId): { state: GameState; applied: boolean } {
  const object = state.objects[objectId];
  if (!object || object.statuses.has("stunned")) return { state, applied: false }; // 423.1.a.1
  return { state: addStatus(state, objectId, "stunned"), applied: true };
}

/** CR 424 — Reveal: a temporary known-state, NOT a zone (424.1.a). Voluntarily showing private info is not revealing and triggers nothing (424.2.b). */
export function reveal(state: GameState, objectId: ObjectId, cardId: CardId): GameState {
  const next = withObject(state, objectId, (o) => ({ ...o, cardId }));
  return addStatus(next, objectId, "revealed");
}

/** CR 425 — Counter: negate a chain item. The countered card was never "played" (425.1.b) and costs are NOT refunded (425.1.c). */
export function counter(state: GameState, itemId: string): GameState {
  const chain = state.chainEngine.chain;
  return {
    ...state,
    chainEngine: {
      ...state.chainEngine,
      chain: {
        pending: chain.pending.filter((p) => p.itemId !== itemId),
        finalized: chain.finalized.filter((f) => f.itemId !== itemId),
      },
    },
  };
}

/**
 * CR 426 + 702.3 — Buff: place a Buff counter (+1 Might, 703). MAX ONE PER
 * UNIT. Adding to an already-buffed unit does NOT place another, and
 * critically the unit "was NOT Buffed" for follow-on effects (426.1.c): a
 * "Buff a unit. Then if it was buffed this way, draw" fails on an
 * already-buffed target, and "when you buff me" does not trigger.
 */
export function buff(state: GameState, objectId: ObjectId): { state: GameState; applied: boolean } {
  const object = state.objects[objectId];
  if (!object || object.buffCount >= 1) return { state, applied: false }; // 702.3 / 426.1.c
  const next = withObject(state, objectId, (o) => ({ ...o, buffCount: 1 as const }));
  return { state: addStatus(next, objectId, "buffed"), applied: true };
}

/** CR 702.2 — spend a Buff (removes the counter; only from units you control, 702.2.b.2). */
export function spendBuff(state: GameState, objectId: ObjectId, spender: PlayerId): { state: GameState; spent: boolean } {
  const object = state.objects[objectId];
  if (!object || object.buffCount === 0 || object.controller !== spender) return { state, spent: false };
  const next = withObject(state, objectId, (o) => ({ ...o, buffCount: 0 as const }));
  return { state: removeStatus(next, objectId, "buffed"), spent: true };
}

/** CR 427 — Banish: any zone -> Banishment. NOT a subset of Kill or Discard (427.2.a-b). */
export function banish(state: GameState, objectId: ObjectId): GameState {
  const object = state.objects[objectId];
  if (!object) return state;
  return changeZone(state, objectId, { kind: "banishment", player: object.owner });
}

/** CR 428 — Kill: a permanent goes board -> trash. Only counts as Killed if the ORIGIN was a board zone (428.2.a); NOT a subset of Move (428.2.b). */
export function kill(state: GameState, objectId: ObjectId): { state: GameState; counted: boolean } {
  const object = state.objects[objectId];
  if (!object) return { state, counted: false };
  const counted = !isNonBoardZone(object.zone); // 428.2.a
  return { state: changeZone(state, objectId, { kind: "trash", player: object.owner }), counted };
}

/** CR 429 — Add: put resources in the Rune Pool. Triggered/activated Adds resolve as soon as finalized and Priority/Focus don't pass (429.2-.2.a). */
export function add(state: GameState, player: PlayerId, energy: number, power: PowerSymbol[]): GameState {
  return withPlayer(state, player, (p) => ({
    ...p,
    runePool: {
      energy: p.runePool.energy + energy,
      power: [
        ...p.runePool.power,
        ...power.map((symbol) => ({
          domain: (symbol.kind === "domain" ? symbol.domain : "Fury") as Domain,
          universal: symbol.kind === "any",
        })),
      ],
    },
  }));
}

/** CR 430 — Channel: top of Rune Deck -> board, READY by default (430.2.a). Short deck -> as many as possible. 2 during the Channel Phase. */
export function channel(state: GameState, player: PlayerId, count: number): { state: GameState; channeled: ObjectId[] } {
  const runeDeck = state.runeDeckOrder[player] ?? [];
  const available = Math.min(count, runeDeck.length);
  const channeled = runeDeck.slice(0, available);
  const rest = runeDeck.slice(available);

  let next: GameState = { ...state, runeDeckOrder: { ...state.runeDeckOrder, [player]: rest } };
  for (const objectId of channeled) {
    next = changeZone(next, objectId, { kind: "base", player });
    next = removeStatus(next, objectId, "exhausted"); // 430.2.a — enters ready
  }
  return { state: next, channeled };
}

/**
 * CR 431 — Burn Out. On deck exhaustion: do as much as possible, recycle the
 * trash into the Main Deck (randomized), then CHOOSE AN OPPONENT TO GAIN 1
 * POINT, then complete the action. Repeats while the deck is still empty.
 * Points after the first cannot be replaced or prevented (431.3.b).
 *
 * Deck-out is therefore NOT a loss condition — it is a point-donation loop.
 * The legacy model had no Burn Out at all.
 */
export function burnOut(state: GameState, player: PlayerId, opponentToAward: PlayerId): GameState {
  const trashIds = Object.values(state.objects)
    .filter((o) => o.zone.kind === "trash" && o.owner === player && !o.categories.includes("rune"))
    .map((o) => o.objectId);

  let next = recycle(state, trashIds, "mainDeck");
  next = withPlayer(next, opponentToAward, (p) => ({ ...p, points: p.points + 1 })); // 431.2.c
  return next;
}

/** CR 432 — Double: increase a numeric attribute by its current value. CR 477.3.c — increase-by-negative is an increase by ZERO (a -2 unit gains 0, not -2). */
export function double(current: number): number {
  return current + Math.max(0, current); // 477.3.c
}

/** CR 433 — Swap: reverse two numeric values via a paired increase/decrease of the difference. Equal values -> no effect (433.1.c). */
export function swap(a: number, b: number): [number, number] {
  if (a === b) return [a, b]; // 433.1.c
  return [b, a];
}

/**
 * CR 434 + 716-719 — Attach. The Top-Most Card gains the attached card's
 * Effect Text and Might Bonus; the attached card's printed Rules Text goes
 * INACTIVE (434.1.e). Re-attaching detaches from the old host. Attaching is
 * NOT a Move (434.4.a) and states are unchanged (434.5).
 */
export function attach(state: GameState, objectId: ObjectId, hostObjectId: ObjectId): GameState {
  const object = state.objects[objectId];
  const host = state.objects[hostObjectId];
  if (!object || !host) return state;

  let next = object.attachedTo ? detach(state, objectId) : state; // re-attach detaches first

  next = withObject(next, objectId, (o) => ({ ...o, attachedTo: hostObjectId, zone: host.zone }));
  next = withObject(next, hostObjectId, (h) => ({ ...h, attachments: [...h.attachments, objectId] }));
  next = addStatus(next, objectId, "attached");
  return addStatus(next, hostObjectId, "equipped");
}

/** CR 435 — Detach. A detached Gear at a Battlefield is Recalled at the next Cleanup (435.4.a). CR 719.5 — a host leaving the board detaches all its attachments in place. */
export function detach(state: GameState, objectId: ObjectId): GameState {
  const object = state.objects[objectId];
  if (!object || object.attachedTo === null) return state;
  const hostId = object.attachedTo;

  let next = withObject(state, objectId, (o) => ({ ...o, attachedTo: null }));
  next = withObject(next, hostId, (h) => ({ ...h, attachments: h.attachments.filter((id) => id !== objectId) }));
  next = removeStatus(next, objectId, "attached");
  const host = next.objects[hostId];
  if (host && host.attachments.length === 0) next = removeStatus(next, hostId, "equipped");
  return next;
}

/** CR 436 — Predict: look at the top N, recycle any number, put the rest back on top in any order (436.1.a). Short deck -> predict what you can and NO Burn Out (436.4.a). */
export function predict(
  state: GameState,
  player: PlayerId,
  count: number,
  decide: (looked: ObjectId[]) => { recycled: ObjectId[]; keptOnTopInOrder: ObjectId[] }
): GameState {
  const deck = state.deckOrder[player] ?? [];
  const looked = deck.slice(0, Math.min(count, deck.length));
  const rest = deck.slice(looked.length);
  const { recycled, keptOnTopInOrder } = decide(looked);

  const next: GameState = { ...state, deckOrder: { ...state.deckOrder, [player]: [...keptOnTopInOrder, ...rest] } };
  return recycled.length > 0 ? recycle(next, recycled, "mainDeck") : next; // 436.4.a — never triggers Burn Out
}

/**
 * CR 437 — Prevent: a tracked, DECREMENTING value on the unit, not a flag.
 * Dealt damage floors at 0 and the value decrements as it absorbs (437.3).
 * "All" is NEVER lethal (437.5.b).
 *
 * Appended to the unit's ordered assignment-time replacement list (465.2.c.5).
 * Order matters against a multiplier and belongs to the unit's controller, so
 * use `orderDamageReplacements` to express that choice rather than relying on
 * the order effects happened to arrive in.
 */
export function prevent(state: GameState, objectId: ObjectId, value: number | "all"): GameState {
  return withObject(state, objectId, (o) => ({
    ...o,
    damageReplacements: [...o.damageReplacements, { kind: "prevent", value }],
  }));
}

/** CR 465.2.c.4.a — "Double all damage that would be dealt to it": a multiplying assignment-time replacement. */
export function multiplyDamage(state: GameState, objectId: ObjectId, factor: number): GameState {
  return withObject(state, objectId, (o) => ({
    ...o,
    damageReplacements: [...o.damageReplacements, { kind: "multiply", factor }],
  }));
}

/**
 * CR 465.2.c.5 — "Both of these replacement effects apply to the assignment of
 * damage, in the order of the controller of the [unit]'s choice." The choice
 * is the unit's CONTROLLER's, not the assigning player's, and it changes the
 * outcome, so it is surfaced as an explicit reordering rather than fixed.
 */
export function orderDamageReplacements(
  state: GameState,
  objectId: ObjectId,
  chosenOrder: DamageReplacement[]
): GameState {
  return withObject(state, objectId, (o) => ({ ...o, damageReplacements: chosenOrder }));
}

/** CR 438 — Replace: create a token in place of a card/token, INHERITING all effects and statuses (438.1). The replaced card goes to Banishment but counts as Replaced, not Banished (438.5.a). */
export function replace(state: GameState, objectId: ObjectId, tokenObjectId: ObjectId): GameState {
  const object = state.objects[objectId];
  if (!object) return state;

  const token: GameState["objects"][string] = {
    ...object,
    objectId: tokenObjectId,
    isToken: true, // 185.1 — token-nature is immutable
    statuses: new Set(object.statuses), // 438.1 — inherits statuses
  };

  const objects = { ...state.objects, [tokenObjectId]: token };
  objects[objectId] = { ...object, zone: { kind: "banishment", player: object.owner }, statuses: new Set(["replaced"]) };
  return { ...state, objects };
}

/** CR 439 — Create: produce a Game Object that didn't exist. Owner = creator; created battlefields are UNCONTROLLED (439.4.b). */
export function create(
  state: GameState,
  objectId: ObjectId,
  spec: {
    cardId: CardId | null;
    /** CR 132.4 — mirrored from the catalog by the caller; "" for an anonymous token. */
    name?: string;
    owner: PlayerId;
    zone: Zone;
    categories: GameState["objects"][string]["categories"];
    printedMight?: number | null;
  }
): GameState {
  const isBattlefield = spec.categories.includes("battlefield");
  const object: GameState["objects"][string] = {
    objectId,
    cardId: spec.cardId,
    name: spec.name ?? "",
    owner: spec.owner,
    controller: isBattlefield ? null : spec.owner, // 439.4.b
    isToken: true,
    categories: spec.categories,
    supertypes: [],
    tags: [],
    zone: spec.zone,
    privacy: "public",
    statuses: new Set(),
    printedMight: spec.printedMight ?? null,
    printedKeywords: [],
    domains: [],
    damage: 0,
    buffCount: 0,
    counters: {},
    attachedTo: null,
    attachments: [],
    damageReplacements: [],
    grantedKeywords: [],
  };
  return { ...state, objects: { ...state.objects, [objectId]: object } };
}

/** CR 440 — Burn: top of Main Deck -> trash. Burn as many as possible, Burn Out if short, then finish (440.4). */
export function burn(state: GameState, player: PlayerId, count: number): { state: GameState; burned: ObjectId[]; burnOut: boolean } {
  const deck = state.deckOrder[player] ?? [];
  const available = Math.min(count, deck.length);
  const burned = deck.slice(0, available);
  const rest = deck.slice(available);

  let next: GameState = { ...state, deckOrder: { ...state.deckOrder, [player]: rest } };
  for (const objectId of burned) {
    next = changeZone(next, objectId, { kind: "trash", player });
  }
  return { state: next, burned, burnOut: available < count }; // 440.4
}

/** CR 441 — Empower: a binary state. Cannot empower the already-Empowered; becoming Empowered is a referenceable event (441.2.a). */
export function empower(state: GameState, objectId: ObjectId): { state: GameState; applied: boolean } {
  const object = state.objects[objectId];
  if (!object || object.statuses.has("empowered")) return { state, applied: false };
  return { state: addStatus(state, objectId, "empowered"), applied: true };
}

/** CR 442 — Disempower: remove Empowered. Only affects currently-Empowered objects. */
export function disempower(state: GameState, objectId: ObjectId): { state: GameState; applied: boolean } {
  const object = state.objects[objectId];
  if (!object || !object.statuses.has("empowered")) return { state, applied: false };
  return { state: removeStatus(state, objectId, "empowered"), applied: true };
}

/** CR 443 — Skip: replace an event or turn procedure WITH NOTHING. Nothing that triggers on it triggers (443.2.a). Is itself a Replacement Effect (443.4). */
export function skip(state: GameState): GameState {
  return state; // the event simply does not occur
}

/**
 * CR 444 — Pay: remove resources from the Rune Pool. Declining to pay for a
 * card/ability UNDOES playing it (444.2.a). CR 444.2.c — Reaction-keyword Add
 * abilities may be activated any time you are instructed to Pay, finalizing
 * and resolving immediately, ignoring normal restrictions: payment is an
 * INTERACTIVE WINDOW, not the legacy static affordability check.
 */
export function pay(state: GameState, player: PlayerId, cost: Cost): { state: GameState; paid: boolean } {
  const pool = state.players[player]?.runePool;
  if (!pool) return { state, paid: false };
  if (!canPay(pool, cost)) return { state, paid: false };

  const remainingPower = [...pool.power];
  for (const symbol of cost.power) {
    const index = remainingPower.findIndex((p) =>
      symbol.kind === "domain" ? p.domain === symbol.domain || p.universal : true
    );
    if (index !== -1) remainingPower.splice(index, 1);
  }
  return {
    state: withPlayer(state, player, (p) => ({
      ...p,
      runePool: { energy: p.runePool.energy - cost.energy, power: remainingPower },
    })),
    paid: true,
  };
}

/**
 * CR 163.1-163.2 — can this Rune Pool satisfy `cost`? Concrete-domain pips
 * are matched first (a Universal rune can stand in for any domain, 163.2.b);
 * [C]/[A] symbols stay symbolic and are satisfied by any remaining power.
 */
export function canPay(pool: { energy: number; power: { domain: Domain; universal: boolean }[] }, cost: Cost): boolean {
  if (pool.energy < cost.energy) return false;

  const remaining = [...pool.power];
  const concrete = cost.power.filter((s): s is { kind: "domain"; domain: Domain } => s.kind === "domain");
  const flexible = cost.power.filter((s) => s.kind !== "domain");

  for (const symbol of concrete) {
    let index = remaining.findIndex((p) => p.domain === symbol.domain && !p.universal);
    if (index === -1) index = remaining.findIndex((p) => p.universal); // 163.2.b
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return remaining.length >= flexible.length;
}
