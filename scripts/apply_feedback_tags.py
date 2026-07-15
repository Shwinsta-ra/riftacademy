#!/usr/bin/env python3
"""Rebuild src/data/feedbackTags.json from a CSV export of the
RA_Feedback Tags tab.

Same workflow as apply_positions.py / apply_overrides.py:

    File > Download > Comma-separated values, then:
    python3 scripts/apply_feedback_tags.py ~/Downloads/RA_Feedback_Tags.csv

Expected columns (header row, exact names):
    Screen | Tag ID | Label | Severity | Card Data? | Active

  Screen     one of: GLOBAL, Home, Quiz, Settings, Stats, MatchList, MatchDetail
             GLOBAL tags appear on every screen, after the screen-specific ones.
  Tag ID     lowercase, no spaces. Stable identifier — this is what gets stored
             in Discord and what you'd group reports by. Changing it orphans
             every past report that used it, so prefer editing the Label.
  Label      what the user actually reads on the chip.
  Severity   broken | data | visual | slow | idea  (drives the chip colour)
  Card Data? TRUE routes the report to card-inventory review rather than to a
             code fix, and attaches the current card's riftbound_id.
  Active     FALSE hides the tag without deleting the row, so you keep the
             history of what you tried.
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "feedbackTags.json"

SEVERITIES = {
    "broken": "#CC2929",   # Fury
    "data": "#2B73C2",     # Mind
    "visual": "#E57921",   # Body
    "slow": "#8629B3",     # Chaos
    "idea": "#3FA34D",     # Calm
    "other": "#EBB113",    # Order — reserved for the catch-all "Other" chip
}
SCREENS = {"GLOBAL", "Home", "Quiz", "Settings", "Stats", "MatchList", "MatchDetail"}

TRUTHY = {"true", "yes", "y", "1", "x"}


def truthy(v: str) -> bool:
    return str(v).strip().lower() in TRUTHY


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1

    src = Path(sys.argv[1])
    if not src.exists():
        print(f"No such file: {src}")
        return 1

    rows, errors = [], []
    with src.open(newline="", encoding="utf-8-sig") as fh:
        for i, row in enumerate(csv.DictReader(fh), start=2):
            screen = (row.get("Screen") or "").strip()
            tag_id = (row.get("Tag ID") or "").strip()
            label = (row.get("Label") or "").strip()
            severity = (row.get("Severity") or "").strip().lower()

            # The legend sits below the data, separated by a blank row, and it
            # comes along in every CSV export. Stop at the separator rather than
            # trying to parse prose as tags.
            if not screen and not tag_id and not label:
                break

            # Fail loudly rather than silently dropping a tag the user meant to
            # ship. A typo'd severity would otherwise just render grey.
            if screen not in SCREENS:
                errors.append(f"row {i}: unknown Screen {screen!r} (expected one of {sorted(SCREENS)})")
            if not tag_id or " " in tag_id or tag_id != tag_id.lower():
                errors.append(f"row {i}: Tag ID {tag_id!r} must be lowercase with no spaces")
            if not label:
                errors.append(f"row {i}: Label is empty")
            if severity not in SEVERITIES:
                errors.append(f"row {i}: unknown Severity {severity!r} (expected one of {sorted(SEVERITIES)})")

            rows.append({
                "screen": screen,
                "id": tag_id,
                "label": label,
                "severity": severity,
                "cardData": truthy(row.get("Card Data?", "")),
                "active": truthy(row.get("Active", "TRUE")),
            })

    dupes = {}
    for r in rows:
        key = (r["screen"], r["id"])
        dupes[key] = dupes.get(key, 0) + 1
    for key, n in dupes.items():
        if n > 1:
            errors.append(f"{key[0]}/{key[1]} appears {n} times — Tag IDs must be unique per screen")

    if errors:
        print("Refusing to write. Fix these first:\n")
        for e in errors:
            print(f"  - {e}")
        return 1

    existing = json.loads(OUT.read_text())
    payload = {
        "_comment": existing["_comment"],
        "_severities": SEVERITIES,
        "tags": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n")

    active = sum(1 for r in rows if r["active"])
    by_screen = {}
    for r in rows:
        if r["active"]:
            by_screen[r["screen"]] = by_screen.get(r["screen"], 0) + 1
    print(f"Wrote {OUT.relative_to(ROOT)} — {active} active tags of {len(rows)} rows")
    for screen in sorted(by_screen):
        print(f"  {screen}: {by_screen[screen]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
