// 「電流とその利用」教材データ（中学2年 理科・物理）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」）。
// 2 領域 × 2 ステージ（回路と電流・電圧、電気のはたらき）と、概念 6 つ。
// 領域 3「ミニプリント」（el-miniprint）: 先生のミニプリントを書き直したステージ electricity-mp1〜mp16 と、概念 3 つ（el-motor・el-induction・el-radiation）。
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
  // 領域 3: ミニプリント（先生のミニプリントの問題を、このアプリ用に書き直したもの）
  // ステージ electricity-mp1〜mp16。プリントのファイル名は docs/reports/content/electricity.md の「参考:」に書く。
  // ================================================================

  // ---- ミニプリント用の図の道具 ----

  // 2 つの回路（左 ア: 豆電球 2 個の直列、右 イ: 豆電球 2 個の並列）。withRegions なら選ぶ場所をつける
  function twoCircuitsItems(withRegions) {
    const items = [
      sym('bulb', 50, 60), sym('bulb', 110, 60), sym('battery', 80, 200),
      wire([[60, 200], [20, 200], [20, 60], [30, 60]]),
      wire([[70, 60], [90, 60]]),
      wire([[130, 60], [140, 60], [140, 200], [100, 200]]),
      sym('bulb', 240, 60), sym('bulb', 240, 120), sym('battery', 240, 200),
      wire([[220, 200], [190, 200], [190, 60], [220, 60]]),
      wire([[260, 60], [290, 60], [290, 200], [260, 200]]),
      wire([[190, 120], [220, 120]]),
      wire([[260, 120], [290, 120]]),
      dot(190, 120), dot(290, 120),
      { type: 'line', points: [[160, 20], [160, 230]], color: 'gray', width: 1, dashed: true },
    ];
    if (withRegions) items.push({ type: 'region', id: 'r1', x: 80, y: 130, r: 22, label: 'ア' }, { type: 'region', id: 'r2', x: 240, y: 160, r: 22, label: 'イ' });
    return items;
  }

  // 電気用図記号 6 つ（ア 抵抗、イ 電流計、ウ 電池、エ スイッチ、オ 電圧計、カ 豆電球）と選ぶ場所
  const SYMBOL_ORDER = ['resistor', 'ammeter', 'battery', 'switch', 'voltmeter', 'bulb'];
  function symbolsFigure() {
    const items = [];
    SYMBOL_ORDER.forEach((k, i) => {
      const x = 60 + 100 * (i % 3), y = i < 3 ? 56 : 146;
      items.push(sym(k, x, y), wire([[x - 34, y], [x - 20, y]]), wire([[x + 20, y], [x + 34, y]]));
      items.push({ type: 'region', id: 'r' + (i + 1), x, y: y + 44, r: 22, label: 'アイウエオカ'[i] });
    });
    return scene(items);
  }

  // 回路図 2 つ（左 ア: 電池・スイッチ・豆電球 2 個の直列、右 イ: 豆電球 2 個が並列）
  function diagramPairItems(withRegions) {
    const items = [
      sym('battery', 25, 130, 90), sym('switch', 80, 50), sym('bulb', 135, 95, 90), sym('bulb', 135, 165, 90),
      wire([[25, 110], [25, 50], [60, 50]]),
      wire([[100, 50], [135, 50], [135, 75]]),
      wire([[135, 115], [135, 145]]),
      wire([[135, 185], [135, 210], [25, 210], [25, 150]]),
      sym('battery', 185, 130, 90), sym('switch', 230, 50), sym('bulb', 265, 130, 90), sym('bulb', 305, 130, 90),
      wire([[185, 110], [185, 50], [210, 50]]),
      wire([[250, 50], [305, 50], [305, 110]]),
      wire([[265, 50], [265, 110]]),
      wire([[265, 150], [265, 210]]),
      wire([[305, 150], [305, 210], [185, 210], [185, 150]]),
      dot(265, 50), dot(265, 210),
      { type: 'line', points: [[160, 20], [160, 230]], color: 'gray', width: 1, dashed: true },
    ];
    if (withRegions) items.push({ type: 'region', id: 'r1', x: 80, y: 130, r: 22, label: 'ア' }, { type: 'region', id: 'r2', x: 225, y: 130, r: 22, label: 'イ' });
    return items;
  }

  // メーターの目盛り（中心 (160, 205)、半径 130 の弧）。0〜max を minorN 等分した目盛り、labels は大きい目盛りの数、value に針
  function meterFace(max, minorN, labels, value, unitText) {
    const cx = 160, cy = 205, R = 130;
    const ang = (v) => Math.PI * (160 - 140 * v / max) / 180;
    const pt = (v, r) => [Math.round((cx + r * Math.cos(ang(v))) * 10) / 10, Math.round((cy - r * Math.sin(ang(v))) * 10) / 10];
    const arc = [];
    for (let k = 0; k <= 40; k++) arc.push(pt(max * k / 40, R));
    const items = [{ type: 'line', points: arc, width: 2 }];
    const step = minorN / (labels.length - 1);
    for (let k = 0; k <= minorN; k++) {
      const v = max * k / minorN, major = k % step === 0;
      items.push({ type: 'line', points: [pt(v, R), pt(v, R - (major ? 14 : 7))], width: major ? 2 : 1 });
    }
    labels.forEach((t, i) => {
      const p = pt(max * i / (labels.length - 1), R - 28);
      items.push({ type: 'text', x: p[0], y: p[1] + 5, text: t, size: 13, anchor: 'middle' });
    });
    items.push({ type: 'line', points: [[cx, cy], pt(value, R - 4)], color: 'blue', width: 2 });
    items.push({ type: 'circle', x: cx, y: cy, r: 6, fill: 'ink', stroke: 'ink' });
    items.push({ type: 'text', x: cx, y: cy - 50, text: unitText, size: 16, anchor: 'middle', bold: true });
    return items;
  }

  // 並列回路（豆電球 2 個）。A 分かれる前、B 上の枝、C 下の枝、D 合流したあと
  function parallelABCDItems(values) {
    const v = values || {};
    const items = [
      sym('bulb', 160, 50), sym('bulb', 160, 125), sym('battery', 160, 205),
      wire([[140, 205], [40, 205], [40, 50], [140, 50]]),
      wire([[180, 50], [280, 50], [280, 205], [180, 205]]),
      wire([[40, 125], [140, 125]]),
      wire([[180, 125], [280, 125]]),
      dot(40, 125), dot(280, 125),
    ];
    [['A', 40, 165, -1], ['B', 100, 50, 0], ['C', 100, 125, 0], ['D', 280, 165, 1]].forEach(([n, x, y, side]) => {
      items.push({ type: 'circle', x, y, r: 4, fill: 'ink', stroke: 'ink' });
      const tx = side < 0 ? x + 10 : side > 0 ? x - 10 : x;   // A・D の文字は回路の内側に書く
      const ty = side === 0 ? y - 10 : y + 5;
      items.push({ type: 'text', x: tx, y: ty, text: n + (v[n] ? ' ' + v[n] : ''), size: 14, bold: true, anchor: side < 0 ? 'start' : side > 0 ? 'end' : 'middle' });
    });
    return items;
  }

  // 直列回路（豆電球 2 個）。A・B・C の点
  function seriesABCItems(labels) {
    const t = labels || {};
    const items = [
      sym('bulb', 110, 60), sym('bulb', 210, 60), sym('battery', 160, 190),
      wire([[140, 190], [40, 190], [40, 60], [90, 60]]),
      wire([[130, 60], [190, 60]]),
      wire([[230, 60], [280, 60], [280, 190], [180, 190]]),
    ];
    [['A', 60], ['B', 160], ['C', 250]].forEach(([n, x]) => {
      items.push({ type: 'circle', x, y: 60, r: 4, fill: 'ink', stroke: 'ink' }, { type: 'text', x, y: 42, text: n, size: 14, bold: true, anchor: 'middle' });
    });
    if (t.ab) items.push(note(110, 100, 'AB 間 ' + t.ab, 13));
    if (t.bc) items.push(note(210, 100, 'BC 間 ' + t.bc, 13));
    if (t.ac) items.push(note(160, 140, 'AC 間 ' + t.ac, 14));
    return items;
  }

  // ---- ステージ electricity-mp1: 電流のはたらきと回路 ----
  const elecMp1 = {
    id: 'electricity-mp1', areaId: 'el-miniprint', title: 'プリント 1: 電流のはたらきと回路', minutes: 5, concepts: ['el-circuit'],
    lessons: [
      {
        id: 'electricity-mp1-c1',
        text: '電流が流れる道すじを**回路**といいます。乾電池 1 個の電圧は約 1.5 V、家庭のコンセントの電圧は 100 V です。豆電球は＋極と−極を入れかえても光りますが、モーターは回る向きが逆になります。',
        // 写真: 電池ボックスの乾電池（x 110〜200, y 50〜80。右が＋極で赤い導線、左が−極で黒い導線）と、ソケットの豆電球
        // (155, 135〜170)。導線は左 x 15・右 x 302 を通って輪になる。輪の内側と上下は白い余白
        figure: scene([
          photo('electricity-mp1-c1'),
          tag(155, 104, '乾電池 約 1.5 V', { size: 13 }),
          pointer(190, 136, 166, 146), tag(216, 136, '豆電球', { size: 13 }),
          { type: 'arrow', x1: 314, y1: 96, x2: 314, y2: 150, color: 'orange' },
          { type: 'arrow', x1: 32, y1: 160, x2: 32, y2: 106, color: 'orange' },
          tag(272, 124, '電流', { size: 13, bold: true }),
          tag(160, 228, '電流の通り道 ＝ 回路', { bold: true }),
        ]),
      },
      {
        id: 'electricity-mp1-c2',
        text: '電子オルゴールや**発光ダイオード**（LED）は、電流が決まった向きに流れたときだけはたらきます。＋極と−極を逆につなぐと、鳴らなかったり光らなかったりします。乾電池 2 個を直列につなぐと、豆電球は 1 個のときより明るくなります。',
        // 写真: 左から LED (46, 30〜70。長い足 x 39 は y 178 まで、短い足 x 53 は y 147 まで)、電子オルゴール（基板とスピーカー、
        // x 95〜210, y 50〜160）、乾電池 2 個を直列に入れた電池ボックス (250〜295, 28〜182)。下は白い余白
        figure: scene([
          photo('electricity-mp1-c2'),
          pointer(24, 172, 37, 172), tag(14, 177, '長', { size: 13, bold: true }),
          tag(50, 198, '発光ダイオード', { size: 13 }),
          tag(50, 216, '長い足を＋極に', { size: 13 }),
          tag(156, 198, '電子オルゴール', { size: 13 }),
          tag(156, 216, '赤い導線を＋極に', { size: 13 }),
          tag(272, 198, '乾電池 2 個', { size: 13 }),
          tag(270, 216, '直列で明るく', { size: 13 }),
          tag(160, 236, '＋と−を逆につなぐとはたらかない', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'electricity-mp1-w1', concept: 'el-circuit',
      prompt: '予想しよう。豆電球と乾電池 1 個の回路で、乾電池の＋極と−極を入れかえると、豆電球はどうなると思う？',
      options: ['光る', '光らない', 'こわれる'],
      answer: 'a',
      explanation: '豆電球は、電流がどちら向きに流れても光ります。向きによってはたらきが変わる器具もあるので、このステージで確かめよう。',
      hint: '豆電球のフィラメントは、電流の向きを区別するかな。',
    }),
    problems: [
      fill({
        id: 'electricity-mp1-t1', concept: 'el-circuit', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電流が流れる道すじを[b1]という。',
        blanks: [word('b1', ['回路', '電圧', '導体'], '回路')],
        explanation: '電流が流れる、ひとまわりの道すじを**回路**といいます。',
        hint: '「回る」「路（みち）」と書くよ。',
      }),
      figureChoice({
        id: 'electricity-mp1-p1', concept: 'el-circuit',
        prompt: 'ア・イは、乾電池 1 個と豆電球 2 個の回路です。豆電球が一列につながった直列回路はどちら？',
        figure: scene(twoCircuitsItems(true)),
        answer: 'r1',
        explanation: '電流の道すじが 1 本で、豆電球が一列につながっているアが直列回路です。イは道すじが枝分かれしている並列回路です。',
        hint: '電流の道すじが枝分かれしていないほうをさがそう。',
      }),
      choice({
        id: 'electricity-mp1-p2', concept: 'el-circuit',
        prompt: '豆電球が光っている回路で、乾電池の＋極と−極を入れかえると、豆電球はどうなる？',
        options: ['光る', '光らない', '光ったり消えたりする'],
        answer: 'a',
        explanation: '豆電球は、電流の向きが逆になっても光ります。',
        hint: '豆電球は、電流の向きで光り方が変わるかな。',
      }),
      choice({
        id: 'electricity-mp1-p3', concept: 'el-circuit',
        prompt: 'モーターが時計回りに回っている回路で、乾電池の＋極と−極を入れかえると、モーターはどうなる？',
        options: ['反時計回りに回る', '時計回りに回る', '回らなくなる'],
        answer: 'a',
        explanation: 'モーターは、電流の向きが逆になると、回る向きも逆になります。だから反時計回りに回ります。',
        hint: '電流の向きが逆になると、モーターの回る向きは？',
      }),
      choice({
        id: 'electricity-mp1-p4', concept: 'el-circuit',
        prompt: '鳴っている電子オルゴールの回路で、乾電池の＋極と−極を入れかえると、どうなる？',
        options: ['鳴らなくなる', '同じように鳴る', '大きな音で鳴る'],
        answer: 'a',
        explanation: '電子オルゴールは、決まった向きに電流が流れたときだけ鳴ります。＋極と−極を逆にすると鳴りません。',
        hint: '電子オルゴールには、＋と−のつなぎ方の決まりがあるよ。',
      }),
      fill({
        id: 'electricity-mp1-p5', concept: 'el-circuit',
        prompt: '空らんに入る数を入れよう。',
        text: '乾電池 1 個の電圧は約[b1]、家庭のコンセントの電圧は[b2]である。',
        blanks: [number('b1', 1.5, 0, 'V'), number('b2', 100, 0, 'V')],
        explanation: '乾電池 1 個の電圧は約 1.5 V、日本の家庭のコンセントの電圧は 100 V です。',
        hint: '乾電池に書いてある数を思い出そう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'electricity-mp1-r1', concept: 'el-circuit',
        prompt: '豆電球と乾電池 1 個の回路を、乾電池 2 個の直列につなぎかえました。豆電球の明るさはどうなる？',
        options: ['明るくなる', '暗くなる', '変わらない'],
        answer: 'a',
        explanation: '乾電池 2 個を直列につなぐと、豆電球に加わる電圧が大きくなり、流れる電流も大きくなるので、明るくなります。',
        hint: '直列につないだ乾電池の電圧は、1 個のときとくらべてどうなるかな。',
      }),
      choice({
        id: 'electricity-mp1-r2', concept: 'el-circuit',
        prompt: '光っている発光ダイオード（LED）を、逆向きにつなぎかえました。どうなる？',
        options: ['光らない', '同じように光る', 'もっと明るく光る'],
        answer: 'a',
        explanation: '発光ダイオードは、決まった向きに電流が流れたときだけ光ります。逆向きにつなぐと光りません。',
        hint: '電子オルゴールと同じ性質だよ。',
      }),
      choice({
        id: 'electricity-mp1-r3', concept: 'el-circuit',
        prompt: '時計回りに回っているモーターの回路で、乾電池はそのままで、モーターにつながる 2 本の導線をつなぎかえました。モーターはどうなる？',
        options: ['反時計回りに回る', '時計回りに回る', '回らない'],
        answer: 'a',
        explanation: '導線をつなぎかえると、モーターに流れる電流の向きが逆になります。だから回る向きも逆の反時計回りになります。',
        hint: 'モーターに流れる電流の向きはどうなったかな。',
      }),
      figureChoice({
        id: 'electricity-mp1-r4', concept: 'el-circuit',
        prompt: 'ア・イは、乾電池 1 個と豆電球 2 個の回路です。電流の道すじが枝分かれしている並列回路はどちら？',
        figure: scene(twoCircuitsItems(true)),
        answer: 'r2',
        explanation: 'イは、電流の道すじが 2 つに枝分かれしているので並列回路です。',
        hint: '黒い点（枝分かれする点）があるほうだよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp2: 電気用図記号と回路図 ----
  const elecMp2 = {
    id: 'electricity-mp2', areaId: 'el-miniprint', title: 'プリント 2: 電気用図記号と回路図', minutes: 5, concepts: ['el-circuit'],
    lessons: [
      {
        id: 'electricity-mp2-c1',
        text: '回路を**電気用図記号**で表した図を**回路図**といいます。電池は長い線が＋極、短い線が−極です。豆電球・スイッチ・抵抗器（電熱線）・電流計・電圧計にも、それぞれ決まった記号があります。',
        figure: scene(SYMBOL_ORDER.flatMap((k, i) => {
          const x = 60 + 100 * (i % 3), y = i < 3 ? 56 : 146;
          return [sym(k, x, y), note(x, y + 36, ['抵抗器', '電流計', '電池', 'スイッチ', '電圧計', '豆電球'][i], 14)];
        })),
      },
      {
        id: 'electricity-mp2-c2',
        text: '回路図は、導線を縦と横のまっすぐな線でかき、つながっている順に記号を置きます。導線が枝分かれする点には黒い点（●）をかきます。実物の配線と見くらべて、電流の道すじが同じになるようにかきます。',
        figure: scene(diagramPairItems(false).concat([note(80, 234, '直列'), note(245, 234, '並列（●で枝分かれ）')])),
      },
    ],
    warmup: choice({
      id: 'electricity-mp2-w1', concept: 'el-circuit',
      prompt: '予想しよう。電池の電気用図記号には、長い線と短い線があります。＋極を表すのはどちらだと思う？',
      options: ['長い線', '短い線', 'どちらでもない'],
      answer: 'a',
      explanation: '電池の記号は、長い線が＋極、短い線が−極です。',
      hint: '「＋」は「−」より線が 1 本多い記号だね。長いほうを思いうかべよう。',
    }),
    problems: [
      choice({
        id: 'electricity-mp2-t1', concept: 'el-circuit', term: true,
        prompt: '次の説明に合う言葉はどれ？「回路を、電気用図記号を使って表した図」',
        options: ['回路図', '天気図', '設計図'],
        answer: 'a',
        explanation: '電気用図記号を使って回路を表した図を**回路図**といいます。だれが見ても同じように分かります。',
        hint: '「回路」の「図」だよ。',
      }),
      figureChoice({
        id: 'electricity-mp2-p1', concept: 'el-circuit',
        prompt: 'ア〜カは電気用図記号です。抵抗器（電熱線）を表す記号はどれ？',
        figure: symbolsFigure(),
        answer: 'r1',
        explanation: '抵抗器（電熱線）は、細長い長方形の記号です（ア）。',
        hint: '細長い四角の記号だよ。',
      }),
      figureChoice({
        id: 'electricity-mp2-p2', concept: 'el-circuit',
        prompt: 'ア〜カは電気用図記号です。電池を表す記号はどれ？',
        figure: symbolsFigure(),
        answer: 'r3',
        explanation: '電池は、長い線（＋極）と短い線（−極）を組み合わせた記号です（ウ）。',
        hint: '長さのちがう 2 本の線の記号だよ。',
      }),
      choice({
        id: 'electricity-mp2-p3', concept: 'el-circuit',
        prompt: '電池の電気用図記号で、長い線が表しているのはどちらの極？',
        options: ['＋極', '−極'],
        answer: 'a',
        explanation: '電池の記号は、長い線が＋極、短い線が−極です。電流は＋極から出て−極に入ります。',
        hint: '長いほうが「＋」だよ。',
      }),
      figureChoice({
        id: 'electricity-mp2-p4', concept: 'el-circuit',
        prompt: '電池・スイッチ・豆電球 2 個を、すべて一列につないだ回路があります。この回路を正しく表した回路図は、ア・イのどちら？',
        figure: scene(diagramPairItems(true)),
        answer: 'r1',
        explanation: 'すべてが一列につながっているので、枝分かれのないアが正しい回路図です。イは豆電球 2 個が枝分かれして並列につながっています。',
        hint: '枝分かれする点（●）があるかどうかを見よう。',
      }),
      figureChoice({
        id: 'electricity-mp2-p5', concept: 'el-circuit',
        prompt: 'ア〜カは電気用図記号です。スイッチを表す記号はどれ？',
        figure: symbolsFigure(),
        answer: 'r4',
        explanation: 'スイッチは、線の一部が開いて、ななめになった記号です（エ）。',
        hint: '線がとちゅうで開いている記号だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'electricity-mp2-r1', concept: 'el-circuit',
        prompt: 'ア〜カは電気用図記号です。電流計を表す記号はどれ？',
        figure: symbolsFigure(),
        answer: 'r2',
        explanation: '電流計は、丸の中に A（アンペア）を書いた記号です（イ）。',
        hint: '電流の単位の記号が入った丸だよ。',
      }),
      figureChoice({
        id: 'electricity-mp2-r2', concept: 'el-circuit',
        prompt: 'ア〜カは電気用図記号です。電圧計を表す記号はどれ？',
        figure: symbolsFigure(),
        answer: 'r5',
        explanation: '電圧計は、丸の中に V（ボルト）を書いた記号です（オ）。',
        hint: '電圧の単位の記号が入った丸だよ。',
      }),
      figureChoice({
        id: 'electricity-mp2-r3', concept: 'el-circuit',
        prompt: 'ア〜カは電気用図記号です。豆電球を表す記号はどれ？',
        figure: symbolsFigure(),
        answer: 'r6',
        explanation: '豆電球は、丸の中に × を書いた記号です（カ）。',
        hint: '丸の中に × がある記号だよ。',
      }),
      choice({
        id: 'electricity-mp2-r4', concept: 'el-circuit',
        prompt: '回路図で、導線が枝分かれする点には何をかく？',
        options: ['黒い点（●）', '白い丸（○）', '何もかかない'],
        answer: 'a',
        explanation: '導線が枝分かれしたり合流したりする点には、黒い点（●）をかきます。',
        hint: '並列回路の回路図を思い出そう。',
      }),
      figureChoice({
        id: 'electricity-mp2-r5', concept: 'el-circuit',
        prompt: '電池とスイッチにつないだ導線が枝分かれし、2 つの豆電球が並列につながった回路があります。この回路を表した回路図は、ア・イのどちら？',
        figure: scene(diagramPairItems(true)),
        answer: 'r2',
        explanation: '豆電球 2 個が枝分かれした導線にそれぞれつながっているイが、並列の回路図です。',
        hint: '枝分かれする点（●）があるほうだよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp3: 電流計と電圧計の使い方 ----
  const elecMp3 = {
    id: 'electricity-mp3', areaId: 'el-miniprint', title: 'プリント 3: 電流計と電圧計の使い方', minutes: 6, concepts: ['el-circuit'],
    lessons: [
      {
        id: 'electricity-mp3-c1',
        text: '電流計の目盛りは、つないだ−端子で読み方が変わります。5 A の端子なら目盛りの数をそのまま A で、500 mA なら 100 倍して mA で、50 mA なら 10 倍して mA で読みます。はじめは、いちばん大きい 5 A の端子につなぎます。',
        // 写真（elec-1-c3 の画像）: 電流計の正面。目盛り板 (75〜245, 8〜130)、下の端子は左から黒い−端子 3 つ (85, 162)・(136, 162)・(186, 162)
        // と赤い＋端子 (236, 162)。写真の針の位置は決められないので、読みの例は文字だけで示す
        figure: scene([
          photo('elec-1-c3'),
          tag(160, 62, '針が 3.5 の目盛りをさすとき', { size: 13 }),
          tag(160, 82, '5 A → 3.5 A', { size: 13 }),
          tag(160, 100, '500 mA → 350 mA', { size: 13 }),
          tag(160, 118, '50 mA → 35 mA', { size: 13 }),
          { type: 'circle', x: 85, y: 162, r: 22, fill: 'none', stroke: 'orange' },
          tag(85, 199, '5 A', { size: 13 }),
          pointer(136, 184, 136, 206), tag(136, 218, '500 mA', { size: 13 }),
          tag(186, 199, '50 mA', { size: 13 }),
          tag(236, 199, '＋', { size: 13, bold: true }),
          tag(160, 236, 'はじめは 5 A の端子につなぐ', { size: 13 }),
        ]),
      },
      {
        id: 'electricity-mp3-c2',
        text: '電圧計は、はかりたい部分に**並列**につなぎ、＋端子を電池の＋極側に、−端子を−極側につなぎます。＋と−を逆につなぐと、針が反対にふれてこわれることがあります。電流計は、はかりたい部分に**直列**につなぎます。',
        figure: scene([
          sym('ammeter', 100, 70), sym('resistor', 210, 70), sym('voltmeter', 210, 22), sym('battery', 160, 190),
          wire([[80, 70], [40, 70], [40, 190], [140, 190]]),
          wire([[120, 70], [190, 70]]),
          wire([[230, 70], [280, 70], [280, 190], [180, 190]]),
          wire([[175, 70], [175, 22], [190, 22]]),
          wire([[230, 22], [245, 22], [245, 70]]),
          dot(175, 70), dot(245, 70),
          note(100, 104, '電流計は直列'), note(110, 26, '電圧計は並列', 12),
          note(132, 182, '＋', 13), note(160, 226, '電池（左が＋極）'),
        ]),
      },
    ],
    warmup: choice({
      id: 'electricity-mp3-w1', concept: 'el-circuit',
      prompt: '予想しよう。電流計の針が、目盛りのいちばん右をこえてふり切れそうになりました。どうするとよいと思う？',
      options: ['もっと大きい値の−端子につなぎかえる', 'もっと小さい値の−端子につなぎかえる', 'そのまま読む'],
      answer: 'a',
      explanation: '針がふり切れると電流計がこわれることがあります。より大きい値の−端子につなぎかえます。はじめから大きい値の端子につなぐのが安全です。',
      hint: '目盛りの右はしまでに、もっと大きい電流を表せるのはどちらかな。',
    }),
    problems: [
      fill({
        id: 'electricity-mp3-t1', concept: 'el-circuit', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電流計ははかりたい部分に[b1]に、電圧計ははかりたい部分に[b2]につなぐ。',
        blanks: [
          word('b1', ['直列', '並列'], '直列'),
          word('b2', ['直列', '並列'], '並列'),
        ],
        explanation: '電流計は**直列**、電圧計は**並列**につなぎます。逆につなぐと正しくはかれず、こわれることもあります。',
        hint: '電流計の中を、はかりたい電流が通るようにするには？',
      }),
      figureChoice({
        id: 'electricity-mp3-p1', concept: 'el-circuit',
        prompt: '回路に流れる電流の大きさが分かりません。電流計の端子のうち、はじめに導線をつなぐ−端子は、ア〜ウのどれ？（エは＋端子）',
        // 写真（elec-1-c3 の画像）: 端子は左から (85, 162)・(136, 162)・(186, 162)・＋端子 (236, 162)。選ぶ場所は各端子の真上の目盛り板
        figure: scene([
          photo('elec-1-c3'),
          tag(160, 22, '電流計の端子（−端子は 3 つ）', { size: 13 }),
          ...[85, 136, 186, 236].map((x, i) => ({ type: 'region', id: 'r' + (i + 1), x, y: 112, r: 22, label: 'アイウエ'[i] })),
          tag(85, 199, '5 A', { size: 13 }),
          pointer(136, 184, 136, 206), tag(136, 218, '500 mA', { size: 13 }),
          tag(186, 199, '50 mA', { size: 13 }),
          tag(236, 199, '＋', { size: 13, bold: true }),
        ]),
        answer: 'r1',
        explanation: 'いちばん大きい値を測れる 5 A の−端子（ア）につなぎます。針のふれが小さいときは、500 mA、50 mA の順につなぎかえます。',
        hint: '針がふり切れないようにするには、いちばん大きい値の端子だよ。',
      }),
      fill({
        id: 'electricity-mp3-p2', concept: 'el-circuit',
        prompt: '電流計の−端子を 5 A につないだら、針が図のようにふれました。空らんに入る数を入れよう。',
        figure: scene(meterFace(5, 50, ['0', '1', '2', '3', '4', '5'], 3.5, '')),
        text: '電流の大きさは[b1]である。',
        blanks: [number('b1', 3.5, 0, 'A')],
        explanation: '5 A の端子では、目盛りの数をそのまま A で読みます。針は 3.5 をさしているので 3.5 A です。',
        hint: '大きい目盛りの 3 から、小さい目盛りをいくつ進んだか数えよう。',
      }),
      fill({
        id: 'electricity-mp3-p3', concept: 'el-circuit',
        prompt: '同じふれ方で、−端子を 500 mA につないでいたとします。空らんに入る数を入れよう。',
        figure: scene(meterFace(5, 50, ['0', '1', '2', '3', '4', '5'], 3.5, '')),
        text: '電流の大きさは[b1]である。',
        blanks: [number('b1', 350, 0, 'mA')],
        explanation: '500 mA の端子では、目盛りの右はし 5 が 500 mA を表すので、目盛りの数を 100 倍して読みます。3.5 × 100 ＝ 350 mA です。',
        hint: '右はしの 5 が 500 mA になるように考えよう。',
      }),
      fill({
        id: 'electricity-mp3-p4', concept: 'el-circuit',
        prompt: '電流計の−端子を 50 mA につないだら、針が図のようにふれました。空らんに入る数を入れよう。',
        figure: scene(meterFace(5, 50, ['0', '1', '2', '3', '4', '5'], 1.2, '')),
        text: '電流の大きさは[b1]である。',
        blanks: [number('b1', 12, 0, 'mA')],
        explanation: '50 mA の端子では、目盛りの右はし 5 が 50 mA を表すので、目盛りの数を 10 倍して読みます。1.2 × 10 ＝ 12 mA です。',
        hint: '右はしの 5 が 50 mA になるように考えよう。',
      }),
      choice({
        id: 'electricity-mp3-p5', concept: 'el-circuit',
        prompt: '電流計の＋端子と−端子を逆につなぐと、針はどうなる？',
        options: ['ふだんと反対側にふれ、こわれることがある', 'ふだんと同じようにふれる', '針は動かない'],
        answer: 'a',
        explanation: '＋と−を逆につなぐと、電流が逆向きに流れて針が反対側（左）にふれ、電流計がこわれることがあります。＋端子は電源の＋極側につなぎます。',
        hint: '電流計は、電流の向きを区別する器具だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'electricity-mp3-r1', concept: 'el-circuit',
        prompt: '電流計の−端子を 5 A につないだら、針が図のようにふれました。空らんに入る数を入れよう。',
        figure: scene(meterFace(5, 50, ['0', '1', '2', '3', '4', '5'], 1.2, '')),
        text: '電流の大きさは[b1]である。',
        blanks: [number('b1', 1.2, 0, 'A')],
        explanation: '5 A の端子では、目盛りの数をそのまま A で読みます。針は 1.2 をさしているので 1.2 A です。',
        hint: '大きい目盛りの 1 から、小さい目盛りをいくつ進んだか数えよう。',
      }),
      fill({
        id: 'electricity-mp3-r2', concept: 'el-circuit',
        prompt: '電圧計の−端子を 15 V につないだら、針が図のようにふれました。空らんに入る数を入れよう。',
        figure: scene(meterFace(15, 30, ['0', '5', '10', '15'], 9, 'V')),
        text: '電圧の大きさは[b1]である。',
        blanks: [number('b1', 9, 0, 'V')],
        explanation: '15 V の端子では、目盛りの右はし 15 が 15 V を表します。小さい目盛りは 0.5 V ずつで、針は 9 をさしているので 9.0 V です。',
        hint: '大きい目盛りの 5 から、小さい目盛り 1 つが何 V か考えよう。',
      }),
      choice({
        id: 'electricity-mp3-r3', concept: 'el-circuit',
        prompt: '電圧計の＋端子は、電池のどちらの極側の導線につなぐ？',
        options: ['＋極側', '−極側', 'どちらでもよい'],
        answer: 'a',
        explanation: '電圧計の＋端子は電池の＋極側に、−端子は−極側につなぎます。',
        hint: '＋どうし、−どうしをそろえよう。',
      }),
      choice({
        id: 'electricity-mp3-r4', concept: 'el-circuit',
        prompt: '電圧計は、はかりたい部分に対してどのようにつなぐ？',
        options: ['並列につなぐ', '直列につなぐ', '電池だけにつなぐ'],
        answer: 'a',
        explanation: '電圧は 2 点のあいだの電気の差なので、電圧計ははかりたい部分の両はしに並列につなぎます。',
        hint: 'はかりたい部分の「両はし」につなぐよ。',
      }),
      choice({
        id: 'electricity-mp3-r5', concept: 'el-circuit',
        prompt: '電圧の単位と記号の組み合わせはどれ？',
        options: ['ボルト・V', 'アンペア・A', 'オーム・Ω'],
        answer: 'a',
        explanation: '電圧の単位はボルト（V）です。アンペア（A）は電流、オーム（Ω）は抵抗の単位です。',
        hint: '電圧計の記号の丸の中の文字だよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp4: 直列回路・並列回路の電流と電圧 ----
  const elecMp4 = {
    id: 'electricity-mp4', areaId: 'el-miniprint', title: 'プリント 4: 直列回路・並列回路の電流と電圧', minutes: 5, concepts: ['el-rule'],
    lessons: [
      {
        id: 'electricity-mp4-c1',
        anim: 'el-series-parallel',   // 動く図の使い回し（js/anim-physics.js）。figure は静止図として残す
        text: '電流は、水の流れにたとえると考えやすくなります。直列回路は 1 本の水路なので、電流の大きさはどこでも同じです。並列回路は水路が枝分かれするので、枝の電流の和が、分かれる前や合流したあとの電流になります。',
        figure: scene(parallelABCDItems({ A: '0.5 A', B: '0.2 A', C: '0.3 A', D: '0.5 A' })),
      },
      {
        id: 'electricity-mp4-c2',
        text: '電圧は、水路の高さの差にたとえられます。直列回路では、各部分の電圧の和が全体（電源）の電圧になります。並列回路では、どの枝にも電源と同じ大きさの電圧が加わります。',
        figure: scene(seriesABCItems({ ab: '3.0 V', bc: '2.0 V', ac: '3.0 ＋ 2.0 ＝ 5.0 V' })),
      },
    ],
    warmup: choice({
      id: 'electricity-mp4-w1', concept: 'el-rule',
      prompt: '予想しよう。豆電球 2 個を直列につないだ回路で、電池に近い豆電球と遠い豆電球では、流れる電流はどうなっていると思う？',
      options: ['どちらも同じ', '電池に近いほうが大きい', '電池から遠いほうが大きい'],
      answer: 'a',
      explanation: '直列回路は電流の道すじが 1 本なので、どこでも電流の大きさは同じです。豆電球で電流が使われて減ることはありません。',
      hint: '1 本の水路を流れる水の量は、とちゅうで変わるかな。',
    }),
    problems: [
      choice({
        id: 'electricity-mp4-t1', concept: 'el-rule', term: true,
        prompt: '次の説明に合う言葉はどれ？「電流の道すじが、とちゅうで枝分かれしている回路」',
        options: ['並列回路', '直列回路', '回路図'],
        answer: 'a',
        explanation: '電流の道すじが枝分かれしている回路を**並列回路**といいます。',
        hint: '豆電球が横にならぶように、枝分かれするつなぎ方だよ。',
      }),
      figureChoice({
        id: 'electricity-mp4-p1', concept: 'el-rule',
        prompt: '並列回路の点 A〜D のうち、点 A（分かれる前）と同じ大きさの電流が流れているのはどこ？（ア B、イ C、ウ D）',
        figure: scene(parallelABCDItems().concat([
          { type: 'region', id: 'r1', x: 100, y: 84, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 100, y: 158, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 236, y: 165, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '分かれる前の A の電流は、B と C に分かれ、合流した D でもとの大きさにもどります。だから D（ウ）が A と同じです。',
        hint: '分かれた電流が、また 1 つにまとまるところはどこかな。',
      }),
      fill({
        id: 'electricity-mp4-p2', concept: 'el-rule',
        prompt: '並列回路で、点 A に 0.5 A、点 B に 0.2 A の電流が流れています。空らんに入る数を入れよう。',
        figure: scene(parallelABCDItems({ A: '0.5 A', B: '0.2 A' })),
        text: '点 C に流れる電流は[b1]である。',
        blanks: [number('b1', 0.3, 0, 'A')],
        explanation: '分かれる前の電流は、枝の電流の和です。C ＝ 0.5 − 0.2 ＝ 0.3 A です。',
        hint: 'B と C をたすと A になるよ。',
      }),
      fill({
        id: 'electricity-mp4-p3', concept: 'el-rule',
        prompt: '豆電球 2 個の直列回路で、AB 間の電圧は 3.0 V、BC 間の電圧は 2.0 V でした。空らんに入る数を入れよう。',
        figure: scene(seriesABCItems()),
        text: 'AC 間の電圧は[b1]である。',
        blanks: [number('b1', 5, 0, 'V')],
        explanation: '直列回路では、各部分の電圧の和が全体の電圧になります。3.0 ＋ 2.0 ＝ 5.0 V です。',
        hint: '直列では、電圧はたし算だよ。',
      }),
      fill({
        id: 'electricity-mp4-p4', concept: 'el-rule',
        prompt: '豆電球 2 個を並列につなぎました。一方の豆電球の両はし DE 間の電圧は 4.0 V でした。空らんに入る数を入れよう。',
        text: 'もう一方の豆電球の両はし FG 間の電圧は[b1]である。',
        blanks: [number('b1', 4, 0, 'V')],
        explanation: '並列回路では、どの枝にも電源と同じ大きさの電圧が加わるので、FG 間も 4.0 V です。',
        hint: '並列では、どの枝の電圧も同じだよ。',
      }),
      choice({
        id: 'electricity-mp4-p5', concept: 'el-rule',
        prompt: '回路の電流の流れ方を考えるとき、何にたとえると考えやすい？',
        options: ['水路を流れる水', '空を飛ぶ鳥', '燃えるろうそく'],
        answer: 'a',
        explanation: '電流は水の流れにたとえると分かりやすくなります。1 本の水路（直列）では水の量はどこでも同じで、枝分かれ（並列）すると、分かれた水の量の和がもとの量になります。',
        hint: '流れて、分かれて、また合流するものだよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'electricity-mp4-r1', concept: 'el-rule',
        prompt: '豆電球 2 個の直列回路で、AC 間の電圧は 8.0 V、AB 間の電圧は 3.5 V でした。空らんに入る数を入れよう。',
        figure: scene(seriesABCItems()),
        text: 'BC 間の電圧は[b1]である。',
        blanks: [number('b1', 4.5, 0, 'V')],
        explanation: '直列回路では AB 間と BC 間の電圧の和が AC 間の電圧です。8.0 − 3.5 ＝ 4.5 V です。',
        hint: '全体の電圧から、わかっている部分の電圧をひこう。',
      }),
      fill({
        id: 'electricity-mp4-r2', concept: 'el-rule',
        prompt: '豆電球 2 個を並列につなぎました。一方の豆電球の両はし FG 間の電圧は 2.5 V でした。空らんに入る数を入れよう。',
        text: 'もう一方の豆電球の両はし DE 間の電圧は[b1]である。',
        blanks: [number('b1', 2.5, 0, 'V')],
        explanation: '並列回路では、どの枝の電圧も同じなので、DE 間も 2.5 V です。',
        hint: '並列では、どの枝の電圧も同じだよ。',
      }),
      fill({
        id: 'electricity-mp4-r3', concept: 'el-rule',
        prompt: '並列回路で、点 B に 0.2 A、点 C に 0.3 A の電流が流れています。空らんに入る数を入れよう。',
        figure: scene(parallelABCDItems({ B: '0.2 A', C: '0.3 A' })),
        text: '合流したあとの点 D に流れる電流は[b1]である。',
        blanks: [number('b1', 0.5, 0, 'A')],
        explanation: '合流したあとの電流は、枝の電流の和です。0.2 ＋ 0.3 ＝ 0.5 A です。',
        hint: '分かれた水が、また合流すると考えよう。',
      }),
      choice({
        id: 'electricity-mp4-r4', concept: 'el-rule',
        prompt: '豆電球 2 個の直列回路で、点 A に 0.3 A の電流が流れています。点 C の電流はどうなっている？',
        figure: scene(seriesABCItems()),
        options: ['0.3 A（A と同じ）', '0.3 A より小さい', '0.3 A より大きい'],
        answer: 'a',
        explanation: '直列回路は電流の道すじが 1 本なので、どこでも電流の大きさは同じ 0.3 A です。',
        hint: '1 本の水路を流れる水の量は、どこでも同じだね。',
      }),
    ],
  };

  // ---- ステージ electricity-mp5: オームの法則の計算 ----
  // 3 つの小さなグラフ（横 電圧、たて 電流。ア 原点を通る直線、イ 途中から平らになる曲線、ウ 横ばいの直線）
  function threeGraphsItems() {
    const items = [];
    [10, 115, 220].forEach((x0, i) => {
      items.push(
        { type: 'line', points: [[x0 + 10, 180], [x0 + 92, 180]], width: 2, arrow: true },
        { type: 'line', points: [[x0 + 10, 180], [x0 + 10, 50]], width: 2, arrow: true },
        { type: 'text', x: x0 + 92, y: 198, text: '電圧', size: 12, anchor: 'end' },
        { type: 'text', x: x0 + 14, y: 48, text: '電流', size: 12 },
      );
      const pts = i === 0 ? [[x0 + 10, 180], [x0 + 85, 70]]
        : i === 1 ? [[x0 + 10, 180], [x0 + 30, 120], [x0 + 50, 96], [x0 + 70, 88], [x0 + 85, 86]]
          : [[x0 + 10, 120], [x0 + 85, 120]];
      items.push({ type: 'line', points: pts, color: 'blue', width: 3 });
      items.push({ type: 'region', id: 'r' + (i + 1), x: x0 + 50, y: 222, r: 22, label: 'アイウ'[i] });
    });
    return items;
  }

  // 電熱線 b の電圧と電流（10 V で 0.2 A。横 5 V ＝ 40px、たて 0.1 A ＝ 25px）
  function bLineItems() {
    return axes('電圧〔V〕', '電流〔A〕', ['5', '10', '15', '20', '25'], ['0.1', '0.2', '0.3', '0.4', '0.5'])
      .concat([{ type: 'line', points: [[50, 200], [250, 75]], color: 'blue', width: 3 }, { type: 'text', x: 256, y: 72, text: 'b', size: 14, bold: true }]);
  }

  const elecMp5 = {
    id: 'electricity-mp5', areaId: 'el-miniprint', title: 'プリント 5: オームの法則の計算', minutes: 6, concepts: ['el-ohm'],
    lessons: [
      {
        id: 'electricity-mp5-c1',
        text: '電熱線に加える電圧を 2 倍、3 倍にすると、流れる電流も 2 倍、3 倍になります。電流は電圧に**比例**し、これを**オームの法則**といいます。電圧〔V〕＝抵抗〔Ω〕×電流〔A〕で、抵抗＝電圧÷電流、電流＝電圧÷抵抗とも表せます。',
        figure: scene(bLineItems().concat([note(130, 50, '10 V で 0.2 A', 13), note(130, 70, '20 V で 0.4 A', 13)])),
      },
      {
        id: 'electricity-mp5-c2',
        text: '計算では、mA を A になおしてから式に入れます。たとえば 8 V で 40 mA（0.04 A）流れるなら、抵抗は 8 ÷ 0.04 ＝ 200 Ω です。求めるものに合わせて、3 つの式を使い分けます。',
        // 覚え方の三角形（V を上、R と I を下）
        figure: scene([
          { type: 'polygon', points: [[160, 30], [270, 200], [50, 200]], fill: 'white' },
          { type: 'line', points: [[105, 115], [215, 115]], width: 2 },
          { type: 'line', points: [[160, 115], [160, 200]], width: 2 },
          { type: 'text', x: 160, y: 98, text: 'V', size: 24, anchor: 'middle', bold: true },
          { type: 'text', x: 122, y: 174, text: 'R', size: 24, anchor: 'middle', bold: true },
          { type: 'text', x: 198, y: 174, text: 'I', size: 24, anchor: 'middle', bold: true },
          note(160, 226, 'V ＝ R × I　R ＝ V ÷ I　I ＝ V ÷ R', 13),
          { type: 'text', x: 6, y: 40, text: '1 mA ＝ 0.001 A', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'electricity-mp5-w1', concept: 'el-ohm',
      prompt: '予想しよう。電熱線に 10 V の電圧を加えると 0.2 A の電流が流れました。20 V にすると、電流はどうなると思う？',
      options: ['0.4 A になる', '0.2 A のまま', '0.1 A になる'],
      answer: 'a',
      explanation: '電流は電圧に比例するので、電圧を 2 倍にすると電流も 2 倍の 0.4 A になります。',
      hint: '電圧を 2 倍にしたね。',
    }),
    problems: [
      fill({
        id: 'electricity-mp5-t1', concept: 'el-ohm', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電熱線に流れる電流は、加わる電圧に[b1]する。この関係を[b2]という。',
        blanks: [
          word('b1', ['比例', '反比例'], '比例'),
          word('b2', ['オームの法則', 'フックの法則', 'フレミングの左手の法則'], 'オームの法則'),
        ],
        explanation: '電流は電圧に**比例**します。この関係を**オームの法則**といいます。',
        hint: '電圧が 2 倍になると電流も 2 倍になる関係だよ。',
      }),
      figureChoice({
        id: 'electricity-mp5-p1', concept: 'el-ohm',
        prompt: '電熱線の電圧と電流の関係を表すグラフとして正しいものは、ア〜ウのどれ？',
        figure: scene(threeGraphsItems()),
        answer: 'r1',
        explanation: '電流は電圧に比例するので、グラフは原点を通る直線になります（ア）。',
        hint: '比例のグラフは、どんな形だったかな。',
      }),
      fill({
        id: 'electricity-mp5-p2', concept: 'el-ohm',
        prompt: '電熱線 b に 10 V の電圧を加えると 0.2 A の電流が流れました。空らんに入る数を入れよう。',
        figure: scene(bLineItems()),
        text: '20 V を加えると[b1]、25 V を加えると[b2]の電流が流れる。',
        blanks: [number('b1', 0.4, 0, 'A'), number('b2', 0.5, 0, 'A')],
        explanation: '電流は電圧に比例します。20 V は 10 V の 2 倍なので 0.4 A、25 V は 2.5 倍なので 0.5 A です。',
        hint: '電圧が何倍になったかを考えよう。',
      }),
      fill({
        id: 'electricity-mp5-p3', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '6 V の電圧を加えると 2.0 A の電流が流れる抵抗は[b1]である。',
        blanks: [number('b1', 3, 0, 'Ω')],
        explanation: '抵抗＝電圧÷電流 なので、6 ÷ 2.0 ＝ 3 Ω です。',
        hint: 'R ＝ V ÷ I を使おう。',
      }),
      fill({
        id: 'electricity-mp5-p4', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '50 Ω の抵抗に 20 V の電圧を加えると、流れる電流は[b1]である。',
        blanks: [number('b1', 0.4, 0, 'A')],
        explanation: '電流＝電圧÷抵抗 なので、20 ÷ 50 ＝ 0.4 A です。',
        hint: 'I ＝ V ÷ R を使おう。',
      }),
      fill({
        id: 'electricity-mp5-p5', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '20 Ω の抵抗に 2 A の電流が流れているとき、加わる電圧は[b1]である。',
        blanks: [number('b1', 40, 0, 'V')],
        explanation: '電圧＝抵抗×電流 なので、20 × 2 ＝ 40 V です。',
        hint: 'V ＝ R × I を使おう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'electricity-mp5-r1', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '8 V の電圧を加えると 40 mA の電流が流れる抵抗は[b1]である。',
        blanks: [number('b1', 200, 0, 'Ω')],
        explanation: '40 mA ＝ 0.04 A なので、抵抗＝8 ÷ 0.04 ＝ 200 Ω です。',
        hint: 'mA を A になおしてから計算しよう。',
      }),
      fill({
        id: 'electricity-mp5-r2', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '6 V の電圧を加えると 0.5 A の電流が流れる抵抗は[b1]である。',
        blanks: [number('b1', 12, 0, 'Ω')],
        explanation: '抵抗＝電圧÷電流 なので、6 ÷ 0.5 ＝ 12 Ω です。',
        hint: 'R ＝ V ÷ I を使おう。',
      }),
      fill({
        id: 'electricity-mp5-r3', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '50 Ω の抵抗に 12 V の電圧を加えると、流れる電流は[b1]である。',
        blanks: [number('b1', 0.24, 0, 'A')],
        explanation: '電流＝電圧÷抵抗 なので、12 ÷ 50 ＝ 0.24 A です。',
        hint: 'I ＝ V ÷ R を使おう。',
      }),
      fill({
        id: 'electricity-mp5-r4', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '20 Ω の抵抗に 0.4 A の電流が流れているとき、加わる電圧は[b1]である。',
        blanks: [number('b1', 8, 0, 'V')],
        explanation: '電圧＝抵抗×電流 なので、20 × 0.4 ＝ 8 V です。',
        hint: 'V ＝ R × I を使おう。',
      }),
      fill({
        id: 'electricity-mp5-r5', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '8 V の電圧を加えると 200 mA の電流が流れる抵抗は[b1]である。',
        blanks: [number('b1', 40, 0, 'Ω')],
        explanation: '200 mA ＝ 0.2 A なので、抵抗＝8 ÷ 0.2 ＝ 40 Ω です。',
        hint: 'mA を A になおしてから計算しよう。',
      }),
      fill({
        id: 'electricity-mp5-r6', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '4 Ω の抵抗に 20 V の電圧を加えると、流れる電流は[b1]である。',
        blanks: [number('b1', 5, 0, 'A')],
        explanation: '電流＝電圧÷抵抗 なので、20 ÷ 4 ＝ 5 A です。',
        hint: 'I ＝ V ÷ R を使おう。',
      }),
      fill({
        id: 'electricity-mp5-r7', concept: 'el-ohm',
        prompt: '空らんに入る数を入れよう。',
        text: '50 Ω の抵抗に 40 mA の電流が流れているとき、加わる電圧は[b1]である。',
        blanks: [number('b1', 2, 0, 'V')],
        explanation: '40 mA ＝ 0.04 A なので、電圧＝50 × 0.04 ＝ 2 V です。',
        hint: 'mA を A になおしてから計算しよう。',
      }),
    ],
  };

  // ---- ステージ electricity-mp6: 電圧と電流のグラフ・導体と不導体 ----
  // 電熱線 a（20 Ω。10 V で 0.5 A）と b（10 Ω。10 V で 1.0 A）のグラフ（横 2 V ＝ 40px、たて 0.2 A ＝ 25px）
  function abGraphItems() {
    return axes('電圧〔V〕', '電流〔A〕', ['2', '4', '6', '8', '10'], ['0.2', '0.4', '0.6', '0.8', '1.0'])
      .concat([
        { type: 'line', points: [[50, 200], [250, 137.5]], color: 'green', width: 3 },
        { type: 'line', points: [[50, 200], [250, 75]], color: 'blue', width: 3 },
        { type: 'text', x: 258, y: 140, text: 'a', size: 15, bold: true },
        { type: 'text', x: 258, y: 78, text: 'b', size: 15, bold: true },
      ]);
  }

  // 物質の抵抗の表（長さ 1 m、断面積 1 mm² のときのおよその値）
  function materialTable() {
    const rows = [['物質', '抵抗〔Ω〕'], ['銀', '0.016'], ['銅', '0.017'], ['金', '0.022'], ['鉄', '0.10'], ['ニクロム', '1.1'], ['ガラス', '10¹⁶ くらい'], ['ゴム', '10²⁰ くらい']];
    const items = [];
    rows.forEach((r, i) => {
      [[60, 100], [160, 120]].forEach(([x, w], j) => {
        items.push({ type: 'rect', x, y: 4 + 26 * i, width: w, height: 26, fill: i === 0 ? '#EEF2F8' : 'white', stroke: 'line' });
        items.push({ type: 'text', x: x + w / 2, y: 22 + 26 * i, text: r[j], size: 13, anchor: 'middle' });
      });
    });
    items.push(note(160, 232, '長さ 1 m・断面積 1 mm² のときの抵抗', 12));
    return items;
  }

  const elecMp6 = {
    id: 'electricity-mp6', areaId: 'el-miniprint', title: 'プリント 6: 電圧と電流のグラフ・導体と不導体', minutes: 6, concepts: ['el-ohm'],
    lessons: [
      {
        id: 'electricity-mp6-c1',
        text: '電流の流れにくさを**電気抵抗**（抵抗）といい、単位は**オーム**（Ω）です。電圧と電流のグラフでは、同じ電圧で電流が小さいほうが抵抗が大きくなります。グラフから電圧と電流を読みとり、抵抗＝電圧÷電流で求めます。',
        figure: scene(abGraphItems().concat([note(160, 30, '10 V で a は 0.5 A、b は 1.0 A', 13)])),
      },
      {
        id: 'electricity-mp6-c2',
        text: '銀・銅・鉄など、抵抗が小さく電流が流れやすい物質を**導体**といいます。ガラスやゴムなど、抵抗がとても大きく電流がほとんど流れない物質を**不導体**（絶縁体）といいます。導線には、抵抗が小さく値段の安い銅がよく使われます。',
        figure: scene(materialTable()),
      },
    ],
    warmup: choice({
      id: 'electricity-mp6-w1', concept: 'el-ohm',
      prompt: '予想しよう。電気のコードの中の金属の線は、何という金属が多く使われていると思う？',
      options: ['銅', '鉄', '金'],
      answer: 'a',
      explanation: '銅は抵抗が小さく電流が流れやすいうえ、金や銀より安いので、導線によく使われます。',
      hint: '10 円玉にも使われている金属だよ。',
    }),
    problems: [
      fill({
        id: 'electricity-mp6-t1', concept: 'el-ohm', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電流の流れにくさを[b1]といい、その単位は[b2]（記号 Ω）である。',
        blanks: [
          word('b1', ['電気抵抗', '電力', '電圧'], '電気抵抗'),
          word('b2', ['オーム', 'ワット', 'ボルト'], 'オーム'),
        ],
        explanation: '電流の流れにくさを**電気抵抗**（抵抗）といい、単位は**オーム**（Ω）です。',
        hint: 'Ω はギリシャ文字の「オメガ」だよ。',
      }),
      figureChoice({
        id: 'electricity-mp6-p1', concept: 'el-ohm',
        prompt: '2 種類の電熱線 a・b の電圧と電流のグラフです。電流が流れにくいのは、ア（a）とイ（b）のどちら？',
        figure: scene(abGraphItems().concat([{ type: 'region', id: 'r1', x: 286, y: 140, r: 22, label: 'ア' }, { type: 'region', id: 'r2', x: 286, y: 78, r: 22, label: 'イ' }])),
        answer: 'r1',
        explanation: '同じ電圧（たとえば 10 V）で、a は 0.5 A、b は 1.0 A しか流れないので、電流が小さい a（ア）のほうが流れにくい（抵抗が大きい）です。',
        hint: '同じ電圧のとき、電流が小さいのはどちらかな。',
      }),
      fill({
        id: 'electricity-mp6-p2', concept: 'el-ohm',
        prompt: 'グラフを読み、空らんに入る数を入れよう。',
        figure: scene(abGraphItems()),
        text: '電熱線 a に 10 V を加えたときの電流は[b1]で、a の抵抗は[b2]である。',
        blanks: [number('b1', 0.5, 0, 'A'), number('b2', 20, 0, 'Ω')],
        explanation: 'グラフから、10 V のとき a には 0.5 A 流れます。抵抗＝10 ÷ 0.5 ＝ 20 Ω です。',
        hint: '横の軸の 10 V から上へ進み、a の線とぶつかるところの電流を読もう。',
      }),
      fill({
        id: 'electricity-mp6-p3', concept: 'el-ohm',
        prompt: 'グラフを読み、空らんに入る数を入れよう。',
        figure: scene(abGraphItems()),
        text: '電熱線 b に 10 V を加えたときの電流は[b1]で、b の抵抗は[b2]である。',
        blanks: [number('b1', 1, 0, 'A'), number('b2', 10, 0, 'Ω')],
        explanation: 'グラフから、10 V のとき b には 1.0 A 流れます。抵抗＝10 ÷ 1.0 ＝ 10 Ω です。',
        hint: '横の軸の 10 V から上へ進み、b の線とぶつかるところの電流を読もう。',
      }),
      choice({
        id: 'electricity-mp6-p4', concept: 'el-ohm',
        prompt: '表の物質のうち、抵抗が最も小さいものはどれ？',
        figure: scene(materialTable()),
        options: ['銀', '銅', '鉄', 'ゴム'],
        answer: 'a',
        explanation: '表では銀が 0.016 Ω でいちばん小さく、電流を最も通しやすい物質です。',
        hint: '抵抗の数がいちばん小さい物質をさがそう。',
      }),
      choice({
        id: 'electricity-mp6-p5', concept: 'el-ohm',
        prompt: '家庭の電気のコードなど、配線に最もよく使われている金属はどれ？',
        options: ['銅', '銀', 'ニクロム'],
        answer: 'a',
        explanation: '銅は銀と同じくらい抵抗が小さく、銀よりずっと安いので、配線に使われます。ニクロムは抵抗が大きく、電熱線に使われます。',
        hint: '抵抗が小さく、値段も安い金属だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'electricity-mp6-r1', concept: 'el-ohm',
        prompt: '電熱線 a（抵抗 20 Ω）に 20 V の電圧を加えます。空らんに入る数を入れよう。',
        figure: scene(abGraphItems()),
        text: '流れる電流は[b1]である。',
        blanks: [number('b1', 1, 0, 'A')],
        explanation: '電流＝電圧÷抵抗 なので、20 ÷ 20 ＝ 1.0 A です。10 V で 0.5 A なので、2 倍の 20 V では 2 倍の 1.0 A と考えることもできます。',
        hint: 'I ＝ V ÷ R を使おう。',
      }),
      fill({
        id: 'electricity-mp6-r2', concept: 'el-ohm',
        prompt: '電熱線 b（抵抗 10 Ω）に 15 V の電圧を加えます。空らんに入る数を入れよう。',
        text: '流れる電流は[b1]である。',
        blanks: [number('b1', 1.5, 0, 'A')],
        explanation: '電流＝15 ÷ 10 ＝ 1.5 A です。',
        hint: 'I ＝ V ÷ R を使おう。',
      }),
      fill({
        id: 'electricity-mp6-r3', concept: 'el-ohm',
        prompt: '電熱線 a（抵抗 20 Ω）に 1.2 A の電流を流したい。空らんに入る数を入れよう。',
        text: '加える電圧は[b1]である。',
        blanks: [number('b1', 24, 0, 'V')],
        explanation: '電圧＝抵抗×電流 なので、20 × 1.2 ＝ 24 V です。',
        hint: 'V ＝ R × I を使おう。',
      }),
      fill({
        id: 'electricity-mp6-r4', concept: 'el-ohm',
        prompt: '電熱線 b（抵抗 10 Ω）に 1.5 A の電流を流したい。空らんに入る数を入れよう。',
        text: '加える電圧は[b1]である。',
        blanks: [number('b1', 15, 0, 'V')],
        explanation: '電圧＝10 × 1.5 ＝ 15 V です。',
        hint: 'V ＝ R × I を使おう。',
      }),
      choice({
        id: 'electricity-mp6-r5', concept: 'el-ohm',
        prompt: '表の物質のうち、抵抗が最も大きいものはどれ？',
        figure: scene(materialTable()),
        options: ['ゴム', 'ガラス', 'ニクロム', '鉄'],
        answer: 'a',
        explanation: 'ゴムは 10²⁰ Ω くらいで、表の中でいちばん抵抗が大きく、電流をほとんど通しません。',
        hint: '10 の右上の小さな数が大きいほど、とても大きな数だよ。',
      }),
      choice({
        id: 'electricity-mp6-r6', concept: 'el-ohm', term: true,
        prompt: '次の説明に合う言葉はどれ？「金属のように、抵抗が小さく電流が流れやすい物質」',
        options: ['導体', '不導体', '絶縁体'],
        answer: 'a',
        explanation: '電流が流れやすい物質を**導体**、ほとんど流れない物質を不導体（絶縁体）といいます。',
        hint: '電流を「導く」物質だよ。',
      }),
      choice({
        id: 'electricity-mp6-r7', concept: 'el-ohm',
        prompt: 'ガラスやゴムのように、抵抗がとても大きく、電流がほとんど流れない物質を何という？',
        options: ['不導体（絶縁体）', '導体', '電熱線'],
        answer: 'a',
        explanation: 'ガラスやゴムは不導体（絶縁体）で、導線のまわりのおおいなどに使われます。',
        hint: '電流を「導かない」物質だよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp7: 直列・並列回路の抵抗 ----
  // 直列回路（抵抗 2 つ）。A・B・C の点と、抵抗の値・電源の電圧
  function seriesRItems(r1, r2, v) {
    const items = [
      sym('resistor', 110, 70), sym('resistor', 210, 70), sym('battery', 160, 190),
      wire([[140, 190], [40, 190], [40, 70], [90, 70]]),
      wire([[130, 70], [190, 70]]),
      wire([[230, 70], [280, 70], [280, 190], [180, 190]]),
      note(110, 102, r1, 14), note(210, 102, r2, 14), note(160, 226, '電源 ' + v, 14),
    ];
    [['A', 60], ['B', 160], ['C', 252]].forEach(([n, x]) => items.push({ type: 'circle', x, y: 70, r: 4, fill: 'ink', stroke: 'ink' }, note(x, 52, n, 14)));
    return items;
  }

  // 並列回路（抵抗 2 つ）。A・B は上の抵抗の両はし、C・D は下の抵抗の両はし、E は分かれる前
  function parallelRItems(r1, r2, v) {
    const items = [
      sym('resistor', 160, 50), sym('resistor', 160, 125), sym('battery', 160, 205),
      wire([[140, 205], [40, 205], [40, 50], [140, 50]]),
      wire([[180, 50], [280, 50], [280, 205], [180, 205]]),
      wire([[40, 125], [140, 125]]),
      wire([[180, 125], [280, 125]]),
      dot(40, 125), dot(280, 125),
      note(160, 80, r1, 14), note(160, 155, r2, 14), note(230, 236, '電源 ' + v, 14),
    ];
    [['A', 110, 50], ['B', 210, 50], ['C', 110, 125], ['D', 210, 125]].forEach(([n, x, y]) => items.push({ type: 'circle', x, y, r: 4, fill: 'ink', stroke: 'ink' }, note(x, y - 10, n, 14)));
    items.push({ type: 'circle', x: 40, y: 165, r: 4, fill: 'ink', stroke: 'ink' }, { type: 'text', x: 50, y: 170, text: 'E', size: 14, bold: true });
    return items;
  }

  // 抵抗のつなぎ方 3 つ（ア 20 Ω だけ、イ 20 Ω と 30 Ω の直列、ウ 20 Ω と 30 Ω の並列）
  function threeArrangementsItems() {
    const term = (x, y) => ({ type: 'circle', x, y, r: 5, fill: 'white', stroke: 'ink' });
    return [
      term(30, 46), term(250, 46), sym('resistor', 140, 46), wire([[35, 46], [120, 46]]), wire([[160, 46], [245, 46]]), note(140, 30, '20 Ω'),
      term(30, 116), term(250, 116), sym('resistor', 100, 116), sym('resistor', 180, 116),
      wire([[35, 116], [80, 116]]), wire([[120, 116], [160, 116]]), wire([[200, 116], [245, 116]]), note(100, 100, '20 Ω'), note(180, 100, '30 Ω'),
      term(30, 196), term(250, 196), sym('resistor', 140, 176), sym('resistor', 140, 216),
      wire([[35, 196], [80, 196], [80, 176], [120, 176]]), wire([[80, 196], [80, 216], [120, 216]]),
      wire([[160, 176], [200, 176], [200, 196], [245, 196]]), wire([[200, 196], [200, 216], [160, 216]]),
      dot(80, 196), dot(200, 196), note(140, 162, '20 Ω', 12), note(140, 236, '30 Ω', 12),
      { type: 'region', id: 'r1', x: 292, y: 46, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 292, y: 116, r: 22, label: 'イ' },
      { type: 'region', id: 'r3', x: 292, y: 196, r: 22, label: 'ウ' },
    ];
  }

  const elecMp7 = {
    id: 'electricity-mp7', areaId: 'el-miniprint', title: 'プリント 7: 直列・並列回路の抵抗', minutes: 6, concepts: ['el-ohm'],
    lessons: [
      {
        id: 'electricity-mp7-c1',
        text: '**直列回路**では、全体の抵抗は各抵抗の和（R ＝ R₁ ＋ R₂）です。電流はどこでも同じなので、全体の電流＝電源の電圧÷全体の抵抗で求め、各抵抗の電圧は抵抗×電流で求めます。例: 2 Ω と 3 Ω に 6 V → 5 Ω、1.2 A、2.4 V と 3.6 V。',
        figure: scene(seriesRItems('2 Ω', '3 Ω', '6 V').concat([note(160, 140, '全体 5 Ω・電流 1.2 A', 13)])),
      },
      {
        id: 'electricity-mp7-c2',
        text: '**並列回路**では、各抵抗に電源と同じ電圧が加わります。各枝の電流＝電圧÷抵抗で求め、その和が全体の電流です。全体の抵抗は電圧÷全体の電流で、どの抵抗よりも小さくなります。例: 2 Ω と 3 Ω に 6 V → 3 A と 2 A、全体 5 A、1.2 Ω。',
        figure: scene(parallelRItems('2 Ω → 3 A', '3 Ω → 2 A', '6 V').concat([{ type: 'text', x: 50, y: 188, text: '5 A', size: 13 }])),
      },
    ],
    warmup: choice({
      id: 'electricity-mp7-w1', concept: 'el-ohm',
      prompt: '予想しよう。20 Ω の抵抗にもう 1 つ 30 Ω の抵抗を並列につなぐと、全体の抵抗はどうなると思う？',
      options: ['20 Ω より小さくなる', '50 Ω になる', '30 Ω になる'],
      answer: 'a',
      explanation: '並列につなぐと電流の通り道が増えるので、全体の抵抗は、どの抵抗よりも小さくなります（この場合は 12 Ω）。',
      hint: '通り道が増えると、電流は流れやすくなるかな。',
    }),
    problems: [
      fill({
        id: 'electricity-mp7-t1', concept: 'el-ohm', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'いくつかの抵抗をつないだとき、それらをまとめて 1 つの抵抗と考えたものを[b1]（回路全体の抵抗）という。',
        blanks: [word('b1', ['合成抵抗', '電気抵抗', '電力量'], '合成抵抗')],
        explanation: 'いくつかの抵抗をまとめて 1 つと考えた抵抗を**合成抵抗**（全体の抵抗）といいます。',
        hint: '抵抗を「合わせて成る」抵抗だよ。',
      }),
      figureChoice({
        id: 'electricity-mp7-p1', concept: 'el-ohm',
        prompt: 'ア〜ウは抵抗のつなぎ方です。左右のはしのあいだの全体の抵抗がいちばん小さいのはどれ？',
        figure: scene(threeArrangementsItems()),
        answer: 'r3',
        explanation: 'アは 20 Ω、イは直列なので 20 ＋ 30 ＝ 50 Ω、ウは並列なので 20 Ω より小さい 12 Ω です。いちばん小さいのはウです。',
        hint: '並列につなぐと、全体の抵抗はどうなるかな。',
      }),
      fill({
        id: 'electricity-mp7-p2', concept: 'el-ohm',
        prompt: '10 Ω と 20 Ω の抵抗を直列につなぎ、12 V の電圧を加えました。空らんに入る数を入れよう。',
        figure: scene(seriesRItems('10 Ω', '20 Ω', '12 V')),
        text: '回路全体の抵抗は[b1]で、A 点に流れる電流は[b2]である。',
        blanks: [number('b1', 30, 0, 'Ω'), number('b2', 0.4, 0, 'A')],
        explanation: '直列なので全体の抵抗は 10 ＋ 20 ＝ 30 Ω です。電流は 12 ÷ 30 ＝ 0.4 A です。',
        hint: 'まず全体の抵抗を求め、I ＝ V ÷ R を使おう。',
      }),
      fill({
        id: 'electricity-mp7-p3', concept: 'el-ohm',
        prompt: '10 Ω と 20 Ω の直列回路（12 V、電流 0.4 A）で、空らんに入る数を入れよう。',
        figure: scene(seriesRItems('10 Ω', '20 Ω', '12 V')),
        text: 'AB 間の電圧は[b1]、BC 間の電圧は[b2]である。',
        blanks: [number('b1', 4, 0, 'V'), number('b2', 8, 0, 'V')],
        explanation: 'AB 間は 10 × 0.4 ＝ 4 V、BC 間は 20 × 0.4 ＝ 8 V です。たすと電源の 12 V になります。',
        hint: 'それぞれの抵抗に V ＝ R × I を使おう。',
      }),
      choice({
        id: 'electricity-mp7-p4', concept: 'el-ohm',
        prompt: '20 Ω の抵抗 a と 30 Ω の抵抗 b を直列につなぎました。回路全体の抵抗はどれ？',
        options: ['10 Ω', '20 Ω', '30 Ω', '50 Ω'],
        answer: 'd',
        explanation: '直列回路の全体の抵抗は、各抵抗の和です。20 ＋ 30 ＝ 50 Ω です。',
        hint: '直列では、抵抗はたし算だよ。',
      }),
      fill({
        id: 'electricity-mp7-p5', concept: 'el-ohm',
        prompt: '20 Ω と 30 Ω の抵抗を並列につなぎ、12 V の電圧を加えました。空らんに入る数を入れよう。',
        figure: scene(parallelRItems('20 Ω', '30 Ω', '12 V')),
        text: 'A 点の電流は[b1]、C 点の電流は[b2]、E 点の電流は[b3]である。',
        blanks: [number('b1', 0.6, 0, 'A'), number('b2', 0.4, 0, 'A'), number('b3', 1, 0, 'A')],
        explanation: '並列なので、どちらの抵抗にも 12 V が加わります。A は 12 ÷ 20 ＝ 0.6 A、C は 12 ÷ 30 ＝ 0.4 A、E は和の 1.0 A です。',
        hint: 'まず、それぞれの抵抗に加わる電圧を考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'electricity-mp7-r1', concept: 'el-ohm',
        prompt: '10 Ω と 20 Ω の直列回路（12 V）で、A 点に 0.4 A の電流が流れています。B 点の電流はどれ？',
        figure: scene(seriesRItems('10 Ω', '20 Ω', '12 V')),
        options: ['0.4 A', '0.2 A', '0.8 A'],
        answer: 'a',
        explanation: '直列回路では電流はどこでも同じなので、B 点も 0.4 A です。',
        hint: '直列回路の電流のきまりを思い出そう。',
      }),
      choice({
        id: 'electricity-mp7-r2', concept: 'el-ohm',
        prompt: '抵抗 R₁ と R₂ を直列につないだときの全体の抵抗 R を表す式はどれ？',
        options: ['R ＝ R₁ ＋ R₂', 'R ＝ R₁ × R₂', 'R ＝ R₁ − R₂'],
        answer: 'a',
        explanation: '直列回路の全体の抵抗は、各抵抗の和なので R ＝ R₁ ＋ R₂ です。',
        hint: '直列では、抵抗はたし算だよ。',
      }),
      fill({
        id: 'electricity-mp7-r3', concept: 'el-ohm',
        prompt: '20 Ω と 30 Ω の抵抗を直列につなぎ、20 V の電圧を加えました。空らんに入る数を入れよう。',
        figure: scene(seriesRItems('20 Ω', '30 Ω', '20 V')),
        text: '全体の抵抗は[b1]、電流は[b2]、AB 間の電圧は[b3]、BC 間の電圧は[b4]である。',
        blanks: [number('b1', 50, 0, 'Ω'), number('b2', 0.4, 0, 'A'), number('b3', 8, 0, 'V'), number('b4', 12, 0, 'V')],
        explanation: '全体の抵抗は 20 ＋ 30 ＝ 50 Ω、電流は 20 ÷ 50 ＝ 0.4 A です。AB 間は 20 × 0.4 ＝ 8 V、BC 間は 30 × 0.4 ＝ 12 V です。',
        hint: '全体の抵抗 → 電流 → 各部分の電圧の順に求めよう。',
      }),
      fill({
        id: 'electricity-mp7-r4', concept: 'el-ohm',
        prompt: '20 Ω と 30 Ω の並列回路（12 V、E 点の電流 1.0 A）で、空らんに入る数を入れよう。',
        figure: scene(parallelRItems('20 Ω', '30 Ω', '12 V')),
        text: 'AB 間の電圧は[b1]、CD 間の電圧は[b2]で、回路全体の抵抗は[b3]である。',
        blanks: [number('b1', 12, 0, 'V'), number('b2', 12, 0, 'V'), number('b3', 12, 0, 'Ω')],
        explanation: '並列なので、どちらの抵抗にも電源と同じ 12 V が加わります。全体の抵抗は 12 ÷ 1.0 ＝ 12 Ω で、20 Ω より小さくなります。',
        hint: '全体の抵抗は、電源の電圧÷全体の電流だよ。',
      }),
      fill({
        id: 'electricity-mp7-r5', concept: 'el-ohm',
        prompt: '14 Ω と 10 Ω の抵抗を直列につなぎ、6 V の電圧を加えました。空らんに入る数を入れよう。',
        figure: scene(seriesRItems('14 Ω', '10 Ω', '6 V')),
        text: '全体の抵抗は[b1]、電流は[b2]、AB 間の電圧は[b3]、BC 間の電圧は[b4]である。',
        blanks: [number('b1', 24, 0, 'Ω'), number('b2', 0.25, 0, 'A'), number('b3', 3.5, 0, 'V'), number('b4', 2.5, 0, 'V')],
        explanation: '全体の抵抗は 14 ＋ 10 ＝ 24 Ω、電流は 6 ÷ 24 ＝ 0.25 A です。AB 間は 14 × 0.25 ＝ 3.5 V、BC 間は 10 × 0.25 ＝ 2.5 V です。',
        hint: '全体の抵抗 → 電流 → 各部分の電圧の順に求めよう。',
      }),
      fill({
        id: 'electricity-mp7-r6', concept: 'el-ohm',
        prompt: '12 Ω と 10 Ω の抵抗を並列につなぎ、6 V の電圧を加えました。空らんに入る数を入れよう。',
        figure: scene(parallelRItems('12 Ω', '10 Ω', '6 V')),
        text: 'A 点の電流は[b1]、C 点の電流は[b2]、E 点の電流は[b3]である。',
        blanks: [number('b1', 0.5, 0, 'A'), number('b2', 0.6, 0, 'A'), number('b3', 1.1, 0, 'A')],
        explanation: 'どちらの抵抗にも 6 V が加わります。A は 6 ÷ 12 ＝ 0.5 A、C は 6 ÷ 10 ＝ 0.6 A、E は和の 1.1 A です。',
        hint: '並列では、どの抵抗にも電源と同じ電圧が加わるよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp8: 実験の回路をつくる ----
  // 電流計と電熱線の直列回路の上に、電圧計をつなぐ 2 つの場所（点線）をかく。電圧計（V の丸）は y = 50 を左右に動く
  function voltmeterDragItems() {
    return [
      sym('ammeter', 100, 120), sym('resistor', 220, 120), sym('battery', 160, 200),
      wire([[80, 120], [40, 120], [40, 200], [140, 200]]),
      wire([[120, 120], [200, 120]]),
      wire([[240, 120], [280, 120], [280, 200], [180, 200]]),
      { type: 'line', points: [[70, 120], [70, 50], [82, 50]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[118, 50], [130, 50], [130, 120]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[190, 120], [190, 50], [202, 50]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[238, 50], [250, 50], [250, 120]], color: 'gray', width: 2, dashed: true },
      dot(70, 120), dot(130, 120), dot(190, 120), dot(250, 120),
      note(220, 150, '電熱線'), note(100, 150, '電流計'),
      { type: 'circle', id: 'vm', x: 300, y: 50, r: 16, fill: 'white', stroke: 'blue', label: 'V' },
    ];
  }

  // 電熱線 2 本の並列回路と、電流計をつなぐ場所の候補（ア 枝分かれする前、イ 上の枝、ウ 下の枝）
  function totalCurrentItems() {
    return [
      sym('resistor', 170, 60), sym('resistor', 170, 130), sym('battery', 160, 205),
      wire([[140, 205], [40, 205], [40, 60], [150, 60]]),
      wire([[190, 60], [280, 60], [280, 205], [180, 205]]),
      wire([[100, 60], [100, 130], [150, 130]]),
      wire([[190, 130], [240, 130], [240, 60]]),
      dot(100, 60), dot(240, 60),
      note(170, 40, '電熱線 1'), note(170, 160, '電熱線 2'),
      { type: 'region', id: 'r1', x: 40, y: 130, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 130, y: 60, r: 22, label: 'イ' },
      { type: 'region', id: 'r3', x: 130, y: 130, r: 22, label: 'ウ' },
    ];
  }

  // 並列回路の枝に電流計をつなぐ（elec-1-p2 と同じ形。電流計は y = 160 を左右に動く。x 130 は X の枝、x 220 は Y の枝）
  function branchMeterItems() {
    return [
      sym('battery', 40, 120, 90), sym('bulb', 130, 120, 90), sym('bulb', 220, 120, 90),
      wire([[40, 100], [40, 50], [220, 50], [220, 100]]),
      wire([[220, 140], [220, 190], [40, 190], [40, 140]]),
      wire([[130, 50], [130, 100]]),
      wire([[130, 140], [130, 190]]),
      dot(130, 50), dot(130, 190),
      { type: 'text', x: 148, y: 126, text: 'X' },
      { type: 'text', x: 238, y: 126, text: 'Y' },
      { type: 'circle', id: 'am', x: 290, y: 160, r: 16, fill: 'white', stroke: 'blue', label: 'A' },
    ];
  }

  const elecMp8 = {
    id: 'electricity-mp8', areaId: 'el-miniprint', title: 'プリント 8: 実験の回路をつくる', minutes: 5, concepts: ['el-circuit'],
    lessons: [
      {
        id: 'electricity-mp8-c1',
        text: '電熱線に加わる電圧と流れる電流を調べるときは、電源・スイッチ・電流計・電熱線を一列（直列）につなぎ、電圧計だけを電熱線の両はしに（並列に）つなぎます。どちらの計器も、＋端子を電源の＋極側につなぎます。',
        // 電圧計を置く候補の点線と、電流計の両はしの点は除く
        figure: scene(voltmeterDragItems().filter(it => !it.dashed && it.id !== 'vm' && !(it.type === 'circle' && (it.x === 70 || it.x === 130))).concat([
          sym('voltmeter', 220, 50),
          { type: 'line', points: [[190, 120], [190, 50], [200, 50]], width: 2 },
          { type: 'line', points: [[240, 50], [250, 50], [250, 120]], width: 2 },
          note(220, 26, '電圧計は電熱線に並列', 12), note(160, 236, '電源（左が＋極）', 12),
        ])),
      },
      {
        id: 'electricity-mp8-c2',
        text: '並列回路の 1 つの枝の電流をはかるときは、その枝に電流計を直列に入れます。2 本の電熱線を並列につないだ回路全体の抵抗を調べるときは、電流計を枝分かれする前の導線に入れ、電圧計を電源の両はしにつなぎます。',
        figure: scene(totalCurrentItems().filter(it => it.type !== 'region').concat([
          { type: 'circle', x: 40, y: 130, r: 14, fill: 'white', label: 'A' },   // 縦の導線なので、電流計は文字が回らない丸でかく
          note(160, 236, '全体の電流は、分かれる前ではかる', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'electricity-mp8-w1', concept: 'el-circuit',
      prompt: '予想しよう。電熱線に流れる電流と加わる電圧を同時にはかる回路で、電熱線と一列につなぐのは電流計と電圧計のどちらだと思う？',
      options: ['電流計', '電圧計', '両方'],
      answer: 'a',
      explanation: '電流計は電熱線と一列（直列）に、電圧計は電熱線の両はし（並列）につなぎます。',
      hint: '電流計の中を、電熱線と同じ電流が通るようにしよう。',
    }),
    problems: [
      choice({
        id: 'electricity-mp8-t1', concept: 'el-circuit', term: true,
        prompt: '電流計のように、はかりたい部分と一列になるようにつなぐつなぎ方を何という？',
        options: ['直列につなぐ', '並列につなぐ', '交互につなぐ'],
        answer: 'a',
        explanation: '一列につなぐことを**直列**につなぐ、両はしに枝分かれさせてつなぐことを**並列**につなぐといいます。',
        hint: '「直（まっすぐ）」に「列」になるつなぎ方だよ。',
      }),
      drag({
        id: 'electricity-mp8-p1', concept: 'el-circuit',
        prompt: '豆電球 X と豆電球 Y を並列につないだ回路です。豆電球 X だけに流れる電流をはかりたい。電流計（A の丸）を左右に動かして、電流計をつなぐ導線の上に置こう。',
        // 印は y=160 の高さを左右に動く。x=130 は X の枝（正解）、x=220 は Y の枝、x=40 は電池の導線
        figure: scene(branchMeterItems()),
        draggable: { itemId: 'am', axis: 'x' },
        target: { x: 130, y: 160 },
        samples: { correct: { x: 130, y: 160 }, wrong: { x: 220, y: 160 } },
        explanation: '豆電球 X だけに流れる電流は、X の枝の導線を通ります。だから電流計は X と一列になるように、X の枝につなぎます。',
        hint: '豆電球 X を通る電流だけが流れる導線はどこかな。',
      }),
      drag({
        id: 'electricity-mp8-p2', concept: 'el-circuit',
        prompt: '電熱線に加わる電圧をはかりたい。電圧計（V の丸）を左右に動かして、正しくつなげる点線の場所に置こう。',
        // 印は y=50 の高さを左右に動く。x=220 は電熱線の両はし（正解）、x=100 は電流計の両はし
        figure: scene(voltmeterDragItems()),
        draggable: { itemId: 'vm', axis: 'x' },
        target: { x: 220, y: 50 },
        samples: { correct: { x: 220, y: 50 }, wrong: { x: 100, y: 50 } },
        explanation: '電圧計は、はかりたい電熱線の両はしに並列につなぎます。電熱線の上の点線（右側）に置くのが正しい位置です。',
        hint: '電熱線の両はしにつながる点線はどちらかな。',
      }),
      figureChoice({
        id: 'electricity-mp8-p3', concept: 'el-circuit',
        prompt: '電熱線 1 と 2 を並列につないだ回路全体の抵抗を調べるため、回路全体に流れる電流をはかります。電流計を入れる場所はア〜ウのどこ？',
        figure: scene(totalCurrentItems()),
        answer: 'r1',
        explanation: '回路全体の電流は、枝分かれする前の導線（ア）に流れます。イやウに入れると、それぞれの枝の電流しかはかれません。',
        hint: '両方の電熱線の電流が合わさって流れる導線はどこかな。',
      }),
      choice({
        id: 'electricity-mp8-p4', concept: 'el-circuit',
        prompt: '電流計の＋端子は、どこにつながる導線につなぐ？',
        options: ['電源の＋極側', '電源の−極側', 'どちらでもよい'],
        answer: 'a',
        explanation: '電流計の＋端子は電源の＋極側、−端子は−極側につなぎます。逆にすると針が反対にふれます。',
        hint: '＋どうしをそろえよう。',
      }),
      choice({
        id: 'electricity-mp8-p5', concept: 'el-circuit',
        prompt: '電熱線 2 本を並列につないだ回路全体の抵抗を調べるとき、電圧計はどこにつなぐ？',
        options: ['電源（2 本の電熱線のまとまり）の両はし', '電流計の両はし', '1 本の電熱線の片方のはしだけ'],
        answer: 'a',
        explanation: '回路全体に加わる電圧をはかるので、電源の両はし（並列部分全体の両はし）に電圧計をつなぎます。全体の抵抗＝全体の電圧÷全体の電流で求めます。',
        hint: '「回路全体」の電圧をはかろう。',
      }),
    ],
    retryPool: [
      drag({
        id: 'electricity-mp8-r1', concept: 'el-circuit',
        prompt: '豆電球 X と Y の並列回路です。今度は豆電球 Y だけに流れる電流をはかりたい。電流計（A の丸）を左右に動かして、正しい導線の上に置こう。',
        figure: scene(branchMeterItems()),
        draggable: { itemId: 'am', axis: 'x' },
        target: { x: 220, y: 160 },
        samples: { correct: { x: 220, y: 160 }, wrong: { x: 130, y: 160 } },
        explanation: '豆電球 Y だけに流れる電流は、Y の枝を通ります。だから電流計は Y の枝に直列につなぎます。',
        hint: '豆電球 Y を通る電流だけが流れる導線をさがそう。',
      }),
      choice({
        id: 'electricity-mp8-r2', concept: 'el-circuit',
        prompt: 'オームの法則を調べる実験で、電源の電圧を少しずつ変えながら記録するものはどれ？',
        options: ['電熱線に加わる電圧と、流れる電流', '電熱線の長さと太さ', '電熱線の温度だけ'],
        answer: 'a',
        explanation: '電圧を変えたときの電流を電流計と電圧計で記録し、グラフにして電圧と電流の関係を調べます。',
        hint: 'オームの法則は、何と何の関係だったかな。',
      }),
      choice({
        id: 'electricity-mp8-r3', concept: 'el-circuit',
        prompt: '電熱線に加わる電圧をはかるため、電圧計を電熱線と一列（直列）につないでしまいました。どうなる？',
        options: ['回路にほとんど電流が流れず、正しくはかれない', '正しい電圧がはかれる', '電流がふだんより多く流れる'],
        answer: 'a',
        explanation: '電圧計はとても電流を通しにくくつくられているので、直列につなぐと回路にほとんど電流が流れません。電圧計は並列につなぎます。',
        hint: '電圧計の正しいつなぎ方を思い出そう。',
      }),
    ],
  };

  // ---- ステージ electricity-mp9: 電力 ----
  // 電気器具の写真（electricity-mp9-c2）: 左から 電子レンジ (8〜90, 65〜125)・トースター (105〜175, 65〜130。中心 (140, 98))・
  // ドライヤー (190〜258, 55〜138。頭 (222, 72))・電球 (270〜312, 58〜132。中心 (290, 92))。上と下は白い余白
  // hideTo: この x より左を白い四角で隠す（選ばない器具を見せない。写真の背景は白）
  function appliancePhoto(hideTo) {
    return [
      photo('electricity-mp9-c2'),
      { type: 'rect', x: 0, y: 30, width: hideTo, height: 125, fill: 'white', stroke: 'none' },
    ];
  }
  // 電気器具 3 つの表示（ア トースター 600 W、イ ドライヤー 1200 W、ウ 電球 40 W）。電子レンジは隠す
  // 写真の下の白い余白の文字は下地なし（半角の多い文字は下地が文字より広くなり、となりの文字にかかるため）
  function appliancesItems() {
    const plain = { size: 13, bg: false };
    return appliancePhoto(100).concat([
      tag(140, 156, 'トースター', plain), tag(222, 156, 'ドライヤー', plain), tag(292, 156, '電球', plain),
      tag(140, 176, '100 V−600 W', plain), tag(316, 176, '100 V−40 W', Object.assign({ anchor: 'end' }, plain)),
      tag(222, 196, '100 V−1200 W', plain),
      { type: 'region', id: 'r1', x: 140, y: 98, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 222, y: 76, r: 22, label: 'イ' },
      { type: 'region', id: 'r3', x: 290, y: 92, r: 22, label: 'ウ' },
    ]);
  }

  const elecMp9 = {
    id: 'electricity-mp9', areaId: 'el-miniprint', title: 'プリント 9: 電力', minutes: 6, concepts: ['el-power'],
    lessons: [
      {
        id: 'electricity-mp9-c1',
        text: '1 秒間に使われる電気エネルギーの量を**電力**といい、単位は**ワット**（W）です。電力〔W〕＝電圧〔V〕×電流〔A〕です。電力は、仕事にたとえると「仕事の能率（1 秒あたりにする仕事の量）」にあたります。',
        // 写真: 光っている同じ形の白熱電球 2 個。左 (95, 15〜150) は 40 W でやや暗く、右 (220, 15〜150) は 100 W でまぶしい。下は白い余白
        figure: scene([
          photo('electricity-mp9-c1'),
          tag(95, 174, '40 W', { size: 16, bold: true }),
          tag(222, 174, '100 W', { size: 16, bold: true }),
          tag(160, 198, '同じ 100 V で使うと、電力が大きいほど明るい', { size: 13 }),
          tag(160, 228, '電力〔W〕＝電圧〔V〕×電流〔A〕', { bold: true }),
        ]),
      },
      {
        id: 'electricity-mp9-c2',
        text: '電気器具の「100 V−1500 W」という表示は、100 V の電圧で使うと 1500 W の電力を使うという意味です。このとき流れる電流は 1500 ÷ 100 ＝ 15 A です。電力が大きい器具ほど、同じ時間で多くの熱や光を出します。',
        // 写真: 家庭の電気器具。左から 電子レンジ (8〜90, 65〜125)・トースター (140, 98)・ドライヤー (222, 88)・電球 (290, 95)。上下は白い余白
        figure: scene([
          photo('electricity-mp9-c2'),
          tag(48, 150, '電子レンジ', { size: 13 }),
          tag(140, 150, 'トースター', { size: 13 }),
          tag(222, 150, 'ドライヤー', { size: 13 }),
          tag(292, 150, '電球', { size: 13 }),
          tag(8, 172, '表示「100 V−1500 W」', { size: 13, bold: true, anchor: 'start', bg: false }),
          tag(160, 204, '100 V で使うと 1500 W の電力を使う', { size: 13 }),
          tag(160, 228, '電流 ＝ 1500 ÷ 100 ＝ 15 A', { bold: true }),
        ]),
      },
    ],
    warmup: choice({
      id: 'electricity-mp9-w1', concept: 'el-power',
      prompt: '予想しよう。100 V で使う 40 W の電球と 100 W の電球では、明るいのはどちらだと思う？',
      options: ['100 W の電球', '40 W の電球', 'どちらも同じ'],
      answer: 'a',
      explanation: '電力が大きいほど、1 秒間に使う電気エネルギーが大きく、多くの光や熱を出します。だから 100 W の電球のほうが明るいです。',
      hint: 'W の数が大きいほど、どうなるかな。',
    }),
    problems: [
      fill({
        id: 'electricity-mp9-t1', concept: 'el-power', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '1 秒間に使われる電気エネルギーの量を[b1]といい、単位は[b2]（記号 W）である。',
        blanks: [
          word('b1', ['電力', '電力量', '熱量'], '電力'),
          word('b2', ['ワット', 'ジュール', 'ボルト'], 'ワット'),
        ],
        explanation: '1 秒間に使われる電気エネルギーの量を**電力**、単位を**ワット**（W）といいます。',
        hint: 'W はワットの頭文字だよ。',
      }),
      figureChoice({
        id: 'electricity-mp9-p1', concept: 'el-power',
        prompt: 'ア〜ウは、100 V で使う電気器具の表示です。1 秒間に使う電気エネルギーがいちばん大きいのはどれ？',
        figure: scene(appliancesItems()),
        answer: 'r2',
        explanation: '1 秒間に使う電気エネルギーが電力です。表示の W の数がいちばん大きいドライヤー（1200 W、イ）です。',
        hint: 'W の数をくらべよう。',
      }),
      fill({
        id: 'electricity-mp9-p2', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '20 V の電圧を加えて 4 A の電流が流れたとき、電力は[b1]である。',
        blanks: [number('b1', 80, 0, 'W')],
        explanation: '電力＝電圧×電流 なので、20 × 4 ＝ 80 W です。',
        hint: '電圧と電流をかけ算しよう。',
      }),
      fill({
        id: 'electricity-mp9-p3', concept: 'el-power',
        prompt: '「100 V−1500 W」と表示された電子レンジを、100 V のコンセントで使います。空らんに入る数を入れよう。',
        text: '消費電力は[b1]で、流れる電流は[b2]である。',
        blanks: [number('b1', 1500, 0, 'W'), number('b2', 15, 0, 'A')],
        explanation: '表示どおり 100 V で使うので消費電力は 1500 W です。電流＝電力÷電圧 ＝ 1500 ÷ 100 ＝ 15 A です。',
        hint: '電力＝電圧×電流 を、電流について考えよう。',
      }),
      fill({
        id: 'electricity-mp9-p4', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '100 V・5 A のときの電力は[b1]、12 V・400 mA のときの電力は[b2]である。',
        blanks: [number('b1', 500, 0, 'W'), number('b2', 4.8, 0, 'W')],
        explanation: '100 × 5 ＝ 500 W です。400 mA ＝ 0.4 A なので、12 × 0.4 ＝ 4.8 W です。',
        hint: 'mA は A になおしてからかけ算しよう。',
      }),
      choice({
        id: 'electricity-mp9-p5', concept: 'el-power',
        prompt: '電力を「仕事」にたとえると、どれにあたる？',
        options: ['仕事の能率（1 秒あたりの仕事）', '仕事をした時間', '仕事の量'],
        answer: 'a',
        explanation: '電力は 1 秒間あたりに使う電気エネルギーなので、仕事の能率にあたります。電力に時間をかけたもの（熱量・電力量）が仕事の量にあたります。',
        hint: '電力は「1 秒間あたり」の量だったね。',
      }),
    ],
    retryPool: [
      fill({
        id: 'electricity-mp9-r1', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '100 V・0.2 A のときの電力は[b1]、6 V・50 mA のときの電力は[b2]である。',
        blanks: [number('b1', 20, 0, 'W'), number('b2', 0.3, 0, 'W')],
        explanation: '100 × 0.2 ＝ 20 W です。50 mA ＝ 0.05 A なので、6 × 0.05 ＝ 0.3 W です。',
        hint: '電圧×電流。mA は A になおそう。',
      }),
      fill({
        id: 'electricity-mp9-r2', concept: 'el-power',
        prompt: '「100 V−800 W」の電気器具を 100 V で使います。空らんに入る数を入れよう。',
        text: '流れる電流は[b1]である。',
        blanks: [number('b1', 8, 0, 'A')],
        explanation: '電流＝電力÷電圧 ＝ 800 ÷ 100 ＝ 8 A です。',
        hint: '電力を電圧でわろう。',
      }),
      fill({
        id: 'electricity-mp9-r3', concept: 'el-power',
        prompt: '「100 V−36 W」の電気器具を 100 V で使います。空らんに入る数を入れよう。',
        text: '流れる電流は[b1]である。',
        blanks: [number('b1', 0.36, 0, 'A')],
        explanation: '電流＝36 ÷ 100 ＝ 0.36 A です。',
        hint: '電力を電圧でわろう。',
      }),
      fill({
        id: 'electricity-mp9-r4', concept: 'el-power',
        prompt: '400 W の電力を使う器具に 2 A の電流が流れています。空らんに入る数を入れよう。',
        text: '加わっている電圧は[b1]である。',
        blanks: [number('b1', 200, 0, 'V')],
        explanation: '電圧＝電力÷電流 ＝ 400 ÷ 2 ＝ 200 V です。',
        hint: '電力を電流でわろう。',
      }),
      choice({
        id: 'electricity-mp9-r5', concept: 'el-power',
        prompt: '電流によって発生する熱の量（発熱量）を「仕事」にたとえると、どれにあたる？',
        options: ['仕事の量', '仕事の能率', '仕事をした時間'],
        answer: 'a',
        explanation: '発熱量は、電力（仕事の能率）に時間をかけたものなので、仕事の量にあたります。',
        hint: '発熱量＝電力×時間 だね。',
      }),
      fill({
        id: 'electricity-mp9-r6', concept: 'el-power',
        prompt: '500 W の電子レンジで 6 分あたためるパスタがあります。空らんに入る数を入れよう。',
        text: 'あたためるのに必要な熱量は[b1]である。',
        blanks: [number('b1', 180000, 0, 'J')],
        explanation: '6 分 ＝ 360 秒なので、熱量＝500 × 360 ＝ 180000 J です。',
        hint: '時間は秒になおして、電力×時間を計算しよう。',
      }),
      choice({
        id: 'electricity-mp9-r7', concept: 'el-power',
        prompt: '500 W で 6 分（180000 J）あたためるパスタを、3000 W の電子レンジであたためます。必要な熱量はどうなる？',
        options: ['同じ 180000 J', '6 倍の 1080000 J', '6 分の 1 の 30000 J'],
        answer: 'a',
        explanation: 'パスタをあたためるのに必要な熱量（仕事の量）は、電子レンジの電力が変わっても同じ 180000 J です。電力が大きいと、短い時間ですみます。',
        hint: 'パスタが必要とする熱の量は、レンジによって変わるかな。',
      }),
      fill({
        id: 'electricity-mp9-r8', concept: 'el-power',
        prompt: '180000 J の熱量が必要なパスタを、3000 W の電子レンジであたためます。空らんに入る数を入れよう。',
        text: 'あたためる時間は[b1]である。',
        blanks: [number('b1', 1, 0, '分')],
        explanation: '時間＝熱量÷電力 ＝ 180000 ÷ 3000 ＝ 60 秒 ＝ 1 分です。',
        hint: '熱量を電力でわると、時間（秒）が出るよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp10: 電流による発熱 ----
  // 5 V と 10 V で 2 Ω の電熱線に電流を流したときの、時間と水の上昇温度（横 1 分 ＝ 40px、たて 4 ℃ ＝ 25px）
  function heatLinesItems(labels) {
    return axes('時間〔分〕', '上昇温度〔℃〕', ['1', '2', '3', '4', '5'], ['4', '8', '12', '16', '20'])
      .concat([
        { type: 'line', points: [[50, 200], [250, 75]], color: 'blue', width: 3 },
        { type: 'line', points: [[50, 200], [250, 168.8]], color: 'green', width: 3 },
        { type: 'text', x: 256, y: 72, text: labels ? '10 V' : 'P', size: 13, bold: true },
        { type: 'text', x: 256, y: 166, text: labels ? '5 V' : 'Q', size: 13, bold: true },
      ]);
  }

  // 水を入れる容器 3 つ（ア ガラス、イ 鉄、ウ 発泡ポリスチレン）
  // 写真（electricity-mp10-p1）: 左 ガラスのビーカー (8〜97, 48〜158)・中央 ステンレスのカップ (115〜205, 50〜155)・
  // 右 発泡ポリスチレンのカップ (218〜315, 48〜158)。どれも同じ量の水。下は白い余白
  function containersItems() {
    return [
      photo('electricity-mp10-p1'),
      tag(52, 180, 'ガラス', { size: 13 }), tag(160, 180, '鉄', { size: 13 }), tag(266, 180, '発泡ポリスチレン', { size: 13 }),
      { type: 'region', id: 'r1', x: 52, y: 214, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 160, y: 214, r: 22, label: 'イ' },
      { type: 'region', id: 'r3', x: 266, y: 214, r: 22, label: 'ウ' },
    ];
  }

  const elecMp10 = {
    id: 'electricity-mp10', areaId: 'el-miniprint', title: 'プリント 10: 電流による発熱', minutes: 6, concepts: ['el-power'],
    lessons: [
      {
        id: 'electricity-mp10-c1',
        text: '電流によって発生する熱の量を**熱量**といい、単位は**ジュール**（J）です。熱量〔J〕＝電力〔W〕×時間〔s〕です。昔は熱量の単位に**カロリー**（cal）も使われました。1 g の水の温度を 1 ℃ 上げるのに必要な熱量は約 4.2 J です。',
        // 写真: 水を入れた発泡ポリスチレンのカップ (35〜185, 30〜215)。水の中にコイル状の電熱線 (80〜145, 130〜150) と温度計
        // （x 113、液だめ (113, 120)）。赤と黒の導線が上へのび、右にガラス棒（(250, 103)〜(178, 228)）。右は白い余白
        figure: scene([
          photo('electricity-mp10-c1'),
          pointer(232, 44, 118, 52), tag(262, 44, '温度計', { size: 13 }),
          pointer(232, 120, 146, 138), tag(262, 120, '電熱線', { size: 13 }),
          pointer(198, 170, 166, 180),
          tag(258, 170, '発泡ポリスチレン', { size: 13 }),
          tag(258, 188, 'のカップ', { size: 13 }),
          tag(258, 206, '（熱がにげにくい）', { size: 13 }),
          tag(160, 232, '熱量〔J〕＝電力〔W〕×時間〔s〕', { bold: true }),
        ]),
      },
      {
        id: 'electricity-mp10-c2',
        anim: 'el-heat-rise',   // 動く図の使い回し（js/anim-physics.js）。figure は静止図として残す
        text: '電熱線で水をあたためる実験では、熱がにげにくい発泡ポリスチレンの容器を使います。水の上昇温度は電流を流した時間に比例し、電力が大きいほど大きくなります。電圧を 2 倍にすると電流も 2 倍になるので、電力は 4 倍になります。',
        figure: scene(heatLinesItems(true)),
      },
    ],
    warmup: choice({
      id: 'electricity-mp10-w1', concept: 'el-power',
      prompt: '予想しよう。電熱線で水をあたためます。電流を流す時間を 2 倍にすると、水の上昇温度はどうなると思う？',
      options: ['約 2 倍になる', '変わらない', '約半分になる'],
      answer: 'a',
      explanation: '電流による発熱量は時間に比例するので、時間を 2 倍にすると上昇温度も約 2 倍になります。',
      hint: '熱量＝電力×時間 だね。',
    }),
    problems: [
      fill({
        id: 'electricity-mp10-t1', concept: 'el-power', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '熱量の単位は[b1]（記号 J）である。昔は[b2]（記号 cal）という単位も使われた。',
        blanks: [
          word('b1', ['ジュール', 'カロリー', 'ワット'], 'ジュール'),
          word('b2', ['ジュール', 'カロリー', 'ワット'], 'カロリー'),
        ],
        explanation: '熱量の単位は**ジュール**（J）です。食品のエネルギーなどでは、今も**カロリー**（cal）が使われることがあります。',
        hint: 'J と cal の読み方だよ。',
      }),
      figureChoice({
        id: 'electricity-mp10-p1', concept: 'el-power',
        prompt: '電熱線の発熱量を調べる実験で、水を入れる容器として最もよいものは、ア〜ウのどれ？',
        figure: scene(containersItems()),
        answer: 'r3',
        explanation: '発泡ポリスチレンは熱を伝えにくいので、電熱線から出た熱が容器を通って外へにげにくくなります（ウ）。ガラスや鉄は熱を伝えやすく、熱がにげやすいです。',
        hint: '熱を外へにがしにくい材質はどれかな。',
      }),
      fill({
        id: 'electricity-mp10-p2', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '400 W の電熱線に 5 分間電流を流したときの発熱量は[b1]、100 W の電熱線に 5 秒間電流を流したときの発熱量は[b2]である。',
        blanks: [number('b1', 120000, 0, 'J'), number('b2', 500, 0, 'J')],
        explanation: '5 分 ＝ 300 秒なので、400 × 300 ＝ 120000 J です。100 × 5 ＝ 500 J です。',
        hint: '時間は秒になおしてから、電力×時間を計算しよう。',
      }),
      fill({
        id: 'electricity-mp10-p3', concept: 'el-power',
        prompt: '100 g の水に 2 Ω の電熱線を入れ、5 V の電圧を 10 分間加えました。空らんに入る数を入れよう。',
        text: '流れる電流は[b1]、電熱線の電力は[b2]である。',
        blanks: [number('b1', 2.5, 0, 'A'), number('b2', 12.5, 0, 'W')],
        explanation: '電流＝5 ÷ 2 ＝ 2.5 A、電力＝5 × 2.5 ＝ 12.5 W です。',
        hint: 'まずオームの法則で電流を求めよう。',
      }),
      fill({
        id: 'electricity-mp10-p4', concept: 'el-power',
        prompt: '2 Ω の電熱線（12.5 W）で 100 g の水を 10 分間あたためると、水の温度が 10 ℃ 上がりました。水 1 g を 1 ℃ 上げる熱量は 4.2 J です。空らんに入る数を入れよう。',
        text: '電熱線が消費した電気エネルギーは[b1]、水が得た熱量は[b2]である。',
        blanks: [number('b1', 7500, 0, 'J'), number('b2', 4200, 0, 'J')],
        explanation: '10 分 ＝ 600 秒なので、12.5 × 600 ＝ 7500 J です。水が得た熱量は 4.2 × 100 × 10 ＝ 4200 J です。',
        hint: '水の熱量は 4.2 × 水の質量 × 上昇温度 だよ。',
      }),
      choice({
        id: 'electricity-mp10-p5', concept: 'el-power',
        prompt: '電熱線が消費した電気エネルギー（7500 J）より、水が得た熱量（4200 J）のほうが少なかったのはなぜ？',
        options: ['熱の一部が、空気中や容器ににげたから', '電熱線が熱を吸いとったから', '水が熱を出したから'],
        answer: 'a',
        explanation: '電熱線から出た熱の一部は、まわりの空気や容器、温度計などをあたためるのに使われ、にげてしまいます。だから水が得た熱量は少なくなります。',
        hint: '熱は水だけをあたためたかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'electricity-mp10-r1', concept: 'el-power',
        prompt: '2 Ω の電熱線で水をあたためた結果のグラフです（P は 10 V、Q は 5 V）。水の上昇温度と、電流を流した時間にはどんな関係がある？',
        figure: scene(heatLinesItems(false)),
        options: ['比例する', '反比例する', '関係がない'],
        answer: 'a',
        explanation: 'グラフは原点を通る直線なので、上昇温度は時間に比例します。',
        hint: '原点を通る直線のグラフは、何の関係を表すかな。',
      }),
      fill({
        id: 'electricity-mp10-r2', concept: 'el-power',
        prompt: '5 分間で、5 V では 5 ℃、10 V では 20 ℃ 上昇しました。空らんに入る数を入れよう。',
        figure: scene(heatLinesItems(true)),
        text: '10 V のときの上昇温度は、5 V のときの[b1]倍である。',
        blanks: [number('b1', 4, 0, '')],
        explanation: '20 ÷ 5 ＝ 4 倍です。',
        hint: '20 ℃ は 5 ℃ の何倍かな。',
      }),
      choice({
        id: 'electricity-mp10-r3', concept: 'el-power',
        prompt: '同じ電熱線で、電圧を 2 倍にしたのに、上昇温度が 4 倍になったのはなぜ？',
        options: ['電流も 2 倍になり、電力が 2 × 2 ＝ 4 倍になったから', '電熱線の抵抗が 4 倍になったから', '水の量が 4 分の 1 になったから'],
        answer: 'a',
        explanation: '電圧を 2 倍にすると、オームの法則で電流も 2 倍になります。電力＝電圧×電流 なので、電力は 4 倍になり、発熱量も 4 倍になります。',
        hint: '電力＝電圧×電流 で、電圧と電流がそれぞれ何倍になったか考えよう。',
      }),
      fill({
        id: 'electricity-mp10-r4', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '600 W の電熱線に 20 秒間電流を流すと[b1]、5 W の電熱線に 2 時間電流を流すと[b2]の熱が発生する。',
        blanks: [number('b1', 12000, 0, 'J'), number('b2', 36000, 0, 'J')],
        explanation: '600 × 20 ＝ 12000 J です。2 時間 ＝ 7200 秒なので、5 × 7200 ＝ 36000 J です。',
        hint: '時間は秒になおそう（1 時間 ＝ 3600 秒）。',
      }),
      fill({
        id: 'electricity-mp10-r5', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '20 Ω の電熱線に 10 V を 40 秒間加えると[b1]、10 Ω の電熱線に 20 V を 10 分間加えると[b2]の熱が発生する。',
        blanks: [number('b1', 200, 0, 'J'), number('b2', 24000, 0, 'J')],
        explanation: '20 Ω に 10 V では電流 0.5 A、電力 5 W なので 5 × 40 ＝ 200 J です。10 Ω に 20 V では電流 2 A、電力 40 W なので 40 × 600 ＝ 24000 J です。',
        hint: '電流 → 電力 → 熱量の順に求めよう。',
      }),
      fill({
        id: 'electricity-mp10-r6', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '100 W の電熱線に 20 秒間電流を流したときの発熱量は[b1]である。',
        blanks: [number('b1', 2000, 0, 'J')],
        explanation: '熱量＝電力×時間 ＝ 100 × 20 ＝ 2000 J です。',
        hint: '電力と時間（秒）をかけ算しよう。',
      }),
    ],
  };

  // ---- ステージ electricity-mp11: 電力量 ----
  const elecMp11 = {
    id: 'electricity-mp11', areaId: 'el-miniprint', title: 'プリント 11: 電力量', minutes: 6, concepts: ['el-power'],
    lessons: [
      {
        id: 'electricity-mp11-c1',
        text: '電気器具が消費した電気エネルギーの量を**電力量**といい、電力量〔J〕＝電力〔W〕×時間〔s〕です。時間を「時間」で表した**ワット時**（Wh）や**キロワット時**（kWh）も使います。1 Wh ＝ 3600 J、1 kWh ＝ 1000 Wh です。',
        figure: scene([
          { type: 'rect', x: 30, y: 30, width: 260, height: 50, fill: '#EEF2F8', stroke: 'line' },
          note(160, 61, '1 W で 1 秒 → 1 J', 15),
          { type: 'rect', x: 30, y: 95, width: 260, height: 50, fill: '#EEF2F8', stroke: 'line' },
          note(160, 126, '1 W で 1 時間 → 1 Wh ＝ 3600 J', 15),
          { type: 'rect', x: 30, y: 160, width: 260, height: 50, fill: '#EEF2F8', stroke: 'line' },
          note(160, 191, '1 kWh ＝ 1000 Wh', 15),
        ]),
      },
      {
        id: 'electricity-mp11-c2',
        text: '使う電力が大きいほど、同じ仕事をする時間は短くなります。500 W で 4 分かかる冷凍食品を 2000 W であたためると、必要な電力量は同じなので、500 × 4 ÷ 2000 ＝ 1 分ですみます。',
        // 電力（たて）× 時間（横）の面積が電力量。2 つの面積は同じ
        figure: scene([
          { type: 'rect', x: 40, y: 150, width: 160, height: 25, fill: 'sky' },
          { type: 'rect', x: 230, y: 75, width: 40, height: 100, fill: 'sky' },
          note(120, 140, '500 W × 4 分', 13), note(250, 66, '2000 W × 1 分', 13),
          { type: 'line', points: [[20, 180], [300, 180]], width: 2 },
          note(160, 212, '面積（電力量）は同じ', 14),
        ]),
      },
    ],
    warmup: choice({
      id: 'electricity-mp11-w1', concept: 'el-power',
      prompt: '予想しよう。電気料金は、電気器具が使った何によって決まると思う？',
      options: ['使った電力量（電力×時間）', '器具の重さ', '器具の大きさ'],
      answer: 'a',
      explanation: '電気料金は、使った電力量（kWh）で決まります。電力が大きい器具を長い時間使うほど、電力量は大きくなります。',
      hint: '電力と使った時間の両方が関係するよ。',
    }),
    problems: [
      fill({
        id: 'electricity-mp11-t1', concept: 'el-power', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電気器具が消費した電気エネルギーの量を[b1]という。単位にはジュール（J）のほかに、[b2]（記号 Wh）も使う。',
        blanks: [
          word('b1', ['電力量', '電力', '電圧'], '電力量'),
          word('b2', ['ワット時', 'キロワット', 'カロリー'], 'ワット時'),
        ],
        explanation: '使った電気エネルギーの量を**電力量**といい、J のほかに**ワット時**（Wh）やキロワット時（kWh）で表します。',
        hint: 'W（ワット）に「時間」をかけた単位だよ。',
      }),
      figureChoice({
        id: 'electricity-mp11-p1', concept: 'el-power',
        prompt: 'ア: 1200 W のドライヤーを 10 分、イ: 40 W の電灯を 8 時間使いました。使った電力量が大きいのはどちら？',
        // 写真（electricity-mp9-c2）のドライヤーと電球だけを見せる（電子レンジ・トースターは白い四角で隠し、空いた所に条件を書く）
        figure: scene(appliancePhoto(182).concat([
          tag(12, 84, 'ア　1200 W・10 分', { size: 14, anchor: 'start', bg: false }),
          tag(12, 114, 'イ　40 W・8 時間', { size: 14, anchor: 'start', bg: false }),
          tag(222, 160, 'ドライヤー', { size: 13, bg: false }), tag(292, 160, '電灯', { size: 13, bg: false }),
          { type: 'region', id: 'r1', x: 222, y: 76, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 290, y: 92, r: 22, label: 'イ' },
        ])),
        answer: 'r2',
        explanation: 'アは 1200 W × 1/6 時間 ＝ 200 Wh、イは 40 W × 8 時間 ＝ 320 Wh です。電力が小さくても、長い時間使ったイのほうが電力量は大きくなります。',
        hint: 'どちらも Wh になおしてくらべよう（10 分 ＝ 1/6 時間）。',
      }),
      fill({
        id: 'electricity-mp11-p2', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '1000 W の器具を 5 時間使うと[b1]、500 W の器具を 30 分使うと[b2]の電力量になる。',
        blanks: [number('b1', 5000, 0, 'Wh'), number('b2', 250, 0, 'Wh')],
        explanation: '1000 × 5 ＝ 5000 Wh（5 kWh）です。30 分 ＝ 0.5 時間なので、500 × 0.5 ＝ 250 Wh です。',
        hint: 'Wh で求めるときは、時間を「時間」の単位にしよう。',
      }),
      fill({
        id: 'electricity-mp11-p3', concept: 'el-power',
        prompt: '30 W の電灯 10 本を、8 時間使いました。空らんに入る数を入れよう。',
        text: '使った電力量は[b1]である。',
        blanks: [number('b1', 2400, 0, 'Wh')],
        explanation: '電灯 10 本の電力は 30 × 10 ＝ 300 W です。300 × 8 ＝ 2400 Wh です。',
        hint: 'まず電灯 10 本ぶんの電力を求めよう。',
      }),
      fill({
        id: 'electricity-mp11-p4', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '1 kWh は[b1]である。',
        blanks: [number('b1', 3600000, 0, 'J')],
        explanation: '1 kWh ＝ 1000 W × 3600 秒 ＝ 3600000 J です。',
        hint: '1 kWh は、1000 W で 1 時間（3600 秒）使った電力量だよ。',
      }),
      fill({
        id: 'electricity-mp11-p5', concept: 'el-power',
        prompt: '100 W の電球を 2 時間使いました。空らんに入る数を入れよう。',
        text: '使った電力量は[b1]で、これは[b2]である。',
        blanks: [number('b1', 200, 0, 'Wh'), number('b2', 720000, 0, 'J')],
        explanation: '100 × 2 ＝ 200 Wh です。1 Wh ＝ 3600 J なので、200 × 3600 ＝ 720000 J です。',
        hint: '1 Wh ＝ 3600 J を使おう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'electricity-mp11-r1', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '100 W の器具を 1 時間使うと[b1]、80 W の器具を 2 時間使うと[b2]の電力量になる。',
        blanks: [number('b1', 100, 0, 'Wh'), number('b2', 160, 0, 'Wh')],
        explanation: '100 × 1 ＝ 100 Wh、80 × 2 ＝ 160 Wh です。',
        hint: '電力×時間（時間の単位）を計算しよう。',
      }),
      fill({
        id: 'electricity-mp11-r2', concept: 'el-power',
        prompt: '5 W の器具を 2 時間 30 分使いました。空らんに入る数を入れよう。',
        text: '使った電力量は[b1]である。',
        blanks: [number('b1', 12.5, 0, 'Wh')],
        explanation: '2 時間 30 分 ＝ 2.5 時間なので、5 × 2.5 ＝ 12.5 Wh です。',
        hint: '30 分は何時間かな。',
      }),
      fill({
        id: 'electricity-mp11-r3', concept: 'el-power',
        prompt: '20 Ω の電熱線に 100 V の電圧を 4 時間加えました。空らんに入る数を入れよう。',
        text: '使った電力量は[b1]である。',
        blanks: [number('b1', 2000, 0, 'Wh')],
        explanation: '電流は 100 ÷ 20 ＝ 5 A、電力は 100 × 5 ＝ 500 W です。500 × 4 ＝ 2000 Wh です。',
        hint: '電流 → 電力 → 電力量の順に求めよう。',
      }),
      fill({
        id: 'electricity-mp11-r4', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '72000 J は[b1]である。',
        blanks: [number('b1', 20, 0, 'Wh')],
        explanation: '1 Wh ＝ 3600 J なので、72000 ÷ 3600 ＝ 20 Wh です。',
        hint: 'J を 3600 でわると Wh になるよ。',
      }),
      fill({
        id: 'electricity-mp11-r5', concept: 'el-power',
        prompt: '空らんに入る数を入れよう。',
        text: '50 W の電熱線に 30 秒間電流を流すと[b1]、2 Ω の電熱線に 10 V を 5 分間加えると[b2]の熱が発生する。',
        blanks: [number('b1', 1500, 0, 'J'), number('b2', 15000, 0, 'J')],
        explanation: '50 × 30 ＝ 1500 J です。2 Ω に 10 V では電流 5 A、電力 50 W なので、50 × 300 ＝ 15000 J です。',
        hint: '時間は秒になおそう。',
      }),
      fill({
        id: 'electricity-mp11-r6', concept: 'el-power',
        prompt: '500 W で 4 分あたためる冷凍食品を、2000 W であたためます。空らんに入る数を入れよう。',
        text: 'あたためる時間は[b1]である。',
        blanks: [number('b1', 1, 0, '分')],
        explanation: '必要な電力量は 500 W × 4 分で同じなので、2000 W では 500 × 4 ÷ 2000 ＝ 1 分です。',
        hint: '電力が 4 倍になると、時間は何分の 1 になるかな。',
      }),
      choice({
        id: 'electricity-mp11-r7', concept: 'el-power',
        prompt: '電力量の単位として、ジュール（J）以外によく使われるものはどれ？',
        options: ['ワット時（Wh）', 'ボルト（V）', 'オーム（Ω）'],
        answer: 'a',
        explanation: '電力量は J のほか、ワット時（Wh）やキロワット時（kWh）で表します。家庭の電気料金は kWh で計算されます。',
        hint: '「電力×時間」の単位だよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp12: 静電気・陰極線・放射線 ----
  // 放電管（左の A が−極、右の B が＋極）と、上下の電極板 C（＋）・D（−）。withPaths なら光のすじの候補ア〜ウをかく
  function tubeItems(withPaths) {
    const items = [
      { type: 'ellipse', x: 160, y: 120, rx: 150, ry: 56, fill: 'glass' },
      { type: 'rect', x: 18, y: 104, width: 12, height: 32, fill: 'ink' },
      { type: 'rect', x: 290, y: 84, width: 8, height: 72, fill: '#9BE3B0' },
      { type: 'rect', x: 120, y: 92, width: 80, height: 6, fill: 'red', stroke: 'none' },
      { type: 'rect', x: 120, y: 142, width: 80, height: 6, fill: 'blue', stroke: 'none' },
      { type: 'text', x: 24, y: 96, text: 'A（−）', size: 12, anchor: 'middle' },
      { type: 'text', x: 294, y: 74, text: 'B（＋）', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 86, text: 'C（＋）', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 166, text: 'D（−）', size: 12, anchor: 'middle' },
    ];
    if (withPaths) {
      items.push(
        { type: 'line', points: [[30, 120], [120, 120], [200, 108], [282, 88]], color: 'green', width: 3, dashed: true },
        { type: 'line', points: [[120, 120], [200, 132], [282, 152]], color: 'green', width: 3, dashed: true },
        { type: 'line', points: [[120, 120], [282, 120]], color: 'green', width: 3, dashed: true },
        { type: 'region', id: 'r1', x: 244, y: 60, r: 22, label: 'ア' },
        { type: 'region', id: 'r2', x: 244, y: 180, r: 22, label: 'イ' },
        { type: 'region', id: 'r3', x: 244, y: 120, r: 22, label: 'ウ' },
      );
    } else {
      items.push({ type: 'line', points: [[30, 120], [120, 120], [200, 108], [288, 88]], color: 'green', width: 4 });
    }
    return items;
  }

  const elecMp12 = {
    id: 'electricity-mp12', areaId: 'el-miniprint', title: 'プリント 12: 静電気・陰極線・放射線', minutes: 6, concepts: ['el-static', 'el-radiation'],
    lessons: [
      {
        id: 'electricity-mp12-c1',
        anim: 'el-static-charge',   // 動く図の使い回し（js/anim-physics.js）。figure は静止図として残す
        text: 'ストローをティッシュでこすると、ストローは−、ティッシュは＋の電気を帯びます。電気には＋と−の 2 種類があり、ちがう種類は引き合い、同じ種類はしりぞけ合います。物体にたまった電気を**静電気**といいます。',
        figure: scene([
          { type: 'rect', x: 30, y: 60, width: 120, height: 14, fill: 'sky', rx: 7 },
          { type: 'rect', x: 30, y: 110, width: 120, height: 14, fill: 'sky', rx: 7 },
          note(90, 52, 'ストロー −', 13), note(90, 146, 'ストロー −', 13),
          { type: 'arrow', x1: 166, y1: 72, x2: 166, y2: 44, color: 'blue' },
          { type: 'arrow', x1: 166, y1: 112, x2: 166, y2: 140, color: 'blue' },
          note(90, 172, 'しりぞけ合う', 14),
          { type: 'rect', x: 220, y: 60, width: 70, height: 60, fill: 'white', stroke: 'gray', label: '＋' },
          note(255, 52, 'ティッシュ', 12),
          { type: 'rect', x: 200, y: 150, width: 110, height: 14, fill: 'sky', rx: 7 },
          note(255, 184, 'ストロー −', 13),
          { type: 'arrow', x1: 255, y1: 146, x2: 255, y2: 126, color: 'blue' },
          note(255, 212, '引き合う', 14),
        ]),
      },
      {
        id: 'electricity-mp12-c2',
        anim: 'el-cathode-bend',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '**誘導コイル**で高い電圧を加えると、空気をぬいた放電管の中を電流が流れます（真空放電）。−極から出る光のすじを**陰極線**（電子線）といい、正体は−の電気をもつ**電子**の流れです。電極板に電圧を加えると、＋極のほうへ曲がります。',
        figure: scene(tubeItems(false).concat([note(160, 222, '光のすじは C（＋）のほうへ曲がる', 13)])),
      },
      {
        id: 'electricity-mp12-c3',
        text: '**放射線**には、α線・β線・γ線・X 線などがあり、γ線と X 線は電磁波の仲間です。放射線を出す能力を**放射能**といいます。人体への影響の大きさはシーベルト（Sv）で表します。放射線は、レントゲン検査やがんの治療などに利用されています。',
        figure: scene([
          { type: 'rect', x: 20, y: 20, width: 280, height: 120, fill: '#EEF2F8', stroke: 'line' },
          note(90, 50, 'α線', 15), note(230, 50, 'β線', 15),
          note(90, 90, 'γ線（電磁波）', 15), note(230, 90, 'X 線（電磁波）', 15),
          note(160, 126, '放射線を出す能力 → 放射能', 13),
          note(160, 176, 'ベクレル（Bq）: 放射能の強さ', 13),
          note(160, 204, 'シーベルト（Sv）: 人体への影響', 13),
        ]),
      },
    ],
    warmup: choice({
      id: 'electricity-mp12-w1', concept: 'el-static',
      prompt: '予想しよう。ティッシュでこすったストローを、こすったティッシュに近づけると、どうなると思う？',
      options: ['引き合う（近づく）', 'しりぞけ合う（遠ざかる）', '何も起こらない'],
      answer: 'a',
      explanation: 'こすったストローは−、ティッシュは＋の電気を帯びます。ちがう種類の電気なので、引き合います。',
      hint: 'ストローとティッシュは、同じ種類の電気かな、ちがう種類かな。',
    }),
    problems: [
      fill({
        id: 'electricity-mp12-t1', concept: 'el-static', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物体にたまった電気を[b1]という。陰極線の正体は、−の電気をもつ小さな粒の[b2]の流れである。',
        blanks: [
          word('b1', ['静電気', '電流', '放射線'], '静電気'),
          word('b2', ['電子', '原子', '分子'], '電子'),
        ],
        explanation: '物体にたまった電気を**静電気**、陰極線の正体である−の電気をもつ粒を**電子**といいます。',
        hint: '動かずに「静か」にたまっている電気だね。',
      }),
      figureChoice({
        id: 'electricity-mp12-p1', concept: 'el-static',
        prompt: '放電管の A（−極）と B（＋極）に高い電圧を加えて陰極線を出し、さらに上の電極板 C を＋、下の D を−にしました。陰極線（光のすじ）の進み方は、ア〜ウのどれ？',
        figure: scene(tubeItems(true)),
        answer: 'r1',
        explanation: '陰極線は−の電気をもつ電子の流れなので、＋の電極板 C のほうへ引かれて上に曲がります（ア）。',
        hint: '−の電気をもつ電子は、＋と−のどちらに引かれるかな。',
      }),
      choice({
        id: 'electricity-mp12-p2', concept: 'el-static',
        prompt: 'ティッシュでこすったストローを、そのティッシュに近づけると、どうなる？',
        options: ['引き合う（近づく）', 'しりぞけ合う（遠ざかる）', '何も起こらない'],
        answer: 'a',
        explanation: 'ストローは−、ティッシュは＋の電気を帯びています。ちがう種類の電気は引き合います。',
        hint: '＋と−は、ちがう種類の電気だね。',
      }),
      choice({
        id: 'electricity-mp12-p3', concept: 'el-static',
        prompt: 'ティッシュでこすったストローを、同じようにこすったもう 1 本のストローに近づけると、どうなる？',
        options: ['しりぞけ合う（遠ざかる）', '引き合う（近づく）', '何も起こらない'],
        answer: 'a',
        explanation: '2 本のストローはどちらも−の電気を帯びています。同じ種類の電気はしりぞけ合います。',
        hint: '2 本のストローは、同じ種類の電気を帯びているね。',
      }),
      choice({
        id: 'electricity-mp12-p4', concept: 'el-radiation',
        prompt: 'α線・β線・γ線・X 線のうち、電磁波の仲間 2 つはどれ？',
        options: ['γ線と X 線', 'α線と β線', 'α線と X 線'],
        answer: 'a',
        explanation: 'γ線と X 線は、光や電波と同じ電磁波の仲間です。α線と β線は、目に見えない小さな粒の流れです。',
        hint: 'レントゲン検査に使われる放射線は電磁波だよ。',
      }),
      choice({
        id: 'electricity-mp12-p5', concept: 'el-radiation',
        prompt: '放射線を出す能力のことを、漢字 3 字で何という？',
        options: ['放射能', '放射線', '放射性'],
        answer: 'a',
        explanation: '放射線を出す能力を**放射能**といいます。放射能をもつ物質を放射性物質といいます。',
        hint: '放射線を出す「能力」だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'electricity-mp12-r1', concept: 'el-static',
        prompt: 'こすったストローとティッシュが引き合ったり、ストローどうしがしりぞけ合ったりするのは、物体に何が生じたから？',
        options: ['電気（静電気）', '磁石の力', '重さ'],
        answer: 'a',
        explanation: 'こすり合わせると電子が移動して、物体が電気（静電気）を帯びます。帯びた電気どうしに力がはたらきます。',
        hint: 'こすると物体が帯びるものは何かな。',
      }),
      choice({
        id: 'electricity-mp12-r2', concept: 'el-static',
        prompt: '物体が帯びる電気の種類は、何種類ある？',
        options: ['＋と−の 2 種類', '＋の 1 種類だけ', '＋・−・0 の 3 種類'],
        answer: 'a',
        explanation: '電気には＋と−の 2 種類があります。同じ種類はしりぞけ合い、ちがう種類は引き合います。',
        hint: 'ストローとティッシュが帯びた電気を思い出そう。',
      }),
      choice({
        id: 'electricity-mp12-r3', concept: 'el-static',
        prompt: '放電管に高い電圧を加えるのに使う装置はどれ？',
        options: ['誘導コイル', '電流計', '検流計'],
        answer: 'a',
        explanation: '誘導コイルは、数万 V の高い電圧をつくる装置です。',
        hint: '電磁誘導を利用して高い電圧をつくる装置だよ。',
      }),
      choice({
        id: 'electricity-mp12-r4', concept: 'el-static',
        prompt: '陰極線は、放電管のどちらからどちらへ進む？',
        options: ['−極（陰極）から＋極へ', '＋極から−極（陰極）へ', '両方の極から中央へ'],
        answer: 'a',
        explanation: '陰極線は−極（陰極）から出る電子の流れで、＋極のほうへ進みます。',
        hint: '「陰極」線という名前に注目しよう。',
      }),
      choice({
        id: 'electricity-mp12-r5', concept: 'el-static',
        prompt: '陰極線が出ている放電管に、横から磁石を近づけると、光のすじはどうなる？',
        options: ['曲がる', 'まっすぐのまま', '消えてなくなる'],
        answer: 'a',
        explanation: '陰極線は電子の流れ（電流と同じ）なので、磁界から力を受けて曲がります。',
        hint: '電流が磁界から受ける力を思い出そう。',
      }),
      choice({
        id: 'electricity-mp12-r6', concept: 'el-static',
        prompt: '放電管の空気をぬいていくと、管の中に特有の色の光が現れて電流が流れます。この現象を何という？',
        options: ['真空放電', '電磁誘導', '静電気'],
        answer: 'a',
        explanation: '空気をぬいた（気圧を低くした）管の中で電流が流れる現象を、真空放電といいます。',
        hint: '「真空」に近い管の中の「放電」だよ。',
      }),
      choice({
        id: 'electricity-mp12-r7', concept: 'el-static',
        prompt: '陰極線が−極から出て進むことを確かめるには、どんな放電管を使うとよい？',
        options: ['十字形の金属板が入った放電管', '電極が 1 つだけの放電管', '空気がたくさん入った放電管'],
        answer: 'a',
        explanation: '十字形の金属板が入った放電管では、−極から出た陰極線がさえぎられて、＋極側のガラスに十字形の影ができます。このことから、陰極線が−極から出てまっすぐ進むことが分かります。',
        hint: 'とちゅうに物を置くと、影ができるかを見るよ。',
      }),
      choice({
        id: 'electricity-mp12-r8', concept: 'el-radiation',
        prompt: 'ベクレル（Bq）とシーベルト（Sv）のうち、放射線が人体にあたえる影響の大きさを表す単位はどちら？',
        options: ['シーベルト（Sv）', 'ベクレル（Bq）'],
        answer: 'a',
        explanation: '人体への影響の大きさはシーベルト（Sv）、放射性物質の放射能の強さはベクレル（Bq）で表します。',
        hint: 'ニュースで「ミリシーベルト」と聞くのはどちらの話かな。',
      }),
      choice({
        id: 'electricity-mp12-r9', concept: 'el-radiation',
        prompt: '放射線の、生活の中での利用例として正しいものはどれ？',
        options: ['レントゲン検査（X 線写真）', '電子レンジの加熱', 'テレビの音声'],
        answer: 'a',
        explanation: '放射線は、物を通りぬける性質を利用したレントゲン検査や、がんの治療、農作物の品種改良などに使われています。',
        hint: '病院で、からだの中を写す検査だよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp13: 磁石のまわりの磁界と磁力線 ----
  // 棒磁石（中心 (160, 120)、左が N 極、右が S 極）
  function barMagnetItems() {
    return [
      { type: 'rect', x: 100, y: 105, width: 60, height: 30, fill: 'red', label: 'N' },
      { type: 'rect', x: 160, y: 105, width: 60, height: 30, fill: 'blue', label: 'S' },
    ];
  }

  // 方位磁針（中心 (x, y)。deg は N 極の向き。0 が右、90 が下）。N 極側を赤くぬる
  function needle(x, y, deg) {
    const a = deg * Math.PI / 180;
    const u = [Math.cos(a), Math.sin(a)], v = [-Math.sin(a), Math.cos(a)];
    const p = (s, t) => [Math.round((x + u[0] * s + v[0] * t) * 10) / 10, Math.round((y + u[1] * s + v[1] * t) * 10) / 10];
    return [
      { type: 'circle', x, y, r: 17, fill: 'white', stroke: 'gray' },
      { type: 'polygon', points: [p(14, 0), p(0, 5), p(0, -5)], fill: 'red' },
      { type: 'polygon', points: [p(-14, 0), p(0, 5), p(0, -5)], fill: 'white' },
    ];
  }

  // 磁力線（N 極から出て S 極に入る。磁石の外では左から右へ）
  function fieldLineItems() {
    const items = [];
    [[80, 36], [100, 62], [120, 92]].forEach(([rx, ry]) => {
      items.push({ type: 'ellipse', x: 160, y: 120, rx, ry, fill: 'none', stroke: 'gray' });
      items.push({ type: 'arrow', x1: 150, y1: 120 - ry, x2: 170, y2: 120 - ry, color: 'blue', width: 2 });
      items.push({ type: 'arrow', x1: 150, y1: 120 + ry, x2: 170, y2: 120 + ry, color: 'blue', width: 2 });
    });
    return items;
  }

  // 方位磁針を置く 4 つの点（① 上、② N 極の左、③ S 極の右、④ 下）
  const MAGNET_POINTS = [[160, 60, '①'], [56, 120, '②'], [264, 120, '③'], [160, 180, '④']];
  function magnetPointsItems() {
    return barMagnetItems().concat(MAGNET_POINTS.flatMap(([x, y, n]) => [
      { type: 'circle', x, y, r: 12, fill: 'white', stroke: 'gray' },
      { type: 'text', x, y: y + 6, text: n, size: 15, anchor: 'middle' },
    ]));
  }
  const DIR_OPTIONS = ['右（→）', '左（←）', '上（↑）', '下（↓）'];

  const elecMp13 = {
    id: 'electricity-mp13', areaId: 'el-miniprint', title: 'プリント 13: 磁石のまわりの磁界と磁力線', minutes: 5, concepts: ['el-magnet'],
    lessons: [
      {
        id: 'electricity-mp13-c1',
        anim: 'el-compass-around',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '磁石が鉄を引きつけたり、磁石どうしが引き合ったりしりぞけ合ったりする力を**磁力**といい、磁力がはたらく空間を**磁界**といいます。磁界の向きは、その場所に置いた方位磁針の N 極がさす向きです。',
        figure: scene(barMagnetItems().concat(needle(160, 60, 0), needle(56, 120, 180), needle(264, 120, 180), needle(160, 180, 0), [
          note(160, 228, '方位磁針の赤い側が N 極', 13),
        ])),
      },
      {
        id: 'electricity-mp13-c2',
        text: '磁界のようすを表した線を**磁力線**といいます。磁力線は N 極から出て S 極に入り、矢印の向きが磁界の向きを表します。磁力線の間隔がせまい（混んでいる）ところほど、磁界は強くなります。',
        // 写真: 棒磁石（x 85〜232, y 113〜133。左半分が赤、右半分が青）のまわりの砂鉄のもよう（y 40〜200）。
        // 線は両はしの極に集まり、極と極を弧で結ぶ。上下は白い余白
        figure: scene([
          photo('electricity-mp13-c2'),
          tag(122, 129, 'N', { size: 16, bold: true }), tag(196, 129, 'S', { size: 16, bold: true }),
          { type: 'arrow', x1: 146, y1: 58, x2: 174, y2: 58, color: 'orange' },
          { type: 'arrow', x1: 146, y1: 188, x2: 174, y2: 188, color: 'orange' },
          { type: 'arrow', x1: 72, y1: 123, x2: 44, y2: 123, color: 'orange' },
          { type: 'arrow', x1: 276, y1: 123, x2: 248, y2: 123, color: 'orange' },
          tag(160, 22, '磁力線は N 極から出て S 極に入る', { size: 13 }),
          tag(160, 228, '磁石の近くほど線が混む → 磁界が強い', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'electricity-mp13-w1', concept: 'el-magnet',
      prompt: '予想しよう。棒磁石の近くに方位磁針を置くと、方位磁針の N 極はどうなると思う？',
      options: ['磁石の磁界の向きをさす', 'いつも北をさしたまま', 'ぐるぐる回り続ける'],
      answer: 'a',
      explanation: '磁石の近くでは、方位磁針は磁石の磁界の向きにそろいます。N 極がさす向きが、その場所の磁界の向きです。',
      hint: '方位磁針も小さな磁石だよ。',
    }),
    problems: [
      fill({
        id: 'electricity-mp13-t1', concept: 'el-magnet', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '磁力がはたらく空間を[b1]といい、そのようすを表した線を[b2]という。',
        blanks: [
          word('b1', ['磁界', '磁力', '電流'], '磁界'),
          word('b2', ['磁力線', '等圧線', '導線'], '磁力線'),
        ],
        explanation: '磁力がはたらく空間を**磁界**、磁界のようすを表した線を**磁力線**といいます。',
        hint: '「磁」の「界（さかい・空間）」と、「磁力」の「線」だよ。',
      }),
      figureChoice({
        id: 'electricity-mp13-p1', concept: 'el-magnet',
        prompt: '棒磁石のまわりの磁力線です。ア〜ウのうち、磁界がいちばん強いのはどこ？',
        figure: scene(fieldLineItems().concat(barMagnetItems(), [
          { type: 'region', id: 'r1', x: 90, y: 92, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 22, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 296, y: 214, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '磁力線が混んでいる（間隔がせまい）ところほど磁界は強くなります。磁石の極に近いアがいちばん強いです。',
        hint: '磁力線の間隔がいちばんせまいところをさがそう。',
      }),
      choice({
        id: 'electricity-mp13-p2', concept: 'el-magnet',
        prompt: '棒磁石（左が N 極）のまわりの①に方位磁針を置きました。N 極がさす向きはどれ？',
        figure: scene(magnetPointsItems()),
        options: DIR_OPTIONS,
        answer: 'a',
        explanation: '磁界は N 極から出て S 極に入ります。磁石の上の①では、N 極（左）から S 極（右）へ向かうので、方位磁針の N 極は右をさします。',
        hint: '磁力線は N 極から出て、どちらへ向かうかな。',
      }),
      choice({
        id: 'electricity-mp13-p3', concept: 'el-magnet',
        prompt: '棒磁石（左が N 極）の N 極の左側の②に方位磁針を置きました。N 極がさす向きはどれ？',
        figure: scene(magnetPointsItems()),
        options: DIR_OPTIONS,
        answer: 'b',
        explanation: '②は N 極のすぐ外側です。磁界は N 極から外へ出る向きなので、方位磁針の N 極は左をさします。',
        hint: '磁界は N 極から「出る」向きだよ。',
      }),
      choice({
        id: 'electricity-mp13-p4', concept: 'el-magnet',
        prompt: '磁界の向きは、磁力線の何を見れば分かる？',
        options: ['磁力線の矢印の向き', '磁力線の色', '磁力線の長さ'],
        answer: 'a',
        explanation: '磁力線には矢印をつけて、磁界の向き（N 極から S 極へ）を表します。',
        hint: '向きを表すのは矢印だね。',
      }),
      choice({
        id: 'electricity-mp13-p5', concept: 'el-magnet',
        prompt: '磁石どうしが引き合ったり、しりぞけ合ったりする力を何という？',
        options: ['磁力', '重力', '弾性力'],
        answer: 'a',
        explanation: '磁石が鉄を引きつけたり、磁石どうしが引き合ったりしりぞけ合ったりする力を**磁力**といいます。',
        hint: '「磁石の力」を 2 字で表そう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'electricity-mp13-r1', concept: 'el-magnet',
        prompt: '棒磁石（左が N 極）の S 極の右側の③に方位磁針を置きました。N 極がさす向きはどれ？',
        figure: scene(magnetPointsItems()),
        options: DIR_OPTIONS,
        answer: 'b',
        explanation: '磁界は外から S 極に入る向きです。③は S 極の右なので、磁界は S 極のほう（左）を向き、方位磁針の N 極は左をさします。',
        hint: '磁界は S 極に「入る」向きだよ。',
      }),
      choice({
        id: 'electricity-mp13-r2', concept: 'el-magnet',
        prompt: '棒磁石（左が N 極）の下の④に方位磁針を置きました。N 極がさす向きはどれ？',
        figure: scene(magnetPointsItems()),
        options: DIR_OPTIONS,
        answer: 'a',
        explanation: '磁石の下でも、磁界は N 極（左）から S 極（右）へ向かいます。方位磁針の N 極は右をさします。',
        hint: '磁石の上と下で、磁界の向きは同じかな。',
      }),
      choice({
        id: 'electricity-mp13-r3', concept: 'el-magnet',
        prompt: '磁界の強さは、磁力線の何を見れば分かる？',
        options: ['磁力線の間隔（混みぐあい）', '磁力線の矢印の向き', '磁力線の色'],
        answer: 'a',
        explanation: '磁力線の間隔がせまく混んでいるところほど、磁界は強くなります。',
        hint: '磁石の近くでは、磁力線はどうなっているかな。',
      }),
      choice({
        id: 'electricity-mp13-r4', concept: 'el-magnet',
        prompt: '磁石のまわりの磁力線は、どちらの極から出て、どちらの極に入る？',
        options: ['N 極から出て S 極に入る', 'S 極から出て N 極に入る', '両方の極から出る'],
        answer: 'a',
        explanation: '磁力線は N 極から出て S 極に入ります。この向きが磁界の向きです。',
        hint: '方位磁針の N 極は、S 極に引きつけられるね。',
      }),
    ],
  };

  // ---- ステージ electricity-mp14: 電流がつくる磁界 ----
  // 導線の断面（紙の裏から表へ電流が流れる ・印）
  function wireOut(x, y) {
    return [
      { type: 'circle', x, y, r: 10, fill: 'white', stroke: 'ink' },
      { type: 'circle', x, y, r: 3, fill: 'ink', stroke: 'ink' },
    ];
  }
  // 導線のまわりの磁界の円と矢印（cw が true なら画面の上で時計回り）
  function circleField(x, y, cw) {
    return [
      { type: 'circle', x, y, r: 36, fill: 'none', stroke: 'gray' },
      { type: 'arrow', x1: cw ? x - 12 : x + 12, y1: y - 36, x2: cw ? x + 12 : x - 12, y2: y - 36, color: 'blue' },
      { type: 'arrow', x1: cw ? x + 12 : x - 12, y1: y + 36, x2: cw ? x - 12 : x + 12, y2: y + 36, color: 'blue' },
    ];
  }
  // ア 反時計回り、イ 時計回りの 2 つの図。out が true なら電流は紙の裏から表（・）、false なら表から裏（×）
  function wireFieldChoiceItems(out) {
    const w = out ? wireOut : wireIn;
    return [
      ...circleField(80, 110, false), ...w(80, 110),
      ...circleField(240, 110, true), ...w(240, 110),
      note(160, 26, out ? '・: 電流が紙の裏から表へ流れる' : '×: 電流が紙の表から裏へ流れる', 13),
      { type: 'region', id: 'r1', x: 80, y: 196, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 240, y: 196, r: 22, label: 'イ' },
    ];
  }

  // コイル（左右にのびる軸）。frontDown が true なら手前側の導線の電流は下向き。withRegions なら磁界の向きの候補ア（右）・イ（左）
  function coilItems(frontDown, withRegions) {
    const items = [{ type: 'line', points: [[60, 120], [270, 120]], color: 'gray', width: 1, dashed: true }];
    [120, 132, 144, 156, 168, 180, 192].forEach(x => items.push({ type: 'ellipse', x, y: 120, rx: 7, ry: 32, fill: 'none', stroke: 'brown' }));
    items.push(
      wire([[120, 152], [120, 200], [100, 200]]),
      wire([[192, 152], [192, 200], [212, 200]]),
      { type: 'arrow', x1: 90, y1: frontDown ? 92 : 148, x2: 90, y2: frontDown ? 148 : 92, color: 'orange' },
      { type: 'text', x: 84, y: 76, text: '手前側の電流', size: 12, anchor: 'middle' },
      note(156, 76, 'コイル', 12),
    );
    if (withRegions) {
      items.push(
        { type: 'arrow', x1: 228, y1: 60, x2: 288, y2: 60, color: 'blue' },
        { type: 'arrow', x1: 288, y1: 180, x2: 228, y2: 180, color: 'blue' },
        { type: 'region', id: 'r1', x: 258, y: 32, r: 22, label: 'ア' },
        { type: 'region', id: 'r2', x: 258, y: 210, r: 22, label: 'イ' },
      );
    }
    return items;
  }

  const elecMp14 = {
    id: 'electricity-mp14', areaId: 'el-miniprint', title: 'プリント 14: 電流がつくる磁界', minutes: 5, concepts: ['el-magnet'],
    lessons: [
      {
        id: 'electricity-mp14-c1',
        anim: 'el-wire-field',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: 'まっすぐな導線に電流を流すと、導線を中心とした同心円状の磁界ができます。電流の向きに**右ねじ**が進むとき、ねじを回す向きが磁界の向きです。電流を逆にすると磁界も逆になり、電流が大きいほど磁界は強くなります。',
        figure: scene([
          ...circleField(80, 110, true), ...wireIn(80, 110),
          ...circleField(240, 110, false), ...wireOut(240, 110),
          note(80, 176, '×（表から裏）', 13), note(80, 196, '→ 時計回り', 13),
          note(240, 176, '・（裏から表）', 13), note(240, 196, '→ 反時計回り', 13),
          note(160, 30, '電流の向きに右ねじを進める', 13),
        ]),
      },
      {
        id: 'electricity-mp14-c2',
        anim: 'el-coil-field',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '導線をくり返し巻いたものを**コイル**といいます。コイルに電流を流すと、内部に軸にそった磁界ができます。右手の 4 本の指を電流の向きに合わせてコイルをにぎると、親指の向きがコイルの内部の磁界の向きです。',
        figure: scene(coilItems(true, false).concat([
          { type: 'arrow', x1: 130, y1: 120, x2: 230, y2: 120, color: 'blue', width: 4 },
          { type: 'text', x: 236, y: 112, text: '磁界', size: 13, bold: true },
          note(160, 232, '手前側の電流が下向き → 内部の磁界は右向き', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'electricity-mp14-w1', concept: 'el-magnet',
      prompt: '予想しよう。まっすぐな導線に電流を流し、そのそばに方位磁針を置くと、どうなると思う？',
      options: ['方位磁針の向きが変わる', '何も変わらない', '方位磁針が熱くなる'],
      answer: 'a',
      explanation: '電流が流れる導線のまわりには磁界ができるので、方位磁針の向きが変わります。',
      hint: '電流は、磁石と同じように磁界をつくるかな。',
    }),
    problems: [
      choice({
        id: 'electricity-mp14-t1', concept: 'el-magnet', term: true,
        prompt: '次の説明に合う言葉はどれ？「導線をくり返し巻いたもの」',
        options: ['コイル', '電熱線', '整流子'],
        answer: 'a',
        explanation: '導線をくり返し巻いたものを**コイル**といいます。電流を流すと、まっすぐな導線より強い磁界ができます。',
        hint: 'ばねのような形のものだよ。',
      }),
      figureChoice({
        id: 'electricity-mp14-p1', concept: 'el-magnet',
        prompt: '導線に、紙の裏から表へ（見ている人のほうへ）電流を流しました。導線のまわりの磁界の向きを正しく表しているのは、ア・イのどちら？',
        figure: scene(wireFieldChoiceItems(true)),
        answer: 'r1',
        explanation: '電流の向き（紙の裏から表）に右ねじを進めるには、ねじを反時計回りに回します。だから磁界は反時計回り（ア）です。',
        hint: 'ねじを手前に進める（ゆるめる）ときは、どちら向きに回すかな。',
      }),
      figureChoice({
        id: 'electricity-mp14-p2', concept: 'el-magnet',
        prompt: '今度は、紙の表から裏へ電流を流しました。導線のまわりの磁界の向きを正しく表しているのは、ア・イのどちら？',
        figure: scene(wireFieldChoiceItems(false)),
        answer: 'r2',
        explanation: '電流の向きを逆にすると、磁界の向きも逆になります。紙の奥へ右ねじを進めるには時計回りに回すので、磁界は時計回り（イ）です。',
        hint: 'ねじを奥へしめるときは、どちら向きに回すかな。',
      }),
      choice({
        id: 'electricity-mp14-p3', concept: 'el-magnet',
        prompt: '右ねじの考え方で、ねじの「進む向き」と「回す向き」は、それぞれ何の向きを表している？',
        options: ['進む向き＝電流の向き、回す向き＝磁界の向き', '進む向き＝磁界の向き、回す向き＝電流の向き', 'どちらも電流の向き'],
        answer: 'a',
        explanation: '電流の向きに右ねじが進むとき、ねじを回す向きが磁界の向きになります。',
        hint: 'まっすぐな導線では、電流はまっすぐ、磁界はぐるりと回るね。',
      }),
      figureChoice({
        id: 'electricity-mp14-p4', concept: 'el-magnet',
        prompt: 'コイルに電流を流しました。コイルの手前側（見ている人に近い側）の導線では、電流が上から下へ流れています。コイルの内部の磁界の向きは、ア（右向き）とイ（左向き）のどちら？',
        figure: scene(coilItems(true, true)),
        answer: 'r1',
        explanation: '右手の 4 本の指を電流の向き（手前側で下向き）に合わせてコイルをにぎると、親指は右を向きます。だから内部の磁界は右向き（ア）です。',
        hint: '右手でコイルをにぎるように考えよう。',
      }),
      choice({
        id: 'electricity-mp14-p5', concept: 'el-magnet',
        prompt: 'コイルの内部の磁界が右向きのとき、電流の向きを逆にすると、内部の磁界はどうなる？',
        options: ['左向きになる', '右向きのまま', 'なくなる'],
        answer: 'a',
        explanation: '電流の向きを逆にすると、磁界の向きも逆になります。だから左向きになります。',
        hint: '電流と磁界の向きの関係を思い出そう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'electricity-mp14-r1', concept: 'el-magnet',
        prompt: 'コイルの手前側（見ている人に近い側）の導線で、電流が下から上へ流れています。コイルの内部の磁界の向きは、ア（右向き）とイ（左向き）のどちら？',
        figure: scene(coilItems(false, true)),
        answer: 'r2',
        explanation: '右手の 4 本の指を電流の向き（手前側で上向き）に合わせてコイルをにぎると、親指は左を向きます。だから内部の磁界は左向き（イ）です。',
        hint: '右手でコイルをにぎるように考えよう。',
      }),
      choice({
        id: 'electricity-mp14-r2', concept: 'el-magnet',
        prompt: 'まっすぐな導線に流す電流を大きくすると、まわりの磁界はどうなる？',
        options: ['強くなる', '弱くなる', '変わらない'],
        answer: 'a',
        explanation: '電流が大きいほど、導線のまわりの磁界は強くなります。',
        hint: '電流が磁界をつくっているね。',
      }),
      choice({
        id: 'electricity-mp14-r3', concept: 'el-magnet',
        prompt: 'まっすぐな導線のまわりの磁界が時計回りのとき、電流の向きを逆にすると、磁界はどうなる？',
        options: ['反時計回りになる', '時計回りのまま', 'なくなる'],
        answer: 'a',
        explanation: '電流の向きを逆にすると、磁界の向きも逆の反時計回りになります。',
        hint: '右ねじを逆に進めると、回す向きはどうなるかな。',
      }),
      choice({
        id: 'electricity-mp14-r4', concept: 'el-magnet',
        prompt: 'コイルの巻数を多くして、同じ大きさの電流を流しました。コイルの内部の磁界はどうなる？',
        options: ['強くなる', '弱くなる', '変わらない'],
        answer: 'a',
        explanation: 'コイルの巻数を多くするほど、内部の磁界は強くなります。電磁石もこのしくみを利用しています。',
        hint: '1 巻きごとにできる磁界が重なり合うよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp15: 電流が磁界から受ける力とモーター ----
  // 磁石の極のあいだの導線（断面）。into が true なら電流は表から裏（×）。nTop が true なら上が N 極（磁界は下向き）
  // withChoices なら力の向きの候補（ア 上、イ 下、ウ 左、エ 右）をかく
  function forceItems(into, nTop, withChoices) {
    const items = [
      { type: 'rect', x: 110, y: 14, width: 100, height: 36, fill: nTop ? 'red' : 'blue', label: nTop ? 'N' : 'S' },
      { type: 'rect', x: 110, y: 190, width: 100, height: 36, fill: nTop ? 'blue' : 'red', label: nTop ? 'S' : 'N' },
      { type: 'arrow', x1: 300, y1: nTop ? 70 : 170, x2: 300, y2: nTop ? 170 : 70, color: 'gray' },
      { type: 'text', x: 300, y: 60, text: '磁界', size: 12, anchor: 'middle' },
      ...(into ? wireIn(160, 120) : wireOut(160, 120)),
      note(56, 214, into ? '電流は表から裏へ' : '電流は裏から表へ', 12),
    ];
    if (withChoices) {
      items.push(
        { type: 'arrow', x1: 160, y1: 104, x2: 160, y2: 64, color: 'orange' },
        { type: 'arrow', x1: 160, y1: 136, x2: 160, y2: 178, color: 'orange' },
        { type: 'arrow', x1: 144, y1: 120, x2: 96, y2: 120, color: 'orange' },
        { type: 'arrow', x1: 176, y1: 120, x2: 224, y2: 120, color: 'orange' },
        { type: 'region', id: 'r1', x: 196, y: 76, r: 22, label: 'ア' },
        { type: 'region', id: 'r2', x: 196, y: 164, r: 22, label: 'イ' },
        { type: 'region', id: 'r3', x: 64, y: 120, r: 22, label: 'ウ' },
        { type: 'region', id: 'r4', x: 252, y: 120, r: 22, label: 'エ' },
      );
    }
    return items;
  }

  // モーターの断面（左が N 極、右が S 極。コイルの AB は手前へ（・）、CD は奥へ（×）電流が流れる）
  function motorItems(withChoices) {
    const items = [
      { type: 'rect', x: 6, y: 80, width: 44, height: 80, fill: 'red', label: 'N' },
      { type: 'rect', x: 270, y: 80, width: 44, height: 80, fill: 'blue', label: 'S' },
      { type: 'circle', x: 160, y: 120, r: 62, fill: 'none', stroke: 'gray' },
      { type: 'line', points: [[98, 120], [222, 120]], color: 'brown', width: 2 },
      ...wireOut(98, 120), ...wireIn(222, 120),
      note(98, 150, 'AB（・）', 12), note(222, 150, 'CD（×）', 12),
      note(160, 18, '磁界は N 極から S 極へ（→）', 12),
    ];
    if (withChoices) {
      items.push(
        { type: 'arrow', x1: 98, y1: 104, x2: 98, y2: 64, color: 'orange' },
        { type: 'arrow', x1: 98, y1: 160, x2: 98, y2: 196, color: 'orange' },
        { type: 'region', id: 'r1', x: 132, y: 66, r: 22, label: 'ア' },
        { type: 'region', id: 'r2', x: 132, y: 196, r: 22, label: 'イ' },
      );
    }
    return items;
  }

  const elecMp15 = {
    id: 'electricity-mp15', areaId: 'el-miniprint', title: 'プリント 15: 電流が磁界から受ける力とモーター', minutes: 6, concepts: ['el-motor'],
    lessons: [
      {
        id: 'electricity-mp15-c1',
        anim: 'el-wire-force',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '磁界の中の導線に電流を流すと、導線は力を受けます。力の向きは電流の向きと磁界の向きで決まり、どちらか一方を逆にすると力も逆向きになります。電流を大きくしたり、磁石を強くしたりすると、力は大きくなります。',
        figure: scene(forceItems(true, true, false).concat([
          { type: 'arrow', x1: 144, y1: 120, x2: 90, y2: 120, color: 'orange', width: 4 },
          { type: 'text', x: 90, y: 108, text: '力', size: 14, bold: true },
        ])),
      },
      {
        id: 'electricity-mp15-c2',
        anim: 'el-motor-rotate',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '**フレミングの左手の法則**では、左手の中指を電流、人さし指を磁界の向きに合わせると、親指が力の向きになります。**モーター**は磁界の中のコイルが受ける力で回り、**整流子**が半回転ごとに電流の向きを切りかえるので、同じ向きに回り続けます。',
        figure: scene(motorItems(false).concat([
          { type: 'arrow', x1: 98, y1: 104, x2: 98, y2: 66, color: 'orange', width: 3 },
          { type: 'arrow', x1: 222, y1: 136, x2: 222, y2: 174, color: 'orange', width: 3 },
          note(160, 216, 'AB は上、CD は下へ → 時計回りに回る', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'electricity-mp15-w1', concept: 'el-motor',
      prompt: '予想しよう。U 字形磁石のあいだにつるした導線（電気ブランコ）に電流を流すと、どうなると思う？',
      options: ['導線が動く', '何も起こらない', '導線が光る'],
      answer: 'a',
      explanation: '磁界の中の導線に電流を流すと、導線は力を受けて動きます。このステージで、力の向きの決まりを学ぼう。',
      hint: '電流のまわりにできる磁界と、磁石の磁界が関係するよ。',
    }),
    problems: [
      fill({
        id: 'electricity-mp15-t1', concept: 'el-motor', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電流が磁界から受ける力の向きは[b1]で調べられる。モーターでコイルの電流の向きを半回転ごとに切りかえる部分を[b2]という。',
        blanks: [
          word('b1', ['フレミングの左手の法則', 'オームの法則', '右ねじの法則'], 'フレミングの左手の法則'),
          word('b2', ['整流子', '検流計', '誘導コイル'], '整流子'),
        ],
        explanation: '力の向きは**フレミングの左手の法則**で調べます。モーターの**整流子**は、コイルが半回転するごとに電流の向きを切りかえます。',
        hint: '「左手」を使う法則だよ。',
      }),
      figureChoice({
        id: 'electricity-mp15-p1', concept: 'el-motor',
        prompt: '上が N 極、下が S 極の磁石のあいだに導線を置き、紙の表から裏へ電流を流しました。導線が受ける力の向きは、ア（上）・イ（下）・ウ（左）・エ（右）のどれ？',
        figure: scene(forceItems(true, true, true)),
        answer: 'r3',
        explanation: '磁界は N 極から S 極へ下向き、電流は紙の奥向きです。左手の中指を奥へ、人さし指を下へ向けると、親指は左を向きます。だから力は左向き（ウ）です。',
        hint: '左手の中指＝電流、人さし指＝磁界、親指＝力だよ。',
      }),
      choice({
        id: 'electricity-mp15-p2', concept: 'el-motor',
        prompt: '電気ブランコに電流を流すと、導線が A の向きに動きました。磁石の N 極と S 極を逆にすると、導線はどうなる？',
        options: ['A と逆向きに動く', 'A の向きに動く', '動かなくなる'],
        answer: 'a',
        explanation: '磁界の向きを逆にすると、導線が受ける力の向きも逆になります。',
        hint: '電流か磁界のどちらか一方を逆にすると、力は？',
      }),
      choice({
        id: 'electricity-mp15-p3', concept: 'el-motor',
        prompt: '電気ブランコで、磁石はそのままにして、電流の向きを逆にすると、導線はどうなる？',
        options: ['A と逆向きに動く', 'A の向きに動く', '動かなくなる'],
        answer: 'a',
        explanation: '電流の向きを逆にすると、導線が受ける力の向きも逆になります。',
        hint: '電流か磁界のどちらか一方を逆にすると、力は？',
      }),
      choice({
        id: 'electricity-mp15-p4', concept: 'el-motor',
        prompt: '電気ブランコで、流す電流を大きくすると、導線の動きはどうなる？',
        options: ['激しくなる', 'おだやかになる', '変わらない'],
        answer: 'a',
        explanation: '電流が大きいほど、導線が磁界から受ける力は大きくなるので、動きは激しくなります。',
        hint: '電流の大きさと力の大きさの関係を考えよう。',
      }),
      figureChoice({
        id: 'electricity-mp15-p5', concept: 'el-motor',
        prompt: 'モーターの断面です。左が N 極、右が S 極で、コイルの AB の部分には紙の裏から表へ電流が流れています。AB が受ける力の向きは、ア（上）とイ（下）のどちら？',
        figure: scene(motorItems(true)),
        answer: 'r1',
        explanation: '磁界は右向き（N 極から S 極）、AB の電流は手前向きです。左手の中指を手前、人さし指を右に向けると、親指は上を向くので、力は上向き（ア）です。',
        hint: '左手の中指を手前（自分のほう）に向けてみよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'electricity-mp15-r1', concept: 'el-motor',
        prompt: '下が N 極、上が S 極の磁石のあいだに導線を置き、紙の裏から表へ電流を流しました。導線が受ける力の向きは、ア（上）・イ（下）・ウ（左）・エ（右）のどれ？',
        figure: scene(forceItems(false, false, true)),
        answer: 'r3',
        explanation: '磁界は上向き、電流は手前向きです。電流と磁界の両方を逆にしたので、力は前の問題と同じ左向き（ウ）になります。',
        hint: '電流と磁界の両方を逆にすると、力の向きは？',
      }),
      choice({
        id: 'electricity-mp15-r2', concept: 'el-motor',
        prompt: 'モーターの断面で、AB は上向き、CD は下向きの力を受けています。コイルはどちら向きに回る？',
        figure: scene(motorItems(false)),
        options: ['時計回り', '反時計回り', '回らない'],
        answer: 'a',
        explanation: '左側の AB が上へ、右側の CD が下へおされるので、コイルは時計回りに回ります。',
        hint: '左が上がり、右が下がると、どちらに回るかな。',
      }),
      choice({
        id: 'electricity-mp15-r3', concept: 'el-motor',
        prompt: '時計回りに回っているモーターの電流の向きを逆にすると、どうなる？',
        options: ['反時計回りに回る', '時計回りのまま回る', '止まる'],
        answer: 'a',
        explanation: '電流の向きを逆にすると、コイルが受ける力の向きが逆になるので、回る向きも逆の反時計回りになります。',
        hint: '電流と力の向きの関係を思い出そう。',
      }),
      choice({
        id: 'electricity-mp15-r4', concept: 'el-motor',
        prompt: '磁界の中を流れる電流が受ける力の向きは、何と何で決まる？',
        options: ['電流の向きと磁界の向き', '電流の大きさと導線の長さ', '電圧と抵抗'],
        answer: 'a',
        explanation: '力の向きは、電流の向きと磁石の磁界の向きで決まります。力の大きさは、電流が大きいほど大きくなります。',
        hint: 'フレミングの左手の法則で合わせる 2 つの向きだよ。',
      }),
      choice({
        id: 'electricity-mp15-r5', concept: 'el-motor',
        prompt: 'フレミングの左手の法則で、中指が表しているのはどれ？',
        options: ['電流の向き', '磁界の向き', '力の向き'],
        answer: 'a',
        explanation: '中指が電流、人さし指が磁界、親指が力の向きです。「電・磁・力」と中指から順に覚えます。',
        hint: '中指・人さし指・親指の順に「電・磁・力」だよ。',
      }),
    ],
  };

  // ---- ステージ electricity-mp16: 電磁誘導と直流・交流 ----
  // コイルと検流計（G）、左から棒磁石を動かす。pole は コイルに向けた極、approach が true なら近づける
  function inductionItems(pole, approach) {
    const near = pole === 'N' ? ['blue', 'S', 'red', 'N'] : ['red', 'N', 'blue', 'S'];
    return [
      ...[150, 162, 174, 186, 198, 210, 222].map(x => ({ type: 'ellipse', x, y: 100, rx: 7, ry: 30, fill: 'none', stroke: 'brown' })),
      note(186, 60, 'コイル'),
      { type: 'rect', x: 10, y: 85, width: 45, height: 30, fill: near[0], label: near[1] },
      { type: 'rect', x: 55, y: 85, width: 45, height: 30, fill: near[2], label: near[3] },
      { type: 'arrow', x1: approach ? 40 : 100, y1: 150, x2: approach ? 100 : 40, y2: 150, color: 'gray', label: approach ? '近づける' : '遠ざける' },
      wire([[150, 130], [150, 200], [169, 200]]),
      wire([[222, 130], [222, 200], [201, 200]]),
      { type: 'circle', x: 185, y: 200, r: 16, fill: 'white', label: 'G' },
      note(185, 234, '検流計'),
    ];
  }

  // 2 種類の電流の波形（上 ア: 向きが変わらない、下 イ: 向きが周期的に変わる）
  function wavesItems(withRegions) {
    const ac = [];
    for (let k = 0; k <= 60; k++) ac.push([60 + k * 4, Math.round((180 - 34 * Math.sin(k * Math.PI / 12)) * 10) / 10]);
    const items = [
      { type: 'line', points: [[60, 70], [306, 70]], color: 'gray', width: 1, arrow: true },
      { type: 'line', points: [[60, 110], [60, 20]], color: 'gray', width: 1 },
      { type: 'line', points: [[60, 40], [300, 40]], color: 'blue', width: 3 },
      { type: 'line', points: [[60, 180], [306, 180]], color: 'gray', width: 1, arrow: true },
      { type: 'line', points: [[60, 226], [60, 134]], color: 'gray', width: 1 },
      { type: 'line', points: ac, color: 'blue', width: 3 },
      { type: 'text', x: 306, y: 88, text: '時間', size: 12, anchor: 'end' },
      { type: 'text', x: 306, y: 236, text: '時間', size: 12, anchor: 'end' },
    ];
    if (withRegions) items.push({ type: 'region', id: 'r1', x: 28, y: 60, r: 22, label: 'ア' }, { type: 'region', id: 'r2', x: 28, y: 180, r: 22, label: 'イ' });
    return items;
  }

  const elecMp16 = {
    id: 'electricity-mp16', areaId: 'el-miniprint', title: 'プリント 16: 電磁誘導と直流・交流', minutes: 6, concepts: ['el-induction'],
    lessons: [
      {
        id: 'electricity-mp16-c1',
        anim: 'el-induction',   // 動く図の使い回し（js/anim-physics.js）。figure は静止図として残す
        text: 'コイルの中の磁界が変化すると、コイルに電流が流れます。この現象を**電磁誘導**、流れる電流を**誘導電流**といいます。磁石を近づけるときと遠ざけるとき、N 極と S 極では、電流の向きが逆になります。磁石を止めると電流は流れません。',
        figure: scene(inductionItems('N', true).concat([note(268, 140, '針がふれる', 12)])),
      },
      {
        id: 'electricity-mp16-c2',
        anim: 'el-dc-ac',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '**発電機**は電磁誘導で電流をとり出す装置です。乾電池の電流のように向きが変わらない電流を**直流**、コンセントの電流のように向きが周期的に変わる電流を**交流**といいます。交流が 1 秒間にくり返す変化の回数を**周波数**（Hz）といいます。',
        figure: scene(wavesItems(false).concat([
          { type: 'text', x: 66, y: 32, text: '直流（乾電池）', size: 12 },
          { type: 'text', x: 66, y: 140, text: '交流（コンセント）', size: 12, bg: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'electricity-mp16-w1', concept: 'el-induction',
      prompt: '予想しよう。電池をつないでいないコイルに、棒磁石を出し入れすると、つないだ検流計の針はどうなると思う？',
      options: ['ふれる', 'ふれない', 'こわれる'],
      answer: 'a',
      explanation: 'コイルの中の磁界が変化すると、電池がなくても電流（誘導電流）が流れ、検流計の針がふれます。',
      hint: '発電機は、どうやって電流をつくっているかな。',
    }),
    problems: [
      fill({
        id: 'electricity-mp16-t1', concept: 'el-induction', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '乾電池の電流のように、向きが変わらない電流を[b1]という。家庭のコンセントの電流のように、向きが周期的に変わる電流を[b2]という。',
        blanks: [
          word('b1', ['直流', '交流'], '直流'),
          word('b2', ['直流', '交流'], '交流'),
        ],
        explanation: '向きが変わらない電流が**直流**、向きが周期的に変わる電流が**交流**です。',
        hint: '「直」はまっすぐ、「交」は入れかわるという意味だよ。',
      }),
      figureChoice({
        id: 'electricity-mp16-p1', concept: 'el-induction',
        prompt: '2 種類の電流の時間による変化を表した図です。交流を表しているのは、ア・イのどちら？',
        figure: scene(wavesItems(true)),
        answer: 'r2',
        explanation: 'イは、電流の向き（＋と−）が周期的に入れかわっているので交流です。アは向きも大きさも変わらない直流です。',
        hint: '線が 0 の上と下を行ったり来たりしているのはどちらかな。',
      }),
      choice({
        id: 'electricity-mp16-p2', concept: 'el-induction',
        prompt: 'コイルに棒磁石の N 極を近づけると、検流計の針は左にふれました。N 極を遠ざけると、針はどうなる？',
        figure: scene(inductionItems('N', false)),
        options: ['右にふれる', '左にふれる', 'ふれない'],
        answer: 'a',
        explanation: '近づけるときと遠ざけるときでは、コイルの中の磁界の変化が逆になるので、誘導電流の向きも逆になり、針は右にふれます。',
        hint: '近づける・遠ざけるを逆にすると、電流の向きは？',
      }),
      choice({
        id: 'electricity-mp16-p3', concept: 'el-induction',
        prompt: 'N 極を近づけると針が左にふれるコイルに、S 極を近づけると、針はどうなる？',
        figure: scene(inductionItems('S', true)),
        options: ['右にふれる', '左にふれる', 'ふれない'],
        answer: 'a',
        explanation: '極を N から S に変えると、磁界の向きが逆になるので、誘導電流の向きも逆になり、針は右にふれます。',
        hint: '近づける極を逆にすると、電流の向きは？',
      }),
      choice({
        id: 'electricity-mp16-p4', concept: 'el-induction',
        prompt: 'N 極を近づけると針が左にふれるコイルから、S 極を遠ざけると、針はどうなる？',
        figure: scene(inductionItems('S', false)),
        options: ['左にふれる', '右にふれる', 'ふれない'],
        answer: 'a',
        explanation: '極を逆（S 極）にし、さらに動かし方も逆（遠ざける）にしたので、逆が 2 回で、もとと同じ左にふれます。',
        hint: '「逆」を 2 回くり返すと、どうなるかな。',
      }),
      choice({
        id: 'electricity-mp16-p5', concept: 'el-induction',
        prompt: '棒磁石の S 極をコイルの中に入れたまま、動かさずにおきました。電流はどうなる？',
        options: ['流れない', '右向きに流れ続ける', '左向きに流れ続ける'],
        answer: 'a',
        explanation: '磁石が止まっていると、コイルの中の磁界が変化しないので、誘導電流は流れません。',
        hint: '電磁誘導は、磁界が「変化」するときに起こるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'electricity-mp16-r1', concept: 'el-induction',
        prompt: 'コイルに磁石を近づけたり遠ざけたりすると、コイルに電流が流れます。この現象を何という？',
        options: ['電磁誘導', '真空放電', '静電気'],
        answer: 'a',
        explanation: 'コイルの中の磁界が変化して電流が流れる現象を**電磁誘導**といいます。',
        hint: '磁界の変化で電流が「誘導」される現象だよ。',
      }),
      choice({
        id: 'electricity-mp16-r2', concept: 'el-induction',
        prompt: '電磁誘導によってコイルに流れる電流を何という？',
        options: ['誘導電流', '直流', '陰極線'],
        answer: 'a',
        explanation: '電磁誘導で流れる電流を**誘導電流**といいます。',
        hint: '「誘導」で生じた「電流」だよ。',
      }),
      choice({
        id: 'electricity-mp16-r3', concept: 'el-induction',
        prompt: '電磁誘導を利用して、電流をとり出す装置はどれ？',
        options: ['発電機', 'モーター', '電熱線'],
        answer: 'a',
        explanation: '発電機は、コイルのそばで磁石を回すなどして磁界を変化させ、電磁誘導で電流をとり出します。',
        hint: '発電所にある装置だよ。',
      }),
      choice({
        id: 'electricity-mp16-r4', concept: 'el-induction',
        prompt: '誘導電流を大きくする方法として正しいものはどれ？',
        options: ['磁力の強い磁石を使い、速く動かす', '磁石をコイルの中で止めておく', 'コイルの巻数を少なくする'],
        answer: 'a',
        explanation: '磁力の強い磁石を使う、磁石を速く動かす、コイルの巻数を多くすると、誘導電流は大きくなります。',
        hint: 'コイルの中の磁界の変化を、大きく・速くしよう。',
      }),
      choice({
        id: 'electricity-mp16-r5', concept: 'el-induction',
        prompt: '乾電池とコンセントのうち、交流の電流をとり出せるのはどちら？',
        options: ['コンセント', '乾電池'],
        answer: 'a',
        explanation: '家庭のコンセントからは交流が、乾電池からは直流がとり出せます。',
        hint: '発電所から送られてくる電流だよ。',
      }),
      choice({
        id: 'electricity-mp16-r6', concept: 'el-induction',
        prompt: '交流で、電流の向きの変化が 1 秒間にくり返される回数を何という？',
        options: ['周波数', '電力', '振幅'],
        answer: 'a',
        explanation: '交流が 1 秒間にくり返す変化の回数を**周波数**といい、単位はヘルツ（Hz）です。',
        hint: '単位は Hz（ヘルツ）だよ。',
      }),
      choice({
        id: 'electricity-mp16-r7', concept: 'el-induction',
        prompt: '棒磁石がコイルの中で止まっているとき、検流計の針がふれないのはなぜ？',
        options: ['コイルの中の磁界が変化しないから', '磁石の磁力がなくなるから', 'コイルの抵抗が大きくなるから'],
        answer: 'a',
        explanation: '誘導電流は、コイルの中の磁界が変化するときだけ流れます。磁石が止まっていると磁界は変化しません。',
        hint: '電磁誘導が起こる条件を思い出そう。',
      }),
      figureChoice({
        id: 'electricity-mp16-r8', concept: 'el-induction',
        prompt: '2 種類の電流の時間による変化を表した図です。直流を表しているのは、ア・イのどちら？',
        figure: scene(wavesItems(true)),
        answer: 'r1',
        explanation: 'アは、向きも大きさも変わらない電流なので直流です。乾電池の電流がこの形です。',
        hint: '線がずっと同じ高さのままなのはどちらかな。',
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
        // ---- ここから、ミニプリント（electricity-mp5・mp7）の計算ドリルで、ステージに入りきらなかったもの ----
        fill({
          id: 'el-ohm-k4', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '12 V の電圧を加えると 3.0 A の電流が流れる抵抗は[b1]である。',
          blanks: [number('b1', 4, 0, 'Ω')],
          explanation: '抵抗＝電圧÷電流 なので、12 ÷ 3.0 ＝ 4 Ω です。',
          hint: 'R ＝ V ÷ I を使おう。',
        }),
        fill({
          id: 'el-ohm-k5', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '10 Ω の抵抗に 2.5 A の電流が流れているとき、加わる電圧は[b1]である。',
          blanks: [number('b1', 25, 0, 'V')],
          explanation: '電圧＝抵抗×電流 なので、10 × 2.5 ＝ 25 V です。',
          hint: 'V ＝ R × I を使おう。',
        }),
        fill({
          id: 'el-ohm-k6', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '6 V の電圧を加えると 200 mA の電流が流れる抵抗は[b1]である。',
          blanks: [number('b1', 30, 0, 'Ω')],
          explanation: '200 mA ＝ 0.2 A なので、6 ÷ 0.2 ＝ 30 Ω です。',
          hint: 'mA を A になおしてから計算しよう。',
        }),
        fill({
          id: 'el-ohm-k7', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '20 Ω の抵抗に 40 mA の電流が流れているとき、加わる電圧は[b1]である。',
          blanks: [number('b1', 0.8, 0, 'V')],
          explanation: '40 mA ＝ 0.04 A なので、20 × 0.04 ＝ 0.8 V です。',
          hint: 'mA を A になおしてから計算しよう。',
        }),
        fill({
          id: 'el-ohm-k8', concept: 'el-ohm',
          prompt: '15 Ω と 25 Ω の抵抗を直列につなぎ、6 V の電圧を加えました。空らんに入る数を入れよう。',
          text: '全体の抵抗は[b1]、電流は[b2]、15 Ω に加わる電圧は[b3]、25 Ω に加わる電圧は[b4]である。',
          blanks: [number('b1', 40, 0, 'Ω'), number('b2', 0.15, 0, 'A'), number('b3', 2.25, 0, 'V'), number('b4', 3.75, 0, 'V')],
          explanation: '全体の抵抗は 15 ＋ 25 ＝ 40 Ω、電流は 6 ÷ 40 ＝ 0.15 A です。15 × 0.15 ＝ 2.25 V、25 × 0.15 ＝ 3.75 V です。',
          hint: '全体の抵抗 → 電流 → 各部分の電圧の順に求めよう。',
        }),
        fill({
          id: 'el-ohm-k9', concept: 'el-ohm',
          prompt: '15 Ω と 25 Ω の抵抗を並列につなぎ、12 V の電圧を加えました。空らんに入る数を入れよう。',
          text: '15 Ω に流れる電流は[b1]、25 Ω に流れる電流は[b2]、全体の電流は[b3]である。',
          blanks: [number('b1', 0.8, 0, 'A'), number('b2', 0.48, 0, 'A'), number('b3', 1.28, 0, 'A')],
          explanation: 'どちらにも 12 V が加わるので、12 ÷ 15 ＝ 0.8 A、12 ÷ 25 ＝ 0.48 A、全体は和の 1.28 A です。',
          hint: '並列では、どの抵抗にも電源と同じ電圧が加わるよ。',
        }),
        fill({
          id: 'el-ohm-k10', concept: 'el-ohm',
          prompt: '15 Ω と 25 Ω の並列回路に 12 V を加えると、全体の電流は 1.28 A でした。小数第 2 位を四捨五入して答えよう。',
          text: '回路全体の抵抗は[b1]である。',
          blanks: [number('b1', 9.4, 0, 'Ω')],
          explanation: '全体の抵抗＝12 ÷ 1.28 ＝ 9.375 なので、四捨五入して 9.4 Ω です。15 Ω より小さくなっています。',
          hint: '全体の抵抗は、電源の電圧÷全体の電流だよ。',
        }),
        fill({
          id: 'el-ohm-k11', concept: 'el-ohm',
          prompt: '12 Ω と 10 Ω の並列回路に 6 V を加えると、全体の電流は 1.1 A でした。小数第 2 位を四捨五入して答えよう。',
          text: '回路全体の抵抗は[b1]である。',
          blanks: [number('b1', 5.5, 0, 'Ω')],
          explanation: '全体の抵抗＝6 ÷ 1.1 ＝ 5.45… なので、四捨五入して 5.5 Ω です。',
          hint: '全体の抵抗は、電源の電圧÷全体の電流だよ。',
        }),
        fill({
          id: 'el-ohm-k12', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '8 V の電圧を加えると 0.5 A の電流が流れる抵抗は[b1]である。',
          blanks: [number('b1', 16, 0, 'Ω')],
          explanation: '抵抗＝電圧÷電流 なので、8 ÷ 0.5 ＝ 16 Ω です。',
          hint: 'R ＝ V ÷ I を使おう。',
        }),
        fill({
          id: 'el-ohm-k13', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '10 Ω の抵抗に 4.0 A の電流が流れているとき、加わる電圧は[b1]である。',
          blanks: [number('b1', 40, 0, 'V')],
          explanation: '電圧＝抵抗×電流 なので、10 × 4.0 ＝ 40 V です。',
          hint: 'V ＝ R × I を使おう。',
        }),
        fill({
          id: 'el-ohm-k14', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '40 Ω の抵抗に 0.2 A の電流が流れているとき、加わる電圧は[b1]である。',
          blanks: [number('b1', 8, 0, 'V')],
          explanation: '電圧＝40 × 0.2 ＝ 8 V です。',
          hint: 'V ＝ R × I を使おう。',
        }),
        fill({
          id: 'el-ohm-k15', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '6 V の電圧を加えると 100 mA の電流が流れる抵抗は[b1]である。',
          blanks: [number('b1', 60, 0, 'Ω')],
          explanation: '100 mA ＝ 0.1 A なので、6 ÷ 0.1 ＝ 60 Ω です。',
          hint: 'mA を A になおしてから計算しよう。',
        }),
        fill({
          id: 'el-ohm-k16', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '8 V の電圧を加えると 2.0 A の電流が流れる抵抗は[b1]である。',
          blanks: [number('b1', 4, 0, 'Ω')],
          explanation: '抵抗＝8 ÷ 2.0 ＝ 4 Ω です。',
          hint: 'R ＝ V ÷ I を使おう。',
        }),
        fill({
          id: 'el-ohm-k17', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '12 V の電圧を加えると 2.0 A の電流が流れる抵抗は[b1]である。',
          blanks: [number('b1', 6, 0, 'Ω')],
          explanation: '抵抗＝12 ÷ 2.0 ＝ 6 Ω です。',
          hint: 'R ＝ V ÷ I を使おう。',
        }),
        fill({
          id: 'el-ohm-k18', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '5 Ω の抵抗に 20 V の電圧を加えると、流れる電流は[b1]である。',
          blanks: [number('b1', 4, 0, 'A')],
          explanation: '電流＝電圧÷抵抗 なので、20 ÷ 5 ＝ 4 A です。',
          hint: 'I ＝ V ÷ R を使おう。',
        }),
        fill({
          id: 'el-ohm-k19', concept: 'el-ohm',
          prompt: '空らんに入る数を入れよう。',
          text: '40 Ω の抵抗に 0.8 A の電流が流れているとき、加わる電圧は[b1]である。',
          blanks: [number('b1', 32, 0, 'V')],
          explanation: '電圧＝40 × 0.8 ＝ 32 V です。',
          hint: 'V ＝ R × I を使おう。',
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
        // ---- ここから、ミニプリント（electricity-mp12「陰極線」）の問題 ----
        choice({
          id: 'el-static-k4', concept: 'el-static',
          prompt: '空気をぬいた放電管に高い電圧を加えると、−極から光のすじが出ます。この光のすじを何という？',
          options: ['陰極線（電子線）', '磁力線', '誘導電流'],
          answer: 'a',
          explanation: '−極（陰極）から出る光のすじを陰極線（電子線）といいます。正体は電子の流れです。',
          hint: '−極は「陰極」ともいうね。',
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
    // ---- ミニプリントで足した概念 ----
    {
      id: 'el-motor', title: '電流が磁界から受ける力・モーター', basic: 'el-magnet', lessonStageId: 'electricity-mp15',
      checkPool: [
        choice({
          id: 'el-motor-k1', concept: 'el-motor',
          prompt: 'モーターの整流子のはたらきとして正しいものはどれ？',
          options: ['コイルが半回転するごとに電流の向きを切りかえる', '電流を大きくする', '磁石の極を入れかえる'],
          answer: 'a',
          explanation: '整流子は、コイルが半回転するごとにコイルに流れる電流の向きを切りかえます。そのため、コイルは同じ向きに回り続けます。',
          hint: '同じ向きに回り続けるためのしくみだよ。',
        }),
        choice({
          id: 'el-motor-k2', concept: 'el-motor',
          prompt: 'モーターをより速く（強く）回すにはどうすればよい？',
          options: ['コイルに流す電流を大きくする', '電流の向きを逆にする', '磁石を弱いものにかえる'],
          answer: 'a',
          explanation: '電流を大きくしたり、磁石を強くしたり、コイルの巻数を多くしたりすると、コイルが受ける力が大きくなり、速く回ります。',
          hint: '電流が受ける力を大きくする方法を考えよう。',
        }),
        choice({
          id: 'el-motor-k3', concept: 'el-motor',
          prompt: 'フレミングの左手の法則で、親指が表しているのはどれ？',
          options: ['導線が受ける力の向き', '電流の向き', '磁界の向き'],
          answer: 'a',
          explanation: '中指が電流、人さし指が磁界、親指が力の向きです。',
          hint: '「電・磁・力」の順に、中指・人さし指・親指だよ。',
        }),
      ],
    },
    {
      id: 'el-induction', title: '電磁誘導と直流・交流', basic: 'el-magnet', lessonStageId: 'electricity-mp16',
      checkPool: [
        choice({
          id: 'el-induction-k1', concept: 'el-induction',
          prompt: '乾電池から流れる電流はどれ？',
          options: ['直流', '交流', '誘導電流'],
          answer: 'a',
          explanation: '乾電池の電流は、向きも大きさも変わらない直流です。',
          hint: '向きが変わらない電流だよ。',
        }),
        choice({
          id: 'el-induction-k2', concept: 'el-induction',
          prompt: 'コイルの巻数を多くして、同じように磁石を動かしました。誘導電流はどうなる？',
          options: ['大きくなる', '小さくなる', '変わらない'],
          answer: 'a',
          explanation: 'コイルの巻数を多くするほど、誘導電流は大きくなります。',
          hint: '巻数が多いと、磁界の変化を受ける導線が増えるね。',
        }),
        choice({
          id: 'el-induction-k3', concept: 'el-induction',
          prompt: 'コイルに棒磁石をゆっくり近づけたときと、速く近づけたときでは、誘導電流が大きいのはどちら？',
          options: ['速く近づけたとき', 'ゆっくり近づけたとき', 'どちらも同じ'],
          answer: 'a',
          explanation: '磁界が速く変化するほど、誘導電流は大きくなります。',
          hint: 'コイルの中の磁界の変化の速さを考えよう。',
        }),
      ],
    },
    {
      id: 'el-radiation', title: '放射線の性質と利用', basic: null, lessonStageId: 'electricity-mp12',
      checkPool: [
        choice({
          id: 'el-radiation-k1', concept: 'el-radiation',
          prompt: 'ベクレル（Bq）は、何の大きさを表す単位？',
          options: ['放射性物質の放射能の強さ', '放射線が人体にあたえる影響', '電流の大きさ'],
          answer: 'a',
          explanation: 'ベクレル（Bq）は放射能の強さ、シーベルト（Sv）は人体への影響の大きさを表す単位です。',
          hint: 'シーベルトではないほうの単位だよ。',
        }),
        choice({
          id: 'el-radiation-k2', concept: 'el-radiation',
          prompt: '放射線の性質として正しいものはどれ？',
          options: ['目に見えず、物質を通りぬける性質がある', '目に見える明るい光である', '磁石に引きつけられる金属である'],
          answer: 'a',
          explanation: '放射線は目に見えず、物質を通りぬける性質（透過性）があります。この性質がレントゲン検査などに利用されています。',
          hint: 'レントゲン検査では、からだの中が写るね。',
        }),
        choice({
          id: 'el-radiation-k3', concept: 'el-radiation',
          prompt: '放射線の利用例として正しいものはどれ？',
          options: ['がんの治療や農作物の品種改良', '電気ポットでお湯をわかす', '方位磁針で方位を知る'],
          answer: 'a',
          explanation: '放射線は、医療（がんの治療・検査）、農業（品種改良）、工業（製品の内部の検査）などに利用されています。',
          hint: '医療や農業での利用を思い出そう。',
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
      { id: 'el-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [
        elecMp1, elecMp2, elecMp3, elecMp4, elecMp5, elecMp6, elecMp7, elecMp8,
        elecMp9, elecMp10, elecMp11, elecMp12, elecMp13, elecMp14, elecMp15, elecMp16,
      ] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
