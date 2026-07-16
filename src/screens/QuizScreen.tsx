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
import { loadAllProgress, saveProgress } from "../lib/db";
import { buildQueue, applyResult, newProgress } from "../lib/leitner";
import { Card, CardProgress } from "../lib/types";
import { useFilters } from "../lib/filtersStore";
import { useFeedbackSafe } from "../feedback/context";
import { cardImageUri } from "../lib/cardImage";

type Props = NativeStackScreenProps<RootStackParamList, "Quiz">;

// Real card renders are 744x1039 — matching that ratio exactly means the
// card fills its container edge to edge with no leftover letterboxing.
const CARD_ASPECT_RATIO = 744 / 1039;

const MAX_SESSION_SIZE = 50;

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

  const scrollRef = useRef<ScrollView>(null);
  // Explicit, unconditional guard: every card ID actually displayed this
  // session goes in here the moment it's shown, and nextQuestion refuses to
  // show anything already in this set — regardless of what the queue array
  // itself contains. This is deliberately redundant with the queue/cooldown
  // logic above; it exists specifically so "same card twice in one
  // session" is structurally impossible rather than just unlikely.
  const shownThisSessionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const cards = getFilteredCards(filters);
      const progress = await loadAllProgress();
      const ids = cards.map((c) => c.id);
      // buildQueue's isDue() already bakes in the 10-minute cooldown, so
      // anything it returns is genuinely safe to show. There is
      // deliberately NO fallback that reshuffles the full pool when this
      // comes back empty — that fallback used to ignore cooldowns entirely
      // and was the actual cause of cards reappearing back-to-back. If
      // nothing is available, the person sees a clear "come back later"
      // message instead of being served a card they just saw.
      const dueQueue = buildQueue(ids, progress).slice(0, MAX_SESSION_SIZE);

      setPool(cards);
      setProgressMap(progress);
      setQueue(dueQueue);
      setNothingAvailable(cards.length > 0 && dueQueue.length === 0);
      shownThisSessionRef.current = new Set();
      setLoading(false);
    })();
  }, [filters]);

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
      const q = buildAttributeQuestion(nextCard, currentPool);
      if (!q) {
        nextQuestion(queueToUse.slice(1), currentPool);
        return;
      }
      shownThisSessionRef.current.add(nextId);
      setCard(nextCard);
      setQuestion(q);
      setSelected(null);
    },
    []
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
    setSessionTotal((t) => t + 1);
    if (correct) setSessionCorrect((c) => c + 1);

    const existing = progressMap[card.id] ?? newProgress(card.id);
    const updated = applyResult(existing, correct);
    const newMap = { ...progressMap, [card.id]: updated };
    setProgressMap(newMap);
    await saveProgress(updated);

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

        <Text style={styles.prompt}>{question.prompt}</Text>
        {question.caption && (
          <Text style={styles.caption}>{humanizeCardText(question.caption)}</Text>
        )}

        <View style={styles.optionsList}>
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
                  revealed && isCorrect && { backgroundColor: theme.correct },
                  revealed && isSelected && !isCorrect && { backgroundColor: theme.incorrect },
                ]}
              >
                <Text style={styles.optionText} numberOfLines={3}>
                  {humanizeCardText(opt)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {revealed && (
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next card</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scrollContent: { padding: 16, paddingBottom: 48 },
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
    // 10% smaller across all dimensions than the previous full-bleed
    // width, centered.
    width: "90%",
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
  optionsList: { gap: 8, alignItems: "stretch" },
  option: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
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
