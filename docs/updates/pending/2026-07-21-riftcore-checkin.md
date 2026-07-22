## Thread/topic: riftcore-checkin

**Sections likely affected:** 2 (Shipped features), 3 (tracker), 9 (log)

**Team-facing:**
RiftCore's two zero-impact artifacts from tonight's control summary — `src/data/model/riftcore-function-decisions.json` (52 locked cards in the normalized ability model) and the data-model spec doc (`docs/design/RiftCore_Data_Model.md`) — were already checked in and merged to `integration` earlier today via PR #80, ahead of this EOD pass. Verified independently tonight: nothing in `src/` imports `src/data/model/`, `cards.json` is untouched, and `compile_abilities.py` isn't wired into `package.json` or any CI workflow — the zero-impact guarantee holds.

Also applied tonight: the two ruled corrections from the corrected Master Inventory decisions CSV (Hidden Blade `ogn-213-298` — the killed unit's controller draws 2, a downside for the caster, not a bonus; Bellows Breath `sfd-080-221` — up to three units at a location, chooser picks, not all units). Both were checked against the currently-committed data and were **already correct** — the same-day compiler/artifact work had already encoded Ashwin's ruling correctly in both `docs/design/RiftCore_Data_Model.md` and the structured JSON (`riftcore-function-decisions.json` / `abilities.json`). No fix was needed; verified only.

**Database direction, decided:** Postgres via Supabase. Reasoning: the card -> abilities -> steps shape is textbook relational, constraints catch the "arrays drift silently" failure mode that motivated this whole data-model pass, and JSONB gives an escape hatch for weird future mechanics without a schema migration. Sequencing: normalized JSON artifacts in-repo now, Supabase load after July 31 — same schema both phases, so it's a data load then, not a redesign.

**Ability-encoding decision:** one row per ability-stage, derived by a compiler (not hand-typed, not parallel arrays). This resolves the earlier "too much manual labor" objection to normalization — a human only confirms a review queue, and that review step goes away after July 31.

**Schema-reconciliation status (this EOD's Step 2 verification):** confirmed **merged to `integration`**. `WinningLine`/`PointSource` are the live canonical types in `src/lib/core/schema.ts`, and `canScoreWinningPoint` in `src/lib/core/rulesKernel.ts` is built on them — not the older 3-value reconstruction. **Not blocking** RiftIQ's closing-the-game puzzles.

**Anything another thread working today should know before touching related code:**
The compiler (`scripts/compile_abilities.py`) and the `abilities.json`/`abilities.review.json` artifacts are already built and merged to `integration` as of tonight — this happened same-day, ahead of (and in tension with) this EOD instruction's explicit "do not build the compiler tonight, that starts tomorrow" guidance. Flagging this discrepancy rather than acting on it further; nothing further was built or changed here as a result, but worth Ashwin's awareness that the compiler landed a day earlier than the control summary's own plan called for.
