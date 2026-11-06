// 「植物のなかま」教材データ（中学1年 理科）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通指示 .ai-tasks/20261104-170000_単元教材の共通指示.md）。
// 2 領域 × 2 ステージ（花と種子・からだのつくりと分類）と、概念 5 つ。
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

  // ---- 植物の図の部品（汎用の部品を組み合わせる） ----

  // 引き出し線（細い点線）
  function leader(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'gray', width: 1, dashed: true };
  }

  // 花の断面（アブラナやサクラのような花を、たてに切ったようす）
  // 柱頭 (160, 90)、やく (126, 100)・(194, 100)、子房 (160, 180)、胚珠 (152, 182)・(168, 182)
  function flower() {
    return [
      { type: 'line', points: [[160, 206], [160, 238]], color: 'green', width: 5 },
      // 花弁（左右）
      { type: 'polygon', points: [[142, 202], [100, 184], [62, 112], [82, 98], [128, 164]], fill: 'pink' },
      { type: 'polygon', points: [[178, 202], [220, 184], [258, 112], [238, 98], [192, 164]], fill: 'pink' },
      // がく（左右）
      { type: 'polygon', points: [[146, 208], [110, 204], [96, 184], [130, 196]], fill: 'green' },
      { type: 'polygon', points: [[174, 208], [210, 204], [224, 184], [190, 196]], fill: 'green' },
      // おしべ（花糸とやく）
      { type: 'line', points: [[144, 196], [126, 106]], color: 'line', width: 3 },
      { type: 'line', points: [[176, 196], [194, 106]], color: 'line', width: 3 },
      { type: 'ellipse', x: 126, y: 100, rx: 8, ry: 6, fill: 'yellow' },
      { type: 'ellipse', x: 194, y: 100, rx: 8, ry: 6, fill: 'yellow' },
      // めしべ（柱頭・子房）と胚珠
      { type: 'line', points: [[160, 162], [160, 96]], color: 'green', width: 4 },
      { type: 'circle', x: 160, y: 90, r: 7, fill: 'green' },
      { type: 'ellipse', x: 160, y: 180, rx: 22, ry: 20, fill: 'lightgreen' },
      { type: 'circle', x: 152, y: 182, r: 6, fill: 'white' },
      { type: 'circle', x: 168, y: 182, r: 6, fill: 'white' },
    ];
  }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/plants/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/plants/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // アブラナの花をたてに切った写真（plants-1-c2 の画像）: 柱頭 (155, 34)、やく (185〜210, 40〜84)、子房の右はし (181, 172)、胚珠 (154, 176)
  function flowerPhotoOvary() {
    return [
      pointer(242, 180, 183, 176), tag(262, 184, '子房'),
      pointer(56, 196, 151, 178), tag(40, 200, '胚珠'),
    ];
  }

  // マツの枝: 新しい枝の先に雌花 (196, 36)・(206, 46)、根もとに雄花の集まり (140〜172, 128〜146)、古い枝に 1 年前の雌花 (92, 194)
  function pineBranch() {
    return [
      { type: 'line', points: [[20, 226], [150, 146]], color: 'brown', width: 6 },
      { type: 'line', points: [[60, 201], [48, 180]], color: 'green', width: 2 },
      { type: 'line', points: [[60, 201], [72, 182]], color: 'green', width: 2 },
      { type: 'line', points: [[118, 166], [106, 145]], color: 'green', width: 2 },
      { type: 'line', points: [[118, 166], [130, 147]], color: 'green', width: 2 },
      { type: 'line', points: [[150, 146], [196, 44]], color: 'green', width: 4 },
      { type: 'line', points: [[173, 95], [153, 85]], color: 'green', width: 2 },
      { type: 'line', points: [[173, 95], [193, 91]], color: 'green', width: 2 },
      { type: 'line', points: [[182, 75], [162, 65]], color: 'green', width: 2 },
      { type: 'line', points: [[182, 75], [202, 71]], color: 'green', width: 2 },
      // 雌花（新しい枝の先）
      { type: 'ellipse', x: 196, y: 36, rx: 7, ry: 9, fill: 'purple' },
      { type: 'ellipse', x: 206, y: 46, rx: 6, ry: 8, fill: 'purple' },
      // 雄花（新しい枝の根もとに集まる）
      { type: 'ellipse', x: 146, y: 130, rx: 6, ry: 9, fill: 'yellow' },
      { type: 'ellipse', x: 158, y: 128, rx: 6, ry: 9, fill: 'yellow' },
      { type: 'ellipse', x: 140, y: 146, rx: 6, ry: 9, fill: 'yellow' },
      { type: 'ellipse', x: 166, y: 142, rx: 6, ry: 9, fill: 'yellow' },
      // 1 年前の雌花（古い枝）
      { type: 'ellipse', x: 92, y: 194, rx: 9, ry: 11, fill: 'green' },
    ];
  }

  // 写真: 左から 網状脈の葉（ア）・平行脈の葉（イ）・主根と側根（ウ）・ひげ根（エ）。選ぶ場所は それぞれの下
  // 画像は 640×480（座標は画像の位置 × 0.5）。4 つの x の範囲: 6〜80、92〜138、148〜228、235〜315（y は 185 まで）
  const LEAF_ROOT = scene([
    photo('plants-3-p2'),
    { type: 'region', id: 'r1', x: 43, y: 212, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 115, y: 212, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 188, y: 212, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 275, y: 212, r: 22, label: 'エ' },
  ]);

  // イヌワラビ（シダ植物）: 地面 y=130、地下茎 y=160、地上に出ているのは葉
  function fern() {
    return [
      { type: 'rect', x: 10, y: 130, width: 300, height: 100, fill: 'sand', stroke: 'none' },
      { type: 'line', points: [[10, 130], [310, 130]], color: 'brown', width: 3 },
      // 根
      { type: 'line', points: [[80, 164], [70, 200]], color: 'line', width: 2 },
      { type: 'line', points: [[110, 164], [116, 204]], color: 'line', width: 2 },
      { type: 'line', points: [[150, 164], [142, 206]], color: 'line', width: 2 },
      { type: 'line', points: [[190, 164], [198, 204]], color: 'line', width: 2 },
      { type: 'line', points: [[230, 164], [224, 200]], color: 'line', width: 2 },
      // 地下茎
      { type: 'line', points: [[60, 160], [250, 160]], color: 'brown', width: 7 },
      // 葉（2 枚）
      { type: 'line', points: [[120, 160], [110, 40]], color: 'green', width: 3 },
      { type: 'line', points: [[112, 60], [90, 52]], color: 'green', width: 4 },
      { type: 'line', points: [[112, 60], [134, 52]], color: 'green', width: 4 },
      { type: 'line', points: [[113, 80], [89, 72]], color: 'green', width: 4 },
      { type: 'line', points: [[113, 80], [137, 72]], color: 'green', width: 4 },
      { type: 'line', points: [[115, 100], [89, 92]], color: 'green', width: 4 },
      { type: 'line', points: [[115, 100], [141, 92]], color: 'green', width: 4 },
      { type: 'line', points: [[190, 160], [210, 50]], color: 'green', width: 3 },
      { type: 'line', points: [[206, 70], [184, 62]], color: 'green', width: 4 },
      { type: 'line', points: [[206, 70], [228, 62]], color: 'green', width: 4 },
      { type: 'line', points: [[203, 90], [179, 82]], color: 'green', width: 4 },
      { type: 'line', points: [[203, 90], [227, 82]], color: 'green', width: 4 },
      { type: 'line', points: [[199, 110], [173, 102]], color: 'green', width: 4 },
      { type: 'line', points: [[199, 110], [225, 102]], color: 'green', width: 4 },
    ];
  }

  // 種子植物の分け方（4 つのなかまに ア〜エ）。行の y: ア 36、イ 92、ウ 148、エ 204
  const SEED_TREE = scene([
    { type: 'line', points: [[16, 36], [16, 134]], width: 2 },
    { type: 'line', points: [[16, 36], [260, 36]], width: 2 },
    { type: 'line', points: [[16, 134], [84, 134]], width: 2 },
    { type: 'line', points: [[84, 92], [84, 176]], width: 2 },
    { type: 'line', points: [[84, 92], [260, 92]], width: 2 },
    { type: 'line', points: [[84, 176], [150, 176]], width: 2 },
    { type: 'line', points: [[150, 148], [150, 204]], width: 2 },
    { type: 'line', points: [[150, 148], [260, 148]], width: 2 },
    { type: 'line', points: [[150, 204], [260, 204]], width: 2 },
    { type: 'text', x: 24, y: 30, text: '子房なし', size: 12 },
    { type: 'text', x: 20, y: 128, text: '子房あり', size: 12 },
    { type: 'text', x: 92, y: 86, text: '子葉1枚', size: 12 },
    { type: 'text', x: 90, y: 170, text: '子葉2枚', size: 12 },
    { type: 'text', x: 156, y: 142, text: '花弁がくっつく', size: 12 },
    { type: 'text', x: 156, y: 198, text: '花弁が離れている', size: 12 },
    { type: 'region', id: 'r1', x: 290, y: 36, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 290, y: 92, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 290, y: 148, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 290, y: 204, r: 22, label: 'エ' },
  ]);

  // ================================================================
  // 領域 1: 花と種子
  // ================================================================

  // ---- ステージ plants-1: 花のつくり（花の各部分、受粉、果実と種子、ルーペ） ----
  const plants1 = {
    id: 'plants-1', areaId: 'flower', title: '花のつくり', minutes: 5, concepts: ['pl-flower'],
    lessons: [
      {
        id: 'plants-1-c1',
        text: '花は、外側から**がく**・**花弁**・**おしべ**・**めしべ**の順に並んでいます。アブラナやサクラの花を、外側から 1 つずつピンセットではずしていくと、この順に出てきます。',
        // 写真: アブラナの花を分解し、外側から順に左→右に並べた（がく 4・花弁 4・おしべ 6・めしべ 1）
        figure: scene([
          photo('plants-1-c1'),
          tag(38, 176, 'がく'),
          tag(126, 176, '花弁'),
          tag(226, 176, 'おしべ'),
          tag(294, 176, 'めしべ'),
          { type: 'arrow', x1: 62, y1: 210, x2: 260, y2: 210, color: 'blue', width: 2 },
          tag(34, 215, '外側', { size: 13 }),
          tag(288, 215, '内側', { size: 13 }),
        ]),
      },
      {
        id: 'plants-1-c2',
        text: 'おしべの先の小さなふくろを**やく**といい、中に花粉が入っています。めしべの先を**柱頭**、根もとのふくらんだ部分を**子房**といいます。子房の中には、**胚珠**という小さな粒があります。',
        // 写真: アブラナの花をたてに切った断面（子房の中に胚珠が並ぶ）
        figure: scene([
          photo('plants-1-c2'),
          pointer(46, 24, 149, 33), tag(30, 26, '柱頭'),
          pointer(266, 26, 201, 58), tag(282, 26, 'やく'),
        ].concat(flowerPhotoOvary())),
      },
      {
        id: 'plants-1-c3',
        text: '花粉がめしべの柱頭につくことを**受粉**といいます。受粉すると、子房は成長して**果実**になり、子房の中の胚珠は**種子**になります。',
        // 写真: アブラナの花 → 花のあとのさや（果実）→ さやを開いた中の種子
        figure: scene([
          photo('plants-1-c3'),
          { type: 'arrow', x1: 115, y1: 86, x2: 153, y2: 86, color: 'blue', width: 3 },
          tag(134, 76, '受粉', { size: 13 }),
          { type: 'arrow', x1: 186, y1: 86, x2: 250, y2: 86, color: 'blue', width: 2 },
          tag(218, 76, 'さやを開く', { size: 13 }),
          tag(60, 184, '花', { size: 16, bold: true }),
          tag(60, 204, '（アブラナ）', { size: 13 }),
          tag(165, 184, '果実', { size: 16, bold: true }),
          tag(165, 204, '（もとは子房）', { size: 13 }),
          tag(268, 184, '種子', { size: 16, bold: true }),
          tag(268, 204, '（もとは胚珠）', { size: 13 }),
          pointer(266, 167, 258, 124),
        ]),
      },
      {
        id: 'plants-1-c4',
        text: '花を観察するときは、**ルーペ**を目に近づけて持ちます。観察するものが動かせるときは、花を前後に動かして、よく見える位置をさがします。ルーペで太陽を見てはいけません。',
        // 写真: ルーペを目のすぐ近くに持ち、手に持った花を前後に動かして見る
        figure: scene([
          photo('plants-1-c4'),
          pointer(188, 46, 137, 84),
          tag(250, 42, 'ルーペは目に近づける', { size: 13 }),
          { type: 'arrow', x1: 207, y1: 104, x2: 184, y2: 104, color: 'blue', width: 2 },
          { type: 'arrow', x1: 207, y1: 104, x2: 234, y2: 104, color: 'blue', width: 2 },
          tag(262, 136, '花を前後に動かす', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'plants-1-w1', concept: 'pl-flower',
      prompt: '予想しよう。アブラナの花を、外側から 1 つずつはずしていきます。いちばん最後（花のまん中）に残るのはどれだと思う？',
      options: ['がく', '花弁', 'めしべ'],
      answer: 'c',
      explanation: '花のまん中にあるのはめしべです。花のつくりがどんな順に並んでいるかを、このステージで確かめよう。',
      hint: '花のいちばん中心にある、1 本の部分を思い出そう。',
    }),
    problems: [
      choice({
        id: 'plants-1-p1', concept: 'pl-flower',
        prompt: 'アブラナの花のつくりを、外側から順に並べたものはどれ？',
        options: ['がく → 花弁 → おしべ → めしべ', '花弁 → がく → めしべ → おしべ', 'めしべ → おしべ → 花弁 → がく', 'がく → おしべ → 花弁 → めしべ'],
        answer: 'a',
        explanation: '花は外側から、がく・花弁・おしべ・めしべの順に並んでいます。いちばん外で花を支えるのががく、中心にあるのがめしべです。',
        hint: 'いちばん外側は緑色の小さな部分、中心は 1 本の部分だよ。',
      }),
      fill({
        id: 'plants-1-t1', concept: 'pl-flower', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'めしべの先を[b1]といい、めしべの根もとのふくらんだ部分を[b2]という。',
        blanks: [
          word('b1', ['柱頭', '子房', 'やく'], '柱頭'),
          word('b2', ['柱頭', '子房', 'やく'], '子房'),
        ],
        explanation: 'めしべの先が**柱頭**、根もとのふくらんだ部分が**子房**です。やくは、おしべの先にある花粉の入ったふくろです。',
        hint: '花粉がつく「頭」の部分と、中に胚珠が入っている「部屋」の部分だよ。',
      }),
      figureChoice({
        id: 'plants-1-p2', concept: 'pl-flower',
        prompt: '花をたてに切った図です。ア〜エのうち、受粉したあと種子になるのはどれ？（ア: めしべの先、イ: おしべの先のふくろ、ウ: めしべの根もとのふくらんだ部分、エ: ウの中にある小さな粒）',
        figure: scene(flower().concat([
          leader(232, 48, 166, 88),
          leader(40, 60, 120, 98),
          leader(40, 200, 144, 192),
          leader(282, 200, 172, 184),
          { type: 'region', id: 'r1', x: 232, y: 48, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 40, y: 60, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 40, y: 200, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 282, y: 200, r: 22, label: 'エ' },
        ])),
        answer: 'r4',
        explanation: '種子になるのは、子房の中にある胚珠（エ）です。子房（ウ）は果実になります。「胚珠 → 種子、子房 → 果実」をセットで覚えておこう。',
        hint: '子房と、その中の小さな粒。種子になるのはどちらかな。',
      }),
      drag({
        id: 'plants-1-p3', concept: 'pl-flower',
        prompt: 'おしべのやくから出た花粉（左下の黄色い丸）を、受粉が起こる場所へ動かして置こう。',
        // 花粉の丸を 柱頭 (160, 90) へ。axis 'xy' なので 2 点の距離で判定する
        figure: scene(flower().concat([
          { type: 'circle', id: 'pollen', x: 50, y: 200, r: 10, fill: 'yellow', label: '花粉', labelPos: 'below' },
        ])),
        draggable: { itemId: 'pollen', axis: 'xy' },
        target: { x: 160, y: 90 },
        samples: { correct: { x: 160, y: 90 }, wrong: { x: 160, y: 180 } },
        explanation: '受粉は、花粉がめしべの先の柱頭につくことです。めしべの根もとの子房ではなく、先の柱頭に置けば正解です。',
        hint: 'めしべの、いちばん上の先を見てみよう。',
      }),
      choice({
        id: 'plants-1-p4', concept: 'pl-flower',
        prompt: '受粉したあと、子房と胚珠はそれぞれ何になる？',
        options: ['子房は種子、胚珠は果実になる', '子房は果実、胚珠は種子になる', '子房も胚珠も花弁になる'],
        answer: 'b',
        explanation: '受粉すると、子房は成長して果実に、子房の中の胚珠は種子になります。果実の中に種子が入っているのは、このためです。',
        hint: '果実の中に種子がある。外側と内側の関係から考えよう。',
      }),
      choice({
        id: 'plants-1-p5', concept: 'pl-flower',
        prompt: 'ルーペで、手に持ったタンポポの花を観察します。正しい使い方はどれ？',
        options: ['ルーペを目に近づけて持ち、花を前後に動かして、よく見える位置をさがす', 'ルーペを花の近くに持ち、顔を前後に動かす', 'まず、ルーペで太陽を見て明るさを確かめる'],
        answer: 'a',
        explanation: 'ルーペは目に近づけて持ち、観察するものを前後に動かしてピントを合わせます。木の花のように動かせないものは、ルーペを目に近づけたまま顔を前後に動かします。ルーペで太陽を見ると目をいためるので、ぜったいにやめよう。',
        hint: 'ルーペは目から はなさないで使うよ。',
      }),
    ],
    retryPool: [
      drag({
        id: 'plants-1-r1', concept: 'pl-flower',
        prompt: '図は、めしべの根もと（子房）をたてに切ったようすです。受粉したあと種子になる部分に、青い印を動かして置こう。',
        // 印を 胚珠 (160, 136) へ。不正解例は子房のかべ (232, 130)
        figure: scene([
          { type: 'line', points: [[160, 70], [160, 26]], color: 'green', width: 4 },
          { type: 'circle', x: 160, y: 20, r: 7, fill: 'green' },
          { type: 'line', points: [[160, 190], [160, 236]], color: 'green', width: 5 },
          { type: 'ellipse', x: 160, y: 130, rx: 80, ry: 60, fill: 'lightgreen' },
          { type: 'circle', x: 160, y: 136, r: 14, fill: 'white' },
          { type: 'text', x: 176, y: 40, text: 'めしべの根もとの断面', size: 13 },
          { type: 'circle', id: 'mark', x: 40, y: 206, r: 10, fill: 'blue', label: '印', labelPos: 'above' },
        ]),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 160, y: 136 },
        samples: { correct: { x: 160, y: 136 }, wrong: { x: 232, y: 130 } },
        explanation: '子房の中にある小さな粒が胚珠で、受粉すると種子になります。まわりの子房のかべは、成長して果実になります。',
        hint: '子房の中に入っている粒をさがそう。',
      }),
      choice({
        id: 'plants-1-t2', concept: 'pl-flower', term: true,
        prompt: '次の説明に合う言葉はどれ？「おしべの先にある、花粉が入っている小さなふくろ」',
        options: ['柱頭', 'やく', '胚珠'],
        answer: 'b',
        explanation: 'おしべの先にある、花粉の入ったふくろを**やく**といいます。やくから出た花粉が柱頭につくと、受粉です。',
        hint: 'おしべの先の部分の名前だよ。',
      }),
      choice({
        id: 'plants-1-r2', concept: 'pl-flower',
        prompt: 'エンドウのさやを開くと、中に豆が並んでいました。さやは、花のどの部分が育ったもの？',
        options: ['子房', '胚珠', '花弁'],
        answer: 'a',
        explanation: 'さやは子房が育った果実で、中の豆は胚珠が育った種子です。果実の中に種子が入っている、という関係を思い出そう。',
        hint: '種子（豆）を外からつつんでいる部分は、もとは何だったかな。',
      }),
    ],
  };

  // ---- ステージ plants-2: 被子植物と裸子植物（子房の有無、マツの花） ----
  const plants2 = {
    id: 'plants-2', areaId: 'flower', title: '被子植物と裸子植物', minutes: 4, concepts: ['pl-seed'],
    lessons: [
      {
        id: 'plants-2-c1',
        text: '花をさかせ、種子をつくってなかまをふやす植物を**種子植物**といいます。種子植物のうち、アブラナやサクラのように、胚珠が子房の中にある植物を**被子植物**といいます。',
        // 写真: アブラナの花の断面（plants-1-c2 の画像）に 子房・胚珠
        figure: scene([
          photo('plants-1-c2'),
          tag(44, 18, '被子植物', { size: 15, bold: true }),
          tag(50, 36, '胚珠が子房の中', { size: 13 }),
        ].concat(flowerPhotoOvary())),
      },
      {
        id: 'plants-2-c2',
        text: 'マツには**雌花**と**雄花**があり、どちらにも花弁やがくはありません。雌花のりん片には子房がなく、**胚珠**がむき出しでついています。雄花のりん片には**花粉のう**があり、中に花粉が入っています。',
        // 写真: 春のマツの枝先（新しい枝の先に雌花、根もとに雄花、古い枝に 1 年前の雌花とまつかさ）
        figure: scene([
          photo('plants-2-c2'),
          pointer(198, 18, 153, 15), tag(214, 22, '雌花'),
          pointer(44, 70, 105, 95), tag(28, 72, '雄花'),
          pointer(220, 130, 189, 151), tag(268, 132, '1 年前の雌花', { size: 13 }),
          pointer(268, 220, 248, 207), tag(290, 232, 'まつかさ', { size: 13 }),
        ]),
      },
      {
        id: 'plants-2-c3',
        text: '子房がなく、胚珠がむき出しの植物を**裸子植物**といい、マツ・スギ・イチョウなどがあります。受粉すると胚珠は種子になりますが、子房がないので**果実**はできません。マツの雌花は、やがてまつかさになります。',
        // 被子植物と裸子植物の胚珠のようすを比べる
        figure: scene([
          { type: 'line', points: [[80, 78], [80, 42]], color: 'green', width: 4 },
          { type: 'circle', x: 80, y: 36, r: 7, fill: 'green' },
          { type: 'ellipse', x: 80, y: 120, rx: 40, ry: 44, fill: 'lightgreen' },
          { type: 'circle', x: 68, y: 124, r: 8, fill: 'white' },
          { type: 'circle', x: 92, y: 124, r: 8, fill: 'white' },
          { type: 'polygon', points: [[240, 50], [276, 96], [266, 150], [214, 150], [204, 96]], fill: 'lightgreen' },
          { type: 'circle', x: 226, y: 138, r: 9, fill: 'white' },
          { type: 'circle', x: 254, y: 138, r: 9, fill: 'white' },
          { type: 'text', x: 80, y: 190, text: '被子植物', anchor: 'middle', size: 16, bold: true },
          { type: 'text', x: 80, y: 212, text: '胚珠が子房の中', anchor: 'middle', size: 13 },
          { type: 'text', x: 80, y: 232, text: 'アブラナ・サクラ', anchor: 'middle', size: 13 },
          { type: 'text', x: 240, y: 190, text: '裸子植物', anchor: 'middle', size: 16, bold: true },
          { type: 'text', x: 240, y: 212, text: '胚珠がむき出し', anchor: 'middle', size: 13 },
          { type: 'text', x: 240, y: 232, text: 'マツ・スギ・イチョウ', anchor: 'middle', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'plants-2-w1', concept: 'pl-seed',
      prompt: '予想しよう。マツにも花がさくと思う？',
      options: ['さく。ただし、花弁やがくはない', 'さかない。種子もつくらない', 'さく。サクラと同じように花弁がある'],
      answer: 'a',
      explanation: 'マツにも花（雌花と雄花）がさき、種子をつくります。ただし花弁やがくはありません。サクラの花とどこがちがうのかを、このステージで調べよう。',
      hint: 'マツにもまつかさができ、その中に種子があるよ。',
    }),
    problems: [
      choice({
        id: 'plants-2-p1', concept: 'pl-seed',
        prompt: '種子植物を、被子植物と裸子植物に分けるときのちがいはどれ？',
        options: ['胚珠が子房の中にあるか、むき出しか', '花弁の色が赤いか、白いか', '葉が大きいか、小さいか'],
        answer: 'a',
        explanation: '胚珠が子房の中にあるのが被子植物、子房がなく胚珠がむき出しなのが裸子植物です。「被」は「おおう」、「裸」は「はだか」という意味です。',
        hint: '漢字の「被（おおう）」と「裸（はだか）」に注目しよう。',
      }),
      fill({
        id: 'plants-2-t1', concept: 'pl-seed', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '胚珠が子房の中にある植物を[b1]、子房がなく胚珠がむき出しの植物を[b2]という。',
        blanks: [
          word('b1', ['被子植物', '裸子植物', '種子植物'], '被子植物'),
          word('b2', ['被子植物', '裸子植物', '種子植物'], '裸子植物'),
        ],
        explanation: '胚珠が子房におおわれているのが**被子植物**、胚珠がむき出し（はだか）なのが**裸子植物**です。どちらも種子をつくる種子植物です。',
        hint: '「被」は「おおう」、「裸」は「はだか」という意味だよ。',
      }),
      figureChoice({
        id: 'plants-2-p2', concept: 'pl-seed',
        prompt: 'マツの枝のようすです。ア〜ウのうち、花粉をつくる雄花はどれ？（ア: 新しくのびた枝の先についているもの、イ: 新しくのびた枝の根もとにたくさん集まっているもの、ウ: 古い枝についている、1 年前の雌花）',
        figure: scene(pineBranch().concat([
          leader(250, 40, 212, 42),
          leader(250, 140, 172, 140),
          leader(40, 140, 86, 186),
          { type: 'region', id: 'r1', x: 250, y: 40, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 250, y: 140, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 40, y: 140, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: 'マツの雄花は、新しい枝の根もとにたくさん集まってつきます。枝の先にあるアは雌花です。雄花のりん片の花粉のうから出た花粉が、風で雌花に運ばれます。',
        hint: '雌花は枝の先、雄花はその下のほうにつくよ。',
      }),
      choice({
        id: 'plants-2-p3', concept: 'pl-seed',
        prompt: '次のうち、裸子植物はどれ？',
        options: ['サクラ', 'イチョウ', 'アブラナ', 'ツツジ'],
        answer: 'b',
        explanation: 'イチョウは子房がなく、胚珠がむき出しの裸子植物です。サクラ・アブラナ・ツツジは、胚珠が子房の中にある被子植物です。',
        hint: 'マツ・スギと同じなかまをさがそう。',
      }),
      choice({
        id: 'plants-2-p4', concept: 'pl-seed',
        prompt: 'マツやスギには種子はできますが、果実はできません。その理由はどれ？',
        options: ['花粉をつくらないから', '子房がないから', '胚珠がないから'],
        answer: 'b',
        explanation: '果実は子房が育ってできるものです。裸子植物には子房がないので、胚珠が種子になっても果実はできません。',
        hint: '果実は、花のどの部分が育ったものだったかな。',
      }),
      choice({
        id: 'plants-2-p5', concept: 'pl-seed',
        prompt: 'サクラとマツに共通することはどれ？',
        options: ['どちらも花をさかせ、種子をつくる', 'どちらも胚珠が子房の中にある', 'どちらも胞子でなかまをふやす'],
        answer: 'a',
        explanation: 'サクラ（被子植物）もマツ（裸子植物）も、花をさかせて種子をつくる種子植物です。ちがうのは、胚珠が子房の中にあるかどうかです。',
        hint: '被子植物も裸子植物も、まとめて何植物とよんだかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'plants-2-r1', concept: 'pl-seed',
        prompt: 'マツのりん片を大きくした写真です。ア〜ウのうち、受粉したあと種子になるのはどれ？（ア: 雌花のりん片の根もとにある粒、イ: 雄花のりん片についているふくろ、ウ: 雌花のりん片の先）',
        // 写真: 左が雌花のりん片（根もとに胚珠 2 つ (69, 190)・(88, 190)、先 (88, 38)）、右が雄花のりん片（下に花粉のう (172〜278, 155〜198)）
        figure: scene([
          photo('plants-2-r1'),
          tag(125, 18, '雌花のりん片', { size: 13 }),
          tag(225, 18, '雄花のりん片', { size: 13 }),
          pointer(51, 206, 70, 192),
          pointer(275, 206, 262, 190),
          pointer(61, 36, 84, 40),
          { type: 'region', id: 'r1', x: 30, y: 214, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 296, y: 214, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 40, y: 30, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '雌花のりん片の根もとにある粒（ア）が胚珠で、受粉すると種子になります。イは花粉の入った花粉のうです。',
        hint: '種子になるのは、雌花と雄花のどちらにある部分かな。',
      }),
      choice({
        id: 'plants-2-t2', concept: 'pl-seed', term: true,
        prompt: '次の説明に合う言葉はどれ？「花をさかせ、種子をつくってなかまをふやす植物」',
        options: ['種子植物', 'シダ植物', 'コケ植物'],
        answer: 'a',
        explanation: '花をさかせて種子をつくる植物を**種子植物**といいます。被子植物も裸子植物も、種子植物のなかまです。',
        hint: '「種子」をつくる植物、という名前だよ。',
      }),
      choice({
        id: 'plants-2-r2', concept: 'pl-seed',
        prompt: 'マツのまつかさを調べると、りん片のあいだに、うすい羽のついた粒が見つかりました。この粒は何？',
        options: ['種子', '花粉', '胞子'],
        answer: 'a',
        explanation: 'まつかさは雌花が育ったもので、りん片のあいだの粒は、胚珠が育った種子です。羽があるので、風に乗って遠くへ運ばれます。',
        hint: 'まつかさは、雌花が受粉したあとに育ったものだよ。',
      }),
      choice({
        id: 'plants-2-r3', concept: 'pl-seed',
        prompt: '次のうち、被子植物はどれ？',
        options: ['マツ', 'スギ', 'アブラナ', 'イチョウ'],
        answer: 'c',
        explanation: 'アブラナは胚珠が子房の中にある被子植物です。マツ・スギ・イチョウは、胚珠がむき出しの裸子植物です。',
        hint: '花弁があり、子房のある花をさかせるのはどれかな。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: からだのつくりと分類
  // ================================================================

  // ---- ステージ plants-3: 単子葉類と双子葉類（子葉、葉脈、根、合弁花類・離弁花類） ----
  const plants3 = {
    id: 'plants-3', areaId: 'body', title: '単子葉類と双子葉類', minutes: 5, concepts: ['pl-monodi'],
    lessons: [
      {
        id: 'plants-3-c1',
        text: '被子植物は、芽ばえのときに出る子葉の数で 2 つに分けられます。子葉が 2 枚のなかまを**双子葉類**、子葉が 1 枚のなかまを**単子葉類**といいます。',
        // 写真: ホウセンカの芽ばえ（子葉 2 枚）とトウモロコシの芽ばえ（子葉 1 枚）
        figure: scene([
          photo('plants-3-c1'),
          tag(70, 30, '双子葉類', { size: 16, bold: true }),
          tag(70, 50, '（子葉 2 枚）', { size: 13 }),
          pointer(58, 55, 45, 93), pointer(82, 55, 87, 89),
          tag(188, 30, '単子葉類', { size: 16, bold: true }),
          tag(188, 50, '（子葉 1 枚）', { size: 13 }),
          pointer(216, 55, 240, 84),
        ]),
      },
      {
        id: 'plants-3-c2',
        text: '葉にあるすじを**葉脈**といいます。双子葉類の葉脈は網の目のように広がる**網状脈**、単子葉類の葉脈は平行に並ぶ**平行脈**です。',
        // 写真: 光にすかしたホウセンカの葉（網状脈）とトウモロコシの葉（平行脈）
        figure: scene([
          photo('plants-3-c2'),
          tag(128, 30, '葉脈', { bold: true }),
          pointer(118, 36, 96, 72), pointer(140, 36, 180, 64),
          tag(80, 214, '網状脈（双子葉類）'),
          tag(233, 214, '平行脈（単子葉類）'),
        ]),
      },
      {
        id: 'plants-3-c3',
        text: '双子葉類の根は、太い**主根**と、そこから出る細い**側根**からなります。単子葉類の根は、同じくらいの太さの根がたくさん出ている**ひげ根**です。',
        // 写真: 土を洗い落としたホウセンカの根（主根と側根）とトウモロコシの根（ひげ根）
        figure: scene([
          photo('plants-3-c3'),
          tag(42, 22, '双子葉類', { bold: true }),
          tag(270, 22, '単子葉類', { bold: true }),
          pointer(42, 66, 66, 84), tag(28, 66, '側根'),
          pointer(46, 196, 90, 196), tag(30, 200, '主根'),
          pointer(268, 64, 248, 76), tag(292, 66, 'ひげ根'),
        ]),
      },
      {
        id: 'plants-3-c4',
        text: '双子葉類は、花弁のようすでさらに分けられます。アサガオやタンポポのように花弁がくっついているなかまを**合弁花類**、アブラナやサクラのように花弁が 1 枚ずつ離れているなかまを**離弁花類**といいます。',
        // 写真: 左 アサガオの花（花弁がつながる。x 5〜158）、右 サクラの花（5 枚の花弁が離れる。x 168〜315）。どちらも y 28〜172
        figure: scene([
          photo('plants-3-c4'),
          tag(81, 194, '合弁花類（アサガオ）', { bold: true }),
          tag(81, 214, '花弁がくっついている', { size: 13 }),
          tag(241, 194, '離弁花類（サクラ）', { bold: true }),
          tag(241, 214, '花弁が離れている', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'plants-3-w1', concept: 'pl-monodi',
      prompt: '予想しよう。ホウセンカとトウモロコシの根をほり出して比べると、根のつくりは同じだと思う？',
      options: ['同じつくりをしている', 'ちがうつくりをしている'],
      answer: 'b',
      explanation: 'ホウセンカとトウモロコシでは、根のつくりがちがいます。根や葉のちがいで植物をなかま分けできることを、このステージで学ぼう。',
      hint: '植物によって、葉のすじのようすもちがうよ。',
    }),
    problems: [
      choice({
        id: 'plants-3-p1', concept: 'pl-monodi',
        prompt: '双子葉類の特徴の組み合わせとして正しいものはどれ？',
        options: ['子葉 2 枚・網状脈・主根と側根', '子葉 1 枚・平行脈・ひげ根', '子葉 2 枚・平行脈・ひげ根', '子葉 1 枚・網状脈・主根と側根'],
        answer: 'a',
        explanation: '双子葉類は、子葉が 2 枚、葉脈は網状脈、根は主根と側根です。単子葉類は、子葉が 1 枚、平行脈、ひげ根です。3 つをセットで覚えよう。',
        hint: '「双」は 2 つという意味。網の目の葉脈と、太い根があるのはどちらかな。',
      }),
      fill({
        id: 'plants-3-t1', concept: 'pl-monodi', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '葉脈が網の目のように広がっているものを[b1]、平行に並んでいるものを[b2]という。',
        blanks: [
          word('b1', ['網状脈', '平行脈', '主根'], '網状脈'),
          word('b2', ['網状脈', '平行脈', '主根'], '平行脈'),
        ],
        explanation: '網の目のような葉脈が**網状脈**（双子葉類）、平行に並ぶ葉脈が**平行脈**（単子葉類）です。',
        hint: '「網」と「平行」という字に注目しよう。',
      }),
      figureChoice({
        id: 'plants-3-p2', concept: 'pl-monodi',
        prompt: 'ア〜エは、葉と根のようすです（ア: 網の目のような葉脈の葉、イ: 平行に並ぶ葉脈の葉、ウ: 太い根から細い根が出ている根、エ: 同じくらいの太さの根がたくさん出ている根）。トウモロコシ（単子葉類）の根はどれ？',
        figure: LEAF_ROOT,
        answer: 'r4',
        explanation: '単子葉類のトウモロコシの根は、同じくらいの太さの根がたくさん出ているひげ根（エ）です。ウの主根と側根は、双子葉類の根です。',
        hint: '単子葉類の根は「ひげ」のように見えるよ。',
      }),
      choice({
        id: 'plants-3-p3', concept: 'pl-monodi',
        prompt: 'ツユクサの葉を見ると、葉脈は平行脈でした。ツユクサの根は、どうなっていると考えられる？',
        options: ['主根と側根', 'ひげ根', '根はない'],
        answer: 'b',
        explanation: '平行脈の植物は単子葉類なので、根はひげ根だと考えられます。葉脈が分かれば、根のようすも予想できます。',
        hint: '平行脈は、単子葉類と双子葉類のどちらの特徴だったかな。',
      }),
      choice({
        id: 'plants-3-p4', concept: 'pl-monodi',
        prompt: 'アサガオ、タンポポ、アブラナ、サクラのうち、花弁がくっついている合弁花類の組み合わせはどれ？',
        options: ['アサガオとタンポポ', 'アブラナとサクラ', 'アサガオとサクラ'],
        answer: 'a',
        explanation: 'アサガオとタンポポは花弁がくっついている合弁花類です。アブラナとサクラは花弁が 1 枚ずつ離れている離弁花類です。',
        hint: 'アサガオの花は、ラッパのように 1 つにつながっているね。',
      }),
      choice({
        id: 'plants-3-p5', concept: 'pl-monodi',
        prompt: '被子植物を単子葉類と双子葉類に分けるとき、名前のもとになっているのはどれ？',
        options: ['子葉の数', '花弁の色', '背の高さ'],
        answer: 'a',
        explanation: '芽ばえのときの子葉が 1 枚なら単子葉類、2 枚なら双子葉類です。「単」は 1 つ、「双」は 2 つという意味です。',
        hint: '名前に「子葉」という言葉が入っているね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'plants-3-r1', concept: 'pl-monodi',
        prompt: 'ア〜エは、葉と根のようすです（ア: 網の目のような葉脈の葉、イ: 平行に並ぶ葉脈の葉、ウ: 太い根から細い根が出ている根、エ: 同じくらいの太さの根がたくさん出ている根）。ホウセンカ（双子葉類）の葉はどれ？',
        figure: LEAF_ROOT,
        answer: 'r1',
        explanation: '双子葉類のホウセンカの葉脈は、網の目のように広がる網状脈（ア）です。イの平行脈は、単子葉類の葉です。',
        hint: '双子葉類の葉脈は、網の目のように広がっているよ。',
      }),
      choice({
        id: 'plants-3-t2', concept: 'pl-monodi', term: true,
        prompt: '次の説明に合う言葉はどれ？「双子葉類の根のうち、中心にある太い根」',
        options: ['側根', '主根', 'ひげ根'],
        answer: 'b',
        explanation: '中心にある太い根を**主根**、そこから出る細い根を**側根**といいます。単子葉類の根は、ひげ根です。',
        hint: '「主（おもな）」根、と書く言葉だよ。',
      }),
      choice({
        id: 'plants-3-r2', concept: 'pl-monodi',
        prompt: 'ユリ・イネ・トウモロコシは、どれも単子葉類です。これらの子葉の数は何枚？',
        options: ['1 枚', '2 枚', '3 枚'],
        answer: 'a',
        explanation: '単子葉類の子葉は 1 枚です。葉脈は平行脈、根はひげ根という特徴もあります。',
        hint: '「単」は 1 つという意味だよ。',
      }),
      fill({
        id: 'plants-3-r3', concept: 'pl-monodi',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '双子葉類のうち、アブラナのように花弁が 1 枚ずつ離れているなかまを[b1]という。',
        blanks: [word('b1', ['合弁花類', '離弁花類', '単子葉類'], '離弁花類')],
        explanation: '花弁が 1 枚ずつ離れているなかまを離弁花類、くっついているなかまを合弁花類といいます。「離」は「はなれる」という意味です。',
        hint: '「離れる」という字が入る言葉だよ。',
      }),
    ],
  };

  // ---- ステージ plants-4: 種子をつくらない植物（シダ植物・コケ植物）と植物の分類 ----
  const plants4 = {
    id: 'plants-4', areaId: 'body', title: '種子をつくらない植物', minutes: 5, concepts: ['pl-spore', 'pl-classify'],
    lessons: [
      {
        id: 'plants-4-c1',
        text: 'イヌワラビなどの**シダ植物**には、根・茎・葉の区別があります。茎は地面の下を横にのびる**地下茎**です。葉の裏には**胞子のう**がたくさんあり、その中にできる**胞子**でなかまをふやします。',
        // 写真: 掘り出したイヌワラビ（地上は葉、土の中を横にのびる地下茎と根。右の葉は裏返して胞子のうが見える）
        figure: scene([
          photo('plants-4-c1'),
          pointer(36, 101, 76, 70), tag(30, 112, '葉'),
          tag(300, 144, '地面', { size: 13 }),
          pointer(270, 176, 266, 188), tag(270, 172, '地下茎（茎）', { size: 13 }),
          pointer(48, 210, 96, 204), tag(36, 214, '根'),
          pointer(272, 38, 250, 64),
          tag(286, 18, '胞子のう', { size: 13 }),
          tag(284, 34, '（葉の裏）', { size: 13 }),
        ]),
      },
      {
        id: 'plants-4-c2',
        text: 'ゼニゴケなどの**コケ植物**には、根・茎・葉の区別がありません。根のように見える**仮根**は、おもにからだを地面に固定します。**雌株**と**雄株**があり、雌株にできる胞子でなかまをふやします。',
        // 写真: ゼニゴケの雌株（かさの形）と雄株（円盤の形）。裏に白い仮根
        figure: scene([
          photo('plants-4-c2'),
          tag(88, 26, '雌株（胞子ができる）', { bold: true }),
          tag(238, 52, '雄株', { bold: true }),
          pointer(104, 211, 64, 176), pointer(216, 211, 248, 172),
          tag(160, 224, '仮根（からだを固定する）', { size: 13 }),
        ]),
      },
      {
        id: 'plants-4-c3',
        text: '植物は、種子をつくるか、子房があるか、子葉は何枚か、花弁がくっついているかを順に調べると、なかまに分けられます。種子をつくらないシダ植物とコケ植物は、**胞子**でふえます。',
        // 植物の分類の全体図
        figure: scene([
          { type: 'line', points: [[16, 48], [16, 134]], width: 2 },
          { type: 'line', points: [[16, 48], [70, 48]], width: 2 },
          { type: 'line', points: [[16, 134], [70, 134]], width: 2 },
          { type: 'line', points: [[70, 30], [70, 66]], width: 2 },
          { type: 'line', points: [[70, 30], [228, 30]], width: 2 },
          { type: 'line', points: [[70, 66], [228, 66]], width: 2 },
          { type: 'line', points: [[70, 102], [70, 165]], width: 2 },
          { type: 'line', points: [[70, 102], [228, 102]], width: 2 },
          { type: 'line', points: [[70, 165], [124, 165]], width: 2 },
          { type: 'line', points: [[124, 138], [124, 192]], width: 2 },
          { type: 'line', points: [[124, 138], [228, 138]], width: 2 },
          { type: 'line', points: [[124, 192], [178, 192]], width: 2 },
          { type: 'line', points: [[178, 174], [178, 210]], width: 2 },
          { type: 'line', points: [[178, 174], [228, 174]], width: 2 },
          { type: 'line', points: [[178, 210], [228, 210]], width: 2 },
          { type: 'text', x: 20, y: 42, text: '種子なし', size: 12 },
          { type: 'text', x: 20, y: 128, text: '種子あり', size: 12 },
          { type: 'text', x: 78, y: 25, text: '根・茎・葉の区別なし', size: 12 },
          { type: 'text', x: 78, y: 61, text: '根・茎・葉の区別あり', size: 12 },
          { type: 'text', x: 78, y: 97, text: '子房なし', size: 12 },
          { type: 'text', x: 74, y: 160, text: '子房あり', size: 12 },
          { type: 'text', x: 130, y: 133, text: '子葉1枚', size: 12 },
          { type: 'text', x: 128, y: 187, text: '子葉2枚', size: 12 },
          { type: 'text', x: 182, y: 169, text: 'くっつく', size: 12 },
          { type: 'text', x: 182, y: 205, text: '離れる', size: 12 },
          { type: 'text', x: 234, y: 35, text: 'コケ植物', size: 13, bold: true },
          { type: 'text', x: 234, y: 71, text: 'シダ植物', size: 13, bold: true },
          { type: 'text', x: 234, y: 107, text: '裸子植物', size: 13, bold: true },
          { type: 'text', x: 234, y: 143, text: '単子葉類', size: 13, bold: true },
          { type: 'text', x: 234, y: 179, text: '合弁花類', size: 13, bold: true },
          { type: 'text', x: 234, y: 215, text: '離弁花類', size: 13, bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'plants-4-w1', concept: 'pl-spore',
      prompt: '予想しよう。イヌワラビ（シダ植物）やゼニゴケ（コケ植物）は、花をさかせて種子をつくると思う？',
      options: ['花をさかせ、種子をつくる', '花をさかせず、種子もつくらない', '花はさくが、種子はつくらない'],
      answer: 'b',
      explanation: 'シダ植物やコケ植物は、花をさかせず、種子もつくりません。では何でなかまをふやすのかを、このステージで調べよう。',
      hint: 'イヌワラビやゼニゴケの花を見たことがあるかな。',
    }),
    problems: [
      choice({
        id: 'plants-4-p1', concept: 'pl-spore',
        prompt: 'シダ植物とコケ植物は、何でなかまをふやす？',
        options: ['種子', '胞子', '花粉'],
        answer: 'b',
        explanation: 'シダ植物もコケ植物も、種子ではなく胞子でなかまをふやします。シダ植物は葉の裏の胞子のう、コケ植物は雌株に胞子ができます。',
        hint: '種子をつくらない植物がつくる、小さな粒の名前だよ。',
      }),
      fill({
        id: 'plants-4-t1', concept: 'pl-spore', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'シダ植物の葉の裏には[b1]がたくさんあり、その中にできる[b2]でなかまをふやす。',
        blanks: [
          word('b1', ['胞子のう', '花粉のう', '子房'], '胞子のう'),
          word('b2', ['種子', '胞子', '花粉'], '胞子'),
        ],
        explanation: 'シダ植物の葉の裏には**胞子のう**があり、その中の**胞子**でなかまをふやします。花粉のうは、マツの雄花のりん片にあるものです。',
        hint: '「胞子」が入っている「ふくろ（のう）」だよ。',
      }),
      figureChoice({
        id: 'plants-4-p2', concept: 'pl-spore',
        prompt: 'イヌワラビのからだのようすです。ア〜ウのうち、茎はどれ？（ア: 地面から上にのびている部分、イ: 地面の下を横にのびている太い部分、ウ: 地面の下の細い部分）',
        figure: scene(fern().concat([
          leader(56, 88, 113, 90),
          leader(284, 160, 250, 160),
          leader(36, 206, 70, 198),
          { type: 'region', id: 'r1', x: 56, y: 88, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 284, y: 160, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 36, y: 206, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: 'イヌワラビの茎は、地面の下を横にのびる地下茎（イ）です。地面から上に出ている部分（ア）は、柄も含めてすべて葉です。ウは根です。',
        hint: '地面から上に見えている部分は、全部が葉なんだ。',
      }),
      choice({
        id: 'plants-4-p3', concept: 'pl-spore',
        prompt: 'ゼニゴケの、根のように見える仮根のおもなはたらきはどれ？',
        options: ['からだを地面に固定する', '花粉をつくる', '種子をつくる'],
        answer: 'a',
        explanation: '仮根は、おもにからだを地面に固定するはたらきをします。コケ植物は、水をおもにからだの表面全体からとり入れます。',
        hint: 'コケ植物には、本当の根・茎・葉の区別がなかったね。',
      }),
      figureChoice({
        id: 'plants-4-p4', concept: 'pl-classify',
        prompt: '図は、種子植物の分け方です。ア〜エは分けたあとのなかまです（ア: 子房がない、イ: 子房があり子葉が 1 枚、ウ: 子葉が 2 枚で花弁がくっつく、エ: 子葉が 2 枚で花弁が離れている）。サクラはどこに入る？',
        figure: SEED_TREE,
        answer: 'r4',
        explanation: 'サクラは子房がある被子植物で、子葉が 2 枚の双子葉類、花弁が 1 枚ずつ離れている離弁花類です。なので、エに入ります。分類の図は、左から順に 1 つずつ確かめよう。',
        hint: 'サクラの花弁は、1 枚ずつ散っていくね。',
      }),
      choice({
        id: 'plants-4-p5', concept: 'pl-classify',
        prompt: 'イヌワラビ（シダ植物）とゼニゴケ（コケ植物）を分けるちがいはどれ？',
        options: ['種子をつくるかどうか', '根・茎・葉の区別があるかどうか', '胞子でふえるかどうか'],
        answer: 'b',
        explanation: 'どちらも種子をつくらず、胞子でふえます。ちがうのは、根・茎・葉の区別があるか（シダ植物）、ないか（コケ植物）です。',
        hint: 'ゼニゴケには、根のように見えても本当の根ではない部分があったね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'plants-4-r1', concept: 'pl-spore',
        prompt: '次のうち、シダ植物のなかまはどれ？',
        options: ['ゼニゴケ', 'スギナ', 'スギ', 'イチョウ'],
        answer: 'b',
        explanation: 'スギナ（つくし）はシダ植物で、胞子でふえます。ゼニゴケはコケ植物、スギとイチョウは種子をつくる裸子植物です。',
        hint: '春に出る「つくし」は、胞子をつくるための部分だよ。',
      }),
      choice({
        id: 'plants-4-t2', concept: 'pl-spore', term: true,
        prompt: '次の説明に合う言葉はどれ？「根・茎・葉の区別がなく、胞子でなかまをふやす植物のなかま」',
        options: ['シダ植物', 'コケ植物', '裸子植物'],
        answer: 'b',
        explanation: '根・茎・葉の区別がなく、胞子でふえるのは**コケ植物**です。シダ植物も胞子でふえますが、根・茎・葉の区別があります。',
        hint: 'ゼニゴケのなかまだよ。',
      }),
      figureChoice({
        id: 'plants-4-r2', concept: 'pl-classify',
        prompt: '図は、種子植物の分け方です。ア〜エは分けたあとのなかまです（ア: 子房がない、イ: 子房があり子葉が 1 枚、ウ: 子葉が 2 枚で花弁がくっつく、エ: 子葉が 2 枚で花弁が離れている）。ユリはどこに入る？',
        figure: SEED_TREE,
        answer: 'r2',
        explanation: 'ユリは子房がある被子植物で、子葉が 1 枚の単子葉類です。なので、イに入ります。単子葉類は、花弁のようすでは分けません。',
        hint: 'ユリの葉は、平行脈だよ。',
      }),
      choice({
        id: 'plants-4-r3', concept: 'pl-classify',
        prompt: 'アサガオは、どのなかまに分類される？',
        options: ['裸子植物', '単子葉類', '合弁花類', '離弁花類'],
        answer: 'c',
        explanation: 'アサガオは被子植物の双子葉類で、花弁がくっついている合弁花類です。子葉 2 枚、網状脈、主根と側根という特徴もあります。',
        hint: 'アサガオの花弁は、ラッパのように 1 つにつながっているね。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================
  const concepts = [
    {
      id: 'pl-flower', title: '花のつくりと受粉', basic: null, lessonStageId: 'plants-1',
      checkPool: [
        choice({
          id: 'pl-flower-k1', concept: 'pl-flower',
          prompt: '花粉がつくられるのは、花のどの部分？',
          options: ['やく', '柱頭', '子房'],
          answer: 'a',
          explanation: '花粉は、おしべの先のやくでつくられます。柱頭はめしべの先で、花粉がつく場所です。',
          hint: 'おしべの先にある、ふくろの部分だよ。',
        }),
        fill({
          id: 'pl-flower-k2', concept: 'pl-flower',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '受粉すると、子房は[b1]になり、胚珠は[b2]になる。',
          blanks: [
            word('b1', ['果実', '種子', '花粉'], '果実'),
            word('b2', ['果実', '種子', '花粉'], '種子'),
          ],
          explanation: '受粉すると、子房は果実に、子房の中の胚珠は種子になります。',
          hint: '果実の中に種子がある、という関係を思い出そう。',
        }),
        choice({
          id: 'pl-flower-k3', concept: 'pl-flower',
          prompt: 'アブラナの花で、いちばん外側にあるのはどれ？',
          options: ['めしべ', 'おしべ', 'がく'],
          answer: 'c',
          explanation: '花は外側から、がく・花弁・おしべ・めしべの順に並んでいます。いちばん外側はがくです。',
          hint: '花弁の外側で、花を支えている緑色の部分だよ。',
        }),
      ],
    },
    {
      id: 'pl-seed', title: '被子植物と裸子植物', basic: 'pl-flower', lessonStageId: 'plants-2',
      checkPool: [
        choice({
          id: 'pl-seed-k1', concept: 'pl-seed',
          prompt: '裸子植物の胚珠は、どのようになっている？',
          options: ['子房の中にある', 'むき出しになっている', '花弁につつまれている'],
          answer: 'b',
          explanation: '裸子植物には子房がなく、胚珠がむき出しになっています。被子植物では、胚珠は子房の中にあります。',
          hint: '「裸」は「はだか」という意味だよ。',
        }),
        choice({
          id: 'pl-seed-k2', concept: 'pl-seed',
          prompt: 'マツの雄花のりん片についている、花粉が入っているふくろを何という？',
          options: ['胚珠', '花粉のう', '子房'],
          answer: 'b',
          explanation: '雄花のりん片には花粉のうがあり、中に花粉が入っています。胚珠は雌花のりん片についています。',
          hint: '「花粉」が入った「ふくろ（のう）」だよ。',
        }),
        fill({
          id: 'pl-seed-k3', concept: 'pl-seed',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '種子植物は、胚珠が子房の中にある[b1]と、胚珠がむき出しの[b2]に分けられる。',
          blanks: [
            word('b1', ['被子植物', '裸子植物', 'シダ植物'], '被子植物'),
            word('b2', ['被子植物', '裸子植物', 'シダ植物'], '裸子植物'),
          ],
          explanation: '胚珠が子房におおわれているのが被子植物、むき出しなのが裸子植物です。シダ植物は種子をつくりません。',
          hint: '「被（おおう）」と「裸（はだか）」の意味から考えよう。',
        }),
      ],
    },
    {
      id: 'pl-monodi', title: '単子葉類と双子葉類', basic: 'pl-seed', lessonStageId: 'plants-3',
      checkPool: [
        choice({
          id: 'pl-monodi-k1', concept: 'pl-monodi',
          prompt: '単子葉類の特徴の組み合わせとして正しいものはどれ？',
          options: ['子葉 2 枚・網状脈・主根と側根', '子葉 1 枚・平行脈・ひげ根', '子葉 1 枚・網状脈・ひげ根'],
          answer: 'b',
          explanation: '単子葉類は、子葉が 1 枚、葉脈は平行脈、根はひげ根です。',
          hint: 'イネやトウモロコシの葉と根を思い出そう。',
        }),
        fill({
          id: 'pl-monodi-k2', concept: 'pl-monodi',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'アブラナは子葉が 2 枚の双子葉類なので、葉脈は[b1]、根は[b2]である。',
          blanks: [
            word('b1', ['網状脈', '平行脈'], '網状脈'),
            word('b2', ['主根と側根', 'ひげ根'], '主根と側根'),
          ],
          explanation: '双子葉類の葉脈は網状脈、根は主根と側根です。',
          hint: '双子葉類の 3 つの特徴を思い出そう。',
        }),
        choice({
          id: 'pl-monodi-k3', concept: 'pl-monodi',
          prompt: 'タンポポは双子葉類で、花弁がくっついています。このなかまを何という？',
          options: ['合弁花類', '離弁花類', '単子葉類'],
          answer: 'a',
          explanation: '花弁がくっついている双子葉類は合弁花類です。花弁が離れているなかまは離弁花類です。',
          hint: '「合わさった花弁」と書く言葉だよ。',
        }),
      ],
    },
    {
      id: 'pl-spore', title: 'シダ植物とコケ植物', basic: null, lessonStageId: 'plants-4',
      checkPool: [
        choice({
          id: 'pl-spore-k1', concept: 'pl-spore',
          prompt: 'ゼニゴケで、胞子ができるのはどちら？',
          options: ['雌株', '雄株'],
          answer: 'a',
          explanation: 'ゼニゴケの胞子は、雌株にできます。コケ植物は胞子でなかまをふやします。',
          hint: '種子植物で胚珠があるのが雌花だったことと、似ているよ。',
        }),
        fill({
          id: 'pl-spore-k2', concept: 'pl-spore',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'イヌワラビの茎は[b1]にあり、地上に出ているのは葉である。',
          blanks: [word('b1', ['地面の下', '葉の裏', '花の中'], '地面の下')],
          explanation: 'イヌワラビの茎は、地面の下を横にのびる地下茎です。地上に見える部分は葉です。',
          hint: '「地下茎」という名前から考えよう。',
        }),
        choice({
          id: 'pl-spore-k3', concept: 'pl-spore',
          prompt: 'シダ植物とコケ植物に共通する特徴はどれ？',
          options: ['胞子でなかまをふやす', '種子でなかまをふやす', '根・茎・葉の区別がある'],
          answer: 'a',
          explanation: 'シダ植物もコケ植物も、種子をつくらず胞子でふえます。根・茎・葉の区別があるのはシダ植物だけです。',
          hint: 'どちらも花をさかせない植物だったね。',
        }),
      ],
    },
    {
      id: 'pl-classify', title: '植物の分類', basic: 'pl-monodi', lessonStageId: 'plants-4',
      checkPool: [
        choice({
          id: 'pl-classify-k1', concept: 'pl-classify',
          prompt: 'イチョウは、どのなかまに分類される？',
          options: ['裸子植物', '単子葉類', 'シダ植物'],
          answer: 'a',
          explanation: 'イチョウは種子をつくりますが、子房がなく胚珠がむき出しなので裸子植物です。',
          hint: 'イチョウには子房があるかな。',
        }),
        choice({
          id: 'pl-classify-k2', concept: 'pl-classify',
          prompt: '植物の分類で、シダ植物・コケ植物と、種子植物を分けるちがいはどれ？',
          options: ['種子をつくるかどうか', '子葉の数', '花弁がくっついているかどうか'],
          answer: 'a',
          explanation: '種子をつくるのが種子植物、種子をつくらず胞子でふえるのがシダ植物とコケ植物です。子葉の数や花弁のようすは、種子植物の中をさらに分けるときに使います。',
          hint: 'シダ植物とコケ植物は、何でふえたかな。',
        }),
        fill({
          id: 'pl-classify-k3', concept: 'pl-classify',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'トウモロコシは子房のある被子植物で、子葉が 1 枚なので[b1]に分類される。',
          blanks: [word('b1', ['単子葉類', '双子葉類', '裸子植物'], '単子葉類')],
          explanation: '子葉が 1 枚の被子植物は単子葉類です。トウモロコシの葉は平行脈、根はひげ根です。',
          hint: '「単」は 1 つという意味だよ。',
        }),
      ],
    },
  ];

  // ================================================================
  // 領域 3: ミニプリント（先生の自作プリントの問題を書き直したもの。docs/reports/content/plants.md）
  // ================================================================

  // 写真の上の選ぶ場所と、部品までの引き出し線。parts は [[選ぶ場所の x, y, 部品の点の x, y], ...]（ア・イ…の順）
  function mpRegions(parts) {
    const items = [];
    parts.forEach(([x, y, px, py], i) => {
      items.push(pointer(x < px ? x + 22 : x - 22, y, px, py));
      items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: 'アイウエオカキ'[i] });
    });
    return items;
  }

  // アブラナの花をたてに切った写真（plants-1-c2 の画像）の部分を選ぶ図: ア 柱頭・イ やく・ウ 花弁・エ がく・オ 花柱・カ 子房・キ 胚珠
  // 柱頭 (150, 33)、やく (203, 50)、花弁（左）(60, 100)、がく（左下の緑）(108, 178)、花柱 (160, 104)、子房の右はし (183, 176)、胚珠 (160, 190)
  const MP_FLOWER_Q = scene([photo('plants-1-c2')].concat(mpRegions([
    [40, 24, 150, 33], [290, 26, 203, 50], [30, 150, 60, 104], [40, 206, 108, 178],
    [290, 120, 160, 104], [290, 170, 183, 176], [290, 218, 160, 190],
  ])));

  // 種子植物の分け方（SEED_TREE）に、なかまの名前を書いたもの（解説用）
  const SEED_TREE_NAMES = scene(SEED_TREE.items.filter(it => it.type !== 'region').concat(
    [['裸子植物', 36], ['単子葉類', 92], ['合弁花類', 148], ['離弁花類', 204]].map(([t, y]) => ({ type: 'text', x: 266, y: y + 5, text: t, size: 12 })),
  ));

  // マツの枝先の写真（plants-2-c2 の画像）を選ぶ図: ア 枝の先の雌花 (153, 15)・イ 根もとの雄花 (105, 95)・ウ 1 年前の雌花 (189, 151)
  const MP_PINE_Q = scene([photo('plants-2-c2')].concat(mpRegions([
    [216, 22, 156, 16], [40, 72, 105, 95], [284, 128, 191, 151],
  ])));

  // イヌワラビの写真（plants-4-c1 の画像。地面 y 150）の部分を選ぶ図: ア 地上の葉 (76, 72)・イ 地下茎 (262, 186)・ウ 根 (98, 206)
  const MP_FERN_Q = scene([photo('plants-4-c1')].concat(mpRegions([
    [36, 100, 76, 72], [296, 120, 262, 186], [36, 206, 98, 206],
  ])));

  // 葉・茎の断面・根の小さな図（中心の x が cx。y は 50〜170 に収まる）
  function mpPart(kind, cx) {
    const items = [];
    if (kind === 'netLeaf') {
      items.push({ type: 'ellipse', x: cx, y: 110, rx: 30, ry: 58, fill: 'lightgreen' });
      items.push({ type: 'line', points: [[cx, 176], [cx, 56]], color: 'green', width: 3 });
      [76, 100, 124, 148].forEach(y => {
        items.push({ type: 'line', points: [[cx, y + 10], [cx - 22, y]], color: 'green', width: 2 });
        items.push({ type: 'line', points: [[cx, y + 10], [cx + 22, y]], color: 'green', width: 2 });
        items.push({ type: 'line', points: [[cx - 12, y + 5], [cx - 18, y + 16]], color: 'green', width: 1 });
        items.push({ type: 'line', points: [[cx + 12, y + 5], [cx + 18, y + 16]], color: 'green', width: 1 });
      });
    } else if (kind === 'parLeaf') {
      items.push({ type: 'polygon', points: [[cx, 50], [cx + 14, 84], [cx + 16, 140], [cx, 176], [cx - 16, 140], [cx - 14, 84]], fill: 'lightgreen' });
      [-8, 0, 8].forEach(dx => items.push({ type: 'line', points: [[cx, 56], [cx + dx, 110], [cx, 170]], color: 'green', width: 2 }));
    } else if (kind === 'ringStem' || kind === 'scatterStem') {
      items.push({ type: 'circle', x: cx, y: 110, r: 34, fill: 'lightgreen' });
      const dots = kind === 'ringStem'
        ? [0, 45, 90, 135, 180, 225, 270, 315].map(a => [cx + Math.round(22 * Math.cos(a * Math.PI / 180)), 110 + Math.round(22 * Math.sin(a * Math.PI / 180))])
        : [[-18, -14], [4, -22], [20, -8], [-6, -4], [12, 10], [-20, 8], [2, 20], [-8, 12], [22, 16], [8, -6]].map(([dx, dy]) => [cx + dx, 110 + dy]);
      dots.forEach(([x, y]) => items.push({ type: 'circle', x, y, r: 4, fill: 'green', stroke: 'none' }));
    } else if (kind === 'tapRoot') {
      items.push({ type: 'line', points: [[cx, 50], [cx, 176]], color: 'brown', width: 6 });
      [[74, -1], [92, 1], [110, -1], [128, 1], [146, -1]].forEach(([y, s]) => {
        items.push({ type: 'line', points: [[cx, y], [cx + s * 24, y + 14]], color: 'brown', width: 2 });
        items.push({ type: 'line', points: [[cx, y + 8], [cx - s * 22, y + 22]], color: 'brown', width: 2 });
      });
    } else {
      [-26, -16, -6, 4, 14, 24].forEach((dx, i) => {
        items.push({ type: 'line', points: [[cx, 50], [cx + dx * 0.6, 110], [cx + dx, 160 + (i % 2) * 12]], color: 'brown', width: 2 });
      });
    }
    return items;
  }
  const MP_PART_NAME = { netLeaf: '網状脈', parLeaf: '平行脈', ringStem: '輪のように並ぶ', scatterStem: '散らばる', tapRoot: '主根と側根', fibrousRoot: 'ひげ根' };
  // 小さな図を横に並べる。names: 名前を書く（解説用）。書かないときは下にア・イ…の選ぶ場所
  function mpPartsScene(title, kinds, names) {
    const step = 320 / kinds.length;
    const items = [{ type: 'text', x: 160, y: 28, text: title, size: 13, anchor: 'middle' }];
    kinds.forEach((kind, i) => {
      const cx = Math.round(step * (i + 0.5));
      items.push(...mpPart(kind, cx));
      if (names) items.push({ type: 'text', x: cx, y: 204, text: MP_PART_NAME[kind], size: 12, anchor: 'middle' });
      else items.push({ type: 'region', id: 'r' + (i + 1), x: cx, y: 210, r: 22, label: 'アイウエ'[i] });
    });
    return scene(items);
  }

  // ゼニゴケの写真（plants-4-c2 の画像）。左は雌株（柄の先が切れこみのあるかさの形。x 5〜160）、右は雄株（柄の先が円ばんの形。x 162〜312）。
  // どちらも下は y 185 まで。選ぶ場所は それぞれの株の下（ア 左・イ 右）
  const MP_MOSS_Q = scene([
    photo('plants-4-c2'),
    { type: 'region', id: 'r1', x: 80, y: 212, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 236, y: 212, r: 22, label: 'イ' },
  ]);

  // ---- ステージ plants-mp1: プリント 1（花のつくり、果実と種子） ----
  const plMp1 = {
    id: 'plants-mp1', areaId: 'plants-miniprint', title: 'プリント 1: 花のつくりと果実', minutes: 5, concepts: ['pl-flower'],
    lessons: [
      {
        id: 'plants-mp1-c1',
        text: '花は外側から、**がく**・**花弁**・おしべ・めしべの順についています。めしべの先は**柱頭**、その下の細い部分は**花柱**、根もとのふくらみは**子房**で、子房の中に**胚珠**があります。おしべの先は**やく**です。',
        // 写真（plants-1-c2 の画像）: アブラナの花をたてに切った断面。部品の位置は MP_FLOWER_Q の上のコメント
        figure: scene([
          photo('plants-1-c2'),
          pointer(80, 20, 148, 32), tag(60, 22, '柱頭'),
          pointer(266, 26, 203, 50), tag(282, 26, 'やく'),
          pointer(34, 130, 58, 104), tag(28, 144, '花弁'),
          pointer(58, 196, 106, 178), tag(40, 200, 'がく'),
          pointer(270, 120, 161, 104), tag(290, 124, '花柱'),
          pointer(270, 170, 183, 176), tag(290, 174, '子房'),
          pointer(270, 214, 161, 192), tag(290, 218, '胚珠'),
        ]),
      },
      {
        id: 'plants-mp1-c2',
        anim: 'pl-ovary-to-fruit',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: 'めしべの柱頭に花粉がつくことを**受粉**といいます。受粉すると、子房は育って**果実**になり、子房の中の胚珠は**種子**になります。サクランボは、サクラの子房が育った果実です。',
        figure: scene([
          { type: 'ellipse', x: 70, y: 130, rx: 30, ry: 26, fill: 'lightgreen' },
          { type: 'circle', x: 70, y: 132, r: 9, fill: 'white' },
          { type: 'line', points: [[70, 104], [70, 60]], color: 'green', width: 4 },
          { type: 'text', x: 70, y: 186, text: '子房と胚珠', size: 13, anchor: 'middle' },
          { type: 'arrow', x1: 118, y1: 130, x2: 190, y2: 130, color: 'gray' },
          { type: 'text', x: 154, y: 118, text: '受粉後', size: 13, anchor: 'middle' },
          { type: 'circle', x: 250, y: 130, r: 38, fill: 'red' },
          { type: 'circle', x: 250, y: 132, r: 13, fill: 'white' },
          { type: 'line', points: [[250, 92], [256, 52]], color: 'green', width: 4 },
          { type: 'text', x: 250, y: 196, text: '果実と種子', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'plants-mp1-w1', concept: 'pl-flower',
      prompt: '予想しよう。サクランボ（サクラの実）は、サクラの花のどの部分が育ったものだと思う？',
      options: ['めしべの根もとのふくらみ', '花弁', 'おしべの先'],
      answer: 'a',
      explanation: 'サクランボは、めしべの根もとのふくらみ（子房）が育ったものです。花のつくりと、実ができるしくみを、このステージで学ぼう。',
      hint: '花がちったあと、どこがふくらんでいくかな。',
    }),
    problems: [
      figureChoice({
        id: 'plants-mp1-p1', concept: 'pl-flower',
        prompt: '図は花をたてに切ったようすです。花粉がつく、めしべの先の部分「柱頭」はどれ？ ア〜キから選ぼう。',
        figure: MP_FLOWER_Q,
        answer: 'r1',
        explanation: '柱頭はめしべのいちばん先で、花粉がつきやすいように、べたべたしていることが多いです。',
        hint: 'めしべのいちばん上だよ。',
      }),
      fill({
        id: 'plants-mp1-t1', concept: 'pl-flower', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'めしべの柱頭に花粉がつくことを[b1]という。',
        blanks: [word('b1', ['受粉', '受精', '発芽'], '受粉')],
        explanation: '花粉がめしべの柱頭につくことを**受粉**といいます。受粉すると、子房が果実に、胚珠が種子に育ちます。',
        hint: '花粉を「受ける」ことだよ。',
      }),
      figureChoice({
        id: 'plants-mp1-p2', concept: 'pl-flower',
        prompt: '図は花をたてに切ったようすです。受粉したあと果実になる「子房」はどれ？ ア〜キから選ぼう。',
        figure: MP_FLOWER_Q,
        answer: 'r6',
        explanation: '子房はめしべの根もとのふくらんだ部分です。受粉すると育って果実になります。中にある胚珠は種子になります。',
        hint: 'めしべの根もとのふくらみだよ。',
      }),
      fill({
        id: 'plants-mp1-p3', concept: 'pl-flower',
        prompt: 'サクラの花が受粉したあとのようすです。空らんに入る言葉を選ぼう。',
        text: '受粉したあと、子房は[b1]になり、子房の中の胚珠は[b2]になる。',
        blanks: [
          word('b1', ['果実', '種子', '花粉'], '果実'),
          word('b2', ['果実', '種子', '花粉'], '種子'),
        ],
        explanation: '子房が育って果実に、胚珠が育って種子になります。サクランボでは、食べる部分が果実、中のかたい粒の中が種子です。',
        hint: '外側のふくらみと、中の小さな粒がそれぞれ何になるか考えよう。',
      }),
      choice({
        id: 'plants-mp1-p4', concept: 'pl-flower',
        prompt: 'ツツジの花を外側から順に分解しました。取れる順として正しいのはどれ？',
        options: ['がく → 花弁 → おしべ → めしべ', '花弁 → がく → めしべ → おしべ', 'めしべ → おしべ → 花弁 → がく'],
        answer: 'a',
        explanation: '花は外側から、がく・花弁・おしべ・めしべの順についています。ツツジやアブラナなど、多くの花で同じ順です。',
        hint: 'いちばん外側で花をささえているのはがくだよ。',
      }),
      fill({
        id: 'plants-mp1-p5', concept: 'pl-flower',
        prompt: '説明に合う言葉を選ぼう。',
        text: 'めしべの柱頭の下の細くなった部分を[b1]、子房の中にある小さな粒を[b2]という。',
        blanks: [
          word('b1', ['花柱', '花糸', 'やく'], '花柱'),
          word('b2', ['胚珠', '花粉', '子房'], '胚珠'),
        ],
        explanation: '柱頭と子房をつなぐ細い部分が**花柱**、子房の中の小さな粒が**胚珠**です。胚珠は受粉後に種子になります。',
        hint: '「柱」頭の下の柱のような部分だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'plants-mp1-r1', concept: 'pl-flower',
        prompt: '図は花をたてに切ったようすです。花粉が入っている、おしべの先の「やく」はどれ？ ア〜キから選ぼう。',
        figure: MP_FLOWER_Q,
        answer: 'r2',
        explanation: 'やくはおしべの先にある袋で、中に花粉が入っています。',
        hint: 'おしべの先の黄色い部分だよ。',
      }),
      figureChoice({
        id: 'plants-mp1-r2', concept: 'pl-flower',
        prompt: '図は花をたてに切ったようすです。受粉したあと種子になる「胚珠」はどれ？ ア〜キから選ぼう。',
        figure: MP_FLOWER_Q,
        answer: 'r7',
        explanation: '胚珠は子房の中にある小さな粒で、受粉すると種子になります。',
        hint: '子房の中の小さな粒だよ。',
      }),
      choice({
        id: 'plants-mp1-r3', concept: 'pl-flower',
        prompt: 'サクランボの中にあるかたい粒（の中身）は、花のどの部分が育ったもの？',
        options: ['胚珠', '子房', 'やく'],
        answer: 'a',
        explanation: '子房が育ったものが果実（食べる部分）、胚珠が育ったものが種子（中のかたい粒の中身）です。',
        hint: '種子になるのはどの部分だったかな。',
      }),
      figureChoice({
        id: 'plants-mp1-r4', concept: 'pl-flower',
        prompt: '図は花をたてに切ったようすです。花のいちばん外側で、花弁の外にある「がく」はどれ？ ア〜キから選ぼう。',
        figure: MP_FLOWER_Q,
        answer: 'r4',
        explanation: 'がくは花のいちばん外側にあり、つぼみのときに花を包んで守っています。',
        hint: '花弁の根もとの外側にある、緑色の部分だよ。',
      }),
    ],
  };

  // ---- ステージ plants-mp2: プリント 2（マツの花、被子植物と裸子植物） ----
  const plMp2 = {
    id: 'plants-mp2', areaId: 'plants-miniprint', title: 'プリント 2: マツの花と裸子植物', minutes: 5, concepts: ['pl-seed', 'pl-classify'],
    lessons: [
      {
        id: 'plants-mp2-c1',
        text: 'マツの花は、たくさんの**りん片**が集まってできています。新しい枝の先に雌花、根もとに雄花がつきます。雌花のりん片には**胚珠**がむき出しでつき、雄花のりん片には花粉の入った**花粉のう**がつきます。',
        // 写真（plants-2-c2 の画像）: 春のマツの枝先（新しい枝の先に雌花、根もとに雄花、古い枝に 1 年前の雌花）
        figure: scene([
          photo('plants-2-c2'),
          pointer(198, 18, 153, 15), tag(214, 22, '雌花'),
          pointer(44, 70, 105, 95), tag(28, 72, '雄花'),
          pointer(220, 130, 189, 151), tag(268, 132, '1 年前の雌花', { size: 13 }),
        ]),
      },
      {
        id: 'plants-mp2-c2',
        text: '子房がなく、胚珠がむき出しの植物を**裸子植物**、胚珠が子房の中にある植物を**被子植物**といいます。裸子植物には子房がないので、種子はできても果実はできません。マツ・スギ・イチョウ・ソテツは裸子植物です。',
        // 写真: 左はサクラの花をたてに切った断面（x 5〜185。子房の中に胚珠 (92, 170)）、右はマツの雌花のりん片（x 192〜315。胚珠 2 つ (230, 155)・(272, 152) がむき出し）
        figure: scene([
          photo('plants-mp2-c2'),
          tag(92, 18, '被子植物', { bold: true }),
          tag(255, 18, '裸子植物', { bold: true }),
          pointer(138, 190, 96, 172), pointer(164, 190, 226, 160), tag(151, 198, '胚珠'),
          tag(92, 232, '胚珠は子房の中', { size: 13 }),
          tag(255, 232, '胚珠がむき出し', { size: 13 }),
        ]),
      },
      {
        id: 'plants-mp2-c3',
        text: '花をさかせ、種子をつくってなかまをふやす植物を**種子植物**といいます。種子植物は裸子植物と被子植物に分かれ、被子植物は子葉の数で単子葉類と双子葉類に、双子葉類は花弁のようすで合弁花類と離弁花類に分かれます。',
        figure: SEED_TREE_NAMES,
      },
    ],
    warmup: choice({
      id: 'plants-mp2-w1', concept: 'pl-seed',
      prompt: '予想しよう。マツには、サクラのような花弁のある花はありません。マツは種子をつくると思う？',
      options: ['つくる', 'つくらない', '年によってちがう'],
      answer: 'a',
      explanation: 'マツは花弁のない花をさかせ、種子をつくります。まつかさの中に種子ができます。マツの花のつくりを、このステージで学ぼう。',
      hint: 'まつかさの中を見たことはあるかな。',
    }),
    problems: [
      figureChoice({
        id: 'plants-mp2-p1', concept: 'pl-seed',
        prompt: '図はマツの枝です。新しい枝の先につく「雌花」はどれ？ ア〜ウから選ぼう。',
        figure: MP_PINE_Q,
        answer: 'r1',
        explanation: '雌花は新しい枝の先につきます。雄花は新しい枝の根もとにたくさん集まってつきます。ウは 1 年前の雌花で、まつかさになりかけています。',
        hint: '新しい枝のいちばん先を見よう。',
      }),
      fill({
        id: 'plants-mp2-t1', concept: 'pl-seed', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '子房がなく胚珠がむき出しになっている植物を[b1]、胚珠が子房の中にある植物を[b2]という。',
        blanks: [
          word('b1', ['裸子植物', '被子植物', '種子植物'], '裸子植物'),
          word('b2', ['裸子植物', '被子植物', '種子植物'], '被子植物'),
        ],
        explanation: '胚珠がむき出し（裸）なのが**裸子植物**、子房に包まれている（被われている）のが**被子植物**です。',
        hint: '「裸」はむき出し、「被」はおおわれているという意味だよ。',
      }),
      choice({
        id: 'plants-mp2-p2', concept: 'pl-seed',
        prompt: 'マツの雌花のりん片についているものはどれ？',
        options: ['むき出しの胚珠', '子房に包まれた胚珠', '花粉のう'],
        answer: 'a',
        explanation: 'マツの雌花のりん片には、胚珠がむき出しでついています。花粉のうは雄花のりん片についています。',
        hint: 'マツは裸子植物だったね。',
      }),
      choice({
        id: 'plants-mp2-p3', concept: 'pl-seed',
        prompt: '花のつくりで、マツと同じなかま（裸子植物）をすべて選んだものはどれ？ スギ・ツツジ・サクラ・イチョウ・ソテツ',
        options: ['スギ・イチョウ・ソテツ', 'ツツジ・サクラ', 'スギ・ツツジ・イチョウ'],
        answer: 'a',
        explanation: 'スギ・イチョウ・ソテツは、マツと同じく胚珠がむき出しの裸子植物です。ツツジとサクラは、胚珠が子房に包まれた被子植物です。',
        hint: '花弁のある花をさかせるのは被子植物だよ。',
      }),
      choice({
        id: 'plants-mp2-p4', concept: 'pl-seed',
        prompt: 'マツやイチョウは、種子はできますが果実はできません。その理由として正しいのはどれ？',
        options: ['子房がないから', '胚珠がないから', '花粉をつくらないから'],
        answer: 'a',
        explanation: '果実は子房が育ってできます。裸子植物には子房がないので果実はできません。胚珠はあるので、種子はできます。',
        hint: '果実は花のどの部分が育ったものだったかな。',
      }),
      fill({
        id: 'plants-mp2-p5', concept: 'pl-classify',
        prompt: '種子植物の分け方です。空らんに入る言葉を選ぼう。',
        text: '被子植物は、子葉の数によって[b1]と[b2]に分けられる。[b2]は、花弁のつき方によって合弁花類と離弁花類に分けられる。',
        blanks: [
          word('b1', ['単子葉類', '双子葉類', '裸子植物'], '単子葉類'),
          word('b2', ['単子葉類', '双子葉類', '裸子植物'], '双子葉類'),
        ],
        explanation: '子葉が 1 枚の単子葉類と、2 枚の双子葉類に分けます。双子葉類は、花弁がくっついている合弁花類と、離れている離弁花類に分けます。',
        hint: '子葉が 1 枚か 2 枚かで分けるよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'plants-mp2-r1', concept: 'pl-seed',
        prompt: '図はマツの枝です。新しい枝の根もとにたくさん集まってつく「雄花」はどれ？ ア〜ウから選ぼう。',
        figure: MP_PINE_Q,
        answer: 'r2',
        explanation: '雄花は新しい枝の根もとに集まってつき、りん片の花粉のうから花粉を出します。',
        hint: '新しい枝の根もとを見よう。',
      }),
      choice({
        id: 'plants-mp2-r2', concept: 'pl-seed',
        prompt: 'マツの花は、何がたくさん集まってできている？',
        options: ['りん片', '花弁', 'がく'],
        answer: 'a',
        explanation: 'マツの花には花弁やがくがなく、うろこのようなりん片がたくさん集まってできています。',
        hint: 'うろこのような小さな部分だよ。',
      }),
      choice({
        id: 'plants-mp2-r3', concept: 'pl-seed',
        prompt: '花をさかせ、種子をつくってなかまをふやす植物を何という？',
        options: ['種子植物', 'シダ植物', 'コケ植物'],
        answer: 'a',
        explanation: '花をさかせて種子をつくる植物を種子植物といいます。裸子植物と被子植物に分かれます。',
        hint: '「種子」をつくる植物だよ。',
      }),
      choice({
        id: 'plants-mp2-r4', concept: 'pl-seed',
        prompt: 'マツの雄花のりん片についていて、花粉が入っているものはどれ？',
        options: ['花粉のう', '胚珠', '子房'],
        answer: 'a',
        explanation: '雄花のりん片には花粉のうがあり、中に花粉が入っています。花粉は風で運ばれて雌花の胚珠につきます。',
        hint: '花粉を入れておく「ふくろ」だよ。',
      }),
    ],
  };

  // ---- ステージ plants-mp3: プリント 3（単子葉類と双子葉類の葉・茎・根） ----
  const plMp3 = {
    id: 'plants-mp3', areaId: 'plants-miniprint', title: 'プリント 3: 単子葉類と双子葉類', minutes: 5, concepts: ['pl-monodi'],
    lessons: [
      {
        id: 'plants-mp3-c1',
        text: '子葉が 2 枚の**双子葉類**は、葉脈が網の目のような**網状脈**で、根は太い**主根**と細い**側根**からなります。茎の断面では、維管束が輪のように並んでいます。',
        // 写真: 双子葉類（ホウセンカ）の 葉（網状脈。x 10〜93）・茎の横断面（赤く染まった維管束が輪に並ぶ。中心 (157, 117)）・根（主根と側根。x 215〜310）
        figure: scene([
          photo('plants-mp3-c1'),
          tag(150, 16, '双子葉類（アブラナ・サクラなど）', { size: 13 }),
          tag(52, 232, '網状脈', { size: 13 }),
          tag(157, 196, '輪のように並ぶ', { size: 13 }),
          tag(250, 236, '主根と側根', { size: 13 }),
        ]),
      },
      {
        id: 'plants-mp3-c2',
        text: '子葉が 1 枚の**単子葉類**は、葉脈が平行に並ぶ**平行脈**で、根は同じくらいの太さの根がたくさん出る**ひげ根**です。茎の断面では、維管束が散らばっています。イネ・トウモロコシ・ツユクサ・ユリがこのなかまです。',
        // 写真: 単子葉類（トウモロコシ）の 葉（平行脈。x 10〜110）・茎の横断面（赤く染まった維管束が散らばる。中心 (150, 115)）・根（ひげ根。x 195〜315）
        figure: scene([
          photo('plants-mp3-c2'),
          tag(160, 18, '単子葉類（イネ・ツユクサなど）', { size: 13 }),
          tag(70, 232, '平行脈', { size: 13 }),
          tag(150, 182, '散らばる', { size: 13 }),
          tag(262, 228, 'ひげ根', { size: 13 }),
        ]),
      },
      {
        id: 'plants-mp3-c3',
        text: '葉にあるすじを**葉脈**といいます。根の先近くには、細い毛のような**根毛**がたくさんあります。根毛があると、根が土とふれる面積が広くなり、水や養分を吸収しやすくなります。',
        // 写真: ダイコンの芽ばえの根（拡大）。根毛が根の先の近く (150〜270, 110〜210) に密に生え、根の先 (290, 218) そのものにはない。左上は子葉
        figure: scene([
          photo('plants-mp3-c3'),
          pointer(240, 96, 205, 128), tag(256, 90, '根毛', { bold: true }),
          tag(130, 226, '根の先近く（拡大）', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'plants-mp3-w1', concept: 'pl-monodi',
      prompt: '予想しよう。イネの葉のすじ（葉脈）は、どんな形に並んでいると思う？',
      options: ['平行に並んでいる', '網の目のように広がっている', 'すじは見えない'],
      answer: 'a',
      explanation: 'イネのような単子葉類の葉脈は、平行に並んでいます。葉・茎・根のちがいを、このステージで学ぼう。',
      hint: 'イネやススキの細長い葉を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'plants-mp3-p1', concept: 'pl-monodi',
        prompt: '被子植物の葉のようすです。双子葉類の葉はどちら？ ア・イから選ぼう。',
        // 写真（plants-3-c2 の画像）: 左 ホウセンカの葉（網状脈。x 22〜136）、右 トウモロコシの葉（平行脈。x 155〜305）。どちらも y 190 まで
        figure: scene([
          photo('plants-3-c2'),
          { type: 'region', id: 'r1', x: 80, y: 214, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 230, y: 214, r: 22, label: 'イ' },
        ]),
        answer: 'r1',
        explanation: '双子葉類の葉脈は、網の目のように広がる網状脈です（ア）。イのように平行に並ぶ平行脈は、単子葉類の葉です。',
        hint: '網の目のようなすじの葉をさがそう。',
      }),
      fill({
        id: 'plants-mp3-t1', concept: 'pl-monodi', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '葉にあるすじのことを[b1]という。',
        blanks: [word('b1', ['葉脈', '維管束', '根毛'], '葉脈')],
        explanation: '葉にあるすじを**葉脈**といいます。双子葉類は網状脈、単子葉類は平行脈です。',
        hint: '葉の「脈」と書くよ。',
      }),
      fill({
        id: 'plants-mp3-p2', concept: 'pl-monodi',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '子葉が 2 枚のなかまを[b1]、1 枚のなかまを[b2]という。[b1]の葉脈は[b3]になっている。',
        blanks: [
          word('b1', ['双子葉類', '単子葉類'], '双子葉類'),
          word('b2', ['双子葉類', '単子葉類'], '単子葉類'),
          word('b3', ['網状脈', '平行脈'], '網状脈'),
        ],
        explanation: '子葉が 2 枚の双子葉類は網状脈、子葉が 1 枚の単子葉類は平行脈です。',
        hint: '「双」は 2 つ、「単」は 1 つという意味だよ。',
      }),
      figureChoice({
        id: 'plants-mp3-p3', concept: 'pl-monodi',
        prompt: '被子植物の茎を横に切った断面です（緑の点は維管束）。双子葉類の茎の断面はどちら？ ア・イから選ぼう。',
        figure: mpPartsScene('2 種類の茎の断面', ['ringStem', 'scatterStem'], false),
        answer: 'r1',
        explanation: '双子葉類の茎では、維管束が輪のように並んでいます（ア）。単子葉類の茎では、維管束が全体に散らばっています（イ）。',
        hint: '維管束が輪のように並んでいるのはどちらかな。',
      }),
      figureChoice({
        id: 'plants-mp3-p4', concept: 'pl-monodi',
        prompt: '被子植物の根のようすです。双子葉類の根はどちら？ ア・イから選ぼう。',
        // 写真（plants-3-c3 の画像）: 左 ホウセンカの根（主根と側根。x 35〜130）、右 トウモロコシの根（ひげ根。x 145〜285）。根は下のほうまでのびるので、選ぶ場所は上の白い余白
        figure: scene([
          photo('plants-3-c3'),
          { type: 'region', id: 'r1', x: 40, y: 40, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 290, y: 40, r: 22, label: 'イ' },
        ]),
        answer: 'r1',
        explanation: '双子葉類の根は、太い主根と、そこから出る細い側根からなります（ア）。イのひげ根は単子葉類の根です。',
        hint: '太い根が 1 本あるのはどちらかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'plants-mp3-r1', concept: 'pl-monodi',
        prompt: 'ツユクサ（単子葉類）の葉の葉脈はどれ？',
        options: ['平行脈', '網状脈', '葉脈はない'],
        answer: 'a',
        explanation: 'ツユクサは単子葉類なので、葉脈は平行に並ぶ平行脈です。',
        hint: '単子葉類の葉脈を思い出そう。',
      }),
      fill({
        id: 'plants-mp3-r2', concept: 'pl-monodi',
        prompt: '根のつくりです。空らんに入る言葉を選ぼう。',
        text: '双子葉類の根で、中心の太い根を[b1]、そこから出る細い根を[b2]という。単子葉類の、同じくらいの太さの根がたくさん出ている根を[b3]という。',
        blanks: [
          word('b1', ['主根', '側根', 'ひげ根'], '主根'),
          word('b2', ['主根', '側根', 'ひげ根'], '側根'),
          word('b3', ['主根', '側根', 'ひげ根'], 'ひげ根'),
        ],
        explanation: '双子葉類の根は主根と側根、単子葉類の根はひげ根です。',
        hint: '「主」はおもな、「側」はわきの、という意味だよ。',
      }),
      choice({
        id: 'plants-mp3-r3', concept: 'pl-monodi',
        prompt: '根の先近くにある、綿毛のような細い根を何という？',
        options: ['根毛', '側根', 'ひげ根'],
        answer: 'a',
        explanation: '根の先近くにある細い毛のようなものを根毛といいます。土とふれる面積を広くし、水や養分を吸収しやすくしています。',
        hint: '根の「毛」だよ。',
      }),
      choice({
        id: 'plants-mp3-r4', concept: 'pl-monodi',
        prompt: 'イネやトウモロコシのように、主根がなく、同じくらいの太さの根がたくさん出ている根を何という？',
        options: ['ひげ根', '主根', '根毛'],
        answer: 'a',
        explanation: 'イネやトウモロコシは単子葉類で、根はひげ根です。',
        hint: 'ひげのように見える根だよ。',
      }),
      figureChoice({
        id: 'plants-mp3-r5', concept: 'pl-monodi',
        prompt: '子葉が 1 枚の植物（単子葉類）の葉と根の組み合わせを考えます。ア〜エのうち、単子葉類の根はどれ？',
        figure: LEAF_ROOT,   // 写真（plants-3-p2 の画像）: 左から ア 網状脈・イ 平行脈・ウ 主根と側根・エ ひげ根
        answer: 'r4',
        explanation: '単子葉類の根はひげ根（エ）で、葉は平行脈（イ）です。双子葉類は、網状脈の葉（ア）と主根・側根（ウ）です。',
        hint: '同じくらいの太さの根がたくさん出ているものだよ。',
      }),
    ],
  };

  // ---- ステージ plants-mp4: プリント 4（シダ植物・コケ植物と植物の分類） ----
  const plMp4 = {
    id: 'plants-mp4', areaId: 'plants-miniprint', title: 'プリント 4: シダ・コケと植物の分類', minutes: 5, concepts: ['pl-spore', 'pl-classify'],
    lessons: [
      {
        id: 'plants-mp4-c1',
        text: 'ワラビ・ゼンマイ・スギナなどの**シダ植物**は、根・茎・葉の区別があり、茎は地下にあります。ゼニゴケなどの**コケ植物**は根・茎・葉の区別がなく、根のように見える**仮根**はからだを固定します。どちらも**胞子**でふえ、光合成をします。',
        // 写真（plants-4-c1 の画像）: 掘り出したイヌワラビ（地上は葉、土の中を横にのびる地下茎と根。地面 y 150）
        figure: scene([
          photo('plants-4-c1'),
          pointer(36, 101, 76, 70), tag(30, 112, '葉'),
          pointer(270, 176, 266, 188), tag(270, 172, '茎（地下茎）', { size: 13 }),
          pointer(48, 210, 96, 204), tag(36, 214, '根'),
        ]),
      },
      {
        id: 'plants-mp4-c2',
        text: '植物は、種子でふえる**種子植物**と、胞子でふえるシダ植物・コケ植物に分けられます。種子植物は裸子植物と被子植物、被子植物は単子葉類と双子葉類、双子葉類は合弁花類と離弁花類に分けられます。',
        figure: SEED_TREE_NAMES,
      },
    ],
    warmup: choice({
      id: 'plants-mp4-w1', concept: 'pl-spore',
      prompt: '予想しよう。ワラビやゼニゴケは花をさかせません。何でなかまをふやすと思う？',
      options: ['胞子', '種子', '球根'],
      answer: 'a',
      explanation: 'シダ植物やコケ植物は、花をさかせず、胞子でなかまをふやします。からだのつくりと分類を、このステージで学ぼう。',
      hint: '種子をつくらない植物だよ。',
    }),
    problems: [
      figureChoice({
        id: 'plants-mp4-p1', concept: 'pl-spore',
        prompt: '図はイヌワラビ（シダ植物）のからだです。茎はどれ？ ア〜ウから選ぼう。',
        figure: MP_FERN_Q,
        answer: 'r2',
        explanation: 'シダ植物の茎は地面の下にあり、地下茎といいます。地面の上に出ているのは、すべて葉です。',
        hint: 'シダ植物の茎は地面の上には出ていないよ。',
      }),
      fill({
        id: 'plants-mp4-t1', concept: 'pl-spore', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'シダ植物やコケ植物は[b1]でなかまをふやす。コケ植物の、根のように見えてからだを地面に固定する部分を[b2]という。',
        blanks: [
          word('b1', ['胞子', '種子', '花粉'], '胞子'),
          word('b2', ['仮根', '根毛', '地下茎'], '仮根'),
        ],
        explanation: 'シダ植物・コケ植物は**胞子**でふえます。コケ植物の**仮根**は、根のように水を吸うはたらきはほとんどなく、からだを固定します。',
        hint: '「仮」の根と書くよ。',
      }),
      fill({
        id: 'plants-mp4-p2', concept: 'pl-spore',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'シダ植物は、根・茎・葉の区別が[b1]。コケ植物は、根・茎・葉の区別が[b2]。シダ植物もコケ植物も、光合成を[b3]。',
        blanks: [
          word('b1', ['ある', 'ない'], 'ある'),
          word('b2', ['ある', 'ない'], 'ない'),
          word('b3', ['する', 'しない'], 'する'),
        ],
        explanation: 'シダ植物には根・茎・葉の区別がありますが、コケ植物にはありません。どちらも緑色で、葉緑体があり光合成をします。',
        hint: 'どちらも緑色をしているね。',
      }),
      figureChoice({
        id: 'plants-mp4-p3', concept: 'pl-classify',
        prompt: '図は種子植物の分け方です。ユリはどのなかま？ ア〜エから選ぼう。',
        figure: SEED_TREE,
        answer: 'r2',
        explanation: 'ユリは子房のある被子植物で、子葉が 1 枚の単子葉類です（イ）。葉脈は平行脈、根はひげ根です。',
        hint: 'ユリの葉脈は平行に並んでいるよ。',
      }),
      figureChoice({
        id: 'plants-mp4-p4', concept: 'pl-classify',
        prompt: '図は種子植物の分け方です。アサガオはどのなかま？ ア〜エから選ぼう。',
        figure: SEED_TREE,
        answer: 'r3',
        explanation: 'アサガオは子葉が 2 枚の双子葉類で、花弁が 1 つにくっついている合弁花類です（ウ）。',
        hint: 'アサガオの花弁は、ラッパのように 1 つにつながっているね。',
      }),
      choice({
        id: 'plants-mp4-p5', concept: 'pl-classify',
        prompt: '種子をつくらない植物のうち、根・茎・葉の区別があるなかまはどれ？',
        options: ['シダ植物', 'コケ植物', '裸子植物'],
        answer: 'a',
        explanation: '種子をつくらないのはシダ植物とコケ植物です。そのうち、根・茎・葉の区別があるのはシダ植物です。裸子植物は種子をつくります。',
        hint: 'ワラビには葉や茎があるね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'plants-mp4-r1', concept: 'pl-spore',
        prompt: 'ゼニゴケの写真です。ゼニゴケには雄株と雌株があります。柄の先がかさの形をした雌株に対して、雄株はどちら？ ア・イから選ぼう。',
        figure: MP_MOSS_Q,
        answer: 'r2',
        explanation: '雌株の傘は切れこみのある形で、その下に胞子のうができます（ア）。雄株の傘は円ばんのような形です（イ）。胞子は雌株でつくられます。',
        hint: '雄株の柄の先は、円ばんのような形だよ。',
      }),
      choice({
        id: 'plants-mp4-r2', concept: 'pl-classify',
        prompt: 'イヌワラビとゼニゴケは、それぞれ何植物？',
        options: ['イヌワラビはシダ植物、ゼニゴケはコケ植物', 'イヌワラビはコケ植物、ゼニゴケはシダ植物', 'どちらも裸子植物'],
        answer: 'a',
        explanation: 'イヌワラビは根・茎・葉の区別があるシダ植物、ゼニゴケは区別のないコケ植物です。どちらも胞子でふえます。',
        hint: '根・茎・葉の区別があるのはどちらかな。',
      }),
      figureChoice({
        id: 'plants-mp4-r3', concept: 'pl-classify',
        prompt: '図は種子植物の分け方です。サクラはどのなかま？ ア〜エから選ぼう。',
        figure: SEED_TREE,
        answer: 'r4',
        explanation: 'サクラは双子葉類で、花弁が 1 枚ずつ離れている離弁花類です（エ）。',
        hint: 'サクラの花弁は 1 枚ずつ散るね。',
      }),
      figureChoice({
        id: 'plants-mp4-r4', concept: 'pl-classify',
        prompt: '図は種子植物の分け方です。イチョウはどのなかま？ ア〜エから選ぼう。',
        figure: SEED_TREE,
        answer: 'r1',
        explanation: 'イチョウは子房がなく、胚珠がむき出しの裸子植物です（ア）。',
        hint: 'イチョウはマツと同じなかまだよ。',
      }),
      choice({
        id: 'plants-mp4-r5', concept: 'pl-spore',
        prompt: 'ワラビ・ゼンマイ・スギナなどをまとめて何という？',
        options: ['シダ植物', 'コケ植物', '裸子植物'],
        answer: 'a',
        explanation: 'ワラビ・ゼンマイ・スギナは、根・茎・葉の区別があり胞子でふえるシダ植物です。',
        hint: '春に芽を食べることもある植物だよ。',
      }),
    ],
  };

  // あふれた問題を、もとからある概念の確認問題（checkPool）に足す
  function addCheck(id, problems) { concepts.find(c => c.id === id).checkPool.push(...problems); }
  addCheck('pl-spore', [
    choice({
      id: 'plants-mp4-k1', concept: 'pl-spore',
      prompt: 'シダ植物やコケ植物が、なかまをふやすためにつくるものはどれ？',
      options: ['胞子', '種子', '果実'],
      answer: 'a',
      explanation: 'シダ植物やコケ植物は、種子ではなく胞子をつくってなかまをふやします。',
      hint: '種子植物ではない植物だよ。',
    }),
    choice({
      id: 'plants-mp4-k2', concept: 'pl-spore',
      prompt: 'コケ植物は光合成をする？',
      options: ['する', 'しない', '夜だけする'],
      answer: 'a',
      explanation: 'コケ植物は緑色で葉緑体をもち、光合成をして養分をつくります。',
      hint: 'コケは何色をしているかな。',
    }),
  ]);
  addCheck('pl-classify', [
    choice({
      id: 'plants-mp4-k3', concept: 'pl-classify',
      prompt: '双子葉類は、さらに何と何に分けられる？',
      options: ['合弁花類と離弁花類', '裸子植物と被子植物', 'シダ植物とコケ植物'],
      answer: 'a',
      explanation: '双子葉類は、花弁がくっついている合弁花類と、離れている離弁花類に分けられます。',
      hint: '花弁のつき方で分けるよ。',
    }),
  ]);

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'plants',
    title: '植物のなかま',
    mascot: 'F',   // 担当の先生（まめ博士。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'pl-flower', title: '花と種子', order: 1, stages: [plants1, plants2] },
      { id: 'body', title: 'からだのつくりと分類', order: 2, stages: [plants3, plants4] },
      { id: 'plants-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [plMp1, plMp2, plMp3, plMp4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
