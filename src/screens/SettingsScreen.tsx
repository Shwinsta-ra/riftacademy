import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme, DOMAIN_COLORS } from "../lib/theme";
import { getAvailableDomains, getAvailableTypes, getAvailableSpeeds } from "../lib/quiz";
import { getAllDecks, getCardsForDeck } from "../lib/deckPool";
import { DeckList, QuizFilters } from "../lib/types";
import { useFilters } from "../lib/filtersStore";
import AppModal from "../components/AppModal";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

// Four set groups, matching how Ashwin actually wants to practice by set —
// Origins and Proving Grounds are small/old enough to always study together.
// Swap this list once a set after Vendetta needs its own group.
const SET_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Origins & Proving Grounds", ids: ["OGN", "OGS"] },
  { label: "Spiritforged", ids: ["SFD"] },
  { label: "Unleashed", ids: ["UNL"] },
  { label: "Vendetta", ids: ["VEN"] },
];

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

export default function SettingsScreen({ navigation }: Props) {
  const { filters, setFilters } = useFilters();
  const domains = getAvailableDomains();
  const types = getAvailableTypes();
  const speeds = getAvailableSpeeds();
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  // Staged selection: tapping a row in the deck picker highlights it but
  // doesn't apply or close anything — only the picker's CTA commits it.
  const [stagedDeckId, setStagedDeckId] = useState<string | null>(null);

  // All filter edits are STAGED locally and only committed to the shared
  // store when the user taps "Set filters" at the bottom — a deliberate
  // accept step, rather than the old behavior where every chip tap applied
  // live and "Back" was the only (implicit) way to accept. `staged` seeds
  // from the current live filters each time the screen mounts.
  const [staged, setStaged] = useState<QuizFilters>(filters);
  const dirty = JSON.stringify(staged) !== JSON.stringify(filters);

  // Auto-scroll the page to the bottom the first time the user makes a
  // selection, so the "Set filters" / "Clear all filters" buttons come into
  // view without the user having to hunt for them. Fires only on the
  // false -> true transition of `dirty` (the first change), not on every
  // subsequent tap.
  const scrollRef = useRef<ScrollView>(null);
  const wasDirty = useRef(false);
  useEffect(() => {
    if (dirty && !wasDirty.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
    wasDirty.current = dirty;
  }, [dirty]);

  const decks = getAllDecks();
  const selectedDeck = staged.deckId ? decks.find((d) => d.id === staged.deckId) ?? null : null;
  const selectedDeckCardCount = selectedDeck
    ? getCardsForDeck(selectedDeck.id)?.cards.length ?? 0
    : 0;

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function toggleSetGroup(groupIds: string[]) {
    const allPresent = groupIds.every((id) => staged.sets.includes(id));
    const withoutGroup = staged.sets.filter((id) => !groupIds.includes(id));
    setStaged({
      ...staged,
      sets: allPresent ? withoutGroup : [...withoutGroup, ...groupIds],
    });
  }

  function isGroupActive(groupIds: string[]): boolean {
    return groupIds.every((id) => staged.sets.includes(id));
  }

  function commitFilters() {
    setFilters(staged);
    navigation.goBack();
  }

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text style={styles.sectionTitle}>Deck matchup</Text>
        <Text style={styles.helper}>
          Choose a specific "Best of Hartford RQ" deck instead of the full card pool.
        </Text>
        <Pressable
          style={[styles.selectorButton, !selectedDeck && styles.selectorButtonEmpty]}
          onPress={() => {
            setStagedDeckId(staged.deckId);
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
            onPress={() => setStaged({ ...staged, deckId: null })}
          >
            <Text style={styles.clearDeckLinkText}>Clear deck filter</Text>
          </Pressable>
        )}

        {!staged.deckId && (
          <>
            <Text style={styles.sectionTitle}>Sets</Text>
            <Text style={styles.helper}>None selected = all sets included.</Text>
            <View style={styles.chipRow}>
              {SET_GROUPS.map((group) => (
                <Chip
                  key={group.label}
                  label={group.label}
                  active={isGroupActive(group.ids)}
                  onPress={() => toggleSetGroup(group.ids)}
                />
              ))}
            </View>

            <Text style={styles.sectionTitle}>Domains</Text>
            <View style={styles.chipRow}>
              {domains.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  active={staged.domains.includes(d)}
                  color={DOMAIN_COLORS[d]}
                  onPress={() =>
                    setStaged({ ...staged, domains: toggle(staged.domains, d) })
                  }
                />
              ))}
            </View>
          </>
        )}
        {staged.deckId && (
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
              active={staged.types.includes(t)}
              onPress={() => setStaged({ ...staged, types: toggle(staged.types, t) })}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Speed</Text>
        <View style={styles.chipRow}>
          {speeds.map((s) => (
            <Chip
              key={s}
              label={s}
              active={staged.speeds.includes(s)}
              onPress={() => setStaged({ ...staged, speeds: toggle(staged.speeds, s) })}
            />
          ))}
        </View>

        <Pressable
          style={[styles.setFiltersButton, !dirty && styles.setFiltersButtonInactive]}
          onPress={commitFilters}
          disabled={!dirty}
        >
          <Text
            style={[styles.setFiltersButtonText, !dirty && styles.setFiltersButtonTextInactive]}
          >
            Set filters
          </Text>
        </Pressable>

        <Pressable
          style={styles.clearButton}
          onPress={() => setStaged({ sets: [], domains: [], types: [], speeds: [], deckId: null })}
        >
          <Text style={styles.clearButtonText}>Clear all filters</Text>
        </Pressable>
      </ScrollView>

      <AppModal
        visible={deckPickerOpen}
        title="Select a deck"
        onClose={() => setDeckPickerOpen(false)}
        ctaLabel="Choose"
        ctaDisabled={!stagedDeckId}
        onCta={() => {
          setStaged({ ...staged, deckId: stagedDeckId });
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
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  clearButtonText: { color: theme.text, fontWeight: "600" },
  // Primary accept CTA, now placed ABOVE "Clear all filters". Always reads
  // "Set filters"; it's the filled accent when there are pending changes and
  // a muted/greyed disabled state before the user has changed anything.
  // Not the reserved REQUIRED magenta — that stays for required-field use.
  setFiltersButton: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: theme.accent,
  },
  setFiltersButtonInactive: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  setFiltersButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  setFiltersButtonTextInactive: { color: theme.textDim },
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
