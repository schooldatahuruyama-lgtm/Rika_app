// tests/anim.test.js — 解説の動く図（frame の計算）
const test = require('node:test'); const assert = require('node:assert/strict');
const anim = require('../js/anim.js');
const figures = require('../js/figures.js');

const TS = [0, 0.25, 0.5, 0.75];

const byType = (scene, type) => scene.items.filter(it => it.type === type);
// 点 (px, py) が (x1, y1)–(x2, y2) の直線の上にあるか（外積の大きさ）
function cross(r, px, py) {
  return Math.abs((r.x2 - r.x1) * (py - r.y1) - (r.y2 - r.y1) * (px - r.x1));
}
// 線の向き（始点→終点）と真上の法線（0, -1）のなす角（度）
function angleFromNormal(dx, dy) {
  return Math.abs(Math.atan2(dx, -dy)) * 180 / Math.PI;
}

const ALL_KINDS = ['shadow-size', 'reflect-law', 'rays-spread', 'shadow-forms', 'light-to-eye', 'bounce-to-eye',
  'reflect-travel', 'reflect-names', 'mirror-image-distance', 'image-behind-mirror', 'mirror-visible',
  'refract-in', 'refract-out', 'vertical-vs-oblique', 'coin-lift', 'stick-lift', 'total-reflection',
  'lens-parallel-rays', 'focal-length', 'lens-special-rays', 'real-image-forms', 'image-size-by-distance', 'virtual-image'];

test('KINDS は 23 個。frame は各 t で 320×240 の場面を返し、item はすべて描ける種類で、sceneSvg が文字列を返す', () => {
  assert.equal(anim.KINDS.length, 23);
  assert.deepEqual(anim.KINDS, ALL_KINDS);
  anim.KINDS.forEach(kind => TS.forEach(t => {
    const scene = anim.frame(kind, t);
    assert.equal(scene.width, 320);
    assert.equal(scene.height, 240);
    scene.items.forEach(it => assert.ok(figures.ITEM_TYPES.includes(it.type), kind + ' の ' + it.type));
    const svg = figures.sceneSvg(scene);
    assert.equal(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'));
  }));
});

test('すべての kind: t = 0, 0.2, 0.5, 0.8, 0.999 で座標が有限で、場面のまわり（x −20〜340・y −20〜260）に収まる', () => {
  const X_KEYS = ['x', 'x1', 'x2', 'cx'], Y_KEYS = ['y', 'y1', 'y2', 'cy'];
  anim.KINDS.forEach(kind => [0, 0.2, 0.5, 0.8, 0.999].forEach(t => {
    const scene = anim.frame(kind, t);
    assert.ok(Array.isArray(scene.items) && scene.items.length > 0, kind + ' t = ' + t + ' に item がない');
    scene.items.forEach(it => {
      assert.ok(figures.ITEM_TYPES.includes(it.type), kind + ' の ' + it.type);
      X_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 340, kind + ' t = ' + t + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
      Y_KEYS.forEach(k => {
        if (it[k] === undefined) return;
        assert.ok(Number.isFinite(it[k]) && it[k] >= -20 && it[k] <= 260, kind + ' t = ' + t + ' の ' + it.type + '.' + k + ' = ' + it[k]);
      });
    });
    const svg = figures.sceneSvg(scene);
    assert.equal(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'));
  }));
});

test('frame: 知らない kind は例外', () => {
  assert.throws(() => anim.frame('nope', 0));
});

test('shadow-size: t = 0 で物体 x = 100・影の長さ 180、t = 0.5 で x = 200・長さ 67.5', () => {
  const s0 = anim.frame('shadow-size', 0);
  const sh0 = byType(s0, 'shadow')[0];
  assert.equal(byType(s0, 'object')[0].x, 100);
  assert.ok(Math.abs((sh0.y2 - sh0.y1) - 180) < 1e-9);
  const s5 = anim.frame('shadow-size', 0.5);
  const sh5 = byType(s5, 'shadow')[0];
  assert.equal(byType(s5, 'object')[0].x, 200);
  assert.ok(Math.abs((sh5.y2 - sh5.y1) - 67.5) < 1e-9);
});

test('shadow-size: 2 本の光線は物体の先端と根元を通り、影はスクリーンの中、文字は近い／遠いで変わる', () => {
  [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9].forEach(t => {
    const scene = anim.frame('shadow-size', t);
    const ox = byType(scene, 'object')[0].x;
    const [top, bot] = byType(scene, 'ray');
    assert.ok(cross(top, ox, 98) <= 1e-6, 't = ' + t + ' の上の光線が物体の先端を通らない');
    assert.ok(cross(bot, ox, 143) <= 1e-6, 't = ' + t + ' の下の光線が物体の根元を通らない');
    const sh = byType(scene, 'shadow')[0];
    assert.equal(sh.x, 280);
    assert.ok(sh.y1 >= 30 && sh.y1 <= 220 && sh.y2 >= 30 && sh.y2 <= 220, 't = ' + t + ' の影がスクリーンの外');
    const text = byType(scene, 'label')[0].text;
    if (ox < 150) assert.ok(text.includes('近い'), text);
    else assert.ok(text.includes('遠い'), text);
  });
});

test('reflect-law: 入射角＝反射角、t = 0 で 20°・t = 0.5 で 50°、光線は鏡の手前、当たる点は (160, 180)、角度の文字は同じ整数', () => {
  [0, 0.1, 0.25, 0.5].forEach(t => {
    const scene = anim.frame('reflect-law', t);
    const [inc, ref] = byType(scene, 'ray');
    assert.equal(inc.x2, 160); assert.equal(inc.y2, 180);
    assert.equal(ref.x1, 160); assert.equal(ref.y1, 180);
    // 入射光は当たる点から逆向きに、反射光は当たる点から先へ、法線（真上）とのなす角を比べる
    const a = angleFromNormal(inc.x1 - inc.x2, inc.y1 - inc.y2);
    const b = angleFromNormal(ref.x2 - ref.x1, ref.y2 - ref.y1);
    assert.ok(Math.abs(a - b) <= 1e-9, 't = ' + t + ': ' + a + ' と ' + b);
    if (t === 0) assert.ok(Math.abs(a - 20) <= 1e-9);
    if (t === 0.5) assert.ok(Math.abs(a - 50) <= 1e-9);
    // 鏡の裏へ行かない（当たる点以外の端は鏡 y = 180 より上）
    assert.ok(inc.y1 < 180 && ref.y2 < 180, 't = ' + t + ' で光線が鏡の裏へ行く');
    const labels = byType(scene, 'label').map(l => l.text);
    const m1 = labels[0].match(/^入射角 (\d+)°$/), m2 = labels[1].match(/^反射角 (\d+)°$/);
    assert.ok(m1 && m2, labels.join(' / '));
    assert.equal(m1[1], m2[1]);
    assert.equal(Number(m1[1]), Math.round(a));
  });
});

// ---- 共通の道具 ----

test('grow: 2 辺の折れ線で p = 0 → 空、p = 0.25 → 1 本（矢印）、p = 1 → 2 本（最後だけ矢印）。dashed が伝わる', () => {
  const { grow } = anim.helpers;
  const pts = [[0, 0], [100, 0], [100, 100]];   // 全長 200
  assert.deepEqual(grow(pts, 0), []);
  const q = grow(pts, 0.25);
  assert.equal(q.length, 1);
  assert.equal(q[0].type, 'ray');
  assert.equal(q[0].arrow, true);
  assert.equal(q[0].x1, 0); assert.equal(q[0].y1, 0);
  assert.ok(Math.abs(q[0].x2 - 50) < 1e-9 && Math.abs(q[0].y2) < 1e-9);
  const h = grow(pts, 0.75);
  assert.equal(h.length, 2);
  assert.equal(h[0].arrow, false); assert.equal(h[1].arrow, true);
  assert.ok(Math.abs(h[1].y2 - 50) < 1e-9);
  const all = grow(pts, 1);
  assert.equal(all.length, 2);
  assert.equal(all[0].arrow, false); assert.equal(all[1].arrow, true);
  assert.equal(all[1].x2, 100); assert.equal(all[1].y2, 100);
  all.forEach(r => assert.ok(!r.dashed));
  const d = grow(pts, 1, { dashed: true });
  assert.equal(d.length, 2);
  d.forEach(r => assert.equal(r.dashed, true));
  // 長さ 0 の辺は飛ばす
  assert.equal(grow([[0, 0], [0, 0], [10, 0]], 1).length, 1);
});

test('stage・u・deg: 区間で 0→1、u は 0→1→0、度とラジアン', () => {
  const { stage, u, deg, rad2deg, lerp, clamp01 } = anim.helpers;
  assert.equal(stage(0, 0.2, 0.6), 0);
  assert.ok(Math.abs(stage(0.4, 0.2, 0.6) - 0.5) < 1e-12);
  assert.equal(stage(0.9, 0.2, 0.6), 1);
  assert.ok(Math.abs(u(0)) < 1e-12 && Math.abs(u(0.5) - 1) < 1e-12);
  assert.ok(Math.abs(deg(180) - Math.PI) < 1e-12 && Math.abs(rad2deg(Math.PI) - 180) < 1e-12);
  assert.equal(lerp(10, 20, 0.5), 15);
  assert.equal(clamp01(-1), 0); assert.equal(clamp01(2), 1);
});

// ---- 屈折 ----

// 点 (hx, hy) から出る・(hx, hy) で終わる実線の ray
const startsAt = (scene, hx, hy) => byType(scene, 'ray').filter(r => !r.dashed && r.x1 === hx && r.y1 === hy);
const endsAt = (scene, hx, hy) => byType(scene, 'ray').filter(r => !r.dashed && r.x2 === hx && r.y2 === hy);

test('refract-in: 屈折光と法線のなす角は asin(sin θ1 / 1.33) で、入射角より小さい', () => {
  [0, 0.1, 0.25, 0.4, 0.5, 0.75, 0.9].forEach(t => {
    const scene = anim.frame('refract-in', t);
    const [inc] = endsAt(scene, 140, 120);
    const [ref] = startsAt(scene, 140, 120);
    assert.ok(inc && ref, 't = ' + t + ' の光線が見つからない');
    const a1 = angleFromNormal(inc.x1 - inc.x2, inc.y1 - inc.y2);          // 入射光（当たる点から光源へ、上向き）
    const a2 = 180 - angleFromNormal(ref.x2 - ref.x1, ref.y2 - ref.y1);    // 屈折光（下向き）と下向きの法線
    const expected = Math.asin(Math.sin(a1 * Math.PI / 180) / 1.33) * 180 / Math.PI;
    assert.ok(Math.abs(a2 - expected) < 1e-9, 't = ' + t + ': ' + a2 + ' と ' + expected);
    assert.ok(a2 < a1, 't = ' + t + ' で法線に近づかない');
    assert.ok(ref.y2 > 120, '屈折光が水の中へ行かない');
  });
});

test('refract-out: 空気中へ出た光は法線から離れる（入射角より大きい）', () => {
  [0, 0.1, 0.25, 0.5, 0.75].forEach(t => {
    const scene = anim.frame('refract-out', t);
    const [inc] = endsAt(scene, 140, 120);
    const [ref] = startsAt(scene, 140, 120);
    const a1 = 180 - angleFromNormal(inc.x1 - inc.x2, inc.y1 - inc.y2);   // 入射光は下（水の中）から来る
    const a2 = angleFromNormal(ref.x2 - ref.x1, ref.y2 - ref.y1);
    const expected = Math.asin(Math.sin(a1 * Math.PI / 180) * 1.33) * 180 / Math.PI;
    assert.ok(Math.abs(a2 - expected) < 1e-9, 't = ' + t + ': ' + a2 + ' と ' + expected);
    assert.ok(a2 > a1, 't = ' + t + ' で法線から離れない');
    assert.ok(ref.y2 < 120 && inc.y1 > 120);
  });
});

test('total-reflection: 30° では空気中へ出る光がある。60° では境界面より上へ行く光がなく、反射光と法線のなす角が 60°', () => {
  const s0 = anim.frame('total-reflection', 0);
  assert.ok(startsAt(s0, 180, 100).some(r => r.y2 < 100), '30° で屈折光がない');
  assert.ok(byType(s0, 'label').some(l => l.text === '入射角 30°'));
  const s5 = anim.frame('total-reflection', 0.5);
  const out = byType(s5, 'ray').filter(r => r.x1 === 180 && r.y1 === 100);
  assert.ok(out.length >= 1);
  out.forEach(r => assert.ok(r.y2 > 100, '60° で境界面より上へ行く光がある'));
  const refl = out.find(r => !r.dashed);
  const a = 180 - angleFromNormal(refl.x2 - refl.x1, refl.y2 - refl.y1);
  assert.ok(Math.abs(a - 60) < 1e-9, '反射角 ' + a);
  assert.ok(byType(s5, 'label').some(l => l.text.includes('全反射')));
  assert.ok(byType(s5, 'label').some(l => l.text === '入射角 60°'));
});

// ---- 反射 ----

test('mirror-visible: t = 0（像B）は「見えない」、t = 0.5（像A）は「見える」', () => {
  const textOf = (t) => byType(anim.frame('mirror-visible', t), 'label').map(l => l.text).join(' / ');
  assert.ok(textOf(0).includes('見えない'), textOf(0));
  assert.ok(textOf(0.5).includes('見える') && !textOf(0.5).includes('見えない'), textOf(0.5));
});

test('mirror-image-distance: 各 t で、もの と 像 の x が鏡 x = 160 について対称', () => {
  [0, 0.1, 0.25, 0.5, 0.75, 0.9].forEach(t => {
    const [obj, img] = byType(anim.frame('mirror-image-distance', t), 'object');
    assert.equal(obj.label, 'もの'); assert.equal(img.label, '像');
    assert.ok(Math.abs((obj.x + img.x) / 2 - 160) < 1e-9, 't = ' + t);
    assert.ok(obj.x < 160 && img.x > 160);
  });
});

// ---- 凸レンズ ----

test('image-size-by-distance: d_o = 120（t = 0.5）で像の高さ 20、d_o = 80 で像の高さ 40・スクリーン x = 240', () => {
  const s5 = anim.frame('image-size-by-distance', 0.5);
  const img5 = byType(s5, 'object')[1];
  assert.ok(Math.abs(byType(s5, 'object')[0].x - 40) < 1e-9);   // ox = 160 − 120
  assert.ok(Math.abs(-img5.height - 20) < 1e-9, '像の高さ ' + -img5.height);
  const t80 = Math.acos(1 / 3) / (2 * Math.PI);
  const s8 = anim.frame('image-size-by-distance', t80);
  const img8 = byType(s8, 'object')[1];
  assert.ok(Math.abs(-img8.height - 40) < 1e-9, '像の高さ ' + -img8.height);
  assert.ok(Math.abs(byType(s8, 'screen')[0].x - 240) < 1e-9);
  assert.ok(byType(s8, 'label').some(l => l.text.includes('同じ大きさ')));
  assert.ok(byType(s5, 'label').some(l => l.text.includes('像は小さい')));
  assert.ok(byType(anim.frame('image-size-by-distance', 0), 'label').some(l => l.text.includes('像は大きい')));
  // 焦点を通る光と中心を通る光は、像の先 (sx, 120 + hi) で交わる
  [0, 0.2, t80, 0.5, 0.8].forEach(t => {
    const scene = anim.frame('image-size-by-distance', t);
    const img = byType(scene, 'object')[1];
    const rays = byType(scene, 'ray');
    assert.ok(cross(rays[1], img.x, 120 - img.height) <= 1e-6 && cross(rays[2], img.x, 120 - img.height) <= 1e-6, 't = ' + t);
    assert.ok(cross(rays[1], 200, 120) <= 1e-6, 't = ' + t + ' で焦点を通らない');
    assert.ok(cross(rays[2], 160, 120) <= 1e-6, 't = ' + t + ' で中心を通らない');
  });
});

test('real-image-forms: 描き終わり（p = 1）の 2 本の光線の終点は同じ (220,145)', () => {
  const scene = anim.frame('real-image-forms', 0.8);
  const tips = byType(scene, 'ray').filter(r => r.arrow);
  assert.equal(tips.length, 2);
  tips.forEach(r => { assert.equal(r.x2, 220); assert.equal(r.y2, 145); });
  assert.ok(byType(scene, 'label').some(l => l.text === '実像'));
});

test('focal-length: 屈折光の直線は焦点 (160 + f, 110) を通り、f は 60〜40', () => {
  [0, 0.1, 0.25, 0.5, 0.75].forEach(t => {
    const scene = anim.frame('focal-length', t);
    const f = byType(scene, 'lens')[0].f;
    assert.ok(f >= 40 - 1e-9 && f <= 60 + 1e-9);
    const refr = byType(scene, 'ray').find(r => r.x1 === 160 && r.y1 === 70);
    assert.ok(cross(refr, 160 + f, 110) <= 1e-6, 't = ' + t + ' で焦点を通らない');
  });
  assert.ok(Math.abs(byType(anim.frame('focal-length', 0.5), 'lens')[0].f - 40) < 1e-9);
});

// ---- Codex round 1 の指摘 ----

test('grow / frame: 段階の始まりを計算の誤差ぶんだけ過ぎた t でも例外を出さない（光線が 0 本なら空）', () => {
  assert.doesNotThrow(() => anim.frame('virtual-image', 0.45000000000000007));
  const starts = [0.3, 0.35, 0.4, 0.45, 0.6, 0.7];
  anim.KINDS.forEach(kind => starts.forEach(from => {
    assert.doesNotThrow(() => anim.frame(kind, from + 1e-15), kind + ' t=' + from + '+ε');
  }));
  assert.deepEqual(anim.helpers.grow([[0, 0], [100, 0]], 1e-15), []);
});

test('restT: 光線が伸びていく 13 種は 0.99、ほかは 0。止まった位置の絵にはどの kind も光線が 1 本以上ある', () => {
  const atEnd = ['rays-spread', 'shadow-forms', 'light-to-eye', 'bounce-to-eye', 'reflect-travel',
    'image-behind-mirror', 'vertical-vs-oblique', 'coin-lift', 'stick-lift', 'lens-parallel-rays',
    'lens-special-rays', 'real-image-forms', 'virtual-image'];
  anim.KINDS.forEach(kind => {
    assert.equal(anim.restT(kind), atEnd.includes(kind) ? 0.99 : 0, kind);
    const rays = anim.frame(kind, anim.restT(kind)).items.filter(i => i.type === 'ray');
    assert.ok(rays.length >= 1, kind + ' の止まった絵に光線がない');
  });
  // 描き終わりの絵には像や文字もある（virtual-image の虚像、real-image-forms の実像）
  assert.ok(anim.frame('virtual-image', anim.restT('virtual-image')).items.some(i => i.type === 'label' && i.text === '虚像'));
  assert.ok(anim.frame('real-image-forms', anim.restT('real-image-forms')).items.some(i => i.type === 'label' && i.text === '実像'));
});
