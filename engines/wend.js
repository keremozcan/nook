(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, shuffle, pick } = R;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const WORDS = `bird wind moon star leaf pine lamp cake milk snow rain book fish gold ring bell coin card corn ship door rose lake hill path sand wave fire wood home nest pond frog bear wolf deer duck sail drum vine wand mist mint mind mild fist chip chin yard boot bolt belt coat rail foil coal pool tool toll tall hold told wire cork cook worm band bank card cord care case some sore word wore fail ball foot head tail
apple arrow beach berry black bread brown brush candy chair charm cloud coral dance dream eagle earth field flame flour fruit glass grape green heart honey horse house lemon light maple melon money mouse music night ocean olive paint paper party peach pearl plant queen river robin scarf sheep shell shirt shore sleep smile snake spark spoon stamp stone storm story sweet table tiger toast trail water whale wheat white world amber birch cedar linen pearl olive
butter candle castle bridge garden forest island market orange purple yellow silver winter summer spring basket bottle branch breeze bucket button canyon circle clover coffee copper cotton cradle cricket dancer desert donkey dragon drawer flight flower friend helmet jacket jungle kettle kitten ladder marble meadow mirror needle orchid pebble picnic pillow planet pocket potato rabbit ribbon rocket sailor season shadow singer sister sketch sleeve soccer socket square stream string summer sunset temple tennis timber tomato tunnel turkey turtle valley violet walnut window
lantern orchard thistle blanket cabinet diamond feather jasmine kitchen library morning picture rainbow silence sunrise thunder village whisper blossom compass crystal evening harbour meadowlark`.split(/\s+/).filter((word, i, all) => word.length >= 4 && word.length <= 7 && all.indexOf(word) === i && word !== word.split('').reverse().join(''));
  const DICT = new Set(WORDS);
  const PREFIXES = new Set(WORDS.flatMap((word) => Array.from({ length: word.length }, (_, i) => word.slice(0, i + 1))));

  function byLength(len) {
    return WORDS.filter((word) => word.length === len);
  }

  function openCells(n, walls) {
    const blocked = Array.from({ length: n }, () => Array(n).fill(false));
    walls.forEach(([r, c]) => { blocked[r][c] = true; });
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!blocked[r][c]) cells.push([r, c]);
    return { blocked, cells };
  }

  function neighbors(n, blocked, used, r, c) {
    const out = [];
    for (let d = 0; d < DIRS.length; d++) {
      const rr = r + DIRS[d][0];
      const cc = c + DIRS[d][1];
      if (rr < 0 || cc < 0 || rr >= n || cc >= n || blocked[rr][cc] || used[rr][cc]) continue;
      out.push([rr, cc]);
    }
    return out;
  }

  function hamilton(n, blocked, rng) {
    let total = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!blocked[r][c]) total++;
    const used = Array.from({ length: n }, () => Array(n).fill(false));
    let starts = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!blocked[r][c]) starts.push([r, c]);
    const colours = [0, 0];
    starts.forEach(([r, c]) => { colours[(r + c) % 2]++; });
    // A path alternates checkerboard colours and can only have two dead ends.
    if (Math.abs(colours[0] - colours[1]) > 1) return null;
    const ends = starts.filter(([r, c]) => neighbors(n, blocked, used, r, c).length === 1);
    if (ends.length > 2 || starts.some(([r, c]) => !neighbors(n, blocked, used, r, c).length)) return null;
    if (ends.length) starts = ends;
    if (colours[0] !== colours[1]) starts = starts.filter(([r, c]) => colours[(r + c) % 2] > colours[1 - (r + c) % 2]);
    starts = shuffle(rng, starts);
    let nodes = 0;
    function dfs(path) {
      // Some wall arrangements have no path; don't lock the page searching them.
      if (++nodes > 20000) return false;
      if (path.length === total) return true;
      const [r, c] = path[path.length - 1];
      const next = shuffle(rng, neighbors(n, blocked, used, r, c));
      next.sort((a, b) => neighbors(n, blocked, used, a[0], a[1]).length - neighbors(n, blocked, used, b[0], b[1]).length);
      for (let i = 0; i < next.length; i++) {
        const [rr, cc] = next[i];
        used[rr][cc] = true;
        path.push([rr, cc]);
        if (dfs(path)) return true;
        path.pop();
        used[rr][cc] = false;
      }
      return false;
    }
    for (let s = 0; s < Math.min(6, starts.length); s++) {
      nodes = 0;
      for (let r = 0; r < n; r++) used[r].fill(false);
      const path = [starts[s]];
      used[starts[s][0]][starts[s][1]] = true;
      if (dfs(path)) return path;
    }
    return null;
  }

  function carve(n, lengths, walls, rng) {
    const { blocked } = openCells(n, walls);
    const path = hamilton(n, blocked, rng);
    if (!path) return null;
    const snakes = [];
    let at = 0;
    for (let i = 0; i < lengths.length; i++) {
      snakes.push(path.slice(at, at + lengths[i]));
      at += lengths[i];
    }
    return { snakes, blocked };
  }

  function countCovers(letters, blocked, lengths, limit) {
    const n = letters.length;
    const need = lengths.slice().sort((a, b) => b - a);
    const used = Array.from({ length: n }, () => Array(n).fill(false));
    let count = 0;
    let nodes = 0;
    const cap = 30000;
    function bt(li, minStart) {
      if (count >= limit || nodes > cap) return;
      if (li === need.length) {
        count++;
        return;
      }
      const len = need[li];
      const same = li + 1 < need.length && need[li + 1] === len;
      for (let r = 0; r < n && count < limit; r++) {
        for (let c = 0; c < n && count < limit; c++) {
          const start = r * n + c;
          if (start < minStart || blocked[r][c] || used[r][c]) continue;
          used[r][c] = true;
          spell(r, c, letters[r][c], 1, same ? start + 1 : 0);
          used[r][c] = false;
        }
      }
      function spell(r, c, word, depth, nextMin) {
        nodes++;
        if (count >= limit || nodes > cap) return;
        if (!PREFIXES.has(word)) return;
        if (depth === len) {
          if (DICT.has(word)) bt(li + 1, nextMin);
          return;
        }
        for (let d = 0; d < DIRS.length; d++) {
          const rr = r + DIRS[d][0];
          const cc = c + DIRS[d][1];
          if (rr < 0 || cc < 0 || rr >= n || cc >= n || blocked[rr][cc] || used[rr][cc]) continue;
          used[rr][cc] = true;
          spell(rr, cc, word + letters[rr][cc], depth + 1, nextMin);
          used[rr][cc] = false;
        }
      }
    }
    bt(0, 0);
    if (nodes > cap && count < 1) return -1;
    if (nodes > cap) return count >= limit ? limit : -1;
    return count;
  }

  const SPEC = {
    easy: { n: 5, walls: 1, lengths: [6, 6, 6, 6] },
    tricky: { n: 5, walls: 2, lengths: [5, 5, 5, 4, 4] },
    fiendish: { n: 6, walls: 8, lengths: [7, 7, 7, 7] },
  };

  function generate(difficulty, seed) {
    const spec = SPEC[difficulty] || SPEC.easy;
    const n = spec.n;
    const lengths = spec.lengths;
    const spots = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) spots.push([r, c]);
    for (let attempt = 0; attempt < 24; attempt++) {
      const rng = makeRng(String(seed) + ':wend:' + difficulty + ':' + attempt);
      let carved = null;
      let walls = null;
      for (let wallTry = 0; wallTry < 32 && !carved; wallTry++) {
        walls = shuffle(rng, spots.slice()).slice(0, spec.walls);
        carved = carve(n, lengths.slice().sort((a, b) => b - a), walls, rng);
      }
      if (!carved) continue;
      const themes = [
        'bird deer duck frog leaf nest pine pond rose vine wind wolf wood birch cedar field grape honey maple olive plant river stone trail wheat branch breeze clover flower forest garden meadow orchid pebble picnic spring stream summer timber valley violet walnut winter blossom feather jasmine thistle sunrise rainbow lantern',
        'cake corn milk mint fish cake cook apple bread candy flour fruit grape honey lemon melon olive peach spoon toast butter coffee orange potato tomato turkey basket bottle kitchen chair glass house table brush paper paint lamp door book boot bell drum ring tool candle mirror pillow window ladder blanket cabinet library',
      ];
      const sets = themes.map((line) => new Set(line.split(/\s+/)));
      let theme = sets[0];
      for (let i = 0; i < sets.length; i++) {
        const set = sets[Math.floor(rng() * sets.length)];
        const need = carved.snakes.length + 2;
        const ready = carved.snakes.every((cells) => byLength(cells.length).filter((word) => set.has(word)).length >= need);
        if (ready) {
          theme = set;
          break;
        }
      }
      const pools = carved.snakes.map((cells) => {
        const themed = byLength(cells.length).filter((word) => theme.has(word));
        const need = carved.snakes.length + 2;
        return shuffle(rng, themed.length >= need ? themed : byLength(cells.length));
      });
      for (let wordTry = 0; wordTry < 8; wordTry++) {
        const letters = Array.from({ length: n }, () => Array(n).fill(''));
        const solution = [];
        const usedWords = new Set();
        let wordsOk = true;
        carved.snakes.forEach((cells, index) => {
          const choices = pools[index].filter((word) => !usedWords.has(word));
          const word = choices.length ? choices[(wordTry + index) % choices.length] : null;
          if (!word) wordsOk = false;
          else {
            usedWords.add(word);
            cells.forEach((cell, i) => { letters[cell[0]][cell[1]] = word[i]; });
            solution.push({ word, cells: cells.map((cell) => [cell[0], cell[1]]) });
          }
        });
        if (!wordsOk) continue;
        if (countCovers(letters, carved.blocked, lengths, 2) !== 1) continue;
        return {
          game: 'wend',
          difficulty,
          seed,
          rows: n,
          cols: n,
          letters,
          walls,
          lengths: lengths.slice().sort((a, b) => a - b),
          solution,
        };
      }
    }
    throw new Error('wend: no unique puzzle');
  }

  return {
    id: 'wend',
    name: 'Wend',
    tagline: 'Weave a word through every letter.',
    words: WORDS,
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
