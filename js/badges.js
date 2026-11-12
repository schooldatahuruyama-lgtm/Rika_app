// バッジ（取り組みで取れるしるし）の定義と判定（純粋関数。Node でもブラウザでも動く）
// 正解率だけでなく、続けた・やり直した・読んだ・復習したことでも取れるようにする。経験値は付けない。
// record を受け取る関数はすべて元を変えず、新しいオブジェクトを返す。
//
// DEFS … バッジの定義の配列（この順がそのまま一覧の表示順）
//   { id, title, description（取る条件を生徒向けの一文で）, glyph（メダルに描く 1〜4 文字）, color（COLORS のどれか）, test(stats) → boolean }
// stats(rec, reg, config) → 判定に使う数（例外を出さない。欠けている項目は 0 や空として扱う）
// earned(rec, reg, config) → 条件を満たしているバッジ id の配列（DEFS の順）
// newlyEarned(rec, reg, config) → earned のうち rec.badges にまだ無い id の配列
// award(rec, ids, now) → rec.badges[id] = { at: ISO 文字列, seen: false } を足した新しい rec（すでにあるものは変えない）
// markSeen(rec, ids) → 取っているバッジを seen: true にした新しい rec
// entry(rec, id) → 取っていれば { at（文字列か null）, seen }、取っていなければ null
//   rec.badges[id] の中身の形が崩れていても（at が文字列でない・seen が boolean でない）、キーがあれば取っているとみなす
//   （seen は true 扱い。取り消しはしない）
// unseen(rec) → 取っていてまだ見せていないバッジ id の配列（DEFS の順）
// count(rec) → 取っているバッジの数（DEFS にあるものだけ数える）
// def(id) → 定義（なければ null）
(function (root) {
  'use strict';

  const xp = typeof require === 'function' ? require('./xp.js') : root.RikaQuest.xp;
  const defaultConfig = typeof require === 'function' ? require('./config.js') : root.RikaQuest.config;

  const COLORS = ['blue', 'green', 'orange', 'purple', 'pink'];

  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return isObject(x) ? x : {}; }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isFiniteNumber(x) { return typeof x === 'number' && Number.isFinite(x); }

  const DEFS = [
    { id: 'first-clear', title: 'はじめの一歩', glyph: '1', color: 'blue', description: '最初のステージをクリアしよう。', test: (s) => s.clearedStages >= 1 },
    { id: 'clear-5', title: 'ステージ 5', glyph: '5', color: 'blue', description: 'ステージを 5 つクリアしよう。', test: (s) => s.clearedStages >= 5 },
    { id: 'clear-20', title: 'ステージ 20', glyph: '20', color: 'blue', description: 'ステージを 20 クリアしよう。', test: (s) => s.clearedStages >= 20 },
    { id: 'unit-master', title: '単元マスター', glyph: '単', color: 'purple', description: '1 つの単元の基本のステージ（ミニプリントをのぞく）を全部クリアしよう。', test: (s) => s.clearedUnits >= 1 },
    { id: 'unit-master-3', title: '3 単元マスター', glyph: '3単', color: 'purple', description: '3 つの単元の基本のステージ（ミニプリントをのぞく）を全部クリアしよう。', test: (s) => s.clearedUnits >= 3 },
    { id: 'perfect', title: 'パーフェクト', glyph: '★3', color: 'orange', description: '星 3 つでステージをクリアしよう。', test: (s) => s.perfectStages >= 1 },
    { id: 'stars-10', title: '星あつめ', glyph: '★10', color: 'orange', description: '星を合計 10 個あつめよう。', test: (s) => s.totalStars >= 10 },
    { id: 'stars-30', title: '星の達人', glyph: '★30', color: 'orange', description: '星を合計 30 個あつめよう。', test: (s) => s.totalStars >= 30 },
    { id: 'streak-3', title: '3 日連続', glyph: '3日', color: 'green', description: '3 日続けて学習しよう。', test: (s) => s.bestStreak >= 3 },
    { id: 'streak-7', title: '1 週間連続', glyph: '7日', color: 'green', description: '7 日続けて学習しよう。', test: (s) => s.bestStreak >= 7 },
    { id: 'streak-30', title: '1 か月連続', glyph: '30日', color: 'green', description: '30 日続けて学習しよう。', test: (s) => s.bestStreak >= 30 },
    { id: 'retry', title: 'あきらめない', glyph: '↺', color: 'pink', description: 'まちがえた問題にもう一度挑戦して、正解しよう。', test: (s) => s.retryCorrect >= 1 },
    { id: 'learnback-3', title: '学び直しの達人', glyph: '学', color: 'pink', description: '学び直しを 3 回やりきろう。', test: (s) => s.learnback >= 3 },
    { id: 'review-3', title: '思い出し名人', glyph: '復', color: 'pink', description: '3 つの概念を復習しよう。', test: (s) => s.reviewedConcepts >= 3 },
    { id: 'reader-5', title: '解説をよく読む', glyph: '読', color: 'green', description: '解説カードを 5 つのステージで読み終えよう。', test: (s) => s.lessonsRead >= 5 },
    { id: 'answers-100', title: '100 問', glyph: '100', color: 'blue', description: '問題に 100 回答えよう。', test: (s) => s.answers >= 100 },
    { id: 'mastered-5', title: 'できたが 5 つ', glyph: '5', color: 'purple', description: '理解度が「できた」の概念を 5 つにしよう。', test: (s) => s.masteredConcepts >= 5 },
    { id: 'mastered-20', title: 'できたが 20', glyph: '20', color: 'purple', description: '理解度が「できた」の概念を 20 にしよう。', test: (s) => s.masteredConcepts >= 20 },
    { id: 'level-5', title: 'Lv 5', glyph: 'Lv5', color: 'orange', description: 'レベル 5 になろう。', test: (s) => s.level >= 5 },
    { id: 'level-10', title: 'Lv 10', glyph: 'Lv10', color: 'orange', description: 'レベル 10 になろう。', test: (s) => s.level >= 10 },
    // ライブクイズの順位（参加者が 2 人以上の部屋だけ数える。bestLiveRank は無ければ 0）
    { id: 'live-top5', title: 'ライブ トップ 5', glyph: '5位', color: 'green', description: 'ライブクイズで 5 位以内に入ろう。', test: (s) => s.bestLiveRank >= 1 && s.bestLiveRank <= 5 },
    { id: 'live-top3', title: 'ライブ トップ 3', glyph: '3位', color: 'orange', description: 'ライブクイズで 3 位以内に入ろう。', test: (s) => s.bestLiveRank >= 1 && s.bestLiveRank <= 3 },
    { id: 'live-first', title: 'ライブ 1 位', glyph: '1位', color: 'orange', description: 'ライブクイズで 1 位になろう。', test: (s) => s.bestLiveRank === 1 },
  ];

  function def(id) {
    return DEFS.find((d) => d.id === id) || null;
  }

  // 登録済みの単元ごとのステージ（教材の順）。reg が使えなければ空
  // 各ステージは { id, free }。free は free: true の領域（ミニプリント）のステージなら true
  function unitStages(reg) {
    if (!reg || typeof reg.units !== 'function') return [];
    return arr(reg.units()).filter((u) => isObject(u) && typeof u.id === 'string').map((u) => {
      const freeIds = new Set();
      arr(u.areas).forEach((a) => {
        if (!isObject(a) || a.free !== true) return;
        arr(a.stages).forEach((s) => { if (isObject(s) && typeof s.id === 'string') freeIds.add(s.id); });
      });
      const list = typeof reg.stagesInOrder === 'function' ? arr(reg.stagesInOrder(u.id)) : [];
      return list.filter((s) => isObject(s) && typeof s.id === 'string').map((s) => ({ id: s.id, free: freeIds.has(s.id) }));
    });
  }

  // 「できた」の境（labels の最後から 2 番目の数値。今は 0.8）
  function masteredBound(config) {
    const labels = config && config.mastery && Array.isArray(config.mastery.labels) ? config.mastery.labels : [];
    const l = labels.length >= 2 ? labels[labels.length - 2] : null;
    return Array.isArray(l) && isFiniteNumber(l[0]) ? l[0] : 0.8;
  }

  // 学習した日（予想以外の解答があった日）を並べて、連続した日の最長の長さ
  function bestStreakOf(history) {
    const days = new Set();
    history.forEach((h) => {
      if (!isObject(h) || h.phase === 'warmup') return;
      if (typeof h.at !== 'string' && !(h.at instanceof Date)) return;
      const d = new Date(h.at);
      if (Number.isNaN(d.getTime())) return;
      days.add(xp.localDate(d));
    });
    const sorted = [...days].sort();
    let best = 0;
    let run = 0;
    let prev = null;
    sorted.forEach((day) => {
      run = prev !== null && xp.daysBetween(prev, day) === 1 ? run + 1 : 1;
      if (run > best) best = run;
      prev = day;
    });
    return best;
  }

  function stats(rec, reg, config) {
    const r = obj(rec);
    const stages = obj(r.stages);
    const stageOf = (id) => (own(stages, id) ? obj(stages[id]) : {});
    const units = unitStages(reg);

    let clearedStages = 0;
    let perfectStages = 0;
    let totalStars = 0;
    let clearedUnits = 0;
    // clearedStages・totalStars・perfectStages はミニプリント（free の領域）も数える。
    // clearedUnits（単元マスター）は free の領域を除いた基本のステージが全部クリアなら数える
    units.forEach((list) => {
      let all = list.some((x) => !x.free);
      list.forEach(({ id, free }) => {
        const s = stageOf(id);
        if (s.status === 'cleared') clearedStages += 1;
        else if (!free) all = false;
        if (isFiniteNumber(s.stars)) {
          totalStars += s.stars;
          if (s.stars === 3) perfectStages += 1;
        }
      });
      if (all) clearedUnits += 1;
    });

    const history = arr(r.history);
    const xpLog = arr(r.xpLog).filter(isObject);
    const lessonsRead = obj(r.lessonsRead);
    const bound = masteredBound(config || defaultConfig);
    const masteryMap = obj(r.mastery);
    // ライブクイズの最終順位（参加者 2 人以上の部屋の、いちばん良い順位）
    const liveResults = arr(r.liveResults).filter(isObject);
    const liveRanks = liveResults
      .filter((x) => Number.isInteger(x.players) && x.players >= 2 && Number.isInteger(x.rank) && x.rank >= 1)
      .map((x) => x.rank);

    return {
      clearedStages,
      clearedUnits,
      perfectStages,
      totalStars,
      answers: history.filter((h) => isObject(h) && h.phase !== 'warmup').length,
      retryCorrect: xpLog.filter((e) => e.kind === 'retryCorrect').length,
      learnback: xpLog.filter((e) => e.kind === 'learnback').length,
      lessonsRead: Object.keys(lessonsRead).filter((k) => lessonsRead[k] === true).length,
      reviewedConcepts: Object.keys(obj(r.reviewDone)).length,
      masteredConcepts: Object.keys(masteryMap).filter((k) => isObject(masteryMap[k]) && isFiniteNumber(masteryMap[k].value) && masteryMap[k].value >= bound).length,
      bestStreak: bestStreakOf(history),
      level: isFiniteNumber(r.level) ? r.level : 0,
      bestLiveRank: liveRanks.length > 0 ? Math.min(...liveRanks) : 0,
      liveResults: liveResults.length,
    };
  }

  function earned(rec, reg, config) {
    const s = stats(rec, reg, config);
    return DEFS.filter((d) => d.test(s)).map((d) => d.id);
  }

  function badgesOf(rec) {
    return isObject(rec) ? obj(rec.badges) : {};
  }

  function entry(rec, id) {
    const b = badgesOf(rec);
    if (typeof id !== 'string' || !own(b, id)) return null;
    const v = obj(b[id]);
    // at か seen のどちらかでも形が崩れていれば「取っていて、見せ済み」扱い（もう一度「新しいバッジ」として出さない）
    const ok = typeof v.at === 'string' && typeof v.seen === 'boolean';
    return ok ? { at: v.at, seen: v.seen } : { at: typeof v.at === 'string' ? v.at : null, seen: true };
  }

  function newlyEarned(rec, reg, config) {
    return earned(rec, reg, config).filter((id) => entry(rec, id) === null);
  }

  // 今の badges を写す（"__proto__" のキーは写さない。Object.prototype にふれないように）
  function copyBadges(rec) {
    const b = badgesOf(rec);
    const out = {};
    Object.keys(b).forEach((k) => { if (k !== '__proto__') out[k] = b[k]; });
    return out;
  }

  function toIso(now) {
    const d = now === undefined || now === null ? new Date() : now instanceof Date ? now : new Date(now);
    return d.toISOString();
  }

  function award(rec, ids, now) {
    const badges = copyBadges(rec);
    const at = toIso(now);
    arr(ids).forEach((id) => {
      if (typeof id !== 'string' || id === '__proto__' || own(badges, id)) return;
      badges[id] = { at, seen: false };
    });
    return Object.assign({}, obj(rec), { badges });
  }

  function markSeen(rec, ids) {
    const badges = copyBadges(rec);
    arr(ids).forEach((id) => {
      if (typeof id !== 'string' || id === '__proto__' || !own(badges, id)) return;
      badges[id] = Object.assign({}, obj(badges[id]), { seen: true });
    });
    return Object.assign({}, obj(rec), { badges });
  }

  function unseen(rec) {
    return DEFS.filter((d) => {
      const e = entry(rec, d.id);
      return e !== null && e.seen === false;
    }).map((d) => d.id);
  }

  function count(rec) {
    return DEFS.filter((d) => entry(rec, d.id) !== null).length;
  }

  const api = { DEFS, COLORS, def, stats, earned, newlyEarned, award, markSeen, entry, unseen, count };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { badges: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
