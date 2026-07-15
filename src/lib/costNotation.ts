import { Card } from "./types";

// Color-initial letters, matching Ashwin's actual notation examples
// (G=green=Calm, O=orange=Body) rather than domain-name initials.
// NOTE: Mind (blue) uses "B" here — could visually read as "Body" to
// someone unfamiliar with the scheme, but Body has its own letter (O), so
// there's no actual collision in the data. Flagged since it's inferred,
// not explicitly confirmed for Mind/Chaos/Order/Fury the way Calm and Body were.
const DOMAIN_COLOR_LETTER: Record<string, string> = {
  Fury: "R", // red
  Calm: "G", // green
  Mind: "B", // blue
  Body: "O", // orange
  Chaos: "P", // purple
  Order: "Y", // yellow/gold
};

type RecycleRequirement = {
  count: number; // how many runes must actually be recycled
  letters: string; // color letters to display, concatenated
};

/**
 * Parses a card's recycleCost list (e.g. ["Calm","Calm"] or ["Body","Calm"])
 * into the actual game requirement, per Ashwin's rule:
 * - All entries the SAME domain -> additive (recycle that many of that color).
 * - 2+ DIFFERENT domains present -> recycle just ONE, player's choice of
 *   any listed color (only known real case: exactly 2 distinct domains,
 *   no repeats — e.g. Alpha Strike's "Body, Calm").
 */
function parseRecycleRequirement(recycleCost: string[]): RecycleRequirement | null {
  if (!recycleCost || recycleCost.length === 0) return null;
  const uniqueDomains = Array.from(new Set(recycleCost));
  if (uniqueDomains.length === 1) {
    return { count: recycleCost.length, letters: DOMAIN_COLOR_LETTER[uniqueDomains[0]] ?? "?" };
  }
  // Multiple distinct domains present anywhere in the list = an
  // either/or choice of exactly 1 rune, showing every color it could be.
  return { count: 1, letters: uniqueDomains.map((d) => DOMAIN_COLOR_LETTER[d] ?? "?").join("") };
}

/** e.g. "1E" (energy only), "1E1G" (1 energy + recycle 1 Calm), "3E1OG"
 *  (3 energy + recycle 1 rune, either Body or Calm), or "2E2G" if two
 *  Calm runes must both be recycled. */
export function formatCostCode(card: Card): string {
  const energyPart = `${card.energy ?? 0}E`;
  const req = parseRecycleRequirement(card.recycleCost);
  if (!req) return energyPart;
  return `${energyPart}${req.count}${req.letters}`;
}

/** How many runes must actually be recycled (removed from play) — 1 for an
 *  either/or multi-domain choice, or N for N-of-the-same-domain. */
export function recycleCount(card: Card | null): number {
  if (!card) return 0;
  return parseRecycleRequirement(card.recycleCost)?.count ?? 0;
}
