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

  const ROWS = { 4: patterns(4), 6: patterns(6), 8: patterns(8) };

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

  const MASKS = { 4: ROWS[4].map(toMask), 6: ROWS[6].map(toMask), 8: ROWS[8].map(toMask) };

  function toMask(row) {
    let m = 0;
    for (let c = 0; c < row.length; c++) if (row[c]) m |= 1 << c;
    return m;
  }

  // Count solutions (stopping at 2; -1 if the search gives up). Rows are bitmasks (bit c set =
  // sun in column c); the givens and the marks inside a row are applied once per row up front.
  function count(n, givens, h, v) {
    const half = n / 2;
    const full = (1 << n) - 1;
    const rows = [];
    const veq = [];
    const vneq = [];
    for (let r = 0; r < n; r++) {
      let sun = 0;
      let moon = 0;
      let eq = 0;
      let neq = 0;
      for (let c = 0; c < n; c++) {
        if (givens[r][c] === 'sun') sun |= 1 << c;
        if (givens[r][c] === 'moon') moon |= 1 << c;
        if (c < n - 1 && h[r][c] === 'eq') eq |= 1 << c;
        if (c < n - 1 && h[r][c] === 'neq') neq |= 1 << c;
      }
      rows.push(MASKS[n].filter((x) => (x & sun) === sun && (x & moon) === 0 &&
        ((x ^ (x >> 1)) & eq) === 0 && ((x ^ (x >> 1)) & neq) === neq));
      let ve = 0;
      let vn = 0;
      if (r > 0) {
        for (let c = 0; c < n; c++) {
          if (v[r - 1][c] === 'eq') ve |= 1 << c;
          if (v[r - 1][c] === 'neq') vn |= 1 << c;
        }
      }
      veq.push(ve);
      vneq.push(vn);
    }
    const suns = Array(n).fill(0);
    let found = 0;
    let nodes = 0;
    function bt(r, prev, prev2) {
      if (++nodes > 200000) {
        found = -1;
        return;
      }
      if (r === n) {
        found++;
        return;
      }
      for (const x of rows[r]) {
        if (r > 0) {
          const d = x ^ prev;
          if ((d & veq[r]) !== 0 || (d & vneq[r]) !== vneq[r]) continue;
        }
        if (r > 1 && ((x & prev & prev2) !== 0 || (~x & ~prev & ~prev2 & full) !== 0)) continue;
        let ok = true;
        for (let c = 0; c < n; c++) {
          const s = suns[c] + ((x >> c) & 1);
          if (s > half || r + 1 - s > half) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        for (let c = 0; c < n; c++) suns[c] += (x >> c) & 1;
        bt(r + 1, x, prev);
        for (let c = 0; c < n; c++) suns[c] -= (x >> c) & 1;
        if (found >= 2 || found < 0) return;
      }
    }
    bt(0, 0, 0);
    return found;
  }

  function generate(difficulty, seed) {
    // Difficulty changes the actual board size; larger boards add both more
    // deductions and more places for the balancing/run rules to interact.
    const n = difficulty === 'easy' ? 4 : difficulty === 'tricky' ? 6 : 8;
    const target = difficulty === 'easy' ? 5 : difficulty === 'tricky' ? 8 : 12;
    const markTarget = difficulty === 'easy' ? 4 : difficulty === 'tricky' ? 7 : 10;
    for (let attempt = 0; attempt < 2000; attempt++) {
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
      const chosen = shuffle(rng, edges).slice(0, markTarget);
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
      return {
        game: 'tango', difficulty, seed, n, givens, h, v, solution,
        rating: { size: n, givens: filled, relationMarks: chosen.length },
      };
    }
    throw new Error('tango: no unique puzzle');
  }

  return {
    id: 'tango',
    name: 'Tango',
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
