/* Zip: one line through every square, numbers in order. */
(function () {
  const UI = window.NOOK_UI;

  const COPY = {
    verb: 'Draw one line',
    rule: 'Draw one line through every square, visiting the numbers in order. The line can’t cross walls.',
    how: [
      'Start on 1. Drag through squares that share a side to draw the line.',
      'Pass the numbers in order: 1, then 2, then 3, and so on.',
      'The line must go through every square once, and finish on the biggest number.',
      'Thick dark lines are walls. The line can’t cross them.',
      'Tap a square next to the end of the line to add one step. Drag back along the line, or tap an earlier square on it, to shorten it.',
      'Keyboard: arrow keys move, Space adds the square to the line.'
    ],
    levels: { easy: 'plenty of numbers', tricky: 'fewer numbers, more walls', fiendish: 'fewest numbers, most walls' },
    start: 'Start at 1.',
    next: function (n) { return 'Next number: ' + n + '.'; },
    fill: function (n) { return 'Now fill every square left, finishing on ' + n + '.'; },
    noStart: 'Start the line on 1.',
    wall: 'A wall is in the way.',
    notNext: function (n) { return 'Go to ' + n + ' first.'; },
    lastTooSoon: function (n) { return n + ' comes last, after every other square.'; },
    notBeside: 'Pick a square next to the end of the line.'
  };

  function max(puzzle) { return Math.max.apply(null, puzzle.numbers.flat()); }
  function walls(puzzle) {
    if (!puzzle._walls) {
      const set = new Set();
      (puzzle.walls || []).forEach(function (w) { set.add(w[0] + ',' + w[1] + ',' + w[2]); });
      Object.defineProperty(puzzle, '_walls', { value: set, enumerable: false });
    }
    return puzzle._walls;
  }
  function wallBetween(puzzle, a, b) {
    const set = walls(puzzle);
    const r = a[0];
    const c = a[1];
    if (b[0] === r && b[1] === c + 1) return set.has(r + ',' + c + ',E');
    if (b[0] === r && b[1] === c - 1) return set.has(r + ',' + (c - 1) + ',E');
    if (b[0] === r + 1 && b[1] === c) return set.has(r + ',' + c + ',S');
    if (b[0] === r - 1 && b[1] === c) return set.has((r - 1) + ',' + c + ',S');
    return true;
  }
  function need(puzzle, path) {
    let n = 1;
    path.forEach(function (cell) { const v = puzzle.numbers[cell[0]][cell[1]]; if (v) n = v + 1; });
    return n;
  }
  function indexOf(path, r, c) {
    for (let i = 0; i < path.length; i++) if (path[i][0] === r && path[i][1] === c) return i;
    return -1;
  }
  /* Try to step the line onto (r, c). Returns '' when it worked, or the reason it didn't. */
  function step(puzzle, path, r, c) {
    const num = puzzle.numbers[r][c];
    if (!path.length) {
      if (num === 1) { path.push([r, c]); return ''; }
      return COPY.noStart;
    }
    const at = indexOf(path, r, c);
    if (at === path.length - 1) return '';
    if (at >= 0) { path.length = at + 1; return ''; }
    const head = path[path.length - 1];
    if (Math.abs(head[0] - r) + Math.abs(head[1] - c) !== 1) return COPY.notBeside;
    if (wallBetween(puzzle, head, [r, c])) return COPY.wall;
    const want = need(puzzle, path);
    if (num && num !== want) return COPY.notNext(want);
    if (num === max(puzzle) && path.length !== puzzle.rows * puzzle.cols - 1) return COPY.lastTooSoon(num);
    path.push([r, c]);
    return '';
  }

  UI.register({
    id: 'zip',
    copy: COPY,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="a-bg" x="4" y="4" width="56" height="40" rx="4"/><path class="a-line" d="M14 34H28V16H46V34H52"/><circle class="a-dot" cx="14" cy="34" r="5.5"/><text class="a-num" x="14" y="37.5">1</text><circle class="a-dot" cx="46" cy="16" r="5.5"/><text class="a-num" x="46" y="19.5">2</text></svg>',
    levelNote: function (p, level) { return p.rows + '×' + p.cols + ' · ' + COPY.levels[level]; },
    fresh: function () { return { path: [] }; },
    solved: function (p, play) {
      const path = play.path;
      if (path.length !== p.rows * p.cols) return false;
      const last = path[path.length - 1];
      return p.numbers[last[0]][last[1]] === max(p);
    },
    hint: function (p, play) {
      const sol = p.solution;
      let i = 0;
      while (i < play.path.length && i < sol.length && UI.same(play.path[i], sol[i])) i++;
      play.path = sol.slice(0, Math.min(sol.length, i + 1)).map(function (cell) { return [cell[0], cell[1]]; });
    },
    status: function (ctx) {
      const p = ctx.puzzle;
      if (!ctx.play.path.length) return COPY.start;
      const want = need(p, ctx.play.path);
      return want > max(p) ? COPY.fill(max(p)) : COPY.next(want);
    },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      let drag = null;
      function tryStep(r, c) {
        const path = ctx.play.path;
        const reason = step(p, path, r, c);
        if (!reason || !path.length) return reason;
        // A diagonal jump while dragging: try the two squares in between.
        const head = path[path.length - 1];
        if (Math.abs(head[0] - r) === 1 && Math.abs(head[1] - c) === 1) {
          const ways = [[head[0], c], [r, head[1]]];
          for (let i = 0; i < ways.length; i++) {
            const copy = path.map(function (x) { return x.slice(); });
            if (!step(p, copy, ways[i][0], ways[i][1]) && !step(p, copy, r, c)) {
              path.length = 0;
              copy.forEach(function (x) { path.push(x); });
              return '';
            }
          }
        }
        return reason;
      }
      const board = UI.board({
        n: p.rows, kind: 'zip', label: 'Zip board',
        locked: function () { return ctx.solved; },
        down: function (r, c) {
          ctx.begin();
          drag = { reason: tryStep(r, c) };
          ctx.live();
        },
        move: function (r, c) {
          if (!drag) return;
          const path = ctx.play.path;
          if (path.length > 1 && UI.same(path[path.length - 2], [r, c])) path.pop();
          else if (indexOf(path, r, c) >= 0) return;
          else if (tryStep(r, c)) return;
          drag.reason = '';
          ctx.live();
        },
        up: function () {
          const reason = drag && drag.reason;
          drag = null;
          ctx.end(reason);
          if (reason) ctx.shake();
        },
        key: function (r, c, key) {
          if (key !== 'Space' && key !== 'Enter' && key !== 'Activate') return false;
          let reason = '';
          ctx.act(function (play) { reason = step(p, play.path, r, c); });
          if (reason) ctx.say(reason);
          return true;
        }
      });
      const set = walls(p);
      board.layer('lines', UI.lines(p.rows, function (r, c, side) { return set.has(r + ',' + c + ',' + side) ? 3 : 1; }));
      board.layer('path');
      let nums = '';
      for (let r = 0; r < p.rows; r++) {
        for (let c = 0; c < p.cols; c++) {
          const v = p.numbers[r][c];
          if (!v) continue;
          nums += '<circle class="num-disc" cx="' + (c + 0.5) + '" cy="' + (r + 0.5) + '" r="0.31"/><text class="num-text" x="' + (c + 0.5) + '" y="' + (r + 0.5) + '" dy="0.13" font-size="' + (v > 9 ? 0.3 : 0.36) + '">' + v + '</text>';
        }
      }
      board.layer('nums', nums);
      ctx.ui.board = board;
      stage.appendChild(UI.h('div', { class: 'board-wrap' }, board.el));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const board = ctx.ui.board;
      const path = ctx.play.path;
      const on = {};
      path.forEach(function (cell, i) { on[cell[0] + ',' + cell[1]] = i + 1; });
      const head = path[path.length - 1];
      board.each(function (cell, r, c) {
        const v = p.numbers[r][c];
        let cls = on[r + ',' + c] ? 'on' : '';
        if (head && head[0] === r && head[1] === c) cls += ' head';
        if (!path.length && v === 1) cls += ' start';
        UI.paintCell(cell, cls.trim(), '', UI.place(r, c) + (v ? ', number ' + v : '') + (on[r + ',' + c] ? ', on the line' : ''));
      });
      let svg = '';
      if (path.length) {
        svg = '<path class="zline" d="' + UI.pathD(path) + '"/>';
        svg += '<circle class="zhead" cx="' + (head[1] + 0.5) + '" cy="' + (head[0] + 0.5) + '" r="0.2"/>';
      }
      board.layer('path', svg);
    }
  });
})();
