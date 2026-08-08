## Thread/topic: drop-rules-pdfs-from-head

**Sections likely affected:** 5 (new thread creation flow), 6 (standing rules), 9 (log)

**Customer-facing:**
Nothing user-visible. Repo hygiene only.

**Team-facing:**
The two RUP4 rules PDFs (`Riftbound_Core_Rules_RUP4.pdf` 43 MB, `Riftbound_Tournament_Rules_RUP4.pdf` 17 MB) were removed from HEAD. Added in `6322fcd` on 2026-08-05, they were 60 MB of the repo's 62 MB of tracked content and had silently broken the Section 5 morning routine: `git archive` of HEAD produced a **36 MB** zip, past claude.ai's ~30 MB attachment limit, so the daily upload zip could no longer be attached to a thread. Post-removal the zip is **1.1 MB**.

Git LFS and history rewriting were both considered and rejected: the 60 MB stays in `.git` under either option, and rewriting SHAs would break branch topology for no benefit. Removing from HEAD is sufficient precisely because `git archive` operates on the tree at HEAD, not on history. `docs/rules/*.pdf` is now gitignored so a re-downloaded copy can't silently undo this.

**The `.txt` extractions were verified faithful before the PDFs were removed**, since Core's v2 rebuild resolves its CR citations against them. Method: `pdfplumber` text extraction of both PDFs, parsed into `{rule number → body}` maps, compared against the same parse of the `.txt`; separately, every `CR`/`TR` citation appearing in `docs/design/riftcore-v2/*.md` was checked for resolution. Result:

- Core Rules: **2330 distinct numbered rules in the PDF, 2330 in the `.txt`.** Zero missing, zero extra. Tournament Rules: 864 and 864.
- **All 149 distinct citations used in `riftcore-v2` resolve** — 125 CR, 24 TR, zero unresolved.
- Every genuine difference ran in the `.txt`'s favour. It carries full table rows (`1v1 1 opponent each No teams` where the PDF yields only `1v1`) and trailing cross-references (`See rule 428. Kill for more information.`) that PDF extraction truncates at the line wrap. **The `.txt` is a superset of the PDF text.**
- Two apparent gaps were run down and are artifacts of the PDF-side parse, not the `.txt`: TR `128` is the wrapped tail of `See CR / 128. Privacy...` inside `702.10`, and CR `727`/`729`/`735` have their bodies one line below the number.

**New standing rule or convention worth capturing:**
Two caveats now recorded in `docs/rules/README.md`, both of which will bite any thread that greps these files:

1. **The extractions preserve `ﬁ`/`ﬂ` ligatures as single glyphs** — 526 of them in the Core Rules. `grep battlefield` returns **zero** lines; `battleﬁeld` returns 138. Normalize with NFKC before searching. This is live today and independent of the PDF removal.
2. **Fourteen Core rules have their body on a following line** (`177`, `193`, `197`, `201`, `347.1.b`, `727`, `729`, `735`, `740.2`, `741`, `750`, `756`, `759`, `764`), a page-break artifact; `347.1.b` is fragmented one word per line. The text is present in all fourteen. `CR 197` and `CR 741` are cited in `riftcore-v2`; both are section headers and read correctly in context.

**Anything another thread working today should know before touching related code:**
If your thread needs the PDFs — for layout, tables, or diagrams the plaintext can't carry — get them from Google Drive, or from history with `git show 6322fcd:docs/rules/<name>.pdf > <name>.pdf`. Don't re-add them to the repo; that re-breaks the morning zip.

Also: the Section 5 routine no longer needs the temporary "lite zip" workaround used on the morning of 2026-08-07. The standard `git archive` zip is back under the limit and can be attached directly.

**Unrelated cleanup in the same session:** `price_ingest_2026-08-06.sql` was deleted from the repo root. It was spent generated output of `scripts/ingest_tcgcsv.py` (already loaded into Supabase), untracked and correctly matched by the `price_ingest_*.sql` ignore rule added in PR #166 — verified with `git check-ignore -v` and `git log --all -- <path>` returning nothing.
