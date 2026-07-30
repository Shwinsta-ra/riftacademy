# Validation gate — RiftNotes notation vs. match-event schema

**Date:** 2026-07-30 · **Input:** `riftnotes-pilot-transcription-2026-07-27.md` (3 real games) · **Against:** `RiftCore_Match_Event_Schema.md` §4 extensions
**Verdict:** PASS — zero unrepresentable game facts; one bounded finding (capture-metadata sidecar), now folded into §4.

## Method

Serialized **Game A** (Akali vs Ambessa/GP — the most complete game, reaches C8 game-end) end-to-end into a concrete `GameEvent[]` (`gameA_eventstream.json`, 28 events, well-formed), then ran **token-class coverage** over all three games: every distinct notation token type → the schema element it serializes to. This is the real proof the design doc's §5 mapping promised — a transcribed game, not a cheat card.

## Result: every game-fact token maps

| Token class (from the 3 games) | Schema element |
|---|---|
| Unit played from hand (`U-...`) | `cardPlayed` + `unitEntered` |
| Spell targeting a unit (`S-... > X`) | `cardPlayed.targets` (G3) |
| Unit died (`X`) | `unitKilled` |
| Move / attack to BF (`~B2`) | `unitMoved` → battlefield |
| Move to base (`~base`) | `unitMoved` → base |
| Conquer (`C#`) | `pointScored` source=conquer + `battlefieldId` |
| Hold (`H#`) | `pointScored` source=holdIntoBeginning |
| Keyword grant (`+emp`) | `keywordGranted` |
| Legend-ability might (`+Amb leg`, `+Akali leg`) | `mightModApplied` source=legend |
| Effect-move (`PubExec ~Affec to base`) | `cardPlayed` + `unitMoved` |
| Chain (`/ Twilight Shroud / emp Bacc /`) | `ChainItem` (LIFO) |
| Two of a card (`2x U-BladeTwirler`) | two `cardPlayed`+`unitEntered` |
| Trade (`X OlPoro/Affec`) | two `unitKilled` |
| Source-of-play (`F-`, `D-`) | `cardPlayed.fromZone` (G3) |
| Hidden@BF (`H1-`) | `ObjectInstance.cardId = null` (G2) |
| Reveal@BF (`R1-`) | `cardRevealed` (G1) |
| Setup header (`Legend/Champ/BF/M#`) | `gameStarted`/`mulligan` + `PlayerState` fields (G4) |
| Incomplete tail (Games B, C) | `MatchStateSnapshot.completeness = "partial"` |

**Game facts unrepresentable in `GameEvent[]`: NONE.**

## The one finding: capture-metadata needs a sidecar (not a GameEvent)

Two token classes have no home in `GameEvent[]`, and *correctly so* — they are not game facts:

| Token | What it is | Resolution |
|---|---|---|
| `!` (misplay flag; Game A T3, Game B T6) | player's coaching annotation | `CapturedMatch.captureMeta.flags[]` |
| `?` (uncertainty; e.g. `U-Kayle?`, `AffecPoro?`) | capture-confidence, unresolved card read | `CapturedMatch.captureMeta.uncertain[]` (best-guess `cardId` on the event + candidates in the sidecar) |

Putting these in `GameEvent[]` would corrupt the canonical stream (which must be pure game facts). They belong in a **capture-layer sidecar** that travels with the match: `CapturedMatch.captureMeta` (RiftNotes populates; RiftCoach reads flags as coaching signal; RiftEngine reads uncertainty as reconstruction priors). This is consistent with the E1 reconciliation decision that RiftCore's schema carries the confidence/provenance envelope. **Now folded into §4 of the schema doc.**

This is precisely what a validation gate is for: it confirmed the core (all real events serialize) and caught exactly one real omission before Code built the wrong thing.

## Caveats (honest, non-blocking)
- **Provenance:** the pilot was captured with the **v0.3** cheat card (per the transcription header), transcribed 2026-07-28. The shared primitives (`~ > X C# H# + !`) validate here; the v0.4-only codes (`F- D- H1- R1-`) were validated against the v0.4 card itself in §5, not this pilot. A v0.4-captured game would close the loop fully — flagged, not blocking.
- **Lossy tier:** this is live-personal capture (single-side, resources/hands not fully visible, ~14 `?` tokens needing Ashwin's verification). That lossiness is a *capture* property, not a schema limitation — the schema represents the confident facts and flags the rest via `captureMeta`. Reconstructing the omitted "back-calculable" events is RiftEngine's job, exactly as the cheat card's own footer ("write only what can't be back-calculated") intends.
- **Not yet run:** Games B and C were coverage-checked but not fully serialized (they're flagged incomplete on the sheets). Game A end-to-end + all-games token coverage is sufficient for the gate; a second full serialization can wait for a complete v0.4 game.
