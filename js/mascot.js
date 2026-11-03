// マスコット（小さなオレンジ色の生き物）の SVG と、レベルアップの祝い演出
// 名前を変えるときは NAME だけを書きかえる
(function (root) {
  'use strict';

  const NAME = 'ピカ';

  // 読み込み順に頼らないよう、使うときに取る
  function figures() {
    return typeof require === 'function' ? require('./figures.js') : root.RikaQuest.figures;
  }

  // size×size px のマスコット。頭の上に電球の形の毛（「光」の印）
  function svg(size) {
    const s = Number(size) > 0 ? Math.round(Number(size) * 100) / 100 : 80;
    const esc = figures().escapeText;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="' + s + '" height="' + s + '"' +
      ' class="mascot" role="img" aria-label="' + esc(api.NAME) + '">' +
      // 頭の上の毛（電球の形）
      '<path d="M50,26 Q50,20 50,18" stroke="#C96A12" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<rect x="45" y="20" width="10" height="6" rx="2" fill="#C98A00"/>' +
      '<circle cx="50" cy="12" r="9" fill="#FFD34D" stroke="#C98A00" stroke-width="2"/>' +
      // 体
      '<circle cx="50" cy="60" r="34" fill="#F08C2E"/>' +
      '<ellipse cx="50" cy="72" rx="18" ry="12" fill="#F7B26B"/>' +
      // 目
      '<ellipse cx="38" cy="54" rx="6" ry="7" fill="#FFFFFF"/><circle cx="39" cy="55" r="3.5" fill="#1B2430"/>' +
      '<ellipse cx="62" cy="54" rx="6" ry="7" fill="#FFFFFF"/><circle cx="63" cy="55" r="3.5" fill="#1B2430"/>' +
      // ほお
      '<circle cx="29" cy="66" r="4" fill="#FFB38A"/><circle cx="71" cy="66" r="4" fill="#FFB38A"/>' +
      // 口
      '<path d="M42,68 Q50,76 58,68" stroke="#1B2430" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }

  // レベルアップなどで出す、吹き出し付きのマスコット
  function celebrateMarkup(message) {
    return '<div class="mascot-celebrate">' + svg(120) +
      '<p class="mascot-bubble">' + figures().escapeText(message) + '</p></div>';
  }

  const api = { NAME, svg, celebrateMarkup };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { mascot: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
