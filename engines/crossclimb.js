(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, int } = R;

  const DEALS = [
    {
      difficulty: 'retired',
      endClue: 'Someone devoted to books',
      top: 'book',
      bottom: 'worm',
      middle: [
        ['cook', 'Prepare food with heat'],
        ['cork', 'The stopper in a wine bottle'],
        ['work', 'A job, or the act of doing it'],
      ],
    },
    {
      difficulty: 'retired',
      endClue: 'Wood kept for a fire',
      top: 'fire',
      bottom: 'wood',
      middle: [
        ['wire', 'A thin metal thread'],
        ['wore', 'Had clothes on, yesterday'],
        ['word', 'A piece of language'],
      ],
    },
    {
      difficulty: 'retired',
      endClue: 'Schoolwork done at home',
      top: 'home',
      bottom: 'work',
      middle: [
        ['some', 'A few, more than none'],
        ['sore', 'Tender, or a small hurt'],
        ['wore', 'Had clothes on, yesterday'],
      ],
    },
    {
      difficulty: 'easy',
      endClue: 'The game played with a round ball and two goals',
      top: 'foot',
      bottom: 'ball',
      middle: [
        ['boot', 'Sturdy footwear for mud'],
        ['bolt', 'A sliding lock on a gate'],
        ['belt', 'It holds a pair of trousers up'],
        ['bell', 'It sounds when pulled or struck'],
      ],
    },
    {
      difficulty: 'tricky',
      endClue: 'A coat for wet weather',
      top: 'rain',
      bottom: 'coat',
      middle: [
        ['rail', 'A bar you can hold, or a train track'],
        ['fail', 'To not succeed'],
        ['foil', 'Thin metal sheet, or to stop a plan'],
        ['coil', 'A loop of rope or wire'],
        ['coal', 'Black rock that burns'],
      ],
    },
    {
      difficulty: 'tricky',
      endClue: 'What you press beside a front door',
      top: 'door',
      bottom: 'bell',
      middle: [
        ['poor', 'Having little money'],
        ['pool', 'Water you can swim in'],
        ['tool', 'Something you work with'],
        ['toll', 'A fee to cross a bridge'],
        ['tell', 'To say something'],
      ],
    },
    {
      difficulty: 'tricky',
      endClue: 'Shelves for books',
      top: 'book',
      bottom: 'case',
      middle: [
        ['cook', 'Prepare food with heat'],
        ['cork', 'The stopper in a wine bottle'],
        ['cord', 'A thin rope'],
        ['card', 'Stiff paper, often with a greeting'],
        ['care', 'Looking after someone'],
      ],
    },
    {
      difficulty: 'tricky',
      endClue: 'The two faces of a coin',
      top: 'head',
      bottom: 'tail',
      middle: [
        ['held', 'Kept in the hands'],
        ['hold', 'To keep in the hands'],
        ['told', 'Said to someone'],
        ['toll', 'A fee to cross a bridge'],
        ['tall', 'High off the ground'],
      ],
    },
    {
      difficulty: 'fiendish',
      endClue: 'A small orange pet that swims',
      top: 'gold',
      bottom: 'fish',
      middle: [
        ['mold', 'The fuzzy growth on old bread'],
        ['mild', 'Gentle, not harsh'],
        ['mind', 'Where thoughts live'],
        ['mint', 'A fresh green herb'],
        ['mist', 'A thin cloud near the ground'],
        ['fist', 'A closed hand'],
      ],
    },
    {
      difficulty: 'fiendish',
      endClue: 'Where a ship is built',
      top: 'ship',
      bottom: 'yard',
      middle: [
        ['chip', 'A small piece broken off'],
        ['chin', 'The front of the jaw'],
        ['coin', 'A piece of money'],
        ['corn', 'A yellow grain'],
        ['cord', 'A thin rope'],
        ['card', 'Stiff paper'],
      ],
    },
    {
      difficulty: 'easy',
      endClue: 'Rows of vines on a hillside',
      top: 'vine',
      bottom: 'yard',
      middle: [
        ['wine', 'A drink made from grapes'],
        ['wind', 'Moving air'],
        ['wand', 'A thin stick in a story'],
        ['ward', 'A room in a hospital'],
      ],
    },
  ];

  function steps(a, b) {
    if (!a || !b || a.length !== b.length) return 99;
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  }

  function permutations(list) {
    if (list.length <= 1) return [list.slice()];
    const out = [];
    for (let i = 0; i < list.length; i++) {
      permutations(list.slice(0, i).concat(list.slice(i + 1))).forEach((tail) => {
        out.push([list[i]].concat(tail));
      });
    }
    return out;
  }

  function validDeal(deal) {
    const mids = deal.middle.map((row) => row[0]);
    const words = [deal.top].concat(mids, [deal.bottom]);
    if (new Set(words).size !== words.length) return false;
    for (let i = 1; i < words.length; i++) if (steps(words[i - 1], words[i]) !== 1) return false;
    if (new Set(deal.middle.map((row) => row[1])).size !== deal.middle.length) return false;
    let good = 0;
    permutations(mids).forEach((order) => {
      let ok = steps(deal.top, order[0]) === 1 && steps(order[order.length - 1], deal.bottom) === 1;
      for (let i = 1; i < order.length; i++) if (steps(order[i - 1], order[i]) !== 1) ok = false;
      if (ok) good++;
    });
    return good === 1;
  }

  function generate(difficulty, seed) {
    const deals = DEALS.filter((deal) => deal.difficulty === difficulty && validDeal(deal));
    if (!deals.length) throw new Error('crossclimb: no ladder for ' + difficulty);
    const rng = makeRng(String(seed) + ':crossclimb:' + difficulty);
    const deal = deals[int(rng, 0, deals.length - 1)];
    const bag = deal.middle.map((row) => ({ clue: row[1], answer: row[0] }));
    for (let i = bag.length - 1; i > 0; i--) {
      const j = int(rng, 0, i);
      const tmp = bag[i];
      bag[i] = bag[j];
      bag[j] = tmp;
    }
    return {
      game: 'crossclimb',
      difficulty,
      seed,
      letters: deal.top.length,
      endClue: deal.endClue,
      top: deal.top,
      bottom: deal.bottom,
      solution: [deal.top].concat(deal.middle.map((row) => row[0]), [deal.bottom]),
      rungs: bag,
    };
  }

  return {
    id: 'crossclimb',
    name: 'Crossclimb',
    tagline: 'Climb a ladder of words.',
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
