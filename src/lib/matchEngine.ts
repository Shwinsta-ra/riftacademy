import { Match, MatchNoteEffect } from "./types";

const MAX_RUNES_IN_PLAY = 12; // each player's rune deck has exactly 12 cards

/**
 * How many runes a player channels at the start of THIS turn.
 * First player channels 2 on turn 1; second player channels 3 on their
 * first turn (turn 2 overall); every turn after that is 2 for everyone.
 */
function runeChannelAmount(match: Match, player: "Me" | "Opponent"): number {
  const isPlayerGoingFirst = match.goingFirst === player;
  const isFirstTurnForThisPlayer =
    (isPlayerGoingFirst && match.turnNumber === 1) || (!isPlayerGoingFirst && match.turnNumber === 2);
  if (isFirstTurnForThisPlayer) return isPlayerGoingFirst ? 2 : 3;
  return 2;
}

function applyStartOfTurnEffects(match: Match, player: "Me" | "Opponent"): Match {
  const channel = runeChannelAmount(match, player);
  const updated = { ...match };
  if (player === "Me") {
    updated.myHandCount += 1;
    updated.myDeckSize = Math.max(0, updated.myDeckSize - 1); // the draw comes from the deck
    updated.myTappedRunes = 0;
    updated.myTotalRunes = Math.min(MAX_RUNES_IN_PLAY, updated.myTotalRunes + channel);
  } else {
    updated.opponentHandCount += 1;
    updated.opponentDeckSize = Math.max(0, updated.opponentDeckSize - 1);
    updated.opponentTappedRunes = 0;
    updated.opponentTotalRunes = Math.min(MAX_RUNES_IN_PLAY, updated.opponentTotalRunes + channel);
  }
  return updated;
}

export function createNewMatch(params: {
  id: string;
  myDeckId: string | null;
  myDeckName: string;
  opponentDeckId: string | null;
  opponentDeckName: string;
  myBattlefield: string;
  opponentBattlefield: string;
  goingFirst: "Me" | "Opponent";
  pointsToWin: number;
  gameNumber: "G1" | "G2" | "G3";
  // Real shuffled-deck size (mainDeck total, NOT counting the champion) —
  // caller looks this up from the actual DeckList since matchEngine stays
  // decoupled from deck data. Defaults to 39 (the standard) if unknown.
  myDeckTotalCards?: number;
  opponentDeckTotalCards?: number;
}): Match {
  const myStartDeck = (params.myDeckTotalCards ?? 39) - 4; // minus opening hand
  const opponentStartDeck = (params.opponentDeckTotalCards ?? 39) - 4;
  const base: Match = {
    id: params.id,
    startedAt: Date.now(),
    myDeckId: params.myDeckId,
    myDeckName: params.myDeckName,
    opponentDeckId: params.opponentDeckId,
    opponentDeckName: params.opponentDeckName,
    myBattlefield: params.myBattlefield,
    opponentBattlefield: params.opponentBattlefield,
    goingFirst: params.goingFirst,
    pointsToWin: params.pointsToWin,
    gameNumber: params.gameNumber,
    turnNumber: 1,
    currentTurnPlayer: params.goingFirst,
    myPoints: 0,
    opponentPoints: 0,
    myHandCount: 4,
    opponentHandCount: 4,
    myTotalRunes: 0,
    myTappedRunes: 0,
    opponentTotalRunes: 0,
    opponentTappedRunes: 0,
    myDeckSize: myStartDeck,
    opponentDeckSize: opponentStartDeck,
    myDiscardPile: 0,
    opponentDiscardPile: 0,
    myInPlay: 0,
    opponentInPlay: 0,
    myBanished: 0,
    opponentBanished: 0,
    result: null,
  };
  return applyStartOfTurnEffects(base, params.goingFirst);
}

/** Advances to the other player's turn, applying their untap + draw + rune channel. */
export function endTurn(match: Match): Match {
  const nextPlayer: "Me" | "Opponent" = match.currentTurnPlayer === "Me" ? "Opponent" : "Me";
  const advanced: Match = { ...match, turnNumber: match.turnNumber + 1, currentTurnPlayer: nextPlayer };
  return applyStartOfTurnEffects(advanced, nextPlayer);
}

export function untappedRunes(match: Match, player: "Me" | "Opponent"): number {
  return player === "Me"
    ? match.myTotalRunes - match.myTappedRunes
    : match.opponentTotalRunes - match.opponentTappedRunes;
}

export function totalRunes(match: Match, player: "Me" | "Opponent"): number {
  return player === "Me" ? match.myTotalRunes : match.opponentTotalRunes;
}

/**
 * Every card should be in exactly one zone: the deck, the chosen champion
 * (always exactly 1, on the field from turn 0), hand, in-play, discard
 * pile, or banished. This should ALWAYS sum to the deck's real total card
 * count — if it doesn't, something was logged wrong. `expectedTotal`
 * defaults to 40 (39 deck + 1 champion) but should be passed the real
 * total for decks that aren't exactly 39 (e.g. Annie's real list is 38+1=39).
 */
export function cardCountInvariant(
  match: Match,
  player: "Me" | "Opponent",
  expectedTotal: number = 40
): { total: number; ok: boolean } {
  const deckSize = player === "Me" ? match.myDeckSize : match.opponentDeckSize;
  const hand = player === "Me" ? match.myHandCount : match.opponentHandCount;
  const inPlay = player === "Me" ? match.myInPlay : match.opponentInPlay;
  const discardPile = player === "Me" ? match.myDiscardPile : match.opponentDiscardPile;
  const banished = player === "Me" ? match.myBanished : match.opponentBanished;
  const total = deckSize + 1 + hand + inPlay + discardPile + banished;
  return { total, ok: total === expectedTotal };
}

/** Applies a MatchNoteEffect delta to a match (used both when logging a new
 *  entry and — with the sign flipped — when canceling one). Rune totals are
 *  clamped to [0, 12]; tapped is clamped to [0, totalRunes]; zone counts are
 *  clamped to >= 0. */
export function applyEffect(match: Match, player: "Me" | "Opponent", effect: MatchNoteEffect): Match {
  const updated = { ...match };
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
  if (player === "Me") {
    if (effect.hand) updated.myHandCount = Math.max(0, updated.myHandCount + effect.hand);
    if (effect.totalRunes) updated.myTotalRunes = clamp(updated.myTotalRunes + effect.totalRunes, MAX_RUNES_IN_PLAY);
    if (effect.tappedRunes) updated.myTappedRunes = clamp(updated.myTappedRunes + effect.tappedRunes, updated.myTotalRunes);
    if (effect.points) updated.myPoints = Math.max(0, updated.myPoints + effect.points);
    if (effect.deckSize) updated.myDeckSize = Math.max(0, updated.myDeckSize + effect.deckSize);
    if (effect.discardPile) updated.myDiscardPile = Math.max(0, updated.myDiscardPile + effect.discardPile);
    if (effect.inPlay) updated.myInPlay = Math.max(0, updated.myInPlay + effect.inPlay);
    if (effect.banished) updated.myBanished = Math.max(0, updated.myBanished + effect.banished);
  } else {
    if (effect.hand) updated.opponentHandCount = Math.max(0, updated.opponentHandCount + effect.hand);
    if (effect.totalRunes)
      updated.opponentTotalRunes = clamp(updated.opponentTotalRunes + effect.totalRunes, MAX_RUNES_IN_PLAY);
    if (effect.tappedRunes)
      updated.opponentTappedRunes = clamp(updated.opponentTappedRunes + effect.tappedRunes, updated.opponentTotalRunes);
    if (effect.points) updated.opponentPoints = Math.max(0, updated.opponentPoints + effect.points);
    if (effect.deckSize) updated.opponentDeckSize = Math.max(0, updated.opponentDeckSize + effect.deckSize);
    if (effect.discardPile)
      updated.opponentDiscardPile = Math.max(0, updated.opponentDiscardPile + effect.discardPile);
    if (effect.inPlay) updated.opponentInPlay = Math.max(0, updated.opponentInPlay + effect.inPlay);
    if (effect.banished) updated.opponentBanished = Math.max(0, updated.opponentBanished + effect.banished);
  }
  return updated;
}

export function invertEffect(effect: MatchNoteEffect): MatchNoteEffect {
  return {
    hand: effect.hand ? -effect.hand : undefined,
    totalRunes: effect.totalRunes ? -effect.totalRunes : undefined,
    tappedRunes: effect.tappedRunes ? -effect.tappedRunes : undefined,
    points: effect.points ? -effect.points : undefined,
    deckSize: effect.deckSize ? -effect.deckSize : undefined,
    discardPile: effect.discardPile ? -effect.discardPile : undefined,
    inPlay: effect.inPlay ? -effect.inPlay : undefined,
    banished: effect.banished ? -effect.banished : undefined,
  };
}

/**
 * Builds the effect for a given action.
 *
 * For "Play": energyCost taps that many runes; recycleCount removes that
 * many runes from play (assumed already-tapped, per Ashwin's rule — see
 * below). The card itself moves from hand into a zone based on its type:
 * Spells go to the discard pile (resolve-and-discard), everything else
 * (Unit/Champion/Gear/Equipment/Battlefield) goes to in-play. Unmatched/
 * unknown cards default to in-play as the more common case.
 *
 * For Discard/Recycle: both have Deck and Hand variants with matching
 * zone-transfer rules. Recycle always returns the card to the deck;
 * Recycle (Play) is the only one that touches in-play instead of hand/deck
 * directly. Recycle (Deck) is a no-op on size (a revealed/top-of-deck card
 * going right back into the deck) — logged for the record, not for math.
 */
export function buildEffectForAction(
  actionType: string,
  energyCost: number | null,
  recycleCount: number = 0,
  playedCardIsSpell: boolean = false,
  isChampion: boolean = false
): MatchNoteEffect {
  switch (actionType) {
    case "Play":
      return {
        hand: -1,
        tappedRunes: (energyCost ?? 0) - recycleCount,
        totalRunes: recycleCount > 0 ? -recycleCount : undefined,
        discardPile: playedCardIsSpell ? 1 : undefined,
        inPlay: playedCardIsSpell ? undefined : 1,
      };
    case "Play Hidden":
      // Cost is just "recycle 1 rune" — no energy tap at all. Hand only
      // drops if this isn't the chosen champion (the champion zone doesn't
      // count toward hand size, per Ashwin's rule).
      return {
        hand: isChampion ? undefined : -1,
        totalRunes: -1,
        tappedRunes: -1,
        discardPile: playedCardIsSpell ? 1 : undefined,
        inPlay: playedCardIsSpell ? undefined : 1,
      };
    case "Discard (Deck)":
      return { deckSize: -1, discardPile: 1 };
    case "Discard (Hand)":
      return { hand: -1, discardPile: 1 };
    case "Recycle (Deck)":
      return {}; // revealed/top-of-deck card goes right back — no size change
    case "Recycle (Hand)":
      return { hand: -1, deckSize: 1 };
    case "Recycle (Play)":
      return { inPlay: -1, deckSize: 1 };
    case "Draw":
      return { hand: 1, deckSize: -1 };
    case "+1 Point":
    case "Conquer BF1":
    case "Conquer BF2":
    case "Hold BF1":
    case "Hold BF2":
      return { points: 1 };
    case "Channel Rune":
      // Enters tapped per Ashwin's rule — total goes up, available doesn't.
      return { totalRunes: 1, tappedRunes: 1 };
    case "Untap Rune":
      return { tappedRunes: -1 };
    default:
      return {};
  }
}
