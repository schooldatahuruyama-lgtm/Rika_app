// 1 回の学習（クエスト）の進行と、誤答時の学び直しの分岐（設計書 4.2〜4.7）
// session は JSON にできる形（record.stages[id].resume に保存する）。そのため queue には
// 教材のオブジェクトではなく id を入れ、current() で教材を引いて画面用の view に組み立てる。
//   step = { kind: 'lesson', cardId, lessonStageId, emitRead }
//        | { kind: 'warmup'|'problem', problemId, phase, recheck? }
//        | { kind: 'offer', conceptId, basicId }
// 関数はすべて元の session を変えず、新しい session を返す。
(function (root) {
  'use strict';

  const judgeApi = typeof require === 'function' ? require('./judge.js') : root.RikaQuest.judge;
  const xp = typeof require === 'function' ? require('./xp.js') : root.RikaQuest.xp;
  const recordApi = typeof require === 'function' ? require('./record.js') : root.RikaQuest.record;

  function list(x) { return Array.isArray(x) ? x : []; }
  function toDate(now) {
    return now === undefined || now === null ? new Date() : now instanceof Date ? now : new Date(now);
  }
  // session は JSON にできる形なので、丸ごと複製して変える（元を変えないため）
  function copy(session) { return JSON.parse(JSON.stringify(session)); }

  function newSessionId(now) {
    return 's-' + toDate(now).getTime() + '-' + Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  }

  function lessonSteps(reg, lessonStageId, emitRead) {
    const stage = reg.stage(lessonStageId);
    return list(stage && stage.lessons).map(c => ({ kind: 'lesson', cardId: c.id, lessonStageId, emitRead }));
  }

  function problemStep(problemId, phase, extra) {
    return Object.assign({ kind: 'problem', problemId, phase }, extra);
  }

  function baseSession(fields) {
    return Object.assign({
      id: null, kind: 'stage', stageId: null, conceptId: null, attempt: 0, mode: 'problem', startedAt: null,
      xpMultiplier: 1, queue: [], index: 0, usedProblemIds: [], missStreak: {},
      pending: null, learnback: null, learnbackRounds: {}, awardedProblemIds: [],
      results: { main: [], retry: [], check: [], review: [] }, lessonRead: false, ended: null, suggestedConcept: null,
    }, fields);
  }

  // ---- 始める ----

  function startStage(reg, record, stageId, mode, now, config) {
    const stage = reg.stage(stageId);
    if (!stage) throw new Error('ステージ ' + stageId + ' がありません');
    const state = recordApi.stageState(record || recordApi.createRecord(), stageId);
    const queue = [];
    if (mode === 'lesson') {
      queue.push(...lessonSteps(reg, stageId, true));
      if (stage.warmup) queue.push({ kind: 'warmup', problemId: stage.warmup.id, phase: 'warmup' });
    }
    const mainIds = list(stage.problems).map(p => p.id);
    mainIds.forEach(id => queue.push(problemStep(id, 'main')));
    return baseSession({
      id: newSessionId(now), kind: 'stage', stageId, attempt: state.attempts + 1,
      mode: mode === 'lesson' ? 'lesson' : 'problem', startedAt: toDate(now).toISOString(),
      xpMultiplier: state.status === 'cleared' ? config.repeatMultiplier : 1,
      queue, usedProblemIds: mainIds.slice(),
    });
  }

  // 復習: その概念の類題（ステージの順）を先に、足りなければ確認問題から。誤答してもフィードバックだけ
  function startReview(reg, record, conceptId, now, config) {
    const concept = reg.concept(conceptId);
    if (!concept) throw new Error('概念 ' + conceptId + ' がありません');
    const ids = [];
    const add = (p) => { if (p && p.concept === conceptId && ids.indexOf(p.id) === -1) ids.push(p.id); };
    reg.units().forEach(u => reg.stagesInOrder(u.id).forEach(s => list(s.retryPool).forEach(add)));
    list(concept.checkPool).forEach(add);
    const picked = ids.slice(0, config.review.problemCount);
    const done = record && record.reviewDone ? record.reviewDone[conceptId] : undefined;
    return baseSession({
      id: newSessionId(now), kind: 'review', stageId: null, conceptId, attempt: 0, mode: 'problem',
      startedAt: toDate(now).toISOString(),
      xpMultiplier: done === xp.localDate(toDate(now)) ? config.repeatMultiplier : 1,
      queue: picked.map(id => problemStep(id, 'review')), usedProblemIds: picked.slice(),
    });
  }

  // ---- 画面用の形 ----

  // index の解説カードが属する「続いたカードの列」（同じ lessonStageId・同じ emitRead）の範囲
  function lessonBlock(queue, index) {
    const same = (a, b) => a && b && a.kind === 'lesson' && b.kind === 'lesson' && a.lessonStageId === b.lessonStageId && a.emitRead === b.emitRead;
    let start = index; let end = index;
    while (start > 0 && same(queue[start - 1], queue[index])) start--;
    while (end < queue.length - 1 && same(queue[end + 1], queue[index])) end++;
    return { start, end };
  }

  function current(session, reg) {
    // 解答直後はフィードバックを先に見せる（最後の再確認で終わった場合も）
    if (session.pending) {
      const p = session.pending;
      return { kind: 'feedback', problem: reg.problem(p.problemId), correct: p.correct, feedback: p.feedback, phase: p.phase };
    }
    const step = session.queue[session.index];
    if (session.ended || !step) return { kind: 'ended', reason: session.ended || 'completed' };
    if (step.kind === 'lesson') {
      const stage = reg.stage(step.lessonStageId);
      const card = list(stage && stage.lessons).find(c => c.id === step.cardId) || null;
      const b = lessonBlock(session.queue, session.index);
      return { kind: 'lesson', card, index: session.index - b.start, total: b.end - b.start + 1 };
    }
    if (step.kind === 'offer') {
      return { kind: 'offer', concept: reg.concept(step.conceptId), basic: reg.concept(step.basicId) };
    }
    return { kind: 'problem', problem: reg.problem(step.problemId), phase: step.phase };
  }

  // ---- 進める ----

  // index を 1 つ進め、使い切ったら終える（kind 'stage' を最後まで終えたら stageClear）
  function advance(s, events) {
    s.index += 1;
    finishIfDone(s, events);
  }

  function finishIfDone(s, events) {
    if (s.index < s.queue.length || s.ended) return;
    s.ended = 'completed';
    if (s.kind === 'stage') events.push({ kind: 'stageClear' });
  }

  function next(session, reg, config) {
    if (session.pending) {
      const s = copy(session);
      const events = [];
      s.pending = null;
      // 再確認の誤答で ended 'stopped' になっていれば、そのまま終わりの画面へ
      if (s.ended) s.index += 1; else advance(s, events);
      return { session: s, events };
    }
    if (session.ended) return { session, events: [] };
    const step = session.queue[session.index];
    // 問題は答えないと、offer は選ばないと進めない
    if (!step || step.kind !== 'lesson') return { session, events: [] };
    const s = copy(session);
    const events = [];
    // 列の最後のカードを読み終えたら lessonRead
    if (step.emitRead && lessonBlock(s.queue, s.index).end === s.index) {
      events.push({ kind: 'lessonRead', lessonStageId: step.lessonStageId });
      if (step.lessonStageId === s.stageId) s.lessonRead = true;
    }
    advance(s, events);
    return { session: s, events };
  }

  // ---- 確認問題を選ぶ ----

  // basic の確認問題から n 問。この回でまだ出していないものを優先し、その中でも
  // このセッションで経験値を付けていない（まだ解いていない）ものを先にする。足りなければ再使用する
  function pickChecks(reg, session, n) {
    const lb = session.learnback;
    const basic = reg.concept(lb.basicId);
    const pool = list(basic && basic.checkPool).map(p => p.id);
    const fresh = pool.filter(id => lb.usedIds.indexOf(id) === -1);
    const unseen = fresh.filter(id => session.awardedProblemIds.indexOf(id) === -1);
    const seen = fresh.filter(id => session.awardedProblemIds.indexOf(id) !== -1);
    const order = unseen.concat(seen);
    const picked = order.slice(0, n);
    // プールが足りないときは、この回で出した問題をもう一度使う
    for (let i = 0; picked.length < n && pool.length > 0; i++) picked.push(pool[i % pool.length]);
    picked.forEach(id => lb.usedIds.push(id));
    return picked;
  }

  // ---- 答える ----

  function answer(session, reg, answerValue, config) {
    const step = session.queue[session.index];
    const rejected = { session, correct: false, invalid: true, feedback: null, events: [] };
    if (session.ended || session.pending || !step || (step.kind !== 'warmup' && step.kind !== 'problem')) return rejected;
    const problem = reg.problem(step.problemId);
    if (!problem) return rejected;
    const r = judgeApi.judge(problem, answerValue, config);
    if (r.invalid) return rejected;

    const s = copy(session);
    const correct = !!r.correct;
    const phase = step.phase;
    const c = problem.concept;
    const feedback = { explanation: problem.explanation, hint: problem.hint };
    const events = [{ kind: 'history', sessionId: s.id, attempt: s.attempt, stageId: s.stageId, problemId: problem.id, conceptId: c, correct, phase }];
    s.pending = { problemId: problem.id, correct, feedback, phase };

    // 予想（warmup）は記録だけ。経験値・理解度・分岐に影響しない
    if (phase === 'warmup') return { session: s, correct, invalid: false, feedback, events };

    // 経験値は 1 問につき 1 回まで（同じ問題を再出題しても加点しない）
    if (s.awardedProblemIds.indexOf(problem.id) === -1) {
      s.awardedProblemIds.push(problem.id);
      events.push({ kind: 'answer' });
      if (correct) {
        events.push({ kind: 'correct' });
        if (phase === 'main') events.push({ kind: 'firstTry' });
        if (phase === 'retry') events.push({ kind: 'retryCorrect' });
      }
    }
    events.push({ kind: 'mastery', conceptId: c, change: !correct ? 'wrong' : phase === 'main' ? 'firstTry' : 'later' });
    if (s.results[phase]) s.results[phase].push({ problemId: problem.id, correct });

    if (correct && (phase === 'main' || phase === 'retry' || phase === 'check')) s.missStreak[c] = 0;

    const at = s.index + 1;   // 分岐で足す step はすべて今の問題のすぐ後ろに入れる
    if (s.kind === 'stage' && !correct && phase === 'main') {
      s.missStreak[c] = 1;
      insertRetry(reg, s, problem, at);
    } else if (s.kind === 'stage' && !correct && phase === 'retry') {
      s.missStreak[c] = (s.missStreak[c] || 0) + 1;
      if (s.missStreak[c] >= config.learnback.missToOffer) {
        const concept = reg.concept(c);
        if (concept && concept.basic) {
          s.queue.splice(at, 0, { kind: 'offer', conceptId: c, basicId: concept.basic });
        } else {
          // 基礎概念がなければ、このステージの解説を見せて続きへ（加点の lessonRead は出さない）
          s.queue.splice(at, 0, ...lessonSteps(reg, s.stageId, false));
        }
      } else {
        insertRetry(reg, s, problem, at);
      }
    } else if (s.kind === 'stage' && phase === 'check' && s.learnback) {
      evaluateCheck(reg, s, correct, at, events, config);
    }
    return { session: s, correct, invalid: false, feedback, events };
  }

  // そのステージの類題プールから、まだ出していない同じ概念の問題を 1 問。尽きていれば何もしない。
  // 用語問題（term: true）を間違えたら用語の類題を、ふつうの問題ならふつうの類題を先に選ぶ（どちらも尽きたら残りから）
  function insertRetry(reg, s, failed, at) {
    const stage = reg.stage(s.stageId);
    const pool = list(stage && stage.retryPool).filter(x => x.concept === failed.concept && s.usedProblemIds.indexOf(x.id) === -1);
    const p = pool.find(x => !!x.term === !!failed.term) || pool[0];
    if (!p) return;
    s.usedProblemIds.push(p.id);
    s.queue.splice(at, 0, problemStep(p.id, 'retry'));
  }

  // 確認問題の結果を積み、決めた数がそろったら判定する
  function evaluateCheck(reg, s, correct, at, events, config) {
    const lb = s.learnback;
    lb.results.push(correct);
    const checkCount = config.learnback.checkCount;
    const recheckCount = config.learnback.recheckCount;
    if (!lb.recheck) {
      if (lb.results.length < checkCount) return;
      if (lb.results.every(Boolean)) {
        s.learnback = null;
        events.push({ kind: 'learnback' });
        return;
      }
      // 1 問でも誤答: 基礎概念の解説カード（lessonRead あり）→ もう一度確認問題
      const basic = reg.concept(lb.basicId);
      lb.recheck = true;
      const steps = basic ? lessonSteps(reg, basic.lessonStageId, true) : [];
      pickChecks(reg, s, recheckCount).forEach(id => steps.push(problemStep(id, 'check', { recheck: true })));
      s.queue.splice(at, 0, ...steps);
      return;
    }
    const rechecks = lb.results.slice(checkCount);
    if (rechecks.length < recheckCount) return;
    // 「確認問題を終えた」の加点は結果に関係なく 1 回。再確認も誤答なら今日はここまで
    s.learnback = null;
    events.push({ kind: 'learnback' });
    if (!rechecks.every(Boolean)) s.ended = 'stopped';
  }

  // ---- 学び直しの提案への返答 ----

  function choose(session, reg, choice, config) {
    const step = session.queue[session.index];
    if (session.ended || session.pending || !step || step.kind !== 'offer') return { session, events: [] };
    if (choice !== 'accept' && choice !== 'later') return { session, events: [] };
    const s = copy(session);
    const events = [];
    // offer の step は取り除き、accept なら同じ場所に確認問題を入れる
    s.queue.splice(s.index, 1);
    if (choice === 'accept') {
      const round = (s.learnbackRounds[step.basicId] || 0) + 1;
      s.learnbackRounds[step.basicId] = round;
      s.learnback = { conceptId: step.conceptId, basicId: step.basicId, round, results: [], recheck: false, usedIds: [] };
      const ids = pickChecks(reg, s, config.learnback.checkCount);
      s.queue.splice(s.index, 0, ...ids.map(id => problemStep(id, 'check')));
    } else {
      s.suggestedConcept = step.basicId;
    }
    // offer が最後の step だった場合（あとで）は、ここでステージを終える
    finishIfDone(s, events);
    return { session: s, events };
  }

  // ---- 結果 ----

  function summary(session, reg, config) {
    const main = list(session.results && session.results.main);
    const mainCount = main.length;
    const firstTryCount = main.filter(r => r.correct).length;
    let stars = 0;
    if (mainCount > 0) {
      const ratio = firstTryCount / mainCount;
      const hit = list(config.stars).find(([bound]) => bound > ratio);
      stars = hit ? hit[1] : list(config.stars).length > 0 ? config.stars[config.stars.length - 1][1] : 0;
    }
    // 類題か確認問題で正解した概念（重複なし、出てきた順）
    const improvedConcepts = [];
    ['retry', 'check'].forEach(phase => list(session.results && session.results[phase]).forEach(r => {
      if (!r.correct) return;
      const p = reg.problem(r.problemId);
      if (p && improvedConcepts.indexOf(p.concept) === -1) improvedConcepts.push(p.concept);
    }));
    return { mainCount, firstTryCount, stars, improvedConcepts, suggestedConcept: session.suggestedConcept || null, ended: session.ended };
  }

  const api = { startStage, startReview, current, next, answer, choose, summary };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { session: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
