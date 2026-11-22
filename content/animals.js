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

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/animals/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/animals/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
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

  // 写真: 上から見た節足動物 3 種を左から ア トノサマバッタ・イ ジョロウグモ・ウ ムカデ。選ぶ場所は それぞれの下
  // 画像は 640×480（座標は画像の位置 × 0.5）。3 つの x の範囲: 7〜98、102〜215、232〜305（y は 190 まで）
  const ARTHROPODS_Q = scene([
    photo('animals-3-p2'),
    { type: 'region', id: 'r1', x: 52, y: 216, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 216, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 268, y: 216, r: 22, label: 'ウ' },
  ]);

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
        // 写真: 魚（タイ）の骨格標本（背骨がある）と、カブトムシ・イカ（背骨がない）
        figure: scene([
          photo('animals-1-c1'),
          pointer(100, 34, 108, 89), tag(100, 30, '背骨', { bold: true }),
          tag(50, 160, 'タイの骨格', { size: 13 }),
          tag(160, 30, 'カブトムシ', { size: 13 }),
          tag(296, 156, 'イカ', { size: 13 }),
          tag(85, 202, '背骨がある'),
          tag(85, 222, '→ セキツイ動物', { bold: true }),
          tag(245, 202, '背骨がない'),
          tag(245, 222, '→ 無セキツイ動物', { bold: true }),
        ]),
      },
      {
        id: 'animals-1-c2',
        text: 'セキツイ動物は、**魚類**・**両生類**・**ハチュウ類**・**鳥類**・**ホニュウ類**の 5 つのなかまに分けられます。メダカは魚類、カエルは両生類、トカゲはハチュウ類、ハトは鳥類、イヌはホニュウ類です。',
        // 写真: 上段 メダカ・トノサマガエル・ニホントカゲ、下段 ハト・柴犬
        figure: scene([
          photo('animals-1-c2'),
          tag(54, 90, '魚類', { bold: true }), tag(54, 106, '（メダカ）', { size: 13 }),
          tag(160, 90, '両生類', { bold: true }), tag(160, 106, '（カエル）', { size: 13 }),
          tag(234, 90, 'ハチュウ類', { bold: true }), tag(234, 106, '（トカゲ）', { size: 13 }),
          tag(80, 228, '鳥類（ハト）', { bold: true }),
          tag(240, 228, 'ホニュウ類（イヌ）', { bold: true }),
        ]),
      },
      {
        id: 'animals-1-c3',
        text: '見た目だけで決めないように気をつけよう。クジラやイルカは海にすみますが、子を乳で育てるホニュウ類です。ペンギンは飛べませんが、羽毛がある鳥類です。イモリは両生類、ヤモリはハチュウ類です。',
        // 写真: イルカ・ペンギン（上段）、イモリ・ヤモリ（下段）となかまの名前・見分ける手がかり
        figure: scene([
          photo('animals-1-c3'),
          tag(80, 118, 'ホニュウ類（イルカ）', { bold: true }),
          tag(80, 136, '子を乳で育てる', { size: 13 }),
          tag(244, 124, '鳥類（ペンギン）', { bold: true }),
          tag(244, 140, '羽毛がある', { size: 13 }),
          tag(80, 222, '両生類（イモリ）', { size: 13, bold: true }),
          tag(80, 237, 'しめった皮ふ', { size: 13 }),
          pointer(272, 208, 246, 178), tag(292, 214, 'うろこ', { size: 13 }),
          tag(250, 236, 'ハチュウ類（ヤモリ）', { size: 13, bold: true }),
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
        anim: 'an-body-temp',   // 動く図（js/anim-bio.js）。figure は静止図として残す
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
        // 写真: 水中の魚の卵（殻なし。左 x 2〜100）、砂の上のウミガメの卵（殻あり。中 x 105〜200）、母イヌと子イヌ（右 x 207〜318）。写真は y 77〜172。上に生まれ方、下に卵のようすとなかま
        figure: scene([
          photo('animals-2-c3'),
          tag(51, 44, '卵生', { size: 15, bold: true }),
          tag(51, 64, '魚の卵', { size: 13 }),
          tag(152, 44, '卵生', { size: 15, bold: true }),
          tag(152, 64, 'ウミガメの卵', { size: 13 }),
          tag(262, 44, '胎生', { size: 15, bold: true }),
          tag(262, 64, 'イヌの親子', { size: 13 }),
          tag(51, 194, '水中・殻なし', { size: 13 }),
          tag(51, 214, '魚類・両生類', { size: 13 }),
          tag(152, 194, '陸上・殻あり', { size: 13 }),
          tag(152, 214, 'ハチュウ類・鳥類', { size: 13 }),
          tag(262, 194, '母親の体内で育つ', { size: 13 }),
          tag(262, 214, 'ホニュウ類', { size: 13 }),
        ]),
      },
      {
        id: 'animals-2-c4',
        text: '体の表面のようすも、なかまによってちがいます。魚類とハチュウ類は**うろこ**、両生類はしめった皮ふ、鳥類は**羽毛**、ホニュウ類は**毛**でおおわれています。',
        // 写真: 2×2 で 左上 魚（うろこ）、右上 カエル（しめった皮ふ）、左下 トカゲ（うろこ）、右下 鳥（羽毛）。ホニュウ類の毛は写っていない
        figure: scene([
          photo('animals-2-c4'),
          tag(30, 18, 'うろこ', { size: 15, bold: true }),
          tag(30, 36, '魚類', { size: 13 }),
          tag(316, 18, 'しめった皮ふ', { size: 15, bold: true, anchor: 'end' }),
          tag(316, 36, '両生類', { size: 13, anchor: 'end' }),
          tag(120, 214, 'うろこ', { size: 15, bold: true }),
          tag(120, 232, 'ハチュウ類', { size: 13 }),
          tag(316, 214, '羽毛', { size: 15, bold: true, anchor: 'end' }),
          tag(316, 232, '鳥類', { size: 13, anchor: 'end' }),
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
        // 写真: 横から見たトノサマバッタ（かたい殻の体、あしの節）
        figure: scene([
          photo('animals-3-c1'),
          pointer(100, 38, 92, 100), tag(110, 34, '外骨格（かたい殻）'),
          pointer(262, 36, 256, 70), tag(270, 30, 'あしの節'),
          tag(160, 226, '体やあしに節がある → 節足動物', { bold: true }),
        ]),
      },
      {
        id: 'animals-3-c2',
        text: '節足動物のうち、**昆虫類**は体が頭部・胸部・腹部に分かれ、胸部に 6 本のあしがあります。腹部などにある気門から空気をとり入れます。エビ・カニなどは**甲殻類**、クモはクモ類のなかまです。',
        // 写真: 横から見たトノサマバッタ（左）、クモ（右上）、エビ（右下）。バッタの体の区切りに青い線
        // 画像は 640×480（座標は画像の位置 × 0.5）。バッタの頭部 (28〜45, 98〜128)、胸部 (44〜90。後ろあしのつけ根 (84, 132) も胸部)、腹部 (92〜155, 115〜138)
        figure: scene([
          photo('animals-3-c2'),
          { type: 'line', points: [[44, 94], [44, 132]], color: 'blue', width: 2 },
          { type: 'line', points: [[92, 100], [92, 138]], color: 'blue', width: 2 },
          pointer(28, 60, 37, 102), tag(28, 56, '頭部', { size: 13 }),
          pointer(70, 60, 58, 104), tag(70, 56, '胸部', { size: 13 }),
          pointer(120, 60, 118, 130), tag(120, 56, '腹部', { size: 13 }),
          tag(80, 192, '昆虫類', { bold: true }),
          tag(80, 212, 'あし 6 本（胸部から）', { size: 13 }),
          tag(240, 137, 'クモ類: あし 8 本', { size: 13 }),
          tag(262, 236, '甲殻類（エビ）', { size: 13 }),
        ]),
      },
      {
        id: 'animals-3-c3',
        text: 'イカ・タコ・アサリ・ナメクジなどを**軟体動物**といいます。内臓が**外とう膜**というやわらかい膜で包まれていて、体やあしに節はありません。水中にすむものの多くは、えらで呼吸します。',
        // 写真: 腹側から切り開いたイカ（胴が上・あしが下。外とう膜を左右に開き、中の内臓とえらが見える）
        figure: scene([
          photo('animals-3-c3'),
          pointer(242, 64, 207, 80), tag(272, 60, '外とう膜'),
          pointer(258, 108, 180, 98), tag(272, 112, 'えら'),
          pointer(52, 96, 156, 112), tag(36, 100, '内臓'),
          pointer(52, 196, 108, 199), tag(36, 200, 'あし'),
        ]),
      },
      {
        id: 'animals-3-c4',
        text: '無セキツイ動物には、節足動物や軟体動物のほかに、ミミズ・ウニ・ヒトデ・クラゲなどもいます。どれも背骨はありませんが、体のつくりはさまざまです。',
        // 写真: ミミズ・ウニ（上段）、ヒトデ・ミズクラゲ（下段）
        figure: scene([
          photo('animals-3-c4'),
          tag(90, 20, 'どれも背骨がない', { bold: true }),
          tag(80, 112, 'ミミズ'),
          tag(242, 118, 'ウニ'),
          tag(80, 236, 'ヒトデ'),
          tag(268, 236, 'クラゲ'),
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
        prompt: '節足動物を上から見た写真です（ア: 体が 3 つに分かれ、あしが 6 本、イ: 体が 2 つに分かれ、あしが 8 本、ウ: 体にたくさんの節があり、あしもたくさんある）。昆虫はどれ？',
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
        prompt: '節足動物を上から見た写真です（ア: 体が 3 つに分かれ、あしが 6 本、イ: 体が 2 つに分かれ、あしが 8 本、ウ: 体にたくさんの節があり、あしもたくさんある）。クモのなかまはどれ？',
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
        // 写真: ライオンの顔（目が前に並ぶ）とシマウマの顔（目が横につく）を正面から。青い楕円と矢印は目の向き
        figure: scene([
          photo('animals-4-c3'),
          { type: 'ellipse', x: 86, y: 78, rx: 34, ry: 12, fill: 'none', stroke: 'blue' },
          { type: 'arrow', x1: 212, y1: 81, x2: 190, y2: 81, color: 'blue', width: 2 },
          { type: 'arrow', x1: 286, y1: 81, x2: 310, y2: 81, color: 'blue', width: 2 },
          tag(82, 201, '肉食動物（ライオン）', { size: 13, bold: true }),
          tag(82, 218, '目が前向き', { size: 13 }),
          tag(82, 235, '立体的に見える範囲が広い', { size: 13 }),
          tag(252, 201, '草食動物（シマウマ）', { size: 13, bold: true }),
          tag(252, 218, '目が横向き', { size: 13 }),
          tag(252, 235, '広い範囲を見わたせる', { size: 13 }),
        ]),
      },
      {
        id: 'animals-4-c4',
        text: '歯の形も、食べ物に合っています。肉食動物は、するどくとがった**犬歯**でえものをとらえ、とがった臼歯で肉をさきます。草食動物は、**門歯**で草をかみ切り、平らで大きな**臼歯**ですりつぶします。',
        // 写真: ライオンの頭骨（上）とシマウマの頭骨（下）を横から
        figure: scene([
          photo('animals-4-c4'),
          tag(252, 20, '肉食動物（ライオン）', { size: 13, bold: true }),
          pointer(206, 42, 126, 66), tag(252, 46, '臼歯（とがる）', { size: 13 }),
          pointer(214, 76, 154, 78), tag(232, 80, '犬歯'),
          tag(252, 140, '草食動物（シマウマ）', { size: 13, bold: true }),
          pointer(212, 166, 122, 186), tag(252, 170, '臼歯（平ら）', { size: 13 }),
          pointer(214, 204, 178, 205), tag(232, 208, '門歯'),
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
  // 領域 3: ミニプリント（先生の自作プリントの問題を書き直したもの。docs/reports/content/animals.md）
  // ================================================================

  // 写真の上の選ぶ場所と、部品までの引き出し線。parts は [[選ぶ場所の x, y, 部品の点の x, y], ...]（ア・イ…の順）
  function mpRegions(parts) {
    const items = [];
    parts.forEach(([x, y, px, py], i) => {
      items.push(pointer(x < px ? x + 22 : x - 22, y, px, py));
      items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: 'アイウエオ'[i] });
    });
    return items;
  }

  // イカの写真（animals-3-c3 の画像）の部分を選ぶ図: ア 胴の外側（外とう膜）(207, 80)・イ 胴の中（内臓）(156, 112)・ウ あし (108, 199)
  const MP_SQUID_Q = scene([photo('animals-3-c3')].concat(mpRegions([
    [282, 80, 207, 80], [40, 100, 156, 112], [40, 200, 108, 199],
  ])));

  // 横から見たバッタの写真（animals-3-c2 の画像）の部分を選ぶ: ア 頭部 (37, 104)・イ 胸部 (62, 104)・ウ 腹部 (122, 124)。体の区切りに青い線
  const MP_INSECT_Q = scene([
    photo('animals-3-c2'),
    { type: 'line', points: [[44, 94], [44, 132]], color: 'blue', width: 2 },
    { type: 'line', points: [[92, 100], [92, 138]], color: 'blue', width: 2 },
    pointer(24, 62, 37, 104), { type: 'region', id: 'r1', x: 24, y: 40, r: 22, label: 'ア' },
    pointer(74, 62, 62, 104), { type: 'region', id: 'r2', x: 74, y: 40, r: 22, label: 'イ' },
    pointer(130, 62, 122, 124), { type: 'region', id: 'r3', x: 130, y: 40, r: 22, label: 'ウ' },
  ]);

  // ---- ステージ animals-mp1: プリント 1（セキツイ動物と無セキツイ動物、5 つのなかまの特徴） ----
  const anMp1 = {
    id: 'animals-mp1', areaId: 'vertebrate', free: true, title: 'プリント 1: セキツイ動物の分類', minutes: 5, concepts: ['an-groups', 'an-traits', 'an-classify'],
    lessons: [
      {
        id: 'animals-mp1-c1',
        text: '背骨をもつ動物を**セキツイ動物**、もたない動物を**無セキツイ動物**といいます。セキツイ動物は、魚類・両生類・ハチュウ類・鳥類・ホニュウ類の 5 つのなかまに分けられます。',
        // 写真（animals-1-c2 の画像）: 上段 メダカ・トノサマガエル・ニホントカゲ、下段 ハト・柴犬。上は白い余白
        figure: scene([
          photo('animals-1-c2'),
          tag(160, 18, 'どれも背骨がある（セキツイ動物）', { bold: true }),
          tag(54, 90, '魚類', { bold: true }),
          tag(160, 90, '両生類', { bold: true }),
          tag(234, 90, 'ハチュウ類', { bold: true }),
          tag(80, 228, '鳥類', { bold: true }),
          tag(240, 228, 'ホニュウ類', { bold: true }),
        ]),
      },
      {
        id: 'animals-mp1-c2',
        text: '体の表面は、魚類とハチュウ類が**うろこ**、両生類は湿った皮膚、鳥類は**羽毛**、ホニュウ類は**毛**です。鳥類とホニュウ類は体温がほぼ一定で、殻のある卵をうむのはハチュウ類と鳥類です。',
        figure: scene(vertTree().concat(
          [['ホニュウ類', 30], ['鳥類', 78], ['ハチュウ類', 122], ['魚類', 170], ['両生類', 214]].map(([t, y]) => ({ type: 'text', x: 242, y: y + 5, text: t, size: 12 })),
        )),
      },
    ],
    warmup: choice({
      id: 'animals-mp1-w1', concept: 'an-groups',
      prompt: '予想しよう。カエルとカニ。背骨があるのはどちらだと思う？',
      options: ['カエル', 'カニ', 'どちらもない'],
      answer: 'a',
      explanation: 'カエルには背骨があり、カニにはありません。カニは、かたい殻で体を支えています。背骨の有無による分け方を、このステージで学ぼう。',
      hint: 'カニの体はかたい殻でおおわれているね。',
    }),
    problems: [
      fill({
        id: 'animals-mp1-t1', concept: 'an-groups', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '背骨をもつ動物をまとめて[b1]、背骨をもたない動物をまとめて[b2]という。',
        blanks: [
          word('b1', ['セキツイ動物', '無セキツイ動物', '節足動物'], 'セキツイ動物'),
          word('b2', ['セキツイ動物', '無セキツイ動物', '節足動物'], '無セキツイ動物'),
        ],
        explanation: '背骨（セキツイ）をもつ動物が**セキツイ動物**、もたない動物が**無セキツイ動物**です。',
        hint: '「セキツイ」は背骨のことだよ。',
      }),
      choice({
        id: 'animals-mp1-p1', concept: 'an-groups',
        prompt: 'ヒト・カラス・トンボ・タコ・カエル・カニ・ヒトデ・タイ・ヘビ・クモ のうち、セキツイ動物をすべて選んだものはどれ？',
        options: ['ヒト・カラス・カエル・タイ・ヘビ', 'ヒト・カラス・トンボ・タイ・クモ', 'カエル・カニ・タイ・ヘビ・タコ'],
        answer: 'a',
        explanation: 'ヒト（ホニュウ類）・カラス（鳥類）・カエル（両生類）・タイ（魚類）・ヘビ（ハチュウ類）には背骨があります。トンボ・タコ・カニ・ヒトデ・クモは無セキツイ動物です。',
        hint: '5 つのなかまのどれかに入るものをさがそう。',
      }),
      figureChoice({
        id: 'animals-mp1-p2', concept: 'an-classify',
        prompt: '図はセキツイ動物の分け方です。体温がほぼ一定で、殻のある卵をうむなかま（鳥類）はどこ？ ア〜オから選ぼう。',
        figure: VERT_TREE_Q,
        answer: 'r2',
        explanation: '卵生で殻のある卵をうみ、体温がほぼ一定なのは鳥類です（イ）。同じく殻のある卵をうむハチュウ類は、体温がまわりの温度で変わります。',
        hint: '「卵生」→「殻あり」→「体温がほぼ一定」とたどろう。',
      }),
      choice({
        id: 'animals-mp1-p3', concept: 'an-traits',
        prompt: '魚類・両生類・ハチュウ類・鳥類・ホニュウ類のうち、体温が常にほぼ一定のなかまをすべて選んだものはどれ？',
        options: ['鳥類・ホニュウ類', 'ハチュウ類・鳥類・ホニュウ類', 'ホニュウ類だけ'],
        answer: 'a',
        explanation: '鳥類とホニュウ類は、まわりの温度が変わっても体温がほぼ一定（恒温動物）です。魚類・両生類・ハチュウ類は、まわりの温度で体温が変わります（変温動物）。',
        hint: '羽毛や毛で体温を保っているなかまだよ。',
      }),
      choice({
        id: 'animals-mp1-p4', concept: 'an-traits',
        prompt: '5 つのなかまのうち、一生、肺で呼吸するものをすべて選んだものはどれ？',
        options: ['ハチュウ類・鳥類・ホニュウ類', '両生類・ハチュウ類・鳥類・ホニュウ類', '鳥類・ホニュウ類'],
        answer: 'a',
        explanation: 'ハチュウ類・鳥類・ホニュウ類は一生肺で呼吸します。両生類は、子（幼生）のときはえら、親（成体）になると肺と皮膚で呼吸します。魚類は一生えらです。',
        hint: '両生類は、子のときと親のときで呼吸のしかたが変わるね。',
      }),
      fill({
        id: 'animals-mp1-p5', concept: 'an-traits',
        prompt: '魚類の特徴です。空らんに入る言葉を選ぼう。',
        text: '魚類は[b1]で生活し、[b2]で呼吸する。体の表面は[b3]でおおわれ、[b4]卵をうむ。',
        blanks: [
          word('b1', ['水中', '陸上'], '水中'),
          word('b2', ['えら', '肺'], 'えら'),
          word('b3', ['うろこ', '羽毛', '毛'], 'うろこ'),
          word('b4', ['殻のある', '殻のない'], '殻のない'),
        ],
        explanation: '魚類は一生水中で生活し、えらで呼吸します。体はうろこでおおわれ、殻のない卵を水中にうみます。体温はまわりの水の温度で変わります。',
        hint: '水の中で生活する動物の特徴を考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'animals-mp1-r1', concept: 'an-traits',
        prompt: '5 つのなかまのうち、殻のある卵をうむものをすべて選んだものはどれ？',
        options: ['ハチュウ類・鳥類', '魚類・両生類', '鳥類だけ'],
        answer: 'a',
        explanation: 'ハチュウ類と鳥類は、陸上に殻のある卵をうみます。殻があるので、卵がかわきにくくなっています。魚類と両生類は、水中に殻のない卵をうみます。',
        hint: '陸上に卵をうむなかまを考えよう。',
      }),
      choice({
        id: 'animals-mp1-r2', concept: 'an-traits',
        prompt: '5 つのなかまのうち、卵ではなく、親と同じような姿の子（赤ちゃん）をうむのはどれ？',
        options: ['ホニュウ類', '鳥類', 'ハチュウ類'],
        answer: 'a',
        explanation: 'ホニュウ類は、母親の体内（子宮）で子を育ててからうみます（胎生）。うまれた子は乳を飲んで育ちます。',
        hint: 'ヒトやイヌのなかまだよ。',
      }),
      fill({
        id: 'animals-mp1-r3', concept: 'an-traits',
        prompt: '両生類の特徴です。空らんに入る言葉を選ぼう。',
        text: '両生類の子（幼生）は[b1]で生活して[b2]で呼吸し、親（成体）は陸上や水辺で生活して肺と皮膚で呼吸する。皮膚はいつも[b3]いる。',
        blanks: [
          word('b1', ['水中', '陸上'], '水中'),
          word('b2', ['えら', '肺'], 'えら'),
          word('b3', ['湿って', 'かわいて'], '湿って'),
        ],
        explanation: 'カエルの子（オタマジャクシ）は水中でえら呼吸をし、親になると肺と皮膚で呼吸します。皮膚は湿っていて、うろこはありません。',
        hint: 'オタマジャクシとカエルのくらしを思い出そう。',
      }),
      fill({
        id: 'animals-mp1-r4', concept: 'an-groups',
        prompt: '体の表面のようすです。空らんに入る言葉を選ぼう。',
        text: 'ハチュウ類の体の表面は[b1]、鳥類は[b2]、ホニュウ類は[b3]でおおわれている。',
        blanks: [
          word('b1', ['うろこ', '羽毛', '毛'], 'うろこ'),
          word('b2', ['うろこ', '羽毛', '毛'], '羽毛'),
          word('b3', ['うろこ', '羽毛', '毛'], '毛'),
        ],
        explanation: 'ハチュウ類はかたいうろこ、鳥類は羽毛、ホニュウ類は毛でおおわれています。羽毛や毛は体温を保つのに役立ちます。',
        hint: 'ヘビ・ハト・イヌの体の表面を思い出そう。',
      }),
      choice({
        id: 'animals-mp1-r5', concept: 'an-groups',
        prompt: 'ヒト・カラス・トンボ・タコ・カエル・カニ・ヒトデ・タイ・ヘビ・クモ のうち、無セキツイ動物をすべて選んだものはどれ？',
        options: ['トンボ・タコ・カニ・ヒトデ・クモ', 'トンボ・カエル・カニ・ヘビ', 'タコ・タイ・ヒトデ・クモ'],
        answer: 'a',
        explanation: 'トンボ・カニ・クモは節足動物、タコは軟体動物、ヒトデはそのほかの無セキツイ動物で、どれも背骨がありません。',
        hint: '背骨がない動物をさがそう。',
      }),
    ],
  };

  // ---- ステージ animals-mp2: プリント 2（無セキツイ動物: 節足動物・軟体動物） ----
  const anMp2 = {
    id: 'animals-mp2', areaId: 'invertebrate', free: true, title: 'プリント 2: 無セキツイ動物', minutes: 5, concepts: ['an-arthropod', 'an-mollusc', 'an-classify'],
    lessons: [
      {
        id: 'animals-mp2-c1',
        text: '昆虫類・クモ類・多足類・甲殻類をまとめて**節足動物**といいます。体はかたい**外骨格**でおおわれ、あしに節があります。昆虫のあしは 6 本、クモのあしは 8 本です。エビ・カニは**甲殻類**です。',
        // 写真（animals-3-c2 の画像）: 横から見たトノサマバッタ（左）、クモ（右上）、エビ（右下）。バッタの体の区切りに青い線
        // バッタの頭部 (28〜45, 98〜128)、胸部 (44〜90。後ろあしのつけ根 (84, 132) も胸部)、腹部 (92〜155, 115〜138)
        figure: scene([
          photo('animals-3-c2'),
          { type: 'line', points: [[44, 94], [44, 132]], color: 'blue', width: 2 },
          { type: 'line', points: [[92, 100], [92, 138]], color: 'blue', width: 2 },
          pointer(28, 60, 37, 102), tag(28, 56, '頭部', { size: 13 }),
          pointer(78, 40, 60, 104), tag(84, 34, '胸部（あし 6 本）', { size: 13 }),
          pointer(130, 60, 120, 130), tag(130, 56, '腹部', { size: 13 }),
          tag(86, 200, '昆虫の体は 3 つに分かれる', { size: 13, bold: true }),
        ]),
      },
      {
        id: 'animals-mp2-c2',
        text: 'タコ・イカ・アサリ・ナメクジなどは**軟体動物**です。背骨も節もなく、内臓は**外とう膜**という膜に包まれています。ミミズ・ヒトデ・クラゲなども、節足動物でも軟体動物でもない無セキツイ動物です。',
        // 写真（animals-3-c3 の画像）: 腹側から切り開いたイカ（胴が上・あしが下。外とう膜を左右に開き、中の内臓とえらが見える）
        figure: scene([
          photo('animals-3-c3'),
          tag(40, 30, 'イカ', { size: 15, bold: true }),
          pointer(242, 54, 207, 80), tag(272, 60, '外とう膜'),
          tag(272, 80, '（内臓を包む）', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'animals-mp2-w1', concept: 'an-arthropod',
      prompt: '予想しよう。カブトムシのあしは何本だと思う？',
      options: ['6 本', '8 本', '10 本'],
      answer: 'a',
      explanation: 'カブトムシは昆虫なので、あしは 6 本で、すべて胸部から出ています。背骨のない動物のなかまを、このステージで学ぼう。',
      hint: '昆虫のあしの数を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'animals-mp2-p1', concept: 'an-mollusc',
        prompt: '図は腹側から切り開いたイカの写真です（ア: 胴の外側の部分、イ: 胴の中にある部分、ウ: 頭から下にのびている部分）。内臓を包んでいる膜「外とう膜」はどれ？',
        figure: MP_SQUID_Q,
        answer: 'r1',
        explanation: 'イカの胴の外側の部分（ア）が外とう膜で、胴の中の内臓（イ）を包んでいます。ウはあしです。外とう膜をもつのが軟体動物の特徴です。',
        hint: '胴の部分を包んでいる膜だよ。',
      }),
      fill({
        id: 'animals-mp2-t1', concept: 'an-arthropod', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '節足動物の体の外側をおおっている、かたい殻を[b1]という。',
        blanks: [word('b1', ['外骨格', '外とう膜', '背骨'], '外骨格')],
        explanation: '節足動物の体は、かたい殻（**外骨格**）でおおわれています。外骨格は体を支え、内部を守っています。',
        hint: '体の「外」にある「骨格」だよ。',
      }),
      fill({
        id: 'animals-mp2-p2', concept: 'an-arthropod',
        prompt: '空らんに入る言葉や数を選ぼう。',
        text: '昆虫類・クモ類・多足類・甲殻類をまとめて[b1]という。昆虫のあしは[b2]本、クモのあしは[b3]本である。',
        blanks: [
          word('b1', ['節足動物', '軟体動物', 'セキツイ動物'], '節足動物'),
          word('b2', ['4', '6', '8'], '6'),
          word('b3', ['4', '6', '8'], '8'),
        ],
        explanation: 'あしに節がある動物をまとめて節足動物といいます。昆虫のあしは 6 本、クモのあしは 8 本です。',
        hint: '「節」のある「足」の動物だよ。',
      }),
      choice({
        id: 'animals-mp2-p3', concept: 'an-mollusc',
        prompt: 'タコ・イカ・ナメクジ・アサリなどをまとめて何という？',
        options: ['軟体動物', '節足動物', 'ハチュウ類'],
        answer: 'a',
        explanation: 'タコ・イカ・ナメクジ・アサリは、外とう膜をもち、背骨も節もない軟体動物です。',
        hint: 'やわらかい体の動物だよ。',
      }),
      choice({
        id: 'animals-mp2-p4', concept: 'an-arthropod',
        prompt: '節足動物のうち、エビやカニのなかまを何という？',
        options: ['甲殻類', '昆虫類', '多足類'],
        answer: 'a',
        explanation: 'エビやカニは、かたい甲らをもつ節足動物で、甲殻類といいます。多くは水中でえら呼吸をします。',
        hint: 'かたい「甲」らをもつなかまだよ。',
      }),
      choice({
        id: 'animals-mp2-p5', concept: 'an-classify',
        prompt: '節足動物でも軟体動物でもない無セキツイ動物の例はどれ？',
        options: ['ミミズ・ヒトデ・クラゲ', 'カニ・クモ・ムカデ', 'タコ・イカ・アサリ'],
        answer: 'a',
        explanation: 'ミミズ・ヒトデ・クラゲは、背骨がなく、節足動物にも軟体動物にも入らない無セキツイ動物です。カニ・クモ・ムカデは節足動物、タコ・イカ・アサリは軟体動物です。',
        hint: 'あしの節も外とう膜もない動物をさがそう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'animals-mp2-r1', concept: 'an-arthropod',
        prompt: '図はバッタを横から見た写真です。6 本のあしが出ている部分はどこ？ ア〜ウから選ぼう。',
        figure: MP_INSECT_Q,
        answer: 'r2',
        explanation: '昆虫の体は頭部・胸部・腹部に分かれ、6 本のあしはすべて胸部から出ています（イ）。',
        hint: '体のまん中の部分だよ。',
      }),
      choice({
        id: 'animals-mp2-r2', concept: 'an-mollusc',
        prompt: '軟体動物の特徴として正しいのはどれ？',
        options: ['外とう膜をもち、背骨も節もない', '外骨格をもち、あしに節がある', '背骨をもち、肺で呼吸する'],
        answer: 'a',
        explanation: '軟体動物は、内臓を包む外とう膜をもち、背骨もあしの節もありません。外骨格とあしの節は節足動物の特徴です。',
        hint: '「外とう膜」がキーワードだよ。',
      }),
      choice({
        id: 'animals-mp2-r3', concept: 'an-arthropod',
        prompt: 'クモのあしは何本？',
        options: ['8 本', '6 本', '10 本'],
        answer: 'a',
        explanation: 'クモのあしは 8 本です。昆虫（6 本）とはちがうなかま（クモ類）です。',
        hint: '昆虫より多いよ。',
      }),
    ],
  };

  // あふれた問題を、もとからある概念の確認問題（checkPool）に足す
  function addCheck(id, problems) { concepts.find(c => c.id === id).checkPool.push(...problems); }
  addCheck('an-traits', [
    choice({
      id: 'animals-mp1-k1', concept: 'an-traits',
      prompt: '子が母親の体内（子宮）である程度育ってから、親と同じような姿でうまれるうまれ方を何という？',
      options: ['胎生', '卵生', '変態'],
      answer: 'a',
      explanation: '母親の体内で育ってからうまれるうまれ方を胎生といいます。ホニュウ類のうまれ方です。卵でうまれるのは卵生です。',
      hint: '「胎」は母親の体内という意味だよ。',
    }),
    choice({
      id: 'animals-mp1-k2', concept: 'an-traits',
      prompt: 'うまれた子が、母親の乳を飲んで育つなかまはどれ？',
      options: ['ホニュウ類', '鳥類', '両生類'],
      answer: 'a',
      explanation: 'ホニュウ類の子は、母親の乳を飲んで育ちます。「ホニュウ」は乳で育てるという意味です。',
      hint: 'なかまの名前に答えがあるよ。',
    }),
  ]);
  addCheck('an-groups', [
    choice({
      id: 'animals-mp1-k3', concept: 'an-groups',
      prompt: '魚類・両生類・ハチュウ類・鳥類・ホニュウ類のうち、背骨をもつのはどれ？',
      options: ['5 つすべて', 'ホニュウ類だけ', '鳥類とホニュウ類だけ'],
      answer: 'a',
      explanation: 'この 5 つは、どれも背骨をもつセキツイ動物のなかまです。',
      hint: 'セキツイ動物の 5 つのなかまだったね。',
    }),
  ]);

  // ================================================================
  // 領域 4: ドリル（中学理科の知識から自作した練習問題。docs/reports/content/animals.md）
  // ================================================================

  // 数を答える空らん（content/volcano.js と同じ）
  function number(id, answer, tolerance, unit) { return { id, kind: 'number', answer, tolerance, unit }; }

  // 5 つのなかまの図に、なかまの名前を書いたもの（解説用）
  function fiveAnimalsNamed() {
    return scene(fiveAnimals().concat([
      { type: 'text', x: 60, y: 112, text: '魚類', size: 13, anchor: 'middle' },
      { type: 'text', x: 165, y: 112, text: '両生類', size: 13, anchor: 'middle' },
      { type: 'text', x: 262, y: 112, text: 'ハチュウ類', size: 13, anchor: 'middle' },
      { type: 'text', x: 105, y: 214, text: '鳥類', size: 13, anchor: 'middle' },
      { type: 'text', x: 225, y: 214, text: 'ホニュウ類', size: 13, anchor: 'middle' },
    ]));
  }

  // 1 回にうむ卵（子）の数の例の表
  const EGG_TABLE = scene([
    { type: 'text', x: 160, y: 24, text: '1 回にうむ卵（子）の数の例', size: 14, anchor: 'middle' },
    { type: 'rect', x: 30, y: 36, width: 260, height: 26, fill: 'glass' },
    { type: 'text', x: 90, y: 54, text: '動物', size: 12, anchor: 'middle' },
    { type: 'text', x: 220, y: 54, text: '数', size: 12, anchor: 'middle' },
  ].concat([
    ['マンボウ（魚類）', '約 3 億個'], ['ヒキガエル（両生類）', '数千個'], ['ウミガメ（ハチュウ類）', '約 100 個'],
    ['ハト（鳥類）', '2 個'], ['ヒト（ホニュウ類）', 'ふつう 1 人'],
  ].flatMap(([a, n], i) => [
    { type: 'rect', x: 30, y: 62 + 34 * i, width: 260, height: 34, fill: 'white' },
    { type: 'text', x: 40, y: 84 + 34 * i, text: a, size: 12 },
    { type: 'text', x: 220, y: 84 + 34 * i, text: n, size: 12, anchor: 'middle' },
  ]), [
    { type: 'line', points: [[160, 36], [160, 232]], color: 'line', width: 1 },
  ]));

  // drag 用: 「体温」×「卵」の 2×2 のます。動物の名前のカード（80×30）を、なかまのますへ動かす
  // ますの中心: 一定・殻あり (150, 105)、変わる・殻あり (250, 105)、一定・殻なし (150, 175)、変わる・殻なし (250, 175)
  // カードの左上は 中心 − (40, 15): (110, 90)、(210, 90)、(110, 160)、(210, 160)
  function traitGridScene(name) {
    return scene([
      { type: 'text', x: 150, y: 60, text: '体温がほぼ一定', size: 12, anchor: 'middle' },
      { type: 'text', x: 250, y: 60, text: '体温が変わる', size: 12, anchor: 'middle' },
      { type: 'text', x: 52, y: 110, text: '殻のある卵', size: 12, anchor: 'middle' },
      { type: 'text', x: 52, y: 180, text: '殻のない卵', size: 12, anchor: 'middle' },
      { type: 'rect', x: 100, y: 70, width: 100, height: 70, fill: 'white' },
      { type: 'rect', x: 200, y: 70, width: 100, height: 70, fill: 'white' },
      { type: 'rect', x: 100, y: 140, width: 100, height: 70, fill: 'white' },
      { type: 'rect', x: 200, y: 140, width: 100, height: 70, fill: 'white' },
      { type: 'rect', id: 'card', x: 8, y: 10, width: 80, height: 30, fill: 'yellow', rx: 4, label: name },
    ]);
  }

  // セキツイ動物のなかまの特徴の表（呼吸・体の表面・うまれ方）。rows は 4 行。左にア〜エの選ぶ場所
  function vertTable(rows) {
    const items = [
      { type: 'rect', x: 44, y: 16, width: 272, height: 24, fill: 'glass' },
      { type: 'text', x: 76, y: 33, text: 'なかま', size: 12, anchor: 'middle' },
      { type: 'text', x: 150, y: 33, text: '呼吸', size: 12, anchor: 'middle' },
      { type: 'text', x: 229, y: 33, text: '体の表面', size: 12, anchor: 'middle' },
      { type: 'text', x: 291, y: 33, text: 'うまれ方', size: 12, anchor: 'middle' },
    ];
    rows.forEach((row, i) => {
      const y = 40 + 46 * i;
      items.push({ type: 'rect', x: 44, y, width: 272, height: 46, fill: 'white' });
      [76, 150, 229, 291].forEach((x, k) => items.push({ type: 'text', x, y: y + 28, text: row[k], size: 12, anchor: 'middle' }));
      items.push({ type: 'region', id: 'r' + (i + 1), x: 22, y: y + 23, r: 22, label: 'アイウエ'[i] });
    });
    [108, 192, 266].forEach(x => items.push({ type: 'line', points: [[x, 16], [x, 224]], color: 'line', width: 1 }));
    return scene(items);
  }

  // クモを上から見た図（左が頭胸部、右が腹部。8 本のあしは頭胸部から出る）。s は大きさの倍率
  // 頭胸部の中心 (cx−26s, cy)、腹部の中心 (cx+30s, cy)
  function spider(cx, cy, s) {
    const k = v => v * s;
    const items = [];
    [0, 1, 2, 3].forEach(i => {
      const bx = cx + k(-38 + 8 * i);
      [-1, 1].forEach(side => {
        items.push({ type: 'line', points: [
          [bx, cy + side * k(8)], [bx + k(-26 + 16 * i), cy + side * k(34)], [bx + k(-40 + 26 * i), cy + side * k(52)],
        ], width: 2 });
      });
    });
    items.push(
      { type: 'ellipse', x: cx + k(30), y: cy, rx: k(32), ry: k(24), fill: 'brown' },
      { type: 'ellipse', x: cx - k(26), y: cy, rx: k(22), ry: k(16), fill: 'brown' },
    );
    return items;
  }

  // クモの図に ア 頭胸部・イ 腹部 の選ぶ場所（引き出し線つき）を付けたもの
  const SPIDER_Q = scene(spider(160, 130, 1.3).concat([
    leader(82, 52, 126, 126), { type: 'region', id: 'r1', x: 66, y: 40, r: 22, label: 'ア' },
    leader(244, 52, 204, 126), { type: 'region', id: 'r2', x: 260, y: 40, r: 22, label: 'イ' },
  ]));

  // 昆虫とクモの体の分かれ方（解説用）
  function insectSpiderScene() {
    return scene(insect(92, 110, 0.9).concat(spider(236, 110, 0.9), [
      { type: 'text', x: 92, y: 190, text: '昆虫', size: 14, anchor: 'middle', bold: true },
      { type: 'text', x: 92, y: 210, text: '頭部・胸部・腹部', size: 12, anchor: 'middle' },
      { type: 'text', x: 236, y: 190, text: 'クモ', size: 14, anchor: 'middle', bold: true },
      { type: 'text', x: 236, y: 210, text: '頭胸部・腹部', size: 12, anchor: 'middle' },
    ]));
  }

  // アサリの体の中（殻を開いたようす）: 殻・外とう膜・えら・あし
  function clamScene() {
    return scene([
      { type: 'ellipse', x: 170, y: 116, rx: 120, ry: 76, fill: 'glass' },
      { type: 'ellipse', x: 170, y: 116, rx: 102, ry: 60, fill: 'pink' },
      { type: 'line', points: [[120, 96], [220, 96]], color: 'line', width: 2 },
      { type: 'line', points: [[118, 108], [222, 108]], color: 'line', width: 2 },
      { type: 'line', points: [[120, 120], [220, 120]], color: 'line', width: 2 },
      { type: 'polygon', points: [[84, 150], [40, 196], [72, 210], [112, 166]], fill: 'yellow' },
      leader(222, 108, 262, 30), { type: 'text', x: 266, y: 26, text: 'えら', size: 13 },
      leader(250, 150, 278, 214), { type: 'text', x: 236, y: 230, text: '外とう膜', size: 13 },
      leader(70, 70, 40, 30), { type: 'text', x: 16, y: 24, text: '殻', size: 13 },
      { type: 'text', x: 20, y: 228, text: 'あし', size: 13 },
    ]);
  }

  // 無セキツイ動物の分け方（解説用）
  function invertTree() {
    const items = [
      { type: 'rect', x: 100, y: 14, width: 120, height: 30, fill: 'glass', label: '無セキツイ動物' },
      { type: 'line', points: [[160, 44], [160, 62]], width: 2 },
      { type: 'line', points: [[56, 62], [264, 62]], width: 2 },
    ];
    [['節足動物', 'バッタ・クモ', 'カニ・ムカデ'], ['軟体動物', 'イカ・アサリ', 'マイマイ'], ['その他', 'ミミズ・ウニ', 'クラゲ']].forEach(([t, a, b], i) => {
      const cx = 56 + 104 * i;
      items.push(
        { type: 'line', points: [[cx, 62], [cx, 80]], width: 2 },
        { type: 'rect', x: cx - 48, y: 80, width: 96, height: 30, fill: 'white', label: t },
        { type: 'text', x: cx, y: 136, text: a, size: 12, anchor: 'middle' },
        { type: 'text', x: cx, y: 156, text: b, size: 12, anchor: 'middle' },
      );
    });
    items.push(
      { type: 'text', x: 56, y: 196, text: '外骨格・節', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 196, text: '外とう膜', size: 12, anchor: 'middle' },
      { type: 'text', x: 264, y: 196, text: 'どちらもない', size: 12, anchor: 'middle' },
    );
    return scene(items);
  }

  // ---- ステージ animals-dr1: ドリル 1（動物の体の共通点と相違点 前半: セキツイ動物の 5 つのなかま） ----
  const anDr1 = {
    id: 'animals-dr1', areaId: 'vertebrate', free: true, title: 'ドリル 1: セキツイ動物の 5 つのなかま', minutes: 6, concepts: ['an-traits', 'an-groups'],
    lessons: [
      {
        id: 'animals-dr1-c1',
        text: 'セキツイ動物の 5 つのなかまは、**呼吸**のしかた、体の表面のようす、子のうまれ方などのちがいで区別します。クジラは海にすみますが、肺で呼吸するので、ときどき海面に出て息つぎをします。',
        figure: fiveAnimalsNamed(),
      },
      {
        id: 'animals-dr1-c2',
        text: '親が卵をうみ、卵から子がかえるうまれ方を**卵生**といいます。魚類や両生類は殻のない卵を水中にたくさんうみます。卵や子が食べられることも多いので、数が多いと子孫が残りやすくなります。',
        figure: EGG_TABLE,
      },
    ],
    warmup: choice({
      id: 'animals-dr1-w1', concept: 'an-traits',
      prompt: '予想しよう。マンボウは 1 回に約 3 億個の卵をうみますが、ハトは 2 個です。マンボウの卵がこんなに多いのはなぜだと思う？',
      options: ['親が卵を温めるから', '食べられる卵や子が多いから', '卵がとても大きいから'],
      answer: 'b',
      explanation: '水中にうまれた卵や子は、ほかの動物に食べられることが多いので、たくさんうむことで子孫が残りやすくなります。なかまごとの特徴を、このステージで確かめよう。',
      hint: '親が世話をしない卵は、どうなりやすいかな。',
    }),
    problems: [
      fill({
        id: 'animals-dr1-t1', concept: 'an-traits', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '親が卵をうみ、卵から子がかえるうまれ方を[b1]という。',
        blanks: [word('b1', ['胎生', '卵生', '変態'], '卵生')],
        explanation: '卵をうむうまれ方を**卵生**といいます。魚類・両生類・ハチュウ類・鳥類は卵生、ホニュウ類は胎生です。',
        hint: '「卵」でうまれる、と書くよ。',
      }),
      drag({
        id: 'animals-dr1-p1', concept: 'an-traits',
        prompt: '表は「体温」と「卵」で動物を分けるものです。「ペンギン」のカードを、当てはまるますへ動かして入れよう。',
        // ペンギン（鳥類）: 体温がほぼ一定・殻のある卵 → カードの左上 (110, 90)。不正解例は 体温が変わる・殻のある卵 (210, 90)
        figure: traitGridScene('ペンギン'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 110, y: 90 },
        samples: { correct: { x: 110, y: 90 }, wrong: { x: 210, y: 90 } },
        explanation: 'ペンギンは飛べませんが、羽毛をもつ鳥類です。鳥類は体温がほぼ一定の恒温動物で、陸上に殻のある卵をうみます。',
        hint: 'ペンギンは鳥類だよ。鳥類の体温と卵を思い出そう。',
      }),
      fill({
        id: 'animals-dr1-p2', concept: 'an-groups',
        prompt: 'イルカ・ペンギン・コウモリ・ヤモリ・イモリ・クジラ・サケ・ウサギの 8 種類の動物がいます。',
        text: 'このうち、ホニュウ類は[b1]である。',
        blanks: [number('b1', 4, 0, '種類')],
        explanation: 'ホニュウ類は、イルカ・コウモリ・クジラ・ウサギの 4 種類です。ペンギンは鳥類、ヤモリはハチュウ類、イモリは両生類、サケは魚類です。',
        hint: '子を乳で育てるなかまを数えよう。',
      }),
      choice({
        id: 'animals-dr1-p3', concept: 'an-traits',
        prompt: '1 回にうむ卵の数の例: マンボウ 約 3 億個、ヒキガエル 数千個、ウミガメ 約 100 個、ハト 2 個。ここから言えることとして正しいのはどれ？',
        options: ['水中に殻のない卵をうむなかまほど多い', '陸上で生活するなかまほど多い', '体が小さいなかまほど多い'],
        answer: 'a',
        explanation: '殻のない卵を水中にうむ魚類や両生類は、卵の数がとても多くなっています。陸上に殻のある卵をうむハチュウ類や鳥類は、それより少なくなっています。',
        hint: '数の多い 2 つは、どこにどんな卵をうむなかまかな。',
      }),
      figureChoice({
        id: 'animals-dr1-p4', concept: 'an-groups',
        prompt: '表はセキツイ動物の 4 つのなかまの特徴です。1 つの行に、まちがいが 1 か所あります。まちがいがある行はどれ？ ア〜エから選ぼう。',
        // イ ハチュウ類の体の表面はうろこが正しい（羽毛は鳥類）
        figure: vertTable([
          ['両生類', 'えら→肺', 'しめった皮ふ', '卵生'],
          ['ハチュウ類', '肺', '羽毛', '卵生'],
          ['鳥類', '肺', '羽毛', '卵生'],
          ['ホニュウ類', '肺', '毛', '胎生'],
        ]),
        answer: 'r2',
        explanation: 'ハチュウ類の体の表面は、うろこでおおわれています。羽毛でおおわれているのは鳥類なので、イがまちがいです。',
        hint: 'トカゲやヘビの体の表面を思い出そう。',
      }),
      choice({
        id: 'animals-dr1-p5', concept: 'an-groups',
        prompt: 'コウモリとハトは、どちらも空を飛びますが、ちがうなかまです。分ける決め手になる特徴はどれ？',
        options: ['翼があるかどうか', '子のうまれ方（胎生か卵生か）', '背骨があるかどうか'],
        answer: 'b',
        explanation: 'コウモリは子をうんで乳で育てる胎生のホニュウ類、ハトは卵をうむ卵生の鳥類です。どちらも翼と背骨があるので、それでは分けられません。',
        hint: '2 つに共通している特徴では、分けられないね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'animals-dr1-r1', concept: 'an-traits',
        prompt: 'カエルの卵が、ニワトリの卵とちがって水中にうまれるのはなぜ？',
        options: ['殻がなく、かわきに弱いから', '殻がとてもかたいから', '親が水中でしか動けないから'],
        answer: 'a',
        explanation: '両生類の卵には殻がないので、陸上ではかわいてしまいます。そのため水中にうみます。ニワトリ（鳥類）の卵は殻があるので陸上にうめます。',
        hint: '2 つの卵の、殻のちがいを考えよう。',
      }),
      drag({
        id: 'animals-dr1-r2', concept: 'an-traits',
        prompt: '表は「体温」と「卵」で動物を分けるものです。「ヤモリ」のカードを、当てはまるますへ動かして入れよう。',
        // ヤモリ（ハチュウ類）: 体温が変わる・殻のある卵 → カードの左上 (210, 90)。不正解例は 体温がほぼ一定・殻のある卵 (110, 90)
        figure: traitGridScene('ヤモリ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 210, y: 90 },
        samples: { correct: { x: 210, y: 90 }, wrong: { x: 110, y: 90 } },
        explanation: 'ヤモリはハチュウ類です。体温がまわりの気温で変わる変温動物で、陸上に殻のある卵をうみます。',
        hint: 'ヤモリはハチュウ類、イモリは両生類だよ。',
      }),
      fill({
        id: 'animals-dr1-r3', concept: 'an-groups',
        prompt: 'イモリ・ヤモリ・ヘビ・サンショウウオ・ワニ・カエルの 6 種類の動物がいます。',
        text: 'このうち、ハチュウ類は[b1]である。',
        blanks: [number('b1', 3, 0, '種類')],
        explanation: 'ハチュウ類は、ヤモリ・ヘビ・ワニの 3 種類です。イモリ・サンショウウオ・カエルは両生類です。',
        hint: '体の表面がうろこでおおわれているなかまを数えよう。',
      }),
      figureChoice({
        id: 'animals-dr1-r4', concept: 'an-groups',
        prompt: '表はセキツイ動物の 4 つのなかまの特徴です。1 つの行に、まちがいが 1 か所あります。まちがいがある行はどれ？ ア〜エから選ぼう。',
        // エ ホニュウ類のうまれ方は胎生が正しい
        figure: vertTable([
          ['両生類', 'えら→肺', 'しめった皮ふ', '卵生'],
          ['ハチュウ類', '肺', 'うろこ', '卵生'],
          ['鳥類', '肺', '羽毛', '卵生'],
          ['ホニュウ類', '肺', '毛', '卵生'],
        ]),
        answer: 'r4',
        explanation: 'ホニュウ類は、子が母親の体内である程度育ってからうまれる胎生です。表では卵生になっているので、エがまちがいです。',
        hint: 'ホニュウ類の子のうまれ方を思い出そう。',
      }),
      choice({
        id: 'animals-dr1-t2', concept: 'an-traits', term: true,
        prompt: '次の説明に合う言葉はどれ？「魚類やハチュウ類の体の表面をおおっている、かたい小さな板のようなもの」',
        options: ['羽毛', 'うろこ', '外骨格'],
        answer: 'b',
        explanation: '魚類やハチュウ類の体の表面は**うろこ**でおおわれています。羽毛は鳥類、外骨格は節足動物の体をおおうものです。',
        hint: '魚の表面にたくさん並んでいるものだよ。',
      }),
      choice({
        id: 'animals-dr1-r5', concept: 'an-traits',
        prompt: 'クジラが、ときどき海面に出てくるのはなぜ？',
        options: ['えらに水を通すため', '卵をうむため', '肺で呼吸するので、息つぎをするため'],
        answer: 'c',
        explanation: 'クジラはホニュウ類なので、えらではなく肺で呼吸します。そのため、ときどき海面に出て空気を吸います。',
        hint: 'クジラはどのなかまで、何で呼吸するかな。',
      }),
    ],
  };

  // ---- ステージ animals-dr2: ドリル 2（動物の体の共通点と相違点 後半: 無セキツイ動物と分類） ----
  const anDr2 = {
    id: 'animals-dr2', areaId: 'invertebrate', free: true, title: 'ドリル 2: 無セキツイ動物と分類', minutes: 6, concepts: ['an-arthropod', 'an-mollusc', 'an-classify'],
    lessons: [
      {
        id: 'animals-dr2-c1',
        text: '昆虫の体は頭部・胸部・腹部に分かれ、胸部や腹部にある**気門**から空気を取り入れます。クモの体は**頭胸部**と腹部の 2 つに分かれ、あしは 8 本で、すべて頭胸部から出ています。',
        figure: insectSpiderScene(),
      },
      {
        id: 'animals-dr2-c2',
        text: '軟体動物は、内臓が**外とう膜**に包まれています。アサリやイカなど水中にすむものの多くはえらで呼吸し、マイマイ（カタツムリ）のように陸上にすむものは肺で呼吸します。',
        figure: clamScene(),
      },
      {
        id: 'animals-dr2-c3',
        text: '無セキツイ動物は、外骨格と節がある節足動物、外とう膜がある軟体動物、そのどちらでもない**ミミズ**・ウニ・ヒトデ・クラゲなどに分けられます。',
        figure: invertTree(),
      },
    ],
    warmup: choice({
      id: 'animals-dr2-w1', concept: 'an-arthropod',
      prompt: '予想しよう。ダンゴムシは、あしがたくさんあり、体がかたい殻でおおわれています。ダンゴムシは昆虫のなかまだと思う？',
      options: ['昆虫のなかまである', '昆虫のなかまではない', 'セキツイ動物のなかまである'],
      answer: 'b',
      explanation: 'ダンゴムシは、エビやカニと同じ甲殻類です。節足動物ですが、昆虫ではありません。昆虫のあしは 6 本です。',
      hint: '昆虫のあしの数を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'animals-dr2-p1', concept: 'an-arthropod',
        prompt: '図はクモを上から見たようすです。ア 頭胸部、イ 腹部。8 本のあしが出ている部分はどちら？ ア・イから選ぼう。',
        figure: SPIDER_Q,
        answer: 'r1',
        explanation: 'クモの体は頭胸部と腹部の 2 つに分かれ、8 本のあしはすべて頭胸部から出ています。昆虫（あしは胸部から 6 本）とのちがいです。',
        hint: '前のほうの、小さいほうの部分を見よう。',
      }),
      fill({
        id: 'animals-dr2-t1', concept: 'an-arthropod', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '昆虫の胸部や腹部にある、空気を取り入れるための穴を[b1]という。',
        blanks: [word('b1', ['気門', '外とう膜', 'えら'], '気門')],
        explanation: '昆虫は、胸部や腹部の側面に並ぶ**気門**から空気を取り入れて呼吸しています。',
        hint: '「気（空気）」の「門（入り口）」だよ。',
      }),
      choice({
        id: 'animals-dr2-p2', concept: 'an-mollusc',
        prompt: 'マイマイ（カタツムリ）は陸上にすむ軟体動物です。マイマイは何で呼吸する？',
        options: ['えら', '肺', '気門'],
        answer: 'b',
        explanation: '水中にすむ軟体動物の多くはえらで呼吸しますが、陸上にすむマイマイは肺で呼吸します。',
        hint: '陸上で空気を取り入れる器官だよ。',
      }),
      fill({
        id: 'animals-dr2-p3', concept: 'an-classify',
        prompt: 'カニ・クモ・タコ・ミミズ・ムカデ・アサリ・ダンゴムシ・ヒトデの 8 種類の動物がいます。',
        text: 'このうち、節足動物は[b1]である。',
        blanks: [number('b1', 4, 0, '種類')],
        explanation: '節足動物は、カニ・クモ・ムカデ・ダンゴムシの 4 種類です。タコ・アサリは軟体動物、ミミズ・ヒトデはそのどちらでもない無セキツイ動物です。',
        hint: '外骨格があり、あしに節があるなかまを数えよう。',
      }),
      choice({
        id: 'animals-dr2-p4', concept: 'an-classify',
        prompt: 'ミミズ・ヒトデ・クラゲに共通する特徴はどれ？',
        options: ['背骨も外骨格もない', '背骨がある', '外とう膜で内臓を包んでいる'],
        answer: 'a',
        explanation: 'ミミズ・ヒトデ・クラゲは、背骨のない無セキツイ動物で、外骨格も外とう膜もありません。節足動物にも軟体動物にも入りません。',
        hint: '節足動物にも軟体動物にも入らないなかまだよ。',
      }),
      choice({
        id: 'animals-dr2-p5', concept: 'an-arthropod',
        prompt: 'Cさんのまとめ「エビやカニは、あしがたくさんあるので昆虫のなかまである」。正しく直したものはどれ？',
        options: ['軟体動物で、昆虫ではない', '甲殻類で、昆虫ではない', 'セキツイ動物で、昆虫ではない'],
        answer: 'b',
        explanation: 'エビやカニは甲殻類です。外骨格があり、あしに節がある節足動物ですが、昆虫ではありません。昆虫のあしは 6 本です。',
        hint: 'エビ・カニ・ダンゴムシのなかまの名前を思い出そう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'animals-dr2-r1', concept: 'an-arthropod',
        prompt: '図はクモを上から見たようすです。ア 頭胸部、イ 腹部。糸を出す所があるのはどちら？ ア・イから選ぼう。',
        figure: SPIDER_Q,
        answer: 'r2',
        explanation: 'クモは、腹部の先にある所から糸を出します。あしが出ているのは頭胸部です。',
        hint: 'あしの出ていない、大きいほうの部分だよ。',
      }),
      choice({
        id: 'animals-dr2-r2', concept: 'an-arthropod',
        prompt: '昆虫とクモに共通する特徴はどれ？',
        options: ['あしが 6 本ある', '外骨格があり、あしに節がある', '体が 3 つに分かれている'],
        answer: 'b',
        explanation: '昆虫もクモも節足動物で、外骨格があり、あしに節があります。あしの数と体の分かれ方はちがいます。',
        hint: 'あしの数や体の分かれ方は、2 つでちがっていたね。',
      }),
      fill({
        id: 'animals-dr2-t2', concept: 'an-arthropod', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'クモやエビの、頭部と胸部が 1 つになった部分を[b1]という。',
        blanks: [word('b1', ['腹部', '外とう膜', '頭胸部'], '頭胸部')],
        explanation: 'クモやエビの頭部と胸部が 1 つになった部分を**頭胸部**といいます。',
        hint: '頭部と胸部を合わせた名前だよ。',
      }),
      fill({
        id: 'animals-dr2-r3', concept: 'an-mollusc',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'イカやタコは、水中で[b1]を使って呼吸している。',
        blanks: [word('b1', ['えら', '肺', '気門'], 'えら')],
        explanation: 'イカやタコは水中にすむ軟体動物で、えらで呼吸します。',
        hint: '水中にすむ軟体動物の呼吸を思い出そう。',
      }),
      choice({
        id: 'animals-dr2-r4', concept: 'an-mollusc',
        prompt: '次の軟体動物のうち、陸上にすむものはどれ？',
        options: ['アサリ', 'タコ', 'マイマイ'],
        answer: 'c',
        explanation: 'マイマイ（カタツムリ）は陸上にすむ軟体動物で、肺で呼吸します。アサリとタコは水中にすみ、えらで呼吸します。',
        hint: '雨の日に、葉の上で見つかるよ。',
      }),
      fill({
        id: 'animals-dr2-r5', concept: 'an-classify',
        prompt: 'イカ・カニ・アサリ・ミミズ・タコ・マイマイ・クラゲの 7 種類の動物がいます。',
        text: 'このうち、軟体動物は[b1]である。',
        blanks: [number('b1', 4, 0, '種類')],
        explanation: '軟体動物は、イカ・アサリ・タコ・マイマイの 4 種類です。カニは節足動物、ミミズとクラゲはそのどちらでもない無セキツイ動物です。',
        hint: '外とう膜で内臓が包まれているなかまを数えよう。',
      }),
      choice({
        id: 'animals-dr2-r6', concept: 'an-classify',
        prompt: 'ウニやヒトデは、どのなかまに入る？',
        options: ['節足動物', '節足動物・軟体動物以外の無セキツイ動物', '軟体動物'],
        answer: 'b',
        explanation: 'ウニやヒトデは背骨がなく、外骨格も外とう膜もないので、節足動物にも軟体動物にも入らない無セキツイ動物です。',
        hint: '外骨格や外とう膜があるかを考えよう。',
      }),
      choice({
        id: 'animals-dr2-r7', concept: 'an-mollusc',
        prompt: 'アサリは、えらで呼吸します。アサリのえらは、どこにある？',
        options: ['殻の外側', 'あしの先', '外とう膜の内側'],
        answer: 'c',
        explanation: 'アサリのえらは、殻の内側の外とう膜に包まれた所にあります。殻を開けると、外とう膜の内側にえらが見られます。',
        hint: '外とう膜は、内臓などを包んでいたね。',
      }),
    ],
  };

  // ================================================================
  // クイズ（ほかの先生が公開しているクイズの「何を問うか」だけを参考に自作した問題。docs/reports/content/animals.md）
  // ================================================================

  // カエルの幼生（おたまじゃくし）から成体への変態（解説用）
  function metamorphosisScene() {
    return scene([
      { type: 'polygon', points: [[72, 118], [112, 104], [112, 132]], fill: 'brown' },
      { type: 'ellipse', x: 62, y: 118, rx: 20, ry: 14, fill: 'brown' },
      { type: 'circle', x: 52, y: 114, r: 2, fill: 'ink' },
      { type: 'arrow', x1: 130, y1: 118, x2: 182, y2: 118, color: 'blue' },
      { type: 'text', x: 156, y: 104, text: '変態', size: 14, anchor: 'middle', bold: true },
    ].concat(frog(250, 120), [
      { type: 'text', x: 72, y: 176, text: '幼生（おたまじゃくし）', size: 12, anchor: 'middle' },
      { type: 'text', x: 72, y: 196, text: '水中・えらと皮ふ', size: 12, anchor: 'middle' },
      { type: 'text', x: 250, y: 176, text: '成体（カエル）', size: 12, anchor: 'middle' },
      { type: 'text', x: 250, y: 196, text: '陸上や水辺・肺と皮ふ', size: 12, anchor: 'middle' },
    ]));
  }

  // 魚類 → 両生類 → ハチュウ類 で、生活の場所と卵・体の表面がどう変わるか（解説用）
  function waterToLandScene() {
    const items = [{ type: 'text', x: 160, y: 36, text: '水中から陸上へ', size: 14, anchor: 'middle', bold: true }];
    [['魚類', '水中', '殻のない卵', 'うろこ'], ['両生類', '水中と陸上', '殻のない卵', 'しめった皮ふ'], ['ハチュウ類', '陸上', '殻のある卵', 'かたいうろこ']]
      .forEach(([name, place, egg, skin], i) => {
        const cx = 56 + 104 * i;
        items.push(
          { type: 'rect', x: cx - 46, y: 56, width: 92, height: 36, fill: 'white', label: name },
          { type: 'text', x: cx, y: 124, text: place, size: 12, anchor: 'middle' },
          { type: 'text', x: cx, y: 150, text: egg, size: 12, anchor: 'middle' },
          { type: 'text', x: cx, y: 176, text: skin, size: 12, anchor: 'middle' },
        );
      });
    items.push(
      { type: 'line', points: [[102, 74], [112, 74]], width: 2, arrow: true },
      { type: 'line', points: [[206, 74], [216, 74]], width: 2, arrow: true },
      { type: 'text', x: 160, y: 214, text: '陸上では、かわきから体や卵を守るつくりが役立つ', size: 12, anchor: 'middle' },
    );
    return scene(items);
  }

  // 気温と体温のグラフに、恒温動物と変温動物の線を引いたもの（解説用）
  function hibernateScene() {
    return scene(tempGraph().concat([
      { type: 'line', points: [[gx(0), gy(38)], [gx(40), gy(38)]], color: 'orange', width: 3 },
      { type: 'line', points: [[gx(0), gy(0)], [gx(40), gy(40)]], color: 'blue', width: 3 },
      { type: 'text', x: 70, y: 40, text: '恒温動物（イヌ）', size: 12, color: 'orange' },
      { type: 'text', x: 150, y: 170, text: '変温動物（ヘビ）', size: 12, color: 'blue' },
    ]));
  }

  // drag 用: 呼吸のしかたで分ける 3 列の表。動物の名前のカード（80×30）を、列へ動かす
  // 列の中心: 一生えら呼吸 (66, 145)、子はえら・親は肺 (162, 145)、一生肺呼吸 (258, 145)
  // カードの左上は 中心 − (40, 15): (26, 130)、(122, 130)、(218, 130)
  function breathBoardScene(name) {
    return scene([
      { type: 'text', x: 210, y: 26, text: '呼吸のしかたで分ける', size: 13, anchor: 'middle' },
      { type: 'text', x: 66, y: 66, text: '一生えら呼吸', size: 12, anchor: 'middle' },
      { type: 'text', x: 162, y: 58, text: '子はえら', size: 12, anchor: 'middle' },
      { type: 'text', x: 162, y: 74, text: '親は肺と皮ふ', size: 12, anchor: 'middle' },
      { type: 'text', x: 258, y: 66, text: '一生肺呼吸', size: 12, anchor: 'middle' },
      { type: 'rect', x: 18, y: 80, width: 96, height: 130, fill: 'white' },
      { type: 'rect', x: 114, y: 80, width: 96, height: 130, fill: 'white' },
      { type: 'rect', x: 210, y: 80, width: 96, height: 130, fill: 'white' },
      { type: 'rect', id: 'card', x: 8, y: 8, width: 80, height: 30, fill: 'yellow', rx: 4, label: name },
    ]);
  }

  // ア カエル・イ ハト・ウ イヌ と、それぞれの下の選ぶ場所
  const KQ_WINTER_Q = scene([].concat(frog(60, 96), bird(160, 96), dog(260, 100), [
    { type: 'text', x: 60, y: 148, text: 'カエル', size: 13, anchor: 'middle' },
    { type: 'text', x: 160, y: 148, text: 'ハト', size: 13, anchor: 'middle' },
    { type: 'text', x: 260, y: 148, text: 'イヌ', size: 13, anchor: 'middle' },
  ], regionsRow([60, 160, 260], 188)));

  // ア・イ・ウ…の選ぶ場所を横に並べる（xs は中心の x、y は共通）
  function regionsRow(xs, y) {
    return xs.map((x, i) => ({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: 'アイウエ'[i] }));
  }

  // ---- ステージ animals-kq1: クイズ 1（セキツイ動物の特徴を考える: 変態・陸上への広がり・冬眠・呼吸） ----
  const anKq1 = {
    id: 'animals-kq1', areaId: 'vertebrate', free: true, title: 'クイズ 1: セキツイ動物の特徴を考える', minutes: 6, concepts: ['an-traits', 'an-groups'],
    lessons: [
      {
        id: 'animals-kq1-c1',
        text: 'カエルの子（おたまじゃくし）は**幼生**とよばれ、水中でえらと皮ふを使って呼吸します。成長するとき、体のつくりや生活のしかたが大きく変わることを**変態**といいます。',
        figure: metamorphosisScene(),
      },
      {
        id: 'animals-kq1-c2',
        text: '魚類・両生類・ハチュウ類と比べていくと、陸上の生活に合う特徴がふえていきます。ハチュウ類のかたいうろこや殻のある卵は、体や卵を**乾燥**から守ります。',
        figure: waterToLandScene(),
      },
      {
        id: 'animals-kq1-c3',
        text: 'ヘビやカエルなどの**変温動物**は、寒くなると体温も下がって動けなくなるので、土の中などでじっとして冬をこします（**冬眠**）。鳥類やホニュウ類は、体温をほぼ一定に保てます。',
        figure: hibernateScene(),
      },
    ],
    warmup: choice({
      id: 'animals-kq1-w1', concept: 'an-traits',
      prompt: '予想しよう。ウミガメは、一生の大部分を海でくらします。ウミガメは、卵をどこにうむと思う？',
      options: ['海の底', '海岸の砂浜', '川の中'],
      answer: 'b',
      explanation: 'ウミガメはハチュウ類なので、陸上の砂浜に上がって、殻のある卵をうみます。なかまの特徴が、くらし方とどうつながるかを、このステージで考えよう。',
      hint: 'カメはどのなかまだったかな。そのなかまの卵には殻があるね。',
    }),
    problems: [
      fill({
        id: 'animals-kq1-t1', concept: 'an-traits', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '子から親になるとき、体のつくりや生活のしかたが大きく変わることを[b1]という。',
        blanks: [word('b1', ['脱皮', '変態', '胎生'], '変態')],
        explanation: 'おたまじゃくし（幼生）がカエル（成体）になるように、体のつくりやくらし方が大きく変わることを**変態**といいます。',
        hint: 'おたまじゃくしがカエルに変わるときの言葉だよ。',
      }),
      drag({
        id: 'animals-kq1-p1', concept: 'an-traits',
        prompt: '表は、呼吸のしかたで動物を分けるものです。「イモリ」のカードを、当てはまる列へ動かして入れよう。',
        // イモリ（両生類）: 子はえら・親は肺と皮ふ → カードの左上 (122, 130)。不正解例は 一生肺呼吸 (218, 130)
        figure: breathBoardScene('イモリ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 122, y: 130 },
        samples: { correct: { x: 122, y: 130 }, wrong: { x: 218, y: 130 } },
        explanation: 'イモリは両生類です。子は水中でえらと皮ふで呼吸し、親になると肺と皮ふで呼吸します。形が似ているヤモリはハチュウ類で、一生肺で呼吸します。',
        hint: 'イモリは、カエルと同じなかまだよ。',
      }),
      fill({
        id: 'animals-kq1-p2', concept: 'an-traits',
        prompt: 'イモリ・ハト・ヘビ・クジラ・フナ・ワニ・ウサギの 7 種類の動物がいます。',
        text: 'このうち、変温動物は[b1]である。',
        blanks: [number('b1', 4, 0, '種類')],
        explanation: '変温動物は、イモリ（両生類）・ヘビ（ハチュウ類）・フナ（魚類）・ワニ（ハチュウ類）の 4 種類です。ハト（鳥類）とクジラ・ウサギ（ホニュウ類）は恒温動物です。',
        hint: '魚類・両生類・ハチュウ類のなかまを数えよう。',
      }),
      choice({
        id: 'animals-kq1-p3', concept: 'an-traits',
        prompt: 'ハトとカメは、どちらも殻のある卵を陸上にうみます。ハトにだけ見られることはどれ？',
        options: ['親が卵をあたためる', '卵に殻がある', '卵を陸上にうむ'],
        answer: 'a',
        explanation: '鳥類のハトは、親が卵をだいてあたため、かえった子に食べ物を運んで育てます。カメは砂の中に卵をうむと、そのままにします。',
        hint: '2 つに共通していることでは、区別できないね。',
      }),
      figureChoice({
        id: 'animals-kq1-p4', concept: 'an-traits',
        prompt: '図の ア カエル、イ ハト、ウ イヌ のうち、冬に気温が下がると体温も下がり、動けなくなって冬眠するのはどれ？',
        figure: KQ_WINTER_Q,
        answer: 'r1',
        explanation: 'カエルは変温動物なので、寒くなると体温が下がって動けなくなり、土の中などで冬眠します。ハトとイヌは恒温動物で、冬も体温をほぼ一定に保てます。',
        hint: '体温がまわりの温度で変わるなかまはどれかな。',
      }),
      choice({
        id: 'animals-kq1-p5', concept: 'an-groups',
        prompt: 'クジラは海を泳ぎ、魚に似た形をしていますが、ホニュウ類です。そう分けられる理由の組み合わせはどれ？',
        options: ['肺で呼吸し、胎生である', 'えらで呼吸し、胎生である', '肺で呼吸し、卵生である'],
        answer: 'a',
        explanation: 'クジラは肺で呼吸し、子を体内で育ててからうみ（胎生）、乳で育てます。だから、すむ場所や形が魚に似ていても、ホニュウ類です。',
        hint: 'クジラが、ときどき海面で息つぎをすることを思い出そう。',
      }),
    ],
    retryPool: [
      drag({
        id: 'animals-kq1-r1', concept: 'an-traits',
        prompt: '表は、呼吸のしかたで動物を分けるものです。「イルカ」のカードを、当てはまる列へ動かして入れよう。',
        // イルカ（ホニュウ類）: 一生肺呼吸 → カードの左上 (218, 130)。不正解例は 一生えら呼吸 (26, 130)
        figure: breathBoardScene('イルカ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 218, y: 130 },
        samples: { correct: { x: 218, y: 130 }, wrong: { x: 26, y: 130 } },
        explanation: 'イルカは水中でくらしますが、ホニュウ類なので一生肺で呼吸します。そのため、ときどき水面に出て空気を吸います。',
        hint: 'イルカは、クジラと同じなかまだよ。',
      }),
      fill({
        id: 'animals-kq1-r2', concept: 'an-groups',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'ダチョウは空を飛べないが、体が[b1]でおおわれ、殻のある卵をうむので、鳥類に分けられる。',
        blanks: [word('b1', ['羽毛', 'うろこ', '毛'], '羽毛')],
        explanation: 'ダチョウは飛べませんが、体が羽毛でおおわれ、殻のある卵をうむ鳥類です。飛ぶかどうかではなく、体の特徴でなかまを決めます。',
        hint: '鳥類の体の表面は、何でおおわれているかな。',
      }),
      choice({
        id: 'animals-kq1-r3', concept: 'an-groups',
        prompt: 'ヤモリとイモリは、形がよく似ています。ヤモリがハチュウ類だと分かる特徴はどれ？',
        options: ['体がかたいうろこでおおわれている', '皮ふがいつもしめっている', '子が水中でえら呼吸をする'],
        answer: 'a',
        explanation: 'ヤモリは体がかたいうろこでおおわれ、陸上に殻のある卵をうむハチュウ類です。皮ふがしめっていて、子が水中でえら呼吸をするのは、両生類のイモリです。',
        hint: 'トカゲやヘビの体の表面と同じだよ。',
      }),
      choice({
        id: 'animals-kq1-t2', concept: 'an-traits', term: true,
        prompt: '次の説明に合う言葉はどれ？「おたまじゃくしのように、親とは体のつくりやくらし方がちがう、親になる前の時期の子」',
        options: ['幼生', '成体', '胎児'],
        answer: 'a',
        explanation: '親とは体のつくりやくらし方がちがう、親になる前の子を**幼生**といいます。親になったものは成体といいます。',
        hint: '「幼い」という字が入る言葉だよ。',
      }),
      fill({
        id: 'animals-kq1-r4', concept: 'an-groups',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '魚類・両生類・ハチュウ類の順に比べると、体のつくりは[b1]でくらすのに合ったものへと変わっている。',
        blanks: [word('b1', ['水中', '陸上', '空中'], '陸上')],
        explanation: '魚類は水中、両生類は水中と陸上、ハチュウ類は陸上でくらします。かわきに強い体や殻のある卵など、陸上でくらすのに合う特徴がふえています。',
        hint: '殻のある卵は、どこでうむのに役立つかな。',
      }),
    ],
  };

  // 消化管の長さのちがい（イメージ。数値は書かない）（解説用）
  function gutScene() {
    return scene([
      { type: 'text', x: 160, y: 36, text: '体の大きさのわりの、消化管の長さ', size: 13, anchor: 'middle' },
      { type: 'text', x: 106, y: 94, text: 'ライオン', size: 13, anchor: 'end' },
      { type: 'rect', x: 116, y: 74, width: 56, height: 28, fill: 'pink' },
      { type: 'text', x: 106, y: 154, text: 'シマウマ', size: 13, anchor: 'end' },
      { type: 'rect', x: 116, y: 134, width: 190, height: 28, fill: 'pink' },
      { type: 'text', x: 160, y: 204, text: '植物を食べる動物ほど長い', size: 13, anchor: 'middle' },
    ]);
  }

  // かぎ爪とひづめ（解説用）
  function footScene() {
    return scene([
      { type: 'ellipse', x: 86, y: 104, rx: 46, ry: 28, fill: 'brown' },
      { type: 'polygon', points: [[44, 116], [30, 138], [52, 126]], fill: 'ink' },
      { type: 'polygon', points: [[70, 128], [60, 152], [80, 134]], fill: 'ink' },
      { type: 'polygon', points: [[100, 128], [94, 152], [112, 132]], fill: 'ink' },
      { type: 'polygon', points: [[124, 116], [130, 140], [136, 112]], fill: 'ink' },
      { type: 'rect', x: 220, y: 40, width: 32, height: 90, fill: 'gray' },
      { type: 'polygon', points: [[214, 130], [258, 130], [266, 160], [206, 160]], fill: 'ink' },
      { type: 'text', x: 86, y: 196, text: 'かぎ爪（ライオン）', size: 13, anchor: 'middle' },
      { type: 'text', x: 236, y: 196, text: 'ひづめ（シマウマ）', size: 13, anchor: 'middle' },
    ]);
  }

  // 肉食動物の上あごの歯を横から見た図（左が前）。ア 前歯、イ 長くとがった歯、ウ 奥のぎざぎざの歯
  const KQ_TEETH_Q = scene([
    { type: 'text', x: 160, y: 36, text: '肉食動物の上あごの歯（左が前）', size: 13, anchor: 'middle' },
    { type: 'rect', x: 26, y: 80, width: 270, height: 40, fill: 'white', rx: 10 },
  ].concat(
    [36, 48, 60].map(x => ({ type: 'polygon', points: [[x, 120], [x + 10, 120], [x + 5, 136]], fill: 'white' })),
    [{ type: 'polygon', points: [[84, 120], [106, 120], [95, 172]], fill: 'white' }],
    [150, 176, 202, 228, 254].map(x => ({ type: 'polygon', points: [[x, 120], [x + 26, 120], [x + 13, 148]], fill: 'white' })),
    regionsRow([44, 100, 215], 200),
  ));

  // drag 用: 上から見た頭（上が前）。左の目の位置の候補を点線の丸で示す（前寄り (138, 74)・横 (102, 130)）
  function headTopScene(name) {
    return scene([
      { type: 'text', x: 160, y: 24, text: name + 'の頭を上から見たようす', size: 13, anchor: 'middle' },
      { type: 'line', points: [[160, 54], [160, 34]], color: 'gray', width: 2, arrow: true },
      { type: 'text', x: 170, y: 46, text: '前', size: 12 },
      { type: 'ellipse', x: 160, y: 140, rx: 60, ry: 84, fill: 'sand' },
      { type: 'circle', x: 138, y: 74, r: 12, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 102, y: 130, r: 12, fill: 'none', stroke: 'gray' },
      { type: 'circle', id: 'eye', x: 270, y: 200, r: 11, fill: 'ink', stroke: 'ink' },
      { type: 'text', x: 270, y: 180, text: '目', size: 12, anchor: 'middle' },
    ]);
  }

  // ---- ステージ animals-kq2: クイズ 2（体のつくりと食べ物: 歯・あしの先・目のつき方・消化管） ----
  const anKq2 = {
    id: 'animals-kq2', areaId: 'vertebrate', free: true, title: 'クイズ 2: 体のつくりと食べ物', minutes: 6, concepts: ['an-classify'],
    lessons: [
      {
        id: 'animals-kq2-c1',
        text: '草食動物の消化管は、体の大きさのわりに、肉食動物より長くなっています。植物はかたくて消化しにくいので、長い消化管で時間をかけて消化・吸収します。',
        figure: gutScene(),
      },
      {
        id: 'animals-kq2-c2',
        text: 'あしの先も食べ物に合っています。肉食動物のライオンは、するどく曲がった**かぎ爪**でえものをおさえます。草食動物のシマウマは、かたい**ひづめ**で長い距離を走り、敵からにげます。',
        figure: footScene(),
      },
    ],
    warmup: choice({
      id: 'animals-kq2-w1', concept: 'an-classify',
      prompt: '予想しよう。ある動物の歯を調べると、前歯が長くのび、奥の歯は平らで大きくなっていました。この動物がおもに食べるものは何だと思う？',
      options: ['草や木の葉', 'ほかの動物の肉', '小さな魚'],
      answer: 'a',
      explanation: '平らで大きな奥歯は、草をすりつぶすのに向いています。ウサギやシマウマのような草食動物の歯です。体のつくりと食べ物の関係を、このステージで確かめよう。',
      hint: '平らな歯は、すりつぶすのに向いているよ。',
    }),
    problems: [
      fill({
        id: 'animals-kq2-t1', concept: 'an-classify', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ライオンのあしの先にある、するどく曲がったつめを[b1]という。',
        blanks: [word('b1', ['ひづめ', 'かぎ爪', '犬歯'], 'かぎ爪')],
        explanation: 'ライオンなどの肉食動物は、するどく曲がった**かぎ爪**で、えものをしっかりおさえます。',
        hint: 'かぎのように曲がっている、と考えよう。',
      }),
      figureChoice({
        id: 'animals-kq2-p1', concept: 'an-classify',
        prompt: '図は肉食動物の上あごの歯です。ア 前歯、イ 長くとがった歯、ウ 奥のぎざぎざの歯。えものにかみついてしとめるのに使う歯はどれ？',
        figure: KQ_TEETH_Q,
        answer: 'r2',
        explanation: 'イの長くとがった歯は犬歯です。肉食動物では犬歯が大きく発達していて、えものにかみついてしとめるのに使います。',
        hint: 'いちばん長くとがった歯だよ。',
      }),
      fill({
        id: 'animals-kq2-p2', concept: 'an-classify',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'シマウマのあしの先は、かたい[b1]になっていて、長い距離を走って敵からにげるのに役立つ。',
        blanks: [word('b1', ['ひづめ', 'かぎ爪', '水かき'], 'ひづめ')],
        explanation: 'シマウマやウマなどの草食動物のあしの先は、かたいひづめになっていて、長い距離を走るのに向いています。',
        hint: 'ウマのあしの先と同じつくりだよ。',
      }),
      choice({
        id: 'animals-kq2-p3', concept: 'an-classify',
        prompt: '草食動物の消化管が、体の大きさのわりに肉食動物より長いのはなぜ？',
        options: ['植物は消化しにくく、時間がかかるから', '肉より植物のほうが量が少ないから', '速く走れるようにするため'],
        answer: 'a',
        explanation: '植物はかたい部分が多く、消化しにくい食べ物です。そのため、草食動物は長い消化管で時間をかけて消化・吸収します。',
        hint: '肉と植物では、どちらが消化しにくいかな。',
      }),
      drag({
        id: 'animals-kq2-p4', concept: 'an-classify',
        prompt: '図はシマウマの頭を上から見たようすです。黒い丸（目）を、シマウマの左の目がある位置の点線の丸へ動かそう。',
        // 草食動物の目は顔の横 → (102, 130)。不正解例は前寄りの (138, 74)（約 66 px はなれる）
        figure: headTopScene('シマウマ'),
        draggable: { itemId: 'eye', axis: 'xy' },
        target: { x: 102, y: 130 },
        samples: { correct: { x: 102, y: 130 }, wrong: { x: 138, y: 74 } },
        explanation: 'シマウマの目は顔の横についているので、まわりの広い範囲を見わたせます。草を食べている間も、近づく敵に気づきやすくなります。',
        hint: '敵を早く見つけるには、どんな目のつき方がよいかな。',
      }),
      fill({
        id: 'animals-kq2-p5', concept: 'an-classify',
        prompt: 'シマウマ・ライオン・ウサギ・オオカミ・キリン・トラ・ウシの 7 種類の動物がいます。',
        text: 'このうち、草食動物は[b1]である。',
        blanks: [number('b1', 4, 0, '種類')],
        explanation: '草食動物は、シマウマ・ウサギ・キリン・ウシの 4 種類です。ライオン・オオカミ・トラは、ほかの動物を食べる肉食動物です。',
        hint: 'おもに植物を食べる動物を数えよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'animals-kq2-r1', concept: 'an-classify',
        prompt: '図は肉食動物の上あごの歯です。ア 前歯、イ 長くとがった歯、ウ 奥のぎざぎざの歯。肉をかみ切ったり、骨をくだいたりする奥の歯はどれ？',
        figure: KQ_TEETH_Q,
        answer: 'r3',
        explanation: 'ウは臼歯です。肉食動物の臼歯は、するどくとがっていて、肉をかみ切ったり骨をくだいたりするのに向いています。草食動物の臼歯は平らです。',
        hint: '口のいちばん奥にならんでいる歯だよ。',
      }),
      drag({
        id: 'animals-kq2-r2', concept: 'an-classify',
        prompt: '図はライオンの頭を上から見たようすです。黒い丸（目）を、ライオンの左の目がある位置の点線の丸へ動かそう。',
        // 肉食動物の目は顔の前向き → (138, 74)。不正解例は横の (102, 130)
        figure: headTopScene('ライオン'),
        draggable: { itemId: 'eye', axis: 'xy' },
        target: { x: 138, y: 74 },
        samples: { correct: { x: 138, y: 74 }, wrong: { x: 102, y: 130 } },
        explanation: 'ライオンの目は顔の前についていて、両方の目で同じ所を見る範囲が広くなります。そのため、えものまでの距離をつかみやすくなります。',
        hint: 'えものとの距離をはかるには、両目で前を見るとよいね。',
      }),
      choice({
        id: 'animals-kq2-r3', concept: 'an-classify',
        prompt: 'ある動物の頭の骨を調べると、犬歯が長くとがり、目が顔の前についていました。この動物の食べ物として考えられるのはどれ？',
        options: ['ほかの動物', '草や木の葉', '木の実だけ'],
        answer: 'a',
        explanation: '長くとがった犬歯と、前向きの目は、えものをとらえる肉食動物の特徴です。体のつくりから、食べ物を考えることができます。',
        hint: '犬歯は、何をするのに使う歯だったかな。',
      }),
      choice({
        id: 'animals-kq2-t2', concept: 'an-classify', term: true,
        prompt: '次の説明に合う言葉はどれ？「草食動物で発達している、草をかみ切るのに使う前歯」',
        options: ['門歯', '犬歯', '臼歯'],
        answer: 'a',
        explanation: '前にならぶ、草などをかみ切る歯を**門歯**といいます。草食動物は門歯で草をかみ切り、臼歯ですりつぶします。',
        hint: '口の入り口（門）にある歯だよ。',
      }),
      fill({
        id: 'animals-kq2-r4', concept: 'an-classify',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'ライオンのような肉食動物の消化管は、体の大きさのわりに、草食動物と比べて[b1]。',
        blanks: [word('b1', ['短い', '長い', '同じ'], '短い')],
        explanation: '肉は植物より消化しやすいので、肉食動物の消化管は草食動物より短くなっています。',
        hint: '消化しやすい食べ物なら、消化管は長くなくてもよいね。',
      }),
    ],
  };

  // 脱皮のようす（解説用）
  function moltScene() {
    return scene([
      { type: 'ellipse', x: 66, y: 120, rx: 44, ry: 24, fill: 'sand' },
      { type: 'text', x: 66, y: 170, text: '外骨格は', size: 12, anchor: 'middle' },
      { type: 'text', x: 66, y: 188, text: '大きくならない', size: 12, anchor: 'middle' },
      { type: 'arrow', x1: 120, y1: 120, x2: 168, y2: 120, color: 'blue' },
      { type: 'text', x: 144, y: 108, text: '脱皮', size: 14, anchor: 'middle', bold: true },
      { type: 'ellipse', x: 234, y: 76, rx: 44, ry: 24, fill: 'none', stroke: 'gray' },
      { type: 'text', x: 234, y: 44, text: 'ぬけがら', size: 12, anchor: 'middle' },
      { type: 'ellipse', x: 240, y: 150, rx: 58, ry: 30, fill: 'sand' },
      { type: 'text', x: 240, y: 208, text: '大きくなった体', size: 12, anchor: 'middle' },
    ]);
  }

  // 甲殻類と多足類の例（解説用）
  function crustaceanScene() {
    const items = [];
    [['甲殻類', ['エビ・カニ・ザリガニ', 'ミジンコ・ダンゴムシ', '多くは水中でえら呼吸']], ['多足類', ['ムカデ・ヤスデ', 'あしがとても多い', '体の節も多い']]]
      .forEach(([t, lines], i) => {
        const x = 14 + 154 * i;
        items.push(
          { type: 'rect', x, y: 24, width: 138, height: 196, fill: i ? 'white' : 'sky', rx: 8 },
          { type: 'text', x: x + 69, y: 56, text: t, size: 15, anchor: 'middle', bold: true },
        );
        lines.forEach((s, k) => items.push({ type: 'text', x: x + 69, y: 100 + 36 * k, text: s, size: 12, anchor: 'middle' }));
      });
    return scene(items);
  }

  // drag 用: 節足動物を 3 つのなかまに分ける表（列の中心・カードの位置は breathBoardScene と同じ）
  function arthropodBoardScene(name) {
    return scene([
      { type: 'text', x: 210, y: 26, text: '節足動物を分ける', size: 13, anchor: 'middle' },
      { type: 'text', x: 66, y: 58, text: '昆虫類', size: 13, anchor: 'middle' },
      { type: 'text', x: 66, y: 74, text: 'あし 6 本', size: 12, anchor: 'middle' },
      { type: 'text', x: 162, y: 58, text: '甲殻類', size: 13, anchor: 'middle' },
      { type: 'text', x: 162, y: 74, text: '多くは水中', size: 12, anchor: 'middle' },
      { type: 'text', x: 258, y: 58, text: 'クモ類', size: 13, anchor: 'middle' },
      { type: 'text', x: 258, y: 74, text: 'あし 8 本', size: 12, anchor: 'middle' },
      { type: 'rect', x: 18, y: 80, width: 96, height: 130, fill: 'white' },
      { type: 'rect', x: 114, y: 80, width: 96, height: 130, fill: 'white' },
      { type: 'rect', x: 210, y: 80, width: 96, height: 130, fill: 'white' },
      { type: 'rect', id: 'card', x: 8, y: 8, width: 80, height: 30, fill: 'yellow', rx: 4, label: name },
    ]);
  }

  // アサリの殻を開いたようす（名前は書かない）。ア 殻のふち、イ 殻の内側の大きな膜、ウ 殻の外へのびる部分
  const KQ_CLAM_Q = scene([
    { type: 'ellipse', x: 170, y: 116, rx: 120, ry: 76, fill: 'glass' },
    { type: 'ellipse', x: 170, y: 116, rx: 102, ry: 60, fill: 'pink' },
    { type: 'line', points: [[120, 96], [220, 96]], color: 'line', width: 2 },
    { type: 'line', points: [[118, 108], [222, 108]], color: 'line', width: 2 },
    { type: 'line', points: [[120, 120], [220, 120]], color: 'line', width: 2 },
    { type: 'polygon', points: [[84, 150], [40, 196], [72, 210], [112, 166]], fill: 'yellow' },
    leader(60, 52, 76, 64), { type: 'region', id: 'r1', x: 40, y: 34, r: 22, label: 'ア' },
    leader(270, 196, 248, 152), { type: 'region', id: 'r2', x: 290, y: 214, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 66, y: 184, r: 22, label: 'ウ' },
  ]);

  // ---- ステージ animals-kq3: クイズ 3（無セキツイ動物を考える: 外骨格と脱皮・甲殻類と多足類・軟体動物のつくり） ----
  const anKq3 = {
    id: 'animals-kq3', areaId: 'invertebrate', free: true, title: 'クイズ 3: 無セキツイ動物の体を考える', minutes: 6, concepts: ['an-arthropod', 'an-mollusc'],
    lessons: [
      {
        id: 'animals-kq3-c1',
        text: '節足動物の外骨格は、体を支え、中を守り、体の水分がにげるのも防ぎます。けれども外骨格は大きくならないので、成長するときは**脱皮**をくり返します。',
        figure: moltScene(),
      },
      {
        id: 'animals-kq3-c2',
        text: 'エビやカニなどの**甲殻類**は、多くが水中にすみ、えらで呼吸します。ミジンコやダンゴムシも甲殻類です。ムカデやヤスデのように、あしがとても多いなかまを**多足類**といいます。',
        figure: crustaceanScene(),
      },
      {
        id: 'animals-kq3-c3',
        text: 'アサリは、殻の間からのばした筋肉でできた**あし**をのび縮みさせて、砂にもぐります。イカやタコは外から見える貝殻がありませんが、内臓が外とう膜に包まれた軟体動物です。',
        figure: clamScene(),
      },
    ],
    warmup: choice({
      id: 'animals-kq3-w1', concept: 'an-arthropod',
      prompt: '予想しよう。夏に木の幹で見つかるセミのぬけがらは、何が残ったものだと思う？',
      options: ['古い外骨格', 'セミの骨', 'セミの卵の殻'],
      answer: 'a',
      explanation: 'セミのぬけがらは、脱皮でぬいだ古い外骨格です。節足動物は、成長するときに外骨格をぬぎかえます。このステージで、そのわけを考えよう。',
      hint: '節足動物の体の外側をおおっている、かたいものだよ。',
    }),
    problems: [
      fill({
        id: 'animals-kq3-t1', concept: 'an-arthropod', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ムカデやヤスデのように、体の節が多く、あしがとても多い節足動物のなかまを[b1]という。',
        blanks: [word('b1', ['多足類', '甲殻類', '昆虫類'], '多足類')],
        explanation: 'ムカデやヤスデは**多足類**です。節足動物は、昆虫類・甲殻類・クモ類・多足類などに分けられます。',
        hint: '「あしが多い」なかま、という名前だよ。',
      }),
      choice({
        id: 'animals-kq3-p1', concept: 'an-arthropod',
        prompt: 'カニやエビが、成長するときに脱皮をくり返すのはなぜ？',
        options: ['外骨格が大きくならないから', '体の色を変えてかくれるため', '殻に空気をためるため'],
        answer: 'a',
        explanation: 'かたい外骨格は大きくならないので、中の体が大きくなるには、古い外骨格をぬいで、新しい大きな外骨格をつくる必要があります。',
        hint: 'かたい殻の中で、体が大きくなろうとすると…。',
      }),
      figureChoice({
        id: 'animals-kq3-p2', concept: 'an-mollusc',
        prompt: '図はアサリの殻を開いたようすです。ア 殻のふち、イ 殻の内側の大きな膜、ウ 殻の外へのびる部分。砂にもぐるときにのび縮みさせる部分はどれ？',
        figure: KQ_CLAM_Q,
        answer: 'r3',
        explanation: 'ウはアサリのあしです。筋肉でできていて、のび縮みさせて砂の中にもぐります。イは内臓を包む外とう膜です。',
        hint: '殻の外へ出して動かす部分だよ。',
      }),
      drag({
        id: 'animals-kq3-p3', concept: 'an-arthropod',
        prompt: '表は節足動物を 3 つのなかまに分けるものです。「ミジンコ」のカードを、当てはまる列へ動かして入れよう。',
        // ミジンコ（甲殻類）→ カードの左上 (122, 130)。不正解例は 昆虫類 (26, 130)
        figure: arthropodBoardScene('ミジンコ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 122, y: 130 },
        samples: { correct: { x: 122, y: 130 }, wrong: { x: 26, y: 130 } },
        explanation: 'ミジンコは、池や田んぼの水中にすむ小さな甲殻類です。エビやカニと同じなかまです。',
        hint: '水中にすむ、小さなエビやカニのなかまだよ。',
      }),
      fill({
        id: 'animals-kq3-p4', concept: 'an-arthropod',
        prompt: 'カニの頭胸部からは、はさみをふくめて、左右に 5 本ずつあしが出ています。',
        text: 'カニのあしは、はさみもふくめて全部で[b1]ある。',
        blanks: [number('b1', 10, 0, '本')],
        explanation: '左右に 5 本ずつなので、5 × 2 ＝ 10 本です。昆虫の 6 本、クモの 8 本とちがうので、なかまを見分ける手がかりになります。',
        hint: '左右の数を足そう。',
      }),
      choice({
        id: 'animals-kq3-p5', concept: 'an-mollusc',
        prompt: 'イカには、アサリのような外から見える貝殻がありません。それでもアサリと同じ軟体動物に分けられるのはなぜ？',
        options: ['内臓が外とう膜に包まれ、節がないから', '水中にすみ、えらで呼吸するから', '背骨がないから'],
        answer: 'a',
        explanation: 'イカもアサリも、内臓が外とう膜に包まれ、体やあしに節がありません。水中にすむことや背骨がないことは、魚やカニにも当てはまるので決め手になりません。',
        hint: 'ほかのなかまには当てはまらない特徴を選ぼう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'animals-kq3-r1', concept: 'an-arthropod',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'あしが 8 本あり、体が頭胸部と腹部の 2 つに分かれている節足動物は、[b1]のなかまである。',
        blanks: [word('b1', ['クモ類', '昆虫類', '甲殻類'], 'クモ類')],
        explanation: 'あしが 8 本で、体が頭胸部と腹部に分かれているのはクモ類です。昆虫類はあしが 6 本で、体が頭部・胸部・腹部に分かれています。',
        hint: 'あしが 6 本ではないので、昆虫ではないね。',
      }),
      drag({
        id: 'animals-kq3-r2', concept: 'an-arthropod',
        prompt: '表は節足動物を 3 つのなかまに分けるものです。「サソリ」のカードを、当てはまる列へ動かして入れよう。',
        // サソリ（クモ類。あし 8 本）→ カードの左上 (218, 130)。不正解例は 甲殻類 (122, 130)
        figure: arthropodBoardScene('サソリ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 218, y: 130 },
        samples: { correct: { x: 218, y: 130 }, wrong: { x: 122, y: 130 } },
        explanation: 'サソリは、はさみのように見える部分をもちますが、歩くためのあしは 8 本で、クモと同じクモ類です。',
        hint: '歩くためのあしの数で考えよう。',
      }),
      figureChoice({
        id: 'animals-kq3-r3', concept: 'an-mollusc',
        prompt: '図はアサリの殻を開いたようすです。ア 殻のふち、イ 殻の内側の大きな膜、ウ 殻の外へのびる部分。内臓を包んでいる膜はどれ？',
        figure: KQ_CLAM_Q,
        answer: 'r2',
        explanation: 'イは外とう膜です。軟体動物は、内臓が外とう膜で包まれています。ウのあしは、砂にもぐるときに使います。',
        hint: '殻のすぐ内側に広がっている部分だよ。',
      }),
      fill({
        id: 'animals-kq3-r4', concept: 'an-mollusc',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '流氷の海で見られるクリオネは、貝殻をもたない巻き貝のなかまで、[b1]に分けられる。',
        blanks: [word('b1', ['軟体動物', '節足動物', 'セキツイ動物'], '軟体動物')],
        explanation: 'クリオネは、成長すると貝殻がなくなる巻き貝のなかまで、軟体動物です。見た目ではなく、体のつくりでなかまを決めます。',
        hint: '巻き貝やイカ、タコのなかまだよ。',
      }),
      choice({
        id: 'animals-kq3-t2', concept: 'an-mollusc', term: true,
        prompt: '次の説明に合う言葉はどれ？「アサリやサザエなどで、外とう膜の外側にあって体を守る、かたいもの」',
        options: ['貝殻', '外骨格', 'うろこ'],
        answer: 'a',
        explanation: 'アサリやサザエの体は、かたい**貝殻**で守られています。外骨格は節足動物、うろこは魚類やハチュウ類のものです。',
        hint: '海岸で拾えるものだよ。',
      }),
      choice({
        id: 'animals-kq3-r5', concept: 'an-arthropod',
        prompt: '陸上でくらすバッタにとって、外骨格が役立っている点はどれ？',
        options: ['体の水分がにげにくい', '体温をいつも一定に保てる', '水中でも呼吸できる'],
        answer: 'a',
        explanation: '外骨格は、体を支えて中を守るだけでなく、体の水分がにげるのを防ぎます。かわきやすい陸上でくらすのに役立っています。',
        hint: '陸上は水中よりかわきやすいね。',
      }),
    ],
  };

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'animals',
    title: '動物のなかま',
    mascot: 'F',   // 担当の先生（まめ博士。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'vertebrate', title: 'セキツイ動物', order: 1, stages: [animals1, animals2, anMp1, anDr1, anKq1, anKq2] },
      { id: 'invertebrate', title: '無セキツイ動物', order: 2, stages: [animals3, animals4, anMp2, anDr2, anKq3] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
