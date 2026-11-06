// 「状態変化」教材データ（中学1年 理科・化学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（状態変化と粒子: 固体・液体・気体、融点と沸点 / 混合物を分ける: 混合物と純粋な物質、蒸留）と、概念 5 つ。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// drag の位置は部品の基準点（rect は左上）で判定する（js/ui-problems.js の anchorOf）。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
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

  // 写真（assets/images/state-change/<name>.jpg。640×480 を場面いっぱいに描く。座標は画像の位置 × 0.5）
  function photo(name) { return { type: 'image', src: 'assets/images/state-change/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 粒子のモデル（80×80 の枠。左上 (x0, y0)）。kind は 'solid' | 'liquid' | 'gas'
  // 固体: 規則正しく並ぶ／液体: 並びがくずれ、すき間なく集まる／気体: 間隔が広く、飛び回る（短い矢印）
  const SOLID_DOTS = [13, 31, 49, 67].flatMap(y => [13, 31, 49, 67].map(x => [x, y]));
  const LIQUID_DOTS = [[12, 40], [28, 34], [46, 38], [64, 42], [18, 56], [36, 52], [54, 58], [71, 57],
    [12, 70], [30, 70], [48, 72], [66, 72]];
  const GAS_DOTS = [[18, 18], [58, 16], [38, 44], [64, 58], [16, 66]];
  function particleBox(x0, y0, kind) {
    const items = [{ type: 'rect', x: x0, y: y0, width: 80, height: 80, fill: 'white' }];
    const dots = kind === 'solid' ? SOLID_DOTS : kind === 'liquid' ? LIQUID_DOTS : GAS_DOTS;
    dots.forEach(([dx, dy]) => items.push({ type: 'circle', x: x0 + dx, y: y0 + dy, r: 7, fill: 'sky', stroke: 'blue' }));
    if (kind === 'gas') {
      items.push({ type: 'line', points: [[x0 + 50, y0 + 22], [x0 + 42, y0 + 28]], color: 'gray', width: 2, arrow: true });
      items.push({ type: 'line', points: [[x0 + 64, y0 + 49], [x0 + 64, y0 + 37]], color: 'gray', width: 2, arrow: true });
      items.push({ type: 'line', points: [[x0 + 25, y0 + 66], [x0 + 38, y0 + 66]], color: 'gray', width: 2, arrow: true });
    }
    return items;
  }

  // 粒子のモデルを 3 つ横に並べ、下にア・イ・ウの選ぶ場所を置く（kinds は左から）
  function particleChoiceScene(kinds) {
    const items = [{ type: 'text', x: 160, y: 30, text: '粒子のようす（モデル）', size: 14, anchor: 'middle' }];
    kinds.forEach((kind, i) => {
      items.push(...particleBox(20 + 100 * i, 50, kind));
      items.push({ type: 'region', id: 'r' + (i + 1), x: 60 + 100 * i, y: 172, r: 24, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // 氷を加熱したときの温度変化のグラフ（-20℃ → 0℃ 横ばい → 100℃ 横ばい）。y = 160 − 1.1 × 温度
  function heatGraphItems() {
    return [
      { type: 'line', points: [[50, 200], [50, 24]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [304, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 160], [80, 160]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[50, 50], [200, 50]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[50, 182], [80, 160], [130, 160], [200, 50], [290, 50]], color: 'blue', width: 3 },
      { type: 'text', x: 44, y: 165, text: '0', size: 13, anchor: 'end' },
      { type: 'text', x: 44, y: 55, text: '100', size: 13, anchor: 'end' },
      { type: 'text', x: 58, y: 18, text: '温度〔℃〕', size: 13 },
      { type: 'text', x: 304, y: 224, text: '加熱した時間', size: 13, anchor: 'end' },
    ];
  }

  // 3 つの液体を加熱したときの小さなグラフを横に並べる（kinds は左から 'ethanol' | 'water' | 'mix' | 'mix2'）
  // 1 つのグラフは幅 88。y = 170 − 1.2 ×（温度 − 20）
  function threeGraphsScene(kinds) {
    const items = [{ type: 'text', x: 160, y: 30, text: 'たて: 温度　横: 加熱した時間', size: 13, anchor: 'middle' }];
    kinds.forEach((kind, i) => {
      const x0 = 12 + 104 * i, ox = x0 + 6;
      const curve = {
        ethanol: [[ox, 170], [ox + 30, 100], [ox + 80, 100]],
        water: [[ox, 170], [ox + 44, 74], [ox + 80, 74]],
        mix: [[ox, 170], [ox + 34, 98], [ox + 54, 90], [ox + 80, 80]],
        mix2: [[ox, 170], [ox + 40, 96], [ox + 60, 86], [ox + 80, 76]],
      }[kind];
      items.push({ type: 'line', points: [[ox, 50], [ox, 170], [x0 + 88, 170]], width: 2 });
      items.push({ type: 'line', points: curve, color: 'blue', width: 3 });
      items.push({ type: 'region', id: 'r' + (i + 1), x: x0 + 47, y: 206, r: 22, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // 蒸留の装置。枝付きフラスコ（中心 (90,160)、半径 32）、枝の高さは y=80、ガラス管の先は (240,182)。
  // 集める試験管は氷水を入れたビーカーの中。opts.thermo: 温度計の下のはし（球）の y（省くと描かない）
  function distillItems(opts) {
    const o = opts || {};
    const items = [
      { type: 'beaker', x: 240, y: 228, width: 76, height: 84, level: 0.6 },
      { type: 'rect', x: 229, y: 170, width: 22, height: 40, fill: 'white', stroke: 'none' },
      { type: 'tube', x: 240, y: 222, height: 96, level: 0.15 },
      { type: 'line', points: [[50, 196], [130, 196]], color: 'gray', width: 3 },
      { type: 'flame', x: 90, y: 236 },
      // フラスコの中の液体（下の弧に沿った多角形）と沸とう石
      { type: 'polygon', points: [[118.9, 168], [114.6, 177.2], [107.2, 184.6], [97.8, 189], [90, 190], [82.2, 189], [72.8, 184.6], [65.4, 177.2], [61.1, 168]], fill: 'water', stroke: 'none' },
      { type: 'circle', x: 84, y: 182, r: 3, fill: 'ink', stroke: 'none' },
      { type: 'circle', x: 96, y: 184, r: 3, fill: 'ink', stroke: 'none' },
      { type: 'circle', x: 90, y: 160, r: 32, fill: 'none' },
      { type: 'rect', x: 82, y: 124, width: 16, height: 8, fill: 'white', stroke: 'none' },
      { type: 'line', points: [[81, 130], [81, 64]], width: 2 },
      { type: 'line', points: [[99, 130], [99, 64]], width: 2 },
      { type: 'rect', x: 76, y: 50, width: 28, height: 14, fill: 'gray' },
      // 枝からのびるガラス管。先は試験管の液体につけない
      { type: 'line', points: [[99, 80], [240, 106], [240, 182]], width: 3 },
    ];
    if (typeof o.thermo === 'number') {
      items.push({ type: 'rect', id: 'thermo', x: 87, y: o.thermo - 44, width: 6, height: 44, fill: 'white', rx: 3, label: '温度計', labelPos: 'above' });
    }
    return items;
  }

  // ================================================================
  // 領域 1: 状態変化と粒子
  // ================================================================

  // ---- ステージ state-1: 固体・液体・気体（状態変化、体積と質量、粒子のモデル） ----
  const state1 = {
    id: 'state-1', areaId: 'state', title: '固体・液体・気体', minutes: 5, concepts: ['sc-change', 'sc-model'],
    lessons: [
      {
        id: 'state-1-c1',
        text: '水は温めると氷 → 水 → 水蒸気と、冷やすと逆の順にすがたを変えます。このように、物質が温度によって固体・液体・気体とすがたを変えることを**状態変化**といいます。すがたが変わっても、物質そのものは変わりません。',
        // 固体 ⇄ 液体 ⇄ 気体（上の矢印が加熱、下の矢印が冷却）
        figure: scene([
          { type: 'text', x: 160, y: 50, text: '物質は温度によってすがたを変える', size: 14, anchor: 'middle' },
          { type: 'rect', x: 20, y: 90, width: 64, height: 44, fill: 'sky', label: '固体' },
          { type: 'rect', x: 128, y: 90, width: 64, height: 44, fill: 'sky', label: '液体' },
          { type: 'rect', x: 236, y: 90, width: 64, height: 44, fill: 'sky', label: '気体' },
          { type: 'arrow', x1: 88, y1: 102, x2: 124, y2: 102, color: 'orange' },
          { type: 'arrow', x1: 124, y1: 122, x2: 88, y2: 122, color: 'blue' },
          { type: 'arrow', x1: 196, y1: 102, x2: 232, y2: 102, color: 'orange' },
          { type: 'arrow', x1: 232, y1: 122, x2: 196, y2: 122, color: 'blue' },
          { type: 'text', x: 106, y: 88, text: '加熱', size: 12, anchor: 'middle' },
          { type: 'text', x: 106, y: 146, text: '冷却', size: 12, anchor: 'middle' },
          { type: 'text', x: 214, y: 88, text: '加熱', size: 12, anchor: 'middle' },
          { type: 'text', x: 214, y: 146, text: '冷却', size: 12, anchor: 'middle' },
          { type: 'text', x: 52, y: 172, text: '氷', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 172, text: '水', size: 14, anchor: 'middle' },
          { type: 'text', x: 268, y: 172, text: '水蒸気', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 212, text: '水の場合', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'state-1-c2',
        text: '液体のろうを冷やして固体にすると、まん中がへこみ、体積は小さくなります。でも質量は変わりません。**状態変化**では、体積は変わりますが、質量は変わりません。ふつうは、同じ質量なら固体＜液体＜気体の順に体積が大きくなります。',
        // 写真: 左は液体のろう（とけてすきとおる）、右は冷えて固まった白いろう（まん中がへこむ）
        figure: scene([
          photo('state-1-c2'),
          { type: 'arrow', x1: 128, y1: 110, x2: 188, y2: 110, color: 'blue', width: 3 },
          tag(158, 96, '冷やす', { size: 13 }),
          pointer(244, 30, 245, 98), tag(244, 22, 'まん中がへこむ', { size: 13 }),
          tag(70, 176, '液体のろう'),
          tag(244, 176, '固体のろう'),
          tag(70, 198, '質量 50 g', { size: 13 }),
          tag(244, 198, '質量 50 g', { size: 13 }),
          tag(160, 228, '体積は減るが、質量は変わらない'),
        ]),
      },
      {
        id: 'state-1-c3',
        text: '水は例外です。水がこおって氷になると、体積は約 1.1 倍に大きくなります。そのため、同じ体積で比べると氷は水より軽く、氷は水に浮きます。このときも質量は変わりません。',
        // 水に浮く氷
        figure: scene([
          { type: 'text', x: 160, y: 40, text: '水は氷になると体積がふえる', size: 14, anchor: 'middle' },
          { type: 'beaker', x: 160, y: 200, width: 150, height: 120, level: 0.55 },
          // 水面は y=134。氷の大部分は水面より下に沈んでいる
          { type: 'rect', x: 136, y: 126, width: 48, height: 36, fill: 'white', stroke: 'line', label: '氷' },
          { type: 'text', x: 160, y: 228, text: '氷は水に浮く', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'state-1-c4',
        anim: 'st-particles',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '物質は、とても小さな**粒子**が集まってできています。固体では粒子が規則正しく並び、液体では並び方がくずれて動き回り、気体では粒子が自由に飛び回ります。加熱すると粒子の運動が激しくなり、粒子どうしの間隔が広がります。',
        // 固体・液体・気体の粒子のモデル
        figure: scene(particleBox(20, 40, 'solid').concat(particleBox(120, 40, 'liquid'), particleBox(220, 40, 'gas'), [
          { type: 'text', x: 60, y: 144, text: '固体', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 144, text: '液体', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 260, y: 144, text: '気体', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 60, y: 166, text: '規則正しく並び', size: 12, anchor: 'middle' },
          { type: 'text', x: 60, y: 184, text: 'その場でゆれる', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 166, text: '並び方がくずれ', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 184, text: '位置を変えて動く', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 166, text: '間隔が広く', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 184, text: '自由に飛び回る', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '加熱すると、粒子の運動が激しくなる', size: 13, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'state-1-w1', concept: 'sc-change',
      prompt: '予想しよう。氷がとけてすべて水になると、質量はどうなると思う？',
      options: ['軽くなる', '変わらない', '重くなる'],
      answer: 'b',
      explanation: '氷がとけて水になっても、質量は変わりません。すがたが変わるときに何が変わり、何が変わらないのか、このステージで確かめよう。',
      hint: '氷をつくっていたものは、どこかへ消えたかな。',
    }),
    problems: [
      choice({
        id: 'state-1-p1', concept: 'sc-change',
        prompt: '物質が固体から液体、液体から気体へと状態変化するとき、変わらないものはどれ？',
        options: ['体積', '質量', 'すがた（状態）'],
        answer: 'b',
        explanation: '状態変化では、体積やすがたは変わりますが、質量は変わりません。物質をつくる粒子の数が変わらないからです。',
        hint: '物質の量そのものがふえたり減ったりするかを考えよう。',
      }),
      fill({
        id: 'state-1-t1', concept: 'sc-change', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質が温度によって、固体・液体・気体とすがたを変えることを[b1]という。',
        blanks: [word('b1', ['状態変化', '蒸留', '沸点'], '状態変化')],
        explanation: '温度によって固体・液体・気体とすがたを変えることを**状態変化**といいます。すがたが変わっても、別の物質になるわけではありません。',
        hint: '「状態」が「変化」する、という言葉だよ。',
      }),
      figureChoice({
        id: 'state-1-p2', concept: 'sc-model',
        prompt: 'ア〜ウは、ある物質の固体・液体・気体のどれかの粒子のようすを表したモデルです。気体のときの粒子のようすはどれ？',
        figure: particleChoiceScene(['liquid', 'gas', 'solid']),
        answer: 'r2',
        explanation: '気体では、粒子どうしの間隔がとても広く、粒子が自由に飛び回っています。イがそのようすです。アは並び方がくずれた液体、ウは規則正しく並んだ固体のモデルです。',
        hint: '粒子と粒子のあいだが、いちばん広いものをさがそう。',
      }),
      choice({
        id: 'state-1-p3', concept: 'sc-change',
        prompt: 'ビーカーに入れた液体のろうを冷やして、固体にしました。体積はどうなる？',
        options: ['大きくなる（まん中がもり上がる）', '小さくなる（まん中がへこむ）', '変わらない'],
        answer: 'b',
        explanation: 'ろうは液体から固体になると体積が小さくなり、まん中がへこみます。質量は変わりません。多くの物質は、ろうと同じように固体になると体積が小さくなります。',
        hint: '固まったろうの表面の形を思い出そう。',
      }),
      fill({
        id: 'state-1-p4', concept: 'sc-change',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '水がこおって氷になると、体積は[b1]、質量は[b2]。',
        blanks: [
          word('b1', ['大きくなり', '小さくなり', '変わらず'], '大きくなり'),
          word('b2', ['ふえる', '減る', '変わらない'], '変わらない'),
        ],
        explanation: '水は例外で、氷になると体積が大きくなります。それでも質量は変わりません。体積と質量を分けて考えよう。',
        hint: '氷が水に浮くことから、体積の変わり方を考えよう。',
      }),
      choice({
        id: 'state-1-p5', concept: 'sc-model',
        prompt: '液体を加熱して気体にすると、体積がとても大きくなります。その理由として正しいものはどれ？',
        options: ['粒子の数がふえるから', '粒子1つ1つが大きくなるから', '粒子の運動が激しくなり、粒子どうしの間隔が広がるから'],
        answer: 'c',
        explanation: '状態変化では、粒子の数も大きさも変わりません。加熱すると粒子の運動が激しくなり、粒子どうしの間隔が広がるので、体積が大きくなります。',
        hint: '状態変化のとき、粒子の数や大きさは変わるかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'state-1-r1', concept: 'sc-change',
        prompt: 'ポリエチレンの袋に液体のエタノールを少し入れ、空気をぬいて口を閉じました。袋に熱い湯をかけると、袋は大きくふくらみました。袋の中のエタノールの質量はどうなった？',
        options: ['ふえた', '減った', '変わらない'],
        answer: 'c',
        explanation: 'エタノールが液体から気体になり、体積が大きくなったので袋がふくらみました。状態変化なので、質量は変わりません。',
        hint: '袋の中のエタノールの量は、ふえたり減ったりしたかな。',
      }),
      choice({
        id: 'state-1-r2', concept: 'sc-change',
        prompt: '多くの物質では、同じ質量で比べると、体積はどの順に大きくなる？',
        options: ['固体＜液体＜気体', '気体＜液体＜固体', '液体＜固体＜気体'],
        answer: 'a',
        explanation: '多くの物質は、固体＜液体＜気体 の順に体積が大きくなります。ただし水は例外で、氷（固体）のほうが水（液体）より体積が大きくなります。',
        hint: '気体になると、体積がとても大きくなったね。',
      }),
      figureChoice({
        id: 'state-1-r3', concept: 'sc-model',
        prompt: 'ア〜ウは、ある物質の固体・液体・気体のどれかの粒子のようすを表したモデルです。固体のときの粒子のようすはどれ？',
        figure: particleChoiceScene(['solid', 'gas', 'liquid']),
        answer: 'r1',
        explanation: '固体では、粒子が規則正しく並び、その場でわずかにゆれ動いています。アがそのようすです。イは気体、ウは液体のモデルです。',
        hint: '粒子がきちんと並んでいるものをさがそう。',
      }),
      choice({
        id: 'state-1-r4', concept: 'sc-model',
        prompt: '水が水蒸気に状態変化するとき、水をつくる粒子の数はどうなる？',
        options: ['ふえる', '減る', '変わらない'],
        answer: 'c',
        explanation: '状態変化では、粒子の数は変わりません。変わるのは粒子の並び方と運動のようすです。だから質量も変わりません。',
        hint: '質量が変わらないことと結びつけて考えよう。',
      }),
      choice({
        id: 'state-1-t2', concept: 'sc-change', term: true,
        prompt: '次の説明に合う言葉はどれ？「物質が温度によって、固体・液体・気体とすがたを変えること」',
        options: ['蒸留', '状態変化', '沸とう'],
        answer: 'b',
        explanation: '温度によって物質のすがたが変わることを**状態変化**といいます。体積は変わりますが、質量は変わりません。',
        hint: '氷 → 水 → 水蒸気 のような変化の名前だよ。',
      }),
    ],
  };

  // ---- ステージ state-2: 融点と沸点（物質ごとに決まった温度、加熱のグラフ） ----
  const state2 = {
    id: 'state-2', areaId: 'state', title: '融点と沸点', minutes: 5, concepts: ['sc-point'],
    lessons: [
      {
        id: 'state-2-c1',
        text: '固体がとけて液体になるときの温度を**融点**、液体が沸とうして気体になるときの温度を**沸点**といいます。水の融点は 0℃、沸点は 100℃ です。融点と沸点は、物質の種類によって決まっています。',
        // 融点と沸点の表
        figure: scene([
          { type: 'text', x: 160, y: 36, text: '融点と沸点は物質ごとに決まっている', size: 14, anchor: 'middle' },
          { type: 'rect', x: 30, y: 50, width: 260, height: 160, fill: 'white' },
          { type: 'rect', x: 32, y: 52, width: 256, height: 28, fill: 'sky', stroke: 'none' },
          { type: 'line', points: [[30, 82], [290, 82]], width: 2 },
          { type: 'line', points: [[30, 114], [290, 114]], width: 1 },
          { type: 'line', points: [[30, 146], [290, 146]], width: 1 },
          { type: 'line', points: [[30, 178], [290, 178]], width: 1 },
          { type: 'line', points: [[130, 50], [130, 210]], width: 1 },
          { type: 'line', points: [[210, 50], [210, 210]], width: 1 },
          { type: 'text', x: 80, y: 71, text: '物質', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 170, y: 71, text: '融点〔℃〕', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 250, y: 71, text: '沸点〔℃〕', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 80, y: 103, text: '水', size: 14, anchor: 'middle' },
          { type: 'text', x: 170, y: 103, text: '0', size: 14, anchor: 'middle' },
          { type: 'text', x: 250, y: 103, text: '100', size: 14, anchor: 'middle' },
          { type: 'text', x: 80, y: 135, text: 'エタノール', size: 14, anchor: 'middle' },
          { type: 'text', x: 170, y: 135, text: '−115', size: 14, anchor: 'middle' },
          { type: 'text', x: 250, y: 135, text: '78', size: 14, anchor: 'middle' },
          { type: 'text', x: 80, y: 167, text: '酸素', size: 14, anchor: 'middle' },
          { type: 'text', x: 170, y: 167, text: '−218', size: 14, anchor: 'middle' },
          { type: 'text', x: 250, y: 167, text: '−183', size: 14, anchor: 'middle' },
          { type: 'text', x: 80, y: 199, text: '鉄', size: 14, anchor: 'middle' },
          { type: 'text', x: 170, y: 199, text: '1535', size: 14, anchor: 'middle' },
          { type: 'text', x: 250, y: 199, text: '2750', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'state-2-c2',
        anim: 'st-heating-curve',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '氷を加熱し続けると、温度は 0℃ でしばらく一定になり、氷がすべてとけると再び上がります。100℃ で沸とうが始まると、また一定になります。状態が変わっている間は、加えた熱が状態変化に使われるので、グラフが横ばいになります。',
        // 氷を加熱したときの温度変化（0℃ と 100℃ で横ばい）
        figure: scene(heatGraphItems().concat([
          { type: 'text', x: 105, y: 150, text: '氷がとける', size: 12, anchor: 'middle' },
          { type: 'text', x: 105, y: 180, text: '0℃で一定', size: 12, anchor: 'middle' },
          { type: 'text', x: 245, y: 40, text: '水が沸とう', size: 12, anchor: 'middle' },
          { type: 'text', x: 245, y: 72, text: '100℃で一定', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'state-2-c3',
        text: 'エタノールの沸点は 78℃ です。エタノールの量を多くすると、沸とうするまでの時間は長くなりますが、沸点は 78℃ のまま変わりません。1 種類の物質では、量に関係なく融点と沸点は決まっています。',
        // 量のちがうエタノールを加熱したグラフ（どちらも 78℃ で一定）。y = 200 − 1.5 × 温度
        figure: scene([
          { type: 'line', points: [[50, 200], [50, 24]], width: 2, arrow: true },
          { type: 'line', points: [[50, 200], [304, 200]], width: 2, arrow: true },
          { type: 'line', points: [[50, 170], [170, 83], [290, 83]], color: 'orange', width: 3, dashed: true },
          { type: 'line', points: [[50, 170], [110, 83], [290, 83]], color: 'blue', width: 3 },
          { type: 'text', x: 44, y: 88, text: '78', size: 13, anchor: 'end' },
          { type: 'text', x: 44, y: 175, text: '20', size: 13, anchor: 'end' },
          { type: 'text', x: 58, y: 18, text: '温度〔℃〕', size: 13 },
          { type: 'text', x: 304, y: 224, text: '加熱した時間', size: 13, anchor: 'end' },
          { type: 'text', x: 170, y: 60, text: '実線: 量が少ない　点線: 量が多い', size: 12, anchor: 'middle' },
          { type: 'text', x: 225, y: 106, text: 'どちらも 78℃ で一定', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'state-2-w1', concept: 'sc-point',
      prompt: '予想しよう。水を加熱して沸とうが始まったあとも、強い火で加熱を続けると、水の温度はどうなると思う？',
      options: ['どんどん上がり続ける', '100℃ くらいで一定になる', '下がっていく'],
      answer: 'b',
      explanation: '沸とうしている間は、加熱を続けても温度は約 100℃ で一定です。なぜそうなるのか、このステージでグラフを見ながら考えよう。',
      hint: 'やかんのお湯が 200℃ になることはあるかな。',
    }),
    problems: [
      fill({
        id: 'state-2-p1', concept: 'sc-point',
        prompt: '空らんに入る数を入れよう。',
        text: '水の融点は[b1]、沸点は[b2]である。',
        blanks: [number('b1', 0, 0, '℃'), number('b2', 100, 0, '℃')],
        explanation: '水は 0℃ で氷がとけはじめ、100℃ で沸とうします。水の融点 0℃ と沸点 100℃ は、温度を考えるときの基準になる大切な値です。',
        hint: '氷がとける温度と、お湯がわく温度を思い出そう。',
      }),
      fill({
        id: 'state-2-t1', concept: 'sc-point', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '固体がとけて液体になるときの温度を[b1]、液体が沸とうして気体になるときの温度を[b2]という。',
        blanks: [
          word('b1', ['融点', '沸点', '状態変化'], '融点'),
          word('b2', ['融点', '沸点', '状態変化'], '沸点'),
        ],
        explanation: 'とけるときの温度が**融点**、沸とうするときの温度が**沸点**です。「融」はとける、「沸」はわき立つという意味です。',
        hint: '「融」は「とける」、「沸」は「わく」という意味の漢字だよ。',
      }),
      figureChoice({
        id: 'state-2-p2', concept: 'sc-point',
        prompt: '−20℃ の氷を加熱し続けたときの温度変化のグラフです。ア（0℃ の横ばい）、イ（温度が上がっている部分）、ウ（100℃ の横ばい）のうち、氷がとけている最中を表しているのはどれ？',
        figure: scene(heatGraphItems().concat([
          { type: 'region', id: 'r1', x: 105, y: 160, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 165, y: 105, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 245, y: 50, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '氷は融点の 0℃ でとけ、とけている間は温度が一定になります。0℃ の横ばいのアが、氷がとけている最中です。ウは水が沸とうしている最中、イは水の温度が上がっている部分です。',
        hint: '水の融点は何℃だったか思い出そう。',
      }),
      choice({
        id: 'state-2-p3', concept: 'sc-point',
        prompt: '氷を加熱したとき、0℃ でとけている間、加熱を続けても温度が上がりません。このとき、加えた熱は何に使われている？',
        options: ['ビーカーをあたためるのだけに使われている', '氷を水に変える（状態を変える）のに使われている', '熱は使われずに消えている'],
        answer: 'b',
        explanation: '状態が変わっている間は、加えた熱が状態変化に使われるので、温度は上がりません。すべてとけて水になると、また温度が上がりはじめます。',
        hint: 'その間、ビーカーの中で何が起きているかを考えよう。',
      }),
      choice({
        id: 'state-2-p4', concept: 'sc-point',
        prompt: 'エタノールの量を 2 倍にして加熱しました。エタノールの沸点はどうなる？',
        options: ['2 倍の温度になる', '少し低くなる', '変わらない（78℃）'],
        answer: 'c',
        explanation: '沸点は物質の種類で決まっていて、量には関係しません。量が多いと沸とうするまでの時間は長くなりますが、沸点は 78℃ のままです。',
        hint: '量で変わるのは、温度か、時間か、考えよう。',
      }),
      choice({
        id: 'state-2-p5', concept: 'sc-point',
        prompt: 'エタノールの融点は −115℃、沸点は 78℃ です。20℃ のとき、エタノールはどの状態？',
        options: ['固体', '液体', '気体'],
        answer: 'b',
        explanation: '20℃ は融点（−115℃）より高く、沸点（78℃）より低いので、エタノールは液体です。融点と沸点のあいだの温度では、物質は液体になっています。',
        hint: '20℃ が融点と沸点のどちらより高いか、順に比べよう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'state-2-r1', concept: 'sc-point',
        prompt: '空らんに入る数を入れよう。',
        text: 'エタノールを加熱すると、[b1]で沸とうし、沸とうしている間は温度が一定になる。',
        blanks: [number('b1', 78, 0, '℃')],
        explanation: 'エタノールの沸点は 78℃ です。沸とうしている間は、加熱を続けても温度は 78℃ で一定になります。水の沸点 100℃ より低いことも覚えておこう。',
        hint: '水の沸点 100℃ より低い温度だよ。',
      }),
      figureChoice({
        id: 'state-2-r2', concept: 'sc-point',
        prompt: '−20℃ の氷を加熱し続けたときの温度変化のグラフです。ア（0℃ の横ばい）、イ（温度が上がっている部分）、ウ（100℃ の横ばい）のうち、水が沸とうしている最中を表しているのはどれ？',
        figure: scene(heatGraphItems().concat([
          { type: 'region', id: 'r1', x: 105, y: 160, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 165, y: 105, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 245, y: 50, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '水は沸点の 100℃ で沸とうし、沸とうしている間は温度が一定になります。100℃ の横ばいのウが、沸とうしている最中です。',
        hint: '水の沸点は何℃だったか思い出そう。',
      }),
      choice({
        id: 'state-2-r3', concept: 'sc-point',
        prompt: '鉄の融点は 1535℃、沸点は 2750℃ です。鉄を 1000℃ にしたとき、鉄はどの状態？',
        options: ['固体', '液体', '気体'],
        answer: 'a',
        explanation: '1000℃ は鉄の融点 1535℃ より低いので、鉄はまだとけず、固体のままです。とても高い温度でも、融点に届かなければ固体です。',
        hint: '1000℃ と融点 1535℃ を比べよう。',
      }),
      choice({
        id: 'state-2-t2', concept: 'sc-point', term: true,
        prompt: '次の説明に合う言葉はどれ？「液体が沸とうして気体に変わるときの温度」',
        options: ['融点', '沸点', '密度'],
        answer: 'b',
        explanation: '液体が沸とうして気体に変わるときの温度を**沸点**といいます。水の沸点は 100℃、エタノールの沸点は 78℃ です。',
        hint: '「沸とう」の「沸」がつく言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 混合物を分ける
  // ================================================================

  // ---- ステージ state-3: 混合物と純粋な物質（沸点が一定にならない） ----
  const state3 = {
    id: 'state-3', areaId: 'distill', title: '混合物と純粋な物質', minutes: 4, concepts: ['sc-mixture'],
    lessons: [
      {
        id: 'state-3-c1',
        text: '水やエタノール、酸素のように、1 種類の物質だけでできているものを**純粋な物質**といいます。空気・海水・みりんのように、2 種類以上の物質がまざり合ったものを**混合物**といいます。',
        // 純粋な物質（同じ粒子だけ）と混合物（2 種類の粒子）
        figure: scene((function () {
          const dots = [[20, 28], [50, 22], [82, 30], [30, 58], [62, 54], [90, 66], [22, 84], [56, 84]];
          const items = [
            { type: 'text', x: 85, y: 46, text: '純粋な物質', size: 14, anchor: 'middle', bold: true },
            { type: 'text', x: 235, y: 46, text: '混合物', size: 14, anchor: 'middle', bold: true },
            { type: 'rect', x: 30, y: 60, width: 110, height: 100, fill: 'white' },
            { type: 'rect', x: 180, y: 60, width: 110, height: 100, fill: 'white' },
          ];
          dots.forEach(([dx, dy], i) => {
            items.push({ type: 'circle', x: 30 + dx, y: 60 + dy, r: 8, fill: 'sky', stroke: 'blue' });
            items.push({ type: 'circle', x: 180 + dx, y: 60 + dy, r: 8, fill: i % 2 ? 'pink' : 'sky', stroke: i % 2 ? 'ink' : 'blue' });
          });
          items.push(
            { type: 'text', x: 85, y: 184, text: '1 種類の物質', size: 13, anchor: 'middle' },
            { type: 'text', x: 235, y: 184, text: '2 種類以上の物質', size: 13, anchor: 'middle' },
            { type: 'text', x: 85, y: 208, text: '例: 水・エタノール', size: 12, anchor: 'middle' },
            { type: 'text', x: 235, y: 208, text: '例: 空気・海水・みりん', size: 12, anchor: 'middle' },
          );
          return items;
        })()),
      },
      {
        id: 'state-3-c2',
        text: '**純粋な物質**は沸点が決まっているので、沸とうしている間は温度が一定になります。水とエタノールの**混合物**を加熱すると、沸とうが始まっても温度は少しずつ上がり続け、グラフが横ばいになりません。',
        // エタノール（一定）と、水とエタノールの混合物（上がり続ける）。y = 200 − 1.5 × 温度
        figure: scene([
          { type: 'line', points: [[50, 200], [50, 24]], width: 2, arrow: true },
          { type: 'line', points: [[50, 200], [304, 200]], width: 2, arrow: true },
          { type: 'line', points: [[50, 170], [105, 83], [290, 83]], color: 'blue', width: 3 },
          { type: 'line', points: [[50, 170], [130, 80], [180, 74], [235, 66], [290, 58]], color: 'orange', width: 3 },
          { type: 'text', x: 44, y: 88, text: '78', size: 13, anchor: 'end' },
          { type: 'text', x: 44, y: 175, text: '20', size: 13, anchor: 'end' },
          { type: 'text', x: 58, y: 18, text: '温度〔℃〕', size: 13 },
          { type: 'text', x: 304, y: 224, text: '加熱した時間', size: 13, anchor: 'end' },
          { type: 'text', x: 200, y: 106, text: 'エタノール（一定）', size: 12, anchor: 'middle' },
          { type: 'text', x: 196, y: 52, text: '混合物（上がり続ける）', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'state-3-w1', concept: 'sc-mixture',
      prompt: '予想しよう。海水は、1 種類の物質だけでできていると思う？',
      options: ['水だけでできている', '水に食塩などがまざっている', '食塩だけでできている'],
      answer: 'b',
      explanation: '海水は、水に食塩などいろいろな物質がとけてまざったものです。このステージで、まざったものの性質を調べよう。',
      hint: '海水を蒸発させると、何が残るかな。',
    }),
    problems: [
      choice({
        id: 'state-3-p1', concept: 'sc-mixture',
        prompt: '次のうち、純粋な物質はどれ？',
        options: ['空気', '海水', 'エタノール', 'みりん'],
        answer: 'c',
        explanation: 'エタノールは 1 種類の物質なので純粋な物質です。空気（窒素・酸素など）、海水（水・食塩など）、みりん（水・エタノール・糖など）は混合物です。',
        hint: '何かと何かがまざっていないものをさがそう。',
      }),
      fill({
        id: 'state-3-t1', concept: 'sc-mixture', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '1 種類の物質だけでできているものを[b1]、2 種類以上の物質がまざり合ったものを[b2]という。',
        blanks: [
          word('b1', ['純粋な物質', '混合物', '状態変化'], '純粋な物質'),
          word('b2', ['純粋な物質', '混合物', '状態変化'], '混合物'),
        ],
        explanation: '1 種類だけなら**純粋な物質**、2 種類以上がまざっていれば**混合物**です。身のまわりのものの多くは混合物です。',
        hint: '「混合」は、まざり合うという意味だよ。',
      }),
      figureChoice({
        id: 'state-3-p2', concept: 'sc-mixture',
        prompt: 'ア〜ウは、3 つの液体を加熱したときの温度変化のグラフです（たてが温度、横が加熱した時間）。このうち 1 つは、水とエタノールの混合物です。混合物のグラフはどれ？',
        figure: threeGraphsScene(['ethanol', 'mix', 'water']),
        answer: 'r2',
        explanation: '純粋な物質は沸点で温度が一定になり、グラフが横ばいになります。アとウには横ばいがありますが、イは沸とうが始まっても温度が上がり続けています。だからイが混合物です。',
        hint: 'グラフが横ばいにならないものをさがそう。',
      }),
      choice({
        id: 'state-3-p3', concept: 'sc-mixture',
        prompt: '混合物の沸点について、正しいものはどれ？',
        options: ['純粋な物質と同じように、決まった温度になる', '決まった温度にならず、沸とうしている間も温度が少しずつ上がる', '加熱しても沸とうしない'],
        answer: 'b',
        explanation: '混合物は、まざっている物質の割合で沸とうする温度が変わるので、沸点が決まった温度になりません。沸とうしている間も、温度は少しずつ上がります。',
        hint: '水とエタノールの混合物のグラフを思い出そう。',
      }),
      choice({
        id: 'state-3-p4', concept: 'sc-mixture',
        prompt: '次のうち、混合物はどれ？',
        options: ['酸素', '鉄', '食塩水', 'エタノール'],
        answer: 'c',
        explanation: '食塩水は、水に食塩がとけてまざったものなので混合物です。酸素・鉄・エタノールは、それぞれ 1 種類の物質でできた純粋な物質です。',
        hint: '2 種類の物質がまざっているものをさがそう。',
      }),
      fill({
        id: 'state-3-p5', concept: 'sc-mixture',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '純粋な物質は、沸とうしている間の温度が[b1]。水とエタノールの混合物は、沸とうが始まっても温度が[b2]。',
        blanks: [
          word('b1', ['一定になる', '上がり続ける', '下がる'], '一定になる'),
          word('b2', ['一定になる', '少しずつ上がる', '下がる'], '少しずつ上がる'),
        ],
        explanation: '純粋な物質は沸点が決まっているので、沸とう中の温度は一定です。混合物は沸点が決まっていないので、沸とう中も温度が少しずつ上がります。',
        hint: 'グラフが横ばいになるのは、どちらだったかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'state-3-r1', concept: 'sc-mixture',
        prompt: '空気は、純粋な物質と混合物のどちら？',
        options: ['酸素だけでできた純粋な物質', '窒素や酸素などがまざった混合物', '窒素だけでできた純粋な物質'],
        answer: 'b',
        explanation: '空気は、窒素が約 8 割、酸素が約 2 割で、ほかに二酸化炭素などもふくむ混合物です。',
        hint: '空気にふくまれる気体を思い出そう。',
      }),
      figureChoice({
        id: 'state-3-r2', concept: 'sc-mixture',
        prompt: 'ア〜ウは、3 つの液体を加熱したときの温度変化のグラフです（たてが温度、横が加熱した時間）。このうち 1 つは純粋な物質で、残りの 2 つは混合物です。純粋な物質のグラフはどれ？',
        figure: threeGraphsScene(['mix', 'mix2', 'ethanol']),
        answer: 'r3',
        explanation: '純粋な物質は沸点が決まっているので、沸とうしている間はグラフが横ばいになります。横ばいがあるのはウだけです。アとイは温度が上がり続けているので混合物です。',
        hint: 'グラフが横ばいになっているものをさがそう。',
      }),
      fill({
        id: 'state-3-r3', concept: 'sc-mixture',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '海水は、水に食塩などがとけてまざったものなので[b1]である。',
        blanks: [word('b1', ['純粋な物質', '混合物'], '混合物')],
        explanation: '海水には、水のほかに食塩などがまざっているので混合物です。2 種類以上の物質がまざっていれば混合物です。',
        hint: '何種類の物質がまざっているか数えよう。',
      }),
      choice({
        id: 'state-3-t2', concept: 'sc-mixture', term: true,
        prompt: '次の説明に合う言葉はどれ？「2 種類以上の物質がまざり合ったもの」',
        options: ['純粋な物質', '混合物', '沸とう石'],
        answer: 'b',
        explanation: '2 種類以上の物質がまざり合ったものを**混合物**といいます。混合物は、沸とうしている間も温度が一定になりません。',
        hint: '「まざり合う」という意味の言葉が入っているよ。',
      }),
    ],
  };

  // ---- ステージ state-4: 蒸留（沸点のちがいで分ける、装置の注意） ----
  const state4 = {
    id: 'state-4', areaId: 'distill', title: '蒸留', minutes: 5, concepts: ['sc-distill'],
    lessons: [
      {
        id: 'state-4-c1',
        text: '液体を加熱して沸とうさせ、出てきた気体を冷やして再び液体にして集める方法を**蒸留**といいます。物質によって沸点がちがうことを利用すると、混合物から物質を分けて取り出すことができます。',
        // 写真: 蒸留の装置。温度計 (90, 5〜94。球は枝の高さ)、枝付きフラスコ (91, 131)、沸とう石 (91, 146)、
        // ガスバーナーの炎 (90, 161)、ガラス管 (100, 98)→(252, 132)、氷水のビーカー (232〜290, 157〜220) の中の試験管 (255, 140〜)
        figure: scene([
          photo('state-4-c1'),
          pointer(109, 27, 93, 30), tag(130, 30, '温度計', { size: 13 }),
          pointer(185, 100, 185, 113), tag(185, 96, 'ガラス管', { size: 13 }),
          pointer(278, 104, 262, 142), tag(292, 98, '試験管', { size: 13 }),
          pointer(124, 148, 110, 140), tag(175, 152, '枝付きフラスコ', { size: 13 }),
          pointer(138, 170, 96, 148), tag(165, 174, '沸とう石', { size: 13 }),
          pointer(121, 193, 96, 164), tag(136, 198, '加熱', { size: 13 }),
          tag(262, 234, '氷水', { size: 13 }),
        ]),
      },
      {
        id: 'state-4-c2',
        anim: 'st-distill-order',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '水とエタノールの混合物を蒸留し、出てきた液体を試験管 3 本に順に集めます。1 本目は沸点の低いエタノールを多くふくみ、においが強く、火を近づけるとよく燃えます。あとの試験管ほど水が多くなります。',
        // 集めた順に 3 本の試験管
        figure: scene([
          { type: 'tube', x: 60, y: 170, height: 90, level: 0.3 },
          { type: 'tube', x: 160, y: 170, height: 90, level: 0.3 },
          { type: 'tube', x: 260, y: 170, height: 90, level: 0.3 },
          { type: 'text', x: 60, y: 66, text: '1 本目', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 66, text: '2 本目', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 260, y: 66, text: '3 本目', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 60, y: 196, text: 'においが強い', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 196, text: '少しにおう', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 196, text: 'ほとんどない', size: 12, anchor: 'middle' },
          { type: 'text', x: 60, y: 214, text: 'よく燃える', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 214, text: '少し燃える', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 214, text: '燃えない', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 236, text: '沸点の低いエタノールが先に多く出る', size: 13, anchor: 'middle' },
          { type: 'arrow', x1: 90, y1: 40, x2: 230, y2: 40, color: 'gray', label: '集めた順' },
        ]),
      },
      {
        id: 'state-4-c3',
        text: '蒸留では、急な沸とうを防ぐために**沸とう石**を入れます。温度計の球は、出ていく気体の温度を測るため枝の高さにします。ガラス管の先は集めた液体につけません。火を消したとき液体が逆流するのを防ぐためです。',
        // 装置の注意点
        figure: scene(distillItems({ thermo: 80 }).concat([
          { type: 'text', x: 110, y: 60, text: '球は枝の高さに', size: 12 },
          { type: 'text', x: 8, y: 150, text: '沸とう石', size: 12 },
          { type: 'text', x: 8, y: 166, text: 'を入れる', size: 12 },
          { type: 'text', x: 256, y: 120, text: '先は液体に', size: 12 },
          { type: 'text', x: 256, y: 136, text: 'つけない', size: 12 },
        ])),
      },
    ],
    warmup: choice({
      id: 'state-4-w1', concept: 'sc-distill',
      prompt: '予想しよう。水とエタノールの混合物を加熱し、出てきた気体を冷やして集めます。はじめに集まる液体に多くふくまれるのは、どちらだと思う？',
      options: ['水', 'エタノール', 'どちらも同じくらい'],
      answer: 'b',
      explanation: 'はじめに集まる液体には、沸点の低いエタノールが多くふくまれます。沸点のちがいを使って物質を分ける方法を、このステージで学ぼう。',
      hint: '水の沸点は 100℃、エタノールの沸点は 78℃ だったね。',
    }),
    problems: [
      choice({
        id: 'state-4-p1', concept: 'sc-distill',
        prompt: '蒸留とは、どのような方法？',
        options: ['液体をろ紙でこして、固体と分ける方法', '液体を加熱して出てきた気体を冷やし、再び液体にして集める方法', '液体を冷やして固体にし、取り出す方法'],
        answer: 'b',
        explanation: '蒸留は、液体を加熱して沸とうさせ、出てきた気体を冷やして液体にもどして集める方法です。沸点のちがいを利用して、混合物から物質を分けられます。',
        hint: '加熱して気体にし、冷やしてまた液体にする方法だよ。',
      }),
      fill({
        id: 'state-4-t1', concept: 'sc-distill', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '液体を沸とうさせ、出てきた気体を冷やして再び液体として集める方法を[b1]という。このとき、急な沸とうを防ぐために[b2]を入れる。',
        blanks: [
          word('b1', ['蒸留', 'ろ過', '状態変化'], '蒸留'),
          word('b2', ['沸とう石', '温度計', '食塩'], '沸とう石'),
        ],
        explanation: '気体にしてから冷やして液体にもどして集める方法が**蒸留**です。加熱する液体には**沸とう石**を入れて、急に沸とうするのを防ぎます。',
        hint: '「蒸」は湯気、「留」はとどめるという意味だよ。',
      }),
      figureChoice({
        id: 'state-4-p2', concept: 'sc-distill',
        prompt: '蒸留の装置で、温度計の球（下のはし）を置く位置はどこ？ ア 枝分かれしている高さ、イ フラスコの中の液面より上のあたり、ウ フラスコの液体の中。',
        figure: scene(distillItems().concat([
          { type: 'region', id: 'r1', x: 90, y: 80, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 90, y: 140, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 90, y: 184, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: '蒸留では、枝から出ていく気体の温度を測りたいので、温度計の球は枝分かれしている高さのアに置きます。液体の中に入れると、液体の温度を測ることになります。',
        hint: '測りたいのは、液体の温度か、出ていく気体の温度か考えよう。',
      }),
      drag({
        id: 'state-4-p3', concept: 'sc-distill',
        prompt: '蒸留の装置です。温度計を上下に動かして、温度計の球（下のはし）がフラスコの枝分かれしている高さにくるように置こう。',
        // 枝の高さは y=80。温度計は高さ 44 の rect で、基準点は左上。球が y=80 なら左上は y=36
        figure: scene(distillItems({ thermo: 172 })),
        draggable: { itemId: 'thermo', axis: 'y' },
        target: { x: 87, y: 36 },
        samples: { correct: { x: 87, y: 36 }, wrong: { x: 87, y: 86 } },
        explanation: '温度計の球を枝の高さに置くと、枝から出ていく気体の温度を測れます。この温度が沸点に近いかどうかで、どの物質が多く出ているかが分かります。',
        hint: 'ガラス管がフラスコからのびているところの高さに、温度計の下のはしを合わせよう。',
      }),
      choice({
        id: 'state-4-p4', concept: 'sc-distill',
        prompt: '蒸留で、加熱する液体に沸とう石を入れるのはなぜ？',
        options: ['液体を早く冷やすため', '急に沸とうするのを防ぐため', '液体の量をふやすため'],
        answer: 'b',
        explanation: '沸とう石を入れないと、液体が急に激しく沸とうして、ふき出すことがあります。沸とう石は、おだやかに沸とうさせるために入れます。',
        hint: '液体が急にふき上がると危ないね。',
      }),
      choice({
        id: 'state-4-p5', concept: 'sc-distill',
        prompt: '赤ワイン（おもに水とエタノールの混合物）を蒸留し、出てきた液体を試験管 3 本に順に集めました。1 本目の液体について正しいものはどれ？',
        options: ['ほとんど水で、火を近づけても燃えない', 'エタノールを多くふくみ、火を近づけると燃える', '赤ワインと同じ色をしている'],
        answer: 'b',
        explanation: 'エタノールは水より沸点が低いので、はじめに多く出てきます。だから 1 本目はエタノールを多くふくみ、においが強く、火を近づけると燃えます。',
        hint: '水とエタノールでは、どちらの沸点が低かったかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'state-4-r1', concept: 'sc-distill',
        prompt: '蒸留の実験で、ガラス管の先を集めた液体の中に入れないのはなぜ？',
        options: ['火を消したとき、集めた液体がフラスコへ逆流するのを防ぐため', '液体がこおるのを防ぐため', '温度計が見えなくなるため'],
        answer: 'a',
        explanation: '火を消すとフラスコの中の気体が冷えて、ガラス管の先から液体を吸いこむことがあります。ガラス管の先を液体につけておかなければ、逆流を防げます。',
        hint: '加熱をやめたあと、フラスコの中では何が起きるか考えよう。',
      }),
      choice({
        id: 'state-4-r2', concept: 'sc-distill',
        prompt: '水とエタノールの混合物を蒸留すると、はじめに出てくる気体にエタノールが多くふくまれます。それはなぜ？',
        options: ['エタノールの沸点が水より低いから', 'エタノールの沸点が水より高いから', 'エタノールのほうが量が多いから'],
        answer: 'a',
        explanation: 'エタノールの沸点（78℃）は水の沸点（100℃）より低いので、先に気体になって多く出てきます。沸点のちがいを使って分けるのが蒸留です。',
        hint: '78℃ と 100℃、先に届くのはどちらかな。',
      }),
      figureChoice({
        id: 'state-4-r3', concept: 'sc-distill',
        prompt: '蒸留の装置で、出てきた気体が冷やされて再び液体になり、たまるところはどこ？ ア フラスコの中の液体、イ ガラス管のとちゅう、ウ 氷水で冷やした試験管の中。',
        figure: scene(distillItems({ thermo: 80 }).concat([
          { type: 'region', id: 'r1', x: 90, y: 180, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 170, y: 93, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 240, y: 198, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: 'フラスコで出てきた気体は、ガラス管を通って氷水で冷やした試験管に入り、冷やされて液体にもどってたまります。だからウです。',
        hint: '気体を冷やしているのはどこか、さがそう。',
      }),
      choice({
        id: 'state-4-t2', concept: 'sc-distill', term: true,
        prompt: '次の説明に合う言葉はどれ？「加熱する液体に入れて、急な沸とうを防ぐもの」',
        options: ['沸とう石', '温度計', 'ろ紙'],
        answer: 'a',
        explanation: '加熱する液体に入れて、急に激しく沸とうするのを防ぐものを**沸とう石**といいます。蒸留でも必ず入れます。',
        hint: '「沸とう」という言葉が入っているよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'sc-change', title: '状態変化と質量・体積', basic: null, lessonStageId: 'state-1',
      checkPool: [
        choice({
          id: 'sc-change-k1', concept: 'sc-change',
          prompt: '液体のろうを冷やして固体にしたとき、体積と質量はどうなる？',
          options: ['体積も質量も減る', '体積は減るが、質量は変わらない', '体積は変わらないが、質量は減る'],
          answer: 'b',
          explanation: 'ろうは固体になると体積が減り、まん中がへこみます。状態変化なので、質量は変わりません。',
          hint: '状態変化で変わらないものは何だったかな。',
        }),
        fill({
          id: 'sc-change-k2', concept: 'sc-change',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '物質が状態変化するとき、[b1]は変化するが、[b2]は変化しない。',
          blanks: [
            word('b1', ['体積', '質量'], '体積'),
            word('b2', ['体積', '質量'], '質量'),
          ],
          explanation: '状態変化では、粒子の間隔が変わるので体積は変わりますが、粒子の数は変わらないので質量は変わりません。',
          hint: '袋がふくらんだエタノールの実験を思い出そう。',
        }),
        choice({
          id: 'sc-change-k3', concept: 'sc-change',
          prompt: '水をこおらせて氷にすると、体積はどうなる？',
          options: ['大きくなる', '小さくなる', '変わらない'],
          answer: 'a',
          explanation: '水は例外で、氷になると体積が約 1.1 倍に大きくなります。だから氷は水に浮きます。質量は変わりません。',
          hint: '氷が水に浮くことを思い出そう。',
        }),
      ],
    },
    {
      id: 'sc-model', title: '粒子のモデル', basic: 'sc-change', lessonStageId: 'state-1',
      checkPool: [
        choice({
          id: 'sc-model-k1', concept: 'sc-model',
          prompt: '固体の粒子のようすとして正しいものはどれ？',
          options: ['規則正しく並び、その場でわずかにゆれ動いている', '並び方がくずれ、位置を変えて動き回っている', '間隔が広く、自由に飛び回っている'],
          answer: 'a',
          explanation: '固体では、粒子が規則正しく並び、その場でわずかにゆれ動いています。並び方がくずれて動くのは液体、自由に飛び回るのは気体です。',
          hint: '固体は形が変わりにくいことと結びつけよう。',
        }),
        choice({
          id: 'sc-model-k2', concept: 'sc-model',
          prompt: '気体の粒子のようすとして正しいものはどれ？',
          options: ['規則正しく並んでいる', 'すき間なく集まっている', '粒子どうしの間隔が広く、自由に飛び回っている'],
          answer: 'c',
          explanation: '気体では、粒子どうしの間隔がとても広く、粒子が自由に飛び回っています。そのため気体は体積がとても大きくなります。',
          hint: '気体になると体積がとても大きくなるのはなぜだったかな。',
        }),
        fill({
          id: 'sc-model-k3', concept: 'sc-model',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '物質を加熱すると、粒子の運動が[b1]、粒子どうしの間隔が[b2]。',
          blanks: [
            word('b1', ['激しくなり', 'おだやかになり'], '激しくなり'),
            word('b2', ['広がる', 'せまくなる'], '広がる'),
          ],
          explanation: '加熱すると粒子の運動が激しくなり、粒子どうしの間隔が広がります。こうして固体 → 液体 → 気体と変わっていきます。',
          hint: '温めると体積が大きくなることと結びつけよう。',
        }),
      ],
    },
    {
      id: 'sc-point', title: '融点・沸点とグラフ', basic: 'sc-change', lessonStageId: 'state-2',
      checkPool: [
        choice({
          id: 'sc-point-k1', concept: 'sc-point',
          prompt: '融点や沸点について、正しいものはどれ？',
          options: ['物質の量が多いほど高くなる', '物質の種類によって決まっていて、量には関係しない', 'どの物質でも同じ温度になる'],
          answer: 'b',
          explanation: '融点や沸点は物質の種類によって決まっていて、量には関係しません。だから、融点や沸点を調べると物質を見分ける手がかりになります。',
          hint: 'エタノールの量を 2 倍にしたときを思い出そう。',
        }),
        fill({
          id: 'sc-point-k2', concept: 'sc-point',
          prompt: '空らんに入る数を入れよう。',
          text: '氷がとけて水になるときの温度（水の融点）は[b1]である。',
          blanks: [number('b1', 0, 0, '℃')],
          explanation: '水の融点は 0℃ です。氷がとけている間は、加熱を続けても温度は 0℃ で一定になります。',
          hint: '氷水の温度を思い出そう。',
        }),
        choice({
          id: 'sc-point-k3', concept: 'sc-point',
          prompt: '氷を加熱したグラフで、0℃ の横ばいになっている間、ビーカーの中はどうなっている？',
          options: ['氷だけ', '水だけ', '氷と水がまじっている', '水と水蒸気がまじっている'],
          answer: 'c',
          explanation: '0℃ の横ばいの間は、氷がとけている最中なので、氷と水がまじっています。氷がすべてとけて水だけになると、温度が上がりはじめます。',
          hint: '横ばいの間は、とけている最中だったね。',
        }),
      ],
    },
    {
      id: 'sc-mixture', title: '純粋な物質と混合物', basic: 'sc-point', lessonStageId: 'state-3',
      checkPool: [
        choice({
          id: 'sc-mixture-k1', concept: 'sc-mixture',
          prompt: '次のうち、混合物ではないものはどれ？',
          options: ['空気', 'みりん', '酸素', '海水'],
          answer: 'c',
          explanation: '酸素は 1 種類の物質でできた純粋な物質です。空気・みりん・海水は、いくつかの物質がまざった混合物です。',
          hint: '1 種類の物質だけでできているものをさがそう。',
        }),
        choice({
          id: 'sc-mixture-k2', concept: 'sc-mixture',
          prompt: '加熱して沸とうさせたとき、沸とうしている間に温度が一定にならないのはどれ？',
          options: ['水', 'エタノール', '水とエタノールの混合物'],
          answer: 'c',
          explanation: '水やエタノールは純粋な物質なので、沸とうしている間は温度が一定です。混合物は沸点が決まっていないので、温度が少しずつ上がります。',
          hint: '沸点が決まっていないのはどれかな。',
        }),
        fill({
          id: 'sc-mixture-k3', concept: 'sc-mixture',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '純粋な物質は沸点が[b1]が、混合物は沸点が[b2]。',
          blanks: [
            word('b1', ['決まっている', '決まっていない'], '決まっている'),
            word('b2', ['決まっている', '決まっていない'], '決まっていない'),
          ],
          explanation: '純粋な物質は沸点が決まっていて、沸とう中の温度は一定です。混合物は沸点が決まっておらず、グラフが横ばいになりません。',
          hint: 'グラフが横ばいになるかどうかを思い出そう。',
        }),
      ],
    },
    {
      id: 'sc-distill', title: '蒸留', basic: 'sc-mixture', lessonStageId: 'state-4',
      checkPool: [
        choice({
          id: 'sc-distill-k1', concept: 'sc-distill',
          prompt: '蒸留で、温度計の球をフラスコの枝分かれしている高さにするのはなぜ？',
          options: ['フラスコの中の液体の温度を測るため', '枝から出ていく気体の温度を測るため', '温度計がこわれないようにするため'],
          answer: 'b',
          explanation: '蒸留では、枝から出ていく気体の温度を測ります。そのため温度計の球を枝の高さにします。',
          hint: '測りたいのは、液体と気体のどちらの温度かな。',
        }),
        choice({
          id: 'sc-distill-k2', concept: 'sc-distill',
          prompt: '蒸留で混合物から物質を分けられるのは、物質の何のちがいを利用しているから？',
          options: ['沸点のちがい', '色のちがい', '形のちがい'],
          answer: 'a',
          explanation: '蒸留は、物質によって沸点がちがうことを利用して分ける方法です。沸点の低い物質ほど、先に気体になって出てきます。',
          hint: '加熱して気体にするときの温度に注目しよう。',
        }),
        fill({
          id: 'sc-distill-k3', concept: 'sc-distill',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '水とエタノールの混合物を蒸留すると、はじめは沸点の[b1][b2]を多くふくむ液体が出てくる。',
          blanks: [
            word('b1', ['低い', '高い'], '低い'),
            word('b2', ['エタノール', '水'], 'エタノール'),
          ],
          explanation: 'エタノールの沸点 78℃ は水の沸点 100℃ より低いので、はじめはエタノールを多くふくむ液体が出てきます。',
          hint: '水とエタノールの沸点を比べよう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 領域 3: ミニプリント（先生の自作プリントの問題を書き直したもの。docs/reports/content/state-change.md）
  // ================================================================

  // 液体のロウを冷やして固めたときの表面（ビーカーの底の中央 (cx, 190)）。kind は 'dent'（中央がくぼむ）| 'flat' | 'bulge'
  function mpWaxItems(cx, kind) {
    const top = {
      dent: [[cx - 33, 140], [cx - 16, 146], [cx, 154], [cx + 16, 146], [cx + 33, 140]],
      flat: [[cx - 33, 146], [cx + 33, 146]],
      bulge: [[cx - 33, 150], [cx - 16, 142], [cx, 136], [cx + 16, 142], [cx + 33, 150]],
    }[kind];
    return [
      { type: 'polygon', points: [[cx - 33, 188]].concat(top, [[cx + 33, 188]]), fill: '#F4F0E0', stroke: 'none' },
      { type: 'beaker', x: cx, y: 190, width: 70, height: 90, level: 0 },
    ];
  }
  // ロウの固まり方を選ぶ図（ア 中央がくぼむ・イ 平ら・ウ 中央が盛り上がる）
  const MP_WAX_Q = scene([].concat(mpWaxItems(55, 'dent'), mpWaxItems(160, 'flat'), mpWaxItems(265, 'bulge'), [
    { type: 'text', x: 160, y: 40, text: '固まったロウの表面（横から見た図）', size: 13, anchor: 'middle' },
    { type: 'region', id: 'r1', x: 55, y: 216, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 216, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 265, y: 216, r: 22, label: 'ウ' },
  ]));

  // 物質の融点・沸点の表（℃）
  const MP_POINTS = [['鉄', 1535, 2750], ['アルミニウム', 660, 2467], ['食塩', 801, 1413], ['水', 0, 100], ['エタノール', -115, 78], ['酸素', -218, -183]];
  function mpPointTable() {
    const x0 = 40, y0 = 28, w = 240, headH = 26, rowH = 30;
    const items = [
      { type: 'rect', x: x0, y: y0, width: w, height: headH + rowH * MP_POINTS.length, fill: 'white' },
      { type: 'line', points: [[x0 + 110, y0], [x0 + 110, y0 + headH + rowH * MP_POINTS.length]], color: 'line', width: 1 },
      { type: 'text', x: x0 + 8, y: y0 + 18, text: '物質', size: 12 },
      { type: 'text', x: x0 + 145, y: y0 + 18, text: '融点〔℃〕', size: 12, anchor: 'middle' },
      { type: 'text', x: x0 + 208, y: y0 + 18, text: '沸点〔℃〕', size: 12, anchor: 'middle' },
    ];
    MP_POINTS.forEach(([name, mp, bp], j) => {
      const top = y0 + headH + rowH * j;
      items.push({ type: 'line', points: [[x0, top], [x0 + w, top]], color: 'line', width: 1 });
      items.push({ type: 'text', x: x0 + 8, y: top + 20, text: name, size: 13 });
      items.push({ type: 'text', x: x0 + 145, y: top + 20, text: String(mp).replace('-', '−'), size: 13, anchor: 'middle' });
      items.push({ type: 'text', x: x0 + 208, y: top + 20, text: String(bp).replace('-', '−'), size: 13, anchor: 'middle' });
    });
    return scene(items);
  }

  // 加熱した時間と温度の表（0〜8 分）。temps は 9 つの温度
  function mpTimeTableItems(title, temps, y0) {
    const x0 = 8, nameW = 52, colW = 28;
    const items = [
      { type: 'text', x: 160, y: y0 - 8, text: title, size: 13, anchor: 'middle' },
      { type: 'rect', x: x0, y: y0, width: nameW + colW * 9, height: 56, fill: 'white' },
      { type: 'line', points: [[x0, y0 + 28], [x0 + nameW + colW * 9, y0 + 28]], color: 'line', width: 1 },
      { type: 'line', points: [[x0 + nameW, y0], [x0 + nameW, y0 + 56]], color: 'line', width: 1 },
      { type: 'text', x: x0 + 4, y: y0 + 19, text: '時間〔分〕', size: 12 },
      { type: 'text', x: x0 + 4, y: y0 + 47, text: '温度〔℃〕', size: 12 },
    ];
    temps.forEach((t, i) => {
      const cx = x0 + nameW + colW * i + colW / 2;
      items.push({ type: 'text', x: cx, y: y0 + 19, text: String(i), size: 12, anchor: 'middle' });
      items.push({ type: 'text', x: cx, y: y0 + 47, text: String(t), size: 12, anchor: 'middle' });
    });
    return items;
  }
  const MP_ETHANOL = [26, 43, 60, 78, 78, 78, 78, 78, 78];
  const MP_MIX = [26, 43, 60, 78, 79, 80, 82, 83, 84];

  // 表の温度をかいた小さなグラフ（横 0〜8 分は x 50〜290、たて 20〜100 ℃ は y 226〜82）。sets は [[temps, color, name], ...]
  function mpGraphItems(sets) {
    const gx = m => 50 + 30 * m, gy = t => 226 - 1.8 * (t - 20);
    const items = [
      { type: 'line', points: [[50, 76], [50, 226], [298, 226]], width: 2 },
      { type: 'text', x: 44, y: gy(100) + 4, text: '100', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: gy(60) + 4, text: '60', size: 12, anchor: 'end' },
      { type: 'line', points: [[50, gy(100)], [290, gy(100)]], color: 'glass', width: 1 },
      { type: 'line', points: [[50, gy(60)], [290, gy(60)]], color: 'glass', width: 1 },
    ];
    sets.forEach(([temps, color, name, ty]) => {
      items.push({ type: 'line', points: temps.map((t, i) => [gx(i), gy(t)]), color, width: 3 });
      items.push({ type: 'text', x: 296, y: ty, text: name, size: 12, color, anchor: 'end' });
    });
    return items;
  }

  // 集めた順の試験管 3 本（左から 1 本目・2 本目・3 本目）
  const MP_TUBES_Q = scene([
    { type: 'text', x: 160, y: 30, text: '赤ワインを加熱して集めた順', size: 14, anchor: 'middle' },
    { type: 'tube', x: 70, y: 170, height: 100, level: 0.3 },
    { type: 'tube', x: 160, y: 170, height: 100, level: 0.3 },
    { type: 'tube', x: 250, y: 170, height: 100, level: 0.3 },
    { type: 'text', x: 70, y: 192, text: '1 本目', size: 13, anchor: 'middle' },
    { type: 'text', x: 160, y: 192, text: '2 本目', size: 13, anchor: 'middle' },
    { type: 'text', x: 250, y: 192, text: '3 本目', size: 13, anchor: 'middle' },
    { type: 'region', id: 'r1', x: 70, y: 218, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 218, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 250, y: 218, r: 22, label: 'ウ' },
  ]);

  // 加熱グラフ（heatGraphItems）の 3 か所を選ぶ図: ア 0 ℃ で平ら・イ 上がっている途中・ウ 100 ℃ で平ら
  const MP_HEAT_Q = scene(heatGraphItems().concat([
    { type: 'region', id: 'r1', x: 105, y: 160, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 165, y: 105, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 245, y: 50, r: 22, label: 'ウ' },
  ]));

  // ---- ステージ state-change-mp1: プリント 1（状態変化と体積・質量） ----
  const scMp1 = {
    id: 'state-change-mp1', areaId: 'state-change-miniprint', title: 'プリント 1: 状態変化と体積・質量', minutes: 5, concepts: ['sc-change'],
    lessons: [
      {
        id: 'state-change-mp1-c1',
        anim: 'st-state-arrows',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '物質は温度によって、固体・液体・気体とすがたを変えます。これを**状態変化**といいます。加熱すると固体 → 液体 → 気体と変わります。ドライアイスのように、固体から直接気体になる物質もあります。',
        figure: scene([
          { type: 'rect', x: 20, y: 150, width: 80, height: 40, fill: 'white', label: '固体' },
          { type: 'rect', x: 220, y: 150, width: 80, height: 40, fill: 'white', label: '液体' },
          { type: 'rect', x: 120, y: 30, width: 80, height: 40, fill: 'white', label: '気体' },
          { type: 'arrow', x1: 104, y1: 162, x2: 216, y2: 162, color: 'orange' },
          { type: 'arrow', x1: 216, y1: 182, x2: 104, y2: 182, color: 'blue' },
          { type: 'arrow', x1: 252, y1: 146, x2: 198, y2: 76, color: 'orange' },
          { type: 'arrow', x1: 70, y1: 146, x2: 124, y2: 76, color: 'orange' },
          { type: 'text', x: 160, y: 218, text: 'オレンジ: 加熱　青: 冷やす', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'state-change-mp1-c2',
        text: '液体のロウを冷やして固体にすると、体積が小さくなり、表面の中央がくぼみます。質量は変わりません。多くの物質はロウと同じですが、**水**は例外で、氷になると体積が大きくなります。',
        // 写真: 左は固まったロウのビーカー（x 10〜142。表面の中央 (78, 105) がくぼむ）、右は水を凍らせたカップ（x 175〜310。氷の表面の中央 (243, 68) が盛り上がる）。
        // 上下は白い余白
        figure: scene([
          photo('state-change-mp1-c2'),
          pointer(78, 32, 78, 100), tag(78, 26, '中央がくぼむ', { size: 13 }),
          pointer(243, 32, 243, 64), tag(243, 26, '盛り上がる', { size: 13 }),
          tag(78, 214, 'ロウ: 体積が減る', { size: 13 }),
          tag(243, 214, '水 → 氷: 体積が増える', { size: 13 }),
          tag(160, 236, '質量はどちらも変わらない', { bold: true }),
        ]),
      },
    ],
    warmup: choice({
      id: 'state-change-mp1-w1', concept: 'sc-change',
      prompt: '予想しよう。液体のロウをビーカーに入れて冷やし、固体にしました。表面はどうなると思う？',
      options: ['中央がくぼむ', '中央が盛り上がる', '平らなまま'],
      answer: 'a',
      explanation: 'ロウは固体になると体積が小さくなるので、表面の中央がくぼみます。体積と質量がどう変わるか、このステージで確かめよう。',
      hint: '固体になると、粒子どうしの間がつまるよ。',
    }),
    problems: [
      fill({
        id: 'state-change-mp1-p1', concept: 'sc-change',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '水は、温度によって、氷のような[b1]、ふつうの水のような[b2]、水蒸気のような[b3]とすがたを変える。',
        blanks: [
          word('b1', ['固体', '液体', '気体'], '固体'),
          word('b2', ['固体', '液体', '気体'], '液体'),
          word('b3', ['固体', '液体', '気体'], '気体'),
        ],
        explanation: '氷は固体、水は液体、水蒸気は気体です。同じ水という物質が、温度によってすがたを変えています。',
        hint: '形が決まっているもの・流れるもの・目に見えないもの、の順だよ。',
      }),
      fill({
        id: 'state-change-mp1-t1', concept: 'sc-change', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質が温度によって、固体・液体・気体とすがたを変えることを[b1]という。',
        blanks: [word('b1', ['状態変化', '化学変化', '蒸留'], '状態変化')],
        explanation: '温度によって物質の状態（すがた）が変わることを**状態変化**といいます。物質そのものは変わりません。',
        hint: '「状態」が「変化」する、という言葉だよ。',
      }),
      figureChoice({
        id: 'state-change-mp1-p2', concept: 'sc-change',
        prompt: '液体のロウを冷やして固めました。固まったロウの表面はどうなる？ ア 中央がくぼむ、イ 平らになる、ウ 中央が盛り上がる、から選ぼう。',
        figure: MP_WAX_Q,
        answer: 'r1',
        explanation: 'ロウは固体になると体積が小さくなります。まわりから先に固まり、中央が最後に固まって縮むので、中央がくぼみます。',
        hint: '固体になると体積は小さくなるね。',
      }),
      choice({
        id: 'state-change-mp1-p3', concept: 'sc-change',
        prompt: '次の変化のうち、加熱したときに起こるものの組み合わせはどれ？',
        options: ['固体 → 液体、液体 → 気体、固体 → 気体', '液体 → 固体、気体 → 液体、気体 → 固体', '固体 → 液体、気体 → 液体、気体 → 固体'],
        answer: 'a',
        explanation: '加熱すると、固体 → 液体 → 気体の向きに変わります。固体から直接気体になる変化もあります。逆の向きは、冷やしたときに起こります。',
        hint: '温度が上がると、粒子の動きがはげしくなる向きだよ。',
      }),
      choice({
        id: 'state-change-mp1-p4', concept: 'sc-change',
        prompt: '水では、固体と気体の間で直接すがたが変わるようすは分かりにくいです。固体から直接気体に変わるようすが分かりやすい物質はどれ？',
        options: ['ドライアイス（二酸化炭素）', '食塩', '鉄'],
        answer: 'a',
        explanation: 'ドライアイスは二酸化炭素の固体で、液体にならずに直接気体の二酸化炭素に変わります。',
        hint: 'とけて液体にならずに、小さくなっていく物質だよ。',
      }),
      fill({
        id: 'state-change-mp1-p5', concept: 'sc-change',
        prompt: '液体を冷やして固体にしました。空らんに入る言葉を選ぼう。',
        text: '水が氷になると、体積は[b1]、質量は[b2]。ロウが液体から固体になると、体積は[b3]、質量は[b4]。',
        blanks: [
          word('b1', ['増える', '減る', '変わらない'], '増える'),
          word('b2', ['増える', '減る', '変わらない'], '変わらない'),
          word('b3', ['増える', '減る', '変わらない'], '減る'),
          word('b4', ['増える', '減る', '変わらない'], '変わらない'),
        ],
        explanation: '状態変化では、粒子の数は変わらないので質量は変わりません。体積は、ロウは減り、水は例外で増えます。',
        hint: '質量は粒子の数で決まるよ。体積は水だけが例外だったね。',
      }),
    ],
    retryPool: [
      fill({
        id: 'state-change-mp1-r1', concept: 'sc-change',
        prompt: 'ロウを観察しました。空らんに入る言葉を選ぼう。',
        text: '液体のロウは[b1]で、冷えて固体になると[b2]になる。',
        blanks: [
          word('b1', ['無色透明', '白色', '黒色'], '無色透明'),
          word('b2', ['無色透明', '白色', '黒色'], '白色'),
        ],
        explanation: 'とけた液体のロウはすきとおっていますが、固まると白くにごった固体になります。',
        hint: 'ろうそくのしずくが固まるようすを思い出そう。',
      }),
      choice({
        id: 'state-change-mp1-r2', concept: 'sc-change',
        prompt: 'ロウが液体から固体になると、体積はどうなるといえる？',
        options: ['小さくなる', '大きくなる', '変わらない'],
        answer: 'a',
        explanation: '固まったロウの表面の中央がくぼんだことから、体積が小さくなったことが分かります。',
        hint: '表面の中央がくぼんだね。',
      }),
      choice({
        id: 'state-change-mp1-r3', concept: 'sc-change',
        prompt: '水やロウ以外の多くの物質は、液体から固体になると体積はどうなる？',
        options: ['ロウと同じで小さくなる', '水と同じで大きくなる', '物質によらず変わらない'],
        answer: 'a',
        explanation: '多くの物質は、ロウと同じように固体になると体積が小さくなります。氷になると体積が大きくなる水は例外です。',
        hint: '水は例外だったね。',
      }),
      choice({
        id: 'state-change-mp1-r4', concept: 'sc-change',
        prompt: '次の変化のうち、冷やしたときに起こるものはどれ？',
        options: ['水蒸気が水になる', '氷が水になる', '水が水蒸気になる'],
        answer: 'a',
        explanation: '冷やすと、気体 → 液体 → 固体の向きに変わります。水蒸気（気体）が水（液体）になるのは冷やしたときです。',
        hint: '冷やすと、粒子の動きがおだやかになる向きだよ。',
      }),
    ],
  };

  // ---- ステージ state-change-mp2: プリント 2（融点・沸点、エタノールの沸騰） ----
  const scMp2 = {
    id: 'state-change-mp2', areaId: 'state-change-miniprint', title: 'プリント 2: 融点・沸点を読む', minutes: 5, concepts: ['sc-point'],
    lessons: [
      {
        id: 'state-change-mp2-c1',
        anim: 'st-melt-boil',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '固体がとけて液体になるときの温度を**融点**、液体が沸騰するときの温度を**沸点**といいます。水の融点は 0 ℃、沸点は 100 ℃ です。とけている間や沸騰している間は、温度が一定になります。',
        figure: scene(heatGraphItems().concat([
          { type: 'text', x: 105, y: 150, text: '融点', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 245, y: 42, text: '沸点', size: 13, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'state-change-mp2-c2',
        text: '融点より低い温度では固体、融点と沸点の間では液体、沸点より高い温度では気体です。酸素の沸点は −183 ℃ なので、0 ℃ では気体です。表から状態を読み取ろう。',
        figure: mpPointTable(),
      },
      {
        id: 'state-change-mp2-c3',
        text: 'エタノールは燃えやすいので、直接火で加熱せず、湯で温めます。急な沸騰を防ぐため**沸騰石**を入れます。沸騰では、液体の表面だけでなく内部からも気体に変わります。表面から変わることを**蒸発**といいます。',
        // 写真: 湯の入ったビーカー（x 80〜235、水面 y 112）に、エタノールと沸騰石 (160, 205) を入れた試験管 (145〜175, 5〜210) を立てる。泡が出ている。火は写っていない。
        // 左右に白い余白（x 0〜78・238〜320）
        figure: scene([
          photo('state-change-mp2-c3'),
          tag(68, 24, '直接火で加熱しない', { bold: true }),
          tag(46, 44, '湯で温める', { size: 13 }),
          pointer(52, 156, 104, 164), tag(36, 160, '湯'),
          pointer(246, 126, 168, 150), tag(280, 130, 'エタノール', { size: 13 }),
          pointer(256, 196, 166, 204), tag(282, 200, '沸騰石', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'state-change-mp2-w1', concept: 'sc-point',
      prompt: '予想しよう。氷を加熱し続けると、氷がとけている間の温度はどうなると思う？',
      options: ['0 ℃ のまま変わらない', '少しずつ上がり続ける', '少しずつ下がる'],
      answer: 'a',
      explanation: '氷がとけている間は、加えた熱がとけるために使われるので、温度は 0 ℃ のまま変わりません。グラフと表の読み方を、このステージで練習しよう。',
      hint: '氷水の温度を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'state-change-mp2-p1', concept: 'sc-point',
        prompt: '図は、氷を加熱したときの温度の変化です。氷がとけて水になっている間を表すのはどこ？ ア〜ウから選ぼう。',
        figure: MP_HEAT_Q,
        answer: 'r1',
        explanation: '氷がとけている間は、0 ℃ で温度が一定になります（ア）。この温度が融点です。ウは水が沸騰している間で、100 ℃ の沸点です。',
        hint: '0 ℃ のところで平らになっている部分だよ。',
      }),
      fill({
        id: 'state-change-mp2-t1', concept: 'sc-point', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '固体がとけて液体になるときの温度を[b1]、液体が沸騰するときの温度を[b2]という。',
        blanks: [
          word('b1', ['融点', '沸点', '体温'], '融点'),
          word('b2', ['融点', '沸点', '体温'], '沸点'),
        ],
        explanation: 'とける温度が**融点**、沸騰する温度が**沸点**です。純粋な物質では、物質ごとに決まっています。',
        hint: '「融」はとける、「沸」はわくという意味だよ。',
      }),
      fill({
        id: 'state-change-mp2-p2', concept: 'sc-point',
        prompt: '空らんに入る数を入れよう。',
        text: '水の融点は[b1]、沸点は[b2]である。',
        blanks: [number('b1', 0, 0, '℃'), number('b2', 100, 0, '℃')],
        explanation: '水は 0 ℃ でとけ（こおり）、100 ℃ で沸騰します。',
        hint: '氷がとける温度と、水がわく温度だよ。',
      }),
      choice({
        id: 'state-change-mp2-p3', concept: 'sc-point',
        prompt: '氷を加熱したとき、0 ℃ で温度が一定になっている間、ビーカーの中はどんな状態？',
        options: ['氷と水が混じっている', '氷だけ', '水と水蒸気が混じっている'],
        answer: 'a',
        explanation: '0 ℃ で温度が一定の間は、氷がとけている途中なので、氷と水が混じっています。氷がすべてとけると、また温度が上がりはじめます。',
        hint: 'とけている途中のようすを考えよう。',
      }),
      fill({
        id: 'state-change-mp2-p4', concept: 'sc-point',
        prompt: '表の融点・沸点を見て、空らんに入る言葉を選ぼう。',
        figure: mpPointTable(),
        text: '鉄を 1000 ℃ にすると[b1]、水を 200 ℃ にすると[b2]、酸素を 0 ℃ にすると[b3]である。',
        blanks: [
          word('b1', ['固体', '液体', '気体'], '固体'),
          word('b2', ['固体', '液体', '気体'], '気体'),
          word('b3', ['固体', '液体', '気体'], '気体'),
        ],
        explanation: '鉄の 1000 ℃ は融点 1535 ℃ より低いので固体です。水の 200 ℃ は沸点 100 ℃ より高いので気体、酸素の 0 ℃ も沸点 −183 ℃ より高いので気体です。',
        hint: 'その温度が、融点より低いか、沸点より高いかを比べよう。',
      }),
      choice({
        id: 'state-change-mp2-p5', concept: 'sc-point',
        prompt: '表の物質のうち、20 ℃ で液体のものをすべて選んだものはどれ？',
        figure: mpPointTable(),
        options: ['水とエタノール', '水だけ', 'エタノールと酸素'],
        answer: 'a',
        explanation: '20 ℃ が融点と沸点の間にある物質は液体です。水（0〜100 ℃）とエタノール（−115〜78 ℃）があてはまります。酸素は 20 ℃ では気体、鉄・アルミニウム・食塩は固体です。',
        hint: '融点 ＜ 20 ℃ ＜ 沸点 になる物質をさがそう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'state-change-mp2-r1', concept: 'sc-point',
        prompt: '図は、氷を加熱したときの温度の変化です。水が沸騰している間を表すのはどこ？ ア〜ウから選ぼう。',
        figure: MP_HEAT_Q,
        answer: 'r3',
        explanation: '水が沸騰している間は、100 ℃ で温度が一定になります（ウ）。この温度が沸点です。',
        hint: '100 ℃ のところで平らになっている部分だよ。',
      }),
      choice({
        id: 'state-change-mp2-r2', concept: 'sc-point',
        prompt: 'エタノールを加熱して、1 分ごとの温度を表にしました。表から分かる、沸騰しているときの温度のようすはどれ？',
        figure: scene(mpTimeTableItems('エタノールを加熱したときの温度', MP_ETHANOL, 70)),
        options: ['78 ℃ で一定になる', '上がり続ける', '下がっていく'],
        answer: 'a',
        explanation: '3 分からあとは、ずっと 78 ℃ です。エタノールは純粋な物質なので、沸騰している間は温度が沸点の 78 ℃ で一定になります。',
        hint: '3 分からあとの温度を見よう。',
      }),
      fill({
        id: 'state-change-mp2-r3', concept: 'sc-point',
        prompt: '表を見て、空らんに入る数を入れよう。',
        figure: scene(mpTimeTableItems('エタノールを加熱したときの温度', MP_ETHANOL, 70)),
        text: 'エタノールの温度が上がらなくなった（沸騰しはじめた）のは、加熱してから[b1]後で、そのときの温度は[b2]である。',
        blanks: [number('b1', 3, 0, '分'), number('b2', 78, 0, '℃')],
        explanation: '3 分で 78 ℃ になり、それからは 78 ℃ のままです。ここから沸騰が続いています。',
        hint: '温度が同じ数になりはじめる時間をさがそう。',
      }),
      choice({
        id: 'state-change-mp2-r4', concept: 'sc-point',
        prompt: 'エタノールを加熱するとき、直接火で加熱しないのはなぜ？',
        options: ['エタノールは燃えやすい（火がつきやすい）から', 'エタノールは温まりにくいから', 'エタノールはすぐにこおるから'],
        answer: 'a',
        explanation: 'エタノールは燃えやすく、気体になったものに火がつくと危険です。湯を入れたビーカーで温める（湯せん）ようにします。',
        hint: 'アルコールランプの燃料にも使われる物質だよ。',
      }),
    ],
  };

  // ---- ステージ state-change-mp3: プリント 3（混合物の沸点） ----
  const scMp3 = {
    id: 'state-change-mp3', areaId: 'state-change-miniprint', title: 'プリント 3: 混合物の沸点', minutes: 5, concepts: ['sc-mixture', 'sc-point'],
    lessons: [
      {
        id: 'state-change-mp3-c1',
        anim: 'st-mixture-curve',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '純粋な物質は沸点が決まっていて、沸騰している間は温度が一定です。水とエタノールの**混合物**は決まった沸点を示さず、78 ℃ ごろから沸騰しはじめ、温度は少しずつ上がり続けます。',
        figure: scene(mpGraphItems([[MP_ETHANOL, 'blue', 'エタノール', 136], [MP_MIX, 'orange', '混合物', 102]]).concat([
          { type: 'text', x: 160, y: 22, text: 'たて: 温度　横: 加熱した時間（0〜8 分）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 44, text: '純粋な物質: 温度が一定', size: 13, anchor: 'middle', color: 'blue' },
          { type: 'text', x: 160, y: 64, text: '混合物: 少しずつ上がる', size: 13, anchor: 'middle', color: 'orange' },
        ])),
      },
      {
        id: 'state-change-mp3-c2',
        text: '表は、水とエタノールの混合物を加熱したときの温度です。3 分で 78 ℃ になってから、上がり方がゆるやかになります。沸騰が続いても温度は一定にならず、8 分で 84 ℃ まで上がっています。',
        figure: scene(mpTimeTableItems('水とエタノールの混合物を加熱したときの温度', MP_MIX, 90)),
      },
    ],
    warmup: choice({
      id: 'state-change-mp3-w1', concept: 'sc-mixture',
      prompt: '予想しよう。水とエタノールの混合物を加熱しました。沸騰がはじまったあと、温度はどうなると思う？',
      options: ['少しずつ上がり続ける', '一定になる', '下がっていく'],
      answer: 'a',
      explanation: '混合物は決まった沸点を示さないので、沸騰がはじまっても温度は少しずつ上がり続けます。表とグラフで確かめよう。',
      hint: '純粋な物質と混合物のちがいを考えよう。',
    }),
    problems: [
      fill({
        id: 'state-change-mp3-p1', concept: 'sc-point',
        prompt: '空らんに入る数を入れよう。',
        text: '水の沸点は[b1]、エタノールの沸点は[b2]である。',
        blanks: [number('b1', 100, 0, '℃'), number('b2', 78, 0, '℃')],
        explanation: '水の沸点は 100 ℃、エタノールの沸点は 78 ℃ です。エタノールのほうが低い温度で沸騰します。',
        hint: 'エタノールの沸点は、水より低かったね。',
      }),
      fill({
        id: 'state-change-mp3-t1', concept: 'sc-mixture', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水のように 1 種類の物質でできたものを[b1]、水とエタノールのように、いくつかの物質が混じり合ったものを[b2]という。',
        blanks: [
          word('b1', ['純粋な物質', '混合物'], '純粋な物質'),
          word('b2', ['純粋な物質', '混合物'], '混合物'),
        ],
        explanation: '1 種類の物質でできたものが**純粋な物質**、いくつかの物質が混じり合ったものが**混合物**です。',
        hint: '「混じり合った物」だよ。',
      }),
      figureChoice({
        id: 'state-change-mp3-p2', concept: 'sc-mixture',
        prompt: '図は、3 つの液体を加熱したときの温度の変化です。水とエタノールの混合物のグラフはどれ？ ア〜ウから選ぼう。',
        figure: threeGraphsScene(['ethanol', 'mix', 'water']),
        answer: 'r2',
        explanation: '混合物は決まった沸点がなく、沸騰しはじめても温度が少しずつ上がり続けます（イ）。アはエタノール、ウは水で、どちらも純粋な物質なので途中から平らになります。',
        hint: '途中から平らにならないグラフをさがそう。',
      }),
      fill({
        id: 'state-change-mp3-p3', concept: 'sc-mixture',
        prompt: '表を見て、空らんに入る数を入れよう。',
        figure: scene(mpTimeTableItems('水とエタノールの混合物を加熱したときの温度', MP_MIX, 90)),
        text: '温度の上がり方がゆるやかになり沸騰しはじめたのは、加熱してから約[b1]後である。8 分後の温度は[b2]である。',
        blanks: [number('b1', 3, 0, '分'), number('b2', 84, 0, '℃')],
        explanation: '0〜3 分は 17〜18 ℃ ずつ上がっていますが、3 分（78 ℃）からは 1〜2 ℃ ずつしか上がらなくなります。ここで沸騰がはじまっています。8 分後は 84 ℃ です。',
        hint: '1 分ごとの上がり方が急に小さくなる時間をさがそう。',
      }),
      choice({
        id: 'state-change-mp3-p4', concept: 'sc-mixture',
        prompt: '表から、水とエタノールの混合物は、沸騰したあと温度がどうなるといえる？',
        figure: scene(mpTimeTableItems('水とエタノールの混合物を加熱したときの温度', MP_MIX, 90)),
        options: ['少しずつ上がり続ける', '78 ℃ で一定になる', '急に 100 ℃ になる'],
        answer: 'a',
        explanation: '3 分からあとも 79、80、82、83、84 ℃ と少しずつ上がり続けています。混合物は、沸騰しても温度が一定になりません。',
        hint: '3 分からあとの温度を順に見よう。',
      }),
      choice({
        id: 'state-change-mp3-p5', concept: 'sc-mixture',
        prompt: '純粋な物質と混合物の沸点のちがいとして正しいのはどれ？',
        options: ['純粋な物質は沸点が決まっているが、混合物は決まった沸点を示さない', '混合物のほうが、必ず沸点が高い', 'どちらも沸騰している間は温度が一定になる'],
        answer: 'a',
        explanation: '純粋な物質は沸点が決まっていて、沸騰中は温度が一定です。混合物は決まった沸点がなく、沸騰しても温度が少しずつ変わります。',
        hint: 'グラフが平らになるかどうかのちがいだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'state-change-mp3-r1', concept: 'sc-mixture',
        prompt: '図は、3 つの液体を加熱したときの温度の変化です。エタノール（純粋な物質）のグラフはどれ？ ア〜ウから選ぼう。',
        figure: threeGraphsScene(['ethanol', 'mix', 'water']),
        answer: 'r1',
        explanation: 'エタノールは純粋な物質なので、沸点の 78 ℃ で温度が一定になります。水（ウ）より低い温度で平らになっているアがエタノールです。',
        hint: '低い温度で平らになっているグラフだよ。',
      }),
      choice({
        id: 'state-change-mp3-r2', concept: 'sc-mixture',
        prompt: '加熱したときの温度の変化を調べると、ある液体が純粋な物質か混合物かを見分けられます。混合物だと分かるのはどんなとき？',
        options: ['沸騰しても温度が上がり続けるとき', '沸騰すると温度が一定になるとき', '加熱してもすぐに沸騰しないとき'],
        answer: 'a',
        explanation: '沸騰しても温度が一定にならず上がり続けるなら、決まった沸点がないので混合物と考えられます。',
        hint: '混合物は決まった沸点がなかったね。',
      }),
    ],
  };

  // ---- ステージ state-change-mp4: プリント 4（赤ワインの蒸留、石油の分留） ----
  const scMp4 = {
    id: 'state-change-mp4', areaId: 'state-change-miniprint', title: 'プリント 4: 蒸留と石油の分留', minutes: 5, concepts: ['sc-distill'],
    lessons: [
      {
        id: 'state-change-mp4-c1',
        text: '液体を沸騰させ、出てくる気体を冷やして再び液体として取り出すことを**蒸留**といいます。赤ワイン（水とエタノールなど）を蒸留すると、沸点の低いエタノールを多くふくむ液が先に出てきます。',
        // 写真: 赤ワイン (82, 140) を入れたフラスコをガスバーナーで熱し、ガラス管 (90, 93)〜(245, 135) の先の試験管を氷水のビーカー (222〜290, 155〜225) で冷やす。
        // 試験管の底 (258, 205) にほぼ無色の液がたまる。温度計の球は栓のすぐ下。右上は白い余白
        figure: scene([
          photo('state-change-mp4-c1'),
          tag(240, 30, '赤ワインの蒸留', { bold: true }),
          pointer(286, 116, 262, 198), tag(268, 108, '冷やして液体に', { size: 13 }),
          pointer(128, 140, 100, 140), tag(150, 144, '赤ワイン', { size: 13 }),
          tag(150, 164, '（＋沸騰石）', { size: 13 }),
        ]),
      },
      {
        id: 'state-change-mp4-c2',
        anim: 'st-tube-out-first',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '蒸留では、急な沸騰を防ぐため**沸騰石**を入れます。火を消す前に、ガラス管の先を集めた液から出しておきます。液が逆流するのを防ぐためです。集めた液に火を近づけて燃えれば、エタノールが多いと分かります。',
        figure: scene([
          { type: 'tube', x: 120, y: 200, height: 110, level: 0.3 },
          { type: 'line', points: [[60, 40], [120, 60], [120, 120]], width: 3 },
          { type: 'arrow', x1: 150, y1: 120, x2: 150, y2: 70, color: 'blue' },
          { type: 'text', x: 160, y: 92, text: 'ガラス管を液から出す', size: 13 },
          { type: 'text', x: 160, y: 120, text: '→ それから火を消す', size: 13 },
          { type: 'text', x: 160, y: 228, text: '逆流を防ぐため', size: 14, anchor: 'middle', bold: true },
        ]),
      },
      {
        id: 'state-change-mp4-c3',
        anim: 'st-fractional-tower',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '石油（原油）は多くの物質の混合物です。加熱して沸点のちがいで分けることを**分留**といい、蒸留を利用しています。沸点の低い石油ガスやガソリンほど塔の上のほうで取り出され、重油は下に残ります。',
        figure: scene([
          { type: 'rect', x: 110, y: 30, width: 70, height: 190, fill: 'glass' },
          ...[['石油ガス', 50], ['ガソリン', 86], ['灯油', 122], ['軽油', 158], ['重油', 200]].flatMap(([t, y]) => [
            { type: 'line', points: [[180, y], [220, y]], width: 3 },
            { type: 'text', x: 226, y: y + 5, text: t, size: 13 },
          ]),
          { type: 'text', x: 100, y: 54, text: '沸点が低い', size: 12, anchor: 'end' },
          { type: 'text', x: 100, y: 204, text: '沸点が高い', size: 12, anchor: 'end' },
          { type: 'line', points: [[70, 190], [70, 66]], color: 'gray', width: 2, arrow: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'state-change-mp4-w1', concept: 'sc-distill',
      prompt: '予想しよう。赤ワインを加熱して、出てきた気体を冷やして液を集めました。はじめに集めた液はどんな液だと思う？',
      options: ['エタノールを多くふくむ液', '水だけの液', '赤い色の濃い液'],
      answer: 'a',
      explanation: 'エタノールは水より沸点が低いので、はじめはエタノールを多くふくむ気体が出てきます。蒸留のしくみを、このステージで学ぼう。',
      hint: '水とエタノールの沸点を比べよう。',
    }),
    problems: [
      figureChoice({
        id: 'state-change-mp4-p1', concept: 'sc-distill',
        prompt: '赤ワインを加熱して、出てきた液を試験管に順に 3 本集めました。マッチの火を近づけると、よく燃えるのはどれ？ ア〜ウから選ぼう。',
        figure: MP_TUBES_Q,
        answer: 'r1',
        explanation: 'はじめに集めた 1 本目には、沸点の低いエタノールが多くふくまれるので、火を近づけるとよく燃えます。あとのほうになるほど水が多くなり、燃えにくくなります。',
        hint: '沸点の低いエタノールが先に出てくるよ。',
      }),
      fill({
        id: 'state-change-mp4-t1', concept: 'sc-distill', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '液体を加熱して沸騰させ、出てくる気体を冷やして再び液体として取り出すことを[b1]という。',
        blanks: [word('b1', ['蒸留', '再結晶', 'ろ過'], '蒸留')],
        explanation: '沸騰させた気体を冷やして再び液体にして集めることを**蒸留**といいます。沸点のちがいを利用して混合物を分けられます。',
        hint: '「蒸」は湯気、「留」はとどめる（集める）という意味だよ。',
      }),
      choice({
        id: 'state-change-mp4-p2', concept: 'sc-distill',
        prompt: '赤ワインに、水のほかにおもにふくまれている物質はどれ？',
        options: ['エタノール', '食塩', '酸素'],
        answer: 'a',
        explanation: '赤ワインは、おもに水とエタノールの混合物です（色やかおりの物質も少しふくまれます）。',
        hint: 'お酒にふくまれるアルコールの名前だよ。',
      }),
      choice({
        id: 'state-change-mp4-p3', concept: 'sc-distill',
        prompt: '蒸留の実験を終えるとき、火を消す前にしなければならないことはどれ？',
        options: ['ガラス管の先を、試験管の液から出しておく', '沸騰石を取り出す', '温度計をぬく'],
        answer: 'a',
        explanation: 'ガラス管の先が液に入ったまま火を消すと、フラスコの中の気体が冷えて縮み、集めた液がフラスコに逆流します。先にガラス管を液から出します。',
        hint: '火を消すと、フラスコの中の気体が縮むよ。',
      }),
      choice({
        id: 'state-change-mp4-p4', concept: 'sc-distill',
        prompt: '赤ワインを蒸留すると、はじめに集めた液にエタノールが多くふくまれるのはなぜ？',
        options: ['エタノールの沸点が水より低く、先に多く気体になるから', 'エタノールのほうが重いから', 'エタノールが水にとけないから'],
        answer: 'a',
        explanation: 'エタノールの沸点（78 ℃）は水（100 ℃）より低いので、温度が低いうちはエタノールが多く気体になって出てきます。',
        hint: '沸点の低いほうから先に気体になるよ。',
      }),
      choice({
        id: 'state-change-mp4-p5', concept: 'sc-distill',
        prompt: '石油（原油）を分ける塔では、沸点の低いものほど上のほうで取り出されます。ガソリンと軽油では、上のほうで取り出されるのはどちら？（沸点はガソリンのほうが低い）',
        options: ['ガソリン', '軽油', 'どちらも同じ高さ'],
        answer: 'a',
        explanation: '沸点の低いものほど、気体のまま塔の上のほうまで上がってから冷えて液体になります。ガソリンは軽油より沸点が低いので、上のほうで取り出されます。',
        hint: '沸点が低いほど、上まで気体のまま上がるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'state-change-mp4-r1', concept: 'sc-distill',
        prompt: '集めた液にエタノールが多くふくまれていることを、かんたんに確かめる方法はどれ？',
        options: ['液をひたしたろ紙にマッチの火を近づけ、燃えるか調べる', '液を冷やして、こおるか調べる', '液に食塩を入れて、とけるか調べる'],
        answer: 'a',
        explanation: 'エタノールは燃えやすいので、エタノールが多い液をしみこませたろ紙に火を近づけると燃えます。においをかぐ方法もあります。',
        hint: 'エタノールは燃えやすい物質だったね。',
      }),
      choice({
        id: 'state-change-mp4-r2', concept: 'sc-distill',
        prompt: '蒸留の実験で、フラスコに沸騰石を入れるのはなぜ？',
        options: ['急に沸騰する（突沸）のを防ぐため', '液を早く冷やすため', '液の色をうすくするため'],
        answer: 'a',
        explanation: '沸騰石を入れないと、液が急に激しく沸騰して、フラスコの外に飛び出すことがあります。沸騰石はそれを防ぎます。',
        hint: '液が急に激しくわき立つのを防ぐよ。',
      }),
      choice({
        id: 'state-change-mp4-r3', concept: 'sc-distill',
        prompt: '石油を沸点のちがいで分ける「分留」は、理科の何という方法を利用したもの？',
        options: ['蒸留', '再結晶', 'ろ過'],
        answer: 'a',
        explanation: '分留は、混合物を加熱して沸点のちがう物質に分けて取り出す方法で、蒸留を利用しています。',
        hint: '沸騰させて冷やし、液体にして集める方法だよ。',
      }),
      choice({
        id: 'state-change-mp4-r4', concept: 'sc-distill',
        prompt: '石油ガスと重油では、沸点が低いのはどちら？',
        options: ['石油ガス', '重油', 'どちらも同じ'],
        answer: 'a',
        explanation: '石油ガスは塔のいちばん上で取り出されるほど沸点が低く、ふつうの温度で気体です。重油は沸点が高く、塔の下に残ります。',
        hint: '塔のいちばん上で取り出されるのはどちらかな。',
      }),
    ],
  };

  // あふれた問題を、もとからある概念の確認問題（checkPool）に足す
  function addCheck(id, problems) { concepts.find(c => c.id === id).checkPool.push(...problems); }
  addCheck('sc-point', [
    fill({
      id: 'state-change-mp2-k1', concept: 'sc-point',
      prompt: '空らんに入る言葉を選ぼう。',
      text: '水が沸騰するときは、[b1]だけでなく[b2]からも水が水蒸気に変わる。水が[b1]から水蒸気に変わることを蒸発という。',
      blanks: [
        word('b1', ['表面', '内部'], '表面'),
        word('b2', ['表面', '内部'], '内部'),
      ],
      explanation: '蒸発は液体の表面から気体に変わることで、沸点より低い温度でも起こります。沸騰では、液体の内部からも気体に変わり、あわが出てきます。',
      hint: '沸騰すると、液体の中からあわが出てくるね。',
    }),
  ]);
  addCheck('sc-distill', [
    choice({
      id: 'state-change-mp2-k2', concept: 'sc-distill',
      prompt: 'エタノールを加熱するとき、試験管に沸騰石を入れるのはなぜ？',
      options: ['急に沸騰するのを防ぐため', 'エタノールを燃やすため', '温度を下げるため'],
      answer: 'a',
      explanation: '沸騰石を入れると、液体が急に激しく沸騰する（突沸）のを防げます。加熱する実験では、沸騰石を入れてから加熱します。',
      hint: '液が急に飛び出さないようにするためだよ。',
    }),
  ]);

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'state-change',
    title: '状態変化',
    mascot: 'B',   // 担当の先生（しずく博士。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'state', title: '状態変化と粒子', order: 1, stages: [state1, state2] },
      { id: 'sc-distill', title: '混合物を分ける', order: 2, stages: [state3, state4] },
      { id: 'state-change-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [scMp1, scMp2, scMp3, scMp4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
