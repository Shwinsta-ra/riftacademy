// Format context — Modes of Play and the Tournament-Rules layer.
// CR 481-488, TR 104.1 / 402.1 / 601-603.
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part6.md §2,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §9.
//
// TR 104.1 — for competitions the Tournament Rules take precedence over the
// Core Rules. That's a real precedence inversion, scoped to competition play,
// and it's why the kernel takes a FormatContext rather than hardcoding 1v1
// constructed anywhere.

import type { CardId, Domain, FormatContext } from "./schema";

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
    // TR 402.1 constructed EXACTLY 40 incl. champion; TR 602.4.a.2 sealed >=25; TR 602.4.b draft >=20.
    mainDeckMin: format === "constructed" ? 40 : format === "sealed" ? 25 : 20,
    mainDeckMax: format === "constructed" ? 40 : null,
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

// ---------------------------------------------------------------------------
// Deck construction (CR 101-103, TR 402.1 / 601.1.b)
// ---------------------------------------------------------------------------

/**
 * The catalog facts deck validation needs. Passed in rather than imported so
 * this module stays free of `cards.json` and is testable without it — the
 * same reason the kernel mirrors printed keywords onto GameObject.
 */
export type CardFacts = {
  /** CR 132.4 — the full "Name, Subtitle" form IS the name; different subtitles are different names. */
  name: string;
  domains: Domain[];
  isChampion: boolean;
  isSignature: boolean;
  /** CR 133.8 — the Champion Tag linking Legend / Champion / Signature. */
  championTag: string | null;
  /** CR 825 — Unique: only one card of that name per deck. */
  isUnique: boolean;
};

export type DeckList = {
  /** CR 103.2 / TR 402.1 — INCLUDES the Chosen Champion in constructed. */
  mainDeck: CardId[];
  chosenChampionCardId: CardId;
  legendCardId: CardId;
  runeDeck: CardId[];
  battlefields: CardId[];
};

export type DeckValidation = { legal: boolean; errors: string[] };

/**
 * Validates a deck against a format.
 *
 * **Constructed is EXACTLY 40 cards INCLUDING the Chosen Champion** (TR
 * 402.1, 601.1.b; CR 103.2 — "A Main Deck of at least 40 cards: A Chosen
 * Champion Unit, as well as Units, Gear, and Spells"). The legacy "champion
 * is card 41, uncounted" framing is dropped.
 *
 * **Sealed and draft construction is DEFERRED** — see the guard below.
 */
export function validateDeck(deck: DeckList, ctx: FormatContext, facts: (cardId: CardId) => CardFacts): DeckValidation {
  const errors: string[] = [];

  // DEFERRED — rebuild from TR 602.4 when the format is live. Sealed/draft
  // have their own identity, Unique and copy-limit rules, and TR 602.4.a.2's
  // "at least 25" does not say whether the champion counts inside that 25
  // (constructed explicitly says "including"). Do not guess it here.
  if (ctx.format !== "constructed") {
    return { legal: true, errors: [] };
  }

  // --- Size: exactly 40, champion counted inside (TR 402.1) ---
  const size = deck.mainDeck.length;
  if (ctx.mainDeckMax !== null && size !== ctx.mainDeckMin) {
    errors.push(`main deck must be exactly ${ctx.mainDeckMin} cards including the Chosen Champion (found ${size})`);
  } else if (size < ctx.mainDeckMin) {
    errors.push(`main deck must be at least ${ctx.mainDeckMin} cards (found ${size})`);
  }

  // CR 103.2 — the Chosen Champion is a member of the Main Deck, not a card beside it.
  if (ctx.championCountsInMain && !deck.mainDeck.includes(deck.chosenChampionCardId)) {
    errors.push("the Chosen Champion must be one of the main deck's cards");
  }

  // --- CR 103.2.a — the Chosen Champion must match the Legend's champion tag ---
  const legend = facts(deck.legendCardId);
  const champion = facts(deck.chosenChampionCardId);
  if (!champion.isChampion) {
    errors.push(`Chosen Champion "${champion.name}" is not a champion unit`);
  }
  if (legend.championTag && champion.championTag !== legend.championTag) {
    errors.push(`Chosen Champion "${champion.name}" does not match the Legend's champion tag "${legend.championTag}"`);
  }

  // --- CR 103.2.b — up to 3 copies per NAME (champion included) ---
  if (ctx.copyLimitApplies) {
    const byName = new Map<string, number>();
    for (const cardId of deck.mainDeck) {
      const name = facts(cardId).name;
      byName.set(name, (byName.get(name) ?? 0) + 1);
    }
    for (const [name, count] of byName) {
      if (count > 3) errors.push(`"${name}" appears ${count} times (limit 3 per name)`);
    }

    // CR 825 — Unique: only one card of that name per deck.
    if (ctx.uniqueApplies) {
      for (const [name, count] of byName) {
        const isUnique = deck.mainDeck.some((cardId) => facts(cardId).name === name && facts(cardId).isUnique);
        if (isUnique && count > 1) errors.push(`"${name}" is Unique — only one copy per deck (found ${count})`);
      }
    }
  }

  // --- CR 103.2.d — max 3 signature cards, all matching the Legend's champion tag ---
  const signatures = deck.mainDeck.filter((cardId) => facts(cardId).isSignature);
  if (signatures.length > 3) {
    errors.push(`${signatures.length} signature cards (limit 3)`);
  }
  for (const cardId of signatures) {
    const card = facts(cardId);
    if (legend.championTag && card.championTag !== legend.championTag) {
      errors.push(`signature card "${card.name}" does not match the Legend's champion tag "${legend.championTag}"`);
    }
  }

  // --- CR 103.3 — exactly 12 runes, domain-identity constrained ---
  if (deck.runeDeck.length !== 12) {
    errors.push(`rune deck must be exactly 12 runes (found ${deck.runeDeck.length})`);
  }

  // --- CR 103.1 — domain identity, set by the Champion Legend ---
  const identity = new Set(legend.domains);
  for (const cardId of [...deck.mainDeck, ...deck.runeDeck]) {
    const card = facts(cardId);
    if (card.domains.length === 0) continue; // domainless cards fit any identity
    // CR 103.1.b.4 — a MULTI-DOMAIN card needs ALL of its domains in the identity.
    const missing = card.domains.filter((domain) => !identity.has(domain));
    if (missing.length > 0) {
      errors.push(`"${card.name}" requires domain(s) ${missing.join(", ")} not in the Legend's identity`);
    }
  }

  // --- CR 103.4.c — battlefields have unique names when several are required ---
  if (deck.battlefields.length !== ctx.battlefieldCount) {
    errors.push(`must include exactly ${ctx.battlefieldCount} battlefields (found ${deck.battlefields.length})`);
  }
  const battlefieldNames = deck.battlefields.map((cardId) => facts(cardId).name);
  if (new Set(battlefieldNames).size !== battlefieldNames.length) {
    errors.push("battlefields must have unique names");
  }

  // --- TR 601.2 — every card must be legal in this format ---
  for (const cardId of deck.mainDeck) {
    if (ctx.legality(cardId) === "banned") {
      errors.push(`"${facts(cardId).name}" is banned in this format`);
    }
  }

  return { legal: errors.length === 0, errors };
}
