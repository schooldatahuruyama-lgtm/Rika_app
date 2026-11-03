// 理解度（概念ごとの 0〜1 の値）の更新とラベル
(function (root) {
  'use strict';

  // 小数の足し算の誤差でラベルの境目（0.4 など）をまたがないよう、この桁で丸める
  const ROUND = 1e6;

  function clamp01(v) { return Math.min(1, Math.max(0, v)); }

  // change: 'firstTry'（1 回目で正解）| 'later'（2 回目以降で正解）| 'wrong'（不正解）
  // 値が未設定なら 0 とみなす。知らない change なら値を変えない
  function update(value, change, config) {
    const current = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const delta = config.mastery[change];
    if (change === 'labels' || typeof delta !== 'number') return current;
    return clamp01(Math.round((current + delta) * ROUND) / ROUND);
  }

  // labels は [[上限（この数未満）, ラベル], ...] の順。最初に当てはまるものを返す
  function label(value, config) {
    const labels = config.mastery.labels;
    const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    for (const [bound, name] of labels) {
      if (v < bound) return name;
    }
    return labels[labels.length - 1][1];
  }

  const api = { update, label };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { mastery: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
