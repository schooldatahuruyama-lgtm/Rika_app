// tests/badges.test.js — バッジの定義と判定
const test = require('node:test'); const assert = require('node:assert/strict');
const badges = require('../js/badges.js');
const record = require('../js/record.js');
const config = require('../js/config.js');
const cr = require('../js/content-registry.js');
const { unit } = require('./fixtures/unit.js');

const reg = cr.createRegistry(); reg.register(unit);

// 端末ローカルの日時（テストを時差に左右されないようにする）
const at = (d, h) => new Date(2026, 10, d, h === undefined ? 10 : h);
const hist = (over) => Object.assign({ kind: 'history', sessionId: 's1', attempt: 1, stageId: 's-a1', problemId: 'p-a1-1', conceptId: 'c-a', correct: true, phase: 'main' }, over);

const ZERO = {
  clearedStages: 0, clearedUnits: 0, perfectStages: 0, totalStars: 0, answers: 0, retryCorrect: 0, learnback: 0,
  lessonsRead: 0, reviewedConcepts: 0, masteredConcepts: 0, bestStreak: 0,
};

test('stats: 空の記録はすべて 0（level は 1）', () => {
  assert.deepEqual(badges.stats(record.createRecord(), reg, config), Object.assign({}, ZERO, { level: 1 }));
});

test('stats: クリア 2 回（星 3 と 2）→ clearedStages 2、perfectStages 1、totalStars 5。全ステージクリアで clearedUnits 1', () => {
  let r = record.createRecord();
  r = record.finishStage(r, { stageId: 's-a1', stars: 3, cleared: true }, at(3));
  r = record.finishStage(r, { stageId: 's-a2', stars: 2, cleared: true }, at(3));
  r = record.finishStage(r, { stageId: 's-b1', stars: 0, cleared: false }, at(3));   // 中断は数えない
  const s = badges.stats(r, reg, config);
  assert.equal(s.clearedStages, 2); assert.equal(s.perfectStages, 1); assert.equal(s.totalStars, 5);
  assert.equal(s.clearedUnits, 0);
  r = record.finishStage(r, { stageId: 's-b1', stars: 1, cleared: true }, at(3));
  assert.equal(badges.stats(r, reg, config).clearedUnits, 1);
  // 登録されていないステージは数えない
  r = record.finishStage(r, { stageId: 'nope', stars: 3, cleared: true }, at(3));
  assert.equal(badges.stats(r, reg, config).clearedStages, 3);
});

test('stats: free: true の領域（ミニプリント）は clearedUnits に数えない。clearedStages・星には数える', () => {
  const u = JSON.parse(JSON.stringify(unit));
  u.areas[1].free = true;   // 領域 b（s-b1）をミニプリント扱いに
  const reg2 = cr.createRegistry(); reg2.register(u);
  let r = record.createRecord();
  r = record.finishStage(r, { stageId: 's-a1', stars: 3, cleared: true }, at(3));
  r = record.finishStage(r, { stageId: 's-a2', stars: 2, cleared: true }, at(3));
  assert.equal(badges.stats(r, reg2, config).clearedUnits, 1);   // s-b1 が未クリアでも 1
  r = record.finishStage(r, { stageId: 's-b1', stars: 3, cleared: true }, at(3));
  const s = badges.stats(r, reg2, config);
  assert.equal(s.clearedUnits, 1); assert.equal(s.clearedStages, 3);
  assert.equal(s.totalStars, 8); assert.equal(s.perfectStages, 2);
  // 基本のステージが未クリアなら free をクリアしても 0
  let r2 = record.createRecord();
  r2 = record.finishStage(r2, { stageId: 's-b1', stars: 3, cleared: true }, at(3));
  assert.equal(badges.stats(r2, reg2, config).clearedUnits, 0);
  // free: 'true'（文字列）は free と見なさない
  const u3 = JSON.parse(JSON.stringify(unit)); u3.areas[1].free = 'true';
  const reg3 = cr.createRegistry(); reg3.register(u3);
  assert.equal(badges.stats(r, reg3, config).clearedUnits, 1);
  const r3 = record.finishStage(record.finishStage(record.createRecord(), { stageId: 's-a1', stars: 1, cleared: true }, at(3)), { stageId: 's-a2', stars: 1, cleared: true }, at(3));
  assert.equal(badges.stats(r3, reg3, config).clearedUnits, 0);
});

test('stats: ステージ 0 の単元は clearedUnits に数えない', () => {
  const reg2 = cr.createRegistry(); reg2.register({ id: 'empty', title: '空', concepts: [], areas: [] });
  assert.equal(badges.stats(record.createRecord(), reg2, config).clearedUnits, 0);
});

test('stats: bestStreak は 3 日連続 + 1 日空けて 2 日 → 3。同じ日は 1 日、予想（warmup）だけの日は数えない', () => {
  let r = record.createRecord();
  [at(3), at(3, 15), at(4), at(5), at(7), at(8)].forEach((d) => { r = record.applyEvents(r, [hist()], { now: d }, config); });
  r = record.applyEvents(r, [hist({ phase: 'warmup' })], { now: at(6) }, config);   // 6 日は予想だけ（つながらない）
  const s = badges.stats(r, reg, config);
  assert.equal(s.bestStreak, 3);
  assert.equal(s.answers, 6);   // warmup 以外
  // 月をまたいでも続く
  let m = record.createRecord();
  [new Date(2026, 9, 30, 10), new Date(2026, 9, 31, 10), new Date(2026, 10, 1, 10), new Date(2026, 10, 2, 10)].forEach((d) => { m = record.applyEvents(m, [hist()], { now: d }, config); });
  assert.equal(badges.stats(m, reg, config).bestStreak, 4);
});

test('stats: xpLog の retryCorrect・learnback、lessonsRead、reviewDone、mastery の「できた」、level を数える', () => {
  let r = record.createRecord();
  r = record.applyEvents(r, [{ kind: 'retryCorrect' }, { kind: 'retryCorrect' }, { kind: 'learnback' }, { kind: 'answer' },
    { kind: 'lessonRead', lessonStageId: 's-a1' }, { kind: 'lessonRead', lessonStageId: 's-a2' },
    ...Array(4).fill({ kind: 'mastery', conceptId: 'c-a', change: 'firstTry' }),   // 1.0 → できた
    ...Array(3).fill({ kind: 'mastery', conceptId: 'c-b', change: 'firstTry' }),   // 0.75 → もう少し
  ], { now: at(3) }, config);
  r = record.markReviewDone(r, 'c-a', '2026-11-03');
  r = record.markReviewDone(r, 'c-b', '2026-11-03');
  r = Object.assign({}, r, { lessonsRead: Object.assign({}, r.lessonsRead, { x: false }) });
  const s = badges.stats(r, reg, config);
  assert.equal(s.retryCorrect, 2); assert.equal(s.learnback, 1);
  assert.equal(s.lessonsRead, 2); assert.equal(s.reviewedConcepts, 2);
  assert.equal(s.masteredConcepts, 1);
  assert.equal(s.level, r.level);
  // 境は config から読む（0.7 にすれば c-b も「できた」）
  const cfg = Object.assign({}, config, { mastery: Object.assign({}, config.mastery, { labels: [[0.4, 'まだ'], [0.7, 'もう少し'], [1.01, 'できた']] }) });
  assert.equal(badges.stats(r, reg, cfg).masteredConcepts, 2);
});

test('stats: history・xpLog・badges などが無い・形の崩れた記録でも例外を出さず 0', () => {
  [{}, null, undefined, 'x', { history: 'no', xpLog: null, stages: [], mastery: 3, lessonsRead: null, reviewDone: 'x', badges: 'bad', level: 'x' },
    { history: [null, 'x', { at: 'bad', phase: 'main' }, { at: null }, { at: { toString: null } }], xpLog: [null, 1], stages: { 's-a1': null } }]
    .forEach((rec) => {
      let s;
      assert.doesNotThrow(() => { s = badges.stats(rec, reg, config); });
      assert.equal(s.clearedStages, 0); assert.equal(s.bestStreak, 0); assert.equal(s.retryCorrect, 0); assert.equal(s.masteredConcepts, 0);
      assert.doesNotThrow(() => badges.earned(rec, reg, config));
      assert.doesNotThrow(() => badges.newlyEarned(rec, reg, config));
    });
  // 壊れた history の中の有効でない日時は数えないが、解答の数には入る（予想以外）
  assert.equal(badges.stats({ history: [{ at: 'bad', phase: 'main' }] }, reg, config).answers, 1);
  // reg が使えなくても例外を出さない
  assert.doesNotThrow(() => badges.stats(record.createRecord(), null, config));
  assert.doesNotThrow(() => badges.stats(record.createRecord(), reg));   // config 省略は既定の config
});

test('earned / newlyEarned / award / markSeen: first-clear が取れて、award 後は newlyEarned が空', () => {
  const r0 = record.finishStage(record.createRecord(), { stageId: 's-a1', stars: 2, cleared: true }, at(3));
  assert.deepEqual(badges.earned(r0, reg, config), ['first-clear']);
  assert.deepEqual(badges.newlyEarned(r0, reg, config), ['first-clear']);
  const r1 = badges.award(r0, ['first-clear'], at(3));
  assert.deepEqual(r1.badges, { 'first-clear': { at: at(3).toISOString(), seen: false } });
  assert.deepEqual(r0.badges, {});   // 元は変えない
  assert.deepEqual(badges.newlyEarned(r1, reg, config), []);
  assert.deepEqual(badges.unseen(r1), ['first-clear']);
  assert.equal(badges.count(r1), 1);
  // すでに取っているバッジは award で at が変わらない
  const r2 = badges.award(r1, ['first-clear', 'retry'], at(5));
  assert.equal(r2.badges['first-clear'].at, at(3).toISOString());
  assert.deepEqual(r2.badges.retry, { at: at(5).toISOString(), seen: false });
  assert.equal(r1.badges.retry, undefined);
  // markSeen
  const r3 = badges.markSeen(r2, ['first-clear', 'not-earned']);
  assert.deepEqual(r3.badges['first-clear'], { at: at(3).toISOString(), seen: true });
  assert.equal(r3.badges.retry.seen, false);
  assert.equal(r3.badges['not-earned'], undefined);   // 取っていないものは足さない
  assert.equal(r2.badges['first-clear'].seen, false);   // 元は変えない
  assert.deepEqual(badges.unseen(r3), ['retry']);
});

test('entry: 中身の形が崩れていても、キーがあれば取っている（seen は true 扱い）', () => {
  const rec = Object.assign(record.createRecord(), { badges: { 'first-clear': { at: 5, seen: 'x' }, retry: null, perfect: { at: 'a', seen: false }, 'clear-20': { at: 5, seen: false }, 'stars-10': { at: 'b', seen: 'x' } } });
  assert.deepEqual(badges.entry(rec, 'first-clear'), { at: null, seen: true });
  assert.deepEqual(badges.entry(rec, 'retry'), { at: null, seen: true });
  assert.deepEqual(badges.entry(rec, 'perfect'), { at: 'a', seen: false });
  // at だけ崩れて seen: false でも、未読にはしない（結果画面に「新しいバッジ」として出さない）
  assert.deepEqual(badges.entry(rec, 'clear-20'), { at: null, seen: true });
  assert.deepEqual(badges.entry(rec, 'stars-10'), { at: 'b', seen: true });
  assert.equal(badges.entry(rec, 'clear-5'), null);
  assert.equal(badges.entry({ badges: 'bad' }, 'retry'), null);
  assert.equal(badges.entry(null, 'retry'), null);
  assert.deepEqual(badges.unseen(rec), ['perfect']);
  assert.equal(badges.count(rec), 5);
  // 取っているので newlyEarned には出ない（取り消しも作り直しもしない）
  const cleared = record.finishStage(rec, { stageId: 's-a1', stars: 1, cleared: true }, at(3));
  assert.deepEqual(badges.newlyEarned(cleared, reg, config), []);
});

test('award / markSeen: "__proto__" の id・キーで Object.prototype を変えない', () => {
  const rec = JSON.parse('{"badges":{"__proto__":{"polluted":true},"retry":{"at":"x","seen":false}}}');
  const r1 = badges.award(rec, ['__proto__', 'perfect'], at(3));
  const r2 = badges.markSeen(r1, ['__proto__', 'retry']);
  assert.equal({}.polluted, undefined);
  assert.equal(r2.badges.retry.seen, true);
  assert.equal(r2.badges.perfect.seen, false);
  assert.equal(Object.getPrototypeOf(r2.badges), Object.prototype);
});

test('earned: いろいろな条件', () => {
  let r = record.createRecord();
  r = record.applyEvents(r, [{ kind: 'retryCorrect' }, ...Array(3).fill({ kind: 'learnback' })], { now: at(3) }, config);
  r = Object.assign({}, r, { level: 10 });
  const ids = badges.earned(r, reg, config);
  ['retry', 'learnback-3', 'level-5', 'level-10'].forEach((id) => assert.ok(ids.includes(id), id));
  assert.ok(!ids.includes('first-clear'));
  // DEFS の順
  assert.deepEqual(ids, badges.DEFS.map((d) => d.id).filter((id) => ids.includes(id)));
});

test('DEFS: 20 個、id が重複しない、title・description・glyph・color・test が全部ある、color は 5 色のどれか', () => {
  assert.equal(badges.DEFS.length, 20);
  const ids = badges.DEFS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(badges.COLORS, ['blue', 'green', 'orange', 'purple', 'pink']);
  badges.DEFS.forEach((d) => {
    ['id', 'title', 'description', 'glyph'].forEach((k) => assert.ok(typeof d[k] === 'string' && d[k].length > 0, d.id + ' の ' + k));
    assert.ok(badges.COLORS.includes(d.color), d.id + ' の color');
    assert.equal(typeof d.test, 'function');
    assert.equal(d.test(Object.assign({}, ZERO, { level: 1 })), false, d.id + ' は空の記録で取れない');
  });
  assert.equal(badges.def('first-clear').title, 'はじめの一歩');
  assert.equal(badges.def('none'), null);
});

test('record: createRecord に badges、applyEvents は badges を写して元を変えない', () => {
  const r0 = badges.award(record.createRecord(), ['retry'], at(3));
  const r1 = record.applyEvents(r0, [{ kind: 'answer' }], { now: at(3) }, config);
  assert.deepEqual(r1.badges, r0.badges);
  assert.notEqual(r1.badges, r0.badges);
});

test('画像: DEFS の各 id の assets/images/badges/<id>.png があり、sw.js の PRECACHE に入っている', () => {
  const fs = require('node:fs'); const path = require('node:path');
  const ROOT = path.join(__dirname, '..');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const m = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(m, 'sw.js に PRECACHE がない');
  badges.DEFS.forEach((d) => {
    const f = 'assets/images/badges/' + d.id + '.png';
    assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' がない');
    assert.ok(m[1].includes("'" + f + "'"), f + ' が PRECACHE にない');
  });
});
