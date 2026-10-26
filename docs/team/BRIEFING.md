# Nook

Nine browser puzzles for Kerem and his son, with no ads, accounts or purchases. GitHub Pages serves the committed `index.html` from `main`; see README for the URL.

- **Contract:** `docs/games.md` says what each game must do (rules shown, one solution, clear win, difficulty, input, saving, theme). Judge changes against it.
- **Code:** engines live in `engines/` (one per game, seeded and deterministic). The interface is `ui/shell.js` (routing, saving, clock, Solved panel, Tonight), `ui/kit.js` (shared board input and drawing) and `ui/games/<id>.js` (one module per game; its strings live in a `COPY` object). `node build.mjs` writes the standalone `index.html`.
- **Checks:**
  - `NOOK_SEEDS=10 node engines/test.cjs` and `engines/*-regression*.cjs`
  - `node engines/sweep.cjs`: 1,560 real seeds per level; fails on any failed deal or a worst case over 300 ms
  - `NODE_PATH=<a node_modules with playwright> node tests/browser.cjs`, plus `NOOK_BUILT=1`
- **History:** Grok wrote all of Nook on 25 Oct, with ChatGPT fixes, and it went live as `57db6de`. On 26 Oct it was reviewed against the contract: engines fixed in parts, interface rewritten (see DECISIONS).
- **Publishing:** a push to `main` publishes, and needs Kerem's yes each time.
