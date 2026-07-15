import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
import { listMatches, createMatch, deleteMatch } from "../lib/matchNotesDb";
import { createNewMatch } from "../lib/matchEngine";
import { Match, DeckList } from "../lib/types";
import { getAllCards } from "../lib/quiz";
import { buildExportFilename } from "../lib/csvExport";
import AppModal from "../components/AppModal";
import decksData from "../data/decks.json";

type Props = NativeStackScreenProps<RootStackParamList, "MatchList">;

const DECKS = (decksData as unknown as DeckList[]).slice().sort((a, b) => a.legend.localeCompare(b.legend));
const OTHER_DECK: DeckList = {
  id: "other",
  name: "Other / not listed",
  legend: "",
  runes: {},
  battlefields: [],
  championCard: "",
  mainDeck: [],
};
const DECK_OPTIONS = [...DECKS, OTHER_DECK];
const ALL_BATTLEFIELD_NAMES = getAllCards()
  .filter((c) => c.type === "Battlefield")
  .map((c) => c.name)
  .sort();

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deckButtonLabel(deck: DeckList): string {
  if (deck.id === "other") return "Other / not listed";
  return `${deck.legend} - ${deck.championCard}`;
}

// One of these, or null for the main form. Using a single Modal whose
// CONTENT switches between views (rather than stacking a second real
// native Modal on top of an already-open one) — nested native Modals are
// unreliable in React Native and were causing the picker buttons to become
// unresponsive.
type PickerView = null | "myDeck" | "opponentDeck" | "myBattlefield" | "opponentBattlefield";

export default function MatchListScreen({ navigation }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [pickerView, setPickerView] = useState<PickerView>(null);

  const [myDeck, setMyDeck] = useState<DeckList | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<DeckList | null>(null);
  const [myBattlefield, setMyBattlefield] = useState("");
  const [opponentBattlefield, setOpponentBattlefield] = useState("");
  const [goingFirst, setGoingFirst] = useState<"Me" | "Opponent">("Me");
  const [pointsToWin, setPointsToWin] = useState(8);
  const [gameNumber, setGameNumber] = useState<"G1" | "G2" | "G3">("G1");

  const load = useCallback(async () => {
    setMatches(await listMatches());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function resetForm() {
    setMyDeck(null);
    setOpponentDeck(null);
    setMyBattlefield("");
    setOpponentBattlefield("");
    setGoingFirst("Me");
    setPointsToWin(8);
    setGameNumber("G1");
    setPickerView(null);
  }

  async function handleStartMatch() {
    if (!myDeck || !opponentDeck || !myBattlefield || !opponentBattlefield) return;
    const match = createNewMatch({
      id: newId(),
      myDeckId: myDeck.id === "other" ? null : myDeck.id,
      myDeckName: myDeck.id === "other" ? "Unknown" : myDeck.name,
      opponentDeckId: opponentDeck.id === "other" ? null : opponentDeck.id,
      opponentDeckName: opponentDeck.id === "other" ? "Unknown" : opponentDeck.name,
      myBattlefield,
      opponentBattlefield,
      goingFirst,
      pointsToWin,
      gameNumber,
      myDeckTotalCards: myDeck.id !== "other" ? myDeck.mainDeck.reduce((s, e) => s + e.qty, 0) : undefined,
      opponentDeckTotalCards:
        opponentDeck.id !== "other" ? opponentDeck.mainDeck.reduce((s, e) => s + e.qty, 0) : undefined,
    });
    await createMatch(match);
    setShowNewMatch(false);
    resetForm();
    navigation.navigate("MatchDetail", { matchId: match.id });
  }

  async function handleDelete(matchId: string) {
    await deleteMatch(matchId);
    load();
  }

  const canStart = myDeck && opponentDeck && myBattlefield && opponentBattlefield;

  const battlefieldDeckForPicker = pickerView === "myBattlefield" ? myDeck : opponentDeck;
  const pinnedBattlefields = battlefieldDeckForPicker?.battlefields ?? [];
  const restBattlefields = ALL_BATTLEFIELD_NAMES.filter((n) => !pinnedBattlefields.includes(n));

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={matches}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={
          <Pressable style={styles.newButton} onPress={() => setShowNewMatch(true)}>
            <Text style={styles.newButtonText}>Start Match</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No matches logged yet. Start one above and track turns as you play.
          </Text>
        }
        renderItem={({ item }) => {
          const itemMyDeck = item.myDeckId ? DECKS.find((d) => d.id === item.myDeckId) ?? null : null;
          const itemOpponentDeck = item.opponentDeckId
            ? DECKS.find((d) => d.id === item.opponentDeckId) ?? null
            : null;
          return (
            <Pressable
              style={styles.matchRow}
              onPress={() => navigation.navigate("MatchDetail", { matchId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.matchTitle}>
                  {buildExportFilename(item, itemMyDeck, itemOpponentDeck)}
                </Text>
                <Text style={styles.matchMeta}>
                  {new Date(item.startedAt).toLocaleDateString()} · Turn {item.turnNumber}
                  {item.result ? ` · ${item.result}` : " · in progress"}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(item.id)} hitSlop={10}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      <AppModal
        visible={showNewMatch}
        title={
          pickerView === null
            ? "New match"
            : pickerView === "myDeck" || pickerView === "opponentDeck"
              ? "Select a deck"
              : "Select a battlefield"
        }
        onClose={() => {
          // X means "back" one level deep in a picker, "cancel" at the top —
          // same button, same corner, whichever makes sense for where you are.
          if (pickerView) setPickerView(null);
          else {
            setShowNewMatch(false);
            resetForm();
          }
        }}
        ctaLabel={pickerView === null ? "Start" : undefined}
        ctaDisabled={pickerView === null ? !canStart : undefined}
        onCta={pickerView === null ? handleStartMatch : undefined}
      >
        {pickerView === null && (
          <>
            <Text style={styles.label}>Your Deck</Text>
            <Pressable
              style={[styles.selectorButton, !myDeck && styles.selectorButtonEmpty]}
              onPress={() => setPickerView("myDeck")}
            >
              <Text style={myDeck ? styles.selectorButtonTextFilled : styles.selectorButtonTextEmpty}>
                {myDeck ? deckButtonLabel(myDeck) : "Tap to choose"}
              </Text>
            </Pressable>

            <Text style={styles.label}>Opponent's Deck</Text>
            <Pressable
              style={[styles.selectorButton, !opponentDeck && styles.selectorButtonEmpty]}
              onPress={() => setPickerView("opponentDeck")}
            >
              <Text
                style={opponentDeck ? styles.selectorButtonTextFilled : styles.selectorButtonTextEmpty}
              >
                {opponentDeck ? deckButtonLabel(opponentDeck) : "Tap to choose"}
              </Text>
            </Pressable>

            <Text style={styles.label}>Your Battlefield</Text>
            <Pressable
              style={[styles.selectorButton, !myBattlefield && styles.selectorButtonEmpty]}
              onPress={() => setPickerView("myBattlefield")}
            >
              <Text
                style={myBattlefield ? styles.selectorButtonTextFilled : styles.selectorButtonTextEmpty}
              >
                {myBattlefield || "Tap to choose"}
              </Text>
            </Pressable>

            <Text style={styles.label}>Opponent's Battlefield</Text>
            <Pressable
              style={[styles.selectorButton, !opponentBattlefield && styles.selectorButtonEmpty]}
              onPress={() => setPickerView("opponentBattlefield")}
            >
              <Text
                style={
                  opponentBattlefield ? styles.selectorButtonTextFilled : styles.selectorButtonTextEmpty
                }
              >
                {opponentBattlefield || "Tap to choose"}
              </Text>
            </Pressable>

            <Text style={styles.label}>Going first</Text>
            <View style={styles.chipWrap}>
              {(["Me", "Opponent"] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setGoingFirst(p)}
                  style={[styles.bigChip, goingFirst === p && styles.deckChipActive]}
                >
                  <Text style={[styles.deckChipText, goingFirst === p && styles.deckChipTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Points to win</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setPointsToWin((v) => Math.max(1, v - 1))}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{pointsToWin}</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setPointsToWin((v) => Math.min(20, v + 1))}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Game #</Text>
            <View style={styles.chipWrap}>
              {(["G1", "G2", "G3"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGameNumber(g)}
                  style={[styles.bigChip, gameNumber === g && styles.deckChipActive]}
                >
                  <Text style={[styles.deckChipText, gameNumber === g && styles.deckChipTextActive]}>
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Picking a deck or battlefield here still selects and returns to
            the form in one tap, rather than staging + a second confirm —
            these are menus nested inside the New Match flow, not
            independent modals, and the form's own Start button is the real
            confirm step. Worth a second look if that should change too. */}
        {(pickerView === "myDeck" || pickerView === "opponentDeck") &&
          DECK_OPTIONS.map((d) => (
            <Pressable
              key={d.id}
              style={styles.deckRow}
              onPress={() => {
                if (pickerView === "myDeck") {
                  setMyDeck(d);
                  setMyBattlefield("");
                } else {
                  setOpponentDeck(d);
                  setOpponentBattlefield("");
                }
                setPickerView(null);
              }}
            >
              <Text style={styles.deckRowText}>{deckButtonLabel(d)}</Text>
            </Pressable>
          ))}

        {(pickerView === "myBattlefield" || pickerView === "opponentBattlefield") && (
          <>
            {pinnedBattlefields.map((n) => (
              <Pressable
                key={n}
                style={[styles.deckRow, styles.battlefieldRowPinned]}
                onPress={() => {
                  if (pickerView === "myBattlefield") setMyBattlefield(n);
                  else setOpponentBattlefield(n);
                  setPickerView(null);
                }}
              >
                <Text style={styles.deckRowText}>{n}</Text>
              </Pressable>
            ))}
            {restBattlefields.map((n) => (
              <Pressable
                key={n}
                style={styles.deckRow}
                onPress={() => {
                  if (pickerView === "myBattlefield") setMyBattlefield(n);
                  else setOpponentBattlefield(n);
                  setPickerView(null);
                }}
              >
                <Text style={styles.deckRowText}>{n}</Text>
              </Pressable>
            ))}
          </>
        )}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  newButton: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  newButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  emptyText: { color: theme.textDim, textAlign: "center", marginTop: 20, fontSize: 13 },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  matchTitle: { color: theme.text, fontSize: 14, fontWeight: "600" },
  matchMeta: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  deleteText: { color: theme.incorrect, fontSize: 12 },
  label: { color: theme.textDim, fontSize: 12, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  bigChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  deckChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  deckChipText: { color: theme.text, fontSize: 14, fontWeight: "600" },
  deckChipTextActive: { color: "#fff" },
  selectorButton: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorButtonEmpty: { borderStyle: "dashed", borderColor: theme.textDim },
  selectorButtonTextFilled: { color: theme.text, fontSize: 14, fontWeight: "600" },
  selectorButtonTextEmpty: { color: theme.textDim, fontSize: 14, fontStyle: "italic" },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { color: theme.text, fontSize: 22, fontWeight: "700" },
  stepperValue: { color: theme.text, fontSize: 22, fontWeight: "800", minWidth: 36, textAlign: "center" },
  deckRow: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.bg,
  },
  deckRowText: { color: theme.text, fontSize: 13, fontWeight: "600" },
  battlefieldRowPinned: { borderColor: theme.accent, borderWidth: 2 },
});
