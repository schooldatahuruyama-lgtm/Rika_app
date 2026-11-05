// 「運動とエネルギー」教材データ（中学3年 理科・物理）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」）。
// 2 領域 × 2 ステージ（力と運動、運動とエネルギー）と、概念 6 つ。
// 図（scene）の item は js/figures.js の汎用の部品（docs/figures-guide.md）で描く。座標は x 右向き・y 下向き、場面は 320×240。
// 図の約束: 力の矢印は青、合力・分力は緑。
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

  // ---- 運動とエネルギーの単元の図の道具 ----

  // 小さな文字（size 既定 13）
  function note(x, y, text, size, anchor) {
    const t = { type: 'text', x, y, text, size: size || 13 };
    if (anchor) t.anchor = anchor;
    return t;
  }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/motion/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/motion/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 記録タイマーの紙テープ（x 20 から幅 width、中心の高さ y）と打点（xs の位置）
  function tape(y, xs, width) {
    return [{ type: 'rect', x: 20, y: y - 12, width: width || 280, height: 24, fill: 'white', stroke: 'line' }]
      .concat(xs.map(x => ({ type: 'circle', x, y, r: 3, fill: 'ink', stroke: 'ink' })));
  }

  // 差の列から打点の位置を作る（最初の点は x0）
  function dots(x0, diffs) {
    const xs = [x0];
    diffs.forEach(d => xs.push(xs[xs.length - 1] + d));
    return xs;
  }

  // 小さなグラフの軸（原点 (ox, 170)、横 88px・縦 122px）
  function miniAxes(ox) {
    return [
      { type: 'line', points: [[ox, 170], [ox + 88, 170]], width: 2, arrow: true },
      { type: 'line', points: [[ox, 170], [ox, 48]], width: 2, arrow: true },
    ];
  }

  // 動滑車の図（天井、滑車、ひも、ひもを引く手、つるしたおもり）。weightLabel はおもりの文字
  function pulley(weightLabel) {
    return [
      { type: 'rect', x: 40, y: 10, width: 240, height: 8, fill: 'gray', stroke: 'line' },
      { type: 'circle', x: 160, y: 120, r: 22, fill: 'white', stroke: 'ink' },
      // ひも: 天井 → 滑車の左 → 滑車の下を回る → 滑車の右 → 手
      { type: 'line', points: [[138, 18], [138, 120], [141, 131], [149, 139], [160, 142], [171, 139], [179, 131], [182, 120], [182, 54]], color: 'brown', width: 2 },
      { type: 'ellipse', x: 182, y: 44, rx: 10, ry: 12, fill: 'pink' },
      { type: 'circle', x: 160, y: 120, r: 4, fill: 'ink', stroke: 'ink' },
      { type: 'line', points: [[160, 120], [160, 160]], width: 2 },
      { type: 'rect', x: 132, y: 160, width: 56, height: 36, fill: 'gray', label: weightLabel },
      note(210, 126, '動滑車', 14),
    ];
  }

  // ふりこ（支点 (160,20)、糸の長さ 150）。角度 deg（度、0 が真下）のおもりの位置
  function bob(deg) {
    const t = deg * Math.PI / 180;
    return [Math.round((160 + 150 * Math.sin(t)) * 10) / 10, Math.round((20 + 150 * Math.cos(t)) * 10) / 10];
  }

  // ふりこの道すじ（-50°〜50° の点線）と支点
  function swingPath() {
    const pts = [];
    for (let d = -50; d <= 50; d += 10) pts.push(bob(d));
    return [
      { type: 'rect', x: 120, y: 10, width: 80, height: 8, fill: 'gray', stroke: 'line' },
      { type: 'line', points: pts, color: 'gray', width: 2, dashed: true },
    ];
  }

  // ================================================================
  // 領域 1: 力と運動
  // ================================================================

  // ---- ステージ motion-1: 力の合成・分解と水圧・浮力 ----
  const motion1 = {
    id: 'motion-1', areaId: 'mo-force', title: '力の合成・分解と水圧・浮力', minutes: 5, concepts: ['mo-compose', 'mo-buoyancy'],
    lessons: [
      {
        id: 'motion-1-c1',
        text: '2 つの力と同じはたらきをする 1 つの力を**合力**といい、合力を求めることを**力の合成**といいます。一直線上で同じ向きの 2 力の合力は 2 力の和、反対向きの 2 力の合力は 2 力の差で、大きいほうの力の向きになります。',
        // 上: 同じ向きの 3 N と 2 N（1 N ＝ 24px）→ 合力 5 N。下: 反対向きの 3 N と 2 N → 合力 1 N
        figure: scene([
          note(10, 24, '同じ向き', 14),
          { type: 'arrow', x1: 40, y1: 52, x2: 112, y2: 52, color: 'blue', label: '3 N' },
          { type: 'arrow', x1: 112, y1: 52, x2: 160, y2: 52, color: 'blue', label: '2 N' },
          { type: 'arrow', x1: 40, y1: 92, x2: 160, y2: 92, color: 'green', label: '合力 5 N' },
          note(200, 98, '3 ＋ 2 ＝ 5', 14),
          note(10, 136, '反対向き', 14),
          { type: 'circle', x: 130, y: 166, r: 5, fill: 'blue', stroke: 'blue' },
          { type: 'arrow', x1: 130, y1: 166, x2: 202, y2: 166, color: 'blue', label: '3 N' },
          { type: 'arrow', x1: 130, y1: 166, x2: 82, y2: 166, color: 'blue', label: '2 N' },
          { type: 'arrow', x1: 130, y1: 206, x2: 154, y2: 206, color: 'green' },
          note(124, 212, '合力 1 N', 14, 'end'),
          note(220, 212, '3 − 2 ＝ 1', 14),
        ]),
      },
      {
        id: 'motion-1-c2',
        anim: 'mo-resultant',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '向きのちがう 2 力の合力は、2 力を 2 辺とする**平行四辺形**の対角線で表されます。2 力のあいだの角度が大きいほど、合力は小さくなります。',
        // 点 O(60,190) に力 A（右向き）と力 B（右上向き）。点線で平行四辺形をつくり、対角線が合力（緑）
        figure: scene([
          note(20, 30, '平行四辺形の対角線が合力', 14),
          { type: 'line', points: [[220, 190], [260, 70]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[100, 70], [260, 70]], color: 'gray', width: 2, dashed: true },
          { type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 190, color: 'blue' },
          { type: 'arrow', x1: 60, y1: 190, x2: 100, y2: 70, color: 'blue' },
          { type: 'arrow', x1: 60, y1: 190, x2: 260, y2: 70, color: 'green' },
          { type: 'circle', x: 60, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
          note(52, 210, 'O', 14, 'end'),
          note(140, 214, '力 A', 14, 'middle'),
          note(74, 124, '力 B', 14, 'end'),
          note(196, 92, '合力', 14, 'end'),
        ]),
      },
      {
        id: 'motion-1-c3',
        anim: 'mo-slope-split',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '1 つの力を、同じはたらきをする 2 つの力に分けることを**力の分解**、分けた力を**分力**といいます。斜面上の物体にはたらく重力は、斜面に平行な分力と斜面に垂直な分力に分解できます。斜面に平行な分力が、物体を斜面に沿って下へ動かそうとします。',
        // 斜面（傾き約 27°）上の木片。重力（青、中心から真下 80px）を、斜面に平行な分力と垂直な分力（緑）に分解
        figure: scene([
          { type: 'polygon', points: [[20, 210], [300, 210], [300, 70]], fill: 'sand', stroke: 'line' },
          { type: 'polygon', points: [[120, 160], [164.7, 137.6], [142.4, 92.9], [97.6, 115.3]], fill: 'brown', stroke: 'ink' },
          { type: 'line', points: [[99, 143], [131, 207]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[163, 191], [131, 207]], color: 'gray', width: 2, dashed: true },
          { type: 'arrow', x1: 131, y1: 127, x2: 131, y2: 207, color: 'blue' },
          { type: 'arrow', x1: 131, y1: 127, x2: 99, y2: 143, color: 'green' },
          { type: 'arrow', x1: 131, y1: 127, x2: 163, y2: 191, color: 'green' },
          { type: 'circle', x: 131, y: 127, r: 4, fill: 'blue', stroke: 'blue' },
          note(131, 230, '重力', 14, 'middle'),
          note(92, 150, '平行な分力', 13, 'end'),
          note(172, 200, '垂直な分力', 13),
        ]),
      },
      {
        id: 'motion-1-c4',
        anim: 'mo-buoyancy',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '水の重さによって生じる圧力を**水圧**といいます。水圧はあらゆる向きからはたらき、深いほど大きくなります。そのため、水中の物体には上向きの**浮力**がはたらきます。浮力の大きさは「空気中での重さ − 水中での重さ」で求められます。',
        // 水中の物体に四方から水圧（下の面ほど長い矢印）。右はばねばかりの読みの例
        figure: scene([
          { type: 'beaker', x: 100, y: 214, width: 140, height: 160, level: 0.8 },
          { type: 'rect', x: 70, y: 124, width: 60, height: 44, fill: 'gray' },
          { type: 'arrow', x1: 100, y1: 104, x2: 100, y2: 122, color: 'blue' },
          { type: 'arrow', x1: 100, y1: 202, x2: 100, y2: 170, color: 'blue' },
          { type: 'arrow', x1: 46, y1: 146, x2: 68, y2: 146, color: 'blue' },
          { type: 'arrow', x1: 154, y1: 146, x2: 132, y2: 146, color: 'blue' },
          note(186, 70, '空気中: 3.0 N', 14),
          note(186, 98, '水中: 2.2 N', 14),
          note(186, 140, '浮力 ＝', 14),
          note(186, 164, '3.0 N − 2.2 N', 14),
          note(186, 210, '下の面ほど水圧が大きい', 12),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-1-w1', concept: 'mo-compose',
      prompt: '予想しよう。1 つの箱を、2 人が同じ向きに 3 N と 2 N の力で押しています。1 人で同じはたらきをさせるには、何 N の力で押せばよいと思う？',
      options: ['5 N', '1 N', '3 N'],
      answer: 'a',
      explanation: '同じ向きの 2 つの力は、合わせて 3 ＋ 2 ＝ 5 N の 1 つの力と同じはたらきをします。2 つの力を 1 つにまとめる考え方を、このステージで学ぼう。',
      hint: '2 人の力が同じ向きに合わさると考えよう。',
    }),
    problems: [
      fill({
        id: 'motion-1-p1', concept: 'mo-compose',
        prompt: '空らんに入る数と言葉を入れよう。',
        text: '一直線上で、物体を右向きに 5 N、左向きに 3 N の力で引いた。2 力の合力は[b1]で、向きは[b2]である。',
        blanks: [
          number('b1', 2, 0, 'N'),
          word('b2', ['右向き', '左向き', '決まらない'], '右向き'),
        ],
        explanation: '反対向きの 2 力の合力は、大きいほうから小さいほうを引いた 5 − 3 ＝ 2 N です。向きは、大きいほうの力（右向き）と同じになります。',
        hint: '反対向きのときは、2 力の差を考えよう。',
      }),
      fill({
        id: 'motion-1-t1', concept: 'mo-compose', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '2 つの力と同じはたらきをする 1 つの力を[b1]という。1 つの力を、同じはたらきをする 2 つの力に分けたとき、その 2 つの力を[b2]という。',
        blanks: [
          word('b1', ['合力', '分力', '浮力'], '合力'),
          word('b2', ['合力', '分力', '浮力'], '分力'),
        ],
        explanation: '2 力を合わせた 1 つの力が**合力**、1 つの力を分けた力が**分力**です。合力を求めることを力の合成、分力を求めることを力の分解といいます。',
        hint: '「合わせる」と「分ける」で、言葉を選ぼう。',
      }),
      figureChoice({
        id: 'motion-1-p2', concept: 'mo-compose',
        prompt: 'ア〜ウは、同じ 2 つの力（青）の合力をかこうとした図です。緑の矢印が、かいた合力です。アは 2 力の矢印の先どうしを結んだ矢印、イは 2 力を 2 辺とする平行四辺形の対角線、ウは 2 力の矢印の先を結んだ線のまん中までの矢印です。合力を正しくかいているのはどれ？',
        // 各図の作用点は (ox,160)。力 1 は右へ 60px、力 2 は右上へ (20,−60)。正しい合力の先は (ox+80,100)
        figure: scene([
          note(10, 30, '青: 2 つの力　緑: かいた合力', 13),
          // ア（ox 20）: 矢印の先どうしを結ぶ
          { type: 'arrow', x1: 20, y1: 160, x2: 80, y2: 160, color: 'blue' },
          { type: 'arrow', x1: 20, y1: 160, x2: 40, y2: 100, color: 'blue' },
          { type: 'arrow', x1: 80, y1: 160, x2: 40, y2: 100, color: 'green' },
          // イ（ox 125）: 平行四辺形の対角線
          { type: 'line', points: [[185, 160], [205, 100]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[145, 100], [205, 100]], color: 'gray', width: 2, dashed: true },
          { type: 'arrow', x1: 125, y1: 160, x2: 185, y2: 160, color: 'blue' },
          { type: 'arrow', x1: 125, y1: 160, x2: 145, y2: 100, color: 'blue' },
          { type: 'arrow', x1: 125, y1: 160, x2: 205, y2: 100, color: 'green' },
          // ウ（ox 230）: 先を結んだ線のまん中まで
          { type: 'line', points: [[290, 160], [250, 100]], color: 'gray', width: 2, dashed: true },
          { type: 'arrow', x1: 230, y1: 160, x2: 290, y2: 160, color: 'blue' },
          { type: 'arrow', x1: 230, y1: 160, x2: 250, y2: 100, color: 'blue' },
          { type: 'arrow', x1: 230, y1: 160, x2: 270, y2: 130, color: 'green' },
          { type: 'region', id: 'r1', x: 60, y: 206, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 165, y: 206, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 270, y: 206, r: 24, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '向きのちがう 2 力の合力は、2 力を 2 辺とする平行四辺形をかき、作用点から引いた対角線で表します。正しいのはイです。2 力の矢印の先どうしを結んでも、合力にはならないので気をつけよう。',
        hint: '2 つの力を 2 辺にした平行四辺形を思いうかべよう。',
      }),
      drag({
        id: 'motion-1-p3', concept: 'mo-compose',
        prompt: '方眼の上で、点 O に力 A（右向き）と力 B（右上向き）がはたらいています。2 力の合力を矢印でかくとき、矢印の先はどこになる？ 青い印を動かして、合力の矢印の先の位置に置こう。',
        // 方眼 1 目盛り 40px。O(70,180)、A の先 (230,180)、B の先 (110,60)。合力の先 ＝ (270,60)。
        // 不正解例は 2 力の矢印の先を結んだ線のまん中 (150,120)（134px はなれる）。A の先・B の先も 120px 以上はなれる
        figure: scene([
          ...[30, 70, 110, 150, 190, 230, 270, 310].map(x => ({ type: 'line', points: [[x, 20], [x, 220]], color: 'gray', width: 1, dashed: true })),
          ...[20, 60, 100, 140, 180, 220].map(y => ({ type: 'line', points: [[30, y], [310, y]], color: 'gray', width: 1, dashed: true })),
          { type: 'arrow', x1: 70, y1: 180, x2: 230, y2: 180, color: 'blue' },
          { type: 'arrow', x1: 70, y1: 180, x2: 110, y2: 60, color: 'blue' },
          { type: 'circle', x: 70, y: 180, r: 5, fill: 'blue', stroke: 'blue' },
          note(62, 200, 'O', 14, 'end'),
          note(150, 204, '力 A', 14, 'middle'),
          note(84, 112, '力 B', 14, 'end'),
          { type: 'circle', id: 'mark', x: 290, y: 200, r: 10, fill: 'blue', stroke: 'blue' },
        ]),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 270, y: 60 },
        samples: { correct: { x: 270, y: 60 }, wrong: { x: 150, y: 120 } },
        explanation: '力 A と力 B を 2 辺とする平行四辺形をかくと、O から引いた対角線が合力です。力 A の先から力 B と同じ向き・長さだけ進んだ点（右へ 1 目盛り、上へ 3 目盛り）が、合力の矢印の先になります。',
        hint: '力 A の矢印の先から、力 B と同じだけ進んでみよう。',
      }),
      fill({
        id: 'motion-1-p4', concept: 'mo-buoyancy',
        prompt: '空らんに入る数を入れよう。',
        text: 'ばねばかりにつるした物体の重さは、空気中で 3.0 N、全体を水に沈めると 2.2 N だった。この物体にはたらく浮力の大きさは[b1]である。',
        blanks: [number('b1', 0.8, 0.01, 'N')],
        explanation: '浮力の大きさは、空気中での重さ − 水中での重さ で求められます。3.0 − 2.2 ＝ 0.8 N です。水中でばねばかりの値が小さくなった分が、上向きの浮力です。',
        hint: '空気中と水中で、ばねばかりの値がどれだけ減ったかを考えよう。',
      }),
      figureChoice({
        id: 'motion-1-p5', concept: 'mo-buoyancy',
        prompt: '水そうの中のア〜ウの位置に、ゴム膜をはった同じ容器を置きます。アは水面に近い位置、イはまん中の深さ、ウは底に近い位置です。ゴム膜のへこみ方がいちばん大きいのはどれ？',
        // 水そう（水面 y=40）。ア y=80、イ y=135、ウ y=190
        figure: scene([
          { type: 'rect', x: 30, y: 40, width: 200, height: 180, fill: 'water', stroke: 'line' },
          note(238, 46, '水面', 13),
          { type: 'arrow', x1: 262, y1: 64, x2: 262, y2: 206, color: 'gray' },
          note(272, 140, '深い', 13),
          { type: 'region', id: 'r1', x: 130, y: 80, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 130, y: 135, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 130, y: 190, r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '水圧は、その上にある水の重さによって生じるので、深いほど大きくなります。だから、いちばん深いウでゴム膜がいちばん大きくへこみます。',
        hint: '上にある水の量がいちばん多いのはどこか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-1-r1', concept: 'mo-compose',
        prompt: '斜面上の物体にはたらく重力を、斜面に平行な分力と斜面に垂直な分力に分解しました。物体を斜面に沿って下へ動かそうとするのはどれ？',
        options: ['斜面に平行な分力', '斜面に垂直な分力', 'どちらの分力でもない'],
        answer: 'a',
        explanation: '斜面に平行な分力が、物体を斜面に沿って下へ動かそうとします。斜面に垂直な分力は、物体が斜面を押す力になり、斜面からの垂直抗力とつり合います。',
        hint: '斜面に「沿った」向きの分力はどちらかな。',
      }),
      fill({
        id: 'motion-1-r2', concept: 'mo-compose',
        prompt: '空らんに入る数を入れよう。',
        text: '一直線上で、物体を同じ向きに 2 N と 4 N の力で引いた。2 力の合力の大きさは[b1]である。',
        blanks: [number('b1', 6, 0, 'N')],
        explanation: '同じ向きの 2 力の合力は、2 力の和です。2 ＋ 4 ＝ 6 N で、向きは 2 力と同じです。',
        hint: '同じ向きのときは、2 力を足そう。',
      }),
      choice({
        id: 'motion-1-r3', concept: 'mo-buoyancy',
        prompt: 'ばねばかりにつるした物体の全体を水に沈めたまま、さらに深いところまで沈めました（底にはつけない）。物体にはたらく浮力はどうなる？',
        options: ['変わらない', '大きくなる', '小さくなる'],
        answer: 'a',
        explanation: '物体の全体が水中にあれば、浮力の大きさは深さによって変わりません。浮力は、物体の上の面と下の面にはたらく水圧の差で生じ、その差は深さを変えても同じだからです。',
        hint: '物体の上の面と下の面の水圧の「差」は、深くすると変わるかな。',
      }),
      choice({
        id: 'motion-1-t2', concept: 'mo-buoyancy', term: true,
        prompt: '次の説明に合う言葉はどれ？「水の重さによって生じる圧力。深いほど大きい」',
        options: ['水圧', '浮力', '大気圧'],
        answer: 'a',
        explanation: '水の重さによって生じる圧力を**水圧**といいます。水圧は、水中の物体にあらゆる向きからはたらきます。',
        hint: '「水」の「圧力」を短くした言葉だよ。',
      }),
    ],
  };

  // ---- ステージ motion-2: 速さと運動の記録 ----
  const motion2 = {
    id: 'motion-2', areaId: 'mo-force', title: '速さと運動の記録', minutes: 5, concepts: ['mo-speed'],
    lessons: [
      {
        id: 'motion-2-c1',
        text: '**速さ**は、物体が一定の時間に移動する距離で表します。速さ〔m/s〕＝ 移動距離〔m〕÷ 移動にかかった時間〔s〕です。たとえば 90 m を 30 秒で進むと、速さは 3 m/s です。速さの単位には、km/h や cm/s も使います。',
        // 自動車が 30 秒で 90 m 進む
        figure: scene([
          note(160, 40, '速さ ＝ 移動距離 ÷ 時間', 16, 'middle'),
          note(160, 70, '90 m ÷ 30 s ＝ 3 m/s', 14, 'middle'),
          { type: 'line', points: [[20, 172], [300, 172]], color: 'line', width: 3 },
          { type: 'rect', x: 30, y: 132, width: 50, height: 30, fill: 'sky', rx: 6 },
          { type: 'circle', x: 42, y: 164, r: 7, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 68, y: 164, r: 7, fill: 'ink', stroke: 'ink' },
          { type: 'rect', x: 240, y: 132, width: 50, height: 30, fill: 'sky', rx: 6 },
          { type: 'circle', x: 252, y: 164, r: 7, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 278, y: 164, r: 7, fill: 'ink', stroke: 'ink' },
          note(55, 122, '0 秒', 14, 'middle'),
          note(265, 122, '30 秒', 14, 'middle'),
          { type: 'arrow', x1: 55, y1: 194, x2: 265, y2: 194, color: 'gray' },
          note(160, 222, '90 m', 14, 'middle'),
        ]),
      },
      {
        id: 'motion-2-c2',
        text: 'ある区間を一定の速さで動いたと考えて求めた速さを**平均の速さ**、スピードメーターが示すような、ごく短い時間の速さを**瞬間の速さ**といいます。速さが変わらず、一直線上を進む運動を**等速直線運動**といいます。',
        // 左: スピードメーター（瞬間の速さ）、右: 平均の速さの求め方
        figure: scene([
          { type: 'circle', x: 80, y: 110, r: 50, fill: 'white', stroke: 'ink' },
          { type: 'line', points: [[80, 110], [112, 82]], color: 'blue', width: 3 },
          { type: 'circle', x: 80, y: 110, r: 4, fill: 'ink', stroke: 'ink' },
          note(80, 140, 'km/h', 12, 'middle'),
          note(80, 190, '瞬間の速さ', 14, 'middle'),
          note(240, 60, '平均の速さ ＝', 14, 'middle'),
          note(240, 100, '全体の距離', 14, 'middle'),
          { type: 'line', points: [[190, 110], [290, 110]], width: 2 },
          note(240, 132, '全体の時間', 14, 'middle'),
          note(160, 226, '等速直線運動: 速さも向きも変わらない', 13, 'middle'),
        ]),
      },
      {
        id: 'motion-2-c3',
        text: '**記録タイマー**は、一定の時間ごとに紙テープに点を打つ装置です。1 秒間に 50 回打つ記録タイマーでは、5 打点ごとの間隔が 0.1 秒になります。打点の間隔が一定なら等速直線運動、だんだん広くなるなら速さが増えています。',
        // 写真: 左の記録タイマー（5〜90, 92〜158）に通した紙テープ (100, 123)〜(222, 142) が右の台車（232〜305, 122〜175）につながる。
        // テープの打点はほぼ同じ間隔。上と下は白い余白
        figure: scene([
          photo('motion-2-c3'),
          tag(160, 20, '1 秒間に 50 打点', { size: 13 }),
          tag(160, 40, '→ 5 打点で 0.1 秒', { size: 13 }),
          pointer(48, 82, 48, 102), tag(50, 76, '記録タイマー', { size: 13 }),
          pointer(176, 106, 176, 132), tag(176, 100, '紙テープ', { size: 13 }),
          pointer(268, 106, 268, 124), tag(268, 100, '台車', { size: 13 }),
          tag(160, 202, '打点の間隔が一定 → 等速直線運動', { size: 13 }),
          tag(160, 224, '間隔がだんだん広がる → 速くなる', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-2-w1', concept: 'mo-speed',
      prompt: '予想しよう。動く紙テープに、同じ時間ごとに点を打ちます。点と点の間隔が広いところほど、テープの動く速さはどうだと思う？',
      options: ['速い', 'おそい', '間隔と速さは関係ない'],
      answer: 'a',
      explanation: '同じ時間に長い距離を動くほど、点の間隔は広くなります。つまり、間隔が広いほど速く動いています。速さの求め方と記録のしかたを、このステージで学ぼう。',
      hint: '同じ時間で長い距離を進むのは、速いときかおそいときか考えよう。',
    }),
    problems: [
      fill({
        id: 'motion-2-p1', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '150 m の道のりを 30 秒で進んだ自転車の平均の速さは[b1]である。',
        blanks: [number('b1', 5, 0.1, 'm/s')],
        explanation: '速さ ＝ 移動距離 ÷ 時間 なので、150 ÷ 30 ＝ 5 m/s です。1 秒間に 5 m 進む速さ、という意味です。',
        hint: '距離を時間でわろう。',
      }),
      fill({
        id: 'motion-2-t1', concept: 'mo-speed', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '速さが変わらず、一直線上を進む運動を[b1]という。自動車のスピードメーターが示すような、ごく短い時間の速さを[b2]という。',
        blanks: [
          word('b1', ['等速直線運動', '平均の速さ', '瞬間の速さ'], '等速直線運動'),
          word('b2', ['等速直線運動', '平均の速さ', '瞬間の速さ'], '瞬間の速さ'),
        ],
        explanation: '速さも向きも変わらない運動が**等速直線運動**です。スピードメーターが示すのは、その瞬間ごとの速さで**瞬間の速さ**といいます。',
        hint: '「速さが等しい」「その瞬間の速さ」を表す言葉をさがそう。',
      }),
      figureChoice({
        id: 'motion-2-p2', concept: 'mo-speed',
        prompt: 'ア〜ウは、記録タイマーで運動を記録した紙テープです。どのテープも、左の点から順に、同じ時間ごとに点が打たれています。アは右へいくほど間隔がせまく、イは間隔が一定、ウは右へいくほど間隔が広くなっています。速さがだんだん増えている運動の記録はどれ？',
        // テープは x 20〜240。ア: 間隔がせまくなる、イ: 一定、ウ: 広くなる
        figure: scene([
          note(10, 28, '左の点から順に打たれたテープ', 13),
          ...tape(70, dots(30, [38, 34, 30, 26, 22, 18, 14, 10, 6]), 220),
          ...tape(130, dots(30, [22, 22, 22, 22, 22, 22, 22, 22, 22]), 220),
          ...tape(190, dots(30, [6, 10, 14, 18, 22, 26, 30, 34, 38]), 220),
          { type: 'region', id: 'r1', x: 280, y: 70, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 280, y: 130, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 280, y: 190, r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '打点は同じ時間ごとに打たれるので、間隔が広いほど速く動いています。あとに打たれた点（右）ほど間隔が広いウが、だんだん速くなる運動です。アはだんだんおそくなる運動、イは等速直線運動です。',
        hint: 'あとに打たれた点ほど、間隔が広くなっているテープをさがそう。',
      }),
      fill({
        id: 'motion-2-p3', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。（記録タイマーは 1 秒間に 50 回打点する）',
        text: '台車の運動を記録した紙テープで、5 打点ぶんの長さが 6.0 cm だった。この間の台車の平均の速さは[b1]である。',
        blanks: [number('b1', 60, 0.1, 'cm/s')],
        explanation: '1 秒間に 50 回打点するので、5 打点ぶんは 0.1 秒です。速さは 6.0 cm ÷ 0.1 s ＝ 60 cm/s になります。',
        hint: 'まず、5 打点ぶんが何秒かを考えよう。',
      }),
      choice({
        id: 'motion-2-p4', concept: 'mo-speed',
        prompt: '自宅から 6 km はなれた駅まで、自動車で 15 分かかりました。とちゅうで信号で止まったり、速く走ったりしました。「6 km ÷ 15 分」で求められる速さは何という？',
        options: ['平均の速さ', '瞬間の速さ', '最高の速さ'],
        answer: 'a',
        explanation: '全体の距離を全体の時間でわって求めた速さは、とちゅうも同じ速さで走ったと考えた**平均の速さ**です。とちゅうの各瞬間の速さ（瞬間の速さ）は、これより速いときもおそいときもあります。',
        hint: '全体の距離 ÷ 全体の時間 で求める速さだね。',
      }),
      fill({
        id: 'motion-2-p5', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '100 m を 10 秒で走った人の速さは、秒速[b1]で、時速になおすと[b2]である。',
        blanks: [number('b1', 10, 0.1, 'm'), number('b2', 36, 0.1, 'km')],
        explanation: '100 ÷ 10 ＝ 10 m/s です。1 時間は 3600 秒なので、1 時間では 10 × 3600 ＝ 36000 m ＝ 36 km 進みます。つまり時速 36 km です。',
        hint: '1 時間は 3600 秒。1000 m が 1 km だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'motion-2-r1', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '10 km の道のりを 2 時間で歩いた人の平均の速さは、時速[b1]である。',
        blanks: [number('b1', 5, 0.1, 'km')],
        explanation: '10 km ÷ 2 時間 ＝ 5 km/h（時速 5 km）です。距離の単位が km、時間の単位が時間のときは、速さは km/h になります。',
        hint: '距離を時間でわろう。',
      }),
      choice({
        id: 'motion-2-r2', concept: 'mo-speed',
        prompt: '台車の運動を記録タイマーで記録したところ、打点の間隔がどこも同じでした。台車はどんな運動をしていた？',
        options: ['等速直線運動', 'だんだん速くなる運動', 'だんだんおそくなる運動'],
        answer: 'a',
        explanation: '同じ時間に進む距離がいつも同じなので、速さは一定です。一直線上を一定の速さで進む運動は等速直線運動です。',
        hint: '同じ時間に進む距離が変わらないと、速さはどうなるかな。',
      }),
      fill({
        id: 'motion-2-r3', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。（記録タイマーは 1 秒間に 50 回打点する）',
        text: 'この記録タイマーで、5 打点ぶんにかかる時間は[b1]である。',
        blanks: [number('b1', 0.1, 0.01, '秒')],
        explanation: '1 秒間に 50 回打点するので、1 打点の間は 1 ÷ 50 ＝ 0.02 秒です。5 打点ぶんは 0.02 × 5 ＝ 0.1 秒になります。',
        hint: '50 打点で 1 秒。5 打点はその何分の 1 かな。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 運動とエネルギー
  // ================================================================

  // ---- ステージ motion-3: 力がはたらく運動・慣性 ----
  const motion3 = {
    id: 'motion-3', areaId: 'mo-energy', title: '力がはたらく運動・慣性', minutes: 5, concepts: ['mo-accel'],
    lessons: [
      {
        id: 'motion-3-c1',
        anim: 'mo-slope-accel',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '斜面を下る台車には、斜面に平行な下向きの力が**はたらき続ける**ので、速さは一定の割合で増えていきます。5 打点ごとに切ったテープを順に並べると、長さが同じ割合で長くなっていきます。',
        // 左: 斜面を下る台車と、斜面に平行な力（緑）。右: 5 打点ごとのテープを並べたもの（20px ずつ長くなる）
        figure: scene([
          { type: 'polygon', points: [[20, 70], [20, 140], [160, 140]], fill: 'sand', stroke: 'line' },
          { type: 'polygon', points: [[50, 85], [85.8, 102.9], [94.7, 85], [58.9, 67.1]], fill: 'sky', stroke: 'ink' },
          { type: 'arrow', x1: 96, y1: 92, x2: 142, y2: 115, color: 'green' },
          note(10, 172, '斜面に平行な力が', 13),
          note(10, 192, 'はたらき続ける', 13),
          ...[0, 1, 2, 3, 4].map(i => ({ type: 'rect', x: 180 + 25 * i, y: 200 - 20 * (i + 1), width: 22, height: 20 * (i + 1), fill: 'white', stroke: 'line' })),
          { type: 'line', points: [[175, 200], [310, 200]], width: 2 },
          note(242, 224, '5 打点ごとのテープ', 12, 'middle'),
          note(242, 60, '同じ割合で長くなる', 13, 'middle'),
        ]),
      },
      {
        id: 'motion-3-c2',
        text: '斜面の傾きが大きいほど、斜面に平行な力が大きくなり、速さの増え方も大きくなります。反対に、運動の向きと反対向きに摩擦力などがはたらくと、速さはしだいに小さくなります。',
        // 時間と速さのグラフ: 急な斜面（青）、ゆるやかな斜面（緑）、摩擦で速さが減る（橙）
        figure: scene([
          { type: 'line', points: [[50, 200], [305, 200]], width: 2, arrow: true },
          { type: 'line', points: [[50, 200], [50, 28]], width: 2, arrow: true },
          note(8, 22, '速さ', 12),
          note(312, 236, '時間', 12, 'end'),
          { type: 'line', points: [[50, 200], [170, 50]], color: 'blue', width: 3 },
          { type: 'line', points: [[50, 200], [290, 120]], color: 'green', width: 3 },
          { type: 'line', points: [[50, 100], [230, 200]], color: 'orange', width: 3 },
          note(176, 56, '急な斜面', 13),
          note(300, 110, 'ゆるやかな斜面', 13, 'end'),
          note(58, 92, '摩擦で減速', 13),
        ]),
      },
      {
        id: 'motion-3-c3',
        anim: 'mo-inertia',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '物体に力がはたらかないときや、はたらく力がつり合っているとき、静止している物体は静止し続け、動いている物体は**等速直線運動**を続けます。これを**慣性の法則**といい、物体のこの性質を**慣性**といいます。',
        // 走っていた電車が急に止まると、乗客のからだは前へかたむく
        figure: scene([
          note(20, 30, '電車が急に止まると、からだは前へ', 14),
          { type: 'arrow', x1: 120, y1: 60, x2: 200, y2: 60, color: 'gray', label: '進んでいた向き' },
          { type: 'rect', x: 40, y: 80, width: 240, height: 100, fill: 'white', stroke: 'ink', rx: 8 },
          { type: 'line', points: [[20, 200], [300, 200]], color: 'line', width: 3 },
          { type: 'circle', x: 80, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 240, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
          { type: 'line', points: [[168, 178], [184, 122]], color: 'ink', width: 4 },
          { type: 'circle', x: 188, y: 108, r: 12, fill: 'pink' },
          { type: 'arrow', x1: 204, y1: 120, x2: 250, y2: 120, color: 'blue' },
          note(212, 148, '前へ', 14),
        ]),
      },
      {
        id: 'motion-3-c4',
        anim: 'mo-action-reaction',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '物体 A が物体 B に力を加えると、同時に B も A に力を加え返します。この 2 力は大きさが等しく、向きが反対で、一直線上にあり、別々の物体にはたらきます。これを**作用・反作用の法則**といいます。',
        // スケートボードに乗った A が B を押すと、2 人とも反対向きに動く
        figure: scene([
          { type: 'arrow', x1: 120, y1: 60, x2: 50, y2: 60, color: 'green', label: 'A が受ける力' },
          { type: 'arrow', x1: 200, y1: 60, x2: 270, y2: 60, color: 'blue', label: 'B が受ける力' },
          { type: 'circle', x: 75, y: 96, r: 14, fill: 'pink' },
          { type: 'rect', x: 62, y: 112, width: 26, height: 64, fill: 'sky', label: 'A' },
          { type: 'circle', x: 235, y: 96, r: 14, fill: 'pink' },
          { type: 'rect', x: 222, y: 112, width: 26, height: 64, fill: 'lightgreen', label: 'B' },
          { type: 'line', points: [[88, 130], [222, 130]], color: 'pink', width: 5 },
          { type: 'rect', x: 40, y: 178, width: 70, height: 8, fill: 'brown' },
          { type: 'circle', x: 52, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 98, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          { type: 'rect', x: 200, y: 178, width: 70, height: 8, fill: 'brown' },
          { type: 'circle', x: 212, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 258, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          note(160, 226, '同じ大きさ・反対向き・別々の物体', 14, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-3-w1', concept: 'mo-accel',
      prompt: '予想しよう。まっすぐ走っている電車が急に止まると、立っている乗客のからだは、どちらにかたむくと思う？',
      options: ['電車が進んでいた向き（前）', '電車が進んでいた向きと反対（後ろ）', 'どちらにもかたむかない'],
      answer: 'a',
      explanation: '電車が止まっても、からだはそれまでの運動を続けようとするので、前へかたむきます。このような物体の性質を、このステージで学ぼう。',
      hint: '電車は止まっても、からだは動き続けようとするよ。',
    }),
    problems: [
      figureChoice({
        id: 'motion-3-p1', concept: 'mo-accel',
        prompt: 'アは速さが一定、イは速さがだんだん小さくなる、ウは速さが 0 から一定の割合で大きくなるグラフです。静かに手をはなした台車が斜面を下るときの、時間（横軸）と速さ（縦軸）の関係を表すのはどれ？',
        // 3 つの小さなグラフ。原点はそれぞれ (ox, 170)
        figure: scene([
          note(10, 28, '横軸: 時間　縦軸: 速さ', 13),
          ...[20, 120, 220].flatMap(ox => miniAxes(ox)),
          { type: 'line', points: [[20, 115], [100, 115]], color: 'blue', width: 3 },
          { type: 'line', points: [[120, 75], [200, 160]], color: 'blue', width: 3 },
          { type: 'line', points: [[220, 170], [300, 70]], color: 'blue', width: 3 },
          { type: 'region', id: 'r1', x: 64, y: 210, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 164, y: 210, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 210, r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '斜面を下る台車には、斜面に平行な下向きの力がはたらき続けるので、速さは 0 から一定の割合で増えます。グラフは原点を通る右上がりの直線のウです。アは力がはたらかない（等速直線運動）、イは運動と反対向きに力がはたらくときのグラフです。',
        hint: '手をはなした瞬間の速さは 0。そこからどう変わるかな。',
      }),
      fill({
        id: 'motion-3-t1', concept: 'mo-accel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物体が、それまでの運動の状態を続けようとする性質を[b1]という。物体に力がはたらかないとき、動いている物体は[b2]を続ける。',
        blanks: [
          word('b1', ['慣性', '弾性', '摩擦'], '慣性'),
          word('b2', ['等速直線運動', 'だんだん速くなる運動', 'だんだんおそくなる運動'], '等速直線運動'),
        ],
        explanation: '物体がそれまでの運動を続けようとする性質を**慣性**といいます。力がはたらかなければ、静止している物体は静止し続け、動いている物体は**等速直線運動**を続けます（慣性の法則）。',
        hint: '急ブレーキで前へかたむくのは、からだのどんな性質のためかな。',
      }),
      choice({
        id: 'motion-3-p2', concept: 'mo-accel',
        prompt: '台車を斜面の上から静かにはなす実験で、斜面の傾きを大きくしました。台車の速さの増え方はどうなる？',
        options: ['大きくなる', '小さくなる', '変わらない'],
        answer: 'a',
        explanation: '斜面の傾きが大きいほど、台車にはたらく重力の斜面に平行な分力が大きくなります。そのため、速さの増え方も大きくなります。',
        hint: '急な斜面ほど、斜面に平行な分力はどうなるかな。',
      }),
      choice({
        id: 'motion-3-p3', concept: 'mo-accel',
        prompt: 'スケートボードに乗った A さんが、右どなりで同じようにスケートボードに乗っている B さんを、右向きに押しました。2 人はどうなる？',
        options: ['B さんだけが右へ動き、A さんは動かない', 'B さんは右へ、A さんは左へ動く', '2 人とも右へ動く'],
        answer: 'b',
        explanation: 'A さんが B さんを押すと、同時に B さんも A さんを同じ大きさで反対向き（左向き）に押し返します（作用・反作用）。そのため、2 人は反対向きに動きます。',
        hint: '押した A さんも、B さんから力を受けるよ。',
      }),
      drag({
        id: 'motion-3-p4', concept: 'mo-accel',
        prompt: '斜面を下る台車の運動を記録し、テープを 5 打点ごとに切って順にはりました（図。縦の目盛りは cm）。1〜4 本目の長さは 1.0 cm、3.0 cm、5.0 cm、7.0 cm です。5 本目のテープの上のはしはどこになる？ 青い印を上下に動かして置こう。',
        // 縦 1 cm ＝ 20px、0 cm が y=210。5 本目は 9.0 cm → y=30。不正解例は 4 本目と同じ 7.0 cm（y=70、40px はなれる）
        figure: scene([
          ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ type: 'line', points: [[40, 210 - 20 * i], [300, 210 - 20 * i]], color: 'gray', width: 1, dashed: true })),
          { type: 'line', points: [[40, 210], [305, 210]], width: 2 },
          { type: 'line', points: [[40, 210], [40, 8]], width: 2 },
          ...[0, 2, 4, 6, 8, 10].map(v => note(34, 214 - 20 * v, String(v), 12, 'end')),
          ...[1, 3, 5, 7].map((len, i) => ({ type: 'rect', x: 60 + 50 * i, y: 210 - 20 * len, width: 34, height: 20 * len, fill: 'white', stroke: 'line' })),
          ...[1, 2, 3, 4, 5].map(i => note(77 + 50 * (i - 1), 230, i + ' 本目', 12, 'middle')),
          { type: 'circle', id: 'mark', x: 277, y: 196, r: 10, fill: 'blue', stroke: 'blue' },
        ]),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: 277, y: 30 },
        samples: { correct: { x: 277, y: 30 }, wrong: { x: 277, y: 70 } },
        explanation: 'テープは 1 本ごとに 2.0 cm ずつ長くなっています。台車には斜面に平行な力がはたらき続けて、速さが一定の割合で増えるからです。5 本目は 7.0 ＋ 2.0 ＝ 9.0 cm になります。',
        hint: '1 本ごとに何 cm ずつ長くなっているか調べよう。',
      }),
      choice({
        id: 'motion-3-p5', concept: 'mo-accel',
        prompt: '止まっていた電車が急に動き出しました。立っている乗客のからだは、どちらにかたむく？',
        options: ['電車が動き出す向き（前）', '電車が動き出す向きと反対（後ろ）', 'どちらにもかたむかない'],
        answer: 'b',
        explanation: 'からだは慣性によって、止まったままでいようとします。電車の床だけが前へ動き出すので、からだは後ろへかたむきます。',
        hint: 'からだは「止まったまま」でいようとするよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-3-r1', concept: 'mo-accel',
        prompt: '摩擦や空気の抵抗がない水平面で、台車を手で軽く押してはなしました。はなしたあと、台車はどんな運動をする？',
        options: ['等速直線運動を続ける', 'だんだんおそくなって止まる', 'だんだん速くなる'],
        answer: 'a',
        explanation: '手をはなしたあとは、運動の向きに力がはたらきません（重力と垂直抗力はつり合っています）。慣性の法則により、台車は等速直線運動を続けます。',
        hint: '運動の向きに、力ははたらいているかな。',
      }),
      choice({
        id: 'motion-3-r2', concept: 'mo-accel',
        prompt: '壁を手で押すと、手は壁から押し返されます。手が壁を押す力と、壁が手を押す力の関係はどれ？',
        options: ['大きさが等しく、向きが反対', '手が壁を押す力のほうが大きい', '壁が手を押す力のほうが大きい'],
        answer: 'a',
        explanation: '手が壁を押す力（作用）と、壁が手を押す力（反作用）は、大きさが等しく向きが反対です。2 力は、壁と手という別々の物体にはたらきます。',
        hint: '作用・反作用の 2 力の大きさを思い出そう。',
      }),
      choice({
        id: 'motion-3-r3', concept: 'mo-accel',
        prompt: '机の上で木片をすべらせると、手がはなれたあと、だんだんおそくなって止まりました。おそくなったのはなぜ？',
        options: ['運動と反対向きに摩擦力がはたらいたから', '運動の向きに重力がはたらいたから', '力が何もはたらかなかったから'],
        answer: 'a',
        explanation: '木片と机がふれている面で、運動と反対向きに摩擦力がはたらき続けるので、速さはしだいに小さくなります。',
        hint: '動きをさまたげる向きにはたらく力は何だったかな。',
      }),
    ],
  };

  // ---- ステージ motion-4: 仕事とエネルギー ----
  const motion4 = {
    id: 'motion-4', areaId: 'mo-energy', title: '仕事とエネルギー', minutes: 5, concepts: ['mo-work', 'mo-energy'],
    lessons: [
      {
        id: 'motion-4-c1',
        text: '物体に力を加えて、力の向きに動かしたとき、力は物体に**仕事**をしたといいます。仕事〔J〕＝ 力の大きさ〔N〕× 力の向きに動いた距離〔m〕で、単位は**ジュール**（J）です。1 秒間あたりの仕事を**仕事率**といい、単位は**ワット**（W）です。',
        // 10 N の物体を 2 m 持ち上げる → 20 J
        figure: scene([
          { type: 'line', points: [[20, 200], [180, 200]], color: 'line', width: 3 },
          { type: 'rect', x: 60, y: 160, width: 50, height: 40, fill: 'white', stroke: 'gray' },
          { type: 'rect', x: 60, y: 60, width: 50, height: 40, fill: 'sand', label: '10 N' },
          { type: 'arrow', x1: 85, y1: 154, x2: 85, y2: 106, color: 'blue' },
          { type: 'arrow', x1: 140, y1: 196, x2: 140, y2: 104, color: 'gray' },
          note(148, 156, '2 m', 14),
          note(196, 60, '仕事 ＝ 力 × 距離', 14),
          note(196, 92, '10 N × 2 m', 14),
          note(196, 118, '＝ 20 J', 14),
          note(196, 176, '仕事率 ＝', 13),
          note(196, 200, '仕事 ÷ 時間', 13),
        ]),
      },
      {
        id: 'motion-4-c2',
        anim: 'mo-pulley',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '**動滑車**を使うと、ひもを引く力は半分になりますが、ひもを引く距離は 2 倍になります。斜面などほかの道具でも同じで、道具を使っても仕事の大きさは変わりません。これを**仕事の原理**といいます。',
        // 動滑車（ひもを引く力は半分、引く距離は 2 倍）
        figure: scene([
          ...pulley('おもり'),
          { type: 'arrow', x1: 200, y1: 96, x2: 200, y2: 48, color: 'blue' },
          note(208, 68, '引く力', 13),
          note(160, 226, '力は半分・ひもを引く距離は 2 倍', 14, 'middle'),
        ]),
      },
      {
        id: 'motion-4-c3',
        text: '高い所にある物体がもつエネルギーを**位置エネルギー**、動いている物体がもつエネルギーを**運動エネルギー**といいます。位置エネルギーは高さが高いほど、運動エネルギーは速さが大きいほど大きく、どちらも質量が大きいほど大きくなります。',
        // 左: 高い所の球（位置エネルギー）、右: 動いて木片に当たる球（運動エネルギー）
        figure: scene([
          { type: 'line', points: [[20, 200], [300, 200]], color: 'line', width: 3 },
          { type: 'circle', x: 60, y: 70, r: 14, fill: 'gray' },
          { type: 'line', points: [[60, 86], [60, 198]], color: 'gray', width: 2, dashed: true },
          note(70, 146, '高さ', 13),
          { type: 'circle', x: 200, y: 186, r: 14, fill: 'gray' },
          { type: 'arrow', x1: 170, y1: 150, x2: 230, y2: 150, color: 'blue', label: '速さ' },
          { type: 'rect', x: 250, y: 172, width: 40, height: 28, fill: 'brown', label: '木片', labelPos: 'above' },
          note(70, 226, '位置エネルギー', 14, 'middle'),
          note(230, 226, '運動エネルギー', 14, 'middle'),
          note(80, 30, '高さ・質量が大きいほど大', 12, 'middle'),
          note(240, 30, '速さ・質量が大きいほど大', 12, 'middle'),
        ]),
      },
      {
        id: 'motion-4-c4',
        anim: 'mo-pendulum',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '位置エネルギーと運動エネルギーの和を**力学的エネルギー**といいます。ふりこは、高い位置で位置エネルギーが最大、いちばん低い位置で運動エネルギーが最大です。摩擦や空気の抵抗がなければ、力学的エネルギーは一定に保たれます（**力学的エネルギーの保存**）。',
        // ふりこ（-50°〜50°）。両はしで位置エネルギー最大、いちばん下で運動エネルギー最大
        figure: scene([
          ...swingPath(),
          { type: 'line', points: [[160, 20], bob(-50)], color: 'ink', width: 2 },
          { type: 'line', points: [[160, 20], bob(0)], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[160, 20], bob(50)], color: 'gray', width: 2, dashed: true },
          { type: 'circle', x: bob(-50)[0], y: bob(-50)[1], r: 12, fill: 'blue', stroke: 'ink' },
          { type: 'circle', x: bob(0)[0], y: bob(0)[1], r: 12, fill: 'white', stroke: 'gray' },
          { type: 'circle', x: bob(50)[0], y: bob(50)[1], r: 12, fill: 'white', stroke: 'gray' },
          note(8, 40, '位置エネルギー最大', 12),
          note(312, 40, '位置エネルギー最大', 12, 'end'),
          note(160, 204, '運動エネルギー最大', 13, 'middle'),
          note(160, 230, '和（力学的エネルギー）は一定', 13, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-4-w1', concept: 'mo-work',
      prompt: '予想しよう。重い荷物を持ち上げたまま、その場でじっと立っていました。このあいだ、理科でいう「仕事」をしたと思う？',
      options: ['つかれるので、仕事をした', '荷物が動いていないので、仕事はしていない', '時間がたつほど仕事が大きくなる'],
      answer: 'b',
      explanation: '理科の仕事は、力の向きに物体を動かしたときだけ考えます。荷物が動いていなければ、仕事は 0 です。仕事の求め方を、このステージで学ぼう。',
      hint: '理科の「仕事」には、物体が動いた距離が必要だよ。',
    }),
    problems: [
      fill({
        id: 'motion-4-p1', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: '重さ 20 N の物体を、10 秒かけて 3 m の高さまで一定の速さで持ち上げた。このときの仕事は[b1]で、仕事率は[b2]である。',
        blanks: [number('b1', 60, 0.1, 'J'), number('b2', 6, 0.1, 'W')],
        explanation: '仕事 ＝ 力 × 距離 ＝ 20 N × 3 m ＝ 60 J です。仕事率 ＝ 仕事 ÷ 時間 ＝ 60 J ÷ 10 s ＝ 6 W です。',
        hint: 'まず仕事を求めて、それを時間でわろう。',
      }),
      fill({
        id: 'motion-4-t1', concept: 'mo-energy', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '高い所にある物体がもつエネルギーを[b1]、動いている物体がもつエネルギーを[b2]という。',
        blanks: [
          word('b1', ['位置エネルギー', '運動エネルギー', '力学的エネルギー'], '位置エネルギー'),
          word('b2', ['位置エネルギー', '運動エネルギー', '力学的エネルギー'], '運動エネルギー'),
        ],
        explanation: '高さによるエネルギーが**位置エネルギー**、動きによるエネルギーが**運動エネルギー**です。この 2 つの和を力学的エネルギーといいます。',
        hint: '「高さ（位置）」と「動き（運動）」で選ぼう。',
      }),
      fill({
        id: 'motion-4-p2', concept: 'mo-work',
        prompt: '図のように、重さ 10 N のおもりを動滑車で 1 m 持ち上げます。滑車やひもの重さ、摩擦は考えないものとします。空らんに入る数を入れよう。',
        figure: scene([
          ...pulley('10 N'),
          note(20, 216, 'おもりを 1 m 持ち上げる', 13),
        ]),
        text: 'ひもを引く力は[b1]で、ひもを引く距離は[b2]である。',
        blanks: [number('b1', 5, 0.1, 'N'), number('b2', 2, 0.1, 'm')],
        explanation: '動滑車では、おもりを 2 本のひもで支えるので、引く力は 10 N の半分の 5 N です。そのかわり、ひもを引く距離は 2 倍の 2 m になります。仕事は 5 N × 2 m ＝ 10 J で、直接持ち上げる 10 N × 1 m ＝ 10 J と同じです。',
        hint: '動滑車は「力は半分、距離は 2 倍」だったね。',
      }),
      figureChoice({
        id: 'motion-4-p3', concept: 'mo-energy',
        prompt: 'ふりこのおもりを、左はしの位置アで静かにはなしました。イはアといちばん下のあいだ、ウはいちばん下の位置です。摩擦や空気の抵抗がないとき、おもりの運動エネルギーがいちばん大きいのはどこ？',
        // 支点 (160,20)、糸 150px。ア −50°、イ −25°、ウ 0°（いちばん下）
        figure: scene([
          ...swingPath(),
          { type: 'line', points: [[160, 20], bob(-50)], color: 'ink', width: 2 },
          { type: 'circle', x: bob(-50)[0], y: bob(-50)[1], r: 12, fill: 'blue', stroke: 'ink' },
          note(8, 70, '静かにはなす', 13),
          { type: 'region', id: 'r1', x: bob(-50)[0], y: bob(-50)[1], r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: bob(-25)[0], y: bob(-25)[1], r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: bob(0)[0], y: bob(0)[1], r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: 'おもりが下がるにつれて、位置エネルギーが運動エネルギーに移り変わります。いちばん低いウで位置エネルギーが最小になり、運動エネルギーと速さが最大になります。',
        hint: 'おもりの速さがいちばん速いのはどこか考えよう。',
      }),
      choice({
        id: 'motion-4-p4', concept: 'mo-work',
        prompt: '同じ物体を同じ高さまで持ち上げるとき、直接持ち上げる場合と、動滑車を使う場合をくらべました（滑車の重さや摩擦は考えない）。仕事の大きさはどうなる？',
        options: ['どちらも同じ', '動滑車を使うほうが小さい', '動滑車を使うほうが大きい'],
        answer: 'a',
        explanation: '動滑車を使うと、力は半分になりますが、ひもを引く距離が 2 倍になるので、仕事の大きさは変わりません。これを**仕事の原理**といいます。',
        hint: '力が半分、距離が 2 倍。かけ算するとどうなるかな。',
      }),
      choice({
        id: 'motion-4-p5', concept: 'mo-energy',
        prompt: 'ふりこのおもりを、ある高さで静かにはなしました。摩擦や空気の抵抗がないとき、おもりは反対側でどの高さまで上がる？',
        options: ['はなした位置と同じ高さ', 'はなした位置より低い高さ', 'はなした位置より高い高さ'],
        answer: 'a',
        explanation: '摩擦や空気の抵抗がなければ、力学的エネルギー（位置エネルギーと運動エネルギーの和）は一定に保たれます。だから、おもりははなした位置と同じ高さまで上がります。',
        hint: '力学的エネルギーは、ふえたりへったりするかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-4-r1', concept: 'mo-work',
        prompt: '荷物を手で持ったまま、水平に 10 m 歩きました。荷物を支えている手の力（上向き）が荷物にした仕事は？',
        options: ['0 J', '荷物の重さ × 10 m', '歩いた時間によって決まる'],
        answer: 'a',
        explanation: '手の力は上向きですが、荷物は水平に動いていて、力の向き（上向き）には動いていません。だから、手の力がした仕事は 0 J です。',
        hint: '力の向きに、荷物は動いたかな。',
      }),
      fill({
        id: 'motion-4-r2', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: '300 J の仕事を 60 秒でしたときの仕事率は[b1]である。',
        blanks: [number('b1', 5, 0.1, 'W')],
        explanation: '仕事率 ＝ 仕事 ÷ 時間 ＝ 300 J ÷ 60 s ＝ 5 W です。1 秒間あたり 5 J の仕事をしたことになります。',
        hint: '仕事を時間（秒）でわろう。',
      }),
      choice({
        id: 'motion-4-r3', concept: 'mo-energy',
        prompt: '同じ球を転がして木片に当てる実験で、木片をより遠くまで動かすにはどうすればよい？',
        options: ['球の速さを大きくする', '球の速さを小さくする', '木片を大きくする'],
        answer: 'a',
        explanation: '運動エネルギーは、速さが大きいほど大きくなります。球の速さを大きくすると、木片にする仕事が大きくなり、木片は遠くまで動きます。',
        hint: '運動エネルギーは、何が大きいほど大きかったかな。',
      }),
      choice({
        id: 'motion-4-r4', concept: 'mo-energy',
        prompt: 'ジェットコースターが、コースのいちばん低いところを通過しています。このとき、いちばん大きくなっているのはどれ？',
        options: ['運動エネルギー', '位置エネルギー', '力学的エネルギー'],
        answer: 'a',
        explanation: 'いちばん低いところでは、位置エネルギーが最小になり、その分が運動エネルギーになっているので、運動エネルギーと速さが最大です。摩擦などがなければ、力学的エネルギーはどこでも一定です。',
        hint: '低いところほど、速く走っているね。',
      }),
    ],
  };

  // ================================================================
  // 概念（確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'mo-compose', title: '合力と分力', basic: null, lessonStageId: 'motion-1',
      checkPool: [
        fill({
          id: 'mo-compose-k1', concept: 'mo-compose',
          prompt: '空らんに入る数を入れよう。',
          text: '一直線上で、同じ向きに 4 N と 3 N の力がはたらいている。2 力の合力の大きさは[b1]である。',
          blanks: [number('b1', 7, 0, 'N')],
          explanation: '同じ向きの 2 力の合力は、2 力の和で 4 ＋ 3 ＝ 7 N です。',
          hint: '同じ向きのときは、足し算だよ。',
        }),
        choice({
          id: 'mo-compose-k2', concept: 'mo-compose',
          prompt: '向きのちがう 2 力の合力は、どのように求める？',
          options: ['2 力を 2 辺とする平行四辺形の対角線をかく', '2 力の矢印の先どうしを結ぶ', '2 力の大きさを足して、どちらかの向きにかく'],
          answer: 'a',
          explanation: '向きのちがう 2 力の合力は、2 力を 2 辺とする平行四辺形をかき、作用点から引いた対角線で表します。',
          hint: '平行四辺形を使う方法だったね。',
        }),
        choice({
          id: 'mo-compose-k3', concept: 'mo-compose',
          prompt: '1 つの力を、同じはたらきをする 2 つの力に分けたとき、分けた力を何という？',
          options: ['分力', '合力', '浮力'],
          answer: 'a',
          explanation: '1 つの力を分けた力を**分力**といい、分力を求めることを力の分解といいます。',
          hint: '「分けた力」を短くした言葉だよ。',
        }),
      ],
    },
    {
      id: 'mo-buoyancy', title: '水圧と浮力', basic: null, lessonStageId: 'motion-1',
      checkPool: [
        fill({
          id: 'mo-buoyancy-k1', concept: 'mo-buoyancy',
          prompt: '空らんに入る数を入れよう。',
          text: 'ばねばかりにつるした物体の重さは、空気中で 0.8 N、全体を水に沈めると 0.2 N だった。浮力の大きさは[b1]である。',
          blanks: [number('b1', 0.6, 0.01, 'N')],
          explanation: '浮力 ＝ 空気中での重さ − 水中での重さ ＝ 0.8 − 0.2 ＝ 0.6 N です。',
          hint: 'ばねばかりの値がどれだけ減ったかを考えよう。',
        }),
        choice({
          id: 'mo-buoyancy-k2', concept: 'mo-buoyancy',
          prompt: '水中の物体にはたらく水圧の向きについて、正しいのはどれ？',
          options: ['あらゆる向きから、面に垂直にはたらく', '上からだけはたらく', '下からだけはたらく'],
          answer: 'a',
          explanation: '水圧は、水中の物体のあらゆる向きの面に、垂直にはたらきます。下の面のほうが深いので水圧が大きく、その差が浮力になります。',
          hint: 'ゴム膜は、横向きにしてもへこんだね。',
        }),
        choice({
          id: 'mo-buoyancy-k3', concept: 'mo-buoyancy',
          prompt: '水中の物体にはたらく浮力について、正しいのはどれ？',
          options: ['上向きにはたらく', '下向きにはたらく', '横向きにだけはたらく'],
          answer: 'a',
          explanation: '物体の下の面にはたらく水圧のほうが、上の面にはたらく水圧より大きいので、物体には上向きの浮力がはたらきます。',
          hint: '水に入れると、ばねばかりの値はどうなったかな。',
        }),
      ],
    },
    {
      id: 'mo-speed', title: '速さと記録タイマー', basic: null, lessonStageId: 'motion-2',
      checkPool: [
        fill({
          id: 'mo-speed-k1', concept: 'mo-speed',
          prompt: '空らんに入る数を入れよう。',
          text: '時速 60 km の速さで 5 時間走ると、進む距離は[b1]である。',
          blanks: [number('b1', 300, 0.1, 'km')],
          explanation: '距離 ＝ 速さ × 時間 ＝ 60 km/h × 5 h ＝ 300 km です。',
          hint: '速さに時間をかけると、距離になるよ。',
        }),
        choice({
          id: 'mo-speed-k2', concept: 'mo-speed',
          prompt: '「平均の速さ」の説明として正しいのはどれ？',
          options: ['全体の移動距離を、かかった全体の時間でわった速さ', 'スピードメーターが示している速さ', 'とちゅうでいちばん速かったときの速さ'],
          answer: 'a',
          explanation: '平均の速さは、とちゅうも同じ速さで動いたと考えて、全体の距離 ÷ 全体の時間 で求めた速さです。スピードメーターが示すのは瞬間の速さです。',
          hint: '全体を通して考える速さだよ。',
        }),
        fill({
          id: 'mo-speed-k3', concept: 'mo-speed',
          prompt: '空らんに入る数を入れよう。（記録タイマーは 1 秒間に 50 回打点する）',
          text: '紙テープで、10 打点ぶんの長さが 12 cm だった。この間の平均の速さは[b1]である。',
          blanks: [number('b1', 60, 0.1, 'cm/s')],
          explanation: '10 打点ぶんは 0.02 × 10 ＝ 0.2 秒です。速さは 12 cm ÷ 0.2 s ＝ 60 cm/s になります。',
          hint: 'まず、10 打点ぶんが何秒かを考えよう。',
        }),
      ],
    },
    {
      id: 'mo-accel', title: '力と運動・慣性・作用反作用', basic: 'mo-speed', lessonStageId: 'motion-3',
      checkPool: [
        choice({
          id: 'mo-accel-k1', concept: 'mo-accel',
          prompt: '「慣性の法則」の説明として正しいのはどれ？',
          options: ['力がはたらかなければ、静止している物体は静止し続け、動いている物体は等速直線運動を続ける', '力がはたらかなければ、動いている物体はすぐに止まる', '力がはたらき続けると、物体の速さは変わらない'],
          answer: 'a',
          explanation: '物体に力がはたらかないとき（つり合っているときも）、物体はそれまでの運動の状態を続けます。これが**慣性の法則**です。',
          hint: '物体は「今の状態を続けようとする」性質があったね。',
        }),
        choice({
          id: 'mo-accel-k2', concept: 'mo-accel',
          prompt: '作用・反作用の 2 力について、正しいのはどれ？',
          options: ['別々の物体にはたらく', '同じ 1 つの物体にはたらく', '向きが同じである'],
          answer: 'a',
          explanation: '作用・反作用の 2 力は、大きさが等しく向きが反対で、別々の物体にはたらきます。1 つの物体にはたらく 2 力のつり合いとは、ここがちがいます。',
          hint: 'A が B を押すと、B が A を押し返すね。力を受けるのはそれぞれどれかな。',
        }),
        choice({
          id: 'mo-accel-k3', concept: 'mo-accel',
          prompt: '斜面を下る台車の速さが、だんだん大きくなるのはなぜ？',
          options: ['斜面に平行な下向きの力がはたらき続けるから', '斜面に垂直な力がはたらき続けるから', '台車に力が何もはたらかないから'],
          answer: 'a',
          explanation: '台車には、重力の斜面に平行な分力が、運動の向きにはたらき続けます。そのため、速さが一定の割合で増えていきます。',
          hint: '運動の向きにはたらいている力をさがそう。',
        }),
      ],
    },
    {
      id: 'mo-work', title: '仕事・仕事率・仕事の原理', basic: 'mo-compose', lessonStageId: 'motion-4',
      checkPool: [
        fill({
          id: 'mo-work-k1', concept: 'mo-work',
          prompt: '空らんに入る数を入れよう。',
          text: '5 N の力で、物体を 2 m 持ち上げたときの仕事は[b1]である。',
          blanks: [number('b1', 10, 0.1, 'J')],
          explanation: '仕事 ＝ 力 × 力の向きに動いた距離 ＝ 5 N × 2 m ＝ 10 J です。',
          hint: '力と距離をかけ算しよう。',
        }),
        fill({
          id: 'mo-work-k2', concept: 'mo-work',
          prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
          text: '質量 800 g の物体を、2 m の高さまで持ち上げたときの仕事は[b1]である。',
          blanks: [number('b1', 16, 0.1, 'J')],
          explanation: '800 g の物体にはたらく重力は 8 N なので、持ち上げる力も 8 N です。仕事は 8 N × 2 m ＝ 16 J です。',
          hint: 'まず、800 g の物体を持ち上げる力が何 N かを考えよう。',
        }),
        choice({
          id: 'mo-work-k3', concept: 'mo-work',
          prompt: '仕事率の単位はどれ？',
          options: ['W（ワット）', 'J（ジュール）', 'N（ニュートン）'],
          answer: 'a',
          explanation: '仕事率（1 秒間あたりの仕事）の単位は**ワット**（W）です。仕事の単位はジュール（J）、力の単位はニュートン（N）です。',
          hint: '電力と同じ単位だよ。',
        }),
      ],
    },
    {
      id: 'mo-energy', title: '位置・運動・力学的エネルギー', basic: 'mo-work', lessonStageId: 'motion-4',
      checkPool: [
        choice({
          id: 'mo-energy-k1', concept: 'mo-energy',
          prompt: '物体の位置エネルギーが大きくなるのはどれ？',
          options: ['高さが高いほど、質量が大きいほど', '高さが低いほど、質量が小さいほど', '速さが大きいほど'],
          answer: 'a',
          explanation: '位置エネルギーは、基準の面からの高さが高いほど、また物体の質量が大きいほど大きくなります。',
          hint: '高い所から落とした、重い球ほど、木片を遠くまで動かしたね。',
        }),
        choice({
          id: 'mo-energy-k2', concept: 'mo-energy',
          prompt: '摩擦や空気の抵抗がないとき、左右にふれているふりこの位置エネルギーがいちばん大きいのはどこ？',
          options: ['左右のいちばん高い位置（両はし）', 'いちばん低い位置', 'どこでも同じ'],
          answer: 'a',
          explanation: '位置エネルギーは高さが高いほど大きいので、いちばん高い両はしで最大になります。両はしではおもりが一瞬止まり、運動エネルギーは 0 です。',
          hint: 'ふりこがいちばん高くなるのはどこかな。',
        }),
        choice({
          id: 'mo-energy-k3', concept: 'mo-energy',
          prompt: '力学的エネルギーとは何？',
          options: ['位置エネルギーと運動エネルギーの和', '位置エネルギーと運動エネルギーの差', '運動エネルギーだけのこと'],
          answer: 'a',
          explanation: '位置エネルギーと運動エネルギーの和を**力学的エネルギー**といいます。摩擦や空気の抵抗がなければ、力学的エネルギーは一定に保たれます。',
          hint: '2 つのエネルギーを合わせたものだよ。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'motion',
    title: '運動とエネルギー',
    mascot: 'E',   // 担当の先生（キューブ先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'mo-force', title: '力と運動', order: 1, stages: [motion1, motion2] },
      { id: 'mo-energy', title: '運動とエネルギー', order: 2, stages: [motion3, motion4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
