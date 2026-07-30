# Fragment — RiftCore match-event schema: ownership resolved + handed down

**Date:** 2026-07-30 · **From:** RiftCore (M0) · **To:** RiftNotes (M1), RiftEngine (M2), Admin
**Re:** RiftNotes dependency flag (2026-07-28) — the game-state/match-event schema blocker.

## Routing question — answered
**The match-event schema is RiftCore's (M0).** RiftNotes' assumption holds: Core owns the *representation*, RiftEngine (M2) owns *reconstruction over it*. Evidence: `ADMIN_THREAD_REMIT.md` §7 ("RiftCore + RiftEngine: schema … reconstruction/abduction" — schema is Core's, abduction is Engine's). Do **not** re-route this to the Engine thread.

## Finding — it already exists in code (evidence-cited)
The schema RiftNotes needs is **already implemented** in `src/lib/core/schema.ts` (verified 2026-07-30 by reading the file on `integration`): `GameState`, a 16-variant `GameEvent` union, `MatchStateSnapshot`, `PlayerState`, `Battlefield`, `UnitState`, `ScoreEvent`, etc. It was undocumented in `docs/` (RiftNotes looked there and reasonably concluded it didn't exist) and was built for authored *puzzle* snapshots, so it has real gaps for full-game *capture*. I've now documented it and specced the gap closure.

## Deliverable
`RiftCore_Match_Event_Schema.md` (attached; to be committed at `docs/design/RiftCore_Match_Event_Schema.md`) — the match-event counterpart to the existing card/ability data-model doc. It contains: the as-is model, a 6-item gap analysis, the additive schema deltas (§4), per-module usage **verified against the real v0.4 cheat card** (§5), and a **schema evolution & migration policy** (§7) covering how future schema changes propagate to other modules' past and future outputs.

## v0.4 mapping — verified
Read the actual RiftNotes v0.4 notation (not just the enumerated surface). Every element maps cleanly, and the card's own footer — *"write only what can't be back-calculated"* — is the RiftNotes/RiftEngine boundary stated in the field: RiftNotes records the irreducible observation, RiftEngine reconstructs the rest. Design and field practice already agree. The two capture-blocking gaps (G1 reveal, G2 unknown card) correspond to notation the card already uses (`R1-` reveal@BF, `H1-` hide@BF), which is strong confirmation the gaps are exactly right.

## What RiftNotes can act on now (unblocked)
Finalize your capture template against §4/§5. A captured game = a `CapturedMatch` (initial `GameState` + ordered `GameEvent[]`, version-stamped). The two gaps that directly touch your notation:
- **Hidden info:** a hidden card is `ObjectInstance{ cardId: null }` (G2, your `H1-` marker), resolved by a new `cardRevealed` event (G1, your `R1-` marker) recording when/to-whom it became known.
- **Plays:** `cardPlayed` gains `targets`/`battlefieldId`/`fromZone` (G3) so your `>` targets and `F-`/`D-` source codes serialize losslessly.
You do **not** infer unobserved events — leave them absent; RiftEngine fills them.

## Remaining flags
- **Regression caught:** the original design named `revealCard` "the belief-state primitive"; it was dropped in the built `GameEvent` union. Restored as G1. Worth noting in case other belief-dependent assumptions were made against a schema that lacked it.
- **G6 open:** turn-phase/priority granularity left nominal; RiftEngine to confirm it won't need finer combat-window events before we lock that as won't-build.
- **v0.3 provenance:** the validation pilot was v0.3-captured; the v0.4-only codes were validated against the card, not a game. A v0.4-captured game closes it fully — not blocking.

## Status update — IMPLEMENT NOW (freeze lifted)
The July-31 freeze is lifted (alpha shipped; beta pushed 1–2 weeks). The §4 schema deltas are cleared for Code and are being implemented now — RiftNotes, RiftIQ, RiftLab, RiftEngine, and RiftCoach are all waiting on these types to start downstream work. This fragment is no longer "design-only pending launch"; it announces a landed schema change.

## Validation gate — PASSED
Serialized a real transcribed game (Game A of the 2026-07-27 pilot) end-to-end into `GameEvent[]` and ran token-class coverage over all three games. **Zero unrepresentable game facts.** One bounded finding — lossy-capture annotations (`!` misplay, `?` uncertainty) need a home outside `GameEvent[]` — resolved by adding a `CapturedMatch.captureMeta` sidecar. Evidence: `RiftNotes_v04_Validation_2026-07-30.md`.

## How to report a schema gap (new — read this)
When your module hits a game state this schema can't represent, **do not extend the schema locally.** File a schema-gap fragment per the canonical **`docs/design/RiftCore_Schema_Change_Protocol.md`** — it defines where to file, what evidence to include, and (critically) how past and future outputs of every module stay valid across schema changes (additive = free/lazy-migrate raw streams; derived outputs are re-derived, never migrated). The dropped reveal event was caught exactly this way; route gaps there, don't route around them.
