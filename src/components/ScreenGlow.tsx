import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { GLOW_AMBIENT } from "../lib/theme";

/**
 * Ambient "Rune Glow" wash — a soft blurple radial glow anchored just above the
 * visible viewport that fades out by ~60% down the screen. Drop it in as the
 * first child of a screen's root View so it sits behind all content:
 *
 *   <View style={styles.screen}>
 *     <ScreenGlow />
 *     ... screen content ...
 *   </View>
 *
 * It is purely decorative: `pointerEvents="none"` so it never intercepts taps,
 * and it renders no state — a glow effect must never be the only cue for
 * anything (see the accessibility notes in the visual-direction spec).
 *
 * The gradient is drawn with a fixed 100x100 viewBox stretched to fill
 * (`preserveAspectRatio="none"`) so the anchor point is deterministic on every
 * screen size without needing an onLayout measurement pass.
 */
export default function ScreenGlow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient
            id="screenGlow"
            cx="50"
            cy="-10"
            rx="55"
            ry="45"
            gradientUnits="userSpaceOnUse"
          >
            <Stop
              offset="0"
              stopColor={GLOW_AMBIENT.color}
              stopOpacity={GLOW_AMBIENT.innerOpacity}
            />
            <Stop
              offset={GLOW_AMBIENT.outerStop}
              stopColor={GLOW_AMBIENT.color}
              stopOpacity={0}
            />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#screenGlow)" />
      </Svg>
    </View>
  );
}
