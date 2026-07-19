import * as SQLite from "expo-sqlite";
import { CardProgress } from "./types";

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

export async function getLastBatchCompletedAt(): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [BATCH_GATE_KEY]
  );
  return row ? parseInt(row.value, 10) : null;
}

export async function setLastBatchCompletedAt(timestamp: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [BATCH_GATE_KEY, String(timestamp)]
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
