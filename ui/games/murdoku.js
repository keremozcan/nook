/* Murdoku: place everyone, read the slips, find who shared the victim's room. */
(function () {
  const UI = window.NOOK_UI;
  const esc = UI.esc;

  const COPY = {
    verb: 'Find who did it',
    rule: 'One person in each row and each column, never on hatched furniture. Every slip is true. The victim shared a room with exactly one other person: that person did it.',
    how: [
      'Place everyone on the board. Each row and each column holds exactly one person.',
      'Hatched squares hold big furniture, like a table or a bookshelf. Nobody can stand there.',
      'Every slip is true. “On a chair” means standing on that chair’s square.',
      '“Beside” means in a square that shares a side with it, inside the same room. Squares that only touch at a corner are not beside.',
      '“Alone” means nobody else was in that room.',
      'The victim was in a room with exactly one other person. That person did it.',
      'Tap a name, then tap a square to place them. Tap their token again to pick them up.',
      'Keyboard: Tab to a name and press Enter, then use the arrow keys and Space to place them.'
    ],
    who: function (name) { return 'Where was ' + name + '? Tap a square.'; },
    choose: 'Tap a name, then a square.',
    blocked: function (kind) { return 'Nobody can stand on the ' + kind + '.'; },
    taken: 'Someone is already in that row or column.',
    allIn: 'Everyone is placed, but a slip isn’t true yet.',
    clash: 'A slip isn’t true for someone marked.',
    victim: 'victim',
    people: 'People',
    slips: 'Slips',
    legend: 'Key',
    legendBlocked: 'Hatched: blocked, nobody stands here',
    legendSeat: 'Plain: you can stand here',
    wonLine: function (killer, victim, room) { return 'It was <b>' + esc(killer) + '</b>. They were in the ' + esc(room) + ' with ' + esc(victim) + '.'; }
  };

  function victimOf(p) { return p.people.find(function (x) { return x.role === 'victim'; }); }
  function objectAt(p, r, c) { return (p.objects || []).find(function (o) { return o.r === r && o.c === c; }); }
  function blocked(p, r, c) { const o = objectAt(p, r, c); return !!(o && o.blocks); }
  function personAt(p, play, r, c) {
    return p.people.find(function (x) { const at = play.pos[x.id]; return at && at[0] === r && at[1] === c; });
  }
  function initials(p) {
    const out = {};
    p.people.forEach(function (x) {
      let len = 1;
      while (p.people.some(function (y) { return y !== x && y.name.slice(0, len) === x.name.slice(0, len); }) && len < x.name.length) len++;
      out[x.id] = x.name.slice(0, len);
    });
    return out;
  }
  function holds(p, play, clue, r, c) {
    const n = p.n;
    let ok;
    if (clue.kind === 'room') ok = p.roomOf[r][c] === clue.roomId;
    else if (clue.kind === 'row') ok = r === clue.index;
    else if (clue.kind === 'col') ok = c === clue.index;
    else if (clue.kind === 'object') ok = p.objects.some(function (o) { return o.r === r && o.c === c && o.kind === clue.object && !o.blocks; });
    else if (clue.kind === 'beside') {
      ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) {
        const rr = r + d[0];
        const cc = c + d[1];
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || p.roomOf[rr][cc] !== p.roomOf[r][c]) return false;
        return p.objects.some(function (o) { return o.r === rr && o.c === cc && o.kind === clue.object; });
      });
    } else if (clue.kind === 'alone') {
      if (Object.keys(play.pos).length < p.people.length) return true;
      let share = 0;
      p.people.forEach(function (x) { const at = play.pos[x.id]; if (at && p.roomOf[at[0]][at[1]] === p.roomOf[r][c]) share++; });
      ok = share === 1;
    } else return true;
    return clue.negate ? !ok : ok;
  }
  function wrongPeople(p, play) {
    const out = {};
    p.people.forEach(function (x) {
      const at = play.pos[x.id];
      if (!at) return;
      if (p.clues.some(function (clue) { return clue.personId === x.id && !holds(p, play, clue, at[0], at[1]); })) out[x.id] = true;
    });
    return out;
  }
  function nextUnplaced(p, play, after) {
    const list = p.people;
    const start = Math.max(0, list.findIndex(function (x) { return x.id === after; }));
    for (let i = 1; i <= list.length; i++) {
      const x = list[(start + i) % list.length];
      if (!play.pos[x.id]) return x.id;
    }
    return after;
  }

  UI.register({
    id: 'murdoku',
    copy: COPY,
    check: true,
    side: true,
    art: '<svg viewBox="0 0 64 48" aria-hidden="true"><rect class="rm0" x="4" y="4" width="34" height="40"/><rect class="rm1" x="38" y="4" width="22" height="22"/><rect class="rm2" x="38" y="26" width="22" height="18"/><rect class="a-hatch" x="44" y="30" width="10" height="10"/><path class="a-edge" d="M4 4h56v40H4zM38 4v40M38 26h22"/><circle class="a-victim" cx="20" cy="22" r="7"/><circle class="a-token" cx="49" cy="15" r="5"/></svg>',
    levelNote: function (p) { return p.n + '×' + p.n + ' house · ' + p.people.length + ' people · ' + p.rooms.length + ' rooms'; },
    fresh: function () { return { pos: {} }; },
    solved: function (p, play) {
      return p.people.every(function (x) { const a = play.pos[x.id]; const b = p.solution.positions[x.id]; return a && a[0] === b[0] && a[1] === b[1]; });
    },
    hint: function (p, play, ctx) {
      for (let i = 0; i < p.people.length; i++) {
        const x = p.people[i];
        const want = p.solution.positions[x.id];
        const have = play.pos[x.id];
        if (have && have[0] === want[0] && have[1] === want[1]) continue;
        p.people.forEach(function (o) {
          const at = play.pos[o.id];
          if (o.id !== x.id && at && (at[0] === want[0] || at[1] === want[1])) delete play.pos[o.id];
        });
        play.pos[x.id] = [want[0], want[1]];
        if (ctx) ctx.ui.selected = nextUnplaced(p, play, x.id);
        return;
      }
    },
    status: function (ctx) {
      const p = ctx.puzzle;
      const play = ctx.play;
      if (ctx.check && Object.keys(wrongPeople(p, play)).length) return COPY.clash;
      if (Object.keys(play.pos).length === p.people.length) return COPY.allIn;
      const sel = p.people.find(function (x) { return x.id === ctx.ui.selected; });
      return sel ? COPY.who(sel.name) : COPY.choose;
    },
    wonLine: function (ctx) {
      const p = ctx.puzzle;
      const killer = p.people.find(function (x) { return x.id === p.solution.killerId; });
      const victim = victimOf(p);
      const at = p.solution.positions[victim.id];
      const room = p.rooms.find(function (x) { return x.id === p.roomOf[at[0]][at[1]]; });
      return COPY.wonLine(killer.name, victim.name, room.name);
    },
    mount: function (ctx, stage) {
      const p = ctx.puzzle;
      const short = initials(p);
      ctx.ui.short = short;
      if (!ctx.ui.selected) ctx.ui.selected = nextUnplaced(p, ctx.play, p.people[p.people.length - 1].id);
      function tap(r, c) {
        const who = personAt(p, ctx.play, r, c);
        if (who) {
          if (ctx.ui.selected === who.id) {
            ctx.act(function (play) { delete play.pos[who.id]; });
            return;
          }
          ctx.ui.selected = who.id;
          ctx.say('');
          ctx.paint();
          return;
        }
        if (blocked(p, r, c)) { ctx.say(COPY.blocked(objectAt(p, r, c).kind)); return; }
        const id = ctx.ui.selected;
        if (!id) { ctx.say(COPY.choose); return; }
        const clash = p.people.some(function (x) {
          if (x.id === id) return false;
          const at = ctx.play.pos[x.id];
          return at && (at[0] === r || at[1] === c);
        });
        if (clash) { ctx.say(COPY.taken); return; }
        ctx.act(function (play) { play.pos[id] = [r, c]; });
        ctx.ui.selected = nextUnplaced(p, ctx.play, id);
        ctx.paint();
      }
      const board = UI.board({
        n: p.n, kind: 'murdoku', label: 'House plan',
        locked: function () { return ctx.solved; },
        down: tap,
        key: function (r, c, key) {
          if (key !== 'Space' && key !== 'Enter' && key !== 'Activate') return false;
          tap(r, c);
          return true;
        }
      });
      board.layer('lines', UI.lines(p.n, function (r, c, side) {
        const other = side === 'E' ? p.roomOf[r][c + 1] : p.roomOf[r + 1][c];
        return other === p.roomOf[r][c] ? 1 : 2;
      }));
      ctx.ui.board = board;
      // Room names sit on the first square of each room.
      const seen = {};
      let names = '';
      for (let r = 0; r < p.n; r++) {
        for (let c = 0; c < p.n; c++) {
          const id = p.roomOf[r][c];
          if (seen[id]) continue;
          seen[id] = true;
          const room = p.rooms.find(function (x) { return x.id === id; });
          names += '<span class="room-name" style="left:' + (c / p.n * 100) + '%;top:' + (r / p.n * 100) + '%">' + esc(room.name) + '</span>';
        }
      }
      board.el.insertAdjacentHTML('beforeend', '<div class="names" aria-hidden="true">' + names + '</div>');

      const roster = UI.h('div', { class: 'roster', role: 'group', 'aria-label': COPY.people });
      p.people.forEach(function (x) {
        roster.appendChild(UI.h('button', {
          type: 'button', 'data-person': x.id, class: 'person' + (x.role === 'victim' ? ' is-victim' : ''),
          onclick: function () { ctx.ui.selected = x.id; ctx.say(''); ctx.paint(); }
        }, UI.h('span', { class: 'token' + (x.role === 'victim' ? ' victim' : ''), 'aria-hidden': 'true', text: short[x.id] }), UI.h('span', { class: 'pname', text: x.name }), x.role === 'victim' ? UI.h('span', { class: 'tag', text: COPY.victim }) : null));
      });
      const slips = UI.h('ul', { class: 'slips', 'aria-label': COPY.slips });
      p.clues.forEach(function (clue) { slips.appendChild(UI.h('li', { class: 'slip', 'data-for': clue.personId, text: clue.text })); });
      const kinds = {};
      (p.objects || []).forEach(function (o) { kinds[o.kind] = o.blocks; });
      const legend = UI.h('div', { class: 'legend' }, UI.h('h3', { text: COPY.legend }));
      const keyList = UI.h('ul');
      Object.keys(kinds).sort(function (a, b) { return Number(kinds[b]) - Number(kinds[a]) || a.localeCompare(b); }).forEach(function (kind) {
        keyList.appendChild(UI.h('li', { class: kinds[kind] ? 'blocks' : 'seat' }, UI.h('span', { class: 'swatch', html: UI.furniture(kind) }), kind + (kinds[kind] ? ' (blocked)' : '')));
      });
      legend.appendChild(keyList);
      ctx.ui.roster = roster;
      ctx.ui.slips = slips;
      stage.appendChild(UI.h('div', { class: 'board-wrap' }, board.el, legend));
      stage.appendChild(UI.h('div', { class: 'side' }, roster, UI.h('h3', { class: 'side-head', text: COPY.slips }), slips));
    },
    paint: function (ctx) {
      const p = ctx.puzzle;
      const play = ctx.play;
      const wrong = ctx.check ? wrongPeople(p, play) : {};
      const victim = victimOf(p);
      const vAt = p.solution.positions[victim.id];
      const vRoom = p.roomOf[vAt[0]][vAt[1]];
      const roomIndex = {};
      p.rooms.forEach(function (room, i) { roomIndex[room.id] = i; });
      ctx.ui.board.each(function (cell, r, c) {
        const obj = objectAt(p, r, c);
        const who = personAt(p, play, r, c);
        let cls = 'rm' + (roomIndex[p.roomOf[r][c]] % 6);
        if (obj && obj.blocks) cls += ' blocked';
        if (ctx.solved && p.roomOf[r][c] === vRoom) cls += ' lit';
        let html = obj ? UI.furniture(obj.kind) : '';
        if (who) {
          html += '<span class="token' + (who.role === 'victim' ? ' victim' : '') + (who.id === ctx.ui.selected && !ctx.solved ? ' on' : '') +
            (wrong[who.id] ? ' bad' : '') + (ctx.solved && who.id === p.solution.killerId ? ' culprit' : '') + '">' + esc(ctx.ui.short[who.id]) + '</span>';
        }
        const room = p.rooms[roomIndex[p.roomOf[r][c]]].name;
        UI.paintCell(cell, cls, html, UI.place(r, c) + ', ' + room + (obj ? ', ' + obj.kind + (obj.blocks ? ', blocked' : '') : '') +
          (who ? ', ' + who.name + (who.role === 'victim' ? ' (victim)' : '') : '') + (wrong[who && who.id] ? ', a slip is not true' : ''));
      });
      ctx.ui.roster.querySelectorAll('[data-person]').forEach(function (b) {
        const id = b.getAttribute('data-person');
        b.setAttribute('aria-pressed', String(id === ctx.ui.selected));
        b.classList.toggle('placed', !!play.pos[id]);
        b.classList.toggle('bad', !!wrong[id]);
      });
      ctx.ui.slips.querySelectorAll('.slip').forEach(function (li) {
        li.classList.toggle('on', li.getAttribute('data-for') === ctx.ui.selected);
      });
    }
  });
})();
