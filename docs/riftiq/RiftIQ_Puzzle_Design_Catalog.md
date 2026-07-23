# RiftIQ - Puzzle Design Catalog & Roadmap

**Module:** M5 (RiftIQ) - **Owner:** RiftIQ thread - **Date:** 2026-07-20
**Status:** planning framework, not authoring. Absorbs Ashwin's overnight notes into a
structure that future authoring batches draw from. No puzzles are written here.

This is the map, not the territory: it defines the axes a puzzle can vary along, sorts
your notes into named programs, and (the useful part) cross-references each program
against what RiftCore can actually verify today, so we always know what is authorable
now vs. what is blocked on a primitive, a registry entry, or a new mode.

---

## 1. The design axes

Every puzzle is one point in this space. Cataloging by axis (not by a flat list) is what
lets us plan coverage and spot gaps.

| Axis | Values |
|---|---|
| **Teaching target** | Mechanic/concept - Specific card - Game-state/phase - Combo/interaction |
| **Framing** | Positive (use it here) - Trap (looks right, is wrong/illegal; advanced) |
| **Mode** | BestLine - Sequencing - PredictOutcome - (future: Mulligan, Threat-ID, Combo-Finder) |
| **Difficulty** | Easy - Hard - (future tiers) |
| **Domain** | Fury - Calm - Mind - Body - Chaos - Order |
| **Verification class** | kernel-now - registry-pending - primitive-missing - needs-new-mode |

The last axis is the planning lever and is defined in section 4.

---

## 2. The four content programs (your notes, organized)

### 2A. Mechanic / concept puzzles
Teach one keyword or system in isolation, then in combination.
- Your examples: **Empower**; the **Burn / Flow** combo.
- Full keyword surface still to cover: Assault, Shield, Tank, Backline (all seeded in
  Combat-Math Batch 1), plus Empower, Burn, Flow, Deathknell, Ambush, Hidden, Predict,
  Deflect, Accelerate, Repeat, Ganking, Vision, Legion, Hunt, Weaponmaster, Mighty,
  Quick-Draw, Level/XP, Buff, Stun, Temporary.
- System concepts (not keywords): chain/LIFO ordering (seeded by `seq-mind-1`), rune
  economy (exhaust-for-energy vs. recycle-for-power), fog-of-war reads.
- Shape: usually one Easy "here is the keyword doing its thing" + one Hard "the keyword's
  boundary or interaction." Backline in Batch 1 is the template.

### 2B. Per-card coverage (the end-state program)
Goal: at least one puzzle per card; eventually several per card, each showing a different
line. This is the large program and is where an automated generation flow (not hand
authoring) has to carry the tail.

Priority tiers (your order):
- **T1 - Legend abilities + champions.** Identity-defining; hand-authored first.
- **T2 - High-priority playables.** Cards that are near-auto-includes in almost all decks
  of their domain. Sourced from riftmeta.net (power vs. complexity), riftdecks.com /
  piltoverarchive.com (staples), mobalytics (tournament lists).
- **T3 - Battlefields.** Their control/scoring text drives the win conditions.
- **T4 - Long tail.** Every remaining card, multiple angles, positive + trap.

Dependency: per-card at scale needs (a) the Function / spell Subtype / Ability Target
taxonomy refinement (RiftCore §12, RiftIQ v4 §F.1) so generation can be function-tag
driven, and (b) enough RiftCore primitives that most cards resolve `kernel`. Hand
authoring covers T1; tooling covers T3/T4.

### 2C. Positive vs. Trap framing
Each card eventually gets both:
- **Positive** - the board where this card is the correct tool.
- **Trap** - the board where it looks correct but should not or cannot be used. Advanced
  only. A trap must be provably wrong through the kernel: the play is illegal,
  unaffordable, loses the combat, or violates a rule (e.g., the winning-line restriction).
- Batch 1 already carries traps: `calm-h2` (conquer-for-the-win trap) is a hard trap;
  `fury-e2`'s "sit and defend" and `body-e2`'s mis-allocation are soft traps.

### 2D. Game-state / phase puzzles
Your list, sorted by when in the game the decision happens:
- **Pre-game:** mulligan logic (your hand vs. a specific opponent archetype); first vs.
  second (play/draw choice).
- **Board phase:** holding a battlefield; capturing a battlefield (combat math + combat
  tricks); when to use counterspells; removal combos (your example:
  **Thousand-Tailed Watcher `ogn-116-298` + Bellows Breath `sfd-080-221`** = mass -3
  then repeatable burn to sweep); resource/tempo timing.
- **Closing:** winning the game (only via a legal winning line; `calm-h2` is the seed);
  preventing the opponent from winning (the defensive mirror).

Note: pre-game puzzles do not fit the current three modes (they are hand/pre-board
decisions, not board decisions run through `applyPlay`). They need a new mode. Everything
in the board and closing phases fits BestLine / Sequencing / PredictOutcome.

---

## 3. Mode fit

| Teaching target | Fits current modes? | Notes |
|---|---|---|
| Mechanic (combat keyword) | Yes | BestLine/PredictOutcome; Sequencing for chain order |
| Mechanic (resource/tempo) | Mostly | some need PredictOutcome over multi-turn state |
| Specific card (positive) | Yes | BestLine |
| Specific card (trap) | Yes | BestLine; the wrong option must be kernel-falsifiable |
| Hold / capture battlefield | Yes | combat math + tricks |
| Counterspell timing | Yes | Sequencing (pre-cast vs. hold) or BestLine |
| Removal combo | Yes | Sequencing (order matters) |
| Closing / denying the win | Yes | BestLine + `canScoreWinningPoint` |
| **Mulligan / opening hand** | **No** | new mode (v4 §F.3 "Mulligan/opening-hand") |
| **First vs. second** | **No** | new mode or a pre-game variant |
| **Threat-ID (read opponent)** | **No** | new mode (v4 §F.3 "Threat-ID") |
| **Combo-finder (multi-select)** | **No** | new mode (v4 §F.3), multi-answer shape |

---

## 4. Build-readiness map (the planning payoff)

Sorts every idea into what we can ship-verified now vs. what is blocked and on whom.

- **kernel-now (author freely, `verifiedBy: kernel`):**
  - Any **combat-math** puzzle: Assault, Shield, Tank, Backline, Stun resolve inside
    `resolveCombat`; plus Might/death/spill, scoring, and the winning-line taxonomy. This
    is the deepest zero-primitive well; keep mining it while primitives grow.
  - The **15 registered cards** (RiftCore §7.3): Hextech Ray, Incinerate, Cleave, Charm,
    Punch First, En Garde, Defy, Smoke Screen, Frigid Touch, Convergent Mutation, Gust,
    Existential Dread, Shen, Watchful Sentry, Pit Rookie.

- **registry-pending (cheap upgrade to `kernel`):** the effect uses primitives RiftCore
  already implements (Damage, DebuffMight, BuffMight, MoveUnit, ReturnToHand, Stun, Draw,
  Counter, GrantKeyword, SetMight), but the specific card is not yet in the registry.
  Fix = add one registry entry in the Core thread. Example: the Watcher + Bellows combo
  (mass DebuffMight + repeatable Damage) is primitive-ready, registry-pending.

- **primitive-missing (`cardTruth+author` until a primitive lands):** a genuinely new
  mechanic with no current primitive. Candidates from your notes: **Empower**, **Burn**,
  **Flow**, plus Ambush, Hidden, Predict, Deflect, Accelerate, Level/XP, and most Legend
  abilities. Each such puzzle either triggers a primitive request to the Core thread
  (then it upgrades to `kernel`) or ships author-asserted with card facts still checked.

- **needs-new-mode (RiftIQ work, not a RiftCore issue):** mulligan / opening-hand,
  first-vs-second, threat-ID, combo-finder. Blocked on RiftIQ mode design, not the kernel.

This map produces two standing queues we feed as we go:
1. **RiftCore primitive/registry request queue** (to the Core thread): highest-value
   mechanics first. Your named priorities (Empower, Burn/Flow) lead. Registry-pending
   items (like Watcher/Bellows) are quick wins.
2. **RiftIQ mode-design queue** (this thread): the four new modes above, sequenced after
   the base UI + tutorial are solid.

---

## 5. Prioritized roadmap

- **Now to Thursday:** confirm Combat-Math Batch 1, stand up the puzzle UI flow, then a
  rudimentary-puzzle tutorial (modeled on RiftRecall's). No new authoring during this
  window (batched by your instruction).
- **Batch 2 (post-playtest, bundled with UI + Claude Code commits):** more combat-math
  depth + the 15 registered-card puzzles (all `kernel`), plus the first T1 legend/champion
  puzzles that are expressible today.
- **Parallel enablers:**
  - Primitive/registry requests to Core: Empower and Burn/Flow first (your call);
    Watcher/Bellows registry entry as a quick win.
  - Function / Subtype / Ability Target taxonomy refinement, which unlocks generation
    tooling for the per-card tail (T3/T4).
  - New-mode design for mulligan / pre-game (only if in scope, see section 6).
- **Later:** per-card coverage at scale via generation tooling; positive + trap pairs per
  card; the full game-state library (hold/capture/counter/close/deny).

---

## 6. Open questions to resolve when we batch

1. **Mulligan / pre-game:** new mode for v1, or out of scope until post-Vendetta?
2. **Trap gating:** traps stay Hard-only (per your "more advanced only"), or allow Easy
   traps once the base is proven?
3. **Per-card end-state target:** how many puzzles per card is "done" (2? positive+trap? a
   set per archetype)?
4. **Primitive priority order:** confirm Empower then Burn/Flow lead the Core requests, or
   reorder.
5. **Domain tagging for cross-domain mechanics:** should a puzzle be filed by the featured
   card's printed domain or by the strategic identity it teaches? (Same question raised by
   Batch 1's `order-h2`/`body-e2` flags.)
