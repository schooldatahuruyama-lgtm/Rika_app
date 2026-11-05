// 「火山と地震」教材データ（中学1年 理科・地学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（火山: マグマと火山の形、火成岩 / 地震: ゆれと伝わり方、震度とマグニチュード）と、概念 6 つ。
// 概念 id は全単元で一意にするため、接頭辞 vo- を付ける。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// drag の位置は部品の基準点（circle は中心）で判定する（js/ui-problems.js の anchorOf）。
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

  // 図の中を選ぶ・動かす（figure は必ず書く）
  function figureChoice(p) { return Object.assign({ type: 'figure-choice' }, p); }
  function drag(p) { return Object.assign({ type: 'drag' }, p); }

  function word(id, opts, answer) { return { id, kind: 'word', options: opts, answer }; }
  function number(id, answer, tolerance, unit) { return { id, kind: 'number', answer, tolerance, unit }; }

  // ---- 図の部品をまとめる道具 ----

  // ア・イ・ウの選ぶ場所（xs は中心の x の配列、y は共通）
  function regionsAt(xs, y) {
    return xs.map((x, i) => ({ type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: 'アイウ'[i] }));
  }

  // 火山の形（地面 y=170 からの相対の点）。dome: 盛り上がった形、cone: 円すいの形、shield: 傾斜のゆるい形
  const SHAPE_POINTS = {
    dome: [[-40, 0], [-34, -28], [-22, -50], [0, -60], [22, -50], [34, -28], [40, 0]],
    cone: [[-44, 0], [-20, -18], [-9, -42], [-3, -66], [0, -72], [3, -66], [9, -42], [20, -18], [44, 0]],
    shield: [[-46, 0], [-24, -13], [-8, -21], [0, -22], [8, -21], [24, -13], [46, 0]],
  };
  // 溶岩の色（レッスンの図だけで使う。問題の図はすべて同じ色にして、形だけで考えさせる）
  const SHAPE_FILL = { dome: '#EEEAE0', cone: '#A8A39A', shield: '#4A4540' };
  const SHAPE_X = [60, 160, 260];

  // 3 つの火山の形を左から kinds の順に並べる。colored: 溶岩の色で塗る
  function volcanoShapes(kinds, colored) {
    const items = [{ type: 'line', points: [[10, 170], [310, 170]], color: 'line', width: 2 }];
    kinds.forEach((kind, i) => {
      const cx = SHAPE_X[i];
      items.push({
        type: 'polygon', points: SHAPE_POINTS[kind].map(([dx, dy]) => [cx + dx, 170 + dy]),
        fill: colored ? SHAPE_FILL[kind] : 'rock',
      });
    });
    return items;
  }

  // 火山の断面（地面 y=150、マグマだまり (160, 212)、火口 y=70）
  function volcanoSection() {
    return [
      { type: 'rect', x: 0, y: 150, width: 320, height: 90, fill: 'sand', stroke: 'none' },
      { type: 'line', points: [[0, 150], [320, 150]], color: 'line', width: 2 },
      { type: 'polygon', points: [[70, 150], [140, 70], [180, 70], [250, 150]], fill: 'rock' },
      { type: 'ellipse', x: 160, y: 212, rx: 50, ry: 18, fill: 'orange', stroke: 'none' },
      { type: 'polygon', points: [[154, 200], [166, 200], [166, 72], [154, 72]], fill: 'orange', stroke: 'none' },
    ];
  }

  // 六角形の点（斑晶の形）
  function hexPoints(cx, cy, rx, ry) {
    return [[cx - rx, cy], [cx - rx / 2, cy - ry], [cx + rx / 2, cy - ry], [cx + rx, cy], [cx + rx / 2, cy + ry], [cx - rx / 2, cy + ry]];
  }

  // 斑状組織（110×110 の枠。左上 (x0, y0)）: 細かい粒（石基）の中に、大きな鉱物（斑晶）が散らばる
  const PHENOCRYSTS = [[28, 28, 14, 10, 'white'], [78, 24, 12, 9, '#3A3A3A'], [56, 62, 16, 11, 'white'],
    [22, 88, 11, 8, '#3A3A3A'], [86, 84, 13, 10, 'white']];
  function porphyryItems(x0, y0) {
    const items = [{ type: 'rect', x: x0, y: y0, width: 110, height: 110, fill: '#D9D4CA' }];
    for (let j = 0; j < 9; j++) {
      for (let i = 0; i < 9; i++) {
        items.push({ type: 'circle', x: x0 + 7 + i * 12 + (j % 2) * 4, y: y0 + 7 + j * 12, r: 2, fill: '#7A746B', stroke: 'none' });
      }
    }
    PHENOCRYSTS.forEach(([dx, dy, rx, ry, fill]) => {
      items.push({ type: 'polygon', points: hexPoints(x0 + dx, y0 + dy, rx, ry), fill });
    });
    return items;
  }

  // 等粒状組織（110×110 の枠。左上 (x0, y0)）: 同じくらいの大きさの鉱物が、すき間なく組み合わさる
  // 5×5 のます目の角を少しずらし、となりの粒と角を共有させる（すき間ができない）
  const JITTER = [[0, 0], [3, -2], [-2, 3], [2, 2], [-3, -1], [1, -3]];
  const GRAIN_FILL = ['white', '#F1E9E4', '#3A3A3A', 'white', '#A8A39A'];
  function granularItems(x0, y0) {
    const s = 22;
    const v = (i, j) => {
      const inner = i > 0 && i < 5 && j > 0 && j < 5;
      const [jx, jy] = inner ? JITTER[(i * 3 + j * 5) % 6] : [0, 0];
      return [x0 + i * s + jx, y0 + j * s + jy];
    };
    const items = [];
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 5; i++) {
        items.push({ type: 'polygon', points: [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)], fill: GRAIN_FILL[(i * 2 + j * 3) % 5] });
      }
    }
    return items;
  }

  // 地震計の記録の線（y=120 が基準。x 70 で P 波、x 150 で S 波が着く）
  function seismoPoints() {
    const pts = [[20, 120], [70, 120]];
    for (let x = 74, k = 0; x < 150; x += 4, k++) pts.push([x, 120 + (k % 2 ? 7 : -7) * (k % 3 === 2 ? 0.6 : 1)]);
    for (let x = 152, k = 0; x <= 286; x += 4, k++) {
      const a = Math.round(42 * Math.max(0.2, 1 - (x - 150) / 170));
      pts.push([x, 120 + (k % 2 ? a : -a)]);
    }
    pts.push([290, 120], [304, 120]);
    return pts;
  }
  function seismoLine() { return { type: 'line', points: seismoPoints(), color: 'ink', width: 2 }; }

  // P 波・S 波のグラフ（横: 地震発生からの時間 0〜60 秒、たて: 震源からの距離 0〜210 km）
  // x = 50 + 4 × 時間、y = 200 − 0.8 × 距離。P 波 6 km/s（210 km で 35 秒）、S 波 3.5 km/s（210 km で 60 秒）
  function waveGraphItems() {
    const items = [];
    [144, 88, 32].forEach(y => items.push({ type: 'line', points: [[50, y], [290, y]], color: 'gray', width: 1, dashed: true }));
    [130, 210, 290].forEach(x => items.push({ type: 'line', points: [[x, 200], [x, 32]], color: 'gray', width: 1, dashed: true }));
    items.push(
      { type: 'line', points: [[50, 200], [50, 22]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [306, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [190, 32]], color: 'blue', width: 3 },
      { type: 'line', points: [[50, 200], [290, 32]], color: 'green', width: 3 },
      { type: 'text', x: 44, y: 214, text: '0', size: 12, anchor: 'end' },
      { type: 'text', x: 130, y: 216, text: '20', size: 12, anchor: 'middle' },
      { type: 'text', x: 210, y: 216, text: '40', size: 12, anchor: 'middle' },
      { type: 'text', x: 290, y: 216, text: '60', size: 12, anchor: 'middle' },
      { type: 'text', x: 44, y: 148, text: '70', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: 92, text: '140', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: 36, text: '210', size: 12, anchor: 'end' },
      { type: 'text', x: 56, y: 16, text: '距離〔km〕', size: 12 },
      { type: 'text', x: 306, y: 236, text: '地震発生からの時間〔秒〕', size: 12, anchor: 'end' },
      { type: 'text', x: 112, y: 64, text: 'P波', size: 13, color: 'blue', bold: true },
      { type: 'text', x: 262, y: 84, text: 'S波', size: 13, color: 'green', bold: true },
    );
    return items;
  }

  // 日本付近の地下の断面（左が大陸側、右が太平洋側）。海洋プレートが海溝から大陸プレートの下に沈みこむ
  // opts.arrows: プレートの動きの矢印をかく
  function plateItems(opts) {
    const o = opts || {};
    const items = [
      { type: 'polygon', points: [[190, 70], [310, 70], [310, 100], [224, 100]], fill: 'water', stroke: 'none' },
      { type: 'polygon', points: [[310, 100], [224, 100], [105, 214], [124, 232], [240, 125], [310, 125]], fill: '#9FB4CC' },
      { type: 'polygon', points: [[10, 78], [205, 78], [224, 100], [150, 168], [10, 168]], fill: '#D8C9A8' },
      { type: 'text', x: 100, y: 70, text: '日本列島', size: 13, anchor: 'middle' },
      { type: 'text', x: 20, y: 140, text: '大陸プレート', size: 13 },
      { type: 'text', x: 246, y: 146, text: '海洋プレート', size: 12 },
      { type: 'text', x: 228, y: 94, text: '海溝', size: 12 },
      { type: 'text', x: 306, y: 64, text: '太平洋', size: 12, anchor: 'end' },
    ];
    if (o.arrows) {
      items.push(
        { type: 'arrow', x1: 302, y1: 112, x2: 256, y2: 112, color: 'blue' },
        { type: 'arrow', x1: 160, y1: 180, x2: 132, y2: 207, color: 'blue' },
      );
    }
    return items;
  }

  // 震度の階級（10 段階）を横に並べた帯
  const SHINDO = ['0', '1', '2', '3', '4', '5弱', '5強', '6弱', '6強', '7'];
  const SHINDO_FILL = ['white', 'white', 'white', '#FFF3C4', '#FFE48A', 'yellow', 'yellow', 'orange', 'orange', '#E0702A'];
  function shindoRow(y) {
    const items = [];
    SHINDO.forEach((s, i) => {
      items.push({ type: 'rect', x: 15 + i * 29, y, width: 29, height: 36, fill: SHINDO_FILL[i] });
      items.push({ type: 'text', x: 29.5 + i * 29, y: y + 23, text: s, size: 12, anchor: 'middle' });
    });
    return items;
  }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」。content/plants.js と同じ） ----
  // 画像は assets/images/volcano/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/volcano/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // ================================================================
  // 領域 1: 火山
  // ================================================================

  // ---- ステージ volcano-1: マグマと火山の形（ねばりけ、噴火のようす、火山噴出物） ----
  const volcano1 = {
    id: 'volcano-1', areaId: 'volcano', title: 'マグマと火山の形', minutes: 5, concepts: ['vo-magma'],
    lessons: [
      {
        id: 'volcano-1-c1',
        text: '地下深くで岩石がとけて、どろどろになったものを**マグマ**といいます。マグマは地下のマグマだまりにたまり、地表へ上がってきてふき出します。これが噴火です。地表に流れ出たマグマや、それが冷えて固まったものを**溶岩**といいます。',
        // 写真: 夜に噴火して赤い溶岩が流れ出る火山（火口 (236, 86)、溶岩の流れ (100〜225, 165〜205)。左は白くぼかした余白）
        figure: scene([
          photo('volcano-1-c1'),
          pointer(92, 62, 228, 86), tag(70, 62, '噴火', { size: 16, bold: true }),
          pointer(150, 152, 200, 172), tag(100, 126, '溶岩', { size: 16, bold: true }),
          tag(100, 146, '（地表に流れ出たマグマ）', { size: 13 }),
          tag(160, 230, 'マグマ＝地下の岩石がとけたもの', { size: 14 }),
        ]),
      },
      {
        id: 'volcano-1-c2',
        text: '火山の形は、マグマの**ねばりけ**で変わります。ねばりけが強いと盛り上がった形になり、爆発的な噴火をして、溶岩は白っぽくなります。ねばりけが弱いと傾斜のゆるやかな形になり、おだやかに噴火して、溶岩は黒っぽくなります。',
        // 写真: 左から 溶岩ドーム（おわんを伏せた形）・富士山（円すいの形）・傾斜のゆるやかな火山。山は中段の細い帯（y 105〜140）に小さく並び、
        // 中心は x 43・135・255。上下は白い余白なので、上にねばりけ、下に名前と特徴を書く
        figure: scene([
          photo('volcano-1-c2'),
          tag(160, 50, 'マグマのねばりけ', { size: 15, bold: true }),
          tag(46, 84, '強い'), tag(138, 84, '中間'), tag(256, 84, '弱い'),
          pointer(68, 79, 116, 79), pointer(160, 79, 234, 79),
          tag(50, 162, '昭和新山', { size: 13 }), tag(138, 162, '富士山', { size: 13 }), tag(256, 162, 'マウナロア', { size: 13 }),
          tag(50, 183, '盛り上がった形', { size: 13 }), tag(138, 183, '円すいの形', { size: 13 }), tag(256, 183, 'ゆるやかな形', { size: 13 }),
          tag(50, 204, '白っぽい溶岩', { size: 13 }), tag(138, 204, '中間の色', { size: 13 }), tag(256, 204, '黒っぽい溶岩', { size: 13 }),
          tag(50, 225, '爆発的な噴火', { size: 13 }), tag(256, 225, 'おだやかな噴火', { size: 13 }),
        ]),
      },
      {
        id: 'volcano-1-c3',
        text: '噴火のときに火山からふき出されたものを**火山噴出物**といいます。溶岩のほか、細かい粒の**火山灰**、空中で固まった**火山弾**、おもに水蒸気からなる**火山ガス**などがあります。',
        // 写真: 火山噴出物の標本 2×2（左上 溶岩 (5〜150, 8〜110)・右上 山盛りの火山灰 (160〜315, 12〜105)・
        // 左下 紡錘形の火山弾 (8〜170, 132〜235。左下から右上へななめ)・右下 軽石 (175〜308, 128〜228)）。余白は少ないので、段の間とすきまに書く
        figure: scene([
          photo('volcano-1-c3'),
          pointer(40, 112, 40, 96), tag(40, 126, '溶岩', { size: 15, bold: true }), tag(48, 145, '冷えて固まる', { size: 13 }),
          tag(188, 22, '火山灰', { size: 15, bold: true }), tag(188, 42, '細かい粒', { size: 13 }),
          tag(140, 210, '火山弾', { size: 15, bold: true }), tag(140, 230, '空中で固まる', { size: 13 }),
          tag(248, 178, '軽石', { size: 15, bold: true }), tag(248, 198, 'あなが多い', { size: 13 }),
          tag(160, 124, '火山噴出物（ほかに火山ガス）', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'volcano-1-w1', concept: 'vo-magma',
      prompt: '予想しよう。はちみつのようにねばりけの強い液体と、水のようにさらさらした液体を、それぞれ机の上に少しずつ落とすと、高く盛り上がるのはどちらだと思う？',
      options: ['ねばりけの強い液体', 'さらさらした液体', 'どちらも同じ'],
      answer: 'a',
      explanation: 'ねばりけの強い液体は流れにくいので、その場で盛り上がります。マグマでも同じことが起こり、火山の形が決まります。このステージで確かめよう。',
      hint: 'はちみつと水が、どう広がるかを思い出そう。',
    }),
    problems: [
      choice({
        id: 'volcano-1-p1', concept: 'vo-magma',
        prompt: 'マグマとは、どのようなもの？',
        options: ['地下にたまった熱い水', '地下の岩石がとけて、どろどろになったもの', '地表に積もった火山灰'],
        answer: 'b',
        explanation: 'マグマは、地下深くで岩石がとけたものです。マグマが地表に流れ出たものや、それが冷えて固まったものを溶岩といいます。',
        hint: '「とけた岩石」をさがそう。',
      }),
      fill({
        id: 'volcano-1-t1', concept: 'vo-magma', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地下の岩石がとけたものを[b1]という。[b1]が地表に流れ出たものや、それが冷えて固まったものを[b2]という。',
        blanks: [
          word('b1', ['マグマ', '溶岩', '火山灰'], 'マグマ'),
          word('b2', ['マグマ', '溶岩', '火山灰'], '溶岩'),
        ],
        explanation: '地下にあるときは**マグマ**、地表に流れ出たものや冷えて固まったものは**溶岩**とよびます。場所によって名前が変わることに注意しよう。',
        hint: '地下にあるときと、地表に出たときで名前が変わるよ。',
      }),
      figureChoice({
        id: 'volcano-1-p2', concept: 'vo-magma',
        prompt: 'ア〜ウは火山の形を表しています（ア 盛り上がった形、イ 円すいの形、ウ 傾斜のゆるやかな形）。マグマのねばりけがいちばん強い火山はどれ？',
        figure: scene(volcanoShapes(['dome', 'cone', 'shield'], false).concat(regionsAt(SHAPE_X, 204))),
        answer: 'r1',
        explanation: 'ねばりけが強いマグマは流れにくく、火口のまわりに盛り上がって固まります。だから、盛り上がった形のアです。ねばりけが弱いとウのように平たく広がります。',
        hint: 'はちみつのように流れにくいと、どんな形になるか考えよう。',
      }),
      choice({
        id: 'volcano-1-p3', concept: 'vo-magma',
        prompt: 'マグマのねばりけが強い火山の噴火のようすとして、正しいものはどれ？',
        options: ['溶岩がさらさらと流れ、おだやかに噴火する', '火山ガスがぬけにくく、爆発的に噴火する', '噴火はまったく起こらない'],
        answer: 'b',
        explanation: 'ねばりけが強いと、マグマの中の火山ガスがぬけにくく、たまった力で爆発的な噴火になりやすいです。ねばりけが弱いと、溶岩が流れ出るおだやかな噴火になりやすいです。',
        hint: 'ねばりけが強いと、中のガスはぬけやすいかな。',
      }),
      fill({
        id: 'volcano-1-p4', concept: 'vo-magma',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'マグマのねばりけが弱い火山は、傾斜が[b1]形になり、溶岩の色は[b2]。',
        blanks: [
          word('b1', ['ゆるやかな', '急な'], 'ゆるやかな'),
          word('b2', ['白っぽい', '黒っぽい'], '黒っぽい'),
        ],
        explanation: 'ねばりけが弱いマグマはよく流れるので、うすく広がって傾斜のゆるやかな火山になります。このようなマグマからできた溶岩は黒っぽい色です。',
        hint: 'マウナロアのような火山を思い出そう。',
      }),
      choice({
        id: 'volcano-1-p5', concept: 'vo-magma',
        prompt: '富士山や桜島のような円すいの形の火山のマグマのねばりけは？',
        options: ['とても強い', 'とても弱い', '強いものと弱いものの中間'],
        answer: 'c',
        explanation: '富士山や桜島のような円すいの形の火山は、ねばりけが中間のマグマでできています。溶岩や火山灰が積み重なって、きれいな円すいの形になります。',
        hint: '3 つの形のまん中にあたる火山だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'volcano-1-r1', concept: 'vo-magma',
        prompt: 'ア〜ウは火山の形を表しています（ア 傾斜のゆるやかな形、イ 盛り上がった形、ウ 円すいの形）。溶岩の色がいちばん黒っぽい火山はどれ？',
        figure: scene(volcanoShapes(['shield', 'dome', 'cone'], false).concat(regionsAt(SHAPE_X, 204))),
        answer: 'r1',
        explanation: '溶岩がいちばん黒っぽいのは、ねばりけの弱いマグマでできた、傾斜のゆるやかなアの火山です。ねばりけの強いイの火山は、白っぽい溶岩になります。',
        hint: 'ねばりけが弱いマグマの火山の形をさがそう。',
      }),
      choice({
        id: 'volcano-1-r2', concept: 'vo-magma',
        prompt: '噴火のときにふき出されたマグマが、空中で冷えて固まったものを何という？',
        options: ['火山灰', '火山弾', '火山ガス'],
        answer: 'b',
        explanation: 'ふき飛ばされたマグマが空中で固まったものを火山弾といいます。火山灰は細かい粒、火山ガスは気体です。',
        hint: '「弾」は飛んでいく固まりのイメージだよ。',
      }),
      choice({
        id: 'volcano-1-r3', concept: 'vo-magma',
        prompt: '火山ガスにいちばん多くふくまれているものはどれ？',
        options: ['酸素', '水素', '水蒸気'],
        answer: 'c',
        explanation: '火山ガスのおもな成分は水蒸気です。ほかに二酸化炭素や、においのある二酸化硫黄・硫化水素などもふくまれます。',
        hint: '水が気体になったものだよ。',
      }),
      choice({
        id: 'volcano-1-t2', concept: 'vo-magma', term: true,
        prompt: '次の説明に合う言葉はどれ？「噴火でふき出された、直径 2 mm 以下の細かい粒」',
        options: ['溶岩', '火山灰', 'マグマ'],
        answer: 'b',
        explanation: '噴火でふき出された細かい粒を**火山灰**といいます。風に運ばれて、火山から遠いところにも積もります。',
        hint: '「灰」のように細かいものだよ。',
      }),
    ],
  };

  // ---- ステージ volcano-2: 火成岩（火山岩と深成岩、斑状組織と等粒状組織、鉱物） ----
  const volcano2 = {
    id: 'volcano-2', areaId: 'volcano', title: '火成岩', minutes: 5, concepts: ['vo-igneous', 'vo-mineral'],
    lessons: [
      {
        id: 'volcano-2-c1',
        text: 'マグマが冷えて固まった岩石を**火成岩**といいます。地表や地表の近くで急に冷えて固まったものを**火山岩**、地下深くでゆっくり冷えて固まったものを**深成岩**といいます。',
        // 火山の断面。地表近く → 火山岩、地下深く → 深成岩
        figure: scene(volcanoSection().concat([
          { type: 'polygon', points: [[176, 72], [184, 70], [236, 138], [226, 142]], fill: 'orange', stroke: 'none' },
          { type: 'text', x: 8, y: 40, text: '地表や地表の近く', size: 13 },
          { type: 'text', x: 8, y: 58, text: '急に冷える→火山岩', size: 13, bold: true },
          { type: 'text', x: 8, y: 174, text: '地下深く', size: 13 },
          { type: 'text', x: 8, y: 192, text: 'ゆっくり冷える', size: 13 },
          { type: 'text', x: 216, y: 218, text: '→深成岩', size: 13, bold: true },
        ])),
      },
      {
        id: 'volcano-2-c2',
        text: '火山岩は、細かい粒やガラスのような部分の中に、大きな鉱物が散らばっています。細かい部分を**石基**、大きな鉱物を**斑晶**といい、このようなつくりを**斑状組織**といいます。',
        // 写真: 安山岩の表面をルーペで見たようす（円の中心 (107, 115)・半径 102。黒い斑晶 (112, 98)、白い斑晶 (170, 148)、石基は灰色の細かい粒。右は白い余白）
        figure: scene([
          photo('volcano-2-c2'),
          tag(268, 30, '斑状組織', { size: 16, bold: true }), tag(268, 50, '火山岩のつくり', { size: 13 }),
          pointer(244, 92, 124, 98), pointer(226, 96, 186, 140),
          tag(268, 98, '斑晶', { size: 15, bold: true }), tag(268, 118, '（大きな鉱物）', { size: 13 }),
          pointer(240, 172, 142, 204),
          tag(268, 178, '石基', { size: 15, bold: true }), tag(268, 198, '（細かい粒など）', { size: 13 }),
        ]),
      },
      {
        id: 'volcano-2-c3',
        text: '深成岩は、同じくらいの大きさの鉱物がすき間なく組み合わさっています。このようなつくりを**等粒状組織**といいます。地下深くでゆっくり冷えるので、鉱物が大きく育ちます。',
        // 写真: 花こう岩の表面をルーペで見たようす（円の中心 (107, 115)・半径 102。黒い鉱物 (127, 75)・(185, 135)、うす赤い鉱物 (150, 105)。右は白い余白）
        figure: scene([
          photo('volcano-2-c3'),
          tag(268, 30, '等粒状組織', { size: 16, bold: true }), tag(268, 50, '深成岩のつくり', { size: 13 }),
          pointer(226, 104, 152, 104), pointer(226, 116, 186, 134),
          tag(268, 108, '同じくらいの', { size: 13 }), tag(268, 126, '大きさの鉱物', { size: 13 }),
          tag(268, 184, '石基がない', { size: 14, bold: true }),
        ]),
      },
      {
        id: 'volcano-2-c4',
        text: 'マグマが冷えてできた結晶を**鉱物**といいます。セキエイ・チョウ石は白っぽい**無色鉱物**、クロウンモ・カクセン石・キ石・カンラン石は黒っぽい**有色鉱物**です。無色鉱物が多い岩石ほど白っぽくなります。',
        // 写真: 火成岩 6 種の標本（上の段 火山岩: 流紋岩・安山岩・玄武岩、下の段 深成岩: 花こう岩・閃緑岩・斑れい岩。左ほど白っぽい。上の段 y 10〜90、下の段 y 132〜218）
        figure: scene([
          photo('volcano-2-c4'),
          tag(52, 104, '流紋岩'), tag(160, 104, '安山岩'), tag(265, 104, '玄武岩'),
          tag(160, 126, '上: 火山岩　下: 深成岩　左ほど白っぽい', { size: 13, bold: true }),
          tag(52, 233, '花こう岩'), tag(158, 233, '閃緑岩'), tag(265, 233, '斑れい岩'),
        ]),
      },
    ],
    warmup: choice({
      id: 'volcano-2-w1', concept: 'vo-igneous',
      prompt: '予想しよう。食塩水から食塩の結晶をとり出すとき、水をゆっくり蒸発させると、結晶の大きさはどうなると思う？',
      options: ['大きな結晶ができやすい', '小さな結晶しかできない', 'ゆっくりでも急でも同じ'],
      answer: 'a',
      explanation: '結晶は、ゆっくりできるほど大きく育ちやすいです。マグマが冷えて岩石になるときも同じで、冷え方で岩石のつくりが変わります。',
      hint: '時間をかけると、結晶は育つ時間がたっぷりあるね。',
    }),
    problems: [
      choice({
        id: 'volcano-2-p1', concept: 'vo-igneous',
        prompt: '火山岩は、マグマがどこで、どのように冷えて固まった岩石？',
        options: ['地下深くで、ゆっくり冷えて固まった', '地表や地表の近くで、急に冷えて固まった', '海の底で、砂がおし固められた'],
        answer: 'b',
        explanation: '火山岩は、マグマが地表や地表の近くで急に冷えて固まった岩石です。地下深くでゆっくり冷えて固まったものは深成岩です。',
        hint: '「火山」の名前のとおり、地表に近いところを考えよう。',
      }),
      fill({
        id: 'volcano-2-t1', concept: 'vo-igneous', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '火山岩に見られる、石基の中に斑晶が散らばったつくりを[b1]という。深成岩に見られる、同じくらいの大きさの鉱物が組み合わさったつくりを[b2]という。',
        blanks: [
          word('b1', ['斑状組織', '等粒状組織', '火成岩'], '斑状組織'),
          word('b2', ['斑状組織', '等粒状組織', '火成岩'], '等粒状組織'),
        ],
        explanation: '火山岩のつくりは**斑状組織**（斑晶と石基）、深成岩のつくりは**等粒状組織**です。「斑晶」の「斑」と「斑状」の「斑」が同じ字だと覚えるとよいです。',
        hint: '「等しい粒」と書くのはどちらのつくりかな。',
      }),
      figureChoice({
        id: 'volcano-2-p2', concept: 'vo-igneous',
        prompt: 'ア・イは、2 種類の火成岩をルーペで見たスケッチです（ア 細かい粒の中に大きな鉱物が散らばる、イ 同じくらいの大きさの鉱物が組み合わさる）。深成岩はどちら？',
        figure: scene(porphyryItems(35, 40).concat(granularItems(175, 40), regionsAt([90, 230], 196))),
        answer: 'r2',
        explanation: '深成岩は地下深くでゆっくり冷えるので、どの鉱物も大きく育ち、イのような等粒状組織になります。アは石基と斑晶がある斑状組織で、火山岩のつくりです。',
        hint: '石基（細かい粒）があるかどうかで見分けよう。',
      }),
      figureChoice({
        id: 'volcano-2-p3', concept: 'vo-igneous',
        prompt: '火山の断面の図です。ア（地表に流れ出た溶岩）、イ（地下深くのマグマだまり）のうち、マグマがゆっくり冷えて深成岩ができるのはどちら？',
        figure: scene(volcanoSection().concat([
          { type: 'polygon', points: [[176, 72], [184, 70], [236, 138], [226, 142]], fill: 'orange', stroke: 'none' },
          { type: 'region', id: 'r1', x: 208, y: 106, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 212, r: 22, label: 'イ' },
        ])),
        answer: 'r2',
        explanation: '地下深くのマグマだまりは、まわりが熱い岩石なので、マグマはゆっくり冷えます。だからイで深成岩ができます。地表に出たアの溶岩は急に冷えて、火山岩になります。',
        hint: '熱がにげにくいのは、地表と地下深くのどちらか考えよう。',
      }),
      choice({
        id: 'volcano-2-p4', concept: 'vo-mineral',
        prompt: '次の鉱物のうち、無色鉱物（白っぽい鉱物）はどれ？',
        options: ['クロウンモ', 'カンラン石', 'セキエイ', 'カクセン石'],
        answer: 'c',
        explanation: 'セキエイは無色・白色の無色鉱物です。クロウンモ・カンラン石・カクセン石は色のついた有色鉱物です。無色鉱物はセキエイとチョウ石の 2 つと覚えよう。',
        hint: '無色鉱物は 2 つだけだったね。',
      }),
      fill({
        id: 'volcano-2-p5', concept: 'vo-mineral',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '花こう岩が白っぽく見えるのは、[b1]を多くふくむからだ。玄武岩が黒っぽく見えるのは、[b2]を多くふくむからだ。',
        blanks: [
          word('b1', ['無色鉱物', '有色鉱物'], '無色鉱物'),
          word('b2', ['無色鉱物', '有色鉱物'], '有色鉱物'),
        ],
        explanation: '岩石の色は、ふくまれる鉱物の種類と割合で決まります。セキエイやチョウ石などの無色鉱物が多いと白っぽく、クロウンモやキ石などの有色鉱物が多いと黒っぽくなります。',
        hint: '白っぽい鉱物と黒っぽい鉱物、どちらが多いか考えよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'volcano-2-r1', concept: 'vo-igneous',
        prompt: 'ア・イは、2 種類の火成岩をルーペで見たスケッチです（ア 同じくらいの大きさの鉱物が組み合わさる、イ 細かい粒の中に大きな鉱物が散らばる）。地表の近くで急に冷えてできた火山岩はどちら？',
        figure: scene(granularItems(35, 40).concat(porphyryItems(175, 40), regionsAt([90, 230], 196))),
        answer: 'r2',
        explanation: '火山岩は急に冷えるので、大きく育つ時間がなかった細かい粒（石基）の中に、地下ですでにできていた大きな鉱物（斑晶）が散らばります。イの斑状組織が火山岩です。',
        hint: '細かい粒（石基）があるほうをさがそう。',
      }),
      choice({
        id: 'volcano-2-r2', concept: 'vo-igneous',
        prompt: '次の岩石のうち、深成岩はどれ？',
        options: ['玄武岩', '花こう岩', '安山岩'],
        answer: 'b',
        explanation: '花こう岩は深成岩です。玄武岩と安山岩は火山岩です。深成岩は「花こう岩・閃緑岩・斑れい岩」、火山岩は「流紋岩・安山岩・玄武岩」です。',
        hint: '名前に「花」がつく白っぽい岩石だよ。',
      }),
      choice({
        id: 'volcano-2-r3', concept: 'vo-mineral',
        prompt: '黒色で、うすくはがれる性質のある有色鉱物はどれ？',
        options: ['チョウ石', 'クロウンモ', 'セキエイ'],
        answer: 'b',
        explanation: 'クロウンモは黒色の板のような形で、うすくはがれます。チョウ石とセキエイは白っぽい無色鉱物です。',
        hint: '名前に「クロ（黒）」が入っている鉱物だよ。',
      }),
      choice({
        id: 'volcano-2-r4', concept: 'vo-mineral',
        prompt: '黒っぽい色をした火成岩には、どんな鉱物が多くふくまれている？',
        options: ['セキエイやチョウ石などの無色鉱物', 'キ石やカンラン石などの有色鉱物', '鉱物はふくまれていない'],
        answer: 'b',
        explanation: '黒っぽい岩石には、キ石やカンラン石などの有色鉱物が多くふくまれています。玄武岩や斑れい岩がその例です。',
        hint: '岩石の色は、ふくまれる鉱物の色で決まるよ。',
      }),
      choice({
        id: 'volcano-2-t2', concept: 'vo-igneous', term: true,
        prompt: '次の説明に合う言葉はどれ？「斑状組織で、細かい粒の中に散らばっている大きな鉱物」',
        options: ['石基', '斑晶', '火山灰'],
        answer: 'b',
        explanation: '斑状組織の中の大きな鉱物を**斑晶**、そのまわりの細かい粒やガラスのような部分を**石基**といいます。',
        hint: '「斑状組織」と同じ字が入っている言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 地震
  // ================================================================

  // ---- ステージ volcano-3: 地震のゆれと伝わり方（震源・震央、P 波・S 波、初期微動継続時間） ----
  const volcano3 = {
    id: 'volcano-3', areaId: 'quake', title: '地震のゆれと伝わり方', minutes: 5, concepts: ['vo-wave'],
    lessons: [
      {
        id: 'volcano-3-c1',
        anim: 'vo-quake-spread',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '地震は、地下の岩盤がずれて起こります。地下で地震が起こった場所を**震源**、震源の真上の地表の点を**震央**といいます。ゆれは震源から、まわりへ同心円状に伝わっていきます。',
        // 地下の断面。震源と震央、広がるゆれ
        figure: scene([
          { type: 'rect', x: 10, y: 80, width: 300, height: 150, fill: 'sand', stroke: 'none' },
          { type: 'line', points: [[10, 80], [310, 80]], color: 'brown', width: 3 },
          { type: 'circle', x: 160, y: 180, r: 34, fill: 'none', stroke: 'gray' },
          { type: 'circle', x: 160, y: 180, r: 58, fill: 'none', stroke: 'gray' },
          { type: 'line', points: [[160, 168], [160, 94]], color: 'gray', width: 2, dashed: true },
          { type: 'circle', x: 160, y: 180, r: 9, fill: 'orange' },
          { type: 'circle', x: 160, y: 80, r: 9, fill: 'yellow' },
          { type: 'text', x: 176, y: 186, text: '震源', size: 14, bold: true },
          { type: 'text', x: 160, y: 60, text: '震央（震源の真上）', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 14, y: 72, text: '地表', size: 13 },
        ]),
      },
      {
        id: 'volcano-3-c2',
        anim: 'vo-seismogram',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '地震のゆれには 2 つあります。はじめの小さなゆれを**初期微動**、あとからくる大きなゆれを**主要動**といいます。初期微動は速い**P波**、主要動はおそい**S波**が届いて起こります。',
        // 地震計の記録
        figure: scene([
          { type: 'line', points: [[70, 64], [70, 196]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[150, 64], [150, 196]], color: 'gray', width: 2, dashed: true },
          seismoLine(),
          { type: 'text', x: 70, y: 52, text: 'P波が着く', size: 12, anchor: 'middle' },
          { type: 'text', x: 150, y: 52, text: 'S波が着く', size: 12, anchor: 'middle' },
          { type: 'text', x: 110, y: 152, text: '初期微動', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 220, y: 186, text: '主要動', size: 13, anchor: 'middle', bold: true },
          { type: 'line', points: [[70, 208], [150, 208]], color: 'orange', width: 4 },
          { type: 'text', x: 110, y: 228, text: '初期微動継続時間', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'volcano-3-c3',
        anim: 'vo-ps-graph',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: 'P波が着いてからS波が着くまでの時間を**初期微動継続時間**といいます。P波は約 6 km/s、S波は約 3.5 km/s で伝わるので、震源から遠いほど差が開き、初期微動継続時間は長くなります。',
        // P 波・S 波のグラフ。210 km の地点の初期微動継続時間
        figure: scene(waveGraphItems().concat([
          { type: 'line', points: [[190, 32], [290, 32]], color: 'orange', width: 4 },
          { type: 'line', points: [[143, 88], [210, 88]], color: 'orange', width: 4 },
          { type: 'text', x: 240, y: 24, text: '初期微動継続時間', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'volcano-3-w1', concept: 'vo-wave',
      prompt: '予想しよう。地震のとき、はじめにカタカタと小さくゆれ、あとからユサユサと大きくゆれることがあります。なぜだと思う？',
      options: ['速さのちがう 2 種類の波が、震源から同時に出ているから', '地震が 2 回続けて起こったから', '建物がゆれを大きくしているから'],
      answer: 'a',
      explanation: '震源からは、速い波とおそい波が同時に出ます。速い波が先に着いて小さくゆれ、おそい波があとから着いて大きくゆれます。このステージで確かめよう。',
      hint: '「先に着くもの」と「あとから着くもの」があると考えてみよう。',
    }),
    problems: [
      choice({
        id: 'volcano-3-p1', concept: 'vo-wave',
        prompt: '初期微動のあとに主要動がくるのはなぜ？',
        options: ['S波のほうがP波より速く伝わるから', 'P波のほうがS波より速く伝わるから', '主要動は、初期微動がはね返ってきたゆれだから'],
        answer: 'b',
        explanation: 'P波とS波は震源で同時に発生しますが、P波のほうが速いので先に着きます。P波で初期微動が、あとから着くS波で主要動が起こります。',
        hint: 'P波とS波の速さをくらべよう。',
      }),
      fill({
        id: 'volcano-3-t1', concept: 'vo-wave', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地震のはじめの小さなゆれを[b1]、あとからくる大きなゆれを[b2]という。',
        blanks: [
          word('b1', ['初期微動', '主要動', '震度'], '初期微動'),
          word('b2', ['初期微動', '主要動', '震度'], '主要動'),
        ],
        explanation: 'はじめの小さなゆれは**初期微動**（P波によるゆれ）、あとからくる大きなゆれは**主要動**（S波によるゆれ）です。',
        hint: '「微」は「わずか」という意味だよ。',
      }),
      figureChoice({
        id: 'volcano-3-p2', concept: 'vo-wave',
        prompt: 'P波（青）とS波（緑）が伝わるようすのグラフです。ア（震源から 140 km の地点で、地震発生から P波が着くまで）、イ（同じ地点で、P波が着いてから S波が着くまで）、ウ（地震発生から 20 秒後の、P波と S波の届いた距離の差）のうち、初期微動継続時間を表しているのはどれ？',
        figure: scene(waveGraphItems().concat([
          { type: 'line', points: [[50, 88], [143, 88]], color: 'orange', width: 4 },
          { type: 'line', points: [[143, 88], [210, 88]], color: 'purple', width: 4 },
          { type: 'line', points: [[130, 104], [130, 144]], color: 'orange', width: 4 },
          { type: 'region', id: 'r1', x: 96, y: 88, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 177, y: 88, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 130, y: 124, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: '初期微動継続時間は、ある地点に P波が着いてから S波が着くまでの時間です。グラフでは、同じ距離のところの P波の線と S波の線のあいだの横の長さ、つまりイです。',
        hint: '初期微動は、P波が着いてから S波が着くまで続くゆれだよ。',
      }),
      fill({
        id: 'volcano-3-p3', concept: 'vo-wave',
        prompt: '空らんに入る数を入れよう。',
        text: '震源から 120 km はなれた地点に、地震が発生してから 20 秒後に P波が着いた。P波の速さは[b1]である。',
        blanks: [number('b1', 6, 0.1, 'km/s')],
        explanation: '速さ ＝ 距離 ÷ 時間 なので、120 km ÷ 20 s ＝ 6 km/s です。P波はおよそ 6 km/s で伝わります。',
        hint: '速さ ＝ 距離 ÷ 時間 で計算しよう。',
      }),
      fill({
        id: 'volcano-3-p4', concept: 'vo-wave',
        prompt: '空らんに入る数を入れよう。',
        text: 'ある地点で、P波が 10 時 00 分 10 秒に、S波が 10 時 00 分 25 秒に着いた。この地点の初期微動継続時間は[b1]である。',
        blanks: [number('b1', 15, 0, '秒')],
        explanation: '初期微動継続時間は、P波が着いてから S波が着くまでの時間です。25 秒 − 10 秒 ＝ 15 秒になります。',
        hint: 'S波が着いた時刻から、P波が着いた時刻を引こう。',
      }),
      drag({
        id: 'volcano-3-p5', concept: 'vo-wave',
        prompt: '地下の断面の図です。オレンジの丸が震源です。黄色い丸（震央）を左右に動かして、正しい位置に置こう。',
        // 震源 (200, 180)。震央は震源の真上の地表 (200, 80)。黄色い丸は地表の上を左右に動く
        figure: scene([
          { type: 'rect', x: 10, y: 80, width: 300, height: 150, fill: 'sand', stroke: 'none' },
          { type: 'line', points: [[10, 80], [310, 80]], color: 'brown', width: 3 },
          { type: 'circle', x: 200, y: 180, r: 30, fill: 'none', stroke: 'gray' },
          { type: 'circle', x: 200, y: 180, r: 9, fill: 'orange' },
          { type: 'text', x: 200, y: 222, text: '震源', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 270, y: 72, text: '地表', size: 13 },
          { type: 'circle', id: 'epi', x: 60, y: 80, r: 14, fill: 'yellow', label: '震央', labelPos: 'above' },
        ]),
        draggable: { itemId: 'epi', axis: 'x' },
        target: { x: 200, y: 80 },
        samples: { correct: { x: 200, y: 80 }, wrong: { x: 140, y: 80 } },
        explanation: '震央は、震源の真上にある地表の点です。震源から地表まで、まっすぐ上にのばした線が地表と交わるところに置きます。',
        hint: '震源から、まっすぐ上に線をのばしてみよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'volcano-3-r1', concept: 'vo-wave',
        prompt: '震源から 50 km の地点では、初期微動継続時間が約 6 秒でした。震源から 100 km の地点では、初期微動継続時間はどうなる？',
        options: ['約 3 秒に短くなる', '約 6 秒で変わらない', '約 12 秒に長くなる'],
        answer: 'c',
        explanation: '初期微動継続時間は、震源からの距離にほぼ比例します。距離が 2 倍になると、初期微動継続時間も約 2 倍の約 12 秒になります。',
        hint: '遠いほど、P波と S波の着く時間の差は開いていくよ。',
      }),
      figureChoice({
        id: 'volcano-3-r2', concept: 'vo-wave',
        prompt: '地震計の記録です。ア（ゆれが始まる前）、イ（はじめの小さなゆれ）、ウ（あとからきた大きなゆれ）のうち、S波によって起こるゆれはどれ？',
        figure: scene([seismoLine()].concat(regionsAt([42, 110, 220], 120))),
        answer: 'r3',
        explanation: 'S波が着くと、大きなゆれの主要動が始まります。だからウです。イの小さなゆれは、先に着いた P波による初期微動です。',
        hint: 'S波はおそいので、あとから着くよ。',
      }),
      fill({
        id: 'volcano-3-r3', concept: 'vo-wave',
        prompt: '空らんに入る数を入れよう。',
        text: '震源から 70 km はなれた地点に、地震が発生してから 20 秒後に S波が着いた。S波の速さは[b1]である。',
        blanks: [number('b1', 3.5, 0.1, 'km/s')],
        explanation: '速さ ＝ 距離 ÷ 時間 なので、70 km ÷ 20 s ＝ 3.5 km/s です。S波は P波（約 6 km/s）よりおそく伝わります。',
        hint: '70 を 20 でわろう。',
      }),
      choice({
        id: 'volcano-3-t2', concept: 'vo-wave', term: true,
        prompt: '次の説明に合う言葉はどれ？「地震が起こった地下の場所の、真上にある地表の点」',
        options: ['震源', '震央', '震度'],
        answer: 'b',
        explanation: '地下で地震が起こった場所が**震源**、その真上の地表の点が**震央**です。「央」は「中央」の「央」です。',
        hint: '地下の場所ではなく、地表の点だよ。',
      }),
    ],
  };

  // ---- ステージ volcano-4: 震度とマグニチュード（震度、マグニチュード、プレート、断層、災害） ----
  const volcano4 = {
    id: 'volcano-4', areaId: 'quake', title: '震度とマグニチュード', minutes: 5, concepts: ['vo-scale', 'vo-plate'],
    lessons: [
      {
        id: 'volcano-4-c1',
        text: 'ある場所でのゆれの大きさを**震度**といいます。日本では 0〜7 の 10 段階で表し、5 と 6 は弱と強に分けます。ふつう、震央から遠いほど震度は小さくなりますが、地面のようすでも変わります。',
        // 震度の階級
        figure: scene(shindoRow(100).concat([
          { type: 'text', x: 160, y: 80, text: '震度の階級（10 段階）', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 15, y: 166, text: 'ゆれが小さい', size: 13 },
          { type: 'text', x: 305, y: 166, text: 'ゆれが大きい', size: 13, anchor: 'end' },
          { type: 'line', points: [[110, 162], [210, 162]], color: 'gray', width: 2, arrow: true },
        ])),
      },
      {
        id: 'volcano-4-c2',
        text: '地震そのものの規模（エネルギーの大きさ）を**マグニチュード**（記号 M）といいます。1 つの地震でマグニチュードは 1 つですが、震度は場所ごとにちがいます。M が 1 大きいとエネルギーは約 32 倍です。',
        // 1 つの地震で、場所ごとに震度がちがう
        figure: scene([
          { type: 'rect', x: 10, y: 44, width: 300, height: 186, fill: '#EEF4E8', stroke: 'line' },
          { type: 'text', x: 160, y: 30, text: 'マグニチュード 6.5 の地震（M は 1 つ）', size: 13, anchor: 'middle', bold: true },
          { type: 'line', points: [[62, 122], [78, 138]], color: 'ink', width: 3 },
          { type: 'line', points: [[78, 122], [62, 138]], color: 'ink', width: 3 },
          { type: 'text', x: 70, y: 160, text: '震央', size: 13, anchor: 'middle' },
          { type: 'circle', x: 120, y: 96, r: 6, fill: 'blue', stroke: 'none' },
          { type: 'text', x: 130, y: 90, text: '震度 5 強', size: 13 },
          { type: 'circle', x: 196, y: 170, r: 6, fill: 'blue', stroke: 'none' },
          { type: 'text', x: 206, y: 164, text: '震度 4', size: 13 },
          { type: 'circle', x: 250, y: 76, r: 6, fill: 'blue', stroke: 'none' },
          { type: 'text', x: 260, y: 70, text: '震度 2', size: 13 },
        ]),
      },
      {
        id: 'volcano-4-c3',
        anim: 'vo-plate-rebound',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '地球の表面は、**プレート**という岩盤でおおわれています。日本付近では、海洋プレートが大陸プレートの下に沈みこみます。引きずられた大陸プレートがはね返ると、海溝の近くで大きな地震が起こります。',
        // 日本付近の地下の断面とプレートの動き
        figure: scene(plateItems({ arrows: true }).concat([
          { type: 'text', x: 100, y: 200, text: '沈みこむ', size: 13, color: 'blue', bold: true, anchor: 'end' },
        ])),
      },
      {
        id: 'volcano-4-c4',
        text: '大地に大きな力が加わって岩盤がずれたものを**断層**といい、今後もずれる可能性のある断層を**活断層**といいます。震源が海底のときは**津波**が起こることがあり、うめ立て地などでは地面がやわらかくなる液状化も起こります。',
        // 写真: 地震で地表に現れた断層（畑のあぜと道路を横切って段差ができた。段差の線は (5, 127)〜(180, 150)〜(310, 160)、道路の段差 (218, 150)。上は白くぼかした余白）
        figure: scene([
          photo('volcano-4-c4'),
          tag(160, 26, '地面が切れてずれた', { size: 13 }), tag(160, 50, '断層', { size: 16, bold: true }),
          pointer(144, 56, 90, 136), pointer(176, 56, 216, 146),
          tag(160, 230, '道路やあぜに段差ができた', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'volcano-4-w1', concept: 'vo-scale',
      prompt: '予想しよう。1 つの地震で、震央の近くの町と、遠くはなれた町のゆれの大きさをくらべると、どうなると思う？',
      options: ['どこでも同じ大きさでゆれる', 'ふつうは震央に近い町のほうが大きくゆれる', 'ふつうは遠い町のほうが大きくゆれる'],
      answer: 'b',
      explanation: 'ゆれは震源から伝わるうちに弱まるので、ふつうは震央に近いほど大きくゆれます。場所ごとのゆれの大きさの表し方を、このステージで学ぼう。',
      hint: '音も、出たところから遠いほど小さく聞こえるね。',
    }),
    problems: [
      choice({
        id: 'volcano-4-p1', concept: 'vo-scale',
        prompt: '震度とマグニチュードの説明として、正しいものはどれ？',
        options: ['震度は地震の規模、マグニチュードはある場所のゆれの大きさ', '震度はある場所のゆれの大きさ、マグニチュードは地震の規模', 'どちらも同じ意味で、呼び方がちがうだけ'],
        answer: 'b',
        explanation: '震度は、ある場所でのゆれの大きさです。マグニチュードは、地震そのものの規模（エネルギーの大きさ）です。1 つの地震でも、震度は場所によってちがいます。',
        hint: '場所ごとにちがうのはどちらか考えよう。',
      }),
      fill({
        id: 'volcano-4-t1', concept: 'vo-scale', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ある場所でのゆれの大きさを[b1]といい、地震そのものの規模を[b2]という。',
        blanks: [
          word('b1', ['震度', 'マグニチュード', '震源'], '震度'),
          word('b2', ['震度', 'マグニチュード', '震源'], 'マグニチュード'),
        ],
        explanation: 'ゆれの大きさは**震度**（0〜7 の 10 段階）、地震の規模は**マグニチュード**（記号 M）で表します。',
        hint: '「震度 5 強」「M7.0」のように使う言葉だよ。',
      }),
      figureChoice({
        id: 'volcano-4-p2', concept: 'vo-scale',
        prompt: 'ある地震の震央（×）と、3 つの地点ア〜ウの地図です。地面のようすはどこも同じとします。震度がいちばん大きかったと考えられるのはどれ？',
        figure: scene([
          { type: 'rect', x: 10, y: 20, width: 300, height: 210, fill: '#EEF4E8', stroke: 'line' },
          { type: 'line', points: [[82, 112], [98, 128]], color: 'ink', width: 3 },
          { type: 'line', points: [[98, 112], [82, 128]], color: 'ink', width: 3 },
          { type: 'text', x: 90, y: 150, text: '震央', size: 13, anchor: 'middle' },
        ].concat([
          { type: 'region', id: 'r1', x: 270, y: 60, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 140, y: 80, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 230, y: 180, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: '地面のようすが同じなら、ゆれは震央から遠いほど弱まります。震央にいちばん近いイの震度が、いちばん大きいと考えられます。',
        hint: '震央からの距離をくらべよう。',
      }),
      choice({
        id: 'volcano-4-p3', concept: 'vo-plate',
        prompt: '日本付近のプレートの動きとして、正しいものはどれ？',
        options: ['大陸プレートが、海洋プレートの下に沈みこんでいる', '海洋プレートが、大陸プレートの下に沈みこんでいる', 'プレートはまったく動いていない'],
        answer: 'b',
        explanation: '日本付近では、太平洋側から動いてくる海洋プレートが、大陸プレートの下に沈みこんでいます。そのため、プレートの境目に大きな力が加わり、地震が起こります。',
        hint: '海溝で、どちらのプレートが下にもぐるか考えよう。',
      }),
      figureChoice({
        id: 'volcano-4-p4', concept: 'vo-plate',
        prompt: '日本付近の地下の断面です。ア（日本列島の地下の浅いところ）、イ（海洋プレートと大陸プレートの境目）、ウ（海溝からはなれた沖の海洋プレートの中）のうち、海溝型の大きな地震の震源になりやすいのはどこ？',
        figure: scene(plateItems({ arrows: false }).concat([
          { type: 'arrow', x1: 160, y1: 180, x2: 132, y2: 207, color: 'blue' },
          { type: 'region', id: 'r1', x: 70, y: 106, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 185, y: 136, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 282, y: 112, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: '海洋プレートが沈みこむと、大陸プレートが引きずりこまれ、ひずみがたまります。たえきれなくなってはね返ると、プレートの境目のイで大きな地震が起こります。アは活断層による内陸型の地震が起こるところです。',
        hint: '2 つのプレートがおし合っている場所をさがそう。',
      }),
      choice({
        id: 'volcano-4-p5', concept: 'vo-plate',
        prompt: '震源が海底にある大きな地震で、海底が急に動いたときに起こりやすい災害はどれ？',
        options: ['津波', '火山灰が降る', '大雪'],
        answer: 'a',
        explanation: '海底が急にもち上がったり沈んだりすると、海水が大きく動いて津波が起こります。海の近くで強いゆれを感じたら、すぐに高いところへ避難することが大切です。',
        hint: '海の水が大きく動くと何が起こるか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'volcano-4-r1', concept: 'vo-scale',
        prompt: '1 つの地震について、正しいものはどれ？',
        options: ['マグニチュードは 1 つで、震度は場所によってちがう', 'マグニチュードも震度も、場所によってちがう', 'マグニチュードも震度も、どこでも同じ'],
        answer: 'a',
        explanation: 'マグニチュードは地震そのものの規模なので、1 つの地震で 1 つです。震度はその場所でのゆれの大きさなので、場所によってちがいます。',
        hint: '地震の「規模」と、場所ごとの「ゆれ」に分けて考えよう。',
      }),
      choice({
        id: 'volcano-4-r2', concept: 'vo-scale',
        prompt: '日本の震度の階級はいくつある？',
        options: ['7 段階（1〜7）', '8 段階（0〜7）', '10 段階（0〜7、5 と 6 は弱と強）'],
        answer: 'c',
        explanation: '震度は 0・1・2・3・4・5 弱・5 強・6 弱・6 強・7 の 10 段階です。5 と 6 が弱と強に分かれているので、8 段階ではありません。',
        hint: '5 と 6 が 2 つに分かれていることを思い出そう。',
      }),
      choice({
        id: 'volcano-4-r3', concept: 'vo-plate',
        prompt: '日本列島の地下の浅いところで起こる地震（内陸型の地震）は、おもに何がずれて起こる？',
        options: ['活断層', '火山灰の層', '海溝'],
        answer: 'a',
        explanation: '内陸型の地震は、今後もずれる可能性のある断層（活断層）がずれて起こります。震源が浅いので、震央の近くでは強くゆれることがあります。',
        hint: '「今後もずれる可能性のある断層」を何というかな。',
      }),
      choice({
        id: 'volcano-4-r4', concept: 'vo-plate',
        prompt: '日本付近で、プレートの境目で起こる地震の震源の深さは、太平洋側から日本海側に向かってどうなっている？',
        options: ['だんだん浅くなる', 'だんだん深くなる', 'どこでも同じ深さ'],
        answer: 'b',
        explanation: '海洋プレートが日本列島の下へななめに沈みこんでいるので、プレートの境目の地震の震源は、太平洋側では浅く、日本海側に向かって深くなります。',
        hint: '海洋プレートがななめに沈みこむ向きを思い出そう。',
      }),
      choice({
        id: 'volcano-4-t2', concept: 'vo-plate', term: true,
        prompt: '次の説明に合う言葉はどれ？「大地に大きな力が加わって、岩盤や地層がずれたもの」',
        options: ['断層', 'プレート', '震央'],
        answer: 'a',
        explanation: '岩盤や地層がずれたものを**断層**といいます。断層がずれると地震が起こります。今後もずれる可能性のある断層は活断層です。',
        hint: '「断」は「たち切る」という意味だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（確認問題 checkPool をふくむ）
  // ================================================================

  const concepts = [
    {
      id: 'vo-magma', title: 'マグマと火山の形', basic: null, lessonStageId: 'volcano-1',
      checkPool: [
        choice({
          id: 'vo-magma-k1', concept: 'vo-magma',
          prompt: '雲仙普賢岳のように、溶岩が盛り上がった形の火山のマグマのねばりけは？',
          options: ['強い', '弱い', 'ねばりけは関係ない'],
          answer: 'a',
          explanation: 'ねばりけが強いマグマは流れにくいので、火口のまわりに盛り上がった形になります。溶岩は白っぽく、噴火は爆発的になりやすいです。',
          hint: '流れにくいと、どんな形になるか考えよう。',
        }),
        fill({
          id: 'vo-magma-k2', concept: 'vo-magma',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'マグマのねばりけが強い火山は、溶岩の色が[b1]、噴火のようすは[b2]になりやすい。',
          blanks: [
            word('b1', ['白っぽく', '黒っぽく'], '白っぽく'),
            word('b2', ['爆発的', 'おだやか'], '爆発的'),
          ],
          explanation: 'ねばりけが強いマグマからできる溶岩は白っぽく、ガスがぬけにくいので爆発的な噴火になりやすいです。ねばりけが弱いと、その反対になります。',
          hint: '雲仙普賢岳のような火山を思い出そう。',
        }),
        choice({
          id: 'vo-magma-k3', concept: 'vo-magma',
          prompt: 'マウナロアのように、傾斜がゆるやかで平たく広がった形の火山の特ちょうはどれ？',
          options: ['溶岩が白っぽく、爆発的に噴火する', '溶岩が黒っぽく、おだやかに噴火する', '溶岩が流れず、その場で盛り上がる'],
          answer: 'b',
          explanation: '傾斜がゆるやかな火山は、ねばりけが弱いマグマでできています。溶岩はよく流れ、黒っぽく、噴火はおだやかになりやすいです。',
          hint: 'ねばりけが弱いマグマの火山だよ。',
        }),
      ],
    },
    {
      id: 'vo-igneous', title: '火山岩と深成岩', basic: 'vo-magma', lessonStageId: 'volcano-2',
      checkPool: [
        choice({
          id: 'vo-igneous-k1', concept: 'vo-igneous',
          prompt: '深成岩のつくりが等粒状組織になるのはなぜ？',
          options: ['地表で急に冷えて固まったから', '地下深くでゆっくり冷えて、鉱物が大きく育ったから', '水の中で砂が積もったから'],
          answer: 'b',
          explanation: '深成岩は地下深くで長い時間をかけてゆっくり冷えるので、どの鉱物も大きく育ちます。そのため、同じくらいの大きさの鉱物が組み合わさった等粒状組織になります。',
          hint: '冷えるのにかかる時間を考えよう。',
        }),
        choice({
          id: 'vo-igneous-k2', concept: 'vo-igneous',
          prompt: '次のうち、火山岩だけを集めたものはどれ？',
          options: ['花こう岩・閃緑岩・斑れい岩', '流紋岩・安山岩・玄武岩', '花こう岩・安山岩・斑れい岩'],
          answer: 'b',
          explanation: '火山岩は流紋岩・安山岩・玄武岩、深成岩は花こう岩・閃緑岩・斑れい岩です。',
          hint: '安山岩の「山」は火山の「山」と覚えよう。',
        }),
        fill({
          id: 'vo-igneous-k3', concept: 'vo-igneous',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'マグマが冷えて固まった岩石を[b1]という。そのうち、地下深くでゆっくり冷えて固まったものを[b2]という。',
          blanks: [
            word('b1', ['火成岩', '火山岩', '深成岩'], '火成岩'),
            word('b2', ['火成岩', '火山岩', '深成岩'], '深成岩'),
          ],
          explanation: 'マグマが冷えて固まった岩石をまとめて火成岩といいます。火成岩は、冷え方によって火山岩と深成岩に分けられます。',
          hint: '「火成岩」が全体の名前だよ。',
        }),
      ],
    },
    {
      id: 'vo-mineral', title: '鉱物', basic: 'vo-igneous', lessonStageId: 'volcano-2',
      checkPool: [
        choice({
          id: 'vo-mineral-k1', concept: 'vo-mineral',
          prompt: '火山灰を水でよく洗って、ルーペや双眼実体顕微鏡で見ると見える、結晶になった粒を何という？',
          options: ['鉱物', '化石', '石基'],
          answer: 'a',
          explanation: 'マグマが冷えてできた結晶の粒を鉱物といいます。火山灰を水で洗うと、どろが流れて鉱物の粒が残り、観察しやすくなります。',
          hint: 'セキエイやチョウ石のなかまの呼び名だよ。',
        }),
        choice({
          id: 'vo-mineral-k2', concept: 'vo-mineral',
          prompt: '次の鉱物のうち、有色鉱物ではないものはどれ？',
          options: ['キ石', 'チョウ石', 'カクセン石', 'カンラン石'],
          answer: 'b',
          explanation: 'チョウ石は白色やうすもも色の無色鉱物です。キ石・カクセン石・カンラン石は、緑色や黒色などの有色鉱物です。',
          hint: '無色鉱物はセキエイとチョウ石だったね。',
        }),
        choice({
          id: 'vo-mineral-k3', concept: 'vo-mineral',
          prompt: '流紋岩と玄武岩をくらべると、白っぽいのはどちら？',
          options: ['流紋岩（無色鉱物が多い）', '玄武岩（無色鉱物が多い）', 'どちらも同じ色'],
          answer: 'a',
          explanation: '流紋岩は無色鉱物を多くふくむので白っぽく、玄武岩は有色鉱物を多くふくむので黒っぽい火山岩です。',
          hint: '火山岩を白っぽい順に並べると、流紋岩・安山岩・玄武岩だよ。',
        }),
      ],
    },
    {
      id: 'vo-wave', title: 'P波・S波と初期微動継続時間', basic: null, lessonStageId: 'volcano-3',
      checkPool: [
        choice({
          id: 'vo-wave-k1', concept: 'vo-wave',
          prompt: '初期微動継続時間と、震源からの距離の関係として正しいものはどれ？',
          options: ['震源から遠いほど長くなる', '震源から遠いほど短くなる', '震源からの距離に関係なく同じ'],
          answer: 'a',
          explanation: 'P波と S波は速さがちがうので、遠くまで伝わるほど着く時間の差が開きます。だから、震源から遠いほど初期微動継続時間は長くなります。',
          hint: '速い人とおそい人が走ると、長い距離ほど差が開くね。',
        }),
        fill({
          id: 'vo-wave-k2', concept: 'vo-wave',
          prompt: '空らんに入る数を入れよう。',
          text: 'P波の速さを 6 km/s とする。震源から 90 km はなれた地点に P波が着くのは、地震が発生してから[b1]後である。',
          blanks: [number('b1', 15, 0, '秒')],
          explanation: '時間 ＝ 距離 ÷ 速さ なので、90 km ÷ 6 km/s ＝ 15 s です。',
          hint: '距離を速さでわろう。',
        }),
        choice({
          id: 'vo-wave-k3', concept: 'vo-wave',
          prompt: '地震のゆれの伝わり方として、正しいものはどれ？',
          options: ['震央から、地表だけを伝わる', '震源から、まわりへほぼ同心円状に伝わる', 'いろいろな場所に同時に伝わる'],
          answer: 'b',
          explanation: '地震のゆれは震源から、まわりへほぼ同心円状に広がっていきます。そのため、震源に近い地点ほど早くゆれ始めます。',
          hint: '水面に石を落としたときの波の広がり方を思い出そう。',
        }),
      ],
    },
    {
      id: 'vo-scale', title: '震度とマグニチュード', basic: 'vo-wave', lessonStageId: 'volcano-4',
      checkPool: [
        choice({
          id: 'vo-scale-k1', concept: 'vo-scale',
          prompt: '震源の深さが同じ 2 つの地震で、マグニチュードの大きい地震のほうが、ふつうはどうなる？',
          options: ['ゆれる範囲がせまくなる', '強くゆれる範囲が広くなる', 'どこでも震度 0 になる'],
          answer: 'b',
          explanation: 'マグニチュードが大きい地震はエネルギーが大きいので、強くゆれる範囲が広くなります。',
          hint: 'エネルギーが大きいと、ゆれはどこまで届くかな。',
        }),
        choice({
          id: 'vo-scale-k2', concept: 'vo-scale',
          prompt: 'マグニチュードについて、正しいものはどれ？',
          options: ['値が 2 倍になると、エネルギーも 2 倍になる', '値が 1 大きくなると、エネルギーは約 32 倍になる', 'ゆれた場所ごとに値がちがう'],
          answer: 'b',
          explanation: 'マグニチュードは 1 大きくなるとエネルギーが約 32 倍、2 大きくなると約 1000 倍になります。数のちがいが小さくても、エネルギーは大きくちがいます。',
          hint: '値が少しちがうだけで、エネルギーは大きくちがうよ。',
        }),
        fill({
          id: 'vo-scale-k3', concept: 'vo-scale',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '地面のようすが同じなら、震度はふつう、震央から[b1]ほど大きい。',
          blanks: [word('b1', ['近い', '遠い'], '近い')],
          explanation: 'ゆれは震源から伝わるうちに弱まるので、ふつうは震央に近いほど震度が大きくなります。ただし、地面のようすによっても震度は変わります。',
          hint: 'ゆれは伝わるうちにどうなるかな。',
        }),
      ],
    },
    {
      id: 'vo-plate', title: 'プレートと地震', basic: 'vo-scale', lessonStageId: 'volcano-4',
      checkPool: [
        choice({
          id: 'vo-plate-k1', concept: 'vo-plate',
          prompt: '海溝の近くで起こる大きな地震（海溝型の地震）は、どのようにして起こる？',
          options: ['海洋プレートに引きずりこまれた大陸プレートが、はね返って起こる', '火山の噴火だけで起こる', '海の波が海底をたたいて起こる'],
          answer: 'a',
          explanation: '沈みこむ海洋プレートに大陸プレートが引きずりこまれてひずみがたまり、それがはね返るときに大きな地震が起こります。',
          hint: 'プレートどうしの境目で何が起きているか考えよう。',
        }),
        fill({
          id: 'vo-plate-k2', concept: 'vo-plate',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '日本付近では、[b1]プレートが[b2]プレートの下に沈みこんでいる。',
          blanks: [
            word('b1', ['海洋', '大陸'], '海洋'),
            word('b2', ['海洋', '大陸'], '大陸'),
          ],
          explanation: '太平洋側の海洋プレートが、日本列島のある大陸プレートの下に沈みこんでいます。この動きが、日本で地震が多い理由の 1 つです。',
          hint: '海溝でもぐりこむのは、海側のプレートだよ。',
        }),
        choice({
          id: 'vo-plate-k3', concept: 'vo-plate',
          prompt: '地震のとき、うめ立て地などで地面が急にやわらかくなり、どろ水がふき出すことがあります。この現象を何という？',
          options: ['津波', '液状化', '隆起'],
          answer: 'b',
          explanation: '強いゆれで、水をふくんだ砂の地面が液体のようにやわらかくなる現象を液状化といいます。建物がかたむくなどの被害が出ることがあります。',
          hint: '地面が「液体」のようになる現象だよ。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'volcano',
    title: '火山と地震',
    mascot: 'D',   // 担当の先生（もくもく先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'volcano', title: '火山', order: 1, stages: [volcano1, volcano2] },
      { id: 'quake', title: '地震', order: 2, stages: [volcano3, volcano4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
