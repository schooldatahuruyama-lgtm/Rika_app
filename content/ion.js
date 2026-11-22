// 「化学変化とイオン」教材データ（中学3年 理科・化学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（水溶液とイオン: 電解質とイオン・電気分解と電池 / 酸・アルカリと中和: 酸とアルカリ・中和と塩）と、概念 6 つ。
// 領域 3「ミニプリント」（io-miniprint）: 先生のミニプリントの問題を書き直したステージ ion-mp1〜ion-mp10（.ai-tasks/20261106-130000_ミニプリント反映_共通.md）。
// 領域 4「ドリル」（ion-drill）: 公開のテーマ名だけを目安に自作したステージ ion-dr1〜ion-dr6（.ai-tasks/20261121-152500_ドリル問題_共通.md）。
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
  // 領域 3: ミニプリント（先生が作ったミニプリントの問題を、このアプリの形に書き直したもの）
  // プリントの文字起こしは miniprint_3nen.md。文と図は自作で、プリントの文をそのまま写していない。
  // 1 ステージ ＝ プリント 2〜4 枚ぶん。学ぶ順（電解質 → イオン → 電気分解 → 電池 → 酸・アルカリ → 中和）に並べた。
  // ================================================================

  // ---- ミニプリント用の図の部品 ----

  // うすい塩酸などに 2 枚の金属板を入れて電圧計につないだ電池。左の板（中心 x 102）と右の板（中心 x 218）、
  // 上の導線（y 40）の中央に電圧計。left・right は板の名前、leftFill・rightFill は板の色
  function cellItems(left, right, leftFill, rightFill, liquid) {
    return [
      { type: 'beaker', x: 160, y: 215, width: 190, height: 120, level: 0.7, liquid: liquid || 'water' },
      { type: 'rect', x: 96, y: 80, width: 12, height: 125, fill: leftFill || 'rock' },
      { type: 'rect', x: 212, y: 80, width: 12, height: 125, fill: rightFill || 'brown' },
      { type: 'line', points: [[102, 80], [102, 40], [140, 40]], width: 2 },
      { type: 'line', points: [[180, 40], [218, 40], [218, 80]], width: 2 },
      { type: 'symbol', x: 160, y: 40, kind: 'voltmeter' },
      { type: 'text', x: 60, y: 78, text: left, size: 12, anchor: 'middle' },
      { type: 'text', x: 262, y: 78, text: right, size: 12, anchor: 'middle' },
    ];
  }

  // 水の電気分解のあとの装置に電子オルゴールをつないだもの（燃料電池）。左の管に水素（陰極だった側）、
  // 右の管に酸素（陽極だった側）。管の中心 x は 98 と 222
  function fuelCellItems() {
    return [
      { type: 'rect', x: 116, y: 12, width: 88, height: 32, rx: 4, fill: 'yellow', label: 'オルゴール' },
      { type: 'rect', x: 60, y: 196, width: 200, height: 14, fill: 'water' },
      { type: 'rect', x: 80, y: 50, width: 36, height: 150, fill: 'water' },
      { type: 'rect', x: 80, y: 50, width: 36, height: 70, fill: 'white' },
      { type: 'rect', x: 204, y: 50, width: 36, height: 150, fill: 'water' },
      { type: 'rect', x: 204, y: 50, width: 36, height: 35, fill: 'white' },
      { type: 'rect', x: 94, y: 166, width: 8, height: 28, fill: 'gray' },
      { type: 'rect', x: 218, y: 166, width: 8, height: 28, fill: 'gray' },
      { type: 'line', points: [[98, 180], [56, 180], [56, 28], [116, 28]], width: 2 },
      { type: 'line', points: [[222, 180], [264, 180], [264, 28], [204, 28]], width: 2 },
      { type: 'text', x: 98, y: 92, text: '水素', size: 13, anchor: 'middle' },
      { type: 'text', x: 222, y: 74, text: '酸素', size: 13, anchor: 'middle' },
      { type: 'text', x: 98, y: 232, text: '陰極だった側', size: 12, anchor: 'middle' },
      { type: 'text', x: 222, y: 232, text: '陽極だった側', size: 12, anchor: 'middle' },
    ];
  }

  // 5 種類の金属の名前の札（左から 亜鉛・銅・マグネシウム・鉄・アルミニウム。中心 x 36・98・160・222・284）
  const METALS = ['亜鉛', '銅', 'マグネシウム', '鉄', 'アルミニウム'];
  function metalCards() {
    const items = [];
    METALS.forEach((name, i) => {
      const x = 36 + 62 * i;
      items.push({ type: 'rect', x: x - 30, y: 70, width: 60, height: 60, rx: 6, fill: 'glass', stroke: 'line' });
      items.push({ type: 'text', x, y: 106, text: name, size: name.length >= 5 ? 12 : 14, anchor: 'middle' });
    });
    return items;
  }
  const METALS_Q = scene([
    { type: 'text', x: 160, y: 36, text: '2 種類ずつ組み合わせて電池をつくった金属', size: 13, anchor: 'middle' },
  ].concat(metalCards(), METALS.map((_, i) => ({ type: 'region', id: 'r' + (i + 1), x: 36 + 62 * i, y: 170, r: 22, label: 'アイウエオ'[i] }))));

  // 中和のモデルの問題（水の分子はかいていない）。塩化水素 2 個分の塩酸に、水酸化ナトリウムを 1 個分ずつ加えた。
  // ア 1 個分（H+ 1・Cl- 2・Na+ 1）、イ 2 個分（Cl- 2・Na+ 2）、ウ 3 個分（Cl- 2・Na+ 3・OH- 1）
  const MODEL_Q = scene([
    { type: 'text', x: 160, y: 24, text: '加えた水酸化ナトリウム: ア 1 個分、イ 2 個分、ウ 3 個分', size: 12, anchor: 'middle' },
  ].concat(modelFrames([['H+', 'Cl-', 'Na+', 'Cl-'], ['Na+', 'Cl-', 'Na+', 'Cl-'], ['Na+', 'Cl-', 'Na+', 'Cl-', 'Na+', 'OH-']]), [
    { type: 'region', id: 'r1', x: 56, y: 196, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 196, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 264, y: 196, r: 22, label: 'ウ' },
    { type: 'text', x: 160, y: 236, text: '（水の分子はかいていない）', size: 12, anchor: 'middle' },
  ]));

  // 中和の体積の数直線（0〜50 cm³ を x 40〜290。1 cm³ ＝ 5px）
  const lineX = (v) => 40 + 5 * v;
  function volumeLine() {
    const items = [{ type: 'line', points: [[lineX(0), 150], [lineX(50), 150]], width: 2 }];
    [0, 10, 20, 30, 40, 50].forEach(v => {
      items.push({ type: 'line', points: [[lineX(v), 144], [lineX(v), 156]], width: 2 });
      items.push({ type: 'text', x: lineX(v), y: 176, text: String(v), size: 12, anchor: 'middle' });
    });
    items.push({ type: 'text', x: 300, y: 200, text: '水酸化ナトリウム水溶液〔cm³〕', size: 12, anchor: 'end' });
    return items;
  }

  // 体積の帯（1 cm³ ＝ 10px、左はし x 40）。y は帯の上、fill は色
  function volumeBar(y, v, fill, text) {
    return [
      { type: 'rect', x: 40, y, width: 10 * v, height: 22, fill, stroke: 'line' },
      { type: 'text', x: 46 + 10 * v, y: y + 16, text, size: 12 },
    ];
  }

  // ---- ステージ ion-mp1: プリント 1 電解質と非電解質（電解質／電解質2／電解質３） ----
  const ionMp1 = {
    id: 'ion-mp1', areaId: 'io-ion', free: true, title: 'プリント 1: 電解質と非電解質', minutes: 5, concepts: ['io-electrolyte'],
    lessons: [
      {
        id: 'ion-mp1-c1',
        text: '水溶液に電流が流れるかは、電極を電池と豆電球（または電流計）につないで調べます。豆電球がつかなくても、電流計の針が動けば電流は流れています。調べる水溶液をかえるたびに、電極を**精製水**で洗います。',
        // 写真: 電流が流れるかを調べる装置。ビーカー (65〜135, 90〜172) の無色の水溶液に、ステンレスの電極 2 本 (x 80・118)。
        // 左下の乾電池 (78〜142, 172〜198) → 黒い導線 → 左の電極 → 水溶液 → 右の電極 → 赤い導線 → 豆電球 (215, 150。点灯) → 電池 と 1 つの輪。
        // 右はしに精製水の洗浄びん (262〜312, 15〜175)。上と左下は白い余白
        figure: scene([
          photo('ion-mp1-c1'),
          tag(4, 18, '豆電球がつかないときは電流計で調べる', { size: 13, anchor: 'start' }),
          pointer(94, 48, 81, 96), pointer(106, 48, 117, 96), tag(100, 44, '電極', { bold: true }),
          pointer(216, 132, 216, 143), tag(216, 126, '豆電球', { bold: true }),
          tag(287, 120, '精製水', { size: 13 }),
          pointer(56, 208, 98, 152), tag(46, 222, '調べる水溶液', { size: 13 }),
          tag(316, 206, '水溶液をかえるたびに', { size: 13, anchor: 'end' }),
          tag(316, 224, '電極を精製水で洗う', { size: 13, anchor: 'end' }),
        ]),
      },
      {
        id: 'ion-mp1-c2',
        text: '食塩（塩化ナトリウム）・塩化水素・水酸化ナトリウムは**電解質**、砂糖・エタノールは**非電解質**です。食塩水・塩酸・果物のしるには電流が流れます。精製水には流れず、水道水にはわずかに物質がとけているので、少しだけ流れます。',
        // 電流が流れる水溶液と流れない水溶液の表
        figure: scene([
          { type: 'rect', x: 10, y: 20, width: 145, height: 200, rx: 8, fill: '#FFF3C4', stroke: 'line' },
          { type: 'rect', x: 165, y: 20, width: 145, height: 200, rx: 8, fill: 'glass', stroke: 'line' },
          { type: 'text', x: 82, y: 46, text: '電流が流れる', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 237, y: 46, text: '流れない', size: 14, anchor: 'middle', bold: true },
          ...['食塩水', '塩酸', '水酸化ナトリウム水溶液', '果物のしる', '水道水（わずか）'].map((t, i) => ({ type: 'text', x: 82, y: 84 + 28 * i, text: t, size: t.length > 8 ? 12 : 13, anchor: 'middle' })),
          ...['砂糖水', 'エタノール水溶液', '精製水'].map((t, i) => ({ type: 'text', x: 237, y: 84 + 28 * i, text: t, size: 13, anchor: 'middle' })),
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-mp1-w1', concept: 'io-electrolyte',
      prompt: '予想しよう。純粋な水（精製水）に電極を入れて電池と豆電球につなぐと、電流は流れると思う？',
      options: ['ほとんど流れない', 'よく流れて豆電球が明るくつく', '流れるが、すぐに止まる'],
      answer: 'a',
      explanation: '精製水には、イオンになる物質がほとんどとけていないので、電流はほとんど流れません。電流が流れるかどうかは、とけている物質で決まります。',
      hint: '水に何かがとけていないと、電流は流れにくいよ。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp1-p1', concept: 'io-electrolyte',
        prompt: 'ア 食塩水、イ 塩酸、ウ エタノール水溶液、エ 果物のしる に電極を入れて、電流が流れるかを調べました。電流が流れないのはア〜エのどれ？',
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '電流が流れないのはどれ？', size: 14, anchor: 'middle' },
          ...[40, 120, 200, 280].map(x => ({ type: 'beaker', x, y: 150, width: 60, height: 76, level: 0.6 })),
          ...[['食塩水', 40, 172], ['塩酸', 120, 172], ['エタノール', 200, 170], ['水溶液', 200, 184], ['果物のしる', 280, 172]].map(([t, x, y]) => ({ type: 'text', x, y, text: t, size: 12, anchor: 'middle' })),
          { type: 'region', id: 'r1', x: 40, y: 214, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 120, y: 214, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 200, y: 214, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 280, y: 214, r: 22, label: 'エ' },
        ]),
        answer: 'r3',
        explanation: 'エタノールは水にとけてもイオンに分かれない非電解質なので、エタノール水溶液には電流が流れません。食塩水・塩酸・果物のしるには電解質がとけているので、電流が流れます。',
        hint: '水にとけてもイオンに分かれない物質がとけているのはどれかな。',
      }),
      fill({
        id: 'ion-mp1-t1', concept: 'io-electrolyte', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水にとかしたとき、水溶液に電流が流れる物質を[b1]、流れない物質を[b2]という。',
        blanks: [
          word('b1', ['電解質', '非電解質', '中性子'], '電解質'),
          word('b2', ['電解質', '非電解質', '中性子'], '非電解質'),
        ],
        explanation: '水溶液に電流が流れる物質が**電解質**（食塩・塩化水素など）、流れない物質が**非電解質**（砂糖・エタノールなど）です。',
        hint: '「非」は「〜ではない」という意味だよ。',
      }),
      choice({
        id: 'ion-mp1-p2', concept: 'io-electrolyte',
        prompt: '食塩・砂糖・塩化水素・エタノール・水酸化ナトリウムを、それぞれ水にとかして調べました。電流が流れる物質をすべて選んだものはどれ？',
        options: ['食塩・塩化水素・水酸化ナトリウム', '食塩・砂糖', '砂糖・エタノール', '塩化水素・エタノール・水酸化ナトリウム'],
        answer: 'a',
        explanation: '食塩（塩化ナトリウム）・塩化水素・水酸化ナトリウムは、水にとけると陽イオンと陰イオンに分かれる電解質です。砂糖とエタノールは非電解質で、水溶液に電流が流れません。',
        hint: '砂糖とエタノールは、とけてもイオンに分かれないよ。',
      }),
      choice({
        id: 'ion-mp1-p3', concept: 'io-electrolyte',
        prompt: 'ある水溶液に電極を入れたとき、豆電球はつかなかったが、電流計の針は少し動きました。この水溶液に電流は流れたといってよい？',
        options: ['流れたといってよい', '流れていないといえる', '豆電球がつかないので分からない'],
        answer: 'a',
        explanation: '電流が小さいと、豆電球は光りません。電流計の針が動いたのなら、小さいながらも電流は流れています。豆電球だけで調べると、小さな電流を見落とします。',
        hint: '電流計は、豆電球より小さな電流まで調べられるよ。',
      }),
      fill({
        id: 'ion-mp1-p4', concept: 'io-electrolyte',
        prompt: '精製水と水道水に電流が流れるかを調べました。空らんに入る言葉を選ぼう。',
        text: '精製水には電流が[b1]。水道水には電流が[b2]。',
        blanks: [
          word('b1', ['流れない', 'わずかに流れる', 'よく流れる'], '流れない'),
          word('b2', ['流れない', 'わずかに流れる', 'よく流れる'], 'わずかに流れる'),
        ],
        explanation: '精製水は、ほとんど水だけなので電流が流れません。水道水には、わずかに電解質（ミネラルなど）がとけているので、少しだけ電流が流れます。',
        hint: '水道水は、純粋な水ではないよ。',
      }),
      choice({
        id: 'ion-mp1-p5', concept: 'io-electrolyte',
        prompt: '水溶液に電流が流れるかを調べるとき、調べる水溶液をかえるたびにすることはどれ？',
        options: ['電極を精製水で洗う', '電極を新しい水溶液で洗う', '電池を新しいものにかえる'],
        answer: 'a',
        explanation: '電極に前の水溶液が残っていると、次の水溶液に混ざってしまいます。電流がほとんど流れない精製水で洗えば、結果に影響しません。',
        hint: '前の水溶液が混ざらないようにするには？',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-mp1-r1', concept: 'io-electrolyte',
        prompt: '食塩水と砂糖水に、それぞれ電流が流れるかを調べました。結果として正しいものはどれ？',
        options: ['食塩水は流れ、砂糖水は流れない', '砂糖水は流れ、食塩水は流れない', 'どちらも流れる', 'どちらも流れない'],
        answer: 'a',
        explanation: '食塩は水にとけると Na+ と Cl- に分かれる電解質なので、食塩水には電流が流れます。砂糖は非電解質なので、砂糖水には流れません。',
        hint: '食塩と砂糖のうち、イオンに分かれるのはどちらかな。',
      }),
      choice({
        id: 'ion-mp1-r2', concept: 'io-electrolyte',
        prompt: '食塩水・砂糖水・果物のしる・エタノール水溶液・塩酸のうち、電流が流れるものをすべて選んだものはどれ？',
        options: ['食塩水・果物のしる・塩酸', '食塩水・砂糖水・塩酸', '砂糖水・エタノール水溶液', 'すべての水溶液'],
        answer: 'a',
        explanation: '食塩水・塩酸には電解質がとけています。果物のしるにも、酸などの電解質がとけているので電流が流れます。砂糖水とエタノール水溶液には流れません。',
        hint: '砂糖とエタノールは非電解質だったね。',
      }),
      choice({
        id: 'ion-mp1-r3', concept: 'io-electrolyte',
        prompt: '水道水に電流がわずかに流れるのはなぜ？',
        options: ['水道水には、電解質がわずかにとけているから', '水そのものが電解質だから', '水道水は温度が高いから'],
        answer: 'a',
        explanation: '水道水には、地面などからとけこんだ物質（ミネラル）や、消毒のための物質がわずかにとけています。それらが電解質なので、少しだけ電流が流れます。',
        hint: '精製水との違いは、何かがとけているかどうかだよ。',
      }),
      choice({
        id: 'ion-mp1-r4', concept: 'io-electrolyte', term: true,
        prompt: '次の説明に合う言葉はどれ？「水にとかしても、水溶液に電流が流れない物質」',
        options: ['非電解質', '電解質', 'イオン'],
        answer: 'a',
        explanation: '水にとかしても水溶液に電流が流れない物質を**非電解質**といいます。砂糖やエタノールがその例です。',
        hint: '電解質ではない物質、という意味の言葉だよ。',
      }),
    ],
  };

  // ---- ステージ ion-mp2: プリント 2 原子の構造とイオン・電離（ヘリウム原子の構造／イオンのでき方／電離　イオン式／電離の式　たくさん） ----
  const ionMp2 = {
    id: 'ion-mp2', areaId: 'io-ion', free: true, title: 'プリント 2: 原子の構造とイオン・電離', minutes: 5, concepts: ['io-structure', 'io-electrolyte'],
    lessons: [
      {
        id: 'ion-mp2-c1',
        text: 'ヘリウム原子は、中心の**原子核**に陽子 2 個と中性子 2 個があり、そのまわりに電子が 2 個あります。原子が電子を失うと**陽イオン**、電子を受け取ると**陰イオン**になります。原子やそのまとまりが電気を帯びたものが**イオン**です。',
        // ヘリウム原子のモデルと、イオンのでき方
        figure: scene(heliumItems().concat([
          { type: 'text', x: 110, y: 24, text: 'ヘリウム原子', size: 13, anchor: 'middle' },
          { type: 'text', x: 200, y: 70, text: '電子を失う', size: 12 },
          { type: 'text', x: 214, y: 90, text: '→ 陽イオン', size: 13, bold: true },
          { type: 'text', x: 200, y: 150, text: '電子を受け取る', size: 12 },
          { type: 'text', x: 214, y: 170, text: '→ 陰イオン', size: 13, bold: true },
        ])),
      },
      {
        id: 'ion-mp2-c2',
        text: '電離のようすは、化学式の右下の数だけイオンができるように書きます。FeCl₂ → Fe2+ ＋ 2Cl-、H₂SO₄ → 2H+ ＋ SO₄2-、KOH → K+ ＋ OH- です。式の右側の＋と−の電気の合計は、0 になります。',
        // 電離の式の例
        figure: scene([
          { type: 'text', x: 160, y: 34, text: '電離の式', size: 15, anchor: 'middle', bold: true },
          { type: 'text', x: 40, y: 78, text: 'NaCl → Na+ ＋ Cl-', size: 15 },
          { type: 'text', x: 40, y: 112, text: 'FeCl₂ → Fe2+ ＋ 2Cl-', size: 15 },
          { type: 'text', x: 40, y: 146, text: 'H₂SO₄ → 2H+ ＋ SO₄2-', size: 15 },
          { type: 'text', x: 40, y: 180, text: 'KOH → K+ ＋ OH-', size: 15 },
          { type: 'text', x: 160, y: 222, text: '＋と−の電気の合計は 0', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-mp2-w1', concept: 'io-structure',
      prompt: '予想しよう。原子は＋の電気をもつ陽子と、−の電気をもつ電子をふくんでいるのに、原子全体は電気を帯びていません。なぜだと思う？',
      options: ['陽子と電子の数が等しいから', '電子が原子核の中にあるから', '中性子が電気を消すから'],
      answer: 'a',
      explanation: '原子では、陽子の数と電子の数が等しいので、＋と−の電気が打ち消し合い、全体として電気を帯びていません。ヘリウム原子なら、陽子も電子も 2 個です。',
      hint: '＋と−が同じだけあると、どうなるかな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp2-p1', concept: 'io-structure',
        prompt: '図はヘリウム原子のモデルです（「＋」の粒は＋の電気、「−」の粒は−の電気をもつ）。ア〜ウの線が指している粒のうち、陽子はどれ？',
        // ア → 原子核の右上の印のない粒（中性子）、イ → 外側の電子、ウ → 原子核の右下の ＋ の粒（陽子）
        figure: scene(heliumItems().concat([
          { type: 'line', points: [[230, 70], [131, 112]], color: 'gray', width: 2 },
          { type: 'line', points: [[60, 197], [98, 197]], color: 'gray', width: 2 },
          { type: 'line', points: [[230, 186], [131, 140]], color: 'gray', width: 2 },
          { type: 'region', id: 'r1', x: 252, y: 66, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 36, y: 197, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 252, y: 190, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '陽子は原子核の中にあって、＋の電気をもつ粒です。ウが陽子、アは電気をもたない中性子、外側のイは−の電気をもつ電子です。',
        hint: '陽子は原子核の中の、＋の印の粒だよ。',
      }),
      fill({
        id: 'ion-mp2-t1', concept: 'io-structure', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '原子の中心の[b1]は、＋の電気をもつ[b2]と、電気をもたない[b3]からできている。',
        blanks: [
          word('b1', ['原子核', '電子', 'イオン'], '原子核'),
          word('b2', ['陽子', '中性子', '電子'], '陽子'),
          word('b3', ['陽子', '中性子', '電子'], '中性子'),
        ],
        explanation: '原子の中心にある**原子核**は、＋の電気をもつ**陽子**と、電気をもたない**中性子**からできています。原子核のまわりには、−の電気をもつ電子があります。',
        hint: '「中性」は、＋でも−でもないという意味だよ。',
      }),
      fill({
        id: 'ion-mp2-p2', concept: 'io-structure',
        prompt: 'イオンのでき方です。空らんに入る言葉を選ぼう。',
        text: '原子が電子を[b1]と＋の電気を帯びた[b2]になり、電子を受け取ると−の電気を帯びた[b3]になる。',
        blanks: [
          word('b1', ['失う', '受け取る'], '失う'),
          word('b2', ['陽イオン', '陰イオン'], '陽イオン'),
          word('b3', ['陽イオン', '陰イオン'], '陰イオン'),
        ],
        explanation: '−の電気をもつ電子を失うと、＋の電気が多くなるので陽イオンになります。電子を受け取ると−の電気が多くなるので陰イオンになります。',
        hint: '−の電気をもつものが減ると、全体はどちらの電気が多くなるかな。',
      }),
      choice({
        id: 'ion-mp2-p3', concept: 'io-structure',
        prompt: '原子や、原子のまとまりが電気を帯びたものを何という？',
        options: ['イオン', '分子', '原子核'],
        answer: 'a',
        explanation: '原子や原子のまとまりが、電子を失ったり受け取ったりして電気を帯びたものを**イオン**といいます。Na+ や OH- がその例です。',
        hint: 'Na+ や Cl- をまとめて何とよんだかな。',
      }),
      fill({
        id: 'ion-mp2-p4', concept: 'io-electrolyte',
        prompt: '塩化鉄 FeCl₂ が電離するようすを表す式です。空らんに入るものを選ぼう。',
        text: 'FeCl₂ → [b1] ＋ [b2]',
        blanks: [
          word('b1', ['Fe2+', 'Fe+', 'Fe2-'], 'Fe2+'),
          word('b2', ['2Cl-', 'Cl-', 'Cl₂'], '2Cl-'),
        ],
        explanation: 'FeCl₂ には塩素が 2 個あるので、塩化物イオン Cl- が 2 個できます。−の電気が 2 つ分なので、鉄イオンは＋の電気を 2 つもつ Fe2+ です。',
        hint: 'Cl の右下の数と、電気の合計が 0 になることから考えよう。',
      }),
      fill({
        id: 'ion-mp2-p5', concept: 'io-electrolyte',
        prompt: '硫酸 H₂SO₄ が電離するようすを表す式です。空らんに入るものを選ぼう。',
        text: 'H₂SO₄ → [b1] ＋ SO₄2-',
        blanks: [word('b1', ['2H+', 'H+', 'H₂'], '2H+')],
        explanation: '硫酸 H₂SO₄ には水素が 2 個あるので、水素イオン H+ が 2 個できます。硫酸イオン SO₄2- の−2 と、H+ 2 個の＋2 で、電気の合計が 0 になります。',
        hint: 'H の右下の数を見よう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'ion-mp2-r1', concept: 'io-structure',
        prompt: '空らんに入る数を入れよう。',
        text: 'ヘリウム原子には陽子が 2 個ある。だから、電子は[b1]ある。',
        blanks: [number('b1', 2, 0, '個')],
        explanation: '原子では、陽子の数と電子の数が等しくなっています。ヘリウム原子は陽子が 2 個なので、電子も 2 個です。',
        hint: '原子全体が電気を帯びていないことから考えよう。',
      }),
      choice({
        id: 'ion-mp2-r2', concept: 'io-structure',
        prompt: '原子がイオンになるとき、原子が失ったり受け取ったりする粒はどれ？',
        options: ['電子', '陽子', '中性子'],
        answer: 'a',
        explanation: 'イオンは、原子が電子を失ったり受け取ったりしてできます。原子核の中の陽子や中性子の数は変わりません。',
        hint: '原子核のまわりにあって、動きやすい粒だよ。',
      }),
      fill({
        id: 'ion-mp2-r3', concept: 'io-electrolyte',
        prompt: '電離のようすを表す式です。空らんに入るものを選ぼう。',
        text: 'NaOH → Na+ ＋ [b1]、KOH → [b2] ＋ OH-',
        blanks: [
          word('b1', ['OH-', 'OH+', 'O2-'], 'OH-'),
          word('b2', ['K+', 'K-', 'K2+'], 'K+'),
        ],
        explanation: '水酸化ナトリウムは Na+ と OH-、水酸化カリウムは K+ と OH- に電離します。OH- は水酸化物イオンで、酸素と水素のまとまりが−の電気を帯びたものです。',
        hint: 'OH- は、−の電気を 1 つもつイオンだよ。',
      }),
      fill({
        id: 'ion-mp2-r4', concept: 'io-electrolyte',
        prompt: '電離のようすを表す式です。空らんに入るものを選ぼう。',
        text: 'NaCl → [b1] ＋ Cl-、HCl → [b2] ＋ Cl-',
        blanks: [
          word('b1', ['Na+', 'Na-', 'Na2+'], 'Na+'),
          word('b2', ['H+', 'H-', 'H₂'], 'H+'),
        ],
        explanation: '塩化ナトリウムは Na+ と Cl-、塩化水素は H+ と Cl- に電離します。Cl- の−1 と、陽イオンの＋1 で、電気の合計が 0 になります。',
        hint: 'Cl- と組になる陽イオンは、＋の電気を 1 つもつよ。',
      }),
      choice({
        id: 'ion-mp2-r5', concept: 'io-electrolyte', term: true,
        prompt: '次の説明に合う言葉はどれ？「電解質が水にとけて、陽イオンと陰イオンに分かれること」',
        options: ['電離', '電気分解', '受精'],
        answer: 'a',
        explanation: '電解質が水にとけて陽イオンと陰イオンに分かれることを**電離**といいます。電流を流さなくても、水にとけるだけで起こります。',
        hint: '「電」の字がつく言葉で、水にとけるだけで起こるよ。',
      }),
      choice({
        id: 'ion-mp2-r6', concept: 'io-electrolyte',
        prompt: '砂糖のような非電解質の水溶液に電流が流れないのはなぜ？',
        options: ['水にとけても電離せず、イオンができないから', '水にとけないから', '水溶液が無色だから'],
        answer: 'a',
        explanation: '電流が流れるのは、水溶液の中のイオンが動くからです。非電解質は水にとけても電離しないので、イオンができず、電流が流れません。',
        hint: '水溶液に電流が流れるとき、動いているのは何かな。',
      }),
    ],
  };

  // ---- ステージ ion-mp3: プリント 3 塩化銅の電気分解（塩化銅の電気分解／2／モデル） ----
  const ionMp3 = {
    id: 'ion-mp3', areaId: 'io-ion', free: true, title: 'プリント 3: 塩化銅の電気分解', minutes: 5, concepts: ['io-electrolysis'],
    lessons: [
      {
        id: 'ion-mp3-c1',
        text: '青色の**塩化銅水溶液**に電流を流し続けると、陰極に赤色の物質（**銅**）が付き、陽極からは刺激臭のある気体（**塩素**）が出ます。化学反応式は CuCl₂ → Cu ＋ Cl₂ です。続けると、水溶液の青色はうすくなります。',
        // 写真（ion-2-c1 の使い回し）: ビーカー (67〜245, 45〜235)、液面 y 82。左の炭素棒 (106〜126) は黒い導線につながり、下半分に赤茶色の銅が付く。
        // 右の炭素棒 (196〜212) は赤い導線につながり、まわりに泡。導線の色（黒＝−、赤＝＋）に合わせて、左を陰極、右を陽極とした（ion-2-c1 と同じ）
        figure: scene([
          photo('ion-2-c1'),
          tag(160, 14, 'CuCl₂ → Cu ＋ Cl₂', { bold: true }),
          pointer(66, 96, 108, 70), tag(4, 100, '陰極（−）', { size: 13, bold: true, anchor: 'start' }),
          tag(4, 120, '黒い導線', { size: 13, anchor: 'start' }),
          pointer(60, 150, 106, 150), tag(33, 155, '赤い銅', { size: 13 }),
          tag(33, 173, 'が付く', { size: 13 }),
          pointer(254, 96, 213, 70), tag(316, 100, '陽極（＋）', { size: 13, bold: true, anchor: 'end' }),
          tag(316, 120, '赤い導線', { size: 13, anchor: 'end' }),
          pointer(250, 150, 222, 150), tag(316, 155, '塩素が出る', { size: 13, anchor: 'end' }),
          tag(316, 173, '（刺激臭）', { size: 13, anchor: 'end' }),
          tag(160, 212, '塩化銅水溶液（青色）', { size: 13 }),
          tag(160, 230, '→ 続けると青色がうすくなる', { size: 13 }),
        ]),
      },
      {
        id: 'ion-mp3-c2',
        anim: 'io-cucl2-ions',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '銅イオン Cu2+ は陰極へ移動し、電子を 2 個受け取って銅原子になり、陰極に付きます。塩化物イオン Cl- は陽極へ移動し、電子を 1 個失って塩素原子になります。塩素原子は 2 個結びついて塩素分子 Cl₂ になり、気体として出ていきます。',
        // イオンの動く向きと、電極で起こる変化
        figure: scene(electrolysisItems('sky').concat([
          ion(150, 184, 'Cu2+'),
          { type: 'arrow', x1: 174, y1: 184, x2: 200, y2: 184, color: 'blue', width: 2 },
          ion(170, 150, 'Cl-'),
          { type: 'arrow', x1: 150, y1: 150, x2: 120, y2: 150, color: 'blue', width: 2 },
          { type: 'text', x: 78, y: 100, text: '陽極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 242, y: 100, text: '陰極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 70, y: 234, text: '2Cl- → Cl₂ ＋ 2e-', size: 12, anchor: 'middle' },
          { type: 'text', x: 248, y: 234, text: 'Cu2+ ＋ 2e- → Cu', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'ion-mp3-w1', concept: 'io-electrolysis',
      prompt: '塩化銅水溶液は何色をしている？',
      options: ['青色', '赤色', '無色'],
      answer: 'a',
      explanation: '塩化銅水溶液は青色です。この青色は、水溶液の中の銅イオン Cu2+ によるものです。電気分解を続けると銅イオンが減るので、青色がうすくなっていきます。',
      hint: '銅イオンをふくむ水溶液の色だよ。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp3-p1', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液に電流を流しました。上の電池の左が＋極、右が−極です。気体が発生するのは、ア（左の電極）・イ（右の電極）のどちら？',
        figure: scene(electrolysisItems('sky').concat([
          { type: 'region', id: 'r1', x: 80, y: 176, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 240, y: 176, r: 22, label: 'イ' },
        ])),
        answer: 'r1',
        explanation: '電源の＋極につないだ左の電極（ア）が陽極です。陽極には陰イオンの Cl- が引かれ、塩素の気体が発生します。陰極（イ）には赤い銅が付きます。',
        hint: '塩素のもとになる Cl- は陰イオン。＋極と−極のどちらに引かれるかな。',
      }),
      fill({
        id: 'ion-mp3-t1', concept: 'io-electrolysis', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '塩化銅水溶液を電気分解すると、陽極から[b1]が発生し、陰極に赤色の[b2]が付く。',
        blanks: [
          word('b1', ['塩素', '水素', '酸素'], '塩素'),
          word('b2', ['銅', '塩素', '亜鉛'], '銅'),
        ],
        explanation: '陽極からは刺激臭のある**塩素**が発生し、陰極には赤色の**銅**が付きます。塩化銅が銅と塩素に分かれたのです。',
        hint: '塩化銅という名前の中に、答えの 2 つがかくれているよ。',
      }),
      fill({
        id: 'ion-mp3-p2', concept: 'io-electrolysis',
        prompt: '塩化銅が銅と塩素に分かれる化学変化を、化学反応式で表します。空らんに入るものを選ぼう。',
        text: 'CuCl₂ → [b1] ＋ [b2]',
        blanks: [
          word('b1', ['Cu', 'Cu2+', '2Cu'], 'Cu'),
          word('b2', ['Cl₂', '2Cl', 'Cl-'], 'Cl₂'),
        ],
        explanation: '塩化銅 CuCl₂ は、銅 Cu と塩素 Cl₂ に分かれます。塩素は原子が 2 個結びついた分子で出てくるので Cl₂ と書きます。',
        hint: '矢印の左右で、Cu と Cl の数が同じになるようにしよう。',
      }),
      choice({
        id: 'ion-mp3-p3', concept: 'io-electrolysis',
        prompt: '陽極（＋極）から塩素が出ることから、水溶液の中で塩素はどんな形で存在していると考えられる？',
        options: ['−の電気を帯びた陰イオン（塩化物イオン）', '＋の電気を帯びた陽イオン', '電気を帯びていない塩素分子'],
        answer: 'a',
        explanation: '＋と−の電気は引き合います。塩素が陽極（＋）に集まるのは、水溶液の中で−の電気を帯びた塩化物イオン Cl- として存在しているからです。',
        hint: '陽極は＋。＋に引かれるのは、どちらの電気を帯びたものかな。',
      }),
      fill({
        id: 'ion-mp3-p4', concept: 'io-electrolysis',
        prompt: '空らんに入る数を入れよう。',
        text: '陰極では、銅イオン Cu2+ 1 個が電子を[b1]受け取って、銅原子になる。',
        blanks: [number('b1', 2, 0, '個')],
        explanation: 'Cu2+ は、銅原子が電子を 2 個失ったものです。陰極で電子を 2 個受け取ると、もとの銅原子にもどり、陰極に付きます（Cu2+ ＋ 2e- → Cu）。',
        hint: 'イオン式の右上の「2+」に注目しよう。',
      }),
      choice({
        id: 'ion-mp3-p5', concept: 'io-electrolysis',
        prompt: '陽極に移動した塩化物イオン Cl- は、そのあとどうなる？',
        options: ['電子を 1 個失って塩素原子になり、2 個結びついて塩素分子として出ていく', '電子を 1 個受け取って、陽極に付く', '電子を 2 個失って、銅になる'],
        answer: 'a',
        explanation: 'Cl- は陽極で電子を 1 個わたして塩素原子になります。塩素原子は 2 個結びついて塩素分子 Cl₂ になり、気体として出ていきます。',
        hint: 'Cl- の「-」は、電子が 1 個多いという意味だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-mp3-r1', concept: 'io-electrolysis',
        prompt: '陰極（−極）に銅が付くことから、水溶液の中で銅はどんな形で存在していると考えられる？',
        options: ['＋の電気を帯びた陽イオン（銅イオン）', '−の電気を帯びた陰イオン', '電気を帯びていない銅原子'],
        answer: 'a',
        explanation: '銅が陰極（−）に集まるのは、水溶液の中で＋の電気を帯びた銅イオン Cu2+ として存在しているからです。',
        hint: '陰極は−。−に引かれるのは、どちらの電気を帯びたものかな。',
      }),
      drag({
        id: 'ion-mp3-r2', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液に電流を流しました（左の電極が陽極、右の電極が陰極）。銅イオン Cu2+ が移動していく電極はどちら？ Cu2+ の丸を左右に動かして、その電極の横に置こう。',
        // 左の電極の右横 (126, 150)、右の電極の左横 (194, 150)。正解は陰極の横 (194, 150)。
        // 不正解例は陽極の横 (126, 150)（68px はなれる）。はじめの位置 x 160 も正解から 34px はなれる
        figure: scene(electrolysisItems('sky').concat([
          { type: 'text', x: 78, y: 100, text: '陽極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 242, y: 100, text: '陰極', size: 13, anchor: 'middle', bold: true },
          Object.assign(ion(160, 150, 'Cu2+'), { id: 'cu' }),
        ])),
        draggable: { itemId: 'cu', axis: 'x' },
        target: { x: 194, y: 150 },
        samples: { correct: { x: 194, y: 150 }, wrong: { x: 126, y: 150 } },
        explanation: '銅イオン Cu2+ は＋の電気を帯びているので、−の電気を帯びた陰極（右）に引かれます。陰極で電子を 2 個受け取り、銅になって付きます。',
        hint: '＋の電気と−の電気は引き合うよ。',
      }),
      choice({
        id: 'ion-mp3-r3', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液の電気分解で、電極のようすとして正しいものはどれ？',
        options: ['陽極からは泡（気体）が出て、陰極には赤い物質が付く', '陽極に赤い物質が付き、陰極からは泡が出る', 'どちらの電極からも泡が出る'],
        answer: 'a',
        explanation: '陽極からは塩素の泡が出て、プールの消毒のようなにおいがします。陰極には赤色の銅が付き、こすると金属の光沢が出ます。',
        hint: '銅が付くのは、陽イオンが引かれる電極だよ。',
      }),
    ],
  };

  // ---- ステージ ion-mp4: プリント 4 電池のしくみ（⑤電池の実験／電池のしくみ／電池のしくみ２／電池4種類の金属） ----
  const ionMp4 = {
    id: 'ion-mp4', areaId: 'io-ion', free: true, title: 'プリント 4: 電池のしくみ', minutes: 5, concepts: ['io-battery'],
    lessons: [
      {
        id: 'ion-mp4-c1',
        text: '電解質の水溶液に、**種類のちがう 2 種類の金属**を入れて導線でつなぐと、電圧が生じて電流が流れます。これが**化学電池**です。金属が 2 枚とも同じとき、水溶液が砂糖水のとき、水溶液の中で 2 枚の金属がふれ合っているときは、電圧計の針は振れません。',
        // 写真: うすい塩酸の入ったビーカー (35〜162, 88〜210) に、銀灰色の亜鉛板 (59〜83, 100〜198) と赤茶色の銅板 (114〜140, 100〜198) を離して立て、
        // 上で導線とクリップでつなぎ、右のモーター (208〜265, 145〜205) のプロペラが回る。どちらの板の表面からも小さな泡。左上・右上と下は白い余白
        figure: scene([
          photo('ion-mp4-c1'),
          pointer(40, 70, 66, 110), tag(26, 64, '亜鉛板', { bold: true }),
          pointer(106, 70, 124, 110), tag(100, 64, '銅板', { bold: true }),
          tag(264, 60, '種類のちがう', { size: 13 }),
          tag(264, 78, '2 つの金属', { size: 13 }),
          tag(264, 96, '→ 電流が流れる', { size: 13, bold: true }),
          tag(236, 226, 'モーター', { size: 13 }),
          tag(100, 232, 'うすい塩酸（電解質の水溶液）', { size: 13 }),
        ]),
      },
      {
        id: 'ion-mp4-c2',
        anim: 'io-hcl-cell',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '亜鉛板（**−極**）では、亜鉛原子が電子を 2 個失って亜鉛イオンになり、とけ出します（Zn → Zn2+ ＋ 2e-）。電子は導線を通って銅板（**＋極**）へ移り、銅板の表面で水素イオンが電子を受け取って水素になります（2H+ ＋ 2e- → H₂）。',
        // 電子の流れる向きと、電流の向き
        figure: scene(cellItems('亜鉛板（−極）', '銅板（＋極）').concat([
          { type: 'arrow', x1: 110, y1: 28, x2: 140, y2: 28, color: 'blue', width: 2 },
          { type: 'text', x: 90, y: 22, text: '電子', size: 12, anchor: 'middle', color: 'blue' },
          { type: 'arrow', x1: 210, y1: 54, x2: 184, y2: 54, color: 'orange', width: 2 },
          { type: 'text', x: 232, y: 60, text: '電流', size: 12, anchor: 'middle', color: 'orange' },
          { type: 'text', x: 60, y: 234, text: 'Zn → Zn2+ ＋ 2e-', size: 12, anchor: 'middle' },
          { type: 'text', x: 250, y: 234, text: '2H+ ＋ 2e- → H₂', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'ion-mp4-w1', concept: 'io-battery',
      prompt: '予想しよう。うすい塩酸に亜鉛板と銅板を入れて、電圧計につなぎました。電圧は生じると思う？',
      options: ['生じる', '生じない', '金属板が熱くなるだけ'],
      answer: 'a',
      explanation: '電解質の水溶液（うすい塩酸）に、種類のちがう 2 種類の金属（亜鉛と銅）を入れると、電圧が生じます。これが電池のしくみです。',
      hint: '電池になるための条件を考えよう。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp4-p1', concept: 'io-battery',
        prompt: 'うすい塩酸に亜鉛板（左）と銅板（右）を入れて、電圧計につなぎました。＋極になるのは、ア（亜鉛板）・イ（銅板）のどちら？',
        figure: scene(cellItems('亜鉛板', '銅板').concat([
          { type: 'region', id: 'r1', x: 102, y: 176, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 218, y: 176, r: 22, label: 'イ' },
        ])),
        answer: 'r2',
        explanation: '亜鉛は銅より陽イオンになりやすいので、亜鉛が電子を失ってとけ出し、亜鉛板が−極になります。電子を受け取る側の銅板（イ）が＋極です。',
        hint: '陽イオンになりやすい金属が、電子を出す−極になるよ。',
      }),
      fill({
        id: 'ion-mp4-t1', concept: 'io-battery', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '−極では、亜鉛原子が電子を失って[b1]になり、塩酸にとけ出す。＋極の銅板の表面では、[b2]が電子を受け取って水素になる。',
        blanks: [
          word('b1', ['亜鉛イオン', '水素イオン', '銅イオン'], '亜鉛イオン'),
          word('b2', ['亜鉛イオン', '水素イオン', '塩化物イオン'], '水素イオン'),
        ],
        explanation: '−極では亜鉛原子が電子を 2 個失って**亜鉛イオン** Zn2+ になります。＋極では塩酸の中の**水素イオン** H+ が電子を受け取り、水素原子が 2 個結びついて水素分子になります。',
        hint: '塩酸の中にある陽イオンは何だったかな。',
      }),
      fill({
        id: 'ion-mp4-p2', concept: 'io-battery',
        prompt: '亜鉛板・銅板・うすい塩酸の電池で起こる変化です。空らんに入るものを選ぼう（e- は電子）。',
        text: '−極: Zn → [b1] ＋ 2e-　＋極: 2[b2] ＋ 2e- → [b3]',
        blanks: [
          word('b1', ['Zn2+', 'Zn+', 'Zn2-'], 'Zn2+'),
          word('b2', ['H+', 'H-', 'Cl-'], 'H+'),
          word('b3', ['H₂', '2H+', 'Cl₂'], 'H₂'),
        ],
        explanation: '−極では亜鉛が電子を 2 個失って Zn2+ になります。＋極では H+ 2 個が電子を 1 個ずつ受け取って水素原子 2 個になり、結びついて水素分子 H₂ になります。',
        hint: '＋極で発生する気体は水素だよ。',
      }),
      choice({
        id: 'ion-mp4-p3', concept: 'io-battery',
        prompt: '次のうち、電圧が生じる（電池になる）ものはどれ？',
        options: ['亜鉛板と銅板を食塩水に入れる', '銅板 2 枚をうすい塩酸に入れる', '亜鉛板と銅板を砂糖水に入れる', 'うすい塩酸の中で亜鉛板と銅板をふれ合わせる'],
        answer: 'a',
        explanation: '電池になるのは、電解質の水溶液に種類のちがう 2 種類の金属を入れ、導線でつないだときです。金属が同じ種類、砂糖水（非電解質）、金属どうしがふれ合っているときは、電圧計の針は振れません。',
        hint: '「電解質の水溶液」と「ちがう 2 種類の金属」の両方がそろうのはどれかな。',
      }),
      choice({
        id: 'ion-mp4-p4', concept: 'io-battery',
        prompt: '電池の金属 A を電圧計の＋端子に、金属 B を−端子につなぐと、針が右（＋の向き）に振れました。＋極になっているのはどちら？',
        options: ['金属 A', '金属 B', 'このつなぎ方では分からない'],
        answer: 'a',
        explanation: '電圧計は、＋端子に電池の＋極、−端子に−極をつないだとき、針が右に振れます。だから、＋端子につないだ金属 A が＋極です。',
        hint: '電圧計は、正しくつないだときに右に振れるよ。',
      }),
      choice({
        id: 'ion-mp4-p5', concept: 'io-battery',
        prompt: '亜鉛板・銅板・うすい塩酸の電池で、導線の中の電子の流れと電流の向きの組み合わせとして正しいものはどれ？',
        options: ['電子は亜鉛板から銅板へ、電流は銅板から亜鉛板へ流れる', '電子も電流も、亜鉛板から銅板へ流れる', '電子は銅板から亜鉛板へ、電流は亜鉛板から銅板へ流れる'],
        answer: 'a',
        explanation: '亜鉛板で亜鉛が失った電子は、導線を通って銅板へ移ります。電流の向きは電子の流れと反対と決められているので、銅板（＋極）から亜鉛板（−極）へ流れます。',
        hint: '電子は−極から出ていくよ。電流の向きは、その反対だね。',
      }),
    ],
    retryPool: [
      fill({
        id: 'ion-mp4-r1', concept: 'io-battery',
        prompt: '空らんに入る数を入れよう。',
        text: '亜鉛原子 1 個は、電子を[b1]失って亜鉛イオン Zn2+ になる。',
        blanks: [number('b1', 2, 0, '個')],
        explanation: 'Zn2+ の「2+」は、＋の電気が 2 つ多いという意味です。亜鉛原子が電子を 2 個失うと Zn2+ になります。',
        hint: 'イオン式の右上の数字を見よう。',
      }),
      choice({
        id: 'ion-mp4-r2', concept: 'io-battery',
        prompt: '電池の金属 A を電圧計の＋端子に、金属 B を−端子につなぐと、針が左（反対の向き）に振れました。＋極になっているのはどちら？',
        options: ['金属 B', '金属 A', 'どちらも−極'],
        answer: 'a',
        explanation: '針が左に振れたのは、つなぎ方が電池の向きと反対だったからです。−端子につないだ金属 B が＋極、金属 A が−極です。',
        hint: '針が反対に振れたら、つなぎ方が反対だということだよ。',
      }),
      choice({
        id: 'ion-mp4-r3', concept: 'io-battery',
        prompt: 'マグネシウムと鉄を電解質の水溶液に入れて電池をつくりました。＋極になるのはどちら？',
        options: ['鉄', 'マグネシウム', 'どちらにもならない'],
        answer: 'a',
        explanation: 'マグネシウムは鉄より陽イオンになりやすいので、マグネシウムが電子を失ってとけ出し、−極になります。鉄が＋極です。',
        hint: '陽イオンになりやすいほうが−極だよ。',
      }),
      choice({
        id: 'ion-mp4-r4', concept: 'io-battery',
        prompt: '亜鉛板・銅板・うすい塩酸の電池で、銅板に移ってきた電子を受け取るのはどれ？',
        options: ['塩酸の中の水素イオン', '銅板の銅原子', '塩酸の中の塩化物イオン'],
        answer: 'a',
        explanation: '銅板の表面では、塩酸の中の水素イオン H+ が電子を受け取って水素になり、泡となって出てきます。銅板そのものは変化しません。',
        hint: '銅板の表面から出てくる気体は何だったかな。',
      }),
      choice({
        id: 'ion-mp4-r5', concept: 'io-battery',
        prompt: 'うすい塩酸に入れる金属板を、2 枚とも銅板にしました。電圧計の針はどうなる？',
        options: ['振れない（電圧は生じない）', '右に大きく振れる', '左に振れる'],
        answer: 'a',
        explanation: '電池になるには、陽イオンへのなりやすさがちがう 2 種類の金属が必要です。2 枚とも銅では、なりやすさに差がないので、電圧は生じません。',
        hint: '電池に必要なのは、何種類の金属だったかな。',
      }),
      choice({
        id: 'ion-mp4-r6', concept: 'io-battery',
        prompt: 'うすい塩酸の中で、亜鉛板と銅板を直接ふれ合わせました。電圧計の針はどうなる？',
        options: ['振れない', '右に大きく振れる', '左に大きく振れる'],
        answer: 'a',
        explanation: '金属板どうしがふれ合うと、電子は電圧計を通らずに、ふれ合った所から直接移ってしまいます。そのため、電圧計の針は振れません。',
        hint: '電子が、導線と電圧計を通る道を使わなくなるよ。',
      }),
    ],
  };

  // ---- ステージ ion-mp5: プリント 5 金属の組み合わせと電池（電池５種類の金属2／実験プリント　電池／木炭電池） ----
  const ionMp5 = {
    id: 'ion-mp5', areaId: 'io-ion', free: true, title: 'プリント 5: 金属の組み合わせと木炭電池', minutes: 5, concepts: ['io-battery'],
    lessons: [
      {
        id: 'ion-mp5-c1',
        text: '鉄・銅・亜鉛・マグネシウム・アルミニウムから 2 種類ずつ選んで電池をつくると、＋極になりやすい順は**銅 ＞ 鉄 ＞ 亜鉛 ＞ アルミニウム ＞ マグネシウム**でした。陽イオンになりにくい金属ほど＋極になり、なりやすさの差が大きい組み合わせほど電圧が大きくなります。',
        // ＋極になりやすい順（上ほど＋極になりやすい）
        figure: scene([
          { type: 'text', x: 160, y: 24, text: '＋極になりやすい順', size: 14, anchor: 'middle', bold: true },
          ...['銅', '鉄', '亜鉛', 'アルミニウム', 'マグネシウム'].map((t, i) => ({ type: 'rect', x: 110, y: 36 + 38 * i, width: 120, height: 30, rx: 6, fill: 'glass', stroke: 'line', label: t })),
          { type: 'arrow', x1: 80, y1: 210, x2: 80, y2: 40, color: 'orange', width: 3 },
          { type: 'text', x: 70, y: 56, text: '＋極に', size: 12, anchor: 'end' },
          { type: 'text', x: 70, y: 72, text: 'なりやすい', size: 12, anchor: 'end' },
          { type: 'text', x: 70, y: 196, text: '−極に', size: 12, anchor: 'end' },
          { type: 'text', x: 70, y: 212, text: 'なりやすい', size: 12, anchor: 'end' },
          { type: 'text', x: 238, y: 200, text: '← 陽イオンに', size: 12 },
          { type: 'text', x: 250, y: 216, text: 'なりやすい', size: 12 },
        ]),
      },
      {
        id: 'ion-mp5-c2',
        text: '**木炭電池**は、木炭に**食塩水**をしみこませたろ紙を巻き、その上にアルミニウムはくを巻いてつくります。木炭が＋極、アルミニウムはくが−極です。電流を流し続けると、アルミニウムがとけて、はくがぼろぼろになります。',
        // 写真: 縦に立てた備長炭 (145〜180, 37〜210)。上から、炭がはみ出した部分 (37〜70)、白いろ紙が見えるすき間 (70〜75)、アルミニウムはく (75〜185)、
        // はくの下のふちから見えるろ紙 (185〜190)、炭 (190〜210)。炭の上のはしに黒いクリップ、はくに赤いクリップ、右下にモーター (235〜300, 150〜200)。左側は白い余白
        figure: scene([
          photo('ion-mp5-c2'),
          pointer(132, 48, 152, 50), tag(128, 52, '木炭（＋極）', { bold: true, anchor: 'end' }),
          pointer(138, 74, 152, 73), tag(136, 78, 'ろ紙', { bold: true, anchor: 'end' }),
          tag(136, 96, '食塩水をしみこませた', { size: 13, anchor: 'end' }),
          pointer(138, 130, 154, 130), tag(136, 134, 'アルミニウムはく', { bold: true, anchor: 'end' }),
          tag(136, 152, '（−極）', { size: 13, anchor: 'end' }),
          tag(160, 232, '電流を流し続けると、はくがぼろぼろになる', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-mp5-w1', concept: 'io-battery',
      prompt: '予想しよう。銅とマグネシウムで電池をつくると、＋極になるのはどちらだと思う？',
      options: ['銅', 'マグネシウム', '日によって変わる'],
      answer: 'a',
      explanation: 'マグネシウムは陽イオンになりやすく、電子を失ってとけ出すので−極になります。陽イオンになりにくい銅が＋極です。',
      hint: '陽イオンになりやすいのは、どちらの金属かな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp5-p1', concept: 'io-battery',
        prompt: '5 種類の金属（ア 亜鉛、イ 銅、ウ マグネシウム、エ 鉄、オ アルミニウム）から 2 種類ずつ選んで電池をつくりました。どの金属と組み合わせても＋極になった金属はどれ？',
        figure: METALS_Q,
        answer: 'r2',
        explanation: '銅は 5 種類の中でいちばん陽イオンになりにくいので、どの金属と組み合わせても＋極になります。',
        hint: '陽イオンにいちばんなりにくい金属をさがそう。',
      }),
      fill({
        id: 'ion-mp5-t1', concept: 'io-battery', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '木炭電池では、ろ紙に[b1]をしみこませ、[b2]が＋極、アルミニウムはくが−極になる。',
        blanks: [
          word('b1', ['食塩水', '砂糖水', '精製水'], '食塩水'),
          word('b2', ['木炭', 'ろ紙', 'アルミニウムはく'], '木炭'),
        ],
        explanation: '**木炭電池**では、電解質の水溶液として**食塩水**を使います。アルミニウムがとけ出して電子を出すので、アルミニウムはくが−極、木炭が＋極になります。',
        hint: '電池には電解質の水溶液が必要だったね。',
      }),
      fill({
        id: 'ion-mp5-p2', concept: 'io-battery',
        prompt: '5 種類の金属で電池をつくった結果から、＋極になりやすい順に並べました。空らんに入る金属を選ぼう。',
        text: '銅 ＞ [b1] ＞ [b2] ＞ アルミニウム ＞ [b3]',
        blanks: [
          word('b1', ['鉄', '亜鉛', 'マグネシウム'], '鉄'),
          word('b2', ['鉄', '亜鉛', 'マグネシウム'], '亜鉛'),
          word('b3', ['鉄', '亜鉛', 'マグネシウム'], 'マグネシウム'),
        ],
        explanation: '結果は、鉄と亜鉛では鉄が＋極、亜鉛とアルミニウムでは亜鉛が＋極、アルミニウムとマグネシウムではアルミニウムが＋極でした。だから、銅 ＞ 鉄 ＞ 亜鉛 ＞ アルミニウム ＞ マグネシウムです。',
        hint: 'マグネシウムは、どれと組み合わせても−極になったよ。',
      }),
      choice({
        id: 'ion-mp5-p3', concept: 'io-battery',
        prompt: '鉄と亜鉛で電池をつくりました。＋極になるのはどちら？',
        options: ['鉄', '亜鉛', 'どちらにもならない'],
        answer: 'a',
        explanation: '亜鉛は鉄より陽イオンになりやすいので、亜鉛が−極、鉄が＋極になります。',
        hint: '＋極になりやすい順は、銅 ＞ 鉄 ＞ 亜鉛 ＞ アルミニウム ＞ マグネシウム だよ。',
      }),
      choice({
        id: 'ion-mp5-p4', concept: 'io-battery',
        prompt: '5 種類の金属から 2 種類を選んで電池をつくるとき、電圧がいちばん大きくなると考えられる組み合わせはどれ？',
        options: ['銅とマグネシウム', '銅と鉄', '亜鉛とアルミニウム', '鉄と亜鉛'],
        answer: 'a',
        explanation: '陽イオンへのなりやすさの差が大きい組み合わせほど、電圧が大きくなります。いちばん＋極になりやすい銅と、いちばん−極になりやすいマグネシウムの組み合わせです。',
        hint: '順番のいちばん はしどうしを組み合わせよう。',
      }),
      choice({
        id: 'ion-mp5-p5', concept: 'io-battery',
        prompt: '木炭電池のろ紙にしみこませる水溶液として、正しいものはどれ？',
        options: ['食塩水', '砂糖水', 'エタノール水溶液'],
        answer: 'a',
        explanation: '電池には電解質の水溶液が必要です。食塩水は電解質の水溶液ですが、砂糖水やエタノール水溶液は非電解質の水溶液なので、電池になりません。',
        hint: '電流が流れる水溶液を選ぼう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-mp5-r1', concept: 'io-battery',
        prompt: 'アルミニウムとマグネシウムで電池をつくりました。＋極になるのはどちら？',
        options: ['アルミニウム', 'マグネシウム', 'どちらにもならない'],
        answer: 'a',
        explanation: 'マグネシウムはアルミニウムより陽イオンになりやすいので、マグネシウムが−極、アルミニウムが＋極になります。',
        hint: 'マグネシウムは、どれと組み合わせても−極だったね。',
      }),
      figureChoice({
        id: 'ion-mp5-r2', concept: 'io-battery',
        prompt: '5 種類の金属（ア 亜鉛、イ 銅、ウ マグネシウム、エ 鉄、オ アルミニウム）から 2 種類ずつ選んで電池をつくりました。どの金属と組み合わせても−極になった金属はどれ？',
        figure: METALS_Q,
        answer: 'r3',
        explanation: 'マグネシウムは 5 種類の中でいちばん陽イオンになりやすく、電子を失ってとけ出すので、どの金属と組み合わせても−極になります。',
        hint: '陽イオンにいちばんなりやすい金属をさがそう。',
      }),
      figureChoice({
        id: 'ion-mp5-r3', concept: 'io-battery',
        prompt: '木炭電池を横から見た写真です。ア〜ウのうち、アルミニウムはくはどれ？',
        // 写真（ion-mp5-c2 と同じ画像）: 上から 炭がはみ出した部分 (145〜180, 37〜70)、アルミニウムはく (75〜185)、はくの下のふちから見えるろ紙 (185〜190)
        figure: scene([
          photo('ion-mp5-c2'),
          pointer(60, 50, 152, 52),
          pointer(60, 130, 150, 130),
          pointer(60, 200, 150, 188),
          { type: 'region', id: 'r1', x: 38, y: 50, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 38, y: 130, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 38, y: 200, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '木炭（ア）にろ紙（ウ）を巻き、いちばん外側にアルミニウムはく（イ）を巻きます。図では、ろ紙はアルミニウムはくのふちから少し見えています。',
        hint: 'アルミニウムはくは、いちばん外側に巻くよ。',
      }),
      choice({
        id: 'ion-mp5-r4', concept: 'io-battery',
        prompt: '木炭電池を 2 個、直列につないで電圧を大きくしたいとき、どうつなぐ？',
        options: ['一方の木炭と、もう一方のアルミニウムはくをつなぐ', '木炭どうしをつなぐ', 'アルミニウムはくどうしをつなぐ'],
        answer: 'a',
        explanation: '直列つなぎは、一方の電池の＋極と、もう一方の電池の−極をつなぎます。木炭電池では、木炭（＋極）とアルミニウムはく（−極）をつなぎます。',
        hint: '乾電池を直列につなぐときも、＋極と−極をつなぐね。',
      }),
      choice({
        id: 'ion-mp5-r5', concept: 'io-battery',
        prompt: '木炭電池で電流を流し続けると、ぼろぼろになっていくのはどれ？',
        options: ['アルミニウムはく', '木炭', 'ろ紙'],
        answer: 'a',
        explanation: '−極のアルミニウムは、電子を失ってアルミニウムイオンになり、とけ出していきます。そのため、アルミニウムはくがぼろぼろになります。',
        hint: '電子を失ってとけ出すのは、−極の金属だよ。',
      }),
    ],
  };

  // ---- ステージ ion-mp6: プリント 6 いろいろな電池（⑥ダニエル電池のしくみ／⑦電池の種類／⑧燃料電池／身の回りの電池） ----
  const ionMp6 = {
    id: 'ion-mp6', areaId: 'io-ion', free: true, title: 'プリント 6: ダニエル電池といろいろな電池', minutes: 5, concepts: ['io-battery'],
    lessons: [
      {
        id: 'ion-mp6-c1',
        anim: 'io-daniell',   // 動く図（js/anim-chem.js。ミニプリントの使い回し）。figure は静止図として残す
        text: 'ダニエル電池の−極では、亜鉛が電子を 2 個失って亜鉛イオンになり、とけ出します（Zn → Zn2+ ＋ 2e-）。電子は導線を通って銅板へ流れ、＋極では銅イオンが電子を 2 個受け取って銅原子になり、銅板に付きます（Cu2+ ＋ 2e- → Cu）。',
        // ダニエル電池と、それぞれの極で起こる変化
        figure: scene(daniellItems().concat([
          { type: 'text', x: 50, y: 66, text: '−極', size: 13, anchor: 'middle' },
          { type: 'text', x: 272, y: 66, text: '＋極', size: 13, anchor: 'middle' },
          { type: 'text', x: 125, y: 175, text: 'Zn → Zn2+', size: 12, anchor: 'middle' },
          { type: 'text', x: 195, y: 175, text: 'Cu2+ → Cu', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-mp6-c2',
        text: 'マンガン乾電池・アルカリ乾電池のような使い切りの電池を**一次電池**、鉛蓄電池（車のバッテリー）やリチウムイオン電池（スマートフォン）のように充電してくり返し使える電池を**二次電池**といいます。乾電池 1 個の電圧は 1.5 V です。',
        // 写真: 左 一次電池（円筒形の乾電池 2 本 (20〜53, 105〜190)・(61〜80, 120〜189)、ボタン形のリチウム電池 (82〜115, 187〜208)）、
        // 右 二次電池（車のバッテリー (156〜273, 82〜179)、スマートフォン用の電池パック (175〜265, 177〜218)、円筒形の充電池 (281〜303, 129〜196)）。
        // 電池は無地。上は白い余白
        figure: scene([
          photo('ion-mp6-c2'),
          tag(70, 22, '一次電池（使い切り）', { size: 13, bold: true }),
          tag(238, 22, '二次電池（充電できる）', { size: 13, bold: true }),
          tag(62, 66, 'マンガン・アルカリ', { size: 13 }),
          tag(46, 86, '乾電池', { size: 13 }),
          pointer(80, 206, 90, 200), tag(42, 214, 'リチウム電池', { size: 13 }),
          tag(214, 148, '鉛蓄電池', { size: 13 }),
          tag(214, 166, '車のバッテリー', { size: 13 }),
          tag(220, 202, 'リチウムイオン電池', { size: 13 }),
          tag(292, 96, 'ニッケル', { size: 13 }),
          tag(292, 114, '水素電池', { size: 13 }),
          tag(160, 234, '乾電池 1 個の電圧 … 1.5 V', { size: 13 }),
        ]),
      },
      {
        id: 'ion-mp6-c3',
        anim: 'io-fuel-cell',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '水を電気分解したあとの装置に電子オルゴールをつなぐと、音が鳴ります。陰極側にたまった水素と、陽極側にたまった酸素が結びついて水ができるときに、電気が取り出せるのです。これが**燃料電池**で、酸素の側が＋極になります（2H₂ ＋ O₂ → 2H₂O）。',
        // 燃料電池になった、水の電気分解の装置
        figure: scene(fuelCellItems()),
      },
    ],
    warmup: choice({
      id: 'ion-mp6-w1', concept: 'io-battery',
      prompt: '予想しよう。ふつうの乾電池（単 3 形など）1 個の電圧は、およそいくらだと思う？',
      options: ['1.5 V', '15 V', '100 V'],
      answer: 'a',
      explanation: 'マンガン乾電池やアルカリ乾電池 1 個の電圧は 1.5 V です。100 V は家庭のコンセントの電圧です。',
      hint: '乾電池に書いてある数字を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp6-p1', concept: 'io-battery',
        prompt: '水を電気分解したあとの装置に電子オルゴールをつなぐと、音が鳴りました。この電池で＋極になっているのは、ア（水素がある側の電極）・イ（酸素がある側の電極）のどちら？',
        figure: scene(fuelCellItems().concat([
          { type: 'region', id: 'r1', x: 98, y: 150, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 222, y: 150, r: 22, label: 'イ' },
        ])),
        answer: 'r2',
        explanation: '燃料電池では、水素の側で水素が電子を失い、その電子が導線を通って酸素の側へ流れます。電子を受け取る酸素の側（イ）が＋極です。',
        hint: '電子を出す側が−極、受け取る側が＋極だよ。',
      }),
      fill({
        id: 'ion-mp6-t1', concept: 'io-battery', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'マンガン乾電池のように使い切りの電池を[b1]、充電してくり返し使える電池を[b2]という。',
        blanks: [
          word('b1', ['一次電池', '二次電池', '燃料電池'], '一次電池'),
          word('b2', ['一次電池', '二次電池', '燃料電池'], '二次電池'),
        ],
        explanation: '使い切りの電池が**一次電池**（マンガン乾電池・アルカリ乾電池など）、充電してくり返し使える電池が**二次電池**（鉛蓄電池・リチウムイオン電池など）です。',
        hint: '充電して 2 回目からも使えるのは、どちらの名前かな。',
      }),
      fill({
        id: 'ion-mp6-p2', concept: 'io-battery',
        prompt: 'ダニエル電池のしくみの説明です。空らんに入る言葉を選ぼう。',
        text: '−極では、亜鉛が電子を 2 個失って亜鉛[b1]になり、とけ出す。[b2]は導線を通って銅板へ流れ、＋極では銅イオンが電子を 2 個受け取って銅[b3]になり、銅板に付く。',
        blanks: [
          word('b1', ['イオン', '原子', '分子'], 'イオン'),
          word('b2', ['電子', '陽子', '亜鉛イオン'], '電子'),
          word('b3', ['イオン', '原子', '分子'], '原子'),
        ],
        explanation: '亜鉛原子は電子を失うと亜鉛イオンになります。その電子が導線を通って銅板へ流れ、銅イオンが電子を受け取ると、電気を帯びていない銅原子にもどって銅板に付きます。',
        hint: '電子を失うとイオンに、電子を受け取ってもどると原子になるよ。',
      }),
      fill({
        id: 'ion-mp6-p3', concept: 'io-battery',
        prompt: 'ダニエル電池の、それぞれの極で起こる変化です。空らんに入るものを選ぼう（e- は電子）。',
        text: '−極: Zn → [b1] ＋ 2e-　＋極: [b2] ＋ 2e- → [b3]',
        blanks: [
          word('b1', ['Zn2+', 'Zn+', 'Cu2+'], 'Zn2+'),
          word('b2', ['Cu2+', 'Zn2+', 'Cu'], 'Cu2+'),
          word('b3', ['Cu', 'Cu2+', 'Zn'], 'Cu'),
        ],
        explanation: '−極では亜鉛が電子 2 個を失って Zn2+ になり、＋極では Cu2+ が電子 2 個を受け取って Cu になります。',
        hint: '＋極の銅板の表面に付くのは、何だったかな。',
      }),
      choice({
        id: 'ion-mp6-p4', concept: 'io-battery',
        prompt: '自動車のバッテリーに使われ、価格が安く、充電してくり返し使える電池はどれ？',
        options: ['鉛蓄電池', 'マンガン乾電池', 'リチウム電池', 'アルカリ乾電池'],
        answer: 'a',
        explanation: '鉛蓄電池は、鉛と酸化鉛と硫酸を使った二次電池で、自動車のバッテリーなどに使われています。ほかの 3 つは使い切りの一次電池です。',
        hint: '自動車のバッテリーは、充電して使い続けるよ。',
      }),
      fill({
        id: 'ion-mp6-p5', concept: 'io-battery',
        prompt: '燃料電池で起こる化学変化を、化学反応式で表します。空らんに入るものを選ぼう。',
        text: '2H₂ ＋ [b1] → [b2]',
        blanks: [
          word('b1', ['O₂', '2O', 'H₂O'], 'O₂'),
          word('b2', ['2H₂O', 'H₂O', '2H₂O₂'], '2H₂O'),
        ],
        explanation: '燃料電池では、水素と酸素が結びついて水ができます。水素分子 2 個と酸素分子 1 個から、水分子が 2 個できます（2H₂ ＋ O₂ → 2H₂O）。',
        hint: '矢印の左右で、H と O の数が同じになるようにしよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-mp6-r1', concept: 'io-battery',
        prompt: '古くからある電池で、価格が安く、使い切りの電池はどれ？',
        options: ['マンガン乾電池', 'リチウムイオン電池', 'ニッケル水素電池', '鉛蓄電池'],
        answer: 'a',
        explanation: 'マンガン乾電池は古くからある一次電池で、価格が安く、時計やリモコンなどに使われます。',
        hint: '使い切りの電池（一次電池）の中から選ぼう。',
      }),
      choice({
        id: 'ion-mp6-r2', concept: 'io-battery',
        prompt: 'スマートフォンやノートパソコンに使われている電池はどれ？',
        options: ['リチウムイオン電池', 'マンガン乾電池', '鉛蓄電池', 'アルカリ乾電池'],
        answer: 'a',
        explanation: 'リチウムイオン電池は、小さくて軽いわりに電気をたくさんためられる二次電池で、スマートフォンやノートパソコンに使われています。',
        hint: '充電してくり返し使えて、小さくて軽い電池だよ。',
      }),
      choice({
        id: 'ion-mp6-r3', concept: 'io-battery',
        prompt: '水を電気分解したとき、陽極と陰極に発生する気体の組み合わせとして正しいものはどれ？',
        options: ['陽極に酸素、陰極に水素', '陽極に水素、陰極に酸素', 'どちらにも水素'],
        answer: 'a',
        explanation: '水の電気分解では、陰極に水素、陽極に酸素が、2：1 の体積の比で発生します。',
        hint: '多く発生するのは水素。陰極側だったね。',
      }),
      choice({
        id: 'ion-mp6-r4', concept: 'io-battery', term: true,
        prompt: '次の説明に合う言葉はどれ？「水素と酸素が結びついて水ができる化学変化から、電気を取り出す電池」',
        options: ['燃料電池', '鉛蓄電池', 'ダニエル電池'],
        answer: 'a',
        explanation: '水素と酸素から水ができる化学変化を使って電気を取り出す電池を**燃料電池**といいます。できるのは水だけで、自動車や家庭の発電にも使われます。',
        hint: '水素を「燃料」として使う電池だよ。',
      }),
      choice({
        id: 'ion-mp6-r5', concept: 'io-battery',
        prompt: '単 1 形と単 2 形の乾電池（どちらも同じ種類）のちがいとして正しいものはどれ？',
        options: ['使える時間（電気の量）がちがい、電圧は同じ', '電圧がちがい、使える時間は同じ', 'ちがいはない'],
        answer: 'a',
        explanation: '同じ種類の乾電池なら、大きさが変わっても電圧は 1.5 V です。大きい単 1 形のほうが、長い時間使えます。',
        hint: '乾電池の電圧は、大きさに関係なく 1.5 V だったね。',
      }),
    ],
  };

  // ---- ステージ ion-mp7: プリント 7 酸性・アルカリ性の性質と正体（酸性・アルカリ性の性質／２／酸の正体／アルカリの正体） ----
  const ionMp7 = {
    id: 'ion-mp7', areaId: 'io-acid', free: true, title: 'プリント 7: 酸性・アルカリ性の性質と正体', minutes: 5, concepts: ['io-acidbase'],
    lessons: [
      {
        id: 'ion-mp7-c1',
        text: '**酸性**の水溶液（塩酸など）は、青色リトマス紙を赤色に変え、BTB 溶液を黄色にし、マグネシウムを入れると水素が発生します。**アルカリ性**の水溶液（水酸化ナトリウム水溶液など）は、赤色リトマス紙を青色に変え、BTB 溶液を青色、フェノールフタレイン溶液を赤色にします。',
        // 酸性・中性・アルカリ性の性質の表
        figure: scene([
          { type: 'rect', x: 4, y: 12, width: 312, height: 30, fill: 'glass', stroke: 'line' },
          ...[['', 40], ['酸性', 124], ['中性', 198], ['アルカリ性', 272]].map(([t, x]) => ({ type: 'text', x, y: 33, text: t, size: 13, anchor: 'middle', bold: true })),
          ...[
            ['リトマス紙', '青 → 赤', '変化なし', '赤 → 青'],
            ['BTB 溶液', '黄色', '緑色', '青色'],
            ['フェノール', '無色', '無色', '赤色'],
            ['マグネシウム', '水素が出る', '変化なし', '変化なし'],
          ].flatMap((row, i) => row.map((t, j) => ({ type: 'text', x: [40, 124, 198, 272][j], y: 76 + 44 * i, text: t, size: j === 0 ? 11 : 13, anchor: 'middle' }))),
          ...[54, 98, 142, 186].map(y => ({ type: 'line', points: [[4, y], [316, y]], color: 'gray', width: 1 })),
          { type: 'text', x: 4, y: 236, text: '※フェノール … フェノールフタレイン溶液', size: 12 },
        ]),
      },
      {
        id: 'ion-mp7-c2',
        anim: 'io-oh-migration',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '食塩水（電解質の水溶液）でしめらせたろ紙に赤色リトマス紙をのせ、中央に水酸化ナトリウム水溶液をつけて電圧を加えると、青色が陽極側へ広がります。アルカリ性を示すのは陰イオンの**水酸化物イオン** OH- です。酸性を示すのは陽イオンの**水素イオン** H+ で、陰極側へ動きます。',
        // 赤色リトマス紙の青くなった部分が、陽極（電源の＋極）側へ広がる
        figure: scene([
          { type: 'text', x: 40, y: 50, text: '陰極（−）', size: 12, anchor: 'middle' },
          { type: 'text', x: 280, y: 50, text: '陽極（＋）', size: 12, anchor: 'middle' },
          { type: 'line', points: [[40, 58], [40, 112]], width: 2 },
          { type: 'line', points: [[280, 58], [280, 112]], width: 2 },
          { type: 'rect', x: 20, y: 96, width: 280, height: 48, fill: 'glass' },
          { type: 'rect', x: 40, y: 108, width: 240, height: 24, fill: '#F2B8B5', stroke: 'none' },
          { type: 'rect', x: 158, y: 108, width: 66, height: 24, fill: BLUE_LITMUS, stroke: 'none' },
          { type: 'line', points: [[160, 92], [160, 148]], width: 3 },
          { type: 'arrow', x1: 170, y1: 84, x2: 216, y2: 84, color: 'blue', width: 2 },
          { type: 'text', x: 193, y: 74, text: 'OH-', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 168, text: '水酸化ナトリウム水溶液をつけた所', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 196, text: '青色が陽極側へ広がる', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '→ アルカリ性を示すのは OH-（陰イオン）', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-mp7-w1', concept: 'io-acidbase',
      prompt: '予想しよう。うすい塩酸にマグネシウムリボンを入れると、どうなると思う？',
      options: ['気体が発生する', '何も変化しない', '水溶液が青色になる'],
      answer: 'a',
      explanation: '酸性の水溶液にマグネシウムを入れると、マグネシウムがとけて水素が発生します。うすい水酸化ナトリウム水溶液に入れても、変化はありません。',
      hint: '酸性の水溶液の性質を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp7-p1', concept: 'io-acidbase',
        prompt: '食塩水でしめらせたろ紙に赤色リトマス紙をのせ、左のはしを電源の−極、右のはしを＋極につなぎました。中央に水酸化ナトリウム水溶液をつけて電圧を加えると、リトマス紙の青色はア・イのどちらへ広がる？',
        figure: scene([
          { type: 'text', x: 40, y: 50, text: '陰極（−）', size: 12, anchor: 'middle' },
          { type: 'text', x: 280, y: 50, text: '陽極（＋）', size: 12, anchor: 'middle' },
          { type: 'line', points: [[40, 58], [40, 112]], width: 2 },
          { type: 'line', points: [[280, 58], [280, 112]], width: 2 },
          { type: 'rect', x: 20, y: 96, width: 280, height: 48, fill: 'glass' },
          { type: 'rect', x: 40, y: 108, width: 240, height: 24, fill: '#F2B8B5', stroke: 'none' },
          { type: 'rect', x: 150, y: 108, width: 20, height: 24, fill: BLUE_LITMUS, stroke: 'none' },
          { type: 'line', points: [[160, 92], [160, 148]], width: 3 },
          { type: 'text', x: 160, y: 168, text: '水酸化ナトリウム水溶液をつけた所', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 90, y: 204, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 230, y: 204, r: 22, label: 'イ' },
          { type: 'arrow', x1: 140, y1: 204, x2: 116, y2: 204, color: 'gray', width: 2 },
          { type: 'arrow', x1: 180, y1: 204, x2: 204, y2: 204, color: 'gray', width: 2 },
        ]),
        answer: 'r2',
        explanation: 'アルカリ性を示す水酸化物イオン OH- は−の電気を帯びているので、陽極（＋極）側へ引かれます。だから、青色は右の陽極側（イ）へ広がります。',
        hint: 'OH- は陰イオン。＋と−のどちらに引かれるかな。',
      }),
      fill({
        id: 'ion-mp7-t1', concept: 'io-acidbase', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '酸性を示すもとになるのは陽イオンの[b1]で、アルカリ性を示すもとになるのは陰イオンの[b2]である。',
        blanks: [
          word('b1', ['水素イオン', '水酸化物イオン', '塩化物イオン'], '水素イオン'),
          word('b2', ['水素イオン', '水酸化物イオン', 'ナトリウムイオン'], '水酸化物イオン'),
        ],
        explanation: '酸性の正体は**水素イオン** H+（陽イオン）、アルカリ性の正体は**水酸化物イオン** OH-（陰イオン）です。電圧を加える実験で、H+ は陰極側、OH- は陽極側へ動きます。',
        hint: '塩酸は HCl、水酸化ナトリウムは NaOH だね。',
      }),
      fill({
        id: 'ion-mp7-p2', concept: 'io-acidbase',
        prompt: 'うすい塩酸の性質です。空らんに入る言葉を選ぼう。',
        text: 'うすい塩酸は、青色リトマス紙を[b1]に変え、BTB 溶液を[b2]にする。マグネシウムを入れると[b3]が発生する。',
        blanks: [
          word('b1', ['赤色', '青色', '緑色'], '赤色'),
          word('b2', ['黄色', '緑色', '青色'], '黄色'),
          word('b3', ['水素', '酸素', '二酸化炭素'], '水素'),
        ],
        explanation: '塩酸は酸性なので、青色リトマス紙を赤色に、BTB 溶液を黄色にします。マグネシウムを入れると、水素が発生します。',
        hint: '酸性の水溶液の性質だよ。',
      }),
      choice({
        id: 'ion-mp7-p3', concept: 'io-acidbase',
        prompt: 'ある水溶液に青色リトマス紙をつけましたが、色は変わりませんでした。この水溶液は何性の可能性がある？',
        options: ['中性かアルカリ性', '酸性だけ', '酸性か中性'],
        answer: 'a',
        explanation: '青色リトマス紙を赤色に変えるのは酸性です。色が変わらなかったので、酸性ではなく、中性かアルカリ性のどちらかです。どちらかを決めるには、赤色リトマス紙も使います。',
        hint: '青色リトマス紙の色を変えるのは、何性だけだったかな。',
      }),
      choice({
        id: 'ion-mp7-p4', concept: 'io-acidbase',
        prompt: 'ある水溶液に電極を入れると、電流が流れました。この水溶液は何性の可能性がある？',
        options: ['酸性・中性・アルカリ性のどれの可能性もある', '酸性だけ', 'アルカリ性だけ'],
        answer: 'a',
        explanation: '塩酸（酸性）にも、食塩水（中性）にも、水酸化ナトリウム水溶液（アルカリ性）にも電流が流れます。電流が流れることだけでは、何性かは決められません。',
        hint: '食塩水は中性だけど、電流が流れたね。',
      }),
      choice({
        id: 'ion-mp7-p5', concept: 'io-acidbase',
        prompt: '酸性やアルカリ性の正体を調べる実験で、ろ紙を食塩水でしめらせるのはなぜ？',
        options: ['ろ紙に電流が流れるようにするため', 'リトマス紙の色を変えるため', 'ろ紙を冷やすため'],
        answer: 'a',
        explanation: '食塩水は電解質の水溶液で、中性です。ろ紙に電流が流れるようにしながら、リトマス紙の色には影響しないので、イオンの動きだけを調べられます。',
        hint: '食塩水は電解質の水溶液で、しかも中性だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'ion-mp7-r1', concept: 'io-acidbase',
        prompt: 'うすい水酸化ナトリウム水溶液の性質です。空らんに入る言葉を選ぼう。',
        text: '赤色リトマス紙を[b1]に変え、BTB 溶液を[b2]に、フェノールフタレイン溶液を[b3]にする。',
        blanks: [
          word('b1', ['青色', '赤色', '黄色'], '青色'),
          word('b2', ['黄色', '緑色', '青色'], '青色'),
          word('b3', ['赤色', '青色', '無色'], '赤色'),
        ],
        explanation: '水酸化ナトリウム水溶液はアルカリ性なので、赤色リトマス紙を青色に、BTB 溶液を青色に、フェノールフタレイン溶液を赤色にします。',
        hint: 'アルカリ性の水溶液の性質だよ。',
      }),
      fill({
        id: 'ion-mp7-r2', concept: 'io-acidbase',
        prompt: '結果から、水溶液が何性かを答えよう。',
        text: 'BTB 溶液が緑色になった → [b1]。フェノールフタレイン溶液が赤色になった → [b2]。マグネシウムリボンを入れると水素が出た → [b3]。',
        blanks: [
          word('b1', ['酸性', '中性', 'アルカリ性'], '中性'),
          word('b2', ['酸性', '中性', 'アルカリ性'], 'アルカリ性'),
          word('b3', ['酸性', '中性', 'アルカリ性'], '酸性'),
        ],
        explanation: 'BTB 溶液の緑色は中性、フェノールフタレイン溶液の赤色はアルカリ性、マグネシウムで水素が出るのは酸性の性質です。',
        hint: 'BTB 溶液は 黄・緑・青 の 3 色に変わるね。',
      }),
      choice({
        id: 'ion-mp7-r3', concept: 'io-acidbase',
        prompt: '酸性の正体を調べるため、ろ紙の上のリトマス紙に塩酸をつけて電圧を加えます。使うリトマス紙と、色が変わって広がる側の組み合わせはどれ？',
        options: ['青色リトマス紙で、陰極側へ赤色が広がる', '青色リトマス紙で、陽極側へ赤色が広がる', '赤色リトマス紙で、陰極側へ青色が広がる'],
        answer: 'a',
        explanation: '酸性の水溶液は青色リトマス紙を赤色に変えるので、青色リトマス紙を使います。酸性を示す H+ は陽イオンなので、陰極側へ赤色が広がります。',
        hint: '酸性で色が変わるのは、青色・赤色のどちらのリトマス紙かな。',
      }),
      choice({
        id: 'ion-mp7-r4', concept: 'io-acidbase',
        prompt: 'アルカリ性の正体を調べる実験で、赤色リトマス紙の青色が陽極側へ広がりました。このことから分かることはどれ？',
        options: ['アルカリ性を示すものは、−の電気を帯びた陰イオンである', 'アルカリ性を示すものは、＋の電気を帯びた陽イオンである', 'アルカリ性を示すものは、電気を帯びていない'],
        answer: 'a',
        explanation: '陽極（＋）に引かれたので、アルカリ性を示すものは−の電気を帯びた陰イオンです。これが水酸化物イオン OH- です。',
        hint: '陽極は＋。＋に引かれるのは、どちらの電気を帯びたものかな。',
      }),
    ],
  };

  // ---- ステージ ion-mp8: プリント 8 中和と塩（①中和１／中和１（3年生フォルダ）／②中和まとめ／④いろいろな塩） ----
  const ionMp8 = {
    id: 'ion-mp8', areaId: 'io-acid', free: true, title: 'プリント 8: 中和と塩', minutes: 5, concepts: ['io-neutral', 'io-acidbase'],
    lessons: [
      {
        id: 'ion-mp8-c1',
        anim: 'io-btb-neutral',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: 'BTB 溶液を加えた水酸化ナトリウム水溶液は青色です。塩酸を少しずつ加えると、緑色（中性）になり、さらに加えると黄色（酸性）になります。酸の H+ とアルカリの OH- が結びついて水ができ、たがいの性質を打ち消し合う反応を**中和**といいます。',
        // 塩酸を加えていったときの BTB 溶液の色
        figure: scene([
          { type: 'tube', x: 60, y: 170, height: 100, level: 0.6, liquid: 'blue' },
          { type: 'tube', x: 160, y: 170, height: 100, level: 0.65, liquid: 'green' },
          { type: 'tube', x: 260, y: 170, height: 100, level: 0.7, liquid: 'yellow' },
          { type: 'arrow', x1: 82, y1: 120, x2: 136, y2: 120, color: 'gray', width: 2 },
          { type: 'arrow', x1: 182, y1: 120, x2: 236, y2: 120, color: 'gray', width: 2 },
          { type: 'text', x: 160, y: 30, text: '塩酸を少しずつ加える →', size: 13, anchor: 'middle' },
          { type: 'text', x: 60, y: 194, text: 'アルカリ性', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 194, text: '中性', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 194, text: '酸性', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 228, text: 'H+ ＋ OH- → H₂O', size: 15, anchor: 'middle', bold: true },
        ]),
      },
      {
        id: 'ion-mp8-c2',
        text: '中和では、水と同時に、酸の陰イオンとアルカリの陽イオンが結びついた**塩**ができます。塩酸と水酸化ナトリウムからは塩化ナトリウム、硝酸と水酸化カリウムからは硝酸カリウム、硫酸と水酸化バリウムからは硫酸バリウム（水にとけにくく、白い沈殿になる）ができます。',
        // 酸 ＋ アルカリ → 塩 ＋ 水 と、塩の例
        figure: scene([
          { type: 'text', x: 160, y: 34, text: '酸 ＋ アルカリ → 塩 ＋ 水', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 16, y: 80, text: '塩酸 ＋ 水酸化ナトリウム', size: 13 },
          { type: 'text', x: 304, y: 102, text: '→ 塩化ナトリウム', size: 13, anchor: 'end' },
          { type: 'text', x: 16, y: 134, text: '硝酸 ＋ 水酸化カリウム', size: 13 },
          { type: 'text', x: 304, y: 156, text: '→ 硝酸カリウム', size: 13, anchor: 'end' },
          { type: 'text', x: 16, y: 188, text: '硫酸 ＋ 水酸化バリウム', size: 13 },
          { type: 'text', x: 304, y: 210, text: '→ 硫酸バリウム（白い沈殿）', size: 13, anchor: 'end' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-mp8-w1', concept: 'io-acidbase',
      prompt: '水酸化ナトリウム水溶液に BTB 溶液を加えると、何色になる？',
      options: ['青色', '黄色', '緑色'],
      answer: 'a',
      explanation: '水酸化ナトリウム水溶液はアルカリ性なので、BTB 溶液は青色になります。酸性なら黄色、中性なら緑色です。',
      hint: '水酸化ナトリウム水溶液は何性だったかな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp8-p1', concept: 'io-neutral',
        prompt: 'BTB 溶液を加えた水酸化ナトリウム水溶液に、塩酸を少しずつ加えていきました。ア〜ウは、そのとちゅうの液の色です（ア 黄色、イ 緑色、ウ 青色）。ちょうど中和して中性になったときの色はどれ？',
        // 写真（ion-3-c3 の使い回し）: 試験管立てに試験管 3 本。左 (115) 黄色、中央 (160) 緑色、右 (205) 青色、液は y 122〜190、試験管立ての下は y 202
        figure: scene([
          photo('ion-3-c3'),
          tag(160, 24, '塩酸を加えていくとちゅうの液'),
          { type: 'region', id: 'r1', x: 115, y: 218, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 218, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 205, y: 218, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'BTB 溶液は中性で緑色です。はじめは青色（アルカリ性）で、塩酸を加えると緑色（中性）になり、さらに加えると黄色（酸性）になります。',
        hint: 'BTB 溶液の緑色は、何性のときかな。',
      }),
      choice({
        id: 'ion-mp8-t1', concept: 'io-neutral', term: true,
        prompt: '次の説明に合う言葉はどれ？「酸とアルカリを混ぜたとき、たがいの性質を打ち消し合う反応」',
        options: ['中和', '電離', '電気分解'],
        answer: 'a',
        explanation: '酸の H+ とアルカリの OH- が結びついて水ができ、たがいの性質を打ち消し合う反応を**中和**といいます。',
        hint: '中性に近づいていく反応だよ。',
      }),
      fill({
        id: 'ion-mp8-p2', concept: 'io-neutral',
        prompt: 'BTB 溶液を加えた水酸化ナトリウム水溶液に、塩酸を少しずつ加えました。空らんに入る言葉を選ぼう。',
        text: '液の色は青色 → [b1] → [b2] と変わる。最後の色のとき、液は[b3]である。',
        blanks: [
          word('b1', ['緑色', '黄色', '赤色'], '緑色'),
          word('b2', ['緑色', '黄色', '赤色'], '黄色'),
          word('b3', ['酸性', '中性', 'アルカリ性'], '酸性'),
        ],
        explanation: 'はじめは青色（アルカリ性）、ちょうど中和すると緑色（中性）、塩酸があまると黄色（酸性）になります。',
        hint: '塩酸を入れすぎると、塩酸の性質が出てくるよ。',
      }),
      fill({
        id: 'ion-mp8-p3', concept: 'io-neutral',
        prompt: '中和で起こる変化です。空らんに入るものを選ぼう。',
        text: '酸の[b1]とアルカリの[b2]が結びついて、水ができる。H+ ＋ OH- → [b3]',
        blanks: [
          word('b1', ['水素イオン', '水酸化物イオン', '塩化物イオン'], '水素イオン'),
          word('b2', ['水素イオン', '水酸化物イオン', 'ナトリウムイオン'], '水酸化物イオン'),
          word('b3', ['H₂O', 'H₂', 'O₂'], 'H₂O'),
        ],
        explanation: '中和では、酸の水素イオン H+ と、アルカリの水酸化物イオン OH- が結びついて、水 H₂O ができます。',
        hint: 'H と OH を合わせると、何になるかな。',
      }),
      choice({
        id: 'ion-mp8-p4', concept: 'io-neutral',
        prompt: '硫酸に水酸化バリウム水溶液を加えたときにできる塩と、その性質の組み合わせとして正しいものはどれ？',
        options: ['硫酸バリウムができ、水にとけにくいので白い沈殿になる', '硫酸バリウムができ、水によくとける', '塩化バリウムができ、水にとけにくい'],
        answer: 'a',
        explanation: '硫酸の陰イオン（硫酸イオン）と、水酸化バリウムの陽イオン（バリウムイオン）が結びついて硫酸バリウムができます。硫酸バリウムは水にとけにくいので、白い沈殿になります。',
        hint: '酸の名前とアルカリの金属の名前を組み合わせよう。',
      }),
      choice({
        id: 'ion-mp8-p5', concept: 'io-neutral',
        prompt: 'うすい塩酸と水酸化ナトリウム水溶液が、ちょうど中和して中性になった液には、どんな味があると考えられる？（実験では、液を絶対になめてはいけない）',
        options: ['塩からい味', 'すっぱい味', '苦い味'],
        answer: 'a',
        explanation: '中性になった液は、中和でできた塩化ナトリウム（食塩）の水溶液なので、塩からい味がすると考えられます。実験で使う薬品は、なめてはいけません。',
        hint: '中和でできる塩化ナトリウムは、身のまわりでは何とよばれるかな。',
      }),
    ],
    retryPool: [
      fill({
        id: 'ion-mp8-r1', concept: 'io-neutral',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '酸 ＋ アルカリ → [b1] ＋ [b2]。塩酸と水酸化ナトリウム水溶液を混ぜると、[b3]ができる。',
        blanks: [
          word('b1', ['塩', '酸化物', '水素'], '塩'),
          word('b2', ['水', '酸素', '二酸化炭素'], '水'),
          word('b3', ['塩化ナトリウム', '水酸化ナトリウム', '塩化水素'], '塩化ナトリウム'),
        ],
        explanation: '中和では、塩と水ができます。塩酸の Cl- と水酸化ナトリウムの Na+ から、塩化ナトリウムという塩ができます。',
        hint: '中和でできるものは 2 つ。どちらもこのプリントの大切な言葉だよ。',
      }),
      choice({
        id: 'ion-mp8-r2', concept: 'io-neutral',
        prompt: '硝酸と水酸化カリウム水溶液を混ぜたときにできる塩はどれ？',
        options: ['硝酸カリウム', '塩化カリウム', '硝酸ナトリウム', '硫酸カリウム'],
        answer: 'a',
        explanation: '硝酸の陰イオン（硝酸イオン）と、水酸化カリウムの陽イオン（カリウムイオン）が結びついて、硝酸カリウムができます。',
        hint: '酸の名前とアルカリの金属の名前を組み合わせよう。',
      }),
      choice({
        id: 'ion-mp8-r3', concept: 'io-neutral', term: true,
        prompt: '次の説明に合う言葉はどれ？「酸の陰イオンとアルカリの陽イオンが結びついてできた物質」',
        options: ['塩', '中和', '電解質'],
        answer: 'a',
        explanation: '酸の陰イオンとアルカリの陽イオンが結びついてできた物質を**塩**といいます。塩化ナトリウムや硫酸バリウムがその例です。',
        hint: '「しお」とも読む漢字 1 文字の言葉だよ。',
      }),
      choice({
        id: 'ion-mp8-r4', concept: 'io-acidbase',
        prompt: '酸の水溶液に共通してふくまれていて、酸の性質を示すもとになるイオンはどれ？',
        options: ['水素イオン H+', '水酸化物イオン OH-', '塩化物イオン Cl-'],
        answer: 'a',
        explanation: '酸は、電離して水素イオン H+ を生じる物質です。塩酸も硫酸も硝酸も、水溶液の中に H+ をふくんでいます。',
        hint: '塩酸 HCl、硫酸 H₂SO₄、硝酸 HNO₃ に共通する文字は？',
      }),
      choice({
        id: 'ion-mp8-r5', concept: 'io-acidbase',
        prompt: 'アルカリの水溶液に共通してふくまれていて、アルカリの性質を示すもとになるイオンはどれ？',
        options: ['水酸化物イオン OH-', '水素イオン H+', 'ナトリウムイオン Na+'],
        answer: 'a',
        explanation: 'アルカリは、電離して水酸化物イオン OH- を生じる物質です。水酸化ナトリウムも水酸化カリウムも、水溶液の中に OH- をふくんでいます。',
        hint: 'NaOH、KOH、Ba(OH)₂ に共通する部分は？',
      }),
    ],
  };

  // ---- ステージ ion-mp9: プリント 9 中和のモデルと電離式（③中和のモデル／中和モデル／中和モデル2／酸とアルカリの電離式） ----
  const ionMp9 = {
    id: 'ion-mp9', areaId: 'io-acid', free: true, title: 'プリント 9: 中和のモデルと電離式', minutes: 5, concepts: ['io-neutral', 'io-acidbase'],
    lessons: [
      {
        id: 'ion-mp9-c1',
        anim: 'io-neutral-model',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '塩酸に水酸化ナトリウム水溶液を加えると、加えた OH- は H+ と結びついて水になります。H+ が残っているうちは酸性、H+ も OH- もなくなると中性、OH- があまるとアルカリ性です。Na+ と Cl- は、水溶液の中でイオンのまま残ります。',
        // 中和のモデル（水の分子はかいていない）
        figure: scene([
          { type: 'text', x: 160, y: 24, text: '水酸化ナトリウム水溶液を加えていく →', size: 12, anchor: 'middle' },
        ].concat(modelFrames(
          [['H+', 'Cl-', 'Na+', 'Cl-'], ['Na+', 'Cl-', 'Na+', 'Cl-'], ['Na+', 'Cl-', 'Na+', 'Cl-', 'Na+', 'OH-']],
          ['#FFF3C4', 'lightgreen', 'sky']), [
          { type: 'text', x: 56, y: 180, text: '酸性', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 180, text: '中性', size: 12, anchor: 'middle' },
          { type: 'text', x: 264, y: 180, text: 'アルカリ性', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 210, text: 'H+ ＋ OH- → H₂O（水）', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 232, text: '（水の分子はかいていない）', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-mp9-c2',
        text: '酸とアルカリの**電離式**の例です。塩酸 HCl → H+ ＋ Cl-、硫酸 H₂SO₄ → 2H+ ＋ SO₄2-、水酸化ナトリウム NaOH → Na+ ＋ OH-。酸は電離して H+ を、アルカリは電離して OH- を生じます。',
        // 酸とアルカリの電離式
        figure: scene([
          { type: 'text', x: 20, y: 40, text: '酸', size: 15, bold: true },
          { type: 'text', x: 40, y: 72, text: 'HCl → H+ ＋ Cl-', size: 15 },
          { type: 'text', x: 40, y: 104, text: 'H₂SO₄ → 2H+ ＋ SO₄2-', size: 15 },
          { type: 'text', x: 20, y: 150, text: 'アルカリ', size: 15, bold: true },
          { type: 'text', x: 40, y: 182, text: 'NaOH → Na+ ＋ OH-', size: 15 },
          { type: 'text', x: 300, y: 228, text: '酸は H+、アルカリは OH- を生じる', size: 12, anchor: 'end' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-mp9-w1', concept: 'io-neutral',
      prompt: '予想しよう。塩酸に水酸化ナトリウム水溶液を少しずつ加えていくと、水溶液の中の水素イオン H+ の数はどうなると思う？',
      options: ['減っていく', '増えていく', '変わらない'],
      answer: 'a',
      explanation: '加えた水酸化物イオン OH- が水素イオン H+ と結びついて水になるので、H+ は減っていき、中性になると 0 になります。',
      hint: 'H+ は、OH- と出会うと何になるかな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-mp9-p1', concept: 'io-neutral',
        prompt: '塩化水素 2 個分の塩酸に、水酸化ナトリウムを 1 個分ずつ加えたときの、水溶液の中のイオンのモデルです（水の分子はかいていない）。中性の水溶液はア〜ウのどれ？',
        figure: MODEL_Q,
        answer: 'r2',
        explanation: 'イでは、H+ がすべて OH- と結びついて水になり、H+ も OH- も残っていないので中性です。アは H+ が残っているので酸性、ウは OH- があまっているのでアルカリ性です。',
        hint: 'H+ も OH- も残っていない枠をさがそう。',
      }),
      fill({
        id: 'ion-mp9-t1', concept: 'io-acidbase', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '塩酸は[b1]の水溶液で、水の中では H+ と Cl- に[b2]している。',
        blanks: [
          word('b1', ['塩化水素', '塩化ナトリウム', '水酸化ナトリウム'], '塩化水素'),
          word('b2', ['電離', '中和', '沈殿'], '電離'),
        ],
        explanation: '塩酸は**塩化水素**（HCl）の水溶液です。塩化水素は水の中で水素イオン H+ と塩化物イオン Cl- に**電離**しています。',
        hint: '塩酸の化学式は HCl。H と Cl でできた物質の名前は？',
      }),
      choice({
        id: 'ion-mp9-p2', concept: 'io-neutral',
        prompt: '塩化水素 2 個分の塩酸に、水酸化ナトリウムを 1 個分ずつ、3 回加えました。中和が起こったのは、何回目に加えたときですか？',
        options: ['1 回目と 2 回目', '1 回目・2 回目・3 回目のすべて', '3 回目だけ'],
        answer: 'a',
        explanation: '中和は、H+ と OH- が結びつく反応です。1 回目と 2 回目は H+ が残っていたので中和が起こりました。3 回目は H+ がもうないので、OH- はそのまま残り、中和は起こりません。',
        hint: '3 回目に加えたとき、H+ は残っていたかな。',
      }),
      fill({
        id: 'ion-mp9-p3', concept: 'io-neutral',
        prompt: '塩化水素 2 個分の塩酸に、水酸化ナトリウムを 1 個分加えました。空らんに入る数を入れよう。',
        text: 'できた水の分子は[b1]で、水素イオン H+ は[b2]残っている。',
        blanks: [number('b1', 1, 0, '個'), number('b2', 1, 0, '個')],
        explanation: '加えた OH- 1 個が、H+ 1 個と結びついて水の分子が 1 個できます。H+ は 2 個あったので、1 個残り、まだ酸性です。',
        hint: 'OH- 1 個は、H+ 何個と結びつくかな。',
      }),
      fill({
        id: 'ion-mp9-p4', concept: 'io-neutral',
        prompt: '塩化水素 3 個分の塩酸と、水酸化ナトリウム 4 個分の水溶液を混ぜました。空らんに入る数を入れよう。',
        text: '新しくできた水の分子は[b1]で、水酸化物イオン OH- は[b2]あまる。',
        blanks: [number('b1', 3, 0, '個'), number('b2', 1, 0, '個')],
        explanation: 'H+ 3 個と OH- 3 個が結びついて、水の分子が 3 個できます。OH- は 4 個あったので 1 個あまり、混ぜた液はアルカリ性です。',
        hint: '少ないほうの H+ がすべて水になるよ。',
      }),
      fill({
        id: 'ion-mp9-p5', concept: 'io-acidbase',
        prompt: '酸とアルカリの電離式です。空らんに入るものを選ぼう。',
        text: 'HCl → [b1] ＋ Cl-　H₂SO₄ → [b2] ＋ SO₄2-　NaOH → Na+ ＋ [b3]',
        blanks: [
          word('b1', ['H+', '2H+', 'OH-'], 'H+'),
          word('b2', ['H+', '2H+', 'H₂'], '2H+'),
          word('b3', ['OH-', 'H+', 'O2-'], 'OH-'),
        ],
        explanation: '塩酸は H+ 1 個、硫酸は H+ 2 個を生じます。水酸化ナトリウムは OH- を生じます。どの式も、右側の＋と−の電気の合計は 0 です。',
        hint: '化学式の H の右下の数を見よう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'ion-mp9-r1', concept: 'io-neutral',
        prompt: '塩化水素 2 個分の塩酸に、水酸化ナトリウムを 1 個分ずつ加えたときの、水溶液の中のイオンのモデルです（水の分子はかいていない）。酸性の水溶液はア〜ウのどれ？',
        figure: MODEL_Q,
        answer: 'r1',
        explanation: 'アには、OH- と結びつかずに残った H+ があるので、酸性です。BTB 溶液を加えると黄色になります。',
        hint: 'H+ が残っている枠をさがそう。',
      }),
      figureChoice({
        id: 'ion-mp9-r2', concept: 'io-neutral',
        prompt: '塩化水素 2 個分の塩酸に、水酸化ナトリウムを 1 個分ずつ加えたときの、水溶液の中のイオンのモデルです（水の分子はかいていない）。アルカリ性の水溶液はア〜ウのどれ？',
        figure: MODEL_Q,
        answer: 'r3',
        explanation: 'ウでは、H+ がなくなったあとに加えた OH- がそのままあまっているので、アルカリ性です。BTB 溶液を加えると青色になります。',
        hint: 'OH- が残っている枠をさがそう。',
      }),
      fill({
        id: 'ion-mp9-r3', concept: 'io-neutral',
        prompt: '塩化水素 2 個分の塩酸に、水酸化ナトリウムを 3 個分加えました。空らんに入るものを入れよう。',
        text: '水酸化物イオン OH- が[b1]あまるので、液は[b2]になる。',
        blanks: [number('b1', 1, 0, '個'), word('b2', ['酸性', '中性', 'アルカリ性'], 'アルカリ性')],
        explanation: 'H+ 2 個と OH- 2 個が結びついて水になり、OH- が 1 個あまります。OH- が残っているので、液はアルカリ性です。',
        hint: 'OH- 3 個のうち、H+ と結びつくのは何個かな。',
      }),
      choice({
        id: 'ion-mp9-r4', concept: 'io-neutral',
        prompt: '塩化水素 3 個分の塩酸と、水酸化ナトリウム 4 個分の水溶液を混ぜました。混ぜたあとの水溶液に残っているイオンの組み合わせはどれ？',
        options: ['Na+ 4 個、Cl- 3 個、OH- 1 個', 'Na+ 3 個、Cl- 3 個', 'H+ 1 個、Na+ 4 個、Cl- 3 個'],
        answer: 'a',
        explanation: 'H+ 3 個は OH- 3 個と結びついてすべて水になります。Na+ 4 個と Cl- 3 個はイオンのまま残り、OH- が 1 個あまります。',
        hint: 'Na+ と Cl- は、中和では結びつかずに残るよ。',
      }),
      choice({
        id: 'ion-mp9-r5', concept: 'io-acidbase',
        prompt: '硫酸 H₂SO₄ の電離式として正しいものはどれ？',
        options: ['H₂SO₄ → 2H+ ＋ SO₄2-', 'H₂SO₄ → H₂ ＋ SO₄', 'H₂SO₄ → H+ ＋ SO₄-'],
        answer: 'a',
        explanation: '硫酸は、水素イオン H+ 2 個と硫酸イオン SO₄2- 1 個に電離します。＋2 と −2 で、電気の合計は 0 です。',
        hint: 'H の右下の数だけ H+ ができるよ。',
      }),
      choice({
        id: 'ion-mp9-r6', concept: 'io-acidbase',
        prompt: '次の電離式のうち、アルカリが電離するようすを表しているものはどれ？',
        options: ['NaOH → Na+ ＋ OH-', 'HCl → H+ ＋ Cl-', 'NaCl → Na+ ＋ Cl-'],
        answer: 'a',
        explanation: 'アルカリは、電離して水酸化物イオン OH- を生じる物質です。NaOH → Na+ ＋ OH- がアルカリの電離式です。HCl は酸、NaCl は塩の電離式です。',
        hint: 'OH- を生じているのはどれかな。',
      }),
    ],
  };

  // ---- ステージ ion-mp10: プリント 10 中和と体積の比（A4問題　中和　濃さと体積／中和　濃さと体積） ----
  const ionMp10 = {
    id: 'ion-mp10', areaId: 'io-acid', free: true, title: 'プリント 10: 中和の体積の比と濃さ', minutes: 5, concepts: ['io-neutral'],
    lessons: [
      {
        id: 'ion-mp10-c1',
        text: '塩酸と水酸化ナトリウム水溶液がちょうど中和する体積の比は、濃さが同じなら一定です。塩酸 10 cm³ が水酸化ナトリウム水溶液 20 cm³ で中性になるなら、塩酸のほうが濃く、塩酸 20 cm³ には 40 cm³ が必要です。少ない体積で中和できるほうが濃い液です。',
        // 塩酸 10 cm³ と水酸化ナトリウム水溶液 20 cm³ で中性
        figure: scene([
          { type: 'text', x: 160, y: 30, text: 'ちょうど中性になる体積', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 40, y: 64, text: '塩酸', size: 13 },
          ...volumeBar(72, 10, 'pink', '10 cm³'),
          { type: 'text', x: 40, y: 124, text: '水酸化ナトリウム水溶液', size: 13 },
          ...volumeBar(132, 20, 'sky', '20 cm³'),
          { type: 'text', x: 160, y: 196, text: '塩酸：水酸化ナトリウム水溶液 ＝ 1：2', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '→ 塩酸のほうが濃い', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-mp10-c2',
        text: '混ぜたあとの液の性質は、ちょうど中和する量と比べて考えます。塩酸 10 cm³ と水酸化ナトリウム水溶液 8 cm³ で中性なら、塩酸 12 cm³ には 9.6 cm³ が必要です。9 cm³ しか加えなければ塩酸があまって酸性、それより多く加えればアルカリ性になります。',
        // 必要な量と、加えた量の比べ方
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '塩酸 12 cm³ に加える量', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 40, y: 64, text: 'ちょうど中和する量', size: 13 },
          ...volumeBar(72, 9.6, 'sky', '9.6 cm³'),
          { type: 'text', x: 40, y: 124, text: '加えた量', size: 13 },
          ...volumeBar(132, 9, 'sky', '9 cm³'),
          { type: 'text', x: 160, y: 196, text: '加えた量が少ない → 塩酸があまる', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '→ 酸性', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-mp10-w1', concept: 'io-neutral',
      prompt: '塩酸 10 cm³ に水酸化ナトリウム水溶液 10 cm³ を加えると、ちょうど中性になりました。濃いのはどちら？',
      options: ['どちらも同じ', '塩酸', '水酸化ナトリウム水溶液'],
      answer: 'a',
      explanation: '同じ体積どうしでちょうど中和したので、H+ と OH- の数が同じだけふくまれていたことになります。この場合、2 つの液の濃さは同じと考えます。',
      hint: '体積が同じで、ちょうど打ち消し合ったね。',
    }),
    problems: [
      drag({
        id: 'ion-mp10-p1', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 20 cm³ でちょうど中性になります。同じ塩酸 20 cm³ をちょうど中性にするのに必要な水酸化ナトリウム水溶液の体積の位置に、青い点を左右に動かして置こう。',
        // 正解は 40 cm³（x = 40 + 5 × 40 = 240）。不正解例は「塩酸と同じ 20 cm³」（x 140、100px はなれる）。
        // はじめの位置 50 cm³（x 290）も正解から 50px はなれる
        figure: scene(volumeLine().concat([
          { type: 'text', x: 160, y: 60, text: '塩酸 20 cm³ に必要な量は？', size: 14, anchor: 'middle' },
          { type: 'circle', id: 'mark', x: lineX(50), y: 150, r: 10, fill: 'blue', stroke: 'ink' },
        ])),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: lineX(40), y: 150 },
        samples: { correct: { x: lineX(40), y: 150 }, wrong: { x: lineX(20), y: 150 } },
        explanation: '塩酸と水酸化ナトリウム水溶液は 10：20 ＝ 1：2 の体積の比で中和します。塩酸 20 cm³ なら、20 × 2 ＝ 40 cm³ が必要です。',
        hint: '塩酸が 2 倍になると、必要な水酸化ナトリウム水溶液も 2 倍だよ。',
      }),
      fill({
        id: 'ion-mp10-t1', concept: 'io-neutral', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '塩酸と水酸化ナトリウム水溶液がちょうど中和すると、液は[b1]になり、H+ と OH- はすべて[b2]になっている。',
        blanks: [
          word('b1', ['中性', '酸性', 'アルカリ性'], '中性'),
          word('b2', ['水', '塩素', '水素'], '水'),
        ],
        explanation: 'ちょうど中和すると、H+ と OH- がすべて結びついて**水**になり、液は**中性**になります。液には、塩化ナトリウム（塩）がとけています。',
        hint: 'BTB 溶液が緑色になるときだよ。',
      }),
      choice({
        id: 'ion-mp10-p2', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 20 cm³ でちょうど中性になりました。濃いのはどちら？',
        options: ['塩酸', '水酸化ナトリウム水溶液', 'どちらも同じ'],
        answer: 'a',
        explanation: '塩酸 10 cm³ の中の H+ を打ち消すのに、水酸化ナトリウム水溶液が 2 倍の 20 cm³ も必要でした。少ない体積で同じだけのはたらきをする塩酸のほうが濃い液です。',
        hint: '少ない体積で中和できるほうが濃いよ。',
      }),
      fill({
        id: 'ion-mp10-p3', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 20 cm³ でちょうど中性になります。空らんに入る数を入れよう。',
        text: '水酸化ナトリウム水溶液 50 cm³ をちょうど中性にするには、塩酸が[b1]必要である。',
        blanks: [number('b1', 25, 0, 'cm³')],
        explanation: '塩酸：水酸化ナトリウム水溶液 ＝ 1：2 なので、水酸化ナトリウム水溶液 50 cm³ には、塩酸がその半分の 25 cm³ 必要です。',
        hint: '塩酸は、水酸化ナトリウム水溶液の半分の体積でよいね。',
      }),
      choice({
        id: 'ion-mp10-p4', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 8 cm³ でちょうど中性になります。同じ塩酸 12 cm³ と、同じ水酸化ナトリウム水溶液 9 cm³ を混ぜると、液は何性になる？',
        options: ['酸性', '中性', 'アルカリ性'],
        answer: 'a',
        explanation: '塩酸 12 cm³ をちょうど中和するには、12 × 8 ÷ 10 ＝ 9.6 cm³ が必要です。加えたのは 9 cm³ で足りないので、塩酸があまって酸性になります。',
        hint: 'まず、塩酸 12 cm³ をちょうど中和する量を計算しよう。',
      }),
      fill({
        id: 'ion-mp10-p5', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 8 cm³ でちょうど中性になります。空らんに入る数を入れよう。',
        text: '塩酸 20 cm³ をちょうど中性にするには水酸化ナトリウム水溶液が[b1]、水酸化ナトリウム水溶液 20 cm³ をちょうど中性にするには塩酸が[b2]必要である。',
        blanks: [number('b1', 16, 0, 'cm³'), number('b2', 25, 0, 'cm³')],
        explanation: '体積の比は 塩酸：水酸化ナトリウム水溶液 ＝ 10：8 です。塩酸 20 cm³ には 20 × 8 ÷ 10 ＝ 16 cm³、水酸化ナトリウム水溶液 20 cm³ には 20 × 10 ÷ 8 ＝ 25 cm³ の塩酸が必要です。',
        hint: '10：8 の比を使って計算しよう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'ion-mp10-r1', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 10 cm³ でちょうど中性になります。空らんに入る数を入れよう。',
        text: '塩酸 20 cm³ には水酸化ナトリウム水溶液が[b1]、水酸化ナトリウム水溶液 50 cm³ には塩酸が[b2]必要である。',
        blanks: [number('b1', 20, 0, 'cm³'), number('b2', 50, 0, 'cm³')],
        explanation: '体積の比は 1：1 なので、ちょうど中和する体積は、もう一方と同じです。塩酸 20 cm³ には 20 cm³、水酸化ナトリウム水溶液 50 cm³ には 50 cm³ です。',
        hint: '同じ体積どうしで中和するね。',
      }),
      choice({
        id: 'ion-mp10-r2', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 5 cm³ でちょうど中性になりました。濃いのはどちら？',
        options: ['水酸化ナトリウム水溶液', '塩酸', 'どちらも同じ'],
        answer: 'a',
        explanation: '塩酸 10 cm³ を、半分の 5 cm³ の水酸化ナトリウム水溶液で中和できました。少ない体積で中和できた水酸化ナトリウム水溶液のほうが濃い液です。',
        hint: '少ない体積で中和できるほうが濃いよ。',
      }),
      fill({
        id: 'ion-mp10-r3', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 5 cm³ でちょうど中性になります。空らんに入る数を入れよう。',
        text: '塩酸 20 cm³ には水酸化ナトリウム水溶液が[b1]、水酸化ナトリウム水溶液 40 cm³ には塩酸が[b2]必要である。',
        blanks: [number('b1', 10, 0, 'cm³'), number('b2', 80, 0, 'cm³')],
        explanation: '体積の比は 塩酸：水酸化ナトリウム水溶液 ＝ 2：1 です。塩酸 20 cm³ にはその半分の 10 cm³、水酸化ナトリウム水溶液 40 cm³ にはその 2 倍の 80 cm³ の塩酸が必要です。',
        hint: '塩酸は、水酸化ナトリウム水溶液の 2 倍の体積が必要だね。',
      }),
      choice({
        id: 'ion-mp10-r4', concept: 'io-neutral',
        prompt: '塩酸 10 cm³ は、水酸化ナトリウム水溶液 20 cm³ でちょうど中性になります。同じ塩酸 8 cm³ と、同じ水酸化ナトリウム水溶液 15 cm³ を混ぜると、液は何性になる？',
        options: ['酸性', '中性', 'アルカリ性'],
        answer: 'a',
        explanation: '塩酸 8 cm³ をちょうど中和するには、8 × 2 ＝ 16 cm³ が必要です。加えたのは 15 cm³ で足りないので、塩酸があまって酸性になります。',
        hint: 'まず、塩酸 8 cm³ をちょうど中和する量を計算しよう。',
      }),
    ],
  };

  // ================================================================
  // 領域 4: ドリル（.ai-tasks/20261121-152500_ドリル問題_共通.md）
  // 公開されているテーマ名（水溶液とイオン・酸・アルカリとイオン・電池とイオン）だけを目安にし、
  // 問題・解説・図はすべて中学理科の知識から自作した。既存の問いとは角度を変えている。
  // ================================================================

  // ---- ドリル用の図の部品 ----

  // 表のます目（左上 x・y、列の幅の配列 widths、行の高さ h、行の数 rows）。線は line 色
  function gridCells(x, y, widths, h, rows) {
    const items = [];
    for (let r = 0; r < rows; r++) {
      let left = x;
      widths.forEach(w => {
        items.push({ type: 'rect', x: left, y: y + h * r, width: w, height: h, fill: 'white', stroke: 'line' });
        left += w;
      });
    }
    return items;
  }

  // 表の文字（行ごとの文字の配列 rows を、列の中心 xs・行の基準線 ys に置く。size は 12〜13）
  function gridTexts(rows, xs, ys, size) {
    const items = [];
    rows.forEach((cells, r) => cells.forEach((t, c) => {
      if (t) items.push({ type: 'text', x: xs[c], y: ys[r], text: t, size: size || 13, anchor: 'middle' });
    }));
    return items;
  }

  // pH の数直線（0〜14 を x 20〜300。1 目もり 20px。帯は y 100〜124、酸性側は桃、アルカリ性側は水色）
  const phX = (ph) => 20 + 20 * ph;
  function phBar() {
    return [
      { type: 'rect', x: phX(0), y: 100, width: 140, height: 24, fill: 'pink', stroke: 'line' },
      { type: 'rect', x: phX(7), y: 100, width: 140, height: 24, fill: 'sky', stroke: 'line' },
      { type: 'line', points: [[phX(7), 94], [phX(7), 130]], width: 2 },
      { type: 'text', x: phX(0), y: 144, text: '0', size: 12, anchor: 'middle' },
      { type: 'text', x: phX(7), y: 144, text: '7', size: 12, anchor: 'middle' },
      { type: 'text', x: phX(14), y: 144, text: '14', size: 12, anchor: 'middle' },
    ];
  }

  // 電流の大きさ（または温度）のグラフの軸（原点 (50, 200)、縦軸の上 y 40、横軸の右 x 300）
  function graphAxes(yName, xName) {
    return [
      { type: 'line', points: [[50, 40], [50, 200], [300, 200]], width: 2 },
      { type: 'text', x: 14, y: 120, text: yName, size: 12 },
      { type: 'text', x: 175, y: 232, text: xName, size: 12, anchor: 'middle' },
    ];
  }

  // うすい硫酸に水酸化バリウム水溶液を加えたときの電流の変化（0〜20 cm³ を x 50〜300、10 cm³ で 0）
  const BA_CURVE = { type: 'line', points: [[50, 60], [175, 196], [300, 60]], color: 'blue', width: 3 };

  // 3 本のビーカーに金属板を入れた図（中心 x 60・160・260）。plates は板の名前、fills は板の色、liquids は液の名前
  function plateBeakers(plates, fills, liquids) {
    const items = [];
    [60, 160, 260].forEach((x, i) => {
      items.push({ type: 'beaker', x, y: 160, width: 70, height: 90, level: 0.7 });
      items.push({ type: 'rect', x: x - 6, y: 56, width: 12, height: 98, fill: fills[i] });
      items.push({ type: 'text', x, y: 46, text: plates[i], size: 13, anchor: 'middle' });
      items.push({ type: 'text', x, y: 182, text: liquids[i], size: 12, anchor: 'middle' });
    });
    return items;
  }

  // ---- ステージ ion-dr1: ドリル 1 電解質と電気分解の実験 ----
  const ionDr1 = {
    id: 'ion-dr1', areaId: 'io-ion', free: true, title: 'ドリル 1: 電解質と電気分解の実験', minutes: 6, concepts: ['io-electrolyte', 'io-electrolysis'],
    lessons: [
      {
        id: 'ion-dr1-c1',
        text: '電解質の水溶液の中では、陽イオンと陰イオンが自由に動けるので、電流が流れます。食塩の固体（結晶）ではイオンが動けないので、電流は流れません。食塩と砂糖を混ぜてとかした水溶液には、食塩のイオンがあるので電流が流れます。',
        // 左: 固体の中で並んだまま動けないイオン、右: 水溶液の中で動けるイオン
        figure: scene([
          { type: 'text', x: 80, y: 28, text: '固体（結晶）', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 28, text: '水溶液', size: 13, anchor: 'middle', bold: true },
          { type: 'rect', x: 10, y: 44, width: 140, height: 146, rx: 6, fill: 'white', stroke: 'line' },
          ion(40, 75, 'Na+'), ion(80, 75, 'Cl-'), ion(120, 75, 'Na+'),
          ion(40, 117, 'Cl-'), ion(80, 117, 'Na+'), ion(120, 117, 'Cl-'),
          ion(40, 159, 'Na+'), ion(80, 159, 'Cl-'), ion(120, 159, 'Na+'),
          { type: 'beaker', x: 240, y: 190, width: 130, height: 146, level: 0.85 },
          ion(200, 98, 'Na+'), ion(276, 110, 'Cl-'), ion(214, 160, 'Cl-'), ion(274, 166, 'Na+'),
          { type: 'arrow', x1: 222, y1: 98, x2: 246, y2: 98, color: 'gray', width: 2 },
          { type: 'arrow', x1: 236, y1: 160, x2: 258, y2: 148, color: 'gray', width: 2 },
          { type: 'text', x: 80, y: 214, text: 'イオンが動けない', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 214, text: 'イオンが動ける', size: 12, anchor: 'middle' },
          { type: 'text', x: 80, y: 232, text: '電流は流れない', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 232, text: '電流が流れる', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-dr1-c2',
        text: 'うすい塩酸を電気分解すると、陰極から**水素**、陽極から**塩素**が発生します。水素はマッチの火を近づけると音を立てて燃えます。塩素は刺激臭があり、色を消すはたらき（漂白作用）があります。塩素を出す実験では、部屋の換気をします。',
        // 塩酸の電気分解（左の電極が陽極で塩素、右の電極が陰極で水素）
        figure: scene(electrolysisItems('water').concat([
          ...[[118, 120], [102, 140], [119, 162], [100, 182], [210 + 10, 115], [198, 135], [221, 150], [199, 168], [220, 186]]
            .map(([x, y]) => ({ type: 'circle', x, y, r: 4, fill: 'white', stroke: 'gray' })),
          { type: 'text', x: 38, y: 130, text: '陽極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 38, y: 150, text: '塩素', size: 13, anchor: 'middle' },
          { type: 'text', x: 284, y: 130, text: '陰極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 284, y: 150, text: '水素', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 236, text: 'うすい塩酸', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-dr1-c3',
        text: '塩化銅水溶液を電気分解すると、陰極に**銅**が付きます。付いた物質を薬さじでこすると、金属の光沢が出ます。電流の大きさを変えなければ、陰極に付く銅の質量は、電流を流した時間に比例します。',
        // 電流を流した時間と、陰極に付いた銅の質量の表
        figure: scene(gridCells(10, 50, [100, 50, 50, 50, 50], 40, 2).concat(
          gridTexts([['時間〔分〕', '0', '5', '10', '15'], ['銅〔g〕', '0', '0.10', '0.20', '0.30']],
            [60, 135, 185, 235, 285], [76, 116], 13),
          [
            { type: 'text', x: 160, y: 30, text: '電流を流した時間と、陰極に付いた銅', size: 13, anchor: 'middle' },
            { type: 'text', x: 160, y: 170, text: '時間が 2 倍、3 倍になると', size: 14, anchor: 'middle' },
            { type: 'text', x: 160, y: 194, text: '銅の質量も 2 倍、3 倍になる', size: 14, anchor: 'middle', bold: true },
          ])),
      },
    ],
    warmup: choice({
      id: 'ion-dr1-w1', concept: 'io-electrolyte',
      prompt: '予想しよう。ぬれた手で電気の器具にさわると、感電しやすくて危ないといわれます。そのわけは何だと思う？',
      options: ['汗などがとけた水には電流が流れやすいから', '水が冷たくて手がこわばるから', '手が重くなるから'],
      answer: 'a',
      explanation: '手についた水には、汗などにふくまれる物質がとけています。その物質がイオンに分かれるので、電流が流れやすくなります。このステージで、電流が流れる水溶液について学ぼう。',
      hint: '純粋な水には電流がほとんど流れないけれど、手の水はどうかな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-dr1-p1', concept: 'io-electrolysis',
        prompt: '表は、4 つの水溶液ア〜エに電流を流した結果です。塩化銅水溶液だと考えられるのはア〜エのどれ？',
        // ア 塩酸など、イ 塩化銅水溶液（青色・陰極に赤い物質）、ウ 砂糖水など、エ 水酸化ナトリウム水溶液など
        figure: scene([
          { type: 'text', x: 110, y: 30, text: '液の色', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 180, y: 30, text: '電流', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 260, y: 30, text: '陰極のようす', size: 13, anchor: 'middle', bold: true },
          ...[40, 88, 136, 184].map(y => ({ type: 'line', points: [[4, y], [316, y]], color: 'gray', width: 1 })),
          ...gridTexts([
            ['無色', '流れた', '気体が出た'],
            ['青色', '流れた', '赤い物質が付いた'],
            ['無色', '流れない', '変化なし'],
            ['無色', '流れた', '気体が出た'],
          ], [110, 180, 260], [69, 117, 165, 213], 12),
          { type: 'region', id: 'r1', x: 30, y: 64, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 30, y: 112, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 30, y: 160, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 30, y: 208, r: 22, label: 'エ' },
        ]),
        answer: 'r2',
        explanation: '塩化銅水溶液は青色で、電流が流れます。陰極では銅イオンが銅になるので、赤い物質（銅）が付きます。気体が出たアとエは塩酸などで、電流が流れないウは非電解質の水溶液です。',
        hint: '塩化銅水溶液の色と、陰極に付く物質を思い出そう。',
      }),
      fill({
        id: 'ion-dr1-t1', concept: 'io-electrolysis', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電気分解で、電源の−極につないだ電極を[b1]という。',
        blanks: [word('b1', ['陰極', '陽極', '導線'], '陰極')],
        explanation: '電源の−極につないだ電極を**陰極**、＋極につないだ電極を**陽極**といいます。陽イオンは陰極に、陰イオンは陽極に引かれます。',
        hint: '−の電気を「陰」と表すよ。',
      }),
      choice({
        id: 'ion-dr1-p2', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液を電気分解したあと、陰極に付いた赤い物質を取り出し、薬さじでこすりました。どうなる？',
        options: ['金属の光沢が出る', '白い粉になる', '気体を出して消える'],
        answer: 'a',
        explanation: '陰極に付いた赤い物質は銅です。銅は金属なので、こすると金属の光沢が出ます。このことから、陰極で銅イオンが銅になったと分かります。',
        hint: '陰極に付いた物質は何だったかな。それは金属かな。',
      }),
      fill({
        id: 'ion-dr1-p3', concept: 'io-electrolysis',
        prompt: '電流の大きさを変えずに塩化銅水溶液を電気分解すると、陰極に付いた銅は 5 分で 0.15 g、10 分で 0.30 g でした。',
        text: '同じように 20 分間電流を流すと、陰極に付く銅は[b1]になる。',
        blanks: [number('b1', 0.6, 0, 'g')],
        explanation: '5 分で 0.15 g、10 分で 0.30 g なので、銅の質量は時間に比例しています。20 分は 10 分の 2 倍なので、0.30 × 2 ＝ 0.60 g です。',
        hint: '時間が 2 倍になると、付く銅の質量はどうなっているかな。',
      }),
      choice({
        id: 'ion-dr1-p4', concept: 'io-electrolyte',
        prompt: '食塩と砂糖を混ぜてから水にとかしました。この水溶液に電極を入れると、電流は流れる？',
        options: ['流れる', '流れない', '砂糖が多いときだけ流れる'],
        answer: 'a',
        explanation: '砂糖は電離しませんが、食塩は水にとけて Na+ と Cl- に分かれます。水溶液の中に動けるイオンがあるので、電流が流れます。',
        hint: '混ぜた物質のうち、どちらかがイオンに分かれれば…。',
      }),
      figureChoice({
        id: 'ion-dr1-p5', concept: 'io-electrolysis',
        prompt: '図のようにつないで塩化銅水溶液を電気分解すると、電極アから塩素が出て、イに銅が付きました。とちゅうで電源の＋と−をつなぎかえると、このあと銅が付くのはア・イのどちら？',
        figure: scene(electrolysisItems('sky').concat([
          { type: 'region', id: 'r1', x: 110, y: 150, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 210, y: 150, r: 22, label: 'イ' },
          { type: 'text', x: 160, y: 236, text: '塩化銅水溶液', size: 12, anchor: 'middle' },
        ])),
        answer: 'r1',
        explanation: 'つなぎかえると、さっきまで陽極だったアが陰極になります。銅イオン Cu2+ は陰極に引かれるので、さっきまで塩素が出ていたアに銅が付くようになります。',
        hint: '銅が付くのは、陽極と陰極のどちらだったかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-dr1-r1', concept: 'io-electrolyte',
        prompt: 'レモンのしるに電極を入れて電池と電流計につなぐと、電流が流れました。このことから分かることは？',
        options: ['レモンのしるには電解質がとけている', 'レモンのしるは純粋な水である', 'レモンのしるには何もとけていない'],
        answer: 'a',
        explanation: '電流が流れたのは、レモンのしるに電解質（酸など）がとけていて、イオンがあるからです。純粋な水には電流がほとんど流れません。',
        hint: '水溶液に電流が流れるのは、何がとけているときだったかな。',
      }),
      choice({
        id: 'ion-dr1-r2', concept: 'io-electrolyte',
        prompt: '塩化水素は、気体のままでは電流を流しませんが、水にとかした塩酸には電流が流れます。なぜ？',
        options: ['水にとけて H+ と Cl- に分かれるから', '水にとけると金属になるから', '水そのものに電流が流れるから'],
        answer: 'a',
        explanation: '塩化水素は水にとけると、水素イオン H+ と塩化物イオン Cl- に電離します。水溶液の中を動けるイオンができるので、電流が流れます。',
        hint: '電解質が水にとけると、何に分かれるかな。',
      }),
      choice({
        id: 'ion-dr1-r3', concept: 'io-electrolysis', term: true,
        prompt: '次の説明に合う言葉はどれ？「電気分解で、電源の＋極につないだ電極」',
        options: ['陽極', '陰極', '電解質'],
        answer: 'a',
        explanation: '電源の＋極につないだ電極を**陽極**といいます。陽極には陰イオン（Cl- など）が引かれます。',
        hint: '＋の電気を「陽」と表すよ。',
      }),
      fill({
        id: 'ion-dr1-r4', concept: 'io-electrolysis',
        prompt: '電流の大きさを変えずに塩化銅水溶液を電気分解すると、4 分で陰極に 0.12 g の銅が付きました。',
        text: '同じように 10 分間電流を流すと、陰極に付く銅は[b1]になる。',
        blanks: [number('b1', 0.3, 0, 'g')],
        explanation: '1 分あたり 0.12 ÷ 4 ＝ 0.03 g の銅が付いています。10 分では 0.03 × 10 ＝ 0.30 g です。',
        hint: 'まず、1 分あたりに付く銅の質量を求めよう。',
      }),
      choice({
        id: 'ion-dr1-r5', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液や塩酸の電気分解をするときに、気をつけることとして正しいものはどれ？',
        options: ['塩素が出るので、部屋の換気をする', '出た気体のにおいを、鼻を近づけてかぐ', '電極を手でさわって温度を調べる'],
        answer: 'a',
        explanation: '陽極から出る塩素は、刺激臭があり体に有害です。部屋の換気をし、においは手であおぐようにして調べます。',
        hint: '陽極から出る気体は、体にとってどうだったかな。',
      }),
      fill({
        id: 'ion-dr1-r6', concept: 'io-electrolysis',
        prompt: 'うすい塩酸を電気分解しました。陰極から出た気体を試験管に集めて、マッチの火を近づけると、音を立てて燃えました。',
        text: '陰極から出た気体は[b1]である。',
        blanks: [word('b1', ['水素', '塩素', '酸素'], '水素')],
        explanation: '塩酸の中の水素イオン H+ は陰極に引かれ、電子を受け取って水素になります。水素は、火を近づけると音を立てて燃えます。陽極からは塩素が出ます。',
        hint: '陰極に引かれるのは、塩酸の中のどの陽イオンかな。',
      }),
    ],
  };

  // ---- ステージ ion-dr2: ドリル 2 原子のつくりとイオンの表し方 ----
  const ionDr2 = {
    id: 'ion-dr2', areaId: 'io-ion', free: true, title: 'ドリル 2: 原子のつくりとイオンの表し方', minutes: 6, concepts: ['io-structure', 'io-electrolyte'],
    lessons: [
      {
        id: 'ion-dr2-c1',
        text: '原子では、陽子の数と電子の数が等しいので、全体は電気を帯びていません。ナトリウム原子（陽子 11 個・電子 11 個）が電子を 1 個失うと、電子は 10 個になり、＋の電気が 1 つ多い **Na+** になります。',
        // ナトリウム原子とナトリウムイオンの、陽子・電子の数の表
        figure: scene(gridCells(10, 40, [110, 66, 66, 66], 44, 3).concat(
          gridTexts([['', '陽子', '電子', '電気'], ['Na 原子', '11 個', '11 個', 'なし'], ['Na+', '11 個', '10 個', '＋1']],
            [65, 153, 219, 285], [67, 111, 155], 13),
          [
            { type: 'text', x: 160, y: 204, text: '電子を 1 個失うと Na+ になる', size: 14, anchor: 'middle', bold: true },
            { type: 'text', x: 160, y: 226, text: '（陽子の数は変わらない）', size: 12, anchor: 'middle' },
          ])),
      },
      {
        id: 'ion-dr2-c2',
        text: 'イオンは**イオン式**で表します。元素記号の右上に、帯びた電気の種類と数を書きます（ここでは Mg2+ のように書きます）。硫酸イオン SO₄2- やアンモニウムイオン NH₄+ のように、原子のまとまりのイオンもあります。',
        // 陽イオンと陰イオンのイオン式と名前
        figure: scene([
          { type: 'rect', x: 10, y: 20, width: 145, height: 210, rx: 8, fill: '#FFF3C4', stroke: 'line' },
          { type: 'rect', x: 165, y: 20, width: 145, height: 210, rx: 8, fill: 'glass', stroke: 'line' },
          { type: 'text', x: 82, y: 44, text: '陽イオン', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 237, y: 44, text: '陰イオン', size: 14, anchor: 'middle', bold: true },
          ...[['H+', '水素イオン'], ['Na+', 'ナトリウムイオン'], ['Cu2+', '銅イオン'], ['NH₄+', 'アンモニウムイオン']]
            .flatMap(([f, n], i) => [
              { type: 'text', x: 82, y: 72 + 40 * i, text: f, size: 14, anchor: 'middle', bold: true },
              { type: 'text', x: 82, y: 88 + 40 * i, text: n, size: 12, anchor: 'middle' },
            ]),
          ...[['Cl-', '塩化物イオン'], ['OH-', '水酸化物イオン'], ['SO₄2-', '硫酸イオン']]
            .flatMap(([f, n], i) => [
              { type: 'text', x: 237, y: 72 + 40 * i, text: f, size: 14, anchor: 'middle', bold: true },
              { type: 'text', x: 237, y: 88 + 40 * i, text: n, size: 12, anchor: 'middle' },
            ]),
        ]),
      },
      {
        id: 'ion-dr2-c3',
        text: '電離のようすを式で表すとき、矢印の左右で、原子の種類と数、＋と−の電気の量がそろいます。CuSO₄ → Cu2+ ＋ SO₄2-、MgCl₂ → Mg2+ ＋ 2Cl- のように表します。',
        // 2 つの電離の式と、左右でそろうもの
        figure: scene([
          { type: 'text', x: 160, y: 50, text: 'CuSO₄ → Cu2+ ＋ SO₄2-', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 76, text: '電気: ＋2 と −2 で、あわせて 0', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 126, text: 'MgCl₂ → Mg2+ ＋ 2Cl-', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 152, text: '電気: ＋2 と −1 × 2 で、あわせて 0', size: 12, anchor: 'middle' },
          { type: 'rect', x: 30, y: 180, width: 260, height: 40, rx: 8, fill: 'lightgreen', stroke: 'line' },
          { type: 'text', x: 160, y: 205, text: '左右で原子の数と電気の量がそろう', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-dr2-w1', concept: 'io-structure',
      prompt: '予想しよう。原子をつくる陽子・中性子・電子のうち、いちばん軽い粒はどれだと思う？',
      options: ['電子', '陽子', '中性子'],
      answer: 'a',
      explanation: '電子は、陽子や中性子よりもずっと軽い粒です（陽子の約 1840 分の 1）。原子の質量のほとんどは、中心の原子核にあります。',
      hint: '原子の中心にある粒と、まわりにある粒をくらべよう。',
    }),
    problems: [
      fill({
        id: 'ion-dr2-p1', concept: 'io-structure',
        prompt: 'マグネシウム原子は、陽子を 12 個、電子を 12 個もっています。この原子がマグネシウムイオン Mg2+ になりました。',
        text: 'Mg2+ がもっている電子は[b1]である。',
        blanks: [number('b1', 10, 0, '個')],
        explanation: 'Mg2+ の「2+」は、電子を 2 個失って＋の電気が 2 つ多くなったという意味です。電子は 12 − 2 ＝ 10 個になります。陽子は 12 個のままです。',
        hint: 'イオン式の右上の「2+」は、電子をいくつ失ったことを表すかな。',
      }),
      fill({
        id: 'ion-dr2-t1', concept: 'io-structure', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'Na+ や Cl- のように、イオンを元素記号と＋・−で表した式を[b1]という。',
        blanks: [word('b1', ['イオン式', '化学反応式', '電離'], 'イオン式')],
        explanation: 'イオンを表す式を**イオン式**といいます。元素記号の右上に、帯びた電気の種類（＋か−）と数を書きます。',
        hint: 'イオンを表すための式だよ。',
      }),
      figureChoice({
        id: 'ion-dr2-p2', concept: 'io-structure',
        prompt: 'ア Mg2+、イ OH-、ウ NH₄+、エ SO₄2- のイオン式です。−の電気を 2 つ帯びた陰イオンはア〜エのどれ？',
        figure: scene([
          { type: 'text', x: 160, y: 40, text: 'いろいろなイオン', size: 13, anchor: 'middle' },
          ion(50, 105, 'Mg2+'), ion(125, 105, 'OH-'), ion(200, 105, 'NH₄+'), ion(275, 105, 'SO₄2-', 27),
          { type: 'region', id: 'r1', x: 50, y: 180, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 125, y: 180, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 200, y: 180, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 275, y: 180, r: 22, label: 'エ' },
        ]),
        answer: 'r4',
        explanation: 'イオン式の右上の「2-」は、−の電気を 2 つ帯びていることを表します。SO₄2-（硫酸イオン）がそれです。Mg2+ は＋を 2 つ、OH- は−を 1 つ、NH₄+ は＋を 1 つ帯びています。',
        hint: 'イオン式の右上の記号と数字を見よう。',
      }),
      choice({
        id: 'ion-dr2-p3', concept: 'io-structure',
        prompt: '陽子を 17 個もつ塩素原子が、塩化物イオン Cl- になりました。Cl- の陽子と電子の数はどれ？',
        options: ['陽子 17 個・電子 18 個', '陽子 18 個・電子 17 個', '陽子 17 個・電子 16 個'],
        answer: 'a',
        explanation: '塩素原子は陽子 17 個・電子 17 個です。電子を 1 個受け取って Cl- になるので、電子は 18 個になります。陽子の数は変わりません。',
        hint: '陰イオンになるとき、増えるのは陽子と電子のどちらかな。',
      }),
      fill({
        id: 'ion-dr2-p4', concept: 'io-electrolyte',
        prompt: '硫酸銅 CuSO₄ が水にとけて電離するようすを表す式です。空らんに入るものを選ぼう。',
        text: 'CuSO₄ → Cu2+ ＋ [b1]',
        blanks: [word('b1', ['SO₄2-', '2SO₄-', 'SO₄-'], 'SO₄2-')],
        explanation: 'CuSO₄ は、銅イオン Cu2+ と硫酸イオン SO₄2- に分かれます。＋2 と −2 で、電気の量がつり合っています。',
        hint: 'Cu2+ の＋2 とつり合うには、−の電気がいくつ必要かな。',
      }),
      choice({
        id: 'ion-dr2-p5', concept: 'io-electrolyte',
        prompt: '電離のようすを表す式で、矢印の左側と右側でそろっていなければならないものはどれ？',
        options: ['原子の種類と数、電気の量', '分子の数', 'イオンの大きさ'],
        answer: 'a',
        explanation: '電離では、原子がなくなったり新しくできたりしません。だから式の左右で原子の種類と数がそろいます。また、物質はもともと電気を帯びていないので、右側の＋と−の電気の量もつり合います。',
        hint: '電離しても、原子が消えたり増えたりはしないよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-dr2-r1', concept: 'io-structure',
        prompt: '原子がイオンになるとき、数が変わらないものはどれ？',
        options: ['陽子の数', '電子の数', '帯びている電気の量'],
        answer: 'a',
        explanation: '原子がイオンになるときに、失ったり受け取ったりするのは電子です。原子核の中の陽子の数は変わりません。',
        hint: 'イオンになるとき、原子の外側の粒が出入りするよ。',
      }),
      fill({
        id: 'ion-dr2-r2', concept: 'io-structure',
        prompt: 'アルミニウム原子は、陽子を 13 個、電子を 13 個もっています。この原子がアルミニウムイオン Al3+ になりました。',
        text: 'Al3+ がもっている電子は[b1]である。',
        blanks: [number('b1', 10, 0, '個')],
        explanation: 'Al3+ は、電子を 3 個失って＋の電気が 3 つ多くなったイオンです。電子は 13 − 3 ＝ 10 個です。',
        hint: '「3+」は、電子をいくつ失ったことを表すかな。',
      }),
      choice({
        id: 'ion-dr2-r3', concept: 'io-structure', term: true,
        prompt: '次の説明に合う言葉はどれ？「原子が電子を受け取って、−の電気を帯びたもの」',
        options: ['陰イオン', '陽イオン', '中性子'],
        answer: 'a',
        explanation: '原子が電子を受け取って−の電気を帯びたものを**陰イオン**といいます。Cl- や OH- がその例です。',
        hint: '−の電気を「陰」と表すよ。',
      }),
      drag({
        id: 'ion-dr2-r4', concept: 'io-electrolyte',
        prompt: '塩化カルシウム CaCl₂ が水にとけて電離するようすを表す式です。左右をそろえるには、係数「2」のカードをどの四角に置けばよい？ 動かして置こう。',
        // 位置はカード（rect）の左上で判定する。四角の左上: Ca2+ の前 (118, 88)、Cl- の前 (226, 88)。
        // 正解は Cl- の前、不正解例は Ca2+ の前（108px はなれる）
        figure: scene([
          { type: 'text', x: 160, y: 40, text: '塩化カルシウムの電離', size: 14, anchor: 'middle' },
          { type: 'text', x: 50, y: 110, text: 'CaCl₂', size: 18, anchor: 'middle' },
          { type: 'text', x: 100, y: 110, text: '→', size: 18, anchor: 'middle' },
          { type: 'rect', x: 118, y: 88, width: 30, height: 32, fill: 'white', stroke: 'gray' },
          { type: 'text', x: 176, y: 110, text: 'Ca2+', size: 18, anchor: 'middle' },
          { type: 'text', x: 210, y: 110, text: '＋', size: 18, anchor: 'middle' },
          { type: 'rect', x: 226, y: 88, width: 30, height: 32, fill: 'white', stroke: 'gray' },
          { type: 'text', x: 280, y: 110, text: 'Cl-', size: 18, anchor: 'middle' },
          { type: 'rect', id: 'card', x: 145, y: 170, width: 30, height: 32, fill: 'sky', stroke: 'ink', label: '2' },
        ]),
        draggable: { itemId: 'card' },
        target: { x: 226, y: 88 },
        samples: { correct: { x: 226, y: 88 }, wrong: { x: 118, y: 88 } },
        explanation: 'CaCl₂ には塩素が 2 個あるので、Cl- が 2 個できます（CaCl₂ → Ca2+ ＋ 2Cl-）。カルシウムイオンは Ca2+ で、＋2 と −1 × 2 がつり合います。',
        hint: '左の CaCl₂ に塩素原子はいくつあるかな。',
      }),
      fill({
        id: 'ion-dr2-r5', concept: 'io-electrolyte',
        prompt: '塩化銅 CuCl₂ が電離して、水溶液の中に銅イオン Cu2+ が 100 個できました。',
        text: 'このとき、塩化物イオン Cl- は[b1]できている。',
        blanks: [number('b1', 200, 0, '個')],
        explanation: 'CuCl₂ → Cu2+ ＋ 2Cl- のように、Cu2+ 1 個に対して Cl- が 2 個できます。だから Cl- は 100 × 2 ＝ 200 個です。',
        hint: '電離の式で、Cu2+ 1 個に対して Cl- はいくつかな。',
      }),
    ],
  };

  // ---- ステージ ion-dr3: ドリル 3 指示薬と pH ----
  const ionDr3 = {
    id: 'ion-dr3', areaId: 'io-acid', free: true, title: 'ドリル 3: 指示薬と pH', minutes: 6, concepts: ['io-acidbase'],
    lessons: [
      {
        id: 'ion-dr3-c1',
        text: '酸性・中性・アルカリ性を色の変化で調べる薬品を**指示薬**といいます。リトマス紙・BTB 溶液・フェノールフタレイン溶液のほか、ムラサキキャベツの液も使えます。ムラサキキャベツの液は、酸性で赤色、中性で紫色、アルカリ性で緑色〜黄色（弱いアルカリ性では青色）になります。',
        // ムラサキキャベツの液の色
        figure: scene([
          { type: 'text', x: 160, y: 30, text: 'ムラサキキャベツの液の色', size: 14, anchor: 'middle' },
          { type: 'beaker', x: 60, y: 160, width: 70, height: 90, level: 0.7, liquid: 'pink' },
          { type: 'beaker', x: 160, y: 160, width: 70, height: 90, level: 0.7, liquid: 'purple' },
          { type: 'beaker', x: 260, y: 160, width: 70, height: 90, level: 0.7, liquid: 'lightgreen' },
          { type: 'text', x: 60, y: 186, text: '酸性', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 186, text: '中性', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 260, y: 186, text: 'アルカリ性', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 60, y: 208, text: '赤色', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 208, text: '紫色', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 208, text: '緑色〜黄色', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-dr3-c2',
        text: '**pH** が 7 のとき中性で、7 より小さいほど酸性が強く、7 より大きいほどアルカリ性が強くなります。レモンのしるは約 2、食塩水は 7、セッケン水は約 10 です。pH は、pH 試験紙や pH メーターで調べます。',
        // pH の数直線と、身のまわりの液の pH
        figure: scene(phBar().concat([
          { type: 'text', x: 70, y: 84, text: '← 酸性が強い', size: 12, anchor: 'middle' },
          { type: 'text', x: 250, y: 84, text: 'アルカリ性が強い →', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 60, text: '中性 pH 7', size: 13, anchor: 'middle', bold: true },
          ...[2, 7, 10].map(ph => ({ type: 'circle', x: phX(ph), y: 112, r: 5, fill: 'ink', stroke: 'none' })),
          { type: 'text', x: phX(2), y: 176, text: 'レモンのしる 約 2', size: 12, anchor: 'middle' },
          { type: 'text', x: phX(7), y: 200, text: '食塩水 7', size: 12, anchor: 'middle' },
          { type: 'text', x: 250, y: 224, text: 'セッケン水 約 10', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'ion-dr3-w1', concept: 'io-acidbase',
      prompt: '予想しよう。紫色のムラサキキャベツの液に、すっぱいレモンのしるを加えると、何色になると思う？',
      options: ['赤っぽい色', '緑っぽい色', '紫色のまま'],
      answer: 'a',
      explanation: 'レモンのしるは酸性です。ムラサキキャベツの液は、酸性で赤っぽい色に変わります。身近な植物の液も、指示薬として使えます。',
      hint: 'レモンのしるが、酸性・中性・アルカリ性のどれかを考えよう。',
    }),
    problems: [
      figureChoice({
        id: 'ion-dr3-p1', concept: 'io-acidbase',
        prompt: '数直線のア〜エは pH 1・4・7・11 の水溶液です。マグネシウムを入れると水素が出る水溶液のうち、酸性がいちばん弱いのはどれ？',
        figure: scene(phBar().concat([
          { type: 'text', x: 160, y: 40, text: 'pH の数直線', size: 13, anchor: 'middle' },
          ...[[1, 'pH 1'], [4, 'pH 4'], [7, 'pH 7'], [11, 'pH 11']].flatMap(([ph, t]) => [
            { type: 'text', x: phX(ph), y: 88, text: t, size: 12, anchor: 'middle' },
            { type: 'line', points: [[phX(ph), 124], [phX(ph), 166]], color: 'gray', width: 2 },
          ]),
          { type: 'region', id: 'r1', x: phX(1), y: 188, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: phX(4), y: 188, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: phX(7), y: 188, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: phX(11), y: 188, r: 22, label: 'エ' },
        ])),
        answer: 'r2',
        explanation: 'マグネシウムを入れると水素が出るのは、酸性の水溶液（pH が 7 より小さい ア と イ）です。pH は 7 に近いほど酸性が弱いので、pH 4 のイが答えです。ウは中性、エはアルカリ性です。',
        hint: 'まず酸性の水溶液をえらび、その中で 7 に近いものをさがそう。',
      }),
      fill({
        id: 'ion-dr3-t1', concept: 'io-acidbase', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'BTB 溶液やリトマス紙のように、水溶液の性質を色の変化で調べる薬品を[b1]という。',
        blanks: [word('b1', ['指示薬', '電解質', '塩'], '指示薬')],
        explanation: '水溶液が酸性・中性・アルカリ性のどれかを、色の変化で調べる薬品を**指示薬**といいます。',
        hint: '性質を「指し示す」薬だよ。',
      }),
      fill({
        id: 'ion-dr3-p2', concept: 'io-acidbase',
        prompt: 'ムラサキキャベツの液に、ある水溶液を少し加えると、液が紫色から緑色に変わりました。空らんに入る言葉を選ぼう。',
        text: '加えた水溶液は[b1]である。',
        blanks: [word('b1', ['アルカリ性', '酸性', '中性'], 'アルカリ性')],
        explanation: 'ムラサキキャベツの液は、酸性で赤色、中性で紫色のまま、アルカリ性で緑色〜黄色になります（弱いアルカリ性では青色に見えることもあります）。緑色に変わったので、加えた水溶液はアルカリ性です。',
        hint: '赤色になるのは酸性、緑色や黄色になるのは何性かな。',
      }),
      choice({
        id: 'ion-dr3-p3', concept: 'io-acidbase',
        prompt: 'うすい塩酸に水を加えて、さらにうすめていきました。pH はどう変わる？',
        options: ['大きくなって 7 に近づく', '小さくなって 0 に近づく', '7 をこえて大きくなる'],
        answer: 'a',
        explanation: '水でうすめると、水素イオンの割合が減って酸性が弱くなります。pH は大きくなって 7 に近づきますが、水を加えるだけでは 7 をこえてアルカリ性にはなりません。',
        hint: '酸性が弱くなると、pH は 7 に近づくよ。',
      }),
      figureChoice({
        id: 'ion-dr3-p4', concept: 'io-acidbase',
        prompt: '水溶液 X は、青色リトマス紙を赤色に変え、BTB 溶液を黄色にしました。X の pH として考えられるのは、数直線のア（pH 3）・イ（pH 7）・ウ（pH 10）のどれ？',
        figure: scene(phBar().concat([
          { type: 'text', x: 160, y: 40, text: 'pH の数直線', size: 13, anchor: 'middle' },
          ...[[3, 'pH 3'], [7, 'pH 7'], [10, 'pH 10']].flatMap(([ph, t]) => [
            { type: 'text', x: phX(ph), y: 88, text: t, size: 12, anchor: 'middle' },
            { type: 'line', points: [[phX(ph), 124], [phX(ph), 166]], color: 'gray', width: 2 },
          ]),
          { type: 'region', id: 'r1', x: phX(3), y: 188, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: phX(7), y: 188, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: phX(10), y: 188, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '青色リトマス紙を赤色にし、BTB 溶液を黄色にするのは酸性の水溶液です。酸性の pH は 7 より小さいので、pH 3 のアが答えです。',
        hint: '2 つの結果から、X が何性かを決めよう。',
      }),
      choice({
        id: 'ion-dr3-p5', concept: 'io-acidbase',
        prompt: '食酢・食塩水・セッケン水を、pH の小さいものから順に並べたものはどれ？',
        options: ['食酢・食塩水・セッケン水', 'セッケン水・食塩水・食酢', '食塩水・食酢・セッケン水'],
        answer: 'a',
        explanation: '食酢は酸性（pH 約 3）、食塩水は中性（pH 7）、セッケン水はアルカリ性（pH 約 10）です。pH の小さい順は、食酢・食塩水・セッケン水です。',
        hint: '酸性のものほど pH は小さいよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-dr3-r1', concept: 'io-acidbase',
        prompt: 'pH 試験紙で水溶液の pH を調べるときのやり方として、正しいものはどれ？',
        options: ['ガラス棒で液を少しつけ、色を表とくらべる', '試験紙を液に長い時間ひたしておく', '指で液をつけて、色を見る'],
        answer: 'a',
        explanation: 'pH 試験紙には、ガラス棒で液を少しつけます。変わった色を、色と pH の対応を表した表とくらべて pH を読みとります。液は指でさわらないようにします。',
        hint: '薬品は手でさわらずに調べよう。',
      }),
      fill({
        id: 'ion-dr3-r2', concept: 'io-acidbase',
        prompt: 'pH 9 の水溶液と pH 12 の水溶液があります。空らんに入る数を入れよう。',
        text: 'アルカリ性が強いのは、pH が[b1]の水溶液である。',
        blanks: [number('b1', 12, 0, '')],
        explanation: 'pH は 7 より大きいほどアルカリ性が強くなります。だから pH 12 のほうがアルカリ性が強い水溶液です。',
        hint: 'アルカリ性は、7 からはなれて大きくなるほど強いよ。',
      }),
      fill({
        id: 'ion-dr3-r3', concept: 'io-acidbase', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '酸性でもアルカリ性でもない、pH が 7 の性質を[b1]という。',
        blanks: [word('b1', ['中性', '中和', '電離'], '中性')],
        explanation: '酸性でもアルカリ性でもない性質を**中性**といいます。食塩水や砂糖水は中性で、pH は 7 です。',
        hint: 'pH 7 は、ちょうどまん中だよ。',
      }),
      choice({
        id: 'ion-dr3-r4', concept: 'io-acidbase',
        prompt: '水溶液 Y にフェノールフタレイン溶液を加えると、赤色になりました。Y の pH として考えられるのはどれ？',
        options: ['11', '7', '2'],
        answer: 'a',
        explanation: 'フェノールフタレイン溶液が赤色になるのは、アルカリ性の水溶液です。アルカリ性の pH は 7 より大きいので、11 が答えです。',
        hint: 'フェノールフタレイン溶液は、何性で赤色になるかな。',
      }),
      choice({
        id: 'ion-dr3-r5', concept: 'io-acidbase',
        prompt: 'うすい水酸化ナトリウム水溶液を水でうすめていくと、pH はどう変わる？',
        options: ['小さくなって 7 に近づく', '大きくなって 14 に近づく', '7 より小さくなる'],
        answer: 'a',
        explanation: '水でうすめると、水酸化物イオンの割合が減ってアルカリ性が弱くなります。pH は小さくなって 7 に近づきますが、7 より小さくはなりません。',
        hint: 'アルカリ性が弱くなると、pH は 7 に近づくよ。',
      }),
    ],
  };

  // ---- ステージ ion-dr4: ドリル 4 中和で起こることと中和の量 ----
  const ionDr4 = {
    id: 'ion-dr4', areaId: 'io-acid', free: true, title: 'ドリル 4: 中和で起こることと中和の量', minutes: 7, concepts: ['io-neutral'],
    lessons: [
      {
        id: 'ion-dr4-c1',
        text: '中和では、H+ と OH- が結びついて水ができ、このとき熱が出ます（中和は**発熱反応**）。酸性の液にアルカリを少し加えただけでも、加えた分の中和は起こっています。液の温度は、中和が終わるまで上がっていきます。',
        // 加えた水酸化ナトリウム水溶液の量と、液の温度
        figure: scene(graphAxes('温度', '加えた水酸化ナトリウム水溶液の量').concat([
          { type: 'line', points: [[50, 170], [175, 70], [300, 92]], color: 'orange', width: 3 },
          { type: 'line', points: [[175, 70], [175, 200]], color: 'gray', width: 1, dashed: true },
          { type: 'text', x: 175, y: 52, text: '中和が終わる', size: 12, anchor: 'middle' },
          { type: 'text', x: 92, y: 106, text: '上がる', size: 13, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'ion-dr4-c2',
        text: '中和でできる塩には、水にとける塩と、水にとけにくい塩があります。塩化ナトリウムは水にとけるので、液は透明なままです。硫酸と水酸化バリウムの中和でできる硫酸バリウムは水にとけにくく、白い**沈殿**になります。',
        // 水にとける塩（液は透明）と、水にとけにくい塩（白い沈殿）
        figure: scene([
          { type: 'text', x: 85, y: 30, text: '塩化ナトリウム', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 85, y: 48, text: '（水にとける）', size: 12, anchor: 'middle' },
          { type: 'text', x: 235, y: 30, text: '硫酸バリウム', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 235, y: 48, text: '（水にとけにくい）', size: 12, anchor: 'middle' },
          { type: 'beaker', x: 85, y: 200, width: 100, height: 120, level: 0.7 },
          { type: 'beaker', x: 235, y: 200, width: 100, height: 120, level: 0.7 },
          { type: 'rect', x: 188, y: 180, width: 94, height: 18, fill: 'white', stroke: 'line' },
          { type: 'text', x: 235, y: 150, text: '白い沈殿', size: 13, anchor: 'middle' },
          { type: 'line', points: [[235, 156], [235, 178]], width: 2 },
          { type: 'text', x: 85, y: 150, text: '透明なまま', size: 13, anchor: 'middle' },
          { type: 'text', x: 85, y: 226, text: '塩酸 ＋ 水酸化ナトリウム', size: 12, anchor: 'middle' },
          { type: 'text', x: 235, y: 226, text: '硫酸 ＋ 水酸化バリウム', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-dr4-c3',
        text: 'うすい硫酸に水酸化バリウム水溶液を加えていくと、イオンが水や沈殿に変わって減るので、電流が流れにくくなります。ちょうど中和したとき、電流はほとんど流れません。さらに加えると、イオンが増えてまた流れます。',
        // 電流の大きさの変化（V 字）
        figure: scene(graphAxes('電流', '加えた水酸化バリウム水溶液の量').concat([
          BA_CURVE,
          { type: 'line', points: [[175, 40], [175, 196]], color: 'gray', width: 1, dashed: true },
          { type: 'text', x: 175, y: 30, text: 'ちょうど中和（電流がほぼ 0）', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'ion-dr4-w1', concept: 'io-neutral',
      prompt: '予想しよう。うすい塩酸に、うすい水酸化ナトリウム水溶液を少しずつ加えていきます。液の温度はどうなると思う？',
      options: ['上がる', '下がる', '変わらない'],
      answer: 'a',
      explanation: '中和では、H+ と OH- が結びついて水ができるときに熱が出ます。だから液の温度は上がります。このステージで、中和で起こることをくわしく見ていこう。',
      hint: '中和は、熱を出す化学変化だよ。',
    }),
    problems: [
      figureChoice({
        id: 'ion-dr4-p1', concept: 'io-neutral',
        prompt: 'うすい硫酸に水酸化バリウム水溶液を加えたときの、電流の大きさのグラフです。ちょうど中和したのはア〜ウのどの点？',
        figure: scene(graphAxes('電流', '加えた水酸化バリウム水溶液の量').concat([
          BA_CURVE,
          { type: 'region', id: 'r1', x: 75, y: 87, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 175, y: 190, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 275, y: 87, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: 'ちょうど中和すると、H+ は水に、硫酸イオンは硫酸バリウムの沈殿になって、水溶液の中のイオンがほとんどなくなります。だから電流がほとんど流れないイの点が、ちょうど中和したところです。',
        hint: '水溶液の中のイオンがいちばん少なくなるのは、どこかな。',
      }),
      fill({
        id: 'ion-dr4-t1', concept: 'io-neutral', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水にとけにくい物質ができて、液の中に固体として出てきたものを[b1]という。',
        blanks: [word('b1', ['沈殿', '電解質', '指示薬'], '沈殿')],
        explanation: '水にとけにくい物質が、液の中で固体として出てきたものを**沈殿**といいます。硫酸と水酸化バリウムの中和でできる硫酸バリウムは、白い沈殿になります。',
        hint: '液の底にしずんでたまるよ。',
      }),
      choice({
        id: 'ion-dr4-p2', concept: 'io-neutral',
        prompt: 'うすい塩酸と水酸化ナトリウム水溶液を混ぜて中和させても、沈殿はできません。なぜ？',
        options: ['できた塩化ナトリウムが水にとけるから', '中和が起こっていないから', '塩ができないから'],
        answer: 'a',
        explanation: 'この中和でも塩（塩化ナトリウム）はできています。塩化ナトリウムは水にとけるので、Na+ と Cl- のまま液の中にあり、沈殿にはなりません。',
        hint: 'できる塩が、水にとけるかどうかを考えよう。',
      }),
      fill({
        id: 'ion-dr4-p3', concept: 'io-neutral',
        prompt: 'うすい塩酸 15 cm³ は、うすい水酸化ナトリウム水溶液 10 cm³ でちょうど中和します。',
        text: '同じ水酸化ナトリウム水溶液 25 cm³ をちょうど中和する、同じ塩酸の体積は[b1]である。',
        blanks: [number('b1', 37.5, 0, 'cm³')],
        explanation: '塩酸と水酸化ナトリウム水溶液は、体積の比 15 : 10 ＝ 3 : 2 で中和します。水酸化ナトリウム水溶液 25 cm³ には、塩酸 25 × 3 ÷ 2 ＝ 37.5 cm³ が必要です。',
        hint: '塩酸と水酸化ナトリウム水溶液の体積の比を使おう。',
      }),
      choice({
        id: 'ion-dr4-p4', concept: 'io-neutral',
        prompt: 'BTB 溶液を加えたうすい塩酸に、水酸化ナトリウム水溶液を少し加えました。液はまだ黄色です。このとき中和は起こっている？',
        options: ['起こっている', '中性になるまで起こらない', 'アルカリ性になってから起こる'],
        answer: 'a',
        explanation: '加えた水酸化ナトリウムの OH- は、液の中の H+ とすぐに結びついて水になります。H+ がまだ残っているので液は酸性（黄色）ですが、加えた分の中和は起こっています。',
        hint: '加えた OH- は、液の中で何と出会うかな。',
      }),
      choice({
        id: 'ion-dr4-p5', concept: 'io-neutral',
        prompt: '胃の中の酸が多すぎるときに飲む薬には、どんな性質の物質が使われている？',
        options: ['弱いアルカリ性の物質', '強い酸性の物質', '中性の砂糖'],
        answer: 'a',
        explanation: '胃の中の酸（塩酸）を弱いアルカリ性の物質で中和して、酸の強さをやわらげます。身のまわりでも、中和が利用されています。',
        hint: '酸の性質を打ち消すには、何を混ぜればよいかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-dr4-r1', concept: 'io-neutral',
        prompt: '雨などで酸性になった畑の土に、何をまいて中和する？',
        options: ['消石灰などのアルカリ性の物質', '食酢などの酸性の物質', '砂糖などの中性の物質'],
        answer: 'a',
        explanation: '酸性になった土には、消石灰（水酸化カルシウム）などのアルカリ性の物質をまいて中和し、作物が育ちやすい土にします。',
        hint: '酸性を打ち消すのは、何性の物質かな。',
      }),
      fill({
        id: 'ion-dr4-r2', concept: 'io-neutral',
        prompt: 'うすい塩酸 15 cm³ は、うすい水酸化ナトリウム水溶液 10 cm³ でちょうど中和します。',
        text: '同じ塩酸 6 cm³ をちょうど中和する、同じ水酸化ナトリウム水溶液の体積は[b1]である。',
        blanks: [number('b1', 4, 0, 'cm³')],
        explanation: '塩酸と水酸化ナトリウム水溶液は、体積の比 3 : 2 で中和します。塩酸 6 cm³ には、6 × 2 ÷ 3 ＝ 4 cm³ が必要です。',
        hint: '15 : 10 を、かんたんな比にしてから考えよう。',
      }),
      choice({
        id: 'ion-dr4-r3', concept: 'io-neutral', term: true,
        prompt: '次の説明に合う言葉はどれ？「中和のように、熱を出してまわりの温度を上げる化学変化」',
        options: ['発熱反応', '吸熱反応', '電気分解'],
        answer: 'a',
        explanation: '熱を出してまわりの温度を上げる化学変化を**発熱反応**といいます。中和も発熱反応です。',
        hint: '熱を「発する」反応だよ。',
      }),
      figureChoice({
        id: 'ion-dr4-r4', concept: 'io-neutral',
        prompt: 'うすい硫酸に水酸化バリウム水溶液を少しずつ加え、電流の大きさを調べました。電流の変わり方を表すグラフは、ア〜ウのどれ？',
        // 3 つの小さなグラフ（縦軸: 電流、横軸: 加えた量）。ア 増え続ける、イ V 字、ウ 変わらない
        figure: scene([
          ...[15, 115, 215].flatMap(x0 => [
            { type: 'line', points: [[x0, 50], [x0, 140], [x0 + 90, 140]], width: 2 },
          ]),
          { type: 'line', points: [[15, 130], [100, 60]], color: 'blue', width: 3 },
          { type: 'line', points: [[115, 60], [160, 136], [200, 60]], color: 'blue', width: 3 },
          { type: 'line', points: [[215, 90], [300, 90]], color: 'blue', width: 3 },
          { type: 'text', x: 160, y: 30, text: '縦軸: 電流　横軸: 加えた水酸化バリウム水溶液の量', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 60, y: 186, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 186, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 186, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '加えるにつれてイオンが水や硫酸バリウムの沈殿になるので、電流は小さくなります。ちょうど中和したあとは、加えた Ba2+ と OH- が増えていくので、また大きくなります。だから V 字のイです。',
        hint: '水溶液の中のイオンの数の変わり方を考えよう。',
      }),
    ],
  };

  // ---- ステージ ion-dr5: ドリル 5 イオン化傾向と金属のイオン ----
  const ionDr5 = {
    id: 'ion-dr5', areaId: 'io-ion', free: true, title: 'ドリル 5: イオン化傾向と金属のイオン', minutes: 6, concepts: ['io-battery'],
    lessons: [
      {
        id: 'ion-dr5-c1',
        text: '金属の陽イオンへのなりやすさを**イオン化傾向**といいます。イオン化傾向が大きい金属を、それより小さい金属のイオンをふくむ水溶液に入れると、大きいほうの金属がイオンになってとけ、小さいほうの金属が出てきます。',
        // イオン化傾向の大きい順
        figure: scene([
          { type: 'arrow', x1: 290, y1: 70, x2: 30, y2: 70, color: 'blue', width: 3 },
          { type: 'text', x: 160, y: 56, text: '陽イオンになりやすい', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 118, text: 'Mg ＞ Zn ＞ Fe ＞ Cu ＞ Ag', size: 18, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 146, text: '（マグネシウム・亜鉛・鉄・銅・銀）', size: 12, anchor: 'middle' },
          { type: 'rect', x: 20, y: 172, width: 280, height: 44, rx: 8, fill: 'lightgreen', stroke: 'line' },
          { type: 'text', x: 160, y: 199, text: '左の金属ほどイオン化傾向が大きい', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-dr5-c2',
        text: 'マグネシウム・亜鉛・銅の板を、それぞれほかの金属のイオンをふくむ水溶液に入れると、表のようになります。○（金属が付いた）が多い金属ほど、陽イオンになりやすい金属です。',
        // 金属の板（縦）と、入れた水溶液（横）の結果の表
        figure: scene(gridCells(10, 30, [100, 70, 70, 70], 40, 4).concat(
          gridTexts([
            ['', 'Mg2+', 'Zn2+', 'Cu2+'],
            ['マグネシウム', '', '○', '○'],
            ['亜鉛', '×', '', '○'],
            ['銅', '×', '×', ''],
          ], [60, 135, 205, 275], [55, 95, 135, 175], 12),
          [
            { type: 'text', x: 160, y: 214, text: '縦: 入れた金属の板　横: 水溶液にふくまれるイオン', size: 12, anchor: 'middle' },
            { type: 'text', x: 160, y: 234, text: '○ 金属が付いた　× 変化なし', size: 12, anchor: 'middle' },
          ])),
      },
      {
        id: 'ion-dr5-c3',
        text: '銅線を硝酸銀水溶液に入れると、銅がイオンになってとけ出し、銅線のまわりに銀が木の枝のように付きます。液は銅イオンのために、しだいに青色になります。銅は銀よりも陽イオンになりやすいことが分かります。',
        // 硝酸銀水溶液に入れた銅線と、付いた銀
        figure: scene([
          { type: 'text', x: 160, y: 24, text: '硝酸銀水溶液に銅線を入れる', size: 13, anchor: 'middle' },
          { type: 'beaker', x: 130, y: 214, width: 120, height: 140, level: 0.75, liquid: 'sky' },
          { type: 'line', points: [[130, 44], [130, 204]], color: 'brown', width: 4 },
          { type: 'line', points: [[130, 120], [108, 106]], color: 'gray', width: 3 },
          { type: 'line', points: [[130, 150], [106, 138]], color: 'gray', width: 3 },
          { type: 'line', points: [[130, 180], [154, 168]], color: 'gray', width: 3 },
          { type: 'line', points: [[130, 190], [108, 178]], color: 'gray', width: 3 },
          { type: 'line', points: [[206, 60], [134, 60]], width: 2 },
          { type: 'text', x: 210, y: 65, text: '銅線', size: 13 },
          { type: 'line', points: [[206, 130], [156, 130]], width: 2 },
          { type: 'text', x: 210, y: 135, text: '銀が付く', size: 13 },
          { type: 'text', x: 200, y: 200, text: '液がしだいに青色に', size: 12 },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-dr5-w1', concept: 'io-battery',
      prompt: '予想しよう。鉄くぎを青色の硫酸銅水溶液に入れておくと、くぎの表面はどうなると思う？',
      options: ['赤っぽい銅が付く', '何も変化しない', '白い粉が付く'],
      answer: 'a',
      explanation: '鉄は銅よりも陽イオンになりやすいので、鉄がとけて、液の中の銅イオンが銅になってくぎに付きます。このステージで、金属によるちがいを学ぼう。',
      hint: '鉄と銅では、どちらがイオンになりやすいかな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-dr5-p1', concept: 'io-battery',
        prompt: 'ア 亜鉛板を Mg2+ の液（硫酸マグネシウム水溶液）に、イ マグネシウム板を Zn2+ の液に、ウ 銅板を Zn2+ の液に入れました。板に金属が付くのはどれ？',
        figure: scene(plateBeakers(['亜鉛板', 'マグネシウム板', '銅板'], ['rock', 'glass', 'brown'], ['Mg2+ の液', 'Zn2+ の液', 'Zn2+ の液']).concat([
          { type: 'region', id: 'r1', x: 60, y: 214, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 214, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 214, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: 'マグネシウムは亜鉛よりも陽イオンになりやすいので、マグネシウムがとけて、亜鉛イオンが亜鉛になって板に付きます。アとウは、板の金属のほうがイオンになりにくいので変化しません。',
        hint: '板の金属が、液の中の金属よりイオンになりやすいときに変化が起こるよ。',
      }),
      fill({
        id: 'ion-dr5-t1', concept: 'io-battery', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '金属の陽イオンへのなりやすさを[b1]という。',
        blanks: [word('b1', ['イオン化傾向', '電離', '中和'], 'イオン化傾向')],
        explanation: '金属の陽イオンへのなりやすさを**イオン化傾向**といいます。マグネシウム・亜鉛・鉄・銅・銀の順に小さくなります。',
        hint: '「イオンになる傾き（くせ）」という意味の言葉だよ。',
      }),
      choice({
        id: 'ion-dr5-p2', concept: 'io-battery',
        prompt: '金属 A・B・C の板を、ほかの 2 つの金属のイオンの液に入れました。A は B と C の液で金属が付き、C はどちらでも変化なしでした。イオンになりやすい順は？',
        options: ['A ＞ B ＞ C', 'C ＞ B ＞ A', 'B ＞ A ＞ C'],
        answer: 'a',
        explanation: 'A は B・C のイオンの液で金属が付いたので、A がいちばんイオンになりやすい金属です。C はどちらでも変化しなかったので、いちばんなりにくい金属です。だから A ＞ B ＞ C です。',
        hint: '金属が付いた回数が多いほど、イオンになりやすい金属だよ。',
      }),
      choice({
        id: 'ion-dr5-p3', concept: 'io-battery',
        prompt: '無色の硝酸銀水溶液に銅線を入れると、銀が付き、液がしだいに青色になりました。液が青色になったのはなぜ？',
        options: ['銅がイオンになってとけ出したから', '銀がイオンになってとけ出したから', '銅線の色がとけたから'],
        answer: 'a',
        explanation: '銅は銀よりも陽イオンになりやすいので、銅が電子を失って銅イオン Cu2+ になってとけ出します。銅イオンをふくむ液は青色です。銀イオンは電子を受け取って銀になります。',
        hint: '青色の水溶液にふくまれているイオンを思い出そう。',
      }),
      choice({
        id: 'ion-dr5-p4', concept: 'io-battery',
        prompt: '青色の硫酸銅水溶液に亜鉛板を入れておくと、液の青色がうすくなりました。なぜ？',
        options: ['銅イオンが銅になって減ったから', '亜鉛イオンが青色を消したから', '水が蒸発したから'],
        answer: 'a',
        explanation: '液の青色は銅イオン Cu2+ の色です。亜鉛がとけて Zn2+ になり、Cu2+ は電子を受け取って銅になるので、Cu2+ が減って青色がうすくなります。',
        hint: '青色のもとになっているイオンは何かな。',
      }),
      fill({
        id: 'ion-dr5-p5', concept: 'io-battery',
        prompt: '硫酸銅水溶液に亜鉛板を入れると、亜鉛原子 1 個が出した電子 2 個を Cu2+ 1 個が受け取り、銅原子 1 個になります。',
        text: '亜鉛原子が 50 個とけたとき、出てくる銅原子は[b1]である。',
        blanks: [number('b1', 50, 0, '個')],
        explanation: '亜鉛原子 1 個は電子を 2 個出して Zn2+ になり、Cu2+ 1 個はその電子 2 個を受け取って銅原子になります。1 個に 1 個が対応するので、銅原子も 50 個です。',
        hint: '亜鉛 1 個が出す電子の数と、銅イオン 1 個が受け取る電子の数をくらべよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-dr5-r1', concept: 'io-battery',
        prompt: '銅板を硫酸亜鉛水溶液に入れても、変化が起こりません。なぜ？',
        options: ['銅は亜鉛より陽イオンになりにくいから', '銅は亜鉛より陽イオンになりやすいから', '銅は金属ではないから'],
        answer: 'a',
        explanation: '銅は亜鉛よりも陽イオンになりにくい（イオン化傾向が小さい）金属です。だから銅がとけて亜鉛が出てくる変化は起こりません。',
        hint: 'イオン化傾向の順を思い出そう。',
      }),
      fill({
        id: 'ion-dr5-r2', concept: 'io-battery',
        prompt: '銅線を硝酸銀水溶液に入れると、銅原子 1 個が出した電子 2 個を、銀イオン Ag+ が 1 個につき 1 個ずつ受け取って銀になります。',
        text: '銅原子が 30 個とけたとき、出てくる銀原子は[b1]である。',
        blanks: [number('b1', 60, 0, '個')],
        explanation: '銅原子 30 個が出す電子は 30 × 2 ＝ 60 個です。Ag+ は 1 個で電子を 1 個受け取るので、銀原子は 60 個できます。',
        hint: 'まず、銅原子 30 個が出す電子の数を求めよう。',
      }),
      choice({
        id: 'ion-dr5-r3', concept: 'io-battery', term: true,
        prompt: '「イオン化傾向が大きい金属」とは、どんな金属のこと？',
        options: ['陽イオンになりやすい金属', '陰イオンになりやすい金属', '水にとけにくい金属'],
        answer: 'a',
        explanation: '**イオン化傾向**は、金属の陽イオンへのなりやすさです。イオン化傾向が大きい金属ほど、電子を失って陽イオンになりやすい金属です。',
        hint: '金属の原子は、電子を失ってイオンになるよ。',
      }),
      figureChoice({
        id: 'ion-dr5-r4', concept: 'io-battery',
        prompt: 'ア マグネシウム板、イ 亜鉛板、ウ 銅板を、ほかの 2 つの金属のイオンをふくむ水溶液に入れました。どちらの液でも変化しない板はア〜ウのどれ？',
        figure: scene(plateBeakers(['マグネシウム板', '亜鉛板', '銅板'], ['glass', 'rock', 'brown'], ['Zn2+・Cu2+', 'Mg2+・Cu2+', 'Mg2+・Zn2+']).concat([
          { type: 'region', id: 'r1', x: 60, y: 214, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 214, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 214, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '3 つの中で、銅（ウ）がいちばん陽イオンになりにくい金属です。だから Mg2+ や Zn2+ の液に入れても、銅はとけず、変化しません。',
        hint: 'いちばんイオンになりにくい金属をさがそう。',
      }),
    ],
  };

  // ---- ステージ ion-dr6: ドリル 6 ダニエル電池のしくみと燃料電池 ----
  const ionDr6 = {
    id: 'ion-dr6', areaId: 'io-ion', free: true, title: 'ドリル 6: ダニエル電池のしくみと燃料電池', minutes: 7, concepts: ['io-battery'],
    lessons: [
      {
        id: 'ion-dr6-c1',
        anim: 'io-daniell',   // 動く図の使い回し（js/anim-chem.js）。figure は静止図として残す
        text: '電池は、物質がもつ**化学エネルギー**を電気エネルギーに変えてとり出す装置（**化学電池**）です。ダニエル電池を使い続けると、亜鉛板はとけてうすくなり、銅板には銅が付いて厚くなります。',
        // ダニエル電池を使い続けたときの、2 枚の金属板の変化
        figure: scene(daniellItems().concat([
          { type: 'text', x: 50, y: 106, text: 'うすくなる', size: 12, anchor: 'middle', bold: true },
          { type: 'text', x: 272, y: 106, text: '厚くなる', size: 12, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'ion-dr6-c2',
        text: 'ダニエル電池のセロハンには小さな穴があり、イオンが少しずつ通りぬけます。硫酸イオンなどが移動して電気のかたよりを防ぐので、電流が流れ続けます。セロハンのかわりにガラス板で仕切ると、電流は流れません。',
        // セロハンを通って、硫酸イオンが亜鉛板の側へ動く
        figure: scene(daniellItems().concat([
          ion(214, 160, 'SO₄2-', 27),
          { type: 'arrow', x1: 190, y1: 196, x2: 128, y2: 196, color: 'blue', width: 3 },
        ])),
      },
      {
        id: 'ion-dr6-c3',
        text: '**燃料電池**は、水素と酸素が結びついて水ができる化学変化から、電気をとり出します。出るのは水だけで、二酸化炭素を出しません。水素を外から補えば、電気をとり出し続けることができます。',
        // 燃料電池に入るもの（水素・酸素）と、出るもの（水・電気）
        figure: scene([
          { type: 'rect', x: 10, y: 50, width: 80, height: 40, rx: 6, fill: 'sky', label: '水素' },
          { type: 'rect', x: 10, y: 140, width: 80, height: 40, rx: 6, fill: 'sky', label: '酸素' },
          { type: 'rect', x: 120, y: 85, width: 90, height: 60, rx: 8, fill: 'yellow', label: '燃料電池' },
          { type: 'rect', x: 240, y: 50, width: 70, height: 40, rx: 6, fill: 'water', label: '水' },
          { type: 'rect', x: 240, y: 140, width: 70, height: 40, rx: 6, fill: 'white', label: '電気' },
          { type: 'arrow', x1: 92, y1: 72, x2: 118, y2: 98, width: 2 },
          { type: 'arrow', x1: 92, y1: 158, x2: 118, y2: 132, width: 2 },
          { type: 'arrow', x1: 212, y1: 98, x2: 238, y2: 72, width: 2 },
          { type: 'arrow', x1: 212, y1: 132, x2: 238, y2: 158, width: 2 },
          { type: 'text', x: 160, y: 220, text: '出るのは水だけ（二酸化炭素を出さない）', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-dr6-w1', concept: 'io-battery',
      prompt: '予想しよう。ダニエル電池でモーターを長い時間回し続けると、亜鉛板はどうなると思う？',
      options: ['とけてうすくなる', '銅が付いて厚くなる', '何も変化しない'],
      answer: 'a',
      explanation: '−極の亜鉛板では、亜鉛が電子を失って Zn2+ になり、水溶液にとけ出します。使い続けると、亜鉛板はだんだんうすくなります。',
      hint: '−極で亜鉛はどうなっていたかな。',
    }),
    problems: [
      drag({
        id: 'ion-dr6-p1', concept: 'io-battery',
        prompt: 'ダニエル電池が電流を流している間、硫酸イオン SO₄2- はセロハンを通ってどちらの液へ移る？ イオンを左右に動かし、移っていく先の液のまん中に置こう。',
        // SO₄2- は、Cu2+ が減って−の電気が多くなる銅板の側（右）から、Zn2+ が増える亜鉛板の側（左）へ移る。
        // 正解は左の液のまん中 (106, 170)。不正解例は右の液のまん中 (214, 170)（108px はなれる）。はじめの位置 x 160 は正解から 54px
        figure: scene(daniellItems().concat([
          { type: 'line', points: [[60, 170], [260, 170]], color: 'gray', width: 1, dashed: true },
          { type: 'circle', id: 'ion', x: 160, y: 170, r: 27, fill: 'white', stroke: 'ink', label: 'SO₄2-' },
        ])),
        draggable: { itemId: 'ion', axis: 'x' },
        target: { x: 106, y: 170 },
        samples: { correct: { x: 106, y: 170 }, wrong: { x: 214, y: 170 } },
        explanation: '銅板の側では Cu2+ が銅になって減るので、−の SO₄2- があまります。亜鉛板の側では Zn2+ が増えます。そこで SO₄2- がセロハンを通って亜鉛板の側（左）へ移り、電気のかたよりを防ぎます。',
        hint: '陽イオンが増えているのは、亜鉛板と銅板のどちらの液かな。',
      }),
      fill({
        id: 'ion-dr6-t1', concept: 'io-battery', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質がもつ化学エネルギーを、化学変化によって電気エネルギーに変えてとり出す装置を[b1]という。',
        blanks: [word('b1', ['化学電池', '発電機', '電磁石'], '化学電池')],
        explanation: '化学変化を利用して電気エネルギーをとり出す装置を**化学電池**といいます。ダニエル電池・乾電池・燃料電池などがあります。',
        hint: '化学変化を使う電池だよ。',
      }),
      choice({
        id: 'ion-dr6-p2', concept: 'io-battery',
        prompt: 'ダニエル電池を長く使うと、銅板の側の硫酸銅水溶液の青色はどうなる？',
        options: ['うすくなる', 'こくなる', '変わらない'],
        answer: 'a',
        explanation: '＋極の銅板では、Cu2+ が電子を受け取って銅になります。青色のもとの Cu2+ が減るので、液の青色はうすくなります。',
        hint: '青色のもとは、どのイオンかな。そのイオンは増える？減る？',
      }),
      choice({
        id: 'ion-dr6-p3', concept: 'io-battery',
        prompt: 'ダニエル電池のセロハンのかわりに、ガラス板で 2 つの水溶液を完全に仕切りました。モーターはどうなる？',
        options: ['回らない', '速く回る', '逆向きに回る'],
        answer: 'a',
        explanation: 'ガラス板はイオンを通さないので、2 つの水溶液の間でイオンが移動できません。電気のかたよりが防げず、電流が流れないので、モーターは回りません。',
        hint: 'ガラス板は、イオンを通すかな。',
      }),
      fill({
        id: 'ion-dr6-p4', concept: 'io-battery',
        prompt: '燃料電池では、2H₂ ＋ O₂ → 2H₂O の化学変化が起こります。水素分子が 10 個すべて反応しました。',
        text: 'このとき反応した酸素分子は[b1]である。',
        blanks: [number('b1', 5, 0, '個')],
        explanation: '化学反応式から、水素分子 2 個と酸素分子 1 個が反応します。水素分子 10 個には、酸素分子 10 ÷ 2 ＝ 5 個が反応します。',
        hint: '化学反応式の H₂ と O₂ の前の数を見よう。',
      }),
      choice({
        id: 'ion-dr6-p5', concept: 'io-battery',
        prompt: '充電してくり返し使える電池を充電するとき、電池の中で起こることとして正しいものはどれ？',
        options: ['電気を使ったときと逆向きの化学変化', '新しい金属が外から加わる変化', '水が蒸発するだけの変化'],
        answer: 'a',
        explanation: '充電では、外から電流を流して、電気を使ったとき（放電）と逆向きの化学変化を起こします。すると電池の中の物質がもとにもどり、また電気をとり出せるようになります。',
        hint: '使ったあとの物質を、もとにもどすには？',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'ion-dr6-r1', concept: 'io-battery',
        prompt: 'ダニエル電池を長く使いました。ア（亜鉛板）とイ（銅板）のうち、使う前より質量が増えている金属板はどちら？',
        figure: scene(daniellItems().concat([
          { type: 'region', id: 'r1', x: 86, y: 160, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 234, y: 160, r: 22, label: 'イ' },
        ])),
        answer: 'r2',
        explanation: '＋極の銅板（イ）では、Cu2+ が電子を受け取って銅になり、銅板に付きます。だから銅板の質量は増えます。−極の亜鉛板（ア）は、亜鉛がとけてうすくなります。',
        hint: '銅板の表面で、何ができて付くかな。',
      }),
      choice({
        id: 'ion-dr6-r2', concept: 'io-battery',
        prompt: 'ダニエル電池で、亜鉛板の側の液からセロハンを通って、銅板の側の液へ移る陽イオンはどれ？',
        options: ['亜鉛イオン Zn2+', '銅イオン Cu2+', '電子'],
        answer: 'a',
        explanation: '亜鉛板の側では、亜鉛がとけて Zn2+ が増えます。その Zn2+ の一部がセロハンを通って銅板の側へ移り、電気のかたよりを防ぎます。電子は液の中ではなく導線を通ります。',
        hint: '亜鉛板の側で増えている陽イオンはどれかな。',
      }),
      choice({
        id: 'ion-dr6-r3', concept: 'io-battery', term: true,
        prompt: '次の説明に合う言葉はどれ？「物質がもっていて、化学変化によって熱や電気などとしてとり出せるエネルギー」',
        options: ['化学エネルギー', '位置エネルギー', '運動エネルギー'],
        answer: 'a',
        explanation: '物質がもっていて、化学変化によってとり出せるエネルギーを**化学エネルギー**といいます。電池は、化学エネルギーを電気エネルギーに変えています。',
        hint: '化学変化でとり出すエネルギーだよ。',
      }),
      fill({
        id: 'ion-dr6-r4', concept: 'io-battery',
        prompt: '燃料電池では、2H₂ ＋ O₂ → 2H₂O の化学変化が起こります。水素分子が 6 個すべて反応しました。',
        text: 'このときできる水分子は[b1]である。',
        blanks: [number('b1', 6, 0, '個')],
        explanation: '化学反応式から、水素分子 2 個から水分子 2 個ができます。水素分子 6 個からは、水分子 6 個ができます。',
        hint: '化学反応式の H₂ と H₂O の前の数をくらべよう。',
      }),
    ],
  };

  // ================================================================
  // クイズ（Kahoot の公開クイズの「ねらい」を参考に自作。.ai-tasks/20261122-140000_クイズ問題_共通.md）
  // 文・選択肢・図はすべて自作。free: true で、分野の領域（io-ion・io-acid）の最後に置く
  // ================================================================

  // 左右 2 つの箱（左 x 10〜150、右 x 170〜310、y 115〜225）と、その見出し
  function twoBoxItems(left, right) {
    return [
      { type: 'rect', x: 10, y: 115, width: 140, height: 110, rx: 8, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 170, y: 115, width: 140, height: 110, rx: 8, fill: 'white', stroke: 'line' },
      { type: 'text', x: 80, y: 140, text: left, size: 15, anchor: 'middle', bold: true },
      { type: 'text', x: 240, y: 140, text: right, size: 15, anchor: 'middle', bold: true },
    ];
  }

  // イオンの丸 4 つ（中心 x 50・125・200・275、y 105）と、その下の region ア〜エ（y 180）
  function fourIonItems(names) {
    const items = [];
    [50, 125, 200, 275].forEach((x, i) => {
      items.push(ion(x, 105, names[i]));
      items.push({ type: 'region', id: 'r' + (i + 1), x, y: 180, r: 22, label: 'アイウエ'[i] });
    });
    return items;
  }

  // ---- ステージ ion-kq1: クイズ 1 イオンの名前と原子のつくり ----
  const ionKq1 = {
    id: 'ion-kq1', areaId: 'io-ion', free: true, title: 'クイズ 1: イオンの名前と原子のつくり', minutes: 6, concepts: ['io-structure', 'io-electrolyte'],
    lessons: [
      {
        id: 'ion-kq1-c1',
        text: '原子の中心には**原子核**があり、原子核は＋の電気をもつ陽子と、電気をもたない**中性子**でできています。そのまわりに−の電気をもつ電子があります。陽子と電子の数が同じなので、原子全体は電気を帯びていません。',
        // ヘリウム原子のモデルと、粒の名前
        figure: scene(heliumItems().concat([
          { type: 'line', points: [[122, 53], [200, 53]], color: 'gray', width: 1 },
          { type: 'text', x: 206, y: 58, text: '電子（−）', size: 13 },
          { type: 'line', points: [[132, 114], [200, 100]], color: 'gray', width: 1 },
          { type: 'text', x: 206, y: 105, text: '陽子（＋）', size: 13 },
          { type: 'line', points: [[132, 136], [200, 146]], color: 'gray', width: 1 },
          { type: 'text', x: 206, y: 151, text: '中性子', size: 13 },
          { type: 'text', x: 206, y: 170, text: '（電気なし）', size: 12 },
          { type: 'text', x: 110, y: 230, text: 'ヘリウム原子', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-kq1-c2',
        text: '金属の原子は、電子を失って陽イオンになります。Na+・K+・Ag+ は 1 個、Ca2+・Ba2+・Cu2+ は 2 個、Al3+ は 3 個の電子を失っています。右上の数字が、失った電子の数を表します。',
        // 失った電子の数と陽イオンの表
        figure: scene(gridCells(10, 50, [90, 210], 50, 3).concat(
          gridTexts([['1 個', 'Na+　K+　Ag+'], ['2 個', 'Ca2+　Ba2+　Cu2+'], ['3 個', 'Al3+']], [55, 205], [80, 130, 180], 14),
          [{ type: 'text', x: 160, y: 34, text: '失った電子の数と陽イオン', size: 14, anchor: 'middle', bold: true }])),
      },
      {
        id: 'ion-kq1-c3',
        text: '陰イオンの名前にもきまりがあります。1 種類の原子からなる陰イオンは「〜化物イオン」です（Cl- 塩化物イオン、S2- 硫化物イオン）。原子のまとまりの陰イオンには、OH- 水酸化物イオン、NO₃- 硝酸イオン、CO₃2- 炭酸イオンなどがあります。',
        // 陰イオンのイオン式と名前
        figure: scene([
          { type: 'text', x: 160, y: 28, text: '陰イオン', size: 15, anchor: 'middle', bold: true },
          ...[['Cl-', '塩化物イオン'], ['S2-', '硫化物イオン'], ['OH-', '水酸化物イオン'], ['NO₃-', '硝酸イオン'], ['CO₃2-', '炭酸イオン']]
            .flatMap(([f, n], i) => [
              { type: 'text', x: 110, y: 64 + 38 * i, text: f, size: 16, anchor: 'end', bold: true },
              { type: 'text', x: 130, y: 64 + 38 * i, text: n, size: 14 },
            ]),
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-kq1-w1', concept: 'io-structure',
      prompt: '予想しよう。原子の質量のほとんどは、どこにあると思う？',
      options: ['中心の原子核', 'まわりの電子', '原子の中に均等にある'],
      answer: 'a',
      explanation: '電子はとても軽く、原子の質量のほとんどは、陽子と中性子でできた中心の原子核にあります。',
      hint: '陽子や中性子と、電子の重さをくらべてみよう。',
    }),
    problems: [
      figureChoice({
        id: 'ion-kq1-p1', concept: 'io-structure',
        prompt: 'ヘリウム原子のモデルです。ア 中心の粒の集まり、イ 外側の小さな粒、ウ 円の線の上の何もない所。原子核はア〜ウのどれ？',
        figure: scene(heliumItems().concat([
          { type: 'region', id: 'r1', x: 110, y: 125, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 110, y: 53, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 182, y: 125, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '原子の中心にある、陽子と中性子の集まりが原子核（ア）です。イは−の電気をもつ電子です。',
        hint: '原子核は、原子の中心にあるよ。',
      }),
      fill({
        id: 'ion-kq1-t1', concept: 'io-structure', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '原子核をつくる粒のうち、電気を帯びていない粒を[b1]という。',
        blanks: [word('b1', ['中性子', '陽子', '電子'], '中性子')],
        explanation: '原子核は、＋の電気をもつ陽子と、電気をもたない**中性子**でできています。',
        hint: '「中性」は、＋でも−でもないという意味だよ。',
      }),
      fill({
        id: 'ion-kq1-p2', concept: 'io-structure',
        prompt: '硫黄原子が電子を 2 個受け取ってできた陰イオン S2- の名前を選ぼう。',
        text: 'S2- の名前は[b1]である。',
        blanks: [word('b1', ['硫化物イオン', '硫酸イオン', '硫黄イオン'], '硫化物イオン')],
        explanation: '1 種類の原子からなる陰イオンは「〜化物イオン」とよびます。S2- は硫化物イオンです。硫酸イオンは SO₄2- で、硫黄と酸素のまとまりのイオンです。',
        hint: 'Cl- を塩化物イオンとよぶのと同じきまりだよ。',
      }),
      drag({
        id: 'ion-kq1-p3', concept: 'io-structure',
        prompt: '硝酸イオン NO₃- のカードを、陽イオン・陰イオンのうち合うほうの箱へ動かそう。',
        // 位置は丸の中心で判定する。右の箱「陰イオン」の中 (240, 180) が正解、左の箱「陽イオン」の中 (80, 180) が不正解例（160px はなれる）
        figure: scene(twoBoxItems('陽イオン', '陰イオン').concat([
          { type: 'circle', id: 'card', x: 160, y: 55, r: 23, fill: 'white', stroke: 'ink', label: 'NO₃-' },
        ])),
        draggable: { itemId: 'card' },
        target: { x: 240, y: 180 },
        samples: { correct: { x: 240, y: 180 }, wrong: { x: 80, y: 180 } },
        explanation: 'NO₃- の右上は「−」なので、−の電気を帯びた陰イオンです。窒素原子 1 個と酸素原子 3 個のまとまりが、電子を 1 個多くもっています。',
        hint: 'イオン式の右上の記号を見よう。',
      }),
      fill({
        id: 'ion-kq1-p4', concept: 'io-electrolyte',
        prompt: '炭酸ナトリウム Na₂CO₃ は、水にとけると Na+ と CO₃2- に電離します。CO₃2- が 50 個できました。空らんに入る数を入れよう。',
        text: 'このとき Na+ は[b1]できている。',
        blanks: [number('b1', 100, 0, '個')],
        explanation: 'Na₂CO₃ → 2Na+ ＋ CO₃2- のように、CO₃2- 1 個に Na+ が 2 個できます。＋1 が 2 つで、−2 とつり合います。50 × 2 ＝ 100 個です。',
        hint: '化学式の Na の右下の数字を見よう。',
      }),
      choice({
        id: 'ion-kq1-p5', concept: 'io-electrolyte',
        prompt: '硝酸カリウム KNO₃ が水にとけて電離するようすを表す式はどれ？',
        options: ['KNO₃ → K+ ＋ NO₃-', 'KNO₃ → K- ＋ NO₃+', 'KNO₃ → KN+ ＋ O₃-'],
        answer: 'a',
        explanation: '金属のカリウムは電子を失って陽イオン K+ に、硝酸のまとまり NO₃ は陰イオン NO₃- になります。＋1 と −1 で電気の量がつり合っています。',
        hint: '金属の原子は、陽イオンと陰イオンのどちらになるかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'ion-kq1-r1', concept: 'io-structure',
        prompt: '原子が全体として電気を帯びていないのはなぜ？',
        options: ['陽子の数と電子の数が等しいから', '中性子が電気を打ち消すから', '電子が原子核の中にあるから'],
        answer: 'a',
        explanation: '陽子 1 個の＋の電気と、電子 1 個の−の電気は同じ量です。原子では陽子と電子の数が等しいので、打ち消し合います。中性子は電気をもちません。',
        hint: '＋の電気をもつ粒と、−の電気をもつ粒の数をくらべよう。',
      }),
      figureChoice({
        id: 'ion-kq1-r2', concept: 'io-structure',
        prompt: 'ア K+、イ Ca2+、ウ Al3+、エ Ag+ の陽イオンです。原子が電子を 3 個失ってできたイオンはア〜エのどれ？',
        figure: scene([
          { type: 'text', x: 160, y: 40, text: 'いろいろな陽イオン', size: 13, anchor: 'middle' },
        ].concat(fourIonItems(['K+', 'Ca2+', 'Al3+', 'Ag+']))),
        answer: 'r3',
        explanation: '右上の数字が、失った電子の数です。Al3+ は電子を 3 個失っています。K+ と Ag+ は 1 個、Ca2+ は 2 個です。',
        hint: 'イオン式の右上の数字を見よう。',
      }),
      fill({
        id: 'ion-kq1-r3', concept: 'io-electrolyte',
        prompt: '食酢にふくまれる酢酸 CH₃COOH は、水にとけると一部が H+ と陰イオン CH₃COO- に電離します。空らんに入る名前を選ぼう。',
        text: 'CH₃COO- の名前は[b1]である。',
        blanks: [word('b1', ['酢酸イオン', '炭酸イオン', '水酸化物イオン'], '酢酸イオン')],
        explanation: '酢酸から H+ がはなれてできる陰イオンなので、酢酸イオンです。炭酸イオンは CO₃2-、水酸化物イオンは OH- です。',
        hint: 'もとの物質の名前から考えよう。',
      }),
      choice({
        id: 'ion-kq1-r4', concept: 'io-structure', term: true,
        prompt: '次の説明に合う言葉はどれ？「電気を帯びた原子や、原子のまとまり」',
        options: ['イオン', '分子', '中性子'],
        answer: 'a',
        explanation: '原子や原子のまとまりが、電子を失ったり受け取ったりして電気を帯びたものを**イオン**といいます。',
        hint: 'Na+ や OH- のようなもののことだよ。',
      }),
      choice({
        id: 'ion-kq1-r5', concept: 'io-electrolyte',
        prompt: '食塩（塩化ナトリウム NaCl）を水にとかしました。水溶液の中の Na+ と Cl- の数の関係として正しいものは？',
        options: ['同じ数', 'Na+ が Cl- の 2 倍', 'Cl- が Na+ の 2 倍'],
        answer: 'a',
        explanation: 'NaCl → Na+ ＋ Cl- のように、NaCl 1 つ分から Na+ と Cl- が 1 個ずつできます。だから同じ数です。',
        hint: '化学式 NaCl に、Na と Cl はいくつずつあるかな。',
      }),
    ],
  };

  // ---- ステージ ion-kq2: クイズ 2 電気分解と電池で電子が動くしくみ ----
  const ionKq2 = {
    id: 'ion-kq2', areaId: 'io-ion', free: true, title: 'クイズ 2: 電気分解と電池で電子が動くしくみ', minutes: 6, concepts: ['io-electrolysis', 'io-battery'],
    lessons: [
      {
        id: 'ion-kq2-c1',
        text: '塩化銅水溶液に電流を流すと、Cu2+ は陰極に引かれて電子を 2 個受け取り、銅になって付きます。Cl- は陽極に引かれて電子をわたし、塩素原子が 2 個結びついて塩素になります。',
        // 左の電極が陽極（電池の＋極側）、右が陰極
        figure: scene(electrolysisItems('sky').concat([
          ion(150, 150, 'Cl-'),
          { type: 'arrow', x1: 134, y1: 150, x2: 120, y2: 150, color: 'blue' },
          ion(176, 182, 'Cu2+'),
          { type: 'arrow', x1: 197, y1: 172, x2: 203, y2: 166, color: 'blue' },
          { type: 'text', x: 60, y: 90, text: '陽極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 60, y: 108, text: '塩素', size: 13, anchor: 'middle' },
          { type: 'text', x: 264, y: 90, text: '陰極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 264, y: 108, text: '銅', size: 13, anchor: 'middle' },
        ])),
      },
      {
        id: 'ion-kq2-c2',
        text: '電池の−極では、亜鉛のような金属が電子を出して陽イオンになり、液にとけ出します。電子は導線を通って＋極へ流れ、＋極で液の中の陽イオンが電子を受け取ります。電流の向きは、電子の流れと逆です。',
        // ダニエル電池の電子の流れ（亜鉛板 → 導線 → 銅板）
        figure: scene(daniellItems().concat([
          { type: 'arrow', x1: 194, y1: 38, x2: 228, y2: 38, color: 'blue' },
          { type: 'text', x: 254, y: 30, text: '電子', size: 12, anchor: 'middle' },
          { type: 'text', x: 50, y: 70, text: '−極', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 272, y: 70, text: '＋極', size: 13, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'ion-kq2-c3',
        text: '使い切りの電池を一次電池、外から電流を流して化学変化を逆向きに進め、くり返し使える電池を二次電池といいます。二次電池を使える状態にもどすことを**充電**といいます。リチウムイオン電池や鉛蓄電池は二次電池です。',
        // 一次電池と二次電池の例
        figure: scene([
          { type: 'rect', x: 10, y: 20, width: 145, height: 200, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 165, y: 20, width: 145, height: 200, rx: 8, fill: 'sky', stroke: 'line' },
          { type: 'text', x: 82, y: 46, text: '一次電池', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 237, y: 46, text: '二次電池', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 82, y: 70, text: '使い切り', size: 12, anchor: 'middle' },
          { type: 'text', x: 237, y: 70, text: '充電してくり返し使う', size: 12, anchor: 'middle' },
          { type: 'text', x: 82, y: 120, text: 'マンガン乾電池', size: 13, anchor: 'middle' },
          { type: 'text', x: 82, y: 150, text: 'アルカリ乾電池', size: 13, anchor: 'middle' },
          { type: 'text', x: 237, y: 120, text: 'リチウムイオン電池', size: 13, anchor: 'middle' },
          { type: 'text', x: 237, y: 150, text: '鉛蓄電池', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-kq2-w1', concept: 'io-battery',
      prompt: '予想しよう。スマートフォンの電池は、使い切ってもまた使えるようになります。何をすると思う？',
      options: ['外から電流を流す', '電池に水を入れる', '電池を冷やす'],
      answer: 'a',
      explanation: 'スマートフォンの電池は、外から電流を流すと、使ったときと逆向きの化学変化が起こって、また使えるようになります。',
      hint: 'ふだん、ケーブルをつないで何をしているかな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-kq2-p1', concept: 'io-electrolysis',
        prompt: '図のようにつないで塩化銅水溶液を電気分解しました（上の電池は左が＋極）。刺激臭のある気体が出てくるのは電極ア・イのどちら？',
        figure: scene(electrolysisItems('sky').concat([
          { type: 'region', id: 'r1', x: 110, y: 130, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 210, y: 130, r: 22, label: 'イ' },
        ])),
        answer: 'r1',
        explanation: '電池の＋極につないだ左の電極（ア）が陽極です。陽極には Cl- が引かれて、刺激臭のある塩素が出ます。右の電極（陰極）には銅が付きます。',
        hint: '−の電気を帯びた Cl- は、どちらの極に引かれるかな。',
      }),
      fill({
        id: 'ion-kq2-t1', concept: 'io-battery', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '使い終わった二次電池に、外から電流を流して使える状態にもどすことを[b1]という。',
        blanks: [word('b1', ['充電', '電離', '中和'], '充電')],
        explanation: '外から電流を流して、化学変化を逆向きに進めることを**充電**といいます。充電できる電池が二次電池です。',
        hint: 'スマートフォンにケーブルをつないですることだよ。',
      }),
      fill({
        id: 'ion-kq2-p2', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液に電流を流したとき、陽極で起こる変化を考えよう。空らんに入る言葉を選ぼう。',
        text: '塩化物イオン Cl- は、陽極に電子を[b1]塩素原子になる。',
        blanks: [word('b1', ['わたして', '受け取って', '分けて'], 'わたして')],
        explanation: 'Cl- は電子を 1 個多くもつ陰イオンです。陽極でその電子をわたすと塩素原子になり、2 個が結びついて塩素分子 Cl₂ になります。',
        hint: 'Cl- が電気を帯びていない原子にもどるには、電子をどうすればよいかな。',
      }),
      drag({
        id: 'ion-kq2-p3', concept: 'io-battery',
        prompt: 'ダニエル電池で、亜鉛板から出た電子は、導線とモーターを通ってどちらの金属板へ流れこむ？ 電子（−の丸）を左右に動かし、その金属板の真上に置こう。',
        // 亜鉛板の中心 x 86、銅板の中心 x 234。正解は銅板の真上 (234, 80)、不正解例は亜鉛板の真上 (86, 80)（148px はなれる）。はじめは x 160
        figure: scene(daniellItems().concat([
          { type: 'circle', id: 'e', x: 160, y: 80, r: 12, fill: 'sky', stroke: 'blue', label: '−' },
        ])),
        draggable: { itemId: 'e', axis: 'x' },
        target: { x: 234, y: 80 },
        samples: { correct: { x: 234, y: 80 }, wrong: { x: 86, y: 80 } },
        explanation: '亜鉛は銅より陽イオンになりやすいので、亜鉛板で亜鉛原子が電子を出して Zn2+ になります。電子は導線を通って銅板へ流れ、銅板の表面で Cu2+ が電子を受け取って銅になります。',
        hint: '電子を出すのは、陽イオンになりやすい金属のほうだよ。',
      }),
      fill({
        id: 'ion-kq2-p4', concept: 'io-electrolysis',
        prompt: '塩化銅水溶液の電気分解では、陰極で Cu2+ 1 個が電子 2 個を受け取り、銅原子 1 個になります。銅原子が 40 個できました。',
        text: '陰極で Cu2+ が受け取った電子は、全部で[b1]である。',
        blanks: [number('b1', 80, 0, '個')],
        explanation: '銅原子 1 個ができるのに電子が 2 個いるので、40 × 2 ＝ 80 個です。',
        hint: 'Cu2+ の「2+」は、受け取る電子の数を教えてくれるよ。',
      }),
      choice({
        id: 'ion-kq2-p5', concept: 'io-battery',
        prompt: 'うすい塩酸に亜鉛板を入れると、亜鉛がとけて水素が出ました。とけた亜鉛原子はどうなった？',
        options: ['電子を失って亜鉛イオンになった', '電子を受け取って陰イオンになった', '水素原子に変わった'],
        answer: 'a',
        explanation: '亜鉛原子は電子を 2 個失って Zn2+ になり、液にとけます。その電子を塩酸の H+ が受け取り、水素が発生します。原子が別の種類の原子に変わることはありません。',
        hint: '金属の原子は、陽イオンと陰イオンのどちらになりやすいかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'ion-kq2-r1', concept: 'io-electrolysis',
        prompt: 'うすい塩酸を、図のようにつないで電気分解しました（上の電池は左が＋極）。マッチの火を近づけると音を立てて燃える気体が出るのは、電極ア・イのどちら？',
        figure: scene(electrolysisItems('water').concat([
          { type: 'region', id: 'r1', x: 110, y: 130, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 210, y: 130, r: 22, label: 'イ' },
        ])),
        answer: 'r2',
        explanation: '音を立てて燃えるのは水素です。H+ は陰極に引かれて電子を受け取り、水素になります。電池の−極につないだ右の電極（イ）が陰極です。',
        hint: '＋の電気を帯びた H+ は、どちらの極に引かれるかな。',
      }),
      fill({
        id: 'ion-kq2-r2', concept: 'io-battery',
        prompt: 'ダニエル電池では、それぞれの金属板と同じ金属のイオンをふくむ水溶液に、金属板を入れます。空らんに入る言葉を選ぼう。',
        text: '亜鉛板を入れる水溶液は[b1]である。',
        blanks: [word('b1', ['硫酸亜鉛水溶液', '硫酸銅水溶液', '砂糖水'], '硫酸亜鉛水溶液')],
        explanation: 'ダニエル電池では、亜鉛板を硫酸亜鉛水溶液に、銅板を硫酸銅水溶液に入れ、2 つの液をセロハンで仕切ります。',
        hint: '亜鉛と同じ金属のイオンをふくむ液だよ。',
      }),
      choice({
        id: 'ion-kq2-r3', concept: 'io-electrolysis',
        prompt: '水酸化ナトリウムを少しとかした水を電気分解しました。出てくる気体の組み合わせはどれ？',
        options: ['水素と酸素', '水素と塩素', '酸素と二酸化炭素'],
        answer: 'a',
        explanation: '水が分解されて、陰極から水素、陽極から酸素が出ます。水酸化ナトリウムは電流を流れやすくするためにとかします。',
        hint: '分解されているのは水 H₂O だよ。',
      }),
      choice({
        id: 'ion-kq2-r4', concept: 'io-battery',
        prompt: '電池の−極で起こることとして、正しいものはどれ？',
        options: ['金属が電子を出して陽イオンになる', '液の中の陽イオンが電子を受け取る', '電子が導線から流れこむ'],
        answer: 'a',
        explanation: '−極では金属が電子を出して陽イオンになり、とけ出します。出た電子は導線を通って＋極へ流れ、＋極で陽イオンが電子を受け取ります。',
        hint: '電子は−極と＋極のどちらから出ていくかな。',
      }),
      choice({
        id: 'ion-kq2-r5', concept: 'io-battery', term: true,
        prompt: '次の説明に合う言葉はどれ？「ダニエル電池で 2 つの水溶液を仕切る、小さな穴のあいた膜」',
        options: ['セロハン', 'アルミニウムはく', 'ガラス板'],
        answer: 'a',
        explanation: '**セロハン**には小さな穴があり、2 つの液がすぐには混ざらないようにしながら、イオンを少しずつ通します。',
        hint: 'イオンは通すけれど、液はすぐには混ざらない膜だよ。',
      }),
    ],
  };

  // ---- ステージ ion-kq3: クイズ 3 酸・アルカリの正体と中和 ----
  const ionKq3 = {
    id: 'ion-kq3', areaId: 'io-acid', free: true, title: 'クイズ 3: 酸・アルカリの正体と中和', minutes: 6, concepts: ['io-acidbase', 'io-neutral'],
    lessons: [
      {
        id: 'ion-kq3-c1',
        text: '酸性の水溶液に共通してふくまれるのは水素イオン H+、アルカリ性の水溶液に共通してふくまれるのは**水酸化物イオン** OH- です。アンモニアは水にとけると一部が水と反応して OH- ができるので、アンモニア水はアルカリ性です。',
        // 3 つの水溶液のイオンのモデル
        figure: scene(modelFrames([['H+', 'Cl-'], ['Na+', 'OH-'], ['NH₄+', 'OH-']], ['#FDE2EC', 'sky', 'sky']).concat([
          { type: 'text', x: 56, y: 184, text: '塩酸', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 184, text: 'NaOH 水溶液', size: 12, anchor: 'middle' },
          { type: 'text', x: 264, y: 184, text: 'アンモニア水', size: 12, anchor: 'middle' },
          { type: 'text', x: 56, y: 208, text: '酸性', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 212, y: 208, text: 'アルカリ性', size: 13, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'ion-kq3-c2',
        text: '酸とアルカリを混ぜると、H+ と OH- が結びついて水ができ、たがいの性質を打ち消し合います（中和）。酸の陰イオンとアルカリの陽イオンが結びついた物質を**塩**といいます。塩酸と水酸化カルシウムからは塩化カルシウムができます。',
        // 中和の式
        figure: scene([
          { type: 'text', x: 160, y: 50, text: 'H+ ＋ OH- → H₂O', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 110, text: 'HCl ＋ NaOH → NaCl ＋ H₂O', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 132, text: '塩: 塩化ナトリウム', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 182, text: '2HCl ＋ Ca(OH)₂ → CaCl₂ ＋ 2H₂O', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 204, text: '塩: 塩化カルシウム', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'ion-kq3-c3',
        text: '中和は、生活の中でも使われています。酸性になった川や湖に石灰（炭酸カルシウムなど）を入れて中和したり、酸性になった畑の土に消石灰をまいたりします。',
        // 酸性の湖に石灰を入れる
        figure: scene([
          { type: 'polygon', points: [[30, 130], [290, 130], [250, 200], [70, 200]], fill: 'water' },
          { type: 'arrow', x1: 160, y1: 50, x2: 160, y2: 118, color: 'ink' },
          { type: 'text', x: 160, y: 40, text: '石灰の粉を入れる', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 168, text: '酸性の湖', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 226, text: '中和して、酸性を弱める', size: 14, anchor: 'middle', bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'ion-kq3-w1', concept: 'io-acidbase',
      prompt: '予想しよう。蒸留水に、赤色と青色のリトマス紙をそれぞれつけると、どうなると思う？',
      options: ['どちらも色が変わらない', '赤色が青色に変わる', '青色が赤色に変わる'],
      answer: 'a',
      explanation: '蒸留水は中性なので、どちらのリトマス紙の色も変わりません。リトマス紙の色が変わるのは、酸性かアルカリ性のときです。',
      hint: '蒸留水は、酸性・中性・アルカリ性のどれかな。',
    }),
    problems: [
      figureChoice({
        id: 'ion-kq3-p1', concept: 'io-acidbase',
        prompt: 'ア〜ウは 3 つの水溶液のイオンのモデルです（ア H+ と Cl-、イ Na+ と Cl-、ウ Na+ と OH-）。フェノールフタレイン溶液を赤色にするのはどれ？',
        figure: scene(modelFrames([['H+', 'Cl-'], ['Na+', 'Cl-'], ['Na+', 'OH-']]).concat([
          { type: 'region', id: 'r1', x: 56, y: 196, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 196, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 196, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: 'フェノールフタレイン溶液は、アルカリ性で赤色になります。アルカリ性のもとは OH- なので、ウ（水酸化ナトリウム水溶液）です。アは酸性、イは中性です。',
        hint: 'アルカリ性の正体のイオンをふくむのはどれかな。',
      }),
      fill({
        id: 'ion-kq3-t1', concept: 'io-acidbase', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水にとけて、水酸化物イオン OH- を生じる物質を[b1]という。',
        blanks: [word('b1', ['アルカリ', '酸', '塩'], 'アルカリ')],
        explanation: '水にとけて OH- を生じる物質を**アルカリ**といいます。H+ を生じる物質は酸です。',
        hint: 'OH- は、アルカリ性の正体だったね。',
      }),
      fill({
        id: 'ion-kq3-p2', concept: 'io-acidbase',
        prompt: 'アンモニア NH₃ は水にとけると、一部が水と反応して NH₄+ と、ある陰イオンができます。空らんに入るものを選ぼう。',
        text: 'アンモニア水がアルカリ性を示すのは、[b1]ができるからである。',
        blanks: [word('b1', ['OH-', 'H+', 'Cl-'], 'OH-')],
        explanation: 'NH₃ が水 H₂O から H+ を 1 個もらって NH₄+ になり、残りが OH- になります。OH- があるので、アンモニア水はアルカリ性です。',
        hint: 'アルカリ性の水溶液に共通するイオンはどれかな。',
      }),
      drag({
        id: 'ion-kq3-p3', concept: 'io-neutral',
        prompt: 'pH 2 のうすい塩酸に、うすい水酸化ナトリウム水溶液を加えて、ちょうど中和させました。このときの pH の位置へ、印を左右に動かそう。',
        // pH の数直線（phX(ph) ＝ 20 ＋ 20 × ph）。印は pH 2 (60, 112) から始まる。正解は pH 7 (160, 112)、不正解例は pH 3 (80, 112)（80px はなれる）
        figure: scene(phBar().concat([
          { type: 'text', x: 90, y: 170, text: '酸性', size: 13, anchor: 'middle' },
          { type: 'text', x: 230, y: 170, text: 'アルカリ性', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 60, text: 'pH の数直線', size: 14, anchor: 'middle' },
          { type: 'circle', id: 'mark', x: phX(2), y: 112, r: 12, fill: 'yellow', stroke: 'ink', label: '印' },
        ])),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: phX(7), y: 112 },
        samples: { correct: { x: phX(7), y: 112 }, wrong: { x: phX(3), y: 112 } },
        explanation: '塩酸と水酸化ナトリウム水溶液がちょうど中和すると、H+ も OH- も残らず、塩化ナトリウムの水溶液になります。食塩水と同じく中性なので、pH は 7 です。',
        hint: '酸性でもアルカリ性でもない pH はいくつかな。',
      }),
      fill({
        id: 'ion-kq3-p4', concept: 'io-neutral',
        prompt: 'H+ が 30 個ふくまれるうすい塩酸に、OH- が 20 個ふくまれる水酸化ナトリウム水溶液を加えました。H+ と OH- は 1 個ずつ結びついて水になります。',
        text: '混ぜた後の液に残っている H+ は[b1]である。',
        blanks: [number('b1', 10, 0, '個')],
        explanation: 'OH- 20 個が H+ 20 個と結びついて水になります。H+ は 30 − 20 ＝ 10 個残るので、液はまだ酸性です。',
        hint: 'H+ と OH- が同じ数ずつ減っていくよ。',
      }),
      choice({
        id: 'ion-kq3-p5', concept: 'io-neutral',
        prompt: '酸性になった湖に、石灰（炭酸カルシウム）の粉を入れることがあります。何のため？',
        options: ['湖の水を中和して、酸性を弱めるため', '湖の水をもっと酸性にするため', '湖の水を温めるため'],
        answer: 'a',
        explanation: '石灰は酸と反応して、酸のはたらきを打ち消します。酸性が強すぎると魚などが生きにくいので、中和して酸性を弱めます。',
        hint: '酸性を打ち消すはたらきを何というかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'ion-kq3-r1', concept: 'io-acidbase',
        prompt: 'ア Na+ と OH-、イ Na+ と Cl-、ウ H+ と Cl- のイオンのモデルです。マグネシウムリボンを入れると水素が発生する水溶液はどれ？',
        figure: scene(modelFrames([['Na+', 'OH-'], ['Na+', 'Cl-'], ['H+', 'Cl-']]).concat([
          { type: 'region', id: 'r1', x: 56, y: 196, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 196, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 196, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: 'マグネシウムを入れて水素が出るのは、酸性の水溶液です。酸性のもとの H+ をふくむウ（塩酸）が当てはまります。',
        hint: '水素が出るのは、酸性・中性・アルカリ性のどれだったかな。',
      }),
      choice({
        id: 'ion-kq3-r2', concept: 'io-acidbase',
        prompt: 'うすい塩酸とうすい硫酸に、共通してふくまれるイオンはどれ？',
        options: ['H+', 'Cl-', 'SO₄2-'],
        answer: 'a',
        explanation: '塩酸は H+ と Cl-、硫酸は H+ と SO₄2- に電離します。共通する H+ が、酸性の正体です。',
        hint: 'どちらも酸性の水溶液だね。',
      }),
      fill({
        id: 'ion-kq3-r3', concept: 'io-neutral',
        prompt: '中和では、酸の H+ とアルカリの OH- が 1 個ずつ結びつきます。空らんに入る言葉を選ぼう。',
        text: 'H+ と OH- が結びつくと[b1]ができる。',
        blanks: [word('b1', ['水', '塩', '水素'], '水')],
        explanation: 'H+ ＋ OH- → H₂O のように、水ができます。塩は、酸の陰イオンとアルカリの陽イオンが結びついたものです。',
        hint: 'H と OH を合わせると、どんな化学式になるかな。',
      }),
      choice({
        id: 'ion-kq3-r4', concept: 'io-acidbase', term: true,
        prompt: '次の説明に合う言葉はどれ？「酸性で黄色、中性で緑色、アルカリ性で青色に変わる指示薬」',
        options: ['BTB 溶液', 'フェノールフタレイン溶液', 'ヨウ素液'],
        answer: 'a',
        explanation: '**BTB 溶液**は、酸性で黄色、中性で緑色、アルカリ性で青色になります。フェノールフタレイン溶液はアルカリ性で赤色になります。',
        hint: '3 つの色に変わる指示薬だよ。',
      }),
      choice({
        id: 'ion-kq3-r5', concept: 'io-neutral',
        prompt: 'うすい塩酸と水酸化カルシウム水溶液を混ぜて中和させました。できる塩はどれ？',
        options: ['塩化カルシウム', '塩化ナトリウム', '炭酸カルシウム'],
        answer: 'a',
        explanation: '酸の陰イオン Cl- と、アルカリの陽イオン Ca2+ が結びつくので、塩化カルシウム CaCl₂ ができます。',
        hint: '塩酸の陰イオンと、水酸化カルシウムの陽イオンを組み合わせよう。',
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
        fill({
          id: 'io-electrolyte-k4', concept: 'io-electrolyte',
          prompt: '塩化銅 CuCl₂ が電離するようすを表す式です。空らんに入るものを選ぼう。',
          text: 'CuCl₂ → [b1] ＋ [b2]',
          blanks: [
            word('b1', ['Cu2+', 'Cu+', 'Cu'], 'Cu2+'),
            word('b2', ['2Cl-', 'Cl-', 'Cl₂'], '2Cl-'),
          ],
          explanation: '塩化銅は、銅イオン Cu2+ 1 個と塩化物イオン Cl- 2 個に電離します。＋2 と −1 × 2 で、電気の合計は 0 です。',
          hint: 'Cl の右下の数だけ Cl- ができるよ。',
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
        choice({
          id: 'io-battery-k4', concept: 'io-battery',
          prompt: '亜鉛板と銅板を使った電池で、水溶液をうすい塩酸から砂糖水にかえました。電圧は生じる？',
          options: ['生じない', '塩酸のときより大きな電圧が生じる', '塩酸のときと同じ電圧が生じる'],
          answer: 'a',
          explanation: '砂糖は非電解質なので、砂糖水の中にはイオンがありません。電池には電解質の水溶液が必要なので、砂糖水では電圧が生じません。',
          hint: '砂糖水に電流は流れたかな。',
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
        choice({
          id: 'io-acidbase-k4', concept: 'io-acidbase',
          prompt: 'うすい塩酸にフェノールフタレイン溶液を加えると、どうなる？',
          options: ['無色のまま変わらない', '赤色になる', '青色になる'],
          answer: 'a',
          explanation: 'フェノールフタレイン溶液は、アルカリ性のときだけ赤色になります。塩酸は酸性なので、無色のままです。',
          hint: 'フェノールフタレイン溶液が色を変えるのは、何性のときだけかな。',
        }),
        choice({
          id: 'io-acidbase-k5', concept: 'io-acidbase',
          prompt: 'うすい水酸化ナトリウム水溶液にマグネシウムリボンを入れると、どうなる？',
          options: ['ほとんど変化しない', '水素がさかんに発生する', '酸素がさかんに発生する'],
          answer: 'a',
          explanation: 'マグネシウムを入れて水素が発生するのは、酸性の水溶液の性質です。アルカリ性の水酸化ナトリウム水溶液では、ほとんど変化しません。',
          hint: 'マグネシウムで水素が出るのは、何性の水溶液だったかな。',
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
      { id: 'io-ion', title: '水溶液とイオン', order: 1, stages: [
        ion1, ion2, ionMp1, ionMp2, ionMp3, ionMp4, ionMp5, ionMp6, ionDr1, ionDr2, ionDr5, ionDr6, ionKq1, ionKq2,
      ] },
      { id: 'io-acid', title: '酸・アルカリと中和', order: 2, stages: [
        ion3, ion4, ionMp7, ionMp8, ionMp9, ionMp10, ionDr3, ionDr4, ionKq3,
      ] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
