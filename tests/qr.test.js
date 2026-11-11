// tests/qr.test.js — QR コードの生成（js/qr.js）。既知の値、行列の構造、テストの中の小さな復号での往復、parseJoin
const test = require('node:test'); const assert = require('node:assert/strict');
const qr = require('../js/qr.js');

// ---- テスト用の小さな復号（誤り訂正の復号はしない。誤りのない行列を読むだけ） ----

// 誤り訂正レベル M の型番 1〜10 のブロック構成 [[ブロック数, データ符号語の数], …] と 1 ブロックの誤り訂正符号語の数（規格の表から）
const M_TABLE = {
  1: { ec: 10, groups: [[1, 16]] },
  2: { ec: 16, groups: [[1, 28]] },
  3: { ec: 26, groups: [[1, 44]] },
  4: { ec: 18, groups: [[2, 32]] },
  5: { ec: 24, groups: [[2, 43]] },
  6: { ec: 16, groups: [[4, 27]] },
  7: { ec: 18, groups: [[4, 31]] },
  8: { ec: 22, groups: [[2, 38], [2, 39]] },
  9: { ec: 22, groups: [[3, 36], [2, 37]] },
  10: { ec: 26, groups: [[4, 43], [1, 44]] },
};
// 規格の表の位置合わせパターンの中心
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

function functionMap(version) {
  const size = 17 + 4 * version;
  const f = [];
  for (let y = 0; y < size; y++) f.push(new Array(size).fill(false));
  const mark = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < size && y < size) f[y][x] = true;
  };
  // 位置検出パターン＋分離パターン＋形式情報
  mark(0, 0, 9, 9);
  mark(size - 8, 0, 8, 9);
  mark(0, size - 8, 9, 8);
  // タイミングパターン
  mark(6, 0, 1, size);
  mark(0, 6, size, 1);
  // 位置合わせパターン（位置検出パターンと重なる 3 すみには置かない）
  const a = ALIGN[version];
  a.forEach((cy) => a.forEach((cx) => {
    if ((cx < 9 && cy < 9) || (cx > size - 9 && cy < 9) || (cx < 9 && cy > size - 9)) return;
    mark(cx - 2, cy - 2, 5, 5);
  }));
  // 型番情報
  if (version >= 7) {
    mark(size - 11, 0, 3, 6);
    mark(0, size - 11, 6, 3);
  }
  return f;
}

const MASK_FN = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0,
];

function decode(m) {
  const size = m.size;
  const version = (size - 17) / 4;
  const mod = m.modules;
  // 形式情報（左上のもの）を読む: (8,0..5),(8,7),(8,8),(7,8),(5..0,8) の順に bit0..bit14
  const coords = [];
  for (let i = 0; i <= 5; i++) coords.push([8, i]);
  coords.push([8, 7], [8, 8], [7, 8]);
  for (let i = 9; i < 15; i++) coords.push([14 - i, 8]);
  let fmt = 0;
  coords.forEach(([x, y], i) => { if (mod[y][x]) fmt |= 1 << i; });
  // 右上・左下の写しも同じか
  let fmt2 = 0;
  for (let i = 0; i < 8; i++) if (mod[8][size - 1 - i]) fmt2 |= 1 << i;
  for (let i = 8; i < 15; i++) if (mod[size - 15 + i][8]) fmt2 |= 1 << i;
  assert.equal(fmt2, fmt, '形式情報の 2 つの写しがちがう');
  const data5 = (fmt ^ 0x5412) >> 10;
  assert.equal(data5 >> 3, 0, '誤り訂正レベルが M でない');
  const mask = data5 & 7;
  assert.equal(qr.formatBits('M', mask), fmt, '形式情報の BCH がちがう');
  const f = functionMap(version);
  // マスクを外しながら、右下から 2 列ずつ往復してビットを読む
  const bits = [];
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) {
      const y = upward ? size - 1 - v : v;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (f[y][x]) continue;
        bits.push(mod[y][x] !== MASK_FN[mask](y, x) ? 1 : 0);
      }
    }
    upward = !upward;
  }
  const codewords = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // インターリーブを戻す
  const t = M_TABLE[version];
  const blocks = [];
  t.groups.forEach(([n, len]) => { for (let k = 0; k < n; k++) blocks.push({ len, data: [], ec: [] }); });
  const maxLen = Math.max(...blocks.map((b) => b.len));
  let p = 0;
  for (let i = 0; i < maxLen; i++) blocks.forEach((b) => { if (i < b.len) b.data.push(codewords[p++]); });
  for (let i = 0; i < t.ec; i++) blocks.forEach((b) => b.ec.push(codewords[p++]));
  // 誤り訂正符号語が正しいか（rsEncode と、別に書いた割り算で）
  blocks.forEach((b) => assert.deepEqual(b.ec, slowRs(b.data, t.ec), 'ブロックの誤り訂正符号語がちがう'));
  const data = [].concat(...blocks.map((b) => b.data));
  // バイトモードを読む
  let pos = 0;
  const read = (n) => { let v = 0; for (let i = 0; i < n; i++) { const byte = data[(pos >> 3)]; v = (v << 1) | ((byte >> (7 - (pos & 7))) & 1); pos++; } return v; };
  assert.equal(read(4), 4, 'バイトモードでない');
  const count = read(version <= 9 ? 8 : 16);
  const bytes = [];
  for (let i = 0; i < count; i++) bytes.push(read(8));
  return { version, mask, text: Buffer.from(bytes).toString('utf8') };
}

// 多項式の割り算で誤り訂正符号語を求める（qr.js とは別の書き方）
function slowRs(data, ecLen) {
  const exp = []; const log = [];
  let x = 1;
  for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  const mul = (a, b) => (a && b ? exp[(log[a] + log[b]) % 255] : 0);
  let g = [1];
  for (let i = 0; i < ecLen; i++) {
    const n = new Array(g.length + 1).fill(0);
    g.forEach((c, j) => { n[j] ^= mul(c, 1); n[j + 1] ^= mul(c, exp[i]); });
    g = n;
  }
  const msg = data.concat(new Array(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const c = msg[i];
    if (c) g.forEach((gc, j) => { msg[i + j] ^= mul(gc, c); });
  }
  return msg.slice(data.length);
}

function textOfBytes(n) {
  const base = 'https://example.com/?live=A7K3PX&x=';
  let s = base;
  while (s.length < n) s += String.fromCharCode(97 + (s.length % 26));
  return s.slice(0, n);
}

// ---- 既知の値 ----

test('リード・ソロモン: 型番 1-Q の HELLO WORLD の例', () => {
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(qr.rsEncode(data, 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test('形式情報: レベル M・マスク 0 は 101010000010010、型番情報: 型番 7 は 000111110010010100', () => {
  assert.equal(qr.formatBits('M', 0).toString(2).padStart(15, '0'), '101010000010010');
  assert.equal(qr.formatBits('L', 4).toString(2).padStart(15, '0'), '110011000101111');
  assert.equal(qr.versionBits(7).toString(2).padStart(18, '0'), '000111110010010100');
  assert.equal(qr.versionBits(10).toString(2).padStart(18, '0'), '001010010011010011');
});

test('型番ごとの符号語の数と位置合わせパターンは規格の表どおり', () => {
  const totals = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
  for (let v = 1; v <= 10; v++) {
    assert.equal(qr.totalCodewords(v), totals[v - 1], '型番 ' + v);
    const t = M_TABLE[v];
    assert.equal(qr.dataCodewords(v, 'M'), t.groups.reduce((a, [n, len]) => a + n * len, 0), '型番 ' + v);
    assert.deepEqual(qr.alignmentPositions(v), ALIGN[v], '型番 ' + v);
  }
});

// ---- 構造 ----

function finderAt(mod, x0, y0) {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      if (mod[y0 + dy][x0 + dx] !== (d !== 2)) return false;
    }
  }
  return true;
}

test('encode の行列の構造（大きさ・位置検出・タイミング・暗モジュール・位置合わせ）', () => {
  const m = qr.encode('https://example.com/?live=A7K3PX', { ec: 'M' });
  assert.ok(m);
  const v = m.version;
  assert.equal(v, 3);
  assert.equal(m.size, 17 + 4 * v);
  const s = m.size;
  const mod = m.modules;
  assert.equal(mod.length, s);
  mod.forEach((row) => assert.equal(row.length, s));
  assert.ok(finderAt(mod, 0, 0));
  assert.ok(finderAt(mod, s - 7, 0));
  assert.ok(finderAt(mod, 0, s - 7));
  // 分離パターン（白）
  for (let i = 0; i < 8; i++) {
    assert.equal(mod[7][i], false); assert.equal(mod[i][7], false);
    assert.equal(mod[7][s - 1 - i], false); assert.equal(mod[i][s - 8], false);
    assert.equal(mod[s - 8][i], false); assert.equal(mod[s - 1 - i][7], false);
  }
  for (let i = 8; i < s - 8; i++) {
    assert.equal(mod[6][i], i % 2 === 0, 'タイミング（横）');
    assert.equal(mod[i][6], i % 2 === 0, 'タイミング（縦）');
  }
  assert.equal(mod[4 * v + 9][8], true, '暗モジュール');
  // 位置合わせパターン（右下。中心が黒、まわりが白、外周が黒）
  const c = ALIGN[v][1];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    assert.equal(mod[c + dy][c + dx], Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // 型番 1 には位置合わせパターンがない（右下のあたりが決まった形でなくてよい）。型番 7 以上の型番情報
  const m7 = qr.encode(textOfBytes(110));
  assert.equal(m7.version, 7);
  const vb = qr.versionBits(7);
  for (let i = 0; i < 18; i++) {
    const a = m7.size - 11 + (i % 3); const b = Math.floor(i / 3);
    const on = ((vb >> i) & 1) === 1;
    assert.equal(m7.modules[b][a], on); assert.equal(m7.modules[a][b], on);
  }
});

// ---- 往復 ----

test('自前の復号で往復する（10・30・62・100・150 バイトと日本語）', () => {
  const expectVersion = { 10: 1, 30: 3, 62: 4, 100: 6, 150: 8 };
  [10, 30, 62, 100, 150].forEach((n) => {
    const text = textOfBytes(n);
    const m = qr.encode(text, { ec: 'M' });
    assert.ok(m, n + ' バイト');
    assert.equal(m.version, expectVersion[n], n + ' バイトの型番');
    const d = decode(m);
    assert.equal(d.text, text, n + ' バイト');
    assert.equal(d.mask, m.mask);
  });
  ['理科クエストのライブクイズ', 'https://example.com/理科/?live=A7K3PX&名前=ひかり', '光の反射・屈折と凸レンズ。音の大きさと高さ。'.repeat(3)].forEach((text) => {
    const m = qr.encode(text);
    assert.ok(m);
    assert.equal(decode(m).text, text);
  });
});

test('型番 1〜10 のそれぞれの最大の長さで往復し、入らない長さは null', () => {
  const caps = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
  caps.forEach((cap, i) => {
    const full = qr.encode(textOfBytes(cap));
    assert.equal(full.version, i + 1, cap + ' バイト');
    assert.equal(decode(full).text, textOfBytes(cap));
    if (i < 9) assert.equal(qr.encode(textOfBytes(cap + 1)).version, i + 2, (cap + 1) + ' バイト');
  });
  assert.equal(qr.encode(textOfBytes(214)), null);
  assert.equal(qr.encode('あ'.repeat(72)), null);   // 216 バイト
});

test('マスクは 8 種から選ばれ、どのマスクの行列も同じ規則で読める', () => {
  const seen = new Set();
  for (let n = 1; n <= 60; n++) {
    const m = qr.encode(textOfBytes(n));
    seen.add(m.mask);
    assert.equal(decode(m).text, textOfBytes(n));
  }
  assert.ok(seen.size >= 4, '選ばれたマスクが少なすぎる: ' + [...seen].join(','));
});

test('svg は黒いモジュールの path と白い下地を出す', () => {
  const m = qr.encode('A7K3PX');
  const s = qr.svg(m, { scale: 4, margin: 4 });
  const full = m.size + 8;
  assert.ok(s.startsWith('<svg '));
  assert.ok(s.includes('viewBox="0 0 ' + full + ' ' + full + '"'));
  assert.ok(s.includes('width="' + full * 4 + '"'));
  const dark = m.modules.reduce((a, row) => a + row.filter(Boolean).length, 0);
  assert.equal((s.match(/h1v1h-1z/g) || []).length, dark);
  assert.ok(s.includes('M4 4h1v1h-1z'), '左上の位置検出パターンが余白 4 の位置から始まる');
  assert.ok(qr.svg(m).includes('viewBox="0 0 ' + full + ' '), '既定の余白は 4');
});

// ---- parseJoin ----

test('parseJoin: URL・コードそのもの・小文字・関係ない文字列・使わない文字', () => {
  assert.equal(qr.parseJoin('https://schooldatahuruyama-lgtm.github.io/Rika_app/?live=A7K3PX'), 'A7K3PX');
  assert.equal(qr.parseJoin('http://localhost:8080/index.html?x=1&live=a7k3px#top'), 'A7K3PX');
  assert.equal(qr.parseJoin('?live=A7K3PX'), 'A7K3PX');
  assert.equal(qr.parseJoin('A7K3PX'), 'A7K3PX');
  assert.equal(qr.parseJoin(' a7k3px '), 'A7K3PX');
  assert.equal(qr.parseJoin('https://example.com/'), null);
  assert.equal(qr.parseJoin('https://example.com/?live='), null);
  assert.equal(qr.parseJoin('こんにちは'), null);
  assert.equal(qr.parseJoin(''), null);
  assert.equal(qr.parseJoin(null), null);
  assert.equal(qr.parseJoin('A7K3P'), null);
  assert.equal(qr.parseJoin('A7K3PXY'), null);
  assert.equal(qr.parseJoin('AIK3PX'), null);
  assert.equal(qr.parseJoin('AOK3PX'), null);
  assert.equal(qr.parseJoin('A0K3PX'), null);
  assert.equal(qr.parseJoin('A1K3PX'), null);
  assert.equal(qr.parseJoin('https://example.com/?live=A1K3PX'), null);
  assert.equal(qr.parseJoin('javascript:alert(1)?live=A7K3PX'), null);
});

test('isShareableUrl: https の公開 URL は true、http・localhost・127.0.0.1・[::1]・file は false', () => {
  const loc = (href) => { const u = new URL(href); return { protocol: u.protocol, hostname: u.hostname }; };
  assert.equal(qr.isShareableUrl(loc('https://example.github.io/rika-quest/')), true);
  assert.equal(qr.isShareableUrl(loc('https://example.github.io/rika-quest/index.html?live=ABC234')), true);
  assert.equal(qr.isShareableUrl(loc('http://127.0.0.1:8765/')), false);
  assert.equal(qr.isShareableUrl(loc('http://localhost/')), false);
  assert.equal(qr.isShareableUrl(loc('https://localhost:8443/')), false);
  assert.equal(qr.isShareableUrl(loc('https://127.0.0.1/')), false);
  assert.equal(qr.isShareableUrl(loc('https://[::1]/')), false);
  assert.equal(qr.isShareableUrl(loc('http://example.com/')), false);
  assert.equal(qr.isShareableUrl(loc('file:///C:/rika/index.html')), false);
  assert.equal(qr.isShareableUrl(null), false);
  assert.equal(qr.isShareableUrl({}), false);
});
