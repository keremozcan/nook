# Decisions

- **2026-10-25 · Kerem:** Rework the games' rules, interface, difficulty and level design. Use cheaper subagents for bounded repair tasks. This conversation authorizes local fixes; it does not authorize deployment.
- **2026-10-25 · Game repair:** Queens uses one crown per row, column and connected colour, with neighbouring crowns forbidden. Distant diagonals are legal. The former chess-diagonal checker was wrong and was corrected alongside an independent regression.
- **2026-10-25 · Kerem:** Queens places a dot on a single click and a crown on a double-click. Keyboard equivalents are Space and Enter.
- **2026-10-25 · Game repair:** Use a light, readable interface, always-visible short instructions, controls beneath the board, and clear given/selected/error states. Preserve all nine games and the daily sequence.
- **2026-10-25 · Game repair:** Sudoku difficulty requires distinct deterministic solving techniques. Tango uses 4/6/8-cell sides. Crossclimb uses 3–4/4–5/5–6 middle rungs and accepts the reverse ladder. Pinpoint uses curated concrete/compound/pattern connections with natural aliases; explanations appear only after completion. A closed category bank cannot prove semantic uniqueness.
- **2026-10-25 · Concurrent work:** Another writer repeatedly replaced the word-game files. Kerem said “Yes—I’ll stop the other writer”. Preserve both versions and finish in an isolated worktree. The concurrent word diff is saved in `/Users/keremozcan/.codex/visualizations/2026/10/25/nook-games/concurrent-word-work.patch`.
- **2026-10-25 · Kerem:** “merge to main commit and push” authorizes publishing this reviewed repair through the existing GitHub Pages main-branch build. The merge retains live commit `d93d756` and the repaired word games and Queens controls.
