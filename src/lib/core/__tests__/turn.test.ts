import { describe, expect, it } from "vitest";
import {
  advancePhase,
  beginNextTurn,
  grantFocus,
  isTimingPermitted,
  passFocus,
  passPriorityTo,
  setShowdownState,
  turnStateLabel,
} from "../turn";
import { makeTurnState } from "./fixtures";

const NORMAL = { openStateOwnTurnOnly: true, action: false, reaction: false };
const ACTION = { openStateOwnTurnOnly: false, action: true, reaction: false };
const REACTION = { openStateOwnTurnOnly: false, action: true, reaction: true }; // 813 — Reaction includes all of Action

describe("the four turn states (CR 310)", () => {
  it("labels each combination", () => {
    expect(turnStateLabel("neutral", "open")).toBe("neutralOpen");
    expect(turnStateLabel("neutral", "closed")).toBe("neutralClosed");
    expect(turnStateLabel("showdown", "open")).toBe("showdownOpen");
    expect(turnStateLabel("showdown", "closed")).toBe("showdownClosed");
  });
});

describe("speed legality is a pure function of turn state (CR 308-310)", () => {
  it("Neutral Open on your own turn permits anything (310.1)", () => {
    const turn = makeTurnState({ turnPlayer: "A", showdownState: "neutral", openState: "open" });
    expect(isTimingPermitted(turn, NORMAL, "A")).toBe(true);
  });

  it("Neutral Open on someone else's turn bars a normal-speed card (CR 381)", () => {
    const turn = makeTurnState({ turnPlayer: "A", showdownState: "neutral", openState: "open" });
    expect(isTimingPermitted(turn, NORMAL, "B")).toBe(false);
  });

  it("Neutral Closed permits Reaction ONLY (309.1.a)", () => {
    const turn = makeTurnState({ turnPlayer: "A", showdownState: "neutral", openState: "closed" });
    expect(isTimingPermitted(turn, NORMAL, "A")).toBe(false);
    expect(isTimingPermitted(turn, ACTION, "A")).toBe(false);
    expect(isTimingPermitted(turn, REACTION, "A")).toBe(true);
  });

  it("Showdown Open permits Action or Reaction, but not normal speed (308.1.a)", () => {
    const turn = makeTurnState({ turnPlayer: "A", showdownState: "showdown", openState: "open" });
    expect(isTimingPermitted(turn, NORMAL, "A")).toBe(false);
    expect(isTimingPermitted(turn, ACTION, "A")).toBe(true);
    expect(isTimingPermitted(turn, REACTION, "A")).toBe(true);
  });

  it("Showdown Closed permits Reaction ONLY (309.1.a n 308.1.a)", () => {
    const turn = makeTurnState({ turnPlayer: "A", showdownState: "showdown", openState: "closed" });
    expect(isTimingPermitted(turn, ACTION, "A")).toBe(false);
    expect(isTimingPermitted(turn, REACTION, "A")).toBe(true);
  });
});

describe("NEGATIVE timing cases (CR 308-310)", () => {
  it("CR 309.1.a — an ACTION-speed card is rejected in a Neutral Closed state", () => {
    const turn = makeTurnState({ showdownState: "neutral", openState: "closed", turnPlayer: "A" });
    expect(isTimingPermitted(turn, ACTION, "A")).toBe(false);
    expect(isTimingPermitted(turn, REACTION, "A")).toBe(true); // Reaction still legal
  });

  it("CR 309.1.a — an ACTION-speed card is rejected in a Showdown Closed state", () => {
    const turn = makeTurnState({ showdownState: "showdown", openState: "closed", turnPlayer: "A" });
    expect(isTimingPermitted(turn, ACTION, "A")).toBe(false);
  });

  it("CR 308.1.a — a NORMAL-speed card is rejected in a Showdown Open state, even on your turn", () => {
    const turn = makeTurnState({ showdownState: "showdown", openState: "open", turnPlayer: "A" });
    expect(isTimingPermitted(turn, NORMAL, "A")).toBe(false);
    expect(isTimingPermitted(turn, ACTION, "A")).toBe(true);
  });

  it("CR 381 — a normal-speed activated ability is rejected on an opponent's turn", () => {
    const turn = makeTurnState({ showdownState: "neutral", openState: "open", turnPlayer: "B" });
    expect(isTimingPermitted(turn, NORMAL, "A")).toBe(false);
    expect(isTimingPermitted(turn, NORMAL, "B")).toBe(true);
  });
});

describe("Priority and Focus are two independent slots (CR 312-313)", () => {
  it("gaining Focus also grants Priority (313.2)", () => {
    const turn = setShowdownState(makeTurnState(), "showdown");
    const next = grantFocus(turn, "B");
    expect(next.focus).toBe("B");
    expect(next.priority).toBe("B");
  });

  it("passing Priority RETAINS Focus (313.3)", () => {
    const turn = grantFocus(setShowdownState(makeTurnState(), "showdown"), "B");
    const next = passPriorityTo(turn, "A");
    expect(next.priority).toBe("A");
    expect(next.focus).toBe("B"); // retained
  });

  it("there is no Focus in Neutral states (313.5)", () => {
    const neutral = makeTurnState({ showdownState: "neutral" });
    expect(grantFocus(neutral, "B").focus).toBeNull();
  });

  it("returning to Neutral clears Focus (313.5)", () => {
    const showdown = grantFocus(setShowdownState(makeTurnState(), "showdown"), "B");
    expect(setShowdownState(showdown, "neutral").focus).toBeNull();
  });

  it("Focus passes to the next player in turn order (346)", () => {
    const turn = grantFocus(setShowdownState(makeTurnState({ turnOrder: ["A", "B"] }), "showdown"), "A");
    expect(passFocus(turn).focus).toBe("B");
  });
});

describe("phase structure (CR 315-317)", () => {
  it("walks the Beginning Phase's two steps before moving to Channel", () => {
    const turn = makeTurnState({ phase: "beginning", step: "beginningStep" });
    const atScoring = advancePhase(turn)!;
    expect(atScoring.phase).toBe("beginning");
    expect(atScoring.step).toBe("scoringStep"); // 315.2.b — Scoring is a STEP inside Beginning

    const atChannel = advancePhase(atScoring)!;
    expect(atChannel.phase).toBe("channel");
  });

  it("runs awaken -> beginning -> channel -> draw -> main -> ending", () => {
    let turn = makeTurnState({ phase: "awaken", step: undefined });
    const seen: string[] = ["awaken"];
    for (let i = 0; i < 10; i++) {
      const next = advancePhase(turn);
      if (!next) break;
      turn = next;
      if (seen[seen.length - 1] !== turn.phase) seen.push(turn.phase);
    }
    expect(seen).toEqual(["awaken", "beginning", "channel", "draw", "main", "ending"]);
  });

  it("returns null at the end of the Ending Phase — the turn is over (306)", () => {
    const turn = makeTurnState({ phase: "ending", step: "expirationStep" });
    expect(advancePhase(turn)).toBeNull();
  });
});

describe("turn handoff and Additional Turns (CR 306, 734-738)", () => {
  it("passes to the next player in turn order", () => {
    const turn = makeTurnState({ turnPlayer: "A", turnOrder: ["A", "B"] });
    expect(beginNextTurn(turn).turnPlayer).toBe("B");
  });

  it("consumes an Additional Turn WITHOUT changing turn order (737)", () => {
    const turn = makeTurnState({ turnPlayer: "A", turnOrder: ["A", "B"], additionalTurns: ["A"] });
    const next = beginNextTurn(turn);
    expect(next.turnPlayer).toBe("A"); // A takes the extra turn
    expect(next.additionalTurns).toEqual([]);

    // Turn order itself is untouched — B is still next after A's extra turn.
    expect(beginNextTurn(next).turnPlayer).toBe("B");
  });

  it("resets to the Awaken Phase in a Neutral Open state", () => {
    const turn = makeTurnState({ phase: "ending", showdownState: "showdown", openState: "closed" });
    const next = beginNextTurn(turn);
    expect(next.phase).toBe("awaken");
    expect(next.showdownState).toBe("neutral");
    expect(next.openState).toBe("open");
    expect(next.focus).toBeNull();
  });
});
