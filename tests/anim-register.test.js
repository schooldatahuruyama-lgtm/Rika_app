// tests/anim-register.test.js — 動く図の登録口（anim.register・periodOf）と、分野ごとのファイルが使う道具（anim.helpers）
// このファイルは anim.js だけを読み、テスト用の kind（zz- で始まる名前）を登録する（node --test はファイルごとに別のプロセスで動く）
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const figures = require('../js/figures.js');

const LIGHT_KINDS = ['shadow-size', 'reflect-law', 'rays-spread', 'shadow-forms', 'light-to-eye', 'bounce-to-eye',
  'reflect-travel', 'reflect-names', 'mirror-image-distance', 'image-behind-mirror', 'mirror-visible',
  'refract-in', 'refract-out', 'vertical-vs-oblique', 'coin-lift', 'stick-lift', 'total-reflection',
  'lens-parallel-rays', 'focal-length', 'lens-special-rays', 'real-image-forms', 'image-size-by-distance', 'virtual-image'];

const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);
const dot = (t) => [{ type: 'circle', x: 160 + 100 * t, y: 120, r: 4 }];

// ---- 登録口 ----

test('register: 足した kind は KINDS の後ろに入り、frame・restT・periodOf が登録どおりに返す。光の 23 種の順は変わらない', () => {
  assert.deepEqual(anim.KINDS, LIGHT_KINDS);
  anim.register('zz-reg-a', dot, { restT: 0.25, period: 8000 });
  anim.register('zz-reg-b', dot);   // opts なし → restT 0・period 4000
  anim.register('zz-reg-c2', dot, {});
  assert.deepEqual(anim.KINDS.slice(0, 23), LIGHT_KINDS);
  assert.deepEqual(anim.KINDS.slice(23), ['zz-reg-a', 'zz-reg-b', 'zz-reg-c2']);

  const s = anim.frame('zz-reg-a', 0.5);
  assert.equal(s.width, 320); assert.equal(s.height, 240);
  assert.deepEqual(s.items, [{ type: 'circle', x: 210, y: 120, r: 4 }]);
  assert.ok(figures.sceneSvg(s).startsWith('<svg'));
  // t は数にしてから渡す（光の frame と同じ）
  assert.equal(anim.frame('zz-reg-a', 'abc').items[0].x, 160);

  assert.equal(anim.restT('zz-reg-a'), 0.25);
  assert.equal(anim.restT('zz-reg-b'), 0);
  assert.equal(anim.restT('zz-reg-c2'), 0);
  assert.equal(anim.periodOf('zz-reg-a'), 8000);
  assert.equal(anim.periodOf('zz-reg-b'), 4000);
  assert.equal(anim.periodOf('zz-reg-b'), anim.PERIOD_MS);

  // 光の kind はこれまでどおり（restT は REST_AT_END、周期は 4000）
  assert.equal(anim.restT('rays-spread'), 0.99);
  assert.equal(anim.restT('reflect-law'), 0);
  assert.equal(anim.periodOf('reflect-law'), 4000);
  assert.ok(anim.frame('reflect-law', 0).items.length > 0);
  assert.throws(() => anim.frame('zz-not-registered', 0));
});

test('register: 同じ名前・光の名前・形のまちがった名前・関数でない frameFn・範囲外の restT・正でない period は例外（KINDS は増えない）', () => {
  anim.register('zz-dup', dot);
  const before = anim.KINDS.slice();
  const bad = [
    ['zz-dup', dot, undefined],                // 同じ名前
    ['shadow-size', dot, undefined],           // 光の名前
    ['virtual-image', dot, undefined],
    ['Zz-upper', dot, undefined],              // 形のまちがった名前
    ['zz_under', dot, undefined],
    ['-zz', dot, undefined],
    ['zz-', dot, undefined],
    ['zz--a', dot, undefined],
    ['1zz', dot, undefined],
    ['zz a', dot, undefined],
    ['', dot, undefined],
    [42, dot, undefined],
    [null, dot, undefined],
    ['zz-fn1', null, undefined],               // 関数でない frameFn
    ['zz-fn2', 'dot', undefined],
    ['zz-fn3', {}, undefined],
    ['zz-rest1', dot, { restT: -0.1 }],        // 範囲外の restT
    ['zz-rest2', dot, { restT: 1 }],
    ['zz-rest3', dot, { restT: NaN }],
    ['zz-rest4', dot, { restT: '0.5' }],
    ['zz-per1', dot, { period: 0 }],           // 正でない period
    ['zz-per2', dot, { period: -4000 }],
    ['zz-per3', dot, { period: NaN }],
    ['zz-per4', dot, { period: Infinity }],
    ['zz-per5', dot, { period: '4000' }],
    ['zz-opt', dot, 'restT'],                  // opts がオブジェクトでない
  ];
  bad.forEach(([kind, fn, opts]) => {
    assert.throws(() => anim.register(kind, fn, opts), String(kind) + ' / ' + JSON.stringify(opts));
  });
  assert.deepEqual(anim.KINDS, before);
  assert.equal(anim.restT('zz-rest1'), 0);   // 失敗した登録は残らない
  assert.throws(() => anim.frame('zz-rest1', 0));
  // 範囲のはしは通る（restT 0 と 0.999、period はごく小さい正の数）
  assert.doesNotThrow(() => anim.register('zz-edge1', dot, { restT: 0 }));
  assert.doesNotThrow(() => anim.register('zz-edge2', dot, { restT: 0.999, period: 1 }));
  assert.doesNotThrow(() => anim.register('zz-edge3', dot, { restT: 0.5, period: 1 }));
  assert.equal(anim.restT('zz-edge2'), 0.999);
});

test('create: 登録した kind は periodOf の周期で t が進み、最初は restT の絵', () => {
  const seen = [];
  anim.register('zz-create', (t) => { seen.push(t); return dot(t); }, { restT: 0.5, period: 8000 });

  // ブラウザの代わり（create が使う所だけ）
  const callbacks = [];
  const fakeEl = () => ({
    className: '', textContent: '', innerHTML: '', isConnected: true, type: '',
    append() {}, addEventListener() {},
  });
  const saved = { document: globalThis.document, raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
  globalThis.document = { createElement: fakeEl };
  globalThis.requestAnimationFrame = (cb) => { callbacks.push(cb); return callbacks.length; };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const a = anim.create('zz-create');
    assert.equal(seen[seen.length - 1], 0.5);   // 最初の絵は restT
    a.start();
    callbacks.shift()(1000);                     // t0 = 1000 − 0.5·8000、t = 0.5
    assert.equal(seen[seen.length - 1], 0.5);
    callbacks.shift()(3000);                     // 2000 ms 進む → 8000 ms の 1/4
    assert.ok(near(seen[seen.length - 1], 0.75), String(seen[seen.length - 1]));
    callbacks.shift()(5000);                     // 1 周して 0 にもどる
    assert.ok(near(seen[seen.length - 1], 0), String(seen[seen.length - 1]));
    a.stop();
    assert.equal(a.isPlaying(), false);
  } finally {
    if (saved.document === undefined) delete globalThis.document; else globalThis.document = saved.document;
    if (saved.raf === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = saved.raf;
    if (saved.caf === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = saved.caf;
  }
});

// ---- 道具 ----

test('clamp・ease: 範囲に収める、ease は 0→0・0.5→0.5・1→1 で、はしの傾きが 0', () => {
  const { clamp, ease } = anim.helpers;
  assert.equal(clamp(5, 0, 3), 3); assert.equal(clamp(-1, 0, 3), 0); assert.equal(clamp(2, 0, 3), 2);
  assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.equal(ease(0.5), 0.5);
  assert.ok(near(ease(0.25), 0.25 * 0.25 * (3 - 0.5)));
  assert.ok(ease(0.01) < 0.01 && ease(0.99) > 0.99);   // 動き始めと止まりがゆっくり
  assert.equal(ease(-1), 0); assert.equal(ease(2), 1);
});

test('osc: osc(0, 3, 0) = 0、1/4 周で 1、位相をずらせる、n が整数なら t = 1 で t = 0 とつながる', () => {
  const { osc } = anim.helpers;
  assert.ok(near(osc(0, 3, 0), 0));
  assert.ok(near(osc(0.25, 1, 0), 1));
  assert.ok(near(osc(1 / 12, 3, 0), 1));
  assert.ok(near(osc(0, 1, 0.25), 1));
  assert.ok(near(osc(0, 2), 0));   // phase を省くと 0
  [1, 2, 5, 8].forEach(n => [0, 0.13, 0.5].forEach(ph => assert.ok(near(osc(1, n, ph), osc(0, n, ph), 1e-9), n + ' ' + ph)));
});

test('tri: 0→1→0 の三角波。tri(0) = 0、tri(0.5) = 1、tri(0.25) = 0.5、周期 1、負の数も同じ形', () => {
  const { tri } = anim.helpers;
  assert.equal(tri(0), 0); assert.equal(tri(0.5), 1);
  assert.ok(near(tri(0.25), 0.5)); assert.ok(near(tri(0.75), 0.5));
  assert.ok(near(tri(1.25), 0.5)); assert.ok(near(tri(2), 0));
  assert.ok(near(tri(-0.25), 0.5));
});

test('wrap: lo 以上 hi 未満に折り返す', () => {
  const { wrap } = anim.helpers;
  assert.equal(wrap(150, 110, 270), 150);
  assert.equal(wrap(270, 110, 270), 110);
  assert.equal(wrap(280, 110, 270), 120);
  assert.equal(wrap(100, 110, 270), 260);
  assert.equal(wrap(110 + 160 * 3 + 5, 110, 270), 115);
});

test('pathLen・along: 長さ、割合の点と辺の向き。長さ 0 の辺は飛ばす', () => {
  const { pathLen, along } = anim.helpers;
  const pts = [[0, 0], [100, 0], [100, 100]];   // 全長 200
  assert.equal(pathLen(pts), 200);
  assert.equal(pathLen([[0, 0], [3, 4]]), 5);
  assert.equal(pathLen([[5, 5]]), 0);
  assert.deepEqual(along(pts, 0), { x: 0, y: 0, tx: 1, ty: 0 });
  assert.deepEqual(along(pts, 0.25), { x: 50, y: 0, tx: 1, ty: 0 });
  const p = along(pts, 0.75);
  assert.ok(near(p.x, 100) && near(p.y, 50) && near(p.tx, 0) && near(p.ty, 1));
  const e = along(pts, 1);
  assert.ok(near(e.x, 100) && near(e.y, 100) && near(e.tx, 0) && near(e.ty, 1));
  assert.deepEqual(along(pts, 2), along(pts, 1));   // 範囲の外は 0〜1 に収める
  const z = along([[0, 0], [0, 0], [10, 0]], 0.5);
  assert.ok(near(z.x, 5) && near(z.tx, 1));
  assert.deepEqual(along([[7, 8], [7, 8]], 0.5), { x: 7, y: 8, tx: 1, ty: 0 });
});

test('partial: k = 0 は []、k = 0.5 の終点は全長の半分、k = 1 は全部の点（2 点以上）', () => {
  const { partial, pathLen } = anim.helpers;
  const pts = [[0, 0], [100, 0], [100, 100]];
  assert.deepEqual(partial(pts, 0), []);
  assert.deepEqual(partial(pts, -1), []);
  const h = partial(pts, 0.5);
  assert.deepEqual(h, [[0, 0], [100, 0]]);
  assert.ok(near(pathLen(h), 100));
  const q = partial(pts, 0.25);
  assert.equal(q.length, 2);
  assert.ok(near(q[1][0], 50) && near(q[1][1], 0));
  const r = partial(pts, 0.75);
  assert.equal(r.length, 3);
  assert.ok(near(r[2][0], 100) && near(r[2][1], 50));
  assert.ok(near(pathLen(r), 150));
  assert.deepEqual(partial(pts, 1), pts);
  assert.notEqual(partial(pts, 1), pts);   // 元の配列とは別
  assert.ok(partial(pts, 1e-15).length >= 2);
  assert.deepEqual(partial([[1, 1], [1, 1]], 0.5), []);   // 長さ 0
  // 斜めの線: 全長の割合どおり
  const d = partial([[0, 0], [30, 40]], 0.4);
  assert.ok(near(d[1][0], 12) && near(d[1][1], 16));
});

test('growLine: partial の点を 1 本の line（矢印つき）にする。style が伝わり、k = 0 は []', () => {
  const { growLine } = anim.helpers;
  const pts = [[50, 182], [80, 160], [130, 160]];
  assert.deepEqual(growLine(pts, 0), []);
  const a = growLine(pts, 1, { color: 'blue', width: 4, dashed: true });
  assert.equal(a.length, 1);
  assert.deepEqual(a[0], { type: 'line', points: pts, arrow: true, color: 'blue', width: 4, dashed: true });
  const b = growLine(pts, 0.5);
  assert.equal(b.length, 1);
  assert.equal(b[0].type, 'line'); assert.equal(b[0].arrow, true);
  assert.ok(!('color' in b[0]) && !('width' in b[0]) && !('dashed' in b[0]));
  assert.ok(b[0].points.length >= 2);
  assert.ok(figures.ITEM_TYPES.includes('line'));
  assert.ok(figures.sceneSvg({ width: 320, height: 240, items: a }).startsWith('<svg'));
});

test('onCircle: 右が 0°、画面で反時計回りが正（90° は上）', () => {
  const { onCircle } = anim.helpers;
  const p0 = onCircle(160, 120, 50, 0);
  assert.ok(near(p0[0], 210) && near(p0[1], 120));
  const p90 = onCircle(160, 120, 50, 90);
  assert.ok(near(p90[0], 160) && near(p90[1], 70));
  const p180 = onCircle(160, 120, 50, 180);
  assert.ok(near(p180[0], 110) && near(p180[1], 120));
  const p270 = onCircle(160, 120, 50, 270);
  assert.ok(near(p270[0], 160) && near(p270[1], 170));
});

test('mix: mix(#000000, #ffffff, 0.5) = #808080。はしは元の色、大文字・小文字どちらも読める、形のまちがった色は例外', () => {
  const { mix, TOKEN_HEX } = anim.helpers;
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mix('#000000', '#FFFFFF', 0), '#000000');
  assert.equal(mix('#000000', '#FFFFFF', 1), '#FFFFFF');
  assert.equal(mix('#1a5cff', '#1A5CFF', 0.3), '#1A5CFF');
  assert.equal(mix('#102030', '#305070', 0.5), '#203850');
  assert.equal(mix('#000000', '#ffffff', 2), '#FFFFFF');   // k は 0〜1 に収める
  assert.match(mix(TOKEN_HEX.white, TOKEN_HEX.gray, 0.4), /^#[0-9A-F]{6}$/);
  ['#fff', 'white', '#12345g', '', null].forEach(c => assert.throws(() => mix(c, '#000000', 0.5), String(c)));
});

test('TOKEN_HEX: どのトークンも figures.js が描く色と同じ', () => {
  const { TOKEN_HEX } = anim.helpers;
  const tokens = Object.keys(TOKEN_HEX);
  ['ink', 'blue', 'gray', 'line', 'green', 'orange', 'red', 'yellow', 'pink', 'purple', 'brown', 'sky',
    'water', 'glass', 'white', 'lightgreen', 'sand', 'rock'].forEach(tk => assert.ok(tokens.includes(tk), tk));
  tokens.forEach(tk => {
    assert.match(TOKEN_HEX[tk], /^#[0-9A-F]{6}$/, tk);
    const svg = figures.sceneSvg({ width: 320, height: 240, items: [{ type: 'circle', x: 10, y: 10, r: 5, fill: tk }] });
    assert.ok(svg.includes('fill="' + TOKEN_HEX[tk] + '"'), tk + ' = ' + TOKEN_HEX[tk]);
  });
});

test('helpers: 光で使っている道具はそのまま残っている', () => {
  ['clamp01', 'stage', 'lerp', 'grow', 'deg', 'rad2deg', 'u', 'N'].forEach(k => assert.ok(k in anim.helpers, k));
  assert.equal(anim.helpers.N.water, 1.33);
});
