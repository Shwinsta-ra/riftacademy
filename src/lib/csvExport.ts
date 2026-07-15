import { Match, MatchNoteEntry, DeckList } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Master Yi, Wuju Bladesman" -> "Master Yi" (everything before the first
 *  comma). Distinct from shortLegendName below, which further reduces to
 *  just the last word — this one keeps the full champion name intact. */
export function legendNameNoEpithet(fullText: string): string {
  return fullText.split(",")[0].trim() || fullText;
}

/** "Master Yi, Wuju Bladesman" -> "Yi" (last word before the first comma).
 *  Works for every current deck (Diana, Ezreal, Lux, Annie, Pyke all
 *  reduce to their single-word name the same way). Falls back to the last
 *  word of the whole string for free-text/"Other" deck names with no comma. */
function shortLegendName(fullText: string): string {
  const beforeComma = fullText.split(",")[0].trim();
  const words = beforeComma.split(/\s+/).filter(Boolean);
  return words.length > 0 ? words[words.length - 1] : fullText;
}

/** "DDMMM_<your legend>_<opp legend>_G#", e.g. "13Jul_Yi_Diana_G1". */
function sanitizeForFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-]+/g, "").slice(0, 24) || "Unknown";
}

export function buildExportFilename(
  match: Match,
  myDeck: DeckList | null,
  opponentDeck: DeckList | null
): string {
  const d = new Date(match.startedAt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = MONTHS[d.getMonth()];
  const myLegend = sanitizeForFilename(shortLegendName(myDeck?.legend || match.myDeckName));
  const oppLegend = sanitizeForFilename(shortLegendName(opponentDeck?.legend || match.opponentDeckName));
  return `${dd}${mmm}_${myLegend}_${oppLegend}_${match.gameNumber}`;
}

function runeChannelAmountFor(
  goingFirst: "Me" | "Opponent",
  player: "Me" | "Opponent",
  turnNumber: number
): number {
  const isPlayerGoingFirst = goingFirst === player;
  const isFirstTurnForThisPlayer =
    (isPlayerGoingFirst && turnNumber === 1) || (!isPlayerGoingFirst && turnNumber === 2);
  if (isFirstTurnForThisPlayer) return isPlayerGoingFirst ? 2 : 3;
  return 2;
}

const MAX_RUNES_IN_PLAY = 12;

/**
 * Builds the detailed per-entry CSV. Re-simulates match state turn by turn
 * (since automatic draws/rune channels aren't logged as entries themselves)
 * to derive each turn's "starting" snapshot and running per-turn totals.
 *
 * Column semantics (Ashwin's spec):
 * - Starting Points/Hand/Rune Count: snapshot at the moment this turn began
 *   (same value repeated for every row within that turn).
 * - Points This Turn / Cards Drawn / Cards Discarded / Channeled Runes:
 *   running totals accumulated so far THIS turn, inclusive of the
 *   automatic turn-start draw and rune channel (counted as if they
 *   happened first, before any logged actions).
 * - Used Runes / Untapped Rune: current values as of this specific row.
 */
export function buildDetailedCsv(match: Match, entries: MatchNoteEntry[]): string {
  const header =
    "Turn,Player,Action,Card,Starting Points,Points This Turn,Starting Hand Size,Cards Drawn,Cards Discarded,Starting Rune Count,Channeled Runes,Used Runes,End of Turn Open Runes,Notes\n";

  let myPoints = 0,
    oppPoints = 0,
    myHand = 4,
    oppHand = 4,
    myTotal = 0,
    myTapped = 0,
    oppTotal = 0,
    oppTapped = 0;
  let lastTurnNumber = 0;
  let turnStart = { points: 0, hand: 0, runes: 0 };
  let turnAccum = { points: 0, drawn: 0, discarded: 0, channeled: 0 };

  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows: string[] = [];

  // Conquer BF1/Hold BF1 always refer to Ashwin's own battlefield;
  // BF2 always refers to the opponent's — translate to the real names for
  // the exported log, since "BF2" alone means nothing outside the app.
  function actionLabel(actionType: string): string {
    switch (actionType) {
      case "Conquer BF1":
        return `Conquer ${match.myBattlefield}`;
      case "Conquer BF2":
        return `Conquer ${match.opponentBattlefield}`;
      case "Hold BF1":
        return `Hold ${match.myBattlefield}`;
      case "Hold BF2":
        return `Hold ${match.opponentBattlefield}`;
      default:
        return actionType;
    }
  }

  for (const e of entries) {
    const playerKey: "Me" | "Opponent" = e.player === "You" ? "Me" : "Opponent";

    if (e.turnNumber !== lastTurnNumber) {
      const channelAmt = runeChannelAmountFor(match.goingFirst, playerKey, e.turnNumber);
      if (playerKey === "Me") {
        myHand += 1;
        myTotal = Math.min(MAX_RUNES_IN_PLAY, myTotal + channelAmt);
      } else {
        oppHand += 1;
        oppTotal = Math.min(MAX_RUNES_IN_PLAY, oppTotal + channelAmt);
      }
      turnStart = {
        points: playerKey === "Me" ? myPoints : oppPoints,
        hand: playerKey === "Me" ? myHand : oppHand,
        runes: playerKey === "Me" ? myTotal : oppTotal,
      };
      turnAccum = { points: 0, drawn: 1, discarded: 0, channeled: channelAmt };
      lastTurnNumber = e.turnNumber;
    }

    if (playerKey === "Me") {
      if (e.effect.hand) myHand = Math.max(0, myHand + e.effect.hand);
      if (e.effect.totalRunes) myTotal = Math.max(0, Math.min(MAX_RUNES_IN_PLAY, myTotal + e.effect.totalRunes));
      if (e.effect.tappedRunes) myTapped = Math.max(0, Math.min(myTotal, myTapped + e.effect.tappedRunes));
      if (e.effect.points) myPoints = Math.max(0, myPoints + e.effect.points);
    } else {
      if (e.effect.hand) oppHand = Math.max(0, oppHand + e.effect.hand);
      if (e.effect.totalRunes) oppTotal = Math.max(0, Math.min(MAX_RUNES_IN_PLAY, oppTotal + e.effect.totalRunes));
      if (e.effect.tappedRunes) oppTapped = Math.max(0, Math.min(oppTotal, oppTapped + e.effect.tappedRunes));
      if (e.effect.points) oppPoints = Math.max(0, oppPoints + e.effect.points);
    }

    if (e.effect.points) turnAccum.points += e.effect.points;
    if (e.actionType === "Draw") turnAccum.drawn += 1;
    if (e.actionType === "Discard (Deck)" || e.actionType === "Discard (Hand)") turnAccum.discarded += 1;
    if (e.actionType === "Channel Rune") turnAccum.channeled += 1;

    const usedRunes = playerKey === "Me" ? myTapped : oppTapped;
    const openRunes = playerKey === "Me" ? myTotal - myTapped : oppTotal - oppTapped;
    const round = Math.ceil(e.turnNumber / 2);

    rows.push(
      [
        round,
        e.player,
        actionLabel(e.actionType),
        e.cardName,
        turnStart.points,
        turnAccum.points,
        turnStart.hand,
        turnAccum.drawn,
        turnAccum.discarded,
        turnStart.runes,
        turnAccum.channeled,
        usedRunes,
        openRunes,
        e.note,
      ]
        .map(esc)
        .join(",")
    );
  }

  return header + rows.join("\n");
}
