// Writes brand/tokens.css from brand/tokens.json (hq/standards/brand-book.md). No dependencies.
//   node brand/tokens-css.mjs [brand/tokens.json] [brand/tokens.css]
//   node brand/tokens-css.mjs --check   exits 1 when tokens.css is not what tokens.json makes (for npm test)
// tokens.json is W3C Design Tokens (DTCG) JSON. The CSS name is `--` + the token's own key, so keys are unique
// across the file. `$value` is the default theme; other themes sit in
// `$extensions["ltd.spaceisland"].themes` ({ "dark": "#…" }). The light/dark opposite of the default theme gets
// two identical blocks, one for the system setting and one for a stored choice (`data-theme`), which is the shape
// hq/templates/design/contrast.mjs checks.
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const check = args.includes('--check');
const [src = 'brand/tokens.json', out = src.replace(/\.json$/, '.css')] = args.filter((a) => a !== '--check');
const doc = JSON.parse(readFileSync(src, 'utf8'));
const meta = doc.$extensions?.['ltd.spaceisland'] ?? {};
const ext = (node) => node.$extensions?.['ltd.spaceisland'] ?? {};

const paths = new Map(); // "group.key" -> key
const base = {};
const themes = {};

function value(v, type) {
  if (typeof v === 'string') return v.replace(/\{([\w.-]+)\}/g, (_, ref) => {
    if (!paths.has(ref)) throw new Error(`unknown reference {${ref}}`);
    return `var(--${paths.get(ref)})`;
  });
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (type === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`;
    return v.map((f) => (/[\s]/.test(f) ? `'${f}'` : f)).join(', ');
  }
  if (v && typeof v === 'object') {
    if ('hex' in v) return v.alpha != null && v.alpha < 1
      ? `rgb(from ${v.hex} r g b / ${v.alpha})` : v.hex;
    if ('value' in v && 'unit' in v) return `${v.value}${v.unit}`;
  }
  throw new Error(`can't write ${JSON.stringify(v)} as CSS`);
}

function collect(node, path) {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || !child || typeof child !== 'object') continue;
    if ('$value' in child) {
      const at = [...path, key].join('.');
      if ([...paths.values()].includes(key)) throw new Error(`token key "${key}" is used twice (${at})`);
      paths.set(at, key);
    } else collect(child, [...path, key]);
  }
}

function walk(node, path, type) {
  const groupType = node.$type ?? type;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || !child || typeof child !== 'object') continue;
    if (!('$value' in child)) { walk(child, [...path, key], groupType); continue; }
    const t = child.$type ?? groupType;
    base[key] = value(child.$value, t);
    for (const [name, v] of Object.entries(ext(child).themes ?? {})) (themes[name] ??= {})[key] = value(v, t);
  }
}

collect(doc, []);
walk(doc, [], undefined);

const def = meta.defaultTheme ?? 'light';
const decl = (vars, scheme) => Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`)
  .concat(scheme ? [`  color-scheme: ${scheme};`] : []).join('\n');
const scheme = (name) => (name === 'light' || name === 'dark' ? name : null);

let css = `/* GENERATED from ${src.split('/').pop()} by tokens-css.mjs: edit the JSON, not this file.
   ${meta.product ?? ''} brand ${meta.version ? 'v' + meta.version : ''} · ${meta.date ?? ''} · book: ${meta.book ?? ''} */\n\n`;
css += `:root {\n${decl(base, scheme(def))}\n}\n`;
for (const [name, vars] of Object.entries(themes)) {
  const opposite = (def === 'light' && name === 'dark') || (def === 'dark' && name === 'light');
  if (opposite) {
    const other = name === 'dark' ? 'light' : 'dark';
    css += `\n@media (prefers-color-scheme: ${name}) {\n  :root:not([data-theme="${other}"]) {\n${decl(vars, name).replace(/^/gm, '  ')}\n  }\n}\n`;
  }
  css += `:root[data-theme="${name}"] {\n${decl(vars, scheme(name))}\n}\n`;
}

if (check) {
  let current = '';
  try { current = readFileSync(out, 'utf8'); } catch {}
  if (current !== css) { console.error(`${out} is out of date: run node ${process.argv[1]} ${src}`); process.exit(1); }
  console.log(`${out} matches ${src}`);
} else {
  writeFileSync(out, css);
  console.log(`wrote ${out} (${Object.keys(base).length} tokens, themes: ${[def, ...Object.keys(themes)].join(', ')})`);
}
