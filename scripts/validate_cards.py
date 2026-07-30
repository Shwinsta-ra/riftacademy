"""
Cross-checks Ashwin's curated Master Card Inventory CSV against
src/data/cards.json and warns on any energy/might/speed/keyword divergence,
WITHOUT writing anything. Run this before merge_sheet.py to catch a bad
sheet edit before it silently overwrites cards.json, or any time you want
to confirm the two sources agree without doing a merge.

Usage:
    python3 scripts/validate_cards.py path/to/exported_sheet.csv

Reuses merge_sheet.py's own row-matching and field-parsing logic (by_code
+ alt-art fallback, parse_num/parse_list/normalize_name) so a match here
means merge_sheet.py would match the same row to the same card.

Exit code is 1 if any divergence is found (so this can be wired into a
pre-commit hook or CI job later), 0 otherwise.
"""
import csv, json, sys

from merge_sheet import (
    CARDS_PATH,
    normalize_name,
    names_close_enough,
    parse_list,
    parse_num,
)


def load_cards():
    with open(CARDS_PATH) as f:
        return json.load(f)


def load_rows(csv_path):
    with open(csv_path, encoding="utf-8-sig") as f:
        raw_rows = list(csv.DictReader(f))
    by_code = {}
    for r in raw_rows:
        code = r.get("Card Code", "").strip()
        if code:
            by_code[code.lower()] = r
    return by_code


def match_row(cid, by_code):
    row = by_code.get(cid)
    if row is not None:
        return row
    parts = cid.split("-")
    if len(parts) == 3:
        return by_code.get(f"{parts[0]}-{parts[1]}a-{parts[2]}")
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/validate_cards.py path/to/sheet.csv")
        sys.exit(1)

    cards = load_cards()
    by_code = load_rows(sys.argv[1])

    divergences = []
    skipped_name_mismatch = []

    for card in cards:
        row = match_row(card["id"], by_code)
        if row is None:
            continue

        csv_name = row.get("Card Name", "").strip()
        if csv_name and not names_close_enough(normalize_name(csv_name), normalize_name(card["name"])):
            skipped_name_mismatch.append((card["id"], card["name"], csv_name))
            continue

        checks = [
            ("energy", card.get("energy"), parse_num(row.get("Energy", ""))),
            ("might", card.get("might"), parse_num(row.get("Might", ""))),
            (
                "speed",
                card.get("speed"),
                row.get("Speed", "").strip() if row.get("Speed", "").strip() not in ("", "None") else None,
            ),
            ("keywords", sorted(card.get("keywords") or []), sorted(parse_list(row.get("Keywords", "")))),
        ]
        for field, cards_json_val, csv_val in checks:
            if cards_json_val != csv_val:
                divergences.append((card["id"], card["name"], field, cards_json_val, csv_val))

    if skipped_name_mismatch:
        print(f"--- {len(skipped_name_mismatch)} name mismatch(es) (not compared, same as merge_sheet.py behavior) ---")
        for cid, cards_json_name, csv_name in skipped_name_mismatch:
            print(f"  {cid}: cards.json={cards_json_name!r} vs csv={csv_name!r}")
        print()

    if not divergences:
        print(f"No divergences found across {len(cards)} cards.")
        sys.exit(0)

    print(f"--- {len(divergences)} divergence(s) found ---")
    for cid, name, field, cards_json_val, csv_val in divergences:
        print(f"  {cid} ({name}) [{field}]: cards.json={cards_json_val!r} vs csv={csv_val!r}")
    sys.exit(1)


if __name__ == "__main__":
    main()
