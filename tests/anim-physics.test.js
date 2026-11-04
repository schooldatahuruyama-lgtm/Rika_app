// tests/anim-physics.test.js — 解説の動く図（物理: js/anim-physics.js）。docs/anim-plan.md 3-5 の 2 と 5 章の「テスト」
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const physics = require('../js/anim-physics.js');
const figures = require('../js/figures.js');

// 計画 5 章の優先度 A（11 本）
const KINDS = ['so-air-wave', 'so-light-vs-sound', 'so-amplitude', 'so-frequency', 'fo-spring-stretch',
  'el-series-parallel', 'el-induction', 'mo-resultant', 'mo-slope-accel', 'mo-inertia', 'mo-pendulum'];
// 振動・回転・流れの kind（frame(kind, 0) と frame(kind, 0.99999) がつながる）
const LOOPS = ['so-air-wave', 'so-amplitude', 'so-frequency', 'el-series-parallel', 'el-induction',
  'mo-resultant', 'mo-inertia', 'mo-pendulum'];
const PREFIX = ['so-', 'fo-', 'el-', 'mo-'];

const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);
const items = (kind, t) => anim.frame(kind, t).items;
const byType = (list, type) => list.filter(it => it.type === type);
const textOf = (list, s) => list.find(it => it.type === 'text' && it.text === s);
const textStarting = (list, s) => list.find(it => it.type === 'text' && typeof it.text === 'string' && it.text.startsWith(s));

test('anim-physics: KINDS は計画の 11 本で、単元の接頭辞で始まり、anim.KINDS に登録されている', () => {
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
