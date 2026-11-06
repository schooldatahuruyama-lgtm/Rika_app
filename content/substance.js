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
  // 領域 3: ミニプリント（先生のミニプリントの問題を書き直したもの。共通指示 .ai-tasks/20261106-130000_ミニプリント反映_共通.md）
  // ================================================================

  // 白い粉 3 つの皿（ア 食塩・イ 砂糖・ウ デンプン）。withRegions で選ぶ場所を付ける
  function powderScene(withRegions) {
    const items = [{ type: 'text', x: 160, y: 30, text: 'どれも白い粉', size: 14, anchor: 'middle' }];
    [[60, '食塩'], [160, '砂糖'], [260, 'デンプン']].forEach(([x, name], i) => {
      items.push({ type: 'ellipse', x, y: 110, rx: 42, ry: 14, fill: 'glass' });
      items.push({ type: 'ellipse', x, y: 104, rx: 24, ry: 7, fill: 'white' });
      items.push({ type: 'text', x, y: 150, text: name, size: 14, anchor: 'middle' });
      if (withRegions) items.push({ type: 'region', id: 'r' + (i + 1), x, y: 200, r: 22, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // 上皿てんびん（正面から）。調節ねじは うでの両はし。withRegions で ア 皿・イ 針・ウ 調節ねじ を選ぶ場所にする
  function balanceScene(withRegions) {
    const items = [
      { type: 'rect', x: 50, y: 196, width: 220, height: 18, fill: 'gray' },
      { type: 'rect', x: 150, y: 110, width: 20, height: 86, fill: 'glass' },
      { type: 'rect', x: 50, y: 100, width: 220, height: 10, fill: 'gray' },
      { type: 'line', points: [[80, 100], [80, 86]], width: 3 },
      { type: 'line', points: [[240, 100], [240, 86]], width: 3 },
      { type: 'ellipse', x: 80, y: 82, rx: 42, ry: 7, fill: 'glass' },
      { type: 'ellipse', x: 240, y: 82, rx: 42, ry: 7, fill: 'glass' },
      { type: 'circle', x: 46, y: 105, r: 6, fill: 'ink' },
      { type: 'circle', x: 274, y: 105, r: 6, fill: 'ink' },
      { type: 'line', points: [[160, 110], [160, 182]], color: 'red', width: 2 },
      { type: 'line', points: [[140, 186], [180, 186]], width: 2 },
    ];
    if (withRegions) {
      items.push({ type: 'region', id: 'r1', x: 80, y: 46, r: 22, label: 'ア' });
      items.push({ type: 'region', id: 'r2', x: 206, y: 160, r: 22, label: 'イ' });
      items.push({ type: 'region', id: 'r3', x: 290, y: 140, r: 22, label: 'ウ' });
      items.push({ type: 'line', points: [[184, 160], [164, 160]], color: 'blue', width: 2 });
      items.push({ type: 'line', points: [[282, 120], [276, 110]], color: 'blue', width: 2 });
    } else {
      items.push({ type: 'text', x: 80, y: 60, text: '皿', size: 14, anchor: 'middle' });
      items.push({ type: 'text', x: 190, y: 166, text: '針', size: 14 });
      items.push({ type: 'text', x: 296, y: 140, text: '調節ねじ', size: 13, anchor: 'end' });
    }
    return scene(items);
  }

  // メスシリンダーの液面を大きくした図。ふちの高さ y=90、へこんだ所 y=140。withRegions で ア ふち・イ へこんだ所
  function meniscusScene(withRegions) {
    const items = [
      { type: 'polygon', points: [[82, 90], [110, 124], [160, 140], [210, 124], [238, 90], [238, 228], [82, 228]], fill: 'water', stroke: 'none' },
      { type: 'line', points: [[82, 90], [110, 124], [160, 140], [210, 124], [238, 90]], color: 'blue', width: 2 },
      { type: 'line', points: [[80, 20], [80, 230]], width: 3 },
      { type: 'line', points: [[240, 20], [240, 230]], width: 3 },
      { type: 'line', points: [[240, 90], [268, 90]], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [[160, 140], [268, 140]], color: 'gray', width: 1, dashed: true },
      { type: 'text', x: 92, y: 40, text: '液面を真横から見る', size: 13 },
    ];
    if (withRegions) {
      items.push({ type: 'region', id: 'r1', x: 292, y: 90, r: 22, label: 'ア' });
      items.push({ type: 'region', id: 'r2', x: 292, y: 140, r: 22, label: 'イ' });
    } else {
      items.push({ type: 'text', x: 160, y: 168, text: 'ここを読む', size: 14, anchor: 'middle' });
    }
    return scene(items);
  }

  // メスシリンダーの目盛り（50〜60 mL。1 mL ＝ 16px、目盛りは 1 mL ごと）。へこんだ所が 56 mL
  const CYLINDER_56 = scene([
    { type: 'polygon', points: [[122, 98], [135, 103], [150, 104], [165, 103], [178, 98], [178, 228], [122, 228]], fill: 'water', stroke: 'none' },
    { type: 'line', points: [[122, 98], [135, 103], [150, 104], [165, 103], [178, 98]], color: 'blue', width: 2 },
    { type: 'rect', x: 120, y: 20, width: 60, height: 210, fill: 'none' },
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ type: 'line', points: [[180, 200 - 16 * i], [i % 5 === 0 ? 200 : 192, 200 - 16 * i]], width: 2 })),
    { type: 'text', x: 206, y: 46, text: '60', size: 14 },
    { type: 'text', x: 206, y: 126, text: '55', size: 14 },
    { type: 'text', x: 206, y: 206, text: '50', size: 14 },
    { type: 'text', x: 236, y: 26, text: '〔mL〕', size: 12 },
  ]);

  // 体積 5 cm³ の 3 つの金属（ア 鉄・イ 銅・ウ アルミニウム）。alMass はアルミニウムの質量の文字
  function metals5(alMass, withRegions) {
    const items = [{ type: 'text', x: 160, y: 30, text: 'どれも体積 5 cm³', size: 14, anchor: 'middle' }];
    [[60, 'gray', '鉄', '39.5 g'], [160, 'orange', '銅', '44.8 g'], [260, 'glass', 'アルミニウム', alMass]].forEach(([x, fill, name, mass], i) => {
      items.push({ type: 'rect', x: x - 30, y: 60, width: 60, height: 60, fill });
      items.push({ type: 'text', x, y: 144, text: name, size: 14, anchor: 'middle' });
      items.push({ type: 'text', x, y: 168, text: mass, size: 15, anchor: 'middle', bold: true });
      if (withRegions) items.push({ type: 'region', id: 'r' + (i + 1), x, y: 210, r: 22, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // 気体の集め方 3 種（collectScene と同じ絵）の、選ぶ場所の代わりに ア〜ウ の文字を書いた図
  function collectPlain() {
    const items = collectScene().items.filter(it => it.type !== 'region');
    [[55, 'ア'], [160, 'イ'], [265, 'ウ']].forEach(([x, t]) => items.push({ type: 'text', x, y: 222, text: t, size: 16, anchor: 'middle', bold: true }));
    return scene(items);
  }

  // ---- ステージ substance-mp1: プリント 1（白い粉・有機物と無機物・金属の性質・プラスチック） ----
  const substanceMp1 = {
    id: 'substance-mp1', areaId: 'substance-miniprint', title: 'プリント 1: 白い粉・有機物・金属・プラスチック', minutes: 7, concepts: ['su-organic', 'su-metal'],
    lessons: [
      {
        id: 'substance-mp1-c1',
        text: '食塩・砂糖・デンプンはどれも白い粉ですが、水にとけるか、熱すると黒くこげるかで見分けられます。熱すると黒くこげる砂糖やデンプンは、**炭素**をふくむ**有機物**です。食塩は**無機物**です。',
        figure: scene([
          { type: 'text', x: 90, y: 40, text: '水にとける', size: 13, anchor: 'middle' },
          { type: 'text', x: 220, y: 40, text: '熱すると', size: 13, anchor: 'middle' },
          ...[[80, '食塩', 'とける', 'こげない'], [130, '砂糖', 'とける', '黒くこげる'], [180, 'デンプン', 'とけにくい', '黒くこげる']].flatMap(([y, name, w, h]) => [
            { type: 'text', x: 10, y, text: name, size: 14 },
            { type: 'text', x: 90, y, text: w, size: 14, anchor: 'middle' },
            { type: 'text', x: 220, y, text: h, size: 14, anchor: 'middle' },
          ]),
          { type: 'line', points: [[10, 52], [310, 52]], color: 'gray', width: 1 },
          { type: 'text', x: 160, y: 224, text: '黒くこげる → 有機物（炭素をふくむ）', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'substance-mp1-c2',
        text: '鉄・銅・アルミニウムなどの**金属**は、みがくと光る（**金属光沢**）、電気をよく通す、熱をよく伝える、たたくと広がり引っぱるとのびる、という性質があります。磁石につくのは鉄など一部だけです。',
        figure: scene([
          { type: 'rect', x: 30, y: 60, width: 90, height: 60, fill: 'gray' },
          { type: 'line', points: [[44, 74], [64, 94]], color: 'white', width: 3 },
          { type: 'line', points: [[58, 70], [84, 96]], color: 'white', width: 3 },
          { type: 'text', x: 75, y: 146, text: '金属光沢', size: 14, anchor: 'middle' },
          { type: 'text', x: 150, y: 70, text: '・電気をよく通す', size: 14 },
          { type: 'text', x: 150, y: 100, text: '・熱をよく伝える', size: 14 },
          { type: 'text', x: 150, y: 130, text: '・広がる・のびる', size: 14 },
          { type: 'text', x: 20, y: 206, text: '磁石につくのは鉄など一部だけ', size: 14 },
        ]),
      },
      {
        id: 'substance-mp1-c3',
        text: '**プラスチック**は石油を原料につくられる有機物です。軽い、さびない、形をつくりやすい、酸やアルカリに強い、などの性質があり、電気は通しにくいです。燃やすと有毒な気体が出るものもあります。',
        figure: scene([
          { type: 'rect', x: 30, y: 60, width: 50, height: 36, fill: 'white', label: 'PVC' },
          { type: 'rect', x: 120, y: 56, width: 70, height: 44, fill: 'sky', label: 'PS' },
          { type: 'polygon', points: [[230, 50], [290, 50], [280, 110], [240, 110]], fill: 'lightgreen' },
          { type: 'text', x: 55, y: 124, text: '消しゴム', size: 13, anchor: 'middle' },
          { type: 'text', x: 155, y: 124, text: 'CD ケース', size: 13, anchor: 'middle' },
          { type: 'text', x: 260, y: 130, text: 'バケツ（PE）', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 180, text: '原料は石油・軽い・さびない', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 206, text: '電気を通しにくい', size: 14, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'substance-mp1-w1', concept: 'su-organic',
      prompt: '予想しよう。食塩・砂糖・デンプンを、それぞれ燃焼さじにのせてガスバーナーで熱すると、黒くこげるのはどれだと思う？',
      options: ['食塩だけ', '砂糖とデンプン', '3 つすべて'],
      answer: 'b',
      explanation: '砂糖とデンプンは黒くこげますが、食塩はこげません。こげるのは炭素をふくむからです。',
      hint: 'ホットケーキをこがしたときを思い出そう。食塩はどうかな。',
    }),
    problems: [
      fill({
        id: 'substance-mp1-p1', concept: 'su-organic',
        prompt: '3 つの白い粉を調べた結果をまとめよう。',
        text: '食塩は水に[b1]、熱すると[b2]。砂糖は水に[b3]、熱すると[b4]。デンプン（小麦粉）は水に[b5]、熱すると[b6]。',
        blanks: [
          word('b1', ['とける', 'とけにくい'], 'とける'),
          word('b2', ['黒くこげる', 'こげない'], 'こげない'),
          word('b3', ['とける', 'とけにくい'], 'とける'),
          word('b4', ['黒くこげる', 'こげない'], '黒くこげる'),
          word('b5', ['とける', 'とけにくい'], 'とけにくい'),
          word('b6', ['黒くこげる', 'こげない'], '黒くこげる'),
        ],
        explanation: '水にとけるのは食塩と砂糖、とけにくいのはデンプンです。熱すると黒くこげるのは砂糖とデンプンです。2 つの性質を組み合わせると、3 つの白い粉を見分けられます。',
        hint: '片栗粉（デンプン）を水に入れると、白くにごってしずむね。',
      }),
      fill({
        id: 'substance-mp1-t1', concept: 'su-organic', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '砂糖やデンプンを熱すると黒くこげるのは、[b1]がふくまれているからである。[b1]をふくむ物質を[b2]、それ以外の物質を[b3]という。',
        blanks: [
          word('b1', ['炭素', '酸素', '水素'], '炭素'),
          word('b2', ['有機物', '無機物'], '有機物'),
          word('b3', ['有機物', '無機物'], '無機物'),
        ],
        explanation: '黒くこげたのは**炭素**です。炭素をふくむ物質を**有機物**、それ以外を**無機物**といいます（二酸化炭素などは無機物に分けます）。',
        hint: '黒くこげたもの（炭）は、何という物質かな。',
      }),
      figureChoice({
        id: 'substance-mp1-p2', concept: 'su-organic',
        prompt: 'ア〜ウの白い粉のうち、有機物ではないもの（無機物）はどれ？',
        figure: powderScene(true),
        answer: 'r1',
        explanation: '熱しても黒くこげない食塩は無機物です。熱すると黒くこげる砂糖とデンプンは、炭素をふくむ有機物です。',
        hint: '熱すると黒くこげなかったものはどれかな。',
      }),
      choice({
        id: 'substance-mp1-p3', concept: 'su-metal',
        prompt: '次のうち、すべての金属に共通する性質ではないものはどれ？',
        options: ['みがくと光る', '電気をよく通す', '磁石につく', '熱をよく伝える'],
        answer: 'c',
        explanation: '電気をよく通すのは、すべての金属に共通する性質です。磁石につくのは鉄などの一部の金属だけで、銅やアルミニウムは磁石につきません。',
        hint: 'アルミニウムのかんに磁石を近づけると、どうなるかな。',
      }),
      fill({
        id: 'substance-mp1-p4', concept: 'su-metal',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '金属をみがくと出る、金属特有のかがやきを[b1]という。金属はどれも、電気を[b2]。',
        blanks: [
          word('b1', ['金属光沢', '炎色', '結晶'], '金属光沢'),
          word('b2', ['よく通す', 'まったく通さない'], 'よく通す'),
        ],
        explanation: 'みがくと出るかがやきを**金属光沢**といいます。電気をよく通すのは、どの金属にも共通する性質です。',
        hint: '10 円玉をみがくと、ぴかぴかになるね。',
      }),
      fill({
        id: 'substance-mp1-p5', concept: 'su-organic',
        prompt: 'プラスチックの性質として、あてはまるものと、あてはまらないものを選ぼう。',
        text: 'ア 軽い → [b1]。イ さびない → [b2]。ウ 電気をよく通す → [b3]。エ 形をつくりやすい（加工しやすい） → [b4]。オ 酸やアルカリに強い → [b5]。',
        blanks: [
          word('b1', ['あてはまる', 'あてはまらない'], 'あてはまる'),
          word('b2', ['あてはまる', 'あてはまらない'], 'あてはまる'),
          word('b3', ['あてはまる', 'あてはまらない'], 'あてはまらない'),
          word('b4', ['あてはまる', 'あてはまらない'], 'あてはまる'),
          word('b5', ['あてはまる', 'あてはまらない'], 'あてはまる'),
        ],
        explanation: 'プラスチックは軽く、さびず、加工しやすく、酸やアルカリに強い物質です。電気は通しにくいので、電気のコードを包むのにも使われます。',
        hint: '電気のコードのまわりは、何でできているかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'substance-mp1-r1', concept: 'su-organic',
        prompt: '食塩・砂糖・デンプン（小麦粉）を見た目でくらべました。色はどうだった？',
        options: ['どれも白い', '食塩だけ黒い', '砂糖だけ赤い'],
        answer: 'a',
        explanation: '3 つともよく似た白い粉なので、見た目だけでは区別できません。水へのとけ方や、熱したときのようすを調べて見分けます。',
        hint: 'このプリントの題は「白い粉」だったね。',
      }),
      choice({
        id: 'substance-mp1-r2', concept: 'su-organic',
        prompt: '熱すると黒くこげたことから、食塩・砂糖・デンプンのうち有機物といえるのはどれ？',
        options: ['食塩だけ', '砂糖とデンプン', '3 つすべて'],
        answer: 'b',
        explanation: '黒くこげた砂糖とデンプンは、炭素をふくむ有機物です。こげなかった食塩は無機物です。',
        hint: '黒くこげた物質には、何がふくまれていたかな。',
      }),
      choice({
        id: 'substance-mp1-r3', concept: 'su-organic',
        prompt: '砂糖・デンプンのほかに、有機物の例として正しいものはどれ？',
        options: ['食塩', '鉄', 'ロウ', 'ガラス'],
        answer: 'c',
        explanation: 'ロウは燃えると二酸化炭素ができる有機物です。ほかにエタノール、木、紙、プラスチックも有機物です。食塩・鉄・ガラスは無機物です。',
        hint: '火をつけると燃えて、炭素をふくむものはどれかな。',
      }),
      choice({
        id: 'substance-mp1-r4', concept: 'su-organic',
        prompt: 'プラスチックは、主に何を原料にしてつくられている？',
        options: ['石油', '鉄鉱石', '食塩'],
        answer: 'a',
        explanation: 'プラスチックは、石油を精製してとり出した物質を原料にしてつくられます。そのため有機物で、燃やすと二酸化炭素が出ます。',
        hint: 'ガソリンや灯油と同じ原料だよ。',
      }),
      choice({
        id: 'substance-mp1-r5', concept: 'su-organic',
        prompt: 'プラスチックのごみを燃やすときに注意が必要なのはなぜ？',
        options: ['燃やすと有毒な気体が出るものがあるから', '燃やすと金属にかわるから', '燃やすと水だけが出るから'],
        answer: 'a',
        explanation: 'ポリ塩化ビニルのように、燃やすと有毒な気体が出るプラスチックがあります。また、燃やすと二酸化炭素も出ます。分別して処理することが大切です。',
        hint: '種類によっては、燃やしたときに体に悪い気体が出るよ。',
      }),
      fill({
        id: 'substance-mp1-r6', concept: 'su-organic',
        prompt: '身のまわりの物に、多く使われているプラスチックを選ぼう。',
        text: '消しゴム → [b1]。CD ケース → [b2]。バケツ → [b3]。',
        blanks: [
          word('b1', ['ポリ塩化ビニル', 'ポリスチレン', 'ポリエチレン'], 'ポリ塩化ビニル'),
          word('b2', ['ポリ塩化ビニル', 'ポリスチレン', 'ポリエチレン'], 'ポリスチレン'),
          word('b3', ['ポリ塩化ビニル', 'ポリスチレン', 'ポリエチレン'], 'ポリエチレン'),
        ],
        explanation: '消しゴムにはポリ塩化ビニル（PVC）、CD ケースには透明でかたいポリスチレン（PS）、バケツにはじょうぶなポリエチレン（PE）がよく使われます。製品によってちがうこともあります。',
        hint: 'CD ケースは透明でかたい、バケツは少しやわらかくてじょうぶだね。',
      }),
      choice({
        id: 'substance-mp1-r7', concept: 'su-metal',
        prompt: '次のうち、金属ではないものはどれ？',
        options: ['鉄', '銅', 'アルミニウム', 'ガラス'],
        answer: 'd',
        explanation: '鉄・銅・アルミニウムは金属です。ガラスはみがいても金属光沢がなく、電気を通さないので金属ではありません。',
        hint: '電気を通すかどうかで考えよう。',
      }),
      choice({
        id: 'substance-mp1-t2', concept: 'su-metal', term: true,
        prompt: '次の説明に合う言葉はどれ？「みがくと光り、電気をよく通し、熱をよく伝える物質のなかま」',
        options: ['有機物', '金属', 'プラスチック'],
        answer: 'b',
        explanation: 'このような性質をもつ物質を**金属**といいます。鉄・銅・アルミニウムなどがあります。',
        hint: '10 円玉やなべの材料のなかまだよ。',
      }),
    ],
  };

  // ---- ステージ substance-mp2: プリント 2（上皿てんびん・メスシリンダー） ----
  const substanceMp2 = {
    id: 'substance-mp2', areaId: 'substance-miniprint', title: 'プリント 2: 上皿てんびんとメスシリンダー', minutes: 6, concepts: ['su-measure'],
    lessons: [
      {
        id: 'substance-mp2-c1',
        text: '**上皿てんびん**は水平な台に置き、針が左右に等しくふれるように**調節ねじ**で合わせてから使います。分銅は重いものからのせ、重すぎたら次に軽いものにかえます。使い終わったら皿を一方に重ねます。',
        figure: balanceScene(false),
      },
      {
        id: 'substance-mp2-c2',
        text: '**メスシリンダー**は液体の体積を測る器具です。水平な台に置き、液面のへこんだ所を真横から見て、1 目盛りの 10 分の 1 まで読みます。100 mL 用では、ふつう 1 目盛りが 1 mL です。',
        figure: meniscusScene(false),
      },
    ],
    warmup: choice({
      id: 'substance-mp2-w1', concept: 'su-measure',
      prompt: '予想しよう。メスシリンダーに入れた水の液面を真横から見ると、どんな形をしていると思う？',
      options: ['まん中がへこんでいる', 'まん中が盛り上がっている', 'まっすぐで平ら'],
      answer: 'a',
      explanation: '水の液面は、ガラスにふれているふちが少し上がり、まん中がへこんでいます。目盛りは、このへこんだ所で読みます。',
      hint: 'コップの水のふちを、真横からよく見てみよう。',
    }),
    problems: [
      figureChoice({
        id: 'substance-mp2-p1', concept: 'su-measure',
        prompt: '上皿てんびんで、皿に何ものせないで、つり合いを合わせるときに回す部分（調節ねじ）はア〜ウのどれ？',
        figure: balanceScene(true),
        answer: 'r3',
        explanation: 'うでの両はしにあるのが調節ねじです。使う前に、皿に何ものせないで、針が左右に等しくふれるように調節ねじを回して合わせます。アは皿、イは針です。',
        hint: 'うでのはしにある、小さなねじをさがそう。',
      }),
      fill({
        id: 'substance-mp2-t1', concept: 'su-measure', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '液体の体積を測る器具を[b1]という。物体の質量を、分銅とつり合わせて測る器具を[b2]という。',
        blanks: [
          word('b1', ['メスシリンダー', '上皿てんびん', 'ビーカー'], 'メスシリンダー'),
          word('b2', ['メスシリンダー', '上皿てんびん', 'ビーカー'], '上皿てんびん'),
        ],
        explanation: '体積は**メスシリンダー**、質量は**上皿てんびん**で測ります。ビーカーの目盛りはおよその量しか分かりません。',
        hint: '「メス」は「測る」、「てんびん」はつり合いで測る道具だよ。',
      }),
      choice({
        id: 'substance-mp2-p2', concept: 'su-measure',
        prompt: '上皿てんびんの皿に何ものせないとき、左の皿が下がっていました（左が重い）。つり合わせるには、調節ねじをどちらへ動かす？',
        options: ['軽いほう（右）へ動かす', '重いほう（左）へ動かす', 'どちらへ動かしても同じ'],
        answer: 'a',
        explanation: '調節ねじを軽いほう（上がっている右）へ動かすと、右のはしが重くなって、つり合いに近づきます。針が左右に等しくふれるまで調節します。',
        hint: 'てんびんの軽いほうを、少し重くしたいね。',
      }),
      choice({
        id: 'substance-mp2-p3', concept: 'su-measure',
        prompt: '左の皿にねじをのせ、右の皿に 20 g の分銅をのせると、分銅の皿が下がりました。次にすることはどれ？',
        options: ['20 g の分銅をおろし、次に重い 10 g の分銅をのせる', '20 g の分銅の上に 10 g の分銅を足す', 'ねじを右の皿に移す'],
        answer: 'a',
        explanation: '分銅の皿が下がったのは、分銅のほうが重いからです。分銅をおろして、次に重い分銅にかえます。分銅は重いものから順にためします。',
        hint: '分銅とねじのどちらが重かったのかな。',
      }),
      fill({
        id: 'substance-mp2-p4', concept: 'su-measure',
        prompt: '空らんに入る数を入れよう。',
        text: '10 g と 5 g の分銅をのせると、分銅の皿が上がった（ねじが重い）。さらに 2 g の分銅を足すと、分銅の皿が下がった。ねじの質量は、[b1]より重く、[b2]より軽い。',
        blanks: [number('b1', 15, 0, 'g'), number('b2', 17, 0, 'g')],
        explanation: '15 g ではねじが重く、17 g では分銅が重いので、ねじは 15 g より重く 17 g より軽いことが分かります。このあと 1 g などの軽い分銅でくわしく調べます。',
        hint: '分銅の合計が何 g のときに、どちらへかたむいたか考えよう。',
      }),
      figureChoice({
        id: 'substance-mp2-p5', concept: 'su-measure',
        prompt: 'メスシリンダーの目盛りを読むとき、液面のどの高さで読む？ ア（ふちの高さ）かイ（へこんだ所の高さ）を選ぼう。',
        figure: meniscusScene(true),
        answer: 'r2',
        explanation: '液面は、ふちが少し上がり、まん中がへこんでいます。目盛りは、へこんだ所の平らな面を真横から見て読みます。',
        hint: '液面のいちばん低い、平らな所だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'substance-mp2-r1', concept: 'su-measure',
        prompt: '図のメスシリンダーの目盛りを読もう（1 目盛りは 1 mL）。',
        figure: CYLINDER_56,
        text: '液体の体積は[b1]である。',
        blanks: [number('b1', 56, 0, 'mL')],
        explanation: '液面のへこんだ所は、50 mL から 6 目盛り上なので 56 mL です。1 目盛りの 10 分の 1 まで読んで、56.0 mL と書くこともあります。',
        hint: '50 の目盛りから、へこんだ所まで何目盛りあるか数えよう。',
      }),
      choice({
        id: 'substance-mp2-r2', concept: 'su-measure',
        prompt: '100 mL 用のメスシリンダーで、10 mL ごとの太い目盛りのあいだが 10 目盛りに分かれていました。1 目盛りは何 mL？',
        options: ['0.1 mL', '1 mL', '10 mL'],
        answer: 'b',
        explanation: '10 mL を 10 に分けているので、1 目盛りは 10 ÷ 10 ＝ 1 mL です。',
        hint: '10 mL を何こに分けているかな。',
      }),
      choice({
        id: 'substance-mp2-r3', concept: 'su-measure',
        prompt: '上皿てんびんを使い終わって片づけるとき、皿はどうしておく？',
        options: ['皿を一方に重ねておく', '両方の皿に分銅をのせておく', '皿を外して水で洗っておく'],
        answer: 'a',
        explanation: '皿を一方に重ねておくと、うでが動かず、支えの部分がいたみにくくなります。分銅はピンセットで箱にもどします。',
        hint: 'うでがゆれ続けないようにするには？',
      }),
      choice({
        id: 'substance-mp2-r4', concept: 'su-measure',
        prompt: 'メスシリンダーで、液体の体積のほかに何が分かる？ メスシリンダーが測る量として正しいものを選ぼう。',
        options: ['液体の体積', '液体の質量', '液体の温度'],
        answer: 'a',
        explanation: 'メスシリンダーは液体の体積を測る器具です。質量は上皿てんびんや電子てんびん、温度は温度計で測ります。',
        hint: '目盛りの単位は mL だね。',
      }),
      choice({
        id: 'substance-mp2-t2', concept: 'su-measure', term: true,
        prompt: '次の説明に合う言葉はどれ？「物体の質量を、分銅とつり合わせて測る器具」',
        options: ['メスシリンダー', '上皿てんびん', '調節ねじ'],
        answer: 'b',
        explanation: '**上皿てんびん**は、物体と分銅をつり合わせて質量を測ります。',
        hint: '皿が 2 つある器具だよ。',
      }),
    ],
  };

  // ---- ステージ substance-mp3: プリント 3（密度・密度 2） ----
  const substanceMp3 = {
    id: 'substance-mp3', areaId: 'substance-miniprint', title: 'プリント 3: 密度の計算', minutes: 6, concepts: ['su-density'],
    lessons: [
      {
        id: 'substance-mp3-c1',
        text: '物質 1 cm³ あたりの質量を**密度**といい、密度〔g/cm³〕＝ 質量〔g〕÷ 体積〔cm³〕で求めます。単位 g/cm³ は「**グラム毎立方センチメートル**」と読みます。',
        figure: scene([
          { type: 'text', x: 160, y: 70, text: '密度 ＝ 質量 ÷ 体積', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 120, text: '〔g/cm³〕 〔g〕 〔cm³〕', size: 15, anchor: 'middle' },
          { type: 'text', x: 160, y: 180, text: '例: 160 g ÷ 20 cm³ ＝ 8 g/cm³', size: 15, anchor: 'middle' },
        ]),
      },
      {
        id: 'substance-mp3-c2',
        text: '体積が同じ 5 cm³ の金属でも、鉄・銅・アルミニウムでは質量がちがいます。密度は物質ごとに決まっているので、**密度**を求めると物質を見分ける手がかりになります。',
        figure: metals5('？ g', false),
      },
    ],
    warmup: choice({
      id: 'substance-mp3-w1', concept: 'su-density',
      prompt: '予想しよう。同じ 5 cm³ の鉄とアルミニウムでは、どちらの質量が大きいと思う？',
      options: ['鉄', 'アルミニウム', '同じ'],
      answer: 'a',
      explanation: '鉄のほうが質量が大きいです。同じ体積でも物質によって質量がちがい、それを表すのが密度です。',
      hint: '1 円玉（アルミニウム）は、とても軽いね。',
    }),
    problems: [
      fill({
        id: 'substance-mp3-p1', concept: 'su-density',
        prompt: '密度を求める式をつくろう。',
        text: '密度〔g/cm³〕＝ [b1]〔g〕÷ [b2]〔cm³〕',
        blanks: [
          word('b1', ['質量', '体積'], '質量'),
          word('b2', ['質量', '体積'], '体積'),
        ],
        explanation: '密度は 1 cm³ あたりの質量なので、質量を体積でわって求めます。単位 g/cm³ の「/」は「÷」と同じ意味です。',
        hint: '単位 g/cm³ を見ると、何を何でわるか分かるよ。',
      }),
      fill({
        id: 'substance-mp3-t1', concept: 'su-density', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物質 1 cm³ あたりの質量を[b1]という。その単位 g/cm³ は「[b2]」と読む。',
        blanks: [
          word('b1', ['密度', '質量', '体積'], '密度'),
          word('b2', ['グラム毎立方センチメートル', 'グラムかける立方センチメートル', '立方センチメートル毎グラム'], 'グラム毎立方センチメートル'),
        ],
        explanation: '1 cm³ あたりの質量が**密度**です。g/cm³ は「**グラム毎立方センチメートル**」と読み、「1 cm³ ごとに何 g」という意味です。',
        hint: '「毎」は「〜ごとに」という意味だよ。',
      }),
      fill({
        id: 'substance-mp3-p2', concept: 'su-density',
        prompt: '空らんに入る数を入れよう。',
        text: '質量 160 g、体積 20 cm³ の物質の密度は[b1]である。',
        blanks: [number('b1', 8, 0, 'g/cm³')],
        explanation: '密度＝質量÷体積なので、160 ÷ 20 ＝ 8 g/cm³ です。',
        hint: '160 を 20 でわろう。',
      }),
      fill({
        id: 'substance-mp3-p3', concept: 'su-density',
        prompt: '空らんに入る数を入れよう。',
        text: '質量 40 g、体積 50 cm³ の物質の密度は[b1]である。',
        blanks: [number('b1', 0.8, 0, 'g/cm³')],
        explanation: '40 ÷ 50 ＝ 0.8 g/cm³ です。質量より体積のほうが大きいので、密度は 1 より小さくなります。この物質は水（約 1.0 g/cm³）に浮きます。',
        hint: '40 ÷ 50 は 1 より小さい数になるよ。',
      }),
      figureChoice({
        id: 'substance-mp3-p4', concept: 'su-density',
        prompt: 'ア〜ウは、どれも体積 5 cm³ の金属です。密度がいちばん大きいのはどれ？（アルミニウムは鉄より軽い）',
        figure: metals5('？ g', true),
        answer: 'r2',
        explanation: '体積が同じなら、質量が大きいほど密度が大きくなります。いちばん質量が大きいのは銅（44.8 g）なので、密度も銅がいちばん大きいです。',
        hint: '体積は同じ。質量をくらべよう。',
      }),
      fill({
        id: 'substance-mp3-p5', concept: 'su-density',
        prompt: '図の質量を使って、空らんに入る数を入れよう。',
        figure: metals5('？ g', false),
        text: '鉄の密度は[b1]、銅の密度は[b2]である。',
        blanks: [number('b1', 7.9, 0, 'g/cm³'), number('b2', 8.96, 0, 'g/cm³')],
        explanation: '鉄は 39.5 ÷ 5 ＝ 7.9 g/cm³、銅は 44.8 ÷ 5 ＝ 8.96 g/cm³ です。',
        hint: 'どちらも体積は 5 cm³。質量を 5 でわろう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'substance-mp3-r1', concept: 'su-density',
        prompt: '空らんに入る数を入れよう。',
        figure: metals5('？ g', false),
        text: 'アルミニウムの密度は 2.7 g/cm³ である。体積 5 cm³ のアルミニウムの質量は[b1]である。',
        blanks: [number('b1', 13.5, 0, 'g')],
        explanation: '質量＝密度×体積なので、2.7 × 5 ＝ 13.5 g です。密度の式を、形を変えて使います。',
        hint: '1 cm³ で 2.7 g。5 cm³ では？',
      }),
      choice({
        id: 'substance-mp3-r2', concept: 'su-density',
        prompt: '体積 5 cm³、質量 39.5 g の鉄の密度を求める式はどれ？',
        options: ['39.5 ÷ 5', '5 ÷ 39.5', '39.5 × 5'],
        answer: 'a',
        explanation: '密度＝質量÷体積なので、39.5 ÷ 5 です。答えは 7.9 g/cm³ です。',
        hint: '質量を体積でわるんだったね。',
      }),
      fill({
        id: 'substance-mp3-r3', concept: 'su-density',
        prompt: '空らんに入る数を入れよう。',
        text: '質量 54 g、体積 20 cm³ の金属の密度は[b1]である。',
        blanks: [number('b1', 2.7, 0, 'g/cm³')],
        explanation: '54 ÷ 20 ＝ 2.7 g/cm³ です。これはアルミニウムの密度と同じなので、この金属はアルミニウムと考えられます。',
        hint: '54 を 20 でわろう。',
      }),
      choice({
        id: 'substance-mp3-t2', concept: 'su-density', term: true,
        prompt: '次の説明に合う言葉はどれ？「物質 1 cm³ あたりの質量。物質ごとに決まっている」',
        options: ['体積', '密度', '重さ'],
        answer: 'b',
        explanation: '物質 1 cm³ あたりの質量を**密度**といいます。物質を見分ける手がかりになります。',
        hint: '単位が g/cm³ になる量だよ。',
      }),
    ],
  };

  // ---- ステージ substance-mp4: プリント 4（気体の集め方・二酸化炭素と酸素・酸素の発生・気体の発生について） ----
  const substanceMp4 = {
    id: 'substance-mp4', areaId: 'substance-miniprint', title: 'プリント 4: 気体の発生と集め方', minutes: 7, concepts: ['su-collection', 'su-gases'],
    lessons: [
      {
        id: 'substance-mp4-c1',
        text: '水にとけにくい気体は**水上置換法**、水にとけやすく空気より軽い気体は**上方置換法**、水にとけやすく空気より重い気体は**下方置換法**で集めます。酸素や水素は水上置換法、アンモニアは上方置換法です。',
        figure: collectPlain(),
      },
      {
        id: 'substance-mp4-c2',
        text: '**二酸化炭素**は石灰石にうすい塩酸を、**酸素**は二酸化マンガンにオキシドール（うすい過酸化水素水）を加えて発生させます。二酸化炭素は石灰水を白くにごらせ、酸素はものが燃えるのを助けます。',
        figure: scene([
          { type: 'tube', x: 80, y: 170, height: 100, level: 0.35, liquid: 'sky' },
          { type: 'circle', x: 80, y: 160, r: 7, fill: 'rock' },
          { type: 'text', x: 80, y: 200, text: '石灰石＋塩酸', size: 13, anchor: 'middle' },
          { type: 'text', x: 80, y: 224, text: '→ 二酸化炭素', size: 13, anchor: 'middle' },
          { type: 'tube', x: 240, y: 170, height: 100, level: 0.35, liquid: 'sky' },
          { type: 'circle', x: 240, y: 162, r: 6, fill: 'ink' },
          { type: 'text', x: 240, y: 200, text: '二酸化マンガン＋', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 224, text: 'オキシドール → 酸素', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'substance-mp4-c3',
        text: '**水上置換法**では、水を満たした試験管を水の中で逆さに立てておきます。はじめに出てくる気体は装置の中の空気がまざっているので集めません。集め終わったら、水の中でゴム栓をしてから取り出します。',
        figure: scene([
          { type: 'rect', x: 60, y: 110, width: 200, height: 100, fill: 'none' },
          { type: 'rect', x: 62, y: 128, width: 196, height: 80, fill: 'water', stroke: 'none' },
          { type: 'tube', x: 180, y: 50, height: 110, tilt: 180, level: 1 },
          { type: 'line', points: [[20, 80], [100, 80], [100, 190], [180, 190], [180, 166]], width: 3 },
          { type: 'text', x: 200, y: 40, text: '水を満たして逆さに', size: 13 },
          { type: 'text', x: 20, y: 232, text: 'はじめの気体は集めない', size: 13 },
        ]),
      },
    ],
    warmup: choice({
      id: 'substance-mp4-w1', concept: 'su-gases',
      prompt: '予想しよう。二酸化マンガンにオキシドールを加えると、あわが出てきました。出てきた気体は何だと思う？',
      options: ['酸素', '二酸化炭素', 'アンモニア'],
      answer: 'a',
      explanation: '二酸化マンガンにオキシドール（うすい過酸化水素水）を加えると、酸素が発生します。',
      hint: '火のついた線香を入れると、激しく燃える気体だよ。',
    }),
    problems: [
      figureChoice({
        id: 'substance-mp4-p1', concept: 'su-collection',
        prompt: 'アンモニアを集めるのに適した方法はア〜ウのどれ？（アンモニアは水にとてもとけやすく、空気より軽い）',
        figure: collectScene(),
        answer: 'r2',
        explanation: '水にとけやすく空気より軽いアンモニアは、試験管の口を下に向けて集める上方置換法（イ）で集めます。水上置換法では水にとけてしまいます。',
        hint: '空気より軽い気体は、上にたまるね。',
      }),
      fill({
        id: 'substance-mp4-t1', concept: 'su-collection', term: true,
        prompt: '図のア〜ウの集め方の名前を選ぼう。',
        figure: collectPlain(),
        text: 'アは[b1]、イは[b2]、ウは[b3]である。',
        blanks: [
          word('b1', ['水上置換法', '上方置換法', '下方置換法'], '水上置換法'),
          word('b2', ['水上置換法', '上方置換法', '下方置換法'], '上方置換法'),
          word('b3', ['水上置換法', '上方置換法', '下方置換法'], '下方置換法'),
        ],
        explanation: '水と置きかえるアが**水上置換法**、口を下に向けて上にためるイが**上方置換法**、口を上に向けて下にためるウが**下方置換法**です。',
        hint: '気体がたまる場所（水の中・上・下）から名前を考えよう。',
      }),
      choice({
        id: 'substance-mp4-p2', concept: 'su-collection',
        prompt: '上方置換法（イ）で集める気体は、どんな性質をもっている？',
        options: ['水にとけやすく、空気より軽い', '水にとけやすく、空気より重い', '水にとけにくい'],
        answer: 'a',
        explanation: '上方置換法は、水にとけやすく空気より軽い気体を集める方法です。軽い気体は試験管の上にたまっていきます。',
        hint: '試験管の口を下に向けても、にげない気体だよ。',
      }),
      figureChoice({
        id: 'substance-mp4-p3', concept: 'su-collection',
        prompt: '酸素を集めるのに最も適した方法はア〜ウのどれ？（酸素は水にとけにくい）',
        figure: collectScene(),
        answer: 'r1',
        explanation: '水にとけにくい酸素は、水上置換法（ア）で集めます。水上置換法は、空気がまざりにくく、集まった量も見えるのでよい方法です。',
        hint: '水にとけにくい気体は、水と置きかえて集められるね。',
      }),
      fill({
        id: 'substance-mp4-p4', concept: 'su-gases',
        prompt: '気体を発生させる物質の組み合わせを選ぼう。',
        text: '二酸化炭素は、[b1]に[b2]を加えて発生させる。酸素は、[b3]に[b4]を加えて発生させる。',
        blanks: [
          word('b1', ['石灰石', '亜鉛', '二酸化マンガン'], '石灰石'),
          word('b2', ['うすい塩酸', '過酸化水素水', 'エタノール'], 'うすい塩酸'),
          word('b3', ['石灰石', '亜鉛', '二酸化マンガン'], '二酸化マンガン'),
          word('b4', ['うすい塩酸', '過酸化水素水', 'エタノール'], '過酸化水素水'),
        ],
        explanation: '石灰石にうすい塩酸を加えると二酸化炭素、二酸化マンガンに過酸化水素水（オキシドール）を加えると酸素が発生します。亜鉛にうすい塩酸を加えると水素が発生します。',
        hint: '貝がらや石灰石に塩酸をかけると、あわが出るね。',
      }),
      fill({
        id: 'substance-mp4-p5', concept: 'su-gases',
        prompt: '酸素を集めた試験管で調べよう。',
        text: '酸素を集めた試験管に水を 3 分の 1 ほど入れ、ゴム栓をしてよくふった。水の中で栓をとってまた栓をし、取り出すと、試験管の中の水の量は[b1]。このことから、酸素は水に[b2]。',
        blanks: [
          word('b1', ['増えた', '減った', 'ほとんど変わらなかった'], 'ほとんど変わらなかった'),
          word('b2', ['とけやすいといえる', 'とけやすいとはいえない'], 'とけやすいとはいえない'),
        ],
        explanation: '酸素は水にとけにくいので、ふっても気体はほとんど減らず、水の量はほとんど変わりません。気体がたくさんとけると、そのぶん水が入りこんで水が増えます。',
        hint: '気体が水にとけて減ると、水が入ってくるよ。酸素はどうかな。',
      }),
    ],
    retryPool: [
      fill({
        id: 'substance-mp4-r1', concept: 'su-gases',
        prompt: '二酸化炭素の性質を選ぼう。',
        text: '二酸化炭素は[b1]で、空気より[b2]。水に少しとけ、その水溶液は[b3]を示す。石灰水を[b4]。',
        blanks: [
          word('b1', ['無色・無臭', '黄緑色・刺激臭'], '無色・無臭'),
          word('b2', ['重い', '軽い'], '重い'),
          word('b3', ['酸性', 'アルカリ性'], '酸性'),
          word('b4', ['白くにごらせる', '変化させない'], '白くにごらせる'),
        ],
        explanation: '二酸化炭素は無色・無臭で空気より重く、水に少しとけて酸性を示します。石灰水を白くにごらせるのが、二酸化炭素を確かめる方法です。',
        hint: '炭酸水は二酸化炭素がとけた水だね。',
      }),
      fill({
        id: 'substance-mp4-r2', concept: 'su-gases',
        prompt: '酸素の性質を選ぼう。',
        text: '酸素は[b1]で、空気より少し[b2]。水に[b3]。ほかのものが燃えるのを[b4]はたらきがある。',
        blanks: [
          word('b1', ['無色・無臭', '黄緑色・刺激臭'], '無色・無臭'),
          word('b2', ['重い', '軽い'], '重い'),
          word('b3', ['とけにくい', 'とけやすい'], 'とけにくい'),
          word('b4', ['助ける', '止める'], '助ける'),
        ],
        explanation: '酸素は無色・無臭で、空気より少し重く、水にとけにくい気体です。酸素そのものは燃えませんが、ほかのものが燃えるのを助けます。',
        hint: '酸素の中に火のついた線香を入れると、どうなるかな。',
      }),
      choice({
        id: 'substance-mp4-r3', concept: 'su-gases',
        prompt: '酸素を集めた試験管に、火のついた線香を入れました。線香はどうなる？',
        options: ['すぐに火が消える', '炎を上げて激しく燃える', 'ポンと音を立てて気体が燃える'],
        answer: 'b',
        explanation: '酸素にはものが燃えるのを助けるはたらきがあるので、線香は炎を上げて激しく燃えます。ポンと音を立てて燃えるのは水素です。',
        hint: '酸素は「ものが燃えるのを助ける」気体だったね。',
      }),
      choice({
        id: 'substance-mp4-r4', concept: 'su-collection',
        prompt: '水上置換法で気体を集めるとき、気体を集める試験管は、はじめにどうしておく？',
        options: ['水を満たして、水そうの中で逆さに立てておく', '空のまま口を上に向けておく', '石灰水を入れておく'],
        answer: 'a',
        explanation: '試験管に水を満たして逆さに立てておくと、出てきた気体が水を押し出して、試験管にたまります。',
        hint: '気体と「水」を置きかえる方法だよ。',
      }),
      choice({
        id: 'substance-mp4-r5', concept: 'su-collection',
        prompt: '気体を発生させたとき、はじめに出てくる気体は集めません。なぜ？',
        options: ['装置の中にあった空気が多くまざっているから', 'はじめの気体は水にとけてしまうから', 'はじめの気体は色がついているから'],
        answer: 'a',
        explanation: 'はじめに出てくるのは、三角フラスコやガラス管の中にあった空気を多くふくむ気体です。発生した気体だけを集めるため、しばらく出してから集めます。',
        hint: '気体が出る前、フラスコの中には何が入っていたかな。',
      }),
      choice({
        id: 'substance-mp4-r6', concept: 'su-collection',
        prompt: '水上置換法で気体を集め終わりました。試験管を水そうから取り出す前にすることはどれ？',
        options: ['水の中でゴム栓をする', '試験管をふって気体をにがす', '試験管を熱する'],
        answer: 'a',
        explanation: '水の中でゴム栓をすると、集めた気体がにげず、空気も入りません。栓をしてから水そうから取り出します。',
        hint: '集めた気体をにがさないためには？',
      }),
      choice({
        id: 'substance-mp4-t2', concept: 'su-collection', term: true,
        prompt: '次の説明に合う言葉はどれ？「水にとけにくい気体を、水と置きかえて集める方法」',
        options: ['水上置換法', '上方置換法', '下方置換法'],
        answer: 'a',
        explanation: '水と置きかえて集める方法を**水上置換法**といいます。酸素や水素を集めるのに使います。',
        hint: '「水の上で置きかえる」と書く方法だよ。',
      }),
    ],
  };

  // ---- ステージ substance-mp5: プリント 5（気体の性質まとめ・水素とアンモニア・アンモニア噴水実験・いろいろな気体） ----
  const substanceMp5 = {
    id: 'substance-mp5', areaId: 'substance-miniprint', title: 'プリント 5: いろいろな気体の性質', minutes: 7, concepts: ['su-gases'],
    lessons: [
      {
        id: 'substance-mp5-c1',
        text: '**水素**は亜鉛にうすい塩酸を加えると発生し、最も軽い気体で、火をつけると音を立てて燃えます。**アンモニア**は塩化アンモニウムと水酸化カルシウムを混ぜて熱すると発生し、刺激臭があり水にとてもよくとけます。',
        figure: scene([
          { type: 'text', x: 80, y: 40, text: '水素', size: 18, anchor: 'middle', bold: true },
          { type: 'text', x: 80, y: 72, text: '亜鉛＋塩酸', size: 13, anchor: 'middle' },
          { type: 'text', x: 80, y: 100, text: '最も軽い', size: 13, anchor: 'middle' },
          { type: 'text', x: 80, y: 128, text: '音を立てて燃える', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 40, text: 'アンモニア', size: 18, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 72, text: '塩化アンモニウム＋', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 92, text: '水酸化カルシウム', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 120, text: '刺激臭・水によくとける', size: 13, anchor: 'middle' },
          { type: 'text', x: 240, y: 148, text: '水溶液はアルカリ性', size: 13, anchor: 'middle' },
          { type: 'line', points: [[160, 20], [160, 160]], color: 'gray', width: 1 },
          { type: 'text', x: 160, y: 210, text: 'どちらも空気より軽い', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'substance-mp5-c2',
        text: 'アンモニアを満たしたフラスコに少し水を入れると、アンモニアが水にとけてフラスコの中の気体が減り、ビーカーの水が吸い上げられて**噴水**になります。フェノールフタレイン溶液を入れた水は、赤い噴水になります。',
        figure: scene([
          { type: 'circle', x: 160, y: 70, r: 50, fill: 'white' },
          { type: 'line', points: [[160, 76], [160, 196]], width: 3 },
          { type: 'line', points: [[160, 76], [140, 50]], color: 'red', width: 3 },
          { type: 'line', points: [[160, 76], [180, 50]], color: 'red', width: 3 },
          { type: 'line', points: [[160, 76], [160, 42]], color: 'red', width: 3 },
          { type: 'circle', x: 136, y: 44, r: 4, fill: 'red', stroke: 'red' },
          { type: 'circle', x: 184, y: 44, r: 4, fill: 'red', stroke: 'red' },
          { type: 'circle', x: 160, y: 34, r: 4, fill: 'red', stroke: 'red' },
          { type: 'beaker', x: 160, y: 228, width: 110, height: 50, level: 0.7 },
          { type: 'text', x: 220, y: 40, text: 'アンモニア', size: 13 },
          { type: 'text', x: 220, y: 110, text: '赤い噴水', size: 13 },
          { type: 'text', x: 10, y: 200, text: 'フェノール', size: 12 },
          { type: 'text', x: 10, y: 216, text: 'フタレイン入りの水', size: 12 },
        ]),
      },
      {
        id: 'substance-mp5-c3',
        text: '身のまわりの気体として、漂白剤と酸性の洗剤を混ぜると出る有毒な**塩素**、風船に入れる軽い**ヘリウム**、ガスボンベで使うプロパン、不完全燃焼で出る有毒な一酸化炭素などがあります。',
        figure: scene([
          { type: 'ellipse', x: 70, y: 70, rx: 34, ry: 42, fill: 'pink' },
          { type: 'line', points: [[70, 112], [74, 190]], color: 'gray', width: 2 },
          { type: 'text', x: 70, y: 214, text: 'ヘリウム', size: 14, anchor: 'middle' },
          { type: 'rect', x: 140, y: 80, width: 50, height: 110, fill: 'gray', rx: 14 },
          { type: 'text', x: 165, y: 214, text: 'プロパン', size: 14, anchor: 'middle' },
          { type: 'text', x: 210, y: 70, text: 'まぜるな', size: 14, bold: true },
          { type: 'text', x: 210, y: 92, text: '危険', size: 14, bold: true },
          { type: 'text', x: 210, y: 130, text: '→ 塩素', size: 14 },
        ]),
      },
    ],
    warmup: choice({
      id: 'substance-mp5-w1', concept: 'su-gases',
      prompt: '予想しよう。次の気体のうち、空気より軽いのはどれだと思う？',
      options: ['二酸化炭素', '水素', '酸素'],
      answer: 'b',
      explanation: '水素は最も軽い気体で、空気よりずっと軽いです。二酸化炭素と酸素は空気より重い気体です。',
      hint: '風船に入れると、ふわふわと上がっていく気体だよ。',
    }),
    problems: [
      fill({
        id: 'substance-mp5-p1', concept: 'su-gases',
        prompt: '二酸化炭素・酸素・水素・アンモニア・窒素から選ぼう。',
        text: 'においがある気体は[b1]である。水溶液が酸性になる気体は[b2]、水溶液がアルカリ性になる気体は[b3]である。',
        blanks: [
          word('b1', ['二酸化炭素', '酸素', '水素', 'アンモニア', '窒素'], 'アンモニア'),
          word('b2', ['二酸化炭素', '酸素', '水素', 'アンモニア', '窒素'], '二酸化炭素'),
          word('b3', ['二酸化炭素', '酸素', '水素', 'アンモニア', '窒素'], 'アンモニア'),
        ],
        explanation: 'アンモニアは刺激臭があり、水溶液はアルカリ性です。二酸化炭素の水溶液（炭酸水）は酸性です。酸素・水素・窒素は無色・無臭で、水にとけにくい気体です。',
        hint: 'トイレのようなツンとするにおいの気体は？',
      }),
      fill({
        id: 'substance-mp5-t1', concept: 'su-gases', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '亜鉛にうすい塩酸を加えると[b1]が発生する。塩化アンモニウムと水酸化カルシウムを混ぜて熱すると[b2]が発生する。',
        blanks: [
          word('b1', ['水素', 'アンモニア', '酸素', '二酸化炭素'], '水素'),
          word('b2', ['水素', 'アンモニア', '酸素', '二酸化炭素'], 'アンモニア'),
        ],
        explanation: '亜鉛＋うすい塩酸で**水素**、塩化アンモニウム＋水酸化カルシウムを熱すると**アンモニア**が発生します。',
        hint: '「アンモニウム」をふくむ物質から出る気体は？',
      }),
      figureChoice({
        id: 'substance-mp5-p2', concept: 'su-gases',
        prompt: '3 本の試験管に、それぞれ気体が入っています。水を少し入れてゴム栓をしてふると、気体がほとんど水にとけてしまうのはア〜ウのどれ？',
        figure: threeGasTubes('水を少し入れてふる', ['酸素', 'アンモニア', '水素']),
        answer: 'r2',
        explanation: 'アンモニアは水にとてもよくとけるので、ふるとほとんどとけてしまいます。酸素と水素は水にとけにくい気体です。',
        hint: '噴水の実験に使う気体はどれかな。',
      }),
      choice({
        id: 'substance-mp5-p3', concept: 'su-gases',
        prompt: 'アンモニアを満たしたフラスコに少し水を入れると、ビーカーの水が吸い上げられて噴水になりました。これは、アンモニアのどんな性質によるもの？',
        options: ['水にとてもとけやすい', '空気より重い', '燃えやすい'],
        answer: 'a',
        explanation: 'アンモニアが水にとけてフラスコの中の気体が減り、中の圧力が下がるので、ビーカーの水が吸い上げられて噴水になります。',
        hint: 'フラスコの中のアンモニアは、水を入れるとどうなるかな。',
      }),
      fill({
        id: 'substance-mp5-p4', concept: 'su-gases',
        prompt: 'アンモニアの噴水の色を考えよう。',
        text: 'ビーカーの水にフェノールフタレイン溶液を入れておくと、噴水は[b1]色になる。アンモニアの水溶液が[b2]だからである。水を、緑色にした BTB 溶液にかえて同じ実験をすると、噴水は[b3]色になる。',
        blanks: [
          word('b1', ['赤', '青', '黄', '無'], '赤'),
          word('b2', ['酸性', '中性', 'アルカリ性'], 'アルカリ性'),
          word('b3', ['赤', '青', '黄', '緑'], '青'),
        ],
        explanation: 'アンモニアの水溶液はアルカリ性です。フェノールフタレイン溶液はアルカリ性で赤色、BTB 溶液はアルカリ性で青色になります。',
        hint: 'BTB 溶液は、酸性で黄色、中性で緑色、アルカリ性で何色かな。',
      }),
      fill({
        id: 'substance-mp5-p5', concept: 'su-gases',
        prompt: '身のまわりの気体の名前を選ぼう。',
        text: '「まぜるな危険」の漂白剤と酸性の洗剤を混ぜると発生する有毒な気体は[b1]。風船に入れたり、吸うと声が高くなったりする軽い気体は[b2]。不完全燃焼で出る、中毒を起こす気体は[b3]。',
        blanks: [
          word('b1', ['塩素', 'ヘリウム', '一酸化炭素', 'プロパン'], '塩素'),
          word('b2', ['塩素', 'ヘリウム', '一酸化炭素', 'プロパン'], 'ヘリウム'),
          word('b3', ['塩素', 'ヘリウム', '一酸化炭素', 'プロパン'], '一酸化炭素'),
        ],
        explanation: '漂白剤と酸性の洗剤を混ぜると有毒な**塩素**が出るので、絶対に混ぜてはいけません。風船には**ヘリウム**、不完全燃焼で出るのは一酸化炭素です。',
        hint: 'プールの消毒のようなにおいの気体、風船の気体、を思い出そう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'substance-mp5-r1', concept: 'su-gases',
        prompt: '二酸化炭素・酸素・水素・アンモニア・窒素のうち、空気より軽い気体の組み合わせはどれ？',
        options: ['水素とアンモニア', '二酸化炭素と酸素', '酸素と窒素'],
        answer: 'a',
        explanation: '水素とアンモニアは空気より軽い気体です。二酸化炭素と酸素は空気より重く、窒素は空気とほぼ同じ（少し軽い）です。',
        hint: '上方置換法や、風船で上がる気体を思い出そう。',
      }),
      choice({
        id: 'substance-mp5-r2', concept: 'su-gases',
        prompt: '二酸化炭素・酸素・水素・アンモニア・窒素のうち、水にとける気体の組み合わせはどれ？',
        options: ['酸素と水素', '二酸化炭素とアンモニア', '窒素と酸素'],
        answer: 'b',
        explanation: 'アンモニアは水にとてもよくとけ、二酸化炭素も水に少しとけます。酸素・水素・窒素は水にとけにくい気体です。',
        hint: '水溶液が酸性やアルカリ性になる気体は、水にとけるね。',
      }),
      fill({
        id: 'substance-mp5-r3', concept: 'su-gases',
        prompt: '水素の性質を選ぼう。',
        text: '水素は[b1]で、空気より[b2]。水に[b3]。火をつけると[b4]。',
        blanks: [
          word('b1', ['無色・無臭', '刺激臭がある'], '無色・無臭'),
          word('b2', ['軽い', '重い'], '軽い'),
          word('b3', ['とけにくい', 'とけやすい'], 'とけにくい'),
          word('b4', ['音を立てて燃える', 'すぐに消える'], '音を立てて燃える'),
        ],
        explanation: '水素は無色・無臭で、最も軽い気体です。水にとけにくく、火をつけるとポンと音を立てて燃え、水ができます。',
        hint: '水素が燃えると、何ができるかな。',
      }),
      fill({
        id: 'substance-mp5-r4', concept: 'su-gases',
        prompt: 'アンモニアの性質を選ぼう。',
        text: 'アンモニアは[b1]があり、空気より[b2]。水に[b3]、水溶液は[b4]を示す。からだには[b5]である。',
        blanks: [
          word('b1', ['刺激臭', 'あまいにおい'], '刺激臭'),
          word('b2', ['軽い', '重い'], '軽い'),
          word('b3', ['とてもとけやすく', 'とけにくく'], 'とてもとけやすく'),
          word('b4', ['アルカリ性', '酸性'], 'アルカリ性'),
          word('b5', ['有毒', '無害'], '有毒'),
        ],
        explanation: 'アンモニアは刺激臭のある有毒な気体で、空気より軽く、水にとてもとけやすく、水溶液はアルカリ性です。においをかぐときは、手であおぐようにします。',
        hint: '上方置換法で集めた気体だね。',
      }),
      choice({
        id: 'substance-mp5-r5', concept: 'su-gases',
        prompt: '都市ガスが来ていない地域で、家庭用のガスボンベに入れて使われることが多い気体はどれ？',
        options: ['プロパン', 'ヘリウム', '塩素'],
        answer: 'a',
        explanation: 'ガスボンベには、プロパン（LP ガス）がよく使われます。プロパンは燃えやすい気体です。',
        hint: '「LP ガス」ともよばれる気体だよ。',
      }),
      choice({
        id: 'substance-mp5-t2', concept: 'su-gases', term: true,
        prompt: '次の説明に合う言葉はどれ？「漂白剤と酸性の洗剤を混ぜると発生する、黄緑色で刺激臭のある有毒な気体」',
        options: ['塩素', 'ヘリウム', '水素'],
        answer: 'a',
        explanation: 'この気体は**塩素**です。プールの消毒のようなツンとしたにおい（刺激臭）があり、とても危険です。',
        hint: '「まぜるな危険」の表示を思い出そう。',
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
        // ミニプリント「金属の性質」(5) のあふれた分
        fill({
          id: 'su-metal-k4', concept: 'su-metal',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '金属は、たたくとうすく[b1]、引っぱると細く[b2]性質がある。',
          blanks: [
            word('b1', ['広がり', 'くだけ', 'とけ'], '広がり'),
            word('b2', ['のびる', 'ちぢむ', 'こげる'], 'のびる'),
          ],
          explanation: '金属は、たたくとうすく広がり（アルミニウムはく）、引っぱると細くのびます（銅線）。この性質で、いろいろな形に加工できます。',
          hint: 'アルミニウムはくや、細い銅線を思い出そう。',
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
        // ミニプリント「いろいろな気体」(2) のあふれた分
        choice({
          id: 'su-gases-k4', concept: 'su-gases',
          prompt: '漂白剤と酸性の洗剤を混ぜると発生する塩素は、どんなにおいがする？',
          options: ['においはない', 'プールの消毒のような、ツンとする刺激臭', 'あまいにおい'],
          answer: 'b',
          explanation: '塩素には、プールの消毒のようなツンとする刺激臭があります。有毒なので、においをかいではいけません。家庭でも「まぜるな危険」の洗剤は混ぜないようにします。',
          hint: 'プールの水のにおいを思い出そう。',
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
      { id: 'substance-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [substanceMp1, substanceMp2, substanceMp3, substanceMp4, substanceMp5] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
