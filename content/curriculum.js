// 中学 1〜3 年の理科の単元一覧（単元をえらぶ画面に出す表）
// 学習指導要領（2021 年度〜）の内容のまとまりを、よくある教科書の単元名で並べたもの。
// **この表は先生が後で編集してよい。** 単元を足す・名前を変える・並べかえるときは UNITS の行を書きかえる。
// 項目の意味:
//   id     … 単元の id。教材のファイル（content/<id>.js の unit.id）と同じにすると、その教材がこの行に出る
//            （教材がまだない単元は「準備中」と出る）
//   title  … 単元の名前（画面に出る）
//   grade  … 学年 1 | 2 | 3（この学年の欄に出る）
//   field  … 分野 '物理' | '化学' | '生物' | '地学'
//   mascot … 担当の先生 'A'〜'F'（assets/mascots/README.md の対応表。A 汎用、B 水溶液・状態変化、
//            C 物質・化学変化・イオン、D 天気・地学・地球と宇宙、E 光・電流・運動・エネルギー、F 生物・細胞・生命）
//            教材が登録されていれば、教材の unit.mascot が優先される
// 並び: 学年 → 表の順。RikaQuest.curriculum = { GRADE_LABELS, units, unit }
(function (root) {
  'use strict';

  // 形: { id, title, grade: 1|2|3, field: '物理'|'化学'|'生物'|'地学', mascot: 'A'〜'F' }
  const UNITS = [
    // 1 年
    { id: 'light',           title: '光の世界',                 grade: 1, field: '物理', mascot: 'E' },
    { id: 'sound',           title: '音の世界',                 grade: 1, field: '物理', mascot: 'E' },
    { id: 'force',           title: '力のはたらき',             grade: 1, field: '物理', mascot: 'E' },
    { id: 'substance',       title: '身のまわりの物質',         grade: 1, field: '化学', mascot: 'C' },
    { id: 'solution',        title: '水溶液',                   grade: 1, field: '化学', mascot: 'B' },
    { id: 'state-change',    title: '状態変化',                 grade: 1, field: '化学', mascot: 'B' },
    { id: 'plants',          title: '植物のなかま',             grade: 1, field: '生物', mascot: 'F' },
    { id: 'animals',         title: '動物のなかま',             grade: 1, field: '生物', mascot: 'F' },
    { id: 'volcano',         title: '火山と地震',               grade: 1, field: '地学', mascot: 'D' },
    { id: 'strata',          title: '地層と大地の変化',         grade: 1, field: '地学', mascot: 'D' },
    // 2 年
    { id: 'chemical-change', title: '化学変化と原子・分子',     grade: 2, field: '化学', mascot: 'C' },
    { id: 'body',            title: '生物のからだのつくりとはたらき', grade: 2, field: '生物', mascot: 'F' },
    { id: 'electricity',     title: '電流とその利用',           grade: 2, field: '物理', mascot: 'E' },
    { id: 'weather',         title: '天気とその変化',           grade: 2, field: '地学', mascot: 'D' },
    // 3 年
    { id: 'motion',          title: '運動とエネルギー',         grade: 3, field: '物理', mascot: 'E' },
    { id: 'ion',             title: '化学変化とイオン',         grade: 3, field: '化学', mascot: 'C' },
    { id: 'heredity',        title: '生命の連続性',             grade: 3, field: '生物', mascot: 'F' },
    { id: 'space',           title: '地球と宇宙',               grade: 3, field: '地学', mascot: 'D' },
    { id: 'nature',          title: '自然と人間',               grade: 3, field: '生物', mascot: 'A' },
  ];
  // 画面の側から表を書きかえられないようにする（表を変えるときは上の行を編集する）
  UNITS.forEach(u => Object.freeze(u));

  // 学年の欄の見出し（0 は表にない単元＝教材だけがある単元）
  const GRADE_LABELS = { 1: '1年', 2: '2年', 3: '3年', 0: 'その他' };

  // 並びは上の順（学年 → 表の順）。呼ぶたびに新しい配列
  function units() { return UNITS.slice(); }

  function unit(id) { return UNITS.find(u => u.id === id) || null; }

  const api = { GRADE_LABELS, units, unit };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { curriculum: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
