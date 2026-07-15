import { Card, QuizFilters } from "./types";
import cardsData from "../data/cards.json";
import { getCardsForDeck } from "./deckPool";

const ALL_CARDS = cardsData as Card[];

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
    const deckCards = pool ? pool.cards : [];
    if (!filters.types.length) return deckCards;
    return deckCards.filter((c) => filters.types.includes(c.type));
  }

  return ALL_CARDS.filter((c) => {
    if (filters.sets.length && !filters.sets.includes(c.setId)) return false;
    if (filters.types.length && !filters.types.includes(c.type)) return false;
    if (
      filters.domains.length &&
      !c.domain.some((d) => filters.domains.includes(d))
    )
      return false;
    return true;
  });
}

export function getAvailableSets(): { id: string; label: string }[] {
  const map = new Map<string, string>();
  for (const c of ALL_CARDS) map.set(c.setId, c.setLabel);
  return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
}

export function getAvailableDomains(): string[] {
  const set = new Set<string>();
  for (const c of ALL_CARDS) c.domain.forEach((d) => set.add(d));
  return Array.from(set).sort();
}

export function getAvailableTypes(): string[] {
  const set = new Set<string>();
  for (const c of ALL_CARDS) {
    // Runes never appear in the quiz (see attributeQuiz.eligibleModes), so
    // there's no point offering them as a filter option.
    if (c.type === "Rune") continue;
    set.add(c.type);
  }
  return Array.from(set).sort();
}
