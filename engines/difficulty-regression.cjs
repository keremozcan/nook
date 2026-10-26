/* Focused regressions for generation properties that the rule checker does
   not cover: the advertised difficulty needs to change how a puzzle plays. */
const assert = require('assert');
const sudoku = require('./sudoku.js');
const tango = require('./tango.js');

function givensCount(grid) { return grid.flat().filter(Boolean).length; }
function canSolve(grid, boxR, boxC, tier) {
  const result = sudoku.assess(grid, boxR, boxC, tier);
  return Boolean(result && result.solved);
}

// A hidden single is tier 1: the only place for a 1 in the top row is the corner,
// though the corner itself could still hold any digit.
const hidden = Array.from({ length: 9 }, () => Array(9).fill(0));
hidden[1][3] = 1;
hidden[2][6] = 1;
hidden[3][1] = 1;
hidden[6][2] = 1;
const singlesOnly = sudoku.assess(hidden, 3, 3, 1);
assert(singlesOnly && singlesOnly.moves >= 1 && singlesOnly.hardest === 1, 'hidden singles should be tier 1');

const sudokuSeeds = ['difficulty-a', 'difficulty-b', 'difficulty-c'];
for (const seed of sudokuSeeds) {
  const easy = sudoku.generate('easy', seed);
  const tricky = sudoku.generate('tricky', seed);
  const fiendish = sudoku.generate('fiendish', seed);
  assert(easy.rating.tier === 1, 'easy sudoku should be solvable with singles');
  assert(tricky.rating.tier === 2, 'tricky sudoku should require locked candidates');
  assert(fiendish.rating.tier === 3, 'fiendish sudoku should require pairs');
  assert(canSolve(easy.givens, easy.boxR, easy.boxC, 1), 'easy should solve with tier 1 enabled');
  assert(!canSolve(tricky.givens, tricky.boxR, tricky.boxC, 1), 'tricky should not solve with tier 1 only');
  assert(canSolve(tricky.givens, tricky.boxR, tricky.boxC, 2), 'tricky should solve with tier 2 enabled');
  assert(!canSolve(fiendish.givens, fiendish.boxR, fiendish.boxC, 2), 'fiendish should not solve below tier 3');
  assert(canSolve(fiendish.givens, fiendish.boxR, fiendish.boxC, 3), 'fiendish should solve with tier 3 enabled');
  assert(givensCount(easy.givens) > givensCount(tricky.givens), 'tricky sudoku should start with fewer clues than easy');
  assert(givensCount(tricky.givens) > givensCount(fiendish.givens), 'fiendish sudoku should start with fewer clues than tricky');
  assert.deepStrictEqual(sudoku.generate('fiendish', seed), fiendish, 'sudoku generation should remain deterministic');
}

const tangoSeeds = ['tango-a', 'tango-b', 'tango-c'];
for (const seed of tangoSeeds) {
  const easy = tango.generate('easy', seed);
  const tricky = tango.generate('tricky', seed);
  const fiendish = tango.generate('fiendish', seed);
  assert.deepStrictEqual([easy.n, tricky.n, fiendish.n], [4, 6, 8], 'Tango difficulty should scale board structure');
  assert(easy.rating.relationMarks < tricky.rating.relationMarks && tricky.rating.relationMarks < fiendish.rating.relationMarks,
    'Tango should add relation clues with difficulty');
  assert(easy.rating.givens < tricky.rating.givens && tricky.rating.givens < fiendish.rating.givens,
    'larger Tango boards should give players more starting anchors');
  assert.deepStrictEqual(tango.generate('fiendish', seed), fiendish, 'Tango generation should remain deterministic');
}

console.log('difficulty regression checks passed');
