// tests/ruby.test.js — ふりがな（js/ruby.js）と辞書（content/readings.js）
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const ruby = require('../js/ruby.js');
const { WORDS } = require('../content/readings.js');
const tool = require('../tools/ruby-missing.js');

const ROOT = path.join(__dirname, '..');
const HAN = /[\p{Script=Han}々〆]/u;

// ---- annotate ----

test('annotate: 最長一致（振動数 が 1 語）', () => {
  assert.deepEqual(ruby.annotate('光の振動数', { 振動数: 'しんどうすう', 振動: 'しんどう' }), [
    { text: '光の', reading: null },
    { text: '振動数', reading: 'しんどうすう' },
  ]);
});

test('annotate: 短い語しか当たらないときは短い語', () => {
  assert.deepEqual(ruby.annotate('振動する', { 振動数: 'しんどうすう', 振動: 'しんどう' }), [
    { text: '振動', reading: 'しんどう' },
    { text: 'する', reading: null },
  ]);
});

test('annotate: 語幹（伝わ）に読み、らせる は null', () => {
  assert.deepEqual(ruby.annotate('音を伝わらせる', { 伝わ: 'つた' }), [
    { text: '音を', reading: null },
    { text: '伝わ', reading: 'つた' },
    { text: 'らせる', reading: null },
  ]);
});

test('annotate: 辞書にない漢字は null、漢字のない文は 1 要素、空文字は []', () => {
  assert.deepEqual(ruby.annotate('光と影', { 光: 'ひかり' }), [
    { text: '光', reading: 'ひかり' },
    { text: 'と影', reading: null },
  ]);
  assert.deepEqual(ruby.annotate('ひかりマン', WORDS), [{ text: 'ひかりマン', reading: null }]);
  assert.deepEqual(ruby.annotate('', WORDS), []);
  assert.deepEqual(ruby.annotate(null, WORDS), []);
});

test('annotate: 漢字をふくまないキーは使わない', () => {
  assert.deepEqual(ruby.annotate('かがみ', { かがみ: 'かがみ' }), [{ text: 'かがみ', reading: null }]);
});

test('prepare: 長い順に並べ、漢字のないキーを除く', () => {
  assert.deepEqual(ruby.prepare({ 振動: 'しんどう', 振動数: 'しんどうすう', あ: 'あ', 光: 'ひかり' }), ['振動数', '振動', '光']);
});

// ---- parts（送りがなを ruby の外に出す） ----

test('parts: 送りがなを分ける（読みに送りがなをふくむ書き方・ふくまない書き方）', () => {
  assert.deepEqual(ruby.parts('動か', 'うごか'), [{ text: '動', reading: 'うご' }, { text: 'か', reading: null }]);
  assert.deepEqual(ruby.parts('伝わ', 'つた'), [{ text: '伝', reading: 'つた' }, { text: 'わ', reading: null }]);
  assert.deepEqual(ruby.parts('振動', 'しんどう'), [{ text: '振動', reading: 'しんどう' }]);
  assert.deepEqual(ruby.parts('思い出', 'おもいだ'), [
    { text: '思', reading: 'おも' }, { text: 'い', reading: null }, { text: '出', reading: 'だ' },
  ]);
  assert.deepEqual(ruby.parts('質量パーセント濃度', 'しつりょうぱーせんとのうど'), [
    { text: '質量', reading: 'しつりょう' }, { text: 'パーセント', reading: null }, { text: '濃度', reading: 'のうど' },
  ]);
  assert.deepEqual(ruby.parts('お湯', 'おゆ'), [{ text: 'お', reading: null }, { text: '湯', reading: 'ゆ' }]);
});

test('parts: 辞書のすべての語が漢字の部分に読みを持つ（空の読みにならない）', () => {
  Object.keys(WORDS).forEach((k) => {
    const ps = ruby.parts(k, WORDS[k]);
    assert.equal(ps.map((p) => p.text).join(''), k, k);
    assert.ok(ps.some((p) => p.reading), k + ' に読みがない');
    ps.forEach((p) => { if (p.reading !== null) assert.ok(p.reading.length > 0, k); });
  });
});

test('annotate: 数字（半角・全角）＋空白のあとの 月・日 は がつ・にち（辞書の つき・ひ より優先）', () => {
  assert.deepEqual(ruby.annotate('4 月 1 日に', WORDS), [
    { text: '4 ', reading: null },
    { text: '月', reading: 'がつ' },
    { text: ' 1 ', reading: null },
    { text: '日', reading: 'にち' },
    { text: 'に', reading: null },
  ]);
  assert.deepEqual(ruby.annotate('１２月３日', WORDS), [
    { text: '１２', reading: null }, { text: '月', reading: 'がつ' },
    { text: '３', reading: null }, { text: '日', reading: 'にち' },
  ]);
  assert.deepEqual(ruby.annotate('10　月', { 月: 'つき' }), [{ text: '10　', reading: null }, { text: '月', reading: 'がつ' }]);
  // 数字のあとでない 月・日 は辞書どおり
  assert.deepEqual(ruby.annotate('月の満ち欠け', WORDS)[0], { text: '月', reading: 'つき' });
  assert.deepEqual(ruby.annotate('日の出', WORDS)[0], { text: '日', reading: 'ひ' });
  // 辞書のもっと長い語（日目・月ごろ）はそちらを使う
  assert.deepEqual(ruby.annotate('1 日目', WORDS)[1], { text: '日目', reading: 'にちめ' });
  assert.deepEqual(ruby.annotate('3 月ごろ', WORDS)[1], { text: '月ごろ', reading: 'がつごろ' });
});

// ---- 誤読の回帰テスト（レビューで見つかった文脈で読みが変わる語） ----

// 文を辞書で読んだ読み（漢字の部分は読み、ほかはそのまま）
function readingOf(text) {
  return ruby.annotate(text, WORDS).map((seg) => (seg.reading
    ? ruby.parts(seg.text, seg.reading).map((p) => p.reading || p.text).join('')
    : seg.text)).join('');
}

test('辞書: 文脈で読みが変わる語を正しく読む', () => {
  const cases = [
    ['日の入り', 'ひのいり'],
    ['日の出', 'ひので'],
    ['打ち消し合う', 'うちけしあう'],
    ['火を消すと', 'ひをけすと'],
    ['色が消える', 'いろがきえる'],
    ['針が指している', 'はりがさしている'],
    ['指で押す', 'ゆびでおす'],
    ['間隔が混んでいる', 'かんかくがこんでいる'],
    ['液が混ざらない', 'えきがまざらない'],
    ['空きかん', 'あきかん'],
    ['南の空', 'みなみのそら'],
    ['光合成を行う', 'こうごうせいをおこなう'],
    ['葉の表と裏', 'はのおもてとうら'],
    ['沸点は何℃', 'ふってんはなん℃'],
  ];
  cases.forEach(([text, want]) => assert.equal(readingOf(text), want, text));
});

// ---- 辞書の形 ----

test('content/readings.js: キーは漢字をふくみ、値はひらがな・カタカナ・ー だけ', () => {
  const keys = Object.keys(WORDS);
  assert.ok(keys.length >= 1000, '語数が ' + keys.length);
  const bad = keys.filter((k) => !HAN.test(k) || typeof WORDS[k] !== 'string' || !/^[ぁ-ゟァ-ーー]+$/u.test(WORDS[k]));
  assert.deepEqual(bad, []);
});

// JS のオブジェクトは同じキーを後の値で上書きするので、ソースの文字を読んで重複を調べる。
// readings.js の書式（WORDS の中はシングルクォートの '語': 'よみ'、WORDS の終わりは 2 字下げの '  };'）に頼っている
test('content/readings.js: ソースの中でキーが重複しない', () => {
  const src = fs.readFileSync(path.join(ROOT, 'content', 'readings.js'), 'utf8');
  const start = src.indexOf('const WORDS = {');
  const end = src.search(/\r?\n {2}\};/);
  assert.ok(start >= 0 && end > start,
    'content/readings.js に「const WORDS = {」と、2 字下げの「  };」（WORDS の終わり）が見つからない。書式を変えたときはこのテストも直す');
  const body = src.slice(start, end);
  const keys = [...body.matchAll(/'([^']+)':\s*'/g)].map((m) => m[1]);
  assert.equal(keys.length, Object.keys(WORDS).length,
    'ソースから読んだキーの数（' + keys.length + '）と WORDS の語数（' + Object.keys(WORDS).length + '）が合わない。'
    + '重複キーがあるか、シングルクォートの「\'語\': \'よみ\'」以外の書き方（ダブルクォートなど）が混ざっている');
  const seen = new Set();
  const dup = keys.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
  assert.deepEqual(dup, [], '重複しているキー: ' + dup.join('、'));
});

// ---- 網羅率 ----

// 単元の画面に出る文字（解説、問題の文・解説・ヒント・選択肢・穴うめ、ステージ・領域・概念・単元の名前）
function unitTexts(unit) {
  const out = [];
  const add = (s) => { if (typeof s === 'string' && s !== '') out.push(s); };
  const problem = (p) => {
    if (!p) return;
    add(p.prompt); add(p.explanation); add(p.hint); add(p.text);
    (p.options || []).forEach((o) => add(o && typeof o === 'object' ? o.text : o));
    (p.blanks || []).forEach((b) => {
      (b.options || []).forEach(add);
      if (typeof b.answer === 'string') add(b.answer);
    });
  };
  add(unit.title);
  (unit.concepts || []).forEach((c) => { add(c.title); (c.checkPool || []).forEach(problem); });
  (unit.areas || []).forEach((a) => {
    add(a.title);
    (a.stages || []).forEach((s) => {
      add(s.title);
      (s.lessons || []).forEach((l) => add(l.text));
      [s.warmup, ...(s.problems || []), ...(s.retryPool || [])].forEach(problem);
    });
  });
  return out;
}

// 網羅率はファイルごとに見る（全体で合わせると、新しい単元の漏れがほかの単元に埋もれるため）。
// 執筆中で、まだ辞書に語を足していない単元があるときは、ここに 'content/<id>.js' と理由を書いていったん除く。
// 辞書を足したら（tools/ruby-missing.js の --split・--single で確かめてから）ここから外す。いまは除くものなし
const COVERAGE_EXCLUDE = [];
const MIN_COVERAGE = 0.98;

function checkCoverage(file, strings) {
  const list = strings.map((text) => ({ file, text }));
  const cov = tool.coverage(list, WORDS, ruby);
  const top = tool.missing(list, WORDS, ruby).slice(0, 30).map((e) => e.word + '×' + e.count);
  assert.ok(cov.total > 0, file + ' に漢字がない');
  assert.ok(cov.rate >= MIN_COVERAGE, file + ' の網羅率 ' + (cov.rate * 100).toFixed(2) + '%。足りない語: ' + top.join('、'));
}

tool.contentFiles().filter((file) => !COVERAGE_EXCLUDE.includes(file)).forEach((file) => {
  test('網羅率: ' + file + ' の漢字の 98% 以上に読みが付く', () => {
    const unit = require(path.join(ROOT, file)).unit;
    assert.ok(unit, file + ' に module.exports.unit がない');
    checkCoverage(file, unitTexts(unit));
  });
});

['js/ui-screens.js', 'js/ui-problems.js', 'js/app.js'].forEach((file) => {
  test('網羅率: ' + file + ' の画面の文字の漢字の 98% 以上に読みが付く', () => {
    checkCoverage(file, tool.stringLiterals(fs.readFileSync(path.join(ROOT, file), 'utf8')));
  });
});
