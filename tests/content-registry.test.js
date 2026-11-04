// tests/content-registry.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const cr = require('../js/content-registry.js');
const { unit } = require('./fixtures/unit.js');

const reg = cr.createRegistry(); reg.register(unit);
// 教材を壊して試すための deep copy
function copy() { return JSON.parse(JSON.stringify(unit)); }
function messages(u) { return cr.validateUnit(u).join('\n'); }

test('register と検索', () => { const reg = cr.createRegistry(); reg.register(unit); assert.equal(reg.stage('s-a1').title, unit.areas[0].stages[0].title); assert.equal(reg.concept('c-b').basic, 'c-a'); assert.equal(reg.problem('p-a1-1').type, 'choice'); });
test('stagesInOrder は領域の order 順', () => assert.deepEqual(reg.stagesInOrder('u').map(s => s.id), ['s-a1', 's-a2', 's-b1']));
test('nextStage は領域内の次、末尾は null', () => { assert.equal(reg.nextStage('s-a1').id, 's-a2'); assert.equal(reg.nextStage('s-a2'), null); });
test('validateUnit: 正常な教材は空', () => assert.deepEqual(cr.validateUnit(unit), []));
test('validateUnit: 未定義の概念、類題 2 問未満、確認問題 3 問未満、図・操作型のないステージ、重複 id を検出', () => {
  // 未定義の概念
  let u = copy();
  u.areas[0].stages[0].problems[0].concept = 'c-zz';
  assert.match(messages(u), /問題 p-a1-1 の概念 c-zz が定義されていません/);

  // 類題（retryPool）が 2 問未満
  u = copy();
  u.areas[0].stages[0].retryPool.pop();
  assert.match(messages(u), /概念 c-a の類題（retryPool）が 1 問です/);

  // 確認問題（checkPool）が 3 問未満
  u = copy();
  u.concepts[1].checkPool.pop();
  assert.match(messages(u), /概念 c-b の確認問題（checkPool）が 2 問です/);

  // 図・操作型の問題がないステージ（figure-choice を choice に差し替える）
  u = copy();
  const s = u.areas[0].stages[1];
  s.problems[1] = Object.assign(JSON.parse(JSON.stringify(s.problems[0])), { id: 'p-a2-2' });
  assert.match(messages(u), /ステージ s-a2 に図・操作型の問題/);
  assert.doesNotMatch(messages(u), /s-a1 に図・操作型/);

  // 重複 id（ステージをまたいだ問題の id）
  u = copy();
  u.areas[1].stages[0].problems[1].id = 'p-a1-1';
  assert.match(messages(u), /id p-a1-1 が重複しています/);
});
test('validateUnit: 数・形式・必須項目の検査と、形の崩れた教材', () => {
  let u = copy();
  const s = u.areas[0].stages[0];
  s.problems.pop();                                  // 問題 3 問
  s.lessons.pop();                                   // レッスン 1 枚
  s.warmup = s.problems[1];                          // warmup が fill（id も重複する）
  u.concepts[2].basic = 'c-zz';
  u.concepts[2].lessonStageId = 's-zz';
  u.areas[0].stages[1].concepts.push('c-yy');
  const m = messages(u);
  assert.match(m, /ステージ s-a1 の問題が 3 問です（4〜6 問）/);
  assert.match(m, /ステージ s-a1 のレッスンが 1 枚です（2〜4 枚）/);
  assert.match(m, /ステージ s-a1 の warmup が choice ではありません/);
  assert.match(m, /概念 c-c の basic c-zz が定義されていません/);
  assert.match(m, /概念 c-c の lessonStageId s-zz のステージがありません/);
  assert.match(m, /ステージ s-a2 の概念 c-yy が定義されていません/);

  // 形式と、形式ごとの必須項目
  u = copy();
  const ps = u.areas[1].stages[0].problems;
  ps[1].type = 'essay';
  ps[2] = { id: 'p-b1-3', type: 'ray-draw', concept: 'c-c', prompt: '光を引こう', source: { x: 0, y: 0 }, hit: { x: 10, y: 10 },
    surface: { kind: 'boundary', y: 10, from: 'air', to: 'water' }, expected: { kind: 'direction' }, samples: { correct: { out: { x: 20, y: 30 } } } };
  ps[3] = { id: 'p-b1-4', type: 'drag', concept: 'c-c', prompt: '動かそう', target: { x: 5, y: 5 }, samples: { correct: { x: 5, y: 5 }, wrong: { x: 90, y: 90 } } };
  delete u.areas[0].stages[0].problems[0].options;
  delete u.areas[0].stages[0].problems[2].answer;
  const m2 = messages(u);
  assert.match(m2, /問題 p-b1-2 の type essay は使えません/);
  assert.match(m2, /問題 p-b1-3（ray-draw）に samples\.wrong がありません/);
  assert.doesNotMatch(m2, /問題 p-b1-3（ray-draw）に samples\.correct/);
  assert.match(m2, /問題 p-b1-4（drag）に draggable がありません/);
  assert.match(m2, /問題 p-a1-1（choice）に options がありません/);
  assert.match(m2, /問題 p-a1-3（figure-choice）に answer がありません/);

  // 配列がない・null などでも例外を出さずにメッセージを返す
  assert.doesNotThrow(() => cr.validateUnit(null));
  assert.ok(cr.validateUnit(null).length > 0);
  assert.match(messages({ id: 'x' }), /concepts/);
  u = copy();
  delete u.areas[0].stages[0].problems;
  u.concepts[0].checkPool = null;
  u.areas[1].stages[0].problems[0] = null;
  assert.doesNotThrow(() => cr.validateUnit(u));
  assert.match(messages(u), /ステージ s-a1 の problems が配列ではありません/);
});
test('validateUnit: fill の text と各空らんの id・kind・answer を検査', () => {
  // fixture の p-a1-2 は fill（空らん b1 は kind 'word'）
  const fillOf = u => u.areas[0].stages[0].problems[1];
  let u = copy();
  delete fillOf(u).text;
  assert.match(messages(u), /問題 p-a1-2（fill）に text がありません/);

  u = copy();
  delete fillOf(u).blanks[0].answer;
  assert.match(messages(u), /問題 p-a1-2（fill）の blanks\[0\] に answer がありません/);

  u = copy();
  delete fillOf(u).blanks[0].kind;
  assert.match(messages(u), /問題 p-a1-2（fill）の blanks\[0\] に kind がありません/);

  // id・word の options・number の answer（数値）・使えない kind
  u = copy();
  const blanks = fillOf(u).blanks;
  delete blanks[0].id;
  delete blanks[0].options;
  blanks.push({ id: 'b2', kind: 'number', answer: '30', unit: '度' }, { id: 'b3', kind: 'number', answer: 30 }, { id: 'b4', kind: 'date', answer: 'x' });
  const m = messages(u);
  assert.match(m, /問題 p-a1-2（fill）の blanks\[0\] に id がありません/);
  assert.match(m, /問題 p-a1-2（fill）の blanks\[0\] に options がありません/);
  assert.match(m, /問題 p-a1-2（fill）の blanks\[1\] に answer（数値） がありません/);
  assert.doesNotMatch(m, /blanks\[2\]/);   // tolerance は任意
  assert.match(m, /問題 p-a1-2（fill）の blanks\[3\] の kind date は使えません/);
});
test('validateUnit: ステージの問題は 6 問まで（用語問題 1 問を足せる）、7 問はエラー', () => {
  // s-a1 は 4 問。choice をコピーして id を変えて足す
  function addProblems(u, n) {
    const ps = u.areas[0].stages[0].problems;
    for (let i = 0; i < n; i++) ps.push(Object.assign(JSON.parse(JSON.stringify(ps[0])), { id: 'p-a1-x' + i }));
  }
  let u = copy();
  addProblems(u, 2);                                 // 6 問
  assert.deepEqual(cr.validateUnit(u), []);
  u = copy();
  addProblems(u, 3);                                 // 7 問
  assert.match(messages(u), /ステージ s-a1 の問題が 7 問です（4〜6 問）/);
});
test('validateUnit: レッスン文の ** が閉じていない・空の用語（****）を検出', () => {
  let u = copy();
  u.areas[0].stages[0].lessons[1].text = '光を出すものを**光源といいます。';
  assert.match(messages(u), /ステージ s-a1 の lessons\[1\] の \*\* が閉じていません/);
  u = copy();
  u.areas[0].stages[0].lessons[0].text = '光は****まっすぐ進みます。';
  const m = messages(u);
  assert.match(m, /ステージ s-a1 の lessons\[0\] に空の用語（\*\*\*\*）があります/);
  assert.doesNotMatch(m, /閉じていません/);
  // 正しく閉じた用語はエラーにならない
  u = copy();
  u.areas[0].stages[0].lessons[0].text = '**光**は**まっすぐ**進みます。';
  assert.deepEqual(cr.validateUnit(u), []);
});
