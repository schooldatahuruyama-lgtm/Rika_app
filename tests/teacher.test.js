// tests/teacher.test.js — 先生用の確認画面の集計
const test = require('node:test'); const assert = require('node:assert/strict');
const teacher = require('../js/teacher.js');
const record = require('../js/record.js');
const config = require('../js/config.js');
const cr = require('../js/content-registry.js');
const { unit } = require('./fixtures/unit.js');

const reg = cr.createRegistry(); reg.register(unit);

// 端末ローカルの日時（テストを時差に左右されないようにする）
const day1 = new Date(2026, 10, 3, 10, 0);
const day2 = new Date(2026, 10, 4, 9, 0);
const now = new Date(2026, 10, 5, 12, 0);

const hist = (over) => Object.assign({ kind: 'history', sessionId: 's1', attempt: 1, stageId: 's-a1', problemId: 'p-a1-1', conceptId: 'c-a', correct: true, phase: 'main' }, over);
const profile = (id, nickname, over) => Object.assign({ id, nickname, avatar: 'cat', createdAt: day1.toISOString() }, over);
const storeOf = (pairs) => {
  const store = record.createStore();
  pairs.forEach(([p, rec]) => { store.profiles.push(p); store.records[p.id] = rec; });
  store.currentProfileId = pairs.length > 0 ? pairs[0][0].id : null;
  return store;
};

test('summarizeStudent: 履歴なしならmasteryとstreakの最新日、streakは端末の0時', () => {
  const p = profile('p1', 'テスト'); const rec = record.createRecord();
  rec.mastery = { a: { lastAt: day1.toISOString() }, b: { lastAt: day2.toISOString() }, c: { lastAt: 'bad' }, d: null };
  const before = JSON.stringify(rec);
  assert.equal(teacher.summarizeStudent(p, rec, reg, config, now).lastAt, day2.toISOString());
  assert.equal(JSON.stringify(rec), before);
  rec.streak.lastDate = '2026-11-05';
  assert.equal(teacher.summarizeStudent(p, rec, reg, config, now).lastAt, new Date(2026, 10, 5).toISOString());
  rec.mastery = {}; rec.streak.lastDate = 'bad';
  assert.equal(teacher.summarizeStudent(p, rec, reg, config, now).lastAt, null);
  rec.streak.lastDate = null;
  assert.equal(teacher.summarizeStudent(p, rec, reg, config, now).lastAt, null);
});

test('summarizeStudent: 履歴があれば状態の日付は使わない（履歴の日付不明も同じ）', () => {
  const rec = record.createRecord(); rec.streak.lastDate = '2026-11-05';
  rec.mastery = { a: { lastAt: now.toISOString() } };
  rec.history = [hist({ at: day1.toISOString() })];
  assert.equal(teacher.summarizeStudent(profile('p', 'テスト'), rec, reg, config, now).lastAt, day1.toISOString());
  rec.history = [hist({ at: 'bad' })];
  assert.equal(teacher.summarizeStudent(profile('p', 'テスト'), rec, reg, config, now).lastAt, null);
});

test('storeFromState: idをアカウント別に置きかえ、元の入力は変えず履歴なしで集計できる', () => {
  const p = profile('same', 'テスト'); const rec = { xp: 10, mastery: { 'c-a': { value: 0, lastAt: day1.toISOString() } } };
  const before = JSON.stringify({ p, rec });
  const a = teacher.storeFromState(p, rec, 'test-a'); const b = teacher.storeFromState(p, rec, 'test-b');
  assert.equal(a.version, 1); assert.equal(a.currentProfileId, 'acct-test-a');
  assert.equal(a.profiles[0].id, 'acct-test-a'); assert.notEqual(a.profiles[0], p); assert.equal(a.records['acct-test-a'], rec);
  const summary = teacher.summarizeAll([a, b], reg, config, now);
  assert.equal(summary.students.length, 2); assert.equal(summary.students[0].lastAt, day1.toISOString());
  assert.equal(summary.weakConcepts[0].wrongRate, null); assert.equal(JSON.stringify({ p, rec }), before);
});

// c-b: 誤答 2・正解 1（理解度 もう少し）、c-a: 誤答 1・正解 1（まだ）、c-c: 未学習
function sampleRecord(at) {
  let r = record.createRecord();
  r = record.applyEvents(r, [
    hist({ phase: 'warmup', correct: false }),   // 予想は数えない
    hist({ correct: false }),
    { kind: 'mastery', conceptId: 'c-a', change: 'wrong' },
    hist({ correct: true }),
    { kind: 'mastery', conceptId: 'c-a', change: 'later' },
  ], { now: at, stageId: 's-a1' }, config);
  r = record.applyEvents(r, [
    hist({ stageId: 's-a2', conceptId: 'c-b', correct: false }),
    hist({ stageId: 's-a2', conceptId: 'c-b', correct: false }),
    hist({ stageId: 's-a2', conceptId: 'c-b', correct: true }),
    { kind: 'mastery', conceptId: 'c-b', change: 'firstTry' },
    { kind: 'mastery', conceptId: 'c-b', change: 'firstTry' },
  ], { now: at, stageId: 's-a2' }, config);
  return record.finishStage(r, { stageId: 's-a1', stars: 2, cleared: true }, at);
}

test('summarizeStudent: history なし → lastAt null・クリア 0・概念はすべて未学習', () => {
  const s = teacher.summarizeStudent(profile('p1', 'ひかり'), record.createRecord(), reg, config, now);
  assert.equal(s.id, 'p1'); assert.equal(s.nickname, 'ひかり'); assert.equal(s.avatar, 'cat');
  assert.equal(s.unitId, null); assert.equal(s.unitTitle, '');
  assert.equal(s.level, 1); assert.equal(s.xp, 0); assert.equal(s.streak, 0);
  assert.equal(s.lastAt, null); assert.equal(s.daysSince, null);
  assert.deepEqual(s.stages, { cleared: 0, total: 3 });
  assert.deepEqual(s.mastery, { まだ: 0, もう少し: 0, できた: 0, 未学習: 3 });
  assert.deepEqual(s.weak, []);
  assert.equal(s.badges, 0);
});

test('summarizeStudent: badges は取ったバッジの数（知らない id は数えない）、CSV の「バッジ」列', () => {
  const rec = Object.assign(record.createRecord(), { badges: { 'first-clear': { at: day1.toISOString(), seen: true }, retry: { at: 3, seen: 'x' }, 'no-such': { at: day1.toISOString(), seen: false } } });
  const s = teacher.summarizeStudent(profile('p1', 'ひかり'), rec, reg, config, now);
  assert.equal(s.badges, 2);
  assert.equal(teacher.summarizeStudent(profile('p1', 'a'), Object.assign(record.createRecord(), { badges: 'bad' }), reg, config, now).badges, 0);
  const csv = teacher.toCsv(teacher.summarizeAll([storeOf([[profile('p1', 'ひかり'), rec]])], reg, config, now));
  const [head, row] = csv.slice(1).split('\r\n');
  const col = head.split(',').indexOf('バッジ');
  assert.equal(col, head.split(',').indexOf('未学習') + 1);
  assert.equal(row.split(',')[col], '2');
});

test('summarizeStudent: 誤答の多い概念が weak の先頭、クリア数・最終学習・単元', () => {
  const rec = sampleRecord(day2);
  const s = teacher.summarizeStudent(profile('p1', 'ひかり', { unitId: 'u' }), rec, reg, config, now);
  assert.equal(s.unitId, 'u'); assert.equal(s.unitTitle, unit.title);
  assert.deepEqual(s.stages, { cleared: 1, total: 3 });
  assert.equal(s.lastAt, day2.toISOString());
  assert.equal(s.daysSince, 1);
  assert.deepEqual(s.mastery, { まだ: 1, もう少し: 1, できた: 0, 未学習: 1 });
  assert.deepEqual(s.weak.map((w) => [w.conceptId, w.wrong, w.total]), [['c-b', 2, 3], ['c-a', 1, 2]]);
  assert.equal(s.weak[0].title, '光の反射'); assert.equal(s.weak[0].unitId, 'u'); assert.equal(s.weak[0].unitTitle, unit.title);
  assert.equal(s.weak[0].value, 0.5);
  assert.equal(s.xp, rec.xp); assert.equal(s.level, rec.level);
  // 連続学習: きのうまでなら続いている、それより前なら 0
  assert.equal(s.streak, 1);
  assert.equal(teacher.summarizeStudent(profile('p1', 'ひかり'), sampleRecord(day1), reg, config, now).streak, 0);
  assert.equal(teacher.summarizeStudent(profile('p1', 'ひかり'), sampleRecord(day1), reg, config, now).daysSince, 2);
});

test('summarizeStudent: できた の概念は weak に入らない', () => {
  let r = record.createRecord();
  r = record.applyEvents(r, [hist({ correct: false }), ...Array(4).fill({ kind: 'mastery', conceptId: 'c-a', change: 'firstTry' })], { now: day2 }, config);
  const s = teacher.summarizeStudent(profile('p1', 'a'), r, reg, config, now);
  assert.equal(s.mastery['できた'], 1);
  assert.deepEqual(s.weak, []);
});

test('summarizeAll: 同じ profile.id は history の新しいほう、ニックネーム順、weakConcepts の人数と誤答率', () => {
  const old = sampleRecord(day1);
  const newer = record.applyEvents(old, [hist({ correct: true })], { now: day2, stageId: 's-a1' }, config);
  const here = storeOf([[profile('p1', 'そら'), old], [profile('p2', 'あおい'), sampleRecord(day1)]]);
  const imported = storeOf([[profile('p1', 'そら（新）'), newer], [profile('p3', 'かい'), record.createRecord()]]);
  const sum = teacher.summarizeAll([here, imported], reg, config, now);
  assert.deepEqual(sum.students.map((s) => s.nickname), ['あおい', 'かい', 'そら（新）']);
  const sora = sum.students.find((s) => s.id === 'p1');
  assert.equal(sora.lastAt, day2.toISOString());
  // 元の store は変えない
  assert.equal(here.profiles.length, 2); assert.equal(here.records.p1, old);

  // c-a は p1・p2 が「まだ」で 2 人。誤答は 1 + 1、解答は 3（p1 新）+ 2（p2）
  // c-b は「もう少し」なので入らない（まだ の人がいない）
  assert.deepEqual(sum.weakConcepts.map((w) => [w.conceptId, w.students]), [['c-a', 2]]);
  assert.equal(sum.weakConcepts[0].wrongRate, 2 / 5);
  assert.equal(sum.weakConcepts[0].title, '光の直進'); assert.equal(sum.weakConcepts[0].unitTitle, unit.title);

  // 古いほうが後から来ても、新しいほうを残す
  const rev = teacher.summarizeAll([imported, here], reg, config, now);
  assert.equal(rev.students.find((s) => s.id === 'p1').nickname, 'そら（新）');
});

test('summarizeAll: 誤答率は解答が 0 なら null。人数が同じなら誤答率の高い順', () => {
  // まだ（理解度 0 のまま mastery だけある）で解答のない概念
  const r1 = record.applyEvents(record.createRecord(), [{ kind: 'mastery', conceptId: 'c-c', change: 'wrong' }], { now: day2 }, config);
  const r2 = record.applyEvents(record.createRecord(), [
    { kind: 'mastery', conceptId: 'c-a', change: 'wrong' }, hist({ correct: false }),
  ], { now: day2 }, config);
  const sum = teacher.summarizeAll([storeOf([[profile('p1', 'a'), r1], [profile('p2', 'b'), r2]])], reg, config, now);
  assert.deepEqual(sum.weakConcepts.map((w) => [w.conceptId, w.students, w.wrongRate]), [['c-a', 1, 1], ['c-c', 1, null]]);
  assert.deepEqual(teacher.summarizeAll([], reg, config, now), { students: [], weakConcepts: [] });
});

test('toCsv: 先頭が BOM、行数 = 生徒数 + 1、カンマ・改行・引用符を含むニックネームを引用する', () => {
  const store = storeOf([
    [profile('p1', 'あ,い'), sampleRecord(day2)],
    [profile('p2', 'う\nえ'), record.createRecord()],
    [profile('p3', 'お"か'), record.createRecord()],
    [profile('p4', '=1+2'), record.createRecord()],
  ]);
  const csv = teacher.toCsv(teacher.summarizeAll([store], reg, config, now));
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  const lines = csv.slice(1).replace(/\r\n$/, '').split('\r\n');
  assert.equal(lines.length, 4 + 1);
  assert.equal(lines[0], 'ニックネーム,単元,レベル,経験値,連続日数,最終学習日,クリア/全ステージ,できた,もう少し,まだ,未学習,バッジ,苦手');
  assert.ok(csv.includes('"あ,い",'));
  assert.ok(csv.includes('"う\nえ",'));
  assert.ok(csv.includes('"お""か",'));
  assert.ok(csv.includes("'=1+2,"));   // 式として読まれないようにする
  const row = lines.find((l) => l.startsWith('"あ,い"'));
  assert.equal(row, '"あ,い",,' + sampleRecord(day2).level + ',' + sampleRecord(day2).xp + ',1,2026-11-04,1 / 3,0,1,1,1,0,光の反射・光の直進');
});

test('形の崩れた record・store でも例外を出さない', () => {
  const broken = { xp: 'x', streak: null, mastery: [], stages: 'no' };   // history がない
  const s = teacher.summarizeStudent(profile('p1', 'a'), broken, reg, config, now);
  assert.equal(s.lastAt, null); assert.equal(s.xp, 0); assert.equal(s.level, 1); assert.equal(s.mastery['未学習'], 3);
  assert.doesNotThrow(() => teacher.summarizeStudent({}, undefined, reg, config, now));
  const store = { version: 1, profiles: [null, { id: 'p1', nickname: 3 }, { id: 'p2' }, 'x'], records: { p1: { history: [null, 'x', { at: 'bad', conceptId: 'c-a', correct: false }] } } };
  let sum;
  assert.doesNotThrow(() => { sum = teacher.summarizeAll([store, null, { profiles: 'no' }], reg, config, now); });
  assert.equal(sum.students.length, 2);
  assert.equal(sum.students.find((x) => x.id === 'p1').nickname, '（名前なし）');   // 文字列でない名前は使わない
  assert.equal(sum.students.find((x) => x.id === 'p2').nickname, '（名前なし）');
  assert.equal(sum.students.find((x) => x.id === 'p1').lastAt, null);
  assert.doesNotThrow(() => teacher.toCsv(sum));
  assert.doesNotThrow(() => teacher.toCsv(null));
});

test('"__proto__" などの conceptId・mastery のキーで Object.prototype を変えない', () => {
  const rec = JSON.parse('{"mastery":{"__proto__":{"value":0.1},"c-a":{"value":0.1}},"history":[' +
    '{"at":"2026-11-04T00:00:00.000Z","conceptId":"__proto__","correct":false,"phase":"main"},' +
    '{"at":"2026-11-04T00:00:00.000Z","conceptId":"constructor","correct":false,"phase":"main"},' +
    '{"at":"2026-11-04T00:00:00.000Z","conceptId":"c-a","correct":false,"phase":"main"}],"__proto__":{"polluted":true}}');
  const store = { version: 1, profiles: [{ id: 'p1', nickname: 'a' }], records: { p1: rec } };
  let sum;
  assert.doesNotThrow(() => { sum = teacher.summarizeAll([store], reg, config, now); });
  assert.equal(Object.prototype.total, undefined); assert.equal(Object.prototype.wrong, undefined);
  assert.equal({}.polluted, undefined);
  assert.equal(teacher.safeRecord(rec).polluted, undefined);
  assert.deepEqual(sum.students[0].weak.map((w) => [w.conceptId, w.wrong, w.total]), [['c-a', 1, 1]]);
  assert.equal(sum.students[0].mastery['未学習'], 2);
});

test('ニックネーム・日時が { toString: null } や null でも例外を出さない（名前は「（名前なし）」、日時は使わない）', () => {
  const bad = { toString: null };
  const rec = { history: [{ at: bad, conceptId: 'c-a', correct: false, phase: 'main' }, { at: null, conceptId: 'c-a', correct: true, phase: 'main' }, { at: 0, conceptId: 'c-a', correct: true }] };
  const store = { version: 1, profiles: [{ id: 'p1', nickname: bad, avatar: bad }], records: { p1: rec } };
  let sum;
  assert.doesNotThrow(() => { sum = teacher.summarizeAll([store], reg, config, now); });
  const s = sum.students[0];
  assert.equal(s.nickname, '（名前なし）'); assert.equal(s.avatar, null);
  assert.equal(s.lastAt, null); assert.equal(s.daysSince, null);
  let csv;
  assert.doesNotThrow(() => { csv = teacher.toCsv(sum); });
  assert.ok(csv.includes('（名前なし）,'));
  assert.ok(!csv.includes('1970'));
  assert.equal(teacher.nicknameOf({ nickname: '' }), '（名前なし）');
  assert.equal(teacher.nicknameOf(null), '（名前なし）');
});

test('parseAt: 文字列で日時として読めるものだけ Date、それ以外は null', () => {
  assert.equal(teacher.parseAt(day1.toISOString()).getTime(), day1.getTime());
  [null, undefined, 0, 1730000000000, '', 'bad', { toString: null }, {}, []].forEach((v) => assert.equal(teacher.parseAt(v), null));
});
