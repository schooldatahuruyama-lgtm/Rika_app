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
    id: 'plants-1', areaId: 'pl-flower', title: '花のつくり', minutes: 5, concepts: ['pl-flower'],
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
    id: 'plants-2', areaId: 'pl-flower', title: '被子植物と裸子植物', minutes: 4, concepts: ['pl-seed'],
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
    id: 'plants-mp1', areaId: 'pl-flower', free: true, title: 'プリント 1: 花のつくりと果実', minutes: 5, concepts: ['pl-flower'],
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
    id: 'plants-mp2', areaId: 'pl-flower', free: true, title: 'プリント 2: マツの花と裸子植物', minutes: 5, concepts: ['pl-seed', 'pl-classify'],
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
    id: 'plants-mp3', areaId: 'body', free: true, title: 'プリント 3: 単子葉類と双子葉類', minutes: 5, concepts: ['pl-monodi'],
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
    id: 'plants-mp4', areaId: 'body', free: true, title: 'プリント 4: シダ・コケと植物の分類', minutes: 5, concepts: ['pl-spore', 'pl-classify'],
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
  // 領域 4: ドリル（中学理科の知識から自作した練習問題。docs/reports/content/plants.md）
  // ================================================================

  // 数を答える空らん（content/volcano.js と同じ）
  function number(id, answer, tolerance, unit) { return { id, kind: 'number', answer, tolerance, unit }; }

  // エンドウのさや（果実）を開いたようす。中に豆（種子）が 6 個
  function peaPod() {
    const items = [
      { type: 'text', x: 160, y: 30, text: 'エンドウのさやを開いたようす', size: 14, anchor: 'middle' },
      { type: 'ellipse', x: 160, y: 120, rx: 120, ry: 36, fill: 'lightgreen' },
      { type: 'line', points: [[44, 120], [276, 120]], color: 'green', width: 2 },
    ];
    [80, 112, 144, 176, 208, 240].forEach(x => items.push({ type: 'circle', x, y: 120, r: 13, fill: 'green' }));
    items.push(
      leader(250, 96, 270, 66), { type: 'text', x: 274, y: 62, text: 'さや（果実）', size: 13, anchor: 'end' },
      leader(144, 134, 150, 186), { type: 'text', x: 150, y: 204, text: '豆（種子）', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 228, text: 'さやは子房、豆は胚珠が育ったもの', size: 13, anchor: 'middle' },
    );
    return scene(items);
  }

  // 植物の特徴の表（子葉・葉脈・根）。rows は [植物の名前, 子葉, 葉脈, 根] の 4 行。左にア〜エの選ぶ場所
  function plantTable(rows) {
    const items = [
      { type: 'rect', x: 44, y: 16, width: 272, height: 24, fill: 'glass' },
      { type: 'text', x: 82, y: 33, text: '植物', size: 12, anchor: 'middle' },
      { type: 'text', x: 142, y: 33, text: '子葉', size: 12, anchor: 'middle' },
      { type: 'text', x: 199, y: 33, text: '葉脈', size: 12, anchor: 'middle' },
      { type: 'text', x: 275, y: 33, text: '根', size: 12, anchor: 'middle' },
    ];
    rows.forEach((row, i) => {
      const y = 40 + 46 * i;
      items.push({ type: 'rect', x: 44, y, width: 272, height: 46, fill: 'white' });
      [82, 142, 199, 275].forEach((x, k) => items.push({ type: 'text', x, y: y + 28, text: row[k], size: 12, anchor: 'middle' }));
      items.push({ type: 'region', id: 'r' + (i + 1), x: 22, y: y + 23, r: 22, label: 'アイウエ'[i] });
    });
    [120, 164, 234].forEach(x => items.push({ type: 'line', points: [[x, 16], [x, 224]], color: 'line', width: 1 }));
    return scene(items);
  }

  // 根の先の根毛（1 本の根の先近くに、細い毛がたくさん）
  function rootHairScene() {
    const items = [
      { type: 'rect', x: 0, y: 0, width: 320, height: 240, fill: 'sand', stroke: 'none' },
      { type: 'line', points: [[160, 20], [160, 210]], color: 'brown', width: 8 },
    ];
    for (let y = 110; y <= 186; y += 8) {
      items.push({ type: 'line', points: [[156, y], [130, y - 8]], color: 'white', width: 2 });
      items.push({ type: 'line', points: [[164, y], [190, y - 8]], color: 'white', width: 2 });
    }
    items.push(
      { type: 'line', points: [[194, 140], [240, 120]], color: 'ink', width: 2 },
      { type: 'text', x: 244, y: 118, text: '根毛', size: 14, bg: true },
      { type: 'text', x: 16, y: 230, text: '土にふれる面積が広くなる', size: 13, bg: true },
    );
    return scene(items);
  }

  // シダ植物の葉の裏（茶色の胞子のうの集まりが並ぶ）
  function fernUnderside() {
    const items = [
      { type: 'line', points: [[160, 226], [160, 30]], color: 'green', width: 4 },
    ];
    [60, 100, 140, 180].forEach((y, i) => {
      const w = 110 - i * 14;
      [-1, 1].forEach(s => {
        items.push({ type: 'polygon', points: [[160, y + 12], [160 + s * w, y], [160 + s * (w - 8), y + 18], [160, y + 26]], fill: 'lightgreen', stroke: 'green' });
        [0.35, 0.6, 0.85].forEach(t => items.push({ type: 'circle', x: 160 + s * w * t, y: y + 11, r: 4, fill: 'brown', stroke: 'none' }));
      });
    });
    items.push(
      { type: 'line', points: [[242, 76], [280, 40]], color: 'ink', width: 2 },
      { type: 'text', x: 300, y: 34, text: '胞子のう', size: 13, anchor: 'end', bg: true },
      { type: 'text', x: 20, y: 30, text: '葉の裏', size: 14, bg: true },
    );
    return scene(items);
  }

  // コケ植物（ゼニゴケのような体）。体の表面から水を取り入れ、仮根で地面に固定する
  function mossScene() {
    const items = [
      { type: 'rect', x: 0, y: 150, width: 320, height: 90, fill: 'sand', stroke: 'none' },
      { type: 'line', points: [[0, 150], [320, 150]], color: 'brown', width: 3 },
      { type: 'polygon', points: [[70, 148], [110, 110], [160, 100], [210, 110], [250, 148]], fill: 'lightgreen', stroke: 'green' },
    ];
    [100, 130, 160, 190, 220].forEach((x, i) => items.push({ type: 'line', points: [[x, 150], [x + (i % 2 ? 4 : -4), 186]], color: 'line', width: 1 }));
    [110, 160, 210].forEach(x => items.push({ type: 'arrow', x1: x, y1: 56, x2: x, y2: 92, color: 'blue', width: 2 }));
    items.push(
      { type: 'text', x: 160, y: 44, text: '水を体の表面全体から取り入れる', size: 13, anchor: 'middle' },
      { type: 'line', points: [[224, 180], [262, 204]], color: 'ink', width: 2 },
      { type: 'text', x: 266, y: 212, text: '仮根', size: 14 },
    );
    return scene(items);
  }

  // 植物の分け方の流れ（種子をつくらない植物まで）
  function plantFlow() {
    return scene([
      { type: 'rect', x: 120, y: 14, width: 80, height: 30, fill: 'glass', label: '植物' },
      { type: 'line', points: [[160, 44], [160, 60], [70, 60], [70, 76]], width: 2 },
      { type: 'line', points: [[160, 60], [230, 60], [230, 76]], width: 2 },
      { type: 'rect', x: 20, y: 76, width: 100, height: 30, fill: 'white', label: '種子植物' },
      { type: 'rect', x: 160, y: 76, width: 140, height: 30, fill: 'white', label: '種子をつくらない' },
      { type: 'text', x: 70, y: 128, text: '種子でふえる', size: 12, anchor: 'middle' },
      { type: 'line', points: [[230, 106], [230, 140], [190, 140], [190, 156]], width: 2 },
      { type: 'line', points: [[230, 140], [270, 140], [270, 156]], width: 2 },
      { type: 'rect', x: 146, y: 156, width: 88, height: 30, fill: 'white', label: 'シダ植物' },
      { type: 'rect', x: 238, y: 156, width: 76, height: 30, fill: 'white', label: 'コケ植物' },
      { type: 'text', x: 190, y: 206, text: '根・茎・葉', size: 12, anchor: 'middle' },
      { type: 'text', x: 190, y: 222, text: 'の区別あり', size: 12, anchor: 'middle' },
      { type: 'text', x: 276, y: 206, text: '区別なし', size: 12, anchor: 'middle' },
    ]);
  }

  // drag 用: 植物の名前のカードを、種子植物・シダ植物・コケ植物の箱へ入れる
  // 箱の左上: 種子植物 (8, 120)、シダ植物 (115, 120)、コケ植物 (222, 120)（幅 90・高さ 100）。カード（80×32）を箱のまん中に置くと、
  // カードの左上は 種子植物 (13, 154)、シダ植物 (120, 154)、コケ植物 (227, 154)
  function plantBoxesScene(name) {
    const items = [{ type: 'text', x: 160, y: 24, text: '植物の名前のカードを、なかまの箱へ', size: 13, anchor: 'middle' }];
    [['種子植物', 8], ['シダ植物', 115], ['コケ植物', 222]].forEach(([t, x]) => {
      items.push({ type: 'rect', x, y: 120, width: 90, height: 100, fill: 'white', rx: 6 });
      items.push({ type: 'text', x: x + 45, y: 142, text: t, size: 13, anchor: 'middle', bold: true });
    });
    items.push({ type: 'rect', id: 'card', x: 120, y: 44, width: 80, height: 32, fill: 'yellow', rx: 4, label: name });
    return scene(items);
  }

  // ---- ステージ plants-dr1: ドリル 1（植物の体の共通点と相違点 前半: 花・受粉と果実・葉脈と根） ----
  const plDr1 = {
    id: 'plants-dr1', areaId: 'pl-flower', free: true, title: 'ドリル 1: 花と果実・葉脈と根', minutes: 6, concepts: ['pl-flower', 'pl-monodi'],
    lessons: [
      {
        id: 'plants-dr1-c1',
        text: '受粉すると、子房は果実に、子房の中の**胚珠**は種子になります。1 つの胚珠から 1 つの種子ができるので、果実の中の種子の数から、胚珠がいくつ育ったかが分かります。花弁やおしべは、やがてかれ落ちます。',
        figure: peaPod(),
      },
      {
        id: 'plants-dr1-c2',
        text: '葉にある**葉脈**は、水や養分などの通り道です。双子葉類の葉脈は網状脈、根は主根と側根です。単子葉類の葉脈は平行脈、根はひげ根です。',
        figure: mpPartsScene('葉脈と根', ['netLeaf', 'parLeaf', 'tapRoot', 'fibrousRoot'], true),
      },
      {
        id: 'plants-dr1-c3',
        text: '根の先近くには、細い**根毛**がたくさんあります。根毛があると根が土にふれる面積が広くなり、水や水にとけた養分を効率よく吸収できます。根は、体を支えるはたらきもしています。',
        figure: rootHairScene(),
      },
    ],
    warmup: choice({
      id: 'plants-dr1-w1', concept: 'pl-flower',
      prompt: '予想しよう。エンドウのさやを開くと、豆（種子）が 6 個入っていました。花のとき、子房の中の胚珠はいくつあったと思う？',
      options: ['1 個だけ', '少なくとも 6 個', '胚珠はなかった'],
      answer: 'b',
      explanation: '1 つの胚珠から 1 つの種子ができるので、胚珠は少なくとも 6 個ありました。種子にならなかった胚珠があれば、もっと多かったことになります。',
      hint: '種子は、子房の中の何が育ったものかな。',
    }),
    problems: [
      choice({
        id: 'plants-dr1-p1', concept: 'pl-flower',
        prompt: '受粉したあと、果実にならず、やがてかれ落ちることが多い部分はどれ？',
        options: ['子房', '花弁', '胚珠'],
        answer: 'b',
        explanation: '受粉のあと、子房は果実に、胚珠は種子に育ちます。花弁やおしべは役目を終えて、やがてかれ落ちます。',
        hint: '子房と胚珠は、それぞれ何に育つかな。',
      }),
      fill({
        id: 'plants-dr1-t1', concept: 'pl-monodi', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '根の表面にたくさんあり、土にふれる面積を広くして、水を吸収しやすくしている細い毛のようなものを[b1]という。',
        blanks: [word('b1', ['側根', '根毛', 'ひげ根'], '根毛')],
        explanation: '**根毛**は根の先近くにある細い毛のようなものです。数がとても多いので、根が土にふれる面積が広くなり、水を吸収しやすくなります。',
        hint: '根にはえている「毛」だよ。',
      }),
      figureChoice({
        id: 'plants-dr1-p2', concept: 'pl-monodi',
        prompt: '表は 4 つの植物の子葉・葉脈・根を調べたものです。1 つの行に、まちがいが 1 か所あります。まちがいがある行はどれ？ ア〜エから選ぼう。',
        // ウ ツユクサは単子葉類なので、葉脈は平行脈が正しい
        figure: plantTable([
          ['アブラナ', '2枚', '網状脈', '主根と側根'],
          ['ユリ', '1枚', '平行脈', 'ひげ根'],
          ['ツユクサ', '1枚', '網状脈', 'ひげ根'],
          ['ホウセンカ', '2枚', '網状脈', '主根と側根'],
        ]),
        answer: 'r3',
        explanation: 'ツユクサは子葉が 1 枚の単子葉類なので、葉脈は平行脈です。表では網状脈になっているので、ウがまちがいです。',
        hint: '子葉 1 枚のなかまは、葉脈と根がどんな形だったかな。',
      }),
      fill({
        id: 'plants-dr1-p3', concept: 'pl-flower',
        prompt: 'エンドウの花の子房の中に、胚珠が 7 個ありました。受粉して、胚珠がすべて育ったとします。',
        text: 'さやの中にできる種子は[b1]である。',
        blanks: [number('b1', 7, 0, '個')],
        explanation: '1 つの胚珠から 1 つの種子ができます。7 個の胚珠がすべて育つと、種子は 7 個になります。さや（果実）は子房が育ったものです。',
        hint: '胚珠 1 個 → 種子 1 個だよ。',
      }),
      choice({
        id: 'plants-dr1-p4', concept: 'pl-flower',
        prompt: 'Aさんのまとめ「受粉すると、胚珠が果実に、子房が種子になる」。まちがいを直す方法として正しいのはどれ？',
        options: ['「受粉」を「発芽」に変える', '「果実」を「花粉」に変える', '「胚珠」と「子房」を入れかえる'],
        answer: 'c',
        explanation: '正しくは「子房が果実に、胚珠が種子になる」です。外側のふくらみ（子房）が果実、中の小さな粒（胚珠）が種子になります。',
        hint: '外側のふくらみと、中の小さな粒は、それぞれ何になるかな。',
      }),
      choice({
        id: 'plants-dr1-p5', concept: 'pl-monodi',
        prompt: 'ダイコンの種子を発芽させると、根に白い綿毛のようなものがびっしり見えました。これを強くこすって取ってしまうと、水の吸収はどうなる？',
        options: ['吸収しにくくなる', '吸収しやすくなる', '変わらない'],
        answer: 'a',
        explanation: '白い綿毛のようなものは根毛です。根毛がなくなると、根が土や水にふれる面積がせまくなるので、水を吸収しにくくなります。',
        hint: '根毛は、ふれる面積を広くするはたらきがあったね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'plants-dr1-r1', concept: 'pl-flower',
        prompt: '受粉したあと、果実の中の種子の数と同じになるのはどれ？',
        options: ['花弁の数', '種子になった胚珠の数', 'おしべの数'],
        answer: 'b',
        explanation: '種子は胚珠が育ったものなので、種子の数は種子になった胚珠の数と同じです。',
        hint: '種子のもとは何だったかな。',
      }),
      fill({
        id: 'plants-dr1-r2', concept: 'pl-flower',
        prompt: 'ある花の子房の中に胚珠が 6 個あり、受粉後、さやの中に種子が 5 個できました。',
        text: '種子にならなかった胚珠は[b1]である。',
        blanks: [number('b1', 1, 0, '個')],
        explanation: '1 つの胚珠から 1 つの種子ができます。胚珠 6 個のうち 5 個が種子になったので、種子にならなかった胚珠は 6 − 5 ＝ 1 個です。',
        hint: '胚珠の数から、種子の数を引こう。',
      }),
      choice({
        id: 'plants-dr1-r3', concept: 'pl-monodi',
        prompt: '葉にある葉脈のはたらきとして正しいのはどれ？',
        options: ['花粉をつくる', '体を地面に固定する', '水や養分などの通り道になる'],
        answer: 'c',
        explanation: '葉脈は、根から吸い上げた水や、葉でつくられた養分などの通り道です。',
        hint: '葉の中にのびる「すじ」は、何かを運ぶ道だよ。',
      }),
      figureChoice({
        id: 'plants-dr1-r4', concept: 'pl-monodi',
        prompt: '表は 4 つの植物の子葉・葉脈・根を調べたものです。1 つの行に、まちがいが 1 か所あります。まちがいがある行はどれ？ ア〜エから選ぼう。',
        // イ アサガオは双子葉類なので、根は主根と側根が正しい
        figure: plantTable([
          ['イネ', '1枚', '平行脈', 'ひげ根'],
          ['アサガオ', '2枚', '網状脈', 'ひげ根'],
          ['トウモロコシ', '1枚', '平行脈', 'ひげ根'],
          ['タンポポ', '2枚', '網状脈', '主根と側根'],
        ]),
        answer: 'r2',
        explanation: 'アサガオは子葉が 2 枚の双子葉類なので、根は主根と側根です。表ではひげ根になっているので、イがまちがいです。',
        hint: '子葉 2 枚のなかまの根は、どんな形だったかな。',
      }),
      fill({
        id: 'plants-dr1-t2', concept: 'pl-flower', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '受粉したあと、子房が育ってできるものを[b1]という。',
        blanks: [word('b1', ['果実', '種子', '花粉'], '果実')],
        explanation: '子房が育ってできるものを**果実**といいます。果実の中の種子は、胚珠が育ったものです。',
        hint: 'エンドウのさやや、サクランボの食べる部分だよ。',
      }),
    ],
  };

  // ---- ステージ plants-dr2: ドリル 2（植物の体の共通点と相違点 後半: 種子をつくらない植物・胞子・分類） ----
  const plDr2 = {
    id: 'plants-dr2', areaId: 'body', free: true, title: 'ドリル 2: 胞子でふえる植物と分類', minutes: 6, concepts: ['pl-spore', 'pl-classify'],
    lessons: [
      {
        id: 'plants-dr2-c1',
        text: 'シダ植物は、葉の裏の**胞子のう**から**胞子**を出してふえます。胞子のうは、かわくと割れて胞子を飛ばします。シダ植物は根・茎・葉の区別があり、日かげのしめった所に多く見られます。',
        figure: fernUnderside(),
      },
      {
        id: 'plants-dr2-c2',
        text: 'コケ植物は根・茎・葉の区別がなく、水を体の表面全体から取り入れます。根のように見える**仮根**は、おもに体を地面などに固定するはたらきをしています。',
        figure: mossScene(),
      },
      {
        id: 'plants-dr2-c3',
        text: '植物は、種子をつくるかどうかで分け、種子をつくらない植物は、根・茎・葉の区別があるかどうかで**シダ植物**と**コケ植物**に分けられます。このように観点を順に使って分類します。',
        figure: plantFlow(),
      },
    ],
    warmup: choice({
      id: 'plants-dr2-w1', concept: 'pl-spore',
      prompt: '予想しよう。イヌワラビの葉の裏に、茶色の小さな粒がたくさん並んでいました。これは何だと思う？',
      options: ['病気でできたしみ', '花のつぼみ', '胞子が入った袋'],
      answer: 'c',
      explanation: '茶色の粒は胞子のうで、中に胞子が入っています。シダ植物は花をさかせず、胞子でなかまをふやします。',
      hint: 'シダ植物は、種子ではなく何でふえるかな。',
    }),
    problems: [
      choice({
        id: 'plants-dr2-p1', concept: 'pl-spore',
        prompt: 'シダ植物の胞子のうは、どんなときに割れて、胞子を飛ばす？',
        options: ['かわいたとき', '雨にぬれたとき', '夜になったとき'],
        answer: 'a',
        explanation: '胞子のうは、かわくと割れて、中の胞子を飛ばします。胞子のうを紙の上でかわかしておくと、粉のような胞子が出てくるのが見られます。',
        hint: '胞子は風で遠くへ運ばれるよ。運ばれやすいのはどんなときかな。',
      }),
      fill({
        id: 'plants-dr2-t1', concept: 'pl-spore', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'コケ植物の、根のように見えるが、おもに体を地面などに固定するはたらきをする部分を[b1]という。',
        blanks: [word('b1', ['仮根', '根毛', '地下茎'], '仮根')],
        explanation: 'コケ植物の**仮根**は、根のように見えますが、水を吸収するはたらきはほとんどなく、おもに体を固定しています。水は体の表面全体から取り入れます。',
        hint: '「仮の根」と書くよ。',
      }),
      drag({
        id: 'plants-dr2-p2', concept: 'pl-classify',
        prompt: '「スギゴケ」のカードを、なかまの箱へ動かして入れよう。スギゴケは根・茎・葉の区別がなく、胞子でふえます。',
        // カードの左上が コケ植物の箱のまん中 (227, 154) に来れば正解。不正解例はシダ植物の箱 (120, 154)
        figure: plantBoxesScene('スギゴケ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 227, y: 154 },
        samples: { correct: { x: 227, y: 154 }, wrong: { x: 120, y: 154 } },
        explanation: 'スギゴケは、根・茎・葉の区別がなく、胞子でふえるのでコケ植物です。根・茎・葉の区別があって胞子でふえるのがシダ植物です。',
        hint: '根・茎・葉の区別があるかどうかで、シダ植物とコケ植物を分けるよ。',
      }),
      fill({
        id: 'plants-dr2-p3', concept: 'pl-classify',
        prompt: 'アブラナ・イヌワラビ・ゼニゴケ・マツ・スギナ・スギゴケ・イネ・ゼンマイの 8 種類があります。',
        text: 'このうち、胞子でふえる植物は[b1]である。',
        blanks: [number('b1', 5, 0, '種類')],
        explanation: '胞子でふえるのは、シダ植物のイヌワラビ・スギナ・ゼンマイと、コケ植物のゼニゴケ・スギゴケの 5 種類です。アブラナ・マツ・イネは種子植物です。',
        hint: 'シダ植物とコケ植物を数えよう。',
      }),
      choice({
        id: 'plants-dr2-p4', concept: 'pl-spore',
        prompt: 'コケ植物は、体に必要な水を、おもにどこから取り入れる？',
        options: ['仮根', '体の表面全体', '葉の裏の胞子のう'],
        answer: 'b',
        explanation: 'コケ植物は、水を体の表面全体から取り入れます。仮根はおもに体を地面などに固定するはたらきをしています。',
        hint: '仮根のおもなはたらきは、水の吸収ではなかったね。',
      }),
      choice({
        id: 'plants-dr2-p5', concept: 'pl-classify',
        prompt: 'Bさんのまとめ「シダ植物とコケ植物は、どちらも根・茎・葉の区別がない」。正しく直したものはどれ？',
        options: ['「どちらも」を「コケ植物だけ」にする', '「区別がない」を「花がさく」にする', '「シダ植物」を「種子植物」にする'],
        answer: 'a',
        explanation: 'シダ植物には根・茎・葉の区別があり、コケ植物にはありません。「区別がない」のはコケ植物だけです。',
        hint: 'イヌワラビには、地下茎や根があったね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'plants-dr2-r1', concept: 'pl-spore',
        prompt: 'イヌワラビの葉の裏の胞子のうを、紙の上でかわかしておきました。紙の上に何が見られる？',
        options: ['細かい粉のような胞子', '小さな種子', '黄色い花粉'],
        answer: 'a',
        explanation: '胞子のうはかわくと割れて、中の胞子を飛ばします。胞子はとても小さく、粉のように見えます。',
        hint: 'シダ植物がふえるときに使うものだよ。',
      }),
      choice({
        id: 'plants-dr2-r2', concept: 'pl-spore',
        prompt: 'コケ植物が、日かげのしめった所に多いのはなぜ？',
        options: ['根で水をたくさん吸うから', '種子がかわくと困るから', '体の表面から水を取り入れるから'],
        answer: 'c',
        explanation: 'コケ植物は、水を体の表面全体から取り入れます。そのため、しめった所でないと水が足りなくなります。',
        hint: 'コケ植物の水の取り入れ方を思い出そう。',
      }),
      drag({
        id: 'plants-dr2-r3', concept: 'pl-classify',
        prompt: '「ゼンマイ」のカードを、なかまの箱へ動かして入れよう。ゼンマイは根・茎・葉の区別があり、胞子でふえます。',
        // カードの左上が シダ植物の箱のまん中 (120, 154) に来れば正解。不正解例はコケ植物の箱 (227, 154)
        figure: plantBoxesScene('ゼンマイ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: { x: 120, y: 154 },
        samples: { correct: { x: 120, y: 154 }, wrong: { x: 227, y: 154 } },
        explanation: 'ゼンマイは、根・茎・葉の区別があり、胞子でふえるのでシダ植物です。ワラビやスギナも同じなかまです。',
        hint: '根・茎・葉の区別があって、胞子でふえるなかまはどれかな。',
      }),
      fill({
        id: 'plants-dr2-r4', concept: 'pl-classify',
        prompt: 'イチョウ・スギナ・サクラ・ゼニゴケ・ツユクサ・マツ・イヌワラビの 7 種類があります。',
        text: 'このうち、種子でふえる植物は[b1]である。',
        blanks: [number('b1', 4, 0, '種類')],
        explanation: '種子でふえるのは、イチョウ・サクラ・ツユクサ・マツの 4 種類です。スギナ・イヌワラビ（シダ植物）とゼニゴケ（コケ植物）は胞子でふえます。',
        hint: 'シダ植物とコケ植物をのぞいて数えよう。',
      }),
      fill({
        id: 'plants-dr2-t2', concept: 'pl-spore', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'シダ植物の葉の裏などにあり、中に胞子が入っている袋を[b1]という。',
        blanks: [word('b1', ['花粉のう', '胞子のう', '子房'], '胞子のう')],
        explanation: '胞子が入っている袋を**胞子のう**といいます。花粉のうは、マツの雄花のりん片にある、花粉が入った袋です。',
        hint: '中に入っているものの名前が、袋の名前になっているよ。',
      }),
      choice({
        id: 'plants-dr2-r5', concept: 'pl-spore',
        prompt: 'シダ植物が多く見られる場所として、いちばん当てはまるのはどれ？',
        options: ['日当たりのよい、かわいた砂地', '日かげの、しめった所', '海の中'],
        answer: 'b',
        explanation: 'シダ植物やコケ植物は、日かげのしめった所に多く見られます。森の木の下や、しめった石がきなどでさがしてみよう。',
        hint: '胞子でふえる植物は、水分の多い所を好むよ。',
      }),
    ],
  };

  // ================================================================
  // クイズ（Kahoot の公開クイズの「何を問うか」だけを参考に自作。2026-11-22 追加。docs/reports/content/plants.md）
  // ================================================================

  // drag 用: 植物の名前のカードを、左右 2 つの箱のどちらかへ入れる
  // 箱の左上: 左 (20, 110)、右 (170, 110)（幅 130・高さ 110）。カード（80×32）を箱のまん中に置くと、
  // カードの左上は 左 (45, 160)、右 (195, 160)
  function kqBoxesScene(title, left, right, name) {
    const items = [{ type: 'text', x: 160, y: 24, text: title, size: 13, anchor: 'middle' }];
    [[left, 20], [right, 170]].forEach(([t, x]) => {
      items.push({ type: 'rect', x, y: 110, width: 130, height: 110, fill: 'white', rx: 6 });
      items.push({ type: 'text', x: x + 65, y: 134, text: t, size: 13, anchor: 'middle', bold: true });
    });
    items.push({ type: 'rect', id: 'card', x: 120, y: 48, width: 80, height: 32, fill: 'yellow', rx: 4, label: name });
    return scene(items);
  }
  const KQ_BOX_LEFT = { x: 45, y: 160 };
  const KQ_BOX_RIGHT = { x: 195, y: 160 };

  // 2 種類の花粉を拡大したようす。左 (90, 110): とげのある丸い花粉、右 (230, 110): 両側に空気の袋がついた花粉（マツ）
  // names: 下に説明を書く（カード用）。書かないときは下にア・イの選ぶ場所
  function kqPollenScene(names) {
    const items = [{ type: 'text', x: 160, y: 26, text: '花粉を拡大したようす', size: 13, anchor: 'middle' }];
    // 左: とげのある丸い花粉
    for (let a = 0; a < 360; a += 30) {
      const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
      items.push({ type: 'line', points: [[90 + Math.round(30 * c), 110 + Math.round(30 * s)], [90 + Math.round(40 * c), 110 + Math.round(40 * s)]], color: 'brown', width: 2 });
    }
    items.push({ type: 'circle', x: 90, y: 110, r: 30, fill: 'yellow' });
    // 右: 本体の両側に空気の袋
    items.push({ type: 'circle', x: 198, y: 102, r: 20, fill: 'white' });
    items.push({ type: 'circle', x: 262, y: 102, r: 20, fill: 'white' });
    items.push({ type: 'ellipse', x: 230, y: 114, rx: 26, ry: 20, fill: 'yellow' });
    if (names) {
      items.push(
        { type: 'text', x: 90, y: 180, text: 'とげやねばりけ', size: 12, anchor: 'middle' },
        { type: 'text', x: 90, y: 198, text: '（虫の体につく）', size: 12, anchor: 'middle' },
        { type: 'text', x: 230, y: 180, text: '空気の入った袋', size: 12, anchor: 'middle' },
        { type: 'text', x: 230, y: 198, text: '（風に乗る）', size: 12, anchor: 'middle' },
      );
    } else {
      items.push(
        { type: 'region', id: 'r1', x: 90, y: 196, r: 22, label: 'ア' },
        { type: 'region', id: 'r2', x: 230, y: 196, r: 22, label: 'イ' },
      );
    }
    return scene(items);
  }

  // 花の断面（flower()）に、柱頭・やく・子房・胚珠の名前を書いたもの
  function kqFlowerNamed() {
    return scene(flower().concat([
      leader(167, 88, 222, 62), { type: 'text', x: 226, y: 62, text: '柱頭', size: 13 },
      leader(118, 98, 74, 70), { type: 'text', x: 70, y: 70, text: 'やく', size: 13, anchor: 'end' },
      leader(182, 182, 250, 222), { type: 'text', x: 254, y: 226, text: '子房', size: 13 },
      leader(150, 186, 96, 222), { type: 'text', x: 92, y: 226, text: '胚珠', size: 13, anchor: 'end' },
    ]));
  }

  // マツのりん片 2 枚。左 (90, 110): 雌花のりん片（根もとに胚珠が 2 つ）、右 (230, 110): 雄花のりん片（裏に花粉のうが 2 つ）
  // names: 下に名前を書く（カード用）。書かないときは下にア・イの選ぶ場所
  function kqPineScales(names) {
    const items = [
      { type: 'text', x: 160, y: 26, text: 'マツのりん片を拡大したようす', size: 13, anchor: 'middle' },
      { type: 'polygon', points: [[90, 50], [130, 80], [122, 150], [58, 150], [50, 80]], fill: 'purple' },
      { type: 'ellipse', x: 76, y: 140, rx: 9, ry: 7, fill: 'white' },
      { type: 'ellipse', x: 104, y: 140, rx: 9, ry: 7, fill: 'white' },
      { type: 'polygon', points: [[230, 70], [258, 90], [252, 150], [208, 150], [202, 90]], fill: 'lightgreen' },
      { type: 'ellipse', x: 218, y: 134, rx: 10, ry: 14, fill: 'yellow' },
      { type: 'ellipse', x: 242, y: 134, rx: 10, ry: 14, fill: 'yellow' },
    ];
    if (names) {
      items.push(
        { type: 'text', x: 90, y: 180, text: '雌花のりん片', size: 12, anchor: 'middle' },
        { type: 'text', x: 90, y: 198, text: '白い粒は胚珠', size: 12, anchor: 'middle' },
        { type: 'text', x: 230, y: 180, text: '雄花のりん片', size: 12, anchor: 'middle' },
        { type: 'text', x: 230, y: 198, text: '黄色の袋は花粉のう', size: 12, anchor: 'middle' },
      );
    } else {
      items.push(
        { type: 'region', id: 'r1', x: 90, y: 196, r: 22, label: 'ア' },
        { type: 'region', id: 'r2', x: 230, y: 196, r: 22, label: 'イ' },
      );
    }
    return scene(items);
  }

  // マツの枝（pineBranch()）に、雌花・雄花・1 年前の雌花の名前を書いたもの
  function kqPineNamed() {
    return scene(pineBranch().concat([
      leader(214, 40, 240, 40), { type: 'text', x: 244, y: 44, text: '雌花', size: 13, bg: true },
      leader(172, 136, 214, 136), { type: 'text', x: 218, y: 140, text: '雄花', size: 13, bg: true },
      leader(102, 194, 130, 210), { type: 'text', x: 134, y: 216, text: '1 年前の雌花（育ちかけ）', size: 13, bg: true },
    ]));
  }

  // イヌワラビ（fern()）に、葉・地下茎・根の名前を書いたもの
  function kqFernNamed() {
    return scene(fern().concat([
      leader(56, 88, 113, 90), { type: 'text', x: 52, y: 92, text: '葉', size: 13, anchor: 'end', bg: true },
      leader(284, 160, 250, 160), { type: 'text', x: 288, y: 164, text: '地下茎', size: 13, bg: true, anchor: 'middle' },
      leader(36, 206, 70, 198), { type: 'text', x: 32, y: 222, text: '根', size: 13, bg: true },
      { type: 'text', x: 160, y: 20, text: '根・茎・葉に維管束が通る', size: 13, anchor: 'middle' },
    ]));
  }

  // ---- ステージ plants-kq1: クイズ 1（花粉の運ばれ方・柱頭のはたらき・果実と種子の数） ----
  const plKq1 = {
    id: 'plants-kq1', areaId: 'pl-flower', free: true, title: 'クイズ 1: 花粉の運ばれ方と果実', minutes: 6, concepts: ['pl-flower'],
    lessons: [
      {
        id: 'plants-kq1-c1',
        text: '花粉は、虫や風によって運ばれます。虫が運ぶ花を**虫媒花**といい、目立つ花弁やみつがあり、花粉は虫の体につきやすいつくりです。風が運ぶ花を**風媒花**といい、花は目立たず、軽い花粉をたくさんつくります。',
        figure: kqPollenScene(true),
      },
      {
        id: 'plants-kq1-c2',
        text: '**柱頭**は、運ばれてきた花粉を受けとる場所です。受粉すると、1 つの子房から 1 つの果実が、子房の中の胚珠 1 つから種子 1 つができます。',
        figure: kqFlowerNamed(),
      },
    ],
    warmup: choice({
      id: 'plants-kq1-w1', concept: 'pl-flower',
      prompt: '予想しよう。イネやトウモロコシの花には、目立つ花弁がありません。花粉は何に運ばれると思う？',
      options: ['チョウやハチ', '風', '雨水'],
      answer: 'b',
      explanation: 'イネやトウモロコシは、風に花粉を運んでもらう花です。虫を呼ぶ必要がないので、目立つ花弁やみつがありません。',
      hint: '虫を引きつけるものが無い花だね。',
    }),
    problems: [
      figureChoice({
        id: 'plants-kq1-p1', concept: 'pl-flower',
        prompt: '2 種類の花粉を拡大した図です。風に乗って遠くまで運ばれやすいのはどちら？（ア: とげのある丸い花粉、イ: 両側に袋がついた花粉）',
        figure: kqPollenScene(false),
        answer: 'r2',
        explanation: 'イの両側の袋には空気が入っていて、花粉が風に乗りやすくなっています。マツの花粉がこの形です。アは虫の体にくっつきやすい形です。',
        hint: '風船のようなものがついているのはどちらかな。',
      }),
      fill({
        id: 'plants-kq1-t1', concept: 'pl-flower', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'アブラナのように、花粉をこん虫に運んでもらう花を[b1]という。',
        blanks: [word('b1', ['虫媒花', '風媒花', '離弁花'], '虫媒花')],
        explanation: '虫が花粉を運ぶ花を**虫媒花**といいます。目立つ花弁やみつで、虫を引きよせます。',
        hint: '「虫」の字が入る言葉だよ。',
      }),
      fill({
        id: 'plants-kq1-p2', concept: 'pl-flower',
        prompt: '1 つの花の子房に胚珠が 10 個ありました。受粉のあと、そのうち 7 個が種子になりました。',
        text: 'この花からできる果実の数は[b1]である。',
        blanks: [number('b1', 1, 0, '個')],
        explanation: '果実は子房が育ったものです。子房は 1 つなので、果実も 1 個です。中に種子が 7 個入っています。',
        hint: '果実のもとは子房、種子のもとは胚珠だよ。',
      }),
      choice({
        id: 'plants-kq1-p3', concept: 'pl-flower',
        prompt: 'めしべの先にある柱頭の、いちばん大切なはたらきはどれ？',
        options: ['花粉をつくる', '運ばれてきた花粉を受けとる', 'みつを出して虫を呼ぶ'],
        answer: 'b',
        explanation: '柱頭は、運ばれてきた花粉を受けとる場所です。花粉をつくるのはおしべのやくです。',
        hint: '受粉は、花粉がどこにつくことだったかな。',
      }),
      drag({
        id: 'plants-kq1-p4', concept: 'pl-flower',
        prompt: '「ススキ」のカードを、当てはまる箱へ動かそう。ススキの花は目立たず、みつも出しません。',
        // カードの左上が 右の箱（風媒花）のまん中 (195, 160) に来れば正解。不正解例は左の箱 (45, 160)
        figure: kqBoxesScene('カードを、花粉の運ばれ方の箱へ', '虫媒花', '風媒花', 'ススキ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_RIGHT,
        samples: { correct: KQ_BOX_RIGHT, wrong: KQ_BOX_LEFT },
        explanation: 'ススキは、軽い花粉をたくさん風に飛ばして受粉する風媒花です。目立つ花弁やみつがないのは、虫を呼ぶ必要がないからです。',
        hint: '虫を引きよせるものが無いと、花粉は何に運ばれるかな。',
      }),
      choice({
        id: 'plants-kq1-p5', concept: 'pl-flower',
        prompt: 'アブラナの花弁があざやかな黄色をしているのは、受粉にとってどんな役に立つと考えられる？',
        options: ['虫を花に引きよせる', '風をたくさん受ける', '雨から種子を守る'],
        answer: 'a',
        explanation: 'アブラナは虫媒花です。目立つ色の花弁やみつで虫を呼び、体についた花粉を運んでもらいます。',
        hint: 'アブラナの花粉は、だれに運んでもらうのかな。',
      }),
    ],
    retryPool: [
      drag({
        id: 'plants-kq1-r1', concept: 'pl-flower',
        prompt: '「タンポポ」のカードを、当てはまる箱へ動かそう。タンポポの花には、チョウやハチがよく集まります。',
        // カードの左上が 左の箱（虫媒花）のまん中 (45, 160) に来れば正解。不正解例は右の箱 (195, 160)
        figure: kqBoxesScene('カードを、花粉の運ばれ方の箱へ', '虫媒花', '風媒花', 'タンポポ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_LEFT,
        samples: { correct: KQ_BOX_LEFT, wrong: KQ_BOX_RIGHT },
        explanation: 'タンポポは、目立つ花とみつで虫を呼ぶ虫媒花です。花に来た虫の体に花粉がついて、ほかの花へ運ばれます。',
        hint: '虫が集まる花は、どちらのなかまかな。',
      }),
      fill({
        id: 'plants-kq1-r2', concept: 'pl-flower',
        prompt: '花が 5 つ受粉しました。どの花も子房に胚珠が 4 個あり、すべてが種子になりました。',
        text: 'できた種子は全部で[b1]である。',
        blanks: [number('b1', 20, 0, '個')],
        explanation: '胚珠 1 個から種子 1 個ができます。1 つの花で 4 個、花が 5 つなので 4 × 5 ＝ 20 個です。果実は花の数と同じ 5 個です。',
        hint: '1 つの花でできる種子の数に、花の数をかけよう。',
      }),
      choice({
        id: 'plants-kq1-r3', concept: 'pl-flower',
        prompt: '風媒花の花のようすとして、当てはまるものはどれ？',
        options: ['大きく目立つ花弁がある', 'みつをたくさん出す', '目立たず、花粉の量が多い'],
        answer: 'c',
        explanation: '風媒花は虫を呼ばなくてよいので、花は目立たないことが多いです。そのかわり、軽い花粉をたくさんつくって風に飛ばします。',
        hint: '風まかせだと、花粉はどこに届くか分からないね。',
      }),
      fill({
        id: 'plants-kq1-t2', concept: 'pl-flower', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'トウモロコシのように、花粉を風に運んでもらう花を[b1]という。',
        blanks: [word('b1', ['風媒花', '虫媒花', '合弁花'], '風媒花')],
        explanation: '風が花粉を運ぶ花を**風媒花**といいます。イネ・ススキ・マツなども風媒花です。',
        hint: '「風」の字が入る言葉だよ。',
      }),
      figureChoice({
        id: 'plants-kq1-r4', concept: 'pl-flower',
        prompt: '2 種類の花粉を拡大した図です。虫の体にくっついて運ばれやすいのはどちら？（ア: とげのある丸い花粉、イ: 両側に袋がついた花粉）',
        figure: kqPollenScene(false),
        answer: 'r1',
        explanation: 'アのとげやねばりけのある花粉は、虫の体の毛にくっつきやすい形です。イは空気の袋で風に乗る花粉です。',
        hint: '虫の毛に引っかかりやすいのは、どちらの形かな。',
      }),
    ],
  };

  // ---- ステージ plants-kq2: クイズ 2（マツのりん片・花粉の運ばれ方・裸子植物と被子植物） ----
  const plKq2 = {
    id: 'plants-kq2', areaId: 'pl-flower', free: true, title: 'クイズ 2: マツのりん片と種子', minutes: 6, concepts: ['pl-seed'],
    lessons: [
      {
        id: 'plants-kq2-c1',
        text: 'マツの雌花のりん片には、胚珠が 2 つずつむき出しでついています。雄花のりん片の裏には**花粉のう**という袋があり、中に花粉ができます。花粉は風で運ばれ、雌花の胚珠に直接つきます。',
        figure: kqPineScales(true),
      },
      {
        id: 'plants-kq2-c2',
        text: '受粉した雌花は、1 年以上かけて育ち、**まつかさ**になります。りん片のあいだには種子ができますが、子房がないので果実はできません。',
        figure: kqPineNamed(),
      },
    ],
    warmup: choice({
      id: 'plants-kq2-w1', concept: 'pl-seed',
      prompt: '予想しよう。春のマツ林では、黄色い粉が車の上につもることがあります。この粉は何だと思う？',
      options: ['マツの花粉', 'マツの種子', '土ぼこり'],
      answer: 'a',
      explanation: 'マツの雄花からは、たくさんの花粉が風で飛ばされます。黄色い粉は、そのマツの花粉です。',
      hint: 'マツの雄花は、春に何を飛ばすかな。',
    }),
    problems: [
      figureChoice({
        id: 'plants-kq2-p1', concept: 'pl-seed',
        prompt: 'マツのりん片 2 枚を拡大した図です。花粉のうがついている、雄花のりん片はどちら？（ア: 根もとに白い粒が 2 つ、イ: 裏に黄色い袋が 2 つ）',
        figure: kqPineScales(false),
        answer: 'r2',
        explanation: '雄花のりん片の裏には、花粉ができる袋（花粉のう）があります（イ）。アの白い粒は、雌花のりん片についている胚珠です。',
        hint: '花粉が入っているのは袋のほうだよ。',
      }),
      fill({
        id: 'plants-kq2-t1', concept: 'pl-seed', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'マツの雌花が受粉のあと育ち、りん片のあいだに種子ができたものを[b1]という。',
        blanks: [word('b1', ['まつかさ', '果実', '花粉のう'], 'まつかさ')],
        explanation: '受粉した雌花は 1 年以上かけて育ち、**まつかさ**になります。子房がないので、果実ではありません。',
        hint: '秋にマツの木の下に落ちている、茶色のかたいものだよ。',
      }),
      drag({
        id: 'plants-kq2-p2', concept: 'pl-seed',
        prompt: '「ソテツ」のカードを、当てはまる箱へ動かそう。ソテツの胚珠は、子房に包まれずにむき出しです。',
        // カードの左上が 右の箱（裸子植物）のまん中 (195, 160) に来れば正解。不正解例は左の箱 (45, 160)
        figure: kqBoxesScene('カードを、なかまの箱へ', '被子植物', '裸子植物', 'ソテツ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_RIGHT,
        samples: { correct: KQ_BOX_RIGHT, wrong: KQ_BOX_LEFT },
        explanation: '胚珠がむき出しの植物は裸子植物です。ソテツは、マツ・イチョウ・スギと同じ裸子植物のなかまです。',
        hint: '胚珠がむき出しのなかまの名前を思い出そう。',
      }),
      choice({
        id: 'plants-kq2-p3', concept: 'pl-seed',
        prompt: 'マツの花粉が運ばれて受粉するとき、花粉が直接つくのはどこ？',
        options: ['めしべの柱頭', '雌花のりん片の胚珠', '雄花の花粉のう'],
        answer: 'b',
        explanation: 'マツには柱頭のあるめしべがありません。花粉は、雌花のりん片にむき出しでついている胚珠に直接つきます。',
        hint: 'マツの雌花には、子房や柱頭があったかな。',
      }),
      fill({
        id: 'plants-kq2-p4', concept: 'pl-seed',
        prompt: 'マツの雌花のりん片 1 枚には、胚珠が 2 個ついています。りん片 40 枚の胚珠がすべて種子になったとします。',
        text: 'できる種子の数は[b1]である。',
        blanks: [number('b1', 80, 0, '個')],
        explanation: '胚珠 1 個から種子 1 個ができます。りん片 1 枚で 2 個なので、2 × 40 ＝ 80 個です。',
        hint: 'りん片 1 枚あたりの胚珠の数に、りん片の数をかけよう。',
      }),
      choice({
        id: 'plants-kq2-p5', concept: 'pl-seed',
        prompt: 'マツの花粉に、空気の入った小さな袋がついていることは、どんな点で役に立つ？',
        options: ['虫の体にくっつきやすい', '風に乗って遠くまで運ばれやすい', '水の中でとけにくい'],
        answer: 'b',
        explanation: '空気の袋があると花粉が軽くなり、風に乗って遠くの雌花まで運ばれやすくなります。マツは風媒花です。',
        hint: 'マツの花粉を運ぶのは、虫かな、風かな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'plants-kq2-r1', concept: 'pl-seed',
        prompt: 'マツのりん片 2 枚を拡大した図です。受粉のあと種子になるものがついているのはどちら？（ア: 根もとに白い粒が 2 つ、イ: 裏に黄色い袋が 2 つ）',
        figure: kqPineScales(false),
        answer: 'r1',
        explanation: 'アは雌花のりん片で、白い粒は胚珠です。胚珠は受粉のあと種子になります。イは雄花のりん片で、袋は花粉のうです。',
        hint: '種子のもとになるのは胚珠だったね。',
      }),
      fill({
        id: 'plants-kq2-r2', concept: 'pl-seed',
        prompt: 'まつかさから種子が 50 個とれました。りん片 1 枚には胚珠が 2 個あり、どれも種子になったとします。',
        text: '種子ができたりん片の数は[b1]である。',
        blanks: [number('b1', 25, 0, '枚')],
        explanation: 'りん片 1 枚から種子が 2 個できるので、50 ÷ 2 ＝ 25 枚です。',
        hint: '種子の数を、りん片 1 枚あたりの数でわろう。',
      }),
      drag({
        id: 'plants-kq2-r3', concept: 'pl-seed',
        prompt: '「ウメ」のカードを、当てはまる箱へ動かそう。ウメの実（果実）の中には、かたい種子が入っています。',
        // カードの左上が 左の箱（被子植物）のまん中 (45, 160) に来れば正解。不正解例は右の箱 (195, 160)
        figure: kqBoxesScene('カードを、なかまの箱へ', '被子植物', '裸子植物', 'ウメ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_LEFT,
        samples: { correct: KQ_BOX_LEFT, wrong: KQ_BOX_RIGHT },
        explanation: '果実ができるのは、子房があるからです。子房の中に胚珠がある植物は被子植物で、ウメはサクラと同じなかまです。',
        hint: '果実ができるには、何が必要だったかな。',
      }),
      fill({
        id: 'plants-kq2-t2', concept: 'pl-seed', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'マツの雄花のりん片についていて、中で花粉がつくられる袋を[b1]という。',
        blanks: [word('b1', ['花粉のう', '胞子のう', '胚珠'], '花粉のう')],
        explanation: '花粉が入った袋を**花粉のう**といいます。シダ植物の胞子のうとは、入っているものがちがいます。',
        hint: '中に入っているものの名前が、袋の名前になっているよ。',
      }),
      choice({
        id: 'plants-kq2-r4', concept: 'pl-seed',
        prompt: 'マツとサクラの、受粉から種子ができるまでを比べました。サクラにだけ起こることはどれ？',
        options: ['花粉が運ばれて受粉する', '胚珠が育って種子になる', '子房が育って果実になる'],
        answer: 'c',
        explanation: 'どちらも受粉して、胚珠が種子になります。マツには子房がないので、果実ができるのはサクラだけです。',
        hint: 'マツの雌花に無いつくりは何だったかな。',
      }),
    ],
  };

  // ---- ステージ plants-kq3: クイズ 3（子葉・葉脈・根・茎の断面のつながり、合弁花類と離弁花類） ----
  const plKq3 = {
    id: 'plants-kq3', areaId: 'body', free: true, title: 'クイズ 3: 葉・根・茎から予想する', minutes: 6, concepts: ['pl-monodi'],
    lessons: [
      {
        id: 'plants-kq3-c1',
        text: '被子植物の子葉・葉脈・根・茎の**維管束**の並び方は、組みになっています。子葉 2 枚なら網状脈・主根と側根・輪の形、子葉 1 枚なら平行脈・ひげ根・散らばる形です。1 つ分かれば、ほかも予想できます。',
        figure: mpPartsScene('茎の断面（緑の点は維管束）', ['ringStem', 'scatterStem'], true),
      },
      {
        id: 'plants-kq3-c2',
        text: '双子葉類は、花弁のつき方でさらに分けます。花弁が根もとでつながっているなかまを**合弁花類**（アサガオ・ツツジ・タンポポ）、1 枚ずつ離れているなかまを**離弁花類**（アブラナ・サクラ・エンドウ）といいます。',
        figure: SEED_TREE_NAMES,
      },
    ],
    warmup: choice({
      id: 'plants-kq3-w1', concept: 'pl-monodi',
      prompt: '予想しよう。アサガオの花の、花弁を 1 枚だけつまんで取ろうとすると、どうなると思う？',
      options: ['1 枚だけきれいに取れる', 'つながっていて、全体がいっしょに取れる', '花弁がもともと無い'],
      answer: 'b',
      explanation: 'アサガオの花弁は、根もとで 1 つにつながっています。だから 1 枚だけ取ることはできません。このようななかまを合弁花類といいます。',
      hint: 'アサガオの花は、ラッパのような形だね。',
    }),
    problems: [
      figureChoice({
        id: 'plants-kq3-p1', concept: 'pl-monodi',
        prompt: 'ツユクサの葉は平行脈でした。茎を横に切った断面はどちらと予想できる？（ア: 維管束が輪の形に並ぶ、イ: 維管束が全体に散らばる）',
        figure: mpPartsScene('茎の断面（緑の点は維管束）', ['ringStem', 'scatterStem']),
        answer: 'r2',
        explanation: '平行脈の葉をもつのは単子葉類です。単子葉類の茎では、維管束が全体に散らばっています（イ）。',
        hint: '平行脈は、単子葉類と双子葉類のどちらの特徴だったかな。',
      }),
      fill({
        id: 'plants-kq3-t1', concept: 'pl-monodi', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '双子葉類のうち、ツツジのように花弁が根もとでつながっているなかまを[b1]という。',
        blanks: [word('b1', ['合弁花類', '離弁花類', '単子葉類'], '合弁花類')],
        explanation: '花弁がつながっているなかまを**合弁花類**といいます。アサガオ・タンポポも合弁花類です。',
        hint: '「合わさった花弁」という意味だよ。',
      }),
      fill({
        id: 'plants-kq3-p2', concept: 'pl-monodi',
        prompt: 'アサガオ・イネ・ホウセンカ・トウモロコシ・ツユクサ・タンポポ・ユリの 7 種類があります。',
        text: 'このうち、根が主根と側根になっている植物は[b1]である。',
        blanks: [number('b1', 3, 0, '種類')],
        explanation: '主根と側根をもつのは双子葉類のアサガオ・ホウセンカ・タンポポの 3 種類です。イネ・トウモロコシ・ツユクサ・ユリは単子葉類で、ひげ根です。',
        hint: '子葉が 2 枚のなかまを数えよう。',
      }),
      choice({
        id: 'plants-kq3-p3', concept: 'pl-monodi',
        prompt: 'ある植物をほり出すと、根は太い主根と細い側根でした。この植物について正しい予想はどれ？',
        options: ['子葉は 2 枚', '葉脈は平行脈', '茎の維管束は散らばる'],
        answer: 'a',
        explanation: '主根と側根は双子葉類の特徴です。双子葉類なら、子葉は 2 枚、葉脈は網状脈、茎の維管束は輪の形に並びます。',
        hint: '主根と側根をもつのは、どちらのなかまかな。',
      }),
      drag({
        id: 'plants-kq3-p4', concept: 'pl-monodi',
        prompt: '「エンドウ」のカードを、当てはまる箱へ動かそう。エンドウの花弁は、1 枚ずつはずれます。',
        // カードの左上が 右の箱（離弁花類）のまん中 (195, 160) に来れば正解。不正解例は左の箱 (45, 160)
        figure: kqBoxesScene('カードを、双子葉類のなかまの箱へ', '合弁花類', '離弁花類', 'エンドウ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_RIGHT,
        samples: { correct: KQ_BOX_RIGHT, wrong: KQ_BOX_LEFT },
        explanation: 'エンドウの花弁はばらばらに取れるので、離弁花類です。アブラナやサクラも同じなかまです。',
        hint: '花弁がばらばらに取れるなかまの名前は？',
      }),
      choice({
        id: 'plants-kq3-p5', concept: 'pl-monodi',
        prompt: 'ツツジとサクラの花を比べます。どちらも子葉が 2 枚のなかまです。2 つを見分けるには、何を調べればよい？',
        options: ['葉脈の形', '根の形', '花弁がつながっているか'],
        answer: 'c',
        explanation: '双子葉類どうしなので、葉脈や根の形は同じです。サクラは花弁が離れている離弁花類、ツツジはつながっている合弁花類です。',
        hint: '双子葉類どうしで同じになる特徴は、分けるのに使えないね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'plants-kq3-r1', concept: 'pl-monodi',
        prompt: 'ある植物の茎の断面では、維管束が全体に散らばっていました。この植物の根はどちらと予想できる？（ア: 主根と側根、イ: ひげ根）',
        figure: mpPartsScene('根のようす', ['tapRoot', 'fibrousRoot']),
        answer: 'r2',
        explanation: '維管束が散らばっているのは単子葉類の茎です。単子葉類の根は、同じくらいの太さの根がたくさん出るひげ根です（イ）。',
        hint: '維管束が散らばるのは、どちらのなかまだったかな。',
      }),
      fill({
        id: 'plants-kq3-r2', concept: 'pl-monodi',
        prompt: 'イネ・アブラナ・ユリ・サクラ・トウモロコシ・ツユクサの 6 種類があります。',
        text: 'このうち、子葉が 1 枚の植物は[b1]である。',
        blanks: [number('b1', 4, 0, '種類')],
        explanation: '子葉が 1 枚の単子葉類は、イネ・ユリ・トウモロコシ・ツユクサの 4 種類です。アブラナとサクラは双子葉類です。',
        hint: '葉が細長く、平行脈の植物を数えよう。',
      }),
      drag({
        id: 'plants-kq3-r3', concept: 'pl-monodi',
        prompt: '「ツツジ」のカードを、当てはまる箱へ動かそう。ツツジの花は、ろうとのような形で、花弁が 1 つにつながっています。',
        // カードの左上が 左の箱（合弁花類）のまん中 (45, 160) に来れば正解。不正解例は右の箱 (195, 160)
        figure: kqBoxesScene('カードを、双子葉類のなかまの箱へ', '合弁花類', '離弁花類', 'ツツジ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_LEFT,
        samples: { correct: KQ_BOX_LEFT, wrong: KQ_BOX_RIGHT },
        explanation: '花弁がつながっているので、ツツジは合弁花類です。アサガオやタンポポも同じなかまです。',
        hint: '花弁がつながっているなかまの名前は？',
      }),
      fill({
        id: 'plants-kq3-t2', concept: 'pl-monodi', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '種子が発芽して、いちばん初めに出てくる葉を[b1]という。',
        blanks: [word('b1', ['子葉', '本葉', '葉脈'], '子葉')],
        explanation: 'いちばん初めに出る葉を**子葉**といいます。子葉の数で、単子葉類（1 枚）と双子葉類（2 枚）に分けます。',
        hint: '単子葉類・双子葉類の名前にも入っている言葉だよ。',
      }),
      choice({
        id: 'plants-kq3-r4', concept: 'pl-monodi',
        prompt: '葉のすじが網の目のようで、花弁がばらばらに取れる植物があります。この植物のなかまを、いちばんくわしく答えたものはどれ？',
        options: ['単子葉類', '双子葉類の合弁花類', '双子葉類の離弁花類'],
        answer: 'c',
        explanation: '網状脈なので双子葉類です。さらに花弁が離れているので、離弁花類に分けられます。',
        hint: '葉脈で 1 回、花弁で 1 回、順に分けよう。',
      }),
    ],
  };

  // ---- ステージ plants-kq4: クイズ 4（シダ植物とコケ植物のちがい・維管束・胞子・分類） ----
  const plKq4 = {
    id: 'plants-kq4', areaId: 'body', free: true, title: 'クイズ 4: シダ・コケのちがいと分類', minutes: 6, concepts: ['pl-spore', 'pl-classify'],
    lessons: [
      {
        id: 'plants-kq4-c1',
        text: 'シダ植物には根・茎・葉の区別があり、その中を水や養分の通り道である**維管束**が通っています。コケ植物には根・茎・葉の区別がなく、維管束もありません。',
        figure: kqFernNamed(),
      },
      {
        id: 'plants-kq4-c2',
        text: '種子植物とシダ植物には維管束があり、コケ植物にはありません。種子をつくるか、根・茎・葉の区別（維管束）があるかを順に見て分けます。',
        figure: plantFlow(),
      },
      {
        id: 'plants-kq4-c3',
        text: '**胞子**は種子よりずっと小さく軽いので、風で遠くまで運ばれます。今から約 3 億年前には大きなシダ植物が栄え、それが地中にうもれて変化したものが**石炭**です。',
        figure: fernUnderside(),
      },
    ],
    warmup: choice({
      id: 'plants-kq4-w1', concept: 'pl-spore',
      prompt: '予想しよう。ゼニゴケを、日当たりのよい、かわいた砂地に植えかえました。ゼニゴケはどうなると思う？',
      options: ['よく育つ', '水が足りず、かれやすい', '花をさかせる'],
      answer: 'b',
      explanation: 'コケ植物は、体の表面から水を取り入れます。かわいた所では水が足りなくなり、かれやすくなります。',
      hint: 'コケ植物が多く見られるのは、どんな場所だったかな。',
    }),
    problems: [
      figureChoice({
        id: 'plants-kq4-p1', concept: 'pl-spore',
        prompt: 'イヌワラビのからだの図です。光合成をおもに行う部分はどれ？（ア: 地面から上にのびる部分、イ: 地面の下を横にのびる太い部分、ウ: 地面の下の細い部分）',
        figure: scene(fern().concat([
          leader(56, 88, 113, 90),
          leader(284, 160, 250, 160),
          leader(36, 206, 70, 198),
          { type: 'region', id: 'r1', x: 56, y: 88, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 284, y: 160, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 36, y: 206, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '地面から上に出ている部分（ア）は葉で、日光を受けて光合成をします。イは地下茎、ウは根です。',
        hint: '光合成には日光が必要だよ。日光が当たるのはどこかな。',
      }),
      fill({
        id: 'plants-kq4-t1', concept: 'pl-spore', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '根・茎・葉の中を通り、水や養分の通り道になっている管の束を[b1]という。',
        blanks: [word('b1', ['維管束', '仮根', '胞子のう'], '維管束')],
        explanation: '水や養分の通り道の束を**維管束**といいます。シダ植物と種子植物にはあり、コケ植物にはありません。',
        hint: '茎の断面で、緑の点として見えたものだよ。',
      }),
      drag({
        id: 'plants-kq4-p2', concept: 'pl-classify',
        prompt: '「ゼニゴケ」のカードを、当てはまる箱へ動かそう。ゼニゴケには根・茎・葉の区別がありません。',
        // カードの左上が 右の箱（維管束なし）のまん中 (195, 160) に来れば正解。不正解例は左の箱 (45, 160)
        figure: kqBoxesScene('カードを、維管束があるかどうかの箱へ', '維管束あり', '維管束なし', 'ゼニゴケ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_RIGHT,
        samples: { correct: KQ_BOX_RIGHT, wrong: KQ_BOX_LEFT },
        explanation: 'ゼニゴケはコケ植物で、根・茎・葉の区別も維管束もありません。水は体の表面から取り入れます。',
        hint: '根・茎・葉の区別がない植物には、水の通り道の管があるかな。',
      }),
      fill({
        id: 'plants-kq4-p3', concept: 'pl-classify',
        prompt: 'アブラナ・マツ・イヌワラビ・ゼニゴケ・スギナ・スギゴケ・イネの 7 種類があります。',
        text: 'このうち、維管束がある植物は[b1]である。',
        blanks: [number('b1', 5, 0, '種類')],
        explanation: '維管束があるのは、種子植物のアブラナ・マツ・イネと、シダ植物のイヌワラビ・スギナの 5 種類です。コケ植物のゼニゴケ・スギゴケにはありません。',
        hint: 'コケ植物をのぞいて数えよう。',
      }),
      choice({
        id: 'plants-kq4-p4', concept: 'pl-spore',
        prompt: '花がなく、根・茎・葉も見分けられない植物がありました。この植物について、正しい組み合わせはどれ？',
        options: ['胞子でふえ、体の表面から', '種子でふえ、根から', '胞子でふえ、根から'],
        answer: 'a',
        explanation: '根・茎・葉の区別がないのはコケ植物です。コケ植物は胞子でふえ、水は体の表面全体から取り入れます。',
        hint: '根・茎・葉の区別がないなら、「根から」は当てはまらないね。',
      }),
      choice({
        id: 'plants-kq4-p5', concept: 'pl-classify',
        prompt: '「種子でふえるか」という観点だけで、植物を 2 組に分けます。同じ組になる 2 つはどれ？',
        options: ['スギナとイチョウ', 'イチョウとツユクサ', 'スギゴケとツユクサ'],
        answer: 'b',
        explanation: 'イチョウ（裸子植物）とツユクサ（被子植物）は、どちらも種子をつくります。スギナとスギゴケは胞子でふえます。',
        hint: '裸子植物も被子植物も、種子をつくるなかまだよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'plants-kq4-r1', concept: 'pl-spore',
        prompt: '胞子が種子よりずっと小さくて軽いことは、なかまをふやすうえで、どんな点で役に立つ？',
        options: ['風で遠くまで運ばれやすい', '虫に食べられやすい', '土の中に深くもぐりやすい'],
        answer: 'a',
        explanation: '小さく軽い胞子は、風に乗って遠くまで運ばれます。しめった場所に落ちると、そこで育ちます。',
        hint: '軽いものは、風でどうなるかな。',
      }),
      fill({
        id: 'plants-kq4-r2', concept: 'pl-spore',
        prompt: '今から約 3 億年前の大きなシダ植物は、地中にうもれ、長い年月をかけて燃料に変わりました。',
        text: 'この燃料は[b1]である。',
        blanks: [word('b1', ['石炭', '石油', '天然ガス'], '石炭')],
        explanation: '大昔のシダ植物などがうもれて変化したものが**石炭**です。今も燃料として使われています。',
        hint: '黒くてかたい、燃える石だよ。',
      }),
      drag({
        id: 'plants-kq4-r3', concept: 'pl-classify',
        prompt: '「スギナ」のカードを、当てはまる箱へ動かそう。スギナは胞子でふえ、根・茎・葉の区別があります。',
        // カードの左上が 左の箱（維管束あり）のまん中 (45, 160) に来れば正解。不正解例は右の箱 (195, 160)
        figure: kqBoxesScene('カードを、維管束があるかどうかの箱へ', '維管束あり', '維管束なし', 'スギナ'),
        draggable: { itemId: 'card', axis: 'xy' },
        target: KQ_BOX_LEFT,
        samples: { correct: KQ_BOX_LEFT, wrong: KQ_BOX_RIGHT },
        explanation: 'スギナはシダ植物です。種子はつくりませんが、根・茎・葉の区別があり、維管束もあります。',
        hint: '根・茎・葉の区別があるシダ植物には、水の通り道があるよ。',
      }),
      fill({
        id: 'plants-kq4-t2', concept: 'pl-classify', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '胞子でなかまをふやし、根・茎・葉の区別と維管束をもつ植物のなかまを[b1]という。',
        blanks: [word('b1', ['シダ植物', 'コケ植物', '裸子植物'], 'シダ植物')],
        explanation: '胞子でふえ、維管束があるなかまを**シダ植物**といいます。イヌワラビ・スギナ・ゼンマイなどです。',
        hint: 'イヌワラビのなかまの名前だよ。',
      }),
      choice({
        id: 'plants-kq4-r4', concept: 'pl-classify',
        prompt: '維管束をもつ植物のなかまを、すべて合わせたものはどれ？',
        options: ['種子植物だけ', '種子植物とシダ植物', 'シダ植物とコケ植物'],
        answer: 'b',
        explanation: '維管束は、種子植物とシダ植物にあります。コケ植物にはないので、体の表面から水を取り入れます。',
        hint: '維管束がないのは、どのなかまだけだったかな。',
      }),
    ],
  };

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'plants',
    title: '植物のなかま',
    mascot: 'F',   // 担当の先生（まめ博士。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'pl-flower', title: '花と種子', order: 1, stages: [plants1, plants2, plMp1, plMp2, plDr1, plKq1, plKq2] },
      { id: 'body', title: 'からだのつくりと分類', order: 2, stages: [plants3, plants4, plMp3, plMp4, plDr2, plKq3, plKq4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
