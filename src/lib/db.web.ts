import { CardProgress } from "./types";

// expo-sqlite's web implementation depends on a wa-sqlite WASM asset that
// doesn't resolve cleanly through Metro's web bundler (confirmed: it fails
// the build entirely, not just at runtime). Rather than fight that, the web
// build uses plain localStorage — perfectly adequate for this data size
// (a few hundred small progress records), synchronous, and reliably
// supported across every evergreen browser this app will actually be
// opened in, including mobile Safari.
//
// This file is picked automatically by Metro's platform resolution for web
// builds (the .web.ts suffix) — db.native.ts is used for iOS/Android and
// never gets bundled here, so the wasm dependency chain is avoided
// entirely rather than just unused at runtime.
const STORAGE_KEY = "riftboundTrainerProgress";
// Separate from CardProgress: this is the "when did the last study batch
// finish" pacing gate (see BATCH_COOLDOWN_MIN in leitner.ts). It needs to
// survive the app/tab being fully closed and reopened — unlike the
// in-session resume state in sessionState.ts, which is allowed to clear —
// because the pacing limit is wall-clock based, not tied to any one
// browser session. Deliberately a separate key from progress so resetting
// progress (forgetting what you know) doesn't also reset the pacing gate;
// they're independent concerns.
const BATCH_GATE_KEY = "riftboundTrainerLastBatchCompletedAt";
// Whether the person has completed (or explicitly skipped) the first-launch
// onboarding tutorial. Same durability reasoning as BATCH_GATE_KEY — needs
// to survive a full app close, not just a tab refresh. Separate key from
// both progress and the batch gate: none of these three should reset each
// other as a side effect.
const TUTORIAL_SEEN_KEY = "riftboundTrainerHasSeenTutorial";

function readAll(): Record<string, CardProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, CardProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage can throw in rare cases (private browsing quota limits,
    // etc.) — silently no-op rather than crash the quiz over a save miss.
  }
}

export async function loadAllProgress(): Promise<Record<string, CardProgress>> {
  return readAll();
}

export async function saveProgress(progress: CardProgress): Promise<void> {
  const all = readAll();
  all[progress.cardId] = progress;
  writeAll(all);
}

export async function resetAllProgress(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op, same reasoning as above
  }
}

export async function getLastBatchCompletedAt(): Promise<number | null> {
  try {
    const raw = localStorage.getItem(BATCH_GATE_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export async function setLastBatchCompletedAt(timestamp: number): Promise<void> {
  try {
    localStorage.setItem(BATCH_GATE_KEY, String(timestamp));
  } catch {
    // no-op
  }
}

export async function getHasSeenTutorial(): Promise<boolean> {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export async function setHasSeenTutorial(seen: boolean): Promise<void> {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, seen ? "true" : "false");
  } catch {
    // no-op
  }
}
