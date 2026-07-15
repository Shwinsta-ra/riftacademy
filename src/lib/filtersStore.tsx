import React, { createContext, useContext, useState, ReactNode } from "react";
import { QuizFilters } from "./types";

const DEFAULT_FILTERS: QuizFilters = { sets: [], domains: [], types: [], deckId: null };

type FiltersContextValue = {
  filters: QuizFilters;
  setFilters: (f: QuizFilters) => void;
};

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<QuizFilters>(DEFAULT_FILTERS);
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
