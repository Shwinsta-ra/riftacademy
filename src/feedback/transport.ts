export type ReportTag = { id: string; label: string; color: string };

export type Report = {
  id: string;
  // Multiple tags per report. A card can be wrong AND look wrong AND prompt an
  // idea, and forcing that into one bucket loses information for no benefit —
  // the triager reads all of them anyway.
  tags: ReportTag[];
  route: string;
  whatHappened: string;
  whatExpected: string;
  context: Record<string, unknown>;
  breadcrumbs: unknown[];
  screenshot: string | null; // data URL, annotations already burned in
  queuedAt: number;
  attempts: number;
};

// Two ways to reach Discord. Both are here because they trade off differently
// and only you can decide which trade you want:
//
// PROXY (recommended) — POST to /api/feedback, a Vercel function that holds the
//   webhook URL in an env var. Costs one line in your deploy command. The URL
//   never reaches a browser, so it can't be lifted from the bundle.
//
// DIRECT — the browser posts straight to Discord. Zero infrastructure, works
//   with `npx vercel dist --prod` exactly as you deploy today. But the webhook
//   URL is in the public JS bundle, and anyone who view-sources the site can
//   post whatever they like into your channel. Blast radius is bounded (they
//   can't read the channel, and mentions are stripped below); remediation is
//   deleting the webhook and making a new one. For a private beta that may be
//   a fine trade. For a public product it is not.
//
// Set EXPO_PUBLIC_DISCORD_WEBHOOK to use DIRECT. Leave it unset for PROXY.
const DIRECT_URL = process.env.EXPO_PUBLIC_DISCORD_WEBHOOK ?? "";
const PROXY_URL = "/api/feedback";

export const transportMode = (): "direct" | "proxy" => (DIRECT_URL ? "direct" : "proxy");

// Three-way, not boolean — "the server won't take this one, ever" and "it
// actually landed in Discord" used to collapse into the same `true`, which
// meant a permanently-rejected report (e.g. failed validation) was reported
// to the user as "sent". Now:
//   "sent"    — it's in Discord.
//   "rejected"— the server refused it on its merits; identical payload would
//               fail identically, so there's no point queueing a retry.
//   "retry"   — network error, 5xx, or rate-limited; worth trying again.
export type SendResult = "sent" | "rejected" | "retry";

export async function send(report: Report): Promise<SendResult> {
  try {
    return DIRECT_URL ? await sendDirect(report) : await sendViaProxy(report);
  } catch {
    return "retry"; // network — worth a retry
  }
}

async function sendViaProxy(report: Report): Promise<SendResult> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  // A 4xx means the server rejected the content, not the connection. Retrying
  // an identical payload will fail identically — drop it rather than loop.
  if (res.status >= 400 && res.status < 500 && res.status !== 429) return "rejected";
  return res.ok ? "sent" : "retry";
}

async function sendDirect(report: Report): Promise<SendResult> {
  const form = new FormData();
  form.append("payload_json", JSON.stringify(buildDiscordPayload(report)));
  form.append(
    "files[1]",
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    `context-${report.id}.json`
  );

  const img = decodeDataUrl(report.screenshot);
  if (img) form.append("files[0]", img, `shot-${report.id}.jpg`);

  const res = await fetch(DIRECT_URL, { method: "POST", body: form });
  if (res.status >= 400 && res.status < 500 && res.status !== 429) return "rejected";
  return res.ok ? "sent" : "retry";
}

// Shared by both transports, so a report looks identical in Discord either way
// and switching transports later doesn't change your channel's history.
export function buildDiscordPayload(report: Report) {
  const primary = report.tags[0];
  const ctx = report.context;
  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "Screen", value: `\`${report.route}\``, inline: true },
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
  if (ctx.dueAt !== undefined)
    fields.push({
      name: "Was due",
      value: `${Math.round((Number(ctx.dueAt) - Date.now()) / 60000)} min from now`,
      inline: true,
    });
  if (ctx.matchId) fields.push({ name: "Match", value: `\`${ctx.matchId}\``, inline: true });
  if (ctx.turnNumber !== undefined)
    fields.push({ name: "Turn", value: String(ctx.turnNumber), inline: true });
  if (ctx.cardCountOk === false)
    fields.push({ name: "Invariant", value: "**card count is off**", inline: true });

  if (report.tags.length > 1)
    fields.push({
      name: "Also tagged",
      value: report.tags.slice(1).map((t) => t.label).join(" · "),
      inline: false,
    });
  fields.push({
    name: "Expected",
    value: report.whatExpected.slice(0, 1024) || "_not given_",
    inline: false,
  });
  fields.push({ name: "Session", value: `\`${ctx.sessionId ?? "?"}\``, inline: false });

  const payload: Record<string, unknown> = {
    username: "RiftAcademy",
    // A webhook that cannot ping anyone is a nuisance if abused, not an incident.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        // Title carries every tag, so the forum thread list is scannable without
        // opening anything.
        title: report.tags.map((t) => t.label).join(" + ") || "Report",
        description: report.whatHappened.slice(0, 4000) || "_no description given_",
        // Colour by the FIRST tag. Multi-tag reports get one stripe, and the
        // user's first pick is the closest thing to a primary we have.
        // Untagged reports get Order yellow — they need a human to decide what
        // they are, which is a different queue from "known category".
        color: parseInt((primary?.color ?? "#EBB113").slice(1), 16),
        footer: { text: `#${report.id}` },
        timestamp: new Date(report.queuedAt).toISOString(),
        fields: fields.slice(0, 25),
      },
    ],
  };

  // Forum channels only. Each report becomes its own thread, which is what
  // turns the channel from a firehose into something you can actually close
  // items in one at a time.
  if (process.env.EXPO_PUBLIC_DISCORD_FORUM === "1") {
    const label = report.tags.map((t) => t.label).join(" + ") || "Report";
    payload.thread_name = `[${label}] ${report.whatHappened
      .replace(/\s+/g, " ")
      .trim()}`.slice(0, 100);
  }

  return payload;
}

function decodeDataUrl(v: string | null): Blob | null {
  if (!v) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(v);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  } catch {
    return null;
  }
}
