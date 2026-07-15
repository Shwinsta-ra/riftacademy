import config from "../data/feedbackTags.json";

// Tags are data-driven, exactly like quizPositions.json: edit the RA_Feedback
// Tags tab in the Google Sheet, export CSV, run scripts/apply_feedback_tags.py.
// Adding a tag to a screen — or a whole new screen — requires no code change.
export type Tag = {
  id: string;
  label: string;
  color: string;
  cardData: boolean; // route this one to card-inventory review, not to code
};

type RawTag = {
  screen: string;
  id: string;
  label: string;
  severity: string;
  cardData: boolean;
  active: boolean;
};

const SEVERITY = config._severities as Record<string, string>;
const RAW = config.tags as RawTag[];

const color = (severity: string) => SEVERITY[severity] ?? "#8A8A93";

function toTag(r: RawTag): Tag {
  return { id: r.id, label: r.label, color: color(r.severity), cardData: r.cardData };
}

// Screen-specific tags first, then the ones offered everywhere. Keys are
// react-navigation route NAMES ("Quiz", "MatchDetail"), which is what actually
// exists at runtime in a native-stack navigator — there are no URL paths.
export function tagsForRoute(route: string): Tag[] {
  const active = RAW.filter((t) => t.active);
  const forScreen = active.filter((t) => t.screen === route).map(toTag);
  const global = active.filter((t) => t.screen === "GLOBAL").map(toTag);

  // A screen may legitimately re-declare a global id (MatchList redefines
  // "dataloss"); the screen-specific wording wins and the duplicate is dropped.
  const seen = new Set(forScreen.map((t) => t.id));
  return [...forScreen, ...global.filter((t) => !seen.has(t.id))];
}

export function findTag(route: string, id: string): Tag | undefined {
  return tagsForRoute(route).find((t) => t.id === id);
}
