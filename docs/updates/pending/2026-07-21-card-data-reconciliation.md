## Thread/topic: card-data-reconciliation

**Sections likely affected:** 2 (Shipped features), 3 (tracker), 9 (log)

**Customer-facing:**
Card data refresh: domain/function/subtype corrections across ~90 cards, all Battlefield/Token cards now show "Colorless" instead of "None" for domain, and Legend cards no longer generate "what champion is this?" name questions in RiftRecall (ability and speed questions for them are unaffected). Vendetta card text is now clean (no more raw `:rb_energy_5:`-style placeholders or `&gt;` escapes) and 166/166 Vendetta base cards are in the app.

**Team-facing:**
Source CSVs for the merge_sheet.py / apply_master_sheet.py pipeline now live at `~/Downloads/Master Card Inventory.csv` and `~/Downloads/RA_Card Questions Control Sheet.csv` (not in the repo — matches the existing `~/Downloads/RA_Feedback_Tags.csv` convention from apply_feedback_tags.py). Applied all 90 rows from a separate `Master_Inventory_Decisions_For_Code.csv` decision sheet to the inventory before running the pipeline (Domain(s)/Function/Subtype/Ability Target corrections, plus a blanket Battlefield/Token Domain(s) None->Colorless rule). Skipped nothing except rows referencing the not-yet-built "Ability Value" column (none were present in this batch).

Did a separate Vendetta-only text cleanup pass on the corrected inventory CSV: converted `:rb_energy_N:`/`:rb_rune_X:`/`:rb_might:`/`:rb_exhaust:` API placeholders to the app's established plain-text/bracket convention, unescaped `&gt;`, and folded floating costs back inside their bracket (`[Empower] (5)` -> `[Empower (5)]`) — restricted to the `Action`/`Reaction`/`Add`/`Empower` tags specifically, since a broader match was initially corrupting reminder-text parentheses (e.g. `[Vision] (When you play me...)`) by folding prose into the bracket. Auto-filled Speed and Keywords for blank Vendetta rows using patterns validated against the whole non-Vendetta corpus (100%/99.86% match rate). Left Ability Target/Function mostly blank — see `docs/handoffs/` or ask for the full 96-row review list; only 1 row (VEN-059) had a clean enough analog to fill confidently. Most of the blank rows are the new `Empower` mechanic, which has no existing tagged analog anywhere in the inventory.

`eligibleModes()` in `src/lib/attributeQuiz.ts` now excludes `"name"` for `card.type === "Legend"`, hard-excluded the same way `"trigger"` is (a per-card override entry can't reinstate it — this is a card-type-wide product decision).

**Anything another thread working today should know:**
`src/data/cards.json` is now 918 cards (928 in the source inventory minus 10 removed by the existing 1v1 ban filter — expected, not a data-loss bug). 166/166 are Vendetta. If your thread also touches the Master Card Inventory CSV today, re-export after this PR merges rather than layering on the pre-decisions version.
