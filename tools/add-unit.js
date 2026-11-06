// 「教材を作る」で書き出した教材を、公開版に組みこむ Node スクリプト（設計書 13 章「公開」）
// 使い方: node tools/add-unit.js <file> [--grade 1|2|3] [--field 物理|化学|生物|地学] [--mascot A-F] [--force] [--dry-run] [--no-test]
//   <file> … 書き出した content/<id>.js（JS）か、下書き JSON（「下書きを書き出す」の形）
//   --grade・--field … 学年・分野（省くと JS の先頭コメント、下書き JSON の input から読む）
//   --mascot … 担当の先生（省くと unit.mascot）
//   --force … content/<id>.js・docs/reports/content/<id>.md が既にあっても上書きする
//   --dry-run … ファイルを書かずに「何をするか」だけを出す
//   --no-test … 最後の npm test を行わない
// することは: 教材の検査 → content/<id>.js を書く → index.html の script・sw.js の PRECACHE と VERSION・
// content/curriculum.js の単元一覧の表に足す → ふりがなの辞書にない語を調べる（--dry-run でも出す）→
// docs/reports/content/<id>.md（先生の確認用一覧。末尾にふりがなの未登録語）を作る → npm test。
// ほかのスクリプト・テストから使えるように、require したときは関数を返す（実行はしない）。
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const childProcess = require('node:child_process');
const registry = require('../js/content-registry.js');
const author = require('../js/author.js');
const mascotLib = require('../js/mascot.js');
const rubyLib = require('../js/ruby.js');
const rubyTool = require('./ruby-missing.js');   // require したときは関数を返す（実行しない）

const ROOT = path.join(__dirname, '..');
const FIELDS = ['物理', '化学', '生物', '地学'];
const MASCOTS = ['A', 'B', 'C', 'D', 'E', 'F'];
const NOT_UNITS = ['curriculum', 'readings'];   // content/ のうち単元でないファイル
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const USAGE = '使い方: node tools/add-unit.js <file> [--grade 1|2|3] [--field 物理|化学|生物|地学] [--mascot A-F] [--force] [--dry-run] [--no-test]';

function list(x) { return Array.isArray(x) ? x : []; }
function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

// ---- 文字列の書きかえ（どれも元の文字列は変えず、新しい文字列を返す） ----

// 行に分ける。CRLF のファイルは行末の \r を行に残す（書きもどすと改行コードが保たれる）
function linesOf(text) { return String(text).split('\n'); }
function crOf(line) { return line.endsWith('\r') ? '\r' : ''; }

// 書き出しの先頭 2 行のコメント「// 「…」教材データ（中学N年 理科・分野）」から学年・分野を読む。
// 分野の無い形（中学1年 理科）は field: null。どちらも読めなければ null
function parseHeader(text) {
  const head = linesOf(String(text).replace(/^\uFEFF/, '')).slice(0, 2).join('\n');
  const m = head.match(/^\/\/ 「[^\n]*」教材データ（中学\s*([1-3])\s*年\s*理科(?:・(物理|化学|生物|地学))?）/m);
  if (!m) return null;
  return { grade: Number(m[1]), field: m[2] || null };
}

// index.html の <script src="content/…"> の最後の行の直後に、同じ字下げで content/<id>.js を足す
function patchIndexHtml(text, id) {
  const tag = '<script src="content/' + id + '.js"></script>';
  if (text.includes(tag)) return { text, changed: false };
  const lines = linesOf(text);
  let last = -1;
  lines.forEach((ln, i) => { if (/^\s*<script src="content\/[^"]+"><\/script>\r?$/.test(ln)) last = i; });
  if (last < 0) throw new Error('index.html に <script src="content/…"> の行が見つかりません');
  const indent = lines[last].match(/^\s*/)[0];
  lines.splice(last + 1, 0, indent + tag + crOf(lines[last]));
  return { text: lines.join('\n'), changed: true };
}

// sw.js の PRECACHE の 'content/…' の最後の直後に 'content/<id>.js', を足す。既に入っていれば足さない（changed: false）
function patchSwPrecache(text, id) {
  const m = text.match(/const PRECACHE = \[([\s\S]*?)\];/);
  if (!m) throw new Error('sw.js に PRECACHE が見つかりません');
  const entry = "'content/" + id + ".js'";
  if (m[1].includes(entry)) return { text, changed: false };
  const start = m.index;
  const end = m.index + m[0].length;
  const lines = linesOf(text);
  // PRECACHE の範囲の行だけを見る
  let pos = 0, last = -1;
  lines.forEach((ln, i) => {
    const lineStart = pos;
    pos += ln.length + 1;
    if (lineStart < start || lineStart > end) return;
    if (/^\s*'content\/[^']+',?\s*(\/\/.*)?\r?$/.test(ln)) last = i;
  });
  if (last < 0) throw new Error("sw.js の PRECACHE に 'content/…' の行が見つかりません");
  const cr = crOf(lines[last]);
  const indent = lines[last].match(/^\s*/)[0];
  // 最後の要素で , が無ければ付ける
  if (!/',/.test(lines[last])) lines[last] = lines[last].replace(/'(\s*(\/\/.*)?\r?)$/, "',$1");
  lines.splice(last + 1, 0, indent + entry + ',' + cr);
  return { text: lines.join('\n'), changed: true };
}

// sw.js の VERSION を version にする（同じなら changed: false）
function setSwVersion(text, version) {
  if (!/const VERSION = '[^']*';/.test(text)) throw new Error('sw.js に VERSION が見つかりません');
  const out = text.replace(/const VERSION = '[^']*';/, "const VERSION = '" + version + "';");
  return { text: out, changed: out !== text };
}

// PRECACHE への追加（重複なら足さない）と、VERSION の更新（version を渡せば、PRECACHE に既にあっても必ず行う）。
// 教材を書いたら（新規でも --force の入れ直しでも）キャッシュを入れ替えるため、VERSION は常に上げる
function patchSw(text, id, version) {
  const pre = patchSwPrecache(text, id);
  if (!version) return pre;
  const ver = setSwVersion(pre.text, version);
  return { text: ver.text, changed: pre.changed || ver.changed, added: pre.changed };
}

// sw.js の今の VERSION（無ければ null）
function swVersion(text) {
  const m = String(text).match(/const VERSION = '([^']*)';/);
  return m ? m[1] : null;
}

// 次の VERSION（YYYY-MM-DD-N）。同じ日付なら N+1、ちがう日付なら today-1
function nextVersion(current, today) {
  const m = String(current || '').match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
  if (m && m[1] === today) return today + '-' + (Number(m[2]) + 1);
  return today + '-1';
}

// 端末ローカルの今日の日付（YYYY-MM-DD）
function localToday(now) {
  const d = now instanceof Date ? now : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// 表示の幅（全角は 2）。単元一覧の表の桁をそろえるために使う
function displayWidth(s) {
  return Array.from(String(s)).reduce((n, c) => n + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(c) ? 2 : 1), 0);
}
function padTo(s, width) { return s + ' '.repeat(Math.max(1, width - displayWidth(s))); }
function quote(s) { return "'" + String(s).replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }

// content/curriculum.js の UNITS に行を足す（row = { id, title, grade, field, mascot }）。
// 入れる場所は、その学年のブロックの最後（次の学年のコメント「// N 年」の前。最後の学年なら配列の最後）。
// 同じ id の行が既にあれば何も変えない
function patchCurriculum(text, row) {
  const m = text.match(/const UNITS = \[([\s\S]*?)\n\s*\];/);
  if (!m) throw new Error('content/curriculum.js に UNITS の表が見つかりません');
  const idRe = new RegExp("\\bid:\\s*'" + String(row.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'");
  if (idRe.test(m[1])) return { text, changed: false };
  const lines = linesOf(text);
  const startLine = text.slice(0, m.index).split('\n').length - 1;          // const UNITS = [ の行
  const endLine = startLine + m[0].split('\n').length - 1;                   // ]; の行
  const rowLines = [];
  for (let i = startLine + 1; i < endLine; i++) if (/^\s*\{\s*id:/.test(lines[i])) rowLines.push(i);
  // 既存の行の書き方（字下げ・桁）に合わせる
  const sample = rowLines.length ? lines[rowLines[0]].replace(/\r$/, '') : "    { id: 'x', title: 'x', grade: 1, field: 'x', mascot: 'x' },";
  const indent = sample.match(/^\s*/)[0];
  const body = sample.slice(indent.length);
  const iId = body.indexOf('id:'), iTitle = body.indexOf('title:'), iGrade = body.indexOf('grade:');
  const idWidth = iTitle > iId ? displayWidth(body.slice(iId, iTitle)) : 0;
  const titleWidth = iGrade > iTitle ? displayWidth(body.slice(iTitle, iGrade)) : 0;
  const line = indent + '{ ' + padTo('id: ' + quote(row.id) + ',', idWidth) + padTo('title: ' + quote(row.title) + ',', titleWidth) +
    'grade: ' + Number(row.grade) + ', field: ' + quote(row.field) + ', mascot: ' + quote(row.mascot) + ' },' + crOf(lines[startLine]);
  // 次の学年のコメントを探す
  let at = -1;
  for (let i = startLine + 1; i < endLine; i++) {
    const c = lines[i].match(/^\s*\/\/\s*([1-3])\s*年/);
    if (c && Number(c[1]) > Number(row.grade)) { at = i; break; }
  }
  if (at < 0) {
    // 最後の学年: 配列の最後の行の後ろ（]; の前）
    at = endLine;
  }
  lines.splice(at, 0, line);
  return { text: lines.join('\n'), changed: true };
}

// ---- 先生の確認用一覧（docs/reports/content/<id>.md） ----

const TYPE_SHORT = { choice: 'C', fill: 'F', 'figure-choice': 'FC', drag: 'D', 'ray-draw': 'R' };

function plain(s) { return String(s === undefined || s === null ? '' : s).split('**').join(''); }
// 表のセルに入れる文（改行は空白、| はエスケープ）
function cell(s) { return plain(s).replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/\|/g, '\\|').trim(); }
function head(s, n) { const a = Array.from(plain(s).replace(/[\r\n]+/g, ' ').trim()); return a.length > n ? a.slice(0, n).join('') + '…' : a.join(''); }

// 枠選び（js/author.js の boxesScene）の図なら、枠ごとの文。ちがう形なら null
function boxTexts(fig) {
  if (!isObject(fig)) return null;
  const groups = [];
  for (const it of list(fig.items)) {
    if (!isObject(it)) return null;
    if (it.type === 'rect') groups.push('');
    else if (it.type === 'text') { if (groups.length === 0) return null; groups[groups.length - 1] += String(it.text || ''); }
    else if (it.type !== 'region') return null;
  }
  return groups.length >= 2 ? groups : null;
}

// 問題の「内容【正解】」
function problemSummary(p) {
  if (!isObject(p)) return '（問題の形ではありません）';
  if (p.type === 'choice') {
    const o = list(p.options).find(x => isObject(x) && x.id === p.answer);
    return cell(p.prompt) + '【' + cell(o ? o.text : p.answer) + '】';
  }
  if (p.type === 'fill') {
    let t = cell(p.text);
    const rest = [];
    list(p.blanks).forEach(b => {
      if (!isObject(b)) return;
      // 数の単位は画面と同じく空らんの後ろに出す（js/ui-problems.js）
      const ans = '【' + cell(b.answer) + '】' + (b.kind === 'number' && b.unit ? cell(b.unit) : '');
      const mark = '[' + b.id + ']';
      if (t.includes(mark)) t = t.split(mark).join(ans);
      else rest.push(ans);
    });
    const words = list(p.blanks).filter(b => isObject(b) && b.kind === 'word' && list(b.options).length).map(b => list(b.options).map(cell).join('／'));
    return t + rest.join('') + (words.length ? '（語群: ' + words.join('、') + '）' : '');
  }
  if (p.type === 'figure-choice') {
    const items = isObject(p.figure) ? list(p.figure.items) : [];
    const regions = items.filter(it => isObject(it) && it.type === 'region');
    const k = regions.findIndex(r => r.id === p.answer);
    const region = regions[k];
    const boxes = boxTexts(p.figure);
    let ans;
    if (boxes && k >= 0 && k < boxes.length) {
      ans = (region.label ? region.label + ' ' : '') + boxes[k];
      return cell(p.prompt) + ' ' + boxes.map((b, i) => ((regions[i] && regions[i].label) || String(i + 1)) + ' ' + cell(b)).join('／') + '【' + cell(ans) + '】';
    }
    ans = region ? (region.label || region.id) : String(p.answer);
    return cell(p.prompt) + '【' + cell(ans) + '】';
  }
  // ray-draw・drag（AI 教材作成では作らない形）
  return cell(p.prompt) + '【操作の問題（正解例は教材ファイルの samples.correct）】';
}

function problemRow(p) {
  const x = isObject(p) ? p : {};
  return '| ' + cell(x.id) + ' | ' + (TYPE_SHORT[x.type] || cell(x.type)) + ' | ' + cell(x.concept) + ' | ' + problemSummary(p) + ' |';
}
const TABLE_HEAD = ['| id | 形式 | 概念 | 内容【正解】 |', '|---|---|---|---|'];

// 先生の確認用一覧（docs/reports/content/sound.md と同じ形）。meta = { grade, field, mascot }
function reportMd(unit, meta) {
  const u = isObject(unit) ? unit : {};
  const m = isObject(meta) ? meta : {};
  const areas = list(u.areas).filter(isObject).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const stages = areas.flatMap(a => list(a.stages).filter(isObject));
  const concepts = list(u.concepts).filter(isObject);
  const stageProblems = stages.flatMap(s => [s.warmup].concat(list(s.problems), list(s.retryPool)).filter(Boolean));
  const checkProblems = concepts.flatMap(c => list(c.checkPool));
  const key = m.mascot || u.mascot;
  const teacher = Object.prototype.hasOwnProperty.call(mascotLib.MASCOTS, key) ? key + ' ' + mascotLib.MASCOTS[key].name : String(key || '');
  const out = [
    '# 教材の内容一覧「' + plain(u.title) + '」（先生の確認用）',
    '',
    '原本は `content/' + u.id + '.js`。AI 教材作成で作成した教材を tools/add-unit.js で組みこんだ。理科としての正しさは先生が確認する（設計書 10）。',
    '',
    '- 単元 `' + u.id + '`「' + plain(u.title) + '」（中学 ' + m.grade + ' 年 ' + (m.field || '') + '、担当の先生 ' + teacher + '）',
    '- 領域 ' + areas.length + ': ' + areas.map(a => '`' + a.id + '`「' + plain(a.title) + '」(order ' + a.order + ')').join('、'),
    '- ステージ ' + stages.length + '、概念 ' + concepts.length + '、問題 ' + (stageProblems.length + checkProblems.length) + ' 問（ステージの warmup・problems・retryPool ' +
      stageProblems.length + ' 問 ＋ 確認問題 ' + checkProblems.length + ' 問）',
    '',
    '形式の略: C = choice、F = fill、FC = figure-choice、D = drag、R = ray-draw。正解を【】で示す。用語問題（`term: true`）は id が `-t`。',
  ];
  stages.forEach(s => {
    out.push('', '## ' + s.id + '「' + plain(s.title) + '」（' + s.minutes + ' 分、概念 ' + list(s.concepts).join('・') + '）', '');
    const cards = list(s.lessons).filter(isObject).map((c, i) => {
      const short = typeof c.id === 'string' && c.id.indexOf(s.id + '-') === 0 ? c.id.slice(s.id.length + 1) : (c.id || 'c' + (i + 1));
      return short + ' ' + cell(head(c.text, 40));
    });
    out.push('カード: ' + cards.join('／'), '');
    out.push(...TABLE_HEAD);
    [s.warmup].concat(list(s.problems), list(s.retryPool)).filter(Boolean).forEach(p => out.push(problemRow(p)));
  });
  out.push('', '## 概念の確認問題（checkPool）', '', ...TABLE_HEAD);
  checkProblems.forEach(p => out.push(problemRow(p)));
  out.push('', '## 概念のつながり（basic）', '');
  concepts.forEach(c => out.push('- ' + c.id + '「' + plain(c.title) + '」← ' + (c.basic === null || c.basic === undefined ? '（なし）' : c.basic) + '（初めて学ぶステージ ' + c.lessonStageId + '）'));
  out.push('', 'AI 教材作成で作成。理科としての正しさは先生が確認する。', '');
  // ふりがなの未登録語（meta.rubyMissing = [{ word, count }]。渡されたときだけ書く）
  if (Array.isArray(m.rubyMissing)) {
    out.push('## ふりがなの未登録語', '');
    if (m.rubyMissing.length === 0) out.push('なし（辞書 content/readings.js の語で、すべての漢字に読みが付く）。', '');
    else {
      out.push('辞書（content/readings.js）に無い漢字の語 ' + m.rubyMissing.length + ' 件（回数の多い順）。`WORDS` に足し、`node tools/ruby-missing.js` で確かめる。', '');
      m.rubyMissing.forEach(e => out.push('- ' + e.word + ' ×' + e.count));
      out.push('');
    }
  }
  return out.join('\n');
}

// ---- 教材を読む ----

// content/*.js の形の JS を評価して unit を取り出す（module.exports.unit か RikaQuest.content.register に渡されたもの）
function evalUnitJs(text, filename) {
  const got = [];
  const mod = { exports: {} };
  const sandbox = { module: mod, RikaQuest: { content: { register: (u) => got.push(u) } } };
  vm.runInNewContext(text, sandbox, { filename: filename || 'unit.js', timeout: 5000 });
  if (mod.exports && isObject(mod.exports.unit)) return mod.exports.unit;
  if (isObject(got[got.length - 1])) return got[got.length - 1];
  throw new Error('module.exports.unit も RikaQuest.content.register(unit) もありません');
}

// unit の全問題（ステージの warmup・problems・retryPool と、概念の checkPool）
function allProblems(unit) {
  const stages = list(unit && unit.areas).filter(isObject).flatMap(a => list(a.stages).filter(isObject));
  return stages.flatMap(s => [s.warmup].concat(list(s.problems), list(s.retryPool)))
    .concat(list(unit && unit.concepts).filter(isObject).flatMap(c => list(c.checkPool)))
    .filter(isObject);
}

// 教材の検査（validateUnit と、js/author.js の問題ごとの検査）
function unitErrors(unit) {
  const errors = registry.validateUnit(unit);
  if (!isObject(unit)) return errors;
  if (typeof unit.id !== 'string' || !ID_RE.test(unit.id)) errors.push('単元の id ' + unit.id + ' は英小文字・数字・ハイフンで書いてください');
  else if (NOT_UNITS.includes(unit.id)) errors.push('単元の id ' + unit.id + ' は使えません（content/' + unit.id + '.js は単元でないファイル）');
  if (typeof unit.title !== 'string' || unit.title.trim() === '') errors.push('単元名（title）がありません');
  allProblems(unit).forEach(p => author.checkProblem(p).forEach(e => errors.push(e)));
  return errors;
}

// 書き出した JS か下書き JSON を読む。
// 戻り値 { unit, errors, kind: 'js'|'json', text（JS の中身。JSON なら null）, header（学年・分野。読めなければ null）, input（下書きの input） }
function loadUnitFile(file) {
  const res = { unit: null, errors: [], kind: null, text: null, header: null, input: null };
  let raw;
  try { raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); } catch (e) { res.errors.push('ファイルを読めません: ' + file); return res; }
  const isJson = /\.json$/i.test(file) || raw.trim().charAt(0) === '{';
  if (isJson) {
    res.kind = 'json';
    const imp = author.importDraftJson(raw);
    if (imp.error) { res.errors.push(imp.error); return res; }
    res.input = imp.draft.input;
    const asm = author.assembleUnit(imp.draft);
    res.unit = asm.unit;
    res.errors = asm.errors.slice();
    return res;
  }
  res.kind = 'js';
  res.text = raw;
  res.header = parseHeader(raw);
  try { res.unit = evalUnitJs(raw, path.basename(file)); } catch (e) { res.errors.push('JS として読めません（' + e.message + '）'); return res; }
  res.errors = unitErrors(res.unit);
  return res;
}

// ほかの単元とぶつかる id（ステージ・概念・問題、tests/content-all.test.js が見る領域・カードも）。同じ id の単元（上書き）は比べない
function idConflicts(unit, otherUnits) {
  const ids = (u) => {
    const out = [];
    list(u && u.concepts).filter(isObject).forEach(c => { out.push(['概念', c.id]); list(c.checkPool).forEach(p => isObject(p) && out.push(['問題', p.id])); });
    list(u && u.areas).filter(isObject).forEach(a => {
      out.push(['領域', a.id]);
      list(a.stages).filter(isObject).forEach(s => {
        out.push(['ステージ', s.id]);
        list(s.lessons).forEach(c => isObject(c) && out.push(['カード', c.id]));
        [s.warmup].concat(list(s.problems), list(s.retryPool)).forEach(p => isObject(p) && out.push(['問題', p.id]));
      });
    });
    return out;
  };
  const owner = new Map();   // 'kind:id' → 単元 id
  list(otherUnits).filter(u => isObject(u) && u.id !== (unit && unit.id)).forEach(u => {
    ids(u).forEach(([kind, id]) => { const k = kind + ':' + id; if (!owner.has(k)) owner.set(k, u.id); });
  });
  const out = [];
  const seen = new Set();
  ids(unit).forEach(([kind, id]) => {
    const k = kind + ':' + id;
    if (owner.has(k) && !seen.has(k)) { seen.add(k); out.push(kind + ' の id ' + id + ' が単元 ' + owner.get(k) + ' と重なっています'); }
  });
  return out;
}

// content/ の登録済みの単元（exceptId の単元は除く）。読めないファイルは errors に
function loadOtherUnits(root, exceptId) {
  const dir = path.join(root, 'content');
  const units = [], errors = [];
  fs.readdirSync(dir).filter(f => f.endsWith('.js') && !NOT_UNITS.includes(f.replace(/\.js$/, '')) && f !== exceptId + '.js').sort().forEach(f => {
    try { units.push(evalUnitJs(fs.readFileSync(path.join(dir, f), 'utf8'), f)); } catch (e) { errors.push('content/' + f + ' を読めません（' + e.message + '）'); }
  });
  return { units, errors };
}

// ---- ふりがなの未登録語 ----

// ふりがなの辞書（WORDS）を読む。readingsPath を省くと本番の content/readings.js
function loadWords(readingsPath) {
  return require(path.resolve(readingsPath || path.join(ROOT, 'content', 'readings.js'))).WORDS;
}

// content/<id>.js の中身（文字列）の文字列リテラルのうち、辞書 words（{ 漢字の語: 読み }）で読みが付かない漢字の語。
// words を省くと本番の辞書（content/readings.js）。テストは小さな辞書を渡す。
// tools/ruby-missing.js と同じ数え方（前後の送りがなつき）→ [{ word, count }]（回数の多い順）
function rubyMissing(contentText, words) {
  const dict = isObject(words) ? words : loadWords();
  const texts = rubyTool.stringLiterals(String(contentText)).map(text => ({ file: 'content', text }));
  return rubyTool.missing(texts, dict, rubyLib).map(e => ({ word: e.word, count: e.count }));
}

// 標準出力に出す 1 行
function rubyMessage(words) {
  const ws = list(words);
  if (ws.length === 0) return 'ふりがなの辞書にない語: 0 件。';
  return 'ふりがなの辞書にない語: ' + ws.length + ' 件（上位 30: ' + ws.slice(0, 30).map(e => e.word + '×' + e.count).join('、') +
    (ws.length > 30 ? ' ほか' : '') + '）。content/readings.js の WORDS に足してください（node tools/ruby-missing.js で確認）';
}

// ---- 書き出した JS の手なおし ----

// source: 'author' を const unit = { の直後に足す（既にあればそのまま）
function addSourceMark(text) {
  const lines = linesOf(text);
  const i = lines.findIndex(ln => /const unit = \{\s*\r?$/.test(ln));
  if (i < 0) throw new Error('「const unit = {」の行が見つからないため、source: \'author\' を足せません');
  const next = lines[i + 1] || '';
  const indent = (next.match(/^\s*/) || [''])[0] || (lines[i].match(/^\s*/)[0] + '  ');
  const json = /^\s*"/.test(next);
  lines.splice(i + 1, 0, indent + (json ? '"source": "author",' : "source: 'author',") + crOf(lines[i]));
  return lines.join('\n');
}

// 担当の先生を書きかえる（toContentJs の "mascot": "X" か、手書きの mascot: 'X' の最初の 1 つ）
function setMascot(text, key) {
  if (/"mascot":\s*"[^"]*"/.test(text)) return text.replace(/"mascot":\s*"[^"]*"/, '"mascot": "' + key + '"');
  if (/\bmascot:\s*'[^']*'/.test(text)) return text.replace(/\bmascot:\s*'[^']*'/, "mascot: '" + key + "'");
  throw new Error('教材の中に mascot が見つからないため、担当の先生を書きかえられません');
}

// ---- 実行 ----

function parseArgs(argv) {
  const o = { file: null, grade: null, field: null, mascot: null, force: false, dryRun: false, noTest: false, errors: [] };
  const value = (i, name) => { if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) { o.errors.push(name + ' に値がありません'); return null; } return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--grade') { o.grade = value(i, a); i++; }
    else if (a === '--field') { o.field = value(i, a); i++; }
    else if (a === '--mascot') { o.mascot = value(i, a); i++; }
    else if (a === '--force') o.force = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--no-test') o.noTest = true;
    else if (a.startsWith('--')) o.errors.push('知らない指定 ' + a + ' です');
    else if (o.file === null) o.file = a;
    else o.errors.push('ファイルは 1 つだけ指定してください（' + a + '）');
  }
  if (!o.file) o.errors.push('組みこむファイルを指定してください');
  return o;
}

// 改行コードを LF にそろえる（新しく作るファイル用）
function lf(text) { return String(text).replace(/\r\n/g, '\n'); }

// 実行の本体。終了コードを返す。opts = { root（書きこむフォルダ。テスト用）, now, log, error, words（ふりがなの辞書。テスト用。省くと root の content/readings.js） }
function run(argv, opts) {
  const o = Object.assign({ root: ROOT, now: new Date(), log: console.log, error: console.error }, opts || {});
  const log = o.log, error = o.error;
  const fail = (lines) => { [].concat(lines).forEach(l => error(l)); return 1; };
  const args = parseArgs(argv);
  if (args.errors.length) return fail(args.errors.concat([USAGE]));

  // 1. 教材を読んで検査する
  const loaded = loadUnitFile(path.resolve(args.file));
  if (loaded.errors.length || !loaded.unit) {
    return fail(['教材に直すところがあります（' + loaded.errors.length + ' 件）。組みこみをやめました。'].concat(loaded.errors.map(e => '  - ' + e)));
  }
  const unit = loaded.unit;
  const id = unit.id;

  // 学年・分野・担当の先生: 引数 > JS の先頭コメント > 下書きの input
  const header = loaded.header || {};
  const input = loaded.input || {};
  const grade = Number(args.grade !== null ? args.grade : (header.grade || input.grade));
  const field = args.field !== null ? args.field : (header.field || input.field || null);
  const mascot = args.mascot !== null ? args.mascot : unit.mascot;
  const bad = [];
  if (![1, 2, 3].includes(grade)) bad.push('学年が分かりません。--grade 1|2|3 で指定してください');
  if (!FIELDS.includes(field)) bad.push('分野が分かりません。--field ' + FIELDS.join('|') + ' で指定してください');
  if (!MASCOTS.includes(mascot)) bad.push('担当の先生 ' + mascot + ' は使えません。--mascot A-F で指定してください');
  if (bad.length) return fail(bad);

  // 2. 既にあるか、ほかの単元と id がぶつからないか
  const rel = (p) => path.relative(o.root, p).split(path.sep).join('/');
  const contentPath = path.join(o.root, 'content', id + '.js');
  const reportPath = path.join(o.root, 'docs', 'reports', 'content', id + '.md');
  const exists = fs.existsSync(contentPath);
  if (exists && !args.force) return fail(['content/' + id + '.js は既にあります。上書きするときは --force を付けてください']);
  const others = loadOtherUnits(o.root, id);
  if (others.errors.length) return fail(others.errors);
  const conflicts = idConflicts(unit, others.units);
  if (conflicts.length) return fail(['ほかの単元と id が重なっています（' + conflicts.length + ' 件）。組みこみをやめました。'].concat(conflicts.map(e => '  - ' + e)));

  // 3. content/<id>.js の中身
  let contentText;
  try {
    if (loaded.kind === 'json') {
      const u = Object.assign({}, unit, { mascot });
      contentText = author.toContentJs(u, Object.assign({}, input, { grade, field }), o.now);
    } else {
      contentText = lf(loaded.text);
      if (unit.source === undefined) contentText = addSourceMark(contentText);
      else if (unit.source !== 'author') return fail(['教材の source が ' + unit.source + ' です（AI 教材作成の教材は \'author\'）']);
      if (mascot !== unit.mascot) contentText = setMascot(contentText, mascot);
    }
    // 書く中身をもう一度読んで、検査が通ることを確かめる
    const check = evalUnitJs(contentText, id + '.js');
    const errs = unitErrors(check);
    if (check.id !== id || check.mascot !== mascot || check.source !== 'author') errs.push('書く中身の id・mascot・source が合いません');
    if (errs.length) return fail(['書く中身の検査が通りません。'].concat(errs.map(e => '  - ' + e)));
  } catch (e) { return fail(['content/' + id + '.js の中身を作れません（' + e.message + '）']); }
  const finalUnit = evalUnitJs(contentText, id + '.js');

  // 4〜6. index.html・sw.js・content/curriculum.js
  const read = (f) => fs.readFileSync(path.join(o.root, f), 'utf8');
  const files = {};
  const plan = [];
  try {
    const html = patchIndexHtml(read('index.html'), id);
    if (html.changed) { files['index.html'] = html.text; plan.push('index.html に <script src="content/' + id + '.js"></script> を足す'); }
    else plan.push('index.html には既に入っている（変えない）');
    const swText = read('sw.js');
    const version = nextVersion(swVersion(swText), localToday(o.now));
    // content/<id>.js を書くので、PRECACHE に既にあっても（--force の入れ直し）VERSION は必ず上げる
    const sw = patchSw(swText, id, version);
    files['sw.js'] = sw.text;
    plan.push('sw.js の ' + (sw.added ? "PRECACHE に 'content/" + id + ".js' を足し、" : "PRECACHE には既に 'content/" + id + ".js' があるので足さず、") +
      'VERSION を ' + swVersion(swText) + ' → ' + version + ' にする');
    const row = { id, title: finalUnit.title, grade, field, mascot };
    const cur = patchCurriculum(read('content/curriculum.js'), row);
    if (cur.changed) { files['content/curriculum.js'] = cur.text; plan.push('content/curriculum.js の ' + grade + ' 年に「' + finalUnit.title + '」（' + field + '・先生 ' + mascot + '）の行を足す'); }
    else plan.push('content/curriculum.js には既に ' + id + ' の行がある（変えない）');
  } catch (e) { return fail([e.message]); }

  // 7. 先生の確認用一覧
  const reportExists = fs.existsSync(reportPath);
  const writeReport = !reportExists || args.force;
  // ふりがなの未登録語（新しく足す content/<id>.js の文字だけ。辞書は書きこむフォルダの content/readings.js）
  let rubyList;
  // （opts.words を渡すとその辞書を使う。テスト用）
  try { rubyList = rubyMissing(contentText, isObject(o.words) ? o.words : loadWords(path.join(o.root, 'content', 'readings.js'))); } catch (e) { return fail(['ふりがなの辞書を読めません（' + e.message + '）']); }
  const report = reportMd(finalUnit, { grade, field, mascot, rubyMissing: rubyList });

  const stageCount = list(finalUnit.areas).reduce((n, a) => n + list(a && a.stages).length, 0);
  log('単元 ' + id + '「' + finalUnit.title + '」（中学 ' + grade + ' 年 ' + field + '、先生 ' + mascot + '、ステージ ' + stageCount + '、問題 ' + allProblems(finalUnit).length + ' 問）');
  log((args.dryRun ? '次のことをします（--dry-run なので書きません）:' : '次のことをします:'));
  log('  - content/' + id + '.js を' + (exists ? '上書きする（--force）' : '作る'));
  plan.forEach(p => log('  - ' + p));
  log('  - ' + rel(reportPath) + ' を' + (writeReport ? (reportExists ? '上書きする（--force）' : '作る') : '作らない（既にある。上書きは --force）'));
  log('  - ' + (args.noTest || args.dryRun ? 'npm test はしない' : 'npm test を実行する'));
  log(rubyMessage(rubyList));
  if (args.dryRun) return 0;

  // 書く（新しいファイルは LF。既存のファイルは改行コードを保つ）
  fs.writeFileSync(contentPath, contentText, 'utf8');
  Object.keys(files).forEach(f => fs.writeFileSync(path.join(o.root, f), files[f], 'utf8'));
  if (writeReport) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report, 'utf8');
  }
  log('書きました: ' + ['content/' + id + '.js'].concat(Object.keys(files), writeReport ? [rel(reportPath)] : []).join('、'));

  // 8. npm test
  if (args.noTest) return 0;
  log('npm test を実行しています…');
  // 引数を付けない 1 つのコマンドとして渡す（Windows の npm は npm.cmd なのでシェルを通す）
  const r = childProcess.spawnSync('npm test', { cwd: o.root, encoding: 'utf8', shell: true });
  const outLines = (String(r.stdout || '') + String(r.stderr || '')).split(/\r?\n/);
  outLines.filter(l => /^(ℹ|#) (tests|pass|fail) \d+/.test(l)).forEach(l => log('  ' + l));
  if (r.status !== 0) {
    // 失敗したテストの名前（spec の ✖ と、tap の not ok）。同じ名前は 1 回だけ、最大 10 件
    const failed = [...new Set(outLines.filter(l => /^\s*(✖|not ok)\s/.test(l)).map(l => l.trim()))]
      .filter(l => !/^✖ failing tests:?$/.test(l)).slice(0, 10);
    const created = ['content/' + id + '.js'].filter(() => !exists).concat(writeReport && !reportExists ? [rel(reportPath)] : []);
    return fail(failed.map(l => '  ' + l).concat(['npm test が失敗しました。書いたファイルはそのままです。直すか、git checkout で戻してください' +
      (created.length ? '（新しく作った ' + created.join(' と ') + ' は git checkout では戻らないので消してください）' : '') + '。']));
  }
  log('npm test はすべて成功しました。');
  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = {
  parseHeader, patchIndexHtml, patchSw, nextVersion, patchCurriculum, reportMd, loadUnitFile, idConflicts,
  patchSwPrecache, setSwVersion, swVersion, unitErrors, loadWords, rubyMissing, rubyMessage, run,
};
