# Thread/topic: rules-clarification-name-based-identity

**Sections likely affected:** 2 (Shipped features), 3 (feature tracker — RiftCore), 9 (log)

**Customer-facing:**
Nothing user-visible. Rules-engine correctness only — RiftCore now applies name-based rules (the 3-copies limit, Chosen Champion status, Unique) to a card's *name* rather than its printing, so a reprint of a card counts as the same card.

**Team-facing:**

First PR in a new class: **"Rules Clarification"** — corrections to the RiftCore rules model where the shipped code encodes the wrong rule. See the naming note below.

`nameIs` compared `GameObject.cardId` against the predicate's name. `cardId` is not a safe proxy for a card name: our ids are set-prefixed (`ogn-177-298`, `ogs-019-024`) and Standard lists OGS separately from OGN, so two printings of one card have different ids. TR 601.2.a exists precisely for this — a card is legal if it is from a legal set *or shares a name with* one.

Four CR rules are keyed on name and were all wrong under id comparison: the 3-per-name copy limit (103.2.b), name-based Chosen Champion status (103.2.a.3), `Unique` (825), and naming a card (760–763).

Changes, all in `src/lib/core/**`:

| Change | File |
|---|---|
| `GameObject` gains `name: string` — full `"Name, Subtitle"` form (CR 132.4), mirrored from the catalog at instantiation like `printedKeywords` / `domains` / `printedMight` | `schema.ts` |
| `PlayerState.chosenChampionCardId: CardId` → `chosenChampionName: string` | `schema.ts` |
| `nameIs` evaluates against `GameObject.name`, not `cardId` | `predicates.ts` |
| New `isChosenChampion(state, objectId, player)` — CR 103.2.a.3, name match + `champion` supertype, any zone | `predicates.ts` |
| `create()` takes an optional `name` (defaults `""` for anonymous tokens) | `actions.ts` |
| Chosen-Champion-in-main-deck check is now name-matched, not `mainDeck.includes(chosenChampionCardId)` | `format.ts` |
| Copy-limit + `Unique` folded into one name-keyed pass carrying `{count, isUnique}` | `format.ts` |

The kernel still imports no catalog — `name` is mirrored onto the object by the caller, same pattern as printed keywords. `cardName(cardId)` in `cards.ts` is the mirroring source.

**Scope note — what was already correct.** The handoff listed "validateDeck copy-limit and Unique must group by name, not id" as work to do. It was **already name-keyed** before this PR (`format.ts` built a `byName` map through the `facts` callback, in the PR #148 merge commit `e9b5e1a`). Verified by reading the pre-change file, and by the fact that the two new reprint copy-limit/Unique tests pass against the *old* code. Those two tests are regression guards, not bug fixes. What genuinely changed in `format.ts` is the Chosen-Champion in-deck check, which was id-based.

**Verification.** `tsc --noEmit` clean; full suite 1197 passed / 17 files. The three new tests that assert genuinely new behavior were confirmed non-vacuous by temporarily restoring the old `nameIs` and old champion check and re-running — they failed, and only they failed:
- `nameIs matches BOTH printings of a reprint`
- `nameIs does NOT match a cardId`
- `a REPRINT of the Chosen Champion satisfies the in-deck requirement`

**Data check — the reprint case is NOT live yet.** The handoff said "this is likely live in our data, not hypothetical." It is not, as of today: `src/data/cards.json` holds 928 cards with 928 distinct names across OGN/OGS/SFD/UNL/VEN — **zero** same-name/different-id pairs. The fix stands on its own (the rule was wrong regardless, and reprints are a matter of time given TR 601.2.a), but no currently-shipping deck is mis-validated by the old code. Nobody should cite this PR as fixing a live data bug.

**New standing rule or convention worth capturing:**

**Rules corrections are named "Rules Clarification", never the acronym "CR".** In this repo `CR` always means *Comprehensive Rules* ("CR 471"), and there are hundreds of such citations in `src/lib/core/**` and `docs/design/riftcore-v2/**`. Reusing `CR` for "change request" would make those citations ambiguous to both search and readers.

**Branch-prefix exception (worth folding into CLAUDE.md).** The handoff specified branch `rules-clarification/name-based-identity`. That prefix **cannot work**: `.github/workflows/enforce-branch-flow.yml:17` allows only `^(feature/.*|fix/.*|hotfix/.*)$` into `integration`, and `ci.yml:7` only runs `typecheck` on those three prefixes — so the branch would have failed `check-source-branch` *and* never run typecheck. Shipped as `fix/rules-clarification-name-based-identity` instead, keeping the PR *title* as specified. **Any future "Rules Clarification" PR must use a `fix/rules-clarification-*` branch and carry the class in the title, not the branch prefix** — unless someone deliberately adds the prefix to both workflow files.

**Anything another thread working today should know before touching related code:**

Two breaking changes to core types, so any in-flight branch constructing these will fail typecheck:
- Every `GameObject` literal now needs `name: string`. Test fixtures get it free — `makeObject` in `src/lib/core/__tests__/fixtures.ts` defaults to `"Test Card, Fixture"`.
- `PlayerState.chosenChampionCardId` is **gone**, replaced by `chosenChampionName: string`. `emptyPlayerState` defaults to `"Test Champion, Fixture"`.

If you are building a `GameObject` from a real card, set `name: cardName(cardId)` (exported from `src/lib/core/index.ts`). Do not import `cards.ts` into the kernel itself.
