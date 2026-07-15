import { Platform } from "react-native";

// Card art comes from Riot's CDN (cmsassets.rgpub.io), which does not send an
// Access-Control-Allow-Origin header. That's fine for simply *displaying* an
// image — but html2canvas has to draw every image into a <canvas>, and a
// cross-origin image without CORS headers permanently taints that canvas.
// A tainted canvas can't be exported at all: toDataURL() throws.
//
// The visible symptom, confirmed in the wild: feedback screenshots of the Quiz
// screen came back with the card missing. Which guts the whole point, since
// "the mask covers the wrong area" and "card art is wrong" are the two reports
// that most need a picture.
//
// So on web, card art is served through our own origin via api/img.ts, which
// re-serves the bytes with the right header and caches them immutably at the
// edge (one fetch per image, ever). Native isn't affected — it doesn't have a
// canvas or a same-origin policy — so it keeps hitting the CDN directly.
export function cardImageUri(url: string): string {
  if (Platform.OS !== "web" || !url) return url;
  return `/api/img?u=${encodeURIComponent(url)}`;
}

// If the proxy is ever down or misconfigured, card art must not disappear from
// the app itself — a broken screenshot is an inconvenience, a broken quiz is an
// outage. Screens pass this to <Image onError> to fall back to the raw CDN URL.
export function cardImageFallback(url: string): string {
  return url;
}
