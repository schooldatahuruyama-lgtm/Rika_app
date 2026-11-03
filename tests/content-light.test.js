// tests/content-light.test.js
// 「光の世界」教材データの検査（形・数・判定サンプル・教科書名を含まないこと）
const test = require('node:test'); const assert = require('node:assert/strict');
const cr = require('../js/content-registry.js');
const { judge } = require('../js/judge.js');
const config = require('../js/config.js');
const light = require('../content/light.js');

// Task 8 では 4 ステージ。Task 10 で 8 に変える
const STAGE_COUNT = 4;
const FIGURE_TYPES = ['figure-choice', 'ray-draw', 'drag'];

const stages = light.unit.areas.flatMap(a => a.stages);
const conceptIds = new Set(light.unit.concepts.map(c => c.id));

// ステージの warmup・problems・retryPool と、概念の checkPool をすべて並べる
function stageProblems() {
  return stages.flatMap(s => [s.warmup, ...s.problems, ...s.retryPool]);
}
function checkProblems() {
  return light.unit.concepts.flatMap(c => c.checkPool);
}
function allProblems() { return stageProblems().concat(checkProblems()); }

test('validateUnit(light) は空', () => assert.deepEqual(cr.validateUnit(light.unit), []));

test('ステージ数は STAGE_COUNT、概念はそのステージが使うものがすべて定義済み、各ステージに図か操作型が 1 問以上、各概念 retryPool 2 以上 checkPool 3 以上', () => {
  assert.equal(stages.length, STAGE_COUNT);
  stages.forEach(s => {
    s.concepts.forEach(cid => assert.ok(conceptIds.has(cid), s.id + ' の概念 ' + cid + ' が未定義'));
    assert.ok(s.problems.some(p => FIGURE_TYPES.includes(p.type)), s.id + ' に図・操作型がない');
  });
  light.unit.concepts.forEach(c => {
    const retry = stages.flatMap(s => s.retryPool).filter(p => p.concept === c.id).length;
    assert.ok(retry >= 2, c.id + ' の retryPool が ' + retry + ' 問');
    assert.ok(c.checkPool.length >= 3, c.id + ' の checkPool が ' + c.checkPool.length + ' 問');
  });
});

test('ray-draw と drag の問題は samples.correct で correct、samples.wrong で不正解になる', () => {
  const targets = allProblems().filter(p => p.type === 'ray-draw' || p.type === 'drag');
  assert.ok(targets.length > 0, 'ray-draw / drag の問題がない');
  targets.forEach(p => {
    const ok = judge(p, p.samples.correct, config);
    const ng = judge(p, p.samples.wrong, config);
    assert.equal(ok.correct, true, p.id + ' の samples.correct が正解にならない');
    assert.equal(ng.correct, false, p.id + ' の samples.wrong が不正解にならない');
    assert.ok(!ng.invalid, p.id + ' の samples.wrong が判定できない解答になっている');
  });
});

test('ray-draw は光が左から右へ進み、drag の対象は図の中にある', () => {
  allProblems().forEach(p => {
    if (p.type === 'ray-draw') assert.ok(p.source.x < p.hit.x, p.id + ' の光が左から右へ進んでいない');
    if (p.type === 'drag') {
      const item = p.figure && p.figure.items.find(it => it.id === p.draggable.itemId);
      assert.ok(item, p.id + ' の図に ' + p.draggable.itemId + ' がない');
    }
    if (p.type === 'figure-choice') {
      const region = p.figure.items.find(it => it.type === 'region' && it.id === p.answer);
      assert.ok(region, p.id + ' の答えの region がない');
    }
  });
});

test('教科書名・出版社名を含まない', () => {
  assert.doesNotMatch(JSON.stringify(light.unit), /東京書籍|啓林館|大日本図書|教育出版|学校図書/);
});

test('すべての問題に prompt・explanation・hint があり、レッスンカードは 60〜120 字で図がある', () => {
  allProblems().forEach(p => {
    ['prompt', 'explanation', 'hint'].forEach(f => assert.ok(typeof p[f] === 'string' && p[f].trim() !== '', p.id + ' の ' + f + ' が空'));
  });
  stages.forEach(s => {
    assert.equal(s.lessons.length, 3, s.id + ' のレッスンが 3 枚でない');
    s.lessons.forEach(c => {
      assert.ok(c.text.length >= 60 && c.text.length <= 120, c.id + ' の文が ' + c.text.length + ' 字');
      assert.ok(c.figure && Array.isArray(c.figure.items), c.id + ' に図がない');
    });
  });
});
