import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { RIFT_BRAND, theme } from "../lib/theme";

const AnimatedG = Animated.createAnimatedComponent(G);

// Overshoot curve from the spec (cubic-bezier(.34,1.56,.64,1)) — stands in for a
// native spring since we don't have Reanimated's withSpring.
const OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);

// Spark particles: radiate from the chest/head, each to its own endpoint.
// Colors per spec: gold + accentLight + white.
const PARTICLES = [
  { dx: -46, dy: -30, color: RIFT_BRAND },
  { dx: 44, dy: -26, color: theme.accentLight },
  { dx: -30, dy: -54, color: "#ffffff" },
  { dx: 34, dy: -52, color: RIFT_BRAND },
  { dx: 0, dy: -64, color: theme.accentLight },
];

type Props = {
  /**
   * Increment this each time a correct answer is submitted. The reaction plays
   * on every change (except the initial 0), so rapid streaks re-fire cleanly
   * from a fresh state rather than stacking.
   */
  playKey: number;
  /** Diameter-ish size of the mascot in px. */
  size?: number;
};

/**
 * Sparklet — the correct-answer delight mascot. Plays a ~800ms concurrent
 * reaction (hop + cap nod + eureka sparkle + spark particles + "Correct!"
 * toast) and then fades out. It is a decorative, pointer-transparent overlay:
 * it never blocks advancing to the next question, and it encodes no state on
 * its own (the AnswerButton's green/red result is the real, announced cue).
 *
 * Motion library: React Native's built-in Animated (we have no Reanimated).
 * Transforms/opacity run on the native driver; the cap rotation runs through
 * react-native-svg's AnimatedG (JS-driven, since SVG props can't use the native
 * driver) so it can pivot exactly at the cap base.
 *
 * Reduced motion: when the OS reduce-motion setting is on, the hop/rotate/spark
 * animations are skipped — the static pose plus the "Correct!" toast still
 * appear and fade, per the spec's edge cases.
 *
 * Positioning: rendered via QuizCardArt's `decoration` slot, which places it
 * on the card's own unclipped outer container (position: relative, overflow:
 * visible) — so `styles.overlay` below is anchored to the CARD's box, not
 * the whole screen. Pinned to the bottom-right corner (peeking slightly past
 * both edges), rather than centered over the card (which used to overlap
 * the caption/prompt/answers below it).
 *
 * Deliberately anchored from `bottom`/`right` with fixed offsets, NOT a
 * `top: '70%'`-style percentage of container height: QuizCardArt's
 * container aspect ratio varies by card orientation (portrait for most
 * cards, landscape for Battlefields — see BATTLEFIELD_ASPECT_RATIO in
 * QuizScreen.tsx), so a percentage-of-height anchor that looks right on a
 * tall portrait card overshoots well past the bottom of a short landscape
 * one. Anchoring from the corner with fixed pixel offsets keeps the mascot
 * pinned to the actual card edge regardless of the container's aspect
 * ratio.
 */
export default function Sparklet({ playKey, size = 120 }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

  // Body hop + squash/stretch (native).
  const body = useRef(new Animated.Value(0)).current;
  // Cap nod (JS-driven, via AnimatedG).
  const cap = useRef(new Animated.Value(0)).current;
  // Eureka sparkle + spark particles (native).
  const spark = useRef(new Animated.Value(0)).current;
  // "Correct!" toast (native).
  const toast = useRef(new Animated.Value(0)).current;
  // Whole-overlay visibility (native).
  const shown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) =>
      setReduceMotion(v)
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    // Don't fire on first mount — only on real correct answers.
    if (playKey === 0) return;

    AccessibilityInfo.announceForAccessibility("Correct!");

    // Reset every channel so a streak restarts cleanly instead of stacking.
    [body, cap, spark, toast, shown].forEach((v) => {
      v.stopAnimation();
      v.setValue(0);
    });

    // Overlay: quick fade in, hold, fade out (~900ms total).
    Animated.sequence([
      Animated.timing(shown, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.delay(560),
      Animated.timing(shown, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Toast fade/slide — runs in both normal and reduced-motion modes.
    Animated.timing(toast, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    if (reduceMotion) return; // static pose + toast only

    Animated.timing(body, {
      toValue: 1,
      duration: 700,
      easing: OVERSHOOT,
      useNativeDriver: true,
    }).start();
    Animated.timing(cap, {
      toValue: 1,
      duration: 700,
      easing: OVERSHOOT,
      useNativeDriver: false, // SVG prop — can't be native-driven
    }).start();
    Animated.timing(spark, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  // --- interpolations ---
  const translateY = body.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -30, 0],
  });
  const scaleX = body.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [1, 1.05, 0.97, 1],
  });
  const scaleY = body.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [1, 0.95, 1.05, 1],
  });
  const capRotation = cap.interpolate({
    inputRange: [0, 0.15, 0.5, 0.8, 1],
    outputRange: [0, -14, 8, -4, 0],
  });
  const sparkOpacity = spark.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 0],
  });
  const sparkTranslateY = spark.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [6, -10, -22],
  });
  const sparkScale = spark.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1.15, 0.7],
  });
  const sparkRotate = spark.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-8deg", "6deg", "-3deg"],
  });
  const toastOpacity = toast.interpolate({
    inputRange: [0, 0.25, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });
  const toastTranslateY = toast.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [8, 0, -6],
  });

  const height = size * (150 / 140);

  return (
    <View style={[styles.overlay, { width: size }]} pointerEvents="none">
      <Animated.View style={[styles.stack, { opacity: shown }]}>
        {/* "Correct!" toast, above the mascot */}
        <Animated.View
          style={[
            styles.toast,
            { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] },
          ]}
        >
          <Text style={styles.toastText}>Correct!</Text>
        </Animated.View>

        {/* Eureka sparkle */}
        <Animated.Text
          style={[
            styles.eureka,
            {
              opacity: sparkOpacity,
              transform: [
                { translateY: sparkTranslateY },
                { scale: sparkScale },
                { rotate: sparkRotate },
              ],
            },
          ]}
        >
          ✦
        </Animated.Text>

        {/* Spark particles */}
        <View style={styles.particleAnchor} pointerEvents="none">
          {PARTICLES.map((p, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  backgroundColor: p.color,
                  opacity: spark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [
                    {
                      translateX: spark.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, p.dx],
                      }),
                    },
                    {
                      translateY: spark.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, p.dy],
                      }),
                    },
                    {
                      scale: spark.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.3],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        {/* Mascot */}
        <Animated.View
          style={{
            transform: [{ translateY }, { scaleX }, { scaleY }],
          }}
        >
          <Svg width={size} height={height} viewBox="0 0 140 150">
            <Defs>
              <LinearGradient id="sparkletBody" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={theme.accentLight} />
                <Stop offset="1" stopColor={theme.accentDeep} />
              </LinearGradient>
            </Defs>

            {/* shadow */}
            <Ellipse cx="70" cy="130" rx="30" ry="6" fill="rgba(0,0,0,.35)" />
            {/* body */}
            <Path
              d="M70 40 C40 40 24 63 26 88 C28 112 46 121 70 121 C94 121 112 112 114 88 C116 63 100 40 70 40 Z"
              fill="url(#sparkletBody)"
            />
            {/* left arm */}
            <Path
              d="M32 90 Q16 96 20 110"
              stroke={theme.accentDeep}
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
            />
            {/* right arm (holding scroll) */}
            <Path
              d="M108 90 Q126 94 126 106"
              stroke={theme.accentDeep}
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
            />
            {/* scroll */}
            <Ellipse cx="126" cy="76" rx="8" ry="4" fill="#e9dcc0" stroke="#c8b587" strokeWidth="1" />
            <Ellipse cx="126" cy="112" rx="8" ry="4" fill="#e9dcc0" stroke="#c8b587" strokeWidth="1" />
            <Rect x="118" y="76" width="16" height="36" rx="3" fill="#f1e6c9" />
            <Line x1="121" y1="86" x2="131" y2="86" stroke="#b7a06b" strokeWidth="1.5" />
            <Line x1="121" y1="94" x2="131" y2="94" stroke="#b7a06b" strokeWidth="1.5" />
            <Line x1="121" y1="102" x2="131" y2="102" stroke="#b7a06b" strokeWidth="1.5" />
            {/* face */}
            <Circle cx="56" cy="82" r="7" fill="#14141a" />
            <Circle cx="84" cy="82" r="7" fill="#14141a" />
            <Circle cx="58" cy="80" r="2.3" fill="#fff" />
            <Circle cx="86" cy="80" r="2.3" fill="#fff" />
            <Path
              d="M58 100 Q70 108 82 100"
              stroke="#14141a"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* graduation cap — rotates for the nod, pivoting at its base */}
            <AnimatedG rotation={capRotation} originX={70} originY={44}>
              <Ellipse cx="70" cy="38" rx="25" ry="10" fill="#1c1c26" stroke="#0d0d12" strokeWidth="1.5" />
              <Path d="M70 2 L118 22 L70 44 L22 22 Z" fill="#232331" stroke="#0d0d12" strokeWidth="1.5" />
              {/* button + tassel — gold brand accent (approved extension) */}
              <Circle cx="70" cy="22" r="4" fill={RIFT_BRAND} />
              <Path d="M112 23 L112 42" stroke={RIFT_BRAND} strokeWidth="2.5" strokeLinecap="round" />
              <Circle cx="112" cy="45" r="4.5" fill={RIFT_BRAND} />
            </AnimatedG>
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bottom-right corner, peeking slightly past both edges -- fixed pixel
  // offsets rather than a percentage of container height, so it holds up
  // for both portrait and landscape (Battlefield) cards. Not centered over
  // the card, which used to overlap the caption/prompt/answers below it.
  overlay: {
    position: "absolute",
    bottom: -8,
    right: -10,
    alignItems: "center",
  },
  stack: { alignItems: "center", justifyContent: "center" },
  toast: {
    backgroundColor: "rgba(20,20,26,0.92)",
    borderColor: theme.correct,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 4,
  },
  toastText: { color: theme.correct, fontSize: 14, fontWeight: "800" },
  eureka: {
    color: RIFT_BRAND,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: -6,
  },
  particleAnchor: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
  },
  particle: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
