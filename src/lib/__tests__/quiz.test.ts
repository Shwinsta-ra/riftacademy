import { describe, expect, it } from "vitest";
import { getAvailableDomains, getFilteredCards } from "../quiz";

const NO_FILTER = { sets: [], domains: [], types: [], speeds: [], deckId: null };

describe("getAvailableDomains", () => {
  it("returns exactly the 6 base domains plus Colorless, never a dual-domain combo", () => {
    const domains = getAvailableDomains();
    expect(domains).toEqual(["Fury", "Calm", "Mind", "Body", "Chaos", "Order", "Colorless"]);
    for (const d of domains) expect(d).not.toContain("/");
  });
});

describe("domain filter matching", () => {
  it("selecting one base domain includes dual-domain cards that contain it", () => {
    const furyOnly = getFilteredCards({ ...NO_FILTER, domains: ["Fury"] });
    const hasDualDomainMatch = furyOnly.some(
      (c) => c.domain.length === 1 && c.domain[0].includes("/") && c.domain[0].split("/").includes("Fury")
    );
    expect(hasDualDomainMatch).toBe(true);
    // Every returned card actually contains Fury as a component, not just a
    // substring coincidence.
    for (const c of furyOnly) {
      const components = c.domain.flatMap((d) => d.split("/"));
      expect(components, c.id).toContain("Fury");
    }
  });

  it("selecting multiple domains uses OR logic, not AND", () => {
    const mindOnly = getFilteredCards({ ...NO_FILTER, domains: ["Mind"] });
    const orderOnly = getFilteredCards({ ...NO_FILTER, domains: ["Order"] });
    const either = getFilteredCards({ ...NO_FILTER, domains: ["Mind", "Order"] });
    const union = new Set([...mindOnly, ...orderOnly].map((c) => c.id));
    expect(new Set(either.map((c) => c.id))).toEqual(union);
    // A card that's ONLY Mind/Order combo (no separate mono-domain twin)
    // should show up under either single-domain selection, not just when
    // both are picked together.
    const comboCard = either.find((c) => c.domain.includes("Mind/Order"));
    expect(comboCard).toBeDefined();
    expect(mindOnly.some((c) => c.id === comboCard!.id)).toBe(true);
    expect(orderOnly.some((c) => c.id === comboCard!.id)).toBe(true);
  });

  it("no domain selected returns cards unfiltered by domain", () => {
    const all = getFilteredCards(NO_FILTER);
    const filtered = getFilteredCards({ ...NO_FILTER, domains: [] });
    expect(filtered.length).toBe(all.length);
  });
});
