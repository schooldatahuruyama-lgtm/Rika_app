// 「電流とその利用」教材データ（中学2年 理科・物理）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」）。
// 2 領域 × 2 ステージ（回路と電流・電圧、電気のはたらき）と、概念 6 つ。
// 図（scene）の item は js/figures.js の汎用の部品（docs/figures-guide.md）で描く。座標は x 右向き・y 下向き、場面は 320×240。
// 回路図は symbol（電気用図記号）と line（導線）で描く。電流計・電圧計の symbol は回すと文字も回るので、横向きの導線にだけ置く。
// drag の解答 { x, y } は動かす部品の基準点（circle なら中心）。samples は手計算した正解例・不正解例。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
(function (root) {
  'use strict';

  // ---- 書きやすくするための小さな道具（content/light.js と同じ） ----

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

  // ---- 電流の単元の図の道具 ----

  // 導線（記号の線と同じ太さ 2）
  function wire(points) { return { type: 'line', points, width: 2 }; }

  // 導線のつなぎ目（枝分かれする点）
  function dot(x, y) { return { type: 'circle', x, y, r: 3, fill: 'ink', stroke: 'ink' }; }

  // 回路図の記号（kind は docs/figures-guide.md の symbol の表）
  function sym(kind, x, y, rotate) {
    const s = { type: 'symbol', kind, x, y };
    if (rotate) s.rotate = rotate;
    return s;
  }

  // 小さな文字（中央寄せ）
  function note(x, y, text, size) { return { type: 'text', x, y, text, size: size || 13, anchor: 'middle' }; }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/electricity/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/electricity/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // グラフの軸と方眼（原点 (50,200)。横 1 目盛り 40px、縦 1 目盛り 25px）
  // xTicks・yTicks は目盛りの文字の配列（'' なら文字を書かず方眼だけ）
  function axes(xName, yName, xTicks, yTicks) {
    const items = [
      { type: 'line', points: [[50, 200], [305, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [50, 28]], width: 2, arrow: true },
      { type: 'text', x: 8, y: 22, text: yName, size: 12 },
      { type: 'text', x: 312, y: 236, text: xName, size: 12, anchor: 'end' },
      { type: 'text', x: 42, y: 216, text: '0', size: 12, anchor: 'end' },
    ];
    xTicks.forEach((t, i) => {
      const gx = 50 + 40 * (i + 1);
      items.push({ type: 'line', points: [[gx, 200], [gx, 50]], color: 'gray', width: 1, dashed: true });
      if (t) items.push({ type: 'text', x: gx, y: 218, text: t, size: 12, anchor: 'middle' });
    });
    yTicks.forEach((t, i) => {
      const gy = 200 - 25 * (i + 1);
      items.push({ type: 'line', points: [[50, gy], [290, gy]], color: 'gray', width: 1, dashed: true });
      if (t) items.push({ type: 'text', x: 42, y: gy + 5, text: t, size: 12, anchor: 'end' });
    });
    return items;
  }

  // 電圧と電流のグラフ（横 1 V ＝ 40px、縦 0.1 A ＝ 25px）。
  // 電熱線 a は 10 Ω（5 V で 0.5 A → (250,75)）、電熱線 b は 20 Ω（5 V で 0.25 A → (250,137.5)）
  function viGraph() {
    return axes('電圧〔V〕', '電流〔A〕', ['1', '2', '3', '4', '5', '6'], ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6'])
      .concat([
        { type: 'line', points: [[50, 200], [250, 75]], color: 'blue', width: 3 },
        { type: 'line', points: [[50, 200], [250, 137.5]], color: 'green', width: 3 },
      ]);
  }

  // 時間と水の上昇温度のグラフの軸（縦の目盛りの数は書かない）
  function heatAxes() {
    return axes('時間〔分〕', '上昇温度〔℃〕', ['1', '2', '3', '4', '5'], ['', '', '', '', '', '']);
  }

  // 導線の断面（紙の表から裏へ電流が流れる ×印）
  function wireIn(x, y) {
    return [
      { type: 'circle', x, y, r: 10, fill: 'white', stroke: 'ink' },
      { type: 'line', points: [[x - 6, y - 6], [x + 6, y + 6]], width: 2 },
      { type: 'line', points: [[x - 6, y + 6], [x + 6, y - 6]], width: 2 },
    ];
  }

  // ================================================================
  // 領域 1: 回路と電流・電圧
  // ================================================================

  // ---- ステージ elec-1: 回路図と電流・電圧 ----
  const elec1 = {
    id: 'elec-1', areaId: 'circuit', title: '回路図と電流・電圧', minutes: 5, concepts: ['el-circuit', 'el-rule'],
    lessons: [
      {
        id: 'elec-1-c1',
        text: '電流が流れる道すじを**回路**といいます。回路は、**電気用図記号**を使った**回路図**で表します。電池の記号は、長い線が＋極、短い線が−極です。電流は電池の＋極から出て、回路を通って−極へ流れます。',
        // 6 つの電気用図記号
        figure: scene([
          // 記号の label（下 24px）は記号と重なるので、文字は text で 36px 下に書く
          sym('battery', 60, 70), sym('bulb', 160, 70), sym('resistor', 260, 70),
          sym('switch', 60, 160), sym('ammeter', 160, 160), sym('voltmeter', 260, 160),
          note(60, 108, '電池', 14), note(160, 108, '豆電球', 14), note(260, 108, '抵抗', 14),
          note(60, 198, 'スイッチ', 14), note(160, 198, '電流計', 14), note(260, 198, '電圧計', 14),
          note(50, 46, '＋', 14), note(72, 46, '−', 14),
        ]),
      },
      {
        id: 'elec-1-c2',
        text: '電流の大きさは**電流計**ではかり、はかりたい部分に**直列**につなぎます。電圧の大きさは**電圧計**ではかり、はかりたい部分に**並列**につなぎます。電流の単位は**アンペア**（A）、電圧の単位は**ボルト**（V）です。1 A ＝ 1000 mA です。',
        // 電流計は抵抗と一列（直列）、電圧計は抵抗の両はしにつなぐ（並列）
        figure: scene([
          sym('ammeter', 100, 70),
          sym('resistor', 210, 70),
          sym('voltmeter', 210, 25),
          sym('battery', 160, 190),
          wire([[80, 70], [40, 70], [40, 190], [140, 190]]),
          wire([[120, 70], [190, 70]]),
          wire([[230, 70], [280, 70], [280, 190], [180, 190]]),
          wire([[175, 70], [175, 25], [190, 25]]),
          wire([[230, 25], [245, 25], [245, 70]]),
          dot(175, 70), dot(245, 70),
          note(100, 104, '電流計（直列）'),
          note(210, 100, '抵抗'),
          { type: 'text', x: 166, y: 30, text: '電圧計（並列）', size: 13, anchor: 'end' },
          note(160, 224, '電池'),
        ]),
      },
      {
        id: 'elec-1-c3',
        text: '電流計の−端子は 5 A・500 mA・50 mA、電圧計の−端子は 300 V・15 V・3 V の 3 つがあります。はかる値の大きさが分からないときは、針がふり切れないように、いちばん大きい値の端子からつなぎます。',
        // 写真: 電流計の正面。下の端子は左から黒い−端子 3 つ (85, 162)・(136, 162)・(186, 162) と赤い＋端子 (236, 162)。
        // −端子は左から 5 A・500 mA・50 mA とした（写真の端子には文字がない）。最初は 5 A の端子（だいだい色の輪）
        figure: scene([
          photo('elec-1-c3'),
          { type: 'circle', x: 85, y: 162, r: 22, fill: 'none', stroke: 'orange' },
          tag(85, 199, '5 A', { size: 13 }),
          pointer(136, 184, 136, 206), tag(136, 218, '500 mA', { size: 13 }),
          tag(186, 199, '50 mA', { size: 13 }),
          tag(236, 199, '＋', { size: 13, bold: true }),
          tag(160, 236, '最初は 5 A の端子につなぐ', { size: 13 }),
        ]),
      },
      {
        id: 'elec-1-c4',
        anim: 'el-series-parallel',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '**直列回路**では、電流の大きさはどこでも同じで、各部分の電圧の和が電源の電圧になります。**並列回路**では、各部分の電圧は電源の電圧と同じで、枝分かれした電流の和が、分かれる前の電流になります。',
        // 左: 直列（どこも 0.2 A）、右: 並列（0.3 A ＋ 0.2 A ＝ 0.5 A）
        figure: scene([
          sym('bulb', 50, 50), sym('bulb', 110, 50), sym('battery', 80, 170),
          wire([[60, 170], [15, 170], [15, 50], [30, 50]]),
          wire([[70, 50], [90, 50]]),
          wire([[130, 50], [145, 50], [145, 170], [100, 170]]),
          note(50, 32, '0.2 A', 12), note(110, 32, '0.2 A', 12), note(80, 150, '0.2 A', 12),
          note(80, 228, '直列回路', 14),
          sym('bulb', 240, 50), sym('bulb', 240, 110), sym('battery', 240, 190),
          wire([[220, 190], [175, 190], [175, 50], [220, 50]]),
          wire([[260, 50], [305, 50], [305, 190], [260, 190]]),
          wire([[175, 110], [220, 110]]),
          wire([[260, 110], [305, 110]]),
          dot(175, 110), dot(305, 110),
          note(240, 32, '0.3 A', 12), note(240, 92, '0.2 A', 12),
          { type: 'text', x: 182, y: 160, text: '0.5 A', size: 12 },
          note(240, 228, '並列回路', 14),
        ]),
      },
    ],
    warmup: choice({
      id: 'elec-1-w1', concept: 'el-circuit',
      prompt: '予想しよう。豆電球に流れる電流の大きさを電流計ではかりたい。電流計は、豆電球に対してどのようにつなぐと思う？',
      options: ['豆電球と一列になるようにつなぐ', '豆電球の両はしに、枝分かれさせてつなぐ', 'どちらのつなぎ方でもよい'],
      answer: 'a',
      explanation: '電流計は、はかりたい部分と一列になるように（直列に）つなぎます。電流計と電圧計のつなぎ方のちがいを、このステージで確かめよう。',
      hint: 'はかりたい電流が、電流計の中を通るようにするには？',
    }),
    problems: [
      figureChoice({
        id: 'elec-1-p1', concept: 'el-circuit',
        prompt: '回路のア・イ・ウの丸は、電流計か電圧計のどちらかです。アは抵抗と一列につながり、イは抵抗の両はしに、ウは電池の両はしにつながっています。電流計はどれ？',
        // ア: 直列（電流計）、イ: 抵抗に並列、ウ: 電池に並列（どちらも電圧計）。丸は記号の文字を書かない symbol（丸だけ、半径 14）
        figure: scene([
          { type: 'symbol', kind: 'meter', x: 100, y: 80 },
          sym('resistor', 200, 80),
          { type: 'symbol', kind: 'meter', x: 200, y: 32 },
          sym('battery', 160, 160),
          { type: 'symbol', kind: 'meter', x: 160, y: 205 },
          wire([[86, 80], [50, 80], [50, 160], [140, 160]]),
          wire([[114, 80], [180, 80]]),
          wire([[220, 80], [270, 80], [270, 160], [180, 160]]),
          wire([[165, 80], [165, 32], [186, 32]]),
          wire([[214, 32], [235, 32], [235, 80]]),
          wire([[125, 160], [125, 205], [146, 205]]),
          wire([[174, 205], [195, 205], [195, 160]]),
          dot(165, 80), dot(235, 80), dot(125, 160), dot(195, 160),
          note(200, 108, '抵抗'),
          { type: 'region', id: 'r1', x: 100, y: 80, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 200, y: 32, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 160, y: 205, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '電流計は、はかりたい部分と一列（直列）につなぐので、アが電流計です。イとウは枝分かれして両はしにつながっている（並列）ので、電圧計です。',
        hint: 'はかりたい部分と一列につながっている丸をさがそう。',
      }),
      fill({
        id: 'elec-1-t1', concept: 'el-circuit', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電流の大きさの単位は[b1]（記号 A）、電圧の大きさの単位は[b2]（記号 V）である。',
        blanks: [
          word('b1', ['アンペア', 'ボルト', 'オーム'], 'アンペア'),
          word('b2', ['アンペア', 'ボルト', 'オーム'], 'ボルト'),
        ],
        explanation: '電流の単位は**アンペア**（A）、電圧の単位は**ボルト**（V）です。オーム（Ω）は抵抗の単位で、次のステージで学びます。',
        hint: '記号の A と V の読み方を思い出そう。',
      }),
      drag({
        id: 'elec-1-p2', concept: 'el-circuit',
        prompt: '豆電球 X と豆電球 Y を並列につないだ回路です。豆電球 Y だけに流れる電流をはかりたい。電流計（A の丸）を左右に動かして、電流計をつなぐ導線の上に置こう。',
        // 印は y=160 の高さを左右に動く。x=40 は電池の導線（全体の電流）、x=130 は X の枝、x=220 は Y の枝（正解）。
        // 不正解例は X の枝 x=130（90 はなれる）
        figure: scene([
          sym('battery', 40, 120, 90),
          sym('bulb', 130, 120, 90),
          sym('bulb', 220, 120, 90),
          wire([[40, 100], [40, 50], [220, 50], [220, 100]]),
          wire([[220, 140], [220, 190], [40, 190], [40, 140]]),
          wire([[130, 50], [130, 100]]),
          wire([[130, 140], [130, 190]]),
          dot(130, 50), dot(130, 190),
          { type: 'text', x: 148, y: 126, text: 'X' },
          { type: 'text', x: 238, y: 126, text: 'Y' },
          { type: 'circle', id: 'am', x: 290, y: 160, r: 16, fill: 'white', stroke: 'blue', label: 'A' },
        ]),
        draggable: { itemId: 'am', axis: 'x' },
        target: { x: 220, y: 160 },
        samples: { correct: { x: 220, y: 160 }, wrong: { x: 130, y: 160 } },
        explanation: '豆電球 Y だけに流れる電流は、Y の枝の導線を通ります。だから電流計は Y と一列になるように、Y の枝につなぎます。電池の近くの導線には、X と Y の電流を合わせた電流が流れます。',
        hint: '豆電球 Y を通る電流だけが流れる導線はどこかな。',
      }),
      fill({
        id: 'elec-1-p3', concept: 'el-circuit',
        prompt: '空らんに入る数を入れよう。',
        text: '500 mA は[b1]である。',
        blanks: [number('b1', 0.5, 0, 'A')],
        explanation: '1 A ＝ 1000 mA なので、500 mA は 1000 mA の半分で 0.5 A です。mA を A になおすときは、1000 でわります。',
        hint: '1 A は何 mA だったかな。',
      }),
      fill({
        id: 'elec-1-p4', concept: 'el-rule',
        prompt: '豆電球 2 個を直列につないだ回路があります。空らんに入る数を入れよう。',
        text: '電源の電圧が 6.0 V で、一方の豆電球に加わる電圧が 2.5 V のとき、もう一方の豆電球に加わる電圧は[b1]である。',
        blanks: [number('b1', 3.5, 0.05, 'V')],
        explanation: '直列回路では、各部分の電圧の和が電源の電圧になります。6.0 − 2.5 ＝ 3.5 V です。',
        hint: '直列回路では、2 つの豆電球の電圧をたすと電源の電圧になるよ。',
      }),
      fill({
        id: 'elec-1-p5', concept: 'el-rule',
        prompt: '豆電球 X と Y を並列につないだ回路があります。空らんに入る数を入れよう。',
        text: 'X に 0.3 A、Y に 0.2 A の電流が流れているとき、枝分かれする前の導線に流れる電流は[b1]である。',
        blanks: [number('b1', 0.5, 0.01, 'A')],
        explanation: '並列回路では、枝分かれした電流の和が、分かれる前の電流になります。0.3 ＋ 0.2 ＝ 0.5 A です。',
        hint: '川が 2 つに分かれて、また合流するようすを思いうかべよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'elec-1-r1', concept: 'el-circuit',
        prompt: '回路に流れる電流の大きさが予想できないとき、電流計の−端子は、はじめにどれにつなぐ？',
        options: ['5 A', '500 mA', '50 mA'],
        answer: 'a',
        explanation: '小さい値の端子に大きな電流が流れると、針がふり切れて電流計がこわれることがあります。はじめはいちばん大きい 5 A の端子につなぎ、針のふれが小さければ 500 mA、50 mA と変えます。',
        hint: '針がふり切れないようにするには、大きいほう・小さいほうのどちらからかな。',
      }),
      choice({
        id: 'elec-1-r2', concept: 'el-circuit',
        prompt: '豆電球に加わる電圧をはかるとき、電圧計はどのようにつなぐ？',
        options: ['豆電球に並列につなぐ', '豆電球に直列につなぐ', '電池の＋極だけにつなぐ'],
        answer: 'a',
        explanation: '電圧計は、はかりたい部分の両はしに、並列につなぎます。電流計は直列、電圧計は並列とセットで覚えよう。',
        hint: '電圧は「2 点のあいだ」の電気の差だよ。',
      }),
      choice({
        id: 'elec-1-r3', concept: 'el-rule',
        prompt: '豆電球 2 個を直列につないだ回路で、回路を流れる電流の大きさはどうなっている？',
        options: ['どこでも同じ', '電池に近いほど大きい', '豆電球を通るたびに小さくなる'],
        answer: 'a',
        explanation: '直列回路は電流の道すじが 1 本なので、電流の大きさはどこでも同じです。豆電球で電流が使われてなくなるわけではありません。',
        hint: '道すじが 1 本の回路では、電流が分かれるところがあるかな。',
      }),
      fill({
        id: 'elec-1-r4', concept: 'el-rule',
        prompt: '豆電球 2 個を並列につなぎ、電源の電圧を 3.0 V にしました。空らんに入る数を入れよう。',
        text: '一方の豆電球に加わる電圧は[b1]である。',
        blanks: [number('b1', 3, 0.05, 'V')],
        explanation: '並列回路では、各部分に加わる電圧は電源の電圧と同じです。だから 3.0 V です。',
        hint: '並列回路では、どの枝にも電源と同じ電圧が加わるよ。',
      }),
      choice({
        id: 'elec-1-t2', concept: 'el-rule', term: true,
        prompt: '次の説明に合う言葉はどれ？「電流の道すじが枝分かれせず、1 本の道すじでつながっている回路」',
        options: ['直列回路', '並列回路', '回路図'],
        answer: 'a',
        explanation: '電流の道すじが 1 本の回路を**直列回路**、枝分かれしている回路を**並列回路**といいます。',
        hint: '豆電球が一列にならぶつなぎ方だよ。',
      }),
    ],
  };

  // ---- ステージ elec-2: オームの法則 ----
  const elec2 = {
    id: 'elec-2', areaId: 'circuit', title: 'オームの法則', minutes: 5, concepts: ['el-ohm'],
    lessons: [
      {
        id: 'elec-2-c1',
        text: '電熱線に加える電圧と、流れる電流は**比例**します。これを**オームの法則**といいます。電流の流れにくさを**抵抗**（電気抵抗）といい、単位は**オーム**（記号 Ω）です。電圧〔V〕＝ 抵抗〔Ω〕× 電流〔A〕です。',
        // 覚え方の三角形と、3 つの式
        figure: scene([
          { type: 'polygon', points: [[90, 40], [30, 180], [150, 180]], fill: 'sky' },
          { type: 'line', points: [[51, 130], [129, 130]], width: 2 },
          { type: 'line', points: [[90, 130], [90, 180]], width: 2 },
          { type: 'text', x: 90, y: 112, text: 'V', size: 24, anchor: 'middle', bold: true },
          { type: 'text', x: 68, y: 166, text: 'R', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 112, y: 166, text: 'I', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 180, y: 80, text: 'V ＝ R × I', size: 16 },
          { type: 'text', x: 180, y: 120, text: 'R ＝ V ÷ I', size: 16 },
          { type: 'text', x: 180, y: 160, text: 'I ＝ V ÷ R', size: 16 },
          note(160, 220, 'V: 電圧〔V〕　R: 抵抗〔Ω〕　I: 電流〔A〕'),
        ]),
      },
      {
        id: 'elec-2-c2',
        text: '電圧と電流のグラフは、原点を通る直線になります。同じ電圧を加えたとき、電流が小さいほうが、**抵抗**が大きい（電流が流れにくい）電熱線です。グラフの直線のかたむきが大きいほど、抵抗は小さくなります。',
        // 電熱線 a（10 Ω）と b（20 Ω）
        figure: scene([
          ...viGraph(),
          { type: 'text', x: 232, y: 70, text: 'a', size: 16, bold: true },
          { type: 'text', x: 258, y: 142, text: 'b', size: 16, bold: true },
        ]),
      },
      {
        id: 'elec-2-c3',
        text: '抵抗を**直列**につなぐと、全体の抵抗は各抵抗の和になります（10 Ω ＋ 20 Ω ＝ 30 Ω）。抵抗を**並列**につなぐと、全体の抵抗は各抵抗より小さくなります。10 Ω を 2 個並列につなぐと、全体は 5 Ω です。',
        // 上: 直列、下: 並列
        figure: scene([
          { type: 'text', x: 20, y: 66, text: '直列', bold: true },
          wire([[70, 60], [100, 60]]),
          sym('resistor', 120, 60),
          wire([[140, 60], [170, 60]]),
          sym('resistor', 190, 60),
          wire([[210, 60], [240, 60]]),
          note(120, 44, '10 Ω'), note(190, 44, '20 Ω'),
          note(155, 96, '全体 30 Ω', 14),
          { type: 'text', x: 20, y: 176, text: '並列', bold: true },
          wire([[70, 170], [90, 170]]),
          wire([[90, 145], [90, 195]]),
          wire([[90, 145], [100, 145]]),
          sym('resistor', 120, 145),
          wire([[140, 145], [150, 145]]),
          wire([[90, 195], [100, 195]]),
          sym('resistor', 120, 195),
          wire([[140, 195], [150, 195]]),
          wire([[150, 145], [150, 195]]),
          wire([[150, 170], [170, 170]]),
          dot(90, 170), dot(150, 170),
          note(120, 132, '10 Ω'), note(120, 183, '10 Ω'),
          { type: 'text', x: 185, y: 166, text: '全体 5 Ω', size: 14 },
          { type: 'text', x: 185, y: 188, text: '（各抵抗より小さい）', size: 12 },
        ]),
      },
      {
        id: 'elec-2-c4',
        text: '銅やアルミニウムなどの金属のように、抵抗が小さく電流を通しやすい物質を**導体**といいます。ガラスやゴムのように、抵抗がきわめて大きく、電流をほとんど通さない物質を**不導体**（**絶縁体**）といいます。',
        // 電気のコード: 中の銅線（導体）と、まわりのビニル（不導体）
        figure: scene([
          { type: 'rect', x: 30, y: 70, width: 220, height: 50, fill: 'gray', rx: 20 },
          { type: 'rect', x: 40, y: 88, width: 270, height: 14, fill: 'brown' },
          { type: 'text', x: 30, y: 60, text: 'まわり: ゴム・ビニル（不導体）', size: 14 },
          { type: 'text', x: 310, y: 142, text: '中: 銅（導体）', size: 14, anchor: 'end' },
          { type: 'text', x: 20, y: 186, text: '導体: 銅・アルミニウム・鉄', size: 14 },
          { type: 'text', x: 20, y: 214, text: '不導体: ガラス・ゴム・プラスチック', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'elec-2-w1', concept: 'el-ohm',
      prompt: '予想しよう。電熱線に加える電圧を 2 倍にすると、流れる電流はどうなると思う？',
      options: ['約 2 倍になる', '変わらない', '約半分になる'],
      answer: 'a',
      explanation: '電圧と電流は比例するので、電圧を 2 倍にすると電流も約 2 倍になります。このきまりを、このステージでくわしく学ぼう。',
      hint: '電流を流そうとするはたらきが大きくなると、電流はどうなるかな。',
    }),
    problems: [
      fill({
        id: 'elec-2-p1', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '電熱線に 6 V の電圧を加えると、2 A の電流が流れた。この電熱線の抵抗は[b1]である。',
        blanks: [number('b1', 3, 0.01, 'Ω')],
        explanation: '抵抗〔Ω〕＝ 電圧〔V〕÷ 電流〔A〕なので、6 ÷ 2 ＝ 3 Ω です。',
        hint: 'R ＝ V ÷ I を使おう。',
      }),
      fill({
        id: 'elec-2-t1', concept: 'el-ohm', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電熱線に流れる電流は、加わる電圧に比例する。この関係を[b1]という。電流の流れにくさを[b2]という。',
        blanks: [
          word('b1', ['オームの法則', 'フックの法則', '反射の法則'], 'オームの法則'),
          word('b2', ['抵抗', '電力', '電圧'], '抵抗'),
        ],
        explanation: '電圧と電流が比例する関係を**オームの法則**といいます。電流の流れにくさを**抵抗**（電気抵抗）といい、単位はオーム（Ω）です。',
        hint: '単位の Ω（オーム）と同じ名前の法則だよ。',
      }),
      figureChoice({
        id: 'elec-2-p2', concept: 'el-ohm',
        prompt: 'グラフは、2 つの電熱線に加えた電圧と、流れた電流の関係です。アは青い直線、イは緑の直線の電熱線です。抵抗が小さいのはどちら？',
        // 青 a（10 Ω）と緑 b（20 Ω）。region は直線の終わりのすぐ先に置く
        figure: scene([
          ...viGraph(),
          { type: 'region', id: 'r1', x: 272, y: 61, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 275, y: 130, r: 22, label: 'イ' },
        ]),
        answer: 'r1',
        explanation: '同じ電圧を加えたとき、アのほうが大きな電流が流れています。電流が流れやすいので、アのほうが抵抗が小さい電熱線です。直線のかたむきが大きいほど、抵抗は小さくなります。',
        hint: '横軸の同じ電圧のところで、電流が大きいのはどちらか比べよう。',
      }),
      fill({
        id: 'elec-2-p3', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '20 Ω の抵抗に 0.3 A の電流を流すには、[b1]の電圧を加えればよい。',
        blanks: [number('b1', 6, 0.01, 'V')],
        explanation: '電圧〔V〕＝ 抵抗〔Ω〕× 電流〔A〕なので、20 × 0.3 ＝ 6 V です。',
        hint: 'V ＝ R × I を使おう。',
      }),
      fill({
        id: 'elec-2-p4', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '10 Ω の抵抗と 20 Ω の抵抗を直列につなぐと、全体の抵抗は[b1]になる。',
        blanks: [number('b1', 30, 0, 'Ω')],
        explanation: '直列につないだときの全体の抵抗は、各抵抗の和です。10 ＋ 20 ＝ 30 Ω です。',
        hint: '直列では、抵抗をたし算するよ。',
      }),
      choice({
        id: 'elec-2-p5', concept: 'el-ohm',
        prompt: '10 Ω の抵抗を 2 個、並列につなぎました。全体の抵抗はいくつ？',
        options: ['20 Ω', '10 Ω', '5 Ω'],
        answer: 'c',
        explanation: '並列につなぐと電流の通り道が 2 本になり、流れやすくなるので、全体の抵抗は各抵抗より小さくなります。同じ 10 Ω を 2 個並列につなぐと、半分の 5 Ω です。',
        hint: '並列につなぐと、全体の抵抗は 1 個のときより大きくなる？小さくなる？',
      }),
    ],
    retryPool: [
      fill({
        id: 'elec-2-r1', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '4 Ω の抵抗に 12 V の電圧を加えると、流れる電流は[b1]である。',
        blanks: [number('b1', 3, 0.01, 'A')],
        explanation: '電流〔A〕＝ 電圧〔V〕÷ 抵抗〔Ω〕なので、12 ÷ 4 ＝ 3 A です。',
        hint: 'I ＝ V ÷ R を使おう。',
      }),
      fill({
        id: 'elec-2-r2', concept: 'el-ohm',
        prompt: 'グラフは、電熱線 a（青）と b（緑）の電圧と電流の関係です。グラフを読んで、空らんに入る数を入れよう。',
        figure: scene([
          ...viGraph(),
          { type: 'text', x: 232, y: 70, text: 'a', size: 16, bold: true },
          { type: 'text', x: 258, y: 142, text: 'b', size: 16, bold: true },
        ]),
        text: '電熱線 a の抵抗は[b1]である。',
        blanks: [number('b1', 10, 0, 'Ω')],
        explanation: 'a の直線は、5 V のとき 0.5 A を通っています。抵抗は 5 ÷ 0.5 ＝ 10 Ω です。目盛りの線と直線が交わる点を使うと、正しく読めます。',
        hint: 'a の直線が目盛りの線と交わる点を 1 つ選び、電圧 ÷ 電流を計算しよう。',
      }),
      choice({
        id: 'elec-2-r3', concept: 'el-ohm',
        prompt: '次のうち、電流をほとんど通さない不導体（絶縁体）はどれ？',
        options: ['銅', 'ゴム', '鉄'],
        answer: 'b',
        explanation: 'ゴムは抵抗がきわめて大きく、電流をほとんど通さない不導体です。銅や鉄などの金属は、電流を通しやすい導体です。',
        hint: '電気のコードの「まわり」に使われている物質だよ。',
      }),
      choice({
        id: 'elec-2-t2', concept: 'el-ohm', term: true,
        prompt: '次の説明に合う言葉はどれ？「電流の流れにくさを表す量。単位はオーム（Ω）」',
        options: ['抵抗（電気抵抗）', '電圧', '電力'],
        answer: 'a',
        explanation: '電流の流れにくさを**抵抗**（電気抵抗）といい、単位はオーム（Ω）です。抵抗が大きいほど、電流は流れにくくなります。',
        hint: '電流の流れを「じゃまする」大きさを表す言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 電気のはたらき
  // ================================================================

  // ---- ステージ elec-3: 電力と熱量 ----
  const elec3 = {
    id: 'elec-3', areaId: 'el-energy', title: '電力と熱量', minutes: 5, concepts: ['el-power'],
    lessons: [
      {
        id: 'elec-3-c1',
        text: '電気器具が 1 秒間に使う電気エネルギーの大きさを**電力**といい、単位は**ワット**（記号 W）です。電力〔W〕＝ 電圧〔V〕× 電流〔A〕で求めます。「100 V－1000 W」の器具は、100 V で使うと 1000 W の電力を使います。',
        // 電気器具の表示と、電力の式
        figure: scene([
          { type: 'rect', x: 30, y: 40, width: 110, height: 110, fill: 'white', rx: 14, label: '電気ポット' },
          { type: 'rect', x: 20, y: 160, width: 130, height: 28, fill: 'sky' },
          note(85, 179, '100 V－1000 W'),
          { type: 'text', x: 160, y: 80, text: '電力〔W〕', size: 16 },
          { type: 'text', x: 160, y: 112, text: '＝ 電圧〔V〕', size: 16 },
          { type: 'text', x: 160, y: 144, text: '× 電流〔A〕', size: 16 },
          { type: 'text', x: 160, y: 200, text: '100 V で使うと', size: 13 },
          { type: 'text', x: 160, y: 220, text: '1000 W の電力を使う', size: 13 },
        ]),
      },
      {
        id: 'elec-3-c2',
        text: '電熱線に電流を流すと熱が出ます。電熱線から出る熱の量を**熱量**といい、単位は**ジュール**（記号 J）です。熱量〔J〕＝ 電力〔W〕× 時間〔秒〕で求めます。1 W の電力で 1 秒間電流を流すと、1 J の熱が出ます。',
        // 水に入れた電熱線と温度計、電源装置
        figure: scene([
          { type: 'beaker', x: 110, y: 210, width: 110, height: 110, level: 0.6 },
          { type: 'line', points: [[70, 110], [70, 175], [76, 190], [82, 175], [88, 190], [94, 175], [100, 190], [100, 110]], color: 'orange', width: 3 },
          wire([[70, 110], [70, 60], [235, 60], [235, 100]]),
          wire([[100, 110], [100, 75], [275, 75], [275, 100]]),
          { type: 'rect', x: 215, y: 100, width: 85, height: 40, fill: 'white', label: '電源装置' },
          { type: 'rect', x: 131, y: 95, width: 8, height: 95, fill: 'white' },
          { type: 'circle', x: 135, y: 192, r: 6, fill: 'red' },
          { type: 'text', x: 172, y: 170, text: '温度計', size: 13 },
          { type: 'text', x: 10, y: 34, text: '熱量 ＝ 電力 × 時間', size: 16 },
          { type: 'text', x: 10, y: 150, text: '電熱線', size: 13 },
        ]),
      },
      {
        id: 'elec-3-c3',
        anim: 'el-heat-rise',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '電熱線で水をあたためるとき、水の上昇温度は、電力が大きいほど、また電流を流す時間が長いほど大きくなり、どちらにも**比例**します。6 W で 5 分間（300 秒）電流を流すと、熱量は 6 × 300 ＝ 1800 J です。',
        // 6 W と 3 W の電熱線で、同じ量の水をあたためたときのグラフ
        figure: scene([
          ...heatAxes(),
          { type: 'line', points: [[50, 200], [250, 50]], color: 'blue', width: 3 },
          { type: 'line', points: [[50, 200], [250, 125]], color: 'green', width: 3 },
          { type: 'text', x: 258, y: 55, text: '6 W', size: 14 },
          { type: 'text', x: 258, y: 130, text: '3 W', size: 14 },
        ]),
      },
      {
        id: 'elec-3-c4',
        text: '電気器具が使った電気エネルギーの量を**電力量**といいます。単位はジュール（J）のほか、**ワット時**（Wh）や**キロワット時**（kWh）も使います。電力量 ＝ 電力 × 時間 です。1000 W の器具を 1 時間使うと 1 kWh です。',
        // 電力量の式と例
        figure: scene([
          { type: 'rect', x: 30, y: 26, width: 260, height: 44, fill: 'sky', rx: 8 },
          note(160, 54, '電力量 ＝ 電力 × 時間', 16),
          note(160, 110, '1000 W × 1 時間 ＝ 1 kWh', 16),
          note(160, 150, '40 W × 3 時間 ＝ 120 Wh', 16),
          note(160, 190, '1 W × 1 秒 ＝ 1 J', 16),
          note(160, 226, '1 Wh ＝ 3600 J', 14),
        ]),
      },
    ],
    warmup: choice({
      id: 'elec-3-w1', concept: 'el-power',
      prompt: '予想しよう。同じ 100 V で使う 600 W と 1200 W の電気ストーブがあります。同じ時間使うとき、より多くの熱を出すのはどちらだと思う？',
      options: ['1200 W のストーブ', '600 W のストーブ', 'どちらも同じ'],
      answer: 'a',
      explanation: 'W の数（電力）が大きいほど、1 秒間に使う電気エネルギーが大きく、出る熱も多くなります。電力と熱の量の関係を、このステージで学ぼう。',
      hint: 'W の数が大きいと、何が大きいのかな。',
    }),
    problems: [
      fill({
        id: 'elec-3-p1', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '100 V の電圧を加えると 0.5 A の電流が流れる電球の電力は[b1]である。',
        blanks: [number('b1', 50, 0, 'W')],
        explanation: '電力〔W〕＝ 電圧〔V〕× 電流〔A〕なので、100 × 0.5 ＝ 50 W です。',
        hint: '電圧と電流をかけ算しよう。',
      }),
      fill({
        id: 'elec-3-t1', concept: 'el-power', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電力の単位は[b1]（記号 W）、熱量の単位は[b2]（記号 J）である。',
        blanks: [
          word('b1', ['ワット', 'ジュール', 'オーム'], 'ワット'),
          word('b2', ['ワット', 'ジュール', 'オーム'], 'ジュール'),
        ],
        explanation: '電力の単位は**ワット**（W）、熱量の単位は**ジュール**（J）です。1 W で 1 秒間に出る熱量が 1 J です。',
        hint: '記号 W と J の読み方を思い出そう。',
      }),
      fill({
        id: 'elec-3-p2', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '6 W の電熱線に 5 分間電流を流したときに出る熱量は[b1]である。',
        blanks: [number('b1', 1800, 0, 'J')],
        explanation: '熱量〔J〕＝ 電力〔W〕× 時間〔秒〕です。5 分は 300 秒なので、6 × 300 ＝ 1800 J です。時間は「秒」になおしてから計算しよう。',
        hint: '5 分は何秒かな。',
      }),
      figureChoice({
        id: 'elec-3-p3', concept: 'el-power',
        prompt: '同じ量の水に、電力が 2 W・4 W・6 W の電熱線をそれぞれ入れて電流を流しました。グラフのア〜ウは、時間と水の上昇温度の関係です。6 W の電熱線のグラフはどれ？',
        // 上昇温度は電力に比例: 6 W → (250,50)、4 W → (250,100)、2 W → (250,150)。縦軸の数は書かない
        figure: scene([
          ...heatAxes(),
          { type: 'line', points: [[50, 200], [250, 50]], color: 'blue', width: 3 },
          { type: 'line', points: [[50, 200], [250, 100]], color: 'blue', width: 3 },
          { type: 'line', points: [[50, 200], [250, 150]], color: 'blue', width: 3 },
          { type: 'region', id: 'r1', x: 278, y: 50, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 278, y: 100, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 278, y: 150, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '水の上昇温度は電力に比例するので、電力がいちばん大きい 6 W の電熱線では、同じ時間でいちばん温度が上がります。だからグラフのかたむきがいちばん大きいアです。ウが 2 W、イが 4 W です。',
        hint: '同じ時間で、いちばん温度が上がるのはどの電熱線かな。',
      }),
      fill({
        id: 'elec-3-p4', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '1000 W の電気器具を 2 時間使ったときの電力量は[b1]である。',
        blanks: [number('b1', 2, 0, 'kWh')],
        explanation: '電力量 ＝ 電力 × 時間 です。1000 W ＝ 1 kW なので、1 kW × 2 時間 ＝ 2 kWh です。',
        hint: '1000 W は何 kW かな。',
      }),
      choice({
        id: 'elec-3-p5', concept: 'el-power',
        prompt: 'A「1200 W のドライヤーを 10 分間使う」と、B「40 W の電球を 2 時間使う」では、使った電力量が大きいのはどちら？',
        options: ['A', 'B', 'どちらも同じ'],
        answer: 'a',
        explanation: 'A は 1200 W × 1/6 時間 ＝ 200 Wh、B は 40 W × 2 時間 ＝ 80 Wh です。電力量は「電力 × 時間」なので、短い時間でも電力が大きいと、電力量が大きくなることがあります。',
        hint: 'どちらも「電力 × 時間」を Wh で計算してくらべよう。10 分は 1/6 時間だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'elec-3-r1', concept: 'el-power',
        prompt: '「100 V－1500 W」と表示された電子レンジがあります。空らんに入る数を入れよう。',
        text: 'この電子レンジを 100 V で使うと、流れる電流は[b1]である。',
        blanks: [number('b1', 15, 0, 'A')],
        explanation: '電力 ＝ 電圧 × 電流 なので、電流 ＝ 電力 ÷ 電圧 ＝ 1500 ÷ 100 ＝ 15 A です。',
        hint: '1500 W ＝ 100 V × □ A の □ を求めよう。',
      }),
      fill({
        id: 'elec-3-r2', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '100 W の電熱線に 20 秒間電流を流したときに出る熱量は[b1]である。',
        blanks: [number('b1', 2000, 0, 'J')],
        explanation: '熱量〔J〕＝ 電力〔W〕× 時間〔秒〕なので、100 × 20 ＝ 2000 J です。',
        hint: '電力と時間（秒）をかけ算しよう。',
      }),
      choice({
        id: 'elec-3-r3', concept: 'el-power',
        prompt: '電熱線で水をあたためると、5 分間で水の温度が 2 ℃上がりました。同じ電熱線・同じ量の水で 10 分間あたためると、上昇温度はおよそ何 ℃？',
        options: ['4 ℃', '2 ℃', '1 ℃'],
        answer: 'a',
        explanation: '水の上昇温度は、電流を流す時間に比例します。時間が 2 倍になると、上昇温度も約 2 倍の 4 ℃になります。',
        hint: '時間が 2 倍になると、出る熱量は何倍かな。',
      }),
      choice({
        id: 'elec-3-t2', concept: 'el-power', term: true,
        prompt: '次の説明に合う言葉はどれ？「電気器具が使った電気エネルギーの量。単位は J や Wh、kWh」',
        options: ['電力量', '電力', '電圧'],
        answer: 'a',
        explanation: '使った電気エネルギーの量を**電力量**といいます。電力（W）に使った時間をかけて求めます。',
        hint: '電力 × 時間 で求める量だよ。',
      }),
    ],
  };

  // ---- ステージ elec-4: 静電気と磁界 ----
  const elec4 = {
    id: 'elec-4', areaId: 'el-energy', title: '静電気と磁界', minutes: 5, concepts: ['el-static', 'el-magnet'],
    lessons: [
      {
        id: 'elec-4-c1',
        anim: 'el-static-charge',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '種類のちがう物質どうしをこすり合わせると、−の電気をもつ**電子**が一方からもう一方へ移り、物体が電気を帯びます。この電気を**静電気**といいます。同じ種類の電気はしりぞけ合い、ちがう種類の電気は引き合います。',
        // 左: −どうし（しりぞけ合う）、右: −と＋（引き合う）
        figure: scene([
          note(60, 76, 'ストロー'), note(120, 76, 'ストロー'),
          { type: 'circle', x: 60, y: 110, r: 22, fill: 'sky', label: '−' },
          { type: 'circle', x: 120, y: 110, r: 22, fill: 'sky', label: '−' },
          { type: 'arrow', x1: 60, y1: 150, x2: 30, y2: 150, color: 'blue' },
          { type: 'arrow', x1: 120, y1: 150, x2: 150, y2: 150, color: 'blue' },
          note(90, 196, 'しりぞけ合う', 14),
          note(205, 76, 'ストロー'), note(270, 76, 'ティッシュ'),
          { type: 'circle', x: 205, y: 110, r: 22, fill: 'sky', label: '−' },
          { type: 'circle', x: 270, y: 110, r: 22, fill: 'white', label: '＋' },
          { type: 'arrow', x1: 205, y1: 150, x2: 230, y2: 150, color: 'blue' },
          { type: 'arrow', x1: 270, y1: 150, x2: 245, y2: 150, color: 'blue' },
          note(238, 196, '引き合う', 14),
          note(160, 30, 'こすり合わせたストローとティッシュ', 13),
        ]),
      },
      {
        id: 'elec-4-c2',
        text: 'たまっていた電気が流れ出したり、電気が空間を移動したりする現象を**放電**といいます。空気をぬいた管の中で起こる放電を**真空放電**といいます。このとき−極から出ている電子の流れを**陰極線**といいます。',
        // 写真: 放電管（37〜288, 75〜138）の中で、左の電極の円板 (64, 106) から右の蛍光板 (250, 106) へ緑色の光のすじ (68〜252, 106)。
        // 左の端子 (20〜45, 106) に黒い導線、右の端子 (262〜300, 106) に赤い導線。管の台 (120〜195, 138〜200) は下の中央
        // 黒い導線の側（すじが出ている左）を−極とした
        figure: scene([
          photo('elec-4-c2'),
          tag(160, 22, '空気をぬいた管（放電管）'),
          tag(160, 50, '陰極線（電子の流れ）'),
          { type: 'arrow', x1: 90, y1: 66, x2: 230, y2: 66, color: 'blue', width: 2 },
          pointer(46, 174, 52, 112), tag(44, 188, '−極'),
          pointer(274, 174, 268, 112), tag(276, 188, '＋極'),
          tag(160, 226, '高い電圧を加える', { size: 13 }),
        ]),
      },
      {
        id: 'elec-4-c3',
        text: '磁石の力（磁力）がはたらく空間を**磁界**といい、そのようすを表す線を**磁力線**といいます。まっすぐな導線に電流を流すと、導線を中心に同心円状の磁界ができます。電流の向きに**右ねじ**を進めるとき、ねじを回す向きが磁界の向きです。',
        // 写真: 厚紙（17〜222, 89〜220）を導線 (118, 0〜145) が垂直につらぬき、砂鉄が導線を中心 (118, 145) に同心円状に並ぶ。
        // 方位磁針 4 つ（上 (115, 103)・左 (49, 145)・右 (179, 146)・下 (116, 188)）の N 極は、上から見て反時計回りにそろっている
        // → 電流は下から上へ流れている（右ねじ）。磁界の向きの矢印（青）は、だ円の上で反時計回り
        figure: scene([
          photo('elec-4-c3'),
          { type: 'arrow', x1: 130, y1: 84, x2: 130, y2: 28, color: 'orange', width: 3 },
          tag(152, 60, '電流'),
          tag(240, 22, '同心円状の磁界'),
          tag(240, 42, '（砂鉄のもよう）', { size: 13 }),
          pointer(222, 48, 186, 122),   // 砂鉄の輪の上を指す
          { type: 'arrow', x1: 82, y1: 108, x2: 62, y2: 122, color: 'blue', width: 3 },
          { type: 'arrow', x1: 62, y1: 168, x2: 82, y2: 182, color: 'blue', width: 3 },
          { type: 'arrow', x1: 154, y1: 182, x2: 174, y2: 168, color: 'blue', width: 3 },
          { type: 'arrow', x1: 174, y1: 122, x2: 154, y2: 108, color: 'blue', width: 3 },
          pointer(244, 148, 200, 147), tag(274, 152, '方位磁針', { size: 13 }),
          tag(270, 190, '電流が上向き', { size: 13 }),
          tag(270, 208, '→ 上から見て', { size: 13 }),
          tag(270, 226, '反時計回り', { size: 13 }),
        ]),
      },
      {
        id: 'elec-4-c4',
        anim: 'el-induction',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '磁界の中の導線に電流を流すと、導線は力を受けます。電流か磁界の向きを逆にすると、力の向きも逆になります。これを利用したのが**モーター**です。コイルの中の磁界が変化すると電流が流れる現象を**電磁誘導**、その電流を**誘導電流**といいます。',
        // コイルに棒磁石の N 極を近づけると、検流計（G）の針がふれる
        figure: scene([
          ...[140, 152, 164, 176, 188, 200, 212].map(x => ({ type: 'ellipse', x, y: 110, rx: 7, ry: 30, fill: 'none', stroke: 'brown' })),
          note(176, 70, 'コイル'),
          { type: 'rect', x: 10, y: 95, width: 45, height: 30, fill: 'blue', label: 'S' },
          { type: 'rect', x: 55, y: 95, width: 45, height: 30, fill: 'red', label: 'N' },
          { type: 'arrow', x1: 40, y1: 166, x2: 100, y2: 166, color: 'gray', label: '近づける' },
          wire([[140, 140], [140, 200], [159, 200]]),
          wire([[212, 140], [212, 200], [191, 200]]),
          { type: 'circle', x: 175, y: 200, r: 16, fill: 'white', label: 'G' },
          note(175, 234, '検流計'),
          { type: 'text', x: 226, y: 176, text: '誘導電流', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'elec-4-w1', concept: 'el-static',
      prompt: '予想しよう。ティッシュでこすったストロー 2 本を近づけると、どうなると思う？',
      options: ['しりぞけ合う', '引き合う', '何も起こらない'],
      answer: 'a',
      explanation: '同じようにこすったストローは、同じ種類の電気を帯びるので、しりぞけ合います。静電気のきまりを、このステージで学ぼう。',
      hint: '2 本のストローは、同じ種類の電気を帯びているかな、ちがう種類かな。',
    }),
    problems: [
      choice({
        id: 'elec-4-p1', concept: 'el-static',
        prompt: 'ストローをティッシュでこすると、ストローが−の電気を帯びました。このとき、何が移動した？',
        options: ['−の電気をもつ電子が、ティッシュからストローへ移動した', '＋の電気をもつ電子が、ストローからティッシュへ移動した', '空気が、ティッシュからストローへ移動した'],
        answer: 'a',
        explanation: 'こすり合わせると、−の電気をもつ電子が一方の物体からもう一方へ移ります。電子を受けとったストローは−、電子を失ったティッシュは＋の電気を帯びます。',
        hint: '電子がもっている電気は、＋と−のどちらかな。',
      }),
      fill({
        id: 'elec-4-t1', concept: 'el-magnet', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'コイルの中の磁界が変化すると、コイルに電流が流れる。この現象を[b1]といい、このとき流れる電流を[b2]という。',
        blanks: [
          word('b1', ['電磁誘導', '静電気', '放電'], '電磁誘導'),
          word('b2', ['誘導電流', '陰極線', '静電気'], '誘導電流'),
        ],
        explanation: '磁界の変化で電流が流れる現象を**電磁誘導**、流れる電流を**誘導電流**といいます。発電機はこのしくみを使っています。',
        hint: '磁石（磁界）で電流が「誘い出される」というイメージの言葉だよ。',
      }),
      figureChoice({
        id: 'elec-4-p2', concept: 'el-magnet',
        prompt: 'ア〜ウは、紙の表から裏へ電流が流れている導線（×印）を見た図で、青い矢印は磁界の向きです。アは時計回り、イは反時計回り、ウは導線から外へ広がる向きです。正しいのはどれ？',
        // 中心 (55,100)・(160,100)・(265,100)。ア: 時計回り（正解）、イ: 反時計回り、ウ: 外向き
        figure: scene([
          note(160, 30, '×: 電流が紙の表から裏へ流れる'),
          { type: 'circle', x: 55, y: 100, r: 34, fill: 'none', stroke: 'gray' },
          ...wireIn(55, 100),
          { type: 'arrow', x1: 43, y1: 66, x2: 67, y2: 66, color: 'blue' },
          { type: 'arrow', x1: 67, y1: 134, x2: 43, y2: 134, color: 'blue' },
          { type: 'circle', x: 160, y: 100, r: 34, fill: 'none', stroke: 'gray' },
          ...wireIn(160, 100),
          { type: 'arrow', x1: 172, y1: 66, x2: 148, y2: 66, color: 'blue' },
          { type: 'arrow', x1: 148, y1: 134, x2: 172, y2: 134, color: 'blue' },
          ...wireIn(265, 100),
          { type: 'arrow', x1: 265, y1: 86, x2: 265, y2: 62, color: 'blue' },
          { type: 'arrow', x1: 265, y1: 114, x2: 265, y2: 138, color: 'blue' },
          { type: 'arrow', x1: 251, y1: 100, x2: 227, y2: 100, color: 'blue' },
          { type: 'arrow', x1: 279, y1: 100, x2: 303, y2: 100, color: 'blue' },
          { type: 'region', id: 'r1', x: 55, y: 192, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 192, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 192, r: 24, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '電流の向き（紙の表から裏）に右ねじを進めると、ねじは時計回りに回ります。この向きが磁界の向きなので、アが正しい図です。電流の向きを逆にすると、磁界は反時計回り（イ）になります。',
        hint: 'ねじを紙の奥へ進めるには、どちら向きに回すかな。',
      }),
      choice({
        id: 'elec-4-p3', concept: 'el-magnet',
        prompt: '磁石の N 極と S 極のあいだに導線を置いて電流を流すと、導線が手前に動きました。磁石はそのままで、電流の向きだけを逆にすると、導線はどうなる？',
        options: ['おくに動く（逆向き）', '手前に動く（同じ向き）', '動かなくなる'],
        answer: 'a',
        explanation: '磁界の中の導線が受ける力の向きは、電流の向きと磁界の向きで決まります。電流の向きだけを逆にすると、力の向きも逆になるので、導線はおくに動きます。',
        hint: '電流か磁界の向きの「片方」を逆にすると、力の向きはどうなったかな。',
      }),
      choice({
        id: 'elec-4-p4', concept: 'el-magnet',
        prompt: 'コイルに棒磁石を出し入れして誘導電流を流します。検流計の針を大きくふれさせるには、どうすればよい？',
        options: ['磁石をより速く動かす', '磁石をコイルの中で止めておく', '磁石をよりゆっくり動かす'],
        answer: 'a',
        explanation: '誘導電流は、コイルの中の磁界が速く変化するほど大きくなります。磁石を速く動かす、磁力の強い磁石を使う、コイルの巻数を多くすると、誘導電流が大きくなります。',
        hint: 'コイルの中の磁界の変化を、大きく・速くするには？',
      }),
      choice({
        id: 'elec-4-p5', concept: 'el-static',
        prompt: '空気をぬいた放電管に高い電圧を加えると見られる陰極線について、正しいのはどれ？',
        options: ['−極から出る電子の流れである', '＋極から出る光の流れである', '管の中の空気の流れである'],
        answer: 'a',
        explanation: '陰極線は、−極（陰極）から出る電子の流れです。電子は−の電気をもつので、＋極のほうへ向かって進みます。',
        hint: '「陰極」は＋極と−極のどちらのことかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'elec-4-r1', concept: 'el-static',
        prompt: '−の電気を帯びた物体と、＋の電気を帯びた物体を近づけると、どうなる？',
        options: ['引き合う', 'しりぞけ合う', '何も起こらない'],
        answer: 'a',
        explanation: 'ちがう種類の電気を帯びた物体どうしは引き合い、同じ種類どうしはしりぞけ合います。',
        hint: '−と＋は、ちがう種類の電気だね。',
      }),
      fill({
        id: 'elec-4-r2', concept: 'el-static',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '空気をぬいた管の中に電流が流れる現象を[b1]という。',
        blanks: [word('b1', ['真空放電', '電磁誘導', '静電気'], '真空放電')],
        explanation: '空気をぬいた（気圧を低くした）管の中で起こる放電を**真空放電**といいます。蛍光灯にも利用されています。',
        hint: '「真空」に近い管の中で起こる「放電」だよ。',
      }),
      choice({
        id: 'elec-4-r3', concept: 'el-magnet',
        prompt: 'コイルの中に棒磁石を入れたまま、動かさずに止めておきました。検流計の針はどうなる？',
        options: ['ふれない（電流は流れない）', '大きくふれたままになる', '左右に何度もふれる'],
        answer: 'a',
        explanation: '誘導電流は、コイルの中の磁界が変化するときだけ流れます。磁石を止めておくと磁界が変化しないので、電流は流れません。',
        hint: '電磁誘導は、磁界が「変化する」ときに起こる現象だったね。',
      }),
      choice({
        id: 'elec-4-r4', concept: 'el-magnet',
        prompt: '磁界の中の導線に電流を流すと、導線が手前に動きました。磁石の N 極と S 極を入れかえ、さらに電流の向きも逆にすると、導線はどうなる？',
        options: ['手前に動く（もとと同じ向き）', 'おくに動く（逆向き）', '動かなくなる'],
        answer: 'a',
        explanation: '磁界の向きを逆にすると力は逆向き、さらに電流の向きも逆にすると、もう一度逆向きになります。2 回逆になるので、もとと同じ手前に動きます。',
        hint: '「逆」を 2 回くり返すと、どうなるかな。',
      }),
      choice({
        id: 'elec-4-t2', concept: 'el-static', term: true,
        prompt: '次の説明に合う言葉はどれ？「種類のちがう物質どうしをこすり合わせたときに、物体にたまる電気」',
        options: ['静電気', '誘導電流', '陰極線'],
        answer: 'a',
        explanation: 'こすり合わせたときに物体にたまる電気を**静電気**といいます。冬にドアノブでパチッとするのも、静電気の放電です。',
        hint: '「静か」に物体にたまっている電気、という意味の言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'el-circuit', title: '回路図と計器のつなぎ方', basic: null, lessonStageId: 'elec-1',
      checkPool: [
        choice({
          id: 'el-circuit-k1', concept: 'el-circuit',
          prompt: '電流計は、はかりたい部分にどのようにつなぐ？',
          options: ['直列につなぐ', '並列につなぐ', '電池の両はしだけにつなぐ'],
          answer: 'a',
          explanation: '電流計は、はかりたい部分と一列（直列）につなぎます。電圧計は並列につなぎます。',
          hint: 'はかりたい電流が、電流計の中を通るようにしよう。',
        }),
        fill({
          id: 'el-circuit-k2', concept: 'el-circuit',
          prompt: '空らんに入る数を入れよう。',
          text: '0.25 A は[b1]である。',
          blanks: [number('b1', 250, 0, 'mA')],
          explanation: '1 A ＝ 1000 mA なので、0.25 A は 0.25 × 1000 ＝ 250 mA です。',
          hint: 'A を mA になおすときは、1000 をかけるよ。',
        }),
        choice({
          id: 'el-circuit-k3', concept: 'el-circuit',
          prompt: '電圧の大きさが予想できないとき、電圧計の−端子は、はじめにどれにつなぐ？',
          options: ['300 V', '15 V', '3 V'],
          answer: 'a',
          explanation: '針がふり切れないように、はじめはいちばん大きい 300 V の端子につなぎます。ふれが小さければ 15 V、3 V と変えます。',
          hint: '電流計のときと同じ考え方だよ。',
        }),
      ],
    },
    {
      id: 'el-rule', title: '直列・並列の電流と電圧', basic: 'el-circuit', lessonStageId: 'elec-1',
      checkPool: [
        fill({
          id: 'el-rule-k1', concept: 'el-rule',
          prompt: '豆電球 X と Y を直列につないだ回路があります。空らんに入る数を入れよう。',
          text: '電源の電圧が 9.0 V で、X に 4.0 V の電圧が加わっているとき、Y に加わる電圧は[b1]である。',
          blanks: [number('b1', 5, 0.05, 'V')],
          explanation: '直列回路では、各部分の電圧の和が電源の電圧になります。9.0 − 4.0 ＝ 5.0 V です。',
          hint: 'X と Y の電圧をたすと 9.0 V になるよ。',
        }),
        choice({
          id: 'el-rule-k2', concept: 'el-rule',
          prompt: '豆電球 2 個を並列につないだ回路で、それぞれの豆電球に加わる電圧はどうなっている？',
          options: ['どちらも電源の電圧と同じ', 'どちらも電源の電圧の半分', '電池に近い豆電球ほど大きい'],
          answer: 'a',
          explanation: '並列回路では、各部分に加わる電圧は電源の電圧と同じです。',
          hint: '並列回路では、どの枝も電源の両はしにつながっているね。',
        }),
        fill({
          id: 'el-rule-k3', concept: 'el-rule',
          prompt: '豆電球 X と Y を並列につないだ回路があります。空らんに入る数を入れよう。',
          text: '枝分かれする前の電流が 0.8 A で、X に 0.5 A 流れているとき、Y に流れる電流は[b1]である。',
          blanks: [number('b1', 0.3, 0.01, 'A')],
          explanation: '並列回路では、枝分かれした電流の和が分かれる前の電流になります。0.8 − 0.5 ＝ 0.3 A です。',
          hint: 'X と Y の電流をたすと 0.8 A になるよ。',
        }),
      ],
    },
    {
      id: 'el-ohm', title: 'オームの法則と合成抵抗', basic: 'el-rule', lessonStageId: 'elec-2',
      checkPool: [
        fill({
          id: 'el-ohm-k1', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '8 V の電圧を加えると 0.4 A の電流が流れる電熱線の抵抗は[b1]である。',
          blanks: [number('b1', 20, 0.01, 'Ω')],
          explanation: '抵抗 ＝ 電圧 ÷ 電流 なので、8 ÷ 0.4 ＝ 20 Ω です。',
          hint: 'R ＝ V ÷ I を使おう。',
        }),
        fill({
          id: 'el-ohm-k2', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '50 Ω の抵抗に 10 V の電圧を加えると、流れる電流は[b1]である。',
          blanks: [number('b1', 0.2, 0.01, 'A')],
          explanation: '電流 ＝ 電圧 ÷ 抵抗 なので、10 ÷ 50 ＝ 0.2 A です。',
          hint: 'I ＝ V ÷ R を使おう。',
        }),
        choice({
          id: 'el-ohm-k3', concept: 'el-ohm',
          prompt: '20 Ω の抵抗と 30 Ω の抵抗を並列につなぎました。全体の抵抗はどうなる？',
          options: ['20 Ω より小さい', '20 Ω と 30 Ω のあいだ', '50 Ω'],
          answer: 'a',
          explanation: '並列につなぐと、全体の抵抗はどの抵抗よりも小さくなります（この場合は 12 Ω）。50 Ω になるのは直列につないだときです。',
          hint: '並列では電流の通り道が増えて、流れやすくなるよ。',
        }),
      ],
    },
    {
      id: 'el-power', title: '電力・熱量・電力量', basic: 'el-ohm', lessonStageId: 'elec-3',
      checkPool: [
        fill({
          id: 'el-power-k1', concept: 'el-power',
          prompt: '空らんに入る数を入れよう。',
          text: '12 V の電圧で 2 A の電流が流れるモーターの電力は[b1]である。',
          blanks: [number('b1', 24, 0, 'W')],
          explanation: '電力 ＝ 電圧 × 電流 なので、12 × 2 ＝ 24 W です。',
          hint: '電圧と電流をかけ算しよう。',
        }),
        fill({
          id: 'el-power-k2', concept: 'el-power',
          prompt: '空らんに入る数を入れよう。',
          text: '50 W の電熱線に 30 秒間電流を流したときに出る熱量は[b1]である。',
          blanks: [number('b1', 1500, 0, 'J')],
          explanation: '熱量 ＝ 電力 × 時間（秒）なので、50 × 30 ＝ 1500 J です。',
          hint: '電力と時間（秒）をかけ算しよう。',
        }),
        fill({
          id: 'el-power-k3', concept: 'el-power',
          prompt: '空らんに入る数を入れよう。',
          text: '100 W の電球を 2 時間使ったときの電力量は[b1]である。',
          blanks: [number('b1', 200, 0, 'Wh')],
          explanation: '電力量 ＝ 電力 × 時間 なので、100 W × 2 時間 ＝ 200 Wh です。',
          hint: 'W に時間（時間の単位）をかけると Wh になるよ。',
        }),
      ],
    },
    {
      id: 'el-static', title: '静電気と電子', basic: null, lessonStageId: 'elec-4',
      checkPool: [
        choice({
          id: 'el-static-k1', concept: 'el-static',
          prompt: '電子がもっている電気は、どちらの種類？',
          options: ['−の電気', '＋の電気', '電気をもっていない'],
          answer: 'a',
          explanation: '電子は−の電気をもつ、とても小さな粒です。電子が移動することで、物体が電気を帯びたり、電流が流れたりします。',
          hint: '電子を受けとった物体は、どちらの電気を帯びたかな。',
        }),
        choice({
          id: 'el-static-k2', concept: 'el-static',
          prompt: '同じ種類の電気を帯びた物体どうしを近づけると、どうなる？',
          options: ['しりぞけ合う', '引き合う', 'くっついて離れなくなる'],
          answer: 'a',
          explanation: '同じ種類の電気どうしはしりぞけ合い、ちがう種類の電気どうしは引き合います。',
          hint: 'ティッシュでこすったストロー 2 本を近づけたときを思い出そう。',
        }),
        choice({
          id: 'el-static-k3', concept: 'el-static',
          prompt: '陰極線（電子の流れ）は、放電管のどちらの極から出ている？',
          options: ['−極', '＋極', '両方の極から同じように出ている'],
          answer: 'a',
          explanation: '陰極線は−極（陰極）から出る電子の流れです。−の電気をもつ電子は、＋極のほうへ進みます。',
          hint: '「陰極」とは、どちらの極のことかな。',
        }),
      ],
    },
    {
      id: 'el-magnet', title: '電流と磁界・電磁誘導', basic: 'el-circuit', lessonStageId: 'elec-4',
      checkPool: [
        choice({
          id: 'el-magnet-k1', concept: 'el-magnet',
          prompt: 'ある場所の磁界の向きは、何を使って調べる？',
          options: ['方位磁針の N 極がさす向き', '方位磁針の S 極がさす向き', '電流計の針のふれる向き'],
          answer: 'a',
          explanation: '磁界の向きは、その場所に置いた方位磁針の N 極がさす向きです。',
          hint: '方位磁針の、北をさすほうの極だよ。',
        }),
        choice({
          id: 'el-magnet-k2', concept: 'el-magnet',
          prompt: '発電機に利用されている現象はどれ？',
          options: ['電磁誘導', '静電気', '真空放電'],
          answer: 'a',
          explanation: '発電機は、コイルのそばで磁石を回すなどして磁界を変化させ、電磁誘導で電流をとり出す装置です。',
          hint: '磁界の変化で電流が流れる現象だよ。',
        }),
        choice({
          id: 'el-magnet-k3', concept: 'el-magnet',
          prompt: 'まっすぐな導線に電流を流したとき、導線のまわりの磁界が強いのはどこ？',
          options: ['導線に近いところ', '導線から遠いところ', 'どこでも同じ'],
          answer: 'a',
          explanation: '電流のまわりの磁界は、導線に近いほど強く、また電流が大きいほど強くなります。',
          hint: '磁力線の間隔が混んでいるのは、導線の近くかな、遠くかな。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'electricity',
    title: '電流とその利用',
    mascot: 'E',   // 担当の先生（キューブ先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'circuit', title: '回路と電流・電圧', order: 1, stages: [elec1, elec2] },
      { id: 'el-energy', title: '電気のはたらき', order: 2, stages: [elec3, elec4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
