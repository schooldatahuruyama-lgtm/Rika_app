// tests/geometry.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const g = require('../js/geometry.js');
test('angleToNormalDeg: 45° の入射', () => {
  assert.equal(Math.round(g.angleToNormalDeg({ x: 1, y: 1 }, { x: 0, y: -1 })), 45);
});
test('reflect: 法線 (0,-1) に対し (1,1) は (1,-1)', () => {
  const r = g.reflect({ x: 1, y: 1 }, { x: 0, y: -1 });
  assert.deepEqual({ x: Math.round(r.x), y: Math.round(r.y) }, { x: 1, y: -1 });
});
test('distancePointToLine: 点 (0,5) と x 軸は 5', () => assert.equal(g.distancePointToLine({ x: 0, y: 5 }, { x: -1, y: 0 }, { x: 1, y: 0 }), 5));
test('isParallelDeg: 4° 違いは ±5° で平行', () => assert.equal(g.isParallelDeg({ x: 100, y: 0 }, { x: 100, y: 7 }, 5), true));
test('sideOfLine: 線の左右で符号が変わり、線上は 0', () => {
  const a = { x: 0, y: 0 }, b = { x: 0, y: 10 };
  assert.equal(g.sideOfLine({ x: 1, y: 5 }, a, b) * g.sideOfLine({ x: -1, y: 5 }, a, b), -1);
  assert.equal(g.sideOfLine({ x: 0, y: 5 }, a, b), 0);
});
test('normalOf: 水平な鏡の法線は上向き', () => assert.deepEqual(g.normalOf({ kind: 'mirror', x1: 0, y1: 100, x2: 200, y2: 100 }), { x: 0, y: -1 }));
