import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme, GLOW } from "../lib/theme";
import ScreenGlow from "../components/ScreenGlow";
import GlowButton from "../components/GlowButton";
import QuizCardArt from "../components/QuizCardArt";
import Sparklet from "../components/Sparklet";
import { getFilteredCards } from "../lib/quiz";
import { buildAttributeQuestion, AttributeQuestion, getMaskRegions } from "../lib/attributeQuiz";
import { humanizeCardText, preventOrphanWord } from "../lib/textDisplay";
import { loadAllProgress, saveProgress, getLastBatchCompletedAt, setLastBatchCompletedAt } from "../lib/db";
import { loadSessionSnapshot, saveSessionSnapshot, clearSessionSnapshot } from "../lib/sessionState";
import {
  buildBatch,
  applyResult,
  newProgress,
  filtersKey,
  BATCH_SIZE,
  BATCH_COOLDOWN_MIN,
} from "../lib/leitner";
import { Card, CardProgress } from "../lib/types";
import { useFilters } from "../lib/filtersStore";
import { useFeedbackSafe } from "../feedback/context";
import { cardImageUri } from "../lib/cardImage";

type Props = NativeStackScreenProps<RootStackParamList, "Quiz">;

// Real card renders are 744x1039 (portrait) -- matching that ratio exactly
// means the card fills its container edge to edge with no leftover
// letterboxing. Battlefield cards are the same physical template rotated
// 90 degrees (measured: 1038x744, the same numbers swapped), so they need
// the inverse ratio -- using the portrait ratio for every card type used to
// force battlefields into a tall container via resizeMode="contain",
// letterboxing them top/bottom. cardAspectRatio (below, per-render) picks
// the right one so the container always matches the card's actual shape.
const CARD_ASPECT_RATIO = 744 / 1039;
const BATTLEFIELD_ASPECT_RATIO = 1039 / 744;

export default function QuizScreen({ navigation }: Props) {
  const { filters } = useFilters();
  const { setScreenContext, trace } = useFeedbackSafe();
  // If the CORS proxy ever fails, fall back to loading card art straight from
  // the CDN. A degraded screenshot is an inconvenience; a quiz with no card
  // images is an outage.
  const [imageProxyFailed, setImageProxyFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<Card[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, CardProgress>>({});
  const [card, setCard] = useState<Card | null>(null);
  const [question, setQuestion] = useState<AttributeQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  // Bumped on every correct answer to (re)fire the Sparklet reaction. Starts at
  // 0 (no reaction on mount); each increment plays a fresh, non-blocking
  // celebration, so answering correctly in a streak re-triggers cleanly.
  const [correctPlayKey, setCorrectPlayKey] = useState(0);
  const [nothingAvailable, setNothingAvailable] = useState(false);
  // When set, a study batch was completed less than BATCH_COOLDOWN_MIN ago
  // and a NEW batch can't start until this timestamp — see BATCH_SIZE /
  // BATCH_COOLDOWN_MIN in leitner.ts. Does not apply to resuming an
  // already-in-progress batch (see loadSession below) — only to starting a
  // fresh one.
  const [batchGateUntil, setBatchGateUntil] = useState<number | null>(null);
  // Ticks once a second only while a gate is active, purely to drive the
  // countdown display and to notice when the gate has expired.
  const [nowTick, setNowTick] = useState(Date.now());

  const scrollRef = useRef<ScrollView>(null);
  // Explicit, unconditional guard: every card ID actually displayed this
  // session goes in here the moment it's shown, and nextQuestion refuses to
  // show anything already in this set — regardless of what the queue array
  // itself contains. This is deliberately redundant with the queue/cooldown
  // logic above; it exists specifically so "same card twice in one
  // session" is structurally impossible rather than just unlikely.
  const shownThisSessionRef = useRef<Set<string>>(new Set());
  // Rolling list of the last several question modes shown (most-recent-last),
  // fed to buildAttributeQuestion so it can bias toward attributes that
  // haven't come up lately — this is what stops long streaks of the same
  // question type (e.g. 8 name questions with no cost/might). Not persisted;
  // a fresh session starting with an empty history is fine.
  const recentModesRef = useRef<AttributeQuestion["mode"][]>([]);

  const loadSession = useCallback(async () => {
    const cards = getFilteredCards(filters);
    const progress = await loadAllProgress();
    const ids = cards.map((c) => c.id);
    const now = Date.now();

    // Resuming an in-progress batch (refresh/back-nav within the same tab)
    // takes priority over the pacing gate below — the gate only blocks
    // STARTING a new batch, never finishing one already underway. A snapshot
    // only counts as "in progress" if it actually has cards left; an empty
    // one means the last batch was already fully completed.
    const snapshot = loadSessionSnapshot(filters);
    const freshBatch = buildBatch(ids, progress, now, BATCH_SIZE);

    if (snapshot && snapshot.queue.length > 0) {
      const restoredShown = new Set(snapshot.shownThisSession);
      const restoredCorrect = snapshot.sessionCorrect;
      const restoredTotal = snapshot.sessionTotal;

      // Never let a stale resume hide a card that's become newly due since
      // the last save — reconcile against a fresh batch rather than trusting
      // the snapshot's queue blindly.
      const freshSet = new Set(freshBatch);
      const resumedQueue = snapshot.queue.filter((id) => freshSet.has(id));
      const alreadyIncluded = new Set(resumedQueue);
      const newlyDue = freshBatch.filter(
        (id) => !alreadyIncluded.has(id) && !restoredShown.has(id)
      );
      const finalQueue = [...resumedQueue, ...newlyDue].slice(0, BATCH_SIZE);

      setPool(cards);
      setProgressMap(progress);
      setQueue(finalQueue);
      setNothingAvailable(cards.length > 0 && finalQueue.length === 0);
      setBatchGateUntil(null);
      shownThisSessionRef.current = restoredShown;
      setSessionCorrect(restoredCorrect);
      setSessionTotal(restoredTotal);
      saveSessionSnapshot({
        filters,
        queue: finalQueue,
        shownThisSession: Array.from(restoredShown),
        sessionCorrect: restoredCorrect,
        sessionTotal: restoredTotal,
      });
      setLoading(false);
      return;
    }

    // No batch to resume — check whether we're still within the pacing
    // cooldown from the last COMPLETED batch before starting a fresh one.
    // The gate only blocks a fresh batch under the SAME filter selection it
    // was earned under (see filtersKey in leitner.ts): switching filters
    // means the person is asking for a different pool of cards, so it
    // should immediately surface whatever in THAT pool is new or outside
    // its own per-card cooldown, rather than staying blocked by an
    // unrelated pool's timer.
    const currentFilterKey = filtersKey(filters);
    const lastCompleted = await getLastBatchCompletedAt();
    const gateUntil = lastCompleted ? lastCompleted.timestamp + BATCH_COOLDOWN_MIN * 60_000 : null;
    const gateAppliesHere = lastCompleted !== null && lastCompleted.filterKey === currentFilterKey;

    if (gateAppliesHere && gateUntil && now < gateUntil) {
      setPool(cards);
      setProgressMap(progress);
      setQueue([]);
      setNothingAvailable(false);
      setBatchGateUntil(gateUntil);
      // nowTick's initial value is captured once at mount, before this
      // await chain resolves -- without this, the first countdown render
      // uses that stale mount-time value instead of the actual current
      // time, showing a briefly-too-large mm:ss that only self-corrects
      // once the countdown's own 1s interval fires. Stamping it to the
      // same `now` used to compute the gate keeps the very first render
      // accurate.
      setNowTick(now);
      shownThisSessionRef.current = new Set();
      setSessionCorrect(0);
      setSessionTotal(0);
      setLoading(false);
      return;
    }

    if (freshBatch.length > 0) {
      // Either no gate is active at all, or one is active but was earned
      // under a DIFFERENT filter selection -- either way there's something
      // new (or out of its own cooldown) to show under the current filter
      // right now, so show it instead of staying gated on an unrelated
      // pool's timer.
      setPool(cards);
      setProgressMap(progress);
      setQueue(freshBatch);
      setNothingAvailable(false);
      setBatchGateUntil(null);
      shownThisSessionRef.current = new Set();
      setSessionCorrect(0);
      setSessionTotal(0);
      saveSessionSnapshot({
        filters,
        queue: freshBatch,
        shownThisSession: [],
        sessionCorrect: 0,
        sessionTotal: 0,
      });
      setLoading(false);
      return;
    }

    // freshBatch is empty. If cards actually match this filter but none are
    // due, the person has already seen/mastered everything this filter can
    // currently offer -- rather than a flat "nothing available" dead end,
    // fall back to whatever pacing countdown is already running (even one
    // earned under a different filter): continue it rather than resetting
    // it, so the "come back at X" signal survives a filter change instead
    // of restarting a fresh 10 minutes.
    if (cards.length > 0 && gateUntil && now < gateUntil) {
      setPool(cards);
      setProgressMap(progress);
      setQueue([]);
      setNothingAvailable(false);
      setBatchGateUntil(gateUntil);
      setNowTick(now);
      shownThisSessionRef.current = new Set();
      setSessionCorrect(0);
      setSessionTotal(0);
      setLoading(false);
      return;
    }

    // Truly nothing to show right now and no countdown to fall back on.
    setPool(cards);
    setProgressMap(progress);
    setQueue([]);
    setNothingAvailable(cards.length > 0);
    setBatchGateUntil(null);
    shownThisSessionRef.current = new Set();
    setSessionCorrect(0);
    setSessionTotal(0);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // While gated, tick every second to drive the countdown and to notice the
  // moment the gate expires — at which point we automatically build the
  // next batch rather than making the person manually refresh.
  useEffect(() => {
    if (!batchGateUntil) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [batchGateUntil]);

  useEffect(() => {
    if (batchGateUntil && nowTick >= batchGateUntil) {
      setBatchGateUntil(null);
      loadSession();
    }
  }, [nowTick, batchGateUntil, loadSession]);

  const nextQuestion = useCallback(
    (remainingQueue: string[], currentPool: Card[]) => {
      // Skip forward past any id already shown this session, no matter why
      // it's still in the queue — this is the hard guarantee.
      let queueToUse = remainingQueue;
      while (queueToUse.length > 0 && shownThisSessionRef.current.has(queueToUse[0])) {
        queueToUse = queueToUse.slice(1);
      }
      if (queueToUse.length !== remainingQueue.length) {
        setQueue(queueToUse);
      }

      if (queueToUse.length === 0) {
        setCard(null);
        setQuestion(null);
        return;
      }
      const nextId = queueToUse[0];
      const nextCard = currentPool.find((c) => c.id === nextId);
      if (!nextCard) {
        nextQuestion(queueToUse.slice(1), currentPool);
        return;
      }
      const q = buildAttributeQuestion(
        nextCard,
        currentPool,
        recentModesRef.current,
        filters.speeds
      );
      if (!q) {
        nextQuestion(queueToUse.slice(1), currentPool);
        return;
      }
      // Record the mode we're about to show so the next pick can steer away
      // from it. Keep only a short rolling window (the picker only looks at
      // the last ~7 anyway).
      recentModesRef.current = [...recentModesRef.current, q.mode].slice(-10);
      shownThisSessionRef.current.add(nextId);
      setCard(nextCard);
      setQuestion(q);
      setSelected(null);
    },
    // filters.speeds is read inside (for speed-question suppression); include
    // it so a filter change can't leave a stale closure here. The mount
    // effect also rebuilds the pool on any filter change, so in practice this
    // just keeps the two consistent.
    [filters.speeds]
  );

  useEffect(() => {
    if (!loading && pool.length > 0) {
      nextQuestion(queue, pool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pool]);

  // Replace the native "Quiz" header title with the live session progress
  // line, so there's one less redundant place showing similar info.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${sessionCorrect}/${sessionTotal} this session · ${queue.length} left`,
    });
  }, [navigation, sessionCorrect, sessionTotal, queue.length]);

  // Reset to the top for every new question — separate from the
  // scroll-to-bottom-on-answer behavior in handleAnswer, so a long previous
  // card's content doesn't leave the new question's prompt scrolled out of
  // view above the fold.
  useEffect(() => {
    if (card) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [card?.id]);

  // Publish what's on screen right now to the feedback layer. A report filed
  // from this screen then carries the exact mode, card, box and due time,
  // which is the whole difference between "the quiz is broken" and a bug that
  // can be fixed without asking the reporter to reproduce it. In particular
  // dueAt is what makes a "card repeated too soon" report actionable — it
  // shows immediately whether isDue() or the session guard was the one that
  // let it through.
  useEffect(() => {
    if (!card || !question) return;
    const p = progressMap[card.id];
    setScreenContext({
      quizMode: question.mode,
      cardId: card.id,
      cardName: card.name,
      cardType: card.type,
      leitnerBox: p?.box,
      dueAt: p?.dueAt,
      sessionSeen: shownThisSessionRef.current.size,
    });
  }, [card?.id, question?.mode]);

  async function handleAnswer(index: number) {
    if (!question || !card || selected !== null) return;
    setSelected(index);
    const correct = index === question.correctIndex;
    trace("answer", `${card.id} ${question.mode} idx=${index} correct=${correct}`);
    const newTotal = sessionTotal + 1;
    const newCorrect = correct ? sessionCorrect + 1 : sessionCorrect;
    setSessionTotal(newTotal);
    setSessionCorrect(newCorrect);
    if (correct) setCorrectPlayKey((k) => k + 1);

    const existing = progressMap[card.id] ?? newProgress(card.id);
    const updated = applyResult(existing, correct);
    const newMap = { ...progressMap, [card.id]: updated };
    setProgressMap(newMap);
    await saveProgress(updated);

    saveSessionSnapshot({
      filters,
      queue,
      shownThisSession: Array.from(shownThisSessionRef.current),
      sessionCorrect: newCorrect,
      sessionTotal: newTotal,
    });

    // Auto-scroll so the Next button is immediately visible without the
    // person having to hunt for it after answering.
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
  }

  function handleNext() {
    const remaining = queue.slice(1);
    setQueue(remaining);
    nextQuestion(remaining, pool);

    if (remaining.length === 0) {
      // This batch is fully done — start the pacing cooldown for the next
      // one under THIS filter selection (see BATCH_COOLDOWN_MIN and
      // filtersKey) and clear the resumable snapshot, since there's nothing
      // left in it to resume. loadSession's own gate check will pick this
      // up the moment the countdown effect notices it expire.
      const now = Date.now();
      setLastBatchCompletedAt(now, filtersKey(filters));
      clearSessionSnapshot();
      setBatchGateUntil(now + BATCH_COOLDOWN_MIN * 60_000);
      return;
    }

    saveSessionSnapshot({
      filters,
      queue: remaining,
      shownThisSession: Array.from(shownThisSessionRef.current),
      sessionCorrect,
      sessionTotal,
    });
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (pool.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>
          No cards match your current filters. Adjust filters in Settings.
        </Text>
      </View>
    );
  }

  if (batchGateUntil && nowTick < batchGateUntil) {
    const msLeft = batchGateUntil - nowTick;
    const minutes = Math.floor(msLeft / 60_000);
    const seconds = Math.floor((msLeft % 60_000) / 1000);
    const mmss = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    // One vertically-centered column (per Ashwin's follow-up -- the earlier
    // absolutely-positioned zones spread it too far down the screen). The
    // headline/label/countdown read as one 3-line group, followed by the
    // tip and button with a small gap before each.
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.doneHeadline}>Nice work on that set!</Text>
        <Text style={styles.doneCountdownLabel}>Your next batch of cards unlocks in:</Text>
        <Text style={styles.doneCountdownValue}>{mmss}</Text>
        <Text style={styles.doneTip}>
          Short breaks between sets improves your card recall
        </Text>
        <GlowButton
          label="Back to home"
          onPress={() => navigation.navigate("Home")}
          radius={12}
          contentStyle={styles.doneButtonBody}
          style={styles.doneButtonWrap}
        />
      </View>
    );
  }

  if (nothingAvailable) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>
          These are all the cards for you right now. Check back in 10 minutes for new ones.
        </Text>
        <GlowButton
          label="Back to home"
          onPress={() => navigation.navigate("Home")}
          radius={12}
          contentStyle={styles.doneButtonBody}
        />
      </View>
    );
  }

  if (!question || !card) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>
          Session complete: {sessionCorrect}/{sessionTotal} correct.
        </Text>
        <GlowButton
          label="Back to home"
          onPress={() => navigation.navigate("Home")}
          radius={12}
          contentStyle={styles.doneButtonBody}
        />
      </View>
    );
  }

  const maskRegions = getMaskRegions(question.mode, card);
  const revealed = selected !== null;
  const cardAspectRatio =
    card.type === "Battlefield" ? BATTLEFIELD_ASPECT_RATIO : CARD_ASPECT_RATIO;
  // Cost pips are printed as circular badges on the real card art; the
  // might badge is actually a rounded rectangle (or, on equipment, a "+N"
  // flag icon), and power cost is a stack of 1-4 small pip icons, not a
  // fixed circle at all -- its quizPositions.json region is a fixed rect
  // sized to the worst case (4 pips) plus the energy-cost circle above it,
  // rather than scaling per-card, so the box itself can't leak the real
  // value. Per Ashwin's follow-up feedback, might's and power's masks still
  // use this same circular styling rather than mirroring their real shapes --
  // consistency of the mask style reads better than exactly tracing what's
  // underneath it (and for power's tall, narrow pip-stack region, a full
  // borderRadius renders it as a rounded capsule, which happens to match
  // the real capsule shape anyway).
  // quizPositions.json's "might.default" is now sized to exactly match
  // "cost" (same width/height) per Ashwin's direct comparison -- it was
  // previously a bit larger than cost, which read as inconsistent. It's
  // still positioned to safely cover the printed digit(s) with a
  // comfortable margin, verified against several cards including a
  // Champion template's wider printed numerals. "might.Gear" is
  // deliberately NOT shrunk to match: equipment's "+N" text measures
  // noticeably wider on some cards (verified up to ~98px on a 744px-wide
  // card image) than cost's circle can safely cover without risking a
  // leak, so it stays at its own, slightly larger, safe size.
  // quizPositions entries are calibrated to render as true circles (or,
  // for power, a correctly-proportioned capsule) at this ratio's ~78%-width
  // container, so a full borderRadius here is enough -- no per-render
  // aspect-ratio math needed, since cost/might/power questions only ever
  // occur on portrait-oriented cards.
  const isCircularMask =
    question.mode === "energyCost" || question.mode === "powerCost" || question.mode === "might";

  return (
    <View style={styles.container}>
      <ScreenGlow />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <QuizCardArt
          aspectRatio={cardAspectRatio}
          decoration={<Sparklet playKey={correctPlayKey} />}
        >
          <Image
            // Non-null assertion is safe here: getFilteredCards() (quiz.ts)
            // excludes every card with imageUrl === null from the pool this
            // screen ever receives, specifically so a card can never reach
            // this render without real art.
            source={{ uri: imageProxyFailed ? card.imageUrl! : cardImageUri(card.imageUrl!) }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => setImageProxyFailed(true)}
          />
          {!revealed &&
            maskRegions.map((region, i) => (
              <View
                key={i}
                style={[
                  styles.maskOverlay,
                  isCircularMask && styles.maskOverlayCircle,
                  {
                    top: region.top,
                    left: region.left,
                    width: region.width,
                    height: region.height,
                  },
                ]}
              >
                <Text style={styles.maskText}>?</Text>
              </View>
            ))}
        </QuizCardArt>

        <View style={styles.controlsGroup}>
        <Text style={styles.prompt}>{preventOrphanWord(question.prompt)}</Text>
        {question.caption && (
          <Text style={styles.caption}>{humanizeCardText(question.caption)}</Text>
        )}

        {(() => {
          // Layout rule (answer-count based, applies to ALL question types):
          //   3 options -> 1x3 horizontal row
          //   4 options -> 2x2 grid
          // This is deliberately keyed off option COUNT, not question mode:
          // speed questions happen to be the common 3-option case today, but
          // custom fill-in-the-blank or text questions can also have exactly
          // 3 answers (e.g. a card with only two sensible distractors), and
          // they should compact to 1x3 the same way.
          const optionCount = question.options.length;
          const isRow3 = optionCount === 3;
          const containerStyle = isRow3 ? styles.optionsRow3 : styles.optionsGrid;
          const itemStyle = isRow3 ? styles.optionThird : styles.optionHalf;
          // Long-answer text/bracketSwap modes still need more lines per
          // cell until Group B shortens the answers; others stay tight.
          const maxLines = question.mode === "text" || question.mode === "bracketSwap" ? 6 : 3;

          return (
            <View style={containerStyle}>
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctIndex;
                const isSelected = i === selected;
                return (
                  <Pressable
                    key={`${opt}-${i}`}
                    disabled={revealed}
                    onPress={() => handleAnswer(i)}
                    style={({ pressed }) => [
                      styles.option,
                      itemStyle,
                      revealed && isCorrect && { backgroundColor: theme.correct },
                      revealed && isSelected && !isCorrect && { backgroundColor: theme.incorrect },
                      // Motion-only press feedback (no hover on mobile).
                      pressed && !revealed && styles.optionPressed,
                    ]}
                  >
                    <Text style={styles.optionText} numberOfLines={maxLines}>
                      {humanizeCardText(opt)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })()}

        {revealed && (
          <GlowButton
            label="Next card"
            onPress={handleNext}
            radius={12}
            style={styles.nextButtonWrap}
            contentStyle={styles.nextButtonBody}
            textStyle={styles.nextButtonText}
          />
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  // flexGrow lets the content fill the viewport even on a short card. No
  // justifyContent here on purpose -- space-between used to stretch the gap
  // between the card and the question text to fill any leftover viewport
  // height; controlsGroup's own marginTop is what sets that gap now, so it
  // stays a fixed, reasonable size regardless of screen height.
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  controlsGroup: { width: "100%" },
  centered: { alignItems: "center", justifyContent: "center", flex: 1 },
  emptyText: { color: theme.text, fontSize: 16, textAlign: "center", marginBottom: 16 },
  doneButtonBody: { paddingVertical: 14, paddingHorizontal: 24 },
  doneButtonWrap: { marginTop: 24 },
  // The batch-cooldown screen (see the batchGateUntil block above) is one
  // vertically-centered column (styles.centered on the container) -- the
  // headline/label/countdown read as a 3-line group with no gap between
  // them, then a bigger gap before the tip and again before the button.
  doneHeadline: {
    textAlign: "center",
    color: theme.text,
    fontSize: 26,
    fontWeight: "800",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  doneCountdownLabel: { color: theme.textDim, fontSize: 16, textAlign: "center" },
  doneCountdownValue: { color: theme.text, fontSize: 34, fontWeight: "800", marginTop: 6 },
  doneTip: {
    color: theme.textDim,
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  prompt: {
    color: theme.text,
    fontSize: 19,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 14,
    // react-native-web's default Text styling sets overflow-wrap: break-word,
    // which lets the browser break INSIDE a non-breaking-space-joined pair
    // when the pair alone doesn't fit a line -- silently defeating
    // preventOrphanWord's whole point. Native Text layout has no such
    // default, so this override is web-only.
    ...(Platform.OS === "web" ? ({ wordBreak: "keep-all" } as object) : null),
  },
  caption: {
    color: theme.textDim,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 14,
  },
  // Card sizing/foil now lives in <QuizCardArt/> (78% width + this aspect
  // ratio). The image fills that container.
  cardImage: { width: "100%", height: "100%", borderRadius: 16 },
  // Zones are now tightly fitted to the actual printed element they cover
  // (verified by measuring several cards' real pixels) rather than the
  // generous quadrant-sized boxes this used to be, so the fill/border can
  // read as a deliberate badge instead of a slab pasted over the art.
  maskOverlay: {
    position: "absolute",
    // Fully opaque -- this exists to hide an answer, so unlike the rest of
    // the Rune Glow surfaces it can't afford to be a translucent wash.
    backgroundColor: "#0f0f16",
    borderWidth: 1.5,
    borderColor: "rgba(88,101,242,0.55)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...GLOW.feature,
  },
  // Cost pips are round on the actual card art -- see isCircularMask above.
  maskOverlayCircle: { borderRadius: 999 },
  maskText: { color: theme.accent, fontSize: 17, fontWeight: "800" },
  // Full-width single column — used only for long-answer text-mode questions.
  optionsColumn: { gap: 8, alignItems: "stretch" },
  // 2x2 grid — 4 short options (cost/might/name/keyword).
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  // 1x3 horizontal row — 3 options (speed questions).
  optionsRow3: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 8,
  },
  option: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  optionFull: { width: "100%", alignSelf: "stretch" },
  // 48% (not 50%) leaves room for the space-between gutter between columns.
  optionHalf: { width: "48%", minHeight: 52 },
  // ~31.5% x3 + two gutters ≈ full width.
  optionThird: { flex: 1, minHeight: 52 },
  optionText: { color: theme.text, fontSize: 13, lineHeight: 17, textAlign: "center" },
  optionPressed: { transform: [{ scale: 0.97 }] },
  nextButtonWrap: { marginTop: 20 },
  nextButtonBody: { paddingVertical: 14 },
  nextButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
