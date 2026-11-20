# Browser errors ledger

Visitors' browser errors from keremozcan.github.io/nook reach the company collector (`POST https://spaceisland.ltd/api/jserr`, `hq/kit/jserr`). The collector and the morning scheduled task `spaceisland-browser-error-fixes` (Kerem, 20 Nov 2026) use this file: the task keeps one line per error here so no error is worked on twice.

Status: `open` (not looked at yet), `fixed <commit>` (in main; live only after a release), `guarded <commit>` (can't crash any more, cause not found), `noise` (not our code: say why), `can't reproduce` (tried what; waits for the stack to come with the next report).

| First seen | Error (message) | Where | Status |
|---|---|---|---|
