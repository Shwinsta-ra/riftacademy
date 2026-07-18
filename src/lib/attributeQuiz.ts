import { Card } from "./types";
import { getAllCards } from "./quiz";
import positionsConfig from "../data/quizPositions.json";
import overridesConfig from "../data/quizOverrides.json";
import questionsConfig from "../data/quizQuestions.json";

export type AttributeMode = "cost" | "might" | "keyword" | "speed" | "trigger" | "name" | "text";

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
const POSITION_MODE_KEY: Record<AttributeMode, string> = {
  cost: "cost",
  might: "might",
  name: "name",
  keyword: "text",
  speed: "text",
  trigger: "text",
  text: "text",
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
// build a question (e.g. forcing "cost" on a card with no energy/power set
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

/** Which attribute-quiz modes are even askable for this card. */
export function eligibleModes(card: Card): AttributeMode[] {
  // Runes are excluded from testing entirely, per Ashwin's rule — they can
  // exist in the dataset (e.g. for future reference/display) but never
  // appear as a quiz question.
  if (card.type === "Rune") return [];

  // Tokens (e.g. OGN's Recruit/Sprite "// Buff" cards, kept in the dataset
  // so set counts still match the official release) are game pieces, not
  // cards a player studies — excluded from the quiz the same way runes are.
  if (card.isToken) return [];

  const modes: AttributeMode[] = [];
  if (card.energy !== null || card.power !== null) modes.push("cost");
  if (card.might !== null) modes.push("might");
  if (card.keywords.length > 0 && extractFirstKeyword(card.text || "", card.keywords)) {
    modes.push("keyword");
  }
  if (card.speed !== null) modes.push("speed");
  if (card.abilityTrigger !== null && locateTrigger(card.text || "", card.abilityTrigger)) {
    modes.push("trigger");
  }
  modes.push("name");
  if ((card.text || "").trim().length >= 15) modes.push("text");

  // Apply per-card overrides (src/data/quizOverrides.json) on top of the
  // auto-computed set — e.g. Windswept Hillock's only "here" is a location
  // qualifier, not a real trigger, so it's force-excluded from "trigger"
  // even though the classifier's regex technically matches.
  const ALL_MODES: AttributeMode[] = ["cost", "might", "keyword", "speed", "trigger", "name", "text"];
  const withOverrides = new Set(modes);
  for (const m of ALL_MODES) {
    const override = getOverride(card.id, m);
    if (override === false) withOverrides.delete(m);
    if (override === true) withOverrides.add(m);
  }
  return ALL_MODES.filter((m) => withOverrides.has(m));
}

function pickNearbyDistinctNumbers(
  correct: number,
  candidatePool: number[],
  count: number
): number[] {
  const uniqueCandidates = Array.from(new Set(candidatePool)).filter((n) => n !== correct);
  uniqueCandidates.sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct));
  const picked = uniqueCandidates.slice(0, count);
  // pad with synthetic nearby values if the real pool didn't have enough variety
  let offset = 1;
  while (picked.length < count) {
    const candidate = correct + offset;
    if (candidate !== correct && !picked.includes(candidate) && candidate >= 0) {
      picked.push(candidate);
    }
    offset = offset > 0 ? -offset : -offset + 1;
    if (offset > 20) break;
  }
  return picked;
}

function buildCostQuestion(card: Card, pool: Card[]) {
  const correctValue = card.energy ?? card.power ?? 0;
  const label = card.energy !== null ? "Energy" : "Power";
  const candidatePool = pool
    .map((c) => (card.energy !== null ? c.energy : c.power))
    .filter((v): v is number => v !== null);
  const distractors = pickNearbyDistinctNumbers(correctValue, candidatePool, 3);
  const options = shuffle([correctValue, ...distractors]).map((n) => `${n}`);
  const correctIndex = options.indexOf(`${correctValue}`);
  return {
    mode: "cost" as const,
    prompt: `What's this card's ${label} cost?`,
    options,
    correctIndex,
    caption: null,
  };
}

function buildMightQuestion(card: Card, pool: Card[]) {
  const correctValue = card.might ?? 0;
  const candidatePool = pool.map((c) => c.might).filter((v): v is number => v !== null);
  const distractors = pickNearbyDistinctNumbers(correctValue, candidatePool, 3);
  const options = shuffle([correctValue, ...distractors]).map((n) => `${n}`);
  const correctIndex = options.indexOf(`${correctValue}`);
  return {
    mode: "might" as const,
    prompt: "What's this unit's Might?",
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
  while (variants.size < count && guard < 30) {
    guard++;
    const m = matches[Math.floor(Math.random() * matches.length)];
    const original = parseInt(m[0], 10);
    const delta = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
    const replacement = original + delta;
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

function buildTextQuestion(card: Card, pool: Card[]) {
  const correctText = card.text;
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
      if (c.text && c.text !== correctText && !decoys.includes(c.text)) {
        decoys.push(c.text);
      }
    }
  }

  const options = shuffle([correctText, ...decoys.slice(0, 3)]);
  const correctIndex = options.indexOf(correctText);
  return {
    mode: "text" as const,
    prompt: "Which is this card's actual effect text?",
    options,
    correctIndex,
    caption: null,
  };
}

export type AttributeQuestion = {
  mode: AttributeMode;
  prompt: string;
  options: string[];
  correctIndex: number;
  caption: string | null;
};

export function buildAttributeQuestion(card: Card, pool: Card[]): AttributeQuestion | null {
  const modes = eligibleModes(card);
  if (modes.length === 0) return null;
  const mode = modes[Math.floor(Math.random() * modes.length)];

  // A hand-authored override for this card+mode always wins over the
  // auto-generation logic below.
  const customVariants = getCustomVariants(card.id, mode);
  if (customVariants && customVariants.length > 0) {
    const variant = customVariants[Math.floor(Math.random() * customVariants.length)];
    return buildQuestionFromVariant(mode, variant);
  }

  switch (mode) {
    case "cost":
      return buildCostQuestion(card, pool);
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
  }
}
