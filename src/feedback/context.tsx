import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import type { AttributeMode } from "../lib/attributeQuiz";

// What the user is actually looking at, volunteered by whichever screen is
// mounted. This is the difference between a report that says "the quiz is
// broken" and one that says: mode=cost, card ogn-093-298, box 3, last shown
// 4s ago, dueAt was 12 minutes out. Only the second one is fixable without a
// repro.
export type ScreenContext = {
  quizMode?: AttributeMode;
  cardId?: string; // riftbound_id, e.g. "ogn-093-298"
  cardName?: string;
  cardType?: string; // mask regions are keyed by type — needed for mask bugs
  leitnerBox?: number;
  dueAt?: number;
  sessionSeen?: number;
  matchId?: string;
  turnNumber?: number;
  cardCountOk?: boolean; // matchEngine's invariant, if the screen knows it
};

export type Breadcrumb = { t: number; kind: string; detail?: string };

const MAX_CRUMBS = 25;

type Ctx = {
  route: string;
  setRoute: (r: string) => void;
  screenContext: ScreenContext;
  setScreenContext: (patch: ScreenContext) => void;
  clearScreenContext: () => void;
  trace: (kind: string, detail?: string) => void;
  getBreadcrumbs: () => Breadcrumb[];
  sessionId: string;
};

const FeedbackCtx = createContext<Ctx | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState("Home");
  const [screenContext, setScreenContextState] = useState<ScreenContext>({});
  // Ref, not state: tracing must be free. A ring buffer that triggers a
  // re-render on every answer would be worse than no ring buffer.
  const crumbs = useRef<Breadcrumb[]>([]);
  const sessionId = useMemo(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  const setScreenContext = useCallback((patch: ScreenContext) => {
    setScreenContextState((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearScreenContext = useCallback(() => setScreenContextState({}), []);

  const trace = useCallback((kind: string, detail?: string) => {
    crumbs.current.push({ t: Date.now(), kind, detail });
    if (crumbs.current.length > MAX_CRUMBS) crumbs.current.shift();
  }, []);

  const getBreadcrumbs = useCallback(() => [...crumbs.current], []);

  const value = useMemo(
    () => ({
      route,
      setRoute,
      screenContext,
      setScreenContext,
      clearScreenContext,
      trace,
      getBreadcrumbs,
      sessionId,
    }),
    [route, screenContext, setScreenContext, clearScreenContext, trace, getBreadcrumbs, sessionId]
  );

  return <FeedbackCtx.Provider value={value}>{children}</FeedbackCtx.Provider>;
}

export function useFeedback(): Ctx {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return ctx;
}

// Safe to call from a screen that might render outside the provider (e.g. in a
// test) — returns a no-op shim instead of throwing.
const NOOP: Ctx = {
  route: "Home",
  setRoute: () => {},
  screenContext: {},
  setScreenContext: () => {},
  clearScreenContext: () => {},
  trace: () => {},
  getBreadcrumbs: () => [],
  sessionId: "none",
};

export function useFeedbackSafe(): Ctx {
  return useContext(FeedbackCtx) ?? NOOP;
}

export function deviceContext() {
  const w = typeof window !== "undefined" ? window : undefined;
  return {
    platform: Platform.OS,
    build: process.env.EXPO_PUBLIC_COMMIT_SHA ?? "dev",
    viewport: w ? `${w.innerWidth}x${w.innerHeight}` : "unknown",
    dpr: w ? w.devicePixelRatio : 1,
    userAgent: w ? w.navigator.userAgent : "unknown",
    online: w ? w.navigator.onLine : true,
    ts: new Date().toISOString(),
  };
}
