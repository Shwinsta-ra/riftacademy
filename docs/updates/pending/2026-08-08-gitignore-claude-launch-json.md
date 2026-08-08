# Daily Update Fragment

## Thread/topic: gitignore-claude-launch-json

**Sections likely affected:** 9 (log) only — housekeeping, no feature impact.

**Customer-facing:**
Nothing.

**Team-facing:**
`.claude/launch.json` is now gitignored. It is the Claude Code dev-server launch config —
machine-local, naming local ports and commands for one person's setup, so sharing it would
conflict rather than help. It had been showing as untracked in every `git status` since it was
created.

**`.claude/settings.json` remains tracked and is unaffected** — that one is shared project
convention, and the new ignore rule is a single explicit path, not `.claude/`, precisely so it
cannot swallow settings.json later.

Verified with `git check-ignore -v .claude/launch.json` (matches `.gitignore:26`) and
`git ls-files .claude` (still lists `settings.json`).
