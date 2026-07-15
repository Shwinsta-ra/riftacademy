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

export const theme = {
  bg: "#14141a",
  card: "#1f1f28",
  border: "#2e2e3a",
  text: "#f2f2f5",
  textDim: "#9c9ca8",
  accent: "#5865f2",
  correct: "#3FA34D",
  incorrect: "#CC2929",
};
