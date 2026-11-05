// 教材の登録・検索・検証
// 教材（unit）の形は共通資料の「共通のデータの形」を参照。
// ブラウザでは末尾で RikaQuest.content（登録先）を作り、content/*.js が RikaQuest.content.register(unit) を呼ぶ。
(function (root) {
  'use strict';

  const PROBLEM_TYPES = ['choice', 'fill', 'figure-choice', 'ray-draw', 'drag'];
  const FIGURE_TYPES = ['figure-choice', 'ray-draw', 'drag'];   // 図・操作型
  // 教材の作り方の決まり（調整用の暫定値ではなく、教材の形の約束なのでここに置く）
  const RULES = {
    retryPoolMin: 2,        // 概念ごとの類題の最小数
    checkPoolMin: 3,        // 概念ごとの確認問題の最小数
    problems: [4, 6],       // ステージの問題数（ふつうの問題 4〜5 問 ＋ 用語問題 1 問）
    lessons: [2, 4],        // ステージのレッスンカード数
  };

  // 配列でなければ空配列として扱う（形の崩れた教材でも例外を出さないため）
  function list(x) { return Array.isArray(x) ? x : []; }
  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function has(x) { return x !== undefined && x !== null; }

  // ステージの中の問題を、場所の名前とともに並べる（warmup・problems・retryPool の順）
  function stageProblems(stage) {
    const out = [];
    if (has(stage.warmup)) out.push({ problem: stage.warmup, where: 'warmup' });
    list(stage.problems).forEach((p, i) => out.push({ problem: p, where: 'problems[' + i + ']' }));
    list(stage.retryPool).forEach((p, i) => out.push({ problem: p, where: 'retryPool[' + i + ']' }));
    return out;
  }

  // ---- 検索（登録先） ----

  function createRegistry() {
    const unitList = [];

    // 登録済みの全ステージを、属する領域とともに並べる
    function allStages() {
      const out = [];
      unitList.forEach(u => list(u.areas).forEach(a => {
        if (!a) return;
        list(a.stages).forEach(s => { if (s) out.push({ stage: s, area: a }); });
      }));
      return out;
    }

    // 同じ id の単元は、あとから登録したもので置きかえる
    function register(unit) {
      const i = unitList.findIndex(u => u.id === unit.id);
      if (i >= 0) unitList[i] = unit; else unitList.push(unit);
    }

    // 登録を外す（AI 教材作成の「この端末でためす」をやめるときに使う）。なければ false
    function unregister(id) {
      const i = unitList.findIndex(u => u.id === id);
      if (i < 0) return false;
      unitList.splice(i, 1);
      return true;
    }

    function units() { return unitList.slice(); }

    function unit(id) { return unitList.find(u => u.id === id) || null; }

    function stage(stageId) {
      const hit = allStages().find(x => x.stage.id === stageId);
      return hit ? hit.stage : null;
    }

    // そのステージ・概念が入っている単元（マスコットの先生などを単元ごとに変えるために使う）。なければ null
    function unitOfStage(stageId) {
      return unitList.find(u => list(u.areas).some(a => a && list(a.stages).some(s => s && s.id === stageId))) || null;
    }

    function unitOfConcept(conceptId) {
      return unitList.find(u => list(u.concepts).some(c => c && c.id === conceptId)) || null;
    }

    function concept(conceptId) {
      for (const u of unitList) {
        const c = list(u.concepts).find(x => x && x.id === conceptId);
        if (c) return c;
      }
      return null;
    }

    // 問題は、ステージの warmup・problems・retryPool と、概念の checkPool のどこにあっても探す
    function problem(problemId) {
      for (const { stage: s } of allStages()) {
        const hit = stageProblems(s).find(x => x.problem && x.problem.id === problemId);
        if (hit) return hit.problem;
      }
      for (const u of unitList) {
        for (const c of list(u.concepts)) {
          const p = list(c && c.checkPool).find(x => x && x.id === problemId);
          if (p) return p;
        }
      }
      return null;
    }

    // 領域を order の小さい順に並べ、ステージは配列の順のまま
    function stagesInOrder(unitId) {
      const u = unit(unitId);
      if (!u) return [];
      const areas = list(u.areas).filter(Boolean).sort((a, b) => a.order - b.order);
      const out = [];
      areas.forEach(a => list(a.stages).forEach(s => { if (s) out.push(s); }));
      return out;
    }

    // 同じ領域の次のステージ。領域の末尾なら null
    function nextStage(stageId) {
      const hit = allStages().find(x => x.stage.id === stageId);
      if (!hit) return null;
      const stages = list(hit.area.stages);
      return stages[stages.indexOf(hit.stage) + 1] || null;
    }

    return { register, unregister, units, unit, unitOfStage, unitOfConcept, stage, concept, problem, stagesInOrder, nextStage };
  }

  // ---- 検証 ----

  // fill の空らん 1 つの必須項目: id、kind（'word' か 'number'）。
  // word は options（配列）と answer、number は answer（数値）。tolerance・unit は任意
  function checkBlank(p, b, i, errors) {
    const name = '問題 ' + p.id + '（fill）の blanks[' + i + '] ';
    if (!isObject(b)) { errors.push(name + 'が空らんの形ではありません'); return; }
    const need = (ok, field) => { if (!ok) errors.push(name + 'に ' + field + ' がありません'); };
    need(has(b.id) && b.id !== '', 'id');
    if (!has(b.kind)) { errors.push(name + 'に kind がありません'); return; }
    if (b.kind === 'word') {
      need(Array.isArray(b.options), 'options');
      need(has(b.answer), 'answer');
    } else if (b.kind === 'number') {
      need(typeof b.answer === 'number' && Number.isFinite(b.answer), 'answer（数値）');
    } else {
      errors.push(name + 'の kind ' + b.kind + ' は使えません');
    }
  }

  // 形式ごとの必須項目（Task 2 では存在だけを確かめる）
  function checkTypeFields(p, errors) {
    const name = '問題 ' + p.id + '（' + p.type + '）に ';
    const need = (ok, field) => { if (!ok) errors.push(name + field + ' がありません'); };
    const samples = isObject(p.samples) ? p.samples : {};
    switch (p.type) {
      case 'choice':
        need(Array.isArray(p.options) && p.options.length > 0, 'options');
        need(has(p.answer), 'answer');
        break;
      case 'fill':
        need(typeof p.text === 'string', 'text');
        need(Array.isArray(p.blanks) && p.blanks.length > 0, 'blanks');
        list(p.blanks).forEach((b, i) => checkBlank(p, b, i, errors));
        break;
      case 'figure-choice':
        need(isObject(p.figure), 'figure');
        need(has(p.answer), 'answer');
        break;
      case 'ray-draw':
        ['source', 'hit', 'surface', 'expected'].forEach(f => need(isObject(p[f]), f));
        need(has(samples.correct), 'samples.correct');
        need(has(samples.wrong), 'samples.wrong');
        break;
      case 'drag':
        ['draggable', 'target'].forEach(f => need(isObject(p[f]), f));
        need(has(samples.correct), 'samples.correct');
        need(has(samples.wrong), 'samples.wrong');
        break;
    }
  }

  // 教材を検査し、見つかった問題点をすべて日本語の文の配列で返す（空なら正常）。例外は出さない
  function validateUnit(unit) {
    const errors = [];
    if (!isObject(unit)) return ['単元がオブジェクトではありません'];
    const unitName = '単元 ' + unit.id;
    if (!Array.isArray(unit.concepts)) errors.push(unitName + ' の concepts が配列ではありません');
    if (!Array.isArray(unit.areas)) errors.push(unitName + ' の areas が配列ではありません');

    // 形を確かめながら、ステージ・概念・カード・問題を集める
    const stages = [];
    const concepts = [];
    const cards = [];
    const problems = [];   // { problem, owner }（owner は「ステージ s-a1 の problems[0]」のような場所の名前）

    list(unit.concepts).forEach((c, i) => {
      if (!isObject(c)) { errors.push(unitName + ' の concepts[' + i + '] が概念の形ではありません'); return; }
      concepts.push(c);
    });
    list(unit.areas).forEach((a, i) => {
      if (!isObject(a)) { errors.push(unitName + ' の areas[' + i + '] が領域の形ではありません'); return; }
      if (!Array.isArray(a.stages)) { errors.push('領域 ' + a.id + ' の stages が配列ではありません'); return; }
      a.stages.forEach((s, j) => {
        if (!isObject(s)) { errors.push('領域 ' + a.id + ' の stages[' + j + '] がステージの形ではありません'); return; }
        stages.push(s);
      });
    });

    function addProblem(p, owner) {
      if (!isObject(p)) { errors.push(owner + ' が問題の形ではありません'); return; }
      problems.push({ problem: p, owner });
    }
    stages.forEach(s => {
      const name = 'ステージ ' + s.id;
      ['concepts', 'lessons', 'problems', 'retryPool'].forEach(f => {
        if (!Array.isArray(s[f])) errors.push(name + ' の ' + f + ' が配列ではありません');
      });
      list(s.lessons).forEach((c, i) => {
        if (!isObject(c)) { errors.push(name + ' の lessons[' + i + '] がカードの形ではありません'); return; }
        cards.push(c);
        // 用語の記法 **語句**（js/richtext.js）。閉じていない ** と、中身のない **** を見つける
        if (typeof c.text === 'string') {
          if ((c.text.split('**').length - 1) % 2 === 1) errors.push(name + ' の lessons[' + i + '] の ** が閉じていません');
          if (c.text.indexOf('****') !== -1) errors.push(name + ' の lessons[' + i + '] に空の用語（****）があります');
        }
      });
      if (!has(s.warmup)) errors.push(name + ' に warmup がありません');
      stageProblems(s).forEach(x => addProblem(x.problem, name + ' の ' + x.where));
    });
    concepts.forEach(c => {
      if (!Array.isArray(c.checkPool)) { errors.push('概念 ' + c.id + ' の checkPool が配列ではありません'); return; }
      c.checkPool.forEach((p, i) => addProblem(p, '概念 ' + c.id + ' の checkPool[' + i + ']'));
    });

    // id の重複（ステージ・問題・概念・カードを通して 1 つの名前空間で調べる）
    const seen = new Map();
    function checkId(kind, item, owner) {
      if (!has(item.id) || item.id === '') { errors.push('id のない' + kind + 'があります（' + owner + '）'); return; }
      if (seen.has(item.id)) errors.push('id ' + item.id + ' が重複しています（' + seen.get(item.id) + ' と ' + kind + '）');
      else seen.set(item.id, kind);
    }
    stages.forEach(s => checkId('ステージ', s, unitName));
    concepts.forEach(c => checkId('概念', c, unitName));
    cards.forEach(c => checkId('カード', c, unitName));
    problems.forEach(x => checkId('問題', x.problem, x.owner));

    const conceptIds = new Set(concepts.map(c => c.id));
    const stageIds = new Set(stages.map(s => s.id));

    // problem.concept が定義されている
    problems.forEach(({ problem: p }) => {
      if (!conceptIds.has(p.concept)) errors.push('問題 ' + p.id + ' の概念 ' + p.concept + ' が定義されていません');
    });
    // stage.concepts が定義されている
    stages.forEach(s => list(s.concepts).forEach(cid => {
      if (!conceptIds.has(cid)) errors.push('ステージ ' + s.id + ' の概念 ' + cid + ' が定義されていません');
    }));
    // concept.basic が存在する（null 可）
    concepts.forEach(c => {
      if (c.basic !== null && !conceptIds.has(c.basic)) errors.push('概念 ' + c.id + ' の basic ' + c.basic + ' が定義されていません');
    });
    // concept.lessonStageId のステージが存在する
    concepts.forEach(c => {
      if (!stageIds.has(c.lessonStageId)) errors.push('概念 ' + c.id + ' の lessonStageId ' + c.lessonStageId + ' のステージがありません');
    });
    // 各概念の類題: 全ステージの retryPool のうち、その概念の問題が 2 問以上
    concepts.forEach(c => {
      let n = 0;
      stages.forEach(s => list(s.retryPool).forEach(p => { if (isObject(p) && p.concept === c.id) n++; }));
      if (n < RULES.retryPoolMin) errors.push('概念 ' + c.id + ' の類題（retryPool）が ' + n + ' 問です（' + RULES.retryPoolMin + ' 問以上必要）');
    });
    // 各概念の確認問題が 3 問以上（配列でないことは上で報告済み）
    concepts.forEach(c => {
      if (!Array.isArray(c.checkPool)) return;
      const n = c.checkPool.length;
      if (n < RULES.checkPoolMin) errors.push('概念 ' + c.id + ' の確認問題（checkPool）が ' + n + ' 問です（' + RULES.checkPoolMin + ' 問以上必要）');
    });
    // ステージの problems に図・操作型が 1 問以上（retryPool・checkPool には求めない）
    stages.forEach(s => {
      if (!Array.isArray(s.problems)) return;
      if (!s.problems.some(p => isObject(p) && FIGURE_TYPES.includes(p.type))) {
        errors.push('ステージ ' + s.id + ' に図・操作型の問題（' + FIGURE_TYPES.join(' / ') + '）がありません');
      }
    });
    // ステージの problems 数・レッスン数・warmup の形式
    stages.forEach(s => {
      const name = 'ステージ ' + s.id;
      if (Array.isArray(s.problems)) {
        const n = s.problems.length;
        if (n < RULES.problems[0] || n > RULES.problems[1]) errors.push(name + ' の問題が ' + n + ' 問です（' + RULES.problems[0] + '〜' + RULES.problems[1] + ' 問）');
      }
      if (Array.isArray(s.lessons)) {
        const n = s.lessons.length;
        if (n < RULES.lessons[0] || n > RULES.lessons[1]) errors.push(name + ' のレッスンが ' + n + ' 枚です（' + RULES.lessons[0] + '〜' + RULES.lessons[1] + ' 枚）');
      }
      if (isObject(s.warmup) && s.warmup.type !== 'choice') errors.push(name + ' の warmup が choice ではありません');
    });
    // problem.type が 5 種のどれか
    problems.forEach(({ problem: p }) => {
      if (!PROBLEM_TYPES.includes(p.type)) errors.push('問題 ' + p.id + ' の type ' + p.type + ' は使えません');
    });
    // 形式ごとの必須項目
    problems.forEach(({ problem: p }) => checkTypeFields(p, errors));

    return errors;
  }

  const api = { createRegistry, validateUnit };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { contentRegistry: api, content: createRegistry() });
})(typeof globalThis !== 'undefined' ? globalThis : this);
