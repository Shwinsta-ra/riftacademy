import { Match, MatchNoteEntry } from "./types";

const MATCHES_KEY = "riftboundMatchNotes_matches_v5";
const ENTRIES_KEY = "riftboundMatchNotes_entries_v5";

function readMatches(): Match[] {
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeMatches(matches: Match[]): void {
  try {
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  } catch {
    // no-op
  }
}

function readEntries(): MatchNoteEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: MatchNoteEntry[]): void {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // no-op
  }
}

export async function listMatches(): Promise<Match[]> {
  return readMatches().sort((a, b) => b.startedAt - a.startedAt);
}

export async function createMatch(match: Match): Promise<void> {
  const matches = readMatches();
  matches.push(match);
  writeMatches(matches);
}

export async function saveMatch(match: Match): Promise<void> {
  const matches = readMatches();
  const idx = matches.findIndex((m) => m.id === match.id);
  if (idx !== -1) {
    matches[idx] = match;
    writeMatches(matches);
  }
}

export async function deleteMatch(matchId: string): Promise<void> {
  writeMatches(readMatches().filter((m) => m.id !== matchId));
  writeEntries(readEntries().filter((e) => e.matchId !== matchId));
}

export async function listEntries(matchId: string): Promise<MatchNoteEntry[]> {
  return readEntries()
    .filter((e) => e.matchId === matchId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function addEntry(entry: MatchNoteEntry): Promise<void> {
  const entries = readEntries();
  entries.push(entry);
  writeEntries(entries);
}

export async function deleteEntry(entryId: string): Promise<void> {
  writeEntries(readEntries().filter((e) => e.id !== entryId));
}
