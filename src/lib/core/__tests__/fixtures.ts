import type { Battlefield, GameState, KeywordGrant, MightMod, ObjectInstance, PlayerId, PlayerState, RuneState, UnitState } from "../schema";

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeUnit(overrides: Partial<UnitState> & { might: number }): UnitState {
  return {
    instanceId: nextId("unit"),
    cardId: "test-card",
    controller: "A",
    mightMods: [],
    keywordGrants: [],
    damage: 0,
    stunned: false,
    tapped: false,
    zone: "base",
    ...overrides,
  };
}

export function makeRune(overrides: Partial<RuneState> = {}): RuneState {
  return { instanceId: nextId("rune"), domain: "Colorless", tapped: false, ...overrides };
}

export function makeObject(overrides: Partial<ObjectInstance> = {}): ObjectInstance {
  return { instanceId: nextId("obj"), cardId: "test-card", privacy: "hidden", knownToOpponent: false, ...overrides };
}

export function emptyPlayerState(id: PlayerId, overrides: Partial<PlayerState> = {}): PlayerState {
  return { id, hand: [], deck: [], discard: [], banished: [], base: [], runes: [], points: 0, ...overrides };
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    players: { A: emptyPlayerState("A"), B: emptyPlayerState("B") },
    battlefields: [],
    chain: [],
    turn: 1,
    activePlayer: "A",
    pendingDirectPoints: { A: 0, B: 0 },
    ...overrides,
  };
}

export function makeBattlefield(overrides: Partial<Battlefield> = {}): Battlefield {
  return { battlefieldId: nextId("bf"), units: [], ...overrides };
}

export const grant = (keyword: KeywordGrant["keyword"], value?: number): KeywordGrant => ({
  keyword,
  value,
  duration: "permanent",
});

export const mod = (amount: number, floor?: number): MightMod => ({ amount, floor });
