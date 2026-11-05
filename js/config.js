// 暫定の数値をすべてここに置く（他のファイルに直接書かない）
(function (root) {
  'use strict';

  const api = {
    // 経験値（1 回の出来事ごとに付く量）
    xp: { answer: 10, correct: 10, firstTry: 5, retryCorrect: 15, learnback: 20, lessonRead: 10, stageClear: 50, dailyPerStreakDay: 10, dailyMax: 50 },
    // クリア済みのステージをもう一度学ぶときの経験値の倍率
    repeatMultiplier: 0.5,
    levels: [0, 100, 250, 450, 700],   // Lv1..Lv5 の下限。以後 +300 ずつ（levelFor が計算）
    levelStep: 300,
    // 理解度の増減と、ラベルの境目（値がこの数未満ならこのラベル）
    mastery: { firstTry: 0.25, later: 0.15, wrong: -0.2, labels: [[0.4, 'まだ'], [0.8, 'もう少し'], [1.01, 'できた']] },
    // 学び直し: 何回続けて間違えたら勧めるか、確認問題の数、もう一度の確認の数
    learnback: { missToOffer: 2, checkCount: 2, recheckCount: 1 },
    // 復習: 出す問題の数、前回から空ける日数
    review: { problemCount: 3, minDaysSince: 1 },
    stars: [[0.5, 1], [0.8, 2], [1.01, 3]],   // 1回目正解率の上限と星
    // 判定の許容（角度は度、長さは SVG の px）
    tolerance: { reflectDeg: 5, lensPx: 12, parallelDeg: 5, dragPx: 16, snapPx: 24 },
    storageKey: 'rika-quest:v1',
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { config: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
