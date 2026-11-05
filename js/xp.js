// 経験値・レベル・連続学習（日付は端末のローカル日付 YYYY-MM-DD）
(function (root) {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;

  // 出来事 1 回で付く経験値。daily は ctx.streak（連続日数）を使う。知らない kind は 0
  function amountFor(kind, config, ctx) {
    const table = config.xp;
    if (kind === 'daily') {
      const streak = ctx && typeof ctx.streak === 'number' ? Math.max(0, ctx.streak) : 0;
      return Math.min(table.dailyPerStreakDay * streak, table.dailyMax);
    }
    if (kind === 'dailyPerStreakDay' || kind === 'dailyMax') return 0;
    const amount = table[kind];
    return typeof amount === 'number' ? amount : 0;
  }

  // config.levels は Lv1.. の下限。最後の下限を超えたら levelStep ごとに 1 つ上がる
  function levelFor(totalXp, config) {
    const levels = config.levels;
    const total = typeof totalXp === 'number' && Number.isFinite(totalXp) ? totalXp : 0;
    const last = levels[levels.length - 1];
    if (total >= last) return levels.length + Math.floor((total - last) / config.levelStep);
    let level = 1;
    for (let i = 0; i < levels.length; i++) {
      if (total >= levels[i]) level = i + 1;
    }
    return level;
  }

  // level の次のレベルが始まる経験値の合計
  function nextLevelXp(level, config) {
    const levels = config.levels;
    if (level < levels.length) return levels[Math.max(level, 1)];
    return levels[levels.length - 1] + (level - levels.length + 1) * config.levelStep;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  // Date・ISO 文字列・数値を、端末のローカル日付 'YYYY-MM-DD' にする
  function localDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  // 'YYYY-MM-DD' をローカルの 0 時として読む
  function parseLocal(ymd) {
    const [y, m, d] = String(ymd).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // B − A の日数（夏時間の 1 時間ずれを丸めで吸収する）。負にもなる
  function daysBetween(dateA, dateB) {
    return Math.round((parseLocal(dateB) - parseLocal(dateA)) / DAY_MS);
  }

  // 連続学習の更新（元の streak は変えない）。同じ日なら変化なし、前日なら +1、それ以外は 1
  function updateStreak(streak, today) {
    const count = streak && typeof streak.count === 'number' ? streak.count : 0;
    const lastDate = streak ? streak.lastDate || null : null;
    if (lastDate === today) {
      return { streak: { count, lastDate }, isFirstToday: false };
    }
    const next = lastDate !== null && daysBetween(lastDate, today) === 1 ? count + 1 : 1;
    return { streak: { count: next, lastDate: today }, isFirstToday: true };
  }

  const api = { amountFor, levelFor, nextLevelXp, localDate, daysBetween, updateStreak };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { xp: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
