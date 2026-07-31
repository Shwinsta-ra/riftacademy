// Format context — Modes of Play and the Tournament-Rules layer.
// CR 481-488, TR 104.1 / 402.1 / 601-603.
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part6.md §2,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §9.
//
// TR 104.1 — for competitions the Tournament Rules take precedence over the
// Core Rules. That's a real precedence inversion, scoped to competition play,
// and it's why the kernel takes a FormatContext rather than hardcoding 1v1
// constructed anywhere.

import type { CardId, FormatContext } from "./schema";

/** Per-format card legality. TR 602.1.b — a constructed-banned card stays limited-legal unless banned there too. */
export type FormatLegality = {
  standard1v1: "legal" | "banned";
  constructed2v2: "legal" | "banned";
  limited: "legal" | "banned";
};

/**
 * Ban list effective 2026-07-24, verified against live cards.json in
 * Part 6 §3. The 2v2 Constructed list is all of Standard PLUS Master Yi.
 * This replaces the legacy single `banned1v1` boolean, which structurally
 * could not represent a card legal in 1v1 but banned in 2v2.
 */
export const BAN_LIST: Record<CardId, FormatLegality> = {
  "ogn-177-298": { standard1v1: "banned", constructed2v2: "banned", limited: "legal" }, // Stealthy Pursuer
  "ogn-290-298": { standard1v1: "banned", constructed2v2: "banned", limited: "legal" }, // The Arena's Greatest
  "ogn-276-298": { standard1v1: "banned", constructed2v2: "banned", limited: "legal" }, // Aspirant's Climb
  "ogs-019-024": { standard1v1: "legal", constructed2v2: "banned", limited: "legal" }, // Master Yi, Wuju Bladesman
};

/** TR 601.2 + 602.1.b — legality for one card under one mode/format pairing. */
export function cardLegality(
  cardId: CardId,
  mode: FormatContext["mode"],
  format: FormatContext["format"]
): "legal" | "banned" {
  const entry = BAN_LIST[cardId];
  if (!entry) return "legal";
  if (format !== "constructed") return entry.limited; // TR 602.1.b
  return mode === "2v2" ? entry.constructed2v2 : entry.standard1v1;
}

/** CR 483 + TR 402.1 / 602.4 — the per-mode/format defaults the kernel is parameterized by. */
export function makeFormatContext(
  mode: FormatContext["mode"] = "1v1",
  format: FormatContext["format"] = "constructed",
  overrides: Partial<FormatContext> = {}
): FormatContext {
  const base: FormatContext = {
    mode,
    format,
    victoryScore: mode === "2v2" ? 11 : 8,
    battlefieldCount: 3, // TR 402.1 — 3 uniquely-named battlefields
    // TR 402.1 constructed exactly 40 incl. champion; TR 602.4.a.2 sealed >=25; TR 602.4.b draft >=20.
    mainDeckMin: format === "constructed" ? 40 : format === "sealed" ? 25 : 20,
    championCountsInMain: format === "constructed", // TR 402.1 ("including a chosen champion")
    uniqueApplies: format === "constructed", // TR 602.4.a.6.a — suspended in sealed/draft
    copyLimitApplies: format === "constructed", // TR 602.4.a.6 — named/signature limits don't apply in limited
    legality: (cardId: CardId) => cardLegality(cardId, mode, format),
  };
  return { ...base, ...overrides };
}

/** TR 603.7.a — 2v2 turn order alternates teams: TeamA-P1 -> TeamB-P1 -> TeamA-P2 -> TeamB-P2. */
export function teamTurnOrder(teamA: [string, string], teamB: [string, string]): string[] {
  return [teamA[0], teamB[0], teamA[1], teamB[1]];
}
