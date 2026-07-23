import * as SQLite from "expo-sqlite";
import { BatchGate, CardProgress, QuizFilters } from "./types";

const DB_NAME = "riftbound_trainer.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS progress (
          cardId TEXT PRIMARY KEY NOT NULL,
          box INTEGER NOT NULL,
          dueAt INTEGER NOT NULL,
          seenCount INTEGER NOT NULL,
          correctCount INTEGER NOT NULL,
          lastResult TEXT,
          updatedAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

// Separate settings table (not the progress table) for the "when did the
// last study batch finish" pacing gate — see BATCH_COOLDOWN_MIN in
// leitner.ts. Independent of resetAllProgress on purpose: resetting Leitner
// progress (forgetting what you know) shouldn't also reset the pacing gate.
const BATCH_GATE_KEY = "lastBatchCompletedAt";
// Whether the person has completed (or explicitly skipped) the first-launch
// onboarding tutorial. Same settings table as the batch gate, deliberately
// a separate key from both progress and the batch gate — none of these
// three should reset each other as a side effect.
const TUTORIAL_SEEN_KEY = "hasSeenTutorial";
// Whether the person has dismissed the one-time first-launch welcome/alpha
// screen -- separate from TUTORIAL_SEEN_KEY, see db.web.ts's copy of this
// comment for why.
const WELCOME_SEEN_KEY = "hasSeenWelcome";
// The active QuizFilters selection -- unlike sessionState's queue/score
// bookkeeping (allowed to clear whenever the app process restarts), the
// filters someone deliberately set in Settings need to survive a restart
// the same way progress and the batch gate do. Without this, an app
// remount during an active BATCH_COOLDOWN_MIN wait snaps filters back to
// default while the persisted batch-gate timestamp survives untouched, so
// the fresh batch that builds once the cooldown clears uses the wrong
// filters.
const FILTERS_KEY = "quizFilters";

export async function getLastBatchCompletedAt(): Promise<BatchGate | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [BATCH_GATE_KEY]
  );
  if (!row) return null;
  // Pre-filter-scoping installs stored a bare timestamp string (no JSON, no
  // filterKey) -- treat that as "no filter recorded" rather than crashing
  // JSON.parse on a plain number string, so an existing gate from before
  // this change degrades gracefully instead of erroring.
  try {
    const parsed = JSON.parse(row.value);
    if (typeof parsed === "number") return { timestamp: parsed, filterKey: null };
    return parsed as BatchGate;
  } catch {
    return null;
  }
}

export async function setLastBatchCompletedAt(timestamp: number, filterKey: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [BATCH_GATE_KEY, JSON.stringify({ timestamp, filterKey })]
  );
}

export async function getHasSeenTutorial(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [TUTORIAL_SEEN_KEY]
  );
  return row?.value === "true";
}

export async function setHasSeenTutorial(seen: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [TUTORIAL_SEEN_KEY, seen ? "true" : "false"]
  );
}

export async function getHasSeenWelcome(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [WELCOME_SEEN_KEY]
  );
  return row?.value === "true";
}

export async function setHasSeenWelcome(seen: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [WELCOME_SEEN_KEY, seen ? "true" : "false"]
  );
}

export async function getSavedFilters(): Promise<QuizFilters | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [FILTERS_KEY]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as QuizFilters;
  } catch {
    return null;
  }
}

export async function setSavedFilters(filters: QuizFilters): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [FILTERS_KEY, JSON.stringify(filters)]
  );
}

export async function loadAllProgress(): Promise<Record<string, CardProgress>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    cardId: string;
    box: number;
    dueAt: number;
    seenCount: number;
    correctCount: number;
    lastResult: string | null;
    updatedAt: number;
  }>("SELECT * FROM progress");

  const result: Record<string, CardProgress> = {};
  for (const row of rows) {
    result[row.cardId] = {
      cardId: row.cardId,
      box: row.box,
      dueAt: row.dueAt,
      seenCount: row.seenCount,
      correctCount: row.correctCount,
      lastResult: (row.lastResult as CardProgress["lastResult"]) ?? null,
      updatedAt: row.updatedAt,
    };
  }
  return result;
}

export async function saveProgress(progress: CardProgress): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO progress (cardId, box, dueAt, seenCount, correctCount, lastResult, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(cardId) DO UPDATE SET
       box=excluded.box,
       dueAt=excluded.dueAt,
       seenCount=excluded.seenCount,
       correctCount=excluded.correctCount,
       lastResult=excluded.lastResult,
       updatedAt=excluded.updatedAt;`,
    [
      progress.cardId,
      progress.box,
      progress.dueAt,
      progress.seenCount,
      progress.correctCount,
      progress.lastResult,
      progress.updatedAt,
    ]
  );
}

export async function resetAllProgress(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM progress");
}
