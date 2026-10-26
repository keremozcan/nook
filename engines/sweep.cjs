/* Every game and level over real-format seeds (word-word-digit, as freshSeed in ui/shell.js makes them).
   Fails if any generation throws or any worst case reaches 300 ms.
   Usage: node engines/sweep.cjs [game] [level]  (NOOK_SWEEP = number of seeds, default 1560; NOOK_SWEEP_MS = time limit, default 300). */
const fs = require('fs');
const path = require('path');

const GAMES = ['zip', 'queens', 'tango', 'sudoku', 'patches', 'murdoku', 'pinpoint', 'crossclimb', 'wend'];
const shell = fs.readFileSync(path.join(__dirname, '..', 'ui', 'shell.js'), 'utf8');
const WORDS = JSON.parse(shell.match(/const WORDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
const total = Number(process.env.NOOK_SWEEP || 1560);
const limit = Number(process.env.NOOK_SWEEP_MS || 300);
const [only, onlyLevel] = process.argv.slice(2);

const seeds = [];
for (let d = 1; d <= 9 && seeds.length < total; d++) {
  for (let i = 0; i < WORDS.length && seeds.length < total; i++) {
    for (let j = 0; j < WORDS.length && seeds.length < total; j++) {
      if (i !== j) seeds.push(WORDS[j] + '-' + WORDS[i] + '-' + d);
    }
  }
}

let bad = false;
console.log('game        level       fails  >' + limit + 'ms  median     max  worst seed   (' + seeds.length + ' seeds)');
for (const id of GAMES) {
  if (only && id !== only) continue;
  const engine = require(path.join(__dirname, id + '.js'));
  for (const { id: level } of engine.difficulties) {
    if (onlyLevel && level !== onlyLevel) continue;
    const times = [];
    const fails = [];
    let slow = 0;
    let worst = '';
    let max = 0;
    for (const seed of seeds) {
      const t = process.hrtime.bigint();
      try { engine.generate(level, seed); } catch (err) { fails.push(seed + ': ' + err.message); }
      const ms = Number(process.hrtime.bigint() - t) / 1e6;
      times.push(ms);
      if (ms >= limit) slow++;
      if (ms > max) { max = ms; worst = seed; }
    }
    times.sort((a, b) => a - b);
    if (fails.length || slow) bad = true;
    console.log(id.padEnd(12) + level.padEnd(10) + String(fails.length).padStart(6) + String(slow).padStart(8) +
      times[times.length >> 1].toFixed(1).padStart(8) + max.toFixed(0).padStart(8) + '  ' + worst +
      (fails.length ? '  FAIL ' + fails.slice(0, 3).join(' | ') : ''));
  }
}
process.exit(bad ? 1 : 0);
