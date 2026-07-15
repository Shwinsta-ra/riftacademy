// Metro automatically prefers db.native.ts (iOS/Android) or db.web.ts (web)
// over this file at bundle time based on platform — this plain db.ts only
// exists so tsc, which doesn't know about that convention, has something to
// resolve when type-checking. Native is the default/primary target here.
export * from "./db.native";
