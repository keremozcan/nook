/* Run with Playwright installed: node tests/browser.cjs */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const base = pathToFileURL(path.resolve(__dirname, '../dev.html')).href;
const errors = [];
let browser;

async function open(game, difficulty = 'easy', playFor, seed = 'browser-regression') {
  const engine = require('../engines/' + game + '.js');
  const effective = engine.difficulties.some((d) => d.id === difficulty) ? difficulty : engine.difficulties[0].id;
  const puzzle = engine.generate(effective, seed);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', (error) => errors.push(game + ': ' + error.message));
  const resume = playFor ? { game, difficulty, seed, puzzle: JSON.stringify(puzzle), play: playFor(puzzle), undo: [], elapsed: 1000 } : null;
  await page.addInitScript((saved) => {
    localStorage.clear();
    localStorage.setItem('nook.v1', JSON.stringify({ resume: saved }));
  }, resume);
  await page.goto(base + '#' + game + '/' + difficulty + '/' + seed);
  await page.locator('.board .cell, .sheet input').first().waitFor();
  return { page, puzzle };
}
async function savedPlay(page) {
  return page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide'));
    return JSON.parse(localStorage.getItem('nook.v1')).resume?.play;
  });
}
function matrix(n, value) { return Array.from({ length: n }, () => Array(n).fill(value)); }
async function clickCell(page, r, c) {
  await page.locator('[data-row="' + r + '"][data-col="' + c + '"]').click();
}
async function hint(page) { await page.locator('[data-act="hint"]').click(); }
async function solved(page) { return page.locator('[data-act="another"]').count(); }
async function draw(page, cells) {
  for (let i = 0; i < cells.length; i++) {
    const [r,c] = cells[i];
    const rect = await page.locator('[data-row="' + r + '"][data-col="' + c + '"]').boundingBox();
    await page.mouse.move(rect.x + rect.width/2, rect.y + rect.height/2);
    if (!i) await page.mouse.down();
  }
  await page.mouse.up();
}
async function playNormally(page, p) {
  if (p.game === 'zip') await draw(page, p.solution);
  if (p.game === 'queens') for (const [r,c] of p.solution) await clickCell(page,r,c);
  if (p.game === 'tango') for (let r=0;r<p.n;r++) for (let c=0;c<p.n;c++) if (!p.givens[r][c]) {
    await clickCell(page,r,c);
    if (p.solution[r][c] === 'moon') await clickCell(page,r,c);
  }
  if (p.game === 'sudoku') for (let r=0;r<p.size;r++) for (let c=0;c<p.size;c++) if (!p.givens[r][c]) {
    await clickCell(page,r,c);
    await page.locator('[data-digit="' + p.solution[r][c] + '"]').click();
  }
  if (p.game === 'patches') for (let id=0;id<p.clues.length;id++) {
    const cells = [];
    for(let r=0;r<p.rows;r++) for(let c=0;c<p.cols;c++) if(p.solution[r][c]===id) cells.push([r,c]);
    const r0=Math.min(...cells.map(c=>c[0])),r1=Math.max(...cells.map(c=>c[0]));
    const c0=Math.min(...cells.map(c=>c[1])),c1=Math.max(...cells.map(c=>c[1]));
    if(r0===r1 && c0===c1) await clickCell(page,r0,c0);
    else await draw(page,[[r0,c0],[r1,c1]]);
  }
  if (p.game === 'murdoku') for(const person of p.people) {
    await page.locator('[data-person="' + person.id + '"]').click();
    await clickCell(page,...p.solution.positions[person.id]);
  }
  if (p.game === 'pinpoint') {
    await page.locator('[data-guess]').fill(p.accept[0]);
    await page.locator('[data-act="guess"]').click();
  }
  if (p.game === 'crossclimb') {
    for(let i=0;i<p.rungs.length;i++) await page.locator('[data-rung="' + i + '"]').fill(p.rungs[i].answer);
    for(let i=0;i<p.rungs.length;i++) {
      const idx = p.rungs.findIndex(r=>r.answer===p.solution[i+1]);
      let at = await page.locator('[data-rung]').evaluateAll((inputs,idx)=>inputs.findIndex(n=>Number(n.dataset.rung)===idx),idx);
      while(at>i) { await page.locator('[data-act="up"][data-at="' + at + '"]').click(); at--; }
    }
    await page.locator('[data-end="top"]').fill(p.top);
    await page.locator('[data-end="bottom"]').fill(p.bottom);
  }
  if(p.game==='wend') for(const word of p.solution) await draw(page,word.cells);
}

async function run() {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    // Check every game can complete via its real controls, including the daily sequence.
    for (const game of ['zip', 'queens', 'tango', 'sudoku', 'patches', 'murdoku', 'pinpoint', 'crossclimb', 'wend']) {
      const { page, puzzle } = await open(game);
      assert(await page.locator('.game-intro').textContent(), game + ' has visible instructions');
      await playNormally(page,puzzle);
      assert(await solved(page), game + ' normal play reaches completion');
      await page.locator('[data-act="another"]').click();
      await page.locator('.board .cell, .sheet input').first().waitFor();
      for (let i = 0; i < 110 && !(await solved(page)); i++) await hint(page);
      assert(await solved(page), game + ' hints reach completion');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), game + ' fits phone');
      await page.close();
      console.log('ok controls ' + game);
    }
    // Filled incorrect grids must be repairable, rather than hints silently doing nothing.
    for (const game of ['tango', 'sudoku']) {
      const { page } = await open(game, 'easy', (p) => game === 'tango'
        ? { marks: p.solution.map((row) => row.map((s) => s === 'sun' ? 'moon' : 'sun')) }
        : { values: p.solution.map((row) => row.map((d) => d % p.size + 1)), notes: matrix(p.size, 0), sel: null, armed: null, pencil: false });
      for (let i = 0; i < 90 && !(await solved(page)); i++) await hint(page);
      assert(await solved(page), game + ' repairs wrong filled values');
      await page.close();
    }
    // Queens permits distant diagonals; only neighbouring crowns may touch.
    {
      const { page } = await open('queens', 'easy', (p) => {
        const marks = matrix(p.n, null);
        let pair;
        for (let r = 0; r < p.n - 2 && !pair; r++) for (let c = 0; c < p.n - 2 && !pair; c++) {
          if (p.regions[r][c] !== p.regions[r+2][c+2]) pair = [[r,c], [r+2,c+2]];
        }
        assert(pair, 'fixture has cells on distant diagonals in separate regions');
        pair.forEach(([r,c]) => { marks[r][c] = 'queen'; });
        return { marks };
      });
      assert.equal(await page.locator('.cell.bad').count(), 0, 'Queens permits distant diagonals');
      await page.close();
    }
    // Both directions of a word ladder are playable, with the endpoint clue revealed.
    {
      const { page, puzzle } = await open('crossclimb', 'easy', (p) => ({
        typed: p.rungs.map((r) => r.answer),
        order: p.solution.slice(1, -1).reverse().map((word) => p.rungs.findIndex((r) => r.answer === word)),
        top: '', bottom: ''
      }));
      await page.locator('[data-end="top"]').fill(puzzle.bottom);
      await page.locator('[data-end="bottom"]').fill(puzzle.top);
      assert(await solved(page), 'reversed Crossclimb completes');
      await page.close();
    }
    // Picking up a person lets a fully occupied wrong house be rearranged.
    {
      const { page, puzzle } = await open('murdoku', 'easy', (p) => ({ pos: p.solution.positions, selected: p.people[0].id }));
      const at = puzzle.solution.positions[puzzle.people[0].id];
      await clickCell(page, ...at);
      const play = await savedPlay(page);
      assert(!play.pos[puzzle.people[0].id], 'selected Murdoku token can be removed');
      await page.close();
    }
    // A Patches hint removes whole conflicting rectangles, never leaving broken fragments.
    {
      const { page, puzzle } = await open('patches', 'easy', (p) => {
        return { cells: matrix(p.rows, 1) };
      });
      await hint(page);
      const play = await savedPlay(page);
      const changedId = puzzle.solution.flat().find((id) => play.cells.some((row, r) => row.some((cell, c) => cell === id && puzzle.solution[r][c] === id)));
      assert(changedId != null, 'Patches places its hinted region');
      const oldRemainder = [];
      for (let r = 0; r < puzzle.rows; r++) for (let c = 0; c < puzzle.cols; c++) if (play.cells[r][c] === 1 && puzzle.solution[r][c] !== 1) oldRemainder.push([r,c]);
      assert.equal(oldRemainder.length, 0, 'no fragments of overlapping fake patch');
      await page.close();
    }
    // Fast movement across more than one cell must not drop intermediate path cells.
    {
      const { page } = await open('wend', 'easy');
      const candidate = await page.evaluate(() => {
        const p = window.NOOK_ENGINES.wend.generate('easy', 'browser-regression');
        for (const word of p.solution) for (let i = 0; i < word.cells.length - 2; i++) {
          const a = word.cells[i], b = word.cells[i+1], c = word.cells[i+2];
          if (a[0] === b[0] && b[0] === c[0] || a[1] === b[1] && b[1] === c[1]) return [a,b,c];
        }
      });
      assert(candidate, 'fixture has a straight stretch');
      const a = await page.locator('[data-row="' + candidate[0][0] + '"][data-col="' + candidate[0][1] + '"]').boundingBox();
      const c = await page.locator('[data-row="' + candidate[2][0] + '"][data-col="' + candidate[2][1] + '"]').boundingBox();
      await page.mouse.move(a.x+a.width/2, a.y+a.height/2);
      await page.mouse.down();
      await page.mouse.move(c.x+c.width/2, c.y+c.height/2);
      const play = await savedPlay(page);
      assert.equal(play.trace.length, 3, 'fast drag visits intermediate letters');
      await page.mouse.up();
      await page.close();
    }
    // Keyboard users can select and enter a cell, and invalid difficulty links recover.
    {
      const { page } = await open('sudoku', 'invalid');
      const editable = page.locator('.cell:not(.given)').first();
      await editable.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('1');
      assert.equal(await page.locator('.cell.sel').textContent(), '1');
      await page.close();
    }
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ok UI regressions');
  } finally { await browser.close(); }
}
run().catch((err) => { console.error(err); process.exitCode = 1; });
