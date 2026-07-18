#!/usr/bin/env python3
"""
One-off cleanup for cards.json:
  1. Hard-delete the 14 Vendetta champion reprints (6 SP + 8 overnumbered).
     Each is an exact "Name, Epithet" duplicate of a champion that already
     exists in an earlier set, is absent from the master inventory, and
     carries degraded data (missing `power`, less complete text) vs the
     original. None are referenced by any deck/override/position/question.
  2. Fix the misspelled UNL card "Mischevious Marai" -> "Mischievous Marai"
     to match the master inventory (ground truth).

Idempotent: safe to re-run. Prints a before/after report and exits non-zero
if anything unexpected is found.
"""
import json
import sys
from pathlib import Path

CARDS_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "cards.json"

# The 14 duplicate champion reprints to remove (by id).
REPRINT_IDS = {
    # Group A - SP cards (collector # 1-6, collide with base numbers)
    "ven-sp1",  # Kaisa, Survivor      -> ogn-039
    "ven-sp2",  # Sona, Harmonious     -> ogn-073
    "ven-sp3",  # Ahri, Inquisitive    -> ogn-119
    "ven-sp4",  # Sett, Brawler        -> ogn-164
    "ven-sp5",  # Ezreal, Prodigy      -> sfd-149
    "ven-sp6",  # Lux, Crownguard      -> ogs-014
    # Group B - overnumbered cards (# 167-184, above the 166 set total)
    "ven-167-166",  # Vi, Destructive         -> ogn-036
    "ven-168-166",  # Jinx, Demolitionist     -> ogn-030
    "ven-175-166",  # Jayce, Man of Progress  -> sfd-084
    "ven-176-166",  # Viktor, Innovator       -> ogn-117
    "ven-179-166",  # Rengar, Trophy Hunter   -> unl-120
    "ven-180-166",  # Khazix, Evolving Hunter -> unl-119
    "ven-183-166",  # Diana, No Longer Human  -> unl-149
    "ven-184-166",  # Leona, Determined       -> ogn-238
    # Group C - VEN domain runes (duplicates of the OGN runes)
    "ven-r01", "ven-r02", "ven-r03", "ven-r04", "ven-r05", "ven-r06",
}

SPELLING_FIXES = {
    # id -> (wrong, correct)
    "unl-003-219": ("Mischevious Marai", "Mischievous Marai"),
}


def main():
    cards = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    before = len(cards)

    # --- 1. delete reprints ---
    present = {c["id"] for c in cards} & REPRINT_IDS
    missing = REPRINT_IDS - present
    kept = [c for c in cards if c["id"] not in REPRINT_IDS]
    removed = before - len(kept)

    # --- 2. spelling fix ---
    fixed = []
    for c in kept:
        fix = SPELLING_FIXES.get(c["id"])
        if fix and c["name"] == fix[0]:
            c["name"] = fix[1]
            fixed.append(c["id"])

    # --- report ---
    ven_after = sum(1 for c in kept if c.get("setId") == "VEN")
    no_art = [c["id"] for c in kept if not c.get("imageUrl")]

    print(f"cards.json: {before} -> {len(kept)} ({removed} removed)")
    print(f"VEN cards after: {ven_after} (expect 141 numbered base)")
    print(f"reprints removed: {sorted(present)}")
    if missing:
        print(f"NOTE: already absent (idempotent re-run?): {sorted(missing)}")
    print(f"spelling fixed: {fixed if fixed else 'none (already correct?)'}")
    print(f"cards without imageUrl (should be the 4 UNL tokens only): {sorted(no_art)}")

    # --- guards ---
    ok = True
    if removed and removed != len(present):
        print("ERROR: removed count != matched ids", file=sys.stderr); ok = False
    if ven_after not in (141, 147, 161):  # 161 only if nothing removed on a stale file
        print(f"ERROR: unexpected VEN count {ven_after}", file=sys.stderr); ok = False
    if len(no_art) != 4:
        print(f"ERROR: expected 4 art-less cards, got {len(no_art)}", file=sys.stderr); ok = False
    if not ok:
        sys.exit(1)

    CARDS_PATH.write_text(
        json.dumps(kept, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("\nWROTE cards.json OK")


if __name__ == "__main__":
    main()
