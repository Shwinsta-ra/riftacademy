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
  // GOLDEN — CR 477.3.b (L-A1). Expected value is from the CR text. Do not
  // adjust to match the implementation.
  //
  // The CR's own example: "-4 [M] to a min of 1" on a 2-Might unit generates
  // -1 [M], and is REMEMBERED at -1 for the duration even if the unit's Might
  // later changes. This is the correction over the legacy per-mod floor,
  // which clamped a running total and let later mods re-push it below.
  it("CR 477.3.b — a limited non-passive effect snapshots its effective delta at application", () => {
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

  // GOLDEN — CR 477.3.b (L-A8): "A unit reads 'Units you control here have
  // their Might increased to 5 [M].' This is a passive ability, so it will not
  // snapshot." Expected value is from the CR text. Do not adjust.
  it("CR 477.3.b — a PASSIVE limited effect never snapshots; it re-evaluates continuously", () => {
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
  // GOLDEN — CR 477.1.a.1 (L-A2): "A spell reads 'A unit's Might becomes 4
  // this turn.' The unit's Might is set to 4 in this layer." Expected value is
  // from the CR text. Do not adjust to match the implementation.
  it("CR 477.1.a.1 — set-Might applies BEFORE all arithmetic regardless of cast order", () => {
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

// ---------------------------------------------------------------------------
// Sublayer ordering — CR 477.3.e
// ---------------------------------------------------------------------------

describe("layers — Layer 3 sublayers: increases before decreases (CR 477.3.e)", () => {
  // GOLDEN — CR 477.3.e.1.a / .e.2.a: "Positive values, or increases, to Might
  // are applied first" / "Negative values, or decreases, to Might are applied
  // last." CR 480.3 orders by timestamp "within each Layer and Sublayer" —
  // timestamp never reorders across the sublayer boundary. Expected value is
  // from the CR text. Do not adjust to match the implementation.
  //
  // REGRESSION: the kernel sorted Layer 3 by timestamp alone, so the decrease
  // clamped against 2 and snapshotted -1, folding to 4.
  it("CR 477.3.e — a later-timestamped increase still applies before an earlier decrease", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [
        arithmeticEffect("u1", -4, { minimum: 1, timestamp: 1 }), // decrease, EARLIER timestamp
        arithmeticEffect("u1", +3, { timestamp: 2 }), // increase, LATER timestamp
      ],
    });

    // Increases first: 2 + 3 = 5. Then the decrease: clamp(5 - 4, min 1) = 1.
    const snapshotted = applyLayers(state);
    expect(currentMight(snapshotted, "u1")).toBe(1);
    // The decrease snapshots the full -4, because it saw 5 when it applied.
    expect(snapshotted.activeLayerEffects[0].snapshotted).toBe(-4);
  });

  it("CR 480.3 — timestamp still orders WITHIN a sublayer", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 10 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [
        arithmeticEffect("u1", -3, { maximum: 8, timestamp: 2 }),
        arithmeticEffect("u1", -4, { timestamp: 1 }),
      ],
    });
    // Both are decreases. ts 1 first: 10 - 4 = 6. Then ts 2: clamp(6-3, max 8) = 3.
    expect(currentMight(applyLayers(state), "u1")).toBe(3);
  });

  it("a pure-increase stack is unaffected by the sublayer split", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 1 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [arithmeticEffect("u1", +2, { timestamp: 1 }), arithmeticEffect("u1", +3, { timestamp: 2 })],
    });
    expect(currentMight(state, "u1")).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Tier B — systematic
// ---------------------------------------------------------------------------

describe("layers — systematic (CR 473-480)", () => {
  it("CR 477.3.b — a snapshot expires with its Duration, restoring base Might", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [arithmeticEffect("u1", -4, { minimum: 1, timestamp: 1 })],
    });
    const snapshotted = applyLayers(state);
    expect(currentMight(snapshotted, "u1")).toBe(1);

    // Expiry is modelled as removal from activeLayerEffects.
    const expired = { ...snapshotted, activeLayerEffects: [] };
    expect(currentMight(expired, "u1")).toBe(2);
  });

  it("CR 477.3.b — identical text, passive vs non-passive: only the non-passive snapshots", () => {
    const build = (fromPassive: boolean) => {
      const unit = makeUnit({ objectId: "u1", printedMight: 2 });
      return applyLayers(
        stateWithObjects([unit], {
          activeLayerEffects: [arithmeticEffect("u1", -4, { minimum: 1, fromPassive, timestamp: 1 })],
        })
      );
    };
    expect(build(false).activeLayerEffects[0].snapshotted).toBe(-1);
    expect(build(true).activeLayerEffects[0].snapshotted).toBeUndefined();
  });

  it("CR 477.3.c — negative Might is a legal state, not clamped to zero", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const state = stateWithObjects([unit], { activeLayerEffects: [arithmeticEffect("u1", -5)] });
    expect(currentMight(state, "u1")).toBe(-2);
  });

  it("CR 476.1 — each effect applies exactly once per pass, not once per target lookup", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], { activeLayerEffects: [arithmeticEffect("u1", +3, { timestamp: 1 })] });
    expect(currentMight(state, "u1")).toBe(5);
    // Re-reading is idempotent — no accumulation across reads.
    expect(currentMight(state, "u1")).toBe(5);
  });

  it("CR 477.1.a.1 — the LAST Layer-1 set wins, then arithmetic applies on top", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [setMightEffect("u1", 4, 1), setMightEffect("u1", 7, 2), arithmeticEffect("u1", +1, { timestamp: 3 })],
    });
    expect(currentMight(state, "u1")).toBe(8);
  });

  it("CR 703 — a Buff applies after Layer 1 and before Layer 3", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2, buffCount: 1 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [setMightEffect("u1", 4, 1), arithmeticEffect("u1", +2, { timestamp: 2 })],
    });
    // set 4 -> buff 5 -> +2 = 7.
    expect(currentMight(state, "u1")).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Tier C — adversarial
// ---------------------------------------------------------------------------

describe("layers — adversarial (CR 473-480)", () => {
  it("applyLayers on a clean state is a no-op (idempotent, returns the same reference)", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const state = stateWithObjects([unit]);
    expect(applyLayers(state)).toBe(state);
  });

  it("applyLayers is idempotent once snapshots are frozen", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 2 });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [arithmeticEffect("u1", -4, { minimum: 1, timestamp: 1 })],
    });
    const once = applyLayers(state);
    const twice = applyLayers(once);
    expect(twice).toBe(once); // nothing left to freeze
    expect(currentMight(twice, "u1")).toBe(currentMight(once, "u1"));
  });

  it("an effect whose target has left the board contributes nothing and does not throw", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3 });
    const state = stateWithObjects([unit], { activeLayerEffects: [arithmeticEffect("gone", +5, { timestamp: 1 })] });
    expect(currentMight(state, "u1")).toBe(3);
    expect(currentMight(state, "gone")).toBe(0);
  });

  it("set-Might and a limited arithmetic give the same result in either declaration order", () => {
    const build = (effects: ReturnType<typeof arithmeticEffect>[]) => {
      const unit = makeUnit({ objectId: "u1", printedMight: 2 });
      return currentMight(applyLayers(stateWithObjects([unit], { activeLayerEffects: effects })), "u1");
    };
    const set = setMightEffect("u1", 6, 2);
    const arith = arithmeticEffect("u1", -4, { minimum: 1, timestamp: 1 });
    expect(build([set, arith])).toBe(build([arith, set]));
  });

  it("100 stacked arithmetic effects fold without overflow or a perf cliff", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 0 });
    const effects = Array.from({ length: 100 }, (_, i) => arithmeticEffect("u1", +1, { timestamp: i + 1 }));
    const state = stateWithObjects([unit], { activeLayerEffects: effects });
    expect(currentMight(state, "u1")).toBe(100);
  });

  it("CR 711 — a Non-Board unit ignores every layer, including a Layer-1 set", () => {
    const unit = makeUnit({ objectId: "u1", printedMight: 3, zone: { kind: "trash", player: "A" } });
    const state = stateWithObjects([unit], {
      activeLayerEffects: [setMightEffect("u1", 9, 1), arithmeticEffect("u1", +5, { timestamp: 2 })],
    });
    expect(currentMight(state, "u1")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// ESCALATED — Tier A goldens blocked on the canonical model's SHAPE
// ---------------------------------------------------------------------------
//
// Per the golden-test failure protocol, these are NOT coding bugs to fix in
// place: making them pass requires a type to gain a field, or an ordering
// constraint to move between subsystems. That points at a possible Phase-1
// reading error in Parts 1-7, and reinterpreting the canonical model
// unilaterally is exactly what the clean-room build exists to prevent.
//
// Skipped rather than left red so the suite stays a signal. Un-skip as each
// model question is adjudicated.

describe.skip("ESCALATED — layers goldens blocked on model shape", () => {
  // GOLDEN — CR 476.3 (L-A3/L-A4), the CR's flagship Layers example.
  //
  // "Fiora, Victorious has printed Might 4 and says 'While I'm Mighty, I have
  // Deflect, Ganking, and Shield.' If a player places a buff on Fiora, her
  // Might is increased in the Arithmetic layer, after the layer for
  // Ability-Altering Effects. The Ability-Altering Effect layer is then
  // re-checked and the abilities Deflect, Ganking, and Shield applied."
  //
  // KERNEL: no such re-check exists. CR 476 puts the repeat-until-stable loop
  // INSIDE Layers; layers.ts:16-21 deliberately puts it OUTSIDE, delegating it
  // to "whatever adds/removes the conditional passive's LayerEffects", and no
  // such driver is implemented anywhere. `PassiveAbility.condition` and
  // `.layerEffects` exist in the schema but nothing evaluates them.
  //
  // WHY ESCALATED, not fixed: this is an ordering constraint living in a
  // different subsystem than the CR puts it in. Building the driver is a
  // design decision about where the fixed point belongs, not a computation fix.
  it("CR 476.3 — buffing Fiora re-checks Layer 2 and grants Deflect/Ganking/Shield at 5 Might", () => {});

  // GOLDEN — CR 476.3, second example (L-A4): "A buffed Fiora, Victorious is
  // in combat as a defender when her buff is removed... She goes directly from
  // 6 Might with three keywords to 4 Might with no keywords."
  // Blocked on the same missing re-check.
  it("CR 476.3 — removing the buff cascades Layer 2 -> Layer 3 in the correct direction", () => {});

  // GOLDEN — CR 477.3.c (L-A7): Last Stand "Double a friendly unit's Might
  // this turn" on a unit at -2 Might. "Last Stand instructs its controller to
  // increase the unit's Might by its current amount, -2... This is not
  // possible, so the unit's Might is increased by 0 instead."
  //
  // KERNEL: `ArithmeticOp` is `{attr, delta, minimum?, maximum?}` — it records
  // the AMOUNT but not the DIRECTION. An increase computing -2 is
  // indistinguishable from a decrease of 2, so the kernel cannot apply the
  // "increase by 0 instead" rule.
  //
  // WHY ESCALATED, not fixed: the type needs a new field (e.g.
  // `kind: "increase" | "decrease"`). Note this also underpins the 477.3.e
  // sublayer split above, which currently buckets on the sign of `delta` — a
  // proxy that is exact only while callers honour 477.3.c themselves.
  it("CR 477.3.c — doubling a -2 Might unit increases it by 0, never by -2", () => {});

  // CR 477.3.b, multi-target case. "Friendly units get -4 [M] to a minimum of
  // 1" over a 2-Might and a 9-Might unit should snapshot PER UNIT: -1 and -4
  // respectively, leaving them at 1 and 5.
  //
  // KERNEL: `LayerEffect.snapshotted?: number` is a single scalar. The effect
  // snapshots once against `targetsOf(...)[0]` (layers.ts) and applies that one
  // delta to every target — measured: the 9-Might unit lands on 8, not 5.
  //
  // WHY ESCALATED, not fixed: `snapshotted` must become per-object (a
  // Record<ObjectId, number>) — a field's type changing, not a computation.
  // Not in the CR's worked examples, so Tier B rather than a golden, but it is
  // the same model-shape class and is recorded here with them.
  it("CR 477.3.b — a multi-target limited effect snapshots separately for each object", () => {});
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
