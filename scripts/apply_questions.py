"""
Applies an exported "Quiz Questions" sheet to src/data/quizQuestions.json.

Usage:
    python3 scripts/apply_questions.py path/to/questions.csv

One row per question VARIANT (a card+category can have more than one row --
they'll be randomly cycled between). Expected columns:

    Card Code, Category, Prompt, Correct Answer,
    Distractor 1, Distractor 2, Distractor 3, Distractor 4, Distractor 5, Distractor 6,
    Caption

- Card Code: the riftbound_id (e.g. unl-113-219).
- Category: one of Cost, Might, Name, Text, Keyword, Speed, Trigger.
- Prompt: the question text shown above/below the card.
- Correct Answer: always included as one of the options.
- Distractor 1-6: wrong-answer pool for this variant. You don't need all 6 --
  leave the rest blank. Only 3 are shown per instance of the question; if
  you provide more than 3, the app randomly samples a different 3 each time
  this card+category comes up, so repeat exposures don't always look
  identical. If you provide FEWER than 3, the question just shows fewer
  total options (e.g. 1 correct + 2 distractors = 3 choices) -- it does not
  auto-generate extra ones to fill the gap, since a made-up distractor
  might not make sense for a hand-authored question's specific wording.
  Aim for at least 3.
- Caption: optional. Only relevant for Keyword-style questions where you
  want to show the card's text with something blanked out above the
  choices. Leave blank for modes that don't need it.

Multiple rows with the same Card Code + Category are treated as separate
variants of that same question and randomly alternated between.

Re-running this script replaces quizQuestions.json from scratch each time,
so the sheet is the single source of truth -- don't hand-edit the JSON.
"""
import json, csv, sys

QUESTIONS_PATH = "src/data/quizQuestions.json"

CATEGORY_MAP = {
    "cost": "cost",
    "might": "might",
    "name": "name",
    "text": "text",
    "keyword": "keyword",
    "speed": "speed",
    "trigger": "trigger",
}

DISTRACTOR_COLUMNS = [
    "Distractor 1", "Distractor 2", "Distractor 3",
    "Distractor 4", "Distractor 5", "Distractor 6",
]

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/apply_questions.py path/to/questions.csv")
        sys.exit(1)
    csv_path = sys.argv[1]

    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    config = {}
    skipped = []
    variant_count = 0

    for row in rows:
        card_id = row.get("Card Code", "").strip().lower()
        category_raw = row.get("Category", "").strip().lower()
        category = CATEGORY_MAP.get(category_raw)
        prompt = row.get("Prompt", "").strip()
        correct = row.get("Correct Answer", "").strip()

        if not card_id or not category or not prompt or not correct:
            if card_id or category_raw or prompt or correct:
                skipped.append(row)
            continue

        distractors = []
        for col in DISTRACTOR_COLUMNS:
            val = (row.get(col) or "").strip()
            if val:
                distractors.append(val)

        variant = {
            "prompt": prompt,
            "correctAnswer": correct,
            "distractorPool": distractors,
        }
        caption = (row.get("Caption") or "").strip()
        if caption:
            variant["caption"] = caption

        config.setdefault(card_id, {}).setdefault(category, []).append(variant)
        variant_count += 1

    with open(QUESTIONS_PATH, "w") as f:
        json.dump(config, f, indent=2)

    print(f"Wrote {QUESTIONS_PATH}")
    print(f"{variant_count} question variant(s) across {len(config)} card(s)")
    for card_id, categories in config.items():
        for cat, variants in categories.items():
            short_pool_variants = [v for v in variants if len(v["distractorPool"]) < 3]
            if short_pool_variants:
                print(
                    f"  NOTE: {card_id} / {cat} has a variant with fewer than 3 distractors "
                    f"-- that question will show fewer than 4 total options, not auto-padded"
                )
    if skipped:
        print(f"\nSkipped {len(skipped)} incomplete row(s) (missing Card Code/Category/Prompt/Correct Answer):")
        for r in skipped:
            print("  ", r)

if __name__ == "__main__":
    main()
