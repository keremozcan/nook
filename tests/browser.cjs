/* Browser checks for the Nook interface.
   Run with Playwright installed: node tests/browser.cjs (NOOK_BUILT=1 checks the built index.html). */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const base = pathToFileURL(path.resolve(__dirname, process.env.NOOK_BUILT ? '../index.html' : '../dev.html')).href;
const GAMES = ['zip', 'queens', 'tango', 'sudoku', 'patches', 'murdoku', 'pinpoint', 'crossclimb', 'wend'];
const SEED = 'browser-check';
const errors = [];
let browser;

function engine(game) { return require('../engines/' + game + '.js'); }
function puzzleFor(game, level = 'easy', seed = SEED) { return engine(game).generate(level, seed); }

async function newPage(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, colorScheme: opts.scheme || 'light' });
  page.on('pageerror', (e) => errors.push((opts.tag || 'page') + ': ' + e.message));
  if (opts.storage !== undefined) {
    await page.addInitScript((data) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      Object.keys(data).forEach((k) => localStorage.setItem(k, JSON.stringify(data[k])));
    }, opts.storage);
  }
  return page;
}
async function ready(page) { await page.locator('.stage .cell, .stage .sheet input').first().waitFor(); }
async function open(game, level = 'easy', seed = SEED, opts = {}) {
  const page = await newPage({ tag: game, storage: opts.storage || {}, scheme: opts.scheme });
  await page.goto(base + '#' + game + '/' + level + '/' + seed);
  await ready(page);
  return page;
}
const cell = (page, r, c) => page.locator('.stage .cell[data-r="' + r + '"][data-c="' + c + '"]');
async function centre(page, r, c) {
  const box = await cell(page, r, c).boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
}
async function draw(page, cells) {
  for (let i = 0; i < cells.length; i++) {
    const [x, y] = await centre(page, cells[i][0], cells[i][1]);
    await page.mouse.move(x, y, { steps: i ? 2 : 1 });
    if (!i) await page.mouse.down();
  }
  await page.mouse.up();
}
async function tap(page, r, c) { const [x, y] = await centre(page, r, c); await page.touchscreen.tap(x, y); }
const solved = (page) => page.locator('.foot.is-solved').count();
async function hintToEnd(page) {
  for (let i = 0; i < 140 && !(await solved(page)); i++) await page.locator('[data-act="hint"]').click();
  return solved(page);
}
async function store(page) { return page.evaluate(() => JSON.parse(localStorage.getItem('nook.v2') || '{}')); }

async function playNormally(page, p) {
  if (p.game === 'zip') await draw(page, p.solution);
  if (p.game === 'queens') {
    for (const [r, c] of p.solution) { await tap(page, r, c); await tap(page, r, c); }
  }
  if (p.game === 'tango') {
    for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (!p.givens[r][c]) {
      await tap(page, r, c);
      if (p.solution[r][c] === 'moon') await tap(page, r, c);
    }
  }
  if (p.game === 'sudoku') {
    for (let r = 0; r < p.size; r++) for (let c = 0; c < p.size; c++) if (!p.givens[r][c]) {
      await tap(page, r, c);
      await page.locator('[data-digit="' + p.solution[r][c] + '"]').tap();
    }
  }
  if (p.game === 'patches') {
    for (let id = 0; id < p.clues.length; id++) {
      const cells = [];
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) if (p.solution[r][c] === id) cells.push([r, c]);
      const r0 = Math.min(...cells.map((x) => x[0])), r1 = Math.max(...cells.map((x) => x[0]));
      const c0 = Math.min(...cells.map((x) => x[1])), c1 = Math.max(...cells.map((x) => x[1]));
      if (r0 === r1 && c0 === c1) await tap(page, r0, c0);
      else await draw(page, [[r0, c0], [r1, c1]]);
    }
  }
  if (p.game === 'murdoku') {
    for (const person of p.people) {
      await page.locator('[data-person="' + person.id + '"]').tap();
      await tap(page, ...p.solution.positions[person.id]);
    }
  }
  if (p.game === 'pinpoint') {
    await page.locator('[data-guess]').fill(p.accept[p.accept.length - 1]);
    await page.locator('[data-act="guess"]').tap();
  }
  if (p.game === 'crossclimb') {
    for (let i = 0; i < p.rungs.length; i++) await page.locator('[data-rung="' + i + '"]').fill(p.rungs[i].answer);
    for (let i = 0; i < p.rungs.length; i++) {
      const idx = p.rungs.findIndex((x) => x.answer === p.solution[i + 1]);
      for (;;) {
        const at = await page.locator('.ladder .rung').evaluateAll((rows, idx) => rows.findIndex((n) => Number(n.dataset.idx) === idx), idx);
        if (at <= i) break;
        await page.locator('.rung[data-idx="' + idx + '"] [data-move="up"]').tap();
      }
    }
    await page.locator('[data-end="top"]').fill(p.top);
    await page.locator('[data-end="bottom"]').fill(p.bottom);
  }
  if (p.game === 'wend') for (const word of p.solution) await draw(page, word.cells);
}

async function run() {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    // Every game: real controls to a win, the Solved panel, then hints alone to a win.
    for (const game of GAMES) {
      const page = await open(game);
      const p = puzzleFor(game);
      assert((await page.locator('.rule').textContent()).length > 20, game + ' shows its rule');
      assert.equal(await page.locator('.how li').count() > 2, true, game + ' has How to play');
      await playNormally(page, p);
      assert(await solved(page), game + ' solves through its controls');
      const panel = page.locator('#done');
      await panel.locator('h2').waitFor();
      assert.equal(await panel.locator('[data-act="next"]').textContent(), 'Next puzzle', game + ' offers Next puzzle');
      assert.equal(await page.locator('.dock-fold').evaluate((n) => n.inert), true, game + ' folds the dock away once solved, leaving one next step');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), game + ' fits the phone width');
      const saved = await store(page);
      assert(!saved.saved[game], game + ' clears its saved puzzle when solved');
      assert(Object.keys(saved.best).some((k) => k.startsWith(game + '/')), game + ' records a best time');
      await panel.locator('[data-act="next"]').click();
      await page.waitForFunction(() => !document.querySelector('.foot.is-solved') && document.querySelector('.stage .cell, .stage .sheet input'));
      const bestBefore = JSON.stringify((await store(page)).best);
      assert(await hintToEnd(page), game + ' hints reach a win');
      assert.equal(JSON.stringify((await store(page)).best), bestBefore, game + ' hinted win leaves best times alone');
      assert.match(await page.locator('#done').textContent(), /Hints don’t count/, game + ' says hints don’t count');
      await page.close();
      console.log('ok play + hints ' + game);
    }

    // Check errors marks broken rules, and can be turned off.
    {
      const page = await open('queens');
      const p = puzzleFor('queens');
      await cell(page, 0, 0).focus();
      await page.keyboard.press('Enter');
      await cell(page, 0, 0).focus();
      for (let c = 1; c <= 2; c++) await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.stage .cell.bad').count(), 2, 'two crowns in one row are marked');
      await page.locator('[data-act="check"]').click();
      assert.equal(await page.locator('.stage .cell.bad').count(), 0, 'Check errors turns off');
      await page.locator('[data-act="check"]').click();
      void p;
      await page.close();
    }
    {
      const page = await open('sudoku');
      const p = puzzleFor('sudoku');
      let spot;
      for (let c = 0; c < p.size && !spot; c++) if (!p.givens[0][c]) spot = c;
      const given = p.givens[0].find(Boolean);
      await tap(page, 0, spot);
      await page.locator('[data-digit="' + given + '"]').tap();
      assert((await page.locator('.stage .cell.bad').count()) >= 2, 'a repeated Sudoku digit is marked');
      await page.close();
    }
    // A legal-but-wrong Tango guess is not marked.
    {
      const page = await open('tango');
      const p = puzzleFor('tango');
      let target;
      for (let r = 0; r < p.n && !target; r++) for (let c = 0; c < p.n && !target; c++) if (!p.givens[r][c]) target = [r, c];
      await tap(page, ...target);
      assert.equal(await page.locator('.stage .cell.bad').count(), 0, 'one symbol alone breaks no rule');
      assert.equal(await cell(page, ...target).locator('.sun').count(), 1, 'tap places a sun');
      await page.locator('[data-act="undo"]').click();
      assert.equal(await cell(page, ...target).locator('svg').count(), 0, 'undo clears it');
      await page.close();
    }

    // Queens: one tap is a dot, two taps a crown, one undo reverses the pair; a tap leaves no focus box.
    {
      const page = await open('queens');
      await tap(page, 1, 1);
      assert.equal(await page.locator('.stage .dot').count(), 1, 'single tap places a dot');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('cell')), false, 'a tap does not focus the cell');
      await page.waitForTimeout(500);
      await tap(page, 1, 1);
      assert.equal(await page.locator('.stage .dot').count(), 0, 'tapping a dot clears it');
      await page.waitForTimeout(500);
      await tap(page, 2, 2);
      await tap(page, 2, 2);
      assert.equal(await page.locator('.stage .crown').count(), 1, 'double tap places a crown');
      await page.locator('[data-act="undo"]').click();
      assert.equal(await page.locator('.stage .crown, .stage .dot').count(), 0, 'one undo reverses the double tap');
      await cell(page, 0, 0).evaluate((n) => n.click());
      assert.equal(await page.locator('.stage .dot').count(), 1, 'assistive activation places a dot');
      await page.close();
    }

    // Zip: three quick taps all land, and the numbers stay visible at the end.
    {
      const page = await open('zip');
      const p = puzzleFor('zip');
      for (let i = 0; i < 4; i++) await tap(page, ...p.solution[i]);
      const path = await page.evaluate(() => window.NOOK_UI.shell.state.play.path.length);
      assert.equal(path, 4, 'quick taps each extend the line');
      await draw(page, p.solution.slice(3));
      assert(await solved(page), 'zip finishes after taps and a drag');
      const last = p.solution[p.solution.length - 1];
      const max = Math.max(...p.numbers.flat());
      assert.equal(p.numbers[last[0]][last[1]], max);
      const shown = await page.locator('.layer-nums text').evaluateAll((t) => t.map((n) => n.textContent));
      assert(shown.includes(String(max)), 'the last number is still drawn');
      await page.close();
    }

    // Patches: a rejected rectangle says why.
    {
      const page = await open('patches');
      const p = puzzleFor('patches');
      const a = p.clues[0];
      const b = p.clues[1];
      await draw(page, [[Math.min(a.r, b.r), Math.min(a.c, b.c)], [Math.max(a.r, b.r), Math.max(a.c, b.c)]]);
      const said = await page.locator('#status').textContent();
      assert(/clue|squares|square|rectangle|overlaps/.test(said), 'rejected patch explains itself: ' + said);
      await page.close();
    }

    // Keyboard play: Zip by arrows and Space, Queens by Enter, Sudoku by arrows and digits.
    {
      const page = await open('zip');
      const p = puzzleFor('zip');
      await cell(page, ...p.solution[0]).focus();
      await page.keyboard.press('Space');
      for (let i = 1; i < p.solution.length; i++) {
        const [r0, c0] = p.solution[i - 1];
        const [r1, c1] = p.solution[i];
        await page.keyboard.press(r1 > r0 ? 'ArrowDown' : r1 < r0 ? 'ArrowUp' : c1 > c0 ? 'ArrowRight' : 'ArrowLeft');
        await page.keyboard.press('Space');
      }
      assert(await solved(page), 'Zip solves by keyboard');
      await page.close();
    }
    {
      const page = await open('queens');
      const p = puzzleFor('queens');
      await cell(page, 0, 0).focus();
      let at = [0, 0];
      for (const [r, c] of p.solution) {
        while (at[0] < r) { await page.keyboard.press('ArrowDown'); at[0]++; }
        while (at[1] < c) { await page.keyboard.press('ArrowRight'); at[1]++; }
        while (at[1] > c) { await page.keyboard.press('ArrowLeft'); at[1]--; }
        await page.keyboard.press('Enter');
      }
      assert(await solved(page), 'Queens solves by keyboard');
      await page.close();
    }
    {
      const page = await open('sudoku', 'mini');
      const p = puzzleFor('sudoku', 'mini');
      await cell(page, 0, 0).focus();
      for (let r = 0; r < p.size; r++) {
        for (let c = 0; c < p.size; c++) {
          if (!p.givens[r][c]) await page.keyboard.press(String(p.solution[r][c]));
          if (c < p.size - 1) await page.keyboard.press('ArrowRight');
        }
        if (r < p.size - 1) { await page.keyboard.press('ArrowDown'); for (let c = 0; c < p.size - 1; c++) await page.keyboard.press('ArrowLeft'); }
      }
      assert(await solved(page), 'Sudoku solves by keyboard');
      await page.close();
    }

    // Two games in progress at once both survive a reload, with their clocks.
    {
      const page = await newPage({ tag: 'resume', storage: { 'nook.v1': { best: { 'zip/easy': 42 }, resume: { game: 'zip' } } } });
      await page.goto(base);
      await page.locator('.tile[data-game="zip"]').click();
      await ready(page);
      const zip = await page.evaluate(() => window.NOOK_UI.shell.state.puzzle);
      await draw(page, zip.solution.slice(0, 5));
      await page.locator('[data-act="home"]').first().click();
      await page.locator('.tile[data-game="sudoku"]').click();
      await ready(page);
      await page.locator('[data-act="hint"]').click();
      await page.locator('[data-act="hint"]').click();
      await page.reload();
      await ready(page);
      assert.equal(await page.evaluate(() => window.NOOK_UI.shell.state.play.values.flat().filter(Boolean).length), 2, 'sudoku resumes after reload');
      await page.locator('[data-act="home"]').first().click();
      assert.equal(await page.locator('.tile.saved').count(), 2, 'both games show Carry on');
      assert.match(await page.locator('.tile[data-game="zip"]').textContent(), /Best|Carry on/);
      await page.locator('.tile[data-game="zip"]').click();
      await ready(page);
      assert.equal(await page.evaluate(() => window.NOOK_UI.shell.state.play.path.length), 5, 'zip resumes its line');
      const s = await store(page);
      assert.equal(s.best['zip/easy'], 42, 'old best times carry over');
      await page.locator('[data-act="new"]').click();
      await ready(page);
      assert.equal(await page.evaluate(() => window.NOOK_UI.shell.state.play.path.length), 0, 'New puzzle starts fresh');
      assert(!(await store(page)).saved.zip, 'New puzzle drops the saved one');
      await page.close();
      console.log('ok resume');
    }

    // Tonight: all nine in order, keeping its place across a reload.
    {
      const page = await newPage({ tag: 'tonight', storage: {} });
      await page.goto(base);
      await page.locator('[data-act="tonight"]').click();
      for (let i = 0; i < 9; i++) {
        await ready(page);
        assert.equal(await page.locator('.round').textContent(), 'Tonight · ' + (i + 1) + ' of 9');
        assert(await hintToEnd(page), 'Tonight game ' + (i + 1) + ' completes');
        assert.equal(await page.locator('[data-act="next"]').textContent(), i < 8 ? 'Next game' : 'See tonight’s times');
        if (i === 3) {
          await page.goto(base);
          assert.match(await page.locator('.tonight').textContent(), /4 of 9 done/);
          await page.locator('[data-act="tonight"]').click();
          continue;
        }
        await page.locator('[data-act="next"]').click();
      }
      assert.equal(await page.locator('.summary .times li:not(.total)').count(), 9, 'Tonight ends on nine times');
      await page.close();
      console.log('ok tonight');
    }

    // Dark mode: every game renders on a dark page without errors.
    for (const game of GAMES) {
      const page = await open(game, 'easy', SEED, { scheme: 'dark' });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const [r, g, b] = bg.match(/\d+/g).map(Number);
      assert(r + g + b < 120, game + ' page is dark: ' + bg);
      await page.close();
    }
    console.log('ok dark');

    assert.deepEqual(errors, [], 'no page errors');
    console.log('ok all browser checks');
  } finally {
    await browser.close();
  }
}
run().catch((err) => { console.error(err); process.exitCode = 1; });
