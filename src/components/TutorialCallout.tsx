import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTutorial } from "../lib/tutorialContext";
import { theme } from "../lib/theme";

const RING_PADDING = 6;
const GAP = 14;

type ContainerRect = { x: number; y: number; width: number; height: number };

/** Renders a highlight ring around whatever target the active tutorial step
 *  has registered, plus a speech-bubble "cloud" with a small triangular
 *  arrow pointing at it. Mounted once at the app root (same pattern as
 *  FeedbackOverlay) so it can render on top of whichever screen is
 *  currently active — screens don't render their own copy of this. Renders
 *  nothing when the tutorial isn't running or hasn't measured a target yet.
 *
 *  `targetRect` (from useTutorialTarget) is window-relative, via
 *  measureInWindow. On web, App.tsx's webWrapper centers a max-480px column
 *  with side margins on any viewport wider than that, so this component's
 *  own absoluteFill container does NOT start at the window's left edge —
 *  positioning directly off targetRect would double-apply that margin and
 *  place the ring/bubble off to the right of the real element. This
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

  const ready = currentStep && targetRect && containerRect;

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
      ? localY + targetRect.height + RING_PADDING + GAP
      : localY - RING_PADDING - GAP;

    content = (
      <>
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              left: localX - RING_PADDING,
              top: localY - RING_PADDING,
              width: targetRect.width + RING_PADDING * 2,
              height: targetRect.height + RING_PADDING * 2,
            },
          ]}
        />
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
      </>
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
  ring: {
    position: "absolute",
    borderWidth: 3,
    borderColor: theme.accent,
    borderRadius: 16,
  },
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
  skipText: { color: theme.textDim, fontSize: 12 },
});
