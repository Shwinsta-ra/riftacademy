## Thread/topic: op-promo-treatment

**Sections likely affected:** 2 (Shipped features), 3 (feature tracker), 9 (log)

**Customer-facing:**
Nothing a player sees yet. This is groundwork so that Organized Play promo cards — the ones where three physically different products share one collector number — can eventually be priced and tracked as the separate cards they are, instead of being silently merged into one.

**Team-facing:**

Implements `RiftCore_Decisions.md` B16, dispatched via `Code/promo-op-codes/`. Three parts, all schema/grammar — **no data was backfilled and none should be.**

1. **Migration `20260816000020_promo_treatment.sql`** — adds `card_printings.promo_treatment` (nullable text, the name parenthetical stored verbatim, e.g. `Metal, Prize Wall`), a non-blank CHECK, and a functional unique index `card_printings_identity_uniq` on `(set_code, collector_number, printing_variant, coalesce(promo_treatment, ''))`.
2. **`RiftCore_PrintingCode_Spec_v3.md` §3b** — the grammar half: a lowercase `treatment` suffix appended to `printing_code`. Additive, **still v3, not a version bump** (B16's explicit instruction). Also touched: §3 grammar/regex, §4 casing rule 6, §8 rows 23–28, §8.1 counts, §11, §12.
3. **Fixtures 23–28** in `printing_code_fixtures.json`, with counts recomputed.

**Three things a thread picking this up cold needs to know:**

**(a) B16's worked example contradicts B16's own reasoning, and this PR did not follow the example.** B16 writes the code as `op-019-024-metal-prizewall`. But the same decision rejects "treat OP as its own set" as "explicitly contradicted by the design requirement that OP is not a set code", and v3 §2, §5, §8.4 and §13 items 4/7 all say the same. Implemented as `ogs-019-024-metal-prizewall` — the **mirrored base set**, since §2 records `OGS-019-024` as Master Yi and live confirms it. Flagged in a ⚠ box in §3b rather than quietly corrected. **This is the one thing in this PR worth a second opinion** (see Decisions below).

**(b) There was no pre-existing uniqueness constraint to "supplement".** B16 and the implementation spec both say "replace or supplement the existing uniqueness constraint on `card_printings`". There isn't one — the table has only its `printing_code` primary key (`20260805000002_cards.sql`), and `printing_code` is a derived string, so nothing has ever stopped two rows describing the same physical printing under two different codes. The new index is therefore **strictly new and strictly stricter**, not a refactor. Verified live before writing that it can build: 1,165 rows, 1,165 distinct triples.

**(c) `coalesce` and the non-blank CHECK are load-bearing together.** `coalesce(promo_treatment, '')` exists because plain SQL NULL-inequality would let unlimited NULL-treatment rows collide on one identity — i.e. enforce nothing exactly where OP rows land. That makes `''` and NULL the same key, so an empty string would silently reopen the hole *while looking populated*; the CHECK rejects blank/whitespace at the boundary. Removing either one alone quietly breaks the other.

**Gotcha for anyone testing migrations locally:** a from-scratch run of `supabase/migrations/*.sql` still fails on 008/009/012 (guards on dump-loaded data, per B12) and 014 (needs Supabase's `auth` schema). Those are pre-existing and unrelated. 020 applies cleanly on top of the DDL migrations, and was tested that way rather than assumed — 7/7 behavioural assertions on the new index, including the three-way Master Yi case, the NULL-collision case, and a regression check that base-vs-signed on one collector number still inserts.

**Suggested Section 3 (feature tracker) row update:**
OP printing treatment discriminator — **schema and grammar complete, mapping not started.** `card_printings` still holds zero OP rows, which is the intended honest-NULL state, not an omission.

**New standing rule or convention worth capturing:**
**Slugification rule for treatments (v3 §3b):** split the verbatim treatment on commas, then within each component lowercase and delete everything that is not `a-z0-9` (spaces included), then join components with `-`. So `Metal, Prize Wall` → `metal-prizewall`, not `metal-prize-wall`. A component may never be all digits (`Top 8` → `top8`), because `TOTAL` is also digits and a numeric component would make `ven-r01-8` unparseable. **The code is derived from the column, never the reverse** — slugging is lossy, so anything needing the printed text reads `promo_treatment`.

**Anything another thread working today should know before touching related code:**

- **Do not populate `promo_treatment`.** The product-to-treatment mapping depends on `tcgplayer_groups`, which is Infrastructure's data. A guessed treatment string is a §7 substitution wearing a schema's clothes, and it lands on the highest-value rows in the catalogue.
- **Routing note, per the implementation spec's "next step after this lands":** the product-to-treatment mapping work now belongs to **Infrastructure** and is unblocked by this migration. It needs, for each of the 32 OP collector numbers, which `tcgplayer_groups` product maps to which verbatim parenthetical. Finance B12/B13 were waiting on exactly this.
- **Fixture counts moved: 20/21 → 25/26.** If your branch also touches `printing_code_fixtures.json`, expect a conflict in the `counts` block, and note that `scripts/verify_printing_code_fixtures.py` carries the same two figures hardcoded on purpose (it is the only check that would notice the spec's prose drifting from the file). Bump both in the same commit.
- **Migration number 020 is claimed** as of this PR. Verified before claiming: no open PRs on the repo, and all five remote branches were at 19.
