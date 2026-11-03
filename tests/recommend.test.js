// tests/recommend.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const recommend = require('../js/recommend.js');
const record = require('../js/record.js');
const config = require('../js/config.js');
const { createRegistry } = require('../js/content-registry.js');
const { unit } = require('./fixtures/unit.js');

// 端末ローカルの日時（テストを時差に左右されないようにする）
const now = new Date(2026, 10, 4, 10, 0);
const twoDaysAgo = new Date(2026, 10, 2, 10, 0).toISOString();
const todayMorning = new Date(2026, 10, 4, 8, 0).toISOString();

function makeReg() { const reg = createRegistry(); reg.register(unit); return reg; }

// 記録の一部を書きかえた record を作る
function rec(over) {
  return Object.assign(record.createRecord(), over);
}
function stageOf(status, resume) { return { status, stars: status === 'cleared' ? 2 : 0, attempts: 1, resume: resume || null }; }
const fakeSession = { id: 'sess-1', kind: 'stage', stageId: 's-a1' };

test('todayQuest 1: 「まだ」で最後に取り組んでから 2 日たった概念は、途中のステージより先に復習', () => {
  const r = rec({
    mastery: { 'c-a': { value: 0.9, lastAt: twoDaysAgo }, 'c-b': { value: 0.2, lastAt: twoDaysAgo } },
    stages: { 's-a1': stageOf('cleared'), 's-a2': stageOf('inprogress', fakeSession) },
  });
  assert.deepEqual(recommend.todayQuest(makeReg(), r, 'u', now, config),
    { kind: 'review', conceptId: 'c-b', title: '復習: 光の反射' });
});

test('todayQuest 1: 「まだ」でも最後に取り組んだのが今日なら復習にしない', () => {
  const r = rec({ mastery: { 'c-a': { value: 0.2, lastAt: todayMorning } } });
  assert.deepEqual(recommend.todayQuest(makeReg(), r, 'u', now, config),
    { kind: 'stage', stageId: 's-a1', resume: false, title: '光はまっすぐ進む' });
  // 途中のステージがあればそちら（優先 2 へ落ちる）
  const r2 = rec({ mastery: { 'c-a': { value: 0.2, lastAt: todayMorning } }, stages: { 's-a1': stageOf('inprogress', fakeSession) } });
  assert.deepEqual(recommend.todayQuest(makeReg(), r2, 'u', now, config),
    { kind: 'stage', stageId: 's-a1', resume: true, title: '光はまっすぐ進む' });
});

test('todayQuest 1: 一度も取り組んでいない概念（lastAt なし）は復習にしない', () => {
  const r = rec({ mastery: { 'c-a': { value: 0 } } });
  assert.equal(recommend.todayQuest(makeReg(), r, 'u', now, config).kind, 'stage');
});

test('todayQuest 2: 途中のステージ（再開データあり）は resume: true', () => {
  const r = rec({ stages: { 's-a1': stageOf('cleared'), 's-b1': stageOf('inprogress', fakeSession) } });
  assert.deepEqual(recommend.todayQuest(makeReg(), r, 'u', now, config),
    { kind: 'stage', stageId: 's-b1', resume: true, title: '水の中で曲がる光' });
});

test('todayQuest 2: 途中でも再開データがなければ resume: false、未着手より先', () => {
  const r = rec({ stages: { 's-b1': stageOf('inprogress') } });
  assert.deepEqual(recommend.todayQuest(makeReg(), r, 'u', now, config),
    { kind: 'stage', stageId: 's-b1', resume: false, title: '水の中で曲がる光' });
});

test('todayQuest 3: 新しい記録なら最初のステージ s-a1（resume: false）', () => {
  assert.deepEqual(recommend.todayQuest(makeReg(), record.createRecord(), 'u', now, config),
    { kind: 'stage', stageId: 's-a1', resume: false, title: '光はまっすぐ進む' });
  // クリア済みを飛ばして、未着手の最初へ
  const r = rec({ stages: { 's-a1': stageOf('cleared') } });
  assert.deepEqual(recommend.todayQuest(makeReg(), r, 'u', now, config),
    { kind: 'stage', stageId: 's-a2', resume: false, title: '鏡ではね返る光' });
});

test('todayQuest 4: 全部クリア済みなら理解度が一番低い概念の復習（同じ値なら unit.concepts の先）', () => {
  const stages = { 's-a1': stageOf('cleared'), 's-a2': stageOf('cleared'), 's-b1': stageOf('cleared') };
  const r = rec({
    stages,
    mastery: { 'c-a': { value: 0.9, lastAt: twoDaysAgo }, 'c-b': { value: 0.5, lastAt: twoDaysAgo }, 'c-c': { value: 0.5, lastAt: twoDaysAgo } },
  });
  assert.deepEqual(recommend.todayQuest(makeReg(), r, 'u', now, config),
    { kind: 'review', conceptId: 'c-b', title: '復習: 光の反射' });
  // 記録のない概念は 0 とみなす
  const r2 = rec({ stages, mastery: { 'c-a': { value: 0.9, lastAt: todayMorning }, 'c-b': { value: 0.5, lastAt: todayMorning } } });
  assert.deepEqual(recommend.todayQuest(makeReg(), r2, 'u', now, config),
    { kind: 'review', conceptId: 'c-c', title: '復習: 光の屈折' });
});

test('todayQuest: 登録されていない単元なら null', () => {
  assert.equal(recommend.todayQuest(makeReg(), record.createRecord(), 'nope', now, config), null);
});

test('isUnlocked: 領域の最初は常に解放、2 番目は前のステージがクリアで解放', () => {
  const reg = makeReg();
  const fresh = record.createRecord();
  assert.equal(recommend.isUnlocked(reg, fresh, 's-a1'), true);
  assert.equal(recommend.isUnlocked(reg, fresh, 's-a2'), false);
  assert.equal(recommend.isUnlocked(reg, fresh, 's-b1'), true);   // 領域 b の最初
  assert.equal(recommend.isUnlocked(reg, rec({ stages: { 's-a1': stageOf('inprogress', fakeSession) } }), 's-a2'), false);
  assert.equal(recommend.isUnlocked(reg, rec({ stages: { 's-a1': stageOf('cleared') } }), 's-a2'), true);
});

test('isUnlocked: 登録されていないステージは false', () => {
  assert.equal(recommend.isUnlocked(makeReg(), record.createRecord(), 'nope'), false);
});
