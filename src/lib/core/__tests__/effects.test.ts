import { describe, expect, it } from "vitest";
import { getCard } from "../cards";
import { CARD_EFFECT_REGISTRY, getEffectEntry, primitiveToEvents } from "../effects";
import { applyPlay, isCounterableBy, resolveMightChain } from "../rulesKernel";
import { emptyPlayerState, makeObject, makeRune, makeState, makeUnit } from "./fixtures";

const LAUNCH_CARD_IDS = [
  "ogn-009-298",
  "ogs-003-024",
  "ogn-004-298",
  "ogn-043-298",
  "sfd-097-221",
  "ogn-046-298",
  "ogn-045-298",
  "ogn-093-298",
  "sfd-066-221",
  "ogn-108-298",
  "ogn-169-298",
  "unl-134-219",
  "ogn-241-298",
  "ogn-096-298",
  "ogn-136-298",
];

describe("CARD_EFFECT_REGISTRY", () => {
  it("has an entry for all 15 launch cards, and every id resolves in cards.json", () => {
    for (const id of LAUNCH_CARD_IDS) {
      expect(getEffectEntry(id)).toBeDefined();
      expect(() => getCard(id)).not.toThrow();
    }
  });

  it("Shen, Kinkou is a static entry carrying Shield 2 + Tank", () => {
    const entry = CARD_EFFECT_REGISTRY["ogn-241-298"];
    expect(entry).toEqual({
      kind: "static",
      keywordGrants: [
        { keyword: "Shield", value: 2, duration: "permanent" },
        { keyword: "Tank", duration: "permanent" },
      ],
    });
  });
});

describe("effect primitives", () => {
  it("Smoke Screen on a Might of 5 resolves to 1", () => {
    const entry = CARD_EFFECT_REGISTRY["ogn-093-298"];
    if (entry.kind !== "program") throw new Error("expected a program entry");
    const [debuff] = entry.program.steps;

    const [event] = primitiveToEvents(debuff, { targetInstanceId: "u1", controller: "A" });
    if (event.type !== "mightModApplied") throw new Error("expected a mightModApplied event");

    expect(resolveMightChain(5, [event.mod])).toBe(1);
  });

  it("Convergent Mutation copies the resolved source Might onto the target", () => {
    const entry = CARD_EFFECT_REGISTRY["ogn-108-298"];
    if (entry.kind !== "program") throw new Error("expected a program entry");
    const [setMight] = entry.program.steps;

    const [event] = primitiveToEvents(setMight, { targetInstanceId: "u1", controller: "A", setValue: 7 });
    expect(event).toEqual({ type: "mightSet", targetInstanceId: "u1", value: 7, duration: "thisTurn" });
  });
});

function stateWithHandCard(cardInstanceId: string, cardId: string, target: ReturnType<typeof makeUnit>, runes: ReturnType<typeof makeRune>[]) {
  return makeState({
    players: {
      A: emptyPlayerState("A", { hand: [makeObject({ instanceId: cardInstanceId, cardId })], runes }),
      B: emptyPlayerState("B", { base: [target] }),
    },
  });
}

describe("applyPlay: Gust rejects a >3 Might target", () => {
  it("is illegal against a Might-4 target", () => {
    const target = makeUnit({ instanceId: "target1", cardId: "test-card", might: 4, controller: "B" });
    const state = stateWithHandCard("gust1", "ogn-169-298", target, [makeRune()]);

    const result = applyPlay(state, { kind: "castSpell", cardInstanceId: "gust1", targets: ["target1"] });

    expect(result.legal).toBe(false);
    expect(result.reason).toMatch(/maxMight/);
  });

  it("is legal against a Might-3 target (boundary)", () => {
    const target = makeUnit({ instanceId: "target1", cardId: "test-card", might: 3, controller: "B" });
    const state = stateWithHandCard("gust1", "ogn-169-298", target, [makeRune()]);

    const result = applyPlay(state, { kind: "castSpell", cardInstanceId: "gust1", targets: ["target1"] });

    expect(result.legal).toBe(true);
    expect(result.events.some((e) => e.type === "unitReturnedToHand")).toBe(true);
  });
});

describe("applyPlay: Existential Dread bounces via Repeat only if already stunned", () => {
  const runes = [makeRune({ domain: "Chaos" }), makeRune({ domain: "Chaos" }), makeRune(), makeRune()];

  it("stuns but does not bounce a target that wasn't already stunned", () => {
    const target = makeUnit({ instanceId: "target1", cardId: "test-card", might: 2, controller: "B", stunned: false });
    const state = stateWithHandCard("ed1", "unl-134-219", target, runes);

    const result = applyPlay(state, { kind: "castSpell", cardInstanceId: "ed1", targets: ["target1"], repeat: true });

    expect(result.legal).toBe(true);
    expect(result.events.some((e) => e.type === "unitStunned")).toBe(true);
    expect(result.events.some((e) => e.type === "unitReturnedToHand")).toBe(false);
  });

  it("bounces a target that was already stunned", () => {
    const target = makeUnit({ instanceId: "target1", cardId: "test-card", might: 2, controller: "B", stunned: true });
    const state = stateWithHandCard("ed1", "unl-134-219", target, runes);

    const result = applyPlay(state, { kind: "castSpell", cardInstanceId: "ed1", targets: ["target1"], repeat: true });

    expect(result.legal).toBe(true);
    expect(result.events.some((e) => e.type === "unitReturnedToHand")).toBe(true);
  });
});

describe("isCounterableBy", () => {
  it("Punch First (cost 3) is counterable by Defy (maxCost 4)", () => {
    const state = makeState({
      players: {
        A: emptyPlayerState("A", { hand: [makeObject({ instanceId: "pf1", cardId: "sfd-097-221" })] }),
        B: emptyPlayerState("B"),
      },
    });
    const play = { kind: "castSpell" as const, cardInstanceId: "pf1", targets: [] };
    expect(isCounterableBy(play, "ogn-045-298", state)).toBe(true);
  });
});
