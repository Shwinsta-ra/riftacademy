import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
import { getAllCards } from "../lib/quiz";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function FeatureBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.featureBox}>
      <Text style={styles.featureBoxLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const [total, setTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setTotal(getAllCards().length);
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>RiftAcademy</Text>

      <FeatureBox label="Card Recall">
        <Pressable
          style={[styles.bigButton, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate("Quiz")}
        >
          <Text style={styles.bigButtonText}>Review Cards</Text>
        </Pressable>
        <View style={styles.halfRow}>
          <Pressable
            style={[styles.secondaryButton, styles.halfButton]}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.secondaryButtonText}>Set Filters</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, styles.halfButton]}
            onPress={() => navigation.navigate("Stats")}
          >
            <Text style={styles.secondaryButtonText}>See Progress</Text>
          </Pressable>
        </View>
      </FeatureBox>

      <FeatureBox label="Match Analysis">
        <Pressable
          style={[styles.bigButton, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate("MatchList")}
        >
          <Text style={styles.bigButtonText}>New Match</Text>
        </Pressable>
        <Pressable style={styles.disabledButton} disabled>
          <Text style={styles.disabledButtonText}>Match Log Analyzer (coming soon)</Text>
        </Pressable>
      </FeatureBox>

      <FeatureBox label="Puzzles">
        <Pressable style={styles.disabledButton} disabled>
          <Text style={styles.disabledButtonText}>Daily Puzzle (coming soon)</Text>
        </Pressable>
      </FeatureBox>

      <Text style={styles.footNote}>{total} cards total</Text>
      <Text style={styles.legalNote}>
        RiftAcademy was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by
        Riot Games. Riot Games does not endorse or sponsor this project.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 28, fontWeight: "700", color: theme.text, marginBottom: 20 },
  featureBox: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  featureBoxLabel: {
    color: theme.textDim,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bigButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  bigButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  halfRow: { flexDirection: "row", gap: 10 },
  halfButton: { flex: 1, marginBottom: 0 },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryButtonText: { color: theme.text, fontSize: 15, fontWeight: "500" },
  disabledButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#1c1c22",
    borderWidth: 1,
    borderColor: theme.border,
  },
  disabledButtonText: { color: theme.textDim, fontSize: 14, fontWeight: "500" },
  footNote: { textAlign: "center", color: theme.textDim, fontSize: 12, marginTop: 8 },
  legalNote: {
    textAlign: "center",
    color: theme.textDim,
    fontSize: 10,
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 14,
    paddingHorizontal: 12,
  },
});
