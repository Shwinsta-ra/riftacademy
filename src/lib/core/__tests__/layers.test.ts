import { describe, expect, it } from "vitest";
import { applyLayers, currentMight, isMighty } from "../layers";
import { arithmeticEffect, makeUnit, setMightEffect, stateWithObjects } from "./fixtures";

describe("layers — arithmetic (CR 477.3)", () => {
  it("negative Might is legal — a unit can sit below zero (477.3.c)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], { activeLayerEffects: [arithmeticEffect("u1", -5)] });
    expect(currentMight(state, "u1")).toBe(-3);
  });

  it("a Buff counter contributes +1 Might (CR 703)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, buffCount: 1 });
    const state = stateWithObjects([unit]);
    expect(currentMight(state, "u1")).toBe(4);
  });

  it("uses PRINTED Might in a Non-Board Zone, ignoring layer effects (CR 711)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, zone: { kind: "hand", player: "A" } });
    const state = stateWithObjects([unit], { activeLayerEffects: [arithmeticEffect("u1", +5)] });
    expect(currentMight(state, "u1")).toBe(3);
  });
});

describe("layers — snapshotting (CR 477.3.b)", () => {
  // The CR's own example: "-4 [M] to a min of 1" on a 2-Might unit generates
  // -1 [M], and is REMEMBERED at -1 for the duration even if the unit's Might
  // later changes. This is the correction over the legacy per-mod floor,
  // which clamped a running total and let later mods re-push it below.
  it("a limited non-passive effect snapshots its effective delta at application", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [arithmeticEffect("u1", -4, { minimum: 1, timestamp: 1 })],
    });

    const snapshotted = applyLayers(state);
    expect(snapshotted.activeLayerEffects[0].snapshotted).toBe(-1);
    expect(currentMight(snapshotted, "u1")).toBe(1);
  });

  it("the snapshotted delta persists when the base Might later rises", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [arithmeticEffect("u1", -4, { minimum: 1, timestamp: 1 })],
    });
    const snapshotted = applyLayers(state);

    // The unit grows to 6 Might. The snapshot stays -1 (NOT re-clamped to -4).
    const grown = {
      ...snapshotted,
      objects: { ...snapshotted.objects, u1: { ...snapshotted.objects.u1, printedMight: 6 } },
    };
    expect(currentMight(grown, "u1")).toBe(5);
  });

  it("a PASSIVE limited effect never snapshots — it re-evaluates continuously (477.3.b)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [arithmeticEffect("u1", -4, { minimum: 1, fromPassive: true, timestamp: 1 })],
    });

    const passed = applyLayers(state);
    expect(passed.activeLayerEffects[0].snapshotted).toBeUndefined();
    expect(currentMight(passed, "u1")).toBe(1);

    // At 6 Might the same passive now computes -4 in full (6-4=2 >= min 1).
    const grown = { ...passed, objects: { ...passed.objects, u1: { ...passed.objects.u1, printedMight: 6 } } };
    expect(currentMight(grown, "u1")).toBe(2);
  });
});

describe("layers — set-Might is Layer 1 (CR 477.1.a.1)", () => {
  it("applies BEFORE all arithmetic regardless of cast order", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    // The arithmetic effect has an EARLIER timestamp than the set — under a
    // chain fold that would mean it applies first. Under Layers, the Layer-1
    // set always wins first, then arithmetic applies on top: 4 + 1 = 5.
    const state = stateWithObjects([unit], {
      activeLayerEffects: [arithmeticEffect("u1", +1, { timestamp: 1 }), setMightEffect("u1", 4, 2)],
    });
    expect(currentMight(state, "u1")).toBe(5);
  });
});

describe("isMighty (CR 706-711)", () => {
  it("is true at exactly 5 Might (708)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 5 });
    expect(isMighty(stateWithObjects([unit]), "u1")).toBe(true);
  });

  it("is false at 4 Might", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 4 });
    expect(isMighty(stateWithObjects([unit]), "u1")).toBe(false);
  });

  it("counts Might gained through layers, not just printed", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const state = stateWithObjects([unit], { activeLayerEffects: [arithmeticEffect("u1", +2)] });
    expect(isMighty(state, "u1")).toBe(true);
  });
});
