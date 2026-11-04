// tests/curriculum.test.js — 中学 1〜3 年の単元一覧の表（content/curriculum.js）
const test = require('node:test'); const assert = require('node:assert/strict');
const curriculum = require('../content/curriculum.js');
const mascot = require('../js/mascot.js');
const light = require('../content/light.js');

const FIELDS = ['物理', '化学', '生物', '地学'];

test('units() の各項目に id・title・grade・field・mascot がある', () => {
  const list = curriculum.units();
  assert.ok(list.length > 0);
  const ids = new Set();
  list.forEach((u) => {
    assert.equal(typeof u.id, 'string', JSON.stringify(u));
    assert.ok(u.id.length > 0);
    assert.ok(!ids.has(u.id), 'id が重複: ' + u.id);
    ids.add(u.id);
    assert.equal(typeof u.title, 'string');
    assert.ok(u.title.length > 0, u.id + ' の title');
    assert.ok([1, 2, 3].includes(u.grade), u.id + ' の grade');
    assert.ok(FIELDS.includes(u.field), u.id + ' の field');
    assert.ok(Object.prototype.hasOwnProperty.call(mascot.MASCOTS, u.mascot), u.id + ' の mascot');
  });
  // 並びは学年の順
  const grades = list.map((u) => u.grade);
  assert.deepEqual(grades, grades.slice().sort((a, b) => a - b));
});

test('GRADE_LABELS は 1〜3 年と その他', () => {
  assert.deepEqual(curriculum.GRADE_LABELS, { 1: '1年', 2: '2年', 3: '3年', 0: 'その他' });
});

test('unit("light") は教材の光の世界と同じ先生、知らない id は null', () => {
  const u = curriculum.unit('light');
  assert.ok(u);
  assert.equal(u.mascot, light.unit.mascot);
  assert.equal(u.grade, 1);
  assert.equal(curriculum.unit('nope'), null);
  assert.equal(curriculum.unit(undefined), null);
});

test('units() は呼ぶたびに新しい配列（元の表を変えられない）', () => {
  const a = curriculum.units();
  const b = curriculum.units();
  assert.notEqual(a, b);
  const len = a.length;
  a.pop();
  a.push({ id: 'fake' });
  assert.equal(curriculum.units().length, len);
  assert.equal(curriculum.unit('fake'), null);
  assert.equal(curriculum.units()[len - 1].id, b[len - 1].id);
  // 項目そのものも書きかえられない
  assert.throws(() => { 'use strict'; b[0].title = 'かきかえ'; });
  assert.notEqual(curriculum.units()[0].title, 'かきかえ');
});
