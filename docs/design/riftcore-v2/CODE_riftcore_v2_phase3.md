# Code task — RiftCore v2 rebuild (Phase 3, ONE consolidated PR)

**Attach (9 files):** this instruction + `RiftCore_v2_Canonical_Model_Part1..7.md` + `RiftCore_v2_Phase2_Diff.md`.
Commit all eight design docs to `docs/design/riftcore-v2/`.

**Also commit the rules sources** (they are now the most load-bearing documents in the project; every citation below must resolve to a file in the repo):
```
docs/rules/Riftbound_Core_Rules_RUP4.pdf
docs/rules/Riftbound_Tournament_Rules_RUP4.pdf
docs/rules/core-rules-RUP4.txt          (extracted, greppable — provided)
docs/rules/tournament-rules-RUP4.txt    (extracted, greppable — provided)
```

Branch: `feature/riftcore-v2` off `integration`. **One PR.** Large by design — the whole point is a single consolidated break rather than death by a thousand patches.

---

## 0. What this is

A **100% clean-room rebuild** of RiftCore's rules model, derived from the Core Rules (RUP4, 2026-07-16) and Tournament Rules. Nothing is persisted yet, so breaking changes are free **now** and expensive later. Read `Part7` (the type spec) and `Phase2_Diff` (what to keep/drop/build) before writing code.

**Naming charter — binding, non-negotiable:**
1. CR nouns/verbs only: `Chain`, `PendingChainItem`, `FinalizedChainItem`, `Finalize`, `Resolve`, `Cleanup`, `OutstandingTask`, `Priority`, `Focus`, `Showdown`, `AwakenPhase`, `ScoringStep`, `Channel`, `Recall`, `Layer`, `RunePool`, `TopMostCard`.
2. **"Play" only as the CR uses it** (349–353, 419). The legacy `Play` type is renamed **`CandidateAction`**.
3. The **32 Game Actions (CR 413–444)** are the only effect verbs. Notably `Buff` means *place a Buff counter* (426), **not** arbitrary Might arithmetic.
4. Every exported symbol carries a `/** CR nnn */` doc comment.
5. Where the CR distinguishes, the code distinguishes: `Move` ≠ `Recall` (456) · `Banish` ⊄ `Kill` (427.2.a) · `Attach` ⊄ `Move` (434.4.a) · `Assign` ≠ `Deal` (417.1.a) · `Hide` ⊄ `Play` (811.1.c.1).

## 1. Structure

```
src/lib/core/
  schema.ts        # types per Part 7 §1–§10
  layers.ts        # NEW — CR 473–480
  turn.ts          # NEW — phases/states/Priority/Focus, CR 300–317
  chain.ts         # NEW — HOT FEPR + Tasks + Cleanup, CR 318–348
  abilities.ts     # NEW — ability taxonomy + replacement effects, CR 360–406
  actions.ts       # NEW — the 32 Game Actions, CR 413–444
  combat.ts        # NEW — CR 459–466
  scoring.ts       # NEW — CR 467–472
  format.ts        # NEW — FormatContext, TR 104.1 / 601–603
  rulesKernel.ts   # slimmed: orchestration + surviving predicates
  cards.ts         # unchanged
  migrate.ts       # unchanged
  index.ts         # re-exports
```
**Keep untouched:** the match-capture/pipeline layer from PR #134/#145 — `CapturedMatch`, `CaptureTag`, `captureProfile`, `gameId`, `reviewerId`, `sourceRef`, `turnSourceRefs`, `UnrecognizedEvent`, `foldEvents`, `materialize`, `ReconstructedMatch`, `StreamStatus`, `GateResult`, `checkClean`, `readSnapshot`, `CURRENT_SCHEMA_VERSION`, `migrate`. Those are pipeline concerns, not rules-model concerns, and their tests must stay green.

## 2. Build (all types per Part 7 — that doc is the spec; this is the checklist)

**2.1 Primitives & zones** — `Domain`; **`PowerSymbol` keeping `[C]`/`[A]` symbolic** (805.1.a.1 — do not pre-resolve); `Cost`; full `Zone` union incl. chain/championZone/runeDeck/legendZone/facedownZone, `trash` (not "discard"), `mainDeck` (not "deck"); `Location` = base|battlefield only (197); `Privacy` = secret|private|public (128); `PlayerId` widened to `string`.

**2.2 GameObject** — per Part 7 §3, incl. `buffCount: 0|1` (702.3), `preventValue`, `attachedTo`/`attachments`, `counters`, `grantedKeywords` with `Duration` (default `whileInZone`, 801.3.a.3). **New `ObjectId` minted on any zone change to/from a Non-Board Zone, wiping all temporary modifications (124).**

**2.3 Keywords** — the 25-keyword union + `KeywordDef` table carrying `class` and `stacking`. Remove `Buff`/`Burn`/`Predict`/`Stun`/`Mighty` from the keyword union (they are Game Actions / a derived predicate). Add `Action`, `Reaction`, `Empowered`. `isMighty()` = Might ≥ 5 (708), non-board zones use **printed** Might (711).

**2.4 `layers.ts`** — three layers (Trait → Ability → Arithmetic), **iterated to a fixed point** (476). **Snapshotting** for non-passive limited arithmetic (477.3.b); passives never snapshot. **Increase-by-negative → 0** (477.3.c). Set-Might is **Layer 1** (477.1.a.1).

**2.5 `turn.ts`** — `Phase`/`Step` = awaken → beginning(beginningStep, scoringStep) → channel → draw → main → ending(endingStep, expirationStep). Four turn states (310). `Priority` and `Focus` as **two independent slots** with the grant/retain rules of 312–313.

**2.6 `chain.ts`** — HOT FEPR (334): `handleOutstandingTasks` → `finalize` (**FIFO**, 337.1.b) → `execute` → `passPriority` → `resolveTop` (**LIFO**, 340.1). **Units, Gear, and resource-Adds resolve immediately on finalization (337.2, 400.2) — never counterable.** `runCleanup` implements the **seven-step order of 323** exactly: (1) win check, (2) designation sync, (3a) Deathknell noted **before** (3b) lethal kills, (4) control loss, (5) recall sweep + hidden-card purge, (6) Showdown staging, (7) Combat staging. Re-run to a fixed point (322). Showdown flow per 341–348 incl. the Focus-pass exceptions (346.1).

**2.7 `abilities.ts`** — the seven ability kinds (Part 7 §5). **Replacement effects as a first-class subsystem** (367–375): event semantics (replacing an event means the generating action never occurred, 370.1.a.1), simultaneity (370.1.a.2), ordering by the acted-upon object's controller with turn-order tiebreak (372–373), usage limits (371). Trigger conditions must respect the **adjacency rule** (383.2.a.1).

**2.8 `actions.ts`** — all 32 CR actions. Non-obvious ones to get right: **Burn Out** (431 — recycle trash randomized → **an opponent gains a point** → repeat; points after the first are unpreventable, 431.3.b); **Prevent** as a decrementing tracked value where `"all"` is never lethal (437); **Buff** capped at 1 where re-buffing means **the buff did not happen** (426.1.c); **Stun** cannot re-apply and re-stunning fires no trigger (423.1.a.1), **clearing at end-of-turn Cleanup step 3d** (423.1.a.2); **Recycle** to deck bottom, Main randomized / Rune owner-ordered (416.5); **Attach/Detach** per 434–435 + 716–719.

**2.9 `combat.ts`** — Attacker = **the contest-applier** (464.2.c.1). `legalDamageAssignments()` returns the **legal set** under: lethal-first universal (465.2.c.3); **no over-assignment while unassigned units remain** (465.2.c.4); **three tiers Tank → ordinary → Backline** as validity gates (815.1.c.2, 826.4.b) — *not* the legacy two-tier split; contradictory Tank+Backline → assigner picks one (465.2.c.8); **replacement effects apply at assignment**, minimum-lethal computed through them (465.2.c.5, .c.4.a). Resolution Step inserts **"Heal all Units"** and the recall-attackers rule (466.1.a).

**2.10 `scoring.ts`** — `resolveScore()` per **471**: restrictions gate **Conquer only**; **Hold is unrestricted** (471.1.a.1); at current total ≥ VictoryScore − 1, Conquer grants the Final Point only if the player **Scored every Battlefield this turn**, else **draw a card** (471.1.b.1). `checkWin()` per **472**: `points ≥ victoryScore && points > every opponent`, called as Cleanup step 1.

**2.11 `format.ts`** — `FormatContext` per Part 7 §9 (mode, format, victoryScore, battlefieldCount, mainDeckMin, championCountsInMain, uniqueApplies, copyLimitApplies, per-format `legality`). Kernel entry points take it; nothing hardcodes 1v1 constructed.

**2.12 `PlayerState`** — add **`xp: number`** (728–733) and **`runePool`** (165–167, empties at Main-Phase start **and** turn end). **Delete `pointsAtTurnStart`.**

## 3. Delete outright
`resolveMightChain`, `MightMod`, `UnitState.mightMods`, `ChainItem.mightMod`, `WinningLine`, `canScoreWinningPoint`, `PlayerState.pointsAtTurnStart`, `EffectPrimitive`, `TurnPhase`, `Speed`, `Privacy`(old 2-value), `ZoneKind`(old). Reduce `CARD_EFFECT_REGISTRY` to an empty typed registry with a comment pointing at Phase 4.

## 4. Tests
- **DROP** (rebuild as-if-missing, per the diff §4): the might-chain floor/order test (`seq-mind-1`), all six `canScoreWinningPoint` tests, the `pointsAtTurnStart` phaseChange test, both Tank-spill tests, and **all of `effects.test.ts`**.
- **KEEP GREEN**: `matchSchema.test.ts`, `matchPipeline.test.ts`, `captureProfile.test.ts`, `cards.test.ts`, and the surviving `rulesKernel` predicates (negative Might, `isKilled`, Assault/Shield summing, `canAfford` ×3).
- **WRITE NEW**, each citing its CR rule: layers fixed-point + snapshotting + increase-by-negative; the four turn states gating speed; Priority/Focus grant/retain; FEPR FIFO-finalize/LIFO-resolve + immediate-resolve for Units/Gear/Adds; the seven-step Cleanup order (esp. win-check-first and Deathknell-before-kill); `resolveScore` Conquer-restricted/Hold-unrestricted/draw-consolation; `checkWin` strict majority; three-tier damage assignment + no-over-assignment; Burn Out point donation; Buff cap + already-buffed-is-a-no-op; Stun lifecycle; Recycle ordering; XP gain/spend.

## 5. Hard boundaries
- **Do NOT author card effect programs.** Phase 4 is **blocked on the Supabase card inventory** (Ashwin's side) and is explicitly out of scope for this PR.
- **Do NOT build RiftEngine** (`inferEvents`, cascade, corpus) — separate module; it imports `core/`, never the reverse.
- **Do NOT notify or adapt for other modules.** Downstream alignment is their job, after this lands (standing instruction).
- Do not touch `src/data/cards.json` or app runtime code.

## 6. Expected state on completion
`tsc --noEmit` green; new + retained tests green; app builds. **App features that depended on the old rules model (puzzle validation paths) may be non-functional** — that is expected and accepted for this PR; they are re-pointed in Phase 4.

## 7. Done =
Branch `feature/riftcore-v2`; all 8 design docs in `docs/design/riftcore-v2/`; all 4 rules sources in `docs/rules/`; the module structure of §1; §3 deletions complete; §4 test disposition applied; PR opened into `integration` with a diff limited to `src/lib/core/**` and `docs/**`.
