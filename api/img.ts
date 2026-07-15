// GET /api/img?u=<encoded card image url>
//
// Why this exists: html2canvas draws images into a <canvas>. A cross-origin
// image served without an Access-Control-Allow-Origin header taints that canvas,
// and a tainted canvas cannot be exported at all — toDataURL() throws outright.
//
// Card art loads from cmsassets.rgpub.io. If that CDN doesn't send ACAO, every
// screenshot of the Quiz screen either comes back with a card-shaped hole or
// fails entirely. Since card art is the literal subject of the highest-value bug
// categories ("mask covers the wrong area", "card art missing"), a screenshot
// without it is worth close to nothing.
//
// This re-serves the image from the app's own origin with the right header, and
// caches it immutably at the edge so it costs one fetch per image, ever.
//
// Run the tainted-canvas check in the README first. If the CDN already sends
// ACAO, delete this file rather than carrying a proxy you don't need.

type Req = { query: Record<string, unknown> };
type Res = {
  status: (code: number) => Res;
  setHeader: (k: string, v: string) => void;
  send: (b: Buffer) => void;
  end: (b?: string) => void;
};

// An open proxy gets abused. Only ever fetch from known card-art hosts.
const ALLOWED = new Set(["cmsassets.rgpub.io", "api.riftcodex.com"]);

export default async function handler(req: Req, res: Res) {
  const raw = req.query.u;
  if (typeof raw !== "string") return res.status(400).end("Missing u");

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).end("Bad url");
  }

  if (target.protocol !== "https:" || !ALLOWED.has(target.hostname)) {
    return res.status(403).end("Host not allowed");
  }

  const upstream = await fetch(target.toString());
  if (!upstream.ok) return res.status(upstream.status).end("Upstream error");

  res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/png");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
}
