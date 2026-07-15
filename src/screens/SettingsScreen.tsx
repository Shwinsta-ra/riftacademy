import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme, DOMAIN_COLORS } from "../lib/theme";
import { getAvailableDomains, getAvailableTypes } from "../lib/quiz";
import { getAllDecks, getCardsForDeck } from "../lib/deckPool";
import { DeckList } from "../lib/types";
import { resetAllProgress } from "../lib/db";
import { useFilters } from "../lib/filtersStore";
import AppModal from "../components/AppModal";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

// Set groupings: individual set selection matters mainly once a new set
// (currently Unleashed) needs isolated practice. Everything before it is
// lumped as "Old Sets." Swap OLD_SET_IDS / LATEST_SET_IDS here when Vendetta
// becomes the new latest set.
const OLD_SET_IDS = ["OGN", "OGS", "SFD"];
const LATEST_SET_IDS = ["UNL"];
const OLD_SETS_LABEL = "Old Sets (Origins, Proving Grounds, Spiritforged)";
const LATEST_SET_LABEL = "Latest Set (Unleashed)";

// Deck names are stored as "Legend — placement (pilot)", e.g.
// "Diana, Scorn of the Moon — Hartford 2nd (bsweitz)". Splitting on the em
// dash gives a clean two-line row: legend as the title, placement/pilot as
// the subtitle. Falls back to showing the whole name as the subtitle if a
// future import doesn't follow the convention, rather than hiding it.
function splitDeckName(deck: DeckList): { title: string; subtitle: string } {
  const idx = deck.name.indexOf(" — ");
  if (idx === -1) return { title: deck.legend || deck.name, subtitle: deck.name };
  return { title: deck.legend, subtitle: deck.name.slice(idx + 3) };
}

export default function SettingsScreen(_: Props) {
  const { filters, setFilters } = useFilters();
  const domains = getAvailableDomains();
  const types = getAvailableTypes();
  const [confirming, setConfirming] = useState(false);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  // Staged selection: tapping a row in the picker highlights it but doesn't
  // apply or close anything — only the CTA button commits it to `filters`.
  const [stagedDeckId, setStagedDeckId] = useState<string | null>(null);

  const decks = getAllDecks();
  const selectedDeck = filters.deckId ? decks.find((d) => d.id === filters.deckId) ?? null : null;
  const selectedDeckCardCount = selectedDeck
    ? getCardsForDeck(selectedDeck.id)?.cards.length ?? 0
    : 0;

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function toggleSetGroup(groupIds: string[]) {
    const allPresent = groupIds.every((id) => filters.sets.includes(id));
    const withoutGroup = filters.sets.filter((id) => !groupIds.includes(id));
    setFilters({
      ...filters,
      sets: allPresent ? withoutGroup : [...withoutGroup, ...groupIds],
    });
  }

  function isGroupActive(groupIds: string[]): boolean {
    return groupIds.every((id) => filters.sets.includes(id));
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.sectionTitle}>Deck matchup</Text>
        <Text style={styles.helper}>
          Choose a specific "Best of Hartford RQ" deck instead of the full card pool.
        </Text>
        <Pressable
          style={[styles.selectorButton, !selectedDeck && styles.selectorButtonEmpty]}
          onPress={() => {
            setStagedDeckId(filters.deckId);
            setDeckPickerOpen(true);
          }}
        >
          <Text
            style={selectedDeck ? styles.selectorButtonTextFilled : styles.selectorButtonTextEmpty}
          >
            {selectedDeck
              ? `${selectedDeck.legend} · ${selectedDeckCardCount} cards`
              : "Tap to choose a deck"}
          </Text>
        </Pressable>
        {selectedDeck && (
          <Pressable
            style={styles.clearDeckLink}
            onPress={() => setFilters({ ...filters, deckId: null })}
          >
            <Text style={styles.clearDeckLinkText}>Clear deck filter</Text>
          </Pressable>
        )}

        {!filters.deckId && (
          <>
            <Text style={styles.sectionTitle}>Sets</Text>
            <Text style={styles.helper}>None selected = all sets included.</Text>
            <View style={styles.chipRow}>
              <Chip
                label={LATEST_SET_LABEL}
                active={isGroupActive(LATEST_SET_IDS)}
                onPress={() => toggleSetGroup(LATEST_SET_IDS)}
              />
              <Chip
                label={OLD_SETS_LABEL}
                active={isGroupActive(OLD_SET_IDS)}
                onPress={() => toggleSetGroup(OLD_SET_IDS)}
              />
            </View>

            <Text style={styles.sectionTitle}>Domains</Text>
            <View style={styles.chipRow}>
              {domains.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  active={filters.domains.includes(d)}
                  color={DOMAIN_COLORS[d]}
                  onPress={() =>
                    setFilters({ ...filters, domains: toggle(filters.domains, d) })
                  }
                />
              ))}
            </View>
          </>
        )}
        {filters.deckId && (
          <Text style={[styles.helper, { marginTop: 20 }]}>
            Sets and domains are hidden while testing against a deck — clear the deck filter
            above to use them again.
          </Text>
        )}

        <Text style={styles.sectionTitle}>Card types</Text>
        <View style={styles.chipRow}>
          {types.map((t) => (
            <Chip
              key={t}
              label={t}
              active={filters.types.includes(t)}
              onPress={() => setFilters({ ...filters, types: toggle(filters.types, t) })}
            />
          ))}
        </View>

        <Pressable
          style={styles.clearButton}
          onPress={() => setFilters({ sets: [], domains: [], types: [], deckId: null })}
        >
          <Text style={styles.clearButtonText}>Clear all filters</Text>
        </Pressable>

        <Pressable
          style={[styles.clearButton, { borderColor: theme.incorrect, marginTop: 32 }]}
          onPress={() => {
            if (!confirming) {
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
                      setConfirming(false);
                      Alert.alert("Done", "Progress reset.");
                    },
                  },
                ]
              );
            }
          }}
        >
          <Text style={[styles.clearButtonText, { color: theme.incorrect }]}>
            Reset progress
          </Text>
        </Pressable>
      </ScrollView>

      <AppModal
        visible={deckPickerOpen}
        title="Select a deck"
        onClose={() => setDeckPickerOpen(false)}
        ctaLabel="Choose"
        ctaDisabled={!stagedDeckId}
        onCta={() => {
          setFilters({ ...filters, deckId: stagedDeckId });
          setDeckPickerOpen(false);
        }}
      >
        {decks.map((d) => {
          const { title, subtitle } = splitDeckName(d);
          const staged = d.id === stagedDeckId;
          return (
            <Pressable
              key={d.id}
              style={[styles.deckRow, staged && styles.deckRowStaged]}
              onPress={() => setStagedDeckId(d.id)}
            >
              <Text style={styles.deckRowText}>{title}</Text>
              <Text style={styles.deckRowSubtitle}>{subtitle}</Text>
            </Pressable>
          );
        })}
      </AppModal>
    </>
  );
}

function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: color ?? theme.accent,
          borderColor: color ?? theme.accent,
        },
      ]}
    >
      <Text style={[styles.chipText, active && { color: "#fff", fontWeight: "600" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 6,
  },
  helper: { color: theme.textDim, fontSize: 12, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  chipText: { color: theme.text, fontSize: 13 },
  clearButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  clearButtonText: { color: theme.text, fontWeight: "600" },
  selectorButton: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectorButtonEmpty: { borderStyle: "dashed", borderColor: theme.textDim },
  selectorButtonTextFilled: { color: theme.text, fontSize: 14, fontWeight: "600" },
  selectorButtonTextEmpty: { color: theme.textDim, fontSize: 14, fontStyle: "italic" },
  clearDeckLink: { alignSelf: "flex-start", marginTop: 8 },
  clearDeckLinkText: { color: theme.accent, fontSize: 12, fontWeight: "600" },
  deckRow: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.bg,
  },
  // Same accent used for the CTA button, so "this is what Choose will
  // commit" reads as one consistent color language.
  deckRowStaged: { borderColor: theme.accent, borderWidth: 2 },
  deckRowText: { color: theme.text, fontSize: 14, fontWeight: "600" },
  deckRowSubtitle: { color: theme.textDim, fontSize: 12, marginTop: 2 },
});
