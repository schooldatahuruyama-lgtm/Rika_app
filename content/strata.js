// 「地層と大地の変化」教材データ（中学1年 理科・地学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（地層のでき方: 風化・侵食・運搬・堆積、堆積岩 / 地層から読み取る: 化石、柱状図と大地の変動）と、概念 6 つ。
// 概念 id は全単元で一意にするため、接頭辞 st- を付ける。
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

  const MUD = '#C9A27E';     // 泥・泥岩（brown より明るくして、上の文字を読みやすくする）
  const FLOOR = '#D8D2C6';   // 海底の地面
  const r1 = (v) => Math.round(v * 10) / 10;

  // 山から海までの断面。川は山の上から平地を通って海へ流れる。陸の地表は折れ線 LAND_TOP、海面は y=138
  const LAND_TOP = [[0, 40], [30, 44], [80, 94], [130, 122], [200, 138]];
  function riverItems() {
    return [
      { type: 'rect', x: 200, y: 138, width: 120, height: 102, fill: 'water', stroke: 'none' },
      { type: 'polygon', points: [[200, 150], [320, 196], [320, 240], [200, 240]], fill: FLOOR, stroke: 'none' },
      { type: 'polygon', points: LAND_TOP.concat([[200, 240], [0, 240]]), fill: 'lightgreen', stroke: 'none' },
      { type: 'line', points: LAND_TOP, color: 'line', width: 2 },
      { type: 'line', points: [[200, 150], [320, 196]], color: 'line', width: 2 },
      { type: 'line', points: [[200, 138], [320, 138]], color: 'blue', width: 2 },
      { type: 'line', points: [[10, 45], [32, 48], [80, 98], [130, 126], [198, 141]], color: 'blue', width: 4, arrow: true },
    ];
  }

  // 河口から沖までの海の断面。海面は y=70、海底は (60,110) から (320,200) へ下がる
  function seaItems() {
    return [
      { type: 'rect', x: 60, y: 70, width: 260, height: 170, fill: 'water', stroke: 'none' },
      { type: 'polygon', points: [[60, 110], [320, 200], [320, 240], [60, 240]], fill: FLOOR, stroke: 'none' },
      { type: 'polygon', points: [[0, 58], [60, 70], [60, 240], [0, 240]], fill: 'lightgreen', stroke: 'none' },
      { type: 'line', points: [[0, 58], [60, 70]], color: 'line', width: 2 },
      { type: 'line', points: [[60, 70], [320, 70]], color: 'blue', width: 2 },
      { type: 'line', points: [[60, 110], [320, 200]], color: 'line', width: 2 },
      { type: 'arrow', x1: 6, y1: 48, x2: 76, y2: 60, color: 'blue' },
      { type: 'text', x: 8, y: 36, text: '川', size: 14 },
      { type: 'text', x: 70, y: 232, text: '河口の近く', size: 12 },
      { type: 'text', x: 314, y: 232, text: '沖', size: 12, anchor: 'end' },
    ];
  }
  // 岩石の粒のようす（80×80 の枠。左上 (x0, y0)）。kind は 'gravel' | 'sand' | 'mud' | 'tuff'
  // gravel: 大きく丸い粒／sand: 小さく丸い粒／mud: とても細かい粒／tuff: 角ばった粒
  const GRAVEL_DOTS = [[18, 18, 11], [50, 15, 10], [66, 42, 11], [32, 44, 10], [54, 66, 11], [16, 68, 10]];
  const SAND_DOTS = [10, 25, 40, 55, 70].flatMap((y, j) => [10, 25, 40, 55, 70].map(x => [x + (j % 2 ? 3 : 0), y, 5]));
  const MUD_DOTS = [8, 19, 30, 41, 52, 63, 74].flatMap(y => [8, 19, 30, 41, 52, 63, 74].map(x => [x, y, 2.5]));
  const TUFF_SHAPES = [
    [[6, 10], [22, 6], [18, 22]], [[30, 8], [46, 14], [40, 26], [28, 20]], [[56, 6], [74, 12], [64, 24]],
    [[8, 34], [24, 30], [28, 46], [12, 48]], [[36, 36], [52, 32], [48, 50]], [[60, 34], [74, 40], [70, 54], [58, 48]],
    [[6, 60], [20, 56], [24, 72], [10, 74]], [[32, 58], [48, 62], [40, 76]], [[56, 62], [72, 58], [74, 74], [58, 74]],
  ];
  const GRAIN_FILL = { gravel: 'rock', sand: 'sand', mud: MUD, tuff: '#E9DFB4' };
  // grainFill を指定すると、どの粒も同じ色にする（選ぶ問題で、色が答えの手がかりにならないように）
  function textureBox(x0, y0, kind, grainFill) {
    const items = [{ type: 'rect', x: x0, y: y0, width: 80, height: 80, fill: 'white' }];
    const fillName = grainFill || GRAIN_FILL[kind];
    if (kind === 'tuff') {
      TUFF_SHAPES.forEach(ps => items.push({ type: 'polygon', points: ps.map(([x, y]) => [x0 + x, y0 + y]), fill: fillName, stroke: 'line' }));
    } else {
      const dots = kind === 'gravel' ? GRAVEL_DOTS : kind === 'sand' ? SAND_DOTS : MUD_DOTS;
      dots.forEach(([x, y, r]) => items.push({ type: 'circle', x: x0 + x, y: y0 + y, r, fill: fillName, stroke: 'line' }));
    }
    return items;
  }
  // 粒のようすを 3 つ横に並べ、下にア・イ・ウの選ぶ場所を置く（kinds は左から）
  function textureChoiceScene(kinds) {
    const items = [{ type: 'text', x: 160, y: 30, text: '岩石をルーペで見たようす', size: 14, anchor: 'middle' }];
    kinds.forEach((kind, i) => {
      items.push(...textureBox(20 + 100 * i, 50, kind, 'rock'));
      items.push({ type: 'region', id: 'r' + (i + 1), x: 60 + 100 * i, y: 172, r: 24, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // 3 つの層に化石が入った地層の断面。names は上の層から順の化石の名前。右にア・イ・ウ
  function fossilLayersScene(names) {
    const fills = ['sand', MUD, 'rock'];
    const items = [{ type: 'text', x: 160, y: 28, text: '地層の断面（上下の逆転はない）', size: 13, anchor: 'middle' }];
    names.forEach((name, i) => {
      const y = 40 + 60 * i;
      items.push({ type: 'rect', x: 30, y, width: 260, height: 60, fill: fills[i] });
      items.push({ type: 'text', x: 44, y: y + 36, text: name + 'の化石', size: 14 });
      items.push({ type: 'region', id: 'r' + (i + 1), x: 252, y: y + 30, r: 24, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // 柱状図: 左上 (x0, y0)、幅 56。layers は上から [kind, 高さ]。
  // names: 'inside' で層の中に、'right' で柱の右に岩石の名前を書く（省くと書かない）
  const LAYER_FILL = { mud: MUD, sand: 'sand', gravel: 'rock', tuff: 'yellow', lime: 'glass' };
  const LAYER_NAME = { mud: '泥岩', sand: '砂岩', gravel: 'れき岩', tuff: '凝灰岩', lime: '石灰岩' };
  function columnItems(x0, y0, layers, names) {
    const items = [];
    let y = y0;
    layers.forEach(([kind, h]) => {
      const it = { type: 'rect', x: x0, y, width: 56, height: h, fill: LAYER_FILL[kind] };
      if (names === 'inside') it.label = LAYER_NAME[kind];
      items.push(it);
      if (names === 'right') items.push({ type: 'text', x: x0 + 62, y: y + h / 2 + 5, text: LAYER_NAME[kind], size: 12 });
      y += h;
    });
    return items;
  }

  // 地層の変形の小さな図（左上 (x0, y0)、幅 w・高さ h、4 つの層）。kind は 'flat' | 'fold' | 'fault'
  const BAND_FILL = ['sand', MUD, 'rock', 'sand'];
  function deformPanel(x0, y0, w, h, kind) {
    const items = [];
    const bh = h / 4;
    if (kind === 'flat') {
      BAND_FILL.forEach((f, k) => items.push({ type: 'rect', x: x0, y: y0 + bh * k, width: w, height: bh, fill: f }));
    } else if (kind === 'fold') {
      // 上に曲がった（山の形の）層。内側の境界 k（1〜3）の高さ = y0 + 10 + k × (h − 20) / 4 − 10 × sin(π t)。上と下のはしは平ら
      const N = 8;
      const edge = (k) => Array.from({ length: N + 1 }, (_, i) => {
        const t = i / N;
        const y = k === 0 ? y0 : k === 4 ? y0 + h : y0 + 10 + k * (h - 20) / 4 - 10 * Math.sin(Math.PI * t);
        return [r1(x0 + w * t), r1(y)];
      });
      items.push({ type: 'rect', x: x0, y: y0, width: w, height: h, fill: 'white' });
      BAND_FILL.forEach((f, k) => {
        items.push({ type: 'polygon', points: edge(k).concat(edge(k + 1).reverse()), fill: f, stroke: 'line' });
      });
    } else {
      // 断層: 斜めの線で切れて、右側が s だけ下にずれている
      const s = Math.round(h * 0.2);
      const xf = (y) => r1(x0 + 0.6 * w - 0.15 * (y - y0));
      const clip = (y) => Math.max(y0, Math.min(y0 + h, y));
      items.push({ type: 'rect', x: x0, y: y0, width: w, height: h, fill: 'white' });
      BAND_FILL.forEach((f, k) => {
        const a = y0 + bh * k, b = a + bh;
        items.push({ type: 'polygon', points: [[x0, a], [xf(a), a], [xf(b), b], [x0, b]], fill: f, stroke: 'line' });
      });
      ['rock'].concat(BAND_FILL).forEach((f, j) => {
        const k = j - 1;
        const a = clip(y0 + bh * k + s), b = clip(y0 + bh * (k + 1) + s);
        if (b - a < 1) return;
        items.push({ type: 'polygon', points: [[xf(a), a], [x0 + w, a], [x0 + w, b], [xf(b), b]], fill: f, stroke: 'line' });
      });
      items.push({ type: 'line', points: [[xf(y0), y0], [xf(y0 + h), y0 + h]], width: 3 });
    }
    return items;
  }
  // 変形の図を 3 つ横に並べ、下にア・イ・ウの選ぶ場所を置く（kinds は左から）
  function deformChoiceScene(kinds) {
    const items = [{ type: 'text', x: 160, y: 28, text: 'がけで見られる地層のようす', size: 14, anchor: 'middle' }];
    kinds.forEach((kind, i) => {
      items.push(...deformPanel(10 + 105 * i, 44, 90, 100, kind));
      items.push({ type: 'region', id: 'r' + (i + 1), x: 55 + 105 * i, y: 180, r: 24, label: 'アイウ'[i] });
    });
    return scene(items);
  }

  // 標高で並べた柱状図（drag 用）。y = 20 + (64 − 標高) × 5（1 m が 5 px）。
  // A 地点: 標高 60 m（y 40）、凝灰岩は標高 46〜42 m（y 110〜130）。B 地点: 標高 50 m（y 90）〜22 m（y 230）
  function elevationItems() {
    const items = [
      { type: 'text', x: 6, y: 22, text: '標高〔m〕', size: 12 },
      { type: 'line', points: [[44, 40], [44, 230]], color: 'gray', width: 2 },
    ];
    [60, 50, 40, 30].forEach(e => {
      const y = 20 + (64 - e) * 5;
      items.push({ type: 'line', points: [[40, y], [48, y]], color: 'gray', width: 2 });
      items.push({ type: 'text', x: 36, y: y + 5, text: String(e), size: 12, anchor: 'end' });
    });
    items.push(...columnItems(90, 40, [['mud', 30], ['sand', 40], ['tuff', 20], ['gravel', 60], ['sand', 20]], 'inside'));
    items.push({ type: 'text', x: 118, y: 34, text: 'A 地点', size: 12, anchor: 'middle' });
    items.push({ type: 'rect', x: 210, y: 90, width: 56, height: 140, fill: 'white' });
    items.push({ type: 'text', x: 238, y: 84, text: 'B 地点', size: 12, anchor: 'middle' });
    return items;
  }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」。content/plants.js と同じ） ----
  // 画像は assets/images/strata/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/strata/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // ================================================================
  // 領域 1: 地層のでき方
  // ================================================================

  // ---- ステージ strata-1: 風化・侵食・運搬・堆積（流れる水のはたらき、粒の大きさ、地層の重なり） ----
  const strata1 = {
    id: 'strata-1', areaId: 'form', title: '流れる水のはたらき', minutes: 5, concepts: ['st-erosion', 'st-grain'],
    lessons: [
      {
        id: 'strata-1-c1',
        anim: 'sr-erosion-flow',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '岩石は、気温の変化や水のはたらきで、表面からもろくなってくずれていきます。これを**風化**といいます。くずれた岩石は、流れる水によってけずられます。このはたらきを**侵食**といいます。',
        // 山から海までの断面と、流れる水のはたらき
        figure: scene(riverItems().concat([
          { type: 'polygon', points: [[6, 54], [16, 52], [18, 60], [8, 62]], fill: 'rock' },
          { type: 'polygon', points: [[22, 58], [30, 56], [30, 64]], fill: 'rock' },
          { type: 'text', x: 6, y: 30, text: '①', size: 16 },
          { type: 'text', x: 52, y: 62, text: '②', size: 16 },
          { type: 'text', x: 104, y: 100, text: '③', size: 16 },
          { type: 'text', x: 228, y: 158, text: '④', size: 16 },
          { type: 'text', x: 140, y: 30, text: '① 風化: 岩石がもろくなる', size: 12 },
          { type: 'text', x: 140, y: 48, text: '② 侵食: 流れる水がけずる', size: 12 },
          { type: 'text', x: 140, y: 66, text: '③ 運搬: 土砂を運ぶ', size: 12 },
          { type: 'text', x: 140, y: 84, text: '④ 堆積: 土砂が積もる', size: 12 },
          { type: 'text', x: 14, y: 120, text: '山', size: 14 },
          { type: 'text', x: 130, y: 176, text: '平地', size: 14 },
          { type: 'text', x: 290, y: 176, text: '海', size: 14 },
        ])),
      },
      {
        id: 'strata-1-c2',
        text: 'けずられた土砂は、流れる水に運ばれます（**運搬**）。流れがゆるやかになると、土砂は積もります（**堆積**）。山から平地に出たところには扇状地、河口には三角州ができます。',
        // 写真: 川がつくる地形（左から V字谷 (52, 30〜148)・扇状地 (160, 28〜145)・三角州 (268, 30〜142)。下半分は白い余白）
        figure: scene([
          photo('strata-1-c2'),
          tag(52, 168, 'V字谷', { size: 15, bold: true }), tag(160, 168, '扇状地', { size: 15, bold: true }), tag(268, 168, '三角州', { size: 15, bold: true }),
          tag(52, 190, '山の中', { size: 13 }), tag(160, 190, '山から平地に', { size: 13 }), tag(268, 190, '河口', { size: 13 }),
          tag(160, 208, '出たところ', { size: 13 }),
          tag(160, 232, '流れがゆるやかになると堆積する', { size: 13 }),
        ]),
      },
      {
        id: 'strata-1-c3',
        text: '土砂は粒の大きさで、**れき**（2 mm 以上）、**砂**、**泥**（0.06 mm 以下）に分けます。大きく重い粒ほど早くしずむので、河口に近いところにはれき、沖へ行くほど砂、泥と小さい粒が積もります。',
        // 写真: れき・砂・泥の 3 つの山（左から (57, 50〜122)・(164, 56〜125)・(266, 55〜125)。下半分は白い余白）
        figure: scene([
          photo('strata-1-c3'),
          tag(57, 148, 'れき', { size: 15, bold: true }), tag(164, 148, '砂', { size: 15, bold: true }), tag(266, 148, '泥', { size: 15, bold: true }),
          tag(57, 168, '2mm以上', { size: 13 }), tag(258, 168, '0.06mm以下', { size: 13 }),
          tag(160, 200, '粒が大きい ←　　→ 粒が小さい', { size: 14 }),
          tag(160, 224, '大きく重い粒ほど河口の近くに積もる', { size: 13 }),
        ]),
      },
      {
        id: 'strata-1-c4',
        text: '海や湖の底では、運ばれてきた土砂が長い年月をかけて積み重なり、**地層**ができます。地層は下から順に積もるので、ふつう、下にある層ほど古く、上にある層ほど新しくなります。',
        // 写真: しま模様の地層が見えるがけ（上から 泥 (y 37〜75)・砂 (75〜102)・れき (102〜137)・泥 (137〜172)・砂 (172〜215)。右は白い余白）
        figure: scene([
          photo('strata-1-c4'),
          pointer(222, 56, 180, 56), tag(236, 61, '泥'),
          pointer(222, 88, 180, 88), tag(236, 93, '砂'),
          pointer(218, 120, 180, 120), tag(240, 125, 'れき'),
          pointer(222, 155, 180, 155), tag(236, 160, '泥'),
          pointer(222, 192, 180, 192), tag(236, 197, '砂'),
          { type: 'arrow', x1: 290, y1: 64, x2: 290, y2: 188, color: 'blue' },
          tag(290, 54, '新しい', { size: 13 }), tag(290, 206, '古い', { size: 13 }),
          tag(240, 232, '下の層ほど古い', { size: 14, bold: true }),
        ]),
      },
    ],
    warmup: choice({
      id: 'strata-1-w1', concept: 'st-erosion',
      prompt: '予想しよう。川の水に運ばれていく土砂は、最後にどんなところに積もると思う？',
      options: ['山の中の、流れが速いところ', '河口や海の底など、流れがゆるやかなところ', '川の水といっしょに、どこにも積もらない'],
      answer: 'b',
      explanation: '土砂は、流れがゆるやかになる河口や海の底に積もります。流れる水のはたらきを、このステージで整理しよう。',
      hint: '流れが弱くなると、運んでいた土砂はどうなるか考えよう。',
    }),
    problems: [
      fill({
        id: 'strata-1-p1', concept: 'st-erosion',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '川の流れが速いところでは[b1]のはたらきが大きく、流れがゆるやかなところでは[b2]のはたらきが大きい。',
        blanks: [
          word('b1', ['侵食', '堆積', '風化'], '侵食'),
          word('b2', ['侵食', '堆積', '風化'], '堆積'),
        ],
        explanation: '流れが速いと、水は岩石をけずり（侵食）、土砂をよく運びます。流れがゆるやかになると、運べなくなった土砂が積もります（堆積）。流れの速さとはたらきを結びつけておこう。',
        hint: '流れが弱くなると、土砂を運び続けられるか考えよう。',
      }),
      fill({
        id: 'strata-1-t1', concept: 'st-erosion', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '気温の変化や水のはたらきで、岩石が表面からもろくなることを[b1]という。流れる水が岩石をけずるはたらきを[b2]という。',
        blanks: [
          word('b1', ['風化', '侵食', '堆積'], '風化'),
          word('b2', ['風化', '侵食', '堆積'], '侵食'),
        ],
        explanation: '岩石がもろくなってくずれることが**風化**、流れる水が岩石をけずるはたらきが**侵食**です。どちらも、地層の材料になる土砂をつくります。',
        hint: '「風」が入る言葉と、「食（けずる）」が入る言葉を区別しよう。',
      }),
      figureChoice({
        id: 'strata-1-p2', concept: 'st-erosion',
        prompt: '山から海までの川の断面図です。ア（山の中の流れが速いところ）、イ（平地の流れがゆるやかなところ）、ウ（河口の先の海の中）のうち、侵食のはたらきがいちばん大きいのはどこ？',
        figure: scene(riverItems().concat([
          { type: 'region', id: 'r1', x: 56, y: 66, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 165, y: 124, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 246, y: 158, r: 22, label: 'ウ' },
          { type: 'text', x: 14, y: 120, text: '山', size: 14 },
          { type: 'text', x: 120, y: 176, text: '平地', size: 14 },
          { type: 'text', x: 290, y: 180, text: '海', size: 14 },
        ])),
        answer: 'r1',
        explanation: '山の中は土地のかたむきが大きく、流れが速いので、侵食のはたらきがいちばん大きくなります。だから深い V字谷ができます。イやウでは流れがゆるやかで、堆積のはたらきが大きくなります。',
        hint: '流れがいちばん速いのはどこか考えよう。',
      }),
      figureChoice({
        id: 'strata-1-p3', concept: 'st-grain',
        prompt: '川が海に流れこむところの断面図です。ア（河口の近く）、イ（少し沖）、ウ（河口から遠い沖）のうち、泥がいちばん積もりやすいのはどこ？',
        figure: scene(seaItems().concat([
          { type: 'region', id: 'r1', x: 100, y: 112, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 185, y: 141, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 275, y: 172, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '泥は粒がいちばん小さく軽いので、なかなかしずまず、河口から遠い沖まで運ばれて積もります。だからウです。河口の近くのアには、大きく重いれきが積もります。',
        hint: '小さく軽い粒ほど、遠くまで運ばれるよ。',
      }),
      fill({
        id: 'strata-1-p4', concept: 'st-grain',
        prompt: '空らんに入る数を入れよう。',
        text: '土砂のうち、粒の直径が[b1]以上のものを「れき」という。',
        blanks: [number('b1', 2, 0, 'mm')],
        explanation: 'れきは直径 2 mm 以上の粒です。2 mm より小さく 0.06 mm より大きい粒が砂、0.06 mm 以下が泥です。粒の大きさで名前が決まります。',
        hint: '砂とれきの境の大きさを思い出そう。',
      }),
      choice({
        id: 'strata-1-p5', concept: 'st-grain',
        prompt: '河口から沖に向かって、海の底に積もる粒の大きさはどうなる？',
        options: ['だんだん大きくなる', 'だんだん小さくなる', 'どこでも同じ'],
        answer: 'b',
        explanation: '大きく重い粒ほど早くしずむので、河口の近くに積もります。小さく軽い粒は沖まで運ばれます。だから沖へ行くほど、れき → 砂 → 泥 と粒が小さくなります。',
        hint: '重い粒と軽い粒では、どちらが先にしずむか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'strata-1-r1', concept: 'st-erosion',
        prompt: 'がけに、いくつもの地層が重なって見えます。上下の逆転がないとき、いちばん古い層はどれ？',
        options: ['いちばん上の層', 'まん中の層', 'いちばん下の層'],
        answer: 'c',
        explanation: '地層は、下から順に土砂が積み重なってできます。だから、ふつうは下の層ほど古く、上の層ほど新しくなります。',
        hint: '土砂はどの順番に積もっていくか考えよう。',
      }),
      choice({
        id: 'strata-1-r2', concept: 'st-erosion',
        prompt: '川が山から平地に出たところで、流れがゆるやかになって土砂が積もり、扇の形の土地ができます。この地形を何という？',
        options: ['扇状地', '三角州', 'V字谷'],
        answer: 'a',
        explanation: '山から平地に出たところでは流れが急にゆるやかになり、土砂が扇の形に積もります。これが扇状地です。河口にできるのは三角州、山の中の深い谷は V字谷です。',
        hint: '「扇」の形という言葉に注目しよう。',
      }),
      figureChoice({
        id: 'strata-1-r3', concept: 'st-grain',
        prompt: '川が海に流れこむところの断面図です。ア（河口の近く）、イ（少し沖）、ウ（河口から遠い沖）のうち、れきがいちばん積もりやすいのはどこ？',
        figure: scene(seaItems().concat([
          { type: 'region', id: 'r1', x: 100, y: 112, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 185, y: 141, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 275, y: 172, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: 'れきは粒が大きく重いので、海に入って流れがゆるやかになると、すぐにしずみます。だから河口の近くのアに積もります。',
        hint: '大きく重い粒は、遠くまで運ばれるかな。',
      }),
      choice({
        id: 'strata-1-r4', concept: 'st-grain',
        prompt: '海の底で、沖ほど小さい粒が積もるのはなぜ？',
        options: ['小さい粒ほどしずみにくく、遠くまで運ばれるから', '沖のほうが流れが速いから', '小さい粒ほど重いから'],
        answer: 'a',
        explanation: '小さく軽い粒は、なかなかしずまないので、沖まで運ばれてから積もります。大きく重い粒は、河口の近くで先にしずみます。',
        hint: '粒の大きさと、しずむ速さの関係を考えよう。',
      }),
      choice({
        id: 'strata-1-t2', concept: 'st-erosion', term: true,
        prompt: '次の説明に合う言葉はどれ？「流れる水に運ばれた土砂が、流れがゆるやかなところに積もること」',
        options: ['侵食', '運搬', '堆積'],
        answer: 'c',
        explanation: '運ばれてきた土砂が積もることを**堆積**といいます。けずるのが侵食、運ぶのが運搬です。',
        hint: '「積もる」という意味の言葉だよ。',
      }),
    ],
  };

  // ---- ステージ strata-2: 堆積岩（れき岩・砂岩・泥岩、石灰岩・チャート、凝灰岩） ----
  const strata2 = {
    id: 'strata-2', areaId: 'form', title: '堆積岩', minutes: 5, concepts: ['st-sedimentary'],
    lessons: [
      {
        id: 'strata-2-c1',
        text: '積もった土砂が長い年月をかけて押し固められると、**堆積岩**になります。粒の大きさで、**れき岩**・**砂岩**・**泥岩**に分けます。流れる水に運ばれる間に角がけずられるので、粒は丸みをおびています。',
        // 写真: れき岩・砂岩・泥岩の標本（左から (52, 42〜152)・(159, 45〜152)・(265, 45〜150)。下は白い余白）
        figure: scene([
          photo('strata-2-c1'),
          tag(52, 178, 'れき岩', { size: 15, bold: true }), tag(159, 178, '砂岩', { size: 15, bold: true }), tag(265, 178, '泥岩', { size: 15, bold: true }),
          tag(160, 202, '粒が大きい ←　　→ 粒が小さい', { size: 14 }),
          tag(160, 226, '運ばれる間に角がけずられ、粒は丸い', { size: 13 }),
        ]),
      },
      {
        id: 'strata-2-c2',
        text: '生物の殻などが積もってできた**石灰岩**に、うすい塩酸をかけると、二酸化炭素のあわが出ます。**チャート**はとてもかたく、鉄くぎでこすっても傷がつきません。塩酸をかけてもあわは出ません。',
        // 写真: 石灰岩（左 (75, 50〜165)。うすい塩酸をかけてあわが出る）とチャート（右 (240, 60〜160)。あわは出ない）。スポイトの先は (57, 52)・(257, 50)
        figure: scene([
          photo('strata-2-c2'),
          pointer(102, 22, 50, 30), pointer(218, 22, 270, 24), tag(160, 26, 'うすい塩酸', { size: 14 }),
          tag(75, 188, '石灰岩', { size: 15, bold: true }), tag(240, 188, 'チャート', { size: 15, bold: true }),
          tag(75, 208, 'あわが出る', { size: 13 }), tag(75, 228, '（二酸化炭素）', { size: 13 }),
          tag(240, 208, 'あわは出ない', { size: 13 }), tag(240, 228, 'とてもかたい', { size: 13 }),
        ]),
      },
      {
        id: 'strata-2-c3',
        text: '火山灰などが積もって固まった岩石を**凝灰岩**といいます。流れる水に運ばれていないので、粒は角ばっています。凝灰岩の層があれば、その層が積もったころ、近くで火山の噴火があったと分かります。',
        // 丸い粒（流水で運ばれた）と角ばった粒（火山灰）
        figure: scene(textureBox(40, 50, 'sand').concat(textureBox(200, 50, 'tuff'), [
          { type: 'text', x: 160, y: 34, text: '粒の形を比べる', size: 14, anchor: 'middle' },
          { type: 'text', x: 80, y: 156, text: '砂岩', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 240, y: 156, text: '凝灰岩', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 80, y: 178, text: '流れる水で運ばれた', size: 12, anchor: 'middle' },
          { type: 'text', x: 80, y: 196, text: '→ 粒が丸い', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 178, text: '火山灰などが積もった', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 196, text: '→ 粒が角ばっている', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'strata-2-w1', concept: 'st-sedimentary',
      prompt: '予想しよう。海の底に積もった砂は、長い年月がたつとどうなると思う？',
      options: ['ずっと砂のまま', '上に積もるものに押し固められて、岩石になる', '水にとけて、なくなる'],
      answer: 'b',
      explanation: '積もった砂は、上に積もる土砂の重みで押し固められ、長い年月をかけて岩石になります。どんな岩石ができるのか、このステージで見ていこう。',
      hint: '上にどんどん土砂が積もると、下の砂はどうなるか考えよう。',
    }),
    problems: [
      choice({
        id: 'strata-2-p1', concept: 'st-sedimentary',
        prompt: '粒の直径が 2 mm 以上の丸い粒が多く集まって固まった堆積岩はどれ？',
        options: ['れき岩', '砂岩', '泥岩'],
        answer: 'a',
        explanation: '直径 2 mm 以上の粒はれきなので、れきが固まった岩石はれき岩です。砂が固まると砂岩、泥が固まると泥岩になります。',
        hint: '直径 2 mm 以上の粒を何とよんだか思い出そう。',
      }),
      fill({
        id: 'strata-2-t1', concept: 'st-sedimentary', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '積もった土砂などが押し固められてできた岩石を[b1]という。そのうち、火山灰などが固まってできたものを[b2]という。',
        blanks: [
          word('b1', ['堆積岩', '凝灰岩', '石灰岩'], '堆積岩'),
          word('b2', ['堆積岩', '凝灰岩', '石灰岩'], '凝灰岩'),
        ],
        explanation: '積もったものが固まってできた岩石が**堆積岩**です。火山灰などが固まった**凝灰岩**も、堆積岩のなかまです。',
        hint: '「堆積」してできた岩石、という言葉を思い出そう。',
      }),
      figureChoice({
        id: 'strata-2-p2', concept: 'st-sedimentary',
        prompt: '3 つの堆積岩をルーペで見たようすです。ア（丸みのある大きな粒）、イ（角ばった粒）、ウ（丸みのある小さな粒）のうち、火山灰が固まってできた凝灰岩はどれ？',
        figure: textureChoiceScene(['gravel', 'tuff', 'sand']),
        answer: 'r2',
        explanation: '火山灰は流れる水に運ばれていないので、角がけずられず、粒が角ばっています。だから凝灰岩はイです。アとウは、流れる水で運ばれて丸くなった粒でできたれき岩と砂岩です。',
        hint: '流れる水で運ばれると、粒の形はどうなったかな。',
      }),
      choice({
        id: 'strata-2-p3', concept: 'st-sedimentary',
        prompt: 'うすい塩酸をかけると、あわ（二酸化炭素）が出る堆積岩はどれ？',
        options: ['チャート', '石灰岩', '砂岩'],
        answer: 'b',
        explanation: '石灰岩は、生物の殻などが積もってできた岩石で、うすい塩酸をかけると二酸化炭素が発生します。チャートは塩酸をかけてもあわが出ません。',
        hint: '生物の殻などからできた岩石を思い出そう。',
      }),
      choice({
        id: 'strata-2-p4', concept: 'st-sedimentary',
        prompt: 'とてもかたく、鉄くぎでこすっても傷がつかない堆積岩はどれ？',
        options: ['石灰岩', '泥岩', 'チャート'],
        answer: 'c',
        explanation: 'チャートはとてもかたく、鉄くぎでこすっても傷がつきません。石灰岩は鉄くぎで傷がつきます。かたさと塩酸へのようすで、2 つを見分けられます。',
        hint: '塩酸をかけてもあわが出ない、かたい岩石だよ。',
      }),
      choice({
        id: 'strata-2-p5', concept: 'st-sedimentary',
        prompt: 'れき岩・砂岩・泥岩の粒が、丸みをおびているのはなぜ？',
        options: ['流れる水に運ばれる間に、角がけずられたから', '火山からふき出したときに、とけて丸くなったから', 'もともと丸い形の生物だったから'],
        answer: 'a',
        explanation: 'れき・砂・泥は、流れる水に運ばれる間に、ぶつかり合って角がけずられます。だから、これらが固まった岩石の粒は丸みをおびています。',
        hint: '川原の石の形を思い出そう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'strata-2-r1', concept: 'st-sedimentary',
        prompt: 'れき岩・砂岩・泥岩のうち、粒がいちばん小さいのはどれ？',
        options: ['れき岩', '砂岩', '泥岩'],
        answer: 'c',
        explanation: '泥岩は、直径 0.06 mm 以下の泥が固まった岩石で、粒がいちばん小さいです。粒の大きさは、れき岩 ＞ 砂岩 ＞ 泥岩 の順です。',
        hint: 'れき・砂・泥のうち、いちばん小さい粒はどれだったかな。',
      }),
      figureChoice({
        id: 'strata-2-r2', concept: 'st-sedimentary',
        prompt: '3 つの堆積岩をルーペで見たようすです。ア（丸みのある小さな粒）、イ（角ばった粒）、ウ（丸みのある大きな粒）のうち、れき岩はどれ？',
        figure: textureChoiceScene(['sand', 'tuff', 'gravel']),
        answer: 'r3',
        explanation: 'れき岩は、直径 2 mm 以上のれきが固まった岩石で、流れる水で運ばれて丸くなった大きな粒が見えます。だからウです。アは砂岩、イは凝灰岩です。',
        hint: '粒が大きく、丸みのあるものをさがそう。',
      }),
      choice({
        id: 'strata-2-r3', concept: 'st-sedimentary',
        prompt: '地層の中に凝灰岩の層がありました。この層が積もったころ、どんなことがあったと考えられる？',
        options: ['近くで火山の噴火があった', '海がこおっていた', '大きな川の流れが速くなった'],
        answer: 'a',
        explanation: '凝灰岩は、火山灰などが積もって固まった岩石です。だから、その層が積もったころ、近くで火山の噴火があったと考えられます。',
        hint: '凝灰岩は何が固まってできた岩石だったかな。',
      }),
      choice({
        id: 'strata-2-t2', concept: 'st-sedimentary', term: true,
        prompt: '次の説明に合う言葉はどれ？「生物の殻などが積もってでき、うすい塩酸をかけると二酸化炭素が発生する岩石」',
        options: ['チャート', '石灰岩', '凝灰岩'],
        answer: 'b',
        explanation: '生物の殻などが積もってでき、塩酸をかけると二酸化炭素が出る岩石は**石灰岩**です。同じく生物からできることが多いチャートは、塩酸をかけてもあわが出ません。',
        hint: '「石灰」という言葉が入った岩石だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 地層から読み取る
  // ================================================================

  // ---- ステージ strata-3: 化石（示相化石・示準化石） ----
  const strata3 = {
    id: 'strata-3', areaId: 'history', title: '化石', minutes: 4, concepts: ['st-fossil'],
    lessons: [
      {
        id: 'strata-3-c1',
        text: '大昔の生物の死がいや、足あと・巣あななどの生活のあとが、地層の中に残ったものを**化石**といいます。化石を調べると、地層が積もったころのようすや、その時代が分かります。',
        // 写真: 貝の化石をふくむ岩（左 (77, 18〜148)）と、恐竜の足あとの化石（右 (239, 22〜150)。足あと (248, 75)）。下は白い余白
        figure: scene([
          photo('strata-3-c1'),
          tag(77, 172, '貝がらの化石', { size: 15, bold: true }), tag(239, 172, '足あとの化石', { size: 15, bold: true }),
          tag(77, 192, '（生物の死がい）', { size: 13 }), tag(239, 192, '（生活のあと）', { size: 13 }),
          tag(160, 226, '大昔の生物のようすが地層に残ったもの', { size: 13 }),
        ]),
      },
      {
        id: 'strata-3-c2',
        text: '地層が積もった当時の環境を知る手がかりになる化石を**示相化石**といいます。サンゴならあたたかくて浅い海、シジミなら河口や湖、ブナならやや寒い気候の土地だったと分かります。',
        // 写真: 示相化石（左から サンゴ (50, 55〜150)・シジミ (154, 68〜146)・ブナの葉 (262, 42〜157)）。下は白い余白
        figure: scene([
          photo('strata-3-c2'),
          tag(50, 176, 'サンゴ', { size: 15, bold: true }), tag(154, 176, 'シジミ', { size: 15, bold: true }), tag(262, 176, 'ブナ', { size: 15, bold: true }),
          tag(50, 196, 'あたたかくて', { size: 13 }), tag(154, 196, '河口や湖', { size: 13 }), tag(262, 196, 'やや寒い', { size: 13 }),
          tag(50, 214, '浅い海', { size: 13 }), tag(262, 214, '気候の土地', { size: 13 }),
          tag(160, 235, '示相化石 → 当時の環境が分かる', { size: 13, bold: true }),
        ]),
      },
      {
        id: 'strata-3-c3',
        text: '地層が積もった時代を知る手がかりになる化石を**示準化石**といいます。短い期間に広い範囲で栄えた生物の化石が役に立ちます。古生代・中生代・新生代の順に新しくなります。',
        // 写真: 示準化石 3 つの 1 列（左から フズリナの入った石灰岩 (4〜105, 49〜148)・アンモナイト (114〜215, 46〜149)・
        // ビカリア (227〜318, 44〜153)）。上と下は白い余白なので、上に時代、下に名前を書く
        figure: scene([
          photo('strata-3-c3'),
          tag(54, 28, '古生代', { bold: true }), tag(165, 28, '中生代', { bold: true }), tag(272, 28, '新生代', { bold: true }),
          { type: 'line', points: [[84, 23], [132, 23]], color: 'blue', width: 2, arrow: true },
          { type: 'line', points: [[195, 23], [240, 23]], color: 'blue', width: 2, arrow: true },
          tag(54, 176, 'フズリナ', { size: 15, bold: true }), tag(165, 176, 'アンモナイト', { size: 15, bold: true }), tag(272, 176, 'ビカリア', { size: 15, bold: true }),
          tag(54, 196, '米つぶ形の殻', { size: 13 }), tag(165, 196, 'うず巻きの殻', { size: 13 }), tag(272, 196, '細長い巻貝', { size: 13 }),
          tag(160, 228, '示準化石 → 地層の時代が分かる', { size: 13, bold: true }),
        ]),
      },
    ],
    warmup: choice({
      id: 'strata-3-w1', concept: 'st-fossil',
      prompt: '予想しよう。山の地層から、海にすむ貝の化石が見つかりました。この地層は、どこで積もったと思う？',
      options: ['海の底', 'ずっと山の上', '空の上'],
      answer: 'a',
      explanation: '海にすむ貝の化石があるので、この地層は海の底で積もったと考えられます。化石から分かることを、このステージで学ぼう。',
      hint: 'その貝は、生きていたときどこにすんでいたかな。',
    }),
    problems: [
      choice({
        id: 'strata-3-p1', concept: 'st-fossil',
        prompt: 'サンゴの化石がふくまれる地層は、積もった当時、どんな環境だったと考えられる？',
        options: ['あたたかくて浅い海', '冷たくて深い海', '川の上流'],
        answer: 'a',
        explanation: 'サンゴは、今もあたたかくて浅い海にすんでいます。だから、サンゴの化石がふくまれる地層は、あたたかくて浅い海で積もったと考えられます。',
        hint: 'サンゴが今どんな海にすんでいるか思い出そう。',
      }),
      fill({
        id: 'strata-3-t1', concept: 'st-fossil', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地層が積もった当時の環境を知る手がかりになる化石を[b1]、地層が積もった時代を知る手がかりになる化石を[b2]という。',
        blanks: [
          word('b1', ['示相化石', '示準化石', 'かぎ層'], '示相化石'),
          word('b2', ['示相化石', '示準化石', 'かぎ層'], '示準化石'),
        ],
        explanation: '環境（ようす）が分かるのが**示相化石**、時代が分かるのが**示準化石**です。「相」はようす、「準」は基準と覚えると区別しやすくなります。',
        hint: '「相」はようす、「準」は時代を決める基準という意味だよ。',
      }),
      figureChoice({
        id: 'strata-3-p2', concept: 'st-fossil',
        prompt: '地層の断面です。ア（上の層: ビカリアの化石）、イ（まん中の層: アンモナイトの化石）、ウ（下の層: サンヨウチュウの化石）のうち、中生代に積もった層はどれ？',
        figure: fossilLayersScene(['ビカリア', 'アンモナイト', 'サンヨウチュウ']),
        answer: 'r2',
        explanation: 'アンモナイトは中生代の示準化石なので、イが中生代の層です。サンヨウチュウのウは古生代、ビカリアのアは新生代の層で、下の層ほど古いことともあっています。',
        hint: '中生代に栄えた生物の化石をさがそう。',
      }),
      choice({
        id: 'strata-3-p3', concept: 'st-fossil',
        prompt: '示準化石として役に立つのは、どんな生物の化石？',
        options: ['短い期間に、広い範囲で栄えた生物', '長い期間に、せまい範囲だけで生きていた生物', '今もたくさん生きている生物'],
        answer: 'a',
        explanation: '短い期間だけ栄えた生物なら、その化石があれば時代をしぼりこめます。広い範囲にいた生物なら、離れた場所の地層でも見つかるので、時代を比べられます。',
        hint: '時代を決めるには、いつ生きていたかがはっきりしている生物がよいね。',
      }),
      choice({
        id: 'strata-3-p4', concept: 'st-fossil',
        prompt: 'シジミの化石がふくまれる地層は、積もった当時、どんな場所だったと考えられる？',
        options: ['深い海の底', '河口や湖', '高い山の上'],
        answer: 'b',
        explanation: 'シジミは、河口や湖のような、海水と淡水がまじるところや淡水にすむ貝です。だから、その地層は河口や湖で積もったと考えられます。',
        hint: 'シジミがとれる場所を思い出そう。',
      }),
      fill({
        id: 'strata-3-p5', concept: 'st-fossil',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'サンヨウチュウやフズリナは[b1]の示準化石で、ビカリアやナウマンゾウは[b2]の示準化石である。',
        blanks: [
          word('b1', ['古生代', '中生代', '新生代'], '古生代'),
          word('b2', ['古生代', '中生代', '新生代'], '新生代'),
        ],
        explanation: 'サンヨウチュウ・フズリナは古生代、アンモナイト・恐竜は中生代、ビカリア・ナウマンゾウは新生代の示準化石です。古生代がいちばん古い時代です。',
        hint: '古生代 → 中生代 → 新生代 の順に新しくなるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'strata-3-r1', concept: 'st-fossil',
        prompt: '恐竜の化石が見つかった地層は、いつの時代に積もったと考えられる？',
        options: ['古生代', '中生代', '新生代'],
        answer: 'b',
        explanation: '恐竜はアンモナイトと同じく、中生代に栄えた生物です。だから、恐竜の化石がふくまれる地層は中生代に積もったと考えられます。',
        hint: 'アンモナイトと同じ時代だよ。',
      }),
      figureChoice({
        id: 'strata-3-r2', concept: 'st-fossil',
        prompt: '地層の断面です。ア（上の層: ナウマンゾウの化石）、イ（まん中の層: 恐竜の化石）、ウ（下の層: フズリナの化石）のうち、古生代に積もった層はどれ？',
        figure: fossilLayersScene(['ナウマンゾウ', '恐竜', 'フズリナ']),
        answer: 'r3',
        explanation: 'フズリナは古生代の示準化石なので、ウが古生代の層です。恐竜のイは中生代、ナウマンゾウのアは新生代です。',
        hint: '古生代に栄えた生物の化石をさがそう。',
      }),
      choice({
        id: 'strata-3-r3', concept: 'st-fossil',
        prompt: 'ブナの葉の化石がふくまれる地層は、積もった当時、どんな気候の土地だったと考えられる？',
        options: ['とても暑い気候', 'やや寒い気候', '一年中こおっている気候'],
        answer: 'b',
        explanation: 'ブナは、やや寒い気候の土地に生える木です。だから、ブナの化石がふくまれる地層は、やや寒い気候の土地で積もったと考えられます。ブナは示相化石の例です。',
        hint: 'ブナの森は、どんな気候の山に多いかな。',
      }),
      choice({
        id: 'strata-3-t2', concept: 'st-fossil', term: true,
        prompt: '次の説明に合う言葉はどれ？「地層が積もった時代を知る手がかりになる化石」',
        options: ['示相化石', '示準化石', 'かぎ層'],
        answer: 'b',
        explanation: '地層が積もった時代を知る手がかりになる化石を**示準化石**といいます。アンモナイトやサンヨウチュウなどがその例です。',
        hint: '時代を決める「基準」になる化石だよ。',
      }),
    ],
  };

  // ---- ステージ strata-4: 柱状図と大地の変動（柱状図・かぎ層、しゅう曲・断層・隆起・沈降） ----
  const strata4 = {
    id: 'strata-4', areaId: 'history', title: '柱状図と大地の変動', minutes: 5, concepts: ['st-column', 'st-deform'],
    lessons: [
      {
        id: 'strata-4-c1',
        text: 'ある地点の地層の重なりを、柱の形で表した図を**柱状図**といいます。上下の逆転がなければ、柱状図でも下の層ほど古い層です。岩石の種類から、それぞれの層が積もったころのようすを考えます。',
        // 1 地点の柱状図
        figure: scene(columnItems(80, 40, [['mud', 40], ['sand', 40], ['tuff', 24], ['gravel', 50]], 'right').concat([
          { type: 'text', x: 108, y: 32, text: '地表', size: 12, anchor: 'middle' },
          { type: 'arrow', x1: 240, y1: 52, x2: 240, y2: 186, color: 'gray' },
          { type: 'text', x: 250, y: 58, text: '新しい', size: 12 },
          { type: 'text', x: 250, y: 190, text: '古い', size: 12 },
          { type: 'text', x: 160, y: 226, text: '柱状図: 地層の重なりを柱で表す', size: 13, anchor: 'middle' },
        ])),
      },
      {
        id: 'strata-4-c2',
        text: '火山灰は短い期間に広い範囲に降り積もるので、凝灰岩の層は離れた地点の地層を比べる目印になります。このような層を**かぎ層**といいます。かぎ層をつなぐと、同じ時期に積もった層が分かります。',
        // 2 地点の柱状図を、かぎ層（凝灰岩）でつなぐ
        figure: scene(columnItems(50, 40, [['mud', 50], ['tuff', 22], ['sand', 50], ['gravel', 40]], 'inside').concat(
          columnItems(200, 40, [['sand', 30], ['mud', 60], ['tuff', 22], ['gravel', 50]], 'inside'), [
            { type: 'line', points: [[106, 101], [200, 141]], color: 'gray', width: 2, dashed: true },
            { type: 'text', x: 78, y: 32, text: 'A 地点', size: 12, anchor: 'middle' },
            { type: 'text', x: 228, y: 32, text: 'B 地点', size: 12, anchor: 'middle' },
            { type: 'text', x: 160, y: 226, text: '凝灰岩の層（かぎ層）で地層をつなぐ', size: 13, anchor: 'middle' },
          ])),
      },
      {
        id: 'strata-4-c3',
        text: '下から順に、れき岩 → 砂岩 → 泥岩 と粒が小さくなっていれば、その場所は河口から遠くなった、つまり海が深くなったと考えられます。粒の大きさの変わり方から、土地や海のようすの変化が読み取れます。',
        // 上ほど粒が小さくなる柱状図
        figure: scene(columnItems(70, 40, [['mud', 50], ['sand', 50], ['gravel', 50]], 'inside').concat([
          { type: 'arrow', x1: 150, y1: 182, x2: 150, y2: 50, color: 'blue' },
          { type: 'text', x: 162, y: 60, text: '粒が小さくなる', size: 13 },
          { type: 'text', x: 162, y: 104, text: '→ 海が深くなった', size: 13 },
          { type: 'text', x: 162, y: 124, text: '（河口から遠くなった）', size: 12 },
          { type: 'text', x: 160, y: 222, text: '下から れき → 砂 → 泥', size: 13, anchor: 'middle' },
        ])),
      },
      {
        id: 'strata-4-c4',
        text: '地層に大きな力がはたらくと、押されて曲がったり（**しゅう曲**）、切れてずれたり（**断層**）します。土地がもち上がることを**隆起**、しずむことを**沈降**といいます。',
        // 写真: 曲がった地層のがけ（左 (5〜155, 8〜120)）と、ずれた地層のがけ（右 (168〜318, 12〜120)。断層の線 (260, 47)〜(230, 115)、右側がずれ下がる）。下半分は白い余白
        figure: scene([
          photo('strata-4-c4'),
          tag(80, 142, 'しゅう曲', { size: 15, bold: true }), tag(243, 142, '断層', { size: 15, bold: true }),
          pointer(236, 128, 232, 114),
          { type: 'arrow', x1: 4, y1: 158, x2: 26, y2: 158, color: 'orange' },
          { type: 'arrow', x1: 156, y1: 158, x2: 134, y2: 158, color: 'orange' },
          tag(80, 163, '押す力で曲がる', { size: 13 }), tag(243, 163, '切れてずれる', { size: 13 }),
          { type: 'arrow', x1: 296, y1: 46, x2: 296, y2: 70, color: 'blue' },
          tag(160, 204, '土地がもち上がる: 隆起', { size: 13 }),
          tag(160, 224, '土地がしずむ: 沈降', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'strata-4-w1', concept: 'st-column',
      prompt: '予想しよう。上下の逆転がない地層では、いちばん下の層といちばん上の層の、どちらが先に積もったと思う？',
      options: ['いちばん下の層', 'いちばん上の層', '同時に積もった'],
      answer: 'a',
      explanation: '地層は下から順に積もるので、いちばん下の層が先です。このきまりを使って、柱状図を読み取っていこう。',
      hint: '積み木を下から積むときのことを考えよう。',
    }),
    problems: [
      figureChoice({
        id: 'strata-4-p1', concept: 'st-column',
        prompt: 'ある地点の柱状図です（上下の逆転はない）。ア（いちばん上の泥岩の層）、イ（上から 3 番目の凝灰岩の層）、ウ（いちばん下のれき岩の層）のうち、いちばん古い層はどれ？',
        figure: scene(columnItems(100, 30, [['mud', 50], ['sand', 40], ['tuff', 30], ['gravel', 60]], 'right').concat([
          { type: 'text', x: 128, y: 22, text: '地表', size: 12, anchor: 'middle' },
          { type: 'region', id: 'r1', x: 128, y: 55, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 128, y: 135, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 128, y: 182, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '地層は下から順に積もるので、上下の逆転がなければ、いちばん下のウのれき岩の層がいちばん古い層です。いちばん上のアがいちばん新しい層です。',
        hint: '地層は、どこから順に積もっていくかな。',
      }),
      fill({
        id: 'strata-4-t1', concept: 'st-column', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地層の重なりを柱の形で表した図を[b1]という。凝灰岩の層のように、離れた地点の地層を比べる目印になる層を[b2]という。',
        blanks: [
          word('b1', ['柱状図', 'かぎ層', '断層'], '柱状図'),
          word('b2', ['柱状図', 'かぎ層', '断層'], 'かぎ層'),
        ],
        explanation: '地層の重なりを柱で表したものが**柱状図**、離れた地点の地層を比べる目印になる層が**かぎ層**です。かぎ層をつなぐと、同じ時期に積もった層が分かります。',
        hint: '「柱」の形の図と、地層をつなぐ「かぎ」になる層だよ。',
      }),
      drag({
        id: 'strata-4-p2', concept: 'st-column',
        prompt: 'A 地点（標高 60 m）と B 地点（標高 50 m）の柱状図を、左の標高の目もりに合わせて並べました。この地域の地層は水平に続いていて、ずれやかたむきはありません。B 地点でも A 地点と同じ凝灰岩の層が見つかるはずです。黄色の凝灰岩の層を上下に動かして、B 地点の柱の正しい高さに置こう。',
        // y = 20 + (64 − 標高) × 5。A の凝灰岩は標高 46〜42 m（y 110〜130）。B でも同じ標高 → 左上 (210, 110)
        // 不正解例は「地表からの深さを A と同じ（14〜18 m）にする」まちがい: B の標高 36〜32 m → 左上 y 160
        figure: scene(elevationItems().concat([
          { type: 'rect', id: 'tuff', x: 210, y: 200, width: 56, height: 20, fill: 'yellow', label: '凝灰岩' },
        ])),
        draggable: { itemId: 'tuff', axis: 'y' },
        target: { x: 210, y: 110 },
        samples: { correct: { x: 210, y: 110 }, wrong: { x: 210, y: 160 } },
        explanation: '地層が水平に続いているなら、同じ層は同じ標高にあります。A 地点の凝灰岩の層は標高 46〜42 m なので、B 地点でも標高 46〜42 m に置きます。B 地点は地表が 10 m 低いので、地表からの深さは A 地点より 10 m 浅くなります。',
        hint: '地表からの深さではなく、標高（目もり）をそろえよう。',
      }),
      choice({
        id: 'strata-4-p3', concept: 'st-column',
        prompt: 'ある地点の地層は、下から順に れき岩 → 砂岩 → 泥岩 と重なっていました。この地層が積もる間に、この場所の海の深さはどう変わったと考えられる？',
        options: ['だんだん深くなった', 'だんだん浅くなった', '変わらなかった'],
        answer: 'a',
        explanation: 'れきは河口の近く、泥は沖の深いところに積もります。下から上へ粒が小さくなっているので、この場所は河口から遠くなり、海がだんだん深くなったと考えられます。',
        hint: 'れきと泥は、それぞれどんな場所に積もったかな。',
      }),
      figureChoice({
        id: 'strata-4-p4', concept: 'st-deform',
        prompt: 'がけで見られる地層のようすです。ア（層が山の形に曲がっている）、イ（層が水平に重なっている）、ウ（層が切れて、ずれている）のうち、断層はどれ？',
        figure: deformChoiceScene(['fold', 'flat', 'fault']),
        answer: 'r3',
        explanation: '地層に大きな力がはたらいて、切れてずれたものが断層です。だからウです。アのように押されて曲がったものはしゅう曲です。',
        hint: '「ずれる」と「曲がる」を区別しよう。',
      }),
      choice({
        id: 'strata-4-p5', concept: 'st-deform',
        prompt: 'しゅう曲は、地層にどのような力がはたらいてできる？',
        options: ['両側から押す大きな力', '上から降る雨の力', '生物がほり返す力'],
        answer: 'a',
        explanation: 'しゅう曲は、地層が両側から押す大きな力を長い時間受けて、曲げられたものです。大地には、地層を曲げるほどの大きな力がはたらいています。',
        hint: '下じきを両はしから押すと、どうなるか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'strata-4-r1', concept: 'st-column',
        prompt: '凝灰岩の層が、離れた地点の地層を比べる目印（かぎ層）になるのはなぜ？',
        options: ['火山灰は短い期間に広い範囲に降り積もるから', '凝灰岩はどこでもいちばん下にあるから', '凝灰岩は水にとけやすいから'],
        answer: 'a',
        explanation: '火山の噴火で出た火山灰は、短い期間に広い範囲に降り積もります。だから、離れた地点の凝灰岩の層も同じ時期に積もったものと考えられ、地層を比べる目印になります。',
        hint: '火山灰はどのように降り積もるか考えよう。',
      }),
      figureChoice({
        id: 'strata-4-r2', concept: 'st-column',
        prompt: 'A 地点と B 地点の柱状図です（どちらも上が地表）。B 地点のア（A の凝灰岩と同じ深さにある泥岩の層）、イ（凝灰岩の層）、ウ（いちばん下のれき岩の層）のうち、A 地点の凝灰岩の層と同じ時期に積もった層はどれ？',
        figure: scene(columnItems(40, 40, [['mud', 50], ['tuff', 26], ['sand', 54], ['gravel', 40]], 'right').concat(
          columnItems(200, 40, [['sand', 36], ['mud', 58], ['tuff', 26], ['gravel', 50]], 'right'), [
            { type: 'text', x: 68, y: 32, text: 'A 地点', size: 12, anchor: 'middle' },
            { type: 'text', x: 228, y: 32, text: 'B 地点', size: 12, anchor: 'middle' },
            { type: 'region', id: 'r1', x: 228, y: 100, r: 22, label: 'ア' },
            { type: 'region', id: 'r2', x: 228, y: 147, r: 22, label: 'イ' },
            { type: 'region', id: 'r3', x: 228, y: 194, r: 22, label: 'ウ' },
          ])),
        answer: 'r2',
        explanation: '凝灰岩の層はかぎ層になるので、B 地点の凝灰岩の層イが、A 地点の凝灰岩の層と同じ時期に積もった層です。地点によって地表の高さや層の厚さがちがうので、同じ深さの層とはかぎりません。',
        hint: '同じ深さではなく、同じ目印の層をさがそう。',
      }),
      choice({
        id: 'strata-4-r3', concept: 'st-deform',
        prompt: '高い山の地層から、海にすむ貝の化石が見つかりました。この土地には、どんな変化があったと考えられる？',
        options: ['海の底だった土地が隆起した', '山だった土地が沈降した', '土地はまったく動いていない'],
        answer: 'a',
        explanation: '海にすむ貝の化石があるので、この地層は海の底で積もりました。それが今は高い山にあるので、土地がもち上がった（隆起した）と考えられます。',
        hint: '海の底で積もった地層が、今は山の上にあるね。',
      }),
      figureChoice({
        id: 'strata-4-r4', concept: 'st-deform',
        prompt: 'がけで見られる地層のようすです。ア（層が切れて、ずれている）、イ（層が山の形に曲がっている）、ウ（層が水平に重なっている）のうち、しゅう曲はどれ？',
        figure: deformChoiceScene(['fault', 'fold', 'flat']),
        answer: 'r2',
        explanation: '地層が押されて曲がったものがしゅう曲です。だからイです。アのように切れてずれたものは断層です。',
        hint: '「曲がる」のがしゅう曲だよ。',
      }),
      choice({
        id: 'strata-4-t2', concept: 'st-deform', term: true,
        prompt: '次の説明に合う言葉はどれ？「地層に大きな力がはたらいて、地層が切れてずれたもの」',
        options: ['しゅう曲', '断層', '隆起'],
        answer: 'b',
        explanation: '地層が切れてずれたものを**断層**といいます。曲がったものはしゅう曲、土地がもち上がることは隆起です。',
        hint: '「ずれ」の言葉をさがそう。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'st-erosion', title: '風化・侵食・運搬・堆積', basic: null, lessonStageId: 'strata-1',
      checkPool: [
        choice({
          id: 'st-erosion-k1', concept: 'st-erosion',
          prompt: '昼と夜の気温の差などで、岩石の表面がもろくなり、くずれていくことを何という？',
          options: ['風化', '侵食', '運搬'],
          answer: 'a',
          explanation: '気温の変化や水のはたらきで、岩石が表面からもろくなりくずれることを風化といいます。流れる水がけずるのは侵食です。',
          hint: '水の流れがなくても起こる変化だよ。',
        }),
        fill({
          id: 'st-erosion-k2', concept: 'st-erosion',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '流れる水には、岩石をけずる[b1]、土砂を運ぶ[b2]、土砂を積もらせる堆積の 3 つのはたらきがある。',
          blanks: [
            word('b1', ['侵食', '運搬', '風化'], '侵食'),
            word('b2', ['侵食', '運搬', '風化'], '運搬'),
          ],
          explanation: '流れる水には、けずる侵食、運ぶ運搬、積もらせる堆積の 3 つのはたらきがあります。風化は流れる水のはたらきではありません。',
          hint: '「けずる」「運ぶ」「積もらせる」の順だよ。',
        }),
        choice({
          id: 'st-erosion-k3', concept: 'st-erosion',
          prompt: '川が海に流れこむ河口付近に、運ばれた土砂が積もってできる地形はどれ？',
          options: ['V字谷', '扇状地', '三角州'],
          answer: 'c',
          explanation: '河口付近では流れがゆるやかになり、土砂が積もって三角州ができます。扇状地は山から平地に出たところ、V字谷は山の中にできます。',
          hint: '河口にできる、三角形に近い形の土地だよ。',
        }),
      ],
    },
    {
      id: 'st-grain', title: '粒の大きさと堆積する場所', basic: 'st-erosion', lessonStageId: 'strata-1',
      checkPool: [
        choice({
          id: 'st-grain-k1', concept: 'st-grain',
          prompt: 'れき・砂・泥を、粒の大きいものから順に並べたものはどれ？',
          options: ['れき → 砂 → 泥', '砂 → れき → 泥', '泥 → 砂 → れき'],
          answer: 'a',
          explanation: '粒の大きさは、れき（2 mm 以上）＞ 砂 ＞ 泥（0.06 mm 以下）の順です。',
          hint: 'いちばん大きいのは 2 mm 以上の粒だったね。',
        }),
        fill({
          id: 'st-grain-k2', concept: 'st-grain',
          prompt: '空らんに入る数を入れよう。',
          text: 'れきと砂は、粒の直径[b1]を境にして区別する。',
          blanks: [number('b1', 2, 0, 'mm')],
          explanation: '直径 2 mm 以上の粒がれき、それより小さい粒が砂（0.06 mm より大きいもの）です。',
          hint: 'れきは直径何 mm 以上だったかな。',
        }),
        choice({
          id: 'st-grain-k3', concept: 'st-grain',
          prompt: '河口から遠く離れた沖の海底に、積もりやすいのはどれ？',
          options: ['れき', '砂', '泥'],
          answer: 'c',
          explanation: '泥は粒が小さく軽いので、しずみにくく、沖まで運ばれて積もります。れきは河口の近くに積もります。',
          hint: 'いちばん遠くまで運ばれる粒はどれか考えよう。',
        }),
      ],
    },
    {
      id: 'st-sedimentary', title: '堆積岩の種類', basic: 'st-grain', lessonStageId: 'strata-2',
      checkPool: [
        choice({
          id: 'st-sedimentary-k1', concept: 'st-sedimentary',
          prompt: '凝灰岩の粒の形として正しいものはどれ？',
          options: ['丸みをおびている', '角ばっている', '粒が見えない'],
          answer: 'b',
          explanation: '凝灰岩は火山灰などが積もって固まった岩石で、流れる水に運ばれていないので粒が角ばっています。',
          hint: '流れる水で運ばれたかどうかを考えよう。',
        }),
        choice({
          id: 'st-sedimentary-k2', concept: 'st-sedimentary',
          prompt: '石灰岩とチャートを見分ける方法として正しいものはどれ？',
          options: ['うすい塩酸をかけて、あわが出るほうが石灰岩', 'うすい塩酸をかけて、あわが出るほうがチャート', '水に入れて、うくほうが石灰岩'],
          answer: 'a',
          explanation: '石灰岩にうすい塩酸をかけると二酸化炭素のあわが出ますが、チャートではあわが出ません。チャートはとてもかたいことでも見分けられます。',
          hint: '二酸化炭素が出るのは、生物の殻などからできた石灰岩だったね。',
        }),
        fill({
          id: 'st-sedimentary-k3', concept: 'st-sedimentary',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '砂が固まってできた岩石を[b1]、泥が固まってできた岩石を[b2]という。',
          blanks: [
            word('b1', ['れき岩', '砂岩', '泥岩'], '砂岩'),
            word('b2', ['れき岩', '砂岩', '泥岩'], '泥岩'),
          ],
          explanation: 'れきが固まるとれき岩、砂が固まると砂岩、泥が固まると泥岩です。粒の大きさで名前が決まります。',
          hint: 'もとの粒の名前が、岩石の名前に入っているよ。',
        }),
      ],
    },
    {
      id: 'st-fossil', title: '示相化石と示準化石', basic: null, lessonStageId: 'strata-3',
      checkPool: [
        choice({
          id: 'st-fossil-k1', concept: 'st-fossil',
          prompt: '次のうち、示相化石の例として正しいものはどれ？',
          options: ['サンゴの化石からあたたかくて浅い海だったと分かる', 'アンモナイトの化石から中生代と分かる', 'サンヨウチュウの化石から古生代と分かる'],
          answer: 'a',
          explanation: '当時の環境が分かるのが示相化石です。サンゴの化石からは、あたたかくて浅い海だったことが分かります。時代が分かるアンモナイトやサンヨウチュウは示準化石です。',
          hint: '「環境」が分かるのか、「時代」が分かるのかで分けよう。',
        }),
        choice({
          id: 'st-fossil-k2', concept: 'st-fossil',
          prompt: 'フズリナの化石が見つかった地層は、いつの時代に積もったと考えられる？',
          options: ['古生代', '中生代', '新生代'],
          answer: 'a',
          explanation: 'フズリナは、サンヨウチュウと同じく古生代の示準化石です。',
          hint: 'サンヨウチュウと同じ時代だよ。',
        }),
        fill({
          id: 'st-fossil-k3', concept: 'st-fossil',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'アンモナイトや恐竜の化石は、地層が積もった時代を知る手がかりになるので[b1]で、[b2]の地層から見つかる。',
          blanks: [
            word('b1', ['示相化石', '示準化石'], '示準化石'),
            word('b2', ['古生代', '中生代', '新生代'], '中生代'),
          ],
          explanation: 'アンモナイトや恐竜は、中生代に栄えた生物です。時代を知る手がかりになるので示準化石です。',
          hint: '時代が分かる化石の名前と、アンモナイトの時代を思い出そう。',
        }),
      ],
    },
    {
      id: 'st-column', title: '柱状図とかぎ層', basic: 'st-sedimentary', lessonStageId: 'strata-4',
      checkPool: [
        choice({
          id: 'st-column-k1', concept: 'st-column',
          prompt: '離れた地点の地層を比べるときの目印（かぎ層）として、よく使われるのはどれ？',
          options: ['凝灰岩の層', '表面の土', 'どこにでもある砂岩の層'],
          answer: 'a',
          explanation: '凝灰岩の層は、火山灰が短い期間に広い範囲に降り積もってできるので、かぎ層としてよく使われます。',
          hint: '火山灰からできた層を思い出そう。',
        }),
        choice({
          id: 'st-column-k2', concept: 'st-column',
          prompt: '上下の逆転がない柱状図で、いちばん新しい層はどれ？',
          options: ['いちばん上の層', 'いちばん下の層', 'いちばん厚い層'],
          answer: 'a',
          explanation: '地層は下から順に積もるので、いちばん上の層が最後に積もった、いちばん新しい層です。',
          hint: '最後に積もるのはどこか考えよう。',
        }),
        fill({
          id: 'st-column-k3', concept: 'st-column',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '下から 泥岩 → 砂岩 → れき岩 と重なっている地層では、上の層ほど粒が[b1]なっているので、この場所は河口に[b2]なったと考えられる。',
          blanks: [
            word('b1', ['大きく', '小さく'], '大きく'),
            word('b2', ['近く', '遠く'], '近く'),
          ],
          explanation: 'れきは河口の近くに積もります。上へ行くほど粒が大きくなっているので、この場所は河口に近くなった（海が浅くなった）と考えられます。',
          hint: 'れきは、河口の近くと沖のどちらに積もるかな。',
        }),
      ],
    },
    {
      id: 'st-deform', title: 'しゅう曲・断層・隆起', basic: 'st-column', lessonStageId: 'strata-4',
      checkPool: [
        choice({
          id: 'st-deform-k1', concept: 'st-deform',
          prompt: '土地がもち上がることを何という？',
          options: ['隆起', '沈降', '堆積'],
          answer: 'a',
          explanation: '土地がもち上がることを隆起、しずむことを沈降といいます。海でできた地層が陸地で見られるのは、隆起したからです。',
          hint: '「隆」はもり上がるという意味だよ。',
        }),
        choice({
          id: 'st-deform-k2', concept: 'st-deform',
          prompt: '地層が切れずに、波のように曲がっているものを何という？',
          options: ['断層', 'しゅう曲', 'かぎ層'],
          answer: 'b',
          explanation: '地層が押されて、切れずに曲がったものがしゅう曲です。切れてずれたものは断層です。',
          hint: '切れているか、曲がっているかで区別しよう。',
        }),
        fill({
          id: 'st-deform-k3', concept: 'st-deform',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '地層に大きな力がはたらき、押されて曲がったものを[b1]、切れてずれたものを[b2]という。',
          blanks: [
            word('b1', ['しゅう曲', '断層', '沈降'], 'しゅう曲'),
            word('b2', ['しゅう曲', '断層', '沈降'], '断層'),
          ],
          explanation: '曲がったものがしゅう曲、ずれたものが断層です。どちらも、大地に大きな力がはたらいた証拠です。',
          hint: '「曲がる」と「ずれる」に合う言葉を選ぼう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'strata',
    title: '地層と大地の変化',
    mascot: 'D',   // 担当の先生（もくもく先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'form', title: '地層のでき方', order: 1, stages: [strata1, strata2] },
      { id: 'history', title: '地層から読み取る', order: 2, stages: [strata3, strata4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
