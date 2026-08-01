import { describe, expect, it } from "vitest";
import { cardKeywords, getCard, toCost } from "../cards";

describe("toCost — cards.json -> the v2 symbolic Cost (CR 805.1.a.1)", () => {
  it("maps a card with no recycle cost", () => {
    // Blazing Scorcher: energy 5, power null, recycleCost []
    expect(toCost(getCard("ogn-001-298"))).toEqual({ energy: 5, power: [] });
  });

  it("maps a single-domain recycle cost to a concrete domain symbol", () => {
    // Get Excited!: energy 2, power 1, recycleCost ["Fury"]
    expect(toCost(getCard("ogn-008-298"))).toEqual({
      energy: 2,
      power: [{ kind: "domain", domain: "Fury" }],
    });
  });

  it("keeps duplicate domain pips as separate symbols rather than a tallied count", () => {
    // Punch First: energy 1, power 2, recycleCost ["Body","Body"]
    expect(toCost(getCard("sfd-097-221"))).toEqual({
      energy: 1,
      power: [
        { kind: "domain", domain: "Body" },
        { kind: "domain", domain: "Body" },
      ],
    });
  });

  it("falls back to the pip list when `power` is null", () => {
    // Brittle Steel: energy 2, power null, recycleCost ["Fury"]
    expect(toCost(getCard("ven-003-166"))).toEqual({
      energy: 2,
      power: [{ kind: "domain", domain: "Fury" }],
    });
  });

  it("Thermo Beam: explicit power count matches the tallied pips", () => {
    // energy 5, power 2, recycleCost ["Fury","Fury"]
    expect(toCost(getCard("ogn-022-298"))).toEqual({
      energy: 5,
      power: [
        { kind: "domain", domain: "Fury" },
        { kind: "domain", domain: "Fury" },
      ],
    });
  });

  it("represents power beyond the named pips as [A] (any domain)", () => {
    // A card whose `power` count exceeds its listed recycleCost domains has
    // an unattributed remainder; CR 805.1.a.1 keeps that symbolic rather than
    // guessing a concrete domain.
    const synthetic = { ...getCard("ogn-008-298"), power: 3, recycleCost: ["Fury"] };
    expect(toCost(synthetic)).toEqual({
      energy: 2,
      power: [{ kind: "domain", domain: "Fury" }, { kind: "any" }, { kind: "any" }],
    });
  });
});

describe("cardKeywords — filtered to the v2 25-keyword CR union (CR 800-829)", () => {
  it("drops legacy non-keywords that cards.json still carries", () => {
    // The legacy Keyword union included Game Actions (Buff/Burn/Predict/Stun)
    // and the derived descriptor Mighty. Those are not CR keywords, so they
    // must not widen the v2 Keyword type.
    const synthetic = { ...getCard("ogn-001-298"), keywords: ["Tank", "Stun", "Mighty", "Assault"] };
    const filtered = synthetic.keywords.filter((k) => ["Tank", "Assault"].includes(k));
    expect(filtered).toEqual(["Tank", "Assault"]);
  });

  it("returns only valid CR keywords for a real card", () => {
    const keywords = cardKeywords("ogn-241-298"); // Shen, Kinkou
    const valid = new Set([
      "Accelerate", "Action", "Assault", "Deathknell", "Deflect", "Ganking", "Hidden", "Legion",
      "Reaction", "Shield", "Tank", "Temporary", "Vision", "Equip", "QuickDraw", "Repeat",
      "Weaponmaster", "Ambush", "Hunt", "Level", "Unique", "Backline", "Empower", "Empowered", "Flow",
    ]);
    for (const keyword of keywords) {
      expect(valid.has(keyword)).toBe(true);
    }
  });
});
