# Nook: what each game must do

Written 2026-10-26 for the review of the Grok-built version. This is the contract the code is judged
against. When code and this file disagree, fix the code; when this file is wrong, change it here first.

## What Nook is for

Nine calm puzzles Kerem and his son can play on a phone or a laptop, instead of ad-filled games. No ads,
no accounts, nothing to buy, no tracking. One static page (GitHub Pages), works offline once loaded.

Every game must:

1. **Show its rule.** A one-line rule is always visible; "How to play" holds the full rule. The full
   rule names every constraint the checker uses. Nothing is judged by a rule the page doesn't show.
2. **Be fair.** Every logic board has exactly one solution under the shown rule. Word puzzles have one
   intended answer, and close variants a player would naturally type are accepted.
3. **Say clearly when you've won.** As soon as the board satisfies the rule: a visible "Solved" panel
   with the time (and best time), the board locks, and one obvious next step (Next puzzle / back to games).
4. **Show difficulty before play.** Easy, Tricky, Fiendish (Sudoku also Mini). The note under the title
   says what the level means (size, technique), in plain words.
5. **Work by touch, mouse and keyboard.** Tap and drag on a 375 px phone; click and drag with a mouse;
   arrows plus Space/Enter on a keyboard. Buttons are at least 44 px tall on touch screens. A keyboard
   focus ring appears for keyboard use only, and never hides a piece, number or line.
6. **Keep a half-finished puzzle.** Leaving a game (back, closing the tab, switching game) keeps that
   game's puzzle and moves, one saved puzzle per game. Reopening the game resumes it with its clock.
   Solving clears it. "New puzzle" starts fresh and drops the saved one for that game.
7. **Follow the system theme.** Light and dark, both readable; colour is never the only cue.
8. **Help without spoiling.** Undo for every move. Hint makes one correct step. "Check errors" (logic
   boards) marks broken rules, not wrong-but-legal guesses, and can be turned off.
9. **Start fast.** A new puzzle appears within ~300 ms on a laptop (so ~1 s on a phone) at every level.

"Tonight" plays one fixed puzzle of each game for the date (same for everyone), in order, and keeps
your place in the run for that day.

## The games

### Zip
- Rule: draw one line through every square, visiting the numbers in order from 1 to the last; the line
  can't cross heavy walls. It starts at 1 and ends on the last number.
- Win: the line covers every square and ends on the last number (numbers in order is enforced while drawing).
- Difficulty: 6×6, 7×7, 8×8 with fewer numbers and more walls as it gets harder.
- Input: drag from 1 (or from the line's end) to extend; drag back over the line to shorten; tap a
  neighbouring square to extend by one. Keyboard: arrows move, Space extends.

### Queens
- Rule: one crown in each row, each column and each colour region. Crowns may not touch, not even
  diagonally.
- Win: n crowns placed, no two in a row, column or region, none touching.
- Difficulty: 7×7, 8×8, 9×9.
- Input (Kerem's decision, 25 Oct): tap/click once for a dot (a note), double-tap/double-click for a
  crown; again to clear. Keyboard: Space = dot, Enter = crown.
- Regions are separated by thick borders as well as colour.

### Tango
- Rule: fill every square with a sun or a moon. Each row and column has as many suns as moons. No more
  than two of the same next to each other in a row or column. `=` between two squares means they're the
  same; `×` means they're different. Shaded squares are given.
- Win: board full and every rule holds.
- Difficulty: 4×4, 6×6, 8×8.
- Input: tap cycles empty → sun → moon → empty. Keyboard: Space/Enter does the same.

### Sudoku
- Rule: every row, column and outlined box holds each digit once (1–6 for Mini, 1–9 otherwise).
- Win: grid full with no repeats.
- Difficulty is the hardest technique you need; every puzzle is solvable by these without guessing:
  Mini (6×6) and Easy: singles only (a cell with one possible digit, or a digit with one possible place).
  Tricky: also needs locked candidates (pointing/claiming). Fiendish: also needs pairs (naked or hidden).
- Input: select a cell, tap a digit; Notes mode for pencil marks; Erase. Keyboard: arrows, digits,
  Backspace, P for notes.

### Patches
- Rule: split the board into rectangles with no gaps or overlaps. Each rectangle holds exactly one clue.
  The number is its area. The symbol is its shape: square, wide (wider than tall) or tall (taller than
  wide). A clue with no symbol can be any shape.
- Win: every square covered by a valid rectangle.
- Difficulty: 6×6, 7×7, 8×8; Fiendish hides some shapes.
- Input: drag from one corner to the opposite corner; tap a placed patch to remove it; tap a 1-square
  clue to place it. Keyboard: Space on two corners.

### Murdoku
- Rule: place everyone so each row and each column has exactly one person. Nobody stands on blocking
  furniture (shown as blocking). Every slip is true. The victim shared a room with exactly one other
  person: that person did it.
- Win: everyone placed where the slips force them; the page names who did it.
- Difficulty: 4×4, 5×5, 6×6 houses.
- Clue words are defined in "How to play" ("beside" = shares an edge, in the same room); no clue kind
  whose meaning depends on an undefined shape.
- Input: choose a person, tap a square; tap them again to pick them up.

### Pinpoint
- Rule: five clues share one connection. You see one clue; guess the connection, or reveal the next clue.
  A wrong guess also reveals the next clue. Fewer clues used = better.
- Clues are ordered from least to most revealing, so the first clue alone rarely gives it away.
- Answers: case, punctuation, "a/the", and singular/plural don't matter; common synonyms count.
- Win: an accepted answer. After five clues, Hint fills in the answer. The explanation shows after the end.

### Crossclimb
- Rule: answer each clue with a word; then order the words so each one differs from the next by exactly
  one letter. Then the top and bottom rungs unlock with one shared clue; together they name one thing.
- The middle rungs fit in only one order (either direction). No clue contains its own answer, and the
  shared clue contains neither end word.
- Win: all rungs right, ladder in order, both ends right (either way round).

### Wend
- Rule: every open letter belongs to exactly one hidden word. Drag through letters that share an edge to
  spell a word; words have the lengths shown. Walls are skipped. A real word on the wrong path doesn't count.
- Exactly one way to split the board into listed words of those lengths.
- Win: all hidden words found.
