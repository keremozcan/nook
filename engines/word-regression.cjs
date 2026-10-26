/* Focused content and generator checks for Pinpoint and Crossclimb. */
const assert = require('assert');
const pinpoint = require('./pinpoint.js');
const crossclimb = require('./crossclimb.js');

const LEVELS = ['easy', 'tricky', 'fiendish'];

function letterSteps(a, b) {
  if (!a || !b || a.length !== b.length) return 99;
  let count = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) count++;
  return count;
}

function permutations(list) {
  if (list.length < 2) return [list.slice()];
  const out = [];
  list.forEach((word, i) => {
    permutations(list.slice(0, i).concat(list.slice(i + 1))).forEach((tail) => out.push([word].concat(tail)));
  });
  return out;
}

function legalUniqueLadder(ladder) {
  const middle = ladder.middle.map((row) => row[0]);
  const words = [ladder.top].concat(middle, [ladder.bottom]);
  if (words.some((word) => !/^[a-z]+$/.test(word)) || new Set(words).size !== words.length) return false;
  if (words.some((word, i) => i && letterSteps(words[i - 1], word) !== 1)) return false;
  if (ladder.middle.some((row) => !Array.isArray(row) || row.length !== 2 || row[1].length < 9)) return false;
  if (new Set(ladder.middle.map((row) => row[1])).size !== ladder.middle.length) return false;
  if (ladder.middle.some((row) => row[1].toLowerCase().includes(row[0]))) return false;
  const endClue = ladder.endClue.toLowerCase();
  if (endClue.includes(ladder.top) || endClue.includes(ladder.bottom)) return false;
  const chains = (path) => path.every((word, i) => !i || letterSteps(path[i - 1], word) === 1);
  let valid = 0;
  let middleOrders = 0;
  permutations(middle).forEach((order) => {
    if (chains(order)) middleOrders++;
    if (chains([ladder.top].concat(order, [ladder.bottom]))) valid++;
  });
  return valid === 1 && middleOrders === 2;
}

// The engine's own check must agree, and reject each kind of bad ladder.
const sample = { difficulty: 'easy', endClue: 'Where a pet budgie or canary lives', top: 'bird', bottom: 'cage', middle: [
  ['bard', 'A poet who tells stories'], ['card', 'You send one on a birthday'], ['care', 'Looking after someone'],
] };
assert(crossclimb.validDeal(sample), 'sample ladder should be valid');
assert(!crossclimb.validDeal(Object.assign({}, sample, { endClue: 'A small cage for a bird' })), 'end clue naming an end word');
assert(!crossclimb.validDeal(Object.assign({}, sample, { middle: [sample.middle[0], ['card', 'A birthday card'], sample.middle[2]] })), 'rung clue naming its answer');
assert(!crossclimb.validDeal({ difficulty: 'easy', endClue: 'Shoes, trainers and slippers, all together', top: 'foot', bottom: 'wear', middle: [
  ['boot', 'A sturdy shoe'], ['boat', 'A small craft'], ['beat', 'A rhythm'], ['bead', 'A small glass ball'], ['bear', 'A large furry animal'],
] }), 'middle rungs that chain in more than one order');
crossclimb.ladders.forEach((ladder) => assert(crossclimb.validDeal(ladder), 'engine rejects ' + ladder.top + ' to ' + ladder.bottom));

function testPinpoint() {
  const names = new Set();
  LEVELS.forEach((level) => {
    const entries = pinpoint.bank.filter((entry) => entry.difficulty === level);
    assert(entries.length >= 12, 'Pinpoint ' + level + ' needs at least 12 curated rounds');
    entries.forEach((entry) => {
      assert(!names.has(entry.name), 'duplicate Pinpoint category ' + entry.name);
      names.add(entry.name);
      assert(entry.description && entry.description.length > 8, 'missing category explanation: ' + entry.name);
      assert(entry.words.length === 5 && new Set(entry.words).size === 5, 'bad clue set: ' + entry.name);
      assert(entry.words.every((word) => /^[a-z]+$/.test(word)), 'bad clue word: ' + entry.name);
      assert(entry.accept.length > 0, 'missing answer synonyms: ' + entry.name);
    });
    const seen = new Set();
    for (let i = 0; i < 240; i++) {
      const seed = 'pinpoint-regression-' + level + '-' + i;
      const puzzle = pinpoint.generate(level, seed);
      assert.deepStrictEqual(puzzle, pinpoint.generate(level, seed), 'Pinpoint seed is not deterministic');
      assert(puzzle.game === 'pinpoint' && puzzle.difficulty === level, 'wrong Pinpoint metadata');
      assert(puzzle.words.length === 5 && new Set(puzzle.words).size === 5, 'bad generated clue set');
      assert(puzzle.description && puzzle.description.length > 8, 'missing generated explanation');
      const entry = entries.find((row) => row.name === puzzle.category);
      assert(entry && puzzle.words.every((word) => entry.words.includes(word)), 'generated clues do not match category');
      assert(puzzle.solution === entry.name && puzzle.accept.includes(entry.name.toLowerCase()), 'answer is not accepted');
      seen.add(puzzle.category);
    }
    assert(seen.size >= 10, 'Pinpoint seed selection has too little variety for ' + level + ': ' + seen.size);
  });
}

function testCrossclimb() {
  const ladders = crossclimb.ladders;
  assert(Array.isArray(ladders), 'Crossclimb must expose its curated ladder bank');
  LEVELS.forEach((level) => {
    const entries = ladders.filter((entry) => entry.difficulty === level);
    assert(entries.length >= 4, 'Crossclimb ' + level + ' needs several curated ladders');
    entries.forEach((entry) => {
      assert(entry.endClue && entry.endClue.length > 8, 'missing endpoint clue');
      const min = level === 'easy' ? 3 : level === 'tricky' ? 4 : 5;
      const max = level === 'easy' ? 4 : level === 'tricky' ? 5 : 6;
      assert(entry.middle.length >= min && entry.middle.length <= max, 'bad ' + level + ' ladder length');
      assert(legalUniqueLadder(entry), 'invalid or ambiguous ladder: ' + entry.top + ' to ' + entry.bottom);
    });
    const seen = new Set();
    for (let i = 0; i < 240; i++) {
      const seed = 'crossclimb-regression-' + level + '-' + i;
      const puzzle = crossclimb.generate(level, seed);
      assert.deepStrictEqual(puzzle, crossclimb.generate(level, seed), 'Crossclimb seed is not deterministic');
      assert(puzzle.game === 'crossclimb' && puzzle.difficulty === level, 'wrong Crossclimb metadata');
      assert(puzzle.solution[0] === puzzle.top && puzzle.solution[puzzle.solution.length - 1] === puzzle.bottom, 'missing fixed ends');
      assert(puzzle.solution.every((word, j) => !j || letterSteps(puzzle.solution[j - 1], word) === 1), 'generated ladder has an invalid step');
      assert(puzzle.rungs.length >= (level === 'easy' ? 3 : level === 'tricky' ? 4 : 5), 'generated ladder does not match difficulty');
      assert(puzzle.rungs.map((rung) => rung.answer).sort().join(',') === puzzle.solution.slice(1, -1).slice().sort().join(','), 'rungs do not match solution');
      seen.add(puzzle.top + '>' + puzzle.bottom);
    }
    assert(seen.size >= 4, 'Crossclimb seed selection has too little variety for ' + level + ': ' + seen.size);
  });
}

function testPinpointMatches() {
  const round = (name) => {
    const entry = pinpoint.bank.find((row) => row.name === name);
    assert(entry, 'missing round ' + name);
    return { accept: [entry.name.toLowerCase()].concat(entry.accept) };
  };
  const yes = [
    ['Planets', 'planets'], ['Planets', 'The Planets!'], ['Planets', 'a planet'], ['Planets', 'solar system'],
    ['Words with a silent “k”', 'silent k'], ['Words with a silent “k”', 'Silent-K words'],
    ['Words that can go before “house”', 'houses'], ['Words that can go before “berry”', 'Berries'],
    ['Farm animals', 'FARM ANIMAL'], ['Things with a handle', 'things with handles'], ['Insects', 'minibeasts'], ['Insects', 'bugs'],
    ['Words that can follow “tooth”', 'teeth'], ['Words that can follow “rain”', '"rain"'],
    ['Words containing “light”', 'words with light'],
  ];
  const no = [
    ['Planets', ''], ['Planets', 'stars'], ['Words with a silent “k”', 'silent letters'],
    ['Words with a silent “w”', 'silent k'], ['Farm animals', 'animals'], ['Birds', 'animals'],
    ['Words that can follow “rain”', 'snow'], ['Words that can follow “some”', 'any'],
  ];
  yes.forEach(([name, text]) => assert(pinpoint.matches(round(name), text), name + ' should accept ' + text));
  no.forEach(([name, text]) => assert(!pinpoint.matches(round(name), text), name + ' should reject ' + text));
}

// An easy round's first clue must not name its answer (a weekday gave "days of the week" away).
function testPinpointFirstClue() {
  pinpoint.bank.filter((entry) => entry.difficulty === 'easy').forEach((entry) => {
    const first = entry.words[0];
    [entry.name.toLowerCase()].concat(entry.accept).forEach((answer) => {
      answer.split(/\s+/).filter((word) => word.length >= 3 && !['the', 'and', 'things', 'types', 'with', 'that'].includes(word)).forEach((word) => {
        const stem = word.replace(/s$/, '');
        assert(!first.includes(stem), entry.name + ': first clue "' + first + '" gives away "' + answer + '"');
      });
    });
  });
}

// Clues that another natural four-letter word also answered (review C1) stay reworded.
function testCrossclimbClues() {
  const vague = ['The opposite of go', 'Moving air', 'A thin rope or string', 'Hold tightly', 'Get or win something', 'Not succeed'];
  crossclimb.ladders.forEach((ladder) => ladder.middle.forEach(([, clue]) => assert(!vague.includes(clue), 'ambiguous clue: ' + clue)));
}

testCrossclimb();
testCrossclimbClues();
testPinpoint();
testPinpointFirstClue();
testPinpointMatches();
console.log('word engine regression checks passed');
