"""
Merges Ashwin's curated Master Card Inventory export into src/data/cards.json.

Usage:
    python3 scripts/merge_sheet.py path/to/exported_sheet.csv

v3 changes (correction pass — type/subtype, blacklist):
- REVERSED from v2: `type` is now ALWAYS the sheet's literal Type value.
  Champion and Equipment are never collapsed into their own `type` — a
  champion stays type "Unit" with subtype "Champion"; equipment stays type
  "Gear" with subtype "Equipment". This means selecting "Unit" as a filter
  includes champions, and selecting "Gear" includes equipment, while
  separate "Champion"/"Equipment" filter options narrow to ONLY that
  subtype — see TYPE_FILTER_PREDICATES in quiz.ts, which is where that
  distinction now actually lives (not here).
- BLACKLIST: card ids in BLACKLISTED_IDS are permanently deleted from
  cards.json on every run, not just skipped from updates — currently just
  "unl-238-219" (Baron Nashor (Ultimate)), a non-unique variant Ashwin
  never wants in the app again. Add future permanent removals here rather
  than deleting by hand, so a re-run doesn't silently reintroduce them.

v2 changes (Vendetta-prep pass):
- Type=Token -> type: "Unit", isToken: true.
  Every Subtype value (Champion, Equipment, Combat Trick, Removal,
  Counterspell, Utility, or None) is stored as-is in a new `subtype`
  field, independent of `type`.
- NEW: rows whose Card Code isn't in cards.json yet are now INSERTED as
  brand-new cards, not just skipped. This is what actually brings in
  Vendetta (and the two previously-missing Unleashed tokens, Bird and
  Reflection — Riftcodex's API never had them; the sheet does). New cards
  get imageUrl: null and flavour: null, since neither exists in this sheet
  and Riftcodex has no Vendetta art yet (set isn't out until July 31) —
  QuizScreen-side filtering excludes anything with imageUrl: null from the
  quiz pool so these can't surface as broken-image questions before art
  exists; see getFilteredCards in quiz.ts.
- Exact duplicate Card Codes in the sheet (same code, two rows) are deduped
  — first occurrence wins, duplicate is reported and skipped.
- Collector number for brand-new cards is best-effort parsed from the
  numeric segment of Card Code; falls back to 0 for non-standard codes
  (rune/signature codes like VEN-R01, VEN-SP1) since collectorNumber isn't
  read anywhere in app logic today, purely informational.

Existing v1 behavior preserved:
- Matches each dataset card to a sheet row by riftbound_id (Card Code,
  lowercased). Falls back to the alt-art code variant when the sheet only
  has an alt-art printing of that card.
- Overwrites domain, energy, power, might, rarity, and text from the sheet.
- Adds/overwrites keywords, speed, and tags from the sheet.
- Computes `abilityTrigger` from final merged Card Text via its own
  classifier — NOT copied from the sheet's own column.
- Merges Shorthand (genuinely displayed in the app).
- NEVER reads Ability Target / Function / Used In / Notes.
"""
import json, csv, sys, re, difflib

CARDS_PATH = "src/data/cards.json"

# Cards permanently excluded from the app, regardless of what's in the
# sheet or the existing dataset — deleted on every run, not just skipped.
# Add future one-off removals here (with a short reason) rather than
# deleting by hand, so a later re-run of this script doesn't quietly bring
# them back.
BLACKLISTED_IDS = {
    "unl-238-219",  # "Baron Nashor (Ultimate)" — not a real unique card
}

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
    n = re.sub(r"\s*\([^)]*\)\s*$", "", n)
    n = n.replace(" - ", ", ")
    n = n.replace("\u2019", "'")
    n = n.replace("'", "")
    n = re.sub(r"\s+", " ", n).strip()
    return n

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
        return name
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

def parse_collector_number(card_code):
    parts = card_code.split("-")
    if len(parts) >= 2:
        digits = re.sub(r"[^\d]", "", parts[1])
        if digits:
            return int(digits)
    digits = re.sub(r"[^\d]", "", card_code)
    return int(digits) if digits else 0

def derive_type_and_flags(sheet_type, subtype):
    """Returns (type, isToken) from the sheet's Type + Subtype columns.

    NOTE (v3): type is now ALWAYS the literal sheet Type value — Champion
    and Equipment are never collapsed into their own `type` anymore. A
    champion's type is "Unit" with subtype "Champion"; equipment's type is
    "Gear" with subtype "Equipment". Filtering that wants "only champions"
    or "only equipment" as distinct categories does so via `subtype`, in
    quiz.ts's TYPE_FILTER_PREDICATES — not via `type`. This is a deliberate
    reversal of the v2 behavior, per Ashwin's explicit correction: he wants
    Unit-filter to include champions and Gear-filter to include equipment,
    while Champion/Equipment filters narrow to ONLY that subtype.
    """
    t = sheet_type.strip()
    if t == "Token":
        return "Unit", True
    return t, False

def derive_supertype(subtype, is_token, is_signature):
    if subtype == "Champion":
        return "Champion"
    if is_token:
        return "Token"
    if is_signature:
        return "Signature"
    return "Basic"

def build_new_card(row):
    card_code = row["Card Code"].strip()
    resolved_type, is_token = derive_type_and_flags(row["Type"], row["Subtype"])
    subtype_raw = row["Subtype"].strip()
    subtype = None if subtype_raw in ("", "-", "None") else subtype_raw
    is_signature = row.get("Signature", "").strip().upper() == "TRUE"
    power_raw = row["Power"].strip()
    recycle_cost = (
        [d.strip() for d in re.split(r"[,/]", power_raw) if d.strip()]
        if power_raw and power_raw.lower() != "none"
        else []
    )
    speed_raw = row["Speed"].strip()
    speed = speed_raw if speed_raw not in ("", "None") else None
    name = row["Card Name"].strip()
    if subtype == "Champion" or resolved_type == "Legend":
        name = canonical_champion_name(name)
    shorthand = row.get("Shorthand", "").strip()
    text = row["Card Text"].strip()

    return {
        "id": card_code.lower(),
        "name": name,
        "collectorNumber": parse_collector_number(card_code),
        "energy": parse_num(row["Energy"]),
        "might": parse_num(row["Might"]),
        "power": None,
        "type": resolved_type,
        "supertype": derive_supertype(subtype, is_token, is_signature),
        "rarity": row["Rarity"].strip(),
        "domain": parse_list(row["Domain(s)"]),
        "text": text,
        "flavour": None,
        "setId": card_code.split("-")[0].strip().upper(),
        "setLabel": row["Set"].strip(),
        "imageUrl": None,
        "tags": parse_list(row["Tags"]),
        "recycleCost": recycle_cost,
        "keywords": parse_list(row["Keywords"]),
        "speed": speed,
        "shorthand": shorthand if shorthand else None,
        "isSignature": is_signature,
        "isToken": is_token,
        "abilityTrigger": classify_ability_trigger(text),
        "subtype": subtype,
    }

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
        raw_rows = list(csv.DictReader(f))

    seen_codes = set()
    rows = []
    exact_dupes = []
    for r in raw_rows:
        code = r.get("Card Code", "").strip()
        if not code:
            continue
        key = code.lower()
        if key in seen_codes:
            exact_dupes.append(code)
            continue
        seen_codes.add(key)
        rows.append(r)

    by_code = {row["Card Code"].strip().lower(): row for row in rows}

    direct_matched, alt_matched, truly_missing, name_mismatches = [], [], [], []
    matched_codes = set()

    for cid in ids:
        row = by_code.get(cid)
        via_alt = False
        if row is None:
            parts = cid.split("-")
            if len(parts) == 3:
                alt_code = f"{parts[0]}-{parts[1]}a-{parts[2]}"
                row = by_code.get(alt_code)
                via_alt = row is not None
                if via_alt:
                    matched_codes.add(alt_code)
        else:
            matched_codes.add(cid)
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

        resolved_type, is_token = derive_type_and_flags(row["Type"], row["Subtype"])
        card["type"] = resolved_type
        card["isToken"] = is_token
        card["isSignature"] = row.get("Signature", "").strip().upper() == "TRUE"
        subtype_raw = row["Subtype"].strip()
        card["subtype"] = None if subtype_raw in ("", "-", "None") else subtype_raw

        if csv_name and (card["subtype"] == "Champion" or card["type"] == "Legend"):
            card["name"] = canonical_champion_name(csv_name)

        (alt_matched if via_alt else direct_matched).append(cid)

    for c in cards:
        c.setdefault("keywords", [])
        c.setdefault("isSignature", False)
        c.setdefault("isToken", False)
        c.setdefault("speed", None)
        c.setdefault("shorthand", None)
        c.setdefault("recycleCost", [])
        c.setdefault("subtype", None)

    new_cards = []
    for row in rows:
        code = row["Card Code"].strip().lower()
        if code in matched_codes:
            continue
        new_cards.append(build_new_card(row))

    cards.extend(new_cards)

    for c in cards:
        c["abilityTrigger"] = classify_ability_trigger(c["text"])

    before_blacklist = len(cards)
    removed = [c for c in cards if c["id"] in BLACKLISTED_IDS]
    cards = [c for c in cards if c["id"] not in BLACKLISTED_IDS]

    with open(CARDS_PATH, "w") as f:
        json.dump(cards, f, indent=2)
        f.write("\n")

    print("=== Existing cards updated ===")
    print("direct matched:", len(direct_matched))
    print("alt-art matched:", len(alt_matched))
    print("untouched (not in sheet):", len(truly_missing))
    for t in sorted(truly_missing):
        print("  UNTOUCHED:", t, by_id[t]["name"], by_id[t]["type"])
    print("name mismatches (skipped, needs manual review):", len(name_mismatches))
    for m in name_mismatches:
        print("  MISMATCH:", m)
    print()
    print("=== New cards inserted ===")
    print("count:", len(new_cards))
    by_set = {}
    for c in new_cards:
        by_set[c["setId"]] = by_set.get(c["setId"], 0) + 1
    print("by set:", by_set)
    no_image = [c for c in new_cards if c["imageUrl"] is None]
    print(f"new cards with no art yet (excluded from quiz pool until art exists): {len(no_image)}")
    print()
    print("=== Exact duplicate Card Codes in sheet (second+ occurrence dropped) ===")
    for d in exact_dupes:
        print("  ", d)
    print()
    print("=== Totals ===")
    print("cards.json now has", len(cards), "cards")
    print()
    print("=== Blacklisted cards permanently removed ===")
    for c in removed:
        print("  ", c["id"], c["name"])
    if not removed and any(bid not in {c["id"] for c in cards} for bid in BLACKLISTED_IDS):
        pass  # already gone from a prior run, nothing to report as newly removed

if __name__ == "__main__":
    main()
