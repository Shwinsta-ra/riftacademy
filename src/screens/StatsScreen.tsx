import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
import { getAllCards } from "../lib/quiz";
import { loadAllProgress, resetAllProgress } from "../lib/db";
import { clearSessionSnapshot } from "../lib/sessionState";
import { MAX_BOX } from "../lib/leitner";
import { BOX_LABELS, BOX_INTERVAL_LABELS, BOX_COLORS, NEW_LABEL, NEW_COLOR } from "../lib/boxMeta";

type Props = NativeStackScreenProps<RootStackParamList, "Stats">;

export default function StatsScreen(_: Props) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [unseen, setUnseen] = useState(0);
  const [total, setTotal] = useState(0);
  const [confirming, setConfirming] = useState(false);
  // Bumped after a reset to force the focus effect's loader to re-run so the
  // bars visibly drop to zero without needing to leave and return.
  const [refreshTick, setRefreshTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const cards = getAllCards();
        const progress = await loadAllProgress();
        const boxCounts: Record<number, number> = {};
        for (let b = 1; b <= MAX_BOX; b++) boxCounts[b] = 0;
        let seenCount = 0;
        for (const c of cards) {
          const p = progress[c.id];
          if (p) {
            boxCounts[p.box] = (boxCounts[p.box] ?? 0) + 1;
            seenCount++;
          }
        }
        if (!cancelled) {
          setCounts(boxCounts);
          setUnseen(cards.length - seenCount);
          setTotal(cards.length);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshTick])
  );

  const maxCount = Math.max(unseen, ...Object.values(counts), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Progress by box</Text>
      <Text style={styles.subtitle}>{total} cards total</Text>

      <BarRow label={NEW_LABEL} sub={null} count={unseen} max={maxCount} color={NEW_COLOR} />
      {[1, 2, 3, 4, 5].map((box) => (
        <BarRow
          key={box}
          label={BOX_LABELS[box]}
          sub={`Next review in ${BOX_INTERVAL_LABELS[box]}`}
          count={counts[box] ?? 0}
          max={maxCount}
          color={BOX_COLORS[box]}
        />
      ))}

      <Text style={styles.note}>
        Cards move up a box on a correct answer and reset to Missed on a miss.
        Higher boxes wait longer before resurfacing, so time goes to the cards
        you actually don't know yet.
      </Text>

      <Pressable
        style={styles.resetButton}
        onPress={() => {
          if (confirming) return;
          setConfirming(true);
          Alert.alert(
            "Reset all progress?",
            "This clears every card's Leitner box back to new. This can't be undone.",
            [
              { text: "Cancel", style: "cancel", onPress: () => setConfirming(false) },
              {
                text: "Reset",
                style: "destructive",
                onPress: async () => {
                  await resetAllProgress();
                  clearSessionSnapshot();
                  setConfirming(false);
                  setRefreshTick((t) => t + 1);
                  Alert.alert("Done", "Progress reset.");
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.resetButtonText}>Reset progress</Text>
      </Pressable>
    </ScrollView>
  );
}

function BarRow({
  label,
  sub,
  count,
  max,
  color,
}: {
  label: string;
  sub: string | null;
  count: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(4, (count / max) * 100);
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        {sub && <Text style={styles.barSub}>{sub}</Text>}
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 22, fontWeight: "700", color: theme.text },
  subtitle: { fontSize: 13, color: theme.textDim, marginBottom: 20 },
  barRow: { marginBottom: 14 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { color: theme.text, fontSize: 13, fontWeight: "600" },
  barSub: { color: theme.textDim, fontSize: 11 },
  barTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.card,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 7 },
  barCount: { color: theme.textDim, fontSize: 11, marginTop: 2 },
  note: { color: theme.textDim, fontSize: 12, lineHeight: 17, marginTop: 20 },
  resetButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.incorrect,
  },
  resetButtonText: { color: theme.incorrect, fontWeight: "600" },
});
