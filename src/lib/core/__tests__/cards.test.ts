import { describe, expect, it } from "vitest";
import { getCard, toCost } from "../cards";

describe("toCost", () => {
  it("maps a card with no recycle cost", () => {
    // Blazing Scorcher: energy 5, power null, recycleCost []
    const cost = toCost(getCard("ogn-001-298"));
    expect(cost).toEqual({ energy: 5, powerCount: 0, powerPips: [] });
  });

  it("maps power (explicit count) + single-domain recycleCost", () => {
    // Get Excited!: energy 2, power 1, recycleCost ["Fury"]
    const cost = toCost(getCard("ogn-008-298"));
    expect(cost).toEqual({ energy: 2, powerCount: 1, powerPips: [{ domain: "Fury", count: 1 }] });
  });

  it("tallies duplicate domain pips (Body,Body -> count 2)", () => {
    // Punch First: energy 1, power 2, recycleCost ["Body","Body"]
    const cost = toCost(getCard("sfd-097-221"));
    expect(cost).toEqual({ energy: 1, powerCount: 2, powerPips: [{ domain: "Body", count: 2 }] });
  });

  it("falls back to summing pips when power is null", () => {
    // Brittle Steel: energy 2, power null, recycleCost ["Fury"]
    const cost = toCost(getCard("ven-003-166"));
    expect(cost).toEqual({ energy: 2, powerCount: 1, powerPips: [{ domain: "Fury", count: 1 }] });
  });

  it("Thermo Beam: explicit power count matches tallied pips", () => {
    // energy 5, power 2, recycleCost ["Fury","Fury"]
    const cost = toCost(getCard("ogn-022-298"));
    expect(cost).toEqual({ energy: 5, powerCount: 2, powerPips: [{ domain: "Fury", count: 2 }] });
  });
});
