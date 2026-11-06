// 「観察と実験の基本」教材データ（中学1年 理科・はじめに学ぶ器具の使い方）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 先生の自作のミニプリント（イントロダクション・基礎実験）の問題を、自分の言葉で書き直して入れた（docs/reports/content/basics.md）。
// 2 領域（観察の道具: ルーペ・スケッチ・双眼実体顕微鏡、顕微鏡のつくりと使い方、倍率と水中の小さな生物 /
// 実験の基本: ガスバーナーと小学校の復習）× 計 4 ステージと、概念 7 つ。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
(function (root) {
  'use strict';

  // ---- 書きやすくするための小さな道具（content/light.js からコピー） ----

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

  // 図の中を選ぶ（figure は必ず書く）
  function figureChoice(p) { return Object.assign({ type: 'figure-choice' }, p); }

  function word(id, opts, answer) { return { id, kind: 'word', options: opts, answer }; }
  function number(id, answer, tolerance, unit) { return { id, kind: 'number', answer, tolerance, unit }; }

  // ---- 図の部品をまとめる道具 ----

  const KANA = 'アイウエオカキク';

  // ---- 写真ふうの画像に重ねる部品（content/plants.js と同じ。docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/basics/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/basics/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 写真の上の選ぶ場所と、部品までの引き出し線。parts は [[選ぶ場所の x, y, 部品の点の x, y], ...]（ア・イ…の順）
  function photoRegions(parts) {
    const items = [];
    parts.forEach(([x, y, px, py], i) => {
      items.push(pointer(x < px ? x + 22 : x - 22, y, px, py));
      items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: KANA[i] });
    });
    return items;
  }

  // 顕微鏡の写真（bas-2-c1。反射鏡のついた光学顕微鏡を真横から）
  // 接眼レンズ (142, 22)、鏡筒 (158, 48)、レボルバー (122, 96)、対物レンズ (115, 116)、反射鏡 (134, 188)、
  // 調節ねじ（大きいほう）(184, 76)、ステージの右はし (182, 144)、しぼり (162, 162)
  // 顕微鏡の部分を選ぶ図: ア 接眼レンズ・イ レボルバー・ウ 対物レンズ・エ 反射鏡・オ 鏡筒・カ 調節ねじ・キ ステージ・ク しぼり
  const SCOPE_Q = scene([photo('bas-2-c1')].concat(photoRegions([
    [40, 26, 142, 22], [40, 80, 122, 96], [40, 130, 115, 116], [40, 190, 134, 188],
    [282, 34, 158, 48], [282, 84, 184, 76], [282, 136, 182, 144], [282, 190, 162, 162],
  ])));

  // 双眼実体顕微鏡の写真（bas-1-c3。斜め前から。視度調節リングが左の接眼レンズに来るよう左右反転した画像）
  // 接眼レンズ（右）(216, 28)、視度調節リング（左の接眼レンズ）(158, 38)、微動ねじ（大きいねじ）(92, 96)、
  // 粗動ねじ（その下の小さいねじ）(108, 129)、対物レンズ (196, 124)
  // 双眼実体顕微鏡の部分を選ぶ図: ア 接眼レンズ・イ 視度調節リング・ウ 微動ねじ・エ 粗動ねじ・オ 対物レンズ
  const STEREO_Q = scene([photo('bas-1-c3')].concat(photoRegions([
    [280, 28, 216, 28], [36, 30, 158, 38], [36, 92, 92, 96], [36, 140, 108, 129], [280, 124, 196, 124],
  ])));

  // ガスバーナーの写真（bas-4-c1。火はついていない。ねじのつまみは右向き）
  // 上のねじ（空気調節ねじ）のつまみ (162, 120)、下のねじ（ガス調節ねじ）のつまみ (162, 161)、元栓の黒いつまみ (272, 160)・弁 (272, 196)
  // ガスバーナーの部分を選ぶ図: ア 上のねじ・イ 下のねじ・ウ 元栓
  const BURNER_Q = scene([photo('bas-4-c1')].concat(photoRegions([
    [220, 104, 162, 120], [220, 156, 162, 161], [292, 120, 272, 160],
  ])));

  // 小学校で使った器具（左から ア ビーカー・イ 試験管・ウ メスシリンダー・エ アルコールランプ）
  function toolsScene(title) {
    const items = [
      { type: 'text', x: 160, y: 24, text: title, size: 14, anchor: 'middle' },
      { type: 'beaker', x: 44, y: 172, width: 56, height: 70, level: 0.4 },
      { type: 'tube', x: 120, y: 172, height: 100, level: 0.3 },
      { type: 'rect', x: 190, y: 112, width: 18, height: 54, fill: 'water', stroke: 'none' },
      { type: 'rect', x: 188, y: 60, width: 22, height: 106, fill: 'none' },
      { type: 'rect', x: 178, y: 166, width: 42, height: 6, fill: 'glass' },
      { type: 'ellipse', x: 275, y: 150, rx: 24, ry: 22, fill: 'glass' },
      { type: 'rect', x: 268, y: 118, width: 14, height: 12, fill: 'gray' },
      { type: 'line', points: [[275, 118], [275, 110]], color: 'ink', width: 2 },
      { type: 'flame', x: 275, y: 110 },
    ];
    [80, 100, 120, 140].forEach(y => items.push({ type: 'line', points: [[188, y], [196, y]], color: 'ink', width: 1 }));
    [44, 120, 199, 275].forEach((x, i) => items.push({ type: 'region', id: 'r' + (i + 1), x, y: 210, r: 22, label: KANA[i] }));
    return scene(items);
  }

  // 小学校で使った器具の写真（bas-4-r4。左から ア ビーカー・イ 試験管・ウ メスシリンダー（目盛りなし）・エ 火のついたアルコールランプ）
  const TOOLS_PHOTO_Q = scene([
    photo('bas-4-r4'),
    tag(160, 24, '小学校で使った器具'),
  ].concat([45, 120, 190, 274].map((x, i) => ({ type: 'region', id: 'r' + (i + 1), x, y: 214, r: 22, label: KANA[i] }))));

  // 集気びんの中のろうそく。kind は 'lid'（ふたをする）| 'open'（ふたをしない）| 'gap'（ふたをせず、下にすき間をあける）
  function jarItems(cx, kind) {
    const bottom = kind === 'gap' ? 176 : 188;
    const items = [
      { type: 'rect', x: cx - 36, y: 188, width: 72, height: 12, fill: 'brown' },
      { type: 'line', points: [[cx - 28, 56], [cx - 28, bottom]], color: 'ink', width: 3 },
      { type: 'line', points: [[cx + 28, 56], [cx + 28, bottom]], color: 'ink', width: 3 },
      { type: 'rect', x: cx - 6, y: 148, width: 12, height: 40, fill: 'white' },
      { type: 'flame', x: cx, y: 148 },
    ];
    if (kind === 'lid') items.push({ type: 'rect', x: cx - 34, y: 48, width: 68, height: 8, fill: 'gray' });
    if (kind === 'gap') {
      items.push({ type: 'arrow', x1: cx - 50, y1: 182, x2: cx - 30, y2: 182, color: 'blue', width: 2 });
      items.push({ type: 'arrow', x1: cx, y1: 70, x2: cx, y2: 40, color: 'blue', width: 2 });
    }
    return items;
  }
  function jarsScene() {
    return scene([].concat(jarItems(55, 'lid'), jarItems(160, 'open'), jarItems(265, 'gap'), [
      { type: 'region', id: 'r1', x: 55, y: 220, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 160, y: 220, r: 22, label: 'イ' },
      { type: 'region', id: 'r3', x: 265, y: 220, r: 22, label: 'ウ' },
    ]));
  }

  // 水中の小さな生物の写真（bas-3-c3。丸い視野 4 つ。大きさは実際の比ではない）
  // 視野の中心 x 40・120・200・278、y 98（半径 40）。左から ア ミカヅキモ・イ ゾウリムシ・ウ ミジンコ・エ ボルボックス。names: 名前を書く
  function microbesScene(names) {
    const items = [
      photo('bas-3-c3'),
      tag(160, 30, '池の水の中の小さな生物（大きさの比は実際とちがう）', { size: 13 }),
    ];
    if (names) {
      ['ミカヅキモ', 'ゾウリムシ', 'ミジンコ', 'ボルボックス'].forEach((t, i) => {
        items.push(tag([40, 120, 200, 278][i], 162, t, { size: 13 }));
      });
    } else {
      [40, 120, 200, 278].forEach((x, i) => items.push({ type: 'region', id: 'r' + (i + 1), x, y: 172, r: 22, label: KANA[i] }));
    }
    return scene(items);
  }

  // 顕微鏡の視野（中央 (160, 120)）と、像が動く 4 つの向き（ア 右上・イ 右下・ウ 左上・エ 左下）
  const VIEW_Q = scene([
    { type: 'circle', x: 160, y: 120, r: 84, fill: 'white' },
    { type: 'ellipse', x: 160, y: 120, rx: 14, ry: 8, fill: 'lightgreen' },
    { type: 'line', points: [[174, 106], [214, 66]], color: 'gray', width: 2, arrow: true },
    { type: 'line', points: [[174, 134], [214, 174]], color: 'gray', width: 2, arrow: true },
    { type: 'line', points: [[146, 106], [106, 66]], color: 'gray', width: 2, arrow: true },
    { type: 'line', points: [[146, 134], [106, 174]], color: 'gray', width: 2, arrow: true },
    { type: 'text', x: 160, y: 232, text: '接眼レンズをのぞいたときの視野', size: 12, anchor: 'middle' },
    { type: 'region', id: 'r1', x: 244, y: 40, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 244, y: 200, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 76, y: 40, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 76, y: 200, r: 22, label: 'エ' },
  ]);

  // ================================================================
  // 領域 1: 観察の道具
  // ================================================================

  // ---- ステージ bas-1: ルーペ・スケッチ・双眼実体顕微鏡 ----
  const bas1 = {
    id: 'bas-1', areaId: 'bas-observe', title: 'ルーペ・スケッチ・双眼実体顕微鏡', minutes: 5, concepts: ['bas-loupe', 'bas-stereo'],
    lessons: [
      {
        id: 'bas-1-c1',
        text: '**ルーペ**は目に近づけて持ちます。手に持てるものは、観察するものを前後に動かしてピントを合わせます。動かせないものは、ルーペを目に近づけたまま顔を前後に動かします。ルーペで太陽を見てはいけません。',
        // 写真（plants-1-c4 の画像）: ルーペを目のすぐ近くに持ち、手に持った花を前後に動かして見る
        figure: scene([
          { type: 'image', src: 'assets/images/plants/plants-1-c4.jpg' },
          pointer(188, 46, 137, 84),
          tag(250, 42, 'ルーペは目に近づける', { size: 13 }),
          { type: 'arrow', x1: 207, y1: 104, x2: 184, y2: 104, color: 'blue', width: 2 },
          { type: 'arrow', x1: 207, y1: 104, x2: 234, y2: 104, color: 'blue', width: 2 },
          tag(262, 136, '花を前後に動かす', { size: 13 }),
        ]),
      },
      {
        id: 'bas-1-c2',
        text: '理科の**スケッチ**は、よくけずった鉛筆で、細い線と点ではっきりかきます。影をつけたり、線を重ねがきしたりしません。観察するものだけをかき、色や手ざわりなど気づいたことは言葉で書きそえます。',
        // よいスケッチ（1 本の線）とよくないスケッチ（重ねがき・影）
        figure: scene([
          { type: 'rect', x: 16, y: 40, width: 136, height: 150, fill: 'white' },
          { type: 'rect', x: 168, y: 40, width: 136, height: 150, fill: 'white' },
          { type: 'ellipse', x: 84, y: 110, rx: 36, ry: 26, fill: 'none' },
          { type: 'text', x: 84, y: 176, text: '黄色・花びらが多い', size: 12, anchor: 'middle' },
          { type: 'ellipse', x: 236, y: 110, rx: 36, ry: 26, fill: 'gray' },
          { type: 'ellipse', x: 238, y: 108, rx: 37, ry: 27, fill: 'none' },
          { type: 'ellipse', x: 234, y: 112, rx: 35, ry: 25, fill: 'none' },
          { type: 'text', x: 84, y: 30, text: 'よい（細い線 1 本）', size: 13, anchor: 'middle' },
          { type: 'text', x: 236, y: 30, text: 'よくない（重ねがき・影）', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'bas-1-c3',
        text: '**双眼実体顕微鏡**は両目でのぞくので、ものを**立体的**に観察できます。倍率は 20〜40 倍くらいで、プレパラートをつくらずに、そのままのせて観察できます。',
        // 写真: 双眼実体顕微鏡（斜め前から。接眼レンズが 2 本、下にステージ）。部品の位置は STEREO_Q の上のコメント
        figure: scene([
          photo('bas-1-c3'),
          pointer(236, 28, 216, 28), tag(274, 32, '接眼レンズ'),
          pointer(110, 30, 158, 38), tag(58, 34, '視度調節リング'),
          pointer(74, 96, 92, 96), tag(42, 100, '微動ねじ'),
          pointer(74, 138, 108, 129), tag(42, 142, '粗動ねじ'),
          pointer(236, 124, 196, 124), tag(274, 128, '対物レンズ'),
        ]),
      },
    ],
    warmup: choice({
      id: 'bas-1-w1', concept: 'bas-loupe',
      prompt: '予想しよう。ルーペで手に持った花を観察するとき、ルーペはどこに持つとよいと思う？',
      options: ['目に近づけて持つ', '花に近づけて持つ', '目と花のちょうどまん中に持つ'],
      answer: 'a',
      explanation: 'ルーペは目に近づけて持ちます。そのうえで花を前後に動かして、はっきり見える所をさがします。くわしい使い方を、このステージで学ぼう。',
      hint: 'ルーペを目からはなすと、見える範囲がせまくなるよ。',
    }),
    problems: [
      choice({
        id: 'bas-1-p1', concept: 'bas-loupe',
        prompt: 'ルーペで、手に持ったタンポポの花を観察します。ピントの合わせ方として正しいのはどれ？',
        options: ['ルーペを目に近づけたまま、花を前後に動かす', '花を動かさず、ルーペだけを前後に動かす', 'ルーペを花に近づけ、目を遠ざける'],
        answer: 'a',
        explanation: 'ルーペは目に近づけて持ち、観察するものを前後に動かしてピントを合わせます。ルーペを目からはなして動かすと、見える範囲がせまくなり、ピントも合わせにくくなります。',
        hint: 'ルーペは目に近づけたまま動かさないよ。',
      }),
      fill({
        id: 'bas-1-t1', concept: 'bas-stereo', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '両目でのぞいて、ものを立体的に観察できる顕微鏡を[b1]という。',
        blanks: [word('b1', ['双眼実体顕微鏡', 'ルーペ', 'プレパラート'], '双眼実体顕微鏡')],
        explanation: '両目（双眼）で、ものを立体（実体）のまま見られるので**双眼実体顕微鏡**といいます。20〜40 倍くらいで観察します。',
        hint: '「両目」「立体」を表す字が名前に入っているよ。',
      }),
      choice({
        id: 'bas-1-p2', concept: 'bas-loupe',
        prompt: 'タンポポの花のスケッチをかきました。理科のスケッチとしてよくないのはどれ？',
        options: ['細い線ではっきりとかいた', '影をつけて立体的に見えるようにした', '気づいたことを言葉でも書きそえた'],
        answer: 'b',
        explanation: '理科のスケッチでは影をつけません。影をつけると、形や色がどうなっているのかが分かりにくくなります。細い線ではっきりかき、気づいたことは言葉で書きそえます。',
        hint: '絵の作品と、観察の記録のちがいを考えよう。',
      }),
      figureChoice({
        id: 'bas-1-p3', concept: 'bas-stereo',
        prompt: '図は双眼実体顕微鏡です。左目で見たときのピントを合わせるのに使う「視度調節リング」はどれ？ ア〜オから選ぼう。',
        figure: STEREO_Q,
        answer: 'r2',
        explanation: '視度調節リングは、片方の接眼レンズについている輪です。右目と左目の見え方のちがいを、このリングを回して合わせます。',
        hint: '接眼レンズについている、輪のような部分だよ。',
      }),
      choice({
        id: 'bas-1-p4', concept: 'bas-stereo',
        prompt: '双眼実体顕微鏡でピントを合わせる順として正しいのはどれ？ ア 左目でのぞき、視度調節リングを回す　イ 粗動ねじをゆるめ、鏡筒を上下させておよそピントを合わせる　ウ 右目でのぞき、微動ねじを回す　エ 接眼レンズの間隔を、自分の目の間隔に合わせる',
        options: ['エ → イ → ウ → ア', 'イ → エ → ア → ウ', 'エ → ア → ウ → イ'],
        answer: 'a',
        explanation: 'まず接眼レンズの間隔を目に合わせ、左右の視野が 1 つに見えるようにします。次に粗動ねじでおよそピントを合わせ、右目で微動ねじ、最後に左目で視度調節リングを回して合わせます。',
        hint: 'はじめに両目でのぞけるようにし、だいたい → 右目 → 左目の順に合わせるよ。',
      }),
      choice({
        id: 'bas-1-p5', concept: 'bas-loupe',
        prompt: '花のスケッチで、輪郭を何本もの線で重ねてかいてしまいました。どう直すとよい？',
        options: ['1 本の細い線ではっきりかく', '色えんぴつでぬりつぶす', 'もっと太い線で何回もなぞる'],
        answer: 'a',
        explanation: '線を重ねがきすると、本当の輪郭がどこか分からなくなります。よくけずった鉛筆で、1 本の細い線ではっきりかきます。',
        hint: '輪郭がどこか、見た人にすぐ分かるかき方を考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'bas-1-r1', concept: 'bas-loupe',
        prompt: 'ルーペで、木の幹のように動かせないものを観察するときは、どうする？',
        options: ['ルーペを目に近づけたまま、顔を前後に動かす', 'ルーペを木に近づけ、目をはなす', 'ルーペを目からはなして前後に動かす'],
        answer: 'a',
        explanation: '観察するものが動かせないときは、ルーペを目に近づけたまま、自分の顔を前後に動かしてピントを合わせます。',
        hint: 'ルーペと目の位置は変えないよ。',
      }),
      choice({
        id: 'bas-1-r2', concept: 'bas-loupe',
        prompt: 'ルーペを使うときに、ぜったいにしてはいけないことはどれ？',
        options: ['ルーペで太陽を見る', 'ルーペを目に近づけて持つ', '観察する花を前後に動かす'],
        answer: 'a',
        explanation: 'ルーペで太陽を見ると、集まった強い光で目をいためます。ぜったいにしてはいけません。',
        hint: 'ルーペは光を集めるはたらきがあるね。',
      }),
      choice({
        id: 'bas-1-r3', concept: 'bas-stereo',
        prompt: '双眼実体顕微鏡の特徴として正しいのはどれ？',
        options: ['立体的に観察でき、プレパラートをつくらなくてよい', '600 倍くらいの高い倍率で観察する', '片目だけでのぞいて観察する'],
        answer: 'a',
        explanation: '双眼実体顕微鏡は両目でのぞくので立体的に見えます。倍率は 20〜40 倍くらいで、観察するものをそのままのせて見られます。',
        hint: '名前の「双眼」と「実体」に注目しよう。',
      }),
      figureChoice({
        id: 'bas-1-r4', concept: 'bas-stereo',
        prompt: '図は双眼実体顕微鏡です。鏡筒を大きく上下させるときにゆるめる「粗動ねじ」はどれ？ ア〜オから選ぼう。',
        figure: STEREO_Q,
        answer: 'r4',
        explanation: '粗動ねじは支柱についているねじで、ゆるめると鏡筒を大きく上下に動かせます。細かいピント合わせは微動ねじで行います。',
        hint: '支柱の下のほうについているねじだよ。',
      }),
    ],
  };

  // ---- ステージ bas-2: 顕微鏡のつくりと使い方 ----
  const bas2 = {
    id: 'bas-2', areaId: 'bas-observe', title: '顕微鏡のつくりと使い方', minutes: 5, concepts: ['bas-scope'],
    lessons: [
      {
        id: 'bas-2-c1',
        text: '顕微鏡は、目でのぞく**接眼レンズ**と、観察するものに近い**対物レンズ**で拡大します。対物レンズは**レボルバー**を回してかえます。**反射鏡**で光を集め、ステージの下の**しぼり**で明るさを調節します。',
        // 写真: 反射鏡のついた光学顕微鏡（真横から）。部品の位置は SCOPE_Q の上のコメント
        figure: scene([
          photo('bas-2-c1'),
          pointer(84, 22, 142, 22), tag(46, 26, '接眼レンズ'),
          pointer(84, 80, 122, 96), tag(46, 84, 'レボルバー'),
          pointer(84, 126, 115, 116), tag(46, 130, '対物レンズ'),
          pointer(70, 186, 134, 188), tag(46, 190, '反射鏡'),
          pointer(254, 34, 158, 48), tag(274, 38, '鏡筒'),
          pointer(240, 82, 184, 76), tag(274, 86, '調節ねじ'),
          pointer(240, 134, 182, 144), tag(274, 138, 'ステージ'),
          pointer(250, 186, 162, 162), tag(274, 190, 'しぼり'),
        ]),
      },
      {
        id: 'bas-2-c2',
        text: 'スライドガラスに観察するものをのせ、水を 1 滴落として、カバーガラスをかけたものを**プレパラート**といいます。カバーガラスは、空気の泡が入らないように、はしから静かにおろします。',
        // 写真: スライドガラスの水 1 滴の上に、ピンセットでカバーガラスを片はしからななめにおろしている（斜め上から）
        // スライドガラス (60, 166)、カバーガラス (185, 118)、水 1 滴 (182, 162)、カバーガラスの上がったはし (205, 90)
        figure: scene([
          photo('bas-2-c2'),
          pointer(66, 116, 60, 166), tag(66, 110, 'スライドガラス'),
          pointer(150, 46, 185, 118), tag(140, 40, 'カバーガラス'),
          pointer(244, 190, 186, 162), tag(270, 196, '水 1 滴'),
          { type: 'arrow', x1: 236, y1: 98, x2: 224, y2: 128, color: 'blue', width: 3 },
          tag(244, 230, 'はしから静かにおろす'),
        ]),
      },
      {
        id: 'bas-2-c3',
        anim: 'ba-focus-steps',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '観察は**低倍率**から始めます。① 反射鏡で視野を明るくする ② プレパラートをステージにのせる ③ 横から見ながら対物レンズとプレパラートを近づける ④ のぞきながら遠ざけてピントを合わせる、の順です。',
        figure: scene([
          { type: 'text', x: 20, y: 40, text: '① 反射鏡で明るくする', size: 14 },
          { type: 'text', x: 20, y: 80, text: '② プレパラートをのせる', size: 14 },
          { type: 'text', x: 20, y: 120, text: '③ 横から見て近づける', size: 14 },
          { type: 'text', x: 20, y: 160, text: '④ のぞきながら遠ざけて', size: 14 },
          { type: 'text', x: 44, y: 180, text: 'ピントを合わせる', size: 14 },
          { type: 'line', points: [[240, 40], [240, 168]], color: 'gray', width: 2, arrow: true },
          { type: 'text', x: 160, y: 224, text: 'はじめは低倍率で', size: 14, anchor: 'middle', bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'bas-2-w1', concept: 'bas-scope',
      prompt: '予想しよう。顕微鏡で観察を始めるとき、倍率はどちらにしておくとよいと思う？',
      options: ['低い倍率', '高い倍率', 'どちらでもよい'],
      answer: 'a',
      explanation: '低い倍率のほうが見える範囲が広く、観察するものをさがしやすいので、はじめは低倍率にします。顕微鏡のつくりと使い方を、このステージで学ぼう。',
      hint: '見える範囲が広いほうが、さがしやすいね。',
    }),
    problems: [
      figureChoice({
        id: 'bas-2-p1', concept: 'bas-scope',
        prompt: '図は顕微鏡です。観察するものに近いほうのレンズ「対物レンズ」はどれ？ ア〜クから選ぼう。',
        figure: SCOPE_Q,
        answer: 'r3',
        explanation: '対物レンズは、レボルバーについていて、プレパラートのすぐ上にあるレンズです。目でのぞく上のレンズは接眼レンズです。',
        hint: '「対物」は、観察するもの（物）に向かい合うという意味だよ。',
      }),
      fill({
        id: 'bas-2-t1', concept: 'bas-scope', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'スライドガラスに観察するものをのせ、カバーガラスをかけたものを[b1]という。',
        blanks: [word('b1', ['プレパラート', 'レボルバー', 'ステージ'], 'プレパラート')],
        explanation: '観察するものをスライドガラスにのせ、カバーガラスをかけたものを**プレパラート**といいます。顕微鏡のステージにのせて観察します。',
        hint: 'スライドガラスとカバーガラスでできたもののことだよ。',
      }),
      choice({
        id: 'bas-2-p2', concept: 'bas-scope',
        prompt: '顕微鏡の使い方の正しい順はどれ？ ア プレパラートをステージにのせる　イ 横から見ながら、プレパラートと対物レンズを近づける　ウ 接眼レンズをのぞき、反射鏡の角度を変えて明るく見えるようにする　エ 接眼レンズをのぞきながら、プレパラートと対物レンズを遠ざけてピントを合わせる',
        options: ['ウ → ア → イ → エ', 'ア → イ → エ → ウ', 'ア → エ → イ → ウ'],
        answer: 'a',
        explanation: 'はじめに反射鏡で視野を明るくし、プレパラートをのせます。横から見ながら近づけたあと、のぞきながら遠ざけてピントを合わせます。',
        hint: '明るくする → のせる → 近づける → 遠ざけながら合わせる、の順だよ。',
      }),
      figureChoice({
        id: 'bas-2-p3', concept: 'bas-scope',
        prompt: '図は顕微鏡です。光を集めて視野を明るくする「反射鏡」はどれ？ ア〜クから選ぼう。',
        figure: SCOPE_Q,
        answer: 'r4',
        explanation: '反射鏡はステージの下にある鏡で、角度を変えて光をプレパラートに送ります。直射日光の当たらない明るい所で使います。',
        hint: 'ステージのいちばん下にある、丸い鏡だよ。',
      }),
      choice({
        id: 'bas-2-p4', concept: 'bas-scope',
        prompt: 'ピントを合わせるとき、接眼レンズをのぞきながら、プレパラートと対物レンズを「遠ざけながら」合わせるのはなぜ？',
        options: ['対物レンズがプレパラートにぶつからないようにするため', '視野を明るくするため', '倍率を高くするため'],
        answer: 'a',
        explanation: 'のぞきながら近づけると、対物レンズがプレパラートにぶつかって、レンズやプレパラートをこわすことがあります。近づけるのは横から見ながら行い、のぞいているときは遠ざけます。',
        hint: 'のぞいているときは、レンズとプレパラートのすき間が見えないね。',
      }),
      figureChoice({
        id: 'bas-2-p5', concept: 'bas-scope',
        prompt: '図は顕微鏡です。ステージの裏についていて、光の量を調節する「しぼり」はどれ？ ア〜クから選ぼう。',
        figure: SCOPE_Q,
        answer: 'r8',
        explanation: 'しぼりはステージのすぐ下（裏）についていて、通る光の量を変えて明るさを調節します。',
        hint: 'ステージのすぐ下の小さな部分だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'bas-2-r1', concept: 'bas-scope',
        prompt: '図は顕微鏡です。回して対物レンズをかえる「レボルバー」はどれ？ ア〜クから選ぼう。',
        figure: SCOPE_Q,
        answer: 'r2',
        explanation: 'レボルバーは鏡筒の下にあり、回すと対物レンズをかえられます。倍率をかえるときに使います。',
        hint: '対物レンズがついている、回る部分だよ。',
      }),
      figureChoice({
        id: 'bas-2-r2', concept: 'bas-scope',
        prompt: '図は顕微鏡です。回してピントを合わせる「調節ねじ」はどれ？ ア〜クから選ぼう。',
        figure: SCOPE_Q,
        answer: 'r6',
        explanation: '調節ねじはアームの横にあるねじで、回すとプレパラートと対物レンズの間の距離が変わり、ピントを合わせられます。',
        hint: 'アームの横についている丸いねじだよ。',
      }),
      choice({
        id: 'bas-2-r3', concept: 'bas-scope',
        prompt: '顕微鏡の観察を低倍率から始めるのはなぜ？',
        options: ['視野が広く、観察するものをさがしやすいから', '視野がせまく、くわしく見られるから', '低倍率のほうが暗く見えるから'],
        answer: 'a',
        explanation: '低倍率は視野が広くて明るいので、観察するものを見つけやすいです。見つけてから高倍率にして、くわしく観察します。',
        hint: '倍率を低くすると、見える範囲はどうなるかな。',
      }),
      choice({
        id: 'bas-2-t2', concept: 'bas-scope', term: true,
        prompt: '次の説明に合う言葉はどれ？「顕微鏡で、目でのぞくほうのレンズ」',
        options: ['接眼レンズ', '対物レンズ', '反射鏡'],
        answer: 'a',
        explanation: '目でのぞくほうのレンズを**接眼レンズ**、観察するものに近いほうのレンズを対物レンズといいます。',
        hint: '「眼」に「接」するレンズだよ。',
      }),
    ],
  };

  // ---- ステージ bas-3: 顕微鏡の倍率と水中の小さな生物 ----
  const bas3 = {
    id: 'bas-3', areaId: 'bas-observe', title: '倍率と水中の小さな生物', minutes: 5, concepts: ['bas-magnify', 'bas-microbe'],
    lessons: [
      {
        id: 'bas-3-c1',
        text: '顕微鏡の**倍率**は、接眼レンズの倍率 × 対物レンズの倍率です。10 倍と 40 倍なら 400 倍です。倍率を高くすると、見える範囲（**視野**）はせまくなり、暗くなります。',
        // 写真: タマネギの表皮の視野 2 つ。左は低倍率（細胞が小さくたくさん・明るい）、右は高倍率（細胞が大きく数個・少し暗い）
        // 左の視野の中心 (78, 120)・右の視野の中心 (240, 120)、半径 72
        figure: scene([
          photo('bas-3-c1'),
          tag(160, 26, '倍率 ＝ 接眼レンズ × 対物レンズ', { bold: true }),
          tag(78, 222, '低倍率: 広く明るい', { size: 13 }),
          tag(240, 222, '高倍率: せまく暗い', { size: 13 }),
        ]),
      },
      {
        id: 'bas-3-c2',
        anim: 'ba-image-reverse',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '顕微鏡で見える像は、上下左右が逆になっています。そのため、プレパラートを動かすと、像は**反対の向き**に動いて見えます。右上へ動かすと、像は左下へ動きます。',
        figure: scene([
          { type: 'rect', x: 20, y: 80, width: 120, height: 40, fill: 'glass' },
          { type: 'arrow', x1: 80, y1: 140, x2: 120, y2: 110, color: 'blue' },
          { type: 'text', x: 80, y: 60, text: 'プレパラートを右上へ', size: 13, anchor: 'middle' },
          { type: 'circle', x: 240, y: 110, r: 60, fill: 'white' },
          { type: 'arrow', x1: 260, y1: 92, x2: 220, y2: 128, color: 'orange' },
          { type: 'text', x: 240, y: 196, text: '像は左下へ動く', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'bas-3-c3',
        text: '池の水には、緑色の**ミカヅキモ**や**ボルボックス**、動き回る**ゾウリムシ**や**ミジンコ**などの小さな生物がいます。ミジンコは 1〜2 mm ほどで、この中ではいちばん大きく、肉眼でも見えます。',
        // 写真: 池の水の小さな生物 4 種の視野（左から ミカヅキモ・ゾウリムシ・ミジンコ・ボルボックス）
        figure: microbesScene(true),
      },
    ],
    warmup: choice({
      id: 'bas-3-w1', concept: 'bas-magnify',
      prompt: '予想しよう。顕微鏡の倍率を高くすると、見える範囲はどうなると思う？',
      options: ['広くなる', 'せまくなる', '変わらない'],
      answer: 'b',
      explanation: '大きく拡大するほど、一度に見える範囲はせまくなります。倍率の求め方と見え方を、このステージで学ぼう。',
      hint: '虫めがねで近くを大きく見ると、見える所はどうなるかな。',
    }),
    problems: [
      fill({
        id: 'bas-3-p1', concept: 'bas-magnify',
        prompt: '空らんに入る数を入れよう。',
        text: '接眼レンズが 10 倍、対物レンズが 10 倍のとき、顕微鏡の倍率は[b1]である。',
        blanks: [number('b1', 100, 0, '倍')],
        explanation: '顕微鏡の倍率は、接眼レンズの倍率 × 対物レンズの倍率です。10 × 10 ＝ 100 倍になります。',
        hint: '2 つのレンズの倍率をかけ算しよう。',
      }),
      fill({
        id: 'bas-3-t1', concept: 'bas-magnify', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '顕微鏡をのぞいたときに見える範囲を[b1]という。',
        blanks: [word('b1', ['視野', '倍率', 'ピント'], '視野')],
        explanation: '顕微鏡やルーペで見える範囲を**視野**といいます。倍率を高くすると、視野はせまくなります。',
        hint: '「視」は見ること、「野」は広がりを表すよ。',
      }),
      fill({
        id: 'bas-3-p2', concept: 'bas-magnify',
        prompt: '空らんに入る数を入れよう。',
        text: '接眼レンズが 15 倍、対物レンズが 40 倍のとき、顕微鏡の倍率は[b1]である。',
        blanks: [number('b1', 600, 0, '倍')],
        explanation: '15 × 40 ＝ 600 倍です。たし算ではなく、かけ算で求めます。',
        hint: '接眼レンズの倍率 × 対物レンズの倍率だよ。',
      }),
      choice({
        id: 'bas-3-p3', concept: 'bas-magnify',
        prompt: '顕微鏡の倍率を低倍率から高倍率にかえました。視野の広さと明るさはどうなる？',
        options: ['視野はせまくなり、暗くなる', '視野は広くなり、明るくなる', '視野はせまくなり、明るくなる'],
        answer: 'a',
        explanation: '高倍率にすると、せまい範囲を大きく拡大するので視野はせまくなります。入る光も少なくなるので暗くなります。暗いときは、しぼりや反射鏡で明るさを調節します。',
        hint: '拡大するほど、見える範囲も光の量も少なくなるよ。',
      }),
      figureChoice({
        id: 'bas-3-p4', concept: 'bas-magnify',
        prompt: '顕微鏡で観察中に、プレパラートを右上へ動かしました。視野の中の像は、どの向きに動いて見える？ ア〜エから選ぼう。',
        figure: VIEW_Q,
        answer: 'r4',
        explanation: '顕微鏡の像は上下左右が逆に見えるので、プレパラートを動かした向きと反対に動きます。右上へ動かすと、像は左下へ動いて見えます。',
        hint: 'プレパラートを動かした向きの反対だよ。',
      }),
      figureChoice({
        id: 'bas-3-p5', concept: 'bas-microbe',
        prompt: '図は池の水で見つけた生物の写真です（大きさの比は実際とちがう）。実際の大きさがいちばん大きいのはどれ？ ア〜エから選ぼう。',
        figure: microbesScene(false),
        answer: 'r3',
        explanation: 'ウはミジンコで、大きさは 1〜2 mm ほどあり、肉眼でも見えます。ア ミカヅキモ、イ ゾウリムシ、エ ボルボックスは、どれもミジンコより小さく、顕微鏡でないとよく見えません。',
        hint: '触角があり、肉眼でもぴょんぴょん泳ぐのが見える生物だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'bas-3-r1', concept: 'bas-magnify',
        prompt: '空らんに入る数を入れよう。',
        text: '接眼レンズが 10 倍、対物レンズが 40 倍のとき、顕微鏡の倍率は[b1]である。',
        blanks: [number('b1', 400, 0, '倍')],
        explanation: '10 × 40 ＝ 400 倍です。',
        hint: '2 つのレンズの倍率をかけ算しよう。',
      }),
      choice({
        id: 'bas-3-r2', concept: 'bas-magnify',
        prompt: '視野の右上に見えている生物を、視野の中央に動かしたい。プレパラートをどの向きに動かせばよい？',
        options: ['右上', '左下', '右下'],
        answer: 'a',
        explanation: '像はプレパラートと反対の向きに動きます。像を左下（中央の向き）へ動かしたいので、プレパラートは右上へ動かします。見えている向きと同じ向きに動かす、と覚えよう。',
        hint: '像を動かしたい向きの反対に、プレパラートを動かすよ。',
      }),
      figureChoice({
        id: 'bas-3-r3', concept: 'bas-microbe',
        prompt: '図は池の水で見つけた生物の写真です。三日月の形をした緑色の生物「ミカヅキモ」はどれ？ ア〜エから選ぼう。',
        figure: microbesScene(false),
        answer: 'r1',
        explanation: 'アがミカヅキモです。三日月の形をした緑色の生物で、光合成をします。イはゾウリムシ、ウはミジンコ、エはボルボックスです。',
        hint: '名前のとおりの形をさがそう。',
      }),
      choice({
        id: 'bas-3-r4', concept: 'bas-microbe',
        prompt: '次の生物のうち、緑色で光合成をするものはどれ？',
        options: ['ボルボックス', 'ゾウリムシ', 'ミジンコ'],
        answer: 'a',
        explanation: 'ボルボックスやミカヅキモは緑色で、光合成をします。ゾウリムシやミジンコは緑色ではなく、動き回ってほかの生物などを食べます。',
        hint: '緑色の粒をもっている生物をさがそう。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 実験の基本
  // ================================================================

  // ---- ステージ bas-4: ガスバーナーと小学校の復習 ----
  const bas4 = {
    id: 'bas-4', areaId: 'bas-experiment', title: 'ガスバーナーと小学校の復習', minutes: 5, concepts: ['bas-burner', 'bas-review'],
    lessons: [
      {
        id: 'bas-4-c1',
        text: '**ガスバーナー**には、上に**空気調節ねじ**、下に**ガス調節ねじ**があります。どちらのねじも、上から見て反時計回り（左回り）に回すと開き、時計回りに回すと閉まります。',
        // 写真: ガスバーナー（真横から。火はついていない）。ねじのつまみは右向き。部品の位置は BURNER_Q の上のコメント
        figure: scene([
          photo('bas-4-c1'),
          pointer(192, 116, 162, 120), tag(240, 120, '空気調節ねじ'),
          pointer(184, 146, 162, 160), tag(228, 150, 'ガス調節ねじ'),
          pointer(282, 212, 274, 198), tag(288, 228, '元栓'),
        ]),
      },
      {
        id: 'bas-4-c2',
        text: '火をつけるときは、2 つのねじが閉まっていることを確かめてから元栓を開き、マッチの火を近づけてガス調節ねじを開きます。空気調節ねじで**青い炎**にします。消すときは、空気・ガス・元栓の順に閉めます。',
        // 写真: ガスバーナー 2 台。左は空気が足りないオレンジ色の炎、右は空気を調節した青い炎
        // 左の炎 (84, 30〜100)、右の炎 (228, 50〜95)。文字は炎にかからないよう、筒と台の上に下地つきで置く
        figure: scene([
          photo('bas-4-c2'),
          pointer(266, 72, 236, 76), tag(290, 76, '青い炎'),
          tag(160, 126, 'つけるとき', { bold: true }),
          tag(160, 146, 'ねじの確認 → 元栓 → マッチの火', { size: 13 }),
          tag(160, 166, '→ ガス調節ねじ → 空気調節ねじ', { size: 13 }),
          tag(160, 196, '消すとき', { bold: true }),
          tag(160, 216, '空気調節ねじ → ガス調節ねじ → 元栓', { size: 13 }),
        ]),
      },
      {
        id: 'bas-4-c3',
        anim: 'ba-candle-air',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '小学校の復習です。ものが燃えると、空気中の**酸素**が使われて減り、**二酸化炭素**が増えます。ろうそくが燃え続けるには、集気びんの中の空気が入れかわり、新しい空気が入ってくることが必要です。',
        figure: scene(jarItems(90, 'lid').concat(jarItems(230, 'gap'), [
          { type: 'text', x: 90, y: 228, text: 'ふたをする', size: 13, anchor: 'middle' },
          { type: 'text', x: 230, y: 228, text: '空気が入れかわる', size: 13, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'bas-4-w1', concept: 'bas-burner',
      prompt: '予想しよう。ガスバーナーの炎がオレンジ色でゆらゆらしているとき、何が足りないと思う？',
      options: ['空気', 'ガス', '水'],
      answer: 'a',
      explanation: '空気（酸素）が足りないと、炎はオレンジ色でゆらゆらします。空気調節ねじを開くと、青い炎になります。正しい使い方を、このステージで学ぼう。',
      hint: '空気調節ねじを開くと、炎の色が変わるよ。',
    }),
    problems: [
      figureChoice({
        id: 'bas-4-p1', concept: 'bas-burner',
        prompt: '図はガスバーナーです。炎の色を調節する「空気調節ねじ」はどれ？ ア〜ウから選ぼう。',
        figure: BURNER_Q,
        answer: 'r1',
        explanation: '2 つのねじのうち、上が空気調節ねじ、下がガス調節ねじです。空気調節ねじを開くと空気が入り、炎が青くなります。',
        hint: '2 つのねじのうち、上のほうだよ。',
      }),
      fill({
        id: 'bas-4-t1', concept: 'bas-burner', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ガスバーナーの 2 つのねじのうち、上のねじを[b1]、下のねじを[b2]という。',
        blanks: [
          word('b1', ['空気調節ねじ', 'ガス調節ねじ'], '空気調節ねじ'),
          word('b2', ['空気調節ねじ', 'ガス調節ねじ'], 'ガス調節ねじ'),
        ],
        explanation: '上が**空気調節ねじ**（炎の色を調節）、下が**ガス調節ねじ**（炎の大きさを調節）です。',
        hint: 'ガスは下から入ってくるね。',
      }),
      choice({
        id: 'bas-4-p2', concept: 'bas-burner',
        prompt: 'ガスバーナーに火をつける正しい順はどれ？ ア ガスの元栓を開く　イ 空気調節ねじを開いて炎を青くする　ウ ガス調節ねじを開いて火をつける　エ マッチに火をつけ、バーナーの口に近づける　オ 2 つのねじが閉まっていることを確かめる',
        options: ['オ → ア → エ → ウ → イ', 'ア → オ → ウ → エ → イ', 'オ → エ → ア → イ → ウ'],
        answer: 'a',
        explanation: 'はじめにねじが閉まっていることを確かめ、元栓を開きます。マッチの火を近づけてからガス調節ねじを開いて火をつけ、最後に空気調節ねじで炎を青くします。',
        hint: '火を近づけてからガスを出すと、安全に火がつくよ。',
      }),
      choice({
        id: 'bas-4-p3', concept: 'bas-burner',
        prompt: 'ガスバーナーの火を消すとき、閉める正しい順はどれ？',
        options: ['空気調節ねじ → ガス調節ねじ → 元栓', '元栓 → ガス調節ねじ → 空気調節ねじ', 'ガス調節ねじ → 空気調節ねじ → 元栓'],
        answer: 'a',
        explanation: '火を消すときは、つけるときの逆で、空気調節ねじ → ガス調節ねじ → 元栓の順に閉めます。',
        hint: 'つけたときの逆の順だよ。',
      }),
      figureChoice({
        id: 'bas-4-p4', concept: 'bas-review',
        prompt: '集気びんの中でろうそくを燃やしました。ア ふたをする、イ ふたをしない、ウ ふたをせず下にすき間をあける。いちばん長く燃え続けるのはどれ？',
        figure: jarsScene(),
        answer: 'r3',
        explanation: 'ウは下のすき間から新しい空気が入り、上から出ていくので、空気が入れかわって長く燃え続けます。アは新しい空気が入らないので、いちばん早く消えます。',
        hint: '新しい空気が入れかわるのはどれか考えよう。',
      }),
      fill({
        id: 'bas-4-p5', concept: 'bas-review',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'ふたをした集気びんの中でろうそくを燃やすと、びんの中の[b1]が減り、[b2]が増える。',
        blanks: [
          word('b1', ['酸素', '二酸化炭素', 'ちっ素'], '酸素'),
          word('b2', ['酸素', '二酸化炭素', 'ちっ素'], '二酸化炭素'),
        ],
        explanation: 'ものが燃えるときには酸素が使われるので、酸素が減り、二酸化炭素が増えます。ちっ素は燃える前後でほとんど変わりません。',
        hint: 'ものを燃やすはたらきのある気体はどれかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'bas-4-r1', concept: 'bas-burner',
        prompt: '炎がオレンジ色のまま、試験管を加熱するとどうなる？',
        options: ['試験管にすすがついて黒くなる', '試験管がすぐに冷える', '炎がしだいに青くなる'],
        answer: 'a',
        explanation: '空気が足りないオレンジ色の炎では、ガスが燃えきらずにすすが出て、試験管が黒くなります。加熱は、空気調節ねじで青い炎にしてから行います。',
        hint: '燃えきらないと、黒いものが出るよ。',
      }),
      choice({
        id: 'bas-4-r2', concept: 'bas-burner',
        prompt: 'ガスバーナーのねじを開く（ゆるめる）には、どちらに回す？',
        options: ['上から見て反時計回り（左回り）', '上から見て時計回り（右回り）', 'どちらに回しても開く'],
        answer: 'a',
        explanation: 'ガスバーナーのねじは、上から見て反時計回り（左回り）に回すと開き、時計回り（右回り）に回すと閉まります。',
        hint: 'ペットボトルのふたを開けるときと同じ向きだよ。',
      }),
      figureChoice({
        id: 'bas-4-r3', concept: 'bas-review',
        prompt: '集気びんの中でろうそくを燃やしました。ア ふたをする、イ ふたをしない、ウ ふたをせず下にすき間をあける。いちばん早く火が消えるのはどれ？',
        figure: jarsScene(),
        answer: 'r1',
        explanation: 'アはふたをしているので、新しい空気が入りません。中の酸素が減ると、火はすぐに消えてしまいます。',
        hint: '新しい空気が入らないのはどれかな。',
      }),
      figureChoice({
        id: 'bas-4-r4', concept: 'bas-review',
        prompt: '小学校で使った器具です。アルコールランプはどれ？ ア〜エから選ぼう。',
        figure: TOOLS_PHOTO_Q,
        answer: 'r4',
        explanation: 'エがアルコールランプです。アはビーカー、イは試験管、ウはメスシリンダーです。',
        hint: '炎が出ている器具だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'bas-loupe', title: 'ルーペとスケッチ', basic: null, lessonStageId: 'bas-1',
      checkPool: [
        choice({
          id: 'bas-loupe-k1', concept: 'bas-loupe',
          prompt: 'ルーペの正しい持ち方はどれ？',
          options: ['目に近づけて持つ', '観察するものに近づけて持つ', '腕をのばして目から遠ざけて持つ'],
          answer: 'a',
          explanation: 'ルーペは目に近づけて持ちます。手に持てるものは、そのものを前後に動かしてピントを合わせます。',
          hint: 'ルーペと目の距離は近いほうがよいよ。',
        }),
        choice({
          id: 'bas-loupe-k2', concept: 'bas-loupe',
          prompt: '理科のスケッチのかき方として正しいのはどれ？',
          options: ['観察するものだけを、細い線ではっきりかく', 'まわりの景色もいっしょにかく', '影をつけて、ぬりつぶしてかく'],
          answer: 'a',
          explanation: '理科のスケッチは、観察するものだけを細い線と点ではっきりかきます。影はつけず、気づいたことは言葉で書きそえます。',
          hint: '観察の記録として、何をかけばよいか考えよう。',
        }),
        choice({
          id: 'bas-loupe-k3', concept: 'bas-loupe',
          prompt: 'スケッチで、花の色や手ざわりなど、絵だけでは伝わらないことはどうする？',
          options: ['言葉で書きそえる', '何も書かない', '影をつけて表す'],
          answer: 'a',
          explanation: '色・手ざわり・においなど、絵だけでは伝わらないことは、言葉で書きそえます。',
          hint: '見た人に伝わるように記録しよう。',
        }),
      ],
    },
    {
      id: 'bas-stereo', title: '双眼実体顕微鏡', basic: 'bas-loupe', lessonStageId: 'bas-1',
      checkPool: [
        figureChoice({
          id: 'bas-stereo-k1', concept: 'bas-stereo',
          prompt: '図は双眼実体顕微鏡です。右目でのぞきながら、細かくピントを合わせる「微動ねじ」はどれ？ ア〜オから選ぼう。',
          figure: STEREO_Q,
          answer: 'r3',
          explanation: '微動ねじは鏡筒の横にあるねじで、回すと細かくピントを合わせられます。右目でのぞきながら回します。',
          hint: '鏡筒の横についているねじだよ。',
        }),
        choice({
          id: 'bas-stereo-k2', concept: 'bas-stereo',
          prompt: '双眼実体顕微鏡で、はじめにすることはどれ？',
          options: ['接眼レンズの間隔を、自分の目の間隔に合わせる', '視度調節リングを回す', '微動ねじを回す'],
          answer: 'a',
          explanation: 'はじめに接眼レンズの間隔を目の間隔に合わせ、左右の視野が重なって 1 つに見えるようにします。そのあとでピントを合わせます。',
          hint: '両目でのぞけるようにするのが先だよ。',
        }),
        choice({
          id: 'bas-stereo-k3', concept: 'bas-stereo',
          prompt: '双眼実体顕微鏡が観察に向いているのはどれ？',
          options: ['火山灰の粒や花のつくりを立体的に見るとき', '細胞のつくりを 600 倍で見るとき', '遠くの山を見るとき'],
          answer: 'a',
          explanation: '双眼実体顕微鏡は 20〜40 倍くらいで、ものを立体的に見られます。火山灰の粒や小さな花のつくりなどの観察に向いています。',
          hint: '倍率はそれほど高くないけれど、立体的に見えるよ。',
        }),
      ],
    },
    {
      id: 'bas-scope', title: '顕微鏡のつくりと使い方', basic: null, lessonStageId: 'bas-2',
      checkPool: [
        figureChoice({
          id: 'bas-scope-k1', concept: 'bas-scope',
          prompt: '図は顕微鏡です。目でのぞく「接眼レンズ」はどれ？ ア〜クから選ぼう。',
          figure: SCOPE_Q,
          answer: 'r1',
          explanation: '接眼レンズは鏡筒のいちばん上にあり、目でのぞくレンズです。',
          hint: 'いちばん上にあるレンズだよ。',
        }),
        figureChoice({
          id: 'bas-scope-k2', concept: 'bas-scope',
          prompt: '図は顕微鏡です。プレパラートをのせる台「ステージ」はどれ？ ア〜クから選ぼう。',
          figure: SCOPE_Q,
          answer: 'r7',
          explanation: 'ステージは、プレパラートをのせる平らな台です。クリップでプレパラートをおさえます。',
          hint: '対物レンズの下の平らな台だよ。',
        }),
        figureChoice({
          id: 'bas-scope-k3', concept: 'bas-scope',
          prompt: '図は顕微鏡です。接眼レンズと対物レンズをつなぐ筒「鏡筒」はどれ？ ア〜クから選ぼう。',
          figure: SCOPE_Q,
          answer: 'r5',
          explanation: '鏡筒は、上に接眼レンズ、下にレボルバーと対物レンズがついた筒です。',
          hint: '2 つのレンズの間にある筒だよ。',
        }),
        choice({
          id: 'bas-scope-k4', concept: 'bas-scope',
          prompt: 'プレパラートをつくるとき、カバーガラスはどのようにかける？',
          options: ['空気の泡が入らないように、はしから静かにおろす', '上から勢いよく落とす', '水をつけずに、そのままのせる'],
          answer: 'a',
          explanation: 'カバーガラスを、はしから静かにおろすと、空気の泡が入りにくくなります。泡が入ると観察のじゃまになります。',
          hint: '空気の泡が入ると見えにくいね。',
        }),
      ],
    },
    {
      id: 'bas-magnify', title: '倍率と見え方', basic: 'bas-scope', lessonStageId: 'bas-3',
      checkPool: [
        fill({
          id: 'bas-magnify-k1', concept: 'bas-magnify',
          prompt: '空らんに入る数を入れよう。',
          text: '接眼レンズが 15 倍、対物レンズが 10 倍のとき、顕微鏡の倍率は[b1]である。',
          blanks: [number('b1', 150, 0, '倍')],
          explanation: '15 × 10 ＝ 150 倍です。',
          hint: '2 つのレンズの倍率をかけ算しよう。',
        }),
        choice({
          id: 'bas-magnify-k2', concept: 'bas-magnify',
          prompt: '対物レンズを 10 倍から 40 倍にかえると、視野の明るさはどうなる？',
          options: ['暗くなる', '明るくなる', '変わらない'],
          answer: 'a',
          explanation: '倍率を高くすると、視野はせまく、暗くなります。暗いときは、しぼりや反射鏡で明るさを調節します。',
          hint: '高倍率にすると、入る光が少なくなるよ。',
        }),
        choice({
          id: 'bas-magnify-k3', concept: 'bas-magnify',
          prompt: '顕微鏡で、プレパラートを左へ動かしました。像はどちらへ動いて見える？',
          options: ['右', '左', '動かない'],
          answer: 'a',
          explanation: '顕微鏡の像は上下左右が逆なので、プレパラートを動かした向きと反対の右へ動いて見えます。',
          hint: '動かした向きの反対だよ。',
        }),
      ],
    },
    {
      id: 'bas-microbe', title: '水中の小さな生物', basic: 'bas-magnify', lessonStageId: 'bas-3',
      checkPool: [
        figureChoice({
          id: 'bas-microbe-k1', concept: 'bas-microbe',
          prompt: '図は池の水で見つけた生物の写真です。細かい毛を動かして泳ぐ、ぞうりのような形の「ゾウリムシ」はどれ？ ア〜エから選ぼう。',
          figure: microbesScene(false),
          answer: 'r2',
          explanation: 'イがゾウリムシです。体のまわりの細かい毛を動かして泳ぎます。',
          hint: 'まわりに細かい毛がある、細長いだ円の形だよ。',
        }),
        choice({
          id: 'bas-microbe-k2', concept: 'bas-microbe',
          prompt: '池の水で見られるアメーバのとくちょうはどれ？',
          options: ['形を変えながら、はうように動く', '緑色で三日月の形をしている', '触角を動かして、はねるように泳ぐ'],
          answer: 'a',
          explanation: 'アメーバは決まった形がなく、体の形を変えながら動きます。三日月の形はミカヅキモ、触角で泳ぐのはミジンコです。',
          hint: '決まった形がない生物だよ。',
        }),
        choice({
          id: 'bas-microbe-k3', concept: 'bas-microbe',
          prompt: 'ボルボックスの説明として正しいのはどれ？',
          options: ['緑色の小さな粒がたくさん集まった、球の形をしている', '細長い三日月の形をしている', 'つりがねの形で、柄でものにくっついている'],
          answer: 'a',
          explanation: 'ボルボックスは、緑色の小さな粒がたくさん集まって球の形になっていて、回りながら泳ぎます。つりがねの形はツリガネムシです。',
          hint: '丸い形の緑色の生物だよ。',
        }),
      ],
    },
    {
      id: 'bas-burner', title: 'ガスバーナーの使い方', basic: null, lessonStageId: 'bas-4',
      checkPool: [
        choice({
          id: 'bas-burner-k1', concept: 'bas-burner',
          prompt: 'オレンジ色の炎を青い炎にするには、どうする？',
          options: ['空気調節ねじを開く', 'ガス調節ねじを閉じる', 'ガスの元栓を閉じる'],
          answer: 'a',
          explanation: 'オレンジ色の炎は空気が足りません。ガス調節ねじをおさえたまま、空気調節ねじを開いて空気を入れると、青い炎になります。',
          hint: '足りないのは空気だったね。',
        }),
        choice({
          id: 'bas-burner-k2', concept: 'bas-burner',
          prompt: '火をつけるとき、ガス調節ねじを開くのはいつ？',
          options: ['マッチの火をバーナーの口に近づけてから', 'マッチに火をつける前', 'ガスの元栓を開く前'],
          answer: 'a',
          explanation: '先にガスを出してしまうと、ガスがたまって危険です。マッチの火を近づけてから、ガス調節ねじを開いて火をつけます。',
          hint: 'ガスを出しっぱなしにしない順を考えよう。',
        }),
        choice({
          id: 'bas-burner-k3', concept: 'bas-burner',
          prompt: '火を消すとき、最後に閉じるのはどれ？',
          options: ['ガスの元栓', '空気調節ねじ', 'ガス調節ねじ'],
          answer: 'a',
          explanation: '空気調節ねじ、ガス調節ねじの順に閉めて火を消し、最後にガスの元栓を閉じます。',
          hint: 'つけるとき最初に開いたのは何だったかな。',
        }),
      ],
    },
    {
      id: 'bas-review', title: '小学校の復習（器具・ものの燃え方）', basic: null, lessonStageId: 'bas-4',
      checkPool: [
        figureChoice({
          id: 'bas-review-k1', concept: 'bas-review',
          prompt: '小学校で使った器具です。液体の体積をはかる「メスシリンダー」はどれ？ ア〜エから選ぼう。',
          figure: toolsScene('小学校で使った器具'),
          answer: 'r3',
          explanation: 'ウがメスシリンダーです。細長い筒に目盛りがついていて、液体の体積をはかります。',
          hint: '目盛りがついた細長い筒だよ。',
        }),
        figureChoice({
          id: 'bas-review-k2', concept: 'bas-review',
          prompt: '小学校で使った器具です。「試験管」はどれ？ ア〜エから選ぼう。',
          figure: toolsScene('小学校で使った器具'),
          answer: 'r2',
          explanation: 'イが試験管です。底が丸い細い管で、少しの液体を加熱したり混ぜたりするときに使います。',
          hint: '底が丸い、細い管だよ。',
        }),
        choice({
          id: 'bas-review-k3', concept: 'bas-review',
          prompt: 'ろうそくを燃やしたあとの集気びんに石灰水を入れてよくふると、どうなる？',
          options: ['白くにごる', '青色になる', '変化しない'],
          answer: 'a',
          explanation: 'ろうそくが燃えると二酸化炭素ができます。二酸化炭素は石灰水を白くにごらせます。',
          hint: '燃えたあとに増えた気体は何だったかな。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'basics',
    title: '観察と実験の基本',
    mascot: 'A',   // 担当の先生（js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'bas-observe', title: '観察の道具', order: 1, stages: [bas1, bas2, bas3] },
      { id: 'bas-experiment', title: '実験の基本', order: 2, stages: [bas4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
