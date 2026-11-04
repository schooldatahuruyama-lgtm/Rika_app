// 単元の一覧（教材の登録状況つき）と、いま選んでいる単元（純粋関数。Node でもブラウザでも動く）
// list(reg, curriculum) → [{ id, title, grade, field, ready, unit, teacher }, ...]
//   curriculum.units() の順。ready は reg.unit(id) が登録されているか。unit は登録された教材（なければ null）。
//   teacher は mascot.forUnit(ready ? 登録された教材 : 表の項目)（登録済みなら教材の mascot を優先）。
//   curriculum にないが reg に登録されている単元は末尾に足す（grade: 0, field: '', title は教材の title）。
//   curriculum が null・undefined・units() のない値なら空の表として扱い、登録済みの単元だけを並べる。
// currentId(reg, curriculum, profile) → 文字列 | null
//   profile.unitId が文字列で reg.unit(profile.unitId) があればそれ。
//   なければ list(...) の ready な最初の id。1 つもなければ null。
(function (root) {
  'use strict';

  // 読み込み順に頼らないよう、使うときに取る（index.html では mascot.js がこのファイルより後にある）
  function mascot() {
    return typeof require === 'function' ? require('./mascot.js') : root.RikaQuest.mascot;
  }

  function arr(x) { return Array.isArray(x) ? x : []; }

  function tableOf(curriculum) {
    if (!curriculum || typeof curriculum.units !== 'function') return [];
    return arr(curriculum.units()).filter((u) => u && typeof u.id === 'string');
  }

  function registeredOf(reg) {
    return reg && typeof reg.units === 'function' ? arr(reg.units()).filter((u) => u && typeof u.id === 'string') : [];
  }

  function lookup(reg, id) {
    return reg && typeof reg.unit === 'function' ? reg.unit(id) || null : null;
  }

  function list(reg, curriculum) {
    const m = mascot();
    const out = tableOf(curriculum).map((item) => {
      const unit = lookup(reg, item.id);
      return {
        id: item.id,
        title: item.title,
        grade: item.grade,
        field: item.field,
        ready: !!unit,
        unit,
        teacher: m.forUnit(unit || item),
      };
    });
    const known = new Set(out.map((x) => x.id));
    registeredOf(reg).forEach((unit) => {
      if (known.has(unit.id)) return;
      known.add(unit.id);
      out.push({ id: unit.id, title: unit.title, grade: 0, field: '', ready: true, unit, teacher: m.forUnit(unit) });
    });
    return out;
  }

  function currentId(reg, curriculum, profile) {
    const id = profile ? profile.unitId : undefined;
    if (typeof id === 'string' && lookup(reg, id)) return id;
    const first = list(reg, curriculum).find((x) => x.ready);
    return first ? first.id : null;
  }

  const api = { list, currentId };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { units: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
