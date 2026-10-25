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
    mini: { size: 6, boxR: 2, boxC: 3, aim: 15, max: 26, min: 12 },
    easy: { size: 9, boxR: 3, boxC: 3, aim: 38, max: 50, min: 32 },
    tricky: { size: 9, boxR: 3, boxC: 3, aim: 33, max: 40, min: 29 },
    fiendish: { size: 9, boxR: 3, boxC: 3, aim: 28, max: 32, min: 24 },
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

  // Human-style deterministic solve rating: naked singles (1), hidden
  // singles/locked candidates (2), then naked pairs (3).
  function logicSolve(grid, boxR, boxC, maxTier) {
    const g = grid.map((row) => row.slice());
    const size = g.length;
    let hardest = 0;
    let moves = 0;
    let candidateMasks = null;
    const bitCount = (mask) => { let n = 0; while (mask) { mask &= mask - 1; n++; } return n; };
    const units = () => {
      const out = [];
      for (let i = 0; i < size; i++) {
        const row = [], col = [];
        for (let j = 0; j < size; j++) { row.push([i, j]); col.push([j, i]); }
        out.push(row, col);
      }
      for (let br = 0; br < size; br += boxR) for (let bc = 0; bc < size; bc += boxC) {
        const box = [];
        for (let r = br; r < br + boxR; r++) for (let c = bc; c < bc + boxC; c++) box.push([r, c]);
        out.push(box);
      }
      return out;
    };
    const groups = units();
    const place = (r, c, bit) => {
      g[r][c] = bitIndex(bit) + 1;
      candidateMasks[r][c] = 0;
      for (let i = 0; i < size; i++) {
        candidateMasks[r][i] &= ~bit;
        candidateMasks[i][c] &= ~bit;
      }
      const br = Math.floor(r / boxR) * boxR, bc = Math.floor(c / boxC) * boxC;
      for (let rr = br; rr < br + boxR; rr++) for (let cc = bc; cc < bc + boxC; cc++) candidateMasks[rr][cc] &= ~bit;
    };
    for (let guard = 0; guard < size * size * 3; guard++) {
      if (!candidateMasks) candidateMasks = masksOf(g, boxR, boxC);
      const masks = candidateMasks;
      let empty = 0;
      let placed = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (g[r][c]) continue;
          empty++;
          const mask = masks[r][c];
          if (!mask) return false;
          if ((mask & (mask - 1)) === 0) {
            place(r, c, mask);
            hardest = Math.max(hardest, 1);
            moves++;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (!empty) return { solved: true, hardest, moves };
      if (placed) continue;

      if (maxTier >= 2) {
        // Hidden singles are the first step beyond checking each cell alone.
        for (const group of groups) {
          const spots = new Map();
          for (const [r, c] of group) if (!g[r][c]) {
            let m = masks[r][c];
            while (m) { const bit = m & -m; m ^= bit; if (!spots.has(bit)) spots.set(bit, []); spots.get(bit).push([r, c]); }
          }
          for (const [bit, cells] of spots) if (cells.length === 1) {
            place(cells[0][0], cells[0][1], bit);
            hardest = Math.max(hardest, 2); moves++; placed = true; break;
          }
          if (placed) break;
        }
        if (placed) continue;
      }

      // Locked candidate: all possible locations for a digit in a box lie
      // on one row/column, so remove it from the rest of that line.
      let eliminated = false;
      if (maxTier >= 2) {
        for (let br = 0; br < size && !eliminated; br += boxR) for (let bc = 0; bc < size && !eliminated; bc += boxC) {
          const cells = [];
          for (let r = br; r < br + boxR; r++) for (let c = bc; c < bc + boxC; c++) if (!g[r][c]) cells.push([r, c]);
          for (let d = 0; d < size && !eliminated; d++) {
            const bit = 1 << d, spots = cells.filter(([r,c]) => masks[r][c] & bit);
            if (spots.length < 2) continue;
            if (spots.every(([r]) => r === spots[0][0])) {
              const row = spots[0][0];
              for (let c = 0; c < size; c++) if ((c < bc || c >= bc + boxC) && !g[row][c] && (masks[row][c] & bit)) { masks[row][c] &= ~bit; eliminated = true; break; }
            } else if (spots.every(([,c]) => c === spots[0][1])) {
              const col = spots[0][1];
              for (let r = 0; r < size; r++) if ((r < br || r >= br + boxR) && !g[r][col] && (masks[r][col] & bit)) { masks[r][col] &= ~bit; eliminated = true; break; }
            }
          }
        }
        if (eliminated) { hardest = Math.max(hardest, 2); continue; }
      }

      // Naked pairs are a compact but meaningful intermediate technique.
      if (maxTier >= 3) {
        for (const group of groups) {
          const pairs = new Map();
          for (const [r,c] of group) if (!g[r][c] && bitCount(masks[r][c]) === 2) {
            const m = masks[r][c]; pairs.set(m, (pairs.get(m) || 0) + 1);
          }
          for (const [pair, n] of pairs) if (n === 2) {
            for (const [r,c] of group) if (!g[r][c] && masks[r][c] !== pair && (masks[r][c] & pair)) {
              masks[r][c] &= ~pair; eliminated = true; break;
            }
            if (eliminated) break;
          }
          if (eliminated) break;
        }
        if (eliminated) { hardest = Math.max(hardest, 3); continue; }
      }
      return false;
    }
    return { solved: g.every((row) => row.every(Boolean)), hardest, moves };
  }

  function generate(difficulty, seed) {
    const spec = SPEC[difficulty];
    for (let attempt = 0; attempt < 120; attempt++) {
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
        const rating = logicSolve(givens, spec.boxR, spec.boxC, 3);
        const targetOk = difficulty === 'mini' || difficulty !== 'easy' || (rating && rating.hardest <= 1);
        if (found !== 1 || !rating || !rating.solved || !targetOk) givens[r][c] = saved;
        else filled--;
      }
      if (filled < spec.min || filled > spec.max) continue;
      const rating = logicSolve(givens, spec.boxR, spec.boxC, 3);
      if (!rating || !rating.solved) continue;
      if (difficulty === 'easy' && rating.hardest > 1) continue;
      if (difficulty === 'tricky' && rating.hardest !== 2) continue;
      if (difficulty === 'fiendish' && rating.hardest !== 3) continue;
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
    tagline: 'The classic, and the little one.',
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
