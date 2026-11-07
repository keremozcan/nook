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
    share: 'Copy link',
    copied: 'Link copied.',
    copyFailed: 'Couldn’t copy. Copy the link from the address bar instead.',
    undo: 'Undo',
    hint: 'Hint',
    check: 'Check errors',
    newPuzzle: 'New puzzle',
    difficulty: 'Difficulty',
    howToPlay: 'How to play',
    loading: 'Shuffling the pieces…',
    failed: 'This puzzle didn’t load.',
    tryAgain: 'Try a new one',
    updated: 'Nook has changed since you last played, so this puzzle starts again.',
    solved: 'Solved',
    solvedIn: function (t) { return 'Solved in ' + t + '.'; },
    newBest: 'New best time!',
    helped: 'Hints don’t count towards your best time.',
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

  /* ---------- Storage: one saved puzzle per game, best times, preferences, Tonight. ----------
     Every tab shares one localStorage blob, so a write never replaces it whole: persist() re-reads
     the blob and puts back only the keys this tab changed since it last synced (see mergeStores),
     and a `storage` event from another tab is merged the same way. */
  const KEY = 'nook.v2';
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function blank() { return { best: {}, level: {}, check: true, saved: {}, tonight: null }; }
  function plain(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  /* A Tonight run is one thing: { date, done: [{ game, ms }], current: { game, seed, slot } | null }.
     Which game is next is derived from `done`; `current` is the game in hand (and its saved puzzle). */
  function normalizeRun(t) {
    if (!plain(t) || typeof t.date !== 'string') return null;
    const done = [];
    // Older saves kept { date, index, times, slot }.
    (Array.isArray(t.done) ? t.done : Array.isArray(t.times) ? t.times : []).forEach(function (x) {
      if (plain(x) && ORDER.indexOf(x.game) >= 0 && !done.some(function (d) { return d.game === x.game; })) done.push({ game: x.game, ms: Number(x.ms) || 0 });
    });
    let current = null;
    if (plain(t.current) && ORDER.indexOf(t.current.game) >= 0 && typeof t.current.seed === 'string') {
      current = { game: t.current.game, seed: t.current.seed, slot: plain(t.current.slot) ? t.current.slot : null };
    } else if (plain(t.slot) && ORDER.indexOf(t.slot.game) >= 0 && typeof t.slot.seed === 'string') current = { game: t.slot.game, seed: t.slot.seed, slot: t.slot };
    if (current && done.some(function (d) { return d.game === current.game; })) current = null;
    return { date: t.date, done: done, current: current };
  }
  function normalize(data) {
    const out = blank();
    if (plain(data)) Object.assign(out, data);
    ['best', 'level', 'saved'].forEach(function (k) { if (!plain(out[k])) out[k] = {}; });
    out.tonight = normalizeRun(out.tonight);
    return out;
  }
  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (err) { data = null; }
    if (plain(data)) return normalize(data);
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
    return normalize(data);
  }
  function readDisk() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return plain(data) ? normalize(data) : null;
    } catch (err) { return null; }
  }
  /* Two copies of the same night: same date, union of finished games; the game in hand is this
     tab's if it changed it since `base`, else the other tab's. A later night replaces an earlier one. */
  function mergeRun(theirs, mine, base) {
    if (!theirs) return mine;
    if (!mine) return theirs;
    if (theirs.date !== mine.date) return theirs.date > mine.date ? theirs : mine;
    const out = { date: mine.date, done: theirs.done.slice(), current: null };
    mine.done.forEach(function (x) { if (!out.done.some(function (d) { return d.game === x.game; })) out.done.push(x); });
    const moved = !same(base && base.date === mine.date ? base.current : null, mine.current);
    out.current = moved ? mine.current : theirs.current;
    if (out.current && out.done.some(function (d) { return d.game === out.current.game; })) out.current = null;
    return out;
  }
  /* What is on disk (`disk`), plus whatever this tab changed since it last synced (`base` → `mine`),
     key by key: a best time, a level choice, one game's saved puzzle, the check switch, the run. */
  function mergeStores(disk, base, mine) {
    const out = normalize(disk);
    ['best', 'level', 'saved'].forEach(function (sec) {
      Object.keys(mine[sec]).concat(Object.keys(base[sec])).forEach(function (k) {
        if (same(mine[sec][k], base[sec][k])) return;
        if (k in mine[sec]) out[sec][k] = clone(mine[sec][k]);
        else delete out[sec][k];
      });
    });
    if (mine.check !== base.check) out.check = mine.check;
    if (!same(mine.tonight, base.tonight)) out.tonight = mergeRun(out.tonight, mine.tonight, base.tonight);
    return out;
  }
  let store = load();
  let base = clone(store);
  function persist() {
    const disk = readDisk();
    const merged = disk ? mergeStores(disk, base, store) : store;
    try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch (err) { return; /* Play still works without storage. */ }
    store = merged;
    base = clone(merged);
  }
  /* Another tab wrote: take its changes, keep ours. */
  function sync() {
    const disk = readDisk();
    if (!disk) return;
    const before = JSON.stringify(store);
    store = mergeStores(disk, base, store);
    base = clone(disk);
    if (JSON.stringify(store) === before) return;
    if (S.view === 'home' || S.view === 'summary') render();
    else paint();
  }
  /* The Tonight run for a date (today by default). A run that started before midnight keeps its
     own date, so finishing it after midnight still records against that night. */
  function tonight(date) {
    date = date || today();
    const t = store.tonight;
    if (t && t.date === date) return t;
    // A later night already began (another tab): don't overwrite it with an older run.
    if (t && t.date > date) return { date: date, done: [], current: null, stale: true };
    store.tonight = { date: date, done: [], current: null };
    return store.tonight;
  }
  function run() { return tonight(S.roundDate); }
  /* The next game of a run: the first of the nine not yet done. */
  function nextGame(t) {
    if (t.stale) return null;
    for (let i = 0; i < ORDER.length; i++) if (!t.done.some(function (d) { return d.game === ORDER[i]; })) return ORDER[i];
    return null;
  }
  /* The run's puzzle for a game: the stand-in it is holding (if one was dealt), else that night's. */
  function roundSeed(t, id) {
    return t.current && t.current.game === id ? t.current.seed : dailySeed(id, tonightLevel(id), t.date);
  }
  function roundSlot(t, id, seed) {
    return t.current && t.current.game === id && t.current.seed === seed ? t.current.slot : null;
  }
  function setRoundSlot(t, game, seed, slot) {
    if (slot) t.current = { game: game, seed: seed, slot: slot };
    else if (t.current && t.current.game === game && t.current.seed === seed) {
      // Nothing left to resume, and not a stand-in: back to "not started" for this game.
      t.current = seed === dailySeed(game, tonightLevel(game), t.date) ? null : { game: game, seed: seed, slot: null };
    }
  }
  function tonightLevel(game) { return game === 'sudoku' ? 'mini' : 'easy'; }
  function dailySeed(game, level, date) { return 'daily-' + (date || today()) + '-' + game + '-' + level; }

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
    phase: 'home', game: null, level: null, seed: null, round: false, roundDate: null,
    puzzle: null, play: null, ui: null, undo: [], group: null, pending: null,
    elapsed: 0, running: false, t0: 0, helped: false, sig: null, note: '', token: 0,
    result: null, toast: '', ctx: null
  };
  /* The session lifecycle is one value, S.phase; view, solved and failed are read from it, so they
     can't disagree (no "home and solved"). Every change goes through transition(event). */
  const PHASES = {
    home: { open: 'loading', summary: 'summary' },
    summary: { open: 'loading', home: 'home' },
    loading: { open: 'loading', dealt: 'playing', fail: 'failed', home: 'home', summary: 'summary' },
    failed: { open: 'loading', home: 'home', summary: 'summary' },
    playing: { open: 'loading', win: 'solved', home: 'home', summary: 'summary' },
    solved: { open: 'loading', home: 'home', summary: 'summary' }
  };
  Object.defineProperties(S, {
    view: { enumerable: true, get: function () { return S.phase === 'home' || S.phase === 'summary' ? S.phase : 'game'; } },
    solved: { enumerable: true, get: function () { return S.phase === 'solved'; } },
    failed: { enumerable: true, get: function () { return S.phase === 'failed'; } }
  });
  function transition(event) {
    const to = PHASES[S.phase][event];
    if (!to) return false;
    S.phase = to;
    if (to === 'home' || to === 'summary') {
      // Nothing of a game survives on these screens.
      Object.assign(S, { puzzle: null, play: null, ctx: null, pending: null, result: null, note: '' });
      if (to === 'home') S.round = false;
    }
    return true;
  }
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
    if (S.phase !== 'playing' || !S.puzzle) return;
    if (!S.undo.length && !S.elapsed && !S.running) return;
    // Hidden in the middle of a drag: keep the board as it was before the drag began.
    const play = S.pending != null ? JSON.parse(S.pending) : S.play;
    const slot = { game: S.game, level: S.level, seed: S.seed, sig: S.sig, play: play, undo: S.undo.slice(-60), elapsed: Math.round(now()), helped: S.helped };
    if (S.round) setRoundSlot(run(), S.game, S.seed, slot);
    else store.saved[S.game] = slot;
    persist();
  }
  function dropSlot() {
    if (S.round) setRoundSlot(run(), S.game, S.seed, null);
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
    if (S.phase !== 'playing') return;
    pauseClock();
    transition('win');
    const ms = Math.max(1000, Math.round(S.elapsed));
    S.elapsed = ms;
    const key = S.game + '/' + S.level;
    const prev = store.best[key];
    const secs = Math.floor(ms / 1000);
    const newBest = !S.helped && (prev == null || secs < prev);
    if (newBest) store.best[key] = secs;
    S.result = { ms: ms, best: newBest ? secs : prev, newBest: newBest && prev != null, helped: S.helped };
    if (S.round) {
      // A game counts once per night, even if another tab finished it too.
      const t = run();
      if (!t.done.some(function (d) { return d.game === S.game; })) t.done.push({ game: S.game, ms: ms });
      t.current = null;
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
    if (!nextGame(t)) {
      tonightSub = COPY.tonightDone + ' · ' + fmt(t.done.reduce(function (a, x) { return a + x.ms; }, 0));
      go = COPY.tonightSee;
    } else if (t.done.length > 0 || t.current) {
      tonightSub = COPY.tonightProgress(t.done.length);
      go = COPY.tonightGoOn;
    }
    const main = h('main', { class: 'home' },
      h('header', { class: 'mast' },
        h('p', { class: 'eyebrow', text: COPY.eyebrow }),
        h('h1', { text: 'Nook' }),
        h('p', { class: 'lede', text: COPY.lede })),
      h('button', { type: 'button', class: 'tonight', 'data-act': 'tonight', onclick: function () { startTonight(); } },
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
    const t = tonight(S.roundDate);
    const list = h('ol', { class: 'times' });
    let total = 0;
    t.done.forEach(function (item) {
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
      stage.appendChild(S.phase === 'failed'
        ? h('div', { class: 'placeholder failed' }, h('p', { text: COPY.failed }), h('button', { type: 'button', class: 'primary', 'data-act': 'again', onclick: newPuzzle }, COPY.tryAgain))
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
      const t = S.round ? run() : null;
      const label = S.round ? (!nextGame(t) ? COPY.tonightTimes : COPY.nextGame) : COPY.nextPuzzle;
      const extra = g.wonLine ? g.wonLine(S.ctx) : '';
      const primary = h('button', { type: 'button', class: 'primary', 'data-act': 'next', onclick: next }, label);
      done.appendChild(h('div', { class: 'done-head' },
        h('h2', { text: COPY.solved }),
        h('p', { class: 'done-time' }, h('strong', { text: fmt(r.ms) }), h('span', { text: r.helped ? COPY.helped : r.newBest ? COPY.newBest : r.best != null ? COPY.bestWas(fmt(r.best * 1000)) : '' }))));
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
    if (S.solved || !S.undo.length || S.pending != null) return; // not in the middle of a drag
    S.play = JSON.parse(S.undo.pop());
    S.group = null;
    S.note = '';
    if (game().afterUndo) game().afterUndo(S.ctx);
    saveSlot();
    paint();
  }
  function hint() {
    if (S.solved || !S.puzzle || S.pending != null) return;
    S.group = null;
    S.helped = true;
    const opts = { note: COPY.oneStep };
    const changedAny = S.ctx.act(function (play) {
      game().hint(S.puzzle, play, S.ctx);
      if (game().hintNote) opts.note = game().hintNote(S.puzzle, play);
    }, opts);
    if (!changedAny) paint();
  }
  function toggleCheck() {
    store.check = !store.check;
    persist();
    paint();
  }
  function newPuzzle() {
    pauseClock();
    S.puzzle = null;
    if (!S.round && S.game) delete store.saved[S.game];
    persist();
    // Inside Tonight (only offered when its puzzle failed to load): deal a stand-in puzzle for
    // the same game and stay in the run. The run remembers it, so a reload deals the same one.
    if (S.round) {
      const seed = S.seed + '-b';
      run().current = { game: S.game, seed: seed, slot: null };
      persist();
      openGame(S.game, S.level, seed, { fresh: true, round: true, date: S.roundDate });
    }
    else openGame(S.game, S.level, freshSeed(), { fresh: true });
  }
  function next() {
    if (S.round) { startTonight(S.roundDate); return; }
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
    transition('home');
    if (push && location.hash) history.pushState(null, '', location.pathname + location.search);
    render();
    window.scrollTo(0, 0);
  }
  function startTonight(date) {
    const t = tonight(date);
    S.roundDate = t.date;
    const id = nextGame(t);
    if (!id) {
      leave();
      transition('summary');
      render();
      return;
    }
    openGame(id, tonightLevel(id), roundSeed(t, id), { push: S.view === 'home', round: true, date: t.date });
  }
  /* Open a game. With no seed, resume that game's saved puzzle at this level, else deal a new one. */
  function openGame(id, level, seed, opts) {
    opts = opts || {};
    leave();
    const g = game(id);
    const allowed = levels(id);
    if (!level) level = (!opts.round && store.saved[id] && store.saved[id].level) || store.level[id];
    if (allowed.indexOf(level) < 0) level = allowed.indexOf('easy') >= 0 ? 'easy' : allowed[0];
    const roundDate = opts.round ? (opts.date || today()) : null;
    const saved = opts.round ? null : store.saved[id];
    if (!seed) seed = opts.round ? roundSeed(tonight(roundDate), id) : saved && saved.game === id && saved.level === level ? saved.seed : freshSeed();
    if (!opts.round) { store.level[id] = level; persist(); }
    transition('open');
    Object.assign(S, {
      game: id, level: level, seed: seed, round: !!opts.round, roundDate: roundDate,
      puzzle: null, play: null, ui: {}, undo: [], group: null, pending: null,
      elapsed: 0, running: false, helped: false, note: '', result: null
    });
    // A Tonight puzzle is addressed by its night and game, not by its seed.
    const url = opts.round ? '#tonight/' + roundDate + '/' + id : '#' + [id, level, encodeURIComponent(seed)].join('/');
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
      if (transition('fail')) render();
      return;
    }
    if (!transition('dealt')) return;
    S.puzzle = puzzle;
    S.sig = sig(puzzle);
    S.play = g.fresh(puzzle);
    S.ui = {};
    const saved = opts.round ? roundSlot(run(), id, seed) : store.saved[id];
    if (saved && saved.game === id && saved.level === level && saved.seed === seed && !opts.fresh) {
      if (saved.sig === S.sig && saved.play) {
        S.play = saved.play;
        S.undo = Array.isArray(saved.undo) ? saved.undo : [];
        S.elapsed = saved.elapsed || 0;
        S.helped = !!saved.helped;
        if (S.undo.length || S.elapsed) startClock();
      } else {
        if (opts.round) setRoundSlot(run(), id, seed, null);
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
  /* The hash is #game/level/seed for free play and #tonight/date/game for a Tonight puzzle. An
     older Tonight link (#game/level/daily-date-game-level) is read as the second form. */
  function route() {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) { if (S.view !== 'home') goHome(false); else render(); return; }
    const parts = raw.split('/');
    let id = parts[0];
    let level = parts[1];
    let seed = null;
    let date = null;
    if (id === 'tonight') {
      date = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] || '') ? parts[1] : null;
      id = parts[2];
      level = tonightLevel(id);
    } else if (parts[2]) {
      seed = decodeURIComponent(parts.slice(2).join('/'));
      const m = /^daily-(\d{4}-\d{2}-\d{2})-([a-z]+)-([a-z]+)$/.exec(seed);
      if (m && m[2] === id && m[3] === level && level === tonightLevel(id)) date = m[1];
    }
    if (!UI.games[id] || (!seed && !date)) { history.replaceState(null, '', location.pathname + location.search); goHome(false); return; }
    // It is a Tonight round only if that night's run is today's, or already stored, and this game is next in it.
    let round = false;
    if (date) {
      const t = date === today() || (store.tonight && store.tonight.date === date) ? tonight(date) : null;
      round = !!t && nextGame(t) === id;
      seed = round ? roundSeed(t, id) : dailySeed(id, level, date);
    }
    if (S.view === 'game' && S.game === id && S.level === level && S.seed === seed && S.round === round && (!round || S.roundDate === date)) return;
    openGame(id, level, seed, round ? { round: true, date: date } : {});
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
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) sync(); });
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);

  UI.shell = { COPY: COPY, ORDER: ORDER, store: function () { return store; }, state: S, transition: transition, mergeStores: mergeStores, normalize: normalize };

  function boot() {
    if (boot.done) return;
    boot.done = true;
    if (!app()) document.body.appendChild(h('div', { id: 'app' }));
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
