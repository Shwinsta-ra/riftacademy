import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { getHasSeenTutorial, setHasSeenTutorial } from "./db";
import { TUTORIAL_STEPS, TutorialStep, TutorialStepId } from "./tutorialSteps";
import { DEFAULT_FILTERS, useFilters } from "./filtersStore";

export type TargetRect = { x: number; y: number; width: number; height: number };

type TutorialContextValue = {
  currentStep: TutorialStep | null;
  targetRect: TargetRect | null;
  /** Called from a screen's onLayout/measure for the element that matches
   *  the CURRENT step's id. No-ops otherwise, so screens can call this
   *  unconditionally without checking first themselves. */
  registerTarget: (id: TutorialStepId, rect: TargetRect) => void;
  /** Called from a real onPress handler, alongside that handler's normal
   *  logic (never instead of it). No-ops unless `id` matches the currently
   *  active step, so it's always safe to call regardless of whether the
   *  tutorial is even running. */
  completeStepIfActive: (id: TutorialStepId) => void;
  skip: () => void;
  /** Used by the "Replay tutorial" control (see StatsScreen). */
  restart: () => void;
};

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const { setFilters } = useFilters();

  // On first mount, check whether this device has already been through (or
  // dismissed) the tutorial. Only ever auto-starts once, ever, per device —
  // after that it's opt-in via "Replay tutorial".
  useEffect(() => {
    (async () => {
      const seen = await getHasSeenTutorial();
      if (!seen) setStepIndex(0);
    })();
  }, []);

  const currentStep = stepIndex !== null ? (TUTORIAL_STEPS[stepIndex] ?? null) : null;

  const finish = useCallback(() => {
    setStepIndex(null);
    setTargetRect(null);
    setHasSeenTutorial(true);
  }, []);

  const registerTarget = useCallback(
    (id: TutorialStepId, rect: TargetRect) => {
      setStepIndex((currentIndex) => {
        const step = currentIndex !== null ? TUTORIAL_STEPS[currentIndex] : null;
        if (step && step.id === id) setTargetRect(rect);
        return currentIndex;
      });
    },
    []
  );

  const completeStepIfActive = useCallback(
    (id: TutorialStepId) => {
      setStepIndex((currentIndex) => {
        const step = currentIndex !== null ? TUTORIAL_STEPS[currentIndex] : null;
        if (!step || step.id !== id) return currentIndex;
        setTargetRect(null);
        const next = (currentIndex ?? 0) + 1;
        if (next >= TUTORIAL_STEPS.length) {
          setHasSeenTutorial(true);
          return null;
        }
        return next;
      });
    },
    []
  );

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const restart = useCallback(() => {
    // Replaying the tutorial must start from the exact same clean slate as a
    // genuine first launch (empty filters). Without this, a returning user
    // who already has filters set (e.g. Vendetta) walks into the
    // "newestSetChip" step with that chip already selected — tapping it per
    // the tutorial's own instruction DESELECTS it instead, and re-tapping to
    // reselect lands back on the exact filters that were already saved, so
    // "Set filters" (disabled whenever staged === saved) never re-enables
    // and the tutorial gets stuck with no way to continue.
    setFilters(DEFAULT_FILTERS);
    setTargetRect(null);
    setStepIndex(0);
  }, [setFilters]);

  return (
    <TutorialContext.Provider
      value={{ currentStep, targetRect, registerTarget, completeStepIfActive, skip, restart }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}

/** Convenience hook for a screen that owns one of the tutorial's target
 *  elements: returns a ref to attach to the target View, plus an onLayout
 *  handler that measures its true on-screen (window-relative) position and
 *  registers it — using measureInWindow rather than onLayout's own event
 *  data, since onLayout only gives coordinates relative to the parent, not
 *  the screen, and TutorialCallout is mounted at the app root and needs
 *  absolute screen coordinates to position its ring/bubble correctly. */
export function useTutorialTarget(id: TutorialStepId) {
  const ref = useRef<View>(null);
  const { currentStep, registerTarget } = useTutorial();

  const measure = useCallback(() => {
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        registerTarget(id, { x, y, width, height });
      });
    });
  }, [id, registerTarget]);

  // Two triggers, covering both mount patterns React Navigation uses:
  //  - onLayout: covers a screen that mounts FRESH each time it's navigated
  //    to (e.g. Settings, reached via navigate()) — its target's layout
  //    event naturally coincides with the step already having advanced.
  //  - this effect: covers a screen reached via goBack() that was ALREADY
  //    mounted underneath and won't refire onLayout, since its layout
  //    hasn't actually changed — without this, a target on a screen you
  //    return TO (like Home, for the final step) would never re-register.
  useEffect(() => {
    if (currentStep?.id === id) measure();
  }, [currentStep, id, measure]);

  return { ref, onLayout: measure };
}
