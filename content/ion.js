// 「化学変化とイオン」教材データ（中学3年 理科・化学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（水溶液とイオン: 電解質とイオン・電気分解と電池 / 酸・アルカリと中和: 酸とアルカリ・中和と塩）と、概念 6 つ。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// drag の位置は部品の基準点（circle は中心）で判定する（js/ui-problems.js の anchorOf）。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
// イオン式は上付き文字が使えないので「Na+」「Cl-」「Cu2+」のように書く（下付きの数字 H₂O・CuCl₂ はそのまま）。
// イオンのモデルの色: H+ 桃、Na+ 黄、Cu2+ うすい茶、Zn2+ ガラス色、Cl- うすい緑、OH- 水色（ION_FILL の表）。
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

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/ion/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/ion/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // ---- 図の部品をまとめる道具 ----

  // イオンのモデルの塗り（イオン式 → 色トークンか色コード）。文字が読めるよう、うすい色だけを使う
  const ION_FILL = { 'H+': 'pink', 'Na+': 'yellow', 'Cu2+': '#F5C9A6', 'Zn2+': 'glass', 'Cl-': 'lightgreen', 'OH-': 'sky' };

  // イオン式を書いたイオンの丸（16px の文字が収まるよう、4 文字は r 23、3 文字以下は r 19）
  function ion(x, y, name, r) {
    return { type: 'circle', x, y, r: r || (name.length >= 4 ? 23 : 19), fill: ION_FILL[name] || 'white', stroke: 'ink', label: name };
  }

  // 原子のモデルの粒（陽子 ＋、中性子、電子 −）
  function proton(x, y) { return { type: 'circle', x, y, r: 11, fill: 'pink', stroke: 'ink', label: '＋' }; }
  function neutron(x, y) { return { type: 'circle', x, y, r: 11, fill: 'glass', stroke: 'ink' }; }
  function electron(x, y, r) { return { type: 'circle', x, y, r: r || 11, fill: 'sky', stroke: 'blue', label: '−' }; }

  // ヘリウム原子のモデル（中心 (110, 125)、電子の通り道 r 72）。陽子 2・中性子 2・電子 2
  function heliumItems() {
    return [
      { type: 'circle', x: 110, y: 125, r: 72, fill: 'none', stroke: 'gray' },
      proton(99, 114), neutron(121, 114), neutron(99, 136), proton(121, 136),
      electron(110, 53), electron(110, 197),
    ];
  }

  // 電流が流れるかを調べる装置（cx は中央。電池は左、豆電球は右の縦の導線に入れる）。lit なら豆電球が光る
  function conductItems(cx, lit) {
    const items = [
      { type: 'beaker', x: cx, y: 195, width: 110, height: 90, level: 0.65 },
      { type: 'rect', x: cx - 29, y: 90, width: 8, height: 95, fill: 'gray' },
      { type: 'rect', x: cx + 21, y: 90, width: 8, height: 95, fill: 'gray' },
      { type: 'line', points: [[cx - 25, 75], [cx - 25, 90]], width: 2 },
      { type: 'line', points: [[cx - 25, 35], [cx - 25, 25], [cx + 25, 25], [cx + 25, 35]], width: 2 },
      { type: 'line', points: [[cx + 25, 75], [cx + 25, 90]], width: 2 },
      { type: 'symbol', x: cx - 25, y: 55, kind: 'battery', rotate: 90 },
    ];
    if (lit) items.push({ type: 'circle', x: cx + 25, y: 55, r: 19, fill: 'yellow', stroke: 'none' });
    items.push({ type: 'symbol', x: cx + 25, y: 55, kind: 'bulb', rotate: 90 });
    return items;
  }

  // 塩化銅水溶液などの電気分解の装置。電源は上（横向きの電池は左が＋極）なので、
  // 左の電極（中心 x 110）が陽極、右の電極（中心 x 210）が陰極。liquid は水溶液の色
  function electrolysisItems(liquid) {
    return [
      { type: 'beaker', x: 160, y: 215, width: 180, height: 120, level: 0.7, liquid },
      { type: 'rect', x: 104, y: 70, width: 12, height: 130, fill: 'gray' },
      { type: 'rect', x: 204, y: 70, width: 12, height: 130, fill: 'gray' },
      { type: 'line', points: [[110, 70], [110, 40], [140, 40]], width: 2 },
      { type: 'line', points: [[180, 40], [210, 40], [210, 70]], width: 2 },
      { type: 'symbol', x: 160, y: 40, kind: 'battery' },
      { type: 'text', x: 146, y: 20, text: '＋', size: 14, anchor: 'middle' },
      { type: 'text', x: 174, y: 20, text: '−', size: 14, anchor: 'middle' },
    ];
  }

  // ダニエル電池。ビーカーをセロハン（x 160 の点線）で分け、左は硫酸亜鉛水溶液に亜鉛板（中心 x 86）、
  // 右は硫酸銅水溶液に銅板（中心 x 234）。上の導線（y 50）の中央にモーター
  function daniellItems() {
    return [
      { type: 'beaker', x: 160, y: 215, width: 220, height: 110, level: 0 },
      { type: 'rect', x: 52, y: 130, width: 107, height: 83, fill: 'glass', stroke: 'none' },
      { type: 'rect', x: 161, y: 130, width: 107, height: 83, fill: 'sky', stroke: 'none' },
      { type: 'line', points: [[160, 118], [160, 212]], color: 'gray', width: 3, dashed: true },
      { type: 'rect', x: 80, y: 90, width: 12, height: 110, fill: 'rock' },
      { type: 'rect', x: 228, y: 90, width: 12, height: 110, fill: 'brown' },
      { type: 'line', points: [[86, 90], [86, 50], [140, 50]], width: 2 },
      { type: 'line', points: [[180, 50], [234, 50], [234, 90]], width: 2 },
      { type: 'symbol', x: 160, y: 50, kind: 'motor' },
      { type: 'text', x: 160, y: 26, text: 'モーター', size: 12, anchor: 'middle' },
      { type: 'text', x: 50, y: 86, text: '亜鉛板', size: 12, anchor: 'middle' },
      { type: 'text', x: 272, y: 86, text: '銅板', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 104, text: 'セロハン', size: 12, anchor: 'middle' },
      { type: 'text', x: 105, y: 234, text: '硫酸亜鉛水溶液', size: 12, anchor: 'middle' },
      { type: 'text', x: 215, y: 234, text: '硫酸銅水溶液', size: 12, anchor: 'middle' },
    ];
  }

  // 青色・赤色のリトマス紙の色（理科の色として使う）
  const BLUE_LITMUS = '#8FB4F0';

  // 中和のモデルの枠 3 つ（左上 x 8・112・216、幅 96、高さ 126）。frames は枠ごとのイオン式の配列（2 列で上から並べる）、
  // tints は枠の塗り（null なら白）
  function modelFrames(frames, tints) {
    const items = [];
    frames.forEach((names, i) => {
      const left = 8 + 104 * i;
      items.push({ type: 'rect', x: left, y: 36, width: 96, height: 126, rx: 6, fill: (tints && tints[i]) || 'white' });
      names.forEach((name, j) => items.push(ion(left + 26 + 44 * (j % 2), 60 + 40 * Math.floor(j / 2), name)));
    });
    return items;
  }

  // イオンの数の小さなグラフ 3 つ（左下 x 20・120・220、y 160）。kinds は 'up'（増える）・'flat'（変わらない）・
  // 'down'（減って 0 になり、そのまま）・'late'（0 のまま、途中から増える）
  function miniGraphs(kinds) {
    const items = [
      { type: 'text', x: 160, y: 22, text: '縦軸 … イオンの数', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 40, text: '横軸 … 加えた水酸化ナトリウム水溶液の量', size: 12, anchor: 'middle' },
    ];
    kinds.forEach((kind, i) => {
      const x0 = 20 + 100 * i;
      items.push({ type: 'line', points: [[x0, 60], [x0, 160], [x0 + 80, 160]], width: 2 });
      const pts = {
        up: [[x0, 160], [x0 + 76, 70]],
        flat: [[x0, 110], [x0 + 76, 110]],
        down: [[x0, 100], [x0 + 40, 160], [x0 + 76, 160]],
        late: [[x0, 160], [x0 + 40, 160], [x0 + 76, 110]],
      }[kind];
      items.push({ type: 'line', points: pts, color: 'blue', width: 3 });
    });
    return items;
  }

  // 水素イオンの数のグラフの横軸の座標（加えた水酸化ナトリウム水溶液の量 v〔cm³〕、0〜20 cm³ を x 60〜290）
  const volX = (v) => 60 + 11.5 * v;

  // ================================================================
  // 領域 1: 水溶液とイオン
  // ================================================================

  // ---- ステージ ion-1: 電解質とイオン（電解質と非電解質、原子の構造、イオン、電離） ----
  const ion1 = {
    id: 'ion-1', areaId: 'io-ion', title: '電解質とイオン', minutes: 5, concepts: ['io-electrolyte', 'io-structure'],
    lessons: [
      {
        id: 'ion-1-c1',
        text: '水にとかしたとき、水溶液に電流が流れる物質を**電解質**、流れない物質を**非電解質**といいます。塩化ナトリウム・塩化銅・塩化水素・水酸化ナトリウムは電解質、砂糖・エタノールは非電解質です。純粋な水（精製水）には、電流がほとんど流れません。',
        // 食塩水では豆電球がつき、砂糖水ではつかない
        figure: scene(conductItems(80, true).concat(conductItems(240, false), [
          { type: 'text', x: 80, y: 216, text: '食塩水', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 216, text: '砂糖水', size: 13, anchor: 'middle' },
          { type: 'text', x: 80, y: 234, text: '電流が流れる', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 234, text: '電流が流れない', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-1-c2',
        text: '原子は、中心にある**原子核**と、そのまわりの**電子**からできています。原子核は、＋の電気をもつ**陽子**と、電気をもたない**中性子**からできています（ふつうの水素原子には中性子がありません）。電子は−の電気をもちます。陽子と電子の数は等しいので、原子全体は電気を帯びていません。',
        // ヘリウム原子のモデルと、粒の名前
        figure: scene(heliumItems().concat([
          { type: 'text', x: 110, y: 24, text: 'ヘリウム原子のモデル', size: 13, anchor: 'middle' },
          { type: 'text', x: 136, y: 160, text: '原子核', size: 12 },
          proton(220, 80),
          { type: 'text', x: 238, y: 85, text: '陽子（＋）', size: 13 },
          neutron(220, 125),
          { type: 'text', x: 238, y: 130, text: '中性子', size: 13 },
          electron(220, 170),
          { type: 'text', x: 238, y: 175, text: '電子（−）', size: 13 },
          { type: 'text', x: 160, y: 232, text: '陽子の数 ＝ 電子の数', size: 13, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-1-c3',
        anim: 'io-ion-formation',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '原子が電子を失ったり受け取ったりして、電気を帯びたものを**イオン**といいます。電子を失って＋の電気を帯びたものが**陽イオン**（Na+、Cu2+、H+）、電子を受け取って−の電気を帯びたものが**陰イオン**（Cl-）です。OH- のように、いくつかの原子のまとまりがイオンになるものもあります。',
        // ナトリウム原子 → ナトリウムイオン、塩素原子 → 塩化物イオン
        figure: scene([
          { type: 'circle', x: 50, y: 70, r: 20, fill: 'white', stroke: 'ink', label: 'Na' },
          { type: 'arrow', x1: 80, y1: 70, x2: 168, y2: 70, color: 'gray' },
          { type: 'text', x: 124, y: 50, text: '電子を 1 個失う', size: 12, anchor: 'middle' },
          { type: 'circle', x: 124, y: 88, r: 10, fill: 'sky', stroke: 'blue', label: 'e-' },
          ion(200, 70, 'Na+', 20),
          { type: 'text', x: 232, y: 76, text: '陽イオン', size: 14, bold: true },
          { type: 'text', x: 50, y: 110, text: 'ナトリウム原子', size: 12, anchor: 'middle' },
          { type: 'text', x: 200, y: 110, text: 'ナトリウムイオン', size: 12, anchor: 'middle' },
          { type: 'circle', x: 50, y: 170, r: 20, fill: 'white', stroke: 'ink', label: 'Cl' },
          { type: 'arrow', x1: 80, y1: 170, x2: 168, y2: 170, color: 'gray' },
          { type: 'text', x: 124, y: 150, text: '電子を 1 個受け取る', size: 12, anchor: 'middle' },
          { type: 'circle', x: 124, y: 188, r: 10, fill: 'sky', stroke: 'blue', label: 'e-' },
          ion(200, 170, 'Cl-', 20),
          { type: 'text', x: 232, y: 176, text: '陰イオン', size: 14, bold: true },
          { type: 'text', x: 50, y: 212, text: '塩素原子', size: 12, anchor: 'middle' },
          { type: 'text', x: 200, y: 212, text: '塩化物イオン', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 236, text: '（e- は電子）', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-1-c4',
        anim: 'io-dissociation',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '電解質が水にとけて、陽イオンと陰イオンに分かれることを**電離**といいます。NaCl → Na+ ＋ Cl-、HCl → H+ ＋ Cl-、CuCl₂ → Cu2+ ＋ 2Cl- のように表します。非電解質は、水にとけても電離しないので、電流が流れません。',
        // 塩化ナトリウム水溶液の中の Na+ と Cl-
        figure: scene([
          { type: 'text', x: 160, y: 30, text: 'NaCl → Na+ ＋ Cl-', size: 16, anchor: 'middle', bold: true },
          { type: 'beaker', x: 160, y: 215, width: 220, height: 150, level: 0.75 },
          ion(85, 135, 'Na+'), ion(160, 135, 'Cl-'), ion(235, 135, 'Na+'),
          ion(100, 185, 'Cl-'), ion(170, 185, 'Na+'), ion(240, 185, 'Cl-'),
          { type: 'text', x: 160, y: 236, text: '塩化ナトリウム水溶液', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-1-w1', concept: 'io-electrolyte',
      prompt: '予想しよう。食塩水と砂糖水に、それぞれ電極を入れて電池と豆電球につなぎました。豆電球がつくのはどちらだと思う？',
      options: ['食塩水だけ', '砂糖水だけ', 'どちらもつく'],
      answer: 'a',
      explanation: '食塩（塩化ナトリウム）は水にとけるとイオンに分かれるので、食塩水には電流が流れます。砂糖はイオンに分かれないので、砂糖水には電流が流れません。このステージで、そのわけを学ぼう。',
      hint: 'どちらも水にとけているけれど、とけ方にちがいがあるよ。',
    }),
    problems: [
      figureChoice({
        id: 'ion-1-p1', concept: 'io-structure',
        prompt: '図はヘリウム原子のモデルです。「＋」の印は＋の電気を、「−」の印は−の電気をもつ粒です。ア〜ウの線が指している粒のうち、中性子はどれ？',
        // ア → 外側の電子、ウ → 原子核の中の印のない粒（中性子）、イ → 原子核の中の ＋ の粒（陽子）
        figure: scene(heliumItems().concat([
          { type: 'line', points: [[60, 53], [98, 53]], color: 'gray', width: 2 },
          { type: 'line', points: [[230, 84], [131, 112]], color: 'gray', width: 2 },
          { type: 'line', points: [[230, 176], [131, 140]], color: 'gray', width: 2 },
          { type: 'region', id: 'r1', x: 36, y: 53, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 252, y: 180, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 252, y: 80, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '原子核は、＋の電気をもつ陽子と、電気をもたない中性子からできています。だから、原子核の中にある印のない粒（ウ）が中性子です。イは陽子、外側を回るアは−の電気をもつ電子です。',
        hint: '中性子は原子核の中にあって、電気をもたない粒だよ。',
      }),
      fill({
        id: 'ion-1-t1', concept: 'io-structure', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '原子の中心には[b1]があり、そのまわりに−の電気をもつ[b2]がある。',
        blanks: [
          word('b1', ['原子核', '陽子', '分子'], '原子核'),
          word('b2', ['電子', '陽子', '中性子'], '電子'),
        ],
        explanation: '原子の中心には**原子核**があり、そのまわりに−の電気をもつ**電子**があります。原子核は、陽子と中性子からできています。',
        hint: '陽子と中性子は、原子の中心のかたまりの中にあるよ。',
      }),
      choice({
        id: 'ion-1-p2', concept: 'io-electrolyte',
        prompt: '次のうち、水にとかすと水溶液に電流が流れる物質（電解質）はどれ？',
        options: ['砂糖', 'エタノール', '塩化銅', 'ブドウ糖'],
        answer: 'c',
        explanation: '塩化銅は水にとけると銅イオンと塩化物イオンに分かれるので、電解質です。砂糖・エタノール・ブドウ糖は水にとけてもイオンに分かれない非電解質です。',
        hint: '水にとけたとき、イオンに分かれるものをさがそう。',
      }),
      choice({
        id: 'ion-1-p3', concept: 'io-structure',
        prompt: '原子が電子を 1 個失うと、どうなる？',
        options: ['＋の電気を帯びた陽イオンになる', '−の電気を帯びた陰イオンになる', '電気を帯びないまま変わらない'],
        answer: 'a',
        explanation: '原子は陽子（＋）と電子（−）の数が等しく、全体では電気を帯びていません。−の電気をもつ電子を失うと＋の電気が多くなるので、陽イオンになります。',
        hint: '−の電気をもつものが減ると、全体はどちらの電気が多くなるかな。',
      }),
      fill({
        id: 'ion-1-p4', concept: 'io-electrolyte',
        prompt: '塩化銅が電離するようすを表す式です。空らんに入るものを選ぼう。',
        text: 'CuCl₂ → Cu2+ ＋ [b1]',
        blanks: [word('b1', ['2Cl-', 'Cl-', 'Cl₂'], '2Cl-')],
        explanation: '塩化銅 CuCl₂ には塩素が 2 個あるので、塩化物イオン Cl- が 2 個できます。銅イオン Cu2+ の＋2 と、Cl- 2 個の−2 で、電気の量がつり合っています。',
        hint: '化学式の Cl の右下の数を見よう。',
      }),
      choice({
        id: 'ion-1-p5', concept: 'io-electrolyte',
        prompt: '塩化ナトリウムの固体（結晶）に電極を当てて電流が流れるかを調べ、次に水にとかして調べました。結果はどうなる？',
        options: ['固体では流れず、水溶液では流れる', '固体でも水溶液でも流れる', '固体では流れ、水溶液では流れない'],
        answer: 'a',
        explanation: '塩化ナトリウムは、水にとけて電離するとイオンが水溶液の中を動けるようになり、電流が流れます。固体のままでは電流が流れません。電解質は「水にとかしたとき」に電流が流れる物質です。',
        hint: '電解質の説明にある「水にとかしたとき」に注目しよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-1-r1', concept: 'io-electrolyte',
        prompt: '水溶液に電流が流れるかを調べる実験で、調べる水溶液をかえるたびに、電極をどうする？',
        options: ['精製水で洗う', 'そのまま次の水溶液に入れる', '食塩水で洗う'],
        answer: 'a',
        explanation: '電極に前の水溶液が残っていると、次の水溶液に混ざって正しく調べられません。だから、調べるたびに精製水で洗います。精製水には電流がほとんど流れないので、結果に影響しません。',
        hint: '前の水溶液が混ざらないようにするには？',
      }),
      figureChoice({
        id: 'ion-1-r2', concept: 'io-electrolyte',
        prompt: 'ア 砂糖水、イ うすい塩酸、ウ エタノール水溶液 に、それぞれ電極を入れて電流が流れるかを調べました。電流が流れるのはア〜ウのどれ？',
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '電流が流れるのはどれ？', size: 14, anchor: 'middle' },
          { type: 'beaker', x: 60, y: 150, width: 70, height: 80, level: 0.6 },
          { type: 'beaker', x: 160, y: 150, width: 70, height: 80, level: 0.6 },
          { type: 'beaker', x: 260, y: 150, width: 70, height: 80, level: 0.6 },
          { type: 'text', x: 60, y: 172, text: '砂糖水', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 172, text: 'うすい塩酸', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 172, text: 'エタノール水溶液', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 60, y: 210, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 210, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 210, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '塩酸は塩化水素の水溶液で、塩化水素は水にとけると H+ と Cl- に電離するので、電流が流れます。砂糖とエタノールは非電解質なので、電流が流れません。',
        hint: '水にとけてイオンに分かれる物質がとけているのはどれかな。',
      }),
      choice({
        id: 'ion-1-r3', concept: 'io-structure',
        prompt: '塩素原子が陰イオン（塩化物イオン Cl-）になるとき、何が起こる？',
        options: ['電子を 1 個受け取る', '電子を 1 個失う', '陽子を 1 個受け取る'],
        answer: 'a',
        explanation: '−の電気をもつ電子を 1 個受け取ると、−の電気が多くなり、陰イオン Cl- になります。イオンになるとき、原子核の中の陽子の数は変わりません。',
        hint: 'イオン式の「-」は、−の電気が 1 つ多いという意味だよ。',
      }),
      choice({
        id: 'ion-1-r4', concept: 'io-structure',
        prompt: 'ふつうの原子で、数が必ず等しくなっているのはどれとどれ？',
        options: ['陽子と電子', '陽子と中性子', '中性子と電子'],
        answer: 'a',
        explanation: '原子では、＋の電気をもつ陽子と、−の電気をもつ電子の数が等しいので、全体として電気を帯びていません。中性子の数は、陽子の数と同じとは限りません。',
        hint: '原子全体が電気を帯びていないのは、なぜだったかな。',
      }),
      fill({
        id: 'ion-1-r5', concept: 'io-structure',
        prompt: '空らんに入る数を入れよう。',
        text: '銅原子が電子を[b1]個失うと、銅イオン Cu2+ になる。',
        blanks: [number('b1', 2, 0, '個')],
        explanation: 'Cu2+ の「2+」は、＋の電気が 2 つ多いという意味です。銅原子が電子を 2 個失うと、陽子の＋の電気が 2 つ多くなり、Cu2+ になります。',
        hint: 'イオン式の右上の数字を見よう。',
      }),
      choice({
        id: 'ion-1-t2', concept: 'io-electrolyte', term: true,
        prompt: '次の説明に合う言葉はどれ？「電解質が水にとけて、陽イオンと陰イオンに分かれること」',
        options: ['電離', '電気分解', '中和'],
        answer: 'a',
        explanation: '電解質が水にとけて、陽イオンと陰イオンに分かれることを**電離**といいます。たとえば塩化ナトリウムは NaCl → Na+ ＋ Cl- のように電離します。',
        hint: '電流を流さなくても、水にとけるだけで分かれるよ。',
      }),
    ],
  };

  // ---- ステージ ion-2: 電気分解と電池（塩化銅水溶液・塩酸の電気分解、イオンへのなりやすさ、ダニエル電池、電池の種類） ----
  const ion2 = {
    id: 'ion-2', areaId: 'io-ion', title: '電気分解と電池', minutes: 5, concepts: ['io-electrolysis', 'io-battery'],
    lessons: [
      {
        id: 'ion-2-c1',
        text: '電解質の水溶液に電流を流して物質を分けることを**電気分解**といいます。塩化銅水溶液では、陰極に赤色の**銅**が付き、陽極から刺激臭のある**塩素**が出ます。塩酸では、陰極から水素、陽極から塩素が出ます。陽イオンは陰極へ、陰イオンは陽極へ引かれます。',
        // 塩化銅水溶液の電気分解（写真: ビーカー (67〜245, 45〜235)、液面 y 82。左の炭素棒 (106〜126) は黒い導線につながり、
        // 下半分 (115〜200) に赤茶色の銅が付く。右の炭素棒 (196〜212) は赤い導線につながり、まわりに泡 (187〜225, 95〜200)。
        // 導線の色（黒＝−、赤＝＋）に合わせて、左を陰極、右を陽極とした。ビーカーの左右 (0〜65・248〜320) は白い余白）
        figure: scene([
          photo('ion-2-c1'),
          pointer(66, 96, 108, 70), tag(4, 100, '陰極（−）', { size: 13, bold: true, anchor: 'start' }),
          tag(4, 120, '黒い導線', { size: 13, anchor: 'start' }),
          pointer(60, 150, 106, 150), tag(33, 155, '銅が付く', { size: 13 }),
          pointer(254, 96, 213, 70), tag(316, 100, '陽極（＋）', { size: 13, bold: true, anchor: 'end' }),
          tag(316, 120, '赤い導線', { size: 13, anchor: 'end' }),
          pointer(250, 150, 222, 150), tag(316, 155, '塩素が出る', { size: 13, anchor: 'end' }),
          tag(160, 224, '塩化銅水溶液（青色）', { size: 13 }),
        ]),
      },
      {
        id: 'ion-2-c2',
        text: '金属には、陽イオンへのなりやすさのちがいがあり、マグネシウム＞亜鉛＞銅の順になりやすいです。硫酸銅水溶液に亜鉛板を入れると、亜鉛が電子を失って亜鉛イオンになってとけ出し、銅イオンが電子を受け取って銅になり、亜鉛板に付きます。',
        // イオンへのなりやすさの順と、硫酸銅水溶液に入れた亜鉛板（写真: ペトリ皿 (15〜222, 105〜230)、
        // 亜鉛板の液の外の部分 (20〜105, 80〜150)、亜鉛板に付いた赤い銅 (57〜150, 135〜190)。上と右は白い余白）
        figure: scene([
          photo('ion-2-c2'),
          tag(160, 22, '← 陽イオンになりやすい', { size: 13 }),
          tag(160, 46, 'Mg ＞ Zn ＞ Cu', { size: 16, bold: true }),
          pointer(40, 79, 46, 98), tag(36, 74, '亜鉛板'),
          tag(312, 78, '亜鉛は Zn2+ になる', { size: 13, anchor: 'end' }),
          pointer(230, 104, 140, 158), tag(268, 104, '赤い銅が付く'),
          pointer(228, 212, 202, 196), tag(270, 216, '硫酸銅水溶液'),
        ]),
      },
      {
        id: 'ion-2-c3',
        anim: 'io-daniell',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '**ダニエル電池**では、亜鉛板が−極、銅板が＋極です。−極では亜鉛が電子を失って Zn2+ になってとけ出し、電子は導線を通って銅板へ移ります。＋極では Cu2+ が電子を受け取って銅になり、銅板に付きます。2 つの水溶液は**セロハン**で分けます。',
        // ダニエル電池と、導線の中を電子が動く向き
        figure: scene(daniellItems().concat([
          { type: 'arrow', x1: 188, y1: 36, x2: 226, y2: 36, color: 'blue', width: 2 },
          { type: 'text', x: 207, y: 26, text: '電子', size: 12, anchor: 'middle' },
          { type: 'text', x: 50, y: 66, text: '−極', size: 13, anchor: 'middle' },
          { type: 'text', x: 272, y: 66, text: '＋極', size: 13, anchor: 'middle' },
          ion(122, 172, 'Zn2+'),
          ion(198, 172, 'Cu2+'),
        ])),
      },
      {
        id: 'ion-2-c4',
        text: '化学変化を利用して電気エネルギーをとり出す装置を**電池**（化学電池）といいます。使い切りで充電できない電池を**一次電池**、充電してくり返し使える電池を**二次電池**といいます。水素と酸素が結びついて水ができる化学変化を利用する電池を**燃料電池**といいます。',
        // 電池の種類と例
        figure: scene([
          { type: 'rect', x: 10, y: 14, width: 300, height: 64, rx: 6, fill: 'white' },
          { type: 'text', x: 24, y: 40, text: '一次電池', size: 15, bold: true },
          { type: 'text', x: 24, y: 64, text: '使い切り', size: 12 },
          { type: 'text', x: 170, y: 40, text: 'マンガン乾電池', size: 13 },
          { type: 'text', x: 170, y: 64, text: 'アルカリ乾電池', size: 13 },
          { type: 'rect', x: 10, y: 88, width: 300, height: 64, rx: 6, fill: 'white' },
          { type: 'text', x: 24, y: 114, text: '二次電池', size: 15, bold: true },
          { type: 'text', x: 24, y: 138, text: '充電してくり返し使える', size: 12 },
          { type: 'text', x: 170, y: 114, text: 'リチウムイオン電池', size: 13 },
          { type: 'text', x: 170, y: 138, text: '鉛蓄電池', size: 13 },
          { type: 'rect', x: 10, y: 162, width: 300, height: 64, rx: 6, fill: 'white' },
          { type: 'text', x: 24, y: 188, text: '燃料電池', size: 15, bold: true },
          { type: 'text', x: 24, y: 212, text: '出るのは水だけ', size: 12 },
          { type: 'text', x: 170, y: 188, text: '2H₂ ＋ O₂ → 2H₂O', size: 13 },
          { type: 'text', x: 170, y: 212, text: '水素と酸素から電気', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-2-w1', concept: 'io-electrolysis',
      prompt: '予想しよう。青色の塩化銅水溶液に電流を流し続けると、陰極（電源の−極につないだ電極）には何が付くと思う？',
      options: ['赤色の銅', '白色の食塩', '何も付かない'],
      answer: 'a',
      explanation: '塩化銅水溶液の中の銅イオン Cu2+ は＋の電気を帯びているので、陰極に引かれて電子を受け取り、赤色の銅になって付きます。このステージで確かめよう。',
      hint: '塩化銅には、銅がふくまれているね。',
    }),
    problems: [
      figureChoice({
        id: 'ion-2-p1', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液に電流を流しました。上の電池の左が＋極、右が−極です。しばらくすると、赤色の銅が付くのはア・イのどちらの電極？',
        figure: scene(electrolysisItems('sky').concat([
          { type: 'text', x: 160, y: 236, text: '塩化銅水溶液', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 110, y: 165, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 210, y: 165, r: 24, label: 'イ' },
        ])),
        answer: 'r2',
        explanation: '電源の−極につないだ電極が陰極です。銅イオン Cu2+ は＋の電気を帯びているので陰極（イ）に引かれ、電子を 2 個受け取って銅になります。陽極（ア）からは塩素が出ます。',
        hint: '銅イオンは＋の電気を帯びているよ。＋と引き合うのは、どちらの極かな。',
      }),
      fill({
        id: 'ion-2-t1', concept: 'io-battery', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '充電してくり返し使える電池を[b1]といい、水素と酸素が結びつく化学変化を利用する電池を[b2]という。',
        blanks: [
          word('b1', ['一次電池', '二次電池', '燃料電池'], '二次電池'),
          word('b2', ['一次電池', '二次電池', '燃料電池'], '燃料電池'),
        ],
        explanation: '充電してくり返し使える電池が**二次電池**（リチウムイオン電池など）、水素と酸素から水ができる化学変化を利用する電池が**燃料電池**です。使い切りの電池は一次電池です。',
        hint: '燃料電池の「燃料」は水素だよ。',
      }),
      choice({
        id: 'ion-2-p2', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液の電気分解で、陽極から出る気体の性質として正しいものはどれ？',
        options: ['刺激臭があり、色を消すはたらき（漂白作用）がある', 'においがなく、火を近づけるとポンと音を立てて燃える', 'ものを激しく燃やすはたらきがある'],
        answer: 'a',
        explanation: '陽極から出る気体は塩素です。塩化物イオン Cl- が陽極で電子をわたして塩素になります。塩素には刺激臭があり、赤インクの色などを消す漂白作用があります。においをかぐときは、手であおぐようにしよう。',
        hint: '陽極に引かれるのは、陰イオンの Cl- だったね。',
      }),
      choice({
        id: 'ion-2-p3', concept: 'io-battery',
        prompt: '硫酸銅水溶液に亜鉛板を入れると、どうなる？',
        options: ['亜鉛板に赤い銅が付く', '何も変化しない', '水溶液の色が濃い青色になる'],
        answer: 'a',
        explanation: '亜鉛は銅より陽イオンになりやすいので、亜鉛が電子を失って Zn2+ になってとけ出し、銅イオン Cu2+ がその電子を受け取って銅になります。銅イオンが減るので、水溶液の青色はうすくなっていきます。',
        hint: '亜鉛と銅では、どちらが陽イオンになりやすかったかな。',
      }),
      drag({
        id: 'ion-2-p4', concept: 'io-battery',
        prompt: 'ダニエル電池でモーターが回りました。導線の中を電子が流れていく先はどちら？ 電子の印（e-）を導線にそって左右に動かし、電子が向かう金属板の真上（導線の角）に置こう。',
        // 導線の角は左が亜鉛板の上 (86, 50)、右が銅板の上 (234, 50)。電子は−極の亜鉛板から＋極の銅板へ流れるので、正解は右の角。
        // 不正解例は左の角（亜鉛板の上、148px はなれる）。印のはじめの位置 x 120 も正解から 114px はなれる
        figure: scene(daniellItems().concat([
          { type: 'circle', id: 'e', x: 120, y: 50, r: 12, fill: 'sky', stroke: 'blue', label: 'e-' },
        ])),
        draggable: { itemId: 'e', axis: 'x' },
        target: { x: 234, y: 50 },
        samples: { correct: { x: 234, y: 50 }, wrong: { x: 86, y: 50 } },
        explanation: '−極の亜鉛板では、亜鉛が電子を失って Zn2+ になります。その電子は導線を通って＋極の銅板へ流れ、銅板で Cu2+ が電子を受け取って銅になります。電流の向きは、電子の流れと反対の、銅板から亜鉛板への向きです。',
        hint: '電子を失ってとけ出すのは、陽イオンになりやすい亜鉛のほうだよ。',
      }),
      choice({
        id: 'ion-2-p5', concept: 'io-electrolysis',
        prompt: 'うすい塩酸を電気分解したとき、陰極から出る気体はどれ？',
        options: ['水素', '塩素', '酸素'],
        answer: 'a',
        explanation: '塩酸の中の水素イオン H+ は＋の電気を帯びているので陰極に引かれ、電子を受け取って水素になります。陽極からは塩素が出ます（2HCl → H₂ ＋ Cl₂）。',
        hint: '陰極に引かれるのは陽イオンだよ。塩酸の中の陽イオンは何かな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-2-r1', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液に電流を流したとき、銅イオン Cu2+ はどちらへ動く？',
        options: ['陰極', '陽極', 'どちらにも動かない'],
        answer: 'a',
        explanation: '銅イオン Cu2+ は＋の電気を帯びた陽イオンなので、−の電気を帯びた陰極に引かれます。陰極で電子を 2 個受け取って、銅原子になります。',
        hint: '＋の電気と−の電気は引き合うよ。',
      }),
      fill({
        id: 'ion-2-r2', concept: 'io-electrolysis',
        prompt: '塩化銅の電気分解を表す化学反応式です。空らんに入るものを選ぼう。',
        text: 'CuCl₂ → Cu ＋ [b1]',
        blanks: [word('b1', ['Cl₂', '2Cl', 'Cl'], 'Cl₂')],
        explanation: '陽極では、塩化物イオンが電子をわたして塩素原子になり、塩素原子が 2 個結びついて塩素分子 Cl₂ になります。だから CuCl₂ → Cu ＋ Cl₂ です。',
        hint: '塩素は、原子が 2 個結びついた分子で出てくるよ。',
      }),
      choice({
        id: 'ion-2-r3', concept: 'io-battery',
        prompt: 'マグネシウム・亜鉛・銅を、陽イオンになりやすい順に並べたものはどれ？',
        options: ['マグネシウム＞亜鉛＞銅', '銅＞亜鉛＞マグネシウム', '亜鉛＞マグネシウム＞銅'],
        answer: 'a',
        explanation: '硫酸亜鉛水溶液にマグネシウムを入れると亜鉛が付き、硫酸銅水溶液に亜鉛を入れると銅が付きます。このような結果から、マグネシウム＞亜鉛＞銅の順に陽イオンになりやすいと分かります。',
        hint: '硫酸銅水溶液に亜鉛板を入れると、銅が付いたね。',
      }),
      choice({
        id: 'ion-2-r4', concept: 'io-battery',
        prompt: 'ダニエル電池の＋極（銅板）の表面では、どんな変化が起こる？',
        options: ['銅イオンが電子を受け取り、銅が付く', '銅が電子を失って、とけ出す', '水素が発生する'],
        answer: 'a',
        explanation: '＋極の銅板には、導線を通って亜鉛板から電子が流れてきます。硫酸銅水溶液の中の Cu2+ がその電子を受け取って銅になり、銅板に付きます。',
        hint: '電子は、−極から導線を通って＋極へ流れてくるよ。',
      }),
      choice({
        id: 'ion-2-r5', concept: 'io-battery',
        prompt: 'ダニエル電池で、2 つの水溶液をセロハンで分けるのはなぜ？',
        options: ['2 つの水溶液がすぐに混ざらないようにし、イオンは少しずつ通すため', '電子を通さないようにするため', '水溶液を冷やすため'],
        answer: 'a',
        explanation: '2 つの水溶液がすぐに混ざると、亜鉛板に直接銅が付いてしまい、電流がとり出しにくくなります。セロハンには小さな穴があり、イオンは少しずつ通れるので、電流が流れ続けます。',
        hint: '硫酸銅水溶液が亜鉛板にふれると、何が起こったかな。',
      }),
      choice({
        id: 'ion-2-t2', concept: 'io-electrolysis', term: true,
        prompt: '次の説明に合う言葉はどれ？「電解質の水溶液に電流を流して、物質を分けること」',
        options: ['電気分解', '電離', '中和'],
        answer: 'a',
        explanation: '電解質の水溶液に電流を流して物質を分けることを**電気分解**といいます。塩化銅水溶液を電気分解すると、陰極に銅、陽極に塩素ができます。',
        hint: '電流（電気）を流して分解するね。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 酸・アルカリと中和
  // ================================================================

  // ---- ステージ ion-3: 酸とアルカリ（酸性・アルカリ性の性質、酸とアルカリの正体、pH、指示薬） ----
  const ion3 = {
    id: 'ion-3', areaId: 'io-acid', title: '酸とアルカリ', minutes: 5, concepts: ['io-acidbase'],
    lessons: [
      {
        id: 'ion-3-c1',
        text: '酸性の水溶液は、青色リトマス紙を赤色に変え、**BTB 溶液**を黄色にし、マグネシウムを入れると水素が発生します。水溶液にしたとき、電離して**水素イオン** H+ を生じる物質を**酸**といいます（HCl → H+ ＋ Cl-）。',
        // 酸性の水溶液の性質
        figure: scene([
          { type: 'text', x: 160, y: 28, text: 'HCl → H+ ＋ Cl-', size: 16, anchor: 'middle', bold: true },
          { type: 'rect', x: 22, y: 56, width: 22, height: 64, fill: BLUE_LITMUS, stroke: 'line' },
          { type: 'arrow', x1: 47, y1: 88, x2: 59, y2: 88, color: 'gray', width: 2 },
          { type: 'rect', x: 62, y: 56, width: 22, height: 64, fill: 'red', stroke: 'line' },
          { type: 'text', x: 53, y: 142, text: '青色リトマス紙', size: 12, anchor: 'middle' },
          { type: 'text', x: 53, y: 160, text: '→ 赤色', size: 12, anchor: 'middle' },
          { type: 'tube', x: 160, y: 122, height: 66, level: 0.6, liquid: 'yellow' },
          { type: 'text', x: 160, y: 142, text: 'BTB 溶液', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 160, text: '→ 黄色', size: 12, anchor: 'middle' },
          { type: 'tube', x: 267, y: 122, height: 66, level: 0.6, liquid: 'water' },
          { type: 'line', points: [[262, 118], [272, 94]], color: 'gray', width: 4 },
          { type: 'circle', x: 262, y: 102, r: 3, fill: 'white', stroke: 'line' },
          { type: 'circle', x: 274, y: 104, r: 3, fill: 'white', stroke: 'line' },
          { type: 'circle', x: 268, y: 90, r: 3, fill: 'white', stroke: 'line' },
          { type: 'text', x: 267, y: 142, text: 'マグネシウム', size: 12, anchor: 'middle' },
          { type: 'text', x: 267, y: 160, text: '→ 水素が出る', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 200, text: '水溶液に H+ がある → 酸性', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 226, text: 'pH は 7 より小さい', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-3-c2',
        text: 'アルカリ性の水溶液は、赤色リトマス紙を青色に変え、BTB 溶液を青色にし、**フェノールフタレイン溶液**を赤色にします。水溶液にしたとき、電離して**水酸化物イオン** OH- を生じる物質を**アルカリ**といいます（NaOH → Na+ ＋ OH-）。',
        // アルカリ性の水溶液の性質
        figure: scene([
          { type: 'text', x: 160, y: 28, text: 'NaOH → Na+ ＋ OH-', size: 16, anchor: 'middle', bold: true },
          { type: 'rect', x: 22, y: 56, width: 22, height: 64, fill: 'red', stroke: 'line' },
          { type: 'arrow', x1: 47, y1: 88, x2: 59, y2: 88, color: 'gray', width: 2 },
          { type: 'rect', x: 62, y: 56, width: 22, height: 64, fill: BLUE_LITMUS, stroke: 'line' },
          { type: 'text', x: 53, y: 142, text: '赤色リトマス紙', size: 12, anchor: 'middle' },
          { type: 'text', x: 53, y: 160, text: '→ 青色', size: 12, anchor: 'middle' },
          { type: 'tube', x: 160, y: 122, height: 66, level: 0.6, liquid: 'blue' },
          { type: 'text', x: 160, y: 142, text: 'BTB 溶液', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 160, text: '→ 青色', size: 12, anchor: 'middle' },
          { type: 'tube', x: 267, y: 122, height: 66, level: 0.6, liquid: 'red' },
          { type: 'text', x: 254, y: 142, text: 'フェノールフタレイン', size: 12, anchor: 'middle' },
          { type: 'text', x: 267, y: 160, text: '溶液 → 赤色', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 200, text: '水溶液に OH- がある → アルカリ性', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 226, text: 'pH は 7 より大きい', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-3-c3',
        text: '酸性・アルカリ性の強さは **pH** で表します。pH 7 が中性で、7 より小さいほど酸性が強く、7 より大きいほどアルカリ性が強くなります。色の変化で液の性質を調べる薬品を**指示薬**といい、BTB 溶液は酸性で黄色、中性で緑色、アルカリ性で青色になります。',
        // pH の目盛りと、BTB 溶液の色（写真: 試験管立て (72〜250, 85〜200) に試験管 3 本。左 (115) 黄色、
        // 中央 (160) 緑色、右 (205) 青色、液は 122〜190。試験管の口は 42 で、上は白い余白）
        figure: scene([
          photo('ion-3-c3'),
          { type: 'text', x: 4, y: 22, text: 'pH', size: 14, bold: true },
          { type: 'rect', x: 30, y: 9, width: 120, height: 14, fill: 'yellow' },
          { type: 'rect', x: 150, y: 9, width: 20, height: 14, fill: 'green' },
          { type: 'rect', x: 170, y: 9, width: 130, height: 14, fill: BLUE_LITMUS },
          { type: 'text', x: 30, y: 37, text: '0', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 37, text: '7', size: 13, anchor: 'middle' },
          { type: 'text', x: 300, y: 37, text: '14', size: 13, anchor: 'middle' },
          pointer(58, 146, 108, 146), tag(34, 150, '酸性'), tag(34, 170, '（黄色）', { size: 13 }),
          pointer(160, 207, 160, 188), tag(160, 222, '中性（緑色）', { size: 13 }),
          pointer(242, 146, 212, 146), tag(312, 150, 'アルカリ性', { size: 13, anchor: 'end' }), tag(284, 170, '（青色）', { size: 13 }),
        ]),
      },
      {
        id: 'ion-3-c4',
        anim: 'io-migration',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '食塩水でしめらせたろ紙に青色リトマス紙をのせ、中央に塩酸をしみこませた糸を置いて電圧を加えると、赤色が陰極側へ広がります。酸性を示すのは陽イオンの H+ だと分かります。アルカリ性を示す OH- は陰イオンなので、陽極側へ動きます。',
        // 青色リトマス紙の赤くなった部分が、陰極（電源の−極）側へ広がる
        figure: scene([
          { type: 'text', x: 40, y: 50, text: '陰極（−）', size: 12, anchor: 'middle' },
          { type: 'text', x: 280, y: 50, text: '陽極（＋）', size: 12, anchor: 'middle' },
          { type: 'line', points: [[40, 58], [40, 112]], width: 2 },
          { type: 'line', points: [[280, 58], [280, 112]], width: 2 },
          { type: 'rect', x: 20, y: 96, width: 280, height: 48, fill: 'glass' },
          { type: 'rect', x: 40, y: 108, width: 240, height: 24, fill: BLUE_LITMUS, stroke: 'none' },
          { type: 'rect', x: 96, y: 108, width: 66, height: 24, fill: 'red', stroke: 'none' },
          { type: 'line', points: [[160, 92], [160, 148]], width: 3 },
          { type: 'arrow', x1: 150, y1: 84, x2: 104, y2: 84, color: 'red', width: 2 },
          { type: 'text', x: 127, y: 74, text: 'H+', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 168, text: '塩酸をしみこませた糸', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 196, text: '赤色が陰極側へ広がる', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '→ 酸性を示すのは H+（陽イオン）', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-3-w1', concept: 'io-acidbase',
      prompt: '予想しよう。レモンのしるを青色リトマス紙につけると、何色になると思う？',
      options: ['赤色', '青色のまま', '緑色'],
      answer: 'a',
      explanation: 'レモンのしるは酸性なので、青色リトマス紙を赤色に変えます。酸っぱい味のするものには、酸性のものが多いです。このステージで、酸性とアルカリ性の正体を学ぼう。',
      hint: 'レモンは酸っぱいね。酸っぱいものの性質を考えよう。',
    }),
    problems: [
      figureChoice({
        id: 'ion-3-p1', concept: 'io-acidbase',
        prompt: '3 つの水溶液に BTB 溶液を加えると、ア 黄色、イ 青色、ウ 緑色 になりました。アルカリ性の水溶液はア〜ウのどれ？',
        figure: scene([
          { type: 'text', x: 160, y: 30, text: 'BTB 溶液を加えた水溶液', size: 14, anchor: 'middle' },
          { type: 'tube', x: 60, y: 160, height: 100, level: 0.6, liquid: 'yellow' },
          { type: 'tube', x: 160, y: 160, height: 100, level: 0.6, liquid: 'blue' },
          { type: 'tube', x: 260, y: 160, height: 100, level: 0.6, liquid: 'green' },
          { type: 'region', id: 'r1', x: 60, y: 204, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 204, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 204, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'BTB 溶液は、酸性で黄色、中性で緑色、アルカリ性で青色になります。だから、青色のイがアルカリ性です。黄色のアは酸性、緑色のウは中性です。',
        hint: 'BTB 溶液の色は 黄・緑・青 の 3 つ。アルカリ性はどの色だったかな。',
      }),
      fill({
        id: 'ion-3-t1', concept: 'io-acidbase', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水溶液にしたとき、電離して水素イオンを生じる物質を[b1]といい、水酸化物イオンを生じる物質を[b2]という。',
        blanks: [
          word('b1', ['酸', 'アルカリ', '塩'], '酸'),
          word('b2', ['酸', 'アルカリ', '塩'], 'アルカリ'),
        ],
        explanation: '電離して水素イオン H+ を生じる物質が**酸**、水酸化物イオン OH- を生じる物質が**アルカリ**です。塩化水素は酸、水酸化ナトリウムはアルカリです。',
        hint: '塩酸（塩化水素）は、電離すると H+ ができるね。',
      }),
      choice({
        id: 'ion-3-p2', concept: 'io-acidbase',
        prompt: 'フェノールフタレイン溶液を加えると赤色になるのは、何性の水溶液？',
        options: ['アルカリ性', '酸性', '中性'],
        answer: 'a',
        explanation: 'フェノールフタレイン溶液は、アルカリ性の水溶液で赤色になり、酸性や中性では無色のままです。だから、アルカリ性かどうかを調べるときに使います。',
        hint: '酸性でも中性でも、色は変わらない指示薬だよ。',
      }),
      choice({
        id: 'ion-3-p3', concept: 'io-acidbase',
        prompt: 'pH が次の値の水溶液のうち、酸性がいちばん強いものはどれ？',
        options: ['pH 2', 'pH 5', 'pH 7', 'pH 12'],
        answer: 'a',
        explanation: 'pH は 7 が中性で、7 より小さいほど酸性が強くなります。だから pH 2 がいちばん酸性が強いです。pH 7 は中性、pH 12 はアルカリ性です。',
        hint: '酸性が強いほど、pH の数は大きくなるかな、小さくなるかな。',
      }),
      figureChoice({
        id: 'ion-3-p4', concept: 'io-acidbase',
        prompt: '食塩水でしめらせたろ紙に青色リトマス紙をのせ、左のはしを電源の＋極、右のはしを−極につなぎました。中央に塩酸をしみこませた糸を置いて電圧を加えると、リトマス紙の赤色はア・イのどちらへ広がる？',
        figure: scene([
          { type: 'text', x: 40, y: 50, text: '電源の＋極', size: 12, anchor: 'middle' },
          { type: 'text', x: 280, y: 50, text: '電源の−極', size: 12, anchor: 'middle' },
          { type: 'line', points: [[40, 58], [40, 112]], width: 2 },
          { type: 'line', points: [[280, 58], [280, 112]], width: 2 },
          { type: 'rect', x: 20, y: 96, width: 280, height: 48, fill: 'glass' },
          { type: 'rect', x: 40, y: 108, width: 240, height: 24, fill: BLUE_LITMUS, stroke: 'none' },
          { type: 'rect', x: 152, y: 108, width: 16, height: 24, fill: 'red', stroke: 'none' },
          { type: 'line', points: [[160, 92], [160, 148]], width: 3 },
          { type: 'text', x: 160, y: 176, text: '塩酸をしみこませた糸', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 90, y: 120, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 230, y: 120, r: 22, label: 'イ' },
        ]),
        answer: 'r2',
        explanation: '酸性を示す水素イオン H+ は＋の電気を帯びた陽イオンなので、電源の−極（陰極）側、つまりイへ引かれて動きます。だから、赤色はイのほうへ広がります。',
        hint: 'H+ は＋の電気を帯びているよ。＋と引き合うのは、どちらの極かな。',
      }),
      choice({
        id: 'ion-3-p5', concept: 'io-acidbase',
        prompt: 'マグネシウムリボンを入れると、気体（水素）が発生する水溶液はどれ？',
        options: ['うすい塩酸', 'うすい水酸化ナトリウム水溶液', '食塩水'],
        answer: 'a',
        explanation: 'マグネシウムなどの金属を酸性の水溶液に入れると、水素が発生します。塩酸は酸性なので水素が出ます。水酸化ナトリウム水溶液（アルカリ性）や食塩水（中性）では、水素は出ません。',
        hint: '金属と反応して水素を出すのは、何性の水溶液だったかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-3-r1', concept: 'io-acidbase',
        prompt: '塩酸をしみこませた糸を使った実験で、青色リトマス紙の赤色が陰極側へ広がりました。このことから分かる、酸性を示すものの正体はどれ？',
        options: ['陽イオンの H+', '陰イオンの Cl-', '陰イオンの OH-'],
        answer: 'a',
        explanation: '陰極に引かれるのは＋の電気を帯びた陽イオンです。塩酸の陽イオンは H+ なので、酸性を示すのは水素イオン H+ だと分かります。',
        hint: '陰極（−極）に引かれるのは、陽イオンかな、陰イオンかな。',
      }),
      choice({
        id: 'ion-3-r2', concept: 'io-acidbase',
        prompt: 'ある水溶液に BTB 溶液を加えると緑色になりました。この水溶液は何性？',
        options: ['中性', '酸性', 'アルカリ性'],
        answer: 'a',
        explanation: 'BTB 溶液は、酸性で黄色、中性で緑色、アルカリ性で青色になります。緑色なので中性です。食塩水や砂糖水が中性の例です。',
        hint: '黄・緑・青 のまん中の色だね。',
      }),
      fill({
        id: 'ion-3-r3', concept: 'io-acidbase',
        prompt: '水酸化ナトリウムが電離するようすを表す式です。空らんに入るものを選ぼう。',
        text: 'NaOH → Na+ ＋ [b1]',
        blanks: [word('b1', ['OH-', 'H+', 'Cl-'], 'OH-')],
        explanation: '水酸化ナトリウムは、ナトリウムイオン Na+ と水酸化物イオン OH- に電離します。アルカリ性を示すのは、この OH- です。',
        hint: 'アルカリに共通するイオンだよ。',
      }),
      choice({
        id: 'ion-3-r4', concept: 'io-acidbase',
        prompt: '赤色リトマス紙を青色に変える水溶液はどれ？',
        options: ['うすい水酸化ナトリウム水溶液', 'うすい塩酸', '砂糖水'],
        answer: 'a',
        explanation: '赤色リトマス紙を青色に変えるのは、アルカリ性の水溶液です。水酸化ナトリウム水溶液はアルカリ性です。塩酸は酸性なので青色リトマス紙を赤色に変え、砂糖水は中性なのでどちらも変えません。',
        hint: 'アルカリ性の水溶液はどれかな。',
      }),
      choice({
        id: 'ion-3-t2', concept: 'io-acidbase', term: true,
        prompt: '次の説明に合う言葉はどれ？「水溶液の酸性・アルカリ性の強さを 0〜14 の数で表したもの」',
        options: ['pH', '指示薬', '電離'],
        answer: 'a',
        explanation: '酸性・アルカリ性の強さを表す数を **pH** といいます。7 が中性で、7 より小さいと酸性、7 より大きいとアルカリ性です。',
        hint: 'ピーエイチと読むよ。',
      }),
    ],
  };

  // ---- ステージ ion-4: 中和と塩（中和、塩、中和のモデル、イオンの数の変化） ----
  const ion4 = {
    id: 'ion-4', areaId: 'io-acid', title: '中和と塩', minutes: 5, concepts: ['io-neutral'],
    lessons: [
      {
        id: 'ion-4-c1',
        anim: 'io-neutralize',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '酸の水溶液とアルカリの水溶液を混ぜると、H+ と OH- が結びついて水ができ、たがいの性質を打ち消し合います。この化学変化を**中和**といいます（H+ ＋ OH- → H₂O）。中和は、ちょうど中性になったときだけでなく、酸とアルカリを混ぜるたびに起こっています。',
        // H+ ＋ OH- → H₂O のモデル
        figure: scene([
          { type: 'text', x: 160, y: 36, text: 'H+ ＋ OH- → H₂O', size: 16, anchor: 'middle', bold: true },
          ion(60, 100, 'H+'),
          { type: 'text', x: 102, y: 106, text: '＋', size: 18, anchor: 'middle' },
          ion(144, 100, 'OH-'),
          { type: 'arrow', x1: 174, y1: 100, x2: 214, y2: 100, color: 'gray' },
          { type: 'circle', x: 262, y: 96, r: 16, fill: 'sky', stroke: 'ink', label: 'O' },
          { type: 'circle', x: 240, y: 112, r: 10, fill: 'white', stroke: 'ink' },
          { type: 'circle', x: 284, y: 112, r: 10, fill: 'white', stroke: 'ink' },
          { type: 'text', x: 262, y: 146, text: '水', size: 13, anchor: 'middle' },
          { type: 'text', x: 60, y: 140, text: '酸の性質', size: 12, anchor: 'middle' },
          { type: 'text', x: 144, y: 140, text: 'アルカリの性質', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 190, text: 'たがいの性質を打ち消し合う', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 218, text: '＝ 中和', size: 14, anchor: 'middle', bold: true },
        ]),
      },
      {
        id: 'ion-4-c2',
        text: '中和では水のほかに、酸の陰イオンとアルカリの陽イオンが結びついた**塩**ができます。塩酸と水酸化ナトリウム水溶液からは、水にとける塩化ナトリウムができます。硫酸と水酸化バリウム水溶液からは、水にとけにくい硫酸バリウムができ、白い沈殿になります。',
        // 塩ができる 2 つの例
        figure: scene([
          { type: 'text', x: 160, y: 22, text: '酸の陰イオン ＋ アルカリの陽イオン → 塩', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 56, text: 'HCl ＋ NaOH → NaCl ＋ H₂O', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 78, text: '塩化ナトリウム（水にとける）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 118, text: 'H₂SO₄ ＋ Ba(OH)₂ → BaSO₄ ＋ 2H₂O', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 140, text: '硫酸バリウム（水にとけにくい）', size: 12, anchor: 'middle' },
          { type: 'beaker', x: 160, y: 226, width: 70, height: 66, level: 0.6, liquid: 'water' },
          { type: 'rect', x: 129, y: 210, width: 62, height: 12, fill: 'white', stroke: 'line' },
          { type: 'text', x: 204, y: 220, text: '白い沈殿', size: 12 },
        ]),
      },
      {
        id: 'ion-4-c3',
        text: 'BTB 溶液を加えた塩酸に、水酸化ナトリウム水溶液を少しずつ加えると、色は黄色 → 緑色 → 青色と変わります。H+ が残っていれば酸性、H+ も OH- もなくなれば中性、OH- があまればアルカリ性です。中性の液を蒸発させると、塩化ナトリウムが出てきます。',
        // 中和のモデル（水の分子はかいていない）
        figure: scene([
          { type: 'text', x: 160, y: 24, text: '水酸化ナトリウム水溶液を加えていく →', size: 12, anchor: 'middle' },
        ].concat(modelFrames(
          [['H+', 'Cl-', 'Na+', 'Cl-'], ['Na+', 'Cl-', 'Na+', 'Cl-'], ['Na+', 'Cl-', 'Na+', 'Cl-', 'Na+', 'OH-']],
          ['#FFF3C4', 'lightgreen', 'sky']), [
          { type: 'text', x: 56, y: 180, text: '酸性（黄色）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 180, text: '中性（緑色）', size: 12, anchor: 'middle' },
          { type: 'text', x: 264, y: 180, text: 'アルカリ性（青色）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 226, text: '（水の分子はかいていない）', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-4-c4',
        anim: 'io-ion-count',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '塩酸に水酸化ナトリウム水溶液を加えていくと、H+ は OH- と結びついて水になるので減り、中性で 0 になります。Na+ は加えた分だけ増え、Cl- は変わりません。OH- は中性になるまでは 0 で、その後は増えていきます。',
        // 塩酸 10 cm³ に水酸化ナトリウム水溶液を加えたときのイオンの数（10 cm³ で中性）
        figure: scene([
          { type: 'line', points: [[175, 200], [175, 40]], color: 'gray', width: 2, dashed: true },
          { type: 'text', x: 175, y: 32, text: '中性', size: 12, anchor: 'middle' },
          { type: 'line', points: [[60, 30], [60, 200], [300, 200]], width: 2 },
          { type: 'text', x: 8, y: 20, text: 'イオンの数', size: 12 },
          { type: 'text', x: 54, y: 218, text: '0', size: 12, anchor: 'end' },
          { type: 'text', x: 175, y: 218, text: '10', size: 12, anchor: 'middle' },
          { type: 'text', x: 290, y: 218, text: '20', size: 12, anchor: 'middle' },
          { type: 'text', x: 312, y: 236, text: '加えた水酸化ナトリウム水溶液〔cm³〕', size: 12, anchor: 'end' },
          { type: 'line', points: [[60, 120], [290, 120]], color: 'green', width: 3 },
          { type: 'line', points: [[60, 200], [290, 40]], color: 'orange', width: 3 },
          { type: 'line', points: [[60, 120], [175, 200], [290, 200]], color: 'blue', width: 3 },
          { type: 'line', points: [[175, 200], [290, 120]], color: 'purple', width: 3 },
          { type: 'text', x: 284, y: 34, text: 'Na+', size: 13, anchor: 'end', color: 'orange' },
          { type: 'text', x: 232, y: 114, text: 'Cl-', size: 13, color: 'green' },
          { type: 'text', x: 64, y: 160, text: 'H+', size: 13, color: 'blue' },
          { type: 'text', x: 258, y: 172, text: 'OH-', size: 13, color: 'purple' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-4-w1', concept: 'io-neutral',
      prompt: '予想しよう。うすい塩酸に、うすい水酸化ナトリウム水溶液を少しずつ加えていくと、酸性の性質はどうなると思う？',
      options: ['だんだん弱くなる', 'だんだん強くなる', '変わらない'],
      answer: 'a',
      explanation: '酸性を示す H+ が、加えたアルカリの OH- と結びついて水になるので、酸性の性質はだんだん弱くなります。このステージで、この変化（中和）を学ぼう。',
      hint: '酸とアルカリは、たがいの性質を打ち消し合うよ。',
    }),
    problems: [
      figureChoice({
        id: 'ion-4-p1', concept: 'io-neutral',
        prompt: 'うすい塩酸に水酸化ナトリウム水溶液を加えたときの水溶液のようすを、イオンのモデルで表しました（水の分子はかいていない）。中性の水溶液はア〜ウのどれ？',
        // ア: Na+ 3・Cl- 2・OH- 1（アルカリ性）、イ: H+ 1・Cl- 2・Na+ 1（酸性）、ウ: Na+ 2・Cl- 2（中性）
        figure: scene(modelFrames(
          [['Na+', 'Cl-', 'Na+', 'Cl-', 'Na+', 'OH-'], ['H+', 'Cl-', 'Na+', 'Cl-'], ['Na+', 'Cl-', 'Na+', 'Cl-']],
          null).concat([
          { type: 'region', id: 'r1', x: 56, y: 204, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 204, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 204, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '中性の水溶液には、H+ も OH- も残っていません。ウは Na+ と Cl- だけなので中性です。H+ が残っているイは酸性、OH- があまっているアはアルカリ性です。',
        hint: 'H+ と OH- が、どちらも残っていないものをさがそう。',
      }),
      fill({
        id: 'ion-4-t1', concept: 'io-neutral', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '酸とアルカリがたがいの性質を打ち消し合う化学変化を[b1]といい、このとき酸の陰イオンとアルカリの陽イオンが結びついてできる物質を[b2]という。',
        blanks: [
          word('b1', ['中和', '電離', '電気分解'], '中和'),
          word('b2', ['塩', '水', '酸化物'], '塩'),
        ],
        explanation: '酸とアルカリがたがいの性質を打ち消し合う化学変化が**中和**です。このとき、水のほかに、酸の陰イオンとアルカリの陽イオンが結びついた**塩**ができます。',
        hint: '塩化ナトリウムは、この物質の例だよ。',
      }),
      fill({
        id: 'ion-4-p2', concept: 'io-neutral',
        prompt: '中和で起こる変化をイオン式で表しました。空らんに入るものを選ぼう。',
        text: 'H+ ＋ OH- → [b1]',
        blanks: [word('b1', ['H₂O', 'H₂', 'O₂'], 'H₂O')],
        explanation: '酸の水素イオン H+ と、アルカリの水酸化物イオン OH- が結びつくと、水 H₂O ができます。これが中和の正体です。',
        hint: 'H と O と H。何ができるかな。',
      }),
      choice({
        id: 'ion-4-p3', concept: 'io-neutral',
        prompt: 'うすい硫酸にうすい水酸化バリウム水溶液を加えると、白い沈殿ができました。この沈殿は何？',
        options: ['硫酸バリウム', '塩化ナトリウム', '水酸化ナトリウム'],
        answer: 'a',
        explanation: '硫酸の陰イオンと、水酸化バリウムの陽イオン（バリウムイオン）が結びついて、硫酸バリウムという塩ができます（H₂SO₄ ＋ Ba(OH)₂ → BaSO₄ ＋ 2H₂O）。硫酸バリウムは水にとけにくいので、白い沈殿になります。',
        hint: '酸の陰イオンとアルカリの陽イオンが結びついた塩だよ。',
      }),
      drag({
        id: 'ion-4-p4', concept: 'io-neutral',
        prompt: 'BTB 溶液を加えたうすい塩酸 10 cm³ に、うすい水酸化ナトリウム水溶液を少しずつ加えました。グラフは、加えた量と、水溶液の中の水素イオンの数の関係です。BTB 溶液がちょうど緑色になったときの量の位置に、青い点を左右に動かして置こう。',
        // 水素イオンが 0 になるのは 6 cm³（x = 60 + 11.5 × 6 = 129）。目盛りは 0・4・8・12・16・20 だけで、6 は書かない。
        // 不正解例は「塩酸と同じ 10 cm³」（x = 175、46px はなれる）。0 cm³（x 60）や はじめの位置 20 cm³（x 290）も 60px 以上はなれる
        figure: scene([
          { type: 'line', points: [[60, 30], [60, 200], [300, 200]], width: 2 },
          { type: 'text', x: 8, y: 20, text: '水素イオンの数', size: 12 },
          { type: 'text', x: 312, y: 236, text: '加えた水酸化ナトリウム水溶液〔cm³〕', size: 12, anchor: 'end' },
        ].concat([0, 4, 8, 12, 16, 20].map(v => ({ type: 'line', points: [[volX(v), 200], [volX(v), 206]], width: 2 })),
          [0, 4, 8, 12, 16, 20].map(v => ({ type: 'text', x: volX(v), y: 220, text: String(v), size: 12, anchor: 'middle' })), [
          { type: 'line', points: [[60, 80], [volX(6), 200], [290, 200]], color: 'green', width: 3 },
          { type: 'circle', id: 'mark', x: 290, y: 200, r: 10, fill: 'blue', stroke: 'ink' },
        ])),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: volX(6), y: 200 },
        samples: { correct: { x: volX(6), y: 200 }, wrong: { x: volX(10), y: 200 } },
        explanation: 'BTB 溶液が緑色になるのは中性のときで、H+ がすべて OH- と結びついて水になり、0 になったときです。グラフで水素イオンの数が 0 になるのは 6 cm³ なので、そこに点を置きます。それより多く加えると OH- があまり、青色になります。',
        hint: '中性のとき、水素イオンはいくつ残っているかな。',
      }),
      choice({
        id: 'ion-4-p5', concept: 'io-neutral',
        prompt: 'うすい塩酸に水酸化ナトリウム水溶液を加えていくとき、中性になるまでのあいだ、数が変わらないイオンはどれ？',
        options: ['Cl-', 'H+', 'Na+'],
        answer: 'a',
        explanation: '塩化物イオン Cl- は、ほかのイオンと結びつかずに水溶液の中に残るので、数は変わりません。H+ は OH- と結びついて減り、Na+ は加えた分だけ増えます。',
        hint: '水になるイオン、加えるたびに入ってくるイオンを、それぞれ考えよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'ion-4-r1', concept: 'io-neutral',
        prompt: 'うすい塩酸に水酸化ナトリウム水溶液を少しずつ加えました。ア〜ウのグラフのうち、塩化物イオン Cl- の数の変化を表しているのはどれ？',
        figure: scene(miniGraphs(['up', 'flat', 'down']).concat([
          { type: 'region', id: 'r1', x: 60, y: 202, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 202, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 202, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: '塩化物イオン Cl- は、ほかのイオンと結びつかないので、数は変わりません（イ）。アのように増えるのは、加えた分だけ入ってくる Na+、ウのように減って 0 になるのは、OH- と結びついて水になる H+ です。',
        hint: '水にも沈殿にもならず、そのまま残るイオンだよ。',
      }),
      choice({
        id: 'ion-4-r2', concept: 'io-neutral',
        prompt: '塩酸と水酸化ナトリウム水溶液を混ぜて、ちょうど中性になった液を蒸発皿にとり、水を蒸発させました。あとに残る白い固体は何？',
        options: ['塩化ナトリウム', '水酸化ナトリウム', '何も残らない'],
        answer: 'a',
        explanation: '中和で、塩酸の Cl- と水酸化ナトリウムの Na+ から塩化ナトリウム（塩）ができます。塩化ナトリウムは水にとけているので、水を蒸発させると白い固体として出てきます。',
        hint: 'HCl ＋ NaOH → ？ ＋ H₂O',
      }),
      fill({
        id: 'ion-4-r3', concept: 'io-neutral',
        prompt: '塩酸と水酸化ナトリウム水溶液の中和を表す化学反応式です。空らんに入るものを選ぼう。',
        text: 'HCl ＋ NaOH → [b1] ＋ H₂O',
        blanks: [word('b1', ['NaCl', 'NaH', 'ClOH'], 'NaCl')],
        explanation: '酸の陰イオン Cl- とアルカリの陽イオン Na+ が結びついて、塩の塩化ナトリウム NaCl ができます。H+ と OH- からは水 H₂O ができます。',
        hint: '酸の陰イオンとアルカリの陽イオンを組み合わせよう。',
      }),
      choice({
        id: 'ion-4-r4', concept: 'io-neutral',
        prompt: 'うすい塩酸 10 cm³ とうすい水酸化ナトリウム水溶液 8 cm³ を混ぜると、ちょうど中性になりました。同じ塩酸 10 cm³ に、同じ水酸化ナトリウム水溶液を 12 cm³ 加えると、液は何性になる？',
        options: ['アルカリ性', '酸性', '中性'],
        answer: 'a',
        explanation: '塩酸 10 cm³ をちょうど中和するのは 8 cm³ です。12 cm³ 加えると 4 cm³ 分の水酸化ナトリウム水溶液があまり、OH- が残るので、アルカリ性になります。',
        hint: 'ちょうど中和する量より多く加えると、何があまるかな。',
      }),
      choice({
        id: 'ion-4-t2', concept: 'io-neutral', term: true,
        prompt: '次の説明に合う言葉はどれ？「酸の陰イオンとアルカリの陽イオンが結びついてできた物質」',
        options: ['塩', '中和', '指示薬'],
        answer: 'a',
        explanation: '酸の陰イオンとアルカリの陽イオンが結びついてできた物質を**塩**といいます。塩化ナトリウムや硫酸バリウムがその例です。水にとけやすい塩も、とけにくい塩もあります。',
        hint: '「しお」とは読まず、「えん」と読むよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'io-electrolyte', title: '電解質と電離', basic: null, lessonStageId: 'ion-1',
      checkPool: [
        choice({
          id: 'io-electrolyte-k1', concept: 'io-electrolyte',
          prompt: '次のうち、非電解質はどれ？',
          options: ['砂糖', '塩化ナトリウム', '塩化水素', '水酸化ナトリウム'],
          answer: 'a',
          explanation: '砂糖は水にとけてもイオンに分かれないので、水溶液に電流が流れない非電解質です。ほかの 3 つは水にとけると電離する電解質です。',
          hint: '砂糖水に電流は流れたかな。',
        }),
        fill({
          id: 'io-electrolyte-k2', concept: 'io-electrolyte',
          prompt: '塩化ナトリウムが電離するようすを表す式です。空らんに入るものを選ぼう。',
          text: 'NaCl → [b1] ＋ Cl-',
          blanks: [word('b1', ['Na+', 'Na-', 'Na2+'], 'Na+')],
          explanation: '塩化ナトリウムは、ナトリウムイオン Na+ と塩化物イオン Cl- に電離します。ナトリウム原子は電子を 1 個失って Na+ になります。',
          hint: 'ナトリウムは陽イオンになるよ。',
        }),
        choice({
          id: 'io-electrolyte-k3', concept: 'io-electrolyte',
          prompt: '砂糖水やエタノール水溶液に電流が流れないのはなぜ？',
          options: ['水にとけても、イオンに分かれないから', '水にとけないから', '水溶液が透明だから'],
          answer: 'a',
          explanation: '砂糖やエタノールは水にとけますが、電離せず、分子のまま水の中に散らばっています。電流を運ぶイオンがないので、電流が流れません。',
          hint: '電流が流れる水溶液には、何があったかな。',
        }),
      ],
    },
    {
      id: 'io-structure', title: '原子の構造とイオン', basic: null, lessonStageId: 'ion-1',
      checkPool: [
        choice({
          id: 'io-structure-k1', concept: 'io-structure',
          prompt: '原子核の中にあって、電気をもたない粒子はどれ？',
          options: ['中性子', '陽子', '電子'],
          answer: 'a',
          explanation: '原子核は、＋の電気をもつ陽子と、電気をもたない中性子からできています。電子は原子核のまわりにあり、−の電気をもちます。',
          hint: '名前に「中性」が入っているね。',
        }),
        choice({
          id: 'io-structure-k2', concept: 'io-structure',
          prompt: 'ふつうの原子全体が電気を帯びていないのはなぜ？',
          options: ['陽子の数と電子の数が等しいから', '陽子の数と中性子の数が等しいから', '電子が電気をもたないから'],
          answer: 'a',
          explanation: '陽子 1 個の＋の電気と、電子 1 個の−の電気は、同じ大きさです。原子では陽子と電子の数が等しいので、＋と−が打ち消し合い、全体では電気を帯びていません。',
          hint: '＋の電気をもつ粒と、−の電気をもつ粒を考えよう。',
        }),
        choice({
          id: 'io-structure-k3', concept: 'io-structure',
          prompt: '次のうち、陰イオンはどれ？',
          options: ['OH-（水酸化物イオン）', 'H+（水素イオン）', 'Na+（ナトリウムイオン）', 'Cu2+（銅イオン）'],
          answer: 'a',
          explanation: '−の電気を帯びたイオンが陰イオンです。OH- は−の電気を帯びているので陰イオンです。H+・Na+・Cu2+ は＋の電気を帯びた陽イオンです。',
          hint: 'イオン式の右上が「-」になっているものをさがそう。',
        }),
      ],
    },
    {
      id: 'io-electrolysis', title: '電気分解（塩化銅水溶液・塩酸）', basic: 'io-electrolyte', lessonStageId: 'ion-2',
      checkPool: [
        choice({
          id: 'io-electrolysis-k1', concept: 'io-electrolysis',
          prompt: '塩化銅水溶液の電気分解で、陽極付近の液をとり、赤インクで色をつけた水に加えると、どうなる？',
          options: ['赤インクの色が消える', '赤インクの色が濃くなる', '青色に変わる'],
          answer: 'a',
          explanation: '陽極からは塩素が発生し、一部は水にとけています。塩素には漂白作用があるので、赤インクの色が消えます。',
          hint: '陽極から出る気体には、どんな作用があったかな。',
        }),
        choice({
          id: 'io-electrolysis-k2', concept: 'io-electrolysis',
          prompt: '塩化銅水溶液の電気分解を続けると、水溶液の青色はどうなる？',
          options: ['うすくなる', '濃くなる', '変わらない'],
          answer: 'a',
          explanation: '塩化銅水溶液の青色は、銅イオン Cu2+ の色です。電気分解を続けると、Cu2+ が陰極で銅になって減っていくので、青色はうすくなります。',
          hint: '青色のもとになっているイオンは、陰極でどうなったかな。',
        }),
        choice({
          id: 'io-electrolysis-k3', concept: 'io-electrolysis',
          prompt: 'うすい塩酸を電気分解すると、陽極に集まる気体（塩素）は、陰極に集まる気体（水素）より少なくなります。なぜ？',
          options: ['塩素は水にとけやすいから', '塩素は水素より軽いから', '陽極では反応が起こらないから'],
          answer: 'a',
          explanation: '塩酸の電気分解では、水素と塩素が同じ体積ずつできます。しかし、塩素は水にとけやすいので、集まる量は水素より少なくなります。',
          hint: '水素と塩素の、水へのとけやすさを比べよう。',
        }),
      ],
    },
    {
      id: 'io-battery', title: 'イオンへのなりやすさと電池', basic: 'io-structure', lessonStageId: 'ion-2',
      checkPool: [
        choice({
          id: 'io-battery-k1', concept: 'io-battery',
          prompt: 'ダニエル電池の−極（亜鉛板）で起こる変化を表したものはどれ？（e- は電子）',
          options: ['Zn → Zn2+ ＋ 2e-', 'Cu2+ ＋ 2e- → Cu', 'Zn2+ ＋ 2e- → Zn'],
          answer: 'a',
          explanation: '−極では、亜鉛原子が電子を 2 個失って亜鉛イオン Zn2+ になり、水溶液にとけ出します。Cu2+ ＋ 2e- → Cu は、＋極（銅板）で起こる変化です。',
          hint: '−極では、亜鉛板がとけて細くなっていくよ。',
        }),
        choice({
          id: 'io-battery-k2', concept: 'io-battery',
          prompt: '電池を導線でつないだとき、導線を流れる電流の向きと、電子が流れる向きの関係として正しいものはどれ？',
          options: ['電流は＋極から−極へ、電子は−極から＋極へ流れる', 'どちらも＋極から−極へ流れる', 'どちらも−極から＋極へ流れる'],
          answer: 'a',
          explanation: '電子は−極から導線を通って＋極へ流れます。電流の向きは、電子の流れと反対の＋極から−極への向きと決められています。',
          hint: '電流の向きと電子の流れの向きは、反対だったね。',
        }),
        choice({
          id: 'io-battery-k3', concept: 'io-battery',
          prompt: '燃料電池で電気をとり出したとき、できる物質はどれ？',
          options: ['水', '二酸化炭素', '塩素'],
          answer: 'a',
          explanation: '燃料電池は、水素と酸素が結びついて水ができる化学変化（2H₂ ＋ O₂ → 2H₂O）から電気エネルギーをとり出します。できるのは水だけなので、環境への影響が少ないといわれます。',
          hint: '水素と酸素が結びつくと、何ができるかな。',
        }),
      ],
    },
    {
      id: 'io-acidbase', title: '酸・アルカリと指示薬・pH', basic: 'io-electrolyte', lessonStageId: 'ion-3',
      checkPool: [
        choice({
          id: 'io-acidbase-k1', concept: 'io-acidbase',
          prompt: '青色リトマス紙を赤色に変えるのは、何性の水溶液？',
          options: ['酸性', 'アルカリ性', '中性'],
          answer: 'a',
          explanation: '酸性の水溶液は、青色リトマス紙を赤色に変えます。アルカリ性の水溶液は、赤色リトマス紙を青色に変えます。中性の水溶液は、どちらの色も変えません。',
          hint: '酸っぱいレモンのしるでは、どうなったかな。',
        }),
        choice({
          id: 'io-acidbase-k2', concept: 'io-acidbase',
          prompt: 'BTB 溶液を加えると青色になる水溶液はどれ？',
          options: ['水酸化ナトリウム水溶液', '塩酸', '食塩水'],
          answer: 'a',
          explanation: 'BTB 溶液はアルカリ性で青色になります。水酸化ナトリウム水溶液はアルカリ性です。塩酸は酸性なので黄色、食塩水は中性なので緑色になります。',
          hint: 'BTB 溶液が青色になるのは、何性のときだったかな。',
        }),
        choice({
          id: 'io-acidbase-k3', concept: 'io-acidbase',
          prompt: '食塩水でしめらせたろ紙に赤色リトマス紙をのせ、中央に水酸化ナトリウム水溶液をしみこませた糸を置いて電圧を加えました。青くなった部分はどちらへ広がる？',
          options: ['陽極（＋極）側', '陰極（−極）側', 'どちらにも広がらない'],
          answer: 'a',
          explanation: 'アルカリ性を示す水酸化物イオン OH- は−の電気を帯びた陰イオンなので、陽極（＋極）側へ引かれます。だから、青くなった部分は陽極側へ広がります。',
          hint: 'OH- は、陽イオンかな、陰イオンかな。',
        }),
      ],
    },
    {
      id: 'io-neutral', title: '中和と塩', basic: 'io-acidbase', lessonStageId: 'ion-4',
      checkPool: [
        choice({
          id: 'io-neutral-k1', concept: 'io-neutral',
          prompt: '酸とアルカリの中和で、どの組み合わせでも必ずできる物質はどれ？',
          options: ['水', '塩化ナトリウム', '水素'],
          answer: 'a',
          explanation: '中和では、酸の H+ とアルカリの OH- が結びついて、必ず水ができます。塩はできますが、どんな塩ができるかは、酸とアルカリの組み合わせで変わります。',
          hint: 'H+ ＋ OH- → ？',
        }),
        choice({
          id: 'io-neutral-k2', concept: 'io-neutral',
          prompt: '硝酸と水酸化カリウム水溶液を混ぜたときにできる塩はどれ？',
          options: ['硝酸カリウム', '塩化カリウム', '硫酸カリウム'],
          answer: 'a',
          explanation: '塩は、酸の陰イオンとアルカリの陽イオンが結びついたものです。硝酸の陰イオン（硝酸イオン）と、水酸化カリウムの陽イオン（カリウムイオン）から、硝酸カリウムができます。',
          hint: '酸の名前とアルカリの金属の名前を組み合わせよう。',
        }),
        fill({
          id: 'io-neutral-k3', concept: 'io-neutral',
          prompt: '空らんに入る数を入れよう。うすい塩酸 10 cm³ は、うすい水酸化ナトリウム水溶液 8 cm³ でちょうど中性になります。',
          text: '同じ塩酸 15 cm³ をちょうど中性にするには、同じ水酸化ナトリウム水溶液が[b1]必要である。',
          blanks: [number('b1', 12, 0.1, 'cm³')],
          explanation: '塩酸と水酸化ナトリウム水溶液は 10：8 の体積の比でちょうど中和します。塩酸 15 cm³ なら、15 × 8 ÷ 10 ＝ 12 cm³ です。',
          hint: '塩酸が 1.5 倍になると、必要な水酸化ナトリウム水溶液も 1.5 倍だよ。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'ion',
    title: '化学変化とイオン',
    mascot: 'C',   // 担当の先生（ぷにカプセル。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'io-ion', title: '水溶液とイオン', order: 1, stages: [ion1, ion2] },
      { id: 'io-acid', title: '酸・アルカリと中和', order: 2, stages: [ion3, ion4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
