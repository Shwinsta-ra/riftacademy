import { describe, expect, it } from "vitest";
import {
  banish,
  buff,
  burn,
  burnOut,
  canPay,
  changeZone,
  channel,
  deal,
  discard,
  double,
  draw,
  empower,
  exhaust,
  heal,
  kill,
  predict,
  prevent,
  ready,
  recycle,
  spendBuff,
  stun,
  swap,
} from "../actions";
import { emptyPlayerState, makeState, makeUnit, stateWithObjects } from "./fixtures";
import type { Cost, PowerSymbol } from "../schema";

describe("Draw (CR 413)", () => {
  it("takes from the top of the Main Deck to Hand", () => {
    const c1 = makeUnit({ objectId: "c1", printedMight: 1, zone: { kind: "mainDeck", player: "A" } });
    const c2 = makeUnit({ objectId: "c2", printedMight: 1, zone: { kind: "mainDeck", player: "A" } });
    const state = stateWithObjects([c1, c2], { deckOrder: { A: ["c1", "c2"], B: [] } });

    const result = draw(state, "A", 1);
    expect(result.drawn).toEqual(["c1"]);
    expect(result.state.deckOrder.A).toEqual(["c2"]);
    expect(result.state.players.A.handCount).toBe(1);
  });

  it("flags Burn Out when the deck is short (413.4)", () => {
    const state = makeState({ deckOrder: { A: [], B: [] } });
    expect(draw(state, "A", 1).burnOut).toBe(true);
  });
});

describe("Exhaust / Ready (CR 414-415)", () => {
  it("an already-exhausted object cannot be exhausted, so it FAILS as a cost (414.4)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, statuses: new Set(["exhausted"]) });
    expect(exhaust(stateWithObjects([unit]), "u1").succeeded).toBe(false);
  });

  it("an already-ready object cannot be readied", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    expect(ready(stateWithObjects([unit]), "u1").succeeded).toBe(false);
  });
});

describe("Recycle (CR 416)", () => {
  it("goes to the BOTTOM of the deck (416.1)", () => {
    const c1 = makeUnit({ objectId: "c1", printedMight: 1, zone: { kind: "trash", player: "A" } });
    const state = stateWithObjects([c1], { deckOrder: { A: ["existing"], B: [] } });
    expect(recycle(state, ["c1"], "mainDeck").deckOrder.A).toEqual(["existing", "c1"]);
  });

  it("always returns to the OWNER's deck, not the controller's (416.1.c)", () => {
    const card = makeUnit({ objectId: "c1", printedMight: 1, owner: "B", controller: "A" });
    const state = stateWithObjects([card], { deckOrder: { A: [], B: [] } });
    const next = recycle(state, ["c1"], "mainDeck");
    expect(next.deckOrder.B).toEqual(["c1"]);
    expect(next.deckOrder.A).toEqual([]);
  });

  it("honours an owner-chosen order for the Rune Deck (416.5.a)", () => {
    const r1 = makeUnit({ objectId: "r1", printedMight: null, categories: ["rune"] });
    const r2 = makeUnit({ objectId: "r2", printedMight: null, categories: ["rune"] });
    const state = stateWithObjects([r1, r2], { runeDeckOrder: { A: [], B: [] } });
    const next = recycle(state, ["r1", "r2"], "runeDeck", ["r2", "r1"]);
    expect(next.runeDeckOrder.A).toEqual(["r2", "r1"]);
  });
});

describe("Deal / Heal (CR 417-418) and Prevent (CR 437)", () => {
  it("marks damage on the unit", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5 });
    expect(deal(stateWithObjects([unit]), "u1", 3).objects.u1.damage).toBe(3);
  });

  it("Bonus Damage sums and applies to the total, positive-only (714.2)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5 });
    expect(deal(stateWithObjects([unit]), "u1", 2, 3).objects.u1.damage).toBe(5);
    expect(deal(stateWithObjects([unit]), "u1", 2, -3).objects.u1.damage).toBe(2); // negative bonus -> 0
  });

  it("Prevent absorbs and decrements; fully-prevented damage was never dealt (437.3-.4)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damageReplacements: [{ kind: "prevent", value: 3 }] });
    const next = deal(stateWithObjects([unit]), "u1", 2);
    expect(next.objects.u1.damage).toBe(0);
    expect(next.objects.u1.damageReplacements).toEqual([{ kind: "prevent", value: 1 }]); // 437.3 decrement
  });

  it("'prevent All' blocks damage entirely (437.5.b)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damageReplacements: [{ kind: "prevent", value: "all" }] });
    expect(deal(stateWithObjects([unit]), "u1", 99).objects.u1.damage).toBe(0);
  });

  it("prevent accumulates onto an existing value", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damageReplacements: [{ kind: "prevent", value: 2 }] });
    // CR 465.2.c.5 — replacements are an ordered LIST, not a summed scalar.
    expect(prevent(stateWithObjects([unit]), "u1", 3).objects.u1.damageReplacements).toEqual([
      { kind: "prevent", value: 2 },
      { kind: "prevent", value: 3 },
    ]);
  });

  it("Heal clears damage (418.1.a)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damage: 4 });
    expect(heal(stateWithObjects([unit]), "u1").objects.u1.damage).toBe(0);
  });
});

describe("Stun (CR 423)", () => {
  it("applies to an unstunned unit", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const result = stun(stateWithObjects([unit]), "u1");
    expect(result.applied).toBe(true);
    expect(result.state.objects.u1.statuses.has("stunned")).toBe(true);
  });

  it("a Stunned unit CANNOT be stunned again, and re-stunning fires no trigger (423.1.a.1)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, statuses: new Set(["stunned"]) });
    expect(stun(stateWithObjects([unit]), "u1").applied).toBe(false);
  });
});

describe("Buff (CR 426 / 702)", () => {
  it("places a Buff counter, capped at ONE per unit (702.3)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const first = buff(stateWithObjects([unit]), "u1");
    expect(first.applied).toBe(true);
    expect(first.state.objects.u1.buffCount).toBe(1);
  });

  it("buffing an already-buffed unit means THE BUFF DID NOT HAPPEN (426.1.c)", () => {
    // Follow-on "if it was buffed this way" clauses must fail, and "when you
    // buff me" must not trigger — that's what applied:false expresses.
    const unit = makeUnit({ objectId: "u1", printedMight: 3, buffCount: 1 });
    const result = buff(stateWithObjects([unit]), "u1");
    expect(result.applied).toBe(false);
    expect(result.state.objects.u1.buffCount).toBe(1);
  });

  it("a Buff may only be spent from a unit you control (702.2.b.2)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, buffCount: 1, controller: "A" });
    expect(spendBuff(stateWithObjects([unit]), "u1", "B").spent).toBe(false);
    expect(spendBuff(stateWithObjects([unit]), "u1", "A").spent).toBe(true);
  });
});

describe("Kill / Banish (CR 427-428)", () => {
  it("Kill only COUNTS as killed when the origin was a board zone (428.2.a)", () => {
    const onBoard = makeUnit({ objectId: "u1", printedMight: 2, zone: { kind: "base", player: "A" } });
    expect(kill(stateWithObjects([onBoard]), "u1").counted).toBe(true);

    const inHand = makeUnit({ objectId: "u2", printedMight: 2, zone: { kind: "hand", player: "A" } });
    expect(kill(stateWithObjects([inHand]), "u2").counted).toBe(false);
  });

  it("Banish sends the object to Banishment, not the Trash (427.2.a)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    expect(banish(stateWithObjects([unit]), "u1").objects.u1.zone).toEqual({ kind: "banishment", player: "A" });
  });
});

describe("Burn Out — deck-out is a POINT DONATION, not a loss (CR 431)", () => {
  it("awards an opponent a point and recycles the trash into the Main Deck", () => {
    const trashed = makeUnit({ objectId: "t1", printedMight: 1, owner: "A", zone: { kind: "trash", player: "A" } });
    const state = stateWithObjects([trashed], { deckOrder: { A: [], B: [] } });

    const next = burnOut(state, "A", "B");
    expect(next.players.B.points).toBe(1); // 431.2.c — an OPPONENT gains the point
    expect(next.deckOrder.A).toEqual(["t1"]);
  });
});

describe("Channel (CR 430)", () => {
  it("moves runes from the Rune Deck to the board, READY by default (430.2.a)", () => {
    const rune = makeUnit({
      objectId: "r1",
      printedMight: null,
      categories: ["rune"],
      zone: { kind: "runeDeck", player: "A" },
      statuses: new Set(["exhausted"]),
    });
    const state = stateWithObjects([rune], { runeDeckOrder: { A: ["r1"], B: [] } });

    const result = channel(state, "A", 2); // asks for 2, deck has 1
    expect(result.channeled).toEqual(["r1"]);
    expect(result.state.objects.r1.statuses.has("exhausted")).toBe(false);
  });
});

describe("Double and Swap (CR 432-433)", () => {
  it("Double increases by the current value", () => {
    expect(double(3)).toBe(6);
  });

  it("increase-by-negative is an increase by ZERO (477.3.c)", () => {
    // A -2 unit gains 0, not -2. The legacy kernel would have subtracted.
    expect(double(-2)).toBe(-2);
  });

  it("Swap reverses two values; equal values are a no-op (433.1.c)", () => {
    expect(swap(2, 5)).toEqual([5, 2]);
    expect(swap(4, 4)).toEqual([4, 4]);
  });
});

describe("Predict (CR 436)", () => {
  it("never triggers Burn Out even on a short deck (436.4.a)", () => {
    const c1 = makeUnit({ objectId: "c1", printedMight: 1 });
    const state = stateWithObjects([c1], { deckOrder: { A: ["c1"], B: [] } });

    // Asking to predict 3 with 1 card left: predicts what it can, no Burn Out.
    const next = predict(state, "A", 3, (looked) => ({ recycled: [], keptOnTopInOrder: looked }));
    expect(next.deckOrder.A).toEqual(["c1"]);
  });

  it("recycles the chosen cards to the deck bottom", () => {
    const c1 = makeUnit({ objectId: "c1", printedMight: 1 });
    const c2 = makeUnit({ objectId: "c2", printedMight: 1 });
    const state = stateWithObjects([c1, c2], { deckOrder: { A: ["c1", "c2"], B: [] } });

    const next = predict(state, "A", 2, () => ({ recycled: ["c1"], keptOnTopInOrder: ["c2"] }));
    expect(next.deckOrder.A).toEqual(["c2", "c1"]);
  });
});

describe("Burn (CR 440)", () => {
  it("sends the top of the Main Deck to the Trash and flags Burn Out when short", () => {
    const c1 = makeUnit({ objectId: "c1", printedMight: 1 });
    const state = stateWithObjects([c1], { deckOrder: { A: ["c1"], B: [] } });

    const result = burn(state, "A", 2);
    expect(result.burned).toEqual(["c1"]);
    expect(result.burnOut).toBe(true);
    expect(result.state.objects.c1.zone).toEqual({ kind: "trash", player: "A" });
  });
});

describe("Empower (CR 441)", () => {
  it("cannot empower the already-Empowered", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, statuses: new Set(["empowered"]) });
    expect(empower(stateWithObjects([unit]), "u1").applied).toBe(false);
  });
});

describe("Discard (CR 422)", () => {
  it("moves a hand card to the trash and decrements the public hand count (108.7.e)", () => {
    const card = makeUnit({ objectId: "c1", printedMight: 1, zone: { kind: "hand", player: "A" } });
    const state = stateWithObjects([card], { players: { A: emptyPlayerState("A", { handCount: 1 }), B: emptyPlayerState("B") } });

    const next = discard(state, "c1");
    expect(next.objects.c1.zone).toEqual({ kind: "trash", player: "A" });
    expect(next.players.A.handCount).toBe(0);
  });
});

describe("object identity on zone change (CR 124)", () => {
  it("wipes ALL temporary modifications when crossing to a Non-Board Zone", () => {
    const unit = makeUnit({
      objectId: "u1",
      printedMight: 3,
      damage: 2,
      buffCount: 1,
      counters: { charge: 3 },
      statuses: new Set(["stunned", "exhausted"]),
      damageReplacements: [{ kind: "prevent", value: 2 }],
    });
    const next = changeZone(stateWithObjects([unit]), "u1", { kind: "hand", player: "A" });

    expect(next.objects.u1.damage).toBe(0);
    expect(next.objects.u1.buffCount).toBe(0);
    expect(next.objects.u1.counters).toEqual({});
    expect(next.objects.u1.statuses.size).toBe(0);
    expect(next.objects.u1.damageReplacements).toEqual([]);
  });

  it("mints a NEW ObjectId when one is supplied", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const next = changeZone(stateWithObjects([unit]), "u1", { kind: "hand", player: "A" }, "u1-new");
    expect(next.objects["u1-new"]).toBeDefined();
    expect(next.objects.u1).toBeUndefined();
  });

  it("NEGATIVE: damage does NOT survive a board -> hand -> board round trip (CR 124)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5, damage: 3, counters: { charge: 1 } });
    const toHand = changeZone(stateWithObjects([unit]), "u1", { kind: "hand", player: "A" }, "u1-hand");
    const backToBoard = changeZone(toHand, "u1-hand", { kind: "base", player: "A" }, "u1-board");

    const returned = backToBoard.objects["u1-board"];
    expect(returned.damage).toBe(0);
    expect(returned.counters).toEqual({});
    // And the earlier identities are gone — each crossing is a new object.
    expect(backToBoard.objects.u1).toBeUndefined();
    expect(backToBoard.objects["u1-hand"]).toBeUndefined();
  });

  it("preserves state for a board-to-board move (CR 458 — Recall is state-preserving)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, damage: 2, zone: { kind: "battlefield", battlefieldId: "bf1" } });
    const next = changeZone(stateWithObjects([unit]), "u1", { kind: "base", player: "A" });
    expect(next.objects.u1.damage).toBe(2);
  });
});

describe("canPay — the rune-pool cost check (CR 163)", () => {
  const pool = (energy: number, power: { domain: "Fury" | "Body"; universal: boolean }[]) => ({ energy, power });

  it("satisfies concrete domain pips", () => {
    const cost: Cost = { energy: 1, power: [{ kind: "domain", domain: "Body" }] };
    expect(canPay(pool(1, [{ domain: "Body", universal: false }]), cost)).toBe(true);
  });

  it("fails when the specific domain isn't available", () => {
    const cost: Cost = { energy: 0, power: [{ kind: "domain", domain: "Body" }] };
    expect(canPay(pool(0, [{ domain: "Fury", universal: false }]), cost)).toBe(false);
  });

  it("a Universal rune stands in for any domain (163.2.b)", () => {
    const cost: Cost = { energy: 0, power: [{ kind: "domain", domain: "Body" }] };
    expect(canPay(pool(0, [{ domain: "Fury", universal: true }]), cost)).toBe(true);
  });

  it("[A] (any) is satisfied by whatever power remains (805.1.a.1)", () => {
    const anySymbol: PowerSymbol = { kind: "any" };
    const cost: Cost = { energy: 0, power: [anySymbol] };
    expect(canPay(pool(0, [{ domain: "Fury", universal: false }]), cost)).toBe(true);
  });

  it("fails on insufficient energy", () => {
    const cost: Cost = { energy: 3, power: [] };
    expect(canPay(pool(2, []), cost)).toBe(false);
  });
});
