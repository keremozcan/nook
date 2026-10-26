/* Nook shell: routing, saved games, the clock, the dock, the solved panel and Tonight.
   Each game lives in ui/games/<id>.js and registers itself with NOOK_UI.register. */
(function () {
  const UI = window.NOOK_UI;
  const h = UI.h;
  const esc = UI.esc;
  const fmt = UI.fmt;

  /* Tonight plays these in order, one fixed puzzle each for the date. */
  const ORDER = ['zip', 'sudoku', 'murdoku', 'queens', 'tango', 'patches', 'pinpoint', 'crossclimb', 'wend'];
  const SHELVES = [
    ['Boards', ['zip', 'queens', 'tango', 'sudoku', 'patches', 'murdoku']],
    ['Words', ['pinpoint', 'crossclimb', 'wend']]
  ];
  const LEVEL = { mini: 'Mini', easy: 'Easy', tricky: 'Tricky', fiendish: 'Fiendish' };

  /* Every shell string, in one place for the copy reviewer. */
  const COPY = {
    eyebrow: 'Nine puzzles',
    lede: 'No ads. Nothing to buy. Just a quiet puzzle or two.',
    tonight: 'Tonight',
    tonightTitle: 'Nine in a row',
    tonightStart: 'Start',
    tonightGoOn: 'Carry on',
    tonightProgress: function (i) { return i + ' of 9 done'; },
    tonightDone: 'All nine done',
    tonightSee: 'See times',
    tonightOf: function (i) { return 'Tonight · ' + i + ' of 9'; },
    carryOn: 'Carry on',
    best: 'Best',
    back: 'Games',
    share: 'Share',
    copied: 'Link copied.',
    copyFailed: 'Copy the address bar to share this puzzle.',
    undo: 'Undo',
    hint: 'Hint',
    check: 'Check errors',
    newPuzzle: 'New puzzle',
    difficulty: 'Difficulty',
    howToPlay: 'How to play',
    loading: 'Shuffling the pieces…',
    failed: 'This puzzle didn’t load. Try a new one.',
    tryAgain: 'Try a new one',
    updated: 'This puzzle has been updated, so it starts fresh.',
    solved: 'Solved',
    solvedIn: function (t) { return 'Solved in ' + t + '.'; },
    newBest: 'New best time!',
    bestWas: function (t) { return 'Best ' + t; },
    nextPuzzle: 'Next puzzle',
    nextGame: 'Next game',
    tonightTimes: 'See tonight’s times',
    allGames: 'All games',
    summaryTitle: 'All nine done.',
    summaryLede: 'That’s tonight’s nine. The times are just for you.',
    summaryTotal: 'Total',
    oneStep: 'Here’s one step.'
  };

  /* ---------- Storage: one saved puzzle per game, best times, preferences, Tonight. ---------- */
  const KEY = 'nook.v2';
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function blank() { return { best: {}, level: {}, check: true, saved: {}, tonight: null }; }
  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (err) { data = null; }
    if (data && typeof data === 'object') return Object.assign(blank(), data);
    data = blank();
    try {
      const old = JSON.parse(localStorage.getItem('nook.v1'));
      if (old && typeof old === 'object') {
        // Best times and chosen levels carry over; the old single resume slot is dropped.
        if (old.best) data.best = old.best;
        if (old.difficulty) data.level = old.difficulty;
        if (old.mistakes === false) data.check = false;
      }
    } catch (err) { /* Start clean. */ }
    return data;
  }
  let store = load();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (err) { /* Play still works without storage. */ }
  }
  function tonight() {
    if (!store.tonight || store.tonight.date !== today()) store.tonight = { date: today(), index: 0, times: [], slot: null };
    return store.tonight;
  }
  function tonightLevel(game) { return game === 'sudoku' ? 'mini' : 'easy'; }
  function dailySeed(game, level) { return 'daily-' + today() + '-' + game + '-' + level; }

  const WORDS = ['amber', 'lantern', 'quiet', 'cedar', 'linen', 'copper', 'harbour', 'meadow', 'velvet', 'paper', 'orchard', 'willow', 'candle', 'marble', 'thistle', 'river', 'saffron', 'pewter', 'garden', 'ivory', 'cinder', 'maple', 'birch', 'honey', 'flint', 'pearl', 'olive', 'hearth', 'clover', 'spruce', 'cobalt', 'sorrel', 'yarrow', 'pebble', 'autumn', 'silver', 'brass', 'nectar', 'fable', 'heron'];
  function freshSeed() {
    const a = WORDS[Math.floor(Math.random() * WORDS.length)];
    let b = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (a === b) b = WORDS[(WORDS.indexOf(a) + 7) % WORDS.length];
    return a + '-' + b + '-' + (Math.floor(Math.random() * 9) + 1);
  }
  function sig(puzzle) {
    const text = JSON.stringify(puzzle);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(36);
  }

  /* ---------- State ---------- */
  const S = {
    view: 'home', game: null, level: null, seed: null, round: false,
    puzzle: null, play: null, ui: null, undo: [], group: null, pending: null,
    elapsed: 0, running: false, t0: 0, solved: false, note: '', token: 0,
    result: null, toast: '', ctx: null
  };
  function engine(id) { return (window.NOOK_ENGINES || {})[id]; }
  function game(id) { return UI.games[id || S.game]; }
  function levels(id) {
    const e = engine(id);
    return e ? e.difficulties.map(function (d) { return d.id; }) : ['easy'];
  }
  function nameOf(id) { const e = engine(id); return e ? e.name : id; }

  /* ---------- Clock: starts on the first move, pauses when the tab is hidden. ---------- */
  function now() { return S.running ? S.elapsed + (performance.now() - S.t0) : S.elapsed; }
  function startClock() {
    if (S.running || S.solved || document.visibilityState === 'hidden') return;
    S.running = true;
    S.t0 = performance.now();
  }
  function pauseClock() {
    if (!S.running) return;
    S.elapsed = now();
    S.running = false;
  }
  setInterval(function () {
    if (!S.running) return;
    const node = document.getElementById('clock');
    if (node) node.textContent = fmt(now());
  }, 500);

  /* ---------- Saving the current puzzle ---------- */
  function saveSlot() {
    if (S.view !== 'game' || !S.puzzle || S.solved) return;
    if (!S.undo.length && !S.elapsed && !S.running) return;
    const slot = { game: S.game, level: S.level, seed: S.seed, sig: S.sig, play: S.play, undo: S.undo.slice(-60), elapsed: Math.round(now()) };
    if (S.round) tonight().slot = slot;
    else store.saved[S.game] = slot;
    persist();
  }
  function dropSlot() {
    if (S.round) tonight().slot = null;
    else delete store.saved[S.game];
    persist();
  }

  /* ---------- The context a game works through ---------- */
  function makeCtx() {
    const ctx = {
      get puzzle() { return S.puzzle; },
      get play() { return S.play; },
      get solved() { return S.solved; },
      get check() { return store.check; },
      get level() { return S.level; },
      get engine() { return engine(S.game); },
      ui: S.ui,
      stage: null,
      /* One move: fn changes play. Returns true if anything changed. */
      act: function (fn, opts) {
        if (S.solved) return false;
        const before = JSON.stringify(S.play);
        fn(S.play);
        const after = JSON.stringify(S.play);
        S.note = (opts && opts.note) || '';
        if (before === after) { paint(); return false; }
        const group = (opts && opts.group) || null;
        if (!group || group !== S.group) pushUndo(before);
        S.group = group;
        changed();
        return true;
      },
      /* A drag: begin(), change play and live() as it goes, end() when the finger lifts. */
      begin: function () { if (!S.solved) S.pending = JSON.stringify(S.play); },
      live: function () { paintBoard(); },
      end: function (note) {
        if (S.pending == null) return;
        const before = S.pending;
        S.pending = null;
        S.note = note || '';
        if (before !== JSON.stringify(S.play)) {
          pushUndo(before);
          S.group = null;
          changed();
        } else paint();
      },
      say: function (text) { S.note = text || ''; paintStatus(); },
      paint: function () { paint(); },
      shake: function (node) {
        const target = node || document.querySelector('.stage .board, .stage .sheet');
        if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        target.classList.remove('shake');
        void target.offsetWidth;
        target.classList.add('shake');
      }
    };
    return ctx;
  }
  function pushUndo(before) {
    S.undo.push(before);
    if (S.undo.length > 300) S.undo.shift();
  }
  function changed() {
    startClock();
    if (game().solved(S.puzzle, S.play)) win();
    else saveSlot();
    paint();
  }

  /* ---------- Winning ---------- */
  function win() {
    pauseClock();
    S.solved = true;
    const ms = Math.max(1000, Math.round(S.elapsed));
    S.elapsed = ms;
    const key = S.game + '/' + S.level;
    const prev = store.best[key];
    const secs = Math.round(ms / 1000);
    const newBest = prev == null || secs < prev;
    if (newBest) store.best[key] = secs;
    S.result = { ms: ms, best: newBest ? secs : prev, newBest: newBest && prev != null };
    if (S.round) {
      const t = tonight();
      t.times.push({ game: S.game, ms: ms });
      t.index = ORDER.indexOf(S.game) + 1;
      t.slot = null;
    } else delete store.saved[S.game];
    persist();
    S.note = COPY.solvedIn(fmt(ms));
  }

  /* ---------- Rendering ---------- */
  function app() { return document.getElementById('app'); }
  function render() {
    const root = app();
    root.innerHTML = '';
    if (S.view === 'home') root.appendChild(homeView());
    else if (S.view === 'summary') root.appendChild(summaryView());
    else root.appendChild(gameView());
    document.title = S.view === 'game' ? 'Nook · ' + nameOf(S.game) : 'Nook';
    if (S.view === 'game' && S.puzzle) mountGame();
  }

  function homeView() {
    const t = tonight();
    let tonightSub = COPY.tonightTitle;
    let go = COPY.tonightStart;
    if (t.index >= ORDER.length) {
      tonightSub = COPY.tonightDone + ' · ' + fmt(t.times.reduce(function (a, x) { return a + x.ms; }, 0));
      go = COPY.tonightSee;
    } else if (t.index > 0 || t.slot) {
      tonightSub = COPY.tonightProgress(t.index);
      go = COPY.tonightGoOn;
    }
    const main = h('main', { class: 'home' },
      h('header', { class: 'mast' },
        h('p', { class: 'eyebrow', text: COPY.eyebrow }),
        h('h1', { text: 'Nook' }),
        h('p', { class: 'lede', text: COPY.lede })),
      h('button', { type: 'button', class: 'tonight', 'data-act': 'tonight', onclick: startTonight },
        h('span', { class: 'tonight-copy' },
          h('span', { class: 'eyebrow', text: COPY.tonight }),
          h('span', { class: 'tonight-title', text: tonightSub })),
        h('span', { class: 'tonight-go', text: go })));
    SHELVES.forEach(function (shelf) {
      const row = h('div', { class: 'shelf' });
      shelf[1].forEach(function (id) { row.appendChild(tile(id)); });
      main.appendChild(h('section', { class: 'shelf-block' }, h('h2', { text: shelf[0] }), row));
    });
    return main;
  }
  function bestFor(id) {
    let secs = null;
    Object.keys(store.best).forEach(function (key) {
      if (key.indexOf(id + '/') === 0 && (secs == null || store.best[key] < secs)) secs = store.best[key];
    });
    return secs;
  }
  function tile(id) {
    const g = game(id);
    const saved = store.saved[id];
    let sub = g.copy.verb;
    let extra = '';
    if (saved) {
      sub = COPY.carryOn + ' · ' + (LEVEL[saved.level] || saved.level);
      extra = fmt(saved.elapsed || 0);
    } else if (bestFor(id) != null) extra = COPY.best + ' ' + fmt(bestFor(id) * 1000);
    return h('button', { type: 'button', class: 'tile' + (saved ? ' saved' : ''), 'data-game': id, onclick: function () { openGame(id, null, null, { push: true }); } },
      h('span', { class: 'art', html: g.art }),
      h('span', { class: 'tile-name', text: nameOf(id) }),
      h('span', { class: 'tile-sub' }, sub, extra ? h('span', { class: 'tile-extra', text: extra }) : null));
  }

  function summaryView() {
    const t = tonight();
    const list = h('ol', { class: 'times' });
    let total = 0;
    t.times.forEach(function (item) {
      total += item.ms;
      list.appendChild(h('li', null, nameOf(item.game), h('span', { text: fmt(item.ms) })));
    });
    list.appendChild(h('li', { class: 'total' }, COPY.summaryTotal, h('span', { text: fmt(total) })));
    return h('main', { class: 'summary' },
      h('p', { class: 'eyebrow', text: COPY.tonight }),
      h('h1', { text: COPY.summaryTitle }),
      h('p', { class: 'lede', text: COPY.summaryLede }),
      list,
      h('button', { type: 'button', class: 'primary', 'data-act': 'home', onclick: function () { goHome(true); } }, COPY.allGames));
  }

  function gameView() {
    const g = game();
    const main = h('main', { class: 'play g-' + S.game });
    const best = store.best[S.game + '/' + S.level];
    main.appendChild(h('header', { class: 'bar' },
      h('button', { type: 'button', class: 'back', 'data-act': 'home', onclick: function () { goHome(true); } }, h('span', { 'aria-hidden': 'true', text: '←' }), COPY.back),
      h('h1', { text: nameOf(S.game) }),
      h('div', { class: 'clockbox' },
        h('span', { id: 'clock', class: 'clock', 'aria-label': 'Time', text: fmt(now()) }),
        h('small', { id: 'best', text: best != null ? COPY.best + ' ' + fmt(best * 1000) : '' }))));
    const meta = h('div', { class: 'meta' });
    if (S.round) meta.appendChild(h('p', { class: 'round', text: COPY.tonightOf(ORDER.indexOf(S.game) + 1) }));
    else {
      const seg = h('div', { class: 'levels', role: 'group', 'aria-label': COPY.difficulty });
      levels(S.game).forEach(function (id) {
        seg.appendChild(h('button', { type: 'button', 'data-level': id, 'aria-pressed': String(id === S.level), onclick: function () { if (id !== S.level) openGame(S.game, id, null, {}); } }, LEVEL[id] || id));
      });
      meta.appendChild(seg);
    }
    meta.appendChild(h('button', { type: 'button', class: 'share', 'data-act': 'share', onclick: share }, COPY.share));
    main.appendChild(meta);
    main.appendChild(h('p', { class: 'rule', html: typeof g.copy.rule === 'function' ? g.copy.rule(S.puzzle) : g.copy.rule }));
    main.appendChild(h('p', { class: 'level-note', id: 'level-note', text: levelNote() }));
    const stage = h('div', { class: 'stage', id: 'stage' });
    if (!S.puzzle) {
      stage.classList.add('waiting');
      stage.appendChild(S.failed
        ? h('div', { class: 'placeholder failed' }, h('p', { text: COPY.failed }), h('button', { type: 'button', class: 'primary', onclick: newPuzzle }, COPY.tryAgain))
        : h('div', { class: 'placeholder', 'aria-busy': 'true' }, h('p', { class: 'loading', text: COPY.loading })));
    }
    main.appendChild(stage);
    main.appendChild(h('p', { class: 'status', id: 'status', role: 'status', 'aria-live': 'polite' }));
    main.appendChild(h('div', { class: 'foot', id: 'foot' },
      h('div', { class: 'fold dock-fold' }, h('div', { class: 'dock', id: 'dock' })),
      h('div', { class: 'fold done-fold' }, h('div', { class: 'done', id: 'done' }))));
    const how = h('details', { class: 'how' }, h('summary', { text: COPY.howToPlay }));
    const list = h('ul');
    g.copy.how.forEach(function (line) { list.appendChild(h('li', { html: line })); });
    how.appendChild(list);
    main.appendChild(how);
    if (S.toast) main.appendChild(h('div', { class: 'toast', role: 'status', text: S.toast }));
    return main;
  }
  function levelNote() {
    const g = game();
    const label = LEVEL[S.level] || S.level;
    const extra = S.puzzle && g.levelNote ? g.levelNote(S.puzzle, S.level) : (g.copy.levels && g.copy.levels[S.level]) || '';
    return label + (extra ? ' · ' + extra : '');
  }

  function mountGame() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    stage.innerHTML = '';
    stage.className = 'stage' + (game().side ? ' with-side' : '') + (game().sheet ? ' sheet-stage' : '');
    S.ctx.stage = stage;
    game().mount(S.ctx, stage);
    paint();
  }

  function paint() {
    if (S.view !== 'game' || !S.puzzle || !S.ctx || !S.ctx.stage) return;
    game().paint(S.ctx);
    paintStatus();
    paintFoot();
    const stage = S.ctx.stage;
    stage.classList.toggle('is-solved', S.solved);
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = fmt(now());
  }
  function paintBoard() {
    if (S.ctx && S.ctx.stage) game().paint(S.ctx);
    paintStatus();
  }
  function paintStatus() {
    const node = document.getElementById('status');
    if (!node || !S.puzzle) return;
    const text = S.note || (S.solved ? COPY.solvedIn(fmt(S.elapsed)) : game().status(S.ctx));
    if (node.textContent !== text) node.textContent = text;
  }
  function paintFoot() {
    const foot = document.getElementById('foot');
    const dock = document.getElementById('dock');
    const done = document.getElementById('done');
    if (!foot) return;
    foot.classList.toggle('is-solved', S.solved);
    dock.parentNode.inert = S.solved;
    done.parentNode.inert = !S.solved;
    const g = game();
    const hintLabel = g.hintLabel ? g.hintLabel(S.ctx) : COPY.hint;
    const key = [S.undo.length > 0, hintLabel, store.check, S.solved, S.round].join('|');
    if (dock._key !== key) {
      dock._key = key;
      const keep = document.activeElement && dock.contains(document.activeElement) ? document.activeElement.getAttribute('data-act') : null;
      dock.innerHTML = '';
      dock.appendChild(h('button', { type: 'button', 'data-act': 'undo', disabled: !S.undo.length || S.solved, onclick: undo }, COPY.undo));
      dock.appendChild(h('button', { type: 'button', 'data-act': 'hint', disabled: S.solved, onclick: hint }, hintLabel));
      if (g.check) dock.appendChild(h('button', { type: 'button', 'data-act': 'check', 'aria-pressed': String(!!store.check), onclick: toggleCheck }, COPY.check));
      if (!S.round) dock.appendChild(h('button', { type: 'button', 'data-act': 'new', onclick: newPuzzle }, COPY.newPuzzle));
      if (keep) { const again = dock.querySelector('[data-act="' + keep + '"]'); if (again && !again.disabled) again.focus(); }
    }
    if (S.solved && !done._filled) {
      done._filled = true;
      const r = S.result || { ms: S.elapsed, best: null };
      const t = S.round ? tonight() : null;
      const label = S.round ? (t.index >= ORDER.length ? COPY.tonightTimes : COPY.nextGame) : COPY.nextPuzzle;
      const extra = g.wonLine ? g.wonLine(S.ctx) : '';
      const primary = h('button', { type: 'button', class: 'primary', 'data-act': 'next', onclick: next }, label);
      done.appendChild(h('div', { class: 'done-head' },
        h('h2', { text: COPY.solved }),
        h('p', { class: 'done-time' }, h('strong', { text: fmt(r.ms) }), h('span', { text: r.newBest ? COPY.newBest : r.best != null ? COPY.bestWas(fmt(r.best * 1000)) : '' }))));
      if (extra) done.appendChild(h('p', { class: 'done-extra', html: extra }));
      done.appendChild(h('div', { class: 'done-actions' }, primary, h('button', { type: 'button', class: 'link', 'data-act': 'home', onclick: function () { goHome(true); } }, COPY.allGames)));
      const best = document.getElementById('best');
      if (best && store.best[S.game + '/' + S.level] != null) best.textContent = COPY.best + ' ' + fmt(store.best[S.game + '/' + S.level] * 1000);
      if (document.activeElement && document.activeElement !== document.body && !/INPUT/.test(document.activeElement.tagName)) primary.focus({ preventScroll: true });
    } else if (!S.solved && done._filled) {
      done._filled = false;
      done.innerHTML = '';
    }
  }

  /* ---------- Actions ---------- */
  function undo() {
    if (S.solved || !S.undo.length) return;
    S.play = JSON.parse(S.undo.pop());
    S.group = null;
    S.note = '';
    if (game().afterUndo) game().afterUndo(S.ctx);
    saveSlot();
    paint();
  }
  function hint() {
    if (S.solved || !S.puzzle) return;
    S.group = null;
    const changedAny = S.ctx.act(function (play) { game().hint(S.puzzle, play, S.ctx); }, { note: COPY.oneStep });
    if (!changedAny) paint();
  }
  function toggleCheck() {
    store.check = !store.check;
    persist();
    paint();
  }
  function newPuzzle() {
    if (!S.round && S.game) delete store.saved[S.game];
    persist();
    S.failed = false;
    openGame(S.game, S.level, freshSeed(), { fresh: true });
  }
  function next() {
    if (S.round) { startTonight(); return; }
    openGame(S.game, S.level, freshSeed(), { fresh: true });
  }
  function share() {
    const say = function (text) {
      S.toast = text;
      const old = document.querySelector('.toast');
      if (old) old.remove();
      const main = document.querySelector('main');
      if (main) main.appendChild(h('div', { class: 'toast', role: 'status', text: text }));
      clearTimeout(share.timer);
      share.timer = setTimeout(function () { S.toast = ''; const t = document.querySelector('.toast'); if (t) t.remove(); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(function () { say(COPY.copied); }, function () { say(COPY.copyFailed); });
    else say(COPY.copyFailed);
  }

  /* ---------- Navigation ---------- */
  function leave() {
    if (S.view === 'game') { pauseClock(); saveSlot(); }
    S.token++;
  }
  function goHome(push) {
    leave();
    S.view = 'home';
    S.round = false;
    S.puzzle = null;
    S.ctx = null;
    if (push && location.hash) history.pushState(null, '', location.pathname + location.search);
    render();
    window.scrollTo(0, 0);
  }
  function startTonight() {
    const t = tonight();
    if (t.index >= ORDER.length) {
      leave();
      S.view = 'summary';
      render();
      return;
    }
    const id = ORDER[t.index];
    const level = tonightLevel(id);
    openGame(id, level, dailySeed(id, level), { push: S.view === 'home', round: true });
  }
  /* Open a game. With no seed, resume that game's saved puzzle at this level, else deal a new one. */
  function openGame(id, level, seed, opts) {
    opts = opts || {};
    leave();
    const g = game(id);
    const allowed = levels(id);
    if (!level) level = (!opts.round && store.saved[id] && store.saved[id].level) || store.level[id];
    if (allowed.indexOf(level) < 0) level = allowed.indexOf('easy') >= 0 ? 'easy' : allowed[0];
    const saved = opts.round ? tonight().slot : store.saved[id];
    if (!seed) seed = saved && saved.game === id && saved.level === level ? saved.seed : freshSeed();
    if (!opts.round) { store.level[id] = level; persist(); }
    Object.assign(S, {
      view: 'game', game: id, level: level, seed: seed, round: !!opts.round,
      puzzle: null, play: null, ui: {}, undo: [], group: null, pending: null,
      elapsed: 0, running: false, solved: false, note: '', result: null, failed: false
    });
    const url = '#' + [id, level, encodeURIComponent(seed)].join('/');
    if (opts.push) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
    render();
    window.scrollTo(0, 0);
    const token = ++S.token;
    // Let the page paint first; the loading line only fades in if dealing takes over ~150 ms.
    requestAnimationFrame(function () {
      setTimeout(function () {
        if (token !== S.token) return;
        deal(id, level, seed, opts, g);
      }, 0);
    });
  }
  function deal(id, level, seed, opts, g) {
    const e = engine(id);
    let puzzle;
    try { puzzle = e.generate(level, seed); } catch (err) { puzzle = null; }
    if (!puzzle) {
      S.failed = true;
      render();
      return;
    }
    S.puzzle = puzzle;
    S.sig = sig(puzzle);
    S.play = g.fresh(puzzle);
    S.ui = {};
    const saved = opts.round ? tonight().slot : store.saved[id];
    if (saved && saved.game === id && saved.level === level && saved.seed === seed && !opts.fresh) {
      if (saved.sig === S.sig && saved.play) {
        S.play = saved.play;
        S.undo = Array.isArray(saved.undo) ? saved.undo : [];
        S.elapsed = saved.elapsed || 0;
        if (S.undo.length || S.elapsed) startClock();
      } else {
        if (opts.round) tonight().slot = null;
        else delete store.saved[id];
        persist();
        S.note = COPY.updated;
      }
    }
    if (g.solved(S.puzzle, S.play)) S.play = g.fresh(puzzle);
    S.ctx = makeCtx();
    S.ctx.ui = S.ui;
    const note = document.getElementById('level-note');
    if (note) note.textContent = levelNote();
    const rule = document.querySelector('.play .rule');
    if (rule && typeof g.copy.rule === 'function') rule.innerHTML = g.copy.rule(puzzle);
    mountGame();
  }
  function route() {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) { if (S.view !== 'home') goHome(false); else render(); return; }
    const parts = raw.split('/');
    const id = parts[0];
    if (!UI.games[id] || !parts[2]) { history.replaceState(null, '', location.pathname + location.search); goHome(false); return; }
    const level = parts[1];
    const seed = decodeURIComponent(parts.slice(2).join('/'));
    if (S.view === 'game' && S.game === id && S.level === level && S.seed === seed) return;
    const t = tonight();
    const round = seed === dailySeed(id, level) && ORDER[t.index] === id;
    openGame(id, level, seed, { round: round });
  }

  /* ---------- Global keys ---------- */
  document.addEventListener('keydown', function (e) {
    if (S.view !== 'game' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape') { goHome(true); return; }
    if (!S.puzzle || S.solved) return;
    if (game().key && game().key(S.ctx, e)) { e.preventDefault(); return; }
    if (e.key === 'u' || e.key === 'U') undo();
    else if (e.key === 'h' || e.key === 'H') hint();
  });

  window.addEventListener('pagehide', function () { if (S.view === 'game') { S.elapsed = now(); S.t0 = performance.now(); saveSlot(); } });
  document.addEventListener('visibilitychange', function () {
    if (S.view !== 'game') return;
    if (document.visibilityState === 'hidden') { pauseClock(); saveSlot(); }
    else if (S.puzzle && !S.solved && (S.undo.length || S.elapsed)) startClock();
  });
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);

  UI.shell = { COPY: COPY, ORDER: ORDER, store: function () { return store; }, state: S };

  function boot() {
    if (boot.done) return;
    boot.done = true;
    if (!app()) document.body.appendChild(h('div', { id: 'app' }));
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
