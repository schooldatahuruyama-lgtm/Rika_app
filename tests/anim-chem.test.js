// tests/anim-chem.test.js — 化学の動く図（js/anim-chem.js）。docs/anim-plan.md 3-5 の 2・6 章
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const chem = require('../js/anim-chem.js');
const figures = require('../js/figures.js');

const EXPECTED = [
  'su-water-displacement', 'st-particles', 'st-heating-curve', 'sl-dissolve', 'sl-recrystallize',
  'ch-water-formation', 'ch-open-container',
  'io-ion-formation', 'io-dissociation', 'io-daniell', 'io-migration', 'io-neutralize',
  // 優先度 B
  'su-upward-displacement', 'su-downward-displacement', 'su-co2-limewater', 'st-distill-order', 'sl-saturate',
  'ch-mass-conservation', 'io-ion-count',
];
// ミニプリント（1nen）の 10 本（docs/plans/mp-figures-1nen.md）
const EXPECTED_MP = ['su-three-methods', 'su-discard-first', 'su-ammonia-fountain', 'sl-filter-pass', 'sl-crystal-start',
  'st-state-arrows', 'st-melt-boil', 'st-mixture-curve', 'st-tube-out-first', 'st-fractional-tower'];
// ミニプリント（2nen）の 3 本（docs/plans/mp-figures-2nen.md）
const EXPECTED_MP2 = ['ch-reduction-model', 'ch-heat-thermometer', 'ch-precipitate-mass'];
// ミニプリント（3nen）の 6 本（docs/plans/mp-figures-3nen.md）
const EXPECTED_MP3 = ['io-cucl2-ions', 'io-hcl-cell', 'io-fuel-cell', 'io-oh-migration', 'io-btb-neutral', 'io-neutral-model'];
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

test('KINDS は計画の 19 本（化学の優先度 A 12 本・B 7 本）とミニプリントの 10 本（1nen）・3 本（2nen）・6 本（3nen）で、名前は単元の接頭辞で始まり、anim.KINDS の後ろに入っている', () => {
  assert.deepEqual(chem.KINDS, EXPECTED.concat(EXPECTED_MP, EXPECTED_MP2, EXPECTED_MP3));
  chem.KINDS.forEach(kind => {
    assert.ok(PREFIXES.some(p => kind.startsWith(p)), kind + ' の接頭辞');
    assert.ok(anim.KINDS.includes(kind), kind + ' が anim.KINDS にない');
    assert.equal(anim.periodOf(kind), 4000);
  });
  assert.equal(anim.KINDS.length, 23 + 19 + 10 + 3 + 6);
});

test('restT は計画どおり', () => {
  const rest = {
    'su-water-displacement': 0, 'st-particles': 0, 'st-heating-curve': 0.99, 'sl-dissolve': 0, 'sl-recrystallize': 0.99,
    'ch-water-formation': 0.99, 'ch-open-container': 0.99, 'io-ion-formation': 0.99, 'io-dissociation': 0.6,
    'io-daniell': 0, 'io-migration': 0.85 * 56 / 96, 'io-neutralize': 0.99,
    'su-upward-displacement': 0.99, 'su-downward-displacement': 0.99, 'su-co2-limewater': 0.99, 'st-distill-order': 0.99,
    'sl-saturate': 0.99, 'ch-mass-conservation': 0.99, 'io-ion-count': 0.99,
    'su-three-methods': 0, 'su-discard-first': 0, 'su-ammonia-fountain': 0.99, 'sl-filter-pass': 0, 'sl-crystal-start': 0.99,
    'st-state-arrows': 0, 'st-melt-boil': 0.99, 'st-mixture-curve': 0.99, 'st-tube-out-first': 0.99, 'st-fractional-tower': 0,
    'ch-reduction-model': 0.99, 'ch-heat-thermometer': 0.99, 'ch-precipitate-mass': 0.99,
    'io-cucl2-ions': 0, 'io-hcl-cell': 0, 'io-fuel-cell': 0, 'io-oh-migration': 0.85 * 56 / 96, 'io-btb-neutral': 0, 'io-neutral-model': 0.99,
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

// ---- 優先度 B ----

// 2 つの丸の中心の距離の、半径の和からのあまり（負なら重なっている）
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
function minGap(list) {
  let m = Infinity;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) m = Math.min(m, gap(list[i], list[j]));
  return m;
}
// トークン名 → 色コード（大文字）
const hexOf = token => anim.helpers.TOKEN_HEX[token].toUpperCase();

test('su-upward/downward-displacement: 試験管の奥から気体がたまり、もとの空気の粒が口から外へおし出される。粒は重ならない', () => {
  [['su-upward-displacement', 'purple', y => y, '#E9DDF8'], ['su-downward-displacement', 'gray', y => 260 - y, '#E6E8EC']].forEach(([kind, gas, Y, fill]) => {
    const region = list => list.find(it => it.type === 'polygon' && it.fill === fill);
    const air = list => circles(list, c => c.fill === 'white');
    // t = 0 は静止図と同じ（試験管は空）。空気の粒 4 つは試験管の中
    const first = items(kind, 0);
    assert.equal(region(first), undefined, kind + ' の t = 0 に気体がある');
    assert.equal(air(first).length, 4);
    air(first).forEach(c => assert.ok(Y(c.y) > 52 && Y(c.y) < 150 && c.x > 150 && c.x < 170, kind + ' の t = 0 の空気の粒'));
    // 気体の先（試験管の奥からの位置）は t とともに進み、口の手前（y 146）で止まる
    const depth = list => { const r = region(list); return r ? Math.max(...r.points.map(p => Y(p[1]))) : 52; };
    let prev = -Infinity;
    [0.05, 0.2, 0.4, 0.6, 0.8, 0.99].forEach(t => { const d = depth(items(kind, t)); assert.ok(d >= prev - 1e-9, kind + ' t = ' + t); prev = d; });
    assert.ok(near(depth(items(kind, 0.99)), 146));
    // 気体の部分は奥（上方置換法は上・下方置換法は下）から始まる
    assert.ok(near(Math.min(...region(items(kind, 0.5)).points.map(p => Y(p[1]))), 52, 1e-6));
    // 0.99 で空気の粒はすべて口の外、気体の粒 8 つは試験管の中で濃い色
    const end = items(kind, 0.99);
    assert.equal(air(end).length, 4);
    air(end).forEach(c => assert.ok(Y(c.y) > 150 + 3, kind + ' の 0.99 で口の中に空気の粒が残る y = ' + c.y));
    const dots = circles(end, c => c.r === 3 && c.fill !== 'white' && c.x > 150 && c.x < 170 && Y(c.y) < 146);
    assert.equal(dots.filter(c => String(c.fill).toUpperCase() === hexOf(gas)).length, 8, kind + ' の気体の粒');
    // どの時刻でも、空気の粒・気体の粒・管の中を流れる粒は重ならない
    for (let n = 0; n < 1000; n++) {
      const list = circles(items(kind, n / 1000), c => c.r === 3);
      assert.ok(minGap(list) >= -1e-9, kind + ' t = ' + n / 1000 + ' で粒が重なる');
    }
  });
});

test('su-co2-limewater: にごりの白い粒は 0 から 12 まで増え、どれも石灰水の中。泡はガラス管の先から液面までのあいだ', () => {
  const cloud = t => circles(items('su-co2-limewater', t), c => c.r === 3.5);
  assert.equal(cloud(0).length, 0);
  let prev = 0;
  [0.1, 0.3, 0.5, 0.7, 0.85, 0.99].forEach(t => { const n = cloud(t).length; assert.ok(n >= prev, 't = ' + t); prev = n; });
  assert.equal(cloud(0.99).length, 12);
  cloud(0.99).forEach(c => {
    assert.ok(c.y - c.r > 161 && c.y + c.r < 215 && c.x - c.r > 181 && c.x + c.r < 259, '粒が石灰水の外 (' + c.x + ',' + c.y + ')');
    assert.equal(String(c.fill).toUpperCase(), '#FFFFFF');
  });
  for (let n = 0; n < 200; n++) {
    const list = items('su-co2-limewater', n / 200);
    circles(list, c => c.r === 3 && c.x > 212).forEach(b => assert.ok(b.y >= 161 && b.y <= 201, '泡 y = ' + b.y));
    // にごりの粒と泡は重ならない
    const inBeaker = circles(list, c => (c.r === 3 && c.x > 212 && c.y > 161) || c.r === 3.5);
    assert.ok(minGap(inBeaker) >= 0, 't = ' + n / 200 + ' で石灰水の中の粒が重なる');
  }
});

test('st-distill-order: 1 本目 → 2 本目 → 3 本目の順に液がたまり、0.99 で 3 本とも静止図と同じ level 0.3。青い名前はたまっている 1 本だけ', () => {
  const levels = t => items('st-distill-order', t).filter(it => it.type === 'tube').map(it => it.level);
  assert.deepEqual(levels(0), [0, 0, 0]);
  levels(0.99).forEach(v => assert.ok(near(v, 0.3)));
  // 2 本目がたまり始めるとき、1 本目はたまり終わっている（順に集める）
  for (let n = 0; n <= 100; n++) {
    const t = n / 100, [a, b, c] = levels(t);
    if (b > 0) assert.ok(near(a, 0.3), 't = ' + t);
    if (c > 0) assert.ok(near(b, 0.3), 't = ' + t);
    const blue = texts(items('st-distill-order', t)).filter(it => it.color === 'blue');
    assert.ok(blue.length <= 1, 't = ' + t + ' で青い名前が ' + blue.length);
  }
  assert.equal(texts(items('st-distill-order', 0.4)).find(it => it.color === 'blue').text, '2 本目');
  assert.ok(!texts(items('st-distill-order', 0.99)).some(it => it.color === 'blue'));
});

test('sl-saturate: とけた粒は 0 → 12 個に増え（それ以上は増えない）、そのあとの結晶は底にたまる。0.99 で山は静止図と同じ。粒は重ならない', () => {
  const dots = t => circles(items('sl-saturate', t), c => c.fill === 'purple');
  const pile = t => items('sl-saturate', t).find(it => it.type === 'polygon' && it.points.length === 7);
  assert.equal(dots(0).length, 0);
  assert.equal(pile(0), undefined);
  assert.equal(dots(0.55).length, 12);
  assert.equal(pile(0.55), undefined, 'とけている間に、とけ残りがある');
  assert.equal(dots(0.99).length, 12);
  assert.deepEqual(pile(0.99).points, [[100, 196], [112, 186], [126, 190], [136, 184], [150, 190], [164, 185], [178, 196]]);
  // 「とけ残り」「飽和水溶液」「もうこれ以上とけない」はとけ残りができてから
  assert.ok(!texts(items('sl-saturate', 0.55)).some(it => it.text === 'とけ残り'));
  assert.ok(texts(items('sl-saturate', 0.3)).some(it => it.text === 'まだとける'));
  ['とけ残り', '飽和水溶液', 'もうこれ以上とけない'].forEach(s => assert.ok(texts(items('sl-saturate', 0.99)).some(it => it.text === s)));
  let prevPile = 0;
  for (let n = 0; n < 1000; n++) {
    const t = n / 1000, ds = dots(t);
    assert.ok(ds.length <= 12);
    assert.ok(minGap(ds) >= -1e-9, 't = ' + t + ' でとけた粒が重なる');
    ds.forEach(c => assert.ok(c.y - c.r > 109 && c.x - c.r > 76 && c.x + c.r < 204, 't = ' + t + ' の粒が水の外'));
    const k = chem.satPileK(t);
    assert.ok(k >= prevPile - 1e-12);
    prevPile = k;
  }
});

test('ch-mass-conservation: はかりは各 t で両方とも 80.0 g。泡は 0 → 6 個にふえて上の空間にたまり、0.99 で静止図の泡 (230,100)・(250,88) がある', () => {
  const bubbles = t => circles(items('ch-mass-conservation', t), c => c.fill === 'white' && c.x > 200);
  for (let n = 0; n <= 100; n++) {
    const t = n / 100;
    const scales = items('ch-mass-conservation', t).filter(it => it.type === 'rect' && it.fill === 'glass');
    assert.deepEqual(scales.map(r => r.label), ['80.0 g', '80.0 g']);
    const bs = bubbles(t);
    assert.ok(minGap(bs) >= 0, 't = ' + t + ' で泡が重なる');
    bs.forEach(b => assert.ok(b.x - b.r > 211 && b.x + b.r < 269 && b.y - b.r > 65 && b.y + b.r < 158, 't = ' + t + ' の泡が容器の外'));
  }
  assert.equal(bubbles(0).length, 0);
  const end = bubbles(0.99);
  assert.equal(end.length, 6);
  assert.ok(end.some(b => near(b.x, 230) && near(b.y, 100) && b.r === 4));
  assert.ok(end.some(b => near(b.x, 250) && near(b.y, 88) && b.r === 4));
  end.forEach(b => assert.ok(b.y + b.r < 120, 'たまった泡が水の中'));
  assert.ok(!texts(items('ch-mass-conservation', 0.5)).some(it => it.text === '変わらない'));
  assert.ok(texts(items('ch-mass-conservation', 0.99)).some(it => it.text === '変わらない'));
});

test('io-ion-count: 交点は 4 本の線の上でカーソルの近く、丸どうしは重ならない。中性（10 cm³）で止まって「緑色（中性）」、そこで H+ と OH- は 0、Na+ = Cl-', () => {
  const LINE = {
    orange: x => 200 - 160 * (x - 60) / 230,
    green: () => 120,
    blue: x => (x <= 175 ? 120 + 80 * (x - 60) / 115 : 200),
    purple: x => (x <= 175 ? 200 : 200 - 80 * (x - 175) / 115),
  };
  const at = t => {
    const list = items('io-ion-count', t);
    const cursor = list.find(it => it.type === 'line' && it.color === 'blue' && it.dashed);
    const dots = circles(list, d => d.r === 4 && LINE[d.fill]);
    return { list, x: cursor.points[0][0], top: cursor.points[1][1], dots,
      name: texts(list).find(it => it.x === 118 && it.y === 104).text };
  };
  for (let n = 0; n <= 400; n++) {
    const t = n / 400 * 0.99, s = at(t);
    assert.equal(s.dots.length, 4);
    s.dots.forEach(d => {
      assert.ok(near(d.y, LINE[d.fill](d.x), 1e-9), 't = ' + t + ' の ' + d.fill + ' の丸が線の上にない');
      assert.ok(Math.abs(d.x - s.x) <= 12, 't = ' + t + ' の ' + d.fill + ' の丸がカーソルから遠い');
      assert.ok(d.x >= 60 - 1e-9 && d.x <= 290 + 1e-9);
    });
    assert.ok(minGap(s.dots) >= 1 - 1e-9, 't = ' + t + ' で交点の丸が重なる');
    // 中性までは、カーソルが左上のビーカーと文字（y 104 より上）にかからない
    if (s.x <= 175) assert.ok(s.top >= 110 - 1e-9, 't = ' + t + ' のカーソルの上のはし ' + s.top);
  }
  assert.equal(at(0).name, '黄色（酸性）');
  [0.36, 0.45, 0.54].forEach(t => {
    const s = at(t);
    assert.ok(near(s.x, 175), 't = ' + t);
    assert.equal(s.name, '緑色（中性）');
    const d = c => s.dots.find(x => x.fill === c);
    assert.ok(near(d('blue').y, 200) && near(d('purple').y, 200), 'H+ と OH- は 0');
    assert.ok(Math.abs(d('orange').y - 120) <= 4, 'Na+ が Cl- と同じ数に見えない');
  });
  assert.equal(at(0.99).name, '青色（アルカリ性）');
  assert.ok(near(at(0.99).x, 290));
  assert.ok(texts(at(0.45).list).some(it => it.text === 'いま 10 cm³'));
});

// 文字の重なりを見るための箱（全角 1 文字 ＝ size、半角 ＝ size × 0.6 の概算。tests/anim-physics.test.js と同じ）。y はベースライン
function textBox(it) {
  const size = Math.max(12, it.size || 16);
  const w = Array.from(String(it.text)).reduce((s, c) => s + (/[ -~]/.test(c) ? 0.6 : 1) * size, 0);
  const left = it.anchor === 'middle' ? it.x - w / 2 : it.anchor === 'end' ? it.x - w : it.x;
  return { left, right: left + w, top: it.y - size * 0.85, bottom: it.y + size * 0.15 };
}
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const KINDS_B = EXPECTED.slice(12);

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
  'su-three-methods': ['substance.js', 'substance-mp4-c1'], 'su-discard-first': ['substance.js', 'substance-mp4-c3'],
  'su-ammonia-fountain': ['substance.js', 'substance-mp5-c2'], 'sl-filter-pass': ['solution.js', 'solution-mp1-c3'],
  'sl-crystal-start': ['solution.js', 'solution-mp4-c1'], 'st-state-arrows': ['state-change.js', 'state-change-mp1-c1'],
  'st-melt-boil': ['state-change.js', 'state-change-mp2-c1'], 'st-mixture-curve': ['state-change.js', 'state-change-mp3-c1'],
  'st-tube-out-first': ['state-change.js', 'state-change-mp4-c2'], 'st-fractional-tower': ['state-change.js', 'state-change-mp4-c3'],
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

test('ミニプリント: つながる kind（sl-filter-pass・st-state-arrows・st-fractional-tower）は t = 0 と t = 0.99999 の座標の差が 1px 以内', () => {
  ['sl-filter-pass', 'st-state-arrows', 'st-fractional-tower'].forEach(kind => sameWithin1px(items(kind, 0), items(kind, 0.99999), kind));
});

test('su-three-methods: t = 0 は気体の粒がない。気体がたまると、イは試験管の上から、ウは底から粒が増え、アの水面が下がる', () => {
  const dots = (t, x0, x1) => circles(items('su-three-methods', t), c => c.r === 3 && c.x >= x0 && c.x <= x1 && c.y < (x0 > 200 ? 186 : 120));
  assert.equal(circles(items('su-three-methods', 0)).length, 0);
  // イ（x 149〜171）: 先にたまるのは上（y の小さい所）
  const up = dots(0.3, 150, 170).filter(c => c.x !== 160);
  assert.ok(up.length >= 2 && Math.min(...up.map(c => c.y)) === 37);
  // ウ（x 254〜276）: 先にたまるのは底（y の大きい所）
  const down = dots(0.3, 255, 275).filter(c => c.x !== 265);
  assert.ok(down.length >= 2 && Math.max(...down.map(c => c.y)) === 183);
  const waterTop = (t) => Math.min(...items('su-three-methods', t).find(it => it.type === 'polygon').points.map(p => p[1]));
  assert.ok(waterTop(0.5) > waterTop(0.1));
});

test('su-discard-first: t = 0 は試験管がガラス管の上（x 180）で水に満たされている。はじめの泡のときは試験管が横にある', () => {
  const tube = (t) => items('su-discard-first', t).find(it => it.type === 'tube');
  assert.equal(tube(0).x, 180);
  assert.equal(tube(0.2).x, 230);
  assert.equal(tube(0.6).x, 180);
  // ゴム栓は最後だけ
  assert.ok(!items('su-discard-first', 0.6).some(it => it.type === 'rect' && it.fill === 'gray'));
  assert.ok(items('su-discard-first', 0.99).some(it => it.type === 'rect' && it.fill === 'gray' && near(it.y, 154)));
});

test('su-ammonia-fountain: はじめはアンモニアの粒があり噴水がない。止まった絵は粒がなく、静止図と同じ赤い噴水', () => {
  const nh3 = (t) => circles(items('su-ammonia-fountain', t), c => c.fill === 'lightgreen').length;
  assert.equal(nh3(0), 10);
  assert.equal(nh3(0.99), 0);
  const red = (t) => items('su-ammonia-fountain', t).filter(it => it.type === 'line' && it.color === 'red');
  assert.equal(red(0.3).length, 0);
  assert.deepEqual(red(0.99).map(l => l.points), [[[160, 76], [140, 50]], [[160, 76], [180, 50]], [[160, 76], [160, 42]]]);
  assert.equal(circles(items('su-ammonia-fountain', 0.99), c => c.fill === 'red').length, 3);
});

test('sl-filter-pass: t = 0 の水の粒は静止図と同じ位置。水の粒は穴の真上・真下（x 80・160・240）を通り、泥の粒は y が変わらない', () => {
  const water = (t) => circles(items('sl-filter-pass', t), c => c.fill === 'blue');
  assert.deepEqual(water(0).map(c => [c.x, c.y]), [[80, 150], [160, 160], [240, 146]]);
  for (let t = 0; t < 1; t += 0.05) {
    water(t).forEach(c => assert.ok([80, 160, 240].includes(c.x) && c.y >= 58 && c.y < 184));
    circles(items('sl-filter-pass', t), c => c.fill === 'brown').forEach(c => assert.ok(c.y === 96 || c.y === 98));
  }
});

test('sl-crystal-start: カーソルは 70 ℃ から 20 ℃ へ動き、溶解度が 50 g を下回ると「ここで結晶が出はじめる」。止まった絵の帯は静止図と同じ 88〜136', () => {
  const band = (t) => items('sl-crystal-start', t).find(it => it.type === 'line' && it.color === 'orange');
  const msg = (t) => items('sl-crystal-start', t).some(it => it.text === 'ここで結晶が出はじめる');
  assert.equal(band(0), undefined);
  assert.ok(!msg(0));
  assert.deepEqual(band(0.99).points, [[88, 168], [136, 168]]);
  assert.ok(msg(0.99));
  // 40 ℃（x 136）より左に来たら帯が伸び始めるが、50 g を下回る（約 32 ℃）までは文字が出ない
  let sawBandWithoutMsg = false;
  for (let t = 0; t < 0.8; t += 0.005) if (band(t) && !msg(t)) sawBandWithoutMsg = true;
  assert.ok(sawBandWithoutMsg);
  // 止まった絵の点線は、数の行（溶解度 y 100・温度 y 146）の文字の高さでとぎれる
  [0.5, 0.99].forEach(t => {
    const dashes = items('sl-crystal-start', t).filter(it => it.type === 'line' && it.dashed && it.color === 'blue');
    assert.ok(dashes.length >= 2, 't = ' + t);
    dashes.forEach(d => [[87, 101], [135, 148]].forEach(([top, bottom]) => {
      const y1 = Math.min(d.points[0][1], d.points[1][1]), y2 = Math.max(d.points[0][1], d.points[1][1]);
      assert.ok(y2 < top || y1 > bottom, 't = ' + t + ' の点線 ' + y1 + '〜' + y2);
    }));
  });
});

test('st-state-arrows: t = 0 はどの箱も囲まない。印が着くと着いた箱を矢印の色で囲む（固体 → 液体 → 気体 → 固体 → 気体）', () => {
  const frames = (t) => items('st-state-arrows', t).filter(it => it.type === 'rect' && it.fill === 'none');
  assert.equal(frames(0).length, 0);
  assert.deepEqual(frames(0.2).map(f => [f.x, f.y, f.stroke]), [[216, 146, 'orange']]);
  assert.deepEqual(frames(0.44).map(f => [f.x, f.y, f.stroke]), [[116, 26, 'orange']]);
  assert.deepEqual(frames(0.68).map(f => [f.x, f.y, f.stroke]), [[16, 146, 'blue']]);
  assert.deepEqual(frames(0.92).map(f => [f.x, f.y, f.stroke]), [[116, 26, 'orange']]);
  assert.ok(items('st-state-arrows', 0.85).some(it => it.text === 'ドライアイス'));
});

test('st-melt-boil: 線が伸び、1 つ目の横ばいに入ると「融点」、2 つ目の横ばいに入ると「沸点」が出る。止まった絵は静止図と同じ線', () => {
  const has = (t, s) => items('st-melt-boil', t).some(it => it.text === s);
  const tipAt = (t) => items('st-melt-boil', t).find(it => it.type === 'circle');
  for (let t = 0; t < 0.85; t += 0.01) {
    const tip = tipAt(t);
    if (has(t, '融点')) assert.ok(tip.x > 80, 't = ' + t);
    if (has(t, '沸点')) assert.ok(tip.x > 200, 't = ' + t);
  }
  assert.ok(!has(0, '融点') && has(0.99, '融点') && has(0.99, '沸点'));
  assert.deepEqual(items('st-melt-boil', 0.99).find(it => it.type === 'line' && it.color === 'blue').points,
    [[50, 182], [80, 160], [130, 160], [200, 50], [290, 50]]);
});

test('st-mixture-curve: 2 本の線は同じ加熱時間（x）まで伸び、止まった絵は静止図と同じ線', () => {
  const lines = (t) => items('st-mixture-curve', t).filter(it => it.type === 'line' && (it.color === 'blue' || it.color === 'orange'));
  [0.2, 0.5, 0.7].forEach(t => {
    const [a, b] = lines(t);
    assert.ok(near(a.points[a.points.length - 1][0], b.points[b.points.length - 1][0]), 't = ' + t);
  });
  const card = mpLesson('state-change.js', 'state-change-mp3-c1');
  const st = card.figure.items.filter(it => it.type === 'line' && (it.color === 'blue' || it.color === 'orange'));
  lines(0.99).forEach((l, i) => l.points.forEach((p, j) => assert.ok(near(p[0], st[i].points[j][0]) && near(p[1], st[i].points[j][1]))));
});

test('st-tube-out-first: ガラス管を液から出してから火を消す（ガラス管の先が液面 y 167 より上に出たあとで火が消える）', () => {
  const tip = (t) => items('st-tube-out-first', t).find(it => it.type === 'line' && it.points.length === 3).points[2][1];
  const flame = (t) => items('st-tube-out-first', t).some(it => it.type === 'flame');
  assert.ok(tip(0) > 167 && flame(0));
  for (let t = 0; t < 1; t += 0.01) if (!flame(t)) assert.ok(tip(t) < 167, 't = ' + t);
  assert.equal(tip(0.99), 120);
  assert.ok(!flame(0.99));
});

test('st-fractional-tower: t = 0 は粒がない。粒は色ごとに決まった取り出し口の高さで右へ出る', () => {
  assert.equal(circles(items('st-fractional-tower', 0)).length, 0);
  const OUT = { sky: 50, yellow: 86, orange: 122, brown: 158 };
  for (let t = 0; t < 1; t += 0.01) {
    circles(items('st-fractional-tower', t), c => c.fill !== 'ink').forEach(c => {
      if (c.x > 180) assert.ok(near(c.y, OUT[c.fill]), 't = ' + t + ' の ' + c.fill);
      else assert.ok(c.y >= OUT[c.fill] - 1e-9, 't = ' + t + ' の ' + c.fill + ' が取り出し口より上');
    });
  }
});

// ================================================================
// ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」と「もとにする kind」
// ================================================================

const MP2_KINDS = EXPECTED_MP2;
const MP2_CARDS = {
  'ch-reduction-model': ['chemical-change.js', 'chemical-change-mp8-c2'],
  'ch-heat-thermometer': ['chemical-change.js', 'chemical-change-mp8-c3'],
  'ch-precipitate-mass': ['chemical-change.js', 'chemical-change-mp9-c1'],
};
// カード id → [単元のファイル, 使い回す kind]
const MP2_SHARED = {
  'chemical-change-mp5-c1': ['chemical-change.js', 'ch-water-formation'],
  'chemical-change-mp9-c2': ['chemical-change.js', 'ch-open-container'],
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

test('ch-reduction-model: 左の 2CuO ＋ C は各 t で静止図のまま。止まった絵の原子の複製は右の位置（Cu 2・O–C–O）にある', () => {
  const card = mpLesson('chemical-change.js', 'chemical-change-mp8-c2');
  const key = c => [c.label, c.x, c.y, c.r].join(',');
  const left = card.figure.items.filter(it => it.type === 'circle' && it.x < 140).map(key);
  const right = card.figure.items.filter(it => it.type === 'circle' && it.x > 150).map(key).sort();
  [0, 0.2, 0.5, 0.99].forEach(t => {
    const got = circles(items('ch-reduction-model', t), c => c.stroke === 'ink').map(key);
    left.forEach(k => assert.ok(got.includes(k), 't = ' + t + ' に左の ' + k + ' がない'));
  });
  const moved = circles(items('ch-reduction-model', 0.99), c => c.stroke === 'ink').slice(5).map(key).sort();
  assert.deepEqual(moved, right);
  // O は 0.1 から Cu を離れ、「還元」はそのときから出る
  assert.ok(!texts(items('ch-reduction-model', 0.05)).some(it => it.text === '還元'));
  assert.ok(texts(items('ch-reduction-model', 0.3)).some(it => it.text === '還元'));
  assert.ok(texts(items('ch-reduction-model', 0.99)).some(it => it.text === '酸化' && it.x === 262));
});

test('ch-heat-thermometer: 左の液の先は 150 → 100 へ上がり、右は 110 → 160 へ下がる。止まった絵の矢印は静止図と同じ', () => {
  const marks = t => circles(items('ch-heat-thermometer', t), c => c.r === 3).map(c => [c.x, c.y]);
  assert.deepEqual(marks(0), [[110, 150], [250, 110]]);
  let prev = marks(0);
  for (let i = 1; i <= 80; i++) {
    const m = marks(i / 100);
    assert.ok(m[0][1] <= prev[0][1] + 1e-9 && m[1][1] >= prev[1][1] - 1e-9, 't = ' + i / 100);
    prev = m;
  }
  assert.ok(near(marks(0.99)[0][1], 100) && near(marks(0.99)[1][1], 160));
  const card = mpLesson('chemical-change.js', 'chemical-change-mp8-c3');
  const arrows = list => list.filter(it => it.type === 'arrow').map(a => [a.x1, a.y1, a.x2, a.y2, a.color]);
  assert.deepEqual(arrows(items('ch-heat-thermometer', 0.99)), arrows(card.figure.items));
  assert.equal(arrows(items('ch-heat-thermometer', 0)).length, 0);
});

test('ch-precipitate-mass: はかりは各 t で左右とも 100.0 g。注いでから沈殿ができ、止まった絵は静止図と同じ沈殿・ビーカー', () => {
  for (let i = 0; i < 100; i++) {
    assert.equal(texts(items('ch-precipitate-mass', i / 100)).filter(it => it.text === '100.0 g').length, 2);
  }
  const precip = t => items('ch-precipitate-mass', t).find(it => it.type === 'ellipse');
  assert.equal(precip(0.3), undefined);
  const card = mpLesson('chemical-change.js', 'chemical-change-mp9-c1');
  const st = card.figure.items.find(it => it.type === 'ellipse');
  const rest = precip(0.99);
  assert.deepEqual([rest.x, rest.y, rest.rx, rest.ry], [st.x, st.y, st.rx, st.ry]);
  const beakers = list => list.filter(it => it.type === 'beaker').map(b => [b.x, b.y, b.width, b.height, b.level]);
  assert.deepEqual(beakers(items('ch-precipitate-mass', 0.99)), beakers(card.figure.items));
  // 注ぐあいだは大きいビーカーの液がふえ、小さいビーカーの液がへる
  const level = (t, x) => items('ch-precipitate-mass', t).find(it => it.type === 'beaker' && it.x === x).level;
  assert.ok(level(0.2, 230) > level(0, 230) && level(0.2, 292) < level(0, 292));
});

// ================================================================
// ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」と「動く図（使い回し）」
// ================================================================

const MP3_CARDS = {
  'io-cucl2-ions': ['ion.js', 'ion-mp3-c2'], 'io-hcl-cell': ['ion.js', 'ion-mp4-c2'], 'io-fuel-cell': ['ion.js', 'ion-mp6-c3'],
  'io-oh-migration': ['ion.js', 'ion-mp7-c2'], 'io-btb-neutral': ['ion.js', 'ion-mp8-c1'], 'io-neutral-model': ['ion.js', 'ion-mp9-c1'],
};
// カード id → [単元のファイル, 使い回す kind]（計画の「動く図（使い回し）」。kind を増やさず既存の kind をそのまま使う）
const MP3_SHARED = { 'ion-mp6-c1': ['ion.js', 'io-daniell'] };
const ionCircles = list => list.filter(it => it.type === 'circle' && it.label).map(it => JSON.stringify([it.x, it.y, it.r, it.fill, it.label])).sort();

test('ミニプリント（3nen）: カードがその kind を使い、静止図の text・label が frame(kind, restT) に同じ text・x・y で入っている', () => {
  assert.deepEqual(Object.keys(MP3_CARDS), EXPECTED_MP3);
  EXPECTED_MP3.forEach(kind => {
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
    assert.ok(chem.KINDS.includes(kind) && !EXPECTED_MP3.includes(kind), kind);
  });
});

test('ミニプリント（3nen）: つながる kind（io-hcl-cell）は t = 0 と t = 0.99999 の座標の差が 1px 以内', () => {
  sameWithin1px(items('io-hcl-cell', 0), items('io-hcl-cell', 0.99999), 'io-hcl-cell');
});

test('io-cucl2-ions: t = 0 のイオンは静止図と同じ。Cu2+ は陰極（右）へ、Cl- は陽極（左）へ動き、陰極の銅の層はだんだん厚くなる', () => {
  const card = mpLesson('ion.js', 'ion-mp3-c2');
  assert.deepEqual(ionCircles(items('io-cucl2-ions', 0)), ionCircles(card.figure.items));
  const at = (t, label) => items('io-cucl2-ions', t).find(it => it.type === 'circle' && it.label === label);
  assert.ok(at(0.1, 'Cu2+').x > at(0, 'Cu2+').x && at(0.1, 'Cl-').x < at(0, 'Cl-').x);
  const layer = t => (items('io-cucl2-ions', t).find(it => it.type === 'rect' && it.x < 204 && it.x > 200) || { width: 0 }).width;
  assert.equal(layer(0), 0);
  assert.ok(layer(0.3) < layer(0.6) && layer(0.6) < layer(0.9));
  // 陽極に着いた 1 個目の Cl- は塩素原子になって待ち、2 個目が着くと 2 個そろって泡（Cl₂）になって上がる
  const ph = 0.5 * 30 / 65;
  const at0 = u => ((u - ph) % 1 + 1) % 1;   // 1 周の中の位置 u になる t
  const cls = t => items('io-cucl2-ions', t).filter(it => it.type === 'circle' && it.label === 'Cl-');
  const green = t => items('io-cucl2-ions', t).filter(it => it.type === 'circle' && it.stroke === 'green' && it.x === 122);
  const cl2 = t => items('io-cucl2-ions', t).some(it => it.type === 'text' && it.text === 'Cl₂');
  assert.equal(cls(0).length, 1);
  assert.equal(cls(at0(0.4)).length, 2);                                    // 2 個とも陽極へ向かう
  assert.ok(green(at0(0.6)).length === 1 && !cl2(at0(0.6)) && cls(at0(0.6)).length === 1);   // 1 個目は原子で待ち、2 個目が向かう
  assert.ok(green(at0(0.85)).length === 1 && cl2(at0(0.85)) && cls(at0(0.85)).length === 0);   // そろって Cl₂ の泡
  assert.ok(green(at0(0.95))[0].y < green(at0(0.85))[0].y);
  for (let i = 0; i < 200; i++) {   // 2 個の Cl- は重ならない
    const c = cls(i / 200);
    if (c.length === 2) assert.ok(Math.abs(c[0].x - c[1].x) >= 38, 't = ' + i / 200);
  }
});

test('io-hcl-cell: 電子は導線（亜鉛板 → 電圧計 → 銅板）の上だけにあり、H+ は銅板へ近づいて、銅板の横で H₂ の泡が上がる', () => {
  const wire = [[102, 80], [102, 40], [140, 40], [180, 40], [218, 40], [218, 80]];
  const onWire = (x, y) => wire.slice(1).some(([bx, by], i) => {
    const [ax, ay] = wire[i];
    return Math.abs((bx - ax) * (y - ay) - (by - ay) * (x - ax)) < 1e-6 && x >= Math.min(ax, bx) - 1e-6 && x <= Math.max(ax, bx) + 1e-6 && y >= Math.min(ay, by) - 1e-6 && y <= Math.max(ay, by) + 1e-6;
  });
  for (let i = 0; i < 40; i++) {
    const es = items('io-hcl-cell', i / 40).filter(it => it.type === 'circle' && it.fill === 'sky' && it.r === 4);
    assert.ok(es.length >= 3);
    es.forEach(e => assert.ok(onWire(e.x, e.y), 't = ' + i / 40));
  }
  const h = t => items('io-hcl-cell', t).filter(it => it.type === 'circle' && it.label === 'H+').map(it => it.x);
  assert.ok(h(0.05)[0] < h(0.15)[0]);
  const b = t => items('io-hcl-cell', t).find(it => it.type === 'circle' && it.x === 205);
  assert.ok(b(0.35) && b(0.45) && b(0.45).y < b(0.35).y);
});

test('io-fuel-cell: 水素と酸素は 2 : 1 の割合で減り（水面が上がる）、そのあいだ電子が導線を流れる。t = 0 は静止図の気体の量', () => {
  const gas = (t, x) => items('io-fuel-cell', t).find(it => it.type === 'rect' && it.x === x && it.fill === 'white').height;
  assert.equal(gas(0, 80), 70);
  assert.equal(gas(0, 204), 35);
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    assert.ok(near(70 - gas(t, 80), 2 * (35 - gas(t, 204)), 1e-9), 't = ' + t);
  }
  assert.ok(gas(0.9, 80) < 70 && gas(0.9, 204) > 0);
  const electrons = t => items('io-fuel-cell', t).filter(it => it.type === 'circle' && it.fill === 'sky').length;
  assert.ok(electrons(0.4) > 0 && electrons(0.9) === 0);
});

test('io-oh-migration: 青い部分の右はしは中央から陽極へ広がり（io-migration の左右逆）、止まった絵で静止図の 224。OH- は青い部分の中', () => {
  assert.ok(near(chem.ohMigrationRight(anim.restT('io-oh-migration')), 224, 1e-9));
  for (let i = 0; i < 40; i++) {
    const t = i / 40, right = chem.ohMigrationRight(t);
    if (i > 0) assert.ok(right >= chem.ohMigrationRight((i - 1) / 40));
    items('io-oh-migration', t).filter(it => it.type === 'circle').forEach(c => assert.ok(c.x >= 160 && c.x <= Math.max(right, 172) + 1e-9));
  }
  for (let i = 0; i < 40; i++) assert.ok(near(chem.ohMigrationRight(i / 40) - 168, 152 - chem.migrationLeft(i / 40), 1e-9));
});

test('io-btb-neutral: 1 滴ずつ加えるたびに色が変わり、0 滴で青・4 滴で緑・8 滴で黄。いまの色に合う文字が blue', () => {
  assert.equal(chem.btbCount(0), 0);
  assert.equal(chem.btbCount(0.99), 8);
  assert.equal(chem.btbColor(4), '#2E9E5B');
  assert.equal(chem.btbColor(8), '#FFD34D');
  [[0, 'アルカリ性', 'blue'], [0.45, '中性', '#2E9E5B'], [0.99, '酸性', '#FFD34D']].forEach(([t, state, color]) => {
    const list = items('io-btb-neutral', t);
    assert.equal(list[0].liquid, color, 't = ' + t);
    assert.deepEqual(list.filter(it => it.type === 'text' && it.color === 'blue' && it.y === 194).map(it => it.text), [state], 't = ' + t);
  });
  let prev = -1;
  for (let i = 0; i <= 100; i++) { const n = chem.btbCount(i / 100); assert.ok(n >= prev); prev = n; }
});

test('io-neutral-model: 止まった絵（0.99）のイオンは静止図と同じ。箱を順に強調し、H+ と OH- が結びついて H₂O になる。右の箱では OH- が残る', () => {
  const card = mpLesson('ion.js', 'ion-mp9-c1');
  assert.deepEqual(ionCircles(items('io-neutral-model', 0.99)), ionCircles(card.figure.items));
  const count = (t, label, x0) => items('io-neutral-model', t).filter(it => it.type === 'circle' && it.label === label && it.x >= x0 && it.x <= x0 + 96).length;
  assert.equal(count(0, 'H+', 8), 2);       // 左の箱: はじめは H+ が 2 個
  assert.equal(count(0.99, 'H+', 8), 1);    // 1 個が OH- と結びついて水になった
  assert.equal(count(0.2, 'H+', 112), 1);   // 中の箱: はじめは H+ が 1 個
  assert.equal(count(0.99, 'H+', 112), 0);
  assert.equal(count(0.99, 'OH-', 216), 1); // 右の箱: OH- が残る
  const strokeBlue = t => items('io-neutral-model', t).filter(it => it.type === 'rect' && it.stroke === 'blue').map(it => it.x);
  assert.deepEqual(strokeBlue(0.1), [8]);
  assert.deepEqual(strokeBlue(0.4), [112]);
  assert.deepEqual(strokeBlue(0.7), [216]);
  assert.ok(texts(items('io-neutral-model', 0.18)).some(it => it.text === 'H₂O'));
});
