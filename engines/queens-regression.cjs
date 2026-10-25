// Queens uses neighbouring diagonals, not the attacking diagonals of chess.
// Enumerate placements independently of the generator and its repair search.
const assert = require('node:assert/strict');
const queens = require('./queens.js');

function solutions(regions, limit = 2) {
  const n = regions.length;
  const found = [];
  function visit(columns) {
    if (found.length >= limit) return;
    const row = columns.length;
    if (row === n) {
      found.push(columns.map((c, r) => [r, c]));
      return;
    }
    for (let col = 0; col < n; col++) {
      if (columns.some((c, r) => c === col || regions[r][c] === regions[row][col])) continue;
      if (columns.length && Math.abs(columns.at(-1) - col) <= 1) continue;
      visit([...columns, col]);
    }
  }
  visit([]);
  return found;
}

const stripes = Array.from({ length: 5 }, () => [0, 1, 2, 3, 4]);
assert.equal(solutions(stripes, 100).length, 14, 'distant diagonals remain legal');

const seeds = Number(process.env.NOOK_SEEDS || 12);
let distantDiagonal = false;
for (const difficulty of ['easy', 'tricky', 'fiendish']) {
  for (let i = 0; i < seeds; i++) {
    const seed = `case-${difficulty}-${i}`;
    const started = Date.now();
    const puzzle = queens.generate(difficulty, seed);
    assert(Date.now() - started < 5000, `${difficulty} ${seed}: generation took over five seconds`);
    const found = solutions(puzzle.regions);
    assert.equal(found.length, 1, `${difficulty} ${seed}: expected one no-touch solution`);
    assert.deepEqual(found[0], puzzle.solution, `${difficulty} ${seed}: generated solution matches rules`);
    assert.deepEqual(queens.generate(difficulty, seed), puzzle, 'same seed reproduces the same board');
    distantDiagonal ||= puzzle.solution.some(([r, c]) => puzzle.solution.some(([rr, cc]) =>
      Math.abs(r - rr) > 1 && Math.abs(r - rr) === Math.abs(c - cc)));
  }
}
assert(distantDiagonal, 'boards exercise legal distant diagonals');
console.log(`ok Queens no-touch rules, uniqueness and repeatability (${seeds * 3} boards)`);
