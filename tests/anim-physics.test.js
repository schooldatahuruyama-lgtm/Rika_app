// tests/anim-physics.test.js — 解説の動く図（物理: js/anim-physics.js）。docs/anim-plan.md 3-5 の 2 と 5 章の「テスト」
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const physics = require('../js/anim-physics.js');
const figures = require('../js/figures.js');

// 計画 5 章の優先度 A（11 本）と優先度 B（10 本）
const KINDS_A = ['so-air-wave', 'so-light-vs-sound', 'so-amplitude', 'so-frequency', 'fo-spring-stretch',
  'el-series-parallel', 'el-induction', 'mo-resultant', 'mo-slope-accel', 'mo-inertia', 'mo-pendulum'];
const KINDS_B = ['so-string-phone', 'fo-friction', 'fo-hooke-graph', 'fo-balance', 'el-heat-rise', 'el-static-charge',
  'mo-slope-split', 'mo-buoyancy', 'mo-action-reaction', 'mo-pulley'];
// ミニプリント（1nen）の 6 本（docs/plans/mp-figures-1nen.md。光の li-lens-cover もこのファイルで足す）
const KINDS_MP = ['li-lens-cover', 'so-fork-stop', 'so-resonance', 'so-amp-freq', 'fo-three-effects', 'fo-normal-friction'];
// ミニプリント（2nen）の 7 本（docs/plans/mp-figures-2nen.md）
const KINDS_MP2 = ['el-cathode-bend', 'el-compass-around', 'el-wire-field', 'el-coil-field', 'el-wire-force', 'el-motor-rotate', 'el-dc-ac'];
// ミニプリント（3nen）の 12 本（docs/plans/mp-figures-3nen.md）
const KINDS_MP3 = ['mo-water-pressure', 'mo-buoyancy-depth', 'mo-angle-resultant', 'mo-compose-steps', 'mo-split-steps', 'mo-timer-tape',
  'mo-friction-slow', 'mo-uniform-graph', 'mo-inertia-start', 'mo-pulley-compare', 'mo-lever', 'mo-ball-block'];
const KINDS = KINDS_A.concat(KINDS_B, KINDS_MP, KINDS_MP2, KINDS_MP3);
// 振動・回転・流れの kind（frame(kind, 0) と frame(kind, 0.99999) がつながる）
const LOOPS = ['so-air-wave', 'so-amplitude', 'so-frequency', 'el-series-parallel', 'el-induction',
  'mo-resultant', 'mo-inertia', 'mo-pendulum',
  'so-string-phone', 'fo-balance', 'mo-slope-split', 'mo-pulley',
  'so-fork-stop', 'so-amp-freq',
  'el-cathode-bend', 'el-compass-around', 'el-wire-field', 'el-coil-field', 'el-motor-rotate',
  'mo-angle-resultant', 'mo-pulley-compare', 'mo-lever'];
const PREFIX = ['so-', 'fo-', 'el-', 'mo-', 'li-'];

const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);
const items = (kind, t) => anim.frame(kind, t).items;
const byType = (list, type) => list.filter(it => it.type === type);
const textOf = (list, s) => list.find(it => it.type === 'text' && it.text === s);
const textStarting = (list, s) => list.find(it => it.type === 'text' && typeof it.text === 'string' && it.text.startsWith(s));

test('anim-physics: KINDS は計画の 21 本（A 11・B 10）とミニプリントの 6 本（1nen）・7 本（2nen）・12 本（3nen）で、単元の接頭辞で始まり、anim.KINDS に登録されている', () => {
  assert.deepEqual(physics.KINDS, KINDS);
  KINDS.forEach(kind => {
    assert.ok(PREFIX.some(p => kind.startsWith(p)), kind + ' の接頭辞');
    assert.ok(anim.KINDS.includes(kind), kind + ' が anim.KINDS にない');
    assert.equal(anim.periodOf(kind), 4000);
  });
});

test('anim-physics: 各 t と restT で items があり、描ける種類で、座標が有限で場面のまわりに収まり、sceneSvg が <svg を返す', () => {
  const X_KEYS = ['x', 'x1', 'x2', 'cx'], Y_KEYS = ['y', 'y1', 'y2', 'cy'], SIZE_KEYS = ['r', 'rx', 'ry', 'width', 'height'];
  KINDS.forEach(kind => [0, 0.25, 0.5, 0.75, 0.999, anim.restT(kind)].forEach(t => {
    const scene = anim.frame(kind, t);
    const where = kind + ' t = ' + t;
    assert.ok(Array.isArray(scene.items) && scene.items.length > 0, where + ' に item がない');
    scene.items.forEach(it => {
      assert.ok(figures.ITEM_TYPES.includes(it.type), where + ' の ' + it.type);
      X_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 340, where + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
      Y_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 260, where + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
      SIZE_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= 0, where + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
      (it.points || []).forEach(p => {
        assert.ok(Number.isFinite(p[0]) && p[0] >= -20 && p[0] <= 340, where + ' の ' + it.type + ' の点 x = ' + p[0]);
        assert.ok(Number.isFinite(p[1]) && p[1] >= -20 && p[1] <= 260, where + ' の ' + it.type + ' の点 y = ' + p[1]);
      });
    });
    const svg = figures.sceneSvg(scene);
    assert.equal(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'));
  }));
});

test('anim-physics: restT は計画どおり（線が伸びる・量が行き来する kind は静止図に近い t）', () => {
  assert.equal(anim.restT('so-air-wave'), 0);
  assert.equal(anim.restT('so-light-vs-sound'), 0.99);
  assert.equal(anim.restT('fo-spring-stretch'), 0.99);
  assert.equal(anim.restT('mo-slope-accel'), 0.99);
  assert.equal(anim.restT('mo-inertia'), 0.65);
  assert.ok(near(anim.restT('mo-resultant'), 0.2446, 1e-3));
  ['so-string-phone', 'fo-friction', 'fo-balance', 'mo-action-reaction', 'mo-pulley'].forEach(k => assert.equal(anim.restT(k), 0, k));
  ['fo-hooke-graph', 'el-heat-rise', 'el-static-charge', 'mo-buoyancy'].forEach(k => assert.equal(anim.restT(k), 0.99, k));
  assert.ok(near(anim.restT('mo-slope-split'), 0.24, 1e-3));
  ['so-fork-stop', 'so-resonance', 'so-amp-freq'].forEach(k => assert.equal(anim.restT(k), 0, k));
  ['li-lens-cover', 'fo-three-effects', 'fo-normal-friction'].forEach(k => assert.equal(anim.restT(k), 0.99, k));
  ['mo-water-pressure', 'mo-compose-steps', 'mo-split-steps', 'mo-timer-tape', 'mo-uniform-graph'].forEach(k => assert.equal(anim.restT(k), 0.99, k));
  ['mo-pulley-compare', 'mo-lever', 'mo-ball-block'].forEach(k => assert.equal(anim.restT(k), 0, k));
  assert.equal(anim.restT('mo-buoyancy-depth'), 0.55);
  assert.equal(anim.restT('mo-angle-resultant'), 0.25);
  assert.equal(anim.restT('mo-inertia-start'), 0.5);
  assert.ok(near(physics.frictionSlowX(anim.restT('mo-friction-slow')), 130, 1e-9));   // 木片が静止図の位置
});

// 2 つの場面の item が同じ並びで、数の値（座標・大きさ）の差が 1px 以内、文字と種類が同じ
function assertClose(a, b, where) {
  assert.equal(a.length, b.length, where + ' の item の数');
  a.forEach((it, i) => {
    const jt = b[i];
    assert.equal(it.type, jt.type, where + ' の ' + i + ' 番目の種類');
    assert.equal(it.text, jt.text, where + ' の ' + i + ' 番目の文字');
    assert.equal(it.label, jt.label, where + ' の ' + i + ' 番目の label');
    Object.keys(it).forEach(k => {
      if (typeof it[k] === 'number') assert.ok(near(it[k], jt[k], 1), where + ' の ' + it.type + '.' + k + ': ' + it[k] + ' と ' + jt[k]);
    });
    assert.equal((it.points || []).length, (jt.points || []).length, where + ' の ' + it.type + ' の点の数');
    (it.points || []).forEach((p, j) => {
      assert.ok(near(p[0], jt.points[j][0], 1) && near(p[1], jt.points[j][1], 1), where + ' の ' + it.type + ' の点 ' + j);
    });
  });
}

test('anim-physics: 振動・回転・流れの kind は t = 0 と t = 0.99999 がつながる（座標の差 1px 以内）', () => {
  LOOPS.forEach(kind => assertClose(items(kind, 0), items(kind, 0.99999), kind));
});

// ---- 音 ----

test('so-air-wave: t = 0 の弧は静止図と同じ x 110・150・190・230、各 t で弧は 70〜270 の中で、静止図の弧の形を通る', () => {
  const arcs = (t) => byType(items('so-air-wave', t), 'line').filter(it => it.color === 'blue' && !it.dashed);
  assert.deepEqual(arcs(0).map(a => a.points), [
    [[110, 80], [120, 115], [110, 150]],
    [[150, 70], [162, 115], [150, 160]],
    [[190, 60], [204, 115], [190, 170]],
    [[230, 70], [244, 115], [230, 160]],
  ]);
  for (let t = 0; t < 1; t += 0.01) {
    arcs(t).forEach(a => {
      const x = a.points[0][0];
      assert.ok(x >= 70 && x < 270, 't = ' + t + ' の弧の x = ' + x);
      assert.ok(near(a.points[1][1], 115) && a.points[0][1] < 115 && a.points[2][1] > 115, 't = ' + t + ' の弧の形');
    });
  }
  // おんさのうでは t = 0 で静止図の位置（x 30・60）、振動すると左右反対に動く
  const rects = (t) => byType(items('so-air-wave', t), 'rect');
  assert.equal(rects(0)[0].x, 30); assert.equal(rects(0)[1].x, 60);
  assert.ok(near(rects(1 / 16)[0].x, 27) && near(rects(1 / 16)[1].x, 63));
});

test('so-light-vs-sound: 光はすぐ届き（頭が黄色・見えた！）、音は 0.8 で届く（聞こえた！）。0.99 で 2.0 秒', () => {
  const head = (t) => items('so-light-vs-sound', t).find(it => it.type === 'circle' && it.x === 272 && it.y === 160);
  assert.equal(head(0.1).fill, 'yellow');
  assert.equal(head(0.5).fill, undefined);
  assert.ok(textOf(items('so-light-vs-sound', 0.1), '見えた！'));
  assert.ok(!textOf(items('so-light-vs-sound', 0.5), '聞こえた！'));
  const end = items('so-light-vs-sound', 0.99);
  assert.ok(textOf(end, '聞こえた！'));
  assert.ok(textOf(end, '光ってから 2.0 秒'));
  assert.ok(textOf(items('so-light-vs-sound', 0.45), '光ってから 1.0 秒'));
  // 花火は 0.1 で開ききる（半径 26）
  assert.ok(end.some(it => it.type === 'circle' && it.x === 60 && it.y === 56 && it.r === 26));
});

test('so-amplitude: t = 0 で弦はまっすぐ、各 t で弦の点が振れはば（点線）の内側にあり、2 本は同じ速さで振動する', () => {
  const strings = (t) => byType(items('so-amplitude', t), 'line').filter(it => !it.dashed && it.points.length === 9);
  const dashed = byType(items('so-amplitude', 0), 'line').filter(it => it.dashed);   // 上・下・上・下
  assert.equal(strings(0).length, 2);
  [[0, 80], [1, 180]].forEach(([k, yc]) => strings(0)[k].points.forEach(p => assert.equal(p[1], yc)));
  for (let t = 0; t < 1; t += 0.01) {
    strings(t).forEach((s, k) => {
      const yc = k === 0 ? 80 : 180, up = dashed[2 * k].points;
      s.points.forEach((p, i) => assert.ok(Math.abs(p[1] - yc) <= (yc - up[i][1]) + 1e-9, 't = ' + t + ' の弦 ' + k + ' の点 ' + i));
      // 2 本の弦の振れの割合は同じ（同じ振動数）
      const r0 = (strings(t)[0].points[4][1] - 80) / 8, r1 = (strings(t)[1].points[4][1] - 180) / 26;
      assert.ok(near(r0, r1, 1e-9));
    });
  }
  // 強くはじいた弦はいちばん大きく 26 振れる
  assert.ok(near(Math.abs(strings(1 / 24)[1].points[4][1] - 180), 26));
});

test('so-frequency: t = 0 の波形は content/sound.js の wave() と同じ点、左の丸は 1 周に 2 回・5 回上下する', () => {
  // content/sound.js の wave(x0, yc, w, amp, cycles) の点
  const round1 = (v) => Math.round(v * 10) / 10;
  const wavePts = (x0, yc, w, amp, cycles) => {
    const n = Math.max(2, Math.round(cycles * 16)), pts = [];
    for (let i = 0; i <= n; i++) pts.push([round1(x0 + w * i / n), round1(yc - amp * Math.sin(2 * Math.PI * cycles * i / n))]);
    return pts;
  };
  const waves = byType(items('so-frequency', 0), 'line').filter(it => it.color === 'blue');
  assert.deepEqual(waves[0].points, wavePts(40, 90, 240, 22, 2));
  assert.deepEqual(waves[1].points, wavePts(40, 190, 240, 22, 5));
  const sourceY = (t, yc) => byType(items('so-frequency', t), 'circle').find(c => c.x === 30 && Math.abs(c.y - yc) <= 22 + 1e-9).y;
  [[90, 2], [190, 5]].forEach(([yc, cycles]) => {
    const N = 1000, ys = [];
    for (let i = 0; i < N; i++) ys.push(sourceY(i / N, yc));
    let peaks = 0;
    for (let i = 0; i < N; i++) if (ys[i] > ys[(i + N - 1) % N] && ys[i] >= ys[(i + 1) % N]) peaks++;
    assert.equal(peaks, cycles, '中心 ' + yc + ' の丸の上下の回数');
  });
  // 丸の y は波形の左はし（x = 40）の点と同じ
  [0.1, 0.37, 0.8].forEach(t => {
    const w = byType(items('so-frequency', t), 'line').filter(it => it.color === 'blue');
    assert.ok(near(sourceY(t, 90), w[0].points[0][1], 0.05));
    assert.ok(near(sourceY(t, 190), w[1].points[0][1], 0.05));
  });
});

// ---- 力 ----

test('fo-spring-stretch: 0.99 でばねの下はしが 90・130・170、伸びがおもりの数に比例する', () => {
  const springs = (t) => byType(items('fo-spring-stretch', t), 'line').filter(it => it.color === 'line');
  const bottoms = (t) => springs(t).map(s => s.points[s.points.length - 1][1]);
  assert.deepEqual(bottoms(0.99), [90, 130, 170]);
  assert.deepEqual(bottoms(0), [90, 90, 90]);
  // おもりは静止図と同じ位置（上の辺がばねの下はし）
  const weights = byType(items('fo-spring-stretch', 0.99), 'rect').filter(r => r.label === '1個');
  assert.deepEqual(weights.map(r => [r.x, r.y]), [[162, 130], [242, 170], [242, 194]]);
  // 伸びとおもりの数（右のばねは 1 個目・2 個目を順につるす）
  [0.2, 0.3, 0.42, 0.6, 0.85].forEach(t => {
    const b = bottoms(t);
    const nMid = byType(items('fo-spring-stretch', t), 'rect').filter(r => r.label === '1個' && r.x === 162).length;
    const nRight = byType(items('fo-spring-stretch', t), 'rect').filter(r => r.label === '1個' && r.x === 242).length;
    assert.ok(b[1] - 90 <= 40 * nMid + 1e-9 && b[2] - 90 <= 40 * nRight + 1e-9, 't = ' + t);
  });
  assert.equal(bottoms(0.99)[2] - 90, 2 * (bottoms(0.99)[1] - 90));
});

// ---- 電流 ----

// t と t + dt の点（circle r 3、blue）で、範囲 box の中の点が動いた長さ（いちばん近い点どうし）
function dotMove(kind, t, dt, box) {
  const inBox = (c) => c.x >= box[0] && c.x <= box[1] && c.y >= box[2] && c.y <= box[3];
  const dots = (tt) => byType(items(kind, tt), 'circle').filter(c => c.r === 3 && c.fill === 'blue' && inBox(c));
  const a = dots(t), b = dots(t + dt);
  assert.ok(a.length > 0 && b.length > 0, kind + ' の範囲 ' + box + ' に点がない');
  return Math.min(...a.map(p => Math.min(...b.map(q => Math.hypot(q.x - p.x, q.y - p.y)))));
}

test('el-series-parallel: 点の速さは電流に比例し、並列の本線の速さは枝 2 本の和（0.5 = 0.3 + 0.2）', () => {
  const dt = 0.005;   // 1 周に 600·I px → 0.5 A で 1.5px（点の間隔 12 の半分より小さい）
  const series = dotMove('el-series-parallel', 0.1, dt, [10, 20, 60, 160]);      // 直列の左の縦の導線
  const main = dotMove('el-series-parallel', 0.1, dt, [170, 180, 116, 184]);     // 並列の本線（縦）
  const upper = dotMove('el-series-parallel', 0.1, dt, [170, 180, 56, 104]);     // 上の枝（縦）
  const middle = dotMove('el-series-parallel', 0.1, dt, [180, 215, 105, 115]);   // 中の枝
  assert.ok(near(series, 600 * 0.2 * dt, 1e-6), '直列 ' + series);
  assert.ok(near(main, 600 * 0.5 * dt, 1e-6), '本線 ' + main);
  assert.ok(near(upper, 600 * 0.3 * dt, 1e-6), '上の枝 ' + upper);
  assert.ok(near(middle, 600 * 0.2 * dt, 1e-6), '中の枝 ' + middle);
  assert.ok(near(main, upper + middle, 1e-6));
  // 豆電球の記号の中には点を描かない
  const dots = byType(items('el-series-parallel', 0.3), 'circle').filter(c => c.r === 3 && c.fill === 'blue');
  [[50, 50], [110, 50], [240, 50], [240, 110]].forEach(([bx, by]) => {
    assert.ok(!dots.some(c => Math.abs(c.x - bx) <= 20 && Math.abs(c.y - by) < 1), '豆電球 (' + bx + ',' + by + ') の中に点');
  });
  assert.ok(textOf(items('el-series-parallel', 0), '点は電流の向き（電子の動きではない）'));
});

test('el-induction: 針の向きは磁石の速さの符号と同じ、磁石が止まる t = 1/3・5/6 で針はまっすぐ、磁石は場面の中', () => {
  const needle = (t) => items('el-induction', t).find(it => it.type === 'line' && it.color === 'red');
  const magnetX = (t) => byType(items('el-induction', t), 'rect').find(r => r.label === 'N').x;
  assert.equal(magnetX(0), 55);
  [1 / 3, 5 / 6].forEach(t => assert.ok(near(needle(t).points[1][0], 175), 't = ' + t + ' の針'));
  [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9].forEach(t => {
    const v = (magnetX(t + 1e-4) - magnetX(t)) / 1e-4;   // 磁石の速さ（正: コイルに近づく）
    const lean = needle(t).points[1][0] - 175;
    assert.equal(Math.sign(lean), Math.sign(v), 't = ' + t);
    // 矢印の向きと文字も速さの向きに合う
    const arrow = byType(items('el-induction', t), 'arrow')[0];
    assert.equal(arrow.label, v > 0 ? '近づける' : '遠ざける');
    assert.equal(Math.sign(arrow.x2 - arrow.x1), Math.sign(v));
  });
  // 磁石の右はしはコイル（左はし 133）に当たらず、S 極の左はしは場面の外（x < 0）に出ない
  let minX = Infinity;
  for (let t = 0; t < 1; t += 0.001) {
    assert.ok(magnetX(t) + 45 <= 130 + 1e-9);
    minX = Math.min(minX, byType(items('el-induction', t), 'rect').find(r => r.label === 'S').x);
  }
  assert.ok(minX >= -1e-9 && minX < 0.01, 'S 極の x の最小 ' + minX);
  assert.ok(textOf(items('el-induction', 1 / 3), '止まると流れない'));
  assert.ok(!textOf(items('el-induction', 0), '止まると流れない'));
});

// ---- 運動 ----

test('mo-resultant: 合力の先 ＝ A の先 ＋ B のベクトル、B の長さは一定、角が大きいほど合力が短い、restT で静止図の B の先 (100,70)', () => {
  const arrows = (t) => byType(items('mo-resultant', t), 'arrow');
  const len = (a) => Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
  [0, 0.1, 0.3, 0.5, 0.7, 0.9].forEach(t => {
    const [a, b, r] = arrows(t);
    assert.ok(near(r.x2, a.x2 + (b.x2 - b.x1)) && near(r.y2, a.y2 + (b.y2 - b.y1)), 't = ' + t + ' の合力');
    assert.ok(near(len(b), Math.hypot(40, 120)), 't = ' + t + ' の B の長さ');
  });
  assert.ok(len(arrows(0)[2]) > len(arrows(0.5)[2]), '角 45° の合力が 100° より長くない');
  assert.ok(textOf(items('mo-resultant', 0), '角度 45°'));
  assert.ok(textOf(items('mo-resultant', 0.5), '角度 100°'));
  const rest = arrows(anim.restT('mo-resultant'));
  assert.ok(near(rest[1].x2, 100, 1e-6) && near(rest[1].y2, 70, 1e-6));
  assert.ok(near(rest[2].x2, 260, 1e-6) && near(rest[2].y2, 70, 1e-6));
  // 合力の大きさの文字（力 A を 1 とした比）
  const r0 = arrows(0)[2];
  assert.ok(textOf(items('mo-resultant', 0), '合力は力 A の ' + (len(r0) / 160).toFixed(2) + ' 倍'));
});

test('mo-slope-accel: 打点の間隔の差が一定（等加速度）、テープの高さが 20 ずつ増え、0.99 で 5 本そろう', () => {
  const end = items('mo-slope-accel', 0.99);
  const ticks = byType(end, 'circle').filter(c => c.r === 2);
  assert.equal(ticks.length, 6);
  const gaps = ticks.slice(1).map((c, i) => Math.hypot(c.x - ticks[i].x, c.y - ticks[i].y));
  const diffs = gaps.slice(1).map((g, i) => g - gaps[i]);
  diffs.forEach(d => assert.ok(near(d, diffs[0]) && d > 0, '間隔の差 ' + diffs));
  const tapes = byType(end, 'rect');
  assert.deepEqual(tapes.map(r => r.height), [20, 40, 60, 80, 100]);
  // テープは時間とともに 1 本ずつ出る
  assert.equal(byType(items('mo-slope-accel', 0), 'rect').length, 0);
  assert.equal(byType(items('mo-slope-accel', 0.4), 'rect').length, 2);
  // 台車は斜面に沿って進み、進む長さは時間の 2 乗に比例する
  const cart = (t) => byType(items('mo-slope-accel', t), 'polygon')[1].points[0];
  assert.deepEqual(cart(0), [50, 85]);
  const d = (t) => Math.hypot(cart(t)[0] - 50, cart(t)[1] - 85);
  assert.ok(near(d(0.4) / d(0.2), 4, 1e-9));
});

test('mo-inertia: 0.65 で静止図と同じ前かがみ、進んでいるときはまっすぐ、枕木はブレーキのあと止まる', () => {
  const body = (t) => items('mo-inertia', t).find(it => it.type === 'line' && it.width === 4).points;
  const head = (t) => items('mo-inertia', t).find(it => it.type === 'circle' && it.r === 12);
  assert.deepEqual(body(0.65), [[168, 178], [184, 122]]);
  assert.equal(head(0.65).x, 188); assert.equal(head(0.65).y, 108);
  assert.deepEqual(body(0.2), [[176, 178], [176, 122]]);
  assert.deepEqual(body(0.95), [[176, 178], [176, 122]]);
  const sleepers = (t) => byType(items('mo-inertia', t), 'line').filter(it => it.color === 'gray').map(it => it.points[0][0]);
  assert.deepEqual(sleepers(0.7), sleepers(0.9));                     // 止まっている
  assert.notDeepEqual(sleepers(0.1), sleepers(0.2));                  // 進んでいる
  assert.ok(textOf(items('mo-inertia', 0.5), '急ブレーキ！'));
  // 「急ブレーキ！」と「前へ」の矢印は止まるまで（t ≤ 0.65）。止まったあとは静止図の文字だけ
  const arrowsAt = (t) => byType(items('mo-inertia', t), 'arrow').filter(a => a.color === 'blue').length;
  assert.ok(textOf(items('mo-inertia', 0.65), '急ブレーキ！') && arrowsAt(0.65) === 1);
  [0.66, 0.7, 0.8, 0.95].forEach(t => {
    assert.ok(!textOf(items('mo-inertia', t), '急ブレーキ！'), 't = ' + t);
    assert.equal(arrowsAt(t), 0, 't = ' + t);
  });
  assert.ok(!textOf(items('mo-inertia', 0.2), '前へ'));
});

test('mo-pendulum: 各 t で位置と運動の棒の和が 60、t = 0.25（真下）で運動が 60、t = 0 は静止図の左はし', () => {
  const bars = (t) => byType(items('mo-pendulum', t), 'rect').filter(r => r.width === 16);
  for (let t = 0; t < 1; t += 0.05) {
    const [pe, ke, sum] = bars(t);
    assert.ok(near(pe.height + ke.height, 60), 't = ' + t);
    assert.equal(sum.height, 60);
    [pe, ke, sum].forEach(r => assert.ok(near(r.y + r.height, 214)));
  }
  assert.ok(near(bars(0.25)[1].height, 60));
  assert.ok(near(bars(0)[0].height, 60));
  const bob = (t) => byType(items('mo-pendulum', t), 'circle').find(c => c.fill === 'blue');
  assert.equal(bob(0).x, 45.1); assert.equal(bob(0).y, 116.4);     // content/motion.js の bob(-50)
  assert.equal(bob(0.25).x, 160); assert.equal(bob(0.25).y, 170);  // bob(0)
});

// ================================================================
// 優先度 B
// ================================================================

// 文字の重なりを見るための箱（全角 1 文字 ＝ size、半角 ＝ size × 0.6 の概算）。y はベースライン
function textBox(it) {
  const size = Math.max(12, it.size || 16);
  const w = Array.from(String(it.text)).reduce((s, c) => s + (/[ -~]/.test(c) ? 0.6 : 1) * size, 0);
  const left = it.anchor === 'middle' ? it.x - w / 2 : it.anchor === 'end' ? it.x - w : it.x;
  return { left, right: left + w, top: it.y - size * 0.85, bottom: it.y + size * 0.15 };
}
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test('B の kind: 各 t で文字（text）どうしが重ならず、場面（320×240）の中にある', () => {
  KINDS_B.forEach(kind => {
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      const boxes = byType(items(kind, t), 'text').map(it => ({ it, b: textBox(it) }));
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
      byType(items(kind, i / 100), 'arrow').forEach(a => [[a.x1, a.y1], [a.x2, a.y2]].forEach(([x, y]) =>
        assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 240, kind + ' t = ' + i / 100 + ' の矢印のはし ' + x + ',' + y)));
    }
  });
});

test('B の kind: 矢印（arrow と矢じりつきの line）は矢じり（線の太さ × 4）より長い', () => {
  KINDS_B.forEach(kind => {
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      items(kind, t).forEach(it => {
        let length = null;
        if (it.type === 'arrow') length = Math.hypot(it.x2 - it.x1, it.y2 - it.y1);
        else if (it.type === 'line' && it.arrow) {
          const [a, b] = it.points.slice(-2);
          length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        if (length !== null) assert.ok(length > 4 * (it.width || 3), kind + ' t = ' + t + ' の矢印の長さ ' + length);
      });
    }
  });
});

test('mo-action-reaction: 力の矢印は押しているあいだだけ。離れたら「離れると力ははたらかない」', () => {
  for (let t = 0; t < 1; t += 0.01) {
    const list = items('mo-action-reaction', t);
    const pushing = byType(list, 'line').some(l => l.points[0][0] === 88 && l.points[1][0] === 222);
    assert.equal(byType(list, 'arrow').length, pushing ? 2 : 0, 't = ' + t);
    assert.equal(!!textOf(list, '離れると力ははたらかない'), !pushing, 't = ' + t);
  }
  assert.equal(byType(items('mo-action-reaction', 0), 'arrow').length, 2);   // 止まった絵は静止図と同じ
});

test('el-static-charge: 手で離したあと、ストローとティッシュは引き合って近づく', () => {
  const pair = (t) => {
    const cs = byType(items('el-static-charge', t), 'circle').filter(c => c.r === 22 && c.x > 150);
    return cs[1].x - cs[0].x;
  };
  assert.ok(pair(0.5) > pair(0.4) + 40, '手で離す');
  for (let t = 0.51; t < 0.62; t += 0.01) assert.ok(pair(t) < pair(t - 0.01), 't = ' + t + ' で近づく');
  assert.ok(near(pair(0.99), 65));
});

test('so-string-phone: t = 0 で静止図と同じ直線、両はしは y 130 に固定、振れはばは 4 以内で、t = 0.5 では振動している', () => {
  const str = (t) => byType(items('so-string-phone', t), 'line')[0];
  assert.deepEqual(str(0).points.map(p => p[1]), new Array(17).fill(130));
  assert.deepEqual(str(0).points[0], [74, 130]);
  assert.deepEqual(str(0).points[16], [246, 130]);
  for (let t = 0; t < 1; t += 0.05) {
    const ps = str(t).points;
    assert.ok(near(ps[0][1], 130) && near(ps[16][1], 130), 't = ' + t);
    ps.forEach(p => assert.ok(Math.abs(p[1] - 130) <= 4 + 1e-9, 't = ' + t));
  }
  assert.ok(str(0.5).points.some(p => Math.abs(p[1] - 130) > 2));
});

test('fo-friction: 箱は 140 から右へすべり、だんだん遅くなって 200 で止まる。止まると摩擦力の矢印と文字が消える', () => {
  assert.equal(physics.frictionBoxX(0), 140);
  assert.ok(near(physics.frictionBoxX(0.7), 200));
  assert.ok(near(physics.frictionBoxX(0.99), 200));
  const ts = [0.1, 0.25, 0.4, 0.55, 0.7];
  const steps = ts.slice(1).map((t, i) => physics.frictionBoxX(t) - physics.frictionBoxX(ts[i]));
  steps.slice(1).forEach((d, i) => assert.ok(d < steps[i], '同じ時間に進む長さが減る'));
  const friction = (t) => byType(items('fo-friction', t), 'arrow').find(a => a.color === 'blue');
  assert.ok(friction(0.3).x2 < friction(0.3).x1, '摩擦力は動く向き（右）と反対');
  assert.equal(friction(0.8), undefined);
  assert.equal(textOf(items('fo-friction', 0.8), '摩擦力'), undefined);
  assert.ok(textOf(items('fo-friction', 0), '摩擦力'));
});

test('fo-hooke-graph: 動く点はいつも直線 (50,200)–(275,50) の上、力と伸びの比が 0.1 N : 1 cm、0.99 で測った点がすべて出ている', () => {
  for (let t = 0; t < 1; t += 0.05) {
    const p = physics.hookePoint(t);
    assert.ok(Math.abs((275 - 50) * (p.y - 200) - (50 - 200) * (p.x - 50)) <= 1e-6, 't = ' + t);
    if (p.stretch > 0) assert.ok(near(p.force / p.stretch, 0.1), 't = ' + t);
  }
  const marks = (t) => byType(items('fo-hooke-graph', t), 'circle').filter(c => c.fill === 'ink');
  assert.equal(marks(0).length, 0);
  assert.equal(marks(0.99).length, 5);
  assert.ok(textOf(items('fo-hooke-graph', 0.99), '力 0.50 N → 伸び 5.0 cm'));
});

test('fo-hooke-graph: 軸へ下ろす点線は、読みの文字と「原点を通る直線」の文字の上を通らない', () => {
  for (let i = 0; i <= 100; i++) {
    const t = i / 100, list = items('fo-hooke-graph', t);
    const guides = byType(list, 'line').filter(l => l.color === 'orange');
    const boxes = byType(list, 'text').filter(it => it.text === '原点を通る直線' || it.color === 'orange').map(textBox);
    guides.forEach(g => boxes.forEach(b => {
      const [[x1, y1], [x2, y2]] = g.points;
      const hit = Math.max(x1, x2) > b.left && Math.min(x1, x2) < b.right && Math.max(y1, y2) > b.top && Math.min(y1, y2) < b.bottom;
      assert.ok(!hit, 't = ' + t + ' で点線 ' + JSON.stringify(g.points) + ' が文字の上を通る');
    }));
  }
});

test('fo-balance: 右の力が 3 N のときだけ「つり合っている」で合力の矢印がない。つり合っている時間が 1 周の 0.3 以上', () => {
  let balanced = 0, noArrow = 0;
  for (let i = 0; i < 1000; i++) {
    const t = i / 1000, list = items('fo-balance', t);
    const F = 3 + physics.balanceShift(t);
    const right = byType(list, 'arrow').find(a => a.x1 === 190);
    assert.ok(near(right.x2 - 190, 70 * F / 3), 't = ' + t);
    const net = byType(list, 'arrow').find(a => a.color === 'green');
    if (textOf(list, 'つり合っている')) {
      balanced++;
      assert.ok(Math.abs(F - 3) < 0.05 && !net, 't = ' + t);
    } else {
      assert.ok(textOf(list, 'つり合っていない → 動きだす'), 't = ' + t);
      if (Math.abs(F - 3) >= 0.6) assert.ok(net, 't = ' + t + ' に合力の矢印がない');
      if (net) assert.equal(Math.sign(net.x2 - net.x1), Math.sign(F - 3), '合力は大きいほうの力の向き');
      if (!net) noArrow++;
    }
  }
  assert.ok(balanced >= 300, 'つり合っている時間 ' + balanced + ' / 1000');
  assert.ok(noArrow <= 60, 'つり合っていないのに合力の矢印がない時間 ' + noArrow + ' / 1000');
  assert.equal(byType(items('fo-balance', 0), 'arrow').find(a => a.x1 === 190).label, '3 N');
  assert.ok(near(physics.balanceShift(0.35), 1) && near(physics.balanceShift(0.85), -1));
});

test('el-heat-rise: 同じ時刻の 2 本の上昇温度の比が 2 : 1、0.99 で静止図と同じ線', () => {
  const lines = (t) => byType(items('el-heat-rise', t), 'line').filter(l => l.width === 3);
  for (let t = 0.05; t < 1; t += 0.05) {
    const [a, b] = lines(t);
    const ea = a.points[a.points.length - 1], eb = b.points[b.points.length - 1];
    assert.ok(near(ea[0], eb[0]), '同じ時刻');
    assert.ok(near((200 - ea[1]) / (200 - eb[1]), 2), 't = ' + t);
  }
  assert.deepEqual(lines(0.99)[0].points, [[50, 200], [250, 50]]);
  assert.deepEqual(lines(0.99)[1].points, [[50, 200], [250, 125]]);
  assert.ok(textOf(items('el-heat-rise', 0.99), '時間 5.0 分'));
});

test('el-static-charge: こするあいだに電子 3 つがティッシュからストローへ移り、そのあと −と＋ になる。大きな丸どうしは重ならない', () => {
  const electrons = (t) => byType(items('el-static-charge', t), 'circle').filter(c => c.r === 4);
  const big = (t) => byType(items('el-static-charge', t), 'circle').filter(c => c.r === 22);
  assert.equal(electrons(0).length, 3);
  electrons(0).forEach(e => assert.ok(Math.hypot(e.x - 270, e.y - 110) < 22, 'はじめはティッシュの中'));
  const straw = (t) => big(t).find(c => c.x > 150 && c.fill === 'sky');
  electrons(0.38).forEach(e => assert.ok(Math.hypot(e.x - straw(0.38).x, e.y - straw(0.38).y) < 22, 'こすり終わるとストローの中'));
  assert.equal(electrons(0.5).length, 0);
  assert.equal(big(0.2).find(c => c.fill === 'white').label, undefined, 'こすっているあいだは＋の文字がない');
  assert.equal(big(0.99).find(c => c.fill === 'white').label, '＋');
  assert.equal(straw(0.99).label, '−');
  for (let i = 0; i < 200; i++) {
    const cs = big(i / 200);
    cs.forEach((p, j) => cs.slice(j + 1).forEach(q => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 44 - 1e-9, 't = ' + i / 200)));
  }
  assert.deepEqual(big(0.99).map(c => c.x), [60, 120, 205, 270]);   // 静止図と同じ位置
});

test('mo-slope-split: 2 つの分力の和が重力、傾きが大きいほど平行な分力が大きい、restT で静止図の傾きと位置', () => {
  for (let t = 0; t < 1; t += 0.05) {
    const f = physics.slopeForces(t);
    assert.ok(near(f.parallel[0] + f.perpendicular[0] - f.o[0], f.gravity[0]), 't = ' + t);
    assert.ok(near(f.parallel[1] + f.perpendicular[1] - f.o[1], f.gravity[1]), 't = ' + t);
  }
  const par = (t) => { const f = physics.slopeForces(t); return Math.hypot(f.parallel[0] - f.o[0], f.parallel[1] - f.o[1]); };
  assert.ok(physics.slopeForces(0).deg > physics.slopeForces(0.5).deg && par(0) > par(0.5));
  const rest = physics.slopeForces(anim.restT('mo-slope-split'));
  assert.ok(near(rest.tan, 0.5));
  assert.ok(near(rest.o[0], 131, 0.5) && near(rest.o[1], 127, 0.6));   // 静止図の重力の作用点 (131,127)
});

test('mo-buoyancy: 読みは水につかった割合に比例して 3.0 → 2.2 N、水圧の矢印は深さに比例する（1 つの比）、0.99 で下の面は静止図と同じ', () => {
  for (let t = 0; t < 1; t += 0.02) {
    const b = physics.buoyancy(t);
    assert.ok(near(b.reading, 3.0 - 0.8 * b.s));
    const arrows = byType(items('mo-buoyancy', t), 'arrow');
    const down = arrows.find(a => a.x1 === 100 && a.y2 > a.y1);   // 上の面を押す（下向き）
    const up = arrows.find(a => a.x1 === 100 && a.y2 < a.y1);     // 下の面を押す（上向き）
    if (down) assert.ok(up && Math.abs(up.y2 - up.y1) >= Math.abs(down.y2 - down.y1), 't = ' + t);
  }
  assert.ok(near(physics.buoyancy(0).reading, 3.0));
  assert.ok(near(physics.buoyancy(0.99).reading, 2.2));
  // 各 t で、矢印の長さ ÷ 矢印の面の深さ（水面 y 86 から）がどれも同じ比
  for (let t = 0; t < 1; t += 0.02) {
    byType(items('mo-buoyancy', t), 'arrow').forEach(a => {
      const length = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
      const depth = (a.y1 === a.y2 ? a.y2 : a.y2 + (a.y2 > a.y1 ? 2 : -2)) - 86;   // 矢じりの先から 2px 先が面
      assert.ok(near(length / depth, physics.PRESSURE_PX, 1e-9), 't = ' + t + ' の比 ' + length / depth);
    });
  }
  const arrows = byType(items('mo-buoyancy', 0.99), 'arrow');
  assert.ok(arrows.some(a => [a.x1, a.y1, a.x2, a.y2].every((v, i) => near(v, [100, 202, 100, 170][i], 1e-6))), '静止図の下の面の矢印');
  assert.equal(arrows.length, 4);
});

test('mo-action-reaction: t = 0 は静止図と同じ、2 人は同じ長さだけ反対向きに離れる、押しているあいだは腕がつながる', () => {
  const body = (t, label) => byType(items('mo-action-reaction', t), 'rect').find(r => r.label === label);
  assert.equal(body(0, 'A').x, 62);
  assert.equal(body(0, 'B').x, 222);
  for (let t = 0; t < 1; t += 0.05) assert.ok(near(62 - body(t, 'A').x, body(t, 'B').x - 222), 't = ' + t);
  assert.ok(near(body(0.9, 'B').x - 222, 36));
  assert.ok(byType(items('mo-action-reaction', 0.15), 'line').some(l => l.points[0][0] === 88 && l.points[1][0] === 222));
});

test('mo-pulley: 手の動き ＝ おもりの動き × 2、手は天井に当たらない、引き上げたあと「引いた長さ」「上がった高さ」を見せる', () => {
  for (let t = 0; t < 1; t += 0.02) {
    const list = items('mo-pulley', t);
    const hand = byType(list, 'ellipse')[0], weight = byType(list, 'rect').find(r => r.label === 'おもり');
    assert.ok(near(hand.y - 44, 2 * (weight.y - 160)), 't = ' + t);
    assert.ok(hand.y - hand.ry > 18, 't = ' + t);
  }
  assert.ok(near(physics.pulleyLow(0.3), physics.PULLEY_D));
  assert.equal(byType(items('mo-pulley', 0), 'ellipse')[0].y, 44);
  assert.ok(textOf(items('mo-pulley', 0.8), '引いた長さ') && textOf(items('mo-pulley', 0.8), '上がった高さ'));
});

// ================================================================
// ミニプリント（1nen）。docs/plans/mp-figures-1nen.md の「動く図（新規）」
// ================================================================

const MP_KINDS = KINDS_MP;
const MP_CARDS = {
  'li-lens-cover': ['light.js', 'light-mp4-c3'], 'so-fork-stop': ['sound.js', 'sound-mp1-c1'], 'so-resonance': ['sound.js', 'sound-mp1-c2'],
  'so-amp-freq': ['sound.js', 'sound-mp3-c1'], 'fo-three-effects': ['force.js', 'force-mp1-c1'], 'fo-normal-friction': ['force.js', 'force-mp1-c2'],
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

test('li-lens-cover: 止まった絵は紙がレンズの下半分をおおい、光線は上半分の 2 本だけ。像は全体（高さ 44）で、おおう前より色がうすい', () => {
  const rest = items('li-lens-cover', 0.99);
  const paper = rest.find(it => it.type === 'rect');
  assert.deepEqual([paper.x, paper.y, paper.width, paper.height], [148, 112, 24, 72]);
  const rays = byType(rest, 'ray');
  assert.equal(rays.filter(r => r.x1 === 160).length, 2);
  rays.filter(r => r.x1 === 160).forEach(r => assert.ok(r.y1 < 110 && r.x2 === 260 && r.y2 === 154));
  const imageColor = (t) => items('li-lens-cover', t).find(it => it.type === 'polygon').fill;
  assert.equal(imageColor(0.35), '#2E9E5B');                 // おおう前（4 本とも通る）
  assert.notEqual(imageColor(0.99), imageColor(0.35));       // おおったあと（2 本）
  assert.equal(byType(items('li-lens-cover', 0.35), 'ray').filter(r => r.x1 === 160).length, 4);
});

test('so-fork-stop: t = 0 はうでが静止図の位置（x 80・110）。にぎっている間（0.6〜0.9）はうでが止まり、点線と手が出る', () => {
  const arms = (t) => byType(items('so-fork-stop', t), 'rect').slice(0, 2).map(r => r.x);
  assert.deepEqual(arms(0), [80, 110]);
  assert.ok(!near(arms(0.025)[0], 80, 1));                    // 振動している
  [0.6, 0.7, 0.8].forEach(t => {
    assert.deepEqual(arms(t), [80, 110], 't = ' + t);
    assert.ok(byType(items('so-fork-stop', t), 'ellipse').length === 1, 't = ' + t + ' の手');
    assert.equal(byType(items('so-fork-stop', t), 'line').length, 0, 't = ' + t + ' の点線');
  });
});

test('so-resonance: t = 0 の弧は静止図と同じ（x 112・140・168）で B は止まっている。弧が B に着いたあと B がふるえる', () => {
  const arcs = (t) => byType(items('so-resonance', t), 'line').filter(it => !it.dashed);
  assert.deepEqual(arcs(0).map(a => a.points), [
    [[168, 80], [178, 115], [168, 150]], [[140, 74], [150, 115], [140, 156]], [[112, 80], [120, 115], [112, 150]],
  ]);
  const bArm = (t) => byType(items('so-resonance', t), 'rect')[4].x;   // B の左のうで（静止図 x 230）
  for (let t = 0; t <= 0.2; t += 0.01) assert.equal(bArm(t), 230, 't = ' + t);
  assert.ok([0.5, 0.525, 0.55].some(t => !near(bArm(t), 230, 1)));
  arcs(0.5).forEach(a => assert.ok(a.points[0][0] >= 84 && a.points[0][0] <= 224));
});

test('so-amp-freq: t = 0 の波形は静止図と同じ点。X の矢印の先は t = 0 で静止図の (72,62)', () => {
  const card = mpLesson('sound.js', 'sound-mp3-c1');
  const stWave = card.figure.items.find(it => it.type === 'line' && it.color === 'blue');
  const wave0 = items('so-amp-freq', 0).find(it => it.type === 'line' && it.color === 'blue');
  assert.deepEqual(wave0.points, stWave.points);
  const arrow = byType(items('so-amp-freq', 0), 'arrow')[0];
  assert.ok(near(arrow.x2, 72) && near(arrow.y2, 62, 1e-9));
  // 数える丸は 0.2 で 1 つ、0.45 で 2 つ点く
  const lit = (t) => byType(items('so-amp-freq', t), 'circle').filter(c => c.r === 10 && c.fill === 'orange').length;
  assert.equal(lit(0), 0); assert.equal(lit(0.3), 1); assert.equal(lit(0.6), 2);
});

test('fo-three-effects: 止まった絵はスポンジ ry 12・中心 y 140、ボール x 150、手の矢印 (55,70)→(55,124)。はじめはつぶれていない', () => {
  const rest = items('fo-three-effects', 0.99);
  const sponge = rest.find(it => it.type === 'ellipse' && it.fill === 'yellow');
  assert.ok(near(sponge.ry, 12) && near(sponge.y, 140));
  assert.equal(items('fo-three-effects', 0).find(it => it.type === 'ellipse' && it.fill === 'yellow').ry, 18);
  assert.equal(rest.find(it => it.type === 'circle' && it.r === 14).x, 150);
  const hand = byType(rest, 'arrow')[0];
  assert.ok(near(hand.y1, 70) && near(hand.y2, 124));
  // ボールが手に当たる前は、手の力の矢印（196 → 166）がない
  assert.ok(!byType(items('fo-three-effects', 0.3), 'arrow').some(a => a.x1 === 196));
  assert.ok(byType(rest, 'arrow').some(a => a.x1 === 196 && a.x2 === 166));
});

test('fo-normal-friction: 動かす向きの印（灰色）は伸ばさず静止図の長さのまま、摩擦力が伸びる。止まった絵は静止図の長さ。箱は動かない', () => {
  [0, 0.45, 0.6, 0.99].forEach(t => {
    const push = byType(items('fo-normal-friction', t), 'arrow').find(a => a.color === 'gray');
    assert.ok(push && push.x1 === 200 && push.x2 === 260, 't = ' + t);
  });
  let prev = 0;
  [0.45, 0.6, 0.99].forEach(t => {
    const fric = byType(items('fo-normal-friction', t), 'arrow').find(a => a.color === 'green');
    assert.ok(fric, 't = ' + t);
    assert.ok(fric.x1 - fric.x2 >= prev - 1e-9, 't = ' + t);
    prev = fric.x1 - fric.x2;
    assert.equal(items('fo-normal-friction', t).find(it => it.type === 'rect').x, 120);
  });
  const rest = byType(items('fo-normal-friction', 0.99), 'arrow');
  assert.equal(rest.find(a => a.color === 'gray').x2, 260);
  assert.equal(rest.find(a => a.color === 'green').x2, 72);
});

// ================================================================
// ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」と「もとにする kind」
// ================================================================

const MP2_KINDS = KINDS_MP2;
const MP2_CARDS = {
  'el-cathode-bend': ['electricity.js', 'electricity-mp12-c2'], 'el-compass-around': ['electricity.js', 'electricity-mp13-c1'],
  'el-wire-field': ['electricity.js', 'electricity-mp14-c1'], 'el-coil-field': ['electricity.js', 'electricity-mp14-c2'],
  'el-wire-force': ['electricity.js', 'electricity-mp15-c1'], 'el-motor-rotate': ['electricity.js', 'electricity-mp15-c2'],
  'el-dc-ac': ['electricity.js', 'electricity-mp16-c2'],
};
// カード id → [単元のファイル, 使い回す kind]
const MP2_SHARED = {
  'electricity-mp4-c1': ['electricity.js', 'el-series-parallel'], 'electricity-mp10-c2': ['electricity.js', 'el-heat-rise'],
  'electricity-mp12-c1': ['electricity.js', 'el-static-charge'], 'electricity-mp16-c1': ['electricity.js', 'el-induction'],
};

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

test('el-cathode-bend: 電子の点 6 つはいつも静止図の光のすじの上にあり、A から B の向きへ進む', () => {
  const ray = [[30, 120], [120, 120], [200, 108], [288, 88]];
  const electrons = t => items('el-cathode-bend', t).filter(it => it.type === 'circle' && it.fill === 'sky');
  for (let i = 0; i < 50; i++) {
    const es = electrons(i / 50);
    assert.equal(es.length, 6);
    es.forEach(e => assert.ok(distToPath(e.x, e.y, ray) < 1e-6, 't = ' + i / 50));
  }
  // 少し進むと右（B の側）へ動く（はしでもどる点を除く）
  const a = electrons(0.3), b = electrons(0.31);
  a.forEach((e, k) => { if (b[k].x > 40) assert.ok(b[k].x > e.x, k + ' 番目の電子'); });
});

test('el-compass-around: 動く方位磁針は楕円（横 104・たて 60）の上。t = 0 は上 (160,60) で右向き、0.25 は左 (56,120) で左向き、0.5 は下で右向き、0.75 は右で左向き', () => {
  const moving = t => {
    const list = items('el-compass-around', t);
    const i = list.findIndex(it => it.type === 'circle' && it.stroke === 'blue');
    return { c: list[i], red: list[i + 1] };
  };
  for (let i = 0; i < 40; i++) {
    const { c } = moving(i / 40);
    assert.ok(near(((c.x - 160) / 104) ** 2 + ((c.y - 120) / 60) ** 2, 1, 1e-9));
  }
  const top = moving(0), left = moving(0.25), bottom = moving(0.5), right = moving(0.75);
  assert.ok(near(top.c.x, 160) && near(top.c.y, 60) && near(top.red.points[0][0], 174, 1e-6) && near(top.red.points[0][1], 60, 1e-6));
  assert.ok(near(left.c.x, 56) && near(left.red.points[0][0], 42, 1e-6));
  assert.ok(bottom.red.points[0][0] > bottom.c.x + 13);
  assert.ok(right.red.points[0][0] < right.c.x - 13);   // S 極に入る向き（左）
});

test('el-wire-field: 左（×）の点は時計回り、右（・）の点は反時計回りに、半径 36 の円の上を回る', () => {
  const dots = t => items('el-wire-field', t).filter(it => it.type === 'circle' && it.fill === 'blue');
  const a = dots(0.2), b = dots(0.21);
  assert.equal(a.length, 8);
  a.forEach((d, i) => {
    const cx = d.x < 160 ? 80 : 240;
    assert.ok(near(Math.hypot(d.x - cx, d.y - 110), 36, 1e-9));
    const cross = (d.x - cx) * (b[i].y - 110) - (d.y - 110) * (b[i].x - cx);   // 画面の座標で正なら時計回り
    if (cx === 80) assert.ok(cross > 0, '左の点 ' + i + ' が時計回りでない');
    else assert.ok(cross < 0, '右の点 ' + i + ' が反時計回りでない');
  });
});

test('el-coil-field: だいだいの点は輪の右半分（手前側）を下向きに、青いふちの点はコイルの内部を右向きに進む', () => {
  const orange = t => items('el-coil-field', t).filter(it => it.type === 'circle' && it.fill === 'orange');
  const inner = t => items('el-coil-field', t).filter(it => it.type === 'circle' && it.stroke === 'blue' && it.y === 120);
  const xs = [120, 132, 144, 156, 168, 180, 192];
  const a = orange(0.4), b = orange(0.41);
  assert.equal(a.length, 7);
  a.forEach((d, i) => {
    assert.ok(d.x >= xs[i] - 1e-9 && near(((d.x - xs[i]) / 7) ** 2 + ((d.y - 120) / 32) ** 2, 1, 1e-9), i + ' 番目の点が輪の右半分にない');
    if (b[i].y > d.y - 30) assert.ok(b[i].y > d.y, i + ' 番目の点が下へ進まない');
  });
  const p = inner(0.4), q = inner(0.41);
  assert.equal(p.length, 4);
  p.forEach((d, i) => { assert.ok(d.x >= 118 && d.x <= 198); if (q[i].x > d.x - 40) assert.ok(q[i].x > d.x); });
});

test('el-wire-force: 導線は t = 0 で静止図の (160,120)、0.5 で 30 左。力の矢印と「力」は電流を流すあいだ導線といっしょに動き、切ると消える', () => {
  const wire = t => items('el-wire-force', t).find(it => it.type === 'circle' && it.r === 10);
  assert.equal(wire(0).x, 160);
  assert.ok(near(wire(0.5).x, 130));
  [0, 0.2, 0.4].forEach(t => {
    const arrow = items('el-wire-force', t).find(it => it.type === 'arrow' && it.color === 'orange');
    assert.ok(near(arrow.x1 - wire(t).x, -16) && near(arrow.x2 - wire(t).x, -70));
    assert.ok(near(textOf(items('el-wire-force', t), '力').x - wire(t).x, -70));
  });
  assert.ok(textOf(items('el-wire-force', 0.25), '電流を流す'));
  assert.ok(textOf(items('el-wire-force', 0.75), '電流を切る'));
  assert.equal(items('el-wire-force', 0.75).filter(it => it.type === 'arrow' && it.color === 'orange').length, 0);
});

test('el-motor-rotate: コイルのはしは半径 62 の円の上を時計回り。左側の導線はいつも「・」で上向きの力、右側は「×」で下向きの力（矢印は題と下の文にかからない）', () => {
  for (let i = 0; i < 40; i++) {
    const t = i / 40, list = items('el-motor-rotate', t);
    const coil = list.find(it => it.type === 'line' && it.color === 'brown');
    coil.points.forEach(p => assert.ok(near(Math.hypot(p[0] - 160, p[1] - 120), 62, 1e-9)));
    const [l, r] = coil.points[0][0] <= coil.points[1][0] ? coil.points : [coil.points[1], coil.points[0]];
    if (Math.abs(l[0] - r[0]) < 1) continue;   // コイルがたての所（入れかわる瞬間）は見ない
    // 左の導線の中に・（半径 3 の丸）、右の導線の中に ×（2 本の線）
    assert.ok(list.some(it => it.type === 'circle' && it.r === 3 && near(it.x, l[0]) && near(it.y, l[1])), 't = ' + t + ' の左が・でない');
    assert.equal(list.filter(it => it.type === 'line' && it.width === 2 && near((it.points[0][0] + it.points[1][0]) / 2, r[0])).length, 2, 't = ' + t + ' の右が×でない');
    const arrows = list.filter(it => it.type === 'arrow');
    const up = arrows.find(a => near(a.x1, l[0])), down = arrows.find(a => near(a.x1, r[0]));
    assert.ok(up && up.y2 < up.y1 && up.y2 >= 26, 't = ' + t + ' の左の力');
    if (down) assert.ok(down.y2 > down.y1 && down.y2 <= 200, 't = ' + t + ' の右の力');
    else assert.ok(r[1] > 174, 't = ' + t + ' で右の力の矢印がない');
  }
  // 時計回り: AB（t = 0 で左 (98,120)）は少しあとで左上へ
  const ab = t => items('el-motor-rotate', t).find(it => it.type === 'line' && it.color === 'brown').points[0];
  assert.ok(ab(0.05)[1] < 120 && ab(0.05)[0] > 98);
  assert.ok(textOf(items('el-motor-rotate', 0), 'AB（・）') && textOf(items('el-motor-rotate', 0.5), 'CD（・）') && textOf(items('el-motor-rotate', 0.5), 'AB（×）'));
});

test('el-dc-ac: 2 本の線は同じ x まで伸び、交流の線の先が軸より上なら「＋の向き」、下なら「−の向き」。止まった絵の線は静止図と同じ', () => {
  const lines = t => items('el-dc-ac', t).filter(it => it.type === 'line' && it.color === 'blue');
  [0.1, 0.3, 0.5].forEach(t => {
    const [dc, ac] = lines(t);
    assert.ok(near(dc.points[1][0], ac.points[ac.points.length - 1][0]));
  });
  const sign = t => items('el-dc-ac', t).find(it => it.type === 'text' && it.x === 306 && it.y === 140).text;
  assert.equal(sign(0.1), '＋の向き');    // x 90: 軸より上
  assert.equal(sign(0.2), '−の向き');    // x 120: 軸より下
  const card = mpLesson('electricity.js', 'electricity-mp16-c2');
  const want = card.figure.items.filter(it => it.type === 'line' && it.color === 'blue').map(it => it.points);
  assert.deepEqual(lines(0.99).map(it => it.points), want);
});

// ================================================================
// ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」と「動く図（使い回し）」
// ================================================================

const MP3_CARDS = {
  'mo-water-pressure': ['motion.js', 'motion-mp1-c1'], 'mo-buoyancy-depth': ['motion.js', 'motion-mp1-c2'],
  'mo-angle-resultant': ['motion.js', 'motion-mp2-c1'], 'mo-compose-steps': ['motion.js', 'motion-mp2-c2'],
  'mo-split-steps': ['motion.js', 'motion-mp3-c1'], 'mo-timer-tape': ['motion.js', 'motion-mp5-c2'],
  'mo-friction-slow': ['motion.js', 'motion-mp6-c1'], 'mo-uniform-graph': ['motion.js', 'motion-mp6-c2'],
  'mo-inertia-start': ['motion.js', 'motion-mp6-c3'], 'mo-pulley-compare': ['motion.js', 'motion-mp8-c1'],
  'mo-lever': ['motion.js', 'motion-mp9-c1'], 'mo-ball-block': ['motion.js', 'motion-mp10-c1'],
};
// カード id → [単元のファイル, 使い回す kind]（計画の「動く図（使い回し）」。kind を増やさず既存の kind をそのまま使う）
const MP3_SHARED = {
  'motion-mp3-c2': ['motion.js', 'mo-slope-split'], 'motion-mp4-c1': ['motion.js', 'mo-action-reaction'],
  'motion-mp11-c2': ['motion.js', 'mo-pendulum'],
};

test('ミニプリント（3nen）: カードがその kind を使い、静止図の text・label が frame(kind, restT) に同じ text・x・y で入っている', () => {
  assert.deepEqual(Object.keys(MP3_CARDS), KINDS_MP3);
  KINDS_MP3.forEach(kind => {
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

test('ミニプリント（3nen）: 各 t で文字（text）が場面の中にあり、文字どうしが重ならず（静止図にある文字どうしの重なりは静止図のまま見ない）、矢印（arrow）の両はしが場面の中にある', () => {
  KINDS_MP3.forEach(kind => {
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
    assert.ok(physics.KINDS.includes(kind) && !KINDS_MP3.includes(kind), kind);
  });
});

test('mo-water-pressure: t = 0 は膜が平らで矢印がない。止まった絵の膜は静止図と同じへこみ（3・7・11）、矢印は深いほど長く、同じ深さの左右で同じ長さ', () => {
  const membranes = t => byType(items('mo-water-pressure', t), 'line').filter(it => it.color === 'blue');
  membranes(0).forEach(m => assert.equal(m.points[1][0], m.points[0][0]));
  assert.equal(byType(items('mo-water-pressure', 0), 'arrow').length, 0);
  const card = mpLesson('motion.js', 'motion-mp1-c1');
  assert.deepEqual(membranes(0.99).map(m => m.points), card.figure.items.filter(it => it.type === 'line' && it.color === 'blue').map(m => m.points));
  [0.6, 0.99].forEach(t => {
    const arrows = byType(items('mo-water-pressure', t), 'arrow');
    assert.equal(arrows.length, 6, 't = ' + t);
    const lens = arrows.map(a => Math.abs(a.x2 - a.x1));
    [0, 2, 4].forEach(i => assert.ok(near(lens[i], lens[i + 1]), 't = ' + t + ' の左右'));
    assert.ok(lens[0] < lens[2] && lens[2] < lens[4], 't = ' + t + ' で深いほど長くない');
    arrows.forEach(a => assert.ok(a.x1 >= 20 && a.x1 <= 300, 't = ' + t + ' の矢印が水の外から出る'));
  });
});

test('mo-buoyancy-depth: A → B → C の順に読みを強調し、C だけが 0.6〜0.85 で 30 下がってもどる。読みは 1.4 N のまま、物体は底につかない', () => {
  const blue = t => byType(items('mo-buoyancy-depth', t), 'text').filter(it => it.color === 'blue' && it.y === 26).map(it => it.text);
  assert.deepEqual(blue(0.1), ['2.0 N']);
  assert.deepEqual(blue(0.3), ['1.7 N']);
  assert.deepEqual(blue(0.5), ['1.4 N']);
  assert.deepEqual(blue(0.7), ['1.4 N']);
  const objC = t => items('mo-buoyancy-depth', t).find(it => it.type === 'rect' && it.x === 240);
  assert.equal(objC(anim.restT('mo-buoyancy-depth')).y, 150);
  assert.ok(near(objC(0.725).y, 180));
  for (let i = 0; i <= 100; i++) assert.ok(objC(i / 100).y + 44 <= 230 - 4, 't = ' + i / 100 + ' で底につく');
  assert.ok(textOf(items('mo-buoyancy-depth', 0.7), '深さで浮力は変わらない'));
  assert.ok(!textOf(items('mo-buoyancy-depth', 0.5), '深さで浮力は変わらない'));
});

test('mo-angle-resultant: あいだの角は 0°〜180°。合力の先 ＝ 3 N の先 ＋ 2 N のベクトル、0° で 5 N・90° で 3.6 N・180° で 1 N、文字は計算と同じ', () => {
  [[0, 5], [0.25, Math.sqrt(13)], [0.5, 1]].forEach(([t, n]) => assert.ok(near(physics.angleResultant(t).newton, n, 1e-9), 't = ' + t));
  for (let i = 0; i < 40; i++) {
    const t = i / 40, g = physics.angleResultant(t), list = items('mo-angle-resultant', t);
    assert.ok(near(g.r[0] - g.a[0], g.b[0] - 214) && near(g.r[1] - g.a[1], g.b[1] - 104), 't = ' + t);
    assert.ok(g.newton >= 1 - 1e-9 && g.newton <= 5 + 1e-9);
    assert.ok(textOf(list, '合力 ' + g.newton.toFixed(1) + ' N'), 't = ' + t + ' の合力の文字');
  }
});

test('mo-compose-steps / mo-split-steps: 点線 → 合力（分力）の順に伸び、止まった絵の矢印と点線は静止図と同じ', () => {
  [['mo-compose-steps', 'motion-mp2-c2'], ['mo-split-steps', 'motion-mp3-c1']].forEach(([kind, id]) => {
    const green = t => items(kind, t).filter(it => it.color === 'green');
    assert.equal(green(0.2).length, 0, kind + ' で点線より先に緑の矢印が出る');
    assert.equal(green(0.5).length, 0, kind);
    assert.ok(green(0.7).length > 0, kind + ' で緑の矢印が伸びない');
    const card = mpLesson('motion.js', id);
    const key = list => list.filter(it => it.type !== 'text').map(it => JSON.stringify(it)).sort();
    assert.deepEqual(key(items(kind, 0.99)), key(card.figure.items), kind);
  });
});

test('mo-timer-tape: 打点の間隔は上のテープ 30・下のテープ 14（同じ時間ごとに打つ）。止まった絵の打点は静止図の 26 個と同じ', () => {
  const dots = t => items('mo-timer-tape', t).filter(it => it.type === 'circle' && it.r === 3);
  [0.6, 0.7, 0.85].forEach(t => {
    [[80, 30], [160, 14]].forEach(([y, gap]) => {
      const xs = dots(t).filter(d => d.y === y).map(d => d.x).sort((a, b) => a - b);
      assert.ok(xs.length >= 2, 't = ' + t);
      xs.slice(1).forEach((x, i) => assert.ok(near(x - xs[i], gap, 1e-6), 't = ' + t + ' の間隔 ' + (x - xs[i])));
    });
  });
  assert.equal(dots(0.3).filter(d => d.y === 80).length, 0);   // 上のテープは後半だけ動く
  const card = mpLesson('motion.js', 'motion-mp5-c2');
  const want = card.figure.items.filter(it => it.type === 'circle').map(d => [d.x, d.y]);
  assert.deepEqual(dots(0.99).map(d => [d.x, d.y]).sort(), want.sort());
});

test('mo-friction-slow: 木片はだんだんおそくなって x 210 で止まる。摩擦力の矢印（長さ 60）は動いているあいだ木片についていき、止まると「止まった」', () => {
  let prevV = Infinity;
  for (let i = 1; i <= 80; i++) {
    const v = physics.frictionSlowX(i / 100) - physics.frictionSlowX((i - 1) / 100);
    assert.ok(v > 0 && v < prevV + 1e-9, 't = ' + i / 100);
    prevV = v;
  }
  assert.equal(physics.frictionSlowX(0.9), 210);
  const fric = t => byType(items('mo-friction-slow', t), 'arrow').find(a => a.color === 'blue');
  [0.1, 0.5].forEach(t => {
    const f = fric(t), x = physics.frictionSlowX(t);
    assert.ok(near(f.x1, x + 10) && near(f.x1 - f.x2, 60), 't = ' + t);
  });
  assert.equal(fric(0.9), undefined);
  assert.ok(textOf(items('mo-friction-slow', 0.9), '止まった'));
});

test('mo-uniform-graph: 右のグラフの点はいつも原点を通る直線の上、左の点は速さ一定の線の上。0.99 で線の右はし', () => {
  for (let i = 1; i <= 50; i++) {
    const { left, right } = physics.uniformPoints(i / 50);
    assert.equal(left[1], 110);
    assert.ok(near((170 - right[1]) / (right[0] - 190), 108 / 88, 1e-9), 't = ' + i / 50);
    assert.ok(near(left[0] - 40, right[0] - 190));   // 同じ時刻
  }
  assert.deepEqual(physics.uniformPoints(0.99), { left: [128, 110], right: [278, 62] });
});

test('mo-inertia-start: 0.2 までは枕木が止まっている。止まった絵（0.5）はいちばん後ろへかたむいた静止図の形、0.8 でまっすぐ', () => {
  const sleepers = t => items('mo-inertia-start', t).filter(it => it.type === 'line' && it.color === 'gray').map(it => it.points[0][0]);
  assert.deepEqual(sleepers(0.1), sleepers(0));
  assert.notDeepEqual(sleepers(0.4), sleepers(0));
  const body = t => items('mo-inertia-start', t).find(it => it.type === 'line' && it.width === 4).points;
  assert.deepEqual(body(0.5), [[168, 178], [152, 122]]);
  assert.deepEqual(body(0.85), [[164, 178], [164, 122]]);
  assert.equal(physics.startLean(0.5), 1);
  assert.ok(textOf(items('mo-inertia-start', 0.5), '後ろへ'));
});

test('mo-pulley-compare: 定滑車は手の動き ＝ おもりの動き、動滑車は手の動き ＝ おもりの動き × 2。手は天井に当たらず、おもりは下の文字にかからない', () => {
  for (let i = 0; i <= 100; i++) {
    const t = i / 100, list = items('mo-pulley-compare', t), d = physics.pulleyCompareLow(t);
    const rect = x => list.find(it => it.type === 'rect' && it.x === x), hand = x => list.find(it => it.type === 'ellipse' && it.x === x);
    assert.ok(near(rect(42).y - 150, d) && near(128 - hand(98).y, d), 't = ' + t + ' の定滑車');
    assert.ok(near(rect(210).y - 166, d) && near(hand(248).y - 54, 2 * d), 't = ' + t + ' の動滑車');
    assert.ok(hand(248).y - 11 >= 18, 't = ' + t + ' で手が天井に当たる');
    assert.ok(rect(210).y + 30 <= 220 - 14 * 0.85 + 1e-9, 't = ' + t + ' でおもりが「動滑車」にかかる');
  }
  assert.equal(physics.pulleyCompareLow(0), 0);
  assert.ok(textOf(items('mo-pulley-compare', 0.6), '引いた長さ') && !textOf(items('mo-pulley-compare', 0.2), '引いた長さ'));
});

test('mo-lever: 手の側が押し下げた距離 ＝ 物体が上がった距離 × 4。t = 0 は棒が水平で静止図と同じ、棒の右はしは床に当たらない', () => {
  for (let i = 1; i < 40; i++) {
    const list = items('mo-lever', i / 40);
    const box = list.find(it => it.type === 'rect'), push = byType(list, 'arrow')[0];
    const rise = 116 - box.y, drop = push.y2 - 146;
    assert.ok(rise > 0 && near(drop, 4 * rise, 1e-9), 't = ' + i / 40);
  }
  const bar = t => items('mo-lever', t).find(it => it.type === 'line' && it.width === 6);
  assert.deepEqual(bar(0).points, [[30, 150], [300, 150]]);
  for (let i = 0; i <= 40; i++) assert.ok(bar(i / 40).points[1][1] + 3 < 190, '棒の右はしが床に当たる');
});

test('mo-ball-block: 球はレールを下って 0.45 で木片に当たり、木片は 0.45〜0.75 で 50 すべって止まる。t = 0 は静止図の位置', () => {
  assert.deepEqual(physics.ballBlock(0), { ball: [30, 62], blockX: 200 });
  [0.1, 0.3, 0.44].forEach(t => assert.equal(physics.ballBlock(t).blockX, 200, 't = ' + t));
  const hit = physics.ballBlock(0.45).ball;
  assert.ok(near(hit[0], 188, 1e-9) && near(hit[1], 178, 1e-9));
  assert.equal(physics.ballBlock(0.8).blockX, 250);
  // 球はだんだん速くなる（同じ時間に進む長さがふえる）
  const step = t => Math.hypot(physics.ballBlock(t + 0.05).ball[0] - physics.ballBlock(t).ball[0], physics.ballBlock(t + 0.05).ball[1] - physics.ballBlock(t).ball[1]);
  assert.ok(step(0.05) < step(0.2) && step(0.2) < step(0.35));
});
