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
// small, non-semantic BRAND ACCENT in two specific places approved during the
// visual-direction review — the foil card-art rim/sheen (FOIL.rim/FOIL.trim
// below) and Sparklet's graduation-cap tassel. This is a deliberate extension
// of "only the word Rift," signed off as "brand accent, not a new semantic
// color." It does NOT open gold up for general use: everywhere other than the
// wordmark, the foil rim, and the Sparklet cap, gold still carries no meaning
// and must not be introduced.
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
// Visual-direction pass — "Rune Glow" + Foil tokens
//
// These describe the glow/foil treatments layered on top of the flat theme
// above. Two shapes are used because RN has no single "box-shadow string":
//   - GLOW.* are React Native shadow style objects (RN-Web compiles shadow* to
//     CSS box-shadow; `elevation` covers Android). Spread into a style array.
//   - Gradient/sheen definitions are plain color+stop data consumed by the
//     react-native-svg overlays in ScreenGlow / GlowButton / QuizCardArt,
//     since we have no gradient library (no expo-linear-gradient).
// The blurple used across every glow is `theme.accent` (#5865f2 == the spec's
// color-cta); gold (`RIFT_BRAND`) appears only in the foil rim/trim per the
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
  // Quiz card-art outer glow ring — 0 0 24px rgba(88,101,242,.28). The inset
  // half of the spec's glow-card-ring is rendered as an SVG inner wash inside
  // <QuizCardArt/> since RN shadows can't do inset.
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

// Foil treatment — quiz card-art container ONLY (never buttons/boxes/nav).
export const FOIL = {
  // Gold rim (approved brand-accent extension). 2px solid rgba(232,180,74,.55).
  rim: { borderWidth: 2, borderColor: "rgba(232,180,74,0.55)" },
  // Base gradient behind the card image (shows on load / behind letterboxed
  // battlefield art). linear-gradient(160deg,#2b2140,#1a2c46 55%,#241a33).
  baseStops: [
    { offset: 0, color: "#2b2140" },
    { offset: 0.55, color: "#1a2c46" },
    { offset: 1, color: "#241a33" },
  ],
  // Diagonal holographic sheen layered over the art.
  sheenStops: [
    { offset: 0, color: "#ffffff", opacity: 0.16 },
    { offset: 0.3, color: "#ffffff", opacity: 0 },
    { offset: 0.45, color: "#ffffff", opacity: 0.08 },
    { offset: 0.6, color: "#ffffff", opacity: 0 },
    { offset: 0.8, color: "#ffffff", opacity: 0.14 },
  ],
  // 1px animated-feeling border trim (blurple → gold → blurple), ~55% opacity.
  trimStops: [
    { offset: 0, color: "#5865f2", opacity: 0.9 },
    { offset: 0.5, color: "#E8B44A", opacity: 0.6 },
    { offset: 1, color: "#5865f2", opacity: 0.2 },
  ],
  trimOpacity: 0.55,
} as const;
