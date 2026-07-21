export type Card = {
  id: string; // riftbound_id, e.g. "ogn-001-298"
  name: string;
  collectorNumber: number;
  energy: number | null;
  might: number | null;
  power: number | null;
  // NOTE: type is now ALWAYS the sheet's literal Type value — Champion and
  // Equipment are never their own `type` (reversed from an earlier pass).
  // A champion is type "Unit" with subtype "Champion"; equipment is type
  // "Gear" with subtype "Equipment". See TYPE_FILTER_PREDICATES in quiz.ts
  // for how the UI still offers them as independent filter categories.
  type: "Unit" | "Spell" | "Gear" | "Battlefield" | "Legend" | "Rune";
  supertype: "Basic" | "Signature" | "Champion" | "Token" | null;
  // From the Master Card Inventory's own Subtype column (Champion,
  // Equipment, Combat Trick, Removal, Counterspell, Utility, etc). Kept
  // separate from `type` even where it also feeds a `type` derivation
  // (e.g. a Champion's subtype is still "Champion" even though that's
  // also what made `type` resolve to "Champion" instead of "Unit").
  subtype: string | null;
  rarity: string;
  domain: string[];
  text: string;
  flavour: string | null;
  setId: string;
  setLabel: string;
  // Null specifically means "no art exists yet" — a brand-new card merged
  // in from the Master Card Inventory ahead of its set's release / a
  // Riftcodex API pull (e.g. Vendetta before July 31). Never shown as a
  // quiz question subject while null; see getFilteredCards in quiz.ts.
  imageUrl: string | null;
  tags: string[];
  // Curated from Ashwin's master sheet (validated columns only)
  keywords: string[];
  speed: string | null; // "Action" | "Reaction" | "Normal"
  abilityTrigger: string | null; // "While" | "When" | "May" | "Hold" | "Turn Start" | "Turn End" | "Here"
  // From the sheet's "Signature?" column — tracked for future use, not
  // currently wired into any filter per Ashwin's explicit request.
  isSignature: boolean;
  // Domain(s) of rune that must be RECYCLED (removed from play, sent to
  // bottom of the rune deck) to play this card — from the sheet's own
  // "Power" column, which is domain names, not a number. Duplicates mean
  // multiple runes of that domain, e.g. ["Body","Body"] = recycle 2 Body.
  // Distinct from the unrelated numeric `power` field above (an original
  // Riftcodex API stat).
  recycleCost: string[];
  // Ashwin's own shorter display name for this card, from the Master Card
  // Inventory's Shorthand column — null until that data is actually merged
  // in. Falls back to the full `name` wherever displayed.
  shorthand: string | null;
  // True only when the sheet's own Type column says "Token" specifically —
  // this is the authoritative source (supersedes the original Riftcodex
  // supertype field, since Ashwin's sheet may mark cards as tokens that the
  // API classification didn't, or vice versa).
  isToken: boolean;
};

export type CardProgress = {
  cardId: string;
  box: number; // 1-5, Leitner box
  dueAt: number; // epoch ms timestamp
  seenCount: number;
  correctCount: number;
  lastResult: "correct" | "incorrect" | null;
  updatedAt: number;
};

export type QuizFilters = {
  sets: string[]; // e.g. ["OGN", "SFD", "UNL", "OGS"], empty = all
  domains: string[]; // e.g. ["Fury", "Calm"], empty = all
  // Matches canonical `type` directly, e.g. ["Unit", "Champion", "Equipment"].
  // Every value is a mutually exclusive, non-overlapping category — no card
  // can match two of them, so combining any subset via OR always adds up
  // cleanly (e.g. Gear + Equipment = every Gear-family card).
  types: string[];
  // Only "Action" and "Reaction" are ever offered as chips (Settings
  // screen) — "Normal"-speed cards are the overwhelming majority and
  // aren't a meaningful thing to filter toward/away from, so that value
  // deliberately has no chip even though it exists in the data. Empty =
  // all speeds included, same convention as every other filter here.
  speeds: string[];
  // References DeckList.id (see decks.json / deckPool.ts). When set, the
  // quiz pool is scoped to that one deck's resolved cards instead of the
  // full card set — sets/domains are ignored while a deck is active (a
  // deck already pins those), but `types` still narrows further on top,
  // e.g. "just this deck's Spells." Null = normal set/domain/type filtering.
  deckId: string | null;
};

export type QuizMode = "name" | "text";
// "name": shown the card image, guess the name
// "text": shown the card image, guess which ability text/domain/type matches

// Match Notes — a fast, structured turn-log capture tool, digital successor
// to Ashwin's existing physical Action Codes tracker system. Deliberately
// structured (not free-text prose) since the whole point is to later
// aggregate/query this data for scenario generation, not just re-read it
// like a diary.
export type MatchNoteActionType =
  | "Play"
  | "+1 Point"
  | "Conquer BF1"
  | "Conquer BF2"
  | "Hold BF1"
  | "Hold BF2"
  | "Channel Rune"
  | "Untap Rune"
  | "Draw"
  | "Discard (Deck)"
  | "Discard (Hand)"
  | "Recycle (Deck)"
  | "Recycle (Hand)"
  | "Recycle (Play)"
  | "Play Hidden"
  | "Reveal"
  | "Activate Ability"
  | "Attack"
  | "Block"
  | "Pass"
  | "Other";

export const MATCH_NOTE_ACTION_TYPES: MatchNoteActionType[] = [
  "Play",
  "+1 Point",
  "Conquer BF1",
  "Conquer BF2",
  "Hold BF1",
  "Hold BF2",
  "Channel Rune",
  "Untap Rune",
  "Draw",
  "Discard (Deck)",
  "Discard (Hand)",
  "Recycle (Deck)",
  "Recycle (Hand)",
  "Recycle (Play)",
  "Play Hidden",
  "Reveal",
  "Activate Ability",
  "Attack",
  "Block",
  "Pass",
  "Other",
];

// Snapshot of exactly what an entry changed on the match, recorded at the
// moment it's logged — so canceling/deleting an entry can apply the exact
// inverse rather than guessing based on action type.
export type MatchNoteEffect = {
  hand?: number; // + or - to that player's hand count
  totalRunes?: number;
  tappedRunes?: number;
  points?: number;
  deckSize?: number;
  discardPile?: number;
  inPlay?: number;
  banished?: number;
};

export type MatchNoteEntry = {
  id: string;
  matchId: string;
  turnNumber: number;
  player: "You" | "Opponent";
  actionType: MatchNoteActionType;
  cardName: string; // free text — autocompletes against the card database but not required to match
  location: "Hand" | "Top of Deck" | null; // only meaningful for Reveal entries
  note: string;
  effect: MatchNoteEffect;
  createdAt: number;
};

export type DeckList = {
  id: string;
  name: string;
  legend: string;
  runes: Record<string, number>;
  battlefields: string[];
  // The unit that starts on the field of play, NOT shuffled into the deck —
  // excluded from mainDeck for exactly that reason. mainDeck is the true
  // 39-card shuffled deck.
  championCard: string;
  mainDeck: { name: string; qty: number }[];
};

export type Match = {
  id: string;
  startedAt: number;
  myDeckId: string | null; // references DeckList.id, or null if free-text/unknown
  myDeckName: string;
  opponentDeckId: string | null;
  opponentDeckName: string;
  myBattlefield: string;
  opponentBattlefield: string;
  goingFirst: "Me" | "Opponent";
  pointsToWin: number;
  gameNumber: "G1" | "G2" | "G3";
  turnNumber: number;
  currentTurnPlayer: "Me" | "Opponent";
  myPoints: number;
  opponentPoints: number;
  myHandCount: number;
  opponentHandCount: number;
  // A freshly channeled rune is available immediately UNLESS something taps
  // it — that's why the automatic per-turn channel only touches
  // totalRunes (leaving it available), while the manual "Channel Rune"
  // button (for card effects that grant an extra rune) taps it at the same
  // time it's added, matching Ashwin's "increments total, not available"
  // rule. Untap Rune reduces tappedRunes, freeing it back up.
  myTotalRunes: number;
  myTappedRunes: number;
  opponentTotalRunes: number;
  opponentTappedRunes: number;
  // Card-zone tracking — every card is in exactly one of these zones at all
  // times (plus the chosen champion, always 1, and hand, tracked above).
  // deckSize + 1 (champion) + hand + inPlay + discardPile + banished should
  // always equal the deck's real total card count — see
  // cardCountInvariant() in matchEngine.ts, which flags it if not.
  myDeckSize: number;
  opponentDeckSize: number;
  myDiscardPile: number;
  opponentDiscardPile: number;
  myInPlay: number;
  opponentInPlay: number;
  myBanished: number;
  opponentBanished: number;
  result: "Win" | "Loss" | "Draw" | null;
};
