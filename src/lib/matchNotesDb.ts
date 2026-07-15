// Metro automatically prefers matchNotesDb.native.ts (iOS/Android) or
// matchNotesDb.web.ts (web) over this file at bundle time based on platform
// — this plain file only exists so tsc, which doesn't know about that
// convention, has something to resolve when type-checking.
export * from "./matchNotesDb.native";
