(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, int } = R;

  function tile(r, c, h, w, rng, out, leaf) {
    const area = h * w;
    const canH = h >= 2;
    const canV = w >= 2;
    const stop = area <= leaf || (!canH && !canV) || (area <= leaf * 2 && rng() < 0.4);
    if (stop) {
      out.push({ r, c, h, w });
      return;
    }
    if (canV && (!canH || w >= h || rng() < 0.5)) {
      const cut = int(rng, 1, w - 1);
      tile(r, c, h, cut, rng, out, leaf);
      tile(r, c + cut, h, w - cut, rng, out, leaf);
    } else {
      const cut = int(rng, 1, h - 1);
      tile(r, c, cut, w, rng, out, leaf);
      tile(r + cut, c, h - cut, w, rng, out, leaf);
    }
  }

  function shapeOf(h, w) {
    if (h === w) return 'square';
    return w > h ? 'wide' : 'tall';
  }

  function build(rects, rows, cols, rng) {
    const clues = [];
    const solution = Array.from({ length: rows }, () => Array(cols).fill(0));
    rects.forEach((rect, i) => {
      const cr = rect.r + int(rng, 0, rect.h - 1);
      const cc = rect.c + int(rng, 0, rect.w - 1);
      clues.push({
        r: cr,
        c: cc,
        area: rect.h * rect.w,
        shape: shapeOf(rect.h, rect.w),
      });
      for (let r = rect.r; r < rect.r + rect.h; r++) {
        for (let c = rect.c; c < rect.c + rect.w; c++) solution[r][c] = i;
      }
    });
    return { clues, solution };
  }

  function candidates(clues, rows, cols) {
    const clueAt = Array.from({ length: rows }, () => Array(cols).fill(-1));
    clues.forEach((cl, i) => {
      clueAt[cl.r][cl.c] = i;
    });
    return clues.map((cl, i) => {
      const list = [];
      for (let r0 = 0; r0 <= cl.r; r0++) {
        for (let c0 = 0; c0 <= cl.c; c0++) {
          for (let r1 = cl.r; r1 < rows; r1++) {
            for (let c1 = cl.c; c1 < cols; c1++) {
              const h = r1 - r0 + 1;
              const w = c1 - c0 + 1;
              const area = h * w;
              if (cl.area != null && cl.area !== area) continue;
              if (cl.shape === 'square' && h !== w) continue;
              if (cl.shape === 'wide' && !(w > h)) continue;
              if (cl.shape === 'tall' && !(h > w)) continue;
              let other = false;
              for (let r = r0; r <= r1 && !other; r++) {
                for (let c = c0; c <= c1; c++) {
                  if (clueAt[r][c] !== -1 && clueAt[r][c] !== i) {
                    other = true;
                    break;
                  }
                }
              }
              if (!other) list.push((r0 << 18) | (c0 << 12) | (r1 << 6) | c1);
            }
          }
        }
      }
      return list;
    });
  }

  function count(clues, rows, cols) {
    const cand = candidates(clues, rows, cols);
    if (cand.some((list) => !list.length)) return 0;
    const order = cand.map((_, i) => i).sort((a, b) => cand[a].length - cand[b].length);
    const covered = Array.from({ length: rows }, () => Array(cols).fill(false));
    let found = 0;
    let nodes = 0;
    function paint(code, val) {
      const r0 = (code >> 18) & 63;
      const c0 = (code >> 12) & 63;
      const r1 = (code >> 6) & 63;
      const c1 = code & 63;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) covered[r][c] = val;
      }
    }
    function fits(code) {
      const r0 = (code >> 18) & 63;
      const c0 = (code >> 12) & 63;
      const r1 = (code >> 6) & 63;
      const c1 = code & 63;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) if (covered[r][c]) return false;
      }
      return true;
    }
    function bt(k) {
      if (found >= 2 || found < 0) return;
      if (++nodes > 80000) {
        found = -1;
        return;
      }
      if (k === order.length) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) if (!covered[r][c]) return;
        }
        found++;
        return;
      }
      const list = cand[order[k]];
      for (let i = 0; i < list.length; i++) {
        if (!fits(list[i])) continue;
        paint(list[i], true);
        bt(k + 1);
        paint(list[i], false);
        if (found >= 2 || found < 0) return;
      }
    }
    bt(0);
    return found;
  }

  function generate(difficulty, seed) {
    const side = difficulty === 'easy' ? 6 : difficulty === 'tricky' ? 7 : 8;
    const leaf = difficulty === 'easy' ? 4 : difficulty === 'tricky' ? 4 : 5;
    for (let attempt = 0; attempt < 40; attempt++) {
      const rng = makeRng(String(seed) + ':patches:' + difficulty + ':' + attempt);
      const rects = [];
      tile(0, 0, side, side, rng, rects, leaf);
      if (rects.length < 3) continue;
      const built = build(rects, side, side, rng);
      if (count(built.clues, side, side) !== 1) continue;
      if (difficulty === 'fiendish') {
        const order = built.clues.map((cl, i) => i).sort((a, b) => (built.clues[b].area || 0) - (built.clues[a].area || 0));
        let loosened = 0;
        for (const i of order) {
          if (loosened >= 3) break;
          const prev = built.clues[i].shape;
          if (prev === 'any') continue;
          built.clues[i] = { r: built.clues[i].r, c: built.clues[i].c, area: built.clues[i].area, shape: 'any' };
          if (count(built.clues, side, side) === 1) loosened++;
          else built.clues[i] = { r: built.clues[i].r, c: built.clues[i].c, area: built.clues[i].area, shape: prev };
        }
        // A singleton area-1 clue is not a useful substitute for withheld
        // shape information: it pins a cell outright. Retry instead of
        // labeling that fallback puzzle fiendish.
        if (loosened < 2) continue;
      }
      return {
        game: 'patches',
        difficulty,
        seed,
        rows: side,
        cols: side,
        clues: built.clues,
        solution: built.solution,
      };
    }
    throw new Error('patches: no unique puzzle');
  }

  return {
    id: 'patches',
    name: 'Patches',
    tagline: 'Cover the cloth with rectangles.',
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
