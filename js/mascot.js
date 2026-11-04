// マスコット（理科の先生キャラクター 6 体。ユーザー提供の SVG 画像。assets/mascots/README.md）と、レベルアップの祝い演出
// 単元ごとに担当の先生が決まる: 教材の単元に mascot: 'E' のように書く（forUnit）。書いていなければ FALLBACK
(function (root) {
  'use strict';

  const MASCOTS = {
    A: { id: 'A', name: 'まる先生', image: 'assets/mascots/mascot_A.svg', subjects: '汎用・ホーム・ヘルプ' },
    B: { id: 'B', name: 'しずく博士', image: 'assets/mascots/mascot_B.svg', subjects: '水溶液・状態変化' },
    C: { id: 'C', name: 'ぷにカプセル', image: 'assets/mascots/mascot_C.svg', subjects: '物質・化学変化・イオン' },
    D: { id: 'D', name: 'もくもく先生', image: 'assets/mascots/mascot_D.svg', subjects: '天気・地学・地球と宇宙' },
    E: { id: 'E', name: 'キューブ先生', image: 'assets/mascots/mascot_E.svg', subjects: '光・電流・運動・エネルギー' },
    F: { id: 'F', name: 'まめ博士', image: 'assets/mascots/mascot_F.svg', subjects: '生物・細胞・生命' },
  };
  const FALLBACK = 'A';   // 単元に担当が書いていないときの先生（同梱の unit_mascots.json の fallback と同じ）
  const LEGACY_NAME = 'ピカ';   // 以前の手描きマスコットの名前（legacySvg 用）

  // A〜F の定義済みのキーか（'toString' のような継承プロパティ名を先生と見なさない）
  function isKey(key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(MASCOTS, key);
  }

  // 単元（教材の unit）の担当の先生。unit.mascot が A〜F でなければ FALLBACK
  function forUnit(unit) {
    const key = unit ? unit.mascot : '';
    return isKey(key) ? MASCOTS[key] : MASCOTS[FALLBACK];
  }

  // 読み込み順に頼らないよう、使うときに取る
  function figures() {
    return typeof require === 'function' ? require('./figures.js') : root.RikaQuest.figures;
  }

  // size×size px のマスコット（mascot は forUnit の戻り値。省略時は FALLBACK の先生）。
  // 以前は SVG を直接描いていたが、いまは画像を <img> で出す（関数名は互換のため svg のまま）
  function svg(size, mascot) {
    const m = mascot && isKey(mascot.id) ? MASCOTS[mascot.id] : MASCOTS[FALLBACK];
    const s = Number(size) > 0 ? Math.round(Number(size) * 100) / 100 : 80;
    const esc = figures().escapeText;
    return '<img class="mascot" src="' + m.image + '" width="' + s + '" height="' + s + '"' +
      ' alt="' + esc(m.name) + '" draggable="false">';
  }

  // 以前の手描きマスコット「ピカ」（オレンジ色の生き物）。画像が使えないときの予備として残す
  function legacySvg(size) {
    const s = Number(size) > 0 ? Math.round(Number(size) * 100) / 100 : 80;
    const esc = figures().escapeText;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="' + s + '" height="' + s + '"' +
      ' class="mascot" role="img" aria-label="' + esc(LEGACY_NAME) + '">' +
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

  // レベルアップなどで出す、吹き出し付きのマスコット（mascot は svg と同じ）
  function celebrateMarkup(message, mascot) {
    return '<div class="mascot-celebrate">' + svg(120, mascot) +
      '<p class="mascot-bubble">' + figures().escapeText(message) + '</p></div>';
  }

  const api = { MASCOTS, FALLBACK, LEGACY_NAME, forUnit, svg, legacySvg, celebrateMarkup };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { mascot: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
