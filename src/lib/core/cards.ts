// Card accessors + the cards.json → Cost adapter. See RiftCore_Spec.md §4.
//
// cards.json stores `power` (a count of recycles) and `recycleCost` (the
// domain pips actually spent). toCost() normalizes those into the schema's
// Cost shape so affordability (canAfford in rulesKernel.ts) never diverges
// from card data.

import cardsJson from "../../data/cards.json";
import type { Cost, Domain, Keyword, PowerPip } from "./schema";

export type CardJson = {
  id: string;
  name: string;
  collectorNumber: number;
  energy: number | null;
  might: number | null;
  power: number | null;
  type: string;
  supertype: string | null;
  rarity: string;
  domain: string[];
  text: string;
  flavour: string | null;
  setId: string;
  setLabel: string;
  imageUrl: string | null;
  tags: string[];
  recycleCost: string[];
  keywords: string[];
  speed: string | null;
  shorthand: string | null;
  isSignature: boolean;
  isToken: boolean;
  abilityTrigger: string | null;
  subtype: string | null;
};

const CARDS = cardsJson as CardJson[];

const CARDS_BY_ID = new Map<string, CardJson>(CARDS.map((c) => [c.id, c]));

export function getCard(cardId: string): CardJson {
  const card = CARDS_BY_ID.get(cardId);
  if (!card) {
    throw new Error(`RiftCore: unknown cardId "${cardId}"`);
  }
  return card;
}

export function cardName(cardId: string): string {
  return getCard(cardId).name;
}

export function cardMight(cardId: string): number | null {
  return getCard(cardId).might;
}

export function cardKeywords(cardId: string): Keyword[] {
  return getCard(cardId).keywords as Keyword[];
}

// Tally a recycleCost array (e.g. ["Body","Body"]) into PowerPips
// (e.g. [{domain:"Body", count:2}]).
function tally(recycleCost: string[]): PowerPip[] {
  const counts = new Map<Domain, number>();
  for (const domain of recycleCost) {
    const d = domain as Domain;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([domain, count]) => ({ domain, count }));
}

export function toCost(card: CardJson): Cost {
  const powerPips = tally(card.recycleCost);
  const powerCount = card.power ?? powerPips.reduce((sum, p) => sum + p.count, 0);
  return {
    energy: card.energy ?? 0,
    powerCount,
    powerPips,
  };
}

export function costOf(cardId: string): Cost {
  return toCost(getCard(cardId));
}

// Checks an author's asserted card facts against cards.json — the fallback
// path (§7.4) still verifies facts even when a card's effect isn't modeled.
export function cardTruth(
  cardId: string,
  asserted: Partial<{ might: number | null; cost: Cost; text: string; keywords: Keyword[] }>
): boolean {
  const card = getCard(cardId);
  if (asserted.might !== undefined && asserted.might !== card.might) return false;
  if (asserted.text !== undefined && asserted.text !== card.text) return false;
  if (asserted.keywords !== undefined) {
    const actual = cardKeywords(cardId);
    if (asserted.keywords.length !== actual.length) return false;
    if (!asserted.keywords.every((k) => actual.includes(k))) return false;
  }
  if (asserted.cost !== undefined) {
    const actual = toCost(card);
    if (
      asserted.cost.energy !== actual.energy ||
      asserted.cost.powerCount !== actual.powerCount ||
      asserted.cost.powerPips.length !== actual.powerPips.length ||
      !asserted.cost.powerPips.every((pip) =>
        actual.powerPips.some((a) => a.domain === pip.domain && a.count === pip.count)
      )
    ) {
      return false;
    }
  }
  return true;
}
