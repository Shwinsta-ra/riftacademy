# Riftbound reconciliation — resolved decision record

Rev. 2026-07-20. The decision worksheet, re-run against the final six-module
topology (RiftCore / RiftNotes / RiftEngine / RiftLab / RiftCoach / RiftIQ +
RiftRecall sibling). Each item is marked RESOLVED with the decision. "CHANGED"
flags items whose answer shifted because of the puzzles-split + rename since the
worksheet was first drafted. Companion to `riftbound-module-architecture.md`.

## A. Structural / DAG

- **A1 — Option B (RiftNotes = transcription; reconstruction elsewhere).**
  RESOLVED: accepted. CHANGED: reconstruction is now its own module **RiftEngine
  (M2)**, not "RiftIQ wearing a hat." RiftNotes hands tagged raw captures to
  RiftEngine.
- **A2 — code-dependency graph vs. runtime data pipeline.** RESOLVED: accepted,
  and now moot in practice — splitting the dependency-root (RiftCore) from the
  pipeline-middle node (RiftEngine) removes the hard backward edge entirely.
  Import graph points down to M0; data graph points up; the lone soft edge points
  forward.
- **A3 — RiftCore's shared contract = schema + forward kernel.** RESOLVED:
  accepted. CHANGED: abduction (`inferEvents`) is split OUT of the kernel into
  RiftEngine; RiftCore's kernel is the pure forward rules only. Kernel imported by
  RiftEngine, RiftLab, RiftCoach, RiftIQ.
- **A4 — stateless per-capture reconstruction invariant.** RESOLVED: accepted;
  now owned by RiftEngine.
- **A5 — two field-data paths.** RESOLVED: accepted. Unstructured field content →
  RiftNotes → RiftEngine → RiftLab; structured community datasets → RiftLab
  directly (rename RiftPlay→RiftLab).

## B. Naming, surfaces, simulator

- **B1 — module IDs ≠ product names.** RESOLVED: accepted; fully realized —
  back-end IDs (RiftCore/RiftEngine/RiftLab) are distinct from consumer brands
  (RiftIQ/RiftCoach/RiftRecall).
- **B2 — public surfaces.** RESOLVED/CHANGED: user-facing = RiftNotes (capture),
  RiftCoach, RiftIQ, RiftRecall. Outside RiftRecall & RiftNotes there are exactly
  two products: **RiftCoach + RiftIQ**.
- **B3 — simulator.** RESOLVED/CHANGED: owned by **RiftLab** (headless), private
  (Ashwin-only) then premium; presented through RiftCoach. RiftLab is not itself a
  user surface.
- **B4 — synthetic self-play = third provenance.** RESOLVED: accepted; owned by
  RiftLab, tagged, may feed RiftLab's models (not player data, so §7 holds).

## C. Ownership boundaries

- **C1 — correctness model.** RESOLVED: RiftLab owns the "best-decision" model
  (not just KPI defs); RiftCoach applies it. Player games are the gradee, not the
  grader.
- **C2 — improvement loop + methodology.** RESOLVED: RiftCoach.
- **C3 — personal-strategy layer.** RESOLVED: stewarded by RiftCoach; recorded as
  out of the module contract, downstream of module outputs (arch doc §8).
- **C4 — coverage/accuracy taxonomy = RiftLab; per-match tagging = RiftCoach.**
  RESOLVED: accepted.
- **C5 — knowable-only KPI denominator.** RESOLVED: accepted.

## D. Versioning / sequencing

- **D1 — belief-state grading v2+; belief-aware KPI also v2+.** RESOLVED: define
  the KPI framework now (RiftLab), run the belief-aware grading v2+ (RiftCoach),
  consistent with RiftNotes' deferral.
- **D2 — "timestamped" = logical sequencing, not wall-clock.** RESOLVED: accepted;
  applies to RiftNotes, RiftEngine, and RiftCore lines.
- **D3 — field-first build order.** RESOLVED: accepted. RiftNotes is field-first
  for fidelity/priority; ships no near-term at-the-table capture; design-only
  until post-Vendetta; must not pull from July-31 items (RiftRecall, RiftIQ Daily
  Puzzle).
- **D4 — per-capture error levers v1.** RESOLVED: v1 = per-snapshot confidence
  (RiftNotes) + legality pruning (RiftEngine); NOT v1 = multiple-hypothesis
  retention.

## E. Schema

- **E1 — schema envelope.** RESOLVED: RiftCore's schema carries the ground-truth
  layer, fog-of-war projection, completeness field, provenance/perspective/
  fidelity envelope, per-snapshot confidence, and separable identity.
- **E2 — two correction surfaces.** RESOLVED/CHANGED: raw-snapshot correction =
  RiftNotes; reconstructed-stream correction = RiftEngine (cleanly, since it owns
  reconstruction).

## F. Minor

- **F1 — add riftmeta.net** to RiftLab's community inputs. RESOLVED: accepted.
- **F2 — soften "impossible without event-sourcing"** (the snapshot already held
  belief primitives; what was missing was cross-decision ordering). RESOLVED:
  accepted.
- **F3 — belief work = predictive model + backtesting** (no live annotation, with
  the leak guardrail). RESOLVED: accepted; RiftLab/RiftCoach-internal.

## G. Process

- **G1 — fragment sequencing.** RESOLVED: publish the structure + naming now via
  the control thread; snapshot-format specifics land in a later fragment.
- **G2 — abduction-input-before-format.** RESOLVED: default to "capture all
  observable legal state," trim once abduction's needs are concrete.

## New this turn

- **N1 — RiftCore = M0; RiftRecall = M6.** M0 is the dependency root (imported by
  all); RiftRecall is not the root. Per Ashwin, RiftRecall is placed as **M6**, a
  user-facing product at the top of the chain (parallel to RiftIQ), importing
  RiftCore and able to receive a future soft card-recommendation edge from
  RiftCoach — so it's formally in the chain, not a bolt-on sibling.
- **N2 — puzzles piped correctly.** RiftIQ (user-facing) imports RiftCore's kernel
  to validate puzzles; no back-end module owns a user-facing feature.
- **N3 — top layer split (option b).** RiftLab (headless sim) / RiftCoach
  (coaching) / RiftIQ (puzzles). Option (a) — renaming the sim engine to RiftIQ —
  rejected (bundles headless with user-facing).
- **N4 — final names:** RiftCore, RiftNotes, RiftEngine, RiftLab, RiftCoach,
  RiftIQ (+ RiftRecall). "RiftPlay" retired.
- **N5 — thread collapsibility:** merge Core+Engine (optionally +Notes); never
  merge Engine+Lab; keep Lab/Coach/IQ separate; Recall rides with IQ. ~5 threads.
- **N6 — kernel vs engine** defined (arch doc §4): kernel = forward rules
  (deterministic); engine = abduction (inverse, calls the kernel).
