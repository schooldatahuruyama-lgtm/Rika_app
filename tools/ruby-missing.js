// ふりがなの辞書（content/readings.js）にない漢字の語を数える Node スクリプト
// 使い方: node tools/ruby-missing.js        … 読みが付かなかった漢字の並び（前後の送りがなつき）を回数の多い順に表示
//         node tools/ruby-missing.js --all  … 全件（ふだんは上位 200 件）
//         node tools/ruby-missing.js --split … 2 字以上の漢字の並びが辞書の 2 語以上に分かれて読まれたものも出す（誤読の確認用）
//         node tools/ruby-missing.js --single … 辞書の 1 字の語として読まれた所を、前 2 字・後ろ 2 字つきで語ごとに出す
//                                              （「行う」が い と読まれる、のような 1 字の語の誤読の確認用）
// 調べる文字: content/*.js（curriculum.js・readings.js を除く）、js/ui-screens.js・js/ui-problems.js・js/app.js の
// 文字列リテラル（コメントは除く）、js/mascot.js・js/anim.js・js/storage.js・js/units.js・content/curriculum.js の文字列リテラル、
// index.html の文字。
// 教材を足したら、これを実行して出てきた語を content/readings.js の WORDS に足す（0 件になるまで）。
// ほかのスクリプト・テストから使えるように、require したときは関数を返す（実行はしない）。
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const UI_FILES = ['js/ui-screens.js', 'js/ui-problems.js', 'js/app.js'];
// 画面に出る文字があるほかのファイル（先生の名前、動く図のボタン、記録の読み込みのエラー、単元一覧）
const EXTRA_FILES = ['js/mascot.js', 'js/anim.js', 'js/storage.js', 'js/units.js', 'content/curriculum.js'];
const HAN = /[\p{Script=Han}々〆]/u;
const HAN_RUN = /[\p{Script=Han}々〆]+/gu;
const HIRA = /[ぁ-ゟ]/;

// 調べる教材ファイル（content/ の相対パス）
function contentFiles() {
  return fs.readdirSync(path.join(ROOT, 'content'))
    .filter((f) => f.endsWith('.js') && f !== 'curriculum.js' && f !== 'readings.js')
    .sort()
    .map((f) => 'content/' + f);
}

// JS のソースから文字列リテラルの中身を取り出す（コメントは飛ばす。テンプレートの ${...} の中は調べない）
function stringLiterals(src) {
  const out = [];
  let i = 0;
  let prev = '';   // 直前の空白でない文字（/ が割り算か正規表現かを決める）
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '\'' || c === '"' || c === '`') {
      let s = '';
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') { s += src[i + 1] === 'n' ? '\n' : src[i + 1]; i += 2; continue; }
        if (c === '`' && src[i] === '$' && src[i + 1] === '{') {
          // ${...} の中は飛ばす（入れ子の {} を数える）
          out.push(s); s = '';
          let depth = 1; i += 2;
          while (i < n && depth > 0) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
          continue;
        }
        s += src[i]; i++;
      }
      out.push(s);
      i++;
      prev = c;
      continue;
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
      // 正規表現リテラル
      i++;
      let inClass = false;
      while (i < n && (inClass || src[i] !== '/') && src[i] !== '\n') {
        if (src[i] === '\\') i++;
        else if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        i++;
      }
      i++;
      prev = '/';
      continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.filter((s) => HAN.test(s));
}

// index.html の文字（タグ・コメント・script・style を除く）
function htmlTexts(src) {
  const body = src.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ');
  return body.split(/<[^>]*>/).map((s) => s.trim()).filter((s) => HAN.test(s));
}

// 調べる文字をすべて集める → [{ file, text }]
function collect() {
  const out = [];
  contentFiles().concat(UI_FILES, EXTRA_FILES).forEach((file) => {
    stringLiterals(fs.readFileSync(path.join(ROOT, file), 'utf8')).forEach((text) => out.push({ file, text }));
  });
  htmlTexts(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')).forEach((text) => out.push({ file: 'index.html', text }));
  return out;
}

// 読みが付かなかった漢字の並び（前の仮名 1 字・後ろのひらがな 2 字まで）を数える → [{ word, count, files }]
function missing(texts, words, ruby) {
  const counts = new Map();
  texts.forEach(({ file, text }) => {
    ruby.annotate(text, words).forEach((seg) => {
      if (seg.reading) return;
      for (const m of seg.text.matchAll(HAN_RUN)) {
        const after = seg.text.slice(m.index + m[0].length, m.index + m[0].length + 2);
        let okuri = '';
        for (const ch of after) { if (HIRA.test(ch)) okuri += ch; else break; }
        const word = m[0] + (okuri ? '（' + okuri + '）' : '');
        const e = counts.get(word) || { word, count: 0, files: new Set() };
        e.count += 1;
        e.files.add(file);
        counts.set(word, e);
      }
    });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1));
}

// 2 字以上の漢字の並びが、辞書の 2 語以上に分かれて読まれたもの → [{ word, split, count }]
// （「電流」が辞書になく「電」＋「流（なが）」と読まれる、のような誤読を見つけるため。正しく分かれているものもある）
function splits(texts, words, ruby) {
  const counts = new Map();
  texts.forEach(({ text }) => {
    const segs = ruby.annotate(text, words);
    // 文字の位置 → 何番目の語か（読みのない部分は -1）
    const owner = [];
    segs.forEach((seg, i) => { for (let k = 0; k < seg.text.length; k++) owner.push(seg.reading ? i : -1); });
    for (const m of text.matchAll(HAN_RUN)) {
      if (m[0].length < 2) continue;
      const ids = new Set();
      for (let k = m.index; k < m.index + m[0].length; k++) ids.add(owner[k]);
      if (ids.size < 2 || ids.has(-1)) continue;
      const split = [...ids].map((i) => segs[i].text + '(' + segs[i].reading + ')').join(' + ');
      const e = counts.get(m[0]) || { word: m[0], split, count: 0 };
      e.count += 1;
      counts.set(m[0], e);
    }
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1));
}

// 辞書の 1 字の語（漢字 1 字だけのキー）として読まれた所 → [{ word, reading, count, contexts: [{ text, count }] }]
// contexts は「前 2 字［語］後ろ 2 字」の形。--single で目で確かめ、読みが合わなければ送りがなつきのキーを足す
function singles(texts, words, ruby) {
  const byWord = new Map();
  texts.forEach(({ text }) => {
    let pos = 0;
    ruby.annotate(text, words).forEach((seg) => {
      if (seg.reading && [...seg.text].length === 1) {
        const ctx = (text.slice(Math.max(0, pos - 2), pos) + '［' + seg.text + '］' + text.slice(pos + seg.text.length, pos + seg.text.length + 2)).replace(/\s+/g, ' ');
        const e = byWord.get(seg.text) || { word: seg.text, reading: seg.reading, count: 0, contexts: new Map() };
        e.count += 1;
        e.contexts.set(ctx, (e.contexts.get(ctx) || 0) + 1);
        byWord.set(seg.text, e);
      }
      pos += seg.text.length;
    });
  });
  return [...byWord.values()]
    .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1))
    .map((e) => ({
      word: e.word, reading: e.reading, count: e.count,
      contexts: [...e.contexts.entries()].sort((a, b) => b[1] - a[1]).map(([text, count]) => ({ text, count })),
    }));
}

// 漢字の文字数と、読みが付いた漢字の文字数
function coverage(texts, words, ruby) {
  let total = 0;
  let covered = 0;
  texts.forEach(({ text }) => {
    ruby.annotate(text, words).forEach((seg) => {
      const k = [...seg.text].filter((ch) => HAN.test(ch)).length;
      total += k;
      if (seg.reading) covered += k;
    });
  });
  return { total, covered, rate: total === 0 ? 1 : covered / total };
}

module.exports = { contentFiles, stringLiterals, htmlTexts, collect, missing, splits, singles, coverage };

if (require.main === module) {
  const ruby = require('../js/ruby.js');
  const { WORDS } = require('../content/readings.js');
  const texts = collect();
  const list = missing(texts, WORDS, ruby);
  const cov = coverage(texts, WORDS, ruby);
  const all = process.argv.includes('--all');
  console.log('辞書の語数: ' + Object.keys(WORDS).length);
  console.log('漢字の文字数: ' + cov.total + '、読みが付いた文字数: ' + cov.covered + '（' + (cov.rate * 100).toFixed(2) + '%）');
  console.log('読みが付かなかった語: ' + list.length + ' 種類' + (list.length > 0 ? '（回数 語 [ファイル]）' : ''));
  (all ? list : list.slice(0, 200)).forEach((e) => {
    console.log(String(e.count).padStart(4) + '  ' + e.word + '  [' + [...e.files].join(', ') + ']');
  });
  // 分かれて読まれた漢字の並び（--split のときだけ。誤読がないか目で確かめ、必要なら複合語を辞書に足す）
  if (process.argv.includes('--split')) {
    const sp = splits(texts, WORDS, ruby);
    console.log('');
    console.log('分かれて読まれた漢字の並び: ' + sp.length + ' 種類（回数 並び = 分かれ方）');
    (all ? sp : sp.slice(0, 200)).forEach((e) => console.log(String(e.count).padStart(4) + '  ' + e.word + ' = ' + e.split));
  }
  // 1 字の語として読まれた所（--single のときだけ。ふだんは語ごとに前後の形を 20 種類まで）
  if (process.argv.includes('--single')) {
    const sg = singles(texts, WORDS, ruby);
    console.log('');
    console.log('1 字の語として読まれた所: ' + sg.length + ' 語（回数 語（読み）: 前後の形）');
    sg.forEach((e) => {
      const cs = all ? e.contexts : e.contexts.slice(0, 20);
      console.log(String(e.count).padStart(4) + '  ' + e.word + '（' + e.reading + '）: ' + cs.map((c) => c.text + (c.count > 1 ? '×' + c.count : '')).join(' ')
        + (cs.length < e.contexts.length ? ' …ほか ' + (e.contexts.length - cs.length) + ' 種類' : ''));
    });
  }
}
