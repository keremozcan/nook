/* Queens: one crown per row, column and colour; crowns never touch. */
(function () {
  const UI = window.NOOK_UI;

  const COPY = {
    verb: 'Place the crowns',
    rule: 'One crown in every row, column and colour. Crowns can’t touch, not even corner to corner.',
    how: [
      'Each row, each column and each coloured area needs exactly one crown.',
      'Two crowns can never touch, not even at the corners.',
      'Tap a square once for a dot. Dots are notes for squares that can’t hold a crown.',
      'Tap a square twice quickly for a crown. Tap a dot or a crown again to clear it.',
      'Thick lines show where one colour ends and the next begins.',
      'Keyboard: arrow keys move, Space puts a dot, Enter puts a crown.'
    ],
    count: function (have, n) { return have + ' of ' + n + ' crowns placed.'; },
    clash: 'Two crowns break a rule: they are marked.'
  };
  const DOUBLE_MS = 450;

  function crowns(play) {
    const out = [];
    play.marks.forEach(function (row, r) { row.forEach(function (m, c) { if (m === 'queen') out.push([r, c]); }); });
    return out;
  }
  function bad(p, play) {
    const out = UI.matrix(p.n, p.n, false);
    const qs = crowns(play);
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        const a = qs[i];
        const b = qs[j];
        const clash = a[0] === b[0] || a[1] === b[1] || p.regions[a[0]][a[1]] === p.regions[b[0]][b[1]] ||
          (Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1);
        if (clash) out[a[0]][a[1]] = out[b[0]][b[1]] = true;
      }
    }
    return out;
  }

  UI.register({
    id: 'queens',
    copy: COPY,
    check: true,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="rg0" x="4" y="4" width="18" height="20"/><rect class="rg1" x="22" y="4" width="20" height="20"/><rect class="rg2" x="42" y="4" width="18" height="20"/><rect class="rg3" x="4" y="24" width="18" height="20"/><rect class="rg4" x="22" y="24" width="38" height="20"/><path class="a-edge" d="M4 4h56v40H4zM22 4v40M42 4v20M4 24h56"/><path class="a-crown" d="M25 39l2-9 4 4 3-7 3 7 4-4 2 9z"/></svg>',
    levelNote: function (p) { return p.n + '×' + p.n + ' · ' + p.n + ' crowns'; },
    fresh: function (p) { return { marks: UI.matrix(p.n, p.n, null) }; },
    solved: function (p, play) {
      if (crowns(play).length !== p.n) return false;
      return !bad(p, play).some(function (row) { return row.some(Boolean); });
    },
    hint: function (p, play) {
      for (let r = 0; r < p.n; r++) {
        const spot = p.solution.find(function (cell) { return cell[0] === r; });
        const row = play.marks[r];
        if (row[spot[1]] === 'queen' && row.filter(function (m) { return m === 'queen'; }).length === 1) continue;
        for (let c = 0; c < p.n; c++) if (row[c] === 'queen') row[c] = null;
        row[spot[1]] = 'queen';
        return;
      }
    },
    status: function (ctx) {
      if (ctx.check && bad(ctx.puzzle, ctx.play).some(function (row) { return row.some(Boolean); })) return COPY.clash;
      return COPY.count(crowns(ctx.play).length, ctx.puzzle.n);
    },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      let last = null;
      function single(r, c) {
        const at = performance.now();
        const before = ctx.play.marks[r][c];
        if (last && last.r === r && last.c === c && at - last.t < DOUBLE_MS) {
          // Second tap: a crown, undone together with the first tap.
          const group = last.group;
          const was = last.before;
          last = null;
          ctx.act(function (play) { play.marks[r][c] = was === 'queen' ? null : 'queen'; }, { group: group });
          return;
        }
        const group = 'q' + at;
        last = { r: r, c: c, t: at, before: before, group: group };
        ctx.act(function (play) { play.marks[r][c] = before ? null : 'dot'; }, { group: group });
      }
      const board = UI.board({
        n: p.n, kind: 'queens', label: 'Queens board',
        locked: function () { return ctx.solved; },
        down: function (r, c) { single(r, c); },
        key: function (r, c, key) {
          last = null;
          if (key === 'Activate') { single(r, c); return true; }
          if (key === 'Space') { ctx.act(function (play) { play.marks[r][c] = play.marks[r][c] === 'dot' ? null : 'dot'; }); return true; }
          if (key === 'Enter') { ctx.act(function (play) { play.marks[r][c] = play.marks[r][c] === 'queen' ? null : 'queen'; }); return true; }
          return false;
        }
      });
      board.layer('lines', UI.lines(p.n, function (r, c, side) {
        const other = side === 'E' ? p.regions[r][c + 1] : p.regions[r + 1][c];
        return other === p.regions[r][c] ? 1 : 2;
      }));
      ctx.ui.board = board;
      stage.appendChild(UI.h('div', { class: 'board-wrap' }, board.el));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const wrong = ctx.check ? bad(p, ctx.play) : null;
      ctx.ui.board.each(function (cell, r, c) {
        const mark = ctx.play.marks[r][c];
        const isBad = wrong && wrong[r][c];
        const cls = 'rg' + (p.regions[r][c] % 12) + (isBad ? ' bad' : '') + (mark ? ' has-' + mark : '');
        const html = mark === 'queen' ? UI.icon.crown() : mark === 'dot' ? '<i class="dot"></i>' : '';
        UI.paintCell(cell, cls, html, UI.place(r, c) + ', colour ' + (p.regions[r][c] + 1) + (mark === 'queen' ? ', crown' : mark === 'dot' ? ', dot' : '') + (isBad ? ', breaks a rule' : ''));
      });
    }
  });
})();
