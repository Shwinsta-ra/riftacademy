"""
Applies an exported "Quiz Card Overrides" sheet to src/data/quizOverrides.json.

Usage:
    python3 scripts/apply_overrides.py path/to/overrides.csv

Expected columns (see README for the proposed sheet format):
    Card Code, Cost, Might, Name, Text, Keyword, Speed, Trigger

Card Code is the riftbound_id (e.g. ogn-297-298). Every other column should
be TRUE, FALSE, or left blank:
- Blank = auto (the app's normal eligibility logic decides, no override)
- FALSE = force this mode OFF for this card even if it would otherwise
  qualify (e.g. Windswept Hillock's Trigger)
- TRUE = force this mode ON for this card -- but this only works if the
  underlying data actually supports building that question (e.g. forcing
  Cost on a card with no Energy/Power set won't do anything; this isn't a
  way to fabricate missing data, just to widen an otherwise-too-strict
  auto-eligibility check)

Only rows for cards that need an actual exception belong in this sheet --
leave most cards out entirely rather than filling in a blank row for each.
Re-running this script replaces quizOverrides.json from scratch each time,
so the sheet is the single source of truth for overrides, not something to
hand-edit in the JSON directly.
"""
import json, csv, sys

OVERRIDES_PATH = "src/data/quizOverrides.json"

COLUMN_TO_MODE = {
    "Cost": "cost",
    "Might": "might",
    "Name": "name",
    "Text": "text",
    "Keyword": "keyword",
    "Speed": "speed",
    "Trigger": "trigger",
}

def parse_bool(val):
    v = (val or "").strip().lower()
    if v in ("true", "yes", "1"):
        return True
    if v in ("false", "no", "0"):
        return False
    return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/apply_overrides.py path/to/overrides.csv")
        sys.exit(1)
    csv_path = sys.argv[1]

    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    overrides = {}
    for row in rows:
        card_id = row.get("Card Code", "").strip().lower()
        if not card_id:
            continue
        card_overrides = {}
        for column, mode in COLUMN_TO_MODE.items():
            parsed = parse_bool(row.get(column))
            if parsed is not None:
                card_overrides[mode] = parsed
        if card_overrides:
            overrides[card_id] = card_overrides

    with open(OVERRIDES_PATH, "w") as f:
        json.dump(overrides, f, indent=2)

    print(f"Wrote {OVERRIDES_PATH}")
    print(f"{len(overrides)} card(s) with overrides:")
    for card_id, o in overrides.items():
        print(" ", card_id, o)

if __name__ == "__main__":
    main()
