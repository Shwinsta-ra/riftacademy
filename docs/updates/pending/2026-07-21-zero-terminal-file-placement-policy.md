## Thread/topic: zero-terminal file placement policy

**Sections likely affected:** 6 (Standing rules)

**Team-facing:**
New standing rule: any file placement into the app repo (new CSVs, generated content, config files, source data exports, etc.) is Claude Code's responsibility by default, not Ashwin's. Code locates the correct destination itself and places the file as part of its normal task execution, rather than asking Ashwin to run terminal mv/cp commands. Goal: minimize Ashwin's terminal use toward zero.

Practical note: the one remaining terminal dependency was launching a Code session via the `claude` CLI command. Claude Desktop's Code tab does the same thing with zero terminal use — recommended as the default going forward for launching Code sessions.

**New standing rule or convention worth capturing:**
"File placement into the repo (new source CSVs, generated content, configs) is Claude Code's job by default — it locates the correct destination and places the file itself, never asking Ashwin to run terminal mv/cp commands. Goal: minimize Ashwin's terminal use toward zero. Prefer Claude Desktop's Code tab over the terminal `claude` CLI for launching sessions, since that removes the only remaining terminal dependency."
