import { send, type Report } from "./transport";

export type { Report };

// Offline queue.
//
// You collect feedback at Nexus Nights and at RQs, on venue wifi. A report that
// fails to POST must not be lost, and the user must never be told "failed" for
// something that will send fine in ten minutes.
//
// Uses localStorage directly (rather than src/lib/db) because the queue is
// web-only for now and has nothing to do with card progress. Same storage
// mechanism, separate key, no coupling.
const KEY = "riftacademyFeedbackQueue";
const MAX_ATTEMPTS = 5;

function read(): Report[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Report[]) : [];
  } catch {
    return [];
  }
}

function write(reports: Report[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(reports));
  } catch {
    // Quota. It is always the screenshots. Shed images oldest-first rather than
    // shedding reports — a report without a picture is still a report.
    const stripped = reports.map((r, i) =>
      i < reports.length - 1 ? { ...r, screenshot: null } : r
    );
    try {
      localStorage.setItem(KEY, JSON.stringify(stripped));
    } catch {
      // Nothing left to try. The in-flight report is lost; the app is not.
    }
  }
}

export function pendingCount(): number {
  return read().length;
}

// Try now, queue on failure. "rejected" is terminal — the server refused
// this exact payload, so retrying (now or from the offline queue) would just
// repeat the rejection. Only "retry" outcomes go in the queue.
export async function submit(report: Report): Promise<"sent" | "queued" | "rejected"> {
  const outcome = await send(report);
  if (outcome === "rejected") return "rejected";
  if (outcome === "sent") return "sent";
  write([...read(), report]);
  return "queued";
}

// Drain. Safe to call repeatedly and concurrently-ish; worst case a report
// sends twice, which is strictly better than never sending.
export async function flush(): Promise<number> {
  const queue = read();
  if (!queue.length) return 0;

  const remaining: Report[] = [];
  let sent = 0;

  for (const report of queue) {
    if (report.attempts >= MAX_ATTEMPTS) continue; // stop trying, drop it
    const outcome = await send(report);
    if (outcome === "sent") sent++;
    else if (outcome === "retry") remaining.push({ ...report, attempts: report.attempts + 1 });
    // "rejected": drop silently, same as exhausting MAX_ATTEMPTS — nothing
    // about retrying this exact payload would change the outcome.
  }

  write(remaining);
  return sent;
}

export function installQueueFlush(): void {
  if (typeof window === "undefined") return;
  void flush();
  window.addEventListener("online", () => void flush());
}
