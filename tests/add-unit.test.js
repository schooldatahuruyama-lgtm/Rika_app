// tests/add-unit.test.js — 書き出した教材を公開版に組みこむ道具（tools/add-unit.js）
// プロジェクトのファイル（index.html・sw.js・content/）は書きかえない。文字列と一時フォルダで確かめる
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const vm = require('node:vm');
const childProcess = require('node:child_process');
const tool = require('../tools/add-unit.js');
const author = require('../js/author.js');
const cr = require('../js/content-registry.js');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'tools', 'add-unit.js');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ---- 教材の例（tests/author.test.js の fixture と同じ「磁石のふしぎ」。id だけ、本物の単元とぶつからない zztest にしてある） ----

const INPUT = { unitId: 'zztest', title: '磁石の力', grade: 1, field: '物理', mascot: 'B', textbook: '', scope: '磁石の極と磁界', notes: '', stageCount: 2 };
const NOW = '2026-11-06T07:00:00.000Z';
const PLAN = {
  unitTitle: '磁石のふしぎ',
  areas: [{ id: 'Zztest Force', title: '磁石の力' }],
  stages: [
    { id: 'zztest-1', areaId: 'Zztest Force', title: '磁石の極', minutes: 4, concepts: ['zztest-pole'], goal: '磁石には N 極と S 極があることを知る。' },
    { id: '2', areaId: 'Zztest Force', title: '磁界の向き', minutes: 9, concepts: ['field'], goal: '磁界の向きを方位磁針で調べる。' },
  ],
  concepts: [
    { id: 'zztest-pole', title: '磁石の極', basic: null, lessonStageId: 'zztest-1' },
    { id: 'field', title: '磁界', basic: 'zztest-pole', lessonStageId: '2' },
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
function boxes(concept, texts, answer) {
  return { type: 'figure-choice', concept, prompt: '正しいものを選ぼう。', explanation: 'N 極と S 極は引き合います。', hint: '色のちがう極に注目しよう。', term: false,
    boxes: texts, answer, items: null };
}
function stage1() {
  const c = 'zztest-pole';
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
    lessons: [{ text: '磁石のまわりの、磁力がはたらく空間を磁界といいます。方位磁針を置くと、N 極がさす向きが磁界の向きです。磁界のようすは線で表せます。' }, { text: CARD2 }],
    warmup: choice(c, '方位磁針は何をさす？'),
    problems: [termFill(c), choice(c, '磁界の向きは？', 2), choice(c, '磁力線は交わる？'), choice(c, 'N 極から出る？')],
    retryPool: [choice(c, '磁界のようすは？'), choice(c, '磁界の向きを調べる道具は？')],
    checkPool: [{ concept: 'field', problems: [choice(c, '確認 1'), choice(c, '確認 2'), choice(c, '確認 3')] }],
  };
}
function buildDraft() {
  const draft = author.newDraft(INPUT, NOW);
  const p = author.normalizePlan(PLAN, INPUT);
  draft.plan = p.plan;
  const s1 = author.normalizeStage(stage1(), p.plan, 0, INPUT);
  const s2 = author.normalizeStage(stage2(), p.plan, 1, INPUT);
  draft.stages = [{ stage: s1.stage, checkPool: s1.checkPool }, { stage: s2.stage, checkPool: s2.checkPool }];
  return draft;
}
function buildUnit() {
  const { unit, errors } = author.assembleUnit(buildDraft());
  assert.deepEqual(errors, []);
  return unit;
}
function allProblems(unit) {
  return unit.areas.flatMap(a => a.stages).flatMap(s => [s.warmup, ...s.problems, ...s.retryPool]).concat(unit.concepts.flatMap(c => c.checkPool));
}

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'rika-add-unit-')); }

// ---- テスト ----

test('toContentJs: unit に source: \'author\' が入り、validateUnit は空のまま', () => {
  const js = author.toContentJs(buildUnit(), INPUT, NOW);
  const mod = { exports: {} };
  vm.runInNewContext(js, { module: mod });
  assert.equal(mod.exports.unit.source, 'author');
  assert.deepEqual(cr.validateUnit(mod.exports.unit), []);
});

test('parseHeader: 書き出しの先頭 2 行から学年・分野を読む。分野の無い形は field: null、無ければ null', () => {
  const js = author.toContentJs(buildUnit(), INPUT, NOW);
  assert.deepEqual(tool.parseHeader(js), { grade: 1, field: '物理' });
  assert.deepEqual(tool.parseHeader(author.toContentJs(buildUnit(), Object.assign({}, INPUT, { grade: 3, field: '地学' }), NOW)), { grade: 3, field: '地学' });
  assert.deepEqual(tool.parseHeader(read('content/sound.js')), { grade: 1, field: null });
  assert.deepEqual(tool.parseHeader(read('content/weather.js')), { grade: 2, field: '地学' });
  assert.equal(tool.parseHeader("'use strict';\nconst x = 1;\n"), null);
  // 3 行目より後ろのコメントは見ない
  assert.equal(tool.parseHeader('// a\n// b\n// 「x」教材データ（中学1年 理科・物理）\n'), null);
});

test('patchIndexHtml: content の script の最後の直後に同じ字下げで 1 行入り、2 回目は changed: false', () => {
  const html = read('index.html');
  const lines = html.split('\n');
  const last = lines.map((l, i) => (/<script src="content\//.test(l) ? i : -1)).filter(i => i >= 0).pop();
  const r = tool.patchIndexHtml(html, 'zz-test');
  assert.equal(r.changed, true);
  const out = r.text.split('\n');
  assert.equal(out.length, lines.length + 1);
  assert.equal(out[last + 1], lines[last].match(/^\s*/)[0] + '<script src="content/zz-test.js"></script>');
  assert.equal(out[last], lines[last]);
  assert.equal(out[last + 2], lines[last + 1]);
  const again = tool.patchIndexHtml(r.text, 'zz-test');
  assert.equal(again.changed, false);
  assert.equal(again.text, r.text);
  // CRLF のファイルは CRLF のまま
  const crlf = tool.patchIndexHtml(html.replace(/\n/g, '\r\n'), 'zz-test').text;
  assert.equal(crlf, r.text.replace(/\n/g, '\r\n'));
});

test('patchSw: PRECACHE に既にある id でも VERSION が上がり、PRECACHE には足さない（--force の入れ直し）', () => {
  const sw = read('sw.js');
  const count = (t) => t.split("'content/sound.js'").length - 1;
  assert.equal(count(sw), 1);
  const r = tool.patchSw(sw, 'sound', '2099-01-01-1');
  assert.equal(r.changed, true);
  assert.equal(r.added, false);
  assert.equal(count(r.text), 1);
  assert.equal(tool.swVersion(r.text), '2099-01-01-1');
  assert.equal(r.text, sw.replace(/const VERSION = '[^']*';/, "const VERSION = '2099-01-01-1';"));
  // 分けた関数: PRECACHE への追加は重複なら changed: false、VERSION の更新は同じ値なら changed: false
  assert.equal(tool.patchSwPrecache(sw, 'sound').changed, false);
  assert.equal(tool.setSwVersion(r.text, '2099-01-01-1').changed, false);
});

test('patchSw: PRECACHE の content の最後の直後に 1 行入り VERSION が変わる。2 回目は PRECACHE に足さない。index.html と並びが合う', () => {
  const sw = read('sw.js');
  const lines = sw.split('\n');
  const last = lines.map((l, i) => (/^\s*'content\//.test(l) ? i : -1)).filter(i => i >= 0).pop();
  const r = tool.patchSw(sw, 'zz-test', '2099-01-01-1');
  assert.equal(r.changed, true);
  const out = r.text.split('\n');
  assert.equal(out.length, lines.length + 1);
  assert.equal(out[last + 1], lines[last].match(/^\s*/)[0] + "'content/zz-test.js',");
  assert.match(r.text, /const VERSION = '2099-01-01-1';/);
  assert.equal(tool.swVersion(r.text), '2099-01-01-1');
  assert.equal(r.added, true);
  // 2 回目: VERSION を渡さなければ何も変わらない。渡すと VERSION だけ変わる
  const again = tool.patchSw(r.text, 'zz-test');
  assert.equal(again.changed, false);
  assert.equal(again.text, r.text);
  const bumped = tool.patchSw(r.text, 'zz-test', '2099-01-01-2');
  assert.equal(bumped.added, false);
  assert.equal(bumped.text, r.text.replace("'2099-01-01-1'", "'2099-01-01-2'"));
  // index.html にも足したとき、script の並びと PRECACHE の .js の並びが同じ（tests/offline.test.js と同じ見方）
  const html = tool.patchIndexHtml(read('index.html'), 'zz-test').text;
  const scripts = [...html.matchAll(/<script\b[^>]*?\bsrc="([^"]+)"/g)].map(x => x[1]);
  const pre = [...r.text.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(x => x[1]).filter(f => f.endsWith('.js'));
  assert.deepEqual(pre, scripts);
});

test('nextVersion: 同じ日付なら N+1、ちがう日付なら 1', () => {
  assert.equal(tool.nextVersion('2026-11-06-24', '2026-11-06'), '2026-11-06-25');
  assert.equal(tool.nextVersion('2026-11-06-24', '2026-11-07'), '2026-11-07-1');
  assert.equal(tool.nextVersion(null, '2026-11-07'), '2026-11-07-1');
});

test('patchCurriculum: 2 年は「// 3 年」の直前、3 年は配列の最後。既にある id は changed: false。vm で読むと学年順のまま', () => {
  const src = read('content/curriculum.js');
  const row2 = { id: 'zz-test', title: "磁石の'ふしぎ'", grade: 2, field: '物理', mascot: 'E' };
  const r2 = tool.patchCurriculum(src, row2);
  assert.equal(r2.changed, true);
  const lines = r2.text.split('\n');
  const at = lines.findIndex(l => l.includes("id: 'zz-test'"));
  assert.match(lines[at + 1], /^\s*\/\/ 3 年/);
  // 既存の行と同じ字下げ・桁（grade: の位置が表示の幅でそろう）
  const width = (s) => Array.from(s).reduce((n, c) => n + (c.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
  const ref = lines.find(l => l.includes("id: 'light'"));
  assert.equal(lines[at].match(/^\s*/)[0], ref.match(/^\s*/)[0]);
  assert.equal(width(lines[at].slice(0, lines[at].indexOf('grade:'))), width(ref.slice(0, ref.indexOf('grade:'))));

  const r3 = tool.patchCurriculum(src, { id: 'zz-three', title: '三年の単元', grade: 3, field: '化学', mascot: 'C' });
  const l3 = r3.text.split('\n');
  const at3 = l3.findIndex(l => l.includes("id: 'zz-three'"));
  assert.match(l3[at3 + 1], /^\s*\];/);

  assert.equal(tool.patchCurriculum(src, { id: 'light', title: 'x', grade: 1, field: '物理', mascot: 'E' }).changed, false);
  assert.equal(tool.patchCurriculum(r2.text, row2).changed, false);

  [r2.text, r3.text].forEach((text, k) => {
    const mod = { exports: {} };
    vm.runInNewContext(text, { module: mod });
    const units = mod.exports.units();
    const hit = units.find(u => u.id === (k === 0 ? 'zz-test' : 'zz-three'));
    assert.ok(hit);
    if (k === 0) assert.equal(hit.title, "磁石の'ふしぎ'");
    const grades = units.map(u => u.grade);
    assert.deepEqual(grades, grades.slice().sort((a, b) => a - b));
    assert.equal(units.length, require('../content/curriculum.js').units().length + 1);
  });
});

test('reportMd: 表の行数が問題数と同じで、どの行にも正解が【】で入る', () => {
  const unit = buildUnit();
  const md = tool.reportMd(unit, { grade: 1, field: '物理', mascot: 'B' });
  const rows = md.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| id |'));
  assert.equal(rows.length, allProblems(unit).length);
  rows.forEach(r => assert.match(r, /【[^】]+】/, r));
  assert.match(md, /^# 教材の内容一覧「磁石のふしぎ」（先生の確認用）/);
  assert.match(md, /中学 1 年 物理、担当の先生 B しずく博士/);
  assert.match(md, /ステージ 2、概念 2、問題/);
  assert.match(md, /カード: c1 /);
  assert.match(md, /\| zztest-1-t1 \| F \| zztest-pole \| 磁石の両はしを【磁極】という。/);
  // 枠の文は図の行をつないだもの（行の境目の空白は消える）
  assert.match(md, /\| zztest-1-p2 \| FC \| zztest-pole \| .*【ア N 極と S ?極は引き合う】/);
  assert.match(md, /\| zztest-1-p3 \| F \| .*全部で【4】個/);
  assert.match(md, /AI 教材作成で作成。理科としての正しさは先生が確認する/);
});

test('loadUnitFile: toContentJs の JS と下書き JSON を読める。壊れた JS・直すところのある教材は errors', () => {
  const dir = tmpDir();
  try {
    const js = path.join(dir, 'zztest.js');
    fs.writeFileSync(js, author.toContentJs(buildUnit(), INPUT, NOW));
    const a = tool.loadUnitFile(js);
    assert.deepEqual(a.errors, []);
    assert.equal(a.kind, 'js');
    assert.equal(a.unit.id, 'zztest');
    assert.equal(a.unit.source, 'author');
    assert.deepEqual(a.header, { grade: 1, field: '物理' });

    const json = path.join(dir, 'zztest.json');
    fs.writeFileSync(json, author.exportDraftJson(buildDraft()));
    const b = tool.loadUnitFile(json);
    assert.deepEqual(b.errors, []);
    assert.equal(b.kind, 'json');
    assert.equal(b.unit.id, 'zztest');
    assert.equal(b.input.grade, 1);

    const broken = path.join(dir, 'broken.js');
    fs.writeFileSync(broken, '(function () { const unit = { id: ');
    assert.ok(tool.loadUnitFile(broken).errors.length > 0);

    // 正解が選択肢に無い問題（js/author.js の checkProblem）
    const u = buildUnit();
    u.areas[0].stages[0].problems[0].answer = 'z';
    const bad = path.join(dir, 'bad.js');
    fs.writeFileSync(bad, author.toContentJs(u, INPUT, NOW));
    assert.match(tool.loadUnitFile(bad).errors.join('\n'), /正解 z が選択肢にありません/);

    assert.ok(tool.loadUnitFile(path.join(dir, 'none.js')).errors.length > 0);
    fs.writeFileSync(path.join(dir, 'x.json'), '{"format":"rika-quest-draft"}');
    assert.ok(tool.loadUnitFile(path.join(dir, 'x.json')).errors.length > 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('idConflicts: content/sound.js と同じステージ id を持つ単元で指摘が出る。重ならなければ空', () => {
  const sound = require('../content/sound.js').unit;
  const unit = buildUnit();
  assert.deepEqual(tool.idConflicts(unit, [sound]), []);
  const sid = sound.areas[0].stages[0].id;
  unit.areas[0].stages[0].id = sid;
  const out = tool.idConflicts(unit, [sound]);
  assert.ok(out.some(m => m.includes('ステージ') && m.includes(sid) && m.includes('sound')), out.join('\n'));
  // 同じ id の単元（上書き）とは比べない
  assert.deepEqual(tool.idConflicts(sound, [sound]), []);
});

test('tools/add-unit.js --dry-run: 例外なく「何をするか」が出て、プロジェクトのファイルは変わらない', () => {
  const dir = tmpDir();
  try {
    const file = path.join(dir, 'zztest.js');
    fs.writeFileSync(file, author.toContentJs(buildUnit(), INPUT, NOW));
    const before = ['index.html', 'sw.js', 'content/curriculum.js'].map(read);
    const out = childProcess.execFileSync(process.execPath, [TOOL, file, '--dry-run'], { cwd: ROOT, encoding: 'utf8' });
    assert.match(out, /--dry-run なので書きません/);
    assert.match(out, /content\/zztest\.js を作る/);
    assert.match(out, /index\.html に <script src="content\/zztest\.js"><\/script> を足す/);
    assert.match(out, /sw\.js の PRECACHE に 'content\/zztest\.js' を足し、VERSION を/);
    assert.match(out, /content\/curriculum\.js の 1 年に「磁石のふしぎ」/);
    assert.deepEqual(['index.html', 'sw.js', 'content/curriculum.js'].map(read), before);
    assert.equal(fs.existsSync(path.join(ROOT, 'content', 'zztest.js')), false);
    assert.equal(fs.existsSync(path.join(ROOT, 'docs', 'reports', 'content', 'zztest.md')), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('ふりがなの未登録語: 足す content/<id>.js の辞書に無い語が、--dry-run の出力と確認用一覧の末尾に出る', () => {
  const root = tmpDir();
  try {
    fs.mkdirSync(path.join(root, 'content'));
    ['index.html', 'sw.js'].forEach(f => fs.copyFileSync(path.join(ROOT, f), path.join(root, f)));
    fs.readdirSync(path.join(ROOT, 'content')).filter(f => f.endsWith('.js'))
      .forEach(f => fs.copyFileSync(path.join(ROOT, 'content', f), path.join(root, 'content', f)));
    // 本番の辞書に頼らないよう、テスト専用の小さな辞書を渡す: 例の教材に出る漢字 1 字ずつ（読みは仮）と 磁石。
    // 龍涎香 は辞書に無い
    const WORDS = { '磁石': 'じしゃく' };
    (author.toContentJs(buildUnit(), INPUT, NOW).match(/\p{Script=Han}/gu) || []).forEach(ch => { WORDS[ch] = 'よみ'; });
    assert.ok(!('龍' in WORDS));
    const u = buildUnit();
    u.areas[0].stages[0].lessons[0].text += '龍涎香のような、めずらしいことばもいれておきます。';
    const file = path.join(root, 'zztest.js');
    fs.writeFileSync(file, author.toContentJs(u, INPUT, NOW));

    const list = tool.rubyMissing(fs.readFileSync(file, 'utf8'), WORDS);
    const hit = list.find(e => e.word.startsWith('龍涎香'));
    assert.ok(hit, JSON.stringify(list));
    assert.equal(hit.count, 1);
    assert.equal(list.length, 1, '辞書にある語が未登録語に出た: ' + JSON.stringify(list));
    // 辞書に足すと出なくなる
    assert.ok(!tool.rubyMissing(fs.readFileSync(file, 'utf8'), Object.assign({ '龍涎香': 'りゅうぜんこう' }, WORDS)).some(e => e.word.startsWith('龍涎香')));

    const logs = [], errs = [];
    const opts = { root, words: WORDS, now: new Date(2026, 10, 6, 12), log: (l) => logs.push(l), error: (l) => errs.push(l) };
    assert.equal(tool.run([file, '--dry-run'], opts), 0, errs.join('\n'));
    const line = logs.find(l => l.startsWith('ふりがなの辞書にない語: '));
    assert.ok(line, logs.join('\n'));
    assert.match(line, /^ふりがなの辞書にない語: \d+ 件（上位 30: .*龍涎香.*）。content\/readings\.js の WORDS に足してください（node tools\/ruby-missing\.js で確認）$/);

    assert.equal(tool.run([file, '--no-test'], opts), 0, errs.join('\n'));
    const md = fs.readFileSync(path.join(root, 'docs', 'reports', 'content', 'zztest.md'), 'utf8');
    const at = md.indexOf('## ふりがなの未登録語');
    assert.ok(at > 0);
    assert.ok(md.indexOf('## ', at + 3) < 0, 'ふりがなの未登録語が末尾にない');
    assert.match(md.slice(at), /^- 龍涎香\S* ×1$/m);
    assert.equal(md.slice(at).split('\n').filter(l => l.startsWith('- ')).length, list.length);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('run: 一時フォルダに組みこむと 5 つのファイルが書かれ、2 回目は --force が無いと止まる', () => {
  const root = tmpDir();
  try {
    fs.mkdirSync(path.join(root, 'content'));
    ['index.html', 'sw.js'].forEach(f => fs.copyFileSync(path.join(ROOT, f), path.join(root, f)));
    fs.readdirSync(path.join(ROOT, 'content')).filter(f => f.endsWith('.js'))
      .forEach(f => fs.copyFileSync(path.join(ROOT, 'content', f), path.join(root, 'content', f)));
    const draftFile = path.join(root, 'zztest.json');
    fs.writeFileSync(draftFile, author.exportDraftJson(buildDraft()));
    const logs = [], errs = [];
    const opts = { root, now: new Date(2026, 10, 6, 12), log: (l) => logs.push(l), error: (l) => errs.push(l) };

    assert.equal(tool.run([draftFile, '--no-test', '--grade', '2', '--mascot', 'E'], opts), 0, errs.join('\n'));
    const r = (f) => fs.readFileSync(path.join(root, f), 'utf8');
    const content = r('content/zztest.js');
    const mod = { exports: {} };
    vm.runInNewContext(content, { module: mod });
    assert.equal(mod.exports.unit.source, 'author');
    assert.equal(mod.exports.unit.mascot, 'E');
    assert.deepEqual(tool.parseHeader(content), { grade: 2, field: '物理' });
    assert.ok(r('index.html').includes('<script src="content/zztest.js"></script>'));
    assert.ok(r('sw.js').includes("'content/zztest.js',"));
    const v = tool.swVersion(r('sw.js'));
    assert.equal(v, tool.nextVersion(tool.swVersion(read('sw.js')), '2026-11-06'));
    assert.match(r('content/curriculum.js'), /id: 'zztest',\s+title: '磁石のふしぎ',\s+grade: 2, field: '物理', mascot: 'E' \},/);
    assert.match(r('docs/reports/content/zztest.md'), /担当の先生 E キューブ先生/);

    // 2 回目: content/zztest.js が既にあるので止まる
    errs.length = 0;
    assert.equal(tool.run([draftFile, '--no-test'], opts), 1);
    assert.match(errs.join('\n'), /既にあります/);

    // 書いた JS をもう一度 --force で組みこむと、index.html などは変わらず、sw.js は VERSION だけ上がる
    const html = r('index.html'), sw = r('sw.js'), cur = r('content/curriculum.js');
    const again = path.join(root, 'again.js');
    fs.writeFileSync(again, content);
    logs.length = 0;
    assert.equal(tool.run([again, '--no-test', '--force', '--dry-run'], opts), 0, errs.join('\n'));
    assert.ok(logs.some(l => l.includes("PRECACHE には既に 'content/zztest.js' があるので足さず、VERSION を " + v + ' → ' + tool.nextVersion(v, '2026-11-06'))), logs.join('\n'));
    assert.equal(r('sw.js'), sw);   // --dry-run は書かない
    assert.equal(tool.run([again, '--no-test', '--force'], opts), 0, errs.join('\n'));
    assert.equal(r('index.html'), html);
    assert.equal(tool.swVersion(r('sw.js')), tool.nextVersion(v, '2026-11-06'));
    assert.equal(r('sw.js'), sw.replace("'" + v + "'", "'" + tool.nextVersion(v, '2026-11-06') + "'"));
    assert.equal(r('sw.js').split("'content/zztest.js'").length - 1, 1);
    assert.equal(r('content/curriculum.js'), cur);
    assert.equal(r('content/zztest.js'), content);

    // ほかの単元と id が重なると止まる
    const u = buildUnit();
    u.id = 'zztest2';
    const dup = path.join(root, 'zztest2.js');
    fs.writeFileSync(dup, author.toContentJs(u, INPUT, NOW));
    errs.length = 0;
    assert.equal(tool.run([dup, '--no-test'], opts), 1);
    assert.match(errs.join('\n'), /単元 zztest と重なっています/);

    // 学年・分野が分からなければ止まる（先頭コメントの無い JS）
    errs.length = 0;
    const noHead = path.join(root, 'nohead.js');
    fs.writeFileSync(noHead, content.split('\n').slice(2).join('\n').replace(/"id": "zztest"/, '"id": "zztest3"'));
    assert.equal(tool.run([noHead, '--no-test', '--dry-run'], opts), 1);
    assert.match(errs.join('\n'), /学年が分かりません/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
