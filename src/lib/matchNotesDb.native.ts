import * as SQLite from "expo-sqlite";
import { Match, MatchNoteEntry } from "./types";

const DB_NAME = "riftbound_match_notes_v5.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS matches (
          id TEXT PRIMARY KEY NOT NULL,
          startedAt INTEGER NOT NULL,
          myDeckId TEXT,
          myDeckName TEXT NOT NULL,
          opponentDeckId TEXT,
          opponentDeckName TEXT NOT NULL,
          myBattlefield TEXT NOT NULL,
          opponentBattlefield TEXT NOT NULL,
          goingFirst TEXT NOT NULL,
          pointsToWin INTEGER NOT NULL,
          gameNumber TEXT NOT NULL,
          turnNumber INTEGER NOT NULL,
          currentTurnPlayer TEXT NOT NULL,
          myPoints INTEGER NOT NULL,
          opponentPoints INTEGER NOT NULL,
          myHandCount INTEGER NOT NULL,
          opponentHandCount INTEGER NOT NULL,
          myTotalRunes INTEGER NOT NULL,
          myTappedRunes INTEGER NOT NULL,
          opponentTotalRunes INTEGER NOT NULL,
          opponentTappedRunes INTEGER NOT NULL,
          myDeckSize INTEGER NOT NULL,
          opponentDeckSize INTEGER NOT NULL,
          myDiscardPile INTEGER NOT NULL,
          opponentDiscardPile INTEGER NOT NULL,
          myInPlay INTEGER NOT NULL,
          opponentInPlay INTEGER NOT NULL,
          myBanished INTEGER NOT NULL,
          opponentBanished INTEGER NOT NULL,
          result TEXT
        );
        CREATE TABLE IF NOT EXISTS match_entries (
          id TEXT PRIMARY KEY NOT NULL,
          matchId TEXT NOT NULL,
          turnNumber INTEGER NOT NULL,
          player TEXT NOT NULL,
          actionType TEXT NOT NULL,
          cardName TEXT NOT NULL,
          location TEXT,
          note TEXT NOT NULL,
          effectJson TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

const MATCH_COLUMNS = [
  "id", "startedAt", "myDeckId", "myDeckName", "opponentDeckId", "opponentDeckName",
  "myBattlefield", "opponentBattlefield", "goingFirst", "pointsToWin", "gameNumber", "turnNumber",
  "currentTurnPlayer", "myPoints", "opponentPoints", "myHandCount", "opponentHandCount",
  "myTotalRunes", "myTappedRunes", "opponentTotalRunes", "opponentTappedRunes",
  "myDeckSize", "opponentDeckSize", "myDiscardPile", "opponentDiscardPile",
  "myInPlay", "opponentInPlay", "myBanished", "opponentBanished", "result",
];

export async function listMatches(): Promise<Match[]> {
  const db = await getDb();
  return db.getAllAsync<Match>("SELECT * FROM matches ORDER BY startedAt DESC");
}

export async function createMatch(match: Match): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO matches (${MATCH_COLUMNS.join(", ")}) VALUES (${MATCH_COLUMNS.map(() => "?").join(",")})`,
    MATCH_COLUMNS.map((c) => (match as any)[c])
  );
}

export async function saveMatch(match: Match): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE matches SET
      turnNumber=?, currentTurnPlayer=?, myPoints=?, opponentPoints=?,
      myHandCount=?, opponentHandCount=?, myTotalRunes=?, myTappedRunes=?,
      opponentTotalRunes=?, opponentTappedRunes=?,
      myDeckSize=?, opponentDeckSize=?, myDiscardPile=?, opponentDiscardPile=?,
      myInPlay=?, opponentInPlay=?, myBanished=?, opponentBanished=?, result=?
     WHERE id=?`,
    [
      match.turnNumber, match.currentTurnPlayer, match.myPoints, match.opponentPoints,
      match.myHandCount, match.opponentHandCount, match.myTotalRunes, match.myTappedRunes,
      match.opponentTotalRunes, match.opponentTappedRunes,
      match.myDeckSize, match.opponentDeckSize, match.myDiscardPile, match.opponentDiscardPile,
      match.myInPlay, match.opponentInPlay, match.myBanished, match.opponentBanished, match.result,
      match.id,
    ]
  );
}

export async function deleteMatch(matchId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM matches WHERE id = ?", [matchId]);
  await db.runAsync("DELETE FROM match_entries WHERE matchId = ?", [matchId]);
}

function rowToEntry(row: any): MatchNoteEntry {
  return { ...row, effect: JSON.parse(row.effectJson) };
}

export async function listEntries(matchId: string): Promise<MatchNoteEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM match_entries WHERE matchId = ? ORDER BY createdAt ASC",
    [matchId]
  );
  return rows.map(rowToEntry);
}

export async function addEntry(entry: MatchNoteEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO match_entries (id, matchId, turnNumber, player, actionType, cardName, location, note, effectJson, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id, entry.matchId, entry.turnNumber, entry.player, entry.actionType,
      entry.cardName, entry.location, entry.note, JSON.stringify(entry.effect), entry.createdAt,
    ]
  );
}

export async function deleteEntry(entryId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM match_entries WHERE id = ?", [entryId]);
}
