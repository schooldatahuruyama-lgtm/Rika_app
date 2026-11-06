// tests/anim-bio.test.js — 解説の動く図（生物: js/anim-bio.js）。docs/anim-plan.md 3-5 の 2 と 7 章の「テスト」
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const bio = require('../js/anim-bio.js');
const figures = require('../js/figures.js');

// 計画 7 章の優先度 A（生物 A 6 本）と優先度 B（3 本）
const BIO_KINDS_B = ['an-body-temp', 'bo-alveoli', 'na-greenhouse'];
// ミニプリント（1nen）の 4 本（docs/plans/mp-figures-1nen.md。basics は顕微鏡・観察の器具なので生物のファイルに置く）
const BIO_KINDS_MP = ['ba-focus-steps', 'ba-image-reverse', 'ba-candle-air', 'pl-ovary-to-fruit'];
// ミニプリント（2nen）の 5 本（docs/plans/mp-figures-2nen.md）
const BIO_KINDS_MP2 = ['bo-photosynthesis-flow', 'bo-day-night-gas', 'bo-heart-flow', 'bo-breath-path', 'bo-arm-bend'];
// ミニプリント（3nen）の 3 本（docs/plans/mp-figures-3nen.md）
const BIO_KINDS_MP3 = ['he-mitosis-steps', 'he-pollen-tube', 'he-dna-helix'];
const BIO_KINDS = ['bo-reflex', 'he-chromosome-copy', 'he-meiosis-fertilize', 'he-segregation', 'na-balance', 'na-carbon-cycle']
  .concat(BIO_KINDS_B, BIO_KINDS_MP, BIO_KINDS_MP2, BIO_KINDS_MP3);
const PREFIXES = ['an-', 'bo-', 'he-', 'na-', 'ba-', 'pl-'];
// 1 周がつながる kind（計画の「つながる」）
const LOOPING = ['na-balance', 'na-carbon-cycle', 'an-body-temp', 'bo-alveoli', 'ba-candle-air',
  'bo-day-night-gas', 'bo-breath-path', 'bo-arm-bend', 'he-dna-helix'];
// つながりを見ないもの: na-balance の小さなピラミッドは、強調する箱（①〜④）が変わるたびに次の箱へ移る（④ → ① も同じ）。
// 量（幅）はつながるので、段の y だけを除く
const LOOP_SKIP = { 'na-balance': (it) => it.type === 'rect' && it.height === 8 ? Object.assign({}, it, { y: undefined }) : it };

const items = (kind, t) => anim.frame(kind, t).items;
// 紫の染色体（line）で、中心 (cx, cy)・半径 r の丸の中にあるもの
function chromsIn(list, cx, cy, r, color) {
  return list.filter(it => it.type === 'line' && it.color === (color || 'purple') &&
    it.points.every(([x, y]) => Math.hypot(x - cx, y - cy) <= r));
}
const len = (it) => Math.hypot(it.points[1][0] - it.points[0][0], it.points[1][1] - it.points[0][1]);

test('anim-bio: KINDS は計画の 9 本（A 6・B 3）とミニプリントの 4 本（1nen）・5 本（2nen）・3 本（3nen）で、単元の接頭辞で始まり、anim.KINDS に入っている', () => {
  assert.deepEqual(bio.KINDS, BIO_KINDS);
  bio.KINDS.forEach(k => {
    assert.ok(PREFIXES.some(p => k.startsWith(p)), k);
    assert.ok(anim.KINDS.includes(k), k);
  });
  assert.equal(anim.periodOf('na-balance'), 8000);
  ['bo-reflex', 'he-chromosome-copy', 'he-meiosis-fertilize', 'he-segregation', 'na-carbon-cycle', 'an-body-temp', 'bo-alveoli', 'na-greenhouse']
    .forEach(k => assert.equal(anim.periodOf(k), 4000, k));
  ['bo-reflex', 'he-chromosome-copy', 'he-meiosis-fertilize', 'he-segregation', 'na-greenhouse'].forEach(k => assert.equal(anim.restT(k), 0.99, k));
  ['na-balance', 'na-carbon-cycle', 'an-body-temp', 'bo-alveoli'].forEach(k => assert.equal(anim.restT(k), 0, k));
  ['ba-focus-steps', 'ba-image-reverse', 'pl-ovary-to-fruit'].forEach(k => assert.equal(anim.restT(k), 0.99, k));
  assert.equal(anim.restT('ba-candle-air'), 0);
  BIO_KINDS_MP.forEach(k => assert.equal(anim.periodOf(k), 4000, k));
  BIO_KINDS_MP2.forEach(k => {
    assert.equal(anim.periodOf(k), 4000, k);
    assert.equal(anim.restT(k), k === 'bo-arm-bend' ? 0.5 : 0, k);
  });
  BIO_KINDS_MP3.forEach(k => assert.equal(anim.periodOf(k), 4000, k));
  assert.equal(anim.restT('he-mitosis-steps'), 0.99);
  assert.equal(anim.restT('he-pollen-tube'), 0.5);   // 花粉管が伸びきって精細胞が (157,150) にいる、静止図と同じ形
  assert.equal(anim.restT('he-dna-helix'), 0);
});

test('anim-bio: 各 kind の frame は item があり、描ける種類で、座標が有限で場面のまわりに収まり、sceneSvg が <svg を返す', () => {
  const X_KEYS = ['x', 'x1', 'x2', 'cx'], Y_KEYS = ['y', 'y1', 'y2', 'cy'], SIZE_KEYS = ['r', 'rx', 'ry', 'width', 'height'];
  bio.KINDS.forEach(kind => [0, 0.25, 0.5, 0.75, 0.999, anim.restT(kind)].forEach(t => {
    const scene = anim.frame(kind, t);
    const where = kind + ' t = ' + t;
    assert.equal(scene.width, 320); assert.equal(scene.height, 240);
    assert.ok(scene.items.length > 0, where + ' に item がない');
    scene.items.forEach(it => {
      assert.ok(figures.ITEM_TYPES.includes(it.type), where + ' の ' + it.type);
      X_KEYS.forEach(k => { if (it[k] !== undefined) assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 340, where + ' ' + it.type + '.' + k + ' = ' + it[k]); });
      Y_KEYS.forEach(k => { if (it[k] !== undefined) assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 260, where + ' ' + it.type + '.' + k + ' = ' + it[k]); });
      SIZE_KEYS.forEach(k => { if (it[k] !== undefined) assert.ok(Number.isFinite(it[k]) && it[k] >= 0, where + ' ' + it.type + '.' + k + ' = ' + it[k]); });
      if (it.points !== undefined) {
        it.points.forEach(([x, y]) => assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= -20 && x <= 340 && y >= -20 && y <= 260,
          where + ' ' + it.type + ' の点 ' + x + ',' + y));
      }
    });
    assert.ok(figures.sceneSvg(scene).startsWith('<svg'), where);
  }));
});

test('anim-bio: 同じ t なら同じ絵（乱数を使わない）', () => {
  bio.KINDS.forEach(kind => [0.13, 0.5, 0.87].forEach(t => assert.deepEqual(items(kind, t), items(kind, t), kind)));
});

test('anim-bio: つながる kind は frame(kind, 0) と frame(kind, 0.99999) の座標の差が 1px 以内', () => {
  const coords = (list) => list.flatMap(it => ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'r', 'rx', 'ry', 'width', 'height']
    .filter(k => typeof it[k] === 'number').map(k => it[k]).concat((it.points || []).flat()));
  LOOPING.forEach(kind => {
    const fix = LOOP_SKIP[kind] || ((it) => it);
    const a = coords(items(kind, 0).map(fix)), b = coords(items(kind, 0.99999).map(fix));
    assert.equal(a.length, b.length, kind);
    a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 1, kind + ' の ' + i + ' 番目: ' + v + ' と ' + b[i]));
  });
});

// ---- bo-reflex ----

test('bo-reflex: 筋肉が縮み始める時刻 ＜ 脳に着く時刻（反射は脳を通らない）。0.99 で 2 本の神経は静止図と同じ線', () => {
  const muscle = (t) => items('bo-reflex', t).find(it => it.type === 'ellipse' && it.x === 180 && it.y === 96);
  const brainText = (t) => items('bo-reflex', t).some(it => it.type === 'text' && it.text === 'あとで「熱い」と感じる');
  let shrink = null, arrive = null;
  for (let i = 0; i < 1000; i++) {
    const t = i / 1000;
    if (shrink === null && muscle(t).rx < 32) shrink = t;
    if (arrive === null && brainText(t)) arrive = t;
  }
  assert.ok(shrink !== null && arrive !== null);
  assert.ok(shrink < arrive, '縮み始め ' + shrink + '・脳に着く ' + arrive);
  // 「あとで「熱い」と感じる」は 1 周の 0.3 以上見える（周期 4000 ms で 1.2 秒以上）
  assert.ok(1 - arrive >= 0.3, '文字が見えるのは ' + (1 - arrive));
  assert.equal(muscle(0).rx, 32); assert.equal(muscle(0).ry, 12);
  const rest = items('bo-reflex', 0.99);
  const nerve = (color) => rest.find(it => it.type === 'line' && it.color === color && it.width === 3);
  assert.deepEqual(nerve('blue').points, [[264, 156], [160, 176], [70, 176]]);
  assert.deepEqual(nerve('orange').points, [[68, 130], [148, 100]]);
  assert.equal(nerve('blue').arrow, true); assert.equal(nerve('orange').arrow, true);
});

// ---- he-chromosome-copy ----

test('he-chromosome-copy: 0.99 で右の細胞の染色体がそれぞれ 4 本、長さの組（長 2・短 2）がもとと同じ', () => {
  const rest = items('he-chromosome-copy', 0.99);
  const lengths = (list) => list.map(len).sort((a, b) => a - b);
  const origin = chromsIn(rest, 54, 100, 34);
  assert.equal(origin.length, 4);
  [[266, 60], [266, 150]].forEach(([cx, cy]) => {
    const c = chromsIn(rest, cx, cy, 28);
    assert.equal(c.length, 4, cx + ',' + cy);
    assert.deepEqual(lengths(c), lengths(origin));
    assert.deepEqual(lengths(c), [12, 12, 22, 22]);
  });
  // 中央は複製されて 2 本ずつ（8 本）
  assert.equal(chromsIn(rest, 156, 100, 34).length, 8);
  // 動いているあいだ、上と下へ向かう染色体は 4 本ずつ（合わせて 8 本、中央は灰色）
  const mid = items('he-chromosome-copy', 0.6);
  assert.equal(chromsIn(mid, 156, 100, 34, 'gray').length, 8);
  const moving = mid.filter(it => it.type === 'line' && it.color === 'purple' && it.points[0][0] > 100);
  assert.equal(moving.filter(it => it.points[0][1] + it.points[1][1] < 200).length, 4);
  assert.equal(moving.filter(it => it.points[0][1] + it.points[1][1] > 200).length, 4);
});

// ---- he-meiosis-fertilize ----

test('he-meiosis-fertilize: 各段階で精子・卵の染色体が 2 本、受精卵が 4 本', () => {
  // 減数分裂のあと（0.4）: 精子 2 本・卵 2 本、受精卵はまだない
  const mid = items('he-meiosis-fertilize', 0.4);
  assert.equal(chromsIn(mid, 120, 60, 18).length, 2);
  assert.equal(chromsIn(mid, 124, 172, 24).length, 2);
  assert.equal(chromsIn(mid, 240, 116, 32).length, 0);
  // 親の細胞には、分かれて出ていかない 2 本が灰色で残る
  assert.equal(chromsIn(mid, 40, 60, 26, 'gray').length, 2);
  assert.equal(chromsIn(mid, 40, 172, 26, 'gray').length, 2);
  // 受精のあと（0.99）: 受精卵が 4 本（長 2・短 2）
  const rest = items('he-meiosis-fertilize', 0.99);
  const z = chromsIn(rest, 240, 116, 32);
  assert.equal(z.length, 4);
  assert.deepEqual(z.map(len).sort((a, b) => a - b), [10, 10, 18, 18]);
  // 止まった絵（restT）は静止図と同じ色: 親の細胞は紫 4 本ずつ、精子・卵は紫 2 本ずつ、灰色の染色体はない
  const restAt = items('he-meiosis-fertilize', anim.restT('he-meiosis-fertilize'));
  assert.equal(chromsIn(restAt, 40, 60, 26).length, 4);
  assert.equal(chromsIn(restAt, 40, 172, 26).length, 4);
  assert.equal(chromsIn(restAt, 120, 60, 18).length, 2);
  assert.equal(chromsIn(restAt, 124, 172, 24).length, 2);
  assert.equal(restAt.filter(it => it.type === 'line' && it.color === 'gray').length, 0);
  assert.equal(restAt.filter(it => it.type === 'circle' && it.stroke === 'gray').length, 0);
  // 受精のあいだは、染色体の数が 4 本のまま（精子 2 本 + 卵 2 本）
  const moving = items('he-meiosis-fertilize', 0.6).filter(it => it.type === 'line' && it.color === 'purple');
  assert.equal(moving.length, 4);
  // 今の段階の数が青
  const blue = (t) => items('he-meiosis-fertilize', t).filter(it => it.type === 'text' && it.color === 'blue').map(it => it.x);
  assert.deepEqual(blue(0.1), [192]); assert.deepEqual(blue(0.4), [240]); assert.deepEqual(blue(0.99), [288]);
});

// ---- he-segregation ----

test('he-segregation: 0.99 で A は上の生殖細胞、a は下の生殖細胞に入り（静止図と同じ線）、もとの細胞の文字は灰色で残る', () => {
  const rest = items('he-segregation', 0.99);
  const up = chromsIn(rest, 232, 56, 26), down = chromsIn(rest, 232, 164, 26);
  assert.equal(up.length, 1); assert.equal(down.length, 1);
  assert.deepEqual(up[0].points, [[226, 42], [226, 70]]);
  assert.deepEqual(down[0].points, [[226, 150], [226, 178]]);
  const txt = (s, x, y) => rest.find(it => it.type === 'text' && it.text === s && it.x === x && it.y === y);
  assert.ok(txt('A', 244, 62)); assert.ok(txt('a', 244, 170));
  assert.equal(txt('A', 46, 116).color, 'gray'); assert.equal(txt('a', 96, 116).color, 'gray');
  // 分かれる前（t = 0）は、もとの細胞に 2 本（紫）
  assert.equal(chromsIn(items('he-segregation', 0), 70, 110, 40).length, 2);
});

// ---- na-balance ----

test('na-balance: 各段階の中ほどで、カードの文に書いた生物だけが増える・減る。止まった絵はつり合い（量がすべて 1）', () => {
  const { balanceAmounts } = bio;
  const d = (key, t) => balanceAmounts(t + 0.001)[key] - balanceAmounts(t - 0.001)[key];
  assert.ok(d('H', 0.125) > 0 && d('P', 0.125) === 0 && d('C', 0.125) === 0);   // ① 草食動物が増える
  assert.ok(d('P', 0.375) < 0 && d('C', 0.375) > 0 && d('H', 0.375) === 0);     // ② 植物が減り、肉食動物が増える
  assert.ok(d('H', 0.625) < 0 && d('P', 0.625) === 0 && d('C', 0.625) === 0);   // ③ 草食動物が減る
  assert.ok(d('P', 0.875) > 0 && d('C', 0.875) < 0 && d('H', 0.875) === 0);     // ④ 植物が増え、肉食動物が減る
  // 止まった絵（restT 0）と 1 周の終わりは、つり合いの状態
  [anim.restT('na-balance'), 0.99999].forEach(t => {
    const a = balanceAmounts(t);
    ['P', 'H', 'C'].forEach(key => assert.ok(Math.abs(a[key] - 1) < 1e-6, 't = ' + t + ' の ' + key + ' = ' + a[key]));
  });
  // 1 周のあいだ、量は 0.7〜1.3
  for (let i = 0; i <= 100; i++) {
    const a = balanceAmounts(i / 100.5);
    ['P', 'H', 'C'].forEach(key => assert.ok(a[key] >= 0.7 - 1e-9 && a[key] <= 1.3 + 1e-9, key + ' = ' + a[key]));
  }
  // 強調する箱が段階に合う、ピラミッドの幅が量に比例する
  [0.125, 0.375, 0.625, 0.875].forEach((t, k) => {
    const list = items('na-balance', t);
    const boxes = list.filter(it => it.type === 'rect' && it.width === 272);
    assert.equal(boxes.length, 4);
    boxes.forEach((b, i) => assert.equal(b.fill, i === k ? '#FFF3C4' : 'white', 't = ' + t));
    const bars = list.filter(it => it.type === 'rect' && it.height === 8);
    const a = balanceAmounts(t);
    assert.deepEqual(bars.map(b => b.fill), ['orange', 'yellow', 'green']);
    assert.ok(Math.abs(bars[0].width - 12 * a.C) < 1e-9 && Math.abs(bars[1].width - 24 * a.H) < 1e-9 && Math.abs(bars[2].width - 36 * a.P) < 1e-9);
    bars.forEach(b => assert.ok(b.x >= 236 && b.x + b.width <= 288 && b.y >= boxes[k].y && b.y + b.height <= boxes[k].y + 34, 't = ' + t));
  });
});

// ---- na-carbon-cycle ----

test('na-carbon-cycle: 各 t で点が 14 個、どれも道すじの上', () => {
  const onPath = (x, y) => bio.CARBON_PATHS.some(path => path.some((p, i) => {
    if (i === 0) return false;
    const [x1, y1] = path[i - 1], [x2, y2] = p;
    const crossV = Math.abs((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1));
    const within = x >= Math.min(x1, x2) - 1e-9 && x <= Math.max(x1, x2) + 1e-9 && y >= Math.min(y1, y2) - 1e-9 && y <= Math.max(y1, y2) + 1e-9;
    return crossV < 1e-6 && within;
  }));
  [0, 0.1, 0.25, 0.5, 0.75, 0.999].forEach(t => {
    const dots = items('na-carbon-cycle', t).filter(it => it.type === 'circle' && it.r === 4 && it.fill === 'ink');
    assert.equal(dots.length, 14, 't = ' + t);
    dots.forEach(it => assert.ok(onPath(it.x, it.y), 't = ' + t + ' の点 ' + it.x + ',' + it.y));
  });
});

// ================================================================
// 優先度 B
// ================================================================

const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);
// 点 (x, y) が折れ線 path の上（距離 eps 以内）にある
const onPolyline = (path, x, y, eps) => path.some((p, i) => {
  if (i === 0) return false;
  const [x1, y1] = path[i - 1], [x2, y2] = p;
  const L = Math.hypot(x2 - x1, y2 - y1);
  const d = Math.abs((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) / L;
  const k = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (L * L);
  return d <= eps && k >= -1e-9 && k <= 1 + 1e-9;
});
// 文字の重なりを見るための箱（全角 1 文字 ＝ size、半角 ＝ size × 0.6 の概算）。y はベースライン
function textBox(it) {
  const size = Math.max(12, it.size || 16);
  const w = Array.from(String(it.text)).reduce((s, c) => s + (/[ -~]/.test(c) ? 0.6 : 1) * size, 0);
  const left = it.anchor === 'middle' ? it.x - w / 2 : it.anchor === 'end' ? it.x - w : it.x;
  return { left, right: left + w, top: it.y - size * 0.85, bottom: it.y + size * 0.15 };
}
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test('B の kind: 各 t で文字（text）どうしが重ならず、場面（320×240）の中にある', () => {
  BIO_KINDS_B.forEach(kind => {
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      const boxes = items(kind, t).filter(it => it.type === 'text').map(it => ({ it, b: textBox(it) }));
      boxes.forEach(({ it, b }) => assert.ok(b.left >= 0 && b.right <= 320 && b.top >= 0 && b.bottom <= 240,
        kind + ' t = ' + t + ' の「' + it.text + '」が場面から出る'));
      boxes.forEach((p, j) => boxes.slice(j + 1).forEach(q => assert.ok(!overlap(p.b, q.b),
        kind + ' t = ' + t + ' の「' + p.it.text + '」と「' + q.it.text + '」が重なる')));
    }
  });
});

test('an-body-temp: イヌの点の y が一定（38 ℃）、トカゲの点が青い線の上（体温 ＝ 気温）、気温は 4〜36 ℃', () => {
  for (let t = 0; t < 1; t += 0.05) {
    const list = items('an-body-temp', t);
    const dog = list.find(it => it.type === 'circle' && it.fill === 'orange');
    const lizard = list.find(it => it.type === 'circle' && it.fill === 'blue');
    const T = bio.airTemp(t);
    assert.ok(T >= 4 - 1e-9 && T <= 36 + 1e-9, 't = ' + t);
    assert.equal(dog.y, bio.gy(38), 't = ' + t);
    assert.ok(near(lizard.y, bio.gy(T)) && near(lizard.x, 60 + 5 * T) && near(dog.x, lizard.x), 't = ' + t);
    assert.ok(onPolyline([[80, 184], [240, 56]], lizard.x, lizard.y, 1e-6), 't = ' + t);   // 青い線 (gx(4), gy(4))–(gx(36), gy(36))
  }
});

test('bo-alveoli: 血液の粒は毛細血管の上、空気の粒は気管支の上、酸素は肺胞 → 毛細血管、二酸化炭素は毛細血管 → 肺胞。粒どうしは重ならない', () => {
  let o2Seen = 0, co2Seen = 0;
  for (let i = 0; i < 400; i++) {
    const t = i / 400;
    const dots = items('bo-alveoli', t).filter(it => it.type === 'circle' && it.r === 3);
    const red = dots.filter(d => d.fill === 'red'), white = dots.filter(d => d.fill === 'white');
    assert.equal(red.length, 4, 't = ' + t);
    assert.equal(white.length, 3, 't = ' + t);
    red.forEach(d => assert.ok(onPolyline(bio.CAPILLARY, d.x, d.y, 1e-6), 't = ' + t));
    white.forEach(d => assert.ok(onPolyline(bio.AIR_PATH, d.x, d.y, 1e-6), 't = ' + t));
    dots.forEach((p, j) => dots.slice(j + 1).forEach(q => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 6, 't = ' + t + ' で粒が重なる')));
    // 酸素・二酸化炭素は、肺胞と毛細血管のあいだの道すじか、毛細血管の上（血液の粒が RIDE_GAP はなれていっしょに流れる）
    dots.filter(d => d.fill === 'blue' || d.fill === 'gray').forEach(g => {
      if (g.fill === 'blue') o2Seen++; else co2Seen++;
      const move = g.fill === 'blue' ? bio.O2_MOVE : bio.CO2_MOVE;
      if (onPolyline([move[0], move[1]], g.x, g.y, 1e-6)) return;
      assert.ok(onPolyline(bio.CAPILLARY, g.x, g.y, 1e-6), 't = ' + t + ' の ' + g.fill + ' が道すじの外');
      assert.ok(red.some(b => near(Math.hypot(b.x - g.x, b.y - g.y), bio.RIDE_GAP, 0.5) || Math.hypot(b.x - g.x, b.y - g.y) <= bio.RIDE_GAP + 1e-6),
        't = ' + t + ' の ' + g.fill + ' のそばに血液の粒がない');
    });
  }
  assert.ok(o2Seen > 0 && co2Seen > 0);
  // 気体の粒は連続して動く（となりの時刻で 6px より大きくとばない。現れる・消えるのは道すじのはしだけ）
  const gas = (t, fill) => items('bo-alveoli', t).filter(it => it.type === 'circle' && it.r === 3 && it.fill === fill);
  const ends = (fill) => fill === 'blue' ? [bio.O2_MOVE[0], bio.CAPILLARY[bio.CAPILLARY.length - 1]] : [bio.CAPILLARY[0], bio.CO2_MOVE[1]];
  ['blue', 'gray'].forEach(fill => {
    for (let i = 1; i <= 1000; i++) {
      const a = gas((i - 1) / 1000, fill), b = gas(i / 1000, fill);
      b.forEach(p => {
        if (a.some(q => Math.hypot(p.x - q.x, p.y - q.y) <= 6)) return;
        assert.ok(ends(fill).some(e => Math.hypot(p.x - e[0], p.y - e[1]) <= 6), fill + ' t = ' + i / 1000 + ' で ' + p.x + ',' + p.y + ' にとつぜん現れる');
      });
      a.forEach(q => {
        if (b.some(p => Math.hypot(p.x - q.x, p.y - q.y) <= 6)) return;
        assert.ok(ends(fill).some(e => Math.hypot(q.x - e[0], q.y - e[1]) <= 6), fill + ' t = ' + i / 1000 + ' で ' + q.x + ',' + q.y + ' でとつぜん消える');
      });
    }
  });
});

test('an-body-temp: 気温の縦の点線は「変温動物（トカゲ）」の文字の上を通らない', () => {
  for (let i = 0; i < 100; i++) {
    const list = items('an-body-temp', i / 100);
    const label = textBox(list.find(it => it.type === 'text' && it.text === '変温動物（トカゲ）'));
    list.filter(it => it.type === 'line' && it.color === 'gray' && it.dashed).forEach(l => {
      const [[x1, y1], [x2, y2]] = l.points;
      const hit = Math.max(x1, x2) >= label.left && Math.min(x1, x2) <= label.right && Math.max(y1, y2) > label.top && Math.min(y1, y2) < label.bottom;
      assert.ok(!hit, 't = ' + i / 100);
    });
  }
});

test('na-greenhouse: 太陽の光 → 地表から出る熱 → 地表へもどる熱の順に伸び、0.99 で静止図と同じ点・色・太さの矢印', () => {
  const lines = (t) => items('na-greenhouse', t).filter(it => it.type === 'line');
  const done = (t, color, end) => lines(t).some(l => l.color === color &&
    near(l.points[l.points.length - 1][0], end[0]) && near(l.points[l.points.length - 1][1], end[1]));
  assert.equal(lines(0).length, 0);
  assert.ok(done(0.2, 'orange', [60, 190]) && !lines(0.2).some(l => l.color === 'red'));
  assert.ok(done(0.45, 'red', [96, 22]) && done(0.45, 'red', [170, 112]) && !done(0.45, 'red', [202, 190]));
  const rest = lines(0.99);
  [[[44, 54], [60, 190], 'orange', undefined], [[120, 192], [96, 22], 'red', 2], [[150, 192], [170, 112], 'red', 2], [[182, 112], [202, 190], 'red', 2]]
    .forEach(([a, b, color, width]) => assert.ok(rest.some(l => l.arrow && l.color === color && l.width === width &&
      JSON.stringify(l.points) === JSON.stringify([a, b])), '静止図の矢印 ' + a + ' → ' + b));
  assert.ok(items('na-greenhouse', 0.99).some(it => it.type === 'text' && it.text === '地表があたたまる'));
});

// ================================================================
// ミニプリント（1nen）。docs/plans/mp-figures-1nen.md の「動く図（新規）」
// ================================================================

const MP_KINDS = BIO_KINDS_MP;
const MP_CARDS = {
  'ba-focus-steps': ['basics.js', 'bas-2-c3'], 'ba-image-reverse': ['basics.js', 'bas-3-c2'],
  'ba-candle-air': ['basics.js', 'bas-4-c3'], 'pl-ovary-to-fruit': ['plants.js', 'plants-mp1-c2'],
};

// kind → [単元のファイル, カード id]
const mpLesson = (file, id) => require('../content/' + file).unit.areas.flatMap(a => a.stages).flatMap(s => s.lessons).find(c => c.id === id);

test('ミニプリント: カードがその kind を使い、静止図の text・label が frame(kind, restT) に同じ text・x・y で入っている', () => {
  assert.deepEqual(Object.keys(MP_CARDS), MP_KINDS);
  MP_KINDS.forEach(kind => {
    const [file, id] = MP_CARDS[kind];
    const card = mpLesson(file, id);
    assert.ok(card, id + ' がない');
    assert.equal(card.anim, kind, id + ' の anim');
    const rest = items(kind, anim.restT(kind));
    card.figure.items.filter(it => it.type === 'text' || it.type === 'label').forEach(st => {
      assert.ok(rest.some(it => (it.type === 'text' || it.type === 'label') && it.text === st.text && it.x === st.x && it.y === st.y),
        kind + ' の止まった絵に静止図の文字「' + st.text + '」(' + st.x + ',' + st.y + ') がない');
    });
  });
});

test('ミニプリント: 各 t で文字（text）どうしが重ならず場面の中にあり、矢印（arrow）の両はしが場面の中にある', () => {
  MP_KINDS.forEach(kind => {
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      const list = items(kind, t);
      const boxes = list.filter(it => it.type === 'text').map(it => ({ it, b: textBox(it) }));
      boxes.forEach(({ it, b }) => assert.ok(b.left >= 0 && b.right <= 320 && b.top >= 0 && b.bottom <= 240,
        kind + ' t = ' + t + ' の「' + it.text + '」が場面から出る'));
      boxes.forEach((p, j) => boxes.slice(j + 1).forEach(q => assert.ok(!overlap(p.b, q.b),
        kind + ' t = ' + t + ' の「' + p.it.text + '」と「' + q.it.text + '」が重なる')));
      list.filter(it => it.type === 'arrow').forEach(a => [[a.x1, a.y1], [a.x2, a.y2]].forEach(([x, y]) =>
        assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 240, kind + ' t = ' + t + ' の矢印のはし ' + x + ',' + y)));
    }
  });
});

test('ba-focus-steps: ①〜④ の文字を順に太字にする。③ で対物レンズが近づき、④ で遠ざかる（止まった絵は ④）', () => {
  const bold = (t) => items('ba-focus-steps', t).filter(it => it.type === 'text' && it.bold && it.text !== 'はじめは低倍率で').map(it => it.text[0]);
  assert.deepEqual(bold(0.1), ['①']);
  assert.deepEqual(bold(0.3), ['②']);
  assert.deepEqual(bold(0.5), ['③']);
  assert.deepEqual(bold(0.99), ['④', 'ピ']);
  const objBottom = (t) => { const r = items('ba-focus-steps', t).find(it => it.type === 'rect' && it.x === 281 && it.height === 18); return r.y + r.height; };
  assert.ok(objBottom(0.6) > objBottom(0.4));   // ③ 近づける
  assert.ok(objBottom(0.99) < objBottom(0.6));  // ④ 遠ざける
});

test('ba-image-reverse: プレパラートの印が右上へ動くと、視野の像は同じ量だけ左下へ動く。止まった絵の矢印は静止図と同じ', () => {
  const marks = (t) => items('ba-image-reverse', t).filter(it => it.type === 'polygon').map(p => p.points[0]);
  const [s0, i0] = marks(0.2), [s1, i1] = marks(0.6);
  assert.ok(s1[0] > s0[0] && s1[1] < s0[1]);            // 右上
  assert.ok(i1[0] < i0[0] && i1[1] > i0[1]);            // 左下
  assert.ok(near(s1[0] - s0[0], i0[0] - i1[0]) && near(s0[1] - s1[1], i1[1] - i0[1]));
  const arrows = items('ba-image-reverse', 0.99).filter(it => it.type === 'arrow').map(a => [a.x1, a.y1, a.x2, a.y2]);
  assert.deepEqual(arrows, [[80, 140, 120, 110], [260, 92, 220, 128]]);
});

test('ba-candle-air: t = 0 は両方燃えている（静止図と同じ炎）。ふたをしたほうの炎は小さくなって消え、ふたなしのほうは燃え続ける', () => {
  const flames = (t) => items('ba-candle-air', t).filter(it => it.type === 'flame').map(f => f.x);
  assert.deepEqual(flames(0), [90, 230]);
  assert.deepEqual(flames(0.7), [230]);
  assert.ok(!items('ba-candle-air', 0.7).some(it => it.type === 'ellipse' && it.fill === 'orange'));
  assert.ok(items('ba-candle-air', 0.3).some(it => it.type === 'ellipse' && it.fill === 'orange' && it.ry < 16));
  for (let t = 0; t < 1; t += 0.05) assert.ok(flames(t).includes(230), 't = ' + t);
});

test('pl-ovary-to-fruit: 花粉が柱頭に着いてから子房が育ち、止まった絵は静止図と同じ果実（中心 (250,130)・半径 38・赤）', () => {
  const grow = (t) => items('pl-ovary-to-fruit', t).filter(it => (it.type === 'ellipse' || it.type === 'circle') && it.x > 70 && it.r !== 3 && it.fill !== 'white');
  assert.equal(grow(0.2).length, 0);
  const mid = grow(0.6)[0];
  assert.ok(mid.x > 70 && mid.x < 250);
  const fruit = grow(0.99)[0];
  assert.deepEqual([fruit.type, fruit.x, fruit.y, fruit.r, fruit.fill], ['circle', 250, 130, 38, 'red']);
  assert.ok(items('pl-ovary-to-fruit', 0.99).some(it => it.type === 'circle' && it.fill === 'yellow' && it.y < 62));   // 柱頭の花粉
});

// ================================================================
// ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」と「もとにする kind」
// ================================================================

const MP2_KINDS = BIO_KINDS_MP2;
const MP2_CARDS = {
  'bo-photosynthesis-flow': ['body.js', 'body-mp3-c1'], 'bo-day-night-gas': ['body.js', 'body-mp3-c2'],
  'bo-heart-flow': ['body.js', 'body-mp7-c2'], 'bo-breath-path': ['body.js', 'body-mp8-c1'], 'bo-arm-bend': ['body.js', 'body-mp11-c1'],
};
// カード id → [単元のファイル, 使い回す kind]
const MP2_SHARED = { 'body-mp10-c1': ['body.js', 'bo-reflex'] };

test('ミニプリント（2nen）: カードがその kind を使い、静止図の text・label が frame(kind, restT) に同じ text・x・y で入っている', () => {
  assert.deepEqual(Object.keys(MP2_CARDS), MP2_KINDS);
  MP2_KINDS.forEach(kind => {
    const [file, id] = MP2_CARDS[kind];
    const card = mpLesson(file, id);
    assert.ok(card, id + ' がない');
    assert.equal(card.anim, kind, id + ' の anim');
    const rest = items(kind, anim.restT(kind));
    card.figure.items.filter(it => it.type === 'text' || it.type === 'label').forEach(st => {
      assert.ok(rest.some(it => (it.type === 'text' || it.type === 'label') && it.text === st.text && it.x === st.x && it.y === st.y),
        kind + ' の止まった絵に静止図の文字「' + st.text + '」(' + st.x + ',' + st.y + ') がない');
    });
  });
});

test('ミニプリント（2nen）: 各 t で文字（text）どうしが重ならず場面の中にあり、矢印（arrow）の両はしが場面の中にある（静止図にある文字どうしは静止図のまま見ない）', () => {
  MP2_KINDS.forEach(kind => {
    const [file, id] = MP2_CARDS[kind];
    const fig = mpLesson(file, id).figure.items;
    const inFigure = it => fig.some(st => st.type === 'text' && st.text === it.text && st.x === it.x && st.y === it.y);
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      const list = items(kind, t);
      const boxes = list.filter(it => it.type === 'text').map(it => ({ it, b: textBox(it) }));
      boxes.forEach(({ it, b }) => assert.ok(b.left >= 0 && b.right <= 320 && b.top >= 0 && b.bottom <= 240,
        kind + ' t = ' + t + ' の「' + it.text + '」が場面から出る'));
      boxes.forEach((p, j) => boxes.slice(j + 1).forEach(q => assert.ok(!overlap(p.b, q.b) || (inFigure(p.it) && inFigure(q.it)),
        kind + ' t = ' + t + ' の「' + p.it.text + '」と「' + q.it.text + '」が重なる')));
      list.filter(it => it.type === 'arrow').forEach(a => [[a.x1, a.y1], [a.x2, a.y2]].forEach(([x, y]) =>
        assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 240, kind + ' t = ' + t + ' の矢印のはし ' + x + ',' + y)));
    }
  });
});

test('ミニプリント（2nen）: 内容が同じカードは、既存の kind を使い回す（計画の「もとにする kind」）', () => {
  Object.keys(MP2_SHARED).forEach(id => {
    const [file, kind] = MP2_SHARED[id];
    const card = mpLesson(file, id);
    assert.ok(card, id + ' がない');
    assert.equal(card.anim, kind, id + ' の anim');
    assert.ok(anim.KINDS.includes(kind), kind);
  });
});

test('bo-photosynthesis-flow: t = 0 は粒 4 つが左の箱の中（二酸化炭素 gray・水 sky）。移ったあとは右の箱の中でデンプン white・酸素 sky', () => {
  const grains = t => items('bo-photosynthesis-flow', t).filter(it => it.type === 'circle' && it.r === 5);
  const inBox = (g, x) => g.x > x && g.x < x + 130 && g.y > 92 && g.y < 148;
  assert.deepEqual(grains(0).map(g => g.fill), ['gray', 'gray', 'sky', 'sky']);
  grains(0).forEach(g => assert.ok(inBox(g, 6)));
  assert.deepEqual(grains(0.85).map(g => g.fill), ['white', 'white', 'sky', 'sky']);
  grains(0.85).forEach(g => assert.ok(inBox(g, 184)));
  // 光の点は太陽の下 x 160 を下る
  items('bo-photosynthesis-flow', 0.3).filter(it => it.type === 'circle' && it.fill === 'yellow' && it.r === 3).forEach(p => assert.equal(p.x, 160));
});

test('bo-day-night-gas: 昼の X の矢印の粒は Y の 2 倍の数。夜の側（x > 160）は Y の矢印の粒だけ', () => {
  const dots = t => items('bo-day-night-gas', t).filter(it => it.type === 'circle' && it.r === 4);
  const list = dots(0.3);
  const onArrow = (d, x1, y1, x2, y2) => Math.abs((x2 - x1) * (d.y - y1) - (y2 - y1) * (d.x - x1)) < 1e-6;
  const xIn = list.filter(d => onArrow(d, 12, 62, 56, 110)).length, xOut = list.filter(d => onArrow(d, 104, 110, 148, 62)).length;
  const yIn = list.filter(d => onArrow(d, 12, 196, 58, 160)).length, yOut = list.filter(d => onArrow(d, 102, 160, 148, 196)).length;
  assert.deepEqual([xIn, xOut, yIn, yOut], [4, 4, 2, 2]);
  const night = list.filter(d => d.x > 160);
  assert.equal(night.length, 4);
  night.forEach(d => assert.ok(onArrow(d, 172, 196, 218, 160) || onArrow(d, 262, 160, 308, 196)));
  // 色: 入る酸素・出る酸素は sky、二酸化炭素は gray
  list.filter(d => onArrow(d, 12, 62, 56, 110)).forEach(d => assert.equal(d.fill, 'gray'));
  list.filter(d => onArrow(d, 104, 110, 148, 62)).forEach(d => assert.equal(d.fill, 'sky'));
});

test('bo-heart-flow: 粒は 右心房 → 右心室 → 左心房 → 左心室 の順に部屋を通り、肺の前は青・肺のあとは赤。t = 0 は大静脈の入口で部屋の色は静止図のまま', () => {
  const at = t => {
    const list = items('bo-heart-flow', t);
    return { dot: list.find(it => it.type === 'circle' && it.r === 6), dark: list.filter(it => it.type === 'rect' && it.fill !== 'pink').map(r => r.label) };
  };
  assert.deepEqual([at(0).dot.x, at(0).dot.y], [8, 96]);
  assert.equal(at(0).dark.length, 0);
  const order = [];
  for (let i = 0; i < 1000; i++) {
    const { dark } = at(i / 1000);
    assert.ok(dark.length <= 1);
    if (dark.length && order[order.length - 1] !== dark[0]) order.push(dark[0]);
  }
  assert.deepEqual(order, ['右心房', '右心室', '左心房', '左心室']);
  // 肺動脈（左の上り）では青、肺静脈（右の下り）では赤
  const colorAt = (x, y) => {
    for (let i = 0; i < 1000; i++) { const { dot } = at(i / 1000); if (Math.hypot(dot.x - x, dot.y - y) < 3) return dot.fill; }
    return null;
  };
  assert.equal(colorAt(46, 80), '#1A5CFF');
  assert.equal(colorAt(274, 60), '#D9534F');
});

test('bo-breath-path: 空気の粒は気管・気管支の上、酸素（blue）は肺胞 → 毛細血管、二酸化炭素（gray）は毛細血管 → 肺胞へ動く', () => {
  const list = t => items('bo-breath-path', t);
  const air = list(0.3).filter(it => it.type === 'circle' && it.fill === 'white' && it.r === 3.5);
  assert.equal(air.length, 4);
  // 酸素は肺胞のまん中（x 100・220）から離れていく、二酸化炭素は近づく
  const a = list(0.3), b = list(0.31);
  ['blue', 'gray'].forEach(fill => {
    const p = a.filter(it => it.type === 'circle' && it.fill === fill), q = b.filter(it => it.type === 'circle' && it.fill === fill);
    assert.equal(p.length, 4);
    p.forEach((d, i) => {
      const cx = d.x < 160 ? 100 : 220;
      const away = Math.hypot(q[i].x - cx, q[i].y - 150) > Math.hypot(d.x - cx, d.y - 150);
      if (Math.hypot(q[i].x - d.x, q[i].y - d.y) < 5) assert.equal(away, fill === 'blue', fill + ' の ' + i + ' 番目');
    });
  });
});

test('bo-arm-bend: 0.5 で前腕・手は静止図と同じ（曲げた位置）、t = 0 で前腕はまっすぐ（水平）。曲げると内側の筋肉は短く太く、外側は長く細くなる', () => {
  const card = mpLesson('body.js', 'body-mp11-c1');
  const forearm = t => items('bo-arm-bend', t).filter(it => it.type === 'line' && it.color === 'rock')[1].points;
  const st = card.figure.items.filter(it => it.type === 'line' && it.color === 'rock')[1].points;
  forearm(0.5).forEach((p, j) => assert.ok(near(p[0], st[j][0], 1e-9) && near(p[1], st[j][1], 1e-9)));
  const f0 = forearm(0);
  assert.ok(near(f0[0][1], f0[1][1], 1e-6), '前腕が水平でない');
  const hand = t => items('bo-arm-bend', t).find(it => it.type === 'circle' && it.fill === 'pink');
  assert.ok(near(hand(0.5).x, 286, 1e-9) && near(hand(0.5).y, 58, 1e-9));
  const muscles = t => items('bo-arm-bend', t).filter(it => it.type === 'ellipse');
  const [in0, out0] = muscles(0), [in5, out5] = muscles(0.5);
  assert.ok(in5.rx < in0.rx && in5.ry > in0.ry, '内側の筋肉');
  assert.ok(out5.rx > out0.rx && out5.ry < out0.ry, '外側の筋肉');
  assert.deepEqual([in5.rx, in5.ry, out5.rx, out5.ry], [50, 13, 50, 13]);
});

// ================================================================
// ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」と「動く図（使い回し）」
// ================================================================

const MP3_CARDS = {
  'he-mitosis-steps': ['heredity.js', 'heredity-mp1-c1'], 'he-pollen-tube': ['heredity.js', 'heredity-mp3-c1'],
  'he-dna-helix': ['heredity.js', 'heredity-mp4-c3'],
};
// カード id → [単元のファイル, 使い回す kind]（計画の「動く図（使い回し）」。kind を増やさず既存の kind をそのまま使う）
const MP3_SHARED = {
  'heredity-mp2-c2': ['heredity.js', 'he-meiosis-fertilize'], 'nature-mp1-c2': ['nature.js', 'na-balance'], 'nature-mp2-c1': ['nature.js', 'na-carbon-cycle'],
};

test('ミニプリント（3nen）: カードがその kind を使い、静止図の text・label が frame(kind, restT) に同じ text・x・y で入っている', () => {
  assert.deepEqual(Object.keys(MP3_CARDS), BIO_KINDS_MP3);
  BIO_KINDS_MP3.forEach(kind => {
    const [file, id] = MP3_CARDS[kind];
    const card = mpLesson(file, id);
    assert.ok(card, id + ' がない');
    assert.equal(card.anim, kind, id + ' の anim');
    const rest = items(kind, anim.restT(kind));
    card.figure.items.filter(it => it.type === 'text' || it.type === 'label').forEach(st => {
      assert.ok(rest.some(it => (it.type === 'text' || it.type === 'label') && it.text === st.text && it.x === st.x && it.y === st.y),
        kind + ' の止まった絵に静止図の文字「' + st.text + '」(' + st.x + ',' + st.y + ') がない');
    });
  });
});

test('ミニプリント（3nen）: 各 t で文字（text）どうしが重ならず場面の中にあり、矢印（arrow）の両はしが場面の中にある', () => {
  BIO_KINDS_MP3.forEach(kind => {
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      const list = items(kind, t);
      const boxes = list.filter(it => it.type === 'text' && it.text !== '').map(it => ({ it, b: textBox(it) }));
      boxes.forEach(({ it, b }) => assert.ok(b.left >= 0 && b.right <= 320 && b.top >= 0 && b.bottom <= 240,
        kind + ' t = ' + t + ' の「' + it.text + '」が場面から出る'));
      boxes.forEach((p, j) => boxes.slice(j + 1).forEach(q => assert.ok(!overlap(p.b, q.b),
        kind + ' t = ' + t + ' の「' + p.it.text + '」と「' + q.it.text + '」が重なる')));
      list.filter(it => it.type === 'arrow').forEach(a => [[a.x1, a.y1], [a.x2, a.y2]].forEach(([x, y]) =>
        assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 240, kind + ' t = ' + t + ' の矢印のはし ' + x + ',' + y)));
    }
  });
});

test('ミニプリント（3nen）: 内容が同じカードは、既存の kind を使い回す（新しい kind を足さない）', () => {
  Object.keys(MP3_SHARED).forEach(id => {
    const [file, kind] = MP3_SHARED[id];
    const card = mpLesson(file, id);
    assert.ok(card, id + ' がない');
    assert.equal(card.anim, kind, id + ' の anim');
    assert.ok(bio.KINDS.includes(kind) && !BIO_KINDS_MP3.includes(kind), kind);
  });
});

test('he-mitosis-steps: 細胞を左から順に強調し、強調が始まるまでは枠だけ。止まった絵（0.99）は静止図とまったく同じ', () => {
  const card = mpLesson('heredity.js', 'heredity-mp1-c1');
  assert.deepEqual(items('he-mitosis-steps', 0.99), card.figure.items);
  const yellow = t => items('he-mitosis-steps', t).filter(it => it.type === 'rect' && it.fill === '#FFF3C4').map(it => it.x + 26);
  [[0.1, 34], [0.3, 96], [0.45, 158], [0.65, 220], [0.85, 282]].forEach(([t, cx]) => assert.deepEqual(yellow(t), [cx], 't = ' + t));
  // 強調が始まる前の細胞は枠だけ（中に何もない）
  const inside = (t, cx) => items('he-mitosis-steps', t).filter(it => it.type !== 'rect' && it.type !== 'text' && it.type !== 'arrow' &&
    (it.points ? it.points.every(p => Math.abs(p[0] - cx) < 26) : Math.abs(it.x - cx) < 26) && (it.points ? it.points[0][1] < 130 : it.y < 130));
  assert.equal(inside(0.1, 282).length, 0);
  assert.ok(inside(0.99, 282).length > 0);
  // 両端に分かれる（細胞 3）: 染色体の左はしが -6 から -20 へ動く
  const left3 = t => Math.min(...items('he-mitosis-steps', t).filter(it => it.type === 'line' && it.color === 'purple' && it.points[0][0] > 194 && it.points[0][0] < 246).map(it => it.points[0][0]));
  assert.ok(left3(0.6) > left3(0.7));
});

test('he-pollen-tube: 花粉管は 0.05〜0.45 で伸び、精細胞は管の先の後ろにいる。止まった絵（0.5）は静止図の形、そのあと精細胞が卵細胞に着いて受精する', () => {
  const card = mpLesson('heredity.js', 'heredity-mp3-c1');
  const tube = t => items('he-pollen-tube', t).find(it => it.type === 'line' && it.color === 'orange');
  assert.equal(tube(0.02), undefined);
  assert.deepEqual(tube(0.5).points, card.figure.items.find(it => it.type === 'line' && it.color === 'orange').points);
  const sperm = t => pollenSperm(t);
  assert.ok(near(sperm(0.5).x, 157, 0.5) && near(sperm(0.5).y, 150, 0.5));   // 静止図の (157,150)（管の線の上に置くので 0.3 ずれる）
  for (let i = 6; i < 45; i++) {
    const t = i / 100, tip = tube(t).points[tube(t).points.length - 1];
    assert.ok(sperm(t).y <= tip[1] + 1e-9, 't = ' + t + ' で精細胞が管の先より前にある');
  }
  const egg = t => items('he-pollen-tube', t).find(it => it.type === 'circle' && it.x === 160 && it.y === 198);
  assert.equal(egg(0.5).fill, 'pink');
  assert.notEqual(egg(0.9).fill, 'pink');
  assert.ok(items('he-pollen-tube', 0.9).some(it => it.type === 'text' && it.text === '受精'));
  assert.ok(!items('he-pollen-tube', 0.5).some(it => it.type === 'text' && it.text === '受精'));
});
function pollenSperm(t) { return bio.pollenTubeState(t).sperm; }

test('he-dna-helix: 2 本の鎖はいつも y 110 について上下対称、t = 0 は静止図の線（0.5 以内）、1 周で位相が 1 回まわる', () => {
  const card = mpLesson('heredity.js', 'heredity-mp4-c3');
  const strands = (list) => ['blue', 'orange'].map(c => list.find(it => it.type === 'line' && it.color === c).points);
  const [a0, b0] = strands(items('he-dna-helix', 0)), [sa, sb] = strands(card.figure.items);
  a0.forEach((p, i) => assert.ok(near(p[0], sa[i][0]) && near(p[1], sa[i][1], 0.5) && near(b0[i][1], sb[i][1], 0.5)));
  for (let i = 0; i < 40; i++) {
    const [a, b] = strands(items('he-dna-helix', i / 40));
    a.forEach((p, j) => assert.ok(near(p[1] + b[j][1], 220, 1e-9)));
  }
  assert.ok(near(bio.helixDy(3, 0.25), 36 * Math.sin(Math.PI / 2 + Math.PI / 2), 1e-9));
});
