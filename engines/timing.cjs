/* Generation time per game and difficulty over seeds s0..s(N-1).
   Usage: node engines/timing.cjs [game] (NOOK_SEEDS, default 30). Exits 1 if any worst case is 300 ms or more. */
const path = require('path');

const GAMES = ['zip', 'queens', 'tango', 'sudoku', 'patches', 'murdoku', 'pinpoint', 'crossclimb', 'wend'];
const seeds = Number(process.env.NOOK_SEEDS || 30);
const only = process.argv[2];
let slow = false;

console.log('game        difficulty  median   max  (ms, ' + seeds + ' seeds)');
for (const id of GAMES) {
  if (only && id !== only) continue;
  const engine = require(path.join(__dirname, id + '.js'));
  for (const { id: difficulty } of engine.difficulties) {
    const times = [];
    for (let i = 0; i < seeds; i++) {
      const started = process.hrtime.bigint();
      engine.generate(difficulty, 's' + i);
      times.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    const max = times[times.length - 1];
    if (max >= 300) slow = true;
    console.log(id.padEnd(12) + difficulty.padEnd(10) + median.toFixed(1).padStart(8) + max.toFixed(1).padStart(8) + (max >= 300 ? '  SLOW' : ''));
  }
}
process.exit(slow ? 1 : 0);
