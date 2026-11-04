// tests/richtext.test.js — **語句** 記法（用語）の分け方
const test = require('node:test'); const assert = require('node:assert/strict');
const rt = require('../js/richtext.js');

test('parse: 用語とふつうの文に分ける', () => {
  assert.deepEqual(rt.parse('光を出すものを**光源**という。'), [
    { text: '光を出すものを', term: false },
    { text: '光源', term: true },
    { text: 'という。', term: false },
  ]);
});

test('parse: ** が奇数なら、最後の ** から後ろはふつうの文', () => {
  assert.deepEqual(rt.parse('a**b'), [{ text: 'a**b', term: false }]);
  assert.deepEqual(rt.parse('**a**b**c'), [{ text: 'a', term: true }, { text: 'b**c', term: false }]);
});

test('parse: 空文字・** なし・文字列でないもの・空の用語', () => {
  assert.deepEqual(rt.parse(''), []);
  assert.deepEqual(rt.parse('光はまっすぐ進む。'), [{ text: '光はまっすぐ進む。', term: false }]);
  assert.deepEqual(rt.parse(null), []);
  assert.deepEqual(rt.parse('a****b'), [{ text: 'ab', term: false }]);
  assert.deepEqual(rt.parse('**光源**'), [{ text: '光源', term: true }]);
});

test('plain: ** を取り除く', () => {
  assert.equal(rt.plain('a**b**c'), 'abc');
  assert.equal(rt.plain('光はまっすぐ進む。'), '光はまっすぐ進む。');
  assert.equal(rt.plain(''), '');
  assert.equal(rt.plain('a**b'), 'a**b');
});

test('terms: 出てきた順に重複なし', () => {
  assert.deepEqual(rt.terms('**光源**から出た光。**光源**は…'), ['光源']);
  assert.deepEqual(rt.terms('**入射角**と**反射角**と**入射角**'), ['入射角', '反射角']);
  assert.deepEqual(rt.terms('用語なし'), []);
  assert.deepEqual(rt.terms(''), []);
  assert.deepEqual(rt.terms('a**b'), []);
});
