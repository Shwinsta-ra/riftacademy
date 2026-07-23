"""
Applies an exported RiftRecall Card Recall Master Sheet CSV to BOTH
src/data/quizOverrides.json and src/data/quizQuestions.json in one pass.

Usage:
    python3 scripts/apply_master_sheet.py path/to/exported_sheet.csv

This is the sheet produced by scripts/build_master_sheet.py -- one row per
(card, question category) currently eligible in RiftRecall. See that sheet's
"Read Me First" tab for the full column legend. Summary of what's read:

- Card Code + Category: identify which card+mode this row is for.
- Enabled: blank -> no override (app's normal auto-eligibility decides).
  FALSE -> force this mode off for this card. TRUE -> force it on (only
  works if the underlying data supports it).
- Your Custom Prompt + Your Custom Correct Answer: if BOTH are non-blank,
  this row becomes a hand-authored question, permanently pinned instead of
  auto-generated, using Your Distractor 1-6 as its distractor pool (blanks
  skipped, at least 1 needed, 3+ recommended for variety).
- If Your Custom Prompt/Correct Answer are blank, no quizQuestions.json
  entry is written for this row -- it keeps using live auto-generation.
- All "(reference only)" columns and Needs Fixing / Notes are never read.

Re-running this script replaces BOTH JSON files from scratch each time --
the sheet is the single source of truth, not something to hand-edit the
JSON files around.
"""
import json, csv, sys, re

OVERRIDES_PATH = "src/data/quizOverrides.json"
QUESTIONS_PATH = "src/data/quizQuestions.json"

CATEGORY_MAP = {
    "energy cost": "energyCost",
    "power cost": "powerCost",
    "might": "might",
    "name": "name",
    "text": "text",
    "keyword": "keyword",
    "speed": "speed",
    "trigger": "trigger",
    "fill in the blanks": "fillBlank",
}

# The only two prompt strings auto-generation ever produces for fillBlank
# (see buildSingleBlankQuestion/buildFillBlankQuestion in attributeQuiz.ts).
# Hand-authored rows follow the same visual convention -- label, then the
# blanked sentence in brackets -- but typed into one cell with nowhere to
# store prompt/caption separately, so this splits it back apart.
FILLBLANK_LABELS = ("Fill in the blank:", "Fill in the blanks:")


def split_fillblank_prompt(custom_prompt):
    """Splits a hand-authored fillBlank prompt into (prompt, caption) if it
    matches the auto-generated label + bracketed-sentence convention exactly;
    otherwise returns (custom_prompt, None) unchanged. Only the outermost
    bracket pair is ever stripped -- card text routinely contains its own
    real brackets (e.g. [Empower]), and this must never touch those."""
    for label in FILLBLANK_LABELS:
        if custom_prompt.startswith(label):
            remainder = custom_prompt[len(label):].strip()
            if remainder.startswith("[") and remainder.endswith("]"):
                return label, remainder[1:-1].strip()
            break
    return custom_prompt, None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/apply_master_sheet.py path/to/sheet.csv")
        sys.exit(1)
    csv_path = sys.argv[1]

    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    overrides = {}
    questions = {}
    skipped_incomplete = []
    skipped_bad_category = []
    fillblank_split_ok = []
    fillblank_split_fallback = []

    for row in rows:
        card_code = (row.get("Card Code") or "").strip().lower()
        category_raw = (row.get("Category") or "").strip().lower()
        if not card_code or not category_raw:
            continue
        mode = CATEGORY_MAP.get(category_raw)
        if mode is None:
            skipped_bad_category.append((card_code, row.get("Category")))
            continue

        enabled_raw = (row.get("Enabled") or "").strip().upper()
        if enabled_raw == "TRUE":
            overrides.setdefault(card_code, {})[mode] = True
        elif enabled_raw == "FALSE":
            overrides.setdefault(card_code, {})[mode] = False
        # blank -> no override entry at all

        custom_prompt = (row.get("Your Custom Prompt") or "").strip()
        custom_answer = (row.get("Your Custom Correct Answer") or "").strip()
        if not custom_prompt and not custom_answer:
            continue
        if not custom_prompt or not custom_answer:
            skipped_incomplete.append((card_code, category_raw, row))
            continue

        # Read distractor columns. The current sheet has 5 (Your Distractor
        # 1-5); we scan up to 6 so an older 6-column export still imports.
        distractors = []
        for i in range(1, 7):
            v = (row.get(f"Your Distractor {i}") or "").strip()
            if v:
                distractors.append(v)
        # Defensive cleanup so a slip in the sheet can't produce a broken
        # question: drop any distractor equal to the correct answer (would
        # show the right answer twice) and collapse duplicates, preserving
        # order.
        seen = set()
        cleaned = []
        for d in distractors:
            if d != custom_answer and d not in seen:
                seen.add(d)
                cleaned.append(d)
        distractors = cleaned
        if not distractors:
            skipped_incomplete.append((card_code, category_raw, row))
            continue

        variant = {
            "prompt": custom_prompt,
            "correctAnswer": custom_answer,
            "distractorPool": distractors,
        }
        if mode == "fillBlank":
            split_prompt, split_caption = split_fillblank_prompt(custom_prompt)
            if split_caption is not None:
                variant["prompt"] = split_prompt
                variant["caption"] = split_caption
                fillblank_split_ok.append(card_code)
            else:
                fillblank_split_fallback.append(card_code)
        questions.setdefault(card_code, {}).setdefault(mode, []).append(variant)

    with open(OVERRIDES_PATH, "w") as f:
        json.dump(overrides, f, indent=2)
        f.write("\n")
    with open(QUESTIONS_PATH, "w") as f:
        json.dump(questions, f, indent=2)
        f.write("\n")

    print(f"Wrote {OVERRIDES_PATH}")
    print(f"  {sum(len(v) for v in overrides.values())} override(s) across {len(overrides)} card(s)")
    print(f"Wrote {QUESTIONS_PATH}")
    total_variants = sum(len(v) for card in questions.values() for v in card.values())
    print(f"  {total_variants} question variant(s) across {len(questions)} card(s)")

    if skipped_bad_category:
        print()
        print(f"Skipped {len(skipped_bad_category)} row(s) with an unrecognized Category:")
        for code, cat in skipped_bad_category[:20]:
            print(f"   {code}: {cat!r}")

    if skipped_incomplete:
        print()
        print(f"Skipped {len(skipped_incomplete)} incomplete custom row(s) "
              f"(need BOTH Custom Prompt + Correct Answer, plus at least 1 distractor):")
        for code, cat, row in skipped_incomplete[:20]:
            print(f"   {code} / {cat}")

    total_fillblank = len(fillblank_split_ok) + len(fillblank_split_fallback)
    if total_fillblank:
        print()
        print(f"Fill-in-the-blank custom rows: {total_fillblank} found, "
              f"{len(fillblank_split_ok)} split into prompt+caption, "
              f"{len(fillblank_split_fallback)} fell back to an unsplit prompt")
        if fillblank_split_fallback:
            print("  Fallback card(s) (didn't match the expected label + bracket pattern):")
            for code in fillblank_split_fallback[:20]:
                print(f"   {code}")


if __name__ == "__main__":
    main()
