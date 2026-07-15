import React, { useMemo, useRef, useState } from "react";
import { Image, PanResponder, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme, DOMAIN_COLORS } from "../lib/theme";

export type Point = { x: number; y: number };
export type Stroke = Point[];

type Props = {
  uri: string;
  aspect: number; // width / height of the captured bitmap
  strokes: Stroke[];
  onStrokesChange: (s: Stroke[]) => void;
  onWidth: (w: number) => void; // drawable width — needed to rescale on flatten
  onDrawStart: () => void;
  onDrawEnd: () => void;
  // Two-finger drag over the image scrolls the form instead of drawing.
  onTwoFingerScroll: (dy: number) => void;
};

// Three CSS properties that make drawing on an image work in a browser:
//
//  1. touchAction: "none" — without it the browser's own scroll gesture wins and
//     the pan responder never sees a move event on a touchscreen.
//  2. userSelect / userDrag: "none" — dragging an <img> otherwise starts a
//     native drag-and-drop and hauls a ghost of the image around behind the
//     cursor, which reads as "the picture is moving when I try to draw".
//  3. cursor: "crosshair" — the affordance that says this surface is drawable.
const WEB_DRAW_SURFACE =
  Platform.OS === "web"
    ? ({
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitUserDrag: "none",
        cursor: "crosshair",
      } as object)
    : {};

export default function AnnotationCanvas({
  uri,
  aspect,
  strokes,
  onStrokesChange,
  onWidth,
  onDrawStart,
  onDrawEnd,
  onTwoFingerScroll,
}: Props) {
  const [current, setCurrent] = useState<Stroke>([]);
  // The <svg> needs EXPLICIT pixel dimensions. With none, it falls back to the
  // CSS default of 300x150 and clips everything outside — strokes recorded
  // correctly, drawn correctly on export, but invisible on screen past a small
  // box in the corner.
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // PanResponder closes over its handlers once, at creation. Anything they read
  // has to live in a ref or they read stale state forever.
  const currentRef = useRef<Stroke>([]);
  const strokesRef = useRef<Stroke[]>(strokes);
  strokesRef.current = strokes;
  const lastTwoFingerY = useRef<number | null>(null);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Capture-phase, so this claims the gesture before the parent ScrollView
        // can. Without it the ScrollView wins any drag with vertical movement in
        // it — which is most attempts at drawing a circle.
        //
        // One finger draws. Two or more scroll: because touchAction is "none",
        // the browser won't scroll this element for us at any finger count, so
        // the multi-touch case is forwarded to the form's ScrollView by hand.
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false, // never yield mid-stroke

        onPanResponderGrant: (e) => {
          if (e.nativeEvent.touches.length > 1) {
            lastTwoFingerY.current = e.nativeEvent.pageY;
            return;
          }
          const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          currentRef.current = [p];
          setCurrent([p]);
          onDrawStart();
        },

        onPanResponderMove: (e) => {
          if (e.nativeEvent.touches.length > 1) {
            // Second finger arrived, possibly mid-stroke. Abandon the partial
            // stroke rather than committing a stray mark the user didn't want.
            if (currentRef.current.length) {
              currentRef.current = [];
              setCurrent([]);
              onDrawEnd();
            }
            const y = e.nativeEvent.pageY;
            if (lastTwoFingerY.current !== null) {
              onTwoFingerScroll(lastTwoFingerY.current - y);
            }
            lastTwoFingerY.current = y;
            return;
          }
          if (!currentRef.current.length) return;

          const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          const last = currentRef.current[currentRef.current.length - 1];
          // Drop sub-pixel jitter. A slow drag would otherwise emit hundreds of
          // near-identical points straight into the payload.
          if (last && Math.hypot(p.x - last.x, p.y - last.y) < 2) return;
          currentRef.current = [...currentRef.current, p];
          setCurrent(currentRef.current);
        },

        onPanResponderRelease: () => {
          lastTwoFingerY.current = null;
          if (currentRef.current.length > 1) {
            onStrokesChange([...strokesRef.current, currentRef.current]);
          }
          currentRef.current = [];
          setCurrent([]);
          onDrawEnd();
        },
        onPanResponderTerminate: () => {
          lastTwoFingerY.current = null;
          currentRef.current = [];
          setCurrent([]);
          onDrawEnd();
        },
      }),
    [onStrokesChange, onDrawStart, onDrawEnd, onTwoFingerScroll]
  );

  const toPath = (s: Stroke) =>
    s.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <View
      style={[styles.wrap, { aspectRatio: aspect }, WEB_DRAW_SURFACE]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
        onWidth(width);
      }}
      {...responder.panHandlers}
    >
      {/* Both layers are pointerEvents="none" so every event lands on the
          wrapper's pan responder — and so the browser can't start a native image
          drag from the <img> itself. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      </View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
        >
          {[...strokes, current].map((s, i) =>
            s.length > 1 ? (
              <Path
                key={i}
                d={toPath(s)}
                stroke={DOMAIN_COLORS.Fury}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null
          )}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
});
