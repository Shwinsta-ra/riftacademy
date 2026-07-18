// Metro automatically prefers sessionState.native.ts (iOS/Android) or
// sessionState.web.ts (web) over this file at bundle time based on
// platform — this plain sessionState.ts only exists so tsc, which doesn't
// know about that convention, has something to resolve when type-checking.
// Native is the default/primary target here, matching db.ts.
export * from "./sessionState.native";
