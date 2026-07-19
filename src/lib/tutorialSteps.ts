import { SET_GROUPS } from "./setGroups";

// A step's `id` is the contract between this file and whichever screen owns
// that step's target element (see registerTarget/completeStepIfActive calls
// in HomeScreen.tsx and SettingsScreen.tsx). The tutorial ENGINE
// (TutorialContext, TutorialCallout) doesn't know or care what these ids or
// strings mean — it just walks this array in order.
export type TutorialStepId =
  | "setFiltersButton"
  | "newestSetChip"
  | "setFiltersCTA"
  | "reviewCardsButton";

export type TutorialStep = {
  id: TutorialStepId;
  screen: "Home" | "Settings";
  text: string;
};

const newestSetLabel = SET_GROUPS[SET_GROUPS.length - 1]?.label ?? "the newest set";

// ============================================================================
// CURRENT ONBOARDING SCRIPT — Vendetta launch-window default.
//
// Per Ashwin (July 19): this is a deliberate SHORT-TERM stand-in (2-4 weeks),
// not the permanent onboarding design. The real long-term flow should
// introduce a new user to 2-3 core features, then let them choose where to
// go first — a broader tour, not a single linear filter-then-study funnel.
// This script exists now because the Vendetta set launches in about a week
// and most people arriving are here specifically to prep for it.
//
// TO REPLACE LATER: swap the contents of TUTORIAL_STEPS below (and update
// HomeScreen.tsx/SettingsScreen.tsx's registerTarget calls if the target
// elements change) — the underlying engine needs no changes.
//
// The suggested set name is pulled from SET_GROUPS's last entry rather than
// hardcoded, so this script keeps making sense as new sets ship without
// needing a text edit each time — though the FLOW itself (filter -> study)
// is still the thing to replace with the broader tour when it's built.
// ============================================================================
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "setFiltersButton",
    screen: "Home",
    text: "Welcome to RiftRecall! Let's set up your first study session — tap Set filters to choose which cards to practice.",
  },
  {
    id: "newestSetChip",
    screen: "Settings",
    text: `Pick a set to focus on. ${newestSetLabel} is the newest set — a great place to start if you're prepping for it.`,
  },
  {
    id: "setFiltersCTA",
    screen: "Settings",
    text: "Tap Set filters to lock in your choice.",
  },
  {
    id: "reviewCardsButton",
    screen: "Home",
    text: "You're ready! Tap here to start studying — RiftRecall will bring back anything you miss.",
  },
];
