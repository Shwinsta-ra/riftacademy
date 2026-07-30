# RiftCore — Match-Event Schema (design spec v1)

**Module:** M0 (RiftCore) · **Date:** 2026-07-30 (rev. freeze-lifted) · **Status:** **IMPLEMENT NOW.** The July-31 freeze is lifted (alpha shipped; beta pushed 1–2 weeks), so the §4 deltas + §7 migration are cleared for Code. Mapping **verified against the real RiftNotes v0.4 cheat card** (§5) **and validated end-to-end against a real transcribed game** (§9) — see `RiftNotes_v04_Validation_2026-07-30.md`.
**Counterpart to:** `docs/design/RiftCore_Data_Model.md` (that doc is the *card/ability* model — what a card **is**; this doc is the *match-event* model — what **happens** in a game).

---

## 0. Finding first: this schema already exists in code (verified)

RiftNotes' dependency flag says the match/game-state schema "doesn't exist in the repo yet." That's true of `docs/` but **not of the code** — the representation already lives, substantially complete, in `src/lib/core/schema.ts` (committed, on `integration`, imported by the kernel). Verified 2026-07-30 by reading the file directly:

- `GameState` — players, battlefields, chain, turn, activePlayer, `pointsToWin`, `pendingDirectPoints`.
- `GameEvent` — a 16-variant event union (the event-sourced substrate).
- `MatchStateSnapshot` — `state` + `perspective` + optional provenance/confidence envelope.
- `PlayerState`, `Battlefield`, `UnitState`, `RuneState`, `ObjectInstance`, `ChainItem`, `TurnPhase`, `ZoneRef`.
- The winning-line taxonomy (`WinningLine`, `PointSource`, `ScoreEvent` with `battlefieldId`) and `pointsAtTurnStart` — the fixes from 2026-07-22 all landed correctly.

So this session is **not** greenfield design. It is: (1) confirm ownership on the record, (2) document the existing schema as the match-event contract (the missing `docs/` artifact RiftNotes was looking for), and (3) close the gaps between what the schema was built for (authored *puzzle* snapshots) and what *capturing a full real game over time* requires. The gaps are real and specific (§3); one is a genuine regression from the original design intent.

## 1. Ownership — RESOLVED (RiftNotes' routing question)

**The match-event schema is RiftCore's (M0). RiftNotes' assumption is correct: Core owns the representation, Engine (M2) owns reconstruction over it.**

Evidence: `docs/admin/ADMIN_THREAD_REMIT.md` §7 — "RiftCore (M0) + RiftEngine (M2): schema, forward rules kernel, reconstruction/abduction." The schema is the first noun; reconstruction is a separate concern. Concretely: RiftCore defines `GameEvent`/`GameState` and the forward fold `applyEvent`; RiftEngine's `inferEvents` is the *abductive inverse* over that schema (reconstruct the hidden events a capture didn't record). Engine consumes the representation; it does not define it.

So: RiftNotes serializes its capture into this schema; RiftEngine reconstructs into the same schema. Both point at RiftCore. Routing question closed — no need to take it to the Engine thread.

## 2. The representation (as-is, in `schema.ts`)

A match is an **ordered `GameEvent[]` over an initial `GameState`**; any point-in-time board is `events.reduce(applyEvent, initial)`. This is the event-sourced model — the event stream is canonical, a snapshot is a projection. RiftNotes' capture surface maps onto it as follows (✓ = already representable):

| RiftNotes captures | Schema element | Status |
|---|---|---|
| Turn order | `GameState.turn` + `phaseChange` events | ✓ |
| Per-turn plays (what, by whom) | `cardPlayed` event | ⚠ thin — see G3 |
| Board over time (units, battlefields, damage) | fold of `unitEntered`/`unitMoved`/`damageDealt`/`unitKilled` | ✓ |
| Scoring (hold/conquer) | `pointScored` (`ScoreEvent`) | ✓ |
| Hidden info / reveals | — | ✗ **missing — see G1** |
| Opponent-hand belief (unknown cards) | `ObjectInstance` | ✗ **missing — see G2** |

## 3. Gap analysis — capture/full-game vs. the puzzle-scoped schema

The schema was built for authored puzzle boards, which start mid-game with a known, static board from one perspective. Capturing a *real game from turn 1* needs six things the puzzle case never exercised. In priority order:

**G1 — `cardRevealed` event is missing (critical).** The `GameEvent` union has no reveal event. `ObjectInstance.privacy`/`knownToOpponent` capture belief *state at a point*, but nothing records *when* a hidden card became known to whom. This is exactly RiftNotes' "hidden-card markers / reveal resolution," and it's the primitive RiftCoach needs for belief-state grading ("you had this info and didn't use it") and RiftEngine needs for reconstruction. **This is a regression:** the original v4 design (`RiftIQ_Handoff_Spec` §A.6) named `revealCard` "the belief-state primitive"; it was dropped in implementation. Must be restored.

**G2 — unknown cards can't be represented.** `ObjectInstance.cardId: string` is required. From a capturing player's perspective, the opponent's hand is N *unknown* cards — there's no cardId to give them. So the schema literally cannot hold "opponent has 3 cards, identities unknown," which is the core of RiftNotes' opponent-hand belief notation. `cardId` must become nullable (or an explicit unknown marker), with the reveal event (G1) later filling it in.

**G3 — `cardPlayed` is too thin.** It records `{player, cardInstanceId}` only — not targets, battlefield, source zone, or cost paid. Puzzles didn't need this (the `Play` type carries targets), but a *captured* play and a *reconstruction* both need "what was cast, on what, from where." The v0.4 notation makes the source-zone need explicit: a bare card name means "from hand," while `F-` (flow), `D-` (discard/deck) mark non-hand plays — so `fromZone` is a real captured distinction, not a nicety. Extend with `targets?`, `battlefieldId?`, `fromZone?`, and optionally `costPaid?`.

**G4 — game-setup state is missing.** `PlayerState` has no `legendCardId`, no champion, no rune *deck* (only in-play `runes`). No `gameStarted`/`mulligan` events. Puzzles skip setup (they start mid-game); a full match starts with legend, champion, a 12-rune deck, opening hand + mulligan. The schema must at least be *able* to represent these, even if puzzles leave them empty.

**G5 — rune channeling is missing.** There are `runeExhausted`/`runeRecycled` events but no `runeChanneled` (the draw-2-runes-per-turn economy) and no rune-deck representation. Capture needs the rune economy over time.

**G6 — turn phases are nominal, priority/pass unmodeled (low priority, likely leave as-is).** `TurnPhase` exists but only `beginning` drives logic; there are no explicit priority/pass events. RiftNotes captures plays and outcomes, not every priority pass, so this is fine for capture. Flagged only so it's a conscious omission, not an oversight — revisit if RiftEngine's reconstruction needs finer combat-window timing.

## 4. The extensions (schema deltas)

Additive to `src/lib/core/schema.ts`. Nothing here changes existing puzzle behavior — puzzles simply don't populate the new fields.

```ts
// G2 — allow unknown cards (opponent hand from a perspective)
export type ObjectInstance = {
  instanceId: string;
  cardId: string | null;        // null = identity unknown to `perspective`
  privacy: Privacy;
  knownToOpponent: boolean;
};

// G1 — the belief-state primitive (restored), + G3/G4/G5 events
export type GameEvent =
  // ...all existing variants unchanged...
  | { type: "cardRevealed"; cardInstanceId: string; cardId: string; toPlayer: PlayerId; source: string }
  | { type: "cardPlayed"; player: PlayerId; cardInstanceId: string;   // G3: enriched
      targets?: string[]; battlefieldId?: string; fromZone?: ZoneKind; costPaid?: Cost }
  | { type: "gameStarted"; firstPlayer: PlayerId }                    // G4
  | { type: "mulligan"; player: PlayerId; returnedInstanceIds: string[] } // G4
  | { type: "runeChanneled"; player: PlayerId; instanceId: string; domain: Domain }; // G5

// G4 — setup state on the player
export type PlayerState = {
  // ...existing fields...
  legendCardId?: string;        // the player's Legend
  champion?: UnitState;         // champion in its zone (or in play)
  runeDeck?: { count: number; byDomain?: Partial<Record<Domain, number>> };
};

// Versioned container for a persisted match (see §7 — the linchpin of schema
// evolution). RiftNotes produces this; every consumer keys migrations off
// `schemaVersion`.
export type CapturedMatch = {
  schemaVersion: number;        // bump on every schema change; migrations chain off this
  initialState: GameState;
  events: GameEvent[];
  meta?: { source: "field" | "player" | "selfplay"; capturedAt?: string; perspective?: PlayerId };
  // Capture-layer annotations — NOT game facts, so they stay OUT of GameEvent[].
  // Surfaced by the v0.4 validation gate (§9): a real lossy capture carries
  // misplay flags (!) and uncertainty (?) that must travel with the match but
  // must not pollute the canonical event stream. RiftNotes populates; RiftCoach
  // reads flags (coaching signal), RiftEngine reads uncertainty (reconstruction
  // priors). Consistent with the E1 decision that RiftCore's schema owns the
  // confidence/provenance envelope.
  captureMeta?: {
    tier?: "live-personal" | "digital-personal" | "field-digital";
    lossy?: boolean;
    flags?: { eventIndex: number; flag: "!" | "?"; note?: string }[];
    uncertain?: { eventIndex: number; candidates?: string[]; note?: string }[];
  };
};
```
Note G3's enriched `cardPlayed` supersedes the current 2-field variant — it's the same event name with optional additions, so existing folds keep working; the reveal event (G1) is what later resolves a `cardId: null` from G2.

## 5. What each downstream module does with this

**RiftNotes (M1) — serializes into it.** A captured game = a `CapturedMatch` (initial `GameState` from setup + an ordered `GameEvent[]`). **Verified 2026-07-30 against the actual v0.4 cheat card** — every notation element maps to a schema element, and the two schema gaps that block capture (G1 reveal, G2 unknown) correspond to notation the card already uses:

| v0.4 notation | Meaning | Schema element |
|---|---|---|
| `HEADER: P—Legend—Champ—BF—M#` | setup: legend, champion, battlefields, mulligan | `gameStarted` + `PlayerState.legendCardId`/`champion` (**G4**) |
| `PLAY: name` (bare) | played from hand | `cardPlayed` (fromZone=hand) |
| `SOURCE: F-` flow, `D-` disc/deck | non-hand play source | `cardPlayed.fromZone` (**G3**) |
| `SOURCE: H1-` hide@BF | a hidden card | `ObjectInstance{cardId:null}` (**G2**) |
| `SOURCE: R1-` reveal@BF | a card becomes known | `cardRevealed` (**G1**) |
| `MOVE: ~` (Ken~B1) | unit movement | `unitMoved` |
| `TARGET: >` (Defy>Gust) | a play/ability targets X | `cardPlayed.targets` (**G3**) |
| `COMBAT: X` | unit dies | `unitKilled` |
| `SCORE: (C#)` / `(H#)` | conquer / hold points | `pointScored` (source conquer/holdIntoBeginning) |
| `MIGHT: + / -` | might mods with source | `mightModApplied` |
| `CHAIN: /` (LIFO stack) | resolution chain | `ChainItem` (LIFO) |
| `KEYS: emp leg stun rdy` | keyword/state markers | `keywordGranted` / `unitStunned` / tapped-ready |
| `FLAGS: ! ?` | mistake/review annotations | *not schema* — analysis metadata (RiftCoach) |

The card's own footer — **"write only what can't be back-calculated"** — is the RiftNotes/RiftEngine boundary stated on the physical card: RiftNotes records the *minimum irreducible* observation; everything derivable is left for RiftEngine to reconstruct. That is exactly the event-sourced + abduction split this schema is built for, so the design and the field practice already agree. RiftNotes does **not** infer unobserved events — they stay absent.

**RiftEngine (M2) — reconstructs over it.** `inferEvents` takes RiftNotes' sparse `GameEvent[]` and abductively fills the "back-calculable" gaps the card deliberately omits (a unit appeared → infer the `cardPlayed`/`runeChanneled` that must have preceded it), using RiftCore's kernel for legality/affordability. Output is the same `GameEvent[]` shape, now dense. RiftEngine owns reconstruction; it imports this schema, doesn't extend it.

**RiftCoach / RiftLab / RiftIQ — read it.** RiftCoach grades against the reconstructed stream (belief-state via `cardRevealed`). RiftLab aggregates field streams. RiftIQ keeps authoring `DecisionPoint`s (snapshots), unaffected.

## 6. Sequencing & impact (freeze lifted)

- **Now (this task):** Code implements the §4 deltas in `schema.ts` + the `applyEvent` cases + tests + the `CapturedMatch`/`captureMeta`/`schemaVersion` container + the migration scaffold (§7). The July-31 freeze that previously deferred this is lifted (alpha is live; beta moved out 1–2 weeks), and five modules (RiftNotes, RiftIQ, RiftLab, RiftEngine, RiftCoach) are waiting on these types to start downstream work.
- **Additive & safe:** every delta is additive — new event variants, new optional fields, a nullable widening (`cardId`), and new container types. No existing puzzle path changes; existing folds keep working; `cards.json` and app runtime untouched. A `core/` types + kernel change, not an app-behavior change.
- **Validation gate — PASSED (§6b).** Done before declaring capture-complete — evidence, not assertion, per the discipline from the false-fragment incident.

### 6b. Validation gate — result

Serialized **Game A** from the 2026-07-27 pilot (the most complete game — reaches C8 game-end) end-to-end into a concrete `GameEvent[]`, and ran token-class coverage across all three games. Artifacts: `RiftNotes_v04_Validation_2026-07-30.md` + `gameA_eventstream.json`.

**Result: zero unrepresentable game facts.** All 18 game-fact token classes map to a schema element under the §4 extensions (unit/spell plays, kills, moves, conquer/hold scoring with battlefield, keyword grants, legend-ability might mods, effect-moves, chains, trades, hidden/reveal, setup, partial tails).

**One bounded finding → the `captureMeta` sidecar (folded into §4).** The only two tokens without a home were `!` (misplay) and `?` (uncertainty) — which *correctly* are not game facts and must not enter `GameEvent[]`. They need a capture-layer home so a lossy live-personal capture travels losslessly; that's `CapturedMatch.captureMeta`. The gate validated the core (all real events map) while catching one real gap — exactly its job.

**Provenance note:** the pilot was captured with the **v0.3** cheat card. The core notation primitives (`~ > X C# H# + !`) are shared with v0.4, so game-fact validation holds; the v0.4-only source/hidden/reveal codes (`F- D- H1- R1-`) were validated against the v0.4 card itself (§5), not this pilot. Fully closing that needs a v0.4-captured game — flagged, not blocking.

## 7. Schema evolution & migration policy (how change propagates without breaking past data)

This is the part that makes the schema safe to grow — future sets *will* print mechanics we can't represent today, so the policy for handling that is part of the contract, not an afterthought. Event-sourcing makes this far more tractable than a snapshot model, because **the only thing that persists as ground truth is the raw `GameEvent[]`; everything else is derived and disposable.**

**The linchpin: `CapturedMatch.schemaVersion` (§4).** Every persisted match carries a version. That single field is what lets any consumer, at any future date, know which shape a stored match is in and how to read it.

**1. Additive changes are the default and cost nothing.** New event types, new *optional* fields, widening a type to nullable (like G2's `cardId`) — all backward-compatible. A v1 stream is a valid v2 stream (it just lacks the new events), and `applyEvent` treats an absent event as "didn't happen." **Every gap in this doc (G1–G5) is additive**, so restoring the reveal event etc. requires zero migration of past captures. The overwhelming majority of future growth (new keywords, new effect kinds, new event types for new mechanics) is additive — so the common case is free.

**2. Breaking changes get a versioned migration; raw history is never edited in place.** If a change is genuinely incompatible (a field changes meaning, an event splits in two), RiftCore writes a pure `migrate(events, fromV, toV): GameEvent[]`. Migrations **chain** (v1→v2→…→vN), so any old stream can be lifted to current. Because events are immutable *facts*, you migrate by *transforming the event log*, not by patching derived state.

**3. Migrate lazily on read; keep the raw stream as source of truth.** A consumer reads a stored v1 `CapturedMatch` and RiftCore's migration lifts it to the current version *in memory at read time*. The stored raw stays v1. You don't rewrite 200 captured games when the schema bumps — you interpret them through the current lens when you read them. (Batch-rewriting stored streams is an option for performance later, but it's never *required* for correctness.)

**4. Other modules' PAST outputs — this is the key question, and event-sourcing answers it cleanly:**
   - *Modules that store raw event streams* (RiftNotes captures, RiftEngine reconstructions): covered by #3 — migrated lazily on read. Additive bumps need no migration at all; their old captures just keep working.
   - *Modules that store **derived** outputs* (RiftCoach grades, RiftLab aggregates, RiftIQ `DecisionPoint`s built from captures): **these are never migrated — they're re-derived.** Because they're computed from event streams via pure functions (the kernel), the derived output is disposable: re-run the derivation over the (migrated-on-read) source and you get the correct current-version result. This is the deep payoff of event-sourcing + a pure kernel — you never have to migrate a grade or a tier list, you regenerate it.

**5. Gaps flow *uphill* to RiftCore, never patched locally.** When a module hits a game state it can't represent, it files a **schema-gap fragment** to RiftCore (`docs/updates/pending/…-schema-gap-*.md`) citing the concrete situation (evidence, like this doc did for reveals). RiftCore decides additive vs. breaking, bumps `schemaVersion`, writes the migration if needed, and publishes a **schema-change fragment** with the version, the delta, the migration (if any), and a compat note. A consumer never extends the schema privately — same rule as module boundaries ("change it in RiftCore, announce via fragment"). This is how future outputs adapt: they target the announced new version.

**In one line:** additive-by-default (free), versioned migrations for the rare breaking change, migrate raw streams lazily on read, and re-derive everything downstream rather than migrating it — with gaps always routed to RiftCore by fragment.

## 8. Open items for Ashwin / cross-thread
- **G6** (turn-phase/priority granularity) left nominal — confirm RiftEngine's reconstruction won't need finer combat-window events before we lock that as "won't build."
- The §4 deltas are additive and safe, but they *are* a `core/` change, so they wait for the post-launch go-ahead like the effect-registry expansion.
