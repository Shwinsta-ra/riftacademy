// Combat. CR 459-466 (+ 807/814/815/826 keyword interactions).
// See docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part2.md §4,
// docs/design/riftcore-v2/RiftCore_v2_Canonical_Model_Part7.md §10.
//
// The assignment model is the biggest single correction over the legacy
// kernel. Legacy split targets into tanks/backline (conflating "ordinary" with
// "Backline") and greedily spilled leftover damage past a Tank's lethal.
// The CR instead defines a CONSTRAINT SYSTEM:
//   - lethal-first is universal (465.2.c.3), not a Tank special case;
//   - over-assignment is ILLEGAL while any unassigned unit remains
//     (465.2.c.4) — spill exists only once every unit has lethal;
//   - Tank/Backline are VALIDITY GATES over three tiers (815.1.c.2, 826.4.b),
//     not the source of spill;
//   - minimum-lethal is computed THROUGH replacement effects (465.2.c.5).
// So the kernel returns the legal SET of assignments rather than one greedy
// answer — callers (RiftIQ's validation, RiftLab's sim) need the whole space.

import { currentMight } from "./layers";
import { hasKeyword, sumKeywordValue } from "./predicates";
import type { DamageAssignment, GameObject, GameState, ObjectId, PlayerId } from "./schema";

// Keyword resolution lives in predicates.ts (printed union granted, minus
// Layer-2 removals — CR 477.2/801.3). Combat re-exports it so callers reading
// combat rules don't have to know where it lives.
export { hasKeyword, sumKeywordValue } from "./predicates";

export type CombatRole = "attacker" | "defender";

/** CR 807.1.c / 814.1.c — Might in combat, including the role-appropriate keyword bonus. Signed (477.3.c). */
export function combatMight(state: GameState, objectId: ObjectId, role: CombatRole): number {
  const object = state.objects[objectId];
  if (!object) return 0;
  const bonus =
    role === "attacker" ? sumKeywordValue(state, objectId, "Assault") : sumKeywordValue(state, objectId, "Shield");
  return currentMight(state, objectId) + bonus;
}

/** CR 423.1.b — a Stunned unit contributes NO Might in the damage step... */
export function damageContributed(state: GameState, objectId: ObjectId, role: CombatRole): number {
  const object = state.objects[objectId];
  if (!object) return 0;
  if (object.statuses.has("stunned")) return 0;
  return Math.max(0, combatMight(state, objectId, role));
}

/**
 * CR 465.2.c.2 — the dealing-step lethality predicate: damage > 0 and damage
 * >= the unit's Might. CR 423.1.c — a Stunned unit still needs FULL Might
 * damage to be killed (the asymmetry with damageContributed is deliberate).
 */
export function isKilled(damage: number, might: number): boolean {
  return damage > 0 && damage >= might;
}

/**
 * CR 465.2.c.4.a / .c.5 + 437.5 — the minimum damage that must be ASSIGNED
 * to make this unit lethal, computed THROUGH its replacement effects.
 * Prevent absorbs before damage lands (437.3), so a "prevent 3" 2-Might unit
 * needs 5 assigned. CR 437.5.b — "prevent All" is NEVER lethal.
 */
export function minimumLethal(state: GameState, objectId: ObjectId, role: CombatRole): number | "unkillable" {
  const object = state.objects[objectId];
  if (!object) return "unkillable";
  if (object.preventValue === "all") return "unkillable"; // 437.5.b
  const might = combatMight(state, objectId, role);
  const needed = Math.max(1, might - object.damage); // marked damage counts (465.2.c.4)
  const prevent = typeof object.preventValue === "number" ? object.preventValue : 0;
  return needed + prevent;
}

/** CR 815 / 826 — the three assignment tiers, in the order they must be satisfied. */
export type AssignmentTier = "tank" | "ordinary" | "backline";

/**
 * CR 465.2.c.8-.c.9 — a unit carrying BOTH Tank and Backline has contradictory
 * requirements; the ASSIGNING player picks one to satisfy, never something in
 * between, resolved per-unit. `tiebreak` expresses that choice.
 */
export function tierOf(state: GameState, objectId: ObjectId, tiebreak: "tank" | "backline" = "tank"): AssignmentTier {
  const tank = hasKeyword(state, objectId, "Tank");
  const backline = hasKeyword(state, objectId, "Backline");
  if (tank && backline) return tiebreak; // 465.2.c.8
  if (tank) return "tank"; // 815
  if (backline) return "backline"; // 826
  return "ordinary";
}

const TIER_ORDER: readonly AssignmentTier[] = ["tank", "ordinary", "backline"] as const;

/**
 * CR 465.2.c.3-.c.9 + 815.1.c.2 + 826.4.b — enumerate every LEGAL assignment
 * of `pool` damage across `targetIds`.
 *
 * Constraints enforced:
 *  - lethal-first, universal: a unit must receive lethal in full before any
 *    damage goes to a different unit (465.2.c.3);
 *  - no over-assignment while unassigned units remain (465.2.c.4);
 *  - tier validity gates: a lower tier is an invalid assignment until every
 *    unit in the higher tiers has lethal (815.1.c.2, 826.4.b);
 *  - unkillable units (prevent All, 437.5.b) can still be assigned damage
 *    (437.5) but never satisfy a tier gate, so they don't block lower tiers.
 *
 * Returns the legal set. Ties within a tier may be taken in any order
 * (465.2.c.7), so multiple orderings appear as distinct entries.
 */
export function legalDamageAssignments(
  state: GameState,
  fromPlayer: PlayerId,
  targetIds: ObjectId[],
  pool: number,
  role: CombatRole,
  tiebreaks: Record<ObjectId, "tank" | "backline"> = {}
): DamageAssignment[] {
  if (pool <= 0 || targetIds.length === 0) return [{ fromPlayer, assignments: [] }];

  const results: { targetObjectId: ObjectId; amount: number }[][] = [];

  const targets = targetIds
    .map((id) => ({ id, object: state.objects[id] }))
    .filter((t): t is { id: ObjectId; object: GameObject } => Boolean(t.object));

  function tierFor(id: ObjectId): AssignmentTier {
    const entry = targets.find((t) => t.id === id);
    return entry ? tierOf(state, id, tiebreaks[id] ?? "tank") : "ordinary";
  }

  function lethalFor(id: ObjectId): number | "unkillable" {
    return minimumLethal(state, id, role);
  }

  // Depth-first over "which unit receives lethal next", respecting tier gates.
  function search(remaining: number, satisfied: ObjectId[], acc: { targetObjectId: ObjectId; amount: number }[]) {
    // The pool is spent — this is a complete, legal assignment regardless of
    // how many units remain unsatisfied (you assign what you have, no more).
    if (remaining <= 0) {
      results.push(acc);
      return;
    }

    const unsatisfied = targets.filter((t) => !satisfied.includes(t.id));

    // Every unit has lethal — CR 465.2.c.4 now permits dumping the remainder
    // (over-assignment is only illegal WHILE unassigned units remain).
    if (unsatisfied.length === 0) {
      for (const t of targets) {
        results.push([...acc.filter((a) => a.targetObjectId !== t.id), spillOnto(acc, t.id, remaining)]);
      }
      return;
    }

    // The lowest tier that still has an unsatisfied, killable unit is the
    // only tier currently valid to assign into (815.1.c.2 / 826.4.b).
    let activeTier: AssignmentTier | null = null;
    for (const tier of TIER_ORDER) {
      const inTier = unsatisfied.filter((t) => tierFor(t.id) === tier);
      const killable = inTier.filter((t) => lethalFor(t.id) !== "unkillable");
      if (killable.length > 0) {
        activeTier = tier;
        break;
      }
      // A tier containing only unkillable units can't be satisfied, so it
      // cannot gate the tiers below it — fall through to the next tier.
    }

    if (activeTier === null) {
      // Only unkillable units remain: no further lethal assignment is possible.
      if (remaining > 0 && targets.length > 0) {
        for (const t of targets) {
          results.push([...acc.filter((a) => a.targetObjectId !== t.id), spillOnto(acc, t.id, remaining)]);
        }
      } else {
        results.push(acc);
      }
      return;
    }

    const candidates = unsatisfied.filter((t) => tierFor(t.id) === activeTier && lethalFor(t.id) !== "unkillable");

    let anyAffordable = false;
    for (const candidate of candidates) {
      const lethal = lethalFor(candidate.id) as number;
      if (lethal > remaining) continue; // can't reach lethal — see partial handling below
      anyAffordable = true;
      search(remaining - lethal, [...satisfied, candidate.id], [...acc, { targetObjectId: candidate.id, amount: lethal }]);
    }

    // CR 465.2.c.3 — if no unit in the active tier can be brought to lethal,
    // the remaining damage is assigned without killing anything. It still
    // must go to a unit in the active tier (the gate is not lifted by
    // insufficiency), and must not exceed that unit's minimum-lethal.
    if (!anyAffordable && remaining > 0) {
      for (const candidate of candidates) {
        results.push([...acc, { targetObjectId: candidate.id, amount: remaining }]);
      }
    }
  }

  search(pool, [], []);

  const unique = new Map<string, { targetObjectId: ObjectId; amount: number }[]>();
  for (const assignment of results) {
    const normalized = [...assignment].sort((a, b) => a.targetObjectId.localeCompare(b.targetObjectId));
    unique.set(JSON.stringify(normalized), normalized);
  }
  return Array.from(unique.values()).map((assignments) => ({ fromPlayer, assignments }));
}

function spillOnto(
  acc: { targetObjectId: ObjectId; amount: number }[],
  targetObjectId: ObjectId,
  extra: number
): { targetObjectId: ObjectId; amount: number } {
  const existing = acc.find((a) => a.targetObjectId === targetObjectId);
  return { targetObjectId, amount: (existing?.amount ?? 0) + extra };
}

/**
 * CR 465.2.c / .c.1 — both players assign, then all damage is DEALT
 * SIMULTANEOUSLY. Assigning is not dealing (417.1.a), so kills are determined
 * only after every assignment is known.
 */
export function resolveCombatDamage(
  state: GameState,
  assignments: DamageAssignment[],
  roles: Record<ObjectId, CombatRole>
): { state: GameState; killed: ObjectId[] } {
  const objects = { ...state.objects };
  const dealt = new Map<ObjectId, number>();

  for (const assignment of assignments) {
    for (const { targetObjectId, amount } of assignment.assignments) {
      dealt.set(targetObjectId, (dealt.get(targetObjectId) ?? 0) + amount);
    }
  }

  // CR 437.3-.4 — Prevent absorbs first and decrements; fully-prevented
  // damage was never dealt.
  for (const [objectId, rawAmount] of dealt) {
    const object = objects[objectId];
    if (!object) continue;
    let amount = rawAmount;
    let preventValue = object.preventValue;
    if (preventValue === "all") {
      amount = 0;
    } else if (typeof preventValue === "number" && preventValue > 0) {
      const absorbed = Math.min(preventValue, amount);
      amount -= absorbed;
      preventValue = preventValue - absorbed;
    }
    objects[objectId] = { ...object, damage: object.damage + amount, preventValue };
  }

  const killed: ObjectId[] = [];
  for (const objectId of dealt.keys()) {
    const object = objects[objectId];
    if (!object) continue;
    const role = roles[objectId] ?? "defender";
    const might = combatMight({ ...state, objects }, objectId, role);
    if (isKilled(object.damage, might)) killed.push(objectId);
  }

  return { state: { ...state, objects }, killed };
}

/** CR 466.1.a.1 — the Combat Cleanup inserts "Heal all Units"; combat damage clears here. */
export function healAllUnits(state: GameState): GameState {
  const objects = { ...state.objects };
  for (const [objectId, object] of Object.entries(objects)) {
    if (object.damage !== 0) objects[objectId] = { ...object, damage: 0 };
  }
  return { ...state, objects };
}

/**
 * CR 466.3 — the combat result. Winner = the designated player who ALONE has
 * units remaining; loser = the one who alone has none. No Result (466.3.d)
 * when both have units or neither does.
 */
export function determineCombatResult(
  state: GameState,
  battlefieldId: ObjectId,
  attacker: PlayerId,
  defender: PlayerId
): { winner: PlayerId | null; loser: PlayerId | null; noResult: boolean } {
  const present = (player: PlayerId) =>
    Object.values(state.objects).some(
      (o) =>
        o.controller === player &&
        o.categories.includes("unit") &&
        o.zone.kind === "battlefield" &&
        o.zone.battlefieldId === battlefieldId
    );

  const attackerPresent = present(attacker);
  const defenderPresent = present(defender);

  if (attackerPresent === defenderPresent) return { winner: null, loser: null, noResult: true }; // 466.3.d
  return attackerPresent
    ? { winner: attacker, loser: defender, noResult: false }
    : { winner: defender, loser: attacker, noResult: false };
}
