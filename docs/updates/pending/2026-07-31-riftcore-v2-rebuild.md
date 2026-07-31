## Thread/topic: riftcore-v2

**Sections likely affected:** 2 (shipped), 3 (feature tracker), 6 (standing rules), 9 (log)

**Team-facing:**

RiftCore's rules model has been rebuilt from scratch (Phase 3) against the Core Rules RUP4 (2026-07-16) and Tournament Rules RUP4. One consolidated PR into `integration`, diff limited to `src/lib/core/**` and `docs/**`. **Nothing was persisted at the old model, so all breaking changes were free now and would have been expensive later.**

**What landed:**
- All 9 design docs at `docs/design/riftcore-v2/` (canonical model Parts 1–7, Phase 2 diff, Phase 3 instructions).
- All 4 rules sources at `docs/rules/` (Core + Tournament RUP4, PDF + extracted `.txt` for grepping). Every CR citation in the code resolves to a file in the repo.
- Nine kernel modules: `schema.ts` (rebuilt), `layers.ts`, `turn.ts`, `chain.ts`, `abilities.ts`, `actions.ts`, `combat.ts`, `scoring.ts`, `format.ts`, plus a slimmed `rulesKernel.ts`.
- `tsc --noEmit` green; 1138 tests passing across 16 files; `expo export --platform web` builds clean.

**The structural corrections that matter most to other modules:**
- **Layers replace the might-chain.** Effects apply in three ordered layers iterated to a fixed point (CR 476), with *snapshotting* (477.3.b) rather than per-effect floors. Set-Might is Layer 1 (477.1.a.1) and applies before all arithmetic regardless of cast order.
- **The winning-line taxonomy is gone.** Restrictions gate **Conquer only** — Hold is unrestricted (471.1.a.1) — keyed on the player's *current* total, condition is "Scored every Battlefield this turn," and failing it **draws a card** (471.1.b.1). `pointsAtTurnStart` is deleted.
- **Win check is at Cleanup with strict majority** (472) — ties do not win, and it is not instantaneous.
- **Damage assignment is a three-tier constraint system**, not two-tier spill. Over-assignment is illegal while unassigned units remain (465.2.c.4); Tank/Backline are *validity gates* (815.1.c.2, 826.4.b); minimum-lethal is computed through replacement effects (465.2.c.5). `legalDamageAssignments()` returns the legal *set*, not one greedy answer.
- **Units, Gear and Adds resolve immediately on finalization** (337.2) and are therefore **never counterable**.
- **Per-format legality** replaces the single `banned1v1` boolean — the 2v2 ban list (Master Yi is 1v1-legal, 2v2-banned) was structurally unrepresentable before.
- New subsystems that did not exist at all: Priority/Focus, HOT FEPR + Outstanding Tasks, the 7-step Cleanup, the ability taxonomy, replacement effects, 26 of the 32 Game Actions, XP, the Rune Pool, Burn Out, Attachment/Inactive, Facedown Zones, Additional Turns.

**Test disposition:** dropped the might-chain floor/order test (`seq-mind-1`), all six `canScoreWinningPoint` tests, the `pointsAtTurnStart` phaseChange test, both Tank-spill tests, and all of `effects.test.ts` — every one encoded behavior the CR contradicts. The pipeline/capture suites (PR #134/#145 work) survive as rewritten equivalents against the new model.

**Anything another thread working today should know before touching related code:**

- **`src/lib/core/schema.ts` is a full replacement, not a patch.** `UnitState`, `ObjectInstance`, `MightMod`, `WinningLine`, `EffectPrimitive`, `TurnPhase`, `Speed`, `ZoneKind`, and the old 2-value `Privacy` are **deleted**. The unified type is now `GameObject`. `PlayerState` no longer holds `hand`/`deck`/`discard`/`base`/`runes` arrays — zone membership lives on each object's `zone` field, and `GameState.objects` is the single keyed store. If your module imported any deleted type, it needs re-pointing; nothing outside `src/lib/core/` did at the time of this PR (verified by grep).
- **`CURRENT_SCHEMA_VERSION` is now 2, and there is deliberately no v1 → v2 migration.** A v1 stream is not mechanically liftable (v1's `instanceId` model has no CR 124 zone-change semantics, and `mightModApplied`/`mightSet` encode the chain-fold model Layers replaces). `migrate(events, 1, 2)` throws rather than fabricating a v2 stream. Nothing is persisted at v1, so this is safe — but do not write a v1 capture expecting it to load.
- **`GameEvent` variants are renamed to CR vocabulary** (`cardPlayed` → `played`, `unitKilled` → `killed`, `cardRevealed` → `revealed`, etc.) and there is now roughly one variant per Game Action. RiftNotes' capture template maps to the new names.
- **`CARD_EFFECT_REGISTRY` is intentionally empty.** Phase 4 re-authors all 15 legacy card programs against the 32 Game Actions and the ability taxonomy; it is blocked on the Supabase card inventory. Phase 4's entry shape is a set of classified `Ability` objects, **not** a flat step list — Part 4 §7 register item 7 requires re-classifying every modeled card by ability type first.
- **App features that depended on the old rules model (puzzle validation paths) may be non-functional.** That is expected and accepted for this PR; they are re-pointed in Phase 4.
- **The 14-question open adjudications register stays quarantined.** Every prior ruling on ordering-dependent Might puzzles, Tank-spill/over-assignment, instant-win-on-point, and winning lines must be re-derived against this model before being trusted again.

**New standing rule or convention worth capturing:**

The **v2 naming charter is binding on all future RiftCore work**: CR nouns/verbs only; "Play" only in the CR's sense (the legacy `Play` type is now `CandidateAction`); the 32 Game Actions are the only effect verbs; every exported symbol carries a `/** CR nnn */` citation; and where the CR distinguishes, the code distinguishes (`Move` ≠ `Recall`, `Banish` ⊄ `Kill`, `Attach` ⊄ `Move`, `Assign` ≠ `Deal`, `Hide` ⊄ `Play`). Note especially that **`Buff` means "place a Buff counter" (CR 426), not arbitrary Might arithmetic** — the legacy `BuffMight` name collided with a real CR mechanic, and arbitrary arithmetic is now a Layer-3 `ArithmeticOp`.
