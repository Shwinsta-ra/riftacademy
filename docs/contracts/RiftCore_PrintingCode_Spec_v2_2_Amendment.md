# RiftCore: Printing Code Spec — **v2.2 Amendment** (2026-08-06)

**Amends** v2 §3, §4, §8. **Blocking issue resolved — implementations may proceed.**
Trigger: Code's round-trip execution of fixture 19 against the machine-readable fixture set, PR #167.

---

## 1. ⭐ BLOCKING: §4 is incomplete. §8's external column stands.

Fixtures 7, 8, 9, 10, 11 fail because **§4 under-specifies the casing rule**, not because the fixtures are wrong. Admin's hypothesis is correct and is confirmed by live external data, not merely by symmetry:

| Evidence | Source | Shows |
|---|---|---|
| `OP-R06c`, `OP-R05c` | M8 Holdings (614 rows, 614/614 parse) | `R` **upper**, `c` **lower**, in one code |
| Shape `ANNa` for `R03a` / `R06c` | M8 TCGplayer catalogue (1,422 printings) | prefix upper, suffix lower |
| Shape `ANN` for `R01`, `T01` | same | prefix upper |
| Shape `AAN/NNN` for `SP3/006` | same | `SP` upper |
| Shape `NNNa/NNN` for `135a/166` | same | suffix lower |

Two independent live populations agree: **the number's alphabetic *prefix* uppercases; the variant *suffix* stays lowercase.** Fixture 9 (`VEN-R03a`) contains both in one code, which is why no blanket rule resolves it.

**Corrected §4 — internal → external:**
1. Uppercase the **SET** component.
2. Uppercase the **NUMBER's alphabetic prefix** if present (`r`→`R`, `t`→`T`, `sp`→`SP`).
3. **Preserve the variant suffix letter in lowercase.**
4. Preserve the asterisk verbatim.
5. Insert `/` before TOTAL when a total is present.

**External → internal is unchanged:** lowercase everything. That direction was always correct, which is exactly why only the round-trip assertion caught this.

**Why the distinction is principled rather than arbitrary:** the set code and the number prefix both identify a **namespace** (which set, which numbering space — main, rune, token, special). The trailing letter is a **variant discriminator within** that namespace. Different roles, different casing, consistently rendered that way by every external source.

**Core's error, recorded.** v2 §4 said *"uppercase the set prefix only."* I wrote it while warning against the `135A` trap — and over-corrected: guarding against uppercasing too much produced a rule that uppercases too little. The ⚠ warning and the rule it accompanied were pulling in opposite directions, and only an executable round-trip exposed it.

## 2. Fixture 17 — split it; keep the testable half in §8

§8's binding rule is *"no implementation ships without passing §8 verbatim."* An unexecutable fixture makes that rule unsatisfiable, which weakens it for every other fixture. But the dual-face case is not wholly untestable — only its second half needs `tcgplayer_groups`.

- **17a — splitting (in §8, executable now):** input `"T05 // T06"` returns two fragments, `["T05", "T06"]`. Asserts the ` // ` split and that one product yields a **list**, not a parse failure.
- **17b — full translation (deferred to the §5 set):** `(group_id, "T05 // T06")` → `["unl-t05", "unl-t06"]`. Activates when the group mapping lands. Marked `"deferred": true, "blocked_on": "tcgplayer_groups"`.

Same treatment for any future fixture requiring the group mapping.

## 3. `OP` in §3's set enumeration — consolidation leftover, remove it. And a clarification worth more than the removal.

Correct catch: v2.1 forbids internal set codes `op`/`opp`/`pr`, while §3 still lists `OP` among known sets. **Remove `OP` from the enumeration.**

**But the deeper fix is that the parser must not validate set codes at all.** The §3 list is *illustrative documentation of sets we know about*, never a validation rule:

> **Set codes are data, not grammar.** The parser accepts any 2–4 letter set component. Whether that set exists is answered by the join, not by the regex — a well-formed code for an unknown set is **situation C** (a data gap), not situation A (malformed).

This keeps fixture 7 (`OP-R06c`) valid as a lowercasing and `[a-z]`-suffix-range assertion even though `op` is not a sanctioned internal set, and it prevents the enumeration from silently becoming a validator during implementation — which is how this leftover would have caused a real failure rather than a documentation inconsistency.

## 4. Fixture 13 — Code's reading CONFIRMED, and it improves on Core's instruction

v2.1 said *"remove it from §8."* Code instead kept it with `"withdrawn": true`. **Code is right and Core's instruction was worse.**

Deleting the fixture would erase the withdrawal from the artifact, leaving the reasoning discoverable only in a superseded amendment — precisely the failure mode of *"consolidation is where rulings disappear silently."* A withdrawn fixture carrying its reason is a **record**; a deleted one is a gap someone will eventually re-derive wrongly, and in this case re-deriving would reinstate the false model that `op` is a set.

**Required:** the harness must **skip** `"withdrawn": true` fixtures, never execute them. Add the withdrawal reason inline:

```json
{ "id": 13, "withdrawn": true,
  "reason": "OP is a distribution marker, not a set code. All 7 live OP holdings mirror base-set collector number and total (OP-127/219 = unl-127-219). Withdrawn v2.1 2026-08-06.",
  "external": "OP-041/166", "internal": "op-041-166" }
```

## 5. Amendments to fold in
1. §4 rewritten per §1 above; the ⚠ trap note kept but subordinated to the three-part casing rule so the two can no longer conflict.
2. §3: `OP` removed from the enumeration; the set-codes-are-data clarification added.
3. §8: fixture 17 split into 17a (executable) and 17b (deferred, `blocked_on: tcgplayer_groups`).
4. §8: fixture 13 retained with `withdrawn: true` and its reason; harness skips withdrawn fixtures.
5. Fixture count: **21 executable** (22 minus withdrawn 13), of which 17b is deferred → **20 executable today**.

## 6. Note on how this was found

This defect survived review by M8, M9, and Core across five document versions. It was caught within one Code session of the fixtures becoming machine-readable, by executing the round-trip assertion that had until then existed only as a sentence in a table.

**A conformance rule that cannot be executed is a statement of intent.** The same argument applies to the two fixtures now marked deferred: they are honestly labelled rather than quietly assumed to pass.
