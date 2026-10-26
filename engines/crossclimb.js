(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, int } = R;

  // Each ladder: two end words with one shared clue, and middle words that each change one letter.
  // Clues are plain and fair, never contain their own answer, and use British English.
  const DEALS = [
    // Easy: three or four rungs.
    { difficulty: 'easy', endClue: 'A person who loves reading and always has a story on the go', top: 'book', bottom: 'worm', middle: [
      ['cook', 'Make a meal by heating food'], ['cork', 'The stopper in a wine bottle'], ['work', 'A job, or the effort it takes'],
    ] },
    { difficulty: 'easy', endClue: 'Logs you burn in a stove or hearth', top: 'fire', bottom: 'wood', middle: [
      ['wire', 'A thin metal thread'], ['wore', 'Was dressed in'], ['word', 'A group of letters with a meaning'],
    ] },
    { difficulty: 'easy', endClue: 'Tasks a teacher sets for you to do after school', top: 'home', bottom: 'work', middle: [
      ['come', 'Move towards the speaker'], ['core', 'The middle of an apple'], ['wore', 'Was dressed in'],
    ] },
    { difficulty: 'easy', endClue: 'A farm where grapes are grown', top: 'vine', bottom: 'yard', middle: [
      ['wine', 'A drink made from grapes'], ['wind', 'Moving air'], ['wand', 'A magician’s thin stick'], ['ward', 'A room for patients in a hospital'],
    ] },
    { difficulty: 'easy', endClue: 'Where a pet budgie or canary lives', top: 'bird', bottom: 'cage', middle: [
      ['bard', 'A poet who tells stories'], ['card', 'You send one on a birthday'], ['care', 'Looking after someone'],
    ] },
    { difficulty: 'easy', endClue: 'A tall building with sails that turn in the breeze', top: 'wind', bottom: 'mill', middle: [
      ['mind', 'Where thoughts and memories live'], ['mild', 'Gentle, not strong or harsh'], ['milk', 'A white drink that comes from cows'],
    ] },

    // Tricky: four or five rungs.
    { difficulty: 'tricky', endClue: 'A team game where you kick for a goal', top: 'foot', bottom: 'ball', middle: [
      ['boot', 'A sturdy shoe that covers the ankle'], ['bolt', 'A sliding metal lock on a door'], ['belt', 'A strap worn around the waist'], ['bell', 'It rings in a church tower'],
    ] },
    { difficulty: 'tricky', endClue: 'A waterproof jacket for wet weather', top: 'rain', bottom: 'coat', middle: [
      ['rail', 'A bar to hold, or a track for trains'], ['fail', 'Not succeed'], ['foil', 'Thin metal sheet for wrapping food'], ['coil', 'A loop of rope or wire wound round and round'], ['coal', 'Black rock that is burned for heat'],
    ] },
    { difficulty: 'tricky', endClue: 'Press it so the people inside know you are here', top: 'door', bottom: 'bell', middle: [
      ['poor', 'Having little money'], ['pool', 'A tank of water made for swimming'], ['tool', 'Something like a hammer or a saw'], ['toll', 'A fee paid to use a road or bridge'], ['tell', 'Say something to someone'],
    ] },
    { difficulty: 'tricky', endClue: 'Shelves where you keep your novels', top: 'book', bottom: 'case', middle: [
      ['cook', 'Make a meal by heating food'], ['cork', 'The stopper in a wine bottle'], ['cord', 'A thin rope or string'], ['card', 'You send one on a birthday'], ['care', 'Looking after someone'],
    ] },
    { difficulty: 'tricky', endClue: 'It rescues people in trouble at sea', top: 'life', bottom: 'boat', middle: [
      ['lift', 'Raise something up'], ['list', 'Items written one under another'], ['lost', 'Unable to find the way'], ['cost', 'How much you pay for something'], ['coat', 'A warm layer worn outdoors over your clothes'],
    ] },
    { difficulty: 'tricky', endClue: 'A tiny bit of water falling from a cloud', top: 'rain', bottom: 'drop', middle: [
      ['gain', 'Get or win something'], ['grin', 'A wide smile'], ['grip', 'Hold tightly'], ['drip', 'What a leaky tap does'],
    ] },
    { difficulty: 'tricky', endClue: 'Silver light shining down at night', top: 'moon', bottom: 'beam', middle: [
      ['moan', 'A low sound of pain or sadness'], ['loan', 'Money lent that must be paid back'], ['lean', 'Tilt to one side'], ['bean', 'A seed eaten as a vegetable'],
    ] },

    // Fiendish: five or six rungs.
    { difficulty: 'fiendish', endClue: 'A small orange pet that swims in a bowl', top: 'gold', bottom: 'fish', middle: [
      ['gild', 'Coat thinly with a precious yellow metal'], ['mild', 'Gentle, not strong or harsh'], ['mind', 'Where thoughts and memories live'], ['mint', 'A fresh-smelling herb'], ['mist', 'A thin cloud close to the ground'], ['fist', 'A hand with its fingers curled in'],
    ] },
    { difficulty: 'fiendish', endClue: 'Where big boats are built and repaired', top: 'ship', bottom: 'yard', middle: [
      ['chip', 'A small piece broken off something'], ['chin', 'The part of the face below the mouth'], ['coin', 'A small piece of money'], ['corn', 'Grain such as wheat or maize'], ['cord', 'A thin rope or string'], ['card', 'You send one on a birthday'],
    ] },
    { difficulty: 'fiendish', endClue: 'A secret you say or type to be let in', top: 'pass', bottom: 'word', middle: [
      ['past', 'The time that has already gone'], ['cast', 'The actors in a play'], ['cart', 'A small wagon, pushed or pulled'], ['card', 'You send one on a birthday'], ['cord', 'A thin rope or string'],
    ] },
    { difficulty: 'fiendish', endClue: 'Shoes, trainers and slippers, all together', top: 'foot', bottom: 'wear', middle: [
      ['boot', 'A sturdy shoe that covers the ankle'], ['boat', 'A small craft that travels on water'], ['beat', 'Win against someone, or a rhythm'], ['heat', 'Warmth, or a race before the final'], ['hear', 'What your ears let you do'],
    ] },
    { difficulty: 'fiendish', endClue: 'A region of the world that keeps the same clock', top: 'time', bottom: 'zone', middle: [
      ['tire', 'Become weary'], ['fire', 'Flames and heat'], ['fore', 'The front part of something'], ['bore', 'Make a hole, or someone who is dull'], ['bone', 'A hard part of a skeleton'],
    ] },
    { difficulty: 'fiendish', endClue: 'Crafted by a person, not by a machine', top: 'hand', bottom: 'made', middle: [
      ['band', 'A group of musicians'], ['bane', 'A cause of constant trouble'], ['bake', 'Cook in an oven'], ['make', 'Create or build something'], ['mate', 'A friend, or a partner'],
    ] },
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

  function chains(order) {
    for (let i = 1; i < order.length; i++) if (steps(order[i - 1], order[i]) !== 1) return false;
    return true;
  }

  function validDeal(deal) {
    const mids = deal.middle.map((row) => row[0]);
    const words = [deal.top].concat(mids, [deal.bottom]);
    if (new Set(words).size !== words.length || !chains(words)) return false;
    if (new Set(deal.middle.map((row) => row[1])).size !== deal.middle.length) return false;
    // No clue gives its own answer away.
    if (deal.middle.some((row) => row[1].toLowerCase().includes(row[0]))) return false;
    const endClue = deal.endClue.toLowerCase();
    if (endClue.includes(deal.top) || endClue.includes(deal.bottom)) return false;
    // Players order the middle rungs before the ends unlock, so the middle alone
    // must chain one way only (read either direction), and the ends must fit that chain.
    let middleOrders = 0;
    let ladders = 0;
    permutations(mids).forEach((order) => {
      if (!chains(order)) return;
      middleOrders++;
      if (chains([deal.top].concat(order, [deal.bottom]))) ladders++;
    });
    return middleOrders === 2 && ladders === 1;
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
    ladders: DEALS,
    validDeal,
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
