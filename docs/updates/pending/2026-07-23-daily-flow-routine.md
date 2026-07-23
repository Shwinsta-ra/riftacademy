## Thread/topic: daily-flow-routine

**Sections likely affected:** 6 (Standing rules), 5 (New thread creation flow)

**Team-facing:**
Codifying the daily morning/evening routine, refined 2026-07-23.

**Morning flow:**
1. Ashwin asks Code for a fresh zip of `integration` (not `main` - integration is always current even if a prior night's promotion didn't fully complete).
2. Ashwin extracts the PM doc from that zip and pastes it fresh into Project Knowledge, before starting any other threads that day.
3. Ashwin shares the zip with the admin/control thread and asks it to start the day - admin thread lists the day's priorities and creates handoff docs for whichever threads are active that day (each handoff opens with a short "what's new since last session" section, not a separate artifact).
4. Ashwin hands each handoff doc + the morning zip to the relevant threads to begin the day's work.

**Evening flow:**
1. On command, each active thread produces a comprehensive EOD summary of the day's work.
2. Ashwin hands all EOD summaries to the admin thread, which cross-verifies claims across threads, catches conflicts/redundancy, and updates TickTick directly.
3. Admin thread produces a single document for Code's nightly check-in (fragments to create, docs to land, corrections to apply).
4. Ashwin asks Code to do the nightly check-in, then promotes the resulting PR up through the branch chain to staging/main as appropriate for that night's content.
5. **Ashwin re-uploads the freshly-merged PM doc to Project Knowledge** - this step was previously being skipped; it's what makes tomorrow morning's ambient context actually current.

**When it's okay to skip a thread's full EOD doc:** when nothing else depends on that thread's in-progress state AND nothing from it is being promoted that night. Even then, send a one-line "still in progress, nobody's blocked" note rather than silence, so nothing stalls without anyone noticing why.

**Simple daily command for threads:** Ashwin can now just say "create your nightly EOD doc" to any active thread and it should already know this expected format/purpose from this fragment once reconciled.
