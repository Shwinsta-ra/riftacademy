import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme, RIFT_BRAND, GLOW } from "../lib/theme";
import ScreenGlow from "../components/ScreenGlow";
import GlowButton from "../components/GlowButton";
import RiftWord from "../components/RiftWord";
import { getAllCards, getFilteredCards } from "../lib/quiz";
import { loadAllProgress, getLastBatchCompletedAt } from "../lib/db";
import { loadSessionSnapshot } from "../lib/sessionState";
import { buildBatch, BATCH_SIZE, BATCH_COOLDOWN_MIN } from "../lib/leitner";
import { useFilters } from "../lib/filtersStore";
import { useTutorialTarget, useTutorial } from "../lib/tutorialContext";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

// App version + changelog shown in the "What's new" box below. Plain
// placeholder content for now -- update these two whenever a real release
// process/version number exists. Each entry starting with a star renders in
// green to flag it as a highlighted/new-feature item; a plain entry (no
// star) renders in the same italic style but without the highlight.
const APP_VERSION = "v1.4";
const WHATS_NEW: string[] = [
  "\u2605 RiftRecall: smarter question variety across every card type",
  "\u2605 Vendetta set added to the card pool",
  "Session reviews now capped for better retention pacing",
];

const LEGAL_TEXT =
  "RiftAcademy is an unofficial fan project for Riftbound: League of Legends Trading Card Game. " +
  "It uses Riot Games-owned IP under Riot Games\u2019 \u201cLegal Jibber Jabber\u201d policy. Riot Games " +
  "does not endorse or sponsor this project.";

function FeatureBox({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.featureBox, highlight && styles.featureBoxHighlight]}>{children}</View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { filters } = useFilters();
  const [total, setTotal] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const { completeStepIfActive, currentStep } = useTutorial();
  const setFiltersTarget = useTutorialTarget("setFiltersButton");
  const reviewCardsTarget = useTutorialTarget("reviewCardsButton");

  useFocusEffect(
    useCallback(() => {
      setTotal(getAllCards().length);

      (async () => {
        const filteredCards = getFilteredCards(filters);
        const ids = filteredCards.map((c) => c.id);
        const progress = await loadAllProgress();
        const now = Date.now();

        // Mirrors QuizScreen's own precedence so the number shown here
        // matches what tapping "Review Cards" is about to do: resume an
        // in-progress batch first, then respect the pacing gate, then a
        // fresh batch. This is a preview for display only -- QuizScreen
        // recomputes precisely (including the newly-due merge) the moment
        // it actually loads, so slight staleness here is harmless.
        const snapshot = loadSessionSnapshot(filters);
        if (snapshot && snapshot.queue.length > 0) {
          setReviewCount(snapshot.queue.length);
          return;
        }

        const lastCompleted = await getLastBatchCompletedAt();
        const gateUntil = lastCompleted ? lastCompleted + BATCH_COOLDOWN_MIN * 60_000 : null;
        if (gateUntil && now < gateUntil) {
          setReviewCount(0);
          return;
        }

        const freshBatch = buildBatch(ids, progress, now, BATCH_SIZE);
        setReviewCount(freshBatch.length);
      })();
    }, [filters])
  );

  const reviewLabel = reviewCount > 0 ? `Review Cards (${reviewCount})` : "Review Cards";

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
        <RiftWord suffix="Academy" style={styles.title} />
        <Text style={styles.tagline}>Master the Rift.</Text>

        <FeatureBox highlight>
          <View style={styles.boxHeaderRow}>
            <View style={styles.boxHeaderLeft}>
              <RiftWord suffix="Recall" style={styles.boxLabel} />
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{"\u2605"} NEW</Text>
              </View>
            </View>
            <Text style={styles.cardCountText}>{total} total cards</Text>
          </View>
          <Text style={styles.purposeText}>
            Use spaced repetition and micro-learning to build lasting card awareness.
          </Text>
          <View
            ref={reviewCardsTarget.ref}
            onLayout={reviewCardsTarget.onLayout}
            style={[
              styles.bigButtonWrap,
              currentStep?.id === "reviewCardsButton" && styles.tutorialTargetActive,
            ]}
          >
            <GlowButton
              label={reviewLabel}
              onPress={() => {
                completeStepIfActive("reviewCardsButton");
                navigation.navigate("Quiz");
              }}
              contentStyle={styles.bigButtonBody}
              textStyle={styles.bigButtonText}
            />
          </View>
          <View style={styles.halfRow}>
            <Pressable
              ref={setFiltersTarget.ref}
              onLayout={setFiltersTarget.onLayout}
              style={[
                styles.secondaryButton,
                styles.halfButton,
                currentStep?.id === "setFiltersButton" && styles.tutorialTargetActive,
              ]}
              onPress={() => {
                completeStepIfActive("setFiltersButton");
                navigation.navigate("Settings");
              }}
            >
              <Text style={styles.secondaryButtonText}>Set filters</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.halfButton]}
              onPress={() => navigation.navigate("Stats")}
            >
              <Text style={styles.secondaryButtonText}>See progress</Text>
            </Pressable>
          </View>
        </FeatureBox>

        <FeatureBox>
          <RiftWord suffix="IQ" style={styles.boxLabel} />
          <Text style={styles.iqSubtitle}>Match analysis & strategy puzzles</Text>
          <GlowButton
            label="New Match"
            onPress={() => navigation.navigate("MatchList")}
            style={styles.bigButtonWrap}
            contentStyle={styles.bigButtonBody}
            textStyle={styles.bigButtonText}
          />
          <Pressable style={styles.disabledButton} disabled>
            <Text style={styles.disabledButtonText}>Daily Puzzle (coming soon)</Text>
          </Pressable>
        </FeatureBox>

        <FeatureBox>
          <Text style={styles.whatsNewTitle}>What's new ({APP_VERSION})</Text>
          {WHATS_NEW.map((line, i) => {
            const isHighlighted = line.trim().startsWith("\u2605");
            return (
              <Text
                key={i}
                style={[styles.whatsNewLine, isHighlighted && styles.whatsNewLineHighlight]}
              >
                {line}
              </Text>
            );
          })}
        </FeatureBox>

        {/* Reverted from a fixed footer back to normal scrollable content
            (per Ashwin, July 19 evening) -- it should not be pinned or cover
            other UI elements, just reachable by scrolling like anything
            else. */}
        <Text style={styles.legalText}>{LEGAL_TEXT}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "700", color: theme.text, marginBottom: 2 },
  tagline: { fontSize: 15, fontWeight: "700", color: "#bec1d6", marginBottom: 20 },
  featureBox: {
    borderWidth: 1,
    borderColor: "rgba(88,101,242,0.25)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    // Rune Glow: translucent surface + faint ambient blurple glow.
    backgroundColor: "rgba(31,31,40,0.75)",
    ...GLOW.feature,
  },
  featureBoxHighlight: { borderColor: RIFT_BRAND },
  boxHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  boxHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  boxLabel: { fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 10 },
  newBadge: {
    backgroundColor: theme.correct,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  newBadgeText: { color: "#04220c", fontSize: 10, fontWeight: "800" },
  cardCountText: { color: theme.textDim, fontSize: 12, fontWeight: "700" },
  purposeText: { color: "#c7c7d2", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  iqSubtitle: { color: "#c7c7d2", fontSize: 13, marginBottom: 12 },
  bigButtonWrap: { marginBottom: 12 },
  bigButtonBody: { paddingVertical: 18 },
  // Tutorial highlight: applied directly to the target element's own style
  // (not a separately-measured overlay) so it can never mismatch the
  // element's actual bounds or rounded corners. borderRadius matches both
  // GlowButton's default radius and secondaryButton's own radius (both 14).
  // Uses theme.text (near-white), not theme.accent -- Review Cards/GlowButton
  // and the "Set filters" CTA (once dirty) are already filled with
  // theme.accent, so an accent-colored border on top of an accent-colored
  // fill would be invisible.
  tutorialTargetActive: { borderColor: theme.text, borderWidth: 2, borderRadius: 14 },
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
  whatsNewTitle: {
    color: theme.textDim,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  whatsNewLine: {
    color: "#c7c7d2",
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
    marginBottom: 8,
  },
  whatsNewLineHighlight: { color: theme.correct },
  legalText: {
    textAlign: "center",
    color: "#6e6e7a",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
});
