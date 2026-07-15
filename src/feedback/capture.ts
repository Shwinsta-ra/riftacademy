// Metro prefers capture.web.ts (web) or capture.native.ts (iOS/Android) over
// this file at bundle time. This exists only so tsc, which doesn't know about
// that convention, has something to resolve — same reason src/lib/db.ts exists.
export * from "./capture.native";
