# Nook

Nine browser puzzles for Kerem and his son, with no ads, accounts or purchases. Source lives in `engines/` and `ui/`; `node build.mjs` generates the committed, standalone `index.html`. The existing GitHub Pages URL is in README.

2026-10-25: Kerem requested a broad repair of rules, interface, difficulty and puzzle design, using cheaper subagents. The checked repair is on `codex/nook-games-repair`, in `/Users/keremozcan/Developer/nook-games-repair`. The other writer committed overlapping work on original main as `d93d756`; its untracked word regression remains preserved too. Compare the two versions before integration; do not reset the original checkout.

See README for checks and difficulty methods. Logic-board uniqueness has independent checkers; word content has curated-bank validation. Playwright exercises actual controls and completes the daily sequence. Chrome is checked; real-device Safari/VoiceOver remain unverified. Changes have not been deployed.
