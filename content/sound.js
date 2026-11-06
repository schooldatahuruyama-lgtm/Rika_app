// 「音の世界」教材データ（中学1年 理科）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通指示 .ai-tasks/20261104-170000_単元教材の共通指示.md）。
// 2 領域 × 2 ステージ（音の伝わり方・音の大きさと高さ）と、概念 6 つ。
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

  // ---- 音の図の部品（汎用の部品を組み合わせる） ----

  const round1 = (v) => Math.round(v * 10) / 10;

  // 波形の折れ線: 左はし (x0, yc) から幅 w に、山の高さ amp の波を cycles 回。1 回の波を 16 点で近似する
  function wave(x0, yc, w, amp, cycles, color) {
    const n = Math.max(2, Math.round(cycles * 16));
    const points = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      points.push([round1(x0 + w * t), round1(yc - amp * Math.sin(2 * Math.PI * cycles * t))]);
    }
    return { type: 'line', points, color: color || 'blue', width: 2 };
  }

  // 波形 1 本ぶん（中心の線・波・左に選ぶ場所）。4 本を同じ横はば（同じ時間）で縦に並べる
  function waveRow(regionId, label, yc, amp, cycles) {
    return [
      { type: 'line', points: [[60, yc], [310, yc]], color: 'gray', width: 1 },
      wave(60, yc, 250, amp, cycles),
      { type: 'region', id: regionId, x: 28, y: yc, r: 22, label },
    ];
  }

  // 振動する弦: x1〜x2 の弦（実線）と、振れるはば amp の点線（上下の半波）
  function vibratingString(x1, x2, y, amp) {
    const up = [], down = [];
    for (let i = 0; i <= 8; i++) {
      const x = round1(x1 + (x2 - x1) * i / 8);
      const d = round1(amp * Math.sin(Math.PI * i / 8));
      up.push([x, round1(y - d)]);
      down.push([x, round1(y + d)]);
    }
    return [
      { type: 'line', points: up, color: 'blue', width: 2, dashed: true },
      { type: 'line', points: down, color: 'blue', width: 2, dashed: true },
      { type: 'line', points: [[x1, y], [x2, y]], width: 2 },
      { type: 'circle', x: x1, y, r: 4, fill: 'ink' },
      { type: 'circle', x: x2, y, r: 4, fill: 'ink' },
    ];
  }

  // ことじ（弦の下に置く三角の木片）。頂点が弦 (x, sy) に当たる。点の平均（ドラッグの基準点）は (x, sy + 44/3)
  function bridge(x, sy, id, fill) {
    const it = { type: 'polygon', points: [[x - 12, sy + 22], [x + 12, sy + 22], [x, sy]], fill: fill || 'gray' };
    if (id) it.id = id;
    return it;
  }

  // モノコード: 弦の高さ sy。左のはし x=40 の支えからことじまでが、はじく部分。右は滑車とおもりで張る
  function monochord(sy) {
    return [
      { type: 'rect', x: 20, y: sy + 22, width: 270, height: 24, fill: 'sand' },
      bridge(40, sy),
      { type: 'circle', x: 298, y: sy + 7, r: 7 },
      { type: 'line', points: [[305, sy + 7], [305, sy + 50]], width: 2 },
      { type: 'rect', x: 297, y: sy + 50, width: 16, height: 16, fill: 'gray' },
      { type: 'line', points: [[36, sy], [298, sy]], width: 2 },
    ];
  }

  // おんさ（上向き）: うで 2 本の左上 (x - 20, y)、うでの長さ 90、柄の下はし y + 150。vib でうでの振動の点線
  function fork(x, y, vib) {
    const items = [
      { type: 'rect', x: x - 20, y, width: 10, height: 90, fill: 'glass' },
      { type: 'rect', x: x + 10, y, width: 10, height: 90, fill: 'glass' },
      { type: 'rect', x: x - 20, y: y + 90, width: 40, height: 10, fill: 'glass' },
      { type: 'rect', x: x - 5, y: y + 100, width: 10, height: 50, fill: 'glass' },
    ];
    if (vib) {
      items.push({ type: 'line', points: [[x - 27, y + 6], [x - 27, y + 78]], color: 'blue', width: 2, dashed: true });
      items.push({ type: 'line', points: [[x + 27, y + 6], [x + 27, y + 78]], color: 'blue', width: 2, dashed: true });
    }
    return items;
  }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/sound/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/sound/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 花火と人（距離の計算の図）。note は上に書く一言
  function fireworks(note) {
    return [
      { type: 'line', points: [[20, 212], [300, 212]], color: 'line', width: 2 },
      { type: 'circle', x: 60, y: 56, r: 26, fill: 'yellow', stroke: 'orange' },
      { type: 'line', points: [[60, 82], [60, 212]], color: 'gray', width: 2, dashed: true },
      { type: 'circle', x: 272, y: 160, r: 10 },
      { type: 'polygon', points: [[262, 174], [282, 174], [286, 210], [258, 210]], fill: 'green' },
      { type: 'arrow', x1: 64, y1: 228, x2: 268, y2: 228, color: 'blue', width: 2 },
      { type: 'arrow', x1: 268, y1: 228, x2: 64, y2: 228, color: 'blue', width: 2 },
      { type: 'text', x: 128, y: 206, text: '距離', size: 14 },
      { type: 'text', x: 104, y: 40, text: note, size: 14 },
      { type: 'text', x: 70, y: 112, text: '花火', size: 14 },
      { type: 'text', x: 250, y: 140, text: '人', size: 14 },
    ];
  }

  // 波形の図（同じ時間の 4 つの波形）。1 つめはステージ sound-4 の問題用、2 つめは類題用
  const WAVES_1 = scene([
    ...waveRow('r1', 'ア', 32, 10, 2),
    ...waveRow('r2', 'イ', 90, 20, 2),
    ...waveRow('r3', 'ウ', 148, 10, 3),
    ...waveRow('r4', 'エ', 206, 14, 5),
  ]);
  const WAVES_2 = scene([
    ...waveRow('r1', 'ア', 32, 8, 3),
    ...waveRow('r2', 'イ', 90, 20, 3),
    ...waveRow('r3', 'ウ', 148, 12, 6),
    ...waveRow('r4', 'エ', 206, 12, 1.5),
  ]);

  // 0.01 秒間の波形（振動数を求める図）。cycles 回振動している
  function timedWave(cycles, total) {
    return scene([
      { type: 'line', points: [[30, 110], [290, 110]], color: 'gray', width: 1 },
      wave(40, 110, 240, 50, cycles),
      { type: 'line', points: [[40, 190], [280, 190]], width: 2 },
      { type: 'line', points: [[40, 182], [40, 198]], width: 2 },
      { type: 'line', points: [[280, 182], [280, 198]], width: 2 },
      { type: 'text', x: 160, y: 222, text: total, anchor: 'middle', size: 16 },
    ]);
  }

  // ================================================================
  // 領域 1: 音の伝わり方
  // ================================================================

  // ---- ステージ sound-1: 音が出るとき（音源と振動） ----
  const sound1 = {
    id: 'sound-1', areaId: 'travel', title: '音が出るとき', minutes: 4, concepts: ['so-vibration'],
    lessons: [
      {
        id: 'sound-1-c1',
        text: 'たいこやギターの弦、おんさのように、音を出しているものを**音源**といいます。音源をよく見たりさわったりすると、どれも細かくふるえています。このふるえを**振動**といいます。',
        // 写真: 共鳴箱つきのおんさとハンマー（左）、たいことばち（右）。おんさ (84〜148, 3〜152)、たいこ (170〜278, 72〜155)
        figure: scene([
          photo('sound-1-c1'),
          tag(96, 198, 'おんさ'),
          tag(224, 198, 'たいこ'),
          tag(160, 228, '音源は振動している', { size: 16, bold: true }),
        ]),
      },
      {
        id: 'sound-1-c2',
        text: '鳴っているおんさの先を水にふれさせると、水しぶきが上がります。鳴っているおんさを手でにぎって**振動**を止めると、音も止まります。音が出ているとき、音源は振動しています。',
        // 写真: 手に持った鳴っているおんさの先を、ビーカーの水面にふれさせる。おんさの先 (112, 110)、水しぶき (80〜170, 40〜115)、右側は白い余白
        figure: scene([
          photo('sound-1-c2'),
          pointer(208, 58, 152, 62), tag(214, 62, '水しぶき', { anchor: 'start' }),
          pointer(186, 104, 114, 106), tag(192, 108, '鳴っているおんさ', { anchor: 'start' }),
          pointer(186, 154, 140, 154), tag(192, 158, '水', { size: 13, anchor: 'start' }),
        ]),
      },
      {
        id: 'sound-1-c3',
        anim: 'so-air-wave',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '音源の**振動**は、まわりの空気を次々に振動させて伝わっていきます。空気の振動が耳に届き、耳の中の鼓膜（こまく）を振動させると、音が聞こえます。',
        // おんさ → 空気の振動 → 耳
        figure: scene([
          ...fork(50, 40, true),
          { type: 'line', points: [[110, 80], [120, 115], [110, 150]], color: 'blue', width: 2 },
          { type: 'line', points: [[150, 70], [162, 115], [150, 160]], color: 'blue', width: 2 },
          { type: 'line', points: [[190, 60], [204, 115], [190, 170]], color: 'blue', width: 2 },
          { type: 'line', points: [[230, 70], [244, 115], [230, 160]], color: 'blue', width: 2 },
          { type: 'ellipse', x: 290, y: 115, rx: 14, ry: 26, fill: 'pink' },
          { type: 'text', x: 290, y: 166, text: '耳', anchor: 'middle', size: 14 },
          { type: 'text', x: 176, y: 210, text: '空気の振動が伝わる', anchor: 'middle', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'sound-1-w1', concept: 'so-vibration',
      prompt: '予想しよう。鳴っているたいこの皮に、小さな紙の切れはしをのせると、どうなると思う？',
      options: ['紙は皮にすいついて動かない', '紙がぴょんぴょんはねる', '紙がとけてなくなる'],
      answer: 'b',
      explanation: '鳴っているたいこの皮は細かくふるえているので、のせた紙がはねます。音とふるえの関係を、このステージで確かめよう。',
      hint: '鳴っているたいこの皮に、そっと手をふれたときの感じを思い出そう。',
    }),
    problems: [
      choice({
        id: 'sound-1-p1', concept: 'so-vibration',
        prompt: 'たいこ、ギターの弦、おんさ。音を出しているこれらのものに共通することはどれ？',
        options: ['どれも金属でできている', 'どれも熱くなっている', 'どれも細かく振動している'],
        answer: 'c',
        explanation: '音を出しているものは、どれも細かく振動しています。材料や温度は関係ありません。「音が出ている＝音源が振動している」と覚えておこう。',
        hint: '鳴っているものにそっとふれたとき、指に何を感じるか考えよう。',
      }),
      fill({
        id: 'sound-1-t1', concept: 'so-vibration', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '音を出しているものを[b1]という。音を出しているものは細かくふるえている。このふるえを[b2]という。',
        blanks: [
          word('b1', ['振動', '音源', '振幅'], '音源'),
          word('b2', ['振動', '音源', '振幅'], '振動'),
        ],
        explanation: '音を出しているものが**音源**、そのふるえが**振動**です。「源」は「みなもと」という意味です。',
        hint: '「音のみなもと」と「ふるえ」に合う言葉をさがそう。',
      }),
      choice({
        id: 'sound-1-p2', concept: 'so-vibration',
        prompt: '鳴っているおんさの先を、水を入れた容器の水面にふれさせると、どうなる？',
        options: ['水しぶきが上がる', '水がこおる', '何も起こらない'],
        answer: 'a',
        explanation: '鳴っているおんさのうでは細かく振動しているので、水面にふれると水しぶきが上がります。目では見えにくい振動も、水を使うと確かめられます。',
        hint: '鳴っているおんさのうでは、どうなっていたかな。',
      }),
      figureChoice({
        id: 'sound-1-p3', concept: 'so-vibration',
        prompt: '鳴っているおんさの音を、すぐに止めたい。ア〜ウのどこを手でにぎるとよい？（ア: 2 本のうで、イ: 下の柄、ウ: おんさを置いた台）',
        figure: scene([
          ...fork(160, 40, true),
          { type: 'rect', x: 60, y: 190, width: 200, height: 16, fill: 'brown' },
          { type: 'region', id: 'r1', x: 160, y: 76, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 166, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 236, y: 198, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '音を出しているのは、振動している 2 本のうでです。うでをにぎって振動を止めると、音も止まります。柄や台をにぎっても、うでの振動は止まりません。',
        hint: '点線は、おんさのどこが振動しているかを表しているよ。',
      }),
      choice({
        id: 'sound-1-p4', concept: 'so-vibration',
        prompt: '同じ高さの音を出す 2 つのおんさ A・B を、少しはなして向かい合わせに置きました。A だけを鳴らしてから、A を手でおさえて止めると、B が鳴っていました。B が鳴ったのはなぜ？',
        options: ['B がひとりでに鳴りだしたから', 'A の振動が空気を伝わって、B を振動させたから', 'A から出た光が B に当たったから'],
        answer: 'b',
        explanation: 'A の振動がまわりの空気を次々に振動させ、その振動が B に届いて B も振動しはじめました。このように、はなれたおんさが鳴りだすことを共鳴といいます。音は振動が伝わるものだと分かります。',
        hint: '音源の振動は、何を通って伝わっていくのか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'sound-1-r1', concept: 'so-vibration',
        prompt: 'ギターの弦をはじいて鳴らしたあと、指で弦をおさえました。音はどうなる？',
        options: ['音が大きくなる', '音が止まる', '音が高くなる'],
        answer: 'b',
        explanation: '指でおさえると弦の振動が止まるので、音も止まります。音が出ているあいだ、音源はずっと振動しています。',
        hint: '音が出ているとき、弦はどうなっているか思い出そう。',
      }),
      fill({
        id: 'sound-1-r2', concept: 'so-vibration',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '音は、音源の[b1]がまわりの[b2]を次々に振動させて、耳まで伝わる。',
        blanks: [
          word('b1', ['光', '振動', '熱'], '振動'),
          word('b2', ['空気', '光', '電気'], '空気'),
        ],
        explanation: '音源の振動が、まわりの空気を次々に振動させて耳まで届きます。耳の中の鼓膜が振動すると、音が聞こえます。',
        hint: 'ふだん、わたしたちと音源のあいだにあるものは何かな。',
      }),
      choice({
        id: 'sound-1-r3', concept: 'so-vibration',
        prompt: '同じ高さの音を出す 2 つのおんさ A・B のあいだに、厚い板を立てました。A を鳴らしてから止めると、B はどうなる？',
        options: ['板がないときと同じように鳴る', '板がないときより大きく鳴る', 'ほとんど鳴らない'],
        answer: 'c',
        explanation: '板があると、A からの空気の振動が B に届きにくくなります。そのため、B はほとんど振動せず、ほとんど鳴りません。B が鳴るのは、A の振動が空気を伝わって届くからです。',
        hint: 'A の振動は、何を通って B に届いていたかな。',
      }),
      choice({
        id: 'sound-1-t2', concept: 'so-vibration', term: true,
        prompt: '次の説明に合う言葉はどれ？「たいこやおんさのように、音を出しているもの」',
        options: ['振動数', '真空', '音源'],
        answer: 'c',
        explanation: '音を出しているものを**音源**といいます。音源は、音を出しているあいだ振動しています。',
        hint: '音の「みなもと」という意味の言葉だよ。',
      }),
    ],
  };

  // ---- ステージ sound-2: 音を伝えるもの・速さ（真空、固体・液体、音の速さ） ----
  const sound2 = {
    id: 'sound-2', areaId: 'travel', title: '音を伝えるもの・速さ', minutes: 5, concepts: ['so-medium', 'so-speed'],
    lessons: [
      {
        id: 'sound-2-c1',
        text: '容器の中でブザーを鳴らし、ポンプで中の空気をぬいていくと、音はしだいに小さくなります。空気が音を伝えていたからです。空気などの物質がまったくない**真空**の中では、音は伝わりません。',
        // 写真: 透明な容器（10〜122, 107〜220）の中のブザー (52, 190)。ゴム管 (122, 177)〜(197, 187) で右の手動の真空ポンプ（197〜315, 122〜215）につなぐ。上は白い余白
        figure: scene([
          photo('sound-2-c1'),
          tag(160, 36, '空気をぬくと、音が小さくなる', { size: 15, bold: true }),
          tag(160, 62, '真空の中では、音は伝わらない', { size: 13 }),
          pointer(60, 156, 54, 180), tag(62, 150, 'ブザー'),
          { type: 'arrow', x1: 132, y1: 164, x2: 186, y2: 170, color: 'blue', width: 2 },
          tag(158, 152, '空気', { size: 13 }),
          tag(256, 234, 'ポンプ'),
        ]),
      },
      {
        id: 'sound-2-c2',
        anim: 'so-string-phone',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '音は空気などの気体だけでなく、水などの液体や、金属・木などの固体の中も伝わります。糸電話で声が聞こえるのは、ぴんと張った糸が声の**振動**を伝えるからです。',
        // 糸電話
        figure: scene([
          { type: 'polygon', points: [[40, 100], [74, 112], [74, 148], [40, 160]], fill: 'white' },
          { type: 'line', points: [[74, 130], [246, 130]], width: 2 },
          { type: 'polygon', points: [[246, 112], [280, 100], [280, 160], [246, 148]], fill: 'white' },
          { type: 'text', x: 160, y: 120, text: '糸', anchor: 'middle', size: 14 },
          { type: 'text', x: 160, y: 190, text: '糸が振動を伝える', anchor: 'middle', size: 14 },
          { type: 'text', x: 20, y: 40, text: '気体・液体・固体も音を伝える', size: 14 },
        ]),
      },
      {
        id: 'sound-2-c3',
        anim: 'so-light-vs-sound',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '音が空気中を伝わる速さは、およそ秒速 340 m（340 m/s）です。光の速さはおよそ秒速 30 万 km なので、音は光よりずっとおそく伝わります。だから、花火は光が見えてから音が聞こえます。',
        figure: scene(fireworks('光が先、音があと').concat([
          { type: 'text', x: 110, y: 100, text: '光: 秒速 約30万km', size: 13 },
          { type: 'text', x: 110, y: 130, text: '音: 秒速 約340m', size: 13 },
        ])),
      },
      {
        id: 'sound-2-c4',
        text: '花火が光ってから音が聞こえるまでの時間をはかると、花火までの距離が分かります。距離〔m〕＝ 音の速さ〔m/s〕× 時間〔s〕です。2.0 秒なら 340 × 2.0 ＝ 680 m です。',
        figure: scene(fireworks('光ってから 2.0 秒後に音').concat([
          { type: 'text', x: 100, y: 120, text: '340 × 2.0 ＝ 680 m', size: 16, bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'sound-2-w1', concept: 'so-medium',
      prompt: '予想しよう。ブザーを入れた容器から空気をぬいていくと、ブザーの音はどうなると思う？',
      options: ['だんだん大きくなる', 'だんだん小さくなる', '変わらない'],
      answer: 'b',
      explanation: '空気をぬいていくと、音はだんだん小さくなります。なぜそうなるのかを、このステージで考えよう。',
      hint: 'ブザーの振動を耳まで運んでいるものは何か考えよう。',
    }),
    problems: [
      choice({
        id: 'sound-2-p1', concept: 'so-medium',
        prompt: '容器の中でブザーを鳴らしながら空気をぬいていくと、音はしだいに小さくなりました。このことから分かることはどれ？',
        options: ['空気が音を伝えている', '空気が音を出している', '空気をぬくとブザーの振動が止まる'],
        answer: 'a',
        explanation: 'ブザーは振動し続けていますが、音を伝える空気が少なくなるので、音が小さくなります。空気が音を伝えていることが分かります。',
        hint: 'ブザーそのものは、空気をぬく前と同じように動いているよ。',
      }),
      fill({
        id: 'sound-2-t1', concept: 'so-medium', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '空気などの物質がまったくない空間を[b1]という。[b1]の中では、音は[b2]。',
        blanks: [
          word('b1', ['音源', '真空', '振動'], '真空'),
          word('b2', ['速く伝わる', '大きくなる', '伝わらない'], '伝わらない'),
        ],
        explanation: '物質がまったくない空間を**真空**といいます。音は物質の振動で伝わるので、真空の中では伝わりません。',
        hint: '空気をぬいていくと、音がどうなったか思い出そう。',
      }),
      figureChoice({
        id: 'sound-2-p2', concept: 'so-medium',
        prompt: 'ア〜ウのうち、音がほとんど伝わらないのはどれ？（ア: 水の中で鳴らしたブザー、イ: 鉄の棒のはしをたたいた音、ウ: 空気をぬいた容器（真空）の中で鳴らしたブザー）',
        figure: scene([
          { type: 'beaker', x: 60, y: 200, width: 80, height: 100, level: 0.85 },
          { type: 'circle', x: 60, y: 160, r: 10, fill: 'yellow' },
          { type: 'rect', x: 124, y: 140, width: 72, height: 14, fill: 'gray' },
          { type: 'rect', x: 222, y: 100, width: 84, height: 100, fill: 'glass', rx: 8 },
          { type: 'circle', x: 264, y: 150, r: 10, fill: 'yellow' },
          { type: 'text', x: 60, y: 226, text: '水', anchor: 'middle', size: 14 },
          { type: 'text', x: 160, y: 226, text: '鉄の棒', anchor: 'middle', size: 14 },
          { type: 'text', x: 264, y: 226, text: '真空', anchor: 'middle', size: 14 },
          { type: 'region', id: 'r1', x: 60, y: 50, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 50, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 50, r: 22, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '音は、気体・液体・固体の中を振動として伝わります。水（液体）や鉄（固体）も音を伝えます。物質のない真空の中では、音はほとんど伝わりません。',
        hint: '音を伝えるには、振動する物質が必要だったね。',
      }),
      fill({
        id: 'sound-2-p3', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。',
        figure: scene(fireworks('光ってから 2.0 秒後に音')),
        text: '花火が光ってから 2.0 秒後に音が聞こえた。音の速さを 340 m/s とすると、花火までの距離は[b1]である。',
        blanks: [number('b1', 680, 1, 'm')],
        explanation: '距離＝音の速さ×時間なので、340 × 2.0 ＝ 680 m です。光はほとんど一瞬で届くので、音が届くまでの時間だけで計算できます。',
        hint: '音は 1 秒間に 340 m 進むよ。2.0 秒ではどれだけ進むかな。',
      }),
      choice({
        id: 'sound-2-p4', concept: 'so-speed',
        prompt: 'いなずまが光ってから、少しおくれてかみなりの音が聞こえるのはなぜ？',
        options: ['音は光よりずっと速く伝わるから', '音は光よりずっとおそく伝わるから', '音は空気中では伝わらないから'],
        answer: 'b',
        explanation: '光はおよそ秒速 30 万 km、音はおよそ秒速 340 m です。音は光よりずっとおそいので、光が見えたあとに音が届きます。',
        hint: '光と音の速さを比べてみよう。',
      }),
      fill({
        id: 'sound-2-p5', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '680 m はなれたところで鳴らした音が、2.0 秒後に聞こえた。このときの音の速さは[b1]である。',
        blanks: [number('b1', 340, 1, 'm/s')],
        explanation: '速さ＝距離÷時間なので、680 ÷ 2.0 ＝ 340 m/s です。距離＝速さ×時間の式を、形を変えて使えば求められます。',
        hint: '1 秒あたり何 m 進んだかを計算しよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'sound-2-r1', concept: 'so-medium',
        prompt: 'プールにもぐって、水の中で 2 つの石を打ち合わせました。水にもぐっているほかの人に、音は聞こえる？',
        options: ['聞こえる', '聞こえない'],
        answer: 'a',
        explanation: '水などの液体も音を伝えるので、水の中でも音は聞こえます。音を伝えないのは、物質のない真空です。',
        hint: '音を伝えるのは空気だけだったかな。',
      }),
      choice({
        id: 'sound-2-r2', concept: 'so-medium',
        prompt: '糸電話で、相手の声が聞こえるのはなぜ？',
        options: ['糸の中を電気が流れるから', '糸が光を伝えるから', '声の振動が、ぴんと張った糸を伝わるから'],
        answer: 'c',
        explanation: '声で紙コップが振動し、その振動がぴんと張った糸を伝わって、相手の紙コップを振動させます。固体の糸も音を伝えます。',
        hint: '糸をたるませると聞こえにくくなることから考えよう。',
      }),
      fill({
        id: 'sound-2-r3', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '花火が光ってから 3.0 秒後に音が聞こえた。音の速さを 340 m/s とすると、花火までの距離は[b1]である。',
        blanks: [number('b1', 1020, 1, 'm')],
        explanation: '距離＝音の速さ×時間なので、340 × 3.0 ＝ 1020 m です。時間が長いほど、花火は遠くにあります。',
        hint: '音の速さに、聞こえるまでの時間をかけよう。',
      }),
      choice({
        id: 'sound-2-r4', concept: 'so-speed',
        prompt: '空気中を音が伝わる速さは、およそどれくらい？',
        options: ['秒速 340 m', '秒速 340 km', '秒速 30 万 km'],
        answer: 'a',
        explanation: '空気中の音の速さは、およそ秒速 340 m です。秒速 30 万 km は光の速さで、音よりずっと速いです。',
        hint: '花火の音は、光より少しおくれて届くくらいの速さだよ。',
      }),
      choice({
        id: 'sound-2-t2', concept: 'so-medium', term: true,
        prompt: '次の説明に合う言葉はどれ？「空気などの物質がまったくない空間」',
        options: ['真空', '音源', '振幅'],
        answer: 'a',
        explanation: '物質がまったくない空間を**真空**といいます。真空の中では、音は伝わりません。',
        hint: '空気を全部ぬいたときの状態だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 音の大きさと高さ
  // ================================================================

  // モノコードの ことじ の基準点（点の平均）の y。弦の高さ sy に 44/3 を足した値を四捨五入して使う
  // drag は axis 'x' なので、判定は x の差だけ。target・samples の y は基準点の y にそろえておく

  // ---- ステージ sound-3: 大きい音・高い音（振幅、振動数、モノコード） ----
  const sound3 = {
    id: 'sound-3', areaId: 'pitch', title: '大きい音・高い音', minutes: 5, concepts: ['so-amplitude', 'so-frequency'],
    lessons: [
      {
        id: 'sound-3-c1',
        anim: 'so-amplitude',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '音源の振動の振れるはばを**振幅**といいます。弦を強くはじくと振幅が大きくなり、大きい音が出ます。弱くはじくと振幅が小さくなり、小さい音になります。',
        // 弱くはじいた弦（振幅が小さい）と強くはじいた弦（振幅が大きい）
        figure: scene([
          ...vibratingString(40, 260, 80, 8),
          ...vibratingString(40, 260, 180, 26),
          { type: 'arrow', x1: 290, y1: 180, x2: 290, y2: 158, color: 'blue', width: 2 },
          { type: 'text', x: 280, y: 214, text: '振幅', size: 14 },
          { type: 'text', x: 40, y: 50, text: '弱くはじく → 小さい音', size: 14 },
          { type: 'text', x: 40, y: 134, text: '強くはじく → 大きい音', size: 14 },
        ]),
      },
      {
        id: 'sound-3-c2',
        anim: 'so-frequency',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '音源が 1 秒間に振動する回数を**振動数**といいます。単位は**ヘルツ**（記号 **Hz**）です。振動数が多いほど高い音、少ないほど低い音になります。',
        // 振動数が少ない（低い音）と多い（高い音）
        figure: scene([
          { type: 'line', points: [[30, 90], [290, 90]], color: 'gray', width: 1 },
          wave(40, 90, 240, 22, 2),
          { type: 'line', points: [[30, 190], [290, 190]], color: 'gray', width: 1 },
          wave(40, 190, 240, 22, 5),
          { type: 'text', x: 30, y: 46, text: '振動数が少ない → 低い音', size: 14 },
          { type: 'text', x: 30, y: 146, text: '振動数が多い → 高い音', size: 14 },
        ]),
      },
      {
        id: 'sound-3-c3',
        text: 'モノコードでは、弦の振動する部分を短くする、弦を強く張る、弦を細くすると、**振動数**が多くなり、高い音が出ます。音の高さは、振幅ではなく振動数で決まります。',
        // 写真: ななめ上から見たモノコード。弦は左の留め具 (37, 67) から右の滑車 (295, 120) へ。ことじ (148, 96)、おもり (305, 185)。
        // ことじを左へ動かすと、はじく部分（留め具〜ことじ）が短くなる
        figure: scene([
          photo('sound-3-c3'),
          pointer(84, 46, 92, 79), tag(80, 40, 'はじく部分', { size: 13 }),
          pointer(166, 62, 151, 88), tag(172, 56, 'ことじ', { size: 13 }),
          { type: 'arrow', x1: 152, y1: 114, x2: 110, y2: 105, color: 'blue', width: 2 },
          tag(100, 132, 'ことじを左へ', { size: 13, anchor: 'start' }),
          pointer(278, 196, 296, 190), tag(256, 200, 'おもり', { size: 13 }),
          tag(10, 196, '短くする・強く張る・細くする', { anchor: 'start' }),
          tag(10, 222, '→ 振動数が多く、高い音', { anchor: 'start' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'sound-3-w1', concept: 'so-amplitude',
      prompt: '予想しよう。ギターの同じ弦を、弱くはじいたときより強くはじくと、音はどう変わると思う？',
      options: ['音が高くなる', '音が大きくなる', '変わらない'],
      answer: 'b',
      explanation: '強くはじくと、音が大きくなります。高さではなく大きさが変わることを、このステージで確かめよう。',
      hint: '大だいこを強くたたいたときを思い出そう。',
    }),
    problems: [
      choice({
        id: 'sound-3-p1', concept: 'so-amplitude',
        prompt: '同じ弦をはじいたとき、大きい音が出ているのは、弦の振動がどうなっているとき？',
        options: ['振動数が少ないとき', '振幅が大きいとき', '振動していないとき'],
        answer: 'b',
        explanation: '振幅（振れるはば）が大きいほど、大きい音になります。音の大きさは振幅で、音の高さは振動数で決まります。',
        hint: '強くはじいたとき、弦の振れるはばはどうなったかな。',
      }),
      fill({
        id: 'sound-3-t1', concept: 'so-frequency', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '音源が 1 秒間に振動する回数を[b1]といい、単位は[b2]（記号 Hz）である。',
        blanks: [
          word('b1', ['振幅', '振動数', '音源'], '振動数'),
          word('b2', ['メートル', '秒', 'ヘルツ'], 'ヘルツ'),
        ],
        explanation: '1 秒間に振動する回数が**振動数**で、単位は**ヘルツ**（Hz）です。1 秒間に 100 回振動すれば 100 Hz です。',
        hint: '「振動」の「数」と書く言葉だよ。',
      }),
      drag({
        id: 'sound-3-p2', concept: 'so-frequency',
        prompt: 'モノコード A と B は、同じ弦を同じおもりで張っています。B で A より高い音を出すため、はじく部分（左の支えからことじまで）の長さを、A のちょうど半分にしたい。B の青いことじを左右に動かして置こう。',
        // A: 支え x=40 〜 ことじ x=240（長さ 200）。B は長さ 100 にする → ことじ x=140。ことじの基準点 y = 150 + 44/3 ≒ 164.67
        figure: scene([
          ...monochord(40),
          bridge(240, 40),
          ...monochord(150),
          bridge(240, 150, 'koto', 'blue'),
          { type: 'text', x: 4, y: 74, text: 'A', size: 16, bold: true },
          { type: 'text', x: 4, y: 184, text: 'B', size: 16, bold: true },
          { type: 'text', x: 100, y: 28, text: 'はじく部分', size: 13 },
        ]),
        draggable: { itemId: 'koto', axis: 'x' },
        target: { x: 140, y: 164.67 },
        samples: { correct: { x: 140, y: 164.67 }, wrong: { x: 240, y: 164.67 } },
        explanation: 'はじく部分が A の半分になるのは、B のことじを、左の支えと A のことじの位置のちょうどまん中に置いたときです。弦の振動する部分が短いほど振動数が多くなり、高い音が出ます。',
        hint: 'A の左の支えからことじまでの長さを見て、その半分の位置をさがそう。',
      }),
      choice({
        id: 'sound-3-p3', concept: 'so-frequency',
        prompt: 'モノコードで、はじく強さは変えずに、高い音を出す方法として正しいものはどれ？',
        options: ['弦の振動する部分を長くする', '弦を太いものにかえる', '弦の張りを強くする'],
        answer: 'c',
        explanation: '弦を強く張ると振動数が多くなり、高い音が出ます。弦を長くしたり太くしたりすると、振動数が少なくなって低い音になります。',
        hint: '「短く・強く張る・細く」で高い音になったね。',
      }),
      fill({
        id: 'sound-3-p4', concept: 'so-frequency',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '振動数が多いほど音は[b1]なり、振動数が少ないほど音は[b2]なる。',
        blanks: [
          word('b1', ['低く', '高く', '大きく'], '高く'),
          word('b2', ['低く', '高く', '大きく'], '低く'),
        ],
        explanation: '音の高さは振動数で決まります。振動数が多いほど高い音、少ないほど低い音です。音の大きさ（振幅）とは別のことに気をつけよう。',
        hint: '高い音を出す細い弦は、速く細かく振動しているよ。',
      }),
      fill({
        id: 'sound-3-p5', concept: 'so-frequency',
        prompt: '空らんに入る数を入れよう。',
        text: '1 秒間に 440 回振動するおんさの振動数は[b1]である。',
        blanks: [number('b1', 440, 0, 'Hz')],
        explanation: '振動数は 1 秒間に振動する回数なので、440 Hz です。単位のヘルツ（Hz）は「1 秒間に何回」を表します。',
        hint: '振動数の意味を思い出そう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'sound-3-r1', concept: 'so-amplitude',
        prompt: 'モノコードの弦を、はじく強さだけ弱くしました。音はどう変わる？',
        options: ['音が低くなる', '音が高くなる', '音が小さくなる'],
        answer: 'c',
        explanation: '弱くはじくと振幅が小さくなるので、音が小さくなります。弦の長さや張り方は変えていないので、音の高さは変わりません。',
        hint: 'はじく強さで変わるのは、振幅と振動数のどちらかな。',
      }),
      figureChoice({
        id: 'sound-3-r2', concept: 'so-amplitude',
        prompt: 'ア〜ウは、同じ弦をはじいたときの振動のようすで、点線は弦の振れるはばを表しています。いちばん大きい音が出ているのはどれ？',
        figure: scene([
          ...vibratingString(30, 250, 50, 6),
          ...vibratingString(30, 250, 125, 24),
          ...vibratingString(30, 250, 200, 13),
          { type: 'region', id: 'r1', x: 288, y: 50, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 288, y: 125, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 288, y: 200, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '振れるはば（振幅）がいちばん大きいのはイです。振幅が大きいほど、大きい音になります。',
        hint: '点線のはばがいちばん広いものをさがそう。',
      }),
      drag({
        id: 'sound-3-r3', concept: 'so-frequency',
        prompt: 'モノコード A と B は、同じ弦を同じおもりで張っています。B で A と同じ高さの音を出したい。B の青いことじを左右に動かして置こう。',
        // A: 支え x=40 〜 ことじ x=160（長さ 120）。B も長さ 120 → ことじ x=160。基準点 y = 150 + 44/3 ≒ 164.67
        figure: scene([
          ...monochord(40),
          bridge(160, 40),
          ...monochord(150),
          bridge(260, 150, 'koto', 'blue'),
          { type: 'text', x: 4, y: 74, text: 'A', size: 16, bold: true },
          { type: 'text', x: 4, y: 184, text: 'B', size: 16, bold: true },
        ]),
        draggable: { itemId: 'koto', axis: 'x' },
        target: { x: 160, y: 164.67 },
        samples: { correct: { x: 160, y: 164.67 }, wrong: { x: 220, y: 164.67 } },
        explanation: '弦の太さと張り方が同じなら、振動する部分の長さが同じときに振動数も同じになり、同じ高さの音が出ます。B のことじを A と同じ位置に置けばよいです。',
        hint: '同じ弦・同じおもりなら、何をそろえれば同じ高さになるか考えよう。',
      }),
      choice({
        id: 'sound-3-r4', concept: 'so-frequency',
        prompt: '振動数が 200 Hz の音源は、1 秒間に何回振動している？',
        options: ['2 回', '200 回', '0.2 回'],
        answer: 'b',
        explanation: '振動数は 1 秒間に振動する回数です。200 Hz なら、1 秒間に 200 回振動しています。',
        hint: 'Hz は「1 秒間に何回」を表す単位だよ。',
      }),
      choice({
        id: 'sound-3-t2', concept: 'so-amplitude', term: true,
        prompt: '次の説明に合う言葉はどれ？「音源が振動するときの、振れるはば」',
        options: ['振動数', '振幅', 'ヘルツ'],
        answer: 'b',
        explanation: '振動の振れるはばを**振幅**といいます。振幅が大きいほど、大きい音になります。',
        hint: '「はば」という字が入る言葉だよ。',
      }),
    ],
  };

  // ---- ステージ sound-4: 波形を読む（オシロスコープ） ----
  const sound4 = {
    id: 'sound-4', areaId: 'pitch', title: '波形を読む', minutes: 5, concepts: ['so-waveform'],
    lessons: [
      {
        id: 'sound-4-c1',
        text: 'マイクで音をひろい、オシロスコープやコンピュータで見ると、音の振動のようすが波の形で表されます。この形を**波形**といいます。横は時間、縦は振動のようすを表します。',
        // 画面に表した波形
        figure: scene([
          { type: 'rect', x: 30, y: 40, width: 260, height: 140, rx: 8 },
          { type: 'line', points: [[40, 110], [280, 110]], color: 'gray', width: 1 },
          wave(40, 110, 240, 44, 3),
          { type: 'arrow', x1: 40, y1: 204, x2: 280, y2: 204, width: 2 },
          { type: 'text', x: 160, y: 228, text: '時間', anchor: 'middle', size: 14 },
          { type: 'text', x: 30, y: 30, text: 'コンピュータの画面', size: 14 },
        ]),
      },
      {
        id: 'sound-4-c2',
        text: '波形の山の高さ（中心からの高さ）が**振幅**で、山が高いほど大きい音です。同じ時間の中の波の数で**振動数**が分かり、波の数が多いほど高い音です。',
        // 振幅と 1 回の振動
        figure: scene([
          { type: 'line', points: [[30, 120], [290, 120]], color: 'gray', width: 1 },
          wave(40, 120, 240, 50, 2),
          { type: 'arrow', x1: 70, y1: 120, x2: 70, y2: 74, color: 'green', width: 2 },
          { type: 'text', x: 52, y: 62, text: '振幅', size: 14 },
          { type: 'line', points: [[40, 196], [160, 196]], width: 2 },
          { type: 'line', points: [[40, 188], [40, 204]], width: 2 },
          { type: 'line', points: [[160, 188], [160, 204]], width: 2 },
          { type: 'text', x: 100, y: 226, text: '1 回の振動', anchor: 'middle', size: 14 },
        ]),
      },
      {
        id: 'sound-4-c3',
        text: '1 回の振動にかかる時間から、**振動数**を求められます。1 回に 0.005 秒かかるなら、1 秒間では 1 ÷ 0.005 ＝ 200 回振動するので、振動数は 200 Hz です。',
        figure: scene([
          { type: 'line', points: [[30, 100], [290, 100]], color: 'gray', width: 1 },
          wave(40, 100, 240, 46, 2),
          { type: 'line', points: [[40, 170], [160, 170]], width: 2 },
          { type: 'line', points: [[40, 162], [40, 178]], width: 2 },
          { type: 'line', points: [[160, 162], [160, 178]], width: 2 },
          { type: 'text', x: 100, y: 196, text: '0.005 秒', anchor: 'middle', size: 14 },
          { type: 'text', x: 160, y: 226, text: '1 ÷ 0.005 ＝ 200 → 200 Hz', anchor: 'middle', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'sound-4-w1', concept: 'so-waveform',
      prompt: '予想しよう。同じおんさを、弱くたたいたときと強くたたいたときの波形を比べると、どこがちがうと思う？',
      options: ['同じ時間の中の波の数', '波の山の高さ', 'ちがいはない'],
      answer: 'b',
      explanation: '強くたたくと、波の山が高くなります。おんさの音の高さは同じなので、波の数は変わりません。波形の読み方をこのステージで学ぼう。',
      hint: '強くたたくと、音の大きさと高さのどちらが変わったかな。',
    }),
    problems: [
      figureChoice({
        id: 'sound-4-p1', concept: 'so-waveform',
        prompt: 'ア〜エは、4 つの音の波形です（横はばはどれも同じ時間）。いちばん高い音はどれ？',
        figure: WAVES_1,
        answer: 'r4',
        explanation: '同じ時間の中の波の数がいちばん多いのはエです。波の数が多いほど振動数が多く、高い音です。山の高さは音の大きさを表すので、高さの比べ方とは別です。',
        hint: '山の高さではなく、波の数を数えて比べよう。',
      }),
      fill({
        id: 'sound-4-t1', concept: 'so-waveform', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '音をマイクでひろい、オシロスコープなどで表した波の形を[b1]という。[b1]の山の高さは[b2]を表す。',
        blanks: [
          word('b1', ['振動数', '波形', '振幅'], '波形'),
          word('b2', ['振動数', '波形', '振幅'], '振幅'),
        ],
        explanation: '音の振動のようすを表した波の形が**波形**です。山の高さは**振幅**を表し、山が高いほど大きい音です。',
        hint: '「波」の「形」と書く言葉だよ。',
      }),
      figureChoice({
        id: 'sound-4-p2', concept: 'so-waveform',
        prompt: 'ア〜エは、4 つの音の波形です（横はばはどれも同じ時間）。アと同じ高さで、アより大きい音はどれ？',
        figure: WAVES_1,
        answer: 'r2',
        explanation: '同じ高さなので、波の数がアと同じものを選びます。そのうち山がアより高いのはイです。高さは波の数、大きさは山の高さで比べます。',
        hint: 'まず波の数がアと同じものをさがし、次に山の高さを比べよう。',
      }),
      fill({
        id: 'sound-4-p3', concept: 'so-waveform',
        prompt: '空らんに入る数を入れよう。',
        figure: timedWave(2, '0.01 秒'),
        text: '図は、ある音の 0.01 秒間の波形である。この音の振動数は[b1]である。',
        blanks: [number('b1', 200, 0, 'Hz')],
        explanation: '0.01 秒間に 2 回振動しています。1 秒は 0.01 秒の 100 倍なので、1 秒間では 2 × 100 ＝ 200 回、振動数は 200 Hz です。',
        hint: 'まず波の数を数え、1 秒間なら何回になるか考えよう。',
      }),
      choice({
        id: 'sound-4-p4', concept: 'so-waveform',
        prompt: '図の上が音 A、下が音 B の波形です（横はばは同じ時間）。B は A と比べて、どんな音？',
        figure: scene([
          { type: 'line', points: [[40, 64], [300, 64]], color: 'gray', width: 1 },
          wave(50, 64, 250, 34, 2),
          { type: 'line', points: [[40, 174], [300, 174]], color: 'gray', width: 1 },
          wave(50, 174, 250, 16, 4),
          { type: 'text', x: 10, y: 70, text: 'A', size: 16, bold: true },
          { type: 'text', x: 10, y: 180, text: 'B', size: 16, bold: true },
        ]),
        options: ['低くて大きい音', '高くて大きい音', '低くて小さい音', '高くて小さい音'],
        answer: 'd',
        explanation: 'B は A より波の数が多いので高い音、山が低いので小さい音です。高さと大きさは、それぞれ別に読み取ろう。',
        hint: '波の数で高さを、山の高さで大きさを比べよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'sound-4-r1', concept: 'so-waveform',
        prompt: 'ア〜エは、4 つの音の波形です（横はばはどれも同じ時間）。いちばん大きい音はどれ？',
        figure: WAVES_2,
        answer: 'r2',
        explanation: '山の高さ（振幅）がいちばん大きいのはイです。振幅が大きいほど大きい音です。波の数は音の高さを表すので、ここでは関係ありません。',
        hint: '波の数ではなく、山の高さを比べよう。',
      }),
      figureChoice({
        id: 'sound-4-r2', concept: 'so-waveform',
        prompt: 'ア〜エは、4 つの音の波形です（横はばはどれも同じ時間）。いちばん低い音はどれ？',
        figure: WAVES_2,
        answer: 'r4',
        explanation: '同じ時間の中の波の数がいちばん少ないのはエです。波の数が少ないほど振動数が少なく、低い音です。',
        hint: '波の数がいちばん少ないものをさがそう。',
      }),
      fill({
        id: 'sound-4-r3', concept: 'so-waveform',
        prompt: '空らんに入る数を入れよう。',
        text: '波形を調べると、1 回の振動に 0.004 秒かかっていた。この音の振動数は[b1]である。',
        blanks: [number('b1', 250, 0, 'Hz')],
        explanation: '1 秒間の振動の回数は 1 ÷ 0.004 ＝ 250 回なので、振動数は 250 Hz です。1 回にかかる時間が短いほど、振動数は多くなります。',
        hint: '1 秒の中に、0.004 秒が何回入るか考えよう。',
      }),
      choice({
        id: 'sound-4-t2', concept: 'so-waveform', term: true,
        prompt: '次の説明に合う言葉はどれ？「音の振動のようすを、オシロスコープなどで波の形に表したもの」',
        options: ['音源', '振幅', '波形'],
        answer: 'c',
        explanation: '音の振動のようすを表した波の形を**波形**といいます。波形から、音の大きさと高さを読み取れます。',
        hint: '「波」の「形」と書く言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 3: ミニプリント（先生のミニプリントの問題を書き直したもの。共通指示 .ai-tasks/20261106-130000_ミニプリント反映_共通.md）
  // ================================================================

  // 2 つのおんさ A（左・鳴らす）と B（右）。板を置く場所の選択肢（region）は呼ぶ側で足す
  function twoForks() {
    return [
      ...fork(70, 50, true),
      ...fork(250, 50, false),
      { type: 'line', points: [[112, 80], [120, 115], [112, 150]], color: 'blue', width: 2 },
      { type: 'line', points: [[140, 74], [150, 115], [140, 156]], color: 'blue', width: 2 },
      { type: 'line', points: [[168, 80], [178, 115], [168, 150]], color: 'blue', width: 2 },
      { type: 'text', x: 70, y: 226, text: 'A（鳴らす）', anchor: 'middle', size: 14 },
      { type: 'text', x: 250, y: 226, text: 'B', anchor: 'middle', size: 14 },
    ];
  }

  // 波形 A（くらべるもと。選べない）と B〜D（選ぶ場所つき）。横はばはどれも同じ時間
  const WAVES_MP = scene([
    { type: 'line', points: [[60, 32], [310, 32]], color: 'gray', width: 1 },
    wave(60, 32, 250, 12, 2),
    { type: 'text', x: 20, y: 38, text: 'A', size: 16, bold: true },
    ...waveRow('r1', 'B', 90, 22, 2),
    ...waveRow('r2', 'C', 148, 12, 4),
    ...waveRow('r3', 'D', 206, 6, 1),
  ]);

  // 花火と、はなれた所にいる 3 人（ア 340 m・イ 680 m・ウ 1020 m）
  const FIREWORKS_3 = scene([
    { type: 'line', points: [[10, 200], [310, 200]], color: 'line', width: 2 },
    { type: 'circle', x: 30, y: 50, r: 20, fill: 'yellow', stroke: 'orange' },
    { type: 'line', points: [[30, 70], [30, 200]], color: 'gray', width: 2, dashed: true },
    ...[[110, '340 m'], [200, '680 m'], [290, '1020 m']].flatMap(([x, d]) => [
      { type: 'circle', x, y: 160, r: 8 },
      { type: 'polygon', points: [[x - 8, 170], [x + 8, 170], [x + 11, 198], [x - 11, 198]], fill: 'green' },
      { type: 'text', x, y: 222, text: d, size: 13, anchor: 'middle' },
    ]),
    { type: 'text', x: 60, y: 40, text: '花火からの距離', size: 13 },
    { type: 'region', id: 'r1', x: 110, y: 118, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 200, y: 118, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 290, y: 118, r: 22, label: 'ウ' },
  ]);

  // ---- ステージ sound-mp1: プリント 1（おんさ・音の伝わり方・真空にする） ----
  const soundMp1 = {
    id: 'sound-mp1', areaId: 'sound-miniprint', title: 'プリント 1: おんさと音の伝わり方', minutes: 5, concepts: ['so-vibration', 'so-medium'],
    lessons: [
      {
        id: 'sound-mp1-c1',
        text: '**おんさ**は、たたくと決まった高さの音を出す器具です。鳴っているおんさにふれると、細かくふるえて（**振動**して）いるのが分かります。うでを強くにぎると振動が止まり、音も止まります。',
        figure: scene([
          ...fork(100, 40, true),
          { type: 'text', x: 100, y: 214, text: 'おんさ', anchor: 'middle', size: 14 },
          { type: 'text', x: 170, y: 70, text: '点線: うでが振動', size: 14 },
          { type: 'text', x: 170, y: 110, text: 'にぎると', size: 14 },
          { type: 'text', x: 170, y: 132, text: '振動も音も止まる', size: 14 },
        ]),
      },
      {
        id: 'sound-mp1-c2',
        text: '同じ高さの音を出す 2 つのおんさを並べ、一方を鳴らすと、もう一方も鳴りだします。これを**共鳴**といいます。振動が空気を伝わって届くからで、間に板を置くと、もう一方はほとんど鳴りません。',
        figure: scene([
          ...twoForks(),
          { type: 'text', x: 145, y: 30, text: '空気の振動', anchor: 'middle', size: 14 },
        ]),
      },
      {
        id: 'sound-mp1-c3',
        text: 'ブザーを入れた容器から空気をぬいていくと、ブザーの音はしだいに小さくなります。音を伝えていたのは空気です。物質がない**真空**では、音は伝わりません。水の中では音は伝わります。',
        // 容器（左）の中のブザーと、管でつないだポンプ（右）
        figure: scene([
          { type: 'rect', x: 20, y: 90, width: 130, height: 120, fill: 'glass', rx: 10 },
          { type: 'circle', x: 70, y: 170, r: 16, fill: 'yellow' },
          { type: 'text', x: 70, y: 232, text: 'ブザー', anchor: 'middle', size: 14 },
          { type: 'line', points: [[150, 150], [220, 150]], width: 4, color: 'line' },
          { type: 'rect', x: 220, y: 110, width: 70, height: 90, fill: 'gray' },
          { type: 'text', x: 255, y: 232, text: 'ポンプ', anchor: 'middle', size: 14 },
          { type: 'arrow', x1: 160, y1: 132, x2: 210, y2: 132, color: 'blue', width: 2 },
          { type: 'text', x: 160, y: 40, text: '空気をぬくと音が小さくなる', anchor: 'middle', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'sound-mp1-w1', concept: 'so-vibration',
      prompt: '予想しよう。たたいて鳴らしたおんさのうでの先を、水の中に入れると、どうなると思う？',
      options: ['水しぶきが上がる', '水がすぐにこおる', '何も起こらない'],
      answer: 'a',
      explanation: '鳴っているおんさのうでは細かく振動しているので、水に入れると水しぶきが上がります。目で見えにくい振動も、水を使うと確かめられます。',
      hint: '鳴っているおんさにふれると、指に何を感じるかな。',
    }),
    problems: [
      choice({
        id: 'sound-mp1-p1', concept: 'so-vibration',
        prompt: '鳴っているおんさの金属のうでを、手で強くにぎりました。音はどうなる？',
        options: ['音が止まる', '音が大きくなる', '音が高くなる'],
        answer: 'a',
        explanation: 'にぎるとうでの振動が止まるので、音も止まります。音が出ているあいだ、おんさはずっと振動しています。',
        hint: 'にぎると、うでのふるえはどうなるかな。',
      }),
      fill({
        id: 'sound-mp1-t1', concept: 'so-vibration', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'たたくと決まった高さの音を出す、U の字の形の金属の器具を[b1]という。鳴っている[b1]にふれると、細かく[b2]していることが分かる。',
        blanks: [
          word('b1', ['おんさ', 'モノコード', 'ブザー'], 'おんさ'),
          word('b2', ['振動', '反射', '蒸発'], '振動'),
        ],
        explanation: 'この器具は**おんさ**です。鳴っているおんさにふれると、細かく**振動**していることが分かります。音を出すものは振動しています。',
        hint: '音楽の時間に、音の高さを合わせるのに使う器具だよ。',
      }),
      choice({
        id: 'sound-mp1-p2', concept: 'so-vibration',
        prompt: '同じ高さの音を出す 2 つのおんさ A・B を並べ、A だけを鳴らすと、ふれていない B も鳴りだしました。この現象を何という？',
        options: ['反射', '共鳴', '屈折'],
        answer: 'b',
        explanation: '一方のおんさの振動が伝わって、もう一方も鳴りだす現象を共鳴といいます。2 つのおんさが同じ高さの音を出すときに起こります。',
        hint: '「共に鳴る」と書く言葉だよ。',
      }),
      choice({
        id: 'sound-mp1-p3', concept: 'so-vibration',
        prompt: 'A を鳴らすと、はなれた B も鳴りだしました。B が鳴りだしたのはなぜ？',
        options: ['A から出た光が B に当たったから', 'A の振動がまわりの空気を振動させ、その振動が B に伝わったから', '机がかたむいて B がゆれたから'],
        answer: 'b',
        explanation: 'A の振動がまわりの空気を次々に振動させ、その振動が B に届いて B も振動しはじめました。音は振動として空気を伝わります。',
        hint: 'A と B のあいだには、何があるかな。',
      }),
      figureChoice({
        id: 'sound-mp1-p4', concept: 'so-vibration',
        prompt: 'A を鳴らしても B が鳴りにくくなるようにしたい。厚い板を立てる場所として最もよいのはア〜ウのどこ？（ア: A と B のあいだ、イ: A の左、ウ: B の右）',
        figure: scene([
          ...twoForks(),
          { type: 'region', id: 'r1', x: 160, y: 190, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 24, y: 110, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 296, y: 110, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: 'A の振動は、A と B のあいだの空気を伝わって B に届きます。あいだに板を立てると、空気の振動がさえぎられて B はほとんど鳴りません。A の左や B の右に置いても、さえぎることはできません。',
        hint: 'A の振動は、どこを通って B に届くかな。',
      }),
      choice({
        id: 'sound-mp1-p5', concept: 'so-medium',
        prompt: '容器の中でブザーを鳴らしながら、ポンプで中の空気をぬいていきました。ブザーの音はどうなる？',
        options: ['しだいに大きくなる', 'しだいに小さくなる', '変わらない'],
        answer: 'b',
        explanation: 'ブザーは振動し続けていますが、音を伝える空気が少なくなるので、聞こえる音はしだいに小さくなります。',
        hint: 'ブザーの振動を耳まで運んでいるものが減っていくよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'sound-mp1-r1', concept: 'so-vibration',
        prompt: 'A と B のおんさのあいだに厚い板を立ててから、A を鳴らしました。B はどうなる？',
        options: ['板がないときより大きく鳴る', 'ほとんど鳴らない', '板がないときと同じように鳴る'],
        answer: 'b',
        explanation: '板が A からの空気の振動をさえぎるので、B にはほとんど届かず、B はほとんど鳴りません。',
        hint: 'A の振動は空気を伝わって B に届いていたね。',
      }),
      choice({
        id: 'sound-mp1-r2', concept: 'so-medium',
        prompt: '容器の空気をぬくとブザーの音が小さくなったことから、ふだんブザーの音を耳まで伝えているものは何だと分かる？',
        options: ['光', '空気', '電気'],
        answer: 'b',
        explanation: '空気が少なくなると音が小さくなったので、音を伝えていたのは空気だと分かります。音は物質の振動で伝わります。',
        hint: '容器の中から何をぬいていったかな。',
      }),
      choice({
        id: 'sound-mp1-r3', concept: 'so-medium',
        prompt: 'プールにもぐって、水の中で鳴らしたブザーの音を聞きました。音は聞こえる？',
        options: ['聞こえる', '聞こえない'],
        answer: 'a',
        explanation: '水などの液体も振動を伝えるので、水の中でも音は聞こえます。音が伝わらないのは、物質のない真空です。',
        hint: '音を伝えるのは、気体だけだったかな。',
      }),
      choice({
        id: 'sound-mp1-r4', concept: 'so-medium',
        prompt: '空気をぬく容器の中に、軽い紙のふき流しをつるしておきました。ポンプで空気をぬき始めると、ふき流しが空気の流れでポンプの方へなびきました。このことから分かることはどれ？',
        options: ['容器の中の空気がぬけていっていること', 'ブザーの振動が止まったこと', '容器の中が明るくなったこと'],
        answer: 'a',
        explanation: 'ふき流しは、空気が動いているかどうかを目で見るためのものです。なびいたのは、容器の中の空気がポンプへ流れ出ているからです。空気が少なくなるにつれて、ブザーの音も小さくなります。',
        hint: 'ふき流しを動かしたのは何の流れかな。',
      }),
      choice({
        id: 'sound-mp1-t2', concept: 'so-medium', term: true,
        prompt: '次の説明に合う言葉はどれ？「空気などの物質がまったくない状態。音が伝わらない」',
        options: ['共鳴', '真空', 'おんさ'],
        answer: 'b',
        explanation: '物質がまったくない状態を**真空**といいます。音は物質の振動で伝わるので、真空では伝わりません。',
        hint: '容器の空気を全部ぬいたときの状態だよ。',
      }),
    ],
  };

  // ---- ステージ sound-mp2: プリント 2（音の速さ・音の速さ 2） ----
  const soundMp2 = {
    id: 'sound-mp2', areaId: 'sound-miniprint', title: 'プリント 2: 音の速さの計算', minutes: 5, concepts: ['so-speed'],
    lessons: [
      {
        id: 'sound-mp2-c1',
        text: '花火は、光が見えてから少しおくれて音が聞こえます。光の速さは秒速約 30 万 km、空気中の**音の速さ**は秒速約 340 m で、音のほうがずっとおそいからです。',
        figure: scene(fireworks('光が先、音があと').concat([
          { type: 'text', x: 110, y: 100, text: '光: 秒速 約30万km', size: 13 },
          { type: 'text', x: 110, y: 130, text: '音: 秒速 約340m', size: 13 },
        ])),
      },
      {
        id: 'sound-mp2-c2',
        text: '**音の速さ**〔m/s〕は、音が伝わった距離〔m〕÷ かかった時間〔s〕で求めます。600 m はなれた所の音が 2.0 秒後に聞こえたら、600 ÷ 2.0 ＝ 300 m/s です。距離は 速さ × 時間 で求めます。',
        figure: scene([
          { type: 'text', x: 160, y: 60, text: '速さ ＝ 距離 ÷ 時間', anchor: 'middle', size: 18, bold: true },
          { type: 'text', x: 160, y: 110, text: '距離 ＝ 速さ × 時間', anchor: 'middle', size: 18, bold: true },
          { type: 'line', points: [[40, 170], [280, 170]], width: 2 },
          { type: 'circle', x: 40, y: 170, r: 6, fill: 'ink' },
          { type: 'circle', x: 280, y: 170, r: 6, fill: 'ink' },
          { type: 'text', x: 160, y: 160, text: '600 m', anchor: 'middle', size: 14 },
          { type: 'text', x: 160, y: 200, text: '2.0 秒 → 600 ÷ 2.0 ＝ 300 m/s', anchor: 'middle', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'sound-mp2-w1', concept: 'so-speed',
      prompt: '予想しよう。打ち上げ花火が光ってから 2.0 秒後に、ドーンという音が聞こえた。音がおくれて聞こえたのはなぜだと思う？',
      options: ['音は光よりずっとおそく伝わるから', '音は光よりずっと速く伝わるから', '音は花火が消えてから出るから'],
      answer: 'a',
      explanation: '音と光は同時に出ますが、音は光よりずっとおそく伝わるので、光が見えたあとに音が届きます。',
      hint: 'かみなりも、光ってから音が聞こえるね。',
    }),
    problems: [
      fill({
        id: 'sound-mp2-p1', concept: 'so-speed',
        prompt: '空らんに入るものを選ぼう。',
        text: '空気中を音が伝わる速さはおよそ[b1]、光が伝わる速さはおよそ[b2]である。',
        blanks: [
          word('b1', ['秒速 340 m', '秒速 340 km', '秒速 30 万 m', '秒速 30 万 km'], '秒速 340 m'),
          word('b2', ['秒速 340 m', '秒速 340 km', '秒速 30 万 m', '秒速 30 万 km'], '秒速 30 万 km'),
        ],
        explanation: '音はおよそ秒速 340 m、光はおよそ秒速 30 万 km です。光は 1 秒で地球を 7 周半するほど速く、音とは比べものになりません。',
        hint: '音は 1 秒で 340 m ほど。光はけたちがいに速いよ。',
      }),
      fill({
        id: 'sound-mp2-t1', concept: 'so-speed', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '音が 1 秒間に伝わる距離を[b1]という。空気中では約 340 m/s で、[b1]は 距離 ÷ [b2] で求める。',
        blanks: [
          word('b1', ['音の速さ', '振動数', '振幅'], '音の速さ'),
          word('b2', ['時間', '質量', '体積'], '時間'),
        ],
        explanation: '**音の速さ**は、音が伝わった距離をかかった時間でわって求めます。単位は m/s（メートル毎秒）です。',
        hint: '速さは「1 秒あたりに進む距離」だったね。',
      }),
      figureChoice({
        id: 'sound-mp2-p2', concept: 'so-speed',
        prompt: '花火が光ってから 2.0 秒後に音が聞こえたのは、ア〜ウのどの人？ 音の速さを 340 m/s とする。',
        figure: FIREWORKS_3,
        answer: 'r2',
        explanation: '音は 2.0 秒で 340 × 2.0 ＝ 680 m 進みます。花火から 680 m の所にいるイの人です。アは 1.0 秒後、ウは 3.0 秒後に聞こえます。',
        hint: '音が 2.0 秒で進む距離を先に計算しよう。',
      }),
      fill({
        id: 'sound-mp2-p3', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。',
        figure: scene(fireworks('光ってから 2.0 秒後に音')),
        text: 'A さんは、花火が光ってから 2.0 秒後に音を聞いた。音の速さを 340 m/s とすると、花火から A さんまでの距離は[b1]である。',
        blanks: [number('b1', 680, 0, 'm')],
        explanation: '距離＝音の速さ×時間なので、340 × 2.0 ＝ 680 m です。光はほとんど一瞬で届くので、音が届くまでの時間だけで計算できます。',
        hint: '音は 1 秒で 340 m 進むよ。2.0 秒では？',
      }),
      fill({
        id: 'sound-mp2-p4', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '600 m はなれた所で鳴らした音が、2.0 秒後に聞こえた。このときの音の速さは[b1]である。',
        blanks: [number('b1', 300, 0, 'm/s')],
        explanation: '速さ＝距離÷時間なので、600 ÷ 2.0 ＝ 300 m/s です。',
        hint: '600 m を 2.0 秒でわろう。',
      }),
      fill({
        id: 'sound-mp2-p5', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '1300 m はなれた所で鳴らした音が、4.0 秒後に聞こえた。このときの音の速さは[b1]である。',
        blanks: [number('b1', 325, 0, 'm/s')],
        explanation: '速さ＝距離÷時間なので、1300 ÷ 4.0 ＝ 325 m/s です。',
        hint: '1300 m を 4.0 秒でわろう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'sound-mp2-r1', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。（小数第 1 位を四捨五入して、整数で答える）',
        text: '2000 m はなれた所で鳴らした音が、6.2 秒後に聞こえた。このときの音の速さは[b1]である。',
        blanks: [number('b1', 323, 0, 'm/s')],
        explanation: '2000 ÷ 6.2 ＝ 322.58… なので、小数第 1 位を四捨五入して 323 m/s です。わり切れないときは、指示された位で四捨五入します。',
        hint: '2000 ÷ 6.2 を計算して、小数第 1 位を見よう。',
      }),
      choice({
        id: 'sound-mp2-r2', concept: 'so-speed',
        prompt: '音が伝わった距離と、聞こえるまでの時間から、音の速さを求める式はどれ？',
        options: ['距離 × 時間', '距離 ÷ 時間', '時間 ÷ 距離'],
        answer: 'b',
        explanation: '速さは 1 秒あたりに進む距離なので、距離 ÷ 時間 で求めます。距離を求めるときは 速さ × 時間 です。',
        hint: '単位 m/s は「m を s でわる」という意味だよ。',
      }),
      fill({
        id: 'sound-mp2-r3', concept: 'so-speed',
        prompt: '空らんに入る数を入れよう。',
        text: 'いなずまが光ってから 4.0 秒後に、かみなりの音が聞こえた。音の速さを 340 m/s とすると、いなずままでの距離は[b1]である。',
        blanks: [number('b1', 1360, 0, 'm')],
        explanation: '距離＝音の速さ×時間なので、340 × 4.0 ＝ 1360 m です。',
        hint: '音の速さに、聞こえるまでの時間をかけよう。',
      }),
      choice({
        id: 'sound-mp2-t2', concept: 'so-speed', term: true,
        prompt: '次の説明に合う言葉はどれ？「音が 1 秒間に伝わる距離。空気中では約 340 m/s」',
        options: ['振動数', '音の速さ', '振幅'],
        answer: 'b',
        explanation: '**音の速さ**です。距離 ÷ 時間 で求めます。振動数は 1 秒間に振動する回数で、別のものです。',
        hint: '単位が m/s になるものだよ。',
      }),
    ],
  };

  // ---- ステージ sound-mp3: プリント 3（音の大小と高低・モノコード 2・モノコード） ----
  const soundMp3 = {
    id: 'sound-mp3', areaId: 'sound-miniprint', title: 'プリント 3: 波形とモノコード', minutes: 6, concepts: ['so-waveform', 'so-amplitude', 'so-frequency'],
    lessons: [
      {
        id: 'sound-mp3-c1',
        text: '音の波形で、中心から山のいちばん高い所までの高さ（図の X）を**振幅**といいます。振幅が大きいほど大きい音です。1 秒間に振動する回数を**振動数**といい、多いほど高い音です。',
        figure: scene([
          { type: 'line', points: [[30, 120], [300, 120]], color: 'gray', width: 1 },
          wave(40, 120, 250, 60, 2),
          { type: 'arrow', x1: 72, y1: 120, x2: 72, y2: 62, color: 'blue', width: 2 },
          { type: 'text', x: 96, y: 46, text: 'X（振幅）', size: 14 },
          { type: 'text', x: 160, y: 222, text: '同じ時間の波の数 → 振動数', anchor: 'middle', size: 14 },
        ]),
      },
      {
        id: 'sound-mp3-c2',
        text: 'モノコードの弦を強くはじくと**振幅**が大きくなり、大きい音が出ます。はじく部分を短くする、弦を強く張る、細い弦にすると**振動数**が多くなり、高い音が出ます。振動数の単位はヘルツ（Hz）です。',
        figure: scene([
          ...monochord(70),
          bridge(220, 70),
          { type: 'text', x: 110, y: 58, text: 'はじく部分', size: 13 },
          { type: 'text', x: 296, y: 160, text: 'おもり', anchor: 'end', size: 13 },
          { type: 'text', x: 20, y: 190, text: '強くはじく → 大きい音', size: 14 },
          { type: 'text', x: 20, y: 214, text: '短く・強く張る・細く → 高い音', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'sound-mp3-w1', concept: 'so-frequency',
      prompt: '予想しよう。ギターには 6 本の弦があり、それぞれちがう高さの音が出ます。弦は材質のほかに、主に何がちがうと思う？',
      options: ['弦の色', '弦の太さ', '弦のにおい'],
      answer: 'b',
      explanation: 'ギターの弦は太さがちがいます。細い弦ほど振動数が多くなり、高い音が出ます。張りの強さを変えて、音の高さを合わせることもします。',
      hint: '高い音の弦と低い音の弦を見くらべると、何がちがうかな。',
    }),
    problems: [
      figureChoice({
        id: 'sound-mp3-p1', concept: 'so-waveform',
        prompt: '図の A〜D は、いろいろな音の波形です（横はばは同じ時間）。A より大きい音はどれ？ B〜D から選ぼう。',
        figure: WAVES_MP,
        answer: 'r1',
        explanation: '大きい音は、振幅（山の高さ）が大きい音です。A より山が高いのは B です。C は A と山の高さが同じで、波の数が多い（高い音）です。',
        hint: '波の数ではなく、山の高さを A とくらべよう。',
      }),
      fill({
        id: 'sound-mp3-t1', concept: 'so-waveform', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '波形の中心から山の高さまでを[b1]といい、音の大きさを表す。音源が 1 秒間に振動する回数を[b2]といい、音の高さを表す。',
        blanks: [
          word('b1', ['振幅', '振動数', '波形'], '振幅'),
          word('b2', ['振幅', '振動数', '波形'], '振動数'),
        ],
        explanation: '山の高さが**振幅**（音の大きさ）、1 秒間の振動の回数が**振動数**（音の高さ）です。',
        hint: '「振れるはば」と「振動する回数」だよ。',
      }),
      figureChoice({
        id: 'sound-mp3-p2', concept: 'so-waveform',
        prompt: '図の A〜D の波形で、A より高い音はどれ？ B〜D から選ぼう。',
        figure: WAVES_MP,
        answer: 'r2',
        explanation: '高い音は、同じ時間の中の波の数（振動数）が多い音です。A は 2 回、C は 4 回振動しているので、C が A より高い音です。B は A と同じ高さで、大きい音です。',
        hint: '同じ時間の中の、波の数を数えよう。',
      }),
      choice({
        id: 'sound-mp3-p3', concept: 'so-amplitude',
        prompt: 'モノコードの弦を、前より強くはじきました。音はどうなる？',
        options: ['大きくなる', '小さくなる', '高くなる', '低くなる'],
        answer: 'a',
        explanation: '強くはじくと振幅が大きくなり、音が大きくなります。はじく強さでは、音の高さは変わりません。',
        hint: '強くはじくと、弦の振れるはばはどうなるかな。',
      }),
      choice({
        id: 'sound-mp3-p4', concept: 'so-frequency',
        prompt: 'モノコードのことじ（木片）を右へずらして、はじく部分の弦を長くしました。同じ強さではじくと、音はどうなる？',
        options: ['高くなる', '低くなる', '大きくなる', '変わらない'],
        answer: 'b',
        explanation: '弦の振動する部分が長いほど振動数が少なくなり、低い音になります。短くすると高い音になります。',
        hint: '弦が短いほど高い音が出たね。長くすると？',
      }),
      choice({
        id: 'sound-mp3-p5', concept: 'so-frequency',
        prompt: 'モノコードのおもりの数を増やして、弦の張りを強くしました。同じ強さではじくと、音はどうなる？',
        options: ['高くなる', '低くなる', '小さくなる', '変わらない'],
        answer: 'a',
        explanation: 'おもりを増やすと弦が強く張られ、振動数が多くなって高い音になります。',
        hint: '弦を強く張ると、音の高さはどうなったかな。',
      }),
    ],
    retryPool: [
      fill({
        id: 'sound-mp3-r1', concept: 'so-frequency',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '音の高さは、弦の振動数で決まる。振動数が多いと、音は[b1]なる。振動数の単位は[b2]である。',
        blanks: [
          word('b1', ['高く', '低く', '大きく'], '高く'),
          word('b2', ['ヘルツ', 'メートル', 'ニュートン'], 'ヘルツ'),
        ],
        explanation: '振動数が多いほど高い音です。振動数の単位はヘルツ（記号 Hz）で、1 秒間に 1 回の振動が 1 Hz です。',
        hint: '1 秒間にたくさん振動すると、キーンという音になるね。',
      }),
      choice({
        id: 'sound-mp3-r2', concept: 'so-amplitude',
        prompt: 'モノコードで、音の高さは変えずに大きな音を出すには、どうすればよい？',
        options: ['弦を強くはじく', 'ことじを動かして弦を短くする', 'おもりを増やす'],
        answer: 'a',
        explanation: '強くはじくと振幅だけが大きくなり、高さは同じまま大きい音になります。弦を短くしたり、おもりを増やしたりすると高い音になります。',
        hint: '振幅だけを大きくする方法を考えよう。',
      }),
      figureChoice({
        id: 'sound-mp3-r3', concept: 'so-amplitude',
        prompt: '図の A〜D の波形（横はばは同じ時間）で、いちばん小さい音はどれ？ B〜D から選ぼう。',
        figure: WAVES_MP,
        answer: 'r3',
        explanation: '振幅（山の高さ）がいちばん小さいのは D です。D は波の数も少ないので、小さくて低い音です。',
        hint: '山の高さがいちばん低い波形をさがそう。',
      }),
      fill({
        id: 'sound-mp3-r4', concept: 'so-waveform',
        prompt: '空らんに入る数を入れよう。',
        figure: timedWave(4, '0.01 秒'),
        text: '図は、ある音の 0.01 秒間の波形である。この音は 1 秒間に[b1]振動している。',
        blanks: [number('b1', 400, 0, '回')],
        explanation: '0.01 秒間に 4 回振動しています。1 秒は 0.01 秒の 100 倍なので、4 × 100 ＝ 400 回です。振動数は 400 Hz です。',
        hint: 'まず波の数を数え、1 秒間なら何回か考えよう。',
      }),
      choice({
        id: 'sound-mp3-t2', concept: 'so-frequency', term: true,
        prompt: '次の説明に合う言葉はどれ？「音源が 1 秒間に振動する回数。単位はヘルツ」',
        options: ['振幅', '振動数', '波形'],
        answer: 'b',
        explanation: '1 秒間に振動する回数を**振動数**といいます。振動数が多いほど高い音です。',
        hint: '「振動する回数」だよ。',
      }),
    ],
  };


  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================
  const concepts = [
    {
      id: 'so-vibration', title: '音源と振動', basic: null, lessonStageId: 'sound-1',
      checkPool: [
        choice({
          id: 'so-vibration-k1', concept: 'so-vibration',
          prompt: '音が出ているとき、音源はどうなっている？',
          options: ['止まっている', '振動している', '光っている'],
          answer: 'b',
          explanation: '音が出ているとき、音源は振動しています。振動を止めると、音も止まります。',
          hint: '鳴っているおんさにふれたときの感じを思い出そう。',
        }),
        fill({
          id: 'so-vibration-k2', concept: 'so-vibration',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '鳴っているおんさを水にふれさせると、水しぶきが上がる。これは、おんさが[b1]しているからだ。',
          blanks: [word('b1', ['反射', '振動', '蒸発'], '振動')],
          explanation: 'おんさのうでが細かく振動しているので、水しぶきが上がります。音を出しているものは振動しています。',
          hint: '音源に共通することは何だったかな。',
        }),
        choice({
          id: 'so-vibration-k3', concept: 'so-vibration',
          prompt: '鳴っているおんさのうでを、手で強くにぎると、音はどうなる？',
          options: ['音が止まる', '音が高くなる', '音が大きくなる'],
          answer: 'a',
          explanation: 'にぎるとうでの振動が止まるので、音も止まります。音は音源の振動から生まれます。',
          hint: 'にぎると、うでの振動はどうなるかな。',
        }),
      ],
    },
    {
      id: 'so-medium', title: '音を伝えるもの', basic: 'so-vibration', lessonStageId: 'sound-2',
      checkPool: [
        choice({
          id: 'so-medium-k1', concept: 'so-medium',
          prompt: '次のうち、音を伝えないものはどれ？',
          options: ['水', '鉄', '空気', '真空'],
          answer: 'd',
          explanation: '水（液体）、鉄（固体）、空気（気体）は、どれも音を伝えます。物質のない真空では、音は伝わりません。',
          hint: '振動する物質がないのはどれか考えよう。',
        }),
        fill({
          id: 'so-medium-k2', concept: 'so-medium',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '長い鉄の棒の一方のはしをたたくと、もう一方のはしに耳を当てた人に音が聞こえる。これは、鉄のような[b1]も音を伝えるからだ。',
          blanks: [word('b1', ['真空', '固体', '光'], '固体')],
          explanation: '鉄のような固体も、振動を伝えるので音を伝えます。音は気体・液体・固体の中を伝わります。',
          hint: '鉄は、気体・液体・固体のどれかな。',
        }),
        choice({
          id: 'so-medium-k3', concept: 'so-medium',
          prompt: '容器の中でブザーを鳴らしながら、中の空気をぬいていくと、聞こえる音はどうなる？',
          options: ['しだいに大きくなる', 'しだいに高くなる', 'しだいに小さくなる'],
          answer: 'c',
          explanation: '音を伝える空気が少なくなるので、音はしだいに小さくなります。空気が音を伝えていることが分かります。',
          hint: '音を耳まで運んでいるものが減ると、どうなるかな。',
        }),
      ],
    },
    {
      id: 'so-speed', title: '音の速さと計算', basic: 'so-medium', lessonStageId: 'sound-2',
      checkPool: [
        fill({
          id: 'so-speed-k1', concept: 'so-speed',
          prompt: '空らんに入る数を入れよう。',
          text: 'いなずまが光ってから 1.5 秒後にかみなりの音が聞こえた。音の速さを 340 m/s とすると、いなずままでの距離は[b1]である。',
          blanks: [number('b1', 510, 1, 'm')],
          explanation: '距離＝音の速さ×時間なので、340 × 1.5 ＝ 510 m です。',
          hint: '音の速さに、聞こえるまでの時間をかけよう。',
        }),
        choice({
          id: 'so-speed-k2', concept: 'so-speed',
          prompt: '花火が光ってから音が聞こえるまでの時間が長いほど、花火までの距離はどうなっている？',
          options: ['近い', '遠い', '時間と距離は関係ない'],
          answer: 'b',
          explanation: '音は 1 秒間に約 340 m 進むので、時間が長いほど遠くから届いています。距離＝速さ×時間です。',
          hint: '音が進む時間が長いと、進む距離はどうなるかな。',
        }),
        fill({
          id: 'so-speed-k3', concept: 'so-speed',
          prompt: '空らんに入る数を入れよう。',
          text: '1700 m はなれたところの音が、5.0 秒後に聞こえた。このときの音の速さは[b1]である。',
          blanks: [number('b1', 340, 1, 'm/s')],
          explanation: '速さ＝距離÷時間なので、1700 ÷ 5.0 ＝ 340 m/s です。',
          hint: '1 秒あたりに進んだ距離を求めよう。',
        }),
      ],
    },
    {
      id: 'so-amplitude', title: '振幅と音の大きさ', basic: 'so-vibration', lessonStageId: 'sound-3',
      checkPool: [
        choice({
          id: 'so-amplitude-k1', concept: 'so-amplitude',
          prompt: '音の大きさを決めているのはどれ？',
          options: ['振幅', '振動数', '音源の色'],
          answer: 'a',
          explanation: '音の大きさは振幅で決まり、振幅が大きいほど大きい音です。振動数は音の高さを決めます。',
          hint: '強くはじくと大きくなるのは何だったかな。',
        }),
        fill({
          id: 'so-amplitude-k2', concept: 'so-amplitude',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '弦を強くはじくと、振幅が[b1]なり、音は[b2]なる。',
          blanks: [
            word('b1', ['大きく', '小さく', '高く'], '大きく'),
            word('b2', ['高く', '大きく', '小さく'], '大きく'),
          ],
          explanation: '強くはじくと振幅が大きくなり、大きい音が出ます。音の高さは変わりません。',
          hint: '強くはじいたとき、弦の振れるはばはどうなったかな。',
        }),
        choice({
          id: 'so-amplitude-k3', concept: 'so-amplitude',
          prompt: '同じ高さのまま、大きい音を出すにはどうすればよい？',
          options: ['弦の振動する部分を短くする', '同じ弦を強くはじく', '弦を細いものにかえる'],
          answer: 'b',
          explanation: '強くはじくと振幅が大きくなり、高さは同じまま大きい音になります。弦を短くしたり細くしたりすると、音が高くなります。',
          hint: '高さを変えずに、振幅だけを大きくする方法を考えよう。',
        }),
      ],
    },
    {
      id: 'so-frequency', title: '振動数と音の高さ', basic: 'so-vibration', lessonStageId: 'sound-3',
      checkPool: [
        choice({
          id: 'so-frequency-k1', concept: 'so-frequency',
          prompt: '音の高さを決めているのはどれ？',
          options: ['振幅', '音源までの距離', '振動数'],
          answer: 'c',
          explanation: '音の高さは振動数で決まり、振動数が多いほど高い音です。振幅は音の大きさを決めます。',
          hint: '1 秒間に振動する回数のことだよ。',
        }),
        fill({
          id: 'so-frequency-k2', concept: 'so-frequency',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'モノコードの弦の振動する部分を短くすると、振動数が[b1]なり、音は[b2]なる。',
          blanks: [
            word('b1', ['多く', '少なく'], '多く'),
            word('b2', ['低く', '高く'], '高く'),
          ],
          explanation: '弦の振動する部分を短くすると振動数が多くなり、高い音が出ます。',
          hint: '「短く・強く張る・細く」で、音はどうなったかな。',
        }),
        choice({
          id: 'so-frequency-k3', concept: 'so-frequency',
          prompt: 'モノコードのおもりを軽くして、弦の張りを弱くしました。同じ強さではじくと、音はどうなる？',
          options: ['低くなる', '高くなる', '大きくなる'],
          answer: 'a',
          explanation: '弦の張りを弱くすると振動数が少なくなり、低い音になります。強く張ると高い音になります。',
          hint: '強く張ると高くなる、の反対を考えよう。',
        }),
      ],
    },
    {
      id: 'so-waveform', title: '波形の読み取り', basic: 'so-frequency', lessonStageId: 'sound-4',
      checkPool: [
        choice({
          id: 'so-waveform-k1', concept: 'so-waveform',
          prompt: '同じ時間で比べたとき、波形の波の数が多い音ほど、どんな音？',
          options: ['高い音', '大きい音', '小さい音'],
          answer: 'a',
          explanation: '同じ時間の中の波の数が多いほど、振動数が多く高い音です。大きさは山の高さで読み取ります。',
          hint: '波の数は、振動数と振幅のどちらを表していたかな。',
        }),
        choice({
          id: 'so-waveform-k2', concept: 'so-waveform',
          prompt: '波形の山の高さ（中心からの高さ）が高い音ほど、どんな音？',
          options: ['高い音', '低い音', '大きい音'],
          answer: 'c',
          explanation: '山の高さは振幅を表し、山が高いほど大きい音です。音の高さは波の数で読み取ります。',
          hint: '山の高さは、振幅と振動数のどちらを表していたかな。',
        }),
        fill({
          id: 'so-waveform-k3', concept: 'so-waveform',
          prompt: '空らんに入る数を入れよう。',
          text: '1 回の振動に 0.002 秒かかる音の振動数は[b1]である。',
          blanks: [number('b1', 500, 0, 'Hz')],
          explanation: '1 ÷ 0.002 ＝ 500 なので、1 秒間に 500 回振動します。振動数は 500 Hz です。',
          hint: '1 秒の中に、0.002 秒が何回入るか考えよう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'sound',
    title: '音の世界',
    mascot: 'E',   // 担当の先生（キューブ先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'travel', title: '音の伝わり方', order: 1, stages: [sound1, sound2] },
      { id: 'pitch', title: '音の大きさと高さ', order: 2, stages: [sound3, sound4] },
      { id: 'sound-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [soundMp1, soundMp2, soundMp3] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
