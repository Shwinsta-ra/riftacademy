## Thread/topic: riftiq-vendetta-bombs

**Sections likely affected:** 2 (shipped/in-progress features), 3 (feature tracker), 9 (log)

**Customer-facing:**
Four new RiftIQ puzzles built around the biggest units in the Vendetta set, teaching how to
answer a threat too large to remove. Three are ready; one is held back for a fix.

**Team-facing:**

Authored the Vendetta bomb-answer puzzle set (TickTick `6a5f96af8f0846c75cf35d2f`, column
M5 - IQ). Content doc: `docs/riftiq/RiftIQ_Vendetta_Bombs_Batch.md`. This is a **themed set,
not Batch 2** - Batch 2 content authoring stays held pending Ashwin's three open questions,
and the Batch 2 Easy-slot rotation is unaffected.

**Rebaseline result (the task asked for this explicitly).** Evidence: `src/data/cards.json`
in this zip (918 cards), filtered `setId == "VEN"` and `type == "Unit"` and `might >= 6`,
run in-session.
- All 11 cached bombs from the July 10-14 snapshot **verified accurate** - every name and
  Might value matches today's `cards.json`. No drift.
- Base codes confirmed clean: the pipeline is already stripping alternate-art suffixes, so
  `Renekton, Rage Fueled` resolves to `ven-019-166`, not `ven-019a-166`. The alt-art hazard I
  flagged in yesterday's RiftCoach brief validation does not exist in the repo's processed
  data - it was only in the raw riftcodex JSON.
- **The cached list was incomplete: 18 Vendetta units sit at M6+, not 11.** Seven missing
  (Ocean Drake was already correctly in the cached 11 - an earlier count miscounted it as an
  eighth omission and said 19; corrected here by agreement between RiftIQ and Code), the
  significant one being **Sandstone Chimera** (`ven-036-166`, M8 for E7, Calm) - the most
  efficient M8 in the set and absent from the list entirely. Others: Shen Scourge of Shadows
  `ven-042-166`, Nasus Guardian of Knowledge `ven-063-166`, Swain Visionary `ven-065-166`,
  Baccai Sandspinner `ven-001-166`, Minah Swiftfoot `ven-111-166`, Horns of the Dragon
  `ven-118-166`.

**Correction to my own prior claim.** In yesterday's validation of RiftCoach's Vendetta combo
brief I flagged their Might distribution as wrong (I counted 95 units, they said 91). **They
were right, I was wrong** - I had counted alternate-art duplicates out of the raw API JSON.
The repo's deduplicated `cards.json` gives exactly 91 Vendetta units and every bucket matches
their table. No action needed from RiftCoach; the erroneous flag was mine. Evidence: same
filter as above, `len(units) == 91`.

**Format question resolved without a new gate.** The task says "sealed bombs," but our
authoring rule is constructed two-domain while sealed permits three. Every board in this set
is built **two-domain**, which is legal in constructed *and* legal in sealed (sealed allows up
to three). So the set needs no new format gate or board chrome, and it is directly usable for
pre-rift sealed prep. This is also why none of the three-domain combos from RiftCoach's brief
appear here.

**Design spine.** Verified against every Vendetta card whose text can affect a unit: **every
hard-kill effect in the set caps at 3 Might or less** (Lacerate, Wind and Ghosts, Mel Defiant
Soul, Twilight Step), and the damage ceiling is 7 (Siphoning Strike with seven-plus runes).
Nothing kills an M6+ body outright. The set therefore teaches the *taxonomy of indirect
answers* rather than one card each: read the drawback (V1), bounce instead of kill (V2),
attack the condition not the threat (V3), out-size it with board-relative removal (V4).

**One puzzle is knowingly broken and held.** V3's intended correct answer targets a companion
unit with Lacerate, but I gave that companion 4 Might, which is above Lacerate's 3-or-less
threshold - so the correct answer fails alongside the wrong ones. Caught during the gate pass.
I flagged it inline rather than silently patching, because the fix changes the opponent's
board and needs a fresh gate audit. **V3 must not ship until corrected and re-verified.**

**Gotchas for anyone picking this up:**
- Gate G (legend-passive audit) earned its keep again. Several legends have combat-relevant
  passives that would have quietly altered boards: Shen Eye of Twilight (`ven-147-166`) grants
  Tank at Action speed, Miss Fortune (`ogn-267-298`) grants Ganking on tap. Both are disclosed
  and neutralised in the affected puzzles (legend stated exhausted).
- `speed` is a first-class field in `cards.json` and it matters for puzzle legality. Public
  Execution and Onslaught are `Normal` (your turn only), Wind and Ghosts is `Action` (your
  turn or showdowns), Decree of Insight and Mesmerize are `Reaction`. A puzzle whose answer
  must happen during the opponent's attack can only use `Action` or `Reaction` cards.
- `setId` in the repo's `cards.json` is uppercase (`VEN`), not lowercase. A lowercase
  comparison silently returns zero Vendetta cards.

**New standing rule or convention worth capturing:**
When authoring any puzzle, verify the **speed** field of every card in the intended solution
against the phase the puzzle is set in. A `Normal`-speed card cannot answer an attack. This
belongs alongside the existing combat-legality gate (C) in the RiftIQ checklist, and is worth
adding to `CLAUDE.md` if other threads author board states.

**Anything another thread working today should know before touching related code:**
- **RiftCoach:** your Vendetta combo brief's Might distribution was correct - disregard my
  flag from yesterday. The genuine correction still standing is the sealed-versus-constructed
  domain filter: combo recommendations should be filtered to two domains or explicitly flagged
  sealed-only.
- **RiftCore:** no new primitives requested by this set. Every puzzle here is deliberately
  single-step, and the multi-step combos (Mel shrink stack, Empower amplification) remain
  parked pending the multi-step ability model.
- **Admin:** the TickTick task description contains the stale 11-bomb list. It should be
  updated to the verified 19, or pointed at
  `docs/riftiq/RiftIQ_Vendetta_Bombs_Batch.md` section 1 rather than duplicating the data.
