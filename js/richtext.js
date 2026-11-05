// 文の中の **語句** 記法（大切な言葉＝用語）を扱う
// 入れ子はなし。** の数が奇数のときは、最後の ** から後ろを普通の文として扱う（例外は出さない）。
// 画面に描くのは ui-screens.js（strong.term にする）。ここは文を分けるだけで DOM にはさわらない。
(function (root) {
  'use strict';

  const MARK = '**';

  // 文を順に分ける → [{ text, term }]。空文字の部分は入れない
  function parse(text) {
    const s = typeof text === 'string' ? text : '';
    const pieces = s.split(MARK);
    // 区切りの数（pieces.length - 1）が奇数なら、最後の ** は閉じていない
    const closedCount = (pieces.length - 1) % 2 === 0 ? pieces.length : pieces.length - 1;
    const out = [];
    function push(part, term) {
      if (part === '') return;
      const last = out[out.length - 1];
      // 普通の文どうしが続くときは 1 つにまとめる（閉じていない ** の前後など）
      if (last && !last.term && !term) last.text += part;
      else out.push({ text: part, term });
    }
    for (let i = 0; i < closedCount; i++) push(pieces[i], i % 2 === 1);
    // 閉じていない ** から後ろは、** も含めて普通の文
    if (closedCount < pieces.length) push(MARK + pieces[pieces.length - 1], false);
    return out;
  }

  // ** を取り除いた文（字数の計算や検査に使う）
  function plain(text) {
    return parse(text).map((p) => p.text).join('');
  }

  // 用語を出てきた順に、重複なしで
  function terms(text) {
    const out = [];
    parse(text).forEach((p) => {
      if (p.term && out.indexOf(p.text) === -1) out.push(p.text);
    });
    return out;
  }

  const api = { parse, plain, terms };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { richtext: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
