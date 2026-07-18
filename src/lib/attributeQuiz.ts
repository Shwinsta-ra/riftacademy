import { Card } from "./types";
import { getAllCards } from "./quiz";
import positionsConfig from "../data/quizPositions.json";
import overridesConfig from "../data/quizOverrides.json";
import questionsConfig from "../data/quizQuestions.json";

export type AttributeMode =
  | "energyCost"
  | "powerCost"
  | "might"
  | "keyword"
  | "speed"
  | "trigger"
  | "name"
  | "text"
  | "fillBlank";

export type Percent = `${number}%`;

export type MaskRegion = {
  top: Percent;
  left: Percent;
  width: Percent;
  height: Percent;
};

type RawRegion = { top: number; height: number; left: number; width: number };

// Positions live in src/data/quizPositions.json rather than hardcoded here —
// see that file's comments, or the README, for the editable table format.
// "keyword"/"speed"/"trigger" all share the "text" mode's positions unless
// the config file defines them separately (they're visually the same box).
// energyCost/powerCost both mask the same on-card region (the single cost
// box in the top-left) — they're two testable stats, not two visual spots.
const POSITION_MODE_KEY: Record<AttributeMode, string> = {
  energyCost: "cost",
  powerCost: "cost",
  might: "might",
  name: "name",
  keyword: "text",
  speed: "text",
  trigger: "text",
  text: "text",
  fillBlank: "text",
};

function toMaskRegions(raw: RawRegion[]): MaskRegion[] {
  return raw.map((r) => ({
    top: `${r.top}%`,
    height: `${r.height}%`,
    left: `${r.left}%`,
    width: `${r.width}%`,
  }));
}

export function getMaskRegions(mode: AttributeMode, card: Card): MaskRegion[] {
  const modeKey = POSITION_MODE_KEY[mode];
  const modeConfig = (positionsConfig as Record<string, Record<string, RawRegion[]>>)[modeKey];
  if (!modeConfig) return [];
  const positionType = card.type;
  // Tokens (colorless portrait cards) are their own visual layout even
  // though their canonical `type` is Unit or Gear — check for a
  // Token-specific config first, since that's a more specific match than
  // the base type whenever one's defined. Driven by the sheet's own
  // isToken flag (authoritative), not the original API's supertype.
  const lookupKey = card.isToken && modeConfig["Token"] ? "Token" : positionType;
  const raw = modeConfig[lookupKey] ?? modeConfig["default"] ?? [];
  return toMaskRegions(raw);
}

// Sparse per-card exceptions to auto-computed eligibility — see
// src/data/quizOverrides.json. `false` forces a mode off even if the data
// would otherwise make it eligible (e.g. Windswept Hillock's only "trigger"
// word is "here," which isn't a meaningful trigger for that card). `true`
// forces a mode on, though it still needs the underlying data to actually
// build a question (e.g. forcing "energyCost" on a card with no Energy set
// won't work — this isn't a way to fabricate missing data).
const QUIZ_OVERRIDES = overridesConfig as Record<string, Record<string, boolean>>;

function getOverride(cardId: string, mode: AttributeMode): boolean | undefined {
  return QUIZ_OVERRIDES[cardId]?.[mode];
}

// Hand-authored question overrides — see src/data/quizQuestions.json and the
// README's "Quiz Questions" sheet format. A card+category can have several
// variants (different phrasings), and each variant's distractor pool can
// hold more than 3 wrong answers — a random 3 are sampled fresh each time,
// so a card you see repeatedly doesn't always show the exact same 4
// options. The one correct answer is always present.
export type QuestionVariant = {
  prompt: string;
  correctAnswer: string;
  distractorPool: string[];
  caption?: string;
};

type QuizQuestionsConfig = Record<string, Partial<Record<AttributeMode, QuestionVariant[]>>>;
const QUIZ_QUESTIONS = questionsConfig as QuizQuestionsConfig;

function getCustomVariants(cardId: string, mode: AttributeMode): QuestionVariant[] | undefined {
  return QUIZ_QUESTIONS[cardId]?.[mode];
}

/** Builds a question from a hand-authored override instead of the
 *  auto-generation logic below. Picks a random variant (if more than one
 *  exists for this card+mode), then samples 3 distractors from that
 *  variant's pool — the pool can be longer than 3 so repeat exposures don't
 *  always show the same wrong answers. */
function buildQuestionFromVariant(mode: AttributeMode, variant: QuestionVariant): AttributeQuestion {
  const sampledDistractors = shuffle(variant.distractorPool).slice(0, 3);
  const options = shuffle([variant.correctAnswer, ...sampledDistractors]);
  const correctIndex = options.indexOf(variant.correctAnswer);
  return {
    mode,
    prompt: variant.prompt,
    options,
    correctIndex,
    caption: variant.caption ?? null,
  };
}

/** Finds the numbers in a card's effect text that are eligible to become
 *  fill-in-the-blank targets. A number qualifies only if it's in the effect
 *  PROSE — numbers inside "[...]" keyword brackets (e.g. the 2 in
 *  "[Assault 2]", the 1 in "[Accelerate (1)(R)]") are keyword parameters,
 *  not free-standing effect values, so they're excluded to avoid mixing a
 *  keyword-recall question into a fill-in-the-blank. Parenthesized costs
 *  like the (2) in "reduce my cost by (2)" DO qualify — they're effect
 *  values written in the game's cost notation.
 *
 *  Returns each match's numeric value and its [start, end) span in the
 *  ORIGINAL string, so a caller can blank exactly those spans. */
function blankableNumbers(text: string): { value: number; start: number; end: number }[] {
  // Mask every [...] span with same-length filler so bracket-internal digits
  // don't match, while preserving indices into the original string.
  const masked = text.replace(/\[[^\]]*\]/g, (m) => "\u0000".repeat(m.length));
  const results: { value: number; start: number; end: number }[] = [];
  // Match either a parenthesized number "(3)" or a bare number "3".
  const re = /\((\d+)\)|\b\d+\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    // m[1] is set when it was the "(N)" form; otherwise it's a bare number.
    const value = parseInt(m[1] ?? m[0], 10);
    results.push({ value, start: m.index, end: m.index + m[0].length });
  }
  return results;
}

/** Finds the first bracketed tag in `text` that matches one of `allowedKeywords`
 *  (the card's own curated keyword list), case/hyphen/space-insensitive.
 *  Returns the matched substring's position + length so callers can mask
 *  exactly that instance — not just "the first bracket-looking text," which
 *  can be a different, unrelated bracket if an earlier one in the string
 *  doesn't correspond to a real curated keyword (e.g. "[Hidden (Any)(0)]"). */
function extractFirstKeyword(
  text: string,
  allowedKeywords: string[]
): { keyword: string; index: number; matchLength: number } | null {
  const re = /\[([A-Za-z][A-Za-z \-]*)\]/g;
  let match: RegExpExecArray | null;
  const normalize = (s: string) => s.toLowerCase().replace(/[\s-]/g, "");
  const allowedNormalized = allowedKeywords.map((k) => ({ raw: k, norm: normalize(k) }));
  while ((match = re.exec(text)) !== null) {
    const rawTag = match[1].trim();
    const found = allowedNormalized.find((k) => k.norm === normalize(rawTag));
    if (found) return { keyword: found.raw, index: match.index, matchLength: match[0].length };
  }
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Which attribute-quiz modes are even askable for this card.
 *
 *  `activeSpeedFilter` is the set of speeds the user has filtered to (from
 *  QuizFilters.speeds). When they've narrowed to a SINGLE speed, asking "what
 *  speed is this?" is trivial — every card on screen is that speed — so speed
 *  mode is suppressed. With 0 speeds (all) or 2+ selected (e.g. both Action
 *  and Reaction), the answer isn't given away, so speed stays askable. */
export function eligibleModes(card: Card, activeSpeedFilter: string[] = []): AttributeMode[] {
  // Runes are excluded from testing entirely, per Ashwin's rule — they can
  // exist in the dataset (e.g. for future reference/display) but never
  // appear as a quiz question.
  if (card.type === "Rune") return [];

  // Tokens (e.g. OGN's Recruit/Sprite "// Buff" cards, kept in the dataset
  // so set counts still match the official release) are game pieces, not
  // cards a player studies — excluded from the quiz the same way runes are.
  if (card.isToken) return [];

  const modes: AttributeMode[] = [];
  // Energy and Power are independently testable — a card with both (320 of
  // them) can be quizzed on either, not just Energy by default.
  if (card.energy !== null) modes.push("energyCost");
  if (card.power !== null) modes.push("powerCost");
  if (card.might !== null) modes.push("might");
  if (card.keywords.length > 0 && extractFirstKeyword(card.text || "", card.keywords)) {
    modes.push("keyword");
  }
  if (card.speed !== null && activeSpeedFilter.length !== 1) modes.push("speed");
  // Trigger mode is paused (not removed) per Ashwin's call — the game's
  // trigger categorization needs a cleaner pass before it's quizzed again.
  // buildTriggerQuestion/locateTrigger/etc. are left intact below so this is
  // a one-line flip to re-enable later, not a rebuild.
  modes.push("name");
  const trimmedText = (card.text || "").trim();
  if (trimmedText.length >= 15) {
    // Equipment whose only text is the boilerplate "[Equip (X)]" tag has no
    // real effect to test — text mode would just show that tag. Only offer
    // text mode when there's an actual effect line beyond the equip tag.
    const equipHasEffect =
      card.subtype !== "Equipment" || equipmentEffectText(card.text || "") !== null;
    if (equipHasEffect) {
      // Fill-in-the-blank REPLACES text mode when the effect prose has
      // exactly two blankable numbers (e.g. "discard 1, then draw 1") — a
      // two-blank question is a sharper test of those values than picking
      // the whole text out of a lineup. Cards with 0, 1, or 3+ blankable
      // numbers keep the normal text mode. Equipment uses its effect line
      // (not the [Equip] tag) for this count, same as text mode does.
      const fillText =
        card.subtype === "Equipment" ? equipmentEffectText(card.text || "") ?? "" : card.text || "";
      if (blankableNumbers(fillText).length === 2) {
        modes.push("fillBlank");
      } else {
        modes.push("text");
      }
    }
  }

  // Apply per-card overrides (src/data/quizOverrides.json) on top of the
  // auto-computed set — e.g. Windswept Hillock's only "here" is a location
  // qualifier, not a real trigger, so it's force-excluded from "trigger"
  // even though the classifier's regex technically matches.
  const ALL_MODES: AttributeMode[] = [
    "energyCost",
    "powerCost",
    "might",
    "keyword",
    "speed",
    "trigger",
    "name",
    "text",
    "fillBlank",
  ];
  const withOverrides = new Set(modes);
  for (const m of ALL_MODES) {
    const override = getOverride(card.id, m);
    if (override === false) withOverrides.delete(m);
    if (override === true) withOverrides.add(m);
  }
  // Trigger stays excluded even if some override file entry tries to force
  // it back on — the pause is a blanket product decision, not per-card.
  withOverrides.delete("trigger");
  return ALL_MODES.filter((m) => withOverrides.has(m));
}

/** Generates `count` plausible wrong numbers near `correct` for a numeric
 *  multiple-choice question. Distractors are the closest sequential integers
 *  around the correct value — e.g. for 2 -> 1, 3, 4 — so they read as
 *  believable stat values rather than the old behavior of pulling arbitrary
 *  far-off numbers from the whole card pool (a Might-1 card could get a
 *  Might-8 distractor) or emitting negatives / a stray 0.
 *
 *  `minValue` is the floor a distractor may take. Costs and Might can legitim-
 *  ately be 0 (a 0-cost spell, a 0-Might token), so the floor is 0 by default;
 *  but we never want NEGATIVE stats, and we bias upward so the option set
 *  isn't mostly zeros for a low correct value. */
function pickNearbyDistinctNumbers(
  correct: number,
  _candidatePool: number[],
  count: number,
  minValue = 0
): number[] {
  const picked: number[] = [];
  // Walk outward from the correct value (1, -1, 2, -2, ...), keeping any
  // candidate that's >= the floor, until we have enough. Because we skip
  // out-of-range low values, a correct value near the floor naturally fills
  // upward (correct=0 -> 1,2,3; correct=1 -> 2,3,4 with 0 also allowed).
  let step = 1;
  while (picked.length < count && step <= 40) {
    for (const candidate of [correct + step, correct - step]) {
      if (
        candidate >= minValue &&
        candidate !== correct &&
        !picked.includes(candidate) &&
        picked.length < count
      ) {
        picked.push(candidate);
      }
    }
    step++;
  }
  return picked;
}

function buildEnergyCostQuestion(card: Card, _pool: Card[]) {
  const correctValue = card.energy ?? 0;
  const distractors = pickNearbyDistinctNumbers(correctValue, [], 3);
  const options = shuffle([correctValue, ...distractors]).map((n) => `${n}`);
  const correctIndex = options.indexOf(`${correctValue}`);
  return {
    mode: "energyCost" as const,
    prompt: "What's this card's Energy cost?",
    options,
    correctIndex,
    caption: null,
  };
}

function buildPowerCostQuestion(card: Card, _pool: Card[]) {
  const correctValue = card.power ?? 0;
  const distractors = pickNearbyDistinctNumbers(correctValue, [], 3);
  const options = shuffle([correctValue, ...distractors]).map((n) => `${n}`);
  const correctIndex = options.indexOf(`${correctValue}`);
  return {
    mode: "powerCost" as const,
    prompt: "What's this card's Power cost?",
    options,
    correctIndex,
    caption: null,
  };
}

function buildMightQuestion(card: Card, _pool: Card[]) {
  const correctValue = card.might ?? 0;
  const distractors = pickNearbyDistinctNumbers(correctValue, [], 3);
  const options = shuffle([correctValue, ...distractors]).map((n) => `${n}`);
  const correctIndex = options.indexOf(`${correctValue}`);

  // Gear's `might` is the equip-bonus stat printed at the card's bottom
  // right (never its own top-right body stat — that field only exists on
  // Units) — confirmed only ever populated on Equipment-subtype Gear, never
  // on other Gear. It's real, testable data, just a different noun than a
  // Unit's Might, so the prompt needs to say "gear" instead of "unit."
  const prompt =
    card.type === "Gear" ? "What's this gear's Might bonus?" : "What's this unit's Might?";

  return {
    mode: "might" as const,
    prompt,
    options,
    correctIndex,
    caption: null,
  };
}

function buildKeywordQuestion(card: Card, pool: Card[]) {
  const found = extractFirstKeyword(card.text || "", card.keywords)!;
  const text = card.text || "";
  const maskedCaption =
    text.slice(0, found.index) + "[ ? ]" + text.slice(found.index + found.matchLength);

  const vocabulary = new Set<string>();
  for (const c of pool) {
    for (const kw of c.keywords) {
      if (kw.toLowerCase() !== found.keyword.toLowerCase()) vocabulary.add(kw);
    }
  }
  let distractors = shuffle(Array.from(vocabulary)).slice(0, 3);

  // small/filtered pools might not have 3 other keywords — fall back to the
  // full card set so the question always has 4 options
  if (distractors.length < 3) {
    const globalVocabulary = new Set<string>();
    for (const c of getAllCards()) {
      for (const kw of c.keywords) {
        if (kw.toLowerCase() !== found.keyword.toLowerCase()) globalVocabulary.add(kw);
      }
    }
    const merged = new Set([...distractors, ...shuffle(Array.from(globalVocabulary))]);
    distractors = Array.from(merged).slice(0, 3);
  }

  const options = shuffle([found.keyword, ...distractors]);
  const correctIndex = options.indexOf(found.keyword);
  return {
    mode: "keyword" as const,
    prompt: "Which keyword is missing from this card's text?",
    options,
    correctIndex,
    caption: maskedCaption,
  };
}

const NUMBER_RE = /-?\d+/g;

function mutateNumberVariants(text: string, count: number): string[] {
  const matches = Array.from(text.matchAll(NUMBER_RE));
  if (matches.length === 0) return [];

  const variants = new Set<string>();
  let guard = 0;
  while (variants.size < count && guard < 40) {
    guard++;
    const m = matches[Math.floor(Math.random() * matches.length)];
    const original = parseInt(m[0], 10);
    const delta = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
    const replacement = original + delta;
    // Card damage/draw/cost numbers are never negative — skip a mutation
    // that would produce one (e.g. "deal 1" -> "deal -1") rather than emit a
    // nonsensical option. Original non-negative numbers stay >= 0; genuinely
    // negative source numbers (rare, e.g. "-1 Might") are left to mutate
    // freely since their sign is meaningful.
    if (original >= 0 && replacement < 0) continue;
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const variant = text.slice(0, start) + `${replacement}` + text.slice(end);
    if (variant !== text) variants.add(variant);
  }
  return Array.from(variants);
}

const SPEED_VALUES = ["Normal", "Action", "Reaction"] as const;

/** Masks the part of the card's text that would give away its Speed
 *  classification, so the caption doesn't just hand the answer to the
 *  person reading it:
 *  - Action/Reaction always appear as a leading "[Action]"/"[Reaction]"
 *    bracket in this data — blank that bracket specifically.
 *  - Normal means there's no explicit marker at all, so there's nothing to
 *    strip — the caption is shown as-is, and "no visible speed tag" is
 *    itself the tell for a careful reader.
 *  Falls back to the unmodified text if no matching marker is found rather
 *  than showing a broken caption.
 */
function maskSpeedInText(text: string, speed: string): string {
  if (speed === "Action" || speed === "Reaction") {
    const re = new RegExp(`\\[${speed}\\]`);
    if (re.test(text)) return text.replace(re, "[ ? ]");
    return text;
  }
  return text; // Normal — no marker to strip
}

function buildSpeedQuestion(card: Card, _pool: Card[]) {
  const correctSpeed = card.speed!;
  const caption = maskSpeedInText(card.text || "", correctSpeed);
  // Always shown in the same fixed order (Normal, Action, Reaction) rather
  // than shuffled, per Ashwin's request.
  const options: string[] = [...SPEED_VALUES];
  const correctIndex = options.indexOf(correctSpeed);

  // Hidden cards can always be played facedown as a Reaction regardless of
  // their printed Speed — so the question needs to be explicit that it's
  // asking about the Speed when NOT played from Hidden, or "Reaction" would
  // be a defensible answer for every Hidden card regardless of truth.
  const hasHidden = card.keywords.some((k) => k.toLowerCase() === "hidden");
  const prompt = hasHidden
    ? "What's the Speed of this card's ability when NOT played from Hidden?"
    : "What's the Speed of this card's ability?";

  return {
    mode: "speed" as const,
    prompt,
    options,
    correctIndex,
    caption,
  };
}

// Mirrors the priority-ordered regex used by scripts/merge_sheet.py to
// derive each card's `abilityTrigger` category. Here we already know which
// category is correct (it's stored on the card) — this just re-locates the
// exact matched substring so it can be swapped out to build "different
// iterations" of the same text for the other options.
const TRIGGER_PATTERNS: Record<string, RegExp> = {
  "Turn Start": /start.{0,15}turn|beginning of (your|the) turn/i,
  "Turn End": /end of (your |the )?turn/i,
  Hold: /\bhold(ing)?\b/i,
  Here: /\bhere\b/i,
  May: /\bmay\b/i,
  When: /\bwhen\b/i,
  While: /\bwhile\b/i,
};

// Self-contained clause phrases used when swapping in a *different* trigger
// category. These are deliberately generic (not reusing the card's own
// wording) so they read as a grammatically clean clause on their own,
// wherever they get spliced in.
const TRIGGER_CLAUSE_TEMPLATE: Record<string, string> = {
  When: "when this happens",
  While: "while this is active",
  "Turn Start": "at the start of your turn",
  "Turn End": "at the end of your turn",
  Hold: "when you hold here",
  Here: "for units here",
  May: "you may",
};

const ALL_TRIGGER_CATEGORIES = Object.keys(TRIGGER_CLAUSE_TEMPLATE);

function locateTrigger(
  text: string,
  category: string
): { index: number; length: number } | null {
  const pattern = TRIGGER_PATTERNS[category];
  if (!pattern) return null;
  const match = pattern.exec(text);
  if (!match) return null;
  return { index: match.index, length: match[0].length };
}

/** Finds the sentence clause (bounded by commas/periods) containing the
 *  match, and reports whether a real comma anchors either side. A comma on
 *  at least one side means there's an actual second clause worth preserving
 *  (so swapping "just this clause" for a template still keeps the card's
 *  specific effect intact elsewhere in the sentence). No comma at all — just
 *  the trigger word sitting in an otherwise single-clause sentence — means
 *  swapping "the whole clause" would erase the card's real content, so the
 *  caller should fall back to a narrower word-level swap instead. */
function findClauseBounds(
  text: string,
  matchStart: number,
  matchEnd: number
): { clauseStart: number; clauseEnd: number; hasCommaAnchor: boolean } {
  let leftBoundary = -1;
  let leftIsComma = false;
  for (let i = matchStart - 1; i >= 0; i--) {
    if (text[i] === "," || text[i] === ".") {
      leftBoundary = i;
      leftIsComma = text[i] === ",";
      break;
    }
  }
  let rightBoundary = text.length;
  let rightIsComma = false;
  for (let i = matchEnd; i < text.length; i++) {
    if (text[i] === "," || text[i] === ".") {
      rightBoundary = i;
      rightIsComma = text[i] === ",";
      break;
    }
  }
  return {
    clauseStart: leftBoundary + 1,
    clauseEnd: rightBoundary,
    hasCommaAnchor: leftIsComma || rightIsComma,
  };
}

function buildTriggerDecoy(text: string, matchStart: number, matchEnd: number, category: string): string {
  const { clauseStart, clauseEnd, hasCommaAnchor } = findClauseBounds(text, matchStart, matchEnd);
  const template = TRIGGER_CLAUSE_TEMPLATE[category];

  if (!hasCommaAnchor) {
    // No second clause to preserve — narrow word-level swap keeps the rest
    // of the card's actual (short) effect text intact.
    return text.slice(0, matchStart) + template + text.slice(matchEnd);
  }

  const separator = clauseStart === 0 ? "" : " ";
  const clause = clauseStart === 0 ? template.charAt(0).toUpperCase() + template.slice(1) : template;
  return text.slice(0, clauseStart) + separator + clause + text.slice(clauseEnd);
}

function buildTriggerQuestion(card: Card, _pool: Card[]) {
  const correctCategory = card.abilityTrigger!;
  const text = card.text || "";
  const match = locateTrigger(text, correctCategory)!;
  const matchEnd = match.index + match.length;

  const otherCategories = shuffle(
    ALL_TRIGGER_CATEGORIES.filter((c) => c !== correctCategory)
  ).slice(0, 3);

  const decoys = otherCategories.map((cat) => buildTriggerDecoy(text, match.index, matchEnd, cat));

  const options = shuffle([text, ...decoys]);
  const correctIndex = options.indexOf(text);
  return {
    mode: "trigger" as const,
    prompt: "Which is this card's actual effect text?",
    options,
    correctIndex,
    caption: null,
  };
}

function championBaseName(name: string): string {
  // "Khazix, Evolving Hunter" -> "Khazix". Cards without a ", " separator
  // (most non-Champion cards) just return their full name, which won't
  // usefully match anything else — fine, since this path only matters for
  // actual Champions. Matches the platform-wide "Name, Epithet" naming
  // convention (see deckPool.ts) — every Champion/Legend name uses this
  // comma format now, so there's no dash-format case left to handle.
  const idx = name.indexOf(", ");
  return idx === -1 ? name : name.slice(0, idx);
}

function buildNameQuestion(card: Card, pool: Card[]) {
  const others = pool.filter((c) => c.id !== card.id);
  // Units only ever compare against other Units — no falling back to "any
  // card" even if that means a smaller distractor pool.
  const sameType = others.filter((c) => c.type === card.type);

  const distractorNames = new Set<string>();

  // Champions compare against OTHER VERSIONS OF THE SAME CHAMPION first
  // (e.g. Kha'Zix - Mutating vs. Kha'Zix - Evolving vs. Kha'Zix -
  // Voidreaver) — any available match is guaranteed to be included, even if
  // there's only 1 or 2 (rather than requiring 3+ before using them at all).
  if (card.subtype === "Champion") {
    const base = championBaseName(card.name);
    const sameChampion = sameType.filter((c) => championBaseName(c.name) === base);
    for (const c of shuffle(sameChampion)) {
      if (distractorNames.size >= 3) break;
      distractorNames.add(c.name);
    }
  }

  // Pad any remaining slots from the general same-set+type pool (falling
  // back to same-type only if that's too small).
  if (distractorNames.size < 3) {
    const sameSetAndType = sameType.filter((c) => c.setId === card.setId);
    const fallbackPool = shuffle(sameSetAndType.length >= 3 ? sameSetAndType : sameType);
    for (const c of fallbackPool) {
      if (distractorNames.size >= 3) break;
      if (c.name !== card.name) distractorNames.add(c.name);
    }
  }

  const options = shuffle([card.name, ...Array.from(distractorNames)]);
  const correctIndex = options.indexOf(card.name);
  return {
    mode: "name" as const,
    prompt: "What's this card called?",
    options,
    correctIndex,
    caption: null,
  };
}

/** For equipment, the first line is always an "[Equip (X)]" tag (sometimes
 *  alongside another bracket like "[Quick-Draw] [Equip (R)]"). That line is
 *  not worth testing — it's boilerplate that's nearly identical across all
 *  equipment. Returns the SECOND line onward (the actual effect), or null if
 *  there's no real effect text beyond the equip tag (e.g. "[Equip (R)]\n
 *  [Assault 2]" still has a second line; "[Equip (G)]" alone does not). */
function equipmentEffectText(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  // Drop any leading line that contains an [Equip ...] tag; keep the rest.
  const effectLines = lines.filter((l) => !/\[Equip\b/i.test(l));
  if (effectLines.length === 0) return null;
  const joined = effectLines.join("\n");
  return joined.trim().length > 0 ? joined : null;
}

function buildTextQuestion(card: Card, pool: Card[]) {
  // --- Battlefields: distractors are OTHER battlefields' abilities, never
  // number-mutations. A battlefield's whole identity is its ability, so a
  // near-miss number tweak is a weak decoy; a different battlefield's real
  // ability is a much better one. ---
  if (card.type === "Battlefield") {
    const correctText = card.text;
    const otherBattlefields = shuffle(
      pool.filter(
        (c) =>
          c.id !== card.id &&
          c.type === "Battlefield" &&
          c.text &&
          c.text !== correctText
      )
    );
    const decoys: string[] = [];
    for (const c of otherBattlefields) {
      if (decoys.length >= 3) break;
      if (!decoys.includes(c.text)) decoys.push(c.text);
    }
    const options = shuffle([correctText, ...decoys]);
    const correctIndex = options.indexOf(correctText);
    return {
      mode: "text" as const,
      prompt: "Which is this battlefield's ability?",
      options,
      correctIndex,
      caption: null,
    };
  }

  // --- Equipment: test the effect line, not the boilerplate "[Equip (X)]"
  // tag. If there's no real effect beyond the tag, this card has nothing
  // worth testing in text mode (eligibleModes already gates that below). ---
  const isEquipment = card.subtype === "Equipment";
  const correctText = isEquipment ? equipmentEffectText(card.text) ?? card.text : card.text;

  const numberVariants = mutateNumberVariants(correctText, 3);

  const decoys = [...numberVariants];
  if (decoys.length < 3) {
    const sameSetAndType = pool.filter(
      (c) => c.id !== card.id && c.setId === card.setId && c.type === card.type && c.text
    );
    const sameType = pool.filter((c) => c.id !== card.id && c.type === card.type && c.text);
    const fallbackPool = shuffle(
      sameSetAndType.length >= 3 ? sameSetAndType : sameType.length >= 3 ? sameType : pool
    );
    for (const c of fallbackPool) {
      if (decoys.length >= 3) break;
      const decoyText = c.subtype === "Equipment" ? equipmentEffectText(c.text) ?? c.text : c.text;
      if (decoyText && decoyText !== correctText && !decoys.includes(decoyText)) {
        decoys.push(decoyText);
      }
    }
  }

  const options = shuffle([correctText, ...decoys.slice(0, 3)]);
  const correctIndex = options.indexOf(correctText);
  return {
    mode: "text" as const,
    prompt: isEquipment ? "Which is this equipment's effect?" : "Which is this card's actual effect text?",
    options,
    correctIndex,
    caption: null,
  };
}

/** Picks one sane alternate value for a fill-in-the-blank number: a nearby,
 *  non-negative integer distinct from the real one (e.g. 1 -> 2, 3 -> 2 or
 *  4). Prefers the closest values and randomizes among ties so repeat
 *  exposures of the same card vary. */
function alternateNumber(value: number): number {
  const candidates = [value + 1, value - 1, value + 2, value - 2].filter(
    (n) => n >= 0 && n !== value
  );
  // Closest-first, then random among equally-close.
  candidates.sort((a, b) => Math.abs(a - value) - Math.abs(b - value));
  const closest = candidates.filter((n) => Math.abs(n - value) === Math.abs(candidates[0] - value));
  return closest[Math.floor(Math.random() * closest.length)];
}

function buildFillBlankQuestion(card: Card, _pool: Card[]) {
  const sourceText =
    card.subtype === "Equipment" ? equipmentEffectText(card.text || "") ?? card.text : card.text;
  const blanks = blankableNumbers(sourceText);
  // eligibleModes only routes here when there are exactly two, but guard
  // anyway so a data change can't produce a malformed question.
  if (blanks.length !== 2) return buildTextQuestion(card, _pool);

  const [b1, b2] = blanks;
  // Build the caption with both numbers replaced by "____", working
  // right-to-left so the first blank's indices stay valid after edits.
  const BLANK = "____";
  const caption =
    sourceText.slice(0, b1.start) +
    BLANK +
    sourceText.slice(b1.end, b2.start) +
    BLANK +
    sourceText.slice(b2.end);

  const alt1 = alternateNumber(b1.value);
  const alt2 = alternateNumber(b2.value);
  const fmt = (x: number, y: number) => `${x} | ${y}`;
  const correct = fmt(b1.value, b2.value);
  // The four combinations of {real, alternate} for each blank; the three
  // that aren't the correct pair are the distractors. Always distinct as
  // strings because each alternate differs from its real value.
  const distractors = [
    fmt(b1.value, alt2),
    fmt(alt1, b2.value),
    fmt(alt1, alt2),
  ];

  const options = shuffle([correct, ...distractors]);
  const correctIndex = options.indexOf(correct);
  return {
    mode: "fillBlank" as const,
    prompt: "Fill in the blanks:",
    options,
    correctIndex,
    caption,
  };
}

export type AttributeQuestion = {
  mode: AttributeMode;
  prompt: string;
  options: string[];
  correctIndex: number;
  caption: string | null;
};

/** Picks which attribute to test, biased AWAY from modes asked recently so
 *  the quiz cycles through all of a card's testable attributes instead of
 *  streaking on one. `recentModes` is the caller's list of the last several
 *  modes shown (most-recent-last); any eligible mode not in it is strongly
 *  preferred, and among already-seen ones, the least-recently-asked wins.
 *  This is a soft guarantee, not a hard rotation: it can only ever pick from
 *  what THIS card actually supports, so it never forces an invalid question
 *  or overrides which card the Leitner queue served up. With no history it
 *  falls back to uniform random (original behavior). */
function pickMode(eligible: AttributeMode[], recentModes: AttributeMode[]): AttributeMode {
  if (eligible.length === 1) return eligible[0];

  // A mode's "cost" is how recently it was last asked: never-asked = 0
  // (most preferred), asked last question = highest. We look back over a
  // window roughly the size of the full mode set so a card can't be asked
  // the same attribute twice within a normal cycle unless it has no other
  // option.
  const WINDOW = 7;
  const window = recentModes.slice(-WINDOW);
  const recencyCost = (mode: AttributeMode): number => {
    const lastIdx = window.lastIndexOf(mode);
    return lastIdx === -1 ? 0 : lastIdx + 1; // 0 = not in window, else 1..WINDOW
  };

  const minCost = Math.min(...eligible.map(recencyCost));
  const leastRecent = eligible.filter((m) => recencyCost(m) === minCost);
  // Random tie-break among the equally-stale modes keeps variety across
  // repeat runs rather than always picking the same attribute first.
  return leastRecent[Math.floor(Math.random() * leastRecent.length)];
}

export function buildAttributeQuestion(
  card: Card,
  pool: Card[],
  recentModes: AttributeMode[] = [],
  activeSpeedFilter: string[] = []
): AttributeQuestion | null {
  const modes = eligibleModes(card, activeSpeedFilter);
  if (modes.length === 0) return null;
  const mode = pickMode(modes, recentModes);

  // A hand-authored override for this card+mode always wins over the
  // auto-generation logic below.
  const customVariants = getCustomVariants(card.id, mode);
  if (customVariants && customVariants.length > 0) {
    const variant = customVariants[Math.floor(Math.random() * customVariants.length)];
    return buildQuestionFromVariant(mode, variant);
  }

  switch (mode) {
    case "energyCost":
      return buildEnergyCostQuestion(card, pool);
    case "powerCost":
      return buildPowerCostQuestion(card, pool);
    case "might":
      return buildMightQuestion(card, pool);
    case "keyword":
      return buildKeywordQuestion(card, pool);
    case "speed":
      return buildSpeedQuestion(card, pool);
    case "trigger":
      return buildTriggerQuestion(card, pool);
    case "name":
      return buildNameQuestion(card, pool);
    case "text":
      return buildTextQuestion(card, pool);
    case "fillBlank":
      return buildFillBlankQuestion(card, pool);
  }
}
