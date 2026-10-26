/* Pinpoint: five clues, one link. */
(function () {
  const UI = window.NOOK_UI;
  const esc = UI.esc;

  const COPY = {
    verb: 'Name the link',
    rule: 'Five clues share one link. Guess it using as few clues as you can.',
    how: [
      'You see one clue at first. Type what you think links the clues, then tap Guess.',
      'A wrong guess shows the next clue. Next clue shows another clue without using a guess.',
      'The fewer clues you need, the better. After all five, Show answer reveals it.',
      'Capitals, punctuation, “a” or “the”, and plurals don’t matter. Other common ways of saying it count too.'
    ],
    levels: { easy: 'everyday groups', tricky: 'words that pair with another word', fiendish: 'harder word pairs and hidden words' },
    placeholder: 'What links them?',
    guess: 'Guess',
    label: 'Your guess',
    clue: function (i) { return 'Clue ' + i; },
    hidden: 'hidden',
    nextClue: 'Next clue',
    showAnswer: 'Show answer',
    shown: function (n) { return n === 1 ? '1 clue showing. What links them?' : n + ' clues showing. What links them?'; },
    empty: 'Type a guess, or tap Next clue.',
    wrong: 'Not quite. Here’s another clue.',
    wrongLast: 'Not quite. Try again, or tap Show answer.',
    tried: 'Tried',
    wonLine: function (p, used, revealed) { return '<b>' + esc(p.category) + '</b>' + (p.description ? ': ' + esc(p.description) : '') + '<br>' + (revealed ? 'Answer shown after all five clues.' : used === 1 ? 'Got it with 1 clue.' : 'Got it with ' + used + ' clues.'); }
  };

  function matches(ctx, text) {
    return ctx.engine.matches(ctx.puzzle, text);
  }

  function guess(ctx) {
    const input = ctx.ui.input;
    const text = (input.value || '').trim();
    if (!text) { ctx.say(COPY.empty); input.focus(); return; }
    const hit = matches(ctx, text);
    let note = '';
    ctx.act(function (play) {
      play.text = text;
      if (hit) { play.won = true; return; }
      play.tried.push(text);
      if (play.shown < ctx.puzzle.words.length) { play.shown += 1; note = COPY.wrong; } else note = COPY.wrongLast;
    }, { note: hit ? '' : note });
    if (!hit) {
      ctx.say(note);
      ctx.shake();
      input.value = '';
      input.focus();
    }
  }

  UI.register({
    id: 'pinpoint',
    copy: COPY,
    sheet: true,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="a-bg" x="8" y="5" width="48" height="10" rx="2"/><rect class="a-bg" x="8" y="19" width="48" height="10" rx="2"/><rect class="a-faint" x="8" y="33" width="48" height="10" rx="2"/><text class="a-word" x="13" y="12.8">apple</text><text class="a-word" x="13" y="26.8">plum</text></svg>',
    levelNote: function (p, level) { return COPY.levels[level] || ''; },
    fresh: function () { return { shown: 1, tried: [], text: '', won: false }; },
    solved: function (p, play) { return !!play.won; },
    hint: function (p, play) {
      if (play.shown < p.words.length) { play.shown += 1; return; }
      play.text = p.category;
      play.won = true;
      play.revealed = true;
    },
    hintNote: function (p, play) { return play.revealed ? 'Here’s the answer.' : 'Here’s another clue.'; },
    hintLabel: function (ctx) { return ctx.play && ctx.play.shown < ctx.puzzle.words.length ? COPY.nextClue : COPY.showAnswer; },
    status: function (ctx) { return COPY.shown(ctx.play.shown); },
    wonLine: function (ctx) { return COPY.wonLine(ctx.puzzle, ctx.play.shown, ctx.play.revealed); },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      const list = UI.h('ol', { class: 'clue-list' });
      for (let i = 0; i < p.words.length; i++) list.appendChild(UI.h('li', { 'data-clue': i }));
      const input = UI.h('input', { type: 'text', 'data-guess': '', 'aria-label': COPY.label, placeholder: COPY.placeholder, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'go' });
      const form = UI.h('form', { class: 'guess', onsubmit: function (e) { e.preventDefault(); guess(ctx); } },
        input, UI.h('button', { type: 'submit', class: 'primary', 'data-act': 'guess' }, COPY.guess));
      const tried = UI.h('p', { class: 'tried' });
      ctx.ui.list = list;
      ctx.ui.input = input;
      ctx.ui.form = form;
      ctx.ui.tried = tried;
      stage.appendChild(UI.h('div', { class: 'sheet' }, list, form, tried));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const play = ctx.play;
      ctx.ui.list.querySelectorAll('li').forEach(function (li, i) {
        const open = i < play.shown || ctx.solved;
        const html = '<span class="n">' + (i + 1) + '</span>' + (open ? '<span class="w">' + esc(p.words[i]) + '</span>' : '<span class="w veiled">' + COPY.clue(i + 1) + '</span>');
        if (li._html !== html) { li.innerHTML = html; li._html = html; }
        li.className = open ? 'open' : 'veiled';
        li.setAttribute('aria-label', open ? COPY.clue(i + 1) + ': ' + p.words[i] : COPY.clue(i + 1) + ', ' + COPY.hidden);
      });
      ctx.ui.input.readOnly = ctx.solved;
      ctx.ui.form.querySelector('button').disabled = ctx.solved;
      if (ctx.solved && ctx.ui.input.value !== play.text) ctx.ui.input.value = play.text;
      ctx.ui.tried.textContent = play.tried.length && !ctx.solved ? COPY.tried + ': ' + play.tried.join(' · ') : '';
    }
  });
})();
