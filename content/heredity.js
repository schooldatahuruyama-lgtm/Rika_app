// 「生命の連続性」教材データ（中学3年 理科）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通指示 .ai-tasks/20261104-170000_単元教材の共通指示.md）。
// 2 領域 × 2 ステージ（細胞分裂と生殖・遺伝と進化）と、概念 5 つ（id は単元の接頭辞 he- を付けて全単元で一意にする）。
// 領域 3「ミニプリント」（he-miniprint）: 先生のミニプリントの問題を書き直したステージ heredity-mp1〜heredity-mp5（.ai-tasks/20261106-130000_ミニプリント反映_共通.md）。
// 領域 4「ドリル」（heredity-drill）: 学習プリントのテーマに合わせて自作したステージ heredity-dr1〜heredity-dr6（.ai-tasks/20261121-152500_ドリル問題_共通.md）。
// 図（scene）の item は js/figures.js の汎用の部品で描く（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// 解説文の **語句** は大切な言葉（用語）。term: true の問題は、その用語を聞く用語問題。
(function (root) {
  'use strict';

  // ---- 書きやすくするための小さな道具 ----

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

  // ---- 生物の図の部品（汎用の部品を組み合わせる） ----

  // 引き出し線（細い点線）
  function leader(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'gray', width: 1, dashed: true };
  }

  // ---- 写真ふうの画像の上に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----

  // 画像（場面いっぱい）。src は assets/images/heredity/<カード id>.jpg
  function photo(id) { return { type: 'image', src: 'assets/images/heredity/' + id + '.jpg' }; }
  // 写真の上の引き出し線（濃い実線）
  function pin(x1, y1, x2, y2) { return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 }; }
  // 白い下地つきの文字。o で size・anchor・bold・color を上書きする（size の既定 14）
  function tag(x, y, text, o) { return Object.assign({ type: 'text', x, y, text, size: 14, bg: true }, o); }

  // 染色体 1 本（紫の太い線）
  function chrom(x1, y1, x2, y2, width) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'purple', width: width || 4 };
  }

  // 体細胞分裂の 1 段階（根の先端の細胞。52×52 の四角）。(cx, cy) が中心。
  // step 0 分裂前（核）、1 核の中に染色体が現れる、2 染色体が中央に並ぶ、3 両端に分かれる、4 しきりができて 2 つの細胞
  function divCell(cx, cy, step) {
    const items = [{ type: 'rect', x: cx - 26, y: cy - 26, width: 52, height: 52, rx: 4, fill: 'lightgreen', stroke: 'green' }];
    if (step === 0) items.push({ type: 'circle', x: cx, y: cy, r: 11, fill: 'purple', stroke: 'line' });
    if (step === 1) {
      items.push({ type: 'circle', x: cx, y: cy, r: 18, fill: 'white', stroke: 'line' });
      [[-12, -10, -5, -2], [3, -12, 10, -5], [-11, 4, -4, 11], [4, 3, 11, 10]]
        .forEach(([a, b, c, d]) => items.push(chrom(cx + a, cy + b, cx + c, cy + d)));
    }
    if (step === 2) [-15, -5, 5, 15].forEach(dy => items.push(chrom(cx - 6, cy + dy, cx + 6, cy + dy)));
    if (step === 3) {
      [-15, -5, 5, 15].forEach(dy => {
        items.push(chrom(cx - 20, cy + dy, cx - 13, cy + dy));
        items.push(chrom(cx + 13, cy + dy, cx + 20, cy + dy));
      });
    }
    if (step === 4) {
      items.push({ type: 'line', points: [[cx, cy - 26], [cx, cy + 26]], color: 'green', width: 2 });
      items.push({ type: 'circle', x: cx - 13, y: cy, r: 7, fill: 'purple', stroke: 'line' });
      items.push({ type: 'circle', x: cx + 13, y: cy, r: 7, fill: 'purple', stroke: 'line' });
    }
    return items;
  }

  // 細胞の中の 4 本の染色体（長い 2 本・短い 2 本）。doubled: true で複製されたもの（2 本ずつ並ぶ）
  function chromRow(cx, cy, doubled) {
    const out = [];
    [[-15, 11], [-5, 6], [5, 11], [15, 6]].forEach(([dx, h]) => {
      if (doubled) {
        out.push(chrom(cx + dx - 2, cy - h, cx + dx - 2, cy + h, 3));
        out.push(chrom(cx + dx + 2, cy - h, cx + dx + 2, cy + h, 3));
      } else {
        out.push(chrom(cx + dx, cy - h, cx + dx, cy + h));
      }
    });
    return out;
  }

  // 染色体を n 本（2・4・8）もつ細胞。(cx, cy) が中心、半径 r。長い染色体と短い染色体が同じ数ずつ
  function chromCell(cx, cy, r, n) {
    const items = [{ type: 'circle', x: cx, y: cy, r, fill: 'white', stroke: 'line' }];
    const rows = n > 4 ? [-8, 8] : [0];
    const per = n / rows.length;
    rows.forEach(dy => {
      for (let i = 0; i < per; i++) {
        const dx = (i - (per - 1) / 2) * 9;
        const half = i % 2 === 0 ? (rows.length > 1 ? 5 : 9) : (rows.length > 1 ? 3 : 5);
        items.push(chrom(cx + dx, cy + dy - half, cx + dx, cy + dy + half));
      }
    });
    return items;
  }

  // 根の先端をたてに切った模式図。中心の x が cx。根もと y 14 → 先端 y 232。
  // 細胞の段（上から）: 大きくなった細胞 14〜96、のびている細胞 96〜160、160〜172、
  // 小さい細胞がぎっしり並ぶ部分（分裂がさかん）172〜208（中心 y 190）、先を守る部分（うすい茶色）208〜232
  const ROOT_ROWS = [[14, 27], [41, 27], [68, 28], [96, 26], [122, 22], [144, 16], [160, 12], [172, 9], [181, 9], [190, 9], [199, 9]];
  function rootItems(cx) {
    const items = [
      { type: 'polygon', points: [[cx - 20, 208], [cx + 20, 208], [cx + 16, 222], [cx, 232], [cx - 16, 222]], fill: 'sand', stroke: 'brown' },
      { type: 'rect', x: cx - 20, y: 14, width: 40, height: 194, fill: 'lightgreen', stroke: 'green' },
      { type: 'line', points: [[cx, 14], [cx, 208]], color: 'green', width: 1 },
    ];
    ROOT_ROWS.forEach(([y, h], i) => {
      if (i > 0) items.push({ type: 'line', points: [[cx - 20, y], [cx + 20, y]], color: 'green', width: 1 });
      items.push({ type: 'circle', x: cx - 10, y: y + h / 2, r: 2.5, fill: 'purple', stroke: 'none' });
      items.push({ type: 'circle', x: cx + 10, y: y + h / 2, r: 2.5, fill: 'purple', stroke: 'none' });
    });
    return items;
  }

  // 体細胞分裂の途中の 4 つの細胞（順番をばらばらにした図）。左の A は分裂前。
  // ア: 両端に分かれる（step 3）、イ: 染色体が現れる（step 1）、ウ: しきりができる（step 4）、エ: 中央に並ぶ（step 2）
  // 順番は図に書かない。選ぶ場所は各細胞の下（細胞の中の線と重ねない）
  const DIVISION_Q = scene([
    { type: 'text', x: 160, y: 30, text: '根の先端の細胞（模式図）', size: 13, anchor: 'middle' },
    ...divCell(34, 80, 0),
    ...divCell(100, 80, 3),
    ...divCell(162, 80, 1),
    ...divCell(224, 80, 4),
    ...divCell(286, 80, 2),
    { type: 'text', x: 34, y: 150, text: 'A', size: 16, anchor: 'middle', bold: true },
    { type: 'text', x: 34, y: 170, text: '分裂前', size: 12, anchor: 'middle' },
    { type: 'region', id: 'r1', x: 100, y: 150, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 162, y: 150, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 224, y: 150, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 286, y: 150, r: 22, label: 'エ' },
  ]);

  // 親の体細胞（染色体 4 本）と、染色体の数がちがう 3 つの細胞（ア 4 本、イ 2 本、ウ 8 本）。本数は図に書かない
  const CHROM_COUNT_Q = scene([
    ...chromCell(56, 96, 36, 4),
    { type: 'text', x: 56, y: 156, text: '親の体細胞', size: 13, anchor: 'middle' },
    { type: 'line', points: [[106, 30], [106, 210]], color: 'gray', width: 1, dashed: true },
    ...chromCell(150, 90, 24, 4),
    ...chromCell(210, 90, 24, 2),
    ...chromCell(270, 90, 24, 8),
    { type: 'region', id: 'r1', x: 150, y: 160, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 210, y: 160, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 270, y: 160, r: 22, label: 'ウ' },
  ]);

  // しわのある種子（ふちがでこぼこの丸）
  function wrinkled(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = i * Math.PI / 18;
      const rr = i % 3 === 0 ? r - 5 : r - (i % 3 === 1 ? 1 : 2);
      pts.push([Math.round(cx + rr * Math.cos(a)), Math.round(cy + rr * Math.sin(a))]);
    }
    return { type: 'polygon', points: pts, fill: 'yellow', stroke: 'line' };
  }
  function roundPea(cx, cy, r) { return { type: 'circle', x: cx, y: cy, r, fill: 'yellow', stroke: 'line' }; }

  // 遺伝子の組み合わせの表（どちらの親も Aa）。表の外のふちは生殖細胞の遺伝子。
  // マスの中心: 左上 (145, 92)、右上 (215, 92)、左下 (145, 144)、右下 (215, 144)。
  // cells が null のときはマスを空にする（問題用）。
  function punnett(cells) {
    const items = [
      { type: 'rect', x: 110, y: 30, width: 70, height: 36, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 180, y: 30, width: 70, height: 36, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 60, y: 66, width: 50, height: 52, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 60, y: 118, width: 50, height: 52, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 110, y: 66, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 180, y: 66, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 110, y: 118, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 180, y: 118, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'text', x: 145, y: 54, text: 'A', size: 18, anchor: 'middle', bold: true },
      { type: 'text', x: 215, y: 54, text: 'a', size: 18, anchor: 'middle', bold: true },
      { type: 'text', x: 85, y: 98, text: 'A', size: 18, anchor: 'middle', bold: true },
      { type: 'text', x: 85, y: 150, text: 'a', size: 18, anchor: 'middle', bold: true },
    ];
    if (cells) {
      [[145, 98], [215, 98], [145, 150], [215, 150]].forEach(([x, y], i) =>
        items.push({ type: 'text', x, y, text: cells[i], size: 18, anchor: 'middle' }));
    }
    return items;
  }
  const PUNNETT_Q = scene(punnett(null).concat([
    { type: 'text', x: 160, y: 198, text: 'どちらの親も Aa（子の代どうし）', size: 13, anchor: 'middle' },
    { type: 'text', x: 160, y: 222, text: '表の外の文字は、生殖細胞の遺伝子', size: 12, anchor: 'middle' },
    { type: 'region', id: 'r1', x: 145, y: 92, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 215, y: 92, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 145, y: 144, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 215, y: 144, r: 22, label: 'エ' },
  ]));

  // 時代の帯（x = 300 − 56 × 億年前。5 億年前 x 20、4 億年前 x 76、3 億年前 x 132、2 億年前 x 188、1.5 億年前 x 216、現在 x 300）
  function timeAxis() {
    const items = [{ type: 'line', points: [[20, 214], [300, 214]], color: 'ink', width: 2 }];
    [5, 4, 3, 2, 1].forEach(t => {
      const x = 300 - 56 * t;
      items.push({ type: 'line', points: [[x, 208], [x, 220]], color: 'ink', width: 2 });
      items.push({ type: 'text', x, y: 234, text: String(t), size: 12, anchor: 'middle' });
    });
    items.push({ type: 'line', points: [[300, 208], [300, 220]], color: 'ink', width: 2 });
    items.push({ type: 'text', x: 300, y: 234, text: '現在', size: 12, anchor: 'end' });
    return items;
  }
  function band(start, y, fill) {
    const x = 300 - 56 * start;
    return { type: 'rect', x, y: y - 11, width: 300 - x, height: 22, fill, stroke: 'line' };
  }

  // 帯の問題: 名前を書かない 4 本の帯。上から ハチュウ類（3 億年前〜）、魚類（5 億年前〜）、ホニュウ類（2 億年前〜）、両生類（4 億年前〜）
  // 選ぶ場所は各帯の左はしから 26 右（ア (158, 40)、イ (46, 88)、ウ (214, 136)、エ (102, 184)）
  const BANDS_Q = scene([
    { type: 'text', x: 4, y: 14, text: '帯は、現れてから今まで（数字は億年前）', size: 12 },
    band(3, 40, 'sand'),
    band(5, 88, 'sky'),
    band(2, 136, 'pink'),
    band(4, 184, 'lightgreen'),
    ...timeAxis(),
    { type: 'region', id: 'r1', x: 158, y: 40, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 46, y: 88, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 214, y: 136, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 102, y: 184, r: 22, label: 'エ' },
  ]);

  // 骨の色: 肩・つけ根に近い 1 本（青）、その先の 2 本（緑）、先の骨の集まり（橙）。colored: false ですべて ink
  function bone(points, color, width) { return { type: 'line', points, color, width }; }
  function humanArm(cx, colored) {
    const c = k => (colored ? k : 'ink');
    return [
      bone([[cx, 36], [cx, 96]], c('blue'), 6),
      bone([[cx - 4, 102], [cx - 10, 156]], c('green'), 4),
      bone([[cx + 4, 102], [cx + 10, 156]], c('green'), 4),
      ...[[-13, -19, 186], [-7, -10, 196], [0, 0, 200], [7, 10, 196], [13, 19, 188]]
        .map(([sx, ex, ey]) => bone([[cx + sx, 164], [cx + ex, ey]], c('orange'), 3)),
    ];
  }

  // ================================================================
  // 領域 1: 細胞分裂と生殖
  // ================================================================

  // ---- ステージ life-1: 細胞分裂と成長（体細胞分裂の順、染色体の数、成長点、観察） ----
  const life1 = {
    id: 'life-1', areaId: 'he-cell', title: '細胞分裂と成長', minutes: 5, concepts: ['he-division'],
    lessons: [
      {
        id: 'life-1-c1',
        text: 'からだをつくる細胞が分かれて 2 つになることを**体細胞分裂**といいます。分裂が始まると、核の中に**染色体**というひものようなものが現れます。染色体は中央に並んだあと両端に分かれ、最後にしきりができて 2 つの細胞になります。',
        // 酢酸オルセイン液で染めたタマネギの根の先端の細胞（顕微鏡写真）。①〜⑤は分裂の進む順
        figure: scene([
          photo('life-1-c1'),
          pin(212, 18, 150, 36),
          tag(216, 22, '①分裂前', { size: 13 }),
          pin(212, 54, 187, 66),
          tag(216, 58, '④両端に', { size: 13 }),
          tag(229, 75, '分かれる', { size: 13 }),
          pin(212, 104, 147, 108),
          tag(216, 108, '③中央に並ぶ', { size: 13 }),
          pin(212, 136, 187, 142),
          tag(216, 140, '⑤2つに', { size: 13 }),
          tag(229, 157, '分かれる', { size: 13 }),
          pin(212, 192, 173, 182),
          tag(216, 196, '②染色体が', { size: 13 }),
          tag(229, 213, '現れる', { size: 13 }),
          tag(316, 236, '①〜⑤ 分裂の順', { size: 13, anchor: 'end' }),
        ]),
      },
      {
        id: 'life-1-c2',
        anim: 'he-chromosome-copy',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '染色体には、生物の形や性質を決める**遺伝子**がふくまれています。分裂の前に、それぞれの染色体は複製されて 2 本ずつになり、それが分かれて 2 つの細胞に入ります。そのため、分裂してできた細胞の染色体の数は、もとの細胞と同じです。',
        // 染色体の複製と、分かれたあとの数
        figure: scene([
          { type: 'circle', x: 54, y: 100, r: 34, fill: 'white', stroke: 'line' },
          ...chromRow(54, 100, false),
          { type: 'arrow', x1: 92, y1: 100, x2: 118, y2: 100, width: 2 },
          { type: 'circle', x: 156, y: 100, r: 34, fill: 'white', stroke: 'line' },
          ...chromRow(156, 100, true),
          { type: 'arrow', x1: 194, y1: 90, x2: 228, y2: 70, width: 2 },
          { type: 'arrow', x1: 194, y1: 110, x2: 228, y2: 138, width: 2 },
          { type: 'circle', x: 266, y: 60, r: 28, fill: 'white', stroke: 'line' },
          ...chromRow(266, 60, false),
          { type: 'circle', x: 266, y: 150, r: 28, fill: 'white', stroke: 'line' },
          ...chromRow(266, 150, false),
          { type: 'text', x: 54, y: 156, text: 'もとの細胞', size: 12, anchor: 'middle' },
          { type: 'text', x: 54, y: 174, text: '4 本', size: 12, anchor: 'middle' },
          { type: 'text', x: 156, y: 156, text: '複製されて', size: 12, anchor: 'middle' },
          { type: 'text', x: 156, y: 174, text: '2 本ずつに', size: 12, anchor: 'middle' },
          { type: 'text', x: 266, y: 200, text: '4 本ずつ', size: 12, anchor: 'middle' },
          { type: 'text', x: 266, y: 218, text: '（もとと同じ）', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'life-1-c3',
        text: '根では、先端に近い部分で細胞分裂がさかんに行われています。この部分を**成長点**といいます。分裂してふえた細胞が、それぞれ大きくなることで、根はのびていきます。成長点の細胞は小さく、根もとに近い細胞ほど大きくなっています。',
        // タマネギの根の先端をたてに切った顕微鏡写真（右はしが根の先）
        figure: scene([
          photo('life-1-c3'),
          pin(294, 46, 294, 100),
          tag(316, 40, '根の先を守る部分', { size: 13, anchor: 'end' }),
          pin(60, 46, 60, 94),
          tag(60, 40, '大きくなった細胞', { size: 13, anchor: 'middle' }),
          pin(236, 200, 236, 142),
          tag(236, 214, '成長点（分裂がさかん）', { size: 13, anchor: 'middle' }),
          { type: 'arrow', x1: 150, y1: 190, x2: 14, y2: 190, width: 2 },
          tag(14, 214, '根もとへ', { size: 13 }),
        ]),
      },
      {
        id: 'life-1-c4',
        text: '細胞分裂の観察では、根の先端を切りとり、うすい塩酸に入れてあたためます。こうすると、細胞どうしがはなれやすくなります。次に酢酸オルセイン液などの**染色液**で染色体を染め、カバーガラスをかけてそっとおしつぶすと、細胞が重ならず見やすくなります。',
        // 観察の手順
        figure: scene([
          { type: 'rect', x: 20, y: 18, width: 280, height: 38, rx: 6, fill: 'white', stroke: 'line', label: '① 根の先端を切りとる' },
          { type: 'rect', x: 20, y: 70, width: 280, height: 38, rx: 6, fill: 'white', stroke: 'line', label: '② うすい塩酸であたためる' },
          { type: 'rect', x: 20, y: 122, width: 280, height: 38, rx: 6, fill: 'white', stroke: 'line', label: '③ 染色液で染める' },
          { type: 'rect', x: 20, y: 174, width: 280, height: 38, rx: 6, fill: 'white', stroke: 'line', label: '④ カバーガラスをかけ、おしつぶす' },
          { type: 'text', x: 160, y: 232, text: '②は細胞をはなれやすくするため', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'life-1-w1', concept: 'he-division',
      prompt: '予想しよう。植物の根がのびるのは、どんなしくみだと思う？',
      options: ['先端に近い部分で細胞がふえ、ふえた細胞が大きくなる', '細胞の数は変わらず、1 つ 1 つの細胞が長くのびる', '根もとの部分に、新しい細胞がつけ足される'],
      answer: 'a',
      explanation: '根は、先端に近い部分で細胞分裂によって細胞の数がふえ、その細胞が大きくなることでのびます。このステージで、細胞分裂のようすを見ていこう。',
      hint: '細胞の「数」と「大きさ」の両方を考えてみよう。',
    }),
    problems: [
      choice({
        id: 'life-1-p1', concept: 'he-division',
        prompt: '体細胞分裂でできた 2 つの細胞の染色体の数は、分裂する前の細胞とくらべてどうなっている？',
        options: ['もとの細胞と同じ', 'もとの細胞の半分', 'もとの細胞の 2 倍'],
        answer: 'a',
        explanation: '分裂の前に染色体が複製されて 2 本ずつになり、それが 2 つの細胞に分かれて入ります。だから、体細胞分裂の前後で染色体の数は変わりません。半分になるのは、生殖細胞をつくる減数分裂のときです。',
        hint: '分裂の前に、染色体は複製されていたね。',
      }),
      fill({
        id: 'life-1-t1', concept: 'he-division', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'からだをつくる細胞が分かれて 2 つになることを[b1]という。分裂のとき、核の中に現れるひものようなものを[b2]という。',
        blanks: [
          word('b1', ['体細胞分裂', '減数分裂', '受精'], '体細胞分裂'),
          word('b2', ['染色体', '細胞膜', '葉緑体'], '染色体'),
        ],
        explanation: 'からだをつくる細胞（体細胞）の分裂が**体細胞分裂**、分裂のときに見えるひものようなものが**染色体**です。染色体には遺伝子がふくまれています。',
        hint: '「からだの細胞」の分裂、という名前だよ。',
      }),
      figureChoice({
        id: 'life-1-p2', concept: 'he-division',
        prompt: '根の先端の細胞の模式図です。A は分裂前の細胞、ア〜エは分裂の途中の細胞です（ア: 染色体が両端に分かれている、イ: 核の中に染色体が現れている、ウ: しきりができて 2 つに分かれている、エ: 染色体が中央に並んでいる）。A のあとに起こる変化を順にならべたとき、2 番目に来るのはどれ？',
        figure: DIVISION_Q,
        answer: 'r4',
        explanation: '体細胞分裂は、染色体が現れる（イ）→ 中央に並ぶ（エ）→ 両端に分かれる（ア）→ しきりができて 2 つになる（ウ）の順に進みます。2 番目は、染色体が中央に並んだエです。',
        hint: '染色体が現れてから、分かれる前に何が起こるかな。',
      }),
      drag({
        id: 'life-1-p3', concept: 'he-division',
        prompt: '根の先端をたてに切った模式図です（上が根もと、いちばん下のうすい茶色の部分は根の先を守るつくり）。細胞分裂がさかんに行われている部分に、青い印を上下に動かして置こう。',
        // 正解は小さい細胞がぎっしり並ぶ部分の中心 y = 190（172〜208）。のびている大きな細胞（y 160 より上）は 30px 以上、
        // 先を守る部分の中心（y 約 222）は 32px はなれる。不正解例 y = 110 は 80px はなれる
        figure: scene(rootItems(140).concat([
          { type: 'text', x: 176, y: 30, text: '↑ 根もとのほう', size: 13 },
          { type: 'circle', id: 'mark', x: 140, y: 34, r: 11, fill: 'blue', stroke: 'ink' },
        ])),
        draggable: { itemId: 'mark', axis: 'y' },
        target: { x: 140, y: 190 },
        samples: { correct: { x: 140, y: 190 }, wrong: { x: 140, y: 110 } },
        explanation: '根の先端に近い、小さな細胞がぎっしり並んでいる部分（成長点）で、細胞分裂がさかんに行われています。根もとに近い部分の細胞は、分裂したあとに大きくなった細胞です。',
        hint: '細胞が小さく、数が多い部分をさがそう。',
      }),
      choice({
        id: 'life-1-p4', concept: 'he-division',
        prompt: '細胞分裂の観察で、根の先端をうすい塩酸に入れてあたためるのはなぜ？',
        options: ['細胞どうしをはなれやすくするため', '染色体を赤く染めるため', '細胞分裂をさかんにするため'],
        answer: 'a',
        explanation: 'うすい塩酸であたためると、細胞どうしの結びつきが弱まり、1 つ 1 つの細胞がはなれやすくなります。染色体を染めるのは、そのあとに使う染色液のはたらきです。',
        hint: '塩酸のあとに、おしつぶして広げることを思い出そう。',
      }),
      choice({
        id: 'life-1-p5', concept: 'he-division',
        prompt: '多細胞生物のからだが成長するしくみとして、正しいものはどれ？',
        options: ['細胞分裂で細胞の数がふえ、ふえた細胞が大きくなる', '細胞の数は変わらず、細胞が大きくなるだけ', '細胞どうしが合体して、大きな細胞になる'],
        answer: 'a',
        explanation: '生物のからだは、細胞分裂で細胞の数がふえ、その 1 つ 1 つが大きくなることで成長します。「数がふえる」と「大きくなる」の両方がそろって成長します。',
        hint: '根の先端の小さい細胞と、根もとの大きい細胞を思い出そう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'life-1-r1', concept: 'he-division',
        prompt: '根の先端の細胞の模式図です。A は分裂前の細胞、ア〜エは分裂の途中の細胞です（ア: 染色体が両端に分かれている、イ: 核の中に染色体が現れている、ウ: しきりができて 2 つに分かれている、エ: 染色体が中央に並んでいる）。A のあとに起こる変化を順にならべたとき、3 番目に来るのはどれ？',
        figure: DIVISION_Q,
        answer: 'r1',
        explanation: '順番は、イ（染色体が現れる）→ エ（中央に並ぶ）→ ア（両端に分かれる）→ ウ（しきりができる）です。3 番目は、染色体が両端に分かれたアです。',
        hint: '中央に並んだ染色体は、次にどうなるかな。',
      }),
      choice({
        id: 'life-1-r2', concept: 'he-division',
        prompt: '細胞分裂の観察で、酢酸オルセイン液などの染色液を使うのはなぜ？',
        options: ['染色体（核）を染めて見やすくするため', '細胞どうしをはなれやすくするため', '細胞を大きくするため'],
        answer: 'a',
        explanation: '染色液は核や染色体をよく染めるので、分裂のようすが観察しやすくなります。細胞どうしをはなれやすくするのは、うすい塩酸のはたらきです。',
        hint: '「染める」ことで何が見やすくなるかな。',
      }),
      fill({
        id: 'life-1-r3', concept: 'he-division',
        prompt: '空らんに入る数を入れよう。',
        text: 'タマネギの根の細胞には、染色体が 16 本ある。この細胞が体細胞分裂をしてできた細胞 1 つの染色体の数は[b1]である。',
        blanks: [number('b1', 16, 0, '本')],
        explanation: '体細胞分裂では、複製された染色体が 2 つの細胞に等しく分かれるので、数はもとと同じ 16 本です。半分の 8 本にはなりません。',
        hint: '体細胞分裂の前後で、染色体の数は変わるかな。',
      }),
      choice({
        id: 'life-1-t2', concept: 'he-division', term: true,
        prompt: '次の説明に合う言葉はどれ？「根の先端に近く、細胞分裂がさかんに行われている部分」',
        options: ['成長点', '根毛', '維管束'],
        answer: 'a',
        explanation: '根の先端近くで細胞分裂がさかんな部分を**成長点**といいます。ここでふえた細胞が大きくなって、根がのびます。',
        hint: '「成長」に関係のある名前だよ。',
      }),
    ],
  };

  // ---- ステージ life-2: 有性生殖と無性生殖（無性生殖、生殖細胞と減数分裂、受精と発生、植物の受精） ----
  const life2 = {
    id: 'life-2', areaId: 'he-cell', title: '有性生殖と無性生殖', minutes: 5, concepts: ['he-reproduction'],
    lessons: [
      {
        id: 'life-2-c1',
        text: '生物が自分と同じ種類の子をつくることを**生殖**といいます。親のからだの一部が分かれて子になるふえ方を**無性生殖**といい、分裂、出芽、いもやさし木でふえる栄養生殖などがあります。子は親と同じ遺伝子を受けつぐので、形質も親と同じになります。',
        // 無性生殖の例（分裂するゾウリムシ・出芽するヒドラ・芽の出たジャガイモの写真）
        figure: scene([
          photo('life-2-c1'),
          tag(54, 172, '分裂', { size: 15, anchor: 'middle', bold: true }),
          tag(54, 192, '（ゾウリムシ）', { size: 13, anchor: 'middle' }),
          tag(160, 172, '出芽', { size: 15, anchor: 'middle', bold: true }),
          tag(160, 192, '（ヒドラ）', { size: 13, anchor: 'middle' }),
          tag(267, 172, '栄養生殖', { size: 15, anchor: 'middle', bold: true }),
          tag(267, 192, '（いも）', { size: 13, anchor: 'middle' }),
          tag(160, 228, '親のからだの一部が子になる', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'life-2-c2',
        anim: 'he-meiosis-fertilize',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '雄と雌がかかわるふえ方を**有性生殖**といいます。動物では精子と卵、植物では精細胞と卵細胞という**生殖細胞**がつくられます。生殖細胞は**減数分裂**でできるので、染色体の数がもとの半分です。精子と卵の核が合体する**受精**で、数はもとにもどります。',
        // 減数分裂と受精での染色体の数（4 本 → 2 本 → 受精で 4 本）
        figure: scene([
          { type: 'text', x: 40, y: 22, text: '親の細胞', size: 12, anchor: 'middle' },
          ...chromCell(40, 60, 26, 4),
          ...chromCell(40, 172, 26, 4),
          { type: 'arrow', x1: 70, y1: 60, x2: 98, y2: 60, width: 2 },
          { type: 'arrow', x1: 70, y1: 172, x2: 96, y2: 172, width: 2 },
          { type: 'text', x: 84, y: 120, text: '減数分裂', size: 12, anchor: 'middle' },
          ...chromCell(120, 60, 18, 2),
          ...chromCell(124, 172, 24, 2),
          { type: 'text', x: 120, y: 98, text: '精子（2 本）', size: 12, anchor: 'middle' },
          { type: 'text', x: 124, y: 214, text: '卵（2 本）', size: 12, anchor: 'middle' },
          { type: 'arrow', x1: 142, y1: 70, x2: 196, y2: 104, width: 2 },
          { type: 'arrow', x1: 152, y1: 160, x2: 196, y2: 130, width: 2 },
          { type: 'text', x: 168, y: 122, text: '受精', size: 12, anchor: 'middle' },
          ...chromCell(240, 116, 32, 4),
          { type: 'text', x: 240, y: 170, text: '受精卵（4 本）', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'life-2-c3',
        text: '**受精卵**は細胞分裂をくり返して細胞の数をふやします。細胞分裂を始めてから、自分で食物をとり始めるまでの子を**胚**といいます。カエルでは、胚がおたまじゃくしになり、やがて親のからだになります。受精卵から親と同じようなからだができるまでの過程を**発生**といいます。',
        // カエルの発生（受精卵 → 2 細胞 → 4 細胞 → 多くの細胞 → おたまじゃくし）の写真
        figure: scene([
          photo('life-2-c3'),
          tag(52, 112, '受精卵', { size: 13, anchor: 'middle' }),
          tag(158, 112, '2 細胞', { size: 13, anchor: 'middle' }),
          tag(267, 112, '4 細胞', { size: 13, anchor: 'middle' }),
          { type: 'arrow', x1: 95, y1: 52, x2: 116, y2: 52, width: 2 },
          { type: 'arrow', x1: 201, y1: 52, x2: 224, y2: 52, width: 2 },
          { type: 'line', points: [[226, 122], [110, 122], [94, 131]], color: 'ink', width: 2, arrow: true },
          { type: 'arrow', x1: 133, y1: 174, x2: 182, y2: 174, width: 2 },
          tag(84, 232, '多くの細胞', { size: 13, anchor: 'middle' }),
          tag(231, 232, 'おたまじゃくし', { size: 13, anchor: 'middle' }),
          tag(154, 206, '2細胞〜は胚', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'life-2-c4',
        text: '被子植物では、受粉すると花粉から**花粉管**がのびて、胚珠に向かいます。花粉管の中を運ばれた精細胞の核と、胚珠の中の卵細胞の核が合体して受精し、受精卵ができます。受精卵は胚になり、胚珠全体は種子になります。',
        // 砂糖水の寒天の上で花粉管をのばしたホウセンカの花粉（顕微鏡写真）
        figure: scene([
          photo('life-2-c4'),
          pin(212, 52, 152, 68),
          tag(216, 57, '花粉管'),
          // 花粉管が出ている粒（下の粒 (54, 140)）を指す。とちゅうの花粉管のない粒 (148, 107) と管の先 (112, 137) をよける
          { type: 'line', points: [[212, 114], [140, 124], [66, 139]], color: 'ink', width: 2 },
          tag(216, 119, '花粉'),
          tag(262, 140, 'この管の中を', { size: 13, anchor: 'middle' }),
          tag(262, 158, '精細胞が', { size: 13, anchor: 'middle' }),
          tag(262, 176, '運ばれ、', { size: 13, anchor: 'middle' }),
          tag(262, 194, '胚珠の', { size: 13, anchor: 'middle' }),
          tag(262, 212, '卵細胞と', { size: 13, anchor: 'middle' }),
          tag(262, 230, '受精する', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'life-2-w1', concept: 'he-reproduction',
      prompt: '予想しよう。ジャガイモのいもを植えて育てると、できるジャガイモの形質は、もとのいもの株とくらべてどうなると思う？',
      options: ['もとの株とすべて同じ形質になる', 'もとの株とはまったくちがう形質になる', '半分は同じで、半分はちがう形質になる'],
      answer: 'a',
      explanation: 'いもでふえるのは無性生殖なので、子は親と同じ遺伝子を受けつぎ、形質も親と同じになります。有性生殖とのちがいを、このステージで調べよう。',
      hint: 'いもは、親のからだの一部だね。',
    }),
    problems: [
      choice({
        id: 'life-2-p1', concept: 'he-reproduction',
        prompt: '次のうち、無性生殖のふえ方はどれ？',
        options: ['ジャガイモのいもから芽が出て新しい株になる', 'カエルの受精卵がおたまじゃくしになる', 'エンドウの花が受粉して種子ができる', 'メダカの雌が産んだ卵に雄が精子をかける'],
        answer: 'a',
        explanation: 'いもでふえるのは、親のからだの一部から子ができる無性生殖（栄養生殖）です。受精卵や種子ができるのは、生殖細胞がかかわる有性生殖です。',
        hint: '雄と雌（精子と卵）がかかわらないものをさがそう。',
      }),
      fill({
        id: 'life-2-t1', concept: 'he-reproduction', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '生殖細胞がつくられるときの、染色体の数が半分になる細胞分裂を[b1]という。精子と卵の核が合体することを[b2]という。',
        blanks: [
          word('b1', ['減数分裂', '体細胞分裂', '発生'], '減数分裂'),
          word('b2', ['受精', '受粉', '出芽'], '受精'),
        ],
        explanation: '染色体の数が半分になる分裂が**減数分裂**、精子と卵の核が合体することが**受精**です。受粉は、花粉がめしべの柱頭につくことなので、受精とは別のことです。',
        hint: '「数が減る」分裂という名前だよ。',
      }),
      figureChoice({
        id: 'life-2-p2', concept: 'he-reproduction',
        prompt: '左は、ある動物の親の体細胞で、染色体が 4 本あります。右のア〜ウは、染色体の数がちがう 3 つの細胞です。この親が減数分裂でつくる生殖細胞（精子や卵）にあたるのはどれ？ 図の染色体の数を数えて考えよう。',
        figure: CHROM_COUNT_Q,
        answer: 'r2',
        explanation: '減数分裂では染色体の数がもとの半分になるので、生殖細胞の染色体は 2 本です。2 本の細胞はイです。アは 4 本、ウは 8 本です。',
        hint: '減数分裂で、染色体の数はいくつになったかな。',
      }),
      fill({
        id: 'life-2-p3', concept: 'he-reproduction',
        prompt: '空らんに入る数を入れよう。',
        text: 'ヒトの体細胞には、染色体が 46 本ある。ヒトの卵の染色体の数は[b1]である。',
        blanks: [number('b1', 23, 0, '本')],
        explanation: '卵は減数分裂でつくられるので、染色体の数は体細胞の半分の 23 本です。精子も 23 本なので、受精卵は 46 本にもどります。',
        hint: '減数分裂で、数は何分の 1 になったかな。',
      }),
      choice({
        id: 'life-2-p4', concept: 'he-reproduction',
        prompt: 'カエルの発生の順として正しいものはどれ？',
        options: ['受精卵 → 細胞の数がふえる（胚）→ おたまじゃくし → カエル', 'おたまじゃくし → 受精卵 → 胚 → カエル', '受精卵 → おたまじゃくし → 胚 → カエル'],
        answer: 'a',
        explanation: '受精卵は細胞分裂をくり返して細胞の数をふやし、胚になります。胚はおたまじゃくしになり、やがて親と同じ形のカエルになります。',
        hint: 'まず受精卵が細胞分裂をくり返すところから始まるよ。',
      }),
      choice({
        id: 'life-2-p5', concept: 'he-reproduction',
        prompt: '有性生殖でできた子の形質が、親と同じにならないことがあるのはなぜ？',
        options: ['両親から半分ずつ遺伝子を受けつぐから', '親の遺伝子をすべてそのまま受けつぐから', '子は遺伝子を受けつがないから'],
        answer: 'a',
        explanation: '有性生殖では、子は父親と母親の両方から半分ずつ遺伝子を受けつぎます。遺伝子の組み合わせが親とちがうことがあるので、子の形質が親と同じにならないことがあります。',
        hint: '受精では、2 つの生殖細胞が合体していたね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'life-2-r1', concept: 'he-reproduction',
        prompt: '左は、ある動物の親の体細胞で、染色体が 4 本あります。右のア〜ウは、染色体の数がちがう 3 つの細胞です。この動物の受精卵にあたるのはどれ？ 図の染色体の数を数えて考えよう。',
        figure: CHROM_COUNT_Q,
        answer: 'r1',
        explanation: '精子と卵はそれぞれ 2 本の染色体をもち、受精すると 2 ＋ 2 ＝ 4 本で、親の体細胞と同じ数にもどります。4 本の細胞はアです。',
        hint: '2 本ずつの精子と卵が合体すると、何本になるかな。',
      }),
      choice({
        id: 'life-2-r2', concept: 'he-reproduction',
        prompt: '無性生殖でできた子の遺伝子は、親とくらべてどうなっている？',
        options: ['親とまったく同じ', '親の半分だけ', '親とまったくちがう'],
        answer: 'a',
        explanation: '無性生殖では、体細胞分裂で親のからだの一部が子になるので、子は親と同じ遺伝子をもちます。そのため、子の形質も親と同じになります。',
        hint: '無性生殖では、生殖細胞はつくられなかったね。',
      }),
      choice({
        id: 'life-2-r3', concept: 'he-reproduction',
        prompt: '被子植物の受精について、正しいものはどれ？',
        options: ['花粉管の中の精細胞の核と、胚珠の中の卵細胞の核が合体する', '花粉がめしべの柱頭につくことを受精という', '花粉管の中の卵細胞と、胚珠の中の精細胞が合体する'],
        answer: 'a',
        explanation: '受粉すると花粉から花粉管がのび、その中を精細胞が運ばれます。精細胞の核と、胚珠の中の卵細胞の核が合体するのが受精です。花粉が柱頭につくことは受粉といいます。',
        hint: '精細胞は花粉、卵細胞は胚珠の中にあるよ。',
      }),
      choice({
        id: 'life-2-t2', concept: 'he-reproduction', term: true,
        prompt: '次の説明に合う言葉はどれ？「受精卵が細胞分裂をくり返し、親と同じようなからだのつくりができていく過程」',
        options: ['発生', '進化', '遺伝'],
        answer: 'a',
        explanation: '受精卵から親と同じようなからだができていく過程を**発生**といいます。進化は長い年月をかけた変化、遺伝は形質が子に伝わることです。',
        hint: '1 つの受精卵から 1 つの個体ができるまでのことだよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 遺伝と進化
  // ================================================================

  // ---- ステージ life-3: 遺伝の規則性（形質・遺伝子・対立形質、純系、顕性と潜性、分離の法則、孫の代の比、DNA） ----
  const life3 = {
    id: 'life-3', areaId: 'he-gene', title: '遺伝の規則性', minutes: 5, concepts: ['he-mendel', 'he-ratio'],
    lessons: [
      {
        id: 'life-3-c1',
        text: '生物の形や性質を**形質**といい、親の形質が子に伝わることを**遺伝**といいます。形質のもとになるのが染色体にある**遺伝子**です。エンドウの種子の丸としわのように、どちらか一方しか現れない形質を**対立形質**、代々同じ形質が現れるものを**純系**といいます。',
        // エンドウの丸い種子としわのある種子（写真）
        figure: scene([
          photo('life-3-c1'),
          tag(79, 166, '丸い種子', { size: 15, anchor: 'middle', bold: true }),
          tag(240, 166, 'しわのある種子', { size: 15, anchor: 'middle', bold: true }),
          tag(160, 202, '丸 と しわ は 対立形質', { size: 15, anchor: 'middle', bold: true }),
          tag(160, 228, '（1 つの種子には、どちらか一方が現れる）', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'life-3-c2',
        text: '丸の純系（遺伝子 AA）としわの純系（aa）をかけ合わせると、子の遺伝子はすべて Aa になり、種子はすべて丸になります。子に現れる形質を**顕性形質**、子に現れない形質を**潜性形質**といいます。この場合は、丸が顕性、しわが潜性です。',
        // 純系どうしのかけ合わせ
        figure: scene([
          { type: 'text', x: 16, y: 22, text: '親（純系）', size: 13 },
          roundPea(80, 64, 24),
          wrinkled(240, 64, 26),
          { type: 'text', x: 80, y: 112, text: '丸　AA', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 72, text: '×', size: 22, anchor: 'middle' },
          { type: 'text', x: 240, y: 112, text: 'しわ　aa', size: 14, anchor: 'middle' },
          { type: 'line', points: [[160, 122], [160, 150]], color: 'ink', width: 2, arrow: true },
          { type: 'text', x: 16, y: 172, text: '子', size: 13 },
          roundPea(140, 186, 22),
          { type: 'text', x: 176, y: 182, text: 'Aa', size: 14 },
          { type: 'text', x: 176, y: 202, text: 'すべて丸', size: 14, bold: true },
        ]),
      },
      {
        id: 'life-3-c3',
        anim: 'he-segregation',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '子（Aa）が生殖細胞をつくるとき、減数分裂で対になっている遺伝子が分かれて、別々の生殖細胞に入ります。これを**分離の法則**といいます。生殖細胞には、A か a のどちらか一方だけが入ります。',
        // 分離の法則（Aa の細胞 → A の生殖細胞と a の生殖細胞）
        figure: scene([
          { type: 'circle', x: 70, y: 110, r: 40, fill: 'white', stroke: 'line' },
          chrom(60, 90, 60, 130, 5),
          chrom(80, 90, 80, 130, 5),
          { type: 'text', x: 46, y: 116, text: 'A', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 96, y: 116, text: 'a', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 70, y: 172, text: '子（Aa）の細胞', size: 13, anchor: 'middle' },
          { type: 'arrow', x1: 114, y1: 96, x2: 196, y2: 62, width: 2 },
          { type: 'arrow', x1: 114, y1: 124, x2: 196, y2: 158, width: 2 },
          { type: 'text', x: 150, y: 116, text: '減数分裂', size: 13, anchor: 'middle' },
          { type: 'circle', x: 232, y: 56, r: 26, fill: 'white', stroke: 'line' },
          chrom(226, 42, 226, 70, 5),
          { type: 'text', x: 244, y: 62, text: 'A', size: 16, anchor: 'middle', bold: true },
          { type: 'circle', x: 232, y: 164, r: 26, fill: 'white', stroke: 'line' },
          chrom(226, 150, 226, 178, 5),
          { type: 'text', x: 244, y: 170, text: 'a', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 232, y: 216, text: '生殖細胞', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'life-3-c4',
        text: '子（Aa）どうしをかけ合わせると、孫の遺伝子の組み合わせは AA : Aa : aa ＝ 1 : 2 : 1 になります。AA と Aa は丸なので、丸 : しわ ＝ 3 : 1 です。遺伝子の本体は **DNA**（デオキシリボ核酸）という物質です。',
        // 孫の代の遺伝子の組み合わせの表
        figure: scene(punnett(['AA', 'Aa', 'Aa', 'aa']).concat([
          { type: 'text', x: 160, y: 198, text: 'AA : Aa : aa ＝ 1 : 2 : 1', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: '丸 : しわ ＝ 3 : 1', size: 14, anchor: 'middle', bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'life-3-w1', concept: 'he-mendel',
      prompt: '予想しよう。エンドウの丸い種子の純系と、しわのある種子の純系をかけ合わせると、できる子の種子はどうなると思う？',
      options: ['すべて丸になる', 'すべてしわになる', '丸としわが半分ずつになる', '丸としわの中間の形になる'],
      answer: 'a',
      explanation: '子の種子はすべて丸になります。しわの形質はどこへいったのか、このステージで遺伝子の伝わり方を調べよう。',
      hint: '2 つの形質のうち、片方だけが現れるよ。',
    }),
    problems: [
      choice({
        id: 'life-3-p1', concept: 'he-mendel',
        prompt: '対立形質をもつ純系どうしをかけ合わせたとき、子に現れるほうの形質を何という？',
        options: ['顕性形質', '潜性形質', '対立形質'],
        answer: 'a',
        explanation: '子に現れる形質を顕性形質、子に現れない形質を潜性形質といいます。エンドウの種子では、丸が顕性形質、しわが潜性形質です。',
        hint: '「はっきり現れる」という意味の言葉だよ。',
      }),
      fill({
        id: 'life-3-t1', concept: 'he-mendel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '生殖細胞ができるとき、対になっている遺伝子が分かれて別々の生殖細胞に入ることを[b1]という。子に現れない形質を[b2]という。',
        blanks: [
          word('b1', ['分離の法則', '質量保存の法則', '対立形質'], '分離の法則'),
          word('b2', ['顕性形質', '潜性形質', '純系'], '潜性形質'),
        ],
        explanation: '対の遺伝子が分かれて別々の生殖細胞に入ることが**分離の法則**です。子に現れない形質が**潜性形質**で、孫の代になると再び現れることがあります。',
        hint: '「分かれる」ことを表す言葉をさがそう。',
      }),
      figureChoice({
        id: 'life-3-p2', concept: 'he-ratio',
        prompt: '子の代（Aa）どうしをかけ合わせたときの、遺伝子の組み合わせの表です。表の外の A・a は、それぞれの親の生殖細胞の遺伝子です。ア〜エのマスのうち、遺伝子の組み合わせが aa になるのはどれ？',
        figure: PUNNETT_Q,
        answer: 'r4',
        explanation: 'マスには、たての列の上の遺伝子と、横の行の左の遺伝子が 1 つずつ入ります。a と a が組み合わさる右下のエが aa で、しわの種子になります。',
        hint: '上の a と、左の a が交わるマスをさがそう。',
      }),
      fill({
        id: 'life-3-p3', concept: 'he-ratio',
        prompt: '空らんに入る数を入れよう。',
        text: '子の代（Aa）どうしをかけ合わせたら、孫の代の種子が 400 個できた。このうち、しわのある種子はおよそ[b1]個と考えられる。',
        blanks: [number('b1', 100, 0, '個')],
        explanation: '孫の代では、丸 : しわ ＝ 3 : 1 になります。しわは全体の 4 分の 1 なので、400 ÷ 4 ＝ 100 個です。',
        hint: '丸 : しわ ＝ 3 : 1 なので、しわは全体の何分の 1 かな。',
      }),
      choice({
        id: 'life-3-p4', concept: 'he-mendel',
        prompt: '丸の純系（AA）としわの純系（aa）をかけ合わせてできた子の遺伝子の組み合わせはどれ？',
        options: ['Aa', 'AA', 'aa', 'AA と aa が半分ずつ'],
        answer: 'a',
        explanation: '親 AA の生殖細胞には A、親 aa の生殖細胞には a が入るので、受精してできる子はすべて Aa です。A が顕性なので、子の種子はすべて丸になります。',
        hint: 'それぞれの親の生殖細胞には、どの遺伝子が入るかな。',
      }),
      fill({
        id: 'life-3-p5', concept: 'he-ratio',
        prompt: '空らんに入る数を入れよう。',
        text: '遺伝子の組み合わせが Aa どうしの親をかけ合わせたとき、できる子のうち丸い種子（AA と Aa）の割合は[b1]である。',
        blanks: [number('b1', 75, 0, '%')],
        explanation: '組み合わせは AA : Aa : aa ＝ 1 : 2 : 1 です。丸は AA と Aa で 4 つのうち 3 つなので、3 ÷ 4 ＝ 0.75、つまり 75 % です。',
        hint: '4 つのマスのうち、A をふくむマスはいくつかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'life-3-r1', concept: 'he-mendel',
        prompt: '「純系」の説明として正しいものはどれ？',
        options: ['自家受粉をくり返しても、親・子・孫と代々同じ形質が現れるもの', '顕性形質だけをもつもの', '雄と雌がかかわらずにふえるもの'],
        answer: 'a',
        explanation: '自家受粉をくり返しても、代々同じ形質が現れるものを純系といいます。純系の丸の遺伝子は AA、純系のしわの遺伝子は aa です。',
        hint: '「純」は、まじりけがないという意味だよ。',
      }),
      choice({
        id: 'life-3-r2', concept: 'he-mendel',
        prompt: '遺伝子の組み合わせが Aa の個体がつくる生殖細胞には、どの遺伝子が入る？',
        options: ['A か a のどちらか 1 つ', 'A と a の両方', 'いつも A だけ'],
        answer: 'a',
        explanation: '分離の法則により、対になっている A と a は減数分裂で分かれ、別々の生殖細胞に入ります。だから、生殖細胞には A か a のどちらか 1 つが入ります。',
        hint: '減数分裂で、対の遺伝子はどうなったかな。',
      }),
      figureChoice({
        id: 'life-3-r3', concept: 'he-ratio',
        prompt: '子の代（Aa）どうしをかけ合わせたときの、遺伝子の組み合わせの表です。表の外の A・a は、それぞれの親の生殖細胞の遺伝子です。ア〜エのマスのうち、遺伝子の組み合わせが AA になるのはどれ？',
        figure: PUNNETT_Q,
        answer: 'r1',
        explanation: '上の A と左の A が交わる左上のアが AA です。イとウは Aa、エは aa です。',
        hint: '上の A と、左の A が交わるマスをさがそう。',
      }),
      fill({
        id: 'life-3-r4', concept: 'he-ratio',
        prompt: '空らんに入る数を入れよう。',
        text: '遺伝子が Aa の丸い種子と、aa のしわのある種子をかけ合わせたら、子の種子が 600 個できた。このうち、丸い種子はおよそ[b1]個と考えられる。',
        blanks: [number('b1', 300, 0, '個')],
        explanation: 'Aa の生殖細胞は A と a、aa の生殖細胞は a だけなので、子は Aa : aa ＝ 1 : 1 になります。丸（Aa）は半分なので、600 ÷ 2 ＝ 300 個です。',
        hint: '表をかいて、Aa と aa の数をくらべよう。',
      }),
      choice({
        id: 'life-3-r5', concept: 'he-ratio',
        prompt: '子の代（Aa）どうしをかけ合わせたとき、孫の代の遺伝子の組み合わせの数の比はどれ？',
        options: ['AA : Aa : aa ＝ 1 : 2 : 1', 'AA : Aa : aa ＝ 1 : 1 : 1', 'AA : Aa : aa ＝ 3 : 0 : 1'],
        answer: 'a',
        explanation: '表をかくと、AA が 1 マス、Aa が 2 マス、aa が 1 マスになるので 1 : 2 : 1 です。丸（AA と Aa）としわ（aa）にまとめると 3 : 1 になります。',
        hint: '2 × 2 の表の 4 つのマスを数えよう。',
      }),
      choice({
        id: 'life-3-t2', concept: 'he-mendel', term: true,
        prompt: '次の説明に合う言葉はどれ？「エンドウの種子の丸としわのように、どちらか一方しか現れない 2 つの形質」',
        options: ['対立形質', '顕性形質', '純系'],
        answer: 'a',
        explanation: '丸としわのように、同時には現れない 2 つの形質を**対立形質**といいます。そのうち子に現れるほうが顕性形質です。',
        hint: '2 つの形質が「対」になっている、という意味の言葉だよ。',
      }),
    ],
  };

  // ---- ステージ life-4: 生物の進化（進化、セキツイ動物の出現順、水中から陸上へ、シソチョウ、相同器官） ----
  const life4 = {
    id: 'life-4', areaId: 'he-gene', title: '生物の進化', minutes: 4, concepts: ['he-evolution'],
    lessons: [
      {
        id: 'life-4-c1',
        text: '生物が長い年月をかけて代を重ねるあいだに、形やしくみが変化することを**進化**といいます。化石を調べると、セキツイ動物は、魚類、両生類、ハチュウ類、ホニュウ類と鳥類の順に地球上に現れたと考えられています。',
        // セキツイ動物のなかまが現れた時代（帯は現れてから今まで）
        figure: scene([
          { type: 'text', x: 4, y: 14, text: '帯は、現れてから今まで（数字は億年前）', size: 12 },
          band(5, 36, 'sky'),
          band(4, 70, 'lightgreen'),
          band(3, 104, 'sand'),
          band(2, 138, 'pink'),
          band(1.5, 172, 'white'),
          { type: 'text', x: 26, y: 41, text: '魚類', size: 13 },
          { type: 'text', x: 82, y: 75, text: '両生類', size: 13 },
          { type: 'text', x: 138, y: 109, text: 'ハチュウ類', size: 13 },
          { type: 'text', x: 194, y: 143, text: 'ホニュウ類', size: 13 },
          { type: 'text', x: 222, y: 177, text: '鳥類', size: 13 },
          ...timeAxis(),
        ]),
      },
      {
        id: 'life-4-c2',
        text: '魚類は水中で生活し、えらで呼吸します。両生類は、子は水中でえら呼吸、親は肺と皮ふで呼吸し、陸上でも生活できます。ハチュウ類は殻のある卵を陸上に産み、からだはうろこでおおわれ、乾燥に強くなりました。生物は水中から陸上へと生活の場を広げてきました。',
        // 水中から陸上へ
        figure: scene([
          { type: 'text', x: 160, y: 24, text: '水中から陸上へ', size: 14, anchor: 'middle', bold: true },
          { type: 'line', points: [[30, 36], [290, 36]], color: 'blue', width: 3, arrow: true },
          { type: 'text', x: 56, y: 76, text: '魚類', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 56, y: 100, text: 'えら呼吸', size: 12, anchor: 'middle' },
          { type: 'text', x: 156, y: 76, text: '両生類', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 156, y: 100, text: '子はえら・親は肺', size: 12, anchor: 'middle' },
          { type: 'text', x: 262, y: 76, text: 'ハチュウ類', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 262, y: 100, text: '殻のある卵・うろこ', size: 12, anchor: 'middle' },
          { type: 'rect', x: 10, y: 130, width: 110, height: 90, fill: 'sky', stroke: 'none' },
          { type: 'rect', x: 120, y: 130, width: 190, height: 90, fill: 'sand', stroke: 'none' },
          { type: 'text', x: 65, y: 182, text: '水中', size: 14, anchor: 'middle' },
          { type: 'text', x: 215, y: 182, text: '陸上', size: 14, anchor: 'middle' },
        ]),
      },
      {
        id: 'life-4-c3',
        text: 'シソチョウ（始祖鳥）の化石には、羽毛やつばさなど鳥類の特徴と、口の歯、つばさの先のつめ、骨のある長い尾などハチュウ類の特徴の両方が見られます。このことから、鳥類はハチュウ類から進化したと考えられています。',
        // シソチョウ（始祖鳥）の化石の写真。青は鳥類の特徴、茶はハチュウ類の特徴
        figure: scene([
          photo('life-4-c3'),
          pin(30, 125, 62, 106),
          tag(10, 140, '羽毛', { size: 13, color: 'blue', bold: true }),
          pin(276, 116, 250, 111),
          tag(278, 121, 'つばさ', { size: 13, color: 'blue', bold: true }),
          pin(148, 23, 127, 41),
          tag(150, 18, '口の歯', { size: 13, color: 'brown', bold: true }),
          pin(240, 23, 217, 39),
          tag(212, 18, 'つばさの先のつめ', { size: 13, color: 'brown', bold: true }),
          pin(222, 196, 194, 196),
          tag(226, 201, '骨のある長い尾', { size: 13, color: 'brown', bold: true }),
          tag(6, 218, '青: 鳥類の特徴', { size: 13, color: 'blue' }),
          tag(6, 236, '茶: ハチュウ類の特徴', { size: 13, color: 'brown' }),
        ]),
      },
      {
        id: 'life-4-c4',
        text: 'ヒトのうで、鳥のつばさ、クジラのひれは、形もはたらきもちがいますが、骨格の基本のつくりがよく似ています。このように、もとは同じ器官が変化したと考えられるものを**相同器官**といいます。相同器官は、生物が進化してきた証拠の 1 つです。',
        // 相同器官（同じ色の骨が、同じもとからできた骨）
        figure: scene([
          { type: 'text', x: 160, y: 18, text: '同じ色は、同じもとからできた骨', size: 12, anchor: 'middle' },
          ...humanArm(55, true),
          bone([[160, 36], [160, 92]], 'blue', 6),
          bone([[156, 98], [150, 150]], 'green', 4),
          bone([[164, 98], [170, 150]], 'green', 4),
          bone([[158, 158], [156, 212]], 'orange', 4),
          bone([[165, 158], [172, 196]], 'orange', 3),
          bone([[152, 158], [146, 178]], 'orange', 3),
          { type: 'polygon', points: [[254, 40], [278, 40], [292, 110], [298, 170], [286, 212], [262, 218], [240, 190], [236, 120]], fill: 'sky', stroke: 'line' },
          bone([[266, 48], [266, 82]], 'blue', 6),
          bone([[262, 88], [256, 114]], 'green', 4),
          bone([[270, 88], [276, 114]], 'green', 4),
          ...[[-14, -18, 180], [-7, -9, 200], [0, 0, 208], [7, 10, 200], [14, 20, 182]]
            .map(([sx, ex, ey]) => bone([[266 + sx, 122], [266 + ex, ey]], 'orange', 3)),
          { type: 'text', x: 55, y: 232, text: 'ヒトのうで', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 232, text: '鳥のつばさ', size: 13, anchor: 'middle' },
          { type: 'text', x: 266, y: 232, text: 'クジラのひれ', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'life-4-w1', concept: 'he-evolution',
      prompt: '予想しよう。セキツイ動物の 5 つのなかま（魚類・両生類・ハチュウ類・鳥類・ホニュウ類）のうち、地球上に最初に現れたのはどれだと思う？',
      options: ['魚類', '両生類', 'ハチュウ類', 'ホニュウ類'],
      answer: 'a',
      explanation: '化石の記録から、セキツイ動物では魚類が最初に現れたと考えられています。そのあとのなかまがどんな順に現れたか、このステージで見ていこう。',
      hint: '生物は、水中と陸上のどちらで先にくらしていたかな。',
    }),
    problems: [
      figureChoice({
        id: 'life-4-p1', concept: 'he-evolution',
        prompt: 'ア〜エの帯は、魚類・両生類・ハチュウ類・ホニュウ類のどれかが地球上に現れてから今までを表しています（名前は書いていません。帯の左はしが現れた時代）。このうち、セキツイ動物で最初に陸上で生活できるようになったなかまの帯はどれ？',
        figure: BANDS_Q,
        answer: 'r4',
        explanation: '最初に陸上で生活できるようになったのは両生類です。現れた順は、魚類（イ、約 5 億年前）→ 両生類（エ）→ ハチュウ類（ア）→ ホニュウ類（ウ）なので、2 番目に古いエが両生類です。',
        hint: '魚類の次に現れたなかまは、何だったかな。',
      }),
      fill({
        id: 'life-4-t1', concept: 'he-evolution', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '生物が長い年月をかけて代を重ねるあいだに変化することを[b1]という。形やはたらきはちがうが、もとは同じ器官だったと考えられるものを[b2]という。',
        blanks: [
          word('b1', ['進化', '発生', '遺伝'], '進化'),
          word('b2', ['相同器官', '感覚器官', '生殖細胞'], '相同器官'),
        ],
        explanation: '長い年月をかけた変化が**進化**、もとが同じ器官が**相同器官**です。ヒトのうでとクジラのひれのような相同器官は、進化の証拠の 1 つです。',
        hint: '「相同」は、もとが同じという意味だよ。',
      }),
      choice({
        id: 'life-4-p2', concept: 'he-evolution',
        prompt: 'シソチョウの特徴のうち、ハチュウ類の特徴はどれ？',
        options: ['口に歯があり、つばさの先につめがある', '全身が羽毛でおおわれている', '前あしがつばさになっている'],
        answer: 'a',
        explanation: '口の歯、つばさの先のつめ、骨のある長い尾はハチュウ類の特徴です。羽毛やつばさは鳥類の特徴です。両方をもつことから、鳥類はハチュウ類から進化したと考えられています。',
        hint: '今の鳥にはない特徴をさがそう。',
      }),
      choice({
        id: 'life-4-p3', concept: 'he-evolution',
        prompt: '次の組み合わせのうち、相同器官の組み合わせはどれ？',
        options: ['ヒトのうで・鳥のつばさ・クジラのひれ', 'チョウのはね・鳥のつばさ', 'ヒトの肺・魚のえら'],
        answer: 'a',
        explanation: 'ヒトのうで、鳥のつばさ、クジラのひれは、骨格の基本のつくりが同じで、もとは同じ器官だと考えられます。チョウのはねと鳥のつばさは、はたらきは似ていますが、つくりのもとがちがいます。',
        hint: '形やはたらきではなく、骨格のつくりが似ているものを選ぼう。',
      }),
      choice({
        id: 'life-4-p4', concept: 'he-evolution',
        prompt: '両生類の特徴のうち、水中から陸上への進化と関係が深いと考えられるのはどれ？',
        options: ['子は水中でえら呼吸をし、親は肺と皮ふで呼吸して陸上でも生活できる', '一生を水中でくらし、えらで呼吸する', '殻のある卵を陸上に産む'],
        answer: 'a',
        explanation: '両生類は、子のときは魚類のように水中でえら呼吸をし、親になると肺と皮ふで呼吸して陸上でも生活します。水中の生活と陸上の生活の両方の特徴をもっています。',
        hint: 'カエルの子と親のくらし方をくらべよう。',
      }),
      choice({
        id: 'life-4-p5', concept: 'he-evolution',
        prompt: 'ハチュウ類の卵が、殻でおおわれていることには、どんなよい点がある？',
        options: ['乾燥に強く、陸上に卵を産める', '水中で卵がういて流されやすい', '卵の数を多くできる'],
        answer: 'a',
        explanation: 'ハチュウ類の卵は殻でおおわれているので、乾燥に強く、陸上に産むことができます。両生類の卵には殻がなく、水中に産まれます。',
        hint: '陸上で卵が困ることは何かな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'life-4-r1', concept: 'he-evolution',
        prompt: '左はヒトのうでの骨で、青は肩につながる 1 本の骨、緑はその先の 2 本の骨、橙は手の骨です。右のクジラのひれの骨のうち、ヒトのうでの青い骨と同じもとからできたと考えられるのはどれ？（ア: つけ根の 1 本の骨、イ: その先の 2 本の骨、ウ: 先の細長い骨の集まり）',
        // クジラのひれの骨: つけ根 (220, 55)、その先の 2 本 (220, 110)、先の骨の集まり (220, 178)。選ぶ場所は右に引き出す
        figure: scene([
          ...humanArm(70, true),
          { type: 'polygon', points: [[206, 22], [234, 22], [252, 100], [258, 170], [244, 220], [214, 226], [190, 196], [186, 110]], fill: 'sky', stroke: 'line' },
          bone([[220, 30], [220, 80]], 'ink', 6),
          bone([[215, 90], [208, 130]], 'ink', 4),
          bone([[225, 90], [232, 130]], 'ink', 4),
          ...[[-14, -18, 196], [-7, -9, 212], [0, 0, 216], [7, 10, 210], [14, 20, 196]]
            .map(([sx, ex, ey]) => bone([[220 + sx, 140], [220 + ex, ey]], 'ink', 3)),
          leader(226, 55, 268, 55),
          leader(236, 110, 268, 110),
          leader(244, 178, 268, 178),
          { type: 'region', id: 'r1', x: 290, y: 55, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 290, y: 110, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 290, y: 178, r: 22, label: 'ウ' },
          { type: 'text', x: 70, y: 16, text: 'ヒトのうで', size: 13, anchor: 'middle' },
          { type: 'text', x: 220, y: 14, text: 'クジラのひれ', size: 13, anchor: 'middle' },
        ]),
        answer: 'r1',
        explanation: 'つけ根の 1 本の骨（ア）が、ヒトのうでの青い骨（上うでの骨）にあたります。形はちがっても、つけ根から 1 本、2 本、指の骨と並ぶ基本のつくりが同じです。',
        hint: 'からだにつながる、つけ根の骨を見くらべよう。',
      }),
      figureChoice({
        id: 'life-4-r2', concept: 'he-evolution',
        prompt: 'ア〜エの帯は、魚類・両生類・ハチュウ類・ホニュウ類のどれかが地球上に現れてから今までを表しています（名前は書いていません。帯の左はしが現れた時代）。このうち、ホニュウ類の帯はどれ？',
        figure: BANDS_Q,
        answer: 'r3',
        explanation: '4 つのなかまのうち、ホニュウ類はいちばんあとに現れました。帯の左はしがいちばん右にある（いちばん新しい）ウがホニュウ類です。',
        hint: '4 つのなかまが現れた順を思い出そう。',
      }),
      choice({
        id: 'life-4-r3', concept: 'he-evolution',
        prompt: 'シソチョウは、どのなかまとどのなかまの両方の特徴をもっている？',
        options: ['ハチュウ類と鳥類', '魚類と両生類', '両生類とホニュウ類'],
        answer: 'a',
        explanation: 'シソチョウには、羽毛やつばさ（鳥類の特徴）と、口の歯やつばさの先のつめ（ハチュウ類の特徴）があります。鳥類がハチュウ類から進化した証拠と考えられています。',
        hint: '羽毛があるのはどのなかまだったかな。',
      }),
    ],
  };

  // ================================================================
  // 領域 3: ミニプリント（先生が作ったミニプリントの問題を、このアプリの形に書き直したもの）
  // プリントの文字起こしは miniprint_3nen.md「生命の連続性」。文と図は自作で、プリントの文をそのまま写していない。
  // 1 ステージ ＝ プリント 2〜4 枚ぶん。学ぶ順（細胞分裂 → 生殖 → 受精と発生 → 遺伝のことば → 遺伝の規則性）に並べた。
  // ================================================================

  // ---- ミニプリント用の図の部品 ----

  // 受粉したあとのめしべの断面（模式図）。柱頭 (160, 38)、花粉 (150, 30)、花粉管（橙の線）、精細胞 (156, 150)、
  // 子房 (160, 180)、胚珠 (160, 190)、卵細胞 (160, 196)
  function pistilItems() {
    return [
      { type: 'ellipse', x: 160, y: 182, rx: 70, ry: 46, fill: 'lightgreen', stroke: 'green' },
      { type: 'rect', x: 150, y: 40, width: 20, height: 104, fill: 'lightgreen', stroke: 'green' },
      { type: 'ellipse', x: 160, y: 38, rx: 24, ry: 8, fill: 'green', stroke: 'green' },
      { type: 'ellipse', x: 160, y: 192, rx: 28, ry: 22, fill: 'white', stroke: 'green' },
      { type: 'circle', x: 160, y: 198, r: 8, fill: 'pink', stroke: 'ink' },
      { type: 'line', points: [[150, 32], [154, 80], [157, 140], [158, 176]], color: 'orange', width: 3 },
      { type: 'circle', x: 150, y: 28, r: 7, fill: 'yellow', stroke: 'ink' },
      { type: 'circle', x: 157, y: 150, r: 5, fill: 'purple', stroke: 'ink' },
    ];
  }

  // 無性生殖（左: 1 つの親が 2 つに分かれる）と有性生殖（右: 2 つの生殖細胞が受精する）を並べた図
  function twoWaysItems() {
    return [
      { type: 'rect', x: 8, y: 20, width: 146, height: 150, rx: 8, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 166, y: 20, width: 146, height: 150, rx: 8, fill: 'white', stroke: 'line' },
      { type: 'circle', x: 81, y: 58, r: 22, fill: 'lightgreen', stroke: 'green' },
      { type: 'arrow', x1: 70, y1: 84, x2: 52, y2: 112, color: 'gray', width: 2 },
      { type: 'arrow', x1: 92, y1: 84, x2: 110, y2: 112, color: 'gray', width: 2 },
      { type: 'circle', x: 46, y: 136, r: 20, fill: 'lightgreen', stroke: 'green' },
      { type: 'circle', x: 116, y: 136, r: 20, fill: 'lightgreen', stroke: 'green' },
      { type: 'circle', x: 200, y: 58, r: 10, fill: 'sky', stroke: 'blue' },
      { type: 'circle', x: 278, y: 58, r: 20, fill: 'pink', stroke: 'ink' },
      { type: 'arrow', x1: 210, y1: 72, x2: 230, y2: 112, color: 'gray', width: 2 },
      { type: 'arrow', x1: 266, y1: 80, x2: 248, y2: 112, color: 'gray', width: 2 },
      { type: 'circle', x: 239, y: 136, r: 20, fill: 'pink', stroke: 'ink' },
    ];
  }

  // 種子のようすの 3 つの枠（ア すべて丸、イ すべてしわ、ウ 丸 3 つとしわ 1 つ）。枠の中心 x 56・160・264
  function peaBoxes() {
    const items = [];
    [56, 160, 264].forEach((cx, k) => {
      items.push({ type: 'rect', x: cx - 48, y: 40, width: 96, height: 110, rx: 8, fill: 'white', stroke: 'line' });
      [[-22, 72], [22, 72], [-22, 118], [22, 118]].forEach(([dx, y], i) => {
        const isRound = k === 0 || (k === 2 && i < 3);
        items.push(isRound ? roundPea(cx + dx, y, 16) : wrinkled(cx + dx, y, 17));
      });
    });
    return items;
  }

  // 遺伝子の組み合わせの表（punnett と同じ位置）。top・left は表の外の遺伝子（上 2 つ・左 2 つ）、cells はマスの中（左上・右上・左下・右下）
  function crossTable(top, left, cells) {
    const items = [
      { type: 'rect', x: 110, y: 30, width: 70, height: 36, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 180, y: 30, width: 70, height: 36, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 60, y: 66, width: 50, height: 52, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 60, y: 118, width: 50, height: 52, fill: 'glass', stroke: 'line' },
      { type: 'rect', x: 110, y: 66, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 180, y: 66, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 110, y: 118, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'rect', x: 180, y: 118, width: 70, height: 52, fill: 'white', stroke: 'line' },
      { type: 'text', x: 145, y: 54, text: top[0], size: 18, anchor: 'middle', bold: true },
      { type: 'text', x: 215, y: 54, text: top[1], size: 18, anchor: 'middle', bold: true },
      { type: 'text', x: 85, y: 98, text: left[0], size: 18, anchor: 'middle', bold: true },
      { type: 'text', x: 85, y: 150, text: left[1], size: 18, anchor: 'middle', bold: true },
    ];
    [[145, 98], [215, 98], [145, 150], [215, 150]].forEach(([x, y], i) =>
      items.push({ type: 'text', x, y, text: cells[i], size: 18, anchor: 'middle' }));
    return items;
  }

  // DNA の二重らせんのモデル（2 本の鎖と、そのあいだの横の線）
  function helixItems() {
    const a = [], b = [], items = [];
    for (let i = 0; i <= 24; i++) {
      const x = 30 + 11 * i;
      const dy = Math.round(36 * Math.sin(i * Math.PI / 6));
      a.push([x, 110 - dy]);
      b.push([x, 110 + dy]);
      if (i % 2 === 1 && Math.abs(dy) > 8) items.push({ type: 'line', points: [[x, 110 - dy], [x, 110 + dy]], color: 'gray', width: 2 });
    }
    items.push({ type: 'line', points: a, color: 'blue', width: 4 });
    items.push({ type: 'line', points: b, color: 'orange', width: 4 });
    return items;
  }

  // ---- ステージ heredity-mp1: プリント 1 細胞分裂（細胞分裂の順番／細胞分裂の実験） ----
  const heredityMp1 = {
    id: 'heredity-mp1', areaId: 'he-cell', free: true, title: 'プリント 1: 細胞分裂の順番と観察', minutes: 5, concepts: ['he-division'],
    lessons: [
      {
        id: 'heredity-mp1-c1',
        anim: 'he-mitosis-steps',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: 'からだをつくる細胞が分かれることを**体細胞分裂**といいます。核の中にひものような**染色体**が現れ、細胞の中央に並び、両端に分かれて、しきりができて 2 つの細胞になります。染色体には、形質を決める**遺伝子**がふくまれています。',
        // 体細胞分裂の順番（左から右へ）
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '体細胞分裂の順番（植物の細胞）', size: 13, anchor: 'middle' },
          ...divCell(34, 96, 0), ...divCell(96, 96, 1), ...divCell(158, 96, 2), ...divCell(220, 96, 3), ...divCell(282, 96, 4),
          ...['分裂前', '染色体が', '中央に', '両端に', 'しきりが'].map((t, i) => ({ type: 'text', x: 34 + 62 * i, y: 150, text: t, size: 12, anchor: 'middle' })),
          ...['', '現れる', '並ぶ', '分かれる', 'できる'].map((t, i) => ({ type: 'text', x: 34 + 62 * i, y: 166, text: t, size: 12, anchor: 'middle' })),
          { type: 'arrow', x1: 30, y1: 196, x2: 290, y2: 196, color: 'gray', width: 2 },
          { type: 'text', x: 160, y: 222, text: '1 つの細胞が 2 つになる', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'heredity-mp1-c2',
        text: '細胞分裂の観察では、分裂がさかんな**根の先端**を使います。うすい塩酸に入れてあたためると、細胞どうしが離れやすくなります。染色液（**酢酸オルセイン液**など）をたらして 3 分ほど置き、カバーガラスをかけて、ろ紙の上からおしつぶします。',
        // 写真: 観察の手順 4 つ（2 段 × 2 列。顔は写さず手だけ）。左上 (7〜157, 30〜107) カッターで根の先端を切る、右上 (190〜315, 20〜117) 湯の入ったビーカーで試験管をあたためる、
        // 左下 (12〜157, 135〜222) スライドガラスの根にスポイトで染色液をたらす、右下 (172〜312, 135〜222) ろ紙の上から親指で真上からおしつぶす。上と段のあいだは少し白い余白
        figure: scene([
          photo('heredity-mp1-c2'),
          tag(6, 18, '① 根の先端を切りとる', { size: 13 }),
          tag(166, 18, '② 塩酸であたためる', { size: 13 }),
          tag(6, 130, '③ 染色液をたらす', { size: 13 }),
          tag(6, 152, '3 分ほど置く', { size: 13 }),
          tag(166, 130, '④ 上からおしつぶす', { size: 13 }),
          pin(200, 174, 218, 196), tag(194, 170, 'ろ紙', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'heredity-mp1-w1', concept: 'he-division',
      prompt: '予想しよう。タマネギの根で、細胞分裂がさかんに行われているのはどこだと思う？',
      options: ['根の先端に近い部分', '根もとに近い部分', '根のどこでも同じ'],
      answer: 'a',
      explanation: '根は、先端に近い部分で細胞分裂がさかんに行われ、ふえた細胞が大きくなってのびていきます。だから、観察には根の先端を使います。',
      hint: '根は、どこからのびていくかな。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-mp1-p1', concept: 'he-division',
        prompt: '根の先端の細胞の模式図です。A は分裂前の細胞、ア〜エは分裂の途中の細胞です（ア: 染色体が両端に分かれている、イ: 核の中に染色体が現れている、ウ: しきりができて 2 つに分かれている、エ: 染色体が中央に並んでいる）。A のすぐ次に起こる変化はどれ？',
        figure: DIVISION_Q,
        answer: 'r2',
        explanation: '体細胞分裂は、A（分裂前）→ イ（染色体が現れる）→ エ（中央に並ぶ）→ ア（両端に分かれる）→ ウ（しきりができる）の順に進みます。A の次はイです。',
        hint: '分裂が始まると、まず核の中に何が見えてくるかな。',
      }),
      fill({
        id: 'heredity-mp1-t1', concept: 'he-division', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '細胞分裂のとき、核の中に現れるひものようなものを[b1]という。この中には、形質を決める[b2]がふくまれている。',
        blanks: [
          word('b1', ['染色体', '細胞膜', '葉緑体'], '染色体'),
          word('b2', ['遺伝子', '細胞壁', '核'], '遺伝子'),
        ],
        explanation: '分裂のときに見えるひものようなものが**染色体**です。染色体には、形質を決める**遺伝子**がふくまれています。',
        hint: '染色液でよく染まる「体」だよ。',
      }),
      choice({
        id: 'heredity-mp1-p2', concept: 'he-division',
        prompt: 'からだをつくる細胞が 2 つに分かれる細胞分裂を何という？',
        options: ['体細胞分裂', '減数分裂', '受精'],
        answer: 'a',
        explanation: 'からだをつくる細胞（体細胞）の分裂を**体細胞分裂**といいます。分裂のあとの細胞の染色体の数は、もとの細胞と同じです。',
        hint: '「からだの細胞」の分裂という意味の名前だよ。',
      }),
      choice({
        id: 'heredity-mp1-p3', concept: 'he-division',
        prompt: '細胞分裂の観察で、根の先端をうすい塩酸に入れてあたためるのはなぜ？',
        options: ['細胞どうしを離れやすくして、重なりを少なくするため', '細胞に色をつけるため', '細胞分裂をさかんにするため'],
        answer: 'a',
        explanation: 'うすい塩酸であたためると、細胞どうしをくっつけているものがとけて、細胞が 1 つ 1 つ離れやすくなります。おしつぶしたとき、細胞が重ならずに広がって見やすくなります。',
        hint: 'あとで、カバーガラスの上からおしつぶすよ。',
      }),
      choice({
        id: 'heredity-mp1-p4', concept: 'he-division',
        prompt: '根の先端に染色液をたらしてから、カバーガラスをかけるまで、どのくらい待つとよい？',
        options: ['3 分ほど', '3 秒ほど', '30 秒ほど'],
        answer: 'a',
        explanation: '染色液がしみこんで核や染色体がよく染まるまでには、少し時間がかかります。3 分ほど置いてから、カバーガラスをかけます。',
        hint: '色がしっかりしみこむには、時間が必要だね。',
      }),
      choice({
        id: 'heredity-mp1-p5', concept: 'he-division',
        prompt: '細胞分裂の観察で、核や染色体を染めるのに使う液はどれ？',
        options: ['酢酸オルセイン液', 'ヨウ素液', 'BTB 溶液'],
        answer: 'a',
        explanation: '酢酸オルセイン液（または酢酸カーミン液）は、核や染色体を赤く染めます。ヨウ素液はデンプン、BTB 溶液は酸性・アルカリ性を調べる液です。',
        hint: '核や染色体を赤むらさき色に染める液だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'heredity-mp1-r1', concept: 'he-division',
        prompt: '根の先端の細胞の模式図です。A は分裂前の細胞、ア〜エは分裂の途中の細胞です（ア: 染色体が両端に分かれている、イ: 核の中に染色体が現れている、ウ: しきりができて 2 つに分かれている、エ: 染色体が中央に並んでいる）。分裂のいちばん最後のようすはどれ？',
        figure: DIVISION_Q,
        answer: 'r3',
        explanation: '両端に分かれた染色体のあいだにしきりができて、2 つの細胞に分かれます。最後はウです。そのあと、それぞれの細胞が大きくなります。',
        hint: '1 つの細胞が 2 つになったら、分裂は終わりだよ。',
      }),
      choice({
        id: 'heredity-mp1-r2', concept: 'he-division',
        prompt: 'タマネギの根で細胞分裂を観察するとき、根のどの部分を切りとって使う？',
        options: ['先端から 2〜3 mm の部分', '根もとから 2〜3 mm の部分', '根のまん中の部分'],
        answer: 'a',
        explanation: '細胞分裂がさかんなのは、根の先端に近い部分です。分裂している細胞をたくさん見るために、先端から 2〜3 mm の部分を切りとって使います。',
        hint: '分裂がさかんな部分を使うよ。',
      }),
      fill({
        id: 'heredity-mp1-r3', concept: 'he-division',
        prompt: '図の A・ア〜エ（ア: 染色体が両端に分かれている、イ: 核の中に染色体が現れている、ウ: しきりができて 2 つに分かれている、エ: 染色体が中央に並んでいる）を、体細胞分裂の進む順に並べよう。空らんに入る記号を選ぼう。',
        text: 'A → [b1] → [b2] → [b3] → ウ',
        blanks: [
          word('b1', ['ア', 'イ', 'エ'], 'イ'),
          word('b2', ['ア', 'イ', 'エ'], 'エ'),
          word('b3', ['ア', 'イ', 'エ'], 'ア'),
        ],
        figure: DIVISION_Q,
        explanation: '染色体が現れる（イ）→ 中央に並ぶ（エ）→ 両端に分かれる（ア）→ しきりができる（ウ）の順です。',
        hint: '染色体は、並んでから分かれるよ。',
      }),
    ],
  };

  // ---- ステージ heredity-mp2: プリント 2 無性生殖と有性生殖（無性生殖／有性生殖と無性生殖／減数分裂） ----
  const heredityMp2 = {
    id: 'heredity-mp2', areaId: 'he-cell', free: true, title: 'プリント 2: 無性生殖と有性生殖', minutes: 5, concepts: ['he-reproduction'],
    lessons: [
      {
        id: 'heredity-mp2-c1',
        text: '雌雄が関わらずに子をつくるふえ方を**無性生殖**といいます。ゾウリムシやミカヅキモはからだが 2 つに分かれる**分裂**で、サツマイモはいもから芽が出る**栄養生殖**でふえます。子は親と同じ染色体を受けつぐので、親と同じ形質になります。',
        // 写真（life-2-c1 の使い回し）: 左 分裂するゾウリムシ（顕微鏡の視野 (2〜110, 27〜137)）、中 出芽するヒドラ (110〜210, 12〜145)、
        // 右 芽の出たジャガイモ (213〜317, 25〜140)。下は白い余白
        figure: scene([
          photo('life-2-c1'),
          tag(54, 166, '分裂', { size: 15, anchor: 'middle', bold: true }),
          tag(54, 184, '（ゾウリムシ）', { size: 13, anchor: 'middle' }),
          tag(160, 166, '出芽', { size: 15, anchor: 'middle', bold: true }),
          tag(160, 184, '（ヒドラ）', { size: 13, anchor: 'middle' }),
          tag(267, 166, '栄養生殖', { size: 15, anchor: 'middle', bold: true }),
          tag(267, 184, '（いも）', { size: 13, anchor: 'middle' }),
          tag(160, 210, '無性生殖: 雌雄が関わらずに子をつくる', { size: 13, anchor: 'middle', bold: true }),
          tag(160, 230, '子は親と同じ染色体 → 親と同じ形質', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'heredity-mp2-c2',
        anim: 'he-meiosis-fertilize',   // 動く図（js/anim-bio.js。ミニプリントの使い回し）。figure は静止図として残す
        text: '生殖細胞（卵・精子など）がつくられるときは、染色体の数がもとの半分になる**減数分裂**が起こります。受精すると、両親から半分ずつ受けついで、もとの数にもどります。有性生殖では、子に両親とちがういろいろな形質が現れます。',
        // 減数分裂と受精で、染色体の数がどう変わるか（4 本 → 2 本 → 4 本）
        figure: scene([
          ...chromCell(40, 66, 26, 4), ...chromCell(40, 166, 26, 4),
          ...chromCell(140, 66, 18, 2), ...chromCell(140, 166, 18, 2),
          ...chromCell(262, 116, 30, 4),
          { type: 'arrow', x1: 70, y1: 66, x2: 116, y2: 66, color: 'gray', width: 2 },
          { type: 'arrow', x1: 70, y1: 166, x2: 116, y2: 166, color: 'gray', width: 2 },
          { type: 'arrow', x1: 162, y1: 74, x2: 230, y2: 104, color: 'gray', width: 2 },
          { type: 'arrow', x1: 162, y1: 158, x2: 230, y2: 128, color: 'gray', width: 2 },
          { type: 'text', x: 40, y: 24, text: '親（4 本）', size: 12, anchor: 'middle' },
          { type: 'text', x: 140, y: 24, text: '生殖細胞（2 本）', size: 12, anchor: 'middle' },
          { type: 'text', x: 262, y: 70, text: '受精卵（4 本）', size: 12, anchor: 'middle' },
          { type: 'text', x: 92, y: 226, text: '減数分裂', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 210, y: 226, text: '受精', size: 13, anchor: 'middle', bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'heredity-mp2-w1', concept: 'he-reproduction',
      prompt: 'ゾウリムシやミカヅキモは、どのようにして子孫を残す？',
      options: ['からだが 2 つに分かれる', '卵と精子が受精する', '種子をつくる'],
      answer: 'a',
      explanation: 'ゾウリムシやミカヅキモは、からだが 2 つに分かれる**分裂**でふえます。雌雄が関わらないので、無性生殖です。',
      hint: 'からだが 1 つの細胞でできている生物だよ。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-mp2-p1', concept: 'he-reproduction',
        prompt: '生物のふえ方を表した図です。左（ア）は 1 つの親が 2 つに分かれ、右（イ）は 2 つの細胞が合体して 1 つになっています。無性生殖を表しているのはア・イのどちら？',
        figure: scene(twoWaysItems().concat([
          { type: 'region', id: 'r1', x: 81, y: 202, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 239, y: 202, r: 22, label: 'イ' },
        ])),
        answer: 'r1',
        explanation: '無性生殖は、雌雄が関わらず、親のからだの一部が分かれて子になるふえ方です。1 つの親が 2 つに分かれるアが無性生殖です。生殖細胞が合体（受精）するイは有性生殖です。',
        hint: '雌雄が関わっていないのはどちらかな。',
      }),
      fill({
        id: 'heredity-mp2-t1', concept: 'he-reproduction', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '雌雄が関わらずに子をつくるふえ方を[b1]という。生殖細胞がつくられるとき、染色体の数が半分になる細胞分裂を[b2]という。',
        blanks: [
          word('b1', ['無性生殖', '有性生殖', '受精'], '無性生殖'),
          word('b2', ['減数分裂', '体細胞分裂', '発生'], '減数分裂'),
        ],
        explanation: '雌雄が関わらないふえ方が**無性生殖**、生殖細胞をつくるときの、染色体の数が半分になる分裂が**減数分裂**です。',
        hint: '数が「減る」分裂だよ。',
      }),
      choice({
        id: 'heredity-mp2-p2', concept: 'he-reproduction',
        prompt: 'サツマイモのいもを土にうめると、芽が出て新しい個体ができます。このようなふえ方を何という？',
        options: ['栄養生殖', '有性生殖', '受精'],
        answer: 'a',
        explanation: '植物のからだの一部（いも・茎・葉など）から新しい個体ができるふえ方を**栄養生殖**といいます。無性生殖の 1 つです。',
        hint: '養分をためたいもから、新しい個体ができるね。',
      }),
      choice({
        id: 'heredity-mp2-p3', concept: 'he-reproduction',
        prompt: 'ゾウリムシ・ミカヅキモ・サツマイモ・アサガオ・カエル・ヒトのうち、無性生殖を行う生物をすべて選んだものはどれ？',
        options: ['ゾウリムシ・ミカヅキモ・サツマイモ', 'アサガオ・カエル・ヒト', 'ゾウリムシ・カエル', 'すべての生物'],
        answer: 'a',
        explanation: 'ゾウリムシとミカヅキモは分裂で、サツマイモはいもからの栄養生殖でふえます。アサガオ（種子）・カエル・ヒトは、受精によって子をつくる有性生殖を行います。',
        hint: '分裂やいもでふえる生物をさがそう。',
      }),
      choice({
        id: 'heredity-mp2-p4', concept: 'he-reproduction',
        prompt: '無性生殖でできた子の染色体は、親の染色体と比べてどうなっている？',
        options: ['親とまったく同じ', '親の半分', '親の 2 倍'],
        answer: 'a',
        explanation: '無性生殖では、体細胞分裂で子ができるので、子は親と同じ染色体（同じ遺伝子）を受けつぎます。そのため、子の形質は親と同じになります。',
        hint: '無性生殖の子は、体細胞分裂でできるよ。',
      }),
      choice({
        id: 'heredity-mp2-p5', concept: 'he-reproduction',
        prompt: '有性生殖のよい点として正しいものはどれ？',
        options: ['いろいろな形質の子ができるので、環境が変わっても生き残る子がいる可能性が高い', '親とまったく同じ形質の子を、短い期間にたくさんつくれる', '相手がいなくても子をつくれる'],
        answer: 'a',
        explanation: '有性生殖では、両親の遺伝子を半分ずつ受けつぐので、いろいろな形質の子ができます。環境が変わったとき、その中に生き残れる子がいる可能性が高くなります。',
        hint: '両親から遺伝子を受けつぐと、子はどうなるかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'heredity-mp2-r1', concept: 'he-reproduction',
        prompt: '無性生殖のよい点として正しいものはどれ？',
        options: ['親と同じ形質の子を、確実に、短い期間でふやせる', 'いろいろな形質の子ができる', '両親の形質を組み合わせられる'],
        answer: 'a',
        explanation: '無性生殖では、子は親と同じ遺伝子を受けつぐので、親と同じ形質を確実に残せます。相手がいなくてもふえられるので、短い期間で数をふやせます。',
        hint: '子が親と同じ遺伝子をもつことの、よい点を考えよう。',
      }),
      choice({
        id: 'heredity-mp2-r2', concept: 'he-reproduction',
        prompt: '減数分裂でできた生殖細胞の染色体の数は、親の体細胞と比べてどうなっている？',
        options: ['半分', '同じ', '2 倍'],
        answer: 'a',
        explanation: '減数分裂では、対になっている染色体が分かれて別々の生殖細胞に入るので、染色体の数は体細胞の半分になります。',
        hint: '「減数」という名前から考えよう。',
      }),
      choice({
        id: 'heredity-mp2-r3', concept: 'he-reproduction',
        prompt: '有性生殖でできた子の染色体は、どのように受けつがれる？',
        options: ['両親から半分ずつ受けつぐ', '母親からすべて受けつぐ', '父親からすべて受けつぐ'],
        answer: 'a',
        explanation: '卵と精子は、どちらも減数分裂で染色体が半分になっています。受精すると、両親から半分ずつ受けついで、もとの数の染色体をもつ子になります。',
        hint: '卵も精子も、染色体は親の半分だったね。',
      }),
      choice({
        id: 'heredity-mp2-r4', concept: 'he-reproduction',
        prompt: 'ゾウリムシのように、からだが 2 つに分かれてふえることを何という？',
        options: ['分裂', '受精', '発生'],
        answer: 'a',
        explanation: 'からだが 2 つに分かれてふえることを**分裂**といいます。無性生殖の 1 つで、ゾウリムシやミカヅキモ、アメーバなどがこの方法でふえます。',
        hint: '「分かれる」ことを表す言葉だよ。',
      }),
    ],
  };

  // ---- ステージ heredity-mp3: プリント 3 受精と発生（植物の有性生殖／動物の有性生殖／発生の過程） ----
  const heredityMp3 = {
    id: 'heredity-mp3', areaId: 'he-cell', free: true, title: 'プリント 3: 受精と発生', minutes: 5, concepts: ['he-reproduction'],
    lessons: [
      {
        id: 'heredity-mp3-c1',
        anim: 'he-pollen-tube',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '花粉がめしべの柱頭につくと、花粉から**花粉管**がのびます。花粉管の中を**精細胞**が移動して胚珠に届き、精細胞の核と胚珠の中の**卵細胞**の核が合体します。これを**受精**といい、胚珠は種子になります。',
        // 受粉したあとのめしべ（模式図）
        figure: scene(pistilItems().concat([
          { type: 'line', points: [[144, 26], [96, 26]], color: 'ink', width: 2 },
          { type: 'text', x: 92, y: 30, text: '花粉', size: 13, anchor: 'end' },
          { type: 'line', points: [[155, 100], [96, 100]], color: 'ink', width: 2 },
          { type: 'text', x: 92, y: 104, text: '花粉管', size: 13, anchor: 'end' },
          { type: 'line', points: [[162, 150], [232, 120]], color: 'ink', width: 2 },
          { type: 'text', x: 236, y: 120, text: '精細胞', size: 13 },
          { type: 'line', points: [[186, 186], [238, 160]], color: 'ink', width: 2 },
          { type: 'text', x: 242, y: 160, text: '胚珠', size: 13 },
          { type: 'line', points: [[168, 200], [238, 214]], color: 'ink', width: 2 },
          { type: 'text', x: 242, y: 220, text: '卵細胞', size: 13 },
        ])),
      },
      {
        id: 'heredity-mp3-c2',
        text: 'カエルは、雄の精巣でつくられた**精子**と、雌の卵巣でつくられた**卵**が受精して**受精卵**になります。受精卵は細胞分裂をくり返して**胚**になり、おたまじゃくしをへて親と同じ形になります。この過程を**発生**といいます。',
        // 写真（life-2-c3 の使い回し）: カエルの発生（上の段 受精卵 → 2 細胞 → 4 細胞、下の段 多くの細胞 → おたまじゃくし）。
        // 上の段は y 10〜95、下の段は y 130〜215。上のふちの余白はないので、上の文字は下地つきで卵のふちに重ねる
        figure: scene([
          photo('life-2-c3'),
          tag(160, 14, '精子＋卵 → 受精卵 → 胚 → 親の形（発生）', { size: 13, anchor: 'middle' }),
          tag(52, 112, '受精卵', { size: 13, anchor: 'middle' }),
          tag(158, 112, '2 細胞', { size: 13, anchor: 'middle' }),
          tag(267, 112, '4 細胞', { size: 13, anchor: 'middle' }),
          { type: 'arrow', x1: 95, y1: 52, x2: 116, y2: 52, width: 2 },
          { type: 'arrow', x1: 201, y1: 52, x2: 224, y2: 52, width: 2 },
          { type: 'line', points: [[226, 122], [110, 122], [94, 131]], color: 'ink', width: 2, arrow: true },
          { type: 'arrow', x1: 133, y1: 174, x2: 182, y2: 174, width: 2 },
          tag(84, 232, '多くの細胞', { size: 13, anchor: 'middle' }),
          tag(231, 232, 'おたまじゃくし', { size: 13, anchor: 'middle' }),
          tag(154, 206, '2細胞〜は胚', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'heredity-mp3-w1', concept: 'he-reproduction',
      prompt: '予想しよう。花粉がめしべの柱頭についたあと、花粉から何がのびると思う？',
      options: ['花粉管', '根', '葉'],
      answer: 'a',
      explanation: '柱頭についた花粉からは、花粉管が胚珠に向かってのびていきます。花粉管の中を、精細胞が移動します。',
      hint: '花粉から胚珠まで続く、管のようなものだよ。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-mp3-p1', concept: 'he-reproduction',
        prompt: '受粉したあとのめしべの断面の模式図です。ア〜ウの線が指しているもののうち、卵細胞はどれ？',
        figure: scene(pistilItems().concat([
          { type: 'line', points: [[155, 100], [82, 100]], color: 'gray', width: 2 },
          { type: 'line', points: [[162, 150], [240, 132]], color: 'gray', width: 2 },
          { type: 'line', points: [[168, 200], [240, 214]], color: 'gray', width: 2 },
          { type: 'region', id: 'r1', x: 58, y: 100, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 264, y: 128, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 214, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: '卵細胞は、子房の中の胚珠の中にあります（ウ）。アは花粉からのびた花粉管、イは花粉管の中を移動する精細胞です。',
        hint: '卵細胞は、胚珠の中にあるよ。',
      }),
      fill({
        id: 'heredity-mp3-t1', concept: 'he-reproduction', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '精細胞の核と卵細胞の核が合体することを[b1]という。受精卵が胚をへて、親と同じ形になるまでの過程を[b2]という。',
        blanks: [
          word('b1', ['受精', '受粉', '分裂'], '受精'),
          word('b2', ['発生', '進化', '遺伝'], '発生'),
        ],
        explanation: '生殖細胞の核どうしが合体することを**受精**といいます。受精卵が細胞分裂をくり返して親と同じ形になるまでの過程を**発生**といいます。',
        hint: '花粉が柱頭につくことは「受粉」。核が合体するのは？',
      }),
      fill({
        id: 'heredity-mp3-p2', concept: 'he-reproduction',
        prompt: '被子植物の受精のしくみです。空らんに入る言葉を選ぼう。',
        text: '柱頭についた花粉から[b1]がのび、その中を[b2]が胚珠まで移動する。',
        blanks: [
          word('b1', ['花粉管', '道管', '師管'], '花粉管'),
          word('b2', ['精細胞', '卵細胞', '受精卵'], '精細胞'),
        ],
        explanation: '花粉からのびる**花粉管**の中を、雄の生殖細胞である**精細胞**が移動して、胚珠の中の卵細胞に届きます。',
        hint: '植物の雄の生殖細胞の名前は？',
      }),
      choice({
        id: 'heredity-mp3-p3', concept: 'he-reproduction',
        prompt: 'カエルの雄の精巣と、雌の卵巣でつくられる生殖細胞の組み合わせとして正しいものはどれ？',
        options: ['精巣で精子、卵巣で卵', '精巣で卵、卵巣で精子', 'どちらでも受精卵'],
        answer: 'a',
        explanation: '動物では、雄の精巣で精子が、雌の卵巣で卵がつくられます。精子と卵が受精して、受精卵になります。',
        hint: '名前の 1 文字目に注目しよう。',
      }),
      choice({
        id: 'heredity-mp3-p4', concept: 'he-reproduction',
        prompt: 'カエルの発生の順として正しいものはどれ？',
        options: ['受精卵 → 細胞が 2 つ → 細胞が 4 つ → 胚 → おたまじゃくし', '受精卵 → おたまじゃくし → 細胞が 2 つ → 胚', '細胞が 4 つ → 細胞が 2 つ → 受精卵 → おたまじゃくし'],
        answer: 'a',
        explanation: '受精卵は細胞分裂をくり返し、細胞の数を 2 つ、4 つ…とふやして胚になります。やがておたまじゃくしになり、親と同じ形のカエルになります。',
        hint: '細胞分裂をすると、細胞の数はふえていくよ。',
      }),
      choice({
        id: 'heredity-mp3-p5', concept: 'he-reproduction',
        prompt: '受精卵が細胞分裂を始めてから、自分で食物をとり始めるまでの子のことを何という？',
        options: ['胚', '卵', '精子'],
        answer: 'a',
        explanation: '受精卵が細胞分裂を始めてから、自分で食物をとれるようになるまでの子を**胚**といいます。植物では、種子の中にある将来からだになる部分を胚といいます。',
        hint: '漢字 1 文字の言葉だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'heredity-mp3-r1', concept: 'he-reproduction',
        prompt: '精子と卵が受精してできる 1 つの細胞を何という？',
        options: ['受精卵', '胚珠', '生殖細胞'],
        answer: 'a',
        explanation: '精子と卵が受精してできた細胞を**受精卵**といいます。受精卵は細胞分裂をくり返して、胚になります。',
        hint: '「受精した卵」という意味の言葉だよ。',
      }),
      figureChoice({
        id: 'heredity-mp3-r2', concept: 'he-reproduction',
        prompt: '受粉したあとのめしべの断面の模式図です。ア〜ウの線が指しているもののうち、花粉管の中を胚珠へ移動している細胞はどれ？',
        figure: scene(pistilItems().concat([
          { type: 'line', points: [[155, 100], [82, 100]], color: 'gray', width: 2 },
          { type: 'line', points: [[162, 150], [240, 132]], color: 'gray', width: 2 },
          { type: 'line', points: [[168, 200], [240, 214]], color: 'gray', width: 2 },
          { type: 'region', id: 'r1', x: 58, y: 100, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 264, y: 128, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 214, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: '花粉管の中を移動しているのは、雄の生殖細胞の精細胞（イ）です。胚珠の中の卵細胞（ウ）に届いて受精します。',
        hint: '花粉管の中にある、小さな丸をさがそう。',
      }),
      choice({
        id: 'heredity-mp3-r3', concept: 'he-reproduction',
        prompt: '受精卵が細胞分裂をくり返すと、細胞の数はどうなる？',
        options: ['2 つ、4 つ、8 つ…とふえていく', '1 つのまま大きくなる', 'だんだん減っていく'],
        answer: 'a',
        explanation: '受精卵は、1 回の細胞分裂で 2 つに、次で 4 つに、その次で 8 つに…と、細胞の数をふやしていきます。こうして胚になります。',
        hint: '1 つの細胞が分裂すると、いくつになるかな。',
      }),
    ],
  };

  // ---- ステージ heredity-mp4: プリント 4 遺伝のことばと DNA（遺伝の単語①／遺伝の単語②／遺伝　重要語句／ＤＮＡ） ----
  const heredityMp4 = {
    id: 'heredity-mp4', areaId: 'he-gene', free: true, title: 'プリント 4: 遺伝のことばと DNA', minutes: 5, concepts: ['he-mendel', 'he-reproduction'],
    lessons: [
      {
        id: 'heredity-mp4-c1',
        text: '親の形質が子に伝わることを**遺伝**といいます。種子の丸としわのように、どちらか一方しか現れない形質どうしを**対立形質**といいます。代々同じ形質が現れる個体の集まりを**純系**といい、エンドウはつぼみのうちに**自家受粉**するので純系ができやすい植物です。',
        // 写真（life-3-c1 の使い回し）: 左 丸い種子の山 (10〜150, 25〜142)、右 しわのある種子の山 (170〜308, 25〜142)。下は白い余白
        figure: scene([
          photo('life-3-c1'),
          tag(160, 16, 'エンドウの種子の形', { size: 13, anchor: 'middle' }),
          tag(79, 166, '丸い種子', { size: 15, anchor: 'middle', bold: true }),
          tag(240, 166, 'しわのある種子', { size: 15, anchor: 'middle', bold: true }),
          tag(160, 202, '丸 と しわ は 対立形質', { size: 15, anchor: 'middle', bold: true }),
          tag(160, 228, 'エンドウは自家受粉 → 純系ができやすい', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'heredity-mp4-c2',
        text: '純系の丸と純系のしわをかけ合わせると、子はすべて丸になります。子に現れる形質を**顕性形質**（優性形質）、現れない形質を**潜性形質**（劣性形質）といいます。対の遺伝子が減数分裂で分かれて別々の生殖細胞に入ることを**分離の法則**といい、メンデルが見つけました。',
        // AA × aa → Aa（すべて丸）
        figure: scene([
          roundPea(70, 70, 24), wrinkled(250, 70, 25),
          { type: 'text', x: 70, y: 116, text: 'AA（丸）', size: 14, anchor: 'middle' },
          { type: 'text', x: 250, y: 116, text: 'aa（しわ）', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 76, text: '×', size: 20, anchor: 'middle' },
          { type: 'arrow', x1: 160, y1: 124, x2: 160, y2: 150, color: 'gray', width: 2 },
          roundPea(130, 178, 18), roundPea(190, 178, 18),
          { type: 'text', x: 160, y: 222, text: '子は Aa ですべて丸（丸が顕性）', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'heredity-mp4-c3',
        anim: 'he-dna-helix',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '遺伝子の本体は**DNA**（**デオキシリボ核酸**）という物質です。DNA は、2 本の鎖がねじれた**二重らせん**の形をしていて、1953 年にワトソンとクリックが、この形のモデルを発表しました。',
        // DNA の二重らせんのモデル
        figure: scene(helixItems().concat([
          { type: 'text', x: 160, y: 34, text: 'DNA の二重らせん（モデル）', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 206, text: '2 本の鎖がねじれている', size: 13, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'heredity-mp4-w1', concept: 'he-mendel',
      prompt: '親の形質が子やそれ以後の世代に伝わることを何という？',
      options: ['遺伝', '進化', '発生'],
      answer: 'a',
      explanation: '親の形質が子やそれ以後の世代に伝わることを**遺伝**といいます。形質を伝えるもとになるものが遺伝子です。',
      hint: '「遺伝子」という言葉の中にあるよ。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-mp4-p1', concept: 'he-mendel',
        prompt: '純系の丸い種子（ア）をつくるエンドウと、純系のしわのある種子（イ）をつくるエンドウをかけ合わせると、子はすべて丸い種子になりました。顕性形質はア・イのどちら？',
        // 写真（life-3-c1 の使い回し）: 左 丸い種子の山 (10〜150, 25〜142)、右 しわのある種子の山 (170〜308, 25〜142)。名前は問題文にあるので重ねない
        figure: scene([
          photo('life-3-c1'),
          { type: 'region', id: 'r1', x: 79, y: 186, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 240, y: 186, r: 22, label: 'イ' },
        ]),
        answer: 'r1',
        explanation: '対立形質をもつ純系どうしをかけ合わせたとき、子に現れる形質が顕性形質（優性形質）です。子はすべて丸だったので、丸（ア）が顕性形質、しわ（イ）が潜性形質です。',
        hint: '子に現れたほうの形質だよ。',
      }),
      fill({
        id: 'heredity-mp4-t1', concept: 'he-mendel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '遺伝子の本体は[b1]という物質で、日本語では[b2]という。',
        blanks: [
          word('b1', ['DNA', 'デンプン', 'タンパク質'], 'DNA'),
          word('b2', ['デオキシリボ核酸', 'アミノ酸', '脂肪酸'], 'デオキシリボ核酸'),
        ],
        explanation: '遺伝子の本体は**DNA**で、日本語の名前は**デオキシリボ核酸**です。DNA は染色体の中にふくまれています。',
        hint: '英語の頭文字 3 つで表す物質だよ。',
      }),
      choice({
        id: 'heredity-mp4-p2', concept: 'he-mendel',
        prompt: '親、子、孫と、何代にもわたって同じ形質が現れる個体の集まりを何という？',
        options: ['純系', '対立形質', '雑種'],
        answer: 'a',
        explanation: '代々同じ形質が現れる個体の集まりを**純系**といいます。たとえば、純系の丸い種子のエンドウは、自家受粉をくり返しても丸い種子だけをつくります。',
        hint: '「純粋な系統」を短くした言葉だよ。',
      }),
      choice({
        id: 'heredity-mp4-p3', concept: 'he-mendel',
        prompt: 'エンドウの花のように、つぼみのうちに同じ花の中で起こる受粉を何という？',
        options: ['自家受粉', '他家受粉', '受精'],
        answer: 'a',
        explanation: '同じ花（同じ個体）の中で、めしべに自分の花粉がつく受粉を**自家受粉**といいます。エンドウはつぼみのうちに自家受粉するので、純系ができやすい植物です。',
        hint: '「自分の家」の中での受粉という意味だよ。',
      }),
      choice({
        id: 'heredity-mp4-p4', concept: 'he-mendel',
        prompt: 'エンドウを使った実験から、遺伝の規則性を見つけた科学者はだれ？',
        options: ['メンデル', 'ダーウィン', 'ドルトン'],
        answer: 'a',
        explanation: 'メンデルは、エンドウの種子の形などの対立形質を何年も調べ、遺伝の規則性（分離の法則など）を見つけました。',
        hint: 'オーストリアの修道院で、エンドウを育てて調べた人だよ。',
      }),
      fill({
        id: 'heredity-mp4-p5', concept: 'he-mendel',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '丸としわのように、どちらか一方しか現れない形質どうしを[b1]という。純系どうしをかけ合わせたとき、子に現れない形質を[b2]という。',
        blanks: [
          word('b1', ['対立形質', '純系', '遺伝子'], '対立形質'),
          word('b2', ['潜性形質', '顕性形質', '対立形質'], '潜性形質'),
        ],
        explanation: 'どちらか一方しか現れない形質どうしを**対立形質**といいます。子に現れない形質は**潜性形質**（劣性形質）、現れる形質は顕性形質（優性形質）です。',
        hint: '「潜」は、もぐってかくれるという意味の字だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'heredity-mp4-r1', concept: 'he-mendel',
        prompt: 'DNA は、どのような形をしている？',
        options: ['2 本の鎖がねじれた二重らせん', '1 本のまっすぐな棒', '丸い粒'],
        answer: 'a',
        explanation: 'DNA は、2 本の長い鎖がねじれ合った**二重らせん**の形をしています。',
        hint: 'らせん階段のような形が 2 本ぶんだよ。',
      }),
      choice({
        id: 'heredity-mp4-r2', concept: 'he-mendel',
        prompt: 'DNA の二重らせんのモデルを発表した 2 人の科学者の組み合わせはどれ？',
        options: ['ワトソンとクリック', 'メンデルとダーウィン', 'フレミングとドルトン'],
        answer: 'a',
        explanation: '1953 年に、ワトソンとクリックが DNA の二重らせんのモデルを発表しました。メンデルは遺伝の規則性、ダーウィンは進化論、ドルトンは原子説で知られています。',
        hint: '20 世紀の中ごろの、2 人組の科学者だよ。',
      }),
      choice({
        id: 'heredity-mp4-r3', concept: 'he-mendel', term: true,
        prompt: '次の説明に合う言葉はどれ？「減数分裂のとき、対になっている遺伝子が分かれて、別々の生殖細胞に入ること」',
        options: ['分離の法則', '自家受粉', '発生'],
        answer: 'a',
        explanation: '対になっている遺伝子が、減数分裂で分かれて別々の生殖細胞に入ることを**分離の法則**といいます。メンデルが見つけた規則性の 1 つです。',
        hint: '遺伝子が「分かれて離れる」ことを表す言葉だよ。',
      }),
      choice({
        id: 'heredity-mp4-r4', concept: 'he-mendel',
        prompt: '純系どうしをかけ合わせたとき、子に現れるほうの形質を何という？',
        options: ['顕性形質（優性形質）', '潜性形質（劣性形質）', '対立形質'],
        answer: 'a',
        explanation: '子に現れるほうの形質を**顕性形質**（優性形質）、現れないほうを潜性形質（劣性形質）といいます。「優れている」という意味ではなく、「現れやすい」という意味です。',
        hint: '「顕」は、はっきり現れるという意味の字だよ。',
      }),
      choice({
        id: 'heredity-mp4-r5', concept: 'he-reproduction',
        prompt: '卵や精子、卵細胞や精細胞のように、子をつくるための特別な細胞をまとめて何という？',
        options: ['生殖細胞', '体細胞', '受精卵'],
        answer: 'a',
        explanation: '子をつくるための特別な細胞を**生殖細胞**といいます。動物では卵と精子、植物では卵細胞と精細胞です。',
        hint: '「生殖」のための細胞だよ。',
      }),
      choice({
        id: 'heredity-mp4-r6', concept: 'he-reproduction', term: true,
        prompt: '次の説明に合う言葉はどれ？「生殖細胞がつくられるときに起こる、染色体の数がもとの半分になる細胞分裂」',
        options: ['減数分裂', '体細胞分裂', '分離の法則'],
        answer: 'a',
        explanation: '生殖細胞がつくられるときの、染色体の数が半分になる分裂を**減数分裂**といいます。',
        hint: '数が「減る」分裂だよ。',
      }),
      choice({
        id: 'heredity-mp4-r7', concept: 'he-reproduction', term: true,
        prompt: '次の説明に合う言葉はどれ？「雌雄が関わらずに、親のからだの一部から子ができるふえ方」',
        options: ['無性生殖', '有性生殖', '自家受粉'],
        answer: 'a',
        explanation: '雌雄が関わらずに子ができるふえ方を**無性生殖**といいます。分裂や栄養生殖がその例です。',
        hint: '雌雄（性）が関わらないふえ方だよ。',
      }),
    ],
  };

  // ---- ステージ heredity-mp5: プリント 5 遺伝の規則性（丸としわを交配／丸としわを交配２／Ａaとaaを交配） ----
  const heredityMp5 = {
    id: 'heredity-mp5', areaId: 'he-gene', free: true, title: 'プリント 5: 丸としわのかけ合わせ', minutes: 5, concepts: ['he-mendel', 'he-ratio'],
    lessons: [
      {
        id: 'heredity-mp5-c1',
        text: '純系の丸（AA）としわ（aa）をかけ合わせた子は、すべて Aa で丸になります。子（Aa）どうしをかけ合わせると、孫の遺伝子の組み合わせは AA・Aa・aa が 1：2：1 になり、形質は**丸：しわ ＝ 3：1** になります。',
        // Aa どうしのかけ合わせの表
        figure: scene(punnett(['AA', 'Aa', 'Aa', 'aa']).concat([
          { type: 'text', x: 160, y: 198, text: 'AA：Aa：aa ＝ 1：2：1', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: '丸：しわ ＝ 3：1', size: 15, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'heredity-mp5-c2',
        text: '子（Aa）と純系のしわ（aa）をかけ合わせると、Aa の生殖細胞は A と a、aa の生殖細胞は a だけなので、子の組み合わせは Aa と aa が 1：1 になります。丸としわが混ざり、**丸：しわ ＝ 1：1** になります。',
        // Aa と aa のかけ合わせの表
        figure: scene(crossTable(['A', 'a'], ['a', 'a'], ['Aa', 'aa', 'Aa', 'aa']).concat([
          { type: 'text', x: 160, y: 198, text: 'Aa（丸）× aa（しわ）', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: '丸：しわ ＝ 1：1', size: 15, anchor: 'middle', bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'heredity-mp5-w1', concept: 'he-mendel',
      prompt: '予想しよう。純系の丸い種子のエンドウと、純系のしわのある種子のエンドウをかけ合わせると、子の種子はどうなると思う？',
      options: ['すべて丸', 'すべてしわ', '丸としわが半分ずつ'],
      answer: 'a',
      explanation: '純系の丸（AA）と純系のしわ（aa）の子は、すべて Aa になります。丸が顕性形質なので、子の種子はすべて丸になります。',
      hint: '丸としわのうち、顕性形質はどちらだったかな。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-mp5-p1', concept: 'he-ratio',
        prompt: '子の代（Aa）どうしをかけ合わせて、孫の代の種子をたくさん調べました。孫の種子の丸としわの数の割合を表しているのはア〜ウのどれ？（ア すべて丸、イ すべてしわ、ウ 丸 3 つにしわ 1 つの割合）',
        figure: scene(peaBoxes().concat([
          { type: 'region', id: 'r1', x: 56, y: 192, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 192, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 192, r: 22, label: 'ウ' },
        ])),
        answer: 'r3',
        explanation: 'Aa どうしの孫は AA：Aa：aa ＝ 1：2：1 です。AA と Aa は丸、aa はしわなので、丸：しわ ＝ 3：1 になります（ウ）。',
        hint: '孫の代では、しわの種子も現れるよ。',
      }),
      fill({
        id: 'heredity-mp5-t1', concept: 'he-mendel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '純系の丸としわをかけ合わせると、子はすべて丸になる。このように子に現れる形質を[b1]という。減数分裂で対の遺伝子が別々の生殖細胞に入ることを[b2]という。',
        blanks: [
          word('b1', ['顕性形質', '潜性形質', '対立形質'], '顕性形質'),
          word('b2', ['分離の法則', '自家受粉', '発生'], '分離の法則'),
        ],
        explanation: '子に現れる形質が**顕性形質**（優性形質）です。対の遺伝子が分かれて別々の生殖細胞に入ることを**分離の法則**といいます。',
        hint: '「顕」は、はっきり現れるという意味だよ。',
      }),
      fill({
        id: 'heredity-mp5-p2', concept: 'he-ratio',
        prompt: '丸の遺伝子を A、しわの遺伝子を a とします。純系の丸（AA）と純系のしわ（aa）をかけ合わせました。空らんに入るものを選ぼう。',
        text: '子の遺伝子の組み合わせは[b1]である。',
        blanks: [word('b1', ['Aa', 'AA', 'aa'], 'Aa')],
        explanation: 'AA の親の生殖細胞は A、aa の親の生殖細胞は a だけです。受精すると、子はすべて Aa になります。',
        hint: 'それぞれの親から、遺伝子を 1 つずつ受けつぐよ。',
      }),
      choice({
        id: 'heredity-mp5-p3', concept: 'he-ratio',
        prompt: '子の代（Aa）どうしをかけ合わせたとき、孫の代に現れる遺伝子の組み合わせをすべて選んだものはどれ？',
        options: ['AA・Aa・aa', 'Aa だけ', 'AA・aa', 'AA だけ'],
        answer: 'a',
        explanation: 'Aa の生殖細胞は A と a の 2 種類です。組み合わせると、AA・Aa・Aa・aa ができるので、孫には AA・Aa・aa の 3 種類が現れます。',
        hint: '表をかいて、A と a の組み合わせを考えよう。',
      }),
      fill({
        id: 'heredity-mp5-p4', concept: 'he-ratio',
        prompt: '子の代（Aa）どうしをかけ合わせました。空らんに入る数を入れよう。',
        text: '孫の代の種子の形の数の比は、丸：しわ ＝ [b1]：1 になる。',
        blanks: [number('b1', 3, 0, '')],
        explanation: '孫の遺伝子の組み合わせは AA：Aa：aa ＝ 1：2：1 です。A をもつ AA と Aa は丸なので、丸：しわ ＝ (1 ＋ 2)：1 ＝ 3：1 です。',
        hint: 'AA と Aa は、どちらも丸になるよ。',
      }),
      choice({
        id: 'heredity-mp5-p5', concept: 'he-ratio',
        prompt: '丸の種子（Aa）をつくるエンドウと、しわの種子（aa）をつくるエンドウをかけ合わせました。子の種子の形はどうなる？',
        options: ['丸としわが混ざり、丸：しわ ＝ 1：1', 'すべて丸', 'すべてしわ', '丸としわが混ざり、丸：しわ ＝ 3：1'],
        answer: 'a',
        explanation: 'Aa の生殖細胞は A と a、aa の生殖細胞は a だけです。子は Aa と aa が 1：1 でできるので、丸：しわ ＝ 1：1 になります。',
        hint: '表をかくと、マスの中は Aa が 2 つ、aa が 2 つになるよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'heredity-mp5-r1', concept: 'he-ratio',
        prompt: 'Aa（丸）と aa（しわ）をかけ合わせました。空らんに入るものを選ぼう。',
        text: '子の遺伝子の組み合わせは[b1]と[b2]の 2 種類で、数の比は 1：1 である。',
        blanks: [
          word('b1', ['Aa', 'AA', 'aa'], 'Aa'),
          word('b2', ['Aa', 'AA', 'aa'], 'aa'),
        ],
        explanation: 'Aa の生殖細胞の A・a と、aa の生殖細胞の a が組み合わさるので、子は Aa と aa になります。数の比は 1：1 です。',
        hint: 'aa の親からは、a しか受けつがないね。',
      }),
      choice({
        id: 'heredity-mp5-r2', concept: 'he-ratio',
        prompt: '丸の種子（Aa）をつくるエンドウどうしをかけ合わせました。子の種子の丸としわの数の比はどれ？',
        options: ['丸：しわ ＝ 3：1', '丸：しわ ＝ 1：3', '丸：しわ ＝ 1：1'],
        answer: 'a',
        explanation: 'Aa どうしをかけ合わせると、子は AA：Aa：aa ＝ 1：2：1 になります。AA と Aa は丸なので、丸：しわ ＝ 3：1 です。',
        hint: '顕性の丸のほうが多く現れるよ。',
      }),
      choice({
        id: 'heredity-mp5-r3', concept: 'he-mendel',
        prompt: '純系の丸（AA）と純系のしわ（aa）をかけ合わせると、子はすべて丸になりました。顕性形質はどちら？',
        options: ['丸', 'しわ', 'どちらでもない'],
        answer: 'a',
        explanation: '子（Aa）は丸としわの両方の遺伝子をもっていますが、現れたのは丸だけです。だから、丸が顕性形質、しわが潜性形質です。',
        hint: '子に現れたほうが顕性形質だよ。',
      }),
      choice({
        id: 'heredity-mp5-r4', concept: 'he-mendel',
        prompt: '子の代（Aa）どうしをかけ合わせたとき、孫の代の AA・Aa・aa の数の比はどれ？',
        options: ['1：2：1', '1：1：1', '3：0：1'],
        answer: 'a',
        explanation: 'Aa の生殖細胞は A と a が同じ数ずつできます（分離の法則）。組み合わせは AA・Aa・Aa・aa の 4 通りなので、AA：Aa：aa ＝ 1：2：1 です。',
        hint: '表のマスを数えると、Aa は 2 つあるよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 4: ドリル（.ai-tasks/20261121-152500_ドリル問題_共通.md）
  // 公開されている学習プリントのテーマ名だけを目安にして、問題・解説・図はすべて中学理科の知識から自作した。
  // 既存のステージ（life-1〜4、heredity-mp1〜5）と同じ問いをくり返さないよう、場面・数値・問い方を変えた。
  // ================================================================

  // ---- ドリル用の図の部品 ----

  // 色つきの染色体を並べた細胞。chs は [dx, 半分の長さ, 色] の配列
  function colorCell(cx, cy, r, chs, fill) {
    const items = [{ type: 'circle', x: cx, y: cy, r, fill: fill || 'white', stroke: 'line' }];
    chs.forEach(([dx, h, color]) => items.push({ type: 'line', points: [[cx + dx, cy - h], [cx + dx, cy + h]], color, width: 4 }));
    return items;
  }
  // 親 A（青）・親 B（橙）の体細胞の染色体（長い 2 本・短い 2 本）
  const CH_A = [[-15, 11, 'blue'], [-5, 6, 'blue'], [5, 11, 'blue'], [15, 6, 'blue']];
  const CH_B = [[-15, 11, 'orange'], [-5, 6, 'orange'], [5, 11, 'orange'], [15, 6, 'orange']];

  // 化石が見つかった 3 つの層（上から ア: 魚類・両生類・ハチュウ類、イ: 魚類・両生類、ウ: 魚類だけ）。下の層ほど古い
  const FOSSIL_LAYERS_Q = scene([
    { type: 'text', x: 130, y: 20, text: '地層と、見つかったセキツイ動物の化石', size: 12, anchor: 'middle' },
    { type: 'rect', x: 20, y: 30, width: 220, height: 60, fill: 'sand', stroke: 'line' },
    { type: 'rect', x: 20, y: 90, width: 220, height: 60, fill: 'glass', stroke: 'line' },
    { type: 'rect', x: 20, y: 150, width: 220, height: 60, fill: 'rock', stroke: 'line' },
    { type: 'text', x: 130, y: 65, text: '魚類・両生類・ハチュウ類', size: 13, anchor: 'middle' },
    { type: 'text', x: 130, y: 125, text: '魚類・両生類', size: 13, anchor: 'middle' },
    { type: 'text', x: 130, y: 185, text: '魚類', size: 13, anchor: 'middle' },
    { type: 'text', x: 130, y: 230, text: '下の層ほど古い', size: 12, anchor: 'middle' },
    leader(240, 60, 258, 60),
    leader(240, 120, 258, 120),
    leader(240, 180, 258, 180),
    { type: 'region', id: 'r1', x: 284, y: 60, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 284, y: 120, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 284, y: 180, r: 22, label: 'ウ' },
  ]);

  // 根に等間隔（48）の印をつけた図。区間 ア（根もと）〜エ（先端に近い）。選ぶ場所は右に引き出す
  const ROOT_MARKS_Q = scene([
    { type: 'rect', x: 130, y: 10, width: 40, height: 206, fill: 'lightgreen', stroke: 'green' },
    { type: 'polygon', points: [[130, 216], [170, 216], [164, 228], [150, 236], [136, 228]], fill: 'sand', stroke: 'brown' },
    ...[24, 72, 120, 168, 216].map(y => ({ type: 'line', points: [[122, y], [178, y]], color: 'ink', width: 2 })),
    { type: 'text', x: 112, y: 28, text: '根もと', size: 13, anchor: 'end' },
    { type: 'text', x: 112, y: 232, text: '先端', size: 13, anchor: 'end' },
    { type: 'text', x: 60, y: 124, text: '印は等間隔', size: 12, anchor: 'middle' },
    leader(170, 48, 248, 48),
    leader(170, 96, 248, 96),
    leader(170, 144, 248, 144),
    leader(170, 192, 248, 192),
    { type: 'region', id: 'r1', x: 272, y: 48, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 272, y: 96, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 272, y: 144, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 272, y: 192, r: 22, label: 'エ' },
  ]);

  // 根の印の間隔（はじめと 1 日後）。cx は根の中心、ys は印の y、tip は先端の y
  function markedRoot(cx, ys, label) {
    const last = ys[ys.length - 1];
    return [
      { type: 'rect', x: cx - 16, y: ys[0], width: 32, height: last - ys[0], fill: 'lightgreen', stroke: 'green' },
      { type: 'polygon', points: [[cx - 16, last], [cx + 16, last], [cx, last + 14]], fill: 'sand', stroke: 'brown' },
      ...ys.map(y => ({ type: 'line', points: [[cx - 22, y], [cx + 22, y]], color: 'ink', width: 2 })),
      { type: 'text', x: cx, y: 236, text: label, size: 13, anchor: 'middle' },
    ];
  }

  // 親の体細胞（親 A 青・親 B 橙）と、子の体細胞の候補 3 つ（ア 青 2 本と橙 2 本、イ 青 4 本、ウ 青 4 本と橙 4 本）
  const INHERIT_Q = scene([
    ...colorCell(60, 50, 30, CH_A),
    ...colorCell(260, 50, 30, CH_B),
    { type: 'text', x: 60, y: 98, text: '親 A の体細胞', size: 12, anchor: 'middle' },
    { type: 'text', x: 260, y: 98, text: '親 B の体細胞', size: 12, anchor: 'middle' },
    { type: 'line', points: [[10, 114], [310, 114]], color: 'gray', width: 1, dashed: true },
    ...colorCell(60, 155, 30, [[-15, 11, 'blue'], [-5, 6, 'blue'], [5, 11, 'orange'], [15, 6, 'orange']]),
    ...colorCell(160, 155, 30, CH_A),
    ...colorCell(260, 155, 32, [[-21, 11, 'blue'], [-15, 6, 'blue'], [-9, 11, 'blue'], [-3, 6, 'blue'],
      [3, 11, 'orange'], [9, 6, 'orange'], [15, 11, 'orange'], [21, 6, 'orange']]),
    { type: 'region', id: 'r1', x: 60, y: 214, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 160, y: 214, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 260, y: 214, r: 22, label: 'ウ' },
  ]);

  // 子葉の色の遺伝（親 黄 × 緑 → 子 すべて黄 → 孫 黄 3 : 緑 1）。黄の子葉 yellow、緑の子葉 green
  function peaGenerations() {
    const pea = (x, y, fill) => ({ type: 'circle', x, y, r: 14, fill, stroke: 'line' });
    return [
      { type: 'text', x: 24, y: 55, text: '親', size: 14, bold: true },
      { type: 'text', x: 24, y: 125, text: '子', size: 14, bold: true },
      { type: 'text', x: 24, y: 195, text: '孫', size: 14, bold: true },
      pea(110, 50, 'yellow'),
      { type: 'text', x: 160, y: 56, text: '×', size: 18, anchor: 'middle' },
      pea(210, 50, 'green'),
      { type: 'arrow', x1: 160, y1: 70, x2: 160, y2: 100, color: 'gray', width: 2 },
      pea(130, 120, 'yellow'), pea(160, 120, 'yellow'), pea(190, 120, 'yellow'),
      { type: 'arrow', x1: 160, y1: 140, x2: 160, y2: 170, color: 'gray', width: 2 },
      pea(115, 190, 'yellow'), pea(145, 190, 'yellow'), pea(175, 190, 'yellow'), pea(205, 190, 'green'),
      { type: 'text', x: 160, y: 232, text: '子は子葉が黄の個体どうしをかけ合わせた', size: 12, anchor: 'middle' },
    ];
  }
  const PEA_GEN_Q = scene(peaGenerations().concat([
    leader(224, 50, 262, 50),
    leader(204, 120, 262, 120),
    leader(219, 190, 262, 190),
    { type: 'region', id: 'r1', x: 286, y: 50, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 286, y: 120, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 286, y: 190, r: 22, label: 'ウ' },
  ]));

  // 時代の軸に印を置く図（印は y 170 を左右に動く）。marks は [億年前, 名前]
  function eraDragScene(marks) {
    const items = [{ type: 'text', x: 4, y: 14, text: '数字は億年前（左ほど古い）', size: 12 }];
    marks.forEach(([t, name]) => {
      const x = 300 - 56 * t;
      items.push({ type: 'line', points: [[x, 206], [x, 80]], color: 'gray', width: 2 });
      items.push({ type: 'text', x, y: 70, text: name, size: 13, anchor: x < 40 ? 'start' : 'middle' });
    });
    return scene(items.concat(timeAxis(), [
      { type: 'line', points: [[20, 170], [300, 170]], color: 'gray', width: 1, dashed: true },
      { type: 'circle', id: 'mark', x: 284, y: 170, r: 11, fill: 'blue', stroke: 'ink' },
    ]));
  }

  // ---- ステージ heredity-dr1: 生物の変遷と進化（化石の比較・中間の特徴・相同器官） ----
  const heredityDr1 = {
    id: 'heredity-dr1', areaId: 'he-gene', free: true, title: 'ドリル 1: 生物の変遷と進化', minutes: 6, concepts: ['he-evolution'],
    lessons: [
      {
        id: 'heredity-dr1-c1',
        text: '地層の化石をくらべると、古い層には水中の生物の化石が多く、新しい層になるほど陸上の生物の化石が加わります。現在の生物は、過去の生物が長い年月をかけて変化してできたと考えられます。これを**進化**といいます。',
        // 地層ごとの化石（下ほど古い）
        figure: scene([
          { type: 'rect', x: 40, y: 30, width: 240, height: 56, fill: 'sand', stroke: 'line' },
          { type: 'rect', x: 40, y: 86, width: 240, height: 56, fill: 'glass', stroke: 'line' },
          { type: 'rect', x: 40, y: 142, width: 240, height: 56, fill: 'rock', stroke: 'line' },
          { type: 'text', x: 160, y: 63, text: '魚類・両生類・ハチュウ類', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 119, text: '魚類・両生類', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 175, text: '魚類', size: 13, anchor: 'middle' },
          { type: 'text', x: 34, y: 40, text: '新', size: 13, anchor: 'end' },
          { type: 'text', x: 34, y: 196, text: '古', size: 13, anchor: 'end' },
          { type: 'text', x: 160, y: 224, text: '新しい層ほど、陸上の生物の化石が加わる', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'heredity-dr1-c2',
        text: 'カモノハシは、子を母乳で育てるホニュウ類ですが、ハチュウ類のように卵を産みます。2 つのなかまの特徴をあわせもつ生物や、骨格の基本のつくりが共通する**相同器官**は、生物どうしが進化でつながっている証拠と考えられます。',
        // 進化の証拠の 3 つ
        figure: scene([
          { type: 'text', x: 160, y: 24, text: '進化の証拠', size: 15, anchor: 'middle', bold: true },
          { type: 'rect', x: 10, y: 44, width: 96, height: 140, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 112, y: 44, width: 96, height: 140, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 214, y: 44, width: 96, height: 140, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'text', x: 58, y: 76, text: '化石の', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 58, y: 96, text: '移り変わり', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 58, y: 140, text: '地層の新しさ', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 76, text: '中間の', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 96, text: '特徴', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 132, text: 'シソチョウ', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 152, text: 'カモノハシ', size: 12, anchor: 'middle' },
          { type: 'text', x: 262, y: 76, text: '相同器官', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 262, y: 132, text: 'ヒトのうで', size: 12, anchor: 'middle' },
          { type: 'text', x: 262, y: 152, text: 'コウモリのつばさ', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 216, text: '生物は共通の祖先から変化してきた', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'heredity-dr1-w1', concept: 'he-evolution',
      prompt: '予想しよう。コウモリのつばさとヒトのうでは、形もはたらきもちがいます。中の骨のつくりはどうなっていると思う？',
      options: ['基本のつくりが似ている', 'まったくちがう', 'コウモリのつばさには骨がない'],
      answer: 'a',
      explanation: 'コウモリのつばさにも、ヒトのうでと同じように、つけ根の 1 本、その先の 2 本、指の骨が並んでいます。もとは同じ器官だったと考えられます。',
      hint: 'コウモリは鳥ではなく、ホニュウ類のなかまだよ。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-dr1-p1', concept: 'he-evolution',
        prompt: '3 つの層から見つかったセキツイ動物の化石のなかまです（下の層ほど古い）。ア〜ウ（ア 上の層、イ 中の層、ウ 下の層）のうち、ハチュウ類がはじめて現れた時代の層はどれ？',
        figure: FOSSIL_LAYERS_Q,
        answer: 'r1',
        explanation: 'ハチュウ類の化石は、いちばん上（新しい）のアの層からだけ見つかっています。だから、ハチュウ類はアの層ができた時代に現れたと考えられます。',
        hint: 'ハチュウ類の化石が出てくる層をさがそう。',
      }),
      fill({
        id: 'heredity-dr1-t1', concept: 'he-evolution', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'コウモリのつばさとヒトのうでのように、形やはたらきはちがっても、骨格の基本のつくりが共通する器官を[b1]という。',
        blanks: [word('b1', ['相同器官', '感覚器官', '消化器官'], '相同器官')],
        explanation: 'もとは同じ器官が、それぞれの生活に合わせて変化したと考えられるものを**相同器官**といいます。',
        hint: '「相同」は、もとが同じという意味だよ。',
      }),
      fill({
        id: 'heredity-dr1-p2', concept: 'he-evolution',
        prompt: 'カモノハシは、卵を産み、子を母乳で育てます。',
        text: 'カモノハシは、ハチュウ類と[b1]の両方の特徴をもつ生物と考えられる。',
        blanks: [word('b1', ['ホニュウ類', '魚類', '両生類'], 'ホニュウ類')],
        explanation: '卵を産むのはハチュウ類に見られる特徴、母乳で子を育てるのはホニュウ類の特徴です。2 つのなかまの特徴をもつ生物は、進化のつながりを考える手がかりになります。',
        hint: '母乳で子を育てるのは、どのなかまの特徴かな。',
      }),
      choice({
        id: 'heredity-dr1-p3', concept: 'he-evolution',
        prompt: '相同器官についての説明として、まちがっているものはどれ？',
        options: ['はたらきが同じなら必ず相同器官である', '形がちがっても相同器官のことがある', '共通の祖先をもつ証拠と考えられる'],
        answer: 'a',
        explanation: '相同器官かどうかは、はたらきではなく、骨格などの基本のつくりで決まります。チョウのはねと鳥のつばさは、どちらも飛ぶためのものですが、つくりのもとがちがいます。',
        hint: '相同器官は、何が共通しているものだったかな。',
      }),
      fill({
        id: 'heredity-dr1-p4', concept: 'he-evolution',
        prompt: '古い地層から見つかる生物の化石には、どんな傾向がある？',
        text: '古い地層ほど、からだのつくりが[b1]な生物の化石が多い。',
        blanks: [word('b1', ['単純', '複雑', '大型'], '単純')],
        explanation: '古い地層ほど、からだのつくりが単純な生物の化石が多く、新しい地層になるほど複雑なつくりの生物が加わります。生物が長い年月をかけて変化してきたことを示しています。',
        hint: '新しい地層になるほど、どんな生物が加わってきたかな。',
      }),
      choice({
        id: 'heredity-dr1-p5', concept: 'he-evolution',
        prompt: 'クジラのひれの中には、ヒトのうでと同じ並び方の骨があります。このことから考えられることはどれ？',
        options: ['陸上のホニュウ類と共通の祖先をもつ', '魚類から直接進化した', '水中では骨が必要ない'],
        answer: 'a',
        explanation: 'クジラのひれとヒトのうでは相同器官です。クジラは、陸上で生活していたホニュウ類のなかまが、水中の生活に合わせて変化したと考えられています。',
        hint: 'クジラは魚類ではなく、ホニュウ類だね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'heredity-dr1-r1', concept: 'he-evolution',
        prompt: '3 つの層から見つかったセキツイ動物の化石のなかまです（下の層ほど古い）。ア〜ウ（ア 上の層、イ 中の層、ウ 下の層）のうち、両生類がはじめて現れた時代の層はどれ？',
        figure: FOSSIL_LAYERS_Q,
        answer: 'r2',
        explanation: '両生類の化石は、イとアの層から見つかり、それより古いウの層からは見つかりません。だから、両生類はイの層ができた時代に現れたと考えられます。',
        hint: '両生類の化石が出てくる層のうち、いちばん古い層はどれかな。',
      }),
      choice({
        id: 'heredity-dr1-r2', concept: 'he-evolution',
        prompt: 'シソチョウやカモノハシのように、2 つのなかまの特徴をあわせもつ生物がいることから考えられることはどれ？',
        options: ['なかまどうしが進化でつながっている', '生物は昔からずっと変わっていない', 'なかまの分け方に意味はない'],
        answer: 'a',
        explanation: '2 つのなかまの中間の特徴をもつ生物は、一方のなかまから別のなかまへ進化してきたことを考える手がかりになります。',
        hint: '「中間の特徴」は、何の証拠だったかな。',
      }),
      choice({
        id: 'heredity-dr1-r3', concept: 'he-evolution',
        prompt: '次の組み合わせのうち、相同器官の組み合わせではないものはどれ？',
        options: ['チョウのはねと鳥のつばさ', 'ヒトのうでとコウモリのつばさ', 'クジラのひれとヒトのうで'],
        answer: 'a',
        explanation: 'チョウのはねと鳥のつばさは、どちらも飛ぶためのものですが、鳥のつばさには骨があり、チョウのはねにはありません。つくりのもとがちがうので、相同器官ではありません。',
        hint: '骨のつくりが共通しているかどうかで考えよう。',
      }),
      choice({
        id: 'heredity-dr1-t2', concept: 'he-evolution', term: true,
        prompt: '次の説明に合う言葉はどれ？「生物が、長い年月をかけて代を重ねるあいだに、形やしくみが変化していくこと」',
        options: ['進化', '成長', '生殖'],
        answer: 'a',
        explanation: '代を重ねるあいだの変化が**進化**です。1 つの個体が大きくなる成長や、子をつくる生殖とは区別しよう。',
        hint: '1 つの個体の一生の中の変化ではないよ。',
      }),
    ],
  };

  // ---- ステージ heredity-dr2: 生物の成長とふえ方 前半（染色体の複製・分裂の終わり方・成長のしくみ） ----
  const heredityDr2 = {
    id: 'heredity-dr2', areaId: 'he-cell', free: true, title: 'ドリル 2: 細胞分裂と成長', minutes: 6, concepts: ['he-division'],
    lessons: [
      {
        id: 'heredity-dr2-c1',
        anim: 'he-chromosome-copy',   // 動く図の使い回し（js/anim-bio.js）。figure は静止図として残す
        text: '体細胞分裂の前に、それぞれの染色体は同じものがもう 1 本つくられ、2 本ずつになります。これを染色体の**複製**といいます。分裂のときに 1 本ずつ分かれるので、新しい 2 つの細胞は、もとと同じ数・同じ遺伝子の染色体をもちます。',
        // 分裂前 → 複製 → 2 つの細胞
        figure: scene([
          { type: 'circle', x: 55, y: 110, r: 34, fill: 'white', stroke: 'line' },
          ...chromRow(55, 110, false),
          { type: 'arrow', x1: 94, y1: 110, x2: 124, y2: 110, color: 'gray', width: 2 },
          { type: 'circle', x: 165, y: 110, r: 34, fill: 'white', stroke: 'line' },
          ...chromRow(165, 110, true),
          { type: 'arrow', x1: 204, y1: 110, x2: 232, y2: 110, color: 'gray', width: 2 },
          { type: 'circle', x: 270, y: 70, r: 30, fill: 'white', stroke: 'line' },
          ...chromRow(270, 70, false),
          { type: 'circle', x: 270, y: 150, r: 30, fill: 'white', stroke: 'line' },
          ...chromRow(270, 150, false),
          { type: 'text', x: 55, y: 166, text: '分裂前', size: 12, anchor: 'middle' },
          { type: 'text', x: 165, y: 166, text: '複製された', size: 12, anchor: 'middle' },
          { type: 'text', x: 270, y: 204, text: '4 本ずつ', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'heredity-dr2-c2',
        text: '植物の細胞は、中央に**しきり**ができて 2 つに分かれます。動物の細胞は、中央が**くびれて** 2 つに分かれます。1 回の分裂で 1 つが 2 つになるので、分裂をくり返すと 2 つ、4 つ、8 つ…と数がふえます。',
        // 分裂の終わり方（植物と動物）
        figure: scene([
          { type: 'text', x: 160, y: 30, text: '分裂の終わり方', size: 14, anchor: 'middle', bold: true },
          { type: 'rect', x: 20, y: 70, width: 120, height: 70, rx: 4, fill: 'lightgreen', stroke: 'green' },
          { type: 'line', points: [[80, 70], [80, 140]], color: 'green', width: 3 },
          { type: 'circle', x: 50, y: 105, r: 9, fill: 'purple', stroke: 'line' },
          { type: 'circle', x: 110, y: 105, r: 9, fill: 'purple', stroke: 'line' },
          { type: 'circle', x: 210, y: 105, r: 34, fill: 'pink', stroke: 'line' },
          { type: 'circle', x: 262, y: 105, r: 34, fill: 'pink', stroke: 'line' },
          { type: 'circle', x: 205, y: 105, r: 9, fill: 'purple', stroke: 'line' },
          { type: 'circle', x: 267, y: 105, r: 9, fill: 'purple', stroke: 'line' },
          { type: 'text', x: 80, y: 172, text: '植物の細胞', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 80, y: 192, text: 'しきりができる', size: 12, anchor: 'middle' },
          { type: 'text', x: 236, y: 172, text: '動物の細胞', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 236, y: 192, text: '中央がくびれる', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'heredity-dr2-c3',
        text: '根に等間隔の印をつけて 1 日おくと、先端に近い部分の間隔が大きく広がり、根もとに近い部分はほとんど変わりません。先端の近くで細胞がふえ、ふえた細胞が大きくなって根がのびるからです。',
        // はじめと 1 日後の印の間隔
        figure: scene([
          ...markedRoot(90, [20, 52, 84, 116, 148], 'はじめ'),
          ...markedRoot(230, [20, 54, 90, 130, 206], '1 日後'),
          { type: 'text', x: 160, y: 120, text: '→', size: 18, anchor: 'middle' },
          { type: 'text', x: 282, y: 172, text: '広がる', size: 12, color: 'blue', bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'heredity-dr2-w1', concept: 'he-division',
      prompt: '予想しよう。すりむいた皮ふが、何日かたつと元どおりになるとき、からだの中では何が起こっていると思う？',
      options: ['細胞分裂で細胞がふえる', '細胞がほかの場所から集まる', '細胞どうしが合体する'],
      answer: 'a',
      explanation: 'きずの近くの細胞が体細胞分裂をくり返して数をふやし、すき間をうめていきます。からだの成長と同じしくみが、きずがふさがるときにも使われています。',
      hint: '細胞の数をふやすしくみを思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-dr2-p1', concept: 'he-division',
        prompt: '根に等間隔に印をつけ、ア〜エの区間に分けました（ア 根もと側 → エ 先端側）。1 日後、印の間隔がいちばん大きく広がっている区間はどれ？',
        figure: ROOT_MARKS_Q,
        answer: 'r4',
        explanation: '先端の近く（エ）で細胞分裂がさかんに起こり、ふえた細胞が大きくなるので、エの区間がいちばん広がります。根もと側のアはほとんど変わりません。',
        hint: '細胞分裂がさかんなのは、根のどのあたりだったかな。',
      }),
      fill({
        id: 'heredity-dr2-t1', concept: 'he-division', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '体細胞分裂の前に、それぞれの染色体と同じものがもう 1 本つくられ、2 本ずつになることを、染色体の[b1]という。',
        blanks: [word('b1', ['複製', '分離', '受精'], '複製')],
        explanation: '分裂の前に染色体が**複製**されるので、分かれたあとの 2 つの細胞は、どちらももとと同じ染色体をもちます。',
        hint: '「同じものをもう 1 つつくる」ことを表す言葉だよ。',
      }),
      fill({
        id: 'heredity-dr2-p2', concept: 'he-division',
        prompt: '1 つの細胞が体細胞分裂を 4 回くり返しました。細胞はいくつになる？（どの細胞も毎回 2 つに分かれるとする）',
        text: '細胞の数は[b1]になる。',
        blanks: [number('b1', 16, 0, '個')],
        explanation: '1 回の分裂で数が 2 倍になります。1 → 2 → 4 → 8 → 16 なので、4 回で 16 個です。',
        hint: '1 回ごとに 2 倍になるよ。',
      }),
      choice({
        id: 'heredity-dr2-p3', concept: 'he-division',
        prompt: '植物の細胞と動物の細胞で、体細胞分裂の終わり方のちがいとして正しいものはどれ？',
        options: ['植物はしきり、動物はくびれで分かれる', '植物はくびれ、動物はしきりで分かれる', 'どちらもしきりができて分かれる'],
        answer: 'a',
        explanation: '植物の細胞は細胞壁があるので、中央にしきりができて 2 つに分かれます。動物の細胞は、細胞の中央がくびれて 2 つに分かれます。',
        hint: '細胞壁があるのはどちらの細胞かな。',
      }),
      choice({
        id: 'heredity-dr2-p4', concept: 'he-division',
        prompt: '体細胞分裂でできた 2 つの細胞の染色体の数が、もとの細胞と同じになるのはなぜ？',
        options: ['分裂の前に染色体が複製されるから', '分裂のあとで染色体がふえるから', '染色体の半分が消えるから'],
        answer: 'a',
        explanation: '分裂の前に染色体が複製されて 2 本ずつになり、分裂のときに 1 本ずつ 2 つの細胞に分かれます。だから、どちらの細胞ももとと同じ数になります。',
        hint: '分裂が始まる前に、染色体に起こることを思い出そう。',
      }),
      choice({
        id: 'heredity-dr2-p5', concept: 'he-division',
        prompt: '体細胞分裂でできた 2 つの細胞がもつ遺伝子は、もとの細胞とくらべてどうなっている？',
        options: ['もとの細胞と同じ', 'もとの細胞の半分ずつ', 'もとの細胞とまったくちがう'],
        answer: 'a',
        explanation: '複製された染色体が同じように分かれるので、2 つの細胞は、もとの細胞と同じ遺伝子をもちます。からだの細胞がどれも同じ遺伝子をもつのはこのためです。',
        hint: '複製は、まったく同じものをつくることだね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'heredity-dr2-r1', concept: 'he-division',
        prompt: '根に等間隔に印をつけ、ア〜エの区間に分けました（ア 根もと側 → エ 先端側）。1 日後、印の間隔がほとんど変わらない区間はどれ？',
        figure: ROOT_MARKS_Q,
        answer: 'r1',
        explanation: '根もと側（ア）の細胞は、すでに大きくなり終わっているので、間隔はほとんど変わりません。のびるのは先端に近い部分です。',
        hint: '細胞分裂がさかんな部分から、いちばん遠いのはどこかな。',
      }),
      fill({
        id: 'heredity-dr2-r2', concept: 'he-division',
        prompt: '1 つの細胞が体細胞分裂を 3 回くり返しました。細胞はいくつになる？（どの細胞も毎回 2 つに分かれるとする）',
        text: '細胞の数は[b1]になる。',
        blanks: [number('b1', 8, 0, '個')],
        explanation: '1 回の分裂で数が 2 倍になるので、1 → 2 → 4 → 8 となり、3 回で 8 個です。',
        hint: '2 を 3 回かけてみよう。',
      }),
      choice({
        id: 'heredity-dr2-r3', concept: 'he-division',
        prompt: 'ヒトの皮ふの細胞が体細胞分裂で 2 つに分かれるとき、最後はどのように分かれる？',
        options: ['細胞の中央がくびれて分かれる', '細胞の中央にしきりができる', '核だけが 2 つになり細胞は 1 つのまま'],
        answer: 'a',
        explanation: 'ヒトの細胞は動物の細胞なので、細胞壁がなく、中央がくびれて 2 つに分かれます。しきりができるのは植物の細胞です。',
        hint: 'ヒトは動物だね。',
      }),
      choice({
        id: 'heredity-dr2-t2', concept: 'he-division', term: true,
        prompt: '次の説明に合う言葉はどれ？「細胞分裂の前に、染色体と同じものがもう 1 本つくられること」',
        options: ['複製', '減数分裂', '発生'],
        answer: 'a',
        explanation: '同じ染色体がもう 1 本つくられることを**複製**といいます。減数分裂は、生殖細胞をつくるときの分裂です。',
        hint: 'コピーをつくるイメージだよ。',
      }),
    ],
  };

  // ---- ステージ heredity-dr3: 生物の成長とふえ方 後半（無性生殖のいろいろ・染色体の受けつがれ方） ----
  const heredityDr3 = {
    id: 'heredity-dr3', areaId: 'he-cell', free: true, title: 'ドリル 3: 生殖と染色体の受けつがれ方', minutes: 6, concepts: ['he-reproduction'],
    lessons: [
      {
        id: 'heredity-dr3-c1',
        text: '無性生殖には、からだが 2 つに分かれる分裂（ゾウリムシ）、からだの一部がふくらんで分かれる**出芽**（ヒドラ・酵母）、いもや茎などから新しい個体ができる栄養生殖（ジャガイモ・さし木）があります。子は親と同じ遺伝子をもちます。',
        // 無性生殖の 3 つの例
        figure: scene([
          { type: 'rect', x: 8, y: 40, width: 96, height: 150, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 112, y: 40, width: 96, height: 150, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'rect', x: 216, y: 40, width: 96, height: 150, rx: 8, fill: 'white', stroke: 'line' },
          { type: 'text', x: 56, y: 72, text: '分裂', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 56, y: 120, text: 'ゾウリムシ', size: 12, anchor: 'middle' },
          { type: 'text', x: 56, y: 144, text: 'ミカヅキモ', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 72, text: '出芽', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 120, text: 'ヒドラ', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 144, text: '酵母', size: 12, anchor: 'middle' },
          { type: 'text', x: 264, y: 72, text: '栄養生殖', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 264, y: 120, text: 'ジャガイモ', size: 12, anchor: 'middle' },
          { type: 'text', x: 264, y: 144, text: 'さし木', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '子は親と同じ遺伝子をもつ', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'heredity-dr3-c2',
        anim: 'he-meiosis-fertilize',   // 動く図の使い回し（js/anim-bio.js）。figure は静止図として残す
        text: '有性生殖では、減数分裂で染色体が半分になった生殖細胞が、両親からそれぞれ 1 つずつ受精します。受精卵は、対になる染色体の一方を父親から、もう一方を母親から受けつぎ、もとの数にもどります。',
        // 親 A（青）・親 B（橙）→ 生殖細胞 → 受精卵
        figure: scene([
          ...colorCell(60, 48, 30, CH_A),
          ...colorCell(260, 48, 30, CH_B),
          { type: 'arrow', x1: 60, y1: 82, x2: 60, y2: 106, color: 'gray', width: 2 },
          { type: 'arrow', x1: 260, y1: 82, x2: 260, y2: 106, color: 'gray', width: 2 },
          ...colorCell(60, 128, 20, [[-5, 11, 'blue'], [5, 6, 'blue']]),
          ...colorCell(260, 128, 20, [[-5, 11, 'orange'], [5, 6, 'orange']]),
          { type: 'arrow', x1: 82, y1: 140, x2: 128, y2: 176, color: 'gray', width: 2 },
          { type: 'arrow', x1: 238, y1: 140, x2: 192, y2: 176, color: 'gray', width: 2 },
          ...colorCell(160, 196, 30, [[-15, 11, 'blue'], [-5, 6, 'blue'], [5, 11, 'orange'], [15, 6, 'orange']], 'pink'),
          { type: 'text', x: 112, y: 52, text: '親（4 本）', size: 12 },
          { type: 'text', x: 100, y: 132, text: '生殖細胞（2 本）', size: 12 },
          { type: 'text', x: 200, y: 222, text: '受精卵（4 本）', size: 12 },
        ]),
      },
    ],
    warmup: choice({
      id: 'heredity-dr3-w1', concept: 'he-reproduction',
      prompt: '予想しよう。サクラのソメイヨシノは、つぎ木でふやされています。つぎ木でふやした木の花は、もとの木の花とくらべてどうなると思う？',
      options: ['もとの木と同じ', '木ごとにまったくちがう', '白と赤の花が半分ずつ'],
      answer: 'a',
      explanation: 'つぎ木は、からだの一部から新しい個体をつくる無性生殖（栄養生殖）のなかまです。子は親と同じ遺伝子をもつので、同じ形質の花がさきます。',
      hint: 'つぎ木では、受精が起こるかな。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-dr3-p1', concept: 'he-reproduction',
        prompt: '上は親 A（青）と親 B（橙）の体細胞の染色体です。この両親の有性生殖でできた子の体細胞を表しているのは、ア〜ウのどれ？（ア 青 2 本と橙 2 本、イ 青 4 本、ウ 青 4 本と橙 4 本）',
        figure: INHERIT_Q,
        answer: 'r1',
        explanation: '生殖細胞は減数分裂で染色体が半分（2 本）になります。受精卵は両親から 2 本ずつ受けついで 4 本になるので、アです。ウは数が 2 倍になっています。',
        hint: '子は、両親から半分ずつ受けつぐよ。',
      }),
      fill({
        id: 'heredity-dr3-t1', concept: 'he-reproduction', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ヒドラのように、からだの一部がふくらみ、それが分かれて新しい個体になるふえ方を[b1]という。',
        blanks: [word('b1', ['出芽', '分裂', '受精'], '出芽')],
        explanation: 'からだにできた芽のようなふくらみが育って分かれるふえ方が**出芽**です。無性生殖の 1 つで、酵母もこの方法でふえます。',
        hint: '「芽が出る」ようにふくらむよ。',
      }),
      fill({
        id: 'heredity-dr3-p2', concept: 'he-reproduction',
        prompt: 'タマネギの体細胞の染色体は 16 本です。花粉の中でつくられる精細胞の染色体は何本？',
        text: '精細胞の染色体は[b1]である。',
        blanks: [number('b1', 8, 0, '本')],
        explanation: '精細胞は生殖細胞なので、減数分裂で染色体が体細胞の半分になります。16 ÷ 2 ＝ 8 本です。',
        hint: '生殖細胞をつくる分裂では、染色体の数はどうなるかな。',
      }),
      choice({
        id: 'heredity-dr3-p3', concept: 'he-reproduction',
        prompt: 'おいしい品種のジャガイモは、種子ではなく、いもを植えてふやします。その理由として正しいものはどれ？',
        options: ['親と同じ形質の株を確実にふやせるから', 'いろいろな形質の株ができるから', '受精が起こりやすくなるから'],
        answer: 'a',
        explanation: 'いもでふやすのは無性生殖なので、子は親と同じ遺伝子をもち、同じおいしさの株ができます。種子でふやすと有性生殖になり、形質がばらつきます。',
        hint: 'いもでふやすのは、無性生殖と有性生殖のどちらかな。',
      }),
      choice({
        id: 'heredity-dr3-p4', concept: 'he-reproduction',
        prompt: 'もし、生殖細胞が減数分裂をせずにつくられたとすると、受精卵の染色体の数はどうなる？',
        options: ['親の体細胞の 2 倍になる', '親の体細胞と同じになる', '親の体細胞の半分になる'],
        answer: 'a',
        explanation: '生殖細胞が親と同じ数の染色体をもつと、受精で 2 つが合わさって 2 倍になってしまいます。減数分裂で半分にするから、代を重ねても数が変わりません。',
        hint: '受精では、2 つの生殖細胞の染色体が合わさるよ。',
      }),
      choice({
        id: 'heredity-dr3-p5', concept: 'he-reproduction',
        prompt: '有性生殖についての説明として、まちがっているものはどれ？',
        options: ['子は片方の親の遺伝子だけをもつ', '子は両親から遺伝子を半分ずつ受けつぐ', '生殖細胞は減数分裂でつくられる'],
        answer: 'a',
        explanation: '有性生殖の子は、父親と母親の両方から半分ずつ遺伝子を受けつぎます。片方の親だけの遺伝子をもつのは、無性生殖の子です。',
        hint: '受精では、2 つの生殖細胞が合わさるね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'heredity-dr3-r1', concept: 'he-reproduction',
        prompt: '上は親 A（青）と親 B（橙）の体細胞の染色体です。親 A が無性生殖で子をつくったとすると、子の体細胞はア〜ウのどれ？（ア 青 2 本と橙 2 本、イ 青 4 本、ウ 青 4 本と橙 4 本）',
        figure: INHERIT_Q,
        answer: 'r2',
        explanation: '無性生殖では、親のからだの細胞が体細胞分裂でふえて子になるので、子は親 A とまったく同じ染色体（青 4 本）をもちます。',
        hint: '無性生殖では、親は 1 つだけだね。',
      }),
      fill({
        id: 'heredity-dr3-r2', concept: 'he-reproduction',
        prompt: 'イネの体細胞の染色体は 24 本です。イネの卵細胞の染色体は何本？',
        text: '卵細胞の染色体は[b1]である。',
        blanks: [number('b1', 12, 0, '本')],
        explanation: '卵細胞は生殖細胞なので、減数分裂で染色体が半分になります。24 ÷ 2 ＝ 12 本です。受精すると、また 24 本にもどります。',
        hint: '生殖細胞は、体細胞の何分の 1 かな。',
      }),
      choice({
        id: 'heredity-dr3-r3', concept: 'he-reproduction',
        prompt: 'パンづくりに使う酵母は、からだの一部がふくらんで分かれてふえます。このふえ方は、次のどれにあたる？',
        options: ['無性生殖', '有性生殖', '受精'],
        answer: 'a',
        explanation: '酵母は出芽でふえます。雌雄が関わらずに子をつくるので、無性生殖です。',
        hint: '生殖細胞が受精するかどうかで考えよう。',
      }),
      choice({
        id: 'heredity-dr3-t2', concept: 'he-reproduction', term: true,
        prompt: '次の説明に合う言葉はどれ？「無性生殖でできた子のように、親とまったく同じ遺伝子をもつ個体の集まり」',
        options: ['クローン', '純系', '胚'],
        answer: 'a',
        explanation: '親とまったく同じ遺伝子をもつ個体の集まりを**クローン**といいます。さし木やいもでふやした植物はクローンです。',
        hint: 'カタカナの言葉だよ。',
      }),
    ],
  };

  // ---- ステージ heredity-dr4: 遺伝の規則性と遺伝子 前半（子葉の色の実験・顕性と潜性・分離の法則） ----
  const heredityDr4 = {
    id: 'heredity-dr4', areaId: 'he-gene', free: true, title: 'ドリル 4: メンデルの実験と分離の法則', minutes: 6, concepts: ['he-mendel'],
    lessons: [
      {
        id: 'heredity-dr4-c1',
        text: 'メンデルは、エンドウの種子の形や子葉の色など、対立形質に注目して実験しました。子葉が黄色の純系と緑色の純系をかけ合わせると、子の子葉はすべて黄色になりました。黄色が**顕性形質**、緑色が**潜性形質**です。',
        // 子葉の色の遺伝（親 → 子 → 孫）
        figure: scene(peaGenerations().concat([
          { type: 'text', x: 228, y: 125, text: 'すべて黄', size: 12 },
          { type: 'text', x: 232, y: 195, text: '黄：緑≒3：1', size: 12 },
        ])),
      },
      {
        id: 'heredity-dr4-c2',
        text: '子どうしをかけ合わせると、孫には緑色が再び現れます。子（Aa）は緑の遺伝子 a をかくしもっていて、生殖細胞をつくるとき A と a が分かれて入る（**分離の法則**）ので、孫で a が 2 つそろうと緑色になります。',
        // Aa どうしのかけ合わせ（黄の遺伝子 A、緑の遺伝子 a）
        figure: scene(punnett(['AA', 'Aa', 'Aa', 'aa']).concat([
          { type: 'text', x: 160, y: 198, text: 'A: 黄の遺伝子　a: 緑の遺伝子', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: 'aa だけが緑色になる', size: 14, anchor: 'middle', bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'heredity-dr4-w1', concept: 'he-mendel',
      prompt: '予想しよう。親の一方の緑色の子葉は、子には現れず、孫に再び現れました。子の代で、緑色のもとはどうなっていたと思う？',
      options: ['子の中にかくれていた', '子の代で消え、孫で新しくできた', '孫が育つ場所で変わった'],
      answer: 'a',
      explanation: '子は緑の遺伝子をもっていますが、黄の遺伝子が顕性なので緑色は現れません。かくれていた緑の遺伝子が、孫の代で 2 つそろうと緑色が現れます。',
      hint: '遺伝子は、なくならずに受けつがれるよ。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-dr4-p1', concept: 'he-mendel',
        prompt: '子葉の色の遺伝の図です（ア 親の緑、イ 子の黄色、ウ 孫の緑）。一度現れなくなった潜性形質が、再び現れているのはア〜ウのどれ？',
        figure: PEA_GEN_Q,
        answer: 'r3',
        explanation: '緑色（潜性形質）は子の代では現れず、孫の代で再び現れます（ウ）。子が緑の遺伝子をかくしもっていたからです。',
        hint: '子の代を飛ばして現れたのは、どの代かな。',
      }),
      fill({
        id: 'heredity-dr4-t1', concept: 'he-mendel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '子葉が黄色の純系と緑色の純系をかけ合わせると、子はすべて黄色になった。黄色のように、子に現れる形質を[b1]という。',
        blanks: [word('b1', ['顕性形質', '潜性形質', '対立形質'], '顕性形質')],
        explanation: '純系どうしをかけ合わせたとき、子に現れる形質を**顕性形質**（優性形質）といいます。子葉の色では黄色が顕性形質です。',
        hint: '「顕」は、はっきり現れるという意味だよ。',
      }),
      fill({
        id: 'heredity-dr4-p2', concept: 'he-mendel',
        prompt: 'メンデルの実験では、孫の代の子葉は黄色 6022 個、緑色 2001 個でした。黄色は緑色の約何倍？ 小数第 1 位まで求めよう。',
        text: '黄色は緑色の約[b1]である。',
        blanks: [number('b1', 3, 0.1, '倍')],
        explanation: '6022 ÷ 2001 ＝ 3.00… なので、約 3.0 倍です。黄色：緑色はおよそ 3：1 になっています。',
        hint: '黄色の数を緑色の数でわろう。',
      }),
      choice({
        id: 'heredity-dr4-p3', concept: 'he-mendel',
        prompt: '黄の遺伝子を A、緑の遺伝子を a とします。孫の代の黄色の子葉の遺伝子の組み合わせとして考えられるものはどれ？',
        options: ['AA と Aa', 'AA だけ', 'Aa だけ', 'aa'],
        answer: 'a',
        explanation: '孫の組み合わせは AA・Aa・aa の 3 種類です。A を 1 つでももてば黄色になるので、黄色は AA と Aa の 2 通りがあります。',
        hint: 'A が 1 つあれば、黄色が現れるよ。',
      }),
      fill({
        id: 'heredity-dr4-p4', concept: 'he-mendel',
        prompt: 'メンデルがエンドウを遺伝の実験に使ったのは、純系を得やすかったからです。',
        text: 'エンドウは自然の状態では[b1]をするので、純系を得やすい。',
        blanks: [word('b1', ['自家受粉', '他家受粉', '無性生殖'], '自家受粉')],
        explanation: 'エンドウは自然の状態では、花の中で自分の花粉がめしべについて受粉（自家受粉）するので純系を得やすく、種子の形や子葉の色など、はっきり区別できる対立形質をもっています。',
        hint: 'エンドウの花は、つぼみのうちに自分の花粉で受粉するよ。',
      }),
      choice({
        id: 'heredity-dr4-p5', concept: 'he-mendel',
        prompt: '子の代（Aa）の子葉が、緑の遺伝子 a をもつのに黄色になるのはなぜ？',
        options: ['黄の遺伝子 A が顕性だから', '緑の遺伝子 a がはたらかなくなったから', 'A を 2 つもっているから'],
        answer: 'a',
        explanation: 'A と a の両方をもつとき、顕性の A の形質（黄色）が現れます。a はなくなったわけではなく、子孫に受けつがれます。',
        hint: '顕性と潜性の遺伝子を両方もつと、どちらの形質が現れるかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'heredity-dr4-r1', concept: 'he-mendel',
        prompt: '子葉の色の遺伝の図です（ア 親の緑、イ 子の黄色、ウ 孫の緑）。緑の遺伝子をもっているのに、子葉が黄色になっているのはア〜ウのどれ？',
        figure: PEA_GEN_Q,
        answer: 'r2',
        explanation: '子（イ）は、黄の親から A、緑の親から a を受けつぎ、Aa です。a をもっていますが、顕性の A の黄色が現れます。',
        hint: '両方の親から遺伝子を 1 つずつ受けついでいる代はどれかな。',
      }),
      choice({
        id: 'heredity-dr4-r2', concept: 'he-mendel',
        prompt: '黄の遺伝子を A、緑の遺伝子を a とします。孫の代の緑色の子葉の遺伝子の組み合わせはどれ？',
        options: ['aa', 'Aa', 'AA'],
        answer: 'a',
        explanation: '潜性形質の緑色が現れるのは、a が 2 つそろった aa のときだけです。A を 1 つでももつと黄色になります。',
        hint: '潜性の形質が現れるのは、どんなときかな。',
      }),
      choice({
        id: 'heredity-dr4-r3', concept: 'he-mendel',
        prompt: 'エンドウの形質の組み合わせのうち、対立形質の組み合わせはどれ？',
        options: ['子葉の黄色と子葉の緑色', '子葉の黄色と種子の丸', '種子の丸とさやの緑色'],
        answer: 'a',
        explanation: '対立形質は、同じ部分の形質で、どちらか一方しか現れないものどうしです。子葉の黄色と緑色は、どちらも子葉の色なので対立形質です。',
        hint: '同じ部分の形質どうしをさがそう。',
      }),
      choice({
        id: 'heredity-dr4-t2', concept: 'he-mendel', term: true,
        prompt: '子葉が黄色の純系と緑色の純系をかけ合わせました。子に現れなかった緑色のような形質を何という？',
        options: ['潜性形質', '顕性形質', '対立形質'],
        answer: 'a',
        explanation: '子に現れない形質を**潜性形質**（劣性形質）といいます。潜性形質は、孫の代で再び現れることがあります。',
        hint: '「潜」は、もぐってかくれるという意味だよ。',
      }),
    ],
  };

  // ---- ステージ heredity-dr5: 遺伝の規則性と遺伝子 後半（数の計算・遺伝子の見分け方・DNA と遺伝子の利用） ----
  const heredityDr5 = {
    id: 'heredity-dr5', areaId: 'he-gene', free: true, title: 'ドリル 5: かけ合わせの計算と遺伝子の利用', minutes: 7, concepts: ['he-ratio', 'he-mendel'],
    lessons: [
      {
        id: 'heredity-dr5-c1',
        text: 'Aa どうしをかけ合わせると、AA：Aa：aa ＝ 1：2：1 になります。全体の数に割合をかけると、それぞれの数が求められます。たとえば 400 個なら、AA と aa は約 100 個、Aa は約 200 個です。',
        // Aa どうしの表と、400 個のときの数
        figure: scene(punnett(['AA', 'Aa', 'Aa', 'aa']).concat([
          { type: 'text', x: 160, y: 198, text: 'AA：Aa：aa ＝ 1：2：1', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: '400 個 → 約 100・200・100 個', size: 13, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'heredity-dr5-c2',
        text: '丸い種子が AA か Aa かは、見た目では分かりません。しわ（aa）とかけ合わせて、子がすべて丸なら AA、丸としわが 1：1 で出れば Aa と分かります。',
        // Aa と aa のかけ合わせ
        figure: scene(crossTable(['A', 'a'], ['a', 'a'], ['Aa', 'aa', 'Aa', 'aa']).concat([
          { type: 'text', x: 160, y: 198, text: '丸（?）× しわ（aa）', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 224, text: 'しわが出たら、丸は Aa', size: 14, anchor: 'middle', bold: true },
        ])),
      },
      {
        id: 'heredity-dr5-c3',
        text: '遺伝子の本体は DNA です。ある生物の遺伝子を別の生物の DNA に組みこむ**遺伝子組換え**で、病気や害虫に強い作物や医薬品がつくられています。DNA は人によってちがうので、個人の見分けにも使われます。',
        // DNA の二重らせんと、遺伝子の利用
        figure: scene(helixItems().concat([
          { type: 'text', x: 160, y: 30, text: 'DNA（遺伝子の本体）', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 182, text: '遺伝子組換えの作物・医薬品', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 206, text: 'DNA による個人の見分け', size: 13, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'heredity-dr5-w1', concept: 'he-mendel',
      prompt: '予想しよう。糖尿病の薬のインスリンは、大腸菌につくらせることができます。大腸菌に何を入れていると思う？',
      options: ['インスリンをつくる遺伝子', '消化酵素', '葉緑体'],
      answer: 'a',
      explanation: 'ヒトのインスリンをつくる遺伝子を大腸菌の DNA に組みこむと、大腸菌がインスリンをつくります。遺伝子組換えの技術の例です。',
      hint: '形質を決めるもとになるものは何だったかな。',
    }),
    problems: [
      figureChoice({
        id: 'heredity-dr5-p1', concept: 'he-ratio',
        prompt: '丸（AA）と丸（Aa）のエンドウをかけ合わせました。子の種子のようすを表しているのはア〜ウのどれ？（ア すべて丸、イ すべてしわ、ウ 丸 3 つにしわ 1 つの割合）',
        figure: scene(peaBoxes().concat([
          { type: 'region', id: 'r1', x: 56, y: 192, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 192, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 192, r: 22, label: 'ウ' },
        ])),
        answer: 'r1',
        explanation: 'AA の生殖細胞は A だけなので、子は AA か Aa になり、どれも A をもちます。だから、子はすべて丸です（ア）。',
        hint: 'AA の親からは、どの遺伝子を受けつぐかな。',
      }),
      fill({
        id: 'heredity-dr5-t1', concept: 'he-mendel', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ある生物の遺伝子をとり出して、別の生物の DNA に組みこむ技術を[b1]という。',
        blanks: [word('b1', ['遺伝子組換え', '栄養生殖', '自家受粉'], '遺伝子組換え')],
        explanation: '目的の遺伝子をほかの生物の DNA に組みこむ技術を**遺伝子組換え**といいます。作物の品種改良や医薬品づくりに使われています。',
        hint: '遺伝子を「組みかえる」技術だよ。',
      }),
      fill({
        id: 'heredity-dr5-p2', concept: 'he-ratio',
        prompt: 'Aa どうしをかけ合わせて、種子が 1200 個できました。このうち、遺伝子の組み合わせが Aa の種子は約何個？',
        text: 'Aa の種子は約[b1]である。',
        blanks: [number('b1', 600, 0, '個')],
        explanation: 'AA：Aa：aa ＝ 1：2：1 なので、Aa は全体の 2/4 ＝ 1/2 です。1200 × 1/2 ＝ 600 個です。',
        hint: '1：2：1 の 2 が、全体のどれだけかを考えよう。',
      }),
      fill({
        id: 'heredity-dr5-p3', concept: 'he-ratio',
        prompt: 'Aa どうしをかけ合わせてできた丸い種子が 900 個ありました。このうち、AA の種子は約何個？',
        text: 'AA の種子は約[b1]である。',
        blanks: [number('b1', 300, 0, '個')],
        explanation: '丸い種子は AA と Aa で、その比は 1：2 です。AA は丸い種子の 1/3 なので、900 × 1/3 ＝ 300 個です。',
        hint: '丸い種子だけで考えると、AA：Aa は何対何かな。',
      }),
      choice({
        id: 'heredity-dr5-p4', concept: 'he-ratio',
        prompt: '丸い種子 X の遺伝子を調べるため、しわ（aa）とかけ合わせたら、丸としわの子がほぼ同じ数できました。X の遺伝子の組み合わせはどれ？',
        options: ['Aa', 'AA', 'aa'],
        answer: 'a',
        explanation: 'しわ（aa）が現れたので、X は a をもっています。丸なので A ももつから、X は Aa です。Aa × aa で、丸：しわ ＝ 1：1 になります。',
        hint: 'しわの子ができるには、X も a をもっている必要があるよ。',
      }),
      choice({
        id: 'heredity-dr5-p5', concept: 'he-mendel',
        prompt: '事件の現場に残った髪の毛から、だれのものかを調べられることがあります。DNA が使われるのはなぜ？',
        options: ['DNA は人によってちがうから', 'DNA はだれでもまったく同じだから', '髪の毛だけに DNA があるから'],
        answer: 'a',
        explanation: 'DNA（遺伝子）は、一卵性の双子などをのぞいて人によってちがうので、個人を見分ける手がかりになります。DNA はからだのほとんどの細胞にあります。',
        hint: '顔や形質が人によってちがうのは、なぜだったかな。',
      }),
    ],
    retryPool: [
      fill({
        id: 'heredity-dr5-r1', concept: 'he-ratio',
        prompt: 'Aa どうしをかけ合わせたところ、丸い種子が 450 個できました。しわのある種子は約何個できたと考えられる？',
        text: 'しわのある種子は約[b1]である。',
        blanks: [number('b1', 150, 0, '個')],
        explanation: '丸：しわ ＝ 3：1 なので、しわは丸の 1/3 です。450 ÷ 3 ＝ 150 個です。',
        hint: '丸：しわ ＝ 3：1 を使おう。',
      }),
      figureChoice({
        id: 'heredity-dr5-r2', concept: 'he-ratio',
        prompt: 'しわ（aa）どうしのエンドウをかけ合わせました。子の種子のようすを表しているのはア〜ウのどれ？（ア すべて丸、イ すべてしわ、ウ 丸 3 つにしわ 1 つの割合）',
        figure: scene(peaBoxes().concat([
          { type: 'region', id: 'r1', x: 56, y: 192, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 160, y: 192, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 264, y: 192, r: 22, label: 'ウ' },
        ])),
        answer: 'r2',
        explanation: 'aa の親の生殖細胞は a だけです。子はすべて aa になるので、すべてしわです（イ）。',
        hint: 'どちらの親も a しかもっていないね。',
      }),
      choice({
        id: 'heredity-dr5-r3', concept: 'he-mendel',
        prompt: '遺伝子組換えの技術を使った例として、正しいものはどれ？',
        options: ['害虫に強いダイズをつくる', 'さし木でサクラをふやす', 'エンドウを自家受粉させる'],
        answer: 'a',
        explanation: '害虫に強くなる遺伝子をほかの生物から組みこんだ作物は、遺伝子組換えの例です。さし木や自家受粉は、遺伝子を組みかえていません。',
        hint: '遺伝子をほかの生物から入れているものをさがそう。',
      }),
      choice({
        id: 'heredity-dr5-r4', concept: 'he-mendel',
        prompt: '丸い種子 Y をしわ（aa）とかけ合わせたら、子はすべて丸い種子になりました。Y の遺伝子の組み合わせはどれ？',
        options: ['AA', 'Aa', 'aa'],
        answer: 'a',
        explanation: 'Y が a をもっていれば、しわ（aa）の子もできるはずです。子がすべて丸なので、Y は A しかもたない AA と考えられます。',
        hint: 'Y が Aa だったら、しわの子はできるかな。',
      }),
      choice({
        id: 'heredity-dr5-t2', concept: 'he-mendel', term: true,
        prompt: '次の説明に合う言葉はどれ？「遺伝子の本体である物質。2 本の鎖がねじれた形をしている」',
        options: ['DNA', 'デンプン', '葉緑体'],
        answer: 'a',
        explanation: '遺伝子の本体は **DNA**（デオキシリボ核酸）で、染色体にふくまれています。',
        hint: 'アルファベット 3 文字の物質だよ。',
      }),
    ],
  };

  // ---- ステージ heredity-dr6: 生物の多様性と進化（5 つのなかまの特徴・現れた時代・進化の道すじ） ----
  const heredityDr6 = {
    id: 'heredity-dr6', areaId: 'he-gene', free: true, title: 'ドリル 6: セキツイ動物の多様性と進化', minutes: 6, concepts: ['he-evolution'],
    lessons: [
      {
        id: 'heredity-dr6-c1',
        text: 'セキツイ動物の 5 つのなかまは、呼吸のしかた、体表のようす、子の生まれ方がちがいます。鳥類とホニュウ類は、まわりの温度が変わっても体温がほぼ一定の**恒温動物**、ほかの 3 つは**変温動物**です。',
        // 5 つのなかまの特徴の表
        figure: scene([
          { type: 'rect', x: 6, y: 20, width: 308, height: 30, fill: 'glass', stroke: 'line' },
          ...[50, 84, 118, 152, 186].map(y => ({ type: 'rect', x: 6, y, width: 308, height: 34, fill: 'white', stroke: 'line' })),
          ...[[80, 20], [160, 20], [240, 20]].map(([x, y]) => ({ type: 'line', points: [[x, y], [x, 220]], color: 'line', width: 1 })),
          ...[['なかま', '呼吸', '体表', '子'], ['魚類', 'えら', 'うろこ', '卵（水中）'], ['両生類', '子えら・親肺', 'しめった皮ふ', '卵（水中）'],
            ['ハチュウ類', '肺', 'うろこ', '殻のある卵'], ['鳥類', '肺', '羽毛', '殻のある卵'], ['ホニュウ類', '肺', '毛', '胎生']]
            .flatMap((row, i) => row.map((t, j) => ({
              type: 'text', x: [43, 120, 200, 277][j], y: i === 0 ? 40 : 72 + 34 * (i - 1), text: t, size: 12, anchor: 'middle', bold: i === 0,
            }))),
        ]),
      },
      {
        id: 'heredity-dr6-c2',
        text: '化石や共通の特徴から、魚類のなかまから両生類が、両生類のなかまからハチュウ類が進化し、ハチュウ類に近いなかまから鳥類とホニュウ類が進化したと考えられています。生活の場は水中から陸上へ広がりました。',
        // 進化の道すじ
        figure: scene([
          { type: 'text', x: 40, y: 206, text: '魚類', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 110, y: 156, text: '両生類', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 180, y: 106, text: 'ハチュウ類', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 270, y: 46, text: '鳥類', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 270, y: 166, text: 'ホニュウ類', size: 14, anchor: 'middle', bold: true },
          { type: 'arrow', x1: 56, y1: 194, x2: 92, y2: 166, color: 'gray', width: 2 },
          { type: 'arrow', x1: 128, y1: 144, x2: 160, y2: 118, color: 'gray', width: 2 },
          { type: 'arrow', x1: 214, y1: 94, x2: 252, y2: 58, color: 'gray', width: 2 },
          { type: 'arrow', x1: 214, y1: 114, x2: 248, y2: 150, color: 'gray', width: 2 },
          { type: 'text', x: 10, y: 20, text: '水中 → 陸上へ', size: 13, color: 'blue', bold: true },
        ]),
      },
    ],
    warmup: choice({
      id: 'heredity-dr6-w1', concept: 'he-evolution',
      prompt: '予想しよう。気温が 0 ℃ 近い冬の朝でも、活発に動き回れる動物はどれだと思う？',
      options: ['スズメ', 'カエル', 'ヘビ'],
      answer: 'a',
      explanation: 'スズメは鳥類で、体温をほぼ一定に保つ恒温動物なので、寒くても活発に動けます。カエルやヘビは変温動物で、寒いと体温が下がり、動きがにぶくなります。',
      hint: '寒い冬に、カエルやヘビはどうしているかな。',
    }),
    problems: [
      drag({
        id: 'heredity-dr6-p1', concept: 'he-evolution',
        prompt: '図は、魚類（約 5 億年前）とハチュウ類（約 3 億年前）が現れた時代です。両生類はその間の約 4 億年前に現れました。その時代の位置に、青い印を左右に動かして置こう。',
        // 4 億年前 x = 300 − 56 × 4 = 76。不正解例 x = 188（2 億年前）は 112px はなれる
        figure: eraDragScene([[5, '魚類'], [3, 'ハチュウ類']]),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: 76, y: 170 },
        samples: { correct: { x: 76, y: 170 }, wrong: { x: 188, y: 170 } },
        explanation: '両生類は、魚類のあと、ハチュウ類の前に現れました。目もりの「4」の位置（約 4 億年前）です。水中から陸上へ進出した最初のなかまです。',
        hint: '軸の数字は、何億年前かを表しているよ。',
      }),
      fill({
        id: 'heredity-dr6-t1', concept: 'he-evolution', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '鳥類やホニュウ類のように、まわりの温度が変わっても体温がほぼ一定に保たれる動物を[b1]動物という。',
        blanks: [word('b1', ['恒温', '変温', '草食'], '恒温')],
        explanation: '体温をほぼ一定に保つ動物を**恒温動物**、まわりの温度とともに体温が変わる動物を変温動物といいます。',
        hint: '「恒」は、いつも変わらないという意味だよ。',
      }),
      choice({
        id: 'heredity-dr6-p2', concept: 'he-evolution',
        prompt: '鳥類とホニュウ類に共通する特徴はどれ？',
        options: ['恒温動物で、肺で呼吸する', '殻のない卵を水中に産む', '一生えらで呼吸する', '体表がうろこでおおわれている'],
        answer: 'a',
        explanation: '鳥類もホニュウ類も、肺で呼吸する恒温動物です。体表は、鳥類が羽毛、ホニュウ類が毛でおおわれています。',
        hint: '寒い場所でも活動できる 2 つのなかまだね。',
      }),
      choice({
        id: 'heredity-dr6-p3', concept: 'he-evolution',
        prompt: 'ある動物は、肺で呼吸し、殻のある卵を陸上に産み、体表はうろこでおおわれた変温動物です。この動物はどのなかま？',
        options: ['ハチュウ類', '両生類', '鳥類', '魚類'],
        answer: 'a',
        explanation: '殻のある卵を産むのはハチュウ類と鳥類で、そのうちうろこをもつ変温動物はハチュウ類です。',
        hint: '殻のある卵を産むなかまのうち、体表がうろこなのはどちらかな。',
      }),
      fill({
        id: 'heredity-dr6-p4', concept: 'he-evolution',
        prompt: '両生類は、乾燥した場所で長く生活しにくいなかまです。',
        text: '両生類の体表は[b1]なので、乾燥すると水分が失われやすい。',
        blanks: [word('b1', ['しめった皮ふ', 'うろこ', '羽毛'], 'しめった皮ふ')],
        explanation: '両生類の皮ふはうすくしめっていて、乾燥すると水分が失われやすくなります。うろこでおおわれたハチュウ類は、乾燥に強くなりました。',
        hint: '両生類の体表は、うろこでも羽毛でもないね。',
      }),
      choice({
        id: 'heredity-dr6-p5', concept: 'he-evolution',
        prompt: 'セキツイ動物の進化についての説明として、まちがっているものはどれ？',
        options: ['ホニュウ類は鳥類から進化した', '両生類は魚類のなかまから進化した', '鳥類はハチュウ類に近いなかまから進化した'],
        answer: 'a',
        explanation: 'ホニュウ類は鳥類から進化したのではありません。鳥類とホニュウ類は、どちらもハチュウ類に近いなかまから、それぞれ別に進化したと考えられています。',
        hint: 'ホニュウ類と鳥類は、どちらが先に現れたかな。',
      }),
    ],
    retryPool: [
      drag({
        id: 'heredity-dr6-r1', concept: 'he-evolution',
        prompt: '魚類（約 5 億年前）のあと、両生類・ハチュウ類・ホニュウ類が約 1 億年ずつおくれて現れたとします。ホニュウ類が現れた位置に、青い印を左右に動かして置こう。',
        // 2 億年前 x = 300 − 56 × 2 = 188。不正解例 x = 76（4 億年前、両生類）は 112px はなれる
        figure: eraDragScene([[5, '魚類']]),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: 188, y: 170 },
        samples: { correct: { x: 188, y: 170 }, wrong: { x: 76, y: 170 } },
        explanation: '5 億年前 → 両生類 4 億年前 → ハチュウ類 3 億年前 → ホニュウ類 2 億年前です。目もりの「2」の位置に置きます。',
        hint: '5 から 1 ずつ 3 回へらしてみよう。',
      }),
      fill({
        id: 'heredity-dr6-r2', concept: 'he-evolution',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '体表が羽毛でおおわれ、恒温動物で、殻のある卵を産むなかまは[b1]である。',
        blanks: [word('b1', ['鳥類', 'ホニュウ類', 'ハチュウ類'], '鳥類')],
        explanation: '羽毛をもつのは鳥類だけです。鳥類は恒温動物で、殻のある卵を産みます。',
        hint: '羽毛をもつなかまは 1 つだけだよ。',
      }),
      choice({
        id: 'heredity-dr6-r3', concept: 'he-evolution',
        prompt: 'セキツイ動物の 5 つのなかまのうち、変温動物をすべて選んだものはどれ？',
        options: ['魚類・両生類・ハチュウ類', '鳥類・ホニュウ類', '魚類・鳥類', '両生類だけ'],
        answer: 'a',
        explanation: '恒温動物は鳥類とホニュウ類の 2 つで、魚類・両生類・ハチュウ類の 3 つは変温動物です。',
        hint: '恒温動物の 2 つのなかまを除こう。',
      }),
      choice({
        id: 'heredity-dr6-t2', concept: 'he-evolution', term: true,
        prompt: '次の説明に合う言葉はどれ？「子が母親の体内である程度育ってから生まれる、子の生まれ方」',
        options: ['胎生', '卵生', '出芽'],
        answer: 'a',
        explanation: '母親の体内で育ってから生まれる生まれ方を**胎生**といいます。ホニュウ類の多くは胎生です。卵で生まれるのは卵生です。',
        hint: '「胎」は、おなかの中で子が育つことを表す字だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（確認問題 checkPool）
  // ================================================================

  const concepts = [
    {
      id: 'he-division', title: '体細胞分裂と成長', basic: null, lessonStageId: 'life-1',
      checkPool: [
        choice({
          id: 'he-division-k1', concept: 'he-division',
          prompt: '体細胞分裂が始まる前に、染色体はどうなっている？',
          options: ['それぞれ複製されて 2 本ずつになっている', '数が半分に減っている', 'すべてなくなっている'],
          answer: 'a',
          explanation: '分裂の前に、それぞれの染色体は複製されて 2 本ずつになります。それが 2 つの細胞に分かれるので、染色体の数はもとと同じになります。',
          hint: '分裂のあとも数が同じになるわけを考えよう。',
        }),
        fill({
          id: 'he-division-k2', concept: 'he-division',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '根の先端に近く、細胞分裂がさかんに行われている部分を[b1]という。',
          blanks: [word('b1', ['成長点', '根毛', '胚珠'], '成長点')],
          explanation: '根の先端近くで細胞分裂がさかんな部分が成長点です。ここでふえた細胞が大きくなって、根がのびます。',
          hint: '「成長」に関係のある名前だよ。',
        }),
        choice({
          id: 'he-division-k3', concept: 'he-division',
          prompt: '根の先端に近い細胞と、根もとに近い細胞の大きさをくらべると、どうなっている？',
          options: ['先端に近い細胞のほうが小さい', '先端に近い細胞のほうが大きい', 'どこも同じ大きさ'],
          answer: 'a',
          explanation: '先端に近い成長点では分裂したばかりの小さな細胞が多く、根もとに近いほど、大きくなった細胞が並んでいます。',
          hint: '分裂したばかりの細胞は、大きいかな、小さいかな。',
        }),
        choice({
          id: 'he-division-k4', concept: 'he-division', term: true,
          prompt: '次の説明に合う言葉はどれ？「細胞の核の中にあり、細胞分裂のときにひものように見えるもの。遺伝子をふくむ」',
          options: ['染色体', '細胞膜', '葉緑体'],
          answer: 'a',
          explanation: '細胞分裂のときに核の中に見えるひものようなものを**染色体**といいます。染色体には、形質を決める遺伝子がふくまれています。',
          hint: '染色液によく染まるよ。',
        }),
      ],
    },
    {
      id: 'he-reproduction', title: '有性生殖と無性生殖', basic: 'he-division', lessonStageId: 'life-2',
      checkPool: [
        choice({
          id: 'he-reproduction-k1', concept: 'he-reproduction',
          prompt: 'ゾウリムシが 2 つに分かれてふえるのは、どんな生殖？',
          options: ['無性生殖（分裂）', '有性生殖', '受精'],
          answer: 'a',
          explanation: 'ゾウリムシのような単細胞生物は、からだが 2 つに分かれてふえます。雄と雌がかかわらない無性生殖です。',
          hint: '精子や卵はかかわっているかな。',
        }),
        fill({
          id: 'he-reproduction-k2', concept: 'he-reproduction',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '被子植物では、受粉すると花粉から胚珠に向かって[b1]がのびる。',
          blanks: [word('b1', ['花粉管', '道管', '根毛'], '花粉管')],
          explanation: '受粉すると花粉から花粉管がのび、その中を精細胞が胚珠まで運ばれます。',
          hint: '花粉からのびる「管」だよ。',
        }),
        choice({
          id: 'he-reproduction-k3', concept: 'he-reproduction',
          prompt: '動物の「胚」とは、どの時期の子のこと？',
          options: ['受精卵が細胞分裂を始めてから、自分で食物をとり始めるまで', '受精する前の卵', '親と同じ形になったあと'],
          answer: 'a',
          explanation: '受精卵が細胞分裂を始めてから、自分で食物をとり始めるまでの子を胚といいます。胚は発生が進んで、親と同じようなからだになっていきます。',
          hint: 'カエルなら、おたまじゃくしになって食物をとり始める前だよ。',
        }),
      ],
    },
    {
      id: 'he-mendel', title: '顕性・潜性と分離の法則', basic: 'he-reproduction', lessonStageId: 'life-3',
      checkPool: [
        choice({
          id: 'he-mendel-k1', concept: 'he-mendel',
          prompt: '丸の純系としわの純系をかけ合わせると、子はすべて丸になりました。しわの形質を何という？',
          options: ['潜性形質', '顕性形質', '純系'],
          answer: 'a',
          explanation: '子に現れない形質を潜性形質といいます。しわは子には現れませんが、孫の代になると再び現れます。',
          hint: '子に「現れない」ほうの形質だよ。',
        }),
        fill({
          id: 'he-mendel-k2', concept: 'he-mendel',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '遺伝子の本体は、[b1]という物質である。',
          blanks: [word('b1', ['DNA', 'デンプン', 'タンパク質'], 'DNA')],
          explanation: '遺伝子の本体は DNA（デオキシリボ核酸）という物質です。DNA は細胞の核の中の染色体にふくまれています。',
          hint: 'アルファベット 3 文字の物質だよ。',
        }),
        choice({
          id: 'he-mendel-k3', concept: 'he-mendel',
          prompt: '遺伝子は、細胞のどこにある？',
          options: ['核の中の染色体', '細胞膜', '細胞壁'],
          answer: 'a',
          explanation: '遺伝子は、核の中の染色体にあります。細胞分裂のときに染色体が分かれることで、遺伝子も新しい細胞へ受けつがれます。',
          hint: '細胞分裂のときに現れる、ひものようなものを思い出そう。',
        }),
      ],
    },
    {
      id: 'he-ratio', title: '子・孫の比の計算', basic: 'he-mendel', lessonStageId: 'life-3',
      checkPool: [
        fill({
          id: 'he-ratio-k1', concept: 'he-ratio',
          prompt: '空らんに入る数を入れよう。',
          text: '子の代（Aa）どうしをかけ合わせたら、孫の代の種子が 800 個できた。このうち、丸い種子はおよそ[b1]個と考えられる。',
          blanks: [number('b1', 600, 0, '個')],
          explanation: '孫の代では丸 : しわ ＝ 3 : 1 なので、丸は全体の 4 分の 3 です。800 × 3 ÷ 4 ＝ 600 個です。',
          hint: '丸は全体の何分の何かな。',
        }),
        choice({
          id: 'he-ratio-k2', concept: 'he-ratio',
          prompt: '遺伝子が Aa の丸い種子と、aa のしわのある種子をかけ合わせたとき、子の丸 : しわの比はどれ？',
          options: ['1 : 1', '3 : 1', '1 : 3', 'すべて丸'],
          answer: 'a',
          explanation: '子の遺伝子は Aa と aa が同じ数ずつできるので、丸（Aa）: しわ（aa）＝ 1 : 1 です。表をかいて確かめよう。',
          hint: 'aa の親の生殖細胞には、a しか入らないよ。',
        }),
        choice({
          id: 'he-ratio-k3', concept: 'he-ratio',
          prompt: '子の代（Aa）どうしをかけ合わせたとき、孫の代の丸 : しわの比はどれ？',
          options: ['3 : 1', '1 : 1', '1 : 2 : 1', '1 : 3'],
          answer: 'a',
          explanation: 'AA : Aa : aa ＝ 1 : 2 : 1 で、AA と Aa は丸、aa はしわです。だから丸 : しわ ＝ 3 : 1 になります。',
          hint: 'A を 1 つでももてば丸になるよ。',
        }),
      ],
    },
    {
      id: 'he-evolution', title: '進化の証拠', basic: null, lessonStageId: 'life-4',
      checkPool: [
        choice({
          id: 'he-evolution-k1', concept: 'he-evolution',
          prompt: 'セキツイ動物のなかまが地球上に現れた順として、正しいものはどれ？',
          options: ['魚類 → 両生類 → ハチュウ類 → ホニュウ類・鳥類', '両生類 → 魚類 → ハチュウ類 → ホニュウ類・鳥類', '魚類 → ハチュウ類 → 両生類 → ホニュウ類・鳥類'],
          answer: 'a',
          explanation: '化石の記録から、魚類 → 両生類 → ハチュウ類 → ホニュウ類と鳥類の順に現れたと考えられています。水中から陸上へと生活の場を広げていったことが分かります。',
          hint: '水中でくらすなかまから順に考えよう。',
        }),
        fill({
          id: 'he-evolution-k2', concept: 'he-evolution',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'ヒトのうでとクジラのひれのように、形やはたらきはちがっても、もとは同じ器官だったと考えられるものを[b1]という。',
          blanks: [word('b1', ['相同器官', '対立形質', '感覚器官'], '相同器官')],
          explanation: 'もとは同じ器官だったと考えられるものを相同器官といいます。骨格の基本のつくりが似ていることが手がかりです。',
          hint: '「もとが同じ」という意味の言葉だよ。',
        }),
        choice({
          id: 'he-evolution-k3', concept: 'he-evolution',
          prompt: '相同器官があることから、どんなことが考えられる？',
          options: ['それらの生物が、共通の祖先から進化してきた', 'それらの生物が、同じ場所でくらしている', 'それらの生物は、同じ食物を食べている'],
          answer: 'a',
          explanation: '骨格の基本のつくりが同じなのは、共通の祖先がもっていた器官が、それぞれのくらしに合うように変化したためと考えられます。相同器官は進化の証拠の 1 つです。',
          hint: '「もとが同じ」器官があるのはなぜかな。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'heredity',
    title: '生命の連続性',
    mascot: 'F',   // 担当の先生（まめ博士。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'he-cell', title: '細胞分裂と生殖', order: 1, stages: [life1, life2, heredityMp1, heredityMp2, heredityMp3, heredityDr2, heredityDr3] },
      { id: 'he-gene', title: '遺伝と進化', order: 2, stages: [life3, life4, heredityMp4, heredityMp5, heredityDr1, heredityDr4, heredityDr5, heredityDr6] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
