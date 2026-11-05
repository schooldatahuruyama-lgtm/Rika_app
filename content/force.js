// 「力のはたらき」教材データ（中学1年 理科・物理）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」）。
// 2 領域 × 2 ステージ（力とは・力の大きさ）と、概念 6 つ。
// 図（scene）の item は js/figures.js の汎用の部品（docs/figures-guide.md）で描く。座標は x 右向き・y 下向き、場面は 320×240。
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

  // ---- 力の単元の図の道具 ----

  // ばね: x の位置に、yTop から yBottom まで縦にのびるジグザグの線（点 10 個）
  function spring(x, yTop, yBottom) {
    const h = yBottom - yTop;
    const pts = [[x, yTop]];
    for (let i = 0; i < 8; i++) pts.push([x + (i % 2 === 0 ? -10 : 10), yTop + h * (i + 1) / 9]);
    pts.push([x, yBottom]);
    return { type: 'line', points: pts, color: 'line', width: 2 };
  }

  // 天井（ばねをつるす板）
  function ceiling(x, width) { return { type: 'rect', x, y: 10, width, height: 8, fill: 'gray', stroke: 'line' }; }

  // 力の矢印（青）と作用点（青い小さな丸）
  function force(x1, y1, x2, y2, label) {
    const a = { type: 'arrow', x1, y1, x2, y2, color: 'blue' };
    if (label) a.label = label;
    return [a, { type: 'circle', x: x1, y: y1, r: 5, fill: 'blue', stroke: 'blue' }];
  }

  // 力とばねの伸びのグラフ（原点 (50,200)。横 0.1 N ＝ 45px、縦 1 cm ＝ 30px。0.5 N・5 cm まで）
  // 0.1 N で 1 cm 伸びるばねの直線と、測った点を描く
  function hookeGraph() {
    const items = [
      { type: 'line', points: [[50, 200], [305, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [50, 28]], width: 2, arrow: true },
      { type: 'text', x: 8, y: 22, text: '伸び〔cm〕', size: 12 },
      { type: 'text', x: 312, y: 236, text: '力の大きさ〔N〕', size: 12, anchor: 'end' },
      { type: 'text', x: 42, y: 216, text: '0', size: 12, anchor: 'end' },
    ];
    for (let i = 1; i <= 5; i++) {
      const gx = 50 + 45 * i, gy = 200 - 30 * i;
      items.push({ type: 'line', points: [[gx, 200], [gx, 50]], color: 'gray', width: 1, dashed: true });
      items.push({ type: 'line', points: [[50, gy], [275, gy]], color: 'gray', width: 1, dashed: true });
      items.push({ type: 'text', x: gx, y: 218, text: '0.' + i, size: 12, anchor: 'middle' });
      items.push({ type: 'text', x: 42, y: gy + 5, text: String(i), size: 12, anchor: 'end' });
    }
    items.push({ type: 'line', points: [[50, 200], [275, 50]], color: 'blue', width: 3 });
    for (let i = 1; i <= 5; i++) items.push({ type: 'circle', x: 50 + 45 * i, y: 200 - 30 * i, r: 5, fill: 'ink' });
    return items;
  }

  // 机（天板と脚）。天板の上の面は y = top
  function desk(top) {
    return [
      { type: 'rect', x: 50, y: top, width: 220, height: 14, fill: 'brown', stroke: 'ink' },
      { type: 'line', points: [[70, top + 14], [70, 232]], color: 'brown', width: 5 },
      { type: 'line', points: [[250, top + 14], [250, 232]], color: 'brown', width: 5 },
    ];
  }

  // ================================================================
  // 領域 1: 力とは
  // ================================================================

  // ---- ステージ force-1: 力のはたらきと種類 ----
  const force1 = {
    id: 'force-1', areaId: 'what', title: '力のはたらきと種類', minutes: 5, concepts: ['fo-effect', 'fo-kinds'],
    lessons: [
      {
        id: 'force-1-c1',
        text: '物体に力を加えると、物体の**形を変える**、物体の**運動のようす**（速さや向き）を変える、物体を**支える**、のどれかのはたらきが見られます。力は目に見えませんが、こうしたようすから、力がはたらいていることが分かります。',
        // 左: スポンジを押す（形）、中: ボールをける（運動のようす）、右: 荷物を手で支える（支える）
        figure: scene([
          { type: 'ellipse', x: 55, y: 150, rx: 40, ry: 14, fill: 'yellow' },
          { type: 'arrow', x1: 55, y1: 80, x2: 55, y2: 132, color: 'blue' },
          { type: 'circle', x: 150, y: 150, r: 16, fill: 'white' },
          { type: 'ellipse', x: 124, y: 158, rx: 14, ry: 8, fill: 'pink' },
          { type: 'arrow', x1: 170, y1: 140, x2: 215, y2: 110, color: 'blue' },
          { type: 'rect', x: 245, y: 110, width: 44, height: 34, fill: 'sand' },
          { type: 'ellipse', x: 267, y: 154, rx: 26, ry: 9, fill: 'pink' },
          { type: 'arrow', x1: 267, y1: 144, x2: 267, y2: 92, color: 'blue' },
          { type: 'text', x: 55, y: 220, text: '形を変える', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 220, text: '動きを変える', size: 14, anchor: 'middle' },
          { type: 'text', x: 267, y: 220, text: '支える', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'force-1-c2',
        text: '地球が物体を、地球の中心に向かって引く力を**重力**といいます。机の上の本には、重力のほかに、机の面が本を押し返す**垂直抗力**もはたらいています。この 2 つの力で、本は落ちずに止まっています。',
        // 机の上の本。重力（中心から下向き・青）と垂直抗力（机とふれている面から上向き・緑）。force-4-c2 と同じく一直線上にかく
        figure: scene([
          ...desk(160),
          { type: 'rect', x: 120, y: 110, width: 80, height: 50, fill: 'lightgreen' },
          { type: 'text', x: 126, y: 141, text: '本', size: 14 },
          { type: 'arrow', x1: 160, y1: 160, x2: 160, y2: 90, color: 'green' },
          { type: 'circle', x: 160, y: 160, r: 5, fill: 'green', stroke: 'green' },
          { type: 'arrow', x1: 160, y1: 135, x2: 160, y2: 205, color: 'blue' },
          { type: 'circle', x: 160, y: 135, r: 5, fill: 'blue', stroke: 'blue' },
          { type: 'text', x: 150, y: 206, text: '重力', size: 14, anchor: 'end' },
          { type: 'text', x: 170, y: 96, text: '垂直抗力', size: 14 },
        ]),
      },
      {
        id: 'force-1-c3',
        anim: 'fo-friction',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '床の上で物体をすべらせると、ふれている面から、動きをさまたげる向きに**摩擦力**がはたらきます。のばしたばねやゴムがもとに戻ろうとする力は**弾性力**です。磁石の力（**磁力**）や電気の力は、離れていてもはたらきます。',
        // 上: すべる箱と摩擦力（動く向きと反対）、下: 離れていても引き合う磁石
        figure: scene([
          { type: 'line', points: [[20, 110], [300, 110]], color: 'line', width: 3 },
          { type: 'rect', x: 140, y: 70, width: 60, height: 40, fill: 'sand', label: '箱' },
          { type: 'arrow', x1: 210, y1: 60, x2: 280, y2: 60, color: 'gray', label: '動く向き' },
          { type: 'arrow', x1: 170, y1: 110, x2: 110, y2: 110, color: 'blue' },
          { type: 'text', x: 40, y: 134, text: '摩擦力', size: 14 },
          { type: 'rect', x: 60, y: 160, width: 70, height: 34, fill: 'red', label: 'N' },
          { type: 'rect', x: 190, y: 160, width: 70, height: 34, fill: 'sky', label: 'S' },
          { type: 'text', x: 160, y: 222, text: '離れていても引き合う', size: 14, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'force-1-w1', concept: 'fo-kinds',
      prompt: '予想しよう。机の上に置いた本は、じっと止まっています。この本に力ははたらいていると思う？',
      options: ['止まっているので、力は何もはたらいていない', '下向きの力と上向きの力がはたらいている', '上向きの力だけがはたらいている'],
      answer: 'b',
      explanation: '本には、地球が引く下向きの力と、机が押し返す上向きの力がはたらいています。止まっていても力ははたらいていることを、このステージで確かめよう。',
      hint: '机がなかったら、本はどうなるか考えてみよう。',
    }),
    problems: [
      choice({
        id: 'force-1-p1', concept: 'fo-effect',
        prompt: 'ゴムボールを手で強くにぎると、ボールがへこみました。これは力のどのはたらき？',
        options: ['物体の形を変える', '物体の運動のようす（速さや向き）を変える', '物体を支える'],
        answer: 'a',
        explanation: 'ボールがへこんだのは、力によって形が変わったからです。「形が変わる」「動きが変わる」「支えられる」のどれが見えるかで、力のはたらきを見分けよう。',
        hint: 'にぎったあと、ボールの何が変わったかに注目しよう。',
      }),
      fill({
        id: 'force-1-t1', concept: 'fo-kinds', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地球が物体を中心に向かって引く力を[b1]という。物体に押された面が、物体を押し返す力を[b2]という。',
        blanks: [
          word('b1', ['重力', '垂直抗力', '摩擦力'], '重力'),
          word('b2', ['重力', '垂直抗力', '摩擦力'], '垂直抗力'),
        ],
        explanation: '地球が引く力が**重力**、面が押し返す力が**垂直抗力**です。机の上の本には、この 2 つの力がはたらいています。',
        hint: '「垂直」は面に直角という意味。面が押し返す力はどちらかな。',
      }),
      figureChoice({
        id: 'force-1-p2', concept: 'fo-effect',
        prompt: 'アはスポンジを指で押しているところ、イは転がってきたボールをけり返しているところ、ウは荷物を手でささえているところです。「物体の運動のようす（速さや向き）を変える」はたらきの例はどれ？',
        // ア: へこむスポンジ、イ: 向きが変わるボール、ウ: 手の上の荷物
        figure: scene([
          { type: 'ellipse', x: 55, y: 130, rx: 40, ry: 14, fill: 'yellow' },
          { type: 'arrow', x1: 55, y1: 60, x2: 55, y2: 112, color: 'blue' },
          { type: 'line', points: [[110, 80], [148, 128]], color: 'gray', width: 2, dashed: true, arrow: true },
          { type: 'circle', x: 160, y: 136, r: 14, fill: 'white' },
          { type: 'line', points: [[172, 128], [210, 80]], color: 'gray', width: 2, dashed: true, arrow: true },
          { type: 'rect', x: 245, y: 90, width: 44, height: 34, fill: 'sand' },
          { type: 'ellipse', x: 267, y: 134, rx: 26, ry: 9, fill: 'pink' },
          { type: 'region', id: 'r1', x: 55, y: 200, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 200, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 267, y: 200, r: 24, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'けり返されたボールは、進む向きと速さが変わっています。これが運動のようすを変えるはたらきです。アは形を変える、ウは物体を支えるはたらきです。',
        hint: '力を受けたあと、動きが変わったのはどれか考えよう。',
      }),
      choice({
        id: 'force-1-p3', concept: 'fo-kinds',
        prompt: '床の上で、箱を右向きに押してすべらせています。床が箱にはたらく摩擦力の向きはどれ？',
        options: ['右向き（動く向きと同じ）', '左向き（動く向きと反対）', '上向き'],
        answer: 'b',
        explanation: '摩擦力は、ふれている面から、動きをさまたげる向きにはたらきます。箱は右へ動いているので、摩擦力は左向きです。押すのをやめると箱が止まるのは、この力のためです。',
        hint: '摩擦力は、動きを「じゃまする」向きにはたらく力だったね。',
      }),
      choice({
        id: 'force-1-p4', concept: 'fo-kinds',
        prompt: '次のうち、物体どうしが離れていてもはたらく力はどれ？',
        options: ['摩擦力', '垂直抗力', '磁石の力（磁力）'],
        answer: 'c',
        explanation: '磁石の力は、磁石どうしが離れていてもはたらきます。重力や電気の力も同じです。摩擦力や垂直抗力は、物体がふれ合っているときにはたらく力です。',
        hint: '磁石を近づけたときのことを思い出そう。',
      }),
      choice({
        id: 'force-1-p5', concept: 'fo-effect',
        prompt: '次のうち、「物体を支える」はたらきの例はどれ？',
        options: ['ばねを引いてのばす', '棚の上に置いた花びんが、落ちずに止まっている', '投げたボールが、バットに当たって向きを変える'],
        answer: 'b',
        explanation: '棚が花びんを下から押して支えているので、花びんは落ちません。ばねをのばすのは形を変える、ボールの向きが変わるのは運動のようすを変えるはたらきです。',
        hint: '物体が落ちたり動いたりしないように、力がはたらいているものをさがそう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'force-1-r1', concept: 'fo-effect',
        prompt: '飛んできたボールをグローブで受けとめて、止めました。これは力のどのはたらき？',
        options: ['物体の形を変える', '物体の運動のようす（速さや向き）を変える', '物体を支える'],
        answer: 'b',
        explanation: '動いていたボールが止まったので、速さが変わっています。止めることも、運動のようすを変えるはたらきです。',
        hint: 'ボールの速さはどう変わったか考えよう。',
      }),
      fill({
        id: 'force-1-r2', concept: 'fo-effect',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '力には、物体の[b1]を変える、物体の運動のようすを変える、物体を支える、というはたらきがある。',
        blanks: [word('b1', ['形', '色', '温度'], '形')],
        explanation: '力のはたらきは、形を変える・運動のようすを変える・支えるの 3 つです。ばねがのびたり、粘土がつぶれたりするのは、形を変えるはたらきです。',
        hint: 'スポンジを押したとき、何が変わったかな。',
      }),
      choice({
        id: 'force-1-r3', concept: 'fo-kinds',
        prompt: '床の上をすべらせた本が、しばらくすると止まりました。本を止めたのは、おもにどの力？',
        options: ['重力', '摩擦力', '磁石の力'],
        answer: 'b',
        explanation: '床と本がふれている面で、動きをさまたげる向きに摩擦力がはたらくので、本はだんだんおそくなって止まります。',
        hint: '動きをさまたげる向きにはたらく力はどれかな。',
      }),
      choice({
        id: 'force-1-t2', concept: 'fo-kinds', term: true,
        prompt: '次の説明に合う言葉はどれ？「のばしたばねや、変形したゴムが、もとに戻ろうとしてはたらく力」',
        options: ['弾性力', '摩擦力', '重力'],
        answer: 'a',
        explanation: '変形した物体がもとに戻ろうとする力を**弾性力**といいます。ばねばかりは、この力を使って力の大きさをはかります。',
        hint: 'ばねやゴムの「はずむ」性質に関係する言葉だよ。',
      }),
    ],
  };

  // ---- ステージ force-2: 力の表し方（力の 3 要素と矢印、ニュートン） ----
  const force2 = {
    id: 'force-2', areaId: 'what', title: '力の表し方', minutes: 5, concepts: ['fo-arrow'],
    lessons: [
      {
        id: 'force-2-c1',
        text: '力には、**力の大きさ**・**力の向き**・力がはたらく点である**作用点**の 3 つの要素があります。力は矢印で表し、矢印の始まりを作用点、矢印の向きを力の向き、矢印の長さを力の大きさにします。',
        // 指で箱を右へ押す力。作用点は指と箱がふれている点
        figure: scene([
          { type: 'rect', x: 90, y: 90, width: 120, height: 80, fill: 'sand' },
          { type: 'ellipse', x: 68, y: 130, rx: 22, ry: 10, fill: 'pink' },
          ...force(90, 130, 180, 130),
          { type: 'text', x: 60, y: 196, text: '作用点', size: 14 },
          { type: 'text', x: 140, y: 120, text: '向き', size: 14, anchor: 'middle' },
          { type: 'text', x: 20, y: 40, text: '矢印の長さ ＝ 力の大きさ', size: 14 },
        ]),
      },
      {
        id: 'force-2-c2',
        text: '力の大きさの単位は**ニュートン**（記号 **N**）です。100 g の物体にはたらく重力の大きさが、およそ 1 N です。矢印でかくときは「1 N を 1 cm」のように決めて、力の大きさに比例した長さにします。',
        // 100 g → 1 N（矢印 60px）、200 g → 2 N（矢印 120px）
        figure: scene([
          { type: 'rect', x: 55, y: 40, width: 60, height: 40, fill: 'gray', label: '100 g', labelPos: 'above' },
          ...force(85, 60, 85, 120),
          { type: 'text', x: 96, y: 116, text: '1 N', size: 14 },
          { type: 'rect', x: 190, y: 40, width: 60, height: 40, fill: 'gray', label: '200 g', labelPos: 'above' },
          ...force(220, 60, 220, 180),
          { type: 'text', x: 231, y: 176, text: '2 N', size: 14 },
          { type: 'text', x: 160, y: 226, text: '100 g の物体にはたらく重力 ≒ 1 N', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'force-2-c3',
        text: '重力の矢印は、物体の中心を**作用点**にして、真下に向けてかきます。手で押す力やひもで引く力は、手やひもが物体にふれているところが**作用点**です。',
        // 床の上の箱。重力は中心から真下
        figure: scene([
          { type: 'line', points: [[20, 170], [300, 170]], color: 'line', width: 3 },
          { type: 'rect', x: 120, y: 100, width: 80, height: 70, fill: 'sand' },
          ...force(160, 135, 160, 215),
          { type: 'text', x: 170, y: 210, text: '重力', size: 14 },
          { type: 'text', x: 20, y: 40, text: '重力は物体の中心から真下へ', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'force-2-w1', concept: 'fo-arrow',
      prompt: '予想しよう。力を矢印で表すとき、矢印の長さは何を表していると思う？',
      options: ['力の大きさ', '物体の大きさ', '力がはたらいている時間'],
      answer: 'a',
      explanation: '矢印の長さは力の大きさを表します。大きな力ほど長い矢印になります。矢印のかき方のきまりを、このステージで学ぼう。',
      hint: '強く押したときと弱く押したときで、何が変わるか考えよう。',
    }),
    problems: [
      figureChoice({
        id: 'force-2-p1', concept: 'fo-arrow',
        prompt: '3 つの箱に、それぞれ矢印が 1 本かいてあります。アは箱の中心から下向き、イは箱の中心から上向き、ウは箱の中心から横向きの矢印です。箱にはたらく重力を正しく表しているのはどれ？',
        // どの矢印も箱の中心が始まり（作用点）。向きだけがちがう
        figure: scene([
          { type: 'rect', x: 30, y: 60, width: 50, height: 40, fill: 'sand' },
          ...force(55, 80, 55, 150),
          { type: 'rect', x: 135, y: 110, width: 50, height: 40, fill: 'sand' },
          ...force(160, 130, 160, 60),
          { type: 'rect', x: 215, y: 60, width: 50, height: 40, fill: 'sand' },
          ...force(240, 80, 305, 80),
          { type: 'region', id: 'r1', x: 55, y: 204, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 204, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 240, y: 204, r: 24, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '重力は、地球が物体を地球の中心に向かって引く力なので、物体の中心から真下に向けてかきます。だからアが正しい矢印です。',
        hint: '重力は、地球がどちら向きに物体を引く力だったか思い出そう。',
      }),
      fill({
        id: 'force-2-t1', concept: 'fo-arrow', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '力の大きさ・力の向き・[b1]を、力の 3 要素という。力の大きさの単位は[b2]（記号 N）である。',
        blanks: [
          word('b1', ['作用点', '支点', '焦点'], '作用点'),
          word('b2', ['ニュートン', 'グラム', 'メートル'], 'ニュートン'),
        ],
        explanation: '力がはたらく点を**作用点**といい、大きさ・向きと合わせて力の 3 要素です。力の大きさの単位は**ニュートン**（N）です。',
        hint: '矢印の「始まりの点」を何とよんだか思い出そう。',
      }),
      drag({
        id: 'force-2-p2', concept: 'fo-arrow',
        prompt: 'ひもで箱を右向きに引いています。ひもが箱を引く力の作用点はどこ？ 青い点を動かして、作用点の位置に置こう。',
        // ひもは箱の右の面の (170,140) についている → 作用点は (170,140)。不正解例は箱の中心 (125,140)（45 はなれる）
        figure: scene([
          { type: 'rect', x: 80, y: 110, width: 90, height: 60, fill: 'sand', label: '箱' },
          { type: 'line', points: [[170, 140], [246, 140]], color: 'brown', width: 3 },
          { type: 'ellipse', x: 262, y: 140, rx: 16, ry: 20, fill: 'pink' },
          { type: 'arrow', x1: 200, y1: 90, x2: 270, y2: 90, color: 'gray', label: '引く向き' },
          { type: 'circle', id: 'pt', x: 60, y: 196, r: 10, fill: 'blue', stroke: 'blue', label: '作用点', labelPos: 'below' },
        ]),
        draggable: { itemId: 'pt', axis: 'xy' },
        target: { x: 170, y: 140 },
        samples: { correct: { x: 170, y: 140 }, wrong: { x: 125, y: 140 } },
        explanation: 'ひもが箱を引く力は、ひもが箱にふれているところにはたらきます。だから作用点は、ひもと箱のつなぎ目です。重力のように物体の中心にかくのではない点に気をつけよう。',
        hint: 'ひもが箱にふれているところをさがそう。',
      }),
      fill({
        id: 'force-2-p3', concept: 'fo-arrow',
        prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
        text: '300 g の物体にはたらく重力の大きさは[b1]である。',
        blanks: [number('b1', 3, 0, 'N')],
        explanation: '100 g で 1 N なので、300 g ではその 3 倍の 3 N です。g（グラム）を 100 でわると N の数になる、と考えると計算しやすくなります。',
        hint: '300 g は 100 g の何倍か考えよう。',
      }),
      figureChoice({
        id: 'force-2-p4', concept: 'fo-arrow',
        prompt: '上の短い線の長さが 1 N を表します。ア〜ウの矢印のうち、2 N の力を表しているのはどれ？',
        // 1 N ＝ 40px。ア 40px（1 N）、イ 80px（2 N）、ウ 120px（3 N）
        figure: scene([
          { type: 'line', points: [[60, 30], [100, 30]], color: 'ink', width: 4 },
          { type: 'text', x: 108, y: 35, text: '1 N', size: 14 },
          { type: 'line', points: [[100, 44], [100, 200]], color: 'gray', width: 1, dashed: true },
          { type: 'line', points: [[140, 44], [140, 200]], color: 'gray', width: 1, dashed: true },
          { type: 'line', points: [[180, 44], [180, 200]], color: 'gray', width: 1, dashed: true },
          ...force(60, 70, 100, 70),
          ...force(60, 125, 140, 125),
          ...force(60, 180, 180, 180),
          { type: 'region', id: 'r1', x: 260, y: 70, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 260, y: 125, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 180, r: 24, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '矢印の長さは力の大きさに比例します。1 N の線 2 本分の長さのイが 2 N です。アは 1 N、ウは 3 N を表しています。',
        hint: '1 N の線の何本分の長さか、点線を使って数えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'force-2-r1', concept: 'fo-arrow',
        prompt: '物体にはたらく重力を矢印でかくとき、作用点はどこにする？',
        options: ['物体の中心', '物体の上の面', '物体のどこでもよい'],
        answer: 'a',
        explanation: '重力は物体全体にはたらきますが、矢印でかくときは物体の中心を作用点にして、真下に向けてかきます。',
        hint: '重力の矢印は、物体の「まん中」から下向きだったね。',
      }),
      fill({
        id: 'force-2-r2', concept: 'fo-arrow',
        prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
        text: '500 g の物体にはたらく重力の大きさは[b1]である。',
        blanks: [number('b1', 5, 0, 'N')],
        explanation: '100 g で 1 N なので、500 g ではその 5 倍の 5 N です。',
        hint: '500 g は 100 g の何倍かな。',
      }),
      choice({
        id: 'force-2-t2', concept: 'fo-arrow', term: true,
        prompt: '次の説明に合う言葉はどれ？「力がはたらいている点。力の矢印の始まりにかく」',
        options: ['作用点', '支点', '焦点'],
        answer: 'a',
        explanation: '力がはたらいている点を**作用点**といいます。力の矢印は、作用点から力の向きにかきます。',
        hint: '力が「作用」する点、という意味の言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 力の大きさ
  // ================================================================

  // ---- ステージ force-3: ばねの伸びと力（フックの法則） ----
  const force3 = {
    id: 'force-3', areaId: 'spring', title: 'ばねの伸びと力', minutes: 5, concepts: ['fo-hooke'],
    lessons: [
      {
        id: 'force-3-c1',
        anim: 'fo-spring-stretch',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: 'ばねにおもりをつるすと、ばねは伸びます。おもりの数を増やして、ばねを引く力を大きくすると、伸びも大きくなります。**ばねの伸び**は、ばね全体の長さではなく、もとの長さから伸びた分の長さです。',
        // おもりなし・1 個・2 個。1 個で 40px 伸びる
        figure: scene([
          ceiling(50, 240),
          { type: 'line', points: [[60, 90], [290, 90]], color: 'gray', width: 1, dashed: true },
          { type: 'text', x: 8, y: 94, text: 'もとの長さ', size: 12 },
          spring(100, 18, 90),
          { type: 'text', x: 100, y: 116, text: 'おもりなし', size: 12, anchor: 'middle' },
          spring(180, 18, 130),
          { type: 'rect', x: 162, y: 130, width: 36, height: 24, fill: 'gray', label: '1個' },
          spring(260, 18, 170),
          { type: 'rect', x: 242, y: 170, width: 36, height: 24, fill: 'gray', label: '1個' },
          { type: 'rect', x: 242, y: 194, width: 36, height: 24, fill: 'gray', label: '1個' },
        ]),
      },
      {
        id: 'force-3-c2',
        anim: 'fo-hooke-graph',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: 'ばねの伸びは、ばねを引く力の大きさに**比例**します。これを**フックの法則**といいます。力を 2 倍、3 倍にすると、伸びも 2 倍、3 倍になります。グラフにすると、原点を通る直線になります。',
        // 0.1 N で 1 cm 伸びるばねのグラフ
        figure: scene([
          ...hookeGraph(),
          { type: 'text', x: 100, y: 60, text: '原点を通る直線', size: 14 },
        ]),
      },
      {
        id: 'force-3-c3',
        text: '**フックの法則**を使うと、0.1 N で 1 cm 伸びるばねは、0.3 N で 3 cm、1.0 N で 10 cm 伸びると分かります。実験で測った点は少しずれることがあるので、グラフは点の近くを通る直線で引きます。',
        // 力と伸びの表
        figure: scene([
          { type: 'rect', x: 20, y: 50, width: 80, height: 40, fill: 'sky' },
          { type: 'rect', x: 20, y: 90, width: 80, height: 40, fill: 'sky' },
          { type: 'text', x: 60, y: 75, text: '力〔N〕', size: 13, anchor: 'middle' },
          { type: 'text', x: 60, y: 115, text: '伸び〔cm〕', size: 13, anchor: 'middle' },
          ...[0, 1, 2, 3, 4].flatMap(i => [
            { type: 'rect', x: 100 + 40 * i, y: 50, width: 40, height: 40, fill: 'white' },
            { type: 'rect', x: 100 + 40 * i, y: 90, width: 40, height: 40, fill: 'white' },
            { type: 'text', x: 120 + 40 * i, y: 75, text: i === 0 ? '0' : '0.' + i, size: 14, anchor: 'middle' },
            { type: 'text', x: 120 + 40 * i, y: 115, text: String(i), size: 14, anchor: 'middle' },
          ]),
          { type: 'text', x: 30, y: 176, text: '力が 2 倍 → 伸びも 2 倍', size: 16 },
          { type: 'text', x: 30, y: 210, text: '力が 3 倍 → 伸びも 3 倍', size: 16 },
        ]),
      },
    ],
    warmup: choice({
      id: 'force-3-w1', concept: 'fo-hooke',
      prompt: '予想しよう。ばねにつるす同じおもりを、1 個から 2 個に増やすと、ばねの伸びはどうなると思う？',
      options: ['約 2 倍になる', '変わらない', '半分になる'],
      answer: 'a',
      explanation: 'ばねを引く力が 2 倍になるので、伸びも約 2 倍になります。このきまりを、このステージでくわしく調べよう。',
      hint: 'おもりが増えると、ばねを引く力はどうなるかな。',
    }),
    problems: [
      fill({
        id: 'force-3-p1', concept: 'fo-hooke',
        prompt: 'グラフは、あるばねを引く力の大きさと、ばねの伸びの関係です。空らんに入る数を入れよう。',
        figure: scene(hookeGraph()),
        text: 'このばねを 0.4 N の力で引くと、伸びは[b1]になる。',
        blanks: [number('b1', 4, 0.1, 'cm')],
        explanation: '横軸の 0.4 N から真上に進み、直線と交わる点の縦軸を読むと 4 cm です。このばねは 0.1 N で 1 cm 伸びるので、計算でも 4 cm と確かめられます。',
        hint: '横軸の 0.4 から上へたどって、直線とぶつかったところの縦軸を読もう。',
      }),
      fill({
        id: 'force-3-t1', concept: 'fo-hooke', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ばねの伸びは、ばねを引く力の大きさに[b1]する。この関係を[b2]という。',
        blanks: [
          word('b1', ['比例', '反比例', '関係しない'], '比例'),
          word('b2', ['フックの法則', '反射の法則', '力の 3 要素'], 'フックの法則'),
        ],
        explanation: 'ばねの伸びは力の大きさに**比例**します。これを**フックの法則**といいます。グラフが原点を通る直線になるのは、比例の関係だからです。',
        hint: '力が 2 倍になると伸びも 2 倍になる関係を何というかな。',
      }),
      fill({
        id: 'force-3-p2', concept: 'fo-hooke',
        prompt: '空らんに入る数を入れよう。',
        text: '0.1 N で 1 cm 伸びるばねを、1.5 N の力で引くと、伸びは[b1]になる。',
        blanks: [number('b1', 15, 0.1, 'cm')],
        explanation: '1.5 N は 0.1 N の 15 倍なので、伸びも 1 cm の 15 倍で 15 cm です。グラフにない大きさでも、比例を使えば計算できます。',
        hint: '1.5 N は 0.1 N の何倍か考えよう。',
      }),
      fill({
        id: 'force-3-p3', concept: 'fo-hooke',
        prompt: '空らんに入る数を入れよう。',
        text: '0.1 N で 1 cm 伸びるばねを 5.0 cm 伸ばすには、[b1]の力で引けばよい。',
        blanks: [number('b1', 0.5, 0.01, 'N')],
        explanation: '5.0 cm は 1 cm の 5 倍なので、力も 0.1 N の 5 倍で 0.5 N です。伸びから力を求めるときも、比例を使います。',
        hint: '1 cm 伸ばす力が 0.1 N。5 cm ならその何倍かな。',
      }),
      figureChoice({
        id: 'force-3-p4', concept: 'fo-hooke',
        prompt: 'アは原点を通る直線、イは原点を通らない直線、ウは曲線のグラフです。ばねを引く力の大きさ（横軸）と、ばねの伸び（縦軸）の関係を表すグラフはどれ？',
        // 3 つの小さなグラフ。原点はそれぞれ (ox, 170)
        figure: scene([
          { type: 'text', x: 10, y: 28, text: '横軸: 力の大きさ　縦軸: ばねの伸び', size: 13 },
          ...[20, 120, 220].flatMap(ox => [
            { type: 'line', points: [[ox, 170], [ox + 88, 170]], width: 2, arrow: true },
            { type: 'line', points: [[ox, 170], [ox, 48]], width: 2, arrow: true },
          ]),
          { type: 'line', points: [[20, 170], [100, 70]], color: 'blue', width: 3 },
          { type: 'line', points: [[120, 125], [200, 70]], color: 'blue', width: 3 },
          { type: 'line', points: [[220, 170], [240, 125], [260, 100], [280, 88], [300, 82]], color: 'blue', width: 3 },
          { type: 'region', id: 'r1', x: 64, y: 210, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 164, y: 210, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 210, r: 24, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: 'ばねの伸びは力の大きさに比例するので、グラフは原点を通る直線のアになります。力が 0 のとき伸びも 0 です。イのように原点を通らないのは、縦軸を「ばね全体の長さ」にしたときのグラフです。',
        hint: '力が 0 のとき、ばねの伸びはいくつか考えよう。',
      }),
      drag({
        id: 'force-3-p5', concept: 'fo-hooke',
        prompt: '何もつるさないとき、ばねの下のはしは目盛り 0 にありました。おもり 1 個をつるすと 2 cm 伸びて、目盛り 2 まで下がりました（図）。同じおもりを 3 個にすると、下のはしはどこまで下がる？ 青い目印を上下に動かして置こう。',
        // ものさし: 目盛り 0 が y=80、1 cm ＝ 20px。3 個 → 6 cm → y=200。不正解例は 3 cm（y=140）
        figure: scene([
          ceiling(60, 120),
          spring(120, 18, 120),
          { type: 'rect', x: 102, y: 120, width: 36, height: 26, fill: 'gray', label: '1個' },
          { type: 'line', points: [[100, 80], [200, 80]], color: 'gray', width: 1, dashed: true },
          { type: 'line', points: [[140, 120], [200, 120]], color: 'gray', width: 1, dashed: true },
          { type: 'rect', x: 200, y: 66, width: 26, height: 168, fill: 'white' },
          ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap(i => [
            { type: 'line', points: [[200, 80 + 20 * i], [212, 80 + 20 * i]], width: 2 },
            { type: 'text', x: 232, y: 85 + 20 * i, text: String(i), size: 12 },
          ]),
          { type: 'text', x: 196, y: 58, text: '目盛り〔cm〕', size: 12 },
          { type: 'circle', id: 'mark', x: 270, y: 80, r: 10, fill: 'blue', stroke: 'blue' },
        ]),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: 270, y: 200 },
        samples: { correct: { x: 270, y: 200 }, wrong: { x: 270, y: 140 } },
        explanation: 'おもり 1 個で 2 cm 伸びるので、3 個では 3 倍の 6 cm 伸びます。下のはしは目盛り 6 まで下がります。伸びはおもりの数（力の大きさ）に比例します。',
        hint: '1 個で 2 cm。3 個なら伸びは何 cm になるか先に計算しよう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'force-3-r1', concept: 'fo-hooke',
        prompt: '空らんに入る数を入れよう。',
        text: '0.2 N で 3 cm 伸びるばねを、0.6 N の力で引くと、伸びは[b1]になる。',
        blanks: [number('b1', 9, 0.1, 'cm')],
        explanation: '0.6 N は 0.2 N の 3 倍なので、伸びも 3 cm の 3 倍で 9 cm です。',
        hint: '0.6 N は 0.2 N の何倍か考えよう。',
      }),
      choice({
        id: 'force-3-r2', concept: 'fo-hooke',
        prompt: '何もつるさないときの長さが 10 cm のばねに、おもりをつるすと、ばね全体の長さが 14 cm になりました。ばねの伸びは何 cm？',
        options: ['4 cm', '14 cm', '24 cm'],
        answer: 'a',
        explanation: 'ばねの伸びは、もとの長さから伸びた分なので、14 − 10 ＝ 4 cm です。ばね全体の長さと伸びを区別することが大切です。',
        hint: 'もとの長さから、どれだけ長くなったかを考えよう。',
      }),
      choice({
        id: 'force-3-t2', concept: 'fo-hooke', term: true,
        prompt: '次の説明に合う言葉はどれ？「ばねの伸びは、ばねを引く力の大きさに比例する」',
        options: ['フックの法則', '反射の法則', '力の 3 要素'],
        answer: 'a',
        explanation: 'ばねの伸びが力の大きさに比例する関係を**フックの法則**といいます。ばねばかりは、このきまりを使って力をはかる道具です。',
        hint: 'ばねのきまりを見つけた人の名前がついた法則だよ。',
      }),
    ],
  };

  // ---- ステージ force-4: 2 力のつり合い・質量と重さ ----
  const force4 = {
    id: 'force-4', areaId: 'spring', title: '2力のつり合い・質量と重さ', minutes: 5, concepts: ['fo-balance', 'fo-mass'],
    lessons: [
      {
        id: 'force-4-c1',
        anim: 'fo-balance',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '1 つの物体に 2 つの力がはたらいていて、物体が動かないとき、2 力は**つり合っている**といいます。2 力がつり合う条件は、大きさが等しい、向きが反対、同じ**一直線上**にある、の 3 つです。',
        // 箱を左右から 3 N ずつ引く
        figure: scene([
          { type: 'line', points: [[30, 120], [290, 120]], color: 'gray', width: 1, dashed: true },
          { type: 'rect', x: 130, y: 100, width: 60, height: 40, fill: 'sand', label: '箱' },
          ...force(130, 120, 60, 120, '3 N'),
          ...force(190, 120, 260, 120, '3 N'),
          { type: 'text', x: 160, y: 190, text: '大きさが等しい・向きが反対', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 214, text: '一直線上にある', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'force-4-c2',
        text: '机の上で本が止まっているのは、本にはたらく**重力**と、机が本を押し返す**垂直抗力**がつり合っているからです。2 つの力は同じ大きさで、向きが反対で、一直線上にあります。',
        // 重力（中心から下・青）と垂直抗力（ふれている面から上・緑）を同じ縦の線の上に、同じ長さでかく
        figure: scene([
          ...desk(160),
          { type: 'rect', x: 120, y: 110, width: 80, height: 50, fill: 'lightgreen' },
          { type: 'text', x: 126, y: 141, text: '本', size: 14 },
          { type: 'arrow', x1: 160, y1: 160, x2: 160, y2: 90, color: 'green' },
          { type: 'circle', x: 160, y: 160, r: 5, fill: 'green', stroke: 'green' },
          { type: 'arrow', x1: 160, y1: 135, x2: 160, y2: 205, color: 'blue' },
          { type: 'circle', x: 160, y: 135, r: 5, fill: 'blue', stroke: 'blue' },
          { type: 'text', x: 150, y: 206, text: '重力', size: 14, anchor: 'end' },
          { type: 'text', x: 170, y: 96, text: '垂直抗力', size: 14 },
        ]),
      },
      {
        id: 'force-4-c3',
        text: '**質量**は物体そのものの量で、単位は g や kg です。場所が変わっても変わりません。**重さ**は物体にはたらく重力の大きさで、単位は N です。月の重力は地球の約 6 分の 1 なので、重さも約 6 分の 1 になります。',
        // 同じ物体を地球と月で比べる
        figure: scene([
          { type: 'circle', x: 80, y: 66, r: 34, fill: 'sky', label: '地球' },
          { type: 'circle', x: 240, y: 66, r: 22, fill: 'rock', label: '月' },
          { type: 'text', x: 80, y: 136, text: '質量 600 g', size: 14, anchor: 'middle' },
          { type: 'text', x: 80, y: 160, text: '重さ 約 6 N', size: 14, anchor: 'middle' },
          { type: 'text', x: 240, y: 136, text: '質量 600 g', size: 14, anchor: 'middle' },
          { type: 'text', x: 240, y: 160, text: '重さ 約 1 N', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 214, text: '質量は同じ・重さは約 6 分の 1', size: 14, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'force-4-w1', concept: 'fo-balance',
      prompt: '予想しよう。つな引きで、両チームが同じ大きさの力で、反対向きにつなを引き合っています。つなはどうなると思う？',
      options: ['動かない', '右へ動く', '左へ動く'],
      answer: 'a',
      explanation: '同じ大きさの力で反対向きに引き合うと、つなは動きません。2 つの力が「つり合う」とはどういうことか、このステージで調べよう。',
      hint: 'どちらのチームも同じ強さで引いているね。',
    }),
    problems: [
      figureChoice({
        id: 'force-4-p1', concept: 'fo-balance',
        prompt: '箱の左右に力がはたらいています。アは同じ長さの矢印が反対向きで、一直線上にない。イは同じ長さの矢印が反対向きで、一直線上にある。ウは反対向きで一直線上にあるが、長さがちがう。2 力がつり合っているのはどれ？',
        // 各段の箱の中心は (150, y)。ア: 上下に 12 ずらす、イ: 同じ線上 50px ずつ、ウ: 50px と 25px
        figure: scene([
          { type: 'rect', x: 125, y: 30, width: 50, height: 32, fill: 'sand' },
          ...force(125, 34, 75, 34),
          ...force(175, 58, 225, 58),
          { type: 'rect', x: 125, y: 99, width: 50, height: 32, fill: 'sand' },
          ...force(125, 115, 75, 115),
          ...force(175, 115, 225, 115),
          { type: 'rect', x: 125, y: 169, width: 50, height: 32, fill: 'sand' },
          ...force(125, 185, 75, 185),
          ...force(175, 185, 200, 185),
          { type: 'region', id: 'r1', x: 280, y: 46, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 280, y: 115, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 280, y: 185, r: 24, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '2 力がつり合うには、大きさが等しい・向きが反対・一直線上にある、の 3 つがすべてそろう必要があります。そろっているのはイです。アは一直線上にないので箱が回り、ウは大きさがちがうので箱が動きます。',
        hint: 'つり合う 3 つの条件を、ア〜ウそれぞれで確かめよう。',
      }),
      fill({
        id: 'force-4-t1', concept: 'fo-mass', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物体そのものの量を[b1]といい、単位は g や kg である。物体にはたらく重力の大きさを[b2]といい、単位は N である。',
        blanks: [
          word('b1', ['質量', '重さ', '体積'], '質量'),
          word('b2', ['質量', '重さ', '体積'], '重さ'),
        ],
        explanation: '物体そのものの量が**質量**（g・kg）、物体にはたらく重力の大きさが**重さ**（N）です。ふだんは同じように使う言葉ですが、理科では区別します。',
        hint: '単位が N なのは、力の大きさのほうだよ。',
      }),
      fill({
        id: 'force-4-p2', concept: 'fo-balance',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '2 力がつり合うとき、2 力の大きさは[b1]、向きは[b2]で、同じ一直線上にある。',
        blanks: [
          word('b1', ['等しく', '2 倍で', 'ばらばらで'], '等しく'),
          word('b2', ['反対', '同じ', '直角'], '反対'),
        ],
        explanation: 'つり合う 2 力は、大きさが等しく、向きが反対で、一直線上にあります。3 つのうち 1 つでも欠けると、物体は動いたり回ったりします。',
        hint: 'つな引きで、つなが動かないときを思い出そう。',
      }),
      choice({
        id: 'force-4-p3', concept: 'fo-balance',
        prompt: '机の上で止まっている本があります。本にはたらく重力とつり合っている力はどれ？',
        options: ['机が本を押し返す力（垂直抗力）', '本が机を押す力', '本と机のあいだの摩擦力'],
        answer: 'a',
        explanation: 'つり合う 2 力は、同じ 1 つの物体（ここでは本）にはたらく力です。本にはたらく上向きの力は、机が本を押し返す垂直抗力です。本が机を押す力は机にはたらく力なので、つり合いの相手にはなりません。',
        hint: '「本に」はたらいている上向きの力をさがそう。',
      }),
      fill({
        id: 'force-4-p4', concept: 'fo-mass',
        prompt: '空らんに入る数を入れよう。（月の重力は地球の約 6 分の 1 とする）',
        text: '地球で重さが 3 N の物体を月に持っていくと、月での重さは約[b1]になる。',
        blanks: [number('b1', 0.5, 0.01, 'N')],
        explanation: '月では重力が地球の約 6 分の 1 なので、重さも 3 N の 6 分の 1 で約 0.5 N です。ただし、質量は地球でも月でも同じです。',
        hint: '3 N を 6 でわろう。',
      }),
      choice({
        id: 'force-4-p5', concept: 'fo-mass',
        prompt: '地球で質量 600 g の物体を月に持っていきました。月での質量はどうなる？',
        options: ['600 g のまま', '約 100 g になる', '0 g になる'],
        answer: 'a',
        explanation: '質量は物体そのものの量なので、場所が変わっても 600 g のままです。月で約 6 分の 1 になるのは、重力の大きさである重さのほうです。',
        hint: '物体そのものの量は、月へ行くと減るかな。',
      }),
    ],
    retryPool: [
      fill({
        id: 'force-4-r1', concept: 'fo-balance',
        prompt: '空らんに入る数を入れよう。',
        text: '物体を左右から 2 つのばねばかりで引いたら、物体は動かなかった。右のばねばかりが 3 N を示していたので、左のばねばかりは[b1]を示している。',
        blanks: [number('b1', 3, 0, 'N')],
        explanation: '物体が動かないので、2 力はつり合っています。つり合う 2 力の大きさは等しいので、左も 3 N です。',
        hint: 'つり合う 2 力の大きさはどんな関係だったかな。',
      }),
      choice({
        id: 'force-4-r2', concept: 'fo-balance',
        prompt: '天井から糸でつるしたおもりが止まっています。おもりにはたらく重力とつり合っている力はどれ？',
        options: ['糸がおもりを引く力', 'おもりが糸を引く力', '天井が糸を押す力'],
        answer: 'a',
        explanation: 'おもりにはたらく下向きの重力とつり合うのは、同じおもりにはたらく上向きの力、つまり糸がおもりを引く力です。2 つの力は同じ大きさで、一直線上にあります。',
        hint: '「おもりに」はたらいている上向きの力をさがそう。',
      }),
      choice({
        id: 'force-4-r3', concept: 'fo-mass',
        prompt: '上皿てんびんではかることができるのはどれ？',
        options: ['物体の質量', '物体の重さ（重力の大きさ）', '物体の体積'],
        answer: 'a',
        explanation: '上皿てんびんは、分銅とつり合わせて質量をはかる道具です。重さ（重力の大きさ）は、ばねばかりで N の単位ではかります。',
        hint: '上皿てんびんは、分銅（g）とつり合わせてはかるね。',
      }),
      fill({
        id: 'force-4-r4', concept: 'fo-mass',
        prompt: '空らんに入る数を入れよう。（月の重力は地球の約 6 分の 1 とする）',
        text: 'ある物体の月での重さは約 1 N だった。この物体の地球での重さは約[b1]である。',
        blanks: [number('b1', 6, 0, 'N')],
        explanation: '月での重さは地球の約 6 分の 1 なので、地球ではその 6 倍の約 6 N です。',
        hint: '月の重さを 6 倍すると、地球での重さになるよ。',
      }),
      choice({
        id: 'force-4-t2', concept: 'fo-balance', term: true,
        prompt: '1 つの物体に 2 つの力がはたらいていて、物体が動かないとき、2 力はどうなっているという？',
        options: ['つり合っている', '比例している', '反射している'],
        answer: 'a',
        explanation: '1 つの物体にはたらく 2 力で物体が動かないとき、2 力は**つり合っている**といいます。大きさが等しく、向きが反対で、一直線上にあることが条件です。',
        hint: '天びんが水平で止まるようすを表す言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'fo-effect', title: '力のはたらき', basic: null, lessonStageId: 'force-1',
      checkPool: [
        choice({
          id: 'fo-effect-k1', concept: 'fo-effect',
          prompt: '粘土を手で押して、平たくつぶしました。これは力のどのはたらき？',
          options: ['物体の形を変える', '物体の運動のようすを変える', '物体を支える'],
          answer: 'a',
          explanation: '粘土の形が変わったので、形を変えるはたらきです。',
          hint: '力を加えたあと、粘土の何が変わったかな。',
        }),
        choice({
          id: 'fo-effect-k2', concept: 'fo-effect',
          prompt: '転がっているボールを横から軽くけると、進む向きが変わりました。これは力のどのはたらき？',
          options: ['物体の形を変える', '物体の運動のようすを変える', '物体を支える'],
          answer: 'b',
          explanation: '進む向きが変わったので、運動のようすを変えるはたらきです。速さが変わるときも同じはたらきです。',
          hint: 'ボールの動きがどう変わったかに注目しよう。',
        }),
        fill({
          id: 'fo-effect-k3', concept: 'fo-effect',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '力のはたらきは、物体の形を変える、物体の運動のようすを変える、物体を[b1]の 3 つである。',
          blanks: [word('b1', ['支える', '温める', '光らせる'], '支える')],
          explanation: '力のはたらきは、形を変える・運動のようすを変える・支えるの 3 つです。棚が花びんを支えるのも、力のはたらきです。',
          hint: '荷物を手で持っているときの力のはたらきだよ。',
        }),
      ],
    },
    {
      id: 'fo-kinds', title: '力の種類', basic: 'fo-effect', lessonStageId: 'force-1',
      checkPool: [
        choice({
          id: 'fo-kinds-k1', concept: 'fo-kinds',
          prompt: '重力は、どの向きにはたらく力？',
          options: ['地球の中心に向かう向き（下向き）', '上向き', '物体の動く向き'],
          answer: 'a',
          explanation: '重力は、地球が物体を地球の中心に向かって引く力です。だから、物体を手からはなすと下に落ちます。',
          hint: '手からはなしたボールは、どちらへ動くかな。',
        }),
        choice({
          id: 'fo-kinds-k2', concept: 'fo-kinds',
          prompt: '引きのばしたゴムが、もとに戻ろうとしてはたらく力を何という？',
          options: ['弾性力', '垂直抗力', '摩擦力'],
          answer: 'a',
          explanation: '変形した物体がもとに戻ろうとする力を弾性力といいます。ばねやゴムで見られます。',
          hint: 'ばねやゴムの「はずむ」性質に関係する力だよ。',
        }),
        fill({
          id: 'fo-kinds-k3', concept: 'fo-kinds',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '物体を床の上ですべらせるとき、ふれている面から、動きをさまたげる向きにはたらく力を[b1]という。',
          blanks: [word('b1', ['摩擦力', '重力', '磁力'], '摩擦力')],
          explanation: '動きをさまたげる向きにはたらく力が摩擦力です。物体がふれ合っている面ではたらきます。',
          hint: 'すべらせた物体がやがて止まるのは、この力のためだよ。',
        }),
      ],
    },
    {
      id: 'fo-arrow', title: '力の矢印と3要素', basic: 'fo-effect', lessonStageId: 'force-2',
      checkPool: [
        choice({
          id: 'fo-arrow-k1', concept: 'fo-arrow',
          prompt: '力を矢印で表すとき、矢印の始まりの点は何を表す？',
          options: ['作用点', '力の大きさ', '力がはたらく時間'],
          answer: 'a',
          explanation: '矢印の始まりは作用点、矢印の向きは力の向き、矢印の長さは力の大きさを表します。',
          hint: '力の 3 要素のうち、「点」を表すものはどれかな。',
        }),
        fill({
          id: 'fo-arrow-k2', concept: 'fo-arrow',
          prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
          text: '200 g の物体にはたらく重力の大きさは[b1]である。',
          blanks: [number('b1', 2, 0, 'N')],
          explanation: '100 g で 1 N なので、200 g ではその 2 倍の 2 N です。',
          hint: '200 g は 100 g の何倍かな。',
        }),
        choice({
          id: 'fo-arrow-k3', concept: 'fo-arrow',
          prompt: '1 N の力を 1 cm の矢印で表すことにしました。3 N の力は何 cm の矢印で表す？',
          options: ['1 cm', '3 cm', '6 cm'],
          answer: 'b',
          explanation: '矢印の長さは力の大きさに比例させるので、3 N は 1 cm の 3 倍の 3 cm です。',
          hint: '3 N は 1 N の何倍か考えよう。',
        }),
      ],
    },
    {
      id: 'fo-hooke', title: 'フックの法則', basic: 'fo-arrow', lessonStageId: 'force-3',
      checkPool: [
        fill({
          id: 'fo-hooke-k1', concept: 'fo-hooke',
          prompt: '空らんに入る数を入れよう。',
          text: '0.1 N で 2 cm 伸びるばねを、0.3 N の力で引くと、伸びは[b1]になる。',
          blanks: [number('b1', 6, 0.1, 'cm')],
          explanation: '0.3 N は 0.1 N の 3 倍なので、伸びも 2 cm の 3 倍で 6 cm です。',
          hint: '0.3 N は 0.1 N の何倍かな。',
        }),
        choice({
          id: 'fo-hooke-k2', concept: 'fo-hooke',
          prompt: 'ばねを引く力の大きさを横軸、ばねの伸びを縦軸にしたグラフは、どんな形になる？',
          options: ['原点を通る直線', '原点を通らない直線', 'だんだん平らになる曲線'],
          answer: 'a',
          explanation: 'ばねの伸びは力の大きさに比例するので、原点を通る直線になります。力が 0 なら伸びも 0 です。',
          hint: '比例のグラフの形を思い出そう。',
        }),
        fill({
          id: 'fo-hooke-k3', concept: 'fo-hooke',
          prompt: '空らんに入る数を入れよう。',
          text: '0.5 N で 4 cm 伸びるばねを 2 cm 伸ばすには、[b1]の力で引けばよい。',
          blanks: [number('b1', 0.25, 0.01, 'N')],
          explanation: '2 cm は 4 cm の半分なので、力も 0.5 N の半分で 0.25 N です。',
          hint: '2 cm は 4 cm の何分の 1 かな。',
        }),
      ],
    },
    {
      id: 'fo-balance', title: '2力のつり合い', basic: 'fo-arrow', lessonStageId: 'force-4',
      checkPool: [
        choice({
          id: 'fo-balance-k1', concept: 'fo-balance',
          prompt: '2 力がつり合う条件として、正しい組み合わせはどれ？',
          options: ['大きさが等しい・向きが反対・一直線上にある', '大きさが等しい・向きが同じ・一直線上にある', '大きさがちがう・向きが反対・一直線上にない'],
          answer: 'a',
          explanation: '2 力がつり合う条件は、大きさが等しい、向きが反対、一直線上にある、の 3 つです。',
          hint: 'つな引きでつなが動かないときを思い出そう。',
        }),
        fill({
          id: 'fo-balance-k2', concept: 'fo-balance',
          prompt: '空らんに入る数を入れよう。',
          text: '物体を右向きに 5 N の力で引いている。この物体が動かないようにするには、左向きに[b1]の力で引けばよい（2 力は一直線上にあるとする）。',
          blanks: [number('b1', 5, 0, 'N')],
          explanation: 'つり合う 2 力は大きさが等しく向きが反対なので、左向きに 5 N で引けばつり合います。',
          hint: 'つり合う 2 力の大きさは、等しいかな、ちがうかな。',
        }),
        choice({
          id: 'fo-balance-k3', concept: 'fo-balance',
          prompt: '床の上で止まっている箱にはたらく重力とつり合っている力はどれ？',
          options: ['床が箱を押し返す力（垂直抗力）', '箱が床を押す力', '箱を押す人の力'],
          answer: 'a',
          explanation: '箱にはたらく下向きの重力とつり合うのは、同じ箱にはたらく上向きの垂直抗力です。',
          hint: '「箱に」はたらいている上向きの力をさがそう。',
        }),
      ],
    },
    {
      id: 'fo-mass', title: '質量と重さ', basic: 'fo-kinds', lessonStageId: 'force-4',
      checkPool: [
        choice({
          id: 'fo-mass-k1', concept: 'fo-mass',
          prompt: 'ばねばかりではかって、単位 N で表す量はどれ？',
          options: ['重さ（重力の大きさ）', '質量', '体積'],
          answer: 'a',
          explanation: 'ばねばかりは、物体にはたらく重力の大きさ、つまり重さを N の単位ではかります。質量は上皿てんびんで g の単位ではかります。',
          hint: 'N は力の大きさの単位だったね。',
        }),
        choice({
          id: 'fo-mass-k2', concept: 'fo-mass',
          prompt: '物体を地球から月に持っていったとき、変わらないのはどれ？',
          options: ['質量', '重さ', '質量も重さも変わる'],
          answer: 'a',
          explanation: '質量は物体そのものの量なので、場所が変わっても変わりません。重さは月では約 6 分の 1 になります。',
          hint: '物体そのものの量はどちらかな。',
        }),
        fill({
          id: 'fo-mass-k3', concept: 'fo-mass',
          prompt: '空らんに入る数を入れよう。（月の重力は地球の約 6 分の 1 とする）',
          text: '地球で重さが 6 N の物体は、月では重さが約[b1]になる。',
          blanks: [number('b1', 1, 0, 'N')],
          explanation: '月の重力は地球の約 6 分の 1 なので、6 N の 6 分の 1 で約 1 N です。',
          hint: '6 N を 6 でわろう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'force',
    title: '力のはたらき',
    mascot: 'E',   // 担当の先生（キューブ先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'what', title: '力とは', order: 1, stages: [force1, force2] },
      { id: 'spring', title: '力の大きさ', order: 2, stages: [force3, force4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
