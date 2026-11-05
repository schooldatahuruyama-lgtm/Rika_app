// 「身のまわりの物質」教材データ（中学1年 理科・化学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（物質の性質: 金属と有機物・密度 / 気体の性質: 集め方・いろいろな気体）と、概念 6 つ。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// drag の位置は部品の基準点（rect は左上、tube は底の中央）で判定する（js/ui-problems.js の anchorOf）。
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

  // 写真（assets/images/substance/<name>.jpg。640×480 を場面いっぱいに描く。座標は画像の位置 × 0.5）
  function photo(name) { return { type: 'image', src: 'assets/images/substance/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 気体の集め方 3 種を横に並べた図（ア 水上置換・イ 上方置換・ウ 下方置換）。選ぶ場所は下の段
  function collectScene() {
    return scene([
      // ア: 水そうの中で、水を満たした試験管を逆さに立てる
      { type: 'rect', x: 15, y: 110, width: 80, height: 80, fill: 'none' },
      { type: 'rect', x: 17, y: 125, width: 76, height: 63, fill: 'water', stroke: 'none' },
      { type: 'tube', x: 55, y: 60, height: 90, tilt: 180, level: 1 },
      { type: 'line', points: [[25, 95], [25, 180], [55, 180], [55, 158]], width: 3 },
      // イ: 試験管の口を下に向け、ガラス管を奥まで入れる
      { type: 'tube', x: 160, y: 30, height: 90, tilt: 180, level: 0 },
      { type: 'line', points: [[160, 190], [160, 45]], width: 3 },
      // ウ: 試験管の口を上に向け、ガラス管を奥まで入れる
      { type: 'tube', x: 265, y: 190, height: 90, level: 0 },
      { type: 'line', points: [[265, 30], [265, 180]], width: 3 },
      { type: 'region', id: 'r1', x: 55, y: 215, r: 22, label: 'ア' },
      { type: 'region', id: 'r2', x: 160, y: 215, r: 22, label: 'イ' },
      { type: 'region', id: 'r3', x: 265, y: 215, r: 22, label: 'ウ' },
    ]);
  }

  // 気体の入った試験管 3 本（names は左から ア・イ・ウ の気体の名前）。上に「火を近づける」などの文
  function threeGasTubes(caption, names) {
    const items = [{ type: 'text', x: 160, y: 30, text: caption, size: 14, anchor: 'middle' }];
    [60, 160, 260].forEach((x, i) => {
      items.push({ type: 'tube', x, y: 180, height: 100, level: 0 });
      items.push({ type: 'text', x, y: 210, text: names[i], size: 14, anchor: 'middle' });
      items.push({ type: 'region', id: 'r' + (i + 1), x, y: 130, r: 24, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // メスシリンダー（左の x を指定）。液面は中央がへこみ、いちばん低いところが y=120
  function cylinderItems(x) {
    const items = [
      { type: 'polygon', points: [[x + 2, 112], [x + 10, 118], [x + 22, 120], [x + 34, 118], [x + 42, 112], [x + 42, 218], [x + 2, 218]], fill: 'water', stroke: 'none' },
      { type: 'line', points: [[x + 2, 112], [x + 10, 118], [x + 22, 120], [x + 34, 118], [x + 42, 112]], color: 'blue', width: 2 },
      { type: 'rect', x, y: 30, width: 44, height: 190, fill: 'none' },
    ];
    [60, 80, 100, 120, 140, 160, 180, 200].forEach(y => {
      items.push({ type: 'line', points: [[x + 44, y], [x + (y % 40 === 0 ? 58 : 52), y]], width: 2 });
    });
    return items;
  }

  // ================================================================
  // 領域 1: 物質の性質
  // ================================================================

  // ---- ステージ sub-1: 金属と非金属・有機物と無機物 ----
  const sub1 = {
    id: 'sub-1', areaId: 'props', title: '金属と有機物', minutes: 5, concepts: ['su-metal', 'su-organic'],
    lessons: [
      {
        id: 'sub-1-c1',
        text: 'コップのように、形や使い方で見たときのものを**物体**といいます。ガラス・紙・プラスチックのように、ものをつくっている材料で見たときは**物質**といいます。同じコップでも、物質はいろいろです。',
        // 写真: 左からガラス・紙・プラスチックのコップ（形は同じ、材料（物質）がちがう）
        figure: scene([
          photo('sub-1-c1'),
          tag(58, 172, 'ガラス'),
          tag(160, 172, '紙'),
          tag(261, 172, 'プラスチック'),
          tag(160, 204, '物体として見ると、どれも「コップ」', { size: 13 }),
          tag(160, 228, '材料（物質）はちがう', { size: 13 }),
        ]),
      },
      {
        id: 'sub-1-c2',
        text: '鉄・銅・アルミニウムなどの**金属**には共通の性質があります。みがくと光る（**金属光沢**）、電気を通す、熱を伝えやすい、たたくとうすく広がり引っぱるとのびる、の 4 つです。磁石につくのは鉄など一部の金属だけです。',
        // 写真: みがいた鉄・銅・アルミニウムの板（どれも光を反射して光る）
        figure: scene([
          photo('sub-1-c2'),
          tag(56, 164, '鉄'),
          tag(159, 164, '銅'),
          tag(262, 164, 'アルミニウム'),
          tag(160, 200, 'みがくと光る（金属光沢）'),
          tag(160, 226, '電気を通す・熱を伝えやすい', { size: 13 }),
        ]),
      },
      {
        id: 'sub-1-c3',
        text: '砂糖・ろう・プラスチックのように**炭素**をふくむ物質を**有機物**といいます。有機物を燃やすと**二酸化炭素**ができ、**石灰水**が白くにごります。有機物でない物質を**無機物**といいます（食塩・鉄・ガラス。炭素や二酸化炭素も無機物に分けます）。',
        // 写真: 左は集気びんの中で燃えるろうそく、右は石灰水を入れてふった集気びん（白くにごった）
        figure: scene([
          photo('sub-1-c3'),
          { type: 'arrow', x1: 116, y1: 90, x2: 206, y2: 90, color: 'blue', width: 3 },
          tag(64, 190, 'ろうを燃やす'),
          tag(64, 214, 'ろう（有機物）', { size: 13 }),
          tag(255, 190, '石灰水を入れてふる', { size: 13 }),
          tag(255, 214, '→ 白くにごる', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'sub-1-w1', concept: 'su-metal',
      prompt: '予想しよう。鉄のくぎ、10 円玉（銅）、アルミニウムはく。この 3 つの金属に共通する性質はどれだと思う？',
      options: ['どれも磁石につく', 'どれも電気を通す', 'どれも水に浮く'],
      answer: 'b',
      explanation: '金属はどれも電気を通します。磁石につくのは鉄など一部の金属だけです。このステージで金属の性質を確かめよう。',
      hint: '豆電球の回路にはさんでみたときを想像しよう。',
    }),
    problems: [
      choice({
        id: 'sub-1-p1', concept: 'su-metal',
        prompt: '次のうち、金属に共通する性質ではないものはどれ？',
        options: ['みがくと光る', '電気を通す', '磁石につく', '熱を伝えやすい'],
        answer: 'c',
        explanation: '磁石につくのは鉄など一部の金属だけで、銅やアルミニウムはつきません。だから「磁石につく」は金属に共通の性質ではありません。金属かどうかを調べるときは、電気を通すかどうかを見よう。',
        hint: '10 円玉やアルミニウムのかんは、磁石につくかな。',
      }),
      fill({
        id: 'sub-1-t1', concept: 'su-organic', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '炭素をふくみ、燃やすと二酸化炭素ができる物質を[b1]という。それ以外の物質を[b2]という。',
        blanks: [
          word('b1', ['有機物', '無機物', '金属'], '有機物'),
          word('b2', ['有機物', '無機物', '金属'], '無機物'),
        ],
        explanation: '炭素をふくみ、燃やすと二酸化炭素ができる物質が**有機物**です。ただし、炭素そのものや二酸化炭素は、炭素をふくんでいても**無機物**に分けます。有機物でない物質が無機物です。',
        hint: '砂糖やろうのように、燃やすとこげたり二酸化炭素ができたりする物質はどちらかな。',
      }),
      fill({
        id: 'sub-1-p2', concept: 'su-metal',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '金属はハンマーでたたくと[b1]、引っぱると[b2]。',
        blanks: [
          word('b1', ['うすく広がり', 'こなごなにくだけ', '小さくちぢみ'], 'うすく広がり'),
          word('b2', ['のびる', 'ちぎれる', 'かたくなる'], 'のびる'),
        ],
        explanation: '金属は、たたくとうすく広がり、引っぱると細くのびます。アルミニウムはくや銅の導線は、この性質を使って作られています。',
        hint: 'うすいアルミニウムはくや、細い銅線の作り方を考えよう。',
      }),
      figureChoice({
        id: 'sub-1-p3', concept: 'su-organic',
        prompt: 'ア 砂糖、イ かたくり粉（デンプン）、ウ 食塩を、それぞれ燃焼さじにのせてガスバーナーで加熱しました。黒くこげず、燃えもしないのはどれ？ 図のア〜ウから選ぼう。',
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '3 つの白い粉を加熱する', size: 14, anchor: 'middle' },
          { type: 'line', points: [[20, 140], [52, 140]], width: 3 },
          { type: 'ellipse', x: 60, y: 140, rx: 14, ry: 6, fill: 'white' },
          { type: 'flame', x: 60, y: 196 },
          { type: 'line', points: [[120, 140], [152, 140]], width: 3 },
          { type: 'ellipse', x: 160, y: 140, rx: 14, ry: 6, fill: 'white' },
          { type: 'flame', x: 160, y: 196 },
          { type: 'line', points: [[220, 140], [252, 140]], width: 3 },
          { type: 'ellipse', x: 260, y: 140, rx: 14, ry: 6, fill: 'white' },
          { type: 'flame', x: 260, y: 196 },
          { type: 'text', x: 60, y: 224, text: '砂糖', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: 'かたくり粉', size: 13, anchor: 'middle' },
          { type: 'text', x: 260, y: 224, text: '食塩', size: 13, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 60, y: 90, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 90, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 260, y: 90, r: 24, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '砂糖とデンプンは炭素をふくむ有機物なので、加熱すると黒くこげて炭が残り、燃えると二酸化炭素ができます。食塩は無機物なので、こげたり燃えたりしません。見た目が同じ白い粉でも、加熱すると見分けられます。',
        hint: '炭素をふくまない物質はどれか考えよう。',
      }),
      choice({
        id: 'sub-1-p4', concept: 'su-organic',
        prompt: 'ろうそくを燃やしたあとの集気びんに石灰水を入れてふると、石灰水が白くにごりました。ろうそくが燃えて何ができたといえる？',
        options: ['酸素', '二酸化炭素', '水素', '窒素'],
        answer: 'b',
        explanation: '石灰水を白くにごらせるのは二酸化炭素です。ろうは炭素をふくむ有機物なので、燃えると二酸化炭素ができます。',
        hint: '石灰水が白くにごるのは、どの気体があるときだったかな。',
      }),
      figureChoice({
        id: 'sub-1-p5', concept: 'su-metal',
        prompt: '電池と豆電球の回路の、あいているところに、右のア〜ウのどれかをはさみます。ア アルミニウムはく、イ わりばし、ウ ガラス棒。豆電球がつくのはどれ？',
        figure: scene([
          { type: 'line', points: [[50, 100], [50, 40], [110, 40]] },
          { type: 'line', points: [[150, 40], [190, 40], [190, 95]] },
          { type: 'line', points: [[50, 140], [50, 200], [190, 200], [190, 150]] },
          { type: 'symbol', x: 50, y: 120, kind: 'battery', rotate: 90 },
          { type: 'symbol', x: 130, y: 40, kind: 'bulb' },
          { type: 'circle', x: 190, y: 95, r: 4, fill: 'ink', stroke: 'none' },
          { type: 'circle', x: 190, y: 150, r: 4, fill: 'ink', stroke: 'none' },
          { type: 'text', x: 182, y: 128, text: 'ここにはさむ', size: 13, anchor: 'end' },
          { type: 'rect', x: 255, y: 62, width: 30, height: 7, fill: 'gray' },
          { type: 'rect', x: 255, y: 132, width: 30, height: 7, fill: 'brown' },
          { type: 'rect', x: 255, y: 202, width: 30, height: 7, fill: 'glass' },
          { type: 'text', x: 270, y: 90, text: 'アルミはく', size: 12, anchor: 'middle' },
          { type: 'text', x: 270, y: 160, text: 'わりばし', size: 12, anchor: 'middle' },
          { type: 'text', x: 270, y: 232, text: 'ガラス棒', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 270, y: 50, r: 24, label: 'ア' },
          { type: 'region', id: 'r2', x: 270, y: 120, r: 24, label: 'イ' },
          { type: 'region', id: 'r3', x: 270, y: 190, r: 24, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: 'アルミニウムは金属なので電気を通し、豆電球がつきます。わりばし（木）やガラスは金属ではないので、電気を通しません。電気を通すかどうかは、金属を見分ける手がかりになります。',
        hint: '3 つのうち、金属はどれか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'sub-1-r1', concept: 'su-metal',
        prompt: '次のうち、磁石につくものはどれ？',
        options: ['鉄のくぎ', '10 円玉（銅）', 'アルミニウムのかん'],
        answer: 'a',
        explanation: '磁石につくのは鉄です。銅やアルミニウムも金属ですが、磁石にはつきません。磁石につくかどうかでは、金属かどうかは決められません。',
        hint: '空きかんを分別するとき、磁石を使うのはどちらのかんかな。',
      }),
      choice({
        id: 'sub-1-r2', concept: 'su-organic',
        prompt: '次のうち、無機物はどれ？',
        options: ['砂糖', 'ろう', '食塩', 'プラスチック'],
        answer: 'c',
        explanation: '食塩は炭素をふくまない無機物で、加熱しても黒くこげません。砂糖・ろう・プラスチックは炭素をふくむ有機物で、燃やすと二酸化炭素ができます。',
        hint: '燃やしたときに二酸化炭素ができないものをさがそう。',
      }),
      fill({
        id: 'sub-1-r3', concept: 'su-organic',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '有機物は[b1]をふくむので、燃やすと[b2]ができる。',
        blanks: [
          word('b1', ['炭素', '鉄', '食塩'], '炭素'),
          word('b2', ['二酸化炭素', '酸素', '水素'], '二酸化炭素'),
        ],
        explanation: '有機物は炭素をふくむ物質です。燃やすと炭素が酸素と結びついて二酸化炭素ができ、石灰水を白くにごらせます。',
        hint: '燃やしたあとに石灰水を白くにごらせる気体は何だったかな。',
      }),
      choice({
        id: 'sub-1-t2', concept: 'su-metal', term: true,
        prompt: '次の説明に合う言葉はどれ？「金属をみがくと出る、金属に特有のかがやき」',
        options: ['金属光沢', '有機物', '密度'],
        answer: 'a',
        explanation: '金属をみがいたときに出る特有のかがやきを**金属光沢**といいます。電気を通す・熱を伝えやすいなどとならぶ、金属に共通の性質です。',
        hint: '「光沢」はつやのことだよ。',
      }),
      choice({
        id: 'sub-1-t3', concept: 'su-metal', term: true,
        prompt: '「鉄のスプーン」と「プラスチックのスプーン」のように、ものを材料で区別するとき、その材料のことを何という？',
        options: ['物体', '物質', '金属光沢'],
        answer: 'b',
        explanation: 'ものをつくっている材料に注目したときは**物質**といいます。形や使い方に注目したときは物体といいます。鉄は金属、プラスチックは金属でない物質です。',
        hint: '「スプーン」は形や使い方、「鉄」は材料だね。',
      }),
    ],
  };

  // ---- ステージ sub-2: 密度（密度の計算、浮き沈み、メスシリンダー・上皿てんびん） ----
  const sub2 = {
    id: 'sub-2', areaId: 'props', title: '密度', minutes: 5, concepts: ['su-density', 'su-measure'],
    lessons: [
      {
        id: 'sub-2-c1',
        text: '同じ体積でも、物質によって質量はちがいます。物質 1 cm³ あたりの質量を**密度**といい、密度 ＝ 質量 ÷ 体積 で求めます。単位は g/cm³（グラム毎立方センチメートル）です。',
        // 1 cm³ の鉄とアルミニウムの質量
        figure: scene([
          { type: 'text', x: 160, y: 40, text: 'どちらも体積 1 cm³', size: 14, anchor: 'middle' },
          { type: 'rect', x: 55, y: 70, width: 70, height: 70, fill: 'gray' },
          { type: 'rect', x: 195, y: 70, width: 70, height: 70, fill: 'glass' },
          { type: 'text', x: 90, y: 172, text: '鉄', size: 16, anchor: 'middle' },
          { type: 'text', x: 230, y: 172, text: 'アルミニウム', size: 16, anchor: 'middle' },
          { type: 'text', x: 90, y: 200, text: '7.9 g', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 230, y: 200, text: '2.7 g', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 230, text: '密度 ＝ 質量 ÷ 体積', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'sub-2-c2',
        text: '密度は物質ごとに決まっているので、物質を見分ける手がかりになります。水の密度は約 1.0 g/cm³ です。水より密度が大きい物質は水に沈み、小さい物質は水に浮きます。',
        // 写真: 水の入ったビーカー。木片は水面に浮き、鉄のかたまりは底に沈む
        figure: scene([
          photo('sub-2-c2'),
          tag(248, 22, '水の密度', { size: 13 }),
          tag(248, 40, '約1.0 g/cm³', { size: 13 }),
          pointer(212, 74, 140, 74), tag(250, 78, '木（浮く）'),
          tag(250, 98, '水より密度が小さい', { size: 13 }),
          pointer(212, 186, 134, 190), tag(250, 190, '鉄（沈む）'),
          tag(250, 210, '水より密度が大きい', { size: 13 }),
        ]),
      },
      {
        id: 'sub-2-c3',
        text: '液体の体積は**メスシリンダー**で測ります。水平な台に置き、液面のへこんだ平らなところを真横から見て、1 目盛りの 10 分の 1 まで目分量で読みます。1 mL は 1 cm³ です。',
        // 写真: メスシリンダーの液面のクローズアップ（まん中がへこむ）。長い目盛りは y 37・112・188（10 mL ごと）、
        // 1 目盛りは約 7.6（1 mL）。へこんだ平らなところは y 約 122
        figure: scene([
          photo('sub-2-c3'),
          tag(36, 41, '50', { size: 13 }),
          tag(36, 117, '40', { size: 13 }),
          tag(36, 193, '30', { size: 13 }),
          tag(36, 16, '(mL)', { size: 13 }),
          { type: 'arrow', x1: 300, y1: 122, x2: 152, y2: 122, color: 'red', width: 3 },
          tag(248, 84, 'へこんだ平らな', { size: 13 }),
          tag(248, 104, 'ところを真横から読む', { size: 13 }),
          tag(248, 150, '1目盛りの10分の1', { size: 13 }),
          tag(248, 168, 'まで目分量で読む', { size: 13 }),
        ]),
      },
      {
        id: 'sub-2-c4',
        text: '質量は**上皿てんびん**で測ります。水平な台に置き、針が左右に等しくふれるように調節してから使います。はかるものを一方の皿にのせ、もう一方に重い分銅から順にピンセットでのせます。',
        // 写真: 上皿てんびん。左の皿にはかるもの (92, 92)、右の皿に分銅 (232, 92)、中央の針 (161, 47〜95)、
        // 手前に分銅の箱 (37〜147, 167〜230) とピンセット (167〜282, 197〜220)
        figure: scene([
          photo('sub-2-c4'),
          pointer(76, 36, 90, 86), tag(64, 28, 'はかるもの'),
          pointer(240, 36, 232, 84), tag(250, 28, '分銅'),
          pointer(131, 63, 159, 70), tag(120, 66, '針'),
          tag(92, 180, '分銅の箱', { size: 13 }),
          tag(226, 236, 'ピンセット', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'sub-2-w1', concept: 'su-density',
      prompt: '予想しよう。大きな鉄のかたまりと、小さな鉄のくぎを水に入れると、どうなると思う？',
      options: ['大きいかたまりだけが沈む', 'どちらも沈む', 'どちらも浮く'],
      answer: 'b',
      explanation: 'どちらも鉄なので、大きさにかかわらず沈みます。浮くか沈むかを決める「密度」を、このステージで学ぼう。',
      hint: '大きさではなく、何でできているかに注目しよう。',
    }),
    problems: [
      fill({
        id: 'sub-2-p1', concept: 'su-density',
        prompt: '空らんに入る数を入れよう。',
        text: '質量 158 g、体積 20 cm³ の金属の密度は[b1]である。',
        blanks: [number('b1', 7.9, 0.01, 'g/cm³')],
        explanation: '密度 ＝ 質量 ÷ 体積 なので、158 ÷ 20 ＝ 7.9 g/cm³ です。この値は鉄の密度と同じなので、この金属は鉄だと考えられます。',
        hint: '質量を体積でわろう。',
      }),
      fill({
        id: 'sub-2-t1', concept: 'su-density', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質 1 cm³ あたりの質量を[b1]という。',
        blanks: [word('b1', ['密度', '質量', '体積'], '密度')],
        explanation: '1 cm³ あたりの質量を**密度**といいます。密度は物質ごとに決まっているので、物質を見分ける手がかりになります。',
        hint: '単位 g/cm³ で表す量だよ。',
      }),
      drag({
        id: 'sub-2-p2', concept: 'su-density',
        prompt: '密度 0.5 g/cm³ の木片を水に入れて手をはなしました。木片が落ち着く位置に、木片を上下に動かして置こう。水の密度は 1.0 g/cm³ です。',
        // 水面 y=115（beaker 底 220、高さ 150、level 0.7）。木片の高さ 60 → 半分が水につかる位置は上のはし y=85。
        // 全部しずんだ位置（上のはし y=116）は許容 16px の外（31px はなれる）
        figure: scene([
          { type: 'text', x: 10, y: 36, text: '木片（密度 0.5 g/cm³）', size: 13 },
          { type: 'beaker', x: 160, y: 220, width: 220, height: 150, level: 0.7 },
          { type: 'rect', id: 'wood', x: 220, y: 10, width: 40, height: 60, fill: 'brown' },
        ]),
        draggable: { itemId: 'wood', axis: 'y' },
        target: { x: 220, y: 85 },
        samples: { correct: { x: 220, y: 85 }, wrong: { x: 220, y: 116 } },
        explanation: '木片の密度は水より小さいので、木片は水に浮きます。水の底や水の中ほどではなく、水面に浮いて一部が水から出た位置で落ち着きます。水より密度が大きいか小さいかで、浮き沈みを予想しよう。',
        hint: '木片の密度と水の密度を比べよう。',
      }),
      figureChoice({
        id: 'sub-2-p3', concept: 'su-measure',
        prompt: 'メスシリンダーの目盛りを読みます。目の位置ア（上から）、イ（真横から）、ウ（下から）のうち、正しく読めるのはどれ？',
        figure: scene(cylinderItems(200).concat([
          { type: 'eye', x: 40, y: 50 },
          { type: 'eye', x: 40, y: 120 },
          { type: 'eye', x: 40, y: 190 },
          { type: 'line', points: [[58, 50], [200, 116]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[58, 120], [200, 120]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[58, 190], [200, 124]], color: 'gray', width: 2, dashed: true },
          { type: 'region', id: 'r1', x: 100, y: 70, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 100, y: 120, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 100, y: 170, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: '目盛りは、液面のへこんだ平らなところを真横から見て読みます。上から見ると実際より大きく、下から見ると小さく読んでしまいます。目の高さを液面にそろえよう。',
        hint: '目の高さを液面と同じにするのはどれかな。',
      }),
      fill({
        id: 'sub-2-p4', concept: 'su-measure',
        prompt: '空らんに入る数を入れよう。',
        text: 'メスシリンダーに水を 50.0 cm³ 入れ、石を静かに沈めると、目盛りは 58.0 cm³ になった。石の体積は[b1]である。',
        blanks: [number('b1', 8, 0.1, 'cm³')],
        explanation: '石を入れて増えた分が石の体積なので、58.0 − 50.0 ＝ 8.0 cm³ です。形がふぞろいなものでも、この方法で体積を測れます。',
        hint: '石を入れる前と後の目盛りの差を考えよう。',
      }),
      choice({
        id: 'sub-2-p5', concept: 'su-density',
        prompt: '次の物質のうち、水（密度 1.0 g/cm³）に入れると浮くものはどれ？',
        options: ['鉄（7.9 g/cm³）', 'アルミニウム（2.7 g/cm³）', '氷（0.92 g/cm³）', '銅（8.96 g/cm³）'],
        answer: 'c',
        explanation: '水より密度が小さい物質は水に浮きます。氷の密度は 0.92 g/cm³ で水より小さいので浮きます。ほかの 3 つは水より密度が大きいので沈みます。',
        hint: '密度が 1.0 g/cm³ より小さいものをさがそう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'sub-2-r1', concept: 'su-density',
        prompt: '空らんに入る数を入れよう。',
        text: '質量 54 g、体積 20 cm³ の金属の密度は[b1]である。',
        blanks: [number('b1', 2.7, 0.01, 'g/cm³')],
        explanation: '54 ÷ 20 ＝ 2.7 g/cm³ です。この値はアルミニウムの密度と同じなので、この金属はアルミニウムだと考えられます。',
        hint: '密度 ＝ 質量 ÷ 体積 だよ。',
      }),
      fill({
        id: 'sub-2-r2', concept: 'su-density',
        prompt: '空らんに入る数を入れよう。',
        text: '密度 1.0 g/cm³ の水 150 g の体積は[b1]である。',
        blanks: [number('b1', 150, 0, 'cm³')],
        explanation: '体積 ＝ 質量 ÷ 密度 なので、150 ÷ 1.0 ＝ 150 cm³ です。水は 1 cm³ がほぼ 1 g なので、質量と体積の数が同じになります。',
        hint: '密度の式を、体積を求める形に変えよう。',
      }),
      choice({
        id: 'sub-2-r3', concept: 'su-measure',
        prompt: '上皿てんびんで質量をはかるとき、分銅はどのようにのせる？',
        options: ['軽い分銅から順に、指でのせる', '重い分銅から順に、ピンセットでのせる', '全部の分銅を一度にのせる'],
        answer: 'b',
        explanation: '分銅は重いものから順にのせ、重すぎたら次に軽いものにかえていきます。分銅は手のあぶらやさびで質量が変わらないよう、ピンセットで持ちます。',
        hint: '大きいほうから当たりをつけると、早くつり合わせられるよ。',
      }),
      choice({
        id: 'sub-2-r4', concept: 'su-measure',
        prompt: 'メスシリンダーの目盛りは、どこまで読む？',
        options: ['いちばん近い目盛りの数だけ読む', '1 目盛りの 10 分の 1 まで目分量で読む', '1 目盛りの 100 分の 1 まで読む'],
        answer: 'b',
        explanation: 'メスシリンダーの目盛りは、1 目盛りの 10 分の 1 まで目分量で読みます。たとえば 1 目盛りが 1 mL なら、0.1 mL の位まで読みます。',
        hint: '目盛りと目盛りのあいだも、目で見て分けて読むよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 気体の性質
  // ================================================================

  // ---- ステージ sub-3: 気体の集め方（水上置換法・上方置換法・下方置換法） ----
  const sub3 = {
    id: 'sub-3', areaId: 'gas', title: '気体の集め方', minutes: 5, concepts: ['su-collection'],
    lessons: [
      {
        id: 'sub-3-c1',
        anim: 'su-water-displacement',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '水にとけにくい気体は、水を満たした試験管を水そうの中で逆さに立て、水と置きかえて集めます。これを**水上置換法**といいます。空気がまざりにくく、どれだけ集まったかも見やすい方法です。',
        // 発生した気体がガラス管から出て、水を満たした試験管にたまる
        figure: scene([
          { type: 'text', x: 20, y: 34, text: '水上置換法', size: 16, bold: true },
          { type: 'rect', x: 60, y: 100, width: 220, height: 120, fill: 'none' },
          { type: 'rect', x: 62, y: 125, width: 216, height: 93, fill: 'water', stroke: 'none' },
          { type: 'tube', x: 200, y: 70, height: 90, tilt: 180, level: 1 },
          { type: 'line', points: [[20, 90], [100, 90], [100, 205], [200, 205], [200, 172]], width: 3 },
          { type: 'circle', x: 200, y: 140, r: 4, fill: 'white', stroke: 'line' },
          { type: 'circle', x: 202, y: 112, r: 5, fill: 'white', stroke: 'line' },
          { type: 'text', x: 20, y: 80, text: '気体', size: 13 },
          { type: 'text', x: 220, y: 64, text: '試験管', size: 13 },
          { type: 'text', x: 280, y: 236, text: '水そう', size: 13, anchor: 'end' },
        ]),
      },
      {
        id: 'sub-3-c2',
        anim: 'su-upward-displacement',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '水にとけやすく、空気より軽い気体は、試験管の口を下に向けて、ガラス管を奥まで入れて集めます。これを**上方置換法**といいます。アンモニアを集めるときに使います。',
        // 口を下に向けた試験管に、下からガラス管を入れる
        figure: scene([
          { type: 'text', x: 20, y: 34, text: '上方置換法', size: 16, bold: true },
          { type: 'tube', x: 160, y: 50, height: 100, tilt: 180, level: 0 },
          { type: 'line', points: [[40, 210], [160, 210], [160, 66]], width: 3 },
          { type: 'arrow', x1: 210, y1: 150, x2: 210, y2: 70, color: 'blue' },
          { type: 'text', x: 222, y: 104, text: '軽い気体は', size: 13 },
          { type: 'text', x: 222, y: 122, text: '上にたまる', size: 13 },
          { type: 'text', x: 40, y: 200, text: '気体', size: 13 },
          { type: 'text', x: 20, y: 236, text: '口を下に向ける', size: 13 },
        ]),
      },
      {
        id: 'sub-3-c3',
        anim: 'su-downward-displacement',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '水にとけやすく、空気より重い気体は、試験管の口を上に向けて、ガラス管を底近くまで入れて集めます。これを**下方置換法**といいます。二酸化炭素は空気より重いので、この方法でも集められます。',
        // 口を上に向けた試験管に、上からガラス管を入れる
        figure: scene([
          { type: 'text', x: 20, y: 34, text: '下方置換法', size: 16, bold: true },
          { type: 'tube', x: 160, y: 210, height: 100, level: 0 },
          { type: 'line', points: [[40, 60], [160, 60], [160, 194]], width: 3 },
          { type: 'arrow', x1: 210, y1: 120, x2: 210, y2: 200, color: 'blue' },
          { type: 'text', x: 222, y: 154, text: '重い気体は', size: 13 },
          { type: 'text', x: 222, y: 172, text: '下にたまる', size: 13 },
          { type: 'text', x: 40, y: 52, text: '気体', size: 13 },
          { type: 'text', x: 20, y: 236, text: '口を上に向ける', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'sub-3-w1', concept: 'su-collection',
      prompt: '予想しよう。水にとても とけやすい気体を、水を満たした試験管に水の中で集めようとすると、どうなると思う？',
      options: ['気体が水にとけて、うまく集まらない', 'ほかの気体と同じように集まる', '水が気体に変わって、たくさん集まる'],
      answer: 'a',
      explanation: '水にとけやすい気体は、水にとけてしまうのでうまく集まりません。気体の性質に合った集め方を、このステージで学ぼう。',
      hint: '砂糖を水に入れたときのように、気体も水にとけることがあるよ。',
    }),
    problems: [
      choice({
        id: 'sub-3-p1', concept: 'su-collection',
        prompt: '酸素は水にとけにくい気体です。酸素を集めるのにもっとも適した方法はどれ？',
        options: ['水上置換法', '上方置換法', '下方置換法'],
        answer: 'a',
        explanation: '水にとけにくい気体は水上置換法で集めます。空気がまざりにくく、純粋な気体を集めやすい方法です。水素も同じ理由で水上置換法で集めます。',
        hint: '水にとけにくいなら、水と置きかえて集められるね。',
      }),
      fill({
        id: 'sub-3-t1', concept: 'su-collection', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水にとけにくい気体を、水を満たした試験管の中の水と置きかえて集める方法を[b1]という。',
        blanks: [word('b1', ['水上置換法', '上方置換法', '下方置換法'], '水上置換法')],
        explanation: '水と置きかえて集める方法が**水上置換法**です。水にとけにくい酸素や水素は、この方法で集めます。',
        hint: '「水」と「置きかえる」が名前に入っているよ。',
      }),
      figureChoice({
        id: 'sub-3-p2', concept: 'su-collection',
        prompt: 'アンモニアは、水にとてもとけやすく、空気より軽い気体です。アンモニアを集める方法はア〜ウのどれ？ ア 水そうの水の中で集める、イ 試験管の口を下に向けて集める、ウ 試験管の口を上に向けて集める。',
        figure: collectScene(),
        answer: 'r2',
        explanation: 'アンモニアは水にとけやすいので、水の中では集められません。空気より軽く上にたまるので、口を下に向けたイの上方置換法で集めます。とけやすさ → 重さ の順に考えると選びやすくなります。',
        hint: 'まず水にとけやすいかどうか、次に空気より軽いか重いかを考えよう。',
      }),
      drag({
        id: 'sub-3-p3', concept: 'su-collection',
        prompt: '水上置換法で気体を集めます。水を満たした集気びんを左右に動かして、ガラス管の先から出るあわがびんの中に入る位置に置こう。',
        // ガラス管の先は (200, 175)。集気びんは幅 50 の rect（左上 (x, 105)、口は下 y=185）。中心が x=200 になる rect の x は 175。
        // 許容 16px だけずれても口（幅 50）の中に先が入る。wrong（x=105）は口が 105〜155 で外れる
        figure: scene([
          { type: 'rect', x: 40, y: 110, width: 260, height: 110, fill: 'none' },
          { type: 'rect', x: 42, y: 130, width: 256, height: 88, fill: 'water', stroke: 'none' },
          { type: 'line', points: [[14, 80], [80, 80], [80, 205], [200, 205], [200, 175]], width: 3 },
          { type: 'text', x: 10, y: 70, text: '発生した気体', size: 12 },
          { type: 'rect', id: 'bottle', x: 245, y: 105, width: 50, height: 80, fill: 'water', stroke: 'ink', label: '集気びん', labelPos: 'above' },
        ]),
        draggable: { itemId: 'bottle', axis: 'x' },
        target: { x: 175, y: 105 },
        samples: { correct: { x: 175, y: 105 }, wrong: { x: 105, y: 105 } },
        explanation: 'ガラス管の先を集気びんの口の中に入れると、出てきた気体がびんの水を押し出してたまっていきます。びんは水を満たしたまま、口を水の中に入れておくことが大切です。',
        hint: 'ガラス管の先が、集気びんの口の真下に来るようにしよう。',
      }),
      choice({
        id: 'sub-3-p4', concept: 'su-collection',
        prompt: '上方置換法で集めるのは、どんな性質の気体？',
        options: ['水にとけにくい気体', '水にとけやすく、空気より軽い気体', '水にとけやすく、空気より重い気体'],
        answer: 'b',
        explanation: '上方置換法は、水にとけやすく空気より軽い気体を、口を下に向けた試験管の上のほうにためて集める方法です。アンモニアがその例です。',
        hint: '「上方」に気体がたまるのは、軽い気体だね。',
      }),
      choice({
        id: 'sub-3-p5', concept: 'su-collection',
        prompt: '二酸化炭素は、下方置換法で集めることができます。それは二酸化炭素にどんな性質があるから？',
        options: ['空気より重い', '空気より軽い', '色とにおいがある'],
        answer: 'a',
        explanation: '二酸化炭素は空気より重いので、口を上に向けた試験管の底にたまります。だから下方置換法で集められます。水に少しとけますが、水上置換法でも集められます。',
        hint: '下にたまる気体は、軽いか重いか考えよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'sub-3-r1', concept: 'su-collection',
        prompt: '水素は、水にとけにくい気体です。水素を集めるのにもっとも適した方法はア〜ウのどれ？ ア 水そうの水の中で集める、イ 試験管の口を下に向けて集める、ウ 試験管の口を上に向けて集める。',
        figure: collectScene(),
        answer: 'r1',
        explanation: '水にとけにくい気体は、アの水上置換法で集めるのがもっとも適しています。空気がまざりにくく、集まった量も見て分かります。',
        hint: '水にとけにくいなら、水と置きかえて集められるね。',
      }),
      fill({
        id: 'sub-3-r2', concept: 'su-collection',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'アンモニアは水に[b1]、空気より[b2]ので、上方置換法で集める。',
        blanks: [
          word('b1', ['とけやすく', 'とけにくく'], 'とけやすく'),
          word('b2', ['軽い', '重い'], '軽い'),
        ],
        explanation: 'アンモニアは水にとけやすいので水上置換法は使えず、空気より軽いので口を下に向けた上方置換法で集めます。',
        hint: '水にとけやすいかどうかと、空気より軽いか重いかの 2 つを考えよう。',
      }),
      choice({
        id: 'sub-3-t2', concept: 'su-collection', term: true,
        prompt: '次の説明に合う言葉はどれ？「水にとけやすく空気より重い気体を、口を上に向けた試験管に集める方法」',
        options: ['水上置換法', '上方置換法', '下方置換法'],
        answer: 'c',
        explanation: '空気より重い気体は、試験管の下のほうからたまります。口を上に向けて集めるこの方法を**下方置換法**といいます。',
        hint: '重い気体は「下」にたまるね。',
      }),
      choice({
        id: 'sub-3-t3', concept: 'su-collection', term: true,
        prompt: '次の説明に合う言葉はどれ？「水にとけやすく空気より軽い気体を、口を下に向けた試験管に集める方法」',
        options: ['水上置換法', '上方置換法', '下方置換法'],
        answer: 'b',
        explanation: '空気より軽い気体は、試験管の上のほうにたまります。口を下に向けて集めるこの方法を**上方置換法**といいます。',
        hint: '軽い気体は「上」にたまるね。',
      }),
    ],
  };

  // ---- ステージ sub-4: いろいろな気体（酸素・二酸化炭素・水素・アンモニア） ----
  const sub4 = {
    id: 'sub-4', areaId: 'gas', title: 'いろいろな気体', minutes: 5, concepts: ['su-gases'],
    lessons: [
      {
        id: 'sub-4-c1',
        text: '**二酸化マンガン**に**過酸化水素水**（オキシドール）を加えると、**酸素**が発生します。酸素は色もにおいもなく、水にとけにくい気体です。ものを燃やすはたらきがあり、火のついた線香を入れると炎を上げて燃えます。',
        // 酸素の発生と水上置換法
        figure: scene([
          { type: 'tube', x: 60, y: 200, height: 90, level: 0.35 },
          { type: 'rect', x: 46, y: 104, width: 28, height: 12, rx: 3, fill: 'gray', stroke: 'ink' },   // ゴム栓（ガラス管が貫通）
          { type: 'circle', x: 54, y: 192, r: 3, fill: 'ink', stroke: 'none' },
          { type: 'circle', x: 64, y: 194, r: 3, fill: 'ink', stroke: 'none' },
          { type: 'circle', x: 60, y: 186, r: 3, fill: 'ink', stroke: 'none' },
          { type: 'rect', x: 110, y: 110, width: 190, height: 110, fill: 'none' },
          { type: 'rect', x: 112, y: 130, width: 186, height: 88, fill: 'water', stroke: 'none' },
          { type: 'tube', x: 220, y: 95, height: 90, tilt: 180, level: 1 },
          { type: 'line', points: [[60, 118], [60, 80], [130, 80], [130, 205], [220, 205], [220, 175]], width: 3 },
          { type: 'text', x: 240, y: 104, text: '酸素', size: 14 },
          { type: 'text', x: 4, y: 236, text: '二酸化マンガン＋過酸化水素水', size: 12 },
        ]),
      },
      {
        id: 'sub-4-c2',
        anim: 'su-co2-limewater',   // 動く図（js/anim-chem.js）。figure は静止図として残す
        text: '**石灰石**に**うすい塩酸**を加えると、**二酸化炭素**が発生します。二酸化炭素は空気より重く、水に少しとけ、その水溶液は酸性を示します。**石灰水**に通すと、石灰水が白くにごります。',
        // 二酸化炭素を石灰水に通す
        figure: scene([
          { type: 'tube', x: 60, y: 190, height: 90, level: 0.35 },
          { type: 'rect', x: 46, y: 94, width: 28, height: 12, rx: 3, fill: 'gray', stroke: 'ink' },   // ゴム栓（ガラス管が貫通）
          { type: 'polygon', points: [[52, 186], [60, 178], [68, 186], [62, 190]], fill: 'rock' },
          { type: 'line', points: [[60, 108], [60, 70], [210, 70], [210, 200]], width: 3 },
          { type: 'beaker', x: 220, y: 215, width: 80, height: 90, level: 0.6, liquid: 'glass' },
          { type: 'circle', x: 210, y: 186, r: 3, fill: 'white', stroke: 'line' },
          { type: 'circle', x: 214, y: 174, r: 3, fill: 'white', stroke: 'line' },
          { type: 'text', x: 4, y: 236, text: '石灰石＋うすい塩酸', size: 12 },
          { type: 'text', x: 228, y: 236, text: '石灰水が白くにごる', size: 12, anchor: 'middle' },
          { type: 'text', x: 110, y: 60, text: '二酸化炭素', size: 14 },
        ]),
      },
      {
        id: 'sub-4-c3',
        text: '亜鉛や鉄などの金属に**うすい塩酸**を加えると、**水素**が発生します。水素は物質の中でもっとも軽い気体で、水にとけにくいです。火を近づけると音を立てて燃え、**水**ができます。',
        // 水素を集めた試験管の口に火を近づける
        figure: scene([
          { type: 'tube', x: 160, y: 40, height: 90, tilt: 180, level: 0 },
          { type: 'flame', x: 160, y: 180 },
          { type: 'line', points: [[160, 180], [160, 222]], color: 'brown', width: 4 },
          { type: 'text', x: 182, y: 84, text: '水素', size: 16 },
          { type: 'text', x: 10, y: 200, text: 'ポッと音を立てて', size: 13 },
          { type: 'text', x: 10, y: 218, text: '燃え、水ができる', size: 13 },
          { type: 'text', x: 200, y: 168, text: 'マッチの火', size: 13 },
        ]),
      },
      {
        id: 'sub-4-c4',
        text: '**アンモニア**は特有の**刺激臭**がある気体で、空気より軽く、水にとてもとけやすいです。水溶液はアルカリ性なので、水でぬらした赤色リトマス紙を青色に変えます。',
        // アンモニアを集めた試験管と、赤色リトマス紙 → 青色
        figure: scene([
          { type: 'tube', x: 90, y: 40, height: 100, tilt: 180, level: 0 },
          { type: 'line', points: [[90, 200], [90, 60]], width: 3 },
          { type: 'text', x: 110, y: 70, text: 'アンモニア', size: 14 },
          { type: 'text', x: 190, y: 62, text: '赤色リトマス紙', size: 12 },
          { type: 'rect', x: 190, y: 72, width: 70, height: 18, fill: 'red', stroke: 'none' },
          { type: 'arrow', x1: 225, y1: 100, x2: 225, y2: 140, color: 'gray' },
          { type: 'rect', x: 190, y: 150, width: 70, height: 18, fill: 'blue', stroke: 'none' },
          { type: 'text', x: 190, y: 190, text: '青色に変わる', size: 13 },
          { type: 'text', x: 10, y: 232, text: '上方置換法で集める', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'sub-4-w1', concept: 'su-gases',
      prompt: '予想しよう。酸素を集めた試験管に、火のついた線香を入れると、どうなると思う？',
      options: ['火がすぐに消える', '炎を上げて激しく燃える', '何も変わらない'],
      answer: 'b',
      explanation: '酸素にはものを燃やすはたらきがあるので、線香は炎を上げて激しく燃えます。気体ごとの性質を、このステージで整理しよう。',
      hint: 'ものが燃えるのに必要な気体は何かな。',
    }),
    problems: [
      choice({
        id: 'sub-4-p1', concept: 'su-gases',
        prompt: '石灰水に通すと、石灰水を白くにごらせる気体はどれ？',
        options: ['酸素', '水素', '二酸化炭素', 'アンモニア'],
        answer: 'c',
        explanation: '石灰水を白くにごらせるのは二酸化炭素です。気体が二酸化炭素かどうかを確かめるときに、石灰水を使います。',
        hint: '有機物を燃やしたときにできる気体だよ。',
      }),
      fill({
        id: 'sub-4-t1', concept: 'su-gases', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '二酸化炭素を通すと白くにごる液体を[b1]という。',
        blanks: [word('b1', ['石灰水', '食塩水', '過酸化水素水'], '石灰水')],
        explanation: '二酸化炭素を通すと白くにごる液体は**石灰水**です。二酸化炭素があるかどうかを調べるときに使います。',
        hint: '「石灰」がつく液体だよ。',
      }),
      choice({
        id: 'sub-4-p2', concept: 'su-gases',
        prompt: '酸素を発生させるには、どの組み合わせを使う？',
        options: ['石灰石とうすい塩酸', '二酸化マンガンと過酸化水素水（オキシドール）', '亜鉛とうすい塩酸', '塩化アンモニウムと水酸化カルシウム'],
        answer: 'b',
        explanation: '二酸化マンガンに過酸化水素水を加えると酸素が発生します。石灰石とうすい塩酸では二酸化炭素、亜鉛とうすい塩酸では水素、塩化アンモニウムと水酸化カルシウムを加熱するとアンモニアが発生します。',
        hint: 'オキシドールは傷の消毒に使う液体だよ。',
      }),
      figureChoice({
        id: 'sub-4-p3', concept: 'su-gases',
        prompt: 'ア 二酸化炭素、イ 酸素、ウ 水素 を、それぞれ試験管に集めました。火のついた線香を入れると、炎を上げて激しく燃えるのはどれ？',
        figure: threeGasTubes('火のついた線香を入れる', ['二酸化炭素', '酸素', '水素']),
        answer: 'r2',
        explanation: '酸素にはものを燃やすはたらきがあるので、線香は炎を上げて燃えます。二酸化炭素の中では線香の火は消えます。水素は自分が燃える気体で、ものを燃やすはたらきはありません。',
        hint: 'ものを燃やすはたらきがある気体はどれかな。',
      }),
      choice({
        id: 'sub-4-p4', concept: 'su-gases',
        prompt: 'アンモニアを水にとかした水溶液に、赤色リトマス紙をつけるとどうなる？',
        options: ['赤色のまま変わらない', '青色に変わる', '白くにごる'],
        answer: 'b',
        explanation: 'アンモニアの水溶液はアルカリ性なので、赤色リトマス紙を青色に変えます。リトマス紙の色の変化で、酸性かアルカリ性かを調べられます。',
        hint: 'アンモニアの水溶液は、酸性・アルカリ性のどちらかな。',
      }),
      choice({
        id: 'sub-4-p5', concept: 'su-gases',
        prompt: '水素を集めた試験管の口に火を近づけると、音を立てて燃えました。このとき何ができる？',
        options: ['水', '二酸化炭素', '酸素'],
        answer: 'a',
        explanation: '水素が燃えると水ができます。燃えたあとの試験管の内側がくもるのは、できた水がついたからです。二酸化炭素はできません。',
        hint: '「水素」という名前の中に、ヒントがあるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'sub-4-r1', concept: 'su-gases',
        prompt: '二酸化炭素を発生させるには、どの組み合わせを使う？',
        options: ['石灰石とうすい塩酸', '二酸化マンガンと過酸化水素水', '亜鉛とうすい塩酸'],
        answer: 'a',
        explanation: '石灰石（貝がらや卵のからでもよい）にうすい塩酸を加えると、二酸化炭素が発生します。二酸化マンガンと過酸化水素水では酸素、亜鉛とうすい塩酸では水素が発生します。',
        hint: '石灰水と同じ「石灰」がつくものを思い出そう。',
      }),
      figureChoice({
        id: 'sub-4-r2', concept: 'su-gases',
        prompt: 'ア 水素、イ 酸素、ウ 二酸化炭素 を、それぞれ試験管に集めました。試験管の口にマッチの火を近づけると、ポッと音を立てて気体が燃えるのはどれ？',
        figure: threeGasTubes('口にマッチの火を近づける', ['水素', '酸素', '二酸化炭素']),
        answer: 'r1',
        explanation: '水素は燃える気体なので、火を近づけると音を立てて燃え、水ができます。酸素はものを燃やすはたらきがありますが、酸素そのものは燃えません。二酸化炭素は燃えません。',
        hint: '気体そのものが燃えるのはどれかな。',
      }),
      choice({
        id: 'sub-4-r3', concept: 'su-gases',
        prompt: '鼻をさすような特有のにおい（刺激臭）がある気体はどれ？',
        options: ['酸素', 'アンモニア', '水素', '二酸化炭素'],
        answer: 'b',
        explanation: 'アンモニアには特有の刺激臭があります。酸素・水素・二酸化炭素は、色もにおいもありません。においをかぐときは、手であおぐようにしてかぎます。',
        hint: 'ほかの 3 つは、色もにおいもない気体だよ。',
      }),
      choice({
        id: 'sub-4-t2', concept: 'su-gases', term: true,
        prompt: '次の説明に合う言葉はどれ？「二酸化炭素を通すと白くにごる、水酸化カルシウムの水溶液」',
        options: ['石灰水', '過酸化水素水', 'うすい塩酸'],
        answer: 'a',
        explanation: '水酸化カルシウムの水溶液を**石灰水**といいます。二酸化炭素を通すと白くにごるので、二酸化炭素を確かめるのに使います。',
        hint: '二酸化炭素を確かめる液体だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'su-metal', title: '金属の性質', basic: null, lessonStageId: 'sub-1',
      checkPool: [
        choice({
          id: 'su-metal-k1', concept: 'su-metal',
          prompt: '金属かどうかを調べるのに、もっとも適した方法はどれ？',
          options: ['磁石につくか調べる', '電気を通すか調べる', '水に浮くか調べる'],
          answer: 'b',
          explanation: '金属はどれも電気を通すので、電気を通すかどうかで調べられます。磁石につくのは鉄など一部の金属だけなので、磁石では決められません。',
          hint: 'すべての金属に共通する性質はどれかな。',
        }),
        choice({
          id: 'su-metal-k2', concept: 'su-metal',
          prompt: '「金属はすべて磁石につく」という考えは正しい？',
          options: ['正しい', '正しくない（磁石につくのは鉄など一部だけ）'],
          answer: 'b',
          explanation: '銅やアルミニウムは金属ですが、磁石にはつきません。磁石につくのは鉄など一部の金属だけです。',
          hint: '10 円玉を磁石に近づけたときを思い出そう。',
        }),
        fill({
          id: 'su-metal-k3', concept: 'su-metal',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '金属をみがくと出る特有のかがやきを[b1]という。金属は電気をよく通し、[b2]をよく伝える。',
          blanks: [
            word('b1', ['金属光沢', '有機物', '密度'], '金属光沢'),
            word('b2', ['熱', '音', 'におい'], '熱'),
          ],
          explanation: '金属には、金属光沢がある、電気をよく通す、熱をよく伝える、たたくと広がり引っぱるとのびる、という共通の性質があります。',
          hint: 'なべやフライパンが金属でできている理由を考えよう。',
        }),
      ],
    },
    {
      id: 'su-organic', title: '有機物と無機物', basic: null, lessonStageId: 'sub-1',
      checkPool: [
        choice({
          id: 'su-organic-k1', concept: 'su-organic',
          prompt: '次のうち、有機物はどれ？',
          options: ['食塩', 'ガラス', 'ろう', '鉄'],
          answer: 'c',
          explanation: 'ろうは炭素をふくむ有機物で、燃やすと二酸化炭素ができます。食塩・ガラス・鉄は炭素をふくまない無機物です。',
          hint: '燃やすと二酸化炭素ができるものをさがそう。',
        }),
        choice({
          id: 'su-organic-k2', concept: 'su-organic',
          prompt: '砂糖を加熱すると、どうなる？',
          options: ['変化しない', '黒くこげて炭が残る', '白い粉のまま重くなる'],
          answer: 'b',
          explanation: '砂糖は有機物なので、加熱すると黒くこげて炭が残ります。さらに強く熱すると燃えて、二酸化炭素ができます。',
          hint: 'カラメルを作りすぎたときを思い出そう。',
        }),
        fill({
          id: 'su-organic-k3', concept: 'su-organic',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '有機物は[b1]をふくむ物質である。食塩のように[b1]をふくまない物質を[b2]という。',
          blanks: [
            word('b1', ['炭素', '酸素', '鉄'], '炭素'),
            word('b2', ['無機物', '有機物', '金属'], '無機物'),
          ],
          explanation: '有機物は炭素をふくむ物質で、燃やすと二酸化炭素ができます。ただし炭素そのものや二酸化炭素は、炭素をふくんでいても無機物に分けます。',
          hint: '燃やしてできる二酸化炭素のもとになるものは何かな。',
        }),
      ],
    },
    {
      id: 'su-density', title: '密度と計算', basic: null, lessonStageId: 'sub-2',
      checkPool: [
        fill({
          id: 'su-density-k1', concept: 'su-density',
          prompt: '空らんに入る数を入れよう。',
          text: '質量 80 g、体積 10 cm³ の物質の密度は[b1]である。',
          blanks: [number('b1', 8, 0.01, 'g/cm³')],
          explanation: '密度 ＝ 質量 ÷ 体積 なので、80 ÷ 10 ＝ 8.0 g/cm³ です。',
          hint: '質量を体積でわろう。',
        }),
        choice({
          id: 'su-density-k2', concept: 'su-density',
          prompt: '密度 0.9 g/cm³ のプラスチックの小片を水に入れると、どうなる？',
          options: ['水に浮く', '水に沈む', '水の中ほどで止まる'],
          answer: 'a',
          explanation: '水（1.0 g/cm³）より密度が小さいものは、水に浮きます。浮くか沈むかは、大きさではなく密度で決まります。',
          hint: '水の密度 1.0 g/cm³ と比べよう。',
        }),
        fill({
          id: 'su-density-k3', concept: 'su-density',
          prompt: '空らんに入る数を入れよう。',
          text: '質量 30 g、体積 40 cm³ の物質の密度は[b1]である。',
          blanks: [number('b1', 0.75, 0.01, 'g/cm³')],
          explanation: '30 ÷ 40 ＝ 0.75 g/cm³ です。水より密度が小さいので、この物質は水に浮きます。',
          hint: '質量 ÷ 体積 で、わる順番に気をつけよう。',
        }),
      ],
    },
    {
      id: 'su-measure', title: 'メスシリンダーと上皿てんびん', basic: null, lessonStageId: 'sub-2',
      checkPool: [
        choice({
          id: 'su-measure-k1', concept: 'su-measure',
          prompt: 'メスシリンダーで水の体積を読むとき、液面のどこを読む？',
          options: ['へこんだ平らなところ', '容器のかべにそって盛り上がったところ', 'どこでもよい'],
          answer: 'a',
          explanation: '水の液面は中央がへこんでいるので、そのへこんだ平らなところを真横から読みます。',
          hint: '液面はまっすぐではなく、少し曲がっているね。',
        }),
        choice({
          id: 'su-measure-k2', concept: 'su-measure',
          prompt: '上皿てんびんを使い終わったら、どうしておく？',
          options: ['皿を両方にのせたままにする', '皿を一方に重ねておく', '分銅をのせたままにする'],
          answer: 'b',
          explanation: '使い終わったら、皿を一方に重ねておきます。うでがふれ続けて、支点がいたむのを防ぐためです。',
          hint: 'てんびんがゆれ続けないようにするには、どうするかな。',
        }),
        fill({
          id: 'su-measure-k3', concept: 'su-measure',
          prompt: '空らんに入る数を入れよう。',
          text: '水 40.0 cm³ を入れたメスシリンダーに金属を沈めると、目盛りが 46.5 cm³ になった。金属の体積は[b1]である。',
          blanks: [number('b1', 6.5, 0.1, 'cm³')],
          explanation: '増えた分が金属の体積なので、46.5 − 40.0 ＝ 6.5 cm³ です。',
          hint: '沈める前と後の目盛りの差を求めよう。',
        }),
      ],
    },
    {
      id: 'su-collection', title: '気体の集め方', basic: null, lessonStageId: 'sub-3',
      checkPool: [
        choice({
          id: 'su-collection-k1', concept: 'su-collection',
          prompt: '水上置換法で集めるのに向いているのは、どんな気体？',
          options: ['水にとけにくい気体', '水にとけやすく空気より軽い気体', '水にとけやすく空気より重い気体'],
          answer: 'a',
          explanation: '水上置換法は、水にとけにくい気体を集める方法です。水にとけやすい気体は水にとけてしまい、集まりません。',
          hint: '水と置きかえるので、水にとけないことが大切だね。',
        }),
        choice({
          id: 'su-collection-k2', concept: 'su-collection',
          prompt: '気体を発生させたとき、はじめに出てくる気体を集めないのはなぜ？',
          options: ['装置の中にあった空気が多くまじっているから', 'はじめの気体は毒だから', 'はじめは気体が出ないから'],
          answer: 'a',
          explanation: 'はじめに出てくる気体には、フラスコや管の中にあった空気が多くまじっています。しばらくしてから集めると、目的の気体を集められます。',
          hint: '実験を始める前、装置の中には何が入っていたかな。',
        }),
        fill({
          id: 'su-collection-k3', concept: 'su-collection',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '水にとけやすく空気より軽い気体は[b1]で、水にとけやすく空気より重い気体は[b2]で集める。',
          blanks: [
            word('b1', ['水上置換法', '上方置換法', '下方置換法'], '上方置換法'),
            word('b2', ['水上置換法', '上方置換法', '下方置換法'], '下方置換法'),
          ],
          explanation: '軽い気体は上にたまるので上方置換法、重い気体は下にたまるので下方置換法で集めます。',
          hint: '軽いものは上、重いものは下にたまるね。',
        }),
      ],
    },
    {
      id: 'su-gases', title: '気体の性質と発生', basic: 'su-collection', lessonStageId: 'sub-4',
      checkPool: [
        choice({
          id: 'su-gases-k1', concept: 'su-gases',
          prompt: '酸素の性質として正しいものはどれ？',
          options: ['刺激臭がある', 'ものを燃やすはたらきがある', '石灰水を白くにごらせる'],
          answer: 'b',
          explanation: '酸素には、ものを燃やすはたらきがあります。色もにおいもなく、石灰水は変化しません。',
          hint: '線香を入れたときのようすを思い出そう。',
        }),
        choice({
          id: 'su-gases-k2', concept: 'su-gases',
          prompt: '亜鉛にうすい塩酸を加えると発生する気体はどれ？',
          options: ['酸素', '二酸化炭素', '水素'],
          answer: 'c',
          explanation: '亜鉛や鉄などの金属にうすい塩酸を加えると、水素が発生します。水素はもっとも軽い気体です。',
          hint: '火を近づけると音を立てて燃える気体だよ。',
        }),
        choice({
          id: 'su-gases-k3', concept: 'su-gases',
          prompt: '次の気体のうち、空気より重いものはどれ？',
          options: ['水素', 'アンモニア', '二酸化炭素'],
          answer: 'c',
          explanation: '二酸化炭素は空気より重い気体です。水素とアンモニアは空気より軽いので、上へのぼっていきます。',
          hint: '下方置換法でも集められる気体を思い出そう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'substance',
    title: '身のまわりの物質',
    mascot: 'C',   // 担当の先生（ぷにカプセル。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'props', title: '物質の性質', order: 1, stages: [sub1, sub2] },
      { id: 'gas', title: '気体の性質', order: 2, stages: [sub3, sub4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
