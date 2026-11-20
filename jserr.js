// Plain-script copy of beacon.ts for sites with no build step: <script src="/jserr.js" defer></script>, or paste it into
// the site's own script. Keep it in step with beacon.ts (test/beacon.test.ts checks both send the same body).
(function () {
  var COLLECTOR = 'https://spaceisland.ltd/api/jserr';
  if (!navigator.sendBeacon || location.protocol !== 'https:') return;
  var h = location.hostname;
  if (!h || h === 'localhost' || /^(127\.|10\.|192\.168\.|\[::1\])/.test(h) || /\.(local|localhost|test)$/.test(h)) return;
  var seen = {}, n = 0;
  var path = function (u) { return String(u).replace(location.origin, '').split(/[?#]/)[0].slice(0, 120); };
  var stackOf = function (e) {
    var st = e instanceof Error && typeof e.stack === 'string' ? e.stack : '', out = [], re = /((?:(?:https?|[a-z-]+-extension):\/\/[^\s()@]+)|(?:\/[^\s()@:]+)):(\d+):(\d+)/g, m;
    while ((m = re.exec(st)) && out.length < 5) out.push(path(m[1]) + ':' + m[2] + ':' + m[3]);
    return out.join(' < ');
  };
  var report = function (e, file, line) {
    var m = (e instanceof Error ? e.name + ': ' + e.message : String(e == null ? '' : e)).slice(0, 300);
    if (!m || seen[m] || n >= 5) return;
    seen[m] = 1; n++;
    var s = stackOf(e);
    try { navigator.sendBeacon(COLLECTOR, JSON.stringify({ h: h, m: m, f: file ? path(file) : undefined, l: line || undefined, s: s || undefined, p: path(location.pathname), r: window.JSERR_RELEASE })); } catch (x) { /* not reported */ }
  };
  addEventListener('error', function (e) { report(e.error || e.message, e.filename, e.lineno); });
  addEventListener('unhandledrejection', function (e) { report(e.reason); });
})();
