// Card accessors + the cards.json -> Cost adapter.
//
// cards.json stores `power` (a count of recycles) and `recycleCost` (the
// domain pips actually spent). toCost() normalizes those into the v2 Cost
// shape so affordability (canPay in actions.ts) never diverges from card
// data.
//
// CR 805.1.a.1 — [C] ("Power matching one of this card's domains") and [A]
// ("any domain") stay SYMBOLIC in the v2 cost model rather than being
// pre-resolved to a concrete domain. Pre-resolving is correct for a
// single-domain card but lossy for a multi-domain one, where [C] legitimately
// offers a choice (Part 6 §4).

import cardsJson from "../../data/cards.json";
import type { CardId, Cost, Domain, Keyword, PowerSymbol } from "./schema";

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

export function getCard(cardId: CardId): CardJson {
  const card = CARDS_BY_ID.get(cardId);
  if (!card) {
    throw new Error(`RiftCore: unknown cardId "${cardId}"`);
  }
  return card;
}

export function cardName(cardId: CardId): string {
  return getCard(cardId).name;
}

export function cardMight(cardId: CardId): number | null {
  return getCard(cardId).might;
}

/**
 * The card's PRINTED keywords. Note this reads cards.json's `keywords`
 * column, whose value set predates the v2 25-keyword union — entries that
 * aren't CR keywords (the legacy list included Game Actions like Buff/Stun
 * and the derived descriptor Mighty) are filtered out rather than silently
 * widening the Keyword type.
 */
export function cardKeywords(cardId: CardId): Keyword[] {
  const raw = getCard(cardId).keywords;
  return raw.map(normalizeKeyword).filter((k): k is Keyword => k !== null);
}

const KEYWORD_ALIASES: Record<string, Keyword> = {
  "quick-draw": "QuickDraw",
  quickdraw: "QuickDraw",
};

const VALID_KEYWORDS = new Set<string>([
  "Accelerate",
  "Action",
  "Assault",
  "Deathknell",
  "Deflect",
  "Ganking",
  "Hidden",
  "Legion",
  "Reaction",
  "Shield",
  "Tank",
  "Temporary",
  "Vision",
  "Equip",
  "QuickDraw",
  "Repeat",
  "Weaponmaster",
  "Ambush",
  "Hunt",
  "Level",
  "Unique",
  "Backline",
  "Empower",
  "Empowered",
  "Flow",
]);

function normalizeKeyword(raw: string): Keyword | null {
  const alias = KEYWORD_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  return VALID_KEYWORDS.has(raw) ? (raw as Keyword) : null;
}

/**
 * Builds the symbolic power requirement. A concrete domain in `recycleCost`
 * becomes a {kind:"domain"} symbol; any remainder implied by `power`
 * (recycles not attributed to a specific domain) becomes {kind:"any"} — [A].
 */
function toPowerSymbols(card: CardJson): PowerSymbol[] {
  const concrete: PowerSymbol[] = card.recycleCost
    .filter((d): d is Domain => isDomain(d))
    .map((domain) => ({ kind: "domain", domain }));

  const declared = card.power ?? concrete.length;
  const remainder = Math.max(0, declared - concrete.length);
  return [...concrete, ...Array.from({ length: remainder }, (): PowerSymbol => ({ kind: "any" }))];
}

const DOMAINS: ReadonlySet<string> = new Set(["Fury", "Calm", "Mind", "Body", "Chaos", "Order"]);

function isDomain(value: string): value is Domain {
  return DOMAINS.has(value);
}

export function toCost(card: CardJson): Cost {
  return { energy: card.energy ?? 0, power: toPowerSymbols(card) };
}

export function costOf(cardId: CardId): Cost {
  return toCost(getCard(cardId));
}

/** Checks an author's asserted card facts against cards.json. */
export function cardTruth(
  cardId: CardId,
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
    if (asserted.cost.energy !== actual.energy) return false;
    if (asserted.cost.power.length !== actual.power.length) return false;
    const serialize = (symbols: PowerSymbol[]) => symbols.map((s) => JSON.stringify(s)).sort().join("|");
    if (serialize(asserted.cost.power) !== serialize(actual.power)) return false;
  }
  return true;
}
