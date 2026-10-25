(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, shuffle, int } = R;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function placeQueens(n, rng) {
    const order = Array.from({ length: n }, () => shuffle(rng, Array.from({ length: n }, (_, i) => i)));
    const cols = Array(n).fill(-1);
    function bt(r) {
      if (r === n) return true;
      for (const c of order[r]) {
        let ok = true;
        for (let i = 0; i < r; i++) {
          if (cols[i] === c || Math.abs(cols[i] - c) === r - i) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        cols[r] = c;
        if (bt(r + 1)) return true;
      }
      cols[r] = -1;
      return false;
    }
    if (!bt(0)) return null;
    return cols.map((c, r) => [r, c]);
  }

  function grow(queens, n, rng) {
    const region = Array.from({ length: n }, () => Array(n).fill(-1));
    queens.forEach(([r, c], i) => {
      region[r][c] = i;
    });
    let empty = n * n - n;
    let spins = 0;
    const limit = n * n * n * 4;
    while (empty > 0 && spins < limit) {
      spins++;
      const sizes = Array(n).fill(0);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (region[r][c] >= 0) sizes[region[r][c]]++;
      let bestId = -1;
      let bestSize = 1e9;
      let bestOptions = null;
      for (let id = 0; id < n; id++) {
        const options = [];
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (region[r][c] !== id) continue;
            for (const [dr, dc] of DIRS) {
              const rr = r + dr;
              const cc = c + dc;
              if (rr >= 0 && cc >= 0 && rr < n && cc < n && region[rr][cc] < 0) options.push([rr, cc]);
            }
          }
        }
        if (!options.length || sizes[id] > bestSize) continue;
        bestSize = sizes[id];
        bestId = id;
        bestOptions = options;
      }
      if (!bestOptions) return null;
      const pick = bestOptions[int(rng, 0, bestOptions.length - 1)];
      region[pick[0]][pick[1]] = bestId;
      empty--;
    }
    return empty === 0 ? region : null;
  }

  function count(regions, limit) {
    const n = regions.length;
    const cap = limit || 2;
    const usedC = Array(n).fill(false);
    const usedR = Array(n).fill(false);
    const d1 = Array(2 * n).fill(false);
    const d2 = Array(2 * n).fill(false);
    let found = 0;
    function bt(r) {
      if (found >= cap) return;
      if (r === n) {
        found++;
        return;
      }
      for (let c = 0; c < n; c++) {
        if (usedC[c]) continue;
        const reg = regions[r][c];
        if (usedR[reg]) continue;
        const a = r + c;
        const b = r - c + n - 1;
        if (d1[a] || d2[b]) continue;
        usedC[c] = d1[a] = d2[b] = usedR[reg] = true;
        bt(r + 1);
        usedC[c] = d1[a] = d2[b] = usedR[reg] = false;
        if (found >= cap) return;
      }
    }
    bt(0);
    return found;
  }

  function isQueen(queens, r, c) {
    for (let i = 0; i < queens.length; i++) {
      if (queens[i][0] === r && queens[i][1] === c) return true;
    }
    return false;
  }

  function canLeave(region, r, c) {
    const n = region.length;
    const id = region[r][c];
    let start = null;
    let size = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (region[i][j] !== id || (i === r && j === c)) continue;
        size++;
        if (!start) start = [i, j];
      }
    }
    if (!start) return false;
    const seen = new Set();
    const q = [start];
    seen.add(start[0] + ',' + start[1]);
    for (let i = 0; i < q.length; i++) {
      const rr = q[i][0];
      const cc = q[i][1];
      for (const [dr, dc] of DIRS) {
        const r2 = rr + dr;
        const c2 = cc + dc;
        if (r2 < 0 || c2 < 0 || r2 >= n || c2 >= n || (r2 === r && c2 === c)) continue;
        if (region[r2][c2] !== id) continue;
        const key = r2 + ',' + c2;
        if (seen.has(key)) continue;
        seen.add(key);
        q.push([r2, c2]);
      }
    }
    return seen.size === size;
  }

  function repair(region, queens, rng) {
    const n = region.length;
    let score = count(region, 8);
    for (let round = 0; round < 30; round++) {
      if (score === 1) return true;
      const moves = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (isQueen(queens, r, c)) continue;
          const id = region[r][c];
          for (const [dr, dc] of DIRS) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
            if (region[rr][cc] !== id) moves.push([r, c, region[rr][cc]]);
          }
        }
      }
      const sample = shuffle(rng, moves).slice(0, 28);
      let best = null;
      let bestScore = score;
      for (const move of sample) {
        if (!canLeave(region, move[0], move[1])) continue;
        const old = region[move[0]][move[1]];
        region[move[0]][move[1]] = move[2];
        const next = count(region, 8);
        region[move[0]][move[1]] = old;
        if (next > 0 && next < bestScore) {
          best = move;
          bestScore = next;
          if (next === 1) break;
        }
      }
      if (best) {
        region[best[0]][best[1]] = best[2];
        score = bestScore;
        continue;
      }
      const legal = sample.filter((move) => canLeave(region, move[0], move[1]));
      if (!legal.length) return score === 1;
      const shake = legal[int(rng, 0, legal.length - 1)];
      const old = region[shake[0]][shake[1]];
      region[shake[0]][shake[1]] = shake[2];
      const next = count(region, 8);
      if (next <= 0) region[shake[0]][shake[1]] = old;
      else score = next;
    }
    return score === 1;
  }

  function fillTiny(region, queens) {
    const n = region.length;
    for (let guard = 0; guard < n * 2; guard++) {
      const sizes = Array(n).fill(0);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) sizes[region[r][c]]++;
      const tiny = sizes.findIndex((size) => size < 2);
      if (tiny < 0) return;
      let moved = false;
      for (let r = 0; r < n && !moved; r++) {
        for (let c = 0; c < n && !moved; c++) {
          if (region[r][c] !== tiny) continue;
          for (const [dr, dc] of DIRS) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
            if (region[rr][cc] === tiny || isQueen(queens, rr, cc)) continue;
            if (!canLeave(region, rr, cc)) continue;
            const donor = region[rr][cc];
            region[rr][cc] = tiny;
            if (count(region, 2) !== 1) region[rr][cc] = donor;
            else moved = true;
          }
        }
      }
      if (!moved) return;
    }
  }

  function generate(difficulty, seed) {
    const n = difficulty === 'easy' ? 7 : difficulty === 'tricky' ? 8 : 9;
    for (let attempt = 0; attempt < 80; attempt++) {
      const rng = makeRng(String(seed) + ':queens:' + difficulty + ':' + attempt);
      const queens = placeQueens(n, rng);
      if (!queens) continue;
      const regions = grow(queens, n, rng);
      if (!regions) continue;
      if (count(regions, 2) !== 1 && !repair(regions, queens, rng)) continue;
      if (count(regions, 2) !== 1) continue;
      fillTiny(regions, queens);
      if (count(regions, 2) !== 1) continue;
      const sizes = Array(n).fill(0);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) sizes[regions[r][c]]++;
      if (sizes.some((size) => size < 2)) continue;
      if (difficulty !== 'easy' && sizes.filter((size) => size < 3).length > 1) continue;
      return {
        game: 'queens',
        difficulty,
        seed,
        n,
        regions,
        solution: queens,
      };
    }
    throw new Error('queens: no unique puzzle');
  }

  return {
    id: 'queens',
    name: 'Queens',
    tagline: 'One crown in every row, column, and colour.',
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
