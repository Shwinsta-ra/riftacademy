import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { QuizFilters } from "./types";
import { getSavedFilters, setSavedFilters } from "./db";

// Exported so callers that need to reset to a clean slate (e.g. the
// tutorial's "Replay tutorial" restart, which must start from the same
// empty-filters state as a genuine first launch) don't have to duplicate
// this literal themselves and risk it drifting out of sync.
export const DEFAULT_FILTERS: QuizFilters = { sets: [], domains: [], types: [], speeds: [], deckId: null };

type FiltersContextValue = {
  filters: QuizFilters;
  setFilters: (f: QuizFilters) => void;
};

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<QuizFilters>(DEFAULT_FILTERS);

  // Unlike sessionState (deliberately allowed to clear on remount), filters
  // are a durable preference someone set in Settings -- persisted the same
  // way progress and the batch gate are, so an app remount mid-cooldown
  // (backgrounding, reload) can't silently snap them back to default while
  // the persisted batch-gate timestamp survives untouched.
  useEffect(() => {
    (async () => {
      const saved = await getSavedFilters();
      if (saved) setFiltersState(saved);
    })();
  }, []);

  const setFilters = useCallback((f: QuizFilters) => {
    setFiltersState(f);
    setSavedFilters(f);
  }, []);

  return (
    <FiltersContext.Provider value={{ filters, setFilters }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
