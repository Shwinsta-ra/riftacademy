#!/usr/bin/env python3
"""Verify the structural invariants of docs/contracts/printing_code_fixtures.json.

Spec: docs/contracts/RiftCore_PrintingCode_Spec_v3.md, §8.1 (counts), §8.2 (keys),
§8.3 (harness obligations).

Why this exists. v3 §8.1 records two counts that a reader is meant to trust — 20
executable data fixtures and 21 harness assertions today. v2.2 §5.5 published the
same figures derived by arithmetic that was wrong and happened to land on the right
answer. A count recorded as prose beside the data it describes is a claim, not a
count; this recomputes every figure from the fixtures array and fails if the block
disagrees.

What this deliberately does NOT do: implement the translator. v3 §1 rules that a
single canonical implementation is impossible (Python for M9 ingest, TypeScript for
app/kernel), and a reference implementation living next to the fixtures would quietly
become one. Round-trip conformance (fixture 19) belongs in each implementation's own
harness, loading this same file.

Usage:  python3 scripts/verify_printing_code_fixtures.py
Exit 0 on success, 1 on any failure. Prints every check either way.
"""

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURES = REPO / "docs/contracts/printing_code_fixtures.json"
SPEC = REPO / "docs/contracts/RiftCore_PrintingCode_Spec_v3.md"

failures = []
checks = 0


def check(label, condition, detail=""):
    global checks
    checks += 1
    if condition:
        print(f"  ok    {label}")
    else:
        print(f"  FAIL  {label}{('  — ' + detail) if detail else ''}")
        failures.append(label)


def display_key(f):
    """v3 §8.2: presentation only, never a key."""
    return f"{f['id']}{f.get('part', '')}"


def main():
    doc = json.loads(FIXTURES.read_text())
    fixtures = doc["fixtures"]
    counts = doc["counts"]

    print(f"{FIXTURES.relative_to(REPO)}  (version {doc['version']})\n")

    print("keys — v3 §8.2")
    composite = [(f["id"], f.get("part")) for f in fixtures]
    dupes = {k for k in composite if composite.count(k) > 1}
    check("(id, part) is unique", not dupes, f"duplicates: {sorted(dupes)}")
    check("every id is an int", all(isinstance(f["id"], int) for f in fixtures))
    parts = sorted(k for k in composite if k[1] is not None)
    check('"part" is present only on the two halves of 17',
          parts == [(17, "a"), (17, "b")], f"found {parts}")
    displays = [display_key(f) for f in fixtures]
    check("display keys are unique", len(set(displays)) == len(displays))
    check('display key derives as str(id) + part — "5", "17a", "17b"',
          "5" in displays and "17a" in displays and "17b" in displays)

    print("\ncounts — v3 §8.1, recomputed from the fixtures array")
    meta = [f for f in fixtures if f.get("kind") == "assertion"]
    data = [f for f in fixtures if f.get("kind") != "assertion"]
    withdrawn = [f for f in data if f.get("withdrawn")]
    deferred = [f for f in data if f.get("deferred")]
    executable = [f for f in data if not f.get("withdrawn")]
    executable_today = [f for f in executable if not f.get("deferred")]
    harness_today = len(executable_today) + len(meta)

    for label, actual in [
        ("entries", len(fixtures)),
        ("meta_assertions", len(meta)),
        ("data_fixtures", len(data)),
        ("withdrawn", len(withdrawn)),
        ("deferred", len(deferred)),
        ("executable", len(executable)),
        ("executable_today", len(executable_today)),
        ("harness_assertions_today", harness_today),
    ]:
        check(f"{label} = {actual}", counts.get(label) == actual,
              f"block says {counts.get(label)}")

    check("derivation identity: entries - meta - withdrawn - deferred == executable_today",
          len(fixtures) - len(meta) - len(withdrawn) - len(deferred) == len(executable_today))
    # Deliberately hardcoded against v3 §8.1's prose rather than derived: every
    # other check here recomputes from the array, so nothing else would notice
    # the spec's stated figures drifting away from the file's. Bump both numbers
    # here and in §8.1 in the same commit that adds or retires a fixture.
    # 25/26 as of 2026-08-16 (§3b added fixtures 23-28); was 20/21 before that.
    check("both counts match v3 §8.1's prose (25 executable, 26 harness assertions)",
          counts["executable_today"] == 25 and counts["harness_assertions_today"] == 26)
    check("the meta-assertion is excluded from the fixture count but NOT from execution",
          counts["data_fixtures"] == counts["entries"] - counts["meta_assertions"]
          and harness_today > len(executable_today))

    print("\nharness obligations — v3 §8.3")
    check("every withdrawn fixture carries a reason",
          all(f.get("reason") for f in withdrawn))
    check("every deferred fixture carries blocked_on",
          all(f.get("blocked_on") for f in deferred))
    check("the meta-assertion has no external value to parse",
          all("external" not in f for f in meta))
    check("the meta-assertion carries its assertion text and exceptions",
          all(f.get("assertion") and f.get("exceptions") for f in meta))
    for rule in ("withdrawn", "deferred", "display key", "both counts"):
        check(f'harness_rules mentions "{rule}"',
              any(rule in r for r in doc["harness_rules"]))

    print("\nprovenance — v3 §13")
    check("source points at v3", doc["source"].startswith("docs/contracts/RiftCore_PrintingCode_Spec_v3.md"))
    check("the spec it points at exists", SPEC.exists())
    check("no live pointer to a superseded document",
          "amended_by" not in doc and not any(
              "v2_CONSOLIDATED" in r or "v2_1_Amendment" in r or "v2_2_Amendment" in r
              for r in doc["harness_rules"]))
    for name in ("v2_CONSOLIDATED", "v2_1_Amendment", "v2_2_Amendment"):
        p = REPO / f"docs/contracts/RiftCore_PrintingCode_Spec_{name}.md"
        check(f"{name} is deleted", not p.exists())

    print()
    if failures:
        print(f"{len(failures)} of {checks} checks FAILED: {failures}")
        return 1
    print(f"all {checks} checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
