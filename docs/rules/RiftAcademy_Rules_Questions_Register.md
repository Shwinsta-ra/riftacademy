# RiftAcademy — Rules Questions Register

**Owner:** RiftCore (M0) · **Purpose:** a persistent, accumulating record of specific rules questions, RiftCore's CR-cited answer, and the eventual judge confirmation.

**Why this exists:** answers scattered in chat evaporate. This register is the single place a rules question, its reasoning, and its authoritative resolution live — so downstream modules (RiftIQ puzzle answers, RiftCoach grading, RiftEngine legality checks) can cite a resolved entry rather than re-deriving it, and so a judge's correction propagates to everything built on the old answer.

**Distinct from the Open Adjudications Register** (the 12 quarantined questions from the clean-room rebuild). That one holds *our own prior rulings awaiting re-derivation*. This one holds *live questions from play*, resolved against the CR and confirmed by a judge.

## Status vocabulary
| Status | Meaning |
|---|---|
| `CR-CLEAR` | The CR answers it directly; judge confirmation is a formality |
| `CR-INFERRED` | Derived by reconciling CR rules/examples; no single rule states it |
| `CR-SILENT` | The CR does not address it; needs a judge or a designer ruling |
| `JUDGE-CONFIRMED` | A judge has confirmed; this is now authoritative |
| `JUDGE-CORRECTED` | A judge contradicted our answer — **check what was built on the old one** |

---

## Q-001 — Can runes be recycled at will to float Power, and can Energy and Power be floated together?

**Asked:** 2026-08-01 (Ashwin) · **Status:** `CR-CLEAR` · **Judge confirmation:** pending

**Question as asked.** Players can float runes ahead of using them — exhausting them for Energy held as a "token," with the exhausted rune later readied by an ability. Can you also *recycle* runes and hold **both** Energy and Power for future use? Or is recycling only possible when a game effect allows it?

**Answer.**

**1. Recycling is a printed ability, not effect-gated.** Every Basic Rune has exactly two abilities (CR 164.2):
- `[E]: [Reaction] — Add [1]` — exhaust for 1 Energy (domainless, CR 163.1.a)
- `Recycle this: [Reaction] — Add [C]` — recycle for 1 Power matching that rune's Domain (CR 164.2.b.1)

Recycling is the **cost** of the second ability. Both carry **Reaction** (CR 813), so either may be activated on any player's turn, in Open or Closed states. No external effect is required.

**2. Yes, Energy and Power can be floated simultaneously.** Both are added to the same Rune Pool (166.1), which holds Energy and Power together for paying costs (166). Exhaust rune A for Energy, recycle rune B for Power — both are available.

**3. ⚠ Correction to the premise — floated resources are NOT usable "whenever."** CR 167: *"Every player's Rune Pool empties at the start of each player's Main Phase and the end of each player's turn."* CR 167.1: unspent Energy or Power is **lost**. There is no banking across turns.
- **Trap:** resources floated during your **Channel or Draw Phase are wiped when your Main Phase begins.**
- Floating survives only within the window between two consecutive emptying events.

**4. ⭐ Exhaust and Recycle are asymmetric — this is the substance of the question.**

| | Exhaust (Energy) | Recycle (Power) |
|---|---|---|
| Rune's fate | stays on Board, exhausted | **bottom of the Rune Deck** (161.2.b, 416) — off the Board |
| Can it be readied later? | **Yes** — Awaken Phase (415) or any ready effect | **No** — nothing remains on the Board to ready |
| Recovery | automatic each turn | must be **channeled again** (2/turn, CR 430) through the rest of an 11-card deck |
| Renewable? | every turn | effectively once, until re-drawn |

The premise "when some ability would ready those runes you will have those runes exhausted and available to ready" is **true for exhausted runes only**. A recycled rune has left the Board; there is nothing to ready. Recycling for Power is spending a board resource semi-permanently, not tapping it.

**5. Practical note — pre-floating is usually unnecessary.** CR 357.1.a and 444.2.c permit activating Reaction-tagged Add abilities **during payment**, resolving immediately and ignoring normal restrictions. You can therefore generate exactly the Energy/Power needed at the moment of paying, instead of pre-floating and risking a pool wipe (§3). Pre-floating is generally worse unless there is a specific reason — e.g. an effect that counts exhausted runes, or deliberately removing the rune from the Board.

**CR citations:** 163.1, 163.2, 164.2, 164.2.b.1, 166, 166.1, 167, 167.1, 161.2.b, 416, 415, 430, 813, 357.1.a, 444.2.c

**Confidence:** high. 164.2 states the abilities verbatim and 167 states the emptying rule verbatim; nothing here rests on inference.

**Worth confirming with a judge anyway:** whether any tournament-floor convention affects *how* floating must be tracked. TR 415.4 requires players to track unspent Energy/Power in a way clear to all players (dice or counters), and TR 415.4.a notes resources being immediately spent need to be communicated but not tracked that way — so a judge may have a practical expectation about representing a floated pool.

**Downstream impact if corrected:** the rune-pool lifetime (167) is implemented in the kernel's `phaseChanged` reducer (fixed during PR #151 — pools previously emptied only at turn end, never at Main-Phase start). A judge correction here would touch that reducer and any RiftIQ puzzle premised on floating resources.

---

## Q-002 — Can runes be recycled before the Beginning Phase to enable "fewer runes than an opponent" triggers?

**Asked:** 2026-08-01 (Ashwin, playing Renekton) · **Status:** `CR-CLEAR` · **Judge confirmation:** pending

**Question as asked.** Oasis Raider and similar cards check rune counts *at your Beginning Phase*. Can I recycle runes at the start of my turn but **before** my Beginning Phase to enable them? Or must I do it at the end of my opponent's turn, wiping the floated Power at my Main Phase? Is there another way?

**Cards in question (live text from `cards.json`):**
- **Oasis Raider** (Unit, 4E, 4 Might): "If you control fewer runes than an opponent at the start of your Beginning Phase, give me +2 Might and [Ganking] this turn."
- **Renekton, Rage Fueled** (Unit, 6E, 6 Might): "[Accelerate] When I attack, if you control 4 or fewer runes, deal 2 to all enemy units here."

**Answer.**

**1. No — there is no priority window before the Beginning Phase.** CR 335: with no Outstanding Tasks, no pending Chain Items, and no Showdown, the Turn Player receives priority **only in the Main Phase**; in *any other phase* play "proceeds to the next substep, step, phase, or turn." The Awaken Phase holds exactly one Task (315.1.b, ready all controlled objects); on completion play advances directly into the Beginning Phase. No player ever holds priority there, so no ability — Reaction-tagged or otherwise — can be activated.

**2. The condition is part of the trigger, not the effect.** Oasis Raider's "if" clause is adjacent to its timing clause, so per CR 383.2.a.1 it belongs to the **Condition**. If false when the Beginning Phase starts, the ability never goes on the Chain and cannot be fixed in response.

**3. ⭐ For Oasis Raider, no recycling is needed — the condition is structurally almost always true in 1v1.** Runes leave the Board only by recycling; both players channel 2 per turn (315.3); **your Beginning Phase precedes your Channel Phase**; and CR 485.7/486.7 give the player going **second** an extra rune on their first Channel Phase.

| Moment | Active player | Opponent | Fewer? |
|---|---|---|---|
| P1 turn 1 Beginning | 0 | 0 | ✗ equal |
| P2 turn 1 Beginning | 0 | 2 | ✓ |
| P1 turn 2 Beginning | 2 | 3 | ✓ |
| P2 turn 2 Beginning | 3 | 4 | ✓ |
| P1 turn 3 Beginning | 4 | 5 | ✓ |

Both players sit exactly one rune behind at their own Beginning Phase, permanently, from turn 2 onward. **Failure case:** an opponent recycling aggressively enough to fall below you (Renekton mirror, or another recycle-heavy list) — that is the real risk, not the default state.

**4. Renekton, Rage Fueled is the opposite case and IS controllable same-turn.** Its threshold is **absolute** ("4 or fewer"), exceeded naturally by ~turn 3, so it needs genuine recycling. But it checks **"when I attack"** — in the Main Phase, where you *do* hold priority (335) — so you may recycle immediately before attacking.

**5. The general technique: recycle during your own Main Phase.** Priority is guaranteed there, the Power can be **spent immediately** rather than wasted, and the rune-count reduction carries into your next Beginning Phase. Preferable to recycling on the opponent's turn, where a priority window requires them to put something on the Chain (not guaranteed) and the Pool empties at end of turn anyway.

**6. ⚠ Correction to the premise: losing the floated Power does NOT defeat the purpose.** Recycling sends the rune to the **bottom of the Rune Deck** (161.2.b, 416) — it leaves the Board permanently. The **count reduction persists** regardless of the Rune Pool emptying (167). Even a "wasted" recycle satisfies the condition. The real cost is tempo: the rune is gone until re-channeled through an 11-card deck at 2/turn.

**CR citations:** 335, 315.1.b, 315.3, 316.3, 383.2.a.1, 485.7, 486.7, 161.2.b, 416, 167, 164.2.b, 813

**Confidence:** high. Every step rests on stated rules; the rune-count table is arithmetic over 315.3 + 485.7 + phase order.

**Worth confirming with a judge:** (a) the absence of any priority window in the Awaken Phase — this is derived from 335's phase clause rather than an explicit "no priority in Awaken" rule, and it is the load-bearing step; (b) whether any tournament convention creates a *de facto* window (e.g. an opponent's courtesy pause) that judges would honor.

**Downstream impact if corrected:** RiftIQ puzzles premised on pre-Beginning-Phase actions; RiftCoach grading of Renekton lines; the kernel's phase advancement (no priority outside Main Phase when idle).

---

## Q-003 — Does Swap (Switcheroo) include a conditional defend buff, and does the buff re-apply to the swapped value?

**Asked:** 2026-08-04 (Ashwin) · **Status:** `CR-CLEAR` · **Judge confirmation:** pending

**Question as asked.** Unit A attacks unit B; B receives Master Yi's "while defending, +2" buff. The attacker then plays Switcheroo. Does the Might swap include the +2, and does B's new swapped Might then receive the +2 **again**? Or does Switcheroo snapshot the Mights so the buff doesn't apply twice?

**Cards (live text):**
- **Master Yi, Wuju Bladesman** (Legend): "While a friendly unit defends alone, it gets +2 Might."
- **Switcheroo** (Spell, 2E 2P): "[Hidden (Any)] [Action] Swap the Might of two units at the same battlefield this turn."

**Answer.**

**1. Wuju Bladesman is a Conditional Passive Ability.** CR 364.3.a recognizes conditional passives by "if"/"while", and its **own example is verbatim** "While I'm attacking or defending alone, I have +2 [M]." Per CR 477.3.b and 477.3.e.1.b–.2.b, **passive-sourced effects never snapshot** — they are continuously re-evaluated.

**2. "Alone" counts friendly units only.** CR 740.2.a: "A unit is alone when there are no other **friendly** units at the same location." The attacking enemy unit does not break aloneness. (CR 740.2.b defines "one on one" separately.)

**3. Swap creates a frozen ±delta, not a value assignment.** CR 433.1.b: "determine the **difference** between these values and then apply an **Increase** for that amount to the lower value... and a **Decrease** of that amount to the higher value." CR 433.1.a: swapping "creates **two different effects**... These effects last for the duration specified." Swap is therefore an **Arithmetic (Layer 3)** effect, not a Layer-1 "Might becomes X".

**4. Worked example** — Fizz, Trickster (3 Might, Chaos) attacking; Akali, Silent (4 Might, Calm) defending alone under Master Yi, Wuju Bladesman (Calm/Body). Legal matchup; Switcheroo is Chaos.

**Case A — Switcheroo resolves AFTER the Defender designation:**

| Step | Fizz | Akali |
|---|---|---|
| Defender designated, alone → passive | 3 | 4 + 2 = **6** |
| Switcheroo: difference = 6 − 3 = **3** → +3 to Fizz, −3 to Akali | | |
| Increases first (477.3.e.1): 3+3 · 4+2 | **6** | 6 |
| Decreases last (477.3.e.2): 6−3 | 6 | **3** |

Combat: Fizz kills Akali (6 assigned vs lethal 3) and survives (3 assigned vs 6 Might).

**Case B — Switcheroo resolves BEFORE the designation:** difference = 4 − 3 = **1** → +1 Fizz, −1 Akali. Then the passive applies: increases 3+1 · 4+2, decreases 6−1 → **Fizz 4, Akali 5.** Combat reverses: Akali kills Fizz and survives.

**Case C — buff drops after Case A** (Akali no longer alone): increases 3+3 · 4+0, decreases 4−3 → **Fizz 6, Akali 1.** Akali sits *below her printed Might*, carrying a −3 computed against a buff she no longer has.

**5. Direct answers.** **Yes**, the swap includes the +2 — the difference is computed against *current* Might, which is the layered result (there is no separate "base Might" on the Board; printed Might applies only in Non-Board zones, CR 711). **No**, the +2 does not apply a second time — CR 476.1 applies each effect **once** per fixed-point resolution, and because Swap contributes a delta rather than setting a value, the passive is not double-counted.

**6. ⭐ Consequence — the delta is frozen but the passive stays live.** If B later stops defending alone (a friendly unit arrives, or combat ends), the +2 drops while the +1/−1 delta persists: **A = 5, B = 4**. The values are then no longer reversed.

**7. ⭐ Resolution timing changes the locked-in delta, and the governing principle is:** **Swap benefits whoever controls the LOWER unit, and its value equals the difference at resolution.** In the worked example Fizz (3) is below Akali (4), so the attacker benefits — and the defender's +2 *enlarges* the gap, turning a 1-point swing into a 3-point swing. **A conditional defensive buff therefore backfires into a known Swap effect.** Practical: the player who gains from the swap wants it resolved as late as possible (after designations and conditional buffs); the buffed player would rather not meet the condition at all.

**8. Targeting.** Switcheroo chooses specific units = Targeting (CR 355.6). Untargetable units cannot be chosen; a unit becoming untargetable before resolution causes a mistarget (758.1).

**CR citations:** 433.1, 433.1.a–c, 364.3.a, 740.2.a–b, 476, 476.1, 477.3.b, 477.3.e.1–.2, 711, 464.2.c, 355.6, 758.1

**Confidence:** high. Every step is a stated rule; 433.1.b's difference-and-delta construction is explicit, and 364.3.a's example matches the card verbatim.

**Worth confirming with a judge:** whether "the Might of two units" in Switcheroo is read as current (layered) Might — this follows from there being no board-side "base Might" concept, but it is the one place the card's plain wording could be misread as swapping printed values.

**⚠ Note for the quarantined-rulings review:** CR 740.2.a defines "alone" as **no other friendly units at the location**. Any prior RiftAcademy ruling stating that "alone" checks enemy units should be re-derived against this rule.

**Downstream impact if corrected:** Layer-3 arithmetic ordering in the kernel; any RiftIQ puzzle using Swap or conditional defend buffs; RiftCoach evaluation of Switcheroo timing lines.

---

## Q-004 — Can "choose a non-unit card" (Sabotage) select a multi-type Unit-Gear (Patched Porobot)?

**Asked:** 2026-08-04 (Ashwin) · **Status:** `CR-CLEAR` · **Judge confirmation:** pending

**Question as asked.** Patched Porobot is [Unit][Gear] and counts as both for triggers (e.g. Hwei's discard branches). Sabotage says "Choose a non-unit card from it." Can Sabotage take Patched Porobot — it *is* a unit (so no), but it is *also* a gear, which is technically non-unit (so yes)?

**Cards (live text):**
- **Sabotage** (Spell): "Choose an opponent. They reveal their hand. Choose a non-unit card from it, and recycle that card."
- **Patched Porobot** ([Unit][Gear], 2 Might): "When you play me, if you control 3 or more other gear, draw 1."
- **Hwei, Brooding Painter** (Unit): "When I move, draw 1, then discard 1. Then, do the following based on the discarded card's type: Spell — Draw 1. / Gear — Ready up to 2 runes. / Unit — Give me +3 Might this turn."

**Answer: No. Sabotage cannot choose Patched Porobot.**

**1. The CR states the answer directly.** CR 133.3: "Spells and other effects can refer to categories... inclusively or exclusively. Example: A 'non-unit card' is **any card that is not a unit**. Example: A 'unit' is **any game object that is a unit, regardless of any other categories it belongs to**." Patched Porobot is a unit regardless of also being gear; "non-unit" excludes it. CR 178.1 supplies the general principle: a multi-type object "**has the properties of all of their types**, except where they are mutually exclusive." Patched Porobot *is* a unit — holding the gear type additionally does not make it "not a unit." A "non-unit card" criterion excludes every card that is a unit, and Porobot is one.

**2. The CR's construction is one-directional.** CR 178.3: a multi-type object "can be affected by Game Effects that modify or interact with **any** of its types," with four positive examples (Kill all units / all gear / a unit / a gear all hit a unit-gear). Multiple types make an object reachable by **more** effects, never exempt from any. Reading a negative criterion the other way would make the same object both a bigger target for selections and a bigger beneficiary of exclusions — incoherent with 178's purpose.

**3. General formulation.** **Positive criteria: a multi-type object qualifies under *either* type. Negative criteria: it is excluded by *either* type.**

**4. The Hwei mirror confirms it.** Discarding a unit-gear to Hwei fires **both** the Gear branch (ready up to 2 runes) **and** the Unit branch (+3 Might) — CR 178.3 in the positive direction.

**5. Footnotes.** Sabotage's choice happens at **resolution** (you cannot choose before the hand is revealed — CR 355.5.b), so it is not a play-time target. If the revealed hand holds no non-unit card, Sabotage was still legal to play and the choose-and-recycle is skipped as impossible (CR 358.3.a).

**CR citations:** 133.3 (direct), 178.1, 178.1.a, 178.2, 178.3, 355.5.b, 358.3.a

**Confidence:** very high — upgraded on audit: CR 133.3 states the negative-criterion case verbatim; no inference remains.

**Worth confirming with a judge:** none narrower than the whole — but if asking anyway, phrase it as: "does a Unit-Gear satisfy 'non-unit'?" and expect "no."

**Downstream impact if corrected:** kernel `isCategory` predicate over `categories[]`; any RiftIQ puzzle involving multi-type selection; Hwei branch resolution.

---

## Template for new entries

```
## Q-00N — <question in one line>
**Asked:** YYYY-MM-DD (who) · **Status:** <status> · **Judge confirmation:** pending | YYYY-MM-DD
**Question as asked.** <verbatim or close paraphrase — preserve the premise, including any error in it>
**Answer.** <CR-cited, numbered points; flag premise corrections explicitly>
**CR citations:** <list>
**Confidence:** <high|medium|low, and what it rests on>
**Worth confirming with a judge:** <the specific sub-question, if narrower than the whole>
**Downstream impact if corrected:** <what code/content is built on this answer>
```
