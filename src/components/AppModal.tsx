import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from "react-native";
import { theme } from "../lib/theme";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void; // the X — always present, always enabled. Doubles as
  // "cancel" or "back" depending on context (e.g. returning from a
  // sub-picker to the screen that opened it).
  children: React.ReactNode;
  // Omit ctaLabel entirely for a pure-viewing modal with nothing to
  // select/confirm (e.g. a card image preview) — X-only in that case,
  // rather than forcing a CTA that wouldn't mean anything.
  ctaLabel?: string;
  ctaDisabled?: boolean;
  onCta?: () => void;
  scrollable?: boolean; // default true
  // Swaps the CTA to a solid destructive red (theme.incorrect) instead of
  // the default accent fill — for confirmations that actually destroy data
  // (e.g. resetting progress), where the accent's normal "go ahead, this is
  // routine" blurple would undersell what tapping it does.
  ctaDestructive?: boolean;
};

/**
 * Shared shell for every in-app modal — modeled directly on FeedbackSheet's
 * pattern: an X in the corner for close/cancel/back (never disabled, never
 * relabeled), a card inset from the screen edges (90% width, same as the
 * feedback sheet), and a single bottom CTA that's always the same accent
 * color but drops to 35% opacity and becomes non-interactive until the
 * modal's own validity condition is met — never a color swap, so the
 * button's identity stays constant and only its state changes.
 */
export default function AppModal({
  visible,
  title,
  onClose,
  children,
  ctaLabel,
  ctaDisabled,
  onCta,
  scrollable = true,
  ctaDestructive,
}: Props) {
  const Body = scrollable ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <Body
            style={scrollable ? styles.scrollBody : undefined}
            contentContainerStyle={scrollable ? styles.scrollContent : undefined}
          >
            {children}
          </Body>

          {ctaLabel && (
            <Pressable
              onPress={onCta}
              disabled={ctaDisabled}
              style={[styles.cta, ctaDestructive && styles.ctaDestructive, ctaDisabled && styles.ctaOff]}
            >
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  // 90% of the screen width, centered — same inset as the feedback sheet
  // (which is 90% of the column), so every modal in the app reads as one
  // consistent family of surfaces rather than a mix of sizes.
  card: {
    width: "90%",
    alignSelf: "center",
    maxHeight: "85%",
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { color: theme.text, fontSize: 17, fontWeight: "700", textAlign: "center", flex: 1 },
  // Past the body padding, into the card's actual corner — same placement
  // logic as FeedbackSheet's closeBtn.
  closeBtn: {
    position: "absolute",
    right: -8,
    top: -8,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: theme.textDim, fontSize: 22, fontWeight: "600" },
  scrollBody: { maxHeight: 420 },
  scrollContent: { paddingBottom: 4 },
  cta: {
    marginTop: 16,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  // Opacity dim, not a color swap — the button stays recognizable as "the
  // same button" whether it's active or waiting on a selection, exactly
  // like FeedbackSheet's sendOff.
  ctaOff: { opacity: 0.35 },
  ctaDestructive: { backgroundColor: theme.incorrect },
  ctaText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
});
