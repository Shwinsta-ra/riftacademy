import { describe, expect, it } from "vitest";
import { getAllCards, getFilteredCards } from "../quiz";
import { buildAttributeQuestion, eligibleModes, getMaskRegions } from "../attributeQuiz";

// The 25 Vendetta cards added to the Master Inventory two nights ago
// (collector numbers 142-166, taking VEN from 141 to 166 base cards). Two
// of them (165, 166) still have no imageUrl -- correctly excluded from the
// quiz pool until Riftcodex reveals their art, same as every other
// not-yet-released card. This covers the other 23 mechanically: every
// eligible quiz mode builds a valid question with no crash, Legends never
// get a name question, and every mask region resolves to a real rect.
describe("25 newly-ingested Vendetta cards (collector #142-166)", () => {
  const pool = getAllCards();
  const newCards = pool.filter((c) => c.setId === "VEN" && c.collectorNumber >= 142);

  it("is exactly 25 cards, 23 with art already live in the quiz pool", () => {
    expect(newCards).toHaveLength(25);
    const live = newCards.filter((c) => c.imageUrl !== null);
    expect(live).toHaveLength(23);
    const withoutArt = newCards.filter((c) => c.imageUrl === null);
    expect(withoutArt.map((c) => c.id).sort()).toEqual(["ven-165-166", "ven-166-166"]);
  });

  it("excludes the 2 art-less cards from getFilteredCards, same as any other unreleased card", () => {
    const filtered = getFilteredCards({ sets: [], domains: [], types: [], speeds: [], deckId: null });
    const filteredIds = new Set(filtered.map((c) => c.id));
    expect(filteredIds.has("ven-165-166")).toBe(false);
    expect(filteredIds.has("ven-166-166")).toBe(false);
  });

  const liveNewCards = newCards.filter((c) => c.imageUrl !== null);

  for (const c of liveNewCards) {
    it(`${c.id} (${c.name}, ${c.type}): every eligible mode builds a valid question`, () => {
      const modes = eligibleModes(c);
      expect(modes.length, c.id).toBeGreaterThan(0);

      if (c.type === "Legend") {
        expect(modes, c.id).not.toContain("name");
      }

      for (const mode of modes) {
        // Random pool sampling (bracketSwap/name) means one build isn't
        // enough to catch an intermittent crash -- exercise each mode a
        // handful of times.
        for (let i = 0; i < 5; i++) {
          const q = buildAttributeQuestion(c, pool, [], []);
          expect(q, `${c.id} ${mode}`).not.toBeNull();
          if (!q) continue;
          expect(q.options.length, `${c.id} ${mode}`).toBeGreaterThanOrEqual(2);
          expect(q.options.length, `${c.id} ${mode}`).toBeLessThanOrEqual(4);
          expect(q.correctIndex, `${c.id} ${mode}`).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex, `${c.id} ${mode}`).toBeLessThan(q.options.length);
          expect(new Set(q.options).size, `${c.id} ${mode} (duplicate options)`).toBe(
            q.options.length
          );
        }

        const regions = getMaskRegions(mode, c);
        // energyCost/powerCost/might/name/text-family modes all resolve to a
        // real position-config entry for every card type in play today --
        // an empty region array would mean the question is unmaskable
        // (the real answer left fully visible), the exact leak class item 6
        // fixed for powerCost.
        expect(regions.length, `${c.id} ${mode} mask region`).toBeGreaterThan(0);
      }
    });
  }
});
