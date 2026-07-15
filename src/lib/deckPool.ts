import { Card, DeckList } from "./types";
import cardsData from "../data/cards.json";
import decksData from "../data/decks.json";

// Deliberately reads cards.json directly rather than going through
// quiz.ts's getAllCards() — quiz.ts imports getCardsForDeck from this file
// for the deck filter branch, so importing back from quiz.ts here would
// create a circular dependency.
const ALL_CARDS = cardsData as Card[];

const ALL_DECKS = (decksData as unknown as DeckList[])
  .slice()
  .sort((a, b) => a.legend.localeCompare(b.legend));

export function getAllDecks(): DeckList[] {
  return ALL_DECKS;
}

export function getDeckById(deckId: string): DeckList | undefined {
  return ALL_DECKS.find((d) => d.id === deckId);
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

let byExactName: Map<string, Card> | null = null;
let byNormalizedName: Map<string, Card> | null = null;

function buildNameIndexes() {
  if (byExactName && byNormalizedName) return;
  byExactName = new Map();
  byNormalizedName = new Map();
  for (const c of ALL_CARDS) {
    byExactName.set(c.name, c);
    byNormalizedName.set(normalize(c.name), c);
  }
}

/**
 * Resolves a card name against cards.json. Historically this had to bridge
 * a real mismatch — decks.json used "Name, Epithet" while cards.json used
 * "Name - Epithet" (plus a trailing "(Starter)" on three legends, and a
 * "Rek'Sai"/"Rek'sai" casing split) — but both files were migrated to a
 * single "Name, Epithet" convention (no apostrophes in Champion base names,
 * sentence case with minor words lowercase) once that mismatch was found.
 * Exact match now covers every real name in the data; the case-insensitive
 * fallback stays only as a defensive net for typos in future decklist
 * imports, not because the old format split still exists anywhere.
 */
export function resolveCardByName(name: string): Card | undefined {
  buildNameIndexes();
  const exact = byExactName!.get(name);
  if (exact) return exact;
  return byNormalizedName!.get(normalize(name));
}

export type DeckCardPool = {
  deck: DeckList;
  cards: Card[]; // unique, resolved, includes Legend + starting Champion
  unresolvedNames: string[]; // surfaced, never silently dropped — see resolveCardByName
};

/**
 * Resolves every card referenced by a deck — its mainDeck entries, its
 * Legend, and its starting Champion — into real Card objects, deduplicated
 * by id. Legend and Champion are included by default even though they
 * aren't part of the shuffled draw deck: they're just as core to "knowing
 * this deck" as anything on the mainDeck list, and excluding them would
 * mean never getting quizzed on a Legend's own ability text.
 */
export function getCardsForDeck(deckId: string): DeckCardPool | null {
  const deck = getDeckById(deckId);
  if (!deck) return null;

  const names = [...deck.mainDeck.map((e) => e.name), deck.legend, deck.championCard].filter(
    (n): n is string => !!n
  );

  const seen = new Set<string>();
  const cards: Card[] = [];
  const unresolvedNames: string[] = [];

  for (const name of names) {
    const card = resolveCardByName(name);
    if (!card) {
      unresolvedNames.push(name);
      continue;
    }
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    cards.push(card);
  }

  return { deck, cards, unresolvedNames };
}
