import { QuizFilters } from "./types";

// Distinct from db.web.ts's localStorage-backed CardProgress (the actual
// spaced-repetition memory, which correctly persists indefinitely). This is
// the much lighter-weight "where was I in this specific browsing session"
// bookkeeping — remaining queue order, running score, which cards this
// session has already shown. sessionStorage is the right primitive for it:
// it survives a refresh/back-nav within the same tab, and clears itself the
// moment the tab actually closes, matching "resume within a session" rather
// than "remember forever."
const SESSION_KEY = "riftboundTrainerSession";

export type QuizSessionSnapshot = {
  filters: QuizFilters;
  queue: string[];
  shownThisSession: string[];
  sessionCorrect: number;
  sessionTotal: number;
};

function filtersEqual(a: QuizFilters, b: QuizFilters): boolean {
  // Simple deep-equal via JSON is safe here — QuizFilters is a flat
  // structure of strings/arrays/null, no functions or cycles.
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Returns the saved snapshot only if it was captured under the exact same
 *  filters as right now — resuming a session built under a different filter
 *  set (e.g. a Vendetta-only session) into an unrelated one doesn't make
 *  sense, so a filter mismatch is treated the same as "no snapshot." */
export function loadSessionSnapshot(currentFilters: QuizFilters): QuizSessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as QuizSessionSnapshot;
    if (!filtersEqual(snapshot.filters, currentFilters)) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export function saveSessionSnapshot(snapshot: QuizSessionSnapshot): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    // sessionStorage can throw (private browsing quota, etc.) — silently
    // no-op rather than crash the quiz over a save miss, same reasoning as
    // db.web.ts's localStorage calls.
  }
}

export function clearSessionSnapshot(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // no-op, same reasoning as above
  }
}
