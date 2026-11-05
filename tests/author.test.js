// tests/author.test.js — AI 教材作成のロジック（js/author.js）
const test = require('node:test'); const assert = require('node:assert/strict');
const vm = require('node:vm');
const author = require('../js/author.js');
const cr = require('../js/content-registry.js');
const { fakeStorage } = require('./helpers.js');

const INPUT = { unitId: 'magnet', title: '磁石の力', grade: 1, field: '物理', mascot: 'B', textbook: '', scope: '磁石の極と磁界', notes: '', stageCount: 2 };
const NOW = '2026-11-06T07:00:00.000Z';

// ---- 偽の AI 出力 ----

const PLAN = {
  unitTitle: '磁石のふしぎ',
  areas: [{ id: 'Magnet Force', title: '磁石の力' }],
  stages: [
    { id: 'magnet-1', areaId: 'Magnet Force', title: '磁石の極', minutes: 4, concepts: ['magnet-pole'], goal: '磁石には N 極と S 極があることを知る。' },
    { id: '2', areaId: 'Magnet Force', title: '磁界の向き', minutes: 9, concepts: ['field'], goal: '磁界の向きを方位磁針で調べる。' },
  ],
  concepts: [
    { id: 'magnet-pole', title: '磁石の極', basic: null, lessonStageId: 'magnet-1' },
    { id: 'field', title: '磁界', basic: 'magnet-pole', lessonStageId: '2' },
  ],
};

const CARD = 'ぼう磁石の両はしは、鉄を引きつける力がいちばん強い部分です。この部分を**磁極**といい、北をさす方を N 極、南をさす方を S 極とよびます。';
const CARD2 = '同じ極どうしを近づけるとしりぞけ合い、ちがう極どうしを近づけると引き合います。この力を**磁力**といいます。';

function choice(concept, prompt, answer) {
  return { type: 'choice', concept, prompt, explanation: '理由を考えると、こうなります。', hint: '極の組み合わせを思い出そう。', term: false,
    options: ['引き合う', 'しりぞけ合う', '何も起こらない'], answer: answer === undefined ? 0 : answer };
}
function termFill(concept) {
  return { type: 'fill', concept, prompt: '大切な言葉を入れよう。', explanation: '磁石の両はしを**磁極**といいます。', hint: '「磁」で始まる言葉だよ。', term: true,
    text: '磁石の両はしを[b1]という。', blanks: [{ id: 'b1', kind: 'word', options: ['磁極', '電極', '磁界'], answer: '磁極' }] };
}
function numberFill(concept) {
  return { type: 'fill', concept, prompt: '数を入れよう。', explanation: '2 つに切ると、極は 2 × 2 = 4 個です。', hint: '切ったそれぞれが磁石になるよ。', term: false,
    text: '磁石を 2 つに切ると、極は全部で[b1]個になる。', blanks: [{ id: 'b1', kind: 'number', answer: 4, tolerance: 0, unit: '個' }] };
}
function boxes(concept, list, answer) {
  return { type: 'figure-choice', concept, prompt: '正しいものを選ぼう。', explanation: 'N 極と S 極は引き合います。', hint: '色のちがう極に注目しよう。', term: false,
    boxes: list, answer, items: null };
}
function itemsFigure(concept) {
  return { type: 'figure-choice', concept, prompt: '方位磁針の N 極が北をさすのはどこ？', explanation: '磁界の向きに N 極が向きます。', hint: '矢印の向きを見よう。', term: false,
    boxes: [], answer: 1, items: [
      { type: 'rect', x: 100, y: 100, width: 120, height: 40, fill: 'red', label: 'N' },
      { type: 'arrow', points: [[60, 60], [260, 60]], color: 'blue' },
      { type: 'magic', x: 1, y: 2 },              // 知らない type は捨てる
      { type: 'circle', x: 10 },                   // 座標の欠けたものは捨てる
      { type: 'text', x: 20, y: 30, text: '磁界', size: 10 },
      { type: 'region', x: 60, y: 180, label: 'ア' },
      { type: 'region', id: 'r2', x: 260, y: 180, r: 10 },
    ] };
}

function stage1() {
  const c = 'magnet-pole';
  return {
    lessons: [{ text: CARD }, { text: CARD2 }],
    warmup: choice(c, '磁石の N 極どうしを近づけると？', 1),
    problems: [choice(c, 'N 極と S 極を近づけると？'), termFill(c), boxes(c, ['N 極と S 極は引き合う', 'N 極どうしは引き合う', 'S 極どうしは引き合う'], 0), numberFill(c), choice(c, 'S 極どうしを近づけると？', 1)],
    retryPool: [choice(c, 'S 極と N 極を近づけると？'), choice(c, 'N 極どうしでは？', 1)],
    checkPool: [{ concept: c, problems: [choice(c, '確認 1'), choice(c, '確認 2'), termFill(c)] }],
  };
}
function stage2() {
  const c = 'field';
  return {
    lessons: [{ text: '磁石のまわりの、磁力がはたらく空間を**磁界といいます。方位磁針を置くと、N 極がさす向きが磁界の向きです。磁界のようすは線で表せます。' }, { text: CARD2 }],
    warmup: choice(c, '方位磁針は何をさす？'),
    problems: [termFill(c), choice(c, '磁界の向きは？', 2), choice(c, '磁力線は交わる？'), choice(c, 'N 極から出る？')],
    retryPool: [itemsFigure(c), choice(c, '磁界の向きを調べる道具は？')],
    checkPool: [{ concept: 'field', problems: [choice(c, '確認 1'), choice(c, '確認 2'), choice(c, '確認 3')] },
      { concept: 'magnet-pole', problems: [choice(c, 'ほかのステージの分は受け取らない')] }],
  };
}

function build() {
  const draft = author.newDraft(INPUT, NOW);
  const p = author.normalizePlan(PLAN, INPUT);
  draft.plan = p.plan;
  const s1 = author.normalizeStage(stage1(), p.plan, 0, INPUT);
  const s2 = author.normalizeStage(stage2(), p.plan, 1, INPUT);
  draft.stages = [{ stage: s1.stage, checkPool: s1.checkPool }, { stage: s2.stage, checkPool: s2.checkPool }];
  return { draft, p, s1, s2 };
}

// ---- テスト ----

test('normalizePlan: id を英小文字・単元の id で始まる形にそろえ、参照もつなぐ', () => {
  const { plan, errors } = author.normalizePlan(PLAN, INPUT);
  assert.deepEqual(errors, []);
  assert.equal(plan.unitTitle, '磁石のふしぎ');
  assert.deepEqual(plan.areas.map(a => a.id), ['magnet-force']);
  assert.deepEqual(plan.stages.map(s => s.id), ['magnet-1', 'magnet-2']);
  assert.equal(plan.stages[1].areaId, 'magnet-force');
  assert.equal(plan.stages[1].minutes, 6);   // 3〜6 に収める
  assert.deepEqual(plan.stages[1].concepts, ['magnet-field']);
  assert.deepEqual(plan.concepts[1], { id: 'magnet-field', title: '磁界', basic: 'magnet-pole', lessonStageId: 'magnet-2' });
});

test('normalizePlan: ステージ数のちがい、知らない basic・概念を errors に。オブジェクトでなければ plan は null', () => {
  const bad = JSON.parse(JSON.stringify(PLAN));
  bad.stages.pop();
  bad.concepts[0].basic = 'nothing';
  bad.stages[0].concepts.push('ghost');
  const { errors } = author.normalizePlan(bad, INPUT);
  const m = errors.join('\n');
  assert.match(m, /ステージが 1 個です（2 個にしてください）/);
  assert.match(m, /basic nothing が計画にありません/);
  assert.match(m, /概念 ghost が計画にありません/);
  assert.equal(author.normalizePlan('x', INPUT).plan, null);
});

test('normalizeStage → assembleUnit: errors が空で、validateUnit も空', () => {
  const { draft, s1, s2 } = build();
  assert.deepEqual(s1.errors, []);
  assert.deepEqual(s2.errors, []);
  const { unit, errors } = author.assembleUnit(draft);
  assert.deepEqual(errors, []);
  assert.deepEqual(cr.validateUnit(unit), []);
  assert.equal(unit.id, 'magnet');
  assert.equal(unit.mascot, 'B');
  assert.equal(unit.areas[0].order, 1);
  assert.deepEqual(unit.areas[0].stages.map(s => s.id), ['magnet-1', 'magnet-2']);
  assert.equal(unit.concepts[0].checkPool.length, 3);
  assert.equal(unit.concepts[1].checkPool.length, 3);   // ほかのステージが作った magnet-pole の分は入らない
});

test('normalizeStage: id の付け方と、choice・fill・figure-choice（枠）の形', () => {
  const { s1 } = build();
  const st = s1.stage;
  assert.deepEqual(st.lessons.map(c => c.id), ['magnet-1-c1', 'magnet-1-c2']);
  assert.equal(st.lessons[0].figure, null);
  assert.equal(st.warmup.id, 'magnet-1-w1');
  assert.equal(st.warmup.answer, 'b');
  assert.deepEqual(st.problems.map(p => p.id), ['magnet-1-p1', 'magnet-1-t1', 'magnet-1-p2', 'magnet-1-p3', 'magnet-1-p4']);
  assert.deepEqual(st.retryPool.map(p => p.id), ['magnet-1-r1', 'magnet-1-r2']);
  assert.deepEqual(s1.checkPool['magnet-pole'].map(p => p.id), ['magnet-pole-k1', 'magnet-pole-k2', 'magnet-pole-k3']);
  const c = st.problems[0];
  assert.deepEqual(c.options, [{ id: 'a', text: '引き合う' }, { id: 'b', text: 'しりぞけ合う' }, { id: 'c', text: '何も起こらない' }]);
  assert.equal(c.answer, 'a'); assert.equal(c.figure, null);
  const t = st.problems[1];
  assert.equal(t.term, true); assert.equal(t.type, 'fill'); assert.equal(t.figure, null);
  assert.deepEqual(st.problems[3].blanks, [{ id: 'b1', kind: 'number', answer: 4, tolerance: 0, unit: '個' }]);
  const f = st.problems[2];
  assert.equal(f.type, 'figure-choice');
  assert.equal(f.answer, 'r1');
  const regions = f.figure.items.filter(it => it.type === 'region');
  assert.deepEqual(regions.map(r => [r.id, r.label, r.r]), [['r1', 'ア', 22], ['r2', 'イ', 22], ['r3', 'ウ', 22]]);
});

test('normalizeStage: figure-choice の無いステージでは、用語でない最初の choice が枠選びに変わる', () => {
  const { s2 } = build();
  const ps = s2.stage.problems;
  assert.equal(ps[0].type, 'fill');                  // 用語の問題はそのまま
  assert.equal(ps[1].type, 'figure-choice');         // 最初の choice
  assert.equal(ps[1].answer, 'r3');
  assert.equal(ps[1].options, undefined);
  const texts = ps[1].figure.items.filter(it => it.type === 'text').map(it => it.text).join('');
  assert.equal(texts, '引き合うしりぞけ合う何も起こらない');
  assert.equal(ps[2].type, 'choice');
});

test('normalizeStage: items 版の figure-choice は描ける部品だけ残し、region を選択肢にする', () => {
  const { s2 } = build();
  const f = s2.stage.retryPool[0];
  assert.equal(f.type, 'figure-choice');
  const types = f.figure.items.map(it => it.type);
  assert.deepEqual(types, ['rect', 'arrow', 'text', 'region', 'region']);
  const arrow = f.figure.items[1];
  assert.deepEqual([arrow.x1, arrow.y1, arrow.x2, arrow.y2], [60, 60, 260, 60]);
  assert.equal(f.figure.items[2].size, 13);          // 13px 以上
  const regions = f.figure.items.filter(it => it.type === 'region');
  assert.deepEqual(regions.map(r => [r.id, r.label, r.r]), [['r1', 'ア', 22], ['r2', 'イ', 22]]);
  assert.equal(f.answer, 'r2');
});

test('normalizeStage: 閉じていない ** のカードは ** を取り除く', () => {
  const { s2 } = build();
  const text = s2.stage.lessons[0].text;
  assert.equal(text.indexOf('**'), -1);
  assert.match(text, /磁界といいます/);
});

test('normalizeStage: 枠が 1 つの figure-choice は choice に落ちる', () => {
  const o = stage1();
  o.problems[2] = boxes('magnet-pole', ['N 極と S 極は引き合う'], 0);
  o.problems[4] = boxes('magnet-pole', ['ア', 'イ'], 1);   // ステージの図の問題はこちらで満たす
  const { plan } = author.normalizePlan(PLAN, INPUT);
  const { stage } = author.normalizeStage(o, plan, 0, INPUT);
  assert.equal(stage.problems[2].type, 'choice');
  assert.deepEqual(stage.problems[2].options, [{ id: 'a', text: 'N 極と S 極は引き合う' }]);
  assert.equal(stage.problems[2].answer, 'a');
  assert.equal(stage.problems[4].type, 'figure-choice');
});

test('assembleUnit: answer が options に無い choice、足りないステージを errors に出す', () => {
  const { draft } = build();
  const o = stage1();
  o.problems[0].answer = 3;   // 選択肢は 3 つ（a〜c）
  const s = author.normalizeStage(o, draft.plan, 0, INPUT);
  draft.stages[0] = { stage: s.stage, checkPool: s.checkPool };
  assert.match(author.assembleUnit(draft).errors.join('\n'), /問題 magnet-1-p1 の正解 d が選択肢にありません/);
  draft.stages[1] = null;
  assert.match(author.assembleUnit(draft).errors.join('\n'), /ステージ 2「磁界の向き」がまだ作られていません/);
  assert.deepEqual(author.assembleUnit({ plan: null }).errors, ['計画がまだありません']);
});

test('assembleUnit: fill の正解が選択肢に無い、教科書名が入っている', () => {
  const { draft } = build();
  draft.stages[0].stage.problems[1].blanks[0].answer = '磁石';
  draft.stages[0].stage.lessons[0].text = CARD + '東京書籍';
  const m = author.assembleUnit(draft).errors.join('\n');
  assert.match(m, /空らん b1 の正解「磁石」が選択肢にありません/);
  assert.match(m, /教科書名・出版社名/);
});

test('boxesScene: 320×240、枠 4 つは 2×2。文字は 13px 以上で、region は r1〜 と ア〜', () => {
  const s = author.boxesScene(['とても長い文が入っている枠の例です', 'イの文', 'ウの文', 'エの文']);
  assert.equal(s.width, 320); assert.equal(s.height, 240);
  const rects = s.items.filter(it => it.type === 'rect');
  assert.equal(rects.length, 4);
  assert.equal(new Set(rects.map(r => r.x)).size, 2);
  assert.equal(new Set(rects.map(r => r.y)).size, 2);
  rects.forEach(r => { assert.ok(r.x >= 0 && r.x + r.width <= 320 && r.y >= 0 && r.y + r.height <= 240); assert.equal(r.fill, 'white'); assert.ok(r.rx > 0); });
  const texts = s.items.filter(it => it.type === 'text');
  texts.forEach(t => { assert.ok(t.size >= 13); assert.ok(Array.from(t.text).length <= 12); });
  assert.ok(texts.length > 4);   // 長い文は折り返す
  assert.deepEqual(s.items.filter(it => it.type === 'region').map(r => [r.id, r.label, r.r]),
    [['r1', 'ア', 22], ['r2', 'イ', 22], ['r3', 'ウ', 22], ['r4', 'エ', 22]]);
  const three = author.boxesScene(['a', 'b', 'c']).items.filter(it => it.type === 'rect');
  assert.equal(new Set(three.map(r => r.y)).size, 1);   // 3 つは横 1 列
});

test('parseJson: そのまま・```json のかこみ・前後の文つきでも読める。読めなければ null', () => {
  assert.deepEqual(author.parseJson('{"a":1}'), { a: 1 });
  assert.deepEqual(author.parseJson('はい。\n```json\n{"a": [1, 2]}\n```\n以上です。'), { a: [1, 2] });
  assert.deepEqual(author.parseJson('結果: {"b": true} です'), { b: true });
  assert.equal(author.parseJson('JSON ではない'), null);
  assert.equal(author.parseJson('42'), null);
  assert.equal(author.parseJson(null), null);
});

test('toContentJs: vm で評価すると register が呼ばれ、その教材の validateUnit は空', () => {
  const { draft } = build();
  const { unit } = author.assembleUnit(draft);
  const js = author.toContentJs(unit, INPUT, NOW);
  assert.match(js, /^\/\/ 「磁石のふしぎ」教材データ/);
  assert.match(js, /AI 教材作成で作成。先生確認済み/);
  assert.match(js, /2026-11-06/);
  assert.match(js, /root\.RikaQuest\.content\.register\(unit\);\n\}\)\(typeof globalThis !== 'undefined' \? globalThis : this\);\n$/);
  const got = [];
  vm.runInNewContext(js, { RikaQuest: { content: { register: (u) => got.push(u) } } });
  assert.equal(got.length, 1);
  assert.deepEqual(cr.validateUnit(got[0]), []);
  assert.equal(got[0].id, 'magnet');
  // Node の require の形（module.exports）でも読める
  const mod = { exports: {} };
  vm.runInNewContext(js, { module: mod });
  assert.equal(mod.exports.unit.title, '磁石のふしぎ');
});

test('newDraft / touch', () => {
  const d = author.newDraft(INPUT, NOW);
  assert.equal(d.id, 'magnet'); assert.equal(d.status, 'draft'); assert.equal(d.preview, false);
  assert.equal(d.model, 'claude-opus-5-5'); assert.equal(d.plan, null);
  assert.deepEqual(d.stages, [null, null]);
  assert.equal(d.createdAt, NOW); assert.equal(d.updatedAt, NOW);
  author.touch(d, '2026-11-07T00:00:00.000Z');
  assert.equal(d.updatedAt, '2026-11-07T00:00:00.000Z'); assert.equal(d.createdAt, NOW);
  assert.equal(author.newDraft(Object.assign({}, INPUT, { stageCount: undefined })).stages.length, 4);   // 既定 4
});

test('loadDrafts / saveDrafts: 往復、壊れた JSON は []、形の崩れた要素は捨てる', () => {
  const st = fakeStorage();
  assert.deepEqual(author.loadDrafts(st), []);
  const { draft } = build();
  assert.equal(author.saveDrafts(st, [draft]), true);
  assert.deepEqual(author.loadDrafts(st), [draft]);
  assert.equal(st.keys()[0], 'rika-quest:drafts');
  assert.deepEqual(author.loadDrafts(fakeStorage({ 'rika-quest:drafts': '{壊れた' })), []);
  assert.deepEqual(author.loadDrafts(fakeStorage({ 'rika-quest:drafts': JSON.stringify([draft, { id: 1 }, null]) })), [draft]);
  assert.equal(author.saveDrafts(fakeStorage({}, { throwOn: () => true }), [draft]), false);
  assert.deepEqual(author.loadDrafts(null), []);
});

test('exportDraftJson / importDraftJson: 往復。ちがうものは error', () => {
  const { draft } = build();
  draft.preview = true;
  const { draft: back, error } = author.importDraftJson(author.exportDraftJson(draft));
  assert.equal(error, null);
  assert.deepEqual(back, Object.assign({}, draft, { preview: false }));   // ためす は端末ごと
  assert.equal(author.importDraftJson('壊れた').draft, null);
  assert.match(author.importDraftJson('{"a":1}').error, /下書きではありません/);
});

test('buildPlanPrompt / buildStagePrompt / promptText', () => {
  const mats = [{ name: 'プリント1', kind: 'text', text: '磁石の実験のまとめ' }, { name: 'scan.pdf', kind: 'pdf' }];
  const p = author.buildPlanPrompt(INPUT, mats);
  assert.match(p.system, /中学1年/);
  assert.match(p.system, /\*\*用語\*\*/);
  assert.match(p.system, /教科書の本文・図・問題を写さない/);
  assert.match(p.system, /JSON だけ/);
  assert.match(p.user, /単元名: 磁石の力/);
  assert.match(p.user, /磁石の実験のまとめ/);
  assert.match(p.user, /scan\.pdf（PDF。このメッセージに添付）/);
  const { plan } = author.normalizePlan(PLAN, INPUT);
  const s = author.buildStagePrompt(INPUT, plan, 1, mats);
  assert.match(s.system, /figure-choice/);
  assert.match(s.user, /magnet-2「磁界の向き」/);
  assert.match(s.user, /checkPool を作る概念（それぞれ 3 問以上）: magnet-field/);
  assert.match(s.user, /前のステージ: 磁石の極/);
  const t = author.promptText(p);
  assert.ok(t.indexOf('--- 指示 ---') === 0);
  assert.ok(t.indexOf('--- 入力 ---') > 0);
});

test('SCHEMAS: すべての object に additionalProperties:false と required、数値・文字数の制約なし', () => {
  const banned = ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern'];
  function walk(node, where) {
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, where + '[' + i + ']')); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'object') {
      assert.equal(node.additionalProperties, false, where);
      assert.ok(Array.isArray(node.required), where);
      node.required.forEach(k => assert.ok(k in node.properties, where + ' の required ' + k));
    }
    banned.forEach(k => assert.ok(!(k in node), where + ' に ' + k));
    Object.keys(node).forEach(k => walk(node[k], where + '.' + k));
  }
  walk(author.SCHEMAS.plan, 'plan');
  walk(author.SCHEMAS.stage, 'stage');
  assert.deepEqual(author.SCHEMAS.stage.$defs.part.required, ['type']);
});

// ---- 修正 1（Codex round 1 の指摘） ----

test('空の選択肢は除かずに errors に出し、正解の番号はそのまま（choice・枠選び）', () => {
  const { plan } = author.normalizePlan(PLAN, INPUT);
  const o = stage1();
  o.problems[0].options = ['甲', ' ', '乙', '丙'];
  o.problems[0].answer = 2;
  o.problems[2] = boxes('magnet-pole', ['N 極と S 極は引き合う', '', 'S 極どうしは引き合う'], 2);
  const { stage, errors } = author.normalizeStage(o, plan, 0, INPUT);
  const c = stage.problems[0];
  assert.deepEqual(c.options.map(x => x.text), ['甲', '', '乙', '丙']);
  assert.equal(c.answer, 'c');   // 「乙」のまま（「丙」にずれない）
  const f = stage.problems[2];
  assert.equal(f.type, 'figure-choice');
  assert.equal(f.answer, 'r3');
  assert.equal(f.figure.items.filter(it => it.type === 'region').length, 3);
  const m = errors.join('\n');
  assert.match(m, /問題 magnet-1-p1 の選択肢 2 が空です/);
  assert.match(m, /問題 magnet-1-p2 の選択肢 2 が空です/);
  // assembleUnit（編集のあとの照合）でも同じ
  const { draft } = build();
  draft.stages[0] = { stage, checkPool: {} };
  const all = author.assembleUnit(draft).errors.join('\n');
  assert.match(all, /問題 magnet-1-p1 の選択肢 2 が空です/);
  assert.match(all, /問題 magnet-1-p2 の選択肢 2 が空です/);
});

test('fill の空らん id は b1, b2… に付け直し、本文の [元の id] も置きかえる。本文に無い id は errors', () => {
  const { plan } = author.normalizePlan(PLAN, INPUT);
  const o = stage1();
  o.problems[3] = numberFill('magnet-pole');
  o.problems[3].text = '磁石を 2 つに切ると、極は[空欄1]個、N 極は[空欄2]個になる。';
  o.problems[3].blanks = [
    { id: '空欄1', kind: 'number', answer: 4, tolerance: 0, unit: '個' },
    { id: '空欄2', kind: 'number', answer: 2, tolerance: 0, unit: '個' },
  ];
  // 入れかえ（b2 → b1、b1 → b2）でもぶつからない
  o.retryPool[0] = numberFill('magnet-pole');
  o.retryPool[0].text = 'あ[b2]い[b1]う';
  o.retryPool[0].blanks = [{ id: 'b2', kind: 'number', answer: 1, tolerance: 0, unit: '' }, { id: 'b1', kind: 'number', answer: 2, tolerance: 0, unit: '' }];
  o.retryPool[1] = termFill('magnet-pole');
  o.retryPool[1].blanks[0].id = 'x9';   // 本文は [b1] のまま
  const { stage, errors } = author.normalizeStage(o, plan, 0, INPUT);
  const p = stage.problems[3];
  assert.deepEqual(p.blanks.map(b => b.id), ['b1', 'b2']);
  assert.equal(p.text, '磁石を 2 つに切ると、極は[b1]個、N 極は[b2]個になる。');
  assert.deepEqual(author.checkProblem(p), []);
  const r = stage.retryPool[0];
  assert.equal(r.text, 'あ[b1]い[b2]う');
  assert.deepEqual(r.blanks.map(b => [b.id, b.answer]), [['b1', 1], ['b2', 2]]);
  assert.match(errors.join('\n'), /問題 magnet-1-r2 の空らん x9 が本文にありません/);
  // 描けない id（取り込んだ下書きなど）は照合で知らせる
  const bad = JSON.parse(JSON.stringify(p));
  bad.blanks[0].id = '空欄1'; bad.text = '[空欄1] と [b2]';
  assert.match(author.checkProblem(bad).join('\n'), /空らん 空欄1 の id は英数字/);
});

test('importDraftJson / loadDrafts: 中身の形が崩れた下書き（plan.stages[0] が null など）は受けとらない', () => {
  const { draft } = build();
  const broken = JSON.parse(JSON.stringify(draft));
  broken.plan.stages[0] = null;
  const r = author.importDraftJson(author.exportDraftJson(broken));
  assert.equal(r.draft, null);
  assert.match(r.error, /^下書きの中身の形がちがいます（.+）$/);
  const noLessons = JSON.parse(JSON.stringify(draft));
  noLessons.stages[1].stage.lessons = 'x';
  assert.match(author.importDraftJson(JSON.stringify(noLessons)).error, /下書きの中身の形がちがいます/);
  const areaNoId = JSON.parse(JSON.stringify(draft));
  areaNoId.plan.areas[0] = { title: 'id なし' };
  assert.equal(author.importDraftJson(JSON.stringify(areaNoId)).draft, null);
  const st = fakeStorage({ 'rika-quest:drafts': JSON.stringify([broken, draft, noLessons]) });
  assert.deepEqual(author.loadDrafts(st), [draft]);
  // stages の要素が null（まだ作っていない）のものは、ふつうの下書き
  const fresh = author.newDraft(INPUT, NOW);
  assert.equal(author.importDraftJson(author.exportDraftJson(fresh)).error, null);
});

test('importDraftJson / loadDrafts: 配列の中の壊れた要素（null の問題・文字列の warmup・文字列の選択肢など）は受けとらない', () => {
  const { draft } = build();
  assert.equal(author.importDraftJson(author.exportDraftJson(draft)).error, null);
  const copy = () => JSON.parse(JSON.stringify(draft));
  const nullProblem = copy();
  nullProblem.stages[0].stage.problems[0] = null;
  const r = author.importDraftJson(author.exportDraftJson(nullProblem));
  assert.equal(r.draft, null);
  assert.match(r.error, /下書きの中身の形がちがいます（ステージ 1 の problems に形のちがう問題があります）/);
  const strWarmup = copy();
  strWarmup.stages[0].stage.warmup = '予想';
  assert.match(author.importDraftJson(JSON.stringify(strWarmup)).error, /予想問題（warmup）の形がちがいます/);
  const strOptions = copy();
  const c = strOptions.stages[0].stage.problems.find(x => x.type === 'choice');
  c.options = c.options.map(o => o.text);
  assert.match(author.importDraftJson(JSON.stringify(strOptions)).error, /形のちがう問題があります/);
  const badCard = copy();
  badCard.stages[1].stage.lessons[0] = { text: 1 };
  assert.match(author.importDraftJson(JSON.stringify(badCard)).error, /ステージ 2 のカードの形がちがいます/);
  const badBlank = copy();
  badBlank.stages[0].stage.problems.find(x => x.type === 'fill').blanks = [null];
  assert.equal(author.importDraftJson(JSON.stringify(badBlank)).draft, null);
  const badCheck = copy();
  const cid = Object.keys(badCheck.stages[0].checkPool)[0];
  badCheck.stages[0].checkPool[cid].push({ type: 'magic', prompt: '' });
  assert.match(author.importDraftJson(JSON.stringify(badCheck)).error, /checkPool（.+）に形のちがう問題があります/);
  const badType = copy();
  badType.stages[1].stage.retryPool[0].prompt = null;
  assert.equal(author.importDraftJson(JSON.stringify(badType)).draft, null);
  // warmup が null（作れなかった）のものは受けとる
  const noWarmup = copy();
  noWarmup.stages[0].stage.warmup = null;
  assert.equal(author.importDraftJson(JSON.stringify(noWarmup)).error, null);
  const st = fakeStorage({ 'rika-quest:drafts': JSON.stringify([nullProblem, strWarmup, strOptions, badCard, draft]) });
  assert.deepEqual(author.loadDrafts(st), [draft]);
});

test('normalizeStage: 知らない形式の問題は入れずに errors に書く（下書きの検査を通るように）', () => {
  const { p } = build();
  const o = stage1();
  o.problems.push({ type: 'magic', concept: 'magnet-pole', prompt: 'ふしぎ' });
  const { stage, errors } = author.normalizeStage(o, p.plan, 0, INPUT);
  assert.equal(stage.problems.length, 5);
  assert.match(errors.join('\n'), /問題 magnet-1-p5 の形式（magic）は使えないため、入れませんでした/);
  const d = author.newDraft(INPUT, NOW);
  d.plan = p.plan;
  d.stages = [{ stage, checkPool: {} }, null];
  assert.equal(author.importDraftJson(author.exportDraftJson(d)).error, null);
});

test('assembleUnit: 計画・ステージの要素が壊れていても例外を出さず errors に書く', () => {
  const { draft } = build();
  const d = JSON.parse(JSON.stringify(draft));
  d.plan.stages[0] = null;
  d.plan.concepts.push(null);
  d.plan.areas.push(7);
  d.stages[1] = { stage: { lessons: null, warmup: null }, checkPool: 3 };
  let res;
  assert.doesNotThrow(() => { res = author.assembleUnit(d); });
  const m = res.errors.join('\n');
  assert.match(m, /計画のステージ 1 の形がちがいます/);
  assert.match(m, /計画の概念 3 の形がちがいます/);
  assert.match(m, /計画の領域 2 の形がちがいます/);
  assert.match(m, /ステージ 2「磁界の向き」の lessons がありません/);
  assert.ok(res.unit);
});

test('assembleUnit: 用語問題（term: true の fill）が無いステージは errors', () => {
  const { draft } = build();
  draft.stages[1].stage.problems.forEach(p => { delete p.term; });
  const m = author.assembleUnit(draft).errors.join('\n');
  assert.match(m, /ステージ magnet-2 に用語問題（term: true の fill）がありません/);
  assert.doesNotMatch(m, /ステージ magnet-1 に用語問題/);
});

test('boxesScene: 1 行目の baseline は枠の上から 70 以上、文字 13px・行 18。行の先頭は空白でない。2×2 は 3 行まで', () => {
  const long = 'あいうえお かきくけこさしすせそたちつてとなにぬねのはひふへほ';
  const s = author.boxesScene([long, 'イの文', 'ウ の 文', 'エ']);
  const items = s.items;
  const rects = items.filter(it => it.type === 'rect');
  let k = -1;
  const byBox = rects.map(() => []);
  items.forEach(it => { if (it.type === 'rect') k++; else if (it.type === 'text') byBox[k].push(it); });
  byBox.forEach((texts, i) => {
    assert.ok(texts.length <= 3, '枠 ' + (i + 1) + ' は 3 行まで');
    texts.forEach((t, j) => {
      assert.equal(t.size, 13);
      assert.ok(!/^\s|\s$/.test(t.text), '行の前後に空白がない: 「' + t.text + '」');
      assert.ok(Array.from(t.text).length <= 12);
      if (j === 0) assert.ok(t.y - rects[i].y >= 70);
      else assert.equal(t.y - texts[j - 1].y, 18);
      assert.ok(t.y <= rects[i].y + rects[i].height);
    });
  });
  const first = byBox[0];
  assert.equal(first.length, 3);
  assert.match(first[2].text, /…$/);   // 超える分は「…」
  // 空白の直後で切れても、次の行の先頭に空白を送らない
  const two = author.boxesScene(['あいうえおかきくけこ さしす', 'b']).items.filter(it => it.type === 'text');
  assert.deepEqual(two.slice(0, 2).map(t => t.text), ['あいうえおかきくけこ', 'さしす']);
});
