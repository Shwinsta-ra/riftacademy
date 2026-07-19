import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
import { getFilteredCards } from "../lib/quiz";
import { buildAttributeQuestion, AttributeQuestion, getMaskRegions } from "../lib/attributeQuiz";
import { humanizeCardText } from "../lib/textDisplay";
import { loadAllProgress, saveProgress, getLastBatchCompletedAt, setLastBatchCompletedAt } from "../lib/db";
import { loadSessionSnapshot, saveSessionSnapshot, clearSessionSnapshot } from "../lib/sessionState";
import { buildBatch, applyResult, newProgress, BATCH_SIZE, BATCH_COOLDOWN_MIN } from "../lib/leitner";
import { Card, CardProgress } from "../lib/types";
import { useFilters } from "../lib/filtersStore";
import { useFeedbackSafe } from "../feedback/context";
import { cardImageUri } from "../lib/cardImage";

type Props = NativeStackScreenProps<RootStackParamList, "Quiz">;

// Real card renders are 744x1039 — matching that ratio exactly means the
// card fills its container edge to edge with no leftover letterboxing.
const CARD_ASPECT_RATIO = 744 / 1039;

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
    const lastCompleted = await getLastBatchCompletedAt();
    const gateUntil = lastCompleted ? lastCompleted + BATCH_COOLDOWN_MIN * 60_000 : null;
    if (gateUntil && now < gateUntil) {
      setPool(cards);
      setProgressMap(progress);
      setQueue([]);
      setNothingAvailable(false);
      setBatchGateUntil(gateUntil);
      shownThisSessionRef.current = new Set();
      setSessionCorrect(0);
      setSessionTotal(0);
      setLoading(false);
      return;
    }

    // Clear to start a fresh batch.
    setPool(cards);
    setProgressMap(progress);
    setQueue(freshBatch);
    setNothingAvailable(cards.length > 0 && freshBatch.length === 0);
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
      // one (see BATCH_COOLDOWN_MIN) and clear the resumable snapshot, since
      // there's nothing left in it to resume. loadSession's own gate check
      // will pick this up the moment the countdown effect notices it expire.
      const now = Date.now();
      setLastBatchCompletedAt(now);
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
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>
          Nice work on that set! Your next batch of cards unlocks in {mmss} — short
          breaks between sets help this actually stick.
        </Text>
        <Pressable style={styles.doneButton} onPress={() => navigation.navigate("Home")}>
          <Text style={styles.doneButtonText}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  if (nothingAvailable) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>
          These are all the cards for you right now — check back in 10 minutes for new ones.
        </Text>
        <Pressable
          style={styles.doneButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.doneButtonText}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  if (!question || !card) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>
          Session complete: {sessionCorrect}/{sessionTotal} correct.
        </Text>
        <Pressable
          style={styles.doneButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.doneButtonText}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  const maskRegions = getMaskRegions(question.mode, card);
  const revealed = selected !== null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.cardImageWrap}>
          <Image
            // Non-null assertion is safe here: getFilteredCards() (quiz.ts)
            // excludes every card with imageUrl === null from the pool this
            // screen ever receives, specifically so a card can never reach
            // this render without real art.
            source={{ uri: imageProxyFailed ? card.imageUrl! : cardImageUri(card.imageUrl!) }}
            style={styles.cardImage}
            resizeMode={card.type === "Battlefield" ? "contain" : "cover"}
            onError={() => setImageProxyFailed(true)}
          />
          {!revealed &&
            maskRegions.map((region, i) => (
              <View
                key={i}
                style={[
                  styles.maskOverlay,
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
        </View>

        <View style={styles.controlsGroup}>
        <Text style={styles.prompt}>{question.prompt}</Text>
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
          // Long-answer text mode still needs more lines per cell until
          // Group B shortens the answers; others stay tight.
          const maxLines = question.mode === "text" ? 6 : 3;

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
                    style={[
                      styles.option,
                      itemStyle,
                      revealed && isCorrect && { backgroundColor: theme.correct },
                      revealed && isSelected && !isCorrect && { backgroundColor: theme.incorrect },
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
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next card</Text>
          </Pressable>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  // flexGrow lets the content fill the viewport so space-between can push the
  // card to the top and the controls group to the bottom. It still scrolls as
  // a fallback if a particular card's content is taller than the screen.
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  controlsGroup: { width: "100%" },
  centered: { alignItems: "center", justifyContent: "center", flex: 1 },
  emptyText: { color: theme.text, fontSize: 16, textAlign: "center", marginBottom: 16 },
  doneButton: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  doneButtonText: { color: "#fff", fontWeight: "600" },
  prompt: {
    color: theme.text,
    fontSize: 19,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 14,
  },
  caption: {
    color: theme.textDim,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 14,
  },
  cardImageWrap: {
    // Enlarged to 78% per device testing. The controls group is
    // bottom-anchored (scrollContent uses space-between), leaving room for a
    // bigger card up top without forcing a scroll on a normal phone. Tune
    // this single value if it's too big/small on a given device.
    width: "78%",
    alignSelf: "center",
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 16,
    overflow: "visible",
    position: "relative",
  },
  cardImage: { width: "100%", height: "100%", borderRadius: 16 },
  maskOverlay: {
    position: "absolute",
    backgroundColor: "#0d0d12",
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  maskText: { color: theme.accent, fontSize: 22, fontWeight: "800" },
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
  nextButton: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  nextButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
