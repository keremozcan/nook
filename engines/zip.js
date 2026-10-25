(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, shuffle, int } = R;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function nbs(r, c, rows, cols) {
    const out = [];
    for (const [dr, dc] of DIRS) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < rows && cc < cols) out.push([rr, cc]);
    }
    return out;
  }

  function snake(rows, cols, rng) {
    const transpose = rng() < 0.5;
    const flipV = rng() < 0.5;
    const flipH = rng() < 0.5;
    const path = [];
    const R = transpose ? cols : rows;
    const C = transpose ? rows : cols;
    for (let r = 0; r < R; r++) {
      const rr = flipV ? R - 1 - r : r;
      const ltr = rr % 2 === 0 ? !flipH : flipH;
      for (let c = 0; c < C; c++) {
        const cc = ltr ? c : C - 1 - c;
        path.push(transpose ? [cc, rr] : [rr, cc]);
      }
    }
    return path;
  }

  function warnsdorff(rows, cols, rng) {
    const salt = (Math.floor(rng() * 0x7fffffff) ^ 0x9e3779b9) >>> 0;
    const tie = (r, c) => (Math.imul(r + 1, 73856093) ^ Math.imul(c + 1, 19349663) ^ salt) >>> 0;
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
    const starts = shuffle(rng, cells);
    const total = rows * cols;
    for (let s = 0; s < Math.min(4, starts.length); s++) {
      const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
      const path = [];
      let steps = 0;
      const dfs = (r, c) => {
        if (++steps > 25000) return false;
        seen[r][c] = true;
        path.push([r, c]);
        if (path.length === total) return true;
        const opts = [];
        for (const [rr, cc] of nbs(r, c, rows, cols)) if (!seen[rr][cc]) opts.push([rr, cc]);
        opts.sort((a, b) => {
          let da = 0;
          let db = 0;
          for (const [rr, cc] of nbs(a[0], a[1], rows, cols)) if (!seen[rr][cc]) da++;
          for (const [rr, cc] of nbs(b[0], b[1], rows, cols)) if (!seen[rr][cc]) db++;
          if (da !== db) return da - db;
          return tie(a[0], a[1]) - tie(b[0], b[1]);
        });
        for (const [rr, cc] of opts) if (dfs(rr, cc)) return true;
        path.pop();
        seen[r][c] = false;
        return false;
      };
      if (dfs(starts[s][0], starts[s][1]) && path.length === total) return path.slice();
    }
    return null;
  }

  function offPathEdges(path, rows, cols) {
    const used = new Set();
    for (let i = 1; i < path.length; i++) {
      const r = path[i - 1][0];
      const c = path[i - 1][1];
      const rr = path[i][0];
      const cc = path[i][1];
      if (rr === r && cc === c + 1) used.add(r + ',' + c + ',E');
      else if (rr === r && cc === c - 1) used.add(r + ',' + (c - 1) + ',E');
      else if (rr === r + 1 && cc === c) used.add(r + ',' + c + ',S');
      else if (rr === r - 1 && cc === c) used.add((r - 1) + ',' + c + ',S');
    }
    const edges = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols && !used.has(r + ',' + c + ',E')) edges.push([r, c, 'E']);
        if (r + 1 < rows && !used.has(r + ',' + c + ',S')) edges.push([r, c, 'S']);
      }
    }
    return edges;
  }

  function checkpoints(len, step) {
    const idx = [0];
    for (let i = step; i < len - 1; i += step) idx.push(i);
    if (idx[idx.length - 1] !== len - 1) idx.push(len - 1);
    return idx;
  }

  function widen(indexes, len) {
    let best = 0;
    let at = 1;
    for (let i = 1; i < indexes.length; i++) {
      const gap = indexes[i] - indexes[i - 1];
      if (gap > best) {
        best = gap;
        at = i;
      }
    }
    if (best <= 1) return false;
    const mid = (indexes[at - 1] + indexes[at]) >> 1;
    if (indexes.indexOf(mid) !== -1) return false;
    indexes.splice(at, 0, mid);
    return mid > 0 && mid < len - 1;
  }

  function assemble(path, indexes, walls, rows, cols) {
    const numbers = Array.from({ length: rows }, () => Array(cols).fill(0));
    indexes.forEach((at, i) => {
      const cell = path[at];
      numbers[cell[0]][cell[1]] = i + 1;
    });
    const ordered = walls.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    return { numbers, walls: ordered };
  }

  function blocked(wallSet, r, c, rr, cc) {
    if (rr === r && cc === c + 1) return wallSet.has(r + ',' + c + ',E');
    if (rr === r && cc === c - 1) return wallSet.has(r + ',' + (c - 1) + ',E');
    if (rr === r + 1 && cc === c) return wallSet.has(r + ',' + c + ',S');
    if (rr === r - 1 && cc === c) return wallSet.has((r - 1) + ',' + c + ',S');
    return true;
  }

  function countPaths(rows, cols, numbers, walls) {
    const wallSet = new Set(walls.map((w) => w[0] + ',' + w[1] + ',' + w[2]));
    let start = null;
    let maxN = 0;
    const pos = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = numbers[r][c] || 0;
        if (!n) continue;
        if (n > maxN) maxN = n;
        pos[n] = [r, c];
        if (n === 1) start = [r, c];
      }
    }
    if (!start) return 0;
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
    const N = rows * cols;
    let count = 0;
    let nodes = 0;
    const cap = N >= 64 ? 90000 : 60000;
    let visited = 0;
    function neigh(r, c) {
      const out = [];
      for (const [dr, dc] of DIRS) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        if (blocked(wallSet, r, c, rr, cc)) continue;
        out.push([rr, cc]);
      }
      return out;
    }
    function flood(hr, hc) {
      const need = N - visited;
      if (!need) return true;
      const mark = Array.from({ length: rows }, () => Array(cols).fill(false));
      const q = [];
      let reached = 0;
      const push = (r, c) => {
        if (r < 0 || c < 0 || r >= rows || c >= cols || seen[r][c] || mark[r][c]) return;
        mark[r][c] = true;
        q.push(r, c);
        reached++;
      };
      for (const [r, c] of neigh(hr, hc)) if (!seen[r][c]) push(r, c);
      for (let i = 0; i < q.length; i += 2) {
        const r = q[i];
        const c = q[i + 1];
        for (const [rr, cc] of neigh(r, c)) push(rr, cc);
      }
      return reached === need;
    }
    function dfs(r, c, need) {
      if (count >= 2 || nodes > cap) return;
      nodes++;
      const here = numbers[r][c] || 0;
      if (here) {
        if (here !== need) return;
        need++;
      }
      if (visited === N - 1) {
        if (here === maxN && need === maxN + 1) count++;
        return;
      }
      seen[r][c] = true;
      visited++;
      if (need <= maxN) {
        const target = pos[need];
        if (Math.abs(target[0] - r) + Math.abs(target[1] - c) > N - visited) {
          seen[r][c] = false;
          visited--;
          return;
        }
      }
      if ((visited & 3) === 0 && !flood(r, c)) {
        seen[r][c] = false;
        visited--;
        return;
      }
      for (const [rr, cc] of neigh(r, c)) if (!seen[rr][cc]) dfs(rr, cc, need);
      seen[r][c] = false;
      visited--;
    }
    dfs(start[0], start[1], 1);
    if (nodes > cap) return -1;
    return count;
  }

  function densityOk(numbered, cells, difficulty) {
    const frac = numbered / cells;
    if (difficulty === 'easy') return frac >= 0.22 && frac <= 0.7;
    if (difficulty === 'fiendish') return frac >= 0.1 && frac <= 0.5;
    return frac >= 0.12 && frac <= 0.6;
  }

  function segmentsForced(rows, cols, numbers, walls, solution) {
    const wallSet = new Set(walls.map(([r, c, d]) => r + ',' + c + ',' + d));
    let prev = 0;
    for (let i = 1; i < solution.length; i++) {
      const cell = solution[i];
      if (!numbers[cell[0]][cell[1]]) continue;
      const from = solution[prev];
      const budget = i - prev;
      let ways = 0;
      const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
      seen[from[0]][from[1]] = true;
      const dfs = (r, c, left) => {
        if (ways > 1) return;
        if (r === cell[0] && c === cell[1]) {
          ways++;
          return;
        }
        if (!left) return;
        for (const [dr, dc] of DIRS) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || seen[rr][cc]) continue;
          if (blocked(wallSet, r, c, rr, cc)) continue;
          const num = numbers[rr][cc] || 0;
          if (num && (rr !== cell[0] || cc !== cell[1])) continue;
          seen[rr][cc] = true;
          dfs(rr, cc, left - 1);
          seen[rr][cc] = false;
        }
      };
      dfs(from[0], from[1], budget);
      if (ways !== 1) return false;
      prev = i;
    }
    return true;
  }

  function turnIndexes(path, step) {
    const marks = [0];
    let last = 0;
    for (let i = 1; i < path.length - 1; i++) {
      const before = path[i - 1];
      const here = path[i];
      const after = path[i + 1];
      const turned = here[0] - before[0] !== after[0] - here[0] || here[1] - before[1] !== after[1] - here[1];
      if (turned && i - last >= step) {
        marks.push(i);
        last = i;
      }
    }
    if (marks[marks.length - 1] !== path.length - 1) marks.push(path.length - 1);
    return marks;
  }

  function shortcutWalls(path, rows, cols) {
    const at = Array.from({ length: rows }, () => Array(cols).fill(0));
    path.forEach((cell, i) => { at[cell[0]][cell[1]] = i; });
    return offPathEdges(path, rows, cols).sort((a, b) => {
      const gap = (wall) => {
        const rr = wall[2] === 'S' ? wall[0] + 1 : wall[0];
        const cc = wall[2] === 'E' ? wall[1] + 1 : wall[1];
        return Math.abs(at[wall[0]][wall[1]] - at[rr][cc]);
      };
      return gap(b) - gap(a);
    });
  }

  function generate(difficulty, seed) {
    const rows = difficulty === 'easy' ? 6 : difficulty === 'tricky' ? 7 : 8;
    const cols = rows;
    const step0 = difficulty === 'easy' ? 5 : difficulty === 'tricky' ? 7 : 9;
    const walls0 = difficulty === 'easy' ? 4 : difficulty === 'tricky' ? 6 : 8;
    const wallCap = difficulty === 'easy' ? 8 : difficulty === 'tricky' ? 12 : 16;
    for (let attempt = 0; attempt < 24; attempt++) {
      const rng = makeRng(String(seed) + ':zip:' + difficulty + ':' + attempt);
      const path = warnsdorff(rows, cols, rng) || snake(rows, cols, rng);
      const extras = shortcutWalls(path, rows, cols);
      const walls = extras.slice(0, Math.min(walls0, extras.length));
      let nextWall = walls.length;
      const indexes = turnIndexes(path, step0);
      for (let tighten = 0; tighten < 28; tighten++) {
        const built = assemble(path, indexes, walls, rows, cols);
        if (!densityOk(indexes.length, rows * cols, difficulty)) {
          if (indexes.length / (rows * cols) > 0.45) break;
          if (!widen(indexes, path.length)) break;
          continue;
        }
        const found = countPaths(rows, cols, built.numbers, built.walls);
        if (found === 1) {
          return {
            game: 'zip',
            difficulty,
            seed,
            rows,
            cols,
            numbers: built.numbers,
            walls: built.walls,
            solution: path.map((cell) => [cell[0], cell[1]]),
          };
        }
        if (found === 0) break;
        const frac = indexes.length / (rows * cols);
        const numberCap = difficulty === 'easy' ? 0.36 : difficulty === 'tricky' ? 0.3 : 0.24;
        if (walls.length < wallCap && nextWall < extras.length && frac >= (difficulty === 'easy' ? 0.22 : 0.1)) {
          walls.push(extras[nextWall]);
          nextWall++;
          continue;
        }
        if (frac < numberCap && widen(indexes, path.length)) continue;
        if (walls.length < wallCap && nextWall < extras.length) {
          walls.push(extras[nextWall]);
          nextWall++;
          continue;
        }
        if (!widen(indexes, path.length)) break;
      }
    }
    throw new Error('zip: no unique puzzle');
  }

  return {
    id: 'zip',
    name: 'Zip',
    tagline: 'One path through every cell.',
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
