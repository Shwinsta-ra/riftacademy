# docs/rules/ — Riftbound rules sources

| File | Role |
|---|---|
| `core-rules-RUP4.txt` | **Authoritative in-repo source for CR citations.** Plaintext extraction of the Core Rules PDF, RUP4, last updated 2026-07-16. |
| `tournament-rules-RUP4.txt` | **Authoritative in-repo source for TR citations.** Plaintext extraction of the Tournament Rules PDF, RUP4. |
| `RiftAcademy_Rules_Questions_Register.md` | Open rules questions and their adjudications. |

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

**1. Ligature glyphs.** The extraction preserves `ﬁ` and `ﬂ` as single characters — 526 occurrences in the Core Rules. Plain `battlefield` matches **zero** lines; `battleﬁeld` matches 138. Normalize before searching:

```bash
python3 -c "import unicodedata,sys; print(unicodedata.normalize('NFKC', open(sys.argv[1]).read()))" docs/rules/core-rules-RUP4.txt | grep -in battlefield
```

**2. Fourteen Core rules have their body on a following line.** A page break split the number from its text, so `grep "^727\."` returns the number alone. In the worst case (`347.1.b`) the body is fragmented one word per line. The text is present in every case — read the surrounding lines rather than concluding the rule is empty. Affected: `177`, `193`, `197`, `201`, `347.1.b`, `727`, `729`, `735`, `740.2`, `741`, `750`, `756`, `759`, `764`. Two of these are cited in `riftcore-v2` (`CR 197`, `CR 741`); both are section headers and read correctly in context. The Tournament Rules `.txt` has no such splits.
