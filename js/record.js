// 生徒ごとの記録（イベントの適用、ステージ状態、星、履歴）
// record を受け取る関数はすべて元を変えず、新しいオブジェクトを返す。
// createProfile / deleteProfile だけは、アプリの唯一の状態である store をその場で変える。
(function (root) {
  'use strict';

  const xp = typeof require === 'function' ? require('./xp.js') : root.RikaQuest.xp;
  const mastery = typeof require === 'function' ? require('./mastery.js') : root.RikaQuest.mastery;

  // 問題・解説などで付く経験値の種類（倍率をかける）
  const XP_KINDS = ['answer', 'correct', 'firstTry', 'retryCorrect', 'learnback', 'stageClear'];

  function toIso(now) {
    const d = now === undefined || now === null ? new Date() : now instanceof Date ? now : new Date(now);
    return d.toISOString();
  }

  function createStore() {
    return { version: 1, currentProfileId: null, profiles: [], records: {} };
  }

  function createRecord() {
    return { xp: 0, level: 1, streak: { count: 0, lastDate: null }, mastery: {}, stages: {}, lessonsRead: {}, reviewDone: {}, history: [], xpLog: [], badges: {} };
  }

  // id は p-<時刻>-<乱数>。万一すでにある id と重なったら作り直す
  function newProfileId(store, now) {
    const time = (now instanceof Date ? now : now ? new Date(now) : new Date()).getTime();
    let id;
    do {
      id = `p-${time}-${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
    } while (store.profiles.some((p) => p.id === id));
    return id;
  }

  function createProfile(store, { nickname, avatar }, now) {
    const profile = { id: newProfileId(store, now), nickname, avatar, createdAt: toIso(now) };
    store.profiles.push(profile);
    store.records[profile.id] = createRecord();
    store.currentProfileId = profile.id;
    return profile;
  }

  // 記録も一緒に消す。選んでいた生徒なら、残った最初の生徒（いなければ null）にする
  function deleteProfile(store, id) {
    store.profiles = store.profiles.filter((p) => p.id !== id);
    delete store.records[id];
    if (store.currentProfileId === id) {
      store.currentProfileId = store.profiles.length > 0 ? store.profiles[0].id : null;
    }
    return store;
  }

  // 変える部分だけ浅くコピーした record を作る
  function copyForEvents(rec) {
    return Object.assign({}, rec, {
      streak: Object.assign({}, rec.streak),
      mastery: Object.assign({}, rec.mastery),
      lessonsRead: Object.assign({}, rec.lessonsRead),
      history: rec.history.slice(),
      xpLog: rec.xpLog.slice(),
      badges: Object.assign({}, rec.badges),
    });
  }

  // ctx = { now, multiplier（既定 1）, stageId }
  function applyEvents(rec, events, ctx, config) {
    const at = toIso(ctx && ctx.now);
    const multiplier = ctx && typeof ctx.multiplier === 'number' ? ctx.multiplier : 1;
    const ctxStageId = ctx && ctx.stageId !== undefined ? ctx.stageId : null;
    const next = copyForEvents(rec);

    function addXp(kind, amount, stageId) {
      next.xp += amount;
      next.xpLog.push({ at, kind, amount, stageId });
    }

    for (const ev of events) {
      if (ev.kind === 'history') {
        const stageId = ev.stageId !== undefined && ev.stageId !== null ? ev.stageId : ctxStageId;
        next.history.push({ at, sessionId: ev.sessionId, attempt: ev.attempt, stageId, problemId: ev.problemId, conceptId: ev.conceptId, correct: ev.correct, phase: ev.phase });
        // 連続学習と日次加点: その日の最初の（準備運動以外の）解答で判定する。倍率はかけない
        if (ev.phase !== 'warmup') {
          const r = xp.updateStreak(next.streak, xp.localDate(at));
          if (r.isFirstToday) {
            next.streak = r.streak;
            addXp('daily', xp.amountFor('daily', config, { streak: r.streak.count }), stageId);
          }
        }
      } else if (XP_KINDS.indexOf(ev.kind) !== -1) {
        addXp(ev.kind, Math.round(xp.amountFor(ev.kind, config) * multiplier), ctxStageId);
      } else if (ev.kind === 'lessonRead') {
        // 解説カードを読み終えた加点はステージごとに 1 回だけ（再読でのかせぎ過ぎを防ぐ）
        if (!next.lessonsRead[ev.lessonStageId]) {
          addXp('lessonRead', Math.round(xp.amountFor('lessonRead', config) * multiplier), ctxStageId);
          next.lessonsRead[ev.lessonStageId] = true;
        }
      } else if (ev.kind === 'mastery') {
        const prev = next.mastery[ev.conceptId];
        next.mastery[ev.conceptId] = { value: mastery.update(prev ? prev.value : 0, ev.change, config), lastAt: at };
      }
      // 知らない kind は無視する
    }

    next.level = xp.levelFor(next.xp, config);
    return next;
  }

  function emptyStage() {
    return { status: 'none', stars: 0, attempts: 0, resume: null };
  }

  function withStage(rec, stageId, stage) {
    return Object.assign({}, rec, { stages: Object.assign({}, rec.stages, { [stageId]: stage }) });
  }

  // 挑戦の終わり。cleared: true ならクリア（星は上がるときだけ）、false なら中断
  // now は今のところ使わない（呼び出しの形をそろえるために受け取る）
  function finishStage(rec, { stageId, stars, cleared }, now) {
    const prev = Object.assign(emptyStage(), rec.stages[stageId]);
    const stage = Object.assign({}, prev, { resume: null, attempts: prev.attempts + 1 });
    if (cleared) {
      stage.status = 'cleared';
      if (typeof stars === 'number' && stars > prev.stars) stage.stars = stars;
    } else if (prev.status !== 'cleared') {
      stage.status = 'inprogress';
    }
    return withStage(rec, stageId, stage);
  }

  // 途中の session を再開用に保存する（クリア済みならクリアのまま）
  function setResume(rec, stageId, session) {
    const prev = Object.assign(emptyStage(), rec.stages[stageId]);
    const stage = Object.assign({}, prev, { resume: session });
    if (stage.status !== 'cleared') stage.status = 'inprogress';
    return withStage(rec, stageId, stage);
  }

  function stageState(rec, stageId) {
    const s = Object.assign(emptyStage(), rec.stages[stageId]);
    return { status: s.status, stars: s.stars, attempts: s.attempts, resume: s.resume };
  }

  // date は 'YYYY-MM-DD'
  function markReviewDone(rec, conceptId, date) {
    return Object.assign({}, rec, { reviewDone: Object.assign({}, rec.reviewDone, { [conceptId]: date }) });
  }

  function masteryOf(rec, conceptId) {
    const m = rec.mastery[conceptId];
    return m && typeof m.value === 'number' ? m.value : 0;
  }

  const api = { createStore, createProfile, deleteProfile, createRecord, applyEvents, finishStage, setResume, stageState, markReviewDone, masteryOf };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { record: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
