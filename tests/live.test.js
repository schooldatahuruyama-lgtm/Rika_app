// tests/live.test.js — ライブクイズの純粋関数（js/live.js）
const test = require('node:test'); const assert = require('node:assert/strict');
const live = require('../js/live.js');
const record = require('../js/record.js');
const config = require('../js/config.js');
const mastery = require('../js/mastery.js');
const { unit } = require('./fixtures/unit.js');

// 決まった並びを返す乱数
function seq(values) { let i = 0; return () => values[i++ % values.length]; }

const Q = { id: 'q1', prompt: '光はまっすぐ進む？', options: [{ id: 'o1', text: 'はい' }, { id: 'o2', text: 'いいえ' }], answer: 'o1', conceptId: 'c-a', unitId: 'u', stageId: 's-a1', source: 'content' };

test('newRoomCode: 6 文字、I・O・0・1 を使わない。newPlayerId は p＋8 文字', () => {
  for (let i = 0; i < 200; i++) {
    const code = live.newRoomCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.ok(live.isRoomCode(code));
  }
  assert.equal(live.newRoomCode(() => 0), 'AAAAAA');
  assert.equal(live.newRoomCode(() => 0.9999999), '999999');
  assert.equal(live.CODE_CHARS.length, 32);
  assert.ok(!/[IO01]/.test(live.CODE_CHARS));
  assert.match(live.newPlayerId(), /^p[a-z0-9]{8}$/);
  assert.equal(live.newPlayerId(seq([0])), 'paaaaaaaa');
  assert.equal(live.isRoomCode('ABCDE1'), false);
  assert.equal(live.isRoomCode('abcdef'), false);
});

test('questionFromProblem: 選択式だけ、図は落とす、長い問題文は除く', () => {
  const stage = unit.areas[0].stages[0];
  const choice = stage.problems[0];
  const q = live.questionFromProblem(choice, { unitId: 'u', stageId: stage.id });
  assert.deepEqual(q, { id: 'p-a1-1', prompt: '光はまっすぐ進む？', options: [{ id: 'o1', text: 'はい' }, { id: 'o2', text: 'いいえ' }], answer: 'o1', conceptId: 'c-a', unitId: 'u', stageId: 's-a1', source: 'content' });
  // fill（選択式でない）は null
  assert.equal(live.questionFromProblem(stage.problems[1], { unitId: 'u', stageId: stage.id }), null);
  assert.equal(live.questionFromProblem({ ...choice, type: 'figure-choice' }, {}), null);
  // 図のある choice は図を落として文だけ
  const withFigure = live.questionFromProblem({ ...choice, figure: { width: 10, height: 10, items: [] } }, { unitId: 'u', stageId: 's' });
  assert.equal('figure' in withFigure, false);
  assert.equal(withFigure.prompt, '光はまっすぐ進む？');
  // 120 字までは出せる、121 字は除く
  assert.ok(live.questionFromProblem({ ...choice, prompt: 'あ'.repeat(120) }, {}));
  assert.equal(live.questionFromProblem({ ...choice, prompt: 'あ'.repeat(121) }, {}), null);
  // 答えが選択肢にない・選択肢が 1 つ・null は除く
  assert.equal(live.questionFromProblem({ ...choice, answer: 'o9' }, {}), null);
  assert.equal(live.questionFromProblem({ ...choice, options: [{ id: 'o1', text: 'はい' }] }, {}), null);
  assert.equal(live.questionFromProblem(null, {}), null);
  // 元を変えない
  assert.equal(choice.figure, null);
});

test('customQuestion: 空の文・選択肢 2 未満は null、答えは a〜d', () => {
  const q = live.customQuestion({ prompt: ' 水は何度で沸とうする？ ', options: ['50 度', '100 度', '', '200 度'], answer: 1 }, 3);
  assert.deepEqual(q, { id: 'c-3', prompt: '水は何度で沸とうする？', options: [{ id: 'a', text: '50 度' }, { id: 'b', text: '100 度' }, { id: 'c', text: '200 度' }], answer: 'b', conceptId: null, source: 'custom' });
  // 空の選択肢を飛ばしても答えの番号は元の並びで数える
  assert.equal(live.customQuestion({ prompt: 'x', options: ['', 'A', 'B'], answer: 2 }, 1).answer, 'b');
  assert.equal(live.customQuestion({ prompt: '', options: ['A', 'B'], answer: 0 }), null);
  assert.equal(live.customQuestion({ prompt: '   ', options: ['A', 'B'], answer: 0 }), null);
  assert.equal(live.customQuestion({ prompt: 'x', options: ['A'], answer: 0 }), null);
  assert.equal(live.customQuestion({ prompt: 'x', options: ['A', ' '], answer: 0 }), null);
  assert.equal(live.customQuestion({ prompt: 'x', options: ['A', 'B'], answer: 2 }), null);
  assert.equal(live.customQuestion({ prompt: 'x', options: ['A', '', 'B'], answer: 1 }), null);   // 答えの文が空
  assert.equal(live.customQuestion({ prompt: 'x', options: ['A', 'B'], answer: '0' }), null);
  assert.equal(live.customQuestion(null), null);
  // 番号を省くと数えた番号で、重ならない
  const a = live.customQuestion({ prompt: 'x', options: ['A', 'B'], answer: 0 });
  const b = live.customQuestion({ prompt: 'y', options: ['A', 'B'], answer: 0 });
  assert.match(a.id, /^c-\d+$/);
  assert.notEqual(a.id, b.id);
  // 5 つ目以降の選択肢は使わない
  assert.equal(live.customQuestion({ prompt: 'x', options: ['A', 'B', 'C', 'D', 'E'], answer: 0 }, 1).options.length, 4);
});

test('newRoom: questions は id をキーにした object（order 付き）、秒数は 5〜120（既定 20）', () => {
  const q2 = { ...Q, id: 'q2' };
  const room = live.newRoom({ code: 'ABCDEF', title: '光', questions: [Q, q2, Q], hostId: 'h1' }, 1000);
  assert.deepEqual(room.meta, { createdAt: 1000, title: '光', status: 'lobby', seconds: 20, hostId: 'h1', count: 2 });
  assert.deepEqual(Object.keys(room.questions), ['q1', 'q2']);
  assert.equal(room.questions.q1.order, 0);
  assert.equal(room.questions.q2.order, 1);
  assert.equal(room.questions.q1.prompt, Q.prompt);
  assert.equal('order' in Q, false);   // 元を変えない
  assert.deepEqual(room.state, { index: -1, phase: 'lobby', startedAt: null, seconds: 20 });
  assert.equal(live.newRoom({ questions: [], seconds: 1 }, 0).meta.seconds, 5);
  assert.equal(live.newRoom({ questions: [], seconds: 999 }, 0).state.seconds, 120);
  assert.equal(live.newRoom({ questions: [], seconds: 30 }, new Date(5000)).meta.createdAt, 5000);
});

test('scoreFor: 即答 1000、半分で 750、時間切れ 500、不正解 0', () => {
  const t0 = 100000;
  assert.equal(live.scoreFor(Q, { choice: 'o1', at: t0 }, t0, 20), 1000);
  assert.equal(live.scoreFor(Q, { choice: 'o1', at: t0 + 10000 }, t0, 20), 750);
  assert.equal(live.scoreFor(Q, { choice: 'o1', at: t0 + 20000 }, t0, 20), 500);
  assert.equal(live.scoreFor(Q, { choice: 'o1', at: t0 + 60000 }, t0, 20), 500);
  assert.equal(live.scoreFor(Q, { choice: 'o1', at: t0 - 3000 }, t0, 20), 1000);   // 時計のずれで開始より前でも上限は 1000
  assert.equal(live.scoreFor(Q, { choice: 'o2', at: t0 }, t0, 20), 0);
  assert.equal(live.scoreFor(Q, null, t0, 20), 0);
  assert.equal(live.scoreFor(Q, { choice: 'o1' }, t0, 20), 500);   // 時刻がわからなければ速さの点なし
});

test('tally: 選択肢ごとの人数、合計、正解の人数（選択肢にない答えは数えない）', () => {
  const answers = { p1: { choice: 'o1', at: 1 }, p2: { choice: 'o2', at: 2 }, p3: { choice: 'o1', at: 3 }, p4: { choice: 'zz', at: 4 }, p5: null };
  assert.deepEqual(live.tally(Q, answers), { counts: { o1: 2, o2: 1 }, total: 3, correctCount: 2 });
  assert.deepEqual(live.tally(Q, null), { counts: { o1: 0, o2: 0 }, total: 0, correctCount: 0 });
});

test('applyScores: 得点を足した新しい players。元を変えず、同じ問題で二重に足さない', () => {
  const players = { p1: { name: 'ひかり', score: 100 }, p2: { name: 'そら', score: 0 }, p3: { name: 'うみ' } };
  const answers = { p1: { choice: 'o1', at: 10000 }, p2: { choice: 'o2', at: 1000 }, px: { choice: 'o1', at: 0 } };
  const next = live.applyScores(players, Q, answers, 0, 20);
  assert.equal(next.p1.score, 100 + 750);
  assert.equal(next.p1.lastPoints, 750);
  assert.equal(next.p1.lastQ, 'q1');
  assert.equal(next.p2.score, 0);
  assert.equal(next.p3.score, 0);           // 答えなし
  assert.equal(next.p1.name, 'ひかり');
  assert.equal('px' in next, false);        // 参加していない人は足さない
  assert.deepEqual(players, { p1: { name: 'ひかり', score: 100 }, p2: { name: 'そら', score: 0 }, p3: { name: 'うみ' } });
  const again = live.applyScores(next, Q, answers, 0, 20);
  assert.equal(again.p1.score, 850);
  assert.deepEqual(live.applyScores(null, Q, answers, 0, 20), {});
});

test('leaderboard: 得点の高い順、同点は同じ rank で名前順', () => {
  const rows = live.leaderboard({ p1: { name: 'そら', score: 900 }, p2: { name: 'あおい', score: 900 }, p3: { name: 'うみ', score: 1500 }, p4: { name: 'かい', score: 0 }, p5: 'bad' });
  assert.deepEqual(rows, [
    { pid: 'p3', name: 'うみ', score: 1500, rank: 1 },
    { pid: 'p2', name: 'あおい', score: 900, rank: 2 },
    { pid: 'p1', name: 'そら', score: 900, rank: 2 },
    { pid: 'p4', name: 'かい', score: 0, rank: 4 },
  ]);
  assert.deepEqual(live.leaderboard(null), []);
});

test('recordEvents: 教材の問題は phase live の履歴・経験値・理解度、自作は経験値だけ', () => {
  const now = new Date(2026, 10, 7, 10, 0);
  const evs = live.recordEvents(Q, 'o1', true, 'live-ABCDEF');
  assert.ok(evs.every(e => e && typeof e.kind === 'string'));
  assert.deepEqual(evs.find(e => e.kind === 'mastery'), { kind: 'mastery', conceptId: 'c-a', change: 'later' });
  const rec = record.applyEvents(record.createRecord(), evs, { now }, config);
  assert.equal(rec.history.length, 1);
  assert.equal(rec.history[0].phase, 'live');
  assert.equal(rec.history[0].problemId, 'q1');
  assert.equal(rec.history[0].stageId, 's-a1');
  assert.equal(rec.history[0].sessionId, 'live-ABCDEF');
  assert.equal(rec.history[0].correct, true);
  assert.deepEqual(rec.xpLog.map(l => l.kind), ['daily', 'answer', 'correct']);
  assert.equal(rec.xp, config.xp.dailyPerStreakDay + config.xp.answer + config.xp.correct);
  assert.equal(rec.mastery['c-a'].value, config.mastery.later);

  // 不正解は correct なしで理解度が下がる（0 より下にはならない）
  const wrong = live.recordEvents(Q, 'o2', false, 's');
  assert.deepEqual(wrong.map(e => e.kind), ['history', 'answer', 'mastery']);
  assert.equal(wrong[2].change, 'wrong');
  const rec2 = record.applyEvents(rec, wrong, { now }, config);
  assert.equal(rec2.mastery['c-a'].value, mastery.update(config.mastery.later, 'wrong', config));

  // 自作の問題は経験値だけ（履歴・理解度なし）
  const custom = live.customQuestion({ prompt: 'x', options: ['A', 'B'], answer: 0 }, 1);
  const cev = live.recordEvents(custom, 'a', true, 's');
  assert.deepEqual(cev, [{ kind: 'answer' }, { kind: 'correct' }]);
  const rec3 = record.applyEvents(record.createRecord(), cev, { now }, config);
  assert.equal(rec3.history.length, 0);
  assert.deepEqual(rec3.mastery, {});
  assert.equal(rec3.xp, config.xp.answer + config.xp.correct);

  // 概念のない教材の問題は理解度なし
  assert.equal(live.recordEvents({ ...Q, conceptId: null }, 'o1', true, 's').some(e => e.kind === 'mastery'), false);
  assert.deepEqual(live.recordEvents(null, 'o1', true, 's'), []);
});

test('safeRoom: 崩れた値でも例外なし、questions は order 順の配列', () => {
  const empty = { meta: { createdAt: null, title: '', status: 'lobby', seconds: 20, hostId: null, count: 0 }, questions: [], state: { index: -1, phase: 'lobby', startedAt: null, seconds: 20 }, players: {}, answers: {} };
  [null, undefined, [], 'abc', 42, true, { meta: 'x', questions: 'y', state: [], players: 1, answers: 'z' }].forEach(v => {
    assert.deepEqual(live.safeRoom(v), empty);
  });
  const room = live.newRoom({ title: 't', questions: [{ ...Q, id: 'b' }, { ...Q, id: 'a' }], seconds: 30, hostId: 'h' }, 5);
  // Firebase は null の値を保存しないので、conceptId・startedAt がない形で届く
  delete room.questions.a.conceptId;
  delete room.state.startedAt;
  room.questions.bad = { id: 'bad', prompt: 'x', options: [{ id: 'o1', text: 'A' }], answer: 'o1', order: 2 };
  room.players = { p1: { name: 'ひかり', score: 500 }, p2: { score: 3 }, p3: { name: 'あ'.repeat(20), score: 'x' } };
  room.answers = { b: { p1: { choice: 'o1', at: 9 }, p2: { choice: 3 } }, a: 'bad' };
  const s = live.safeRoom(room);
  assert.deepEqual(s.questions.map(q => q.id), ['b', 'a']);
  assert.equal(s.questions[1].conceptId, null);
  assert.equal(s.meta.seconds, 30);
  assert.equal(s.meta.count, 2);
  assert.deepEqual(s.state, { index: -1, phase: 'lobby', startedAt: null, seconds: 30 });
  assert.deepEqual(Object.keys(s.players), ['p1', 'p3']);
  assert.equal(s.players.p3.name.length, 12);
  assert.equal(s.players.p3.score, 0);
  assert.deepEqual(s.answers, { b: { p1: { choice: 'o1', at: 9 } } });
  // 選択肢が object（"0","1" のキー）で届いても読める
  const objOpts = live.safeRoom({ questions: { q: { ...Q, id: 'q', options: { 0: { id: 'o1', text: 'はい' }, 1: { id: 'o2', text: 'いいえ' } } } } });
  assert.equal(objOpts.questions[0].options.length, 2);
  assert.equal(live.safeRoom({ state: { phase: 'zzz', index: 'x' } }).state.phase, 'lobby');
});

test('isStale: 作成から 24 時間以上で古い（作成時刻がなければ古い）', () => {
  const day = 24 * 60 * 60 * 1000;
  assert.equal(live.isStale({ createdAt: 0 }, day - 1), false);
  assert.equal(live.isStale({ createdAt: 0 }, day), true);
  assert.equal(live.isStale({}, 0), true);
  assert.equal(live.isStale(null, 0), true);
});

test('nextState: start → show、reveal、next、最後の next は ended、end', () => {
  const qs = [Q, { ...Q, id: 'q2' }];
  const s0 = live.newRoom({ questions: qs, seconds: 15 }, 0).state;
  const s1 = live.nextState(s0, qs, 'start', 1000);
  assert.deepEqual(s1, { index: 0, phase: 'show', startedAt: 1000, seconds: 15 });
  const s2 = live.nextState(s1, qs, 'reveal', 2000);
  assert.deepEqual(s2, { index: 0, phase: 'reveal', startedAt: 1000, seconds: 15 });
  assert.deepEqual(live.nextState(s2, qs, 'reveal', 3000), s2);   // show でなければ変えない
  const s3 = live.nextState(s2, qs, 'next', 4000);
  assert.deepEqual(s3, { index: 1, phase: 'show', startedAt: 4000, seconds: 15 });
  const s4 = live.nextState(live.nextState(s3, qs, 'reveal', 5000), qs, 'next', 6000);
  assert.equal(s4.phase, 'ended');
  assert.equal(live.nextState(s1, qs, 'end', 0).phase, 'ended');
  assert.equal(live.nextState(s0, [], 'start', 0).phase, 'ended');
  assert.deepEqual(live.nextState(s1, qs, 'zzz', 0), s1);
  assert.deepEqual(s0, { index: -1, phase: 'lobby', startedAt: null, seconds: 15 });   // 元を変えない
});

test('scoreUpdate: サーバーから取り直した players・answers で採点し、受信の写しは使わない。何度呼んでも二重に足さない', () => {
  // 受信の写しでは p2 は未回答だが、サーバーには届いている
  const stale = { p1: { choice: 'o1', at: 10000 } };
  const serverAnswers = { p1: { choice: 'o1', at: 10000 }, p2: { choice: 'o1', at: 0 }, px: { choice: 'o1', at: 0 }, bad: 'o1' };
  const serverPlayers = { p1: { name: 'ひかり', score: 100, joinedAt: 5 }, p2: { name: 'そら', score: 0 }, broken: { score: 9 } };
  const update = live.scoreUpdate(serverPlayers, Q, serverAnswers, 0, 20);
  assert.deepEqual(update, {
    'p1/score': 850, 'p1/lastQ': 'q1', 'p1/lastPoints': 750,
    'p2/score': 1000, 'p2/lastQ': 'q1', 'p2/lastPoints': 1000,
  });
  assert.notDeepEqual(live.scoreUpdate(serverPlayers, Q, stale, 0, 20), update);   // 写しで採点すると p2 が 0 点になる
  // 書いたあとの players で呼び直しても、もう足さない（再試行しても正しい点のまま）
  const after = { p1: { name: 'ひかり', score: 850, lastQ: 'q1', lastPoints: 750 }, p2: { name: 'そら', score: 1000, lastQ: 'q1', lastPoints: 1000 } };
  assert.deepEqual(live.scoreUpdate(after, Q, serverAnswers, 0, 20), {});
  // 途中で一部の人だけ書けていた場合は、残りの人だけ
  const half = { p1: after.p1, p2: { name: 'そら', score: 0 } };
  assert.deepEqual(live.scoreUpdate(half, Q, serverAnswers, 0, 20), { 'p2/score': 1000, 'p2/lastQ': 'q1', 'p2/lastPoints': 1000 });
  // 参加者・回答がない（GET が null）
  assert.deepEqual(live.scoreUpdate(null, Q, null, 0, 20), {});
  assert.deepEqual(live.scoreUpdate({ p1: { name: 'a', score: 3 } }, Q, null, 0, 20), { 'p1/score': 3, 'p1/lastQ': 'q1', 'p1/lastPoints': 0 });
  assert.deepEqual(live.scoreUpdate(serverPlayers, null, serverAnswers, 0, 20), {});
  assert.deepEqual(serverPlayers.p1, { name: 'ひかり', score: 100, joinedAt: 5 });   // 元を変えない
});

test('pendingRecords: 答え合わせが済んだ問題の、サーバーにある自分の回答で、まだ記録していないもの', () => {
  const Q2 = { ...Q, id: 'q2', conceptId: 'c-b' };
  const Q3 = { ...Q, id: 'q3', source: 'custom', conceptId: null };
  const raw = {
    meta: { createdAt: 0, status: 'lobby' },
    questions: { q1: { ...Q, order: 0 }, q2: { ...Q2, order: 1 }, q3: { ...Q3, order: 2 } },
    state: { index: 1, phase: 'show', startedAt: 0, seconds: 20 },
    players: { p1: { name: 'ひかり', score: 0 } },
    answers: { q1: { p1: { choice: 'o1', at: 1 } }, q2: { p1: { choice: 'o2', at: 1 } } },
  };
  const room = live.safeRoom(raw);
  assert.equal(live.recordKey('prof-a', 'p1', 'ABCDEF', 'q1'), 'prof-a:p1:ABCDEF:q1');
  assert.equal(live.recordRoomKey('prof-a', 'p1', 'ABCDEF'), 'prof-a:p1:ABCDEF');
  // q1 は前の問題（答え合わせを見ていなくても）入る。q2 はまだ出題中なので入らない
  const list = live.pendingRecords(room, 'p1', [], 'prof-a', 'ABCDEF');
  assert.deepEqual(list.map(x => [x.key, x.qid, x.choice, x.correct]), [['prof-a:p1:ABCDEF:q1', 'q1', 'o1', true]]);
  assert.equal(list[0].question.id, 'q1');
  // q2 の答え合わせ
  const revealed = live.safeRoom({ ...raw, state: { ...raw.state, phase: 'reveal' } });
  assert.deepEqual(live.pendingRecords(revealed, 'p1', ['q1'], 'prof-a', 'ABCDEF').map(x => [x.question.id, x.correct]), [['q2', false]]);
  // 次の問題（q3）に進んでから戻った: q1・q2 とも入る。q3 は未回答なので入らない
  const later = live.safeRoom({ ...raw, state: { ...raw.state, index: 2, phase: 'show' } });
  assert.deepEqual(live.pendingRecords(later, 'p1', [], 'prof-a', 'ABCDEF').map(x => x.question.id), ['q1', 'q2']);
  // 最終順位（ended）: いまの問題も入る
  const ended = live.safeRoom({ ...raw, state: { ...raw.state, index: 2, phase: 'ended' }, answers: { ...raw.answers, q3: { p1: { choice: 'o1', at: 1 } } } });
  assert.deepEqual(live.pendingRecords(ended, 'p1', new Set(['q1', 'q2']), 'prof-a', 'ABCDEF').map(x => x.question.id), ['q3']);
  // 別の生徒（プロフィール）・別の部屋の処理済みとは区別する（処理済みの一覧は部屋のキーごと）
  const map = { 'prof-b:p1:ABCDEF': { qids: ['q1'], createdAt: 0, savedAt: 0 }, 'prof-a:p1:ZZZZZZ': { qids: ['q1', 'q2'], createdAt: 0, savedAt: 0 } };
  assert.deepEqual(live.pendingRecords(later, 'p1', live.recordedQids(map, live.recordRoomKey('prof-a', 'p1', 'ABCDEF')), 'prof-a', 'ABCDEF').map(x => x.question.id), ['q1', 'q2']);
  // ほかの参加者の回答・選択肢にない答え・ロビーは入らない
  assert.deepEqual(live.pendingRecords(later, 'p9', [], 'prof-a', 'ABCDEF'), []);
  const odd = live.safeRoom({ ...raw, answers: { q1: { p1: { choice: 'zz', at: 1 } } } });
  assert.deepEqual(live.pendingRecords(odd, 'p1', [], 'prof-a', 'ABCDEF'), []);
  const lobby = live.safeRoom({ ...raw, state: { index: -1, phase: 'lobby' } });
  assert.deepEqual(live.pendingRecords(lobby, 'p1', [], 'prof-a', 'ABCDEF'), []);
  assert.deepEqual(live.pendingRecords(null, 'p1', [], 'prof-a', 'ABCDEF'), []);
});

test('処理済みの一覧: addRecorded は部屋ごとに問題 id を足し、ほかの古い部屋を消す。safeRecorded・recordedQids', () => {
  const H24 = live.STALE_MS;
  const now = 1770000000000;
  let map = live.addRecorded(null, 'a:p1:AAAAAA', ['q1', 'q2', 'q1', 3], now - 1000, now);
  assert.deepEqual(map, { 'a:p1:AAAAAA': { qids: ['q1', 'q2'], createdAt: now - 1000, savedAt: now } });
  // 同じ部屋に足す（重複は入れない。createdAt がなければ前の値のまま）
  map = live.addRecorded(map, 'a:p1:AAAAAA', ['q2', 'q3'], null, now + 5);
  assert.deepEqual(map['a:p1:AAAAAA'], { qids: ['q1', 'q2', 'q3'], createdAt: now - 1000, savedAt: now + 5 });
  assert.deepEqual(live.recordedQids(map, 'a:p1:AAAAAA'), ['q1', 'q2', 'q3']);
  assert.deepEqual(live.recordedQids(map, 'a:p1:BBBBBB'), []);
  // ほかの部屋: 作成から 24 時間たったら消す。作成時刻がなければ最後に足してから 7 日
  const old = {
    'a:p1:AAAAAA': { qids: ['q1'], createdAt: now - H24, savedAt: now },             // 24 時間ちょうど → 消す
    'a:p1:BBBBBB': { qids: ['q1'], createdAt: now - H24 + 1, savedAt: now - H24 },  // まだ → 残す
    'a:p1:CCCCCC': { qids: ['q1'], createdAt: null, savedAt: now - live.RECORDED_KEEP_MS },      // 7 日 → 消す
    'a:p1:DDDDDD': { qids: ['q1'], createdAt: null, savedAt: now - live.RECORDED_KEEP_MS + 1 },  // まだ → 残す
    'a:p1:EEEEEE': { qids: 'x', savedAt: now },                                       // 形が崩れている → 落とす
  };
  const next = live.addRecorded(old, 'a:p1:FFFFFF', ['q9'], null, now);
  assert.deepEqual(Object.keys(next).sort(), ['a:p1:BBBBBB', 'a:p1:DDDDDD', 'a:p1:FFFFFF']);
  assert.deepEqual(next['a:p1:FFFFFF'], { qids: ['q9'], createdAt: null, savedAt: now });
  // いまの部屋は 24 時間を過ぎていても消さない
  assert.deepEqual(live.addRecorded(old, 'a:p1:AAAAAA', ['q2'], null, now)['a:p1:AAAAAA'].qids, ['q1', 'q2']);
  assert.equal(old['a:p1:AAAAAA'].qids.length, 1);   // 元を変えない
  // 以前の形（キーの配列）や壊れた値は空の一覧
  assert.deepEqual(live.safeRecorded(['a:p1:AAAAAA:q1']), {});
  assert.deepEqual(live.safeRecorded('x'), {});
  assert.deepEqual(live.recordedQids(['a:p1:AAAAAA:q1'], 'a:p1:AAAAAA'), []);
});

test('pendingRecords + addRecorded: 201 問を反映したあと同じ部屋データを再受信しても、追加の記録はない', () => {
  const N = 201;
  const questions = {};
  const answers = {};
  for (let i = 0; i < N; i++) {
    questions['q' + i] = { ...Q, id: 'q' + i, order: i };
    answers['q' + i] = { p1: { choice: i % 2 ? 'o1' : 'o2', at: 1 } };
  }
  const raw = { meta: { createdAt: 1770000000000 }, questions, state: { index: N - 1, phase: 'ended', startedAt: 0, seconds: 20 }, answers };
  const room = live.safeRoom(raw);
  const roomKey = live.recordRoomKey('prof-a', 'p1', 'ABCDEF');
  let map = {};
  const first = live.pendingRecords(room, 'p1', live.recordedQids(map, roomKey), 'prof-a', 'ABCDEF');
  assert.equal(first.length, N);
  first.forEach(item => { map = live.addRecorded(map, roomKey, [item.qid], room.meta.createdAt, room.meta.createdAt + 1000); });
  map = JSON.parse(JSON.stringify(map));   // sessionStorage を通したのと同じ
  assert.equal(live.recordedQids(map, roomKey).length, N);
  // 同じ部屋データ（得点の更新などで）を何度受け取っても、追加の記録はない
  for (let k = 0; k < 3; k++) {
    assert.deepEqual(live.pendingRecords(live.safeRoom(raw), 'p1', live.recordedQids(map, roomKey), 'prof-a', 'ABCDEF'), []);
  }
});

// ---- 処理済みの状態（nextDoneState・flushState・doneQidsOf） ----

const T0 = 1770000000000;
const RK = 'prof-a:p1:ABCDEF';
const EMPTY = () => ({ memDone: {}, unsavedDone: [], persisted: {} });
function ev(qid, applied, saved) { return { key: RK, qid, createdAt: T0, now: T0 + 1000, result: { applied, saved } }; }

test('nextDoneState: 保存成功は persisted へ、保存失敗は memDone と unsavedDone、applied でなければ何も入れない', () => {
  const s0 = EMPTY();
  const ok = live.nextDoneState(s0, ev('q1', true, true));
  assert.deepEqual(ok.memDone, { [RK]: ['q1'] });
  assert.deepEqual(ok.unsavedDone, []);
  assert.deepEqual(live.recordedQids(ok.persisted, RK), ['q1']);
  assert.equal(ok.persisted[RK].createdAt, T0);
  assert.deepEqual(s0, EMPTY());   // 元を変えない

  const ng = live.nextDoneState(ok, ev('q2', true, false));
  assert.deepEqual(ng.memDone, { [RK]: ['q1', 'q2'] });
  assert.deepEqual(ng.unsavedDone, [{ roomKey: RK, qid: 'q2', createdAt: T0 }]);
  assert.equal(ng.persisted, ok.persisted);   // 書かない
  assert.deepEqual([...live.doneQidsOf(ng, RK)].sort(), ['q1', 'q2']);

  // applied でない（入れなかった・例外）: memDone にも unsavedDone にも入れない。前の分はそのまま
  const skip = live.nextDoneState(ng, ev('q3', false, false));
  assert.deepEqual(skip.memDone, ng.memDone);
  assert.deepEqual(skip.unsavedDone, ng.unsavedDone);
  assert.equal(skip.persisted, ng.persisted);
  // saved だけ true でも applied でなければ入れない
  assert.deepEqual(live.nextDoneState(ng, ev('q3', false, true)).unsavedDone, ng.unsavedDone);
  // 前に入れた問題が applied でないと来ても外さない（もう記録のメモリにある）
  assert.deepEqual(live.nextDoneState(ng, ev('q2', false, false)).memDone, ng.memDone);

  // 次の保存成功で、前に失敗した q2 もいっしょに persisted へ
  const ok2 = live.nextDoneState(ng, ev('q4', true, true));
  assert.deepEqual(ok2.unsavedDone, []);
  assert.deepEqual(live.recordedQids(ok2.persisted, RK), ['q1', 'q2', 'q4']);

  // 崩れた引数でも例外なし
  assert.deepEqual(live.nextDoneState(null, null), { memDone: {}, unsavedDone: [], persisted: undefined });
  assert.deepEqual(live.nextDoneState(EMPTY(), { key: RK, result: { applied: true, saved: true } }).memDone, {});
});

test('nextDoneState: 同じ問題を何度通しても memDone・unsavedDone・persisted に 1 つだけ', () => {
  let s = EMPTY();
  s = live.nextDoneState(s, ev('q1', true, false));
  s = live.nextDoneState(s, ev('q1', true, false));
  assert.deepEqual(s.memDone, { [RK]: ['q1'] });
  assert.equal(s.unsavedDone.length, 1);
  s = live.nextDoneState(s, ev('q1', true, true));
  s = live.nextDoneState(s, ev('q1', true, true));
  assert.deepEqual(s.memDone, { [RK]: ['q1'] });
  assert.deepEqual(s.unsavedDone, []);
  assert.deepEqual(live.recordedQids(s.persisted, RK), ['q1']);
});

test('flushState: unsavedDone を部屋ごとに persisted へ足して空に。空なら persisted はそのまま', () => {
  const persisted = live.addRecorded({}, RK, ['q1'], T0, T0);
  const other = 'prof-b:p2:GHJKLM';
  const list = [{ roomKey: RK, qid: 'q2', createdAt: T0 }, { roomKey: other, qid: 'q1', createdAt: null }, { roomKey: RK, qid: 'q2', createdAt: T0 }];
  const f = live.flushState({ unsavedDone: list, persisted }, T0 + 5);
  assert.deepEqual(f.unsavedDone, []);
  assert.deepEqual(live.recordedQids(f.persisted, RK), ['q1', 'q2']);
  assert.deepEqual(live.recordedQids(f.persisted, other), ['q1']);
  assert.deepEqual(live.recordedQids(persisted, RK), ['q1']);   // 元を変えない
  const same = live.flushState({ unsavedDone: [], persisted }, T0);
  assert.equal(same.persisted, persisted);
  assert.deepEqual(same.unsavedDone, []);
});

// 生徒の画面（recordAnswers・保存の成功の通知・読み込み直し）と app の記録・保存を、純粋関数だけでまねる
function simulator() {
  const sim = {
    mem: {},          // 記録のメモリ: 問題 id → 入れた回数
    stored: {},       // 保存できた記録（localStorage）
    session: {},      // sessionStorage の処理済み（JSON を通す）
    memDone: {}, unsavedDone: [],
    saveOk: true, throwOnRecord: false, applyOk: true,
  };
  function state() { return { memDone: sim.memDone, unsavedDone: sim.unsavedDone, persisted: JSON.parse(JSON.stringify(sim.session)) }; }
  function setState(s) { sim.memDone = s.memDone; sim.unsavedDone = s.unsavedDone; sim.session = JSON.parse(JSON.stringify(s.persisted || {})); }
  // app.save: 成功したら記録をまるごと保存し、通知（flushState）
  sim.save = () => {
    if (!sim.saveOk) return false;
    sim.stored = { ...sim.mem };
    setState({ ...state(), ...live.flushState(state(), T0 + 2000) });
    return true;
  };
  sim.record = (qid) => {
    if (sim.throwOnRecord) throw new Error('boom');
    if (!sim.applyOk) return { applied: false, saved: false };
    sim.mem[qid] = (sim.mem[qid] || 0) + 1;
    return { applied: true, saved: sim.save() };
  };
  sim.receive = (room) => {
    live.pendingRecords(room, 'p1', live.doneQidsOf(state(), RK), 'prof-a', 'ABCDEF').forEach((item) => {
      let result = { applied: false, saved: false };
      try { result = sim.record(item.qid); } catch (e) { result = { applied: false, saved: false }; }
      setState(live.nextDoneState(state(), { key: RK, qid: item.qid, createdAt: T0, now: T0 + 1000, result }));
    });
  };
  // 読み込み直し: 記録は保存できた分だけ、メモリの処理済みは消える、sessionStorage は残る
  sim.reload = () => { sim.mem = { ...sim.stored }; sim.memDone = {}; sim.unsavedDone = []; };
  sim.done = () => live.doneQidsOf(state(), RK);
  return sim;
}

function roomUpTo(n, phase) {
  const questions = {};
  const answers = {};
  for (let i = 0; i < 4; i++) {
    questions['q' + i] = { ...Q, id: 'q' + i, order: i };
    answers['q' + i] = { p1: { choice: 'o1', at: 1 } };
  }
  return live.safeRoom({ meta: { createdAt: T0 }, questions, state: { index: n, phase, startedAt: 0, seconds: 20 }, answers });
}

test('処理済みのつなぎこみ: 保存成功・失敗・applied でない・例外・ライブ以外の保存の成功で、二重加算も取りこぼしもない', () => {
  const sim = simulator();
  // q0: 保存成功。再受信しても入らない
  sim.receive(roomUpTo(0, 'reveal'));
  sim.receive(roomUpTo(0, 'reveal'));
  assert.deepEqual(sim.stored, { q0: 1 });
  // q1: 保存失敗（メモリには入る）→ 再受信しても二重に入らない
  sim.saveOk = false;
  sim.receive(roomUpTo(1, 'reveal'));
  sim.receive(roomUpTo(1, 'reveal'));
  assert.deepEqual(sim.mem, { q0: 1, q1: 1 });
  assert.deepEqual(sim.stored, { q0: 1 });
  assert.deepEqual(live.recordedQids(sim.session, RK), ['q0']);
  // ライブ以外の保存（設定の変更など）が成功 → q1 も保存され、sessionStorage にも書く
  sim.saveOk = true;
  assert.equal(sim.save(), true);
  assert.deepEqual(sim.stored, { q0: 1, q1: 1 });
  assert.deepEqual(live.recordedQids(sim.session, RK), ['q0', 'q1']);
  // 読み込み直して同じ部屋に入り直しても、二重に入らない
  sim.reload();
  sim.receive(roomUpTo(1, 'reveal'));
  assert.deepEqual(sim.mem, { q0: 1, q1: 1 });
  // q2: 例外 → 処理済みにならず、次の受信で取り直す（取りこぼさない）
  sim.throwOnRecord = true;
  sim.receive(roomUpTo(2, 'reveal'));
  assert.deepEqual(sim.mem, { q0: 1, q1: 1 });
  assert.equal(sim.done().has('q2'), false);
  sim.throwOnRecord = false;
  // q2: applied でない（生徒がちがうなど）→ 処理済みにならない
  sim.applyOk = false;
  sim.receive(roomUpTo(2, 'reveal'));
  assert.equal(sim.mem.q2, undefined);
  assert.equal(sim.done().has('q2'), false);
  sim.applyOk = true;
  sim.receive(roomUpTo(2, 'reveal'));
  sim.receive(roomUpTo(2, 'reveal'));
  assert.deepEqual(sim.stored, { q0: 1, q1: 1, q2: 1 });
  // q3: 保存失敗のまま読み込み直す → 記録から消えているので取り直し、1 回だけ入る
  sim.saveOk = false;
  sim.receive(roomUpTo(3, 'ended'));
  assert.equal(sim.mem.q3, 1);
  sim.reload();
  assert.equal(sim.mem.q3, undefined);
  assert.equal(sim.done().has('q3'), false);
  sim.saveOk = true;
  sim.receive(roomUpTo(3, 'ended'));
  sim.receive(roomUpTo(3, 'ended'));
  sim.reload();
  sim.receive(roomUpTo(3, 'ended'));
  assert.deepEqual(sim.mem, { q0: 1, q1: 1, q2: 1, q3: 1 });
  assert.deepEqual(sim.stored, { q0: 1, q1: 1, q2: 1, q3: 1 });
  assert.deepEqual(live.recordedQids(sim.session, RK), ['q0', 'q1', 'q2', 'q3']);
});
