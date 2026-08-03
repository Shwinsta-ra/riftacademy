import { describe, expect, it } from "vitest";
import { cardLegality, makeFormatContext, teamTurnOrder, validateDeck } from "../format";
import type { CardFacts, DeckList } from "../format";

describe("per-format legality (TR 601.2 / 602.1.b)", () => {
  // The legacy schema had a single `banned1v1` boolean and therefore could
  // not represent a card legal in 1v1 but banned in 2v2. Master Yi is exactly
  // that case (Part 6 §3).
  it("Master Yi is 1v1-LEGAL but 2v2-Constructed BANNED", () => {
    expect(cardLegality("ogs-019-024", "1v1", "constructed")).toBe("legal");
    expect(cardLegality("ogs-019-024", "2v2", "constructed")).toBe("banned");
  });

  it("Standard bans apply in both 1v1 and 2v2 constructed", () => {
    expect(cardLegality("ogn-177-298", "1v1", "constructed")).toBe("banned");
    expect(cardLegality("ogn-177-298", "2v2", "constructed")).toBe("banned");
  });

  it("a constructed-banned card stays LIMITED-legal unless banned there too (TR 602.1.b)", () => {
    expect(cardLegality("ogn-177-298", "1v1", "sealed")).toBe("legal");
    expect(cardLegality("ogn-177-298", "1v1", "draft")).toBe("legal");
  });

  it("an unlisted card is legal everywhere", () => {
    expect(cardLegality("ogn-001-298", "1v1", "constructed")).toBe("legal");
  });
});

describe("format context defaults (TR 402.1 / 602.4)", () => {
  it("1v1 constructed: 40-card main deck INCLUDING the champion, victory score 8", () => {
    const ctx = makeFormatContext("1v1", "constructed");
    expect(ctx.mainDeckMin).toBe(40);
    expect(ctx.championCountsInMain).toBe(true); // TR 402.1 "including a chosen champion"
    expect(ctx.victoryScore).toBe(8);
    expect(ctx.uniqueApplies).toBe(true);
  });

  it("2v2 raises the victory score to 11", () => {
    expect(makeFormatContext("2v2", "constructed").victoryScore).toBe(11);
  });

  it("sealed: >=25 cards, Unique SUSPENDED, copy limits off (TR 602.4.a)", () => {
    const ctx = makeFormatContext("1v1", "sealed");
    expect(ctx.mainDeckMin).toBe(25);
    expect(ctx.uniqueApplies).toBe(false); // 602.4.a.6.a
    expect(ctx.copyLimitApplies).toBe(false);
  });

  it("draft: >=20 cards (TR 602.4.b)", () => {
    expect(makeFormatContext("1v1", "draft").mainDeckMin).toBe(20);
  });

  it("wires legality through to the context", () => {
    const ctx = makeFormatContext("2v2", "constructed");
    expect(ctx.legality("ogs-019-024")).toBe("banned");
  });
});

describe("2v2 turn order (TR 603.7.a)", () => {
  it("alternates teams: TeamA-P1 -> TeamB-P1 -> TeamA-P2 -> TeamB-P2", () => {
    expect(teamTurnOrder(["a1", "a2"], ["b1", "b2"])).toEqual(["a1", "b1", "a2", "b2"]);
  });
});

describe("validateDeck — constructed (CR 101-103, TR 402.1)", () => {
  const constructed = makeFormatContext("1v1", "constructed");

  // A tiny synthetic catalog. "champ" is the Chosen Champion; filler cards are
  // named f0..fN so the 3-copies-per-name limit isn't tripped incidentally.
  const facts = (cardId: string): CardFacts => {
    if (cardId === "legend") {
      return { name: "Test Legend", domains: ["Mind"], isChampion: false, isSignature: false, championTag: "yi", isUnique: false };
    }
    if (cardId === "champ") {
      return { name: "Test Champion, Chosen", domains: ["Mind"], isChampion: true, isSignature: false, championTag: "yi", isUnique: false };
    }
    if (cardId.startsWith("bf")) {
      return { name: `Battlefield ${cardId}`, domains: [], isChampion: false, isSignature: false, championTag: null, isUnique: false };
    }
    if (cardId.startsWith("rune")) {
      return { name: "Mind Rune", domains: ["Mind"], isChampion: false, isSignature: false, championTag: null, isUnique: false };
    }
    // Reprint pairs: SAME name, different set-prefixed cardIds — the shape TR
    // 601.2.a exists for ("legal if it has the same name as a card from a
    // legal set"). Every name-keyed rule must collapse these two ids into one.
    if (cardId === "ogn-twin" || cardId === "ogs-twin") {
      return { name: "Reprinted Card, Twin", domains: ["Mind"], isChampion: false, isSignature: false, championTag: null, isUnique: false };
    }
    if (cardId === "ogn-uniq" || cardId === "ogs-uniq") {
      return { name: "Singular Relic, Only One", domains: ["Mind"], isChampion: false, isSignature: false, championTag: null, isUnique: true };
    }
    if (cardId === "ogs-champ") {
      // A reprint of "champ" — same name, different id.
      return { name: "Test Champion, Chosen", domains: ["Mind"], isChampion: true, isSignature: false, championTag: "yi", isUnique: false };
    }
    if (cardId === "offDomain") {
      return { name: "Off Domain Card", domains: ["Fury"], isChampion: false, isSignature: false, championTag: null, isUnique: false };
    }
    if (cardId === "multiDomain") {
      return { name: "Multi Domain Card", domains: ["Mind", "Fury"], isChampion: false, isSignature: false, championTag: null, isUnique: false };
    }
    return { name: `Filler ${cardId}`, domains: ["Mind"], isChampion: false, isSignature: false, championTag: null, isUnique: false };
  };

  /** A legal 40-card constructed deck whose 40th card is the Chosen Champion. */
  function baseDeck(fillerCount = 39): DeckList {
    return {
      mainDeck: [...Array.from({ length: fillerCount }, (_, i) => `f${i}`), "champ"],
      chosenChampionCardId: "champ",
      legendCardId: "legend",
      runeDeck: Array.from({ length: 12 }, (_, i) => `rune${i}`),
      battlefields: ["bf1", "bf2", "bf3"],
    };
  }

  it("a 40-card deck whose 40th card is the Chosen Champion is LEGAL", () => {
    const result = validateDeck(baseDeck(39), constructed, facts);
    expect(result.errors).toEqual([]);
    expect(result.legal).toBe(true);
  });

  it("41 cards INCLUDING the champion is ILLEGAL — the champion is not card 41", () => {
    // This is the ruling: constructed is exactly 40 *including* the Chosen
    // Champion, so 39 filler + champion is legal and 40 filler + champion is not.
    const result = validateDeck(baseDeck(40), constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/exactly 40/);
  });

  it("39 cards is ILLEGAL", () => {
    expect(validateDeck(baseDeck(38), constructed, facts).legal).toBe(false);
  });

  it("the Chosen Champion must actually be in the main deck (CR 103.2)", () => {
    const deck = { ...baseDeck(39), mainDeck: Array.from({ length: 40 }, (_, i) => `f${i}`) };
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Chosen Champion must be one of the main deck/);
  });

  it("rejects more than 3 copies of a name (CR 103.2.b)", () => {
    const deck = baseDeck(39);
    deck.mainDeck = [...Array.from({ length: 4 }, () => "dupe"), ...Array.from({ length: 35 }, (_, i) => `f${i}`), "champ"];
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/limit 3 per name/);
  });

  it("allows exactly 3 copies of a name", () => {
    const deck = baseDeck(39);
    deck.mainDeck = [...Array.from({ length: 3 }, () => "dupe"), ...Array.from({ length: 36 }, (_, i) => `f${i}`), "champ"];
    expect(validateDeck(deck, constructed, facts).legal).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Reprints: same name, different cardId (TR 601.2.a)
  // -------------------------------------------------------------------------

  it("2 + 2 across a reprint pair is 4 copies of ONE name — ILLEGAL (CR 103.2.b)", () => {
    // The exact failure an id-keyed tally misses: it reads "2 and 2" and passes.
    const deck = baseDeck(39);
    deck.mainDeck = ["ogn-twin", "ogn-twin", "ogs-twin", "ogs-twin", ...Array.from({ length: 35 }, (_, i) => `f${i}`), "champ"];
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/"Reprinted Card, Twin" appears 4 times \(limit 3 per name\)/);
  });

  it("2 + 1 across a reprint pair is 3 copies — LEGAL", () => {
    const deck = baseDeck(39);
    deck.mainDeck = ["ogn-twin", "ogn-twin", "ogs-twin", ...Array.from({ length: 36 }, (_, i) => `f${i}`), "champ"];
    expect(validateDeck(deck, constructed, facts).errors).toEqual([]);
  });

  it("Unique counts across printings — one OGN + one OGS is two of that name (CR 825)", () => {
    const deck = baseDeck(39);
    deck.mainDeck = ["ogn-uniq", "ogs-uniq", ...Array.from({ length: 37 }, (_, i) => `f${i}`), "champ"];
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/"Singular Relic, Only One" is Unique/);
  });

  it("a REPRINT of the Chosen Champion satisfies the in-deck requirement (CR 103.2.a.3)", () => {
    // Registered "champ"; the deck runs the OGS printing. Same name, so under
    // 103.2.a.3 it IS the Chosen Champion. An id comparison rejects this deck.
    const deck = { ...baseDeck(39), mainDeck: [...Array.from({ length: 39 }, (_, i) => `f${i}`), "ogs-champ"] };
    expect(validateDeck(deck, constructed, facts).errors).toEqual([]);
  });

  it("requires exactly 12 runes (CR 103.3)", () => {
    const deck = { ...baseDeck(39), runeDeck: Array.from({ length: 11 }, (_, i) => `rune${i}`) };
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/exactly 12 runes/);
  });

  it("rejects a card outside the Legend's domain identity (CR 103.1)", () => {
    const deck = baseDeck(39);
    deck.mainDeck = ["offDomain", ...Array.from({ length: 38 }, (_, i) => `f${i}`), "champ"];
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Fury/);
  });

  it("a MULTI-DOMAIN card needs ALL its domains in identity, not just one (CR 103.1.b.4)", () => {
    // The Legend is Mind-only; a Mind+Fury card shares Mind but is still illegal.
    const deck = baseDeck(39);
    deck.mainDeck = ["multiDomain", ...Array.from({ length: 38 }, (_, i) => `f${i}`), "champ"];
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Multi Domain Card/);
  });

  it("rejects a banned card (TR 601.2)", () => {
    const deck = baseDeck(39);
    deck.mainDeck = ["ogn-177-298", ...Array.from({ length: 38 }, (_, i) => `f${i}`), "champ"];
    const result = validateDeck(deck, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/banned/);
  });

  it("requires the format's battlefield count, with unique names (CR 103.4.c)", () => {
    const tooFew = { ...baseDeck(39), battlefields: ["bf1", "bf2"] };
    expect(validateDeck(tooFew, constructed, facts).legal).toBe(false);

    const duplicated = { ...baseDeck(39), battlefields: ["bf1", "bf1", "bf2"] };
    const result = validateDeck(duplicated, constructed, facts);
    expect(result.legal).toBe(false);
    expect(result.errors.join(" ")).toMatch(/unique names/);
  });

  it("sealed and draft construction is DEFERRED — validation passes rather than guessing", () => {
    // TR 602.4 rules are not implemented; that format is not live yet, and
    // whether sealed's 25-card minimum includes the champion is unresolved.
    const sealed = makeFormatContext("1v1", "sealed");
    expect(validateDeck(baseDeck(10), sealed, facts).legal).toBe(true);
  });
});
