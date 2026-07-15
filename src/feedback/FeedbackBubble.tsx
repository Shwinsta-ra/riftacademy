import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, StyleSheet, Text, View } from "react-native";
import { captureScreen, type Shot } from "./capture";
import FeedbackSheet from "./FeedbackSheet";
import { installQueueFlush, pendingCount } from "./queue";
import { useFeedback } from "./context";
import Svg, { Path } from "react-native-svg";
import { theme, DOMAIN_COLORS } from "../lib/theme";
import TopLayer from "./TopLayer";

// react-native-web renders `dataSet` as real data-* attributes, which is how
// capture.web.ts knows to leave the bubble itself out of the screenshot. It's
// a web-only prop that React Native's own types don't declare, hence the cast.
const IGNORE_IN_SCREENSHOT =
  Platform.OS === "web" ? ({ dataSet: { feedbackIgnore: "true" } } as object) : {};

// v2: the v1 key stored an unclamped drag delta against a base position that has
// since moved. Old values would now place the bubble off-screen, so they're
// abandoned rather than migrated.
// v3: the anchor moved from bottom-right to top-right, so a v2 delta would
// place the bubble somewhere meaningless. Old values are abandoned, not migrated.
const POS_KEY = "riftacademyFeedbackBubblePos_v3";
const SIZE = 38; // smaller than before, but far higher contrast — see styles.bubble
const DRAG_SLOP = 6; // px of movement below which a gesture is a tap, not a drag
const MARGIN = 8; // keep this much of the bubble inside the viewport, always

// Anchored top-right, level with the nav header.
//
// The bottom of the screen is the browser's on mobile — iOS Safari and Chrome
// both eat roughly the lower 90px with the URL bar and toolbar — and it's where
// the Quiz answer buttons live. The header strip is empty on every screen in the
// app, so it's the one place the bubble never has to fight anything.
const DEFAULT_TOP = 10;

// Light slate. Bright enough to find on a dark surface, neutral enough not to be
// mistaken for a call to action. (If you'd rather try the pastel teal: "#4FB8AE"
// with BUBBLE_BORDER "#6FD0C6" — one line, and everything else stays put.)
const BUBBLE_BG = "#4A4A58";
const BUBBLE_BORDER = "#6B6B7C";
const DEFAULT_RIGHT = 12;

type Pos = { x: number; y: number };

// The stored position is a translate DELTA from the default bottom-right anchor,
// so it has to be clamped against the current window — not the window it was
// saved on. Without this, dragging the bubble to the top-left on a phone and
// then opening the app on a desktop (or simply shipping a new default offset)
// leaves it somewhere outside the visible area, which is exactly what happened:
// invisible on mobile, stranded in the left margin on desktop.
//
// Clamping on read as well as on write means a bad value can't survive a single
// mount, whatever produced it.
function clampPos(p: Pos): Pos {
  if (Platform.OS !== "web" || typeof window === "undefined") return p;

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const colW = Math.min(480, winW); // the app column, per App.tsx's webWrapper

  // Anchor is TOP-right of the column: x may only go negative (leftward), y may
  // only go positive (downward). Bounds are computed against the *current*
  // window, not the one the value was saved on — otherwise a position dragged on
  // a phone strands the bubble off-screen on a desktop, and a change to the
  // default anchor strands it everywhere.
  const minX = -(colW - SIZE - DEFAULT_RIGHT - MARGIN);
  const maxY = winH - SIZE - DEFAULT_TOP - MARGIN;

  return {
    x: Math.min(0, Math.max(minX, p.x)),
    y: Math.max(0, Math.min(maxY, p.y)),
  };
}

function loadPos(): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return clampPos(JSON.parse(raw) as Pos);
  } catch {
    // No saved position, or no localStorage. Start at the default corner.
  }
  return { x: 0, y: 0 };
}

// The floating report button.
//
// Draggable because there is no corner that's safe on every screen: bottom-right
// sits on top of the Quiz answer buttons, top-right collides with the nav
// header, and MatchDetail is dense everywhere. Rather than relitigate placement
// each time a screen is added, the user moves it once and it stays put.
function FeedbackBubble() {
  const { trace } = useFeedback();
  const [open, setOpen] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [queued, setQueued] = useState(0);

  const pan = useRef(new Animated.ValueXY(loadPos())).current;
  const dragged = useRef(false);
  const busy = useRef(false);

  // Re-clamp when the window changes size. Rotating a phone, or dragging a
  // desktop window narrower, can otherwise leave the bubble outside the new
  // viewport with no way to reach it and drag it back.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onResize = () => {
      const current = {
        x: (pan.x as unknown as { _value: number })._value,
        y: (pan.y as unknown as { _value: number })._value,
      };
      const next = clampPos(current);
      if (next.x !== current.x || next.y !== current.y) {
        pan.setValue(next);
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(next));
        } catch {
          // Position won't persist. Not worth surfacing.
        }
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pan]);

  useEffect(() => {
    installQueueFlush();
    setQueued(pendingCount());
    const t = setInterval(() => setQueued(pendingCount()), 5000);
    return () => clearInterval(t);
  }, []);

  const onPress = async () => {
    if (busy.current) return;
    busy.current = true;
    setCapturing(true);
    trace("feedback.open");

    // Capture BEFORE the sheet mounts. Capture after, and every report is a
    // photograph of the report form.
    const s = await captureScreen();

    setShot(s);
    setCapturing(false);
    setOpen(true);
    busy.current = false;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > DRAG_SLOP || Math.abs(g.dy) > DRAG_SLOP,
        onPanResponderGrant: () => {
          dragged.current = false;
          pan.extractOffset();
        },
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) > DRAG_SLOP || Math.abs(g.dy) > DRAG_SLOP) dragged.current = true;
          pan.setValue({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: () => {
          pan.flattenOffset();
          if (!dragged.current) {
            void onPress();
            return;
          }
          const pos = clampPos({
            x: (pan.x as unknown as { _value: number })._value,
            y: (pan.y as unknown as { _value: number })._value,
          });
          // Snap back inside if the drag ended past the edge, so the bubble can
          // never be dragged somewhere it can't be dragged back from.
          pan.setValue(pos);
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(pos));
          } catch {
            // Position just won't persist across reloads. Not worth surfacing.
          }
        },
      }),
    // Intentionally created once — the handlers close over refs, not state.
    []
  );

  return (
    <>
      <Animated.View
        {...responder.panHandlers}
        {...IGNORE_IN_SCREENSHOT}
        style={[
          styles.bubble,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
          capturing && styles.active,
        ]}
      >
        {/* A speech bubble, not an "!". The exclamation mark read as a warning
            the app was showing the user; this reads as an invitation to say
            something, which is what it is. */}
        <Svg width={19} height={19} viewBox="0 0 24 24" pointerEvents="none">
          <Path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            fill="none"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        {queued > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{queued}</Text>
          </View>
        ) : null}
      </Animated.View>

      <FeedbackSheet visible={open} shot={shot} onClose={() => setOpen(false)} />
    </>
  );
}

// Mount ONCE, in App.tsx, as the last child of the wrapper. Every screen —
// including screens that don't exist yet — inherits the bubble, with no
// per-screen import and nothing to forget when adding the next one.
//
// TopLayer is what makes the bubble reachable over the app's own modals. On web
// it portals this whole subtree onto document.body above the modal layer, which
// is the only way out: react-native-web puts `position: relative; z-index: 0` on
// every View, so an overlay rendered inside the app tree is sealed in its
// parent's stacking context and can never rise above a body-level modal, no
// matter what z-index it's given. Escaping the tree is the fix; raising the
// z-index inside it never was.
export function FeedbackOverlay() {
  return (
    <TopLayer>
      <FeedbackBubble />
    </TopLayer>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    right: DEFAULT_RIGHT,
    top: DEFAULT_TOP,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    // Grey, deliberately — NOT the accent.
    //
    // Blurple is the app's call-to-action colour (Review Cards, New Match, Start
    // Match). A blurple circle in the header reads as another button you're
    // meant to press, competing for attention with the thing the user actually
    // came to do. A light slate grey is still unmissable against #14141a, but it
    // reads as chrome rather than as an invitation.
    backgroundColor: BUBBLE_BG,
    borderWidth: 1,
    borderColor: BUBBLE_BORDER,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.95,
    ...(Platform.OS === "web" ? ({ cursor: "grab" } as object) : null),
  },
  active: { opacity: 1 },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: DOMAIN_COLORS.Order,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: theme.bg, fontSize: 11, fontWeight: "800" },
});
