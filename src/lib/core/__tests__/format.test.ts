import { describe, expect, it } from "vitest";
import { cardLegality, makeFormatContext, teamTurnOrder } from "../format";

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
