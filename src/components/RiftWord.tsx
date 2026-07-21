import React from "react";
import { Text } from "react-native";
import { RIFT_BRAND, GLOW } from "../lib/theme";

/** Renders "Rift" in the shared brand color followed by `suffix` in normal
 *  text color -- e.g. RiftWord("Academy") -> RiftAcademy, RiftWord("Recall")
 *  -> RiftRecall. Centralized here (previously local to HomeScreen) so every
 *  "Rift___" label across the app stays visually consistent without
 *  repeating the split at each call site. See RIFT_BRAND in lib/theme.ts for
 *  why "Rift" (not the suffix) is the part that's colored. */
export default function RiftWord({ suffix, style }: { suffix: string; style: object }) {
  return (
    <Text style={style}>
      <Text style={[{ color: RIFT_BRAND }, GLOW.wordmark]}>Rift</Text>
      {suffix}
    </Text>
  );
}
