// tests/config.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
test('config の暫定値は設計書どおり', () => {
  const c = require('../js/config.js');
  assert.equal(c.xp.stageClear, 50); assert.equal(c.tolerance.reflectDeg, 5); assert.deepEqual(c.levels, [0, 100, 250, 450, 700]);
});
