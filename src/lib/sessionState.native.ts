import { QuizFilters } from "./types";

export type QuizSessionSnapshot = {
  filters: QuizFilters;
  queue: string[];
  shownThisSession: string[];
  sessionCorrect: number;
  sessionTotal: number;
};

// Native has no browser-tab/sessionStorage equivalent, but it doesn't need
// one: this module-level variable already resets every time the app process
// restarts, which is the native analogue of "the tab closed" — and it
// naturally survives screen navigation within a single app session, same as
// the web version's goal. No persistent storage needed here; see
// db.native.ts for the actual durable spaced-repetition data (expo-sqlite).
let snapshot: QuizSessionSnapshot | null = null;

function filtersEqual(a: QuizFilters, b: QuizFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function loadSessionSnapshot(currentFilters: QuizFilters): QuizSessionSnapshot | null {
  if (!snapshot || !filtersEqual(snapshot.filters, currentFilters)) return null;
  return snapshot;
}

export function saveSessionSnapshot(next: QuizSessionSnapshot): void {
  snapshot = next;
}

export function clearSessionSnapshot(): void {
  snapshot = null;
}
