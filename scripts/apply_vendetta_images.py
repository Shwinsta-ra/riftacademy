"""
Populates imageUrl (and flavour, if present) on Vendetta cards in
src/data/cards.json from a raw Riftcodex API pull.

Usage:
    python3 scripts/apply_vendetta_images.py path/to/riftcodex_page1.txt [more pages...]

Input is the same raw paste-from-browser format used to originally ingest
Vendetta cards: a page of "https://api.riftcodex.com/cards?..." followed by
the JSON body ({"items": [...], "total": ..., "page": ..., ...}). Pass every
page file you pulled (page 1, 2, 3, ...) -- order doesn't matter, all items
are pooled before matching.

Matching:
- Each cards.json entry's `id` field IS the Riftcodex `riftbound_id`,
  lowercased (see merge_sheet.py) -- e.g. "ven-002-166", "ven-r01", "ven-sp1".
  Matching is a direct id lookup, case-insensitive.
- If Riftcodex has more than one raw item for the same riftbound_id (the
  preview-stub-vs-finalized-entry duplication described in the card-index
  cleanup pass), the item with a populated tcgplayer_id wins; if neither/both
  have one, the item with the longer text wins (same tie-break as the master
  inventory dedup).
- Cards already carrying a non-null imageUrl are left untouched (idempotent
  re-runs -- pulling page 1 again after Riftcodex adds pages 5/6 won't
  clobber anything already set).
- Cards in cards.json with no matching riftbound_id in the pull (i.e.
  Riftcodex hasn't revealed that slot yet) are reported, not modified.

Does NOT touch Card Text, stats, or anything else -- this script only ever
writes the `imageUrl` field. Re-run scripts/merge_sheet.py separately for any
sheet-driven text/stat corrections.
"""
import json, sys, re

CARDS_PATH = "src/data/cards.json"


def load_riftcodex_page(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    idx = content.find("{")
    if idx == -1:
        raise ValueError(f"{path}: no JSON object found (expected a raw browser-paste page)")
    return json.loads(content[idx:])


def best_item(items):
    """Same tie-break as the master-inventory dedup: prefer a populated
    tcgplayer_id, then longer text."""
    def score(i):
        tcg = i.get("tcgplayer_id") is not None
        text_len = len((i.get("text") or {}).get("plain") or "")
        return (tcg, text_len)
    return sorted(items, key=score, reverse=True)[0]


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/apply_vendetta_images.py path/to/page1.txt [page2.txt ...]")
        sys.exit(1)

    all_items = []
    for path in sys.argv[1:]:
        page = load_riftcodex_page(path)
        items = page.get("items", [])
        all_items.extend(items)
        print(f"{path}: {len(items)} items (page {page.get('page')}/{page.get('pages')}, total {page.get('total')})")

    by_id = {}
    for item in all_items:
        rid = item["riftbound_id"].lower()
        by_id.setdefault(rid, []).append(item)
        # Riftcodex's sp-card ids carry a "-NNN" checklist-total suffix
        # (e.g. "ven-sp1-006") that the master-inventory Card Code convention
        # dropped (cards.json id is "ven-sp1") -- also register the
        # truncated form so both styles resolve to the same item.
        m = re.match(r'(ven-sp\d+)-\d+$', rid)
        if m:
            by_id.setdefault(m.group(1), []).append(item)

    with open(CARDS_PATH, encoding="utf-8") as f:
        cards = json.load(f)

    updated, already_set, unmatched, no_url_in_pull = [], [], [], []
    for card in cards:
        if card.get("setId") != "VEN":
            continue
        if card.get("imageUrl"):
            already_set.append(card["id"])
            continue
        candidates = by_id.get(card["id"].lower())
        if not candidates:
            unmatched.append(card["id"])
            continue
        item = best_item(candidates)
        url = (item.get("media") or {}).get("image_url")
        if not url:
            no_url_in_pull.append(card["id"])
            continue
        card["imageUrl"] = url
        updated.append(card["id"])

    with open(CARDS_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print()
    print(f"Updated imageUrl on {len(updated)} Vendetta cards.")
    print(f"Already had imageUrl (skipped): {len(already_set)}")
    if no_url_in_pull:
        print(f"Found in pull but Riftcodex has no image_url yet ({len(no_url_in_pull)}): {', '.join(no_url_in_pull)}")
    if unmatched:
        print(f"Not in this pull at all -- Riftcodex hasn't revealed these slots yet ({len(unmatched)}):")
        print(f"  {', '.join(unmatched)}")


if __name__ == "__main__":
    main()
