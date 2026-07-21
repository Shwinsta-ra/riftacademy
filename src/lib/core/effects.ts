// Effect-primitive library + the 15-card registry for launch. See
// RiftCore_Spec.md §7.
//
// Layering: this file imports only schema.ts (+ nothing from rulesKernel.ts,
// to avoid a cycle — rulesKernel.ts imports this file's registry to power
// applyPlay). Primitives here are deliberately dumb, mechanical mappers from
// "primitive + already-resolved target/context" to GameEvent(s). Anything
// that requires reading live GameState (conditional bonuses, target
// legality, resolving "current Might") is resolved by the caller
// (rulesKernel.applyPlay) and handed in via `ctx` — that keeps these
// primitives small and unit-testable in isolation, per §7.1.

import type { Duration, GameEvent, Keyword, KeywordGrant, PlayerId } from "./schema";

export type EffectPrimitive =
  | { op: "Damage"; amount: number }
  | { op: "BuffMight"; amount: number; duration: Duration; ifSoloAtLocation?: number }
  | { op: "DebuffMight"; amount: number; floor?: number }
  | { op: "SetMight"; toSourceUnit: true; duration: Duration }
  | { op: "GrantKeyword"; keyword: Keyword; value?: number; duration: Duration }
  | { op: "MoveUnit"; side: "own" | "opponent"; to: "chosenBattlefield" | "base" }
  | { op: "ReturnToHand"; maxMight?: number }
  | { op: "Stun" }
  | { op: "Draw"; count: number }
  | { op: "Counter"; maxCost?: number };

export type Trigger = "OnPlay" | "Deathknell" | "None";

export type EffectProgram = {
  trigger: Trigger;
  steps: EffectPrimitive[];
  repeatSteps?: EffectPrimitive[];
};

// Static, printed keyword-with-value abilities (e.g. Shen's Shield 2 + Tank)
// need no program — the kernel already resolves them in resolveCombat, once
// they're present as KeywordGrants on the unit. This entry kind is how the
// registry hands those grants to whoever instantiates the unit.
export type CardEffectEntry =
  | { kind: "program"; program: EffectProgram }
  | { kind: "static"; keywordGrants: KeywordGrant[] };

// Context a caller (rulesKernel.applyPlay) supplies once it has already
// resolved anything that needs live game state.
export type PrimitiveContext = {
  targetInstanceId?: string;
  controller: PlayerId;
  targetController?: PlayerId; // controller of the unit being targeted, if any
  isSoloAtLocation?: boolean; // BuffMight.ifSoloAtLocation condition, pre-evaluated
  setValue?: number; // SetMight's resolved value (source unit's current Might)
  destinationBattlefieldId?: string; // MoveUnit's chosen destination
};

// Maps one primitive + resolved context to the GameEvent(s) it produces.
// Returns null for primitives with no direct event (Counter is a predicate,
// evaluated via isCounterableBy, not compiled into the event stream).
export function primitiveToEvents(primitive: EffectPrimitive, ctx: PrimitiveContext): GameEvent[] {
  switch (primitive.op) {
    case "Damage": {
      if (!ctx.targetInstanceId) return [];
      return [{ type: "damageDealt", targetInstanceId: ctx.targetInstanceId, amount: primitive.amount }];
    }
    case "BuffMight": {
      if (!ctx.targetInstanceId) return [];
      const bonus = ctx.isSoloAtLocation ? primitive.ifSoloAtLocation ?? 0 : 0;
      return [
        {
          type: "mightModApplied",
          targetInstanceId: ctx.targetInstanceId,
          mod: { amount: primitive.amount + bonus, duration: primitive.duration },
        },
      ];
    }
    case "DebuffMight": {
      if (!ctx.targetInstanceId) return [];
      return [
        {
          type: "mightModApplied",
          targetInstanceId: ctx.targetInstanceId,
          mod: { amount: primitive.amount, floor: primitive.floor },
        },
      ];
    }
    case "SetMight": {
      if (!ctx.targetInstanceId || ctx.setValue === undefined) return [];
      return [
        {
          type: "mightSet",
          targetInstanceId: ctx.targetInstanceId,
          value: ctx.setValue,
          duration: primitive.duration,
        },
      ];
    }
    case "GrantKeyword": {
      if (!ctx.targetInstanceId) return [];
      return [
        {
          type: "keywordGranted",
          targetInstanceId: ctx.targetInstanceId,
          grant: { keyword: primitive.keyword, value: primitive.value, duration: primitive.duration },
        },
      ];
    }
    case "MoveUnit": {
      if (!ctx.targetInstanceId || !ctx.destinationBattlefieldId || !ctx.targetController) return [];
      return [
        {
          type: "unitMoved",
          unitInstanceId: ctx.targetInstanceId,
          to: { zone: "battlefield", battlefieldId: ctx.destinationBattlefieldId, player: ctx.targetController },
        },
      ];
    }
    case "ReturnToHand": {
      if (!ctx.targetInstanceId) return [];
      return [{ type: "unitReturnedToHand", unitInstanceId: ctx.targetInstanceId }];
    }
    case "Stun": {
      if (!ctx.targetInstanceId) return [];
      return [{ type: "unitStunned", targetInstanceId: ctx.targetInstanceId }];
    }
    case "Draw": {
      return [{ type: "cardDrawn", player: ctx.controller, count: primitive.count }];
    }
    case "Counter": {
      return [];
    }
    default: {
      const _exhaustive: never = primitive;
      return _exhaustive;
    }
  }
}

// Registry for the 15 launch cards (§7.3) — all verifiedBy: "kernel".
export const CARD_EFFECT_REGISTRY: Record<string, CardEffectEntry> = {
  "ogn-009-298": { kind: "program", program: { trigger: "None", steps: [{ op: "Damage", amount: 3 }] } }, // Hextech Ray
  "ogs-003-024": { kind: "program", program: { trigger: "None", steps: [{ op: "Damage", amount: 2 }] } }, // Incinerate
  "ogn-004-298": {
    kind: "program",
    program: { trigger: "None", steps: [{ op: "GrantKeyword", keyword: "Assault", value: 3, duration: "thisTurn" }] },
  }, // Cleave
  "ogn-043-298": {
    kind: "program",
    program: { trigger: "None", steps: [{ op: "MoveUnit", side: "opponent", to: "chosenBattlefield" }] },
  }, // Charm
  "sfd-097-221": {
    kind: "program",
    program: { trigger: "None", steps: [{ op: "BuffMight", amount: 5, duration: "thisTurn" }] },
  }, // Punch First
  "ogn-046-298": {
    kind: "program",
    program: {
      trigger: "None",
      steps: [{ op: "BuffMight", amount: 1, duration: "thisTurn", ifSoloAtLocation: 1 }],
    },
  }, // En Garde
  "ogn-045-298": { kind: "program", program: { trigger: "None", steps: [{ op: "Counter", maxCost: 4 }] } }, // Defy
  "ogn-093-298": {
    kind: "program",
    program: { trigger: "None", steps: [{ op: "DebuffMight", amount: -4, floor: 1 }] },
  }, // Smoke Screen
  "sfd-066-221": {
    kind: "program",
    program: {
      trigger: "None",
      steps: [{ op: "DebuffMight", amount: -2 }],
      repeatSteps: [{ op: "DebuffMight", amount: -2 }],
    },
  }, // Frigid Touch
  "ogn-108-298": {
    kind: "program",
    program: { trigger: "None", steps: [{ op: "SetMight", toSourceUnit: true, duration: "thisTurn" }] },
  }, // Convergent Mutation
  "ogn-169-298": {
    kind: "program",
    program: { trigger: "None", steps: [{ op: "ReturnToHand", maxMight: 3 }] },
  }, // Gust
  "unl-134-219": {
    kind: "program",
    program: {
      trigger: "None",
      steps: [{ op: "Stun" }],
      repeatSteps: [{ op: "ReturnToHand" }], // bounce only if the target is already stunned
    },
  }, // Existential Dread
  "ogn-241-298": {
    kind: "static",
    keywordGrants: [
      { keyword: "Shield", value: 2, duration: "permanent" },
      { keyword: "Tank", duration: "permanent" },
    ],
  }, // Shen, Kinkou
  "ogn-096-298": {
    kind: "program",
    program: { trigger: "Deathknell", steps: [{ op: "Draw", count: 1 }] },
  }, // Watchful Sentry
  "ogn-136-298": {
    kind: "program",
    program: { trigger: "OnPlay", steps: [{ op: "BuffMight", amount: 1, duration: "permanent" }] },
  }, // Pit Rookie
};

export function getEffectEntry(cardId: string): CardEffectEntry | undefined {
  return CARD_EFFECT_REGISTRY[cardId];
}
