import type { Stroke } from "./AnnotationCanvas";

export type Shot = { dataUrl: string; width: number; height: number };

export const ROOT_ID = "ra-root";

// Native capture is stubbed — v1 is web-only, and the bubble degrades to a
// text-only report on native rather than shipping a broken camera. Same
// platform-split convention as db.ts / db.web.ts / db.native.ts.
//
// To turn it on:
//   npx expo install react-native-view-shot
//   import { captureScreen as viewShot } from "react-native-view-shot";
//   const uri = await viewShot({ format: "jpg", quality: 0.72, result: "data-uri" });
//
// flattenAnnotations then needs a native compositor. The cheapest path is to
// POST the raw shot plus the stroke JSON and composite server-side in
// api/feedback.ts — one code path instead of two.
export async function captureScreen(): Promise<Shot | null> {
  return null;
}

export async function flattenAnnotations(
  shot: Shot,
  _strokes: Stroke[],
  _previewWidth: number
): Promise<string> {
  return shot.dataUrl;
}
