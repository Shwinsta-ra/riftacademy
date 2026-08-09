# RiftCore → all consuming modules: `cards.display_name` contract

**Date:** 2026-08-08
**Authority:** Ashwin ruling, Core thread — see `supabase/migrations/20260808000015_display_name.sql` for the schema change and full reasoning.
**Status:** binding on any module that renders a card name to a human.

---

## The rule, in one line

**Render `coalesce(display_name, name)`. Join, match, and validate on `name` only. Never the reverse.**

## Why two columns exist

`cards.name` is the **rules-semantic identity** — the join key for the 3-copy limit (CR 103.2.b), Unique (CR 825), Chosen-Champion identity (CR 103.2.a.3), and ban application (TR 601.2.a). It deliberately strips apostrophes from four champion names (Kaisa, Khazix, Leblanc, Reksai — see `CLAUDE.md`) because apostrophes break naive string handling in exactly the ways this repo has already hit: SQL literal escaping, CSV round-trips, URL slugs, exact-match search.

`cards.display_name` carries the **authentic printed spelling** (Kai'Sa, Kha'Zix, LeBlanc, Rek'Sai) for the small set of cards where it differs from `name`. It exists purely so players see the real card name — authenticity matters even though the backing key doesn't carry it.

## Conformance obligations

1. **Any UI, export, or generated document that displays a card name to a person** — deck lists, card browsers, puzzle prompts and answers, RiftCoach lesson text, printed build guides/buy lists, search *result* labels — must render `coalesce(display_name, name)`, never `name` alone. Getting this wrong means a player reads "Kaisa" on a card that's printed "Kai'Sa" — a small but real authenticity break.
2. **Any rules logic, deck validation, join, ban check, puzzle-answer match, or analytics grouping** must use `name` exclusively. `display_name` is NULL for 917 of 929 cards — it is not a complete or reliable key for anything.
3. **Search and autocomplete inputs should normalize apostrophes away on both sides of the comparison** (strip `'` from the user's query and from whichever column you're matching against) so a player typing "kaisa" or "kai'sa" finds the card either way, without needing to know which spelling the database uses internally. This is a UX recommendation, not a data-integrity requirement — get it wrong and the card is just harder to find, not incorrectly identified.
4. **Do not backfill `display_name` for cards where it would equal `name`.** NULL is the intended, self-documenting default — a non-null value tells you "this card needs special-case rendering" with no separate lookup table required. If a future gap turns up (accented characters, trademark symbols, etc.), extend this same column; don't add a parallel one.

## Reference implementation

```sql
select card_code, coalesce(display_name, name) as displayed_name
from cards
where card_code = $1;
```

```sql
-- normalized search, matches "kaisa" or "kai'sa" against either column
select card_code, coalesce(display_name, name) as displayed_name
from cards
where lower(replace(name, '''', '')) = lower(replace($1, '''', ''))
   or lower(replace(display_name, '''', '')) = lower(replace($1, '''', ''));
```

## Scope, as of this writing

12 cards carry a non-null `display_name`: Kaisa/Kai'Sa (`ogn-039-298`, `ogn-112-298`, `ogn-247-298`), Khazix/Kha'Zix (`unl-119-219`, `unl-143-219`, `unl-201-219`), Leblanc/LeBlanc (`unl-199-219`, `unl-172-219`, `unl-090-219`), Reksai/Rek'Sai (`sfd-029-221`, `sfd-170-221`, `sfd-187-221`). Everything else in `cards.name` already matches the authentic printed spelling — including legitimate possessives like Zhonya's Hourglass, Doran's Shield, etc., which were never part of this override and need no `display_name` entry.
