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
          if (cols[i] === c || (r - i === 1 && Math.abs(cols[i] - c) === 1)) {
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
    // Let regions grow to different sizes. Equal-sized regions leave too many
    // interchangeable crown placements under the no-touch rule.
    let empty = n * n - n;
    while (empty > 0) {
      const frontier = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const id = region[r][c];
          if (id < 0) continue;
          for (const [dr, dc] of DIRS) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && cc >= 0 && rr < n && cc < n && region[rr][cc] < 0) frontier.push([rr, cc, id]);
          }
        }
      }
      if (!frontier.length) return null;
      const [r, c, id] = frontier[int(rng, 0, frontier.length - 1)];
      region[r][c] = id;
      empty--;
    }
    return region;
  }

  // Count crown placements (up to limit): one per row, column and region, none touching.
  // Also returns the first placement whose columns differ from `known`, if any.
  function search(regions, limit, known) {
    const n = regions.length;
    // Regions that have no square below row r must already hold a crown after row r.
    const done = Array(n).fill(0);
    for (let id = 0; id < n; id++) {
      let last = -1;
      for (let r = 0; r < n; r++) if (regions[r].indexOf(id) !== -1) last = r;
      for (let r = Math.max(last, 0); r < n; r++) done[r] |= 1 << id;
    }
    const columns = Array(n).fill(-1);
    let found = 0;
    let other = null;
    function bt(r, colMask, regMask) {
      if (r === n) {
        found++;
        if (!other && known && columns.some((c, i) => c !== known[i])) other = columns.slice();
        return;
      }
      for (let c = 0; c < n && found < limit; c++) {
        if (colMask & (1 << c)) continue;
        if (r > 0 && Math.abs(columns[r - 1] - c) <= 1) continue;
        const bit = 1 << regions[r][c];
        if (regMask & bit) continue;
        if (done[r] & ~(regMask | bit)) continue;
        columns[r] = c;
        bt(r + 1, colMask | (1 << c), regMask | bit);
      }
    }
    bt(0, 0, 0);
    return { count: found, other };
  }

  function count(regions, limit) {
    return search(regions, limit || 2).count;
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

  // While another placement exists, move one of its crown squares (not a real crown) into a
  // neighbouring region: that region then holds two of its crowns, so it stops working,
  // and the real placement is untouched.
  function repair(region, queens, rng) {
    const n = region.length;
    const known = queens.map(([, c]) => c);
    for (let round = 0; round < 12 * n; round++) {
      const { count: found, other } = search(region, 2, known);
      if (found === 1) return true;
      if (!other) return false;
      const moves = [];
      other.forEach((c, r) => {
        if (c === known[r]) return;
        for (const [dr, dc] of DIRS) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n || region[rr][cc] === region[r][c]) continue;
          if (canLeave(region, r, c)) moves.push([r, c, region[rr][cc]]);
        }
      });
      if (!moves.length) return false;
      const [r, c, id] = moves[int(rng, 0, moves.length - 1)];
      region[r][c] = id;
    }
    return false;
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
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
