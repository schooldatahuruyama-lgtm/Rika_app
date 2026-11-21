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

  // ステージが free（いつでも挑戦できる）か。領域の free: true（古い教材・AI 教材）か、ステージの free: true
  // true 以外（'true'・1 など）は free でない
  function isFreeStage(area, stage) {
    return !!(area && area.free === true) || !!(stage && stage.free === true);
  }

  // 解放の規則
  // - free のステージ（領域 free かステージ free）は最初から解放
  // - それ以外（基本のステージ）は、同じ領域の中で自分より前にある free でないステージのうち、
  //   最後のものがクリア済みなら解放。前に free でないステージがなければ解放
  //   （プリント・ドリルなど free のステージは、基本のステージの鎖に入らない）
  // 登録されていないステージは false
  function isUnlocked(reg, rec, stageId) {
    for (const u of reg.units()) {
      for (const area of list(u.areas)) {
        if (!area) continue;
        const stages = list(area.stages);
        const i = stages.findIndex(s => s && s.id === stageId);
        if (i < 0) continue;
        if (isFreeStage(area, stages[i])) return true;
        for (let j = i - 1; j >= 0; j--) {
          const prev = stages[j];
          if (!prev || isFreeStage(area, prev)) continue;
          return record.stageState(rec, prev.id).status === 'cleared';
        }
        return true;
      }
    }
    return false;
  }

  const api = { todayQuest, isUnlocked, isFreeStage };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { recommend: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
