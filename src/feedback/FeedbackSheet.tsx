import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AnnotationCanvas, { type Stroke } from "./AnnotationCanvas";
import { tagsForRoute } from "./categories";
import { deviceContext, useFeedback } from "./context";
import { flattenAnnotations, type Shot } from "./capture";
import { submit } from "./queue";
import type { Report } from "./transport";
import { theme, DOMAIN_COLORS, REQUIRED } from "../lib/theme";

type Props = {
  visible: boolean;
  shot: Shot | null;
  onClose: () => void;
};

const COARSE_POINTER =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

// After a feedback form is filled out on mobile web, the user may have
// pinch-zoomed (to read the screenshot, tap a small field, etc.) and iOS
// Safari leaves the page zoomed in. This nudges the viewport back to 1x:
// briefly clamping maximum-scale forces Safari to reset the zoom, then we
// restore the original content string so the user can pinch-zoom again.
// Web-only and best-effort — if the platform ignores it, it's a silent no-op.
function resetViewportZoom() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const vp = document.querySelector('meta[name="viewport"]');
  if (!vp) return;
  const original =
    vp.getAttribute("content") || "width=device-width, initial-scale=1";
  vp.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  );
  setTimeout(() => vp.setAttribute("content", original), 350);
}


// On a phone the image can't span the full sheet width. touchAction is "none"
// over the drawable area (it has to be, or the browser eats the drawing
// gesture), so an edge-to-edge image is a dead zone the user can't scroll past —
// they get stuck drawing on a picture with no way to reach the form below it.
//
// The image is narrowed AND flush left, so the entire right edge is one
// continuous gutter.
//
// Two reasons, one shape. On touch, touchAction:"none" over the drawable area is
// non-negotiable (without it the browser eats the drawing gesture), so an
// edge-to-edge image is a dead zone you can't scroll past — the gutter is the way
// out. On desktop, Chrome's scrollbar fattens on hover and lands right on top of
// a centred image, which is visually loud and easy to grab by accident. One
// right-hand lane serves both: the scroll gutter and the scrollbar share it, and
// neither touches the picture.
const CANVAS_WIDTH = "86%";

// Dimmer than theme.textDim, which is used for real (if secondary) content.
// Placeholder text is a prompt to be typed over, not information — it should
// read as clearly provisional. Italics come from a scoped ::placeholder rule in
// TopLayer.web.tsx, since React Native can't style a placeholder separately from
// the text the user types.
const PLACEHOLDER = "#5A5A68";

// Deliberately NOT a react-native <Modal>: RNW's Modal createPortal()s itself
// onto document.body, which would tear this sheet straight back out of the
// high-z-index TopLayer and drop it underneath the app's own modals again.
export default function FeedbackSheet({ visible, shot, onClose }: Props) {
  const { route, screenContext, getBreadcrumbs, sessionId, trace } = useFeedback();

  const [tagIds, setTagIds] = useState<string[]>([]);
  const [happened, setHappened] = useState("");
  const [expected, setExpected] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [keepShot, setKeepShot] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"sent" | "queued" | "rejected" | null>(null);
  const [drawing, setDrawing] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const dragY = useRef(new Animated.Value(0)).current;

  const close = useCallback(() => {
    dragY.setValue(0);
    setTagIds([]);
    setHappened("");
    setExpected("");
    setStrokes([]);
    setPreviewWidth(0);
    setKeepShot(true);
    setResult(null);
    setDrawing(false);
    onClose();
  }, [onClose, dragY]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
        onPanResponderMove: (_e, g) => {
          if (g.dy > 0) dragY.setValue(g.dy); // downward only
        },
        onPanResponderRelease: (_e, g) => {
          // A decisive flick or a deliberate pull dismisses. Anything less
          // springs back, so a mis-grab can't destroy a half-written report.
          if (g.dy > 110 || g.vy > 0.6) close();
          else Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        },
      }),
    [close, dragY]
  );

  // Two fingers on the image scroll the form. touchAction:"none" means the
  // browser won't do it for us at any finger count, so it's done by hand.
  const onTwoFingerScroll = useCallback((dy: number) => {
    const next = Math.max(0, scrollY.current + dy);
    scrollRef.current?.scrollTo({ y: next, animated: false });
  }, []);

  const tags = tagsForRoute(route);
  const selected = tags.filter((t) => tagIds.includes(t.id));
  const cardDataSelected = selected.some((t) => t.cardData);

  // A tag (any tag — "Other" is one of them, for anything the list doesn't cover)
  // is the only hard requirement now; "What happened?" is a nice-to-have,
  // not a gate, since the tag + screenshot + breadcrumbs are usually enough
  // on their own to act on a report (per Ashwin's follow-up feedback).
  const canSend = tagIds.length > 0 && !sending;

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);

    const screenshot =
      keepShot && shot ? await flattenAnnotations(shot, strokes, previewWidth) : null;

    const report: Report = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      tags: selected.map((t) => ({ id: t.id, label: t.label, color: t.color })),
      route,
      whatHappened: happened.trim(),
      whatExpected: expected.trim(),
      context: { ...deviceContext(), ...screenContext, sessionId },
      breadcrumbs: getBreadcrumbs(),
      screenshot,
      queuedAt: Date.now(),
      attempts: 0,
    };

    const outcome = await submit(report);
    trace("feedback.sent", tagIds.join(","));
    setSending(false);
    setResult(outcome);
    resetViewportZoom();
    setTimeout(close, 1700);
  };

  if (!visible) return null;

  return (
    <View style={styles.root}>
      <Pressable style={styles.scrim} onPress={close} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: dragY }] }]}>
        {/* The whole header strip is the drag handle. A 4px grabber is a nice
            affordance and an awful hit target. */}
        <View style={styles.header} {...dragResponder.panHandlers}>
          <View style={styles.grabber} />
          <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {result ? (
          <View style={styles.done}>
            <Text style={[styles.doneTitle, result === "rejected" && styles.doneTitleError]}>
              {result === "sent" && "Report sent"}
              {result === "queued" && "Report queued"}
              {result === "rejected" && "Report didn't go through"}
            </Text>
            <Text style={styles.doneBody}>
              {result === "sent" && "It's in the dev channel."}
              {result === "queued" &&
                "You're offline. It'll send as soon as you reconnect."}
              {result === "rejected" &&
                "The server rejected it. Try again, or mention it directly if it keeps happening."}
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!drawing}
            scrollEventThrottle={16}
            onScroll={(e) => {
              scrollY.current = e.nativeEvent.contentOffset.y;
            }}
          >
            <Text style={styles.title}>Share Feedback</Text>

            {shot && keepShot ? (
              <>
                {/* Centred and narrowed on touch devices, leaving a scrollable
                    gutter down each side of the drawable area. Clear/Undo live
                    INSIDE that column — sitting them at the sheet's edges put
                    them above the gutters, floating in space away from the image
                    they act on. */}
                <View style={styles.canvasRow}>
                  <View style={styles.canvasSlot}>
                    <View style={styles.canvasHeader}>
                      {/* Left-aligned, so it lines up with "What kind of issue?"
                          and "What happened?" below — one left margin down the
                          whole form. */}
                      <Text style={styles.canvasTitle}>Circle the issue</Text>

                      <View style={styles.canvasActions}>
                        <Pressable
                          disabled={!strokes.length}
                          onPress={() => setStrokes([])}
                          style={styles.actionBtn}
                        >
                          <Text style={strokes.length ? styles.actionOn : styles.actionOff}>
                            Clear
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={!strokes.length}
                          onPress={() => setStrokes((s) => s.slice(0, -1))}
                          style={styles.actionBtn}
                        >
                          <Text style={strokes.length ? styles.actionOn : styles.actionOff}>
                            Undo
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <AnnotationCanvas
                      uri={shot.dataUrl}
                      aspect={shot.width / shot.height}
                      strokes={strokes}
                      onStrokesChange={setStrokes}
                      onWidth={setPreviewWidth}
                      onDrawStart={() => setDrawing(true)}
                      onDrawEnd={() => setDrawing(false)}
                      onTwoFingerScroll={onTwoFingerScroll}
                    />

                    <Pressable onPress={() => setKeepShot(false)} style={styles.removeBtn}>
                      <Text style={styles.ghostText}>Remove screenshot</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <Pressable
                onPress={() => shot && setKeepShot(true)}
                style={styles.reattach}
                disabled={!shot}
              >
                <Text style={[styles.ghostText, !shot && styles.dim]}>
                  {shot ? "Add the screenshot back" : "No screenshot captured"}
                </Text>
              </Pressable>
            )}

            <Text style={styles.label}>
              What kind of issue? Pick all that apply <Text style={styles.req}>(required)</Text>
            </Text>
            <View style={styles.chips}>
              {tags.map((t) => {
                const on = tagIds.includes(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleTag(t.id)}
                    style={[styles.chip, on && { backgroundColor: t.color, borderColor: t.color }]}
                  >
                    {/* No "✓" prefix and no weight change on select: both add
                        width, which reflowed the whole chip row on every tap.
                        The fill colour alone carries the state. */}
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {cardDataSelected && screenContext.cardName ? (
              <Text style={styles.note}>
                Attaching {screenContext.cardName} ({screenContext.cardId}) for review against the
                Master Card Inventory.
              </Text>
            ) : null}

            <Text style={styles.label}>What happened?</Text>
            <TextInput
              style={styles.input}
              value={happened}
              onChangeText={setHappened}
              placeholder="Mask covered the wrong card element."
              placeholderTextColor={PLACEHOLDER}
            />

            <Text style={styles.label}>What did you expect?</Text>
            <TextInput
              style={styles.input}
              value={expected}
              onChangeText={setExpected}
              placeholder="The cost box should be hidden in cost mode."
              placeholderTextColor={PLACEHOLDER}
            />

            <Pressable
              onPress={onSend}
              disabled={!canSend}
              style={[styles.send, !canSend && styles.sendOff]}
            >
              {sending ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <Text style={styles.sendText}>Submit feedback</Text>
              )}
            </Pressable>
            <View style={styles.tail} />
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    // 90% of the column, centred. Full-bleed made the sheet feel like a new
    // screen rather than a panel over the one being reported on — and the app is
    // still visible at the edges, which is the point.
    width: "90%",
    alignSelf: "center",
    maxHeight: "88%",
    backgroundColor: theme.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
  },
  header: { height: 48, justifyContent: "center", alignItems: "center" },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: theme.textDim },
  closeBtn: {
    position: "absolute",
    right: -8, // past the body padding, into the sheet's actual corner
    top: 0,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: theme.textDim, fontSize: 26, fontWeight: "600", lineHeight: 30 },
  title: {
    color: theme.text,
    fontSize: 21,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },

  canvasHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  canvasTitle: { color: theme.text, fontSize: 14, fontWeight: "600" },
  canvasActions: { flexDirection: "row" },
  actionBtn: { paddingVertical: 4, paddingLeft: 16 },
  // White when they'll actually do something, grey when there's nothing to clear
  // or undo. The state is legible before you tap, not after nothing happens.
  actionOn: { color: theme.text, fontSize: 13, fontWeight: "600" },
  actionOff: { color: theme.textDim, fontSize: 13, opacity: 0.45 },
  // flex-start, not center: the image sits flush left with the rest of the form,
  // and everything left over becomes one gutter on the right.
  canvasRow: { alignItems: "flex-start" },
  canvasSlot: { width: CANVAS_WIDTH },
  removeBtn: { alignSelf: "flex-end", paddingVertical: 10, paddingTop: 8 },

  label: { color: theme.text, fontSize: 13, fontWeight: "600", marginTop: 18, marginBottom: 8 },
  ghostText: { color: theme.accent, fontSize: 13 },
  dim: { color: theme.textDim, opacity: 0.5 },
  reattach: {
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    alignItems: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    marginRight: 8,
    marginBottom: 8,
  },
  // fontWeight is identical in both states — a 600-weight label is wider than a
  // 400-weight one, and the chip would grow when selected.
  chipText: { color: theme.textDim, fontSize: 13, fontWeight: "500" },
  chipTextOn: { color: "#ffffff", fontWeight: "500" },
  note: { color: theme.accent, fontSize: 12, marginTop: 4 },
  // Magenta = required. Platform-wide convention — see REQUIRED in lib/theme.ts.
  req: { color: REQUIRED, fontSize: 12, fontWeight: "500" },
  // Single line, not the old multiline minHeight:64 box -- both answer
  // fields are optional context now (see canSend), so they read as quick
  // one-liners rather than a full report form.
  input: {
    height: 44,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    color: theme.text,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  send: {
    marginTop: 32,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  sendOff: { opacity: 0.35 },
  sendText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  tail: { height: 40 },
  done: { paddingVertical: 48, alignItems: "center" },
  doneTitle: { color: DOMAIN_COLORS.Calm, fontSize: 18, fontWeight: "700" },
  // Fury red is this platform's "something is broken" convention (see
  // lib/theme.ts) — reused here rather than a one-off error color.
  doneTitleError: { color: DOMAIN_COLORS.Fury },
  doneBody: { color: theme.textDim, fontSize: 14, marginTop: 8, textAlign: "center" },
});
