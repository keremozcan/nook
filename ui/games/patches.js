/* Patches: split the cloth into rectangles, one clue each. */
(function () {
  const UI = window.NOOK_UI;

  const GLYPH = {
    square: '<svg class="glyph" viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="4" width="12" height="12"/></svg>',
    wide: '<svg class="glyph" viewBox="0 0 20 20" aria-hidden="true"><rect x="1.5" y="6" width="17" height="8"/></svg>',
    tall: '<svg class="glyph" viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="1.5" width="8" height="17"/></svg>'
  };
  const COPY = {
    verb: 'Cut the cloth',
    rule: 'Split the board into rectangles, each holding one clue. The number is how many squares it covers; the symbol shows its shape.',
    how: [
      'Cover the whole board with rectangles. They can’t overlap or leave gaps.',
      'Each rectangle holds exactly one clue.',
      'The number is how many squares the rectangle covers.',
      'The symbol is its shape: <span class="inline-glyph">' + GLYPH.square + '</span> a square, <span class="inline-glyph">' + GLYPH.wide + '</span> wider than tall, <span class="inline-glyph">' + GLYPH.tall + '</span> taller than wide. A clue with no symbol can be any shape.',
      'Drag from one corner to the opposite corner to make a rectangle. Tap a rectangle to remove it. Tap a 1 to cover just that square.',
      'Keyboard: arrow keys move; press Space on one corner, then on the opposite corner. Space on a rectangle removes it.'
    ],
    levels: { easy: 'every shape shown', tricky: 'bigger board, every shape shown', fiendish: 'some shapes hidden' },
    left: function (n) { return n === 1 ? '1 square left to cover.' : n + ' squares left to cover.'; },
    overlap: 'That overlaps another rectangle. Tap a rectangle to remove it.',
    noClue: 'Each rectangle needs one clue inside it.',
    twoClues: 'That rectangle holds more than one clue.',
    size: function (want, got) { return 'That clue needs ' + want + ' squares, not ' + got + '.'; },
    shape: { square: 'That clue needs a square.', wide: 'That clue needs a wide rectangle (wider than tall).', tall: 'That clue needs a tall rectangle (taller than wide).' },
    howTo: 'Drag from corner to corner to make a rectangle.',
    corner: 'Now press Space on the opposite corner.',
    shapeName: { square: 'square', wide: 'wide', tall: 'tall' }
  };

  function clueAt(p, r, c) {
    for (let i = 0; i < p.clues.length; i++) if (p.clues[i].r === r && p.clues[i].c === c) return i;
    return -1;
  }
  /* Returns { id } when the rectangle fits, or { why } when it doesn't. */
  function judge(p, play, r0, c0, r1, c1) {
    const found = [];
    let overlap = false;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (play.cells[r][c] !== -1) overlap = true;
        const id = clueAt(p, r, c);
        if (id >= 0) found.push(id);
      }
    }
    if (overlap) return { why: COPY.overlap };
    if (!found.length) return { why: COPY.noClue };
    if (found.length > 1) return { why: COPY.twoClues };
    const clue = p.clues[found[0]];
    const hgt = r1 - r0 + 1;
    const wid = c1 - c0 + 1;
    if (clue.area != null && clue.area !== hgt * wid) return { why: COPY.size(clue.area, hgt * wid) };
    if (clue.shape === 'square' && hgt !== wid) return { why: COPY.shape.square };
    if (clue.shape === 'wide' && !(wid > hgt)) return { why: COPY.shape.wide };
    if (clue.shape === 'tall' && !(hgt > wid)) return { why: COPY.shape.tall };
    return { id: found[0] };
  }
  function fill(play, rect, id) {
    for (let r = rect[0]; r <= rect[2]; r++) for (let c = rect[1]; c <= rect[3]; c++) play.cells[r][c] = id;
  }
  function removePatch(play, id) {
    play.cells.forEach(function (row) { row.forEach(function (v, c) { if (v === id) row[c] = -1; }); });
  }
  function rectOf(a, b) { return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
  function left(play) {
    let n = 0;
    play.cells.forEach(function (row) { row.forEach(function (v) { if (v < 0) n++; }); });
    return n;
  }

  UI.register({
    id: 'patches',
    copy: COPY,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="pc0" x="4" y="4" width="22" height="40"/><rect class="pc1" x="26" y="4" width="34" height="18"/><rect class="pc2" x="26" y="22" width="34" height="22"/><path class="a-edge" d="M4 4h56v40H4zM26 4v40M26 22h34"/><text class="a-num" x="15" y="28">6</text></svg>',
    levelNote: function (p, level) { return p.rows + '×' + p.cols + ' · ' + COPY.levels[level]; },
    fresh: function (p) { return { cells: UI.matrix(p.rows, p.cols, -1) }; },
    solved: function (p, play) { return left(play) === 0; },
    hint: function (p, play) {
      for (let id = 0; id < p.clues.length; id++) {
        let r0 = 99, c0 = 99, r1 = -1, c1 = -1, match = true;
        for (let r = 0; r < p.rows; r++) {
          for (let c = 0; c < p.cols; c++) {
            const inside = p.solution[r][c] === id;
            if (inside) { r0 = Math.min(r0, r); c0 = Math.min(c0, c); r1 = Math.max(r1, r); c1 = Math.max(c1, c); }
            if (inside !== (play.cells[r][c] === id)) match = false;
          }
        }
        if (match) continue;
        const clear = new Set([id]);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (play.cells[r][c] >= 0) clear.add(play.cells[r][c]);
        clear.forEach(function (x) { removePatch(play, x); });
        fill(play, [r0, c0, r1, c1], id);
        return;
      }
    },
    status: function (ctx) { return COPY.left(left(ctx.play)); },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      let drag = null;
      function place(rect) {
        const verdict = judge(p, ctx.play, rect[0], rect[1], rect[2], rect[3]);
        if (verdict.why) { ctx.say(verdict.why); ctx.shake(); return false; }
        ctx.act(function (play) { fill(play, rect, verdict.id); });
        return true;
      }
      function tapAt(r, c) {
        const id = ctx.play.cells[r][c];
        if (id >= 0) { ctx.act(function (play) { removePatch(play, id); }); return; }
        const clue = clueAt(p, r, c);
        if (clue >= 0 && p.clues[clue].area === 1) { place([r, c, r, c]); return; }
        ctx.say(COPY.howTo);
      }
      const board = UI.board({
        n: p.rows, kind: 'patches', label: 'Patches board',
        locked: function () { return ctx.solved; },
        down: function (r, c) {
          drag = { from: [r, c] };
          ctx.ui.preview = null;
        },
        move: function (r, c) {
          if (!drag) return;
          ctx.ui.preview = rectOf(drag.from, [r, c]);
          ctx.live();
        },
        up: function (r, c, moved, cancelled) {
          const from = drag && drag.from;
          drag = null;
          const rect = ctx.ui.preview;
          ctx.ui.preview = null;
          if (!from) return;
          if (cancelled) { ctx.paint(); return; }
          if (!moved || !rect || (rect[0] === rect[2] && rect[1] === rect[3])) { tapAt(from[0], from[1]); return; }
          if (!place(rect)) ctx.paint();
        },
        key: function (r, c, key) {
          if (key !== 'Space' && key !== 'Enter' && key !== 'Activate') {
            if (key === 'Escape' && ctx.ui.anchor) { ctx.ui.anchor = null; ctx.paint(); return true; }
            return false;
          }
          const anchor = ctx.ui.anchor;
          if (!anchor) {
            if (ctx.play.cells[r][c] >= 0) { tapAt(r, c); return true; }
            const clue = clueAt(p, r, c);
            if (clue >= 0 && p.clues[clue].area === 1) { place([r, c, r, c]); return true; }
            ctx.ui.anchor = [r, c];
            ctx.say(COPY.corner);
            ctx.paint();
            return true;
          }
          ctx.ui.anchor = null;
          place(rectOf(anchor, [r, c]));
          ctx.paint();
          return true;
        }
      });
      board.layer('lines');
      let clues = '';
      p.clues.forEach(function (clue) {
        clues += '<span class="clue" style="left:' + ((clue.c + 0.5) / p.cols * 100) + '%;top:' + ((clue.r + 0.5) / p.rows * 100) + '%" aria-hidden="true">' + (GLYPH[clue.shape] ? '<i class="frame ' + clue.shape + '"></i>' : '') + '<b>' + (clue.area != null ? clue.area : '') + '</b></span>';
      });
      board.el.insertAdjacentHTML('beforeend', '<div class="clues-layer">' + clues + '</div>');
      ctx.ui.board = board;
      stage.appendChild(UI.h('div', { class: 'board-wrap' }, board.el));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const cells = ctx.play.cells;
      const preview = ctx.ui.preview;
      const anchor = ctx.ui.anchor;
      let previewOk = false;
      if (preview) previewOk = !judge(p, ctx.play, preview[0], preview[1], preview[2], preview[3]).why;
      ctx.ui.board.each(function (cell, r, c) {
        const id = cells[r][c];
        let cls = id >= 0 ? 'pc' + (id % 8) : '';
        if (preview && r >= preview[0] && r <= preview[2] && c >= preview[1] && c <= preview[3]) cls += previewOk ? ' preview' : ' preview no';
        if (anchor && anchor[0] === r && anchor[1] === c) cls += ' anchor';
        const ci = clueAt(p, r, c);
        const clue = ci >= 0 ? p.clues[ci] : null;
        const label = UI.place(r, c) + (clue ? ', clue ' + (clue.area != null ? clue.area : '') + (COPY.shapeName[clue.shape] ? ' ' + COPY.shapeName[clue.shape] : ', any shape') : '') + (id >= 0 ? ', covered' : '');
        UI.paintCell(cell, cls.trim(), '', label);
      });
      ctx.ui.board.layer('lines', UI.lines(p.rows, function (r, c, side) {
        const a = cells[r][c];
        const b = side === 'E' ? cells[r][c + 1] : cells[r + 1][c];
        return a !== b && (a >= 0 || b >= 0) ? 2 : 1;
      }));
    }
  });
})();
