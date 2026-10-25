(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, shuffle } = R;

  const BANK = [
    { name: 'Fruit', accept: ['fruit', 'fruits'], words: ['lychee', 'quince', 'fig', 'mango', 'pear', 'apple', 'banana', 'grape', 'orange', 'lemon', 'plum', 'cherry'] },
    { name: 'Colours', accept: ['colour', 'color', 'colours', 'colors'], words: ['scarlet', 'crimson', 'amber', 'violet', 'indigo', 'orange', 'purple', 'green', 'lemon', 'gold', 'plum', 'cherry'] },
    { name: 'Planets', accept: ['planet', 'planets'], words: ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'neptune', 'uranus', 'earth', 'pluto'] },
    { name: 'Metals', accept: ['metal', 'metals'], words: ['mercury', 'gold', 'silver', 'iron', 'copper', 'tin', 'zinc', 'nickel', 'bronze', 'lead'] },
    { name: 'Birds', accept: ['bird', 'birds'], words: ['robin', 'sparrow', 'eagle', 'heron', 'crane', 'swan', 'goose', 'duck', 'raven', 'crow', 'finch', 'wren'] },
    { name: 'Countries', accept: ['country', 'countries'], words: ['turkey', 'chad', 'jordan', 'georgia', 'peru', 'mali', 'togo', 'cuba', 'iran', 'laos', 'niger', 'benin'] },
    { name: 'Foods', accept: ['food', 'foods'], words: ['turkey', 'ham', 'stew', 'soup', 'bread', 'rice', 'pasta', 'salad', 'curry', 'toast', 'gravy', 'cider'] },
    { name: 'Instruments', accept: ['instrument', 'instruments', 'musical instrument', 'musical instruments'], words: ['organ', 'flute', 'piano', 'violin', 'cello', 'harp', 'drum', 'trumpet', 'oboe', 'banjo', 'lute', 'tuba'] },
    { name: 'The body', accept: ['body', 'the body', 'body parts', 'body part'], words: ['organ', 'heart', 'liver', 'ankle', 'elbow', 'thumb', 'spine', 'skull', 'wrist', 'palm', 'chest', 'femur'] },
    { name: 'Trees', accept: ['tree', 'trees'], words: ['cedar', 'birch', 'maple', 'olive', 'willow', 'aspen', 'alder', 'spruce', 'poplar', 'pine', 'fir', 'palm'] },
    { name: 'Flowers', accept: ['flower', 'flowers'], words: ['rose', 'tulip', 'daisy', 'lilac', 'iris', 'peony', 'poppy', 'pansy', 'violet', 'aster', 'lotus', 'phlox'] },
    { name: 'Weather', accept: ['weather'], words: ['rain', 'snow', 'hail', 'mist', 'fog', 'storm', 'sleet', 'drizzle', 'frost', 'thunder', 'breeze', 'gale'] },
    { name: 'Clothes', accept: ['clothes', 'clothing'], words: ['scarf', 'glove', 'boot', 'cloak', 'vest', 'shirt', 'skirt', 'coat', 'sock', 'belt', 'hat', 'cape'] },
    { name: 'Kitchen', accept: ['kitchen', 'kitchen tools', 'kitchenware'], words: ['spoon', 'knife', 'plate', 'bowl', 'oven', 'whisk', 'ladle', 'grater', 'kettle', 'mug', 'fork', 'pan'] },
    { name: 'Sports', accept: ['sport', 'sports'], words: ['tennis', 'rugby', 'golf', 'boxing', 'rowing', 'skiing', 'diving', 'fencing', 'archery', 'polo', 'judo', 'surfing'] },
    { name: 'Sea life', accept: ['sea life', 'sea creatures', 'ocean life', 'marine life'], words: ['whale', 'shark', 'otter', 'crab', 'squid', 'coral', 'kelp', 'seal', 'eel', 'clam', 'tuna', 'cod'] },
    { name: 'Yellow things', accept: ['yellow', 'yellow things', 'things that are yellow'], words: ['lemon', 'gold', 'butter', 'banana', 'corn', 'honey', 'amber', 'mustard', 'canary', 'daffodil', 'sulfur', 'sunflower'] },
    { name: 'Found in a kitchen', accept: ['kitchen', 'found in a kitchen', 'kitchen things'], words: ['spoon', 'knife', 'bread', 'butter', 'honey', 'lemon', 'apple', 'orange', 'plum', 'cherry', 'grape', 'kettle'] },
  ];

  function holders(word) {
    const hits = [];
    for (let i = 0; i < BANK.length; i++) if (BANK[i].words.indexOf(word) !== -1) hits.push(i);
    return hits;
  }

  function sole(words) {
    const hits = [];
    for (let i = 0; i < BANK.length; i++) {
      if (words.every((word) => BANK[i].words.indexOf(word) !== -1)) hits.push(i);
    }
    return hits;
  }

  function revealAt(words) {
    for (let k = 1; k <= words.length; k++) {
      if (sole(words.slice(0, k)).length === 1) return k;
    }
    return 99;
  }

  function combinations(list, k) {
    const out = [];
    const pick = (start, chosen) => {
      if (chosen.length === k) {
        out.push(chosen.slice());
        return;
      }
      for (let i = start; i < list.length; i++) {
        chosen.push(list[i]);
        pick(i + 1, chosen);
        chosen.pop();
      }
    };
    pick(0, []);
    return out;
  }

  function generate(difficulty, seed) {
    const target = difficulty === 'easy' ? 3 : difficulty === 'tricky' ? 4 : 5;
    const rng = makeRng(String(seed) + ':pinpoint:' + difficulty);
    const order = shuffle(rng, BANK.map((_, i) => i));
    const found = [];
    for (let i = 0; i < order.length; i++) {
      const cat = BANK[order[i]];
      const deals = shuffle(rng, combinations(cat.words, 5));
      let looked = 0;
      for (let d = 0; d < deals.length && looked < 48; d++) {
        looked++;
        const words = deals[d].slice().sort((a, b) => holders(b).length - holders(a).length || (a < b ? -1 : 1));
        if (holders(words[0]) < 2 || holders(words[1]) < 2) continue;
        if (revealAt(words) !== target) continue;
        if (sole(words).length !== 1 || sole(words)[0] !== order[i]) continue;
        found.push({
          game: 'pinpoint',
          difficulty,
          seed,
          category: cat.name,
          accept: [cat.name.toLowerCase()].concat(cat.accept),
          words,
          solution: cat.name,
        });
        break;
      }
    }
    if (!found.length) throw new Error('pinpoint: no unique puzzle');
    return found[Math.floor(rng() * found.length)];
  }

  return {
    id: 'pinpoint',
    name: 'Pinpoint',
    tagline: 'Name what the words share.',
    bank: BANK,
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
