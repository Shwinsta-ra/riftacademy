-- RiftAcademy Supabase - Migration 016: normalize champion tags (Kai'Sa etc.)
--
-- Authority: Ashwin ruling, 2026-08-08 (Core thread), following on migration 015.
--
-- Why now, unlike display_name: tags are a JOIN/MATCH key (CR 133.8 "open
-- vocabulary, no innate meaning"; CR 103.2.d Signature-must-match-Legend's-
-- champion-tag), not printed text a player reads - there is no authenticity
-- claim to preserve the way there is for `name`. Converting costs nothing
-- today because card_abilities is empty (0 rows) - no effect program exists
-- yet that could embed the old spelling as a predicate.tag literal. Waiting
-- only means Stage 3 might bake the apostrophe'd spelling into ability data
-- later, making this a bigger fix.
--
-- Scope note: this is 16 rows, not the 12 from migration 015. Four extra
-- cards carry the tag via Signature-to-champion linkage (CR 103.2.d), found
-- by querying live tags directly rather than assuming the display_name
-- scope applied unchanged: ogn-248-298 (Icathian Rain), sfd-188-221 (Void
-- Rush), unl-200-219 (Mirror Image), unl-202-219 (Void Assault).

begin;

update cards set tags = array_replace(tags, 'Kai''Sa', 'Kaisa')
  where 'Kai''Sa' = any(tags);
update cards set tags = array_replace(tags, 'Kha''Zix', 'Khazix')
  where 'Kha''Zix' = any(tags);
update cards set tags = array_replace(tags, 'LeBlanc', 'Leblanc')
  where 'LeBlanc' = any(tags);
update cards set tags = array_replace(tags, 'Rek''Sai', 'Reksai')
  where 'Rek''Sai' = any(tags);

-- Replay-safety, same reasoning as migration 015: the seed loads AFTER
-- migrations, so on a from-scratch rebuild `cards` is empty here and every
-- update above touches zero rows. Assert the invariant that survives that:
-- zero rows may carry the OLD spelling, whatever the total row count is.
do $$
declare
  stale int;
begin
  select count(*) into stale from cards
  where 'Kai''Sa' = any(tags) or 'Kha''Zix' = any(tags)
     or 'LeBlanc' = any(tags) or 'Rek''Sai' = any(tags);

  if stale <> 0 then
    raise exception 'normalize_champion_tags: % cards still carry an apostrophe''d/mixed-case champion tag', stale;
  end if;
end $$;

commit;
