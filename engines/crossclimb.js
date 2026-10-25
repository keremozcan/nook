(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, int } = R;

  // Every listed middle word has a short definition and belongs to one unique
  // one-letter route between the two fixed ends. Clues define the word, not
  // merely a loose association with it.
  const DEALS = [
    // Easy: short, familiar chains.
    { difficulty: 'easy', endClue: 'Someone devoted to books', top: 'book', bottom: 'worm', middle: [
      ['cook', 'Prepare food by heating it'], ['cork', 'The stopper in a wine bottle'], ['work', 'A job, or the act of doing it'],
    ] },
    { difficulty: 'easy', endClue: 'Wood kept for a fire', top: 'fire', bottom: 'wood', middle: [
      ['wire', 'A thin metal thread'], ['wore', 'Had clothes on, yesterday'], ['word', 'A piece of language'],
    ] },
    { difficulty: 'easy', endClue: 'Schoolwork done at home', top: 'home', bottom: 'work', middle: [
      ['come', 'Move toward the speaker'], ['core', 'The central part of something'], ['wore', 'Had clothes on, yesterday'],
    ] },
    { difficulty: 'easy', endClue: 'Rows of grapevines grown together', top: 'vine', bottom: 'yard', middle: [
      ['wine', 'A drink made from grapes'], ['wind', 'Moving air'], ['wand', 'A thin stick used by a magician'], ['ward', 'A room or unit in a hospital'],
    ] },
    { difficulty: 'easy', endClue: 'A small enclosure for a bird', top: 'bird', bottom: 'cage', middle: [
      ['bard', 'A poet, especially one who tells stories'], ['card', 'A stiff folded greeting for a birthday'], ['care', 'Keeping a person safe and well'],
    ] },
    { difficulty: 'easy', endClue: 'A machine that grinds grain into flour', top: 'wind', bottom: 'mill', middle: [
      ['mind', 'Where thoughts and memories sit'], ['mild', 'Gentle, not strong or harsh'], ['milk', 'A drink produced by cows'],
    ] },

    // Tricky: more rungs or less direct transitions, still all common words.
    { difficulty: 'tricky', endClue: 'The game played with a round ball and two goals', top: 'foot', bottom: 'ball', middle: [
      ['boot', 'A sturdy shoe that covers the ankle'], ['bolt', 'A sliding metal lock'], ['belt', 'A strap worn around the waist'], ['bell', 'The metal cup a tower rings'],
    ] },
    { difficulty: 'tricky', endClue: 'A coat worn to keep off rain', top: 'rain', bottom: 'coat', middle: [
      ['rail', 'A bar to hold, or a train track'], ['fail', 'To not succeed'], ['foil', 'Thin metal sheet, or to stop a plan'], ['coil', 'A loop of rope or wire'], ['coal', 'Black rock that can be burned'],
    ] },
    { difficulty: 'tricky', endClue: 'A button you press beside a front door', top: 'door', bottom: 'bell', middle: [
      ['poor', 'Having little money'], ['pool', 'A tank of water made for swimming'], ['tool', 'Something used to do a job'], ['toll', 'A fee paid to use a road or bridge'], ['tell', 'To say something'],
    ] },
    { difficulty: 'tricky', endClue: 'A piece of furniture for storing books', top: 'book', bottom: 'case', middle: [
      ['cook', 'Prepare food by heating it'], ['cork', 'The stopper in a wine bottle'], ['cord', 'What you tug to draw a curtain shut'], ['card', 'A stiff folded greeting for a birthday'], ['care', 'Keeping a person safe and well'],
    ] },
    { difficulty: 'tricky', endClue: 'A small boat carried by a larger ship', top: 'life', bottom: 'boat', middle: [
      ['lift', 'Raise something up'], ['list', 'A set of names or items written one under another'], ['lost', 'Unable to find the way'], ['cost', 'The amount of money something needs'], ['coat', 'A warm garment worn outdoors'],
    ] },
    { difficulty: 'tricky', endClue: 'A single drop of rainwater', top: 'rain', bottom: 'drop', middle: [
      ['gain', 'To get or win something'], ['grin', 'A wide smile'], ['grip', 'To hold tightly'], ['drip', 'To fall one drop at a time'],
    ] },
    { difficulty: 'tricky', endClue: 'A beam of light from the moon', top: 'moon', bottom: 'beam', middle: [
      ['moan', 'To make a low sound of pain or sadness'], ['loan', 'Money lent that must be paid back'], ['lean', 'To tilt to one side'], ['bean', 'A seed eaten as a vegetable'],
    ] },

    // Fiendish: longer routes and less visually obvious changes.
    { difficulty: 'fiendish', endClue: 'A small orange pet that swims in a bowl', top: 'gold', bottom: 'fish', middle: [
      ['gild', 'Cover with a thin layer of gold'], ['mild', 'Gentle, not strong or harsh'], ['mind', 'Where thoughts and memories sit'], ['mint', 'A fresh-smelling herb'], ['mist', 'A thin cloud close to the ground'], ['fist', 'A hand with its fingers curled in'],
    ] },
    { difficulty: 'fiendish', endClue: 'A place where ships are built or repaired', top: 'ship', bottom: 'yard', middle: [
      ['chip', 'A small piece broken off something'], ['chin', 'The part of the face below the mouth'], ['coin', 'A small piece of money'], ['corn', 'A yellow grain eaten as food'], ['cord', 'What you tug to draw a curtain shut'], ['card', 'A stiff folded greeting for a birthday'],
    ] },
    { difficulty: 'fiendish', endClue: 'A secret word that lets you in', top: 'pass', bottom: 'word', middle: [
      ['past', 'The time that has already gone'], ['cast', 'The actors in a play'], ['cart', 'A small wagon you push'], ['card', 'A stiff folded greeting for a birthday'], ['cord', 'What you tug to draw a curtain shut'],
    ] },
    { difficulty: 'fiendish', endClue: 'The part of a shoe that covers the foot', top: 'foot', bottom: 'wear', middle: [
      ['boot', 'A sturdy shoe that covers the ankle'], ['boat', 'A small craft that travels on water'], ['beat', 'To strike repeatedly, or a rhythm'], ['bead', 'A small piece of glass or wood used in jewellery'], ['bear', 'A large, furry mammal'],
    ] },
    { difficulty: 'fiendish', endClue: 'A band of the earth that shares one clock', top: 'time', bottom: 'zone', middle: [
      ['tire', 'A rubber ring around a wheel'], ['fire', 'Heat and flames that give off light'], ['fore', 'The front part of something'], ['bore', 'To make a hole, or someone who is dull'], ['bone', 'A hard part of the body'],
    ] },
    { difficulty: 'fiendish', endClue: 'Made by hand rather than by machine', top: 'hand', bottom: 'made', middle: [
      ['band', 'A group of musicians or a strip of material'], ['bane', 'Something that causes great trouble'], ['bake', 'Turn dough into a loaf in the oven'], ['make', 'Create or build something'], ['mate', 'A friend or partner'],
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
    ladders: DEALS,
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
