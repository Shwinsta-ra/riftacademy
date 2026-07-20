## Thread/topic: riftbound-module-architecture (cross-thread, FINAL six-module topology — for the control thread to publish + promote)

**Sections likely affected:** 1 (project overview / pillars), 3 (feature tracker — rename/add all module rows), 10 (open decisions — now resolved)

**Customer-facing:** No app change. Internal architecture ratified across all workstreams.

**Team-facing:**
Final module architecture is locked. Canonical doc:
`docs/design/riftbound-module-architecture.md`; resolved decision record:
`docs/design/riftbound-reconciliation-resolved.md`; diagram:
`docs/design/riftbound-module-architecture.svg`. Control thread should publish
these and promote so every workstream updates its self-identity + remit.

**The six modules (numbered by dependency order; M0 = root):**
- **M0 RiftCore** — schema + forward rules kernel. Back-end root; imported by all.
- **M1 RiftNotes** — capture/transcription only; tagged raw → RiftEngine.
- **M2 RiftEngine** — reconstruction/abduction (`inferEvents`), the kernel's
  inverse; stateless per-capture; owns the player/field fork.
- **M3 RiftLab** — sim + analysis + metagame + KPI framework + self-play
  simulator. Headless. (Renamed from "RiftPlay.")
- **M4 RiftCoach** — player grading, KPI tracking, recommendations, improvement
  loop, personal-strategy layer. User-facing.
- **M5 RiftIQ** — puzzles. User-facing; imports RiftCore's kernel to validate.
- **M6 RiftRecall** — flashcards. User-facing; imports RiftCore card data; in the
  chain, and may receive a future soft card-recommendation edge from RiftCoach
  (same shape as RiftCoach → RiftIQ).

**Key rulings for threads to internalize:**
1. Module IDs ≠ product brands. Back-end (RiftCore/RiftEngine/RiftLab) is
   headless; no back-end module is user-facing. User-facing = RiftNotes,
   RiftCoach, RiftIQ, RiftRecall (M6). Exactly two products outside Recall &
   Notes: RiftCoach + RiftIQ.
2. Kernel (RiftCore, forward, deterministic) vs. Engine (RiftEngine, abduction,
   inverse). Engine imports and calls the kernel. They are separate modules.
3. Player data reaches RiftCoach only, never RiftLab. RiftEngine's stateless
   per-capture reconstruction guarantees it.
4. Numbering is dependency order: imports point down to RiftCore (M0); data flows
   up; the only soft edge (RiftCoach → RiftIQ puzzle hints) points forward. No
   hard back-edge anywhere.
5. RiftLab owns the "best-decision" model + KPI framework; RiftCoach owns
   grading + KPI tracking. Belief-state grading is v2+.

**Thread structure (modules ≠ threads):** merge Core+Engine (optionally +Notes);
never merge Engine+Lab (player-data wall); keep Lab/Coach/IQ separate; RiftRecall
rides with IQ. ~5 active threads.

**Suggested Section 3 (feature tracker) updates:**
- Retire "RiftPlay" → **RiftLab**.
- Add rows: RiftCore (M0), RiftEngine (M2), with the remits above.
- Mark RiftNotes as field-first, design-only until post-Vendetta, not July-31
  work.
- Point every module row at `docs/design/riftbound-module-architecture.md`.

**Anything another thread should know:** all §7 open items from the prior
architecture rev are now resolved in
`docs/design/riftbound-reconciliation-resolved.md`. Each module confirms its §11
line in the canonical doc.
