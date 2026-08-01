import { describe, expect, it } from "vitest";
import {
  evaluatePredicate,
  hasKeyword,
  matchesEvent,
  resolveKeywords,
  resolvePlayerRef,
  resolveSelector,
  sumKeywordValue,
} from "../predicates";
import { grant, grantKeywordEffect, makeTurnState, makeUnit, stateWithObjects } from "./fixtures";
import { OBJECT_STATUSES } from "../schema";
import type { EventPredicate, GameEvent, Predicate, Selector } from "../schema";

const ctx = (sourceObjectId: string, targets?: string[]) => ({ sourceObjectId, targets });

describe("keyword resolution is printed UNION granted (CR 801, 477.2)", () => {
  it("sees a PRINTED keyword — the legacy granted-only read made these invisible", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, printedKeywords: [{ keyword: "Tank" }] });
    expect(hasKeyword(stateWithObjects([unit]), "u1", "Tank")).toBe(true);
  });

  it("sees a GRANTED keyword", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, grantedKeywords: [grant("Tank")] });
    expect(hasKeyword(stateWithObjects([unit]), "u1", "Tank")).toBe(true);
  });

  it("sees a keyword granted by a Layer-2 effect (477.2)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const state = stateWithObjects([unit], { activeLayerEffects: [grantKeywordEffect("u1", "Deflect")] });
    expect(hasKeyword(state, "u1", "Deflect")).toBe(true);
  });

  it("a Layer-2 REMOVAL wins over a printed keyword", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, printedKeywords: [{ keyword: "Tank" }] });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [
        {
          layer: 2,
          sourceObjectId: "src",
          targetSelector: { kind: "target", index: 0 },
          targets: ["u1"],
          op: { removeKeyword: "Tank" },
          fromPassive: false,
          duration: "thisTurn",
          timestamp: 1,
        },
      ],
    });
    expect(hasKeyword(state, "u1", "Tank")).toBe(false);
  });

  it("unions printed and granted without dropping either", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 3,
      printedKeywords: [{ keyword: "Tank" }],
      grantedKeywords: [grant("Assault", 2)],
    });
    const keywords = resolveKeywords(stateWithObjects([unit]), "u1").map((k) => k.keyword);
    expect(keywords).toContain("Tank");
    expect(keywords).toContain("Assault");
  });
});

describe("sumKeywordValue (CR 807.2 / 814.2 / 823.2)", () => {
  it("sums multiple instances", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 3,
      grantedKeywords: [grant("Shield", 2), grant("Shield", 1)],
    });
    expect(sumKeywordValue(stateWithObjects([unit]), "u1", "Shield")).toBe(3);
  });

  it("a valued keyword with no explicit X contributes the CR default of 1", () => {
    // CR 807 "Assault X (X default 1)".
    const unit = makeUnit({ objectId: "u1", printedMight: 3, printedKeywords: [{ keyword: "Assault" }] });
    expect(sumKeywordValue(stateWithObjects([unit]), "u1", "Assault")).toBe(1);
  });

  it("sums a printed X alongside a granted one", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 3,
      printedKeywords: [{ keyword: "Assault", value: 2 }],
      grantedKeywords: [grant("Assault", 3)],
    });
    expect(sumKeywordValue(stateWithObjects([unit]), "u1", "Assault")).toBe(5);
  });
});

describe("PlayerRef resolution", () => {
  const unit = makeUnit({ objectId: "u1", printedMight: 2, controller: "B" });
  const state = stateWithObjects([unit], { turn: makeTurnState({ turnPlayer: "A", turnOrder: ["A", "B"] }) });

  it("resolves sourceController from the evaluating object", () => {
    expect(resolvePlayerRef(state, { kind: "sourceController" }, ctx("u1"))).toBe("B");
  });

  it("resolves turnPlayer", () => {
    expect(resolvePlayerRef(state, { kind: "turnPlayer" }, ctx("u1"))).toBe("A");
  });

  it("resolves opponentOf", () => {
    expect(resolvePlayerRef(state, { kind: "opponentOf", of: { kind: "turnPlayer" } }, ctx("u1"))).toBe("B");
  });

  it("resolves an explicit player", () => {
    expect(resolvePlayerRef(state, { kind: "explicit", player: "A" }, ctx("u1"))).toBe("A");
  });
});

describe("Selectors (CR 355.6-.10, 477)", () => {
  const bf = { kind: "battlefield" as const, battlefieldId: "bf1" };
  const mine = makeUnit({ objectId: "a1", printedMight: 2, controller: "A", zone: bf });
  const theirs = makeUnit({ objectId: "b1", printedMight: 4, controller: "B", zone: bf });
  const inHand = makeUnit({ objectId: "h1", printedMight: 1, controller: "A", zone: { kind: "hand", player: "A" } });
  const state = stateWithObjects([mine, theirs, inHand], { battlefieldIds: ["bf1"] });

  it("self", () => {
    expect(resolveSelector(state, { kind: "self" }, ctx("a1"))).toEqual(["a1"]);
  });

  it("target by index", () => {
    expect(resolveSelector(state, { kind: "target", index: 1 }, ctx("a1", ["a1", "b1"]))).toEqual(["b1"]);
  });

  it("unitsAtLocation", () => {
    const result = resolveSelector(state, { kind: "unitsAtLocation", location: bf }, ctx("a1"));
    expect(result.sort()).toEqual(["a1", "b1"]);
  });

  it("unitsControlledBy", () => {
    const result = resolveSelector(
      state,
      { kind: "unitsControlledBy", player: { kind: "sourceController" } },
      ctx("a1")
    );
    expect(result).toEqual(["a1"]);
  });

  it("objectsInZone", () => {
    const result = resolveSelector(
      state,
      { kind: "objectsInZone", zone: "hand", player: { kind: "explicit", player: "A" } },
      ctx("a1")
    );
    expect(result).toEqual(["h1"]);
  });

  it("filter composes a Selector with a Predicate", () => {
    const selector: Selector = {
      kind: "filter",
      from: { kind: "unitsAtLocation", location: bf },
      where: { op: "mightAtLeast", value: 3 },
    };
    expect(resolveSelector(state, selector, ctx("a1"))).toEqual(["b1"]);
  });
});

describe("Predicates", () => {
  const unit = makeUnit({
    objectId: "u1",
    printedMight: 5,
    controller: "A",
    tags: ["Ionia"],
    domains: ["Mind"],
    supertypes: ["champion"],
    statuses: new Set(["stunned"]),
  });
  const state = stateWithObjects([unit], { turn: makeTurnState({ turnPlayer: "A" }) });

  it("hasStatus / isCategory / hasSupertype / hasTag / hasDomain", () => {
    expect(evaluatePredicate(state, { op: "hasStatus", status: "stunned" }, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, { op: "isCategory", category: "unit" }, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, { op: "hasSupertype", supertype: "champion" }, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, { op: "hasTag", tag: "Ionia" }, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, { op: "hasDomain", domain: "Mind" }, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, { op: "hasDomain", domain: "Fury" }, "u1", ctx("u1"))).toBe(false);
  });

  it("might comparisons and isMighty (CR 708)", () => {
    expect(evaluatePredicate(state, { op: "mightAtLeast", value: 5 }, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, { op: "mightAtMost", value: 4 }, "u1", ctx("u1"))).toBe(false);
    expect(evaluatePredicate(state, { op: "isMighty" }, "u1", ctx("u1"))).toBe(true);
  });

  it("controlledBy resolves through a PlayerRef", () => {
    expect(
      evaluatePredicate(state, { op: "controlledBy", player: { kind: "turnPlayer" } }, "u1", ctx("u1"))
    ).toBe(true);
  });

  it("xpAtLeast gates on player XP (CR 824 Level)", () => {
    const withXp = {
      ...state,
      players: { ...state.players, A: { ...state.players.A, xp: 3 } },
    };
    const predicate: Predicate = { op: "xpAtLeast", player: { kind: "sourceController" }, value: 3 };
    expect(evaluatePredicate(withXp, predicate, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, predicate, "u1", ctx("u1"))).toBe(false);
  });

  it("playedCardThisTurn drives Legion (CR 812)", () => {
    const predicate: Predicate = { op: "playedCardThisTurn", player: { kind: "sourceController" } };
    expect(evaluatePredicate(state, predicate, "u1", ctx("u1"))).toBe(false);

    const played = { ...state, cardsPlayedThisTurn: { A: 1 } };
    expect(evaluatePredicate(played, predicate, "u1", ctx("u1"))).toBe(true);
  });

  it("countAtLeast counts a Selector's results", () => {
    const predicate: Predicate = {
      op: "countAtLeast",
      from: { kind: "unitsControlledBy", player: { kind: "sourceController" } },
      value: 1,
    };
    expect(evaluatePredicate(state, predicate, "u1", ctx("u1"))).toBe(true);
  });

  it("composes with and / or / not", () => {
    const isMightyUnit: Predicate = {
      op: "and",
      terms: [{ op: "isCategory", category: "unit" }, { op: "isMighty" }],
    };
    expect(evaluatePredicate(state, isMightyUnit, "u1", ctx("u1"))).toBe(true);
    expect(evaluatePredicate(state, { op: "not", term: isMightyUnit }, "u1", ctx("u1"))).toBe(false);
    expect(
      evaluatePredicate(state, { op: "or", terms: [{ op: "hasDomain", domain: "Fury" }, { op: "isMighty" }] }, "u1", ctx("u1"))
    ).toBe(true);
  });
});

describe("EventPredicates (CR 367-375)", () => {
  const unit = makeUnit({ objectId: "u1", printedMight: 3, controller: "A" });
  const state = stateWithObjects([unit], { turn: makeTurnState({ turnPlayer: "A", turnOrder: ["A", "B"] }) });

  it("matches a kill, optionally filtered by the object", () => {
    const event: GameEvent = { type: "killed", objectId: "u1" };
    expect(matchesEvent(state, { on: "kill" }, event, ctx("u1"))).toBe(true);
    expect(
      matchesEvent(state, { on: "kill", object: { op: "isCategory", category: "unit" } }, event, ctx("u1"))
    ).toBe(true);
    expect(
      matchesEvent(state, { on: "kill", object: { op: "isCategory", category: "spell" } }, event, ctx("u1"))
    ).toBe(false);
  });

  it("matches a deal filtered by its target", () => {
    const event: GameEvent = { type: "dealt", sourceObjectId: null, targetObjectId: "u1", amount: 2 };
    expect(matchesEvent(state, { on: "deal", to: { op: "mightAtLeast", value: 3 } }, event, ctx("u1"))).toBe(true);
    expect(matchesEvent(state, { on: "deal", to: { op: "mightAtLeast", value: 9 } }, event, ctx("u1"))).toBe(false);
  });

  it("matches a draw by player", () => {
    const event: GameEvent = { type: "drew", player: "A", objectIds: ["c1"] };
    expect(matchesEvent(state, { on: "draw", player: { kind: "turnPlayer" } }, event, ctx("u1"))).toBe(true);
    expect(
      matchesEvent(state, { on: "draw", player: { kind: "opponentOf", of: { kind: "turnPlayer" } } }, event, ctx("u1"))
    ).toBe(false);
  });

  it("becomeStatus matches the TRANSITION only (CR 441.2.a / 709)", () => {
    const stunned: GameEvent = { type: "stunned", objectId: "u1" };
    expect(matchesEvent(state, { on: "becomeStatus", status: "stunned" }, stunned, ctx("u1"))).toBe(true);

    // An already-buffed no-op is NOT a "becomes buffed" transition (426.1.c).
    const noOpBuff: GameEvent = { type: "buffed", objectId: "u1", applied: false };
    expect(matchesEvent(state, { on: "becomeStatus", status: "buffed" }, noOpBuff, ctx("u1"))).toBe(false);

    const realBuff: GameEvent = { type: "buffed", objectId: "u1", applied: true };
    expect(matchesEvent(state, { on: "becomeStatus", status: "buffed" }, realBuff, ctx("u1"))).toBe(true);
  });

  it("matches a score by method (CR 469)", () => {
    const event: GameEvent = { type: "pointScored", player: "A", method: "conquer", drewCardInstead: false };
    expect(matchesEvent(state, { on: "score", method: "conquer" }, event, ctx("u1"))).toBe(true);
    expect(matchesEvent(state, { on: "score", method: "hold" }, event, ctx("u1"))).toBe(false);
  });

  it("matches a turn procedure, which is what Skip replaces (CR 443)", () => {
    const event: GameEvent = { type: "phaseChanged", player: "A", phase: "draw" };
    expect(matchesEvent(state, { on: "turnProcedure", phase: "draw" }, event, ctx("u1"))).toBe(true);
    expect(matchesEvent(state, { on: "turnProcedure", phase: "main" }, event, ctx("u1"))).toBe(false);
  });
});

describe("Contested is unreachable by any Game Effect (CR 190.3.d)", () => {
  // CR 190.3.d — "Game Effects cannot reference Contested." Every ObjectStatus
  // is effect-reachable via {op:"hasStatus"}, so Contested must never appear
  // there; it is kernel-internal bookkeeping on GameState. Same for the
  // Showdown/Combat staging marks (CR 323.6-.7).
  it("Contested is not an ObjectStatus", () => {
    expect(OBJECT_STATUSES).not.toContain("contested");
  });

  it("no ObjectStatus leaks Contested or staging under any spelling", () => {
    for (const status of OBJECT_STATUSES) {
      expect(status.toLowerCase()).not.toContain("contest");
      expect(status.toLowerCase()).not.toContain("staged");
    }
  });

  it("Contested and staging live on GameState, not on any object", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], { contestedBattlefields: ["bf1"], stagedCombats: ["bf1"] });

    expect(state.contestedBattlefields).toEqual(["bf1"]);
    expect(state.stagedCombats).toEqual(["bf1"]);
    expect(Object.keys(state.objects.u1)).not.toContain("contested");
  });
});

describe("the vocabulary is serializable — the whole point of it being data", () => {
  it("a Predicate survives a JSON round-trip and still evaluates identically", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, domains: ["Mind"] });
    const state = stateWithObjects([unit]);

    const predicate: Predicate = {
      op: "and",
      terms: [
        { op: "isMighty" },
        { op: "hasDomain", domain: "Mind" },
        { op: "not", term: { op: "hasStatus", status: "stunned" } },
      ],
    };

    const roundTripped = JSON.parse(JSON.stringify(predicate)) as Predicate;
    expect(roundTripped).toEqual(predicate);
    expect(evaluatePredicate(state, roundTripped, "u1", ctx("u1"))).toBe(
      evaluatePredicate(state, predicate, "u1", ctx("u1"))
    );
  });

  it("a Selector and an EventPredicate survive a JSON round-trip", () => {
    const selector: Selector = {
      kind: "filter",
      from: { kind: "unitsControlledBy", player: { kind: "opponentOf", of: { kind: "sourceController" } } },
      where: { op: "hasKeyword", keyword: "Tank" },
    };
    const eventPredicate: EventPredicate = { on: "deal", to: { op: "mightAtMost", value: 2 } };

    expect(JSON.parse(JSON.stringify(selector))).toEqual(selector);
    expect(JSON.parse(JSON.stringify(eventPredicate))).toEqual(eventPredicate);
  });
});
