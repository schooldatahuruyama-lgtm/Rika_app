// tests/avatars.test.js — アバター（js/ui-screens.js の AVATARS）の画像が実在し、sw.js の PRECACHE に入っているか
// ui-screens.js はブラウザ専用なので、ファイルの文字列から AVATARS を読み取って確かめる。
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function avatars() {
  const m = read('js/ui-screens.js').match(/const AVATARS = \[([\s\S]*?)\];/);
  assert.ok(m, 'ui-screens.js に AVATARS がない');
  return m[1].split('\n').filter((line) => line.includes('id:')).map((line) => {
    const field = (name) => { const f = line.match(new RegExp('\\b' + name + ": '([^']+)'")); return f ? f[1] : null; };
    return { id: field('id'), image: field('image'), jump: field('jump'), label: field('label') };
  });
}

function precacheList() {
  const m = read('sw.js').match(/const PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(m, 'sw.js に PRECACHE がない');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const NAMES = ['poyon', 'mojari', 'nyokki', 'purumo', 'mukuri', 'nemune'];

test('AVATARS は 6 つで、それぞれに image と jump がある', () => {
  const list = avatars();
  assert.equal(list.length, 6);
  list.forEach((a, i) => {
    assert.ok(a.id && a.label, i + ' 番目に id か label がない');
    assert.equal(a.image, 'assets/avatars/' + NAMES[i] + '.png');
    assert.equal(a.jump, 'assets/avatars/jump/' + NAMES[i] + '.png');
  });
});

test('アバターの画像とジャンプの画像はすべて実在し、PRECACHE に入っている', () => {
  const list = precacheList();
  avatars().forEach((a) => {
    [a.image, a.jump].forEach((f) => {
      assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' がない');
      assert.ok(list.includes(f), f + ' が PRECACHE にない');
    });
  });
});

test('PRECACHE ではジャンプの画像がアバター 6 枚のすぐ後ろに同じ順で並ぶ', () => {
  const list = precacheList();
  const start = list.indexOf('assets/avatars/poyon.png');
  assert.ok(start >= 0);
  const expected = NAMES.map((n) => 'assets/avatars/' + n + '.png').concat(NAMES.map((n) => 'assets/avatars/jump/' + n + '.png'));
  assert.deepEqual(list.slice(start, start + 12), expected);
});

test('レベルアップの祝いはアバターのジャンプの画像を出し、読みこめないときと、プロフィールがないときの戻り先がある', () => {
  const src = read('js/ui-screens.js');
  assert.match(src, /const LEVELUP_MS = 2000;/);
  assert.match(src, /function levelupFigure\(profile, message, teacher\)/);
  assert.match(src, /class: 'levelup-avatar', src: a\.jump/);
  assert.match(src, /img\.src = a\.image;/);
  assert.match(src, /RQ\.mascot\.celebrateMarkup\(message, teacher\)/);
  assert.match(src, /levelupFigure\(currentProfile\(ctx\.store\)/);
});
