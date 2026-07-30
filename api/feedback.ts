// POST /api/feedback  →  Discord
//
// Holds the webhook URL in an env var so it never ships to a browser. Without
// this, the URL sits in the public JS bundle and anyone who opens devtools can
// post whatever they like into the channel.
//
// Deploying it: you currently ship with `npx vercel dist --prod`, which uploads
// only the export directory — an api/ folder at the repo root would never make
// it there. Copy it in as part of the build:
//
//   npx expo export --platform web && cp -r api dist/api && npx vercel dist --prod
//
// (There's an npm script for this — see package.json "deploy".)
//
// Env vars, set in the Vercel project (not in the repo):
//   DISCORD_FEEDBACK_WEBHOOK   required
//   DISCORD_FEEDBACK_FORUM     "1" if the target channel is a Forum channel
//
// Deliberately imports nothing. @vercel/node's types would be a dependency the
// copied dist/api folder doesn't have a package.json for, and the request and
// response shapes are small enough to just state.

type Req = { method?: string; headers: Record<string, unknown>; body?: any };
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

// Tags are now data-driven (src/data/feedbackTags.json, regenerated from the
// RA_Feedback Tags sheet), so a fixed allowlist here would need updating every
// time you add a row — and would silently reject reports until you did.
//
// Instead the shape is validated, not the vocabulary: ids must look like ids,
// labels are length-capped, colours must be hex, and there's a cap on how many
// can be attached. That keeps the endpoint from being a free-form relay into
// your Discord while letting the sheet stay the single source of truth.
type Tag = { id: string; label: string; color: string };

const ID_RE = /^[a-z0-9_-]{1,32}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_TAGS = 8;

function cleanTags(v: unknown): Tag[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (t): t is Tag =>
        !!t &&
        typeof t.id === "string" &&
        ID_RE.test(t.id) &&
        typeof t.label === "string" &&
        t.label.length > 0 &&
        typeof t.color === "string" &&
        HEX_RE.test(t.color)
    )
    .slice(0, MAX_TAGS)
    .map((t) => ({ id: t.id, label: t.label.slice(0, 60), color: t.color }));
}

const MAX_TEXT = 1500;
const MAX_IMAGE_BYTES = 4_000_000; // Vercel caps the whole request body near 4.5 MB

// Per-IP throttle. Serverless instances are ephemeral, so this blunts casual
// abuse rather than stopping a determined attacker — which is the right level
// of effort for something whose worst case is "delete the webhook, make a new
// one."
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const clip = (v: unknown, n = MAX_TEXT): string => (typeof v === "string" ? v.slice(0, n) : "");

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const url = process.env.DISCORD_FEEDBACK_WEBHOOK;
  if (!url) return res.status(500).json({ error: "Webhook not configured" });

  const fwd = req.headers["x-forwarded-for"];
  const ip = (typeof fwd === "string" ? fwd.split(",")[0]?.trim() : "") || "unknown";
  if (throttled(ip)) return res.status(429).json({ error: "Slow down" });

  const body = req.body ?? {};
  const tags = cleanTags(body.tags);
  // "Other" is itself a tag, so anything the list doesn't cover still arrives
  // tagged. There's no untagged path left.
  if (!tags.length) return res.status(400).json({ error: "At least one tag required" });

  // "What happened?" is optional on the client (tags + screenshot + breadcrumbs
  // are usually enough to act on), so it must be optional here too — this used
  // to require 3+ chars and silently ate every tags-only report as a 400 that
  // the client then reported to the user as "sent".
  const happened = clip(body.whatHappened);

  const expected = clip(body.whatExpected, 1000);
  const route = clip(body.route, 60) || "Home";
  const id = clip(body.id, 24) || Date.now().toString(36);
  const ctx: Record<string, unknown> = body.context ?? {};

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "Screen", value: `\`${route}\``, inline: true },
    { name: "Platform", value: `${ctx.platform ?? "?"} · ${ctx.viewport ?? "?"}`, inline: true },
    { name: "Build", value: `\`${ctx.build ?? "dev"}\``, inline: true },
  ];

  if (ctx.quizMode) fields.push({ name: "Quiz mode", value: String(ctx.quizMode), inline: true });
  if (ctx.cardId)
    fields.push({
      name: "Card",
      value: `${ctx.cardName ?? "?"}\n\`${ctx.cardId}\`${ctx.cardType ? ` · ${ctx.cardType}` : ""}`,
      inline: true,
    });
  if (ctx.leitnerBox !== undefined)
    fields.push({ name: "Box", value: String(ctx.leitnerBox), inline: true });
  if (typeof ctx.dueAt === "number")
    fields.push({
      name: "Was due",
      value: `${Math.round((ctx.dueAt - Date.now()) / 60000)} min from now`,
      inline: true,
    });
  if (ctx.matchId) fields.push({ name: "Match", value: `\`${ctx.matchId}\``, inline: true });
  if (ctx.turnNumber !== undefined)
    fields.push({ name: "Turn", value: String(ctx.turnNumber), inline: true });
  if (ctx.cardCountOk === false)
    fields.push({ name: "Invariant", value: "**card count is off**", inline: true });

  if (tags.length > 1)
    fields.push({
      name: "Also tagged",
      value: tags.slice(1).map((t) => t.label).join(" · "),
      inline: false,
    });
  fields.push({ name: "Expected", value: expected || "_not given_", inline: false });
  fields.push({ name: "Session", value: `\`${ctx.sessionId ?? "?"}\``, inline: false });

  const payload: Record<string, unknown> = {
    username: "RiftAcademy",
    // A leaked webhook that can't ping anyone is a nuisance, not an incident.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        // Every tag in the title, so the forum thread list is scannable without
        // opening anything. Colour comes from the first — the user's first pick
        // is the closest thing to a primary we have.
        title: tags.map((t) => t.label).join(" + "),
        description: happened || "_no description given_",
        color: parseInt(tags[0].color.slice(1), 16),
        footer: { text: `#${id}` },
        timestamp: new Date().toISOString(),
        fields: fields.slice(0, 25),
      },
    ],
  };

  // Forum channel → one thread per report. This is what makes the channel a
  // triage board instead of a firehose you scroll past.
  if (process.env.DISCORD_FEEDBACK_FORUM === "1") {
    // Discord hard-caps thread_name at 100 chars and 400s past it. Clamp rather
    // than trusting "label length + 60" to stay under the cap forever. The
    // whitespace collapse matters too: a description starting with a newline
    // would otherwise produce a thread titled "[Suggestion]" and nothing else.
    const label = tags.map((t) => t.label).join(" + ");
    payload.thread_name = `[${label}] ${happened.replace(/\s+/g, " ").trim()}`.trim().slice(0, 100);
  }

  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));

  // Breadcrumbs and the raw context go as an attachment, not embed fields —
  // they're far too long for a 1024-char field, and you want them verbatim.
  const dump = JSON.stringify(
    {
      id,
      route,
      tags: tags.map((t) => t.id),
      context: ctx,
      breadcrumbs: body.breadcrumbs ?? [],
    },
    null,
    2
  );
  form.append("files[1]", new Blob([dump], { type: "application/json" }), `context-${id}.json`);

  const img = decodeDataUrl(body.screenshot);
  if (img && img.byteLength <= MAX_IMAGE_BYTES) {
    form.append("files[0]", new Blob([img], { type: "image/jpeg" }), `shot-${id}.jpg`);
  }

  const discord = await fetch(url, { method: "POST", body: form });
  if (!discord.ok) {
    const detail = await discord.text().catch(() => "");
    console.error("[feedback] discord rejected", discord.status, detail);
    return res.status(502).json({ error: "Upstream rejected the report" });
  }

  return res.status(200).json({ ok: true, id });
}

// Returns an ArrayBuffer-backed view specifically. A plain `new
// Uint8Array(Buffer)` is backed by ArrayBufferLike, which TS 5.9 no longer
// accepts as a BlobPart (it can't rule out SharedArrayBuffer). Copying into a
// fresh ArrayBuffer is both correct and cheap at these sizes.
function decodeDataUrl(v: unknown): Uint8Array<ArrayBuffer> | null {
  if (typeof v !== "string") return null;
  const m = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(v);
  if (!m) return null;
  try {
    const buf = Buffer.from(m[1], "base64");
    const out = new Uint8Array(new ArrayBuffer(buf.byteLength));
    out.set(buf);
    return out;
  } catch {
    return null;
  }
}
