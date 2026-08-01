# RiftCore v2 — Canonical Model · Part 6: Tournament Layer, Bans, Errata Integrity

**Sources:** Riftbound Tournament Rules RUP4 (2026-07-16) · Vendetta Errata Updates (**2026-07-23**) · July Ban List Updates (effective **2026-07-24**) · live `src/data/cards.json` (928 cards, post-PR#145 repo).
**Method:** clean-room + evidence-cited verification against live data.

---

## 1. Source precedence — resolved with evidence

| Source | Date | Standing |
|---|---|---|
| Core Rules RUP4 | 2026-07-16 | **Primary authority.** Verified post-Vendetta (Empower/Flow/Burn/Skip/untargetability/applied-costs all present in text) |
| Tournament Rules RUP4 | 2026-07-16 | **Takes precedence over CR for competitions** (TR 104.1) — a real precedence inversion, scoped to competition play |
| **Card Errata** | **2026-07-23** | **Post-dates the CR.** Card text only. Confirms the "last 0.1%" model |
| **Ban List** | eff. **2026-07-24** | Post-dates both. Deck legality only |
| Patch notes (4 sets) | per set | **Changelog, not authority** — content is already consolidated into RUP4 |

**Patch-note reconciliation is now largely moot.** Its original purpose was to detect legacy rulings made against superseded rules — but the 100% clean-room rebuild discards all legacy rulings by decision, so there is nothing to reconcile. Residual value is historical (useful to RiftLab for meta-evolution context), not to Core. Verified RUP4 currency directly against the Vendetta patch content instead; that check passed.

## 2. Tournament rules — what Core must model vs. what is pure policy

**TR 104.1: for competitions, the Tournament Rules take precedence over the Core Rules.** So the v2 model needs a *format/mode context*, not a single hardcoded ruleset.

### Core MUST model (game-affecting)
| Rule | Content |
|---|---|
| TR 402.1 / 601.1.b | **Constructed: Main Deck exactly 40 INCLUDING the Chosen Champion**, 1 Legend, 12 runes, 3 uniquely-named battlefields |
| TR 601.1.c | Sideboard ≤10, main-deck-legal cards only, 3-copy limit spans **main + sideboard** |
| TR 601.2 / ban list | Format legality + banned cards (§3) |
| TR 601.3 | **Standard = OGS + OGN + SFD + UNL + VEN** (Vendetta legal 2026-07-31) |
| TR 602.4.a | **Sealed: Main Deck ≥25**; domain identity = **any three domains, or any domain plus the Legend's domains**; runes must match identity; **Unique does not apply**; named/signature-count limits do not apply; **deck legal with no Legend and/or no Chosen Champion — if either is missing, draw 1 at your first Beginning Phase** (once, even if both missing) |
| TR 602.4.b | **Draft: Main Deck ≥20**, 3 packs, same identity rules |
| TR 603.7.a | **2v2 turn order: TeamA-P1 → TeamB-P1 → TeamA-P2 → TeamB-P2** |
| TR 408.2 | End-of-round: finish the turn, **+3 additional turns**, then **a 2-point lead wins, else draw** |
| TR 407 | Play-first: game 1 by random designation; later games, **the loser chooses**; draw preserves prior order |
| TR 406.1.g | Best-of-1 setup variant (random battlefield from 3, sideboard as if between games) |
| TR 415.4 | **Players must track XP** — independent confirmation of the XP mechanic |
| TR 502.4 | Public info includes **turn player, phase, step, turn state, and who has Priority and Focus** — confirms these are observable, trackable state (directly supports the capture framework) |

### Engine-relevant (rules-adjacent policy)
| Rule | Why it matters |
|---|---|
| **TR 506 — Triggered Ability accountability** | The accountable player must acknowledge a trigger **by the time it would have an observable impact**, else it is **forgotten** (506.3, 506.4). A forgotten trigger **still counts as having triggered** for "first time"/limited triggers (506.5). **506.3.e enumerates "observable impact"**: point-total change, rune-total change, adding a Buff, impacting combat/procedures, causing draw/discard, exhausting/readying, causing a move, or an opponent asking for affected public info. **This is effectively Engine's missed-trigger detection spec** — the Huwei case is exactly 506.3.e |
| TR 505 | Loops: deterministic, identical iterations; resolution procedure; non-deterministic sequences can't be shortcut |
| TR 503–504 | Shortcuts and out-of-order sequencing — real capture artifacts Engine will see in notes |
| TR 702.2–702.4 | Missed trigger / forgetting to score / forgetting to draw: **[No Penalty]** by default, upgraded to [Warning] when advantageous. Confirms these are *expected* human errors — the class RiftCoach should coach and Engine should detect |

### Pure policy — NOT Core's concern
OPL tiers (205), eligibility (300s), judges/appeals (204, 413), penalties taxonomy (700s), sleeves/marked cards/proxies (419–423), spectators, bribery/wagering/cheating (704), disciplinary code (705), tiebreakers (409), deck checks (411).

## 3. Ban list (effective 2026-07-24) — verified against live data

| Card | Format banned | Our `banned1v1` | Verdict |
|---|---|---|---|
| Stealthy Pursuer (`ogn-177-298`) | Standard | `true` | ✅ correct |
| The Arena's Greatest (`ogn-290-298`) | Standard | `true` | ✅ correct |
| Aspirant's Climb (`ogn-276-298`) | Standard | `true` | ✅ correct |
| **Master Yi, Wuju Bladesman** (`ogs-019-024`) | **2v2 Constructed only** | `false` | ✅ correct **for 1v1** — but see gap below |

**⭐ Schema gap → Core fault: the ban model is single-format.** Riot introduced a **2v2 Constructed ban list** (= all of Standard **plus** Master Yi, Wuju Bladesman). Our schema has exactly one boolean, `banned1v1`, and therefore **cannot represent a card that is legal in 1v1 but banned in 2v2**. Master Yi is precisely that case. The v2 model needs per-format legality (e.g. `legality: { standard1v1: "legal"|"banned", constructed2v2: ..., limited: ... }`), consistent with TR 602.1.b ("even if a card is banned in constructed, it is legal in limited unless also banned there") — another distinction the boolean can't express.

*Personal note, since it's your primary legend: Master Yi, Wuju Bladesman remains fully legal in 1v1 Standard (LA Regional Qualifier). The ban is 2v2 Constructed only.*

## 4. Errata × `cards.json` integrity check — PASSED

Checked all 8 errata'd cards (2026-07-23) against live `cards.json` (928 cards):

| Card | Set | Live text state |
|---|---|---|
| Draven, Vanquisher | SFD | ✅ post-errata ("pay (R) **to** give me +2 Might this turn") |
| Emperor's Dais | SFD | ✅ post-errata ("**to** play a 2 Might Sand Soldier token here") |
| Fizz, Trickster | SFD | ✅ post-errata ("**Then recycle it.**") |
| Diana, Lunari | UNL | ✅ post-errata ("pay (1) **to** [Predict]") |
| Stalking Wolf | UNL | ✅ post-errata ("You may **[Ambush]** me to its battlefield") |
| Astral Heron | VEN | ✅ post-errata ("**the next card you play this turn** costs…") |
| Gangplank, Naval | VEN | ✅ post-errata ("+3 Might **this turn** instead") |
| Resonating Strike | VEN | ✅ reminder-text-only change; not stored |

**Result: zero stale card text.** The Riftcodex ingestion pipeline is serving current post-errata text. Two of these were *functional* errata (Astral Heron and Gangplank gained "this turn" duration limits), so this is a meaningful pass, not a formatting one.

**One representation flag (not an error):** errata prints Draven's cost as `[C]`, our data stores `(R)`. Per CR 805.1.a.1, `[C]` means "Power matching one of this card's domains" and `[A]` means "any domain." Resolving `[C]` to the concrete domain is correct for a single-domain card but **lossy for multi-domain cards**, where `[C]` legitimately offers a choice. The v2 cost model should keep `[C]`/`[A]` as symbolic types rather than pre-resolving them.

## 5. Findings (Part 6 additions to the Phase-2 diff)

| Finding | Status |
|---|---|
| **Ban schema is single-format; 2v2 ban list unrepresentable** | **Confirmed Core fault.** Needs per-format legality; also covers TR 602.1.b (constructed-banned ≠ limited-banned) |
| **Tournament rules OVERRIDE core rules in competition** | TR 104.1 — the v2 kernel needs a format/mode context parameter, not one hardcoded ruleset |
| **Deck-size rules are format-scoped** | Constructed exactly 40 (incl. champion); Sealed ≥25; Draft ≥20 — with different identity, Unique, and copy-limit rules per format |
| **Sealed/draft: three-domain identity, Unique suspended, legend/champion optional** | TR 602.4.a.3–.6 — an entire alternate deck-construction ruleset the legacy never modeled |
| **Missing legend/champion → draw 1 at first Beginning Phase** | TR 602.4.a.5.b — a real in-game rule arising from a format rule |
| **End-of-round: +3 turns then 2-point-lead-or-draw** | TR 408.2 — affects any tournament-context reconstruction |
| **TR 506.3.e is a missed-trigger detection spec** | Enumerates observable-impact moments — hand this to Engine as its trigger-check checklist |
| **Forgotten triggers still "triggered"** | TR 506.5 — affects "first time each turn" accounting |
| **XP independently confirmed** | TR 415.4 |
| **Priority/Focus are public, trackable state** | TR 502.4.a — supports capture and reconstruction |
| **Errata integrity: PASSED** | 8/8 cards post-errata in live data |
| **`[C]`/`[A]` should stay symbolic in the cost model** | CR 805.1.a.1 — pre-resolving loses multi-domain choice |
| **Patch-note reconciliation moot** | Clean-room rebuild discards legacy rulings; RUP4 currency verified directly |

## 6. Open adjudications register — additions
13. Sealed deck-size framing: TR 602.4.a.2 says Main Deck ≥25 — confirm whether the champion counts inside that 25 (constructed explicitly says "including"; sealed says only "at least 25") before re-ruling the legacy "card 26" claim.
14. Any deck-legality logic assuming a single ban list — re-derive under per-format legality.

## 7. Next (Part 7 — the last part)
The v2 type-system spec: schema types + kernel signatures assembled from Parts 1–6, with the CR-faithful naming charter applied throughout. That doc is the input to **Phase 2 (diff vs. legacy)**, **Phase 3 (one consolidated migration)**, and **Phase 4 (effects/ability layer against the Supabase card inventory)**.
