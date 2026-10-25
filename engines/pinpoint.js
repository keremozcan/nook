(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, pick, shuffle } = R;

  // Each row is a complete, curated round; difficulty is editorial, based on
  // the directness of the shared connection rather than bank overlap counts.
  const BANK = [
    // Easy: familiar concrete categories.
    { difficulty: 'easy', name: 'Farm animals', accept: ['farm animal', 'farm animals', 'animals'], description: 'Animals commonly raised on a farm.', words: ['cow', 'horse', 'sheep', 'pig', 'goat'] },
    { difficulty: 'easy', name: 'Planets', accept: ['planet'], description: 'Planets in our solar system.', words: ['mercury', 'venus', 'earth', 'mars', 'jupiter'] },
    { difficulty: 'easy', name: 'Musical instruments', accept: ['instrument', 'instruments', 'musical instrument', 'musical instruments'], description: 'Things played to make music.', words: ['piano', 'flute', 'violin', 'drum', 'harp'] },
    { difficulty: 'easy', name: 'Kitchen utensils', accept: ['utensil', 'utensils', 'kitchen tools'], description: 'Tools used to prepare or eat food.', words: ['spoon', 'fork', 'whisk', 'ladle', 'spatula'] },
    { difficulty: 'easy', name: 'Garden flowers', accept: ['flower', 'flowers'], description: 'Flowers often grown in a garden.', words: ['rose', 'tulip', 'daisy', 'poppy', 'lily'] },
    { difficulty: 'easy', name: 'Weekdays', accept: ['weekday', 'working days', 'days'], description: 'The five days from Monday through Friday.', words: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { difficulty: 'easy', name: 'Birds', accept: ['bird', 'birds'], description: 'Common kinds of birds.', words: ['robin', 'sparrow', 'eagle', 'swan', 'parrot'] },
    { difficulty: 'easy', name: 'Sports', accept: ['sport', 'games'], description: 'Sports people play or compete in.', words: ['tennis', 'rugby', 'golf', 'rowing', 'boxing'] },
    { difficulty: 'easy', name: 'Weather words', accept: ['weather', 'types of weather'], description: 'Things you might see or feel in the weather.', words: ['rain', 'snow', 'hail', 'fog', 'wind'] },
    { difficulty: 'easy', name: 'Trees', accept: ['tree', 'trees'], description: 'Kinds of trees.', words: ['oak', 'birch', 'maple', 'willow', 'cedar'] },
    { difficulty: 'easy', name: 'Body parts', accept: ['body part', 'parts of the body'], description: 'Parts of a person’s body.', words: ['elbow', 'ankle', 'thumb', 'wrist', 'shoulder'] },
    { difficulty: 'easy', name: 'School supplies', accept: ['school supply', 'school supplies', 'stationery'], description: 'Things pupils commonly take to school.', words: ['pencil', 'ruler', 'eraser', 'notebook', 'crayon'] },
    { difficulty: 'easy', name: 'Citrus fruits', accept: ['citrus', 'citrus fruit', 'fruit', 'fruits'], description: 'Fruits in the citrus family.', words: ['orange', 'lemon', 'lime', 'grapefruit', 'tangerine'] },
    { difficulty: 'easy', name: 'Things with wheels', accept: ['vehicles', 'things that have wheels', 'wheels'], description: 'Vehicles that move on wheels.', words: ['bicycle', 'scooter', 'car', 'bus', 'wagon'] },

    // Tricky: common prefixes, suffixes and shared-word compounds.
    { difficulty: 'tricky', name: 'Words that can follow “rain”', accept: ['rain', 'rain words', 'words that start with rain'], description: 'Put rain before each clue to make a familiar word.', words: ['coat', 'bow', 'drop', 'fall', 'water'] },
    { difficulty: 'tricky', name: 'Words that can precede “house”', accept: ['house', 'house compounds', 'words that end with house'], description: 'Put house after each clue to make a familiar word.', words: ['bird', 'light', 'club', 'farm', 'green'] },
    { difficulty: 'tricky', name: 'Words that can follow “hand”', accept: ['hand', 'hand compounds', 'words that start with hand'], description: 'Put hand before each clue to make a familiar word.', words: ['shake', 'bag', 'made', 'rail', 'stand'] },
    { difficulty: 'tricky', name: 'Words that can precede “light”', accept: ['light', 'light compounds', 'words that end with light'], description: 'Put light after each clue to make a familiar word.', words: ['sun', 'day', 'star', 'moon', 'lamp'] },
    { difficulty: 'tricky', name: 'Things with a handle', accept: ['handled things', 'objects with handles', 'handles'], description: 'Each object can have a handle you hold.', words: ['mug', 'bucket', 'suitcase', 'umbrella', 'briefcase'] },
    { difficulty: 'tricky', name: 'Words that can follow “tooth”', accept: ['tooth', 'tooth compounds', 'words after tooth'], description: 'Put tooth before each word to make a familiar compound.', words: ['brush', 'paste', 'fairy', 'ache', 'pick'] },
    { difficulty: 'tricky', name: 'Words that can follow “snow”', accept: ['snow', 'snow compounds', 'words after snow'], description: 'Put snow before each word to make a familiar compound.', words: ['ball', 'flake', 'man', 'storm', 'drift'] },
    { difficulty: 'tricky', name: 'Words that can follow “foot”', accept: ['foot', 'foot compounds', 'words after foot'], description: 'Put foot before each word to make a familiar word or phrase.', words: ['ball', 'print', 'step', 'path', 'stool'] },
    { difficulty: 'tricky', name: 'Words with a silent “k”', accept: ['silent k', 'silent k words', 'words with silent k'], description: 'The k is written but not spoken at the start.', words: ['knee', 'knife', 'knock', 'knit', 'know'] },
    { difficulty: 'tricky', name: 'Words with a silent “w”', accept: ['silent w', 'silent w words', 'words with silent w'], description: 'The w is written but not spoken at the start.', words: ['write', 'wrong', 'wrist', 'wren', 'wrap'] },
    { difficulty: 'tricky', name: 'Words that can follow “star”', accept: ['star', 'star compounds', 'words after star'], description: 'Put star before each word to make a familiar compound.', words: ['fish', 'light', 'dust', 'ship', 'fruit'] },
    { difficulty: 'tricky', name: 'Words that can precede “berry”', accept: ['berry', 'berries', 'berry words'], description: 'Put berry after each clue to name a familiar fruit.', words: ['blue', 'straw', 'black', 'goose', 'elder'] },
    { difficulty: 'tricky', name: 'Words that can follow “book”', accept: ['book', 'book compounds', 'words after book'], description: 'Put book before each word to make a familiar word or phrase.', words: ['shelf', 'mark', 'worm', 'case', 'club'] },

    // Fiendish: less direct compounds and letter patterns; still child-safe.
    { difficulty: 'fiendish', name: 'Words that can follow “ever”', accept: ['ever', 'ever compounds', 'words after ever'], description: 'Put ever before each word to make a familiar word.', words: ['green', 'lasting', 'more', 'present', 'changing'] },
    { difficulty: 'fiendish', name: 'Words that can follow “over”', accept: ['over', 'over compounds', 'words after over'], description: 'Put over before each word to make a familiar word.', words: ['board', 'due', 'time', 'load', 'coat'] },
    { difficulty: 'fiendish', name: 'Words that can follow “under”', accept: ['under', 'under compounds', 'words after under'], description: 'Put under before each word to make a familiar word.', words: ['water', 'ground', 'line', 'stand', 'pass'] },
    { difficulty: 'fiendish', name: 'Words that can follow “some”', accept: ['some', 'some compounds', 'words after some'], description: 'Put some before each word to make a familiar word.', words: ['where', 'what', 'how', 'times', 'body'] },
    { difficulty: 'fiendish', name: 'Words that can follow “any”', accept: ['any', 'any compounds', 'words after any'], description: 'Put any before each word to make a familiar word.', words: ['where', 'thing', 'more', 'way', 'one'] },
    { difficulty: 'fiendish', name: 'Words containing “light”', accept: ['light', 'light words', 'words with light'], description: 'Each word contains the letters light in that order.', words: ['highlight', 'flightless', 'moonlight', 'slightly', 'delightful'] },
    { difficulty: 'fiendish', name: 'Words containing “rain”', accept: ['rain', 'rain words', 'words with rain'], description: 'Each word contains rain in that order.', words: ['rainbow', 'brain', 'train', 'drain', 'brainstorm'] },
    { difficulty: 'fiendish', name: 'Words that can follow “water”', accept: ['water', 'water compounds', 'words after water'], description: 'Put water before each word to make a familiar compound.', words: ['fall', 'melon', 'proof', 'wheel', 'colour'] },
    { difficulty: 'fiendish', name: 'Words that can follow “cross”', accept: ['cross', 'cross compounds', 'words after cross'], description: 'Put cross before each clue to make a familiar word.', words: ['word', 'roads', 'walk', 'bow', 'fire'] },
    { difficulty: 'fiendish', name: 'Words that can follow “day”', accept: ['day', 'day compounds', 'words after day'], description: 'Put day before each word to make a familiar compound.', words: ['break', 'dream', 'light', 'time', 'care'] },
    { difficulty: 'fiendish', name: 'Words that can follow “back”', accept: ['back', 'back compounds', 'words after back'], description: 'Put back before each word to make a familiar word or phrase.', words: ['pack', 'yard', 'drop', 'bone', 'ground'] },
    { difficulty: 'fiendish', name: 'Words that can follow “fire”', accept: ['fire', 'fire compounds', 'words after fire'], description: 'Put fire before each word to make a familiar compound.', words: ['fly', 'wood', 'place', 'work', 'fighter'] },
  ];

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
      words: shuffle(rng, cat.words),
      solution: cat.name,
    };
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
