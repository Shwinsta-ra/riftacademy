import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTutorial } from "../lib/tutorialContext";
import { theme } from "../lib/theme";

const GAP = 14;
// A step transition can coincide with the target's screen re-measuring
// itself (e.g. SettingsScreen's newest-set-chip tap both advances the step
// AND kicks off an auto-scroll to reveal "Set Filters" -- see that screen's
// re-measure-after-scroll effect). Rendering the bubble the instant a
// targetRect first arrives can catch the PRE-scroll position, then visibly
// snap to the corrected one a moment later. Holding the bubble hidden for
// this long after a step change gives any in-flight re-measure time to
// land first, so it only ever appears already in the right place.
const STEP_SETTLE_MS = 500;

type ContainerRect = { x: number; y: number; width: number; height: number };

/** Renders the speech-bubble "cloud" (with a small triangular arrow pointing
 *  at the active tutorial step's target) near wherever that target is.
 *  Mounted once at the app root (same pattern as FeedbackOverlay) so it can
 *  render on top of whichever screen is currently active — screens don't
 *  render their own copy of this. Renders nothing when the tutorial isn't
 *  running or hasn't measured a target yet.
 *
 *  Does NOT draw a highlight ring — each screen that owns a tutorial target
 *  applies a conditional border directly to that element instead (see
 *  HomeScreen/SettingsScreen), since a separately-measured overlay rectangle
 *  can never be guaranteed to match the target's actual rounded corners,
 *  padding, and exact bounds — the target already knows its own bounds
 *  perfectly, by definition. This removes an entire class of "ring doesn't
 *  match the button" bugs; the bubble's positioning is a smaller, more
 *  tractable problem than ring+bubble both needing to agree.
 *
 *  `targetRect` (from useTutorialTarget) is window-relative, via
 *  measureInWindow. On web, App.tsx's webWrapper centers a max-480px column
 *  with side margins on any viewport wider than that, so this component's
 *  own absoluteFill container does NOT start at the window's left edge —
 *  positioning directly off targetRect would double-apply that margin. This
 *  container measures its own window-relative rect (also via
 *  measureInWindow, triggered from onLayout so the ref is guaranteed
 *  attached) and every position below is expressed relative to THAT rect,
 *  not raw window/Dimensions values — correct on any viewport width,
 *  centered column or not. */
export function TutorialCallout() {
  const { currentStep, targetRect, skip } = useTutorial();
  const containerRef = useRef<View>(null);
  const [containerRect, setContainerRect] = useState<ContainerRect | null>(null);

  const measureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      setContainerRect({ x, y, width, height });
    });
  }, []);

  // Resets to false on every step change (including the very first step),
  // then flips true after STEP_SETTLE_MS -- see the constant's comment for
  // why. A fresh timer per step id, cleared on the next change/unmount.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!currentStep) return;
    const id = setTimeout(() => setSettled(true), STEP_SETTLE_MS);
    return () => clearTimeout(id);
  }, [currentStep?.id]);

  const ready = currentStep && targetRect && containerRect && settled;

  let content: React.ReactNode = null;
  if (ready) {
    // Target position translated into this container's own coordinate
    // space — see the note above for why raw targetRect can't be used
    // as-is.
    const localX = targetRect.x - containerRect.x;
    const localY = targetRect.y - containerRect.y;
    const containerHeight = containerRect.height;
    const containerWidth = containerRect.width;

    const targetCenterY = localY + targetRect.height / 2;
    const placeBelow = targetCenterY < containerHeight / 2;

    const bubbleWidth = Math.min(280, containerWidth - 40);
    let bubbleLeft = localX + targetRect.width / 2 - bubbleWidth / 2;
    bubbleLeft = Math.max(16, Math.min(bubbleLeft, containerWidth - bubbleWidth - 16));

    const arrowLeft = Math.max(
      12,
      Math.min(bubbleWidth - 28, localX + targetRect.width / 2 - bubbleLeft - 8)
    );

    const anchorY = placeBelow
      ? localY + targetRect.height + GAP
      : localY - GAP;

    content = (
      <View
        style={[
          styles.bubble,
          {
            width: bubbleWidth,
            left: bubbleLeft,
            ...(placeBelow ? { top: anchorY } : { bottom: containerHeight - anchorY }),
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.arrow,
            placeBelow ? styles.arrowUp : styles.arrowDown,
            { left: arrowLeft },
          ]}
        />
        <Text style={styles.bubbleText}>{currentStep.text}</Text>
        <Pressable onPress={skip} hitSlop={8} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip tutorial</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      ref={containerRef}
      onLayout={measureContainer}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    backgroundColor: "#232336",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.accent,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  arrow: {
    position: "absolute",
    width: 16,
    height: 16,
    backgroundColor: "#232336",
    borderColor: theme.accent,
    transform: [{ rotate: "45deg" }],
  },
  arrowUp: { top: -8, borderTopWidth: 1, borderLeftWidth: 1 },
  arrowDown: { bottom: -8, borderBottomWidth: 1, borderRightWidth: 1 },
  bubbleText: { color: theme.text, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  skipButton: { alignSelf: "flex-end" },
  skipText: { color: theme.textDim, fontSize: 12, fontStyle: "italic" },
});
