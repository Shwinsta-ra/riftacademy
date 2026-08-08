#!/usr/bin/env python3
"""Generate searchable copies of the rules text with Unicode ligatures expanded.

The .txt extractions in docs/rules/ preserve the typographic ligatures the PDF
used for display -- "fi" set as the single character U+FB01, "fl" as U+FB02.
They read identically but do not match ASCII. `grep battlefield` returns zero
lines against the Core Rules; `grep battle<U+FB01>eld` returns 138.

This writes a NFKC-normalized sibling for each source file. NFKC expands
compatibility characters (ligatures, the ellipsis U+2026) to their ordinary
ASCII sequences while leaving curly quotes, apostrophes and dashes untouched,
so the normalized copy differs from its source only where a search would
otherwise silently fail.

The normalized copies are a SEARCH INDEX, not a fork of the source. Line
numbers are identical by construction -- every substitution is within a line --
so a hit found in a normalized copy cites the same rule at the same line in the
original. The originals remain the citable source of truth.

Regenerate after any rules update:

    python3 scripts/normalize_rules_text.py

Verifies as it goes and exits non-zero if any invariant breaks.
"""
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

RULES_DIR = Path(__file__).resolve().parent.parent / "docs" / "rules"
SOURCES = ["core-rules-RUP4.txt", "tournament-rules-RUP4.txt"]
WORDLIST = RULES_DIR / "ligature-words.md"

# Characters we expect NFKC to touch in this corpus. Anything else showing up
# is a change we have not reasoned about, and the script stops rather than
# silently rewriting it.
EXPECTED = {"ﬁ": "fi", "ﬂ": "fl", "…": "..."}


def normalizable(text):
    return Counter(c for c in text if unicodedata.normalize("NFKC", c) != c)


def main():
    failures = []
    per_file = {}
    all_words = {}

    for name in SOURCES:
        src = RULES_DIR / name
        if not src.exists():
            failures.append(f"missing source: {src}")
            continue

        original = src.read_text(encoding="utf-8")
        counts = normalizable(original)

        unexpected = set(counts) - set(EXPECTED)
        if unexpected:
            failures.append(
                f"{name}: unexpected normalizable characters "
                f"{[(hex(ord(c)), unicodedata.name(c, '?')) for c in unexpected]}"
            )
            continue

        normalized = unicodedata.normalize("NFKC", original)

        # Invariant 1: line count unchanged, so line-number citations hold.
        if len(original.splitlines()) != len(normalized.splitlines()):
            failures.append(f"{name}: line count changed under NFKC")
            continue

        # Invariant 2: every line differs only where an expected character was.
        for i, (a, b) in enumerate(zip(original.splitlines(),
                                       normalized.splitlines()), 1):
            expect = a
            for ch, repl in EXPECTED.items():
                expect = expect.replace(ch, repl)
            if expect != b:
                failures.append(f"{name}: line {i} changed unexpectedly")
                break

        # Invariant 3: nothing normalizable survives.
        if normalizable(normalized):
            failures.append(f"{name}: normalizable characters remain after NFKC")

        out = RULES_DIR / name.replace(".txt", ".normalized.txt")
        out.write_text(normalized, encoding="utf-8")

        # Distinct words that carried a ligature, for downstream exposure review.
        words = {}
        for w in re.findall(r"[\w’ﬁﬂ-]+", original):
            if any(c in EXPECTED for c in w):
                words.setdefault(unicodedata.normalize("NFKC", w).lower(),
                                 Counter())[w] += 1
        for k, v in words.items():
            all_words.setdefault(k, Counter()).update(v)

        per_file[name] = dict(
            counts=counts,
            lines=sum(1 for line in original.splitlines()
                      if any(c in EXPECTED for c in line)),
            out=out.name,
            words=len(words),
        )
        print(f"{name}")
        for ch, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f"    {unicodedata.name(ch, '?'):<40} U+{ord(ch):04X}  {n}")
        print(f"    -> {out.name}  ({per_file[name]['lines']} lines affected, "
              f"{len(words)} distinct words)")

    if failures:
        print("\nFAILED:", file=sys.stderr)
        for f in failures:
            print("  " + f, file=sys.stderr)
        return 1

    # Only fi/fl matter for the word list; the ellipsis is not part of a word.
    lig_words = {k: v for k, v in all_words.items()
                 if any(c in ("ﬁ", "ﬂ") for w in v for c in w)}

    # Does the same word ALSO occur spelled with plain ASCII somewhere in the
    # corpus? If so an ASCII search returns a partial result that looks whole --
    # a more dangerous failure than returning nothing.
    corpus = "\n".join((RULES_DIR / n).read_text(encoding="utf-8") for n in SOURCES)
    mixed = {}
    for word in lig_words:
        # Word boundaries matter: a bare substring search counts "final" inside
        # "Finalized" and overstates how often the word is spelled in ASCII.
        # \b is wrong here because the corpus uses U+2019 inside words
        # ("battlefield’s"), so the boundary is spelled out explicitly.
        pattern = r"(?<![\w’])" + re.escape(word) + r"(?![\w’])"
        ascii_hits = len(re.findall(pattern, corpus, re.I))
        if ascii_hits:
            mixed[word] = ascii_hits

    lines = [
        "# Ligature-bearing words in the rules text",
        "",
        "Generated by `scripts/normalize_rules_text.py` -- do not edit by hand.",
        "",
        "Every distinct word in `docs/rules/*.txt` that contains a `fi` or `fl`",
        "ligature, and is therefore invisible to an ASCII search of the original",
        "files. Search `*.normalized.txt` instead, or normalize your query.",
        "",
        f"**{len(lig_words)} distinct words.**",
        "",
        "## Read this before trusting a past search",
        "",
        f"**{len(mixed)} of these words also appear spelled with plain ASCII "
        "elsewhere in the corpus.** For those, an ASCII search did not return "
        "nothing -- it returned *some* rules and silently omitted the rest. A "
        "zero result invites suspicion; a partial result does not. Any earlier "
        "conclusion drawn from searching one of these terms should be re-run "
        "against the normalized copy.",
        "",
        "| Word | As ligature | As plain ASCII | Search failure mode |",
        "|---|---|---|---|",
    ]
    for word in sorted(lig_words):
        lig_n = sum(lig_words[word].values())
        asc_n = mixed.get(word, 0)
        mode = (f"**partial -- {lig_n} of {lig_n + asc_n} hidden**"
                if asc_n else "silent zero")
        lines.append(f"| `{word}` | {lig_n} | {asc_n} | {mode} |")
    WORDLIST.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n{WORDLIST.name}: {len(lig_words)} distinct ligature-bearing words")
    return 0


if __name__ == "__main__":
    sys.exit(main())
