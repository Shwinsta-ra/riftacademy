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
      `);
      return db;
    });
  }
  return dbPromise;
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
