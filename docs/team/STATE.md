# Open work

Updated 2026-10-26 · review of the Grok build (Nook PM, session local_9c1fcdc7-5000-4ee2-9da8-8565b9f00038).

- **Waiting on Kerem · publish `review/nook`.** The full review is committed locally on branch `review/nook`, site files as of `cdb6d3c`, team notes on top. It covers the contract (`docs/games.md`), engine fixes, the interface rewrite, the copy review and the reviewer's fixes. Live is still `57db6de`. To publish: merge `review/nook` into `main` (fast-forward), push, then check that the Pages build and the served `index.html` match the pushed head. Publishing drops any half-finished puzzle a player has on the old version (old single save slot); best times are kept.
- **Device coverage · owner: QA.** Covered: Chrome emulation at 375/390/1280 px, light and dark, plus Playwright with touch. Not covered: real iPhone Safari, VoiceOver, Firefox.
- **Content depth · owner: PM.** Pinpoint has 39 rounds; Crossclimb has 19 ladders. Tonight uses Easy, so its Pinpoint round repeats about every two weeks. More rounds are worth adding if Kerem's son plays daily.
- **Difficulty by size only · owner: PM.** Queens, Tango, Zip, Patches and Murdoku get harder by board size and clue count. Only Sudoku is graded by solving technique. Each board has one solution, but a few hard ones may need trial and error.
