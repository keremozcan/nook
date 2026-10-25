(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, shuffle } = R;

  function bitIndex(bit) {
    let i = 0;
    while (bit > 1) {
      bit >>= 1;
      i++;
    }
    return i;
  }

  function boxAt(r, c, boxR, boxC, size) {
    return Math.floor(r / boxR) * (size / boxC) + Math.floor(c / boxC);
  }

  function count(grid, boxR, boxC, limit) {
    const size = grid.length;
    const all = (1 << size) - 1;
    const rows = Array(size).fill(0);
    const cols = Array(size).fill(0);
    const boxes = Array(size).fill(0);
    const empties = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const d = grid[r][c];
        if (!d) {
          empties.push(r * size + c);
          continue;
        }
        const bit = 1 << (d - 1);
        const b = boxAt(r, c, boxR, boxC, size);
        if ((rows[r] & bit) || (cols[c] & bit) || (boxes[b] & bit)) return 0;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
      }
    }
    let found = 0;
    let nodes = 0;
    function bt() {
      if (found >= limit) return;
      if (++nodes > 250000) {
        found = -1;
        return;
      }
      let best = -1;
      let bestMask = 0;
      let bestBits = 99;
      for (let i = 0; i < empties.length; i++) {
        const cell = empties[i];
        const r = (cell / size) | 0;
        const c = cell % size;
        if (grid[r][c]) continue;
        const mask = all ^ (rows[r] | cols[c] | boxes[boxAt(r, c, boxR, boxC, size)]);
        if (!mask) return;
        let bits = 0;
        let m = mask;
        while (m) {
          bits++;
          m &= m - 1;
        }
        if (bits < bestBits) {
          bestBits = bits;
          best = cell;
          bestMask = mask;
          if (bits === 1) break;
        }
      }
      if (best < 0) {
        found++;
        return;
      }
      const r = (best / size) | 0;
      const c = best % size;
      const b = boxAt(r, c, boxR, boxC, size);
      let mask = bestMask;
      while (mask) {
        const bit = mask & -mask;
        mask ^= bit;
        const d = bitIndex(bit) + 1;
        grid[r][c] = d;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
        bt();
        grid[r][c] = 0;
        rows[r] ^= bit;
        cols[c] ^= bit;
        boxes[b] ^= bit;
        if (found >= limit || found < 0) return;
      }
    }
    bt();
    return found;
  }

  function fill(size, boxR, boxC, rng) {
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    const all = (1 << size) - 1;
    const rows = Array(size).fill(0);
    const cols = Array(size).fill(0);
    const boxes = Array(size).fill(0);
    const cells = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);
    function bt(i) {
      if (i === cells.length) return true;
      const r = cells[i][0];
      const c = cells[i][1];
      const b = boxAt(r, c, boxR, boxC, size);
      let mask = all ^ (rows[r] | cols[c] | boxes[b]);
      const bits = [];
      while (mask) {
        const bit = mask & -mask;
        mask ^= bit;
        bits.push(bit);
      }
      for (const bit of shuffle(rng, bits)) {
        grid[r][c] = bitIndex(bit) + 1;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
        if (bt(i + 1)) return true;
        rows[r] ^= bit;
        cols[c] ^= bit;
        boxes[b] ^= bit;
        grid[r][c] = 0;
      }
      return false;
    }
    return bt(0) ? grid : null;
  }

  const SPEC = {
    mini: { size: 6, boxR: 2, boxC: 3, aim: 15, max: 26, min: 12, logic: 2 },
    easy: { size: 9, boxR: 3, boxC: 3, aim: 36, max: 50, min: 32, logic: 2 },
    tricky: { size: 9, boxR: 3, boxC: 3, aim: 28, max: 40, min: 26, logic: 2 },
    fiendish: { size: 9, boxR: 3, boxC: 3, aim: 24, max: 34, min: 22, logic: 2 },
  };

  function masksOf(grid, boxR, boxC) {
    const size = grid.length;
    const all = (1 << size) - 1;
    const rows = Array(size).fill(0);
    const cols = Array(size).fill(0);
    const boxes = Array(size).fill(0);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) continue;
        const bit = 1 << (grid[r][c] - 1);
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[boxAt(r, c, boxR, boxC, size)] |= bit;
      }
    }
    const masks = Array.from({ length: size }, () => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c]) continue;
        masks[r][c] = all ^ (rows[r] | cols[c] | boxes[boxAt(r, c, boxR, boxC, size)]);
      }
    }
    return masks;
  }

  function logicSolve(grid, boxR, boxC, level) {
    const g = grid.map((row) => row.slice());
    const size = g.length;
    for (let guard = 0; guard < size * size * 3; guard++) {
      const masks = masksOf(g, boxR, boxC);
      let empty = 0;
      let moved = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (g[r][c]) continue;
          empty++;
          const mask = masks[r][c];
          if (!mask) return false;
          if ((mask & (mask - 1)) === 0) {
            g[r][c] = bitIndex(mask) + 1;
            moved = true;
          }
        }
      }
      if (!empty) return true;
      if (moved) continue;
      if (level < 2) return false;
      const groups = [];
      for (let i = 0; i < size; i++) {
        const row = [];
        const col = [];
        for (let j = 0; j < size; j++) {
          if (!g[i][j]) row.push([i, j]);
          if (!g[j][i]) col.push([j, i]);
        }
        groups.push(row, col);
      }
      for (let br = 0; br < size; br += boxR) {
        for (let bc = 0; bc < size; bc += boxC) {
          const box = [];
          for (let r = br; r < br + boxR; r++) {
            for (let c = bc; c < bc + boxC; c++) if (!g[r][c]) box.push([r, c]);
          }
          groups.push(box);
        }
      }
      for (let gi = 0; gi < groups.length && !moved; gi++) {
        const where = new Map();
        groups[gi].forEach(([r, c]) => {
          let m = masks[r][c];
          while (m) {
            const bit = m & -m;
            m ^= bit;
            if (!where.has(bit)) where.set(bit, []);
            where.get(bit).push([r, c]);
          }
        });
        where.forEach((spots, bit) => {
          if (spots.length !== 1) return;
          g[spots[0][0]][spots[0][1]] = bitIndex(bit) + 1;
          moved = true;
        });
      }
      if (!moved) return false;
    }
    return false;
  }

  function generate(difficulty, seed) {
    const spec = SPEC[difficulty];
    for (let attempt = 0; attempt < 20; attempt++) {
      const rng = makeRng(String(seed) + ':sudoku:' + difficulty + ':' + attempt);
      const solution = fill(spec.size, spec.boxR, spec.boxC, rng);
      if (!solution) continue;
      const givens = solution.map((row) => row.slice());
      const cells = [];
      for (let r = 0; r < spec.size; r++) for (let c = 0; c < spec.size; c++) cells.push([r, c]);
      let filled = spec.size * spec.size;
      for (const [r, c] of shuffle(rng, cells)) {
        if (filled <= spec.aim) break;
        const saved = givens[r][c];
        givens[r][c] = 0;
        const found = count(givens, spec.boxR, spec.boxC, 2);
        if (found !== 1 || !logicSolve(givens, spec.boxR, spec.boxC, spec.logic)) givens[r][c] = saved;
        else filled--;
      }
      if (filled < spec.min || filled > spec.max) continue;
      if (!logicSolve(givens, spec.boxR, spec.boxC, spec.logic)) continue;
      return {
        game: 'sudoku',
        difficulty,
        seed,
        size: spec.size,
        boxR: spec.boxR,
        boxC: spec.boxC,
        givens,
        solution,
      };
    }
    throw new Error('sudoku: no unique puzzle');
  }

  return {
    id: 'sudoku',
    name: 'Sudoku',
    tagline: 'The classic, and the little one.',
    difficulties: [
      { id: 'mini', label: 'Mini' },
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
