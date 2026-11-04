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
// 1 周がつながる kind（計画の各 kind の欄に「つながる」と書いたもの）
const LOOPING = ['vo-quake-spread', 'we-high-low', 'we-westerly',
  'sp-rotation', 'sp-orbit-midnight', 'sp-seasons', 'sp-moon-phase', 'sp-noon-altitude'];
const PERIOD_8000 = ['sp-rotation', 'sp-annual-orion', 'sp-orbit-midnight', 'sp-seasons', 'sp-moon-phase', 'sp-noon-altitude', 'sp-sunspot'];
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

test('anim-earth: KINDS は計画の 16 本（優先度 A 12 本・B 4 本）で、名前は地学の単元の接頭辞で始まり、anim.KINDS に入っている', () => {
  assert.deepEqual(earth.KINDS, EXPECTED);
  earth.KINDS.forEach(kind => {
    assert.ok(PREFIXES.some(p => kind.startsWith(p)), kind + ' の接頭辞');
    assert.ok(anim.KINDS.includes(kind), kind + ' が anim.KINDS にない');
  });
  assert.equal(new Set(earth.KINDS).size, earth.KINDS.length);
});

test('anim-earth: 周期は天体の 1 周が 8000 ms、それ以外は 4000 ms。restT は計画どおり', () => {
  earth.KINDS.forEach(kind => assert.equal(anim.periodOf(kind), PERIOD_8000.includes(kind) ? 8000 : 4000, kind));
  const REST = { 'vo-seismogram': 0.99, 'vo-ps-graph': 0.99, 'we-cloud-form': 0.99, 'sr-erosion-flow': 0.99, 'sp-sunspot': 0.425 };
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
