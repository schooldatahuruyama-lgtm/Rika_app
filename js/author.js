// AI 教材作成（設計書 13 章）のロジック。画面は js/ui-author.js、API の呼び出しは js/author-api.js
// 先生の入力 → 指示文（計画・ステージごと）→ モデルの JSON → 教材の形に整える → 下書きとして保存・書き出し。
// モデルに作らせる形（AI スキーマ）は SCHEMAS にある。教材の形は js/content-registry.js の validateUnit が通る形。
// どの関数も例外を出さない（欠けた項目は errors に日本語で書く）。
(function (root) {
  'use strict';

  const registry = typeof require === 'function' ? require('./content-registry.js') : root.RikaQuest.contentRegistry;
  const judgeLib = typeof require === 'function' ? require('./judge.js') : root.RikaQuest.judge;

  const DRAFTS_KEY = 'rika-quest:drafts';     // 学習記録 rika-quest:v1 とは別のキー
  const DEFAULT_MODEL = 'claude-opus-5-5';
  const DEFAULT_STAGE_COUNT = 4;
  const STAGE_COUNT = [2, 6];
  const MINUTES = [3, 6];
  const FIELDS = ['物理', '化学', '生物', '地学'];
  const MASCOTS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const KANA = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ'];
  // 図の部品のうち AI に使わせるもの（docs/figures-guide.md の汎用の部品と region）
  const ITEM_TYPES = ['rect', 'circle', 'ellipse', 'line', 'text', 'arrow', 'region'];
  // 教材に入れてはいけない教科書名・出版社名（tests/content-all.test.js と同じ）
  const BOOK_NAMES = /東京書籍|啓林館|大日本図書|教育出版|学校図書|学図|東書|啓林/;

  function list(x) { return Array.isArray(x) ? x : []; }
  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function str(x) { return typeof x === 'string' ? x.trim() : (typeof x === 'number' ? String(x) : ''); }
  function isNum(x) { return typeof x === 'number' && Number.isFinite(x); }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function letter(i) { return String.fromCharCode(97 + i); }   // 0 → 'a'
  function isoOf(now) {
    const d = now instanceof Date ? now : new Date(now === undefined || now === null ? Date.now() : now);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // ---- id ----

  // 英小文字・数字・ハイフンにそろえる（それ以外の文字はハイフンに。前後のハイフンは除く）
  function normId(x) {
    return str(x).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  // ステージ・概念の id は単元の id で始める（ほかの単元の id とぶつからないように）
  function prefixed(id, unitId) {
    if (!id || !unitId || id === unitId || id.indexOf(unitId + '-') === 0) return id;
    return unitId + '-' + id;
  }

  // ---- 先生の入力 ----

  function normalizeInput(input) {
    const i = isObject(input) ? input : {};
    const grade = Number(i.grade);
    const sc = Number(i.stageCount);
    return {
      unitId: normId(i.unitId),
      title: str(i.title),
      grade: [1, 2, 3].includes(grade) ? grade : 1,
      field: FIELDS.includes(i.field) ? i.field : FIELDS[0],
      mascot: MASCOTS.includes(i.mascot) ? i.mascot : MASCOTS[0],
      textbook: str(i.textbook),
      scope: str(i.scope),
      notes: str(i.notes),
      stageCount: Number.isInteger(sc) ? clamp(sc, STAGE_COUNT[0], STAGE_COUNT[1]) : DEFAULT_STAGE_COUNT,
    };
  }

  // 入力の足りない点（画面で「計画を作る」の前に見せる）
  function validateInput(input) {
    const errors = [];
    const i = isObject(input) ? input : {};
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(str(i.unitId))) errors.push('単元の id は英小文字・数字・ハイフンで書いてください（例: magnet）');
    if (str(i.title) === '') errors.push('単元名を書いてください');
    if (![1, 2, 3].includes(Number(i.grade))) errors.push('学年は 1〜3 です');
    if (!FIELDS.includes(i.field)) errors.push('分野は 物理・化学・生物・地学 のどれかです');
    return errors;
  }

  // ---- モデルに作らせる形（JSON Schema）----
  // すべての object に additionalProperties:false と required。数値・文字数の制約は書かない（説明文で伝える）

  function obj(properties, required) {
    return { type: 'object', additionalProperties: false, properties, required: required || Object.keys(properties) };
  }
  const S = { type: 'string' };
  const N = { type: 'number' };
  const I = { type: 'integer' };
  const B = { type: 'boolean' };
  const arr = (items) => ({ type: 'array', items });
  const tag = (v) => ({ type: 'string', enum: [v] });
  const ref = (name) => ({ $ref: '#/$defs/' + name });
  const COMMON = { concept: S, prompt: S, explanation: S, hint: S, term: B };

  // 図の部品: type だけ必須、ほかはすべて省略可
  const PART = obj({
    type: { type: 'string', enum: ITEM_TYPES },
    id: S, x: N, y: N, width: N, height: N, r: N, rx: N, ry: N,
    points: arr(arr(N)),
    text: S, label: S, fill: S, stroke: S, color: S, anchor: S, size: N,
  }, ['type']);

  const STAGE_DEFS = {
    choice: obj(Object.assign({ type: tag('choice') }, COMMON, { options: arr(S), answer: I })),
    fill: obj(Object.assign({ type: tag('fill') }, COMMON, {
      text: S,
      blanks: arr({ anyOf: [
        obj({ id: S, kind: tag('word'), options: arr(S), answer: S }),
        obj({ id: S, kind: tag('number'), answer: N, tolerance: N, unit: S }),
      ] }),
    })),
    figureChoice: obj(Object.assign({ type: tag('figure-choice') }, COMMON, {
      boxes: arr(S), answer: I, items: { anyOf: [{ type: 'null' }, arr(ref('part'))] },
    })),
    part: PART,
    problem: { anyOf: [ref('choice'), ref('fill'), ref('figureChoice')] },
  };

  const SCHEMAS = {
    plan: obj({
      unitTitle: S,
      areas: arr(obj({ id: S, title: S })),
      stages: arr(obj({ id: S, areaId: S, title: S, minutes: I, concepts: arr(S), goal: S })),
      concepts: arr(obj({ id: S, title: S, basic: { anyOf: [S, { type: 'null' }] }, lessonStageId: S })),
    }),
    stage: Object.assign({ $defs: STAGE_DEFS }, obj({
      lessons: arr(obj({ text: S })),
      warmup: ref('choice'),
      problems: arr(ref('problem')),
      retryPool: arr(ref('problem')),
      checkPool: arr(obj({ concept: S, problems: arr(ref('problem')) })),
    })),
  };

  // ---- 指示文 ----

  function commonRules(inp) {
    return [
      'あなたは日本の中学校理科の先生を手伝う教材作成の助手です。中学' + inp.grade + '年の生徒が使う学習アプリ「理科クエスト」の教材（' + inp.field + '分野）を作ります。',
      '',
      '# 書き方の決まり',
      '- 日本語で、中学' + inp.grade + '年の生徒が読んでわかる言葉で書く。むずかしい言葉には短い説明をそえる。',
      '- 大切な用語は **用語** のように ** で囲む（カードの文と解説だけに使う。** は必ず閉じる。図の文字・選択肢・穴埋めの文には使わない）。',
      '- 正解を当てさせるだけでなく、理由や考え方を問う問題を入れる。',
      '- 解説（explanation）は、正解の理由と、まちがえやすい答えがなぜちがうのかを、ていねいに書く。ヒント（hint）は答えを言わずに考える手がかりを書く。',
      '- 実験や観察を扱うときは、安全の注意（保護めがね、火・熱い器具、薬品、換気、太陽を直接見ない など）を入れる。',
      '- 教科書の本文・図・問題を写さない。教科書名と学習範囲は、内容の範囲と順番を合わせるためだけに使い、文章と問題はすべて自分の言葉で新しく作る。教科書名・出版社名を教材の文に書かない。',
      '- 先生のプリントは内容の参考にする。文をそのまま写さず、要点を自分の言葉で書き直す。',
      '- 中学校の学習指導要領の範囲で、確かな事実だけを書く。',
      '- id は英小文字・数字・ハイフンだけで書き、単元の id「' + inp.unitId + '」で始める（例: ' + inp.unitId + '-1）。',
      '- 出力は JSON だけ。前後に説明の文やコードのかこみ（```）を付けない。',
    ];
  }

  const PLAN_RULES = [
    '',
    '# 今回作るもの: 単元の計画',
    '次の形の JSON を 1 つ出力する。',
    '{ "unitTitle": 単元名,',
    '  "areas": [{ "id", "title" }]（領域。1〜3 個）,',
    '  "stages": [{ "id", "areaId"（areas の id）, "title", "minutes"（3〜6 の整数。1 ステージで学ぶ分）, "concepts": [概念の id（1〜2 個）], "goal"（このステージのねらいを 1 文で） }],',
    '  "concepts": [{ "id", "title", "basic"（前提になる概念の id。なければ null）, "lessonStageId"（その概念を初めて学ぶステージの id。そのステージの concepts にも入れる） }] }',
    '- stages は指定された数ちょうど。学ぶ順に並べ、やさしい内容から少しずつ進める。1 ステージはカード 2〜4 枚と問題 4〜6 問で終わる量にする。',
    '- concepts はステージ数〜ステージ数の 2 倍の個数。どの概念も、どこかのステージの concepts に入れる。',
  ];

  const STAGE_RULES = [
    '',
    '# 問題の形',
    'どの問題にも concept（概念の id）、prompt（問題文）、explanation（解説）、hint（ヒント）、term（用語を答える問題なら true、ほかは false）を付け、type で形を区別する。',
    '- 選択 { "type": "choice", "options": [選択肢の文（3〜4 個）], "answer": 正解の番号（0 から数える） }',
    '- 穴埋め { "type": "fill", "text": 穴のある文（穴は [b1] [b2] と書く）, "blanks": [穴ごとの答え] }',
    '  言葉の穴 { "id": "b1", "kind": "word", "options": [言葉（3 個）], "answer": 正解の言葉（options のどれか） }',
    '  数の穴 { "id": "b2", "kind": "number", "answer": 数, "tolerance": 許す誤差（ふつう 0）, "unit": 単位（なければ ""） }',
    '- 図から選ぶ { "type": "figure-choice", "boxes": [ア・イ・ウ・エの枠に入れる短い文（2〜4 個。1 つ 20 字以内）], "answer": 正解の枠の番号（0 から）, "items": null }',
    '  簡単な図を描きたいときだけ、items に図の部品を並べる（図は 320×240。x は右、y は下向きに増える）。部品:',
    '  rect { x, y, width, height, fill, stroke, rx, label }（(x,y) は左上）、circle { x, y, r, fill, stroke, label }、ellipse { x, y, rx, ry, fill, stroke, label }、',
    '  line { points: [[x,y],...], color, width }、text { x, y, text, size（13 以上）, anchor（start / middle / end）, color }、arrow { points: [[x1,y1],[x2,y2]], color, width, label }、',
    '  region { id: "r1"…, x, y, label: "ア"… }（生徒がタップして選ぶ場所。2〜4 個置く）。色は ink, blue, gray, green, orange, red, yellow, sky, white, brown, sand, glass などの名前。',
    '  items を使うときの answer は、正解の region の番号（items の中の region を前から 0, 1, 2… と数える）。',
    '',
    '# 今回作るもの: 1 ステージ分の教材',
    '{ "lessons": [{ "text": カードの文（80〜160 字。用語は **用語**） }]（2〜4 枚。ステージのねらいを順に説明する）,',
    '  "warmup": 学ぶ前に予想させる選択問題（choice）1 問,',
    '  "problems": [問題（4〜6 問）。うち 1 問は term: true の穴埋め（このステージの用語を答える）、1 問以上は figure-choice],',
    '  "retryPool": [まちがえたときの類題。このステージの概念ごとに 2 問以上。problems と同じ問題にせず、場面や数を変える],',
    '  "checkPool": [{ "concept": 概念の id, "problems": [後日の確認問題（3 問以上）] }]（指定された概念ごとに 1 つ。指定がなければ []） }',
  ];

  function inputLines(inp) {
    return [
      '単元の id: ' + inp.unitId,
      '単元名: ' + inp.title,
      '学年: 中学' + inp.grade + '年',
      '分野: ' + inp.field,
      '教科書: ' + (inp.textbook || '（指定なし）'),
      '学習範囲: ' + (inp.scope || '（指定なし）'),
      '先生の注意: ' + (inp.notes || '（なし）'),
      'ステージの数: ' + inp.stageCount,
    ];
  }

  function materialLines(materials) {
    const ms = list(materials).filter(isObject);
    if (ms.length === 0) return ['', '# 先生のプリント', '（なし）'];
    const out = ['', '# 先生のプリント'];
    ms.forEach((m, i) => {
      const name = str(m.name) || ('プリント ' + (i + 1));
      if (m.kind === 'text') out.push('', '## ' + name, String(m.text || ''));
      else out.push('', '## ' + name + '（' + (m.kind === 'pdf' ? 'PDF' : '画像') + '。このメッセージに添付）');
    });
    return out;
  }

  function buildPlanPrompt(input, materials) {
    const inp = normalizeInput(input);
    const system = commonRules(inp).concat(PLAN_RULES).join('\n');
    const user = ['# 単元', ...inputLines(inp), ...materialLines(materials), '',
      'この単元の計画を、ステージ ' + inp.stageCount + ' 個で作ってください。'].join('\n');
    return { system, user };
  }

  function buildStagePrompt(input, plan, stageIndex, materials) {
    const inp = normalizeInput(input);
    const system = commonRules(inp).concat(STAGE_RULES).join('\n');
    const p = isObject(plan) ? plan : { areas: [], stages: [], concepts: [] };
    const stages = list(p.stages);
    const s = stages[stageIndex] || {};
    const concepts = list(p.concepts);
    const title = (cid) => { const c = concepts.find(x => x && x.id === cid); return c ? c.title : ''; };
    const owned = concepts.filter(c => c && c.lessonStageId === s.id).map(c => c.id);
    const area = list(p.areas).find(a => a && a.id === s.areaId);
    const prev = stages[stageIndex - 1], next = stages[stageIndex + 1];
    const user = ['# 単元', ...inputLines(inp), '',
      '# 単元の計画（全体）', JSON.stringify(p), '',
      '# このステージの担当',
      'ステージ ' + (stageIndex + 1) + ' / ' + stages.length + ': ' + str(s.id) + '「' + str(s.title) + '」（領域「' + (area ? area.title : '') + '」、' + s.minutes + ' 分）',
      'ねらい: ' + str(s.goal),
      '前のステージ: ' + (prev ? prev.title : '（なし。単元の最初）'),
      '次のステージ: ' + (next ? next.title : '（なし。単元の最後）'),
      'このステージの概念（問題の concept にはこの id を使う）: ' + list(s.concepts).map(c => c + '（' + title(c) + '）').join('、'),
      'retryPool を作る概念（それぞれ 2 問以上）: ' + list(s.concepts).join('、'),
      'checkPool を作る概念（それぞれ 3 問以上）: ' + (owned.length ? owned.join('、') : '（なし。checkPool は []）'),
      ...materialLines(materials), '',
      'このステージの教材を作ってください。'].join('\n');
    return { system, user };
  }

  // チャットに貼るための 1 本の文字列
  function promptText(prompt) {
    const p = isObject(prompt) ? prompt : {};
    return '--- 指示 ---\n' + String(p.system || '') + '\n\n--- 入力 ---\n' + String(p.user || '') + '\n';
  }

  // ---- モデルの出力を読む ----

  function tryParse(t) {
    try {
      const v = JSON.parse(t);
      return v !== null && typeof v === 'object' ? v : null;
    } catch (e) { return null; }
  }

  // ```json のかこみや前後の文を取り除いて読む。読めなければ null
  function parseJson(text) {
    if (typeof text !== 'string') return null;
    const t = text.trim();
    let v = tryParse(t);
    if (v) return v;
    const fence = t.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
    if (fence) { v = tryParse(fence[1].trim()); if (v) return v; }
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a !== -1 && b > a) { v = tryParse(t.slice(a, b + 1)); if (v) return v; }
    return null;
  }

  // ---- 計画を整える ----

  function normalizePlan(o, input) {
    const inp = normalizeInput(input);
    const errors = [];
    if (!isObject(o)) return { plan: null, errors: ['計画が JSON のオブジェクトではありません'] };

    // 領域（id は英小文字。重複・空は付けなおす）
    const areaMap = new Map();   // モデルの id → 整えた id
    const areas = [];
    list(o.areas).forEach((a, i) => {
      if (!isObject(a)) return;
      let id = normId(a.id);
      if (!id || areas.some(x => x.id === id)) id = 'area-' + (i + 1);
      areaMap.set(str(a.id), id);
      areas.push({ id, title: str(a.title) || ('領域 ' + (i + 1)) });
    });
    if (areas.length === 0) errors.push('計画に領域（areas）がありません');

    // ステージ
    const stageMap = new Map();
    const rawStages = list(o.stages).filter(isObject);
    const stages = [];
    rawStages.forEach((s, i) => {
      let id = prefixed(normId(s.id), inp.unitId);
      if (!id || stages.some(x => x.id === id)) id = prefixed(String(i + 1), inp.unitId) || ('stage-' + (i + 1));
      while (stages.some(x => x.id === id)) id += '-' + (i + 1);
      stageMap.set(str(s.id), id);
      const m = Math.round(Number(s.minutes));
      stages.push({
        id, rawAreaId: str(s.areaId), rawConcepts: list(s.concepts),
        title: str(s.title) || ('ステージ ' + (i + 1)),
        minutes: Number.isFinite(m) ? clamp(m, MINUTES[0], MINUTES[1]) : 5,
        goal: str(s.goal),
      });
    });
    if (stages.length !== inp.stageCount) errors.push('ステージが ' + stages.length + ' 個です（' + inp.stageCount + ' 個にしてください）');

    // 概念
    const conceptMap = new Map();
    const rawConcepts = list(o.concepts).filter(isObject);
    const concepts = [];
    rawConcepts.forEach((c, i) => {
      let id = prefixed(normId(c.id), inp.unitId);
      if (!id || concepts.some(x => x.id === id)) id = prefixed('concept-' + (i + 1), inp.unitId);
      conceptMap.set(str(c.id), id);
      concepts.push({ id, title: str(c.title) || ('概念 ' + (i + 1)), rawBasic: c.basic, rawLesson: str(c.lessonStageId) });
    });
    if (concepts.length === 0) errors.push('計画に概念（concepts）がありません');

    // モデルの id（そのまま・整えたもの）から、整えた id を引く
    const resolver = (map, finals) => (raw) => {
      if (raw === null || raw === undefined) return null;
      if (map.has(str(raw))) return map.get(str(raw));
      const n = prefixed(normId(raw), inp.unitId);
      return finals.includes(n) ? n : null;
    };
    const conceptIds = concepts.map(c => c.id);
    const stageIds = stages.map(s => s.id);
    const toConcept = resolver(conceptMap, conceptIds);
    const toStage = resolver(stageMap, stageIds);
    const toArea = (raw) => areaMap.has(str(raw)) ? areaMap.get(str(raw)) : (areas.find(a => a.id === normId(raw)) || {}).id || null;

    stages.forEach(s => {
      const areaId = toArea(s.rawAreaId);
      if (!areaId) errors.push('ステージ「' + s.title + '」の領域 ' + (s.rawAreaId || '（なし）') + ' が計画にありません');
      s.areaId = areaId || '';
      s.concepts = [];
      s.rawConcepts.forEach(rc => {
        const cid = toConcept(rc);
        if (!cid) errors.push('ステージ「' + s.title + '」の概念 ' + str(rc) + ' が計画にありません');
        else if (!s.concepts.includes(cid)) s.concepts.push(cid);
      });
      delete s.rawAreaId; delete s.rawConcepts;
    });

    concepts.forEach(c => {
      // basic（前提の概念）は null か計画にある概念
      if (c.rawBasic === null || c.rawBasic === undefined || str(c.rawBasic) === '') c.basic = null;
      else {
        const b = toConcept(c.rawBasic);
        if (!b || b === c.id) { errors.push('概念「' + c.title + '」の basic ' + str(c.rawBasic) + ' が計画にありません'); c.basic = null; }
        else c.basic = b;
      }
      // lessonStageId: 無い・知らない id なら、その概念を扱う最初のステージにする
      let ls = toStage(c.rawLesson);
      if (!ls) { const first = stages.find(s => s.concepts.includes(c.id)); ls = first ? first.id : null; }
      if (!ls) errors.push('概念「' + c.title + '」の lessonStageId ' + (c.rawLesson || '（なし）') + ' のステージがありません');
      else {
        // 初めて学ぶステージの concepts に入れる（そのステージで類題・確認問題を作るため）
        const st = stages.find(s => s.id === ls);
        if (!st.concepts.includes(c.id)) st.concepts.push(c.id);
      }
      c.lessonStageId = ls || '';
      delete c.rawBasic; delete c.rawLesson;
    });
    stages.forEach(s => { if (s.concepts.length === 0) errors.push('ステージ「' + s.title + '」に概念がありません'); });

    // ステージと概念の id は同じ名前空間（validateUnit）
    stageIds.forEach(id => { if (conceptIds.includes(id)) errors.push('id ' + id + ' がステージと概念で重なっています'); });

    // ステージのない領域は外す
    const usedAreas = areas.filter(a => stages.some(s => s.areaId === a.id));

    const plan = {
      unitTitle: str(o.unitTitle) || inp.title,
      areas: usedAreas,
      stages: stages.map(s => ({ id: s.id, areaId: s.areaId, title: s.title, minutes: s.minutes, concepts: s.concepts, goal: s.goal })),
      concepts: concepts.map(c => ({ id: c.id, title: c.title, basic: c.basic, lessonStageId: c.lessonStageId })),
    };
    return { plan, errors };
  }

  // ---- 図 ----

  // 文を perLine 文字までの行に分ける。行の前後の空白は取り除く（行の先頭が空白にならない）。
  // maxLines を超える分は、最後の行の末尾を「…」にする。空の文は []
  function wrap(text, perLine, maxLines) {
    const chars = Array.from(String(text));
    const isSpace = (c) => /\s/.test(c);
    const out = [];
    let i = 0;
    while (i < chars.length) {
      while (i < chars.length && isSpace(chars[i])) i++;   // 行の先頭の空白は送らない
      if (i >= chars.length) break;
      const ln = chars.slice(i, i + perLine).join('').replace(/\s+$/, '');
      out.push(ln);
      i += perLine;
    }
    if (maxLines && out.length > maxLines) {
      const last = Array.from(out[maxLines - 1]);
      out.length = maxLines;
      out[maxLines - 1] = (last.length >= perLine ? last.slice(0, perLine - 1) : last).join('').replace(/\s+$/, '') + '…';
    }
    return out;
  }

  // ア・イ・ウ・エの枠の図（320×240）。枠 2〜3 は横に 1 列、4 は 2×2
  function boxesScene(labels) {
    const texts = list(labels).map(str).slice(0, 4);
    const n = Math.max(texts.length, 1);
    const M = 8, G = 8, SIZE = 13, LINE = 18, TOP = 70;
    const cols = n === 4 ? 2 : n;
    const rows = n === 4 ? 2 : 1;
    // 2×2 は上下の余白とすきまを狭くして枠を高くする（3 行目の文字が枠の線にかからないように）
    const MY = rows === 2 ? 4 : M, GY = rows === 2 ? 6 : G;
    const w = (320 - M * 2 - G * (cols - 1)) / cols;
    const h = (240 - MY * 2 - GY * (rows - 1)) / rows;
    // 1 行の文字数: 12 文字まで、枠の幅に収まる数。行の数: 2×2 は 3 行まで、ほかは枠の高さに収まる数
    const perLine = Math.max(1, Math.min(12, Math.floor((w - 12) / SIZE)));
    const maxLines = n === 4 ? 3 : Math.max(1, Math.floor((h - TOP) / LINE) + 1);
    const items = [];
    const regions = [];
    texts.forEach((t, k) => {
      const x = Math.round(M + (k % cols) * (w + G));
      const y = Math.round(MY + Math.floor(k / cols) * (h + GY));
      items.push({ type: 'rect', x, y, width: Math.round(w), height: Math.round(h), fill: 'white', stroke: 'line', rx: 10 });
      const lines = wrap(t, perLine, maxLines);
      const top = y + TOP;   // 1 行目の baseline。左上の丸（region。中心 y+26・半径 22）と重ならないように
      lines.forEach((ln, j) => items.push({ type: 'text', x: Math.round(x + w / 2), y: top + j * LINE, text: ln, size: SIZE, anchor: 'middle' }));
      regions.push({ type: 'region', id: 'r' + (k + 1), x: x + 26, y: y + 26, r: 22, label: KANA[k] });
    });
    return { width: 320, height: 240, items: items.concat(regions) };
  }

  const COLOR_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|none|[a-zA-Z]+)$/;
  function color(v) { return typeof v === 'string' && COLOR_RE.test(v.trim()) ? v.trim() : undefined; }
  function pointsOf(v) {
    const ps = list(v).filter(p => Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1])).map(p => [p[0], p[1]]);
    return ps.length >= 2 ? ps : null;
  }

  // モデルの図の部品を、描ける形だけに整える（知らない type・座標の欠けたものは捨てる）
  function sanitizeItem(it) {
    if (!isObject(it) || !ITEM_TYPES.includes(it.type)) return null;
    const out = { type: it.type };
    const nums = (keys) => keys.every(k => isNum(it[k]));
    const copyNum = (k) => { if (isNum(it[k])) out[k] = it[k]; };
    const copyStr = (k) => { if (typeof it[k] === 'string' && it[k].trim() !== '') out[k] = it[k].trim(); };
    const copyColor = (k) => { const c = color(it[k]); if (c) out[k] = c; };
    if (typeof it.id === 'string' && it.id.trim() !== '') out.id = it.id.trim();
    switch (it.type) {
      case 'rect':
        if (!nums(['x', 'y', 'width', 'height'])) return null;
        ['x', 'y', 'width', 'height', 'rx'].forEach(copyNum); ['fill', 'stroke'].forEach(copyColor); copyStr('label');
        break;
      case 'circle':
        if (!nums(['x', 'y', 'r'])) return null;
        ['x', 'y', 'r'].forEach(copyNum); ['fill', 'stroke'].forEach(copyColor); copyStr('label');
        break;
      case 'ellipse':
        if (!nums(['x', 'y', 'rx', 'ry'])) return null;
        ['x', 'y', 'rx', 'ry'].forEach(copyNum); ['fill', 'stroke'].forEach(copyColor); copyStr('label');
        break;
      case 'line': {
        const ps = pointsOf(it.points);
        if (!ps) return null;
        out.points = ps; copyColor('color'); copyNum('width');
        break;
      }
      case 'text':
        if (!nums(['x', 'y']) || typeof it.text !== 'string' || it.text.trim() === '') return null;
        out.x = it.x; out.y = it.y; out.text = it.text.trim();
        out.size = isNum(it.size) ? Math.max(13, it.size) : 14;
        if (['start', 'middle', 'end'].includes(it.anchor)) out.anchor = it.anchor;
        copyColor('color');
        break;
      case 'arrow': {
        // スキーマでは points: [[x1,y1],[x2,y2]] で受ける（x1〜y2 があればそれを使う）
        let a = null;
        if (nums(['x1', 'y1', 'x2', 'y2'])) a = [[it.x1, it.y1], [it.x2, it.y2]];
        else { const ps = pointsOf(it.points); if (ps) a = [ps[0], ps[ps.length - 1]]; }
        if (!a) return null;
        out.x1 = a[0][0]; out.y1 = a[0][1]; out.x2 = a[1][0]; out.y2 = a[1][1];
        copyColor('color'); copyNum('width'); copyStr('label');
        break;
      }
      case 'region':
        if (!nums(['x', 'y'])) return null;
        out.x = it.x; out.y = it.y; out.r = Math.max(22, isNum(it.r) ? it.r : 22); copyStr('label');
        break;
    }
    return out;
  }

  // ---- 問題を整える ----

  // 正解の番号: 整数・数字の文字列・'a'〜'd'。読めなければ -1
  function indexOf(answer, texts) {
    if (Number.isInteger(answer)) return answer;
    const s = str(answer);
    if (/^\d+$/.test(s)) return Number(s);
    if (/^[a-z]$/.test(s)) return s.charCodeAt(0) - 97;
    const k = list(texts).indexOf(s);
    return k;
  }

  // 選択肢・枠の文。空のものも除かない（除くと正解の番号がずれるため。空は errors に出す）
  function optionTexts(v) {
    return list(v).map(o => isObject(o) ? str(o.text) : str(o));
  }

  // 空の選択肢（choice の options、枠選びの枠の文）の errors。番号は 1 から
  function emptyOptionErrors(p) {
    if (!isObject(p)) return [];
    const name = '問題 ' + p.id;
    let texts = null;
    if (p.type === 'choice') texts = list(p.options).map(o => (isObject(o) ? str(o.text) : ''));
    else if (p.type === 'figure-choice') texts = boxTexts(p.figure);
    return (texts || []).map((t, i) => (t === '' ? name + ' の選択肢 ' + (i + 1) + ' が空です' : null)).filter(Boolean);
  }

  // 枠選び（boxesScene）の形の図なら、枠ごとの文（行をつないだもの）。ちがう形なら null
  function boxTexts(fig) {
    if (!isObject(fig)) return null;
    const groups = [];
    for (const it of list(fig.items)) {
      if (!isObject(it)) return null;
      if (it.type === 'rect') groups.push('');
      else if (it.type === 'text') { if (groups.length === 0) return null; groups[groups.length - 1] += str(it.text); }
      else if (it.type !== 'region') return null;
    }
    return groups.length >= 2 ? groups : null;
  }

  function fixStars(text) {
    let t = String(text === undefined || text === null ? '' : text);
    t = t.split('****').join('');
    if ((t.split('**').length - 1) % 2 === 1) t = t.split('**').join('');
    return t;
  }

  function base(p, id, type, conceptOf) {
    const out = {
      id, type, concept: conceptOf(p.concept),
      prompt: str(p.prompt),
      figure: null,
      explanation: fixStars(str(p.explanation)),
      hint: fixStars(str(p.hint)),
    };
    if (p.term === true) out.term = true;
    return out;
  }

  function toChoice(p, id, conceptOf, texts) {
    const out = base(p, id, 'choice', conceptOf);
    const t = texts || optionTexts(p.options);
    out.options = t.map((text, i) => ({ id: letter(i), text }));
    const k = indexOf(p.answer, t);
    out.answer = k >= 0 ? letter(k) : null;
    return out;
  }

  // 選択肢の文を枠の図にした figure-choice。answerIndex は正解の枠の番号
  function boxesProblem(out, texts, answerIndex) {
    out.type = 'figure-choice';
    out.figure = boxesScene(texts);
    out.answer = answerIndex >= 0 && answerIndex < texts.length ? 'r' + (answerIndex + 1) : null;
    return out;
  }

  // fill の空らん id を b1, b2, … に付け直し、本文の [元の id] も同じ順で [bN] に置きかえる
  // （js/ui-problems.js は英数字・_・- の id だけを空らんとして描くため）。本文に無い id は errs に書く
  function renumberBlanks(text, rawBlanks, name, errs) {
    const marks = [];
    let t = text;
    const seen = new Set();
    const blanks = rawBlanks.map((b, i) => {
      const orig = str(b.id) || ('b' + (i + 1));
      const bid = 'b' + (i + 1);
      const token = '[' + orig + ']';
      if (seen.has(orig)) errs.push(name + ' の空らん ' + orig + ' が重複しています');
      else if (t.indexOf(token) === -1) errs.push(name + ' の空らん ' + orig + ' が本文にありません');
      else {
        // いったん印に置きかえる（[b2]→[b1] と [b1]→[b2] のような入れかえでぶつからないように）
        const mark = '\u0000' + i + '\u0000';
        t = t.split(token).join(mark);
        marks.push([mark, '[' + bid + ']']);
      }
      seen.add(orig);
      return Object.assign({}, b, { id: bid });
    });
    marks.forEach(([mark, to]) => { t = t.split(mark).join(to); });
    return { text: t, blanks };
  }

  // モデルの問題 1 つを教材の形に。kind 'choice' なら選択問題として読む（warmup）
  // errs（省略可）には、整えるときに見つけた直すところを書く
  function normalizeProblem(p, id, conceptOf, kind, errs) {
    const errors = Array.isArray(errs) ? errs : [];
    if (!isObject(p)) return null;
    const type = kind === 'choice' && p.type !== 'fill' ? 'choice' : p.type;
    if (type === 'choice') {
      const texts = Array.isArray(p.options) ? optionTexts(p.options) : optionTexts(p.boxes);
      return toChoice(p, id, conceptOf, texts);
    }
    if (type === 'fill') {
      const out = base(p, id, 'fill', conceptOf);
      const rb = renumberBlanks(str(p.text), list(p.blanks).filter(isObject), '問題 ' + id, errors);
      out.text = rb.text;
      out.blanks = rb.blanks.map((b) => {
        const bid = b.id;
        if (b.kind === 'number') {
          const nb = { id: bid, kind: 'number', answer: Number(b.answer), tolerance: isNum(b.tolerance) && b.tolerance >= 0 ? b.tolerance : 0 };
          if (str(b.unit) !== '') nb.unit = str(b.unit);
          return nb;
        }
        // 言葉の穴は正解を文で持つので、空の言葉は除いてよい
        return { id: bid, kind: str(b.kind) || 'word', options: optionTexts(b.options).filter(t => t !== ''), answer: str(b.answer) };
      });
      return out;
    }
    if (type === 'figure-choice') {
      const boxes = optionTexts(p.boxes).slice(0, 4);
      const items = Array.isArray(p.items) ? p.items.slice(0, 80).map(sanitizeItem).filter(Boolean) : [];
      const regions = items.filter(it => it.type === 'region');
      const k = indexOf(p.answer, boxes);
      if (regions.length >= 2) {
        // 図の部品の region を選択肢にする（id・ア イ… がなければ付ける）
        const used = new Set();
        regions.forEach((r, i) => {
          if (!/^[a-z0-9-]+$/i.test(r.id || '') || used.has(r.id)) r.id = 'r' + (i + 1);
          while (used.has(r.id)) r.id += 'x';
          used.add(r.id);
          if (!r.label) r.label = KANA[i] || String(i + 1);
        });
        const out = base(p, id, 'figure-choice', conceptOf);
        out.figure = { width: 320, height: 240, items };
        out.answer = k >= 0 && k < regions.length ? regions[k].id : null;
        return out;
      }
      if (boxes.length >= 2) return boxesProblem(base(p, id, 'figure-choice', conceptOf), boxes, k);
      // 枠が 2 つ未満なら選択問題に落とす
      return toChoice(p, id, conceptOf, boxes);
    }
    // 知らない形は入れない（下書きの検査 isDraft が通らず、保存で下書きごと落ちるため）
    errors.push('問題 ' + id + ' の形式（' + (str(p.type) || 'なし') + '）は使えないため、入れませんでした');
    return null;
  }

  // ---- ステージを整える ----

  function normalizeStage(o, plan, stageIndex, input) {
    const errors = [];
    const ps = isObject(plan) ? list(plan.stages)[stageIndex] : null;
    if (!ps) return { stage: null, checkPool: {}, errors: ['計画にステージ ' + (stageIndex + 1) + ' がありません'] };
    if (!isObject(o)) return { stage: null, checkPool: {}, errors: ['ステージ「' + ps.title + '」の出力が JSON のオブジェクトではありません'] };
    const inp = normalizeInput(input);
    const sid = ps.id;
    const planConcepts = list(plan.concepts).filter(isObject).map(c => c.id);
    // 問題の concept: 計画の id にそろえる。知らない id で、ステージの概念が 1 つならそれにする
    const conceptOf = (raw) => {
      const n = prefixed(normId(raw), inp.unitId);
      if (planConcepts.includes(n)) return n;
      return ps.concepts.length === 1 ? ps.concepts[0] : (n || str(raw));
    };
    const name = 'ステージ「' + ps.title + '」';

    const lessons = list(o.lessons).map(c => isObject(c) ? c.text : c)
      .filter(t => typeof t === 'string' && t.trim() !== '')
      .map((t, i) => ({ id: sid + '-c' + (i + 1), text: fixStars(t.trim()), figure: null }));
    if (lessons.length < 2 || lessons.length > 4) errors.push(name + ' のカードが ' + lessons.length + ' 枚です（2〜4 枚）');

    const warmup = normalizeProblem(o.warmup, sid + '-w1', conceptOf, 'choice', errors);
    if (!warmup || warmup.type !== 'choice') errors.push(name + ' の予想問題（warmup）が選択問題ではありません');

    let pn = 0, tn = 0;
    const problems = list(o.problems).map(p => {
      const id = isObject(p) && p.term === true ? sid + '-t' + (++tn) : sid + '-p' + (++pn);
      return normalizeProblem(p, id, conceptOf, undefined, errors);
    }).filter(Boolean);
    if (problems.length < 4 || problems.length > 6) errors.push(name + ' の問題が ' + problems.length + ' 問です（4〜6 問）');
    if (!problems.some(p => p.term === true)) errors.push(name + ' に用語の問題（term）がありません');

    // 図から選ぶ問題がなければ、用語でない最初の選択問題（選択肢 2〜4）を枠選びに変える（教材の決まり）
    if (!problems.some(p => p.type === 'figure-choice')) {
      const c = problems.find(p => p.type === 'choice' && p.term !== true && p.options.length >= 2 && p.options.length <= 4);
      if (c) {
        const texts = c.options.map(x => x.text);
        const k = c.options.findIndex(x => x.id === c.answer);
        delete c.options;
        boxesProblem(c, texts, k);
      } else errors.push(name + ' に図から選ぶ問題（figure-choice）がなく、変えられる選択問題もありません');
    }

    const retryPool = list(o.retryPool).map((p, i) => normalizeProblem(p, sid + '-r' + (i + 1), conceptOf, undefined, errors)).filter(Boolean);
    ps.concepts.forEach(cid => {
      const n = retryPool.filter(p => p.concept === cid).length;
      if (n < 2) errors.push(name + ' の概念 ' + cid + ' の類題（retryPool）が ' + n + ' 問です（2 問以上）');
    });

    // 確認問題は、このステージで初めて学ぶ概念の分だけ受け取る（ほかのステージの分と id がぶつからないように）
    const owned = list(plan.concepts).filter(c => isObject(c) && c.lessonStageId === sid).map(c => c.id);
    const checkPool = {};
    list(o.checkPool).forEach(e => {
      if (!isObject(e)) return;
      const cid = prefixed(normId(e.concept), inp.unitId);
      if (!owned.includes(cid)) return;
      const start = (checkPool[cid] || []).length;
      const ps2 = list(e.problems).map((p, i) => normalizeProblem(p, cid + '-k' + (start + i + 1), () => cid, undefined, errors)).filter(Boolean);
      checkPool[cid] = (checkPool[cid] || []).concat(ps2);
    });
    owned.forEach(cid => {
      const n = (checkPool[cid] || []).length;
      if (n < 3) errors.push(name + ' の概念 ' + cid + ' の確認問題（checkPool）が ' + n + ' 問です（3 問以上）');
      if (!checkPool[cid]) checkPool[cid] = [];
    });

    // 空の選択肢・枠（枠選びに変えたあとで見る）
    [warmup].concat(problems, retryPool, ...Object.keys(checkPool).map(k => checkPool[k]))
      .forEach(p => emptyOptionErrors(p).forEach(e => errors.push(e)));

    const stage = {
      id: sid, areaId: ps.areaId, title: ps.title, minutes: ps.minutes, concepts: ps.concepts.slice(),
      lessons, warmup: warmup || null, problems, retryPool,
    };
    return { stage, checkPool, errors };
  }

  // ---- 単元に組む ----

  // 問題ごとの検査（validateUnit が見ない、正解と選択肢の食いちがいなど）
  function checkProblem(p) {
    const errors = [];
    if (!isObject(p)) return errors;
    const name = '問題 ' + p.id;
    if (str(p.prompt) === '') errors.push(name + ' に問題文がありません');
    if (str(p.explanation) === '') errors.push(name + ' に解説がありません');
    if (str(p.hint) === '') errors.push(name + ' にヒントがありません');
    if (p.type === 'choice') {
      const opts = list(p.options);
      if (opts.length < 2) errors.push(name + ' の選択肢が ' + opts.length + ' つです（2 つ以上）');
      if (opts.some(o => !isObject(o))) errors.push(name + ' の選択肢の形がちがいます');
      emptyOptionErrors(p).forEach(e => errors.push(e));
      if (!opts.some(o => isObject(o) && o.id === p.answer)) errors.push(name + ' の正解 ' + p.answer + ' が選択肢にありません');
    } else if (p.type === 'fill') {
      const ids = new Set();
      list(p.blanks).forEach(b => {
        if (!isObject(b)) return;
        if (ids.has(b.id)) errors.push(name + ' の空らん ' + b.id + ' が重複しています');
        ids.add(b.id);
        if (!/^[A-Za-z0-9_-]+$/.test(String(b.id))) errors.push(name + ' の空らん ' + b.id + ' の id は英数字で書いてください（例: b1）');
        if (typeof p.text === 'string' && p.text.indexOf('[' + b.id + ']') === -1) errors.push(name + ' の文に空らん [' + b.id + '] がありません');
        if (b.kind === 'word' && !list(b.options).includes(b.answer)) errors.push(name + ' の空らん ' + b.id + ' の正解「' + b.answer + '」が選択肢にありません');
        if (b.kind === 'number' && !isNum(b.answer)) errors.push(name + ' の空らん ' + b.id + ' の正解が数ではありません');
      });
      // 正解を入れると正解と判定されること（js/judge.js）
      if (list(p.blanks).length > 0 && list(p.blanks).every(b => isObject(b) && (b.kind === 'word' || isNum(b.answer)))) {
        const ans = {};
        p.blanks.forEach(b => { ans[b.id] = b.answer; });
        const r = judgeLib.judge(p, ans, {});
        if (!r.correct) errors.push(name + ' は正解を入れても正解になりません');
      }
    } else if (p.type === 'figure-choice') {
      const items = isObject(p.figure) ? list(p.figure.items) : [];
      if (!items.some(it => isObject(it) && it.type === 'region' && it.id === p.answer)) errors.push(name + ' の正解 ' + p.answer + ' の選ぶ場所（region）が図にありません');
      emptyOptionErrors(p).forEach(e => errors.push(e));
    }
    return errors;
  }

  function assembleUnit(draft) {
    const errors = [];
    const d = isObject(draft) ? draft : {};
    const plan = d.plan;
    if (!isObject(plan)) return { unit: null, errors: ['計画がまだありません'] };
    const inp = normalizeInput(d.input);
    const drafts = list(d.stages);

    // 計画・ステージの欠けた要素は、参照する前に確かめて errors に書く（例外を出さない）
    const stages = [];
    list(plan.stages).forEach((ps, i) => {
      if (!isObject(ps)) { errors.push('計画のステージ ' + (i + 1) + ' の形がちがいます'); return; }
      const sd = drafts[i];
      if (!isObject(sd) || !isObject(sd.stage)) { errors.push('ステージ ' + (i + 1) + '「' + str(ps.title) + '」がまだ作られていません'); return; }
      const st = sd.stage;
      ['lessons', 'problems', 'retryPool'].forEach(k => {
        if (!Array.isArray(st[k])) errors.push('ステージ ' + (i + 1) + '「' + str(ps.title) + '」の ' + k + ' がありません');
      });
      // 名前・時間・概念は計画のものを使う（計画を直したときに合わせるため）
      stages.push(Object.assign({}, st, {
        id: ps.id, areaId: ps.areaId, title: ps.title, minutes: ps.minutes, concepts: list(ps.concepts).slice(),
        lessons: list(st.lessons), problems: list(st.problems), retryPool: list(st.retryPool),
      }));
    });

    const concepts = [];
    list(plan.concepts).forEach((c, i) => {
      if (!isObject(c)) { errors.push('計画の概念 ' + (i + 1) + ' の形がちがいます'); return; }
      let pool = [];
      drafts.forEach(sd => { if (isObject(sd) && isObject(sd.checkPool)) pool = pool.concat(list(sd.checkPool[c.id])); });
      concepts.push({ id: c.id, title: c.title, basic: c.basic === undefined ? null : c.basic, lessonStageId: c.lessonStageId, checkPool: pool });
    });

    const areas = [];
    list(plan.areas).forEach((a, i) => {
      if (!isObject(a)) { errors.push('計画の領域 ' + (i + 1) + ' の形がちがいます'); return; }
      areas.push({ id: a.id, title: a.title, order: areas.length + 1, stages: stages.filter(s => s.areaId === a.id) });
    });

    const unit = {
      id: str(d.id) || inp.unitId,
      title: str(plan.unitTitle) || inp.title,
      mascot: inp.mascot,
      concepts,
      areas,
    };

    registry.validateUnit(unit).forEach(e => errors.push(e));
    stages.forEach(s => {
      // 用語問題（term: true の穴埋め）は各ステージに 1 問以上（編集で印を外したときも、ここで見つける）
      if (!s.problems.some(p => isObject(p) && p.type === 'fill' && p.term === true)) errors.push('ステージ ' + s.id + ' に用語問題（term: true の fill）がありません');
      [s.warmup].concat(s.problems, s.retryPool).forEach(p => checkProblem(p).forEach(e => errors.push(e)));
      list(s.lessons).forEach(c => {
        const n = Array.from(String(c && c.text || '').split('**').join('')).length;
        if (n < 40 || n > 160) errors.push('カード ' + (c && c.id) + ' の文が ' + n + ' 字です（40〜160 字）');
      });
    });
    concepts.forEach(c => c.checkPool.forEach(p => checkProblem(p).forEach(e => errors.push(e))));
    // 公開ルール: 教科書名・出版社名を教材に入れない
    if (BOOK_NAMES.test(JSON.stringify(unit))) errors.push('教材の文に教科書名・出版社名が入っています（消してください）');
    return { unit, errors };
  }

  // content/<id>.js の中身。unit には source: 'author'（AI 教材作成で作った印）を入れる
  // （tests/content-all.test.js がカードの図の検査を飛ばす目印。validateUnit は知らない項目を無視する）
  function toContentJs(unit, input, now) {
    const inp = normalizeInput(input);
    const oneLine = (s) => String(s).replace(/[\r\n\u2028\u2029]+/g, ' ');
    const title = oneLine(isObject(unit) && unit.title ? unit.title : inp.title);
    const date = isoOf(now).slice(0, 10);
    const marked = isObject(unit) ? Object.assign({ source: 'author' }, unit, { source: 'author' }) : unit;
    const json = JSON.stringify(marked, null, 2)
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
      .split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
    return [
      '// 「' + title + '」教材データ（中学' + inp.grade + '年 理科・' + inp.field + '）',
      '// AI 教材作成で作成。先生確認済み。作成日: ' + date,
      '// 形は content/sound.js などと同じ（js/content-registry.js の validateUnit が通る形）。',
      '(function (root) {',
      "  'use strict';",
      '',
      '  const unit = ' + json + ';',
      '',
      "  if (typeof module === 'object' && module.exports) module.exports = { unit };",
      '  else root.RikaQuest.content.register(unit);',
      "})(typeof globalThis !== 'undefined' ? globalThis : this);",
      '',
    ].join('\n');
  }

  // ---- 下書き ----

  function newDraft(input, now) {
    const inp = normalizeInput(input);
    const t = isoOf(now);
    return {
      id: inp.unitId, input: inp, status: 'draft', preview: false,
      model: (isObject(input) && str(input.model)) || DEFAULT_MODEL,
      plan: null, stages: new Array(inp.stageCount).fill(null),
      createdAt: t, updatedAt: t,
    };
  }

  function touch(draft, now) {
    if (isObject(draft)) draft.updatedAt = isoOf(now);
    return draft;
  }

  // 下書きの外側の形（id・input・status・stages・plan）
  function isDraftShell(d) {
    return isObject(d) && typeof d.id === 'string' && d.id !== '' && isObject(d.input) &&
      (d.status === 'draft' || d.status === 'checked') && Array.isArray(d.stages) &&
      (d.plan === null || isObject(d.plan));
  }

  const PROBLEM_TYPES = ['choice', 'fill', 'figure-choice'];

  // 編集画面が参照する問題の形か（object で type が 3 種のどれか、prompt が文字列。
  // choice は options が {id, text} の並び、fill は blanks が {id, kind} の並び）
  function isProblemShape(p) {
    if (!isObject(p) || !PROBLEM_TYPES.includes(p.type) || typeof p.prompt !== 'string') return false;
    if (p.type === 'choice') {
      return Array.isArray(p.options) && p.options.every(o => isObject(o) && typeof o.id === 'string' && typeof o.text === 'string');
    }
    if (p.type === 'fill') {
      return Array.isArray(p.blanks) && p.blanks.every(b => isObject(b) && typeof b.id === 'string' && typeof b.kind === 'string');
    }
    return true;
  }

  // カードの形か（object で text が文字列）
  function isCardShape(c) {
    return isObject(c) && typeof c.text === 'string';
  }

  // 下書きの中身の形のちがい（画面が参照する前提が崩れていないか）。合っていれば null、ちがえば理由の文
  function draftProblem(d) {
    if (!isDraftShell(d)) return '下書きの形ではありません';
    if (isObject(d.plan)) {
      const withIds = (key) => Array.isArray(d.plan[key]) && d.plan[key].every(x => isObject(x) && typeof x.id === 'string');
      for (const key of ['areas', 'stages', 'concepts']) {
        if (!withIds(key)) return '計画の ' + key + ' が id を持つ項目の並びではありません';
      }
      if (!d.plan.stages.every(s => Array.isArray(s.concepts))) return '計画のステージの concepts が並びではありません';
    }
    for (let i = 0; i < d.stages.length; i++) {
      const sd = d.stages[i];
      if (sd === null) continue;
      const st = isObject(sd) ? sd.stage : null;
      if (!isObject(st) || !['lessons', 'problems', 'retryPool'].every(k => Array.isArray(st[k]))) {
        return 'ステージ ' + (i + 1) + ' の lessons・problems・retryPool が並びではありません';
      }
      if (sd.checkPool !== undefined && !isObject(sd.checkPool)) return 'ステージ ' + (i + 1) + ' の checkPool の形がちがいます';
      const name = 'ステージ ' + (i + 1);
      if (!st.lessons.every(isCardShape)) return name + ' のカードの形がちがいます';
      // warmup は作れなかったとき null になる（normalizeStage）
      if (st.warmup !== null && st.warmup !== undefined && !isProblemShape(st.warmup)) return name + ' の予想問題（warmup）の形がちがいます';
      for (const k of ['problems', 'retryPool']) {
        if (!st[k].every(isProblemShape)) return name + ' の ' + k + ' に形のちがう問題があります';
      }
      if (isObject(sd.checkPool)) {
        for (const cid of Object.keys(sd.checkPool)) {
          const ps = sd.checkPool[cid];
          if (!Array.isArray(ps) || !ps.every(isProblemShape)) return name + ' の checkPool（' + cid + '）に形のちがう問題があります';
        }
      }
    }
    return null;
  }

  function isDraft(d) {
    return draftProblem(d) === null;
  }

  function loadDrafts(storage) {
    try {
      const raw = storage && storage.getItem(DRAFTS_KEY);
      if (!raw) return [];
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter(isDraft) : [];
    } catch (e) { return []; }
  }

  function saveDrafts(storage, drafts) {
    try {
      storage.setItem(DRAFTS_KEY, JSON.stringify(list(drafts).filter(isDraft)));
      return true;
    } catch (e) { return false; }
  }

  const EXPORT_FORMAT = 'rika-quest-draft';

  function exportDraftJson(draft) {
    return JSON.stringify({ format: EXPORT_FORMAT, version: 1, draft }, null, 2);
  }

  function importDraftJson(text) {
    let v;
    try { v = JSON.parse(String(text)); } catch (e) { return { draft: null, error: 'JSON として読めません' }; }
    const d = isObject(v) && v.format === EXPORT_FORMAT ? v.draft : v;
    if (!isDraftShell(d)) return { draft: null, error: '理科クエストの教材の下書きではありません' };
    const why = draftProblem(d);
    if (why) return { draft: null, error: '下書きの中身の形がちがいます（' + why + '）' };
    // 「この端末でためす」は端末ごとに入れなおす
    return { draft: Object.assign({}, d, { preview: false }), error: null };
  }

  const api = {
    DRAFTS_KEY, DEFAULT_MODEL, SCHEMAS, ITEM_TYPES,
    normalizeInput, validateInput,
    buildPlanPrompt, buildStagePrompt, promptText, parseJson,
    normalizePlan, normalizeStage, boxesScene, sanitizeItem, checkProblem, assembleUnit, toContentJs,
    newDraft, touch, loadDrafts, saveDrafts, exportDraftJson, importDraftJson,
    isProblemShape, isCardShape,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { author: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
