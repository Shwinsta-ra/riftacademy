export const DOMAIN_COLORS: Record<string, string> = {
  Fury: "#CC2929",
  Calm: "#3FA34D",
  Mind: "#2B73C2",
  Body: "#E57921",
  Chaos: "#8629B3",
  Order: "#EBB113",
  Colorless: "#8A8A93",
};

// PLATFORM CONVENTION: magenta means "required".
//
// Reserved for this and nothing else, across every RiftAcademy surface. It is
// deliberately not any colour already carrying meaning: not the blurple accent
// (call to action), not Fury red (something is broken), not a domain colour, not
// body text. When a user sees magenta anywhere in this app, it means "you have to
// fill this in" — and it never means anything else.
export const REQUIRED = "#EA6FD0";

// PLATFORM CONVENTION: warm gold is the "Rift" brand accent.
//
// Primary use is still the literal word "Rift" wherever it prefixes a product
// name (RiftAcademy, RiftRecall, RiftIQ, ...): coloring the one word that's
// identical across every product name teaches the eye "these belong to one
// family" — the varying suffix (Academy/Recall/IQ) stays plain text. Close to
// but distinct from DOMAIN_COLORS.Order — accepted as a deliberate choice, not
// a collision.
//
// WIDENED (visual-direction pass, July 2026): gold is now also allowed as a
// small, non-semantic BRAND ACCENT in one specific place approved during the
// visual-direction review — Sparklet's graduation-cap tassel. This is a
// deliberate extension of "only the word Rift," signed off as "brand accent,
// not a new semantic color." It does NOT open gold up for general use:
// everywhere other than the wordmark and the Sparklet cap, gold still
// carries no meaning and must not be introduced. (Previously also widened to
// the quiz card-art foil rim/trim; that treatment was dropped July 19 in the
// UI-polish pass in favor of an ambient glow behind the card — see GLOW.cardRing
// below and QuizCardArt.tsx — so that exception no longer applies.)
export const RIFT_BRAND = "#E8B44A";

export const theme = {
  bg: "#14141a",
  card: "#1f1f28",
  border: "#2e2e3a",
  text: "#f2f2f5",
  textDim: "#9c9ca8",
  accent: "#5865f2",
  // Blurple ramp for the "Rune Glow" pass — the lighter/darker ends the primary
  // CTA gradient and Sparklet limb accents are built from. `accent` stays the
  // canonical mid blurple; these two only ever appear inside glow/gradient
  // treatments, never as flat fills that would compete with `accent`.
  accentLight: "#7885ff",
  accentDeep: "#4b57e0",
  correct: "#3FA34D",
  incorrect: "#CC2929",
};

// ---------------------------------------------------------------------------
// Visual-direction pass — "Rune Glow" tokens
//
// These describe the glow treatments layered on top of the flat theme above.
// GLOW.* are React Native shadow style objects (RN-Web compiles shadow* to
// CSS box-shadow; `elevation` covers Android) — spread into a style array.
// Gradient/sheen definitions are plain color+stop data consumed by the
// react-native-svg overlays in ScreenGlow / GlowButton, since we have no
// gradient library (no expo-linear-gradient).
// The blurple used across every glow is `theme.accent` (#5865f2 == the spec's
// color-cta); gold (`RIFT_BRAND`) appears only on the Sparklet cap per the
// widened rule documented above.
// ---------------------------------------------------------------------------

// Ambient blurple wash behind all screen content (radial, anchored above the
// viewport, faded out by ~60% down). Rendered by <ScreenGlow/>.
export const GLOW_AMBIENT = {
  color: "#5865f2",
  innerOpacity: 0.16, // rgba(88,101,242,.16) at center
  outerStop: 0.6, // transparent by 60%
};

// RN shadow objects. Blurple ambient glow, offset 0/0 (a true glow, not a drop
// shadow). Spread into style arrays: style={[base, GLOW.cta]}.
export const GLOW = {
  // Primary CTA ambient glow — 0 0 18px rgba(88,101,242,.55).
  cta: {
    shadowColor: "#5865f2",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.55,
    elevation: 8,
  },
  // Feature box ambient glow — 0 0 14px rgba(88,101,242,.10).
  feature: {
    shadowColor: "#5865f2",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  // Quiz card-art outer glow ring — 0 0 24px rgba(88,101,242,.28). Renders
  // behind/around the card via RN's shadow* props on QuizCardArt's unclipped
  // outer wrapper — the whole card-art glow treatment (no on-top rim/trim
  // since the July 19 UI-polish pass dropped that, see RIFT_BRAND above).
  cardRing: {
    shadowColor: "#5865f2",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.28,
    elevation: 6,
  },
  // "Rift" wordmark gold glow — text-shadow 0 0 12px rgba(232,180,74,.6).
  wordmark: {
    textShadowColor: "rgba(232,180,74,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
} as const;
