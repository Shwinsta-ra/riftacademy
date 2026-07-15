"""
Applies an exported "Quiz Box Positions" sheet to src/data/quizPositions.json.

Usage:
    python3 scripts/apply_positions.py path/to/positions.csv

Expected columns (see README for the proposed sheet format):
    Mode, Card Type, Region, Top %, Height %, Left %, Width %

- Mode: one of Cost, Might, Name, Text (Keyword/Speed/Trigger questions all
  reuse the Text box position -- they don't need their own rows unless you
  want them to look different from Text specifically).
- Card Type: a card type name (Unit, Spell, Gear, Battlefield, Legend), or
  "Default" to apply to every type that doesn't have its own row.
- Region: leave blank for single-box modes. Battlefield's Text mode needs
  two rows -- one with Region="Top", one with Region="Bottom" -- since it
  masks the card's mirrored text twice.
- Top/Height/Left/Width %: plain numbers (3, not "3%").
"""
import json, csv, sys

POSITIONS_PATH = "src/data/quizPositions.json"

MODE_KEY_MAP = {
    "cost": "cost",
    "might": "might",
    "name": "name",
    "text": "text",
}

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/apply_positions.py path/to/positions.csv")
        sys.exit(1)
    csv_path = sys.argv[1]

    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    config = {}
    skipped = []
    for row in rows:
        mode_raw = row.get("Mode", "").strip().lower()
        mode_key = MODE_KEY_MAP.get(mode_raw)
        if not mode_key:
            skipped.append(row)
            continue

        card_type = row.get("Card Type", "").strip() or "Default"
        type_key = "default" if card_type.lower() == "default" else card_type
        region = row.get("Region", "").strip().lower()

        try:
            region_obj = {
                "top": float(row["Top %"]),
                "height": float(row["Height %"]),
                "left": float(row["Left %"]),
                "width": float(row["Width %"]),
            }
        except (KeyError, ValueError):
            skipped.append(row)
            continue

        config.setdefault(mode_key, {}).setdefault(type_key, [])
        if region == "bottom":
            config[mode_key][type_key].append(region_obj)
        elif region == "top" or region == "":
            existing = config[mode_key][type_key]
            if len(existing) == 0:
                existing.append(region_obj)
            else:
                existing[0] = region_obj
        else:
            skipped.append(row)

    with open(POSITIONS_PATH, "w") as f:
        json.dump(config, f, indent=2)

    print(f"Wrote {POSITIONS_PATH}")
    print("Modes configured:", list(config.keys()))
    for mode, types in config.items():
        print(f"  {mode}: {list(types.keys())}")
    if skipped:
        print(f"\nSkipped {len(skipped)} row(s) with unrecognized/invalid values:")
        for r in skipped:
            print("  ", r)

if __name__ == "__main__":
    main()
