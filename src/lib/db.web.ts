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
