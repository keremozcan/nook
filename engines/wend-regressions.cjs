const assert = require('node:assert/strict');
const { test } = require('node:test');
const engine = require('./wend.js');

function checkPaths(puzzle) {
  const blocked = new Set(puzzle.walls.map(([r, c]) => r + ',' + c));
  const seen = new Set();
  for (const entry of puzzle.solution) {
    assert.ok(engine.words.includes(entry.word));
    assert.equal(entry.cells.length, entry.word.length);
    entry.cells.forEach(([r, c], i) => {
      const key = r + ',' + c;
      assert.ok(!blocked.has(key) && !seen.has(key), 'words cannot share or cross walls');
      assert.equal(puzzle.letters[r][c], entry.word[i]);
      if (i) {
        const [pr, pc] = entry.cells[i - 1];
        assert.equal(Math.abs(pr - r) + Math.abs(pc - c), 1);
      }
      seen.add(key);
    });
  }
  assert.equal(seen.size + blocked.size, puzzle.rows * puzzle.cols);
  assert.deepEqual(puzzle.solution.map(({ word }) => word.length).sort((a, b) => a - b), puzzle.lengths);
}

test('fiendish Wend generates the seed that previously exhausted every attempt', () => {
  const puzzle = engine.generate('fiendish', 'audit-fiendish-43');
  checkPaths(puzzle);
  assert.deepEqual(engine.generate('fiendish', 'audit-fiendish-43'), puzzle);
});

test('Wend generates playable paths across difficulties and wall arrangements', () => {
  for (const { id } of engine.difficulties) {
    for (let i = 0; i < 100; i++) checkPaths(engine.generate(id, 'audit-' + id + '-' + i));
  }
});
