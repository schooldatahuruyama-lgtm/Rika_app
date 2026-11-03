// tests/session.test.js
// 1 回の学習（クエスト）の進行と、誤答時の学び直しの分岐
// fixture: s-a1（概念 c-a、basic なし）、s-a2（概念 c-b、basic c-a。basic の解説は s-a1）、s-b1（概念 c-c、basic c-b）
const test = require('node:test'); const assert = require('node:assert/strict');
const S = require('../js/session.js');
const cr = require('../js/content-registry.js');
const record = require('../js/record.js');
const xp = require('../js/xp.js');
const config = require('../js/config.js');
const { unit } = require('./fixtures/unit.js');

const reg = cr.createRegistry(); reg.register(unit);
// 端末ローカルの日時（時差に左右されないようにする）
const NOW = new Date(2026, 10, 4, 10, 0);

// ---- 解答を作る小道具 ----
function rightAnswer(p) {
  if (p.type === 'fill') return { b1: p.blanks[0].answer };
  return p.answer;   // choice / figure-choice
}
function wrongAnswer(p) {
  if (p.type === 'choice') return p.options.find(o => o.id !== p.answer).id;
  if (p.type === 'fill') return { b1: p.blanks[0].options.find(w => w !== p.blanks[0].answer) };
  return 'r-none';   // figure-choice: ない場所を選ぶ（判定は不正解）
}
const kinds = (events) => events.map(e => e.kind);
const count = (events, kind) => events.filter(e => e.kind === kind).length;

// セッションを動かす小道具。events はすべての呼び出しの events をためる
function drive(session) {
  const d = { s: session, events: [], answered: [] };
  d.view = () => S.current(d.s, reg);
  d.ans = (ok) => {
    const v = d.view();
    assert.equal(v.kind, 'problem', '問題の画面で答える');
    const r = S.answer(d.s, reg, ok ? rightAnswer(v.problem) : wrongAnswer(v.problem), config);
    assert.equal(r.invalid, false);
    assert.equal(r.correct, ok);
    d.s = r.session; d.events.push(...r.events);
    d.answered.push({ id: v.problem.id, phase: v.phase, correct: ok, events: r.events });
    return r;
  };
  d.next = () => { const r = S.next(d.s, reg, config); d.s = r.session; d.events.push(...r.events); return r; };
  d.step = (ok) => { const r = d.ans(ok); d.next(); return r; };   // 答えてフィードバックを閉じる
  d.choose = (c) => { const r = S.choose(d.s, reg, c, config); d.s = r.session; d.events.push(...r.events); return r; };
  // 解説カードを最後まで読む（読んだカード id を返す）
  d.readLessons = () => { const ids = []; while (d.view().kind === 'lesson') { ids.push(d.view().card.id); d.next(); } return ids; };
  return d;
}

// 方針にしたがって最後まで進める。policy.main は main の正誤の列。retry/check/review の正誤と offer の答えも決める
function play(session, policy) {
  const d = drive(session);
  let mi = 0;
  for (let guard = 0; guard < 200; guard++) {
    const v = d.view();
    if (v.kind === 'ended') return d;
    if (v.kind === 'lesson') d.next();
    else if (v.kind === 'offer') d.choose(policy.offer || 'accept');
    else if (v.kind === 'feedback') d.next();
    else if (v.phase === 'main') d.step(policy.main[mi++]);
    else if (v.phase === 'warmup') d.step(policy.warmup !== false);
    else d.step(policy[v.phase] !== undefined ? policy[v.phase] : true);
  }
  throw new Error('終わらない');
}

function stageSession(stageId, mode, rec) {
  return S.startStage(reg, rec || record.createRecord(), stageId, mode || 'problem', NOW, config);
}

test('lesson モード: lessons → warmup → problems → ended completed', () => {
  const d = drive(stageSession('s-a1', 'lesson'));
  assert.deepEqual(d.view(), { kind: 'lesson', card: unit.areas[0].stages[0].lessons[0], index: 0, total: 2 });
  assert.deepEqual(d.readLessons(), ['card-a1-1', 'card-a1-2']);
  const w = d.view();
  assert.equal(w.kind, 'problem'); assert.equal(w.problem.id, 'p-a1-w'); assert.equal(w.phase, 'warmup');
  d.step(true);
  const seen = [];
  while (d.view().kind === 'problem') { const v = d.view(); seen.push(v.problem.id + ':' + v.phase); d.step(true); }
  assert.deepEqual(seen, ['p-a1-1:main', 'p-a1-2:main', 'p-a1-3:main', 'p-a1-4:main']);
  assert.deepEqual(d.view(), { kind: 'ended', reason: 'completed' });
  assert.equal(d.s.ended, 'completed');
});

test('problem モード: 最初から problems', () => {
  const s = stageSession('s-a2', 'problem');
  const v = S.current(s, reg);
  assert.equal(v.kind, 'problem'); assert.equal(v.problem.id, 'p-a2-1'); assert.equal(v.phase, 'main');
  assert.equal(s.queue.length, 4);
  assert.equal(s.kind, 'stage'); assert.equal(s.stageId, 's-a2'); assert.equal(s.mode, 'problem');
  assert.equal(s.index, 0); assert.equal(s.pending, null); assert.equal(s.learnback, null); assert.equal(s.ended, null);
  assert.deepEqual(s.usedProblemIds, ['p-a2-1', 'p-a2-2', 'p-a2-3', 'p-a2-4']);
  assert.match(s.id, /^s-\d+-[a-z0-9]{4}$/);
  assert.equal(s.startedAt, NOW.toISOString());
});

test('全問正解: events に firstTry が main の数だけ、最後に stageClear。stars は 3', () => {
  const d = play(stageSession('s-a1'), { main: [true, true, true, true] });
  assert.equal(count(d.events, 'firstTry'), 4);
  assert.equal(count(d.events, 'answer'), 4);
  assert.equal(count(d.events, 'correct'), 4);
  assert.equal(count(d.events, 'stageClear'), 1);
  assert.equal(d.events[d.events.length - 1].kind, 'stageClear');
  const sum = S.summary(d.s, reg, config);
  assert.deepEqual(sum, { mainCount: 4, firstTryCount: 4, stars: 3, improvedConcepts: [], suggestedConcept: null, ended: 'completed' });
});

test('main 誤答 → 同じ概念の類題が次に出る → 正解で retryCorrect と mastery later', () => {
  const d = drive(stageSession('s-a1'));
  const r1 = d.ans(false);
  // 誤答: 経験値は answer だけ。理解度は wrong。history には session の id と挑戦の番号が入る
  assert.deepEqual(kinds(r1.events), ['history', 'answer', 'mastery']);
  assert.deepEqual(r1.events[0], { kind: 'history', sessionId: d.s.id, attempt: 1, stageId: 's-a1', problemId: 'p-a1-1', conceptId: 'c-a', correct: false, phase: 'main' });
  assert.deepEqual(r1.events[2], { kind: 'mastery', conceptId: 'c-a', change: 'wrong' });
  assert.equal(d.s.missStreak['c-a'], 1);
  d.next();
  const v = d.view();
  assert.equal(v.problem.id, 'p-a1-r1'); assert.equal(v.phase, 'retry'); assert.equal(v.problem.concept, 'c-a');
  const r2 = d.ans(true);
  assert.deepEqual(kinds(r2.events), ['history', 'answer', 'correct', 'retryCorrect', 'mastery']);
  assert.deepEqual(r2.events[4], { kind: 'mastery', conceptId: 'c-a', change: 'later' });
  assert.equal(d.s.missStreak['c-a'], 0);
  d.next();
  assert.equal(d.view().problem.id, 'p-a1-2');
  assert.ok(d.s.usedProblemIds.includes('p-a1-r1'));
  // 類題の正解は summary の improvedConcepts に入る
  assert.deepEqual(S.summary(d.s, reg, config).improvedConcepts, ['c-a']);
});

test('解答後は current が feedback、next で進む。pending 中の answer は invalid で events 空', () => {
  const s0 = stageSession('s-a1');
  const p = reg.problem('p-a1-1');
  const r = S.answer(s0, reg, rightAnswer(p), config);
  assert.equal(r.correct, true); assert.equal(r.invalid, false);
  assert.deepEqual(r.feedback, { explanation: p.explanation, hint: p.hint });
  // 元の session は変わらない
  assert.equal(s0.pending, null); assert.equal(s0.results.main.length, 0);
  assert.deepEqual(S.current(r.session, reg), { kind: 'feedback', problem: p, correct: true, feedback: { explanation: p.explanation, hint: p.hint }, phase: 'main' });
  const again = S.answer(r.session, reg, rightAnswer(p), config);
  assert.equal(again.invalid, true); assert.deepEqual(again.events, []); assert.equal(again.session, r.session);
  const n = S.next(r.session, reg, config);
  assert.deepEqual(n.events, []);
  assert.equal(n.session.pending, null);
  assert.equal(S.current(n.session, reg).problem.id, 'p-a1-2');
  // 問題の画面で next を呼んでも進まない（答えないと進めない）
  const n2 = S.next(n.session, reg, config);
  assert.equal(n2.session.index, n.session.index); assert.deepEqual(n2.events, []);
});

test('類題も誤答 → offer が出る → accept → check 2 問正解 → main に戻り learnback', () => {
  const d = drive(stageSession('s-a2'));
  d.step(false);
  assert.equal(d.view().phase, 'retry');
  d.ans(false);
  assert.equal(d.s.missStreak['c-b'], 2);
  d.next();
  const offer = d.view();
  assert.equal(offer.kind, 'offer');
  assert.equal(offer.concept.id, 'c-b'); assert.equal(offer.basic.id, 'c-a');
  // offer は next では飛ばせない
  const skip = S.next(d.s, reg, config);
  assert.equal(skip.session.index, d.s.index); assert.deepEqual(skip.events, []);
  const c = d.choose('accept');
  assert.deepEqual(c.events, []);
  assert.deepEqual(d.s.learnbackRounds, { 'c-a': 1 });
  assert.equal(d.s.learnback.conceptId, 'c-b'); assert.equal(d.s.learnback.basicId, 'c-a');
  assert.equal(d.s.learnback.round, 1); assert.equal(d.s.learnback.recheck, false);
  const k1 = d.view();
  assert.equal(k1.phase, 'check'); assert.equal(k1.problem.concept, 'c-a');
  const r1 = d.step(true);
  assert.equal(count(r1.events, 'learnback'), 0);
  const k2 = d.view();
  assert.equal(k2.phase, 'check'); assert.notEqual(k2.problem.id, k1.problem.id);
  const r2 = d.ans(true);
  assert.equal(count(r2.events, 'learnback'), 1);
  assert.equal(d.s.learnback, null);
  d.next();
  const back = d.view();
  assert.equal(back.problem.id, 'p-a2-2'); assert.equal(back.phase, 'main');
  // 確認問題は usedProblemIds に入れない
  assert.ok(!d.s.usedProblemIds.includes(k1.problem.id));
  assert.deepEqual(S.summary(d.s, reg, config).improvedConcepts, ['c-a']);
});

test('check の 1 問目誤答・2 問目正解 → basic の lessons（lessonRead あり）→ 再確認 1 問 → 正解で main に戻り learnback は 1 回', () => {
  const d = drive(stageSession('s-a2'));
  d.step(false); d.step(false); d.choose('accept');
  const k1 = d.view().problem.id;
  d.step(false);
  const k2 = d.view().problem.id;
  const r = d.step(true);
  assert.equal(count(r.events, 'learnback'), 0);
  assert.equal(d.s.learnback.recheck, true);
  // basic（c-a）の解説は s-a1 のカード
  const v = d.view();
  assert.equal(v.kind, 'lesson'); assert.equal(v.card.id, 'card-a1-1'); assert.equal(v.index, 0); assert.equal(v.total, 2);
  assert.deepEqual(d.next().events, []);
  assert.deepEqual(d.next().events, [{ kind: 'lessonRead', lessonStageId: 's-a1' }]);
  // 自分のステージの解説ではないので session.lessonRead は false のまま
  assert.equal(d.s.lessonRead, false);
  const re = d.view();
  assert.equal(re.phase, 'check');
  // 再確認はこの回でまだ出していない問題（プール 3 問なので出せる）
  assert.ok(re.problem.id !== k1 && re.problem.id !== k2);
  const rr = d.ans(true);
  assert.equal(count(rr.events, 'learnback'), 1);
  assert.equal(d.s.learnback, null);
  d.next();
  assert.equal(d.view().problem.id, 'p-a2-2');
  assert.equal(count(d.events, 'learnback'), 1);
});

test('check 2 問目誤答 → lessons → 再確認 → 誤答で ended stopped、learnback は 1 回', () => {
  const d = drive(stageSession('s-a2'));
  d.step(false); d.step(false); d.choose('accept');
  d.step(true); d.step(false);
  assert.deepEqual(d.readLessons(), ['card-a1-1', 'card-a1-2']);
  assert.equal(d.view().phase, 'check');
  const r = d.ans(false);
  assert.equal(count(r.events, 'learnback'), 1);
  assert.equal(d.s.ended, 'stopped');
  // フィードバックが先に出て、next のあと終わりの画面
  assert.equal(d.view().kind, 'feedback');
  const n = d.next();
  assert.deepEqual(n.events, []);
  assert.deepEqual(d.view(), { kind: 'ended', reason: 'stopped' });
  assert.equal(count(d.events, 'learnback'), 1);
  assert.equal(count(d.events, 'stageClear'), 0);
  // 終わったあとは答えられない
  const after = S.answer(d.s, reg, 'o1', config);
  assert.equal(after.invalid, true); assert.deepEqual(after.events, []);
  assert.equal(S.summary(d.s, reg, config).ended, 'stopped');
});

test('同じ basic へ 2 回戻っても確認問題が 2 問確保できる（checkPool 3 問で round 2）。再出題された確認問題の 2 回目は history と mastery だけで answer/correct を出さない', () => {
  const d = drive(stageSession('s-a2'));
  // 1 回目の学び直し
  d.step(false); d.step(false); d.choose('accept');
  const round1 = [d.view().problem.id]; d.step(true);
  round1.push(d.view().problem.id); d.step(true);
  assert.equal(d.view().problem.id, 'p-a2-2');
  // 2 回目の学び直し
  d.step(false);
  assert.equal(d.view().problem.id, 'p-a2-r2');
  d.step(false);
  assert.equal(d.view().kind, 'offer');
  d.choose('accept');
  assert.deepEqual(d.s.learnbackRounds, { 'c-a': 2 });
  assert.equal(d.s.learnback.round, 2);
  const round2 = [];
  const r2events = [];
  for (let i = 0; i < 2; i++) {
    const v = d.view();
    assert.equal(v.phase, 'check');
    round2.push(v.problem.id);
    r2events.push(d.step(true).events);
  }
  assert.notEqual(round2[0], round2[1]);
  let reused = 0;
  round2.forEach((id, i) => {
    const ks = kinds(r2events[i]).filter(k => k !== 'learnback');
    if (round1.includes(id)) { reused++; assert.deepEqual(ks, ['history', 'mastery']); }
    else assert.deepEqual(ks, ['history', 'answer', 'correct', 'mastery']);
  });
  assert.ok(reused >= 1);
  assert.equal(count(d.events, 'learnback'), 2);
  assert.equal(d.view().problem.id, 'p-a2-3');
});

test('warmup の正誤は answer/correct/mastery を出さない', () => {
  for (const ok of [true, false]) {
    const d = drive(stageSession('s-a1', 'lesson'));
    d.readLessons();
    const r = d.ans(ok);
    assert.deepEqual(r.events, [{ kind: 'history', sessionId: d.s.id, attempt: 1, stageId: 's-a1', problemId: 'p-a1-w', conceptId: 'c-a', correct: ok, phase: 'warmup' }]);
    d.next();
    // 予想を外しても類題は出ない
    assert.equal(d.view().problem.id, 'p-a1-1');
    assert.equal(d.view().phase, 'main');
    assert.deepEqual(d.s.missStreak, {});
  }
});

test('星: main 5 問中 2 問正解（40%）で ★、3 問（60%）で ★★、4 問（80%）と 5 問で ★★★。4 問中 2 問（50% ちょうど）は ★★。類題・確認問題の正誤は星に影響しない', () => {
  // fixture は 4 問なので、しきい値（50% 未満 ★、80% 未満 ★★、80% 以上 ★★★）を 4 問で確かめる
  const stars = (stageId, main, extra) => S.summary(play(stageSession(stageId), Object.assign({ main }, extra)).s, reg, config).stars;
  assert.equal(stars('s-a1', [true, false, false, false]), 1);         // 25%
  assert.equal(stars('s-a1', [true, true, false, false]), 2);          // 50% ちょうど
  assert.equal(stars('s-a1', [true, true, true, false]), 2);           // 75%
  assert.equal(stars('s-a1', [true, true, true, true]), 3);            // 100%
  // 類題の正誤（basic なし: 類題も誤答なら解説を見て続行）
  assert.equal(stars('s-a1', [true, true, false, false], { retry: true }), 2);
  assert.equal(stars('s-a1', [true, true, false, false], { retry: false }), 2);
  // 確認問題（類題を誤答して学び直しへ。確認問題はすべて正解）
  const withCheck = play(stageSession('s-a2'), { main: [true, true, true, false], retry: false, check: true });
  assert.ok(withCheck.answered.some(a => a.phase === 'check'));
  assert.equal(S.summary(withCheck.s, reg, config).stars, 2);
  assert.equal(stars('s-a2', [true, true, true, false], { retry: true }), 2);
  // 5 問の場合のしきい値（summary は results.main だけを見る）
  const five = (n) => S.summary(Object.assign(stageSession('s-a1'), { results: { main: [0, 1, 2, 3, 4].map(i => ({ problemId: 'p-a1-1', correct: i < n })), retry: [], check: [], review: [] } }), reg, config).stars;
  assert.deepEqual([2, 3, 4, 5].map(five), [1, 2, 3, 3]);
  // main が 0 問なら星 0
  assert.equal(S.summary(stageSession('s-a1'), reg, config).stars, 0);
  // 星の数は config.stars から決まる
  const custom = Object.assign({}, config, { stars: [[0.3, 1], [1.01, 2]] });
  const two = play(stageSession('s-a1'), { main: [true, true, false, false] }).s;
  assert.equal(S.summary(two, reg, custom).stars, 2);
});

test('stageClear は最後の feedback の next で出る。lessonRead は最後のカードの next で出る', () => {
  const d = drive(stageSession('s-a1', 'lesson'));
  assert.deepEqual(d.next().events, []);
  assert.equal(d.s.lessonRead, false);
  assert.deepEqual(d.next().events, [{ kind: 'lessonRead', lessonStageId: 's-a1' }]);
  assert.equal(d.s.lessonRead, true);
  d.step(true);
  for (let i = 0; i < 3; i++) d.step(true);
  const last = d.ans(true);
  assert.equal(count(last.events, 'stageClear'), 0);
  assert.equal(d.s.ended, null);
  const n = d.next();
  assert.deepEqual(n.events, [{ kind: 'stageClear' }]);
  assert.equal(d.s.ended, 'completed');
  // 終わったあとの next は何もしない
  const n2 = S.next(d.s, reg, config);
  assert.deepEqual(n2.events, []); assert.equal(n2.session.ended, 'completed');
});

test('offer を later → main に戻り、summary.suggestedConcept が basic', () => {
  const d = drive(stageSession('s-a2'));
  d.step(false); d.step(false);
  assert.equal(d.view().kind, 'offer');
  const c = d.choose('later');
  assert.deepEqual(c.events, []);
  assert.equal(d.s.learnback, null);
  assert.equal(d.view().problem.id, 'p-a2-2');
  const rest = play(d.s, { main: [true, true, true] });
  const sum = S.summary(rest.s, reg, config);
  assert.equal(sum.suggestedConcept, 'c-a');
  assert.equal(sum.ended, 'completed');
  assert.equal(count(rest.events, 'learnback'), 0);
  // offer が最後の step のとき、あとでを選ぶとそこでステージを終える（stageClear はこの choose で出る）
  const lastOffer = drive(stageSession('s-a2'));
  [true, true, true].forEach(ok => lastOffer.step(ok));
  lastOffer.step(false); lastOffer.step(false);
  assert.equal(lastOffer.view().kind, 'offer');
  const end = lastOffer.choose('later');
  assert.deepEqual(end.events, [{ kind: 'stageClear' }]);
  assert.deepEqual(lastOffer.view(), { kind: 'ended', reason: 'completed' });
  // offer でないときの choose は何もしない
  const none = S.choose(rest.s, reg, 'accept', config);
  assert.equal(none.session, rest.s); assert.deepEqual(none.events, []);
});

test('basic のない概念で 2 回誤答 → lessons が挿入されて続行', () => {
  const d = drive(stageSession('s-a1'));
  d.step(false); d.step(false);
  assert.equal(d.s.missStreak['c-a'], 2);
  const v = d.view();
  assert.equal(v.kind, 'lesson'); assert.equal(v.total, 2);
  const before = d.events.length;
  assert.deepEqual(d.readLessons(), ['card-a1-1', 'card-a1-2']);
  // この解説では lessonRead を出さない
  assert.equal(count(d.events.slice(before), 'lessonRead'), 0);
  assert.equal(d.s.lessonRead, false);
  assert.equal(d.view().problem.id, 'p-a1-2'); assert.equal(d.view().phase, 'main');
});

test('類題プールが尽きたら挿入せず続行', () => {
  const d = drive(stageSession('s-a1'));
  d.step(false); assert.equal(d.view().problem.id, 'p-a1-r1'); d.step(true);
  d.step(false); assert.equal(d.view().problem.id, 'p-a1-r2'); d.step(true);
  const r = d.ans(false);   // p-a1-3。もう類題がない
  assert.equal(r.feedback.explanation, reg.problem('p-a1-3').explanation);
  d.next();
  assert.equal(d.view().problem.id, 'p-a1-4'); assert.equal(d.view().phase, 'main');
  assert.deepEqual(d.s.usedProblemIds, ['p-a1-1', 'p-a1-2', 'p-a1-3', 'p-a1-4', 'p-a1-r1', 'p-a1-r2']);
});

test('クリア済みステージの再挑戦は xpMultiplier 0.5', () => {
  const fresh = stageSession('s-a1');
  assert.equal(fresh.xpMultiplier, 1); assert.equal(fresh.attempt, 1);
  const cleared = record.finishStage(record.createRecord(), { stageId: 's-a1', stars: 3, cleared: true }, NOW);
  const again = stageSession('s-a1', 'problem', cleared);
  assert.equal(again.xpMultiplier, config.repeatMultiplier);
  assert.equal(again.attempt, 2);
  const r = S.answer(again, reg, 'o1', config);
  assert.equal(r.events[0].attempt, 2);
  // 途中（inprogress）なら全額
  const paused = record.finishStage(record.createRecord(), { stageId: 's-a1', cleared: false }, NOW);
  assert.equal(stageSession('s-a1', 'problem', paused).xpMultiplier, 1);
});

test('startReview: 3 問、retryPool 優先、同じ日の 2 回目は 0.5', () => {
  const rec = record.createRecord();
  const s = S.startReview(reg, rec, 'c-a', NOW, config);
  assert.equal(s.kind, 'review'); assert.equal(s.stageId, null); assert.equal(s.conceptId, 'c-a'); assert.equal(s.attempt, 0);
  assert.equal(s.xpMultiplier, 1);
  assert.deepEqual(s.queue.map(q => q.problemId), ['p-a1-r1', 'p-a1-r2', 'p-ca-k1']);
  assert.ok(s.queue.every(q => q.kind === 'problem' && q.phase === 'review'));
  assert.equal(s.queue.length, config.review.problemCount);
  const today = record.markReviewDone(rec, 'c-a', xp.localDate(NOW));
  assert.equal(S.startReview(reg, today, 'c-a', NOW, config).xpMultiplier, config.repeatMultiplier);
  const yesterday = record.markReviewDone(rec, 'c-a', xp.localDate(new Date(2026, 10, 3, 10, 0)));
  assert.equal(S.startReview(reg, yesterday, 'c-a', NOW, config).xpMultiplier, 1);
  // 復習では誤答してもフィードバックだけ（類題・学び直しなし）。最後まで行っても stageClear は出ない
  const d = drive(s);
  const r = d.ans(false);
  assert.deepEqual(kinds(r.events), ['history', 'answer', 'mastery']);
  assert.equal(r.events[0].phase, 'review'); assert.equal(r.events[0].stageId, null); assert.equal(r.events[0].attempt, 0);
  d.next();
  assert.equal(d.view().problem.id, 'p-a1-r2');
  const ok = d.ans(true);
  assert.deepEqual(kinds(ok.events), ['history', 'answer', 'correct', 'mastery']);
  assert.equal(ok.events[3].change, 'later');
  d.next(); d.step(true);
  assert.deepEqual(d.view(), { kind: 'ended', reason: 'completed' });
  assert.equal(count(d.events, 'stageClear'), 0);
});

test('invalid な解答は session を変えず events が空', () => {
  const s = stageSession('s-a1');
  const r = S.answer(s, reg, null, config);
  assert.equal(r.invalid, true); assert.equal(r.correct, false);
  assert.deepEqual(r.events, []); assert.equal(r.session, s);
  // 空らんが未記入の穴埋め
  const d = drive(s); d.step(true);
  assert.equal(d.view().problem.type, 'fill');
  const f = S.answer(d.s, reg, {}, config);
  assert.equal(f.invalid, true); assert.deepEqual(f.events, []); assert.equal(f.session, d.s);
  // 解説カードの画面で answer を呼んでも invalid
  const lesson = stageSession('s-a1', 'lesson');
  const l = S.answer(lesson, reg, 'o1', config);
  assert.equal(l.invalid, true); assert.equal(l.session, lesson);
});

test('session は JSON.stringify → parse しても current が同じ', () => {
  const roundTrip = (s) => JSON.parse(JSON.stringify(s));
  const d = drive(stageSession('s-a2', 'lesson'));
  const checkpoints = [];
  const check = () => { checkpoints.push(d.view().kind); assert.deepEqual(S.current(roundTrip(d.s), reg), d.view()); };
  check();                                   // lesson
  d.readLessons(); check();                  // warmup
  d.step(true); d.ans(false); check();       // feedback
  d.next(); d.ans(false); d.next(); check(); // offer
  d.choose('accept'); check();               // check
  d.step(false); d.step(true); check();      // basic の lesson
  // 保存して読み戻した session から最後まで続けられる
  const rest = play(roundTrip(d.s), { main: [true, true, true], check: true });
  assert.equal(rest.s.ended, 'completed');
  assert.equal(count(rest.events, 'stageClear'), 1);
  assert.deepEqual(checkpoints, ['lesson', 'problem', 'feedback', 'offer', 'problem', 'lesson']);
});
