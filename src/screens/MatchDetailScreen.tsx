import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Image,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { File as ExpoFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
import { listEntries, addEntry, deleteEntry, saveMatch, listMatches } from "../lib/matchNotesDb";
import { useFeedbackSafe } from "../feedback/context";
import { cardImageUri } from "../lib/cardImage";
import AppModal from "../components/AppModal";
import {
  endTurn,
  untappedRunes,
  totalRunes,
  applyEffect,
  invertEffect,
  buildEffectForAction,
  cardCountInvariant,
} from "../lib/matchEngine";
import { formatCostCode, recycleCount as getRecycleCount } from "../lib/costNotation";
import { buildExportFilename, buildDetailedCsv, legendNameNoEpithet } from "../lib/csvExport";
import { Match, MatchNoteEntry, MatchNoteActionType, DeckList, Card } from "../lib/types";
import { getAllCards } from "../lib/quiz";
import decksData from "../data/decks.json";

type Props = NativeStackScreenProps<RootStackParamList, "MatchDetail">;

const DECKS = decksData as unknown as DeckList[];
const ALL_CARDS = getAllCards();

// Card names are consistently "Name, Epithet" now (see deckPool.ts), so this
// is mostly just a case-insensitive lookup for card search/autocomplete —
// the apostrophe-stripping and dash-to-comma replacement are left in as a
// harmless safety net (e.g. if a future deck import pastes an old-format
// name), not because either format still exists in the real data.
function normalizeCardName(name: string): string {
  return name.toLowerCase().replace(/ - /g, ", ").replace(/'/g, "");
}
const CARD_BY_NAME = new Map(ALL_CARDS.map((c) => [normalizeCardName(c.name), c]));

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function speedShort(speed: string | null): string {
  if (speed === "Action") return "A";
  if (speed === "Reaction") return "R";
  return "-";
}

function displayName(card: Card | null, fallback: string): string {
  return card?.shorthand ?? fallback;
}

function getDeckForPlayer(match: Match, player: "Me" | "Opponent"): DeckList | null {
  const deckId = player === "Me" ? match.myDeckId : match.opponentDeckId;
  if (!deckId) return null;
  return DECKS.find((d) => d.id === deckId) ?? null;
}

/** "Turn 1" (green, my turn), "Turn 1" (red, opponent's turn), "Turn 2"...
 *  Each player's turns are counted separately by round rather than as one
 *  shared incrementing counter — color is what tells them apart. */
function turnLabel(match: Match, activeLegendName: string): string {
  return `Turn ${Math.ceil(match.turnNumber / 2)} - ${activeLegendName}`;
}

export default function MatchDetailScreen({ route }: Props) {
  const { matchId } = route.params;
  const { setScreenContext } = useFeedbackSafe();
  const [match, setMatch] = useState<Match | null>(null);
  const [entries, setEntries] = useState<MatchNoteEntry[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [conquerAOn, setConquerAOn] = useState(false);
  const [conquerBOn, setConquerBOn] = useState(false);
  const [holdAOn, setHoldAOn] = useState(false);
  const [holdBOn, setHoldBOn] = useState(false);
  const [showConquerHoldMenu, setShowConquerHoldMenu] = useState(false);
  const [hiddenPlayCandidate, setHiddenPlayCandidate] = useState<string | null>(null);
  // Staged pick within the Hidden-play modal — set by tapping an option,
  // committed (and the actual Play/Play Hidden action fired) only when the
  // CTA is pressed, same pattern as every other modal in this screen.
  const [stagedHiddenPlay, setStagedHiddenPlay] = useState<"normal" | "hidden" | null>(null);
  const [preEndTurnMatch, setPreEndTurnMatch] = useState<Match | null>(null);
  const [playModeActive, setPlayModeActive] = useState(false);
  const [showDiscardMenu, setShowDiscardMenu] = useState(false);
  // Staged pick within the Discard/Recycle modal — same deal: tapping an
  // option highlights it, the actual handleAction call only fires from the
  // CTA.
  const [stagedDiscardChoice, setStagedDiscardChoice] = useState<{
    action: MatchNoteActionType;
    player: "Me" | "Opponent";
    label: string;
    lines: string[];
  } | null>(null);
  const [flashFeedback, setFlashFeedback] = useState<Record<string, string[]>>({});
  const flashAnims = useRef<Record<string, Animated.Value>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const cardTableScrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const [allMatches, matchEntries] = await Promise.all([listMatches(), listEntries(matchId)]);
    setMatch(allMatches.find((m) => m.id === matchId) ?? null);
    setEntries(matchEntries);
  }, [matchId]);

  // Publish the live match state to the feedback layer. A "the math is wrong"
  // report is close to useless without the turn number and the state of the
  // card-count invariant at the moment it was filed — with them, it's a
  // one-line diff against matchEngine.
  useEffect(() => {
    if (!match) return;
    setScreenContext({
      matchId: match.id,
      turnNumber: match.turnNumber,
      cardCountOk: cardCountInvariant(match, "Me").ok,
    });
  }, [match?.id, match?.turnNumber, match?.myDeckSize, match?.myHandCount, match?.myInPlay]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Conquer/Hold toggles are once-per-turn — reset the moment the turn changes.
  useEffect(() => {
    setConquerAOn(false);
    setConquerBOn(false);
    setHoldAOn(false);
    setHoldBOn(false);
    setPlayModeActive(false);
  }, [match?.turnNumber]);

  const activePlayer: "Me" | "Opponent" = match?.currentTurnPlayer ?? "Me";
  const isMyTurn = activePlayer === "Me";
  const activeDeck = useMemo(() => (match ? getDeckForPlayer(match, activePlayer) : null), [match, activePlayer]);

  const invariantCheck = useMemo(() => {
    if (!match) return null;
    const myDeck = getDeckForPlayer(match, "Me");
    const opponentDeck = getDeckForPlayer(match, "Opponent");
    const myExpected = myDeck ? myDeck.mainDeck.reduce((s, e) => s + e.qty, 0) + 1 : 40;
    const opponentExpected = opponentDeck ? opponentDeck.mainDeck.reduce((s, e) => s + e.qty, 0) + 1 : 40;
    const mine = cardCountInvariant(match, "Me", myExpected);
    const theirs = cardCountInvariant(match, "Opponent", opponentExpected);
    return { mine, theirs, myExpected, opponentExpected };
  }, [match]);

  const myDeckForDisplay = useMemo(() => (match ? getDeckForPlayer(match, "Me") : null), [match]);
  const opponentDeckForDisplay = useMemo(() => (match ? getDeckForPlayer(match, "Opponent") : null), [match]);

  const myLegendName = legendNameNoEpithet(myDeckForDisplay?.legend || match?.myDeckName || "You");
  const opponentLegendName = legendNameNoEpithet(
    opponentDeckForDisplay?.legend || match?.opponentDeckName || "Opponent"
  );

  const myAvailable = match ? untappedRunes(match, activePlayer) : 0;
  const myTotal = match ? totalRunes(match, activePlayer) : 0;

  const deckCardList = useMemo(() => {
    if (!activeDeck) return [];
    const withChampion = activeDeck.championCard
      ? [...activeDeck.mainDeck, { name: activeDeck.championCard, qty: 1 }]
      : activeDeck.mainDeck;
    return withChampion
      .map((e) => ({ ...e, card: CARD_BY_NAME.get(normalizeCardName(e.name)) ?? null }))
      .sort((a, b) => (a.card?.energy ?? 0) - (b.card?.energy ?? 0))
      .filter((e) => !cardSearch.trim() || e.name.toLowerCase().includes(cardSearch.trim().toLowerCase()));
  }, [activeDeck, cardSearch]);

  // Fallback search across every card in the game (not just the curated
  // deck list), scoped to the active player's domain colors when known —
  // e.g. Diana's deck (Mind/Chaos) surfaces Flash even though it isn't in
  // the specific decklist we scraped.
  const fullCardSuggestions = useMemo(() => {
    if (!playModeActive || cardSearch.trim().length < 2) return [];
    const q = cardSearch.trim().toLowerCase();
    const deckDomains = activeDeck ? Object.keys(activeDeck.runes) : null;
    const alreadyInDeckList = new Set(deckCardList.map((e) => normalizeCardName(e.name)));
    return ALL_CARDS.filter(
      (c) =>
        c.type !== "Rune" &&
        c.name.toLowerCase().includes(q) &&
        !alreadyInDeckList.has(normalizeCardName(c.name)) &&
        (!deckDomains || deckDomains.length === 0 || c.domain.some((d) => deckDomains.includes(d)))
    ).slice(0, 6);
  }, [cardSearch, activeDeck, playModeActive, deckCardList]);

  const opponentCardPanel = useMemo(() => {
    if (!match?.opponentDeckId) return null;
    const deck = DECKS.find((d) => d.id === match.opponentDeckId);
    if (!deck) return null;
    const opponentAvailable = untappedRunes(match, "Opponent");
    return deck.mainDeck
      .map((entry) => {
        const card = CARD_BY_NAME.get(normalizeCardName(entry.name));
        if (!card) return null;
        // Only cards the opponent could actually play DURING my turn — i.e.
        // in response. Normal-speed spells can only be played on their own
        // turn, so they're excluded here even though they're still Spells.
        const isReactiveSpell = card.type === "Spell" && (card.speed === "Action" || card.speed === "Reaction");
        const isAmbushUnit = card.type === "Unit" && card.keywords.includes("Ambush");
        const isQuickDrawGear =
          (card.type === "Gear" || card.type === "Equipment") && card.keywords.includes("Quick-Draw");
        if (!isReactiveSpell && !isAmbushUnit && !isQuickDrawGear) return null;

        const playedCount = entries.filter(
          (e) =>
            e.player === "Opponent" &&
            e.actionType === "Play" &&
            normalizeCardName(e.cardName) === normalizeCardName(entry.name)
        ).length;
        const opponentTotal = totalRunes(match, "Opponent");
        const recycleNeeded = getRecycleCount(card);
        const affordable = (card.energy ?? 0) <= opponentAvailable && recycleNeeded <= opponentTotal;
        // Ambush/Quick-Draw effectively function at Reaction speed even if
        // the card's own `speed` field says otherwise — Ashwin's rule.
        const speed = isAmbushUnit || isQuickDrawGear ? "R" : speedShort(card.speed);
        return {
          name: card.name,
          card,
          speed,
          costCode: formatCostCode(card),
          cost: card.energy ?? 0,
          playedCount,
          affordable,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.cost - b.cost);
  }, [match, entries]);

  async function persist(updated: Match) {
    setMatch(updated);
    await saveMatch(updated);
  }

  async function handleQuickPoint(player: "Me" | "Opponent") {
    if (!match) return;
    const effect = buildEffectForAction("+1 Point", null);
    const entry: MatchNoteEntry = {
      id: newId(),
      matchId,
      turnNumber: match.turnNumber,
      player: player === "Me" ? "You" : "Opponent",
      actionType: "+1 Point",
      cardName: "",
      location: null,
      note: "",
      effect,
      createdAt: Date.now(),
    };
    await addEntry(entry);
    await persist(applyEffect(match, player, effect));
    load();
  }

  async function handleEndTurn() {
    if (!match) return;
    let updated = match;

    // Resolve the once-per-turn Conquer/Hold toggles as real logged actions
    // right before advancing, then reset them for the next turn.
    for (const [on, actionType] of [
      [conquerAOn, "Conquer BF1"],
      [conquerBOn, "Conquer BF2"],
      [holdAOn, "Hold BF1"],
      [holdBOn, "Hold BF2"],
    ] as const) {
      if (!on) continue;
      const effect = buildEffectForAction(actionType, null);
      const entry: MatchNoteEntry = {
        id: newId(),
        matchId,
        turnNumber: updated.turnNumber,
        player: activePlayer === "Me" ? "You" : "Opponent",
        actionType,
        cardName: "",
        location: null,
        note: "",
        effect,
        createdAt: Date.now(),
      };
      await addEntry(entry);
      updated = applyEffect(updated, activePlayer, effect);
    }

    // Snapshot the exact state right before advancing, so undoing something
    // logged in the turn we're about to leave can restore it precisely
    // (rather than trying to reverse the automatic draw/rune-channel that's
    // about to happen, which can't be inferred from the entry alone).
    setPreEndTurnMatch(updated);
    await persist(endTurn(updated));
    setCardSearch("");
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    load();
  }

  function flash(key: string, lines: string[]) {
    setFlashFeedback((prev) => ({ ...prev, [key]: lines }));
    if (!flashAnims.current[key]) flashAnims.current[key] = new Animated.Value(1);
    const anim = flashAnims.current[key];
    anim.setValue(1);
    Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }).start(() => {
      setFlashFeedback((prev) => ({ ...prev, [key]: [] }));
    });
  }

  async function handleAction(
    actionType: MatchNoteActionType,
    cardName: string = "",
    forPlayer: "Me" | "Opponent" = activePlayer
  ) {
    if (!match) return;
    const matchedCard = cardName ? CARD_BY_NAME.get(normalizeCardName(cardName)) ?? null : null;
    const isPlayAction = actionType === "Play" || actionType === "Play Hidden";
    const energyCost = isPlayAction ? matchedCard?.energy ?? 0 : null;
    const recycle = isPlayAction ? getRecycleCount(matchedCard) : 0;
    const isSpell = matchedCard?.type === "Spell";
    // The chosen champion lives in the champion zone, not the hand — playing
    // it (normally or hidden) never touches hand size, only runes.
    const forDeck = forPlayer === "Me" ? myDeckForDisplay : opponentDeckForDisplay;
    const isChampion =
      isPlayAction &&
      !!forDeck?.championCard &&
      normalizeCardName(cardName) === normalizeCardName(forDeck.championCard);
    const effect = buildEffectForAction(actionType, energyCost, recycle, isSpell, isChampion);

    const entry: MatchNoteEntry = {
      id: newId(),
      matchId,
      turnNumber: match.turnNumber,
      player: forPlayer === "Me" ? "You" : "Opponent",
      actionType,
      cardName,
      location: null,
      note: "",
      effect,
      createdAt: Date.now(),
    };
    await addEntry(entry);
    await persist(applyEffect(match, forPlayer, effect));
    setCardSearch("");
    load();
  }

  function handleTableRowTap(name: string) {
    if (!playModeActive) return;
    const card = CARD_BY_NAME.get(normalizeCardName(name));
    if (card?.keywords.includes("Hidden")) {
      setPlayModeActive(false);
      setStagedHiddenPlay(null);
      setHiddenPlayCandidate(name);
      return;
    }
    setPlayModeActive(false);
    handleAction("Play", name);
    cardTableScrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function handleCancelEntry(entry: MatchNoteEntry) {
    if (!match) return;
    const player: "Me" | "Opponent" = entry.player === "You" ? "Me" : "Opponent";

    if (
      entry.turnNumber === match.turnNumber - 1 &&
      preEndTurnMatch &&
      preEndTurnMatch.turnNumber === entry.turnNumber
    ) {
      // Undoing something from the turn we just left — restore the exact
      // snapshot from right before "End Turn" was pressed (which already
      // has every other action from that turn baked in), then undo just
      // this one entry on top of it. This correctly flips the turn number,
      // active player, turn-bar color, and left-panel deck back to that turn.
      const restored = applyEffect(preEndTurnMatch, player, invertEffect(entry.effect));
      await persist(restored);
      setPreEndTurnMatch(null);
    } else {
      await persist(applyEffect(match, player, invertEffect(entry.effect)));
    }
    await deleteEntry(entry.id);
    load();
  }

  async function handleSetResult(result: Match["result"]) {
    if (!match) return;
    await persist({ ...match, result });
  }

  // The real bug: this app has no compiled native build — `npm run deploy`
  // is `expo export --platform web`, so Platform.OS is "web" on every
  // device that ever loads it, phone included. The `Platform.OS !== "web"`
  // branch below (expo-file-system + expo-sharing, which is what actually
  // opens the iOS "Save to Drive" sheet) has therefore never run on any
  // real device — the app always fell straight into a clipboard-only copy,
  // on desktop AND mobile alike, regardless of what the device could
  // actually do. The fix isn't a native/web split at all; it's feature
  // detection: mobile Safari and Chrome-on-iOS (both WebKit) support the
  // Web Share API's file-sharing mode, which opens the exact same OS share
  // sheet — Drive, Files, Mail — as the native path was always meant to.
  // Desktop browsers generally don't support it, so they correctly still
  // fall back to a clipboard copy.
  function webShareFilesLikelySupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof (navigator as any).share === "function" &&
      typeof (navigator as any).canShare === "function"
    );
  }

  /** Tries the browser's native share sheet via the Web Share API. Returns
   *  true if the sheet was actually presented (or the user deliberately
   *  canceled it — see the AbortError case below, which isn't a failure),
   *  false if it's unsupported or genuinely failed, so the caller knows
   *  whether to fall back to a clipboard copy. */
  async function shareCsvViaWebShareApi(csv: string, filename: string): Promise<boolean> {
    if (!webShareFilesLikelySupported()) return false;
    try {
      // Deliberately the global constructor, not the `ExpoFile` import
      // above — this needs the browser's own File/Blob-backed File, which
      // navigator.share can actually hand to the OS share sheet.
      const file = new (globalThis as any).File([csv], filename, { type: "text/csv" });
      if (!(navigator as any).canShare({ files: [file] })) return false;
      await (navigator as any).share({ files: [file] });
      return true;
    } catch (err) {
      // Backing out of the share sheet yourself throws an AbortError —
      // that's a deliberate cancel, not a failure, and shouldn't trigger a
      // surprise clipboard copy right after you back out.
      if (err && (err as any).name === "AbortError") return true;
      console.error("Web Share API failed:", err);
      return false;
    }
  }

  // Computed once — browser capability doesn't change mid-session. Drives
  // both the button's own label and whether the clipboard-only fallback
  // button needs to be shown alongside it.
  const canShareFiles = Platform.OS !== "web" || webShareFilesLikelySupported();

  async function handleExportShare() {
    if (!match) return;
    let csv: string | null = null;
    try {
      csv = buildDetailedCsv(match, entries);
      const myDeck = match.myDeckId ? DECKS.find((d) => d.id === match.myDeckId) ?? null : null;
      const opponentDeck = match.opponentDeckId
        ? DECKS.find((d) => d.id === match.opponentDeckId) ?? null
        : null;
      const filename = `${buildExportFilename(match, myDeck, opponentDeck)}.csv`;

      if (Platform.OS === "web") {
        const shared = await shareCsvViaWebShareApi(csv, filename);
        if (shared) return;
        await Clipboard.setStringAsync(csv);
        Alert.alert("Copied", "CSV copied to clipboard — paste it into your spreadsheet.");
        return;
      }

      const file = new ExpoFile(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          // iOS resolves share-sheet compatibility (which apps/extensions are
          // even offered, and whether they accept the file) from UTI, not
          // mimeType — mimeType alone is a documented cause of destinations
          // like Mail, Messages, or "Save to Drive" silently not appearing
          // or not accepting the file. Every example in Expo's own docs
          // pairs UTI with mimeType for exactly this reason; this call was
          // missing it.
          UTI: "public.comma-separated-values-text",
          dialogTitle: "Save or send match CSV",
        });
      } else {
        await Clipboard.setStringAsync(csv);
        Alert.alert("Copied", "Sharing isn't available here — CSV copied to clipboard instead.");
      }
    } catch (err) {
      // Previously only the native file-share branch was wrapped in a
      // try/catch — the web branch (Platform.OS === "web") had none at all,
      // so any throw there (building the CSV, resolving decks, the
      // clipboard call itself) failed with zero user-visible feedback and
      // looked exactly like "the button doesn't work." That's the same
      // failure shape as the filename bug fixed earlier: an unguarded
      // exception reads as breakage. Now nothing in this function can throw
      // past this point without at least attempting a fallback copy and
      // telling the user what happened.
      console.error("CSV export/share failed:", err);
      try {
        const fallbackCsv = csv ?? buildDetailedCsv(match, entries);
        await Clipboard.setStringAsync(fallbackCsv);
        Alert.alert("Copied", "Something went wrong sharing the file — CSV copied to clipboard instead.");
      } catch (fallbackErr) {
        console.error("CSV clipboard fallback also failed:", fallbackErr);
        Alert.alert("Export failed", "Couldn't build or copy this match's CSV — check the console for details.");
      }
    }
  }

  async function handleExportClipboard() {
    if (!match) return;
    try {
      await Clipboard.setStringAsync(buildDetailedCsv(match, entries));
      Alert.alert("Copied", "CSV copied to clipboard — paste it into your spreadsheet.");
    } catch (err) {
      console.error("CSV clipboard copy failed:", err);
      Alert.alert("Copy failed", "Couldn't build this match's CSV — check the console for details.");
    }
  }

  if (!match) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isMyTurn ? "#12180f" : "#1a1010" }]}>
      {/* Frozen header: condensed horizontal dashboard + turn bar — stays
          visible even while the content below scrolls. */}
      <View style={styles.frozenHeader}>
        <View style={styles.dashboardRow}>
          <View style={[styles.dashboardBoxV2, { borderColor: theme.correct }]}>
            <Text style={styles.dashboardBoxTitleCentered} numberOfLines={1}>
              {myLegendName}
            </Text>
            <View style={styles.dashboardColsRow}>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Points</Text>
                <Text style={styles.dashboardColValueV2}>
                  {match.myPoints}/{match.pointsToWin}
                </Text>
              </View>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Deck</Text>
                <Text style={styles.dashboardColValueV2}>{match.myDeckSize}</Text>
              </View>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Hand</Text>
                <Text style={styles.dashboardColValueV2}>{match.myHandCount}</Text>
              </View>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Runes</Text>
                <Text style={styles.dashboardColValueV2}>
                  {untappedRunes(match, "Me")}/{totalRunes(match, "Me")}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.dashboardBoxV2, { borderColor: theme.incorrect }]}>
            <Text style={styles.dashboardBoxTitleCentered} numberOfLines={1}>
              {opponentLegendName}
            </Text>
            <View style={styles.dashboardColsRow}>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Points</Text>
                <Text style={styles.dashboardColValueV2}>
                  {match.opponentPoints}/{match.pointsToWin}
                </Text>
              </View>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Deck</Text>
                <Text style={styles.dashboardColValueV2}>{match.opponentDeckSize}</Text>
              </View>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Hand</Text>
                <Text style={styles.dashboardColValueV2}>{match.opponentHandCount}</Text>
              </View>
              <View style={styles.dashboardColV2}>
                <Text style={styles.dashboardColLabelV2}>Runes</Text>
                <Text style={styles.dashboardColValueV2}>
                  {untappedRunes(match, "Opponent")}/{totalRunes(match, "Opponent")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {invariantCheck && (!invariantCheck.mine.ok || !invariantCheck.theirs.ok) && (
          <View style={styles.invariantWarning}>
            <Text style={styles.invariantWarningText}>
              ⚠ Card count off —{" "}
              {!invariantCheck.mine.ok &&
                `You: ${invariantCheck.mine.total}/${invariantCheck.myExpected}`}
              {!invariantCheck.mine.ok && !invariantCheck.theirs.ok && " · "}
              {!invariantCheck.theirs.ok &&
                `Opp: ${invariantCheck.theirs.total}/${invariantCheck.opponentExpected}`}
            </Text>
          </View>
        )}

        <View style={[styles.turnBoxV2, { backgroundColor: isMyTurn ? theme.correct : theme.incorrect }]}>
          <Text style={styles.turnBoxText}>
            {turnLabel(match, isMyTurn ? myLegendName : opponentLegendName)}
          </Text>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollBody} contentContainerStyle={{ padding: 16 }}>
      {/* Left (turn actions) + Right (opponent card panel) */}
      <View style={styles.mainRow}>
        <View style={styles.leftPanel}>
          <Pressable
            style={[styles.bigPlayButton, playModeActive && styles.bigPlayButtonCancel]}
            onPress={() => setPlayModeActive((v) => !v)}
          >
            <Text style={styles.bigPlayButtonText}>{playModeActive ? "Cancel" : "Play"}</Text>
          </Pressable>

          {activeDeck && (
            <View style={styles.cardTableWrapper}>
              <ScrollView
                ref={cardTableScrollRef}
                style={styles.cardTable}
                scrollEnabled={playModeActive}
                nestedScrollEnabled
                pointerEvents={playModeActive ? "auto" : "none"}
              >
                {deckCardList.map((c) => {
                  const affordable = c.card
                    ? (c.card.energy ?? 0) <= myAvailable && getRecycleCount(c.card) <= myTotal
                    : false;
                  return (
                    <Pressable
                      key={c.name}
                      onPress={() => handleTableRowTap(c.name)}
                      style={[styles.cardTableRow, affordable && styles.cardTableRowGlow]}
                    >
                      <Text style={styles.cardTableText} numberOfLines={1} ellipsizeMode="tail">
                        {c.card?.name ?? c.name}
                        {c.card?.keywords.includes("Hidden") ? " (Hidden)" : ""}
                      </Text>
                      <Text style={styles.cardTableCost} numberOfLines={1}>
                        {c.card ? formatCostCode(c.card) : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {!playModeActive && (
                <View style={styles.cardTableOverlay} pointerEvents="none">
                  <Text style={styles.cardTableOverlayText}>Click Play</Text>
                </View>
              )}
            </View>
          )}

          <TextInput
            style={[styles.input, styles.inputConnected, !playModeActive && styles.inputDisabled]}
            placeholder="Enter card name"
            placeholderTextColor={theme.textDim}
            value={cardSearch}
            onChangeText={setCardSearch}
            editable={playModeActive}
          />
          {fullCardSuggestions.length > 0 && (
            <View style={styles.cardList}>
              {fullCardSuggestions.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => handleTableRowTap(c.name)}
                  style={styles.cardListRow}
                >
                  <Text style={styles.cardListText}>
                    {c.name} ({formatCostCode(c)}){c.keywords.includes("Hidden") ? " (Hidden)" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.actionGrid}>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                handleAction("Draw");
                flash("draw", ["+1 hand", "-1 deck"]);
              }}
            >
              <Text style={styles.actionButtonText}>Draw</Text>
              {flashFeedback.draw && flashFeedback.draw.length > 0 && (
                <Animated.View style={{ opacity: flashAnims.current.draw }}>
                  {flashFeedback.draw.map((line) => (
                    <Text key={line} style={styles.flashText}>
                      {line}
                    </Text>
                  ))}
                </Animated.View>
              )}
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                setStagedDiscardChoice(null);
                setShowDiscardMenu(true);
              }}
            >
              <Text style={styles.actionButtonText}>Discard</Text>
              <View style={styles.discardRecycleDivider} />
              <Text style={styles.actionButtonText}>Recycle</Text>
              {flashFeedback.discardRecycle && flashFeedback.discardRecycle.length > 0 && (
                <Animated.View style={{ opacity: flashAnims.current.discardRecycle }}>
                  {flashFeedback.discardRecycle.map((line) => (
                    <Text key={line} style={styles.flashText}>
                      {line}
                    </Text>
                  ))}
                </Animated.View>
              )}
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                handleAction("Channel Rune");
                flash("channel", ["+1 power"]);
              }}
            >
              <Text style={styles.actionButtonText}>{"Channel\nTapped\nRune"}</Text>
              {flashFeedback.channel && flashFeedback.channel.length > 0 && (
                <Animated.View style={{ opacity: flashAnims.current.channel }}>
                  {flashFeedback.channel.map((line) => (
                    <Text key={line} style={styles.flashText}>
                      {line}
                    </Text>
                  ))}
                </Animated.View>
              )}
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                handleAction("Untap Rune");
                flash("untap", ["+1 energy"]);
              }}
            >
              <Text style={styles.actionButtonText}>{"Untap\nRune"}</Text>
              {flashFeedback.untap && flashFeedback.untap.length > 0 && (
                <Animated.View style={{ opacity: flashAnims.current.untap }}>
                  {flashFeedback.untap.map((line) => (
                    <Text key={line} style={styles.flashText}>
                      {line}
                    </Text>
                  ))}
                </Animated.View>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.actionButton,
                (conquerAOn || conquerBOn || holdAOn || holdBOn) && styles.actionButtonToggledOn,
              ]}
              onPress={() => setShowConquerHoldMenu(true)}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  (conquerAOn || conquerBOn || holdAOn || holdBOn) && styles.actionButtonTextOn,
                ]}
              >
                Conquer
              </Text>
              <View style={styles.discardRecycleDivider} />
              <Text
                style={[
                  styles.actionButtonText,
                  (conquerAOn || conquerBOn || holdAOn || holdBOn) && styles.actionButtonTextOn,
                ]}
              >
                Hold
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleQuickPoint(isMyTurn ? "Me" : "Opponent")}
            >
              <Text style={styles.actionButtonText}>+1 Point</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <Pressable style={styles.endTurnButtonFull} onPress={handleEndTurn}>
            <Text style={styles.endTurnButtonText}>End Turn →</Text>
          </Pressable>
        </View>

        <View style={styles.rightPanel}>
          <Text style={styles.sectionTitle}>Opponent Spells</Text>
          {opponentCardPanel === null ? (
            <Text style={styles.emptyText}>No deck data for this opponent.</Text>
          ) : opponentCardPanel.length === 0 ? (
            <Text style={styles.emptyText}>None available.</Text>
          ) : (
            opponentCardPanel.map((c) => (
              <Pressable
                key={c.name}
                onPress={() => c.card && setPreviewCard(c.card)}
                style={[styles.spellRow, c.affordable && styles.spellRowAffordable]}
              >
                <Text style={styles.spellName} numberOfLines={1} ellipsizeMode="tail">
                  {c.name}
                </Text>
                <Text style={styles.spellMeta}>
                  {c.speed} | {c.costCode}
                </Text>
              </Pressable>
            ))
          )}
          <Text style={styles.cardListCaption}>{"Click a card to\nto see its image"}</Text>
        </View>
      </View>

      {/* Log with cancel/undo */}
      <Text style={styles.sectionTitle}>{entries.length} entries logged</Text>
      {entries
        .slice()
        .reverse()
        .map((e) => (
          <View key={e.id} style={styles.entryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryLine}>
                T{e.turnNumber} · {e.player} · {e.actionType}
                {e.cardName ? ` · ${e.cardName}` : ""}
              </Text>
            </View>
            <Pressable style={styles.undoButton} onPress={() => handleCancelEntry(e)} hitSlop={10}>
              <Text style={styles.undoButtonText}>Undo</Text>
            </Pressable>
          </View>
        ))}

      <Text style={styles.sectionTitle}>Result</Text>
      <View style={styles.chipWrap}>
        {(["Win", "Loss", "Draw"] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => handleSetResult(r)}
            style={[styles.resultChip, match.result === r && styles.resultChipActive]}
          >
            <Text style={[styles.resultChipText, match.result === r && styles.resultChipTextActive]}>
              {r}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.exportButton} onPress={handleExportShare}>
        <Text style={styles.exportButtonText}>
          {canShareFiles ? "Share / Save / Email CSV" : "Copy CSV"}
        </Text>
      </Pressable>
      {canShareFiles && (
        <Pressable style={styles.exportButtonSecondary} onPress={handleExportClipboard}>
          <Text style={styles.exportButtonSecondaryText}>Or just copy CSV to clipboard</Text>
        </Pressable>
      )}
      </ScrollView>

      {/* Card preview modal — pure viewer, nothing to select, so X-only */}
      <AppModal
        visible={previewCard !== null}
        title={previewCard?.name ?? ""}
        onClose={() => setPreviewCard(null)}
        scrollable={false}
      >
        {previewCard && (
          <Image
            source={{ uri: cardImageUri(previewCard.imageUrl) }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        )}
      </AppModal>

      {/* Conquer/Hold battlefield picker — persistent multi-toggle, staged
          across the whole turn (not reset on open/close) since these apply
          once at End Turn regardless of how many times the menu is opened. */}
      <AppModal
        visible={showConquerHoldMenu}
        title="Conquer / Hold"
        onClose={() => setShowConquerHoldMenu(false)}
        ctaLabel="Done"
        ctaDisabled={!(conquerAOn || conquerBOn || holdAOn || holdBOn)}
        onCta={() => setShowConquerHoldMenu(false)}
      >
        <Pressable
          style={[styles.discardMenuOption, conquerAOn && styles.actionButtonToggledOn]}
          onPress={() => setConquerAOn((v) => !v)}
        >
          <Text style={[styles.discardMenuOptionText, conquerAOn && styles.actionButtonTextOn]}>
            Conquer {match.myBattlefield}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.discardMenuOption, conquerBOn && styles.actionButtonToggledOn]}
          onPress={() => setConquerBOn((v) => !v)}
        >
          <Text style={[styles.discardMenuOptionText, conquerBOn && styles.actionButtonTextOn]}>
            Conquer {match.opponentBattlefield}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.discardMenuOption, holdAOn && styles.actionButtonToggledOn]}
          onPress={() => setHoldAOn((v) => !v)}
        >
          <Text style={[styles.discardMenuOptionText, holdAOn && styles.actionButtonTextOn]}>
            Hold {match.myBattlefield}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.discardMenuOption, holdBOn && styles.actionButtonToggledOn]}
          onPress={() => setHoldBOn((v) => !v)}
        >
          <Text style={[styles.discardMenuOptionText, holdBOn && styles.actionButtonTextOn]}>
            Hold {match.opponentBattlefield}
          </Text>
        </Pressable>
      </AppModal>

      {/* Hidden-play picker: normal vs hidden casting — tap an option to
          stage it, Play commits (fires the actual handleAction) and closes. */}
      <AppModal
        visible={hiddenPlayCandidate !== null}
        title={hiddenPlayCandidate ?? ""}
        onClose={() => setHiddenPlayCandidate(null)}
        ctaLabel="Play"
        ctaDisabled={!stagedHiddenPlay}
        onCta={() => {
          if (hiddenPlayCandidate && stagedHiddenPlay) {
            handleAction(stagedHiddenPlay === "hidden" ? "Play Hidden" : "Play", hiddenPlayCandidate);
          }
          setHiddenPlayCandidate(null);
          cardTableScrollRef.current?.scrollTo({ y: 0, animated: true });
        }}
      >
        <Pressable
          style={[styles.discardMenuOption, stagedHiddenPlay === "normal" && styles.discardMenuOptionStaged]}
          onPress={() => setStagedHiddenPlay("normal")}
        >
          <Text style={styles.discardMenuOptionText}>Played Normally</Text>
        </Pressable>
        <Pressable
          style={[styles.discardMenuOption, stagedHiddenPlay === "hidden" && styles.discardMenuOptionStaged]}
          onPress={() => setStagedHiddenPlay("hidden")}
        >
          <Text style={styles.discardMenuOptionText}>Played Hidden</Text>
        </Pressable>
      </AppModal>

      {/* Discard/Recycle zone picker — 2 columns so either player can be
          targeted. Tap an option to stage it, Confirm commits. */}
      <AppModal
        visible={showDiscardMenu}
        title="Discard or Recycle?"
        onClose={() => setShowDiscardMenu(false)}
        ctaLabel="Confirm"
        ctaDisabled={!stagedDiscardChoice}
        onCta={() => {
          if (stagedDiscardChoice) {
            handleAction(stagedDiscardChoice.action, cardSearch, stagedDiscardChoice.player);
            flash("discardRecycle", stagedDiscardChoice.lines);
          }
          setShowDiscardMenu(false);
        }}
      >
        <View style={styles.discardTwoColRow}>
          <View style={styles.discardCol}>
            <Text style={styles.discardColHeader} numberOfLines={1}>
              {myLegendName}
            </Text>
            {(
              [
                ["Discard (Deck)", "Discard — Deck", ["-1 deck", "+1 discard"]],
                ["Discard (Hand)", "Discard — Hand", ["-1 hand", "+1 discard"]],
                ["Recycle (Deck)", "Recycle — Deck", ["no change"]],
                ["Recycle (Hand)", "Recycle — Hand", ["-1 hand", "+1 deck"]],
                ["Recycle (Play)", "Recycle — Play", ["-1 play", "+1 deck"]],
              ] as const
            ).map(([action, label, lines]) => {
              const staged =
                stagedDiscardChoice?.action === action && stagedDiscardChoice?.player === "Me";
              return (
                <Pressable
                  key={action}
                  style={[styles.discardMenuOptionSmall, staged && styles.discardMenuOptionStaged]}
                  onPress={() => setStagedDiscardChoice({ action, player: "Me", label, lines: [...lines] })}
                >
                  <Text style={styles.discardMenuOptionTextSmall}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.discardColDivider} />

          <View style={styles.discardCol}>
            <Text style={styles.discardColHeader} numberOfLines={1}>
              {opponentLegendName}
            </Text>
            {(
              [
                ["Discard (Deck)", "Discard — Deck", ["-1 deck", "+1 discard"]],
                ["Discard (Hand)", "Discard — Hand", ["-1 hand", "+1 discard"]],
                ["Recycle (Deck)", "Recycle — Deck", ["no change"]],
                ["Recycle (Hand)", "Recycle — Hand", ["-1 hand", "+1 deck"]],
                ["Recycle (Play)", "Recycle — Play", ["-1 play", "+1 deck"]],
              ] as const
            ).map(([action, label, lines]) => {
              const staged =
                stagedDiscardChoice?.action === action && stagedDiscardChoice?.player === "Opponent";
              return (
                <Pressable
                  key={action}
                  style={[styles.discardMenuOptionSmall, staged && styles.discardMenuOptionStaged]}
                  onPress={() =>
                    setStagedDiscardChoice({ action, player: "Opponent", label, lines: [...lines] })
                  }
                >
                  <Text style={styles.discardMenuOptionTextSmall}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center", flex: 1 },
  emptyText: { color: theme.textDim, fontSize: 12 },
  frozenHeader: { padding: 16, paddingBottom: 8 },
  scrollBody: { flex: 1 },
  dashboardRow: { flexDirection: "row", gap: 8 },
  dashboardBoxV2: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 8,
  },
  dashboardBoxTitleCentered: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  dashboardColsRow: { flexDirection: "row" },
  dashboardColV2: { flex: 1, alignItems: "center" },
  dashboardColLabelV2: { color: theme.textDim, fontSize: 8, fontWeight: "700", textTransform: "uppercase" },
  dashboardColValueV2: { color: theme.text, fontSize: 12, fontWeight: "700", marginTop: 2 },
  invariantWarning: {
    backgroundColor: "rgba(204,41,41,0.15)",
    borderWidth: 1,
    borderColor: theme.incorrect,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  invariantWarningText: { color: theme.incorrect, fontSize: 11, fontWeight: "600" },
  turnBoxV2: {
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  turnBoxText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  mainRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  leftPanel: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 12,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 10,
  },
  sectionTitle: { color: theme.text, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  divider: { height: 1, backgroundColor: theme.border, marginBottom: 10 },
  bigPlayButton: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    marginBottom: 10,
  },
  bigPlayButtonCancel: { backgroundColor: theme.incorrect },
  bigPlayButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  cardTableWrapper: {
    marginBottom: 0,
    borderWidth: 1,
    borderColor: theme.border,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
  },
  cardTable: {
    maxHeight: 180,
    backgroundColor: theme.bg,
  },
  cardTableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,20,26,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTableOverlayText: { color: theme.text, fontSize: 13, fontWeight: "700" },
  cardTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cardTableRowGlow: {
    backgroundColor: "rgba(63,163,77,0.14)",
    shadowColor: theme.correct,
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  cardTableText: { color: theme.text, fontSize: 12, flex: 1, flexShrink: 1, marginRight: 8 },
  cardTableCost: { color: theme.textDim, fontSize: 11, flexShrink: 0 },
  input: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.text,
    fontSize: 13,
    marginBottom: 10,
  },
  inputConnected: {
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  inputDisabled: {
    backgroundColor: "#1c1c22",
    color: theme.textDim,
  },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  actionButton: {
    width: "46%",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  actionButtonToggledOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  actionButtonText: { color: theme.text, fontSize: 12, fontWeight: "600", textAlign: "center" },
  flashText: { color: theme.correct, fontSize: 11, fontStyle: "italic", fontWeight: "700", marginTop: 2 },
  discardRecycleDivider: { width: "70%", height: 1, backgroundColor: "#fff", marginVertical: 4 },
  actionButtonTextOn: { color: "#fff" },
  endTurnButtonFull: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  endTurnButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  spellRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  spellRowAffordable: { backgroundColor: "rgba(63,163,77,0.12)" },
  spellName: { color: theme.text, fontSize: 11, flexShrink: 1, marginRight: 6 },
  spellMeta: { color: theme.textDim, fontSize: 10 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  entryLine: { color: theme.text, fontSize: 13 },
  undoButton: {
    borderWidth: 1,
    borderColor: theme.incorrect,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  undoButtonText: { color: theme.incorrect, fontSize: 11, fontWeight: "700" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  resultChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resultChipActive: { backgroundColor: theme.correct, borderColor: theme.correct },
  resultChipText: { color: theme.text, fontSize: 13 },
  resultChipTextActive: { color: "#fff", fontWeight: "700" },
  exportButton: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  exportButtonText: { color: "#fff", fontWeight: "700" },
  exportButtonSecondary: { alignItems: "center", paddingVertical: 8, marginBottom: 20 },
  exportButtonSecondaryText: { color: theme.textDim, fontSize: 12, textDecorationLine: "underline" },
  previewImage: { width: "100%", aspectRatio: 744 / 1039, borderRadius: 10 },
  discardMenuOption: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: theme.bg,
  },
  // Same accent-outline language as the deck-picker's staged row (Settings)
  // — "this is what the CTA will commit."
  discardMenuOptionStaged: { borderColor: theme.accent, borderWidth: 2 },
  discardMenuOptionText: { color: theme.text, fontSize: 14, fontWeight: "600" },
  discardTwoColRow: { flexDirection: "row", marginTop: 8 },
  discardCol: { flex: 1 },
  discardColHeader: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  discardColDivider: { width: 1, backgroundColor: theme.border, marginHorizontal: 10 },
  discardMenuOptionSmall: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: theme.bg,
  },
  discardMenuOptionTextSmall: { color: theme.text, fontSize: 11, fontWeight: "600" },
  cardListCaption: { color: theme.textDim, fontSize: 11, textAlign: "center", marginTop: 10 },
  cardList: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden",
  },
  cardListRow: { paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  cardListText: { color: theme.text, fontSize: 12 },
});
