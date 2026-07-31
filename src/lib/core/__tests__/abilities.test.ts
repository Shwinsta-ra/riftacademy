import { describe, expect, it } from "vitest";
import {
  applyReplacements,
  areSimultaneous,
  battlefieldAbilityController,
  canActivate,
  canBeCompelled,
  countsAsTriggered,
  isIgnored,
  isTextActive,
  isUsable,
  isValidTarget,
  legionSatisfied,
  levelSatisfied,
  resolveChoiceStep,
  resolveNthTimeTrigger,
} from "../abilities";
import { makeState, makeTurnState, makeUnit, stateWithObjects } from "./fixtures";
import type { ActivatedAbility, GameEvent, ReplacementEffect, TriggeredAbility } from "../schema";

function activated(overrides: Partial<ActivatedAbility> = {}): ActivatedAbility {
  return {
    abilityId: "act-1",
    kind: "activated",
    sourceObjectId: "u1",
    activeZones: ["base", "battlefield"],
    cost: { energy: 0, power: [] },
    effect: [],
    timing: { openStateOwnTurnOnly: true, action: false, reaction: false },
    ...overrides,
  };
}

function triggered(overrides: Partial<TriggeredAbility> = {}): TriggeredAbility {
  return {
    abilityId: "trg-1",
    kind: "triggered",
    sourceObjectId: "u1",
    activeZones: ["base", "battlefield"],
    condition: () => true,
    effect: [],
    optionalAtChoiceStep: false,
    ...overrides,
  };
}

describe("activated abilities: own turn + Open State only (CR 381)", () => {
  const unit = makeUnit({ objectId: "u1", printedMight: 2, controller: "A" });

  it("permits activation on your own turn in an Open State", () => {
    const state = stateWithObjects([unit], { turn: makeTurnState({ turnPlayer: "A", priority: "A", openState: "open" }) });
    expect(canActivate(state, activated(), "A")).toBe(true);
  });

  it("bars activation on an opponent's turn without Action/Reaction", () => {
    const state = stateWithObjects([unit], { turn: makeTurnState({ turnPlayer: "B", priority: "A", openState: "open" }) });
    expect(canActivate(state, activated(), "A")).toBe(false);
  });

  it("bars activation without Priority (CR 312 — activating is Discretionary)", () => {
    const state = stateWithObjects([unit], { turn: makeTurnState({ turnPlayer: "A", priority: "B", openState: "open" }) });
    expect(canActivate(state, activated(), "A")).toBe(false);
  });

  it("an ability with NO legal options is illegal to activate (402.3)", () => {
    const state = stateWithObjects([unit], { turn: makeTurnState({ turnPlayer: "A", priority: "A" }) });
    expect(canActivate(state, activated(), "A", false)).toBe(false);
  });

  it("is inactive when its source is in a zone the ability doesn't cover (365.1/366.1)", () => {
    const inHand = makeUnit({ objectId: "u1", printedMight: 2, controller: "A", zone: { kind: "hand", player: "A" } });
    const state = stateWithObjects([inHand], { turn: makeTurnState({ turnPlayer: "A", priority: "A" }) });
    expect(canActivate(state, activated(), "A")).toBe(false);
  });
});

describe("the choices step for a triggered ability (CR 402)", () => {
  it("a 'you may' trigger is DECLINED at step 2 and leaves the chain (402.1.a)", () => {
    const result = resolveChoiceStep(triggered({ optionalAtChoiceStep: true }), true, false);
    expect(result.staysOnChain).toBe(false);
    expect(result.reason).toBe("declined");
  });

  it("a trigger with no legal options is REMOVED — and this is NOT a counter (402.4.a)", () => {
    const result = resolveChoiceStep(triggered(), false, true);
    expect(result.staysOnChain).toBe(false);
    expect(result.countered).toBe(false); // explicitly not a counter
    expect(result.reason).toBe("noLegalOptions");
  });

  it("a mandatory trigger with legal options stays on the chain (402.4.b)", () => {
    expect(resolveChoiceStep(triggered(), true, false).staysOnChain).toBe(true);
  });
});

describe("'the Nth time' with simultaneous instances (CR 383.1.b)", () => {
  it("the controller picks ONE instance and the ability triggers once", () => {
    expect(resolveNthTimeTrigger(["a", "b", "c"], 1)).toBe("b");
    expect(resolveNthTimeTrigger([])).toBeNull();
  });
});

describe("replacement effects (CR 367-375)", () => {
  const killEvent: GameEvent = { type: "killed", objectId: "u1" };

  function replacement(overrides: Partial<ReplacementEffect> = {}): ReplacementEffect {
    return {
      abilityId: "rep-1",
      kind: "replacement",
      sourceObjectId: "u1",
      activeZones: ["battlefield"],
      appliesTo: (event) => event.type === "killed",
      replacement: [],
      optional: false,
      ...overrides,
    };
  }

  it("replacing an event means the generating action NEVER OCCURRED (370.1.a.1)", () => {
    // A replaced death means the kill didn't happen — so nothing that keys on
    // the kill can trigger.
    const outcome = applyReplacements(makeState(), killEvent, [replacement()], {}, { replaceWith: () => [] });
    expect(outcome.events).toEqual([]);
    expect(outcome.applied).toEqual(["rep-1"]);
  });

  it("substitutes the replacing event(s)", () => {
    const banished: GameEvent = { type: "banished", objectId: "u1" };
    const outcome = applyReplacements(makeState(), killEvent, [replacement()], {}, { replaceWith: () => [banished] });
    expect(outcome.events).toEqual([banished]);
  });

  it("leaves non-matching events untouched", () => {
    const drew: GameEvent = { type: "drew", player: "A", objectIds: ["c1"] };
    const outcome = applyReplacements(makeState(), drew, [replacement()], {}, { replaceWith: () => [] });
    expect(outcome.events).toEqual([drew]);
    expect(outcome.applied).toEqual([]);
  });

  it("respects a per-turn usage limit (371)", () => {
    const limited = replacement({ usageLimit: { perTurn: 1 } });
    expect(isUsable(limited, {})).toBe(true);
    expect(isUsable(limited, { "rep-1": 1 })).toBe(false);

    const outcome = applyReplacements(makeState(), killEvent, [limited], { "rep-1": 1 }, { replaceWith: () => [] });
    expect(outcome.events).toEqual([killEvent]); // cap reached — not applied
  });

  it("an optional replacement the controller declines does NOT consume its cap (371.2.b)", () => {
    const optional = replacement({ optional: true, usageLimit: { perTurn: 1 } });
    const outcome = applyReplacements(
      makeState(),
      killEvent,
      [optional],
      {},
      { replaceWith: () => [], accept: () => false }
    );
    expect(outcome.events).toEqual([killEvent]);
    expect(outcome.applied).toEqual([]);
  });

  it("applies a given replacement only ONCE in a sequence (373.2)", () => {
    const outcome = applyReplacements(
      makeState(),
      killEvent,
      [replacement(), replacement()], // same abilityId
      {},
      { replaceWith: (_e, event) => [event] }
    );
    expect(outcome.applied).toEqual(["rep-1"]);
  });

  it("honours the acted-upon object's controller's chosen order (372)", () => {
    const first = replacement({ abilityId: "rep-first" });
    const second = replacement({ abilityId: "rep-second" });
    const order: string[] = [];

    applyReplacements(
      makeState(),
      killEvent,
      [first, second],
      {},
      {
        chooseOrder: (effects) => [...effects].reverse(),
        replaceWith: (effect, event) => {
          order.push(effect.abilityId);
          return [event];
        },
      }
    );
    expect(order).toEqual(["rep-second", "rep-first"]);
  });
});

describe("simultaneity (CR 370.1.a.2)", () => {
  it("events are simultaneous only when produced by the SAME game action", () => {
    // "Kill up to two units" -> one action -> simultaneous.
    expect(areSimultaneous("action-1", "action-1")).toBe(true);
    // "Kill A. If you do, kill B." -> two actions -> sequential.
    expect(areSimultaneous("action-1", "action-2")).toBe(false);
  });
});

describe("Ignore is scoped by (action, player) — CR 765-767", () => {
  const scopes = [{ action: "payCosts", players: ["A"], abilityId: "deflect-1" }];

  it("applies only to the directed player and the named action", () => {
    expect(isIgnored(scopes, "deflect-1", "payCosts", "A")).toBe(true);
    expect(isIgnored(scopes, "deflect-1", "payCosts", "B")).toBe(false); // another player still pays Deflect
    expect(isIgnored(scopes, "deflect-1", "assignDamage", "A")).toBe(false); // different action
  });
});

describe("Inactive text (CR 720-725)", () => {
  it("Rules Text is never Inactive by default (723)", () => {
    expect(isTextActive("rules", false)).toBe(true);
  });

  it("Effect Text is Inactive UNLESS the card is Attached (724)", () => {
    expect(isTextActive("effect", false)).toBe(false);
    expect(isTextActive("effect", true)).toBe(true);
  });
});

describe("targeting (CR 355.6-.10, 757-759)", () => {
  const unit = makeUnit({ objectId: "u1", printedMight: 2, zone: { kind: "battlefield", battlefieldId: "bf1" } });

  it("requires the target to be in a valid zone category (355.9.a)", () => {
    const state = stateWithObjects([unit]);
    expect(isValidTarget(state, "u1", ["battlefield", "base"])).toBe(true);
    expect(isValidTarget(state, "u1", ["hand"])).toBe(false);
  });

  it("an untargetable object is not a legal target (758)", () => {
    const state = stateWithObjects([unit]);
    expect(isValidTarget(state, "u1", ["battlefield"], () => true)).toBe(false);
  });
});

describe("the compulsion rule (CR 128.6)", () => {
  it("a player cannot be compelled to act on private/secret cards by card quality", () => {
    expect(canBeCompelled({ kind: "hand", player: "A" }, true)).toBe(false);
    expect(canBeCompelled({ kind: "mainDeck", player: "A" }, true)).toBe(false);
  });

  it("a non-quality-specific instruction on a hidden zone is still compellable", () => {
    expect(canBeCompelled({ kind: "hand", player: "A" }, false)).toBe(true);
  });

  it("public zones are always compellable", () => {
    expect(canBeCompelled({ kind: "battlefield", battlefieldId: "bf1" }, true)).toBe(true);
  });
});

describe("dependent keywords (CR 812 / 824)", () => {
  it("ONE card played satisfies ALL Legion instances you control (812.2)", () => {
    expect(legionSatisfied(0)).toBe(false);
    expect(legionSatisfied(1)).toBe(true);
  });

  it("Level N gates on an XP threshold (824)", () => {
    expect(levelSatisfied(2, 3)).toBe(false);
    expect(levelSatisfied(3, 3)).toBe(true);
  });
});

describe("battlefield ability accountability (CR 190.6)", () => {
  const turn = makeTurnState({ turnPlayer: "A" });

  it("the battlefield's controller controls its abilities", () => {
    expect(battlefieldAbilityController(turn, "B")).toBe("B");
  });

  it("an UNCONTROLLED battlefield's abilities fall to the Turn Player (Arena's Greatest)", () => {
    expect(battlefieldAbilityController(turn, null)).toBe("A");
  });

  it("an ability naming a choosing player is controlled by that player regardless (Abandoned Hall)", () => {
    expect(battlefieldAbilityController(turn, "B", "A")).toBe("A");
  });
});

describe("forgotten triggers still counted as triggered (TR 506.5)", () => {
  it("counts for 'first time each turn' accounting even when unacknowledged", () => {
    expect(countsAsTriggered(false)).toBe(true);
  });
});
