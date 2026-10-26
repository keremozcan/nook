/* Sudoku: each digit once per row, column and box. */
(function () {
  const UI = window.NOOK_UI;

  const COPY = {
    verb: 'Fill the grid',
    rule: function (p) { return 'Every row, column and outlined box holds each digit from 1 to ' + (p ? p.size : 9) + ' once.'; },
    how: [
      'Each row, each column and each box with a thick outline must hold every digit once: 1 to 9, or 1 to 6 on Mini.',
      'Tap a square, then tap a digit. Bold grey digits are given and can’t change; your digits are in colour.',
      '<b>Notes</b> lets you pencil in small digits you are still thinking about. <b>Erase</b> clears a square.',
      'Every puzzle can be solved by thinking it through, without guessing. The level says which ideas you need:',
      '<b>Singles</b>: a square where only one digit fits, or a digit that fits in only one square of a row, column or box.',
      '<b>Locked digits</b>: if a digit’s only spots in a box are all in one row, it can’t go anywhere else in that row. It works the other way too: if its only spots in a row are inside one box, it can’t go anywhere else in that box. Columns work the same way.',
      '<b>Pairs</b>: if two squares in a row, column or box can only hold the same two digits, those digits can’t go anywhere else there. Or, if two digits can only go in the same two squares, those squares can’t hold anything else.',
      'Keyboard: arrow keys move, type a digit, Backspace erases, P turns notes on and off.'
    ],
    tiers: { 1: 'Singles', 2: 'Locked digits', 3: 'Pairs' },
    left: function (n) { return n === 1 ? '1 square to fill.' : n + ' squares to fill.'; },
    pick: 'Pick a square first.',
    given: 'That digit is given.',
    clash: 'A digit repeats. The repeats are marked.',
    full: 'Every square is filled, but a digit repeats.',
    notes: 'Notes',
    erase: 'Erase'
  };

  function digit(p, play, r, c) { return p.givens[r][c] || play.values[r][c]; }
  function box(p, r, c) { return Math.floor(r / p.boxR) * (p.size / p.boxC) + Math.floor(c / p.boxC); }
  function bad(p, play) {
    const n = p.size;
    const out = UI.matrix(n, n, false);
    const groups = {};
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const d = digit(p, play, r, c);
        if (!d) continue;
        ['r' + r, 'c' + c, 'b' + box(p, r, c)].forEach(function (g) {
          const key = g + ':' + d;
          (groups[key] = groups[key] || []).push([r, c]);
        });
      }
    }
    Object.keys(groups).forEach(function (key) {
      if (groups[key].length > 1) groups[key].forEach(function (cell) { out[cell[0]][cell[1]] = true; });
    });
    return out;
  }
  function empties(p, play) {
    let left = 0;
    for (let r = 0; r < p.size; r++) for (let c = 0; c < p.size; c++) if (!digit(p, play, r, c)) left++;
    return left;
  }
  function any(m) { return m.some(function (row) { return row.some(Boolean); }); }

  function enter(ctx, d) {
    const p = ctx.puzzle;
    const sel = ctx.ui.sel;
    if (!sel) { ctx.ui.same = d; ctx.say(COPY.pick); return; }
    const r = sel[0];
    const c = sel[1];
    if (p.givens[r][c]) { ctx.ui.same = d; ctx.say(COPY.given); return; }
    ctx.act(function (play) {
      if (ctx.ui.pencil) {
        if (!play.values[r][c]) play.notes[r][c] ^= (1 << (d - 1));
        return;
      }
      play.values[r][c] = play.values[r][c] === d ? 0 : d;
      play.notes[r][c] = 0;
      if (play.values[r][c]) {
        // Clear this digit from notes it now rules out.
        for (let rr = 0; rr < p.size; rr++) {
          for (let cc = 0; cc < p.size; cc++) {
            if ((rr === r || cc === c || box(p, rr, cc) === box(p, r, c)) && play.notes[rr][cc]) play.notes[rr][cc] &= ~(1 << (d - 1));
          }
        }
      }
    });
    ctx.ui.same = digit(p, ctx.play, r, c) || null;
    ctx.paint();
  }
  function erase(ctx) {
    const sel = ctx.ui.sel;
    if (!sel) { ctx.say(COPY.pick); return; }
    if (ctx.puzzle.givens[sel[0]][sel[1]]) { ctx.say(COPY.given); return; }
    ctx.act(function (play) { play.values[sel[0]][sel[1]] = 0; play.notes[sel[0]][sel[1]] = 0; });
  }
  function select(ctx, r, c) {
    ctx.ui.sel = [r, c];
    ctx.ui.same = digit(ctx.puzzle, ctx.play, r, c) || null;
    ctx.say('');
  }
  function keyFor(ctx, key) {
    const p = ctx.puzzle;
    if (/^[1-9]$/.test(key) && Number(key) <= p.size) { enter(ctx, Number(key)); return true; }
    if (key === 'Backspace' || key === 'Delete' || key === '0') { erase(ctx); return true; }
    if (key === 'p' || key === 'P') { ctx.ui.pencil = !ctx.ui.pencil; ctx.paint(); return true; }
    return false;
  }

  UI.register({
    id: 'sudoku',
    copy: COPY,
    check: true,
    side: true,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="a-bg" x="10" y="2" width="44" height="44"/><path class="a-thin" d="M17.3 2v44M24.7 2v44M39.3 2v44M46.7 2v44M10 9.3h44M10 16.7h44M10 31.3h44M10 38.7h44"/><path class="a-edge" d="M10 2h44v44H10zM32 2v44M10 24h44"/><text class="a-num" x="21" y="14">5</text><text class="a-num a-accent" x="36" y="29">2</text><text class="a-num" x="50.5" y="43">9</text></svg>',
    levelNote: function (p) {
      const tier = p.rating && COPY.tiers[p.rating.tier];
      return p.size + '×' + p.size + (tier ? ' · needs ' + tier.toLowerCase() : '');
    },
    fresh: function (p) { return { values: UI.matrix(p.size, p.size, 0), notes: UI.matrix(p.size, p.size, 0) }; },
    solved: function (p, play) { return !empties(p, play) && !any(bad(p, play)); },
    hint: function (p, play, ctx) {
      for (let r = 0; r < p.size; r++) {
        for (let c = 0; c < p.size; c++) {
          if (p.givens[r][c] || play.values[r][c] === p.solution[r][c]) continue;
          play.values[r][c] = p.solution[r][c];
          play.notes[r][c] = 0;
          if (ctx) { ctx.ui.sel = [r, c]; ctx.ui.same = p.solution[r][c]; }
          return;
        }
      }
    },
    status: function (ctx) {
      const p = ctx.puzzle;
      if (ctx.check && any(bad(p, ctx.play))) return COPY.clash;
      const left = empties(p, ctx.play);
      return left ? COPY.left(left) : COPY.full;
    },
    key: function (ctx, e) { return keyFor(ctx, e.key); },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      const board = UI.board({
        n: p.size, kind: 'sudoku', label: 'Sudoku grid',
        locked: function () { return ctx.solved; },
        down: function (r, c) { select(ctx, r, c); ctx.paint(); },
        moved: function (r, c) { select(ctx, r, c); ctx.paint(); },
        key: function (r, c, key) {
          if (key === 'Space' || key === 'Enter' || key === 'Activate') { select(ctx, r, c); ctx.paint(); return true; }
          if (!ctx.ui.sel || !UI.same(ctx.ui.sel, [r, c])) select(ctx, r, c);
          return keyFor(ctx, key);
        }
      });
      board.layer('lines', UI.lines(p.size, function (r, c, side) {
        if (side === 'E') return (c + 1) % p.boxC === 0 ? 2 : 1;
        return (r + 1) % p.boxR === 0 ? 2 : 1;
      }));
      ctx.ui.board = board;
      const pad = UI.h('div', { class: 'pad' + (p.size === 6 ? ' six' : ''), role: 'group', 'aria-label': 'Digits' });
      for (let d = 1; d <= p.size; d++) {
        pad.appendChild(UI.h('button', { type: 'button', class: 'digit', 'data-digit': d, onclick: function () { enter(ctx, d); } }, String(d)));
      }
      ctx.ui.notesBtn = UI.h('button', { type: 'button', class: 'tool', 'data-act': 'notes', 'aria-pressed': 'false', onclick: function () { ctx.ui.pencil = !ctx.ui.pencil; ctx.paint(); } }, COPY.notes);
      pad.appendChild(ctx.ui.notesBtn);
      pad.appendChild(UI.h('button', { type: 'button', class: 'tool', 'data-act': 'erase', onclick: function () { erase(ctx); } }, COPY.erase));
      ctx.ui.pad = pad;
      stage.appendChild(UI.h('div', { class: 'board-wrap' }, board.el));
      stage.appendChild(UI.h('div', { class: 'side' }, pad));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const n = p.size;
      const wrong = ctx.check ? bad(p, ctx.play) : null;
      const sel = ctx.ui.sel;
      const same = ctx.ui.same;
      const counts = Array(n + 1).fill(0);
      ctx.ui.board.each(function (cell, r, c) {
        const d = digit(p, ctx.play, r, c);
        counts[d]++;
        const given = !!p.givens[r][c];
        let cls = given ? 'given' : d ? 'entered' : '';
        if (sel && sel[0] === r && sel[1] === c) cls += ' sel';
        else if (sel && (sel[0] === r || sel[1] === c || box(p, sel[0], sel[1]) === box(p, r, c))) cls += ' peer';
        if (same && d === same) cls += ' same';
        if (wrong && wrong[r][c]) cls += ' bad';
        let html = d ? '<span class="digit">' + d + '</span>' : '';
        const bits = ctx.play.notes[r][c];
        if (!d && bits) {
          html = '<span class="notes' + (n === 6 ? ' six' : '') + '">';
          for (let k = 1; k <= n; k++) html += '<i>' + (bits & (1 << (k - 1)) ? k : '') + '</i>';
          html += '</span>';
        }
        const noteList = [];
        for (let k = 1; k <= n; k++) if (bits & (1 << (k - 1))) noteList.push(k);
        UI.paintCell(cell, cls.trim(), html, UI.place(r, c) + ', ' + (d ? d + (given ? ', given' : '') : 'empty' + (noteList.length ? ', notes ' + noteList.join(' ') : '')) + (wrong && wrong[r][c] ? ', repeats' : ''));
      });
      ctx.ui.notesBtn.setAttribute('aria-pressed', String(!!ctx.ui.pencil));
      ctx.ui.pad.classList.toggle('pencil', !!ctx.ui.pencil);
      ctx.ui.pad.querySelectorAll('[data-digit]').forEach(function (b) {
        const d = Number(b.getAttribute('data-digit'));
        b.classList.toggle('done', counts[d] >= n);
        b.classList.toggle('same', same === d);
      });
    }
  });
})();
