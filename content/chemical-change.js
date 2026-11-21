// 「化学変化と原子・分子」教材データ（中学2年 理科・化学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（物質のなりたち: 分解・原子と分子 / 化学変化と質量: 化学反応式と酸化・還元・質量保存）と、概念 6 つ。
// 領域 3「ミニプリント」（10 ステージ）は、先生のミニプリントの問題を書き直したもの（.ai-tasks/20261106-130000_ミニプリント反映_共通.md）。
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
  // 領域 3: ミニプリント（先生のミニプリントの問題を書き直したもの。.ai-tasks/20261106-130000_ミニプリント反映_共通.md）
  // プリントの順は学ぶ順（分解 → 原子・分子 → 化学反応式 → 化合・酸化 → 還元・熱 → 質量保存 → 質量の比）
  // ================================================================

  // ---- ミニプリント用の図 ----

  // 分子のモデル（中心 (x, y)）
  function molH2(x, y) { return [atom(x - 12, y, 'H', 12), atom(x + 12, y, 'H', 12)]; }
  function molO2(x, y) { return [atom(x - 14, y, 'O', 14), atom(x + 14, y, 'O', 14)]; }
  function molH2O(x, y) { return [atom(x - 22, y + 14, 'H', 12), atom(x + 22, y + 14, 'H', 12), atom(x, y, 'O', 14)]; }
  function molCO2(x, y) { return [atom(x - 28, y, 'O', 14), atom(x + 28, y, 'O', 14), atom(x, y, 'C', 14)]; }
  function molNH3(x, y) { return [atom(x - 24, y + 12, 'H', 12), atom(x + 24, y + 12, 'H', 12), atom(x, y - 26, 'H', 12), atom(x, y, 'N', 14)]; }

  // 水の電気分解の装置で、電流を流す前（気体がない）
  const ELECTRO_EMPTY_Q = scene(electrolysisScene().items.filter(it => it.fill !== 'white').concat([
    { type: 'text', x: 153, y: 30, text: '電流を流す前', size: 12, anchor: 'middle' },
    { type: 'region', id: 'r1', x: 88, y: 70, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 218, y: 70, r: 22, label: 'イ' },
  ]));

  // 2 本の試験管（中心 x 110・210、底 y 190）。加熱前と加熱後の物質の水溶液
  function twoTubeItems(cA, cB, nameA, nameB, caption) {
    return [
      { type: 'tube', x: 110, y: 190, height: 120, level: 0.6, liquid: cA },
      { type: 'tube', x: 210, y: 190, height: 120, level: 0.6, liquid: cB },
      { type: 'text', x: 110, y: 214, text: nameA, size: 12, anchor: 'middle' },
      { type: 'text', x: 210, y: 214, text: nameB, size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 236, text: caption, size: 12, anchor: 'middle' },
    ];
  }
  const PHENOL_Q = scene(twoTubeItems('water', 'water', '加熱前の物質', '加熱後の物質', '水にとかしてフェノールフタレイン液を加える').concat([
    { type: 'region', id: 'r1', x: 110, y: 140, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 210, y: 140, r: 22, label: 'イ' },
  ]));

  // 元素記号の書き方を選ぶ図（左から MG・Mg・mg・mG）
  const SYMBOL_Q = scene([
    { type: 'text', x: 160, y: 30, text: 'マグネシウムの元素記号', size: 13, anchor: 'middle' },
    ...['MG', 'Mg', 'mg', 'mG'].flatMap((t, i) => [
      { type: 'rect', x: 16 + i * 76, y: 60, width: 60, height: 60, rx: 6, fill: 'white' },
      { type: 'text', x: 46 + i * 76, y: 100, text: t, size: 22, anchor: 'middle', bold: true },
    ]),
    { type: 'region', id: 'r1', x: 46, y: 170, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 122, y: 170, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 198, y: 170, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 274, y: 170, r: 22, label: 'エ' },
  ]);

  // 分子のモデル 4 つ（ア 酸素、イ 水、ウ 二酸化炭素、エ アンモニア）
  const MOLECULE_Q = scene([
    ...molO2(40, 100), ...molH2O(112, 100), ...molCO2(196, 100), ...molNH3(278, 104),
    { type: 'region', id: 'r1', x: 40, y: 180, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 112, y: 180, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 196, y: 180, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 278, y: 180, r: 22, label: 'エ' },
    { type: 'text', x: 160, y: 230, text: '丸の中の記号は原子の種類', size: 12, anchor: 'middle' },
  ]);

  // 水素と酸素が反応したあとのモデルを選ぶ図（ア 水の分子 2 個、イ 水の分子 1 個と酸素原子 1 個、ウ 水の分子 1 個と水素分子 1 個）
  const EQUATION_MODEL_Q = scene([
    ...molH2(30, 40), ...molH2(84, 40),
    { type: 'text', x: 124, y: 46, text: '＋', size: 16, anchor: 'middle' },
    ...molO2(166, 40),
    { type: 'text', x: 214, y: 46, text: '→', size: 16, anchor: 'middle' },
    { type: 'text', x: 248, y: 48, text: '？', size: 18, anchor: 'middle', bold: true },
    { type: 'rect', x: 6, y: 78, width: 96, height: 112, rx: 6, fill: 'white', stroke: 'line' },
    { type: 'rect', x: 112, y: 78, width: 96, height: 112, rx: 6, fill: 'white', stroke: 'line' },
    { type: 'rect', x: 218, y: 78, width: 96, height: 112, rx: 6, fill: 'white', stroke: 'line' },
    ...molH2O(54, 104), ...molH2O(54, 152),
    ...molH2O(160, 104), atom(160, 160, 'O', 14),
    ...molH2O(266, 104), ...molH2(266, 162),
    { type: 'region', id: 'r1', x: 54, y: 214, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 214, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 266, y: 214, r: 22, label: 'ウ' },
  ]);

  // 鉄と硫黄の混合物（加熱前）と、加熱後の物質に、うすい塩酸を加えた試験管
  function fesTubeItems() {
    return [
      { type: 'tube', x: 110, y: 190, height: 120, level: 0.45, liquid: '#C9C29A' },
      { type: 'tube', x: 210, y: 190, height: 120, level: 0.45, liquid: '#4A4A4A' },
      ...[[106, 160], [114, 150], [108, 140], [206, 160], [214, 150], [208, 140]].map(([x, y]) => ({ type: 'circle', x, y, r: 3, fill: 'white', stroke: 'line' })),
      { type: 'text', x: 110, y: 214, text: '加熱前の混合物', size: 12, anchor: 'middle' },
      { type: 'text', x: 210, y: 214, text: '加熱後の物質', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 236, text: 'それぞれにうすい塩酸を加える', size: 12, anchor: 'middle' },
    ];
  }
  const FES_Q = scene(fesTubeItems().concat([
    { type: 'region', id: 'r1', x: 110, y: 110, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 210, y: 110, r: 22, label: 'イ' },
  ]));

  // スチールウールの写真（chemical-change-mp7-p1）: 左の皿 (5〜155, 40〜170。中心 (80, 100)) に燃やす前の銀色のスチールウール、
  // 右の皿 (162〜315, 40〜170。中心 (238, 105)) に燃やした後の黒っぽくくずれたもの。下は白い余白
  const STEEL_Q = scene([
    photo('chemical-change-mp7-p1'),
    tag(80, 190, '燃やす前', { size: 13 }),
    tag(238, 190, '燃やした後', { size: 13 }),
    { type: 'region', id: 'r1', x: 80, y: 218, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 238, y: 218, r: 22, label: 'イ' },
  ]);

  // 反応と温度の実験（左 ア: 鉄粉＋活性炭＋食塩水、右 イ: 水酸化バリウム＋塩化アンモニウム）
  function heatBeakerItems() {
    return [
      { type: 'text', x: 90, y: 50, text: '鉄粉＋活性炭', size: 12, anchor: 'middle' },
      { type: 'text', x: 90, y: 68, text: '＋食塩水', size: 12, anchor: 'middle' },
      { type: 'text', x: 230, y: 50, text: '水酸化バリウム', size: 12, anchor: 'middle' },
      { type: 'text', x: 230, y: 68, text: '＋塩化アンモニウム', size: 12, anchor: 'middle' },
      { type: 'beaker', x: 90, y: 200, width: 90, height: 90, level: 0.3, liquid: 'rock' },
      { type: 'beaker', x: 230, y: 200, width: 90, height: 90, level: 0.3, liquid: 'glass' },
      { type: 'line', points: [[110, 86], [110, 188]], color: 'red', width: 3 },
      { type: 'circle', x: 110, y: 192, r: 5, fill: 'red', stroke: 'none' },
      { type: 'line', points: [[250, 86], [250, 188]], color: 'red', width: 3 },
      { type: 'circle', x: 250, y: 192, r: 5, fill: 'red', stroke: 'none' },
    ];
  }
  const HEAT_Q = scene(heatBeakerItems().concat([
    { type: 'text', x: 160, y: 232, text: '混ぜたあと、温度計の目もりを見る', size: 12, anchor: 'middle' },
    { type: 'region', id: 'r1', x: 70, y: 160, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 210, y: 160, r: 22, label: 'イ' },
  ]));

  // 銅の質量と酸化銅の質量の関係のグラフの形を選ぶ図（ア 曲線、イ 原点を通る直線、ウ 横に平らな線）
  const GRAPH_SHAPE_Q = scene([
    ...[20, 120, 220].flatMap(x0 => [{ type: 'line', points: [[x0, 70], [x0, 190], [x0 + 80, 190]], width: 2 }]),
    { type: 'line', points: [[20, 190], [40, 130], [60, 104], [80, 92], [96, 88]], color: 'blue', width: 3 },
    { type: 'line', points: [[120, 190], [196, 82]], color: 'blue', width: 3 },
    { type: 'line', points: [[220, 120], [296, 120]], color: 'blue', width: 3 },
    { type: 'region', id: 'r1', x: 60, y: 44, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 44, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 260, y: 44, r: 22, label: 'ウ' },
    { type: 'text', x: 160, y: 214, text: '横軸: 銅の質量　縦軸: 酸化銅の質量', size: 12, anchor: 'middle' },
  ]);

  // 金属と酸素の質量の比のテープ図（灰: 金属、水色: 酸素）。上から ア 3：2、イ 4：1、ウ 1：4、エ 2：3
  function tapeItems(rows) {
    const items = [];
    rows.forEach(([metal, oxygen, y]) => {
      for (let i = 0; i < metal + oxygen; i++) {
        items.push({ type: 'rect', x: 70 + i * 30, y, width: 30, height: 28, fill: i < metal ? 'rock' : 'sky' });
      }
    });
    return items;
  }
  const TAPE_Q = scene(tapeItems([[3, 2, 30], [4, 1, 80], [1, 4, 130], [2, 3, 180]]).concat([
    { type: 'region', id: 'r1', x: 36, y: 44, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 36, y: 94, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 36, y: 144, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 36, y: 194, r: 22, label: 'エ' },
    { type: 'text', x: 316, y: 236, text: '灰色: 金属　水色: 酸素', size: 12, anchor: 'end' },
  ]));

  // ---- ステージ chemical-change-mp1: 水の電気分解と炭酸水素ナトリウム（ミニプリント「水の電気分解①」「炭酸水素ナトリウム⓪・①」） ----
  const chemMp1 = {
    id: 'chemical-change-mp1', areaId: 'atom', free: true, title: 'プリント 1: 水の電気分解と熱分解の実験', minutes: 5, concepts: ['ch-decomposition'],
    lessons: [
      {
        id: 'chemical-change-mp1-c1',
        text: '水に少量の**水酸化ナトリウム**をとかすと電流が流れやすくなります。電流を流すと、**陰極**に水素、**陽極**に酸素が集まり、体積は水素が酸素の約 2 倍です。電流を流して物質を分解することを**電気分解**といいます。',
        // 写真（chem-1-c4 の画像）: H 字形の管の水の電気分解。左の管 (118〜138) は黒い導線で電源の−極、気体 25〜62。
        // 右の管 (182〜202) は赤い導線で＋極、気体 25〜45。電極は管の下 (110〜140)。左右は白い余白
        figure: scene([
          photo('chem-1-c4'),
          pointer(78, 42, 122, 42), tag(58, 47, '水素', { size: 16, bold: true }),
          pointer(242, 36, 198, 36), tag(262, 41, '酸素', { size: 16, bold: true }),
          pointer(98, 124, 124, 124), tag(58, 129, '陰極'),
          tag(58, 147, '（電源の−極）', { size: 13 }),
          pointer(222, 124, 196, 124), tag(262, 129, '陽極'),
          tag(262, 147, '（電源の＋極）', { size: 13 }),
          tag(56, 182, '体積の比', { size: 13 }),
          tag(56, 200, '水素：酸素', { size: 13 }),
          tag(56, 224, '2：1', { size: 16, bold: true }),
          pointer(224, 176, 198, 96),
          tag(264, 190, '水酸化ナトリウム', { size: 13 }),
          tag(264, 208, 'をとかした水', { size: 13 }),
        ]),
      },
      {
        id: 'chemical-change-mp1-c2',
        text: '白い**炭酸水素ナトリウム**を加熱するときは、試験管の口を少し下げます。できた水が加熱部分に流れて試験管が割れるのを防ぐためです。火を消す前には、ガラス管を石灰水から出して、石灰水の**逆流**を防ぎます。',
        // 写真（chem-1-c2 の画像）: 試験管の底の粉 (45〜100, 72〜92)、ゴム栓 (155〜172, 88〜105)、炎 (45〜60, 85〜118)、
        // 石灰水の試験管 (246, 140〜192)。下は白い余白
        figure: scene([
          photo('chem-1-c2'),
          pointer(72, 37, 60, 82), tag(80, 30, '炭酸水素ナトリウム'),
          pointer(206, 54, 168, 91), tag(240, 30, '口を少し下げる'),
          tag(240, 48, '（割れるのを防ぐ）', { size: 13 }),
          pointer(30, 122, 47, 106), tag(22, 136, '加熱'),
          pointer(204, 154, 242, 172), tag(184, 150, '石灰水'),
          tag(160, 220, '火を消す前にガラス管を石灰水から出す', { size: 13 }),
          tag(160, 238, '（石灰水の逆流を防ぐ）', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp1-w1', concept: 'ch-decomposition',
      prompt: '予想しよう。水に電流を流すと、何が起こると思う？',
      options: ['電極から気体が出てくる', '水がこおる', '何も起こらない'],
      answer: 'a',
      explanation: '水に電流を流すと、水が分解されて、それぞれの電極から気体が出てきます。電気分解と熱分解の実験の手順を復習しよう。',
      hint: '電極のまわりに、あわが見えるよ。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp1-p1', concept: 'ch-decomposition',
        prompt: '水を電気分解する装置です。左の電極は電源の−極（陰極）、右の電極は＋極（陽極）につないであります。電流を流したとき、気体が多く集まるのはア・イのどちら？',
        figure: ELECTRO_EMPTY_Q,
        answer: 'r1',
        explanation: '陰極（ア）には水素、陽極（イ）には酸素が集まります。体積は水素：酸素 ＝ 2：1 なので、陰極側に多く集まります。',
        hint: '水素と酸素の体積の比を思い出そう。',
      }),
      fill({
        id: 'chemical-change-mp1-t1', concept: 'ch-decomposition', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '電流を流して物質を分解することを[b1]という。水の[b1]では、陰極に[b2]、陽極に[b3]が発生する。',
        blanks: [
          word('b1', ['電気分解', '熱分解', '状態変化'], '電気分解'),
          word('b2', ['水素', '酸素', '二酸化炭素'], '水素'),
          word('b3', ['水素', '酸素', '二酸化炭素'], '酸素'),
        ],
        explanation: '電流による分解を**電気分解**といいます。水の電気分解では、陰極に水素、陽極に酸素が発生します。',
        hint: '陰極は電源の−極につないだほうだよ。',
      }),
      fill({
        id: 'chemical-change-mp1-p2', concept: 'ch-decomposition',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '水の電気分解では、水に少量の[b1]をとかして、[b2]を流れやすくする。',
        blanks: [
          word('b1', ['水酸化ナトリウム', '塩化コバルト', '石灰水'], '水酸化ナトリウム'),
          word('b2', ['電流', '気体', '熱'], '電流'),
        ],
        explanation: '純粋な水は電流がほとんど流れないので、水酸化ナトリウムをとかして電流を流れやすくします。水酸化ナトリウムは手につかないように注意します。',
        hint: '純粋な水は、電流を通しにくいよ。',
      }),
      choice({
        id: 'chemical-change-mp1-p3', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムを加熱している間、試験管の中や石灰水ではどんなようすが見られる？',
        options: ['試験管の口の近くに液体がつき、気体が出て石灰水が白くにごる', '粉が黒くなるが、気体は出ない', '粉がとけて青い液体になる'],
        answer: 'a',
        explanation: '炭酸水素ナトリウムを加熱すると、水（口の近くにつく液体）と二酸化炭素（石灰水を白くにごらせる）が出て、白い炭酸ナトリウムが残ります。',
        hint: '加熱で 3 つの物質に分かれたね。',
      }),
      choice({
        id: 'chemical-change-mp1-p4', concept: 'ch-decomposition',
        prompt: '固体の炭酸水素ナトリウムを加熱するとき、試験管の口を少し下げるのはなぜ？',
        options: ['できた水が加熱部分に流れて、試験管が割れるのを防ぐため', '気体を早く出すため', '粉がこぼれないようにするため'],
        answer: 'a',
        explanation: '口の近くにできた水が、熱くなった底のほうへ流れると、急に冷えて試験管が割れることがあります。それを防ぐために口を少し下げます。',
        hint: '口の近くにたまった液体がどこへ流れるか考えよう。',
      }),
      choice({
        id: 'chemical-change-mp1-p5', concept: 'ch-decomposition',
        prompt: '加熱をやめるとき、火を消す前にガラス管を石灰水から出すのはなぜ？',
        options: ['石灰水が試験管に逆流して、試験管が割れるのを防ぐため', '石灰水のにごりを見やすくするため', '気体をたくさん集めるため'],
        answer: 'a',
        explanation: '火を消すと試験管の中の気体が冷えて縮み、石灰水が吸いこまれて熱い試験管に流れこむことがあります。先にガラス管を出しておけば逆流しません。',
        hint: '火を消すと、試験管の中の気体はどうなるかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-mp1-r1', concept: 'ch-decomposition',
        prompt: '加熱する前の炭酸水素ナトリウムは、何色の固体？',
        options: ['白色', '黒色', '赤茶色'],
        answer: 'a',
        explanation: '炭酸水素ナトリウムは白色の粉です。加熱後に残る炭酸ナトリウムも白色なので、色だけでは区別しにくい物質です。',
        hint: 'ベーキングパウダーにふくまれている粉だよ。',
      }),
      choice({
        id: 'chemical-change-mp1-r2', concept: 'ch-decomposition',
        prompt: '水を電気分解したとき、陰極に集まった気体にマッチの火を近づけるとどうなる？',
        options: ['ポンと音を立てて気体が燃える', '線香の火が激しく燃える', '石灰水が白くにごる'],
        answer: 'a',
        explanation: '陰極に集まるのは水素で、火を近づけるとポンと音を立てて燃えます。陽極に集まる酸素は、火のついた線香を激しく燃やします。',
        hint: '陰極に集まる気体は何だったかな。',
      }),
      fill({
        id: 'chemical-change-mp1-r3', concept: 'ch-decomposition',
        prompt: '空らんに入る数を入れよう。',
        text: '水を電気分解して陽極に酸素が 5 cm³ 集まったとき、陰極に集まった水素はおよそ[b1]である。',
        blanks: [number('b1', 10, 0, 'cm³')],
        explanation: '水素：酸素 ＝ 2：1 なので、水素は 5 × 2 ＝ 10 cm³ です。',
        hint: '水素は酸素の約 2 倍の体積だよ。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp2: 熱分解でできる物質（ミニプリント「炭酸水素ナトリウム②・③」） ----
  const chemMp2 = {
    id: 'chemical-change-mp2', areaId: 'atom', free: true, title: 'プリント 2: 熱分解でできる物質', minutes: 5, concepts: ['ch-decomposition'],
    lessons: [
      {
        id: 'chemical-change-mp2-c1',
        text: '炭酸水素ナトリウムを加熱すると、**炭酸ナトリウム**（白い固体）・**水**・**二酸化炭素**の 3 つの物質に分かれます。1 種類の物質が 2 種類以上の物質に分かれる化学変化を**分解**、加熱による分解を**熱分解**といいます。',
        // 写真（chem-1-c3 の画像）: 青い塩化コバルト紙 (12〜116, 82〜128)、赤色（桃色）になった紙 (131〜232, 82〜128)、
        // 白くにごった石灰水の試験管 (246〜302, 0〜165)。下は白い余白
        figure: scene([
          photo('chem-1-c3'),
          tag(122, 64, '塩化コバルト紙'),
          tag(64, 152, '青色'),
          { type: 'arrow', x1: 86, y1: 147, x2: 134, y2: 147, color: 'ink', width: 2 },
          tag(182, 152, '赤色（桃色）'),
          tag(122, 176, '→ 水ができた', { size: 13, bold: true }),
          tag(274, 182, '白くにごる', { size: 13 }),
          tag(274, 199, '→ 二酸化炭素', { size: 13, bold: true }),
          tag(160, 220, '炭酸水素ナトリウム → 炭酸ナトリウム＋水＋二酸化炭素', { size: 13 }),
          tag(160, 238, '1 種類 → 3 種類（分解）', { size: 13, bold: true }),
        ]),
      },
      {
        id: 'chemical-change-mp2-c2',
        text: '加熱前と加熱後の固体を水にとかし、**フェノールフタレイン液**を加えると、炭酸水素ナトリウムはうすい赤色、炭酸ナトリウムは濃い赤色になります。炭酸ナトリウムのほうが水によくとけ、強いアルカリ性を示します。',
        // 写真: 試験管立て (28〜292, 48〜175) に試験管 2 本。左 (x 131) はうすい赤色で底 (131, 152) に白い粉がとけ残り、
        // 右 (x 186) は濃い赤むらさき。下は白い余白
        figure: scene([
          photo('chemical-change-mp2-c2'),
          pointer(92, 134, 124, 152), tag(70, 130, 'とけ残り', { size: 13 }),
          tag(80, 184, '加熱前の物質', { size: 13, bold: true }),
          tag(80, 201, '炭酸水素ナトリウム', { size: 13 }),
          tag(80, 218, '→ うすい赤色', { size: 13 }),
          tag(240, 184, '加熱後の物質', { size: 13, bold: true }),
          tag(240, 201, '炭酸ナトリウム', { size: 13 }),
          tag(240, 218, '→ 濃い赤色', { size: 13 }),
          tag(160, 236, '水にとかしフェノールフタレイン液を加えた', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp2-w1', concept: 'ch-decomposition',
      prompt: '予想しよう。炭酸水素ナトリウムを加熱したあとに残る白い固体は、もとと同じ物質だと思う？',
      options: ['別の物質になっている', 'もとと同じ物質', '何も残らない'],
      answer: 'a',
      explanation: '加熱後に残る白い固体は、炭酸ナトリウムという別の物質です。できた物質の調べ方を復習しよう。',
      hint: '加熱で気体や水が出ていったね。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp2-p1', concept: 'ch-decomposition',
        prompt: '加熱前の炭酸水素ナトリウム（ア）と、加熱後に残った固体（イ）を、同じ量の水にとかしてフェノールフタレイン液を加えました。濃い赤色になるのはどちら？',
        figure: PHENOL_Q,
        answer: 'r2',
        explanation: '加熱後に残った炭酸ナトリウム（イ）は、水によくとけて強いアルカリ性を示すので、濃い赤色になります。炭酸水素ナトリウム（ア）はうすい赤色です。',
        hint: '強いアルカリ性を示すのは、加熱前と後のどちらかな。',
      }),
      fill({
        id: 'chemical-change-mp2-t1', concept: 'ch-decomposition', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '炭酸水素ナトリウムを加熱したあとに残る白い固体は[b1]で、発生する気体は[b2]である。',
        blanks: [
          word('b1', ['炭酸ナトリウム', '塩化ナトリウム', '水酸化ナトリウム'], '炭酸ナトリウム'),
          word('b2', ['二酸化炭素', '酸素', '水素'], '二酸化炭素'),
        ],
        explanation: '残る固体は**炭酸ナトリウム**、発生する気体は**二酸化炭素**です。ほかに水もできます。',
        hint: 'もとの名前から「水素」がとれた名前だよ。',
      }),
      choice({
        id: 'chemical-change-mp2-p2', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムは、加熱によっていくつの物質に分かれた？',
        options: ['3 つ', '2 つ', '4 つ'],
        answer: 'a',
        explanation: '炭酸ナトリウム・水・二酸化炭素の 3 つの物質に分かれました。1 種類の物質が 2 種類以上に分かれるので、分解です。',
        hint: '固体・液体・気体が 1 つずつできたね。',
      }),
      choice({
        id: 'chemical-change-mp2-p3', concept: 'ch-decomposition',
        prompt: '試験管の口の近くにたまった少量の液体が水であることは、どうすれば確かめられる？',
        options: ['青色の塩化コバルト紙をつけると、赤色（桃色）に変わる', '石灰水を加えると、白くにごる', 'フェノールフタレイン液を加えると、濃い赤色になる'],
        answer: 'a',
        explanation: '塩化コバルト紙は、水にふれると青色から赤色（桃色）に変わります。石灰水は二酸化炭素を調べる薬品です。',
        hint: '水を調べるための紙があったね。',
      }),
      choice({
        id: 'chemical-change-mp2-p4', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムの加熱で出てきた気体を石灰水に通すと、白くにごりました。この気体は何？',
        options: ['二酸化炭素', '酸素', '水素', 'アンモニア'],
        answer: 'a',
        explanation: '石灰水を白くにごらせるのは二酸化炭素です。',
        hint: '石灰水は、何を調べる薬品だったかな。',
      }),
      choice({
        id: 'chemical-change-mp2-p5', concept: 'ch-decomposition',
        prompt: '加熱後に試験管に残った固体の色はどれ？',
        options: ['白色', '黒色', '赤茶色'],
        answer: 'a',
        explanation: '残った炭酸ナトリウムは白色です。色は加熱前と同じ白色ですが、水へのとけ方やフェノールフタレイン液の色で、別の物質だと分かります。',
        hint: '見た目は加熱前とほとんど同じだよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-mp2-r1', concept: 'ch-decomposition',
        prompt: '加熱後に残った固体を水にとかし、フェノールフタレイン液を加えると何色になる？',
        options: ['濃い赤色', '無色のまま', '青色'],
        answer: 'a',
        explanation: '炭酸ナトリウムの水溶液は強いアルカリ性なので、フェノールフタレイン液で濃い赤色になります。',
        hint: 'フェノールフタレイン液は、アルカリ性で赤くなるよ。',
      }),
      figureChoice({
        id: 'chemical-change-mp2-r2', concept: 'ch-decomposition',
        prompt: '加熱前の炭酸水素ナトリウム（ア）と、加熱後に残った固体（イ）を、同じ量の水にとかしました。とけ残りが多く、フェノールフタレイン液でうすい赤色になるのはどちら？',
        figure: PHENOL_Q,
        answer: 'r1',
        explanation: '炭酸水素ナトリウム（ア）は水にとけにくく、水溶液は弱いアルカリ性なので、うすい赤色になります。',
        hint: '濃い赤色になったのは、加熱後の物質だったね。',
      }),
      choice({
        id: 'chemical-change-mp2-r3', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムを加熱したときの化学変化を何という？',
        options: ['熱分解', '酸化', '燃焼'],
        answer: 'a',
        explanation: '加熱によって 1 種類の物質が 2 種類以上の物質に分かれる化学変化なので、熱分解（分解）です。',
        hint: '熱で、物質が分かれたね。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp3: 原子と元素記号（ミニプリント「ドルトン　原子」「元素記号」「元素記号　物質名」） ----
  const chemMp3 = {
    id: 'chemical-change-mp3', areaId: 'atom', free: true, title: 'プリント 3: 原子と元素記号', minutes: 5, concepts: ['ch-atom'],
    lessons: [
      {
        id: 'chemical-change-mp3-c1',
        text: '物質をつくる最小の粒を**原子**といい、ドルトンが考えを発表しました。原子は、化学変化でそれ以上分けられず、種類ごとに質量や大きさが決まっていて、別の種類に変わったり、なくなったり、新しくできたりしません。',
        figure: scene([
          atom(60, 70, 'H', 18), atom(160, 70, 'O', 22), atom(260, 70, 'Cu', 26),
          { type: 'text', x: 60, y: 124, text: '水素原子', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 124, text: '酸素原子', size: 13, anchor: 'middle' },
          { type: 'text', x: 260, y: 124, text: '銅原子', size: 13, anchor: 'middle' },
          { type: 'text', x: 8, y: 164, text: '① それ以上分けられない', size: 13 },
          { type: 'text', x: 8, y: 188, text: '② 種類ごとに質量・大きさが決まっている', size: 13 },
          { type: 'text', x: 8, y: 212, text: '③ 消えない・変わらない・新しくできない', size: 13 },
        ]),
      },
      {
        id: 'chemical-change-mp3-c2',
        text: '原子の種類を**元素**といい、アルファベット 1 文字か 2 文字の**元素記号**で表します。2 文字のときは、1 文字目を大文字、2 文字目を小文字で書きます（例: Fe、Cu、Na、Mg）。',
        // 元素記号の表
        figure: scene([
          ['H', '水素'], ['C', '炭素'], ['N', '窒素'], ['O', '酸素'],
          ['Na', 'ナトリウム'], ['Mg', 'マグネシウム'], ['Al', 'アルミニウム'], ['S', '硫黄'],
          ['Cl', '塩素'], ['K', 'カリウム'], ['Ca', 'カルシウム'], ['Fe', '鉄'],
          ['Cu', '銅'], ['Zn', '亜鉛'], ['Ag', '銀'], ['Ba', 'バリウム'],
        ].flatMap(([sym, name], i) => {
          const x = 4 + (i % 4) * 78, y = 8 + Math.floor(i / 4) * 57;
          return [
            { type: 'rect', x, y, width: 76, height: 54, fill: 'white', stroke: 'line' },
            { type: 'text', x: x + 38, y: y + 26, text: sym, size: 18, anchor: 'middle', bold: true },
            { type: 'text', x: x + 38, y: y + 46, text: name, size: 12, anchor: 'middle' },
          ];
        })),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp3-w1', concept: 'ch-atom',
      prompt: '予想しよう。元素記号「Fe」は、何の元素だと思う？',
      options: ['鉄', 'フッ素', '銅'],
      answer: 'a',
      explanation: 'Fe は鉄の元素記号です。原子の性質と、よく使う元素記号を復習しよう。',
      hint: 'さびやすい、磁石につく金属だよ。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp3-p1', concept: 'ch-atom',
        prompt: 'マグネシウムの元素記号を 4 とおりに書きました。正しい書き方はア〜エのどれ？',
        figure: SYMBOL_Q,
        answer: 'r2',
        explanation: '2 文字の元素記号は、1 文字目を大文字、2 文字目を小文字で書くので、Mg（イ）が正しい書き方です。',
        hint: '1 文字目は大文字、2 文字目は小文字だよ。',
      }),
      fill({
        id: 'chemical-change-mp3-t1', concept: 'ch-atom', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質をつくっている、それ以上分けられない最小の粒を[b1]という。この考えを発表したのは[b2]である。',
        blanks: [
          word('b1', ['原子', '分子', '元素'], '原子'),
          word('b2', ['ドルトン', 'アボガドロ', 'メンデレーエフ'], 'ドルトン'),
        ],
        explanation: '最小の粒が**原子**で、イギリスのドルトンが原子の考えを発表しました。分子の考えはアボガドロ、周期表はメンデレーエフです。',
        hint: '分子の考えを発表した人とは別の人だよ。',
      }),
      fill({
        id: 'chemical-change-mp3-p2', concept: 'ch-atom',
        prompt: '原子の性質について、空らんに入る言葉を選ぼう。',
        text: '原子は、① 化学変化でそれ以上[b1]ことができない。② 種類によって[b2]や大きさが決まっている。③ 化学変化で別の種類の原子に変わったり、なくなったり、新しく[b3]しない。',
        blanks: [
          word('b1', ['分ける', '結びつく', 'とける'], '分ける'),
          word('b2', ['質量', '色', 'におい'], '質量'),
          word('b3', ['できたり', '結びついたり', 'とけたり'], 'できたり'),
        ],
        explanation: '原子は、それ以上分けることができず、種類ごとに質量や大きさが決まっていて、化学変化で変わったり、なくなったり、新しくできたりしません。',
        hint: '化学変化では、原子の組み合わせだけが変わるよ。',
      }),
      fill({
        id: 'chemical-change-mp3-p3', concept: 'ch-atom',
        prompt: '元素記号を選ぼう。',
        text: '水素は[b1]、鉄は[b2]、カリウムは[b3]、炭素は[b4]で表す。',
        blanks: [
          word('b1', ['H', 'He', 'Hy'], 'H'),
          word('b2', ['Fe', 'F', 'Te'], 'Fe'),
          word('b3', ['K', 'Ka', 'Ca'], 'K'),
          word('b4', ['C', 'Ca', 'Co'], 'C'),
        ],
        explanation: '水素 H、鉄 Fe、カリウム K、炭素 C です。カリウムは K、カルシウムは Ca なので、まちがえないようにしよう。',
        hint: 'カリウムは 1 文字の元素記号だよ。',
      }),
      fill({
        id: 'chemical-change-mp3-p4', concept: 'ch-atom',
        prompt: '元素記号が表す元素の名前を選ぼう。',
        text: 'K は[b1]、Ca は[b2]、Al は[b3]、Zn は[b4]である。',
        blanks: [
          word('b1', ['カリウム', 'カルシウム', '炭素'], 'カリウム'),
          word('b2', ['カリウム', 'カルシウム', '塩素'], 'カルシウム'),
          word('b3', ['アルミニウム', '銀', '塩素'], 'アルミニウム'),
          word('b4', ['亜鉛', '窒素', '鉄'], '亜鉛'),
        ],
        explanation: 'K はカリウム、Ca はカルシウム、Al はアルミニウム、Zn は亜鉛です。',
        hint: 'Ca の 2 文字目に注目しよう。',
      }),
      fill({
        id: 'chemical-change-mp3-p5', concept: 'ch-atom',
        prompt: '元素記号を選ぼう。',
        text: '銀は[b1]、硫黄は[b2]、マグネシウムは[b3]、銅は[b4]で表す。',
        blanks: [
          word('b1', ['Ag', 'Au', 'Gi'], 'Ag'),
          word('b2', ['S', 'Si', 'Sn'], 'S'),
          word('b3', ['Mg', 'Mn', 'Ma'], 'Mg'),
          word('b4', ['Cu', 'Co', 'C'], 'Cu'),
        ],
        explanation: '銀 Ag、硫黄 S、マグネシウム Mg、銅 Cu です。元素記号はラテン語などの名前からつけられているので、日本語の名前と頭文字がちがうものもあります。',
        hint: '銀は A で始まる 2 文字だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'chemical-change-mp3-r1', concept: 'ch-atom',
        prompt: '元素記号を選ぼう。',
        text: 'ナトリウムは[b1]、酸素は[b2]、塩素は[b3]、窒素は[b4]で表す。',
        blanks: [
          word('b1', ['Na', 'N', 'Nt'], 'Na'),
          word('b2', ['O', 'Os', 'Ox'], 'O'),
          word('b3', ['Cl', 'CL', 'C'], 'Cl'),
          word('b4', ['N', 'Na', 'Ni'], 'N'),
        ],
        explanation: 'ナトリウム Na、酸素 O、塩素 Cl、窒素 N です。窒素 N とナトリウム Na を区別しよう。',
        hint: '窒素は 1 文字、ナトリウムは 2 文字だよ。',
      }),
      fill({
        id: 'chemical-change-mp3-r2', concept: 'ch-atom',
        prompt: '元素記号を選ぼう。',
        text: 'カルシウムは[b1]、アルミニウムは[b2]、亜鉛は[b3]、バリウムは[b4]で表す。',
        blanks: [
          word('b1', ['Ca', 'K', 'Cu'], 'Ca'),
          word('b2', ['Al', 'Ag', 'A'], 'Al'),
          word('b3', ['Zn', 'Z', 'Ze'], 'Zn'),
          word('b4', ['Ba', 'B', 'Br'], 'Ba'),
        ],
        explanation: 'カルシウム Ca、アルミニウム Al、亜鉛 Zn、バリウム Ba です。',
        hint: '2 文字目は小文字で書くよ。',
      }),
      fill({
        id: 'chemical-change-mp3-r3', concept: 'ch-atom',
        prompt: '元素記号が表す元素の名前を選ぼう。',
        text: 'Ba は[b1]、Ag は[b2]、S は[b3]、Cl は[b4]である。',
        blanks: [
          word('b1', ['バリウム', 'ホウ素', 'カルシウム'], 'バリウム'),
          word('b2', ['銀', '金', 'アルミニウム'], '銀'),
          word('b3', ['硫黄', 'ナトリウム', '炭素'], '硫黄'),
          word('b4', ['塩素', '炭素', '銅'], '塩素'),
        ],
        explanation: 'Ba はバリウム、Ag は銀、S は硫黄、Cl は塩素です。',
        hint: '塩素の元素記号は C と l（エル）の 2 文字だよ。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp4: 分子と化学式（ミニプリント「アボガドロ　分子」「化学式」） ----
  const chemMp4 = {
    id: 'chemical-change-mp4', areaId: 'atom', free: true, title: 'プリント 4: 分子と化学式', minutes: 5, concepts: ['ch-formula'],
    lessons: [
      {
        id: 'chemical-change-mp4-c1',
        text: 'いくつかの原子が結びついてできた粒子を**分子**といい、アボガドロが考えを発表しました。水素・酸素・窒素・塩素・水・二酸化炭素・アンモニアは分子でできています。鉄や銅などの金属や炭素は、分子をつくりません。',
        figure: scene([
          ...molH2(50, 60), ...molO2(160, 60), ...molH2O(270, 56),
          { type: 'text', x: 50, y: 104, text: '水素 H₂', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 104, text: '酸素 O₂', size: 13, anchor: 'middle' },
          { type: 'text', x: 270, y: 104, text: '水 H₂O', size: 13, anchor: 'middle' },
          ...molCO2(60, 160), ...molNH3(160, 166),
          atom(244, 152, 'Cu', 13), atom(272, 152, 'Cu', 13), atom(300, 152, 'Cu', 13),
          atom(258, 178, 'Cu', 13), atom(286, 178, 'Cu', 13),
          { type: 'text', x: 60, y: 214, text: '二酸化炭素 CO₂', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 214, text: 'アンモニア NH₃', size: 13, anchor: 'middle' },
          { type: 'text', x: 272, y: 214, text: '銅（分子なし）', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-mp4-c2',
        text: '物質を元素記号と数字で表したものを**化学式**といいます。分子をつくる物質は、H₂O のように原子の数を右下に小さく書きます。分子をつくらない物質は、鉄 Fe・銅 Cu・塩化ナトリウム NaCl・酸化銅 CuO のように表します。',
        // 化学式の表
        figure: scene([
          { type: 'line', points: [[160, 8], [160, 232]], color: 'gray', width: 1 },
          { type: 'text', x: 80, y: 24, text: '分子をつくる', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 24, text: '分子をつくらない', size: 13, anchor: 'middle', bold: true },
          ...[['水素', 'H₂'], ['酸素', 'O₂'], ['水', 'H₂O'], ['二酸化炭素', 'CO₂'], ['アンモニア', 'NH₃']].flatMap(([n, f], i) => [
            { type: 'text', x: 8, y: 60 + i * 36, text: n, size: 13 },
            { type: 'text', x: 150, y: 60 + i * 36, text: f, size: 15, anchor: 'end', bold: true },
          ]),
          ...[['鉄', 'Fe'], ['銅', 'Cu'], ['炭素', 'C'], ['塩化ナトリウム', 'NaCl'], ['酸化銅', 'CuO']].flatMap(([n, f], i) => [
            { type: 'text', x: 168, y: 60 + i * 36, text: n, size: 13 },
            { type: 'text', x: 312, y: 60 + i * 36, text: f, size: 15, anchor: 'end', bold: true },
          ]),
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp4-w1', concept: 'ch-formula',
      prompt: '予想しよう。水の分子は、どんな原子が何個結びついてできていると思う？',
      options: ['水素原子 2 個と酸素原子 1 個', '水素原子 1 個と酸素原子 1 個', '酸素原子 2 個だけ'],
      answer: 'a',
      explanation: '水の分子は、水素原子 2 個と酸素原子 1 個が結びついたもので、化学式は H₂O です。分子と化学式を復習しよう。',
      hint: '化学式 H₂O の数字に注目しよう。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp4-p1', concept: 'ch-formula',
        prompt: '原子のモデルで分子を表しました（丸の中の H は水素原子、O は酸素原子、C は炭素原子、N は窒素原子）。二酸化炭素の分子を表しているのはア〜エのどれ？',
        figure: MOLECULE_Q,
        answer: 'r3',
        explanation: '二酸化炭素の分子 CO₂ は、炭素原子 1 個の両側に酸素原子が 1 個ずつ結びついたもの（ウ）です。アは酸素、イは水、エはアンモニアの分子です。',
        hint: 'C が 1 個、O が 2 個のモデルをさがそう。',
      }),
      fill({
        id: 'chemical-change-mp4-t1', concept: 'ch-formula', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'いくつかの原子が結びついてできた、物質の性質を示す最小の粒子を[b1]という。この考えを発表したのは[b2]である。',
        blanks: [
          word('b1', ['分子', '原子', '元素'], '分子'),
          word('b2', ['アボガドロ', 'ドルトン', 'メンデレーエフ', 'フレミング'], 'アボガドロ'),
        ],
        explanation: '原子が結びついた粒子が**分子**で、イタリアのアボガドロが考えを発表しました。原子の考えはドルトンです。',
        hint: '原子の考えを発表した人とは別の人だよ。',
      }),
      choice({
        id: 'chemical-change-mp4-p2', concept: 'ch-formula',
        prompt: 'ふつうの状態で、分子が最小の単位になっている物質の組み合わせはどれ？',
        options: ['窒素と塩素', '鉄と炭素', '鉄と窒素', '炭素と塩素'],
        answer: 'a',
        explanation: '窒素 N₂ と塩素 Cl₂ は、原子が 2 個ずつ結びついた分子でできています。鉄と炭素は分子をつくらず、原子がたくさん集まってできています。',
        hint: '鉄は金属、炭素も分子をつくらない物質だよ。',
      }),
      fill({
        id: 'chemical-change-mp4-p3', concept: 'ch-formula',
        prompt: '化学式を選ぼう。',
        text: '水素は[b1]、鉄は[b2]、水は[b3]、炭素は[b4]と表す。',
        blanks: [
          word('b1', ['H₂', 'H', '2H'], 'H₂'),
          word('b2', ['Fe', 'Fe₂', 'FE'], 'Fe'),
          word('b3', ['H₂O', 'HO₂', 'H₂O₂'], 'H₂O'),
          word('b4', ['C', 'C₂', 'Ca'], 'C'),
        ],
        explanation: '水素は分子 H₂、鉄は分子をつくらないので Fe、水は H₂O、炭素も分子をつくらないので C と表します。',
        hint: '分子をつくる物質だけ、原子の数を右下に書くよ。',
      }),
      fill({
        id: 'chemical-change-mp4-p4', concept: 'ch-formula',
        prompt: '化学式を選ぼう。',
        text: '銀は[b1]、硫黄は[b2]、二酸化炭素は[b3]、銅は[b4]と表す。',
        blanks: [
          word('b1', ['Ag', 'Ag₂', 'AG'], 'Ag'),
          word('b2', ['S', 'S₂', 'Si'], 'S'),
          word('b3', ['CO₂', 'CO', 'C₂O'], 'CO₂'),
          word('b4', ['Cu', 'Cu₂', 'CU'], 'Cu'),
        ],
        explanation: '銀 Ag、硫黄 S、銅 Cu は分子をつくらないので、元素記号 1 つで表します。二酸化炭素は炭素原子 1 個と酸素原子 2 個の分子なので CO₂ です。',
        hint: '「二酸化」は酸素が 2 個という意味だよ。',
      }),
      fill({
        id: 'chemical-change-mp4-p5', concept: 'ch-formula',
        prompt: '化学式を選ぼう。',
        text: '塩化ナトリウム（食塩）は[b1]、酸素は[b2]、塩素は[b3]、窒素は[b4]と表す。',
        blanks: [
          word('b1', ['NaCl', 'NaCl₂', 'Na₂Cl'], 'NaCl'),
          word('b2', ['O₂', 'O', 'O₃'], 'O₂'),
          word('b3', ['Cl₂', 'Cl', 'CL'], 'Cl₂'),
          word('b4', ['N₂', 'N', 'Na'], 'N₂'),
        ],
        explanation: '塩化ナトリウムはナトリウムと塩素が 1：1 で結びついているので NaCl です。酸素 O₂、塩素 Cl₂、窒素 N₂ は原子 2 個の分子です。',
        hint: '気体の酸素・塩素・窒素は、原子 2 個の分子だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'chemical-change-mp4-r1', concept: 'ch-formula',
        prompt: '原子のモデルで分子を表しました（丸の中の H は水素原子、O は酸素原子、C は炭素原子、N は窒素原子）。アンモニアの分子を表しているのはア〜エのどれ？',
        figure: MOLECULE_Q,
        answer: 'r4',
        explanation: 'アンモニアの分子 NH₃ は、窒素原子 1 個に水素原子 3 個が結びついたもの（エ）です。',
        hint: 'N が 1 個、H が 3 個のモデルをさがそう。',
      }),
      fill({
        id: 'chemical-change-mp4-r2', concept: 'ch-formula',
        prompt: '化学式を選ぼう。',
        text: 'アンモニアは[b1]、酸化銅は[b2]、マグネシウムは[b3]と表す。',
        blanks: [
          word('b1', ['NH₃', 'NH', 'N₃H'], 'NH₃'),
          word('b2', ['CuO', 'CuO₂', 'Cu₂O'], 'CuO'),
          word('b3', ['Mg', 'Mg₂', 'MG'], 'Mg'),
        ],
        explanation: 'アンモニアは NH₃、酸化銅は銅と酸素が 1：1 で結びついているので CuO、マグネシウムは金属なので Mg です。',
        hint: '酸化銅は、銅原子と酸素原子が同じ数ずつ結びついているよ。',
      }),
      choice({
        id: 'chemical-change-mp4-r3', concept: 'ch-formula',
        prompt: '化学式 CuO で表される物質はどれ？',
        options: ['酸化銅', '銅', '炭酸銅'],
        answer: 'a',
        explanation: 'CuO は銅 Cu と酸素 O が結びついた酸化銅です。銅を空気中で加熱するとできる黒色の物質です。',
        hint: 'Cu は銅、O は酸素だよ。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp5: 化学反応式（ミニプリント「化学反応式①」「化学反応式（みんな）」） ----
  const chemMp5 = {
    id: 'chemical-change-mp5', areaId: 'reaction', free: true, title: 'プリント 5: 化学反応式', minutes: 5, concepts: ['ch-equation'],
    lessons: [
      {
        id: 'chemical-change-mp5-c1',
        anim: 'ch-water-formation',   // 動く図の使い回し（js/anim-chem.js）。figure は静止図として残す
        text: '**化学反応式**は、矢印の左に反応前、右に反応後の物質を化学式で書き、左右で原子の種類と数をそろえます。数をそろえるときは化学式の前に**係数**をつけ、化学式の中の小さな数字は変えません。',
        // 2Cu ＋ O₂ → 2CuO のモデル
        figure: scene([
          atom(28, 84, 'Cu', 16), atom(28, 126, 'Cu', 16),
          { type: 'text', x: 64, y: 112, text: '＋', size: 16, anchor: 'middle' },
          ...molO2(108, 106),
          { type: 'text', x: 152, y: 112, text: '→', size: 16, anchor: 'middle' },
          atom(190, 84, 'Cu', 16), atom(220, 84, 'O', 14),
          atom(190, 128, 'Cu', 16), atom(220, 128, 'O', 14),
          { type: 'text', x: 160, y: 190, text: '2Cu ＋ O₂ → 2CuO', size: 18, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 222, text: '係数（前の数字）で原子の数をそろえる', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-mp5-c2',
        text: 'メタン CH₄ やプロパン C₃H₈ のように炭素と水素をふくむ物質が燃えると、二酸化炭素と水ができます。CH₄ ＋ 2O₂ → CO₂ ＋ 2H₂O のように、左右の C・H・O の数を 1 つずつ数えて確かめます。',
        // 左右の原子の数の表
        figure: scene([
          { type: 'text', x: 160, y: 40, text: 'CH₄ ＋ 2O₂ → CO₂ ＋ 2H₂O', size: 18, anchor: 'middle', bold: true },
          { type: 'rect', x: 8, y: 70, width: 300, height: 40, fill: 'lightgreen' },
          { type: 'rect', x: 8, y: 110, width: 300, height: 40, fill: 'white' },
          { type: 'rect', x: 8, y: 150, width: 300, height: 40, fill: 'white' },
          ...[158, 208, 258].map(x => ({ type: 'line', points: [[x, 70], [x, 190]], width: 2 })),
          ...[['原子の数', 'C', 'H', 'O'], ['左 CH₄ ＋ 2O₂', '1', '4', '4'], ['右 CO₂ ＋ 2H₂O', '1', '4', '4']].flatMap((row, i) => [
            { type: 'text', x: 83, y: 96 + i * 40, text: row[0], size: 13, anchor: 'middle', bold: i === 0 },
            { type: 'text', x: 183, y: 96 + i * 40, text: row[1], size: 15, anchor: 'middle', bold: true },
            { type: 'text', x: 233, y: 96 + i * 40, text: row[2], size: 15, anchor: 'middle', bold: true },
            { type: 'text', x: 283, y: 96 + i * 40, text: row[3], size: 15, anchor: 'middle', bold: true },
          ]),
          { type: 'text', x: 160, y: 222, text: '左右で原子の種類と数が同じ', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp5-w1', concept: 'ch-equation',
      prompt: '予想しよう。化学反応式の左（反応前）と右（反応後）で、原子の数はどうなると思う？',
      options: ['種類も数も同じになる', '右のほうが多くなる', '右のほうが少なくなる'],
      answer: 'a',
      explanation: '化学変化では原子がなくなったり新しくできたりしないので、左右で原子の種類と数は同じです。いろいろな化学反応式を書いてみよう。',
      hint: '原子の性質を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp5-p1', concept: 'ch-equation',
        prompt: '水素分子 2 個と酸素分子 1 個が反応して水ができます。反応後のようすを正しく表したモデルはア〜ウのどれ？（H: 水素原子、O: 酸素原子）',
        figure: EQUATION_MODEL_Q,
        answer: 'r1',
        explanation: '反応前は水素原子 4 個・酸素原子 2 個です。水の分子 2 個（ア）なら、原子の種類と数が同じです。イは水素原子が 2 個しかなく、ウは酸素原子が 1 個しかありません。化学反応式は 2H₂ ＋ O₂ → 2H₂O です。',
        hint: '反応の前と後で、H と O の数を数えてみよう。',
      }),
      fill({
        id: 'chemical-change-mp5-t1', concept: 'ch-equation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '化学式を使って化学変化を表した式を[b1]という。式の左右で、原子の[b2]と数は等しい。',
        blanks: [
          word('b1', ['化学反応式', '化学式', '元素記号'], '化学反応式'),
          word('b2', ['種類', '色', '大きさの順'], '種類'),
        ],
        explanation: '化学変化を化学式で表した式が**化学反応式**です。左右で原子の種類と数が等しくなるように係数をつけます。',
        hint: '「化学反応」を表す「式」だよ。',
      }),
      fill({
        id: 'chemical-change-mp5-p2', concept: 'ch-equation',
        prompt: '化学反応式を完成させよう。',
        text: '鉄 ＋ 硫黄 → 硫化鉄: Fe ＋ S → [b1]　炭素 ＋ 酸素 → 二酸化炭素: C ＋ [b2] → CO₂',
        blanks: [
          word('b1', ['FeS', 'FeS₂', 'Fe₂S'], 'FeS'),
          word('b2', ['O₂', 'O', '2O'], 'O₂'),
        ],
        explanation: '鉄と硫黄は 1：1 で結びつくので FeS です。酸素は分子 O₂ で反応するので、C ＋ O₂ → CO₂ となります。',
        hint: '酸素は、原子 2 個の分子で書くよ。',
      }),
      fill({
        id: 'chemical-change-mp5-p3', concept: 'ch-equation',
        prompt: '化学反応式を完成させよう。',
        text: '銅 ＋ 酸素 → 酸化銅: 2Cu ＋ O₂ → [b1]　酸化銀 → 銀 ＋ 酸素: 2Ag₂O → [b2] ＋ O₂',
        blanks: [
          word('b1', ['2CuO', 'CuO', 'CuO₂'], '2CuO'),
          word('b2', ['4Ag', '2Ag', 'Ag₂'], '4Ag'),
        ],
        explanation: '2Cu ＋ O₂ では Cu が 2 個、O が 2 個なので 2CuO です。2Ag₂O には Ag が 4 個あるので、右は 4Ag ＋ O₂ になります。',
        hint: '左の原子の数を数えてから、右の係数を決めよう。',
      }),
      fill({
        id: 'chemical-change-mp5-p4', concept: 'ch-equation',
        prompt: '化学反応式を完成させよう。',
        text: '窒素 ＋ 水素 → アンモニア: N₂ ＋ [b1] → 2NH₃',
        blanks: [word('b1', ['3H₂', 'H₃', '2H₂'], '3H₂')],
        explanation: '右の 2NH₃ には水素原子が 2 × 3 ＝ 6 個あります。水素分子 H₂ が 3 個で 6 個になるので、3H₂ です。',
        hint: '右の水素原子の数を数えよう。',
      }),
      fill({
        id: 'chemical-change-mp5-p5', concept: 'ch-equation',
        prompt: 'メタンの燃焼の化学反応式を完成させよう。',
        text: 'CH₄ ＋ [b1] → CO₂ ＋ [b2]',
        blanks: [
          word('b1', ['2O₂', 'O₂', '4O'], '2O₂'),
          word('b2', ['2H₂O', 'H₂O', '4H₂O'], '2H₂O'),
        ],
        explanation: 'CH₄ の H 4 個は 2H₂O になります。右の O は CO₂ の 2 個と 2H₂O の 2 個で 4 個なので、左は 2O₂ です。',
        hint: 'C → H → O の順に数を合わせよう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'chemical-change-mp5-r1', concept: 'ch-equation',
        prompt: 'プロパンの燃焼の化学反応式を完成させよう。',
        text: 'C₃H₈ ＋ [b1] → 3CO₂ ＋ [b2]',
        blanks: [
          word('b1', ['5O₂', '3O₂', '10O₂'], '5O₂'),
          word('b2', ['4H₂O', '2H₂O', '8H₂O'], '4H₂O'),
        ],
        explanation: 'C₃H₈ の H 8 個は 4H₂O になります。右の O は 3CO₂ の 6 個と 4H₂O の 4 個で 10 個なので、左は 5O₂ です。',
        hint: 'H の数から 水 の係数を決めよう。',
      }),
      fill({
        id: 'chemical-change-mp5-r2', concept: 'ch-equation',
        prompt: '炭酸水素ナトリウムの熱分解の化学反応式を完成させよう。',
        text: '2NaHCO₃ → [b1] ＋ CO₂ ＋ H₂O',
        blanks: [word('b1', ['Na₂CO₃', 'NaCO₃', '2NaCO₃'], 'Na₂CO₃')],
        explanation: '左の 2NaHCO₃ には Na が 2 個あるので、炭酸ナトリウムは Na₂CO₃ です。C・H・O の数も左右で同じになります。',
        hint: '左の Na の数を数えよう。',
      }),
      fill({
        id: 'chemical-change-mp5-r3', concept: 'ch-equation',
        prompt: '化学反応式を完成させよう。',
        text: 'マグネシウムの燃焼: 2Mg ＋ O₂ → [b1]　水素の燃焼: 2H₂ ＋ O₂ → [b2]',
        blanks: [
          word('b1', ['2MgO', 'MgO', 'MgO₂'], '2MgO'),
          word('b2', ['2H₂O', 'H₂O', 'H₂O₂'], '2H₂O'),
        ],
        explanation: 'どちらも酸素分子 O₂ の O 2 個が 2 つの化合物に分かれて入るので、2MgO、2H₂O になります。',
        hint: '左の O が 2 個なので、右にも O が 2 個必要だよ。',
      }),
      choice({
        id: 'chemical-change-mp5-r4', concept: 'ch-equation',
        prompt: '化学反応式 N₂ ＋ 3H₂ → 2NH₃ の左右で、水素原子の数はそれぞれいくつ？',
        options: ['左 6 個、右 6 個', '左 3 個、右 2 個', '左 6 個、右 3 個'],
        answer: 'a',
        explanation: '左は 3H₂ で 3 × 2 ＝ 6 個、右は 2NH₃ で 2 × 3 ＝ 6 個です。左右で同じになっています。',
        hint: '係数 × 右下の数字 で数えよう。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp6: 物質が結びつく変化（ミニプリント「鉄と硫黄の化合①・②」「酸化、酸化物、燃焼」） ----
  const chemMp6 = {
    id: 'chemical-change-mp6', areaId: 'reaction', free: true, title: 'プリント 6: 物質が結びつく変化', minutes: 5, concepts: ['ch-equation', 'ch-oxidation'],
    lessons: [
      {
        id: 'chemical-change-mp6-c1',
        text: '鉄粉（灰色）と硫黄（黄色）の混合物を加熱すると、光と熱を出して反応が進み、黒色の**硫化鉄**ができます。2 つ以上の物質が結びついて別の物質ができる化学変化を**化合**といい、できた物質を**化合物**といいます。',
        // 写真（chem-3-c2 の画像）: 左の皿 (82, 32〜160) に鉄粉と硫黄の粉、右の皿 (235, 32〜160) に黒い硫化鉄。皿の下 165 より下は白い余白
        figure: scene([
          photo('chem-3-c2'),
          tag(82, 24, '加熱前', { size: 16, bold: true }),
          { type: 'arrow', x1: 118, y1: 18, x2: 198, y2: 18, color: 'ink', width: 2 },
          tag(158, 40, '加熱', { size: 13 }),
          tag(235, 24, '加熱後', { size: 16, bold: true }),
          tag(86, 180, '鉄粉（灰色）＋硫黄（黄色）', { size: 13 }),
          tag(235, 180, '硫化鉄（黒色）', { size: 13 }),
          tag(160, 206, 'Fe ＋ S → FeS', { size: 16, bold: true }),
          tag(160, 230, '結びついて別の物質（化合物）ができる', { size: 13 }),
        ]),
      },
      {
        id: 'chemical-change-mp6-c2',
        text: '加熱前の混合物にうすい塩酸を加えると、においのない**水素**が出ます。加熱後の硫化鉄では、卵がくさったようなにおいの**硫化水素**が出ます。物質が酸素と結びつく化合を**酸化**、熱や光を激しく出す酸化を**燃焼**といいます。',
        figure: scene(fesTubeItems().concat([
          { type: 'text', x: 110, y: 40, text: 'においなし', size: 12, anchor: 'middle' },
          { type: 'text', x: 110, y: 58, text: '（水素）', size: 12, anchor: 'middle' },
          { type: 'text', x: 210, y: 40, text: 'においあり', size: 12, anchor: 'middle' },
          { type: 'text', x: 210, y: 58, text: '（硫化水素）', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp6-w1', concept: 'ch-equation',
      prompt: '予想しよう。鉄粉と硫黄の混合物の上のほうを加熱し、赤くなったところで加熱をやめると、反応はどうなると思う？',
      options: ['反応で出る熱で、全体に反応が広がっていく', 'すぐに反応が止まる', 'はじめから反応しない'],
      answer: 'a',
      explanation: '鉄と硫黄の反応は熱を出すので、加熱をやめても、その熱で反応が全体に広がっていきます。物質が結びつく化学変化を復習しよう。',
      hint: 'この反応は、光と熱を出すよ。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp6-p1', concept: 'ch-equation',
        prompt: '鉄粉と硫黄の加熱前の混合物（ア）と、加熱後にできた物質（イ）に、それぞれうすい塩酸を加えました。卵がくさったようなにおいの気体が出るのはどちら？',
        figure: FES_Q,
        answer: 'r2',
        explanation: '加熱後にできた硫化鉄（イ）にうすい塩酸を加えると、においのある硫化水素が出ます。加熱前の混合物（ア）では、鉄と塩酸が反応して、においのない水素が出ます。硫化水素は有毒なので、においは手であおいでかぎます。',
        hint: '硫黄をふくむ物質から出る気体だよ。',
      }),
      fill({
        id: 'chemical-change-mp6-t1', concept: 'ch-oxidation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '2 つ以上の物質が結びついて別の物質ができる化学変化を[b1]、できた物質を[b2]という。物質が酸素と結びつく[b1]を[b3]、熱や光を激しく出しながら進む[b3]を[b4]という。',
        blanks: [
          word('b1', ['化合', '分解', '還元'], '化合'),
          word('b2', ['化合物', '単体', '混合物'], '化合物'),
          word('b3', ['酸化', '還元', '分解'], '酸化'),
          word('b4', ['燃焼', '蒸発', '分解'], '燃焼'),
        ],
        explanation: '結びつく化学変化が**化合**、できた物質が**化合物**です。酸素と結びつく化合が**酸化**、熱や光を激しく出す酸化が**燃焼**です。',
        hint: '「化けて合わさる」「酸素と結びつく」「燃える」と考えよう。',
      }),
      fill({
        id: 'chemical-change-mp6-p2', concept: 'ch-equation',
        prompt: '物質の色を選ぼう。',
        text: '鉄粉は[b1]色、硫黄は[b2]色で、2 つの混合物を加熱してできた物質は[b3]色である。',
        blanks: [
          word('b1', ['灰', '黄', '黒', '白'], '灰'),
          word('b2', ['灰', '黄', '黒', '白'], '黄'),
          word('b3', ['灰', '黄', '黒', '白'], '黒'),
        ],
        explanation: '灰色の鉄粉と黄色の硫黄から、黒色の硫化鉄ができます。色が変わったことからも、別の物質ができたと分かります。',
        hint: 'できた硫化鉄は、黒っぽい物質だよ。',
      }),
      choice({
        id: 'chemical-change-mp6-p3', concept: 'ch-equation',
        prompt: '鉄と硫黄の混合物を加熱してできた物質と、それにうすい塩酸を加えて出る気体の組み合わせはどれ？',
        options: ['硫化鉄、硫化水素', '硫化鉄、水素', '酸化鉄、酸素', '硫黄、二酸化炭素'],
        answer: 'a',
        explanation: '鉄と硫黄が結びついて硫化鉄ができ、硫化鉄にうすい塩酸を加えると硫化水素が出ます。',
        hint: 'どちらの名前にも「硫化」が入るよ。',
      }),
      choice({
        id: 'chemical-change-mp6-p4', concept: 'ch-equation',
        prompt: '鉄粉と硫黄の混合物を加熱したときのようすとして、正しいものはどれ？',
        options: ['赤く光り、熱を出しながら反応が進む', '気体がたくさん出て、粉がなくなる', '加熱しても何も変化しない'],
        answer: 'a',
        explanation: '鉄と硫黄の反応は、赤く光って熱を出しながら進みます。反応で出る熱で、加熱をやめても反応が続きます。',
        hint: 'この反応は熱を出す反応だよ。',
      }),
      choice({
        id: 'chemical-change-mp6-p5', concept: 'ch-oxidation',
        prompt: '次のうち、酸化物でないものはどれ？',
        options: ['硫化鉄', '酸化銅', '酸化マグネシウム', '二酸化炭素'],
        answer: 'a',
        explanation: '酸化物は、物質が酸素と結びついてできた化合物です。硫化鉄は鉄と硫黄の化合物なので、酸化物ではありません。二酸化炭素は炭素と酸素の化合物なので酸化物です。',
        hint: '酸素をふくまない化合物をさがそう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'chemical-change-mp6-r1', concept: 'ch-equation',
        prompt: '鉄粉と硫黄の加熱前の混合物（ア）と、加熱後にできた物質（イ）に、それぞれうすい塩酸を加えました。においのない気体（水素）が出るのはどちら？',
        figure: FES_Q,
        answer: 'r1',
        explanation: '加熱前の混合物（ア）には鉄がそのまま残っているので、塩酸と反応して水素が出ます。',
        hint: '鉄がそのまま残っているのはどちらかな。',
      }),
      choice({
        id: 'chemical-change-mp6-r2', concept: 'ch-equation',
        prompt: '加熱前の混合物と、加熱後にできた物質のうち、磁石に引きつけられるのはどちら？',
        options: ['加熱前の混合物', '加熱後にできた物質', 'どちらも引きつけられる'],
        answer: 'a',
        explanation: '加熱前の混合物には鉄が残っているので、磁石に引きつけられます。加熱後の硫化鉄は鉄とはちがう物質なので、磁石に引きつけられません。',
        hint: '鉄のままなのはどちらかな。',
      }),
      choice({
        id: 'chemical-change-mp6-r3', concept: 'ch-oxidation',
        prompt: '次のうち、燃焼の例はどれ？',
        options: ['マグネシウムリボンが強い光を出して燃える', '鉄くぎが空気中でゆっくりさびる', '炭酸水素ナトリウムを加熱する'],
        answer: 'a',
        explanation: 'マグネシウムが強い光と熱を出して酸素と結びつくのは燃焼です。鉄がさびるのはおだやかな酸化、炭酸水素ナトリウムの加熱は分解です。',
        hint: '熱や光を激しく出しているものをさがそう。',
      }),
      choice({
        id: 'chemical-change-mp6-r4', concept: 'ch-oxidation',
        prompt: '鉄くぎが空気中でゆっくりさびるのは、どんな化学変化？',
        options: ['おだやかな酸化', '還元', '分解'],
        answer: 'a',
        explanation: '鉄がさびるのは、鉄が空気中の酸素とゆっくり結びつく、おだやかな酸化です。熱や光を激しく出さないので燃焼とはいいません。',
        hint: '酸素と結びついているけれど、燃えてはいないね。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp7: 酸化と燃焼の実験（ミニプリント「銅の粉末の酸化」「スチールウールの燃焼」「燃焼で二酸化炭素が発生するか」） ----
  const chemMp7 = {
    id: 'chemical-change-mp7', areaId: 'reaction', free: true, title: 'プリント 7: 酸化と燃焼の実験', minutes: 5, concepts: ['ch-oxidation'],
    lessons: [
      {
        id: 'chemical-change-mp7-c1',
        text: '赤茶色の銅の粉末をステンレス皿で加熱すると、空気中の酸素と結びついて黒色の**酸化銅**になり、質量が増えます。増えた分が結びついた酸素の質量です。スチールウール（鉄）を燃やすと、黒っぽい**酸化鉄**ができ、質量が増えます。',
        // 写真（chem-3-c3 の画像）: 上の皿 (12〜140, 8〜92) に銅の粉、下の皿 (12〜140, 98〜185) に酸化銅の粉、
        // 右にピンセットではさんだマグネシウムリボン (220〜255, 50〜165)。強い光は (230, 150)。下は白い余白
        figure: scene([
          photo('chem-3-c3'),
          tag(174, 46, '銅'),
          tag(174, 64, '（赤茶色）', { size: 13 }),
          { type: 'arrow', x1: 174, y1: 72, x2: 174, y2: 124, color: 'ink', width: 2 },
          tag(174, 102, '加熱', { size: 13 }),
          tag(174, 142, '酸化銅'),
          tag(174, 160, '（黒色）', { size: 13 }),
          tag(76, 204, '質量は増える', { size: 13, bold: true }),
          tag(76, 221, '（増えた分 ＝', { size: 13 }),
          tag(76, 238, '結びついた酸素）', { size: 13 }),
          pointer(242, 184, 232, 166),
          tag(252, 200, 'マグネシウム', { size: 13 }),
          tag(252, 218, '激しく光と熱を出す', { size: 13 }),
          tag(252, 236, '酸化 ＝ 燃焼', { size: 13, bold: true }),
        ]),
      },
      {
        id: 'chemical-change-mp7-c2',
        text: 'エタノールなど炭素と水素をふくむ物質を燃やすと、**二酸化炭素**と**水**ができます。燃やした後の集気びんに石灰水を入れてふると白くにごり、びんの内側のくもりに**塩化コバルト紙**をつけると赤色（桃色）になります。',
        // 写真（sub-1-c3 の画像。ほかの単元の画像なので src を直接書く）: 左の集気びん (25〜105, 10〜170) の中で燃えるろうそく、
        // 右の集気びん (215〜295, 10〜170) は燃やした後に石灰水を入れてふったもの（白くにごる）。下は白い余白
        figure: scene([
          { type: 'image', src: 'assets/images/substance/sub-1-c3.jpg' },
          tag(160, 24, 'ろう・エタノール', { size: 13 }),
          tag(160, 42, 'などを燃やす', { size: 13 }),
          { type: 'arrow', x1: 116, y1: 90, x2: 206, y2: 90, color: 'blue', width: 3 },
          tag(161, 78, '燃やした後', { size: 13 }),
          tag(74, 186, 'びんの内側がくもる', { size: 13 }),
          tag(74, 203, '塩化コバルト紙が赤色', { size: 13 }),
          tag(74, 220, '→ 水', { size: 13, bold: true }),
          tag(255, 186, '石灰水を入れてふる', { size: 13 }),
          tag(255, 203, '白くにごる', { size: 13 }),
          tag(255, 220, '→ 二酸化炭素', { size: 13, bold: true }),
          tag(160, 238, '炭素と水素をふくむ物質 → 二酸化炭素と水', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp7-w1', concept: 'ch-oxidation',
      prompt: '予想しよう。赤茶色の銅の粉末を空気中でよく加熱すると、色はどうなると思う？',
      options: ['黒色になる', '白色になる', '変わらない'],
      answer: 'a',
      explanation: '銅は空気中の酸素と結びついて、黒色の酸化銅になります。金属の酸化と燃焼の実験を復習しよう。',
      hint: '10 円玉の古いものは、黒っぽくなっているね。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp7-p1', concept: 'ch-oxidation',
        prompt: 'スチールウールを燃やす前（ア）と燃やした後（イ）のようすです。手でさわるとぼろぼろとくずれ、電流がほとんど流れないのはどちら？',
        figure: STEEL_Q,
        answer: 'r2',
        explanation: '燃やした後（イ）は、鉄が酸素と結びついた酸化鉄になっています。酸化鉄は鉄とちがう物質なので、もろく、金属のように電流を通しません。',
        hint: '燃やすと、鉄は別の物質に変わったね。',
      }),
      fill({
        id: 'chemical-change-mp7-t1', concept: 'ch-oxidation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '銅を空気中で加熱すると、酸素と結びついて[b1]色の[b2]ができる。',
        blanks: [
          word('b1', ['黒', '白', '赤茶'], '黒'),
          word('b2', ['酸化銅', '硫化銅', '炭酸銅'], '酸化銅'),
        ],
        explanation: '銅は酸素と結びついて黒色の**酸化銅**になります。化学反応式は 2Cu ＋ O₂ → 2CuO です。',
        hint: '酸素と結びついた物質の名前には「酸化」がつくよ。',
      }),
      fill({
        id: 'chemical-change-mp7-p2', concept: 'ch-oxidation',
        prompt: '空らんに入る数を入れよう。',
        text: 'ステンレス皿の質量は 23.8 g で、銅の粉末をのせると 28.6 g だった。使った銅の質量は[b1]である。',
        blanks: [number('b1', 4.8, 0, 'g')],
        explanation: '皿と銅の質量から、皿の質量を引くと、28.6 − 23.8 ＝ 4.8 g です。',
        hint: '皿ごとの質量から、皿の質量を引こう。',
      }),
      fill({
        id: 'chemical-change-mp7-p3', concept: 'ch-oxidation',
        prompt: '空らんに入る数を入れよう。',
        text: '上の皿（銅の粉末をのせて 28.6 g）を加熱すると、皿ごとの質量が 29.8 g になった。銅と結びついた酸素の質量は[b1]である。',
        blanks: [number('b1', 1.2, 0, 'g')],
        explanation: '増えた質量が結びついた酸素の質量なので、29.8 − 28.6 ＝ 1.2 g です。銅 4.8 g と酸素 1.2 g で、銅：酸素 ＝ 4：1 になっています。',
        hint: '加熱で増えた分を求めよう。',
      }),
      choice({
        id: 'chemical-change-mp7-p4', concept: 'ch-oxidation',
        prompt: '銅の粉末を加熱する前と後の色、加熱後にできた物質の組み合わせとして正しいものはどれ？',
        options: ['赤茶色 → 黒色、酸化銅', '黒色 → 赤茶色、銅', '銀色 → 白色、酸化マグネシウム'],
        answer: 'a',
        explanation: '赤茶色の銅が酸素と結びついて、黒色の酸化銅になります。マグネシウムを燃やすと、白色の酸化マグネシウムができます。',
        hint: '銅の色を思い出そう。',
      }),
      choice({
        id: 'chemical-change-mp7-p5', concept: 'ch-oxidation',
        prompt: '集気びんの中でエタノールを燃やし、火が消えたあとに石灰水を入れてよくふると、白くにごりました。ここから分かることはどれ？',
        options: ['二酸化炭素ができた（エタノールには炭素がふくまれる）', '酸素ができた', '水素ができた'],
        answer: 'a',
        explanation: '石灰水が白くにごったので、二酸化炭素ができたと分かります。エタノールにふくまれる炭素が酸素と結びついたからです。',
        hint: '石灰水を白くにごらせる気体は何かな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-mp7-r1', concept: 'ch-oxidation',
        prompt: 'スチールウールは何という物質でできていて、燃やす前と後で色はどう変わる？',
        options: ['鉄、銀色 → 黒っぽい色', '銅、赤茶色 → 黒色', 'マグネシウム、銀色 → 白色'],
        answer: 'a',
        explanation: 'スチールウールは細い鉄の線です。燃やすと酸素と結びついて、黒っぽい酸化鉄になります。',
        hint: '「スチール」は鋼（鉄）という意味だよ。',
      }),
      choice({
        id: 'chemical-change-mp7-r2', concept: 'ch-oxidation',
        prompt: 'スチールウールを燃やした後の物質に磁石を近づけると、どうなる？',
        options: ['燃やす前より引きつけられにくい', '燃やす前より強く引きつけられる', '燃やす前とまったく同じように引きつけられる'],
        answer: 'a',
        explanation: '燃やした後の酸化鉄は鉄とはちがう物質なので、燃やす前の鉄のようには磁石に引きつけられません。性質が変わったことから、別の物質ができたと分かります。',
        hint: '燃やした後は、鉄とちがう物質になっているよ。',
      }),
      choice({
        id: 'chemical-change-mp7-r3', concept: 'ch-oxidation',
        prompt: 'スチールウールを燃やした後の質量は、燃やす前と比べてどうなる？',
        options: ['増える（結びついた酸素の分）', '減る', '変わらない'],
        answer: 'a',
        explanation: '鉄が空気中の酸素と結びつくので、結びついた酸素の分だけ質量が増えます。',
        hint: '燃えて灰になる木とはちがい、鉄は酸素と結びつくよ。',
      }),
      choice({
        id: 'chemical-change-mp7-r4', concept: 'ch-oxidation',
        prompt: 'エタノールを燃やしたとき、水ができたかどうかを簡単に調べる方法はどれ？',
        options: ['びんの内側のくもりに青色の塩化コバルト紙をつける', '石灰水を入れてふる', '火のついた線香を入れる'],
        answer: 'a',
        explanation: '塩化コバルト紙は水にふれると青色から赤色（桃色）に変わるので、水ができたかを調べられます。',
        hint: '水を調べる紙があったね。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp8: 還元と化学変化の熱（ミニプリント「還元１・２」「化学反応と熱」「発熱反応と吸熱反応２」） ----
  const chemMp8 = {
    id: 'chemical-change-mp8', areaId: 'reaction', free: true, title: 'プリント 8: 還元と化学変化の熱', minutes: 5, concepts: ['ch-oxidation', 'ch-conservation'],
    lessons: [
      {
        id: 'chemical-change-mp8-c1',
        text: '酸化物から酸素をうばう化学変化を**還元**といいます。黒色の酸化銅と炭素の粉を混ぜて加熱すると、赤茶色の**銅**ができ、こすると金属の光沢が出ます。炭素は酸素をうばって**二酸化炭素**になり、石灰水を白くにごらせます。',
        // 写真: スタンドに口を少し下げて固定した試験管（底 (42, 76)〜ゴム栓 (148, 92)）。中の黒い粉 (88, 86)、底の赤茶色の所 (58, 80)。
        // 炎 (60, 95〜125)。ゴム管のピンチコック (228, 85)、白くにごった石灰水の試験管 (275, 150〜195)。上は白い余白
        figure: scene([
          photo('chemical-change-mp8-c1'),
          pointer(96, 26, 92, 82), tag(4, 22, '酸化銅＋炭素（黒色）', { size: 13, anchor: 'start' }),
          pointer(40, 50, 58, 78), tag(4, 46, '→ 赤茶色（銅）', { size: 13, anchor: 'start' }),
          pointer(188, 36, 152, 86), tag(206, 30, '口を少し下げる', { size: 13 }),
          pointer(246, 64, 230, 80), tag(274, 60, 'ピンチコック', { size: 13 }),
          tag(22, 118, '加熱', { size: 13 }),
          pointer(204, 152, 268, 168),
          tag(176, 150, '石灰水が', { size: 13 }),
          tag(176, 168, '白くにごる', { size: 13 }),
          tag(176, 186, '（二酸化炭素）', { size: 13 }),
        ]),
      },
      {
        id: 'chemical-change-mp8-c2',
        anim: 'ch-reduction-model',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '加熱をやめるときは、ガラス管を石灰水から出してから火を消し、**ピンチコック**でゴム管を閉じます。できた銅が空気にふれて、再び酸化されるのを防ぐためです。酸化銅の還元と炭素の酸化は、同時に起こります。',
        // 2CuO ＋ C → 2Cu ＋ CO₂ のモデル
        figure: scene([
          atom(24, 80, 'Cu', 16), atom(54, 80, 'O', 14),
          atom(24, 124, 'Cu', 16), atom(54, 124, 'O', 14),
          { type: 'text', x: 84, y: 108, text: '＋', size: 16, anchor: 'middle' },
          atom(112, 102, 'C', 14),
          { type: 'text', x: 144, y: 108, text: '→', size: 16, anchor: 'middle' },
          atom(176, 80, 'Cu', 16), atom(176, 124, 'Cu', 16),
          { type: 'text', x: 206, y: 108, text: '＋', size: 16, anchor: 'middle' },
          ...molCO2(262, 102),
          { type: 'text', x: 160, y: 182, text: '2CuO ＋ C → 2Cu ＋ CO₂', size: 17, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 208, text: '酸化銅は還元され、炭素は酸化される', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 230, text: 'ピンチコックで空気が入るのを防ぐ', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-mp8-c3',
        anim: 'ch-heat-thermometer',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: 'まわりに熱を出して温度が上がる化学変化を**発熱反応**、まわりから熱をうばって温度が下がる化学変化を**吸熱反応**といいます。物質がもっている**化学エネルギー**が、化学変化によって熱として出入りします。',
        figure: scene(heatBeakerItems().concat([
          { type: 'arrow', x1: 126, y1: 150, x2: 126, y2: 104, color: 'red', width: 3 },
          { type: 'arrow', x1: 266, y1: 104, x2: 266, y2: 150, color: 'blue', width: 3 },
          { type: 'text', x: 90, y: 224, text: '上がる（発熱反応）', size: 12, anchor: 'middle' },
          { type: 'text', x: 230, y: 224, text: '下がる（吸熱反応）', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp8-w1', concept: 'ch-oxidation',
      prompt: '予想しよう。黒色の酸化銅を炭素の粉と混ぜて加熱すると、どうなると思う？',
      options: ['赤茶色の銅ができる', '白色の物質になる', '何も変わらない'],
      answer: 'a',
      explanation: '炭素が酸化銅から酸素をうばうので、赤茶色の銅ができます。還元と、化学変化で出入りする熱を復習しよう。',
      hint: '炭素は酸素と結びつきやすい物質だよ。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp8-p1', concept: 'ch-conservation',
        prompt: 'ア 鉄粉と活性炭に食塩水を加えたもの、イ 水酸化バリウムと塩化アンモニウムを混ぜたものの温度を調べました。混ぜたあと温度が下がるのはどちら？',
        figure: HEAT_Q,
        answer: 'r2',
        explanation: '水酸化バリウムと塩化アンモニウムの反応（イ）は、まわりから熱をうばう吸熱反応なので、温度が下がります。鉄粉と活性炭と食塩水（ア）は、鉄が酸化するときに熱を出す発熱反応です。',
        hint: '化学かいろに使われているのはどちらかな。',
      }),
      fill({
        id: 'chemical-change-mp8-t1', concept: 'ch-conservation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '化学変化のときに熱を出して温度が上がる反応を[b1]、まわりから熱を吸収して温度が下がる反応を[b2]という。',
        blanks: [
          word('b1', ['発熱反応', '吸熱反応', '燃焼'], '発熱反応'),
          word('b2', ['発熱反応', '吸熱反応', '燃焼'], '吸熱反応'),
        ],
        explanation: '熱を出すのが**発熱反応**、熱を吸収するのが**吸熱反応**です。燃焼は発熱反応の例です。',
        hint: '熱を「出す」か「吸う」かだよ。',
      }),
      choice({
        id: 'chemical-change-mp8-p2', concept: 'ch-oxidation',
        prompt: '黒色の酸化銅を、エタノールの蒸気とともに加熱すると、赤茶色の物質に変わりました。この物質をみがくとどうなる？',
        options: ['金属の光沢が出る（銅）', '白い粉になる', '黒色にもどる'],
        answer: 'a',
        explanation: 'エタノールが酸化銅から酸素をうばって、銅ができました（還元）。銅は金属なので、みがくと光沢が出ます。',
        hint: 'できた物質は金属だよ。',
      }),
      choice({
        id: 'chemical-change-mp8-p3', concept: 'ch-oxidation',
        prompt: '酸化銅と炭素の粉を加熱したあと、火を消してからゴム管をピンチコックで閉じるのはなぜ？',
        options: ['できた銅が空気中の酸素とふれて、再び酸化されるのを防ぐため', '石灰水を試験管に入れるため', '二酸化炭素を集めるため'],
        answer: 'a',
        explanation: '熱い銅に空気が入ると、銅が再び酸素と結びついて酸化銅にもどってしまいます。それを防ぐために、ゴム管を閉じます。',
        hint: '熱い銅が空気にふれると、どうなるかな。',
      }),
      fill({
        id: 'chemical-change-mp8-p4', concept: 'ch-oxidation',
        prompt: '酸化銅 ＋ 炭素 → 銅 ＋ 二酸化炭素 の化学反応式を完成させよう。',
        text: '2CuO ＋ C → [b1] ＋ [b2]',
        blanks: [
          word('b1', ['2Cu', 'Cu', 'Cu₂'], '2Cu'),
          word('b2', ['CO₂', 'CO', '2CO₂'], 'CO₂'),
        ],
        explanation: '左の 2CuO には Cu が 2 個、O が 2 個あります。Cu 2 個は 2Cu、O 2 個は炭素と結びついて CO₂ になります。',
        hint: '左の Cu と O の数を数えよう。',
      }),
      choice({
        id: 'chemical-change-mp8-p5', concept: 'ch-conservation',
        prompt: 'ア 鉄粉と炭素の粉を混ぜて食塩水を数滴たらす、イ マグネシウムリボンを燃焼させる、ウ 水酸化バリウムと塩化アンモニウムを混ぜる。温度が上がるものをすべて選んだものはどれ？',
        options: ['アとイ', 'ウだけ', 'アとウ', 'イとウ'],
        answer: 'a',
        explanation: 'アとイは熱を出す発熱反応、ウは熱を吸収する吸熱反応です。',
        hint: '燃焼は熱を出すね。化学かいろも同じだよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-mp8-r1', concept: 'ch-oxidation',
        prompt: 'エタノールの蒸気で酸化銅を還元したとき、出てきた気体を石灰水に通すとどうなる？',
        options: ['白くにごる', '変化しない', '青色になる'],
        answer: 'a',
        explanation: 'エタノールにふくまれる炭素が、酸化銅からうばった酸素と結びついて二酸化炭素ができるので、石灰水が白くにごります。',
        hint: '炭素が酸素と結びつくと、何ができるかな。',
      }),
      choice({
        id: 'chemical-change-mp8-r2', concept: 'ch-oxidation',
        prompt: '酸化銅と炭素の粉を加熱する試験管の口を、わずかに下げておくのはなぜ？',
        options: ['口の近くにできた液体が加熱部分に流れて、試験管が割れるのを防ぐため', '気体を出しやすくするため', '粉を混ぜやすくするため'],
        answer: 'a',
        explanation: '粉にふくまれていた水分などが口の近くで液体になり、熱い部分に流れると試験管が割れることがあります。固体を加熱するときは、口をわずかに下げます。',
        hint: '炭酸水素ナトリウムを加熱したときと同じ理由だよ。',
      }),
      choice({
        id: 'chemical-change-mp8-r3', concept: 'ch-oxidation',
        prompt: '酸化銅と炭素の粉の加熱をやめるとき、火を消す前にすることはどれ？',
        options: ['ガラス管を石灰水から出す', 'ピンチコックを開ける', '試験管に水を入れる'],
        answer: 'a',
        explanation: '先にガラス管を石灰水から出して、石灰水が逆流しないようにします。火を消したあとで、ピンチコックでゴム管を閉じます。',
        hint: '石灰水の逆流を防ぐ手順だよ。',
      }),
      choice({
        id: 'chemical-change-mp8-r4', concept: 'ch-conservation',
        prompt: '水酸化バリウムと塩化アンモニウムを混ぜたときに発生する、鼻をさすようなにおいの気体はどれ？',
        options: ['アンモニア', '水素', '酸素', '二酸化炭素'],
        answer: 'a',
        explanation: 'この反応ではアンモニアが発生し、温度が下がります。アンモニアは有毒なので、ぬれたろ紙でふたをするなどして、においを直接かがないようにします。',
        hint: '塩化アンモニウムの名前がヒントだよ。',
      }),
      choice({
        id: 'chemical-change-mp8-r5', concept: 'ch-conservation',
        prompt: '物質がもっていて、化学変化によって熱などとして出入りするエネルギーを何という？',
        options: ['化学エネルギー', '電気エネルギー', '位置エネルギー'],
        answer: 'a',
        explanation: '物質がもっているエネルギーを化学エネルギーといいます。発熱反応では化学エネルギーの一部が熱として出ていきます。',
        hint: '「化学」変化で出入りするエネルギーだよ。',
      }),
      choice({
        id: 'chemical-change-mp8-r6', concept: 'ch-conservation',
        prompt: '化学かいろ（鉄粉と活性炭に食塩水を加えたもの）があたたかくなるのは、鉄が何と結びつくから？',
        options: ['空気中の酸素', '食塩', '活性炭'],
        answer: 'a',
        explanation: '化学かいろは、鉄が空気中の酸素と結びつく（酸化する）ときに出る熱を利用しています。食塩水と活性炭は、反応を速めるはたらきをします。',
        hint: '袋をあけて空気にふれると、あたたかくなるね。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp9: 質量保存の法則（ミニプリント「質量保存の法則①・②」「銅４：１を見つける」） ----
  const chemMp9 = {
    id: 'chemical-change-mp9', areaId: 'reaction', free: true, title: 'プリント 9: 質量保存の法則', minutes: 5, concepts: ['ch-conservation'],
    lessons: [
      {
        id: 'chemical-change-mp9-c1',
        anim: 'ch-precipitate-mass',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '化学変化の前後で、物質全体の質量は変わりません。これを**質量保存の法則**といいます。うすい硫酸と塩化バリウム水溶液を混ぜると白い**沈殿**ができますが、全体の質量は同じです。原子の種類と数が変わらないからです。',
        // 混ぜる前と混ぜた後の質量
        figure: scene([
          { type: 'text', x: 80, y: 40, text: '混ぜる前', size: 13, anchor: 'middle' },
          { type: 'beaker', x: 55, y: 168, width: 44, height: 60, level: 0.5 },
          { type: 'beaker', x: 105, y: 168, width: 44, height: 60, level: 0.5 },
          { type: 'rect', x: 10, y: 170, width: 140, height: 24, fill: 'glass' },
          { type: 'text', x: 80, y: 188, text: '100.0 g', size: 14, anchor: 'middle', bold: true },
          { type: 'arrow', x1: 152, y1: 130, x2: 172, y2: 130, width: 2 },
          { type: 'text', x: 244, y: 40, text: '混ぜた後', size: 13, anchor: 'middle' },
          { type: 'text', x: 244, y: 60, text: '白い沈殿ができる', size: 12, anchor: 'middle' },
          { type: 'beaker', x: 230, y: 168, width: 60, height: 70, level: 0.6 },
          { type: 'ellipse', x: 230, y: 160, rx: 22, ry: 6, fill: 'white', stroke: 'line' },
          { type: 'beaker', x: 292, y: 168, width: 36, height: 50, level: 0 },
          { type: 'rect', x: 174, y: 170, width: 140, height: 24, fill: 'glass' },
          { type: 'text', x: 244, y: 188, text: '100.0 g', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 226, text: '全体の質量は変わらない（質量保存の法則）', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-mp9-c2',
        anim: 'ch-open-container',   // 動く図の使い回し（js/anim-chem.js）。figure は静止図として残す
        text: '密閉した容器の中で塩酸と炭酸水素ナトリウムを反応させると、二酸化炭素が発生しても質量は変わりません。ふたをゆるめると気体が出ていき、質量は小さくなります。また、銅の質量とできる酸化銅の質量は**比例**します。',
        // ふたをしたまま と ふたをゆるめる
        figure: scene([
          { type: 'rect', x: 55, y: 58, width: 40, height: 12, fill: 'gray' },
          { type: 'rect', x: 40, y: 70, width: 70, height: 100, rx: 10, fill: 'glass', stroke: 'line' },
          { type: 'rect', x: 20, y: 172, width: 110, height: 22, fill: 'white' },
          { type: 'text', x: 75, y: 188, text: '80.0 g', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 75, y: 214, text: 'ふたをしたまま', size: 12, anchor: 'middle' },
          { type: 'text', x: 75, y: 232, text: '→ 変わらない', size: 12, anchor: 'middle' },
          { type: 'rect', x: 225, y: 52, width: 40, height: 10, fill: 'gray' },
          { type: 'rect', x: 210, y: 70, width: 70, height: 100, rx: 10, fill: 'glass', stroke: 'line' },
          { type: 'arrow', x1: 270, y1: 66, x2: 292, y2: 36, color: 'gray', width: 2 },
          { type: 'text', x: 316, y: 26, text: '二酸化炭素', size: 12, anchor: 'end' },
          { type: 'rect', x: 190, y: 172, width: 110, height: 22, fill: 'white' },
          { type: 'text', x: 245, y: 188, text: '79.6 g', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 245, y: 214, text: 'ふたをゆるめる', size: 12, anchor: 'middle' },
          { type: 'text', x: 245, y: 232, text: '→ 小さくなる', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp9-w1', concept: 'ch-conservation',
      prompt: '予想しよう。ふたをした容器の中でスチールウールを燃やすと、容器全体の質量はどうなると思う？',
      options: ['変わらない', '増える', '減る'],
      answer: 'a',
      explanation: '容器の中の酸素と鉄が結びつくだけで、外から物質が出入りしないので、全体の質量は変わりません。質量保存の法則を復習しよう。',
      hint: '容器の外とのあいだで、物質は出入りしているかな。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp9-p1', concept: 'ch-conservation',
        prompt: '銅の粉末の質量を 0.20 g、0.40 g、0.60 g、0.80 g と変えて加熱すると、酸化銅の質量は 0.25 g、0.50 g、0.75 g、1.00 g になりました。銅の質量と酸化銅の質量の関係を表すグラフは、ア〜ウのどの形になる？',
        figure: GRAPH_SHAPE_Q,
        answer: 'r2',
        explanation: '銅の質量が 2 倍、3 倍になると、酸化銅の質量も 2 倍、3 倍になるので、グラフは原点を通る直線（イ）になります。銅の質量と酸化銅の質量は比例しています。',
        hint: '0.20 g → 0.25 g、0.40 g → 0.50 g と、同じ割合で増えているね。',
      }),
      fill({
        id: 'chemical-change-mp9-t1', concept: 'ch-conservation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '化学変化の前後で、物質全体の質量が変わらないことを[b1]という。また、銅の質量とできる酸化銅の質量は[b2]する。',
        blanks: [
          word('b1', ['質量保存の法則', '化学反応式', '定比例の式'], '質量保存の法則'),
          word('b2', ['比例', '反比例', '一定に'], '比例'),
        ],
        explanation: '全体の質量が変わらないことを**質量保存の法則**といいます。銅と酸化銅の質量は**比例**し、その比は 4：5 です。',
        hint: 'グラフが原点を通る直線になる関係だよ。',
      }),
      choice({
        id: 'chemical-change-mp9-p2', concept: 'ch-conservation',
        prompt: 'うすい硫酸に塩化バリウム水溶液を加えると、白い沈殿ができました。反応後の全体の質量は、反応前と比べてどうなる？',
        options: ['同じ', '重くなる', '軽くなる'],
        answer: 'a',
        explanation: '沈殿ができても、気体が出ていかないので、全体の質量は変わりません。',
        hint: '反応で気体は出ていったかな。',
      }),
      choice({
        id: 'chemical-change-mp9-p3', concept: 'ch-conservation',
        prompt: '密閉した容器の中で、うすい塩酸と炭酸水素ナトリウムを混ぜました。このとき起こることはどれ？',
        options: ['二酸化炭素が発生する', '酸素が発生する', '白い沈殿ができる'],
        answer: 'a',
        explanation: 'うすい塩酸と炭酸水素ナトリウムが反応すると、二酸化炭素が発生します。密閉しているので、気体は容器の外へ出ていきません。',
        hint: 'ふくらし粉に酸を加えたときに出る気体だよ。',
      }),
      choice({
        id: 'chemical-change-mp9-p4', concept: 'ch-conservation',
        prompt: '上の反応のあと、容器のふたをゆるめてから質量をはかると、どうなる？',
        options: ['小さくなる', '大きくなる', '変わらない'],
        answer: 'a',
        explanation: 'ふたをゆるめると、発生した二酸化炭素が容器の外へ出ていくので、その分だけ質量が小さくなります。',
        hint: '気体が出ていくと、質量はどうなるかな。',
      }),
      fill({
        id: 'chemical-change-mp9-p5', concept: 'ch-conservation',
        prompt: '空らんに入る数を入れよう。',
        text: '銅 0.80 g を完全に酸化させると、酸化銅が 1.00 g できた。銅と結びついた酸素は[b1]である。',
        blanks: [number('b1', 0.2, 0, 'g')],
        explanation: '酸化銅の質量から銅の質量を引くと、1.00 − 0.80 ＝ 0.20 g です。銅：酸素 ＝ 0.80：0.20 ＝ 4：1 になっています。',
        hint: '増えた質量が、結びついた酸素の質量だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-mp9-r1', concept: 'ch-conservation',
        prompt: '銅 0.20 g → 酸化銅 0.25 g、銅 0.40 g → 酸化銅 0.50 g、銅 0.60 g → 酸化銅 0.75 g という結果から分かることはどれ？',
        options: ['銅の質量と酸化銅の質量は比例する', '銅が増えると酸化銅は減る', '酸化銅の質量はいつも同じ'],
        answer: 'a',
        explanation: '銅の質量が 2 倍、3 倍になると、酸化銅の質量も 2 倍、3 倍になっているので、比例しています。',
        hint: '銅の質量を 2 倍にすると、酸化銅はどうなっているかな。',
      }),
      fill({
        id: 'chemical-change-mp9-r2', concept: 'ch-conservation',
        prompt: '空らんに入る数を入れよう。',
        text: '銅 0.40 g から酸化銅が 0.50 g できたとき、銅と結びついた酸素は[b1]である。',
        blanks: [number('b1', 0.1, 0, 'g')],
        explanation: '0.50 − 0.40 ＝ 0.10 g です。',
        hint: '酸化銅の質量から、銅の質量を引こう。',
      }),
      choice({
        id: 'chemical-change-mp9-r3', concept: 'ch-conservation',
        prompt: 'ふたのない容器で、うすい塩酸と炭酸水素ナトリウムを混ぜると、反応後の質量が小さくなりました。その理由はどれ？',
        options: ['発生した二酸化炭素が空気中へ出ていったから', '原子がなくなったから', '水がすべて蒸発したから'],
        answer: 'a',
        explanation: '発生した二酸化炭素が出ていった分だけ、はかる質量が小さくなりました。出ていった気体もふくめると、全体の質量は変わっていません。',
        hint: '化学変化で原子はなくならないよ。',
      }),
    ],
  };

  // ---- ステージ chemical-change-mp10: 質量の比の計算（ミニプリント「４：１の計算（①をふくむ）」「3：2の計算」） ----
  const chemMp10 = {
    id: 'chemical-change-mp10', areaId: 'reaction', free: true, title: 'プリント 10: 質量の比の計算', minutes: 5, concepts: ['ch-conservation'],
    lessons: [
      {
        id: 'chemical-change-mp10-c1',
        text: '銅と酸素は**質量の比** 4：1 で結びつき、酸化銅はその和の 5 にあたります。銅 8 g なら、比の 1 つ分は 8 ÷ 4 ＝ 2 g なので、酸素 2 g、酸化銅 10 g です。比の 1 つ分を求めると、どの量も計算できます。',
        figure: scene(tapeItems([[4, 1, 60]]).concat([
          { type: 'line', points: [[70, 98], [190, 98]], width: 2 },
          { type: 'text', x: 130, y: 116, text: '銅 4', size: 13, anchor: 'middle' },
          { type: 'line', points: [[190, 98], [220, 98]], color: 'blue', width: 2 },
          { type: 'text', x: 205, y: 116, text: '酸素 1', size: 13, anchor: 'middle' },
          { type: 'line', points: [[70, 136], [220, 136]], width: 2 },
          { type: 'text', x: 145, y: 156, text: '酸化銅 5', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 200, text: '銅 8 g → 酸素 2 g → 酸化銅 10 g', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 224, text: '比の 1 つ分 ＝ 8 ÷ 4 ＝ 2 g', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'chemical-change-mp10-c2',
        text: 'マグネシウムと酸素は 3：2 の質量の比で結びつき、**酸化マグネシウム**は 5 にあたります。加熱が足りず一部が反応しなかったときは、増えた質量（結びついた酸素）から反応したマグネシウムを求め、全体から引きます。',
        figure: scene(tapeItems([[3, 2, 60]]).concat([
          { type: 'line', points: [[70, 98], [160, 98]], width: 2 },
          { type: 'text', x: 115, y: 116, text: 'マグネシウム 3', size: 12, anchor: 'middle' },
          { type: 'line', points: [[160, 98], [220, 98]], color: 'blue', width: 2 },
          { type: 'text', x: 190, y: 116, text: '酸素 2', size: 12, anchor: 'middle' },
          { type: 'line', points: [[70, 136], [220, 136]], width: 2 },
          { type: 'text', x: 145, y: 156, text: '酸化マグネシウム 5', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 200, text: '例: 6.0 g → 9.0 g（酸素 3.0 g が結びついた）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '反応 4.5 g（3.0 × 3 ÷ 2）、残り 1.5 g', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'chemical-change-mp10-w1', concept: 'ch-conservation',
      prompt: '予想しよう。銅 4 g と結びつく酸素は 1 g です。銅を 2 倍の 8 g にすると、結びつく酸素は何 g だと思う？',
      options: ['2 g', '1 g', '4 g'],
      answer: 'a',
      explanation: '結びつく質量は比例するので、銅を 2 倍にすると酸素も 2 倍の 2 g です。比を使った計算を練習しよう。',
      hint: '銅が 2 倍になると、酸素も…？',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-mp10-p1', concept: 'ch-conservation',
        prompt: '金属と酸素が結びつく質量の比をテープ図で表しました（灰色: 金属、水色: 酸素）。銅と酸素が結びつく質量の比を正しく表しているのはア〜エのどれ？',
        figure: TAPE_Q,
        answer: 'r2',
        explanation: '銅：酸素 ＝ 4：1 なので、灰色 4 つと水色 1 つのイです。マグネシウム：酸素 ＝ 3：2 はアです。',
        hint: '銅は酸素の 4 倍の質量だよ。',
      }),
      fill({
        id: 'chemical-change-mp10-t1', concept: 'ch-conservation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '一方の量が 2 倍、3 倍になると、もう一方の量も 2 倍、3 倍になる関係を[b1]という。金属の質量と、結びつく酸素の質量はこの関係にある。',
        blanks: [word('b1', ['比例', '反比例', '保存'], '比例')],
        explanation: '金属の質量と結びつく酸素の質量は**比例**するので、比を使って計算できます。',
        hint: 'グラフが原点を通る直線になる関係だよ。',
      }),
      fill({
        id: 'chemical-change-mp10-p2', concept: 'ch-conservation',
        prompt: '銅と酸素は 4：1 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: '銅 8 g と結びつく酸素は[b1]、銅 2.4 g と結びつく酸素は[b2]である。',
        blanks: [number('b1', 2, 0, 'g'), number('b2', 0.6, 0, 'g')],
        explanation: '酸素は銅の 4 分の 1 なので、8 ÷ 4 ＝ 2 g、2.4 ÷ 4 ＝ 0.6 g です。',
        hint: '銅の質量を 4 でわろう。',
      }),
      fill({
        id: 'chemical-change-mp10-p3', concept: 'ch-conservation',
        prompt: '銅と酸素は 4：1 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: '酸素 2 g と結びつく銅は[b1]、酸素 0.8 g と結びつく銅は[b2]である。',
        blanks: [number('b1', 8, 0, 'g'), number('b2', 3.2, 0, 'g')],
        explanation: '銅は酸素の 4 倍なので、2 × 4 ＝ 8 g、0.8 × 4 ＝ 3.2 g です。',
        hint: '酸素の質量を 4 倍しよう。',
      }),
      fill({
        id: 'chemical-change-mp10-p4', concept: 'ch-conservation',
        prompt: '銅と酸素は 4：1 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: '銅 12 g を完全に酸化させるとできる酸化銅は[b1]、銅 3.6 g からできる酸化銅は[b2]である。',
        blanks: [number('b1', 15, 0, 'g'), number('b2', 4.5, 0, 'g')],
        explanation: '銅：酸化銅 ＝ 4：5 なので、12 ÷ 4 × 5 ＝ 15 g、3.6 ÷ 4 × 5 ＝ 4.5 g です。',
        hint: '比の 1 つ分を求めてから、5 倍しよう。',
      }),
      fill({
        id: 'chemical-change-mp10-p5', concept: 'ch-conservation',
        prompt: '銅と酸素は 4：1 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: '酸化銅 15 g をつくるのに必要な銅は[b1]、25 g では[b2]、6.5 g では[b3]である。',
        blanks: [number('b1', 12, 0, 'g'), number('b2', 20, 0, 'g'), number('b3', 5.2, 0, 'g')],
        explanation: '銅：酸化銅 ＝ 4：5 なので、銅は酸化銅の 5 分の 4 です。15 ÷ 5 × 4 ＝ 12 g、25 ÷ 5 × 4 ＝ 20 g、6.5 ÷ 5 × 4 ＝ 5.2 g です。',
        hint: '酸化銅を 5 でわって、4 倍しよう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'chemical-change-mp10-r1', concept: 'ch-conservation',
        prompt: '銅と酸素は 4：1 の質量の比で結びつきます。加熱が足りず、一部の銅が反応せずに残りました。残った銅の質量を入れよう。',
        text: '銅 12.0 g → 加熱後 14.0 g のとき[b1]、銅 20.0 g → 24.5 g のとき[b2]、銅 24.0 g → 29.1 g のとき[b3]が残った。',
        blanks: [number('b1', 4.0, 0, 'g'), number('b2', 2.0, 0, 'g'), number('b3', 3.6, 0, 'g')],
        explanation: '増えた質量が結びついた酸素です。酸素 2.0 g → 反応した銅 8.0 g → 残り 12.0 − 8.0 ＝ 4.0 g。酸素 4.5 g → 銅 18.0 g → 残り 2.0 g。酸素 5.1 g → 銅 20.4 g → 残り 3.6 g です。',
        hint: '増えた質量（酸素）を 4 倍すると、反応した銅が分かるよ。',
      }),
      fill({
        id: 'chemical-change-mp10-r2', concept: 'ch-conservation',
        prompt: 'マグネシウムと酸素は 3：2 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: 'マグネシウム 6 g と結びつく酸素は[b1]、マグネシウム 2.4 g と結びつく酸素は[b2]である。',
        blanks: [number('b1', 4, 0, 'g'), number('b2', 1.6, 0, 'g')],
        explanation: '酸素はマグネシウムの 3 分の 2 なので、6 ÷ 3 × 2 ＝ 4 g、2.4 ÷ 3 × 2 ＝ 1.6 g です。',
        hint: 'マグネシウムを 3 でわって、2 倍しよう。',
      }),
      fill({
        id: 'chemical-change-mp10-r3', concept: 'ch-conservation',
        prompt: 'マグネシウムと酸素は 3：2 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: '酸素 6 g と結びつくマグネシウムは[b1]、酸素 0.8 g と結びつくマグネシウムは[b2]である。',
        blanks: [number('b1', 9, 0, 'g'), number('b2', 1.2, 0, 'g')],
        explanation: 'マグネシウムは酸素の 2 分の 3 なので、6 ÷ 2 × 3 ＝ 9 g、0.8 ÷ 2 × 3 ＝ 1.2 g です。',
        hint: '酸素を 2 でわって、3 倍しよう。',
      }),
      figureChoice({
        id: 'chemical-change-mp10-r4', concept: 'ch-conservation',
        prompt: '金属と酸素が結びつく質量の比をテープ図で表しました（灰色: 金属、水色: 酸素）。マグネシウムと酸素が結びつく質量の比を正しく表しているのはア〜エのどれ？',
        figure: TAPE_Q,
        answer: 'r1',
        explanation: 'マグネシウム：酸素 ＝ 3：2 なので、灰色 3 つと水色 2 つのアです。',
        hint: 'マグネシウム 3 に対して酸素 2 だよ。',
      }),
      fill({
        id: 'chemical-change-mp10-r5', concept: 'ch-conservation',
        prompt: 'マグネシウムと酸素は 3：2 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: 'マグネシウム 12 g からできる酸化マグネシウムは[b1]、3.6 g からできる酸化マグネシウムは[b2]である。',
        blanks: [number('b1', 20, 0, 'g'), number('b2', 6, 0, 'g')],
        explanation: 'マグネシウム：酸化マグネシウム ＝ 3：5 なので、12 ÷ 3 × 5 ＝ 20 g、3.6 ÷ 3 × 5 ＝ 6 g です。',
        hint: '比の 1 つ分を求めてから、5 倍しよう。',
      }),
    ],
  };

  // ================================================================
  // 領域 4: ドリル（.ai-tasks/20261121-152500_ドリル問題_共通.md）
  // 問題・解説・図はすべて中学理科の知識から自作。既存の問題とは場面・数値・問い方を変えた。
  // ================================================================

  // 文字だけの四角（カードの図の表などに使う）。lines は [文字, ...]、1 行 18px
  function noteBox(x, y, w, h, lines, o) {
    const opt = o || {};
    const size = opt.size || 13;
    const items = [{ type: 'rect', x, y, width: w, height: h, rx: 6, fill: opt.fill || 'white', stroke: 'line' }];
    const top = y + h / 2 - (lines.length - 1) * 9 + 5;
    lines.forEach((t, i) => items.push({ type: 'text', x: x + w / 2, y: top + i * 18, text: t, size, anchor: 'middle', bold: !!opt.bold && i === 0 }));
    return items;
  }

  // ---- ステージ chemical-change-dr1: 熱分解と電気分解の実験 ----
  const chemDr1 = {
    id: 'chemical-change-dr1', areaId: 'atom', free: true, title: 'ドリル 1: 熱分解と電気分解の実験', minutes: 6, concepts: ['ch-decomposition'],
    lessons: [
      {
        id: 'chemical-change-dr1-c1',
        text: '黒色の**酸化銀**を加熱すると、酸素が出て白っぽい**銀**が残ります。残った物質は、みがくと光り、電流が流れ、たたくとうすく広がります。これは金属の性質です。出てきた気体に火のついた線香を入れると、炎を上げて燃えます。',
        figure: scene([
          { type: 'tube', x: 70, y: 110, height: 90, tilt: 100, level: 0.2, liquid: '#4A4A4A' },
          { type: 'flame', x: 90, y: 170 },
          { type: 'text', x: 70, y: 84, text: '酸化銀（黒色）', size: 13, anchor: 'middle' },
          { type: 'line', points: [[160, 125], [210, 125]], width: 3, arrow: true },
          { type: 'text', x: 185, y: 112, text: '加熱', size: 13, anchor: 'middle' },
          ...noteBox(220, 60, 92, 50, ['銀', '（白っぽい）'], { bold: true }),
          ...noteBox(220, 130, 92, 50, ['酸素', '（気体）'], { bold: true }),
          { type: 'text', x: 160, y: 228, text: '酸化銀 → 銀 ＋ 酸素', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-dr1-c2',
        text: '分解でできた物質は、もとの物質とは性質がちがいます。何ができたかは、性質で確かめます。二酸化炭素は**石灰水**、水は**塩化コバルト紙**、酸素は火のついた線香、水素はマッチの火で調べます。',
        figure: scene([
          { type: 'text', x: 160, y: 24, text: 'できた物質の調べ方', size: 14, anchor: 'middle', bold: true },
          ...noteBox(10, 36, 120, 44, ['二酸化炭素']), ...noteBox(136, 36, 174, 44, ['石灰水が白くにごる']),
          ...noteBox(10, 86, 120, 44, ['水']), ...noteBox(136, 86, 174, 44, ['塩化コバルト紙が', '青 → 赤（桃色）']),
          ...noteBox(10, 136, 120, 44, ['酸素']), ...noteBox(136, 136, 174, 44, ['線香が炎を上げて燃える']),
          ...noteBox(10, 186, 120, 44, ['水素']), ...noteBox(136, 186, 174, 44, ['ポンと音を立てて燃える']),
        ]),
      },
      {
        id: 'chemical-change-dr1-c3',
        text: '水の電気分解では、陰極に水素、陽極に酸素が、体積の比 2：1 で集まります。電流を流す時間を長くすると、集まる気体の量はふえますが、体積の比はいつも約 2：1 です。',
        figure: electrolysisScene([
          { type: 'text', x: 88, y: 30, text: '水素', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 218, y: 30, text: '酸素', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 153, y: 120, text: '2 ： 1', size: 16, anchor: 'middle', bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-dr1-w1', concept: 'ch-decomposition',
      prompt: '予想しよう。黒色の酸化銀の粉を試験管に入れて加熱すると、粉の色はどうなると思う？',
      options: ['白っぽい色に変わる', 'もっと濃い黒色になる', '青色に変わる'],
      answer: 'a',
      explanation: '酸化銀は加熱すると酸素を出して、白っぽい銀に変わります。物質が分かれる変化を、実験の手順といっしょに見ていこう。',
      hint: '酸化銀から、ある気体が出ていくよ。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-dr1-p1', concept: 'ch-decomposition',
        prompt: '酸化銀を加熱して出た気体を、試験管に集めました。この気体が酸素だと確かめる方法はどれ？ ア 火のついた線香を入れる、イ 石灰水を入れてふる、ウ 塩化コバルト紙をつける。',
        figure: scene([
          { type: 'tube', x: 55, y: 190, height: 110, level: 0 },
          { type: 'line', points: [[55, 60], [55, 120]], color: 'brown', width: 4 },
          { type: 'circle', x: 55, y: 122, r: 4, fill: 'orange', stroke: 'none' },
          { type: 'tube', x: 160, y: 190, height: 110, level: 0.35, liquid: 'glass' },
          { type: 'tube', x: 265, y: 190, height: 110, level: 0 },
          { type: 'rect', x: 258, y: 64, width: 14, height: 44, fill: 'blue', stroke: 'ink' },
          { type: 'text', x: 55, y: 214, text: '火のついた線香', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 214, text: '石灰水', size: 12, anchor: 'middle' },
          { type: 'text', x: 265, y: 214, text: '塩化コバルト紙', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 55, y: 32, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 32, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 32, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '酸素には物を燃やすはたらきがあるので、火のついた線香を入れると炎を上げて燃えます。石灰水は二酸化炭素、塩化コバルト紙は水を調べるときに使います。',
        hint: '酸素には、物を燃やすはたらきがあるよ。',
      }),
      fill({
        id: 'chemical-change-dr1-t1', concept: 'ch-decomposition', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水にふれると、青色から赤色（桃色）に変わる紙を[b1]という。',
        blanks: [word('b1', ['塩化コバルト紙', 'リトマス紙', 'ろ紙'], '塩化コバルト紙')],
        explanation: '**塩化コバルト紙**は、水にふれると青色から赤色（桃色）に変わります。分解で水ができたかを調べるときに使います。',
        hint: '水を調べるための紙だよ。',
      }),
      choice({
        id: 'chemical-change-dr1-p2', concept: 'ch-decomposition',
        prompt: '酸化銀を加熱した後に残った白っぽい固体について、正しいものはどれ？',
        options: ['みがくと光り、電流が流れる', '水にとけて、赤色の液になる', 'もろく、たたくとくだける'],
        answer: 'a',
        explanation: '残った固体は銀です。みがくと光る、電流が流れる、たたくとうすく広がる、という金属の性質を示します。',
        hint: '酸化銀から酸素が出ていくと、何が残るかな。',
      }),
      fill({
        id: 'chemical-change-dr1-p3', concept: 'ch-decomposition',
        prompt: '酸化銀 2.9 g を、気体が出なくなるまで加熱すると、残った銀は 2.7 g でした。空らんに入る数を入れよう。',
        text: '出ていった酸素の質量は[b1]である。',
        blanks: [number('b1', 0.2, 0, 'g')],
        explanation: '酸化銀は銀と酸素に分かれ、酸素は気体として出ていきます。へった分が酸素なので、2.9 − 2.7 ＝ 0.2 g です。',
        hint: '加熱の前と後の質量の差を考えよう。',
      }),
      figureChoice({
        id: 'chemical-change-dr1-p4', concept: 'ch-decomposition',
        prompt: '水を電気分解して、ア（電源の−極側の管）とイ（＋極側の管）に気体が集まりました。酸素が集まっているのはア・イのどちら？',
        figure: electrolysisScene([
          { type: 'region', id: 'r1', x: 40, y: 70, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 270, y: 56, r: 22, label: 'イ' },
        ]),
        answer: 'r2',
        explanation: '陽極（＋極側）のイに集まるのが酸素で、陰極（−極側）のアには水素が集まります。体積は水素：酸素 ＝ 約 2：1 なので、気体の少ないイが酸素です。',
        hint: '陽極は電源の＋極につないだ電極だよ。気体の量もくらべよう。',
      }),
      choice({
        id: 'chemical-change-dr1-p5', concept: 'ch-decomposition',
        prompt: '炭酸水素ナトリウムの加熱で出た気体を試験管に集めるとき、はじめに出てくる気体は使わないのはなぜ？',
        options: ['装置の中にあった空気が多くまざるから', 'はじめは水素が出てくるから', 'はじめの気体は熱すぎるから'],
        answer: 'a',
        explanation: 'はじめに出てくる気体には、試験管やガラス管の中にあった空気が多くまざっています。しばらくしてから集めると、調べたい気体だけを集められます。',
        hint: '加熱する前、試験管の中には何が入っていたかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-dr1-r1', concept: 'ch-decomposition', term: true,
        prompt: '次の説明に合う言葉はどれ？「二酸化炭素を通すと、白くにごる液」',
        options: ['石灰水', 'フェノールフタレイン液', '食塩水'],
        answer: 'a',
        explanation: '**石灰水**は、二酸化炭素を通すと白くにごります。炭酸水素ナトリウムの加熱で出る気体を調べるときに使います。',
        hint: '炭酸水素ナトリウムの実験で、ガラス管の先を入れていた液だよ。',
      }),
      fill({
        id: 'chemical-change-dr1-r2', concept: 'ch-decomposition',
        prompt: '水を電気分解すると、陰極に気体が 12 cm³ 集まりました。空らんに入る数を入れよう。',
        text: 'このとき陽極に集まった気体は、およそ[b1]である。',
        blanks: [number('b1', 6, 0, 'cm³')],
        explanation: '陰極には水素、陽極には酸素が、体積の比 2：1 で集まります。酸素は水素の半分なので、12 ÷ 2 ＝ 6 cm³ です。',
        hint: '陽極の気体は、陰極の気体の何分の 1 かな。',
      }),
      choice({
        id: 'chemical-change-dr1-r3', concept: 'ch-decomposition',
        prompt: '酸化銀を試験管で加熱しました。試験管の中の粉の質量は、加熱の前と比べてどうなる？',
        options: ['小さくなる', '大きくなる', '変わらない'],
        answer: 'a',
        explanation: '酸化銀は銀と酸素に分かれ、酸素は気体として試験管の外へ出ていきます。そのため、残った粉（銀）の質量は小さくなります。',
        hint: '分解でできた酸素は、どこへ行くかな。',
      }),
      choice({
        id: 'chemical-change-dr1-r4', concept: 'ch-decomposition',
        prompt: '次のうち、電気分解の例はどれ？',
        options: ['水に電流を流して水素と酸素に分ける', '酸化銀を加熱して銀と酸素に分ける', '炭酸水素ナトリウムを加熱する'],
        answer: 'a',
        explanation: '電流を流して物質を分けるのが電気分解です。加熱して分けるのは熱分解なので、酸化銀や炭酸水素ナトリウムの加熱は熱分解です。',
        hint: '何を使って物質を分けているかを見よう。',
      }),
    ],
  };

  // ---- ステージ chemical-change-dr2: 原子・分子と単体・化合物 ----
  // 周期表のはじめの 3 行（金属の元素は灰色）
  const PT_ROWS = [
    ['H', '', '', '', '', '', '', 'He'],
    ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'],
    ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'],
  ];
  const PT_METALS = ['Li', 'Be', 'Na', 'Mg', 'Al'];

  const chemDr2 = {
    id: 'chemical-change-dr2', areaId: 'atom', free: true, title: 'ドリル 2: 原子・分子と単体・化合物', minutes: 6, concepts: ['ch-atom', 'ch-formula'],
    lessons: [
      {
        id: 'chemical-change-dr2-c1',
        text: '元素は 118 種類が知られていて、**周期表**にまとめられています。周期表では、性質の似た元素がたての列に並びます。元素の多くは金属の元素で、金属でない元素は表の右上のほうに集まっています。',
        figure: scene([
          { type: 'text', x: 160, y: 34, text: '周期表（はじめの 3 行）', size: 14, anchor: 'middle', bold: true },
          ...PT_ROWS.flatMap((row, r) => row.map((sym, c) => sym === '' ? null : {
            type: 'rect', x: 16 + c * 36, y: 56 + r * 44, width: 36, height: 40,
            fill: PT_METALS.includes(sym) ? 'rock' : 'white', label: sym,
          }).filter(Boolean)),
          { type: 'text', x: 160, y: 210, text: '灰色: 金属の元素　白: 金属でない元素', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 230, text: 'たての列には性質の似た元素が並ぶ', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-dr2-c2',
        text: '1 種類の元素でできた物質を**単体**、2 種類以上の元素でできた物質を**化合物**といいます。どちらにも、分子をつくる物質と、分子をつくらない物質があります。',
        figure: scene([
          ...noteBox(78, 20, 114, 36, ['分子をつくる'], { fill: 'glass' }),
          ...noteBox(196, 20, 118, 36, ['分子をつくらない'], { fill: 'glass' }),
          ...noteBox(6, 60, 68, 76, ['単体'], { fill: 'glass', bold: true }),
          ...noteBox(6, 140, 68, 76, ['化合物'], { fill: 'glass', bold: true }),
          ...noteBox(78, 60, 114, 76, ['酸素 O₂', '水素 H₂']),
          ...noteBox(196, 60, 118, 76, ['鉄 Fe', '銅 Cu']),
          ...noteBox(78, 140, 114, 76, ['水 H₂O', '二酸化炭素 CO₂']),
          ...noteBox(196, 140, 118, 76, ['塩化ナトリウム', 'NaCl']),
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-dr2-w1', concept: 'ch-atom',
      prompt: '予想しよう。いま知られている元素の種類の数に近いのはどれだと思う？',
      options: ['120 種類ほど', '10 種類ほど', '1 万種類ほど'],
      answer: 'a',
      explanation: '元素は 118 種類が知られています。この元素の組み合わせで、身のまわりのたくさんの物質ができています。',
      hint: '元素記号の表を思い出そう。物質の種類よりずっと少ないよ。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-dr2-p1', concept: 'ch-formula',
        prompt: 'ア 酸素、イ 銅、ウ 水、エ 塩化ナトリウムのようすを、原子のモデルで表しました。分子をつくらない化合物はア〜エのどれ？',
        figure: scene([
          ...[42, 122, 202, 280].map(cx => ({ type: 'rect', x: cx - 38, y: 50, width: 76, height: 96, rx: 6, fill: 'white', stroke: 'line' })),
          ...molO2(42, 76), ...molO2(42, 120),
          ...[98, 122, 146].flatMap(x => [atom(x, 86, 'Cu', 12), atom(x, 110, 'Cu', 12)]),
          ...molH2O(202, 68), ...molH2O(202, 108),
          atom(256, 86, 'Na', 12), atom(280, 86, 'Cl', 12), atom(304, 86, 'Na', 12),
          atom(256, 110, 'Cl', 12), atom(280, 110, 'Na', 12), atom(304, 110, 'Cl', 12),
          { type: 'region', id: 'r1', x: 42, y: 176, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 122, y: 176, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 202, y: 176, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 280, y: 176, r: 22, label: 'エ' },
          { type: 'text', x: 160, y: 226, text: '丸の中の記号は原子の種類', size: 12, anchor: 'middle' },
        ]),
        answer: 'r4',
        explanation: '塩化ナトリウム（エ）は、ナトリウムと塩素の 2 種類の元素でできた化合物で、分子をつくらずに原子が規則正しく並んでいます。銅（イ）は分子をつくらない単体、酸素（ア）は分子をつくる単体、水（ウ）は分子をつくる化合物です。',
        hint: '2 種類の原子が、まとまりをつくらずに並んでいるものをさがそう。',
      }),
      fill({
        id: 'chemical-change-dr2-t1', concept: 'ch-atom', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '元素を決まった順に並べ、性質の似た元素がたての列に並ぶようにした表を[b1]という。',
        blanks: [word('b1', ['周期表', '元素記号', '化学式'], '周期表')],
        explanation: '元素を整理した表を**周期表**といいます。たての同じ列には、性質の似た元素が並びます。',
        hint: '「周期」という言葉が入るよ。',
      }),
      choice({
        id: 'chemical-change-dr2-p2', concept: 'ch-formula',
        prompt: '次のうち、2 つとも単体である組み合わせはどれ？',
        options: ['水素と銀', '水と銀', '二酸化炭素と酸素', 'アンモニアと鉄'],
        answer: 'a',
        explanation: '水素 H₂ と銀 Ag は、どちらも 1 種類の元素でできた単体です。水・二酸化炭素・アンモニアは 2 種類以上の元素でできた化合物です。',
        hint: '化学式に出てくる元素記号が 1 種類かどうかを考えよう。',
      }),
      choice({
        id: 'chemical-change-dr2-p3', concept: 'ch-formula',
        prompt: '水 H₂O が化合物に分けられる理由として、正しいものはどれ？',
        options: ['2 種類の元素でできているから', '分子をつくる物質だから', 'ふつうの温度で液体だから'],
        answer: 'a',
        explanation: '化合物かどうかは、元素の種類の数で決まります。水は水素と酸素の 2 種類の元素でできているので化合物です。分子をつくる単体（酸素など）もあるので、分子かどうかでは決まりません。',
        hint: '単体と化合物は、何の数で分けたかな。',
      }),
      fill({
        id: 'chemical-change-dr2-p4', concept: 'ch-formula',
        prompt: 'アンモニア NH₃ の分子が 2 個あります。空らんに入る数を入れよう。',
        text: 'この 2 個の分子にふくまれる水素原子は、全部で[b1]である。',
        blanks: [number('b1', 6, 0, '個')],
        explanation: 'NH₃ の分子 1 個には、水素原子が 3 個あります。分子が 2 個なので、3 × 2 ＝ 6 個です。',
        hint: 'H の右下の数字が、分子 1 個の中の水素原子の数だよ。',
      }),
      choice({
        id: 'chemical-change-dr2-p5', concept: 'ch-atom',
        prompt: '原子 1 個の質量について、正しいものはどれ？',
        options: ['種類で決まり、水素原子がいちばん軽い', 'どの種類の原子も同じ質量', '化学変化のたびに質量が変わる'],
        answer: 'a',
        explanation: '原子の質量は種類ごとに決まっていて、化学変化で変わることはありません。すべての原子の中で、水素原子がいちばん軽い原子です。',
        hint: '原子の性質の 1 つに、質量のことがあったね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-dr2-r1', concept: 'ch-formula', term: true,
        prompt: '次の説明に合う言葉はどれ？「2 種類以上の元素でできている物質」',
        options: ['化合物', '単体', '混合物'],
        answer: 'a',
        explanation: '2 種類以上の元素でできた物質を**化合物**といいます。1 種類の元素でできた物質は単体です。混合物は、いくつかの物質が混ざったものです。',
        hint: '水や二酸化炭素は、この仲間だよ。',
      }),
      choice({
        id: 'chemical-change-dr2-r2', concept: 'ch-atom',
        prompt: '周期表で、たての同じ列に並んでいる元素について、正しいものはどれ？',
        options: ['性質がよく似ている', '原子の質量が同じ', '同じ元素記号で表す'],
        answer: 'a',
        explanation: '周期表は、性質の似た元素がたての列にそろうように並べてあります。原子の質量や元素記号は、元素ごとにちがいます。',
        hint: '周期表は、何がそろうように並べた表だったかな。',
      }),
      figureChoice({
        id: 'chemical-change-dr2-r3', concept: 'ch-atom',
        prompt: 'ア Na（ナトリウム）、イ Zn（亜鉛）、ウ S（硫黄）、エ Ag（銀）の元素記号のカードです。金属でない元素はア〜エのどれ？',
        figure: scene([
          { type: 'text', x: 160, y: 40, text: '元素記号のカード', size: 13, anchor: 'middle' },
          ...[['Na', 46], ['Zn', 122], ['S', 198], ['Ag', 274]].map(([sym, cx]) => ({
            type: 'rect', x: cx - 28, y: 64, width: 56, height: 60, rx: 6, fill: 'white', stroke: 'line', label: sym,
          })),
          { type: 'region', id: 'r1', x: 46, y: 170, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 122, y: 170, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 198, y: 170, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 274, y: 170, r: 22, label: 'エ' },
        ]),
        answer: 'r3',
        explanation: '硫黄 S（ウ）は金属でない元素です。ナトリウム・亜鉛・銀は金属の元素です。',
        hint: '黄色い粉の物質をつくる元素はどれかな。',
      }),
      fill({
        id: 'chemical-change-dr2-r4', concept: 'ch-formula',
        prompt: 'メタン CH₄ の分子が 2 個あります。空らんに入る数を入れよう。',
        text: 'この 2 個の分子にふくまれる水素原子は、全部で[b1]である。',
        blanks: [number('b1', 8, 0, '個')],
        explanation: 'CH₄ の分子 1 個には、水素原子が 4 個あります。分子が 2 個なので、4 × 2 ＝ 8 個です。',
        hint: 'H の右下の数字を見よう。',
      }),
    ],
  };

  // ---- ステージ chemical-change-dr3: 化学式と化学反応式 ----
  const chemDr3 = {
    id: 'chemical-change-dr3', areaId: 'atom', free: true, title: 'ドリル 3: 化学式と化学反応式のつくり方', minutes: 6, concepts: ['ch-formula', 'ch-equation'],
    lessons: [
      {
        id: 'chemical-change-dr3-c1',
        text: '化学反応式は、次の順につくります。① 反応の前と後の物質を、ことばの式で書く。② それぞれを**化学式**で表す。③ 左右で原子の数が同じになるように、化学式の前に**係数**をつける。係数の 1 は書きません。',
        figure: scene([
          ...noteBox(20, 14, 280, 46, ['① 水素 ＋ 酸素 → 水'], { size: 15 }),
          { type: 'line', points: [[160, 62], [160, 84]], width: 3, arrow: true },
          ...noteBox(20, 88, 280, 46, ['② H₂ ＋ O₂ → H₂O'], { size: 15 }),
          { type: 'line', points: [[160, 136], [160, 158]], width: 3, arrow: true },
          ...noteBox(20, 162, 280, 46, ['③ 2H₂ ＋ O₂ → 2H₂O'], { size: 15, fill: 'sky' }),
          { type: 'text', x: 160, y: 230, text: '③ で左右とも H が 4 個、O が 2 個', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-dr3-c2',
        text: '原子の数をそろえるとき、化学式の右下の小さな数字を変えてはいけません。H₂O を H₂O₂ にすると、別の物質を表してしまいます。数は、化学式の前の**係数**だけで調整します。',
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '変えてよいのは係数だけ', size: 15, anchor: 'middle', bold: true },
          ...noteBox(20, 50, 280, 70, ['2H₂O', '水の分子が 2 個（係数を変えた）'], { fill: 'sky' }),
          ...noteBox(20, 136, 280, 70, ['H₂O₂', '別の物質になる（右下の数字を変えた）']),
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-dr3-w1', concept: 'ch-equation',
      prompt: '予想しよう。水素 ＋ 酸素 → 水 を化学式で H₂ ＋ O₂ → H₂O と書きました。このままで、左右の酸素原子の数は同じ？',
      options: ['左が 2 個、右が 1 個で同じではない', '左右とも 2 個で同じ', '左右とも 1 個で同じ'],
      answer: 'a',
      explanation: '左の O₂ には酸素原子が 2 個、右の H₂O には 1 個しかありません。このずれを係数でそろえるのが、化学反応式づくりの大事な手順です。',
      hint: 'O の右下の数字を、左右で比べてみよう。',
    }),
    problems: [
      drag({
        id: 'chemical-change-dr3-p1', concept: 'ch-equation',
        prompt: '水素と塩素が結びついて塩化水素ができます。H₂ ＋ Cl₂ → HCl の左右の原子の数をそろえるには、係数「2」のカードをどの四角に置けばよい？ 動かして置こう。',
        // 位置はカード（rect）の左上で判定する（js/ui-problems.js の anchorOf）。四角の左上: H₂ の前 (20, 88)、
        // Cl₂ の前 (115, 88)、HCl の前 (220, 88)。正解は HCl の前、不正解例は H₂ の前（200px はなれる）
        figure: scene([
          { type: 'rect', x: 20, y: 88, width: 30, height: 32, fill: 'white', stroke: 'gray' },
          { type: 'text', x: 72, y: 110, text: 'H₂', size: 18, anchor: 'middle' },
          { type: 'text', x: 100, y: 110, text: '＋', size: 18, anchor: 'middle' },
          { type: 'rect', x: 115, y: 88, width: 30, height: 32, fill: 'white', stroke: 'gray' },
          { type: 'text', x: 170, y: 110, text: 'Cl₂', size: 18, anchor: 'middle' },
          { type: 'text', x: 202, y: 110, text: '→', size: 18, anchor: 'middle' },
          { type: 'rect', x: 220, y: 88, width: 30, height: 32, fill: 'white', stroke: 'gray' },
          { type: 'text', x: 280, y: 110, text: 'HCl', size: 18, anchor: 'middle' },
          { type: 'text', x: 160, y: 40, text: '水素 ＋ 塩素 → 塩化水素', size: 14, anchor: 'middle' },
          { type: 'rect', id: 'card', x: 145, y: 170, width: 30, height: 32, fill: 'sky', stroke: 'ink', label: '2' },
        ]),
        draggable: { itemId: 'card' },
        target: { x: 220, y: 88 },
        samples: { correct: { x: 220, y: 88 }, wrong: { x: 20, y: 88 } },
        explanation: '左には H が 2 個、Cl が 2 個あります。右の HCl を 2 個（2HCl）にすると、右も H が 2 個、Cl が 2 個になってそろいます。化学反応式は H₂ ＋ Cl₂ → 2HCl です。',
        hint: '右の HCl には、H と Cl が 1 個ずつしかないよ。',
      }),
      fill({
        id: 'chemical-change-dr3-t1', concept: 'ch-equation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '化学反応式で、化学式の前につけて分子などの数を表す数字を[b1]という。',
        blanks: [word('b1', ['係数', '原子番号', '質量数'], '係数')],
        explanation: '化学式の前の数字を**係数**といいます。係数の 1 は書きません。',
        hint: '2H₂O の「2」のことだよ。',
      }),
      figureChoice({
        id: 'chemical-change-dr3-p2', concept: 'ch-equation',
        prompt: 'マグネシウムの燃焼を、図のような式で書きました。まちがっているのは、ア Mg、イ O₂、ウ MgO₂ のどの部分？',
        figure: scene([
          { type: 'text', x: 160, y: 50, text: 'マグネシウム ＋ 酸素 → 酸化マグネシウム', size: 13, anchor: 'middle' },
          { type: 'text', x: 60, y: 120, text: 'Mg', size: 20, anchor: 'middle' },
          { type: 'text', x: 105, y: 120, text: '＋', size: 20, anchor: 'middle' },
          { type: 'text', x: 150, y: 120, text: 'O₂', size: 20, anchor: 'middle' },
          { type: 'text', x: 200, y: 120, text: '→', size: 20, anchor: 'middle' },
          { type: 'text', x: 260, y: 120, text: 'MgO₂', size: 20, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 60, y: 176, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 150, y: 176, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 176, r: 22, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '酸化マグネシウムの化学式は MgO です（ウがまちがい）。数をそろえるために右下の数字を変えてはいけません。係数を使って 2Mg ＋ O₂ → 2MgO とします。',
        hint: '酸化マグネシウムの化学式を思い出そう。',
      }),
      fill({
        id: 'chemical-change-dr3-p3', concept: 'ch-equation',
        prompt: '2H₂ ＋ O₂ → 2H₂O の反応で、反応後の 2H₂O について考えます。空らんに入る数を入れよう。',
        text: '2H₂O にふくまれる原子は、水素と酸素を合わせて全部で[b1]である。',
        blanks: [number('b1', 6, 0, '個')],
        explanation: 'H₂O 1 個には水素原子 2 個と酸素原子 1 個、合わせて 3 個の原子があります。それが 2 個なので 3 × 2 ＝ 6 個です。',
        hint: 'まず H₂O 1 個の原子の数を数えよう。',
      }),
      fill({
        id: 'chemical-change-dr3-p4', concept: 'ch-equation',
        prompt: '銅と硫黄が結びついて、硫化銅ができます。空らんに入る化学式を選ぼう。',
        text: 'Cu ＋ S → [b1]',
        blanks: [word('b1', ['CuS', 'Cu₂S', 'CuS₂'], 'CuS')],
        explanation: '銅原子 1 個と硫黄原子 1 個が結びつくので、硫化銅は CuS です。左右とも Cu が 1 個、S が 1 個でそろっています。',
        hint: '左の Cu と S の数を数えよう。',
      }),
      choice({
        id: 'chemical-change-dr3-p5', concept: 'ch-formula',
        prompt: '炭酸水素ナトリウムの化学式は NaHCO₃ です。何種類の元素がふくまれている？',
        options: ['4 種類', '3 種類', '6 種類'],
        answer: 'a',
        explanation: 'Na（ナトリウム）、H（水素）、C（炭素）、O（酸素）の 4 種類です。O の右下の 3 は原子の数なので、元素の種類には数えません。',
        hint: '大文字で始まる元素記号を数えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-dr3-r1', concept: 'ch-formula', term: true,
        prompt: '次の説明に合う言葉はどれ？「元素記号と数字を使って、物質を表したもの」',
        options: ['化学式', '化学反応式', '周期表'],
        answer: 'a',
        explanation: 'H₂O や CO₂ のように、元素記号と数字で物質を表したものを**化学式**といいます。化学式を使って化学変化を表した式が化学反応式です。',
        hint: 'H₂O や CO₂ のことだよ。',
      }),
      fill({
        id: 'chemical-change-dr3-r2', concept: 'ch-formula',
        prompt: '炭酸ナトリウムの化学式は Na₂CO₃ です。空らんに入る数を入れよう。',
        text: 'Na₂CO₃ の中にある酸素原子は[b1]である。',
        blanks: [number('b1', 3, 0, '個')],
        explanation: 'O の右下の数字が 3 なので、酸素原子は 3 個です。Na は 2 個、C は 1 個あります。',
        hint: 'O の右下の数字を見よう。',
      }),
      choice({
        id: 'chemical-change-dr3-r3', concept: 'ch-equation',
        prompt: '2NaHCO₃ → Na₂CO₃ ＋ CO₂ ＋ H₂O の左右で、ナトリウム原子 Na の数はそれぞれいくつ？',
        options: ['左右とも 2 個', '左 1 個、右 2 個', '左 2 個、右 1 個'],
        answer: 'a',
        explanation: '左は NaHCO₃ が 2 個なので Na は 2 個、右は Na₂CO₃ の中に Na が 2 個です。化学反応式では、どの原子も左右で同じ数になります。',
        hint: '左は係数の 2 も忘れずにかけよう。',
      }),
      fill({
        id: 'chemical-change-dr3-r4', concept: 'ch-equation',
        prompt: 'うすい過酸化水素水から酸素ができる反応です。空らんに入る化学式を選ぼう。',
        text: '2H₂O₂ → 2H₂O ＋ [b1]',
        blanks: [word('b1', ['O₂', 'O', '2O₂'], 'O₂')],
        explanation: '左は H が 4 個、O が 4 個です。右の 2H₂O に H が 4 個、O が 2 個あるので、残りの O 2 個が酸素分子 O₂ 1 個になります。',
        hint: '左と右で、O の数を比べよう。',
      }),
    ],
  };

  // ---- ステージ chemical-change-dr4: 燃焼と酸化 ----
  const chemDr4 = {
    id: 'chemical-change-dr4', areaId: 'reaction', free: true, title: 'ドリル 4: 燃焼とおだやかな酸化', minutes: 6, concepts: ['ch-oxidation'],
    lessons: [
      {
        id: 'chemical-change-dr4-c1',
        text: 'ろうやエタノールなどの**有機物**は炭素と水素をふくむので、燃えると二酸化炭素と水ができます。炭素だけでできた木炭が燃えると二酸化炭素だけ、水素が燃えると水だけができます。',
        figure: scene([
          ...noteBox(10, 14, 300, 62, ['有機物（ろう・エタノール）', '燃えると → 二酸化炭素 ＋ 水']),
          ...noteBox(10, 88, 300, 62, ['木炭（炭素）', '燃えると → 二酸化炭素']),
          ...noteBox(10, 162, 300, 62, ['水素', '燃えると → 水']),
        ]),
      },
      {
        id: 'chemical-change-dr4-c2',
        text: '金属も酸素と結びつきます。マグネシウムは強い光を出して燃え、白色の**酸化マグネシウム**になります。鉄が空気中でゆっくりさびるのは、熱や光を激しく出さない**おだやかな酸化**です。',
        figure: scene([
          ...noteBox(10, 20, 300, 56, ['マグネシウム → 酸化マグネシウム', '（強い光を出して燃える・白色）']),
          ...noteBox(10, 92, 300, 56, ['鉄（スチールウール）→ 酸化鉄', '（火花を出して燃える・黒っぽい）']),
          ...noteBox(10, 164, 300, 56, ['鉄くぎがさびる', '（おだやかな酸化）']),
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-dr4-w1', concept: 'ch-oxidation',
      prompt: '予想しよう。鉄くぎを水でぬらして、空気中に何日も置いておくと、どうなると思う？',
      options: ['さびて赤茶色っぽくなる', 'とけてなくなる', '金色にかがやく'],
      answer: 'a',
      explanation: '鉄は空気中の酸素と少しずつ結びついて、さびていきます。燃えるときと、ゆっくり進むときの酸化を見ていこう。',
      hint: '古い鉄の道具のようすを思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-dr4-p1', concept: 'ch-oxidation',
        prompt: '集気びんの中で、ア 木炭、イ 水素、ウ スチールウールをそれぞれ燃やしました。燃やした後に石灰水を入れてふると、白くにごるのはどれ？',
        figure: scene([
          { type: 'beaker', x: 55, y: 196, width: 70, height: 110, level: 0 },
          { type: 'beaker', x: 160, y: 196, width: 70, height: 110, level: 0 },
          { type: 'beaker', x: 265, y: 196, width: 70, height: 110, level: 0 },
          { type: 'rect', x: 45, y: 160, width: 20, height: 14, fill: '#4A4A4A' },
          { type: 'flame', x: 55, y: 160 },
          { type: 'flame', x: 160, y: 160 },
          { type: 'ellipse', x: 265, y: 168, rx: 18, ry: 8, fill: 'rock' },
          { type: 'flame', x: 265, y: 160 },
          { type: 'text', x: 55, y: 216, text: '木炭', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 216, text: '水素', size: 12, anchor: 'middle' },
          { type: 'text', x: 265, y: 216, text: 'スチールウール', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 55, y: 40, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 40, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 40, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '木炭は炭素でできているので、燃えると二酸化炭素ができ、石灰水が白くにごります。水素が燃えると水だけ、スチールウール（鉄）が燃えると酸化鉄ができ、二酸化炭素はできません。',
        hint: '炭素をふくむ物質はどれかな。',
      }),
      fill({
        id: 'chemical-change-dr4-t1', concept: 'ch-oxidation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '炭素をふくみ、燃やすと二酸化炭素ができる物質を[b1]という。',
        blanks: [word('b1', ['有機物', '無機物', '酸化物'], '有機物')],
        explanation: 'ろう・エタノール・砂糖など、炭素をふくむ物質を**有機物**といいます。燃やすと二酸化炭素ができます（多くは水素もふくみ、水もできます）。',
        hint: 'ろうやエタノールの仲間だよ。',
      }),
      fill({
        id: 'chemical-change-dr4-p2', concept: 'ch-oxidation',
        prompt: '水素を集気びんの中で燃やしました。空らんに入る言葉を選ぼう。',
        text: '水素が燃えると、[b1]だけができる。',
        blanks: [word('b1', ['水', '二酸化炭素', '酸化鉄'], '水')],
        explanation: '水素は炭素をふくまないので、燃えると酸素と結びついて水だけができます（2H₂ ＋ O₂ → 2H₂O）。',
        hint: '水素の分子には、どんな原子があるかな。',
      }),
      figureChoice({
        id: 'chemical-change-dr4-p3', concept: 'ch-oxidation',
        prompt: '銅の粉 1.20 g を加熱し、冷ましては質量をはかりました。グラフのア〜エは 1〜4 回目の結果です。銅がすべて酸化されたのは、何回目の点からと考えられる？',
        // 横軸: 加熱の回数 0〜4 を x 70〜290（55 ずつ）。縦軸: 質量 1.20〜1.50 g を y 190〜50
        figure: scene([
          ...[['1.20', 190], ['1.30', 143], ['1.40', 97], ['1.50', 50]].flatMap(([v, y]) => [
            { type: 'line', points: [[60, y], [300, y]], color: 'glass', width: 1 },
            { type: 'text', x: 54, y: y + 4, text: v, size: 12, anchor: 'end' },
          ]),
          { type: 'line', points: [[60, 30], [60, 200], [300, 200]], width: 2 },
          ...[0, 1, 2, 3, 4].map(t => ({ type: 'text', x: 70 + 55 * t, y: 218, text: String(t), size: 12, anchor: 'middle' })),
          { type: 'text', x: 8, y: 20, text: '質量〔g〕', size: 12 },
          { type: 'text', x: 310, y: 236, text: '加熱の回数〔回〕', size: 12, anchor: 'end' },
          { type: 'line', points: [[70, 190], [125, 106], [180, 69], [235, 50], [290, 50]], color: 'blue', width: 2 },
          ...[[70, 190], [125, 106], [180, 69], [235, 50], [290, 50]].map(([x, y]) => ({ type: 'circle', x, y, r: 4, fill: 'blue', stroke: 'none' })),
          { type: 'region', id: 'r1', x: 125, y: 106, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 180, y: 69, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 235, y: 50, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 290, y: 50, r: 22, label: 'エ' },
        ]),
        answer: 'r3',
        explanation: '3 回目（ウ）で 1.50 g になり、4 回目も 1.50 g のままです。すべての銅が酸化銅になると、それ以上酸素と結びつかないので、質量はふえなくなります。',
        hint: '質量がふえなくなった、はじめの点をさがそう。',
      }),
      choice({
        id: 'chemical-change-dr4-p4', concept: 'ch-oxidation',
        prompt: 'ろうそくを集気びんの中で燃やすと、びんの内側がくもりました。このくもりから分かることはどれ？',
        options: ['ろうに水素がふくまれている', 'ろうに銅がふくまれている', 'ろうに窒素がふくまれている'],
        answer: 'a',
        explanation: 'くもりは、燃えてできた水です。水ができたのは、ろうにふくまれる水素が酸素と結びついたからです。',
        hint: 'くもりの正体は何かな。それは何と何が結びついてできる？',
      }),
      choice({
        id: 'chemical-change-dr4-p5', concept: 'ch-oxidation',
        prompt: '木炭を燃やすと質量がへり、スチールウールを燃やすと質量がふえます。そのちがいの理由はどれ？',
        options: ['木炭からは気体が、鉄からは固体ができる', '木炭は酸素と結びつかないから', '鉄は燃えると軽くなるから'],
        answer: 'a',
        explanation: 'どちらも酸素と結びつきます。木炭からできる二酸化炭素は気体なので空気中へ出ていき、軽くなります。鉄からできる酸化鉄は固体なので皿に残り、結びついた酸素の分だけ重くなります。',
        hint: 'できた物質が、気体か固体かに注目しよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-dr4-r1', concept: 'ch-oxidation', term: true,
        prompt: '次の説明に合う言葉はどれ？「マグネシウムが燃えてできる白色の物質」',
        options: ['酸化マグネシウム', '炭酸マグネシウム', '硫化マグネシウム'],
        answer: 'a',
        explanation: 'マグネシウムは酸素と結びついて、白色の**酸化マグネシウム**になります（2Mg ＋ O₂ → 2MgO）。',
        hint: '酸素と結びついた物質の名前には「酸化」がつくよ。',
      }),
      choice({
        id: 'chemical-change-dr4-r2', concept: 'ch-oxidation',
        prompt: '次のうち、燃やしても二酸化炭素ができない物質はどれ？',
        options: ['水素', 'ろう', 'エタノール', '木炭'],
        answer: 'a',
        explanation: '二酸化炭素は、炭素が酸素と結びついてできます。水素は炭素をふくまないので、燃えても水だけができます。',
        hint: '炭素をふくまない物質をさがそう。',
      }),
      fill({
        id: 'chemical-change-dr4-r3', concept: 'ch-oxidation',
        prompt: '銅の粉 2.00 g を、質量がふえなくなるまでくり返し加熱すると、2.50 g になりました。空らんに入る数を入れよう。',
        text: '銅と結びついた酸素の質量は[b1]である。',
        blanks: [number('b1', 0.5, 0, 'g')],
        explanation: 'ふえた質量が、結びついた酸素の質量です。2.50 − 2.00 ＝ 0.50 g です。',
        hint: '加熱の前と後の質量の差を求めよう。',
      }),
      choice({
        id: 'chemical-change-dr4-r4', concept: 'ch-oxidation',
        prompt: '鉄くぎがさびる変化と、スチールウールが燃える変化で、共通していることはどれ？',
        options: ['鉄が酸素と結びつく', '鉄が 2 つの物質に分かれる', '熱や光を激しく出す'],
        answer: 'a',
        explanation: 'どちらも鉄が酸素と結びつく酸化です。燃えるときは熱や光を激しく出し（燃焼）、さびるときはゆっくり進みます（おだやかな酸化）。',
        hint: 'どちらも「酸化」の仲間だよ。',
      }),
    ],
  };

  // ---- ステージ chemical-change-dr5: 還元・硫黄との反応・熱の出入り ----
  const chemDr5 = {
    id: 'chemical-change-dr5', areaId: 'reaction', free: true, title: 'ドリル 5: 還元・硫黄との反応・熱の出入り', minutes: 7, concepts: ['ch-oxidation', 'ch-equation', 'ch-conservation'],
    lessons: [
      {
        id: 'chemical-change-dr5-c1',
        text: '酸化銅を**水素**の中で加熱しても、銅ができます（CuO ＋ H₂ → Cu ＋ H₂O）。水素が酸素をうばって水になり、酸化銅は**還元**されます。炭素や水素のように、酸素と結びつきやすい物質が還元に使われます。',
        figure: scene([
          atom(30, 100, 'Cu'), atom(58, 100, 'O'),
          { type: 'text', x: 88, y: 106, text: '＋', size: 18, anchor: 'middle' },
          ...molH2(126, 100),
          { type: 'text', x: 166, y: 106, text: '→', size: 18, anchor: 'middle' },
          atom(198, 100, 'Cu'),
          { type: 'text', x: 228, y: 106, text: '＋', size: 18, anchor: 'middle' },
          ...molH2O(276, 94),
          { type: 'text', x: 44, y: 146, text: '酸化銅', size: 13, anchor: 'middle' },
          { type: 'text', x: 126, y: 146, text: '水素', size: 13, anchor: 'middle' },
          { type: 'text', x: 198, y: 146, text: '銅', size: 13, anchor: 'middle' },
          { type: 'text', x: 276, y: 146, text: '水', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 190, text: '酸化銅は還元され、水素は酸化される', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-dr5-c2',
        text: '銅と硫黄をいっしょに加熱すると、黒色の**硫化銅**ができます（Cu ＋ S → CuS）。鉄と硫黄の反応と同じように、酸素以外の物質と結びつく化学変化もあります。',
        figure: scene([
          atom(50, 100, 'Cu'),
          { type: 'text', x: 90, y: 106, text: '＋', size: 18, anchor: 'middle' },
          atom(130, 100, 'S'),
          { type: 'text', x: 176, y: 106, text: '→', size: 18, anchor: 'middle' },
          atom(230, 100, 'Cu'), atom(258, 100, 'S'),
          { type: 'text', x: 50, y: 146, text: '銅', size: 13, anchor: 'middle' },
          { type: 'text', x: 130, y: 146, text: '硫黄', size: 13, anchor: 'middle' },
          { type: 'text', x: 244, y: 146, text: '硫化銅（黒色）', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 196, text: 'Cu ＋ S → CuS', size: 16, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-dr5-c3',
        text: '化学変化では熱が出入りします。熱を出して温度が上がる**発熱反応**には燃焼などがあり、熱を吸収して温度が下がる**吸熱反応**には、炭酸水素ナトリウムとクエン酸を水に入れる反応などがあります。',
        figure: scene([
          { type: 'beaker', x: 90, y: 190, width: 80, height: 90, level: 0.6 },
          { type: 'beaker', x: 230, y: 190, width: 80, height: 90, level: 0.6 },
          { type: 'line', points: [[90, 70], [90, 180]], color: 'gray', width: 4 },
          { type: 'line', points: [[230, 70], [230, 180]], color: 'gray', width: 4 },
          { type: 'arrow', x1: 140, y1: 150, x2: 140, y2: 90, color: 'orange' },
          { type: 'arrow', x1: 280, y1: 90, x2: 280, y2: 150, color: 'blue' },
          { type: 'text', x: 90, y: 50, text: '温度が上がる', size: 13, anchor: 'middle' },
          { type: 'text', x: 230, y: 50, text: '温度が下がる', size: 13, anchor: 'middle' },
          { type: 'text', x: 90, y: 220, text: '発熱反応', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 230, y: 220, text: '吸熱反応', size: 14, anchor: 'middle', bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-dr5-w1', concept: 'ch-oxidation',
      prompt: '予想しよう。黒色の酸化銅を、水素を流しながら加熱すると、何ができると思う？',
      options: ['銅と水', '銅と二酸化炭素', '何もできない'],
      answer: 'a',
      explanation: '水素が酸化銅から酸素をうばうので、銅と水ができます。炭素のほかにも、還元に使える物質があることを見ていこう。',
      hint: '水素が酸素と結びつくと、何ができるかな。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-dr5-p1', concept: 'ch-oxidation',
        prompt: 'CuO ＋ H₂ → Cu ＋ H₂O の反応で、酸化された物質はどれ？ ア 酸化銅、イ 水素、ウ 銅。',
        figure: scene([
          { type: 'text', x: 160, y: 36, text: 'CuO ＋ H₂ → Cu ＋ H₂O', size: 16, anchor: 'middle' },
          atom(40, 100, 'Cu'), atom(68, 100, 'O'),
          ...molH2(160, 100),
          atom(266, 100, 'Cu'),
          { type: 'text', x: 54, y: 140, text: '酸化銅', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 140, text: '水素', size: 13, anchor: 'middle' },
          { type: 'text', x: 266, y: 140, text: '銅', size: 13, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 54, y: 186, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 186, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 266, y: 186, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '水素は酸化銅から酸素をうばい、酸素と結びついて水になるので、酸化されたのは水素（イ）です。酸化銅は酸素を失ったので還元されました。',
        hint: '酸素と結びついたのはどの物質かな。',
      }),
      fill({
        id: 'chemical-change-dr5-t1', concept: 'ch-equation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '銅と硫黄が結びついてできる黒色の物質を[b1]という。',
        blanks: [word('b1', ['硫化銅', '酸化銅', '硫酸銅'], '硫化銅')],
        explanation: '銅と硫黄が結びつくと**硫化銅**ができます（Cu ＋ S → CuS）。硫黄と結びついた物質の名前には「硫化」がつきます。',
        hint: '酸素と結びつくと「酸化」、硫黄と結びつくと…？',
      }),
      fill({
        id: 'chemical-change-dr5-p2', concept: 'ch-oxidation',
        prompt: '酸化銅を水素で還元すると、試験管の口の近くに液体がつきました。空らんに入る言葉を選ぼう。',
        text: '試験管の口の近くについた液体は[b1]である。',
        blanks: [word('b1', ['水', 'エタノール', '石灰水'], '水')],
        explanation: '水素が酸化銅の酸素と結びつくので、水ができます。青色の塩化コバルト紙をつけると赤色（桃色）に変わることで確かめられます。',
        hint: '水素 ＋ 酸素 → ？',
      }),
      drag({
        id: 'chemical-change-dr5-p3', concept: 'ch-conservation',
        prompt: '炭酸水素ナトリウムとクエン酸を水に入れて、まぜました。この反応のカードを、温度の変化に合う箱へ動かそう。',
        // 位置はカード（rect 120×40）の左上で判定する。カードが箱のまん中に入る左上: 「温度が上がる」(25, 147)、
        // 「温度が下がる」(175, 147)。正解は「下がる」、不正解例は「上がる」（150px はなれる）
        figure: scene([
          { type: 'text', x: 85, y: 114, text: '温度が上がる', size: 14, anchor: 'middle' },
          { type: 'text', x: 235, y: 114, text: '温度が下がる', size: 14, anchor: 'middle' },
          { type: 'rect', x: 20, y: 122, width: 130, height: 90, rx: 8, fill: 'white', stroke: 'orange' },
          { type: 'rect', x: 170, y: 122, width: 130, height: 90, rx: 8, fill: 'white', stroke: 'blue' },
          { type: 'rect', id: 'card', x: 100, y: 30, width: 120, height: 40, rx: 6, fill: 'yellow', stroke: 'ink', label: 'クエン酸の反応' },
        ]),
        draggable: { itemId: 'card' },
        target: { x: 175, y: 147 },
        samples: { correct: { x: 175, y: 147 }, wrong: { x: 25, y: 147 } },
        explanation: '炭酸水素ナトリウムとクエン酸の反応は、まわりから熱を吸収するので、温度が下がります。このような反応を吸熱反応といいます。',
        hint: '熱を出す反応か、熱を吸収する反応かを考えよう。',
      }),
      fill({
        id: 'chemical-change-dr5-p4', concept: 'ch-equation',
        prompt: '鉄と硫黄は 7：4 の質量の比で、過不足なく結びつきます。空らんに入る数を入れよう。',
        text: '鉄 3.5 g とちょうど結びつく硫黄は[b1]である。',
        blanks: [number('b1', 2, 0, 'g')],
        explanation: '鉄：硫黄 ＝ 7：4 なので、比の 1 つ分は 3.5 ÷ 7 ＝ 0.5 g です。硫黄はその 4 つ分で、0.5 × 4 ＝ 2.0 g です。',
        hint: '3.5 g を 7 でわって、比の 1 つ分を求めよう。',
      }),
      choice({
        id: 'chemical-change-dr5-p5', concept: 'ch-conservation',
        prompt: '次のうち、発熱反応を利用しているものはどれ？',
        options: ['酸化カルシウムに水を加えて温める', '水酸化バリウムと塩化アンモニウムを混ぜる', '氷をとかして冷やす'],
        answer: 'a',
        explanation: '酸化カルシウムに水を加えると熱が出るので、食品を温める容器などに使われます。水酸化バリウムと塩化アンモニウムは吸熱反応、氷がとけるのは化学変化ではなく状態変化です。',
        hint: '温めるのに使われているものはどれかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-dr5-r1', concept: 'ch-equation', term: true,
        prompt: '次の説明に合う言葉はどれ？「鉄と硫黄が結びついてできる黒色の物質」',
        options: ['硫化鉄', '酸化鉄', '硫酸鉄'],
        answer: 'a',
        explanation: '鉄と硫黄が結びつくと**硫化鉄**ができます（Fe ＋ S → FeS）。磁石につかない、加熱前の鉄とは別の物質です。',
        hint: '硫黄と結びついた物質の名前には「硫化」がつくよ。',
      }),
      choice({
        id: 'chemical-change-dr5-r2', concept: 'ch-oxidation',
        prompt: '還元と酸化の関係について、正しいものはどれ？',
        options: ['還元が起こるとき、同時に酸化も起こる', '還元だけが単独で起こる', '還元では物質に酸素がふえる'],
        answer: 'a',
        explanation: '酸化物から酸素をうばう物質は、その酸素と結びつく（酸化される）ので、還元と酸化は同時に起こります。',
        hint: 'うばわれた酸素は、どこへ行くかな。',
      }),
      choice({
        id: 'chemical-change-dr5-r3', concept: 'ch-oxidation',
        prompt: '黒色の酸化銅を、水素を流しながら加熱しました。加熱後の粉の色はどうなる？',
        options: ['赤茶色', '白色', '青色'],
        answer: 'a',
        explanation: '酸化銅が還元されて、赤茶色の銅ができます。こすると金属の光沢が出ます。',
        hint: '酸化銅が還元されると、何ができるかな。',
      }),
      fill({
        id: 'chemical-change-dr5-r4', concept: 'ch-equation',
        prompt: '鉄と硫黄は 7：4 の質量の比で、過不足なく結びつきます。空らんに入る数を入れよう。',
        text: '鉄 14 g とちょうど結びつく硫黄は[b1]である。',
        blanks: [number('b1', 8, 0, 'g')],
        explanation: '比の 1 つ分は 14 ÷ 7 ＝ 2 g です。硫黄はその 4 つ分で、2 × 4 ＝ 8 g です。',
        hint: '14 g を 7 でわってみよう。',
      }),
      choice({
        id: 'chemical-change-dr5-r5', concept: 'ch-conservation',
        prompt: '次のうち、吸熱反応はどれ？',
        options: ['炭酸水素ナトリウムとクエン酸を水に入れる', '鉄と硫黄を加熱して反応させる', '木炭が燃える'],
        answer: 'a',
        explanation: '炭酸水素ナトリウムとクエン酸の反応は、まわりから熱を吸収して温度が下がる吸熱反応です。鉄と硫黄の反応や燃焼は、熱を出す発熱反応です。',
        hint: '温度が下がる反応をさがそう。',
      }),
      choice({
        id: 'chemical-change-dr5-r6', concept: 'ch-conservation',
        prompt: '水酸化バリウムと塩化アンモニウムをビーカーで混ぜて、ビーカーの外側をさわりました。どう感じる？',
        options: ['冷たく感じる', '熱く感じる', '何も変わらない'],
        answer: 'a',
        explanation: 'この反応はまわりから熱を吸収する吸熱反応なので、ビーカーは冷たくなります。',
        hint: '熱を出す反応か、吸収する反応かを思い出そう。',
      }),
    ],
  };

  // ---- ステージ chemical-change-dr6: 質量保存の法則の実験 ----
  // ペットボトル（左下 (x, y)、幅 50・高さ 90）とはかり。mass ははかりの表示
  function bottleOnScale(x, mass, bubbles) {
    return [
      { type: 'rect', x: x + 12, y: 68, width: 26, height: 12, fill: 'gray' },
      { type: 'rect', x, y: 80, width: 50, height: 90, rx: 10, fill: 'white' },
      { type: 'rect', x: x + 2, y: 130, width: 46, height: 38, fill: 'water', stroke: 'none' },
      ...(bubbles ? [[x + 14, 140], [x + 28, 150], [x + 36, 136], [x + 20, 118]].map(([bx, by]) => ({ type: 'circle', x: bx, y: by, r: 4, fill: 'white', stroke: 'line' })) : []),
      { type: 'rect', x: x - 25, y: 172, width: 100, height: 30, fill: 'glass', label: mass },
    ];
  }

  const chemDr6 = {
    id: 'chemical-change-dr6', areaId: 'reaction', free: true, title: 'ドリル 6: 質量保存の法則を確かめる実験', minutes: 6, concepts: ['ch-conservation'],
    lessons: [
      {
        id: 'chemical-change-dr6-c1',
        text: '**質量保存の法則**を確かめるには、反応で出入りする気体を逃がさないことが大切です。ペットボトルのように**密閉**した容器の中で反応させると、気体が発生しても全体の質量は変わりません。',
        figure: scene([
          ...bottleOnScale(55, '120.0 g', false),
          ...bottleOnScale(215, '120.0 g', true),
          { type: 'line', points: [[130, 125], [190, 125]], width: 3, arrow: true },
          { type: 'text', x: 80, y: 40, text: '反応前', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 40, text: '反応後（ふたをしたまま）', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 228, text: 'ふたをしたままなら、質量は変わらない', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-dr6-c2',
        anim: 'ch-precipitate-mass',   // 動く図の使い回し（js/anim-chem.js）。figure は静止図として残す
        text: 'うすい硫酸と塩化バリウム水溶液を混ぜると、白い**沈殿**ができます。気体が出ないので、ふたのない容器でも全体の質量は変わりません。気体が出入りする反応だけ、ふたの有無で結果が変わります。',
        figure: scene([
          { type: 'beaker', x: 70, y: 160, width: 70, height: 80, level: 0.6 },
          { type: 'tube', x: 132, y: 160, height: 70, level: 0.6, liquid: 'water' },
          { type: 'beaker', x: 240, y: 160, width: 70, height: 80, level: 0.6 },
          { type: 'rect', x: 210, y: 146, width: 60, height: 12, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 25, y: 164, width: 125, height: 30, fill: 'glass', label: '100.0 g' },
          { type: 'rect', x: 190, y: 164, width: 100, height: 30, fill: 'glass', label: '100.0 g' },
          { type: 'line', points: [[154, 120], [190, 120]], width: 3, arrow: true },
          { type: 'text', x: 80, y: 40, text: '混ぜる前', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 40, text: '混ぜた後', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 216, text: '白い沈殿', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 236, text: '気体が出ないので、ふたがなくても同じ', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'chemical-change-dr6-c3',
        text: 'スチールウールや銅のように空気中の酸素と結びつく反応では、皿の上で加熱すると質量がふえます。結びついた酸素の質量も合わせて考えれば、この場合も質量は保存されています。',
        figure: scene([
          { type: 'ellipse', x: 80, y: 130, rx: 50, ry: 10, fill: 'glass' },
          { type: 'ellipse', x: 80, y: 116, rx: 28, ry: 12, fill: 'rock' },
          { type: 'ellipse', x: 240, y: 130, rx: 50, ry: 10, fill: 'glass' },
          { type: 'ellipse', x: 240, y: 116, rx: 28, ry: 12, fill: '#4A4A4A' },
          { type: 'line', points: [[140, 116], [180, 116]], width: 3, arrow: true },
          { type: 'text', x: 80, y: 70, text: '鉄', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 70, text: '酸化鉄', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 190, text: '鉄 ＋ 酸素 → 酸化鉄', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 218, text: '結びついた酸素の分だけ重くなる', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-dr6-w1', concept: 'ch-conservation',
      prompt: '予想しよう。あわの出る入浴剤をお湯に入れました。あわが出終わった後、お湯をふくめた全体の質量は、入れた直後と比べてどうなると思う？',
      options: ['小さくなる', '大きくなる', '変わらない'],
      answer: 'a',
      explanation: 'あわは二酸化炭素で、空気中へ出ていくので、全体の質量は小さくなります。気体の出入りに注意して、質量保存の実験を考えよう。',
      hint: 'あわは、どこへ行くかな。',
    }),
    problems: [
      figureChoice({
        id: 'chemical-change-dr6-p1', concept: 'ch-conservation',
        prompt: 'ア ふたのない容器で石灰石とうすい塩酸、イ 密閉した容器で石灰石とうすい塩酸、ウ 皿の上でスチールウールを燃やす。反応の前後で全体の質量が変わらないのはどれ？',
        figure: scene([
          { type: 'beaker', x: 55, y: 190, width: 70, height: 80, level: 0.5 },
          { type: 'rect', x: 45, y: 176, width: 20, height: 12, fill: 'rock' },
          ...[[48, 160], [60, 150], [54, 136]].map(([x, y]) => ({ type: 'circle', x, y, r: 4, fill: 'white', stroke: 'line' })),
          { type: 'rect', x: 147, y: 88, width: 26, height: 12, fill: 'gray' },
          { type: 'rect', x: 135, y: 100, width: 50, height: 90, rx: 10, fill: 'white' },
          { type: 'rect', x: 137, y: 150, width: 46, height: 38, fill: 'water', stroke: 'none' },
          { type: 'rect', x: 150, y: 176, width: 20, height: 12, fill: 'rock' },
          { type: 'ellipse', x: 265, y: 170, rx: 42, ry: 8, fill: 'glass' },
          { type: 'ellipse', x: 265, y: 158, rx: 22, ry: 10, fill: 'rock' },
          { type: 'flame', x: 265, y: 152 },
          { type: 'text', x: 55, y: 216, text: 'ふたなし', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 216, text: '密閉', size: 12, anchor: 'middle' },
          { type: 'text', x: 265, y: 216, text: '皿の上', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 55, y: 40, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 40, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 40, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '密閉した容器（イ）では、発生した二酸化炭素が外へ出ないので、全体の質量は変わりません。アは二酸化炭素が出ていって軽くなり、ウは空気中の酸素と結びついて重くなります。',
        hint: '気体が外から入ったり、外へ出たりしないのはどれかな。',
      }),
      fill({
        id: 'chemical-change-dr6-t1', concept: 'ch-conservation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水溶液を混ぜたときにできる、水にとけにくい固体を[b1]という。',
        blanks: [word('b1', ['沈殿', '結晶', '溶質'], '沈殿')],
        explanation: '水溶液どうしを混ぜたときにできる、水にとけにくい固体を**沈殿**といいます。うすい硫酸と塩化バリウム水溶液を混ぜると、白い沈殿ができます。',
        hint: '液の底にしずんでたまる固体だよ。',
      }),
      fill({
        id: 'chemical-change-dr6-p2', concept: 'ch-conservation',
        prompt: '密閉した容器で反応させると、反応の前後とも全体は 85.6 g でした。ふたをゆるめてしばらくおくと 85.2 g になりました。空らんに入る数を入れよう。',
        text: '容器の外へ出ていった気体は[b1]である。',
        blanks: [number('b1', 0.4, 0, 'g')],
        explanation: 'ふたをゆるめると、発生した気体が外へ出ていきます。へった分が出ていった気体なので、85.6 − 85.2 ＝ 0.4 g です。',
        hint: 'ふたをゆるめる前と後の質量の差だよ。',
      }),
      choice({
        id: 'chemical-change-dr6-p3', concept: 'ch-conservation',
        prompt: '密閉したつもりの容器で気体の出る反応をさせたのに、反応後の質量が少しへりました。考えられる原因はどれ？',
        options: ['ふたがゆるく、気体がもれた', '反応で原子の数がへった', '反応で原子が軽くなった'],
        answer: 'a',
        explanation: '化学変化で原子の数や質量は変わりません。質量がへったのは、ふたのすきまから気体がもれて外へ出たからと考えられます。',
        hint: '原子は、化学変化でなくなったり軽くなったりするかな。',
      }),
      choice({
        id: 'chemical-change-dr6-p4', concept: 'ch-conservation',
        prompt: 'うすい硫酸と塩化バリウム水溶液を混ぜる反応で、ふたをしなくても全体の質量が変わらないのはなぜ？',
        options: ['気体が発生しないから', 'できた沈殿に質量がないから', '水溶液がこぼれないから'],
        answer: 'a',
        explanation: 'この反応では白い沈殿ができますが、気体は発生しません。外へ出ていく物質がないので、ふたがなくても全体の質量は変わりません。',
        hint: 'ふたが必要なのは、どんなものが出る反応だったかな。',
      }),
      drag({
        id: 'chemical-change-dr6-p5', concept: 'ch-conservation',
        prompt: '密閉したフラスコの中でスチールウールを燃やしました。冷めてからふたを開けると、全体の質量はどうなる？ カードを合う箱へ動かそう。',
        // 位置はカード（rect 80×40）の左上で判定する。カードが箱のまん中に入る左上: 「ふえる」(18, 147)、
        // 「へる」(120, 147)、「変わらない」(222, 147)。正解は「ふえる」、不正解例は「へる」（102px はなれる）
        figure: scene([
          { type: 'text', x: 58, y: 114, text: 'ふえる', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 114, text: 'へる', size: 14, anchor: 'middle' },
          { type: 'text', x: 262, y: 114, text: '変わらない', size: 14, anchor: 'middle' },
          { type: 'rect', x: 10, y: 122, width: 96, height: 90, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 112, y: 122, width: 96, height: 90, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 214, y: 122, width: 96, height: 90, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', id: 'card', x: 120, y: 30, width: 80, height: 40, rx: 6, fill: 'yellow', stroke: 'ink', label: '開けた後' },
        ]),
        draggable: { itemId: 'card' },
        target: { x: 18, y: 147 },
        samples: { correct: { x: 18, y: 147 }, wrong: { x: 120, y: 147 } },
        explanation: 'フラスコの中の酸素が鉄と結びついて減ったので、ふたを開けるとその分の空気が外から入ってきます。入ってきた空気の分だけ、全体の質量はふえます。',
        hint: '燃やした後のフラスコの中では、酸素がどうなっているかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-dr6-r1', concept: 'ch-conservation', term: true,
        prompt: '次の説明に合う言葉はどれ？「容器をしっかり閉じて、物質が出入りしないようにすること」',
        options: ['密閉', '沈殿', '蒸留'],
        answer: 'a',
        explanation: '容器をしっかり閉じて、外と物質が出入りしないようにすることを**密閉**といいます。気体の出る反応で質量保存を確かめるときに必要です。',
        hint: 'ペットボトルのふたをしっかりしめた状態だよ。',
      }),
      fill({
        id: 'chemical-change-dr6-r2', concept: 'ch-conservation',
        prompt: 'ふたをした容器で反応させた後、全体は 120.5 g でした。ふたを開けると 119.8 g になりました。空らんに入る数を入れよう。',
        text: '容器の外へ出ていった気体は[b1]である。',
        blanks: [number('b1', 0.7, 0, 'g')],
        explanation: 'へった分が出ていった気体の質量です。120.5 − 119.8 ＝ 0.7 g です。',
        hint: 'ふたを開ける前と後の質量の差を求めよう。',
      }),
      choice({
        id: 'chemical-change-dr6-r3', concept: 'ch-conservation',
        prompt: 'うすい硫酸 40.0 g と塩化バリウム水溶液 20.0 g を混ぜると、白い沈殿ができました。混ぜた後の液と沈殿を合わせた質量は？',
        options: ['60.0 g', '60.0 g より大きい', '60.0 g より小さい'],
        answer: 'a',
        explanation: '気体が出入りしない反応なので、質量保存の法則のとおり、混ぜた後も合計の 40.0 ＋ 20.0 ＝ 60.0 g のままです。',
        hint: 'この反応で、外へ出ていくものはあるかな。',
      }),
      choice({
        id: 'chemical-change-dr6-r4', concept: 'ch-conservation',
        prompt: 'マグネシウムを空気中で燃やすと、燃やした後の物質の質量が燃やす前よりふえるのはなぜ？',
        options: ['空気中の酸素と結びついたから', '空気中の水を吸ったから', '原子の数がふえたから'],
        answer: 'a',
        explanation: 'マグネシウムは空気中の酸素と結びついて酸化マグネシウムになります。結びついた酸素の分だけ質量がふえます。原子の数がふえたわけではありません。',
        hint: '燃焼は、何と結びつく変化だったかな。',
      }),
    ],
  };

  // ---- ステージ chemical-change-dr7: 結びつく質量の割合とグラフ ----
  // 銅の質量と結びつく酸素の質量のグラフ。x = 60 + 140 × 銅、y = 200 − 400 × 酸素
  const cuOX = (m) => 60 + 140 * m;
  const cuOY = (m) => 200 - 400 * m;
  // 金属の質量と結びつく酸素の質量のグラフ（銅とマグネシウム）。x = 60 + 140 × 金属、y = 200 − 160 × 酸素
  const mtX = (m) => 60 + 140 * m;
  const mtY = (m) => 200 - 160 * m;

  const chemDr7 = {
    id: 'chemical-change-dr7', areaId: 'reaction', free: true, title: 'ドリル 7: 結びつく質量の割合とグラフ', minutes: 7, concepts: ['ch-conservation'],
    lessons: [
      {
        id: 'chemical-change-dr7-c1',
        text: '金属の質量を変えて加熱すると、結びつく酸素の質量は金属の質量に**比例**します。グラフは原点を通る直線になります。グラフの 1 点から比を読みとれば、ほかの質量も計算できます。',
        figure: scene(axesItems(
          [['0.4', mtX(0.4)], ['0.8', mtX(0.8)], ['1.2', mtX(1.2)], ['1.6', mtX(1.6)]],
          [['0.25', mtY(0.25)], ['0.50', mtY(0.5)], ['0.75', mtY(0.75)], ['1.00', mtY(1)]],
          ['酸素の質量〔g〕', '金属の質量〔g〕']).concat([
          { type: 'line', points: [[mtX(0), mtY(0)], [mtX(1.5), mtY(1)]], color: 'blue', width: 3 },
          { type: 'line', points: [[mtX(0), mtY(0)], [mtX(1.6), mtY(0.4)]], color: 'orange', width: 3 },
          { type: 'text', x: 150, y: 70, text: 'マグネシウム', size: 13, anchor: 'middle', color: 'blue' },
          { type: 'text', x: 298, y: 140, text: '銅', size: 13, anchor: 'middle', color: 'orange' },
        ])),
      },
      {
        id: 'chemical-change-dr7-c2',
        text: '酸素 1 g と結びつく金属の質量は、銅が 4 g、マグネシウムが 1.5 g です。だから、同じ質量の金属を酸化させると、マグネシウムのほうが多くの酸素と結びつきます。',
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '酸素 1 g と結びつく金属の質量', size: 14, anchor: 'middle', bold: true },
          { type: 'rect', x: 40, y: 60, width: 200, height: 36, fill: 'brown', label: '銅 4 g' },
          { type: 'rect', x: 240, y: 60, width: 50, height: 36, fill: 'sky', label: 'O' },
          { type: 'rect', x: 40, y: 130, width: 75, height: 36, fill: 'glass', label: 'Mg 1.5 g' },
          { type: 'rect', x: 115, y: 130, width: 50, height: 36, fill: 'sky', label: 'O' },
          { type: 'text', x: 160, y: 200, text: '水色（O）はどちらも酸素 1 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: '銅 4：酸素 1　　マグネシウム 3：酸素 2', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'chemical-change-dr7-w1', concept: 'ch-conservation',
      prompt: '予想しよう。銅の粉の質量を 2 倍にして、質量がふえなくなるまで加熱すると、できる酸化銅の質量はどうなると思う？',
      options: ['2 倍になる', '変わらない', '半分になる'],
      answer: 'a',
      explanation: '結びつく酸素も 2 倍になるので、できる酸化銅も 2 倍になります。この比例の関係を、グラフと計算で使っていこう。',
      hint: '銅が 2 倍なら、結びつく酸素はどうなるかな。',
    }),
    problems: [
      drag({
        id: 'chemical-change-dr7-p1', concept: 'ch-conservation',
        prompt: '銅と酸素は 4：1 の質量の比で結びつきます。銅 1.2 g と結びつく酸素の質量を表す点を、上下に動かしてグラフの正しい位置に置こう。',
        // 正解は酸素 0.3 g → y = 200 − 120 = 80。不正解例 0.4 g（1.2 ÷ 3 とした誤り）→ y = 40（40px はなれる）
        figure: scene(axesItems(
          [['0.4', cuOX(0.4)], ['0.8', cuOX(0.8)], ['1.2', cuOX(1.2)], ['1.6', cuOX(1.6)]],
          [['0.1', cuOY(0.1)], ['0.2', cuOY(0.2)], ['0.3', cuOY(0.3)], ['0.4', cuOY(0.4)]],
          ['酸素の質量〔g〕', '銅の質量〔g〕']).concat([
          { type: 'line', points: [[cuOX(1.2), 200], [cuOX(1.2), 36]], color: 'gray', width: 2, dashed: true },
          { type: 'circle', id: 'point', x: cuOX(1.2), y: 186, r: 9, fill: 'blue', stroke: 'ink' },
        ])),
        draggable: { itemId: 'point', axis: 'y' },
        target: { x: cuOX(1.2), y: cuOY(0.3) },
        samples: { correct: { x: cuOX(1.2), y: cuOY(0.3) }, wrong: { x: cuOX(1.2), y: cuOY(0.4) } },
        explanation: '銅：酸素 ＝ 4：1 なので、酸素は銅の 4 分の 1 です。1.2 ÷ 4 ＝ 0.3 g なので、縦軸の 0.3 の高さに点を置きます。',
        hint: '銅の質量を 4 でわろう。',
      }),
      fill({
        id: 'chemical-change-dr7-t1', concept: 'ch-conservation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '2 つの量のグラフが原点を通る直線になるとき、2 つの量は[b1]の関係にあるという。',
        blanks: [word('b1', ['比例', '反比例', '保存'], '比例')],
        explanation: 'グラフが原点を通る直線になるのは、**比例**の関係です。金属の質量と結びつく酸素の質量は比例します。',
        hint: '一方が 2 倍になると、もう一方も 2 倍になる関係だよ。',
      }),
      fill({
        id: 'chemical-change-dr7-p2', concept: 'ch-conservation',
        prompt: 'グラフから、マグネシウム 0.6 g と結びつく酸素は 0.4 g と読みとれました。空らんに入る数を入れよう。',
        text: 'マグネシウム 2.1 g と結びつく酸素は[b1]である。',
        blanks: [number('b1', 1.4, 0, 'g')],
        explanation: 'マグネシウム：酸素 ＝ 0.6：0.4 ＝ 3：2 です。2.1 ÷ 3 × 2 ＝ 1.4 g です。',
        hint: 'まず、読みとった値から比を求めよう。',
      }),
      figureChoice({
        id: 'chemical-change-dr7-p3', concept: 'ch-conservation',
        prompt: 'グラフの直線ア・イは、銅とマグネシウムのどちらかで、金属の質量と結びつく酸素の質量の関係です。マグネシウムの直線はア・イのどちら？',
        // マグネシウム（酸素 ＝ 金属 × 2/3）は 1.2 g まで、銅（酸素 ＝ 金属 × 1/4）は 1.6 g まで。region は直線の上
        figure: scene(axesItems(
          [['0.4', mtX(0.4)], ['0.8', mtX(0.8)], ['1.2', mtX(1.2)], ['1.6', mtX(1.6)]],
          [['0.25', mtY(0.25)], ['0.50', mtY(0.5)], ['0.75', mtY(0.75)], ['1.00', mtY(1)]],
          ['酸素の質量〔g〕', '金属の質量〔g〕']).concat([
          { type: 'line', points: [[mtX(0), mtY(0)], [mtX(1.2), mtY(0.8)]], color: 'blue', width: 3 },
          { type: 'line', points: [[mtX(0), mtY(0)], [mtX(1.6), mtY(0.4)]], color: 'orange', width: 3 },
          { type: 'region', id: 'r1', x: mtX(0.9), y: mtY(0.6), r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: mtX(1.2), y: mtY(0.3), r: 22, label: 'イ' },
        ])),
        answer: 'r1',
        explanation: 'マグネシウムは 3：2、銅は 4：1 の質量の比で酸素と結びつきます。同じ質量ならマグネシウムのほうが多くの酸素と結びつくので、かたむきの大きいアがマグネシウムです（たとえば 1.2 g で、ア は 0.8 g、イ は 0.3 g）。',
        hint: '同じ金属の質量で、結びつく酸素が多いのはどちらの金属かな。',
      }),
      choice({
        id: 'chemical-change-dr7-p4', concept: 'ch-conservation',
        prompt: 'マグネシウム 0.3 g・0.6 g・0.9 g を完全に酸化させると、酸化マグネシウムは 0.5 g・1.0 g・1.5 g できました。マグネシウム：酸化マグネシウムの質量の比は？',
        options: ['3：5', '3：2', '5：3'],
        answer: 'a',
        explanation: '0.3：0.5 ＝ 3：5 です。どの組でも同じ比になっています。酸素はその差なので、マグネシウム：酸素 ＝ 3：2 です。',
        hint: 'いちばん小さい組の 0.3 と 0.5 を比べよう。',
      }),
      fill({
        id: 'chemical-change-dr7-p5', concept: 'ch-conservation',
        prompt: 'マグネシウムと酸素は 3：2 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: '酸化マグネシウム 3.0 g の中にふくまれる酸素は[b1]である。',
        blanks: [number('b1', 1.2, 0, 'g')],
        explanation: 'マグネシウム：酸素：酸化マグネシウム ＝ 3：2：5 です。酸素は酸化マグネシウムの 5 分の 2 なので、3.0 ÷ 5 × 2 ＝ 1.2 g です。',
        hint: '酸化マグネシウムは、比の 5 にあたるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'chemical-change-dr7-r1', concept: 'ch-conservation', term: true,
        prompt: '次の説明に合う言葉はどれ？「銅が酸素と結びついてできる黒色の物質」',
        options: ['酸化銅', '硫化銅', '炭酸銅'],
        answer: 'a',
        explanation: '銅が酸素と結びつくと、黒色の**酸化銅**ができます。銅：酸素 ＝ 4：1 なので、銅：酸化銅 ＝ 4：5 です。',
        hint: '酸素と結びついた物質の名前には「酸化」がつくよ。',
      }),
      fill({
        id: 'chemical-change-dr7-r2', concept: 'ch-conservation',
        prompt: '酸素 1.2 g と結びつくには、銅なら 4.8 g 必要です。マグネシウムと酸素の質量の比は 3：2 です。空らんに入る数を入れよう。',
        text: '酸素 1.2 g と結びつくマグネシウムは[b1]である。',
        blanks: [number('b1', 1.8, 0, 'g')],
        explanation: 'マグネシウム：酸素 ＝ 3：2 なので、マグネシウムは 1.2 ÷ 2 × 3 ＝ 1.8 g です。銅よりずっと少ない質量で同じ酸素と結びつきます。',
        hint: '酸素 1.2 g を 2 でわって、3 倍しよう。',
      }),
      fill({
        id: 'chemical-change-dr7-r3', concept: 'ch-conservation',
        prompt: '銅と酸素は 4：1 の質量の比で結びつきます。空らんに入る数を入れよう。',
        text: '酸化銅 2.0 g の中にふくまれる酸素は[b1]である。',
        blanks: [number('b1', 0.4, 0, 'g')],
        explanation: '銅：酸素：酸化銅 ＝ 4：1：5 です。酸素は酸化銅の 5 分の 1 なので、2.0 ÷ 5 ＝ 0.4 g です。',
        hint: '酸化銅は、比の 5 にあたるよ。',
      }),
      fill({
        id: 'chemical-change-dr7-r4', concept: 'ch-conservation',
        prompt: 'マグネシウム 1.2 g と銅 1.2 g を、それぞれ完全に酸化させました（Mg：O ＝ 3：2、Cu：O ＝ 4：1）。空らんに入る数を入れよう。',
        text: '結びつく酸素は、マグネシウムのほうが[b1]多い。',
        blanks: [number('b1', 0.5, 0, 'g')],
        explanation: 'マグネシウムと結びつく酸素は 1.2 ÷ 3 × 2 ＝ 0.8 g、銅と結びつく酸素は 1.2 ÷ 4 ＝ 0.3 g です。差は 0.8 − 0.3 ＝ 0.5 g です。',
        hint: 'それぞれの酸素の質量を求めてから、差を出そう。',
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
        fill({
          id: 'ch-atom-k4', concept: 'ch-atom',
          prompt: '元素記号が表す元素の名前を選ぼう。',
          text: 'H は[b1]、Fe は[b2]、Mg は[b3]、Cu は[b4]である。',
          blanks: [
            word('b1', ['水素', 'ヘリウム', '水銀'], '水素'),
            word('b2', ['鉄', 'フッ素', '銅'], '鉄'),
            word('b3', ['マグネシウム', 'マンガン', '水銀'], 'マグネシウム'),
            word('b4', ['銅', '炭素', 'カルシウム'], '銅'),
          ],
          explanation: 'H は水素、Fe は鉄、Mg はマグネシウム、Cu は銅です。',
          hint: 'Cu は 10 円玉の金属だよ。',
        }),
        fill({
          id: 'ch-atom-k5', concept: 'ch-atom',
          prompt: '元素記号が表す元素の名前を選ぼう。',
          text: 'Na は[b1]、O は[b2]、N は[b3]、C は[b4]である。',
          blanks: [
            word('b1', ['ナトリウム', '窒素', 'ネオン'], 'ナトリウム'),
            word('b2', ['酸素', '金', '銀'], '酸素'),
            word('b3', ['窒素', 'ナトリウム', 'ニッケル'], '窒素'),
            word('b4', ['炭素', 'カルシウム', '銅'], '炭素'),
          ],
          explanation: 'Na はナトリウム、O は酸素、N は窒素、C は炭素です。N と Na、C と Ca・Cu を区別しよう。',
          hint: '1 文字の元素記号と 2 文字の元素記号を区別しよう。',
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
        fill({
          id: 'ch-conservation-k4', concept: 'ch-conservation',
          prompt: 'マグネシウムと酸素は 3：2 の質量の比で結びつきます。空らんに入る数を入れよう。',
          text: '酸化マグネシウム 15 g をつくるのに必要なマグネシウムは[b1]、25 g では[b2]、6.5 g では[b3]である。',
          blanks: [number('b1', 9, 0, 'g'), number('b2', 15, 0, 'g'), number('b3', 3.9, 0, 'g')],
          explanation: 'マグネシウム：酸化マグネシウム ＝ 3：5 なので、15 ÷ 5 × 3 ＝ 9 g、25 ÷ 5 × 3 ＝ 15 g、6.5 ÷ 5 × 3 ＝ 3.9 g です。',
          hint: '酸化マグネシウムを 5 でわって、3 倍しよう。',
        }),
        fill({
          id: 'ch-conservation-k5', concept: 'ch-conservation',
          prompt: 'マグネシウムと酸素は 3：2 の質量の比で結びつきます。加熱が足りず、一部のマグネシウムが反応せずに残りました。残ったマグネシウムの質量を入れよう。',
          text: '15.0 g → 加熱後 23.0 g のとき[b1]、20.0 g → 32.8 g のとき[b2]、25.0 g → 40.6 g のとき[b3]が残った。',
          blanks: [number('b1', 3.0, 0, 'g'), number('b2', 0.8, 0, 'g'), number('b3', 1.6, 0, 'g')],
          explanation: '増えた質量が結びついた酸素です。酸素 8.0 g → 反応した Mg 12.0 g → 残り 3.0 g。酸素 12.8 g → Mg 19.2 g → 残り 0.8 g。酸素 15.6 g → Mg 23.4 g → 残り 1.6 g です。',
          hint: '増えた質量（酸素）を 2 でわって 3 倍すると、反応したマグネシウムが分かるよ。',
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
      { id: 'atom', title: '物質のなりたち', order: 1, stages: [
        chem1, chem2, chemMp1, chemMp2, chemMp3, chemMp4, chemDr1, chemDr2, chemDr3,
      ] },
      { id: 'reaction', title: '化学変化と質量', order: 2, stages: [
        chem3, chem4, chemMp5, chemMp6, chemMp7, chemMp8, chemMp9, chemMp10, chemDr4, chemDr5, chemDr6, chemDr7,
      ] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
