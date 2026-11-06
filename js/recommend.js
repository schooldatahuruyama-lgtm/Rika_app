// 今日のクエスト（おすすめ）と、ステージの解放判定（設計書 4.6・4.7）
(function (root) {
  'use strict';

  const record = typeof require === 'function' ? require('./record.js') : root.RikaQuest.record;
  const mastery = typeof require === 'function' ? require('./mastery.js') : root.RikaQuest.mastery;
  const xp = typeof require === 'function' ? require('./xp.js') : root.RikaQuest.xp;

  function list(x) { return Array.isArray(x) ? x : []; }

  function reviewQuest(concept) {
    return { kind: 'review', conceptId: concept.id, title: '復習: ' + concept.title };
  }

  function stageQuest(stage, resume) {
    return { kind: 'stage', stageId: stage.id, resume, title: stage.title };
  }

  // 理解度が「まだ」で、最後に取り組んでから minDaysSince 日以上たった概念か
  // 一度も取り組んでいない概念（lastAt なし）は対象にしない
  function needsReview(rec, concept, now, config) {
    if (mastery.label(record.masteryOf(rec, concept.id), config) !== 'まだ') return false;
    const m = rec.mastery[concept.id];
    if (!m || !m.lastAt) return false;
    return xp.daysBetween(xp.localDate(m.lastAt), xp.localDate(now)) >= config.review.minDaysSince;
  }

  // 次の順で 1 つ決める。単元が登録されていなければ null
  // 1. 「まだ」で 1 日以上たった概念の復習（unit.concepts の順で最初）
  // 2. 途中のステージ（再開データがあれば resume: true）
  // 3. 未着手の最初のステージ（領域の順）
  // 4. 全部クリア済みなら、理解度が一番低い概念の復習（同じ値なら unit.concepts の先）
  function todayQuest(reg, rec, unitId, now, config) {
    const unit = reg.unit(unitId);
    if (!unit) return null;
    const concepts = list(unit.concepts).filter(Boolean);
    const stages = reg.stagesInOrder(unitId);

    const due = concepts.find(c => needsReview(rec, c, now, config));
    if (due) return reviewQuest(due);

    const states = stages.map(s => ({ stage: s, state: record.stageState(rec, s.id) }));
    const inprogress = states.find(x => x.state.status === 'inprogress');
    if (inprogress) return stageQuest(inprogress.stage, inprogress.state.resume != null);

    const fresh = states.find(x => x.state.status === 'none');
    if (fresh) return stageQuest(fresh.stage, false);

    let lowest = null;
    concepts.forEach(c => {
      const v = record.masteryOf(rec, c.id);
      if (lowest === null || v < lowest.value) lowest = { concept: c, value: v };
    });
    return lowest ? reviewQuest(lowest.concept) : null;
  }

  // 領域の最初のステージは常に解放。それ以外は同じ領域の 1 つ前のステージがクリア済みなら解放
  // 領域に free: true があれば（ミニプリントの領域）、その領域のステージはすべて最初から解放
  // 登録されていないステージは false
  function isUnlocked(reg, rec, stageId) {
    for (const u of reg.units()) {
      for (const area of list(u.areas)) {
        if (!area) continue;
        const stages = list(area.stages);
        const i = stages.findIndex(s => s && s.id === stageId);
        if (i < 0) continue;
        if (i === 0 || area.free === true) return true;
        return record.stageState(rec, stages[i - 1].id).status === 'cleared';
      }
    }
    return false;
  }

  const api = { todayQuest, isUnlocked };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { recommend: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
