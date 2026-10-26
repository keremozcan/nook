(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.NOOK_ENGINES = root.NOOK_ENGINES || {})[api.id] = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const R = (typeof module === 'object' && module.exports) ? require('./rng.js') : globalThis.NOOK_RNG;
  const { makeRng, shuffle, int, pick } = R;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const CAST = [
    ['ada', 'Ada'],
    ['bo', 'Bo'],
    ['noor', 'Noor'],
    ['leo', 'Leo'],
    ['hana', 'Hana'],
    ['jules', 'Jules'],
  ];
  const ROOM_BOOK = [
    ['library', 'Library'],
    ['kitchen', 'Kitchen'],
    ['garden', 'Garden'],
    ['study', 'Study'],
    ['hall', 'Hall'],
    ['attic', 'Attic'],
  ];
  const BLOCKS = ['plant', 'table', 'bookshelf', 'statue'];
  const SEATS = ['chair', 'armchair', 'sofa', 'rug'];
  const ORDINAL = ['', 'second', 'third', 'fourth', 'fifth'];

  function linePhrase(index, n, kind) {
    const edgeA = kind === 'row' ? 'the top row' : 'the left column';
    const edgeB = kind === 'row' ? 'the bottom row' : 'the right column';
    if (index === 0) return edgeA;
    if (index === n - 1) return edgeB;
    return 'the ' + ORDINAL[index] + ' ' + (kind === 'row' ? 'row' : 'column');
  }

  function article(word) {
    return 'aeiou'.indexOf(word[0]) === -1 ? 'a' : 'an';
  }

  function growRooms(n, roomCount, rng) {
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);
    const shuffled = shuffle(rng, cells);
    const seeds = [];
    for (const cell of shuffled) {
      if (seeds.every((s) => Math.abs(s[0] - cell[0]) + Math.abs(s[1] - cell[1]) >= 2)) seeds.push(cell);
      if (seeds.length === roomCount) break;
    }
    for (const cell of shuffled) {
      if (seeds.length === roomCount) break;
      if (!seeds.some((s) => s[0] === cell[0] && s[1] === cell[1])) seeds.push(cell);
    }
    const room = Array.from({ length: n }, () => Array(n).fill(-1));
    seeds.forEach((cell, i) => {
      room[cell[0]][cell[1]] = i;
    });
    let empty = n * n - seeds.length;
    let spins = 0;
    while (empty > 0 && spins < n * n * n * 6) {
      spins++;
      const id = int(rng, 0, roomCount - 1);
      const options = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (room[r][c] !== id) continue;
          for (const [dr, dc] of DIRS) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && cc >= 0 && rr < n && cc < n && room[rr][cc] < 0) options.push([rr, cc]);
          }
        }
      }
      if (!options.length) continue;
      const choice = options[int(rng, 0, options.length - 1)];
      room[choice[0]][choice[1]] = id;
      empty--;
    }
    return empty === 0 ? room : null;
  }

  function placePeople(n, room, blocked, rng) {
    const rowOrder = shuffle(rng, Array.from({ length: n }, (_, i) => i));
    const colOrder = shuffle(rng, Array.from({ length: n }, (_, i) => i));
    const rows = Array(n).fill(false);
    const cols = Array(n).fill(false);
    const pos = Array(n);
    function okVictim() {
      const vr = pos[0][0];
      const vc = pos[0][1];
      const id = room[vr][vc];
      let share = 0;
      for (let i = 0; i < n; i++) if (room[pos[i][0]][pos[i][1]] === id) share++;
      return share === 2;
    }
    function bt(i) {
      if (i === n) return okVictim();
      for (const r of rowOrder) {
        if (rows[r]) continue;
        for (const c of colOrder) {
          if (cols[c] || blocked[r][c]) continue;
          rows[r] = cols[c] = true;
          pos[i] = [r, c];
          if (bt(i + 1)) return true;
          rows[r] = cols[c] = false;
        }
      }
      return false;
    }
    return bt(0) ? pos : null;
  }

  function countSolutions(puzzle, limit) {
    const n = puzzle.n;
    const people = puzzle.people;
    const blocked = Array.from({ length: n }, () => Array(n).fill(false));
    for (const o of puzzle.objects) if (o.blocks) blocked[o.r][o.c] = true;
    const victim = people.find((p) => p.role === 'victim');
    let found = 0;
    let nodes = 0;
    const rowUsed = Array(n).fill(false);
    const colUsed = Array(n).fill(false);
    const pos = {};
    function holds(clue, r, c, occupancy) {
      let ok = false;
      if (clue.kind === 'room') ok = puzzle.roomOf[r][c] === clue.roomId;
      else if (clue.kind === 'row') ok = r === clue.index;
      else if (clue.kind === 'col') ok = c === clue.index;
      else if (clue.kind === 'object') {
        ok = puzzle.objects.some((o) => o.r === r && o.c === c && o.kind === clue.object && !o.blocks);
      } else if (clue.kind === 'beside') {
        const id = puzzle.roomOf[r][c];
        ok = DIRS.some(([dr, dc]) => {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n || puzzle.roomOf[rr][cc] !== id) return false;
          return puzzle.objects.some((o) => o.r === rr && o.c === cc && o.kind === clue.object);
        });
      } else if (clue.kind === 'alone') {
        if (!occupancy) return true;
        const roomId = puzzle.roomOf[r][c];
        let share = 0;
        for (const cell of Object.values(occupancy)) {
          if (puzzle.roomOf[cell[0]][cell[1]] === roomId) share++;
        }
        ok = share === 1;
      }
      return clue.negate ? !ok : ok;
    }
    function bt(i) {
      if (found >= limit || found < 0) return;
      if (++nodes > 500000) {
        found = -1;
        return;
      }
      if (i === people.length) {
        const cell = pos[victim.id];
        const roomId = puzzle.roomOf[cell[0]][cell[1]];
        let share = 0;
        for (const p of people) {
          const at = pos[p.id];
          if (puzzle.roomOf[at[0]][at[1]] === roomId) share++;
        }
        if (share !== 2) return;
        for (const clue of puzzle.clues) {
          if (clue.kind !== 'alone') continue;
          const at = pos[clue.personId];
          if (!holds(clue, at[0], at[1], pos)) return;
        }
        found++;
        return;
      }
      const person = people[i];
      for (let r = 0; r < n; r++) {
        if (rowUsed[r]) continue;
        for (let c = 0; c < n; c++) {
          if (colUsed[c] || blocked[r][c]) continue;
          let ok = true;
          for (const clue of puzzle.clues) {
            if (clue.personId !== person.id || clue.kind === 'alone') continue;
            if (!holds(clue, r, c, null)) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          rowUsed[r] = colUsed[c] = true;
          pos[person.id] = [r, c];
          bt(i + 1);
          delete pos[person.id];
          rowUsed[r] = colUsed[c] = false;
          if (found >= limit || found < 0) return;
        }
      }
    }
    bt(0);
    return found;
  }

  function clueText(person, clue, rooms) {
    const name = person.name;
    if (clue.kind === 'room') {
      const room = rooms.find((item) => item.id === clue.roomId);
      return clue.negate ? name + ' was not in the ' + room.name + '.' : name + ' was in the ' + room.name + '.';
    }
    if (clue.kind === 'row' || clue.kind === 'col') {
      const phrase = linePhrase(clue.index, clue.n, clue.kind);
      return clue.negate ? name + ' was not in ' + phrase + '.' : name + ' was in ' + phrase + '.';
    }
    if (clue.kind === 'object') {
      return clue.negate
        ? name + ' was not on ' + article(clue.object) + ' ' + clue.object + '.'
        : name + ' was on ' + article(clue.object) + ' ' + clue.object + '.';
    }
    if (clue.kind === 'beside') {
      return clue.negate
        ? name + ' was not beside ' + article(clue.object) + ' ' + clue.object + ' in the same room.'
        : name + ' was beside ' + article(clue.object) + ' ' + clue.object + ' in the same room.';
    }
    return clue.negate ? name + ' was not alone.' : name + ' was alone.';
  }

  function generate(difficulty, seed) {
    const n = difficulty === 'easy' ? 4 : difficulty === 'tricky' ? 5 : 6;
    const roomCount = n === 6 ? 4 : 3;
    for (let attempt = 0; attempt < 30; attempt++) {
      const rng = makeRng(String(seed) + ':murdoku:' + difficulty + ':' + attempt);
      const grown = growRooms(n, roomCount, rng);
      if (!grown) continue;
      const book = shuffle(rng, ROOM_BOOK).slice(0, roomCount);
      const roomOf = grown.map((row) => row.map((id) => book[id][0]));
      const rooms = book.map(([id, name]) => ({ id, name }));
      const cast = shuffle(rng, CAST).slice(0, n);
      const people = cast.map(([id, name], i) => ({ id, name, role: i === 0 ? 'victim' : 'suspect' }));
      const blocked = Array.from({ length: n }, () => Array(n).fill(false));
      const positions = placePeople(n, roomOf, blocked, rng);
      if (!positions) continue;
      const objects = [];
      const occupied = new Set(positions.map((cell) => cell[0] + ',' + cell[1]));
      people.forEach((person, i) => {
        if (rng() < 0.55) {
          const cell = positions[i];
          objects.push({ r: cell[0], c: cell[1], kind: pick(rng, SEATS), blocks: false });
        }
      });
      const blockers = shuffle(rng, BLOCKS).slice(0, 2);
      for (const kind of blockers) {
        const spots = [];
        for (let i = 0; i < n; i++) {
          const [r, c] = positions[i];
          const id = roomOf[r][c];
          for (const [dr, dc] of DIRS) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
            if (roomOf[rr][cc] !== id) continue;
            const key = rr + ',' + cc;
            if (occupied.has(key)) continue;
            if (objects.some((o) => o.r === rr && o.c === cc)) continue;
            spots.push([rr, cc]);
          }
        }
        if (!spots.length) continue;
        const spot = pick(rng, spots);
        objects.push({ r: spot[0], c: spot[1], kind, blocks: true });
        blocked[spot[0]][spot[1]] = true;
      }
      if (objects.some((o) => o.blocks && occupied.has(o.r + ',' + o.c))) continue;
      const victimRoom = roomOf[positions[0][0]][positions[0][1]];
      let killerId = null;
      for (let i = 1; i < n; i++) {
        if (roomOf[positions[i][0]][positions[i][1]] === victimRoom) killerId = people[i].id;
      }
      if (!killerId) continue;
      const pool = [];
      const push = (person, partial) => {
        const clue = Object.assign({ personId: person.id, n }, partial);
        clue.text = clueText(person, clue, rooms);
        delete clue.n;
        pool.push(clue);
      };
      people.forEach((person, i) => {
        const [r, c] = positions[i];
        push(person, { kind: 'row', negate: false, index: r });
        push(person, { kind: 'col', negate: false, index: c });
        for (let rr = 0; rr < n; rr++) if (rr !== r) push(person, { kind: 'row', negate: true, index: rr });
        push(person, { kind: 'room', negate: false, roomId: roomOf[r][c] });
        for (const room of rooms) {
          if (room.id !== roomOf[r][c]) push(person, { kind: 'room', negate: true, roomId: room.id });
        }
        const seat = objects.find((o) => !o.blocks && o.r === r && o.c === c);
        if (seat) push(person, { kind: 'object', negate: false, object: seat.kind });
        for (const kind of SEATS) {
          if (!seat || seat.kind !== kind) push(person, { kind: 'object', negate: true, object: kind });
        }
        for (const kind of BLOCKS.concat(SEATS)) {
          const yes = DIRS.some(([dr, dc]) => {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= n || cc >= n || roomOf[rr][cc] !== roomOf[r][c]) return false;
            return objects.some((o) => o.r === rr && o.c === cc && o.kind === kind);
          });
          if (yes) push(person, { kind: 'beside', negate: false, object: kind });
        }
        const alone = positions.filter((cell) => roomOf[cell[0]][cell[1]] === roomOf[r][c]).length === 1;
        push(person, { kind: 'alone', negate: !alone });
      });
      const puzzle = {
        game: 'murdoku',
        difficulty,
        seed,
        n,
        rooms,
        roomOf,
        objects,
        people,
        clues: [],
        solution: {
          positions: Object.fromEntries(people.map((p, i) => [p.id, positions[i]])),
          killerId,
        },
      };
      const order = shuffle(rng, pool);
      const weight = (clue) => {
        if (clue.kind === 'beside' || clue.kind === 'object') return clue.negate ? 2 : 0;
        if (clue.kind === 'room' || clue.kind === 'alone') return clue.negate ? 3 : 1;
        return clue.negate ? 4 : 5;
      };
      const ranked = difficulty === 'fiendish' ? order : order.slice().sort((a, b) => weight(a) - weight(b));
      for (const clue of ranked) {
        if (puzzle.clues.length >= n + 2 && countSolutions(puzzle, 2) === 1) break;
        puzzle.clues.push(clue);
        const found = countSolutions(puzzle, 2);
        if (found === 0 || found < 0) puzzle.clues.pop();
      }
      if (countSolutions(puzzle, 2) !== 1) continue;
      for (let i = 0; i < puzzle.clues.length; i++) {
        const removed = puzzle.clues[i];
        puzzle.clues.splice(i, 1);
        const found = countSolutions(puzzle, 2);
        if (found !== 1 || puzzle.clues.length < n) {
          puzzle.clues.splice(i, 0, removed);
        } else {
          i--;
        }
      }
      if (puzzle.clues.length < n) {
        for (const clue of order) {
          if (puzzle.clues.some((have) => have.kind === clue.kind && have.personId === clue.personId && have.negate === clue.negate && have.index === clue.index && have.roomId === clue.roomId && have.object === clue.object)) continue;
          puzzle.clues.push(clue);
          if (puzzle.clues.length >= n && countSolutions(puzzle, 2) === 1) break;
        }
      }
      if (puzzle.clues.length < n) continue;
      if (countSolutions(puzzle, 2) !== 1) continue;
      const direct = people.every((p) => {
        const row = puzzle.clues.some((c) => c.personId === p.id && c.kind === 'row' && !c.negate);
        const col = puzzle.clues.some((c) => c.personId === p.id && c.kind === 'col' && !c.negate);
        return row && col;
      });
      if (direct) continue;
      if (difficulty !== 'fiendish') {
        const positive = puzzle.clues.filter((clue) => !clue.negate).length;
        if (positive * 2 < puzzle.clues.length) continue;
      }
      return puzzle;
    }
    throw new Error('murdoku: no unique puzzle');
  }

  return {
    id: 'murdoku',
    name: 'Murdoku',
    tagline: 'A quiet house. One person stayed behind.',
    difficulties: [
      { id: 'easy', label: 'Easy' },
      { id: 'tricky', label: 'Tricky' },
      { id: 'fiendish', label: 'Fiendish' },
    ],
    generate,
  };
});
