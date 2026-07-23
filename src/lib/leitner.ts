import { CardProgress, QuizFilters } from "./types";

// Leitner box intervals in minutes. Index = box number (1-5).
// Box 1 = missed, short retry. Higher boxes = longer gaps = better known.
export const BOX_INTERVALS_MIN: Record<number, number> = {
  1: 30, // Missed
  2: 60 * 24, // Common — 1 day
  3: 60 * 24 * 3, // Rare — 3 days
  4: 60 * 24 * 7, // Epic — 7 days
  5: 60 * 24 * 14, // Mastered — 14 days
};

export const MAX_BOX = 5;
export const MIN_BOX = 1;

const MINUTE_MS = 60 * 1000;

// Hard floor: a card just shown (right OR wrong) can't be considered "due"
// again for at least this long, regardless of what box it lands in. This is
// separate from the Leitner scheduling below — box promotions on a correct
// answer already push dueAt out much further than this, but this catches
// the edge case where a new session starts shortly after the last one
// ended and would otherwise be free to redraw a card seen moments ago.
export const MIN_COOLDOWN_MIN = 10;

// A "batch" is one bounded round of studying: at most BATCH_SIZE cards, then
// a mandatory BATCH_COOLDOWN_MIN wait before the next one — independent of
// (and on top of) the per-card MIN_COOLDOWN_MIN above. This is a pacing
// limit for the session as a whole, not a per-card rule: even if MORE cards
// are individually due, a person can't just keep pulling batch after batch
// back to back.
export const BATCH_SIZE = 20;
export const BATCH_COOLDOWN_MIN = 10;

// Identifies which QuizFilters selection a persisted batch-completion gate
// (see BATCH_GATE_KEY in db.web.ts/db.native.ts) was earned under. The gate
// is a pacing limit on a specific pool of cards, not a blanket "wait 10
// minutes no matter what" rule — switching filters means the person is
// asking to study a different pool, so a gate earned under the old filters
// shouldn't block a fresh batch under the new ones (see loadSession in
// QuizScreen.tsx / HomeScreen.tsx for where this is used). Simple JSON
// equality, same reasoning as sessionState's filtersEqual: QuizFilters is a
// flat structure of strings/arrays/null, no functions or cycles.
export function filtersKey(filters: QuizFilters): string {
  return JSON.stringify(filters);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type CardCategory = "missed" | "new" | "review";

function categorize(cardId: string, progressByCardId: Record<string, CardProgress>): CardCategory {
  const p = progressByCardId[cardId];
  if (!p) return "new";
  // "Missed" = previously answered wrong and demoted to box 1 (seenCount>0
  // distinguishes it from a card that's simply never been seen, which is
  // also box MIN_BOX by convention but categorized as "new" instead).
  if (p.box === MIN_BOX && p.seenCount > 0) return "missed";
  return "review";
}

export function newProgress(cardId: string, now: number = Date.now()): CardProgress {
  return {
    cardId,
    box: MIN_BOX,
    dueAt: now,
    seenCount: 0,
    correctCount: 0,
    lastResult: null,
    updatedAt: now,
  };
}

/**
 * Apply a quiz result to a card's progress, per Leitner box rules:
 * - Correct: promote one box (cap at MAX_BOX), schedule next review using
 *   the new box's interval.
 * - Incorrect: demote all the way back to box 1, due immediately (next
 *   session), since a miss means the card needs more repetitions, not a
 *   slightly-shorter wait.
 */
export function applyResult(
  progress: CardProgress,
  correct: boolean,
  now: number = Date.now()
): CardProgress {
  const nextBox = correct ? Math.min(MAX_BOX, progress.box + 1) : MIN_BOX;
  const intervalMin = BOX_INTERVALS_MIN[nextBox];
  return {
    ...progress,
    box: nextBox,
    dueAt: now + intervalMin * MINUTE_MS,
    seenCount: progress.seenCount + 1,
    correctCount: progress.correctCount + (correct ? 1 : 0),
    lastResult: correct ? "correct" : "incorrect",
    updatedAt: now,
  };
}

export function isDue(progress: CardProgress, now: number = Date.now()): boolean {
  const sinceLastShown = now - progress.updatedAt;
  if (sinceLastShown < MIN_COOLDOWN_MIN * MINUTE_MS) return false;
  return progress.dueAt <= now;
}

/**
 * Build a review queue: all due cards, sorted so lower boxes (weaker cards)
 * surface first, then interleaved lightly by due time. Cards never seen
 * before (no progress) count as box 1 / immediately due.
 */
export function buildQueue(
  allCardIds: string[],
  progressByCardId: Record<string, CardProgress>,
  now: number = Date.now()
): string[] {
  // Defensive dedup — guarantees this can never return the same id twice
  // regardless of what the caller passes in.
  const uniqueIds = Array.from(new Set(allCardIds));

  const due = uniqueIds.filter((id) => {
    const p = progressByCardId[id];
    return !p || isDue(p, now);
  });

  due.sort((a, b) => {
    const boxA = progressByCardId[a]?.box ?? MIN_BOX;
    const boxB = progressByCardId[b]?.box ?? MIN_BOX;
    if (boxA !== boxB) return boxA - boxB;
    const dueA = progressByCardId[a]?.dueAt ?? 0;
    const dueB = progressByCardId[b]?.dueAt ?? 0;
    return dueA - dueB;
  });

  return due;
}

/**
 * Builds one bounded study batch (see BATCH_SIZE/BATCH_COOLDOWN_MIN above).
 * Cards are split into three pools — missed (previously wrong), new (never
 * seen), and review (previously correct, now due on its normal spaced-
 * repetition interval) — sorted weakest/most-overdue-first within each pool,
 * then round-robin interleaved across the three so no single category
 * dominates a batch and review-due cards keep resurfacing on schedule
 * instead of being crowded out by missed/new. If a pool runs dry, the
 * round-robin simply keeps drawing from whichever pools still have cards.
 */
export function buildBatch(
  allCardIds: string[],
  progressByCardId: Record<string, CardProgress>,
  now: number = Date.now(),
  maxSize: number = BATCH_SIZE
): string[] {
  const uniqueIds = Array.from(new Set(allCardIds));
  const due = uniqueIds.filter((id) => {
    const p = progressByCardId[id];
    return !p || isDue(p, now);
  });

  const sortFn = (a: string, b: string) => {
    const boxA = progressByCardId[a]?.box ?? MIN_BOX;
    const boxB = progressByCardId[b]?.box ?? MIN_BOX;
    if (boxA !== boxB) return boxA - boxB;
    const dueA = progressByCardId[a]?.dueAt ?? 0;
    const dueB = progressByCardId[b]?.dueAt ?? 0;
    return dueA - dueB;
  };

  const pools: Record<CardCategory, string[]> = { missed: [], new: [], review: [] };
  for (const id of due) pools[categorize(id, progressByCardId)].push(id);
  // Shuffle before sorting, not after: Array.sort is stable, so cards that
  // tie on (box, dueAt) keep whatever order they were in going in. Without
  // this, the "new" pool -- every never-seen card ties at box 1 / dueAt 0 --
  // would always sort back into allCardIds' own order, which is why a fresh
  // account was always handed the same cards in the same order every batch.
  // The shuffle only affects ties; a genuine priority difference (lower box,
  // earlier due time) still wins regardless of shuffle order.
  pools.missed = shuffle(pools.missed).sort(sortFn);
  pools.new = shuffle(pools.new).sort(sortFn);
  pools.review = shuffle(pools.review).sort(sortFn);

  const order: CardCategory[] = ["missed", "new", "review"];
  const cursor: Record<CardCategory, number> = { missed: 0, new: 0, review: 0 };
  const batch: string[] = [];
  let madeProgress = true;
  while (batch.length < maxSize && madeProgress) {
    madeProgress = false;
    for (const cat of order) {
      if (batch.length >= maxSize) break;
      if (cursor[cat] < pools[cat].length) {
        batch.push(pools[cat][cursor[cat]]);
        cursor[cat]++;
        madeProgress = true;
      }
    }
  }
  return batch;
}
