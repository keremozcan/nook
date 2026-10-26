# Nook

Nine puzzles, one page. No ads, no accounts, nothing to buy.

I created these with AI to replace the ad-ridden games my son plays.

Zip, Queens, Tango, Sudoku, Patches, Murdoku, Pinpoint, Crossclimb, and Wend. Pick Easy, Tricky, or Fiendish, or play tonight’s nine. Logic boards are checked for a single solution. Word games use curated clues and connections.

Play it at [keremozcan.github.io/nook](https://keremozcan.github.io/nook/), or open `index.html` in a browser.

The interface is `ui/kit.js` (shared helpers and the board's touch, mouse and keyboard input), one module per game in `ui/games/<id>.js` (its rules text, strings, drawing and moves), `ui/shell.js` (routing, saved puzzles, the clock, the dock, the Solved panel and Tonight) and `ui/app.css` (colour tokens with a dark theme). Edit `ui/` and `engines/`, then run `node build.mjs` to rebuild the standalone page. `dev.html` loads the source files directly.

Difficulty is visible before play. Sudoku (9×9, plus a 6×6 Mini) is graded by the techniques needed: Easy and Mini need singles, Tricky adds locked digits, Fiendish adds pairs. Tango grows from 4×4 to 6×6 to 8×8. Crossclimb grows from 3–4 to 4–5 to 5–6 middle rungs; either ladder direction is accepted. Pinpoint has 39 curated rounds across three editorial difficulty groups. The remaining boards scale their size and clue structure; these labels are not a universal human difficulty rating.

Check the engines with `node engines/test.cjs`. Additional regressions are `engines/queens-regression.cjs`, `engines/wend-regressions.cjs`, `engines/difficulty-regression.cjs`, and `engines/word-regression.cjs`. Set `NOOK_SEEDS=10` to sample ten seeds per difficulty in the general checker.

With Playwright installed and Chrome available, `node tests/browser.cjs` plays every game through its controls at phone size, then checks hints, Check errors, undo, saved puzzles across a reload, keyboard play, Tonight and dark mode. Set `NOOK_BUILT=1` to check the generated `index.html` instead of the source page. Browser tests close their browser when finished.
