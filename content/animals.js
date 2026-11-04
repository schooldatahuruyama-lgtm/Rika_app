// 「動物のなかま」教材データ（中学1年 理科）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通指示 .ai-tasks/20261104-170000_単元教材の共通指示.md）。
// 2 領域 × 2 ステージ（セキツイ動物・無セキツイ動物）と、概念 5 つ（id は単元の接頭辞 an- を付けて全単元で一意にする）。
// 図（scene）の item は js/figures.js の汎用の部品で描く（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
(function (root) {
  'use strict';

  // ---- 書きやすくするための小さな道具 ----

  // 場面図（大きさはどの図も 320×240）
  function scene(items) { return { width: 320, height: 240, items }; }

  // 選択肢の文の配列 → [{ id: 'a', text }, ...]
  function options(texts) { return texts.map((text, i) => ({ id: 'abcd'[i], text })); }

  // 選択式。p.options は文の配列、p.answer は 'a'〜'd'
  function choice(p) {
    return Object.assign({ type: 'choice', figure: null }, p, { options: options(p.options) });
  }

  // 穴埋め（blanks はそのまま書く）
  function fill(p) { return Object.assign({ type: 'fill', figure: null }, p); }

  // 図の中を選ぶ・動かす（figure は必ず書く）
  function figureChoice(p) { return Object.assign({ type: 'figure-choice' }, p); }
  function drag(p) { return Object.assign({ type: 'drag' }, p); }

  function word(id, opts, answer) { return { id, kind: 'word', options: opts, answer }; }

  // ---- 動物の図の部品（汎用の部品を組み合わせる。どれも (cx, cy) が体の中心あたり） ----

  // 引き出し線（細い点線）
  function leader(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'gray', width: 1, dashed: true };
  }

  // 魚（左向き）。x は cx−30〜cx+44
  function fish(cx, cy) {
    return [
      { type: 'polygon', points: [[cx + 26, cy], [cx + 44, cy - 14], [cx + 44, cy + 14]], fill: 'sky' },
      { type: 'ellipse', x: cx, y: cy, rx: 30, ry: 14, fill: 'sky' },
      { type: 'circle', x: cx - 18, y: cy - 3, r: 3, fill: 'ink' },
    ];
  }

  // カエル（正面に近い形）。x は cx−36〜cx+36
  function frog(cx, cy) {
    return [
      { type: 'line', points: [[cx - 20, cy + 6], [cx - 36, cy + 16], [cx - 26, cy + 22]], color: 'green', width: 4 },
      { type: 'line', points: [[cx + 20, cy + 6], [cx + 36, cy + 16], [cx + 26, cy + 22]], color: 'green', width: 4 },
      { type: 'line', points: [[cx - 10, cy + 12], [cx - 14, cy + 22]], color: 'green', width: 4 },
      { type: 'line', points: [[cx + 10, cy + 12], [cx + 14, cy + 22]], color: 'green', width: 4 },
      { type: 'ellipse', x: cx, y: cy, rx: 26, ry: 16, fill: 'green' },
      { type: 'circle', x: cx - 12, y: cy - 16, r: 6, fill: 'green' },
      { type: 'circle', x: cx + 12, y: cy - 16, r: 6, fill: 'green' },
      { type: 'circle', x: cx - 12, y: cy - 16, r: 2, fill: 'ink' },
      { type: 'circle', x: cx + 12, y: cy - 16, r: 2, fill: 'ink' },
    ];
  }

  // トカゲ（横から。左向き）。x は cx−40〜cx+48
  function lizard(cx, cy) {
    return [
      { type: 'line', points: [[cx + 20, cy], [cx + 48, cy + 8]], color: 'brown', width: 5 },
      { type: 'line', points: [[cx - 14, cy + 6], [cx - 20, cy + 16]], color: 'brown', width: 3 },
      { type: 'line', points: [[cx - 4, cy + 6], [cx - 8, cy + 16]], color: 'brown', width: 3 },
      { type: 'line', points: [[cx + 8, cy + 6], [cx + 4, cy + 16]], color: 'brown', width: 3 },
      { type: 'line', points: [[cx + 16, cy + 6], [cx + 12, cy + 16]], color: 'brown', width: 3 },
      { type: 'ellipse', x: cx, y: cy, rx: 24, ry: 8, fill: 'brown' },
      { type: 'ellipse', x: cx - 30, y: cy - 2, rx: 10, ry: 7, fill: 'brown' },
      { type: 'circle', x: cx - 32, y: cy - 4, r: 2, fill: 'ink' },
    ];
  }

  // ハト（横から。左向き）。x は cx−38〜cx+34
  function bird(cx, cy) {
    return [
      { type: 'line', points: [[cx - 4, cy + 14], [cx - 6, cy + 26]], color: 'orange', width: 2 },
      { type: 'line', points: [[cx + 6, cy + 14], [cx + 4, cy + 26]], color: 'orange', width: 2 },
      { type: 'polygon', points: [[cx + 18, cy - 4], [cx + 34, cy - 10], [cx + 32, cy + 2]], fill: 'gray' },
      { type: 'ellipse', x: cx, y: cy, rx: 22, ry: 15, fill: 'white' },
      { type: 'ellipse', x: cx + 4, y: cy - 2, rx: 12, ry: 7, fill: 'gray' },
      { type: 'polygon', points: [[cx - 28, cy - 18], [cx - 38, cy - 14], [cx - 28, cy - 10]], fill: 'orange' },
      { type: 'circle', x: cx - 20, y: cy - 14, r: 9, fill: 'white' },
      { type: 'circle', x: cx - 22, y: cy - 16, r: 2, fill: 'ink' },
    ];
  }

  // イヌ（横から。左向き）。x は cx−39〜cx+36
  function dog(cx, cy) {
    return [
      { type: 'line', points: [[cx + 24, cy - 6], [cx + 36, cy - 18]], color: 'brown', width: 4 },
      { type: 'line', points: [[cx - 16, cy + 6], [cx - 16, cy + 24]], color: 'brown', width: 4 },
      { type: 'line', points: [[cx - 6, cy + 6], [cx - 6, cy + 24]], color: 'brown', width: 4 },
      { type: 'line', points: [[cx + 8, cy + 6], [cx + 8, cy + 24]], color: 'brown', width: 4 },
      { type: 'line', points: [[cx + 18, cy + 6], [cx + 18, cy + 24]], color: 'brown', width: 4 },
      { type: 'ellipse', x: cx, y: cy, rx: 26, ry: 12, fill: 'brown' },
      { type: 'circle', x: cx - 28, y: cy - 12, r: 11, fill: 'brown' },
      { type: 'ellipse', x: cx - 22, y: cy - 22, rx: 4, ry: 7, fill: 'brown' },
      { type: 'circle', x: cx - 32, y: cy - 14, r: 2, fill: 'ink' },
    ];
  }

  // 昆虫を上から見た図（左が頭）。s は大きさの倍率。legs: false であしを描かない。
  // 頭部の中心 (cx−46s, cy)、胸部の中心 (cx−18s, cy)、腹部の中心 (cx+30s, cy)。x は cx−64s〜cx+62s
  function insect(cx, cy, s, legs) {
    const k = v => v * s;
    const items = [
      { type: 'line', points: [[cx - k(52), cy - k(6)], [cx - k(64), cy - k(24)]], width: 2 },
      { type: 'line', points: [[cx - k(52), cy + k(6)], [cx - k(64), cy + k(24)]], width: 2 },
    ];
    if (legs !== false) {
      // 6 本のあしは、すべて胸部から出る（前・中・後ろ × 左右）
      [[-28, -8, -14], [-18, 0, -2], [-8, 10, 20]].forEach(([dx, bx, ex]) => {
        [-1, 1].forEach(side => {
          items.push({ type: 'line', points: [
            [cx + k(dx), cy + side * k(8)], [cx + k(dx + bx), cy + side * k(20)], [cx + k(dx + ex), cy + side * k(28)],
          ], width: 2 });
        });
      });
    }
    items.push(
      { type: 'circle', x: cx - k(46), y: cy, r: k(12), fill: 'lightgreen' },
      { type: 'ellipse', x: cx - k(18), y: cy, rx: k(16), ry: k(11), fill: 'lightgreen' },
      { type: 'ellipse', x: cx + k(30), y: cy, rx: k(32), ry: k(14), fill: 'lightgreen' },
      // 腹部の節
      { type: 'line', points: [[cx + k(14), cy - k(12)], [cx + k(14), cy + k(12)]], color: 'line', width: 1 },
      { type: 'line', points: [[cx + k(30), cy - k(13)], [cx + k(30), cy + k(13)]], color: 'line', width: 1 },
      { type: 'line', points: [[cx + k(46), cy - k(12)], [cx + k(46), cy + k(12)]], color: 'line', width: 1 },
    );
    return items;
  }

  // クモを上から見た図（左が頭胸部）。8 本のあしは頭胸部から出る。x は cx−36s〜cx+33s、y は cy±30s
  function spider(cx, cy, s) {
    const k = v => v * s;
    const items = [];
    [[-20, -10, -16], [-15, -4, -6], [-10, 4, 6], [-5, 10, 18]].forEach(([dx, bx, ex]) => {
      [-1, 1].forEach(side => {
        items.push({ type: 'line', points: [
          [cx + k(dx), cy + side * k(7)], [cx + k(dx + bx), cy + side * k(19)], [cx + k(dx + ex), cy + side * k(29)],
        ], width: 2 });
      });
    });
    items.push(
      { type: 'ellipse', x: cx - k(12), y: cy, rx: k(13), ry: k(10), fill: 'gray' },
      { type: 'ellipse', x: cx + k(16), y: cy, rx: k(17), ry: k(14), fill: 'gray' },
    );
    return items;
  }

  // ムカデを上から見た図（左が頭）。節ごとにあしがある。x は cx−76〜cx+54
  function centipede(cx, cy) {
    const items = [
      { type: 'line', points: [[cx - 64, cy - 3], [cx - 76, cy - 14]], width: 2 },
      { type: 'line', points: [[cx - 64, cy + 3], [cx - 76, cy + 14]], width: 2 },
    ];
    for (let i = 0; i < 9; i++) {
      const x = cx - 48 + i * 12;
      items.push(
        { type: 'line', points: [[x, cy - 4], [x - 3, cy - 14]], width: 2 },
        { type: 'line', points: [[x, cy + 4], [x - 3, cy + 14]], width: 2 },
      );
    }
    for (let i = 0; i < 9; i++) {
      items.push({ type: 'ellipse', x: cx - 48 + i * 12, y: cy, rx: 6, ry: 5, fill: 'brown' });
    }
    items.push({ type: 'circle', x: cx - 60, y: cy, r: 6, fill: 'brown' });
    return items;
  }

  // イカ（上が胴）。胴（外とう膜）の右のふち (190, 96)、内臓 (160, 92)、あし (132〜, 200)
  function squid() {
    const items = [
      { type: 'polygon', points: [[160, 20], [112, 52], [132, 66]], fill: 'pink' },
      { type: 'polygon', points: [[160, 20], [208, 52], [188, 66]], fill: 'pink' },
      { type: 'polygon', points: [[160, 16], [192, 64], [190, 128], [130, 128], [128, 64]], fill: 'pink' },
      { type: 'ellipse', x: 160, y: 92, rx: 16, ry: 26, fill: 'yellow', stroke: 'line' },
    ];
    for (let i = 0; i < 8; i++) {
      items.push({ type: 'line', points: [[139 + i * 6, 150], [126 + i * 9.5, 214]], color: 'pink', width: 4 });
    }
    items.push(
      { type: 'line', points: [[154, 150], [148, 232]], color: 'pink', width: 3 },
      { type: 'line', points: [[166, 150], [172, 232]], color: 'pink', width: 3 },
      { type: 'ellipse', x: 160, y: 140, rx: 26, ry: 13, fill: 'pink' },
      { type: 'circle', x: 142, y: 140, r: 4, fill: 'ink' },
      { type: 'circle', x: 178, y: 140, r: 4, fill: 'ink' },
    );
    return items;
  }

  // セキツイ動物の 5 つのなかま（上の段: 魚・カエル・トカゲ、下の段: ハト・イヌ）
  function fiveAnimals() {
    return [].concat(fish(60, 70), frog(165, 72), lizard(262, 72), bird(105, 162), dog(225, 166));
  }

  // 気温と体温のグラフ。気温 t ℃ → x、体温 T ℃ → y（0〜40 ℃）
  function gx(t) { return 60 + 5 * t; }
  function gy(T) { return 200 - 4 * T; }
  function tempGraph() {
    const items = [{ type: 'line', points: [[60, 30], [60, 200], [290, 200]], width: 2 }];
    [0, 10, 20, 30, 40].forEach(v => {
      items.push(
        { type: 'line', points: [[gx(v), 200], [gx(v), 206]], width: 2 },
        { type: 'text', x: gx(v), y: 220, text: String(v), anchor: 'middle', size: 12 },
        { type: 'line', points: [[54, gy(v)], [60, gy(v)]], width: 2 },
        { type: 'text', x: 50, y: gy(v) + 4, text: String(v), anchor: 'end', size: 12 },
      );
    });
    items.push(
      { type: 'text', x: 4, y: 20, text: '体温〔℃〕', size: 12 },
      { type: 'text', x: 316, y: 236, text: '気温〔℃〕', anchor: 'end', size: 12 },
    );
    return items;
  }

  // drag 用のグラフ: 「体温＝気温」の点線と、気温 10 ℃ の縦の点線、動かす印（気温 10 ℃ の線の上を上下に動く）
  function tempDragGraph(pointT, name) {
    return scene(tempGraph().concat([
      { type: 'line', points: [[gx(0), gy(0)], [gx(40), gy(40)]], color: 'gray', width: 1, dashed: true },
      { type: 'text', x: 168, y: 140, text: '体温＝気温', size: 12, color: 'gray' },
      { type: 'line', points: [[gx(10), 200], [gx(10), 36]], color: 'gray', width: 1, dashed: true },
      { type: 'text', x: gx(10) + 6, y: 36, text: '気温 10℃', size: 12 },
      { type: 'circle', x: gx(30), y: gy(pointT), r: 6, fill: 'orange' },
      { type: 'text', x: gx(30) - 10, y: gy(pointT) - 8, text: name, anchor: 'end', size: 13 },
      { type: 'circle', id: 'mark', x: gx(10), y: 200, r: 11, fill: 'blue', stroke: 'ink' },
    ]));
  }

  // セキツイ動物の分け方（枝分かれ図）。行の y: 30（胎生）・78・122（殻あり）・170・214（殻なし）
  const VERT_ROWS = [30, 78, 122, 170, 214];
  function vertTree() {
    return [
      { type: 'line', points: [[16, 30], [16, 146]], width: 2 },
      { type: 'line', points: [[16, 30], [236, 30]], width: 2 },
      { type: 'line', points: [[16, 146], [70, 146]], width: 2 },
      { type: 'line', points: [[70, 100], [70, 192]], width: 2 },
      { type: 'line', points: [[70, 100], [130, 100]], width: 2 },
      { type: 'line', points: [[70, 192], [130, 192]], width: 2 },
      { type: 'line', points: [[130, 78], [130, 122]], width: 2 },
      { type: 'line', points: [[130, 78], [236, 78]], width: 2 },
      { type: 'line', points: [[130, 122], [236, 122]], width: 2 },
      { type: 'line', points: [[130, 170], [130, 214]], width: 2 },
      { type: 'line', points: [[130, 170], [236, 170]], width: 2 },
      { type: 'line', points: [[130, 214], [236, 214]], width: 2 },
      { type: 'text', x: 24, y: 24, text: '胎生', size: 12 },
      { type: 'text', x: 20, y: 140, text: '卵生', size: 12 },
      { type: 'text', x: 74, y: 94, text: '殻あり', size: 12 },
      { type: 'text', x: 74, y: 186, text: '殻なし', size: 12 },
      { type: 'text', x: 136, y: 72, text: '体温がほぼ一定', size: 12 },
      { type: 'text', x: 136, y: 116, text: '体温が変わる', size: 12 },
      { type: 'text', x: 136, y: 164, text: '一生えら呼吸', size: 12 },
      { type: 'text', x: 136, y: 208, text: '親は肺で呼吸', size: 12 },
    ];
  }
  // 分け方の図に ア〜オ の選ぶ場所を付けたもの（なかまの名前は書かない）
  const VERT_TREE_Q = scene(vertTree().concat(
    VERT_ROWS.map((y, i) => ({ type: 'region', id: 'r' + (i + 1), x: 280, y, r: 22, label: 'アイウエオ'[i] })),
  ));

  // 節足動物 3 種（ア 昆虫・イ クモ・ウ ムカデ）を 1 段ずつ並べ、左に選ぶ場所
  const ARTHROPODS_Q = scene(insect(160, 44, 1).concat(spider(160, 124, 1.2), centipede(170, 206), [
    { type: 'region', id: 'r1', x: 36, y: 44, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 36, y: 124, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 36, y: 206, r: 22, label: 'ウ' },
  ]));

  // ================================================================
  // 領域 1: セキツイ動物
  // ================================================================

  // ---- ステージ animals-1: 5 つのなかま（背骨の有無、魚類〜ホニュウ類、それぞれの例） ----
  const animals1 = {
    id: 'animals-1', areaId: 'vertebrate', title: '5 つのなかま', minutes: 4, concepts: ['an-groups'],
    lessons: [
      {
        id: 'animals-1-c1',
        text: '動物は、背骨があるかどうかで大きく 2 つに分けられます。メダカ・ハト・ヒトのように背骨がある動物を**セキツイ動物**、昆虫やイカのように背骨がない動物を**無セキツイ動物**といいます。',
        // 背骨のある魚と、背骨のない昆虫
        figure: scene([
          { type: 'polygon', points: [[214, 80], [256, 44], [256, 116]], fill: 'sky' },
          { type: 'ellipse', x: 140, y: 80, rx: 84, ry: 36, fill: 'sky' },
          { type: 'circle', x: 78, y: 72, r: 6, fill: 'white' },
          { type: 'circle', x: 78, y: 72, r: 3, fill: 'ink' },
          { type: 'line', points: [[92, 84], [214, 84]], color: 'line', width: 4 },
          ...[100, 114, 128, 142, 156, 170, 184, 198].map(x => ({ type: 'line', points: [[x, 77], [x, 91]], color: 'line', width: 2 })),
          leader(176, 32, 170, 80),
          { type: 'text', x: 182, y: 30, text: '背骨', size: 14 },
          { type: 'text', x: 160, y: 146, text: '背骨がある動物 ＝ セキツイ動物', anchor: 'middle', size: 14, bold: true },
          ...insect(75, 200, 0.8),
          { type: 'text', x: 140, y: 196, text: '背骨がない動物', size: 14 },
          { type: 'text', x: 140, y: 218, text: '＝ 無セキツイ動物', size: 14, bold: true },
        ]),
      },
      {
        id: 'animals-1-c2',
        text: 'セキツイ動物は、**魚類**・**両生類**・**ハチュウ類**・**鳥類**・**ホニュウ類**の 5 つのなかまに分けられます。メダカは魚類、カエルは両生類、トカゲはハチュウ類、ハトは鳥類、イヌはホニュウ類です。',
        // 5 つのなかまの代表
        figure: scene(fiveAnimals().concat([
          { type: 'text', x: 60, y: 112, text: '魚類', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 60, y: 130, text: '（メダカ）', anchor: 'middle', size: 12 },
          { type: 'text', x: 165, y: 112, text: '両生類', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 165, y: 130, text: '（カエル）', anchor: 'middle', size: 12 },
          { type: 'text', x: 262, y: 112, text: 'ハチュウ類', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 262, y: 130, text: '（トカゲ）', anchor: 'middle', size: 12 },
          { type: 'text', x: 105, y: 210, text: '鳥類', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 105, y: 228, text: '（ハト）', anchor: 'middle', size: 12 },
          { type: 'text', x: 225, y: 210, text: 'ホニュウ類', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 225, y: 228, text: '（イヌ）', anchor: 'middle', size: 12 },
        ])),
      },
      {
        id: 'animals-1-c3',
        text: '見た目だけで決めないように気をつけよう。クジラやイルカは海にすみますが、子を乳で育てるホニュウ類です。ペンギンは飛べませんが、羽毛がある鳥類です。イモリは両生類、ヤモリはハチュウ類です。',
        // なかまごとの動物の例
        figure: scene([
          ...[56, 100, 144, 188].map(y => ({ type: 'line', points: [[10, y], [310, y]], color: 'gray', width: 1 })),
          { type: 'line', points: [[110, 14], [110, 228]], color: 'gray', width: 1 },
          { type: 'text', x: 16, y: 40, text: '魚類', size: 14, bold: true },
          { type: 'text', x: 118, y: 40, text: 'メダカ・フナ・サメ', size: 13 },
          { type: 'text', x: 16, y: 84, text: '両生類', size: 14, bold: true },
          { type: 'text', x: 118, y: 84, text: 'カエル・イモリ', size: 13 },
          { type: 'text', x: 16, y: 128, text: 'ハチュウ類', size: 14, bold: true },
          { type: 'text', x: 118, y: 128, text: 'トカゲ・ヘビ・カメ・ヤモリ', size: 13 },
          { type: 'text', x: 16, y: 172, text: '鳥類', size: 14, bold: true },
          { type: 'text', x: 118, y: 172, text: 'ハト・スズメ・ペンギン', size: 13 },
          { type: 'text', x: 16, y: 216, text: 'ホニュウ類', size: 14, bold: true },
          { type: 'text', x: 118, y: 216, text: 'イヌ・ヒト・クジラ・コウモリ', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'animals-1-w1', concept: 'an-groups',
      prompt: '予想しよう。クジラは海の中でくらし、魚のような形をしています。クジラは、どのなかまだと思う？',
      options: ['魚類', 'ホニュウ類', '両生類'],
      answer: 'b',
      explanation: 'クジラは、子を乳で育てるホニュウ類です。形やすむ場所だけでは、なかまは決まりません。何を手がかりに分けるのかを、このステージで確かめよう。',
      hint: 'クジラの赤ちゃんは、お母さんの乳を飲んで育つよ。',
    }),
    problems: [
      choice({
        id: 'animals-1-p1', concept: 'an-groups',
        prompt: '次のうち、背骨がある動物（セキツイ動物）はどれ？',
        options: ['カラス', 'トンボ', 'タコ', 'カニ'],
        answer: 'a',
        explanation: 'カラスは背骨がある鳥類で、セキツイ動物です。トンボ・タコ・カニには背骨がなく、無セキツイ動物です。',
        hint: '体の中に骨があるのはどれか考えよう。',
      }),
      fill({
        id: 'animals-1-t1', concept: 'an-groups', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '背骨がある動物を[b1]、背骨がない動物を[b2]という。',
        blanks: [
          word('b1', ['セキツイ動物', '無セキツイ動物', '節足動物'], 'セキツイ動物'),
          word('b2', ['セキツイ動物', '無セキツイ動物', '節足動物'], '無セキツイ動物'),
        ],
        explanation: '背骨（セキツイ）がある動物が**セキツイ動物**、背骨がない動物が**無セキツイ動物**です。「無」は「ない」という意味です。',
        hint: '「無」は「ない」という意味だよ。',
      }),
      figureChoice({
        id: 'animals-1-p2', concept: 'an-groups',
        prompt: 'セキツイ動物の 5 つのなかまの代表です（ア: メダカ、イ: カエル、ウ: トカゲ、エ: ハト、オ: イヌ）。ハチュウ類はどれ？',
        figure: scene(fiveAnimals().concat([
          { type: 'region', id: 'r1', x: 60, y: 118, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 165, y: 118, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 262, y: 118, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 105, y: 214, r: 22, label: 'エ' },
          { type: 'region', id: 'r5', x: 225, y: 214, r: 22, label: 'オ' },
        ])),
        answer: 'r3',
        explanation: 'トカゲ（ウ）はハチュウ類です。メダカは魚類、カエルは両生類、ハトは鳥類、イヌはホニュウ類です。5 つのなかまの代表を 1 つずつ覚えておこう。',
        hint: 'ヘビやカメと同じなかまをさがそう。',
      }),
      choice({
        id: 'animals-1-p3', concept: 'an-groups',
        prompt: 'ペンギンは空を飛べませんが、体が羽毛でおおわれています。ペンギンはどのなかま？',
        options: ['鳥類', 'ホニュウ類', '魚類'],
        answer: 'a',
        explanation: 'ペンギンは飛べなくても、羽毛があり、殻のある卵をうむ鳥類です。飛べるかどうかでは、なかまは決まりません。',
        hint: '羽毛があるのは、どのなかまだけかな。',
      }),
      choice({
        id: 'animals-1-p4', concept: 'an-groups',
        prompt: 'カメは、どのなかま？',
        options: ['両生類', 'ハチュウ類', 'ホニュウ類'],
        answer: 'b',
        explanation: 'カメは、トカゲやヘビと同じハチュウ類です。水の中にもよく入りますが、肺で呼吸し、陸上に殻のある卵をうみます。',
        hint: 'トカゲ・ヘビと同じなかまだよ。',
      }),
      choice({
        id: 'animals-1-p5', concept: 'an-groups',
        prompt: 'コウモリは空を飛びますが、子をうみ、乳で育てます。コウモリはどのなかま？',
        options: ['鳥類', 'ホニュウ類', 'ハチュウ類'],
        answer: 'b',
        explanation: 'コウモリは、子をうんで乳で育てるホニュウ類です。空を飛ぶからといって、鳥類とは決まりません。',
        hint: '子を乳で育てるのは、どのなかまかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'animals-1-r1', concept: 'an-groups',
        prompt: 'セキツイ動物の 5 つのなかまの代表です（ア: メダカ、イ: カエル、ウ: トカゲ、エ: ハト、オ: イヌ）。ホニュウ類はどれ？',
        figure: scene(fiveAnimals().concat([
          { type: 'region', id: 'r1', x: 60, y: 118, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 165, y: 118, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 262, y: 118, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 105, y: 214, r: 22, label: 'エ' },
          { type: 'region', id: 'r5', x: 225, y: 214, r: 22, label: 'オ' },
        ])),
        answer: 'r5',
        explanation: 'イヌ（オ）はホニュウ類です。わたしたちヒトも、同じホニュウ類のなかまです。',
        hint: 'ヒトと同じなかまをさがそう。',
      }),
      choice({
        id: 'animals-1-t2', concept: 'an-groups', term: true,
        prompt: '次の説明に合う言葉はどれ？「背骨をもたない動物をまとめたよび名」',
        options: ['セキツイ動物', '無セキツイ動物', 'ホニュウ類'],
        answer: 'b',
        explanation: '背骨をもたない動物をまとめて**無セキツイ動物**といいます。昆虫・カニ・イカ・タコなどがあります。',
        hint: '「背骨（セキツイ）が無い」と考えよう。',
      }),
      choice({
        id: 'animals-1-r2', concept: 'an-groups',
        prompt: 'イルカは海でくらし、魚のような形をしています。イルカはどのなかま？',
        options: ['魚類', 'ホニュウ類', '両生類'],
        answer: 'b',
        explanation: 'イルカはクジラのなかまで、子をうんで乳で育てるホニュウ類です。すむ場所や形ではなく、体のつくりや子のうまれ方で分けよう。',
        hint: 'クジラと同じなかまだよ。',
      }),
      choice({
        id: 'animals-1-r3', concept: 'an-groups',
        prompt: '次のうち、セキツイ動物はどれ？',
        options: ['クモ', 'ヘビ', 'ヒトデ', 'カニ'],
        answer: 'b',
        explanation: 'ヘビは背骨があるハチュウ類で、セキツイ動物です。クモ・ヒトデ・カニには背骨がありません。',
        hint: '細長い体の中に、背骨が通っている動物はどれかな。',
      }),
    ],
  };

  // ---- ステージ animals-2: 特徴で分ける（呼吸・体温・生まれ方・体の表面） ----
  const animals2 = {
    id: 'animals-2', areaId: 'vertebrate', title: '特徴で分ける', minutes: 5, concepts: ['an-traits'],
    lessons: [
      {
        id: 'animals-2-c1',
        text: '魚類は一生、えらで呼吸します（**えら呼吸**）。両生類は、子のときは水中でえら呼吸をし、親になると肺と皮ふで呼吸します。ハチュウ類・鳥類・ホニュウ類は、一生、肺で呼吸します（**肺呼吸**）。',
        // なかまごとの呼吸のしかた
        figure: scene([
          { type: 'text', x: 16, y: 22, text: '呼吸のしかた', size: 14, bold: true },
          { type: 'text', x: 16, y: 56, text: '魚類', size: 14, bold: true },
          { type: 'rect', x: 112, y: 38, width: 180, height: 24, fill: 'sky', stroke: 'line' },
          { type: 'text', x: 202, y: 55, text: 'えら', anchor: 'middle', size: 13 },
          { type: 'text', x: 16, y: 96, text: '両生類', size: 14, bold: true },
          { type: 'rect', x: 112, y: 78, width: 80, height: 24, fill: 'sky', stroke: 'line' },
          { type: 'text', x: 152, y: 95, text: '子: えら', anchor: 'middle', size: 13 },
          { type: 'rect', x: 196, y: 78, width: 110, height: 24, fill: 'pink', stroke: 'line' },
          { type: 'text', x: 251, y: 95, text: '親: 肺と皮ふ', anchor: 'middle', size: 13 },
          ...[['ハチュウ類', 136], ['鳥類', 176], ['ホニュウ類', 216]].flatMap(([name, y]) => [
            { type: 'text', x: 16, y, text: name, size: 14, bold: true },
            { type: 'rect', x: 112, y: y - 18, width: 180, height: 24, fill: 'pink', stroke: 'line' },
            { type: 'text', x: 202, y: y - 1, text: '肺', anchor: 'middle', size: 13 },
          ]),
        ]),
      },
      {
        id: 'animals-2-c2',
        text: 'まわりの温度によって体温が変わる動物を**変温動物**（魚類・両生類・ハチュウ類）、まわりの温度が変わっても体温をほぼ一定に保つ動物を**恒温動物**（鳥類・ホニュウ類）といいます。',
        // 気温と体温のグラフ
        figure: scene(tempGraph().concat([
          { type: 'line', points: [[gx(0), gy(38)], [gx(40), gy(38)]], color: 'orange', width: 3 },
          { type: 'text', x: gx(2), y: gy(38) - 8, text: '恒温動物（イヌ）', size: 13 },
          { type: 'line', points: [[gx(4), gy(4)], [gx(36), gy(36)]], color: 'blue', width: 3 },
          { type: 'text', x: gx(20), y: gy(8), text: '変温動物（トカゲ）', size: 13 },
        ])),
      },
      {
        id: 'animals-2-c3',
        text: '卵で子が生まれることを**卵生**といいます。魚類・両生類は水中に殻のない卵を、ハチュウ類・鳥類は陸上に殻のある卵をうみます。ホニュウ類は、母親の体内である程度育ってから子が生まれる**胎生**です。',
        // 殻のない卵・殻のある卵・母親の体内で育つ子
        figure: scene([
          { type: 'rect', x: 15, y: 60, width: 80, height: 70, fill: 'water', stroke: 'none' },
          ...[[34, 84], [50, 78], [66, 86], [42, 100], [58, 104], [74, 98]].map(([x, y]) => ({ type: 'circle', x, y, r: 6, fill: 'white', stroke: 'line' })),
          { type: 'line', points: [[118, 132], [206, 132]], color: 'brown', width: 3 },
          { type: 'ellipse', x: 148, y: 108, rx: 16, ry: 22, fill: 'white' },
          { type: 'ellipse', x: 178, y: 112, rx: 14, ry: 19, fill: 'white' },
          { type: 'ellipse', x: 265, y: 96, rx: 44, ry: 32, fill: 'pink' },
          { type: 'ellipse', x: 270, y: 102, rx: 16, ry: 11, fill: 'white' },
          { type: 'text', x: 270, y: 107, text: '子', anchor: 'middle', size: 12 },
          { type: 'text', x: 55, y: 168, text: '卵生', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 55, y: 190, text: '水中に殻のない卵', anchor: 'middle', size: 12 },
          { type: 'text', x: 55, y: 210, text: '魚類・両生類', anchor: 'middle', size: 12 },
          { type: 'text', x: 160, y: 168, text: '卵生', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 160, y: 190, text: '陸上に殻のある卵', anchor: 'middle', size: 12 },
          { type: 'text', x: 160, y: 210, text: 'ハチュウ類・鳥類', anchor: 'middle', size: 12 },
          { type: 'text', x: 265, y: 168, text: '胎生', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 265, y: 190, text: '母親の体内で育つ', anchor: 'middle', size: 12 },
          { type: 'text', x: 265, y: 210, text: 'ホニュウ類', anchor: 'middle', size: 12 },
        ]),
      },
      {
        id: 'animals-2-c4',
        text: '体の表面のようすも、なかまによってちがいます。魚類とハチュウ類は**うろこ**、両生類はしめった皮ふ、鳥類は**羽毛**、ホニュウ類は**毛**でおおわれています。',
        // なかまごとの体の表面
        figure: scene([
          { type: 'text', x: 160, y: 24, text: '体の表面', anchor: 'middle', size: 14, bold: true },
          ...[78, 122, 166].map(y => ({ type: 'line', points: [[10, y], [310, y]], color: 'gray', width: 1 })),
          { type: 'text', x: 16, y: 62, text: '魚類・ハチュウ類', size: 14, bold: true },
          { type: 'circle', x: 172, y: 56, r: 7, fill: 'sky', stroke: 'line' },
          { type: 'circle', x: 182, y: 56, r: 7, fill: 'sky', stroke: 'line' },
          { type: 'circle', x: 177, y: 64, r: 7, fill: 'sky', stroke: 'line' },
          { type: 'text', x: 204, y: 62, text: 'うろこ', size: 14 },
          { type: 'text', x: 16, y: 106, text: '両生類', size: 14, bold: true },
          { type: 'ellipse', x: 177, y: 100, rx: 14, ry: 9, fill: 'green' },
          { type: 'circle', x: 172, y: 97, r: 2, fill: 'sky', stroke: 'none' },
          { type: 'circle', x: 182, y: 102, r: 2, fill: 'sky', stroke: 'none' },
          { type: 'text', x: 204, y: 106, text: 'しめった皮ふ', size: 14 },
          { type: 'text', x: 16, y: 150, text: '鳥類', size: 14, bold: true },
          { type: 'line', points: [[164, 152], [190, 136]], color: 'line', width: 2 },
          { type: 'ellipse', x: 179, y: 143, rx: 14, ry: 6, fill: 'gray', stroke: 'none' },
          { type: 'text', x: 204, y: 150, text: '羽毛', size: 14 },
          { type: 'text', x: 16, y: 194, text: 'ホニュウ類', size: 14, bold: true },
          ...[166, 172, 178, 184, 190].map(x => ({ type: 'line', points: [[x, 198], [x + 3, 182]], color: 'brown', width: 2 })),
          { type: 'text', x: 204, y: 194, text: '毛', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'animals-2-w1', concept: 'an-traits',
      prompt: '予想しよう。寒い冬の日、トカゲとイヌでは、体温が下がりやすいのはどちらだと思う？',
      options: ['トカゲ', 'イヌ', 'どちらも同じ'],
      answer: 'a',
      explanation: 'トカゲは、まわりの温度によって体温が変わる動物なので、寒いと体温が下がります。イヌは体温をほぼ一定に保てます。このようなちがいで、なかまを分けられることを調べよう。',
      hint: '冬になると、トカゲやヘビは土の中でじっとしているね。',
    }),
    problems: [
      choice({
        id: 'animals-2-p1', concept: 'an-traits',
        prompt: '一生、肺で呼吸するなかまの組み合わせはどれ？',
        options: ['魚類・両生類・ハチュウ類', 'ハチュウ類・鳥類・ホニュウ類', '両生類・鳥類・ホニュウ類'],
        answer: 'b',
        explanation: 'ハチュウ類・鳥類・ホニュウ類は、生まれてから一生、肺で呼吸します。魚類はえら、両生類は子のときはえらで呼吸します。',
        hint: '両生類の子（オタマジャクシ）は、水の中でえらで呼吸するね。',
      }),
      fill({
        id: 'animals-2-t1', concept: 'an-traits', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'まわりの温度によって体温が変わる動物を[b1]、体温をほぼ一定に保つ動物を[b2]という。',
        blanks: [
          word('b1', ['変温動物', '恒温動物', '胎生'], '変温動物'),
          word('b2', ['変温動物', '恒温動物', '胎生'], '恒温動物'),
        ],
        explanation: '体温が変わるのが**変温動物**、ほぼ一定（恒）なのが**恒温動物**です。鳥類とホニュウ類が恒温動物です。',
        hint: '「恒」には「いつも同じ」という意味があるよ。',
      }),
      drag({
        id: 'animals-2-p2', concept: 'an-traits',
        prompt: 'グラフの点は、気温 30 ℃ のときのイヌの体温（38 ℃）です。イヌは恒温動物です。気温が 10 ℃ のときのイヌの体温を表す位置に、青い印を上下に動かして置こう（縦の点線が気温 10 ℃）。',
        // 気温 10 ℃ の線 x = gx(10) = 110 の上を動かす。恒温なので体温 38 ℃ のまま → y = gy(38) = 48。
        // 変温動物のように「体温＝気温」の 10 ℃（y = 160）に置くと 112px はなれる。30 ℃（y = 80）でも 32px はなれる
        figure: tempDragGraph(38, 'イヌ'),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: gx(10), y: gy(38) },
        samples: { correct: { x: gx(10), y: gy(38) }, wrong: { x: gx(10), y: gy(10) } },
        explanation: 'イヌは恒温動物なので、気温が 10 ℃ に下がっても体温はほぼ 38 ℃ のままです。グラフでは、気温が変わっても高さの変わらない横の線になります。',
        hint: '恒温動物の体温は、まわりの温度でどう変わるかな。',
      }),
      choice({
        id: 'animals-2-p3', concept: 'an-traits',
        prompt: '陸上に、殻のある卵をうむなかまの組み合わせはどれ？',
        options: ['魚類と両生類', 'ハチュウ類と鳥類', '鳥類とホニュウ類'],
        answer: 'b',
        explanation: 'ハチュウ類と鳥類は、陸上に殻のある卵をうみます。殻があるので、卵が乾燥しにくくなっています。魚類と両生類は、水中に殻のない卵をうみます。',
        hint: 'ニワトリの卵や、カメの卵を思い出そう。',
      }),
      choice({
        id: 'animals-2-p4', concept: 'an-traits',
        prompt: '次のうち、胎生の動物はどれ？',
        options: ['ペンギン', 'ウミガメ', 'イルカ', 'サケ'],
        answer: 'c',
        explanation: 'イルカはホニュウ類なので、母親の体内である程度育ってから子が生まれる胎生です。ペンギン・ウミガメ・サケは卵生です。',
        hint: '胎生なのは、ホニュウ類だけだよ。',
      }),
      choice({
        id: 'animals-2-p5', concept: 'an-traits',
        prompt: 'カエルの呼吸のしかたとして正しいものはどれ？',
        options: ['子も親も、えらで呼吸する', '子はえらで、親は肺と皮ふで呼吸する', '子も親も、肺で呼吸する'],
        answer: 'b',
        explanation: 'カエルの子（オタマジャクシ）は水中でえら呼吸をし、親になると肺と皮ふで呼吸します。これが両生類の特徴です。',
        hint: 'オタマジャクシは水中、親のカエルは陸上でもくらすね。',
      }),
    ],
    retryPool: [
      drag({
        id: 'animals-2-r1', concept: 'an-traits',
        prompt: 'グラフの点は、気温 30 ℃ のときのトカゲの体温（30 ℃）です。トカゲは変温動物です。気温が 10 ℃ のときのトカゲの体温に近い位置に、青い印を上下に動かして置こう（縦の点線が気温 10 ℃）。',
        // 変温なので体温は気温とほぼ同じ 10 ℃ → y = gy(10) = 160。体温 30 ℃ のまま（y = 80）は 80px はなれる
        figure: tempDragGraph(30, 'トカゲ'),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: gx(10), y: gy(10) },
        samples: { correct: { x: gx(10), y: gy(10) }, wrong: { x: gx(10), y: gy(30) } },
        explanation: 'トカゲは変温動物なので、気温が下がると体温も下がり、気温に近い温度になります。グラフでは「体温＝気温」の点線に近い位置です。寒い日にトカゲの動きがにぶくなるのはこのためです。',
        hint: '変温動物の体温は、まわりの温度によって変わるよ。',
      }),
      choice({
        id: 'animals-2-t2', concept: 'an-traits', term: true,
        prompt: '次の説明に合う言葉はどれ？「母親の体内である程度育ってから、子が生まれる生まれ方」',
        options: ['卵生', '胎生', '変温'],
        answer: 'b',
        explanation: '母親の体内（子宮）で育ってから生まれる生まれ方を**胎生**といいます。卵で生まれるのは卵生です。',
        hint: '「胎」は、おなかの中の子という意味だよ。',
      }),
      choice({
        id: 'animals-2-r2', concept: 'an-traits',
        prompt: '恒温動物のなかまの組み合わせはどれ？',
        options: ['魚類と両生類', 'ハチュウ類と鳥類', '鳥類とホニュウ類'],
        answer: 'c',
        explanation: '体温をほぼ一定に保つ恒温動物は、鳥類とホニュウ類です。魚類・両生類・ハチュウ類は変温動物です。',
        hint: '羽毛や毛で体をおおっているなかまを考えよう。',
      }),
      choice({
        id: 'animals-2-r3', concept: 'an-traits',
        prompt: '体の表面がしめった皮ふでおおわれているのは、どのなかま？',
        options: ['魚類', '両生類', 'ハチュウ類'],
        answer: 'b',
        explanation: '両生類の体の表面は、うろこのない、しめった皮ふです。親のカエルは、この皮ふでも呼吸します。魚類とハチュウ類はうろこでおおわれています。',
        hint: 'カエルやイモリの体の表面を思い出そう。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 無セキツイ動物
  // ================================================================

  // ---- ステージ animals-3: 節足動物と軟体動物（外骨格・節、昆虫類・甲殻類、外とう膜） ----
  const animals3 = {
    id: 'animals-3', areaId: 'invertebrate', title: '節足動物と軟体動物', minutes: 5, concepts: ['an-arthropod', 'an-mollusc'],
    lessons: [
      {
        id: 'animals-3-c1',
        text: '背骨のない動物のうち、体の外側が**外骨格**というかたい殻でおおわれ、体やあしに節がある動物を**節足動物**といいます。外骨格は大きくならないので、成長するときは**脱皮**をします。',
        // 昆虫（節足動物）の外骨格と節
        figure: scene(insect(150, 96, 1.6).concat([
          leader(226, 42, 214, 82),
          { type: 'text', x: 228, y: 38, text: '外骨格', size: 14 },
          leader(66, 34, 102, 64),
          { type: 'text', x: 14, y: 30, text: 'あしの節', size: 14 },
          { type: 'text', x: 160, y: 182, text: '体の外側がかたい殻（外骨格）', anchor: 'middle', size: 14 },
          { type: 'text', x: 160, y: 206, text: '体やあしに節がある', anchor: 'middle', size: 14 },
          { type: 'text', x: 160, y: 230, text: '→ 節足動物', anchor: 'middle', size: 14, bold: true },
        ])),
      },
      {
        id: 'animals-3-c2',
        text: '節足動物のうち、**昆虫類**は体が頭部・胸部・腹部に分かれ、胸部に 6 本のあしがあります。腹部などにある気門から空気をとり入れます。エビ・カニなどは**甲殻類**、クモはクモ類のなかまです。',
        // 昆虫の体の 3 つの部分と、クモ・甲殻類
        figure: scene(insect(130, 80, 1.4).concat(spider(262, 132, 1), [
          { type: 'text', x: 16, y: 20, text: '昆虫類: あし 6 本（胸部から）', size: 12 },
          { type: 'text', x: 66, y: 146, text: '頭部', anchor: 'middle', size: 13 },
          { type: 'text', x: 105, y: 146, text: '胸部', anchor: 'middle', size: 13 },
          { type: 'text', x: 172, y: 146, text: '腹部', anchor: 'middle', size: 13 },
          { type: 'text', x: 262, y: 186, text: 'クモ類: あし 8 本', anchor: 'middle', size: 13 },
          { type: 'text', x: 16, y: 206, text: '甲殻類: エビ・カニ・ダンゴムシ', size: 13 },
          { type: 'text', x: 16, y: 228, text: 'ほかに ムカデ類 など', size: 13 },
        ])),
      },
      {
        id: 'animals-3-c3',
        text: 'イカ・タコ・アサリ・ナメクジなどを**軟体動物**といいます。内臓が**外とう膜**というやわらかい膜で包まれていて、体やあしに節はありません。水中にすむものの多くは、えらで呼吸します。',
        // イカのからだ（外とう膜・内臓・あし）
        figure: scene(squid().concat([
          leader(214, 96, 190, 96),
          { type: 'text', x: 218, y: 101, text: '外とう膜', size: 14 },
          leader(70, 92, 144, 92),
          { type: 'text', x: 24, y: 97, text: '内臓', size: 14 },
          leader(70, 196, 132, 200),
          { type: 'text', x: 24, y: 201, text: 'あし', size: 14 },
        ])),
      },
      {
        id: 'animals-3-c4',
        text: '無セキツイ動物には、節足動物や軟体動物のほかに、ミミズ・ウニ・ヒトデ・クラゲなどもいます。どれも背骨はありませんが、体のつくりはさまざまです。',
        // 無セキツイ動物の分け方
        figure: scene([
          { type: 'text', x: 8, y: 130, text: '無セキツイ', size: 14, bold: true },
          { type: 'text', x: 8, y: 148, text: '動物', size: 14, bold: true },
          { type: 'line', points: [[84, 132], [118, 132]], width: 2 },
          { type: 'line', points: [[118, 50], [118, 200]], width: 2 },
          { type: 'line', points: [[118, 50], [136, 50]], width: 2 },
          { type: 'line', points: [[118, 125], [136, 125]], width: 2 },
          { type: 'line', points: [[118, 200], [136, 200]], width: 2 },
          { type: 'text', x: 142, y: 55, text: '節足動物', size: 14, bold: true },
          { type: 'text', x: 142, y: 76, text: '昆虫類・甲殻類・クモ類 など', size: 12 },
          { type: 'text', x: 142, y: 130, text: '軟体動物', size: 14, bold: true },
          { type: 'text', x: 142, y: 151, text: 'イカ・タコ・アサリ など', size: 12 },
          { type: 'text', x: 142, y: 205, text: 'その他', size: 14, bold: true },
          { type: 'text', x: 142, y: 226, text: 'ミミズ・ウニ・ヒトデ・クラゲ', size: 12 },
        ]),
      },
    ],
    warmup: choice({
      id: 'animals-3-w1', concept: 'an-arthropod',
      prompt: '予想しよう。クモは、昆虫のなかまだと思う？',
      options: ['昆虫のなかま', '昆虫のなかまではない'],
      answer: 'b',
      explanation: 'クモはあしが 8 本で、体が 2 つに分かれているので、昆虫ではありません。昆虫との見分け方を、このステージで調べよう。',
      hint: 'クモのあしの数を数えてみよう。',
    }),
    problems: [
      choice({
        id: 'animals-3-p1', concept: 'an-arthropod',
        prompt: '昆虫のあしについて、正しいものはどれ？',
        options: ['胸部に 6 本ある', '腹部に 6 本ある', '胸部に 8 本ある'],
        answer: 'a',
        explanation: '昆虫のあしは 6 本で、すべて胸部についています。あしが 8 本なのはクモのなかまです。',
        hint: '昆虫の体は、頭部・胸部・腹部の 3 つに分かれていたね。',
      }),
      fill({
        id: 'animals-3-t1', concept: 'an-arthropod', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '節足動物の体の外側をおおうかたい殻を[b1]という。エビやカニのなかまを[b2]という。',
        blanks: [
          word('b1', ['外骨格', '外とう膜', 'うろこ'], '外骨格'),
          word('b2', ['甲殻類', '昆虫類', '軟体動物'], '甲殻類'),
        ],
        explanation: '節足動物の体をおおうかたい殻が**外骨格**です。エビ・カニ・ダンゴムシなどは**甲殻類**のなかまです。',
        hint: '「外側の骨格」と書く言葉と、「かたい殻（甲殻）」と書く言葉だよ。',
      }),
      figureChoice({
        id: 'animals-3-p2', concept: 'an-arthropod',
        prompt: '節足動物を上から見た図です（ア: 体が 3 つに分かれ、あしが 6 本、イ: 体が 2 つに分かれ、あしが 8 本、ウ: 体にたくさんの節があり、あしもたくさんある）。昆虫はどれ？',
        figure: ARTHROPODS_Q,
        answer: 'r1',
        explanation: '体が頭部・胸部・腹部の 3 つに分かれ、あしが 6 本のア が昆虫です。イはクモのなかま、ウはムカデのなかまです。',
        hint: '昆虫のあしは何本だったかな。',
      }),
      drag({
        id: 'animals-3-p3', concept: 'an-arthropod',
        prompt: '昆虫の体を、あしを取りのぞいて上から見た図です（左が頭）。昆虫のあしがついているのは体のどの部分？ 青い印をその部分に動かして置こう。',
        // 頭部 (68, 120) 半径 24、胸部 (124, 120) 横 64・たて 44、腹部 (220, 120) 横 128・たて 56。
        // 正解は胸部の中心。腹部の中心（96px）や頭部の中心（56px）は許容 16px の外
        figure: scene(insect(160, 120, 2, false).concat([
          { type: 'circle', id: 'mark', x: 280, y: 206, r: 11, fill: 'blue', stroke: 'ink', label: '印', labelPos: 'below' },
        ])),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 124, y: 120 },
        samples: { correct: { x: 124, y: 120 }, wrong: { x: 220, y: 120 } },
        explanation: '昆虫の 6 本のあしは、すべてまん中の胸部についています。いちばん大きい腹部ではないので気をつけよう。はねがある昆虫では、はねも胸部についています。',
        hint: '体は 頭部・胸部・腹部 の 3 つ。あしはまん中の部分だよ。',
      }),
      choice({
        id: 'animals-3-p4', concept: 'an-mollusc',
        prompt: '次のうち、軟体動物はどれ？',
        options: ['カニ', 'イカ', 'ミミズ', 'ウニ'],
        answer: 'b',
        explanation: 'イカは、内臓が外とう膜で包まれた軟体動物です。カニは節足動物（甲殻類）、ミミズやウニは、どちらでもない無セキツイ動物です。',
        hint: 'タコと同じなかまをさがそう。',
      }),
      choice({
        id: 'animals-3-p5', concept: 'an-mollusc',
        prompt: '軟体動物の外とう膜は、体の何を包んでいる？',
        options: ['内臓', '背骨', '外骨格'],
        answer: 'a',
        explanation: '軟体動物の外とう膜は、内臓を包んでいるやわらかい膜です。軟体動物には背骨も外骨格もありません。',
        hint: 'イカの胴の中には、何が入っていたかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'animals-3-r1', concept: 'an-arthropod',
        prompt: '節足動物を上から見た図です（ア: 体が 3 つに分かれ、あしが 6 本、イ: 体が 2 つに分かれ、あしが 8 本、ウ: 体にたくさんの節があり、あしもたくさんある）。クモのなかまはどれ？',
        figure: ARTHROPODS_Q,
        answer: 'r2',
        explanation: 'クモのなかまは、体が 2 つに分かれ、あしが 8 本です（イ）。昆虫ではありませんが、外骨格と節のある節足動物です。',
        hint: 'クモのあしは何本だったかな。',
      }),
      choice({
        id: 'animals-3-r2', concept: 'an-arthropod',
        prompt: '次のうち、昆虫はどれ？',
        options: ['クモ', 'ダンゴムシ', 'カブトムシ', 'ムカデ'],
        answer: 'c',
        explanation: 'カブトムシは、体が頭部・胸部・腹部に分かれ、あしが 6 本の昆虫です。クモはクモ類、ダンゴムシは甲殻類、ムカデはムカデ類です。',
        hint: 'あしが 6 本の動物をさがそう。',
      }),
      choice({
        id: 'animals-3-t2', concept: 'an-mollusc', term: true,
        prompt: '次の説明に合う言葉はどれ？「イカ・タコ・アサリなどのように、内臓が膜で包まれ、体に節がない動物のなかま」',
        options: ['節足動物', '軟体動物', '甲殻類'],
        answer: 'b',
        explanation: '内臓が外とう膜で包まれ、体やあしに節がない動物を**軟体動物**といいます。',
        hint: '体が「やわらかい」動物、という名前だよ。',
      }),
      figureChoice({
        id: 'animals-3-r3', concept: 'an-mollusc',
        prompt: 'イカの体のつくりです（ア: 胴の外側の部分、イ: 胴の中にある部分、ウ: 頭から下にのびている部分）。外とう膜はどれ？',
        figure: scene(squid().concat([
          leader(218, 96, 190, 96),
          leader(62, 92, 144, 92),
          leader(62, 200, 132, 200),
          { type: 'region', id: 'r1', x: 240, y: 96, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 40, y: 92, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 40, y: 200, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '外とう膜は、胴の外側で内臓（イ）を包んでいる膜（ア）です。ウはあしです。軟体動物は、この外とう膜をもつのが特徴です。',
        hint: '外とう膜は、内臓を外から包んでいるよ。',
      }),
      choice({
        id: 'animals-3-r4', concept: 'an-mollusc',
        prompt: '水中にすむアサリは、何で呼吸する？',
        options: ['えら', '肺', '気門'],
        answer: 'a',
        explanation: 'アサリなど水中にすむ軟体動物の多くは、えらで呼吸します。気門は昆虫が空気をとり入れるところです。',
        hint: '水中の魚と同じものを使って呼吸するよ。',
      }),
    ],
  };

  // ---- ステージ animals-4: 動物の分類をまとめる（分類の順序、肉食動物と草食動物） ----
  const animals4 = {
    id: 'animals-4', areaId: 'invertebrate', title: '動物の分類をまとめる', minutes: 5, concepts: ['an-classify'],
    lessons: [
      {
        id: 'animals-4-c1',
        text: '動物を分類するときは、まず**背骨**があるかどうかを調べます。セキツイ動物は、生まれ方・呼吸・体温などで 5 つのなかまに、無セキツイ動物は、外骨格や外とう膜があるかなどで分けます。',
        // 動物の分類の全体
        figure: scene([
          { type: 'text', x: 8, y: 116, text: '動物', size: 16, bold: true },
          { type: 'line', points: [[44, 110], [56, 110]], width: 2 },
          { type: 'line', points: [[56, 50], [56, 170]], width: 2 },
          { type: 'line', points: [[56, 50], [110, 50]], width: 2 },
          { type: 'line', points: [[56, 170], [110, 170]], width: 2 },
          { type: 'text', x: 62, y: 44, text: '背骨あり', size: 12 },
          { type: 'text', x: 62, y: 164, text: '背骨なし', size: 12 },
          { type: 'text', x: 114, y: 55, text: 'セキツイ動物', size: 14, bold: true },
          { type: 'text', x: 114, y: 76, text: '魚類・両生類・ハチュウ類・', size: 12 },
          { type: 'text', x: 114, y: 94, text: '鳥類・ホニュウ類', size: 12 },
          { type: 'text', x: 114, y: 175, text: '無セキツイ動物', size: 14, bold: true },
          { type: 'text', x: 114, y: 196, text: '節足動物（外骨格）', size: 12 },
          { type: 'text', x: 114, y: 214, text: '軟体動物（外とう膜）・その他', size: 12 },
        ]),
      },
      {
        id: 'animals-4-c2',
        text: 'セキツイ動物は、胎生ならホニュウ類です。卵生のうち、殻のある卵なら、体温がほぼ一定の鳥類か、変わるハチュウ類です。殻のない卵なら、一生えら呼吸の魚類か、親は肺で呼吸する両生類です。',
        // セキツイ動物の分け方（枝分かれ図となかまの名前）
        figure: scene(vertTree().concat(
          ['ホニュウ類', '鳥類', 'ハチュウ類', '魚類', '両生類'].map((name, i) => ({ type: 'text', x: 240, y: VERT_ROWS[i] + 5, text: name, size: 13, bold: true })),
        )),
      },
      {
        id: 'animals-4-c3',
        text: 'ライオンのようにほかの動物を食べる**肉食動物**は、目が顔の前についていて、立体的に見える範囲が広く、えものとの距離をつかみやすいです。シマウマのように植物を食べる**草食動物**は、目が横につき、広い範囲を見わたせます。',
        // 頭を上から見た図（黄色は両目で立体的に見える範囲）
        figure: scene([
          { type: 'text', x: 160, y: 16, text: '黄色: 両目で立体的に見える範囲', anchor: 'middle', size: 12 },
          { type: 'polygon', points: [[80, 114], [26, 26], [134, 26]], fill: 'yellow', stroke: 'none' },
          { type: 'ellipse', x: 80, y: 150, rx: 30, ry: 40, fill: 'orange' },
          { type: 'circle', x: 68, y: 122, r: 5, fill: 'ink' },
          { type: 'circle', x: 92, y: 122, r: 5, fill: 'ink' },
          { type: 'polygon', points: [[240, 104], [226, 26], [254, 26]], fill: 'yellow', stroke: 'none' },
          { type: 'arrow', x1: 214, y1: 136, x2: 180, y2: 110, color: 'blue', width: 2 },
          { type: 'arrow', x1: 266, y1: 136, x2: 300, y2: 110, color: 'blue', width: 2 },
          { type: 'arrow', x1: 214, y1: 144, x2: 180, y2: 174, color: 'blue', width: 2 },
          { type: 'arrow', x1: 266, y1: 144, x2: 300, y2: 174, color: 'blue', width: 2 },
          { type: 'ellipse', x: 240, y: 150, rx: 24, ry: 44, fill: 'white' },
          { type: 'circle', x: 218, y: 140, r: 5, fill: 'ink' },
          { type: 'circle', x: 262, y: 140, r: 5, fill: 'ink' },
          { type: 'text', x: 80, y: 210, text: '目が前向き', anchor: 'middle', size: 13 },
          { type: 'text', x: 80, y: 230, text: '肉食動物（ライオン）', anchor: 'middle', size: 13, bold: true },
          { type: 'text', x: 240, y: 210, text: '目が横向き', anchor: 'middle', size: 13 },
          { type: 'text', x: 240, y: 230, text: '草食動物（シマウマ）', anchor: 'middle', size: 13, bold: true },
        ]),
      },
      {
        id: 'animals-4-c4',
        text: '歯の形も、食べ物に合っています。肉食動物は、するどくとがった**犬歯**でえものをとらえ、とがった臼歯で肉をさきます。草食動物は、**門歯**で草をかみ切り、平らで大きな**臼歯**ですりつぶします。',
        // 歯の形（左: 肉食動物、右: 草食動物）
        figure: scene([
          { type: 'rect', x: 20, y: 110, width: 120, height: 14, fill: 'pink' },
          { type: 'polygon', points: [[24, 110], [30, 100], [36, 110]], fill: 'white' },
          { type: 'polygon', points: [[36, 110], [42, 100], [48, 110]], fill: 'white' },
          { type: 'polygon', points: [[50, 110], [58, 72], [66, 110]], fill: 'white' },
          { type: 'polygon', points: [[76, 110], [86, 90], [96, 110]], fill: 'white' },
          { type: 'polygon', points: [[96, 110], [106, 88], [116, 110]], fill: 'white' },
          { type: 'polygon', points: [[116, 110], [126, 92], [136, 110]], fill: 'white' },
          { type: 'text', x: 58, y: 62, text: '犬歯', anchor: 'middle', size: 13 },
          { type: 'text', x: 110, y: 80, text: '臼歯', anchor: 'middle', size: 13 },
          { type: 'rect', x: 180, y: 110, width: 124, height: 14, fill: 'pink' },
          { type: 'rect', x: 184, y: 94, width: 8, height: 16, fill: 'white' },
          { type: 'rect', x: 194, y: 94, width: 8, height: 16, fill: 'white' },
          { type: 'rect', x: 204, y: 94, width: 8, height: 16, fill: 'white' },
          { type: 'rect', x: 240, y: 98, width: 20, height: 12, fill: 'white' },
          { type: 'rect', x: 262, y: 98, width: 20, height: 12, fill: 'white' },
          { type: 'rect', x: 284, y: 98, width: 18, height: 12, fill: 'white' },
          { type: 'text', x: 198, y: 84, text: '門歯', anchor: 'middle', size: 13 },
          { type: 'text', x: 271, y: 84, text: '臼歯（平ら）', anchor: 'middle', size: 13 },
          { type: 'text', x: 80, y: 160, text: '肉食動物（ライオン）', anchor: 'middle', size: 13, bold: true },
          { type: 'text', x: 80, y: 182, text: '犬歯が大きくするどい', anchor: 'middle', size: 12 },
          { type: 'text', x: 240, y: 160, text: '草食動物（シマウマ）', anchor: 'middle', size: 13, bold: true },
          { type: 'text', x: 240, y: 182, text: '臼歯で草をすりつぶす', anchor: 'middle', size: 12 },
        ]),
      },
    ],
    warmup: choice({
      id: 'animals-4-w1', concept: 'an-classify',
      prompt: '予想しよう。シマウマの目は、顔の横についています。シマウマにとって、どんなよい点があると思う？',
      options: ['広い範囲を見わたせて、敵に気づきやすい', 'えものとの距離をつかみやすい', '暗いところでも明るく見える'],
      answer: 'a',
      explanation: '目が横にあると、まわりの広い範囲を見わたせるので、敵に早く気づけます。体のつくりと、くらし方のつながりを調べよう。',
      hint: 'シマウマは、ライオンなどにおそわれる側の動物だね。',
    }),
    problems: [
      figureChoice({
        id: 'animals-4-p1', concept: 'an-classify',
        prompt: 'セキツイ動物の分け方の図です。ア〜オは分けたあとのなかまです（ア: 胎生、イ: 殻のある卵で体温がほぼ一定、ウ: 殻のある卵で体温が変わる、エ: 殻のない卵で一生えら呼吸、オ: 殻のない卵で親は肺で呼吸）。カエルはどこに入る？',
        figure: VERT_TREE_Q,
        answer: 'r5',
        explanation: 'カエルは水中に殻のない卵をうみ、子はえら、親は肺と皮ふで呼吸する両生類なので、オに入ります。図は左から 1 つずつ確かめよう。',
        hint: 'カエルの卵には殻があるかな。親のカエルは何で呼吸するかな。',
      }),
      fill({
        id: 'animals-4-t1', concept: 'an-classify', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ライオンのようにほかの動物を食べる動物を[b1]、シマウマのように植物を食べる動物を[b2]という。',
        blanks: [
          word('b1', ['肉食動物', '草食動物', '恒温動物'], '肉食動物'),
          word('b2', ['肉食動物', '草食動物', '恒温動物'], '草食動物'),
        ],
        explanation: 'ほかの動物を食べるのが**肉食動物**、植物を食べるのが**草食動物**です。目のつき方や歯の形が、食べ物に合っています。',
        hint: '何を食べるかが、そのまま名前になっているよ。',
      }),
      choice({
        id: 'animals-4-p2', concept: 'an-classify',
        prompt: 'ライオンの目が顔の前についていることは、どんなことに役立つ？',
        options: ['立体的に見える範囲が広く、えものとの距離をつかみやすい', 'うしろまで広く見わたせる', '体温を一定に保てる'],
        answer: 'a',
        explanation: '目が前についていると、両目で同時に見える範囲が広くなり、ものを立体的に見て距離をつかみやすくなります。えものをとらえるのに役立ちます。',
        hint: '両目で同じものを見ると、距離が分かりやすくなるよ。',
      }),
      choice({
        id: 'animals-4-p3', concept: 'an-classify',
        prompt: '草食動物の臼歯の形と、そのはたらきとして正しいものはどれ？',
        options: ['平らで大きく、草をすりつぶす', 'するどくとがり、えものをとらえる', '小さく、ほとんど使わない'],
        answer: 'a',
        explanation: '草食動物の臼歯は平らで大きく、かたい草をすりつぶすのに適しています。するどくとがった犬歯が発達しているのは肉食動物です。',
        hint: '草は、細かくすりつぶしてから飲みこむよ。',
      }),
      choice({
        id: 'animals-4-p4', concept: 'an-classify',
        prompt: 'ある動物は、背骨があり、体温がほぼ一定で、殻のある卵をうみます。この動物はどのなかま？',
        options: ['ハチュウ類', '鳥類', 'ホニュウ類'],
        answer: 'b',
        explanation: '殻のある卵をうむのはハチュウ類と鳥類で、そのうち体温がほぼ一定なのは鳥類です。特徴を 1 つずつ組み合わせて考えよう。',
        hint: '殻のある卵をうむなかまを 2 つ思い出し、体温で分けよう。',
      }),
      choice({
        id: 'animals-4-p5', concept: 'an-classify',
        prompt: '動物を、セキツイ動物と無セキツイ動物に分けるときに調べることはどれ？',
        options: ['背骨があるかどうか', 'あしがあるかどうか', '水中にすむかどうか'],
        answer: 'a',
        explanation: '背骨があればセキツイ動物、なければ無セキツイ動物です。分類では、まずこのちがいを調べます。',
        hint: '「セキツイ」は背骨のことだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'animals-4-r1', concept: 'an-classify',
        prompt: 'セキツイ動物の分け方の図です。ア〜オは分けたあとのなかまです（ア: 胎生、イ: 殻のある卵で体温がほぼ一定、ウ: 殻のある卵で体温が変わる、エ: 殻のない卵で一生えら呼吸、オ: 殻のない卵で親は肺で呼吸）。トカゲはどこに入る？',
        figure: VERT_TREE_Q,
        answer: 'r3',
        explanation: 'トカゲは陸上に殻のある卵をうみ、体温がまわりの温度で変わるハチュウ類なので、ウに入ります。',
        hint: 'トカゲは寒いと動きがにぶくなるね。',
      }),
      choice({
        id: 'animals-4-r2', concept: 'an-classify',
        prompt: 'ある動物は、背骨がなく、体が外骨格でおおわれ、あしに節があります。この動物はどのなかま？',
        options: ['節足動物', '軟体動物', 'ハチュウ類'],
        answer: 'a',
        explanation: '背骨がなく、外骨格と節があるのは節足動物です。軟体動物は、外とう膜があり、節はありません。',
        hint: '「節のあるあし」と書く名前のなかまだよ。',
      }),
      choice({
        id: 'animals-4-r3', concept: 'an-classify',
        prompt: 'ライオンの歯のうち、えものをとらえるのに使う、するどくとがった大きな歯はどれ？',
        options: ['門歯', '犬歯', '臼歯'],
        answer: 'b',
        explanation: 'えものをとらえるのに使う、するどくとがった歯は犬歯です。肉食動物では、犬歯が大きく発達しています。',
        hint: 'イヌの口にも、とがった大きな歯があるね。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================
  const concepts = [
    {
      id: 'an-groups', title: 'セキツイ動物の 5 つのなかま', basic: null, lessonStageId: 'animals-1',
      checkPool: [
        choice({
          id: 'an-groups-k1', concept: 'an-groups',
          prompt: 'ヘビは、どのなかま？',
          options: ['両生類', 'ハチュウ類', 'ホニュウ類'],
          answer: 'b',
          explanation: 'ヘビは、トカゲやカメと同じハチュウ類です。',
          hint: 'トカゲと同じなかまだよ。',
        }),
        fill({
          id: 'an-groups-k2', concept: 'an-groups',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'セキツイ動物は、魚類・両生類・[b1]・鳥類・ホニュウ類の 5 つのなかまに分けられる。',
          blanks: [word('b1', ['ハチュウ類', '節足動物', '軟体動物'], 'ハチュウ類')],
          explanation: 'セキツイ動物は、魚類・両生類・ハチュウ類・鳥類・ホニュウ類の 5 つです。節足動物と軟体動物は、無セキツイ動物です。',
          hint: 'トカゲやヘビのなかまの名前だよ。',
        }),
        choice({
          id: 'an-groups-k3', concept: 'an-groups',
          prompt: 'イモリは、どのなかま？',
          options: ['両生類', 'ハチュウ類', '魚類'],
          answer: 'a',
          explanation: 'イモリはカエルと同じ両生類です。名前の似ているヤモリは、ハチュウ類です。',
          hint: 'イモリはカエルと同じなかまだよ。',
        }),
      ],
    },
    {
      id: 'an-traits', title: '呼吸・体温・生まれ方', basic: 'an-groups', lessonStageId: 'animals-2',
      checkPool: [
        choice({
          id: 'an-traits-k1', concept: 'an-traits',
          prompt: '一生、えらで呼吸するのはどのなかま？',
          options: ['魚類', '両生類', 'ハチュウ類'],
          answer: 'a',
          explanation: '一生えらで呼吸するのは魚類です。両生類は、子のときだけえらで呼吸し、親になると肺と皮ふで呼吸します。',
          hint: '水の中で一生をすごすなかまだよ。',
        }),
        fill({
          id: 'an-traits-k2', concept: 'an-traits',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '魚類と両生類は、水中に[b1]のない卵をうむ。',
          blanks: [word('b1', ['殻', '毛', 'うろこ'], '殻')],
          explanation: '魚類と両生類の卵には殻がなく、水中にうまれます。ハチュウ類と鳥類は、陸上に殻のある卵をうみます。',
          hint: 'カエルの卵は、ゼリーのようなものに包まれているね。',
        }),
        choice({
          id: 'an-traits-k3', concept: 'an-traits',
          prompt: '体の表面が毛でおおわれているのは、どのなかま？',
          options: ['鳥類', 'ホニュウ類', 'ハチュウ類'],
          answer: 'b',
          explanation: '体が毛でおおわれているのはホニュウ類です。鳥類は羽毛、ハチュウ類はうろこでおおわれています。',
          hint: 'イヌやネコの体を思い出そう。',
        }),
      ],
    },
    {
      id: 'an-arthropod', title: '節足動物', basic: null, lessonStageId: 'animals-3',
      checkPool: [
        choice({
          id: 'an-arthropod-k1', concept: 'an-arthropod',
          prompt: 'クモのあしは何本？',
          options: ['6 本', '8 本', '10 本'],
          answer: 'b',
          explanation: 'クモのあしは 8 本です。昆虫は 6 本なので、クモは昆虫ではありません。',
          hint: '昆虫より 2 本多いよ。',
        }),
        fill({
          id: 'an-arthropod-k2', concept: 'an-arthropod',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '節足動物は、成長するときに[b1]をして、古い外骨格をぬぎすてる。',
          blanks: [word('b1', ['脱皮', '呼吸', '受粉'], '脱皮')],
          explanation: '外骨格は大きくならないので、節足動物は脱皮をして古い外骨格をぬぎ、大きくなります。',
          hint: 'セミのぬけがらは、このときに残ったものだよ。',
        }),
        choice({
          id: 'an-arthropod-k3', concept: 'an-arthropod',
          prompt: 'エビ・カニ・ダンゴムシは、節足動物のうち何というなかま？',
          options: ['昆虫類', '甲殻類', 'クモ類'],
          answer: 'b',
          explanation: 'エビ・カニ・ダンゴムシは甲殻類です。どれも外骨格と節のある節足動物です。',
          hint: 'かたい殻（甲殻）をもつなかま、という名前だよ。',
        }),
      ],
    },
    {
      id: 'an-mollusc', title: '軟体動物', basic: 'an-arthropod', lessonStageId: 'animals-3',
      checkPool: [
        choice({
          id: 'an-mollusc-k1', concept: 'an-mollusc',
          prompt: '軟体動物の特徴として正しいものはどれ？',
          options: ['内臓が外とう膜で包まれ、体やあしに節がない', '体が外骨格でおおわれ、あしに節がある', '背骨があり、体が毛でおおわれている'],
          answer: 'a',
          explanation: '軟体動物は、内臓が外とう膜で包まれ、体やあしに節がありません。外骨格と節があるのは節足動物です。',
          hint: 'イカやタコの体を思い出そう。',
        }),
        fill({
          id: 'an-mollusc-k2', concept: 'an-mollusc',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'イカやタコの内臓を包んでいる膜を[b1]という。',
          blanks: [word('b1', ['外とう膜', '外骨格', 'うろこ'], '外とう膜')],
          explanation: 'イカやタコなどの軟体動物は、内臓が外とう膜という膜で包まれています。',
          hint: '「外側をおおう膜」と書く言葉だよ。',
        }),
        choice({
          id: 'an-mollusc-k3', concept: 'an-mollusc',
          prompt: '次のうち、軟体動物ではないものはどれ？',
          options: ['アサリ', 'タコ', 'ナメクジ', 'ミミズ'],
          answer: 'd',
          explanation: 'ミミズは、節足動物でも軟体動物でもない無セキツイ動物です。アサリ・タコ・ナメクジは軟体動物です。',
          hint: '外とう膜をもたない動物をさがそう。',
        }),
      ],
    },
    {
      id: 'an-classify', title: '動物の分類', basic: 'an-traits', lessonStageId: 'animals-4',
      checkPool: [
        choice({
          id: 'an-classify-k1', concept: 'an-classify',
          prompt: 'カニは、背骨がなく、外骨格でおおわれ、あしに節があります。カニはどのなかま？',
          options: ['節足動物', '軟体動物', '両生類'],
          answer: 'a',
          explanation: '背骨がなく、外骨格と節があるので節足動物です。その中の甲殻類のなかまです。',
          hint: '外骨格と節がある動物のなかまだよ。',
        }),
        fill({
          id: 'an-classify-k2', concept: 'an-classify',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'セキツイ動物のうち、子が胎生で生まれるのは[b1]である。',
          blanks: [word('b1', ['ホニュウ類', '鳥類', 'ハチュウ類'], 'ホニュウ類')],
          explanation: '胎生なのはホニュウ類だけです。鳥類とハチュウ類は、殻のある卵をうむ卵生です。',
          hint: '分け方の図で、いちばん最初に分かれるなかまだよ。',
        }),
        choice({
          id: 'an-classify-k3', concept: 'an-classify',
          prompt: '草食動物の目のつき方と、その利点として正しいものはどれ？',
          options: ['横についていて、広い範囲を見わたせる', '前についていて、距離をつかみやすい', '上についていて、空がよく見える'],
          answer: 'a',
          explanation: '草食動物の目は顔の横についていて、広い範囲を見わたせるので、敵に早く気づけます。',
          hint: 'シマウマの顔を思い出そう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'animals',
    title: '動物のなかま',
    mascot: 'F',   // 担当の先生（まめ博士。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'vertebrate', title: 'セキツイ動物', order: 1, stages: [animals1, animals2] },
      { id: 'invertebrate', title: '無セキツイ動物', order: 2, stages: [animals3, animals4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
