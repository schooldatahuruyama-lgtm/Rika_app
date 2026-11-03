// tests/mastery.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const mastery = require('../js/mastery.js');
const config = require('../js/config.js');
test('mastery.update: 0 → firstTry 0.25 → later 0.4 → wrong 0.2、上限 1 下限 0', () => {
  let v = mastery.update(0, 'firstTry', config); assert.equal(v, 0.25);
  v = mastery.update(v, 'later', config); assert.equal(v, 0.4);
  v = mastery.update(v, 'wrong', config); assert.equal(v, 0.2);
  assert.equal(mastery.update(0.9, 'firstTry', config), 1);
  assert.equal(mastery.update(0.1, 'wrong', config), 0);
  assert.equal(mastery.update(undefined, 'firstTry', config), 0.25);
  assert.equal(mastery.update(0.5, 'unknown', config), 0.5);
});
test('mastery.label: 0.39 まだ, 0.4 もう少し, 0.8 できた', () => {
  assert.equal(mastery.label(0.39, config), 'まだ');
  assert.equal(mastery.label(0.4, config), 'もう少し');
  assert.equal(mastery.label(0.8, config), 'できた');
  assert.equal(mastery.label(0, config), 'まだ');
  assert.equal(mastery.label(1, config), 'できた');
});
