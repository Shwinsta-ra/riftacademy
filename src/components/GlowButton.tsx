import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { GLOW, theme } from "../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Corner radius, applied to both the glow wrapper and the clipped body. */
  radius?: number;
  /** Outer-wrapper style — margins, width, alignSelf. Carries the glow. */
  style?: StyleProp<ViewStyle>;
  /** Inner body style — padding / minHeight. */
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Primary call-to-action with the "Rune Glow" treatment: a blurple radial
 * gradient fill (light top-left → deep), an ambient blurple glow (GLOW.cta),
 * a faint white rim, and a motion-only press response (scale to 0.97 — mobile
 * has no hover, so press feedback is purely kinetic).
 *
 * Used for the genuine primary actions only (Review Cards, New Match, Next
 * card, Back to home). Answer options keep their existing green/red
 * correct/incorrect semantics and are deliberately NOT built on this — a glow
 * must never be the thing that encodes state.
 *
 * The glow lives on an outer wrapper (never clipped, so it can bleed past the
 * edge — `overflow: hidden` on the same view would clip the shadow on iOS). The
 * gradient is an SVG layer inside the clipped body. Layout margins go via
 * `style` (outer); padding via `contentStyle` (inner).
 */
export default function GlowButton({
  label,
  onPress,
  disabled,
  radius = 14,
  style,
  contentStyle,
  textStyle,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <View style={[{ borderRadius: radius }, style, !disabled && GLOW.cta]}>
      <Animated.View style={{ transform: [{ scale }], borderRadius: radius }}>
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={disabled}
          style={[styles.body, { borderRadius: radius }, contentStyle]}
        >
          <Svg
            style={StyleSheet.absoluteFill}
            width="100%"
            height="100%"
            pointerEvents="none"
          >
            <Defs>
              <RadialGradient id="ctaFill" cx="0.2" cy="0" rx="1.2" ry="1.2">
                <Stop offset="0" stopColor={theme.accentLight} />
                <Stop offset="1" stopColor={theme.accentDeep} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#ctaFill)" />
          </Svg>
          <Text style={[styles.label, textStyle]}>{label}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    // Fallback fill if the SVG layer fails to paint, so the button is never a
    // transparent hole.
    backgroundColor: theme.accent,
  },
  label: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
