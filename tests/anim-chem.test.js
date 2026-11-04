// tests/anim-chem.test.js — 化学の動く図（js/anim-chem.js）。docs/anim-plan.md 3-5 の 2・6 章
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const chem = require('../js/anim-chem.js');
const figures = require('../js/figures.js');

const EXPECTED = [
  'su-water-displacement', 'st-particles', 'st-heating-curve', 'sl-dissolve', 'sl-recrystallize',
  'ch-water-formation', 'ch-open-container',
  'io-ion-formation', 'io-dissociation', 'io-daniell', 'io-migration', 'io-neutralize',
];
const PREFIXES = ['su-', 'st-', 'sl-', 'ch-', 'io-'];
const X_KEYS = ['x', 'x1', 'x2', 'cx'], Y_KEYS = ['y', 'y1', 'y2', 'cy'];
const SIZE_KEYS = ['r', 'rx', 'ry', 'width', 'height'];

const items = (kind, t) => anim.frame(kind, t).items;
const circles = (list, pred) => list.filter(it => it.type === 'circle' && (!pred || pred(it)));
const texts = (list) => list.filter(it => it.type === 'text' || it.type === 'label');
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-6 : eps);

// 2 つの場面の item が同じ並びで、座標の差がどれも 1px 以内か
function sameWithin1px(a, b, label) {
  assert.equal(a.length, b.length, label + ': item の数がちがう');
  a.forEach((it, i) => {
    const jt = b[i];
    assert.equal(it.type, jt.type, label + ' の ' + i + ' 番目の type');
    X_KEYS.concat(Y_KEYS, SIZE_KEYS).forEach(k => {
      if (it[k] === undefined && jt[k] === undefined) return;
      assert.ok(Math.abs(it[k] - jt[k]) <= 1, label + ' の ' + i + ' 番目（' + it.type + '）の ' + k + ': ' + it[k] + ' と ' + jt[k]);
    });
    if (it.points) {
      assert.equal(it.points.length, jt.points.length, label + ' の ' + i + ' 番目の点の数');
      it.points.forEach((p, j) => {
        assert.ok(Math.abs(p[0] - jt.points[j][0]) <= 1 && Math.abs(p[1] - jt.points[j][1]) <= 1, label + ' の ' + i + ' 番目の点 ' + j);
      });
    }
  });
}

test('KINDS は計画の 12 本（化学の優先度 A）で、名前は単元の接頭辞で始まり、anim.KINDS の後ろに入っている', () => {
  assert.deepEqual(chem.KINDS, EXPECTED);
  chem.KINDS.forEach(kind => {
    assert.ok(PREFIXES.some(p => kind.startsWith(p)), kind + ' の接頭辞');
    assert.ok(anim.KINDS.includes(kind), kind + ' が anim.KINDS にない');
    assert.equal(anim.periodOf(kind), 4000);
  });
  assert.equal(anim.KINDS.length, 23 + 12);
});

test('restT は計画どおり', () => {
  const rest = {
    'su-water-displacement': 0, 'st-particles': 0, 'st-heating-curve': 0.99, 'sl-dissolve': 0, 'sl-recrystallize': 0.99,
    'ch-water-formation': 0.99, 'ch-open-container': 0.99, 'io-ion-formation': 0.99, 'io-dissociation': 0.6,
    'io-daniell': 0, 'io-migration': 0.85 * 56 / 96, 'io-neutralize': 0.99,
  };
  chem.KINDS.forEach(kind => assert.ok(near(anim.restT(kind), rest[kind]), kind + ' の restT = ' + anim.restT(kind)));
});

test('各 kind: t = 0, 0.25, 0.5, 0.75, 0.999 と restT で、item は描ける種類・座標は有限で場面のまわりに収まり、sceneSvg が <svg を返す', () => {
  chem.KINDS.forEach(kind => [0, 0.25, 0.5, 0.75, 0.999, anim.restT(kind)].forEach(t => {
    const scene = anim.frame(kind, t);
    const label = kind + ' t = ' + t;
    assert.equal(scene.width, 320);
    assert.equal(scene.height, 240);
    assert.ok(Array.isArray(scene.items) && scene.items.length > 0, label + ' に item がない');
    scene.items.forEach(it => {
      assert.ok(figures.ITEM_TYPES.includes(it.type), label + ' の ' + it.type + ' は描けない');
      X_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 340, label + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
      Y_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 260, label + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
      SIZE_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= 0, label + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
      if (it.points !== undefined) {
        assert.ok(Array.isArray(it.points), label + ' の points');
        it.points.forEach(p => assert.ok(Number.isFinite(p[0]) && p[0] >= -20 && p[0] <= 340 && Number.isFinite(p[1]) && p[1] >= -20 && p[1] <= 260,
          label + ' の ' + it.type + ' の点 ' + p));
      }
    });
    const svg = figures.sceneSvg(scene);
    assert.equal(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'));
  }));
});

test('乱数を使わない: 同じ t なら同じ場面', () => {
  chem.KINDS.forEach(kind => [0.13, 0.62].forEach(t => assert.deepEqual(anim.frame(kind, t), anim.frame(kind, t))));
});

test('つながる kind: frame(kind, 0) と frame(kind, 0.99999) の座標の差が 1px 以内', () => {
  sameWithin1px(items('st-particles', 0), items('st-particles', 0.99999), 'st-particles');
  // io-daniell: 電子・モーター・Zn2+・Cu2+ はつながる。銅板に付く銅の層（だんだん厚くなる rect）は除く
  const noLayer = list => list.filter(it => !(it.type === 'rect' && it.height === 70 && it.width <= 3));
  sameWithin1px(noLayer(items('io-daniell', 0)), noLayer(items('io-daniell', 0.99999)), 'io-daniell');
});

// ---- 身のまわりの物質 ----

test('su-water-displacement: 気体がたまると試験管の中の水が短くなり、泡は水の中（水面より下・ガラス管の先より上）にある', () => {
  const waterTop = list => Math.min(...list.find(it => it.type === 'polygon' && it.fill === 'water').points.map(p => p[1]));
  let prev = -Infinity;
  [0, 0.2, 0.4, 0.6, 0.84].forEach(t => {
    const list = items('su-water-displacement', t);
    const top = waterTop(list);
    assert.ok(top > prev, 't = ' + t + ' で水面が下がっていない');
    prev = top;
    const bubbles = circles(list, c => c.fill === 'white');
    assert.equal(bubbles.length, 3, 't = ' + t + ' の泡の数');
    bubbles.forEach(b => {
      assert.ok(b.y >= top - 1e-9 && b.y <= 172, 't = ' + t + ' の泡 y = ' + b.y + '（水面 ' + top + '）');
      assert.ok(b.x > 188 && b.x < 212, 't = ' + t + ' の泡 x = ' + b.x);
    });
  });
  // t = 0 は静止図と同じ: 試験管は水でいっぱい（水面は底の丸み）、泡は (200,140)・(202,112)
  const first = items('su-water-displacement', 0);
  assert.ok(near(waterTop(first), 71), 't = 0 で満水（丸い底の内側のいちばん上 y 71 まで水）: ' + waterTop(first));
  const bs = circles(first, c => c.fill === 'white');
  assert.ok(bs.some(b => near(b.x, 200) && near(b.y, 140) && b.r === 4));
  assert.ok(bs.some(b => near(b.x, 202) && near(b.y, 112) && b.r === 5));
});

// ---- 状態変化 ----

test('st-particles: 各 t で粒が自分の箱の中にあり、動きの大きさは 気体 ＞ 液体 ＞ 固体', () => {
  const boxes = [[20, 16], [120, 12], [220, 5]];   // [箱の左はし, 粒の数]
  const groups = list => {
    const dots = circles(list, c => c.fill === 'sky');
    return [dots.slice(0, 16), dots.slice(16, 28), dots.slice(28, 33)];
  };
  const ranges = [[], [], []];   // 粒ごとの [minX, maxX, minY, maxY]
  for (let n = 0; n <= 200; n++) {
    const t = n / 200 * 0.99999;
    const g = groups(items('st-particles', t));
    g.forEach((dots, b) => {
      assert.equal(dots.length, boxes[b][1]);
      dots.forEach((d, i) => {
        const x0 = boxes[b][0];
        assert.ok(d.x - d.r >= x0 && d.x + d.r <= x0 + 80 && d.y - d.r >= 40 && d.y + d.r <= 120, 't = ' + t + ' 箱 ' + b + ' の粒 ' + i + ' が箱の外');
        const r = ranges[b][i] || (ranges[b][i] = [Infinity, -Infinity, Infinity, -Infinity]);
        r[0] = Math.min(r[0], d.x); r[1] = Math.max(r[1], d.x); r[2] = Math.min(r[2], d.y); r[3] = Math.max(r[3], d.y);
      });
    });
  }
  const spread = b => ranges[b].reduce((s, r) => s + Math.hypot(r[1] - r[0], r[3] - r[2]), 0) / ranges[b].length;
  assert.ok(spread(2) > spread(1), '気体 ' + spread(2) + ' ＞ 液体 ' + spread(1));
  assert.ok(spread(1) > spread(0), '液体 ' + spread(1) + ' ＞ 固体 ' + spread(0));
});

test('st-particles: 液体の粒はどの時刻でも重ならない（中心の距離 ≥ 14 ＝ 半径の和）', () => {
  let min = Infinity;
  for (let n = 0; n < 2000; n++) {
    const dots = circles(items('st-particles', n / 2000), c => c.fill === 'sky').slice(16, 28);
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) min = Math.min(min, Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y));
    }
  }
  assert.ok(min >= 14, '液体の粒の中心の距離の最小 ' + min);
});

test('st-particles: 気体の進む向きの矢印（矢じりの先）は箱の内側（x 220〜300・y 40〜120）に収まる', () => {
  for (let n = 0; n < 1000; n++) {
    items('st-particles', n / 1000).filter(it => it.type === 'line' && it.arrow).forEach(it => it.points.forEach(([x, y]) => {
      assert.ok(x >= 223 - 1e-9 && x <= 297 + 1e-9 && y >= 43 - 1e-9 && y <= 117 + 1e-9, 't = ' + n / 1000 + ' の矢印の点 (' + x + ',' + y + ')');
    }));
  }
});

test('st-particles: t = 0 で粒の位置は静止図（content/state-change.js の particleBox）と同じ', () => {
  const unit = require('../content/state-change.js').unit;
  const card = unit.areas.flatMap(a => a.stages).flatMap(s => s.lessons).find(c => c.id === 'state-1-c4');
  const want = circles(card.figure.items).map(c => [c.x, c.y]);
  const got = circles(items('st-particles', 0)).map(c => [c.x, c.y]);
  assert.equal(got.length, want.length);
  got.forEach((p, i) => assert.ok(near(p[0], want[i][0], 1e-9) && near(p[1], want[i][1], 1e-9), i + ' 番目の粒 ' + p + ' と ' + want[i]));
});

test('st-heating-curve: 横ばいの区間（2・4 区間目）で線の先の y が一定（160・50）、状態の文字が変わる', () => {
  const tip = t => circles(items('st-heating-curve', t), c => c.fill === 'blue' && c.r === 4)[0];
  const state = t => items('st-heating-curve', t).find(it => it.type === 'text' && it.x === 250 && it.y === 192).text;
  // 区間の境目（全長 L に対する割合）
  const L = [Math.hypot(30, 22), 50, Math.hypot(70, 110), 90];
  const total = L.reduce((a, b) => a + b, 0);
  const tAt = d => 0.85 * d / total;
  [0.2, 0.5, 0.8].forEach(q => {
    assert.ok(near(tip(tAt(L[0] + q * L[1])).y, 160), '2 区間目');
    assert.ok(near(tip(tAt(L[0] + L[1] + L[2] + q * L[3])).y, 50), '4 区間目');
  });
  assert.equal(state(tAt(L[0] * 0.5)), '固体');
  assert.equal(state(tAt(L[0] + L[1] * 0.5)), '固体と液体');
  assert.equal(state(tAt(L[0] + L[1] + L[2] * 0.5)), '液体');
  assert.equal(state(0.99), '液体と気体');
  // 「水が沸とう」は 4 区間目に入ってから
  const has = (t, s) => texts(items('st-heating-curve', t)).some(it => it.text === s);
  assert.ok(!has(tAt(L[0] + L[1] + L[2] * 0.5), '水が沸とう'));
  assert.ok(has(0.99, '水が沸とう'));
  assert.ok(!has(tAt(L[0] * 0.5), '氷がとける'));
});

// ---- 水溶液 ----

test('sl-dissolve: t = 0 は砂糖のかたまりだけ（左に粒なし）、0.99 で砂糖の大きさ 0、左の粒は右の粒と同じ横の位置で水の中', () => {
  const left = list => circles(list, c => c.fill === 'purple' && c.x < 160);
  const sugar = list => list.filter(it => it.type === 'rect' && it.fill === 'white');
  assert.equal(left(items('sl-dissolve', 0)).length, 0);
  assert.equal(sugar(items('sl-dissolve', 0)).length, 1);
  const end = items('sl-dissolve', 0.99);
  assert.equal(sugar(end).length, 0);
  const l = left(end), r = circles(end, c => c.fill === 'purple' && c.x > 160);
  assert.equal(l.length, 9);
  assert.equal(r.length, 9);
  const surface = 200 - 110 * 0.7;   // 左のビーカーの水面
  l.forEach((c, i) => {
    assert.ok(near(c.x, r[i].x - 160, 1e-9), i + ' 番目の粒の x');
    assert.ok(c.y - c.r > surface && c.y < 200, i + ' 番目の粒が水の中にない y = ' + c.y);
  });
});

test('sl-recrystallize: T = 20 で結晶 78 g（±1）、T が下がるほど結晶が増える。0.99 で静止図の矢印と同じ', () => {
  const crystal = T => 110 - chem.kno3At(T);
  assert.ok(Math.abs(crystal(20) - 78) <= 1);
  assert.ok(near(chem.recrystTemp(0), 60));
  assert.ok(near(chem.recrystTemp(0.99), 20));
  let prevT = Infinity, prevC = -Infinity;
  for (let n = 0; n <= 20; n++) {
    const t = n / 20 * 0.99;
    const T = chem.recrystTemp(t);
    assert.ok(T <= prevT + 1e-12);
    assert.ok(crystal(T) >= prevC - 1e-12);
    prevT = T; prevC = crystal(T);
  }
  const end = items('sl-recrystallize', 0.99);
  const arrow = end.find(it => it.type === 'line' && it.color === 'orange');
  assert.deepEqual(arrow.points, [[130, 45], [130, 158]]);
  assert.ok(texts(end).some(it => it.text === '78 g が' && it.x === 138 && it.y === 100));
  assert.ok(texts(end).some(it => it.text === '水温 20 ℃'));
  assert.ok(texts(items('sl-recrystallize', 0)).some(it => it.text === '0 g が'));
});

// ---- 化学変化と原子・分子 ----

test('ch-water-formation: 各 t で H の丸 4・O の丸 2（輪かく・凡例を除く）、0.99 で右の水分子の位置に重なる', () => {
  const atoms = list => circles(list, c => c.stroke === 'ink' && c.y < 200);
  [0, 0.2, 0.5, 0.75, 0.99].forEach(t => {
    const a = atoms(items('ch-water-formation', t));
    assert.equal(a.filter(c => c.fill === 'white').length, 4, 't = ' + t + ' の H');
    assert.equal(a.filter(c => c.fill === 'sky').length, 2, 't = ' + t + ' の O');
  });
  const end = items('ch-water-formation', 0.99);
  const outlines = circles(end, c => c.fill === 'none' && c.x > 200);   // 右の水分子の位置の輪かく
  assert.equal(outlines.length, 6);
  // 左（反応前の分子の位置）にも輪かくが残る
  assert.equal(circles(end, c => c.fill === 'none' && c.x < 140).length, 6);
  const a = atoms(end);
  outlines.forEach(o => assert.ok(a.some(c => near(c.x, o.x) && near(c.y, o.y) && near(c.r, o.r)), '輪かく (' + o.x + ',' + o.y + ') に原子がない'));
});

test('ch-open-container: 左のはかりは各 t で 80.0 g、右は t とともに減る（80.0 → 79.6 g）', () => {
  const scales = t => items('ch-open-container', t).filter(it => it.type === 'rect' && it.fill === 'glass');
  let prev = Infinity;
  [0, 0.2, 0.4, 0.6, 0.8, 0.99].forEach(t => {
    const [l, r] = scales(t);
    assert.equal(l.label, '80.0 g');
    const v = parseFloat(r.label);
    assert.ok(v <= prev, 't = ' + t + ' の右のはかり ' + r.label);
    prev = v;
  });
  assert.equal(scales(0)[1].label, '80.0 g');
  assert.equal(scales(0.99)[1].label, '79.6 g');
  // 左の泡は容器の中（y 66〜118）から出ない
  for (let n = 0; n < 50; n++) {
    circles(items('ch-open-container', n / 50), c => c.fill === 'white' && c.x < 160)
      .forEach(c => assert.ok(c.y - c.r >= 64 && c.y <= 120, '左の泡 y = ' + c.y));
  }
});

// ---- 化学変化とイオン ----

test('io-ion-formation: 0.99 で Na+ が (200,70)、Cl- が (200,170)、下の段の e- がない', () => {
  const end = items('io-ion-formation', 0.99);
  assert.ok(circles(end, c => c.label === 'Na+' && c.x === 200 && c.y === 70 && c.fill === 'yellow').length === 1);
  assert.ok(circles(end, c => c.label === 'Cl-' && c.x === 200 && c.y === 170 && c.fill === 'lightgreen').length === 1);
  const es = circles(end, c => c.label === 'e-');
  assert.equal(es.length, 1);
  assert.ok(es[0].x === 124 && es[0].y === 88);
  // t = 0: ナトリウム原子と塩素原子、e- は 2 つ
  const first = items('io-ion-formation', 0);
  assert.equal(circles(first, c => c.label === 'e-').length, 2);
  assert.equal(circles(first, c => c.label === 'Na+' || c.label === 'Cl-').length, 0);
});

test('io-dissociation: 結晶の並びと静止図の並びで同じ番号のイオンが同じ。0.6 で静止図と同じ位置、結晶はすき間なく並ぶ', () => {
  const unit = require('../content/ion.js').unit;
  const card = unit.areas.flatMap(a => a.stages).flatMap(s => s.lessons).find(c => c.id === 'ion-1-c4');
  const want = circles(card.figure.items);
  const crystal = circles(items('io-dissociation', 0));
  const rest = circles(items('io-dissociation', 0.6));
  assert.equal(crystal.length, 6);
  crystal.forEach((c, i) => assert.equal(c.label, want[i].label));
  rest.forEach((c, i) => {
    assert.equal(c.label, want[i].label);
    assert.ok(near(c.x, want[i].x, 1e-9) && near(c.y, want[i].y, 1e-9), i + ' 番目');
  });
  // 結晶の中のとなり合うイオンは接している（中心の距離 = 半径の和）
  assert.ok(near(Math.hypot(crystal[1].x - crystal[0].x, crystal[1].y - crystal[0].y), crystal[0].r + crystal[1].r));
});

test('io-daniell: 電子は導線の上にあり、亜鉛 → 銅の向きに進む。t = 0 で Zn2+・Cu2+ は静止図の位置', () => {
  const onWire = c => (near(c.x, 86) && c.y >= 50 && c.y <= 90) || (near(c.y, 50) && c.x >= 86 && c.x <= 234) || (near(c.x, 234) && c.y >= 50 && c.y <= 90);
  const electrons = t => circles(items('io-daniell', t), c => c.r === 4 && c.fill === 'sky');
  // 道すじに沿った位置（亜鉛板の上 0 → 銅板の上 1）
  const P = [[86, 90], [86, 50], [140, 50], [180, 50], [234, 50], [234, 90]];
  const pos = c => {
    let d = 0;
    for (let i = 1; i < P.length; i++) {
      const [x1, y1] = P[i - 1], [x2, y2] = P[i];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const onSeg = Math.abs((x2 - x1) * (c.y - y1) - (y2 - y1) * (c.x - x1)) < 1e-6 &&
        c.x >= Math.min(x1, x2) - 1e-6 && c.x <= Math.max(x1, x2) + 1e-6 && c.y >= Math.min(y1, y2) - 1e-6 && c.y <= Math.max(y1, y2) + 1e-6;
      if (onSeg) return d + Math.hypot(c.x - x1, c.y - y1);
      d += len;
    }
    return NaN;
  };
  [0, 0.1, 0.3, 0.6, 0.9].forEach(t => electrons(t).forEach(c => assert.ok(onWire(c), 't = ' + t + ' の電子 (' + c.x + ',' + c.y + ')')));
  // 少し進めると、どの電子も道すじに沿って銅板の側へ進む（はしを回りこむものは除く）
  const a = electrons(0.1).map(pos), b = electrons(0.11).map(pos);
  const total = 40 + 54 + 40 + 54 + 40;
  a.forEach(da => {
    const db = b.find(x => x > da && x - da < 0.1 * total);
    assert.ok(db !== undefined || da > total * 0.95, '電子が銅板へ向かって進んでいない（' + da + '）');
  });
  const first = items('io-daniell', 0);
  assert.ok(circles(first, c => c.label === 'Zn2+' && c.x === 122 && c.y === 172 && c.r === 23).length === 1);
  assert.ok(circles(first, c => c.label === 'Cu2+' && c.x === 198 && c.y === 172 && c.r === 23).length === 1);
});

test('io-daniell: Zn2+・Cu2+ は大きさを変えず、どの時刻でも濃く見える粒があり、色の濃さは急に変わらない', () => {
  const d = chem.daniell;
  const fOf = (path, ph, t) => { const p = d.ion(path, ((t + ph) % 1 + 1) % 1); return p ? p.f : 0; };
  for (let n = 0; n < 1000; n++) {
    const t = n / 1000, t2 = (n + 1) / 1000;
    [[d.ZN_PATH, d.ZN_PHASES], [d.CU_PATH, d.CU_PHASES]].forEach(([path, phs]) => {
      assert.ok(Math.max(...phs.map(ph => fOf(path, ph, t))) >= 0.6, 't = ' + t + ' に濃く見える粒がない');
      phs.forEach(ph => assert.ok(Math.abs(fOf(path, ph, t2) - fOf(path, ph, t)) <= 0.05, 't = ' + t + ' で色の濃さが急に変わる'));
    });
    circles(items('io-daniell', t), c => c.r > 4).forEach(c => assert.equal(c.r, 23, 't = ' + t + ' のイオンの大きさ'));
  }
  // Zn2+ は亜鉛板から遠ざかり、Cu2+ は銅板へ近づく
  assert.ok(d.ZN_PATH[1][0] > d.ZN_PATH[0][0]);
  assert.ok(d.CU_PATH[1][0] > d.CU_PATH[0][0]);
});

test('io-migration: 赤い部分は糸から陰極側へ広がり、x 162 より右に出ない。restT で静止図と同じ（左はし 96）', () => {
  const red = t => items('io-migration', t).find(it => it.type === 'rect' && it.fill === 'red');
  let prev = Infinity;
  [0, 0.2, 0.4, 0.6, 0.85, 0.99].forEach(t => {
    const r = red(t);
    assert.ok(near(r.x + r.width, 162), 't = ' + t + ' の右はし');
    assert.ok(r.x <= prev && r.x >= 40);
    prev = r.x;
    // H+ は赤い部分の中にあり、先頭は左はし
    const hs = circles(items('io-migration', t), c => c.fill === 'pink');
    assert.equal(hs.length, 4);
    hs.forEach(h => assert.ok(h.x + h.r <= 162 + 1e-9, 't = ' + t + ' の H+ x = ' + h.x));
    if (r.width >= 14) {   // 赤い部分が H+ の直径より広くなってから
      hs.forEach(h => assert.ok(h.x - h.r >= r.x - 1e-9, 't = ' + t + ' の H+ x = ' + h.x));
      assert.ok(near(Math.min(...hs.map(h => h.x - h.r)), r.x));
    }
  });
  const rest = red(anim.restT('io-migration'));
  assert.ok(near(rest.x, 96) && near(rest.width, 66));
  assert.ok(near(chem.migrationLeft(0), 152));
});

test('io-neutralize: 0.99 で H+ と OH- の丸がなく、水の 3 つの丸が静止図の位置', () => {
  const end = items('io-neutralize', 0.99);
  assert.equal(circles(end, c => (c.label === 'H+' || c.label === 'OH-') && c.fill !== 'none').length, 0);
  // 止まった絵でも、反応前のイオンの位置に灰色の輪かくと「H+」「OH-」が残る（「＋」「酸の性質」「アルカリの性質」が指す所）
  assert.ok(circles(end, c => c.label === 'H+' && c.x === 60 && c.y === 100 && c.fill === 'none' && c.stroke === 'gray').length === 1);
  assert.ok(circles(end, c => c.label === 'OH-' && c.x === 144 && c.y === 100 && c.fill === 'none' && c.stroke === 'gray').length === 1);
  assert.ok(circles(end, c => c.x === 262 && c.y === 96 && c.r === 16 && c.fill === 'sky' && c.label === 'O').length === 1);
  assert.ok(circles(end, c => c.x === 240 && c.y === 112 && c.r === 10 && c.fill === 'white').length === 1);
  assert.ok(circles(end, c => c.x === 284 && c.y === 112 && c.r === 10 && c.fill === 'white').length === 1);
  const first = items('io-neutralize', 0);
  assert.ok(circles(first, c => c.label === 'H+' && c.x === 60 && c.y === 100 && c.fill === 'pink').length === 1);
  assert.ok(circles(first, c => c.label === 'OH-' && c.x === 144 && c.y === 100 && c.fill === 'sky').length === 1);
});
