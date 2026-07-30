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
// Empty today — v1 is the only version that has ever existed.
const MIGRATIONS: Record<number, MigrationStep> = {};

// Lifts `events` from `fromV` to `toV`, chaining through any intermediate
// versions. Identity pass when fromV === toV (the common case today, since
// CURRENT_SCHEMA_VERSION is still 1).
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
