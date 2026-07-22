## Thread/topic: group-b-answered-see-riftrecall-thread

**Sections likely affected:** 9 (log)

**Team-facing:**
Group B (the deferred general card-text question-parsing scope for RiftRecall — the ~719 cards outside the shipped "exactly 2 numbers" fill-in-the-blank case) is **resolved**, not still open. The full spec — four buckets, each with its own confirmed rule from Ashwin, implementation order 3 -> 4 -> 2 -> 1 — lives in the RiftRecall thread's own handoff doc, `group-b-text-parsing-handoff.md` (Drive, control-thread folder). It has already been delivered and is ready for Code to pick up.

**Anything another thread working today should know before touching related code:**
This is a pointer only — do not re-ask Ashwin for the Group B rules; they're already answered and written down. Whoever picks up Group B implementation should pull `group-b-text-parsing-handoff.md` directly rather than re-deriving the bucket rules from chat.
