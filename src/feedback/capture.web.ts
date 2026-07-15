import type { Stroke } from "./AnnotationCanvas";

export type Shot = { dataUrl: string; width: number; height: number };

// The app root — App.tsx tags its webWrapper View with this nativeID, which
// react-native-web renders as a real DOM id. Capturing the wrapper rather than
// document.body means a desktop screenshot is the 480px app column, not the app
// column marooned in a sea of empty page background.
export const ROOT_ID = "ra-root";

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

// Capture the current DOM.
//
// This MUST run before the feedback sheet mounts. Capture after the modal is up
// and every report contains a photograph of the report form.
//
// html2canvas is lazy-imported so its ~48 KB gz never lands in the initial
// bundle. The user only pays for it if they actually open feedback.
export async function captureScreen(): Promise<Shot | null> {
  try {
    const { default: html2canvas } = await import("html2canvas");

    // Capture document.body, then CROP to the app column.
    //
    // The obvious implementation — screenshot the #ra-root element — silently
    // loses every modal. react-native-web's <Modal> createPortal()s a div
    // directly onto document.body (see ModalPortal.js), so an open modal is a
    // *sibling* of the app root, not a descendant of it. Screenshot the root
    // and you get the screen underneath the modal the user is trying to report.
    //
    // Capturing body picks the portals back up; the x/y/width/height crop keeps
    // the result the 480px app column rather than a desktop viewport with the
    // app marooned in the middle of it.
    const root = document.getElementById(ROOT_ID);
    const rect = root
      ? root.getBoundingClientRect()
      : ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect);

    const canvas = await html2canvas(document.body, {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      useCORS: true, // needs ACAO on card art — see api/img.ts
      allowTaint: false, // a tainted canvas cannot be exported at all
      logging: false,
      backgroundColor: "#14141a", // theme.bg — html2canvas won't inherit it
      scale: Math.min(1, MAX_EDGE / Math.max(rect.width, rect.height)),
      ignoreElements: (el) => (el as HTMLElement).dataset?.feedbackIgnore === "true",
    });

    return {
      dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (err) {
    // Never block a report on a failed screenshot. A text report with full
    // context is still worth far more than nothing.
    console.warn("[feedback] capture failed", err);
    return null;
  }
}

// Burn the user's circles into the bitmap.
//
// Strokes are recorded in *preview* coordinates — whatever width the sheet drew
// the image at. Scale them back to the bitmap's natural size before stroking or
// the circles land somewhere else entirely on a narrow screen.
export async function flattenAnnotations(
  shot: Shot,
  strokes: Stroke[],
  previewWidth: number
): Promise<string> {
  if (!strokes.length || !previewWidth) return shot.dataUrl;

  const img = await loadImage(shot.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = shot.width;
  canvas.height = shot.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return shot.dataUrl;

  ctx.drawImage(img, 0, 0);

  const scale = shot.width / previewWidth;
  ctx.strokeStyle = "#CC2929"; // Fury — reads against every surface in the app
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4 * scale;

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x * scale, stroke[0].y * scale);
    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x * scale, stroke[i].y * scale);
    ctx.stroke();
  }

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
