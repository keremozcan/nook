# Nook

Nine browser puzzles for Kerem and his son, with no ads, accounts or purchases. Source lives in `engines/` and `ui/`; `node build.mjs` generates the committed, standalone `index.html`. The existing GitHub Pages URL is in README.

2026-10-25: Kerem requested a broad repair of rules, interface, difficulty and puzzle design, using cheaper subagents. The repair includes the overlapping `d93d756` commit from the other writer, preserving its history. Queens uses single-click for dots and double-click for crowns.

See README for checks and difficulty methods. Logic-board uniqueness has independent checkers; word content has curated-bank validation. Playwright exercises actual controls and completes the daily sequence. Chrome is checked; real-device Safari/VoiceOver remain unverified.

Publishing: GitHub Pages builds the root of `main` automatically. Kerem authorized this repair's merge, commit and push in this conversation on 25 October. The live commit before this release was `d93d756`. Verify the Pages build commit and the served page after pushing.
