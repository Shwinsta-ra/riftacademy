# RiftCore v2 — Canonical Model · Part 1: Structural Spine

**Source of authority:** Riftbound Core Rules, Last Updated 2026-07-16 ("RUP4") — verified to include the full Vendetta rules update (Empower/Flow/Burn/Skip/untargetability all present; patch notes are the communication layer over this document).
**Method:** 100% clean-room. Derived from the CR text only; the legacy `src/lib/core/` was not consulted during design. Every element cites its rule number. Legacy comparison happens only in the Phase 2 diff.
**Status:** Part 1 of N — the structural spine. §9 lists what later parts cover.

---

## 1. Naming charter (governs all v2 code)

1. **CR terms are the only vocabulary.** Types, functions, fields, and tests use the rulebook's exact nouns/verbs: `Chain`, `PendingItem`, `Finalize`, `Resolve`, `Cleanup`, `OutstandingTask`, `Priority`, `Focus`, `Showdown`, `AwakenPhase`, `ScoringStep`, `Channel`, `Recall`, `Layer`, `Snapshot`.
2. **"Play" is used only as the CR uses it** (CR 349–353 and the three defined senses from the Vendetta update: play-as-game-action, play-in-trigger = resolve, play-elsewhere = finalized). Nothing else may be called "play." The legacy `Play` type name is retired; a candidate move at a decision point gets a non-CR-colliding name in the rebuilt decision layer (proposal: `CandidateAction` — uses CR's "Action" family but cannot be confused with the Action keyword because it's namespaced by `Candidate`).
3. **Game Actions (CR 412–444) are the canonical effect verbs.** No invented primitive names. `Buff` not `BuffMight`; `Kill` not `KillUnit`; `Recall` not `ReturnToBase`. Where the CR distinguishes (Move ≠ Recall), the code distinguishes.
4. Every exported symbol carries a doc-comment citing its rule (e.g. `/** CR 313 */`).

## 2. Turn structure (CR 300–324) — verified in full

```
Turn (CR 301)
├── Start of Turn (315)
│   ├── Awaken Phase (315.1)        — Task: Turn Player readies all their readyable objects (415)
│   ├── Beginning Phase (315.2)
│   │   ├── Beginning Step (315.2.a)   — "at the start of Beginning Phase" effects fire here
│   │   └── Scoring Step (315.2.b)     — Task: Turn Player HOLDS all Battlefields they Control (467)
│   │                                    (teams: teammate-controlled BFs disqualified this turn, 315.2.b.3)
│   ├── Channel Phase (315.3)       — Task: channel 2 runes from Rune Deck (430); fewer if deck short
│   └── Draw Phase (315.4)          — Task: draw (413)
├── Main Phase (316)
└── Ending Phase (317)
```
- Phases are **rigid**; actions within are flexible (303). Turn Player defined at 304; turn passes at End (306).
- **Cleanups (318–324):** invoked at defined times (319); while a Cleanup runs, Chain Items cannot Finalize/Resolve (320) and vice versa (321); Cleanup events can queue further Cleanups (322); Cleanup Tasks become Outstanding in a defined order (323); Special Cleanups exist (324). Cleanup is where contested-status removal, win checks (472), and combat initiation (460) live.

## 3. Turn States, Priority, Focus (CR 307–313) — verified in full

Four states = (Neutral | Showdown) × (Open | Closed):

| State | Definition | What may be played |
|---|---|---|
| Neutral Open (310.1) | no Showdown/Combat, no Chain | anything (with Priority, on your turn) |
| Neutral Closed (310.2) | no Showdown/Combat, Chain exists | **Reaction only** (309.1.a) |
| Showdown Open (310.3) | Showdown/Combat, no Chain | **Action or Reaction** (308.1.a) |
| Showdown Closed (310.4) | Showdown/Combat + Chain | **Reaction only** (309.1.a ∩ 308.1.a) |

This is the formal model behind card Speeds — speed legality is a pure function of turn state.

- **Priority (312):** the singular exclusive right to take Discretionary Actions. Granted: Neutral Open on your Main Phase (312.2.a); on gaining Focus (312.2.b); when you control the next chain item after finalization completes (312.2.c); when the prior holder passes in a Closed state (312.2.d).
- **Focus (313):** Showdown-specific permission. Gaining Focus grants Priority (313.2); **passing Priority retains Focus** (313.3); no Focus in Neutral states (313.5). Priority ≠ Focus — two distinct trackable slots, each held by ≤1 player.
- Limited Actions are always takeable when instructed, regardless of Priority (312.1.b.1). Discretionary vs Limited actions: CR 410.

## 4. The Chain (CR 325–348) — headers verified; detail fill in Part 2

- The Chain is a **Non-Board Zone that temporarily exists** while any item is on it (328, 330). Items enter as **Pending Chain Items** (329).
- Handling loop (332–340): when no Outstanding Tasks and pending items exist → **Step 1 Finalize → Step 2 Execute → Step 3 Pass → Step 4 Resolve** (337–340). Precise step semantics = Part 2 priority read.
- **Showdowns (341–348):** a Showdown begins when Control of a Battlefield is Contested during a Cleanup (344); the contest-applier acts per 345; ends when all pass Focus without playing (348) or when resolved. Combat is a Showdown variant (§6).
- Windows of Opportunity: 326.

## 5. Game Actions — the canonical effect vocabulary (CR 412–444)

Two classes (410): **Discretionary** (chosen, need Priority) and **Limited** (instructed). The 32 named actions, verbatim, are the *complete* primitive vocabulary for the rebuilt effects layer:

`Draw(413) · Exhaust(414) · Ready(415) · Recycle(416) · Deal(417) · Heal(418) · Play(419) · Move(420) · Hide(421) · Discard(422) · Stun(423) · Reveal(424) · Counter(425) · Buff(426) · Banish(427) · Kill(428) · Add(429) · Channel(430) · BurnOut(431) · Double(432) · Swap(433) · Attach(434) · Detach(435) · Predict(436) · Prevent(437) · Replace(438) · Create(439) · Burn(440) · Empower(441) · Disempower(442) · Skip(443) · Pay(444)`

Movement family (445–458): Moving is a **Limited Action** (446) with Origin/Destination (447); Standard Move (448); moves can open Showdowns (451) or Combat (452); a completed Move triggers a Cleanup (453). **Recall (454–458) is NOT a Move** (456) — relocation to Base that doesn't trigger move-effects; Gear can be Recalled (457); state-preserving (458).

## 6. Combat & Scoring (CR 459–472) — headers verified; detail fill in Part 2

- Combat occurs at a Cleanup with empty Chain when opposing units share a Battlefield staged for it (460–462); exactly two players (462).
- **Three steps (463–466): Combat Showdown Step → Combat Damage Step → Resolution Step.** (Vendetta update: replacement effects that would modify combat damage apply at *assignment*.)
- **Scoring (467–472):** two ways to Score (469 — hold at Scoring Step per 315.2.b, and conquer); **once per Battlefield per turn per method cap (470)**; scoring effects at 471; **win check happens at Cleanup when Points ≥ threshold (472)**.

## 7. Layers — the effect-application system (CR 473–480) — verified in full

Replaces any bespoke effect-stacking model. All alterations to Game Objects apply through **three ordered layers, iterated to a fixed point** (476: apply each effect once, in layer sequence, re-evaluating until no changes):

1. **Trait-Altering Effects (477.1)** — name/type/tags/controller/cost/domain; **"Might becomes X" (set-Might) lives here**, not in arithmetic; Copy effects here (477.1.b).
2. **Ability-Altering Effects (477.2)** — grant/remove keywords, passives, rules text; attached-gear text appended here (477.2.c).
3. **Arithmetic (477.3)** — numeric ± on Might/Energy/Power.

Key arithmetic rules:
- **Snapshotting (477.3.b):** a *non-passive* arithmetic effect with a limitation is limited **at application time and remembered at that level** for its duration. CR's own example: "-4 [M] to a min of 1" on a 2-Might unit **generates -1 [M] this turn** — permanently -1 for the duration, even if the unit's Might later changes. Passive abilities do NOT snapshot (continuously re-evaluated).
- **Negative Might is real** (477.3.c example: a unit sits at "-2 [M]"). Confirms the negative-Might ruling *from the CR itself*.
- **Increase-by-negative = increase by 0** (477.3.c): Double on a -2 unit adds 0, not -2. New rule the legacy kernel lacked.
- Same-layer conflicts: dependency ordering (478–479), else timestamp/default order (480).
- Conditional keywords via recursion (476.3 Fiora example): buff → Mighty → gains Deflect/Ganking/Shield on the re-pass; removal cascades the reverse.

## 8. First findings (clean-room model vs. known prior rulings — preview of the Phase 2 diff)

| Finding | Status |
|---|---|
| Negative Might exists | **Confirmed by CR** (477.3.c example) — the ruling survives, now CR-cited |
| Per-effect floor ("to a min of N") | **Confirmed but restructured**: the mechanism is **snapshotting in the Arithmetic layer** (477.3.b), not per-effect floors resolved in chain LIFO order. Outcomes coincide in some cases, not all — every ordering-dependent puzzle (e.g. the Smoke Screen/Frigid Touch sequencing puzzle) must be **re-validated under Layers+snapshotting** |
| "Set Might to X" | **Restructured**: set-Might is a **Trait-Altering (layer 1)** effect — it applies *before* all arithmetic, regardless of cast order. Not an arithmetic step in a chain fold |
| Turn phases | **Legacy wrong**: real structure is Awaken → Beginning(Beginning Step, Scoring Step) → Channel → Draw → Main → Ending. Scoring is a *step inside Beginning Phase* |
| Priority/Focus | **New**: two distinct slots with precise grant/retain rules (312–313). Legacy had neither |
| Speed legality | **Restructured**: pure function of the four turn states (310), not ad-hoc checks |
| Recall vs Move | **New distinction** (456): Recalls are not Moves — move-triggers don't fire. Any legacy encoding that mapped recall-effects to "move" or "return" is wrong (e.g. Possession's "recall... this isn't a move") |
| Effect vocabulary | **Replaced**: 32 CR Game Actions supersede the ~10 invented primitives; several legacy names map (BuffMight→Buff, KillUnit→Kill), several were missing entirely (Heal, Hide, Banish, Swap, Attach/Detach, Double, BurnOut, Pay, and all 4 Vendetta actions) |
| Increase-by-negative→0 | **New rule** (477.3.c); legacy kernel would have subtracted |
| Cleanup/Outstanding-Task engine | **New**: the CR's execution model is task-queue driven (318–324, 332–340); legacy applyEvent had no such structure |

## 9. Remaining parts (session plan)

- **Part 2:** Chain handling in full (332–348: Finalize/Execute/Pass/Resolve semantics, Showdown flow), Playing Cards & the Process of Play (349–359), Combat steps in full (463–466), Scoring detail (467–472).
- **Part 3:** Game Concepts (100s): deck construction, setup, all zones/spaces (105–118), Game Object taxonomy (119–196), rune economy (160–168), control (188–190).
- **Part 4:** Abilities (360–406): passive/activated/triggered/reflexive/delayed/linked, replacement effects, targeting; Game Action definitions in full (413–444).
- **Part 5:** Keywords glossary (800s, incl. Vendetta) + Additional Rules (700s: modes, 2v2, XP if present).
- **Part 6:** Tournament Rules layering; patch-note reconciliation (what changed when → which legacy rulings reflect superseded rules); errata × `cards.json` integrity check.
- **Part 7:** The v2 type-system spec (schema + kernel signatures) assembled from Parts 1–6 → then Phase 2 diff → Phase 3 consolidated migration → Phase 4 effects/ability layer against the Supabase card inventory.
