# RiftCore v2 — Canonical Model · Part 5: Keywords & Additional Rules

**Source:** Riftbound Core Rules RUP4 (2026-07-16, post-Vendetta). Clean-room; CR-cited throughout.

---

## 1. Keyword taxonomy (CR 800–803)

A Keyword is shorthand for a specific game effect or ability (801). **Every keyword is classified by what KIND of ability it is** — this classification is the schema's keyword model, replacing any flat string list:

| Class | Keywords |
|---|---|
| **Passive Ability** | Assault, Deflect, Ganking, Shield, Tank, Backline, Ambush, Flow |
| **Triggered Ability** | Deathknell, Temporary, Vision, Quick-Draw (also Permissive), Weaponmaster, Hunt |
| **Activated Ability** | Equip, Empower |
| **Permissive** | Action, Reaction, Quick-Draw |
| **Dependent Keyword** | Legion, Level, Empowered |
| **Optional Additional Cost** | Accelerate, Repeat |
| **Deck Constraint** | Unique |
| **Prerequisite/Permission** | Hidden |

**Granting rules (801.3):** effects may grant or remove keywords; the keyword's own definition decides stacking behavior; **if a granting effect specifies no duration, it lasts as long as the object stays on the Board or in its current Non-Board Zone** (801.3.a.3).

## 2. Keyword glossary — canonical definitions (CR 805–829)

| Keyword | Class | Functionally short for | Stacking |
|---|---|---|---|
| **Accelerate** (805) | Opt. Additional Cost | "As you play me, you may pay [1][C]; if you do, I enter ready." Power must match one of the unit's domains ([A] if domainless). **Delayed replacement — once paid, entering ready survives losing the keyword** (805.2.b); **does not trigger "becomes ready" effects** (805.6.a) | redundant |
| **Action** (806) | Permissive | "Can be played/activated during Showdowns on any player's turn." Permission only — does not relax other restrictions (806.3) | — |
| **Assault X** (807) | Passive | "While I am an attacker, I have +X [M]" (X default 1) | **sums** |
| **Deathknell** (808) | Triggered | "When I die, [Effect]." Trigger = being Killed and sent to Trash; **added to the chain BEFORE the card moves to trash**, noting location/attributes (808.1.d.2–.3) | each instance triggers separately |
| **Deflect X** (809) | Passive | opponents' spells/abilities targeting me cost +X; **Power may be any domain** (809.1.c.1); is a **Mandatory Additional Cost** (809.1.d) | **sums** |
| **Ganking** (810) | Passive | "I may move to a battlefield from another battlefield with a standard move" — adds Standard Move options only, no cost, no extra moves | redundant |
| **Hidden** (811) | Prerequisite | enables the **Hide** Discretionary Action. **Hide is not a subset of Play; hiding does not open a chain; playing from facedown does** (811.1.c.1–.3). Hidden permanents must be played to that battlefield (**overrides gear's base-only rule**, 811.1.d.1.a); **a facedown Hidden card gains Reaction** (811.6) | redundant |
| **Legion** (812) | Dependent | "If you have played another card this turn, this card gains [Text]." **One card played satisfies ALL Legion instances you control** (812.2) | — |
| **Reaction** (813) | Permissive | all of Action, plus "can be played/activated during Closed States on any player's turn" | — |
| **Shield X** (814) | Passive | "While I am a defender, I have +X [M]" (X default 1) | sums |
| **Tank** (815) | Passive | "I must be assigned lethal damage before any other unit with the same controller that lacks Tank." Non-Tank units are **invalid assignments** until all Tanks have lethal (815.1.c.2) | redundant |
| **Temporary** (816) | Triggered | "At the start of this permanent's controller's Beginning Phase, **before scoring**, kill this" | redundant, triggers once |
| **Vision** (817) | Triggered | "When this is played, predict." Trigger = entering the Board | **each instance triggers separately** |
| **Equip [Cost]** (818) | Activated | "[Cost]: Attach this gear to a unit you control." **The chosen unit is a Target** (818.1.b.1); creates the **Equipped** state | multiple = multiple abilities |
| **Quick-Draw** (819) | Triggered + Permissive | "[Reaction]" + "When you play this, attach it to a Unit you control" | no effect beyond first |
| **Repeat [Cost]** (820) | Opt. Additional Cost | "You may pay [Cost] as an additional cost; if you do, execute this chain item's instructions one additional time on resolution." **Still only Played once** (820.3.a); choices made at the normal choices step (820.2) | each instance payable separately, once each |
| **Weaponmaster** (821) | Triggered | Play Effect: choose an Equipment you control, pay its Equip cost at a discount regardless of Equip's usual timing, attach to this unit. **The Equip ability is NOT activated and the unit is NOT chosen** (821.1.c.6) | instances trigger separately |
| **Ambush** (822) | Passive | "I may be played to a battlefield where you control Units" + "I have Reaction while being played to such a battlefield." **If no units remain there before finalization completes, the location is no longer valid** (822.3) | redundant |
| **Hunt X** (823) | Triggered | "When I Conquer or Hold, my controller gains X XP" (X default 1). **Both a Conquer and a Hold effect** | **sums** |
| **Level N** (824) | Dependent | "While you have N or more XP, this card gains '[Text]'." **Re-evaluated on controller change** (824.1.c.1) | — |
| **Unique** (825) | Deck Constraint | only one card of that name per deck; interacts with Signature limits (825.3.b). **No gameplay effect** | — |
| **Backline** (826) | Passive | "I must be assigned lethal damage after any other unit with the same controller that lacks Backline"; Backline units are invalid assignments until all non-Backline have lethal | redundant |
| **Empower [Cost]** (827) | Activated | "[Cost]: Empower this. Play only if not Empowered." **Source is not a target** (827.1.b.1); becoming Empowered is a referenceable event | multiple = multiple abilities |
| **Empowered** (828) | Dependent | "While I have the Empowered status, this card gains '[Text]'." **A dependent trigger 'When I become Empowered' is active and fires at that moment** (828.1.d) | — |
| **Flow [Cost]** (829) | Passive | "You may play this from your trash for its Flow cost. Then banish it." Banish is a **delayed replacement effect** (829.1.b.1); **alternate cost replacing base cost**; timing/permissions unchanged except the zone (829.1.b.2); multiple Flow costs → controller chooses (829.1.c.3) | — |

## 3. XP (CR 728–733) — the previously-missing mechanic

- **XP is a resource** accrued/spent/modified by **players** (729). Must be clearly marked; trackable by any method (729.1.a).
- **XP is Public Information** (729.2).
- **Gain** = increase; **Spend** = decrease (730).
- **XP is NOT a Game Object** — cannot be targeted, readied, or exhausted (731).
- **Not shared between allies** in team modes (732); **no cap** (733).
- Consumers: **Hunt X** grants XP on Conquer/Hold (823); **Level N** gates dependent abilities on XP thresholds (824).

**Schema consequence:** `PlayerState` needs an `xp: number` field. Tournament rules confirm players must track XP visibly (TR 415.4).

## 4. Buffs & Mighty (CR 701–711)

- **Buffs are counters on Units** (702); added or **spent** (702.2); spending removes one counter and **only from units you control** (702.2.b.2).
- **Max ONE buff per unit** (702.3). Adding to an already-buffed unit **does not place another** — and critically, the unit **"was not Buffed" for purposes of follow-on effects** (426.1.c: "Buff a unit. Then if it was buffed this way, draw" fails on an already-buffed target; "when you buff me" doesn't trigger).
- Each Buff contributes **+1 Might** (703). Buffs are Game Objects/counters, **not targetable** (704.1).
- **Unit leaves play → all buffs removed**; champions don't retain buffs in the Champion Zone (705).
- **Mighty (706–711): a unit "is Mighty" while Might ≥ 5** (708); **"becomes Mighty"** is the transition from <5 to ≥5 (709) — a 5→6 change does not re-trigger. **Units in Non-Board Zones use printed Might** (711).

## 5. Bonus Damage (CR 712–715)

Intrinsic property granted to **Deal** actions (713). Multiple instances **sum and apply once** (714); **positive only** — a negative computes to zero bonus (714.2); applies to the **total damage of one instance** of the action (715).

## 6. Attachment & Inactive text (CR 716–725)

- **Attached state (718):** printed **Rules Text goes Inactive**; **Effect Text is appended** to the Top-Most Card's rules text; **Might Bonus modulates** the Top-Most Card's Might. Attached cards keep all types/tags, remain targetable, **cannot move separately**, may have a **different controller** than their host (718.5.e–f).
- **Top-Most Card (719):** shares location with all attached cards; **statuses do NOT propagate either way** (exhaust/stun/empower are independent, 719.4); **host leaving the board → all attached cards Detach and remain in their current zones**, order chosen by the host's controller (719.5).
- **Inactive (720–725):** inactive text is not applied at all — **doesn't trigger, doesn't apply, can't be activated** (721.2) — but **the text is still present**, so keyword-checking effects still see it (722.1). Rules Text is never Inactive by default; **Effect Text is Inactive unless the card is Attached** (723–724).

## 7. Ignore, Untargetable, Counters, Additional Turns

- **⭐ Ignore (765–767)** — settles the "ignore/reference keyword" question generally: ignored abilities are **treated as Inactive for that specific game action or procedure only, and only for the players the effect directs** (766–767). CR's examples: "Ignore Deflect while paying this spell's costs" (another player's spell still pays Deflect); "You ignore Backline while assigning combat damage here" (other players assigning at the same location still obey Backline). So **ignore is scoped by (action, player), never global, and never removes the keyword** — the card still *has* it for reference purposes (722.1).
- **Untargetable (757–759):** "can't be chosen by [category] spells and abilities" (757.1). Not legal targets (758). **Becoming untargetable after targeting but before resolution → the spell mistargets on resolution and instructions about that object are ignored** (758.1); if the spell changes out of the category, the object becomes legal again (758.2).
- **Counters (741–749):** Game Objects; **not targetable**; track semi-permanent effects; may have their own effects; can be spent and moved between objects; **removed when an object changes to a non-board zone**; **counters have no controller** (749).
- **Additional Turns (734–738):** inserted into the turn queue after the current turn **without changing Turn Order** (737); multiple queue in generation order (738).
- **Naming cards/tags (760–763)** and **making new choices for a chain item (751–755)** exist as defined procedures — relevant to Vendetta's naming cards and to re-choice effects.

## 8. Findings (Part 5 additions to the Phase-2 diff)

| Finding | Status |
|---|---|
| **XP exists and is fully specified** | 728–733 — the schema gap Ashwin predicted. `PlayerState.xp` required; consumed by Hunt (823) and Level (824). **This is a confirmed Core fault** under the defect contract, found exactly as predicted |
| **Every keyword has an ability CLASS** | 800s — keywords are typed (Passive/Triggered/Activated/Permissive/Dependent/Cost/DeckConstraint). A flat `keywords: string[]` cannot express this; the v2 model needs per-keyword semantics |
| **Buff cap is 1 per unit, and "already buffed" means the buff DIDN'T happen** | 702.3, 426.1.c — follow-on "if it was buffed" clauses fail and "when you buff me" won't trigger. Subtle and easy to model wrong |
| **Mighty = Might ≥ 5; "becomes Mighty" is a transition** | 708–709 — 5→6 doesn't re-trigger. Non-board zones use **printed** Might (711) |
| **Tank/Backline are assignment-VALIDITY constraints** | 815.1.c.2, 826.4.b — non-Tank units are *invalid assignments* until Tanks have lethal; combines with 465.2.c.4's over-assignment ban |
| **Ignore is scoped by action AND player; the keyword remains present** | 765–767 + 722.1 — settles the ignore/reference question for **every** card at once rather than case-by-case |
| **Deathknell triggers before the card moves to trash** | 808.1.d.2–.3 — matches Cleanup step 3a (323.4); location/attributes captured at trigger time |
| **Vision triggers separately per instance; Deathknell too** | 817.2, 808.2 — vs. redundant keywords (Tank/Ganking/Temporary/Ambush/Backline/Accelerate/Hidden) |
| **Assault/Shield/Deflect/Hunt SUM; others are redundant** | 807.2, 814, 809.2, 823.2 — stacking behavior is per-keyword, not uniform |
| **Accelerate's delayed replacement survives keyword loss and doesn't trigger "becomes ready"** | 805.2.b, 805.6.a |
| **Flow is an alternate cost + delayed banish replacement** | 829 — Vendetta; play-from-trash surface entirely absent from legacy |
| **Empowered/Level/Legion are Dependent Keywords** | 812/824/828 — condition + dependent ability; the ability is **Inactive until the condition is met** (727.1.b) |
| **Attachment: statuses don't propagate; controllers can differ; host leaving board detaches all** | 718–719 — gear/equipment model far richer than legacy's truncated equip handling |
| **Inactive text still counts for keyword-presence checks** | 722.1 |
| **Untargetable mid-resolution → mistarget, instructions ignored** | 758.1 |
| **Additional Turns don't alter Turn Order** | 737 |

## 9. Open adjudications register — additions
10. Any prior modeling of buffs as stackable or of "buff a buffed unit" as a successful buff — re-derive under 702.3 / 426.1.c.
11. Equipment cards whose granted-ability text was truncated in `cards.json` — re-derive under Attachment (716–719) once errata/inventory reconciliation lands.
12. Tank-related assignment puzzles — re-derive under 815.1.c.2 + 465.2.c.4 jointly.

## 10. Next (Part 6)
Tournament Rules layering (which TR rules Core must model vs. pure policy), then the patch-notes reconciliation pass (what changed per set) and the **errata × `cards.json` integrity check** — the last inputs before the Part-7 v2 type-system spec.
