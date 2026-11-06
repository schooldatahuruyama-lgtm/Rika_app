// 「自然と人間」教材データ（中学3年 理科）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通指示 .ai-tasks/20261104-170000_単元教材の共通指示.md）。
// 2 領域 × 2 ステージ（生態系・人間と環境）と、概念 4 つ（id は単元の接頭辞 na- を付けて全単元で一意にする）。
// 領域 3「ミニプリント」（na-miniprint）: 先生のミニプリントの問題を書き直したステージ nature-mp1〜nature-mp3（.ai-tasks/20261106-130000_ミニプリント反映_共通.md）。
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
  function number(id, answer, tolerance, unit) { return { id, kind: 'number', answer, tolerance, unit }; }

  // ---- 写真ふうの画像の上に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----

  // 画像（場面いっぱい）。src は assets/images/nature/<カード id>.jpg
  function photo(id) { return { type: 'image', src: 'assets/images/nature/' + id + '.jpg' }; }
  // 写真の上の引き出し線（濃い実線）
  function pin(x1, y1, x2, y2) { return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 }; }
  // 写真の上の矢印（食べられる → 食べる）
  function eat(x1, y1, x2, y2) { return { type: 'arrow', x1, y1, x2, y2, width: 2 }; }
  // 白い下地つきの文字。o で size・anchor・bold・color を上書きする（size の既定 14）
  function tag(x, y, text, o) { return Object.assign({ type: 'text', x, y, text, size: 14, bg: true }, o); }

  // ---- 生物の図の部品（どれも (cx, cy) が中心あたり。横は cx±24 に収まる） ----

  // イネ（3 本の茎と穂）
  function rice(cx, cy) {
    return [
      { type: 'line', points: [[cx - 10, cy + 20], [cx - 14, cy - 12]], color: 'green', width: 3 },
      { type: 'line', points: [[cx, cy + 20], [cx, cy - 16]], color: 'green', width: 3 },
      { type: 'line', points: [[cx + 10, cy + 20], [cx + 14, cy - 12]], color: 'green', width: 3 },
      { type: 'ellipse', x: cx - 15, y: cy - 16, rx: 4, ry: 6, fill: 'yellow' },
      { type: 'ellipse', x: cx, y: cy - 20, rx: 4, ry: 6, fill: 'yellow' },
      { type: 'ellipse', x: cx + 15, y: cy - 16, rx: 4, ry: 6, fill: 'yellow' },
    ];
  }

  // バッタ（横から。左向き）
  function grasshopper(cx, cy) {
    return [
      { type: 'line', points: [[cx - 20, cy - 6], [cx - 24, cy - 20]], width: 2 },
      { type: 'line', points: [[cx + 2, cy + 2], [cx + 12, cy - 12], [cx + 22, cy + 10]], color: 'green', width: 3 },
      { type: 'line', points: [[cx - 8, cy + 4], [cx - 12, cy + 14]], color: 'green', width: 2 },
      { type: 'ellipse', x: cx + 2, y: cy, rx: 18, ry: 6, fill: 'lightgreen' },
      { type: 'circle', x: cx - 18, y: cy - 2, r: 6, fill: 'lightgreen' },
      { type: 'circle', x: cx - 20, y: cy - 3, r: 2, fill: 'ink' },
    ];
  }

  // カエル（正面に近い形。倍率 0.6）
  function frog(cx, cy) {
    const k = v => v * 0.6;
    return [
      { type: 'line', points: [[cx - k(20), cy + k(6)], [cx - k(36), cy + k(16)], [cx - k(26), cy + k(22)]], color: 'green', width: 3 },
      { type: 'line', points: [[cx + k(20), cy + k(6)], [cx + k(36), cy + k(16)], [cx + k(26), cy + k(22)]], color: 'green', width: 3 },
      { type: 'ellipse', x: cx, y: cy, rx: k(26), ry: k(16), fill: 'green' },
      { type: 'circle', x: cx - k(12), y: cy - k(16), r: 4, fill: 'green' },
      { type: 'circle', x: cx + k(12), y: cy - k(16), r: 4, fill: 'green' },
      { type: 'circle', x: cx - k(12), y: cy - k(16), r: 1.5, fill: 'ink' },
      { type: 'circle', x: cx + k(12), y: cy - k(16), r: 1.5, fill: 'ink' },
    ];
  }

  // ヘビ（くねった体。頭は左）
  function snake(cx, cy) {
    return [
      { type: 'line', points: [[cx + 22, cy + 10], [cx + 10, cy - 2], [cx - 2, cy + 10], [cx - 12, cy - 2]], color: 'brown', width: 6 },
      { type: 'ellipse', x: cx - 16, y: cy - 6, rx: 8, ry: 6, fill: 'brown' },
      { type: 'circle', x: cx - 18, y: cy - 8, r: 2, fill: 'ink' },
    ];
  }

  // イネ → バッタ → カエル → ヘビ の食物連鎖（生物の中心は x = 40・120・200・280、y = 112）
  const CHAIN_X = [40, 120, 200, 280];
  function chainRow() {
    const y = 112;
    const items = [].concat(rice(CHAIN_X[0], y), grasshopper(CHAIN_X[1], y), frog(CHAIN_X[2], y), snake(CHAIN_X[3], y));
    [0, 1, 2].forEach(i => items.push({ type: 'arrow', x1: CHAIN_X[i] + 26, y1: y, x2: CHAIN_X[i + 1] - 26, y2: y }));
    ['イネ', 'バッタ', 'カエル', 'ヘビ'].forEach((name, i) => items.push({ type: 'text', x: CHAIN_X[i], y: 162, text: name, anchor: 'middle', size: 14 }));
    return items;
  }

  // 生物の数量のピラミッド（上の段 y 30〜90、まん中 90〜150、下の段 150〜210。段のまん中は x = 160、y = 60・120・180）
  function pyramid() {
    return [
      { type: 'polygon', points: [[80, 150], [240, 150], [280, 210], [40, 210]], fill: 'green' },
      { type: 'polygon', points: [[120, 90], [200, 90], [240, 150], [80, 150]], fill: 'yellow' },
      { type: 'polygon', points: [[160, 30], [200, 90], [120, 90]], fill: 'orange' },
    ];
  }
  const TIER_Y = [60, 120, 180];   // 上（肉食動物）・まん中（草食動物）・下（植物）の段のまん中

  // drag 用: ピラミッドの右に段の名前、段のまん中の点、動かす印（x = 160 の線の上を上下に動く）
  function pyramidDrag() {
    return scene(pyramid().concat([
      { type: 'text', x: 194, y: 64, text: '肉食動物', size: 13 },
      { type: 'text', x: 232, y: 124, text: '草食動物', size: 13 },
      { type: 'text', x: 272, y: 184, text: '植物', size: 13 },
      { type: 'line', points: [[160, 24], [160, 232]], color: 'gray', width: 1, dashed: true },
      ...TIER_Y.map(y => ({ type: 'circle', x: 160, y, r: 4, fill: 'ink', stroke: 'none' })),
      { type: 'circle', id: 'mark', x: 160, y: 226, r: 11, fill: 'blue', stroke: 'ink' },
    ]));
  }

  // 炭素の循環（大気・植物・動物・分解者と、大気との間の 4 本の矢印）。
  // 縦の矢印の x: 30（大気→植物）、84（植物→大気）、160（動物→大気）、264（分解者→大気）
  function carbonCycle() {
    return [
      { type: 'rect', x: 10, y: 12, width: 300, height: 40, rx: 12, fill: 'sky', stroke: 'line' },
      { type: 'text', x: 160, y: 38, text: '大気中の二酸化炭素', anchor: 'middle', size: 14 },
      { type: 'rect', x: 12, y: 170, width: 88, height: 36, fill: 'lightgreen' },
      { type: 'text', x: 56, y: 193, text: '植物', anchor: 'middle', size: 14 },
      { type: 'rect', x: 128, y: 170, width: 64, height: 36, fill: 'pink' },
      { type: 'text', x: 160, y: 193, text: '動物', anchor: 'middle', size: 14 },
      { type: 'rect', x: 222, y: 170, width: 86, height: 36, fill: 'sand' },
      { type: 'text', x: 265, y: 193, text: '分解者', anchor: 'middle', size: 14 },
      { type: 'arrow', x1: 30, y1: 54, x2: 30, y2: 166, color: 'gray' },
      { type: 'arrow', x1: 84, y1: 168, x2: 84, y2: 56, color: 'gray' },
      { type: 'arrow', x1: 160, y1: 168, x2: 160, y2: 56, color: 'gray' },
      { type: 'arrow', x1: 264, y1: 168, x2: 264, y2: 56, color: 'gray' },
      { type: 'arrow', x1: 100, y1: 188, x2: 124, y2: 188, width: 2 },
      { type: 'arrow', x1: 192, y1: 188, x2: 218, y2: 188, width: 2 },
      { type: 'line', points: [[56, 206], [56, 228], [250, 228], [250, 210]], width: 2, arrow: true },
    ];
  }
  // 炭素の循環の図に ア〜エ の選ぶ場所を付けたもの（はたらきの名前は書かない）
  const CARBON_Q = scene(carbonCycle().concat([
    { type: 'region', id: 'r1', x: 30, y: 112, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 84, y: 112, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 160, y: 112, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 264, y: 112, r: 22, label: 'エ' },
  ]));

  // 川の 3 地点（ア・イ・ウ）で見つかった水生生物（水のよごれの程度は書かない）
  const RIVER_Q = scene([
    { type: 'rect', x: 0, y: 18, width: 320, height: 44, fill: 'water', stroke: 'none' },
    { type: 'rect', x: 4, y: 76, width: 100, height: 112, rx: 6, fill: 'white', stroke: 'line' },
    { type: 'rect', x: 110, y: 76, width: 100, height: 112, rx: 6, fill: 'white', stroke: 'line' },
    { type: 'rect', x: 216, y: 76, width: 100, height: 112, rx: 6, fill: 'white', stroke: 'line' },
    ...[
      [54, ['アメリカザリガニ', 'サカマキガイ', 'ユスリカ']],
      [160, ['カワゲラ', 'サワガニ', 'ヒラタカゲロウ']],
      [266, ['カワニナ', 'ゲンジボタル', 'コオニヤンマ']],
    ].flatMap(([x, names]) => names.map((name, i) => ({ type: 'text', x, y: 108 + i * 30, text: name, anchor: 'middle', size: 12 }))),
    { type: 'text', x: 160, y: 218, text: '地点ごとに見つかった水生生物', anchor: 'middle', size: 13 },
    { type: 'region', id: 'r1', x: 54, y: 40, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 40, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 266, y: 40, r: 22, label: 'ウ' },
  ]);

  // 放射線の通りぬけ方の図の土台（左に放射線を出す物質、紙・アルミニウム板・鉛の板）。
  // 板のまん中の x: 紙 107、アルミニウム板 180、鉛の板 250
  const PLATE_X = { paper: 107, aluminum: 180, lead: 250 };
  function radiationBase() {
    return [
      { type: 'rect', x: 8, y: 84, width: 34, height: 88, fill: 'yellow' },
      { type: 'text', x: 8, y: 196, text: '放射線を出す物質', size: 12 },
      { type: 'rect', x: 104, y: 78, width: 6, height: 98, fill: 'white' },
      { type: 'rect', x: 172, y: 78, width: 16, height: 98, fill: 'glass' },
      { type: 'rect', x: 238, y: 78, width: 24, height: 98, fill: 'gray' },
      { type: 'text', x: 107, y: 66, text: '紙', anchor: 'middle', size: 13 },
      { type: 'text', x: 180, y: 66, text: 'アルミニウム板', anchor: 'middle', size: 12 },
      { type: 'text', x: 250, y: 66, text: '鉛の板', anchor: 'middle', size: 12 },
    ];
  }
  // drag 用: 1 本の放射線の通り道（y = 128）と、左右に動かす印
  function radiationDrag(name) {
    return scene(radiationBase().concat([
      { type: 'line', points: [[42, 128], [306, 128]], color: 'gray', width: 1, dashed: true },
      { type: 'text', x: 48, y: 114, text: name, size: 13 },
      { type: 'circle', id: 'mark', x: 76, y: 128, r: 11, fill: 'blue', stroke: 'ink' },
    ]));
  }

  // ================================================================
  // 領域 1: 生態系
  // ================================================================

  // ---- ステージ nature-1: 食物連鎖と生物のつり合い ----
  const nature1 = {
    id: 'nature-1', areaId: 'na-ecosystem', title: '食物連鎖と生物のつり合い', minutes: 5, concepts: ['na-foodchain'],
    lessons: [
      {
        id: 'nature-1-c1',
        text: 'ある地域にすむ生物と、水・空気・土などの環境をひとまとまりにとらえたものを**生態系**といいます。生物どうしの「食べる・食べられる」の関係のつながりを**食物連鎖**といい、図では食べられる生物から食べる生物へ矢印をかきます。',
        // イネ → バッタ → カエル → ヘビ（写真。生物の中心は x = 40・122・202・280、y = 108〜120）
        figure: scene([
          photo('nature-1-c1'),
          tag(160, 36, '食べられる生物 → 食べる生物', { anchor: 'middle', bold: true }),
          tag(42, 174, 'イネ', { anchor: 'middle' }),
          tag(122, 174, 'バッタ', { anchor: 'middle' }),
          tag(202, 174, 'カエル', { anchor: 'middle' }),
          tag(280, 174, 'ヘビ', { anchor: 'middle' }),
          eat(62, 169, 96, 169),
          eat(148, 169, 176, 169),
          eat(228, 169, 260, 169),
          tag(160, 212, '矢印の先にいるのが、食べる生物', { anchor: 'middle', size: 13 }),
        ]),
      },
      {
        id: 'nature-1-c2',
        text: '植物は光合成で無機物から有機物をつくるので**生産者**といいます。植物を食べる草食動物や、ほかの動物を食べる肉食動物は、生産者がつくった有機物をとり入れているので**消費者**といいます。食物連鎖は網の目のようにからみ合っていて、これを**食物網**といいます。',
        // 食物網（写真。上段 ヘビ・タカ、中段 バッタ・カエル・ネズミ、下段 草・木の実）。矢印は食べられる → 食べる
        figure: scene([
          photo('nature-1-c2'),
          tag(95, 84, 'ヘビ', { anchor: 'middle', size: 13 }),
          tag(266, 44, 'タカ', { size: 13 }),
          tag(62, 162, 'バッタ', { anchor: 'middle', size: 13 }),
          tag(160, 162, 'カエル', { anchor: 'middle', size: 13 }),
          tag(262, 162, 'ネズミ', { anchor: 'middle', size: 13 }),
          tag(130, 214, '草', { size: 13 }),
          tag(262, 190, '木の実', { anchor: 'middle', size: 13 }),
          eat(100, 172, 96, 150),     // 草 → バッタ
          eat(222, 194, 236, 154),    // 木の実 → ネズミ
          eat(104, 126, 128, 126),    // バッタ → カエル
          eat(150, 104, 122, 72),     // カエル → ヘビ
          eat(232, 106, 146, 62),     // ネズミ → ヘビ
          eat(144, 40, 184, 40),      // ヘビ → タカ
          eat(258, 104, 242, 76),     // ネズミ → タカ
          tag(312, 92, '消費者', { anchor: 'end', bold: true }),
          tag(312, 230, '生産者', { anchor: 'end', bold: true }),
        ]),
      },
      {
        id: 'nature-1-c3',
        text: '食物連鎖では、ふつう食べられる生物のほうが、食べる生物よりも数量が多くなっています。生産者を底にして数量を積み上げると、上の段ほど少ない**ピラミッド**の形になります。',
        // 生物の数量のピラミッド
        figure: scene(pyramid().concat([
          { type: 'text', x: 160, y: 80, text: '肉食動物', anchor: 'middle', size: 12 },
          { type: 'text', x: 160, y: 126, text: '草食動物', anchor: 'middle', size: 14 },
          { type: 'text', x: 160, y: 186, text: '植物（生産者）', anchor: 'middle', size: 14, color: 'white', bold: true },
          { type: 'text', x: 316, y: 40, text: '上の段ほど数量が少ない', anchor: 'end', size: 12 },
          { type: 'text', x: 160, y: 232, text: '生物の数量のピラミッド', anchor: 'middle', size: 13 },
        ])),
      },
      {
        id: 'nature-1-c4',
        anim: 'na-balance',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '生物の数量は、一時的に増えたり減ったりしても、やがてもとにもどり、ほぼ一定に保たれます（**つり合い**）。草食動物が増えると、植物は減り、肉食動物は増えます。すると草食動物は減り、やがてもとのつり合いにもどります。',
        // 数量のつり合いがもどるまで
        figure: scene([
          ...[
            [14, '① 草食動物が増える'],
            [70, '② 植物が減り、肉食動物が増える'],
            [126, '③ 草食動物が減る'],
            [182, '④ 植物が増え、肉食動物が減る'],
          ].flatMap(([y, t]) => [
            { type: 'rect', x: 16, y, width: 272, height: 34, rx: 6, fill: 'white', stroke: 'line' },
            { type: 'text', x: 28, y: y + 22, text: t, size: 13 },
          ]),
          { type: 'arrow', x1: 152, y1: 49, x2: 152, y2: 67, width: 2 },
          { type: 'arrow', x1: 152, y1: 105, x2: 152, y2: 123, width: 2 },
          { type: 'arrow', x1: 152, y1: 161, x2: 152, y2: 179, width: 2 },
          { type: 'line', points: [[290, 199], [308, 199], [308, 31], [292, 31]], width: 2, arrow: true },
          { type: 'text', x: 316, y: 236, text: 'もとのつり合いへ', anchor: 'end', size: 12 },
        ]),
      },
    ],
    warmup: choice({
      id: 'nature-1-w1', concept: 'na-foodchain',
      prompt: '予想しよう。ある森にすむ 植物・草食動物・肉食動物 の数量をくらべると、いちばん多いのはどれだと思う？',
      options: ['植物', '草食動物', '肉食動物'],
      answer: 'a',
      explanation: 'ふつう、いちばん多いのは植物です。食べられる生物のほうが、食べる生物より多くなっています。食べる・食べられるの関係を、このステージで調べよう。',
      hint: '草食動物が生きていくには、たくさんの植物が必要だね。',
    }),
    problems: [
      choice({
        id: 'nature-1-p1', concept: 'na-foodchain',
        prompt: '食物連鎖を表す「イネ → バッタ」の矢印は、何を表している？',
        options: ['バッタがイネを食べる', 'イネがバッタを食べる', 'イネとバッタが同じ場所にすむ'],
        answer: 'a',
        explanation: '食物連鎖の矢印は、食べられる生物から食べる生物へ向けてかきます。「イネ → バッタ」は、バッタがイネを食べることを表します。',
        hint: '矢印の先にいるのが、食べる生物だよ。',
      }),
      fill({
        id: 'nature-1-t1', concept: 'na-foodchain', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '光合成で無機物から有機物をつくる植物を[b1]、ほかの生物を食べて有機物をとり入れる動物を[b2]という。',
        blanks: [
          word('b1', ['生産者', '消費者', '分解者'], '生産者'),
          word('b2', ['生産者', '消費者', '分解者'], '消費者'),
        ],
        explanation: '有機物をつくり出す植物が**生産者**、それを食べて（直接または間接に）とり入れる動物が**消費者**です。',
        hint: '有機物を「つくる」か「消費する（使う）」かで考えよう。',
      }),
      figureChoice({
        id: 'nature-1-p2', concept: 'na-foodchain',
        prompt: 'イネ・バッタ・カエルの食物連鎖を、矢印で表そうとした図です（ア: イネ ← バッタ ← カエル、イ: イネ → バッタ → カエル、ウ: バッタ → イネ → カエル）。正しく表しているのはどれ？',
        figure: scene([
          ...[
            [50, ['イネ', 'バッタ', 'カエル'], -1],
            [120, ['イネ', 'バッタ', 'カエル'], 1],
            [190, ['バッタ', 'イネ', 'カエル'], 1],
          ].flatMap(([y, names, dir]) => [
            ...names.map((t, i) => ({ type: 'text', x: 100 + i * 80, y: y + 5, text: t, anchor: 'middle', size: 14 })),
            ...[0, 1].map(i => dir > 0
              ? { type: 'arrow', x1: 124 + i * 80, y1: y, x2: 156 + i * 80, y2: y, width: 2 }
              : { type: 'arrow', x1: 156 + i * 80, y1: y, x2: 124 + i * 80, y2: y, width: 2 }),
          ]),
          { type: 'region', id: 'r1', x: 30, y: 50, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 30, y: 120, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 30, y: 190, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'バッタはイネを食べ、カエルはバッタを食べます。食べられる生物から食べる生物へ矢印をかくので、イが正しい表し方です。アは矢印の向きが逆、ウは食べる順番がちがいます。',
        hint: '矢印は「食べられる → 食べる」の向きだよ。',
      }),
      drag({
        id: 'nature-1-p3', concept: 'na-foodchain',
        prompt: '生物の数量のピラミッドです（上の段: 肉食動物、まん中の段: 草食動物、下の段: 植物）。肉食動物が急に減ると、そのすぐあとに数量が増えるのはどの段の生物？ 青い印を上下に動かして、その段のまん中の点に置こう。',
        // 正解は草食動物の段のまん中 (160, 120)。肉食動物の段 (160, 60)・植物の段 (160, 180) は 60px はなれる。
        // 段の境目（y = 90・150）も目標から 30px はなれる
        figure: pyramidDrag(),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: 160, y: TIER_Y[1] },
        samples: { correct: { x: 160, y: TIER_Y[1] }, wrong: { x: 160, y: TIER_Y[2] } },
        explanation: '肉食動物が減ると、食べられる数が減るので、草食動物が増えます。そのあと、植物が減ったり肉食動物が増えたりして、やがてもとのつり合いにもどります。',
        hint: '肉食動物に食べられていたのは、どの段の生物かな。',
      }),
      choice({
        id: 'nature-1-p4', concept: 'na-foodchain',
        prompt: 'ある地域で、草食動物が一時的に急に増えました。そのすぐあと、植物と肉食動物の数量はどうなる？',
        options: ['植物は減り、肉食動物は増える', '植物は増え、肉食動物は減る', 'どちらも変わらない'],
        answer: 'a',
        explanation: '草食動物が増えると、食べられる植物は減り、えさが増えた肉食動物は増えます。その後、草食動物が減って、やがてもとのつり合いにもどります。',
        hint: '草食動物は何を食べ、何に食べられるかな。',
      }),
      choice({
        id: 'nature-1-p5', concept: 'na-foodchain',
        prompt: '「イネ → バッタ → カエル → ヘビ」の食物連鎖で、消費者だけの組み合わせはどれ？',
        options: ['イネとバッタ', 'バッタとカエルとヘビ', 'イネとヘビ'],
        answer: 'b',
        explanation: 'バッタ・カエル・ヘビは、ほかの生物を食べて有機物をとり入れる消費者です。イネは光合成で有機物をつくる生産者です。',
        hint: '光合成をする生物を除こう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'nature-1-r1', concept: 'na-foodchain',
        prompt: '「イネ → バッタ → カエル → ヘビ」の食物連鎖の図です（ア: イネ、イ: バッタ、ウ: カエル、エ: ヘビ）。草食動物を食べている肉食動物はどれ？',
        figure: scene(chainRow().concat(CHAIN_X.map((x, i) => ({ type: 'region', id: 'r' + (i + 1), x, y: 56, r: 22, label: 'アイウエ'[i] })))),
        answer: 'r3',
        explanation: '草食動物はイネを食べるバッタです。そのバッタを食べているのはカエル（ウ）です。ヘビはカエルを食べる肉食動物です。',
        hint: 'まず草食動物（植物を食べる動物）をさがそう。',
      }),
      drag({
        id: 'nature-1-r2', concept: 'na-foodchain',
        prompt: '生物の数量のピラミッドです（上の段: 肉食動物、まん中の段: 草食動物、下の段: 植物）。草食動物が急に増えると、そのすぐあとに数量が減るのはどの段の生物？ 青い印を上下に動かして、その段のまん中の点に置こう。',
        // 正解は植物の段のまん中 (160, 180)。草食動物の段 (160, 120) は 60px、肉食動物の段 (160, 60) は 120px はなれる
        figure: pyramidDrag(),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: 160, y: TIER_Y[2] },
        samples: { correct: { x: 160, y: TIER_Y[2] }, wrong: { x: 160, y: TIER_Y[0] } },
        explanation: '草食動物が増えると、たくさん食べられる植物が減ります。肉食動物は、えさが増えるので増えます。',
        hint: '草食動物に食べられるのは、どの段の生物かな。',
      }),
      choice({
        id: 'nature-1-t2', concept: 'na-foodchain', term: true,
        prompt: '次の説明に合う言葉はどれ？「ある地域にすむ生物と、それをとりまく水・空気・土などの環境をひとまとまりにとらえたもの」',
        options: ['生態系', '食物連鎖', '食物網'],
        answer: 'a',
        explanation: '生物とそのまわりの環境をひとまとまりにとらえたものを**生態系**といいます。食物連鎖や食物網は、その中の生物どうしの「食べる・食べられる」の関係です。',
        hint: '生物だけでなく、環境もふくめたよび名だよ。',
      }),
      choice({
        id: 'nature-1-r3', concept: 'na-foodchain',
        prompt: '肉食動物のからだをつくる有機物は、もとをたどると何がつくったもの？',
        options: ['植物が光合成でつくったもの', '肉食動物が自分でつくったもの', '空気中にもともとあったもの'],
        answer: 'a',
        explanation: '肉食動物は草食動物を食べ、草食動物は植物を食べます。もとをたどると、植物（生産者）が光合成でつくった有機物です。',
        hint: '食物連鎖を、はじまりまでさかのぼろう。',
      }),
    ],
  };

  // ---- ステージ nature-2: 分解者と物質の循環 ----
  const nature2 = {
    id: 'nature-2', areaId: 'na-ecosystem', title: '分解者と物質の循環', minutes: 5, concepts: ['na-decomposer'],
    lessons: [
      {
        id: 'nature-2-c1',
        text: '生物の死がいやふんなどの有機物を、二酸化炭素や水などの無機物に分解する生物を**分解者**といいます。カビ・キノコなどの菌類と、乳酸菌・大腸菌などの細菌類です。土の中のミミズやダンゴムシも、落ち葉を食べて細かくし、分解にかかわります。',
        // 分解者のなかま（写真。左上 アオカビの生えたパン、右上 落ち葉のキノコ、左下 ミミズ、右下 ダンゴムシ）
        figure: scene([
          photo('nature-2-c1'),
          tag(78, 116, 'カビ（菌類）', { anchor: 'middle' }),
          tag(239, 116, 'キノコ（菌類）', { anchor: 'middle' }),
          tag(79, 232, 'ミミズ', { anchor: 'middle' }),
          tag(240, 232, 'ダンゴムシ', { anchor: 'middle' }),
        ]),
      },
      {
        id: 'nature-2-c2',
        text: '**菌類**（カビ・キノコ）は、体が菌糸という糸のようなものでできていて、多くは胞子でふえます。**細菌類**は、1 つの細胞からなるとても小さな生物で、分裂してふえます。どちらも有機物を分解して、生きるためのエネルギーを得ています。',
        // 菌類と細菌類のくらべ（写真。左 アオカビ、右 乳酸菌の顕微鏡の視野。視野の中心 (80, 93)・(240, 93)、半径 75）
        figure: scene([
          photo('nature-2-c2'),
          tag(160, 24, '胞子', { anchor: 'middle', size: 13 }),
          pin(146, 20, 92, 42),
          tag(160, 160, '菌糸', { anchor: 'middle', size: 13 }),
          pin(146, 155, 100, 140),
          tag(80, 190, '菌類（アオカビ）', { anchor: 'middle', bold: true }),
          tag(80, 210, '体は菌糸でできている', { anchor: 'middle', size: 13 }),
          tag(80, 230, '多くは胞子でふえる', { anchor: 'middle', size: 13 }),
          tag(240, 190, '細菌類（乳酸菌）', { anchor: 'middle', bold: true }),
          tag(240, 210, '1 つの細胞でできている', { anchor: 'middle', size: 13 }),
          tag(240, 230, '分裂してふえる', { anchor: 'middle', size: 13 }),
        ]),
      },
      {
        id: 'nature-2-c3',
        text: '落ち葉の下の土を水に入れてかき混ぜ、その上ずみ液をデンプン溶液に加えて数日置きます。ヨウ素液を加えると、そのままの土 A では青紫色にならず、焼いた土 B では青紫色になります。土の中の微生物がデンプンを分解したからです。',
        // 土の上ずみ液の実験の結果（写真。左 A のビーカー x 27〜145、右 B のビーカー x 173〜290、どちらも y 54〜194）
        figure: scene([
          photo('nature-2-c3'),
          tag(160, 18, 'デンプン溶液に加えて数日後、ヨウ素液を入れる', { anchor: 'middle', size: 13 }),
          tag(86, 44, 'A 土の上ずみ液', { anchor: 'middle', size: 13, bold: true }),
          tag(231, 44, 'B 焼いた土の上ずみ液', { anchor: 'middle', size: 13, bold: true }),
          tag(86, 212, '青紫色にならない', { anchor: 'middle', size: 13 }),
          tag(231, 212, '青紫色になる', { anchor: 'middle', size: 13 }),
          tag(86, 232, 'デンプンが分解された', { anchor: 'middle', size: 13 }),
          tag(231, 232, 'デンプンが残った', { anchor: 'middle', size: 13 }),
        ]),
      },
      {
        id: 'nature-2-c4',
        anim: 'na-carbon-cycle',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '大気中の二酸化炭素の炭素は、植物の光合成で有機物にとりこまれ、食物連鎖で動物へ移ります。生物の呼吸や分解者のはたらきで、再び二酸化炭素になって大気にもどります。酸素も、光合成と呼吸によって**循環**しています。',
        // 炭素の循環
        figure: scene(carbonCycle().concat([
          { type: 'text', x: 36, y: 118, text: '光合成', size: 12 },
          { type: 'text', x: 90, y: 118, text: '呼吸', size: 12 },
          { type: 'text', x: 166, y: 118, text: '呼吸', size: 12 },
          { type: 'text', x: 270, y: 118, text: '呼吸', size: 12 },
          { type: 'text', x: 160, y: 222, text: '死がい・ふん', anchor: 'middle', size: 12 },
        ])),
      },
    ],
    warmup: choice({
      id: 'nature-2-w1', concept: 'na-decomposer',
      prompt: '予想しよう。森には毎年たくさんの落ち葉が落ちますが、落ち葉が積もり続けて森がうまってしまうことはありません。なぜだと思う？',
      options: ['土の中などの生物が、落ち葉を分解するから', '落ち葉が、風ですべて飛ばされるから', '落ち葉が、日光でとけてなくなるから'],
      answer: 'a',
      explanation: '落ち葉は、土の中の小動物や菌類・細菌類によって、細かくされ、分解されていきます。このはたらきをする生物を、このステージで調べよう。',
      hint: '落ち葉の下の土をほると、どんな生物がいるかな。',
    }),
    problems: [
      choice({
        id: 'nature-2-p1', concept: 'na-decomposer',
        prompt: '分解者のはたらきとして正しいものはどれ？',
        options: ['死がいやふんなどの有機物を、無機物に分解する', '無機物から、光合成で有機物をつくる', '草食動物を食べて、数量のつり合いを保つ'],
        answer: 'a',
        explanation: '分解者は、死がいやふんなどの有機物を、二酸化炭素や水などの無機物に分解します。無機物から有機物をつくるのは生産者（植物）です。',
        hint: '「分解」という名前から考えよう。',
      }),
      fill({
        id: 'nature-2-t1', concept: 'na-decomposer', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'カビやキノコのなかまを[b1]、乳酸菌や大腸菌のなかまを[b2]という。',
        blanks: [
          word('b1', ['菌類', '細菌類', '生産者'], '菌類'),
          word('b2', ['菌類', '細菌類', '生産者'], '細菌類'),
        ],
        explanation: 'カビ・キノコは**菌類**、乳酸菌・大腸菌は**細菌類**です。どちらも分解者として、有機物を無機物に分解します。',
        hint: '「〜菌」という名前が付くのは、どちらのなかまかな。',
      }),
      figureChoice({
        id: 'nature-2-p2', concept: 'na-decomposer',
        prompt: '炭素の循環を表した図です（ア: 大気から植物へ、イ: 植物から大気へ、ウ: 動物から大気へ、エ: 分解者から大気へ向かう矢印）。光合成を表す矢印はどれ？',
        figure: CARBON_Q,
        answer: 'r1',
        explanation: '光合成では、植物が大気中の二酸化炭素をとり入れて有機物をつくります。大気から植物へ向かう矢印（ア）です。イ・ウ・エは、呼吸などで二酸化炭素が大気へもどる矢印です。',
        hint: '光合成で、植物は二酸化炭素を出す？ とり入れる？',
      }),
      choice({
        id: 'nature-2-p3', concept: 'na-decomposer',
        prompt: '焼いた土の上ずみ液をデンプン溶液に加え、数日置いてからヨウ素液を加えました。どうなる？',
        options: ['青紫色になる', '青紫色にならない', '白くにごる'],
        answer: 'a',
        explanation: '土を焼くと、土の中の微生物（菌類・細菌類）が死んでしまいます。デンプンが分解されずに残るので、ヨウ素液で青紫色になります。',
        hint: '土を焼くと、土の中の生物はどうなるかな。',
      }),
      choice({
        id: 'nature-2-p4', concept: 'na-decomposer',
        prompt: '次のうち、菌類はどれ？',
        options: ['シイタケ', '乳酸菌', 'ミミズ', 'ダンゴムシ'],
        answer: 'a',
        explanation: 'シイタケはキノコのなかまで、菌類です。乳酸菌は細菌類、ミミズとダンゴムシは土の中の小動物です。',
        hint: 'カビやキノコのなかまをさがそう。',
      }),
      choice({
        id: 'nature-2-p5', concept: 'na-decomposer',
        prompt: '動物のからだの中の炭素は、おもに何としてふくまれている？',
        options: ['有機物', '二酸化炭素', '酸素'],
        answer: 'a',
        explanation: '動物のからだは、食べた生物からとり入れた有機物でできていて、炭素はおもに有機物としてふくまれています。呼吸や分解者のはたらきで、二酸化炭素になって大気へもどります。',
        hint: 'デンプンやタンパク質などは、炭素をふくむ物質だね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'nature-2-r1', concept: 'na-decomposer',
        prompt: '炭素の循環を表した図です（ア: 大気から植物へ、イ: 植物から大気へ、ウ: 動物から大気へ、エ: 分解者から大気へ向かう矢印）。植物の呼吸を表す矢印はどれ？',
        figure: CARBON_Q,
        answer: 'r2',
        explanation: '植物も、昼も夜も呼吸をして二酸化炭素を出しています。植物から大気へ向かう矢印（イ）です。アは光合成の矢印です。',
        hint: '呼吸では、二酸化炭素を出すよ。',
      }),
      choice({
        id: 'nature-2-t2', concept: 'na-decomposer', term: true,
        prompt: '次の説明に合う言葉はどれ？「生物の死がいやふんなどの有機物を、無機物に分解する生物をまとめたよび名」',
        options: ['分解者', '生産者', '消費者'],
        answer: 'a',
        explanation: '有機物を無機物に分解する生物を**分解者**といいます。菌類や細菌類、土の中の小動物がこのはたらきにかかわります。',
        hint: '「分解」するもの、と考えよう。',
      }),
      choice({
        id: 'nature-2-r2', concept: 'na-decomposer',
        prompt: '落ち葉の下の土（焼いていない）の上ずみ液をデンプン溶液に加え、数日置いてからヨウ素液を加えました。どうなる？',
        options: ['青紫色になる', '青紫色にならない', '赤褐色の沈殿ができる'],
        answer: 'b',
        explanation: '土の中の微生物がデンプンを分解したので、デンプンがほとんど残っていません。そのため、ヨウ素液を加えても青紫色になりません。',
        hint: '土の中の微生物は、デンプンをどうするかな。',
      }),
      choice({
        id: 'nature-2-r3', concept: 'na-decomposer',
        prompt: '次のうち、細菌類はどれ？',
        options: ['アオカビ', '大腸菌', 'シイタケ', 'ミミズ'],
        answer: 'b',
        explanation: '大腸菌は、1 つの細胞からなる細菌類です。アオカビとシイタケは菌類、ミミズは土の中の小動物です。',
        hint: '1 つの細胞でできた、とても小さな生物だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 人間と環境
  // ================================================================

  // ---- ステージ nature-3: 自然環境の変化と保全 ----
  const nature3 = {
    id: 'nature-3', areaId: 'na-human', title: '自然環境の変化と保全', minutes: 5, concepts: ['na-environment'],
    lessons: [
      {
        id: 'nature-3-c1',
        text: '川にすむ生物の種類は、水のよごれの程度によってちがいます。カワゲラやサワガニがいればきれいな水、アメリカザリガニやサカマキガイばかりならとてもきたない水です。このように環境を知る手がかりになる生物を**指標生物**といいます。',
        // きれいな水にすむ指標生物 3 種（写真。左 サワガニ x 5〜108、中 カワゲラの幼虫 x 115〜210、右 ヒラタカゲロウの幼虫 x 220〜318。どれも石の上で y 50〜146）
        figure: scene([
          photo('nature-3-c1'),
          tag(160, 26, 'きれいな水にすむ指標生物', { anchor: 'middle', bold: true }),
          tag(56, 166, 'サワガニ', { anchor: 'middle', size: 13 }),
          tag(163, 166, 'カワゲラの幼虫', { anchor: 'middle', size: 13 }),
          tag(270, 166, 'ヒラタカゲロウ', { anchor: 'middle', size: 13 }),
          tag(270, 184, 'の幼虫', { anchor: 'middle', size: 13 }),
          tag(160, 212, 'とてもきたない水では', { anchor: 'middle', size: 13 }),
          tag(160, 230, 'アメリカザリガニやサカマキガイばかりになる', { anchor: 'middle', size: 13 }),
        ]),
      },
      {
        id: 'nature-3-c2',
        text: '人間の活動によって、もともといなかった地域に持ちこまれて定着した生物を**外来種**といいます。オオクチバスやアライグマなどは、もとからその地域にすむ**在来種**を食べたり、すみかをうばったりして、生態系のつり合いをくずすことがあります。',
        // 外来種（写真。左 オオクチバス x 4〜149、右 アライグマ x 167〜319、どちらも y 154 より上）
        figure: scene([
          photo('nature-3-c2'),
          tag(76, 170, 'オオクチバス（外来種）', { anchor: 'middle', size: 13 }),
          tag(243, 170, 'アライグマ（外来種）', { anchor: 'middle', size: 13 }),
          tag(160, 206, '在来種を食べる・すみかをうばう', { anchor: 'middle', bold: true }),
          tag(160, 228, '生態系のつり合いをくずすことがある', { anchor: 'middle', size: 13 }),
        ]),
      },
      {
        id: 'nature-3-c3',
        anim: 'na-greenhouse',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '石油や石炭などを大量に燃やすと、大気中の二酸化炭素が増えます。二酸化炭素などの**温室効果ガス**は、地表から出る熱を宇宙へ逃がしにくくします。そのため、地球の平均気温が上がる**地球温暖化**が心配されています。',
        // 温室効果のしくみ
        figure: scene([
          { type: 'rect', x: 0, y: 196, width: 320, height: 44, fill: 'brown', stroke: 'none' },
          { type: 'text', x: 12, y: 224, text: '地表', size: 13, color: 'white', bold: true },
          { type: 'text', x: 312, y: 224, text: '赤い矢印: 地表から出る熱', anchor: 'end', size: 12, color: 'white' },
          { type: 'rect', x: 0, y: 84, width: 320, height: 24, fill: 'glass', stroke: 'none' },
          { type: 'text', x: 314, y: 101, text: '温室効果ガス', anchor: 'end', size: 12 },
          { type: 'circle', x: 30, y: 32, r: 18, fill: 'yellow', stroke: 'orange' },
          { type: 'text', x: 54, y: 24, text: '太陽の光', size: 12 },
          { type: 'arrow', x1: 44, y1: 54, x2: 60, y2: 190, color: 'orange' },
          { type: 'arrow', x1: 120, y1: 192, x2: 96, y2: 22, color: 'red', width: 2 },
          { type: 'text', x: 106, y: 40, text: '宇宙へ逃げる熱', size: 12 },
          { type: 'arrow', x1: 150, y1: 192, x2: 170, y2: 112, color: 'red', width: 2 },
          { type: 'arrow', x1: 182, y1: 112, x2: 202, y2: 190, color: 'red', width: 2 },
          { type: 'text', x: 210, y: 160, text: '地表へもどる熱', size: 12 },
        ]),
      },
      {
        id: 'nature-3-c4',
        text: '工場や自動車の排出ガスにふくまれる物質がとけこんだ**酸性雨**は、森林や湖の生物に害をあたえます。フロンは、紫外線を吸収する**オゾン層**をこわします。地震・火山の噴火・台風などの自然災害には、ハザードマップで危険な場所を知って備えます。',
        // 酸性雨・オゾン層・自然災害への備え
        figure: scene([
          { type: 'line', points: [[8, 80], [312, 80]], color: 'gray', width: 1 },
          { type: 'line', points: [[8, 156], [312, 156]], color: 'gray', width: 1 },
          { type: 'ellipse', x: 50, y: 24, rx: 34, ry: 12, fill: 'gray' },
          ...[30, 46, 62].map(x => ({ type: 'line', points: [[x, 40], [x - 4, 54]], color: 'blue', width: 2 })),
          { type: 'rect', x: 76, y: 52, width: 6, height: 20, fill: 'brown', stroke: 'none' },
          { type: 'circle', x: 79, y: 48, r: 10, fill: 'green' },
          { type: 'text', x: 120, y: 34, text: '酸性雨', size: 14, bold: true },
          { type: 'text', x: 120, y: 58, text: '森林や湖の生物に害をあたえる', size: 12 },
          { type: 'rect', x: 12, y: 104, width: 88, height: 12, fill: 'sky', stroke: 'line' },
          ...[30, 56, 82].map(x => ({ type: 'arrow', x1: x - 6, y1: 86, x2: x, y2: 100, color: 'gray', width: 2 })),
          { type: 'text', x: 56, y: 140, text: '紫外線', anchor: 'middle', size: 12 },
          { type: 'text', x: 120, y: 110, text: 'オゾン層', size: 14, bold: true },
          { type: 'text', x: 120, y: 134, text: '紫外線を吸収（フロンでこわれる）', size: 12 },
          { type: 'rect', x: 14, y: 168, width: 80, height: 56, fill: 'white' },
          { type: 'polygon', points: [[16, 200], [60, 186], [92, 196], [92, 222], [16, 222]], fill: 'yellow', stroke: 'none' },
          { type: 'polygon', points: [[16, 212], [50, 204], [92, 210], [92, 222], [16, 222]], fill: 'orange', stroke: 'none' },
          { type: 'text', x: 120, y: 186, text: '自然災害への備え', size: 14, bold: true },
          { type: 'text', x: 120, y: 210, text: 'ハザードマップで危険な場所を知る', size: 12 },
        ]),
      },
    ],
    warmup: choice({
      id: 'nature-3-w1', concept: 'na-environment',
      prompt: '予想しよう。ある池に、もともといなかった大型の肉食の魚が放され、ふえていきました。池にもとからいた小さな魚の数は、どうなると思う？',
      options: ['減る', '増える', '変わらない'],
      answer: 'a',
      explanation: '大型の肉食の魚に食べられて、もとからいた小さな魚は減ってしまうことが多いです。人間の活動が自然にどんな影響をあたえるかを、このステージで調べよう。',
      hint: '大型の肉食の魚は、何を食べるかな。',
    }),
    problems: [
      figureChoice({
        id: 'nature-3-p1', concept: 'na-environment',
        prompt: '川の 3 つの地点（ア・イ・ウ）で見つかった水生生物を、それぞれの下の四角に書いた図です（ア: アメリカザリガニ・サカマキガイ・ユスリカ、イ: カワゲラ・サワガニ・ヒラタカゲロウ、ウ: カワニナ・ゲンジボタル・コオニヤンマ）。いちばんきれいな水の地点はどれ？',
        figure: RIVER_Q,
        answer: 'r2',
        explanation: 'カワゲラ・サワガニ・ヒラタカゲロウは、きれいな水にすむ指標生物なので、イがいちばんきれいです。ウはややきれいな水、アはとてもきたない水の生物です。',
        hint: 'サワガニがすむのは、どんな水かな。',
      }),
      fill({
        id: 'nature-3-t1', concept: 'na-environment', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '人間の活動によってほかの地域から持ちこまれ、定着した生物を[b1]という。二酸化炭素など、地表から出る熱を逃がしにくくする気体を[b2]という。',
        blanks: [
          word('b1', ['外来種', '在来種', '指標生物'], '外来種'),
          word('b2', ['温室効果ガス', 'オゾン層', '酸性雨'], '温室効果ガス'),
        ],
        explanation: 'ほかの地域から持ちこまれた生物が**外来種**、熱を逃がしにくくする気体が**温室効果ガス**です。温室効果ガスが増えることが、地球温暖化の原因の 1 つと考えられています。',
        hint: '「外から来た種」と、「温室のような効果をもつ気体」だよ。',
      }),
      choice({
        id: 'nature-3-p2', concept: 'na-environment',
        prompt: '地球温暖化のおもな原因と考えられているものはどれ？',
        options: ['化石燃料を大量に燃やし、二酸化炭素などの温室効果ガスが増えたこと', 'フロンによって、オゾン層がこわされたこと', '酸性雨によって、森林がかれたこと'],
        answer: 'a',
        explanation: '石油や石炭などの化石燃料を大量に燃やすと、二酸化炭素が増えます。温室効果ガスが増えると熱が逃げにくくなり、地球の平均気温が上がると考えられています。',
        hint: '熱を逃がしにくくする気体は何だったかな。',
      }),
      choice({
        id: 'nature-3-p3', concept: 'na-environment',
        prompt: '日本の自然の中で問題になっている外来種はどれ？',
        options: ['アライグマ', 'ニホンザル', 'メダカ', 'タヌキ'],
        answer: 'a',
        explanation: 'アライグマは北アメリカから持ちこまれた外来種で、在来の生物や農作物に被害をあたえています。ニホンザル・メダカ・タヌキは、もとから日本にいる在来種です。',
        hint: 'もともと日本にいなかった動物をさがそう。',
      }),
      choice({
        id: 'nature-3-p4', concept: 'na-environment',
        prompt: 'オゾン層は、どのようにして地球の生物を守っている？',
        options: ['太陽からの紫外線を吸収する', '地表から出る熱を宇宙へ逃がす', '雨を酸性にする物質をとりのぞく'],
        answer: 'a',
        explanation: 'オゾン層は、生物に害のある太陽からの紫外線の多くを吸収しています。フロンなどによってこわされると、地上にとどく紫外線が増えます。',
        hint: '日焼けの原因になる光を考えよう。',
      }),
      choice({
        id: 'nature-3-p5', concept: 'na-environment',
        prompt: '火山の噴火や洪水などで被害が出そうな場所や、ひなん場所などを示した地図を何という？',
        options: ['ハザードマップ', '天気図', '等高線'],
        answer: 'a',
        explanation: '災害で危険な場所やひなん場所を示した地図を、ハザードマップといいます。ふだんから見て、どこへにげるかを確かめておこう。',
        hint: '「ハザード」は「危険」という意味だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'nature-3-r1', concept: 'na-environment',
        prompt: '川の 3 つの地点（ア・イ・ウ）で見つかった水生生物を、それぞれの下の四角に書いた図です（ア: アメリカザリガニ・サカマキガイ・ユスリカ、イ: カワゲラ・サワガニ・ヒラタカゲロウ、ウ: カワニナ・ゲンジボタル・コオニヤンマ）。いちばんよごれた水の地点はどれ？',
        figure: RIVER_Q,
        answer: 'r1',
        explanation: 'アメリカザリガニ・サカマキガイ・ユスリカは、とてもきたない水でも生きられる指標生物なので、アがいちばんよごれています。イはきれいな水、ウはややきれいな水です。',
        hint: 'アメリカザリガニは、どんな水にもすめるよ。',
      }),
      choice({
        id: 'nature-3-t2', concept: 'na-environment', term: true,
        prompt: '次の説明に合う言葉はどれ？「温室効果ガスの増加などによって、地球の平均気温が上がっていくこと」',
        options: ['地球温暖化', '酸性雨', '外来種'],
        answer: 'a',
        explanation: '地球の平均気温が上がっていくことを**地球温暖化**といいます。海面の上昇や、生物のすむ場所の変化などが心配されています。',
        hint: '地球が「温かくなる」ことを表す言葉だよ。',
      }),
      choice({
        id: 'nature-3-r2', concept: 'na-environment',
        prompt: '酸性雨のおもな原因はどれ？',
        options: ['工場や自動車の排出ガスにふくまれる物質', '冷蔵庫などに使われていたフロン', '太陽からの紫外線'],
        answer: 'a',
        explanation: '工場や自動車の排出ガスにふくまれる物質（窒素酸化物や硫黄酸化物など）が雨にとけこむと、酸性雨になります。フロンはオゾン層をこわす物質です。',
        hint: '物を燃やしたときに出る気体を考えよう。',
      }),
      choice({
        id: 'nature-3-r3', concept: 'na-environment',
        prompt: '外来種が問題になる理由として、正しいものはどれ？',
        options: ['在来種を食べたり、すみかをうばったりして、生態系のつり合いをくずすことがあるから', '外来種は、どれも毒をもっているから', '外来種がいると、その地域の気温が上がるから'],
        answer: 'a',
        explanation: '外来種は、在来種を食べたり、えさやすみかをうばったりして、もとの生態系のつり合いをくずすことがあります。すべての外来種が毒をもつわけではありません。',
        hint: '食物連鎖やつり合いのことを思い出そう。',
      }),
    ],
  };

  // ---- ステージ nature-4: エネルギーと科学技術 ----
  const nature4 = {
    id: 'nature-4', areaId: 'na-human', title: 'エネルギーと科学技術', minutes: 5, concepts: ['na-energy'],
    lessons: [
      {
        id: 'nature-4-c1',
        text: '火力発電は化石燃料を燃やし、原子力発電は核燃料（ウラン）の核分裂の熱で水蒸気をつくり、発電機を回します。水力発電は、高い所の水を落として発電機を回します。火力発電は二酸化炭素を多く出し、原子力発電は放射線の管理が必要です。',
        // 発電のしかたとエネルギーの移り変わり
        figure: scene([
          { type: 'text', x: 160, y: 20, text: 'エネルギーの移り変わり', anchor: 'middle', size: 14, bold: true },
          ...[
            [58, '火力', [[0, '化学'], [1, '熱'], [2, '運動'], [3, '電気']], '化石燃料（石油・石炭・天然ガス）を燃やす'],
            [120, '原子力', [[0, '核'], [1, '熱'], [2, '運動'], [3, '電気']], '核燃料（ウラン）の核分裂'],
            [182, '水力', [[0, '位置'], [2, '運動'], [3, '電気']], 'ダムにためた水を落とす'],
          ].flatMap(([y, name, boxes, note]) => [
            { type: 'text', x: 6, y: y + 5, text: name, size: 14, bold: true },
            ...boxes.flatMap(([col, t]) => [
              { type: 'rect', x: 58 + col * 66, y: y - 15, width: 50, height: 30, rx: 6, fill: 'yellow' },
              { type: 'text', x: 83 + col * 66, y: y + 5, text: t, anchor: 'middle', size: 13 },
            ]),
            ...boxes.slice(1).map(([col], i) => ({ type: 'arrow', x1: 108 + boxes[i][0] * 66, y1: y, x2: 56 + col * 66, y2: y, width: 2 })),
            { type: 'text', x: 58, y: y + 32, text: note, size: 12 },
          ]),
        ]),
      },
      {
        id: 'nature-4-c2',
        text: '**化石燃料**（石油・石炭・天然ガス）は大昔の生物の死がいからでき、量に限りがあります。太陽光・風力・地熱・バイオマスなど、くり返し使えるエネルギーを**再生可能エネルギー**といいます。資源を大切に使い、環境を守り続けられる社会を**持続可能な社会**といいます。',
        // 再生可能エネルギーと化石燃料（写真。2 段 2 列: 上 y 7〜90、下 y 120〜206、左 x 7〜154、右 x 166〜313）
        figure: scene([
          photo('nature-4-c2'),
          tag(14, 26, '太陽光'),
          tag(174, 26, '風力'),
          tag(14, 139, '地熱'),
          tag(174, 139, 'バイオマス'),
          tag(160, 111, '再生可能エネルギー（くり返し使える）', { anchor: 'middle', bold: true }),
          tag(160, 226, '化石燃料（石油・石炭・天然ガス）は量に限りがある', { anchor: 'middle', size: 13 }),
        ]),
      },
      {
        id: 'nature-4-c3',
        text: 'エネルギーは電気・熱・光・運動などにすがたを変えますが、総量は変わりません（**エネルギーの保存**）。ただし一部は目的外の熱などになるので、与えたエネルギーのうち目的のエネルギーに変わった割合（**変換効率**）は 100% より小さくなります。',
        // 白熱電球のエネルギーの変換
        figure: scene([
          { type: 'rect', x: 8, y: 84, width: 112, height: 60, rx: 6, fill: 'yellow' },
          { type: 'text', x: 64, y: 108, text: '電気エネルギー', anchor: 'middle', size: 13 },
          { type: 'text', x: 64, y: 130, text: '100 J', anchor: 'middle', size: 14, bold: true },
          { type: 'arrow', x1: 122, y1: 114, x2: 144, y2: 114 },
          { type: 'symbol', x: 166, y: 114, kind: 'bulb' },
          { type: 'text', x: 166, y: 162, text: '白熱電球', anchor: 'middle', size: 13 },
          { type: 'arrow', x1: 184, y1: 102, x2: 212, y2: 74 },
          { type: 'arrow', x1: 184, y1: 126, x2: 212, y2: 154 },
          { type: 'rect', x: 214, y: 40, width: 98, height: 50, rx: 6, fill: 'white' },
          { type: 'text', x: 263, y: 61, text: '光エネルギー', anchor: 'middle', size: 13 },
          { type: 'text', x: 263, y: 81, text: '10 J', anchor: 'middle', size: 14, bold: true },
          { type: 'rect', x: 214, y: 140, width: 98, height: 50, rx: 6, fill: 'white' },
          { type: 'text', x: 263, y: 161, text: '熱エネルギー', anchor: 'middle', size: 13 },
          { type: 'text', x: 263, y: 181, text: '90 J', anchor: 'middle', size: 14, bold: true },
          { type: 'text', x: 160, y: 222, text: '変換効率 ＝ 10 ÷ 100 × 100 ＝ 10%', anchor: 'middle', size: 13 },
        ]),
      },
      {
        id: 'nature-4-c4',
        text: '核燃料などから出る**放射線**には、α線・β線・γ線・X線などがあり、物を通りぬける性質（透過性）があります。X線は医療の検査などに利用されますが、多く浴びると体に害があるので、量や時間に注意が必要です。',
        // 放射線の通りぬけ方
        figure: scene(radiationBase().concat([
          { type: 'line', points: [[42, 100], [100, 100]], color: 'orange', width: 3, arrow: true },
          { type: 'text', x: 48, y: 94, text: 'α線', size: 13 },
          { type: 'line', points: [[42, 128], [168, 128]], color: 'blue', width: 3, arrow: true },
          { type: 'text', x: 48, y: 122, text: 'β線', size: 13 },
          { type: 'line', points: [[42, 156], [234, 156]], color: 'green', width: 3, arrow: true },
          { type: 'text', x: 48, y: 150, text: 'γ・X線', size: 12 },
          { type: 'text', x: 160, y: 226, text: '通りぬけやすさ: α線 ＜ β線 ＜ γ線・X線', anchor: 'middle', size: 13 },
        ])),
      },
    ],
    warmup: choice({
      id: 'nature-4-w1', concept: 'na-energy',
      prompt: '予想しよう。火力発電で燃やす石油や石炭を使い続けると、どうなると思う？',
      options: ['いつかなくなる', 'いくら使ってもなくならない', '使うほど増える'],
      answer: 'a',
      explanation: '石油や石炭は、大昔の生物の死がいが長い年月をかけて変化したもので、量に限りがあります。これからのエネルギーの使い方を、このステージで考えよう。',
      hint: '石油や石炭は、どうやってできたのかな。',
    }),
    problems: [
      choice({
        id: 'nature-4-p1', concept: 'na-energy',
        prompt: '水力発電では、何のエネルギーを電気エネルギーに変えている？',
        options: ['高い所にある水の位置エネルギー', '燃料の化学エネルギー', '核燃料の核エネルギー'],
        answer: 'a',
        explanation: '水力発電は、ダムなどの高い所にある水の位置エネルギーを、水を落として運動エネルギーに変え、発電機で電気エネルギーに変えます。',
        hint: '高い所にある物がもつエネルギーだよ。',
      }),
      fill({
        id: 'nature-4-t1', concept: 'na-energy', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '太陽光や風力のように、くり返し利用できるエネルギーを[b1]という。石油・石炭・天然ガスをまとめて[b2]という。',
        blanks: [
          word('b1', ['再生可能エネルギー', '化石燃料', '核燃料'], '再生可能エネルギー'),
          word('b2', ['再生可能エネルギー', '化石燃料', '核燃料'], '化石燃料'),
        ],
        explanation: 'くり返し使えるのが**再生可能エネルギー**、大昔の生物の死がいからでき、限りがあるのが**化石燃料**です。',
        hint: '「化石」は、大昔の生物が変化したものという意味だよ。',
      }),
      fill({
        id: 'nature-4-p2', concept: 'na-energy',
        prompt: '空らんに入る数を入れよう。',
        text: 'LED 電球に 200 J の電気エネルギーを与えたら、そのうち 60 J が光エネルギーに変わった。このときの変換効率は[b1]である。',
        blanks: [number('b1', 30, 0, '%')],
        explanation: '変換効率は「目的のエネルギー ÷ 与えたエネルギー × 100」なので、60 ÷ 200 × 100 ＝ 30% です。残りの 140 J は、おもに熱になります。',
        hint: '光エネルギーが、与えたエネルギーの何 % かを求めよう。',
      }),
      drag({
        id: 'nature-4-p3', concept: 'na-energy',
        prompt: '左の物質から出た β 線が右へ進みます。とちゅうに、紙・アルミニウム板・鉛の板が並んでいます。β 線が止められる板の上に、青い印を左右に動かして置こう。',
        // 正解はアルミニウム板のまん中 x = 180。紙 x = 107（73px）・鉛の板 x = 250（70px）は許容 16px の外
        figure: radiationDrag('β線'),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: PLATE_X.aluminum, y: 128 },
        samples: { correct: { x: PLATE_X.aluminum, y: 128 }, wrong: { x: PLATE_X.paper, y: 128 } },
        explanation: 'β 線は紙を通りぬけますが、アルミニウムなどのうすい金属板で止められます。α 線は紙で、γ 線や X 線は鉛の板などで止められます。',
        hint: 'β 線は、α 線より通りぬけやすく、γ 線より通りぬけにくいよ。',
      }),
      choice({
        id: 'nature-4-p4', concept: 'na-energy',
        prompt: 'X 線が、体の中を調べる医療の検査に利用されているのは、X 線のどんな性質を使っているから？',
        options: ['物を通りぬける性質（透過性）', '物をこおらせる性質', '音を大きくする性質'],
        answer: 'a',
        explanation: 'X 線は物を通りぬける性質（透過性）があるので、体の中のようすを写すことができます。浴びる量が多いと体に害があるので、必要な量だけ使います。',
        hint: 'レントゲン写真で、骨が写るのはなぜかな。',
      }),
      choice({
        id: 'nature-4-p5', concept: 'na-energy',
        prompt: '火力発電の短所として正しいものはどれ？',
        options: ['二酸化炭素を多く出し、燃料に限りがある', '天気によって発電量が大きく変わる', '放射線を出す物質の管理が必要である'],
        answer: 'a',
        explanation: '火力発電は化石燃料を燃やすので、二酸化炭素を多く出し、燃料にも限りがあります。天気で発電量が変わるのは太陽光発電、放射線の管理が必要なのは原子力発電の短所です。',
        hint: '火力発電は、何を燃やしているかな。',
      }),
    ],
    retryPool: [
      drag({
        id: 'nature-4-r1', concept: 'na-energy',
        prompt: '左の物質から出た α 線が右へ進みます。とちゅうに、紙・アルミニウム板・鉛の板が並んでいます。α 線が止められる板の上に、青い印を左右に動かして置こう。',
        // 正解は紙のまん中 x = 107。アルミニウム板 x = 180 は 73px はなれる
        figure: radiationDrag('α線'),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: PLATE_X.paper, y: 128 },
        samples: { correct: { x: PLATE_X.paper, y: 128 }, wrong: { x: PLATE_X.aluminum, y: 128 } },
        explanation: 'α 線は通りぬける力がいちばん弱く、紙 1 枚で止められます。β 線はアルミニウム板、γ 線や X 線は鉛の板などで止められます。',
        hint: 'α 線は、いちばん通りぬけにくい放射線だよ。',
      }),
      choice({
        id: 'nature-4-t2', concept: 'na-energy', term: true,
        prompt: '次の説明に合う言葉はどれ？「資源やエネルギーを大切に使い、環境を守りながら、将来の世代も豊かにくらしていける社会」',
        options: ['持続可能な社会', '再生可能エネルギー', '食物網'],
        answer: 'a',
        explanation: '環境を守りながら、将来もずっと続けられる社会を**持続可能な社会**といいます。再生可能エネルギーの利用やリサイクルなどが、そのための取り組みです。',
        hint: '「ずっと続けていける」という意味の言葉だよ。',
      }),
      fill({
        id: 'nature-4-r2', concept: 'na-energy',
        prompt: '空らんに入る数を入れよう。',
        text: 'モーターに 500 J の電気エネルギーを与えたら、物を持ち上げる運動のエネルギーに 350 J 変わった。このときの変換効率は[b1]である。',
        blanks: [number('b1', 70, 0, '%')],
        explanation: '350 ÷ 500 × 100 ＝ 70% です。残りの 150 J は、おもにモーターの熱や音になります。',
        hint: '目的のエネルギー ÷ 与えたエネルギー × 100 だよ。',
      }),
      choice({
        id: 'nature-4-r3', concept: 'na-energy',
        prompt: '次のうち、再生可能エネルギーではないものはどれ？',
        options: ['太陽光', '風力', '天然ガス', '地熱'],
        answer: 'c',
        explanation: '天然ガスは化石燃料で、量に限りがあり、燃やすと二酸化炭素が出ます。太陽光・風力・地熱は、くり返し使える再生可能エネルギーです。',
        hint: '化石燃料をさがそう。',
      }),
    ],
  };

  // ================================================================
  // 領域 3: ミニプリント（先生が作ったミニプリントの問題を、このアプリの形に書き直したもの）
  // プリントの文字起こしは miniprint_3nen.md「自然と人間」。文と図は自作で、プリントの文をそのまま写していない。
  // 1 ステージ ＝ プリント 2〜3 枚ぶん。学ぶ順（食物連鎖 → 分解者と炭素の循環 → 環境と科学技術）に並べた。
  // ================================================================

  // ---- ミニプリント用の図の部品 ----

  // 川の 4 つの地点（ア〜エ）で見つかった水生生物（水のよごれの程度は書かない）。
  // ア 少しきたない水（カワニナ・ゲンジボタル）、イ 大変きたない水（アメリカザリガニ・エラミミズ）、
  // ウ きれいな水（カワゲラ・ヘビトンボ）、エ きたない水（タニシ・ミズカマキリ）。枠の中心 x 42・121・200・279
  const RIVER4_X = [42, 121, 200, 279];
  const RIVER4_Q = scene([
    { type: 'rect', x: 0, y: 16, width: 320, height: 46, fill: 'water', stroke: 'none' },
    ...RIVER4_X.map(x => ({ type: 'rect', x: x - 37, y: 78, width: 74, height: 120, rx: 6, fill: 'white', stroke: 'line' })),
    ...[
      [0, ['カワニナ', 'ゲンジ', 'ボタル']],
      [1, ['アメリカ', 'ザリガニ', 'エラミミズ']],
      [2, ['カワゲラ', 'ヘビトンボ']],
      [3, ['タニシ', 'ミズ', 'カマキリ']],
    ].flatMap(([k, names]) => names.map((name, i) => ({ type: 'text', x: RIVER4_X[k], y: 110 + i * 30, text: name, anchor: 'middle', size: 12 }))),
    { type: 'text', x: 160, y: 224, text: '地点ごとに見つかった水生生物', anchor: 'middle', size: 13 },
    ...RIVER4_X.map((x, i) => ({ type: 'region', id: 'r' + (i + 1), x, y: 40, r: 22, label: 'アイウエ'[i] })),
  ]);

  // 落ち葉の下の土の実験（左: 土のしみ出し液 ＋ デンプン、右: 沸騰させたしみ出し液 ＋ デンプン。数日後にヨウ素液を加えた）
  function soilTestItems() {
    return [
      { type: 'beaker', x: 80, y: 150, width: 90, height: 90, level: 0.6, liquid: '#E3B27A' },
      { type: 'beaker', x: 240, y: 150, width: 90, height: 90, level: 0.6, liquid: 'purple' },
      { type: 'text', x: 80, y: 30, text: '土のしみ出し液', size: 12, anchor: 'middle' },
      { type: 'text', x: 80, y: 46, text: '＋ デンプン', size: 12, anchor: 'middle' },
      { type: 'text', x: 240, y: 30, text: '沸騰させた液', size: 12, anchor: 'middle' },
      { type: 'text', x: 240, y: 46, text: '＋ デンプン', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 196, text: '数日後にヨウ素液を加える', size: 13, anchor: 'middle' },
    ];
  }

  // ---- ステージ nature-mp1: プリント 1 食物連鎖と生物のつり合い（食物連鎖／つりあい／生産者消費者分解者） ----
  const natureMp1 = {
    id: 'nature-mp1', areaId: 'na-miniprint', title: 'プリント 1: 食物連鎖とつり合い', minutes: 5, concepts: ['na-foodchain', 'na-decomposer'],
    lessons: [
      {
        id: 'nature-mp1-c1',
        text: '生物どうしの「食べる・食べられる」のつながりを**食物連鎖**といいます。イネや木の実のように、光合成で無機物から有機物をつくる植物を**生産者**、バッタやカエルのように、ほかの生物を食べて有機物をとり入れる動物を**消費者**といいます。',
        // イネ → バッタ → カエル → ヘビ の食物連鎖
        figure: scene(chainRow().concat([
          { type: 'text', x: 160, y: 30, text: '矢印は「食べられる → 食べる」', size: 13, anchor: 'middle' },
          { type: 'text', x: 40, y: 196, text: '生産者', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 200, y: 196, text: '消費者', size: 13, anchor: 'middle', bold: true },
          { type: 'line', points: [[96, 204], [304, 204]], color: 'gray', width: 2 },
        ])),
      },
      {
        id: 'nature-mp1-c2',
        text: '草食動物が急にふえると、食べられる植物は減り、えさがふえた肉食動物はふえます。すると草食動物は減り、植物はふえ、肉食動物は減ります。生物の数量は、ふえたり減ったりしながら、ほぼ一定の**つり合い**が保たれています。',
        // 数量のピラミッドと、つり合いの変化
        figure: scene(pyramid().concat([
          { type: 'text', x: 194, y: 64, text: '肉食動物', size: 13 },
          { type: 'text', x: 232, y: 124, text: '草食動物', size: 13 },
          { type: 'text', x: 272, y: 184, text: '植物', size: 13 },
          { type: 'arrow', x1: 30, y1: 140, x2: 30, y2: 100, color: 'orange', width: 3 },
          { type: 'text', x: 40, y: 100, text: 'ふえる', size: 12 },
          { type: 'text', x: 160, y: 232, text: '→ 変化しても、やがてもとにもどる', size: 13, anchor: 'middle' },
        ])),
      },
      {
        id: 'nature-mp1-c3',
        text: '生物の死がいやふん（排出物）にふくまれる有機物を、二酸化炭素や水などの無機物に分解する生物を**分解者**といいます。ミミズなどの土の中の小動物や、目に見えない小さな生物の**菌類**（カビ・キノコ）・**細菌類**がそのなかまです。',
        // 落ち葉・死がいが分解者によって無機物になる
        figure: scene([
          { type: 'ellipse', x: 60, y: 90, rx: 34, ry: 16, fill: 'brown', stroke: 'ink' },
          { type: 'text', x: 60, y: 128, text: '落ち葉・死がい', size: 12, anchor: 'middle' },
          { type: 'arrow', x1: 104, y1: 90, x2: 140, y2: 90, color: 'gray', width: 2 },
          { type: 'ellipse', x: 180, y: 76, rx: 26, ry: 14, fill: 'sand', stroke: 'brown' },
          { type: 'rect', x: 174, y: 88, width: 12, height: 22, fill: 'white', stroke: 'brown' },
          { type: 'circle', x: 156, y: 116, r: 3, fill: 'purple', stroke: 'none' },
          { type: 'circle', x: 206, y: 112, r: 3, fill: 'purple', stroke: 'none' },
          { type: 'text', x: 180, y: 140, text: '分解者', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 180, y: 158, text: '（菌類・細菌類）', size: 12, anchor: 'middle' },
          { type: 'arrow', x1: 220, y1: 90, x2: 252, y2: 90, color: 'gray', width: 2 },
          { type: 'text', x: 288, y: 84, text: '無機物', size: 13, anchor: 'middle' },
          { type: 'text', x: 288, y: 104, text: '（二酸化', size: 12, anchor: 'middle' },
          { type: 'text', x: 288, y: 120, text: '炭素・水）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 210, text: '有機物 → 無機物 に分解する', size: 14, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'nature-mp1-w1', concept: 'na-foodchain',
      prompt: '田んぼにすむバッタは、主に何を食べている？',
      options: ['イネなどの植物', 'カエル', 'ヘビ'],
      answer: 'a',
      explanation: 'バッタは、イネなどの植物の葉を食べる草食動物です。そのバッタは、カエルなどに食べられます。',
      hint: 'バッタは草食動物だよ。',
    }),
    problems: [
      figureChoice({
        id: 'nature-mp1-p1', concept: 'na-foodchain',
        prompt: '田んぼの生物の食物連鎖の図です（矢印は「食べられる → 食べる」の向き）。バッタを食べる生物はア〜エのどれ？',
        figure: scene(chainRow().concat([
          ...CHAIN_X.map((x, i) => ({ type: 'region', id: 'r' + (i + 1), x, y: 204, r: 22, label: 'アイウエ'[i] })),
        ])),
        answer: 'r3',
        explanation: '矢印は「食べられる生物 → 食べる生物」の向きです。バッタからの矢印はカエル（ウ）に向かっているので、バッタを食べるのはカエルです。',
        hint: 'バッタから出ている矢印の先をたどろう。',
      }),
      fill({
        id: 'nature-mp1-t1', concept: 'na-foodchain', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '生物どうしの「食べる・食べられる」のつながりを[b1]という。光合成で有機物をつくるイネや木の実のような植物を[b2]という。',
        blanks: [
          word('b1', ['食物連鎖', '生態系', '分解'], '食物連鎖'),
          word('b2', ['生産者', '消費者', '分解者'], '生産者'),
        ],
        explanation: '「食べる・食べられる」のつながりを**食物連鎖**、光合成で有機物をつくる植物を**生産者**といいます。食物連鎖は、生産者から始まります。',
        hint: '有機物を「生み出す」ものだよ。',
      }),
      choice({
        id: 'nature-mp1-p2', concept: 'na-foodchain',
        prompt: 'A 肉食動物、B 草食動物、C 植物 の食物連鎖で、B が急にふえました。そのすぐあと、A と C の数はどうなる？',
        options: ['A はふえ、C は減る', 'A は減り、C はふえる', 'A も C もふえる', 'A も C も減る'],
        answer: 'a',
        explanation: 'B（草食動物）がふえると、B に食べられる C（植物）は減ります。B を食べる A（肉食動物）は、えさがふえるのでふえます。',
        hint: '食べられるものは減り、食べるものはえさがふえるね。',
      }),
      choice({
        id: 'nature-mp1-p3', concept: 'na-foodchain',
        prompt: 'A 肉食動物、B 草食動物、C 植物 の食物連鎖で、A がふえて C が減りました。そのあと、B の数はどうなる？',
        options: ['減る', 'ふえる', '変わらない'],
        answer: 'a',
        explanation: 'B（草食動物）は、A（肉食動物）にたくさん食べられ、えさの C（植物）も少なくなったので、減っていきます。',
        hint: '食べられる数がふえ、えさは減ったね。',
      }),
      choice({
        id: 'nature-mp1-p4', concept: 'na-foodchain',
        prompt: '生物の数量は、ふえたり減ったりしながらも、長い目で見るとほぼ一定に保たれています。このことを「生物の数量の○○○○が保たれている」といいます。○○○○に入る言葉はどれ？',
        options: ['つり合い', '食物網', '循環'],
        answer: 'a',
        explanation: '生物の数量は、一時的に変化しても、やがてもとにもどり、ほぼ一定に保たれます。これを「生物の数量のつり合いが保たれている」といいます。',
        hint: 'てんびんがつり合うときのように、一定に保たれることだよ。',
      }),
      choice({
        id: 'nature-mp1-p5', concept: 'na-foodchain',
        prompt: '草食動物と肉食動物のように、ほかの生物を食べて有機物をとり入れる生物をまとめて何という？',
        options: ['消費者', '生産者', '分解者'],
        answer: 'a',
        explanation: 'ほかの生物を食べて有機物をとり入れる生物を**消費者**といいます。草食動物も肉食動物も消費者です。',
        hint: '生産者がつくった有機物を「消費」するものだよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'nature-mp1-r1', concept: 'na-foodchain',
        prompt: '食物連鎖のはじまりにある、イネや木の実のような植物をまとめて何という？',
        options: ['生産者', '消費者', '分解者'],
        answer: 'a',
        explanation: '植物は、光合成で無機物から有機物をつくるので**生産者**といいます。食物連鎖は、どれも生産者から始まります。',
        hint: '光合成で、自分で有機物をつくるものだよ。',
      }),
      fill({
        id: 'nature-mp1-r2', concept: 'na-foodchain',
        prompt: 'A 肉食動物、B 草食動物、C 植物 の食物連鎖で、B が減りました。空らんに入る言葉を選ぼう。',
        text: 'そのあと、A は[b1]、C は[b2]。',
        blanks: [
          word('b1', ['減り', 'ふえ'], '減り'),
          word('b2', ['減る', 'ふえる'], 'ふえる'),
        ],
        explanation: 'B（草食動物）が減ると、A（肉食動物）はえさが少なくなって減り、C（植物）は食べられる量が減ってふえます。こうして、もとのつり合いにもどっていきます。',
        hint: 'B を食べるもの、B に食べられるものに分けて考えよう。',
      }),
      choice({
        id: 'nature-mp1-r3', concept: 'na-decomposer', term: true,
        prompt: '次の説明に合う言葉はどれ？「生物の死がいやふんにふくまれる有機物を、無機物に分解する生物」',
        options: ['分解者', '生産者', '消費者'],
        answer: 'a',
        explanation: '死がいやふんの有機物を、二酸化炭素や水などの無機物に分解する生物を**分解者**といいます。菌類・細菌類や、ミミズなどの土の中の小動物がそのなかまです。',
        hint: '有機物を「分解」する生物だよ。',
      }),
      choice({
        id: 'nature-mp1-r4', concept: 'na-decomposer',
        prompt: '分解者のうち、目に見えないほど小さな生物（カビ・キノコのなかまや、乳酸菌・大腸菌などのなかま）をまとめて何という？',
        options: ['菌類・細菌類', '草食動物', 'ハチュウ類'],
        answer: 'a',
        explanation: 'カビやキノコは**菌類**、乳酸菌や大腸菌は**細菌類**です。どちらも、生物の死がいやふんの有機物を無機物に分解する分解者です。',
        hint: '「〜菌」とよばれる生物のなかまだよ。',
      }),
    ],
  };

  // ---- ステージ nature-mp2: プリント 2 分解者と炭素の循環（炭素の循環／分会者　落ち葉の実験） ----
  const natureMp2 = {
    id: 'nature-mp2', areaId: 'na-miniprint', title: 'プリント 2: 炭素の循環と分解者の実験', minutes: 5, concepts: ['na-decomposer'],
    lessons: [
      {
        id: 'nature-mp2-c1',
        text: '炭素は、大気中では**二酸化炭素**、生物のからだの中では**有機物**として存在します。植物は光合成で二酸化炭素をとり入れて有機物をつくり、生物は呼吸で有機物を分解して二酸化炭素を出します。こうして炭素は循環しています。',
        // 炭素の循環
        figure: scene(carbonCycle().concat([
          { type: 'text', x: 36, y: 120, text: '光合成', size: 12 },
          { type: 'text', x: 90, y: 136, text: '呼吸', size: 12 },
          { type: 'text', x: 154, y: 120, text: '呼吸', size: 12, anchor: 'end' },
          { type: 'text', x: 258, y: 120, text: '呼吸（分解）', size: 12, anchor: 'end' },
        ])),
      },
      {
        id: 'nature-mp2-c2',
        text: '落ち葉の下の土を水でかき混ぜ、こした液にデンプンを加えて数日置くと、ヨウ素液を加えても色が変わりません。土の中の**菌類・細菌類**がデンプンを分解したからです。液を沸騰させてから同じことをすると、青紫色になります。',
        // 落ち葉の下の土の実験の結果
        figure: scene(soilTestItems().concat([
          { type: 'text', x: 80, y: 222, text: '色が変わらない', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 222, text: '青紫色になる', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'nature-mp2-w1', concept: 'na-decomposer',
      prompt: '予想しよう。森の地面に積もった落ち葉は、年月がたつと形がなくなっていきます。それはなぜだと思う？',
      options: ['土の中の生物が分解するから', '風で全部飛ばされるから', '日光でとけるから'],
      answer: 'a',
      explanation: '落ち葉は、ミミズなどの小動物や、菌類・細菌類などの分解者によって、少しずつ分解されて無機物になります。',
      hint: '落ち葉の下の土の中には、たくさんの生物がいるよ。',
    }),
    problems: [
      figureChoice({
        id: 'nature-mp2-p1', concept: 'na-decomposer',
        prompt: '炭素の循環を表した図です（ア: 大気から植物へ、イ: 植物から大気へ、ウ: 動物から大気へ、エ: 分解者から大気へ向かう矢印）。動物の呼吸によって、炭素が二酸化炭素として大気へもどる矢印はどれ？',
        figure: CARBON_Q,
        answer: 'r3',
        explanation: '動物は、食べた有機物を呼吸で分解し、二酸化炭素を出します。動物から大気へ向かう矢印（ウ）です。',
        hint: '動物から出ている、上向きの矢印をさがそう。',
      }),
      fill({
        id: 'nature-mp2-t1', concept: 'na-decomposer', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '炭素は、大気中では[b1]として、生物のからだの中では主に[b2]として存在している。',
        blanks: [
          word('b1', ['二酸化炭素', '酸素', '窒素'], '二酸化炭素'),
          word('b2', ['有機物', '無機物', '酸素'], '有機物'),
        ],
        explanation: '大気中の炭素は**二酸化炭素**です。植物が光合成でとり入れると、デンプンなどの**有機物**になり、食物連鎖を通して動物のからだに移ります。',
        hint: '植物が光合成でとり入れる気体は？',
      }),
      choice({
        id: 'nature-mp2-p2', concept: 'na-decomposer',
        prompt: '落ち葉の下の土を水でかき混ぜてこした液に、デンプン溶液を加えて数日置きました。この液にヨウ素液を加えると、どうなる？',
        options: ['色が変化しない（青紫色にならない）', '青紫色になる', '赤色になる'],
        answer: 'a',
        explanation: '土の中の菌類・細菌類が、デンプンを分解してしまったので、ヨウ素液を加えても青紫色になりません。',
        hint: '土の中の小さな生物が、デンプンをどうしたかな。',
      }),
      choice({
        id: 'nature-mp2-p3', concept: 'na-decomposer',
        prompt: '落ち葉の下の土を使った実験で、デンプンがなくなった原因となった生物はどれ？',
        options: ['菌類・細菌類', 'ミミズやダンゴムシ', '植物の根'],
        answer: 'a',
        explanation: 'こした液には、目に見えるミミズなどの小動物は入っていません。液の中の目に見えない菌類・細菌類が、デンプンを分解しました。',
        hint: '液をこしたので、目に見える生物は入っていないよ。',
      }),
      choice({
        id: 'nature-mp2-p4', concept: 'na-decomposer',
        prompt: '炭素の循環で、植物が大気中の二酸化炭素をとり入れて有機物をつくるはたらきを何という？',
        options: ['光合成', '呼吸', '蒸散'],
        answer: 'a',
        explanation: '植物は、光合成で二酸化炭素と水からデンプンなどの有機物をつくります。このはたらきで、大気中の炭素が生物のからだにとりこまれます。',
        hint: '日光を使って養分をつくるはたらきだよ。',
      }),
      choice({
        id: 'nature-mp2-p5', concept: 'na-decomposer',
        prompt: '炭素の循環で、生物が有機物を分解してエネルギーをとり出し、二酸化炭素を出すはたらきを何という？',
        options: ['呼吸', '光合成', '消化'],
        answer: 'a',
        explanation: '植物・動物・分解者はどれも、呼吸で有機物を分解して二酸化炭素を出します。この二酸化炭素が、大気へもどります。',
        hint: '酸素を使って、二酸化炭素を出すはたらきだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'nature-mp2-r1', concept: 'na-decomposer',
        prompt: '炭素の循環を表した図です（ア: 大気から植物へ、イ: 植物から大気へ、ウ: 動物から大気へ、エ: 分解者から大気へ向かう矢印）。死がいやふんの有機物が分解され、二酸化炭素として大気へもどる矢印はどれ？',
        figure: CARBON_Q,
        answer: 'r4',
        explanation: '分解者は、死がいやふんの有機物を分解し、二酸化炭素を出します。分解者から大気へ向かう矢印（エ）です。',
        hint: '死がいやふんを分解するのは、どの生物だったかな。',
      }),
      choice({
        id: 'nature-mp2-r2', concept: 'na-decomposer',
        prompt: '落ち葉の下の土の実験で、こした液を一度沸騰させてから、デンプン溶液を加えて数日置きました。ヨウ素液を加えると、どうなる？',
        options: ['青紫色になる', '色が変化しない', '赤色になる'],
        answer: 'a',
        explanation: '沸騰させると、液の中の菌類・細菌類が死んでしまうので、デンプンが分解されずに残ります。だから、ヨウ素液で青紫色になります。',
        hint: '沸騰させると、液の中の生物はどうなるかな。',
      }),
      choice({
        id: 'nature-mp2-r3', concept: 'na-decomposer',
        prompt: '動物のからだにふくまれる炭素は、主に何として存在している？',
        options: ['有機物', '二酸化炭素', '酸素'],
        answer: 'a',
        explanation: '動物は、植物やほかの動物を食べて有機物をとり入れます。からだをつくるタンパク質や脂肪などの有機物の中に、炭素がふくまれています。',
        hint: '食物連鎖を通して移っていくものだよ。',
      }),
    ],
  };

  // ---- ステージ nature-mp3: プリント 3 川の生物と科学技術（川の環境調査／発電について／科学技術の発展） ----
  const natureMp3 = {
    id: 'nature-mp3', areaId: 'na-miniprint', title: 'プリント 3: 川の水生生物と発電・科学技術', minutes: 5, concepts: ['na-environment', 'na-energy'],
    lessons: [
      {
        id: 'nature-mp3-c1',
        text: '川にすむ水生生物を調べると、水のよごれの程度が分かります。このような生物を**指標生物**といいます。カワゲラ・ヘビトンボは**きれいな水**、カワニナ・ゲンジボタルは**少しきたない水**、タニシ・ミズカマキリは**きたない水**、アメリカザリガニ・エラミミズは**大変きたない水**にすみます。',
        // 水のよごれの程度と指標生物
        figure: scene([
          ...[['きれいな水', 'カワゲラ・ヘビトンボ', 'sky'], ['少しきたない水', 'カワニナ・ゲンジボタル', 'lightgreen'], ['きたない水', 'タニシ・ミズカマキリ', 'sand'], ['大変きたない水', 'アメリカザリガニ・エラミミズ', 'rock']].flatMap(([a, b, fill], i) => [
            { type: 'rect', x: 8, y: 16 + 54 * i, width: 304, height: 46, rx: 6, fill, stroke: 'line' },
            { type: 'text', x: 18, y: 44 + 54 * i, text: a, size: 13, bold: true },
            { type: 'text', x: 304, y: 44 + 54 * i, text: b, size: 12, anchor: 'end' },
          ]),
        ]),
      },
      {
        id: 'nature-mp3-c2',
        text: '**火力発電**は石油・石炭・天然ガスを燃やすので二酸化炭素を出し、資源にも限りがあります。**原子力発電**はウランを使い、放射性廃棄物の処理が問題です。**水力発電**はダムの水を使いますが、ダムをつくれる場所が限られ、自然環境を変えてしまいます。',
        // 3 つの発電の燃料・材料と短所
        figure: scene([
          ...[['火力発電', '石油・石炭・天然ガス', '二酸化炭素を出す'], ['原子力発電', 'ウラン', '放射性廃棄物の処理'], ['水力発電', 'ダムにためた水', '場所が限られ、環境を変える']].flatMap(([a, b, c], i) => [
            { type: 'rect', x: 8, y: 14 + 74 * i, width: 304, height: 66, rx: 6, fill: ['#FFF3C4', 'glass', 'sky'][i], stroke: 'line' },
            { type: 'text', x: 18, y: 40 + 74 * i, text: a, size: 14, bold: true },
            { type: 'text', x: 120, y: 40 + 74 * i, text: b, size: 12 },
            { type: 'text', x: 120, y: 64 + 74 * i, text: '短所: ' + c, size: 12 },
          ]),
        ]),
      },
      {
        id: 'nature-mp3-c3',
        text: 'ワットが改良した**蒸気機関**は、工業の発展を支えました。今は、ガソリンエンジンとモーターで走る**ハイブリッドカー**や電気自動車などの低公害車、温めるともとの形にもどる**形状記憶合金**、とても低い温度で電気抵抗が 0 になる**超伝導**の物質などが使われています。',
        // 科学技術の例
        figure: scene([
          ...[['蒸気機関', 'ワットが改良。工業が発展'], ['ハイブリッドカー', 'エンジン ＋ モーターで走る'], ['形状記憶合金', '温めると、もとの形にもどる'], ['超伝導の物質', 'とても低温で電気抵抗が 0']].flatMap(([a, b], i) => [
            { type: 'rect', x: 8, y: 14 + 54 * i, width: 304, height: 46, rx: 6, fill: 'white', stroke: 'line' },
            { type: 'text', x: 18, y: 42 + 54 * i, text: a, size: 13, bold: true },
            { type: 'text', x: 304, y: 42 + 54 * i, text: b, size: 12, anchor: 'end' },
          ]),
        ]),
      },
    ],
    warmup: choice({
      id: 'nature-mp3-w1', concept: 'na-environment',
      prompt: '予想しよう。カワゲラやヘビトンボの幼虫がたくさん見つかった川の水は、どんな水だと思う？',
      options: ['きれいな水', '大変きたない水', '海の水'],
      answer: 'a',
      explanation: 'カワゲラやヘビトンボは、きれいな水にしかすめない指標生物です。この生物が見つかれば、その川の水はきれいだと考えられます。',
      hint: '指標生物は、水のよごれの程度を教えてくれるよ。',
    }),
    problems: [
      figureChoice({
        id: 'nature-mp3-p1', concept: 'na-environment',
        prompt: '川の 4 つの地点（ア〜エ）で見つかった水生生物を、それぞれの下の四角に書いた図です（ア: カワニナ・ゲンジボタル、イ: アメリカザリガニ・エラミミズ、ウ: カワゲラ・ヘビトンボ、エ: タニシ・ミズカマキリ）。大変きたない水の地点はどれ？',
        figure: RIVER4_Q,
        answer: 'r2',
        explanation: 'アメリカザリガニやエラミミズは、大変きたない水でも生きられる指標生物です。だから、イが大変きたない水の地点です。',
        hint: 'アメリカザリガニは、よごれた水にもすめるよ。',
      }),
      fill({
        id: 'nature-mp3-t1', concept: 'na-energy', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '変形させても、温めるともとの形にもどる合金を[b1]という。とても低い温度で電気抵抗が 0 になる現象を[b2]という。',
        blanks: [
          word('b1', ['形状記憶合金', 'ステンレス', '青銅'], '形状記憶合金'),
          word('b2', ['超伝導', '電磁誘導', '放電'], '超伝導'),
        ],
        explanation: 'もとの形を「記憶」している合金が**形状記憶合金**です。とても低い温度で電気抵抗が 0 になる現象を**超伝導**といい、リニアモーターカーなどに利用されています。',
        hint: '「形を記憶する」合金と、「超」がつく現象だよ。',
      }),
      choice({
        id: 'nature-mp3-p2', concept: 'na-environment',
        prompt: 'ゲンジボタルがすむ水に、いっしょにすんでいることが多い水生生物はどれ？（ゲンジボタルの幼虫のえさにもなる）',
        options: ['カワニナ', 'カワゲラ', 'サカマキガイ'],
        answer: 'a',
        explanation: 'ゲンジボタルの幼虫は、カワニナという巻き貝を食べて育ちます。どちらも、少しきたない水にすむ指標生物です。',
        hint: '巻き貝のなかまで、ゲンジボタルの幼虫のえさになるよ。',
      }),
      choice({
        id: 'nature-mp3-p3', concept: 'na-energy',
        prompt: '火力発電の燃料と、短所の組み合わせとして正しいものはどれ？',
        options: ['石油・石炭・天然ガス／二酸化炭素を多く出し、資源に限りがある', 'ウラン／放射性廃棄物の処理がむずかしい', 'ダムにためた水／ダムをつくれる場所が限られる'],
        answer: 'a',
        explanation: '火力発電は、化石燃料（石油・石炭・天然ガス）を燃やして発電します。燃やすと二酸化炭素を多く出し、化石燃料はいつかなくなる資源です。',
        hint: '「火」で燃やすものは何かな。',
      }),
      choice({
        id: 'nature-mp3-p4', concept: 'na-energy',
        prompt: '原子力発電で使う材料と、短所の組み合わせとして正しいものはどれ？',
        options: ['ウラン／放射性廃棄物の処理がむずかしく、事故が起こると放射線の被害が大きい', '石炭／二酸化炭素を多く出す', '太陽の光／天気によって発電量が変わる'],
        answer: 'a',
        explanation: '原子力発電は、ウランの核分裂で出る熱で発電します。二酸化炭素はほとんど出しませんが、放射性廃棄物の処理や、事故のときの放射線の危険が問題です。',
        hint: '原子核が分裂するときのエネルギーを使う発電だよ。',
      }),
      choice({
        id: 'nature-mp3-p5', concept: 'na-energy',
        prompt: '水力発電で使うものと、短所の組み合わせとして正しいものはどれ？',
        options: ['ダムにためた水／ダムをつくれる場所が限られ、川の自然環境を変えてしまう', '天然ガス／資源に限りがある', 'ウラン／放射性廃棄物が出る'],
        answer: 'a',
        explanation: '水力発電は、ダムにためた高い所の水を落として発電機を回します。燃料はいりませんが、ダムをつくれる場所が限られ、川の生物の環境も変わります。',
        hint: '高い所から落ちる水の力を使う発電だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'nature-mp3-r1', concept: 'na-environment',
        prompt: '川の 4 つの地点（ア〜エ）で見つかった水生生物の図です（ア: カワニナ・ゲンジボタル、イ: アメリカザリガニ・エラミミズ、ウ: カワゲラ・ヘビトンボ、エ: タニシ・ミズカマキリ）。少しきたない水の地点はどれ？',
        figure: RIVER4_Q,
        answer: 'r1',
        explanation: 'カワニナやゲンジボタルは、少しきたない水にすむ指標生物です。だから、アが少しきたない水の地点です。',
        hint: 'ゲンジボタルがすむのは、どんな水だったかな。',
      }),
      figureChoice({
        id: 'nature-mp3-r2', concept: 'na-environment',
        prompt: '川の 4 つの地点（ア〜エ）で見つかった水生生物の図です（ア: カワニナ・ゲンジボタル、イ: アメリカザリガニ・エラミミズ、ウ: カワゲラ・ヘビトンボ、エ: タニシ・ミズカマキリ）。きれいな水の地点はどれ？',
        figure: RIVER4_Q,
        answer: 'r3',
        explanation: 'カワゲラやヘビトンボは、きれいな水にしかすめない指標生物です。だから、ウがきれいな水の地点です。',
        hint: 'カワゲラは、きれいな水の指標生物だよ。',
      }),
      choice({
        id: 'nature-mp3-r3', concept: 'na-environment',
        prompt: 'タニシやミズカマキリが多く見つかった地点の水は、どの程度のよごれだと考えられる？',
        options: ['きたない水', 'きれいな水', '少しきたない水', '大変きたない水'],
        answer: 'a',
        explanation: 'タニシやミズカマキリは、きたない水にすむ指標生物です。きれいな水 → 少しきたない水 → きたない水 → 大変きたない水 の 4 つのうち、3 番目です。',
        hint: '指標生物の 4 つの段階を思い出そう。',
      }),
      choice({
        id: 'nature-mp3-r4', concept: 'na-energy',
        prompt: 'ワットが改良し、工業の発展を大きく支えた動力のしくみはどれ？',
        options: ['蒸気機関', 'ガソリンエンジン', 'モーター'],
        answer: 'a',
        explanation: '18 世紀にワットが改良した蒸気機関は、水蒸気の力で機械を動かし、工場や鉄道などで使われて、工業の発展を支えました。',
        hint: '水を熱してできる気体の力を使うよ。',
      }),
      choice({
        id: 'nature-mp3-r5', concept: 'na-energy',
        prompt: 'ガソリンエンジンとモーターを組み合わせて走る自動車を何という？',
        options: ['ハイブリッドカー', '燃料電池自動車', '蒸気自動車'],
        answer: 'a',
        explanation: 'ガソリンエンジンとモーターを組み合わせて走る自動車を**ハイブリッドカー**といいます。ガソリンの使用量が少なく、低公害車の 1 つです。',
        hint: '「ハイブリッド」は、組み合わせという意味だよ。',
      }),
      choice({
        id: 'nature-mp3-r6', concept: 'na-energy',
        prompt: '次のうち、走るときに二酸化炭素などの排出ガスを出さない低公害車はどれ？',
        options: ['電気自動車', 'ふつうのガソリン車', 'ディーゼル車'],
        answer: 'a',
        explanation: '電気自動車は、電池にためた電気でモーターを回して走るので、走るときに排出ガスを出しません。燃料電池自動車も低公害車です。',
        hint: 'エンジンを使わずに走る自動車だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（確認問題つき）
  // ================================================================
  const concepts = [
    {
      id: 'na-foodchain', title: '食物連鎖と数量の関係', basic: null, lessonStageId: 'nature-1',
      checkPool: [
        choice({
          id: 'na-foodchain-k1', concept: 'na-foodchain',
          prompt: '「イネ → バッタ → カエル → ヘビ」の食物連鎖で、草食動物はどれ？',
          options: ['バッタ', 'カエル', 'ヘビ'],
          answer: 'a',
          explanation: 'バッタは植物のイネを食べる草食動物です。カエルとヘビは、ほかの動物を食べる肉食動物です。',
          hint: '植物を食べている動物はどれかな。',
        }),
        fill({
          id: 'na-foodchain-k2', concept: 'na-foodchain',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '食物連鎖がたがいにからみ合い、網の目のようになったつながりを[b1]という。',
          blanks: [word('b1', ['食物網', '食物連鎖', '生態系'], '食物網')],
          explanation: '1 種類の生物が何種類もの生物を食べたり食べられたりするので、食物連鎖は網の目のようにつながります。これを食物網といいます。',
          hint: '「網」の字が入る言葉だよ。',
        }),
        choice({
          id: 'na-foodchain-k3', concept: 'na-foodchain',
          prompt: '生物の数量のピラミッドで、いちばん下の段にくるのはどれ？',
          options: ['植物（生産者）', '草食動物', '肉食動物'],
          answer: 'a',
          explanation: 'いちばん数量が多いのは植物（生産者）なので、ピラミッドのいちばん下の段になります。上の段ほど数量が少なくなります。',
          hint: '数量がいちばん多いのはどれかな。',
        }),
      ],
    },
    {
      id: 'na-decomposer', title: '分解者と物質の循環', basic: 'na-foodchain', lessonStageId: 'nature-2',
      checkPool: [
        choice({
          id: 'na-decomposer-k1', concept: 'na-decomposer',
          prompt: '菌類や細菌類は、有機物をどのようにして無機物に分解している？',
          options: ['呼吸によって', '光合成によって', '蒸散によって'],
          answer: 'a',
          explanation: '菌類や細菌類は、呼吸によって有機物を二酸化炭素や水などの無機物に分解し、生きるためのエネルギーを得ています。',
          hint: '動物と同じように、生きるためのエネルギーを得るはたらきだよ。',
        }),
        fill({
          id: 'na-decomposer-k2', concept: 'na-decomposer',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '植物は光合成で、大気中の[b1]をとり入れて有機物をつくる。',
          blanks: [word('b1', ['二酸化炭素', '酸素', '窒素'], '二酸化炭素')],
          explanation: '植物は光合成で大気中の二酸化炭素をとり入れ、有機物をつくります。こうして炭素が生物の体にとりこまれます。',
          hint: '炭素をふくむ気体だよ。',
        }),
        choice({
          id: 'na-decomposer-k3', concept: 'na-decomposer',
          prompt: '土の中にすみ、落ち葉などを食べて細かくし、分解にかかわる小動物はどれ？',
          options: ['ダンゴムシ', 'メダカ', 'カラス'],
          answer: 'a',
          explanation: 'ダンゴムシやミミズは、落ち葉などを食べて細かくし、分解にかかわっています。細かくなったものは、菌類や細菌類によってさらに分解されます。',
          hint: '落ち葉の下の土にいる生物だよ。',
        }),
      ],
    },
    {
      id: 'na-environment', title: '環境の変化と保全', basic: null, lessonStageId: 'nature-3',
      checkPool: [
        choice({
          id: 'na-environment-k1', concept: 'na-environment',
          prompt: 'カワゲラやサワガニがたくさん見つかった川の水は、どんな水だと考えられる？',
          options: ['きれいな水', 'きたない水', 'とてもきたない水'],
          answer: 'a',
          explanation: 'カワゲラやサワガニは、きれいな水にすむ指標生物です。見つかった生物の種類から、水のよごれの程度がわかります。',
          hint: 'きれいな水の指標生物を思い出そう。',
        }),
        fill({
          id: 'na-environment-k2', concept: 'na-environment',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'フロンなどによってこわされる、紫外線を吸収する大気の層を[b1]という。',
          blanks: [word('b1', ['オゾン層', '温室効果ガス', '酸性雨'], 'オゾン層')],
          explanation: 'オゾン層は、太陽からの紫外線の多くを吸収しています。フロンの使用を減らすなど、オゾン層を守る取り組みが進められています。',
          hint: '「〜層」という名前だよ。',
        }),
        choice({
          id: 'na-environment-k3', concept: 'na-environment',
          prompt: 'もとからその地域にすんでいる生物を何という？',
          options: ['在来種', '外来種', '指標生物'],
          answer: 'a',
          explanation: 'もとからその地域にすむ生物を在来種、人間の活動によってほかの地域から持ちこまれた生物を外来種といいます。',
          hint: '外来種と反対の意味の言葉だよ。',
        }),
      ],
    },
    {
      id: 'na-energy', title: 'エネルギー資源と科学技術', basic: null, lessonStageId: 'nature-4',
      checkPool: [
        choice({
          id: 'na-energy-k1', concept: 'na-energy',
          prompt: '原子力発電の燃料はどれ？',
          options: ['ウラン', '石炭', '天然ガス'],
          answer: 'a',
          explanation: '原子力発電は、ウランなどの核燃料の核分裂で出る熱を使います。石炭と天然ガスは、火力発電の燃料（化石燃料）です。',
          hint: '核燃料の名前だよ。',
        }),
        fill({
          id: 'na-energy-k2', concept: 'na-energy',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'エネルギーは、すがたを変えても、その総量は変わらない。これを[b1]という。',
          blanks: [word('b1', ['エネルギーの保存', '変換効率', '質量保存の法則'], 'エネルギーの保存')],
          explanation: 'エネルギーが別のエネルギーに変わっても、全部を合わせた量は変わりません。これをエネルギーの保存（エネルギー保存の法則）といいます。',
          hint: '「保存」は「変わらずに保たれる」という意味だよ。',
        }),
        choice({
          id: 'na-energy-k3', concept: 'na-energy',
          prompt: '太陽光発電で、光電池（太陽電池）が直接変えているエネルギーはどれ？',
          options: ['光エネルギーを電気エネルギーに', '熱エネルギーを電気エネルギーに', '位置エネルギーを電気エネルギーに'],
          answer: 'a',
          explanation: '光電池は、太陽の光エネルギーを直接、電気エネルギーに変えます。発電機を回さずに発電できます。',
          hint: '太陽から届くのは、何のエネルギーかな。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'nature',
    title: '自然と人間',
    mascot: 'A',   // 担当の先生（まる先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'na-ecosystem', title: '生態系', order: 1, stages: [nature1, nature2] },
      { id: 'na-human', title: '人間と環境', order: 2, stages: [nature3, nature4] },
      { id: 'na-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [natureMp1, natureMp2, natureMp3] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
