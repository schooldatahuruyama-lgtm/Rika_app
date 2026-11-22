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

  // 図の中の部品を動かす（クイズのステージで使う。content/light.js と同じ）
  function drag(p) { return Object.assign({ type: 'drag' }, p); }

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
  // 領域 3: ドリル（中学理科の知識から自作した練習問題。docs/reports/content/basics.md）
  // ================================================================

  // 観察カード（記録の書き方の例）。regions: ア 日付・天気・場所、イ スケッチ、ウ 結果、エ 考察 の選ぶ場所を付ける
  function recordCard(regions) {
    const items = [
      { type: 'rect', x: 16, y: 14, width: 288, height: 212, fill: 'white' },
      { type: 'text', x: 30, y: 40, text: '5月10日　晴れ　校庭の日なた', size: 13 },
      { type: 'line', points: [[24, 52], [296, 52]], color: 'gray', width: 1 },
      { type: 'ellipse', x: 70, y: 100, rx: 34, ry: 24, fill: 'none' },
      { type: 'circle', x: 70, y: 100, r: 7, fill: 'none' },
      { type: 'text', x: 120, y: 92, text: '【結果】花びらは黄色', size: 13 },
      { type: 'text', x: 120, y: 112, text: 'で細長く、数が多い', size: 13 },
      { type: 'line', points: [[24, 146], [296, 146]], color: 'gray', width: 1 },
      { type: 'text', x: 30, y: 172, text: '【考察】日なたに多いのは、', size: 13 },
      { type: 'text', x: 30, y: 194, text: '日光がよく当たるからだろう', size: 13 },
    ];
    if (regions) {
      [[278, 34], [36, 132], [278, 100], [278, 184]].forEach(([x, y], i) => {
        items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: KANA[i] });
      });
    }
    return scene(items);
  }

  // レンズを横から見たようす。kind は 'objective'（対物レンズ。上から下へのびる）| 'eyepiece'（接眼レンズ。下から上へのびる）
  // heights は左から ア・イ・ウ のレンズの長さ
  function lensesScene(kind, heights) {
    const title = kind === 'objective' ? '対物レンズ（横から見たようす）' : '接眼レンズ（横から見たようす）';
    const items = [{ type: 'text', x: 160, y: 26, text: title, size: 14, anchor: 'middle' }];
    heights.forEach((h, i) => {
      const cx = 70 + 90 * i;
      if (kind === 'objective') {
        items.push({ type: 'rect', x: cx - 20, y: 46, width: 40, height: 12, fill: 'gray' });
        items.push({ type: 'rect', x: cx - 14, y: 58, width: 28, height: h, fill: 'white' });
        items.push({ type: 'rect', x: cx - 8, y: 58 + h, width: 16, height: 8, fill: 'glass' });
      } else {
        items.push({ type: 'rect', x: cx - 16, y: 170 - h, width: 32, height: h, fill: 'white' });
        items.push({ type: 'ellipse', x: cx, y: 170 - h, rx: 16, ry: 5, fill: 'glass' });
        items.push({ type: 'rect', x: cx - 20, y: 170, width: 40, height: 10, fill: 'gray' });
      }
      items.push({ type: 'region', id: 'r' + (i + 1), x: cx, y: 210, r: 22, label: KANA[i] });
    });
    return scene(items);
  }

  // ---- ステージ basics-dr1: ドリル 1（生物の観察と分類: 記録の書き方、顕微鏡のあつかい、分類の観点） ----
  const basDr1 = {
    id: 'basics-dr1', areaId: 'bas-observe', free: true, title: 'ドリル 1: 生物の観察と分類', minutes: 6,
    concepts: ['bas-loupe', 'bas-scope', 'bas-microbe'],
    lessons: [
      {
        id: 'basics-dr1-c1',
        text: '観察の記録には、**日付**・天気・場所と、見たものの特徴を書きます。見て分かった事実（**結果**）と、結果から考えたこと（**考察**）は、分けて書きます。',
        // 観察カードの例（日付・天気・場所、スケッチ、結果、考察）
        figure: recordCard(false),
      },
      {
        id: 'basics-dr1-c2',
        text: '顕微鏡は**アーム**をにぎり、鏡台を支えて運び、直射日光の当たらない明るい所に置きます。レンズは接眼レンズを先につけます。接眼レンズは短いほど、対物レンズは長いほど倍率が高くなります。',
        // 写真（bas-2-c1 の画像）: 顕微鏡。接眼レンズ (142, 22)、対物レンズ (115, 116)
        figure: scene([
          photo('bas-2-c1'),
          pointer(84, 30, 142, 22), tag(48, 34, '接眼レンズ'),
          pointer(76, 120, 115, 116), tag(42, 124, '対物レンズ'),
        ]),
      },
      {
        id: 'basics-dr1-c3',
        text: '生物をなかま分けするときは、「体が緑色か」のような**観点**を先に決め、その観点で分けます。同じ生物でも、観点を変えると分け方が変わることがあります。',
        // 「体が緑色か」で分けた例
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '観点「体が緑色か」で分ける', size: 14, anchor: 'middle' },
          { type: 'rect', x: 20, y: 50, width: 130, height: 150, fill: 'lightgreen', rx: 8 },
          { type: 'rect', x: 170, y: 50, width: 130, height: 150, fill: 'white', rx: 8 },
          { type: 'text', x: 85, y: 76, text: '緑色', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 235, y: 76, text: '緑色でない', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 85, y: 120, text: 'ミカヅキモ', size: 13, anchor: 'middle' },
          { type: 'text', x: 85, y: 156, text: 'ボルボックス', size: 13, anchor: 'middle' },
          { type: 'text', x: 235, y: 120, text: 'ゾウリムシ', size: 13, anchor: 'middle' },
          { type: 'text', x: 235, y: 156, text: 'ミジンコ', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'basics-dr1-w1', concept: 'bas-loupe',
      prompt: '予想しよう。観察の記録に「花びらが 5 枚あった」と書きました。これは結果と考察のどちらに書くことだと思う？',
      options: ['考察', '結果', 'どちらにも書かない'],
      answer: 'b',
      explanation: '「花びらが 5 枚あった」は、見て分かった事実なので結果です。結果と考察を分けて書く方法を、このステージで学ぼう。',
      hint: '見たことそのものか、そこから考えたことかを区別しよう。',
    }),
    problems: [
      choice({
        id: 'basics-dr1-p1', concept: 'bas-loupe',
        prompt: '日なたと日かげでタンポポの数を調べました。観察の記録の「考察」に書くのに合うものはどれ？',
        options: ['日なたのほうがタンポポが多かった', '5月10日、晴れ', '日当たりが、数に関係していそうだ'],
        answer: 'c',
        explanation: '考察には、結果をもとに考えたことを書きます。「日なたのほうが多かった」は見て分かった事実なので結果、「日付・天気」は記録のはじめに書くことです。',
        hint: '見たことではなく、そこから考えたことを選ぼう。',
      }),
      fill({
        id: 'basics-dr1-t1', concept: 'bas-scope', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '顕微鏡にレンズをつけるときは、鏡筒にほこりが入らないように、先に[b1]をつける。',
        blanks: [word('b1', ['接眼レンズ', '対物レンズ', '反射鏡'], '接眼レンズ')],
        explanation: '先に上の**接眼レンズ**をつけて鏡筒にふたをしてから、対物レンズをつけます。こうすると、鏡筒の中にほこりが落ちにくくなります。',
        hint: '鏡筒の上の口を、先にふさぐと考えよう。',
      }),
      figureChoice({
        id: 'basics-dr1-p2', concept: 'bas-scope',
        prompt: '図は 3 本の対物レンズを横から見たようすです（ア 短い、イ 長い、ウ 中くらい）。倍率がいちばん高いのはどれ？ ア〜ウから選ぼう。',
        // 対物レンズは長いほど倍率が高い → 長いイ
        figure: lensesScene('objective', [36, 84, 60]),
        answer: 'r2',
        explanation: '対物レンズは、長いものほど倍率が高くなります。高倍率の対物レンズは、ピントが合ったときプレパラートとの間がとても近くなります。',
        hint: '対物レンズは「長いほど」倍率が高いよ。',
      }),
      fill({
        id: 'basics-dr1-p3', concept: 'bas-scope',
        prompt: '空らんに入る数を入れよう。顕微鏡の倍率は、接眼レンズの倍率 × 対物レンズの倍率。',
        text: '接眼レンズが 15 倍のとき、顕微鏡の倍率を 300 倍にするには、対物レンズを[b1]にする。',
        blanks: [number('b1', 20, 0, '倍')],
        explanation: '300 ÷ 15 ＝ 20 なので、20 倍の対物レンズを使います。倍率を上げるときは、低倍率でピントを合わせてから、レボルバーを回して対物レンズをかえます。',
        hint: '顕微鏡の倍率を、接眼レンズの倍率でわってみよう。',
      }),
      figureChoice({
        id: 'basics-dr1-p4', concept: 'bas-loupe',
        prompt: '図は観察カードです。ア 日付・天気・場所、イ スケッチ、ウ 結果、エ 考察。「なぜそうなったのか」を考えて書く欄はどれ？ ア〜エから選ぼう。',
        figure: recordCard(true),
        answer: 'r4',
        explanation: '結果をもとに「なぜそうなったか」を考えて書くのが考察です。カードの下の欄の「日光がよく当たるからだろう」は、考えたことなので考察です。',
        hint: '「〜だろう」と考えたことが書かれている欄をさがそう。',
      }),
      choice({
        id: 'basics-dr1-p5', concept: 'bas-microbe',
        prompt: 'ミカヅキモとボルボックス、ゾウリムシとミジンコの 2 つのなかまに分けました。どんな観点で分けた？',
        options: ['体が緑色をしているかどうか', '水中にすんでいるかどうか', '名前がカタカナかどうか'],
        answer: 'a',
        explanation: 'ミカヅキモとボルボックスは緑色、ゾウリムシとミジンコは緑色ではありません。4 つとも水中にすむので、「水中にすむか」では分けられません。',
        hint: '4 つの生物の、色のちがいを思い出そう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'basics-dr1-r1', concept: 'bas-loupe',
        prompt: '観察の記録の「結果」に書くのに合うものはどれ？',
        options: ['結果から考えたこと', '見て分かった事実', '次に調べてみたいこと'],
        answer: 'b',
        explanation: '結果には、見たり調べたりして分かった事実をそのまま書きます。考えたことは考察に分けて書きます。',
        hint: '考えたことと、見たことを分けよう。',
      }),
      figureChoice({
        id: 'basics-dr1-r2', concept: 'bas-loupe',
        prompt: '図は観察カードです。ア 日付・天気・場所、イ スケッチ、ウ 結果、エ 考察。観察したものの形を、細い線でかく欄はどれ？ ア〜エから選ぼう。',
        figure: recordCard(true),
        answer: 'r2',
        explanation: '形はスケッチの欄に、よくけずった鉛筆の細い線でかきます。色などは、結果の欄に言葉で書きそえます。',
        hint: '絵がかかれている欄だよ。',
      }),
      figureChoice({
        id: 'basics-dr1-r3', concept: 'bas-scope',
        prompt: '図は 3 本の接眼レンズを横から見たようすです（ア 中くらい、イ 長い、ウ 短い）。倍率がいちばん高いのはどれ？ ア〜ウから選ぼう。',
        // 接眼レンズは短いほど倍率が高い → 短いウ
        figure: lensesScene('eyepiece', [60, 84, 36]),
        answer: 'r3',
        explanation: '接眼レンズは、短いものほど倍率が高くなります。対物レンズ（長いほど高倍率）と反対なので、気をつけよう。',
        hint: '接眼レンズは「短いほど」倍率が高いよ。',
      }),
      fill({
        id: 'basics-dr1-t2', concept: 'bas-scope', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '顕微鏡を運ぶときは、[b1]を片手でにぎり、もう片方の手で鏡台を支える。',
        blanks: [word('b1', ['レボルバー', 'しぼり', 'アーム'], 'アーム')],
        explanation: '顕微鏡は**アーム**を片手でにぎり、もう片方の手で鏡台（いちばん下の台）を支えて運びます。',
        hint: '「うで」という意味の言葉だよ。',
      }),
      choice({
        id: 'basics-dr1-r4', concept: 'bas-microbe',
        prompt: '集めた生物をなかま分けするとき、はじめにすることはどれ？',
        options: ['どんな観点で分けるかを決める', '生物の数を数える', '名前の五十音順に並べる'],
        answer: 'a',
        explanation: 'なかま分けでは、まず「体が緑色か」「あしがあるか」のような観点を決めます。観点が決まると、だれが分けても同じ結果になります。',
        hint: '何に注目して分けるかを、先に決めよう。',
      }),
      choice({
        id: 'basics-dr1-r5', concept: 'bas-microbe',
        prompt: '同じ 4 つの生物を、ちがう観点でなかま分けしました。分け方はどうなる？',
        options: ['いつも同じ分け方になる', '分け方が変わることがある', 'なかま分けができなくなる'],
        answer: 'b',
        explanation: '観点を変えると、同じ生物でもちがうなかまに入ることがあります。だから、どの観点で分けたかを記録しておくことが大切です。',
        hint: '「色」で分けるときと「大きさ」で分けるときを比べてみよう。',
      }),
    ],
  };

  // ================================================================
  // クイズ（Kahoot の公開クイズの「ねらい」を参考に自作した問題。docs/reports/content/basics.md）
  // ================================================================

  // 学校の地図（上が北）。mode は 'lesson'（文字だけ）| 'choice'（ア〜エの選ぶ場所）| 'drag'（「オオバコ」のカードを動かす）
  // 北側の日かげ (x 70〜250, y 30〜62)、校舎 (y 62〜106)、日なたの通り道 (y 106〜130)、運動場 (左下)、池 (右下)
  function schoolMap(mode) {
    const items = [
      { type: 'text', x: 12, y: 22, text: '学校の地図（上が北）', size: 13 },
      { type: 'arrow', x1: 300, y1: 64, x2: 300, y2: 30, width: 2 },
      { type: 'text', x: 300, y: 82, text: '北', size: 13, anchor: 'middle' },
      { type: 'rect', x: 70, y: 30, width: 180, height: 32, fill: '#d5dae2', stroke: 'none' },
      { type: 'text', x: 76, y: 51, text: '日かげ・しめった土', size: 12 },
      { type: 'rect', x: 70, y: 62, width: 180, height: 44, fill: 'glass', label: '校舎' },
      { type: 'rect', x: 70, y: 106, width: 180, height: 24, fill: 'sand', stroke: 'none' },
      { type: 'text', x: 76, y: 123, text: '日なたの通り道', size: 12 },
      { type: 'rect', x: 20, y: 140, width: 170, height: 90, fill: '#efe6cf', stroke: 'line' },
      { type: 'text', x: 28, y: 160, text: '運動場', size: 12 },
      { type: 'ellipse', x: 255, y: 185, rx: 48, ry: 32, fill: 'water' },
      { type: 'text', x: 236, y: 172, text: '池', size: 12 },
    ];
    if (mode === 'choice') {
      // ア 通り道、イ 北側の日かげ、ウ 池、エ 運動場の真ん中
      [[220, 118], [220, 46], [262, 198], [105, 192]].forEach(([x, y], i) => {
        items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: KANA[i] });
      });
    }
    if (mode === 'drag') {
      // カードの中心 (105, 190)。正しい置き場所は通り道（中心 (160, 118)。rect の答えは左上なので target は (125, 106)）
      items.push({ type: 'rect', id: 'card', x: 70, y: 178, width: 70, height: 24, fill: 'lightgreen', rx: 4, label: 'オオバコ' });
    }
    return scene(items);
  }

  // 双眼実体顕微鏡の視野（中心 (160, 120)、半径 80）。mode は 'lesson' | 'drag'（虫の像を左右の目印へ動かす）| 'choice'（ア 上・イ 下・ウ 左・エ 右）
  function stereoView(mode) {
    const items = [
      { type: 'circle', x: 160, y: 120, r: 80, fill: 'white' },
    ];
    if (mode === 'lesson') {
      items.push({ type: 'ellipse', x: 190, y: 120, rx: 14, ry: 7, fill: 'brown' });
      items.push({ type: 'ellipse', x: 130, y: 120, rx: 14, ry: 7, fill: 'none', stroke: 'gray' });
      items.push({ type: 'arrow', x1: 146, y1: 104, x2: 176, y2: 104, color: 'blue', width: 2 });
      items.push({ type: 'text', x: 160, y: 228, text: '実物を右へ動かすと、像も右へ', size: 14, anchor: 'middle' });
    }
    if (mode === 'drag') {
      items.push({ type: 'circle', x: 100, y: 120, r: 12, fill: 'none', stroke: 'gray' });
      items.push({ type: 'circle', x: 220, y: 120, r: 12, fill: 'none', stroke: 'gray' });
      items.push({ type: 'text', x: 100, y: 96, text: '目印', size: 12, anchor: 'middle' });
      items.push({ type: 'text', x: 220, y: 96, text: '目印', size: 12, anchor: 'middle' });
      items.push({ type: 'text', x: 160, y: 228, text: 'ステージの上の虫を、右へ動かした', size: 14, anchor: 'middle' });
      items.push({ type: 'ellipse', id: 'bug', x: 160, y: 120, rx: 14, ry: 7, fill: 'brown' });
    }
    if (mode === 'choice') {
      items.push({ type: 'ellipse', x: 160, y: 120, rx: 14, ry: 7, fill: 'brown' });
      [[160, 64], [160, 176], [104, 120], [216, 120]].forEach(([x, y], i) => {
        items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: KANA[i] });
      });
      items.push({ type: 'text', x: 160, y: 228, text: 'ステージの上の虫を、左へ動かした', size: 14, anchor: 'middle' });
    }
    return scene(items);
  }

  // 顕微鏡を横から見た図（自作の簡単な線画）。regions で目を置く場所 ア 接眼レンズの真上・イ ステージの真横・ウ ステージより下 を付ける
  function scopeSide(regions) {
    const items = [
      { type: 'rect', x: 80, y: 212, width: 130, height: 16, fill: 'gray' },
      { type: 'rect', x: 180, y: 70, width: 14, height: 142, fill: 'glass' },
      { type: 'line', points: [[136, 78], [180, 78]], width: 6, color: 'gray' },
      { type: 'rect', x: 114, y: 44, width: 18, height: 14, fill: 'gray' },
      { type: 'rect', x: 110, y: 58, width: 26, height: 62, fill: 'white' },
      { type: 'rect', x: 116, y: 120, width: 14, height: 22, fill: 'glass' },
      { type: 'rect', x: 70, y: 150, width: 124, height: 8, fill: 'gray' },
      { type: 'rect', x: 94, y: 146, width: 58, height: 4, fill: 'sky', stroke: 'none' },
      { type: 'ellipse', x: 123, y: 188, rx: 16, ry: 6, fill: 'glass' },
    ];
    if (regions) {
      [[123, 22], [44, 146], [44, 200]].forEach(([x, y], i) => {
        items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: KANA[i] });
      });
    } else {
      items.push({ type: 'eye', x: 40, y: 146 });
      items.push({ type: 'line', points: [[56, 146], [110, 146]], color: 'blue', width: 2, dashed: true });
      items.push({ type: 'text', x: 214, y: 140, text: '横から見る', size: 14 });
    }
    return scene(items);
  }

  // 同じプレパラートを 3 つの倍率で見た視野（左から ア・イ・ウ）。ア 40 倍（小さな細胞が多い・明るい）、
  // イ 400 倍（大きな細胞が 1 つ・暗い）、ウ 100 倍（中くらい）。regions で選ぶ場所を付ける
  function viewsScene(regions) {
    const items = [
      { type: 'circle', x: 58, y: 110, r: 46, fill: 'white' },
      { type: 'circle', x: 160, y: 110, r: 46, fill: '#c9ced8' },
      { type: 'circle', x: 262, y: 110, r: 46, fill: '#e6e9ee' },
    ];
    [-20, 0, 20].forEach(dx => [-20, 0, 20].forEach(dy => {
      items.push({ type: 'circle', x: 58 + dx, y: 110 + dy, r: 6, fill: 'lightgreen' });
    }));
    items.push({ type: 'circle', x: 160, y: 110, r: 30, fill: 'lightgreen' });
    [[-15, -15], [15, -15], [-15, 15], [15, 15]].forEach(([dx, dy]) => {
      items.push({ type: 'circle', x: 262 + dx, y: 110 + dy, r: 12, fill: 'lightgreen' });
    });
    if (regions) {
      [58, 160, 262].forEach((x, i) => items.push({ type: 'region', id: 'r' + (i + 1), x, y: 196, r: 22, label: KANA[i] }));
    } else {
      items.push({ type: 'text', x: 58, y: 186, text: '低い倍率', size: 13, anchor: 'middle' });
      items.push({ type: 'text', x: 160, y: 186, text: '高い倍率', size: 13, anchor: 'middle' });
      items.push({ type: 'text', x: 160, y: 210, text: '広く明るい → せまく暗い', size: 13, anchor: 'middle' });
    }
    return scene(items);
  }

  // 観点「自分で動き回るか」の 2 つの箱。drag のとき「ボルボックス」のカード（中心 (160, 212)）を置く
  function moveBoxes(dragCard) {
    const items = [
      { type: 'text', x: 160, y: 24, text: '観点: 自分で動き回るか', size: 14, anchor: 'middle', bold: true },
      { type: 'rect', x: 20, y: 40, width: 130, height: 140, fill: 'white', rx: 8 },
      { type: 'rect', x: 170, y: 40, width: 130, height: 140, fill: 'white', rx: 8 },
      { type: 'text', x: 85, y: 62, text: '動き回る', size: 14, anchor: 'middle' },
      { type: 'text', x: 235, y: 62, text: '動き回らない', size: 14, anchor: 'middle' },
    ];
    if (dragCard) {
      items.push({ type: 'text', x: 85, y: 160, text: 'ゾウリムシ', size: 12, anchor: 'middle' });
      items.push({ type: 'text', x: 235, y: 160, text: 'タンポポ', size: 12, anchor: 'middle' });
      items.push({ type: 'rect', id: 'card', x: 115, y: 200, width: 90, height: 24, fill: 'lightgreen', rx: 4, label: 'ボルボックス' });
    } else {
      items.push({ type: 'text', x: 85, y: 110, text: 'ゾウリムシ', size: 13, anchor: 'middle' });
      items.push({ type: 'text', x: 85, y: 140, text: 'ミジンコ', size: 13, anchor: 'middle' });
      items.push({ type: 'text', x: 235, y: 110, text: 'タンポポ', size: 13, anchor: 'middle' });
      items.push({ type: 'text', x: 235, y: 140, text: 'サクラ', size: 13, anchor: 'middle' });
      items.push({ type: 'text', x: 160, y: 212, text: '基準を決めて分ける', size: 14, anchor: 'middle' });
    }
    return scene(items);
  }

  // 温度計（目盛り 20〜30 ℃、1 ℃ ごと。y = 190 − (温度 − 20) × 15）。value は赤い液の先の温度、eye は目の部品の有無
  const thermoY = (v) => 190 - (v - 20) * 15;
  function thermoScene(value, eye) {
    const top = thermoY(value);
    const items = [
      { type: 'rect', x: 154, y: 28, width: 12, height: 180, fill: 'white' },
      { type: 'circle', x: 160, y: 212, r: 9, fill: 'red' },
      { type: 'rect', x: 157, y: top, width: 6, height: 206 - top, fill: 'red', stroke: 'none' },
    ];
    for (let v = 20; v <= 30; v++) {
      const y = thermoY(v);
      items.push({ type: 'line', points: [[166, y], [v % 5 === 0 ? 182 : 174, y]], width: 1 });
      if (v % 5 === 0) items.push({ type: 'text', x: 188, y: y + 5, text: String(v), size: 13 });
    }
    items.push({ type: 'text', x: 214, y: 40, text: '℃', size: 14 });
    if (eye) {
      items.push({ type: 'line', points: [[70, 30], [70, 226]], color: 'gray', width: 1, dashed: true });
      items.push({ type: 'eye', id: 'eye', x: 70, y: 214 });
    }
    return scene(items);
  }

  // ガスバーナー（自作の線画）。regions で ア 上のねじ・イ 下のねじ・ウ 元栓 の選ぶ場所を付ける
  function burnerScene(regions) {
    const items = [
      { type: 'rect', x: 110, y: 206, width: 100, height: 14, fill: 'gray' },
      { type: 'rect', x: 150, y: 78, width: 20, height: 128, fill: 'glass' },
      { type: 'rect', x: 142, y: 140, width: 36, height: 10, fill: 'gray' },
      { type: 'rect', x: 140, y: 168, width: 40, height: 12, fill: 'gray' },
      { type: 'line', points: [[210, 196], [262, 196]], width: 6, color: 'gray' },
      { type: 'circle', x: 275, y: 196, r: 10, fill: 'gray' },
      { type: 'flame', x: 160, y: 78 },
    ];
    if (regions) {
      items.push({ type: 'line', points: [[118, 140], [142, 145]], width: 2 });
      items.push({ type: 'line', points: [[202, 178], [180, 174]], width: 2 });
      [[98, 136], [222, 180], [275, 140]].forEach(([x, y], i) => {
        items.push({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: KANA[i] });
      });
      items.push({ type: 'line', points: [[275, 162], [275, 186]], width: 2 });
    } else {
      items.push({ type: 'text', x: 40, y: 150, text: '空気調節ねじ', size: 13 });
      items.push({ type: 'text', x: 190, y: 172, text: 'ガス調節ねじ', size: 13 });
      items.push({ type: 'text', x: 254, y: 228, text: '元栓', size: 13 });
    }
    return scene(items);
  }

  // 電子てんびんと薬包紙（表示 0.0 g）
  function balanceScene() {
    return scene([
      { type: 'rect', x: 70, y: 150, width: 180, height: 50, fill: 'glass', rx: 6 },
      { type: 'rect', x: 170, y: 164, width: 64, height: 24, fill: 'white' },
      { type: 'text', x: 228, y: 182, text: '0.0 g', size: 14, anchor: 'end' },
      { type: 'rect', x: 90, y: 136, width: 70, height: 10, fill: 'gray' },
      { type: 'polygon', points: [[125, 112], [165, 132], [125, 146], [85, 132]], fill: 'white' },
      { type: 'text', x: 125, y: 100, text: '薬包紙', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 228, text: '紙をのせてから表示を 0 にする', size: 14, anchor: 'middle' },
    ]);
  }

  // ビーカーの湯と、温度計の液だめを置く場所（ア 液の中ほど・イ 液面より上・ウ 底にふれる所）
  function beakerThermoScene() {
    return scene([
      { type: 'beaker', x: 160, y: 214, width: 170, height: 124, level: 0.6 },
      { type: 'region', id: 'r1', x: 130, y: 172, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 160, y: 112, r: 22, label: 'イ' },
      { type: 'region', id: 'r3', x: 202, y: 206, r: 22, label: 'ウ' },
    ]);
  }

  // ---- ステージ basics-kq1: クイズ 1（野外観察とスケッチ。生物の見られる場所、双眼鏡、記録の書き方） ----
  const basKq1 = {
    id: 'basics-kq1', areaId: 'bas-observe', free: true, title: 'クイズ 1: 野外観察とスケッチ', minutes: 6,
    concepts: ['bas-loupe'],
    lessons: [
      {
        id: 'basics-kq1-c1',
        text: '場所によって、**日当たり**や土のしめりけがちがい、見られる植物もちがいます。校舎の北側のような**日かげ**のしめった所にはドクダミやゼニゴケ、よくふまれる日なたの通り道にはオオバコやタンポポが多く見られます。',
        // 学校の地図（日かげ・校舎・通り道・運動場・池）
        figure: schoolMap('lesson'),
      },
      {
        id: 'basics-kq1-c2',
        text: '近づくとにげてしまう野鳥などは、**双眼鏡**で遠くから観察します。野外では、生物にむやみにさわったり、とったりしないようにします。調べるためにとった生物は、観察が終わったら元の場所にもどします。',
        // 双眼鏡（筒 2 本）と遠くの鳥
        figure: scene([
          { type: 'rect', x: 40, y: 110, width: 36, height: 70, fill: 'gray', rx: 6 },
          { type: 'rect', x: 84, y: 110, width: 36, height: 70, fill: 'gray', rx: 6 },
          { type: 'rect', x: 76, y: 130, width: 8, height: 24, fill: 'ink' },
          { type: 'text', x: 80, y: 206, text: '双眼鏡', size: 14, anchor: 'middle' },
          { type: 'line', points: [[130, 120], [262, 70]], color: 'gray', width: 2, dashed: true },
          { type: 'ellipse', x: 272, y: 66, rx: 16, ry: 9, fill: 'brown' },
          { type: 'circle', x: 286, y: 58, r: 6, fill: 'brown' },
          { type: 'line', points: [[268, 74], [268, 96]], color: 'brown', width: 2 },
          { type: 'text', x: 272, y: 122, text: '遠くの野鳥', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'basics-kq1-c3',
        text: '**スケッチ**は、観察するものだけを細い線と小さな点ではっきりかき、背景やルーペの丸いふちはかきません。日付・天気・場所も書いておくと、あとで同じ条件で調べ直したり、比べたりできます。',
        // スケッチの例（観察するものだけ）
        figure: scene([
          { type: 'rect', x: 30, y: 20, width: 260, height: 200, fill: 'white' },
          { type: 'text', x: 44, y: 44, text: '6月3日　くもり　校舎の北側', size: 13 },
          { type: 'ellipse', x: 110, y: 130, rx: 40, ry: 26, fill: 'none' },
          { type: 'line', points: [[110, 104], [110, 156]], width: 1 },
          { type: 'line', points: [[110, 156], [110, 196]], width: 2 },
          { type: 'text', x: 170, y: 120, text: 'ハート形の葉', size: 13 },
          { type: 'text', x: 170, y: 142, text: '強いにおいがする', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'basics-kq1-w1', concept: 'bas-loupe',
      prompt: '予想しよう。校舎の北側の日かげと、南側の日なたでは、見られる植物は同じだと思う？',
      options: ['同じ植物が見られる', 'ちがう植物が多く見られる', 'どちらにも植物は生えない'],
      answer: 'b',
      explanation: '日当たりや土のしめりけがちがうと、育ちやすい植物もちがいます。場所と植物の関係を、このステージで調べよう。',
      hint: '日かげと日なたで、土のようすがどうちがうか考えよう。',
    }),
    problems: [
      figureChoice({
        id: 'basics-kq1-p1', concept: 'bas-loupe',
        prompt: 'ドクダミやゼニゴケは、日かげのしめった所に多い植物です。多く見られそうなのはどこ？ ア 通り道、イ 校舎の北側、ウ 池、エ 運動場の真ん中',
        figure: schoolMap('choice'),
        answer: 'r2',
        explanation: '校舎の北側は一日じゅう日光が当たりにくく、土がしめっています。ドクダミやゼニゴケは、このような日かげのしめった所によく見られます。',
        hint: '地図の上が北だよ。日光が当たりにくい所をさがそう。',
      }),
      fill({
        id: 'basics-kq1-t1', concept: 'bas-loupe', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '近づくとにげてしまう野鳥を、はなれた所から大きくして見るには、[b1]を使う。',
        blanks: [word('b1', ['ルーペ', '双眼鏡', '双眼実体顕微鏡'], '双眼鏡')],
        explanation: '**双眼鏡**は、遠くのものを大きくして見る道具です。ルーペや双眼実体顕微鏡は、近くにある小さなものを観察するときに使います。',
        hint: '遠くを見るための道具はどれかな。',
      }),
      drag({
        id: 'basics-kq1-p2', concept: 'bas-loupe',
        prompt: 'オオバコは、背が低く、人によくふまれる日なたに多い植物です。「オオバコ」のカードを、地図の上の多く見られそうな場所へ動かして置こう。',
        figure: schoolMap('drag'),
        draggable: { itemId: 'card' },
        target: { x: 125, y: 106 },   // rect の答えは左上。カード 70×24 の中心が通り道 (160, 118) に来る位置
        samples: { correct: { x: 125, y: 106 }, wrong: { x: 125, y: 34 } },
        explanation: 'オオバコは、日当たりがよく、人がよく歩いて土がかたい通り道に多く見られます。北側の日かげのしめった所には、あまり見られません。',
        hint: '日がよく当たり、人がよく歩く所はどこかな。',
      }),
      choice({
        id: 'basics-kq1-p3', concept: 'bas-loupe',
        prompt: '人がよく歩く通り道に、オオバコが多く見られるのはなぜだと考えられる？',
        options: ['背が低く、ふまれてもちぎれにくいから', '日かげでしか育たないから', '水の中でしか育たないから'],
        answer: 'a',
        explanation: 'オオバコは葉が地面に広がっていて、ふまれてもちぎれにくい体のつくりです。ふまれる所では背の高い植物が育ちにくいので、オオバコが多くなります。',
        hint: 'ふまれる場所で生きるのに、どんな体が都合がよいか考えよう。',
      }),
      fill({
        id: 'basics-kq1-p4', concept: 'bas-loupe',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'スケッチでは、観察するものだけをかき、まわりの[b1]はかかない。',
        blanks: [word('b1', ['背景', '輪郭', '特徴'], '背景')],
        explanation: 'スケッチでは、観察するものだけをかき、まわりの草や地面などの背景はかきません。見てほしいところがはっきり伝わります。',
        hint: '観察するもの以外の、まわりのようすのことだよ。',
      }),
      choice({
        id: 'basics-kq1-p5', concept: 'bas-loupe',
        prompt: '観察カードに、天気や観察した場所を書いておくのはなぜ？',
        options: ['あとで同じ条件で調べ直したり比べたりするため', 'カードの空いた所をうめるため', '絵が上手に見えるようにするため'],
        answer: 'a',
        explanation: '天気や場所によって、見られる生物や結果が変わることがあります。条件を書いておくと、あとで同じ条件で調べ直したり、ほかの記録と比べたりできます。',
        hint: '天気や場所が変わると、結果はどうなりそうかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'basics-kq1-r1', concept: 'bas-loupe',
        prompt: '水の中で育つオオカナダモが見られそうなのはどこ？ ア 通り道、イ 校舎の北側、ウ 池、エ 運動場の真ん中',
        figure: schoolMap('choice'),
        answer: 'r3',
        explanation: 'オオカナダモは、池などの水の中で育つ植物です。同じ学校の中でも、水の中・日かげ・日なたで、見られる生物がちがいます。',
        hint: '水のある場所はどこかな。',
      }),
      fill({
        id: 'basics-kq1-r2', concept: 'bas-loupe',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '校舎の北側のような日かげのしめった所には、ドクダミや[b1]がよく見られる。',
        blanks: [word('b1', ['ゼニゴケ', 'オオバコ', 'タンポポ'], 'ゼニゴケ')],
        explanation: 'ゼニゴケは、日かげのしめった所に多い植物です。オオバコやタンポポは、日当たりのよい所に多く見られます。',
        hint: 'しめった所を好む植物を選ぼう。',
      }),
      choice({
        id: 'basics-kq1-r3', concept: 'bas-loupe',
        prompt: '野外観察で、生物や自分の身を守るために大切なことはどれ？',
        options: ['むやみに生物にさわったり、とったりしない', '見つけた生物はすべて持ち帰る', '知らない植物は口に入れて確かめる'],
        answer: 'a',
        explanation: '毒をもつ植物や、かんだりさしたりする生き物もいます。むやみにさわらず、調べるためにとった生物は、観察が終わったら元の場所にもどします。',
        hint: '自分の安全と、生物の命の両方を考えよう。',
      }),
      choice({
        id: 'basics-kq1-r4', concept: 'bas-loupe',
        prompt: 'ルーペで見た花をスケッチします。ルーペで見えた丸いふち（視野のふち）はかく？',
        options: ['かかない。観察するものだけをかく', 'かく。ルーペで見たと分かるように', 'かげをつけて太くかく'],
        answer: 'a',
        explanation: 'ルーペで見えた丸いふちは、観察するものではないのでかきません。スケッチには、観察するものだけを細い線ではっきりかきます。',
        hint: 'スケッチには何だけをかくのだったかな。',
      }),
      choice({
        id: 'basics-kq1-r5', concept: 'bas-loupe', term: true,
        prompt: '次の説明に合う言葉はどれ？「建物などで日光がさえぎられ、土がしめりやすい場所」',
        options: ['日なた', '日かげ', '通り道'],
        answer: 'b',
        explanation: '日光がさえぎられる場所を**日かげ**といいます。日かげは土がかわきにくく、しめった所を好む植物が多く見られます。',
        hint: '日光が当たらない所の名前だよ。',
      }),
    ],
  };

  // ---- ステージ basics-kq2: クイズ 2（双眼実体顕微鏡と顕微鏡のあつかい。像の向き、倍率、近づけ方、かたづけ方） ----
  const basKq2 = {
    id: 'basics-kq2', areaId: 'bas-observe', free: true, title: 'クイズ 2: 顕微鏡のあつかい', minutes: 6,
    concepts: ['bas-stereo', 'bas-scope'],
    lessons: [
      {
        id: 'basics-kq2-c1',
        text: '**双眼実体顕微鏡**の倍率は、接眼レンズの倍率 × 対物レンズの倍率で、20〜40 倍ほどです。見える像は上下左右が逆にならないので、観察するものを動かした向きに、像も動きます。',
        figure: stereoView('lesson'),
      },
      {
        id: 'basics-kq2-c2',
        text: '顕微鏡で対物レンズの先をプレパラートに寄せていくときは、ぶつからないように横から見ながら調節ねじを回します。高い倍率で視野が暗いときは、**しぼり**や反射鏡で光の量をふやします。',
        figure: scopeSide(false),
      },
      {
        id: 'basics-kq2-c3',
        text: 'かたづけるときは、対物レンズを先に外し、接眼レンズを最後に外します。こうすると、**鏡筒**の上の口がふさがったままなので、中にほこりが入りません。',
        // レンズを外す順
        figure: scene([
          { type: 'text', x: 160, y: 40, text: 'レンズを外す順', size: 15, anchor: 'middle', bold: true },
          { type: 'rect', x: 30, y: 80, width: 110, height: 60, fill: 'white', rx: 8, label: '対物レンズ' },
          { type: 'arrow', x1: 146, y1: 110, x2: 174, y2: 110, width: 2 },
          { type: 'rect', x: 180, y: 80, width: 110, height: 60, fill: 'white', rx: 8, label: '接眼レンズ' },
          { type: 'text', x: 160, y: 190, text: '（つけるときは、この逆の順）', size: 14, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'basics-kq2-w1', concept: 'bas-scope',
      prompt: '予想しよう。直射日光が当たる窓ぎわで、反射鏡のある顕微鏡を使ってよいと思う？',
      options: ['よい。明るいほど見やすい', 'よくない。目をいためるおそれがある', 'どちらでもよい'],
      answer: 'b',
      explanation: '反射鏡で直射日光を集めると、強い光が目に入って目をいためるおそれがあります。顕微鏡は、直射日光の当たらない明るい所に置きます。',
      hint: 'ルーペで太陽を見てはいけない理由を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'basics-kq2-p1', concept: 'bas-scope',
        prompt: '対物レンズの先をプレパラートに寄せていくとき、目をどこに置いて見るとよい？ ア 接眼レンズの真上、イ ステージの真横、ウ ステージより下',
        figure: scopeSide(true),
        answer: 'r2',
        explanation: 'ステージの真横から見ると、対物レンズの先とプレパラートのすき間が見えます。すき間を見ながら近づければ、ぶつけてプレパラートを割ることがありません。',
        hint: '対物レンズの先とプレパラートのすき間が見える位置はどこかな。',
      }),
      fill({
        id: 'basics-kq2-t1', concept: 'bas-scope', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '高い倍率にして暗くなった視野を明るくするには、ステージの下の[b1]を調節して、通る光の量をふやす。',
        blanks: [word('b1', ['しぼり', 'レボルバー', '鏡筒'], 'しぼり')],
        explanation: '**しぼり**は、ステージの下で、通る光の量を調節する部分です。倍率を上げると視野が暗くなるので、しぼりや反射鏡で明るさを調節します。',
        hint: '光の量を調節する部分の名前だよ。',
      }),
      fill({
        id: 'basics-kq2-p2', concept: 'bas-stereo',
        prompt: '空らんに入る数を入れよう。倍率は、接眼レンズの倍率 × 対物レンズの倍率。',
        text: '接眼レンズが 10 倍、対物レンズが 4 倍の双眼実体顕微鏡の倍率は[b1]である。',
        blanks: [number('b1', 40, 0, '倍')],
        explanation: '10 × 4 ＝ 40 なので 40 倍です。双眼実体顕微鏡の倍率は 20〜40 倍ほどで、数百倍まで上げられる顕微鏡より低い倍率で、ものを立体的に見ます。',
        hint: '2 つの倍率をかけ算しよう。',
      }),
      drag({
        id: 'basics-kq2-p3', concept: 'bas-stereo',
        prompt: '双眼実体顕微鏡で、ステージの上の虫を右へ動かしました。視野の中の虫の像は、左右どちらの目印へ動いて見える？ 像をその目印まで動かそう。',
        figure: stereoView('drag'),
        draggable: { itemId: 'bug', axis: 'x' },
        target: { x: 220, y: 120 },
        samples: { correct: { x: 220, y: 120 }, wrong: { x: 100, y: 120 } },
        explanation: '双眼実体顕微鏡の像は、上下左右が逆になりません。だから、虫を右へ動かすと、像も右へ動いて見えます。',
        hint: '双眼実体顕微鏡の像は、逆さまになるかな。',
      }),
      choice({
        id: 'basics-kq2-p4', concept: 'bas-stereo',
        prompt: '双眼実体顕微鏡をのぞくと、視野が 2 つの丸に分かれて見えました。どうするとよい？',
        options: ['左右の鏡筒の間隔を、目の幅に合わせる', '対物レンズを高い倍率にかえる', '片目をつぶって見る'],
        answer: 'a',
        explanation: '左右の鏡筒の間隔が目の幅と合っていないと、視野が 2 つに分かれて見えます。間隔を調節して、1 つの丸に重なって見えるようにします。',
        hint: '両目と鏡筒の位置が合っているか考えよう。',
      }),
      choice({
        id: 'basics-kq2-p5', concept: 'bas-scope',
        prompt: '観察が終わり、顕微鏡からレンズを外します。外す順として正しいのはどれ？',
        options: ['対物レンズ → 接眼レンズ', '接眼レンズ → 対物レンズ', 'どちらからでもよい'],
        answer: 'a',
        explanation: '接眼レンズを最後まで残しておくと、鏡筒の上の口がふさがったままなので、中にほこりが入りません。つけるときの順（接眼 → 対物）の逆です。',
        hint: '鏡筒にほこりを入れないためには、どちらを最後まで残すとよいかな。',
      }),
    ],
    retryPool: [
      fill({
        id: 'basics-kq2-r1', concept: 'bas-stereo',
        prompt: '空らんに入る数を入れよう。倍率は、接眼レンズの倍率 × 対物レンズの倍率。',
        text: '接眼レンズが 10 倍の双眼実体顕微鏡で 20 倍にして見るには、対物レンズを[b1]にする。',
        blanks: [number('b1', 2, 0, '倍')],
        explanation: '20 ÷ 10 ＝ 2 なので、2 倍の対物レンズを使います。倍率の式から、分からない方の倍率を求められます。',
        hint: '20 を接眼レンズの倍率でわってみよう。',
      }),
      figureChoice({
        id: 'basics-kq2-r2', concept: 'bas-stereo',
        prompt: '双眼実体顕微鏡で、ステージの上の虫を左へ動かしました。視野の中の像はどちらへ動いて見える？ ア 上、イ 下、ウ 左、エ 右',
        figure: stereoView('choice'),
        answer: 'r3',
        explanation: '双眼実体顕微鏡の像は上下左右が逆にならないので、虫を左へ動かすと、像も左へ動きます。',
        hint: '像は逆さまにならないよ。',
      }),
      choice({
        id: 'basics-kq2-r3', concept: 'bas-scope',
        prompt: '接眼レンズをのぞいたまま、対物レンズとプレパラートを近づけていくと、どんなおそれがある？',
        options: ['レンズがプレパラートにぶつかる', '像が上下左右逆にならなくなる', '視野が明るくなりすぎる'],
        answer: 'a',
        explanation: 'のぞいたままではすき間が見えないので、レンズがプレパラートにぶつかり、割れたり傷がついたりするおそれがあります。近づけるときは横から見ます。',
        hint: 'のぞいているとき、レンズの先は見えているかな。',
      }),
      fill({
        id: 'basics-kq2-r4', concept: 'bas-scope',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '顕微鏡からレンズを外すときは、対物レンズを先に外し、[b1]を最後に外す。',
        blanks: [word('b1', ['接眼レンズ', '反射鏡', 'ステージ'], '接眼レンズ')],
        explanation: '接眼レンズを最後まで残すと、鏡筒の口がふさがったままになり、ほこりが入りません。',
        hint: '鏡筒の上の口にはまっているレンズだよ。',
      }),
      choice({
        id: 'basics-kq2-r5', concept: 'bas-scope', term: true,
        prompt: '次の説明に合う言葉はどれ？「ステージの下にあり、通る光の量を調節する部分」',
        options: ['しぼり', 'レボルバー', 'アーム'],
        answer: 'a',
        explanation: '**しぼり**で光の量を調節して、視野の明るさを変えます。レボルバーは対物レンズをかえる部分、アームは運ぶときににぎる部分です。',
        hint: '光の量を「しぼる」部分だよ。',
      }),
    ],
  };

  // ---- ステージ basics-kq3: クイズ 3（倍率と像の大きさ、プランクトン、観点と基準） ----
  const basKq3 = {
    id: 'basics-kq3', areaId: 'bas-observe', free: true, title: 'クイズ 3: 倍率と小さな生物のなかま分け', minutes: 6,
    concepts: ['bas-magnify', 'bas-microbe'],
    lessons: [
      {
        id: 'basics-kq3-c1',
        text: '倍率を上げると、ものは大きく見えますが、**視野**はせまく暗くなります。倍率は長さを何倍にしたかを表すので、像の長さを倍率でわると、実際の長さが分かります。',
        figure: viewsScene(false),
      },
      {
        id: 'basics-kq3-c2',
        text: '池や水そうの水の中には、水中をただよって生活する小さな生物がたくさんいます。これらをまとめて**プランクトン**といいます。緑色で光合成をするものも、動き回ってほかの生物を食べるものもいます。',
        figure: scene([
          { type: 'rect', x: 20, y: 30, width: 280, height: 180, fill: 'water', rx: 10 },
          { type: 'ellipse', x: 80, y: 90, rx: 26, ry: 8, fill: 'lightgreen' },
          { type: 'circle', x: 230, y: 80, r: 18, fill: 'lightgreen' },
          { type: 'ellipse', x: 110, y: 160, rx: 22, ry: 10, fill: 'white' },
          { type: 'ellipse', x: 220, y: 160, rx: 16, ry: 20, fill: 'white' },
          { type: 'text', x: 160, y: 232, text: '水中をただよう小さな生物', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'basics-kq3-c3',
        text: 'なかま分けでは、何に注目するか（**観点**）を決め、「動き回る／動き回らない」のような分ける決まり（**基準**）を決めます。色のように、成長や季節で変わる特徴は、基準にしにくいことがあります。',
        figure: moveBoxes(false),
      },
    ],
    warmup: choice({
      id: 'basics-kq3-w1', concept: 'bas-magnify',
      prompt: '予想しよう。長さ 0.1 mm の生物を、顕微鏡で 150 倍にして見ると、像の長さはどのくらいに見えると思う？',
      options: ['約 1.5 mm', '約 15 mm', '約 150 mm'],
      answer: 'b',
      explanation: '0.1 × 150 ＝ 15 なので、約 15 mm に見えます。倍率は、長さを何倍にして見ているかを表しています。',
      hint: '実際の長さに倍率をかけてみよう。',
    }),
    problems: [
      fill({
        id: 'basics-kq3-p1', concept: 'bas-magnify',
        prompt: '空らんに入る数を入れよう。倍率は、長さを何倍にして見ているかを表す。',
        text: '150 倍で見た生物の像の長さが 30 mm だった。この生物の実際の長さは[b1]である。',
        blanks: [number('b1', 0.2, 0, 'mm')],
        explanation: '30 ÷ 150 ＝ 0.2 なので、実際の長さは 0.2 mm です。像の長さを倍率でわると、実際の長さが分かります。',
        hint: '像の長さを倍率でわってみよう。',
      }),
      fill({
        id: 'basics-kq3-t1', concept: 'bas-microbe', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水中をただよって生活する小さな生物を、まとめて[b1]という。',
        blanks: [word('b1', ['プランクトン', '胞子', '花粉'], 'プランクトン')],
        explanation: 'ミカヅキモやゾウリムシ、ミジンコのように、水中をただよって生活する小さな生物をまとめて**プランクトン**といいます。',
        hint: '水中を「ただよう」生物の、まとめた名前だよ。',
      }),
      figureChoice({
        id: 'basics-kq3-p2', concept: 'bas-magnify',
        prompt: 'ア〜ウは、同じプレパラートを 40 倍・100 倍・400 倍で見た視野です。400 倍で見たものはどれ？',
        figure: viewsScene(true),
        answer: 'r2',
        explanation: '倍率が高いほど、1 つ 1 つが大きく見え、見える範囲（視野）はせまく暗くなります。大きな細胞が 1 つだけ見え、いちばん暗いイが 400 倍です。',
        hint: '大きく見えて、視野が暗いものをさがそう。',
      }),
      fill({
        id: 'basics-kq3-p3', concept: 'bas-magnify',
        prompt: '空らんに入る数を入れよう。倍率を 4 倍にすると、ものの長さは 4 倍に見える。',
        text: '100 倍で、視野の直径にそって細胞が 8 個並んで見えた。400 倍にすると、直径にそって並んで見える細胞は[b1]になる。',
        blanks: [number('b1', 2, 0, '個')],
        explanation: '倍率を 4 倍にすると、細胞 1 個の長さが 4 倍に見えるので、直径にならぶ数は 8 ÷ 4 ＝ 2 個になります。高倍率ほど視野がせまくなることが、数からも分かります。',
        hint: '1 個の細胞が何倍の長さに見えるか考えよう。',
      }),
      drag({
        id: 'basics-kq3-p4', concept: 'bas-microbe',
        prompt: '観点「自分で動き回るか」でなかま分けします。緑色で光合成をするボルボックスのカードを、入る方の箱へ動かして置こう。',
        figure: moveBoxes(true),
        draggable: { itemId: 'card' },
        target: { x: 40, y: 108 },   // rect の答えは左上。カード 90×24 の中心が左の箱の中 (85, 120) に来る位置
        samples: { correct: { x: 40, y: 108 }, wrong: { x: 190, y: 108 } },
        explanation: 'ボルボックスは緑色で光合成をしますが、細い毛（べん毛）を動かして、回りながら水中を動き回ります。「緑色だから動かない」とは決められません。',
        hint: 'ボルボックスが水中でどう動くか、思い出そう。',
      }),
      choice({
        id: 'basics-kq3-p5', concept: 'bas-microbe',
        prompt: '生物を「体の色」だけでなかま分けするのが、むずかしいことがあるのはなぜ？',
        options: ['同じ種類でも、成長や季節で色が変わるから', '色はだれが見ても同じだから', '色は顕微鏡でしか見えないから'],
        answer: 'a',
        explanation: '同じ種類でも、成長のようすや季節、育った場所で色が変わることがあります。分ける基準には、変わりにくい特徴を選ぶと、だれが分けても同じになります。',
        hint: '同じ植物でも、春と秋で色がちがうことはないかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'basics-kq3-r1', concept: 'bas-magnify',
        prompt: 'ア〜ウは、同じプレパラートを 40 倍・100 倍・400 倍で見た視野です。40 倍で見たものはどれ？',
        figure: viewsScene(true),
        answer: 'r1',
        explanation: '倍率がいちばん低い 40 倍では、細胞は小さく見えますが、見える範囲が広く明るくなります。小さな細胞がたくさん見えるアが 40 倍です。',
        hint: '小さく見えて、たくさん見えるものをさがそう。',
      }),
      fill({
        id: 'basics-kq3-r2', concept: 'bas-magnify',
        prompt: '空らんに入る数を入れよう。倍率は、長さを何倍にして見ているかを表す。',
        text: '実際の長さが 0.05 mm のミカヅキモが、像では 20 mm の長さに見えた。このときの倍率は[b1]である。',
        blanks: [number('b1', 400, 0, '倍')],
        explanation: '20 ÷ 0.05 ＝ 400 なので、400 倍で見ています。像の長さを実際の長さでわると、倍率が分かります。',
        hint: '像の長さが、実際の長さの何倍かを求めよう。',
      }),
      choice({
        id: 'basics-kq3-r3', concept: 'bas-microbe',
        prompt: 'ゾウリムシ・ミジンコ・ミミズ・バッタを、観点「すんでいる場所」で分けました。ゾウリムシと同じなかまに入るのはどれ？',
        options: ['ミジンコ', 'ミミズ', 'バッタ'],
        answer: 'a',
        explanation: 'ゾウリムシとミジンコは水中、ミミズは土の中、バッタは地上にすんでいます。観点を決めると、それぞれの生物がどのなかまに入るかがはっきりします。',
        hint: '水の中にすむ生物はどれかな。',
      }),
      choice({
        id: 'basics-kq3-r4', concept: 'bas-microbe', term: true,
        prompt: '次の説明に合う言葉はどれ？「なかま分けで、観点にそって分けるときの決まり。例: 動き回るか、動き回らないか」',
        options: ['観点', '基準', '結論'],
        answer: 'b',
        explanation: '何に注目するかが観点、その観点でどう分けるかの決まりが**基準**です。「動き」が観点なら、「動き回る／動き回らない」が基準になります。',
        hint: '「分ける決まり」のことだよ。',
      }),
    ],
  };

  // ---- ステージ basics-kq4: クイズ 4（実験器具の使い方。電子てんびんと薬包紙、温度計の読み方、ガスバーナーの調節） ----
  const basKq4 = {
    id: 'basics-kq4', areaId: 'bas-experiment', free: true, title: 'クイズ 4: 実験器具の使い方', minutes: 6,
    concepts: ['bas-burner', 'bas-review'],
    lessons: [
      {
        id: 'basics-kq4-c1',
        text: '電子てんびんは水平な台に置きます。粉の薬品をはかるときは、皿に**薬包紙**をのせてから表示を 0 にし、その上に薬品をのせます。こうすると、薬品だけの質量が表示されます。',
        figure: balanceScene(),
      },
      {
        id: 'basics-kq4-c2',
        text: '温度計は、**液だめ**を液の中ほどに入れ、赤い液の先が止まってから読みます。目は液の先と同じ高さにして真横から見て、最小目盛りの 10 分の 1 まで目分量で読みます。',
        figure: thermoScene(24.5, false),
      },
      {
        id: 'basics-kq4-c3',
        text: 'ガスバーナーの**ガス調節ねじ**は炎の大きさを、**空気調節ねじ**は炎の色を変えます。炎の色だけを変えたいときは、ガス調節ねじを指でおさえて、空気調節ねじだけを回します。',
        figure: burnerScene(false),
      },
    ],
    warmup: choice({
      id: 'basics-kq4-w1', concept: 'bas-review',
      prompt: '予想しよう。電子てんびんに薬包紙をのせ、表示を 0 にしないまま薬品をのせると、表示される値はどれ？',
      options: ['薬品だけの質量', '薬品と薬包紙を合わせた質量', '薬包紙だけの質量'],
      answer: 'b',
      explanation: '表示を 0 にしていないと、薬包紙の質量もいっしょに表示されます。薬包紙をのせてから 0 にすれば、薬品だけの質量が分かります。',
      hint: '皿の上にのっているものを全部考えよう。',
    }),
    problems: [
      fill({
        id: 'basics-kq4-p1', concept: 'bas-review',
        prompt: '空らんに入る数を入れよう。',
        text: '表示を 0 にしないで、0.4 g の薬包紙と食塩をのせると、5.6 g と表示された。食塩の質量は[b1]である。',
        blanks: [number('b1', 5.2, 0, 'g')],
        explanation: '5.6 − 0.4 ＝ 5.2 なので、食塩は 5.2 g です。薬包紙をのせてから表示を 0 にしておけば、このひき算をしなくてすみます。',
        hint: '表示された値から、薬包紙の質量をひこう。',
      }),
      fill({
        id: 'basics-kq4-t1', concept: 'bas-review', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '粉の薬品を電子てんびんではかるとき、皿にのせて薬品を受ける紙を[b1]という。',
        blanks: [word('b1', ['薬包紙', 'ろ紙', 'リトマス紙'], '薬包紙')],
        explanation: '**薬包紙**は、粉の薬品をのせたり包んだりする紙です。ろ紙は液体と固体を分けるろ過に、リトマス紙は酸性・アルカリ性を調べるのに使います。',
        hint: '薬を「包む」紙だよ。',
      }),
      figureChoice({
        id: 'basics-kq4-p2', concept: 'bas-burner',
        prompt: '炎の大きさは変えずに、色だけを青くしたい。空気調節ねじを回すとき、指でおさえておくのはどれ？ ア 上のねじ（空気調節ねじ）、イ 下のねじ（ガス調節ねじ）、ウ 元栓',
        figure: burnerScene(true),
        answer: 'r2',
        explanation: '空気調節ねじを回すと、下のガス調節ねじもいっしょに回ってしまうことがあります。ガス調節ねじをおさえておけば、ガスの量（炎の大きさ）が変わりません。',
        hint: '炎の大きさを決めるねじが、動かないようにしよう。',
      }),
      drag({
        id: 'basics-kq4-p3', concept: 'bas-review',
        prompt: '温度計の目盛りを読みます。目はどの高さに置くとよい？ 目を点線にそって上下に動かして、正しい高さに置こう。',
        figure: thermoScene(24.5, true),
        draggable: { itemId: 'eye', axis: 'y' },
        target: { x: 70, y: thermoY(24.5) },
        samples: { correct: { x: 70, y: thermoY(24.5) }, wrong: { x: 70, y: 52 } },
        explanation: '目は赤い液の先と同じ高さにして、真横から読みます。上や下から見ると、目盛りがずれて読めてしまいます。',
        hint: '赤い液の先を、真横から見る高さはどこかな。',
      }),
      fill({
        id: 'basics-kq4-p4', concept: 'bas-review',
        prompt: '図の温度計の目盛りを読もう。最小目盛りの 10 分の 1 まで目分量で読む。',
        text: '温度計が示している温度は[b1]である。',
        figure: thermoScene(24.5, false),
        blanks: [number('b1', 24.5, 0.1, '℃')],
        explanation: '赤い液の先は、24 ℃と 25 ℃の目盛りのちょうど真ん中なので、24.5 ℃と読みます。最小目盛り（1 ℃）の 10 分の 1 まで目分量で読みます。',
        hint: '20 と 25 の数字から、1 目盛りが何 ℃かを考えよう。',
      }),
      choice({
        id: 'basics-kq4-p5', concept: 'bas-burner',
        prompt: 'ガスバーナーの元栓を開く前に、2 つの調節ねじが閉まっているか確かめるのはなぜ？',
        options: ['元栓を開いたとき、ガスがもれ出ないようにするため', '炎の色を青くするため', 'ねじをこわさないため'],
        answer: 'a',
        explanation: 'ねじが開いたまま元栓を開くと、火のついていないガスが出て、たまったガスに火がつくと危険です。2 つのねじが閉じているかを、最初に必ず見ておきます。',
        hint: 'ねじが開いていたら、元栓を開いたときに何が出てくるかな。',
      }),
    ],
    retryPool: [
      fill({
        id: 'basics-kq4-r1', concept: 'bas-burner', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ガスバーナーの炎の大きさを調節するのは、[b1]である。',
        blanks: [word('b1', ['ガス調節ねじ', '空気調節ねじ', '元栓'], 'ガス調節ねじ')],
        explanation: '**ガス調節ねじ**でガスの量を変えると、炎の大きさが変わります。空気調節ねじは、炎の色を変えるねじです。',
        hint: 'ガスの量がふえると、炎はどうなるかな。',
      }),
      choice({
        id: 'basics-kq4-r2', concept: 'bas-burner',
        prompt: '空気調節ねじを開きすぎて、炎がゴーッと音を立て、消えそうになった。どうするとよい？',
        options: ['空気調節ねじを少し閉める', 'ガス調節ねじを閉める', '元栓をさらに開く'],
        answer: 'a',
        explanation: '空気が多すぎると、炎が音を立ててふき消えそうになります。空気調節ねじを少し閉めて、ちょうどよい青い炎にします。',
        hint: '何が多すぎるのか考えよう。',
      }),
      figureChoice({
        id: 'basics-kq4-r3', concept: 'bas-review',
        prompt: 'ビーカーの湯の温度をはかります。温度計の液だめを置く位置として正しいのはどれ？ ア 液の中ほど、イ 液面より上、ウ ビーカーの底にふれる所',
        figure: beakerThermoScene(),
        answer: 'r1',
        explanation: '液だめは液の中ほどに入れます。液面より上では空気の温度に、底にふれると加熱されたビーカーの温度に近くなり、液の温度を正しくはかれません。',
        hint: '液の温度だけを正しくはかれる位置はどこかな。',
      }),
      fill({
        id: 'basics-kq4-r4', concept: 'bas-review',
        prompt: '図の温度計の目盛りを読もう。最小目盛りの 10 分の 1 まで目分量で読む。',
        text: '温度計が示している温度は[b1]である。',
        figure: thermoScene(28, false),
        blanks: [number('b1', 28, 0.1, '℃')],
        explanation: '赤い液の先は 28 ℃の目盛りに重なっているので、28.0 ℃と読みます。目盛りちょうどのときも、10 分の 1 の位まで「.0」と読みます。',
        hint: '25 から数えて、いくつ上の目盛りかな。',
      }),
    ],
  };

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'basics',
    title: '観察と実験の基本',
    mascot: 'A',   // 担当の先生（js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'bas-observe', title: '観察の道具', order: 1, stages: [bas1, bas2, bas3, basDr1, basKq1, basKq2, basKq3] },
      { id: 'bas-experiment', title: '実験の基本', order: 2, stages: [bas4, basKq4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
