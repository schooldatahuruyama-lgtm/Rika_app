// tests/offline.test.js — sw.js の先にキャッシュするファイルが index.html と食い違っていないか
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function precacheList() {
  const m = read('sw.js').match(/const PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(m, 'sw.js に PRECACHE がない');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function indexRefs() {
  const html = read('index.html');
  return [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)].map((x) => x[1]);
}

test('index.html が読み込むファイルはすべて同じ順で PRECACHE に入っている', () => {
  const list = precacheList();
  const refs = indexRefs();
  assert.ok(refs.length > 0);
  refs.forEach((f) => assert.ok(list.includes(f), f + ' が PRECACHE にない'));
  const scripts = refs.filter((f) => f.endsWith('.js'));
  assert.deepEqual(list.filter((f) => f.endsWith('.js')), scripts);
});

test('PRECACHE は ./ と index.html を含み、すべてのファイルが実在する', () => {
  const list = precacheList();
  assert.ok(list.includes('./'));
  assert.ok(list.includes('index.html'));
  assert.equal(new Set(list).size, list.length, '重複がある');
  list.filter((f) => f !== './').forEach((f) => assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' がない'));
});

test('sw.js の VERSION とキャッシュ名', () => {
  const src = read('sw.js');
  assert.match(src, /const VERSION = '\d{4}-\d{2}-\d{2}-\d+';/);
  assert.match(src, /const CACHE_NAME = CACHE_PREFIX \+ VERSION;/);
  assert.match(src, /const CACHE_PREFIX = 'rika-quest-';/);
});

test('manifest.webmanifest の中身', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, '理科クエスト');
  assert.equal(m.short_name, '理科クエスト');
  assert.equal(m.start_url, './');
  assert.equal(m.display, 'standalone');
  assert.equal(m.lang, 'ja');
  assert.equal(m.theme_color, '#1A5CFF');
  assert.equal(m.background_color, '#EEF3FF');
  assert.equal(m.icons.length, 1);
  assert.ok(m.icons[0].src.startsWith('data:image/svg+xml,'));
  assert.equal(m.icons[0].sizes, 'any');
});
