/* Tango: suns and moons in balance. */
(function () {
  const UI = window.NOOK_UI;

  const COPY = {
    verb: 'Balance suns and moons',
    rule: 'Fill every square with a sun or a moon. Each row and column has as many suns as moons, with no more than two the same side by side.',
    how: [
      'Every square gets a sun or a moon.',
      'Each row and each column has the same number of suns as moons.',
      'No more than two suns, or two moons, next to each other in a row or column.',
      '<b>=</b> between two squares means they are the same. <b>×</b> means they are different.',
      'Shaded squares are given and can’t change.',
      'Tap a square to change it: sun, then moon, then empty.',
      'Keyboard: arrow keys move, Space or Enter changes the square.'
    ],
    open: function (n) { return n === 1 ? '1 square to fill.' : n + ' squares to fill.'; },
    clash: 'Some squares break a rule: they are marked.',
    full: 'Every square is filled, but a rule is broken.',
    given: 'That square is given.'
  };
  const CYCLE = [null, 'sun', 'moon'];

  function at(p, play, r, c) { return p.givens[r][c] || play.marks[r][c]; }
  function bad(p, play) {
    const n = p.n;
    const half = n / 2;
    const out = UI.matrix(n, n, false);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = at(p, play, r, c);
        if (!v) continue;
        if (c >= 2 && v === at(p, play, r, c - 1) && v === at(p, play, r, c - 2)) out[r][c] = out[r][c - 1] = out[r][c - 2] = true;
        if (r >= 2 && v === at(p, play, r - 1, c) && v === at(p, play, r - 2, c)) out[r][c] = out[r - 1][c] = out[r - 2][c] = true;
        if (c < n - 1 && p.h[r][c] && at(p, play, r, c + 1)) {
          if ((p.h[r][c] === 'eq') !== (v === at(p, play, r, c + 1))) out[r][c] = out[r][c + 1] = true;
        }
        if (r < n - 1 && p.v[r][c] && at(p, play, r + 1, c)) {
          if ((p.v[r][c] === 'eq') !== (v === at(p, play, r + 1, c))) out[r][c] = out[r + 1][c] = true;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      ['sun', 'moon'].forEach(function (kind) {
        let row = 0;
        let col = 0;
        for (let j = 0; j < n; j++) {
          if (at(p, play, i, j) === kind) row++;
          if (at(p, play, j, i) === kind) col++;
        }
        for (let j = 0; j < n; j++) {
          if (row > half && at(p, play, i, j) === kind) out[i][j] = true;
          if (col > half && at(p, play, j, i) === kind) out[j][i] = true;
        }
      });
    }
    return out;
  }
  function empties(p, play) {
    let left = 0;
    for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (!at(p, play, r, c)) left++;
    return left;
  }
  function any(m) { return m.some(function (row) { return row.some(Boolean); }); }

  UI.register({
    id: 'tango',
    copy: COPY,
    check: true,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="a-bg" x="4" y="8" width="56" height="32" rx="4"/><circle class="a-sun" cx="19" cy="24" r="7"/><text class="a-sign" x="32" y="28.5">=</text><path class="a-moon" d="M50 17.2A8 8 0 1 0 50 31a6 6 0 0 1 0-13.8z"/></svg>',
    levelNote: function (p) { return p.n + '×' + p.n; },
    fresh: function (p) { return { marks: UI.matrix(p.n, p.n, null) }; },
    solved: function (p, play) { return !empties(p, play) && !any(bad(p, play)); },
    hint: function (p, play) {
      for (let r = 0; r < p.n; r++) {
        for (let c = 0; c < p.n; c++) {
          if (p.givens[r][c] || play.marks[r][c] === p.solution[r][c]) continue;
          play.marks[r][c] = p.solution[r][c];
          return;
        }
      }
    },
    status: function (ctx) {
      const p = ctx.puzzle;
      const left = empties(p, ctx.play);
      if (ctx.check && any(bad(p, ctx.play))) return COPY.clash;
      return left ? COPY.open(left) : COPY.full;
    },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      function cycle(r, c) {
        if (p.givens[r][c]) { ctx.say(COPY.given); return; }
        ctx.act(function (play) { play.marks[r][c] = CYCLE[(CYCLE.indexOf(play.marks[r][c]) + 1) % CYCLE.length]; });
      }
      const board = UI.board({
        n: p.n, kind: 'tango', label: 'Tango board',
        locked: function () { return ctx.solved; },
        down: cycle,
        key: function (r, c, key) {
          if (key !== 'Space' && key !== 'Enter' && key !== 'Activate') return false;
          cycle(r, c);
          return true;
        }
      });
      board.layer('lines', UI.lines(p.n, function () { return 1; }));
      let signs = '';
      for (let r = 0; r < p.n; r++) {
        for (let c = 0; c < p.n; c++) {
          if (c < p.n - 1 && p.h[r][c]) signs += '<span class="sign" style="left:' + ((c + 1) / p.n * 100) + '%;top:' + ((r + 0.5) / p.n * 100) + '%" aria-hidden="true">' + (p.h[r][c] === 'eq' ? '=' : '×') + '</span>';
          if (r < p.n - 1 && p.v[r][c]) signs += '<span class="sign" style="left:' + ((c + 0.5) / p.n * 100) + '%;top:' + ((r + 1) / p.n * 100) + '%" aria-hidden="true">' + (p.v[r][c] === 'eq' ? '=' : '×') + '</span>';
        }
      }
      board.el.insertAdjacentHTML('beforeend', '<div class="signs">' + signs + '</div>');
      ctx.ui.board = board;
      stage.appendChild(UI.h('div', { class: 'board-wrap' }, board.el));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const wrong = ctx.check ? bad(p, ctx.play) : null;
      ctx.ui.board.each(function (cell, r, c) {
        const v = at(p, ctx.play, r, c);
        const given = !!p.givens[r][c];
        const isBad = wrong && wrong[r][c];
        const html = v === 'sun' ? UI.icon.sun() : v === 'moon' ? UI.icon.moon() : '';
        const extra = [];
        if (p.h[r][c]) extra.push((p.h[r][c] === 'eq' ? 'same as' : 'different from') + ' the square to the right');
        if (r < p.n - 1 && p.v[r][c]) extra.push((p.v[r][c] === 'eq' ? 'same as' : 'different from') + ' the square below');
        UI.paintCell(cell, (given ? 'given' : '') + (isBad ? ' bad' : ''), html,
          UI.place(r, c) + ', ' + (v || 'empty') + (given ? ', given' : '') + (extra.length ? ', ' + extra.join(', ') : '') + (isBad ? ', breaks a rule' : ''));
      });
    }
  });
})();
