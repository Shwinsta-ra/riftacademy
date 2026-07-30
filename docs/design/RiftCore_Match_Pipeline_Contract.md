# RiftCore — Match Pipeline Contract (design)

**Owner:** RiftCore (M0) · **Date:** 2026-07-30 · **Status:** canonical architecture. Some parts are RiftCore code now (see the companion Code instruction); the cascade/corpus/Discord parts are RiftEngine (M2) / M9, built later.

This defines how a match moves from raw capture to a clean stream that other modules can trust — and, critically, **who is allowed to do what to a stream.** It resolves the reader/parser ambiguity that the fold-tolerance discussion surfaced.

## 1. Three roles, defined by verb

| Role | Verb | Module(s) | May it infer? |
|---|---|---|---|
| **Writer** | *generate* | RiftNotes (M1) | No. Records observation; never reads a stream back. |
| **Parser** | *reconstruct* | **RiftEngine (M2) — exclusively** | **Yes. The only role permitted to infer.** |
| **Reader** | *replay* | RiftLab, RiftCoach, RiftRecall, and RiftIQ-when-it-consumes-real-games | No. Consumes a cleaned result; never guesses. |

**The bright line is inference, not folding.** Replaying a *known* stream (apply event → next state) requires no guessing and is fine. The moment producing a state requires guessing *what happened*, that is parsing, and only Engine may do it.

**Reinforced structurally (Ashwin's decision): readers never fold at all.** Engine outputs materialized state snapshots; readers consume those snapshots directly and never call the fold. This is slower (Engine materializes and stores more) but makes it structurally impossible for a reader to accidentally parse — it never touches an event stream. Chosen deliberately: reliability now, throughput later.

RiftIQ note: authoring puzzles (constructing `DecisionPoint` snapshots directly) is **not** reading a stream and is unaffected. RiftIQ only becomes a "reader" if/when it generates puzzles *from* captured real games.

## 2. The pipeline

```
RiftNotes            RiftEngine (parser)                         Readers
  writes    ──▶   reconstruct → gate → human review   ──▶   replay snapshots
 raw stream        (tier 1 → tier 2 → tier 3)            (only "verified" streams)
```

A stream never skips a stage. A reader never receives anything Engine hasn't cleaned and a human hasn't verified.

## 3. The clean-stream gate (Engine stamps a stream only if ALL pass)

1. **Foldable** — replays start-to-finish with no error.
2. **No black boxes** — zero `UnrecognizedEvent`s remain (see §5).
3. **Legal** — every reconstructed play is legal per RiftCore's kernel (`canAfford`, play-legality). A reconstruction that invents an illegal play is wrong by construction.
4. **Outcome-consistent** — the folded final state matches the **independently captured** result (RiftNotes records "won at C8" separately from the play-by-play, so a reconstruction that folds to a different score is *provably* wrong with no human needed).

Checks 1–4 are deductive and automatable — RiftCore provides them (`checkClean`). Only a stream passing all four is eligible to be forwarded.

## 4. Reconstruction cascade (RiftEngine — built later)

For an unknown span `A → ? → C`, Engine tries in order:

1. **Deductive (tier 1):** what RiftCore's rules force — legal/known/only-possible plays given mechanics, costs, board. Highest confidence.
2. **Analogical (tier 2):** match against past **known** `A→B→C` spans that "look most similar" (archetype, legend, domain, energy cost). Lower confidence. *Not built until a verified corpus exists — cold-start resolves everything via tier 1 or escalation.*
3. **Escalate (tier 3):** unresolved → human, via Discord (§6).

### 4a. Corpus integrity — the one rule that must not bend
The tier-2 corpus may contain **only** spans resolved **deductively (tier 1)** or **human-verified (tier 3)** — **never other tier-2 output.** If analogical guesses fed the corpus, errors would compound (one wrong guess becomes "evidence" for the next) and reconstruction quality would rot silently. Tier-2 fills may be *used* in a stream but never become *training evidence* until a human confirms them.

### 4b. Calibration — every reconstruction is graded against BOTH tiers (Ashwin's decision)
For now, run reconstruction through **tier 1 (deductive) AND tier 3 (human)** on the same span and **compare them.** Divergence is a finding, not noise:

- **Human ≠ deductive** ⇒ either the human misread a rule, **or RiftCore's kernel is wrong about the actual game.** The second is the valuable one — it's how we catch a kernel that was built against a misunderstood rule.

So every human review must **retain the pre-human deductive reconstruction alongside the human-verified result**, so divergence is computable and logged. This makes human review a continuous audit of the kernel's correctness, not just a data-cleaning step. Divergences route back to RiftCore as potential rules-rulings corrections.

## 5. Unknown events — record, never skip, never corrupt

When a fold meets an event type it has no case for, it must **not** silently return the state unchanged (that fabricates "nothing happened") and must **not** corrupt the fold. It records an **`UnrecognizedEvent`** — "something happened here I can't interpret, at index N" — and carries the best-known state forward. That converts a silent hole into a **targeted reconstruction task** for Engine: it sees exactly where and what it couldn't parse and applies §4 to resolve it. (Unknown *type* → this mechanism; known type whose *meaning* changed across versions → `migrate()` lifts the stream first. The two are complementary and distinct.)

## 6. Escalation surface — Discord (M9 dependency)

- **Out (exists):** the app can post to Discord today via the feedback-form hook. Engine's escalation is a **structured** post — the raw stream, the A and C states bracketing the gap, what Engine already tried, and the deductive confidence — not "reconstruction failed."
- **In (must be built):** Discord → system is **not** wired. **M9 owns building the reverse channel** so a human's Discord resolution flows back to feed the corpus (§4a) and close the loop. Until then, resolutions are applied manually.

## 7. Human-review posture (current)

**Everything is human-reviewed for now** — no auto-forward path exists yet. Each reconstruction is posted for review **annotated with a confidence score**:
- Now (tier 1 only): confidence from the **deductive** reconstruction.
- Later (tier 2 added): continue human review, annotated with **analogical** confidence as well.

Readers therefore accept only streams stamped **`verified`** (reconstructed + gated + human-approved). Auto-send thresholds can be introduced later, once deductive/analogical confidence has been validated against human review over enough volume — not before.

## 8. What RiftCore provides vs. what Engine builds

| RiftCore (now — primitives) | RiftEngine / M9 (later — logic) |
|---|---|
| `UnrecognizedEvent` type; record-don't-skip fold | the tier 1→2→3 cascade (`inferEvents`) |
| `materialize()` (events → snapshots) so readers never fold | the analogical corpus + similarity model |
| `ReconstructedMatch` type + `status` stamp + retained deductive reconstruction | Discord structured escalation |
| `checkClean()` — the four deductive gate checks | corpus-integrity enforcement + calibration logging |
| reader-only snapshot accessor (rejects non-`verified`) | M9: Discord → system reverse channel |

RiftCore performs none of the three verbs — it supplies the tools; Engine parses, Notes writes, readers replay.
