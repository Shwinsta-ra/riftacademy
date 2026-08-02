// Schema-evolution migration scaffold. See
// docs/design/RiftCore_Schema_Change_Protocol.md for the full policy:
// additive changes need no migration (an old GameEvent[] is already a valid
// newer one); breaking changes get a chained migration step here, keyed by
// the version they migrate *from*. Raw captured streams are migrated lazily
// on read — the stored raw stays at its original version.

import type { GameEvent } from "./schema";
import { CURRENT_SCHEMA_VERSION } from "./schema";

type MigrationStep = (events: GameEvent[]) => GameEvent[];

// Keyed by from-version: MIGRATIONS[1] migrates a v1 stream to v2, etc.
//
// v1 -> v2 is deliberately NOT registered. The RiftCore v2 rebuild replaced
// the entire rules model (GameObject identity, CR-named events, the 32 Game
// Actions), so a v1 event stream is not mechanically liftable: v1's
// instanceId identity model has no CR 124 zone-change semantics, and several
// v1 events (mightModApplied, mightSet) encode a chain-fold Might model that
// v2 replaces with Layers. Nothing is persisted at v1 — see
// docs/design/riftcore-v2/RiftCore_v2_Phase2_Diff.md §5 ("Nothing here is
// persisted, so all of §2 is free to break now") — so migrating a v1 stream
// throws a clear error rather than silently fabricating a v2 one.
const MIGRATIONS: Record<number, MigrationStep> = {};

// Lifts `events` from `fromV` to `toV`, chaining through any intermediate
// versions. Identity pass when fromV === toV — the common case today, since
// CURRENT_SCHEMA_VERSION is 2 and nothing has ever been captured at v1, so no
// stream in existence needs lifting. (This comment previously said the
// constant was "still 1"; it was bumped to 2 by the v2 rebuild in PR #148.)
export function migrate(events: GameEvent[], fromV: number, toV: number): GameEvent[] {
  let current = events;
  for (let v = fromV; v < toV; v++) {
    const step = MIGRATIONS[v];
    if (!step) {
      throw new Error(`no migration registered from schema version ${v} to ${v + 1}`);
    }
    current = step(current);
  }
  return current;
}

// Convenience wrapper: lift a stream to the current version.
export function migrateToCurrent(events: GameEvent[], fromV: number): GameEvent[] {
  return migrate(events, fromV, CURRENT_SCHEMA_VERSION);
}
