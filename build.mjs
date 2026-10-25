import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error('missing ' + rel);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

const css = read('ui/app.css').replace(/<\/style/gi, '<\\/style');
const js = [
  'engines/rng.js',
  'engines/zip.js',
  'engines/queens.js',
  'engines/tango.js',
  'engines/sudoku.js',
  'engines/patches.js',
  'engines/murdoku.js',
  'engines/pinpoint.js',
  'engines/crossclimb.js',
  'engines/wend.js',
  'ui/app.js',
].map(read).join('\n;\n').replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f5f8f8">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="description" content="Nook. Nine puzzles, no ads, no accounts.">
<title>Nook</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,560;0,9..144,620;1,9..144,560&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script>
${js}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('wrote index.html', Buffer.byteLength(html), 'bytes');
