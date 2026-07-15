"""
Merges Ashwin's curated Master Card Inventory export into src/data/cards.json.

Usage:
    python3 scripts/merge_sheet.py path/to/exported_sheet.csv

What it does:
- Matches each dataset card to a sheet row by riftbound_id (Card Code,
  lowercased). Falls back to the alt-art code variant (e.g. ogn-007a-298)
  when the sheet only has an alt-art printing of that card, since rules
  text is identical between base and alt-art versions. (Harmless no-op once
  the sheet only uses base codes.)
- Overwrites domain, energy, power, might, rarity, and text from the sheet
  (treated as validated/authoritative per Ashwin's own curation).
- Adds/overwrites keywords, speed, and tags from the sheet.
- Remaps the sheet's Type column into canonical `type` directly — Champion
  and Equipment are now their own clean, mutually exclusive categories
  (the sheet no longer needs "Gear-Equipment"/"Signature Gear"/"Signature
  Spell" as separate Type values; a "Signature?" column tracks that
  orthogonally instead). Captures `isSignature` (Signature? == "Yes") and
  `isToken` (Type == "Token") as separate flags — `isSignature` isn't wired
  into any filter yet per Ashwin's request, just tracked for later.
- Computes `abilityTrigger` (While/When/May/Hold/Turn Start/Turn End/Here)
  for every card via its own text-based classifier, run against the final
  merged Card Text — NOT copied from the sheet's own "Ability Triggers"
  column, since that column is Ashwin's own rough first pass. Prints a diff
  report of any card where the computed value disagrees with the sheet's,
  for Ashwin's awareness (computed value always wins).
- Remaps the sheet's Type column into the app's canonical 6-category
  taxonomy (Unit/Spell/Gear/Battlefield/Legend/Rune) per Ashwin's mapping:
    Unit        <- Unit, Champion, Signature Unit, Token
    Spell       <- Spell, Signature Spell
    Gear        <- Gear, Gear-Equipment, Signature Gear
    Battlefield <- Battlefield
    Legend      <- Legend
    Rune        <- Rune  (kept in the dataset but excluded from quiz logic
                           entirely — enforced in attributeQuiz.ts)
  Falls back to the original Riftcodex `type` when a sheet row's Type value
  isn't recognized, rather than guessing.
- Does NOT merge Shorthand (Ashwin's personal note-taking column only).
- NEVER reads Ability Target / Function / Used In / Notes — explicitly
  unvalidated per Ashwin, excluded even if present in the export.
- Cards the sheet doesn't cover at all are left untouched (original
  Riftcodex-derived data stays).
- Prints a full report: direct matches, alt-art matches, untouched/missing
  cards, any name mismatches skipped, and any unrecognized Type values.
"""
import json, csv, sys, re, difflib

CARDS_PATH = "src/data/cards.json"

TYPE_MAP = {
    "unit": "Unit",
    "champion": "Champion",  # now kept distinct — was collapsed into Unit previously
    "signature unit": "Unit",  # legacy value; sheet now tracks this via the Signature? column instead
    "token": "Unit",
    "spell": "Spell",
    "signature spell": "Spell",  # legacy value; sheet now folds this into plain Spell + Signature? column
    "gear": "Gear",
    "equipment": "Equipment",  # sheet's current clean value — its own canonical type now
    "gear-equipment": "Equipment",  # legacy hyphenated value from older sheet exports
    "signature gear": "Gear",  # legacy value; sheet now folds this into plain Gear + Signature? column
    "battlefield": "Battlefield",
    "legend": "Legend",
    "rune": "Rune",
}

# Ability Trigger classifier — derives Ashwin's new "Ability Triggers" column
# (While/When/May/Hold/Turn Start/Turn End/Here) directly from Card Text via
# regex + priority order, rather than trusting the sheet's own partial column
# (which as of v4 only covers When/While/May and is missing Hold/Turn
# Start/Turn End/Here almost entirely).
#
# Priority matters because a single card's text can match several patterns
# at once — e.g. "When you hold here, ..." contains "When", "hold", AND
# "here". More specific/mechanical triggers are checked first so the most
# meaningful label wins:
#   1. Turn Start / Turn End — explicit turn-timing phrasing
#   2. Hold — the specific "hold" battlefield-control mechanic
#   3. Here — a location qualifier with no explicit trigger word
#   4. May — marks the effect as optional
#   5. When / While — the generic catch-all triggers
#   6. None — no matching trigger language at all (passive stat lines, etc.)
ABILITY_TRIGGER_PATTERNS = [
    ("Turn Start", re.compile(r"start.{0,15}turn|beginning of (your|the) turn", re.I)),
    ("Turn End", re.compile(r"end of (your |the )?turn", re.I)),
    ("Hold", re.compile(r"\bhold(ing)?\b", re.I)),
    ("Here", re.compile(r"\bhere\b", re.I)),
    ("May", re.compile(r"\bmay\b", re.I)),
    ("When", re.compile(r"\bwhen\b", re.I)),
    ("While", re.compile(r"\bwhile\b", re.I)),
]

def classify_ability_trigger(text):
    for label, pattern in ABILITY_TRIGGER_PATTERNS:
        if pattern.search(text or ""):
            return label
    return None

def normalize_name(name):
    n = name.lower().strip()
    n = re.sub(r"\s*\(starter\)\s*$", "", n)
    n = re.sub(r"\s*//\s*buff\s*$", "", n)
    n = re.sub(r"\s*\([^)]*\)\s*$", "", n)  # trailing parenthetical (token variant codes etc.)
    n = n.replace(" - ", ", ")
    n = n.replace("\u2019", "'")
    n = n.replace("'", "")  # apostrophe-insensitive
    n = re.sub(r"\s+", " ", n).strip()
    return n

# Platform-wide naming convention for every Champion/Legend card: "Name,
# Epithet" — no apostrophes in the base name, sentence case with minor words
# (of/the/at/etc.) lowercase except as the epithet's first or last word.
# Riftcodex's raw API data (and Mobalytics decklists) write these as
# "Name - Epithet", with a few base names stylized with apostrophes/internal
# capitals (Kai'Sa, Kha'Zix, Rek'Sai, Kog'Maw, LeBlanc) and three legends
# tagged "(Starter)". Applied to every Champion/Legend card on every run —
# not just ones present in this CSV — so a fresh Riftcodex pull for a new
# set (e.g. Vendetta) gets canonicalized the same way without needing a
# separate one-off fix each time.
NAME_MINOR_WORDS = {"of", "the", "a", "an", "and", "or", "but", "nor",
                     "in", "on", "at", "to", "for", "from", "with", "as"}
CHAMPION_BASE_FIX = {
    "Kai'Sa": "Kaisa",
    "Kha'Zix": "Khazix",
    "Rek'Sai": "Reksai",
    "Rek'sai": "Reksai",
    "Kog'Maw": "Kogmaw",
    "LeBlanc": "Leblanc",
}

def _fix_epithet_case(epithet):
    words = epithet.split(" ")
    out = []
    for i, w in enumerate(words):
        if i > 0 and w.lower() in NAME_MINOR_WORDS:
            out.append(w.lower())
        else:
            out.append(w[0].upper() + w[1:] if w else w)
    return " ".join(out)

def canonical_champion_name(name):
    starter = name.endswith(" (Starter)")
    if starter:
        name = name[: -len(" (Starter)")]
    if " - " in name:
        base, epithet = name.split(" - ", 1)
    elif ", " in name:
        base, epithet = name.split(", ", 1)
    else:
        return name  # not "Name/Epithet"-shaped — leave untouched
    base = CHAMPION_BASE_FIX.get(base, base)
    epithet = _fix_epithet_case(epithet)
    return f"{base}, {epithet}"

def names_close_enough(a, b):
    if a == b:
        return True
    if abs(len(a) - len(b)) > 2:
        return False
    return difflib.SequenceMatcher(None, a, b).ratio() >= 0.9

def parse_list(val):
    if val is None:
        return []
    v = val.strip()
    if v in ("", "-", "None"):
        return []
    return [p.strip() for p in v.split(",") if p.strip()]

def parse_num(val):
    if val is None:
        return None
    v = val.strip()
    if v in ("", "-", "None"):
        return None
    try:
        return int(v)
    except ValueError:
        try:
            return float(v)
        except ValueError:
            return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/merge_sheet.py path/to/sheet.csv")
        sys.exit(1)
    csv_path = sys.argv[1]

    with open(CARDS_PATH) as f:
        cards = json.load(f)
    by_id = {c["id"]: c for c in cards}
    ids = set(by_id.keys())

    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    by_code = {row["Card Code"].strip().lower(): row for row in rows if row.get("Card Code")}

    direct_matched, alt_matched, truly_missing, name_mismatches = [], [], [], []
    unrecognized_types = []
    other_set_rows = [r for r in rows if r["Set"].strip().lower() not in
                       {"origins", "proving grounds", "spiritforged", "unleashed"} and r.get("Card Code")]

    for cid in ids:
        row = by_code.get(cid)
        via_alt = False
        if row is None:
            parts = cid.split("-")
            alt_code = f"{parts[0]}-{parts[1]}a-{parts[2]}"
            row = by_code.get(alt_code)
            via_alt = row is not None
        if row is None:
            truly_missing.append(cid)
            continue

        card = by_id[cid]
        csv_name = row["Card Name"].strip()
        if csv_name and not names_close_enough(normalize_name(csv_name), normalize_name(card["name"])):
            name_mismatches.append((cid, card["name"], csv_name))
            continue

        domain = parse_list(row["Domain(s)"])
        if domain:
            card["domain"] = domain
        card["energy"] = parse_num(row["Energy"])
        # NOTE: the sheet's "Power" column is NOT a number — it's the
        # domain(s) of rune that must be recycled to play the card (e.g.
        # "Calm", or "Body, Body" for two Body runes). The old numeric
        # `power` field from the original Riftcodex API is a different,
        # unrelated stat and is left untouched here.
        power_raw = row["Power"].strip()
        if power_raw and power_raw.lower() != "none":
            card["recycleCost"] = [d.strip() for d in re.split(r"[,/]", power_raw) if d.strip()]
        else:
            card["recycleCost"] = []
        card["might"] = parse_num(row["Might"])
        rarity = row["Rarity"].strip()
        if rarity:
            card["rarity"] = rarity
        text = row["Card Text"].strip()
        if text:
            card["text"] = text
        card["keywords"] = parse_list(row["Keywords"])
        card["speed"] = row["Speed"].strip() if row["Speed"].strip() not in ("", "None") else None
        card["tags"] = parse_list(row["Tags"])
        shorthand = row.get("Shorthand", "").strip()
        card["shorthand"] = shorthand if shorthand else None

        sheet_type = row["Type"].strip().lower()
        card["isSignature"] = row.get("Signature?", "").strip().lower() == "yes"
        card["isToken"] = sheet_type == "token"
        mapped_type = TYPE_MAP.get(sheet_type)
        if mapped_type:
            card["type"] = mapped_type
        elif sheet_type:
            unrecognized_types.append((cid, row["Type"].strip()))

        (alt_matched if via_alt else direct_matched).append(cid)

    for c in cards:
        c.setdefault("keywords", [])
        c.setdefault("isSignature", False)
        c.setdefault("isToken", False)
        c.setdefault("speed", None)
        c.setdefault("shorthand", None)
        c.setdefault("recycleCost", [])
        if c["type"] in ("Champion", "Legend"):
            c["name"] = canonical_champion_name(c["name"])

    # Ability Trigger is computed from final Card Text (post-merge), for every
    # card regardless of sheet match status — it's derived, not copied.
    trigger_diffs = []
    for c in cards:
        computed = classify_ability_trigger(c["text"])
        c["abilityTrigger"] = computed
        row = by_code.get(c["id"])
        if row and "Ability Triggers" in row:
            sheet_val = row["Ability Triggers"].strip()
            sheet_val = None if sheet_val in ("", "-", "None") else sheet_val
            if sheet_val is not None and sheet_val != computed:
                trigger_diffs.append((c["id"], c["name"], sheet_val, computed))

    with open(CARDS_PATH, "w") as f:
        json.dump(cards, f)

    print("direct matched:", len(direct_matched))
    print("alt-art matched:", len(alt_matched))
    print("untouched (not in sheet):", len(truly_missing))
    print("name mismatches (skipped):", len(name_mismatches))
    for m in name_mismatches:
        print("  MISMATCH:", m)
    print("unrecognized Type values (kept original app type):", len(unrecognized_types))
    for u in unrecognized_types:
        print("  ", u)
    print("rows for sets not yet active in the app (ignored):", len(other_set_rows))
    for r in other_set_rows:
        print("  ", r["Set"], r["Card Code"], r["Card Name"])
    if truly_missing:
        print("\nuntouched card ids (still using original Riftcodex text):")
        for t in sorted(truly_missing):
            print(" ", t, by_id[t]["name"], by_id[t]["type"])
    print("\nAbility Trigger: computed-vs-sheet disagreements (computed value kept):", len(trigger_diffs))
    for d in trigger_diffs[:30]:
        print("  ", d)

if __name__ == "__main__":
    main()
