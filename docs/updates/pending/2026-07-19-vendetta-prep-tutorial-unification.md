## Thread/topic: vendetta-prep-tutorial-unification

**Sections likely affected:** 0, 3, 10

**Customer-facing:** (omit — no new user-visible change, just an internal tracking clarification)

**Team-facing:**
Confirmed with Ashwin (July 19, RiftRecall thread): "Vendetta Prep highlight + guided tour" and the onboarding tutorial (#46) are **the same feature**, not two separate pieces of work. The master doc currently lists these as distinct/unresolved in three places:
- Section 0 (quick fixes / big features list)
- Section 3 (feature tracker table row: "Vendetta Prep highlight + guided tour" — status "Not started... confirm scope isn't already covered")
- Section 10 (open question #6: "whether the onboarding tutorial (#46) already covers the Vendetta Prep guided tour scope")

All three should be resolved at reconciliation: delete the separate "Vendetta Prep" tracker row (it's covered by #46's row), and remove open question #6 entirely.

**Suggested Section 0 change:**
Remove "Vendetta Prep highlight + guided tour" as a distinct big-feature item — it's the onboarding tutorial (#46), already shipped and currently in a UI-polish pass.

**Suggested Section 3 (feature tracker) row update:**
Delete the separate "Vendetta Prep highlight + guided tour" row. The onboarding tutorial's existing row is the single source of truth for this feature going forward.

**New standing rule or convention worth capturing:**
See the separate fragment for tonight's UI-polish session — a new project-wide content rule (no em dashes) is coming out of that session and should also get folded in at reconciliation.

**Anything another thread working today should know before touching related code:**
If any other thread independently started work on a "Vendetta Prep" fast-path feature, stop — it's already built, as the onboarding tutorial. Don't duplicate it.
