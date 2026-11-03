// tests/judge.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const judge = require('../js/judge.js');
const config = require('../js/config.js');

// 反射の問題（反射のテストと「長さ 0 の線」のテストで使う）
const mirrorProblem = { type: 'ray-draw', source: { x: 0, y: 0 }, hit: { x: 100, y: 100 }, surface: { kind: 'mirror', x1: 0, y1: 100, x2: 200, y2: 100 }, expected: { kind: 'angle' } };

test('choice', () => assert.equal(judge.judge({ type: 'choice', options: [{ id: 'a' }, { id: 'b' }], answer: 'b' }, 'b', config).correct, true));
test('fill: 語は完全一致、数値は許容誤差', () => {
  const p = { type: 'fill', blanks: [{ id: 'b1', kind: 'word', options: ['まっすぐ', '曲がって'], answer: 'まっすぐ' }, { id: 'b2', kind: 'number', answer: 30, tolerance: 2 }] };
  assert.equal(judge.judge(p, { b1: 'まっすぐ', b2: 31.5 }, config).correct, true);
  assert.equal(judge.judge(p, { b1: 'まっすぐ', b2: 33 }, config).correct, false);
  assert.equal(judge.judge(p, { b1: 'まっすぐ' }, config).invalid, true);  // 未記入
});
test('figure-choice', () => assert.equal(judge.judge({ type: 'figure-choice', answer: 'r2' }, 'r2', config).correct, true));
test('ray-draw 反射: 入射 45° に対し反射 47° は正解、ちょうど 50° も正解、52° は不正解、光源へ戻る向きと鏡を突き抜ける向きは不正解', () => {
  const p = { type: 'ray-draw', source: { x: 0, y: 0 }, hit: { x: 100, y: 100 }, surface: { kind: 'mirror', x1: 0, y1: 100, x2: 200, y2: 100 }, expected: { kind: 'angle' } };
  const out = (deg) => ({ out: { x: 100 + 100 * Math.sin(deg * Math.PI / 180), y: 100 - 100 * Math.cos(deg * Math.PI / 180) } });
  assert.equal(judge.judge(p, out(47), config).correct, true);
  assert.equal(judge.judge(p, out(50), config).correct, true);
  assert.equal(judge.judge(p, out(52), config).correct, false);
  assert.equal(judge.judge(p, { out: { x: 0, y: 0 } }, config).correct, false);      // 来た道を戻る（法線との角は 45° だが向きが逆）
  assert.equal(judge.judge(p, { out: { x: 200, y: 200 } }, config).correct, false);  // 鏡の裏へ
});
test('ray-draw 屈折 空気→水: 法線に近づく側は正解、入射の延長より遠い側・同じ側・境界の手前は不正解', () => {
  const p = { type: 'ray-draw', source: { x: 0, y: 0 }, hit: { x: 100, y: 100 }, surface: { kind: 'boundary', y: 100, from: 'air', to: 'water' }, expected: { kind: 'direction' } };
  assert.equal(judge.judge(p, { out: { x: 150, y: 200 } }, config).correct, true);   // 延長 (200,200) より法線寄り
  assert.equal(judge.judge(p, { out: { x: 250, y: 200 } }, config).correct, false);  // 法線から遠い
  assert.equal(judge.judge(p, { out: { x: 50, y: 200 } }, config).correct, false);   // 法線の同じ側（入射側）
  assert.equal(judge.judge(p, { out: { x: 150, y: 50 } }, config).correct, false);   // 境界の手前（反射側）
});
test('ray-draw 屈折 水→空気: 法線から離れる側が正解', () => {
  const p = { type: 'ray-draw', source: { x: 0, y: 0 }, hit: { x: 100, y: 100 }, surface: { kind: 'boundary', y: 100, from: 'water', to: 'air' }, expected: { kind: 'direction' } };
  assert.equal(judge.judge(p, { out: { x: 250, y: 200 } }, config).correct, true);   // 法線から離れる
  assert.equal(judge.judge(p, { out: { x: 150, y: 200 } }, config).correct, false);  // 法線に近づく
});
test('ray-draw 屈折 下から上（source が境界の下）でも同じ規則で判定', () => {
  const p = { type: 'ray-draw', source: { x: 0, y: 200 }, hit: { x: 100, y: 100 }, surface: { kind: 'boundary', y: 100, from: 'water', to: 'air' }, expected: { kind: 'direction' } };
  assert.equal(judge.judge(p, { out: { x: 250, y: 0 } }, config).correct, true);     // 法線から離れる
  assert.equal(judge.judge(p, { out: { x: 150, y: 0 } }, config).correct, false);    // 法線に近づく
  assert.equal(judge.judge(p, { out: { x: 150, y: 150 } }, config).correct, false);  // 境界の手前
});
test('ray-draw 凸レンズ: parallel は向こう側の焦点を通る、center は直進、focus は軸に平行。逆向き（レンズの左へ）は不正解', () => {
  const lens = { kind: 'lens', cx: 200, cy: 150, f: 60 };
  const par = { type: 'ray-draw', source: { x: 50, y: 110 }, hit: { x: 200, y: 110 }, surface: lens, expected: { kind: 'lens', ray: 'parallel' } };
  assert.equal(judge.judge(par, { out: { x: 260, y: 150 } }, config).correct, true);      // 焦点 (260,150) を通る
  assert.equal(judge.judge(par, { out: { x: 260, y: 170 } }, config).correct, false);     // 焦点から約 14.1px ずれ
  const par2 = { ...par, source: { x: 50, y: 130 }, hit: { x: 200, y: 130 }, surface: { kind: 'lens', cx: 200, cy: 150, f: 30 } };
  assert.equal(judge.judge(par2, { out: { x: 230, y: 170 } }, config).correct, true);     // 焦点 (230,150) と直線 (200,130)-(230,170) の距離 = 600/50 = 12.0 ちょうど → 正解
  assert.equal(judge.judge(par2, { out: { x: 230, y: 172 } }, config).correct, false);    // 12px を超える
  assert.equal(judge.judge(par, { out: { x: 140, y: 70 } }, config).correct, false);      // 直線は焦点を通るが左向き
  const ctr = { ...par, source: { x: 50, y: 100 }, hit: { x: 200, y: 150 }, expected: { kind: 'lens', ray: 'center' } };
  assert.equal(judge.judge(ctr, { out: { x: 350, y: 200 } }, config).correct, true);
  const foc = { ...par, source: { x: 140, y: 150 }, hit: { x: 200, y: 110 }, expected: { kind: 'lens', ray: 'focus' } };
  assert.equal(judge.judge(foc, { out: { x: 350, y: 112 } }, config).correct, true);
  assert.equal(judge.judge(foc, { out: { x: 300, y: 110 + 100 * Math.tan(5 * Math.PI / 180) } }, config).correct, true);   // 軸との角 5° ちょうど（y ≒ 118.7489、丸めない）。判定は浮動小数点の誤差分だけ余裕を持つ（`<= tol + 1e-9`）
  assert.equal(judge.judge(foc, { out: { x: 300, y: 122 } }, config).correct, false);    // 約 6.8°
});
test('ray-draw rejects zero-length drag', () => { const p = mirrorProblem; assert.equal(judge.judge(p, { out: { x: 100, y: 100 } }, config).invalid, true); });
test('drag: 許容 16px（16 ちょうどは正解、17 は不正解）', () => { const p = { type: 'drag', draggable: { itemId: 'obj', axis: 'x' }, target: { x: 120, y: 150 } }; assert.equal(judge.judge(p, { x: 136, y: 150 }, config).correct, true); assert.equal(judge.judge(p, { x: 137, y: 150 }, config).correct, false); });
