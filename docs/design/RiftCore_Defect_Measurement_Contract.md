# RiftCore ⇄ RiftEngine — Defect-Measurement Contract

**Owners:** RiftCore (M0) + RiftEngine (M2) · **Date:** 2026-07-30 · **Status:** canonical (metrics confirmed by Ashwin; one guardrail flagged for confirmation, §4)
**Adjudicator of record:** a **detailed human adjudication** — a deliberate, careful review — **not** raw reviewer notes, which are themselves fault-prone.

This defines how Core and Engine are held accountable, so that a bug both miss cannot read as success to both. It codifies the adversarial *posture* (Engine actively tries to break Core) while measuring success on *precision over time*, not on volume of faults found.

## 1. The adjudication outcome space (Ashwin's 2×2)

Every adjudicated case falls in one cell. "Core correct/incorrect" and "Engine flagged/didn't" are the axes; the cell names who is at fault.

| | **Engine parses correctly / flags appropriately** | **Engine parses wrong or fails to flag** |
|---|---|---|
| **Core rules correct** | ✅ Both win — correct rules, correctly applied | ❌ **Engine at fault** — false positive (flagged a non-defect) or wrong parse |
| **Core rules incorrect** | ✅ **Core at fault** — Engine surfaced the divergence, human confirmed; Core hardens | ❌❌ **Engine at fault (worst case)** — followed a wrong Core silently, no human flag |

The bottom-right is the failure the whole design exists to prevent: if Engine silently follows a wrong Core and nobody is notified, **RiftLab and RiftCoach learn the wrong thing**, and corrupted "best strategy" flows to the player. That is strictly worse than a false positive, which merely costs a human a review.

## 2. Engine judges *consistency*, not *correctness* (the load-bearing principle)

Engine validates artifacts **against Core's rules + catalog**. But Core is sometimes wrong — that's the entire point of the maturation curve. So a divergence Engine detects ("p1 won combat despite lower Might — this doesn't line up") is **equally evidence against Core as against the artifact**, and **Engine cannot decide which on its own** — it implicitly trusts Core, notices something doesn't reconcile, and **escalates to the human**. This is exactly Ashwin's bottom-left case: Engine surfaces the divergence; the human adjudicates whether Core or the artifact was wrong.

Therefore: **Engine detects and characterizes artifact-vs-Core divergence; the human adjudicates correctness.** Engine is the judge of *consistency*, the human is the judge of *truth*. Encoding Engine as "the judge of correctness" would make it attribute every Core-rule error to the artifact by construction — hiding Core's own faults. It must present a divergence as two-sided.

## 3. Success metrics — both trend toward their zero-fault asymptote (confirmed)

Measured against detailed human adjudication (§ preamble), on the **calibration sample** (§5):

**Engine — two joined criteria, because either alone is gameable:**
1. **Credit for finding true discrepancies.** Engine must actively dig for places the rules or the notes don't reconcile — finding real discrepancies is a success, and this is what motivates the adversarial posture. *An Engine that flags nothing fails here* (TP = 0, no credit) — which is why "false positives → 0" cannot be the sole metric: measured alone it rewards silence, the worst outcome.
2. **Precision trending toward 1:** `precision = TP / (TP + FP)`. Over time, Engine's learning system (triangulation across artifacts, matching against previously-validated game states carrying the same error) must categorize its raised discrepancies as true vs. false ever more accurately. Improving precision *without* going quiet (criterion 1 holds the volume up) is the real success signal.

Together: **dig hard for discrepancies, and get better at not crying wolf.** Precision is also the *practical* metric — it needs only adjudication of the flags Engine **raised** (review its outputs), not a full re-adjudication of the whole game to find misses.

**Engine never assigns fault.** A discrepancy is two-sided evidence (Notes-artifact vs. Core rule) and Engine cannot decide which — the human arbitrates (§2). Engine is credited for *finding* it, not for *blaming* correctly.

**Core succeeds as its rate of required rule/schema adjustments → 0 asymptotically.** Every adjudicated Core fault hardens Core; the loss rate declines as Core approaches zero-fault.

**Maturation curve.** Early in a set, actual game outcomes are usually more correct than Core's rules model (many new interactions), so Engine finds many real faults and Core loses often — the system *working*. Late in a set, most interactions have already corrected Core's config, so faults are rare. **Core is most at fault at the start of a new set, least at fault by its end.**

## 4. Where false negatives live (and why they are NOT Engine's operational metric)

A false negative — a real fault Engine *missed* — is **fundamentally unobservable in production**, because every downstream module assumes an Engine-validated stream is truthful. Nobody is looking for the miss, so there is no one to compute an FN rate against in the normal flow. That is precisely why Engine's operational metric is **precision** (which needs only the flags it raised), not recall/FN (which would need a full independent re-adjudication to find misses).

False negatives are instead caught by two later nets, and this is accepted by design:
- **Downstream validation** — Engine categorically fails when its error reaches Coach / Lab / IQ; those modules (and ultimately the human reading their output) surface the miss after the fact.
- **Periodic calibration** — the multi-pass windows (§5) with full human adjudication can find faults Engine missed on that sample.

So the FN safety net is the "validation always happens downstream" property plus periodic calibration — not a number in Engine's per-flag scorecard. Engine's job is to be *precise and brave*; catching its rare misses is the downstream system's job.

## 5. Where metrics are computed

- **Production games are one-input, one-pass** — no independent ground truth, so no per-game score. Here Engine relies on the **posture**: flag aggressively, escalate anything that doesn't reconcile.
- **Metrics live on the calibration sample** — the periodic multi-pass windows where a detailed human adjudication exists to score against. FP and FN rates, and Core's adjustment rate, are measured there and tracked over time toward their asymptotes.

## 7. In one line
Engine keeps Core honest; the human keeps Engine honest; downstream modules and periodic calibration keep Engine's misses honest. Engine digs for discrepancies and escalates them two-sided (never assigning fault); the human adjudicates truth; Core hardens on every confirmed fault. Engine is scored on precision-with-volume (brave and accurate), Core on required-adjustment rate — both to zero over time.

## 8. Schema-gaps are Core faults too
"Core has no field for this" — e.g. no way to track player **XP** alongside points — is a Core fault surfaced by a module hitting an un-representable state, exactly like a wrong rule. It routes via `RiftCore_Schema_Change_Protocol.md` and counts toward Core's adjustment rate. This is *why* comprehensive rules ingestion is task #1: front-loading the deductive rules foundation surfaces these schema-gap faults up front rather than one reconstructed-game-at-a-time.
