// tests/record.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const record = require('../js/record.js');
const config = require('../js/config.js');

// 端末ローカルの日時（テストを時差に左右されないようにする）
const day1 = new Date(2026, 10, 3, 10, 0);
const day1later = new Date(2026, 10, 3, 15, 0);
const day2 = new Date(2026, 10, 4, 9, 0);
const hist = (over) => Object.assign({ kind: 'history', sessionId: 's1', attempt: 1, stageId: 'st1', problemId: 'q1', conceptId: 'c1', correct: true, phase: 'main' }, over);

test('createStore / createRecord の初期値', () => {
  assert.deepEqual(record.createStore(), { version: 1, currentProfileId: null, profiles: [], records: {} });
  assert.deepEqual(record.createRecord(), { xp: 0, level: 1, streak: { count: 0, lastDate: null }, mastery: {}, stages: {}, lessonsRead: {}, reviewDone: {}, history: [], xpLog: [] });
});

test('createProfile / deleteProfile: records と currentProfileId を保つ', () => {
  const store = record.createStore();
  const a = record.createProfile(store, { nickname: 'ひかり', avatar: 'cat' }, day1);
  assert.match(a.id, /^p-\d+-[a-z0-9]+$/);
  assert.equal(a.nickname, 'ひかり'); assert.equal(a.avatar, 'cat'); assert.equal(a.createdAt, day1.toISOString());
  assert.deepEqual(store.records[a.id], record.createRecord());
  assert.equal(store.currentProfileId, a.id);
  const b = record.createProfile(store, { nickname: 'そら', avatar: 'dog' }, day2);
  assert.notEqual(a.id, b.id);
  assert.equal(store.currentProfileId, b.id);
  assert.equal(record.deleteProfile(store, b.id), store);
  assert.equal(store.profiles.length, 1); assert.equal(store.records[b.id], undefined);
  assert.equal(store.currentProfileId, a.id);
  record.deleteProfile(store, a.id);
  assert.equal(store.currentProfileId, null); assert.deepEqual(store.records, {});
});

test('applyEvents: answer+correct+firstTry は 25xp、multiplier 0.5 なら 13xp（四捨五入）', () => {
  const evs = [{ kind: 'answer' }, { kind: 'correct' }, { kind: 'firstTry' }];
  const r0 = record.createRecord();
  const r1 = record.applyEvents(r0, evs, { now: day1, stageId: 'st1' }, config);
  assert.equal(r1.xp, 25);
  assert.deepEqual(r1.xpLog.map((e) => [e.kind, e.amount, e.stageId]), [['answer', 10, 'st1'], ['correct', 10, 'st1'], ['firstTry', 5, 'st1']]);
  assert.equal(r1.xpLog[0].at, day1.toISOString());
  // 5 + 5 + 2.5→3 = 13
  const r2 = record.applyEvents(r0, evs, { now: day1, multiplier: 0.5, stageId: 'st1' }, config);
  assert.equal(r2.xp, 13);
  // 元の record は変えない
  assert.equal(r0.xp, 0); assert.deepEqual(r0.xpLog, []);
});

test('applyEvents: その日の最初の history（warmup 以外）で streak と daily が入る、2 回目は入らない、warmup だけでは入らない', () => {
  const r0 = record.createRecord();
  const w = record.applyEvents(r0, [hist({ phase: 'warmup' })], { now: day1, stageId: 'st1' }, config);
  assert.deepEqual(w.streak, { count: 0, lastDate: null }); assert.equal(w.xp, 0); assert.equal(w.history.length, 1);
  const r1 = record.applyEvents(w, [hist()], { now: day1, multiplier: 0.5, stageId: 'st1' }, config);
  assert.deepEqual(r1.streak, { count: 1, lastDate: '2026-11-03' });
  assert.equal(r1.xp, 10);   // daily は倍率をかけない
  assert.deepEqual(r1.xpLog.map((e) => [e.kind, e.amount]), [['daily', 10]]);
  const r2 = record.applyEvents(r1, [hist({ problemId: 'q2' })], { now: day1later, stageId: 'st1' }, config);
  assert.deepEqual(r2.streak, { count: 1, lastDate: '2026-11-03' }); assert.equal(r2.xp, 10); assert.equal(r2.xpLog.length, 1);
});

test('applyEvents: answer のない history（再出題）だけでも翌日の streak と daily が更新され、問題別の XP は増えない', () => {
  const r1 = record.applyEvents(record.createRecord(), [hist()], { now: day1, stageId: 'st1' }, config);
  const r2 = record.applyEvents(r1, [hist({ phase: 'retry' })], { now: day2, stageId: 'st1' }, config);
  assert.deepEqual(r2.streak, { count: 2, lastDate: '2026-11-04' });
  assert.equal(r2.xp, 10 + 20);
  assert.deepEqual(r2.xpLog.map((e) => e.kind), ['daily', 'daily']);
});

test('applyEvents: mastery と history が記録される', () => {
  const r0 = record.createRecord();
  const r1 = record.applyEvents(r0, [
    { kind: 'mastery', conceptId: 'c1', change: 'firstTry' },
    hist({ stageId: undefined, correct: false, phase: 'check', attempt: 3, sessionId: 's9' }),
  ], { now: day1, stageId: 'st1' }, config);
  assert.deepEqual(r1.mastery.c1, { value: 0.25, lastAt: day1.toISOString() });
  assert.deepEqual(r1.history, [{ at: day1.toISOString(), sessionId: 's9', attempt: 3, stageId: 'st1', problemId: 'q1', conceptId: 'c1', correct: false, phase: 'check' }]);
  const r2 = record.applyEvents(r1, [{ kind: 'mastery', conceptId: 'c1', change: 'wrong' }], { now: day2, stageId: 'st1' }, config);
  assert.equal(r2.mastery.c1.value, 0.05);
  assert.equal(record.masteryOf(r2, 'c1'), 0.05);
  assert.equal(record.masteryOf(r2, 'none'), 0);
  assert.equal(r1.mastery.c1.value, 0.25);   // 元は変えない
  assert.equal(r0.history.length, 0);
});

test('applyEvents: lessonRead はステージごとに 1 回だけ、level を更新する', () => {
  const r1 = record.applyEvents(record.createRecord(), [{ kind: 'lessonRead', lessonStageId: 'st1' }, { kind: 'lessonRead', lessonStageId: 'st1' }], { now: day1, stageId: 'st1' }, config);
  assert.equal(r1.xp, 10); assert.deepEqual(r1.lessonsRead, { st1: true });
  const r2 = record.applyEvents(r1, [{ kind: 'lessonRead', lessonStageId: 'st2' }, { kind: 'stageClear' }, { kind: 'learnback' }, { kind: 'retryCorrect' }], { now: day1, stageId: 'st2' }, config);
  assert.equal(r2.xp, 10 + 10 + 50 + 20 + 15);
  assert.equal(r2.level, 2);
  assert.equal(r1.level, 1);
});

test('finishStage: stars は上がるときだけ、cleared は inprogress に戻らない', () => {
  let r = record.createRecord();
  r = record.setResume(r, 'st1', { id: 's1' });
  assert.deepEqual(record.stageState(r, 'st1'), { status: 'inprogress', stars: 0, attempts: 0, resume: { id: 's1' } });
  r = record.finishStage(r, { stageId: 'st1', stars: 2, cleared: true }, day1);
  assert.deepEqual(record.stageState(r, 'st1'), { status: 'cleared', stars: 2, attempts: 1, resume: null });
  r = record.finishStage(r, { stageId: 'st1', stars: 1, cleared: true }, day1);
  assert.equal(r.stages.st1.stars, 2); assert.equal(r.stages.st1.attempts, 2);
  r = record.setResume(r, 'st1', { id: 's2' });
  assert.equal(r.stages.st1.status, 'cleared');
  const before = r;
  r = record.finishStage(r, { stageId: 'st1', stars: 3, cleared: false }, day1);
  assert.deepEqual(record.stageState(r, 'st1'), { status: 'cleared', stars: 2, attempts: 3, resume: null });
  assert.deepEqual(before.stages.st1.resume, { id: 's2' });   // 元は変えない
  r = record.finishStage(r, { stageId: 'st1', stars: 3, cleared: true }, day1);
  assert.equal(r.stages.st1.stars, 3);
  // 未挑戦のステージを中断で終えると inprogress
  r = record.finishStage(r, { stageId: 'st2', stars: 0, cleared: false }, day1);
  assert.deepEqual(record.stageState(r, 'st2'), { status: 'inprogress', stars: 0, attempts: 1, resume: null });
  assert.deepEqual(record.stageState(r, 'nope'), { status: 'none', stars: 0, attempts: 0, resume: null });
});

test('markReviewDone: 日付を記録し、元は変えない', () => {
  const r0 = record.createRecord();
  const r1 = record.markReviewDone(r0, 'c1', '2026-11-03');
  assert.deepEqual(r1.reviewDone, { c1: '2026-11-03' });
  assert.deepEqual(r0.reviewDone, {});
});
