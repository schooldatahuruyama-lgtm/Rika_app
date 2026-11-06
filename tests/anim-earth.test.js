// tests/anim-earth.test.js — 地学の動く図（js/anim-earth.js）。docs/anim-plan.md 3-5 の 2 と 8 章の各 kind の「テスト」
// anim.js と anim-earth.js だけを読む（node --test はファイルごとに別のプロセスで動く）
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const earth = require('../js/anim-earth.js');
const figures = require('../js/figures.js');
const volcano = require('../content/volcano.js').unit;

const EXPECTED = [
  'vo-quake-spread', 'vo-seismogram', 'vo-ps-graph', 'vo-plate-rebound',
  'we-cloud-form', 'we-high-low', 'we-westerly',
  'sp-rotation', 'sp-annual-orion', 'sp-orbit-midnight', 'sp-seasons', 'sp-moon-phase',
  // 優先度 B
  'sr-erosion-flow', 'we-front-move', 'sp-noon-altitude', 'sp-sunspot',
];
// ミニプリント（1nen）の 6 本（docs/plans/mp-figures-1nen.md）
const EXPECTED_MP = ['vo-focus-epicenter', 'vo-tremor-record', 'vo-ps-80km', 'vo-fault-uplift', 'sr-sort-deposit', 'sr-continent-drift'];
// ミニプリント（2nen）の 16 本（docs/plans/mp-figures-2nen.md）
const EXPECTED_MP2 = ['we-dew-point-graph', 'we-rising-air', 'we-water-cycle', 'we-isobar-wind', 'we-pressure-section', 'we-ocean-current',
  'we-cold-front-section', 'we-warm-front-section', 'we-tank-density', 'we-front-passage-graph', 'we-cyclone-move', 'we-winter-monsoon',
  'we-spring-3days', 'we-typhoon-path', 'we-sea-land-breeze', 'we-global-wind'];
// ミニプリント（3nen）の 9 本（docs/plans/mp-figures-3nen.md）
const EXPECTED_MP3 = ['sp-earth-spin', 'sp-ecliptic', 'sp-four-sky', 'sp-local-direction', 'sp-night-at-a', 'sp-star-hour',
  'sp-geo-helio', 'sp-inner-outer', 'sp-eclipse-line'];
// 1 周がつながる kind（計画の各 kind の欄に「つながる」と書いたもの）
const LOOPING = ['vo-quake-spread', 'we-high-low', 'we-westerly',
  'sp-rotation', 'sp-orbit-midnight', 'sp-seasons', 'sp-moon-phase', 'sp-noon-altitude', 'vo-focus-epicenter',
  'we-rising-air', 'we-water-cycle', 'we-pressure-section', 'we-ocean-current', 'we-winter-monsoon', 'we-sea-land-breeze', 'we-global-wind',
  'sp-earth-spin', 'sp-ecliptic', 'sp-local-direction', 'sp-geo-helio', 'sp-inner-outer'];
const PERIOD_8000 = ['sp-rotation', 'sp-annual-orion', 'sp-orbit-midnight', 'sp-seasons', 'sp-moon-phase', 'sp-noon-altitude', 'sp-sunspot',
  'sp-earth-spin', 'sp-ecliptic', 'sp-local-direction', 'sp-geo-helio', 'sp-inner-outer'];
const PREFIXES = ['vo-', 'sr-', 'we-', 'sp-'];

const items = (kind, t) => anim.frame(kind, t).items;
const texts = (kind, t) => items(kind, t).filter(it => it.type === 'text' || it.type === 'label');
const findText = (kind, t, s) => texts(kind, t).find(it => it.text === s);
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);

// 文字の重なりを見るための箱（全角 1 文字 ＝ size、半角 ＝ size × 0.6 の概算。tests/anim-physics.test.js と同じ）。y はベースライン
function textBox(it) {
  const size = Math.max(12, it.size || 16);
  const w = Array.from(String(it.text)).reduce((s, c) => s + (/[ -~]/.test(c) ? 0.6 : 1) * size, 0);
  const left = it.anchor === 'middle' ? it.x - w / 2 : it.anchor === 'end' ? it.x - w : it.x;
  return { left, right: left + w, top: it.y - size * 0.85, bottom: it.y + size * 0.15 };
}
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// item の座標の数（x 系と y 系）。points は [x, y] の組
const X_KEYS = ['x', 'x1', 'x2', 'cx'], Y_KEYS = ['y', 'y1', 'y2', 'cy'], SIZE_KEYS = ['r', 'rx', 'ry', 'width', 'height'];
function coords(it) {
  const out = [];
  X_KEYS.concat(Y_KEYS, SIZE_KEYS).forEach(k => { if (it[k] !== undefined) out.push(it[k]); });
  if (Array.isArray(it.points)) it.points.forEach(p => out.push(p[0], p[1]));
  return out;
}

test('anim-earth: KINDS は計画の 16 本（優先度 A 12 本・B 4 本）とミニプリントの 6 本（1nen）・16 本（2nen）・9 本（3nen）で、名前は地学の単元の接頭辞で始まり、anim.KINDS に入っている', () => {
  assert.deepEqual(earth.KINDS, EXPECTED.concat(EXPECTED_MP, EXPECTED_MP2, EXPECTED_MP3));
  earth.KINDS.forEach(kind => {
    assert.ok(PREFIXES.some(p => kind.startsWith(p)), kind + ' の接頭辞');
    assert.ok(anim.KINDS.includes(kind), kind + ' が anim.KINDS にない');
  });
  assert.equal(new Set(earth.KINDS).size, earth.KINDS.length);
});

test('anim-earth: 周期は天体の 1 周が 8000 ms、それ以外は 4000 ms。restT は計画どおり', () => {
  earth.KINDS.forEach(kind => assert.equal(anim.periodOf(kind), PERIOD_8000.includes(kind) ? 8000 : 4000, kind));
  const REST = { 'vo-seismogram': 0.99, 'vo-ps-graph': 0.99, 'we-cloud-form': 0.99, 'sr-erosion-flow': 0.99, 'sp-sunspot': 0.425,
    'vo-tremor-record': 0.99, 'vo-ps-80km': 0.99, 'vo-fault-uplift': 0.99, 'sr-sort-deposit': 0.99, 'sr-continent-drift': 0.99,
    'we-dew-point-graph': 0.99, 'we-cold-front-section': 0.99, 'we-warm-front-section': 0.99, 'we-tank-density': 0.99,
    'we-front-passage-graph': 0.99, 'we-cyclone-move': 0.99, 'we-spring-3days': 0.99,
    'sp-night-at-a': 0.4, 'sp-eclipse-line': 0.99 };
  earth.KINDS.forEach(kind => assert.equal(anim.restT(kind), REST[kind] || 0, kind));
});

test('anim-earth: 各 kind の各 t で items があり、type は描ける種類、座標は有限で場面のまわりに収まり、sceneSvg が <svg を返す', () => {
  earth.KINDS.forEach(kind => [0, 0.25, 0.5, 0.75, 0.999, anim.restT(kind)].forEach(t => {
    const scene = anim.frame(kind, t);
    assert.equal(scene.width, 320); assert.equal(scene.height, 240);
    assert.ok(Array.isArray(scene.items) && scene.items.length > 0, kind + ' t = ' + t + ' に item がない');
    scene.items.forEach(it => {
      assert.ok(figures.ITEM_TYPES.includes(it.type), kind + ' の ' + it.type);
      const where = kind + ' t = ' + t + ' の ' + it.type;
      X_KEYS.forEach(k => { if (it[k] !== undefined) assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 340, where + '.' + k + ' = ' + it[k]); });
      Y_KEYS.forEach(k => { if (it[k] !== undefined) assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 260, where + '.' + k + ' = ' + it[k]); });
      SIZE_KEYS.forEach(k => { if (it[k] !== undefined) assert.ok(Number.isFinite(it[k]), where + '.' + k + ' = ' + it[k]); });
      if (it.points !== undefined) {
        assert.ok(Array.isArray(it.points), where + ' の points');
        it.points.forEach(p => {
          assert.ok(Number.isFinite(p[0]) && p[0] >= -20 && p[0] <= 340, where + ' の点 x = ' + p[0]);
          assert.ok(Number.isFinite(p[1]) && p[1] >= -20 && p[1] <= 260, where + ' の点 y = ' + p[1]);
        });
      }
    });
    const svg = figures.sceneSvg(scene);
    assert.equal(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'));
  }));
});

test('anim-earth: 「つながる」kind は t = 0 と t = 0.99999 の items が同じ並びで、座標の差が 1px 以内', () => {
  LOOPING.forEach(kind => {
    const a = items(kind, 0), b = items(kind, 0.99999);
    assert.equal(a.length, b.length, kind + ' の item の数');
    a.forEach((it, i) => {
      assert.equal(it.type, b[i].type, kind + ' の ' + i + ' 番目の type');
      const ca = coords(it), cb = coords(b[i]);
      assert.equal(ca.length, cb.length, kind + ' の ' + i + ' 番目の座標の数');
      ca.forEach((v, j) => assert.ok(Math.abs(v - cb[j]) <= 1, kind + ' の ' + i + ' 番目（' + it.type + '）の座標 ' + v + ' と ' + cb[j]));
      if (it.text !== undefined) assert.equal(it.text, b[i].text, kind + ' の文字');
    });
  });
});

// ---- 火山と地震 ----

test('vo-quake-spread: 輪は地表（半径 100）までで、地層の中（y 80〜230）に収まる。t = 0 の輪は 34・58・82、輪が地表に届いてから震央の丸が大きくなる', () => {
  const ringItems = (t) => items('vo-quake-spread', t).filter(it => it.type === 'line' && it.color === 'gray' && !it.dashed);
  // 輪の半径（弧の点の震源からの距離。どの点も同じ）
  const radius = (it) => {
    const ds = it.points.map(p => Math.hypot(p[0] - 160, p[1] - 180));
    ds.forEach(d => assert.ok(near(d, ds[0], 1e-9)));
    return ds[0];
  };
  const epicenter = (t) => items('vo-quake-spread', t).find(it => it.type === 'circle' && it.fill === 'yellow').r;
  for (let i = 0; i < 400; i++) {
    const t = i / 400;
    const rs = ringItems(t).map(it => {
      it.points.forEach(p => assert.ok(p[1] >= 80 - 1e-9 && p[1] <= 230 + 1e-9, 't = ' + t + ' の点 y = ' + p[1]));
      return radius(it);
    });
    rs.forEach(r => assert.ok(r >= 12 && r <= 100, 'r = ' + r));
    // 震央の丸が大きいときは、地表に届きそうな輪（96 以上）があるか、届いた輪が消えた直後（描いている輪が 4 つより少ない）
    if (epicenter(t) === 12) assert.ok(rs.length < 4 || rs.some(r => r >= 96), 't = ' + t + ' で地表に届く前に震央がゆれる');
  }
  assert.deepEqual(ringItems(0).map(radius).map(r => Math.round(r * 1e6) / 1e6), [34, 58, 82]);
  assert.equal(epicenter(0), 9);
  // 輪 3 の半径 = 10 + wrap(72 + 96t)。t = 0.22 で 102.1（地表に届いて消えた直後）→ 震央が大きい。t = 0.15 で 96.4 → まだ
  assert.equal(epicenter(0.22), 12);
  assert.equal(epicenter(0.15), 9);
  // 半径 50 をこえる輪は下を切る（いちばん下の点が y 230）
  const big = ringItems(0).find(it => radius(it) > 80);
  assert.ok(near(Math.max(...big.points.map(p => p[1])), 230, 1e-9));
});

test('vo-seismogram: 0.99 の線の点が seismoPoints() と同じで、静止図の線とも同じ。ペン先より右の線はない', () => {
  const line = items('vo-seismogram', 0.99).find(it => it.type === 'line' && it.color === 'ink');
  assert.deepEqual(line.points, earth.seismoPoints());
  const card = volcano.areas.flatMap(a => a.stages).flatMap(s => s.lessons).find(c => c.id === 'volcano-3-c2');
  const staticLine = card.figure.items.find(it => it.type === 'line' && it.color === 'ink');
  assert.deepEqual(line.points, staticLine.points);
  // t = 0.3: ペン先 x = 20 + 284 × 0.3 / 0.9 ≒ 114.7（P 波は着いた、S 波はまだ）
  const mid = items('vo-seismogram', 0.3);
  const pen = mid.find(it => it.type === 'circle' && it.fill === 'blue');
  assert.ok(near(pen.x, 20 + 284 / 3, 1e-9));
  const pts = mid.find(it => it.type === 'line' && it.color === 'ink').points;
  assert.ok(pts.every(p => p[0] <= pen.x + 1e-9));
  assert.ok(near(pts[pts.length - 1][0], pen.x) && near(pts[pts.length - 1][1], pen.y));
  assert.ok(findText('vo-seismogram', 0.3, 'P波が着く'));
  assert.equal(findText('vo-seismogram', 0.3, 'S波が着く'), undefined);
  const band = mid.find(it => it.type === 'line' && it.color === 'orange');
  assert.deepEqual(band.points, [[70, 208], [pen.x, 208]]);
});

test('vo-ps-graph: 同じ時刻の P と S の距離の比が 6 : 3.5、0.99 の帯は静止図と同じで、長さが距離に比例', () => {
  [0.2, 0.3, 0.45].forEach(t => {
    const dots = items('vo-ps-graph', t).filter(it => it.type === 'circle');
    const p = dots.find(it => it.fill === 'blue'), s = dots.find(it => it.fill === 'green');
    assert.ok(p && s, 't = ' + t + ' に交点がない');
    assert.equal(p.x, s.x);
    const dp = (200 - p.y) / 0.8, ds = (200 - s.y) / 0.8;
    assert.ok(near(dp / ds, 6 / 3.5, 1e-9), 't = ' + t + ' の比 ' + dp / ds);
  });
  const bands = items('vo-ps-graph', 0.99).filter(it => it.type === 'line' && it.color === 'orange').map(it => it.points);
  assert.deepEqual(bands, [[[143, 88], [210, 88]], [[190, 32], [290, 32]]]);
  // 長さ 100 : 67 ≒ 210 : 140
  assert.ok(near(67 / 100, 140 / 210, 0.01));
  // 35 秒をこえると P 波の交点はない（P 波は 210 km の地点に着いた）
  const late = items('vo-ps-graph', 0.85).filter(it => it.type === 'circle');
  assert.equal(late.filter(it => it.fill === 'blue').length, 0);
  assert.equal(findText('vo-ps-graph', 0.99, '60 秒').x, 284);
});

test('vo-plate-rebound: t = 0 で大陸プレートは静止図と同じ形、0.69 で先がいちばん下がり、0.75 でもとの位置', () => {
  const tip = (t) => items('vo-plate-rebound', t).find(it => it.type === 'polygon' && it.fill === '#D8C9A8').points;
  assert.deepEqual(tip(0), [[10, 78], [205, 78], [224, 100], [150, 168], [10, 168]]);
  const y69 = tip(0.69)[2][1];
  for (let i = 0; i < 100; i++) assert.ok(tip(i / 100)[2][1] <= y69 + 0.2, 't = ' + i / 100);
  assert.ok(y69 > 109);
  assert.deepEqual(tip(0.75), tip(0));
  assert.ok(findText('vo-plate-rebound', 0.8, '地震が起こる'));
  assert.equal(findText('vo-plate-rebound', 0.5, '地震が起こる'), undefined);
});

// ---- 天気 ----

test('we-cloud-form: 空気のかたまりの半径は p とともに大きくなり、雲は p ≦ 0.8 でない。0.99 の雲は静止図と同じ', () => {
  const parcel = (t) => items('we-cloud-form', t).find(it => it.type === 'circle');
  let prev = 0;
  [0, 0.1, 0.3, 0.5, 0.7, 0.75].forEach(t => { const r = parcel(t).r; assert.ok(r >= prev, 't = ' + t); prev = r; });
  assert.equal(parcel(0).r, 8);
  assert.equal(parcel(0.75).r, 14);
  assert.ok(parcel(0.3).y < parcel(0).y);   // 上がる
  const clouds = (t) => items('we-cloud-form', t).filter(it => it.type === 'ellipse');
  [0, 0.2, 0.4, 0.6].forEach(t => assert.equal(clouds(t).length, 0, 't = ' + t + '（p = ' + t / 0.75 + '）'));
  assert.deepEqual(clouds(0.99).map(e => [e.x, e.y, e.rx, e.ry]), [[124, 72, 22, 11], [150, 62, 32, 14]]);
  // いまの段階の文字だけ太字
  assert.equal(findText('we-cloud-form', 0.1, '①上昇する').bold, true);
  assert.equal(findText('we-cloud-form', 0.1, '②膨張する').bold, undefined);
  assert.equal(findText('we-cloud-form', 0.99, '④露点で雲になる').bold, true);
});

test('we-high-low: 高気圧の粒は中心から離れて時計回り、低気圧の粒は近づいて反時計回り（外積の符号が反対）', () => {
  const dots = (t) => items('we-high-low', t).filter(it => it.type === 'circle');
  const t0 = 0.3, dt = 0.01;
  const a = dots(t0), b = dots(t0 + dt);
  assert.equal(a.length, 8);
  a.forEach((d, i) => {
    const high = d.x < 160;
    const cx = high ? 85 : 235, cy = 115;
    const r0 = Math.hypot(d.x - cx, d.y - cy), r1 = Math.hypot(b[i].x - cx, b[i].y - cy);
    // 画面の座標（y 下向き）での外積。正なら画面で時計回り
    const cross = (d.x - cx) * (b[i].y - cy) - (d.y - cy) * (b[i].x - cx);
    if (high) { assert.ok(r1 > r0, '高気圧の粒 ' + i + ' が離れない'); assert.ok(cross > 0, '高気圧の粒 ' + i + ' が時計回りでない'); }
    else { assert.ok(r1 < r0, '低気圧の粒 ' + i + ' が近づかない'); assert.ok(cross < 0, '低気圧の粒 ' + i + ' が反時計回りでない'); }
  });
});

test('we-westerly: 気圧の中心の x は t とともに増え（はしで戻る所を除く）、t = 0 は静止図と同じ位置。日本の天気が変わる', () => {
  const lowX = (t) => findText('we-westerly', t, '低').x;
  const highX = (t) => findText('we-westerly', t, '高').x;
  assert.equal(lowX(0), 70); assert.equal(highX(0), 190);
  for (let i = 0; i < 99; i++) {
    const t = i / 100, t2 = (i + 1) / 100;
    if (lowX(t2) > lowX(t) || lowX(t) > 250) assert.ok(true); else assert.fail('低気圧が東へ進まない t = ' + t);
    if (highX(t2) > highX(t) || highX(t) > 250) assert.ok(true); else assert.fail('高気圧が東へ進まない t = ' + t);
  }
  const weather = new Set([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(t => texts('we-westerly', t).find(it => it.text === '雨' || it.text === '晴れ').text));
  assert.deepEqual([...weather].sort(), ['晴れ', '雨'].sort());
  assert.equal(texts('we-westerly', 0).find(it => it.text === '雨' || it.text === '晴れ').text, '晴れ');   // 高気圧が日本の上
});

// ---- 地球と宇宙 ----

test('sp-rotation: t = 0 で観測者は正午の位置、t = 0.25 で夕方の位置 (160,170)。いまの時刻の文字', () => {
  const obs = (t) => items('sp-rotation', t).find(it => it.type === 'circle' && it.fill === 'red');
  assert.ok(near(obs(0).x, 110) && near(obs(0).y, 120));
  assert.ok(near(obs(0.25).x, 160) && near(obs(0.25).y, 170));
  assert.ok(near(obs(0.5).x, 210) && near(obs(0.5).y, 120));
  assert.ok(findText('sp-rotation', 0, 'いま: 正午'));
  assert.ok(findText('sp-rotation', 0.25, 'いま: 夕方'));
  assert.ok(findText('sp-rotation', 0.5, 'いま: 真夜中'));
  assert.ok(findText('sp-rotation', 0.75, 'いま: 明け方'));
  assert.equal(findText('sp-rotation', 0.25, '夕方').color, 'blue');
});

test('sp-annual-orion: 動く点は弧の上（中心 (160,200) からの距離 140）を西へ動き、日付の点に重なるとその日付が青', () => {
  const dot = (t) => items('sp-annual-orion', t).find(it => it.type === 'circle' && it.fill === 'orange');
  [0, 0.2, 0.4, 0.6, 0.85, 0.95].forEach(t => assert.ok(near(Math.hypot(dot(t).x - 160, dot(t).y - 200), 140, 1e-9), 't = ' + t));
  assert.ok(dot(0.5).x > dot(0).x);    // 西（右）へ
  assert.ok(near(dot(0).x, 160) && near(dot(0).y, 60));
  assert.equal(findText('sp-annual-orion', 0, '2月15日').color, 'blue');
  assert.equal(findText('sp-annual-orion', 0, '3月15日').color, undefined);
  assert.equal(findText('sp-annual-orion', 0.425, '3月15日').color, 'blue');
  assert.equal(findText('sp-annual-orion', 0.9, '4月15日').color, 'blue');
});

test('sp-orbit-midnight: 季節の t（0・0.25・0.5・0.75）で、真夜中の向きの星座が オリオン座・しし座・さそり座・ペガスス座', () => {
  const STARS = { 'オリオン座': [290, 120], 'しし座': [160, 24], 'さそり座': [30, 120], 'ペガスス座': [160, 216] };
  [[0, '冬', 'オリオン座'], [0.25, '春', 'しし座'], [0.5, '夏', 'さそり座'], [0.75, '秋', 'ペガスス座']].forEach(([t, season, star]) => {
    assert.ok(findText('sp-orbit-midnight', t, season + 'の真夜中→' + star + 'が南中'), 't = ' + t);
    assert.equal(findText('sp-orbit-midnight', t, star).color, 'blue');
    // 真夜中の向きの点線（太陽から地球の向き）の先が、その星座の点に向かう
    const ln = items('sp-orbit-midnight', t).find(it => it.type === 'line' && it.dashed && it.color === 'blue');
    const [x1, y1] = ln.points[0], [x2, y2] = ln.points[1];
    const [sx, sy] = STARS[star];
    const cross = (x2 - x1) * (sy - y1) - (y2 - y1) * (sx - x1);
    assert.ok(Math.abs(cross) < 1e-6, star + ' の向きでない');
    assert.ok(Math.hypot(sx - x2, sy - y2) < Math.hypot(sx - x1, sy - y1));
  });
});

test('sp-seasons: t = 0 で夏至の位置 (40,110) で「夏」、t = 0.5 で冬至の位置 (280,110) で「冬」。奥では太陽より先に描く', () => {
  assert.ok(findText('sp-seasons', 0, '北半球は 夏'));
  assert.ok(findText('sp-seasons', 0.5, '北半球は 冬'));
  assert.ok(findText('sp-seasons', 0.25, '北半球は 秋'));
  assert.ok(findText('sp-seasons', 0.75, '北半球は 春'));
  const earthAt = (t) => items('sp-seasons', t).filter(it => it.type === 'circle' && it.r === 14 && it.fill !== 'glass');
  assert.ok(earthAt(0).every(c => near(c.x, 40) && near(c.y, 110)));
  assert.ok(earthAt(0.5).every(c => near(c.x, 280) && near(c.y, 110)));
  const order = (t) => {
    const its = items('sp-seasons', t);
    const sun = its.findIndex(it => it.type === 'circle' && it.r === 20);
    const e = its.findIndex(it => it.type === 'circle' && it.r === 14 && it.fill !== 'glass');
    return e < sun ? 'back' : 'front';
  };
  assert.equal(order(0.75), 'back');
  assert.equal(order(0.25), 'front');
  assert.equal(order(0), 'front');
  // t = 0 は右半分（太陽の側）が光る、t = 0.5 は左半分
  const lit = (t) => items('sp-seasons', t).find(it => it.type === 'polygon' && it.fill === 'sky');
  assert.ok(lit(0).points.every(p => p[0] >= 40 - 1e-9));
  assert.ok(lit(0.5).points.every(p => p[0] <= 280 + 1e-9));
  assert.equal(lit(0.25), undefined);   // 手前では夜の側だけが見える
});

test('sp-moon-phase: θ = 180 で k = 0（新月）、θ = 0 で k = 1（満月）、θ = 270 で右半分が光る（上弦の月）', () => {
  const shape = (t) => items('sp-moon-phase', t).filter(it => it.type === 'polygon' && it.fill === 'yellow' &&
    it.points.every(p => Math.hypot(p[0] - 284, p[1] - 110) <= 18 + 1e-9));
  assert.equal(shape(0).length, 0);   // θ = 180: 光る所なし
  assert.ok(findText('sp-moon-phase', 0, '新月'));
  // θ = 270（t = 0.25）: 右半分
  const q = shape(0.25);
  assert.equal(q.length, 1);
  assert.ok(q[0].points.every(p => p[0] >= 284 - 1e-9));
  assert.ok(q[0].points.some(p => p[0] > 284 + 17));
  assert.ok(findText('sp-moon-phase', 0.25, '上弦の月'));
  // θ = 0（t = 0.5）: 満月（左右とも光る）
  const f = shape(0.5);
  assert.equal(f.length, 1);
  assert.ok(f[0].points.some(p => p[0] < 284 - 17) && f[0].points.some(p => p[0] > 284 + 17));
  assert.ok(findText('sp-moon-phase', 0.5, '満月'));
  // θ = 90（t = 0.75）: 下弦の月（左半分）
  assert.ok(shape(0.75)[0].points.every(p => p[0] <= 284 + 1e-9));
  assert.ok(findText('sp-moon-phase', 0.75, '下弦の月'));
  // 動く月は軌道（半径 80）の上
  const moon = items('sp-moon-phase', 0.1).find(it => it.type === 'circle' && it.r === 11 && it.fill === 'yellow');
  assert.ok(near(Math.hypot(moon.x - 160, moon.y - 120), 80, 1e-9));
});

// ---- 優先度 B ----

const lessonOf = (unitFile, id) => require('../content/' + unitFile).unit.areas.flatMap(a => a.stages).flatMap(s => s.lessons).find(c => c.id === id);
// かけら（8 角形）の中心と、中心からいちばん遠い点までの距離
function fragmentShape(it) {
  const cx = it.points.reduce((s, p) => s + p[0], 0) / it.points.length;
  const cy = it.points.reduce((s, p) => s + p[1], 0) / it.points.length;
  return { x: cx, y: cy, r: Math.max(...it.points.map(p => Math.hypot(p[0] - cx, p[1] - cy))) };
}
const fragments = t => items('sr-erosion-flow', t).filter(it => it.type === 'polygon' && it.fill === 'rock' && it.points.length === 8).map(fragmentShape);

test('sr-erosion-flow: かけら 5 つが山から川を通って海へ運ばれ、小さく丸くなって河口の近くの海底に積もる。かけらは重ならない', () => {
  // t = 0 は 5 つとも静止図の山のかけら（中心 (12,57)）の後ろ
  fragments(0).forEach(f => assert.ok(near(f.x, 12, 1.5) && near(f.y, 57, 1.5) && f.r <= 6.5));   // 頂点の平均なので、かどばった形では中心から少しずれる
  // 0.99 では 5 つとも海底の上に止まり、丸い（半径 3）。「④」の文字（x 228〜）にかからない
  const end = fragments(0.99);
  assert.equal(end.length, 5);
  end.forEach(f => {
    assert.ok(near(f.r, 3, 1e-6), '丸くなっていない r = ' + f.r);
    assert.ok(f.x > 200 && f.x + f.r < 228, 'x = ' + f.x);
    assert.ok(f.y + f.r <= earth.seaFloorY(f.x) + 1e-6 && f.y - f.r > 139, '海底の上・海面の下にない y = ' + f.y);
  });
  // 運ばれているあいだ、かけらは小さくなっていく
  const r = t => fragments(t)[0].r;
  assert.ok(r(0.05) > r(0.2) && r(0.2) > r(0.4));
  // 山を出たあとのかけらどうしは重ならない
  for (let n = 0; n < 1000; n++) {
    const fs = fragments(n / 1000).filter(f => Math.hypot(f.x - 12, f.y - 57) > 8);
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
      assert.ok(Math.hypot(fs[i].x - fs[j].x, fs[i].y - fs[j].y) >= fs[i].r + fs[j].r - 1e-9, 't = ' + n / 1000 + ' でかけらが重なる');
    }
  }
});

test('we-front-move: 前線は記号の向き（上）へ進み、動く量は 寒冷 ＞ 温暖 ＞ 停滞。t = 0 は静止図と同じ', () => {
  const most = kind => {
    let m = 0;
    for (let n = 0; n < 200; n++) m = Math.max(m, Math.abs(earth.frontShift(n / 200, kind, { cold: 14, warm: 8, stationary: 0, occluded: 6 }[kind])));
    return m;
  };
  assert.ok(most('cold') > most('warm') && most('warm') > most('stationary') && most('occluded') > most('stationary'));
  assert.ok(earth.frontShift(0.5, 'cold', 14) < 0, '寒冷前線が上（記号の向き）へ進まない');
  // t = 0 の前線の線と記号は静止図と同じ（静止図は 0.1 に丸めてある）
  const card = lessonOf('weather.js', 'weather-3-c3');
  const shapes = list => list.filter(it => it.type === 'polygon' || (it.type === 'line' && !it.dashed));
  const got = shapes(items('we-front-move', 0)), want = shapes(card.figure.items);
  assert.equal(got.length, want.length);
  got.forEach((it, i) => {
    assert.equal(it.type, want[i].type);
    assert.equal(it.fill || it.color, want[i].fill || want[i].color);
    it.points.forEach((p, j) => assert.ok(near(p[0], want[i].points[j][0], 0.06) && near(p[1], want[i].points[j][1], 0.06), i + ' 番目の点 ' + j));
  });
  // 進んでいるときは、もとの位置にうすい点線が残る
  assert.ok(items('we-front-move', 0.8).some(it => it.type === 'line' && it.dashed && it.points[0][1] === 50));
});

test('sp-noon-altitude: t = 0 で 78.4°（夏至）、0.25・0.75 で 55°、0.5 で 31.6°（冬至）。いまの太陽は天球の少し内側を動き、文字にかからない', () => {
  assert.ok(near(earth.noonAltitude(0), 78.4));
  assert.ok(near(earth.noonAltitude(0.25), 55));
  assert.ok(near(earth.noonAltitude(0.5), 31.6));
  assert.ok(near(earth.noonAltitude(0.75), 55));
  for (let n = 0; n < 1000; n++) {
    const t = n / 1000, list = items('sp-noon-altitude', t);
    const sun = list.find(it => it.type === 'circle' && it.fill === 'yellow' && Math.hypot(it.x - 150, it.y - 200) < 130);
    assert.ok(near(Math.hypot(sun.x - 150, sun.y - 200), earth.NOON_NOW_R, 1e-9));
    assert.ok(near(Math.atan2(200 - sun.y, sun.x - 150) * 180 / Math.PI, earth.noonAltitude(t), 1e-9));
    // いまの太陽と観測地点からの線は、どの文字の箱にもかからない
    const line = list.find(it => it.type === 'line' && it.color === 'orange');
    list.filter(it => it.type === 'text').forEach(tx => {
      const b = textBox(tx);
      const cx = Math.max(b.left, Math.min(sun.x, b.right)), cy = Math.max(b.top, Math.min(sun.y, b.bottom));
      assert.ok(Math.hypot(cx - sun.x, cy - sun.y) >= sun.r, 't = ' + t + ' で太陽が「' + tx.text + '」にかかる');
      for (let k = 0; k <= 20; k++) {
        const x = lerpPt(line.points, k / 20, 0), y = lerpPt(line.points, k / 20, 1);
        assert.ok(!(x > b.left && x < b.right && y > b.top && y < b.bottom), 't = ' + t + ' で線が「' + tx.text + '」の上を通る');
      }
    });
  }
  assert.ok(findText('sp-noon-altitude', 0, 'いまの南中高度 78.4°'));
  assert.ok(findText('sp-noon-altitude', 0.5, 'いまの南中高度 31.6°'));
  assert.equal(findText('sp-noon-altitude', 0.5, '冬至 31.6°').color, 'blue');
  assert.equal(findText('sp-noon-altitude', 0.25, '春分・秋分 55°').color, 'blue');
  // 「春分・秋分 55°」が青い時間は 1 周の 1 割以上（2 回ある）
  let blue = 0;
  for (let n = 0; n < 1000; n++) if (findText('sp-noon-altitude', n / 1000, '春分・秋分 55°').color === 'blue') blue++;
  assert.ok(blue >= 100, '春分・秋分が青い時間 ' + blue / 1000);
});

test('sp-sunspot: 黒点は 12 日で経度 160° 進み（自転の周期 約 27 日）、左のふちの近く（1 日目）から右のふちの近く（13 日目）へ。真ん中では円（rx = ry = 6）、ふちでは細長い', () => {
  const spot = t => items('sp-sunspot', t).find(it => it.type === 'ellipse' && it.x > 110 && it.x < 210);
  const rest = anim.restT('sp-sunspot');
  assert.ok(near(spot(rest).x, 160, 1e-9) && near(spot(rest).rx, 6, 1e-9) && spot(rest).ry === 6 && spot(rest).y === 112);
  assert.ok(findText('sp-sunspot', rest, '7 日目'));
  // 1 日目 −80°・13 日目 +80°（12 日で 160°。1 日に 13.3° なので 360° は 27 日）
  assert.ok(near(earth.sunspotPhi(0), -80) && near(earth.sunspotPhi(0.85), 80) && near(earth.sunspotPhi(rest), 0));
  assert.ok(Math.abs(360 / (160 / 12) - 27) < 0.1);
  const half = Math.sqrt(46 * 46 - 64) - 2;   // 黒点の高さ（y 112）で見える円の半径から 2 引いた所まで
  assert.ok(near(spot(0).x, 160 - half * Math.sin(80 * Math.PI / 180), 1e-9));
  assert.ok(findText('sp-sunspot', 0, '1 日目') && findText('sp-sunspot', 0.85, '13 日目'));
  // 左右の太陽の 1 日目・13 日目の黒点も、同じ ±80° の位置
  const spots = items('sp-sunspot', rest).filter(it => it.type === 'ellipse');
  assert.ok(near(spots[0].x - 56, spot(0).x - 160, 1e-9) && near(spots[2].x - 264, spot(0.85).x - 160, 1e-9));
  // 黒点は太陽の円の中、左から右へ進み、中央ほど丸い（横の半径は 6·cos φ）
  let prevX = -Infinity;
  for (let n = 0; n <= 85; n++) {
    const s = spot(n / 100);
    assert.ok(s.x >= prevX - 1e-9);
    prevX = s.x;
    assert.ok(s.rx <= 6 + 1e-9 && s.rx > 0);
    assert.ok(Math.hypot(s.x + s.rx - 160, s.y - 120) <= 46 && Math.hypot(s.x - s.rx - 160, s.y - 120) <= 46, '黒点が太陽の外');
  }
  assert.ok(spot(0.2).rx < spot(0.4).rx);
});

const KINDS_B = EXPECTED.slice(12);
// 折れ線 pts の割合 k の点の x（i = 0）または y（i = 1）。2 点の線だけで使う
function lerpPt(pts, k, i) { return pts[0][i] + (pts[pts.length - 1][i] - pts[0][i]) * k; }

test('B の kind: 各 t で文字（text）どうしが重ならず、場面（320×240）の中にある', () => {
  KINDS_B.forEach(kind => {
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

test('B の kind: 矢印（arrow）の両はしが場面（320×240）の中にある', () => {
  KINDS_B.forEach(kind => {
    for (let i = 0; i < 100; i++) {
      items(kind, i / 100).filter(it => it.type === 'arrow').forEach(a => [[a.x1, a.y1], [a.x2, a.y2]].forEach(([x, y]) =>
        assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 240, kind + ' t = ' + i / 100 + ' の矢印のはし ' + x + ',' + y)));
    }
  });
});

// ================================================================
// ミニプリント（1nen）。docs/plans/mp-figures-1nen.md の「動く図（新規）」
// ================================================================

const MP_KINDS = EXPECTED_MP;
const MP_CARDS = {
  'vo-focus-epicenter': ['volcano.js', 'volcano-mp3-c1'], 'vo-tremor-record': ['volcano.js', 'volcano-mp3-c2'],
  'vo-ps-80km': ['volcano.js', 'volcano-mp3-c3'], 'vo-fault-uplift': ['volcano.js', 'volcano-mp4-c2'],
  'sr-sort-deposit': ['strata.js', 'strata-mp1-c2'], 'sr-continent-drift': ['strata.js', 'strata-mp2-c4'],
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

test('vo-focus-epicenter: t = 0 に静止図の輪（半径 40・70）がある。輪が震央・観測地点に届いた直後だけ、その丸が大きくなる', () => {
  const rings0 = items('vo-focus-epicenter', 0).filter(it => it.type === 'circle' && it.fill === 'none').map(c => c.r);
  assert.deepEqual(rings0, [40, 70]);
  const epi = (t) => items('vo-focus-epicenter', t).find(it => it.type === 'circle' && it.fill === 'orange').r;
  const obs = (t) => items('vo-focus-epicenter', t).find(it => it.type === 'circle' && it.fill === 'blue').r;
  assert.equal(epi(0), 6); assert.equal(obs(0), 5);
  let epiBig = 0, obsBig = 0;
  for (let i = 0; i < 1000; i++) { if (epi(i / 1000) > 6) epiBig++; if (obs(i / 1000) > 5) obsBig++; }
  assert.ok(epiBig > 0 && epiBig < 300 && obsBig > 0 && obsBig < 300);
  // 弧は地表（y 70）より下・y 240 より上
  for (let t = 0; t < 1; t += 0.02) {
    items('vo-focus-epicenter', t).filter(it => it.type === 'line' && it.color === 'gray' && !it.dashed)
      .forEach(l => l.points.forEach(([, y]) => assert.ok(y >= 70 - 1e-9 && y <= 240 + 1e-9, 't = ' + t + ' の y = ' + y)));
  }
});

test('vo-tremor-record: ペン先が通った所から文字が出る。止まった絵の線は静止図の線と同じ', () => {
  const has = (t, s) => texts('vo-tremor-record', t).some(it => it.text === s);
  const pen = (t) => 20 + 284 * Math.min(1, t / 0.9);
  for (let t = 0; t < 0.9; t += 0.01) {
    if (has(t, 'P 波が着く')) assert.ok(pen(t) >= 70);
    if (has(t, 'S 波が着く')) assert.ok(pen(t) >= 150);
    if (has(t, '主要動')) assert.ok(pen(t) >= 200);
  }
  assert.ok(!has(0, 'P 波が着く'));
  const card = mpLesson('volcano.js', 'volcano-mp3-c2');
  const st = card.figure.items.find(it => it.type === 'line' && it.color === 'ink');
  assert.deepEqual(items('vo-tremor-record', 0.99).find(it => it.type === 'line' && it.color === 'ink').points, st.points);
});

test('vo-ps-80km: 80 km の高さの帯は P 波（10 秒・x 98）から S 波（20 秒・x 146）まで。止まった絵で「10 秒」が出る', () => {
  const band = (t) => items('vo-ps-80km', t).find(it => it.type === 'line' && it.color === 'orange');
  assert.equal(band(0), undefined);
  assert.deepEqual(band(0.99).points, [[98, 136], [146, 136]]);
  assert.ok(findText('vo-ps-80km', 0.99, '10 秒'));
  // P 波の線 (50,200)→(170,40) は 80 km（y 136）で x 98、S 波の線 (50,200)→(290,40) は x 146
  assert.ok(near(50 + (200 - 136) * 120 / 160, 98) && near(50 + (200 - 136) * 240 / 160, 146));
});

test('vo-fault-uplift: はじめは 2 つの地面が同じ高さ（y 130）。止まった絵で左が y 120（隆起）、右が y 140（沈降）', () => {
  const tops = (t) => items('vo-fault-uplift', t).filter(it => it.type === 'polygon').map(p => p.points[0][1]);
  assert.deepEqual(tops(0), [130, 130]);
  assert.deepEqual(tops(0.99), [120, 140]);
  assert.equal(items('vo-fault-uplift', 0).filter(it => it.type === 'arrow').length, 0);
});

test('sr-sort-deposit: 止まった絵の粒は静止図と同じ位置。れき・砂・泥の順に流れ出し、粒の文字は積もってから出る', () => {
  const card = mpLesson('strata.js', 'strata-mp1-c2');
  const st = card.figure.items.filter(it => it.type === 'circle').map(c => [c.x, c.y, c.r]);
  assert.deepEqual(items('sr-sort-deposit', 0.99).filter(it => it.type === 'circle').map(c => [c.x, c.y, c.r]), st);
  const count = (t, r) => items('sr-sort-deposit', t).filter(it => it.type === 'circle' && it.r === r).length;
  assert.equal(count(0.1, 6), 3); assert.equal(count(0.1, 3), 0); assert.equal(count(0.1, 2), 0);
  assert.ok(!findText('sr-sort-deposit', 0.3, '泥'));
});

test('sr-continent-drift: はじめは 2 つの大陸が寄って重なり、止まった絵で静止図の位置まで離れる', () => {
  const xs = (t) => items('sr-continent-drift', t).filter(it => it.type === 'polygon').map(p => p.points[0][0]);
  assert.deepEqual(xs(0), [102, 164]);
  assert.deepEqual(xs(0.99), [90, 176]);
});

// ================================================================
// ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」
// ================================================================

const MP2_KINDS = EXPECTED_MP2;
const MP2_CARDS = {
  'we-dew-point-graph': ['weather.js', 'weather-mp4-c2'], 'we-rising-air': ['weather.js', 'weather-mp7-c1'],
  'we-water-cycle': ['weather.js', 'weather-mp7-c2'], 'we-isobar-wind': ['weather.js', 'weather-mp8-c1'],
  'we-pressure-section': ['weather.js', 'weather-mp8-c2'], 'we-ocean-current': ['weather.js', 'weather-mp9-c2'],
  'we-cold-front-section': ['weather.js', 'weather-mp10-c1'], 'we-warm-front-section': ['weather.js', 'weather-mp10-c2'],
  'we-tank-density': ['weather.js', 'weather-mp10-c3'], 'we-front-passage-graph': ['weather.js', 'weather-mp11-c1'],
  'we-cyclone-move': ['weather.js', 'weather-mp11-c2'], 'we-winter-monsoon': ['weather.js', 'weather-mp12-c1'],
  'we-spring-3days': ['weather.js', 'weather-mp13-c1'], 'we-typhoon-path': ['weather.js', 'weather-mp13-c3'],
  'we-sea-land-breeze': ['weather.js', 'weather-mp14-c1'], 'we-global-wind': ['weather.js', 'weather-mp14-c2'],
};
// 天気の単元に使い回しのカードはない（計画の「もとにする kind」はすべて電流・生命・化学変化）
const MP2_SHARED = {};

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

// 点 (x, y) から折れ線 pts までのいちばん近い距離
function distToPath(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const L2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const k = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2));
    best = Math.min(best, Math.hypot(x - ax - k * (bx - ax), y - ay - k * (by - ay)));
  }
  return best;
}
// 静止図の部品のうち、type・座標・色が同じものが止まった絵にあるか（文字以外）
function sameShapes(kind, id, pick) {
  const fig = mpLesson('weather.js', id).figure.items.filter(pick);
  const rest = items(kind, anim.restT(kind)).filter(pick);
  fig.forEach(st => assert.ok(rest.some(it => JSON.stringify(it) === JSON.stringify(st)), kind + ' の止まった絵に ' + JSON.stringify(st) + ' がない'));
}

test('we-dew-point-graph: 点は A から左へ動いて曲線にぶつかり（そこで「露点」）、曲線にそって 5 ℃ まで下がる。止まった絵の棒と点線は静止図と同じ', () => {
  const dot = t => items('we-dew-point-graph', t).find(it => it.type === 'circle' && it.fill === 'blue');
  assert.ok(near(dot(0).x, 275) && near(dot(0).y, 128));
  assert.ok(near(dot(0.4).x, 181.3) && near(dot(0.4).y, 128));
  assert.equal(findText('we-dew-point-graph', 0.3, '露点'), undefined);
  assert.ok(findText('we-dew-point-graph', 0.45, '露点'));
  const curve = mpLesson('weather.js', 'weather-mp4-c2').figure.items.find(it => it.type === 'line' && it.color === 'blue').points;
  [0.5, 0.6, 0.7].forEach(t => assert.ok(distToPath(dot(t).x, dot(t).y, curve) < 0.6, 't = ' + t + ' の点が曲線の上にない'));
  sameShapes('we-dew-point-graph', 'weather-mp4-c2', it => it.type === 'line' && (it.color === 'orange' || it.dashed));
  assert.ok(findText('we-dew-point-graph', 0.99, '空気の温度 5 ℃') && findText('we-dew-point-graph', 0, '空気の温度 30 ℃'));
  assert.ok(findText('we-dew-point-graph', 0.42, '空気の温度 17.5 ℃'));   // 露点で止まっているあいだ
  for (let i = 0; i <= 100; i++) {   // 温度は四捨五入（17 ℃ と切り捨てない）。露点のほかは整数
    const s = items('we-dew-point-graph', i / 100).find(it => it.type === 'text' && /^空気の温度/.test(it.text)).text;
    assert.match(s, /^空気の温度 (\d+|17\.5) ℃$/, s);
  }
});

test('we-rising-air: t = 0 の印は静止図と同じ位置と種類。印はいつも高さで ○（y 160 より下）・●・×（y 90 より上）に分かれ、かたまりは上がるほど大きい', () => {
  sameShapes('we-rising-air', 'weather-mp7-c1', it => it.type === 'circle' || (it.type === 'line' && it.width === 2));
  for (let i = 0; i < 50; i++) {
    items('we-rising-air', i / 50).filter(it => it.type === 'circle' && it.r === 5).forEach(c => {
      if (c.fill === 'white') assert.ok(c.y > 160); else assert.ok(c.y >= 90 && c.y <= 160);
    });
  }
  const parcel = t => items('we-rising-air', t).find(it => it.type === 'circle' && it.stroke === 'line');
  assert.ok(parcel(0.3).y < parcel(0.6).y && parcel(0.3).r > parcel(0.6).r);
});

test('we-water-cycle: 粒は蒸発（白）・降水・川（青）の 3 本の矢印の上を流れる', () => {
  const arrows = [[[70, 184], [130, 76]], [[236, 84], [252, 140]], [[200, 196], [136, 214]]];
  [0, 0.3, 0.7].forEach(t => {
    const dots = items('we-water-cycle', t).filter(it => it.type === 'circle' && it.r === 3.5);
    assert.equal(dots.length, 10);
    dots.forEach(d => assert.ok(arrows.some(a => distToPath(d.x, d.y, a) < 1e-6)));
    dots.filter(d => distToPath(d.x, d.y, arrows[0]) < 1e-6).forEach(d => assert.equal(d.fill, 'white'));
  });
});

test('we-isobar-wind: t = 0 に粒が S (161,120) にある。粒ははじめ右（等圧線に直角）へ進み、先では実際の風の矢印の向きになる', () => {
  const dots = t => items('we-isobar-wind', t).filter(it => it.type === 'circle' && it.fill === 'white');
  assert.ok(dots(0).some(d => near(d.x, 161) && near(d.y, 120)));
  const a = dots(0.01)[0], b = dots(0.02)[0];
  assert.ok(b.x - a.x > 10 * Math.abs(b.y - a.y), 'はじめは右へ');
  const c = dots(0.97)[0], d = dots(0.98)[0];
  const cross = (d.x - c.x) * 32 - (d.y - c.y) * 43;
  assert.ok(Math.abs(cross) < 0.2 * Math.hypot(d.x - c.x, d.y - c.y) * Math.hypot(43, 32), '先が実際の風の向きでない');
});

test('we-pressure-section: A の粒は下がって左右へ、B の粒は左右から集まって上がる。t = 0 の雲は静止図と同じ大きさ', () => {
  const dots = t => items('we-pressure-section', t).filter(it => it.type === 'circle');
  const a = dots(0.3), b = dots(0.31);
  assert.equal(a.length, 12);
  a.forEach((d, i) => {
    if (d.x === 80 && b[i].x === 80) assert.ok(b[i].y > d.y, 'A の粒が下がらない');
    if (d.x === 240 && b[i].x === 240) assert.ok(b[i].y < d.y, 'B の粒が上がらない');
  });
  const cloud = items('we-pressure-section', 0).find(it => it.type === 'ellipse');
  assert.deepEqual([cloud.x, cloud.y, cloud.rx, cloud.ry], [240, 40, 50, 18]);
});

test('we-ocean-current: 点は 4 本の海流の線の上で、暖流は赤いふち・寒流は青いふち', () => {
  const lines = items('we-ocean-current', 0).filter(it => it.type === 'line' && it.width === 4);
  assert.equal(lines.length, 4);
  [0, 0.4, 0.8].forEach(t => {
    const dots = items('we-ocean-current', t).filter(it => it.type === 'circle');
    assert.equal(dots.length, 16);
    dots.forEach(d => assert.ok(lines.some(l => l.color === d.stroke && distToPath(d.x, d.y, l.points) < 1e-6)));
  });
});

test('we-cold-front-section: 寒気のくさびは右へ 24 進み、積乱雲は ry 10 → 34。止まった絵は静止図と同じ', () => {
  const wedge = t => items('we-cold-front-section', t).find(it => it.type === 'polygon' && it.fill === 'sky').points;
  assert.equal(wedge(0)[1][0], 136);
  sameShapes('we-cold-front-section', 'weather-mp10-c1', it => it.type === 'polygon' || it.type === 'ellipse');
  const cloud = t => items('we-cold-front-section', t).find(it => it.type === 'ellipse').ry;
  assert.equal(cloud(0), 10);
  assert.ok(cloud(0.4) > 10 && cloud(0.4) < 34);
});

test('we-warm-front-section: 乱層雲は rx 0 → 56 に広がり、雨は雲が広がってから雲の下に降る。止まった絵は静止図と同じ', () => {
  const cloud = t => items('we-warm-front-section', t).find(it => it.type === 'ellipse');
  assert.equal(cloud(0).rx, 0);
  sameShapes('we-warm-front-section', 'weather-mp10-c2', it => it.type === 'polygon' || it.type === 'ellipse');
  const rain = t => items('we-warm-front-section', t).filter(it => it.type === 'circle' && it.r === 2);
  assert.equal(rain(0.2).length, 0);
  assert.ok(rain(0.9).length > 0);
  rain(0.9).forEach(d => assert.ok(Math.abs(d.x - 204.8) < 56 && d.y > 80 && d.y < 120));
});

test('we-tank-density: はじめは右半分が冷水でしきりがある。止まった絵は冷水が下半分（y 130〜200）', () => {
  const blue = t => items('we-tank-density', t).find(it => it.type === 'polygon').points;
  const box = pts => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  assert.deepEqual(box(blue(0.05)), [160, 60, 280, 200]);
  assert.deepEqual(box(blue(0.99)), [40, 130, 280, 200]);
  const wall = t => items('we-tank-density', t).some(it => it.type === 'line' && it.width === 4);
  assert.ok(wall(0.05) && !wall(0.3));
  // 冷水の先（底）は上の面より先に左の壁に着く
  const p = blue(0.4);
  assert.ok(p[3][0] < p[0][0]);
});

test('we-front-passage-graph: 気温の線は左から伸び、風向の文字は線の先の時刻まで。線が x 157 をこえてから「寒冷前線が通過」', () => {
  const wind = t => texts('we-front-passage-graph', t).filter(it => it.y === 28 || it.y === 44).length;
  assert.equal(wind(0), 1);
  assert.equal(wind(0.99), 10);
  for (let i = 0; i < 99; i++) assert.ok(wind((i + 1) / 100) >= wind(i / 100));
  assert.equal(findText('we-front-passage-graph', 0.35, '寒冷前線が通過'), undefined);   // x 142
  assert.ok(findText('we-front-passage-graph', 0.45, '寒冷前線が通過'));                 // x 171.6
  sameShapes('we-front-passage-graph', 'weather-mp11-c1', it => it.type === 'line');
});

test('we-cyclone-move: 低気圧の中心・前線・文字はそろって西から東へ 24 動き、止まった絵が静止図の位置', () => {
  const low = t => findText('we-cyclone-move', t, '低').x;
  assert.equal(low(0), 116);
  for (let i = 0; i < 80; i++) assert.ok(low((i + 1) / 100) >= low(i / 100));
  const front = t => items('we-cyclone-move', t).find(it => it.type === 'line' && it.color === 'red').points;
  assert.ok(near(front(0.4)[0][0] - 150, low(0.4) - 140));
  sameShapes('we-cyclone-move', 'weather-mp11-c2', it => it.type === 'line' || (it.type === 'polygon' && it.fill !== '#FBE3EC'));
  assert.equal(findText('we-cyclone-move', 0.5, '上が北').x, 316);   // 方位は動かさない
});

test('we-winter-monsoon: 粒は道すじの上で、大陸では青、山をこえた B 側では灰色。雪は A 側（x 220 まで）だけに降る', () => {
  const path = [[8, 110], [62, 110], [80, 150], [150, 137], [188, 160], [214, 108], [234, 92], [254, 108], [278, 162]];
  for (let i = 0; i < 40; i++) {
    const list = items('we-winter-monsoon', i / 40);
    const dots = list.filter(it => it.type === 'circle' && it.r === 4);
    assert.equal(dots.length, 8);
    dots.forEach(d => {
      assert.ok(distToPath(d.x, d.y, path) < 1e-6);
      if (d.x < 60) assert.equal(d.fill, '#1A5CFF');
      if (d.x > 262) assert.equal(d.fill, '#8A94A6');
    });
    list.filter(it => it.type === 'circle' && it.r === 2.5).forEach(s => assert.ok(s.x <= 220 && s.y >= 100));
  }
});

test('we-spring-3days: 1 日目 → 2 日目 → 3 日目のこまを順に太わくで囲み、0.9 からあとは囲まない。止まった絵は静止図と同じ', () => {
  const frameX = t => { const f = items('we-spring-3days', t).find(it => it.type === 'line' && it.color === 'blue'); return f ? f.points[0][0] : null; };
  assert.deepEqual([0.1, 0.4, 0.7, 0.95].map(frameX), [6, 110, 214, null]);
  sameShapes('we-spring-3days', 'weather-mp13-c1', it => it.type === 'circle' || it.type === 'rect' || it.type === 'line');
  // 2 日目の高は 1 日目と同じこまの中の位置（x 128）からすべる
  assert.ok(near(items('we-spring-3days', 0.3).filter(it => it.type === 'circle')[1].x, 128));
});

test('we-typhoon-path: 台風の丸は t = 0 で静止図の (140,208)、進路の点線の上を進んで 0.8 からあとは先 (304,100) にいる', () => {
  const path = [[150, 238], [140, 208], [152, 182], [196, 150], [252, 120], [304, 100]];
  const ty = t => items('we-typhoon-path', t).find(it => it.type === 'circle');
  assert.deepEqual([ty(0).x, ty(0).y], [140, 208]);
  for (let i = 0; i < 80; i++) assert.ok(distToPath(ty(i / 100).x, ty(i / 100).y, path) < 1e-6);
  assert.ok(near(ty(0.85).x, 304) && near(ty(0.85).y, 100));
  // うずの線は丸の中
  items('we-typhoon-path', 0.4).filter(it => it.type === 'line' && it.width === 2).forEach(l =>
    l.points.forEach(p => assert.ok(Math.hypot(p[0] - ty(0.4).x, p[1] - ty(0.4).y) <= 12)));
});

test('we-sea-land-breeze: 昼は地表を海 → 陸（右へ）、夜は地表を陸 → 海（左へ）流れる', () => {
  const dots = t => items('we-sea-land-breeze', t).filter(it => it.type === 'circle');
  const a = dots(0.2), b = dots(0.21);
  assert.equal(a.length, 12);
  a.forEach((d, i) => {
    if (d.y !== 98 || b[i].y !== 98) return;
    if (d.x < 160) assert.ok(b[i].x > d.x, '昼の地表の風が海 → 陸でない');
    else assert.ok(b[i].x < d.x, '夜の地表の風が陸 → 海でない');
  });
});

test('we-global-wind: 赤道（x 50）では粒が上がり、中緯度（x 130）では下がり、偏西風の矢印の上では右へ流れる', () => {
  const dots = t => items('we-global-wind', t).filter(it => it.type === 'circle');
  const a = dots(0.3), b = dots(0.31);
  assert.equal(a.length, 9);
  a.forEach((d, i) => {
    if (d.x === 50 && b[i].x === 50) assert.ok(b[i].y < d.y);
    if (d.x === 130 && b[i].x === 130) assert.ok(b[i].y > d.y);
    if (d.y === 172 && b[i].y === 172 && b[i].x > d.x - 50) assert.ok(b[i].x > d.x);
  });
});

// ================================================================
// ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」と「動く図（使い回し）」
// ================================================================

const MP3_CARDS = {
  'sp-earth-spin': ['space.js', 'space-mp2-c2'], 'sp-ecliptic': ['space.js', 'space-mp3-c3'], 'sp-four-sky': ['space.js', 'space-mp5-c1'],
  'sp-local-direction': ['space.js', 'space-mp6-c1'], 'sp-night-at-a': ['space.js', 'space-mp6-c2'], 'sp-star-hour': ['space.js', 'space-mp7-c1'],
  'sp-geo-helio': ['space.js', 'space-mp8-c1'], 'sp-inner-outer': ['space.js', 'space-mp9-c1'], 'sp-eclipse-line': ['space.js', 'space-mp10-c2'],
};
// カード id → [単元のファイル, 使い回す kind]（計画の「動く図（使い回し）」。kind を増やさず既存の kind をそのまま使う）
const MP3_SHARED = {
  'space-mp2-c3': ['space.js', 'sp-rotation'], 'space-mp4-c1': ['space.js', 'sp-noon-altitude'], 'space-mp4-c2': ['space.js', 'sp-seasons'],
  'space-mp5-c2': ['space.js', 'sp-orbit-midnight'], 'space-mp10-c1': ['space.js', 'sp-moon-phase'],
};

test('ミニプリント（3nen）: カードがその kind を使い、静止図の text・label が frame(kind, restT) に同じ text・x・y で入っている', () => {
  assert.deepEqual(Object.keys(MP3_CARDS), EXPECTED_MP3);
  EXPECTED_MP3.forEach(kind => {
    const [file, id] = MP3_CARDS[kind];
    const card = mpLesson(file, id);
    assert.ok(card, id + ' がない');
    assert.equal(card.anim, kind, id + ' の anim');
    const rest = texts(kind, anim.restT(kind));
    card.figure.items.filter(it => it.type === 'text' || it.type === 'label').forEach(st => {
      assert.ok(rest.some(it => it.text === st.text && it.x === st.x && it.y === st.y),
        kind + ' の止まった絵に静止図の文字「' + st.text + '」(' + st.x + ',' + st.y + ') がない');
    });
  });
});

test('ミニプリント（3nen）: 各 t で文字（text）が場面の中にあり、文字どうしが重ならず（静止図にある文字どうしの重なりは静止図のまま見ない）、矢印（arrow）の両はしが場面の中にある', () => {
  EXPECTED_MP3.forEach(kind => {
    const [file, id] = MP3_CARDS[kind];
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

test('ミニプリント（3nen）: 内容が同じカードは、既存の kind を使い回す（新しい kind を足さない）', () => {
  Object.keys(MP3_SHARED).forEach(id => {
    const [file, kind] = MP3_SHARED[id];
    const card = mpLesson(file, id);
    assert.ok(card, id + ' がない');
    assert.equal(card.anim, kind, id + ' の anim');
    assert.ok(earth.KINDS.includes(kind) && !EXPECTED_MP3.includes(kind), kind);
  });
});

test('sp-earth-spin: 経線は 4 本で地球の円（半径 70）の中、手前の経線は西 → 東（左 → 右）へ動く。t = 0 は 45° ごと', () => {
  assert.deepEqual(earth.spinMeridians(0), [-67.5, -22.5, 22.5, 67.5]);
  for (let i = 0; i < 40; i++) {
    const lines = items('sp-earth-spin', i / 40).filter(it => it.type === 'line' && it.color === 'line');
    assert.equal(lines.length, 4);
    lines.forEach(l => l.points.forEach(([x, y]) => assert.ok(Math.hypot(x - 150, y - 125) <= 70 + 1e-9)));
  }
  // まん中あたりの経線（赤道の点）の x がふえる
  const mid = t => items('sp-earth-spin', t).filter(it => it.type === 'line' && it.color === 'line')[2].points[9][0];
  assert.ok(mid(0.1) > mid(0));
});

test('sp-ecliptic: 地球 → 太陽の点線は太陽の中心を通り、その先の星座が orange。A さそり座・B ペガスス座・C オリオン座・D しし座', () => {
  [[0, 'A', 'さそり座'], [0.25, 'B', 'ペガスス座'], [0.5, 'C', 'オリオン座'], [0.75, 'D', 'しし座']].forEach(([t, at, star]) => {
    const list = items('sp-ecliptic', t);
    assert.ok(list.some(it => it.type === 'text' && it.text === '地球が ' + at + ' のとき、太陽は' + star + 'の方向に見える'), 't = ' + t);
    assert.deepEqual(list.filter(it => it.type === 'text' && it.color === 'orange').map(it => it.text), [star], 't = ' + t);
  });
  for (let i = 0; i < 40; i++) {
    const [[x1, y1], [x2, y2]] = earth.eclipticLine(360 * i / 40);
    assert.ok(Math.abs((x2 - x1) * (120 - y1) - (y2 - y1) * (160 - x1)) < 1e-6, '点線が太陽の中心を通らない');
  }
  assert.deepEqual(earth.eclipticLine(0).map(p => p.map(v => Math.round(v * 1e6) / 1e6)), [[212, 120], [40, 120]]);   // 静止図の点線
});

test('sp-four-sky: 星の点は 11 個で、それぞれの線の上を t = 0 の始めから 0.8 で終わりまで進む', () => {
  const stars = t => items('sp-four-sky', t).filter(it => it.type === 'circle' && it.fill === 'yellow' && it.r === 4);
  const lines = items('sp-four-sky', 0).filter(it => it.type === 'line' && it.color === 'blue');
  assert.equal(lines.length, 11);
  assert.equal(stars(0).length, 11);
  stars(0).forEach((s, i) => assert.ok(near(s.x, lines[i].points[0][0]) && near(s.y, lines[i].points[0][1])));
  stars(0.8).forEach((s, i) => { const e = lines[i].points[lines[i].points.length - 1]; assert.ok(near(s.x, e[0], 1e-6) && near(s.y, e[1], 1e-6)); });
});

test('sp-local-direction: 南の矢印は地球の中心から外向き、東・西の矢印はそれに直角（東は自転の向き）。t = 0 は夕方で静止図と同じ矢印', () => {
  for (let i = 0; i < 40; i++) {
    const arrows = items('sp-local-direction', i / 40).filter(it => it.type === 'arrow' && it.color === 'green');
    const [s, e, w] = arrows;
    assert.ok(Math.abs((s.x2 - 160) * (s.y1 - 120) - (s.y2 - 120) * (s.x1 - 160)) < 1e-6, '南が外向きでない');
    const sx = s.x2 - s.x1, sy = s.y2 - s.y1, ex = e.x2 - e.x1, ey = e.y2 - e.y1;
    assert.ok(Math.abs(sx * ex + sy * ey) < 1e-6 && near(ex, -(w.x2 - w.x1), 1e-6), '東・西が南に直角でない');
    assert.ok(sx * ey - sy * ex < 0, '東が自転（反時計回り）の向きでない');
  }
  const card = mpLesson('space.js', 'space-mp6-c1');
  assert.deepEqual(items('sp-local-direction', 0).filter(it => it.type === 'arrow' && it.color === 'green'), card.figure.items.filter(it => it.type === 'arrow' && it.color === 'green'));
  assert.ok(findText('sp-local-direction', 0.25, '真夜中の地点での方位') && !findText('sp-local-direction', 0.25, '真夜中'));
});

test('sp-night-at-a: 夕方・真夜中・明け方で止まり、南に見える星座はペガスス座 → オリオン座 → しし座。止まった絵（0.4）は静止図と同じ矢印', () => {
  [[0.05, '夕方', 'ペガスス座'], [0.4, '真夜中', 'オリオン座'], [0.8, '明け方', 'しし座']].forEach(([t, now, star]) => {
    assert.ok(findText('sp-night-at-a', t, '地球が A のときの' + now), 't = ' + t);
    assert.ok(findText('sp-night-at-a', t, 'いま南に見える: ' + star), 't = ' + t);
    assert.ok(findText('sp-night-at-a', t, '南') && findText('sp-night-at-a', t, '東'), 't = ' + t + ' の方位の文字');
  });
  assert.ok(!findText('sp-night-at-a', 0.22, '南'));   // 回っているあいだは方位の文字を出さない
  const card = mpLesson('space.js', 'space-mp6-c2');
  const green = list => list.filter(it => it.type === 'arrow' && it.color === 'green');
  assert.deepEqual(green(items('sp-night-at-a', 0.4)), green(card.figure.items));
  assert.equal(earth.nightAngle(0.05), 270);
  assert.equal(earth.nightAngle(0.8), 450);
});

test('sp-star-hour: 今夜は 20 時に P、1 時間に 15° 西へ。1 か月後は 18 時に P、20 時には 30° 西（同じ位置に見える時刻が 2 時間早い）', () => {
  const pos = t => { const s = earth.starHour(t); return [s.west, s.label]; };
  assert.deepEqual(pos(0.05), [0, '今夜 20 時']);
  assert.deepEqual(pos(0.2), [15, '今夜 21 時']);
  assert.deepEqual(pos(0.35), [30, '今夜 22 時']);
  assert.deepEqual(pos(0.5), [0, '1 か月後の 18 時']);
  assert.deepEqual(pos(0.9), [30, '1 か月後の 20 時']);
  for (let i = 0; i < 50; i++) {
    const star = items('sp-star-hour', i / 50).find(it => it.type === 'circle' && it.fill === 'white');
    assert.ok(near(Math.hypot(star.x - 160, star.y - 210), 150, 1e-9));
  }
});

test('sp-geo-helio: 左の太陽と右の地球は、それぞれの円（半径 50）の上を同じ角で反時計回りに回る', () => {
  for (let i = 0; i < 40; i++) {
    const list = items('sp-geo-helio', i / 40);
    const sun = list.find(it => it.type === 'circle' && it.r === 10), e = list.find(it => it.type === 'circle' && it.r === 8);
    assert.ok(near(sun.x - 80, e.x - 240) && near(sun.y - 110, e.y - 110));
    assert.ok(near(Math.hypot(sun.x - 80, sun.y - 110), 50));
  }
  const a = items('sp-geo-helio', 0.05).find(it => it.r === 8);
  assert.ok(a.y < 110);   // 反時計回り（右から上へ）
});

test('sp-inner-outer: 金星と太陽の角はいつも 34° 以下、火星は 180° 近くまで開き、そのとき「火星は真夜中にも見える」。t = 0 は静止図の位置', () => {
  let maxV = 0, maxM = 0;
  for (let i = 0; i < 400; i++) {
    const t = i / 400;
    maxV = Math.max(maxV, earth.elongation(t, 'venus'));
    maxM = Math.max(maxM, earth.elongation(t, 'mars'));
    const em = Math.round(earth.elongation(t, 'mars'));
    assert.equal(!!findText('sp-inner-outer', t, '火星は真夜中にも見える'), em >= 150, 't = ' + t);
  }
  assert.ok(maxV <= 34 && maxV > 30 && maxM > 175, maxV + ' ' + maxM);
  const v = earth.planetAt('venus', 0), m = earth.planetAt('mars', 0);
  assert.ok(near(v[0], 125.4, 0.05) && near(v[1], 100, 0.05) && near(m[0], 212, 0.05) && near(m[1], 29.9, 0.05));
});

test('sp-eclipse-line: 止まった絵（0.99）の月は静止図の位置。日食の段は一直線のときだけ月の影が地球に落ち、月食の段の月は影に入ると暗くなる', () => {
  const card = mpLesson('space.js', 'space-mp10-c2');
  const moons = list => list.filter(it => it.type === 'circle' && it.r === 7).map(it => [Math.round(it.x * 10) / 10, Math.round(it.y * 10) / 10]);
  assert.deepEqual(moons(items('sp-eclipse-line', 0.99)), moons(card.figure.items));
  const shadow = t => items('sp-eclipse-line', t).some(it => it.type === 'polygon' && it.points[0][1] < 84);
  assert.ok(!shadow(0) && shadow(0.99));
  const moon2 = t => items('sp-eclipse-line', t).filter(it => it.type === 'circle' && it.r === 7)[1].fill;
  assert.equal(moon2(0), '#FFD34D');
  assert.equal(moon2(0.99), '#59606B');
});
