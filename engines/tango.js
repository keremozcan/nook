(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, shuffle } = R;

  function patterns(n) {
    const half = n / 2;
    const out = [];
    function bt(i, suns, run, prev, acc) {
      if (i === n) {
        if (suns === half) out.push(acc.slice());
        return;
      }
      for (let bit = 0; bit <= 1; bit++) {
        const nrun = bit === prev ? run + 1 : 1;
        if (nrun >= 3) continue;
        const ns = suns + bit;
        if (ns > half) continue;
        if (n - i - 1 < half - ns) continue;
        acc.push(bit);
        bt(i + 1, ns, nrun, bit, acc);
        acc.pop();
      }
    }
    bt(0, 0, 0, -1, []);
    return out;
  }

  const ROWS = { 6: patterns(6) };

  function fill(n, rng) {
    const pats = ROWS[n];
    const half = n / 2;
    const grid = Array.from({ length: n }, () => Array(n).fill(0));
    const colSuns = Array(n).fill(0);
    const colRun = Array(n).fill(0);
    const colPrev = Array(n).fill(-1);
    function bt(r) {
      if (r === n) return colSuns.every((s) => s === half);
      const options = shuffle(rng, pats);
      for (const row of options) {
        let ok = true;
        for (let c = 0; c < n; c++) {
          const bit = row[c];
          if (colSuns[c] + bit > half) ok = false;
          const run = bit === colPrev[c] ? colRun[c] + 1 : 1;
          if (run >= 3) ok = false;
          if (!ok) break;
        }
        if (!ok) continue;
        const saved = [];
        for (let c = 0; c < n; c++) {
          saved.push([colSuns[c], colRun[c], colPrev[c]]);
          grid[r][c] = row[c];
          colSuns[c] += row[c];
          colRun[c] = row[c] === colPrev[c] ? colRun[c] + 1 : 1;
          colPrev[c] = row[c];
        }
        if (bt(r + 1)) return true;
        for (let c = 0; c < n; c++) {
          colSuns[c] = saved[c][0];
          colRun[c] = saved[c][1];
          colPrev[c] = saved[c][2];
        }
      }
      return false;
    }
    return bt(0) ? grid : null;
  }

  function toNames(grid) {
    return grid.map((row) => row.map((bit) => (bit ? 'sun' : 'moon')));
  }

  function count(n, givens, h, v) {
    const pats = ROWS[n];
    const half = n / 2;
    let found = 0;
    let nodes = 0;
    const colSuns = Array(n).fill(0);
    const colRun = Array(n).fill(0);
    const colPrev = Array(n).fill(-1);
    function bt(r) {
      if (found >= 2) return;
      if (++nodes > 200000) {
        found = -1;
        return;
      }
      if (r === n) {
        if (colSuns.every((s) => s === half)) found++;
        return;
      }
      for (const row of pats) {
        let ok = true;
        for (let c = 0; c < n && ok; c++) {
          const bit = row[c];
          const given = givens[r][c];
          if (given === 'sun' && bit !== 1) ok = false;
          if (given === 'moon' && bit !== 0) ok = false;
          if (colSuns[c] + bit > half) ok = false;
          const run = bit === colPrev[c] ? colRun[c] + 1 : 1;
          if (run >= 3) ok = false;
          if (c < n - 1 && h[r][c] === 'eq' && bit !== row[c + 1]) ok = false;
          if (c < n - 1 && h[r][c] === 'neq' && bit === row[c + 1]) ok = false;
          if (r > 0 && v[r - 1][c] === 'eq' && bit !== colPrev[c]) ok = false;
          if (r > 0 && v[r - 1][c] === 'neq' && bit === colPrev[c]) ok = false;
        }
        if (!ok) continue;
        const saved = [];
        for (let c = 0; c < n; c++) {
          saved.push([colSuns[c], colRun[c], colPrev[c]]);
          colSuns[c] += row[c];
          colRun[c] = row[c] === colPrev[c] ? colRun[c] + 1 : 1;
          colPrev[c] = row[c];
        }
        bt(r + 1);
        for (let c = 0; c < n; c++) {
          colSuns[c] = saved[c][0];
          colRun[c] = saved[c][1];
          colPrev[c] = saved[c][2];
        }
        if (found >= 2 || found < 0) return;
      }
    }
    bt(0);
    return found;
  }

  function generate(difficulty, seed) {
    const n = 6;
    const target = difficulty === 'easy' ? 8 : difficulty === 'tricky' ? 5 : 4;
    for (let attempt = 0; attempt < 20; attempt++) {
      const rng = makeRng(String(seed) + ':tango:' + difficulty + ':' + attempt);
      const bits = fill(n, rng);
      if (!bits) continue;
      const rowKeys = bits.map((row) => row.join(''));
      const copies = {};
      rowKeys.forEach((key) => { copies[key] = (copies[key] || 0) + 1; });
      if (Object.values(copies).some((times) => times >= 3)) continue;
      const solution = toNames(bits);
      const givens = solution.map((row) => row.slice());
      const h = Array.from({ length: n }, () => Array(n - 1).fill(null));
      const v = Array.from({ length: n - 1 }, () => Array(n).fill(null));
      const edges = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n - 1; c++) edges.push(['h', r, c]);
        if (r < n - 1) for (let c = 0; c < n; c++) edges.push(['v', r, c]);
      }
      const chosen = shuffle(rng, edges).slice(0, difficulty === 'easy' ? 6 : 5);
      let sameMarks = 0;
      let differMarks = 0;
      for (const [axis, r, c] of chosen) {
        const same = axis === 'h' ? solution[r][c] === solution[r][c + 1] : solution[r][c] === solution[r + 1][c];
        const mark = same ? 'eq' : 'neq';
        if (same) sameMarks++;
        else differMarks++;
        if (axis === 'h') h[r][c] = mark;
        else v[r][c] = mark;
      }
      if (sameMarks < 2 || differMarks < 2) continue;
      const cells = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);
      let filled = n * n;
      for (const [r, c] of shuffle(rng, cells)) {
        if (filled <= target) break;
        const saved = givens[r][c];
        givens[r][c] = null;
        const found = count(n, givens, h, v);
        if (found !== 1) givens[r][c] = saved;
        else filled--;
      }
      if (filled > n * n - 4) continue;
      if (count(n, givens, h, v) !== 1) continue;
      return { game: 'tango', difficulty, seed, n, givens, h, v, solution };
    }
    throw new Error('tango: no unique puzzle');
  }

  return {
    id: 'tango',
    name: 'Tango',
    tagline: 'Suns and moons, in balance.',
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
