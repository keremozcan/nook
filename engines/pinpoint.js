(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, pick } = R;

  // Answers for "put X before each clue" rounds.
  function after(word, extra) {
    return [word, word + ' words', word + ' compounds', 'words after ' + word, 'words that follow ' + word,
      'words that start with ' + word, 'words starting with ' + word, 'starts with ' + word].concat(extra || []);
  }

  // Answers for "put X after each clue" rounds.
  function before(word, extra) {
    return [word, word + ' words', word + ' compounds', 'words before ' + word, 'words that go before ' + word,
      'words that end with ' + word, 'words ending with ' + word, 'ends with ' + word].concat(extra || []);
  }

  // Answers for "each clue contains X" rounds.
  function inside(word) {
    return [word, word + ' words', 'words with ' + word, 'words containing ' + word, 'contains ' + word,
      'hidden ' + word, word + ' inside', word + ' in every word'];
  }

  // Each round is curated by hand. Words are in the order they are shown: the first is the
  // least revealing, often fitting another idea, and each one narrows it further.
  const BANK = [
    // Easy: familiar things.
    { difficulty: 'easy', name: 'Farm animals', accept: ['farm animal', 'farmyard animals', 'livestock'], description: 'Animals raised on a farm.', words: ['horse', 'goat', 'pig', 'sheep', 'cow'] },
    { difficulty: 'easy', name: 'Planets', accept: ['planet', 'solar system', 'planets in the solar system'], description: 'Planets in our solar system.', words: ['mercury', 'earth', 'mars', 'venus', 'jupiter'] },
    { difficulty: 'easy', name: 'Musical instruments', accept: ['instrument', 'instruments', 'musical instrument', 'things you play music on'], description: 'Things played to make music.', words: ['drum', 'flute', 'harp', 'piano', 'violin'] },
    { difficulty: 'easy', name: 'Kitchen utensils', accept: ['utensil', 'utensils', 'kitchen tools', 'cooking tools', 'cooking utensils', 'kitchen equipment'], description: 'Tools used to prepare or serve food.', words: ['fork', 'spoon', 'whisk', 'spatula', 'ladle'] },
    { difficulty: 'easy', name: 'Garden flowers', accept: ['flower', 'flowers'], description: 'Flowers often grown in a garden. The first few are girls’ names too.', words: ['rose', 'lily', 'daisy', 'poppy', 'tulip'] },
    { difficulty: 'easy', name: 'Weekdays', accept: ['weekday', 'week days', 'working days', 'school days', 'days', 'days of the week'], description: 'The five days from Monday to Friday.', words: ['wednesday', 'friday', 'tuesday', 'thursday', 'monday'] },
    { difficulty: 'easy', name: 'Birds', accept: ['bird', 'types of bird'], description: 'Common kinds of bird.', words: ['robin', 'swan', 'eagle', 'parrot', 'sparrow'] },
    { difficulty: 'easy', name: 'Sports', accept: ['sport', 'games', 'olympic sports'], description: 'Sports people play or compete in.', words: ['boxing', 'rowing', 'golf', 'rugby', 'tennis'] },
    { difficulty: 'easy', name: 'Weather words', accept: ['weather', 'types of weather', 'weather types'], description: 'Things you might see or feel in the weather.', words: ['hail', 'wind', 'fog', 'snow', 'rain'] },
    { difficulty: 'easy', name: 'Trees', accept: ['tree', 'types of tree', 'wood', 'types of wood'], description: 'Kinds of tree.', words: ['willow', 'cedar', 'maple', 'birch', 'oak'] },
    { difficulty: 'easy', name: 'Body parts', accept: ['body part', 'parts of the body', 'parts of your body'], description: 'Parts of a person’s body.', words: ['shoulder', 'elbow', 'thumb', 'wrist', 'ankle'] },
    { difficulty: 'easy', name: 'School supplies', accept: ['school supply', 'stationery', 'stationary', 'school things', 'school equipment'], description: 'Things pupils take to school.', words: ['ruler', 'notebook', 'scissors', 'crayon', 'pencil'] },
    { difficulty: 'easy', name: 'Citrus fruits', accept: ['citrus', 'citrus fruit', 'fruit'], description: 'Fruits in the citrus family.', words: ['orange', 'lime', 'lemon', 'tangerine', 'grapefruit'] },
    { difficulty: 'easy', name: 'Things with wheels', accept: ['vehicles', 'transport', 'wheels', 'wheeled things', 'things that have wheels'], description: 'Things that move on wheels.', words: ['wagon', 'scooter', 'bus', 'car', 'bicycle'] },

    // Tricky: shared words, letter patterns and everyday objects.
    { difficulty: 'tricky', name: 'Words that can follow “rain”', accept: after('rain'), description: 'Put rain before each clue to make a familiar word.', words: ['fall', 'water', 'bow', 'drop', 'coat'] },
    { difficulty: 'tricky', name: 'Words that can go before “house”', accept: before('house'), description: 'Put house after each clue to make a familiar word.', words: ['club', 'bird', 'farm', 'light', 'green'] },
    { difficulty: 'tricky', name: 'Words that can follow “hand”', accept: after('hand'), description: 'Put hand before each clue to make a familiar word.', words: ['stand', 'rail', 'made', 'bag', 'shake'] },
    { difficulty: 'tricky', name: 'Words that can go before “light”', accept: before('light'), description: 'Put light after each clue to make a familiar word.', words: ['day', 'star', 'moon', 'sun', 'lamp'] },
    { difficulty: 'tricky', name: 'Things with a handle', accept: ['handle', 'handles', 'things with handles', 'things that have a handle', 'objects with handles'], description: 'Each one has a handle you hold.', words: ['umbrella', 'bucket', 'suitcase', 'mug', 'briefcase'] },
    { difficulty: 'tricky', name: 'Words that can follow “tooth”', accept: after('tooth', ['teeth']), description: 'Put tooth before each clue to make a familiar word.', words: ['pick', 'fairy', 'brush', 'ache', 'paste'] },
    { difficulty: 'tricky', name: 'Words that can follow “snow”', accept: after('snow'), description: 'Put snow before each clue to make a familiar word.', words: ['ball', 'man', 'storm', 'drift', 'flake'] },
    { difficulty: 'tricky', name: 'Words that can follow “foot”', accept: after('foot', ['feet']), description: 'Put foot before each clue to make a familiar word.', words: ['stool', 'path', 'print', 'step', 'ball'] },
    { difficulty: 'tricky', name: 'Words with a silent “k”', accept: ['silent k', 'silent k words', 'words with silent k', 'kn', 'kn words', 'words starting with kn', 'words beginning with kn', 'starts with kn'], description: 'Each starts with a k that is written but not spoken.', words: ['know', 'knit', 'knock', 'knife', 'knee'] },
    { difficulty: 'tricky', name: 'Words with a silent “w”', accept: ['silent w', 'silent w words', 'words with silent w', 'wr', 'wr words', 'words starting with wr', 'words beginning with wr', 'starts with wr'], description: 'Each starts with a w that is written but not spoken.', words: ['wrong', 'write', 'wrap', 'wrist', 'wren'] },
    { difficulty: 'tricky', name: 'Words that can follow “star”', accept: after('star'), description: 'Put star before each clue to make a familiar word.', words: ['light', 'ship', 'fruit', 'dust', 'fish'] },
    { difficulty: 'tricky', name: 'Words that can go before “berry”', accept: before('berry', ['berries', 'types of berry']), description: 'Put berry after each clue to name a fruit.', words: ['black', 'blue', 'elder', 'goose', 'straw'] },
    { difficulty: 'tricky', name: 'Words that can follow “book”', accept: after('book'), description: 'Put book before each clue to make a familiar word.', words: ['club', 'case', 'mark', 'worm', 'shelf'] },

    // Fiendish: less direct shared words and hidden letters.
    { difficulty: 'fiendish', name: 'Words that can follow “out”', accept: after('out'), description: 'Put out before each clue to make a familiar word.', words: ['come', 'side', 'fit', 'line', 'break'] },
    { difficulty: 'fiendish', name: 'Words that can follow “over”', accept: after('over'), description: 'Put over before each clue to make a familiar word.', words: ['board', 'time', 'coat', 'load', 'due'] },
    { difficulty: 'fiendish', name: 'Words that can follow “under”', accept: after('under'), description: 'Put under before each clue to make a familiar word.', words: ['water', 'line', 'pass', 'ground', 'stand'] },
    { difficulty: 'fiendish', name: 'Words that can follow “some”', accept: after('some'), description: 'Put some before each clue to make a familiar word.', words: ['body', 'where', 'how', 'what', 'times'] },
    { difficulty: 'fiendish', name: 'Words that can follow “any”', accept: after('any'), description: 'Put any before each clue to make a familiar word.', words: ['one', 'thing', 'where', 'way', 'body'] },
    { difficulty: 'fiendish', name: 'Words containing “light”', accept: inside('light'), description: 'Each word has light hidden inside it.', words: ['slightly', 'delightful', 'flightless', 'highlight', 'moonlight'] },
    { difficulty: 'fiendish', name: 'Words containing “rain”', accept: inside('rain'), description: 'Each word has rain hidden inside it.', words: ['train', 'brain', 'drain', 'brainstorm', 'rainbow'] },
    { difficulty: 'fiendish', name: 'Words that can follow “water”', accept: after('water'), description: 'Put water before each clue to make a familiar word.', words: ['fall', 'proof', 'wheel', 'colour', 'melon'] },
    { difficulty: 'fiendish', name: 'Words that can follow “cross”', accept: after('cross'), description: 'Put cross before each clue to make a familiar word.', words: ['bow', 'fire', 'word', 'bar', 'roads'] },
    { difficulty: 'fiendish', name: 'Words that can follow “day”', accept: after('day'), description: 'Put day before each clue to make a familiar word.', words: ['time', 'light', 'break', 'care', 'dream'] },
    { difficulty: 'fiendish', name: 'Words that can follow “back”', accept: after('back'), description: 'Put back before each clue to make a familiar word.', words: ['ground', 'drop', 'hand', 'bone', 'pack'] },
    { difficulty: 'fiendish', name: 'Words that can follow “fire”', accept: after('fire'), description: 'Put fire before each clue to make a familiar word.', words: ['work', 'wood', 'place', 'fly', 'fighter'] },
  ];

  function singular(word) {
    if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (/(sses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }

  // Lower case, no punctuation, no articles, every word singular.
  function normalize(text) {
    return String(text || '').toLowerCase()
      .replace(/['‘’]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter((word) => word && word !== 'a' && word !== 'an' && word !== 'the')
      .map(singular)
      .join(' ');
  }

  function matches(puzzle, text) {
    const guess = normalize(text);
    return Boolean(guess) && puzzle.accept.some((answer) => normalize(answer) === guess);
  }

  function generate(difficulty, seed) {
    const candidates = BANK.filter((entry) => entry.difficulty === difficulty);
    if (!candidates.length) throw new Error('pinpoint: no categories for ' + difficulty);
    const rng = makeRng(String(seed) + ':pinpoint:' + difficulty);
    const cat = pick(rng, candidates);
    return {
      game: 'pinpoint', difficulty, seed,
      category: cat.name,
      description: cat.description,
      accept: [cat.name.toLowerCase()].concat(cat.accept),
      words: cat.words.slice(),
      solution: cat.name,
    };
  }

  return {
    id: 'pinpoint',
    name: 'Pinpoint',
    bank: BANK,
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    matches,
    generate,
  };
});
