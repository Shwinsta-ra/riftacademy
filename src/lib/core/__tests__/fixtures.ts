import { makeFormatContext } from "../format";
import type {
  Ability,
  CardCategory,
  Domain,
  GameObject,
  GameState,
  GrantedKeyword,
  Keyword,
  LayerEffect,
  ObjectId,
  PlayerId,
  PlayerState,
  TurnState,
  Zone,
} from "../schema";

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeObject(overrides: Partial<GameObject> = {}): GameObject {
  return {
    objectId: nextId("obj"),
    cardId: "test-card",
    name: "Test Card, Fixture", // CR 132.4 — full "Name, Subtitle" form
    owner: "A",
    controller: "A",
    isToken: false,
    categories: ["unit"] as CardCategory[],
    supertypes: [],
    tags: [],
    zone: { kind: "base", player: "A" },
    privacy: "public",
    statuses: new Set(),
    printedMight: null,
    printedKeywords: [],
    domains: [],
    damage: 0,
    buffCount: 0,
    counters: {},
    attachedTo: null,
    attachments: [],
    damageReplacements: [],
    grantedKeywords: [],
    ...overrides,
  };
}

/**
 * A board object with an explicit Might. `printedMight` is required (not
 * defaulted) so a test never silently reads 0 for a unit whose Might is the
 * thing under test; it accepts null for non-unit categories (gear, runes,
 * spells, battlefields), which have no Might.
 */
export function makeUnit(overrides: Partial<GameObject> & { printedMight: number | null }): GameObject {
  return makeObject({ categories: ["unit"], ...overrides });
}

export function makeBattlefieldObject(overrides: Partial<GameObject> = {}): GameObject {
  return makeObject({
    objectId: nextId("bf"),
    categories: ["battlefield"],
    controller: null,
    zone: { kind: "battlefield", battlefieldId: "self" },
    printedMight: null,
    ...overrides,
  });
}

export function makeRune(overrides: Partial<GameObject> = {}): GameObject {
  return makeObject({ objectId: nextId("rune"), categories: ["rune"], printedMight: null, ...overrides });
}

export function emptyPlayerState(playerId: PlayerId, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId,
    points: 0,
    xp: 0,
    runePool: { energy: 0, power: [] },
    handCount: 0,
    legendObjectId: `${playerId}-legend`,
    chosenChampionName: "Test Champion, Fixture",
    scoredBattlefieldsThisTurn: new Set(),
    ...overrides,
  };
}

export function makeTurnState(overrides: Partial<TurnState> = {}): TurnState {
  return {
    turnPlayer: "A",
    turnOrder: ["A", "B"],
    additionalTurns: [],
    phase: "main",
    step: undefined,
    showdownState: "neutral",
    openState: "open",
    priority: null,
    focus: null,
    ...overrides,
  };
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    objects: {},
    players: { A: emptyPlayerState("A"), B: emptyPlayerState("B") },
    battlefieldIds: [],
    deckOrder: { A: [], B: [] },
    runeDeckOrder: { A: [], B: [] },
    turn: makeTurnState(),
    chainEngine: { tasks: [], chain: { pending: [], finalized: [] }, showdown: null },
    stagedShowdowns: [],
    stagedCombats: [],
    contestedBattlefields: [],
    activeLayerEffects: [],
    abilities: {},
    format: makeFormatContext(),
    cardsPlayedThisTurn: {},
    nextTimestamp: 1,
    ...overrides,
  };
}

/** Convenience: build a state from a list of objects without hand-keying the record. */
export function stateWithObjects(objects: GameObject[], overrides: Partial<GameState> = {}): GameState {
  const record: Record<ObjectId, GameObject> = {};
  for (const object of objects) record[object.objectId] = object;
  return makeState({ ...overrides, objects: { ...record, ...(overrides.objects ?? {}) } });
}

export const grant = (keyword: Keyword, value?: number, sourceObjectId = "src"): GrantedKeyword => ({
  keyword,
  value,
  duration: "permanent",
  sourceObjectId,
});

/** A Layer-3 arithmetic effect targeting exactly `targetId`. */
export function arithmeticEffect(
  targetId: ObjectId,
  delta: number,
  options: { minimum?: number; maximum?: number; fromPassive?: boolean; timestamp?: number; duration?: LayerEffect["duration"] } = {}
): LayerEffect {
  return {
    layer: 3,
    sourceObjectId: "src",
    targetSelector: { kind: "target", index: 0 },
    targets: [targetId],
    op: { attr: "might", delta, minimum: options.minimum, maximum: options.maximum },
    fromPassive: options.fromPassive ?? false,
    duration: options.duration ?? "thisTurn",
    timestamp: options.timestamp ?? 1,
  };
}

/** A Layer-1 trait effect setting Might (CR 477.1.a.1 — resolved before all arithmetic). */
export function setMightEffect(targetId: ObjectId, value: number, timestamp = 1): LayerEffect {
  return {
    layer: 1,
    sourceObjectId: "src",
    targetSelector: { kind: "target", index: 0 },
    targets: [targetId],
    op: { set: "might", value },
    fromPassive: false,
    duration: "thisTurn",
    timestamp,
  };
}

/** A Layer-2 ability effect granting a keyword. */
export function grantKeywordEffect(targetId: ObjectId, keyword: Keyword, timestamp = 1): LayerEffect {
  return {
    layer: 2,
    sourceObjectId: "src",
    targetSelector: { kind: "target", index: 0 },
    targets: [targetId],
    op: { grantKeyword: keyword },
    fromPassive: false,
    duration: "thisTurn",
    timestamp,
  };
}

export function makeAbility(overrides: Partial<Ability> & Pick<Ability, "kind">): Ability {
  const base = {
    abilityId: nextId("ability"),
    sourceObjectId: "src",
    activeZones: ["base", "battlefield"] as Zone["kind"][],
  };
  return { ...base, ...overrides } as Ability;
}

export const DOMAINS: Domain[] = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];
