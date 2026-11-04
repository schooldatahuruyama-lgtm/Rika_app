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
];
// 1 周がつながる kind（計画の各 kind の欄に「つながる」と書いたもの）
const LOOPING = ['vo-quake-spread', 'we-high-low', 'we-westerly',
  'sp-rotation', 'sp-orbit-midnight', 'sp-seasons', 'sp-moon-phase'];
const PERIOD_8000 = ['sp-rotation', 'sp-annual-orion', 'sp-orbit-midnight', 'sp-seasons', 'sp-moon-phase'];
const PREFIXES = ['vo-', 'sr-', 'we-', 'sp-'];

const items = (kind, t) => anim.frame(kind, t).items;
const texts = (kind, t) => items(kind, t).filter(it => it.type === 'text' || it.type === 'label');
const findText = (kind, t, s) => texts(kind, t).find(it => it.text === s);
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);

// item の座標の数（x 系と y 系）。points は [x, y] の組
const X_KEYS = ['x', 'x1', 'x2', 'cx'], Y_KEYS = ['y', 'y1', 'y2', 'cy'], SIZE_KEYS = ['r', 'rx', 'ry', 'width', 'height'];
function coords(it) {
  const out = [];
  X_KEYS.concat(Y_KEYS, SIZE_KEYS).forEach(k => { if (it[k] !== undefined) out.push(it[k]); });
  if (Array.isArray(it.points)) it.points.forEach(p => out.push(p[0], p[1]));
  return out;
}

test('anim-earth: KINDS は計画の 12 本で、名前は地学の単元の接頭辞で始まり、anim.KINDS に入っている', () => {
  assert.deepEqual(earth.KINDS, EXPECTED);
  earth.KINDS.forEach(kind => {
    assert.ok(PREFIXES.some(p => kind.startsWith(p)), kind + ' の接頭辞');
    assert.ok(anim.KINDS.includes(kind), kind + ' が anim.KINDS にない');
  });
  assert.equal(new Set(earth.KINDS).size, earth.KINDS.length);
});

test('anim-earth: 周期は天体の 1 周が 8000 ms、それ以外は 4000 ms。restT は計画どおり', () => {
  earth.KINDS.forEach(kind => assert.equal(anim.periodOf(kind), PERIOD_8000.includes(kind) ? 8000 : 4000, kind));
  const REST = { 'vo-seismogram': 0.99, 'vo-ps-graph': 0.99, 'we-cloud-form': 0.99 };
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
