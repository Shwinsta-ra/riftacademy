import { Card, QuizFilters } from "./types";
import cardsData from "../data/cards.json";
import { getCardsForDeck } from "./deckPool";
import { DOMAIN_COLORS } from "./theme";

const ALL_CARDS = cardsData as Card[];

// Filter options are no longer a 1:1 match against `card.type` — Champion
// and Equipment are permanent subtype values on Unit/Gear cards (not their
// own `type`), but they still need to work as independently-selectable
// filter categories per Ashwin's explicit design:
//   - "Unit" matches every type==="Unit" card, champions included
//   - "Champion" matches ONLY subtype==="Champion" (a strict subset of Unit)
//   - "Gear" matches every type==="Gear" card, equipment included
//   - "Equipment" matches ONLY subtype==="Equipment" (a strict subset of Gear)
// Selecting both "Unit" and "Champion" together is harmless but redundant
// (Champion is already inside Unit) — that's expected, not a bug.
const TYPE_FILTER_PREDICATES: Record<string, (c: Card) => boolean> = {
  Unit: (c) => c.type === "Unit",
  Champion: (c) => c.subtype === "Champion",
  Spell: (c) => c.type === "Spell",
  Gear: (c) => c.type === "Gear",
  Equipment: (c) => c.subtype === "Equipment",
  Battlefield: (c) => c.type === "Battlefield",
  Legend: (c) => c.type === "Legend",
  // Rune deliberately excluded — never appears in the quiz (see
  // attributeQuiz.eligibleModes), so it's not offered as a filter option.
};

const TYPE_FILTER_ORDER = ["Unit", "Champion", "Gear", "Equipment", "Spell", "Battlefield", "Legend"];

function matchesTypeFilter(card: Card, selected: string[]): boolean {
  if (!selected.length) return true;
  return selected.some((id) => TYPE_FILTER_PREDICATES[id]?.(card) ?? false);
}

// A card's `domain` array holds each PRINTED domain string as its own
// element, but a dual-domain card's element is the combined form (e.g.
// "Fury/Chaos"), not two separate single-domain entries -- so a selected
// base domain has to match as a COMPONENT of that string, not the whole
// string. Splitting on "/" turns ["Fury/Chaos"] into ["Fury", "Chaos"] for
// comparison purposes only; the card's own data is left untouched.
function cardMatchesDomainFilter(card: Card, selectedDomains: string[]): boolean {
  const components = card.domain.flatMap((d) => d.split("/"));
  return components.some((d) => selectedDomains.includes(d));
}

export function getAllCards(): Card[] {
  return ALL_CARDS;
}

export function getCardById(id: string): Card | undefined {
  return ALL_CARDS.find((c) => c.id === id);
}

export function getFilteredCards(filters: QuizFilters): Card[] {
  // A selected deck pins the pool to that deck's own cards — sets/domains
  // stop meaning anything once you're testing against one specific 40-card
  // list, so they're deliberately not applied here. `types` still narrows
  // further (e.g. only this deck's Spells), same as the normal path below.
  if (filters.deckId) {
    const pool = getCardsForDeck(filters.deckId);
    // Defensive: a deck list could in principle reference a card that's
    // been merged in ahead of its art (e.g. Vendetta before release) —
    // excluded the same way as the normal path below, not shown as a
    // question subject until imageUrl exists.
    const deckCards = (pool ? pool.cards : []).filter(
      (c) => c.imageUrl !== null && !c.isToken && !c.banned1v1,
    );
    if (!filters.types.length) return deckCards;
    return deckCards.filter((c) => matchesTypeFilter(c, filters.types));
  }

  return ALL_CARDS.filter((c) => {
    // Cards merged in ahead of their art (e.g. Vendetta before its July 31
    // release) can't be shown as a question subject — QuizScreen renders
    // card.imageUrl unconditionally as an <Image> source. They still exist
    // in getAllCards() for distractor generation, match tracking, and
    // stats, just never surface as the actual card being tested.
    if (c.imageUrl === null) return false;
    // Tokens are kept in the dataset (set-count alignment / match tracking)
    // but never quizzed — see eligibleModes(); excluded here too so they
    // don't inflate the pool count shown before a session starts.
    if (c.isToken) return false;
    // Kept in the dataset (match tracking, distractor generation, set
    // counts) but never quizzed -- RiftRecall targets 1v1, so a card
    // banned there shouldn't surface as a question subject even though
    // it's still real data. See card.banned1v1 in types.ts.
    if (c.banned1v1) return false;
    if (filters.sets.length && !filters.sets.includes(c.setId)) return false;
    if (!matchesTypeFilter(c, filters.types)) return false;
    if (filters.domains.length && !cardMatchesDomainFilter(c, filters.domains)) return false;
    if (filters.speeds.length && !(c.speed && filters.speeds.includes(c.speed)))
      return false;
    return true;
  });
}

export function getAvailableSets(): { id: string; label: string }[] {
  const map = new Map<string, string>();
  for (const c of ALL_CARDS) map.set(c.setId, c.setLabel);
  return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
}

// A fixed, curated list rather than derived from card.domain directly --
// same reasoning as getAvailableTypes() below. A dual-domain card's domain
// array holds the combined printed string (e.g. "Fury/Chaos") as its own
// value, so scanning ALL_CARDS for distinct domain values would surface
// every combo (15+) instead of the 6 base domains plus Colorless the filter
// UI is meant to offer. Sourced from DOMAIN_COLORS (theme.ts) rather than a
// second hardcoded list, so the two can't drift out of sync.
export function getAvailableDomains(): string[] {
  return Object.keys(DOMAIN_COLORS);
}

// A fixed, curated list rather than derived from card.type directly —
// Champion and Equipment don't exist as literal `type` values anymore (see
// TYPE_FILTER_PREDICATES above), so scanning ALL_CARDS for unique `type`
// values would silently drop them from the filter UI entirely.
export function getAvailableTypes(): string[] {
  return TYPE_FILTER_ORDER;
}

// Deliberately a fixed pair, not derived from the data (unlike sets/domains/
// types above) — "Normal" is the overwhelming majority of cards and isn't a
// meaningful thing to filter toward, so it never gets offered as a chip
// even though it's a valid value in card.speed.
export function getAvailableSpeeds(): string[] {
  return ["Action", "Reaction"];
}
