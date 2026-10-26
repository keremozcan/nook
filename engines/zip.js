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

  // Count lines (stopping at 2) that start on 1, visit the numbers in order, cover every
  // square and end on the last number; count is -1 if the search gives up. When a line other
  // than `known` (a list of cell indexes) turns up, it is returned as `other`.
  function countPaths(rows, cols, numbers, walls, known) {
    const N = rows * cols;
    const wallSet = new Set(walls.map((w) => w[0] + ',' + w[1] + ',' + w[2]));
    const adj = [];
    const num = new Int32Array(N);
    const at = [];
    let maxN = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const list = [];
        for (const [dr, dc] of DIRS) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || blocked(wallSet, r, c, rr, cc)) continue;
          list.push(rr * cols + cc);
        }
        adj.push(list);
        num[i] = numbers[r][c] || 0;
        if (num[i]) {
          at[num[i]] = i;
          maxN = Math.max(maxN, num[i]);
        }
      }
    }
    if (at[1] == null || at[maxN] == null) return { count: 0, other: null };
    const end = at[maxN];
    const seen = new Uint8Array(N);
    const mark = new Int32Array(N);
    const queue = new Int32Array(N);
    let stamp = 0;
    let visited = 0;
    let count = 0;
    let nodes = 0;
    let other = null;
    const line = new Int32Array(N);
    const cap = 400000;

    function dist(a, b) {
      return Math.abs(((a / cols) | 0) - ((b / cols) | 0)) + Math.abs((a % cols) - (b % cols));
    }

    // Free neighbours of k: unvisited squares, plus the head of the line.
    function free(k, head) {
      let n = 0;
      for (const j of adj[k]) if (!seen[j] || j === head) n++;
      return n;
    }

    // Every unvisited square must still be reachable from the head.
    function connected(head) {
      const left = N - visited;
      if (!left) return true;
      stamp++;
      let tail = 0;
      for (const j of adj[head]) {
        if (!seen[j] && mark[j] !== stamp) {
          mark[j] = stamp;
          queue[tail++] = j;
        }
      }
      for (let q = 0; q < tail; q++) {
        for (const j of adj[queue[q]]) {
          if (!seen[j] && mark[j] !== stamp) {
            mark[j] = stamp;
            queue[tail++] = j;
          }
        }
      }
      return tail === left;
    }

    function dfs(i, prev, need) {
      if (count >= 2 || nodes > cap) return;
      nodes++;
      if (num[i]) {
        if (num[i] !== need) return;
        need++;
      }
      line[visited] = i;
      if (visited === N - 1) {
        if (i !== end) return;
        count++;
        if (!other && known && line.some((cell, k) => cell !== known[k])) other = Array.from(line);
        return;
      }
      if (i === end) return;
      seen[i] = 1;
      visited++;
      let ok = dist(i, at[need]) <= N - visited;
      // Squares beside the square just left lost a way in or out: each still needs two
      // (the end square one), counting the head.
      if (ok && prev >= 0) {
        for (const k of adj[prev]) {
          if (seen[k] || k === i) continue;
          if (free(k, i) < (k === end ? 1 : 2)) {
            ok = false;
            break;
          }
        }
      }
      if (ok) ok = connected(i);
      if (ok) {
        // A neighbour with only one other free square must be entered now.
        let forced = -1;
        for (const j of adj[i]) {
          if (seen[j] || j === end) continue;
          if (free(j, i) === 1) {
            if (forced >= 0) {
              ok = false;
              break;
            }
            forced = j;
          }
        }
        if (ok) {
          if (forced >= 0) dfs(forced, i, need);
          else for (const j of adj[i]) if (!seen[j]) dfs(j, i, need);
        }
      }
      seen[i] = 0;
      visited--;
    }

    dfs(at[1], -1, 1);
    return { count: nodes > cap ? -1 : count, other };
  }

  function densityOk(numbered, cells, difficulty) {
    const frac = numbered / cells;
    if (difficulty === 'easy') return frac >= 0.22 && frac <= 0.7;
    if (difficulty === 'fiendish') return frac >= 0.1 && frac <= 0.5;
    return frac >= 0.12 && frac <= 0.6;
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
      const known = path.map(([r, c]) => r * cols + c);
      const extras = shortcutWalls(path, rows, cols);
      const walls = extras.slice(0, Math.min(walls0, extras.length));
      const indexes = turnIndexes(path, step0);
      for (let tighten = 0; tighten < 60; tighten++) {
        if (!densityOk(indexes.length, rows * cols, difficulty)) {
          if (indexes.length / (rows * cols) > 0.45 || !widen(indexes, path.length)) break;
          continue;
        }
        const built = assemble(path, indexes, walls, rows, cols);
        const { count, other } = countPaths(rows, cols, built.numbers, built.walls, known);
        if (count === 1) {
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
        if (count === 0) break;
        if (!other) {
          if (!widen(indexes, path.length)) break;
          continue;
        }
        // Rule out the other line where it first leaves the intended one: wall off the
        // step it takes there, or once the walls run out, number the square it skips.
        let k = 1;
        while (other[k] === known[k]) k++;
        if (walls.length < wallCap) {
          const a = Math.min(other[k - 1], other[k]);
          const b = Math.max(other[k - 1], other[k]);
          walls.push(b - a === 1 ? [(a / cols) | 0, a % cols, 'E'] : [(a / cols) | 0, a % cols, 'S']);
        } else if (indexes.indexOf(k) === -1) {
          indexes.push(k);
          indexes.sort((x, y) => x - y);
        } else if (!widen(indexes, path.length)) {
          break;
        }
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
