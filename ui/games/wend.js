/* Wend: every letter belongs to one hidden word. */
(function () {
  const UI = window.NOOK_UI;
  const esc = UI.esc;

  const COPY = {
    verb: 'Spell the words',
    rule: 'Every letter belongs to one hidden word. Drag through letters that share a side to spell them.',
    how: [
      'Drag through letters that share a side to spell a word. Corners don’t count.',
      'Every open letter is used by exactly one word. The dashes below show how long each word is.',
      'Dark squares are walls; go around them.',
      'A real word on the wrong path won’t count: each letter belongs to one particular word.',
      'Keyboard: arrow keys move, Space adds a letter, Enter on the last letter clears the trail. A finished word locks in.'
    ],
    levels: { easy: 'shorter words', tricky: 'longer words', fiendish: 'longest words' },
    left: function (n) { return n === 1 ? '1 word to find.' : n + ' words to find.'; },
    wrongPath: function (w) { return '“' + w.toUpperCase() + '” is a word, but not on this path.'; },
    found: function (w) { return 'Found “' + w.toUpperCase() + '”.'; },
    lengths: 'Words to find'
  };

  function wallSet(p) {
    if (!p._wallSet) Object.defineProperty(p, '_wallSet', { value: new Set((p.walls || []).map(function (w) { return w[0] + ',' + w[1]; })), enumerable: false });
    return p._wallSet;
  }
  function usedBy(play, r, c) {
    for (let i = 0; i < play.found.length; i++) if (play.found[i].cells.some(function (x) { return x[0] === r && x[1] === c; })) return i;
    return -1;
  }
  function touch(p, play, r, c) {
    if (wallSet(p).has(r + ',' + c) || usedBy(play, r, c) >= 0) return;
    const t = play.trace;
    if (!t.length) { t.push([r, c]); return; }
    const last = t[t.length - 1];
    if (last[0] === r && last[1] === c) return;
    if (t.length > 1 && t[t.length - 2][0] === r && t[t.length - 2][1] === c) { t.pop(); return; }
    if (t.some(function (x) { return x[0] === r && x[1] === c; })) return;
    if (Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) return;
    t.push([r, c]);
  }
  function match(p, play) {
    const t = play.trace;
    return p.solution.find(function (w) {
      return w.cells.length === t.length && w.cells.every(function (x, i) { return x[0] === t[i][0] && x[1] === t[i][1]; }) &&
        !play.found.some(function (f) { return f.word === w.word; });
    });
  }
  function lock(play, hit) {
    play.found.push({ word: hit.word, cells: hit.cells.map(function (x) { return [x[0], x[1]]; }) });
    play.trace = [];
  }

  UI.register({
    id: 'wend',
    copy: COPY,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="a-bg" x="8" y="4" width="48" height="40" rx="3"/><rect class="a-wall" x="40" y="4" width="16" height="13"/><path class="a-line" d="M16 12H32V36H48"/><text class="a-word big" x="12" y="15">W</text><text class="a-word big" x="28" y="40">E</text></svg>',
    levelNote: function (p, level) { return p.rows + '×' + p.cols + ' · ' + p.lengths.length + ' words · ' + COPY.levels[level]; },
    fresh: function () { return { found: [], trace: [] }; },
    solved: function (p, play) { return play.found.length === p.solution.length; },
    hint: function (p, play) {
      const next = p.solution.find(function (w) { return !play.found.some(function (f) { return f.word === w.word; }); });
      if (!next) return;
      let prefix = 0;
      const t = play.trace;
      while (prefix < t.length && prefix < next.cells.length && t[prefix][0] === next.cells[prefix][0] && t[prefix][1] === next.cells[prefix][1]) prefix++;
      if (prefix >= next.cells.length - 1) lock(play, next);
      else play.trace = next.cells.slice(0, prefix + 1).map(function (x) { return [x[0], x[1]]; });
    },
    status: function (ctx) { return COPY.left(ctx.puzzle.solution.length - ctx.play.found.length); },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      const words = (ctx.engine && ctx.engine.words) || [];
      let dragging = false;
      const board = UI.board({
        n: p.rows, kind: 'wend', label: 'Letter board',
        locked: function () { return ctx.solved; },
        down: function (r, c) {
          ctx.begin();
          dragging = true;
          ctx.play.trace = [];
          touch(p, ctx.play, r, c);
          ctx.live();
        },
        move: function (r, c) {
          if (!dragging) return;
          const before = ctx.play.trace.length;
          touch(p, ctx.play, r, c);
          if (ctx.play.trace.length !== before) ctx.live();
        },
        up: function () {
          if (!dragging) return;
          dragging = false;
          const hit = match(p, ctx.play);
          let note = '';
          if (hit) { lock(ctx.play, hit); note = COPY.found(hit.word); } else {
            const spelled = ctx.play.trace.map(function (x) { return p.letters[x[0]][x[1]]; }).join('');
            if (spelled.length > 2 && words.indexOf(spelled) >= 0) note = COPY.wrongPath(spelled);
            const shake = ctx.play.trace.length > 1;
            ctx.play.trace = [];
            if (shake) ctx.shake();
          }
          ctx.end(note);
        },
        key: function (r, c, key) {
          if (key !== 'Space' && key !== 'Enter' && key !== 'Activate') return false;
          const t = ctx.play.trace;
          if (key === 'Enter' && t.length && UI.same(t[t.length - 1], [r, c])) {
            ctx.act(function (play) { play.trace = []; }, { group: 'trace' });
            return true;
          }
          let note = '';
          ctx.act(function (play) {
            touch(p, play, r, c);
            const hit = match(p, play);
            if (hit) { lock(play, hit); note = COPY.found(hit.word); }
          }, { group: 'trace' });
          if (note) ctx.say(note);
          return true;
        }
      });
      board.layer('lines', UI.lines(p.rows, function () { return 1; }));
      board.layer('trail');
      const blanks = UI.h('ol', { class: 'blanks', 'aria-label': COPY.lengths });
      ctx.ui.board = board;
      ctx.ui.blanks = blanks;
      stage.appendChild(UI.h('div', { class: 'board-wrap' }, board.el, blanks));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const play = ctx.play;
      const walls = wallSet(p);
      const onTrace = {};
      play.trace.forEach(function (x) { onTrace[x[0] + ',' + x[1]] = true; });
      ctx.ui.board.each(function (cell, r, c) {
        if (walls.has(r + ',' + c)) { UI.paintCell(cell, 'wall', '', UI.place(r, c) + ', wall'); return; }
        const used = usedBy(play, r, c);
        const cls = used >= 0 ? 'found wd' + (used % 8) : onTrace[r + ',' + c] ? 'on' : '';
        UI.paintCell(cell, cls, '<span class="letter">' + esc(p.letters[r][c]) + '</span>', UI.place(r, c) + ', ' + p.letters[r][c].toUpperCase() + (used >= 0 ? ', in ' + play.found[used].word.toUpperCase() : ''));
      });
      let svg = '';
      play.found.forEach(function (f, i) { svg += '<path class="wtrail wd' + (i % 8) + '" d="' + UI.pathD(f.cells) + '"/>'; });
      if (play.trace.length > 1) svg += '<path class="wtrail live" d="' + UI.pathD(play.trace) + '"/>';
      ctx.ui.board.layer('trail', svg);
      const found = play.found.slice();
      let html = '';
      p.lengths.forEach(function (len) {
        const at = found.findIndex(function (f) { return f.word.length === len; });
        const word = at >= 0 ? found.splice(at, 1)[0].word : '';
        html += '<li class="' + (word ? 'in' : '') + '" aria-label="' + (word ? esc(word) : len + ' letters') + '">' + (word ? esc(word) : '<span>' + new Array(len + 1).join('–') + '</span>') + '</li>';
      });
      if (ctx.ui.blanks._html !== html) { ctx.ui.blanks.innerHTML = html; ctx.ui.blanks._html = html; }
    }
  });
})();
