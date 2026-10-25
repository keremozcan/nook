(function () {
  const ORDER = ['zip', 'sudoku', 'murdoku', 'queens', 'tango', 'patches', 'pinpoint', 'crossclimb', 'wend'];
  const WORDS = ['amber', 'lantern', 'quiet', 'cedar', 'linen', 'copper', 'harbor', 'meadow', 'velvet', 'paper', 'orchard', 'willow', 'candle', 'marble', 'thistle', 'river', 'saffron', 'pewter', 'garden', 'ivory', 'cinder', 'maple', 'birch', 'honey', 'flint', 'pearl', 'olive', 'hearth', 'clover', 'spruce', 'cobalt', 'sorrel', 'yarrow', 'pebble', 'autumn', 'silver', 'brass', 'nectar', 'fable', 'linenwood'];
  const GLASS = ['#e6d3b4', '#8eae9c', '#e0b08a', '#9aafc4', '#e3b7b0', '#c9c296', '#6f8f86', '#d7aeb8', '#b7c49a', '#a9c4c6'];
  const WEAVES = ['#d9edf0', '#f8e6bc', '#e6def2', '#dbe8cc', '#f4d5d0', '#dde5f6', '#d0e8df', '#f1dcbb'];
  const RULES = {
    zip: 'One line, through every square. Visit the numbers in order and finish at the last number. The heavy borders are walls. Drag to draw; moving back one square erases that step. With a keyboard, use arrows to move and Space to extend the line.',
    queens: 'One queen in each row, each column, and each colour. Two queens may not touch, even on a corner. Tap to cycle through a crown, a dot, and an empty square.',
    tango: 'Each row and column is split evenly between suns and moons. Never three of the same in a line. An equals sign means the neighbours match. A cross means they differ. Shaded symbols are fixed clues. Tap an empty square to cycle through sun, moon and empty.',
    sudoku: 'Each row, column, and box contains every digit once.',
    patches: 'Cover the board with rectangles, without overlaps or gaps. Each rectangle contains exactly one clue. Its number is the area in squares; its symbol means square, wider than tall, or taller than wide. A diamond allows any proportion. Drag between opposite corners; tap a placed patch to remove it. With a keyboard, use arrows and Space to choose its two corners.',
    murdoku: 'Everyone has their own row and their own column. The slips tell you where they stood.',
    pinpoint: 'Five clues share a connection: a familiar category, a word that fits with each clue, or a letter pattern. Enter the connection and choose Guess. A wrong guess reveals the next clue; Next clue reveals one without a guess. When all five are shown, Hint reveals the answer. Common synonyms are accepted.',
    crossclimb: 'Fill the rungs, then arrange them so each neighbouring word changes exactly one letter. The top and bottom then share one clue, and together they name one thing.',
    wend: 'Drag through letters sharing an edge to spell the hidden words. The lengths below show what to look for. Every open letter is used once. Walls cannot be crossed. A real word on the wrong path does not count. With a keyboard, use arrows and Space to select letters; a complete hidden word locks into place.'
  };
  const INTRO = {
    zip: 'Start at 1. Draw one continuous line through every square, visiting the numbers in order.',
    queens: 'Place one crown in every row, column and coloured region. Crowns cannot touch.',
    tango: 'Fill each row and column with equal suns and moons. No three alike in a row.',
    sudoku: 'Fill each row, column and outlined box with every digit once. Select a cell, then a number.',
    patches: 'Drag a rectangle around each clue. Its number is the area; its shape is the proportion.',
    murdoku: 'Select a person, then place them using the clues. Each person needs a separate row and column.',
    pinpoint: 'Find the connection between five clues. Guess whenever you like, or reveal the next clue.',
    crossclimb: 'Solve the clues, then use the arrows to arrange a ladder: change one letter at every step.',
    wend: 'Drag along letters sharing an edge to find words of the lengths shown below. Use every letter once.'
  };
  const FALLBACK = {
    zip: ['Zip', 'One path through every cell.'],
    sudoku: ['Sudoku', 'The classic, and the little one.'],
    murdoku: ['Murdoku', 'A quiet house. One person stayed behind.'],
    queens: ['Queens', 'One crown in every row, column, and colour.'],
    tango: ['Tango', 'Suns and moons, in balance.'],
    patches: ['Patches', 'Cover the cloth with rectangles.'],
    pinpoint: ['Pinpoint', 'Name what the words share.'],
    crossclimb: ['Crossclimb', 'Climb a ladder of words.'],
    wend: ['Wend', 'Weave a word through every letter.']
  };

  const state = {
    view: 'table',
    game: null,
    difficulty: 'easy',
    seed: '',
    puzzle: null,
    play: null,
    undo: [],
    elapsed: 0,
    timing: false,
    started: 0,
    solved: false,
    status: '',
    round: null,
    summary: null,
    toast: '',
    tick: 0,
    drag: null,
    walls: null
  };

  function engines() { return window.NOOK_ENGINES || {}; }
  function meta(id) {
    const engine = engines()[id];
    if (!engine) return { name: FALLBACK[id][0], tagline: FALLBACK[id][1], difficulties: [{ id: 'easy', label: 'Easy' }] };
    return engine;
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function fmt(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function prefs() {
    try { return JSON.parse(localStorage.getItem('nook.v1')) || {}; }
    catch (err) { return {}; }
  }
  function save(partial) {
    const next = Object.assign({ mistakes: true, best: {}, difficulty: {} }, prefs(), partial);
    try { localStorage.setItem('nook.v1', JSON.stringify(next)); } catch (err) { /* Play still works without storage. */ }
    return next;
  }
  function mistakesOn() {
    const stored = prefs().mistakes;
    return stored !== false;
  }
  function freshSeed() {
    const a = WORDS[Math.floor(Math.random() * WORDS.length)];
    let b = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (a === b) b = WORDS[(WORDS.indexOf(a) + 7) % WORDS.length];
    return a + '-' + b + '-' + (Math.floor(Math.random() * 9) + 1);
  }
  function anotherSeed() {
    let seed = freshSeed();
    if (!state.puzzle || !['pinpoint', 'crossclimb'].includes(state.game)) return seed;
    for (let i = 0; i < 20; i++) {
      const p = engines()[state.game].generate(state.difficulty, seed);
      if (state.game === 'pinpoint' ? p.category !== state.puzzle.category : p.top !== state.puzzle.top || p.bottom !== state.puzzle.bottom) return seed;
      seed = freshSeed();
    }
    return seed;
  }
  function dailySeed(game, difficulty) {
    const d = new Date();
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return 'daily-' + iso + '-' + game + '-' + difficulty;
  }
  function emptyMatrix(n, fill) {
    return Array.from({ length: n }, function () { return Array(n).fill(fill); });
  }
  function freshPlay(puzzle) {
    if (puzzle.game === 'zip') return { path: [] };
    if (puzzle.game === 'queens') return { marks: emptyMatrix(puzzle.n, null) };
    if (puzzle.game === 'tango') return { marks: emptyMatrix(puzzle.n, null) };
    if (puzzle.game === 'sudoku') return { values: emptyMatrix(puzzle.size, 0), notes: emptyMatrix(puzzle.size, 0), sel: null, armed: null, pencil: false };
    if (puzzle.game === 'patches') return { cells: emptyMatrix(puzzle.rows, -1) };
    if (puzzle.game === 'pinpoint') return { shown: 1, text: '', note: '' };
    if (puzzle.game === 'crossclimb') return { typed: puzzle.rungs.map(function () { return ''; }), order: puzzle.rungs.map(function (_, i) { return i; }), top: '', bottom: '' };
    if (puzzle.game === 'wend') return { found: [], trace: [] };
    const first = puzzle.people[1] || puzzle.people[0];
    return { pos: {}, selected: first.id };
  }
  function pushUndo() {
    state.undo.push(JSON.stringify(state.play));
    if (state.undo.length > 200) state.undo.shift();
  }
  function startClock() {
    if (state.solved) return;
    if (!state.timing) {
      state.timing = true;
      state.started = performance.now() - state.elapsed;
    }
    if (!state.tick) {
      state.tick = setInterval(function () {
        if (!state.timing) return;
        state.elapsed = performance.now() - state.started;
        const clock = document.getElementById('clock-num');
        if (clock) clock.textContent = fmt(state.elapsed);
      }, 250);
    }
  }
  function bestLine() {
    const best = (prefs().best || {})[state.game + '/' + state.difficulty];
    return best == null ? '' : 'best ' + fmt(best * 1000);
  }
  function pauseClock() {
    if (state.timing) state.elapsed = performance.now() - state.started;
    state.timing = false;
    clearInterval(state.tick);
    state.tick = 0;
  }
  function markSolved() {
    if (state.solved) return;
    pauseClock();
    state.solved = true;
    state.timing = false;
    const key = state.game + '/' + state.difficulty;
    const secs = Math.max(1, Math.round(state.elapsed / 1000));
    const data = prefs();
    data.best = data.best || {};
    if (data.best[key] == null || secs < data.best[key]) data.best[key] = secs;
    if (data.resume && data.resume.game === state.game && data.resume.seed === state.seed && data.resume.difficulty === state.difficulty) data.resume = null;
    save(data);
  }

  function zipWalls(puzzle) {
    const set = new Set();
    (puzzle.walls || []).forEach(function (wall) { set.add(wall[0] + ',' + wall[1] + ',' + wall[2]); });
    return set;
  }
  function zipBlocked(r, c, rr, cc) {
    const walls = state.walls;
    if (rr === r && cc === c + 1) return walls.has(r + ',' + c + ',E');
    if (rr === r && cc === c - 1) return walls.has(r + ',' + (c - 1) + ',E');
    if (rr === r + 1 && cc === c) return walls.has(r + ',' + c + ',S');
    if (rr === r - 1 && cc === c) return walls.has((r - 1) + ',' + c + ',S');
    return true;
  }
  function zipNeed(path) {
    let need = 1;
    path.forEach(function (cell) {
      const n = state.puzzle.numbers[cell[0]][cell[1]];
      if (n) need = n + 1;
    });
    return need;
  }
  function zipTouch(r, c) {
    const path = state.play.path;
    const numbers = state.puzzle.numbers;
    const at = path.findIndex(function (cell) { return cell[0] === r && cell[1] === c; });
    if (!path.length) {
      if (numbers[r][c] === 1) {
        path.push([r, c]);
        return 'extend';
      }
      return 'no';
    }
    if (at === path.length - 1) return 'stay';
    if (at >= 0 && at === path.length - 2) {
      path.pop();
      return 'back';
    }
    if (at >= 0) return 'no';
    const last = path[path.length - 1];
    if (Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) return 'no';
    if (zipBlocked(last[0], last[1], r, c)) return 'no';
    const num = numbers[r][c];
    if (num && num !== zipNeed(path)) return 'no';
    const max = Math.max.apply(null, numbers.flat());
    if (num === max && path.length !== state.puzzle.rows * state.puzzle.cols - 1) return 'no';
    path.push([r, c]);
    return 'extend';
  }
  function zipSolved() {
    const path = state.play.path;
    if (path.length !== state.puzzle.rows * state.puzzle.cols) return false;
    const last = path[path.length - 1];
    return state.puzzle.numbers[last[0]][last[1]] === Math.max.apply(null, state.puzzle.numbers.flat());
  }

  function queenList() {
    const marks = state.play.marks;
    const out = [];
    for (let r = 0; r < marks.length; r++) {
      for (let c = 0; c < marks.length; c++) if (marks[r][c] === 'queen') out.push([r, c]);
    }
    return out;
  }
  function queenBad() {
    const bad = emptyMatrix(state.puzzle.n, false);
    const qs = queenList();
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        const a = qs[i];
        const b = qs[j];
        const region = state.puzzle.regions[a[0]][a[1]] === state.puzzle.regions[b[0]][b[1]];
        const diag = Math.abs(a[0] - b[0]) === 1 && Math.abs(a[1] - b[1]) === 1;
        if (a[0] === b[0] || a[1] === b[1] || region || diag) bad[a[0]][a[1]] = bad[b[0]][b[1]] = true;
      }
    }
    return bad;
  }
  function queensSolved() {
    if (queenList().length !== state.puzzle.n) return false;
    const bad = queenBad();
    return !bad.some(function (row) { return row.some(Boolean); });
  }

  function tangoAt(r, c) {
    const given = state.puzzle.givens[r][c];
    return given || state.play.marks[r][c];
  }
  function tangoBad() {
    const n = state.puzzle.n;
    const bad = emptyMatrix(n, false);
    const half = n / 2;
    function symbol(r, c) { return tangoAt(r, c); }
    for (let r = 0; r < n; r++) {
      let run = 1;
      let suns = 0;
      let moons = 0;
      let filled = 0;
      for (let c = 0; c < n; c++) {
        const now = symbol(r, c);
        const prev = c ? symbol(r, c - 1) : null;
        if (now && now === prev) run++;
        else run = 1;
        if (run >= 3 && now) bad[r][c] = bad[r][c - 1] = bad[r][c - 2] = true;
        if (now === 'sun') suns++;
        if (now === 'moon') moons++;
        if (now) filled++;
        const down = r ? symbol(r - 1, c) : null;
        const up2 = r > 1 ? symbol(r - 2, c) : null;
        if (now && now === down && now === up2) bad[r][c] = bad[r - 1][c] = bad[r - 2][c] = true;
        if (c < n - 1 && state.puzzle.h[r][c] && now && symbol(r, c + 1)) {
          const same = now === symbol(r, c + 1);
          if ((state.puzzle.h[r][c] === 'eq') !== same) bad[r][c] = bad[r][c + 1] = true;
        }
        if (r < n - 1 && state.puzzle.v[r][c] && now && symbol(r + 1, c)) {
          const same = now === symbol(r + 1, c);
          if ((state.puzzle.v[r][c] === 'eq') !== same) bad[r][c] = bad[r + 1][c] = true;
        }
      }
      if (suns > half) for (let c = 0; c < n; c++) if (symbol(r, c) === 'sun') bad[r][c] = true;
      if (moons > half) for (let c = 0; c < n; c++) if (symbol(r, c) === 'moon') bad[r][c] = true;
      void filled;
    }
    for (let c = 0; c < n; c++) {
      let suns = 0;
      let moons = 0;
      for (let r = 0; r < n; r++) {
        if (symbol(r, c) === 'sun') suns++;
        if (symbol(r, c) === 'moon') moons++;
      }
      if (suns > half) for (let r = 0; r < n; r++) if (symbol(r, c) === 'sun') bad[r][c] = true;
      if (moons > half) for (let r = 0; r < n; r++) if (symbol(r, c) === 'moon') bad[r][c] = true;
    }
    return bad;
  }
  function tangoSolved() {
    const n = state.puzzle.n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!tangoAt(r, c)) return false;
    const bad = tangoBad();
    return !bad.some(function (row) { return row.some(Boolean); });
  }

  function sudokuBox(r, c) {
    const p = state.puzzle;
    return Math.floor(r / p.boxR) * (p.size / p.boxC) + Math.floor(c / p.boxC);
  }
  function sudokuDigit(r, c) {
    return state.puzzle.givens[r][c] || state.play.values[r][c];
  }
  function sudokuBad() {
    const n = state.puzzle.size;
    const bad = emptyMatrix(n, false);
    const rows = Array.from({ length: n }, function () { return new Map(); });
    const cols = Array.from({ length: n }, function () { return new Map(); });
    const boxes = Array.from({ length: n }, function () { return new Map(); });
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const d = sudokuDigit(r, c);
        if (!d) continue;
        const lists = [rows[r], cols[c], boxes[sudokuBox(r, c)]];
        lists.forEach(function (map) {
          if (!map.has(d)) map.set(d, []);
          map.get(d).push([r, c]);
        });
      }
    }
    [rows, cols, boxes].forEach(function (group) {
      group.forEach(function (map) {
        map.forEach(function (cells) {
          if (cells.length < 2) return;
          cells.forEach(function (cell) { bad[cell[0]][cell[1]] = true; });
        });
      });
    });
    return bad;
  }
  function sudokuSolved() {
    const n = state.puzzle.size;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!sudokuDigit(r, c)) return false;
    return !sudokuBad().some(function (row) { return row.some(Boolean); });
  }

  function patchClueAt(r, c) {
    return state.puzzle.clues.findIndex(function (clue) { return clue.r === r && clue.c === c; });
  }
  function patchOk(r0, c0, r1, c1) {
    const clues = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (state.play.cells[r][c] !== -1) return -1;
        const id = patchClueAt(r, c);
        if (id >= 0) clues.push(id);
      }
    }
    if (clues.length !== 1) return -1;
    const clue = state.puzzle.clues[clues[0]];
    const h = r1 - r0 + 1;
    const w = c1 - c0 + 1;
    if (clue.area != null && clue.area !== h * w) return -1;
    if (clue.shape === 'square' && h !== w) return -1;
    if (clue.shape === 'wide' && !(w > h)) return -1;
    if (clue.shape === 'tall' && !(h > w)) return -1;
    return clues[0];
  }
  function patchesSolved() {
    return state.play.cells.every(function (row) { return row.every(function (cell) { return cell >= 0; }); });
  }

  function personAt(r, c) {
    const pos = state.play.pos;
    return state.puzzle.people.find(function (person) {
      const at = pos[person.id];
      return at && at[0] === r && at[1] === c;
    });
  }
  function blockedCell(r, c) {
    return (state.puzzle.objects || []).some(function (obj) { return obj.blocks && obj.r === r && obj.c === c; });
  }
  function murdokuHolds(clue, r, c) {
    const puzzle = state.puzzle;
    let ok = false;
    if (clue.kind === 'room') ok = puzzle.roomOf[r][c] === clue.roomId;
    else if (clue.kind === 'row') ok = r === clue.index;
    else if (clue.kind === 'col') ok = c === clue.index;
    else if (clue.kind === 'object') ok = puzzle.objects.some(function (obj) { return obj.r === r && obj.c === c && obj.kind === clue.object && !obj.blocks; });
    else if (clue.kind === 'beside') {
      const id = puzzle.roomOf[r][c];
      ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (dir) {
        const rr = r + dir[0];
        const cc = c + dir[1];
        if (rr < 0 || cc < 0 || rr >= puzzle.n || cc >= puzzle.n || puzzle.roomOf[rr][cc] !== id) return false;
        return puzzle.objects.some(function (obj) { return obj.r === rr && obj.c === cc && obj.kind === clue.object; });
      });
    } else if (clue.kind === 'corner') {
      const id = puzzle.roomOf[r][c];
      const n = puzzle.n;
      const vertical = r === 0 || puzzle.roomOf[r - 1][c] !== id || r === n - 1 || puzzle.roomOf[r + 1][c] !== id;
      const horizontal = c === 0 || puzzle.roomOf[r][c - 1] !== id || c === n - 1 || puzzle.roomOf[r][c + 1] !== id;
      ok = vertical && horizontal;
    } else return true;
    return clue.negate ? !ok : ok;
  }
  function murdokuBad(person, r, c) {
    return state.puzzle.clues.some(function (clue) {
      return clue.personId === person.id && clue.kind !== 'alone' && !murdokuHolds(clue, r, c);
    });
  }
  function murdokuSolved() {
    return state.puzzle.people.every(function (person) {
      const at = state.play.pos[person.id];
      const want = state.puzzle.solution.positions[person.id];
      return at && at[0] === want[0] && at[1] === want[1];
    });
  }
  function isSolved() {
    if (!state.puzzle || !state.play) return false;
    const game = state.puzzle.game;
    if (game === 'zip') return zipSolved();
    if (game === 'queens') return queensSolved();
    if (game === 'tango') return tangoSolved();
    if (game === 'sudoku') return sudokuSolved();
    if (game === 'patches') return patchesSolved();
    if (game === 'murdoku') return murdokuSolved();
    if (game === 'pinpoint') return pinpointSolved();
    if (game === 'crossclimb') return crossSolved();
    if (game === 'wend') return state.play.found.length === state.puzzle.solution.length;
    return false;
  }
  function statusLine() {
    if (!state.puzzle) return state.status || 'Setting the pieces…';
    if (state.solved) {
      if (state.puzzle.game === 'murdoku') {
        const killer = state.puzzle.people.find(function (person) { return person.id === state.puzzle.solution.killerId; });
        const victim = state.puzzle.people.find(function (person) { return person.role === 'victim'; });
        const cell = state.puzzle.solution.positions[victim.id];
        const room = state.puzzle.rooms.find(function (item) { return item.id === state.puzzle.roomOf[cell[0]][cell[1]]; });
        return 'It was ' + killer.name + '. They were in the ' + room.name + ' with ' + victim.name + '.';
      }
      return 'Solved · ' + fmt(state.elapsed);
    }
    const game = state.puzzle.game;
    if (game === 'zip') {
      if (!state.play.path.length) return 'Start at 1.';
      const need = zipNeed(state.play.path);
      let max = 1;
      state.puzzle.numbers.forEach(function (row) {
        row.forEach(function (n) { if (n > max) max = n; });
      });
      return need > max ? 'Fill every remaining square.' : 'Next is ' + need + '.';
    }
    if (game === 'queens') return queenList().length + ' of ' + state.puzzle.n + ' crowns.';
    if (game === 'tango') {
      let left = 0;
      for (let r = 0; r < state.puzzle.n; r++) for (let c = 0; c < state.puzzle.n; c++) if (!tangoAt(r, c)) left++;
      return left ? left + ' still open.' : 'Check the balance.';
    }
    if (game === 'sudoku') {
      let left = 0;
      for (let r = 0; r < state.puzzle.size; r++) for (let c = 0; c < state.puzzle.size; c++) if (!sudokuDigit(r, c)) left++;
      return left + ' empty.';
    }
    if (game === 'patches') {
      let left = 0;
      state.play.cells.forEach(function (row) { row.forEach(function (cell) { if (cell < 0) left++; }); });
      return left + ' squares of cloth left.';
    }
    if (game === 'pinpoint') {
      if (state.play.note) return state.play.note;
      return state.play.shown + ' of ' + state.puzzle.words.length + ' words. Name the category.';
    }
    if (game === 'crossclimb') {
      if (!crossWordsIn()) return 'Answer each rung.';
      if (!crossChain()) return 'Now change one letter at each step.';
      if (!crossSolved()) return state.puzzle.endClue;
      return 'The ladder is complete.';
    }
    if (game === 'wend') {
      const left = state.puzzle.solution.length - state.play.found.length;
      return left ? left + ' words still hidden.' : 'Every letter is spoken for.';
    }
    const person = state.puzzle.people.find(function (item) { return item.id === state.play.selected; });
    return person ? 'Where was ' + person.name + '?' : 'Place everyone.';
  }
  function pinpointSolved() {
    function normalize(text) { return text.toLowerCase().replace(/[“”"'‘’]/g, '').replace(/[-–—]/g, ' ').trim().replace(/\s+/g, ' '); }
    const text = normalize(state.play.text);
    return state.puzzle.accept.some(function (answer) { return normalize(answer) === text; });
  }
  function letterSteps(a, b) {
    if (!a || !b || a.length !== b.length) return 99;
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  }
  function crossWordsIn() {
    return state.puzzle.rungs.every(function (rung, i) { return state.play.typed[i] === rung.answer; });
  }
  function crossChain() {
    const seq = state.play.order.map(function (i) { return state.play.typed[i]; });
    for (let i = 1; i < seq.length; i++) if (letterSteps(seq[i - 1], seq[i]) !== 1) return false;
    return true;
  }
  function crossEndsOpen() { return crossWordsIn() && crossChain(); }
  function crossSolved() {
    if (!crossEndsOpen()) return false;
    const top = state.play.top;
    const bottom = state.play.bottom;
    const pair = (top === state.puzzle.top && bottom === state.puzzle.bottom) || (top === state.puzzle.bottom && bottom === state.puzzle.top);
    const seq = state.play.order.map(function (i) { return state.play.typed[i]; });
    return pair && letterSteps(top, seq[0]) === 1 && letterSteps(seq[seq.length - 1], bottom) === 1;
  }

  function hint() {
    const puzzle = state.puzzle;
    if (!puzzle || state.solved) return;
    pushUndo();
    startClock();
    if (puzzle.game === 'zip') {
      const sol = puzzle.solution;
      let i = 0;
      const path = state.play.path;
      while (i < path.length && i < sol.length && path[i][0] === sol[i][0] && path[i][1] === sol[i][1]) i++;
      state.play.path = sol.slice(0, Math.min(sol.length, i + 1)).map(function (cell) { return [cell[0], cell[1]]; });
    } else if (puzzle.game === 'queens') {
      for (let r = 0; r < puzzle.n; r++) {
        const spot = puzzle.solution.find(function (cell) { return cell[0] === r; });
        if (state.play.marks[r][spot[1]] === 'queen' && state.play.marks[r].filter(function (mark) { return mark === 'queen'; }).length === 1) continue;
        for (let c = 0; c < puzzle.n; c++) if (state.play.marks[r][c] === 'queen') state.play.marks[r][c] = null;
        state.play.marks[r][spot[1]] = 'queen';
        break;
      }
    } else if (puzzle.game === 'tango') {
      for (let r = 0; r < puzzle.n && !state.solved; r++) {
        for (let c = 0; c < puzzle.n; c++) {
          if (puzzle.givens[r][c] || state.play.marks[r][c] === puzzle.solution[r][c]) continue;
          state.play.marks[r][c] = puzzle.solution[r][c];
          r = puzzle.n;
          break;
        }
      }
    } else if (puzzle.game === 'sudoku') {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.givens[r][c] || state.play.values[r][c] === puzzle.solution[r][c]) continue;
          state.play.values[r][c] = puzzle.solution[r][c];
          state.play.notes[r][c] = 0;
          r = puzzle.size;
          break;
        }
      }
    } else if (puzzle.game === 'patches') {
      for (let id = 0; id < puzzle.clues.length; id++) {
        let r0 = 99, c0 = 99, r1 = -1, c1 = -1, match = true;
        for (let r = 0; r < puzzle.rows; r++) {
          for (let c = 0; c < puzzle.cols; c++) {
            const inside = puzzle.solution[r][c] === id;
            if (inside) {
              r0 = Math.min(r0, r); c0 = Math.min(c0, c); r1 = Math.max(r1, r); c1 = Math.max(c1, c);
            }
            if ((inside && state.play.cells[r][c] !== id) || (!inside && state.play.cells[r][c] === id)) match = false;
          }
        }
        if (match) continue;
        const overlaps = new Set([id]);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) overlaps.add(state.play.cells[r][c]);
        for (let r = 0; r < puzzle.rows; r++) {
          for (let c = 0; c < puzzle.cols; c++) {
            if (overlaps.has(state.play.cells[r][c])) state.play.cells[r][c] = -1;
          }
        }
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) state.play.cells[r][c] = id;
        break;
      }
    } else if (puzzle.game === 'murdoku') {
      for (let i = 0; i < puzzle.people.length; i++) {
        const person = puzzle.people[i];
        const want = puzzle.solution.positions[person.id];
        const have = state.play.pos[person.id];
        if (have && have[0] === want[0] && have[1] === want[1]) continue;
        puzzle.people.forEach(function (other) {
          const at = state.play.pos[other.id];
          if (other.id !== person.id && at && (at[0] === want[0] || at[1] === want[1])) delete state.play.pos[other.id];
        });
        state.play.pos[person.id] = [want[0], want[1]];
        state.play.selected = person.id;
        break;
      }
    } else if (puzzle.game === 'pinpoint') {
      if (state.play.shown < puzzle.words.length) state.play.shown += 1;
      else state.play.text = puzzle.category;
      state.play.note = '';
    } else if (puzzle.game === 'crossclimb') {
      let filled = false;
      for (let i = 0; i < puzzle.rungs.length; i++) {
        if (state.play.typed[i] !== puzzle.rungs[i].answer) {
          state.play.typed[i] = puzzle.rungs[i].answer;
          filled = true;
          break;
        }
      }
      if (!filled && (!crossChain() || letterSteps(puzzle.top, state.play.typed[state.play.order[0]]) !== 1)) {
        state.play.order = puzzle.solution.slice(1, -1).map(function (word) {
          return puzzle.rungs.findIndex(function (rung) { return rung.answer === word; });
        });
      } else if (!filled && state.play.top !== puzzle.top) state.play.top = puzzle.top;
      else if (!filled) state.play.bottom = puzzle.bottom;
    } else if (puzzle.game === 'wend') {
      const next = puzzle.solution.find(function (word) {
        return !state.play.found.some(function (got) { return got.word === word.word; });
      });
      if (next) {
        let prefix = 0;
        const trace = state.play.trace;
        while (prefix < trace.length && prefix < next.cells.length && trace[prefix][0] === next.cells[prefix][0] && trace[prefix][1] === next.cells[prefix][1]) prefix += 1;
        if (prefix >= next.cells.length - 1) {
          state.play.found.push({ word: next.word, cells: next.cells.map(function (cell) { return [cell[0], cell[1]]; }) });
          state.play.trace = [];
        } else state.play.trace = next.cells.slice(0, prefix + 1).map(function (cell) { return [cell[0], cell[1]]; });
      }
    }
    state.status = 'One step.';
    afterMove(false);
  }

  function afterMove(fromDrag) {
    if (isSolved()) markSolved();
    else state.solved = false;
    if (!fromDrag) render();
    else paintBoard();
  }
  function cellFromEvent(event) {
    const board = document.querySelector('.board');
    if (!board || !state.puzzle) return null;
    const rect = board.getBoundingClientRect();
    const n = state.puzzle.rows || state.puzzle.n || state.puzzle.size;
    const c = Math.floor((event.clientX - rect.left) / rect.width * n);
    const r = Math.floor((event.clientY - rect.top) / rect.height * n);
    if (r < 0 || c < 0 || r >= n || c >= n) return null;
    return [r, c];
  }
  function onPointerDown(event) {
    const board = event.target.closest && event.target.closest('.board');
    if (!board || state.solved) return;
    if (state.puzzle.game === 'pinpoint' || state.puzzle.game === 'crossclimb') return;
    event.preventDefault();
    const cell = cellFromEvent(event);
    if (!cell) return;
    state.drag = { r: cell[0], c: cell[1], x: event.clientX, y: event.clientY, moved: false, dirty: false };
    const cellNode = board.querySelector('[data-row="' + cell[0] + '"][data-col="' + cell[1] + '"]');
    if (cellNode) cellNode.focus({ preventScroll: true });
    if (board.setPointerCapture && event.pointerId != null) board.setPointerCapture(event.pointerId);
    if (state.puzzle.game === 'zip' || state.puzzle.game === 'patches' || state.puzzle.game === 'wend') pushUndo();
    if (state.puzzle.game === 'wend') {
      const before = state.play.trace.length;
      wendTouch(cell[0], cell[1]);
      if (state.play.trace.length !== before) {
        state.drag.dirty = true;
        startClock();
        paintLive();
      }
    }
    if (state.puzzle.game === 'zip') {
      const result = zipTouch(cell[0], cell[1]);
      if (result === 'extend' || result === 'back') {
        state.drag.dirty = true;
        state.drag.reject = false;
        startClock();
        paintLive();
      } else if (result === 'no') state.drag.reject = true;
    }
  }
  function onPointerMove(event) {
    if (!state.drag || state.solved) return;
    if (Math.abs(event.clientX - state.drag.x) + Math.abs(event.clientY - state.drag.y) > 8) state.drag.moved = true;
    if (state.drag.moved && (state.puzzle.game === 'zip' || state.puzzle.game === 'wend') && !event.interpolated) {
      const x = state.drag.lastX == null ? state.drag.x : state.drag.lastX;
      const y = state.drag.lastY == null ? state.drag.y : state.drag.lastY;
      const board = document.querySelector('.board');
      const unit = board.getBoundingClientRect().width / state.puzzle.rows;
      const steps = Math.ceil(Math.hypot(event.clientX - x, event.clientY - y) / (unit / 4));
      for (let i = 1; i <= steps; i++) onPointerMove({ clientX: x + (event.clientX - x) * i / steps, clientY: y + (event.clientY - y) * i / steps, interpolated: true });
      state.drag.lastX = event.clientX;
      state.drag.lastY = event.clientY;
      return;
    }
    const cell = cellFromEvent(event);
    if (!cell) return;
    if (state.puzzle.game === 'wend' && state.drag.moved) {
      const before = state.play.trace.length;
      wendTouch(cell[0], cell[1]);
      if (state.play.trace.length !== before) {
        state.drag.dirty = true;
        startClock();
        schedulePaint();
      }
    }
    if (state.puzzle.game === 'zip' && state.drag.moved) {
      const result = zipTouch(cell[0], cell[1]);
      if (result === 'extend' || result === 'back') {
        state.drag.dirty = true;
        state.drag.reject = false;
        startClock();
        schedulePaint();
      } else if (result === 'no') state.drag.reject = true;
    }
    if (state.puzzle.game === 'patches' && state.drag.moved) {
      const r0 = Math.min(state.drag.r, cell[0]);
      const c0 = Math.min(state.drag.c, cell[1]);
      const r1 = Math.max(state.drag.r, cell[0]);
      const c1 = Math.max(state.drag.c, cell[1]);
      const prev = state.drag.preview;
      if (!prev || prev[0] !== r0 || prev[1] !== c0 || prev[2] !== r1 || prev[3] !== c1) {
        state.drag.preview = [r0, c0, r1, c1];
        schedulePaint();
      }
    }
  }
  function onPointerUp(event) {
    const drag = state.drag;
    state.drag = null;
    if (!drag || !state.puzzle) return;
    const cell = cellFromEvent(event) || [drag.r, drag.c];
    if (state.puzzle.game === 'patches') {
      if (drag.moved && drag.preview) {
        const id = patchOk(drag.preview[0], drag.preview[1], drag.preview[2], drag.preview[3]);
        if (id < 0) {
          state.undo.pop();
          render();
          const board = document.querySelector('.board');
          if (board) {
            board.classList.remove('shake');
            void board.offsetWidth;
            board.classList.add('shake');
          }
          return;
        }
        for (let r = drag.preview[0]; r <= drag.preview[2]; r++) {
          for (let c = drag.preview[1]; c <= drag.preview[3]; c++) state.play.cells[r][c] = id;
        }
        startClock();
        afterMove(false);
        return;
      }
      state.undo.pop();
      const occupant = state.play.cells[cell[0]][cell[1]];
      if (occupant >= 0) {
        pushUndo();
        for (let r = 0; r < state.play.cells.length; r++) {
          for (let c = 0; c < state.play.cells[r].length; c++) if (state.play.cells[r][c] === occupant) state.play.cells[r][c] = -1;
        }
        afterMove(false);
      } else {
        const id = patchOk(cell[0], cell[1], cell[0], cell[1]);
        if (id >= 0) {
          pushUndo();
          state.play.cells[cell[0]][cell[1]] = id;
          startClock();
          afterMove(false);
        }
      }
      return;
    }
    if (state.puzzle.game === 'zip') {
      if (!drag.dirty) state.undo.pop();
      afterMove(false);
      if (drag.reject && !drag.dirty) {
        const grid = document.querySelector('.board');
        if (grid) {
          grid.classList.remove('shake');
          void grid.offsetWidth;
          grid.classList.add('shake');
        }
      }
      return;
    }
    if (state.puzzle.game === 'wend') {
      if (!drag.dirty) state.undo.pop();
      const trace = state.play.trace;
      const hit = state.puzzle.solution.find(function (word) {
        return word.cells.length === trace.length && word.cells.every(function (spot, i) { return spot[0] === trace[i][0] && spot[1] === trace[i][1]; });
      });
      if (hit && !state.play.found.some(function (word) { return word.word === hit.word; })) {
        state.play.found.push({ word: hit.word, cells: hit.cells.map(function (spot) { return [spot[0], spot[1]]; }) });
        state.play.trace = [];
        afterMove(false);
        return;
      }
      const spelled = trace.map(function (spot) { return state.puzzle.letters[spot[0]][spot[1]]; }).join('');
      if (drag.dirty) state.undo.pop();
      state.play.trace = [];
      if (spelled.length > 2 && window.NOOK_ENGINES.wend.words.indexOf(spelled) !== -1) state.status = 'That is a word, but not on its path.';
      render();
      const grid = document.querySelector('.board');
      if (grid && spelled) {
        grid.classList.remove('shake');
        void grid.offsetWidth;
        grid.classList.add('shake');
      }
      return;
    }
    tapCell(cell[0], cell[1]);
  }
  function wendTouch(r, c) {
    if (!state.walls || state.walls.has(r + ',' + c)) return;
    if (state.play.found.some(function (word) { return word.cells.some(function (cell) { return cell[0] === r && cell[1] === c; }); })) return;
    const trace = state.play.trace;
    if (!trace.length) {
      trace.push([r, c]);
      return;
    }
    const last = trace[trace.length - 1];
    if (last[0] === r && last[1] === c) return;
    if (trace.length > 1 && trace[trace.length - 2][0] === r && trace[trace.length - 2][1] === c) {
      trace.pop();
      return;
    }
    if (trace.some(function (cell) { return cell[0] === r && cell[1] === c; })) return;
    if (Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) return;
    trace.push([r, c]);
  }
  function onPointerCancel() {
    if (!state.drag) return;
    if (['zip', 'patches', 'wend'].includes(state.game)) {
      const before = state.undo.pop();
      if (before) state.play = JSON.parse(before);
    }
    state.drag = null;
    render();
  }
  function activateCell(r, c) {
    if (!state.puzzle || state.solved) return;
    if (state.game === 'zip') {
      pushUndo();
      if (!['extend', 'back'].includes(zipTouch(r, c))) { state.undo.pop(); return; }
      startClock();
      afterMove(false);
    } else if (state.game === 'wend') {
      pushUndo();
      const before = JSON.stringify(state.play.trace);
      wendTouch(r, c);
      if (before === JSON.stringify(state.play.trace)) { state.undo.pop(); return; }
      const trace = state.play.trace;
      const word = state.puzzle.solution.find(function (word) { return word.cells.length === trace.length && word.cells.every(function (cell, i) { return cell[0] === trace[i][0] && cell[1] === trace[i][1]; }); });
      if (word) { state.play.found.push({ word: word.word, cells: word.cells }); state.play.trace = []; }
      startClock();
      afterMove(false);
    } else if (state.game === 'patches') {
      if (!state.patchAnchor) { state.patchAnchor = [r, c]; render(); return; }
      const anchor = state.patchAnchor;
      state.patchAnchor = null;
      const r0 = Math.min(anchor[0], r), c0 = Math.min(anchor[1], c), r1 = Math.max(anchor[0], r), c1 = Math.max(anchor[1], c);
      const id = patchOk(r0, c0, r1, c1);
      if (id >= 0) {
        pushUndo();
        for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) state.play.cells[rr][cc] = id;
        startClock();
        afterMove(false);
      } else render();
    } else tapCell(r, c);
  }
  function tapCell(r, c) {
    const puzzle = state.puzzle;
    if (puzzle.game === 'queens') {
      pushUndo();
      const order = [null, 'queen', 'dot'];
      const cur = state.play.marks[r][c];
      state.play.marks[r][c] = order[(order.indexOf(cur) + 1) % order.length];
      startClock();
      afterMove(false);
    } else if (puzzle.game === 'tango') {
      if (puzzle.givens[r][c]) return;
      pushUndo();
      const order = [null, 'sun', 'moon'];
      const cur = state.play.marks[r][c];
      state.play.marks[r][c] = order[(order.indexOf(cur) + 1) % order.length];
      startClock();
      afterMove(false);
    } else if (puzzle.game === 'sudoku') {
      if (puzzle.givens[r][c]) {
        state.play.sel = [r, c];
        state.play.armed = puzzle.givens[r][c];
        render();
        return;
      }
      state.play.sel = [r, c];
      afterMove(false);
    } else if (puzzle.game === 'murdoku') {
      const occ = personAt(r, c);
      if (occ) {
        if (state.play.selected === occ.id) {
          pushUndo();
          delete state.play.pos[occ.id];
          startClock();
          afterMove(false);
          return;
        }
        state.play.selected = occ.id;
        render();
        return;
      }
      if (blockedCell(r, c) || !state.play.selected) return;
      const taken = puzzle.people.some(function (person) {
        if (person.id === state.play.selected) return false;
        const at = state.play.pos[person.id];
        return at && (at[0] === r || at[1] === c);
      });
      if (taken) return;
      pushUndo();
      state.play.pos[state.play.selected] = [r, c];
      startClock();
      afterMove(false);
    }
  }
  function onDigit(d) {
    if (!state.play || state.solved) return;
    const play = state.play;
    if (!play.sel) {
      play.armed = play.armed === d ? null : d;
      render();
      return;
    }
    const r = play.sel[0];
    const c = play.sel[1];
    if (state.puzzle.givens[r][c]) {
      play.armed = d;
      render();
      return;
    }
    pushUndo();
    startClock();
    if (play.pencil) play.notes[r][c] ^= (1 << (d - 1));
    else {
      play.values[r][c] = play.values[r][c] === d ? 0 : d;
      play.notes[r][c] = 0;
    }
    play.armed = d;
    afterMove(false);
  }

  function crown() {
    return '<svg class="crown" viewBox="0 0 24 16" aria-hidden="true"><path fill="#f2d48a" stroke="#3a2612" stroke-width="1.2" stroke-linejoin="round" d="M1.4 13.6 L4.2 5.2 L8.5 9.6 L12 2.2 L15.5 9.6 L19.8 5.2 L22.6 13.6 Z"/></svg>';
  }
  function sun() {
    return '<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#f6c36b" stroke-width="2.1" stroke-linecap="round"><path d="M12 2.4v2.5M12 19.1v2.5M2.4 12h2.5M19.1 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/></g><circle cx="12" cy="12" r="4.7" fill="#f6c36b" stroke="#a86a22" stroke-width="0.7"/></svg>';
  }
  function moon() {
    return '<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f4f1ff" stroke="#b7b0d4" stroke-width="0.6" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  }
  function boardHTML() {
    const puzzle = state.puzzle;
    const game = puzzle.game;
    const n = puzzle.rows || puzzle.n || puzzle.size;
    const showMistakes = mistakesOn();
    let bad = null;
    if (showMistakes && game === 'queens') bad = queenBad();
    if (showMistakes && game === 'tango') bad = tangoBad();
    if (showMistakes && game === 'sudoku') bad = sudokuBad();
    let html = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const classes = ['cell'];
        if (state.patchAnchor && state.patchAnchor[0] === r && state.patchAnchor[1] === c) classes.push('sel');
        let inner = '';
        if (game === 'zip') {
          const num = puzzle.numbers[r][c];
          const onPath = state.play.path.some(function (cell) { return cell[0] === r && cell[1] === c; });
          const head = state.play.path[state.play.path.length - 1];
          if (onPath) classes.push('on-path');
          if (head && head[0] === r && head[1] === c) classes.push('head');
          if (num === 1 && !state.play.path.length) classes.push('start');
          if (state.walls.has(r + ',' + c + ',E')) inner += '<i class="wall-e"></i>';
          if (state.walls.has(r + ',' + c + ',S')) inner += '<i class="wall-s"></i>';
        } else if (game === 'queens') {
          const mark = state.play.marks[r][c];
          if (bad && bad[r][c]) classes.push('bad');
          if (mark === 'queen') inner += crown();
          if (mark === 'dot') inner += '<i class="dot"></i>';
        } else if (game === 'tango') {
          const given = puzzle.givens[r][c];
          const mark = given || state.play.marks[r][c];
          if (given) classes.push('given');
          if (bad && bad[r][c]) classes.push('bad');
          if (mark === 'sun') inner += sun();
          if (mark === 'moon') inner += moon();
          if (puzzle.h[r][c]) inner += '<i class="edge e">' + (puzzle.h[r][c] === 'eq' ? '=' : '×') + '</i>';
          if (r < n - 1 && puzzle.v[r][c]) inner += '<i class="edge s">' + (puzzle.v[r][c] === 'eq' ? '=' : '×') + '</i>';
        } else if (game === 'sudoku') {
          const given = puzzle.givens[r][c];
          const value = sudokuDigit(r, c);
          if (given) classes.push('given');
          if (state.play.sel && state.play.sel[0] === r && state.play.sel[1] === c) classes.push('sel');
          if (bad && bad[r][c]) classes.push('bad');
          const armed = state.play.armed;
          if (armed && value === armed) classes.push('same');
          if ((c + 1) % puzzle.boxC === 0 && c !== n - 1) classes.push('box-r');
          if ((r + 1) % puzzle.boxR === 0 && r !== n - 1) classes.push('box-b');
          if (value) inner = String(value);
          else if (state.play.notes[r][c]) {
            const bits = state.play.notes[r][c];
            inner = '<span class="notes' + (n === 6 ? ' six' : '') + '">';
            for (let d = 1; d <= n; d++) inner += '<i>' + ((bits & (1 << (d - 1))) ? d : '') + '</i>';
            inner += '</span>';
          }
        } else if (game === 'patches') {
          const id = state.play.cells[r][c];
          if (id >= 0 && c + 1 < n && state.play.cells[r][c + 1] >= 0 && state.play.cells[r][c + 1] !== id) classes.push('seam-e');
          if (id >= 0 && r + 1 < n && state.play.cells[r + 1][c] >= 0 && state.play.cells[r + 1][c] !== id) classes.push('seam-s');
          const preview = state.drag && state.drag.preview;
          if (preview && r >= preview[0] && r <= preview[2] && c >= preview[1] && c <= preview[3]) classes.push('preview');
          const clue = puzzle.clues.find(function (item) { return item.r === r && item.c === c; });
          if (clue) {
            let glyph = '';
            if (clue.shape === 'square') glyph = '<i class="glyph"></i>';
            if (clue.shape === 'wide') glyph = '<i class="glyph wide"></i>';
            if (clue.shape === 'tall') glyph = '<i class="glyph tall"></i>';
            if (clue.shape === 'any' && clue.area == null) glyph = '<i class="glyph diamond"></i>';
            inner += '<span class="stitch">' + (clue.area != null ? clue.area : '') + glyph + '</span>';
          }
        } else if (game === 'murdoku') {
          const roomIndex = puzzle.rooms.findIndex(function (room) { return room.id === puzzle.roomOf[r][c]; });
          const room = puzzle.rooms[roomIndex];
          const labelHere = !puzzle.roomOf.slice(0, r).some(function (row) { return row.includes(room.id); }) && puzzle.roomOf[r].indexOf(room.id) === c;
          const obj = (puzzle.objects || []).find(function (item) { return item.r === r && item.c === c; });
          const person = personAt(r, c);
          const victim = puzzle.people.find(function (item) { return item.role === 'victim'; });
          const victimRoom = puzzle.roomOf[puzzle.solution.positions[victim.id][0]][puzzle.solution.positions[victim.id][1]];
          if (c + 1 < n && puzzle.roomOf[r][c] !== puzzle.roomOf[r][c + 1]) classes.push('room-e');
          if (r + 1 < n && puzzle.roomOf[r][c] !== puzzle.roomOf[r + 1][c]) classes.push('room-s');
          if (state.solved && puzzle.roomOf[r][c] === victimRoom) classes.push('lit');
          if (labelHere) inner += '<span class="room-name">' + esc(room.name) + '</span>';
          if (obj) inner += '<span class="furn ' + esc(obj.kind) + '"><i></i><em>' + esc(obj.kind) + '</em></span>';
          if (person) {
            const tokenClass = 'token' + (person.role === 'victim' ? ' victim' : '') + (person.id === state.play.selected ? ' on' : '') + (state.solved && person.id === puzzle.solution.killerId ? ' culprit' : '') + (showMistakes && murdokuBad(person, r, c) ? ' bad' : '');
            inner += '<span class="' + tokenClass + '">' + esc(person.name.slice(0, 1)) + '</span>';
          }
        } else if (game === 'wend') {
          if (state.walls && state.walls.has(r + ',' + c)) classes.push('wall');
          else {
            const onPath = state.play.trace.some(function (cell) { return cell[0] === r && cell[1] === c; });
            const locked = state.play.found.some(function (word) { return word.cells.some(function (cell) { return cell[0] === r && cell[1] === c; }); });
            if (onPath) classes.push('on-path');
            if (locked) classes.push('locked');
            inner = '<span class="letter">' + esc(puzzle.letters[r][c]) + '</span>';
          }
        }
        const label = 'Row ' + (r + 1) + ', column ' + (c + 1) + (game === 'sudoku' ? ', ' + (sudokuDigit(r, c) || 'empty') : game === 'tango' ? ', ' + (tangoAt(r, c) || 'empty') : game === 'zip' && puzzle.numbers[r][c] ? ', ' + puzzle.numbers[r][c] : game === 'wend' ? ', ' + (puzzle.letters[r][c] || 'wall') : '');
        const active = state.play.sel || [0, 0];
        html += '<div class="' + classes.join(' ') + '" role="button" tabindex="' + (r === active[0] && c === active[1] ? '0' : '-1') + '" data-row="' + r + '" data-col="' + c + '" aria-label="' + esc(label) + '" style="' + washStyle(game, r, c) + '">' + inner + '</div>';
      }
    }
    return (game === 'zip' ? zipOverlay() : game === 'wend' ? pathTrace(state.play.trace) : '') + html;
  }
  function washStyle(game, r, c) {
    if (game === 'queens') return 'background:' + GLASS[state.puzzle.regions[r][c] % GLASS.length];
    if (game === 'patches' && state.play.cells[r][c] >= 0) return 'background:' + WEAVES[state.play.cells[r][c] % WEAVES.length];
    if (game === 'murdoku') {
      const roomIndex = state.puzzle.rooms.findIndex(function (room) { return room.id === state.puzzle.roomOf[r][c]; });
      return 'background:' + GLASS[roomIndex % GLASS.length];
    }
    return '';
  }
  function traceParts(cells) {
    const n = state.puzzle.rows;
    const pts = cells.map(function (cell) {
      return {
        x: ((cell[1] + 0.5) / n * 100).toFixed(2),
        y: ((cell[0] + 0.5) / n * 100).toFixed(2)
      };
    });
    if (!pts.length) return '';
    if (pts.length === 1) return '<circle cx="' + pts[0].x + '" cy="' + pts[0].y + '" r="2.4" fill="#c56b42"/>';
    const d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
    const head = pts[pts.length - 1];
    return '<path d="' + d + '" fill="none" stroke="#5a301f" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="#c56b42" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + head.x + '" cy="' + head.y + '" r="2.1" fill="#f3e2d4"/>';
  }
  function pathTrace(cells) {
    const body = traceParts(cells);
    if (!body) return '';
    return '<svg class="trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + body + '</svg>';
  }
  function zipOverlay() {
    const n = state.puzzle.rows;
    let marks = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const num = state.puzzle.numbers[r][c];
        if (!num) continue;
        const x = ((c + 0.5) / n * 100).toFixed(2);
        const y = ((r + 0.5) / n * 100).toFixed(2);
        marks += '<circle cx="' + x + '" cy="' + y + '" r="' + (34 / n).toFixed(2) + '" fill="#f7f1e6" stroke="#8c4a32" stroke-width="0.55"/>';
        marks += '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="central" fill="#1c1612" font-family="Georgia, serif" font-size="' + (46 / n).toFixed(2) + '">' + num + '</text>';
      }
    }
    return '<svg class="trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g class="line">' + traceParts(state.play.path) + '</g><g class="marks">' + marks + '</g></svg>';
  }
  function cellsOf(board) {
    const nodes = [];
    for (let i = 0; i < board.children.length; i++) {
      if (board.children[i].classList.contains('cell')) nodes.push(board.children[i]);
    }
    return nodes;
  }
  let paintFrame = 0;
  function schedulePaint() {
    if (paintFrame) return;
    paintFrame = requestAnimationFrame(function () {
      paintFrame = 0;
      if (state.drag && state.puzzle) paintLive();
    });
  }
  function paintStatus() {
    const status = document.getElementById('status');
    if (!status) return;
    const next = statusLine();
    if (status.textContent !== next) status.textContent = next;
  }
  function paintZip() {
    const board = document.querySelector('.board.zip');
    const line = board && board.querySelector('.trace .line');
    if (!line) return false;
    const n = state.puzzle.rows;
    line.innerHTML = traceParts(state.play.path);
    const nodes = cellsOf(board);
    const on = {};
    state.play.path.forEach(function (cell) { on[cell[0] + ',' + cell[1]] = 1; });
    const head = state.play.path[state.play.path.length - 1];
    for (let i = 0; i < nodes.length; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      nodes[i].classList.toggle('on-path', !!on[r + ',' + c]);
      nodes[i].classList.toggle('head', !!(head && head[0] === r && head[1] === c));
      nodes[i].classList.toggle('start', !state.play.path.length && state.puzzle.numbers[r][c] === 1);
    }
    paintStatus();
    return true;
  }
  function paintWend() {
    const board = document.querySelector('.board.wend');
    if (!board) return false;
    let svg = board.querySelector('.trace');
    const body = traceParts(state.play.trace);
    if (!svg && body) {
      board.insertAdjacentHTML('afterbegin', '<svg class="trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>');
      svg = board.querySelector('.trace');
    }
    if (svg) svg.innerHTML = body;
    const n = state.puzzle.rows;
    const nodes = cellsOf(board);
    const on = {};
    state.play.trace.forEach(function (cell) { on[cell[0] + ',' + cell[1]] = 1; });
    for (let i = 0; i < nodes.length; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      if (nodes[i].classList.contains('wall') || nodes[i].classList.contains('locked')) continue;
      nodes[i].classList.toggle('on-path', !!on[r + ',' + c]);
    }
    paintStatus();
    return true;
  }
  function paintPatches() {
    const board = document.querySelector('.board.patches');
    if (!board) return false;
    const n = state.puzzle.rows;
    const nodes = cellsOf(board);
    const preview = state.drag && state.drag.preview;
    for (let i = 0; i < nodes.length; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      const inside = preview && r >= preview[0] && r <= preview[2] && c >= preview[1] && c <= preview[3];
      nodes[i].classList.toggle('preview', !!inside);
    }
    return true;
  }
  function paintLive() {
    const game = state.puzzle && state.puzzle.game;
    if (game === 'zip' && paintZip()) return;
    if (game === 'wend' && paintWend()) return;
    if (game === 'patches' && paintPatches()) return;
    paintBoard();
  }
  function paintBoard() {
    const board = document.querySelector('.board');
    if (!board || !state.puzzle) return;
    const n = state.puzzle.rows || state.puzzle.n || state.puzzle.size;
    board.style.setProperty('--n', n);
    board.className = 'board ' + state.puzzle.game + (state.drag && state.drag.preview ? '' : '');
    board.innerHTML = boardHTML();
    const status = document.getElementById('status');
    if (status) status.textContent = statusLine();
    const clock = document.getElementById('clock-num');
    if (clock) clock.textContent = fmt(state.elapsed);
  }
  function sideHTML() {
    const puzzle = state.puzzle;
    if (puzzle.game === 'sudoku') {
      const n = puzzle.size;
      let counts = Array(n + 1).fill(0);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) counts[sudokuDigit(r, c)]++;
      let html = '<div class="pad">';
      for (let d = 1; d <= n; d++) {
        const cls = (state.play.armed === d ? ' armed' : '') + (counts[d] >= n ? ' done' : '');
        html += '<button type="button" data-digit="' + d + '" class="' + cls + '">' + d + '</button>';
      }
      html += '<button type="button" class="tool' + (state.play.pencil ? ' on' : '') + '" data-act="pencil">Notes</button>';
      html += '<button type="button" class="tool" data-act="clear">Erase</button></div>';
      return html;
    }
    if (puzzle.game !== 'murdoku') return '';
    const victim = puzzle.people.find(function (person) { return person.role === 'victim'; });
    let html = '<div class="roster">';
    puzzle.people.forEach(function (person) {
      html += '<button type="button" data-person="' + esc(person.id) + '" class="' + (state.play.selected === person.id ? 'on' : '') + '">' + esc(person.name) + '</button>';
    });
    html += '</div><div class="slips">';
    puzzle.clues.forEach(function (clue) {
      html += '<p class="slip' + (clue.personId === state.play.selected ? ' on' : '') + '">' + esc(clue.text) + '</p>';
    });
    html += '</div><p class="status">The room ' + esc(victim.name) + ' was in holds one other person. That person stayed behind.</p>';
    return html;
  }
  function sheetHTML() {
    const puzzle = state.puzzle;
    if (puzzle.game === 'pinpoint') {
      let html = '<ol class="clues">';
      for (let i = 0; i < puzzle.words.length; i++) {
        const open = i < state.play.shown;
        html += '<li class="' + (open ? 'open' : 'hid') + '"><span>' + String(i + 1).padStart(2, '0') + '</span>' + (open ? esc(puzzle.words[i]) : '····') + '</li>';
      }
      html += '</ol><form class="guess"><input data-guess type="text" aria-label="Your connection" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="The connection" value="' + esc(state.play.text) + '"' + (state.solved ? ' readonly' : '') + '><button type="button" class="solid" data-act="guess"' + (state.solved ? ' disabled' : '') + '>Guess</button></form>';
      return html;
    }
    let html = '<ol class="rungs">';
    state.play.order.forEach(function (idx, at) {
      const rung = puzzle.rungs[idx];
      const typed = state.play.typed[idx];
      const hit = typed === rung.answer ? ' hit' : '';
      html += '<li class="rung' + hit + '"><button type="button" data-act="up" data-at="' + at + '" aria-label="Move rung up"' + (at === 0 || state.solved ? ' disabled' : '') + '>↑</button><label><input data-rung="' + idx + '" type="text" maxlength="' + puzzle.letters + '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(typed) + '"' + (state.solved ? ' readonly' : '') + '><em>' + esc(rung.clue) + '</em></label><button type="button" data-act="down" data-at="' + at + '" aria-label="Move rung down"' + (at === state.play.order.length - 1 || state.solved ? ' disabled' : '') + '>↓</button></li>';
    });
    html += '</ol>';
    if (crossEndsOpen()) {
      html = '<p class="end-clue">' + esc(puzzle.endClue) + '</p><div class="ends"><input data-end="top" aria-label="Top word" type="text" maxlength="' + puzzle.letters + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Top word" value="' + esc(state.play.top) + '"' + (state.solved ? ' readonly' : '') + '>' + html + '<input data-end="bottom" aria-label="Bottom word" type="text" maxlength="' + puzzle.letters + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Bottom word" value="' + esc(state.play.bottom) + '"' + (state.solved ? ' readonly' : '') + '></div>';
    }
    return html;
  }
  function blanksHTML() {
    const found = state.play.found.slice();
    return '<ol class="blanks">' + state.puzzle.lengths.map(function (len) {
      const at = found.findIndex(function (word) { return word.word.length === len; });
      const word = at >= 0 ? found.splice(at, 1)[0].word : '';
      return '<li class="' + (word ? 'in' : '') + '">' + esc(word || new Array(len + 1).join('·')) + '</li>';
    }).join('') + '</ol>';
  }
  function mini(id) {
    if (id === 'zip') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="6" y="10" width="76" height="44" fill="#f4efe6"/><path d="M16 42 H34 V22 H58 V42 H74" fill="none" stroke="#8c4a32" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="42" r="3.2" fill="#8c4a32"/><text x="28" y="36" fill="#1c1612" font-family="Georgia" font-size="11">1</text><text x="62" y="36" fill="#1c1612" font-family="Georgia" font-size="11">2</text></svg>';
    if (id === 'queens') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="8" y="8" width="22" height="22" fill="#e6d3b4"/><rect x="33" y="8" width="22" height="22" fill="#8eae9c"/><rect x="58" y="8" width="22" height="22" fill="#e0b08a"/><rect x="8" y="34" width="22" height="22" fill="#9aafc4"/><rect x="33" y="34" width="22" height="22" fill="#e3b7b0"/><rect x="58" y="34" width="22" height="22" fill="#c9c296"/><path fill="#f2d48a" stroke="#3a2612" stroke-width="1" d="M36 50 L39 38 L44 44 L49 32 L54 44 L59 38 L62 50Z"/></svg>';
    if (id === 'tango') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="6" y="8" width="76" height="48" rx="2" fill="#16181e"/><circle cx="28" cy="32" r="8" fill="#f6c36b"/><path fill="#f4f1ff" d="M62 20.2A9 9 0 1 0 54 36.5 7 7 0 0 1 62 20.2z"/><text x="42" y="37" fill="#f6ead2" font-family="Georgia" font-size="16">=</text></svg>';
    if (id === 'sudoku') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="14" y="6" width="60" height="52" fill="#f4efe6" stroke="#1c1612" stroke-width="1.5"/><path d="M34 6 V58 M54 6 V58 M14 24 H74 M14 42 H74" stroke="#1c1612" stroke-width="1.2"/><text x="19" y="20" fill="#1c1612" font-family="Georgia" font-size="12">5</text><text x="40" y="38" fill="#3e5c50" font-family="Georgia" font-size="12">2</text><text x="59" y="54" fill="#1c1612" font-family="Georgia" font-size="12">9</text></svg>';
    if (id === 'murdoku') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="6" y="8" width="48" height="48" fill="#e6d3b4"/><rect x="54" y="8" width="28" height="28" fill="#8eae9c"/><rect x="54" y="36" width="28" height="20" fill="#e3b7b0"/><circle cx="28" cy="34" r="7" fill="#6d3038"/><circle cx="66" cy="22" r="5" fill="#f4efe6" stroke="#1c1612"/></svg>';
    if (id === 'patches') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="6" y="8" width="76" height="48" fill="#e7dcc8"/><rect x="6" y="8" width="34" height="48" fill="#ead9c4" stroke="#6d3038" stroke-width="1.4"/><rect x="40" y="8" width="42" height="22" fill="#e4d2ba" stroke="#6d3038" stroke-width="1.4"/><rect x="40" y="30" width="42" height="26" fill="#f3e7d4" stroke="#6d3038" stroke-width="1.4"/><text x="16" y="36" fill="#6d3038" font-family="Georgia" font-size="12">6</text></svg>';
    if (id === 'pinpoint') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="10" y="6" width="68" height="12" fill="#efe6d6"/><rect x="10" y="22" width="68" height="12" fill="#efe6d6"/><rect x="10" y="38" width="68" height="12" fill="#efe6d6" opacity="0.45"/><text x="16" y="16" fill="#1c1612" font-family="Georgia" font-size="9">apple</text><text x="16" y="32" fill="#1c1612" font-family="Georgia" font-size="9">plum</text></svg>';
    if (id === 'crossclimb') return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="18" y="8" width="52" height="10" fill="#efe6d6"/><rect x="18" y="24" width="52" height="10" fill="#efe6d6"/><rect x="18" y="40" width="52" height="10" fill="#efe6d6"/><path d="M22 8 V54 M66 8 V54" stroke="#b08d57" stroke-width="2"/></svg>';
    return '<svg class="mini-svg" viewBox="0 0 88 64" aria-hidden="true"><rect x="14" y="8" width="14" height="14" fill="#f4efe6"/><rect x="30" y="8" width="14" height="14" fill="#f4efe6"/><rect x="46" y="8" width="14" height="14" fill="#1a1614"/><rect x="14" y="24" width="14" height="14" fill="#f4efe6"/><rect x="30" y="24" width="14" height="14" fill="#f6e3d6"/><rect x="46" y="24" width="14" height="14" fill="#f4efe6"/><text x="17" y="19" fill="#1c1612" font-family="Georgia" font-size="10">W</text><text x="33" y="35" fill="#8c4a32" font-family="Georgia" font-size="10">E</text></svg>';
  }
  const SHELVES = [
    ['Boards', ['zip', 'queens', 'tango', 'sudoku', 'patches', 'murdoku']],
    ['Words', ['pinpoint', 'crossclimb', 'wend']]
  ];
  const HOW = {
    zip: 'Draw one line',
    queens: 'Place the crowns',
    tango: 'Balance sun and moon',
    sudoku: 'Fill every box',
    patches: 'Sew the cloth',
    murdoku: 'Seat the house',
    pinpoint: 'Name the category',
    crossclimb: 'Climb the ladder',
    wend: 'Spell the words'
  };
  const DIFF = { mini: 'Mini', easy: 'Easy', tricky: 'Tricky', fiendish: 'Fiendish' };
  function resumeOf() {
    const resume = prefs().resume;
    if (!resume || !resume.game || !resume.play) return null;
    return resume;
  }
  function bestSecs(id) {
    const best = prefs().best || {};
    let secs = null;
    Object.keys(best).forEach(function (key) {
      if (key.slice(0, id.length + 1) === id + '/' && (secs == null || best[key] < secs)) secs = best[key];
    });
    return secs;
  }
  function tileHTML(id) {
    const info = meta(id);
    const resume = resumeOf();
    const paused = resume && resume.game === id;
    const stored = (prefs().difficulty || {})[id];
    const how = paused ? 'Carry on' : HOW[id] + (stored && stored !== 'easy' ? ' · ' + (DIFF[stored] || stored) : '');
    const best = bestSecs(id);
    const bestHTML = best != null && !paused ? '<span class="tile-best">' + fmt(best * 1000) + '</span>' : '';
    const fresh = paused ? '<button type="button" class="fresh" data-fresh="' + id + '">New</button>' : '';
    return '<div class="tile-wrap' + (paused ? ' paused' : '') + '"><button type="button" class="tile" data-game="' + id + '"><span class="mark">' + mini(id) + '</span><span class="tile-name">' + esc(info.name) + '</span><span class="tile-how">' + esc(how) + bestHTML + '</span></button>' + fresh + '</div>';
  }
  function tableHTML() {
    const shelves = SHELVES.map(function (shelf) {
      return '<section class="shelf-block"><h2>' + shelf[0] + '</h2><div class="shelf">' + shelf[1].map(tileHTML).join('') + '</div></section>';
    }).join('');
    return '<main class="home"><header class="mast"><p class="eyebrow">Nine puzzles</p><h1>Nook</h1><p class="lede">No ads. Nothing to buy.</p></header><button type="button" class="tonight" data-act="tonight"><span class="tonight-copy"><span class="eyebrow">Tonight</span><span class="tonight-title">Nine in a row</span></span><span class="tonight-go">Start</span></button>' + shelves + '</main>';
  }
  function playHTML() {
    const info = meta(state.game);
    const diffs = info.difficulties.map(function (diff) {
      return '<button type="button" data-diff="' + diff.id + '" aria-pressed="' + (diff.id === state.difficulty) + '" class="' + (diff.id === state.difficulty ? 'on' : '') + '">' + esc(diff.label) + '</button>';
    }).join('');
    const round = state.round ? '<p class="status">' + (state.round.index + 1) + ' of ' + ORDER.length + ' tonight</p>' : '';
    const n = state.puzzle ? (state.puzzle.rows || state.puzzle.n || state.puzzle.size || 6) : 6;
    const side = state.puzzle && (state.puzzle.game === 'sudoku' || state.puzzle.game === 'murdoku');
    const word = state.puzzle && (state.puzzle.game === 'pinpoint' || state.puzzle.game === 'crossclimb');
    const another = state.solved ? '<button type="button" class="solid" data-act="another">' + (state.round ? (state.round.index === ORDER.length - 1 ? 'Tonight’s note' : 'Next') : 'Another') + '</button>' : '';
    const rules = state.puzzle && state.puzzle.game === 'murdoku'
      ? 'Everyone has their own row and their own column. Select a name, then a square to place them. Tap their selected token to pick them up. Blocking furniture cannot be occupied. “Beside” means sharing an edge in the same room; a corner is where two room edges meet. The slips all hold true. ' + esc(state.puzzle.people.find(function (person) { return person.role === 'victim'; }).name) + ' shared a room with one other person. Place everyone to discover who stayed behind.'
      : RULES[state.game];
    const board = word
      ? '<div class="sheet">' + (state.puzzle ? sheetHTML() : '') + '</div>'
      : '<div class="board-wrap"><div class="board ' + esc(state.game || '') + (state.puzzle ? '' : ' pending') + '" style="--n:' + n + '">' + (state.puzzle ? boardHTML() : '') + '</div>' + (state.puzzle && state.puzzle.game === 'wend' ? blanksHTML() : '') + '</div>';
    const mistakeControl = ['queens', 'tango', 'sudoku', 'murdoku'].includes(state.game) ? '<button type="button" data-act="mistakes" aria-pressed="' + mistakesOn() + '">Check errors</button>' : '';
    const hintLabel = state.game === 'pinpoint' && state.play && state.play.shown < 5 ? 'Next clue' : 'Hint';
    const dock = state.puzzle ? '<div class="dock"><button type="button" data-act="undo"' + (state.undo.length ? '' : ' disabled') + '>Undo</button><button type="button" data-act="hint"' + (state.solved ? ' disabled' : '') + '>' + hintLabel + '</button>' + mistakeControl + '<button type="button" data-act="new">New puzzle</button>' + another + '</div>' : '';
    return '<main class="play"><header class="bar"><button type="button" class="back" data-act="table">← Games</button><div class="titles"><h1>' + esc(info.name) + '</h1>' + round + '</div><div class="clock"><span id="clock-num">' + fmt(state.elapsed) + '</span><small>' + esc(bestLine()) + '</small></div>' + (state.round ? '' : '<div class="switch"><span class="diff-label">Difficulty</span>' + diffs + '</div>') + '<button type="button" class="seed" data-act="copy">Share</button></header><p class="game-intro">' + esc(INTRO[state.game]) + '</p>' + (state.puzzle ? '<p class="difficulty-note">' + esc(difficultyNote()) + '</p>' : '') + '<p class="progress-line" id="status" role="status">' + esc(statusLine()) + '</p><div class="stage' + (side ? ' with-side' : '') + (word ? ' word' : '') + (state.solved ? ' solved' : '') + '">' + board + (side && state.puzzle ? '<div class="side">' + sideHTML() + '</div>' : '') + '</div>' + dock + '<details class="rules"><summary>How to play</summary><p>' + rules + '</p></details></main>' + (state.toast ? '<div class="toast" role="status">' + esc(state.toast) + '</div>' : '');
  }
  function difficultyNote() {
    const p = state.puzzle;
    const label = DIFF[state.difficulty] || state.difficulty;
    if (p.game === 'pinpoint') return label + ' · ' + (state.solved && p.description ? p.category + ': ' + p.description : 'Five clues, one connection');
    if (p.game === 'crossclimb') return label + ' · ' + p.letters + '-letter words · ' + p.rungs.length + ' clues';
    if (p.game === 'murdoku') return label + ' · ' + p.people.length + ' people · ' + p.rooms.length + ' rooms';
    const n = p.rows || p.n || p.size;
    const technique = p.game === 'sudoku' && p.rating ? ['','Single candidates','Hidden singles and locked candidates','Naked pairs'][p.rating.tier] : '';
    return label + ' · ' + n + ' × ' + n + (technique ? ' · ' + technique : '');
  }
  function summaryHTML() {
    const items = state.summary.map(function (item) {
      return '<li>' + esc(meta(item.game).name) + '<span>' + fmt(item.ms) + '</span></li>';
    }).join('');
    return '<main class="summary"><p class="eyebrow">Tonight</p><h1>Laid to rest.</h1><p class="lede">Nine puzzles, one table. The times are only for you.</p><ol>' + items + '</ol><button type="button" class="solid" data-act="table">All games</button></main>';
  }
  function render() {
    const app = document.getElementById('app') || document.body.appendChild(document.createElement('div'));
    if (!app.id) app.id = 'app';
    const focus = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-act');
    const inputFocus = document.activeElement && document.activeElement.tagName === 'INPUT' ? ['data-guess', 'data-rung', 'data-end'].find(function (key) { return document.activeElement.hasAttribute(key); }) : null;
    const inputValue = inputFocus && document.activeElement.getAttribute(inputFocus);
    const selection = inputFocus && document.activeElement.selectionStart;
    const cellFocus = document.activeElement && document.activeElement.classList.contains('cell') ? [document.activeElement.dataset.row, document.activeElement.dataset.col] : null;
    const rulesOpen = !!document.querySelector('.rules[open]');
    app.innerHTML = state.view === 'table' ? tableHTML() : state.view === 'summary' ? summaryHTML() : playHTML();
    if (focus) {
      const next = app.querySelector('[data-act="' + focus + '"]');
      if (next) next.focus();
    }
    if (inputFocus) {
      const input = app.querySelector('[' + inputFocus + '="' + inputValue + '"]');
      if (input) { input.focus({ preventScroll: true }); input.setSelectionRange(selection, selection); }
    }
    if (cellFocus) {
      const cell = app.querySelector('[data-row="' + cellFocus[0] + '"][data-col="' + cellFocus[1] + '"]');
      if (cell) { app.querySelectorAll('.cell').forEach(function (node) { node.tabIndex = -1; }); cell.tabIndex = 0; cell.focus({ preventScroll: true }); }
    }
    if (rulesOpen && app.querySelector('.rules')) app.querySelector('.rules').open = true;
    document.title = state.view === 'table' ? 'Nook' : 'Nook · ' + meta(state.game).name;
  }
  function stash() {
    if (state.view !== 'game' || !state.puzzle || !state.play || state.solved) return;
    if (!state.timing && state.elapsed <= 0) return;
    const elapsed = state.timing ? performance.now() - state.started : state.elapsed;
    const data = prefs();
    data.resume = {
      game: state.game,
      difficulty: state.difficulty,
      seed: state.seed,
      play: state.play,
      puzzle: JSON.stringify(state.puzzle),
      undo: state.undo.slice(-30),
      elapsed: Math.max(0, Math.round(elapsed))
    };
    save(data);
  }
  let pendingGame = 0;
  function openGame(id, difficulty, seed, push) {
    stash();
    pauseClock();
    clearTimeout(pendingGame);
    const available = meta(id).difficulties;
    if (!available.some(function (diff) { return diff.id === difficulty; })) difficulty = available[0].id;
    state.view = 'game';
    state.game = id;
    state.difficulty = difficulty;
    state.seed = seed;
    state.puzzle = null;
    state.play = null;
    state.undo = [];
    state.elapsed = 0;
    state.timing = false;
    state.solved = false;
    state.drag = null;
    state.patchAnchor = null;
    state.status = 'Setting the pieces…';
    const data = prefs();
    data.difficulty = data.difficulty || {};
    data.difficulty[id] = difficulty;
    save(data);
    const url = '#' + [id, difficulty, encodeURIComponent(seed)].join('/');
    if (push) history.pushState({ view: 'game' }, '', url);
    else history.replaceState({ view: 'game' }, '', url);
    render();
    pendingGame = setTimeout(function () {
      const engine = engines()[id];
      if (!engine) {
        state.status = 'That deal did not hold.';
        render();
        return;
      }
      try {
        state.puzzle = engine.generate(difficulty, seed);
        state.play = freshPlay(state.puzzle);
        state.walls = state.puzzle.game === 'zip' ? zipWalls(state.puzzle) : state.puzzle.game === 'wend' ? new Set(state.puzzle.walls.map(function (wall) { return wall[0] + ',' + wall[1]; })) : null;
        const resume = prefs().resume;
        if (resume && resume.game === id && resume.difficulty === difficulty && resume.seed === seed && resume.play && resume.puzzle === JSON.stringify(state.puzzle)) {
          state.play = resume.play;
          state.undo = Array.isArray(resume.undo) ? resume.undo : [];
          state.elapsed = resume.elapsed || 0;
          state.timing = false;
          startClock();
        } else if (resume && resume.game === id && resume.difficulty === difficulty && resume.seed === seed) {
          save({ resume: null });
          state.toast = 'This puzzle has changed. Here is the updated board.';
        }
        state.status = engine.tagline;
      } catch (err) {
        state.status = 'That deal did not hold.';
      }
      render();
    }, 20);
  }
  function showTable(push) {
    stash();
    pauseClock();
    clearTimeout(pendingGame);
    state.timing = false;
    state.drag = null;
    state.view = 'table';
    state.round = null;
    state.summary = null;
    if (push) history.pushState({ view: 'table' }, '', location.pathname + location.search);
    render();
  }
  function onAct(act, node) {
    if (act === 'tonight') {
      state.round = { index: 0, times: [] };
      openGame('zip', 'easy', dailySeed('zip', 'easy'), true);
      return;
    }
    if (act === 'table') {
      showTable(true);
      return;
    }
    if (act === 'copy') {
      const done = function () { state.toast = 'Link copied.'; render(); setTimeout(function () { state.toast = ''; render(); }, 1400); };
      const failed = function () { state.toast = 'Copy the page address to share this puzzle.'; render(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done).catch(failed);
      else failed();
      return;
    }
    if (act === 'mistakes') {
      save({ mistakes: !mistakesOn() });
      render();
      return;
    }
    if (act === 'undo') {
      const prev = state.undo.pop();
      if (!prev) return;
      state.play = JSON.parse(prev);
      state.solved = false;
      if (state.elapsed > 0) startClock();
      render();
      return;
    }
    if (act === 'hint') { hint(); return; }
    if (act === 'new') {
      const had = state.timing && !state.solved;
      state.round = null;
      if (had) state.toast = 'The last one is on the shelf.';
      openGame(state.game, state.difficulty, anotherSeed(), false);
      if (had) setTimeout(function () {
        state.toast = '';
        const note = document.querySelector('.toast');
        if (note) note.remove();
      }, 2200);
      return;
    }
    if (act === 'another') {
      if (state.round) {
        state.round.times.push({ game: state.game, ms: state.elapsed });
        state.round.index += 1;
        if (state.round.index >= ORDER.length) {
          state.summary = state.round.times;
          state.view = 'summary';
          state.round = null;
          render();
          return;
        }
        const next = ORDER[state.round.index];
        const diff = next === 'sudoku' ? 'mini' : 'easy';
        openGame(next, diff, dailySeed(next, diff), false);
        return;
      }
      openGame(state.game, state.difficulty, anotherSeed(), false);
      return;
    }
    if (act === 'guess') {
      if (!state.puzzle || state.puzzle.game !== 'pinpoint' || state.solved) return;
      const field = document.querySelector('[data-guess]');
      if (field) state.play.text = field.value;
      if (!state.play.text.trim()) { state.play.note = 'Enter a connection, or choose Next clue.'; render(); return; }
      if (pinpointSolved()) {
        state.play.note = '';
        markSolved();
        render();
        return;
      }
      pushUndo();
      startClock();
      if (state.play.shown < state.puzzle.words.length) {
        state.play.shown += 1;
        state.play.note = 'Not quite. Here is another clue.';
      } else state.play.note = 'Not quite. All five clues are shown. Try another connection or use Hint.';
      render();
      const sheet = document.querySelector('.sheet');
      if (sheet) {
        sheet.classList.remove('shake');
        void sheet.offsetWidth;
        sheet.classList.add('shake');
      }
      const again = document.querySelector('[data-guess]');
      if (again) {
        again.focus();
        again.select();
      }
      return;
    }
    if ((act === 'up' || act === 'down') && state.play && state.puzzle && state.puzzle.game === 'crossclimb' && !state.solved) {
      const at = Number(node.getAttribute('data-at'));
      const to = act === 'up' ? at - 1 : at + 1;
      if (to < 0 || to >= state.play.order.length) return;
      pushUndo();
      const tmp = state.play.order[at];
      state.play.order[at] = state.play.order[to];
      state.play.order[to] = tmp;
      startClock();
      afterMove(false);
      return;
    }
    if (act === 'pencil') {
      state.play.pencil = !state.play.pencil;
      render();
      return;
    }
    if (act === 'clear' && state.play.sel) {
      const r = state.play.sel[0];
      const c = state.play.sel[1];
      if (!state.puzzle.givens[r][c]) {
        pushUndo();
        state.play.values[r][c] = 0;
        state.play.notes[r][c] = 0;
        afterMove(false);
      }
    }
  }
  function onField(event) {
    if (!state.play || state.solved || !event.target || !event.target.getAttribute) return;
    const input = event.target;
    if (input.getAttribute('data-guess') != null) {
      state.play.text = input.value;
      startClock();
      return;
    }
    const rung = input.getAttribute('data-rung');
    if (rung != null && state.puzzle.game === 'crossclimb') {
      const clean = input.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, state.puzzle.letters);
      if (clean !== input.value) input.value = clean;
      pushUndo();
      state.play.typed[Number(rung)] = clean;
      startClock();
      refreshCross();
      return;
    }
    const end = input.getAttribute('data-end');
    if (end && state.puzzle.game === 'crossclimb') {
      const clean = input.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, state.puzzle.letters);
      if (clean !== input.value) input.value = clean;
      pushUndo();
      state.play[end] = clean;
      startClock();
      if (crossSolved()) {
        markSolved();
        render();
      } else refreshCross();
    }
  }
  function refreshCross() {
    const status = document.getElementById('status');
    if (status) status.textContent = statusLine();
    document.querySelectorAll('[data-rung]').forEach(function (input) {
      const rung = state.puzzle.rungs[Number(input.getAttribute('data-rung'))];
      input.parentElement.parentElement.classList.toggle('hit', input.value === rung.answer);
    });
    const open = crossEndsOpen();
    const ends = document.querySelector('.ends');
    if (open !== !!ends) render();
  }
  function boot() {
    if (boot.done) return;
    boot.done = true;
    const app = document.getElementById('app') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'app' }));
    document.addEventListener('pointerdown', onPointerDown, { passive: false });
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    app.addEventListener('submit', function (event) { event.preventDefault(); if (state.game === 'pinpoint') onAct('guess'); });
    app.addEventListener('input', onField);
    app.addEventListener('click', function (event) {
      const cell = event.target.closest('.cell');
      if (cell && event.detail === 0) {
        activateCell(Number(cell.dataset.row), Number(cell.dataset.col));
        return;
      }
      const fresh = event.target.closest('[data-fresh]');
      if (fresh) {
        const id = fresh.getAttribute('data-fresh');
        const data = prefs();
        if (data.resume && data.resume.game === id) {
          data.resume = null;
          save(data);
        }
        state.round = null;
        const stored = (prefs().difficulty || {})[id] || 'easy';
        openGame(id, stored, freshSeed(), true);
        return;
      }
      const game = event.target.closest('[data-game]');
      if (game) {
        const id = game.getAttribute('data-game');
        const resume = resumeOf();
        state.round = null;
        if (resume && resume.game === id) openGame(id, resume.difficulty, resume.seed, true);
        else openGame(id, (prefs().difficulty || {})[id] || 'easy', freshSeed(), true);
        return;
      }
      const person = event.target.closest('[data-person]');
      if (person && state.play) {
        state.play.selected = person.getAttribute('data-person');
        render();
        return;
      }
      const digit = event.target.closest('[data-digit]');
      if (digit) { onDigit(Number(digit.getAttribute('data-digit'))); return; }
      const diff = event.target.closest('[data-diff]');
      if (diff) {
        openGame(state.game, diff.getAttribute('data-diff'), state.seed, false);
        return;
      }
      const act = event.target.closest('[data-act]');
      if (act) onAct(act.getAttribute('data-act'), act);
    });
    document.addEventListener('keydown', function (event) {
      if (state.view !== 'game') return;
      const typing = event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA');
      if (typing) {
        if (event.key === 'Enter' && state.puzzle && state.puzzle.game === 'pinpoint') {
          event.preventDefault();
          onAct('guess');
        }
        return;
      }
      const focusedCell = event.target.closest && event.target.closest('.cell');
      if (focusedCell && state.puzzle && !state.solved) {
        const r = Number(focusedCell.dataset.row), c = Number(focusedCell.dataset.col);
        const n = state.puzzle.rows || state.puzzle.n || state.puzzle.size;
        const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (directions[event.key]) {
          event.preventDefault();
          const dir = directions[event.key];
          const next = document.querySelector('[data-row="' + Math.max(0, Math.min(n - 1, r + dir[0])) + '"][data-col="' + Math.max(0, Math.min(n - 1, c + dir[1])) + '"]');
          if (next) { focusedCell.tabIndex = -1; next.tabIndex = 0; next.focus(); }
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activateCell(r, c);
          const next = document.querySelector('[data-row="' + r + '"][data-col="' + c + '"]');
          if (next) next.focus();
          return;
        }
      }
      if (event.key === 'Escape') showTable(true);
      if (event.key === 'u' || event.key === 'U') onAct('undo');
      if (event.key === 'h' || event.key === 'H') onAct('hint');
      if (event.key === 'N' && event.shiftKey) onAct('new');
      if ((event.key === 'p' || event.key === 'P') && state.puzzle && state.puzzle.game === 'sudoku') onAct('pencil');
      if (state.puzzle && state.puzzle.game === 'sudoku' && /^[1-9]$/.test(event.key) && Number(event.key) <= state.puzzle.size) onDigit(Number(event.key));
      if (state.puzzle && state.puzzle.game === 'sudoku' && (event.key === 'Backspace' || event.key === 'Delete')) onAct('clear');
    });
    window.addEventListener('pagehide', stash);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { stash(); pauseClock(); }
      else if (state.view === 'game' && state.elapsed > 0 && !state.solved) startClock();
    });
    window.addEventListener('popstate', function () {
      const raw = location.hash.replace(/^#/, '');
      if (!raw) { showTable(false); return; }
      const parts = raw.split('/');
      const game = parts[0];
      const difficulty = parts[1];
      const seed = decodeURIComponent(parts.slice(2).join('/'));
      if (ORDER.indexOf(game) === -1 || !seed) { showTable(false); return; }
      openGame(game, difficulty, seed, false);
    });
    const raw = location.hash.replace(/^#/, '');
    if (!raw) render();
    else {
      const parts = raw.split('/');
      if (ORDER.indexOf(parts[0]) !== -1 && parts[2]) openGame(parts[0], parts[1], decodeURIComponent(parts.slice(2).join('/')), false);
      else render();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
