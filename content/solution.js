// 「水溶液」教材データ（中学1年 理科・化学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（水にとける: 水溶液とは・質量パーセント濃度 / 溶解度: 溶解度と飽和水溶液・再結晶）と、概念 5 つ。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// drag の位置は部品の基準点（beaker は底の中央、circle は中心）で判定する（js/ui-problems.js の anchorOf）。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
// 溶解度の値（水 100 g あたり）は図をかくための目安: 硝酸カリウム 10℃ 22 g・20℃ 32 g・40℃ 64 g・60℃ 110 g、
// 塩化ナトリウムは約 36〜37 g でほとんど変わらない。
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

  // 写真（assets/images/solution/<name>.jpg。640×480 を場面いっぱいに描く。座標は画像の位置 × 0.5）
  function photo(name) { return { type: 'image', src: 'assets/images/solution/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 粒子の並び方（ビーカーの底の中央からのずれ [dx, dy]。幅 80・高さ 110・level 0.85 のビーカー用）
  const DOTS = {
    bottom: [[-26, -8], [-15, -12], [-4, -7], [7, -13], [18, -8], [27, -12], [-20, -20], [0, -22], [20, -20]],
    even: [[-24, -78], [2, -84], [24, -74], [-14, -50], [12, -56], [-26, -22], [0, -18], [24, -26], [-2, -36]],
    top: [[-26, -84], [-14, -78], [-2, -86], [10, -80], [22, -85], [28, -76], [-20, -70], [2, -68], [18, -70]],
    lump: [[-6, -8], [0, -12], [6, -8], [-3, -16], [4, -17], [0, -5], [-8, -14], [8, -14], [0, -21]],
    spread: [[-10, -12], [4, -10], [14, -20], [-18, -26], [0, -32], [20, -40], [-8, -46], [-24, -12], [10, -54]],
  };

  // 粒子の入ったビーカー（底の中央 (x, y)）
  function particleBeaker(x, y, pattern) {
    const items = [{ type: 'beaker', x, y, width: 80, height: 110, level: 0.85 }];
    DOTS[pattern].forEach(([dx, dy]) => items.push({ type: 'circle', x: x + dx, y: y + dy, r: 4, fill: 'purple', stroke: 'none' }));
    return items;
  }

  // 溶解度曲線のグラフ。原点 (50, 210)、横軸 0〜60℃（1℃ = 4px）、縦軸 0〜120 g（1 g = 1.5px）
  // 位置の換算: x = 50 + 4 × 温度、y = 210 − 1.5 × 質量
  function gx(t) { return 50 + 4 * t; }
  function gy(m) { return 210 - 1.5 * m; }
  const KNO3 = [[0, 13], [10, 22], [20, 32], [30, 46], [40, 64], [50, 85], [60, 110]];
  const NACL = [[0, 36], [20, 36], [40, 36.3], [60, 37]];
  function graphItems(showValues) {
    const items = [
      { type: 'line', points: [[50, 60], [290, 60]], color: 'glass', width: 2 },
      { type: 'line', points: [[50, 135], [290, 135]], color: 'glass', width: 2 },
      // 10 g ごとのうすい横線（読み取りの助け）
      ...[10, 20, 30, 40, 60, 70, 80, 90, 110].map(m => ({ type: 'line', points: [[50, gy(m)], [290, gy(m)]], color: 'glass', width: 1 })),
      { type: 'line', points: [[50, 26], [50, 210], [296, 210]], width: 2 },
      { type: 'text', x: 4, y: 16, text: '水 100 g にとける質量（g）', size: 12 },
      { type: 'text', x: 44, y: 214, text: '0', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: 139, text: '50', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: 64, text: '100', size: 12, anchor: 'end' },
      { type: 'text', x: 316, y: 238, text: '水の温度（℃）', size: 12, anchor: 'end' },
      { type: 'line', points: KNO3.map(([t, m]) => [gx(t), gy(m)]), color: 'blue', width: 3 },
      { type: 'line', points: NACL.map(([t, m]) => [gx(t), gy(m)]), color: 'green', width: 3 },
      { type: 'text', x: 92, y: 130, text: '硝酸カリウム', size: 12, color: 'blue' },
      { type: 'text', x: 226, y: 176, text: '塩化ナトリウム', size: 12, color: 'green' },
    ];
    [0, 20, 40, 60].forEach(t => {
      items.push({ type: 'line', points: [[gx(t), 210], [gx(t), 216]], width: 2 });
      items.push({ type: 'text', x: gx(t), y: 228, text: String(t), size: 12, anchor: 'middle' });
    });
    if (showValues) {
      [[20, 32], [40, 64], [60, 110]].forEach(([t, m]) => {
        items.push({ type: 'circle', x: gx(t), y: gy(m), r: 4, fill: 'blue', stroke: 'none' });
      });
      items.push({ type: 'text', x: gx(20) + 4, y: gy(32) + 18, text: '32', size: 12, color: 'blue' });
      items.push({ type: 'text', x: gx(40) + 8, y: gy(64) + 16, text: '64', size: 12, color: 'blue' });
      items.push({ type: 'text', x: gx(60) - 8, y: gy(110) - 4, text: '110', size: 12, color: 'blue', anchor: 'end' });
    }
    return items;
  }

  // グラフの文字（text の部品）を、ほかの線と重ならない位置へ移す
  function moveText(items, text, x, y, anchor) {
    return items.map(it => (it.type === 'text' && it.text === text ? Object.assign({}, it, { x, y, anchor: anchor || it.anchor }) : it));
  }

  // ろ過の装置（小さい図）。cx は ろうとの中心。wall: 足をビーカーの壁につける、rod: ガラス棒を使う
  function filterSetup(cx, wall, rod) {
    const items = [
      { type: 'polygon', points: [[cx - 28, 70], [cx + 28, 70], [cx + 4, 104], [cx - 4, 104]], fill: 'glass' },
      { type: 'polygon', points: [[cx - 24, 72], [cx + 24, 72], [cx, 100]], fill: 'white' },
      { type: 'line', points: [[cx, 104], [cx, 152]], color: 'line', width: 5 },
      // ビーカー（幅 64）。壁につけるときは左の壁を足のすぐ左（cx − 4）に置く
      { type: 'beaker', x: wall ? cx + 28 : cx, y: 190, width: 64, height: 80, level: 0.25 },
    ];
    if (rod) items.push({ type: 'line', points: [[cx + 28, 26], [cx + 4, 84]], color: 'gray', width: 4 });
    else items.push({ type: 'line', points: [[cx + 30, 30], [cx + 8, 66]], color: 'blue', width: 3, dashed: true, arrow: true });
    return items;
  }

  // 結晶の形（中心 (cx, cy)）: 立方体・正八面体・針のような形
  function cubeItems(cx, cy) {
    return [
      { type: 'polygon', points: [[cx - 22, cy - 8], [cx + 12, cy - 8], [cx + 12, cy + 26], [cx - 22, cy + 26]], fill: 'white' },
      { type: 'polygon', points: [[cx - 22, cy - 8], [cx - 8, cy - 22], [cx + 26, cy - 22], [cx + 12, cy - 8]], fill: 'glass' },
      { type: 'polygon', points: [[cx + 12, cy - 8], [cx + 26, cy - 22], [cx + 26, cy + 12], [cx + 12, cy + 26]], fill: 'glass' },
    ];
  }
  function octaItems(cx, cy) {
    return [
      { type: 'polygon', points: [[cx, cy - 32], [cx + 26, cy], [cx, cy + 32], [cx - 26, cy]], fill: 'white' },
      { type: 'line', points: [[cx - 26, cy], [cx + 6, cy + 8], [cx + 26, cy]], width: 2 },
      { type: 'line', points: [[cx, cy - 32], [cx + 6, cy + 8], [cx, cy + 32]], width: 2 },
    ];
  }
  function needleItems(cx, cy) {
    const items = [];
    [[-30, 18, 26, -14], [-24, -16, 28, 10], [-8, 28, 10, -30], [-30, 2, 30, -2]].forEach(([x1, y1, x2, y2]) => {
      items.push({ type: 'polygon', points: [[cx + x1, cy + y1], [cx + x2, cy + y2], [cx + x2 + 3, cy + y2 + 4], [cx + x1 + 3, cy + y1 + 4]], fill: 'white' });
    });
    return items;
  }

  // 結晶 3 種を並べた選ぶ図（ア 針のような形・イ 立方体・ウ 正八面体）
  function crystalChoiceScene() {
    return scene([
      { type: 'text', x: 160, y: 24, text: 'ルーペで見た結晶の形', size: 14, anchor: 'middle' },
      ...needleItems(60, 140),
      ...cubeItems(160, 140),
      ...octaItems(260, 140),
      { type: 'region', id: 'r1', x: 60, y: 66, r: 24, label: 'ア' },
      { type: 'region', id: 'r2', x: 160, y: 66, r: 24, label: 'イ' },
      { type: 'region', id: 'r3', x: 260, y: 66, r: 24, label: 'ウ' },
      { type: 'text', x: 60, y: 210, text: '針のような形', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 210, text: '立方体', size: 12, anchor: 'middle' },
      { type: 'text', x: 260, y: 210, text: '正八面体', size: 12, anchor: 'middle' },
    ]);
  }

  // ================================================================
  // 領域 1: 水にとける
  // ================================================================

  // ---- ステージ sol-1: 水溶液とは（溶質・溶媒・溶液、粒子のモデル） ----
  const sol1 = {
    id: 'sol-1', areaId: 'dissolve', title: '水溶液とは', minutes: 5, concepts: ['sol-terms', 'sol-particle'],
    lessons: [
      {
        id: 'sol-1-c1',
        anim: 'sl-dissolve',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '砂糖を水にとかすと砂糖水ができます。とけている砂糖を**溶質**、砂糖をとかしている水を**溶媒**、溶質が溶媒にとけた液全体を**溶液**といいます。溶媒が水である溶液を**水溶液**といいます。',
        // 砂糖（溶質）を水（溶媒）に入れる → 砂糖水（溶液）
        figure: scene([
          { type: 'beaker', x: 80, y: 200, width: 90, height: 110, level: 0.7 },
          { type: 'rect', x: 68, y: 178, width: 24, height: 20, fill: 'white' },
          { type: 'arrow', x1: 138, y1: 150, x2: 182, y2: 150, color: 'gray' },
          ...particleBeaker(240, 200, 'even'),
          { type: 'text', x: 80, y: 56, text: '溶質（砂糖）', size: 13, anchor: 'middle' },
          { type: 'text', x: 80, y: 74, text: '溶媒（水）', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 74, text: '溶液（砂糖水）', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 228, text: '溶質 ＋ 溶媒 → 溶液', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'sol-1-c2',
        text: '**水溶液**はすきとおっています（**透明**）。硫酸銅の水溶液のように色がついていても、すきとおっていれば水溶液です。泥水のようににごっていて、しばらくおくと下にたまるものは水溶液ではありません。',
        // 写真: 左はすきとおった青い硫酸銅の水溶液、右はにごった泥水（底に泥がたまる (228, 128〜140)）
        figure: scene([
          photo('sol-1-c2'),
          tag(90, 168, '硫酸銅の水溶液'),
          tag(90, 190, '青色でも', { size: 13 }),
          tag(90, 208, 'すきとおっている', { size: 13 }),
          tag(228, 168, '泥水'),
          tag(228, 190, 'にごっていて', { size: 13 }),
          tag(228, 208, '下にたまる', { size: 13 }),
        ]),
      },
      {
        id: 'sol-1-c3',
        text: '物質が水にとけると、目に見えないほど小さな**粒子**に分かれ、水の中に**均一**に広がります。だから水溶液はどこも同じ濃さで、時間がたっても下にたまりません。粒子はとても小さいので、ろ過をしてもろ紙を通りぬけます。',
        // 写真: 水に入れた硫酸銅の結晶がとけて広がる（左から 入れた直後 → 数日後 → しばらくたつと均一）
        figure: scene([
          photo('sol-1-c3'),
          { type: 'arrow', x1: 92, y1: 100, x2: 128, y2: 100, color: 'gray', width: 3 },
          { type: 'arrow', x1: 190, y1: 100, x2: 226, y2: 100, color: 'gray', width: 3 },
          tag(64, 186, '入れた直後', { size: 13 }),
          tag(160, 186, '数日後', { size: 13 }),
          tag(257, 186, 'しばらくたつと', { size: 13 }),
          tag(257, 203, '均一になる', { size: 13 }),
          tag(160, 228, 'とけた物質は全体に均一に広がる', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'sol-1-w1', concept: 'sol-particle',
      prompt: '予想しよう。茶色のコーヒーシュガーを水に入れ、かき混ぜずに何日もおいておくと、液はどうなると思う？',
      options: ['下のほうだけが濃い茶色のまま', '全体が同じ茶色になる', '茶色が消えて無色になる'],
      answer: 'b',
      explanation: 'とけた砂糖の粒子は水の中に少しずつ広がり、やがて全体が同じ茶色になります。そのしくみを、このステージで学ぼう。',
      hint: '時間がたつと、とけた物質がどう広がるか想像しよう。',
    }),
    problems: [
      choice({
        id: 'sol-1-p1', concept: 'sol-terms',
        prompt: '食塩を水にとかして食塩水をつくりました。このとき、溶媒にあたるものはどれ？',
        options: ['食塩', '水', '食塩水'],
        answer: 'b',
        explanation: '溶媒は、物質をとかしている液体なので、水です。食塩はとけている物質（溶質）、食塩水は全体（溶液）です。「とかすもの」と「とけるもの」を分けて考えよう。',
        hint: '食塩をとかしているのはどちらか考えよう。',
      }),
      fill({
        id: 'sol-1-t1', concept: 'sol-terms', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '砂糖水で、とけている砂糖を[b1]、砂糖をとかしている水を[b2]という。',
        blanks: [
          word('b1', ['溶質', '溶媒', '溶液'], '溶質'),
          word('b2', ['溶質', '溶媒', '溶液'], '溶媒'),
        ],
        explanation: 'とけている物質が**溶質**、とかしている液体が**溶媒**です。溶質が溶媒にとけた液全体を溶液といいます。',
        hint: '「質」は物質、「媒」はなかだちをするもの、と考えよう。',
      }),
      figureChoice({
        id: 'sol-1-p2', concept: 'sol-particle',
        prompt: '水に砂糖を入れて、すべてとけてから時間がたちました。とけた砂糖の粒子のようすとして正しいのはどれ？ ア 粒子が下にたまっている、イ 粒子が上のほうに集まっている、ウ 粒子が全体に均一に広がっている。',
        figure: scene([
          { type: 'text', x: 160, y: 18, text: '● はとけた砂糖の粒子', size: 13, anchor: 'middle' },
          ...particleBeaker(55, 200, 'bottom'),
          ...particleBeaker(160, 200, 'top'),
          ...particleBeaker(265, 200, 'even'),
          { type: 'region', id: 'r1', x: 55, y: 54, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 54, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 54, r: 22, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: 'とけた物質は目に見えないほど小さな粒子になり、水の中に均一に広がります。時間がたっても下にたまったり、上に集まったりはしません。だから水溶液はどこも同じ濃さです。',
        hint: '水溶液は、どこをとっても同じ濃さだったね。',
      }),
      choice({
        id: 'sol-1-p3', concept: 'sol-particle',
        prompt: '次のうち、水溶液の性質として正しいものはどれ？',
        options: ['色がついたものは水溶液ではない', 'すきとおっていて、どこも同じ濃さである', '時間がたつと、とけた物質が下にたまる'],
        answer: 'b',
        explanation: '水溶液はすきとおっていて、どこも同じ濃さです。硫酸銅の水溶液のように色がついていても、すきとおっていれば水溶液です。時間がたっても、とけた物質は下にたまりません。',
        hint: '「色がある」と「にごっている」はちがうことに注意しよう。',
      }),
      fill({
        id: 'sol-1-p4', concept: 'sol-terms',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '食塩水では、食塩が[b1]で、食塩水全体が[b2]である。',
        blanks: [
          word('b1', ['溶質', '溶媒', '溶液'], '溶質'),
          word('b2', ['溶質', '溶媒', '溶液'], '溶液'),
        ],
        explanation: 'とけている食塩が溶質、とかしている水が溶媒、それらが合わさった食塩水全体が溶液です。溶媒が水なので、食塩水は水溶液でもあります。',
        hint: 'とけているもの・とかしているもの・全体、の 3 つに分けよう。',
      }),
      choice({
        id: 'sol-1-p5', concept: 'sol-particle',
        prompt: '食塩水をろ紙でろ過しました。どうなる？',
        options: ['食塩はろ紙に残り、水だけが出てくる', '食塩水がそのままろ紙を通りぬける', '液は少しもろ紙を通らない'],
        answer: 'b',
        explanation: 'とけた食塩の粒子は、ろ紙のすき間よりずっと小さいので、水といっしょにろ紙を通りぬけます。だから、ろ過では水溶液から溶質を取り出せません。',
        hint: 'とけた物質の粒子の大きさを思い出そう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'sol-1-r1', concept: 'sol-terms',
        prompt: '砂糖水で、溶質にあたるものはどれ？',
        options: ['砂糖', '水', '砂糖水'],
        answer: 'a',
        explanation: '溶質は、とけている物質なので砂糖です。水は砂糖をとかしている溶媒、砂糖水は全体で溶液です。',
        hint: 'とけているのはどちらか考えよう。',
      }),
      choice({
        id: 'sol-1-r2', concept: 'sol-particle',
        prompt: '青色の硫酸銅を水にとかし、すべてとけてから長い時間おきました。液の色はどうなっている？',
        options: ['下のほうほど濃い青色', '上のほうほど濃い青色', 'どこも同じ濃さの青色'],
        answer: 'c',
        explanation: 'とけた硫酸銅の粒子は水の中に均一に広がるので、液はどこも同じ濃さの青色になります。時間がたっても、下にたまることはありません。',
        hint: '水溶液はどこも同じ濃さだったね。',
      }),
      choice({
        id: 'sol-1-r3', concept: 'sol-particle',
        prompt: '次のうち、水溶液といえるものはどれ？',
        options: ['泥水', '牛乳', '砂糖水'],
        answer: 'c',
        explanation: '砂糖水はすきとおっていて、どこも同じ濃さなので水溶液です。泥水や牛乳はにごっていて、すきとおっていないので水溶液ではありません。',
        hint: 'すきとおっているものをさがそう。',
      }),
      choice({
        id: 'sol-1-t2', concept: 'sol-terms', term: true,
        prompt: '次の説明に合う言葉はどれ？「物質をとかしている液体（砂糖水なら水）」',
        options: ['溶質', '溶媒', '溶液'],
        answer: 'b',
        explanation: '物質をとかしている液体を**溶媒**といいます。溶媒が水である溶液を水溶液といいます。',
        hint: '「とかす側」の液体の名前だよ。',
      }),
    ],
  };

  // ---- ステージ sol-2: 質量パーセント濃度 ----
  const sol2 = {
    id: 'sol-2', areaId: 'dissolve', title: '質量パーセント濃度', minutes: 5, concepts: ['sol-concentration'],
    lessons: [
      {
        id: 'sol-2-c1',
        text: '溶液の濃さは、溶液の質量に対する溶質の質量の割合で表します。これを**質量パーセント濃度**といいます。質量パーセント濃度〔%〕＝ 溶質の質量〔g〕÷ 溶液の質量〔g〕× 100 で求めます。',
        // 質量パーセント濃度の式
        figure: scene([
          { type: 'text', x: 160, y: 50, text: '質量パーセント濃度〔%〕＝', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 130, y: 104, text: '溶質の質量〔g〕', size: 16, anchor: 'middle' },
          { type: 'line', points: [[50, 118], [210, 118]], width: 2 },
          { type: 'text', x: 130, y: 144, text: '溶液の質量〔g〕', size: 16, anchor: 'middle' },
          { type: 'text', x: 222, y: 124, text: '× 100', size: 16 },
          { type: 'text', x: 160, y: 200, text: '溶液の質量 ＝ 溶質の質量 ＋ 溶媒の質量', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'sol-2-c2',
        text: '溶液の質量は、**溶質**の質量と**溶媒**の質量の和です。水 80 g に食塩 20 g をとかすと、食塩水は 100 g になります。濃度は 20 ÷ 100 × 100 ＝ 20 % です。水の質量 80 g でわらないように気をつけよう。',
        // 食塩 20 g ＋ 水 80 g → 食塩水 100 g
        figure: scene([
          { type: 'text', x: 160, y: 36, text: '溶液の質量 ＝ 溶質 ＋ 溶媒', size: 14, anchor: 'middle' },
          { type: 'rect', x: 26, y: 150, width: 36, height: 30, fill: 'white' },
          { type: 'text', x: 84, y: 172, text: '＋', size: 18, anchor: 'middle' },
          { type: 'beaker', x: 140, y: 190, width: 70, height: 80, level: 0.6 },
          { type: 'arrow', x1: 184, y1: 150, x2: 214, y2: 150, color: 'gray' },
          { type: 'beaker', x: 264, y: 190, width: 70, height: 80, level: 0.66 },
          { type: 'text', x: 44, y: 210, text: '食塩 20 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 140, y: 210, text: '水 80 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 264, y: 210, text: '食塩水 100 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 234, text: '濃度 ＝ 20 ÷ 100 × 100 ＝ 20 %', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'sol-2-c3',
        text: '**質量パーセント濃度**と溶液の質量が分かれば、とけている溶質の質量も求められます。溶質の質量 ＝ 溶液の質量 × 濃度 ÷ 100 です。10 % の食塩水 200 g には、200 × 10 ÷ 100 ＝ 20 g の食塩がとけています。',
        // 10 % の食塩水 200 g → 食塩 20 g
        figure: scene([
          { type: 'beaker', x: 90, y: 190, width: 110, height: 120, level: 0.7 },
          { type: 'text', x: 90, y: 214, text: '10 % の食塩水 200 g', size: 13, anchor: 'middle' },
          { type: 'arrow', x1: 156, y1: 130, x2: 200, y2: 130, color: 'gray' },
          { type: 'rect', x: 222, y: 112, width: 50, height: 36, fill: 'white' },
          { type: 'text', x: 247, y: 172, text: '食塩 20 g', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 40, text: '溶質の質量 ＝ 溶液の質量 × 濃度 ÷ 100', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 236, text: '200 × 10 ÷ 100 ＝ 20', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'sol-2-w1', concept: 'sol-concentration',
      prompt: '予想しよう。水 100 g に砂糖 10 g をとかした砂糖水と、水 100 g に砂糖 20 g をとかした砂糖水。濃いのはどちらだと思う？',
      options: ['砂糖 10 g のほう', '砂糖 20 g のほう', 'どちらも同じ'],
      answer: 'b',
      explanation: '同じ量の水に、より多くの砂糖をとかしたほうが濃くなります。濃さを数で表す方法を、このステージで学ぼう。',
      hint: '同じ水の量に、とけている砂糖が多いのはどちらかな。',
    }),
    problems: [
      fill({
        id: 'sol-2-p1', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 80 g に食塩 20 g をとかした食塩水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 20, 0.1, '%')],
        explanation: '食塩水の質量は 80 ＋ 20 ＝ 100 g です。20 ÷ 100 × 100 ＝ 20 % になります。わる数は水ではなく、食塩水全体の質量です。',
        hint: 'まず、食塩水全体の質量を求めよう。',
      }),
      fill({
        id: 'sol-2-t1', concept: 'sol-concentration', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '溶液の質量に対する溶質の質量の割合を百分率（%）で表したものを[b1]という。',
        blanks: [word('b1', ['質量パーセント濃度', '密度', '溶質'], '質量パーセント濃度')],
        explanation: '溶液の濃さを、溶質の質量 ÷ 溶液の質量 × 100 で表したものを**質量パーセント濃度**といいます。単位は % です。',
        hint: '「質量」と「パーセント」が名前に入っているよ。',
      }),
      figureChoice({
        id: 'sol-2-p2', concept: 'sol-concentration',
        prompt: '3 つの食塩水があります。ア 食塩 10 g を水 90 g に、イ 食塩 20 g を水 180 g に、ウ 食塩 20 g を水 80 g にとかした。いちばん濃いのはどれ？',
        figure: scene([
          { type: 'text', x: 160, y: 22, text: 'いちばん濃い食塩水はどれ？', size: 14, anchor: 'middle' },
          { type: 'beaker', x: 55, y: 170, width: 70, height: 80, level: 0.6 },
          { type: 'beaker', x: 160, y: 170, width: 70, height: 80, level: 0.8 },
          { type: 'beaker', x: 265, y: 170, width: 70, height: 80, level: 0.6 },
          { type: 'text', x: 55, y: 194, text: '食塩 10 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 55, y: 212, text: '水 90 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 194, text: '食塩 20 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 212, text: '水 180 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 265, y: 194, text: '食塩 20 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 265, y: 212, text: '水 80 g', size: 13, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 55, y: 60, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 60, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 265, y: 60, r: 22, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: 'アは 10 ÷ 100 × 100 ＝ 10 %、イは 20 ÷ 200 × 100 ＝ 10 %、ウは 20 ÷ 100 × 100 ＝ 20 % です。食塩の量だけでなく、溶液全体の質量で比べることが大切です。',
        hint: 'それぞれの溶液の質量を出して、濃度を計算しよう。',
      }),
      fill({
        id: 'sol-2-p3', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 75 g に砂糖 25 g をとかした砂糖水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 25, 0.1, '%')],
        explanation: '砂糖水の質量は 75 ＋ 25 ＝ 100 g です。25 ÷ 100 × 100 ＝ 25 % になります。',
        hint: '溶液の質量 ＝ 溶質の質量 ＋ 溶媒の質量 だよ。',
      }),
      fill({
        id: 'sol-2-p4', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '質量パーセント濃度 10 % の食塩水 200 g にとけている食塩の質量は[b1]である。',
        blanks: [number('b1', 20, 0.1, 'g')],
        explanation: '溶質の質量 ＝ 溶液の質量 × 濃度 ÷ 100 なので、200 × 10 ÷ 100 ＝ 20 g です。10 % は「全体の 10 分の 1」と考えることもできます。',
        hint: '食塩水 200 g の 10 % が食塩の質量だよ。',
      }),
      choice({
        id: 'sol-2-p5', concept: 'sol-concentration',
        prompt: '水 100 g に食塩 25 g をとかしました。この食塩水の質量パーセント濃度の求め方として正しいものはどれ？',
        options: ['25 ÷ 100 × 100', '25 ÷ 125 × 100', '100 ÷ 125 × 100'],
        answer: 'b',
        explanation: '食塩水の質量は 100 ＋ 25 ＝ 125 g なので、25 ÷ 125 × 100 ＝ 20 % です。水の質量 100 g でわってしまうまちがいが多いので、わる数は溶液全体と覚えておこう。',
        hint: 'わる数は、水ではなく食塩水全体の質量だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'sol-2-r1', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 90 g に食塩 10 g をとかした食塩水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 10, 0.1, '%')],
        explanation: '食塩水の質量は 90 ＋ 10 ＝ 100 g なので、10 ÷ 100 × 100 ＝ 10 % です。',
        hint: 'まず、食塩水全体の質量を求めよう。',
      }),
      fill({
        id: 'sol-2-r2', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '質量パーセント濃度 5 % の食塩水 300 g にとけている食塩の質量は[b1]である。',
        blanks: [number('b1', 15, 0.1, 'g')],
        explanation: '300 × 5 ÷ 100 ＝ 15 g です。溶液の質量に濃度をかけて 100 でわると、溶質の質量が出ます。',
        hint: '溶質の質量 ＝ 溶液の質量 × 濃度 ÷ 100 だよ。',
      }),
      choice({
        id: 'sol-2-r3', concept: 'sol-concentration',
        prompt: '食塩水の質量パーセント濃度を求めるとき、わる数（分母）にするのはどれ？',
        options: ['食塩の質量', '水の質量', '食塩水全体の質量'],
        answer: 'c',
        explanation: '質量パーセント濃度は、溶質の質量 ÷ 溶液の質量 × 100 です。わる数は、溶質と溶媒を合わせた食塩水全体の質量です。',
        hint: '「溶液の質量に対する」割合だったね。',
      }),
      choice({
        id: 'sol-2-t2', concept: 'sol-concentration', term: true,
        prompt: '次の説明に合う言葉はどれ？「溶質の質量 ÷ 溶液の質量 × 100 で求める、溶液の濃さ」',
        options: ['質量パーセント濃度', '密度', '溶媒'],
        answer: 'a',
        explanation: '溶液の濃さをこの式で表したものを**質量パーセント濃度**といいます。単位は % です。',
        hint: '単位が % になる量だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 溶解度
  // ================================================================

  // ---- ステージ sol-3: 溶解度と飽和水溶液（溶解度曲線の読み取り） ----
  const sol3 = {
    id: 'sol-3', areaId: 'sol-solubility', title: '溶解度と飽和水溶液', minutes: 5, concepts: ['sol-solubility'],
    lessons: [
      {
        id: 'sol-3-c1',
        anim: 'sl-saturate',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '物質を水にとかしていくと、やがてそれ以上とけなくなります。物質がそれ以上とけきれなくなった水溶液を**飽和水溶液**といいます。水 100 g にとける物質の最大の質量を**溶解度**といい、物質の種類と水の温度で決まります。',
        // とけ残りが出た飽和水溶液
        figure: scene([
          { type: 'beaker', x: 140, y: 200, width: 130, height: 130, level: 0.7 },
          { type: 'polygon', points: [[100, 196], [112, 186], [126, 190], [136, 184], [150, 190], [164, 185], [178, 196]], fill: 'white' },
          { type: 'arrow', x1: 236, y1: 178, x2: 186, y2: 190, color: 'gray' },
          { type: 'text', x: 240, y: 172, text: 'とけ残り', size: 14 },
          { type: 'arrow', x1: 236, y1: 118, x2: 196, y2: 128, color: 'gray' },
          { type: 'text', x: 240, y: 112, text: '飽和水溶液', size: 14 },
          { type: 'text', x: 140, y: 36, text: 'もうこれ以上とけない', size: 14, anchor: 'middle' },
          { type: 'text', x: 140, y: 228, text: '水 100 g', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'sol-3-c2',
        text: '温度と溶解度の関係を表したグラフを**溶解度曲線**といいます。硝酸カリウムは、温度が上がると溶解度が大きく増えます。塩化ナトリウム（食塩）は、温度が変わっても溶解度がほとんど変わりません。',
        // 溶解度曲線（硝酸カリウムと塩化ナトリウム）
        figure: scene(graphItems(true)),
      },
      {
        id: 'sol-3-c3',
        text: 'グラフから、とける量を読み取れます。60 ℃ の水 100 g には、硝酸カリウムが約 110 g までとけます。とかす量が**溶解度**より少なければすべてとけ、多ければとけ残りが出ます。',
        // 60 ℃ の目盛りから曲線まで上がり、縦軸を読む
        figure: scene(moveText(graphItems(false), '塩化ナトリウム', 200, 176).concat([
          { type: 'line', points: [[gx(60), 210], [gx(60), gy(110)]], color: 'orange', width: 2, dashed: true },
          { type: 'line', points: [[gx(60), gy(110)], [50, gy(110)]], color: 'orange', width: 2, dashed: true, arrow: true },
          { type: 'circle', x: gx(60), y: gy(110), r: 5, fill: 'orange', stroke: 'none' },
          { type: 'text', x: 60, y: gy(110) - 6, text: '約 110 g', size: 13, bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'sol-3-w1', concept: 'sol-solubility',
      prompt: '予想しよう。水 100 g に食塩を少しずつ入れてかき混ぜていくと、どうなると思う？',
      options: ['いくらでもとけ続ける', 'ある量をこえると、とけ残るようになる', 'はじめから少しもとけない'],
      answer: 'b',
      explanation: '水にとける量には限りがあり、ある量をこえるととけ残ります。その限りの量を、このステージで学ぼう。',
      hint: 'コップの水に砂糖をどんどん入れたときを思い出そう。',
    }),
    problems: [
      choice({
        id: 'sol-3-p1', concept: 'sol-solubility',
        prompt: '図は溶解度曲線です。温度が変わっても、溶解度がほとんど変わらない物質はどれ？',
        figure: scene(graphItems(false)),
        options: ['硝酸カリウム', '塩化ナトリウム', 'どちらも大きく変わる'],
        answer: 'b',
        explanation: '塩化ナトリウムの曲線はほぼ横にまっすぐで、温度が変わっても溶解度はあまり変わりません。硝酸カリウムの曲線は右上がりで、温度が上がると溶解度が大きく増えます。',
        hint: 'グラフが横にまっすぐなのはどちらの曲線かな。',
      }),
      fill({
        id: 'sol-3-t1', concept: 'sol-solubility', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質がそれ以上とけきれなくなった水溶液を[b1]という。水 100 g にとける物質の最大の質量を[b2]という。',
        blanks: [
          word('b1', ['飽和水溶液', '溶解度', '溶液'], '飽和水溶液'),
          word('b2', ['飽和水溶液', '溶解度', '溶液'], '溶解度'),
        ],
        explanation: 'もうとけきれなくなった水溶液が**飽和水溶液**、水 100 g にとける最大の質量が**溶解度**です。溶解度は物質の種類と温度で決まります。',
        hint: '「飽和」は、もういっぱいという意味だよ。',
      }),
      fill({
        id: 'sol-3-p2', concept: 'sol-solubility',
        prompt: '図の溶解度曲線を読んで、空らんに入る数を入れよう。',
        figure: scene(graphItems(false)),
        text: '40 ℃ の水 100 g にとける硝酸カリウムの質量は、約[b1]である。',
        blanks: [number('b1', 64, 4, 'g')],
        explanation: '横軸の 40 ℃ から上にたどり、硝酸カリウムの曲線と交わる点の縦軸を読むと、約 64 g です。40 ℃ の水 100 g には、硝酸カリウムが約 64 g までとけます。',
        hint: '横軸の 40 から上にたどって、青い曲線にぶつかるところを見よう。',
      }),
      figureChoice({
        id: 'sol-3-p3', concept: 'sol-solubility',
        prompt: '40 ℃ の水 100 g に硝酸カリウムを ア 100 g、イ 64 g、ウ 30 g 入れて、よくかき混ぜました（40 ℃ では約 64 g までとける）。とけ残りが出るのはどれ？ 図の点ア〜ウから選ぼう。',
        figure: scene(moveText(graphItems(false), '塩化ナトリウム', 300, 150, 'end').concat([
          { type: 'region', id: 'r1', x: gx(40), y: gy(100), r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: gx(40), y: gy(64), r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: gx(40), y: gy(30), r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '曲線より上の点は、溶解度より多くとかそうとしているので、とけ残りが出ます。アの 100 g は 64 g より多いので、約 36 g がとけ残ります。イはちょうど飽和水溶液、ウはまだとかすことができます。',
        hint: '曲線より上か下かで考えよう。',
      }),
      drag({
        id: 'sol-3-p4', concept: 'sol-solubility',
        prompt: '60 ℃ の水 100 g に硝酸カリウム 64 g をすべてとかし、ゆっくり冷やしていきます。この水溶液がちょうど飽和水溶液になる温度に、オレンジの印を左右に動かして置こう。',
        // 64 g の横線（y = 114）と硝酸カリウムの曲線が交わるのは 40 ℃（x = 210）
        figure: scene(graphItems(false).concat([
          { type: 'line', points: [[50, gy(64)], [290, gy(64)]], color: 'orange', width: 2, dashed: true },
          { type: 'text', x: 56, y: gy(64) - 6, text: '64 g', size: 13, color: 'orange' },
          { type: 'circle', id: 'mark', x: 270, y: gy(64), r: 10, fill: 'orange', stroke: 'ink' },
        ])),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: gx(40), y: gy(64) },
        samples: { correct: { x: gx(40), y: gy(64) }, wrong: { x: gx(20), y: gy(64) } },
        explanation: '64 g の横線が硝酸カリウムの曲線と交わるところが、溶解度がちょうど 64 g になる温度で、約 40 ℃ です。ここまで冷やすと飽和水溶液になり、さらに冷やすと結晶が出はじめます。',
        hint: 'オレンジの点線が、青い曲線とぶつかるところをさがそう。',
      }),
      choice({
        id: 'sol-3-p5', concept: 'sol-solubility',
        prompt: '図の溶解度曲線を見て答えよう。10 ℃ の水 100 g に、硝酸カリウムと塩化ナトリウムをそれぞれ 30 g ずつ入れて、よくかき混ぜました。とけ残りが出るのはどれ？',
        figure: scene(graphItems(false)),
        options: ['硝酸カリウム', '塩化ナトリウム', 'どちらもすべてとける'],
        answer: 'a',
        explanation: '10 ℃ での溶解度は、硝酸カリウムが約 22 g、塩化ナトリウムが約 36 g です。30 g は硝酸カリウムの溶解度より多いので、硝酸カリウムだけがとけ残ります。',
        hint: '10 ℃ のところで、2 本の曲線の高さを比べよう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'sol-3-r1', concept: 'sol-solubility',
        prompt: '図の溶解度曲線を読んで、空らんに入る数を入れよう。',
        figure: scene(graphItems(false)),
        text: '20 ℃ の水 100 g にとける硝酸カリウムの質量は、約[b1]である。',
        blanks: [number('b1', 32, 4, 'g')],
        explanation: '横軸の 20 ℃ から上にたどると、硝酸カリウムの曲線とは約 32 g で交わります。20 ℃ では、硝酸カリウムより塩化ナトリウムのほうが多くとけます。',
        hint: '横軸の 20 から上にたどって、青い曲線にぶつかるところを見よう。',
      }),
      choice({
        id: 'sol-3-r2', concept: 'sol-solubility',
        prompt: '20 ℃ の水 100 g には、塩化ナトリウムが約 36 g までとけます。20 ℃ の水 200 g には、約何 g までとける？',
        options: ['18 g', '36 g', '72 g'],
        answer: 'c',
        explanation: 'とける量は水の量に比例します。水が 2 倍の 200 g なら、とける量も 2 倍の約 72 g です。溶解度は「水 100 g あたり」の量であることに気をつけよう。',
        hint: '水の量が 2 倍になると、とける量はどうなるかな。',
      }),
      choice({
        id: 'sol-3-r3', concept: 'sol-solubility',
        prompt: '飽和水溶液の説明として正しいものはどれ？',
        options: ['その温度で、物質がそれ以上とけきれなくなった水溶液', '濃度が 100 % の水溶液', '水がすべて蒸発したあとに残った液'],
        answer: 'a',
        explanation: '飽和水溶液は、その温度で物質がもうとけきれなくなった水溶液です。温度が変わると、とけられる量も変わります。',
        hint: '「飽和」は、もういっぱいという意味だよ。',
      }),
      choice({
        id: 'sol-3-t2', concept: 'sol-solubility', term: true,
        prompt: '次の説明に合う言葉はどれ？「温度と溶解度の関係を表したグラフ」',
        options: ['溶解度曲線', '飽和水溶液', '質量パーセント濃度'],
        answer: 'a',
        explanation: '温度と溶解度の関係を表したグラフを**溶解度曲線**といいます。とける量の読み取りや、結晶が出る量の計算に使います。',
        hint: '溶解度の「曲線」だよ。',
      }),
    ],
  };

  // ---- ステージ sol-4: 再結晶（冷やす・蒸発させる、結晶の形、ろ過） ----
  const sol4 = {
    id: 'sol-4', areaId: 'sol-solubility', title: '再結晶', minutes: 5, concepts: ['sol-recrystal'],
    lessons: [
      {
        id: 'sol-4-c1',
        text: '固体の物質をいったん水にとかし、水溶液を冷やしたり水を蒸発させたりして、再び固体として取り出すことを**再結晶**といいます。このとき出てくる、規則正しい形をした固体を**結晶**といいます。',
        // 写真: 冷やした硝酸カリウムの水溶液。液の中と底に針のような結晶 (150〜300, 75〜210) が出ている
        figure: scene([
          photo('sol-4-c1'),
          tag(54, 44, '60 ℃', { size: 16, bold: true }),
          tag(54, 66, 'すべて', { size: 13 }),
          tag(54, 84, 'とけていた', { size: 13 }),
          { type: 'arrow', x1: 54, y1: 96, x2: 54, y2: 134, color: 'blue', width: 3 },
          tag(82, 120, '冷やす', { size: 13 }),
          tag(54, 156, '20 ℃', { size: 16, bold: true }),
          tag(54, 178, '結晶が', { size: 13 }),
          tag(54, 196, '出てくる', { size: 13 }),
          pointer(86, 192, 152, 180),
        ]),
      },
      {
        id: 'sol-4-c2',
        anim: 'sl-recrystallize',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '温度による溶解度の差が大きい硝酸カリウムは、冷やすと**結晶**が多く出ます。60 ℃ の水 100 g に 110 g とかして 20 ℃ まで冷やすと、20 ℃ では 32 g しかとけないので、110 − 32 ＝ 78 g が結晶になります。',
        // 溶解度曲線で、60 ℃ の 110 g と 20 ℃ の 32 g の差が結晶になる
        figure: scene(moveText(graphItems(true), '硝酸カリウム', 262, 60, 'end').concat([
          { type: 'line', points: [[gx(60), gy(110)], [gx(20), gy(110)]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[gx(20), gy(110)], [gx(20), gy(32) - 4]], color: 'orange', width: 3, arrow: true },
          { type: 'text', x: gx(20) + 8, y: 100, text: '78 g が', size: 13, color: 'orange', bold: true },
          { type: 'text', x: gx(20) + 8, y: 116, text: '結晶になる', size: 13, color: 'orange', bold: true },
        ])),
      },
      {
        id: 'sol-4-c3',
        text: '塩化ナトリウムは温度で溶解度がほとんど変わらないので、冷やしても**結晶**はあまり出ません。水を**蒸発**させて取り出します。結晶の形は物質によって決まっていて、塩化ナトリウムは立方体、ミョウバンは正八面体のような形です。',
        // 写真: 黒い台紙の上の結晶（左から 硝酸カリウムの針・塩化ナトリウムの立方体・ミョウバンの正八面体）
        figure: scene([
          photo('sol-4-c3'),
          tag(62, 184, '硝酸カリウム', { size: 13 }),
          tag(167, 184, '塩化ナトリウム', { size: 13 }),
          tag(260, 184, 'ミョウバン', { size: 13 }),
          tag(62, 204, '（針のような形）', { size: 13 }),
          tag(167, 204, '（立方体）', { size: 13 }),
          tag(260, 204, '（正八面体）', { size: 13 }),
          tag(160, 230, '結晶の形は物質で決まっている', { size: 13 }),
        ]),
      },
      {
        id: 'sol-4-c4',
        text: '出てきた結晶は**ろ過**で液と分けます。液はガラス棒に伝わらせて静かに注ぎ、ろうとの足の長いほう（とがったほう）をビーカーの内側の壁につけます。ろ紙を通りぬけた液を**ろ液**といいます。',
        // 正しいろ過のしかた（写真: ろうと台の柱 (80〜89)、ろうと (122〜190, 80〜118) にろ紙、ろうとの足 (150〜160, 128〜) は
        // 下のビーカー (148〜200, 147〜210) の左の内側の壁に沿って下り、先 (152, 195) が壁につく。ガラス棒 (172, 90)〜(207, 35) を
        // 伝わらせて上のビーカー (200〜278, 0〜68) から注ぐ。ろ液は下のビーカーの底 (186〜210)。文字は右の白い余白 (205〜320) に置く）
        figure: scene([
          photo('sol-4-c4'),
          pointer(236, 92, 188, 70), tag(266, 96, 'ガラス棒', { size: 13 }),
          pointer(246, 118, 178, 102), tag(266, 122, 'ろ紙', { size: 13 }),
          pointer(240, 142, 160, 134), tag(266, 146, 'ろうと', { size: 13 }),
          pointer(214, 172, 155, 192), tag(264, 176, '足を壁につける', { size: 13, bold: true }),
          pointer(248, 204, 190, 200), tag(266, 208, 'ろ液', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'sol-4-w1', concept: 'sol-recrystal',
      prompt: '予想しよう。60 ℃ の水に硝酸カリウムをたくさんとかした水溶液を、氷水で冷やすとどうなると思う？',
      options: ['何も変わらない', '固体のつぶ（結晶）が出てくる', '水溶液がすぐにこおる'],
      answer: 'b',
      explanation: '温度が下がるととける量が減るので、とけきれなくなった分が固体として出てきます。このしくみを、このステージで学ぼう。',
      hint: '前のステージの溶解度曲線を思い出そう。',
    }),
    problems: [
      fill({
        id: 'sol-4-p1', concept: 'sol-recrystal',
        prompt: '空らんに入る数を入れよう。20 ℃ の水 100 g には、硝酸カリウムが 32 g までとける。',
        text: '60 ℃ の水 100 g に硝酸カリウムを 110 g とかした水溶液を 20 ℃ まで冷やすと、出てくる結晶は[b1]である。',
        blanks: [number('b1', 78, 0.1, 'g')],
        explanation: '20 ℃ では 32 g までしかとけないので、とけきれなくなった 110 − 32 ＝ 78 g が結晶として出てきます。とかした量から、冷やした温度でとける量を引けばよいです。',
        hint: 'とかした量と、20 ℃ でとける量の差を考えよう。',
      }),
      fill({
        id: 'sol-4-t1', concept: 'sol-recrystal', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '固体の物質を水にとかし、冷やしたり水を蒸発させたりして、再び結晶として取り出すことを[b1]という。',
        blanks: [word('b1', ['再結晶', 'ろ過', '蒸発'], '再結晶')],
        explanation: '一度とかした物質を、再び結晶として取り出すことを**再結晶**といいます。物質をより純粋にするときに使う方法です。',
        hint: '「再び」「結晶」にする、という意味の言葉だよ。',
      }),
      figureChoice({
        id: 'sol-4-p2', concept: 'sol-recrystal',
        prompt: '正しいろ過のしかたはどれ？ ア ガラス棒を使い、ろうとの足をビーカーの壁につける、イ ガラス棒を使い、ろうとの足をビーカーの真ん中に入れる、ウ ガラス棒を使わずに液を直接注ぐ。',
        figure: scene([
          ...filterSetup(40, true, true),
          ...filterSetup(150, false, true),
          ...filterSetup(250, true, false),
          { type: 'region', id: 'r1', x: 56, y: 216, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 150, y: 216, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 266, y: 216, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '液はガラス棒に伝わらせて注ぐと、飛び散らずにろ紙へ静かに入ります。ろうとの足をビーカーの壁につけると、ろ液が壁を伝って静かに落ち、はねにくくなります。アはこの 2 つができています。',
        hint: 'ガラス棒と、ろうとの足の位置の 2 つを確かめよう。',
      }),
      drag({
        id: 'sol-4-p3', concept: 'sol-recrystal',
        prompt: '60 ℃ の水 100 g に硝酸カリウムを 110 g とかし、40 ℃ まで冷やしました。40 ℃ のときに水にとけている硝酸カリウムの質量を表す位置に、オレンジの印を上下に動かして置こう（横軸は 40 ℃ のところ）。',
        // 40 ℃ の溶解度は 64 g（曲線上の点 (gx(40), gy(64))）。110 g（結晶が出ないと思った位置）は 69px、46 g（結晶の量）は 27px、
        // 塩化ナトリウムの 36 g は 42px はなれる（20 ℃ だと塩化ナトリウムの 36 g が許容 16px に入ってしまうため 40 ℃ にした）
        figure: scene(graphItems(false).concat([
          { type: 'line', points: [[gx(40), 210], [gx(40), gy(110)]], color: 'orange', width: 2, dashed: true },
          { type: 'line', points: [[50, gy(110)], [gx(60), gy(110)]], color: 'gray', width: 2, dashed: true },
          { type: 'text', x: 56, y: gy(110) - 6, text: '110 g', size: 13, color: 'gray' },
          { type: 'circle', id: 'mark', x: gx(40), y: gy(110), r: 10, fill: 'orange', stroke: 'ink' },
        ])),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: gx(40), y: gy(64) },
        samples: { correct: { x: gx(40), y: gy(64) }, wrong: { x: gx(40), y: gy(110) } },
        explanation: '40 ℃ の溶解度は約 64 g なので、40 ℃ でとけていられるのは 64 g までです。残りの 110 − 64 = 46 g は、とけきれずに結晶として出てきます。印は 40 ℃ の縦線と硝酸カリウムの曲線が交わるところ（64 g）に置きます。',
        hint: '40 ℃ の縦線が青い曲線とぶつかる高さをさがそう。',
      }),
      choice({
        id: 'sol-4-p4', concept: 'sol-recrystal',
        prompt: '塩化ナトリウムの水溶液から、塩化ナトリウムの結晶を取り出すには、どうするのがよい？',
        options: ['水溶液を冷やす', '水溶液を加熱して水を蒸発させる', '水溶液をろ過する'],
        answer: 'b',
        explanation: '塩化ナトリウムは温度で溶解度がほとんど変わらないので、冷やしても結晶はあまり出ません。水を蒸発させると、とけきれなくなった塩化ナトリウムが結晶として出てきます。ろ過では、とけている物質は取り出せません。',
        hint: '塩化ナトリウムの溶解度曲線の形を思い出そう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'sol-4-r1', concept: 'sol-recrystal',
        prompt: '空らんに入る数を入れよう。20 ℃ の水 100 g には、硝酸カリウムが 32 g までとける。',
        text: '40 ℃ の水 100 g に硝酸カリウムを 64 g とかした水溶液を 20 ℃ まで冷やすと、出てくる結晶は[b1]である。',
        blanks: [number('b1', 32, 0.1, 'g')],
        explanation: '20 ℃ では 32 g までしかとけないので、64 − 32 ＝ 32 g が結晶として出てきます。',
        hint: 'とかした量から、20 ℃ でとける量を引こう。',
      }),
      figureChoice({
        id: 'sol-4-r2', concept: 'sol-recrystal',
        prompt: 'ア 針のような形、イ 立方体、ウ 正八面体 の結晶があります。塩化ナトリウム（食塩）の結晶はどれ？',
        figure: crystalChoiceScene(),
        answer: 'r2',
        explanation: '塩化ナトリウムの結晶は、さいころのような立方体の形をしています。針のような形は硝酸カリウム、正八面体はミョウバンの結晶です。結晶の形は物質によって決まっています。',
        hint: '食塩のつぶをルーペで見ると、さいころのような形をしているよ。',
      }),
      choice({
        id: 'sol-4-r3', concept: 'sol-recrystal',
        prompt: '硝酸カリウムと塩化ナトリウムの飽和水溶液（どちらも水 100 g）を、60 ℃ から 20 ℃ まで冷やしました。結晶が多く出るのはどちら？',
        options: ['硝酸カリウム', '塩化ナトリウム', 'どちらも同じくらい'],
        answer: 'a',
        explanation: '硝酸カリウムは温度による溶解度の差が大きいので、冷やすと多くの結晶が出ます。塩化ナトリウムは溶解度がほとんど変わらないので、結晶はわずかしか出ません。',
        hint: '溶解度曲線のかたむきを比べよう。',
      }),
      choice({
        id: 'sol-4-t2', concept: 'sol-recrystal', term: true,
        prompt: '次の説明に合う言葉はどれ？「いくつかの平面で囲まれた、規則正しい形をした固体」',
        options: ['結晶', 'ろ液', '溶媒'],
        answer: 'a',
        explanation: '規則正しい形をした固体を**結晶**といいます。結晶の形は物質によって決まっているので、物質を見分ける手がかりになります。',
        hint: '再結晶で取り出せるものの名前だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'sol-terms', title: '溶質・溶媒・溶液', basic: null, lessonStageId: 'sol-1',
      checkPool: [
        choice({
          id: 'sol-terms-k1', concept: 'sol-terms',
          prompt: '塩化ナトリウム水溶液（食塩水）で、溶質はどれ？',
          options: ['水', '塩化ナトリウム', '塩化ナトリウム水溶液'],
          answer: 'b',
          explanation: '溶質はとけている物質なので、塩化ナトリウムです。水は溶媒、塩化ナトリウム水溶液は溶液です。',
          hint: 'とけているのはどちらか考えよう。',
        }),
        fill({
          id: 'sol-terms-k2', concept: 'sol-terms',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '砂糖水では、砂糖が[b1]、水が[b2]、砂糖水全体が[b3]である。',
          blanks: [
            word('b1', ['溶質', '溶媒', '溶液'], '溶質'),
            word('b2', ['溶質', '溶媒', '溶液'], '溶媒'),
            word('b3', ['溶質', '溶媒', '溶液'], '溶液'),
          ],
          explanation: 'とけている砂糖が溶質、とかしている水が溶媒、合わせた砂糖水全体が溶液です。',
          hint: 'とけているもの・とかしているもの・全体、の順に考えよう。',
        }),
        choice({
          id: 'sol-terms-k3', concept: 'sol-terms',
          prompt: '溶液の説明として正しいものはどれ？',
          options: ['とけている物質だけのこと', 'とかしている液体だけのこと', '溶質が溶媒にとけた液全体のこと'],
          answer: 'c',
          explanation: '溶液は、溶質が溶媒にとけた液全体のことです。溶媒が水のとき、その溶液を水溶液といいます。',
          hint: '砂糖水全体を何とよんだか思い出そう。',
        }),
      ],
    },
    {
      id: 'sol-particle', title: '粒子のモデルと水溶液の性質', basic: 'sol-terms', lessonStageId: 'sol-1',
      checkPool: [
        choice({
          id: 'sol-particle-k1', concept: 'sol-particle',
          prompt: '砂糖が水にとけると、砂糖が見えなくなるのはなぜ？',
          options: ['砂糖がなくなってしまったから', '砂糖が目に見えないほど小さな粒子に分かれて広がったから', '砂糖が水に変わったから'],
          answer: 'b',
          explanation: '砂糖は目に見えないほど小さな粒子に分かれて、水の中に広がっています。なくなったわけではないので、砂糖水は甘く、全体の質量も変わりません。',
          hint: '砂糖水をなめると甘いことを思い出そう。',
        }),
        choice({
          id: 'sol-particle-k2', concept: 'sol-particle',
          prompt: '水にとけた物質の粒子は、時間がたつとどうなる？',
          options: ['下にたまる', '水の中に均一に広がったまま', '上に浮かんでくる'],
          answer: 'b',
          explanation: 'とけた物質の粒子は水の中に均一に広がり、時間がたってもそのままです。だから水溶液はどこも同じ濃さです。',
          hint: '水溶液は、時間がたっても濃さが変わらなかったね。',
        }),
        choice({
          id: 'sol-particle-k3', concept: 'sol-particle',
          prompt: '次のうち、水溶液といえるものはどれ？',
          options: ['泥をまぜた水', 'デンプンをまぜた白くにごった水', '硫酸銅をとかした青色ですきとおった液'],
          answer: 'c',
          explanation: '硫酸銅をとかした液は、青色でもすきとおっているので水溶液です。泥やデンプンをまぜた水はにごっていて、しばらくおくと下にたまるので水溶液ではありません。',
          hint: '色があるかどうかではなく、すきとおっているかどうかで考えよう。',
        }),
      ],
    },
    {
      id: 'sol-concentration', title: '質量パーセント濃度', basic: 'sol-terms', lessonStageId: 'sol-2',
      checkPool: [
        fill({
          id: 'sol-concentration-k1', concept: 'sol-concentration',
          prompt: '空らんに入る数を入れよう。',
          text: '水 150 g に砂糖 50 g をとかした砂糖水の質量パーセント濃度は[b1]である。',
          blanks: [number('b1', 25, 0.1, '%')],
          explanation: '砂糖水の質量は 150 ＋ 50 ＝ 200 g なので、50 ÷ 200 × 100 ＝ 25 % です。',
          hint: 'わる数は砂糖水全体の質量だよ。',
        }),
        fill({
          id: 'sol-concentration-k2', concept: 'sol-concentration',
          prompt: '空らんに入る数を入れよう。',
          text: '質量パーセント濃度 20 % の食塩水 50 g にとけている食塩の質量は[b1]である。',
          blanks: [number('b1', 10, 0.1, 'g')],
          explanation: '50 × 20 ÷ 100 ＝ 10 g です。',
          hint: '溶質の質量 ＝ 溶液の質量 × 濃度 ÷ 100 だよ。',
        }),
        choice({
          id: 'sol-concentration-k3', concept: 'sol-concentration',
          prompt: '水 160 g に食塩 40 g をとかした食塩水の質量パーセント濃度は何 %？',
          options: ['20 %', '25 %', '40 %'],
          answer: 'a',
          explanation: '食塩水の質量は 160 ＋ 40 ＝ 200 g なので、40 ÷ 200 × 100 ＝ 20 % です。水の質量 160 g でわると 25 % になってしまうので注意しよう。',
          hint: '食塩水全体の質量を先に求めよう。',
        }),
      ],
    },
    {
      id: 'sol-solubility', title: '溶解度と飽和水溶液', basic: 'sol-particle', lessonStageId: 'sol-3',
      checkPool: [
        choice({
          id: 'sol-solubility-k1', concept: 'sol-solubility',
          prompt: '溶解度は、何によって決まる？',
          options: ['物質の種類と水の温度', 'かき混ぜる速さ', 'ビーカーの大きさ'],
          answer: 'a',
          explanation: '溶解度は、物質の種類と水の温度で決まります。かき混ぜるととける速さは速くなりますが、とける最大の量は変わりません。',
          hint: '溶解度曲線の横軸は何だったかな。',
        }),
        choice({
          id: 'sol-solubility-k2', concept: 'sol-solubility',
          prompt: '20 ℃ の水 100 g に塩化ナトリウムを 50 g 入れて、よくかき混ぜました。20 ℃ での溶解度は約 36 g です。どうなる？',
          options: ['すべてとける', '約 14 g がとけ残る', '少しもとけない'],
          answer: 'b',
          explanation: '20 ℃ の水 100 g には約 36 g までしかとけないので、50 − 36 ＝ 約 14 g がとけ残ります。このときの液は飽和水溶液です。',
          hint: '入れた量と、とける量の差を考えよう。',
        }),
        fill({
          id: 'sol-solubility-k3', concept: 'sol-solubility',
          prompt: '空らんに入る数を入れよう。60 ℃ の水 100 g には、硝酸カリウムが 110 g までとける。',
          text: '60 ℃ の水 50 g には、硝酸カリウムが[b1]までとける。',
          blanks: [number('b1', 55, 0.1, 'g')],
          explanation: '水の量が半分なので、とける量も半分の 110 ÷ 2 ＝ 55 g です。',
          hint: '水が半分になると、とける量はどうなるかな。',
        }),
      ],
    },
    {
      id: 'sol-recrystal', title: '再結晶と取り出し方', basic: 'sol-solubility', lessonStageId: 'sol-4',
      checkPool: [
        fill({
          id: 'sol-recrystal-k1', concept: 'sol-recrystal',
          prompt: '空らんに入る数を入れよう。20 ℃ の水 100 g には、硝酸カリウムが 32 g までとける。',
          text: '60 ℃ の水 100 g に硝酸カリウムを 80 g とかした水溶液を 20 ℃ まで冷やすと、出てくる結晶は[b1]である。',
          blanks: [number('b1', 48, 0.1, 'g')],
          explanation: '20 ℃ では 32 g までしかとけないので、80 − 32 ＝ 48 g が結晶として出てきます。',
          hint: 'とかした量から、20 ℃ でとける量を引こう。',
        }),
        choice({
          id: 'sol-recrystal-k2', concept: 'sol-recrystal',
          prompt: 'ろ過をするとき、液をガラス棒に伝わらせて注ぐのはなぜ？',
          options: ['液が飛び散ったり、ろ紙が破れたりしないようにするため', '液を冷やすため', '液を早く蒸発させるため'],
          answer: 'a',
          explanation: 'ガラス棒に伝わらせると、液が静かにろ紙に入るので、飛び散ったりろ紙が破れたりしにくくなります。',
          hint: 'いきおいよく注ぐと、どうなるか考えよう。',
        }),
        choice({
          id: 'sol-recrystal-k3', concept: 'sol-recrystal',
          prompt: '硝酸カリウムの水溶液を冷やすと結晶が出てくるのはなぜ？',
          options: ['温度が下がると溶解度が小さくなり、とけきれなくなった分が出てくるから', '温度が下がると水が増えるから', '温度が下がると別の物質に変わるから'],
          answer: 'a',
          explanation: '硝酸カリウムは、温度が下がると溶解度が小さくなります。とけきれなくなった分が結晶として出てきます。',
          hint: '溶解度曲線で、温度が下がると何が変わるか考えよう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 領域 3: ミニプリント（先生の自作プリントの問題を書き直したもの。docs/reports/content/solution.md）
  // ================================================================

  // ろ過の写真（sol-4-c4 の画像）の部分を選ぶ図: ア ガラス棒 (188, 66)・イ ろ紙 (150, 95)・ウ ろうと（輪の下の細い所）(155, 137)・エ 下のビーカー (194, 192)
  const MP_FILTER_Q = scene([photo('sol-4-c4')].concat([
    [280, 104, 188, 66], [40, 84, 150, 95], [40, 150, 155, 137], [280, 182, 194, 192],
  ].flatMap(([x, y, px, py], i) => [
    pointer(x < px ? x + 22 : x - 22, y, px, py),
    { type: 'region', id: 'r' + (i + 1), x, y, r: 22, label: 'アイウエ'[i] },
  ])));

  // 水 100 g にとける質量の表（目安の値。ミョウバンは結晶の水をふくむ質量）
  const MP_TEMPS = [10, 20, 30, 40, 50, 60, 70, 80];
  const MP_SOL = [
    ['硝酸カリウム', [22, 32, 46, 64, 85, 110, 138, 169]],
    ['塩化ナトリウム', [36, 36, 36, 36, 37, 37, 38, 38]],
    ['ミョウバン', [8, 11, 17, 24, 36, 57, 110, 321]],
  ];
  // 表の図。表は x 44〜316（名前の列 80、温度の列 24 ずつ）、y 36〜216。withRegions: 物質の名前の左にア・イ・ウ
  function mpTable(withRegions) {
    const x0 = 44, nameW = 80, colW = 24, y0 = 36, headH = 30, rowH = 50;
    const right = x0 + nameW + colW * MP_TEMPS.length;
    const items = [
      { type: 'text', x: 180, y: 24, text: '水 100 g にとける質量〔g〕', size: 13, anchor: 'middle' },
      { type: 'rect', x: x0, y: y0, width: right - x0, height: headH + rowH * 3, fill: 'white' },
      { type: 'line', points: [[x0 + nameW, y0], [x0 + nameW, y0 + headH + rowH * 3]], color: 'line', width: 1 },
      { type: 'text', x: x0 + 4, y: y0 + 20, text: '温度〔℃〕', size: 12 },
    ];
    MP_TEMPS.forEach((t, i) => items.push({ type: 'text', x: x0 + nameW + colW * i + colW / 2, y: y0 + 20, text: String(t), size: 12, anchor: 'middle' }));
    MP_SOL.forEach(([name, vals], j) => {
      const top = y0 + headH + rowH * j, cy = top + rowH / 2;
      items.push({ type: 'line', points: [[x0, top], [right, top]], color: 'line', width: 1 });
      items.push({ type: 'text', x: x0 + 3, y: cy + 5, text: name, size: 12 });
      vals.forEach((v, i) => items.push({ type: 'text', x: x0 + nameW + colW * i + colW / 2, y: cy + 5, text: String(v), size: 12, anchor: 'middle' }));
      if (withRegions) items.push({ type: 'region', id: 'r' + (j + 1), x: 22, y: cy, r: 22, label: 'アイウ'[j] });
    });
    return scene(items);
  }

  // 温度の数直線（20〜70 ℃、10 ℃ が 48px）。vals は 20・30…70 ℃ の溶解度。
  // 結晶が出はじめる温度のはんいを選ぶ（ア 20〜30 ℃・イ 30〜40 ℃・ウ 40〜50 ℃・エ 50〜60 ℃・オ 60〜70 ℃）
  // mark: [はじめ, 終わり] の温度の間をオレンジの帯で示す（解説用。このときは選ぶ場所を置かない）
  function mpLineScene(title, vals, mark) {
    const tx = t => 40 + (t - 20) * 4.8;
    const items = [
      { type: 'text', x: 160, y: 30, text: title, size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 62, text: '上の数: 水 100 g にとける質量〔g〕', size: 12, anchor: 'middle' },
      { type: 'line', points: [[24, 120], [300, 120]], width: 2, arrow: true },
      { type: 'text', x: 306, y: 146, text: '℃', size: 12, anchor: 'end' },
    ];
    [20, 30, 40, 50, 60, 70].forEach((t, i) => {
      items.push({ type: 'line', points: [[tx(t), 112], [tx(t), 128]], width: 2 });
      items.push({ type: 'text', x: tx(t), y: 146, text: String(t), size: 12, anchor: 'middle' });
      items.push({ type: 'text', x: tx(t), y: 100, text: String(vals[i]), size: 13, anchor: 'middle', bold: true });
    });
    if (mark) {
      items.push({ type: 'line', points: [[tx(mark[0]), 168], [tx(mark[1]), 168]], color: 'orange', width: 8 });
      items.push({ type: 'text', x: tx((mark[0] + mark[1]) / 2), y: 196, text: 'ここで結晶が出はじめる', size: 13, anchor: 'middle', bold: true });
    } else {
      [25, 35, 45, 55, 65].forEach((t, i) => items.push({ type: 'region', id: 'r' + (i + 1), x: tx(t), y: 190, r: 22, label: 'アイウエオ'[i] }));
    }
    return scene(items);
  }

  // ---- ステージ solution-mp1: プリント 1（溶質・溶媒と混合物、ろ過） ----
  const solMp1 = {
    id: 'solution-mp1', areaId: 'dissolve', free: true, title: 'プリント 1: 混合物とろ過', minutes: 5, concepts: ['sol-terms', 'sol-mixture', 'sol-recrystal'],
    lessons: [
      {
        id: 'solution-mp1-c1',
        text: '水のように 1 種類の物質でできているものを**純粋な物質**、砂糖水のようにいくつかの物質が混じり合ったものを**混合物**といいます。水溶液は、溶質と溶媒が混じった混合物です。',
        // 純粋な物質（水）と混合物（砂糖水）
        figure: scene([
          ...particleBeaker(220, 200, 'even'),
          { type: 'beaker', x: 90, y: 200, width: 80, height: 110, level: 0.85 },
          { type: 'text', x: 90, y: 58, text: '純粋な物質', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 90, y: 228, text: '水', size: 13, anchor: 'middle' },
          { type: 'text', x: 220, y: 58, text: '混合物', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 220, y: 228, text: '砂糖水（砂糖 ＋ 水）', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'solution-mp1-c2',
        text: '**ろ過**では、ろ紙をろうとにつけ、液はガラス棒に伝わらせて入れます。ろうとの足のとがったほうは、ビーカーの内側の壁につけます。液はろ紙の 8 分目くらいまでにします。',
        // 写真（sol-4-c4 の画像）: ろうと台のろうと (122〜190, 80〜118) にろ紙。ガラス棒 (172, 90)〜(207, 35) を伝わらせて注ぎ、
        // ろうとの足は下のビーカー (148〜200, 147〜210) の内側の壁につく。文字は右の白い余白 (205〜320) に置く
        figure: scene([
          photo('sol-4-c4'),
          pointer(236, 92, 188, 70), tag(266, 96, 'ガラス棒', { size: 13 }),
          pointer(246, 118, 178, 102), tag(266, 122, 'ろ紙', { size: 13 }),
          pointer(240, 142, 160, 134), tag(266, 146, 'ろうと', { size: 13 }),
          pointer(214, 172, 155, 192), tag(264, 176, '足を壁につける', { size: 13, bold: true }),
        ]),
      },
      {
        id: 'solution-mp1-c3',
        anim: 'sl-filter-pass',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: 'ろ紙には小さな穴がたくさんあります。泥のように穴より大きい粒はろ紙の上に残り、水や水にとけた物質の粒は穴より小さいので通りぬけます。これで泥水から泥を分けられます。',
        // ろ紙の穴と粒の大きさ
        figure: scene([
          { type: 'line', points: [[20, 120], [70, 120]], color: 'brown', width: 6 },
          { type: 'line', points: [[90, 120], [150, 120]], color: 'brown', width: 6 },
          { type: 'line', points: [[170, 120], [230, 120]], color: 'brown', width: 6 },
          { type: 'line', points: [[250, 120], [300, 120]], color: 'brown', width: 6 },
          { type: 'circle', x: 110, y: 96, r: 16, fill: 'brown' },
          { type: 'circle', x: 200, y: 98, r: 14, fill: 'brown' },
          { type: 'circle', x: 80, y: 150, r: 4, fill: 'blue', stroke: 'none' },
          { type: 'circle', x: 160, y: 160, r: 4, fill: 'blue', stroke: 'none' },
          { type: 'circle', x: 240, y: 146, r: 4, fill: 'blue', stroke: 'none' },
          { type: 'text', x: 160, y: 50, text: '泥の粒は穴を通れない', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 200, text: '水の粒は穴を通りぬける', size: 13, anchor: 'middle' },
          { type: 'text', x: 316, y: 114, text: 'ろ紙', size: 12, anchor: 'end' },
        ]),
      },
    ],
    warmup: choice({
      id: 'solution-mp1-w1', concept: 'sol-mixture',
      prompt: '予想しよう。砂糖水は、何種類の物質が混じったものだと思う？',
      options: ['1 種類（砂糖水という物質）', '2 種類（砂糖と水）', '3 種類以上'],
      answer: 'b',
      explanation: '砂糖水は、砂糖と水の 2 種類の物質が混じり合ったものです。このように、いくつかの物質が混じったものを何というか、このステージで学ぼう。',
      hint: '砂糖水をつくるときに使ったものを思い出そう。',
    }),
    problems: [
      fill({
        id: 'solution-mp1-p1', concept: 'sol-terms',
        prompt: '水に砂糖をとかしました。空らんに入る言葉を選ぼう。',
        text: '砂糖のようにとけている物質を[b1]、水のようにとかしている液体を[b2]、砂糖水のように[b1]が[b2]にとけた液を[b3]という。',
        blanks: [
          word('b1', ['溶質', '溶媒', '溶液'], '溶質'),
          word('b2', ['溶質', '溶媒', '溶液'], '溶媒'),
          word('b3', ['溶質', '溶媒', '溶液'], '溶液'),
        ],
        explanation: 'とけている砂糖が溶質、とかしている水が溶媒、砂糖が水にとけた砂糖水が溶液です。溶媒が水なので、砂糖水は水溶液でもあります。',
        hint: 'とけているもの・とかしているもの・全体の順だよ。',
      }),
      fill({
        id: 'solution-mp1-t1', concept: 'sol-mixture', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水のように 1 種類の物質でできているものを[b1]、砂糖水のようにいくつかの物質が混じり合ったものを[b2]という。',
        blanks: [
          word('b1', ['純粋な物質', '混合物', '溶質'], '純粋な物質'),
          word('b2', ['純粋な物質', '混合物', '溶質'], '混合物'),
        ],
        explanation: '1 種類の物質でできているものが**純粋な物質**、いくつかの物質が混じり合ったものが**混合物**です。',
        hint: '「混じり合った物」という意味の言葉があるよ。',
      }),
      choice({
        id: 'solution-mp1-p2', concept: 'sol-mixture',
        prompt: '次のうち、混合物はどれ？',
        options: ['食塩水', '水', '食塩'],
        answer: 'a',
        explanation: '食塩水は、食塩と水の 2 種類の物質が混じり合った混合物です。水と食塩は、それぞれ 1 種類の物質でできた純粋な物質です。',
        hint: '2 種類以上の物質が混じっているのはどれかな。',
      }),
      figureChoice({
        id: 'solution-mp1-p3', concept: 'sol-recrystal',
        prompt: '図はろ過のようすです。ろ紙をつけて使う、ガラスの器具「ろうと」はどれ？ ア〜エから選ぼう。',
        figure: MP_FILTER_Q,
        answer: 'r3',
        explanation: 'ろうとは、上が広く下が細い管（足）になったガラスの器具です。ろ紙を折ってろうとにつけ、水でぬらしてぴったりつけて使います。',
        hint: '上が広く、下が細い足になっている器具だよ。',
      }),
      choice({
        id: 'solution-mp1-p4', concept: 'sol-recrystal',
        prompt: 'ろ過をするとき、ろうとの足はどのようにしておく？',
        options: ['とがったほうを、ビーカーの内側の壁につける', 'ビーカーのまん中に、壁からはなしておく', 'ビーカーの外に出しておく'],
        answer: 'a',
        explanation: 'ろうとの足のとがったほう（長いほう）をビーカーの内側の壁につけると、ろ液が壁を伝って静かに落ち、はね返りません。',
        hint: '液がはねないようにするには、どうすればよいかな。',
      }),
      choice({
        id: 'solution-mp1-p5', concept: 'sol-recrystal',
        prompt: '泥水をろ過すると、泥と水に分けられます。そのしくみとして正しいのはどれ？',
        options: ['泥の粒はろ紙の穴より大きく通れないが、水の粒は小さいので通りぬけるから', 'ろ紙が泥を吸いこんでとかすから', '水だけが蒸発して、ろ紙を通るから'],
        answer: 'a',
        explanation: 'ろ紙には目に見えないほど小さな穴があります。穴より大きい泥の粒はろ紙の上に残り、穴より小さい水の粒は通りぬけます。',
        hint: '粒の大きさとろ紙の穴の大きさを比べよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'solution-mp1-r1', concept: 'sol-recrystal',
        prompt: '図はろ過のようすです。「ろ紙」はどれ？ ア〜エから選ぼう。',
        figure: MP_FILTER_Q,
        answer: 'r2',
        explanation: 'ろ紙は、ろうとの内側につけた紙です。液はろ紙を通ってろ過されます。',
        hint: 'ろうとの内側についているものだよ。',
      }),
      choice({
        id: 'solution-mp1-r2', concept: 'sol-recrystal',
        prompt: 'ろ過をするとき、ろ紙の中に入れる液は、どのくらいまでにする？',
        options: ['ろ紙の 8 分目（8 割）くらいまで', 'ろ紙のふちからあふれるまで', 'ろ紙の 1 割くらいまで'],
        answer: 'a',
        explanation: '液を入れすぎると、ろ紙とろうとのすき間から、ろ過されない液が流れ出てしまいます。液はろ紙の 8 分目くらいまでにします。',
        hint: 'ろ紙のふちをこえると、どうなるか考えよう。',
      }),
      choice({
        id: 'solution-mp1-r3', concept: 'sol-mixture',
        prompt: '次のうち、純粋な物質はどれ？',
        options: ['水', '砂糖水', '空気'],
        answer: 'a',
        explanation: '水は 1 種類の物質でできた純粋な物質です。砂糖水（砂糖と水）や空気（ちっ素・酸素など）は、いくつかの物質が混じった混合物です。',
        hint: '1 種類の物質だけでできているのはどれかな。',
      }),
      choice({
        id: 'solution-mp1-r4', concept: 'sol-mixture',
        prompt: '水溶液は、純粋な物質と混合物のどちら？',
        options: ['混合物', '純粋な物質', 'どちらでもない'],
        answer: 'a',
        explanation: '水溶液は、溶質と溶媒（水）が混じり合ったものなので混合物です。',
        hint: '水溶液には、溶質と水の 2 種類以上の物質がふくまれているね。',
      }),
    ],
  };

  // ---- ステージ solution-mp2: プリント 2（質量パーセント濃度の計算） ----
  const solMp2 = {
    id: 'solution-mp2', areaId: 'dissolve', free: true, title: 'プリント 2: 濃度の計算', minutes: 5, concepts: ['sol-concentration'],
    lessons: [
      {
        id: 'solution-mp2-c1',
        text: '**質量パーセント濃度**〔%〕＝ 溶質の質量 ÷ 溶液の質量 × 100 です。溶液の質量は、溶質の質量と溶媒の質量の和です。水 90 g に食塩 10 g なら、食塩水は 100 g です。',
        figure: scene([
          { type: 'text', x: 160, y: 50, text: '濃度〔%〕＝ 溶質 ÷ 溶液 × 100', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 110, text: '溶液 ＝ 溶質 ＋ 溶媒', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 170, text: '食塩 10 g ＋ 水 90 g ＝ 食塩水 100 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 200, text: '10 ÷ 100 × 100 ＝ 10 %', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'solution-mp2-c2',
        text: '式を変形すると、溶質の質量 ＝ 溶液の質量 × 濃度 ÷ 100、溶液の質量 ＝ 溶質の質量 ÷ 濃度 × 100 になります。何を求めるのかをはじめに確かめよう。',
        figure: scene([
          { type: 'text', x: 160, y: 40, text: '溶質を求める', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 70, text: '溶液 × 濃度 ÷ 100', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 96, text: '例: 200 g × 12 ÷ 100 ＝ 24 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 146, text: '溶液を求める', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 176, text: '溶質 ÷ 濃度 × 100', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 202, text: '例: 28 g ÷ 7 × 100 ＝ 400 g', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'solution-mp2-w1', concept: 'sol-concentration',
      prompt: '予想しよう。食塩水 200 g に食塩 10 g がとけています。この食塩水の濃さはどのくらいだと思う？',
      options: ['5 %', '10 %', '20 %'],
      answer: 'a',
      explanation: '10 ÷ 200 × 100 ＝ 5 % です。食塩水全体のうち、食塩がしめる割合を考えます。いろいろな計算を、このステージで練習しよう。',
      hint: '200 g のうちの 10 g は、何 % かな。',
    }),
    problems: [
      fill({
        id: 'solution-mp2-t1', concept: 'sol-concentration', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '質量パーセント濃度〔%〕＝[b1]の質量 ÷[b2]の質量 × 100',
        blanks: [
          word('b1', ['溶質', '溶媒', '溶液'], '溶質'),
          word('b2', ['溶質', '溶媒', '溶液'], '溶液'),
        ],
        explanation: '**質量パーセント濃度**は、溶質の質量を溶液の質量でわって 100 をかけます。わる数は溶媒（水）ではなく、溶液全体の質量です。',
        hint: 'とけている物の質量 ÷ 全体の質量、だよ。',
      }),
      fill({
        id: 'solution-mp2-p1', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '食塩水 200 g に食塩 10 g がとけているとき、質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 5, 0, '%')],
        explanation: '溶液（食塩水）の質量が 200 g なので、10 ÷ 200 × 100 ＝ 5 % です。',
        hint: '溶液の質量はもう分かっているよ。',
      }),
      fill({
        id: 'solution-mp2-p2', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '食塩水 500 g に食塩 60 g がとけているとき、質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 12, 0, '%')],
        explanation: '60 ÷ 500 × 100 ＝ 12 % です。',
        hint: '溶質 ÷ 溶液 × 100 だよ。',
      }),
      fill({
        id: 'solution-mp2-p3', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 100 g に食塩 25 g をとかした食塩水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 20, 0, '%')],
        explanation: '食塩水の質量は 100 ＋ 25 ＝ 125 g です。25 ÷ 125 × 100 ＝ 20 % になります。水の 100 g でわって 25 % としないように注意しよう。',
        hint: 'まず食塩水全体の質量を求めよう。',
      }),
      figureChoice({
        id: 'solution-mp2-p4', concept: 'sol-concentration',
        prompt: '質量パーセント濃度 12 % の塩化ナトリウム水溶液 200 g があります。とけている塩化ナトリウムの質量はどれ？ ア〜ウから選ぼう。',
        figure: scene([
          { type: 'beaker', x: 160, y: 100, width: 90, height: 80, level: 0.7 },
          { type: 'text', x: 160, y: 122, text: '12 % の水溶液 200 g', size: 13, anchor: 'middle' },
          ...[[60, '12 g'], [160, '24 g'], [260, '176 g']].flatMap(([x, t]) => [
            { type: 'ellipse', x, y: 206, rx: 34, ry: 7, fill: 'glass' },
            { type: 'polygon', points: [[x - 18, 202], [x, 190], [x + 18, 202]], fill: 'white' },
            { type: 'text', x, y: 232, text: t, size: 14, anchor: 'middle', bold: true },
          ]),
          { type: 'region', id: 'r1', x: 60, y: 160, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 160, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 160, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '溶質の質量 ＝ 溶液の質量 × 濃度 ÷ 100 なので、200 × 12 ÷ 100 ＝ 24 g です。176 g は水（溶媒）の質量です。',
        hint: '200 g の 12 % を求めよう。',
      }),
      fill({
        id: 'solution-mp2-p5', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 90 g に塩化ナトリウム 10 g をとかした水溶液の質量は[b1]である。',
        blanks: [number('b1', 100, 0, 'g')],
        explanation: '溶液の質量 ＝ 溶質の質量 ＋ 溶媒の質量 なので、10 ＋ 90 ＝ 100 g です。',
        hint: 'とかした物と水の質量をたそう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'solution-mp2-r1', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 90 g に塩化ナトリウム 10 g をとかした水溶液の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 10, 0, '%')],
        explanation: '水溶液の質量は 100 g なので、10 ÷ 100 × 100 ＝ 10 % です。',
        hint: '水溶液全体の質量は 100 g だったね。',
      }),
      fill({
        id: 'solution-mp2-r2', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 204 g に塩化ナトリウム 36 g をとかした水溶液の質量は[b1]である。',
        blanks: [number('b1', 240, 0, 'g')],
        explanation: '36 ＋ 204 ＝ 240 g です。',
        hint: '溶質と溶媒の質量をたそう。',
      }),
      fill({
        id: 'solution-mp2-r3', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '水 204 g に塩化ナトリウム 36 g をとかした水溶液の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 15, 0, '%')],
        explanation: '水溶液の質量は 36 ＋ 204 ＝ 240 g なので、36 ÷ 240 × 100 ＝ 15 % です。',
        hint: 'わる数は、水溶液全体の 240 g だよ。',
      }),
      fill({
        id: 'solution-mp2-r4', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '塩化ナトリウム 28 g をすべて水にとかして、質量パーセント濃度 7 % の水溶液をつくる。このとき水溶液の質量は[b1]になる。',
        blanks: [number('b1', 400, 0, 'g')],
        explanation: '水溶液の 7 % が 28 g なので、水溶液の質量は 28 ÷ 7 × 100 ＝ 400 g です。このとき使う水は 400 − 28 ＝ 372 g です。',
        hint: '□ g の 7 % が 28 g になる □ を考えよう。',
      }),
    ],
  };

  // ---- ステージ solution-mp3: プリント 3（溶解度と飽和水溶液、温度ととける量） ----
  const solMp3 = {
    id: 'solution-mp3', areaId: 'sol-solubility', free: true, title: 'プリント 3: 溶解度の表を読む', minutes: 5, concepts: ['sol-solubility', 'sol-recrystal'],
    lessons: [
      {
        id: 'solution-mp3-c1',
        text: '表は、水 100 g にとける質量（**溶解度**）です。硝酸カリウムとミョウバンは温度が上がると大きく増えますが、塩化ナトリウム（食塩）はほとんど変わりません。',
        figure: mpTable(false),
      },
      {
        id: 'solution-mp3-c2',
        text: '水の量が変わると、とける量も同じ割合で変わります。水 5 g は 100 g の 20 分の 1 なので、20 ℃ の水 5 g にとける食塩は 36 ÷ 20 ＝ 1.8 g です。',
        figure: scene([
          { type: 'beaker', x: 90, y: 190, width: 90, height: 110, level: 0.8 },
          { type: 'tube', x: 230, y: 190, height: 90, level: 0.25 },
          { type: 'text', x: 90, y: 216, text: '水 100 g → 36 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 230, y: 216, text: '水 5 g → 1.8 g', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 40, text: '20 ℃ でとける食塩の質量', size: 14, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'solution-mp3-w1', concept: 'sol-solubility',
      prompt: '予想しよう。食塩と硝酸カリウムを水に入れて、とけ残りが出ました。加熱すると、とけ残りが多くとけるのはどちらだと思う？',
      options: ['食塩', '硝酸カリウム', 'どちらも変わらない'],
      answer: 'b',
      explanation: '硝酸カリウムは温度が上がるととける量が大きく増えます。食塩はほとんど変わりません。表を読んで確かめよう。',
      hint: '温度でとける量が大きく変わる物質と、変わらない物質があるよ。',
    }),
    problems: [
      choice({
        id: 'solution-mp3-p1', concept: 'sol-solubility',
        prompt: '20 ℃ の水 5.0 g を入れた試験管を 2 本用意し、食塩 3.0 g と硝酸カリウム 3.0 g をそれぞれ入れてよくふりました。表を見て答えよう。どうなる？',
        figure: mpTable(false),
        options: ['どちらもとけ残る', '食塩だけがとけ残る', 'どちらもすべてとける'],
        answer: 'a',
        explanation: '水 5 g は 100 g の 20 分の 1 です。20 ℃ でとけるのは、食塩が 36 ÷ 20 ＝ 1.8 g、硝酸カリウムが 32 ÷ 20 ＝ 1.6 g なので、3.0 g はどちらもとけ残ります。',
        hint: '水 5 g にとける量は、表の値の 20 分の 1 だよ。',
      }),
      choice({
        id: 'solution-mp3-p2', concept: 'sol-solubility',
        prompt: '前の問題の 2 本の試験管を、80 ℃ まで加熱しました。表を見て答えよう。どうなる？',
        figure: mpTable(false),
        options: ['硝酸カリウムはすべてとけ、食塩はとけ残る', '食塩はすべてとけ、硝酸カリウムはとけ残る', 'どちらもとけ残ったまま'],
        answer: 'a',
        explanation: '80 ℃ の水 5 g にとけるのは、硝酸カリウムが 169 ÷ 20 ＝ 約 8.5 g、食塩が 38 ÷ 20 ＝ 1.9 g です。硝酸カリウム 3.0 g はすべてとけますが、食塩はとけ残ります。',
        hint: '80 ℃ の値を 20 でわってみよう。',
      }),
      choice({
        id: 'solution-mp3-p3', concept: 'sol-recrystal',
        prompt: '80 ℃ で硝酸カリウムがすべてとけた試験管を、水で冷やしました。試験管の中はどうなる？',
        options: ['白い結晶が出てくる', '何も変わらない', '液がこおってしまう'],
        answer: 'a',
        explanation: '温度が下がると硝酸カリウムのとける量が小さくなるので、とけきれなくなった分が結晶として出てきます。',
        hint: '温度が下がると、とけられる量はどうなるかな。',
      }),
      fill({
        id: 'solution-mp3-t1', concept: 'sol-solubility', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'もうそれ以上とけきれなくなった水溶液を[b1]という。水 100 g にとける物質の最大の質量を[b2]といい、これをグラフに表したものを[b3]という。',
        blanks: [
          word('b1', ['飽和水溶液', '溶解度', '溶解度曲線'], '飽和水溶液'),
          word('b2', ['飽和水溶液', '溶解度', '溶解度曲線'], '溶解度'),
          word('b3', ['飽和水溶液', '溶解度', '溶解度曲線'], '溶解度曲線'),
        ],
        explanation: 'とけきれなくなった水溶液が**飽和水溶液**、水 100 g にとける最大の質量が**溶解度**、温度と溶解度の関係のグラフが**溶解度曲線**です。',
        hint: '「飽和」はいっぱい、「曲線」はグラフの線のことだよ。',
      }),
      figureChoice({
        id: 'solution-mp3-p4', concept: 'sol-solubility',
        prompt: '表を見て答えよう。10 ℃ の水 100 g に、いちばん多くとけるのはどれ？ ア〜ウから選ぼう。',
        figure: mpTable(true),
        answer: 'r2',
        explanation: '10 ℃ では、硝酸カリウム 22 g、塩化ナトリウム 36 g、ミョウバン 8 g なので、塩化ナトリウムがいちばん多くとけます。',
        hint: '10 ℃ の列の数を比べよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'solution-mp3-r1', concept: 'sol-solubility',
        prompt: '表を見て答えよう。40 ℃ の水 100 g に、いちばん多くとけるのはどれ？ ア〜ウから選ぼう。',
        figure: mpTable(true),
        answer: 'r1',
        explanation: '40 ℃ では、硝酸カリウム 64 g、塩化ナトリウム 36 g、ミョウバン 24 g なので、硝酸カリウムがいちばん多くとけます。10 ℃ のときとは順位が変わります。',
        hint: '40 ℃ の列の数を比べよう。',
      }),
      choice({
        id: 'solution-mp3-r2', concept: 'sol-solubility',
        prompt: '「溶解度」の説明として正しいのはどれ？',
        options: ['水 100 g にとける物質の最大の質量', '水溶液の濃さを % で表したもの', 'とけ残った物質の質量'],
        answer: 'a',
        explanation: '溶解度は、水 100 g にとける物質の最大の質量です。物質の種類と温度で決まります。濃さを % で表したものは質量パーセント濃度です。',
        hint: '「水 100 g あたり」の量だったね。',
      }),
      choice({
        id: 'solution-mp3-r3', concept: 'sol-solubility',
        prompt: '20 ℃ の水 50 g には、食塩は約何 g までとける？（20 ℃ の水 100 g には約 36 g とける）',
        options: ['約 18 g', '約 36 g', '約 72 g'],
        answer: 'a',
        explanation: '水の量が半分なので、とける量も半分の約 18 g です。',
        hint: '水が半分になると、とける量はどうなるかな。',
      }),
    ],
  };

  // ---- ステージ solution-mp4: プリント 4（溶解度の問題: 結晶が出はじめる温度と結晶の質量） ----
  const solMp4 = {
    id: 'solution-mp4', areaId: 'sol-solubility', free: true, title: 'プリント 4: 結晶の出る温度と量', minutes: 5, concepts: ['sol-recrystal', 'sol-solubility'],
    lessons: [
      {
        id: 'solution-mp4-c1',
        anim: 'sl-crystal-start',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: 'とかした量と、その温度の溶解度が等しくなったとき、水溶液は飽和水溶液になります。それより冷やすと**結晶**が出はじめます。硝酸カリウム 50 g なら 30 ℃ と 40 ℃ の間です。',
        figure: mpLineScene('硝酸カリウム 50 g をとかした水溶液', [32, 46, 64, 85, 110, 138], [30, 40]),
      },
      {
        id: 'solution-mp4-c2',
        text: '冷やしたときに出てくる結晶の質量は、とかした質量 − 冷やした温度の溶解度 です。ミョウバン 50 g を 20 ℃ まで冷やすと 50 − 11 ＝ 39 g が出てきます。これを**再結晶**といいます。',
        // 写真: ミョウバン水溶液を冷やしたビーカー。底に透明な正八面体の結晶がたくさん出ている（結晶 y 130〜210、液面 y 約 98）。
        // ビーカーが大きく余白が少ないので、式はビーカーのふちの上、数は結晶より上の澄んだ液の上に下地つきで置く
        figure: scene([
          photo('solution-mp4-c2'),
          tag(160, 24, '出てくる結晶 ＝ とかした量 − 溶解度', { bold: true }),
          tag(160, 118, '20 ℃: 39 g が結晶に', { size: 13 }),
          pointer(262, 164, 238, 168), tag(288, 152, 'ミョウバン', { size: 13 }), tag(288, 170, 'の結晶', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'solution-mp4-w1', concept: 'sol-recrystal',
      prompt: '予想しよう。80 ℃ の水 100 g に硝酸カリウム 50 g をすべてとかしました。冷やしていくと、どうなると思う？',
      options: ['ある温度から結晶が出はじめる', 'いくら冷やしても何も出てこない', '冷やしはじめたとたんに全部が結晶になる'],
      answer: 'a',
      explanation: '温度が下がって溶解度が 50 g より小さくなると、とけきれない分が結晶になって出てきます。その温度と量の求め方を、このステージで学ぼう。',
      hint: '温度が下がると、とける量は減っていくね。',
    }),
    problems: [
      figureChoice({
        id: 'solution-mp4-p1', concept: 'sol-recrystal',
        prompt: '80 ℃ の水 100 g に硝酸カリウム 50 g をとかし、ゆっくり冷やしました。結晶が出はじめるのは何 ℃ の間？ 図の数（水 100 g にとける質量）を見て、ア〜オから選ぼう。',
        figure: mpLineScene('硝酸カリウムの溶解度', [32, 46, 64, 85, 110, 138]),
        answer: 'r2',
        explanation: '30 ℃ では 46 g、40 ℃ では 64 g までとけます。50 g は 46 g と 64 g の間なので、30 ℃ と 40 ℃ の間で溶解度が 50 g になり、結晶が出はじめます。',
        hint: '50 g が、どの 2 つの数の間に入るかを見よう。',
      }),
      fill({
        id: 'solution-mp4-p2', concept: 'sol-recrystal',
        prompt: '空らんに入る数を入れよう。硝酸カリウムは、水 100 g に 20 ℃ で 32 g、10 ℃ で 22 g までとける。',
        text: '硝酸カリウム 50 g を高い温度の水 100 g にとかし、20 ℃ まで冷やすと結晶が[b1]出てくる。10 ℃ まで冷やすと、結晶は合わせて[b2]になる。',
        blanks: [number('b1', 18, 0, 'g'), number('b2', 28, 0, 'g')],
        explanation: '20 ℃ では 32 g までしかとけないので 50 − 32 ＝ 18 g、10 ℃ では 22 g までなので 50 − 22 ＝ 28 g が結晶になります。',
        hint: 'とかした量 − その温度でとける量 だよ。',
      }),
      fill({
        id: 'solution-mp4-t1', concept: 'sol-recrystal', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水にとかした固体の物質を、水溶液を冷やすなどして、再び結晶として取り出すことを[b1]という。',
        blanks: [word('b1', ['再結晶', '蒸留', 'ろ過'], '再結晶')],
        explanation: 'とかした物質を、冷やしたり水を蒸発させたりして、再び結晶として取り出すことを**再結晶**といいます。',
        hint: 'もう一度（再び）結晶にする、という意味だよ。',
      }),
      fill({
        id: 'solution-mp4-p3', concept: 'sol-recrystal',
        prompt: '空らんに入る数を入れよう。ミョウバンは、水 100 g に 20 ℃ で 11 g までとける。',
        text: '70 ℃ の水 100 g にミョウバン 50 g をとかし、20 ℃ まで冷やすと、結晶が[b1]取り出せる。',
        blanks: [number('b1', 39, 0, 'g')],
        explanation: '20 ℃ では 11 g までしかとけないので、50 − 11 ＝ 39 g が結晶として出てきます。',
        hint: 'とかした量 − 20 ℃ でとける量 だよ。',
      }),
      fill({
        id: 'solution-mp4-p4', concept: 'sol-solubility',
        prompt: '50 ℃ の水 100 g に、それぞれの物質を入れてよくかき混ぜた。表を見て、空らんに入る言葉を選ぼう。',
        figure: mpTable(false),
        text: 'ミョウバン 50 g は[b1]。食塩 40 g は[b2]。硝酸カリウム 60 g は[b3]。',
        blanks: [
          word('b1', ['すべてとける', 'とけ残る'], 'とけ残る'),
          word('b2', ['すべてとける', 'とけ残る'], 'とけ残る'),
          word('b3', ['すべてとける', 'とけ残る'], 'すべてとける'),
        ],
        explanation: '50 ℃ の溶解度は、ミョウバン 36 g、塩化ナトリウム（食塩）37 g、硝酸カリウム 85 g です。入れた量が溶解度より多いミョウバンと食塩はとけ残り、硝酸カリウムはすべてとけます。',
        hint: '入れた量と、50 ℃ の列の数を比べよう。',
      }),
      fill({
        id: 'solution-mp4-p5', concept: 'sol-solubility',
        prompt: '表を読んで、空らんに入る数を入れよう。',
        figure: mpTable(false),
        text: '水 100 g にとけるミョウバンの質量は、20 ℃ で[b1]、40 ℃ で[b2]、60 ℃ で[b3]である。',
        blanks: [number('b1', 11, 0, 'g'), number('b2', 24, 0, 'g'), number('b3', 57, 0, 'g')],
        explanation: 'ミョウバンの行を読むと、20 ℃ 11 g、40 ℃ 24 g、60 ℃ 57 g です。温度が上がるほど、とける量が大きく増えます。',
        hint: 'ミョウバンの行で、20・40・60 の列を見よう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'solution-mp4-r1', concept: 'sol-recrystal',
        prompt: '80 ℃ の水 100 g にミョウバン 50 g をとかし、ゆっくり冷やしました。結晶が出はじめるのは何 ℃ の間？ 図の数（水 100 g にとける質量）を見て、ア〜オから選ぼう。',
        figure: mpLineScene('ミョウバンの溶解度', [11, 17, 24, 36, 57, 110]),
        answer: 'r4',
        explanation: '50 ℃ では 36 g、60 ℃ では 57 g までとけます。50 g はその間なので、50 ℃ と 60 ℃ の間で結晶が出はじめます。70 ℃ でとかした場合も同じです。',
        hint: '50 g が、どの 2 つの数の間に入るかを見よう。',
      }),
      fill({
        id: 'solution-mp4-r2', concept: 'sol-solubility',
        prompt: '水 100 g にミョウバン 50 g を入れてよくかき混ぜた。表を見て、空らんに入る言葉を選ぼう。',
        figure: mpTable(false),
        text: '水の温度が 70 ℃ なら[b1]。60 ℃ なら[b2]。50 ℃ なら[b3]。',
        blanks: [
          word('b1', ['すべてとける', 'とけ残る'], 'すべてとける'),
          word('b2', ['すべてとける', 'とけ残る'], 'すべてとける'),
          word('b3', ['すべてとける', 'とけ残る'], 'とけ残る'),
        ],
        explanation: 'ミョウバンの溶解度は 70 ℃ で 110 g、60 ℃ で 57 g、50 ℃ で 36 g です。50 g より大きい 70 ℃・60 ℃ ではすべてとけ、50 ℃ ではとけ残ります。',
        hint: '50 g と、それぞれの温度の溶解度を比べよう。',
      }),
      fill({
        id: 'solution-mp4-r3', concept: 'sol-solubility',
        prompt: '表を読んで、空らんに入る数を入れよう。',
        figure: mpTable(false),
        text: '水 100 g にとける硝酸カリウムの質量は、50 ℃ で[b1]、60 ℃ で[b2]である。',
        blanks: [number('b1', 85, 0, 'g'), number('b2', 110, 0, 'g')],
        explanation: '硝酸カリウムの行を読むと、50 ℃ 85 g、60 ℃ 110 g です。',
        hint: '硝酸カリウムの行で、50・60 の列を見よう。',
      }),
      fill({
        id: 'solution-mp4-r4', concept: 'sol-recrystal',
        prompt: '空らんに入る数を入れよう。硝酸カリウムは、水 100 g に 20 ℃ で 32 g までとける。',
        text: '70 ℃ の水 100 g に硝酸カリウム 50 g をとかし、20 ℃ まで冷やすと、結晶が[b1]出てくる。',
        blanks: [number('b1', 18, 0, 'g')],
        explanation: '50 − 32 ＝ 18 g が結晶として出てきます。何 ℃ でとかしたかに関係なく、とかした量と冷やした温度の溶解度で決まります。',
        hint: 'とかした量 − 20 ℃ でとける量 だよ。',
      }),
    ],
  };

  // ミニプリントで足した概念（純粋な物質と混合物）
  const mpConcepts = [
    {
      id: 'sol-mixture', title: '純粋な物質と混合物', basic: 'sol-terms', lessonStageId: 'solution-mp1',
      checkPool: [
        choice({
          id: 'sol-mixture-k1', concept: 'sol-mixture',
          prompt: '「混合物」の説明として正しいのはどれ？',
          options: ['いくつかの物質が混じり合ったもの', '1 種類の物質だけでできたもの', '水にとけない物質'],
          answer: 'a',
          explanation: '混合物は、いくつかの物質が混じり合ったものです。1 種類の物質でできたものは純粋な物質といいます。',
          hint: '「混じり合った物」だよ。',
        }),
        choice({
          id: 'sol-mixture-k2', concept: 'sol-mixture',
          prompt: '次のうち、混合物でないもの（純粋な物質）はどれ？',
          options: ['塩化ナトリウム', '海水', '砂糖水'],
          answer: 'a',
          explanation: '塩化ナトリウムは 1 種類の物質です。海水には水や塩化ナトリウムなど、砂糖水には水と砂糖がふくまれるので、どちらも混合物です。',
          hint: '1 種類の物質だけでできているのはどれかな。',
        }),
        choice({
          id: 'sol-mixture-k3', concept: 'sol-mixture',
          prompt: '硫酸銅の水溶液は、純粋な物質と混合物のどちら？',
          options: ['混合物', '純粋な物質', '色によって変わる'],
          answer: 'a',
          explanation: '硫酸銅の水溶液は、硫酸銅（溶質）と水（溶媒）が混じったものなので混合物です。色があってもなくても、水溶液は混合物です。',
          hint: '水溶液は溶質と溶媒が混じったものだったね。',
        }),
      ],
    },
  ];

  // あふれた問題を、もとからある概念の確認問題（checkPool）に足す
  function addCheck(id, problems) { concepts.find(c => c.id === id).checkPool.push(...problems); }
  addCheck('sol-solubility', [
    fill({
      id: 'solution-mp4-k1', concept: 'sol-solubility',
      prompt: '空らんに入る数を入れよう。（表の値: 硝酸カリウムは 40 ℃ の水 100 g に 64 g とける）',
      text: '40 ℃ の水 100 g には、硝酸カリウムが[b1]までとける。',
      blanks: [number('b1', 64, 0, 'g')],
      explanation: '40 ℃ の水 100 g には、硝酸カリウムが 64 g までとけます。これが 40 ℃ での硝酸カリウムの溶解度です。',
      hint: '表の 40 ℃ の値だよ。',
    }),
    choice({
      id: 'solution-mp4-k2', concept: 'sol-solubility',
      prompt: '20 ℃ の水 100 g にとける質量は、硝酸カリウム 32 g、塩化ナトリウム 36 g、ミョウバン 11 g です。20 ℃ でいちばん多くとけるのはどれ？',
      options: ['塩化ナトリウム', '硝酸カリウム', 'ミョウバン'],
      answer: 'a',
      explanation: '20 ℃ では、塩化ナトリウムの 36 g がいちばん多いです。温度が高くなると、硝酸カリウムのほうが多くとけるようになります。',
      hint: '3 つの数を比べよう。',
    }),
    fill({
      id: 'solution-mp4-k3', concept: 'sol-solubility',
      prompt: '表を見て、空らんに入る物質を選ぼう。',
      figure: mpTable(false),
      text: '水 100 g にいちばん多くとけるのは、10 ℃ では[b1]、40 ℃ では[b2]、60 ℃ では[b3]である。',
      blanks: [
        word('b1', ['硝酸カリウム', '塩化ナトリウム', 'ミョウバン'], '塩化ナトリウム'),
        word('b2', ['硝酸カリウム', '塩化ナトリウム', 'ミョウバン'], '硝酸カリウム'),
        word('b3', ['硝酸カリウム', '塩化ナトリウム', 'ミョウバン'], '硝酸カリウム'),
      ],
      explanation: '10 ℃ は塩化ナトリウム 36 g、40 ℃ は硝酸カリウム 64 g、60 ℃ は硝酸カリウム 110 g がいちばん多いです。',
      hint: 'それぞれの温度の列で、いちばん大きい数をさがそう。',
    }),
  ]);

  // ================================================================
  // 領域: ドリル（中学 1 年のテーマ「水溶液の性質」に合わせた自作の練習問題）
  // ================================================================

  // 水 100 g にとける質量〔g〕の表（20・40・60 ℃）。withRegions で左にア〜ウの選ぶ場所
  function drSolTable(withRegions) {
    const items = [
      { type: 'text', x: 160, y: 24, text: '水 100 g にとける質量〔g〕', size: 14, anchor: 'middle' },
      { type: 'line', points: [[60, 38], [312, 38]], width: 2 },
      { type: 'text', x: 200, y: 60, text: '20 ℃', size: 14, anchor: 'middle' },
      { type: 'text', x: 250, y: 60, text: '40 ℃', size: 14, anchor: 'middle' },
      { type: 'text', x: 296, y: 60, text: '60 ℃', size: 14, anchor: 'middle' },
      { type: 'line', points: [[60, 72], [312, 72]], width: 1, color: 'line' },
    ];
    const rows = [['硝酸カリウム', 32, 64, 110], ['塩化ナトリウム', 36, 36, 37], ['ミョウバン', 11, 24, 57]];
    rows.forEach((row, i) => {
      const y = 116 + 50 * i;
      items.push({ type: 'text', x: 62, y, text: row[0], size: 13 });
      items.push({ type: 'text', x: 200, y, text: String(row[1]), size: 15, anchor: 'middle' });
      items.push({ type: 'text', x: 250, y, text: String(row[2]), size: 15, anchor: 'middle' });
      items.push({ type: 'text', x: 296, y, text: String(row[3]), size: 15, anchor: 'middle' });
      if (withRegions) items.push({ type: 'region', id: 'r' + (i + 1), x: 30, y: y - 6, r: 22, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // ---- ステージ solution-dr1: ドリル 1（水溶液の性質） ----
  const solDr1 = {
    id: 'solution-dr1', areaId: 'sol-solubility', free: true, title: 'ドリル 1: 水溶液の性質', minutes: 7,
    concepts: ['sol-terms', 'sol-concentration', 'sol-recrystal'],
    lessons: [
      {
        id: 'solution-dr1-c1',
        text: 'とけている物質が**溶質**、とかしている液体が**溶媒**、できた液全体が**溶液**です。溶媒は水とはかぎらず、エタノールのこともあります。溶液の質量は、溶質と溶媒の質量の和です。',
        figure: scene([
          { type: 'beaker', x: 160, y: 170, width: 100, height: 100, level: 0.7 },
          { type: 'text', x: 160, y: 205, text: '溶液 ＝ 溶質 ＋ 溶媒', size: 15, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 230, text: '（質量も 溶質 ＋ 溶媒）', size: 13, anchor: 'middle' },
          { type: 'text', x: 30, y: 28, text: '溶質: とけている物質', size: 13 },
          { type: 'text', x: 30, y: 50, text: '溶媒: とかしている液体', size: 13 },
        ]),
      },
      {
        id: 'solution-dr1-c2',
        text: '濃さは**質量パーセント濃度**で表し、溶質の質量÷溶液の質量×100 で求めます。水を加えてうすめても、とけている溶質の質量は変わりません。',
        figure: scene([
          { type: 'text', x: 160, y: 50, text: '質量パーセント濃度〔%〕', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 96, text: '＝ 溶質の質量 ÷ 溶液の質量 × 100', size: 14, anchor: 'middle' },
          { type: 'beaker', x: 90, y: 210, width: 70, height: 70, level: 0.4 },
          { type: 'line', points: [[140, 175], [180, 175]], width: 2, arrow: true },
          { type: 'text', x: 160, y: 165, text: '水を足す', size: 12, anchor: 'middle' },
          { type: 'beaker', x: 230, y: 210, width: 70, height: 70, level: 0.8 },
          { type: 'text', x: 160, y: 232, text: '溶質の質量は同じ', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'solution-dr1-c3',
        text: '温度を下げると溶解度が小さくなり、とけきれなくなった分が結晶として出てきます。これが**再結晶**です。出てくる量は、とけていた量から、その温度での溶解度を引いて求めます。',
        figure: drSolTable(false),
      },
    ],
    warmup: choice({
      id: 'solution-dr1-w1', concept: 'sol-concentration',
      prompt: '予想しよう。スポーツドリンクを水でうすめた。とけている砂糖などの量（質量）はどうなると思う？',
      options: ['変わらない', '減る', '増える'],
      answer: 'a',
      explanation: '水を足しても、とけている物質はそのまま残っているので、量は変わりません。変わるのは溶液全体の質量で、そのため濃さはうすくなります。',
      hint: '足したのは水だけだね。',
    }),
    problems: [
      choice({
        id: 'solution-dr1-p1', concept: 'sol-terms',
        prompt: 'ヨウ素をエタノールにとかした液（ヨウ素のエタノール溶液）で、溶媒にあたるものはどれ？',
        options: ['ヨウ素', 'エタノール', 'ヨウ素のエタノール溶液'],
        answer: 'b',
        explanation: 'ヨウ素をとかしているエタノールが溶媒です。ヨウ素は溶質、できた液全体が溶液です。溶媒が水でないので、この液は水溶液とはいいません。',
        hint: '「とかしている液体」はどちらかな。',
      }),
      fill({
        id: 'solution-dr1-t1', concept: 'sol-terms', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ヨウ素のエタノール溶液のエタノールのように、ほかの物質をとかしている液体を[b1]という。',
        blanks: [word('b1', ['溶媒', '溶液', '溶質'], '溶媒')],
        explanation: '物質をとかしている液体を**溶媒**といいます。水だけでなく、エタノールも溶媒になります。',
        hint: '「媒」は、なかだちをするものという意味だよ。',
      }),
      fill({
        id: 'solution-dr1-p2', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '10 % の食塩水 200 g に、水 200 g を加えてうすめた。うすめた食塩水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 5, 0, '%')],
        explanation: '食塩は 200 × 0.1 ＝ 20 g のままで、溶液は 400 g になります。20 ÷ 400 × 100 ＝ 5 % です。',
        hint: 'まず、とけている食塩が何 g かを求めよう。',
      }),
      fill({
        id: 'solution-dr1-p3', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '15 % の砂糖水を 120 g つくりたい。必要な水の質量は[b1]である。',
        blanks: [number('b1', 102, 0, 'g')],
        explanation: '砂糖は 120 × 0.15 ＝ 18 g です。のこりが水なので、120 − 18 ＝ 102 g です。',
        hint: '溶液 120 g のうち、砂糖が何 g かを先に出そう。',
      }),
      figureChoice({
        id: 'solution-dr1-p4', concept: 'sol-recrystal',
        prompt: '60 ℃ の水 100 g に、ア〜ウをそれぞれ 30 g とかし、20 ℃ まで冷やした。結晶がいちばん多く出るのはどれ？',
        figure: drSolTable(true),
        answer: 'r3',
        explanation: '20 ℃ で、硝酸カリウムは 32 g、塩化ナトリウムは 36 g までとけるので、30 g なら結晶は出ません。ミョウバンは 11 g までなので、30 − 11 ＝ 19 g が結晶になります。',
        hint: '20 ℃ でとける量が 30 g より少ないものをさがそう。',
      }),
      figureChoice({
        id: 'solution-dr1-p5', concept: 'sol-recrystal',
        prompt: '冷やして出てきた硝酸カリウムの結晶を、液と分けて取り出したい。ア 蒸留、イ 加熱してとかす、ウ ろ過。使う装置はどれ？ ア〜ウから選ぼう。',
        // ア 蒸留（フラスコ・管・試験管）、イ ビーカーを加熱、ウ ろ過（filterSetup）
        figure: scene([
          { type: 'circle', x: 50, y: 124, r: 28, fill: 'water', stroke: 'ink' },
          { type: 'line', points: [[50, 96], [50, 80], [100, 110], [100, 150]], color: 'line', width: 4 },
          { type: 'tube', x: 100, y: 190, height: 70, level: 0.2 },
          { type: 'flame', x: 50, y: 190 },
          { type: 'beaker', x: 150, y: 150, width: 60, height: 60, level: 0.5 },
          { type: 'flame', x: 150, y: 190 },
        ].concat(filterSetup(212, true, true), [
          { type: 'region', id: 'r1', x: 55, y: 218, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 150, y: 218, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 250, y: 218, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '液にとけていない固体（結晶）は、ろ紙を通りぬけられないので、ウのろ過で液と分けられます。アの蒸留は液体を分ける方法、イの加熱は結晶をとかしてしまいます。',
        hint: '固体と液体を、ろ紙で分ける方法だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'solution-dr1-r1', concept: 'sol-terms',
        prompt: '水 150 g に食塩 30 g をすべてとかした。できた食塩水（溶液）の質量はどれ？',
        options: ['180 g', '150 g', '120 g'],
        answer: 'a',
        explanation: '溶液の質量は、溶媒（水）と溶質（食塩）の質量の和なので、150 ＋ 30 ＝ 180 g です。とけて見えなくなっても、食塩の質量はなくなりません。',
        hint: 'とけた食塩の質量はどうなったかな。',
      }),
      choice({
        id: 'solution-dr1-t2', concept: 'sol-terms', term: true,
        prompt: '次の説明に合う言葉はどれ？「溶質が溶媒にとけてできた、液全体」',
        options: ['溶媒', '溶液', '溶質'],
        answer: 'b',
        explanation: '溶質が溶媒にとけてできた液全体を**溶液**といいます。溶媒が水のときは、とくに水溶液といいます。',
        hint: '食塩水でいえば、食塩水そのものだよ。',
      }),
      fill({
        id: 'solution-dr1-r2', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '20 % の食塩水 100 g に水 60 g を加えた。この食塩水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 12.5, 0, '%')],
        explanation: '食塩は 100 × 0.2 ＝ 20 g、溶液は 160 g になります。20 ÷ 160 × 100 ＝ 12.5 % です。',
        hint: '食塩 20 g は変わらない。溶液は何 g になったかな。',
      }),
      choice({
        id: 'solution-dr1-r3', concept: 'sol-concentration',
        prompt: '5 % の砂糖水 300 g と同じ量の砂糖がとけている、10 % の砂糖水は何 g？',
        options: ['600 g', '30 g', '150 g'],
        answer: 'c',
        explanation: '砂糖は 300 × 0.05 ＝ 15 g です。15 g が 10 % になる溶液は、15 ÷ 0.1 ＝ 150 g です。',
        hint: 'まず砂糖の質量を出し、それが 10 % になる全体の質量を考えよう。',
      }),
      fill({
        id: 'solution-dr1-r4', concept: 'sol-recrystal',
        prompt: '表を見て、空らんに入る数を入れよう。',
        figure: drSolTable(false),
        text: '40 ℃ の水 100 g にミョウバン 24 g をとかし、20 ℃ まで冷やすと、出てくる結晶は[b1]である。',
        blanks: [number('b1', 13, 0, 'g')],
        explanation: '20 ℃ ではミョウバンは 11 g までしかとけないので、24 − 11 ＝ 13 g が結晶になります。',
        hint: '20 ℃ の列のミョウバンの数を見よう。',
      }),
      fill({
        id: 'solution-dr1-r5', concept: 'sol-recrystal',
        prompt: '表を見て、空らんに入る数を入れよう。',
        figure: drSolTable(false),
        text: '20 ℃ の水 100 g に硝酸カリウムを 32 g とかした飽和水溶液から、20 ℃ のまま水を 50 g 蒸発させた。出てくる結晶は[b1]である。',
        blanks: [number('b1', 16, 0, 'g')],
        explanation: 'のこった水 50 g には、20 ℃ で 32 の半分の 16 g までしかとけません。32 − 16 ＝ 16 g が結晶になります。',
        hint: '水が半分になると、とけられる量も半分になるね。',
      }),
    ],
  };

  // ================================================================
  // クイズ（公開クイズの出題のねらいを参考に、2026-11-22 追加。文・図・数値の組み合わせは自作）
  // ================================================================

  // ビーカーを横に並べ、上に名前（「／」で 2 行）、下にア〜の選ぶ場所を置く図。list は [{ name, liquid }]（3 つか 4 つ）
  function kqBeakerRow(caption, list) {
    const n = list.length;
    const step = n === 4 ? 77 : 100;
    const x0 = n === 4 ? 44 : 60;
    const items = [{ type: 'text', x: 160, y: 24, text: caption, size: 14, anchor: 'middle' }];
    list.forEach((it, i) => {
      const x = x0 + step * i;
      const lines = it.name.split('／');
      lines.forEach((t, k) => items.push({ type: 'text', x, y: 56 + 20 * k, text: t, size: 13, anchor: 'middle' }));
      items.push({ type: 'beaker', x, y: 172, width: n === 4 ? 60 : 70, height: 76, level: 0.65, liquid: it.liquid });
      items.push({ type: 'region', id: 'r' + (i + 1), x, y: 208, r: 22, label: 'アイウエ'[i] });
    });
    return scene(items);
  }

  // ---- ステージ solution-kq1: クイズ 1（水溶液の言葉と濃度の計算） ----
  const solKq1 = {
    id: 'solution-kq1', areaId: 'dissolve', free: true, title: 'クイズ 1: 水溶液の言葉と濃度の計算', minutes: 6,
    concepts: ['sol-terms', 'sol-concentration'],
    lessons: [
      {
        id: 'solution-kq1-c1',
        text: '溶質が溶媒にとけていくことを**溶解**といい、できた液全体を溶液といいます。溶媒が水の溶液を**水溶液**といいます。水溶液はすきとおっていて、色がついているものもあります。塩酸のように、気体が溶質の水溶液もあります。',
        figure: scene([
          { type: 'beaker', x: 100, y: 200, width: 110, height: 130, level: 0.65, liquid: 'water' },
          { type: 'text', x: 100, y: 40, text: '溶質（砂糖）＋溶媒（水）', size: 13, anchor: 'middle' },
          { type: 'text', x: 100, y: 228, text: '溶液（砂糖水）', size: 13, anchor: 'middle' },
          { type: 'text', x: 180, y: 110, text: '溶媒が水', size: 14 },
          { type: 'text', x: 180, y: 136, text: '→ 水溶液', size: 14, bold: true },
          { type: 'text', x: 180, y: 176, text: '塩酸の溶質は', size: 13 },
          { type: 'text', x: 180, y: 198, text: '気体の塩化水素', size: 13 },
        ]),
      },
      {
        id: 'solution-kq1-c2',
        text: '2 つの水溶液を混ぜたときは、溶質の質量どうし、溶液の質量どうしをそれぞれたしてから**質量パーセント濃度**を求めます。水を加えてうすめるときは、溶質の質量は変わらず、溶液の質量だけがふえます。',
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '混ぜたときの濃度の求め方', size: 15, anchor: 'middle', bold: true },
          { type: 'text', x: 20, y: 78, text: '10 % の食塩水 100 g（食塩 10 g）', size: 13 },
          { type: 'text', x: 20, y: 106, text: '＋ 4 % の食塩水 200 g（食塩 8 g）', size: 13 },
          { type: 'line', points: [[20, 122], [300, 122]], width: 2 },
          { type: 'text', x: 20, y: 150, text: '食塩 18 g、食塩水 300 g', size: 14 },
          { type: 'text', x: 20, y: 186, text: '18 ÷ 300 × 100 ＝ 6 %', size: 16, bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'solution-kq1-w1', concept: 'sol-concentration',
      prompt: '予想しよう。10 % の砂糖水 100 g に、同じ 10 % の砂糖水 100 g を混ぜた。混ぜた砂糖水の濃さは何 % になると思う？',
      options: ['5 %', '10 %', '20 %'],
      answer: 'b',
      explanation: '砂糖は 10 g ＋ 10 g ＝ 20 g、砂糖水は 200 g なので、20 ÷ 200 × 100 ＝ 10 % です。同じ濃さの液を混ぜても、濃さは変わりません。',
      hint: '砂糖と砂糖水の質量を、それぞれたしてみよう。',
    }),
    problems: [
      figureChoice({
        id: 'solution-kq1-p1', concept: 'sol-terms',
        prompt: 'ア 牛乳、イ 墨汁、ウ 食酢、エ みそしる のうち、水溶液といえるのはどれ？',
        figure: kqBeakerRow('4 つの液体', [{ name: '牛乳', liquid: 'white' }, { name: '墨汁', liquid: 'ink' }, { name: '食酢', liquid: 'water' }, { name: 'みそしる', liquid: 'brown' }]),
        answer: 'r3',
        explanation: '食酢は、酢酸という物質が水にとけた水溶液で、すきとおっています。牛乳・墨汁・みそしるは、とけていない小さな粒が散らばっていて、すきとおっていません。',
        hint: '向こうがすけて見える液はどれかな。',
      }),
      fill({
        id: 'solution-kq1-t1', concept: 'sol-terms', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '溶質が溶媒にとけていくことを[b1]という。',
        blanks: [word('b1', ['溶解', '溶液', '溶媒'], '溶解')],
        explanation: '溶質が溶媒にとけることを**溶解**といいます。とけてできた液全体が溶液、とかしている液体が溶媒です。',
        hint: '「とける」ことを表す言葉だよ。',
      }),
      fill({
        id: 'solution-kq1-p2', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '20 % の食塩水 100 g と、5 % の食塩水 200 g を混ぜた。できた食塩水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 10, 0, '%')],
        explanation: '食塩は 20 g ＋ 10 g ＝ 30 g、食塩水は 100 g ＋ 200 g ＝ 300 g です。30 ÷ 300 × 100 ＝ 10 % になります。20 % と 5 % の平均ではありません。',
        hint: 'それぞれにとけている食塩の質量を先に求めよう。',
      }),
      fill({
        id: 'solution-kq1-p3', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '25 % の砂糖水 80 g に水を加えて、10 % の砂糖水にしたい。加える水の質量は[b1]である。',
        blanks: [number('b1', 120, 0, 'g')],
        explanation: '砂糖は 80 × 0.25 ＝ 20 g で、水を加えても変わりません。20 g が 10 % になる砂糖水は 200 g なので、加える水は 200 − 80 ＝ 120 g です。',
        hint: 'とけている砂糖の質量は、水を加えても変わらないよ。',
      }),
      choice({
        id: 'solution-kq1-p4', concept: 'sol-terms',
        prompt: '塩酸は、塩化水素という気体が水にとけた水溶液である。塩酸の溶質と溶媒の組み合わせはどれ？',
        options: ['溶質 塩化水素・溶媒 水', '溶質 水・溶媒 塩化水素', '溶質 塩酸・溶媒 水'],
        answer: 'a',
        explanation: 'とけている物質が溶質、とかしている液体が溶媒です。塩酸では、気体の塩化水素が溶質、水が溶媒です。溶質は固体とは限りません。',
        hint: 'とけているのはどちらか、とかしているのはどちらかを考えよう。',
      }),
      figureChoice({
        id: 'solution-kq1-p5', concept: 'sol-concentration',
        prompt: 'ア 10 % の食塩水 100 g、イ 10 % の食塩水 300 g、ウ 20 % の食塩水 100 g。とけている食塩の質量がいちばん多いのはどれ？',
        figure: kqBeakerRow('3 つの食塩水', [{ name: '10 %／100 g', liquid: 'water' }, { name: '10 %／300 g', liquid: 'water' }, { name: '20 %／100 g', liquid: 'water' }]),
        answer: 'r2',
        explanation: '食塩の質量は、アが 10 g、イが 30 g、ウが 20 g です。濃度がいちばん大きいウではなく、量の多いイに食塩がいちばん多くとけています。',
        hint: '濃度 × 食塩水の質量 で、食塩の質量を出そう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'solution-kq1-r1', concept: 'sol-concentration',
        prompt: '空らんに入る数を入れよう。',
        text: '8 % の食塩水 50 g と、2 % の食塩水 50 g を混ぜた。できた食塩水の質量パーセント濃度は[b1]である。',
        blanks: [number('b1', 5, 0, '%')],
        explanation: '食塩は 4 g ＋ 1 g ＝ 5 g、食塩水は 100 g です。5 ÷ 100 × 100 ＝ 5 % になります。',
        hint: '食塩の質量と食塩水の質量を、それぞれたそう。',
      }),
      choice({
        id: 'solution-kq1-r2', concept: 'sol-concentration',
        prompt: '12 % の食塩水 100 g に水を加えて、4 % の食塩水にしたい。加える水は何 g？',
        options: ['100 g', '200 g', '300 g'],
        answer: 'b',
        explanation: '食塩は 12 g です。12 g が 4 % になる食塩水は 300 g なので、加える水は 300 − 100 ＝ 200 g です。',
        hint: 'うすめたあとの食塩水全体の質量を、先に求めよう。',
      }),
      fill({
        id: 'solution-kq1-r3', concept: 'sol-terms',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '炭酸水は、気体が水にとけた水溶液である。炭酸水の溶質は[b1]である。',
        blanks: [word('b1', ['二酸化炭素', '水', '酸素'], '二酸化炭素')],
        explanation: '炭酸水は、二酸化炭素が水にとけた水溶液です。溶質は二酸化炭素、溶媒は水です。ふたをあけると、とけきれない二酸化炭素があわになって出てきます。',
        hint: '炭酸水のあわの正体を考えよう。',
      }),
      choice({
        id: 'solution-kq1-t2', concept: 'sol-terms', term: true,
        prompt: '次の説明に合う言葉はどれ？「溶質が溶媒にとけていくこと」',
        options: ['溶解', '溶液', '溶質'],
        answer: 'a',
        explanation: '溶質が溶媒にとけることを**溶解**といいます。溶液はとけてできた液全体、溶質はとけている物質です。',
        hint: '物質ではなく、とけるという「できごと」を表す言葉だよ。',
      }),
      figureChoice({
        id: 'solution-kq1-r4', concept: 'sol-terms',
        prompt: 'ア 食塩水、イ 硫酸銅の水溶液（青色）、ウ 石灰水、エ 牛乳 のうち、水溶液ではないものはどれ？',
        figure: kqBeakerRow('4 つの液体', [{ name: '食塩水', liquid: 'water' }, { name: '硫酸銅', liquid: 'sky' }, { name: '石灰水', liquid: 'water' }, { name: '牛乳', liquid: 'white' }]),
        answer: 'r4',
        explanation: '牛乳はすきとおっていないので、水溶液ではありません。硫酸銅の水溶液は青色ですが、すきとおっていて、どこも同じ濃さなので水溶液です。',
        hint: '色があるかではなく、すきとおっているかで考えよう。',
      }),
    ],
  };

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'solution',
    title: '水溶液',
    mascot: 'B',   // 担当の先生（しずく博士。js/mascot.js の MASCOTS）
    concepts: concepts.concat(mpConcepts),
    areas: [
      { id: 'dissolve', title: '水にとける', order: 1, stages: [sol1, sol2, solMp1, solMp2, solKq1] },
      { id: 'sol-solubility', title: '溶解度', order: 2, stages: [sol3, sol4, solMp3, solMp4, solDr1] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
