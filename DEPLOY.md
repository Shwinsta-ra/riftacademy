# RiftAcademy + Feedback — v11 (ship candidate)

```bash
cd ~/Downloads/riftacademy-feedback-v11
npm install
npm run deploy      # prompts for the project — pick the EXISTING riftacademy
```

## ⚠️ Re-import the tag sheet

`RA_Feedback_Tags_v10.xlsx` has a new row: **GLOBAL / other / Other / other**.

Your workbook tab doesn't have it. If you export that tab to CSV and run the
importer before adding the row, **the Other chip disappears** — and it's now the
only path for anything the tag list doesn't cover, because the free-text "what
kind" box is gone. Replace the tab with this file.

---

## v11

**Chips no longer resize when selected.** Two things were adding width on tap: the
"✓ " prefix, and the jump from 400- to 600-weight text. Both gone — fill colour
alone carries the state, and the chip row no longer reflows under your finger.

**Magenta = required.** `REQUIRED = "#EA6FD0"`, exported from `src/lib/theme.ts`
with the convention written down beside it. Deliberately not any colour already
carrying meaning — not blurple (call to action), not Fury red (broken), not a
domain colour, not body text. Import it from there for every future required field
so it stays a single source of truth rather than a hex string copied around.

**"Other" replaces the free-text box.** Order yellow (`#EBB113`), GLOBAL, so it's
on every screen. Anything the list doesn't cover gets tagged Other and the detail
goes in "What happened?" — which was already required.

This is a better shape than the text box it replaces: the report arrives *tagged*,
so it sorts and filters in Discord like everything else, instead of being a
special untagged case the code had to carry a separate path for. And a run of
Other reports on one screen is a legible signal that the tag sheet needs a new row.

Verified in the compiled bundle before packaging.
