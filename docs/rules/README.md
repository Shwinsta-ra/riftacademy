# docs/rules/ — Riftbound rules sources

| File | Role |
|---|---|
| `core-rules-RUP4.txt` | **Authoritative in-repo source for CR citations.** Plaintext extraction of the Core Rules PDF, RUP4, last updated 2026-07-16. |
| `tournament-rules-RUP4.txt` | **Authoritative in-repo source for TR citations.** Plaintext extraction of the Tournament Rules PDF, RUP4. |
| `core-rules-RUP4.normalized.txt`<br>`tournament-rules-RUP4.normalized.txt` | **Search these.** Ligature-expanded copies — see below. Generated, never hand-edited. |
| `ligature-words.md` | Every word that an ASCII search of the originals gets wrong, and how. Generated. |
| `RiftAcademy_Rules_Questions_Register.md` | Open rules questions and their adjudications. |

## Search the normalized copies, cite the originals

```bash
grep -n "battlefield" docs/rules/core-rules-RUP4.normalized.txt
```

**Line numbers are identical between a source file and its normalized copy**, by construction — every substitution happens within a line, and the generator asserts the line count is unchanged. A hit found at line 1932 of the normalized copy is the same rule at line 1932 of the original. The normalized files are a search index, not a fork: the originals stay the citable source of truth.

Regenerate after any rules update:

```bash
python3 scripts/normalize_rules_text.py
```

The generator refuses to run if NFKC would change any character beyond the three it expects (`ﬁ`, `ﬂ`, `…`), so a future rules revision introducing a new compatibility character fails loudly instead of being silently rewritten.

## Where the PDFs went

`Riftbound_Core_Rules_RUP4.pdf` (43 MB) and `Riftbound_Tournament_Rules_RUP4.pdf` (17 MB) were removed from HEAD on 2026-08-07. Together they were 60 MB of the repo's 62 MB of tracked content, which pushed the daily `git archive` upload zip to 36 MB — past the 30 MB attachment limit, and so past the one thing that zip exists to do.

They remain available two ways:

- **Google Drive** — the authoritative copies. Consult these for layout, tables, and diagrams that plaintext cannot carry.
- **Git history** — still recoverable, because this removal did not rewrite history:

```bash
git show 6322fcd:docs/rules/Riftbound_Core_Rules_RUP4.pdf > Riftbound_Core_Rules_RUP4.pdf
```

```bash
git show 6322fcd:docs/rules/Riftbound_Tournament_Rules_RUP4.pdf > Riftbound_Tournament_Rules_RUP4.pdf
```

The 60 MB stays in `.git` either way — removing from HEAD fixes the zip, not the clone size, and that was the deliberate trade. Git LFS and history rewriting were both explicitly rejected: neither recovers the bytes, and rewriting SHAs would break branch topology for no benefit.

`docs/rules/*.pdf` is now gitignored so a re-downloaded copy cannot silently re-enter HEAD and undo this.

## Fidelity of the .txt extractions

Verified against the PDFs on 2026-08-07, while both were still in HEAD.

| Check | Core Rules | Tournament Rules |
|---|---|---|
| Distinct numbered rules, PDF | 2330 | 864 |
| Distinct numbered rules, `.txt` | **2330** | **864** |
| Rules present in PDF, absent from `.txt` | **0** | **0** |
| CR/TR citations used in `docs/design/riftcore-v2/` | 125 | 24 |
| Citations that resolve | **125** | **24** |

Every difference found between the two ran in the `.txt`'s favour: it carries full table rows (`1v1 1 opponent each No teams`) and trailing cross-references (`See rule 428. Kill for more information.`) that PDF text extraction truncates at the line wrap. **The `.txt` files are a superset of the PDF text, not a lossy copy.**

### Two caveats when reading these files

**1. Ligature glyphs.** The extraction preserves `ﬁ` and `ﬂ` as single characters:

| File | `ﬁ` | `ﬂ` | Ligatures | Lines affected |
|---|---|---|---|---|
| `core-rules-RUP4.txt` | 717 | 61 | **778** | 526 |
| `tournament-rules-RUP4.txt` | 176 | 14 | **190** | 147 |

Plain `battlefield` matches **zero** lines; `battleﬁeld` matches 138. The Core Rules additionally contain 12 `…` ellipsis characters, which NFKC also expands, for 790 normalizable characters in total. Use the `.normalized.txt` copies rather than working around this by hand.

**The corpus mixes both encodings, and that is the dangerous part.** 13 words appear *both* as a ligature and as plain ASCII, so an ASCII search of the originals returns some of the matching rules and silently drops the rest — a partial result that looks complete. The FEPR vocabulary is the worst case:

| Word | Hidden from an ASCII search | Total |
|---|---|---|
| `finalization` | 11 | 12 |
| `finalized` | 24 | 44 |
| `finalize` | 8 | 33 |
| `first` | 119 | 138 |
| `flow` | 3 | 13 |

A zero result invites suspicion; 20 hits for `finalized` does not. `ligature-words.md` has the full table.

**2. Fourteen Core rules have their body on a following line.** A page break split the number from its text, so `grep "^727\."` returns the number alone. In the worst case (`347.1.b`) the body is fragmented one word per line. The text is present in every case — read the surrounding lines rather than concluding the rule is empty. Affected: `177`, `193`, `197`, `201`, `347.1.b`, `727`, `729`, `735`, `740.2`, `741`, `750`, `756`, `759`, `764`. Two of these are cited in `riftcore-v2` (`CR 197`, `CR 741`); both are section headers and read correctly in context. The Tournament Rules `.txt` has no such splits.
