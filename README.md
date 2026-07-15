# RiftAcademy

Card identification quiz app with Leitner-box spaced repetition, built for
learning all 764 Riftbound cards (Origins, Spider-Man, Unlocked, Origins Signatures).

## What's inside

- **764 cards** bundled at `src/data/cards.json`, built from the 11 project
  Card Gallery JSON exports, filtered to exclude alternate art, overnumbered,
  and signature variants (matching your v8 inventory methodology).
- **Leitner box quiz**: 5 boxes (`src/lib/leitner.ts`). Correct answer promotes
  a card one box (intervals: 1, 3, 7, 14 days); a miss sends it straight back
  to Box 1, due immediately. New cards start at Box 1.
- **Local persistence** via `expo-sqlite` (`src/lib/db.ts`) — progress lives
  on-device, survives app restarts.
- **Filters** by set, domain, and card type (`Settings` screen) so you can
  drill a single set or domain (e.g. just Fury cards, or just Vendetta once
  it's added).
- **Progress view** showing how many cards sit in each box.

## Run it on your Mac (dev loop with Expo Go)

```bash
# unzip this project, then:
cd riftbound-trainer
npm install
npx expo start
```

This prints a QR code in the terminal. Scan it with the **Expo Go** app on
your iPhone/iPad (App Store, free) and it launches with live reload — no
Apple Developer account needed for this step. Edit any file and save; the
app on your phone updates instantly.

To open a simulator instead: press `i` in the terminal (iOS simulator, needs
Xcode) or `w` for a web preview in your browser.

## Share it with people before the App Store (web export)

This is the fastest way to hand someone a link at Nexus Night — no install,
no TestFlight signup:

```bash
npx expo export --platform web
```

This outputs a static site to `dist/`. Deploy it for free with either:

**Vercel** (recommended, fastest):
```bash
npx vercel dist --prod
```

**Netlify**:
```bash
npx netlify deploy --dir dist --prod
```

Either gives you a public URL you can turn into a QR code and share on the
spot. Note: `expo-sqlite` doesn't work in a web build the same way — on web
the app still runs and the quiz works, but progress persistence needs
`expo-sqlite/next` web support or a fallback to browser storage; this is
worth revisiting before you lean on the web build for anything beyond demos.
Native (Expo Go / TestFlight) is where the real Leitner persistence is solid.

## Next steps toward TestFlight

1. Enroll in the Apple Developer Program now (99/year) if you haven't —
   approval can take a couple of days.
2. Once the quiz feels solid, run `eas build --platform ios` (needs
   `npx expo install eas-cli` and an Expo account) to produce a real build.
3. Submit for Beta App Review, then generate the public TestFlight link
   (up to 10,000 external testers, no email collection needed).
4. Target: live before or around Vendetta's July 31 launch for the
   first-to-market window.

## Updating card data from your Master Card Inventory sheet

Export your sheet as CSV, then run:

```bash
python3 scripts/merge_sheet.py path/to/exported_sheet.csv
```

This merges your validated columns (Domain, Energy, Power, Might, Rarity,
Card Text, Keywords, Speed, Tags) into `src/data/cards.json`, matching by
`riftbound_id`/Card Code. It never reads Ability Target, Function, Used In,
or Notes — those stay out of the app per your rule. Shorthand also isn't
merged — that column is your personal note-taking shorthand, not app data.

Your sheet's Type column is remapped into the app's 6-category taxonomy:
Unit (Unit/Champion/Signature Unit/Token), Spell (Spell/Signature Spell),
Gear (Gear/Gear-Equipment/Signature Gear), Battlefield, Legend, and Rune.
Runes stay in the dataset but are hard-excluded from ever appearing in the
quiz (enforced in `attributeQuiz.ts`, not just by happening to lack
attributes) — no code change needed if that mapping stays the same.

The script also computes a new `abilityTrigger` field (While/When/May/Hold/
Turn Start/Turn End/Here) for every card via its own regex classifier run
against the final Card Text — this is NOT copied from your sheet's own
"Ability Triggers" column, since that's your rough first pass. It prints a
diff report showing every card where the computed value disagrees with
yours, so you can sanity-check the classifier's judgment calls (the
computed value is what actually gets used).

It prints a report after running: how many cards matched directly, how many
matched via an alt-art fallback (when your sheet only has the alt-art
printing of a card), which cards your sheet doesn't cover yet (left on
original Riftcodex data), and any name mismatches it refused to guess on.
Read that report before assuming everything merged cleanly.

Once Vendetta cards are in your sheet in meaningful numbers, this same
script picks them up automatically the moment they're also added to the
underlying Riftcodex card export (see the "Extending the card set" section
below) — no script changes needed.

## Extending the card set

When Vendetta drops, pull the new set from the same Riftcodex API pattern
(`api.riftcodex.com/cards?set_id=<code>&page=N&size=100&sort=collector_number`),
filter `alternate_art=false AND overnumbered=false AND signature=false`, and
merge into `src/data/cards.json` in the same shape as the existing entries.
Then run `scripts/merge_sheet.py` again with your latest sheet export to
layer your curated text/keywords on top.

## Known simplifications (MVP scope)

- Quiz mode is multiple-choice "name the card from its image" only. A
  type-in mode, or a "guess the domain/ability" mode, would be natural next
  additions using the same Leitner engine.
- Distractor options are pulled from the same set + type when possible, so
  wrong answers are still plausible-looking cards rather than random noise.
- No user accounts/cloud sync — progress is local to the device via SQLite.

## Configuring quiz box positions and per-card overrides from a spreadsheet

Two things about how questions get built are driven by data files instead
of hardcoded app logic, specifically so you can maintain them as extra tabs
in your Riftbound workbook rather than asking me to edit code every time:

### Tab: "Quiz Box Positions"

Controls where each mask box sits on the card image. Columns:

| Mode | Card Type | Region | Top % | Height % | Left % | Width % |
|---|---|---|---|---|---|---|
| Cost | Default | | 3 | 30 | 0 | 24 |
| Might | Default | | 3 | 16 | 76 | 22 |
| Might | Gear | | 81 | 16 | 76 | 22 |
| Name | Default | | 50 | 15 | 0 | 100 |
| Name | Battlefield | | 40 | 10 | 0 | 100 |
| Text | Default | | 65 | 30 | 0 | 100 |
| Text | Battlefield | Top | 2 | 13 | 0 | 100 |
| Text | Battlefield | Bottom | 85 | 13 | 0 | 100 |

- **Mode**: Cost, Might, Name, or Text. Keyword/Speed/Trigger questions all
  reuse Text's box (same visual location) unless you add explicit rows for
  them later.
- **Card Type**: a real type name (Unit, Spell, Gear, Battlefield, Legend),
  "Default" for everything without its own row, or **"Token"** — Tokens keep
  their normal `type` (Unit or Gear) but are visually distinct (colorless
  portrait layout), so a "Token" row takes priority over that card's base
  type whenever one exists for a given Mode.
- **Region**: blank for single-box modes. Battlefield's Text needs two rows
  (Top/Bottom) since it masks the card's mirrored text twice.
- Percentages are plain numbers (3, not "3%"), relative to the card image's
  own bounding box.

Export as CSV, then: `python3 scripts/apply_positions.py path/to/file.csv`

### Tab: "Quiz Card Overrides"

Per-card exceptions to the app's auto-computed eligibility — for cases like
Windswept Hillock, where the text technically contains "here" but that's
not a meaningful trigger for that specific card. Columns:

| Card Code | Cost | Might | Name | Text | Keyword | Speed | Trigger |
|---|---|---|---|---|---|---|---|
| ogn-297-298 | | | | | | | FALSE |

- **Card Code** is the riftbound_id (e.g. `ogn-297-298`).
- Every other column: **blank** = auto (normal logic decides), **FALSE** =
  force this mode off even if the data would otherwise qualify, **TRUE** =
  force it on (only works if the underlying data can actually support that
  question — this widens an overly strict check, it doesn't fabricate
  missing data).
- Only include rows for cards that need an actual exception — don't fill in
  a blank row for every card.

Export as CSV, then: `python3 scripts/apply_overrides.py path/to/file.csv`

Both scripts fully replace their respective JSON file each time they run,
so the sheet is the single source of truth — don't hand-edit
`quizPositions.json` or `quizOverrides.json` directly, or your next sheet
export will overwrite those edits.

### Tab: "Quiz Questions" (hand-authored question overrides)

One row per question **variant** (a card+category can have several — the
app randomly cycles between them). Columns:

| Card Code | Category | Prompt | Correct Answer | Distractor 1-6 | Caption |
|---|---|---|---|---|---|
| unl-113-219 | Cost | What's Master Yi's Energy cost? | 4 | 3, 5, 6, 2, 7 | |

- **Card Code**: riftbound_id.
- **Category**: Cost, Might, Name, Text, Keyword, Speed, or Trigger.
- **Distractor 1-6**: only 3 show per instance — if you give more than 3,
  the app randomly samples a different 3 each time this card+category comes
  up, so repeat exposures don't always look identical. Fewer than 3 means
  fewer total options shown (not auto-padded).
- **Caption**: optional, for Keyword-style questions that show masked card
  text above the choices.

A hand-authored row always wins over the app's auto-generated question for
that card+category. Leave a card+category out entirely to keep using
auto-generation for it.

Export as CSV, then: `python3 scripts/apply_questions.py path/to/file.csv`
