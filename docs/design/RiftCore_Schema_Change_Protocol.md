# RiftCore Schema-Change Protocol (canonical)

**Owner:** RiftCore (M0) · **Status:** canonical · **Applies to:** every module that reads or writes the match-event schema (RiftNotes, RiftEngine, RiftLab, RiftCoach, RiftIQ).

This is the standing contract for how the shared match-event schema (`src/lib/core/schema.ts`) changes over time — how a module reports something it can't represent, how RiftCore responds, and how every module's **past and future** outputs stay valid across changes. Read this before assuming the schema can't hold something; file a gap rather than working around it locally.

The rule in one line: **the schema changes in RiftCore, announced by fragment, never patched privately in a consumer.** Same principle as module boundaries.

---

## 1. When you hit something the schema can't represent

Do **not** extend the schema in your own module, invent a local field, or stuff it into an existing field's string. File a **schema-gap fragment** and keep going with what you can represent.

**Where:** `docs/updates/pending/YYYY-MM-DD-<module>-schema-gap-<topic>.md`
**Addressed to:** RiftCore (M0) + Admin.
**Must contain (evidence, not vibes — this is the false-fragment lesson):**
1. **The concrete game situation** that can't be represented — the actual card/board/sequence, ideally with the RiftNotes notation or a cards.json id. (Like this schema doc did for the dropped reveal event.)
2. **What you tried to map it to** and why it doesn't fit.
3. **Whether you believe it's additive or breaking** (your read; RiftCore decides).
4. **Who's blocked** and how urgently.

## 2. What RiftCore does in response

1. Classifies the change **additive vs breaking** (§3).
2. Bumps `CapturedMatch.schemaVersion`.
3. Writes the migration if breaking (§3).
4. Publishes a **schema-change fragment** — the delta, the new version, the migration (if any), and a **compatibility note** telling each consumer what (if anything) they must do.
5. Code implements the `schema.ts` + `applyEvent` change and lands it.

Consumers then adopt by **targeting the announced version** — they never race ahead of the published change.

## 3. Additive vs breaking — the rules that keep past data valid

The whole model rests on one fact: **the only persisted ground truth is the raw `GameEvent[]`. Everything else is derived and disposable.**

**Additive (the default, and free):** new event variants, new *optional* fields, widening a type to nullable. A v1 stream is automatically a valid v2 stream — it just lacks the new events, and `applyEvent` treats an absent event as "didn't happen." **No migration of past data is required.** Most schema growth (new keywords, new mechanics → new event types) is additive.

**Breaking (rare, needs a migration):** a field changes meaning, an event splits, a required field is added. RiftCore writes a pure `migrate(events, fromV, toV): GameEvent[]`. Migrations **chain** (v1→v2→…→vN) so any old stream reaches current. Raw history is **never edited in place** — you transform the log, you don't patch state.

## 4. How each module's PAST outputs adapt (the important part)

- **Modules that store raw event streams** (RiftNotes captures, RiftEngine reconstructions): read them through `migrate(...)` **lazily on read** — the stored raw stays at its original version, and RiftCore lifts it to current in memory when you read it. Additive bumps need no migration at all; old captures just keep working. You never rewrite your archive.
- **Modules that store DERIVED outputs** (RiftCoach grades/KPIs, RiftLab tier lists/aggregates, RiftIQ `DecisionPoint`s built from captures): **do not migrate them — re-derive them.** Because they're pure functions of the event stream, the old derived output is disposable: re-run your derivation over the migrated-on-read source and you get the correct current-version result. You never migrate a grade or a tier list; you regenerate it.

That asymmetry is the payoff of event-sourcing + a pure kernel: raw is migrated (usually for free), derived is regenerated (always correct). No module ever hand-patches historical outputs to match a new schema.

## 5. What you can rely on

- **`schemaVersion` is always present** on a `CapturedMatch`. Key every migration decision off it.
- **Additive changes will not break you** if you ignore fields you don't know about (so: tolerate unknown event variants and unknown optional fields rather than throwing).
- **Breaking changes always ship with a migration and a compat note** before you're asked to adopt.
- **The schema owner is RiftCore.** One source of truth, one changelog (the pending fragments + this protocol), no per-module forks.

---

*Filing a gap is a healthy finding, not a failure — the dropped reveal event was caught exactly this way. Route it here; don't route around it.*
