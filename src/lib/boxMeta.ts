export const BOX_LABELS: Record<number, string> = {
  1: "Missed",
  2: "Learned",
  3: "Recalled",
  4: "Validated",
  5: "Mastered",
};

export const BOX_INTERVAL_LABELS: Record<number, string> = {
  1: "30 minutes",
  2: "1 day",
  3: "3 days",
  4: "7 days",
  5: "14 days",
};

// Follows Riftbound's own rarity-tier color logic for boxes 2-5
// (grey/Common, light blue/Rare, purple/Epic, gold/Mastered-Ultimate),
// with red reserved for Missed since it isn't a real rarity tier.
export const BOX_COLORS: Record<number, string> = {
  1: "#CC2929", // Missed — red
  2: "#8A8A93", // Learned — grey
  3: "#4FC3F7", // Recalled — light blue
  4: "#8629B3", // Validated — purple
  5: "#D4AF37", // Mastered — gold
};

export const NEW_LABEL = "New";
export const NEW_COLOR = "#4a4a58";
