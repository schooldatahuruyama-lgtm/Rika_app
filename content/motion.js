// 「運動とエネルギー」教材データ（中学3年 理科・物理）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」）。
// 2 領域 × 2 ステージ（力と運動、運動とエネルギー）と、概念 6 つ。
// 領域 3「ミニプリント」: 先生のミニプリントの問題を書き直した 12 ステージ（motion-mp1〜12）と、概念 2 つ（mo-balance・mo-conversion）を追加。
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
  // 領域 3: ミニプリント（先生が作ったミニプリントの問題を書き直したもの）
  // ステージは「プリント 1」〜「プリント 12」。並びは文字起こしの順（学ぶ順）。参考にしたプリントは docs/reports/content/motion.md
  // ================================================================

  // 選ぶ場所（label はア・イ・ウ…）
  function spot(id, x, y, label) { return { type: 'region', id, x, y, r: 24, label }; }

  // 方眼（x0〜x1、y0〜y1 を step ごとの点線で区切る）
  function grid(x0, x1, y0, y1, step) {
    const items = [];
    for (let x = x0; x <= x1; x += step) items.push({ type: 'line', points: [[x, y0], [x, y1]], color: 'gray', width: 1, dashed: true });
    for (let y = y0; y <= y1; y += step) items.push({ type: 'line', points: [[x0, y], [x1, y]], color: 'gray', width: 1, dashed: true });
    return items;
  }

  // 水中のパイプ（中心 (cx, cy)、両はしのゴム膜のへこみ d px。d が 0 なら平ら）
  function pipe(cx, cy, d) {
    return [
      { type: 'rect', x: cx - 30, y: cy - 12, width: 60, height: 24, fill: 'white', stroke: 'line' },
      { type: 'line', points: [[cx - 30, cy - 12], [cx - 30 + d, cy], [cx - 30, cy + 12]], color: 'blue', width: 3 },
      { type: 'line', points: [[cx + 30, cy - 12], [cx + 30 - d, cy], [cx + 30, cy + 12]], color: 'blue', width: 3 },
    ];
  }

  // ばねばかりにつるした物体を水に沈めていく図（A 空気中、B 半分、C 全体）。readings は [A, B, C] の値（N）
  function buoyFigure(readings) {
    const xs = [60, 160, 260], tops = [64, 104, 150];
    const items = [{ type: 'rect', x: 10, y: 126, width: 300, height: 104, fill: 'water', stroke: 'line' }];
    xs.forEach((x, i) => {
      items.push(
        { type: 'rect', x: x - 12, y: 6, width: 24, height: 30, fill: 'white', stroke: 'ink', rx: 4 },
        { type: 'line', points: [[x, 36], [x, tops[i]]], width: 2 },
        { type: 'rect', x: x - 20, y: tops[i], width: 40, height: 44, fill: 'gray' },
        note(x + 18, 26, readings[i].toFixed(1) + ' N', 13),
        note(x, 226, ['A', 'B', 'C'][i], 14, 'middle'),
      );
    });
    items.push(note(14, 120, '水面', 12));
    return items;
  }

  // 斜面上の木片（motion-1-c3 と同じ形。木片の中心 (131, 127)）と重力
  function slopeBlock() {
    return [
      { type: 'polygon', points: [[20, 210], [300, 210], [300, 70]], fill: 'sand', stroke: 'line' },
      { type: 'polygon', points: [[120, 160], [164.7, 137.6], [142.4, 92.9], [97.6, 115.3]], fill: 'brown', stroke: 'ink' },
      { type: 'arrow', x1: 131, y1: 127, x2: 131, y2: 207, color: 'blue' },
      { type: 'circle', x: 131, y: 127, r: 4, fill: 'blue', stroke: 'blue' },
      note(138, 226, '重力', 13),
    ];
  }

  // 机の上の本と力 X・Y・Z（withNames で力の名前も書く）
  function bookOnDesk(withNames) {
    const items = [
      { type: 'rect', x: 40, y: 150, width: 240, height: 14, fill: 'brown' },
      { type: 'rect', x: 56, y: 164, width: 10, height: 60, fill: 'brown' },
      { type: 'rect', x: 254, y: 164, width: 10, height: 60, fill: 'brown' },
      { type: 'rect', x: 110, y: 104, width: 100, height: 46, fill: 'sky', label: '本' },
      { type: 'arrow', x1: 130, y1: 127, x2: 130, y2: 196, color: 'blue' },
      { type: 'arrow', x1: 175, y1: 150, x2: 175, y2: 70, color: 'blue' },
      { type: 'arrow', x1: 200, y1: 152, x2: 200, y2: 214, color: 'green' },
    ];
    if (withNames) {
      items.push(note(112, 214, 'X', 15, 'end'), note(184, 70, 'Y', 15), note(208, 220, 'Z', 15));
      items.push(note(8, 30, 'X 本にはたらく重力', 13), note(8, 50, 'Y 机が本を押す力（垂直抗力）', 13), note(8, 70, 'Z 本が机を押す力', 13));
    }
    return items;
  }

  // 床の上で引かれる箱（引く力・摩擦力など）
  function floorBox() {
    return [
      { type: 'line', points: [[10, 180], [310, 180]], color: 'line', width: 3 },
      { type: 'rect', x: 120, y: 132, width: 70, height: 48, fill: 'sand', label: '箱' },
      { type: 'arrow', x1: 190, y1: 150, x2: 270, y2: 150, color: 'blue', label: '引く力 30 N' },
    ];
  }

  // 定滑車（左）と動滑車（右）
  function twoPulleys() {
    return [
      { type: 'rect', x: 20, y: 10, width: 280, height: 8, fill: 'gray', stroke: 'line' },
      // 定滑車: 天井につるした滑車にひもをかけ、左におもり、右を手で引く
      { type: 'line', points: [[80, 18], [80, 50]], width: 2 },
      { type: 'circle', x: 80, y: 50, r: 18, fill: 'white', stroke: 'ink' },
      { type: 'line', points: [[62, 150], [62, 50], [66, 38], [80, 32], [94, 38], [98, 50], [98, 118]], color: 'brown', width: 2 },
      { type: 'rect', x: 42, y: 150, width: 40, height: 30, fill: 'gray' },
      { type: 'ellipse', x: 98, y: 128, rx: 9, ry: 11, fill: 'pink' },
      // 動滑車: ひもの一方を天井に固定し、滑車の下を通して上へ引く
      { type: 'line', points: [[212, 18], [212, 130], [215, 140], [230, 148], [245, 140], [248, 130], [248, 64]], color: 'brown', width: 2 },
      { type: 'circle', x: 230, y: 130, r: 18, fill: 'white', stroke: 'ink' },
      { type: 'line', points: [[230, 130], [230, 166]], width: 2 },
      { type: 'rect', x: 210, y: 166, width: 40, height: 30, fill: 'gray' },
      { type: 'ellipse', x: 248, y: 54, rx: 9, ry: 11, fill: 'pink' },
    ];
  }

  // てこ（棒は y 150、支点 x 90。左はし x 40 に物体、右はし x 290 を手で押す）
  function lever() {
    return [
      { type: 'line', points: [[20, 190], [300, 190]], color: 'line', width: 3 },
      { type: 'polygon', points: [[76, 190], [104, 190], [90, 154]], fill: 'gray', stroke: 'ink' },
      { type: 'line', points: [[30, 150], [300, 150]], color: 'brown', width: 6 },
      { type: 'rect', x: 22, y: 116, width: 36, height: 30, fill: 'sand' },
    ];
  }

  // ふりこの位置 A〜E（-50°・-25°・0°・25°・50°）
  const SWING = [-50, -25, 0, 25, 50].map(d => bob(d));

  // ---- ステージ motion-mp1: プリント 1 水圧と浮力 ----
  const motionMp1 = {
    id: 'motion-mp1', areaId: 'mo-miniprint', title: 'プリント 1: 水圧と浮力', minutes: 5, concepts: ['mo-buoyancy'],
    lessons: [
      {
        id: 'motion-mp1-c1',
        anim: 'mo-water-pressure',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '水の重さによって生じる圧力を**水圧**といいます。水圧は、水中の物体のあらゆる向きの面に垂直にはたらき、深いほど大きくなります。同じ深さなら、ゴム膜を横に向けても下に向けても、へこみ方は変わりません。',
        // 水そうの中の、両はしにゴム膜をはったパイプ。深いほどへこみが大きい
        figure: scene([
          { type: 'rect', x: 20, y: 46, width: 280, height: 184, fill: 'water', stroke: 'line' },
          note(24, 40, '水面', 13),
          ...pipe(80, 80, 3), ...pipe(160, 135, 7), ...pipe(240, 190, 11),
          note(80, 112, '浅い: 小さくへこむ', 12, 'middle'),
          note(160, 167, 'まん中', 12, 'middle'),
          note(240, 222, '深い: 大きくへこむ', 12, 'middle'),
        ]),
      },
      {
        id: 'motion-mp1-c2',
        anim: 'mo-buoyancy-depth',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '水中の物体には、下の面と上の面の水圧の差によって、上向きの**浮力**がはたらきます。浮力 ＝ 空気中でのばねばかりの値 − 水中での値 です。物体の全体が水に入ったあとは、深くしても浮力は変わりません。',
        // A 空気中 2.0 N、B 半分 1.7 N、C 全体 1.4 N（C の浮力は 0.6 N）
        figure: scene(buoyFigure([2.0, 1.7, 1.4]).concat([
          note(14, 204, 'C の浮力 ＝ 2.0 − 1.4 ＝ 0.6 N', 13),
        ])),
      },
    ],
    warmup: choice({
      id: 'motion-mp1-w1', concept: 'mo-buoyancy',
      prompt: '予想しよう。両はしにゴム膜をはったパイプを、横にして水に沈めます。ゴム膜はどうなると思う？',
      options: ['両はしとも内側にへこむ', '両はしとも外側にふくらむ', 'どちらも変化しない'],
      answer: 'a',
      explanation: '水中では、水の重さによる水圧が、あらゆる向きから面を押します。そのため、両はしのゴム膜はどちらも内側にへこみます。水圧の性質をこのステージで確かめよう。',
      hint: '水は、上からだけでなく横からも押してくるよ。',
    }),
    problems: [
      fill({
        id: 'motion-mp1-t1', concept: 'mo-buoyancy', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水の重さによって生じる圧力を[b1]といい、水中の物体にはたらく上向きの力を[b2]という。',
        blanks: [
          word('b1', ['水圧', '浮力', '大気圧', '重力'], '水圧'),
          word('b2', ['水圧', '浮力', '大気圧', '重力'], '浮力'),
        ],
        explanation: '水の重さによる圧力が**水圧**、水中の物体を上へ押し上げる力が**浮力**です。浮力は、下の面にはたらく水圧のほうが上の面より大きいために生じます。',
        hint: '「水」の圧力と、「浮く」力だよ。',
      }),
      figureChoice({
        id: 'motion-mp1-p1', concept: 'mo-buoyancy',
        prompt: '両はしにゴム膜をはった同じパイプを、水そうのア〜ウの深さに沈めます（アがいちばん浅く、ウがいちばん深い）。ゴム膜のへこみ方がいちばん小さいのはどれ？',
        figure: scene([
          { type: 'rect', x: 20, y: 46, width: 280, height: 184, fill: 'water', stroke: 'line' },
          note(24, 40, '水面', 13),
          ...pipe(110, 80, 0), ...pipe(110, 135, 0), ...pipe(110, 190, 0),
          spot('r1', 200, 80, 'ア'),
          spot('r2', 200, 135, 'イ'),
          spot('r3', 200, 190, 'ウ'),
        ]),
        answer: 'r1',
        explanation: '水圧は、上にある水の重さによって生じるので、浅いほど小さくなります。いちばん浅いアで、ゴム膜のへこみ方がいちばん小さくなります。',
        hint: '上にある水がいちばん少ないのはどこかな。',
      }),
      choice({
        id: 'motion-mp1-p2', concept: 'mo-buoyancy',
        prompt: '水圧の大きさと、水の深さの関係として正しいのはどれ？',
        options: ['深いほど大きい', '深いほど小さい', '深さに関係なく同じ'],
        answer: 'a',
        explanation: '深いところほど、その上にある水の重さが大きいので、水圧は大きくなります。',
        hint: 'プールで深くもぐると、耳がどう感じるか思い出そう。',
      }),
      choice({
        id: 'motion-mp1-p3', concept: 'mo-buoyancy',
        prompt: '両はしに膜をはったパイプを縦向きにして水中に沈めると、上下の膜のへこみ方はどうなる？',
        options: ['下の膜のほうが大きくへこむ（深いほど水圧が大きい）', '上の膜のほうが大きくへこむ', '上下とも同じだけへこむ'],
        answer: 'a',
        explanation: '水圧は、深いところほど大きくなります。パイプを縦向きにすると、下の膜のほうが深いところにあるので、上の膜より大きな水圧を受けて、大きくへこみます。',
        hint: '上の膜と下の膜では、どちらが深いところにあるかな。',
      }),
      fill({
        id: 'motion-mp1-p4', concept: 'mo-buoyancy',
        prompt: '図は、ばねばかりにつるした物体を、A 空気中、B 半分だけ水中、C 全体を水中にしたときのようすです。空らんに入る数を入れよう。',
        figure: scene(buoyFigure([1.2, 1.0, 0.8])),
        text: '物体にはたらく重力の大きさは[b1]で、B のときにはたらく浮力の大きさは[b2]である。',
        blanks: [number('b1', 1.2, 0.01, 'N'), number('b2', 0.2, 0.01, 'N')],
        explanation: '空気中のばねばかりの値 1.2 N が、物体にはたらく重力の大きさです。B の浮力は 1.2 − 1.0 ＝ 0.2 N です。',
        hint: '空気中の値が重力。浮力は「空気中 − 水中」だよ。',
      }),
      fill({
        id: 'motion-mp1-p5', concept: 'mo-buoyancy',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '水圧は、水中の物体の[b1]向きの面に、[b2]にはたらく。',
        blanks: [
          word('b1', ['あらゆる', '上', '下'], 'あらゆる'),
          word('b2', ['垂直', '平行', 'ななめ'], '垂直'),
        ],
        explanation: '水圧は、水中の物体のあらゆる向きの面に、面に垂直にはたらきます。だから、パイプを横にしても縦にしても、ゴム膜は内側へへこみます。',
        hint: 'ゴム膜は、どの向きにしてもへこんだね。',
      }),
    ],
    retryPool: [
      fill({
        id: 'motion-mp1-r1', concept: 'mo-buoyancy',
        prompt: '図は、ばねばかりにつるした物体を、A 空気中、B 半分だけ水中、C 全体を水中にしたときのようすです。空らんに入る数を入れよう。',
        figure: scene(buoyFigure([1.2, 1.0, 0.8])),
        text: 'C のときに物体にはたらく浮力の大きさは[b1]である。',
        blanks: [number('b1', 0.4, 0.01, 'N')],
        explanation: '浮力 ＝ 空気中の値 − 水中の値 ＝ 1.2 − 0.8 ＝ 0.4 N です。水に入っている部分が大きいほど、浮力は大きくなります。',
        hint: '空気中の値から、C の値をひこう。',
      }),
      fill({
        id: 'motion-mp1-r2', concept: 'mo-buoyancy',
        prompt: '空らんに入る数を入れよう。',
        text: '空気中で 1.2 N、全体を水に沈めると 0.8 N を示す物体を、底につかないように、さらに 10 cm 深く沈めた。ばねばかりは[b1]を示す。',
        blanks: [number('b1', 0.8, 0.01, 'N')],
        explanation: '物体の全体が水中にあれば、浮力は深さによって変わりません（0.4 N のまま）。だから、ばねばかりの値も 0.8 N のままです。',
        hint: '全体が水に入ったあと、浮力は深さで変わるかな。',
      }),
      choice({
        id: 'motion-mp1-r3', concept: 'mo-buoyancy',
        prompt: '水圧は、何によって生じる力（圧力）？',
        options: ['水の重さ', '水の温度', '空気の重さ'],
        answer: 'a',
        explanation: '水圧は、水にはたらく重力、つまり水の重さによって生じます。上にある水が多い深いところほど、水圧は大きくなります。',
        hint: '深いほど大きくなる理由を考えよう。',
      }),
    ],
  };

  // ---- ステージ motion-mp2: プリント 2 力の合成 ----
  const motionMp2 = {
    id: 'motion-mp2', areaId: 'mo-miniprint', title: 'プリント 2: 力の合成', minutes: 5, concepts: ['mo-compose'],
    lessons: [
      {
        id: 'motion-mp2-c1',
        anim: 'mo-angle-resultant',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '一直線上の 2 力の**合力**は、同じ向きなら 2 力の和、反対向きなら 2 力の差で、向きは大きいほうの力と同じです。2 力に角度があるときの合力は、2 力の和より小さく、差より大きくなります。',
        // 上: 同じ向き 2 N ＋ 3 N ＝ 5 N。下: 反対向き 3 N と 1 N → 2 N（1 N ＝ 24px）
        figure: scene([
          note(10, 26, '同じ向き → 和', 14),
          { type: 'arrow', x1: 40, y1: 56, x2: 88, y2: 56, color: 'blue', label: '2 N' },
          { type: 'arrow', x1: 88, y1: 56, x2: 160, y2: 56, color: 'blue', label: '3 N' },
          { type: 'arrow', x1: 40, y1: 92, x2: 160, y2: 92, color: 'green', label: '合力 5 N' },
          note(10, 132, '反対向き → 差', 14),
          { type: 'circle', x: 150, y: 160, r: 5, fill: 'blue', stroke: 'blue' },
          { type: 'arrow', x1: 150, y1: 160, x2: 222, y2: 160, color: 'blue', label: '3 N' },
          { type: 'arrow', x1: 150, y1: 160, x2: 126, y2: 160, color: 'blue' },
          note(120, 166, '1 N', 13, 'end'),
          { type: 'arrow', x1: 150, y1: 196, x2: 198, y2: 196, color: 'green' },
          note(206, 202, '合力 2 N', 13),
          note(10, 232, '角度があると: 差 ＜ 合力 ＜ 和', 13),
        ]),
      },
      {
        id: 'motion-mp2-c2',
        anim: 'mo-compose-steps',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '角度のある 2 力の合力は、2 力を 2 辺とする**平行四辺形**をかき、作用点から対角線を引いて求めます。方眼では、力 A の矢印の先から、力 B と同じ向き・長さだけ進んだ点が合力の先です。',
        // 方眼 40px。O(60,190)、A の先 (140,190)、B の先 (140,110)、合力の先 (220,110)
        figure: scene([
          ...grid(20, 300, 30, 230, 40),
          { type: 'line', points: [[140, 190], [220, 110]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[140, 110], [220, 110]], color: 'gray', width: 2, dashed: true },
          { type: 'arrow', x1: 60, y1: 190, x2: 140, y2: 190, color: 'blue' },
          { type: 'arrow', x1: 60, y1: 190, x2: 140, y2: 110, color: 'blue' },
          { type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 110, color: 'green' },
          { type: 'circle', x: 60, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
          note(52, 210, 'O', 14, 'end'),
          note(100, 214, '力 A', 13, 'middle'),
          note(92, 138, '力 B', 13, 'end'),
          note(228, 104, '合力', 13),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp2-w1', concept: 'mo-compose',
      prompt: '予想しよう。1 つの物体を、一直線上で右向きに 5 N、左向きに 3 N の力で引きます。物体はどちらへ動き出すと思う？',
      options: ['右（5 N の向き）', '左（3 N の向き）', 'どちらにも動かない'],
      answer: 'a',
      explanation: '反対向きの 2 力の合力は、差の 5 − 3 ＝ 2 N で、大きいほうの右向きです。だから物体は右へ動き出します。2 力をまとめる考え方を、このステージで練習しよう。',
      hint: '大きいほうの力が「勝つ」と考えよう。',
    }),
    problems: [
      fill({
        id: 'motion-mp2-p1', concept: 'mo-compose',
        prompt: '空らんに入る数を入れよう。',
        text: '一直線上で、物体を同じ向きに 5 N と 3 N の力で引いた。2 力と同じはたらきをする 1 つの力の大きさは[b1]である。',
        blanks: [number('b1', 8, 0, 'N')],
        explanation: '同じ向きの 2 力の合力は、2 力の和です。5 ＋ 3 ＝ 8 N で、向きは 2 力と同じです。',
        hint: '同じ向きのときは足し算だよ。',
      }),
      fill({
        id: 'motion-mp2-p2', concept: 'mo-compose',
        prompt: '空らんに入る数と言葉を入れよう。',
        text: '一直線上で、物体を右向きに 2 N、左向きに 6 N の力で引いた。合力の大きさは[b1]で、向きは[b2]である。',
        blanks: [number('b1', 4, 0, 'N'), word('b2', ['右向き', '左向き', '決まらない'], '左向き')],
        explanation: '反対向きの 2 力の合力は、2 力の差の 6 − 2 ＝ 4 N です。向きは、大きいほうの 6 N の力と同じ左向きです。',
        hint: '反対向きのときは引き算。向きは大きいほうの力だよ。',
      }),
      choice({
        id: 'motion-mp2-p3', concept: 'mo-compose',
        prompt: '1 つの物体に、4 N と 3 N の 2 力が、たがいに角度をもってはたらいています（一直線上ではない）。合力の大きさについて正しいのはどれ？',
        options: ['1 N より大きく、7 N より小さい', 'ちょうど 7 N', 'ちょうど 1 N'],
        answer: 'a',
        explanation: '2 力に角度があるとき、合力は平行四辺形の対角線で表され、2 力の和（7 N）より小さく、差（1 N）より大きくなります。角度が大きいほど、合力は小さくなります。',
        hint: '同じ向き（和）と反対向き（差）のあいだになるよ。',
      }),
      drag({
        id: 'motion-mp2-p4', concept: 'mo-compose',
        prompt: '方眼の上で、点 O に力 A（右向き）と力 B（右上向き）がはたらいています。2 力の合力の矢印の先はどこになる？ 青い印を動かして置こう。',
        // 方眼 40px。O(70,180)、A の先 (190,180)、B の先 (110,100)。合力の先 ＝ (230,100)。
        // 不正解例は 2 力の矢印の先を結んだ線のまん中 (150,140)（89px はなれる）
        figure: scene([
          ...grid(30, 310, 20, 220, 40),
          { type: 'arrow', x1: 70, y1: 180, x2: 190, y2: 180, color: 'blue' },
          { type: 'arrow', x1: 70, y1: 180, x2: 110, y2: 100, color: 'blue' },
          { type: 'circle', x: 70, y: 180, r: 5, fill: 'blue', stroke: 'blue' },
          note(62, 200, 'O', 14, 'end'),
          note(130, 204, '力 A', 13, 'middle'),
          note(84, 124, '力 B', 13, 'end'),
          { type: 'circle', id: 'mark', x: 290, y: 40, r: 10, fill: 'blue', stroke: 'blue' },
        ]),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 230, y: 100 },
        samples: { correct: { x: 230, y: 100 }, wrong: { x: 150, y: 140 } },
        explanation: '力 A と力 B を 2 辺とする平行四辺形をかくと、O から引いた対角線が合力です。力 A の先 (右へ 3 目盛り) から、力 B と同じだけ (右へ 1、上へ 2 目盛り) 進んだ点が合力の先になります。',
        hint: '力 A の矢印の先から、力 B と同じ向き・長さだけ進んでみよう。',
      }),
      fill({
        id: 'motion-mp2-t1', concept: 'mo-compose', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '2 つの力と同じはたらきをする 1 つの力を[b1]といい、それを求めることを[b2]という。',
        blanks: [
          word('b1', ['合力', '分力', '浮力'], '合力'),
          word('b2', ['力の合成', '力の分解', '力のつり合い'], '力の合成'),
        ],
        explanation: '2 力をまとめた 1 つの力が**合力**で、合力を求めることを**力の合成**といいます。反対に、1 つの力を 2 つに分けることは力の分解です。',
        hint: '「合わせる」ことを表す言葉を選ぼう。',
      }),
      fill({
        id: 'motion-mp2-p5', concept: 'mo-compose',
        prompt: '空らんに入る数と言葉を入れよう。',
        text: '一直線上で、力 A（3 N）と力 B（6 N）が反対向きにはたらいている。合力の大きさは[b1]で、向きは[b2]と同じである。',
        blanks: [number('b1', 3, 0, 'N'), word('b2', ['力 A', '力 B'], '力 B')],
        explanation: '反対向きの 2 力の合力は、差の 6 − 3 ＝ 3 N です。向きは大きいほうの力 B と同じです。',
        hint: '大きいほうの力から、小さいほうの力をひこう。',
      }),
    ],
    retryPool: [
      drag({
        id: 'motion-mp2-r1', concept: 'mo-compose',
        prompt: '方眼の上で、点 O に力 A（右向き）と力 B（右上向き）がはたらいています。2 力の合力の矢印の先に、青い印を動かして置こう。',
        // 方眼 40px。O(70,180)、A の先 (150,180)、B の先 (110,60)。合力の先 ＝ (190,60)。不正解例 (130,120)（85px）
        figure: scene([
          ...grid(30, 310, 20, 220, 40),
          { type: 'arrow', x1: 70, y1: 180, x2: 150, y2: 180, color: 'blue' },
          { type: 'arrow', x1: 70, y1: 180, x2: 110, y2: 60, color: 'blue' },
          { type: 'circle', x: 70, y: 180, r: 5, fill: 'blue', stroke: 'blue' },
          note(62, 200, 'O', 14, 'end'),
          note(110, 204, '力 A', 13, 'middle'),
          note(84, 112, '力 B', 13, 'end'),
          { type: 'circle', id: 'mark', x: 290, y: 200, r: 10, fill: 'blue', stroke: 'blue' },
        ]),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 190, y: 60 },
        samples: { correct: { x: 190, y: 60 }, wrong: { x: 130, y: 120 } },
        explanation: '力 A の先 (右へ 2 目盛り) から、力 B と同じだけ (右へ 1、上へ 3 目盛り) 進んだ点が、平行四辺形の対角線の先、つまり合力の先です。',
        hint: '2 力を 2 辺とする平行四辺形をかいてみよう。',
      }),
      fill({
        id: 'motion-mp2-r2', concept: 'mo-compose',
        prompt: '空らんに入る数を入れよう。',
        text: '一直線上で、力 A（3 N）と力 B（6 N）が同じ向きにはたらいている。合力の大きさは[b1]である。',
        blanks: [number('b1', 9, 0, 'N')],
        explanation: '同じ向きの 2 力の合力は和で、3 ＋ 6 ＝ 9 N です。',
        hint: '同じ向きなら足し算。',
      }),
      choice({
        id: 'motion-mp2-r3', concept: 'mo-compose',
        prompt: '大きさの変わらない 2 力のあいだの角度を、だんだん大きくしていきました。合力の大きさはどうなる？',
        options: ['だんだん小さくなる', 'だんだん大きくなる', '変わらない'],
        answer: 'a',
        explanation: '2 力のあいだの角度が大きくなるほど、平行四辺形の対角線は短くなるので、合力は小さくなります。角度が 180°（反対向き）のとき、合力は 2 力の差になります。',
        hint: '角度 0°（同じ向き）と 180°（反対向き）のときをくらべよう。',
      }),
    ],
  };

  // ---- ステージ motion-mp3: プリント 3 力の分解と 2 力のつり合い ----
  const motionMp3 = {
    id: 'motion-mp3', areaId: 'mo-miniprint', title: 'プリント 3: 力の分解と 2 力のつり合い', minutes: 5, concepts: ['mo-compose', 'mo-balance'],
    lessons: [
      {
        id: 'motion-mp3-c1',
        anim: 'mo-split-steps',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '1 つの力を、同じはたらきをする 2 つの力に分けることを**力の分解**、分けた力を**分力**といいます。分けたい 2 つの向きの線を引き、もとの力が対角線になる平行四辺形をかくと、2 辺が分力になります。',
        // O(60,190) の力 C（青）を、横向き（OA）と縦向き（OB）の分力（緑）に分ける
        figure: scene([
          { type: 'line', points: [[60, 190], [300, 190]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[60, 190], [60, 30]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[220, 90], [220, 190]], color: 'gray', width: 1, dashed: true },
          { type: 'line', points: [[220, 90], [60, 90]], color: 'gray', width: 1, dashed: true },
          { type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 90, color: 'blue' },
          { type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 190, color: 'green' },
          { type: 'arrow', x1: 60, y1: 190, x2: 60, y2: 90, color: 'green' },
          { type: 'circle', x: 60, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
          note(52, 210, 'O', 14, 'end'),
          note(228, 86, '力 C', 13),
          note(306, 186, 'A', 14, 'end'),
          note(68, 34, 'B', 14),
          note(140, 214, 'A の向きの分力', 12, 'middle'),
          note(70, 76, 'B の向きの分力', 12),
        ]),
      },
      {
        id: 'motion-mp3-c2',
        anim: 'mo-slope-split',   // 動く図（js/anim-physics.js。ミニプリントの使い回し）。figure は静止図として残す
        text: '斜面上の物体にはたらく重力は、斜面に平行な分力と、斜面に垂直な分力に分けられます。斜面に平行な分力が物体を斜面に沿って下へ動かそうとし、斜面の傾きが大きいほど、この分力は大きくなります。',
        figure: scene(slopeBlock().concat([
          { type: 'line', points: [[99, 143], [131, 207]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[163, 191], [131, 207]], color: 'gray', width: 2, dashed: true },
          { type: 'arrow', x1: 131, y1: 127, x2: 99, y2: 143, color: 'green' },
          { type: 'arrow', x1: 131, y1: 127, x2: 163, y2: 191, color: 'green' },
          note(92, 150, '平行な分力', 13, 'end'),
          note(172, 200, '垂直な分力', 13),
        ])),
      },
      {
        id: 'motion-mp3-c3',
        text: '1 つの物体に 2 力がはたらいて動かないとき、2 力は**つり合っている**といいます。つり合う条件は、2 力が**一直線上**にあり、**向きが反対**で、**大きさが等しい**ことです。',
        // 箱の左右から、一直線上で同じ大きさの反対向きの力
        figure: scene([
          { type: 'line', points: [[10, 170], [310, 170]], color: 'line', width: 3 },
          { type: 'rect', x: 130, y: 110, width: 60, height: 60, fill: 'sand' },
          { type: 'arrow', x1: 190, y1: 140, x2: 270, y2: 140, color: 'blue', label: '3 N' },
          { type: 'arrow', x1: 130, y1: 140, x2: 50, y2: 140, color: 'blue', label: '3 N' },
          note(160, 40, '一直線上・反対向き・同じ大きさ', 14, 'middle'),
          note(160, 62, '→ つり合って動かない', 14, 'middle'),
          note(160, 210, '1 つの物体にはたらく 2 力', 13, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp3-w1', concept: 'mo-balance',
      prompt: '予想しよう。机の上の本を、左右から一直線上で同じ大きさの力で引っぱると、本はどうなると思う？',
      options: ['動かない', '右へ動く', 'くるくる回る'],
      answer: 'a',
      explanation: '一直線上で、反対向きに同じ大きさの 2 力がはたらくと、2 力はつり合って本は動きません。つり合う条件と、力を分ける考え方をこのステージで学ぼう。',
      hint: '綱引きで、両チームの力が同じときを思い出そう。',
    }),
    problems: [
      drag({
        id: 'motion-mp3-p1', concept: 'mo-compose',
        prompt: '方眼の上で、点 O にはたらく力 C を、OA の向き（横の点線）と OB の向き（ななめの点線）の 2 つの分力に分けます。OA の向きの分力の矢印の先はどこ？ 青い印を動かして置こう。',
        // 方眼 40px。O(50,190)、C の先 (250,70)＝(5,−3) 目盛り。OB の向き (1,−3)。C ＝ 4×(1,0) ＋ 1×(1,−3)
        // OA の向きの分力の先 ＝ (210,190)。不正解例は C の先の真下 (250,190)（40px はなれる）
        figure: scene([
          ...grid(10, 310, 30, 230, 40),
          { type: 'line', points: [[50, 190], [310, 190]], color: 'ink', width: 2, dashed: true },
          { type: 'line', points: [[50, 190], [110, 10]], color: 'ink', width: 2, dashed: true },
          { type: 'arrow', x1: 50, y1: 190, x2: 250, y2: 70, color: 'blue' },
          { type: 'circle', x: 50, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
          note(42, 210, 'O', 14, 'end'),
          note(306, 210, 'A', 14, 'end'),
          note(118, 26, 'B', 14),
          note(258, 66, '力 C', 13),
          { type: 'circle', id: 'mark', x: 290, y: 40, r: 10, fill: 'blue', stroke: 'blue' },
        ]),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 210, y: 190 },
        samples: { correct: { x: 210, y: 190 }, wrong: { x: 250, y: 190 } },
        explanation: '力 C の矢印の先から OB の向きに平行な線を引き、OA の線と交わった点が、OA の向きの分力の先です。C の先から OB と反対向き（左へ 1、下へ 3 目盛り）にもどった (210, 190) になります。真下に下ろしてはいけません。',
        hint: '力 C が対角線になる平行四辺形をかこう。OB に平行な線を使うよ。',
      }),
      figureChoice({
        id: 'motion-mp3-p2', concept: 'mo-compose',
        prompt: '斜面上の木片にはたらく重力（青）を分解しました。緑のア〜ウのうち、木片を斜面に沿って下へ動かそうとする分力はどれ？（ア 斜面に沿って下向き、イ 斜面に垂直で斜面を押す向き、ウ 斜面に沿って上向き）',
        figure: scene(slopeBlock().concat([
          { type: 'arrow', x1: 131, y1: 127, x2: 99, y2: 143, color: 'green' },
          { type: 'arrow', x1: 131, y1: 127, x2: 163, y2: 191, color: 'green' },
          { type: 'arrow', x1: 131, y1: 127, x2: 163, y2: 111, color: 'green' },
          spot('r1', 66, 162, 'ア'),
          spot('r2', 192, 212, 'イ'),
          spot('r3', 200, 90, 'ウ'),
        ])),
        answer: 'r1',
        explanation: '重力は、斜面に平行で下向きの分力（ア）と、斜面に垂直な分力（イ）に分けられます。木片を斜面に沿って下へ動かそうとするのはアです。イは木片が斜面を押す力で、斜面からの垂直抗力とつり合います。',
        hint: '重力の分力は、どちらも重力より「下側」を向くよ。',
      }),
      fill({
        id: 'motion-mp3-t1', concept: 'mo-balance', term: true,
        prompt: '2 力がつり合う条件を完成させよう。',
        text: '1 つの物体にはたらく 2 力が、[b1]上にあり、向きが[b2]で、大きさが[b3]とき、2 力はつり合っている。',
        blanks: [
          word('b1', ['一直線', '平行な別の直線'], '一直線'),
          word('b2', ['反対', '同じ'], '反対'),
          word('b3', ['等しい', 'ちがう'], '等しい'),
        ],
        explanation: '2 力のつり合いの条件は、**一直線上**にある、**向きが反対**、**大きさが等しい** の 3 つです。どれか 1 つでも欠けると、物体は動いたり回ったりします。',
        hint: '綱引きで動かないときの、2 チームの力を考えよう。',
      }),
      figureChoice({
        id: 'motion-mp3-p3', concept: 'mo-balance',
        prompt: 'ア〜ウは、箱に 2 つの力を加えたようすです（ア 一直線上で反対向き・同じ長さ、イ 反対向き・同じ長さだが少しずれた直線上、ウ 一直線上で反対向き・長さがちがう）。箱が動かないのはどれ？',
        figure: scene([
          ...[50, 125, 200].map(y => ({ type: 'rect', x: 120, y: y - 18, width: 40, height: 36, fill: 'sand' })),
          { type: 'arrow', x1: 160, y1: 50, x2: 220, y2: 50, color: 'blue' },
          { type: 'arrow', x1: 120, y1: 50, x2: 60, y2: 50, color: 'blue' },
          { type: 'arrow', x1: 160, y1: 114, x2: 220, y2: 114, color: 'blue' },
          { type: 'arrow', x1: 120, y1: 136, x2: 60, y2: 136, color: 'blue' },
          { type: 'arrow', x1: 160, y1: 200, x2: 230, y2: 200, color: 'blue' },
          { type: 'arrow', x1: 120, y1: 200, x2: 90, y2: 200, color: 'blue' },
          spot('r1', 280, 50, 'ア'),
          spot('r2', 280, 125, 'イ'),
          spot('r3', 280, 200, 'ウ'),
        ]),
        answer: 'r1',
        explanation: 'つり合うのは、2 力が一直線上にあり、向きが反対で、大きさが等しいときです。アだけが 3 つの条件をすべて満たします。イは一直線上にないので箱が回り、ウは大きさがちがうので右へ動きます。',
        hint: 'つり合いの 3 つの条件を、1 つずつ確かめよう。',
      }),
      choice({
        id: 'motion-mp3-p4', concept: 'mo-compose',
        prompt: '斜面の傾きを大きくすると、物体にはたらく重力の「斜面に平行な分力」はどうなる？',
        options: ['大きくなる', '小さくなる', '変わらない'],
        answer: 'a',
        explanation: '斜面の傾きが大きいほど、重力の斜面に平行な分力は大きく、斜面に垂直な分力は小さくなります。傾きが 90° になると、平行な分力は重力と同じ大きさになります。',
        hint: '急な斜面ほど、すべり落ちやすいね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-mp3-r1', concept: 'mo-balance',
        prompt: '1 つの物体にはたらく 2 力がつり合っているとき、2 力の大きさはどうなっている？',
        options: ['等しい', '一方が他方の 2 倍', '決まっていない'],
        answer: 'a',
        explanation: 'つり合っている 2 力は、大きさが等しく、向きが反対で、一直線上にあります。',
        hint: 'つり合いの 3 つの条件を思い出そう。',
      }),
      choice({
        id: 'motion-mp3-r2', concept: 'mo-balance',
        prompt: '天井から糸でつるしたおもりが静止しています。おもりにはたらく重力とつり合っている力はどれ？',
        options: ['糸がおもりを引く力', 'おもりが糸を引く力', '天井が糸を引く力'],
        answer: 'a',
        explanation: 'おもりにはたらく力は、下向きの重力と、上向きに糸がおもりを引く力です。この 2 力は、どちらもおもりにはたらき、一直線上・反対向き・同じ大きさなのでつり合っています。',
        hint: '「おもりに」はたらく力をさがそう。',
      }),
      drag({
        id: 'motion-mp3-r3', concept: 'mo-compose',
        prompt: '方眼の上で、点 O にはたらく力 C を、OA の向き（横の点線）と OB の向き（ななめの点線）の 2 つの分力に分けます。OB の向きの分力の矢印の先はどこ？ 青い印を動かして置こう。',
        // motion-mp3-p1 と同じ力。OB の向きの分力の先 ＝ (90,70)。不正解例は C の先の真横 (50,70)（40px）
        figure: scene([
          ...grid(10, 310, 30, 230, 40),
          { type: 'line', points: [[50, 190], [310, 190]], color: 'ink', width: 2, dashed: true },
          { type: 'line', points: [[50, 190], [110, 10]], color: 'ink', width: 2, dashed: true },
          { type: 'arrow', x1: 50, y1: 190, x2: 250, y2: 70, color: 'blue' },
          { type: 'circle', x: 50, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
          note(42, 210, 'O', 14, 'end'),
          note(306, 210, 'A', 14, 'end'),
          note(118, 26, 'B', 14),
          note(258, 66, '力 C', 13),
          { type: 'circle', id: 'mark', x: 290, y: 140, r: 10, fill: 'blue', stroke: 'blue' },
        ]),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 90, y: 70 },
        samples: { correct: { x: 90, y: 70 }, wrong: { x: 50, y: 70 } },
        explanation: '力 C の先から OA に平行な（横の）線を引き、OB の線と交わった点が OB の向きの分力の先です。C の先から左へ 4 目盛りもどった (90, 70) になります。',
        hint: 'OA に平行な線を、力 C の先から引こう。',
      }),
      choice({
        id: 'motion-mp3-r4', concept: 'mo-compose',
        prompt: '斜面上で静止している物体で、重力の「斜面に垂直な分力」とつり合っている力はどれ？',
        options: ['斜面からの垂直抗力', '斜面に平行な分力', '物体にはたらく重力'],
        answer: 'a',
        explanation: '斜面に垂直な分力は物体が斜面を押す向きの力で、斜面が物体を押し返す垂直抗力とつり合います。物体が静止しているときは、斜面に平行な分力は摩擦力とつり合っています。',
        hint: '斜面が物体を押し返す力だよ。',
      }),
    ],
  };

  // ---- ステージ motion-mp4: プリント 4 作用・反作用とつり合いの区別 ----
  const motionMp4 = {
    id: 'motion-mp4', areaId: 'mo-miniprint', title: 'プリント 4: 作用・反作用とつり合い', minutes: 5, concepts: ['mo-accel', 'mo-balance'],
    lessons: [
      {
        id: 'motion-mp4-c1',
        anim: 'mo-action-reaction',   // 動く図（js/anim-physics.js。ミニプリントの使い回し）。figure は静止図として残す
        text: 'A が B を押すと、A も B から、同じ大きさで反対向きの力を受けます（**作用・反作用の法則**）。スケートボードに乗った人がもう 1 人を押すと、押した人も押された人も、たがいに反対向きに動きます。',
        figure: scene([
          { type: 'arrow', x1: 110, y1: 60, x2: 40, y2: 60, color: 'green' },
          note(40, 44, 'A が受ける力', 13),
          { type: 'arrow', x1: 210, y1: 60, x2: 280, y2: 60, color: 'blue' },
          note(206, 44, 'B が受ける力', 13),
          { type: 'circle', x: 75, y: 96, r: 14, fill: 'pink' },
          { type: 'rect', x: 62, y: 112, width: 26, height: 64, fill: 'sky', label: 'A' },
          { type: 'circle', x: 245, y: 96, r: 14, fill: 'pink' },
          { type: 'rect', x: 232, y: 112, width: 26, height: 64, fill: 'lightgreen', label: 'B' },
          { type: 'line', points: [[88, 130], [232, 130]], color: 'pink', width: 5 },
          { type: 'rect', x: 40, y: 178, width: 70, height: 8, fill: 'brown' },
          { type: 'circle', x: 52, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 98, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          { type: 'rect', x: 210, y: 178, width: 70, height: 8, fill: 'brown' },
          { type: 'circle', x: 222, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 268, y: 192, r: 6, fill: 'ink', stroke: 'ink' },
          note(160, 226, 'A が B を押す → 2 人とも反対向きに動く', 13, 'middle'),
        ]),
      },
      {
        id: 'motion-mp4-c2',
        text: 'つり合う 2 力は **1 つの物体**にはたらき、作用・反作用の 2 力は**別々の物体**にはたらきます。机の上の本では、本の重力 X と机からの垂直抗力 Y がつり合い、Y と本が机を押す力 Z が作用・反作用です。',
        figure: scene(bookOnDesk(true)),
      },
    ],
    warmup: choice({
      id: 'motion-mp4-w1', concept: 'mo-accel',
      prompt: '予想しよう。スケートボードに乗った A さんが、前にいる B さんを押しました。押した A さんはどうなると思う？',
      options: ['押した向きと反対向きに動く', 'その場から動かない', '押した向きと同じ向きに動く'],
      answer: 'a',
      explanation: 'A さんが B さんを押すと、A さんも B さんから反対向きに押し返されます。そのため、A さんは押した向きと反対向きに動きます。このステージで、力の受け合いを確かめよう。',
      hint: '壁を押すと、自分が押し返されることを思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'motion-mp4-p1', concept: 'mo-accel',
        prompt: 'スケートボードに乗った A さんが、右にいる B さんを右向きに押しました。A さんはどう動く？（ア 左へ動く、イ 右へ動く、ウ 動かない）',
        figure: scene([
          { type: 'circle', x: 115, y: 96, r: 14, fill: 'pink' },
          { type: 'rect', x: 102, y: 112, width: 26, height: 64, fill: 'sky', label: 'A' },
          { type: 'circle', x: 205, y: 96, r: 14, fill: 'pink' },
          { type: 'rect', x: 192, y: 112, width: 26, height: 64, fill: 'lightgreen', label: 'B' },
          { type: 'line', points: [[128, 130], [192, 130]], color: 'pink', width: 5 },
          { type: 'rect', x: 80, y: 178, width: 70, height: 8, fill: 'brown' },
          { type: 'rect', x: 170, y: 178, width: 70, height: 8, fill: 'brown' },
          { type: 'arrow', x1: 90, y1: 40, x2: 40, y2: 40, color: 'gray' },
          { type: 'arrow', x1: 230, y1: 40, x2: 280, y2: 40, color: 'gray' },
          spot('r1', 40, 70, 'ア'),
          spot('r2', 280, 70, 'イ'),
          spot('r3', 160, 214, 'ウ'),
        ]),
        answer: 'r1',
        explanation: 'A さんが B さんを右向きに押すと、同時に A さんも B さんから左向きの力（反作用）を受けます。だから A さんは左へ、B さんは右へ動きます。',
        hint: '押した A さんも、B さんから力を受けるよ。',
      }),
      choice({
        id: 'motion-mp4-p2', concept: 'mo-accel',
        prompt: 'A さんが B さんを押したとき、B さんが A さんから受けた力と、A さんが B さんから受けた力の大きさをくらべると？',
        options: ['同じ大きさ', 'B さんが受けた力のほうが大きい', 'A さんが受けた力のほうが大きい'],
        answer: 'a',
        explanation: '作用と反作用の 2 力は、いつも同じ大きさです。押したほうも押されたほうも、同じ大きさの力を受けます。',
        hint: '作用・反作用の 2 力の大きさの関係を思い出そう。',
      }),
      choice({
        id: 'motion-mp4-p3', concept: 'mo-accel',
        prompt: 'A さんが B さんを押したとき、B さんが受けた力と、A さんが受けた力の向きの関係は？',
        options: ['反対向き', '同じ向き', '直角の向き'],
        answer: 'a',
        explanation: '作用と反作用の 2 力は、一直線上で反対向きにはたらきます。B さんは押された向きに、A さんはその反対向きに力を受けます。',
        hint: '2 人が動く向きを思い出そう。',
      }),
      fill({
        id: 'motion-mp4-t1', concept: 'mo-accel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物体 A が物体 B に力を加えると、同時に B も A に、大きさが等しく反対向きの力を加える。これを[b1]の法則という。',
        blanks: [word('b1', ['作用・反作用', '慣性', '仕事の原理'], '作用・反作用')],
        explanation: '力はいつも 2 つの物体のあいだで、対になってはたらきます。これが**作用・反作用の法則**です。',
        hint: '「作用」と、それに対する力の名前だよ。',
      }),
      figureChoice({
        id: 'motion-mp4-p4', concept: 'mo-balance',
        prompt: '机の上に本が置いてあります。ア・イ・ウは、本や机にはたらく力です（ア は本の中心から下向き、イ は本の下の面から上向き、ウ は机の面から下向き）。机が本を押す力（垂直抗力）はどれ？',
        figure: scene(bookOnDesk(false).concat([
          spot('r1', 112, 212, 'ア'),
          spot('r2', 175, 46, 'イ'),
          spot('r3', 222, 214, 'ウ'),
        ])),
        answer: 'r2',
        explanation: '垂直抗力は、机が本を押し返す上向きの力で、本の下の面にはたらくイです。アは本にはたらく重力、ウは本が机を押す力です。',
        hint: '「机が」「本を」押す力だから、本にはたらく上向きの力だよ。',
      }),
      choice({
        id: 'motion-mp4-p5', concept: 'mo-balance',
        prompt: '机の上の本で、X 本にはたらく重力、Y 机が本を押す力、Z 本が机を押す力 のうち、つり合っている 2 力の組はどれ？',
        options: ['X と Y', 'Y と Z', 'X と Z'],
        answer: 'a',
        explanation: 'X と Y は、どちらも「本」にはたらく力で、一直線上・反対向き・同じ大きさなのでつり合っています。Y と Z は、本と机という別々の物体にはたらく作用・反作用です。',
        hint: 'つり合う 2 力は、同じ 1 つの物体にはたらくよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-mp4-r1', concept: 'mo-balance',
        prompt: '机の上の本で、X 本にはたらく重力、Y 机が本を押す力、Z 本が机を押す力 のうち、作用・反作用の関係にある 2 力の組はどれ？',
        options: ['Y と Z', 'X と Y', 'X と Z'],
        answer: 'a',
        explanation: '本が机を押す力 Z（作用）と、机が本を押し返す力 Y（反作用）は、本と机という別々の物体にはたらく作用・反作用です。',
        hint: '「本が机を」と「机が本を」の組をさがそう。',
      }),
      figureChoice({
        id: 'motion-mp4-r2', concept: 'mo-balance',
        prompt: '机の上に本が置いてあります（ア は本の中心から下向き、イ は本の下の面から上向き、ウ は机の面から下向き）。本にはたらく重力はどれ？',
        figure: scene(bookOnDesk(false).concat([
          spot('r1', 112, 212, 'ア'),
          spot('r2', 175, 46, 'イ'),
          spot('r3', 222, 214, 'ウ'),
        ])),
        answer: 'r1',
        explanation: '重力は、物体の中心から真下向きにかきます。本の中心から下向きのアが本にはたらく重力です。ウは本が机を押す力で、机の面にはたらきます。',
        hint: '重力は物体の中心から下向きにかくよ。',
      }),
      choice({
        id: 'motion-mp4-r3', concept: 'mo-balance',
        prompt: '「2 力のつり合い」と「作用・反作用」のちがいとして正しいのはどれ？',
        options: ['つり合いの 2 力は 1 つの物体に、作用・反作用の 2 力は別々の物体にはたらく', 'つり合いの 2 力は別々の物体に、作用・反作用の 2 力は 1 つの物体にはたらく', 'どちらも 1 つの物体にはたらく'],
        answer: 'a',
        explanation: 'どちらも「一直線上・反対向き・同じ大きさ」ですが、つり合いの 2 力は 1 つの物体に、作用・反作用の 2 力は別々の物体にはたらきます。',
        hint: '力を「受けている物体」がいくつあるかでくらべよう。',
      }),
      choice({
        id: 'motion-mp4-r4', concept: 'mo-accel',
        prompt: '作用・反作用の 2 力について、正しい組み合わせはどれ？',
        options: ['一直線上にあり、向きが反対で、大きさが等しい', '一直線上にあり、向きが同じで、大きさが等しい', '平行な別の直線上にあり、向きが反対で、大きさがちがう'],
        answer: 'a',
        explanation: '作用・反作用の 2 力は、一直線上にあり、向きが反対で、大きさが等しくなります。',
        hint: '押した人と押された人が受ける力を思い出そう。',
      }),
      choice({
        id: 'motion-mp4-r5', concept: 'mo-accel',
        prompt: 'スケートボードに乗った A さんが、右にいる B さんを右向きに押しました。B さんはどう動く？',
        options: ['右へ動く', '左へ動く', '動かない'],
        answer: 'a',
        explanation: 'B さんは A さんから右向きの力を受けるので、右へ動きます。A さんは反作用で左向きの力を受け、左へ動きます。',
        hint: 'B さんが受ける力の向きは、押された向きだよ。',
      }),
    ],
  };

  // ---- ステージ motion-mp5: プリント 5 速さと記録タイマー ----
  const motionMp5 = {
    id: 'motion-mp5', areaId: 'mo-miniprint', title: 'プリント 5: 速さと記録タイマー', minutes: 5, concepts: ['mo-speed', 'mo-accel'],
    lessons: [
      {
        id: 'motion-mp5-c1',
        text: '速さ ＝ 距離 ÷ 時間、距離 ＝ 速さ × 時間、時間 ＝ 距離 ÷ 速さ です。秒速を時速になおすには、1 時間 ＝ 3600 秒を使います。秒速 10 m は、1 時間で 36000 m 進むので時速 36 km です。',
        // 「距離」を上、「速さ」「時間」を下に書いた円（上 ÷ 下、下 × 下）
        figure: scene([
          { type: 'circle', x: 110, y: 124, r: 80, fill: 'white', stroke: 'ink' },
          { type: 'line', points: [[30, 124], [190, 124]], width: 2 },
          { type: 'line', points: [[110, 124], [110, 204]], width: 2 },
          note(110, 96, '距離', 18, 'middle'),
          note(72, 168, '速さ', 16, 'middle'),
          note(148, 168, '時間', 16, 'middle'),
          note(204, 70, '速さ ＝ 距離 ÷ 時間', 12),
          note(204, 100, '時間 ＝ 距離 ÷ 速さ', 12),
          note(204, 130, '距離 ＝ 速さ × 時間', 12),
          note(204, 186, '秒速 10 m', 12),
          note(204, 206, '＝ 時速 36 km', 12),
        ]),
      },
      {
        id: 'motion-mp5-c2',
        anim: 'mo-timer-tape',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '**記録タイマー**の打点の間隔が広いほど、速く動いています。1 秒間に 50 打点のタイマーでは、10 打点の間が 0.2 秒です。斜面を下る台車には斜面に沿って下向きの力がはたらき続けるので、だんだん速くなります。',
        figure: scene([
          note(10, 30, '同じ時間ごとの打点', 13),
          ...tape(80, dots(30, [30, 30, 30, 30, 30, 30, 30, 30]), 280),
          note(300, 110, '速く引いた（間隔が広い）', 12, 'end'),
          ...tape(160, dots(30, [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]), 280),
          note(300, 190, 'ゆっくり引いた（間隔がせまい）', 12, 'end'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp5-w1', concept: 'mo-speed',
      prompt: '予想しよう。記録タイマーに通した紙テープを、手で速く引くと、打点の間隔はどうなると思う？',
      options: ['広くなる', 'せまくなる', '変わらない'],
      answer: 'a',
      explanation: '記録タイマーは同じ時間ごとに点を打つので、速く引くほど、そのあいだにテープが長く進み、間隔が広くなります。このステージで、速さの計算と記録の読み方を練習しよう。',
      hint: '同じ時間に進む距離が長くなるのは、速いときかな。',
    }),
    problems: [
      fill({
        id: 'motion-mp5-p1', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '120 km の道のりを、時速 40 km で走ると[b1]かかる。',
        blanks: [number('b1', 3, 0, '時間')],
        explanation: '時間 ＝ 距離 ÷ 速さ ＝ 120 km ÷ 40 km/h ＝ 3 時間です。',
        hint: '距離を速さでわろう。',
      }),
      figureChoice({
        id: 'motion-mp5-p2', concept: 'mo-speed',
        prompt: '記録タイマーに紙テープを通して、手で引いた記録がア・イです（打点は同じ時間ごと）。手を速く動かしたときの記録はどれ？',
        figure: scene([
          ...tape(80, dots(30, [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]), 230),
          ...tape(160, dots(30, [36, 36, 36, 36, 36, 36]), 230),
          spot('r1', 284, 80, 'ア'),
          spot('r2', 284, 160, 'イ'),
        ]),
        answer: 'r2',
        explanation: '打点は同じ時間ごとに打たれるので、間隔が広いほど速く動いています。間隔が広いイが、手を速く動かしたときの記録です。',
        hint: '同じ時間で長く進んだのはどちらかな。',
      }),
      fill({
        id: 'motion-mp5-p3', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。（記録タイマーは 1 秒間に 50 回打点する）',
        text: '紙テープで、10 打点ぶんの長さが 8 cm だった。この間の平均の速さは秒速[b1]である。',
        blanks: [number('b1', 40, 0.1, 'cm')],
        explanation: '10 打点ぶんは 0.02 秒 × 10 ＝ 0.2 秒です。速さは 8 cm ÷ 0.2 s ＝ 40 cm/s（秒速 40 cm）です。',
        hint: 'まず、10 打点ぶんが何秒かを考えよう。',
      }),
      choice({
        id: 'motion-mp5-p4', concept: 'mo-accel',
        prompt: '斜面を下る台車の運動を記録し、テープを 5 打点ごとに切って並べると、だんだん長くなっていました。台車の速さはどうなっている？',
        options: ['だんだん速くなる', 'だんだんおそくなる', '一定'],
        answer: 'a',
        explanation: '5 打点ぶん（0.1 秒）に進む距離がだんだん長くなっているので、台車はだんだん速くなっています。',
        hint: '同じ時間に進む距離が長くなっていくね。',
      }),
      choice({
        id: 'motion-mp5-p5', concept: 'mo-accel',
        prompt: '斜面を下る台車がだんだん速くなるのは、台車に何の力がはたらき続けるから？',
        options: ['斜面に沿って下る向きにはたらく力', '斜面を垂直に押す力', '垂直抗力', '摩擦力'],
        answer: 'a',
        explanation: '台車には、重力の分力のうち、斜面に沿って下る向きの力が運動の向きにはたらき続けます。そのため、速さが一定の割合で増えていきます。',
        hint: '運動の向きと同じ向きにはたらく力をさがそう。',
      }),
      fill({
        id: 'motion-mp5-t1', concept: 'mo-speed', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '一定の時間ごとに紙テープに点を打ち、物体の運動を記録する装置を[b1]という。',
        blanks: [word('b1', ['記録タイマー', 'ばねばかり', '電流計'], '記録タイマー')],
        explanation: '**記録タイマー**は、1 秒間に 50 回（地域によっては 60 回）など、一定の時間ごとに打点します。打点の間隔から速さが分かります。',
        hint: '時間ごとに「記録」する装置だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'motion-mp5-r1', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '12 km の道のりを 3 時間で歩いた人の平均の速さは、時速[b1]である。',
        blanks: [number('b1', 4, 0.1, 'km')],
        explanation: '速さ ＝ 距離 ÷ 時間 ＝ 12 km ÷ 3 時間 ＝ 時速 4 km です。',
        hint: '距離を時間でわろう。',
      }),
      fill({
        id: 'motion-mp5-r2', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '時速 50 km で 4 時間走ると、進む距離は[b1]である。',
        blanks: [number('b1', 200, 0.1, 'km')],
        explanation: '距離 ＝ 速さ × 時間 ＝ 50 km/h × 4 h ＝ 200 km です。',
        hint: '速さに時間をかけよう。',
      }),
      fill({
        id: 'motion-mp5-r3', concept: 'mo-speed',
        prompt: '空らんに入る数を入れよう。',
        text: '200 m を 40 秒で走った人の速さは、秒速[b1]で、時速になおすと[b2]である。',
        blanks: [number('b1', 5, 0.1, 'm'), number('b2', 18, 0.1, 'km')],
        explanation: '200 ÷ 40 ＝ 5 m/s です。1 時間（3600 秒）では 5 × 3600 ＝ 18000 m ＝ 18 km 進むので、時速 18 km です。',
        hint: '1 時間は 3600 秒、1 km は 1000 m だよ。',
      }),
      figureChoice({
        id: 'motion-mp5-r4', concept: 'mo-speed',
        prompt: '記録タイマーに紙テープを通して、手で引いた記録がア・イです（打点は同じ時間ごと）。手をゆっくり動かしたときの記録はどれ？',
        figure: scene([
          ...tape(80, dots(30, [36, 36, 36, 36, 36, 36]), 230),
          ...tape(160, dots(30, [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]), 230),
          spot('r1', 284, 80, 'ア'),
          spot('r2', 284, 160, 'イ'),
        ]),
        answer: 'r2',
        explanation: '間隔がせまいほど、同じ時間に進んだ距離が短いので、ゆっくり動いています。間隔がせまいイが、ゆっくり動かしたときの記録です。',
        hint: '間隔がせまいのはどちらかな。',
      }),
      choice({
        id: 'motion-mp5-r5', concept: 'mo-accel',
        prompt: '斜面を下る台車の 5 打点ごとのテープの長さが、1 本目から順に 2 cm、4 cm、6 cm と増えていきました。4 本目の長さは何 cm になると考えられる？',
        options: ['8 cm', '6 cm', '10 cm'],
        answer: 'a',
        explanation: 'テープは 1 本ごとに 2 cm ずつ長くなっています。斜面に沿った力がはたらき続けて、速さが一定の割合で増えるからです。4 本目は 6 ＋ 2 ＝ 8 cm です。',
        hint: '1 本ごとに何 cm ずつ増えているかな。',
      }),
      choice({
        id: 'motion-mp5-r6', concept: 'mo-accel',
        prompt: '斜面を下る台車について、正しいのはどれ？',
        options: ['速さは一定の割合で増えていく', '速さははじめだけ増え、あとは一定になる', '速さはだんだん減っていく'],
        answer: 'a',
        explanation: '斜面に沿って下向きの力は、台車が下るあいだずっと同じ大きさではたらくので、速さは一定の割合で増え続けます。',
        hint: '力がはたらき続けると、速さはどうなるかな。',
      }),
    ],
  };

  // ---- ステージ motion-mp6: プリント 6 減速・等速直線運動・慣性 ----
  const motionMp6 = {
    id: 'motion-mp6', areaId: 'mo-miniprint', title: 'プリント 6: 減速・等速直線運動・慣性', minutes: 5, concepts: ['mo-accel'],
    lessons: [
      {
        id: 'motion-mp6-c1',
        anim: 'mo-friction-slow',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '机の上をすべる木片には、運動と反対向きに**摩擦力**がはたらき続けるので、だんだんおそくなって止まります。摩擦や空気の抵抗がなければ、水平面上の台車は**等速直線運動**を続けます。',
        figure: scene([
          { type: 'line', points: [[10, 170], [310, 170]], color: 'line', width: 3 },
          { type: 'rect', x: 130, y: 128, width: 60, height: 42, fill: 'brown', label: '木片' },
          { type: 'arrow', x1: 140, y1: 100, x2: 220, y2: 100, color: 'gray' },
          note(140, 88, '運動の向き', 13),
          { type: 'arrow', x1: 140, y1: 166, x2: 80, y2: 166, color: 'blue' },
          note(30, 200, '摩擦力（運動と反対向き）', 13),
          note(10, 30, '手をはなしたあと → だんだんおそくなる', 13),
        ]),
      },
      {
        id: 'motion-mp6-c2',
        anim: 'mo-uniform-graph',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '等速直線運動では、時間と速さのグラフは横軸に平行な直線、時間と移動距離のグラフは原点を通る右上がりの直線になります。移動距離は時間に比例します。',
        figure: scene([
          ...miniAxes(40), ...miniAxes(190),
          { type: 'line', points: [[40, 110], [128, 110]], color: 'blue', width: 3 },
          { type: 'line', points: [[190, 170], [278, 62]], color: 'blue', width: 3 },
          note(40, 40, '速さ', 12),
          note(190, 40, '移動距離', 12),
          note(132, 190, '時間', 12, 'end'),
          note(282, 190, '時間', 12, 'end'),
          note(84, 220, '速さは一定', 13, 'middle'),
          note(234, 220, '距離は時間に比例', 13, 'middle'),
        ]),
      },
      {
        id: 'motion-mp6-c3',
        anim: 'mo-inertia-start',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '力がはたらかないとき、静止している物体は静止し続け、動いている物体は等速直線運動を続けます（**慣性の法則**）。止まっていた電車が急に動き出すと、乗客のからだは止まったままでいようとして、後ろへかたむきます。',
        figure: scene([
          note(20, 30, '電車が急に動き出すと、からだは後ろへ', 14),
          { type: 'arrow', x1: 120, y1: 60, x2: 200, y2: 60, color: 'gray', label: '動き出す向き' },
          { type: 'rect', x: 40, y: 80, width: 240, height: 100, fill: 'white', stroke: 'ink', rx: 8 },
          { type: 'line', points: [[20, 200], [300, 200]], color: 'line', width: 3 },
          { type: 'circle', x: 80, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
          { type: 'circle', x: 240, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
          { type: 'line', points: [[168, 178], [152, 122]], color: 'ink', width: 4 },
          { type: 'circle', x: 148, y: 108, r: 12, fill: 'pink' },
          { type: 'arrow', x1: 132, y1: 120, x2: 86, y2: 120, color: 'blue' },
          note(88, 148, '後ろへ', 14),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp6-w1', concept: 'mo-accel',
      prompt: '予想しよう。氷の上のように摩擦がほとんどない水平面で、物体を押してはなすと、どうなると思う？',
      options: ['ほぼ同じ速さで進み続ける', 'すぐに止まる', 'だんだん速くなる'],
      answer: 'a',
      explanation: '摩擦がほとんどなければ、運動の向きに力がはたらかないので、物体はほぼ同じ速さで進み続けます。力と運動の関係を、このステージで確かめよう。',
      hint: '物体を止めようとする力が、ほとんどないね。',
    }),
    problems: [
      choice({
        id: 'motion-mp6-p1', concept: 'mo-accel',
        prompt: '机の上で木片をすべらせました。手がはなれてから止まるまで、木片の速さはどうなる？',
        options: ['しだいに小さくなる', 'しだいに大きくなる', '一定のまま'],
        answer: 'a',
        explanation: '木片には運動と反対向きに摩擦力がはたらき続けるので、速さはしだいに小さくなり、やがて止まります。',
        hint: '木片の動きをさまたげる力があるよ。',
      }),
      figureChoice({
        id: 'motion-mp6-p2', concept: 'mo-accel',
        prompt: '机の上を右へすべっている木片に、摩擦力がはたらいています。摩擦力の向きはどれ？（ア 真上、イ 真下、ウ 進む向き、エ 進む向きと反対）',
        figure: scene([
          { type: 'line', points: [[10, 170], [310, 170]], color: 'line', width: 3 },
          { type: 'rect', x: 130, y: 110, width: 60, height: 60, fill: 'brown' },
          { type: 'arrow', x1: 120, y1: 34, x2: 200, y2: 34, color: 'gray' },
          note(210, 40, '進む向き', 13),
          { type: 'arrow', x1: 160, y1: 140, x2: 160, y2: 76, color: 'blue' },
          { type: 'arrow', x1: 160, y1: 140, x2: 160, y2: 210, color: 'blue' },
          { type: 'arrow', x1: 190, y1: 140, x2: 252, y2: 140, color: 'blue' },
          { type: 'arrow', x1: 130, y1: 140, x2: 68, y2: 140, color: 'blue' },
          spot('r1', 160, 58, 'ア'),
          spot('r2', 196, 212, 'イ'),
          spot('r3', 278, 140, 'ウ'),
          spot('r4', 42, 140, 'エ'),
        ]),
        answer: 'r4',
        explanation: '摩擦力は、物体と面がふれ合うところで、運動をさまたげる向き、つまり進む向きと反対向き（エ）にはたらきます。',
        hint: '摩擦力は、動きを止めようとする向きにはたらくよ。',
      }),
      figureChoice({
        id: 'motion-mp6-p3', concept: 'mo-accel',
        prompt: 'ア〜ウは、時間（横軸）と速さ（縦軸）の関係を表したグラフです（ア 横軸に平行、イ 原点を通る右上がり、ウ 右下がり）。等速直線運動を表すのはどれ？',
        figure: scene([
          note(10, 28, '横軸: 時間　縦軸: 速さ', 13),
          ...[20, 120, 220].flatMap(ox => miniAxes(ox)),
          { type: 'line', points: [[20, 115], [100, 115]], color: 'blue', width: 3 },
          { type: 'line', points: [[120, 170], [200, 70]], color: 'blue', width: 3 },
          { type: 'line', points: [[220, 75], [300, 160]], color: 'blue', width: 3 },
          spot('r1', 64, 210, 'ア'),
          spot('r2', 164, 210, 'イ'),
          spot('r3', 264, 210, 'ウ'),
        ]),
        answer: 'r1',
        explanation: '等速直線運動では、速さが時間によらず一定なので、時間と速さのグラフは横軸に平行な直線（ア）になります。イはだんだん速くなる運動、ウはだんだんおそくなる運動です。',
        hint: '速さが変わらないグラフはどれかな。',
      }),
      fill({
        id: 'motion-mp6-t1', concept: 'mo-accel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ほかの物体から力がはたらかないとき、静止している物体はいつまでも静止し、運動している物体は[b1]を続ける。これを[b2]の法則という。',
        blanks: [
          word('b1', ['等速直線運動', 'だんだんおそくなる運動', 'だんだん速くなる運動'], '等速直線運動'),
          word('b2', ['慣性', '作用・反作用', '仕事の原理'], '慣性'),
        ],
        explanation: '力がはたらかなければ、物体はそれまでの運動の状態を続けます。動いている物体は**等速直線運動**を続けます。これが**慣性の法則**です。',
        hint: '物体が「今の状態を続けようとする」性質の名前だよ。',
      }),
      choice({
        id: 'motion-mp6-p4', concept: 'mo-accel',
        prompt: '止まっていたバスが急に動き出しました。立っている乗客のからだはどちらにかたむく？',
        options: ['バスが進む向きと反対（後ろ）', 'バスが進む向き（前）', 'どちらにもかたむかない'],
        answer: 'a',
        explanation: 'からだは慣性によって止まったままでいようとしますが、足元の床は前へ動き出します。そのため、からだは後ろへかたむきます。',
        hint: 'からだは「止まったまま」でいようとするよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-mp6-r1', concept: 'mo-accel',
        prompt: '机の上をすべる木片が、だんだんおそくなって止まるのは、木片に何という力がはたらくから？',
        options: ['摩擦力', '垂直抗力', '磁力'],
        answer: 'a',
        explanation: '木片と机がふれ合う面で、運動と反対向きに摩擦力がはたらき続けるので、木片はおそくなって止まります。',
        hint: 'ふれ合う面ではたらき、動きをさまたげる力だよ。',
      }),
      figureChoice({
        id: 'motion-mp6-r2', concept: 'mo-accel',
        prompt: 'ア〜ウは、時間（横軸）と移動距離（縦軸）の関係を表したグラフです（ア 横軸に平行、イ 原点を通る右上がりの直線、ウ 右下がり）。等速直線運動を表すのはどれ？',
        figure: scene([
          note(10, 28, '横軸: 時間　縦軸: 移動距離', 13),
          ...[20, 120, 220].flatMap(ox => miniAxes(ox)),
          { type: 'line', points: [[20, 115], [100, 115]], color: 'blue', width: 3 },
          { type: 'line', points: [[120, 170], [200, 70]], color: 'blue', width: 3 },
          { type: 'line', points: [[220, 75], [300, 160]], color: 'blue', width: 3 },
          spot('r1', 64, 210, 'ア'),
          spot('r2', 164, 210, 'イ'),
          spot('r3', 264, 210, 'ウ'),
        ]),
        answer: 'r2',
        explanation: '等速直線運動では、同じ時間に同じ距離だけ進むので、移動距離は時間に比例します。グラフは原点を通る右上がりの直線（イ）です。',
        hint: '時間が 2 倍になると、進む距離も 2 倍になるよ。',
      }),
      choice({
        id: 'motion-mp6-r3', concept: 'mo-accel',
        prompt: '台車を水平面で走らせました。摩擦や空気の抵抗がまったくないとすると、台車はどんな運動を続ける？',
        options: ['等速直線運動', 'だんだんおそくなる運動', 'だんだん速くなる運動'],
        answer: 'a',
        explanation: '運動の向きに力がはたらかないので、慣性の法則により、台車は同じ速さで一直線に進み続けます（等速直線運動）。',
        hint: '台車を止めようとする力がないときを考えよう。',
      }),
      choice({
        id: 'motion-mp6-r4', concept: 'mo-accel',
        prompt: '走っていた電車が急に止まりました。立っている乗客のからだはどちらにかたむく？',
        options: ['電車が進んでいた向き（前）', '電車が進んでいた向きと反対（後ろ）', 'どちらにもかたむかない'],
        answer: 'a',
        explanation: 'からだは慣性によって、それまでと同じ速さで進み続けようとします。電車だけが止まるので、からだは前へかたむきます。',
        hint: 'からだは「動き続けよう」とするよ。',
      }),
    ],
  };

  // ---- ステージ motion-mp7: プリント 7 仕事の計算 ----
  const motionMp7 = {
    id: 'motion-mp7', areaId: 'mo-miniprint', title: 'プリント 7: 仕事の計算', minutes: 5, concepts: ['mo-work'],
    lessons: [
      {
        id: 'motion-mp7-c1',
        text: '理科の**仕事**は「力の大きさ〔N〕× 力の向きに動いた距離〔m〕」で、単位は**ジュール**（J）です。100 g の物体にはたらく重力を 1 N とすると、800 g の物体を 2 m 持ち上げる仕事は 8 N × 2 m ＝ 16 J です。',
        figure: scene([
          { type: 'line', points: [[20, 200], [180, 200]], color: 'line', width: 3 },
          { type: 'rect', x: 60, y: 160, width: 50, height: 40, fill: 'white', stroke: 'gray' },
          { type: 'rect', x: 60, y: 60, width: 50, height: 40, fill: 'sand', label: '800 g' },
          { type: 'arrow', x1: 85, y1: 154, x2: 85, y2: 106, color: 'blue' },
          note(92, 134, '8 N', 13),
          { type: 'arrow', x1: 140, y1: 196, x2: 140, y2: 104, color: 'gray' },
          note(148, 156, '2 m', 14),
          note(190, 70, '仕事 ＝ 力 × 距離', 14),
          note(190, 100, '8 N × 2 m', 14),
          note(190, 126, '＝ 16 J', 14),
          note(190, 180, '100 g → 1 N', 13),
        ]),
      },
      {
        id: 'motion-mp7-c2',
        text: '床の上の物体を一定の速さで引くときは、**摩擦力**と同じ大きさの力で引きます。仕事は「引く力 × 引いた距離」です。床をすべりやすくすると、引く力が小さくなるので、同じ距離でも仕事は小さくなります。',
        figure: scene([
          { type: 'line', points: [[10, 180], [310, 180]], color: 'line', width: 3 },
          { type: 'rect', x: 120, y: 132, width: 70, height: 48, fill: 'sand', label: '箱' },
          { type: 'arrow', x1: 190, y1: 150, x2: 270, y2: 150, color: 'blue', label: '引く力' },
          { type: 'arrow', x1: 120, y1: 176, x2: 60, y2: 176, color: 'blue' },
          note(30, 206, '摩擦力（引く力と同じ大きさ）', 13),
          note(10, 30, '一定の速さで引く: 引く力 ＝ 摩擦力', 13),
          note(10, 52, '仕事 ＝ 引く力 × 引いた距離', 13),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp7-w1', concept: 'mo-work',
      prompt: '予想しよう。理科でいう「仕事」の単位はどれだと思う？',
      options: ['J（ジュール）', 'N（ニュートン）', 'W（ワット）'],
      answer: 'a',
      explanation: '仕事の単位はジュール（J）です。N は力の単位、W は仕事率の単位です。仕事の計算を、このステージで練習しよう。',
      hint: '力の単位は N だったね。仕事はそれとはちがう単位だよ。',
    }),
    problems: [
      fill({
        id: 'motion-mp7-t1', concept: 'mo-work', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '仕事 ＝ 力の大きさ × [b1] で求められ、単位は[b2]（記号 J）である。',
        blanks: [
          word('b1', ['力の向きに動いた距離', 'かかった時間', '物体の質量'], '力の向きに動いた距離'),
          word('b2', ['ジュール', 'ニュートン', 'ワット'], 'ジュール'),
        ],
        explanation: '**仕事**は、力の大きさと、力の向きに動いた距離の積です。単位は**ジュール**（J）で、1 N の力で 1 m 動かしたときの仕事が 1 J です。',
        hint: '「どれだけの力で、どれだけ動かしたか」だよ。',
      }),
      fill({
        id: 'motion-mp7-p1', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
        text: '質量 40 kg の物体を、60 cm の高さまで持ち上げたときの仕事は[b1]である。',
        blanks: [number('b1', 240, 0.1, 'J')],
        explanation: '40 kg ＝ 40000 g なので、重力は 400 N です。60 cm ＝ 0.6 m なので、仕事は 400 N × 0.6 m ＝ 240 J です。',
        hint: 'kg を N に、cm を m になおしてから計算しよう。',
      }),
      fill({
        id: 'motion-mp7-p2', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: '質量 1 kg の物体を、ばねばかりで 4 N の力で水平に引き、一定の速さで 0.6 m 動かした。手がした仕事は[b1]である。',
        blanks: [number('b1', 2.4, 0.01, 'J')],
        explanation: '仕事は「力の向きに動いた距離」で考えます。引く力 4 N の向き（水平）に 0.6 m 動いたので、4 N × 0.6 m ＝ 2.4 J です。物体の重さ（10 N）は使いません。',
        hint: '水平に引くときは、引く力に引いた距離をかけるよ。',
      }),
      figureChoice({
        id: 'motion-mp7-p3', concept: 'mo-work',
        prompt: '床の上の箱を、30 N の力で水平に引いて、一定の速さで動かしています。ア〜ウのうち、引く力 30 N と同じ大きさの力はどれ？（ア 床から箱にはたらく、進む向きと反対向きの力、イ 箱にはたらく重力、ウ 床が箱を押し上げる力）',
        figure: scene(floorBox().concat([
          { type: 'arrow', x1: 120, y1: 176, x2: 60, y2: 176, color: 'green' },
          { type: 'arrow', x1: 155, y1: 156, x2: 155, y2: 226, color: 'green' },
          { type: 'arrow', x1: 175, y1: 180, x2: 175, y2: 100, color: 'green' },
          spot('r1', 36, 176, 'ア'),
          spot('r2', 120, 220, 'イ'),
          spot('r3', 204, 96, 'ウ'),
        ])),
        answer: 'r1',
        explanation: '一定の速さで動いているので、引く力とつり合っているのは、進む向きと反対向きにはたらく摩擦力（ア）です。だから摩擦力も 30 N です。',
        hint: '一定の速さで動くとき、引く力は何の力とつり合っているかな。',
      }),
      choice({
        id: 'motion-mp7-p4', concept: 'mo-work',
        prompt: '床の上の物体を水平に 0.6 m 引いたあと、床に油をぬってすべりやすくし、同じ物体を同じ 0.6 m 引きました。手がした仕事が大きいのはどちら？',
        options: ['油をぬる前', '油をぬったあと', 'どちらも同じ'],
        answer: 'a',
        explanation: '油をぬると摩擦力が小さくなり、引く力も小さくてすみます。距離が同じなら、引く力が大きい「油をぬる前」のほうが、仕事が大きくなります。',
        hint: '仕事 ＝ 力 × 距離。距離が同じなら、力の大きいほうだよ。',
      }),
      fill({
        id: 'motion-mp7-p5', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: '質量 5 kg の物体を床の上で水平に引くのに、30 N の力が必要だった。この力で 4 m 引いたときの仕事は[b1]である。',
        blanks: [number('b1', 120, 0.1, 'J')],
        explanation: '仕事 ＝ 引く力 × 引いた距離 ＝ 30 N × 4 m ＝ 120 J です。物体を持ち上げる力（50 N）ではなく、実際に引いた力を使います。',
        hint: '水平に引くときは、引く力を使うよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'motion-mp7-r1', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: '6 N の力を加えながら、物体を 1.5 m 持ち上げたときの仕事は[b1]である。',
        blanks: [number('b1', 9, 0.1, 'J')],
        explanation: '仕事 ＝ 力 × 距離 ＝ 6 N × 1.5 m ＝ 9 J です。',
        hint: '力と距離をかけ算しよう。',
      }),
      fill({
        id: 'motion-mp7-r2', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
        text: '質量 300 g の物体を、1.2 m の高さまで持ち上げたときの仕事は[b1]である。',
        blanks: [number('b1', 3.6, 0.01, 'J')],
        explanation: '300 g の物体の重力は 3 N です。仕事は 3 N × 1.2 m ＝ 3.6 J です。',
        hint: 'まず g を N になおそう。',
      }),
      fill({
        id: 'motion-mp7-r3', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
        text: '質量 1 kg の物体を、ゆっくり真上に持ち上げるのに必要な力は[b1]、質量 5 kg の物体では[b2]である。',
        blanks: [number('b1', 10, 0, 'N'), number('b2', 50, 0, 'N')],
        explanation: '1 kg ＝ 1000 g なので、重力は 10 N です。持ち上げるには重力と同じ 10 N の力が必要です。5 kg なら 50 N です。',
        hint: '1 kg は何 g かな。100 g で 1 N だよ。',
      }),
    ],
  };

  // ---- ステージ motion-mp8: プリント 8 滑車・斜面と仕事の原理 ----
  const motionMp8 = {
    id: 'motion-mp8', areaId: 'mo-miniprint', title: 'プリント 8: 滑車・斜面と仕事の原理', minutes: 5, concepts: ['mo-work'],
    lessons: [
      {
        id: 'motion-mp8-c1',
        anim: 'mo-pulley-compare',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: '**定滑車**は力の向きを変えるだけで、引く力も引く距離も、直接持ち上げるときと同じです。**動滑車**を使うと、引く力は半分になりますが、ひもを引く距離は 2 倍になります。',
        figure: scene(twoPulleys().concat([
          note(80, 206, '定滑車', 14, 'middle'),
          note(80, 226, '力も距離も同じ', 12, 'middle'),
          note(230, 220, '動滑車', 14, 'middle'),
          note(316, 178, '力は半分', 12, 'end'),
          note(316, 198, '距離は 2 倍', 12, 'end'),
        ])),
      },
      {
        id: 'motion-mp8-c2',
        text: '斜面を使うと、小さい力で物体を引き上げられますが、引く距離は長くなります。道具を使っても使わなくても、仕事の大きさは変わりません。これを**仕事の原理**といいます。',
        // 高さ 2 m、斜面の長さ 4 m（図の長さは目安）。40 N の物体なら直接でも斜面でも 80 J
        figure: scene([
          { type: 'polygon', points: [[30, 200], [290, 200], [290, 70]], fill: 'sand', stroke: 'line' },
          { type: 'polygon', points: [[150, 140], [180, 125], [190, 145], [160, 160]], fill: 'gray', stroke: 'ink' },
          { type: 'arrow', x1: 190, y1: 132, x2: 240, y2: 107, color: 'blue' },
          note(296, 140, '2 m', 13),
          note(130, 116, '4 m', 13, 'end'),
          note(10, 30, '直接: 40 N × 2 m ＝ 80 J', 13),
          note(10, 52, '斜面: 20 N × 4 m ＝ 80 J', 13),
          note(160, 226, '道具を使っても仕事は同じ（図の長さは目安）', 12, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp8-w1', concept: 'mo-work',
      prompt: '予想しよう。動滑車を使って物体を持ち上げると、ひもを引く力は、直接持ち上げるときとくらべてどうなると思う？',
      options: ['半分になる', '2 倍になる', '変わらない'],
      answer: 'a',
      explanation: '動滑車では、物体を 2 本のひもで支えるので、引く力は半分になります。そのかわり、引く距離は 2 倍です。道具と仕事の関係を、このステージで学ぼう。',
      hint: '物体を何本のひもで支えているか考えよう。',
    }),
    problems: [
      fill({
        id: 'motion-mp8-p1', concept: 'mo-work',
        prompt: '質量 20 kg の物体を、定滑車を使って 1.5 m の高さまで引き上げます。空らんに入る数を入れよう。（100 g の物体にはたらく重力を 1 N とし、滑車の重さ・摩擦は考えない）',
        text: 'ひもを引く力は[b1]、ひもを引く距離は[b2]、手が物体にした仕事は[b3]である。',
        blanks: [number('b1', 200, 0, 'N'), number('b2', 1.5, 0.01, 'm'), number('b3', 300, 0.1, 'J')],
        explanation: '20 kg の物体の重力は 200 N です。定滑車は力の向きを変えるだけなので、引く力は 200 N、引く距離は 1.5 m です。仕事は 200 N × 1.5 m ＝ 300 J です。',
        hint: '定滑車は、力の大きさも距離も変えないよ。',
      }),
      figureChoice({
        id: 'motion-mp8-p2', concept: 'mo-work',
        prompt: '図のア・イは、おもりを持ち上げる 2 種類の滑車です。ひもを引く力が、おもりの重さの半分ですむのはどちら？',
        figure: scene(twoPulleys().concat([
          spot('r1', 80, 210, 'ア'),
          spot('r2', 290, 170, 'イ'),
        ])),
        answer: 'r2',
        explanation: 'イは、おもりといっしょに動く動滑車です。おもりを左右 2 本のひもで支えるので、引く力は半分ですみます。アは天井に固定された定滑車で、力の向きを変えるだけです。',
        hint: 'おもりといっしょに滑車が動くのはどちらかな。',
      }),
      fill({
        id: 'motion-mp8-p3', concept: 'mo-work',
        prompt: '質量 500 g の物体を 0.4 m 持ち上げます。空らんに入る数を入れよう。（100 g の物体にはたらく重力を 1 N とし、滑車の重さ・摩擦は考えない）',
        text: '直接持ち上げるときの仕事は[b1]。動滑車を使うと、ひもを引く力は[b2]、引く距離は[b3]になる。',
        blanks: [number('b1', 2, 0.01, 'J'), number('b2', 2.5, 0.01, 'N'), number('b3', 0.8, 0.01, 'm')],
        explanation: '500 g の物体の重力は 5 N なので、直接の仕事は 5 N × 0.4 m ＝ 2 J です。動滑車では力が半分の 2.5 N、距離が 2 倍の 0.8 m で、仕事は 2.5 × 0.8 ＝ 2 J と変わりません。',
        hint: '動滑車は「力は半分、距離は 2 倍」。',
      }),
      fill({
        id: 'motion-mp8-t1', concept: 'mo-work', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '滑車や斜面などの道具を使うと、力は小さくできるが、動かす距離は長くなり、仕事の大きさは変わらない。これを[b1]という。',
        blanks: [word('b1', ['仕事の原理', '慣性の法則', 'エネルギーの保存'], '仕事の原理')],
        explanation: '道具を使っても使わなくても仕事が変わらないことを**仕事の原理**といいます。',
        hint: '「仕事」についての決まりだよ。',
      }),
      fill({
        id: 'motion-mp8-p4', concept: 'mo-work',
        prompt: '重さ 40 N の物体を、摩擦のない斜面にそって、高さ 2 m まで引き上げます。斜面の長さは 4 m です。空らんに入る数を入れよう。',
        text: '直接持ち上げるときの仕事は[b1]で、斜面にそって引き上げる力は[b2]である。',
        blanks: [number('b1', 80, 0.1, 'J'), number('b2', 20, 0.1, 'N')],
        explanation: '直接の仕事は 40 N × 2 m ＝ 80 J です。仕事の原理より、斜面を使っても仕事は 80 J なので、引く力は 80 J ÷ 4 m ＝ 20 N です。',
        hint: '斜面を使っても仕事は同じ。仕事 ÷ 斜面の長さ で力が出るよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'motion-mp8-r1', concept: 'mo-work',
        prompt: '質量 20 kg の物体を、動滑車を使って 1.5 m の高さまで引き上げます。空らんに入る数を入れよう。（100 g の物体にはたらく重力を 1 N とし、滑車の重さ・摩擦は考えない）',
        text: 'ひもを引く力は[b1]で、ひもを引く距離は[b2]である。',
        blanks: [number('b1', 100, 0, 'N'), number('b2', 3, 0.01, 'm')],
        explanation: '物体の重力は 200 N です。動滑車では力が半分の 100 N、引く距離が 2 倍の 3 m になります。仕事は 100 N × 3 m ＝ 300 J で、直接と同じです。',
        hint: '動滑車は「力は半分、距離は 2 倍」。',
      }),
      choice({
        id: 'motion-mp8-r2', concept: 'mo-work',
        prompt: '定滑車のはたらきとして正しいのはどれ？',
        options: ['力の向きを変える', '力を半分にする', '仕事を小さくする'],
        answer: 'a',
        explanation: '定滑車は天井などに固定されていて、下向きに引く力で物体を上へ持ち上げるなど、力の向きを変えるはたらきをします。力の大きさや仕事は変わりません。',
        hint: '定滑車は動かない滑車だよ。',
      }),
      fill({
        id: 'motion-mp8-r3', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: '重さ 40 N の物体を、摩擦のない斜面にそって高さ 2 m まで引き上げた。仕事の原理より、斜面を使ったときの仕事は[b1]である。',
        blanks: [number('b1', 80, 0.1, 'J')],
        explanation: '直接持ち上げる仕事は 40 N × 2 m ＝ 80 J です。仕事の原理より、斜面を使っても仕事は同じ 80 J です。',
        hint: '直接持ち上げるときの仕事と同じだよ。',
      }),
    ],
  };

  // ---- ステージ motion-mp9: プリント 9 てこと仕事率 ----
  const motionMp9 = {
    id: 'motion-mp9', areaId: 'mo-miniprint', title: 'プリント 9: てこと仕事率', minutes: 5, concepts: ['mo-work'],
    lessons: [
      {
        id: 'motion-mp9-c1',
        anim: 'mo-lever',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: 'てこを使うと、支点から遠いところを押すほど小さい力ですみますが、押し下げる距離は長くなります。支点から物体まで 1 m、手まで 4 m なら、力は 4 分の 1、押し下げる距離は 4 倍で、仕事は変わりません。',
        figure: scene(lever().concat([
          { type: 'arrow', x1: 290, y1: 110, x2: 290, y2: 146, color: 'blue' },
          note(90, 214, '支点', 13, 'middle'),
          note(62, 174, '1 m', 13, 'middle'),
          note(190, 174, '4 m', 13, 'middle'),
          note(10, 30, '支点から遠いほど小さい力', 13),
          note(10, 52, '力 4 分の 1 → 押す距離 4 倍', 13),
          note(276, 104, '押す', 13, 'end'),
        ])),
      },
      {
        id: 'motion-mp9-c2',
        text: '1 秒間あたりにする仕事を**仕事率**といい、単位は**ワット**（W）です。仕事率 ＝ 仕事〔J〕÷ かかった時間〔s〕。同じ仕事でも、短い時間でするほど仕事率は大きくなります。',
        figure: scene([
          note(160, 34, '仕事率 ＝ 仕事 ÷ 時間', 16, 'middle'),
          { type: 'rect', x: 20, y: 60, width: 130, height: 120, fill: 'sky', rx: 8 },
          { type: 'rect', x: 170, y: 60, width: 130, height: 120, fill: 'lightgreen', rx: 8 },
          note(85, 90, 'A さん', 14, 'middle'),
          note(85, 118, '100 J を 5 秒', 13, 'middle'),
          note(85, 150, '→ 20 W', 15, 'middle'),
          note(235, 90, 'B さん', 14, 'middle'),
          note(235, 118, '100 J を 10 秒', 13, 'middle'),
          note(235, 150, '→ 10 W', 15, 'middle'),
          note(160, 212, '短い時間でするほど仕事率は大きい', 13, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp9-w1', concept: 'mo-work',
      prompt: '予想しよう。同じ荷物を同じ高さまで、A さんは 5 秒、B さんは 10 秒で持ち上げました。仕事の能率がよいのはどちらだと思う？',
      options: ['A さん', 'B さん', 'どちらも同じ'],
      answer: 'a',
      explanation: '仕事の大きさは同じですが、A さんのほうが短い時間でしているので、1 秒間あたりの仕事（仕事率）が大きく、能率がよいといえます。このステージで仕事率を計算しよう。',
      hint: '同じ仕事を、より短い時間でしたのはどちらかな。',
    }),
    problems: [
      fill({
        id: 'motion-mp9-p1', concept: 'mo-work',
        prompt: 'てこを使って、重さ 40 N の物体を 0.5 m 持ち上げます。支点から物体までは 1 m、支点から手で押す点までは 4 m です。空らんに入る数を入れよう。（てこの重さは考えない）',
        text: '手で押す力は[b1]で、てこを押し下げる距離は[b2]である。',
        blanks: [number('b1', 10, 0.1, 'N'), number('b2', 2, 0.01, 'm')],
        explanation: '支点から手までの長さは、物体までの 4 倍なので、力は 4 分の 1 の 40 ÷ 4 ＝ 10 N です。押し下げる距離は 4 倍の 0.5 × 4 ＝ 2 m です。仕事は 10 N × 2 m ＝ 20 J で、直接持ち上げる 40 N × 0.5 m ＝ 20 J と同じです。',
        hint: '長さが 4 倍なら、力は 4 分の 1、距離は 4 倍。',
      }),
      figureChoice({
        id: 'motion-mp9-p2', concept: 'mo-work',
        prompt: 'てこの左はしに物体をのせ、ア〜ウのどこかを押し下げて持ち上げます（アは支点に近く、ウは支点からいちばん遠い）。いちばん小さい力ですむのはどこ？',
        figure: scene(lever().concat([
          note(90, 214, '支点', 13, 'middle'),
          spot('r1', 130, 120, 'ア'),
          spot('r2', 205, 120, 'イ'),
          spot('r3', 280, 120, 'ウ'),
        ])),
        answer: 'r3',
        explanation: 'てこでは、支点から遠いところを押すほど、小さい力で物体を持ち上げられます。いちばん遠いウです。そのかわり、押し下げる距離はいちばん長くなります。',
        hint: '長い棒の先を押すと、楽に持ち上がるね。',
      }),
      fill({
        id: 'motion-mp9-p3', concept: 'mo-work',
        prompt: '重さ 100 N の物体を 0.6 m 持ち上げる仕事を、滑車・斜面・てこを使って行います。空らんに入る数を入れよう。（道具の重さや摩擦は考えない）',
        text: 'B さんはひもを 30 N の力で引いた。ひもを引いた距離は[b1]。C さんはてこを 1 m 押し下げた。加えた力は[b2]である。',
        blanks: [number('b1', 2, 0.01, 'm'), number('b2', 60, 0.1, 'N')],
        explanation: '直接持ち上げる仕事は 100 N × 0.6 m ＝ 60 J です。仕事の原理より、B さんは 60 J ÷ 30 N ＝ 2 m 引き、C さんは 60 J ÷ 1 m ＝ 60 N の力を加えました。',
        hint: 'まず直接持ち上げる仕事を求め、どの道具でも同じ仕事になると考えよう。',
      }),
      fill({
        id: 'motion-mp9-t1', concept: 'mo-work', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '1 秒間あたりにする仕事を[b1]といい、単位は[b2]（記号 W）である。',
        blanks: [
          word('b1', ['仕事率', '仕事', '速さ'], '仕事率'),
          word('b2', ['ワット', 'ジュール', 'ニュートン'], 'ワット'),
        ],
        explanation: '**仕事率**は仕事の能率を表し、仕事 ÷ 時間で求めます。単位は**ワット**（W）です。',
        hint: '漢字 3 文字の言葉。電力と同じ単位だよ。',
      }),
      fill({
        id: 'motion-mp9-p4', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: 'A さんは重さ 60 N の物体を 1 m 持ち上げるのに 3 秒かかった。A さんの仕事は[b1]で、仕事率は[b2]である。',
        blanks: [number('b1', 60, 0.1, 'J'), number('b2', 20, 0.1, 'W')],
        explanation: '仕事 ＝ 60 N × 1 m ＝ 60 J、仕事率 ＝ 60 J ÷ 3 s ＝ 20 W です。',
        hint: '仕事を求めてから、時間でわろう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'motion-mp9-r1', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: 'B さんは重さ 40 N の物体を 1.5 m 持ち上げるのに 10 秒かかった。B さんの仕事率は[b1]である。',
        blanks: [number('b1', 6, 0.1, 'W')],
        explanation: '仕事は 40 N × 1.5 m ＝ 60 J、仕事率は 60 J ÷ 10 s ＝ 6 W です。',
        hint: '仕事 ÷ 時間 だよ。',
      }),
      fill({
        id: 'motion-mp9-r2', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。',
        text: 'B さんは 60 J の仕事を 10 秒でした。仕事率 20 W の A さんと同じ仕事率にするには、B さんは同じ仕事を[b1]で行えばよい。',
        blanks: [number('b1', 3, 0.1, '秒')],
        explanation: '仕事率 20 W は、1 秒間に 20 J の仕事をすることです。60 J の仕事なら 60 ÷ 20 ＝ 3 秒で行えば、同じ仕事率になります。',
        hint: '時間 ＝ 仕事 ÷ 仕事率 だよ。',
      }),
      fill({
        id: 'motion-mp9-r3', concept: 'mo-work',
        prompt: '空らんに入る数を入れよう。（てこの重さは考えない）',
        text: '重さ 40 N の物体を、てこを使わずに直接 0.5 m 持ち上げるときの仕事は[b1]である。てこを使っても、人がてこにした仕事は[b2]である。',
        blanks: [number('b1', 20, 0.1, 'J'), number('b2', 20, 0.1, 'J')],
        explanation: '直接の仕事は 40 N × 0.5 m ＝ 20 J です。仕事の原理より、てこを使っても仕事は 20 J で変わりません。',
        hint: '仕事の原理を思い出そう。',
      }),
    ],
  };

  // ---- ステージ motion-mp10: プリント 10 エネルギーと位置エネルギー ----
  const motionMp10 = {
    id: 'motion-mp10', areaId: 'mo-miniprint', title: 'プリント 10: 位置エネルギー', minutes: 5, concepts: ['mo-energy'],
    lessons: [
      {
        id: 'motion-mp10-c1',
        anim: 'mo-ball-block',   // 動く図（js/anim-physics.js）。figure は静止図として残す
        text: 'ほかの物体に**仕事をすることができる**物体は、**エネルギー**をもっているといいます。高い所にある物体がもつ**位置エネルギー**は、高さが高いほど、質量が大きいほど大きくなります。',
        // レールを転がり下りた球が木片に当たり、木片を動かす（＝木片に仕事をする）
        figure: scene([
          { type: 'line', points: [[20, 60], [60, 110], [100, 160], [140, 190], [300, 190]], color: 'gray', width: 4 },
          { type: 'circle', x: 30, y: 62, r: 12, fill: 'gray', stroke: 'ink' },
          { type: 'line', points: [[30, 76], [30, 188]], color: 'gray', width: 2, dashed: true },
          note(38, 140, '高さ', 13),
          { type: 'rect', x: 200, y: 166, width: 44, height: 24, fill: 'brown', label: '木片' },
          { type: 'arrow', x1: 250, y1: 150, x2: 300, y2: 150, color: 'blue' },
          note(250, 136, '動いた距離', 12),
          note(92, 30, '高い・重い → 木片を遠くまで動かす', 13),
          note(160, 226, '木片を動かす ＝ 木片に仕事をする', 13, 'middle'),
        ]),
      },
      {
        id: 'motion-mp10-c2',
        text: '位置エネルギーの大きさは、球を落として木片が動いた距離で調べます。高さとの関係を調べるときは質量を一定に、質量との関係を調べるときは高さを一定にします。木片の移動距離は、高さにも質量にも比例します。',
        figure: scene([
          ...miniAxes(40), ...miniAxes(190),
          { type: 'line', points: [[40, 170], [128, 70]], color: 'blue', width: 3 },
          { type: 'line', points: [[190, 170], [278, 80]], color: 'blue', width: 3 },
          note(40, 40, '木片の移動距離', 12),
          note(190, 40, '木片の移動距離', 12),
          note(132, 190, '高さ', 12, 'end'),
          note(282, 190, '質量', 12, 'end'),
          note(84, 220, '質量は一定', 13, 'middle'),
          note(234, 220, '高さは一定', 13, 'middle'),
        ]),
      },
      {
        id: 'motion-mp10-c3',
        text: '基準面からの位置エネルギー〔J〕は、物体にはたらく重力〔N〕× 高さ〔m〕で求められます。10 N の物体が 3 m の高さにあれば 30 J で、その高さまで持ち上げる仕事と同じ大きさです。',
        figure: scene([
          { type: 'line', points: [[20, 200], [200, 200]], color: 'line', width: 3 },
          note(20, 222, '基準面', 13),
          { type: 'rect', x: 70, y: 50, width: 50, height: 40, fill: 'sand', label: '10 N' },
          { type: 'arrow', x1: 150, y1: 196, x2: 150, y2: 94, color: 'gray' },
          note(158, 150, '3 m', 14),
          note(196, 70, '位置エネルギー', 13),
          note(196, 96, '＝ 重力 × 高さ', 13),
          note(196, 122, '＝ 10 N × 3 m', 13),
          note(196, 148, '＝ 30 J', 14),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp10-w1', concept: 'mo-energy',
      prompt: '予想しよう。同じおもりを、より高い所から落として地面のくいに当てると、くいはどうなると思う？',
      options: ['より深く打ちこまれる', 'より浅くなる', '変わらない'],
      answer: 'a',
      explanation: '高い所にあるおもりほど大きな位置エネルギーをもっていて、くいに大きな仕事をするので、深く打ちこまれます。このステージで、位置エネルギーの性質を確かめよう。',
      hint: '高い所から落とすほど、勢いがつくね。',
    }),
    problems: [
      fill({
        id: 'motion-mp10-t1', concept: 'mo-energy', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ほかの物体に[b1]ことができる物体は、エネルギーをもっているという。高い所にある物体がもつエネルギーを[b2]という。',
        blanks: [
          word('b1', ['仕事をする', '光を出す', '熱をうばう'], '仕事をする'),
          word('b2', ['位置エネルギー', '運動エネルギー', '電気エネルギー'], '位置エネルギー'),
        ],
        explanation: 'ほかの物体に**仕事をすることができる**とき、その物体はエネルギーをもっています。高さによるエネルギーが**位置エネルギー**です。',
        hint: 'エネルギーは「仕事をする能力」だよ。',
      }),
      choice({
        id: 'motion-mp10-p1', concept: 'mo-energy',
        prompt: '球をレールの上から転がして木片に当てる実験で、球の位置エネルギーの大きさを調べるために測るものはどれ？',
        options: ['木片が動いた距離', '球の直径', '木片の重さ'],
        answer: 'a',
        explanation: '球が木片にした仕事が大きいほど、木片は遠くまで動きます。木片の移動距離で、球がもっていたエネルギーの大きさをくらべます。',
        hint: '球がした仕事の大きさが表れるのはどこかな。',
      }),
      choice({
        id: 'motion-mp10-p2', concept: 'mo-energy',
        prompt: '位置エネルギーと「高さ」の関係を調べる実験で、一定にしておくものはどれ？',
        options: ['球の質量', '球を落とす高さ', '木片の移動距離'],
        answer: 'a',
        explanation: '調べたい条件（高さ）だけを変え、ほかの条件（球の質量など）は一定にします。そうすると、木片の移動距離のちがいが高さのちがいによるものだと分かります。',
        hint: '変えるのは 1 つの条件だけ。高さ以外はそろえるよ。',
      }),
      fill({
        id: 'motion-mp10-p3', concept: 'mo-energy',
        prompt: '空らんに入る数を入れよう。',
        text: '20 g の球を 5 cm の高さから落とすと、木片は 4 cm 動いた。40 g の球を 15 cm の高さから落とすと、木片は[b1]動く。',
        blanks: [number('b1', 24, 0.1, 'cm')],
        explanation: '木片の移動距離は質量にも高さにも比例します。質量は 2 倍、高さは 3 倍なので、4 cm × 2 × 3 ＝ 24 cm です。',
        hint: '質量が何倍、高さが何倍になったかを考えよう。',
      }),
      figureChoice({
        id: 'motion-mp10-p4', concept: 'mo-energy',
        prompt: 'ア〜ウの球を落として、同じ木片に当てます（ア 20 g を 10 cm、イ 40 g を 10 cm、ウ 40 g を 20 cm の高さから）。木片がいちばん遠くまで動くのはどれ？',
        figure: scene([
          { type: 'line', points: [[10, 190], [310, 190]], color: 'line', width: 3 },
          { type: 'circle', x: 60, y: 140, r: 8, fill: 'gray', stroke: 'ink' },
          { type: 'circle', x: 160, y: 140, r: 12, fill: 'gray', stroke: 'ink' },
          { type: 'circle', x: 260, y: 90, r: 12, fill: 'gray', stroke: 'ink' },
          ...[60, 160, 260].map(x => ({ type: 'line', points: [[x - 24, 190], [x - 24, x === 260 ? 90 : 140]], color: 'gray', width: 2, dashed: true })),
          note(60, 120, '20 g', 12, 'middle'),
          note(160, 116, '40 g', 12, 'middle'),
          note(260, 66, '40 g', 12, 'middle'),
          note(32, 170, '10 cm', 12, 'end'),
          note(132, 170, '10 cm', 12, 'end'),
          note(232, 150, '20 cm', 12, 'end'),
          spot('r1', 60, 216, 'ア'),
          spot('r2', 160, 216, 'イ'),
          spot('r3', 260, 216, 'ウ'),
        ]),
        answer: 'r3',
        explanation: '位置エネルギーは、質量が大きいほど、高さが高いほど大きくなります。質量がいちばん大きく、高さもいちばん高いウが、木片をいちばん遠くまで動かします。',
        hint: '質量と高さの両方を見くらべよう。',
      }),
      fill({
        id: 'motion-mp10-p5', concept: 'mo-energy',
        prompt: '空らんに入る数を入れよう。',
        text: '重さ 20 N の物体が、基準面から 1.5 m の高さにある。この物体の位置エネルギーは[b1]である。',
        blanks: [number('b1', 30, 0.1, 'J')],
        explanation: '位置エネルギー ＝ 重力 × 高さ ＝ 20 N × 1.5 m ＝ 30 J です。',
        hint: '重力〔N〕と高さ〔m〕をかけよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-mp10-r1', concept: 'mo-energy',
        prompt: '球の質量を一定にして、落とす高さを 2 倍にすると、木片の移動距離はどうなる？',
        options: ['2 倍になる', '4 倍になる', '変わらない'],
        answer: 'a',
        explanation: '位置エネルギー（木片の移動距離）は、高さに比例します。高さが 2 倍なら、移動距離も 2 倍です。',
        hint: '高さと移動距離は比例の関係だよ。',
      }),
      choice({
        id: 'motion-mp10-r2', concept: 'mo-energy',
        prompt: '位置エネルギーと「質量」の関係を調べる実験で、一定にしておくものはどれ？',
        options: ['球を落とす高さ', '球の質量', '木片の移動距離'],
        answer: 'a',
        explanation: '質量との関係を調べるときは、質量だけを変え、球を落とす高さなどほかの条件は一定にします。',
        hint: '質量以外の条件をそろえよう。',
      }),
      fill({
        id: 'motion-mp10-r3', concept: 'mo-energy',
        prompt: '空らんに入る数を入れよう。（100 g の物体にはたらく重力の大きさを 1 N とする）',
        text: '質量 500 g の物体が、基準面から 4 m の高さにある。この物体の位置エネルギーは[b1]である。',
        blanks: [number('b1', 20, 0.1, 'J')],
        explanation: '500 g の物体の重力は 5 N です。位置エネルギーは 5 N × 4 m ＝ 20 J です。',
        hint: 'まず g を N になおそう。',
      }),
      choice({
        id: 'motion-mp10-r4', concept: 'mo-energy',
        prompt: '鉄球を 5 cm ずつ高さを変えて落とし、それぞれの高さで 5 回ずつ木片の移動距離を測って平均を出しました。何回も測って平均を出すのはなぜ？',
        options: ['測定のばらつき（誤差）の影響を小さくするため', '鉄球を重くするため', '木片を軽くするため'],
        answer: 'a',
        explanation: '同じ条件でも、測るたびに少しずつ結果がちがいます。何回か測って平均すると、ばらつきの影響が小さくなり、信頼できる結果になります。',
        hint: '1 回だけの結果は、たまたまかもしれないね。',
      }),
      choice({
        id: 'motion-mp10-r5', concept: 'mo-energy',
        prompt: '高さ 10 cm から、5 g・10 g・16 g・36 g の 4 種類の球を落として木片の移動距離を測りました。この実験で変えている条件はどれ？',
        options: ['球の質量', '球を落とす高さ', '木片の種類'],
        answer: 'a',
        explanation: '高さは 10 cm で一定にし、球の質量だけを変えています。位置エネルギーと質量の関係を調べる実験です。',
        hint: '4 種類の球で何がちがうかな。',
      }),
    ],
  };

  // ---- ステージ motion-mp11: プリント 11 運動エネルギーと力学的エネルギー ----
  const motionMp11 = {
    id: 'motion-mp11', areaId: 'mo-miniprint', title: 'プリント 11: 運動エネルギーと力学的エネルギー', minutes: 5, concepts: ['mo-energy'],
    lessons: [
      {
        id: 'motion-mp11-c1',
        text: '動いている物体がもつ**運動エネルギー**は、質量に比例し、速さの 2 乗に比例します。球の速さを 2 倍にすると、木片の移動距離は 4 倍になります。',
        // 速さ 0〜45 cm/s と木片の移動距離 0〜41 cm（横 5px ＝ 1 cm/s、縦 4px ＝ 1 cm）
        figure: scene([
          { type: 'line', points: [[40, 200], [300, 200]], width: 2, arrow: true },
          { type: 'line', points: [[40, 200], [40, 24]], width: 2, arrow: true },
          { type: 'line', points: [[40, 200], [90, 192], [140, 168], [190, 128], [240, 72], [265, 36]], color: 'blue', width: 3 },
          ...[[40, 200], [90, 192], [140, 168], [190, 128], [240, 72], [265, 36]].map(([x, y]) => ({ type: 'circle', x, y, r: 4, fill: 'ink', stroke: 'ink' })),
          note(48, 24, '木片の移動距離', 12),
          note(300, 226, '速さ', 12, 'end'),
          ...[0, 10, 20, 30, 40].map(v => note(40 + 5 * v, 218, String(v), 11, 'middle')),
          note(150, 60, '速さ 2 倍 → 距離 4 倍', 13),
        ]),
      },
      {
        id: 'motion-mp11-c2',
        anim: 'mo-pendulum',   // 動く図（js/anim-physics.js。ミニプリントの使い回し）。figure は静止図として残す
        text: '位置エネルギーと運動エネルギーの和を**力学的エネルギー**といいます。ふりこはいちばん低い位置で速さが最大になり、摩擦や空気の抵抗がなければ、はなした位置と同じ高さまで上がります（**力学的エネルギーの保存**）。',
        figure: scene([
          ...swingPath(),
          { type: 'line', points: [[160, 20], SWING[0]], color: 'ink', width: 2 },
          ...SWING.map(([x, y], i) => ({ type: 'circle', x, y, r: 10, fill: i === 0 ? 'blue' : 'white', stroke: 'ink' })),
          ...['A', 'B', 'C', 'D', 'E'].map((t, i) => note(SWING[i][0], SWING[i][1] + 28, t, 14, 'middle')),
          note(10, 40, 'A ではなす', 13),
          note(310, 40, 'E まで上がる', 13, 'end'),
          note(160, 228, 'C で速さ最大', 13, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp11-w1', concept: 'mo-energy',
      prompt: '予想しよう。転がる球を木片に当てる実験で、球の速さを 2 倍にすると、木片の動く距離はどうなると思う？',
      options: ['4 倍になる', '2 倍になる', '変わらない'],
      answer: 'a',
      explanation: '運動エネルギーは速さの 2 乗に比例するので、速さを 2 倍にすると、木片の移動距離は 2 × 2 ＝ 4 倍になります。このステージで確かめよう。',
      hint: '速さとエネルギーは、単純な比例ではないよ。',
    }),
    problems: [
      choice({
        id: 'motion-mp11-p1', concept: 'mo-energy',
        prompt: '運動エネルギーの大きさと、物体の速さの関係として正しいのはどれ？',
        options: ['速さの 2 乗に比例する', '速さに比例する', '速さに反比例する'],
        answer: 'a',
        explanation: '運動エネルギーは、速さの 2 乗に比例します。速さが 2 倍で 4 倍、3 倍で 9 倍になります。',
        hint: '速さ 10 → 20 で、移動距離は 2 → 8 になったね。',
      }),
      fill({
        id: 'motion-mp11-p2', concept: 'mo-energy',
        prompt: '空らんに入る数を入れよう。',
        text: '20 g の球を秒速 5 cm で木片に当てると、木片は 4 cm 動いた。60 g の球を秒速 10 cm で当てると、木片は[b1]動く。',
        blanks: [number('b1', 48, 0.1, 'cm')],
        explanation: '運動エネルギーは質量に比例し、速さの 2 乗に比例します。質量 3 倍、速さ 2 倍（2 乗で 4 倍）なので、4 cm × 3 × 4 ＝ 48 cm です。',
        hint: '質量は何倍？ 速さは何倍で、その 2 乗は？',
      }),
      fill({
        id: 'motion-mp11-p3', concept: 'mo-energy',
        prompt: '球の速さと木片の移動距離を調べると、速さ 10・20・30・40 cm/s のとき、移動距離は 2・8・18・32 cm だった。空らんに入る数を入れよう。',
        text: 'この関係が続くとすると、速さ 50 cm/s のときの移動距離は[b1]である。',
        blanks: [number('b1', 50, 0.1, 'cm')],
        explanation: '速さが 10 cm/s の 2 倍・3 倍・4 倍のとき、移動距離は 2 cm の 4 倍・9 倍・16 倍です（速さの 2 乗に比例）。50 cm/s は 5 倍なので、2 cm × 25 ＝ 50 cm です。',
        hint: '速さが 10 cm/s の何倍か、その 2 乗をかけよう。',
      }),
      figureChoice({
        id: 'motion-mp11-p4', concept: 'mo-energy',
        prompt: 'ふりこのおもりを A の位置で静かにはなすと、B・C・D を通って E まで上がりました（摩擦や空気の抵抗はない）。おもりの速さがいちばん大きいのはどこ？（ア A、イ B、ウ C、エ D）',
        figure: scene([
          ...swingPath(),
          { type: 'line', points: [[160, 20], SWING[0]], color: 'ink', width: 2 },
          ...SWING.map(([x, y], i) => ({ type: 'circle', x, y, r: 8, fill: i === 0 ? 'blue' : 'white', stroke: 'ink' })),
          note(SWING[4][0], SWING[4][1] + 28, 'E', 14, 'middle'),
          spot('r1', SWING[0][0], SWING[0][1], 'ア'),
          spot('r2', SWING[1][0], SWING[1][1], 'イ'),
          spot('r3', SWING[2][0], SWING[2][1], 'ウ'),
          spot('r4', SWING[3][0], SWING[3][1], 'エ'),
        ]),
        answer: 'r3',
        explanation: 'おもりが下がるほど位置エネルギーが運動エネルギーに移り変わります。いちばん低い C（ウ）で運動エネルギーが最大になり、速さもいちばん大きくなります。',
        hint: 'いちばん低い位置をさがそう。',
      }),
      fill({
        id: 'motion-mp11-t1', concept: 'mo-energy', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ふりこのおもりが B を通るとき、おもりは位置エネルギーと[b1]をもっている。この 2 つの和を[b2]という。',
        blanks: [
          word('b1', ['運動エネルギー', '熱エネルギー', '電気エネルギー'], '運動エネルギー'),
          word('b2', ['力学的エネルギー', '化学エネルギー', '光エネルギー'], '力学的エネルギー'),
        ],
        explanation: 'B ではおもりは高さも速さももっているので、位置エネルギーと**運動エネルギー**の両方をもちます。その和が**力学的エネルギー**です。',
        hint: '「高さ」と「動き」のエネルギーを合わせたものだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'motion-mp11-r1', concept: 'mo-energy',
        prompt: 'ふりこのおもりを A の位置で静かにはなしました（摩擦や空気の抵抗はない）。反対側でおもりがいちばん高く上がる位置はどこ？（ア B、イ C、ウ D、エ E）',
        figure: scene([
          ...swingPath(),
          { type: 'line', points: [[160, 20], SWING[0]], color: 'ink', width: 2 },
          ...SWING.map(([x, y], i) => ({ type: 'circle', x, y, r: 8, fill: i === 0 ? 'blue' : 'white', stroke: 'ink' })),
          note(SWING[0][0], SWING[0][1] + 28, 'A', 14, 'middle'),
          spot('r1', SWING[1][0], SWING[1][1], 'ア'),
          spot('r2', SWING[2][0], SWING[2][1], 'イ'),
          spot('r3', SWING[3][0], SWING[3][1], 'ウ'),
          spot('r4', SWING[4][0], SWING[4][1], 'エ'),
        ]),
        answer: 'r4',
        explanation: '摩擦や空気の抵抗がなければ力学的エネルギーは保存されるので、おもりははなした A と同じ高さの E（エ）まで上がります。',
        hint: 'はなした位置と同じ高さはどこかな。',
      }),
      choice({
        id: 'motion-mp11-r2', concept: 'mo-energy',
        prompt: '運動エネルギーの大きさと、物体の質量の関係として正しいのはどれ？',
        options: ['質量に比例する', '質量の 2 乗に比例する', '質量に関係しない'],
        answer: 'a',
        explanation: '同じ速さなら、質量が 2 倍の物体は 2 倍の運動エネルギーをもちます。運動エネルギーは質量に比例します。',
        hint: '同じ速さで当てると、重い球ほど木片を遠くまで動かすね。',
      }),
      choice({
        id: 'motion-mp11-r3', concept: 'mo-energy',
        prompt: '摩擦や空気の抵抗がないとき、位置エネルギーと運動エネルギーの和が一定に保たれることを何という？',
        options: ['力学的エネルギーの保存', '仕事の原理', '慣性の法則'],
        answer: 'a',
        explanation: '位置エネルギーと運動エネルギーはたがいに移り変わりますが、その和（力学的エネルギー）は一定に保たれます。これを力学的エネルギーの保存といいます。',
        hint: '「力学的エネルギー」が「保たれる」ことだよ。',
      }),
      choice({
        id: 'motion-mp11-r4', concept: 'mo-energy',
        prompt: '鉄球をいろいろな高さから転がして、木片に当たる直前の速さと木片の移動距離を記録しました。高さを変えるのは、何を変えるため？',
        options: ['木片に当たるときの球の速さ', '球の質量', '木片の質量'],
        answer: 'a',
        explanation: '高い所から転がすほど、木片に当たるときの速さが大きくなります。速さと運動エネルギーの関係を調べるために、高さを変えて速さを変えています。',
        hint: '高い所から転がすと、何が大きくなるかな。',
      }),
    ],
  };

  // ---- ステージ motion-mp12: プリント 12 エネルギーの変換と保存 ----
  const motionMp12 = {
    id: 'motion-mp12', areaId: 'mo-miniprint', title: 'プリント 12: エネルギーの変換と保存', minutes: 5, concepts: ['mo-conversion'],
    lessons: [
      {
        id: 'motion-mp12-c1',
        text: 'エネルギーは、電気・熱・光・音・運動などのいろいろな形に移り変わります。たとえば発電機は運動エネルギーを**電気エネルギー**に、電灯は電気エネルギーを**光エネルギー**に変えます。',
        figure: scene([
          ...[['位置', 6], ['運動', 86], ['電気', 166], ['光', 246]].map(([t, x]) => ({ type: 'rect', x, y: 90, width: 66, height: 44, fill: 'sky', rx: 6, label: t })),
          ...[72, 152, 232].map(x => ({ type: 'arrow', x1: x, y1: 112, x2: x + 14, y2: 112, color: 'blue' })),
          note(160, 50, 'エネルギーの移り変わり', 15, 'middle'),
          note(39, 160, 'おもり', 12, 'middle'),
          note(119, 160, '落ちる', 12, 'middle'),
          note(199, 160, '発電機', 12, 'middle'),
          note(279, 160, '電灯', 12, 'middle'),
          note(160, 210, '一部は熱や音にもなる', 13, 'middle'),
        ]),
      },
      {
        id: 'motion-mp12-c2',
        text: 'エネルギーが移り変わるとき、一部は熱や音になるので、目的のエネルギーは最初より小さくなりますが、すべてを合わせた量は変わりません（**エネルギーの保存**）。もとのエネルギーのうち目的のエネルギーになった割合を**変換効率**といいます。',
        // 10 J のうち 3 J が電気、7 J が熱や音（変換効率 30 %）
        figure: scene([
          note(20, 40, 'もとのエネルギー 10 J', 13),
          { type: 'rect', x: 20, y: 52, width: 280, height: 30, fill: 'yellow' },
          note(20, 120, '電気 3 J', 13),
          note(110, 120, '熱・音など 7 J', 13),
          { type: 'rect', x: 20, y: 132, width: 84, height: 30, fill: 'sky' },
          { type: 'rect', x: 104, y: 132, width: 196, height: 30, fill: 'orange' },
          note(160, 196, '合わせると 10 J（保存される）', 13, 'middle'),
          note(160, 220, '変換効率 ＝ 3 ÷ 10 × 100 ＝ 30 %', 13, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'motion-mp12-w1', concept: 'mo-conversion',
      prompt: '予想しよう。おもりを落として発電機を回すと、得られる電気エネルギーは、おもりがもっていた位置エネルギーとくらべてどうなると思う？',
      options: ['小さくなる', '大きくなる', 'ちょうど同じになる'],
      answer: 'a',
      explanation: '位置エネルギーの一部は、発電機の中で熱や音などに変わってしまうので、得られる電気エネルギーは小さくなります。このステージで、エネルギーの移り変わりを計算しよう。',
      hint: '発電機が回るとき、音がしたり温まったりするね。',
    }),
    problems: [
      fill({
        id: 'motion-mp12-p1', concept: 'mo-conversion',
        prompt: '質量 500 g のおもりを発電機につなぎ、2 m 落下させた。空らんに入る数を入れよう。（100 g の物体にはたらく重力を 1 N とする）',
        text: '落下させる前のおもりの位置エネルギーは[b1]である。',
        blanks: [number('b1', 10, 0.1, 'J')],
        explanation: '500 g のおもりの重力は 5 N です。位置エネルギーは 5 N × 2 m ＝ 10 J です。',
        hint: '重力〔N〕× 高さ〔m〕だよ。',
      }),
      fill({
        id: 'motion-mp12-p2', concept: 'mo-conversion',
        prompt: '空らんに入る数を入れよう。（電気エネルギー〔J〕＝ 電圧〔V〕× 電流〔A〕× 時間〔s〕）',
        text: 'おもりが落ちるあいだ、発電機は 4.0 V・0.2 A の電流を 5.0 秒間流した。得られた電気エネルギーは[b1]である。',
        blanks: [number('b1', 4, 0.01, 'J')],
        explanation: '電力は 4.0 V × 0.2 A ＝ 0.8 W です。電気エネルギーは 0.8 W × 5.0 s ＝ 4.0 J です。',
        hint: 'まず電力（電圧 × 電流）を求めよう。',
      }),
      choice({
        id: 'motion-mp12-p3', concept: 'mo-conversion',
        prompt: 'おもりの位置エネルギー 10 J に対して、得られた電気エネルギーは 4 J でした。電気エネルギーが小さくなったのはなぜ？',
        options: ['エネルギーの一部が、熱や音などに変わったから', 'エネルギーが消えてなくなったから', '発電機がエネルギーをためこんだから'],
        answer: 'a',
        explanation: '位置エネルギーの一部は、摩擦による熱や音などのエネルギーに変わりました。エネルギーは消えたのではなく、別の形になっただけです（エネルギーの保存）。',
        hint: 'エネルギーは消えない。別の形に変わったんだよ。',
      }),
      fill({
        id: 'motion-mp12-p4', concept: 'mo-conversion',
        prompt: '空らんに入る数を入れよう。',
        text: '位置エネルギー 10 J から、電気エネルギー 4 J が得られた。このときのエネルギーの変換効率は[b1]である。',
        blanks: [number('b1', 40, 0.1, '%')],
        explanation: '変換効率 ＝ 得られた電気エネルギー ÷ もとのエネルギー × 100 ＝ 4 ÷ 10 × 100 ＝ 40 % です。',
        hint: '得られたエネルギー ÷ もとのエネルギー を百分率にしよう。',
      }),
      figureChoice({
        id: 'motion-mp12-p5', concept: 'mo-conversion',
        prompt: 'ア〜ウは、エネルギーを変える道具です（ア 電灯、イ モーター、ウ 光電池）。電気エネルギーを光エネルギーに変えるのはどれ？',
        figure: scene([
          { type: 'symbol', x: 60, y: 100, kind: 'bulb' },
          note(60, 150, '電灯', 13, 'middle'),
          { type: 'circle', x: 160, y: 100, r: 24, fill: 'white', stroke: 'ink' },
          note(160, 106, 'M', 16, 'middle'),
          note(160, 150, 'モーター', 13, 'middle'),
          { type: 'rect', x: 232, y: 80, width: 56, height: 40, fill: 'sky', stroke: 'ink' },
          { type: 'line', points: [[232, 100], [288, 100]], color: 'line', width: 1 },
          { type: 'line', points: [[260, 80], [260, 120]], color: 'line', width: 1 },
          note(260, 150, '光電池', 13, 'middle'),
          spot('r1', 60, 200, 'ア'),
          spot('r2', 160, 200, 'イ'),
          spot('r3', 260, 200, 'ウ'),
        ]),
        answer: 'r1',
        explanation: '電灯は、電気エネルギーを光エネルギー（と熱エネルギー）に変えます。モーターは電気エネルギーを運動エネルギーに、光電池は光エネルギーを電気エネルギーに変えます。',
        hint: '電気を流すと光る道具だよ。',
      }),
      fill({
        id: 'motion-mp12-t1', concept: 'mo-conversion', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'エネルギーが移り変わっても、すべてのエネルギーを合わせた量は変わらない。これを[b1]という。もとのエネルギーのうち、目的のエネルギーになった割合を[b2]という。',
        blanks: [
          word('b1', ['エネルギーの保存', '仕事の原理', '慣性の法則'], 'エネルギーの保存'),
          word('b2', ['変換効率', '仕事率', '電力'], '変換効率'),
        ],
        explanation: 'エネルギーの総量が変わらないことを**エネルギーの保存**といいます。目的のエネルギーになった割合が**変換効率**です。',
        hint: '「保存」と「効率」という言葉に注目しよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'motion-mp12-r1', concept: 'mo-conversion',
        prompt: 'モーターは、どのようなエネルギーの変換をする道具？',
        options: ['電気エネルギー → 運動エネルギー', '運動エネルギー → 電気エネルギー', '光エネルギー → 電気エネルギー'],
        answer: 'a',
        explanation: 'モーターは電流を流すと回転するので、電気エネルギーを運動エネルギーに変えます。反対に、回して電気をつくるのが発電機です。',
        hint: '電流を流すと回るね。',
      }),
      choice({
        id: 'motion-mp12-r2', concept: 'mo-conversion',
        prompt: '光電池（太陽電池）は、どのようなエネルギーの変換をする道具？',
        options: ['光エネルギー → 電気エネルギー', '電気エネルギー → 光エネルギー', '熱エネルギー → 光エネルギー'],
        answer: 'a',
        explanation: '光電池は、光を受けて電流を流すので、光エネルギーを電気エネルギーに変えます。',
        hint: '光を当てると電気が生まれる道具だよ。',
      }),
      fill({
        id: 'motion-mp12-r3', concept: 'mo-conversion',
        prompt: '空らんに入る数を入れよう。',
        text: '20 J の電気エネルギーを電灯に送ったところ、6 J が光エネルギーになった。この電灯の変換効率は[b1]である。',
        blanks: [number('b1', 30, 0.1, '%')],
        explanation: '変換効率 ＝ 6 ÷ 20 × 100 ＝ 30 % です。残りの 14 J は、おもに熱エネルギーになっています。',
        hint: '目的のエネルギー ÷ もとのエネルギー × 100。',
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
    {
      id: 'mo-balance', title: '2 力のつり合いと作用・反作用', basic: 'mo-compose', lessonStageId: 'motion-mp3',
      checkPool: [
        choice({
          id: 'mo-balance-k1', concept: 'mo-balance',
          prompt: 'つり合っている 2 力について、正しいのはどれ？',
          options: ['1 つの物体にはたらく', '別々の物体にはたらく', '同じ向きにはたらく'],
          answer: 'a',
          explanation: 'つり合っている 2 力は、1 つの物体にはたらき、一直線上・反対向き・同じ大きさです。別々の物体にはたらくのは作用・反作用の 2 力です。',
          hint: '力を受けている物体がいくつかを考えよう。',
        }),
        choice({
          id: 'mo-balance-k2', concept: 'mo-balance',
          prompt: '床の上に静止している箱にはたらく重力と、つり合っている力はどれ？',
          options: ['床が箱を押す力（垂直抗力）', '箱が床を押す力', '箱が空気を押す力'],
          answer: 'a',
          explanation: '箱にはたらく下向きの重力と、床が箱を押し上げる垂直抗力は、どちらも箱にはたらき、つり合っています。箱が床を押す力は床にはたらく力です。',
          hint: '「箱に」はたらく上向きの力をさがそう。',
        }),
        choice({
          id: 'mo-balance-k3', concept: 'mo-balance',
          prompt: '人が壁を押す力と、壁が人を押し返す力の関係はどれ？',
          options: ['作用・反作用', '2 力のつり合い', '合力と分力'],
          answer: 'a',
          explanation: '人が壁を押す力は壁に、壁が人を押す力は人にはたらきます。別々の物体にはたらく、大きさが等しく反対向きの 2 力なので、作用・反作用です。',
          hint: '2 つの力は、それぞれ何にはたらいているかな。',
        }),
      ],
    },
    {
      id: 'mo-conversion', title: 'エネルギーの変換と保存', basic: 'mo-energy', lessonStageId: 'motion-mp12',
      checkPool: [
        choice({
          id: 'mo-conversion-k1', concept: 'mo-conversion',
          prompt: '発電機は、どのようなエネルギーの変換をする道具？',
          options: ['運動エネルギー → 電気エネルギー', '電気エネルギー → 運動エネルギー', '電気エネルギー → 光エネルギー'],
          answer: 'a',
          explanation: '発電機は、回転させる（運動エネルギー）と電流を生み出す（電気エネルギー）道具です。',
          hint: 'ハンドルを回すと電気が生まれる道具だよ。',
        }),
        choice({
          id: 'mo-conversion-k2', concept: 'mo-conversion',
          prompt: 'エネルギーが移り変わるとき、熱や音なども全部ふくめたエネルギーの総量はどうなる？',
          options: ['変わらない', '必ず減る', '必ずふえる'],
          answer: 'a',
          explanation: 'エネルギーは形を変えても、全部を合わせた量は変わりません。これをエネルギーの保存といいます。目的のエネルギーだけを見ると、もとより小さくなります。',
          hint: 'エネルギーの保存を思い出そう。',
        }),
        fill({
          id: 'mo-conversion-k3', concept: 'mo-conversion',
          prompt: '空らんに入る数を入れよう。',
          text: '位置エネルギー 8 J のおもりを落として発電し、電気エネルギー 2 J が得られた。変換効率は[b1]である。',
          blanks: [number('b1', 25, 0.1, '%')],
          explanation: '変換効率 ＝ 2 ÷ 8 × 100 ＝ 25 % です。',
          hint: '得られたエネルギー ÷ もとのエネルギー × 100。',
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
      { id: 'mo-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [motionMp1, motionMp2, motionMp3, motionMp4, motionMp5, motionMp6, motionMp7, motionMp8, motionMp9, motionMp10, motionMp11, motionMp12] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
