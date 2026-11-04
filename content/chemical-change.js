// 「化学変化と原子・分子」教材データ（中学2年 理科・化学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（物質のなりたち: 分解・原子と分子 / 化学変化と質量: 化学反応式と酸化・還元・質量保存）と、概念 6 つ。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// drag の位置は部品の基準点（circle は中心）で判定する（js/ui-problems.js の anchorOf）。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
// 原子のモデルの色: 水素 white、酸素 sky、炭素 gray、銅 brown（ほかは ATOM_FILL の表）。
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

  // 原子のモデルの塗り（元素記号 → 色トークン）
  const ATOM_FILL = { H: 'white', O: 'sky', C: 'gray', Cu: 'brown', N: 'lightgreen', S: 'yellow', Fe: 'rock', Na: 'purple', Cl: 'green', Mg: 'glass', Ag: 'glass' };

  // 元素記号を書いた原子の丸（r は 12 以上にして、16px の記号が丸に収まるようにする）
  function atom(x, y, sym, r) {
    return { type: 'circle', x, y, r: r || 14, fill: ATOM_FILL[sym] || 'white', stroke: 'ink', label: sym };
  }
  // 記号を書かない小さな原子の丸（たくさん並べるとき）
  function dot(x, y, sym, r) {
    return { type: 'circle', x, y, r: r || 9, fill: ATOM_FILL[sym] || 'white', stroke: 'ink' };
  }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/chemical-change/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/chemical-change/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 固体を試験管に入れて加熱し、出てきた気体を石灰水に通す装置。
  // 試験管の底は (40, 100)、tilt 100 で口 (129, 116) が少し下がる。powder は粉の色トークン
  function heatingItems(powder) {
    return [
      { type: 'tube', x: 40, y: 100, height: 90, tilt: 100, level: 0.2, liquid: powder },
      { type: 'flame', x: 60, y: 160 },
      { type: 'line', points: [[128, 116], [200, 116], [200, 196]], width: 3 },
      { type: 'beaker', x: 220, y: 215, width: 80, height: 90, level: 0.6, liquid: 'glass' },
    ];
  }

  // 水の電気分解の装置（H 字形の管）。左の電極は電源の−極（陰極）、右は＋極（陽極）。
  // 気体の高さは左 58・右 28（体積 2:1）。extra は名前や region などの追加の部品
  function electrolysisScene(extra) {
    return scene([
      { type: 'rect', x: 70, y: 40, width: 36, height: 170, fill: 'water' },
      { type: 'rect', x: 200, y: 40, width: 36, height: 170, fill: 'water' },
      { type: 'rect', x: 106, y: 190, width: 94, height: 20, fill: 'water' },
      { type: 'rect', x: 72, y: 42, width: 32, height: 58, fill: 'white', stroke: 'none' },
      { type: 'rect', x: 202, y: 42, width: 32, height: 28, fill: 'white', stroke: 'none' },
      { type: 'line', points: [[88, 206], [88, 160]], color: 'gray', width: 4 },
      { type: 'line', points: [[218, 206], [218, 160]], color: 'gray', width: 4 },
      { type: 'line', points: [[88, 210], [88, 226], [40, 226]], width: 2 },
      { type: 'line', points: [[218, 210], [218, 226], [266, 226]], width: 2 },
      { type: 'text', x: 6, y: 216, text: '電源の−極', size: 12 },
      { type: 'text', x: 254, y: 216, text: '電源の＋極', size: 12 },
    ].concat(extra || []));
  }

  // 質量のグラフの軸と目盛り。xs・ys は目盛りの [値, 座標] の配列。titles は [縦軸の名前, 横軸の名前]
  function axesItems(xs, ys, titles) {
    const items = [];
    ys.forEach(([v, y]) => {
      items.push({ type: 'line', points: [[60, y], [290, y]], color: 'glass', width: 1 });
      items.push({ type: 'text', x: 54, y: y + 4, text: v, size: 12, anchor: 'end' });
    });
    xs.forEach(([v, x]) => {
      items.push({ type: 'line', points: [[x, 200], [x, 206]], width: 2 });
      items.push({ type: 'text', x, y: 220, text: v, size: 12, anchor: 'middle' });
    });
    items.push({ type: 'line', points: [[60, 30], [60, 200], [300, 200]], width: 2 });
    items.push({ type: 'text', x: 54, y: 218, text: '0', size: 12, anchor: 'end' });
    items.push({ type: 'text', x: 8, y: 20, text: titles[0], size: 12 });
    items.push({ type: 'text', x: 310, y: 236, text: titles[1], size: 12, anchor: 'end' });
    return items;
  }

  // 銅の質量と酸化銅の質量のグラフ。x = 60 + 220 × 銅、y = 200 − 160 × 酸化銅（銅：酸化銅 ＝ 4：5）
  function copperGraphItems() {
    const cx = (m) => 60 + 220 * m;
    const cy = (m) => 200 - 160 * m;
    const items = axesItems(
      [['0.2', cx(0.2)], ['0.4', cx(0.4)], ['0.6', cx(0.6)], ['0.8', cx(0.8)]],
      [['0.25', cy(0.25)], ['0.50', cy(0.5)], ['0.75', cy(0.75)], ['1.00', cy(1)]],
      ['酸化銅の質量〔g〕', '銅の質量〔g〕']);
    items.push({ type: 'line', points: [[cx(0), cy(0)], [cx(0.8), cy(1)]], color: 'blue', width: 3 });
    [0.2, 0.4, 0.6, 0.8].forEach(m => items.push({ type: 'circle', x: cx(m), y: cy(m * 1.25), r: 4, fill: 'blue', stroke: 'none' }));
    return items;
  }

  // 上皿てんびん（中心 cx、幅は左右 40 ずつ）。tilt はうでの傾き（正なら左が下がる）
  function balanceItems(cx, tilt) {
    const yl = 120 + tilt, yr = 120 - tilt;
    return [
      { type: 'polygon', points: [[cx - 10, 150], [cx + 10, 150], [cx, 120]], fill: 'glass' },
      { type: 'line', points: [[cx - 22, 152], [cx + 22, 152]], width: 3 },
      { type: 'line', points: [[cx - 30, yl], [cx + 30, yr]], width: 4 },
      { type: 'ellipse', x: cx - 30, y: yl - 5, rx: 10, ry: 4, fill: 'glass' },
      { type: 'ellipse', x: cx + 30, y: yr - 5, rx: 10, ry: 4, fill: 'glass' },
      { type: 'rect', x: cx - 36, y: yl - 19, width: 12, height: 10, fill: 'gray' },
      { type: 'rect', x: cx + 24, y: yr - 19, width: 12, height: 10, fill: 'gray' },
    ];
  }

  // ================================================================
  // 領域 1: 物質のなりたち
  // ================================================================

  // ---- ステージ chem-1: 分解（化学変化と状態変化、炭酸水素ナトリウムの熱分解、水の電気分解） ----
  const chem1 = {
    id: 'chem-1', areaId: 'atom', title: '分解', minutes: 5, concepts: ['ch-decomposition'],
    lessons: [
      {
        id: 'chem-1-c1',
        text: '氷が水になるように、物質そのものは変わらず、すがただけが変わる変化を**状態変化**といいます。これに対して、もとの物質とはちがう別の物質ができる変化を**化学変化**（化学反応）といいます。',
        // 左: 氷 → 水（同じ物質）、右: 炭酸水素ナトリウム → 3 つの別の物質
        figure: scene([
          { type: 'text', x: 80, y: 30, text: '状態変化', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 30, text: '化学変化', size: 16, anchor: 'middle', bold: true },
          { type: 'line', points: [[160, 44], [160, 214]], color: 'gray', width: 2, dashed: true },
          { type: 'rect', x: 60, y: 52, width: 40, height: 40, fill: 'sky' },
          { type: 'text', x: 110, y: 78, text: '氷', size: 14 },
          { type: 'arrow', x1: 80, y1: 100, x2: 80, y2: 136, color: 'gray' },
          { type: 'beaker', x: 80, y: 205, width: 60, height: 56, level: 0.6 },
          { type: 'text', x: 118, y: 196, text: '水', size: 14 },
          { type: 'text', x: 240, y: 58, text: '炭酸水素ナトリウム', size: 12, anchor: 'middle' },
          { type: 'ellipse', x: 240, y: 76, rx: 30, ry: 9, fill: 'white' },
          { type: 'arrow', x1: 240, y1: 92, x2: 240, y2: 124, color: 'gray' },
          { type: 'text', x: 240, y: 146, text: '炭酸ナトリウム', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 168, text: '水', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 190, text: '二酸化炭素', size: 13, anchor: 'middle' },
          { type: 'text', x: 80, y: 232, text: '水のまま', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 232, text: '別の物質ができる', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chem-1-c2',
        text: '白い**炭酸水素ナトリウム**を加熱すると、**炭酸ナトリウム**（白い固体）・水・二酸化炭素に分かれます。このように 1 種類の物質が 2 種類以上の物質に分かれる化学変化を**分解**といい、加熱による分解を**熱分解**といいます。',
        // 試験管の口を少し下げて加熱し、出た気体を石灰水に通す（写真: 試験管の底の粉 (45〜100, 72〜92)、
        // ゴム栓 (155〜172, 88〜105)、炎 (45〜60, 85〜118)、石灰水の試験管 (246, 140〜192)）
        figure: scene([
          photo('chem-1-c2'),
          pointer(72, 37, 60, 82), tag(80, 30, '炭酸水素ナトリウム'),
          pointer(200, 71, 168, 91), tag(236, 66, '口を少し下げる'),
          pointer(30, 122, 47, 106), tag(22, 136, '加熱'),
          pointer(246, 212, 246, 184), tag(246, 228, '石灰水'),
        ]),
      },
      {
        id: 'chem-1-c3',
        text: 'できた水は**塩化コバルト紙**を青色から赤色（桃色）に変え、二酸化炭素は石灰水を白くにごらせます。残った炭酸ナトリウムは水によくとけ、**フェノールフタレイン液**を加えると濃い赤色になります（もとの物質はうすい赤色）。',
        // 塩化コバルト紙の色の変化と、石灰水のにごり（写真: 青い紙 (12〜116, 82〜128)、桃色の紙 (131〜232, 82〜128)、
        // 白くにごった石灰水の試験管 (246〜302, 58〜165)）
        figure: scene([
          photo('chem-1-c3'),
          tag(122, 64, '塩化コバルト紙'),
          tag(64, 152, '青色'),
          { type: 'arrow', x1: 86, y1: 147, x2: 134, y2: 147, color: 'ink', width: 2 },
          tag(182, 152, '赤色（桃色）'),
          tag(122, 180, '水にふれると赤色（桃色）', { size: 13 }),
          tag(122, 200, '＝ 水がある', { size: 13, bold: true }),
          tag(270, 186, '石灰水'),
          tag(270, 206, '白くにごる', { size: 13 }),
          tag(270, 226, '＝ 二酸化炭素', { size: 13, bold: true }),
        ]),
      },
      {
        id: 'chem-1-c4',
        text: '水に電流を流すと、陰極に**水素**、陽極に**酸素**が、体積の比 2：1 で発生します。電流による分解を**電気分解**といいます。純粋な水は電流が流れにくいので、**水酸化ナトリウム**を少しとかして流れやすくします。',
        // H 字形の管の水の電気分解（写真: 左の管 (118〜138) は黒い導線で電源の−極、気体 25〜62。
        // 右の管 (182〜202) は赤い導線で＋極、気体 25〜45。電極は管の下 (110〜140)）
        figure: scene([
          photo('chem-1-c4'),
          pointer(78, 42, 122, 42), tag(58, 47, '水素', { size: 16, bold: true }),
          pointer(242, 36, 198, 36), tag(262, 41, '酸素', { size: 16, bold: true }),
          pointer(98, 124, 124, 124), tag(58, 129, '陰極（−）'),
          pointer(222, 124, 196, 124), tag(262, 129, '陽極（＋）'),
          tag(56, 178, '体積の比', { size: 13 }),
          tag(56, 198, '水素：酸素', { size: 13 }),
          tag(56, 222, '2：1', { size: 16, bold: true }),
        ]),
      },
    ],
    warmup: choice({
      id: 'chem-1-w1', concept: 'ch-decomposition',
      prompt: '予想しよう。ホットケーキをふくらませる白い粉（炭酸水素ナトリウム）を加熱すると、どうなると思う？',
      options: ['気体が出て、別の物質に変わる', '液体になるだけで、物質は変わらない', '何も変化しない'],
      answer: 'a',
      explanation: '炭酸水素ナトリウムを加熱すると、二酸化炭素などの気体が出て、別の物質に変わります。ホットケーキがふくらむのは、この気体のはたらきです。このステージで確かめよう。',
      hint: 'ホットケーキがふくらむのは、生地の中で何ができるからかな。',
    }),
    problems: [
      figureChoice({
        id: 'chem-1-p1', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムを試験管に入れて加熱します。試験管の向きとして正しいのはア〜ウのどれ？ ア 口を上げる、イ 水平にする、ウ 口を少し下げる。',
        // ア tilt -65（口が上）、イ tilt -90（水平）、ウ tilt -105（口が少し下）。底は右、炎は底の近く
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '試験管の向き', size: 14, anchor: 'middle' },
          { type: 'tube', x: 90, y: 110, height: 70, tilt: -65, level: 0.15, liquid: 'white' },
          { type: 'flame', x: 82, y: 168 },
          { type: 'tube', x: 195, y: 110, height: 70, tilt: -90, level: 0.15, liquid: 'white' },
          { type: 'flame', x: 185, y: 168 },
          { type: 'tube', x: 300, y: 100, height: 70, tilt: -105, level: 0.15, liquid: 'white' },
          { type: 'flame', x: 290, y: 168 },
          { type: 'region', id: 'r1', x: 60, y: 208, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 165, y: 208, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 208, r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '加熱すると水ができます。口を上げたり水平にしたりすると、その水が熱い底のほうへ流れて、試験管が急に冷えて割れることがあります。だから、口を少し下げて加熱します。',
        hint: 'できた水が、熱くなった部分に流れないようにするには？',
      }),
      fill({
        id: 'chem-1-t1', concept: 'ch-decomposition', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '1 種類の物質が 2 種類以上の物質に分かれる化学変化を[b1]という。電流を流して分けることを[b2]という。',
        blanks: [
          word('b1', ['分解', '状態変化', '酸化'], '分解'),
          word('b2', ['熱分解', '電気分解', '燃焼'], '電気分解'),
        ],
        explanation: '1 種類の物質が 2 種類以上の物質に分かれる化学変化が**分解**です。加熱による分解を熱分解、電流による分解を**電気分解**といいます。',
        hint: '水に電流を流す実験を思い出そう。',
      }),
      choice({
        id: 'chem-1-p2', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムを加熱したとき、試験管の口についた液体に青色の塩化コバルト紙をつけました。色はどうなる？',
        options: ['赤色（桃色）に変わる', '青色のまま変わらない', '黄色に変わる'],
        answer: 'a',
        explanation: '塩化コバルト紙は、水にふれると青色から赤色（桃色）に変わります。だから、口についた液体は水だと分かります。',
        hint: '塩化コバルト紙は、何を調べる紙だったかな。',
      }),
      figureChoice({
        id: 'chem-1-p3', concept: 'ch-decomposition',
        prompt: '水を電気分解すると、図のように管の上に気体がたまりました。左の電極は電源の−極（陰極）、右の電極は＋極（陽極）につないであります。酸素がたまっているのはア・イのどちら？',
        figure: electrolysisScene([
          { type: 'region', id: 'r1', x: 88, y: 70, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 218, y: 56, r: 22, label: 'イ' },
        ]),
        answer: 'r2',
        explanation: '水の電気分解では、陽極に酸素、陰極に水素が発生します。体積は水素：酸素 ＝ 2：1 なので、たまった気体が少ない右側（陽極）が酸素です。火のついた線香を入れると、炎を上げて燃えます。',
        hint: '酸素は陽極（＋極）側にできて、体積は水素の半分だよ。',
      }),
      choice({
        id: 'chem-1-p4', concept: 'ch-decomposition',
        prompt: '水を電気分解するとき、水に少量の水酸化ナトリウムをとかすのはなぜ？',
        options: ['電流を流れやすくするため', '水素を多く発生させるため', '水を冷やすため'],
        answer: 'a',
        explanation: '純粋な水には電流がほとんど流れません。水酸化ナトリウムをとかすと電流が流れやすくなり、電気分解が進みます。水酸化ナトリウム水溶液は皮ふをいためるので、手につけないように気をつけます。',
        hint: '純粋な水は、電流が流れやすいかな。',
      }),
      choice({
        id: 'chem-1-p5', concept: 'ch-decomposition',
        prompt: '加熱する前の炭酸水素ナトリウムと、加熱した後に残った白い固体を、それぞれ同じ量の水にとかし、フェノールフタレイン液を加えました。正しいのはどれ？',
        options: ['加熱後の固体のほうが濃い赤色になる', '加熱前のほうが濃い赤色になる', 'どちらも色が変わらない'],
        answer: 'a',
        explanation: '加熱後に残った固体は炭酸ナトリウムで、水によくとけ、強いアルカリ性を示すので濃い赤色になります。炭酸水素ナトリウムはうすい赤色です。色のちがいから、別の物質ができたと分かります。',
        hint: 'フェノールフタレイン液は、アルカリ性が強いほど濃い赤色になるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chem-1-r1', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムの加熱を終えるとき、ガスバーナーの火を消す前にすることはどれ？',
        options: ['ガラス管を石灰水から出す', '試験管に水を入れる', '石灰水をかき混ぜる'],
        answer: 'a',
        explanation: '先に火を消すと、試験管の中の気体が冷えて縮み、石灰水が試験管に逆流して割れることがあります。だから、ガラス管を石灰水から出してから火を消します。',
        hint: '火を消すと、試験管の中の気体はどうなるかな。',
      }),
      choice({
        id: 'chem-1-r2', concept: 'ch-decomposition',
        prompt: '水を電気分解したとき、陰極（−極側）に発生する気体はどれ？',
        options: ['水素', '酸素', '二酸化炭素'],
        answer: 'a',
        explanation: '陰極には水素、陽極には酸素が発生します。陰極側の気体にマッチの火を近づけると、ポンと音を立てて燃えるので水素だと分かります。',
        hint: '体積が多いほうの気体だよ。',
      }),
      fill({
        id: 'chem-1-r3', concept: 'ch-decomposition',
        prompt: '空らんに入る数を入れよう。',
        text: '水を電気分解すると、水素と酸素の体積の比は 水素：酸素 ＝ [b1]：1 になる。',
        blanks: [number('b1', 2, 0, '')],
        explanation: '水の電気分解では、水素が酸素の 2 倍の体積で発生します。水分子 H₂O の中に、水素原子が酸素原子の 2 倍あることと関係しています。',
        hint: '陰極側にたまった気体のほうが多かったね。',
      }),
      choice({
        id: 'chem-1-r4', concept: 'ch-decomposition',
        prompt: '黒色の酸化銀を加熱すると、気体が発生して白っぽい固体が残りました。残った固体をこするとかがやきました。この固体は何？',
        options: ['銀', '酸化銀のまま', '炭素'],
        answer: 'a',
        explanation: '酸化銀を加熱すると、銀と酸素に分解します。残った白っぽい固体は、こすると金属光沢が出て、電気を通すので銀だと分かります。発生した気体は線香を激しく燃やすので酸素です。',
        hint: '金属光沢が出るのは、金属の性質だったね。',
      }),
      choice({
        id: 'chem-1-r5', concept: 'ch-decomposition',
        prompt: '次のうち、化学変化はどれ？',
        options: ['氷がとけて水になる', '水がふっとうして水蒸気になる', '炭酸水素ナトリウムを加熱すると気体が出る', 'ろうが冷えて固まる'],
        answer: 'c',
        explanation: '炭酸水素ナトリウムの加熱では、炭酸ナトリウム・水・二酸化炭素という別の物質ができるので化学変化です。ほかの 3 つは、すがたが変わるだけの状態変化です。',
        hint: '別の物質ができているのはどれかな。',
      }),
      choice({
        id: 'chem-1-t2', concept: 'ch-decomposition', term: true,
        prompt: '次の説明に合う言葉はどれ？「物質を加熱して、2 種類以上の物質に分ける化学変化」',
        options: ['熱分解', '電気分解', '状態変化'],
        answer: 'a',
        explanation: '加熱による分解を**熱分解**といいます。炭酸水素ナトリウムや酸化銀を加熱したときの変化が、その例です。',
        hint: '「熱」で「分解」するね。',
      }),
    ],
  };

  // ---- ステージ chem-2: 原子・分子と化学式（原子の性質、元素記号、分子、単体と化合物） ----
  const chem2 = {
    id: 'chem-2', areaId: 'atom', title: '原子・分子と化学式', minutes: 5, concepts: ['ch-atom', 'ch-formula'],
    lessons: [
      {
        id: 'chem-2-c1',
        text: '物質をつくる、それ以上分けられない小さな粒を**原子**といいます。原子は、化学変化でそれ以上分けられない、種類ごとに質量や大きさが決まっている、化学変化でなくなったり別の種類に変わったり新しくできたりしない、という性質をもちます。',
        // 種類のちがう原子のモデル
        figure: scene([
          { type: 'text', x: 160, y: 32, text: '原子の種類によって質量や大きさがちがう', size: 13, anchor: 'middle' },
          atom(70, 110, 'H', 14),
          atom(160, 110, 'O', 22),
          atom(260, 110, 'Cu', 30),
          { type: 'text', x: 70, y: 170, text: '水素原子', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 170, text: '酸素原子', size: 13, anchor: 'middle' },
          { type: 'text', x: 260, y: 170, text: '銅原子', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 220, text: '化学変化でなくならず、別の原子に変わらない', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chem-2-c2',
        text: '原子の種類を**元素**といい、アルファベット 1〜2 文字の**元素記号**で表します。2 文字のときは 2 文字目を小文字で書きます（Cl、Na など）。元素を決まった順に並べた表を**周期表**といいます。',
        // 元素記号の表（上段は金属でない元素、下の 2 段の右と下段は金属）
        figure: (function () {
          const list = [
            ['H', '水素'], ['O', '酸素'], ['C', '炭素'], ['N', '窒素'],
            ['S', '硫黄'], ['Cl', '塩素'], ['Na', 'ナトリウム'], ['Mg', 'マグネシウム'],
            ['Cu', '銅'], ['Fe', '鉄'], ['Ag', '銀'], ['Zn', '亜鉛'],
          ];
          const metals = ['Na', 'Mg', 'Cu', 'Fe', 'Ag', 'Zn'];
          const items = [];
          list.forEach(([sym, name], i) => {
            const cx = 40 + 80 * (i % 4), top = 18 + 72 * Math.floor(i / 4);
            items.push({ type: 'rect', x: cx - 28, y: top, width: 56, height: 34, rx: 4, fill: metals.includes(sym) ? 'glass' : 'white', label: sym });
            items.push({ type: 'text', x: cx, y: top + 54, text: name, size: 12, anchor: 'middle' });
          });
          return scene(items);
        })(),
      },
      {
        id: 'chem-2-c3',
        text: 'いくつかの原子が結びついた粒子を**分子**といい、物質の性質を示す最小の粒子です。水素・酸素・水・二酸化炭素・アンモニアは分子でできています。鉄・銅などの金属や、塩化ナトリウム・酸化銅は分子をつくらず、原子が規則正しく並んでいます。',
        // 分子のモデル（H₂、O₂、H₂O、CO₂）
        figure: scene([
          atom(68, 70, 'H', 13), atom(92, 70, 'H', 13),
          atom(226, 70, 'O', 16), atom(254, 70, 'O', 16),
          atom(62, 166, 'H', 12), atom(98, 166, 'H', 12), atom(80, 150, 'O', 16),
          atom(212, 156, 'O', 15), atom(240, 156, 'C', 15), atom(268, 156, 'O', 15),
          { type: 'text', x: 80, y: 110, text: '水素 H₂', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 110, text: '酸素 O₂', size: 13, anchor: 'middle' },
          { type: 'text', x: 80, y: 204, text: '水 H₂O', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 204, text: '二酸化炭素 CO₂', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 232, text: '原子が結びついた粒子 ＝ 分子', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'chem-2-c4',
        text: '元素記号と数字で物質を表したものを**化学式**といいます。H₂O の 2 は水素原子が 2 個という意味です。1 種類の元素だけでできた物質を**単体**、2 種類以上の元素でできた物質を**化合物**といいます。空気などの混合物は、どちらにも入りません。',
        // 単体と化合物の例
        figure: scene([
          { type: 'text', x: 85, y: 36, text: '単体', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 235, y: 36, text: '化合物', size: 16, anchor: 'middle', bold: true },
          { type: 'rect', x: 15, y: 48, width: 140, height: 140, rx: 8, fill: 'none' },
          { type: 'rect', x: 165, y: 48, width: 140, height: 140, rx: 8, fill: 'none' },
          { type: 'text', x: 55, y: 100, text: 'H₂', size: 18, anchor: 'middle' },
          { type: 'text', x: 115, y: 100, text: 'O₂', size: 18, anchor: 'middle' },
          { type: 'text', x: 55, y: 156, text: 'Fe', size: 18, anchor: 'middle' },
          { type: 'text', x: 115, y: 156, text: 'Cu', size: 18, anchor: 'middle' },
          { type: 'text', x: 205, y: 100, text: 'H₂O', size: 18, anchor: 'middle' },
          { type: 'text', x: 265, y: 100, text: 'CO₂', size: 18, anchor: 'middle' },
          { type: 'text', x: 205, y: 156, text: 'NaCl', size: 18, anchor: 'middle' },
          { type: 'text', x: 265, y: 156, text: 'CuO', size: 18, anchor: 'middle' },
          { type: 'text', x: 85, y: 208, text: '1 種類の元素', size: 12, anchor: 'middle' },
          { type: 'text', x: 235, y: 208, text: '2 種類以上の元素', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 232, text: '混合物（空気など）はどちらでもない', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'chem-2-w1', concept: 'ch-atom',
      prompt: '予想しよう。物質をどんどん細かく分けていくと、最後はどうなると思う？',
      options: ['それ以上分けられない小さな粒になる', 'いくらでも分けられて、なくなる', '最後は水になる'],
      answer: 'a',
      explanation: '物質は、それ以上分けられない小さな粒（原子）が集まってできていると考えられています。このステージで、原子と分子について学ぼう。',
      hint: '目に見えないほど小さな「粒」を考えてみよう。',
    }),
    problems: [
      choice({
        id: 'chem-2-p1', concept: 'ch-atom',
        prompt: '原子の性質として、正しくないものはどれ？',
        options: ['化学変化で、それ以上分けることができない', '種類によって、質量や大きさが決まっている', '化学変化で、別の種類の原子に変わることがある', '化学変化で、なくなったり新しくできたりしない'],
        answer: 'c',
        explanation: '原子は、化学変化で別の種類の原子に変わることはありません。化学変化で変わるのは原子の組み合わせで、原子そのものは変わらないと考えます。',
        hint: '化学変化の前後で、原子の種類は変わるかな。',
      }),
      fill({
        id: 'chem-2-t1', concept: 'ch-atom', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質をつくる、それ以上分けられない小さな粒を[b1]といい、その種類を[b2]という。',
        blanks: [
          word('b1', ['原子', '分子', '元素'], '原子'),
          word('b2', ['原子', '分子', '元素'], '元素'),
        ],
        explanation: '物質をつくる最小の粒が**原子**で、原子の種類を**元素**といいます。元素は元素記号で表します。',
        hint: '元素は「元素記号」で表す「種類」のことだよ。',
      }),
      fill({
        id: 'chem-2-p2', concept: 'ch-atom',
        prompt: '空らんに入る元素記号を選ぼう。',
        text: '銅の元素記号は[b1]、鉄の元素記号は[b2]である。',
        blanks: [
          word('b1', ['Cu', 'C', 'Ca'], 'Cu'),
          word('b2', ['Fe', 'F', 'Na'], 'Fe'),
        ],
        explanation: '銅は Cu、鉄は Fe です。C は炭素、Ca はカルシウム、Na はナトリウムです。2 文字の元素記号は、1 文字目を大文字、2 文字目を小文字で書きます。',
        hint: 'どちらも 2 文字の元素記号だよ。',
      }),
      figureChoice({
        id: 'chem-2-p3', concept: 'ch-formula',
        prompt: '原子のモデルで分子を表しました（丸の中の H は水素原子、O は酸素原子、C は炭素原子）。水の分子を表しているのはア〜ウのどれ？',
        figure: scene([
          atom(32, 100, 'O', 14), atom(60, 100, 'C', 14), atom(88, 100, 'O', 14),
          atom(146, 100, 'O', 14), atom(174, 100, 'O', 14),
          atom(244, 112, 'H', 12), atom(276, 112, 'H', 12), atom(260, 94, 'O', 15),
          { type: 'region', id: 'r1', x: 60, y: 190, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 190, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 190, r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '水の分子は、酸素原子 1 個に水素原子 2 個が結びついたもので、化学式は H₂O です。アは二酸化炭素 CO₂、イは酸素 O₂ の分子です。',
        hint: '水の化学式 H₂O の原子の数を数えよう。',
      }),
      choice({
        id: 'chem-2-p4', concept: 'ch-formula',
        prompt: '次のうち、分子をつくらない物質はどれ？',
        options: ['水素', '二酸化炭素', '銅', 'アンモニア'],
        answer: 'c',
        explanation: '銅や鉄などの金属は分子をつくらず、たくさんの原子が規則正しく並んでいます。だから化学式は Cu のように元素記号 1 つで表します。水素 H₂、二酸化炭素 CO₂、アンモニア NH₃ は分子でできています。',
        hint: '金属はどうだったかな。',
      }),
      choice({
        id: 'chem-2-p5', concept: 'ch-formula',
        prompt: '次のうち、化合物はどれ？',
        options: ['O₂（酸素）', 'Cu（銅）', 'H₂O（水）', 'N₂（窒素）'],
        answer: 'c',
        explanation: '水 H₂O は水素と酸素の 2 種類の元素でできているので化合物です。酸素・銅・窒素は 1 種類の元素だけでできているので単体です。',
        hint: '化学式の中の元素記号が何種類あるか数えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chem-2-r1', concept: 'ch-atom',
        prompt: '元素記号 Na は、何の元素？',
        options: ['ナトリウム', '窒素', 'ニッケル'],
        answer: 'a',
        explanation: 'Na はナトリウムです。窒素は N で表します。食塩（塩化ナトリウム）NaCl にもふくまれています。',
        hint: '食塩の化学式 NaCl を思い出そう。',
      }),
      choice({
        id: 'chem-2-r2', concept: 'ch-atom',
        prompt: '化学変化の前後で、原子はどうなる？',
        options: ['組み合わせは変わるが、種類と数は変わらない', '種類が変わる', '数がへる'],
        answer: 'a',
        explanation: '化学変化では原子の組み合わせが変わるだけで、原子がなくなったり、別の種類に変わったり、新しくできたりはしません。',
        hint: '原子の 3 つの性質を思い出そう。',
      }),
      figureChoice({
        id: 'chem-2-r3', concept: 'ch-formula',
        prompt: '物質のようすを原子のモデルで表しました。ア 酸素、イ 銅、ウ 水。分子をつくらず、原子が規則正しく並んでいるのはア〜ウのどれ？',
        figure: scene([
          dot(36, 70, 'O'), dot(52, 70, 'O'),
          dot(62, 104, 'O'), dot(78, 104, 'O'),
          dot(34, 134, 'O'), dot(50, 134, 'O'),
          dot(140, 76, 'Cu', 10), dot(160, 76, 'Cu', 10), dot(180, 76, 'Cu', 10),
          dot(140, 96, 'Cu', 10), dot(160, 96, 'Cu', 10), dot(180, 96, 'Cu', 10),
          dot(140, 116, 'Cu', 10), dot(160, 116, 'Cu', 10), dot(180, 116, 'Cu', 10),
          dot(242, 82, 'H', 6), dot(262, 82, 'H', 6), dot(252, 72, 'O', 9),
          dot(270, 132, 'H', 6), dot(290, 132, 'H', 6), dot(280, 122, 'O', 9),
          { type: 'text', x: 56, y: 166, text: '酸素', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 166, text: '銅', size: 13, anchor: 'middle' },
          { type: 'text', x: 265, y: 166, text: '水', size: 13, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 56, y: 205, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 205, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 205, r: 24, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '銅などの金属は分子をつくらず、たくさんの原子が規則正しく並んでいます。酸素は酸素原子 2 個、水は酸素原子 1 個と水素原子 2 個が結びついた分子でできています。',
        hint: '原子がばらばらの組にならず、ずっと並んでいるのはどれかな。',
      }),
      fill({
        id: 'chem-2-r4', concept: 'ch-formula',
        prompt: '空らんに入る数を入れよう。',
        text: '二酸化炭素の分子 CO₂ は、炭素原子[b1]個と酸素原子[b2]個が結びついている。',
        blanks: [number('b1', 1, 0, '個'), number('b2', 2, 0, '個')],
        explanation: '化学式の元素記号の右下の数字は、その原子の数です。数字がないときは 1 個です。CO₂ は炭素原子 1 個と酸素原子 2 個です。',
        hint: 'C の右下には数字がなく、O の右下には 2 があるね。',
      }),
      choice({
        id: 'chem-2-r5', concept: 'ch-formula',
        prompt: '次のうち、単体はどれ？',
        options: ['H₂O（水）', 'CO₂（二酸化炭素）', 'O₂（酸素）', 'NaCl（塩化ナトリウム）'],
        answer: 'c',
        explanation: '酸素 O₂ は酸素という 1 種類の元素だけでできているので単体です。ほかの 3 つは 2 種類の元素でできているので化合物です。',
        hint: '元素記号が 1 種類だけの化学式をさがそう。',
      }),
      choice({
        id: 'chem-2-t2', concept: 'ch-formula', term: true,
        prompt: '次の説明に合う言葉はどれ？「いくつかの原子が結びついた粒子で、物質の性質を示す最小の粒子」',
        options: ['分子', '原子', '元素'],
        answer: 'a',
        explanation: 'いくつかの原子が結びついた粒子を**分子**といいます。たとえば水の分子は、酸素原子 1 個と水素原子 2 個が結びついたものです。',
        hint: '水 H₂O の粒は、原子がいくつか結びついているね。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 化学変化と質量
  // ================================================================

  // ---- ステージ chem-3: 化学反応式・酸化と還元（鉄と硫黄、酸化・燃焼、還元） ----
  const chem3 = {
    id: 'chem-3', areaId: 'reaction', title: '化学反応式・酸化と還元', minutes: 5, concepts: ['ch-equation', 'ch-oxidation'],
    lessons: [
      {
        id: 'chem-3-c1',
        anim: 'ch-water-formation',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '化学変化を化学式で表したものを**化学反応式**といいます。矢印の左に反応前、右に反応後の物質を書きます。左右で原子の種類と数が等しくなるように、化学式の前に**係数**をつけてそろえます。',
        // 2H₂ + O₂ → 2H₂O のモデル（H は左右とも 4 個、O は 2 個）
        figure: scene([
          { type: 'text', x: 42, y: 44, text: '2H₂', size: 16, anchor: 'middle' },
          { type: 'text', x: 110, y: 44, text: 'O₂', size: 16, anchor: 'middle' },
          { type: 'text', x: 232, y: 44, text: '2H₂O', size: 16, anchor: 'middle' },
          dot(32, 84, 'H', 10), dot(52, 84, 'H', 10),
          dot(32, 126, 'H', 10), dot(52, 126, 'H', 10),
          { type: 'text', x: 78, y: 112, text: '＋', size: 18, anchor: 'middle' },
          dot(99, 105, 'O', 11), dot(121, 105, 'O', 11),
          { type: 'arrow', x1: 144, y1: 105, x2: 190, y2: 105 },
          dot(218, 94, 'H', 8), dot(246, 94, 'H', 8), dot(232, 82, 'O', 11),
          dot(218, 140, 'H', 8), dot(246, 140, 'H', 8), dot(232, 128, 'O', 11),
          { type: 'text', x: 160, y: 186, text: '左右とも H は 4 個、O は 2 個', size: 13, anchor: 'middle' },
          dot(30, 218, 'H', 8),
          { type: 'text', x: 44, y: 223, text: '水素原子', size: 12 },
          dot(170, 218, 'O', 8),
          { type: 'text', x: 184, y: 223, text: '酸素原子', size: 12 },
        ]),
      },
      {
        id: 'chem-3-c2',
        text: '鉄と硫黄の混合物を加熱すると、熱と光を出して反応し、**硫化鉄**ができます（Fe ＋ S → FeS）。硫化鉄は磁石につかず、うすい塩酸を加えると、においのある気体（**硫化水素**）が出ます。もとの鉄とは別の物質です。',
        // 加熱前（混合物）と加熱後（硫化鉄）の性質のちがい（写真: 左の皿 (82, 32〜160) に鉄粉と硫黄の粉、
        // 右の皿 (235, 32〜160) に黒い硫化鉄。皿の下 165 より下は白い余白）
        figure: scene([
          photo('chem-3-c2'),
          tag(82, 24, '加熱前', { size: 16, bold: true }),
          { type: 'arrow', x1: 118, y1: 18, x2: 198, y2: 18, color: 'ink', width: 2 },
          tag(235, 24, '加熱後', { size: 16, bold: true }),
          tag(82, 180, '鉄と硫黄の混合物'),
          tag(82, 200, '磁石につく', { size: 13 }),
          tag(235, 180, '硫化鉄（黒色）'),
          tag(235, 200, '磁石につかない', { size: 13 }),
          tag(160, 230, 'Fe ＋ S → FeS', { size: 16, bold: true }),
        ]),
      },
      {
        id: 'chem-3-c3',
        text: '物質が酸素と結びつく化学変化を**酸化**、できた物質を**酸化物**といいます。銅を加熱すると黒色の酸化銅になります（2Cu ＋ O₂ → 2CuO）。マグネシウムのように、熱や光を激しく出しながら酸化することを**燃焼**といいます。',
        // 銅の酸化と、マグネシウムの燃焼（写真: 上の皿 (12〜140, 8〜92) に銅の粉、下の皿 (12〜140, 98〜185) に
        // 酸化銅の粉、右にピンセットではさんだマグネシウムリボン (220〜255, 50〜165)。強い光は (230, 150)）
        figure: scene([
          photo('chem-3-c3'),
          tag(174, 46, '銅'),
          tag(174, 64, '（赤茶色）', { size: 13 }),
          { type: 'arrow', x1: 174, y1: 72, x2: 174, y2: 124, color: 'ink', width: 2 },
          tag(174, 102, '加熱', { size: 13 }),
          tag(174, 142, '酸化銅'),
          tag(174, 160, '（黒色）', { size: 13 }),
          tag(76, 210, '銅の酸化', { size: 16, bold: true }),
          pointer(242, 190, 232, 166),
          tag(252, 206, 'マグネシウムの燃焼', { size: 13, bold: true }),
          tag(252, 226, '（強い光と熱）', { size: 13 }),
        ]),
      },
      {
        id: 'chem-3-c4',
        text: '酸化物から酸素をとり除く化学変化を**還元**といいます。酸化銅と炭素の粉を混ぜて加熱すると、酸化銅は還元されて銅になり、炭素は酸化されて二酸化炭素になります（2CuO ＋ C → 2Cu ＋ CO₂）。還元と酸化は同時に起こります。',
        // 酸化銅と炭素を加熱し、出た気体を石灰水に通す
        figure: scene(heatingItems('ink').concat([
          { type: 'text', x: 160, y: 30, text: '2CuO ＋ C → 2Cu ＋ CO₂', size: 14, anchor: 'middle' },
          { type: 'text', x: 8, y: 76, text: '酸化銅＋炭素', size: 12 },
          { type: 'text', x: 8, y: 210, text: '赤色の銅ができる', size: 12 },
          { type: 'text', x: 220, y: 236, text: '石灰水が白くにごる', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'chem-3-w1', concept: 'ch-equation',
      prompt: '予想しよう。水素と酸素が結びついて水ができるとき、反応の前と後で、水素原子と酸素原子の数はどうなると思う？',
      options: ['反応の前と後で変わらない', '反応の後にふえる', '反応の後にへる'],
      answer: 'a',
      explanation: '化学変化では原子の組み合わせが変わるだけなので、原子の数は変わりません。このことを、化学反応式で確かめよう。',
      hint: '原子はなくなったり、新しくできたりするかな。',
    }),
    problems: [
      choice({
        id: 'chem-3-p1', concept: 'ch-equation',
        prompt: '水素が燃えて水ができる化学変化を表す化学反応式として、正しいものはどれ？',
        options: ['2H₂ ＋ O₂ → 2H₂O', 'H₂ ＋ O₂ → H₂O', 'H₂ ＋ O → H₂O', '2H ＋ O → H₂O'],
        answer: 'a',
        explanation: '水素も酸素も分子（H₂、O₂）なので、化学式はそのまま使います。H₂ ＋ O₂ → H₂O では左の O が 2 個、右が 1 個でそろわないので、係数をつけて 2H₂ ＋ O₂ → 2H₂O とします。左右とも H は 4 個、O は 2 個です。',
        hint: '左右の H と O の数を数えてみよう。',
      }),
      fill({
        id: 'chem-3-t1', concept: 'ch-oxidation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質が酸素と結びつく化学変化を[b1]といい、酸化物から酸素をとり除く化学変化を[b2]という。',
        blanks: [
          word('b1', ['酸化', '還元', '分解'], '酸化'),
          word('b2', ['酸化', '還元', '分解'], '還元'),
        ],
        explanation: '酸素と結びつく変化が**酸化**、酸化物から酸素をとり除く変化が**還元**です。還元が起こるとき、酸素をうばった物質は酸化されています。',
        hint: '酸化銅を銅にもどす変化はどちらかな。',
      }),
      fill({
        id: 'chem-3-p2', concept: 'ch-equation',
        prompt: '空らんに入る化学式を選ぼう。',
        text: 'マグネシウムの燃焼: 2Mg ＋ O₂ → [b1]',
        blanks: [word('b1', ['2MgO', 'MgO', 'MgO₂'], '2MgO')],
        explanation: '酸化マグネシウムの化学式は MgO です。左に Mg が 2 個、O が 2 個あるので、右も 2MgO にすると原子の数がそろいます。化学式の中の数字は変えずに、係数でそろえます。',
        hint: '左の Mg と O の数に、右の数を合わせよう。',
      }),
      figureChoice({
        id: 'chem-3-p3', concept: 'ch-oxidation',
        prompt: 'ア 銅の粉を加熱する、イ マグネシウムを加熱する、ウ 酸化銅と炭素の粉を混ぜて試験管で加熱する。このうち、還元が起こるのはア〜ウのどれ？',
        figure: scene([
          { type: 'text', x: 55, y: 40, text: '銅の粉', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 40, text: 'マグネシウム', size: 12, anchor: 'middle' },
          { type: 'text', x: 265, y: 40, text: '酸化銅と炭素', size: 12, anchor: 'middle' },
          { type: 'line', points: [[25, 128], [85, 128]], color: 'gray', width: 3 },
          { type: 'ellipse', x: 55, y: 121, rx: 24, ry: 7, fill: 'brown' },
          { type: 'flame', x: 55, y: 175 },
          { type: 'line', points: [[130, 110], [180, 110]], color: 'gray', width: 4 },
          { type: 'flame', x: 165, y: 175 },
          { type: 'tube', x: 232, y: 100, height: 70, tilt: 100, level: 0.25, liquid: 'ink' },
          { type: 'flame', x: 245, y: 160 },
          { type: 'region', id: 'r1', x: 55, y: 210, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 210, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 210, r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: 'ウでは、炭素が酸化銅から酸素をうばうので、酸化銅は還元されて銅になります。アとイは、銅やマグネシウムが酸素と結びつく酸化です。酸素がとれるのか、結びつくのかで見分けよう。',
        hint: '酸化物から酸素がとれるのはどれかな。',
      }),
      choice({
        id: 'chem-3-p4', concept: 'ch-oxidation',
        prompt: '「燃焼」の説明として正しいものはどれ？',
        options: ['熱や光を激しく出しながら酸化すること', '酸化物から酸素をとり除くこと', '物質を加熱して分解すること'],
        answer: 'a',
        explanation: '燃焼は、熱や光を激しく出しながら起こる酸化です。マグネシウムやスチールウール（鉄）、木や紙が燃えるのが例です。銅をゆっくり加熱して黒くなる変化は、酸化ですが燃焼とはいいません。',
        hint: '燃焼も、酸素と結びつく変化のなかまだよ。',
      }),
      choice({
        id: 'chem-3-p5', concept: 'ch-equation',
        prompt: '鉄と硫黄の混合物を加熱してできた物質に、磁石を近づけました。どうなる？',
        options: ['磁石につかない', '加熱前と同じように磁石につく', '磁石に強く引きつけられて、加熱前よりよくつく'],
        answer: 'a',
        explanation: '鉄と硫黄が結びついてできた硫化鉄は、鉄とは別の物質なので、磁石につきません。うすい塩酸を加えると、においのある硫化水素が発生します。',
        hint: '加熱後の物質は、もとの鉄と同じ物質かな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chem-3-r1', concept: 'ch-equation',
        prompt: '化学反応式で、矢印の左右の原子の数をそろえるのはなぜ？',
        options: ['化学変化で原子はなくならず、新しくできることもないから', '左右の物質の数をそろえるきまりだから', '反応の後は原子がふえるから'],
        answer: 'a',
        explanation: '化学変化では原子の組み合わせが変わるだけで、原子の種類と数は変わりません。だから化学反応式でも、左右で原子の種類と数を等しくします。',
        hint: '原子の性質を思い出そう。',
      }),
      fill({
        id: 'chem-3-r2', concept: 'ch-equation',
        prompt: '空らんに入る化学式を選ぼう。',
        text: '鉄と硫黄の反応: Fe ＋ S → [b1]',
        blanks: [word('b1', ['FeS', 'FeS₂', 'Fe₂S'], 'FeS')],
        explanation: '鉄と硫黄が 1：1 の数の割合で結びついて、硫化鉄 FeS ができます。左右とも Fe が 1 個、S が 1 個でそろっています。',
        hint: '左の Fe と S の数を数えよう。',
      }),
      choice({
        id: 'chem-3-r3', concept: 'ch-equation',
        prompt: '鉄と硫黄の混合物を加熱してできた物質に、うすい塩酸を加えると、どうなる？',
        options: ['においのある気体（硫化水素）が出る', 'においのない気体（水素）が出る', '何も起こらない'],
        answer: 'a',
        explanation: '加熱後にできた硫化鉄にうすい塩酸を加えると、においのある硫化水素が出ます。加熱前の混合物では、鉄と塩酸が反応して、においのない水素が出ます。においのちがいから、別の物質ができたと分かります。',
        hint: '加熱前の鉄と塩酸では、においのない気体が出たね。',
      }),
      choice({
        id: 'chem-3-r4', concept: 'ch-oxidation',
        prompt: '酸化銅と炭素の粉を混ぜて加熱したとき、炭素はどうなる？',
        options: ['酸化されて二酸化炭素になる', '還元されて銅になる', '変化せずに残る'],
        answer: 'a',
        explanation: '炭素は酸化銅から酸素をうばって二酸化炭素になります。このとき酸化銅は還元され、炭素は酸化されています。還元と酸化は同時に起こります。',
        hint: '石灰水が白くにごったことから考えよう。',
      }),
      choice({
        id: 'chem-3-r5', concept: 'ch-oxidation',
        prompt: '赤茶色の銅の粉をステンレス皿にのせて、よく加熱しました。加熱後の物質の色はどれ？',
        options: ['黒色', '白色', '銀色'],
        answer: 'a',
        explanation: '銅を加熱すると、空気中の酸素と結びついて黒色の酸化銅になります。マグネシウムを燃やすとできる酸化マグネシウムは白色です。',
        hint: '酸化銅は何色だったかな。',
      }),
      choice({
        id: 'chem-3-t2', concept: 'ch-oxidation', term: true,
        prompt: '次の説明に合う言葉はどれ？「物質が酸素と結びついてできた物質」',
        options: ['酸化物', '単体', '混合物'],
        answer: 'a',
        explanation: '物質が酸素と結びついてできた物質を**酸化物**といいます。酸化銅や酸化マグネシウム、二酸化炭素が例です。',
        hint: '「酸化」でできた「物」だね。',
      }),
    ],
  };

  // ---- ステージ chem-4: 質量保存と質量の比（質量保存の法則、金属と酸素の質量の比、反応と熱） ----

  // マグネシウムの質量と酸化マグネシウムの質量のグラフの座標（x = 60 + 100 × Mg、y = 200 − 64 × MgO）
  const mgX = (m) => 60 + 100 * m;
  const mgY = (m) => 200 - 64 * m;

  const chem4 = {
    id: 'chem-4', areaId: 'reaction', title: '質量保存と質量の比', minutes: 5, concepts: ['ch-conservation'],
    lessons: [
      {
        id: 'chem-4-c1',
        anim: 'ch-mass-conservation',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '化学変化の前後で、物質全体の質量は変わりません。これを**質量保存の法則**といいます。化学変化では原子の組み合わせが変わるだけで、原子の種類と数は変わらないからです。',
        // ふたをした容器の中で反応させても、質量は変わらない
        figure: scene([
          { type: 'text', x: 80, y: 40, text: '反応前', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 40, text: '反応後', size: 14, anchor: 'middle', bold: true },
          { type: 'rect', x: 66, y: 52, width: 28, height: 12, rx: 3, fill: 'gray' },
          { type: 'rect', x: 50, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
          { type: 'rect', x: 52, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
          { type: 'rect', x: 35, y: 162, width: 90, height: 28, fill: 'glass', label: '80.0 g' },
          { type: 'arrow', x1: 138, y1: 112, x2: 182, y2: 112, color: 'gray' },
          { type: 'rect', x: 226, y: 52, width: 28, height: 12, rx: 3, fill: 'gray' },
          { type: 'rect', x: 210, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
          { type: 'rect', x: 212, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
          { type: 'circle', x: 230, y: 100, r: 4, fill: 'white', stroke: 'line' },
          { type: 'circle', x: 250, y: 88, r: 4, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 195, y: 162, width: 90, height: 28, fill: 'glass', label: '80.0 g' },
          { type: 'text', x: 160, y: 226, text: '原子の種類と数は変わらない', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'chem-4-c2',
        anim: 'ch-open-container',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: 'ふたをした容器の中で、うすい塩酸と炭酸水素ナトリウムを反応させても、質量は変わりません。ふたを開けると、できた二酸化炭素が空気中へ出ていくので、その分だけ質量が小さくなります。',
        // ふたをしたまま／ふたを開けたとき
        figure: scene([
          { type: 'text', x: 80, y: 30, text: 'ふたをしたまま', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 30, text: 'ふたを開ける', size: 13, anchor: 'middle' },
          { type: 'rect', x: 66, y: 52, width: 28, height: 12, rx: 3, fill: 'gray' },
          { type: 'rect', x: 50, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
          { type: 'rect', x: 52, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
          { type: 'circle', x: 70, y: 100, r: 4, fill: 'white', stroke: 'line' },
          { type: 'circle', x: 90, y: 86, r: 4, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 35, y: 162, width: 90, height: 28, fill: 'glass' },
          { type: 'rect', x: 210, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
          { type: 'rect', x: 212, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
          { type: 'arrow', x1: 230, y1: 70, x2: 222, y2: 44, color: 'gray' },
          { type: 'arrow', x1: 250, y1: 70, x2: 258, y2: 44, color: 'gray' },
          { type: 'rect', x: 195, y: 162, width: 90, height: 28, fill: 'glass' },
          { type: 'text', x: 80, y: 214, text: '質量は変わらない', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 214, text: '二酸化炭素が出て', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 232, text: '質量が小さくなる', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chem-4-c3',
        text: '金属を加熱すると、結びついた酸素の分だけ質量がふえます。金属と結びつく酸素の質量の比は決まっていて、銅：酸素 ＝ 4：1、マグネシウム：酸素 ＝ 3：2 です。銅 0.8 g からは酸化銅 1.0 g ができます。',
        // 銅の質量と酸化銅の質量は比例する
        figure: scene(copperGraphItems().concat([
          { type: 'text', x: 200, y: 150, text: '銅：酸素 ＝ 4：1', size: 14 },
        ])),
      },
      {
        id: 'chem-4-c4',
        text: '化学変化では熱の出入りがあります。燃焼や鉄と硫黄の反応のように熱を出して温度が上がる反応を**発熱反応**、水酸化バリウムと塩化アンモニウムの反応のように熱を吸収して温度が下がる反応を**吸熱反応**といいます。',
        // 温度が上がる反応と下がる反応
        figure: scene([
          { type: 'text', x: 80, y: 36, text: '発熱反応', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 36, text: '吸熱反応', size: 16, anchor: 'middle', bold: true },
          { type: 'beaker', x: 80, y: 200, width: 80, height: 80, level: 0.5 },
          { type: 'rect', x: 86, y: 60, width: 8, height: 134, rx: 4, fill: 'white' },
          { type: 'rect', x: 87, y: 96, width: 6, height: 97, fill: 'red', stroke: 'none' },
          { type: 'arrow', x1: 134, y1: 150, x2: 134, y2: 90, color: 'orange' },
          { type: 'beaker', x: 240, y: 200, width: 80, height: 80, level: 0.5 },
          { type: 'rect', x: 246, y: 60, width: 8, height: 134, rx: 4, fill: 'white' },
          { type: 'rect', x: 247, y: 160, width: 6, height: 33, fill: 'red', stroke: 'none' },
          { type: 'arrow', x1: 294, y1: 90, x2: 294, y2: 150, color: 'blue' },
          { type: 'text', x: 80, y: 228, text: '温度が上がる', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 228, text: '温度が下がる', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'chem-4-w1', concept: 'ch-conservation',
      prompt: '予想しよう。スチールウール（鉄）を空気中で燃やすと、燃やした後の質量はどうなると思う？',
      options: ['ふえる', 'へる', '変わらない'],
      answer: 'a',
      explanation: 'スチールウールが燃えると、空気中の酸素と結びつくので、結びついた酸素の分だけ質量がふえます。紙や木が燃えて軽くなるのとはちがいます。このステージで質量の変化を考えよう。',
      hint: '燃焼は、酸素と結びつく変化だったね。',
    }),
    problems: [
      choice({
        id: 'chem-4-p1', concept: 'ch-conservation',
        prompt: 'ふたをした容器の中で、うすい塩酸と炭酸水素ナトリウムを反応させました。ふたをしたまま質量をはかると、反応前と比べてどうなる？',
        options: ['変わらない', '大きくなる', '小さくなる'],
        answer: 'a',
        explanation: 'ふたをした容器の中では、できた二酸化炭素が外に出ないので、全体の質量は変わりません。化学変化の前後で原子の種類と数が変わらないからです。これを質量保存の法則といいます。',
        hint: '容器の外に出ていくものはあるかな。',
      }),
      fill({
        id: 'chem-4-t1', concept: 'ch-conservation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '化学変化の前後で、物質全体の質量が変わらないことを[b1]という。',
        blanks: [word('b1', ['質量保存の法則', '化学反応式', '熱分解'], '質量保存の法則')],
        explanation: '化学変化の前後で物質全体の質量が変わらないことを**質量保存の法則**といいます。気体が出入りしないようにすれば、どんな化学変化でも成り立ちます。',
        hint: '質量が「保存される（そのまま残る）」という名前だよ。',
      }),
      fill({
        id: 'chem-4-p2', concept: 'ch-conservation',
        prompt: '空らんに入る数を入れよう。銅と酸素は 4：1 の質量の比で結びつきます。',
        text: '銅 2.0 g を完全に酸化させると、酸化銅が[b1]できる。',
        blanks: [number('b1', 2.5, 0.05, 'g')],
        explanation: '銅：酸素 ＝ 4：1 なので、銅 2.0 g と結びつく酸素は 2.0 ÷ 4 ＝ 0.5 g です。酸化銅の質量は 2.0 ＋ 0.5 ＝ 2.5 g です。結びつく酸素を先に求めて、銅に足そう。',
        hint: 'まず、結びつく酸素の質量を求めよう。',
      }),
      drag({
        id: 'chem-4-p3', concept: 'ch-conservation',
        prompt: 'マグネシウムと酸素は 3：2 の質量の比で結びつきます。マグネシウム 1.2 g を完全に酸化させたときにできる酸化マグネシウムの質量を表す点を、上下に動かしてグラフの正しい位置に置こう。',
        // 正解は MgO 2.0 g → y = 200 − 128 = 72。不正解例 1.2 g（マグネシウムの質量のまま）→ y≈123（51px はなれる）。
        // ほかの誤り（1.5 g → y = 104、酸素だけ 0.8 g → y≈149）も 30px 以上はなれる
        figure: scene(axesItems(
          [['0.4', mgX(0.4)], ['0.8', mgX(0.8)], ['1.2', mgX(1.2)], ['1.6', mgX(1.6)], ['2.0', mgX(2.0)]],
          [['0.5', mgY(0.5)], ['1.0', mgY(1.0)], ['1.5', mgY(1.5)], ['2.0', mgY(2.0)], ['2.5', mgY(2.5)]],
          ['酸化マグネシウムの質量〔g〕', 'マグネシウムの質量〔g〕']).concat([
          { type: 'line', points: [[mgX(1.2), 200], [mgX(1.2), 36]], color: 'gray', width: 2, dashed: true },
          { type: 'circle', id: 'point', x: mgX(1.2), y: 186, r: 9, fill: 'blue', stroke: 'ink' },
        ])),
        draggable: { itemId: 'point', axis: 'y' },
        target: { x: mgX(1.2), y: mgY(2.0) },
        samples: { correct: { x: mgX(1.2), y: mgY(2.0) }, wrong: { x: mgX(1.2), y: mgY(1.2) } },
        explanation: 'マグネシウム：酸素 ＝ 3：2 なので、1.2 g と結びつく酸素は 1.2 × 2 ÷ 3 ＝ 0.8 g です。酸化マグネシウムは 1.2 ＋ 0.8 ＝ 2.0 g なので、縦軸の 2.0 の高さに点を置きます。',
        hint: '結びつく酸素を求めてから、マグネシウムの質量に足そう。',
      }),
      figureChoice({
        id: 'chem-4-p4', concept: 'ch-conservation',
        prompt: '上皿てんびんの左右の皿に同じ質量のスチールウールをのせてつり合わせ、左の皿のスチールウールだけを燃やしました。燃やした後のてんびんのようすはア〜ウのどれ？ ア 左が下がる、イ つり合ったまま、ウ 右が下がる。',
        figure: scene(balanceItems(55, 10).concat(balanceItems(160, 0), balanceItems(265, -10), [
          { type: 'text', x: 160, y: 40, text: '左の皿だけ燃やした後', size: 13, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 55, y: 200, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 200, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 200, r: 24, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: 'スチールウール（鉄）は燃えると空気中の酸素と結びつくので、結びついた酸素の分だけ質量がふえます。だから左の皿が重くなり、左が下がります。',
        hint: '燃えた後の物質には、何が結びついているかな。',
      }),
      choice({
        id: 'chem-4-p5', concept: 'ch-conservation',
        prompt: '次の反応のうち、まわりの温度が上がる発熱反応はどれ？',
        options: ['水酸化バリウムと塩化アンモニウムを混ぜる', '鉄粉と活性炭を混ぜて食塩水を少し加える', '炭酸水素ナトリウムとクエン酸を水に入れる'],
        answer: 'b',
        explanation: '鉄粉が空気中の酸素と結びつくとき熱が出るので、温度が上がります。化学かいろはこの反応を使っています。ほかの 2 つは熱を吸収して温度が下がる吸熱反応です。',
        hint: '使いすてのかいろの中身を思い出そう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'chem-4-r1', concept: 'ch-conservation',
        prompt: '空らんに入る数を入れよう。マグネシウムと酸素は 3：2 の質量の比で結びつきます。',
        text: 'マグネシウム 1.2 g を完全に酸化させると、酸化マグネシウムが[b1]できる。',
        blanks: [number('b1', 2.0, 0.05, 'g')],
        explanation: '1.2 g のマグネシウムと結びつく酸素は 1.2 × 2 ÷ 3 ＝ 0.8 g です。酸化マグネシウムは 1.2 ＋ 0.8 ＝ 2.0 g です。マグネシウム：酸化マグネシウム ＝ 3：5 と考えてもかまいません。',
        hint: '3：2 の比から、結びつく酸素を先に求めよう。',
      }),
      fill({
        id: 'chem-4-r2', concept: 'ch-conservation',
        prompt: '空らんに入る数を入れよう。銅と酸素は 4：1 の質量の比で結びつきます。',
        text: '酸化銅 4.0 g の中には、銅が[b1]ふくまれている。',
        blanks: [number('b1', 3.2, 0.05, 'g')],
        explanation: '銅：酸素 ＝ 4：1 なので、銅：酸化銅 ＝ 4：5 です。酸化銅 4.0 g の中の銅は 4.0 × 4 ÷ 5 ＝ 3.2 g です。酸素は残りの 0.8 g です。',
        hint: '銅と酸化銅の質量の比は 4：5 だよ。',
      }),
      choice({
        id: 'chem-4-r3', concept: 'ch-conservation',
        prompt: 'ふたのない容器で、うすい塩酸と炭酸水素ナトリウムを反応させました。反応後の容器全体の質量は、反応前と比べてどうなる？',
        options: ['小さくなる', '大きくなる', '変わらない'],
        answer: 'a',
        explanation: 'ふたがないと、できた二酸化炭素が空気中へ出ていくので、その分だけ質量が小さくなります。出ていった気体もふくめて考えれば、質量保存の法則は成り立っています。',
        hint: '発生した気体は、どこへ行くかな。',
      }),
      fill({
        id: 'chem-4-r4', concept: 'ch-conservation',
        prompt: 'グラフは、銅の質量と、できた酸化銅の質量の関係です。グラフから考えて、空らんに入る数を入れよう。',
        text: '銅 0.6 g と結びついた酸素の質量は[b1]である。',
        figure: scene(copperGraphItems()),
        blanks: [number('b1', 0.15, 0.01, 'g')],
        explanation: 'グラフから、銅 0.6 g のときの酸化銅は 0.75 g と読めます。結びついた酸素は 0.75 − 0.6 ＝ 0.15 g です。銅：酸素 ＝ 0.6：0.15 ＝ 4：1 になっています。',
        hint: '酸化銅の質量から、もとの銅の質量を引こう。',
      }),
      choice({
        id: 'chem-4-t2', concept: 'ch-conservation', term: true,
        prompt: '次の説明に合う言葉はどれ？「化学変化のときにまわりから熱を吸収し、温度が下がる反応」',
        options: ['吸熱反応', '発熱反応', '燃焼'],
        answer: 'a',
        explanation: 'まわりから熱を吸収して温度が下がる反応を**吸熱反応**といいます。水酸化バリウムと塩化アンモニウムの反応が例です。熱を出して温度が上がる反応は発熱反応です。',
        hint: '熱を「吸う」反応だね。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'ch-decomposition', title: '分解（熱分解・電気分解）', basic: null, lessonStageId: 'chem-1',
      checkPool: [
        choice({
          id: 'ch-decomposition-k1', concept: 'ch-decomposition',
          prompt: '化学変化と状態変化のちがいとして、正しいものはどれ？',
          options: ['化学変化では、もとの物質とは別の物質ができる', '状態変化では、別の物質ができる', '化学変化では、物質のすがただけが変わる'],
          answer: 'a',
          explanation: '化学変化では、もとの物質とは別の物質ができます。状態変化は、固体・液体・気体とすがたが変わるだけで、物質そのものは変わりません。',
          hint: '氷がとけて水になるのは、どちらの変化かな。',
        }),
        choice({
          id: 'ch-decomposition-k2', concept: 'ch-decomposition',
          prompt: '水を電気分解したとき、陽極（＋極側）に集まった気体に火のついた線香を入れると、どうなる？',
          options: ['炎を上げて激しく燃える', 'ポンと音を立てて気体が燃える', '火が消える'],
          answer: 'a',
          explanation: '陽極には酸素が発生します。酸素にはものを燃やすはたらきがあるので、線香は炎を上げて燃えます。ポンと音を立てて燃えるのは、陰極に発生する水素です。',
          hint: '陽極にできる気体は何だったかな。',
        }),
        fill({
          id: 'ch-decomposition-k3', concept: 'ch-decomposition',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '炭酸水素ナトリウムを加熱すると、[b1]・水・[b2]に分解する。',
          blanks: [
            word('b1', ['炭酸ナトリウム', '塩化ナトリウム', '水酸化ナトリウム'], '炭酸ナトリウム'),
            word('b2', ['二酸化炭素', '酸素', '水素'], '二酸化炭素'),
          ],
          explanation: '炭酸水素ナトリウムは、加熱すると炭酸ナトリウム・水・二酸化炭素の 3 つの物質に分解します。二酸化炭素は石灰水を白くにごらせます。',
          hint: '石灰水を白くにごらせた気体と、残った白い固体を思い出そう。',
        }),
      ],
    },
    {
      id: 'ch-atom', title: '原子と元素記号', basic: null, lessonStageId: 'chem-2',
      checkPool: [
        choice({
          id: 'ch-atom-k1', concept: 'ch-atom',
          prompt: '元素記号 Mg は、何の元素？',
          options: ['マグネシウム', 'マンガン', '銀'],
          answer: 'a',
          explanation: 'Mg はマグネシウムです。銀は Ag で表します。マグネシウムは燃やすと強い光を出す金属です。',
          hint: 'M で始まる金属だよ。',
        }),
        choice({
          id: 'ch-atom-k2', concept: 'ch-atom',
          prompt: '塩素の元素記号の書き方として、正しいものはどれ？',
          options: ['Cl', 'CL', 'cl'],
          answer: 'a',
          explanation: '2 文字の元素記号は、1 文字目を大文字、2 文字目を小文字で書きます。塩素は Cl です。',
          hint: '2 文字目は大文字かな、小文字かな。',
        }),
        fill({
          id: 'ch-atom-k3', concept: 'ch-atom',
          prompt: '空らんに入る元素記号を選ぼう。',
          text: '酸素の元素記号は[b1]、炭素の元素記号は[b2]である。',
          blanks: [
            word('b1', ['O', 'S', 'N'], 'O'),
            word('b2', ['C', 'Ca', 'Cu'], 'C'),
          ],
          explanation: '酸素は O、炭素は C です。S は硫黄、N は窒素、Ca はカルシウム、Cu は銅です。',
          hint: 'どちらも 1 文字の元素記号だよ。',
        }),
      ],
    },
    {
      id: 'ch-formula', title: '分子と化学式・単体と化合物', basic: 'ch-atom', lessonStageId: 'chem-2',
      checkPool: [
        choice({
          id: 'ch-formula-k1', concept: 'ch-formula',
          prompt: '化学式 H₂O の「2」は、何を表している？',
          options: ['水素原子が 2 個あること', '水の分子が 2 個あること', '酸素原子が 2 個あること'],
          answer: 'a',
          explanation: '元素記号の右下の小さな数字は、その原子の数を表します。H₂O は、水素原子 2 個と酸素原子 1 個が結びついた水の分子です。',
          hint: '2 はどの元素記号の右下についているかな。',
        }),
        choice({
          id: 'ch-formula-k2', concept: 'ch-formula',
          prompt: '空気は、単体・化合物のどちらに分けられる？',
          options: ['どちらでもない（混合物）', '単体', '化合物'],
          answer: 'a',
          explanation: '空気は、窒素や酸素などの物質が混ざった混合物です。単体や化合物は 1 種類の物質（純粋な物質）を分ける言葉なので、混合物はどちらにも入りません。',
          hint: '空気には、何種類の物質が混ざっているかな。',
        }),
        choice({
          id: 'ch-formula-k3', concept: 'ch-formula',
          prompt: '化学式 NH₃ で表される物質はどれ？',
          options: ['アンモニア', '窒素', '水素'],
          answer: 'a',
          explanation: 'NH₃ は、窒素原子 1 個と水素原子 3 個が結びついたアンモニアの分子です。窒素は N₂、水素は H₂ で表します。',
          hint: 'N（窒素）と H（水素）の 2 種類の元素でできた物質だよ。',
        }),
      ],
    },
    {
      id: 'ch-equation', title: '化学反応式と物質が結びつく変化', basic: 'ch-formula', lessonStageId: 'chem-3',
      checkPool: [
        choice({
          id: 'ch-equation-k1', concept: 'ch-equation',
          prompt: '化学反応式 2H₂O → 2H₂ ＋ O₂ は、どの化学変化を表している？',
          options: ['水の電気分解', '水素の燃焼', '炭酸水素ナトリウムの熱分解'],
          answer: 'a',
          explanation: '水 H₂O が、水素 H₂ と酸素 O₂ に分かれる化学変化なので、水の電気分解です。水素の燃焼は、矢印の向きが反対の 2H₂ ＋ O₂ → 2H₂O です。',
          hint: '矢印の左が反応前、右が反応後だよ。',
        }),
        fill({
          id: 'ch-equation-k2', concept: 'ch-equation',
          prompt: '空らんに入る化学式を選ぼう。',
          text: '炭素の燃焼: C ＋ O₂ → [b1]',
          blanks: [word('b1', ['CO₂', 'CO', '2CO₂'], 'CO₂')],
          explanation: '炭素が燃えると二酸化炭素 CO₂ ができます。左右とも C が 1 個、O が 2 個でそろっています。',
          hint: '左の C と O の数を数えよう。',
        }),
        choice({
          id: 'ch-equation-k3', concept: 'ch-equation',
          prompt: '化学反応式の「2H₂O」の、前についた「2」は何を表している？',
          options: ['水の分子が 2 個あること', '水素原子が 2 個あること', '酸素原子が 2 個あること'],
          answer: 'a',
          explanation: '化学式の前の数字（係数）は、その分子の数を表します。2H₂O は水の分子 2 個なので、水素原子は 4 個、酸素原子は 2 個です。',
          hint: '化学式の前の数字と、右下の数字のちがいを考えよう。',
        }),
      ],
    },
    {
      id: 'ch-oxidation', title: '酸化・燃焼・還元', basic: 'ch-equation', lessonStageId: 'chem-3',
      checkPool: [
        choice({
          id: 'ch-oxidation-k1', concept: 'ch-oxidation',
          prompt: '「還元」の説明として正しいものはどれ？',
          options: ['酸化物から酸素をとり除く化学変化', '物質が酸素と結びつく化学変化', '物質が 2 種類以上の物質に分かれる化学変化'],
          answer: 'a',
          explanation: '還元は、酸化物から酸素をとり除く化学変化です。酸化銅と炭素を加熱すると、酸化銅は還元されて銅になります。',
          hint: '酸化銅が銅にもどる変化だよ。',
        }),
        choice({
          id: 'ch-oxidation-k2', concept: 'ch-oxidation',
          prompt: 'マグネシウムを燃焼させると、何ができる？',
          options: ['白色の酸化マグネシウム', '黒色の酸化銅', '赤色の銅'],
          answer: 'a',
          explanation: 'マグネシウムは強い光と熱を出して燃え、酸素と結びついて白色の酸化マグネシウムになります（2Mg ＋ O₂ → 2MgO）。',
          hint: 'マグネシウムと酸素が結びつくよ。',
        }),
        choice({
          id: 'ch-oxidation-k3', concept: 'ch-oxidation',
          prompt: 'エタノールを燃やしたときにできる物質はどれ？',
          options: ['二酸化炭素と水', '酸素と水素', '銅と二酸化炭素'],
          answer: 'a',
          explanation: 'エタノールは炭素と水素をふくむ有機物です。燃やすと、炭素が酸化されて二酸化炭素、水素が酸化されて水ができます。',
          hint: 'エタノールにふくまれる炭素と水素が、それぞれ酸素と結びつくよ。',
        }),
      ],
    },
    {
      id: 'ch-conservation', title: '質量保存の法則と質量の比（反応と熱をふくむ）', basic: 'ch-oxidation', lessonStageId: 'chem-4',
      checkPool: [
        fill({
          id: 'ch-conservation-k1', concept: 'ch-conservation',
          prompt: '空らんに入る数を入れよう。銅と酸素は 4：1 の質量の比で結びつきます。',
          text: '銅 0.8 g と結びつく酸素は[b1]である。',
          blanks: [number('b1', 0.2, 0.02, 'g')],
          explanation: '銅：酸素 ＝ 4：1 なので、酸素は銅の 4 分の 1 です。0.8 ÷ 4 ＝ 0.2 g です。',
          hint: '酸素の質量は、銅の質量の何分の 1 かな。',
        }),
        choice({
          id: 'ch-conservation-k2', concept: 'ch-conservation',
          prompt: '化学変化の前後で物質全体の質量が変わらないのは、なぜ？',
          options: ['原子の組み合わせは変わるが、原子の種類と数は変わらないから', '原子がすべて別の原子に変わるから', '化学変化では物質が変化しないから'],
          answer: 'a',
          explanation: '化学変化では原子の組み合わせが変わるだけで、原子の種類と数は変わりません。原子の質量は種類ごとに決まっているので、全体の質量も変わりません。',
          hint: '原子の性質を思い出そう。',
        }),
        fill({
          id: 'ch-conservation-k3', concept: 'ch-conservation',
          prompt: '空らんに入る数を入れよう。マグネシウムと酸素は 3：2 の質量の比で結びつきます。',
          text: 'マグネシウム 0.6 g と結びつく酸素は[b1]である。',
          blanks: [number('b1', 0.4, 0.02, 'g')],
          explanation: 'マグネシウム：酸素 ＝ 3：2 なので、酸素は 0.6 × 2 ÷ 3 ＝ 0.4 g です。',
          hint: '0.6 を 3 等分して、その 2 つ分を考えよう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'chemical-change',
    title: '化学変化と原子・分子',
    mascot: 'C',   // 担当の先生（ぷにカプセル。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'atom', title: '物質のなりたち', order: 1, stages: [chem1, chem2] },
      { id: 'reaction', title: '化学変化と質量', order: 2, stages: [chem3, chem4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
