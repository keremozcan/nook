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
    mini: { size: 6, boxR: 2, boxC: 3, tier: 1, aim: 15, max: 26, min: 12 },
    easy: { size: 9, boxR: 3, boxC: 3, tier: 1, aim: 38, max: 50, min: 32 },
    tricky: { size: 9, boxR: 3, boxC: 3, tier: 2, aim: 33, max: 40, min: 29 },
    fiendish: { size: 9, boxR: 3, boxC: 3, tier: 3, aim: 28, max: 32, min: 24 },
  };

  function popcount(mask) {
    let n = 0;
    while (mask) {
      mask &= mask - 1;
      n++;
    }
    return n;
  }

  const layouts = {};

  // Cell indices for every row, column and box, and the box of each cell.
  function layout(size, boxR, boxC) {
    const key = size + ':' + boxR + ':' + boxC;
    if (layouts[key]) return layouts[key];
    const rows = [];
    const cols = [];
    const boxes = Array.from({ length: size }, () => []);
    const boxOf = [];
    for (let i = 0; i < size; i++) {
      rows.push([]);
      cols.push([]);
      for (let j = 0; j < size; j++) {
        rows[i].push(i * size + j);
        cols[i].push(j * size + i);
      }
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const b = boxAt(r, c, boxR, boxC, size);
        boxes[b].push(r * size + c);
        boxOf.push(b);
      }
    }
    const peers = [];
    for (let i = 0; i < size * size; i++) {
      const r = (i / size) | 0;
      const c = i % size;
      const set = new Set(rows[r].concat(cols[c], boxes[boxOf[i]]));
      set.delete(i);
      peers.push(Array.from(set));
    }
    const units = rows.concat(cols, boxes);
    layouts[key] = { rows, cols, boxes, boxOf, peers, units };
    return layouts[key];
  }

  // Solve the way a person would, always using the easiest technique that makes progress:
  // tier 1 naked and hidden singles, tier 2 locked candidates (pointing and claiming),
  // tier 3 naked and hidden pairs. Returns false on a contradiction, otherwise
  // { solved, hardest, moves } where hardest is the highest tier the solve needed.
  function logicSolve(grid, boxR, boxC, maxTier) {
    const size = grid.length;
    const all = (1 << size) - 1;
    const { rows, cols, boxes, boxOf, peers, units } = layout(size, boxR, boxC);
    const values = [];
    const cand = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) values.push(grid[r][c] || 0);
    for (let i = 0; i < values.length; i++) {
      let mask = values[i] ? 0 : all;
      if (!values[i]) for (const p of peers[i]) if (values[p]) mask &= ~(1 << (values[p] - 1));
      cand.push(mask);
    }
    let empty = values.filter((v) => !v).length;
    let hardest = 0;
    let moves = 0;

    function place(i, bit) {
      values[i] = bitIndex(bit) + 1;
      cand[i] = 0;
      for (const p of peers[i]) cand[p] &= ~bit;
      empty--;
      moves++;
    }

    function singles() {
      for (let i = 0; i < cand.length; i++) {
        if (values[i]) continue;
        if (!cand[i]) return -1;
        if ((cand[i] & (cand[i] - 1)) === 0) {
          place(i, cand[i]);
          return 1;
        }
      }
      for (const unit of units) {
        let once = 0;
        let twice = 0;
        let have = 0;
        for (const i of unit) {
          if (values[i]) have |= 1 << (values[i] - 1);
          twice |= once & cand[i];
          once |= cand[i];
        }
        if ((once | have) !== all) return -1;
        const only = once & ~twice;
        if (only) {
          const bit = only & -only;
          for (const i of unit) if (cand[i] & bit) place(i, bit);
          return 1;
        }
      }
      return 0;
    }

    // Remove bit from every cell of `cells` not in `keep`; true if anything changed.
    function strip(cells, keep, bit) {
      let changed = false;
      for (const i of cells) {
        if (keep.indexOf(i) === -1 && (cand[i] & bit)) {
          cand[i] &= ~bit;
          changed = true;
        }
      }
      return changed;
    }

    function lockedCandidates() {
      for (let d = 0; d < size; d++) {
        const bit = 1 << d;
        for (const box of boxes) {
          const spots = box.filter((i) => cand[i] & bit);
          if (spots.length < 2) continue;
          const r = (spots[0] / size) | 0;
          const c = spots[0] % size;
          if (spots.every((i) => ((i / size) | 0) === r) && strip(rows[r], spots, bit)) return true;
          if (spots.every((i) => i % size === c) && strip(cols[c], spots, bit)) return true;
        }
        for (const line of rows.concat(cols)) {
          const spots = line.filter((i) => cand[i] & bit);
          if (spots.length < 2) continue;
          const b = boxOf[spots[0]];
          if (spots.every((i) => boxOf[i] === b) && strip(boxes[b], spots, bit)) return true;
        }
      }
      return false;
    }

    function pairs() {
      for (const unit of units) {
        const open = unit.filter((i) => !values[i]);
        for (let x = 0; x < open.length; x++) {
          const m = cand[open[x]];
          if (popcount(m) !== 2) continue;
          for (let y = x + 1; y < open.length; y++) {
            if (cand[open[y]] !== m) continue;
            let changed = false;
            for (const i of open) {
              if (i !== open[x] && i !== open[y] && (cand[i] & m)) {
                cand[i] &= ~m;
                changed = true;
              }
            }
            if (changed) return true;
          }
        }
      }
      for (const unit of units) {
        const where = [];
        for (let d = 0; d < size; d++) where.push(unit.filter((i) => cand[i] & (1 << d)));
        for (let a = 0; a < size; a++) {
          if (where[a].length !== 2) continue;
          for (let b = a + 1; b < size; b++) {
            if (where[b].length !== 2 || where[b][0] !== where[a][0] || where[b][1] !== where[a][1]) continue;
            const keep = (1 << a) | (1 << b);
            let changed = false;
            for (const i of where[a]) {
              if (cand[i] & ~keep) {
                cand[i] &= keep;
                changed = true;
              }
            }
            if (changed) return true;
          }
        }
      }
      return false;
    }

    while (empty) {
      const step = singles();
      if (step < 0) return false;
      if (step) {
        hardest = Math.max(hardest, 1);
        continue;
      }
      if (maxTier >= 2 && lockedCandidates()) {
        hardest = Math.max(hardest, 2);
        continue;
      }
      if (maxTier >= 3 && pairs()) {
        hardest = Math.max(hardest, 3);
        continue;
      }
      break;
    }
    return { solved: empty === 0, hardest, moves };
  }

  function generate(difficulty, seed) {
    const spec = SPEC[difficulty];
    for (let attempt = 0; attempt < 200; attempt++) {
      const rng = makeRng(String(seed) + ':sudoku:' + difficulty + ':' + attempt);
      const solution = fill(spec.size, spec.boxR, spec.boxC, rng);
      if (!solution) continue;
      const givens = solution.map((row) => row.slice());
      const cells = [];
      for (let r = 0; r < spec.size; r++) for (let c = 0; c < spec.size; c++) cells.push([r, c]);
      let filled = spec.size * spec.size;
      let rating = { solved: true, hardest: 0, moves: 0 };
      // A puzzle the solver finishes without guessing has exactly one solution.
      for (const [r, c] of shuffle(rng, cells)) {
        if (filled <= spec.min || (filled <= spec.aim && rating.hardest === spec.tier)) break;
        const saved = givens[r][c];
        givens[r][c] = 0;
        const next = logicSolve(givens, spec.boxR, spec.boxC, spec.tier);
        if (next && next.solved) {
          rating = next;
          filled--;
        } else {
          givens[r][c] = saved;
        }
      }
      if (filled > spec.max || rating.hardest !== spec.tier) continue;
      return {
        game: 'sudoku',
        difficulty,
        seed,
        size: spec.size,
        boxR: spec.boxR,
        boxC: spec.boxC,
        givens,
        solution,
        rating: { tier: rating.hardest, logicalSteps: rating.moves },
      };
    }
    throw new Error('sudoku: no unique puzzle');
  }

  return {
    id: 'sudoku',
    name: 'Sudoku',
    difficulties: [
      { id: 'mini', label: 'Mini' },
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    assess(grid, boxR, boxC, maxTier) { return logicSolve(grid, boxR, boxC, maxTier || 3); },
    generate,
  };
});
