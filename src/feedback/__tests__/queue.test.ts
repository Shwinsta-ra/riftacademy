import { beforeEach, describe, expect, it, vi } from "vitest";
import { flush, pendingCount, submit } from "../queue";
import type { Report } from "../transport";

// queue.ts guards every localStorage call in try/catch and treats a missing
// API as "nothing stored" — but that silently masks bugs in a test, so give
// it a real in-memory implementation instead.
function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
  };
}

const baseReport = (id: string): Report => ({
  id,
  tags: [{ id: "bug", label: "Bug", color: "#CC2929" }],
  route: "Home",
  whatHappened: "",
  whatExpected: "",
  context: {},
  breadcrumbs: [],
  screenshot: null,
  queuedAt: 0,
  attempts: 0,
});

function mockFetchOnce(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300 })
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("localStorage", memoryStorage());
});

describe("submit — server accepts (200)", () => {
  it("reports 'sent' and does not queue", async () => {
    mockFetchOnce(200);
    const outcome = await submit(baseReport("a"));
    expect(outcome).toBe("sent");
    expect(pendingCount()).toBe(0);
  });
});

describe("submit — server permanently rejects (400)", () => {
  it("reports 'rejected', not 'sent', and does not queue for retry", async () => {
    mockFetchOnce(400);
    const outcome = await submit(baseReport("b"));
    expect(outcome).toBe("rejected");
    expect(pendingCount()).toBe(0);
  });
});

describe("submit — transient failure (500)", () => {
  it("reports 'queued' and keeps the report for retry", async () => {
    mockFetchOnce(500);
    const outcome = await submit(baseReport("c"));
    expect(outcome).toBe("queued");
    expect(pendingCount()).toBe(1);
  });
});

describe("submit — rate limited (429)", () => {
  it("is retryable, not a terminal rejection", async () => {
    mockFetchOnce(429);
    const outcome = await submit(baseReport("d"));
    expect(outcome).toBe("queued");
    expect(pendingCount()).toBe(1);
  });
});

describe("flush", () => {
  it("drops a rejected report from the queue instead of retrying it forever", async () => {
    mockFetchOnce(500);
    await submit(baseReport("e"));
    expect(pendingCount()).toBe(1);

    mockFetchOnce(400);
    const sent = await flush();
    expect(sent).toBe(0);
    expect(pendingCount()).toBe(0);
  });

  it("sends a previously-queued report once the server accepts it", async () => {
    mockFetchOnce(500);
    await submit(baseReport("f"));
    expect(pendingCount()).toBe(1);

    mockFetchOnce(200);
    const sent = await flush();
    expect(sent).toBe(1);
    expect(pendingCount()).toBe(0);
  });
});
