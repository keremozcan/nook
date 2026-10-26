/* Nook UI kit: the game registry and the small helpers every game shares. */
(function () {
  const UI = window.NOOK_UI = window.NOOK_UI || { games: {} };

  UI.register = function (game) { UI.games[game.id] = game; };

  UI.esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };

  UI.fmt = function (ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + sec : m + ':' + sec;
  };

  UI.matrix = function (rows, cols, fill) {
    return Array.from({ length: rows }, function () { return Array(cols).fill(fill); });
  };

  UI.same = function (a, b) { return a && b && a[0] === b[0] && a[1] === b[1]; };

  /* Element helper: UI.h('div', { class: 'x', onclick: fn }, child, 'text'). */
  UI.h = function (tag, attrs) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        const value = attrs[key];
        if (value == null || value === false) return;
        if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
        else if (key === 'html') node.innerHTML = value;
        else if (key === 'text') node.textContent = value;
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    for (let i = 2; i < arguments.length; i++) {
      const child = arguments[i];
      if (child == null || child === false) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  };

  /* Pictures. Colours come from CSS classes so both themes work. */
  UI.icon = {
    crown: function () {
      return '<svg class="crown" viewBox="0 0 24 18" aria-hidden="true"><path d="M2 15.5 L4.6 5.5 L9 10 L12 3 L15 10 L19.4 5.5 L22 15.5 Z"/><rect x="2" y="15.5" width="20" height="2" rx="1"/></svg>';
    },
    sun: function () {
      return '<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><g class="rays"><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M19.2 4.8l-2.1 2.1M6.9 17.1l-2.1 2.1"/></g><circle cx="12" cy="12" r="5"/></svg>';
    },
    moon: function () {
      return '<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.6 8.6 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/></svg>';
    },
    tick: function () {
      return '<svg class="tick" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5 8.2 14.5 16 6"/></svg>';
    }
  };

  /* Furniture for Murdoku, drawn in a 24-unit box. */
  const FURNITURE = {
    chair: '<path d="M7 3h10v9H7z"/><path d="M5 12h14v3H5zM6 15v6M18 15v6"/>',
    stool: '<ellipse cx="12" cy="8" rx="7" ry="3"/><path d="M7 9l-1 12M17 9l1 12M12 11v10"/>',
    armchair: '<path d="M7 3.5h10v9.5H7z"/><rect x="3" y="9" width="4" height="10" rx="1.5"/><rect x="17" y="9" width="4" height="10" rx="1.5"/><path d="M7 13h10v6H7zM5 19v2.5M19 19v2.5"/>',
    sofa: '<path d="M3.5 7h17v5h-17z"/><rect x="0.8" y="10" width="2.7" height="7" rx="1"/><rect x="20.5" y="10" width="2.7" height="7" rx="1"/><path d="M3.5 12h17v5h-17zM9.2 12v5M14.8 12v5M3 17v2M21 17v2"/>',
    rug: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 6v12M12 6v12M17 6v12" class="thin"/>',
    table: '<rect x="2" y="7" width="20" height="4" rx="1"/><path d="M5 11v9M19 11v9"/>',
    bookshelf: '<rect x="4" y="2" width="16" height="20"/><path d="M4 8.5h16M4 15h16M7 3v5M9.5 3v5M14 9.5v5M16.5 9.5v5M8 16v5M11 16v5" class="thin"/>',
    plant: '<path d="M8 15h8l-1.5 7h-5z"/><path d="M12 15C12 9 7 7 4 7c0 4 3 7 8 8zM12 15c0-6 5-9 8-9 0 5-3 8-8 9zM12 15V4"/>',
    statue: '<circle cx="12" cy="5" r="3"/><path d="M8.5 9h7l-1 8h-5z"/><path d="M6 17h12v5H6z"/>'
  };
  UI.furniture = function (kind) {
    const body = FURNITURE[kind] || '<rect x="5" y="5" width="14" height="14" rx="2"/>';
    return '<svg class="furn" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  };

  /* Grid lines as one SVG layer: weight(r, c, side) returns 0 (none), 1 (thin), 2 (thick) or 3 (wall)
     for the east ('E') or south ('S') edge of a cell. Outer edges are the board's own border. */
  UI.lines = function (n, weight) {
    const paths = { 1: '', 2: '', 3: '' };
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (c < n - 1) {
          const w = weight(r, c, 'E');
          if (w) paths[w] += 'M' + (c + 1) + ' ' + r + 'V' + (r + 1);
        }
        if (r < n - 1) {
          const w = weight(r, c, 'S');
          if (w) paths[w] += 'M' + c + ' ' + (r + 1) + 'H' + (c + 1);
        }
      }
    }
    let svg = '';
    [1, 2, 3].forEach(function (w) {
      if (paths[w]) svg += '<path class="ln ln' + w + '" d="' + paths[w] + '"/>';
    });
    return svg;
  };

  /* A path through cell centres, in board units (viewBox 0 0 n n). */
  UI.pathD = function (cells) {
    return cells.map(function (cell, i) { return (i ? 'L' : 'M') + (cell[1] + 0.5) + ' ' + (cell[0] + 0.5); }).join('');
  };

  /* A square board of n×n cells with pointer, touch and keyboard input.
     opts: n, kind, label, down(r,c,e), move(r,c), up(r,c,moved), key(r,c,key) -> handled,
     cancel(). Cells keep their elements between paints, so focus is never lost. */
  UI.board = function (opts) {
    const n = opts.n;
    const el = UI.h('div', { class: 'board g-' + opts.kind, style: '--n:' + n });
    const grid = UI.h('div', { class: 'cells', role: 'group', 'aria-label': opts.label || 'Board' });
    el.appendChild(grid);
    const cells = [];
    let roving = opts.start || [0, 0];
    for (let r = 0; r < n; r++) {
      cells.push([]);
      for (let c = 0; c < n; c++) {
        const cell = UI.h('div', { class: 'cell', role: 'button', 'data-r': r, 'data-c': c, tabindex: r === roving[0] && c === roving[1] ? '0' : '-1' });
        grid.appendChild(cell);
        cells[r].push(cell);
      }
    }
    const layers = {};
    function layer(name, html) {
      if (!layers[name]) {
        el.insertAdjacentHTML('beforeend', '<svg class="layer layer-' + name + '" viewBox="0 0 ' + n + ' ' + n + '" preserveAspectRatio="none" aria-hidden="true"></svg>');
        layers[name] = el.lastElementChild;
      }
      if (html != null && layers[name].innerHTML !== html) layers[name].innerHTML = html;
      return layers[name];
    }
    function setRoving(r, c) {
      cells[roving[0]][roving[1]].tabIndex = -1;
      roving = [r, c];
      cells[r][c].tabIndex = 0;
    }
    function at(x, y, clamp) {
      const rect = grid.getBoundingClientRect();
      let c = Math.floor((x - rect.left) / rect.width * n);
      let r = Math.floor((y - rect.top) / rect.height * n);
      if (clamp) {
        r = Math.max(0, Math.min(n - 1, r));
        c = Math.max(0, Math.min(n - 1, c));
      }
      if (r < 0 || c < 0 || r >= n || c >= n) return null;
      return [r, c];
    }
    let active = null;
    function finish(e, cancelled) {
      if (!active) return;
      const drag = active;
      active = null;
      const cell = (!cancelled && e && at(e.clientX, e.clientY)) || drag.last;
      if (opts.up) opts.up(cell[0], cell[1], drag.moved || !!cancelled);
    }
    grid.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (opts.locked && opts.locked())) return;
      const cell = at(e.clientX, e.clientY);
      if (!cell) return;
      e.preventDefault();
      if (active) finish(null, true);
      if (grid.contains(document.activeElement)) document.activeElement.blur();
      setRoving(cell[0], cell[1]);
      active = { id: e.pointerId, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, moved: false, last: cell };
      try { grid.setPointerCapture(e.pointerId); } catch (err) { /* Synthetic events have no capture. */ }
      if (opts.down) opts.down(cell[0], cell[1], e);
    });
    grid.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== active.id) return;
      if (!active.moved && Math.abs(e.clientX - active.x) + Math.abs(e.clientY - active.y) > 8) active.moved = true;
      if (!active.moved || !opts.move) return;
      const unit = grid.getBoundingClientRect().width / n;
      const steps = Math.max(1, Math.ceil(Math.hypot(e.clientX - active.px, e.clientY - active.py) / (unit / 4)));
      for (let i = 1; i <= steps && active; i++) {
        const cell = at(active.px + (e.clientX - active.px) * i / steps, active.py + (e.clientY - active.py) * i / steps);
        if (!cell || UI.same(cell, active.last)) continue;
        active.last = cell;
        opts.move(cell[0], cell[1]);
      }
      if (active) { active.px = e.clientX; active.py = e.clientY; }
    });
    grid.addEventListener('pointerup', function (e) { if (active && e.pointerId === active.id) finish(e, false); });
    grid.addEventListener('pointercancel', function (e) { if (active && e.pointerId === active.id) finish(null, true); });
    grid.addEventListener('lostpointercapture', function (e) { if (active && e.pointerId === active.id) finish(null, true); });
    grid.addEventListener('click', function (e) {
      // Assistive technology activates a cell with a click that has no pointer press before it.
      if (e.detail !== 0) return;
      const cell = e.target.closest('.cell');
      if (!cell || (opts.locked && opts.locked())) return;
      if (opts.key) opts.key(Number(cell.dataset.r), Number(cell.dataset.c), 'Activate');
    });
    grid.addEventListener('keydown', function (e) {
      const cell = e.target.closest('.cell');
      if (!cell || e.metaKey || e.ctrlKey || e.altKey) return;
      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (dirs[e.key]) {
        e.preventDefault();
        const rr = Math.max(0, Math.min(n - 1, r + dirs[e.key][0]));
        const cc = Math.max(0, Math.min(n - 1, c + dirs[e.key][1]));
        setRoving(rr, cc);
        cells[rr][cc].focus();
        if (opts.moved) opts.moved(rr, cc);
        return;
      }
      if (opts.locked && opts.locked()) return;
      const key = e.key === ' ' ? 'Space' : e.key;
      if (opts.key && opts.key(r, c, key)) e.preventDefault();
    });
    return {
      el: el,
      grid: grid,
      cells: cells,
      layer: layer,
      focusCell: function () { return roving; },
      setFocus: setRoving,
      each: function (fn) { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) fn(cells[r][c], r, c); }
    };
  };

  /* Set a cell's classes and content only when they change. */
  UI.paintCell = function (cell, cls, html, label) {
    const name = 'cell' + (cls ? ' ' + cls : '');
    if (cell.className !== name) cell.className = name;
    if (cell._html !== html) { cell.innerHTML = html; cell._html = html; }
    if (label != null && cell.getAttribute('aria-label') !== label) cell.setAttribute('aria-label', label);
  };

  UI.place = function (r, c) { return 'Row ' + (r + 1) + ', column ' + (c + 1); };
})();
