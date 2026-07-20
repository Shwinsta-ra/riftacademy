# Riftbound suite — module architecture (canonical)

Status: canonical, rev. 2026-07-20 (six-module topology). This is the single
source of truth for module roles, names, and boundaries across all workstreams.
Changes are made here and announced via a fragment, never re-decided per thread.

## How to use this doc (read first)

If you are one of the workstreams, do this:

1. Read the whole doc, not just your module — boundaries only make sense
   relative to the others.
2. Confirm your module's line in §11 in your thread. Reply "confirmed" or name
   the exact clause you reject and why.
3. Do not silently re-decide a boundary in your own thread. Change it here (edit
   + fragment), so all workstreams stay on one contract.

Module IDs are internal, stable identifiers the code/schema serialize against.
Product/brand names may shift independently — see §10.

## 0. Numbering = dependency order, and the two clean graphs

Modules are numbered by dependency (topological) order: module N depends only on
lower-numbered modules for hard edges. **RiftCore (M0) is the root** because the
schema + rules kernel is what every other module imports; it depends on nothing.

There are two distinct graphs, and in this topology both are clean:

- **Import graph (code dependency):** every module imports RiftCore; the arrows
  all point *down* to M0. RiftEngine additionally imports RiftCore's kernel. No
  module imports a higher-numbered module.
- **Data-flow graph (runtime):** data originates at capture (RiftNotes) and flows
  *up* the numbering: Notes → Engine → {Lab, Coach} → … The only backward edge in
  the whole system is a single *soft* one (RiftCoach → RiftIQ personalized-puzzle
  hints), and because puzzles are M5 (above Coach at M4), even that now points
  *forward*.

Why both are clean here (they weren't in earlier drafts): the dependency-root
(schema/kernel = RiftCore) and the pipeline-middle node (reconstruction =
RiftEngine) are **different modules**. When they were the same node, one graph
always had a backward edge. Splitting them removes it.

"M0" means "the foundation the chain is built on," not merely "a module that
depends on nothing." RiftRecall (M6) sits at the top of the chain as another
user-facing product — like RiftIQ, it depends on RiftCore and can receive a soft
recommendation edge from RiftCoach (see §2). It is not the root; the root is
RiftCore.

## 1. Edge types

- **Hard dependency (solid):** A cannot function without B's structured output.
  Hard edges form a DAG — no cycles.
- **Soft feedback (dashed):** A informs B's priorities; B does not block on A and
  can ship without it. Soft edges may loop.

The one loop-shaped edge (RiftCoach → RiftIQ) is soft, so the hard-dependency
graph is a strict DAG.

## 2. The modules

### M0 — RiftCore (schema + forward rules kernel) · back-end

The root. Two artifacts, both imported by downstream modules:
- **Game-format schema / game-state representation** (identity-level, event-
  sourced substrate; a snapshot is a projection of a `GameEvent[]`). Carries the
  belief/fog-of-war and provenance envelope (see §3, E1). Imported by RiftNotes
  (target shape), RiftEngine, RiftLab, RiftCoach, RiftIQ.
- **Forward rules kernel** (`applyEvent`, `resolveCombat`, `canAfford`,
  `canScoreWinningPoint`, `resolveMightChain`, `trueMight`, `isKilled`): pure,
  deterministic, no UI/storage. Imported by RiftEngine (for abduction),
  RiftLab (sim + analysis), RiftCoach (grading), RiftIQ (puzzle validation).
- Owns the decision-point/snapshot/puzzle *object definition* (a turn-scoped
  state + a judgment call). This lives in RiftCore, not RiftIQ, because it is
  **substrate three modules share, not a product concept**: RiftCoach needs it
  (a graded real-match decision), RiftLab needs it (a simulated decision the
  best-decision model evaluates), and RiftIQ needs it (an authored puzzle) — all
  three reference the identical object. RiftIQ authors *instances* of it; it does
  not own the definition. Test: if only RiftIQ ever needed it, it would belong in
  RiftIQ; because three independent modules need it, it belongs at the root. This
  is the one place M0 names something that sounds product-flavored, and it earns
  its place at the root by that shared-need test, not by being a puzzle feature.
- Headless. Sends no runtime data; it is imported, not consumed. The only inbound
  edge is the soft puzzle-recommendation loop.

### M1 — RiftNotes (capture) · user-facing tool

- Transcription only: conforms raw input to RiftCore's schema. A parser/note-
  generator, not an analyzer, and (under Option B) not a reconstructor.
- Ingestion formats: pen-and-paper → voice → text transcripts → (future) A/V.
- One hard output: **tagged raw captures → RiftEngine** (tagged player-vs-field;
  routing to consumers happens at RiftEngine, not here).
- Owns capture UX per format, raw-snapshot correction, per-snapshot capture
  confidence, and snapshot *density* as a first-class quality lever.
- Build order is **field-first** (see §7); ships no at-the-table user capture in
  the near term; design-only until post-Vendetta.

### M2 — RiftEngine (reconstruction / abduction) · back-end

- The inverse of RiftCore's kernel: `inferEvents` reconstructs the implied event
  stream from observed snapshots, using `canAfford` + play-legality to prune
  illegal explanations. Returns candidate reconstructions with confidence, never
  a single forced guess.
- Imports RiftCore's kernel; does not import RiftNotes (it consumes RiftNotes'
  schema-typed output as data).
- **Stateless per-capture**, preserves the player/field tag, no pooling across
  captures — this is what keeps player data out of RiftLab (§7 guarantee).
- **The fork lives here:** reconstructed FIELD → RiftLab; reconstructed PLAYER →
  RiftCoach.
- Owns correction of the reconstructed event stream (distinct from RiftNotes'
  raw-snapshot correction).

### M3 — RiftLab (sim + analysis + metagame) · back-end

- Formerly "RiftPlay." Headless. Reconciles theoretical card analysis (RiftCore
  rules) with practical field behavior.
- Hard inputs: RiftCore kernel; reconstructed FIELD data (from RiftEngine);
  structured community datasets (RiftLite, Piltover Archive, riftdecks,
  riftmeta.net) directly, no abduction needed.
- Outputs: the "best-decision" model, game-state analysis framework, metagame
  trends + winrates, and the **KPI framework + targets** — all shared to RiftCoach.
- Owns the **automated self-play simulator** (auto-plays thousands of games to
  generate logic-based, field-informed metrics/metadeck analysis/deck-building).
  Synthetic self-play data is a **third provenance** (not player, not field) that
  may feed RiftLab's models, tagged via the provenance envelope. Parked/future;
  private (Ashwin-only) at first, premium later.
- Owns the coverage/accuracy failure *taxonomy* (RiftCoach does the per-match
  tagging).
- **Never sees player data.** Presents its output through RiftCoach; not itself a
  user surface.

### M4 — RiftCoach (coaching) · user-facing

- Hard inputs: reconstructed PLAYER data (from RiftEngine); RiftLab's decision
  model, metagame benchmarks, and KPI framework.
- Owns *player* measurement: per-match grading, longitudinal KPI *tracking*
  (RiftLab defines the KPIs; RiftCoach tracks them), and recommendations.
- Owns the personal improvement loop + the improvement methodology-as-a-program,
  and Ashwin's personal-strategy / application layer (deck-selection rule, phase
  cadence, event-prep/peaking, Regional-as-method-test) — see §8.
- Public tier for all users + a richer private tier for Ashwin; also the
  presentation surface for RiftLab's analysis.
- Soft output: personalized-puzzle recommendations → RiftIQ.
- **Emits nothing back to RiftLab in v1 — hard or soft.** RiftCoach's grading
  output (KPIs, weakness patterns) is player-derived, so routing any of it back to
  RiftLab — even aggregated — would open an indirect player→Lab channel that the
  stateless-per-capture fork (M2) otherwise closes. RiftCoach's only feedback edge
  is the soft forward one to RiftIQ. A future aggregate/anonymized Coach→Lab edge
  is explicitly out of scope now and, if ever built, is opt-in per §7.

### M5 — RiftIQ (puzzles) · user-facing

- The puzzle / game-flow product. Owns puzzle content (authored snapshot-first),
  the daily mechanic, and the puzzle UI.
- Imports RiftCore's kernel to validate puzzle answers — the kernel is a library
  it calls, not a module that owns puzzles. This is how a user-facing product
  consumes back-end logic without any back-end module becoming user-facing.
- Soft input: RiftCoach's personalized-puzzle hints (forward edge).

### M6 — RiftRecall (flashcards) · user-facing

- Existing spaced-repetition card-awareness product. Owns flashcard content, the
  review scheduler, and per-user progress.
- Imports RiftCore (card definitions / schema). Sits parallel to RiftIQ at the
  top of the chain: a leaf user-facing product that nothing downstream depends on.
- **Soft input (future):** RiftCoach may recommend which cards to test a specific
  user on — the same forward soft-edge shape as RiftCoach → RiftIQ. Not built yet;
  parked as a forward soft edge so RiftRecall is formally in the chain rather than
  a bolt-on.

## 3. Data-flow cycle (one match)

1. Player plays a match (paper, or a digital tool like RiftAtlas/RiftLite).
2. **RiftNotes** captures it as tagged raw snapshots conforming to RiftCore's
   schema.
3. **RiftEngine** reconstructs the event stream per-capture and stateless,
   preserving the tag, and forks: FIELD → RiftLab, PLAYER → RiftCoach.
4. **RiftLab** keeps its models current from field + community + self-play data;
   publishes the decision model, metagame benchmarks, and KPI framework.
5. **RiftCoach** grades the player's match against RiftLab's model, tracks KPIs
   over time, and emits a report + recommendations.
6. **RiftCoach** softly recommends puzzle/training types to **RiftIQ**; the
   player trains; the next match is informed by RiftLab's model and RiftCoach's
   focus areas → back to step 1.

## 4. Kernel vs. Engine (why they are two modules)

- **RiftCore kernel = forward rules.** state + event → next state. Deterministic,
  pure, never guesses. "Given what happened, what's the resulting legal state?"
- **RiftEngine = abduction (the inverse).** observed snapshots → the events that
  must have happened. Search + confidence + legality pruning. "Given before and
  after, what did they play?"

The engine *calls* the kernel (it checks each hypothesized event against
`applyEvent`/`canAfford`). Separating them keeps the small pure forward kernel
trivially testable and quarantines the messy, evolving, multi-hypothesis
inference in its own module.

## 5. Ownership boundaries at a glance

| Concern | Owner |
|---|---|
| Game-format schema + decision-point/puzzle object definition | RiftCore |
| Forward rules kernel (combat/scoring truth) | RiftCore |
| Capture UX + raw-snapshot correction + capture confidence + density | RiftNotes |
| Rules-dependent reconstruction (abduction) + reconstructed-stream correction | RiftEngine |
| Stateless-per-capture invariant + player/field routing | RiftEngine |
| "Best-decision" model + game-state analysis framework | RiftLab |
| Metagame trends & winrates (field measurement) | RiftLab |
| KPI framework + targets; coverage/accuracy taxonomy | RiftLab |
| Automated self-play simulator (private→premium) | RiftLab |
| Per-match grading + KPI tracking (player measurement) + belief-state grading | RiftCoach |
| Player reports, recommendations, improvement loop + methodology | RiftCoach |
| Personal-strategy / application layer (out of module contract; see §8) | RiftCoach |
| Puzzle content + daily mechanic + puzzle UI | RiftIQ |
| Flashcard content + review scheduler + progress | RiftRecall |

## 6. User-facing vs. headless

- **Headless (back-end), never user-facing:** RiftCore, RiftEngine, RiftLab.
- **User-facing products:** RiftNotes (capture tool), RiftCoach, RiftIQ,
  RiftRecall.
- **The rule:** no back-end module owns a user-facing feature. User-facing modules
  reach *down* and import back-end modules (e.g. RiftIQ imports RiftCore's kernel
  to validate puzzles). Back-end modules never present to users; RiftLab's output
  is surfaced through RiftCoach.
- Outside RiftRecall and RiftNotes, exactly **two** user-facing products:
  RiftCoach and RiftIQ.

## 7. Deferred / parked (named so they aren't mistaken for now)

- **Belief-state grading:** v2+. Event *ordering* is captured in v1; the grader
  that consumes it ships later. Consequence: RiftLab's belief-aware KPI (knowable-
  only denominator) is *defined* now but *runs* v2+.
- **Automated self-play simulator:** RiftLab-owned, future, private-then-premium.
  Only obligation now is to keep the schema clean enough to be training data later
  (separable identity, ground-truth layer, completeness field — all required
  anyway).
- **Player-data-to-RiftLab pooling:** never in the current design. Player captures
  reach RiftCoach only. A future pooled/anonymized edge would be explicitly soft
  and opt-in. The stateless-per-capture reconstruction invariant (M2) is what
  guarantees this today. **This includes indirect channels:** RiftCoach emits no
  grading-derived signal back to RiftLab in v1 either (see M4). The only inputs
  RiftLab receives are FIELD-tagged reconstructions from RiftEngine, structured
  community datasets, and its own self-play — never anything player-derived,
  directly or via Coach.
- **At-the-table user capture UX:** deprioritized under field-first.

## 8. Personal-strategy layer (out of the module contract)

Ashwin's competitive method — deck-selection rule (power floor + off-color
learning constraint), 4–6-week divergent/convergent phase cadence, event-prep/
peaking protocol, Regional-as-method-test — is stewarded by the RiftCoach thread
but is explicitly **not a software module**. It sits on top of the modules and
consumes their outputs (RiftLab's sim/metagame, RiftCoach's evaluations). Recorded
here so it stays in the canonical record without pretending to be a module. The
self-play simulator (RiftLab) is a private engine feeding this layer.

## 9. Modules vs. threads (workstreams)

Modules are code boundaries; threads are workstreams and need not be 1:1.
Recommended thread structure:

- **Merge RiftCore + RiftEngine** into one "rules & reconstruction" thread — the
  engine is the kernel's inverse and imports it. (Optionally fold RiftNotes in
  too, since the snapshot format must be co-designed with abduction's input
  needs; keep separate if you want RiftNotes' field-first schedule tracked alone.)
- **Never merge RiftEngine with RiftLab** — RiftEngine handles player data;
  RiftLab must never see it. Separate threads enforce the §7 wall by construction.
- **Keep RiftLab, RiftCoach, RiftIQ separate** — different remits, headless vs
  user-facing, and monetization.
- **RiftRecall (M6)** rides with RiftIQ (joint "learning products") or stays
  dormant; it's essentially shipped, and its only pending work is the future soft
  RiftCoach → RiftRecall card-recommendation edge.

Net: ~5 active threads — [Core+Engine], [Notes], [Lab], [Coach], [IQ (+Recall)].

## 10. Naming

Internal module IDs: RiftCore, RiftNotes, RiftEngine, RiftLab, RiftCoach, RiftIQ.
None collide with the six reserved domain names (RiftMind/Body/Calm/Fury/Chaos/
Order). "RiftPlay" (old M2/M3 name) is retired in favor of RiftLab. Product/brand
names may shift independently of these IDs.

## 11. Per-thread confirmations required

- **RiftCore (M0):** you own schema + forward kernel + the decision-point/puzzle
  object; schema is event-sourced and carries the belief/provenance envelope
  (§ E1 in the reconciliation record). You are headless.
- **RiftNotes (M1):** hard output is raw transcription only; you own capture UX,
  raw-snapshot correction, capture confidence, and density; captures route
  through RiftEngine; build order is field-first with no near-term at-the-table
  capture.
- **RiftEngine (M2):** you own rules-dependent reconstruction + its correction
  surface; reconstruction is per-capture and stateless and preserves the player/
  field tag; you import RiftCore's kernel.
- **RiftLab (M3):** inputs are field + community + self-play data (never player
  data); you own the best-decision model, metagame, KPI framework + targets, the
  coverage/accuracy taxonomy, and the self-play simulator; no hard data flows back
  from RiftCoach.
- **RiftCoach (M4):** you consume RiftEngine (player data) + RiftLab (models/KPI
  framework); you own player grading, KPI tracking, recommendations, the
  improvement loop, and the personal-strategy layer; belief-state grading is v2+;
  your only feedback edge is the soft one to RiftIQ.
- **RiftIQ (M5):** you own puzzle content + daily mechanic + UI; you import
  RiftCore's kernel to validate; you receive soft personalized-puzzle hints from
  RiftCoach.
- **RiftRecall (M6):** you own flashcard content + scheduler + progress; you import
  RiftCore (card definitions); you are in the chain as a user-facing product and
  may receive a future soft card-recommendation edge from RiftCoach.
