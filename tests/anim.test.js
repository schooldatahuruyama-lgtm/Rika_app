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

test('KINDS は 2 つ。frame は各 t で 320×240 の場面を返し、item はすべて描ける種類で、sceneSvg が文字列を返す', () => {
  assert.equal(anim.KINDS.length, 2);
  assert.deepEqual(anim.KINDS, ['shadow-size', 'reflect-law']);
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
