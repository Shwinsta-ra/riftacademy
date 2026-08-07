# RiftCore → M9: Game-Truth Change Detection — Requirement Spec (2026-08-06)

**What this is:** Core specifies *what must be protected* and *what constitutes a violation*. **M9 owns the mechanism** — triggers, scheduling, alerting, retention. Nothing below prescribes implementation; where it sounds like it does, treat it as the requirement it encodes and build it your way.

---

## 0. Blocking question first

**Are migrations 008 and 009 committed to a branch with an open PR, or were they applied to the live database without being written to the repo?**

- **Committed, PR pending merge** (GitHub was degraded 2026-08-06) → no issue. Core's earlier "repo/live drift" flag is **withdrawn**, and the drift item in `CODE_verify_supabase_state.md` should be dropped rather than actioned.
- **Applied live, not committed** → genuine drift; commit them independent of GitHub's availability.

Core is not assuming which. One line back settles it, and it determines whether Code opens the drift issue at all.

## 1. Why this is needed, with today's evidence

Two things were verified through the Supabase GUI today, and together they define the gap:

- **`cards_champion_units_only` works.** Setting `supertypes = ["Champion"]` on `ogs-019-024` (a Legend) was rejected with `ERROR 23514`, naming the constraint and dumping the failing row. CR 133.7.a is enforced at the database layer.
- **But constraints only catch what they encode.** Nothing would catch someone setting Shadow's `supertypes` to `[]`, editing a card's `might`, or deleting a `card_bans` row. Every one of those is *legal* SQL and *silently wrong*.

This is the same pattern Core and M9 both named on 2026-08-05: **gates that check internal consistency cannot detect a defect that is uniform, absent, or simply unauthorized.** Detection has to come from outside the operation.

## 2. Scope — protect game-truth only

The existing partition is the boundary; do not invent a new one.

| Partition | Tables | Expected to change | Posture |
|---|---|---|---|
| **Game-truth** | `cards`, `card_printings`, `keywords`, `card_keywords`, `card_abilities`, `card_bans`, `modes`, `format_sets` | Only via migration | **Any change outside the migration path is a violation** |
| **Application** | `decks`, `deck_cards`, `card_inventory`, `deck_external_ids`, `analysis_tags`, `card_analysis_tags` | Constantly, by users and app | **No detection.** Changing is the point |

Scoping to game-truth is what keeps the signal usable. An alerting system that fires on deck edits will be muted within a week and then catches nothing.

## 3. Violation classes and required severity

| Class | Meaning | Severity |
|---|---|---|
| **V1 — Unauthorized change** | Any INSERT/UPDATE/DELETE on a game-truth table not attributable to a migration run | **High** |
| **V2 — Semantic failure** | A scheduled run of `verify_live_state.sql` fails any assertion | **High** |
| **V3 — Silent divergence** | Table contents differ from the repo-committed checksum | **High** |
| **V4 — Detection failure** | V3 fires with **no** corresponding V1 record | **Critical** — the audit path itself was bypassed or is broken. This is the meta-check and matters more than any single data error |

## 4. Three required layers, each catching what the others miss

The layering is the requirement, not a menu — each answers a different question.

**Layer 1 — Change record ("who, what, when, and what was it before").**
Every game-truth mutation is recorded with: table, operation, primary key, **the complete prior row**, the new row, the database user/role, and a timestamp. The prior row is the load-bearing part: it is what makes a mistaken edit **recoverable** rather than merely detectable. The record store must be **append-only** — no updates, no deletes, including by admin roles. Retention: indefinite (game-truth changes are rare; volume is negligible).

**Layer 2 — Content checksum ("did anything change at all").**
A per-table content hash, compared against a value committed in the repo. This catches changes nobody thought to assert — assertions only find what we anticipated. This is the direct extension of the CI drift check already agreed for the abilities artifact (2026-08-05), and ideally shares its plumbing.

**Layer 3 — Scheduled semantic verification ("is the meaning still right").**
`verify_live_state.sql` (Core-owned; Code is authoring it now) run on a schedule, alerting on any assertion failure. Frequency is M9's call — Core's view is that daily is sufficient, since game-truth changes are rare and a day of exposure is tolerable given Layers 1 and 2 catch the change itself faster.

## 5. Alerting contract

- Alerts route to wherever M9 already sends operational alerts; Core has no requirement beyond **the alert must reach a human, not only a log**.
- Every alert must carry: violation class, table, primary key(s), prior value, new value, and actor.
- **An alert is not an instruction to revert.** Wording matters here: a manual change is not automatically wrong — an emergency correction through the GUI is a legitimate act. The required framing is *"this changed outside the migration path; confirm it was intended, and if so, land it as a migration so the repo stays reproducible."* That keeps the GUI usable under pressure without letting emergency edits become invisible permanent state.

## 6. The reconciliation loop (the point of the whole system)

Detection is only useful if it terminates. Required end state for any V1:

1. Alert fires with prior and new values.
2. A human confirms **intended** or **mistaken**.
3. **Intended** → the change is written as a migration and the repo checksum is regenerated. Live and repo re-converge.
4. **Mistaken** → the prior value from Layer 1 is restored, again via migration.

Either path ends with **the repo able to rebuild the live database**. That property is the actual goal; detection is just how we notice when it has lapsed.

## 7. Ownership summary

| Item | Owner |
|---|---|
| Which tables are protected; what counts as a violation; severity classes | **Core** (this doc) |
| `verify_live_state.sql` assertion content | **Core** |
| Triggers, audit store, checksum mechanism, scheduling, alert routing, retention | **M9** |
| Confirming intended vs mistaken on each alert | **Ashwin** |

## 8. Non-goals
- Do not extend this to the application partition.
- Do not block or restrict GUI access. The requirement is **visibility**, not prevention — a locked-down database that cannot be corrected in an emergency is worse than one whose corrections are recorded.
- Do not build a UI for this. Alerts plus queryable history are sufficient.
