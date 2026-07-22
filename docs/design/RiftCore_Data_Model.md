# RiftCore — Card & Ability Data Model (design spec v1)

**Module:** M0 (RiftCore) · **Date:** 2026-07-22 · **Status:** design, ready for Code
**Hard constraint:** nothing in this spec may affect app behavior before July 31. See §6.

---

## 0. Why this exists

The current model stores one flat effect program per card. Ashwin's 52 locked Function decisions (see `riftcore-function-decisions.json`) break that model in five specific ways:

1. **Multi-stage abilities** — "Reveal, then force-play, then Stun" (Bone Skewer) is three ordered steps, not one effect.
2. **Additional costs ≠ effects** — Sacrifice's "kill a friendly Mighty unit" is paid *before* resolution; Wallop's "spend a buff" is an alternative cost.
3. **Triggers beyond OnPlay/Deathknell** — "when damaged" (Noxian Guillotine), "while attacking/defending", Static.
4. **Conditional & optional steps** — "if this kills it, draw" (Disintegrate); "each player *may*" (Whirlwind); "you *may* move up to one" (Moonfall).
5. **Dynamic values** — Dancing Grenade's bonus damage scales with a game-state counter, so `value` is sometimes an *expression*, not a constant.

Plus the value-bearing keyword ask (Assault X / Shield X) needs `value` as a first-class field rather than something parsed out of card text.

Expressing all 52 decisions in the model below **works** — that's the validation gate this design already passed. It also surfaced **25 distinct functions** (the built kernel has ~10), which sizes the registry gap.

---

## 1. Database choice — recommendation and reasoning

Ashwin asked for an explainer. Short version: **Postgres (via Supabase)**. Here's the actual comparison.

| Family | Examples | Shape | Fit for us |
|---|---|---|---|
| **Relational** | Postgres, MySQL, SQLite | Tables + enforced relationships (foreign keys); SQL queries; transactions | **Strong.** Our data is textbook parent-child: card → abilities → steps. |
| **Document** | MongoDB, Firestore | JSON-like docs, flexible/no enforced schema | Weak fit. We'd gain flexibility we don't need and lose the integrity checking that catches exactly the "arrays drift silently" failure we're trying to escape. |
| **Graph** | Neo4j | Nodes + edges, path queries | Overkill. Ours is a hierarchy, not a network. |
| **Key-value** | Redis, DynamoDB | Fast lookup by key, no rich queries | Good cache, wrong source of truth. |

**Why Postgres specifically:**
- **Constraints catch errors at write time.** A step can't reference a nonexistent ability; a function must be in the allowed set. This is the structural fix for hand-maintained arrays going out of sync.
- **JSONB escape hatch.** Postgres lets a column hold semi-structured JSON *inside* a relational table. So when a future set prints a genuinely weird one-off mechanic, it goes in a JSONB `params` column — no schema migration, no blocked release. This is the direct answer to "expand as more sets release more complicated mechanics": rigid where rigidity helps (structure, ordering, references), flexible where it doesn't (per-function parameters).
- **Real queries.** "Every card with a while-defending trigger", "every BuffMight step with value ≥ 3", "every card whose ability count > 2" are one-line SQL. These are the substrate for function-driven puzzle generation later.
- **Supabase is already the deferred plan** — it *is* Postgres, with auth/REST/realtime on top. Choosing Postgres now means the post-July-31 switch is a data load, not a redesign.

**Trade-off, stated honestly:** relational schemas are more work to change than document stores. We mitigate that with JSONB for the volatile part (`params`) and keep the rigid part (identity, ordering, references) in real columns. That's the standard hybrid and it's the right call here.

---

## 2. The schema (storage-agnostic; identical shape as JSON files or Postgres tables)

```
cards                 PK card_code
  name, set_id, collector_number, type, subtype, rarity,
  energy, power_count, might, speed, is_signature, is_token, text_raw

card_domains          PK (card_code, domain)          -- many-to-many; handles Colorless & multi-domain
card_power_pips       PK (card_code, domain)          -- recycle pips; count column. Separate from power_count.
card_keywords         PK (card_code, keyword)         -- value INT NULL  <-- Assault 2 / Shield 3 live here
card_tags             PK (card_code, tag)
card_bans             PK (card_code, format)          -- effective_date

card_abilities        PK ability_id
  card_code FK, ability_idx INT, trigger, timing, speed,
  additional_cost JSONB NULL,      -- Sacrifice: kill own Mighty unit; Wallop: spend-a-buff alt cost
  repeat JSONB NULL,               -- {cost, maxTimes}  <-- Blood Rush maxTimes=1
  UNIQUE (card_code, ability_idx)

ability_steps         PK step_id
  ability_id FK, step_idx INT,
  function, target, target_scope,
  value JSONB NULL,                -- constant OR {"expr": "..."} for dynamic values
  condition TEXT NULL,             -- "if-previous-step-killed", "if-solo-at-location", ...
  is_optional BOOL,
  UNIQUE (ability_id, step_idx)
```

**Controlled vocabularies** (enum-backed, extensible):
- `trigger`: `OnPlay · Deathknell · Static · WhileAttacking · WhileDefending · WhenAttacking · WhenDefending · WhenDamaged · OnBeginningPhase · Activated`
- `target_scope`: `single · multi · pair · all · all-at-battlefield · one-each`
- `function`: the 25 in the decisions artifact (see §3).

**Why `value` is JSONB:** it holds `3`, or `{"amount":-4,"floor":1,"duration":"thisTurn"}`, or `{"expr":"1 * timesThisSpellDealtDamageThisTurn"}`. One column, no per-function table explosion. This is the JSONB escape hatch doing its job.

---

## 3. Function vocabulary — current state

**Built in `core/effects.ts` (10):** Damage, BuffMight, DebuffMight, SetMight, GrantKeyword, Move, ReturnToHand, Stun, Draw, Counter.

**Surfaced by the 52 decisions but NOT built (15):** KillUnit, KillGear, Fight, Ready, RecycleFromHand, ReturnFromTrash, ForcePlay, Reveal, Channel, Predict, BuffAmplify, MoveToBattlefield, RegisterDelayedKill, ReplayFromChain, GrantCostIgnore.

That gap is the concrete build list for the kernel's registry. Note three that need real rules work, not just a primitive:
- `RegisterDelayedKill` (Noxian Guillotine) — a *delayed trigger* attached to a unit, firing on a later event. Requires the event substrate, which we have.
- `ReplayFromChain` (Dancing Grenade, Death from Below) — re-cast from chain/trash with an alternate cost, and a **dynamic** bonus.
- `Fight` — mutual Might-as-damage exchange; distinct from `Damage` and needs its own combat path.

---

## 4. The compiler (parse → propose → human-confirm)

Hand-authoring normalized rows for ~900 cards is not sustainable; Ashwin confirmed human-confirm ends after July 31. So:

**`scripts/compile_abilities.py`**
1. Read `cards.json` text + the Master Inventory columns (Function, Ability Target, **Ability Value**, Keywords, Speed).
2. Tokenize card text on its existing regular structure — `[Action]` / `[Reaction]` / `[Hidden (X)]` / `[Repeat (N)]` prefixes, sentence splits, "Then …", "If … , do this: …", "You may …", "up to N", "to a minimum of N".
3. Emit **candidate** `card_abilities` + `ability_steps` rows with a **confidence score** per card.
4. Write two outputs: `abilities.json` (high-confidence, auto-accepted) and `abilities.review.json` (low-confidence queue with the parsed guess + the source text).
5. Ashwin reviews only the queue; confirmations feed back as overrides so the same card never re-queues.

**Calibration set:** the 52 decided cards are the compiler's test fixture — run it against them, and any card where the compiler disagrees with Ashwin's locked value is a parser bug. That gives a measurable accuracy number before it's trusted on the long tail.

**Idempotent + re-runnable** so each new set (Vendetta and beyond) is a re-run plus a short review queue, not a fresh manual pass.

---

## 5. Sequencing

| Phase | What | When |
|---|---|---|
| **A** | Normalized **JSON artifacts** in-repo (`src/data/model/`), generated by the compiler; schema identical to §2 | now → July 31 |
| **B** | Same schema promoted to **Supabase/Postgres**, bulk-loaded from the Phase-A artifacts; app reads from DB | after July 31 |

Because Phase A's shape *is* the Postgres shape, Phase B is a load script, not a redesign.

---

## 6. Zero-impact guarantee (July 31 protection)

Non-negotiable, and Code should treat these as acceptance criteria:
- New artifacts live in a **new directory** (`src/data/model/`); **nothing imports them**.
- `src/data/cards.json` is **untouched** and remains the app's only card source through launch.
- **No build-step change**, no CI change; the compiler runs **manually** (`python scripts/compile_abilities.py`).
- **No runtime path** reads the new artifacts. Verify by grepping for imports before merge.
- The existing `core/` package is **not modified** by this work — the registry expansion (§3) is a separate, later change.

The July 31 switch is changing *what the app reads*, not changing what exists.

---

## 7. Card-text discrepancies — both RESOLVED (Ashwin, 2026-07-22)

Both were encoded to printed card text and are now confirmed. No open items.

1. **Hidden Blade** (`ogn-213-298`) — **CONFIRMED: the KILLED unit's controller draws 2.** "Its controller" refers to the unit that was killed, so the draw is a downside attached to the caster's target choice, not a bonus for the caster. Encoded accordingly.
2. **Bellows Breath** (`sfd-080-221`) — **CONFIRMED: deals 1 to *up to three* units at a target location** (not all units; the caster chooses). `[Repeat (1)(B)]` = repeat cost is 1 energy + 1 Mind pip. Note: this card is on RiftIQ's net-new list, not in the 52-card artifact — RiftIQ should encode it with this ruling.

---

## 8. Build order for Code

1. `scripts/compile_abilities.py` — §4, with the 52-card calibration fixture.
2. `src/data/model/*.json` — generated artifacts (§2 shape) + `abilities.review.json` queue.
3. `docs/design/RiftCore_Data_Model.md` — commit this spec.
4. *(Later, separate change — not now)* expand `core/effects.ts` with the 15 missing functions (§3) + tests.

Steps 1–3 are inert by construction (§6). Step 4 touches the kernel and should land **after** July 31 or behind an explicit go-ahead.
