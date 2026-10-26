/* Crossclimb: answer the rungs, order them one letter apart, then the two ends. */
(function () {
  const UI = window.NOOK_UI;
  const esc = UI.esc;

  const COPY = {
    verb: 'Climb the ladder',
    rule: 'Answer each clue, then order the words so each differs from the next by one letter. Then solve the top and bottom.',
    how: [
      'Type an answer for each clue. A tick shows the word is right.',
      'Use the ↑ and ↓ buttons to move words until each one changes just one letter from the word next to it. The ladder works either way up.',
      'Then the top and bottom unlock. They share one clue, and together they name one thing.',
      'Each end also changes one letter from the word next to it. Type both to finish.'
    ],
    levels: { easy: 'shorter ladder', tricky: 'longer ladder', fiendish: 'longest ladder' },
    words: function (got, all) { return got + ' of ' + all + ' words right.'; },
    order: 'All right! Now put them in order: one letter changes at each step.',
    ends: 'The ladder is in order. Now solve the top and bottom.',
    locked: 'Unlocks when the ladder is in order',
    top: 'Top word',
    bottom: 'Bottom word',
    up: 'Move up',
    down: 'Move down',
    right: 'right',
    rung: function (i) { return 'Rung ' + i; }
  };

  function steps(a, b) {
    if (!a || !b || a.length !== b.length) return 99;
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  }
  function right(p, play) { return p.rungs.filter(function (rung, i) { return play.typed[i] === rung.answer; }).length; }
  function allRight(p, play) { return right(p, play) === p.rungs.length; }
  function seq(play) { return play.order.map(function (i) { return play.typed[i]; }); }
  function chain(play) {
    const s = seq(play);
    for (let i = 1; i < s.length; i++) if (steps(s[i - 1], s[i]) !== 1) return false;
    return true;
  }
  function open(p, play) { return allRight(p, play) && chain(play); }
  function solved(p, play) {
    if (!open(p, play)) return false;
    const s = seq(play);
    const pair = (play.top === p.top && play.bottom === p.bottom) || (play.top === p.bottom && play.bottom === p.top);
    return pair && steps(play.top, s[0]) === 1 && steps(s[s.length - 1], play.bottom) === 1;
  }
  function clean(p, text) { return String(text).toLowerCase().replace(/[^a-z]/g, '').slice(0, p.letters); }

  UI.register({
    id: 'crossclimb',
    copy: COPY,
    sheet: true,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><path class="a-rail" d="M14 3v42M50 3v42"/><rect class="a-bg" x="14" y="6" width="36" height="9" rx="2"/><rect class="a-bg" x="14" y="19.5" width="36" height="9" rx="2"/><rect class="a-bg" x="14" y="33" width="36" height="9" rx="2"/><text class="a-word" x="20" y="13">cold</text><text class="a-word" x="20" y="26.5">cord</text><text class="a-word" x="20" y="40">word</text></svg>',
    levelNote: function (p, level) { return p.letters + '-letter words · ' + p.rungs.length + ' clues'; },
    fresh: function (p) { return { typed: p.rungs.map(function () { return ''; }), order: p.rungs.map(function (_, i) { return i; }), top: '', bottom: '' }; },
    solved: solved,
    hint: function (p, play) {
      for (let i = 0; i < p.rungs.length; i++) {
        if (play.typed[i] !== p.rungs[i].answer) { play.typed[i] = p.rungs[i].answer; return; }
      }
      if (!chain(play) || (steps(p.top, seq(play)[0]) !== 1 && steps(p.bottom, seq(play)[0]) !== 1)) {
        play.order = p.solution.slice(1, -1).map(function (w) { return p.rungs.findIndex(function (r) { return r.answer === w; }); });
        return;
      }
      const s = seq(play);
      const topWord = steps(p.top, s[0]) === 1 ? p.top : p.bottom;
      const bottomWord = topWord === p.top ? p.bottom : p.top;
      if (play.top !== topWord) { play.top = topWord; return; }
      play.bottom = bottomWord;
    },
    status: function (ctx) {
      const p = ctx.puzzle;
      const play = ctx.play;
      if (!allRight(p, play)) return COPY.words(right(p, play), p.rungs.length);
      if (!chain(play)) return COPY.order;
      return COPY.ends;
    },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      function endInput(which) {
        return UI.h('input', {
          type: 'text', 'data-end': which, 'aria-label': which === 'top' ? COPY.top : COPY.bottom, maxlength: p.letters,
          autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: COPY.locked,
          oninput: function (e) {
            const v = clean(p, e.target.value);
            if (v !== e.target.value) e.target.value = v;
            ctx.act(function (play) { play[which] = v; }, { group: 'end-' + which });
          }
        });
      }
      const topRow = UI.h('div', { class: 'end-row top' }, endInput('top'));
      const bottomRow = UI.h('div', { class: 'end-row bottom' }, endInput('bottom'));
      const clue = UI.h('p', { class: 'end-clue' });
      const ladder = UI.h('ol', { class: 'ladder' });
      ctx.ui.ladder = ladder;
      ctx.ui.clue = clue;
      ctx.ui.ends = [topRow, bottomRow];
      ctx.ui.rows = p.rungs.map(function (rung, idx) {
        const input = UI.h('input', {
          type: 'text', 'data-rung': idx, maxlength: p.letters, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
          'aria-label': rung.clue,
          oninput: function (e) {
            const v = clean(p, e.target.value);
            if (v !== e.target.value) e.target.value = v;
            ctx.act(function (play) { play.typed[idx] = v; }, { group: 'rung-' + idx });
          }
        });
        function move(dir) {
          const at = ctx.play.order.indexOf(idx);
          const to = at + dir;
          if (to < 0 || to >= ctx.play.order.length) return;
          ctx.act(function (play) {
            const tmp = play.order[at];
            play.order[at] = play.order[to];
            play.order[to] = tmp;
          });
          const btn = row.querySelector(dir < 0 ? '[data-move="up"]' : '[data-move="down"]');
          if (btn && !btn.disabled && document.activeElement && document.activeElement.closest && document.activeElement.closest('.ladder')) btn.focus();
          else if (btn && btn.disabled) row.querySelector(dir < 0 ? '[data-move="down"]' : '[data-move="up"]').focus();
        }
        const row = UI.h('li', { class: 'rung', 'data-idx': idx },
          UI.h('div', { class: 'rung-main' },
            UI.h('label', null, input, UI.h('span', { class: 'rung-clue', text: rung.clue })),
            UI.h('span', { class: 'rung-ok', html: UI.icon.tick() })),
          UI.h('div', { class: 'movers' },
            UI.h('button', { type: 'button', class: 'mover', 'data-move': 'up', 'aria-label': COPY.up + ': ' + rung.clue, onclick: function () { move(-1); } }, '↑'),
            UI.h('button', { type: 'button', class: 'mover', 'data-move': 'down', 'aria-label': COPY.down + ': ' + rung.clue, onclick: function () { move(1); } }, '↓')));
        return row;
      });
      stage.appendChild(UI.h('div', { class: 'sheet' }, clue, topRow, ladder, bottomRow));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const play = ctx.play;
      const isOpen = open(p, play);
      const active = document.activeElement;
      play.order.forEach(function (idx, at) {
        const row = ctx.ui.rows[idx];
        if (ctx.ui.ladder.children[at] !== row) ctx.ui.ladder.insertBefore(row, ctx.ui.ladder.children[at] || null);
        const input = row.querySelector('input');
        if (input !== active && input.value !== play.typed[idx]) input.value = play.typed[idx];
        input.readOnly = ctx.solved;
        const ok = play.typed[idx] === p.rungs[idx].answer;
        row.classList.toggle('right', ok);
        input.setAttribute('aria-label', p.rungs[idx].clue + (ok ? ', ' + COPY.right : ''));
        row.querySelector('[data-move="up"]').disabled = at === 0 || ctx.solved;
        row.querySelector('[data-move="down"]').disabled = at === play.order.length - 1 || ctx.solved;
      });
      if (active && ctx.ui.ladder.contains(active) && document.activeElement !== active) active.focus();
      ctx.ui.clue.innerHTML = isOpen ? esc(p.endClue) : '';
      ctx.ui.clue.hidden = !isOpen;
      ctx.ui.ends.forEach(function (row) {
        const input = row.querySelector('input');
        const which = input.getAttribute('data-end');
        input.disabled = !isOpen;
        input.readOnly = ctx.solved;
        input.placeholder = isOpen ? (which === 'top' ? COPY.top : COPY.bottom) : COPY.locked;
        if (input !== active && input.value !== play[which]) input.value = play[which];
        row.classList.toggle('open', isOpen);
        row.classList.toggle('right', ctx.solved);
      });
    }
  });
})();
