import { describe, expect, it } from "vitest";
import { getAllCards, getCardById } from "../quiz";
import {
  buildBracketSwapQuestion,
  buildFillBlankQuestion,
  buildTextQuestion,
  classifyKind,
  eligibleModes,
} from "../attributeQuiz";

function card(id: string) {
  const c = getCardById(id);
  if (!c) throw new Error(`fixture card not found: ${id}`);
  return c;
}

describe("Group B Bucket 3 — exactly 1 blankable number", () => {
  // One real card per verb context, confirming classifyKind's context scan
  // and the 0-as-no-op-distractor exclusion across the checklist's named
  // contexts (deal/draw/discard/might/cost).
  const cases: { id: string; kind: string; value: number }[] = [
    { id: "ogn-009-298", kind: "damage", value: 3 }, // Hextech Ray: "Deal 3 to a unit..."
    { id: "ogn-038-298", kind: "draw", value: 1 }, // Kadregrin the Infernal: "draw 1 for each..."
    { id: "ogn-003-298", kind: "discard", value: 1 }, // Chemtech Enforcer: "discard 1"
    { id: "ogn-016-298", kind: "might", value: 2 }, // Dangerous Duo: "+2 Might this turn"
    { id: "ogn-012-298", kind: "cost", value: 2 }, // Noxus Hopeful: "I cost (2) less."
  ];

  for (const { id, kind, value } of cases) {
    it(`${kind} context (${id}): blanks the number, excludes 0 as a distractor`, () => {
      const c = card(id);
      const q = buildFillBlankQuestion(c, []);
      expect(q.mode).toBe("fillBlank");
      expect(q.prompt).toBe("Fill in the blank:");
      expect((q.caption!.match(/____/g) || []).length).toBe(1);
      expect(q.options).toContain(`${value}`);
      expect(q.options[q.correctIndex]).toBe(`${value}`);
      expect(q.options).toHaveLength(4);
      expect(q.options).not.toContain("0");
    });
  }

  it("still allows 0 as the real correct answer in a no-op-excludable context (Might)", () => {
    // Zed, Without a Sound: "play a 0 Might Shadow Clone unit token..."
    const c = card("ven-112-166");
    const q = buildFillBlankQuestion(c, []);
    expect(q.options[q.correctIndex]).toBe("0");
    expect(classifyKind(c.text, c.text.indexOf("0 Might"), c.text.indexOf("0 Might") + 1)).toBe("might");
    // The other 3 options are non-negative, non-zero, distinct from correct.
    const distractors = q.options.filter((_, i) => i !== q.correctIndex);
    expect(distractors).toHaveLength(3);
    expect(new Set(distractors).size).toBe(3);
    for (const d of distractors) expect(d).not.toBe("0");
  });

  it("keeps 0 available as a distractor for an unclassified (non-no-op) number context", () => {
    // Ahri, Alluring: "When I hold, you score 1 point." — no deal/draw/
    // discard/recycle/might/cost verb nearby, so 0 is a fine near-miss.
    const c = card("ogn-066-298");
    const q = buildFillBlankQuestion(c, []);
    expect(q.options[q.correctIndex]).toBe("1");
    expect(q.options).toContain("0");
  });
});

describe("Group B Bucket 4 — 3+ blankable numbers", () => {
  it("priority order picks the Might-context number over an activation cost", () => {
    // Lillia, Bashful Bloom: "(4), [Tap]: Play a ready 3 Might Sprite unit
    // token with [Temporary]. This ability costs (1) less for each..."
    // Numbers: 4=cost (tap activation), 3=might, 1=cost. Might must win.
    const c = card("unl-189-219");
    const q = buildFillBlankQuestion(c, []);
    expect(q.mode).toBe("fillBlank");
    expect(q.options[q.correctIndex]).toBe("3");
    expect(q.caption).toContain("____ Might Sprite");
  });
});

describe("Group B Bucket 2 — 0 numbers, no permutable bracket", () => {
  it("tightens the fallback pool to same domain+type+subtype before widening", () => {
    // Flame Chompers: Unit/null-subtype/Fury, 0 numbers, no brackets at all.
    const c = card("ogn-006-298");
    const pool = getAllCards();
    const q = buildTextQuestion(c, pool);
    expect(q.mode).toBe("text");
    const distractors = q.options.filter((o) => o !== q.options[q.correctIndex]);
    for (const text of distractors) {
      const source = pool.find((p) => p.text === text);
      expect(source).toBeDefined();
      expect(source!.type).toBe(c.type);
      expect(source!.subtype).toBe(c.subtype);
      expect(source!.domain.some((d) => c.domain.includes(d))).toBe(true);
    }
  });
});

describe("Group B Bucket 1 — 0 numbers, has a permutable bracket", () => {
  it("Star-Crossed worked example produces exactly the 5 distractors Ashwin specified", () => {
    const target = card("unl-128-219"); // Star-Crossed
    const factoryRecall = card("sfd-135-221");
    const rebuke = card("ogn-172-298");
    const pool = [target, factoryRecall, rebuke];

    const q = buildBracketSwapQuestion(target, pool);
    expect(q.mode).toBe("bracketSwap");
    expect(q.options[q.correctIndex]).toBe(target.text);

    const distractors = new Set(q.options.filter((_, i) => i !== q.correctIndex));
    expect(distractors).toEqual(
      new Set([
        "[Action] Return a friendly unit and an enemy unit to their owners' hands.",
        "[Action] Return a gear to its owner's hand.",
        "[Reaction] Return a gear to its owner's hand.",
        "[Action] Return a unit at a battlefield to its owner's hand.",
        "[Reaction] Return a unit at a battlefield to its owner's hand.",
      ])
    );
    expect(q.options).toHaveLength(6);
  });

  it("permutes a real curated keyword tag, not just Action/Reaction speed tags", () => {
    // Noxus Saboteur: "Your opponents' [Hidden] cards can't be revealed
    // here." — 0 numbers, no speed tag (Normal speed), keyword bracket only.
    const target = card("ogn-018-298");
    const pool = getAllCards();
    const q = buildBracketSwapQuestion(target, pool);
    expect(q.mode).toBe("bracketSwap");
    expect(q.options[q.correctIndex]).toBe(target.text);
    const distractors = q.options.filter((_, i) => i !== q.correctIndex);
    expect(distractors.length).toBeGreaterThan(0);
    // At least one distractor is the target's own text with [Hidden] swapped
    // for a different bracketed keyword (not a speed tag, since this card
    // has none).
    const targetSwap = distractors.find(
      (d) => d !== target.text && d.endsWith("cards can't be revealed here.") && !d.includes("[Hidden]")
    );
    expect(targetSwap).toBeDefined();
    expect(targetSwap).toMatch(/^Your opponents' \[[A-Za-z][A-Za-z \-]*\] cards can't be revealed here\.$/);
  });
});

describe("Group B full-pool smoke test — every real card builds a valid question", () => {
  const pool = getAllCards();

  function assertValidQuestion(q: { options: string[]; correctIndex: number }, label: string) {
    expect(q.options.length, label).toBeGreaterThanOrEqual(2);
    expect(q.correctIndex, label).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex, label).toBeLessThan(q.options.length);
    expect(new Set(q.options).size, `${label} (duplicate option text)`).toBe(q.options.length);
  }

  for (const c of pool) {
    const modes = eligibleModes(c);
    if (modes.includes("fillBlank")) {
      it(`fillBlank: ${c.id} (${c.name})`, () => {
        const q = buildFillBlankQuestion(c, pool);
        assertValidQuestion(q, c.id);
        expect(q.caption, c.id).toContain("____");
      });
    }
    if (modes.includes("bracketSwap")) {
      it(`bracketSwap: ${c.id} (${c.name})`, () => {
        const q = buildBracketSwapQuestion(c, pool);
        assertValidQuestion(q, c.id);
      });
    }
    if (modes.includes("text")) {
      it(`text: ${c.id} (${c.name})`, () => {
        const q = buildTextQuestion(c, pool);
        assertValidQuestion(q, c.id);
      });
    }
  }
});

describe("Group A regression — shipped exactly-2-number fill-in-the-blank is unaffected", () => {
  it("Brazen Buccaneer still produces the two-blank real/alternate combination format", () => {
    const c = card("ogn-002-298"); // "discard 1 ... reduce my cost by (2)."
    const q = buildFillBlankQuestion(c, []);
    expect(q.mode).toBe("fillBlank");
    expect(q.prompt).toBe("Fill in the blanks:");
    expect((q.caption!.match(/____/g) || []).length).toBe(2);
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correctIndex]).toBe("1 | 2");
    for (const o of q.options) expect(o).toMatch(/^\d+ \| \d+$/);
  });
});
