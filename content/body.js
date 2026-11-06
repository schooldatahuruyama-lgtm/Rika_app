// 「生物のからだのつくりとはたらき」教材データ（中学2年 理科）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通指示 .ai-tasks/20261104-170000_単元教材の共通指示.md）。
// 2 領域 × 2 ステージ（細胞と植物のはたらき・動物のからだ）と、概念 6 つ（id は単元の接頭辞 bo- を付けて全単元で一意にする）。
// 領域 3「ミニプリント」（11 ステージ、概念 3 つを追加）は、先生のミニプリントの問題を書き直したもの（.ai-tasks/20261106-130000_ミニプリント反映_共通.md）。
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

  // ---- からだの図の部品（汎用の部品を組み合わせる） ----

  // 引き出し線（細い点線）
  function leader(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'gray', width: 1, dashed: true };
  }

  // ---- 写真ふうの画像の上に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----

  // 画像（場面いっぱい）。src は assets/images/body/<カード id>.jpg
  function photo(id) { return { type: 'image', src: 'assets/images/body/' + id + '.jpg' }; }
  // 写真の上の引き出し線（濃い実線）
  function pin(x1, y1, x2, y2) { return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 }; }
  // 白い下地つきの文字。o で size・anchor・bold・color を上書きする（size の既定 14）
  function tag(x, y, text, o) { return Object.assign({ type: 'text', x, y, text, size: 14, bg: true }, o); }

  // 植物の細胞（細胞壁・細胞膜・液胞・葉緑体・核）。(cx, cy) が中心、s は倍率。幅 160s・高さ 200s
  // 細胞膜（内側の角の丸い四角）は細胞壁の 11s 内側。核の中心 (cx−42s, cy−50s)、液胞の中心 (cx+15s, cy+10s)
  const CHLOROPLASTS = [[-48, 0], [-50, 40], [-40, 76], [10, -72], [52, -68], [56, 80], [5, 80]];
  function plantCell(cx, cy, s) {
    const k = v => v * s;
    return [
      { type: 'rect', x: cx - k(80), y: cy - k(100), width: k(160), height: k(200), fill: 'lightgreen', stroke: 'green' },
      { type: 'rect', x: cx - k(69), y: cy - k(89), width: k(138), height: k(178), rx: k(8), fill: 'white', stroke: 'line' },
      { type: 'ellipse', x: cx + k(15), y: cy + k(10), rx: k(42), ry: k(58), fill: 'sky', stroke: 'line' },
      ...CHLOROPLASTS.map(([dx, dy]) => ({ type: 'ellipse', x: cx + k(dx), y: cy + k(dy), rx: k(9), ry: k(5), fill: 'green', stroke: 'none' })),
      { type: 'circle', x: cx - k(42), y: cy - k(50), r: k(16), fill: 'purple', stroke: 'line' },
    ];
  }

  // 植物の細胞の選ぶ場所（ア 核、イ 葉緑体、ウ 細胞壁、エ 液胞）。部品の名前は図に書かない
  // 細胞 (160, 120)・倍率 1: 核 (118, 70)、葉緑体 (110, 160)、細胞壁の右の帯 x 229〜240、液胞 (175, 130)
  const PLANT_CELL_Q = scene(plantCell(160, 120, 1).concat([
    leader(58, 70, 102, 70),
    leader(58, 160, 101, 160),
    leader(258, 40, 236, 40),
    leader(258, 130, 200, 130),
    { type: 'region', id: 'r1', x: 36, y: 70, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 36, y: 160, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 280, y: 40, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 280, y: 130, r: 22, label: 'エ' },
  ]));

  // 楕円の葉のうち、x1〜x2・y1〜y2 の範囲の部分を多角形で返す（ふ・緑の部分・アルミはくの下を塗り分ける）
  function leafPart(cx, cy, rx, ry, x1, x2, y1, y2, fill) {
    const top = [], bottom = [];
    for (let x = x1; x <= x2 + 0.001; x += (x2 - x1) / 24) {
      const t = (x - cx) / rx;
      const h = ry * Math.sqrt(Math.max(0, 1 - t * t));
      const a = Math.max(y1, cy - h), b = Math.min(y2, cy + h);
      if (a < b) { top.push([Math.round(x), Math.round(a)]); bottom.push([Math.round(x), Math.round(b)]); }
    }
    return { type: 'polygon', points: top.concat(bottom.reverse()), fill, stroke: 'none' };
  }
  // 楕円の葉のふちのうち、y が y0 より下の部分（アルミはくの下にかくれたふちを点線で示す）
  function leafLowerEdge(cx, cy, rx, ry, y0) {
    const pts = [];
    for (let i = 0; i <= 36; i++) {
      const a = Math.PI * i / 36;   // 右はし → 下 → 左はし
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      if (y >= y0) pts.push([Math.round(x), Math.round(y)]);
    }
    return { type: 'line', points: pts, color: 'gray', width: 1, dashed: true };
  }

  const LEAF_GREEN = '#7CC594';
  // ふ入りの葉の実験（光を当てる前）。葉 (160, 104)、横の半径 136・たての半径 70。ふは x 112 より左、
  // アルミはくは y 110〜186 をおおう。選ぶ場所: ア ふ・光あり (68, 84)、イ 緑・光あり (210, 76)、
  // ウ ふ・はくの下 (68, 148)、エ 緑・はくの下 (210, 148)。どこが青紫色になるかは図に書かない
  const FU_LEAF_Q = scene([
    leafPart(160, 104, 136, 70, 24, 112, 0, 240, 'white'),
    leafPart(160, 104, 136, 70, 112, 296, 0, 240, LEAF_GREEN),
    { type: 'ellipse', x: 160, y: 104, rx: 136, ry: 70, fill: 'none', stroke: 'green' },
    { type: 'rect', x: 14, y: 110, width: 292, height: 76, fill: 'glass', stroke: 'gray' },
    { type: 'line', points: [[112, 110], [112, 169]], color: 'gray', width: 1, dashed: true },
    leafLowerEdge(160, 104, 136, 70, 110),
    { type: 'text', x: 16, y: 26, text: 'ふ（白い部分）', size: 13 },
    { type: 'text', x: 300, y: 26, text: '緑色の部分', size: 13, anchor: 'end' },
    { type: 'text', x: 300, y: 206, text: 'アルミニウムはく', size: 13, anchor: 'end' },
    { type: 'region', id: 'r1', x: 68, y: 84, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 210, y: 76, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 68, y: 148, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 210, y: 148, r: 22, label: 'エ' },
  ]);

  // 茎の断面（双子葉類。維管束が輪のように並ぶ）と、いちばん上の維管束の拡大図。
  // 拡大図は上が茎の外側（表皮側）、下が茎の中心側。小さい丸の集まり（師管）の中心 (235, 82)、
  // 大きい丸の集まり（道管）の中心 (232, 163)。names: true で「師管」「道管」の名前を付ける
  function stemItems(names) {
    const items = [{ type: 'circle', x: 70, y: 124, r: 56, fill: 'lightgreen', stroke: 'green' }];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2;
      items.push(
        { type: 'circle', x: Math.round(70 + 44 * Math.cos(a)), y: Math.round(124 + 44 * Math.sin(a)), r: 4, fill: 'white', stroke: 'line' },
        { type: 'circle', x: Math.round(70 + 31 * Math.cos(a)), y: Math.round(124 + 31 * Math.sin(a)), r: 6, fill: 'white', stroke: 'line' },
      );
    }
    items.push(
      leader(78, 78, 188, 70),
      { type: 'ellipse', x: 232, y: 124, rx: 48, ry: 84, fill: 'lightgreen', stroke: 'line' },
      ...[[222, 74], [236, 70], [248, 80], [228, 90], [242, 94]].map(([x, y]) => ({ type: 'circle', x, y, r: 5, fill: 'white', stroke: 'line' })),
      ...[[224, 158], [240, 158], [232, 172]].map(([x, y]) => ({ type: 'circle', x, y, r: 7, fill: 'white', stroke: 'line' })),
      { type: 'text', x: 70, y: 206, text: '茎の断面', size: 13, anchor: 'middle' },
      { type: 'text', x: 232, y: 30, text: '↑ 茎の外側（表皮側）', size: 12, anchor: 'middle' },
      { type: 'text', x: 232, y: 228, text: '↓ 茎の中心側', size: 12, anchor: 'middle' },
    );
    if (names) {
      items.push(
        leader(284, 82, 254, 82),
        { type: 'text', x: 286, y: 87, text: '師管', size: 13 },
        leader(284, 164, 248, 162),
        { type: 'text', x: 286, y: 169, text: '道管', size: 13 },
        { type: 'text', x: 70, y: 226, text: '（輪が維管束）', size: 12, anchor: 'middle' },
      );
    }
    return items;
  }

  // ヒトの消化にかかわる器官（正面から見た図。図の左がからだの右）。
  // 肝臓 (128, 88)、胃 (220, 104)、小腸（中央の折りたたまれた管）(165, 188)、大腸の左の縦の部分 (106, 186)
  function gutItems() {
    return [
      { type: 'polygon', points: [[84, 72], [178, 66], [190, 80], [176, 98], [134, 112], [94, 108], [80, 90]], fill: 'brown' },
      { type: 'line', points: [[160, 20], [184, 80]], color: 'pink', width: 7 },
      { type: 'polygon', points: [[180, 78], [204, 72], [236, 82], [246, 104], [236, 126], [210, 134], [192, 126], [198, 106], [186, 94]], fill: 'pink' },
      { type: 'ellipse', x: 204, y: 145, rx: 32, ry: 7, fill: 'yellow' },
      { type: 'line', points: [[112, 212], [104, 160], [222, 160], [228, 212], [178, 216], [166, 232]], color: '#D9A27A', width: 14 },
      { type: 'line', points: [[206, 132], [196, 150], [150, 170], [202, 178], [128, 186], [202, 194], [128, 202], [116, 206]], color: '#E07FA3', width: 6 },
      { type: 'ellipse', x: 160, y: 16, rx: 10, ry: 5, fill: 'pink' },
      { type: 'text', x: 4, y: 14, text: '図の左がからだの右', size: 12 },
    ];
  }
  const GUT_Q = scene(gutItems().concat([
    { type: 'region', id: 'r1', x: 128, y: 88, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 220, y: 104, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 165, y: 188, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 104, y: 186, r: 22, label: 'エ' },
  ]));

  // 小腸の柔毛を縦に切った模式図。毛細血管（赤い線）は x 112 と x 208、リンパ管（中央の白い管）は x 152〜168
  function villusItems() {
    return [
      { type: 'polygon', points: [[80, 200], [80, 100], [90, 70], [112, 48], [140, 36], [160, 34], [180, 36], [208, 48], [230, 70], [240, 100], [240, 200]], fill: 'pink', stroke: 'line' },
      { type: 'rect', x: 152, y: 76, width: 16, height: 124, rx: 8, fill: 'white', stroke: 'line' },
      { type: 'line', points: [[112, 200], [112, 96], [124, 70], [144, 56], [160, 54], [176, 56], [196, 70], [208, 96], [208, 200]], color: 'red', width: 3 },
    ];
  }

  // 心臓の 4 つの部屋（正面から見た図。図の左がからだの右）。
  // 右心房 (130, 95)、右心室 (130, 152)、左心房 (190, 95)、左心室 (190, 152)
  function heartRooms(names) {
    return [
      { type: 'rect', x: 100, y: 70, width: 60, height: 50, fill: 'pink', label: names ? '右心房' : undefined },
      { type: 'rect', x: 100, y: 120, width: 60, height: 64, fill: 'pink', label: names ? '右心室' : undefined },
      { type: 'rect', x: 160, y: 70, width: 60, height: 50, fill: 'pink', label: names ? '左心房' : undefined },
      { type: 'rect', x: 160, y: 120, width: 60, height: 64, fill: 'pink', label: names ? '左心室' : undefined },
    ];
  }
  const HEART_Q = scene(heartRooms(false).concat([
    { type: 'region', id: 'r1', x: 130, y: 95, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 130, y: 152, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 190, y: 95, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 190, y: 152, r: 22, label: 'エ' },
    { type: 'text', x: 160, y: 224, text: '正面から見た図（図の左がからだの右）', size: 12, anchor: 'middle' },
  ]));

  // 刺激が伝わる道すじ（脳・脊髄・皮ふ・筋肉と神経）。脳 (60, 44)、脊髄 x 52〜68、皮ふ (284, 152)、筋肉 (180, 96)
  // arrows: true で神経に向きの矢印を付ける（解説用）。問題の図には向きを描かない
  function nerveItems(arrows) {
    return [
      { type: 'ellipse', x: 60, y: 44, rx: 40, ry: 26, fill: 'pink', stroke: 'line' },
      { type: 'rect', x: 52, y: 66, width: 16, height: 150, fill: 'pink', stroke: 'line' },
      { type: 'ellipse', x: 180, y: 96, rx: 32, ry: 12, fill: '#E6A57E', stroke: 'line' },
      { type: 'rect', x: 264, y: 140, width: 40, height: 24, fill: 'sand', stroke: 'line' },
      { type: 'line', points: [[264, 156], [160, 176], [70, 176]], color: 'blue', width: 3, arrow: !!arrows },
      { type: 'line', points: [[68, 130], [148, 100]], color: 'orange', width: 3, arrow: !!arrows },
    ];
  }
  const NERVE_Q = scene(nerveItems(false).concat([
    { type: 'region', id: 'r1', x: 60, y: 44, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 60, y: 150, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 284, y: 152, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 180, y: 96, r: 22, label: 'エ' },
  ]));

  // ================================================================
  // 領域 1: 細胞と植物のはたらき
  // ================================================================

  // ---- ステージ body-1: 細胞のつくり（核・細胞膜・細胞質、植物の細胞だけにあるもの、単細胞生物と多細胞生物、観察） ----
  const body1 = {
    id: 'body-1', areaId: 'cell', title: '細胞のつくり', minutes: 5, concepts: ['bo-cell'],
    lessons: [
      {
        id: 'body-1-c1',
        text: '生物のからだは、小さな**細胞**が集まってできています。細胞には、ふつう 1 個の**核**があり、細胞のいちばん外側はうすい**細胞膜**でおおわれています。核と細胞壁をのぞいた部分を**細胞質**といい、細胞膜も細胞質にふくまれます。',
        // ヒトのほおの内側の細胞（酢酸カーミン液で染色した顕微鏡写真）に名前を重ねる
        figure: scene([
          photo('body-1-c1'),
          pin(222, 52, 179, 109),
          tag(226, 57, '核'),
          pin(222, 128, 160, 151),
          tag(226, 133, '細胞膜'),
          pin(222, 196, 147, 179),
          tag(226, 201, '細胞質'),
          tag(268, 20, 'ヒトのほおの', { size: 13, anchor: 'middle' }),
          tag(268, 38, '内側の細胞', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-1-c2',
        text: '植物の細胞には、動物の細胞にない**細胞壁**と**葉緑体**があり、**液胞**も大きく育っています。細胞壁は細胞膜の外側のじょうぶなしきりで、からだを支えます。ただし、根の細胞のように緑色でない部分には、葉緑体はありません。',
        // オオカナダモの葉の細胞（顕微鏡写真）に細胞壁と葉緑体の名前を重ねる
        figure: scene([
          photo('body-1-c2'),
          pin(224, 91, 199, 93),
          tag(228, 96, '細胞壁'),
          pin(224, 141, 182, 160),
          tag(228, 146, '葉緑体'),
          tag(270, 22, 'オオカナダモの', { size: 13, anchor: 'middle' }),
          tag(270, 40, '葉の細胞', { size: 13, anchor: 'middle' }),
          tag(270, 196, '液胞・核は', { size: 13, anchor: 'middle' }),
          tag(270, 214, '染めないと', { size: 13, anchor: 'middle' }),
          tag(270, 232, '見えにくい', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-1-c3',
        text: 'ゾウリムシやミカヅキモのように、からだが 1 つの細胞でできている生物を**単細胞生物**、たくさんの細胞でできている生物を**多細胞生物**といいます。多細胞生物では、形やはたらきが同じ細胞が集まって**組織**、組織が集まって**器官**、器官が集まって個体ができます。',
        // ゾウリムシとミカヅキモ（顕微鏡写真）。どちらも単細胞生物
        figure: scene([
          photo('body-1-c3'),
          tag(83, 194, 'ゾウリムシ', { anchor: 'middle', bold: true }),
          tag(236, 194, 'ミカヅキモ', { anchor: 'middle', bold: true }),
          tag(160, 228, '1 つの細胞でできている＝単細胞生物', { anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-1-c4',
        text: '細胞を観察するときは、**酢酸カーミン液**（赤色）や酢酸オルセイン液（赤紫色）で染めると、核がよく染まって見やすくなります。顕微鏡の倍率は「接眼レンズの倍率 × 対物レンズの倍率」で、10 倍と 10 倍なら 100 倍です。',
        // 酢酸カーミン液で染めたタマネギの表皮（顕微鏡写真）と、顕微鏡の倍率の求め方
        figure: scene([
          photo('body-1-c4'),
          pin(222, 94, 172, 113),
          tag(226, 99, '核', { size: 15, bold: true }),
          tag(220, 119, '（赤く染まる）', { size: 13 }),
          tag(268, 22, 'タマネギの', { size: 13, anchor: 'middle' }),
          tag(268, 40, '表皮の細胞', { size: 13, anchor: 'middle' }),
          tag(268, 170, '倍率 ＝', { anchor: 'middle', bold: true }),
          tag(268, 190, '接眼レンズ', { anchor: 'middle', bold: true }),
          tag(268, 210, '× 対物レンズ', { anchor: 'middle', bold: true }),
        ]),
      },
    ],
    warmup: choice({
      id: 'body-1-w1', concept: 'bo-cell',
      prompt: '予想しよう。タマネギの表皮と、ヒトのほおの内側のねん膜を顕微鏡で見ると、どんなものが見えると思う？',
      options: ['どちらにも、小さな部屋のようなつくりがたくさん見える', 'タマネギにだけ、小さな部屋のようなつくりが見える', 'どちらも、つぶのない一様なものに見える'],
      answer: 'a',
      explanation: '植物にも動物にも、細胞という小さなつくりがたくさん見えます。植物と動物の細胞のちがいを、このステージで調べよう。',
      hint: '生物のからだは、何が集まってできていたかな。',
    }),
    problems: [
      choice({
        id: 'body-1-p1', concept: 'bo-cell',
        prompt: '植物の細胞にも、動物の細胞にも共通してあるものはどれ？',
        options: ['細胞壁', '葉緑体', '核', '大きな液胞'],
        answer: 'c',
        explanation: '核と細胞膜は、植物の細胞にも動物の細胞にもあります。細胞壁と葉緑体は植物の細胞だけにあり、液胞は植物の細胞で大きく育っています。',
        hint: '動物の細胞の模式図にかかれていたものを思い出そう。',
      }),
      fill({
        id: 'body-1-t1', concept: 'bo-cell', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '細胞の外側をおおううすい膜を[b1]という。植物の細胞で、[b1]のさらに外側にあるじょうぶなしきりを[b2]という。',
        blanks: [
          word('b1', ['細胞膜', '細胞壁', '核'], '細胞膜'),
          word('b2', ['細胞膜', '細胞壁', '核'], '細胞壁'),
        ],
        explanation: 'うすい膜が**細胞膜**、その外側のじょうぶなしきりが**細胞壁**です。細胞膜はどの細胞にもありますが、細胞壁は植物の細胞だけにあります。',
        hint: '「膜」はうすいもの、「壁」はじょうぶなしきりだよ。',
      }),
      figureChoice({
        id: 'body-1-p2', concept: 'bo-cell',
        prompt: '植物の細胞の模式図です（ア: 丸い粒、イ: たくさんある小さな粒、ウ: いちばん外側のあつい囲み、エ: 中央の大きなふくろ）。植物の細胞だけにあり、細胞の形を保ってからだを支えるのはどれ？',
        figure: PLANT_CELL_Q,
        answer: 'r3',
        explanation: 'いちばん外側のあつい囲み（ウ）が細胞壁です。細胞壁は植物の細胞だけにあり、からだを支えます。アは核、イは葉緑体、エは液胞です。',
        hint: '細胞膜のさらに外側にある、じょうぶなしきりをさがそう。',
      }),
      fill({
        id: 'body-1-p3', concept: 'bo-cell',
        prompt: '空らんに入る数を入れよう。',
        text: '接眼レンズが 10 倍、対物レンズが 40 倍のとき、顕微鏡の倍率は[b1]である。',
        blanks: [number('b1', 400, 0, '倍')],
        explanation: '顕微鏡の倍率は「接眼レンズの倍率 × 対物レンズの倍率」なので、10 × 40 ＝ 400 倍です。たし算ではなく、かけ算で求めることに気をつけよう。',
        hint: '2 つのレンズの倍率を、かけ合わせよう。',
      }),
      choice({
        id: 'body-1-p4', concept: 'bo-cell',
        prompt: '次のうち、からだが 1 つの細胞でできている単細胞生物はどれ？',
        options: ['ミジンコ', 'ゾウリムシ', 'タマネギ', 'メダカ'],
        answer: 'b',
        explanation: 'ゾウリムシは、からだが 1 つの細胞でできている単細胞生物です。ミジンコも小さい生物ですが、たくさんの細胞でできている多細胞生物です。大きさだけで決めないようにしよう。',
        hint: '顕微鏡で見ると、1 つの細胞が泳いでいるように見える生物だよ。',
      }),
      choice({
        id: 'body-1-p5', concept: 'bo-cell',
        prompt: '多細胞生物のからだのなり立ちを、小さいほうから順にならべたものはどれ？',
        options: ['細胞 → 組織 → 器官 → 個体', '細胞 → 器官 → 組織 → 個体', '組織 → 細胞 → 器官 → 個体'],
        answer: 'a',
        explanation: '形やはたらきが同じ細胞が集まって組織、いくつかの組織が集まって器官（胃や葉など）、器官が集まって個体ができます。',
        hint: '胃は器官、胃のかべの筋肉は組織だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-1-r1', concept: 'bo-cell',
        prompt: '植物の細胞の模式図です（ア: 丸い粒、イ: たくさんある小さな粒、ウ: いちばん外側のあつい囲み、エ: 中央の大きなふくろ）。光合成を行う緑色の粒（葉緑体）はどれ？',
        figure: PLANT_CELL_Q,
        answer: 'r2',
        explanation: 'たくさんある小さな緑色の粒（イ）が葉緑体です。アは核、ウは細胞壁、エは液胞です。葉緑体は、植物の緑色の部分の細胞にあります。',
        hint: '小さくて、細胞の中にいくつもある粒をさがそう。',
      }),
      choice({
        id: 'body-1-r2', concept: 'bo-cell',
        prompt: '細胞を酢酸カーミン液で染めると、よく染まって見やすくなるのはどこ？',
        options: ['核', '細胞壁', '液胞'],
        answer: 'a',
        explanation: '酢酸カーミン液や酢酸オルセイン液で染めると、核がよく染まります。核がはっきりすると、細胞の数や形が観察しやすくなります。',
        hint: '細胞に、ふつう 1 個ある丸い粒だよ。',
      }),
      choice({
        id: 'body-1-t2', concept: 'bo-cell', term: true,
        prompt: '次の説明に合う言葉はどれ？「形やはたらきが同じ細胞が集まったもの」',
        options: ['組織', '器官', '個体'],
        answer: 'a',
        explanation: '形やはたらきが同じ細胞の集まりを**組織**といいます。いくつかの組織が集まって、特定のはたらきをする器官になります。',
        hint: '細胞のすぐ上の段階だよ。',
      }),
      fill({
        id: 'body-1-r3', concept: 'bo-cell',
        prompt: '空らんに入る数を入れよう。',
        text: '接眼レンズが 15 倍、対物レンズが 10 倍のとき、顕微鏡の倍率は[b1]である。',
        blanks: [number('b1', 150, 0, '倍')],
        explanation: '倍率は「接眼レンズの倍率 × 対物レンズの倍率」なので、15 × 10 ＝ 150 倍です。',
        hint: '2 つの倍率をかけ合わせよう。',
      }),
    ],
  };

  // ---- ステージ body-2: 光合成・呼吸・蒸散（光合成の実験、呼吸、気孔、道管と師管） ----
  const body2 = {
    id: 'body-2', areaId: 'cell', title: '光合成・呼吸・蒸散', minutes: 5, concepts: ['bo-photosynthesis', 'bo-transport'],
    lessons: [
      {
        id: 'body-2-c1',
        text: '植物が光を受けて、**葉緑体**で水と二酸化炭素からデンプンなどの養分をつくり、酸素を出すはたらきを**光合成**といいます。また、植物も動物と同じように、昼も夜も、酸素をとり入れて二酸化炭素を出す**呼吸**をしています。',
        // 光合成の材料とできるもの
        figure: scene([
          { type: 'circle', x: 40, y: 40, r: 18, fill: 'yellow', stroke: 'orange' },
          { type: 'text', x: 40, y: 80, text: '光', size: 14, anchor: 'middle' },
          { type: 'arrow', x1: 60, y1: 52, x2: 104, y2: 84, color: 'orange', width: 3 },
          { type: 'line', points: [[170, 144], [170, 206]], color: 'green', width: 5 },
          { type: 'ellipse', x: 170, y: 112, rx: 72, ry: 32, fill: 'green', stroke: 'green' },
          { type: 'line', points: [[100, 112], [240, 112]], color: 'lightgreen', width: 2 },
          { type: 'text', x: 170, y: 104, text: '葉緑体で光合成', size: 13, anchor: 'middle', color: 'white', bold: true },
          { type: 'arrow', x1: 16, y1: 140, x2: 100, y2: 122, color: 'blue', width: 2 },
          { type: 'text', x: 12, y: 162, text: '二酸化炭素', size: 13 },
          { type: 'arrow', x1: 242, y1: 100, x2: 300, y2: 74, color: 'blue', width: 2 },
          { type: 'text', x: 268, y: 64, text: '酸素', size: 13 },
          { type: 'arrow', x1: 196, y1: 206, x2: 196, y2: 150, color: 'blue', width: 2 },
          { type: 'text', x: 204, y: 192, text: '水（根から）', size: 13 },
          { type: 'text', x: 160, y: 232, text: '水 ＋ 二酸化炭素 → デンプンなど ＋ 酸素', size: 13, anchor: 'middle' },
        ]),
      },
      {
        id: 'body-2-c2',
        text: '一晩暗い所に置いたふ入りの葉の一部を**アルミニウムはく**でおおい、光を当てます。葉をあたためた**エタノール**で脱色し、**ヨウ素液**につけると、緑色で光が当たった部分だけが青紫色になります。光合成には、光と葉緑体が必要だと分かります。',
        // ふ入りの葉の実験（左: アルミニウムはくでおおって光を当てた葉、右: 脱色してヨウ素液につけた葉）
        figure: scene([
          photo('body-2-c2'),
          pin(16, 22, 25, 41),
          tag(8, 18, 'ふ'),
          pin(70, 182, 66, 110),
          tag(70, 197, 'アルミニウムはく', { size: 13, anchor: 'middle' }),
          { type: 'arrow', x1: 140, y1: 132, x2: 184, y2: 132, width: 3 },
          pin(240, 182, 240, 136),
          tag(240, 197, '青紫色＝デンプンがある', { size: 13, anchor: 'middle' }),
          tag(160, 228, '緑色で光が当たった部分だけ青紫色になる', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-2-c3',
        text: '植物のからだから、水が水蒸気になって出ていくことを**蒸散**といいます。水蒸気は、葉の表皮にある**気孔**から出ていきます。気孔は 2 つの**孔辺細胞**に囲まれたすきまで、ふつう葉の裏側に多くあります。酸素や二酸化炭素も気孔から出入りします。',
        // 葉の裏の表皮（顕微鏡写真。視野の円 x 5〜195・y 20〜212）。三日月形の孔辺細胞 2 つ（左 x 70〜98、右 x 106〜130、y 78〜148）が気孔（x 96〜107、y 92〜132）を囲む
        figure: scene([
          photo('body-2-c3'),
          pin(222, 92, 124, 98),
          pin(222, 92, 84, 84),
          tag(226, 97, '孔辺細胞'),
          pin(222, 146, 102, 118),
          tag(226, 151, '気孔'),
          tag(262, 22, '葉の裏の表皮', { size: 13, anchor: 'middle' }),
          tag(262, 40, '（顕微鏡）', { size: 13, anchor: 'middle' }),
          tag(262, 196, '気孔から', { size: 13, anchor: 'middle' }),
          tag(262, 214, '水蒸気が出る', { size: 13, anchor: 'middle' }),
          tag(262, 232, '（蒸散）', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-2-c4',
        text: '根から吸い上げた水や水にとけた肥料分は**道管**を、葉でつくられた栄養分は**師管**を通って運ばれます。道管と師管の集まりを**維管束**といいます。茎の維管束では、道管が内側（茎の中心側）、師管が外側にあります。',
        // 茎の維管束 1 つを拡大した顕微鏡写真（視野の円 x 2〜228・y 5〜233）。上（茎の外側）に小さな細胞の師管（x 60〜165、y 45〜92）、下（茎の中心側）に大きな丸い道管（x 48〜165、y 95〜180）
        figure: scene([
          photo('body-2-c4'),
          tag(316, 22, '上が茎の外側', { size: 13, anchor: 'end' }),
          pin(240, 66, 140, 66),
          tag(244, 64, '師管', { bold: true }),
          tag(244, 82, '（外側）', { size: 13 }),
          pin(240, 136, 150, 136),
          tag(244, 134, '道管', { bold: true }),
          tag(244, 152, '（内側）', { size: 13 }),
          tag(316, 196, '維管束の拡大', { size: 13, anchor: 'end' }),
          tag(316, 228, '下が茎の中心側', { size: 13, anchor: 'end' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'body-2-w1', concept: 'bo-photosynthesis',
      prompt: '予想しよう。植物は、日光の当たらない夜にも呼吸をしていると思う？',
      options: ['夜も呼吸している', '昼だけ呼吸している', '植物は呼吸をしない'],
      answer: 'a',
      explanation: '植物も動物と同じように、昼も夜も呼吸をしています。昼は光合成もさかんに行っています。2 つのはたらきのちがいを、このステージで調べよう。',
      hint: '植物の細胞も、生きるためにエネルギーが必要だね。',
    }),
    problems: [
      choice({
        id: 'body-2-p1', concept: 'bo-photosynthesis',
        prompt: '光合成で、デンプンなどの養分をつくる材料になるものの組み合わせはどれ？',
        options: ['水と二酸化炭素', '水と酸素', '酸素と二酸化炭素'],
        answer: 'a',
        explanation: '光合成では、根から吸い上げた水と、気孔からとり入れた二酸化炭素を材料にして、光のエネルギーでデンプンなどをつくります。このとき酸素ができます。',
        hint: '酸素は、光合成で「できるもの」のほうだよ。',
      }),
      fill({
        id: 'body-2-t1', concept: 'bo-transport', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '植物のからだから水が水蒸気となって出ていくことを[b1]という。水蒸気は、おもに葉の表皮にある[b2]から出ていく。',
        blanks: [
          word('b1', ['蒸散', '光合成', '呼吸'], '蒸散'),
          word('b2', ['気孔', '道管', '師管'], '気孔'),
        ],
        explanation: '水が水蒸気になって出ていくことを**蒸散**といい、水蒸気はおもに**気孔**から出ていきます。気孔は、2 つの孔辺細胞に囲まれたすきまです。',
        hint: '「蒸」は湯気、「孔」は小さな穴という意味だよ。',
      }),
      figureChoice({
        id: 'body-2-p2', concept: 'bo-photosynthesis',
        prompt: '一晩暗い所に置いたふ入りの葉の一部をアルミニウムはくでおおい、光を当てました（ア: ふの部分で光が当たった、イ: 緑色の部分で光が当たった、ウ: ふの部分ではくにおおわれた、エ: 緑色の部分ではくにおおわれた）。葉を脱色してヨウ素液につけると、青紫色になるのはどれ？',
        figure: FU_LEAF_Q,
        answer: 'r2',
        explanation: 'ヨウ素液はデンプンがあると青紫色になります。デンプンができるのは、葉緑体があり、光も当たったイだけです。ふの部分には葉緑体がなく、はくの下には光が当たらないので、光合成が行われません。',
        hint: '光合成に必要なのは、光と葉緑体の 2 つだよ。',
      }),
      drag({
        id: 'body-2-p3', concept: 'bo-transport',
        prompt: '茎の断面と、その中の維管束を 1 つ拡大した図です（拡大図の上が茎の外側、下が茎の中心側）。根から吸い上げた水が通る管の集まりに、青い印を動かして置こう。',
        // 正解は大きい丸の集まり（道管）の中心 (232, 163)。小さい丸の集まり（師管）の中心 (235, 82) は 81px はなれる
        figure: scene(stemItems(false).concat([
          { type: 'circle', id: 'mark', x: 150, y: 214, r: 11, fill: 'blue', stroke: 'ink' },
        ])),
        draggable: { itemId: 'mark', axis: 'xy' },
        target: { x: 232, y: 163 },
        samples: { correct: { x: 232, y: 163 }, wrong: { x: 235, y: 82 } },
        explanation: '根から吸い上げた水や肥料分は道管を通ります。茎の維管束では、道管は内側（茎の中心側）にあるので、拡大図の下の大きい丸の集まりです。上の小さい丸の集まりは師管です。',
        hint: '茎の維管束では、道管は「内側」にあったね。',
      }),
      choice({
        id: 'body-2-p4', concept: 'bo-photosynthesis',
        prompt: '光が十分に当たる昼の植物について、正しいものはどれ？',
        options: ['光合成と呼吸の両方を行っていて、全体としては二酸化炭素をとり入れ、酸素を出している', '光合成だけを行い、呼吸はしていない', '呼吸だけを行い、光合成はしていない'],
        answer: 'a',
        explanation: '植物は昼も夜も呼吸をしています。光が十分に当たる昼は、光合成でとり入れる二酸化炭素のほうが、呼吸で出す二酸化炭素より多いので、全体としては二酸化炭素をとり入れて酸素を出しているように見えます。',
        hint: '呼吸は昼も夜も行っていたね。',
      }),
      choice({
        id: 'body-2-p5', concept: 'bo-transport',
        prompt: '葉の数と大きさがそろった枝 A〜C を水にさし、A は何もぬらず、B は葉の表側に、C は葉の裏側にワセリンをぬりました。数時間後の水の減った量は、A 5.0 mL、B 4.0 mL、C 1.5 mL でした。気孔が多いのは、葉のどちら側？',
        options: ['葉の裏側', '葉の表側', '表と裏で同じ'],
        answer: 'a',
        explanation: 'ワセリンをぬると気孔がふさがれます。裏側をふさいだ C の減り方がいちばん少ないので、裏側からの蒸散が多い、つまり気孔は葉の裏側に多いと分かります。水面からの蒸発を防ぐため、水面には油をうかべておきます。',
        hint: 'ふさいだとき、水の減り方が大きく変わったのはどちら側かな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-2-r1', concept: 'bo-photosynthesis',
        prompt: 'ふ入りの葉の実験です（ア: ふの部分で光が当たった、イ: 緑色の部分で光が当たった、ウ: ふの部分ではくにおおわれた、エ: 緑色の部分ではくにおおわれた）。光合成に光が必要なことを確かめるには、イの結果とどれの結果をくらべればよい？',
        figure: FU_LEAF_Q,
        answer: 'r4',
        explanation: 'イとエは、どちらも緑色の部分で、ちがうのは光が当たったかどうかだけです。イだけが青紫色になるので、光合成には光が必要だと分かります。調べたいこと以外の条件をそろえるのが、くらべる実験のポイントです。',
        hint: '光の条件だけがちがい、ほかの条件が同じものをさがそう。',
      }),
      choice({
        id: 'body-2-r2', concept: 'bo-photosynthesis',
        prompt: '息をふきこんで緑色にした BTB 溶液にオオカナダモを入れ、光を当てると、溶液が青色になりました。その理由として正しいものはどれ？',
        options: ['光合成で水中の二酸化炭素が使われて減ったから', '呼吸で水中の二酸化炭素がふえたから', '光が当たると BTB 溶液が青くなるから'],
        answer: 'a',
        explanation: '二酸化炭素は水にとけると酸性を示します。オオカナダモが光合成で二酸化炭素を使ったので、二酸化炭素が減って溶液が中性からアルカリ性に変わり、青色になりました。オオカナダモを入れない試験管も用意して、光だけでは色が変わらないことを確かめます。',
        hint: '光合成では、何をとり入れていたかな。',
      }),
      choice({
        id: 'body-2-t2', concept: 'bo-transport', term: true,
        prompt: '次の説明に合う言葉はどれ？「道管と師管が集まって、束のようになっている部分」',
        options: ['維管束', '気孔', '孔辺細胞'],
        answer: 'a',
        explanation: '道管と師管の集まりを**維管束**といいます。葉では、維管束が葉脈として見えます。',
        hint: '「管」が「束」になっていると考えよう。',
      }),
      fill({
        id: 'body-2-r3', concept: 'bo-transport',
        prompt: '空らんに入る数を入れよう。',
        text: '葉の数と大きさがそろった枝で、何もぬらない A は 5.0 mL、葉の裏側にワセリンをぬった C は 1.5 mL、水が減った。葉の裏側からの蒸散の量は[b1]と考えられる。',
        blanks: [number('b1', 3.5, 0.1, 'mL')],
        explanation: 'A は葉の表・葉の裏・茎から、C は葉の表と茎から蒸散しています。A − C で葉の裏側の分だけが残るので、5.0 − 1.5 ＝ 3.5 mL です。',
        hint: 'A と C で、蒸散している場所のちがいは葉の裏側だけだよ。',
      }),
      choice({
        id: 'body-2-r4', concept: 'bo-transport',
        prompt: '赤インクで色をつけた水に植物の茎をさしておき、茎を輪切りにしました。赤く染まっているのはどの管？',
        options: ['道管', '師管', 'どちらも染まる'],
        answer: 'a',
        explanation: '根から吸い上げた水は道管を通るので、色をつけた水が通った道管が赤く染まります。師管は、葉でつくられた栄養分が通る管です。',
        hint: '水が通る管はどちらだったかな。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 動物のからだ
  // ================================================================

  // ---- ステージ body-3: 消化と吸収（消化管、消化酵素、だ液の実験、柔毛） ----
  const body3 = {
    id: 'body-3', areaId: 'organ', title: '消化と吸収', minutes: 5, concepts: ['bo-digestion'],
    lessons: [
      {
        id: 'body-3-c1',
        text: '食物にふくまれる養分を、からだに吸収できる小さな物質に分解することを**消化**といいます。食物は、口 → 食道 → 胃 → 小腸 → 大腸 → 肛門と続く 1 本の管を通ります。この管を**消化管**といいます。肝臓やすい臓は、食物の通らない器官です。',
        // 人体模型の消化にかかわる器官（正面から見た写真）に名前を重ねる
        figure: scene([
          photo('body-3-c1'),
          pin(258, 16, 180, 16),
          tag(262, 21, '食道'),
          pin(258, 46, 212, 46),
          tag(262, 51, '胃'),
          pin(258, 84, 196, 82),
          tag(262, 89, 'すい臓'),
          pin(258, 136, 190, 144),
          tag(262, 141, '小腸'),
          pin(258, 222, 166, 224),
          tag(262, 227, '肛門'),
          pin(42, 46, 112, 52),
          tag(8, 51, '肝臓'),
          pin(42, 146, 100, 146),
          tag(8, 151, '大腸'),
          tag(4, 236, '図の左がからだの右', { size: 13 }),
        ]),
      },
      {
        id: 'body-3-c2',
        text: '消化液には、養分を分解する**消化酵素**がふくまれます。だ液の**アミラーゼ**はデンプンを、胃液の**ペプシン**はタンパク質を、すい液の**リパーゼ**は脂肪を分解します。肝臓でつくられる胆汁は、消化酵素をふくみませんが、脂肪の消化を助けます。',
        // 消化液と消化酵素の表
        figure: scene([
          { type: 'rect', x: 8, y: 20, width: 304, height: 40, fill: 'lightgreen' },
          ...[60, 100, 140, 180].map(y => ({ type: 'rect', x: 8, y, width: 304, height: 40, fill: 'white' })),
          { type: 'line', points: [[84, 20], [84, 220]], color: 'ink', width: 2 },
          { type: 'line', points: [[190, 20], [190, 220]], color: 'ink', width: 2 },
          ...[['消化液', '消化酵素', '分解するもの']].concat([
            ['だ液', 'アミラーゼ', 'デンプン'],
            ['胃液', 'ペプシン', 'タンパク質'],
            ['すい液', 'リパーゼ など', '脂肪 など'],
            ['胆汁', 'ふくまない', '脂肪の消化を助ける'],
          ]).flatMap((row, i) => [
            { type: 'text', x: 46, y: 45 + i * 40, text: row[0], size: 13, anchor: 'middle', bold: i === 0 },
            { type: 'text', x: 137, y: 45 + i * 40, text: row[1], size: 13, anchor: 'middle', bold: i === 0 },
            { type: 'text', x: 251, y: 45 + i * 40, text: row[2], size: i === 4 ? 12 : 13, anchor: 'middle', bold: i === 0 },
          ]),
          { type: 'text', x: 160, y: 238, text: 'すい液には、デンプンなどを分解する酵素もある', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'body-3-c3',
        text: 'デンプン溶液に、A にはだ液、B には水を加え、約 40 ℃ の湯に入れます。ヨウ素液を加えると B だけが青紫色になり、**ベネジクト液**を加えて加熱すると A だけが赤褐色になります。だ液がデンプンを麦芽糖などに変えたと分かります。',
        // だ液のはたらきを調べる実験
        figure: scene([
          photo('body-3-c3'),
          tag(8, 22, 'A: デンプン溶液＋だ液', { size: 13 }),
          tag(8, 42, 'B: デンプン溶液＋水', { size: 13 }),
          tag(145, 62, 'A', { size: 15, anchor: 'middle', bold: true }),
          tag(172, 62, 'B', { size: 15, anchor: 'middle', bold: true }),
          pin(218, 44, 205, 46),
          tag(222, 49, '温度計', { size: 13 }),
          pin(102, 172, 122, 182),
          tag(98, 176, '約40℃の湯', { size: 13, anchor: 'end' }),
        ]),
      },
      {
        id: 'body-3-c4',
        text: 'デンプンは**ブドウ糖**、タンパク質は**アミノ酸**、脂肪は脂肪酸とモノグリセリドにまで分解され、小腸のかべの**柔毛**から吸収されます。ブドウ糖とアミノ酸は毛細血管へ、脂肪酸とモノグリセリドは再び脂肪になってリンパ管へ入ります。',
        // 柔毛のつくりと、養分の入る管
        figure: scene(villusItems().concat([
          { type: 'text', x: 160, y: 20, text: '柔毛（小腸のかべの小さな突起）', size: 13, anchor: 'middle' },
          leader(62, 120, 152, 120),
          { type: 'text', x: 4, y: 116, text: 'リンパ管', size: 13 },
          leader(258, 150, 210, 150),
          { type: 'text', x: 260, y: 146, text: '毛細', size: 13 },
          { type: 'text', x: 260, y: 162, text: '血管', size: 13 },
          { type: 'text', x: 160, y: 218, text: 'ブドウ糖・アミノ酸 → 毛細血管', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 236, text: '脂肪酸・モノグリセリド → 再び脂肪になりリンパ管', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'body-3-w1', concept: 'bo-digestion',
      prompt: '予想しよう。ご飯をよくかんでいると、だんだんあまく感じてくるのはなぜだと思う？',
      options: ['だ液が、ご飯のデンプンを糖に変えるから', 'ご飯がとけて、ただの水になるから', '歯から、あまいものが出てくるから'],
      answer: 'a',
      explanation: 'だ液にふくまれる消化酵素が、デンプンをあまみのある麦芽糖などに分解するからです。食物がどのように分解され、吸収されるのかを調べよう。',
      hint: '口の中に出てくる液のはたらきを考えよう。',
    }),
    problems: [
      figureChoice({
        id: 'body-3-p1', concept: 'bo-digestion',
        prompt: 'ヒトの消化にかかわる器官の図です（図の左がからだの右。ア: 図の左上の大きな器官、イ: 図の右上のふくろのような器官、ウ: 中央で長く折りたたまれた管、エ: そのまわりを囲む太い管）。タンパク質を分解するペプシンをふくむ消化液を出すのはどれ？',
        figure: GUT_Q,
        answer: 'r2',
        explanation: 'ペプシンは胃液にふくまれる消化酵素で、胃（イ）から出されます。アは肝臓、ウは小腸、エは大腸です。',
        hint: '食道からつながる、ふくろのような器官だよ。',
      }),
      fill({
        id: 'body-3-t1', concept: 'bo-digestion', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'デンプンは最後に[b1]に、タンパク質は最後に[b2]に分解されて、小腸で吸収される。',
        blanks: [
          word('b1', ['ブドウ糖', 'アミノ酸', '脂肪酸'], 'ブドウ糖'),
          word('b2', ['ブドウ糖', 'アミノ酸', '脂肪酸'], 'アミノ酸'),
        ],
        explanation: 'デンプンは**ブドウ糖**に、タンパク質は**アミノ酸**に分解されます。脂肪は、脂肪酸とモノグリセリドに分解されます。',
        hint: '「糖」はデンプンの仲間、「アミノ酸」はタンパク質のもとだよ。',
      }),
      choice({
        id: 'body-3-p2', concept: 'bo-digestion',
        prompt: 'だ液にふくまれ、デンプンを分解する消化酵素はどれ？',
        options: ['アミラーゼ', 'ペプシン', 'リパーゼ'],
        answer: 'a',
        explanation: 'だ液にふくまれるアミラーゼが、デンプンを麦芽糖などに分解します。ペプシンは胃液にふくまれタンパク質を、リパーゼはすい液にふくまれ脂肪を分解します。',
        hint: 'ご飯をかむとあまくなるのは、この酵素のはたらきだよ。',
      }),
      drag({
        id: 'body-3-p3', concept: 'bo-digestion',
        prompt: '小腸の柔毛を縦に切った模式図です（赤い線: 柔毛の両わきを通る細い管、中央の白い管: 柔毛のまん中を通る管）。脂肪酸とモノグリセリドは、柔毛で吸収されたあと再び脂肪になって、どの管に入る？ 青い印を左右に動かして、その管に置こう。',
        // 印は y = 150 の横の線の上を動く。正解はリンパ管（中央の白い管）x = 160。毛細血管（赤い線）x = 112・208 は 48px はなれる
        figure: scene(villusItems().concat([
          { type: 'text', x: 160, y: 20, text: '柔毛を縦に切った模式図', size: 13, anchor: 'middle' },
          { type: 'circle', id: 'mark', x: 40, y: 150, r: 11, fill: 'blue', stroke: 'ink' },
        ])),
        draggable: { itemId: 'mark', axis: 'x' },
        target: { x: 160, y: 150 },
        samples: { correct: { x: 160, y: 150 }, wrong: { x: 112, y: 150 } },
        explanation: '脂肪酸とモノグリセリドは、柔毛の中で再び脂肪になり、まん中のリンパ管に入ります。ブドウ糖とアミノ酸は、まわりの毛細血管に入ります。入る管がちがうことを覚えておこう。',
        hint: '赤い線は血液が流れる毛細血管だよ。',
      }),
      choice({
        id: 'body-3-p4', concept: 'bo-digestion',
        prompt: '小腸のかべに、柔毛がたくさんあることには、どんなよい点がある？',
        options: ['表面積が大きくなり、養分を効率よく吸収できる', '食物を速く大腸へ送ることができる', '消化酵素を出さなくてもよくなる'],
        answer: 'a',
        explanation: '小腸のかべにはたくさんのひだがあり、その表面に柔毛がびっしり並んでいます。表面積がとても大きくなるので、養分を効率よく吸収できます。',
        hint: '同じ長さの管でも、でこぼこが多いと何が大きくなるかな。',
      }),
      choice({
        id: 'body-3-p5', concept: 'bo-digestion',
        prompt: 'デンプン溶液にだ液を加えて約 40 ℃ に保ったあと、ベネジクト液を加えて加熱すると、赤褐色の沈殿ができました。ここから分かることはどれ？',
        options: ['デンプンが分解されて、麦芽糖などができた', 'デンプンがそのまま残っている', 'デンプンからタンパク質ができた'],
        answer: 'a',
        explanation: 'ベネジクト液は、麦芽糖やブドウ糖などがあると、加熱したときに赤褐色の沈殿ができます。だ液がデンプンを麦芽糖などに分解したと分かります。加熱するときは、沸騰石を入れて試験管を軽くふりながら行います。',
        hint: 'ベネジクト液は、何があるかを調べる薬品だったかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-3-r1', concept: 'bo-digestion',
        prompt: 'ヒトの消化にかかわる器官の図です（図の左がからだの右。ア: 図の左上の大きな器官、イ: 図の右上のふくろのような器官、ウ: 中央で長く折りたたまれた管、エ: そのまわりを囲む太い管）。脂肪の消化を助ける胆汁をつくるのはどれ？',
        figure: GUT_Q,
        answer: 'r1',
        explanation: '胆汁は肝臓（ア）でつくられ、胆のうにたくわえられてから小腸へ出されます。胆汁には消化酵素はふくまれませんが、脂肪の消化を助けます。',
        hint: 'からだの右上にある、いちばん大きな器官だよ。',
      }),
      choice({
        id: 'body-3-r2', concept: 'bo-digestion',
        prompt: 'だ液のはたらきを調べる実験で、試験管を約 40 ℃ の湯に入れるのはなぜ？',
        options: ['ヒトの体温に近い温度で、だ液がよくはたらくから', 'デンプンを湯でとかすため', 'ヨウ素液の色を見やすくするため'],
        answer: 'a',
        explanation: 'だ液の消化酵素は、ヒトの体温に近い温度でよくはたらきます。口の中と同じような条件にするために、約 40 ℃ にします。',
        hint: 'だ液は、ふだんどこではたらいているかな。',
      }),
      choice({
        id: 'body-3-t2', concept: 'bo-digestion', term: true,
        prompt: '次の説明に合う言葉はどれ？「小腸のかべの表面にたくさんある、小さな突起」',
        options: ['柔毛', '肺胞', '気孔'],
        answer: 'a',
        explanation: '小腸のかべの小さな突起を**柔毛**といいます。柔毛があるので表面積が大きくなり、養分を効率よく吸収できます。',
        hint: 'やわらかい毛のように見える突起だよ。',
      }),
      choice({
        id: 'body-3-r3', concept: 'bo-digestion',
        prompt: 'ブドウ糖とアミノ酸は、小腸の柔毛で吸収されたあと、どこに入る？',
        options: ['毛細血管', 'リンパ管', '大腸'],
        answer: 'a',
        explanation: 'ブドウ糖とアミノ酸は、柔毛の毛細血管に入り、血液によって肝臓を通って全身へ運ばれます。リンパ管に入るのは、再び脂肪になった脂肪酸とモノグリセリドです。',
        hint: '柔毛の中の赤い線（血液の通る管）を思い出そう。',
      }),
    ],
  };

  // ---- ステージ body-4: 呼吸・血液・刺激と反応（肺胞、心臓と血管、血液の成分、排出、神経と反射） ----
  const body4 = {
    id: 'body-4', areaId: 'organ', title: '呼吸・血液・刺激と反応', minutes: 5, concepts: ['bo-circulation', 'bo-nerve'],
    lessons: [
      {
        id: 'body-4-c1',
        anim: 'bo-alveoli',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '肺は**肺胞**という小さなふくろがたくさん集まってでき、表面積が大きいので、酸素と二酸化炭素を効率よく交換できます。肺には筋肉がなく、**横隔膜**やろっ骨の動きで空気が出入りします。血液中の尿素などは、**じん臓**でこし出され、尿として出されます。',
        // 肺胞と毛細血管、じん臓とぼうこう
        figure: scene([
          { type: 'line', points: [[24, 30], [60, 70], [88, 96]], color: 'pink', width: 8 },
          ...[[104, 112], [132, 104], [146, 132], [120, 144], [94, 140]].map(([x, y]) => ({ type: 'circle', x, y, r: 16, fill: 'white', stroke: 'line' })),
          { type: 'line', points: [[70, 160], [100, 168], [140, 162], [168, 138], [166, 104], [146, 84], [118, 84]], color: 'red', width: 2 },
          { type: 'text', x: 70, y: 50, text: '気管支', size: 13 },
          leader(40, 128, 78, 138),
          { type: 'text', x: 6, y: 126, text: '肺胞', size: 13 },
          leader(150, 182, 142, 164),
          { type: 'text', x: 120, y: 196, text: '毛細血管', size: 13 },
          { type: 'text', x: 98, y: 222, text: '酸素と二酸化炭素を交換', size: 12, anchor: 'middle' },
          { type: 'line', points: [[200, 16], [200, 224]], color: 'gray', width: 1 },
          { type: 'text', x: 262, y: 46, text: 'じん臓', size: 13, anchor: 'middle' },
          { type: 'ellipse', x: 232, y: 84, rx: 16, ry: 26, fill: 'brown' },
          { type: 'ellipse', x: 292, y: 84, rx: 16, ry: 26, fill: 'brown' },
          { type: 'line', points: [[236, 108], [254, 160]], color: 'line', width: 2 },
          { type: 'line', points: [[288, 108], [270, 160]], color: 'line', width: 2 },
          { type: 'ellipse', x: 262, y: 172, rx: 22, ry: 15, fill: 'yellow', stroke: 'line' },
          { type: 'text', x: 262, y: 206, text: 'ぼうこう', size: 13, anchor: 'middle' },
          { type: 'text', x: 262, y: 228, text: '尿をためる', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'body-4-c2',
        text: '血液は**心臓**から送り出され、全身をめぐってもどります。心臓から出る血液が流れる血管を**動脈**、心臓へもどる血液が流れる血管を**静脈**といい、静脈には逆流を防ぐ弁があります。心臓 → 肺 → 心臓を**肺循環**、心臓 → 全身 → 心臓を**体循環**といいます。',
        // 心臓の模型をたてに切った断面（正面から見た写真）に 4 つの部屋の名前を重ねる
        figure: scene([
          photo('body-4-c2'),
          pin(52, 96, 108, 99),
          tag(4, 101, '右心房'),
          pin(52, 166, 115, 167),
          tag(4, 171, '右心室'),
          pin(240, 80, 188, 88),
          tag(244, 85, '左心房'),
          pin(240, 166, 184, 168),
          tag(244, 171, '左心室'),
          tag(4, 218, '青: 静脈血', { size: 13, color: 'blue' }),
          tag(4, 236, '赤: 動脈血', { size: 13, color: 'red' }),
          tag(316, 236, '図の左がからだの右', { size: 13, anchor: 'end' }),
        ]),
      },
      {
        id: 'body-4-c3',
        text: '**赤血球**は**ヘモグロビン**をふくみ、酸素を運びます。白血球は細菌などを分解し、血小板は出血した血液を固めます。液体の血しょうは養分や不要な物質を運びます。酸素を多くふくむ血液を動脈血といい、肺静脈には動脈血、肺動脈には静脈血が流れます。',
        // 染めた血液の顕微鏡写真に成分の名前を重ねる
        figure: scene([
          photo('body-4-c3'),
          pin(220, 46, 190, 60),
          tag(224, 51, '赤血球'),
          pin(220, 90, 156, 83),
          tag(224, 95, '血小板'),
          pin(220, 136, 173, 146),
          tag(224, 141, '白血球'),
          pin(220, 186, 160, 190),
          tag(224, 191, '血しょう'),
          tag(224, 209, '（液体）', { size: 13 }),
          tag(266, 232, '染めた血液', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-4-c4',
        anim: 'bo-reflex',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '目（網膜）や耳（うずまき管）などの**感覚器官**で受けとった刺激は、**感覚神経** → 脳や脊髄（中枢神経） → **運動神経** → 筋肉と伝わります。熱いものにふれて思わず手を引っこめるように、意識と関係なく起こる反応を**反射**といいます。このときの命令は脊髄から出るので、すばやく反応できます。',
        // 熱いものにふれたときの反射の道すじ
        figure: scene(nerveItems(true).concat([
          { type: 'text', x: 108, y: 40, text: '脳', size: 13 },
          { type: 'text', x: 76, y: 214, text: '脊髄', size: 13 },
          { type: 'text', x: 92, y: 94, text: '運動神経', size: 13 },
          { type: 'text', x: 216, y: 82, text: '筋肉', size: 13 },
          { type: 'text', x: 128, y: 200, text: '感覚神経', size: 13 },
          { type: 'text', x: 284, y: 132, text: '皮ふ', size: 13, anchor: 'middle' },
          { type: 'text', x: 316, y: 236, text: '皮ふ → 感覚神経 → 脊髄 → 運動神経 → 筋肉', size: 12, anchor: 'end' },
        ])),
      },
    ],
    warmup: choice({
      id: 'body-4-w1', concept: 'bo-circulation',
      prompt: '予想しよう。運動をすると、心臓の拍動（どきどき）が速くなるのはなぜだと思う？',
      options: ['筋肉に、たくさんの酸素や養分を届けるため', '血液を冷やすため', 'からだの水分をへらすため'],
      answer: 'a',
      explanation: '運動すると、筋肉の細胞がたくさんの酸素と養分を使います。心臓が速く血液を送り出して、それを届けています。血液がどのようにからだをめぐるのかを調べよう。',
      hint: '血液は、何を運んでいたかな。',
    }),
    problems: [
      figureChoice({
        id: 'body-4-p1', concept: 'bo-circulation',
        prompt: 'ヒトの心臓の 4 つの部屋を、正面から見た模式図です（図の左がからだの右。ア: 図の左上、イ: 図の左下、ウ: 図の右上、エ: 図の右下）。肺からもどった血液が入る部屋はどれ？',
        figure: HEART_Q,
        answer: 'r3',
        explanation: '肺からもどった血液は、肺静脈を通って左心房（ウ）に入ります。正面から見た図では、からだの左側が図の右側になることに気をつけよう。アは右心房、イは右心室、エは左心室です。',
        hint: '肺からもどる血液は、心臓の「左」の上の部屋に入るよ。',
      }),
      fill({
        id: 'body-4-t1', concept: 'bo-circulation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '心臓から送り出される血液が流れる血管を[b1]、心臓へもどる血液が流れる血管を[b2]という。',
        blanks: [
          word('b1', ['動脈', '静脈', '毛細血管'], '動脈'),
          word('b2', ['動脈', '静脈', '毛細血管'], '静脈'),
        ],
        explanation: '心臓から出る血液が流れるのが**動脈**、心臓へもどる血液が流れるのが**静脈**です。流れている血液にふくまれる酸素の量ではなく、流れる向きで分けます。',
        hint: '「動」は心臓が送り出す勢い、「静」はもどってくる流れと考えよう。',
      }),
      choice({
        id: 'body-4-p2', concept: 'bo-circulation',
        prompt: '血液の成分のうち、酸素を運ぶはたらきをするのはどれ？',
        options: ['赤血球', '白血球', '血小板', '血しょう'],
        answer: 'a',
        explanation: '赤血球にふくまれるヘモグロビンは、酸素の多いところで酸素と結びつき、少ないところで酸素をはなします。このはたらきで、肺でとり入れた酸素を全身の細胞へ届けます。',
        hint: 'ヘモグロビンをふくむ成分だよ。',
      }),
      figureChoice({
        id: 'body-4-p3', concept: 'bo-nerve',
        prompt: '刺激が伝わる道すじの模式図です（ア: 頭の中の器官、イ: 背骨の中を通る太い神経、ウ: 手の皮ふ、エ: うでの筋肉。青い線と橙の線は神経）。熱いものにふれて思わず手を引っこめる反射で、筋肉への命令が出されるのはどこ？',
        figure: NERVE_Q,
        answer: 'r2',
        explanation: 'この反射では、皮ふで受けとった刺激が感覚神経を通って脊髄（イ）に伝わり、脊髄から運動神経を通って筋肉へ命令が出されます。脳を通らないので、すばやく反応できます。',
        hint: '「熱い」と感じるより先に手が動くことを思い出そう。',
      }),
      choice({
        id: 'body-4-p4', concept: 'bo-circulation',
        prompt: '肺動脈を流れる血液について、正しいものはどれ？',
        options: ['二酸化炭素を多くふくむ静脈血が流れている', '酸素を多くふくむ動脈血が流れている', '血液は流れていない'],
        answer: 'a',
        explanation: '肺動脈は、心臓から肺へ向かう血管なので動脈ですが、全身からもどってきた二酸化炭素の多い静脈血が流れています。動脈・静脈は流れる向き、動脈血・静脈血は酸素の量で分けることに気をつけよう。',
        hint: '肺動脈の血液は、これから肺で酸素を受けとるところだよ。',
      }),
      choice({
        id: 'body-4-p5', concept: 'bo-nerve',
        prompt: '手の皮ふで受けとった刺激を脳で感じ、考えて手を動かすとき、信号が伝わる順として正しいものはどれ？',
        options: ['皮ふ → 感覚神経 → 脊髄 → 脳 → 脊髄 → 運動神経 → 筋肉', '皮ふ → 運動神経 → 脳 → 感覚神経 → 筋肉', '皮ふ → 感覚神経 → 筋肉 → 運動神経 → 脳'],
        answer: 'a',
        explanation: '皮ふで受けとった刺激は、感覚神経から脊髄を通って脳へ伝わります。脳からの命令は、脊髄から運動神経を通って筋肉へ伝わります。感覚神経は中枢神経へ、運動神経は筋肉へ向かう神経です。',
        hint: '感覚神経と運動神経は、信号を伝える向きがちがうよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-4-r1', concept: 'bo-circulation',
        prompt: 'ヒトの心臓の 4 つの部屋を、正面から見た模式図です（図の左がからだの右。ア: 図の左上、イ: 図の左下、ウ: 図の右上、エ: 図の右下）。全身へ血液を送り出す部屋はどれ？',
        figure: HEART_Q,
        answer: 'r4',
        explanation: '全身へ血液を送り出すのは左心室（エ）です。全身に血液を送るため、左心室のかべの筋肉はとくに厚くなっています。',
        hint: '肺からもどった血液は、左心房から次にどの部屋へ行くかな。',
      }),
      choice({
        id: 'body-4-r2', concept: 'bo-circulation',
        prompt: '肺が、たくさんの肺胞でできていることには、どんなよい点がある？',
        options: ['空気にふれる表面積が大きくなり、酸素と二酸化炭素を効率よく交換できる', '肺が自分の筋肉でふくらめるようになる', '血液を固められるようになる'],
        answer: 'a',
        explanation: '小さな肺胞がたくさんあると、空気にふれる表面積がとても大きくなります。肺胞のまわりの毛細血管とのあいだで、酸素と二酸化炭素を効率よく交換できます。',
        hint: '小腸の柔毛と同じ考え方だよ。',
      }),
      choice({
        id: 'body-4-t2', concept: 'bo-circulation', term: true,
        prompt: '次の説明に合う言葉はどれ？「赤血球にふくまれ、酸素の多いところで酸素と結びつき、少ないところで酸素をはなす物質」',
        options: ['ヘモグロビン', 'アミラーゼ', '尿素'],
        answer: 'a',
        explanation: '赤血球にふくまれる赤い物質が**ヘモグロビン**です。この性質によって、肺でとり入れた酸素を全身の細胞へ運べます。',
        hint: '血液が赤く見えるもとになっている物質だよ。',
      }),
      choice({
        id: 'body-4-r3', concept: 'bo-circulation',
        prompt: '血液中の尿素などの不要な物質をこし出して、尿をつくる器官はどれ？',
        options: ['じん臓', '肝臓', '肺'],
        answer: 'a',
        explanation: 'じん臓は、血液中の尿素などの不要な物質をこし出して尿をつくります。尿素は、からだに有害なアンモニアが肝臓で変えられたものです。尿はぼうこうにためられてから体外へ出されます。',
        hint: '肝臓は尿素をつくるほう、こし出すのは別の器官だよ。',
      }),
      figureChoice({
        id: 'body-4-r4', concept: 'bo-nerve',
        prompt: '刺激が伝わる道すじの模式図です（ア: 頭の中の器官、イ: 背骨の中を通る太い神経、ウ: 手の皮ふ、エ: うでの筋肉。青い線と橙の線は神経）。熱いものにふれたとき、「熱い」と感じるのはどこ？',
        figure: NERVE_Q,
        answer: 'r1',
        explanation: '「熱い」と感じるのは脳（ア）です。手を引っこめる命令は脊髄から先に出るので、熱いと感じるより先に手が動きます。刺激の信号は、脊髄から脳へも伝わります。',
        hint: 'ものを感じたり考えたりするのは、どこだったかな。',
      }),
      choice({
        id: 'body-4-r5', concept: 'bo-nerve',
        prompt: '次のうち、反射の例はどれ？',
        options: ['熱いものにふれて、思わず手を引っこめた', '名前をよばれたので、ふり向いた', '信号が青になったので、歩き出した'],
        answer: 'a',
        explanation: '反射は、意識と関係なく起こる反応です。熱いものから手を引っこめるのは反射です。名前をよばれてふり向く、信号を見て歩き出すのは、脳で判断してから起こる反応です。明るい所でひとみが小さくなるのも反射の例です。',
        hint: '考えるより先に、からだが動くものをさがそう。',
      }),
    ],
  };

  // ================================================================
  // 領域 3: ミニプリント（先生のミニプリントの問題を書き直したもの。.ai-tasks/20261106-130000_ミニプリント反映_共通.md）
  // プリントの順は学ぶ順（細胞 → 植物 → 消化 → 血液 → 呼吸・排出 → 感覚 → 神経 → 骨格・分類）
  // ================================================================

  // ---- ミニプリント用の図 ----

  // 植物の細胞の部分の名前（PLANT_CELL_Q と同じ位置に名前を書く）
  const PLANT_CELL_NAMES = scene(plantCell(160, 120, 1).concat([
    leader(58, 70, 102, 70),
    leader(58, 160, 101, 160),
    leader(258, 40, 236, 40),
    leader(258, 130, 200, 130),
    leader(258, 200, 229, 200),
    { type: 'text', x: 36, y: 75, text: '核', size: 14, anchor: 'middle' },
    { type: 'text', x: 32, y: 165, text: '葉緑体', size: 13, anchor: 'middle' },
    { type: 'text', x: 284, y: 45, text: '細胞壁', size: 13, anchor: 'middle' },
    { type: 'text', x: 284, y: 135, text: '液胞', size: 13, anchor: 'middle' },
    { type: 'text', x: 286, y: 205, text: '細胞膜', size: 13, anchor: 'middle' },
  ]));

  // BTB 溶液の試験管 A（水草あり）・B（水草なし）に光を当てる。A の中心 x 120、B の中心 x 220
  function btbItems(colorA, colorB) {
    return [
      { type: 'circle', x: 36, y: 36, r: 16, fill: 'yellow', stroke: 'orange' },
      { type: 'arrow', x1: 56, y1: 50, x2: 100, y2: 82, color: 'orange', width: 2 },
      { type: 'arrow', x1: 58, y1: 40, x2: 196, y2: 80, color: 'orange', width: 2 },
      { type: 'tube', x: 120, y: 200, height: 130, level: 0.85, liquid: colorA },
      { type: 'tube', x: 220, y: 200, height: 130, level: 0.85, liquid: colorB },
      { type: 'line', points: [[120, 192], [114, 170], [124, 150], [114, 130], [122, 108]], color: 'green', width: 3 },
      { type: 'text', x: 120, y: 226, text: 'A（水草を入れる）', size: 13, anchor: 'middle' },
      { type: 'text', x: 228, y: 226, text: 'B（何も入れない）', size: 13, anchor: 'middle' },
    ];
  }
  const BTB_Q = scene(btbItems('green', 'green').concat([
    { type: 'text', x: 310, y: 24, text: '光を当てる前（どちらも緑色）', size: 12, anchor: 'end' },
    { type: 'region', id: 'r1', x: 120, y: 150, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 220, y: 150, r: 22, label: 'イ' },
  ]));

  // 昼と夜の植物の気体の出入り。X は昼だけ（上の矢印）、Y は昼も夜も（下の矢印）。
  // 昼の矢印の中点: X 入る (34, 86)、X 出る (126, 86)、Y 入る (35, 178)、Y 出る (125, 178)
  function dayNightItems() {
    const plant = (x) => [
      { type: 'line', points: [[x, 210], [x, 128]], color: 'green', width: 4 },
      { type: 'ellipse', x: x - 18, y: 132, rx: 18, ry: 8, fill: 'green', stroke: 'none' },
      { type: 'ellipse', x: x + 18, y: 132, rx: 18, ry: 8, fill: 'green', stroke: 'none' },
    ];
    return [
      { type: 'line', points: [[160, 10], [160, 230]], color: 'gray', width: 1, dashed: true },
      { type: 'text', x: 80, y: 24, text: '昼', size: 16, anchor: 'middle', bold: true },
      { type: 'text', x: 240, y: 24, text: '夜', size: 16, anchor: 'middle', bold: true },
      ...plant(80), ...plant(240),
      { type: 'arrow', x1: 12, y1: 62, x2: 56, y2: 110, color: 'blue', width: 2 },
      { type: 'arrow', x1: 104, y1: 110, x2: 148, y2: 62, color: 'blue', width: 2 },
      { type: 'arrow', x1: 12, y1: 196, x2: 58, y2: 160, color: 'orange', width: 2 },
      { type: 'arrow', x1: 102, y1: 160, x2: 148, y2: 196, color: 'orange', width: 2 },
      { type: 'arrow', x1: 172, y1: 196, x2: 218, y2: 160, color: 'orange', width: 2 },
      { type: 'arrow', x1: 262, y1: 160, x2: 308, y2: 196, color: 'orange', width: 2 },
      { type: 'text', x: 80, y: 40, text: 'X（昼だけ）', size: 12, anchor: 'middle' },
      { type: 'text', x: 80, y: 232, text: 'Y（昼も夜も）', size: 12, anchor: 'middle' },
      { type: 'text', x: 240, y: 232, text: 'Y', size: 12, anchor: 'middle' },
    ];
  }
  const DAY_NIGHT_Q = scene(dayNightItems().concat([
    { type: 'region', id: 'r1', x: 34, y: 86, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 126, y: 86, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 35, y: 178, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 125, y: 178, r: 22, label: 'エ' },
  ]));

  // 茎の断面の写真（body-mp4-c1。赤い色水を吸わせた）。左の視野 (5〜152, 35〜182) は維管束が輪のように並ぶ、
  // 右の視野 (167〜312, 35〜182) は散らばる。植物名は書かない（答えになる）
  const STEM_PAIR_Q = scene([
    photo('body-mp4-c1'),
    tag(160, 22, '赤い色水を吸わせた茎の断面', { size: 13, anchor: 'middle' }),
    { type: 'region', id: 'r1', x: 80, y: 210, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 240, y: 210, r: 22, label: 'イ' },
  ]);

  // 人体模型の消化にかかわる器官の写真（body-3-c1）。肝臓 (128, 50)・胃 (200, 52)・小腸 (160, 150)・大腸（左のたての部分 (100, 150)）
  // 名前は body-3-c1 と同じ位置。胆のうは肝臓の下 (124, 78) にあり、写真でははっきり見えないので引き出し線だけ
  const GUT_NAMES = scene([
    photo('body-3-c1'),
    pin(258, 16, 180, 16), tag(262, 21, '食道'),
    pin(258, 46, 212, 46), tag(262, 51, '胃'),
    pin(258, 84, 196, 82), tag(262, 89, 'すい臓'),
    pin(258, 136, 190, 144), tag(262, 141, '小腸'),
    pin(258, 222, 166, 224), tag(262, 227, '肛門'),
    pin(42, 46, 112, 52), tag(8, 51, '肝臓'),
    pin(58, 96, 124, 78), tag(8, 101, '胆のう'),
    pin(42, 146, 100, 146), tag(8, 151, '大腸'),
    tag(4, 236, '図の左がからだの右', { size: 13 }),
  ]);
  // 同じ写真で器官を選ぶ図（ア 肝臓・イ 胃・ウ 小腸・エ 大腸）。器官の名前は書かない
  const GUT_PHOTO_Q = scene([
    photo('body-3-c1'),
    tag(4, 236, '図の左がからだの右', { size: 13 }),
    { type: 'region', id: 'r1', x: 128, y: 50, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 200, y: 52, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 160, y: 150, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 100, y: 156, r: 22, label: 'エ' },
  ]);

  // だ液の実験の写真（body-3-c3）。約 40 ℃ の湯（ビーカー 90〜210, 90〜225）に試験管 2 本。左が A（デンプンのり＋水）x 145、
  // 右が B（デンプンのり＋だ液）x 172（液 y 140〜205）。右に温度計（x 190〜205）。左と右は白い余白
  function salivaItems() {
    return [
      photo('body-3-c3'),
      tag(8, 22, 'A: デンプンのり＋水', { size: 13 }),
      tag(8, 42, 'B: デンプンのり＋だ液', { size: 13 }),
      tag(145, 62, 'A', { size: 15, anchor: 'middle', bold: true }),
      tag(172, 62, 'B', { size: 15, anchor: 'middle', bold: true }),
      pin(90, 212, 110, 204), tag(8, 216, '約40℃の湯', { size: 13 }),
    ];
  }
  const SALIVA_Q = scene(salivaItems().concat([
    pin(66, 140, 138, 170), { type: 'region', id: 'r1', x: 44, y: 140, r: 22, label: 'ア' },
    pin(254, 140, 180, 170), { type: 'region', id: 'r2', x: 276, y: 140, r: 22, label: 'イ' },
  ]));

  // 血液を顕微鏡で見たようす（模式図）。赤血球 (70, 120) など、血小板の集まり (142, 128)、白血球 (230, 96)、血しょう (60, 190)
  function bloodItems() {
    const items = [{ type: 'rect', x: 10, y: 10, width: 300, height: 220, rx: 8, fill: '#FBEFD5', stroke: 'line' }];
    [[60, 60], [110, 50], [70, 120], [250, 170], [270, 54], [160, 190], [190, 150]].forEach(([x, y]) => items.push(
      { type: 'circle', x, y, r: 15, fill: 'red', stroke: 'none' },
      { type: 'circle', x, y, r: 6, fill: '#E88A87', stroke: 'none' },
    ));
    items.push(
      { type: 'circle', x: 230, y: 96, r: 24, fill: 'white', stroke: 'line' },
      { type: 'ellipse', x: 230, y: 96, rx: 12, ry: 8, fill: 'purple', stroke: 'none' },
      ...[[140, 120], [150, 132], [132, 134]].map(([x, y]) => ({ type: 'circle', x, y, r: 4, fill: 'purple', stroke: 'none' })),
    );
    return items;
  }
  const BLOOD_Q = scene(bloodItems().concat([
    { type: 'region', id: 'r1', x: 70, y: 120, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 142, y: 128, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 230, y: 96, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 60, y: 190, r: 22, label: 'エ' },
  ]));

  // 肺のつくり（模式図）。気管 (160, 40)、左の気管支の中ほど (132, 104)、肺胞の集まり 左 (100, 150)・右 (220, 150)
  function lungItems() {
    const items = [
      { type: 'line', points: [[160, 14], [160, 80]], color: 'pink', width: 12 },
      { type: 'line', points: [[160, 80], [104, 128]], color: 'pink', width: 8 },
      { type: 'line', points: [[160, 80], [216, 128]], color: 'pink', width: 8 },
    ];
    [100, 220].forEach(cx => [[0, 0], [-20, -8], [20, -8], [-12, 16], [12, 16]].forEach(([dx, dy]) =>
      items.push({ type: 'circle', x: cx + dx, y: 150 + dy, r: 12, fill: 'white', stroke: 'line' })));
    items.push(
      { type: 'line', points: [[188, 176], [204, 186], [232, 186], [248, 166], [246, 136], [232, 124]], color: 'red', width: 2 },
      { type: 'line', points: [[132, 176], [116, 186], [88, 186], [72, 166], [74, 136], [88, 124]], color: 'red', width: 2 },
    );
    return items;
  }
  const LUNG_Q = scene(lungItems().concat([
    { type: 'text', x: 316, y: 230, text: '赤い線は毛細血管', size: 12, anchor: 'end' },
    { type: 'region', id: 'r1', x: 160, y: 40, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 132, y: 104, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 220, y: 150, r: 22, label: 'ウ' },
  ]));

  // 人体模型の排出にかかわる器官の写真（body-mp8-c2。消化管を取りはずして正面から。図の左がからだの右）。
  // じん臓 (125, 65)・(198, 62)、輸尿管（左 x 135〜140, y 75〜180。右 x 182〜178）、ぼうこう (160, 192)、
  // 大静脈（青）x 152、大動脈（赤）x 165。左右は白い余白
  function kidneyItems() {
    return [
      photo('body-mp8-c2'),
      tag(160, 16, '図の左がからだの右', { size: 13, anchor: 'middle' }),
      tag(160, 234, '赤: 動脈　青: 静脈', { size: 13, anchor: 'middle' }),
    ];
  }
  const KIDNEY_Q = scene(kidneyItems().concat([
    pin(56, 66, 108, 66), { type: 'region', id: 'r1', x: 34, y: 66, r: 22, label: 'ア' },
    pin(264, 194, 180, 194), { type: 'region', id: 'r2', x: 286, y: 194, r: 22, label: 'イ' },
    pin(56, 140, 136, 140), { type: 'region', id: 'r3', x: 34, y: 140, r: 22, label: 'ウ' },
  ]));

  // ヒトの目の断面（模式図。左から光が入る）。レンズ (120, 120)、虹彩 x 102、網膜は奥の赤い線、視神経は右へ出る黄色の線
  function eyeItems() {
    const retina = [];
    for (let a = -70; a <= 70; a += 10) {
      const t = a * Math.PI / 180;
      retina.push([Math.round(180 + 78 * Math.cos(t)), Math.round(120 + 78 * Math.sin(t))]);
    }
    return [
      { type: 'arrow', x1: 8, y1: 120, x2: 70, y2: 120, color: 'orange', width: 3 },
      { type: 'text', x: 20, y: 108, text: '光', size: 13 },
      { type: 'circle', x: 180, y: 120, r: 84, fill: 'white', stroke: 'ink' },
      { type: 'line', points: [[96, 96], [86, 120], [96, 144]], color: 'line', width: 2 },
      { type: 'line', points: retina, color: 'red', width: 4 },
      { type: 'line', points: [[102, 88], [102, 104]], color: 'brown', width: 6 },
      { type: 'line', points: [[102, 136], [102, 152]], color: 'brown', width: 6 },
      { type: 'ellipse', x: 120, y: 120, rx: 10, ry: 26, fill: 'lensFill', stroke: 'ink' },
      { type: 'line', points: [[262, 120], [314, 120]], color: 'yellow', width: 12 },
      leader(120, 94, 120, 48),
      leader(102, 152, 60, 190),
      leader(235, 65, 270, 40),
    ];
  }
  const EYE_Q = scene(eyeItems().concat([
    { type: 'region', id: 'r1', x: 120, y: 26, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 48, y: 206, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 284, y: 26, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 292, y: 150, r: 22, label: 'エ' },
  ]));

  // ヒトの耳のつくり（模式図）。鼓膜 x 104（下はし (104, 170)）、耳小骨 (130, 112)、うずまき管 (186, 150)、半規管 (190, 76)
  function earItems() {
    return [
      { type: 'polygon', points: [[10, 60], [34, 52], [44, 90], [40, 150], [30, 190], [12, 184], [20, 140], [18, 96]], fill: 'pink', stroke: 'line' },
      { type: 'rect', x: 40, y: 108, width: 62, height: 26, fill: 'sky', stroke: 'line' },
      { type: 'line', points: [[104, 90], [104, 170]], color: 'brown', width: 4 },
      { type: 'line', points: [[106, 120], [124, 104], [142, 112], [156, 124]], color: 'gray', width: 5 },
      { type: 'circle', x: 176, y: 72, r: 16, fill: 'none', stroke: 'ink' },
      { type: 'circle', x: 206, y: 62, r: 16, fill: 'none', stroke: 'ink' },
      { type: 'circle', x: 198, y: 94, r: 12, fill: 'none', stroke: 'ink' },
      { type: 'line', points: [[212, 150], [300, 170]], color: 'yellow', width: 8 },
      { type: 'circle', x: 186, y: 150, r: 26, fill: 'pink', stroke: 'line' },
      { type: 'circle', x: 190, y: 148, r: 13, fill: 'none', stroke: 'line' },
      { type: 'circle', x: 192, y: 148, r: 5, fill: 'none', stroke: 'line' },
    ];
  }
  const EAR_Q = scene(earItems().concat([
    { type: 'region', id: 'r1', x: 104, y: 196, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 130, y: 84, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 186, y: 150, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 252, y: 64, r: 22, label: 'エ' },
    leader(230, 66, 222, 64),
  ]));

  // うでの骨と筋肉（模式図。左がかた、ひじで曲げている）。左はしのけん (40, 112)、関節 (170, 130)、
  // 内側の筋肉 (100, 106)、外側の筋肉 (100, 154)
  function armItems() {
    return [
      { type: 'line', points: [[30, 130], [166, 130]], color: 'rock', width: 10 },
      { type: 'line', points: [[174, 126], [280, 64]], color: 'rock', width: 10 },
      { type: 'circle', x: 286, y: 58, r: 12, fill: 'pink', stroke: 'line' },
      { type: 'line', points: [[52, 106], [28, 120]], color: 'ink', width: 2 },
      { type: 'line', points: [[148, 106], [196, 112]], color: 'ink', width: 2 },
      { type: 'line', points: [[52, 154], [28, 140]], color: 'ink', width: 2 },
      { type: 'line', points: [[148, 154], [172, 140]], color: 'ink', width: 2 },
      { type: 'ellipse', x: 100, y: 106, rx: 50, ry: 13, fill: 'pink', stroke: 'line' },
      { type: 'ellipse', x: 100, y: 154, rx: 50, ry: 13, fill: '#E6A57E', stroke: 'line' },
      { type: 'circle', x: 170, y: 130, r: 9, fill: 'white', stroke: 'ink' },
      { type: 'text', x: 8, y: 76, text: 'かた', size: 12 },
      { type: 'text', x: 304, y: 40, text: '手', size: 12 },
    ];
  }
  const ARM_Q = scene(armItems().concat([
    { type: 'region', id: 'r1', x: 40, y: 112, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 170, y: 130, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 100, y: 100, r: 22, label: 'ウ' },
    { type: 'region', id: 'r4', x: 100, y: 160, r: 22, label: 'エ' },
  ]));

  // ---- ステージ body-mp1: 細胞と組織（ミニプリント「細胞の部分」「組織と器官」） ----
  const bodyMp1 = {
    id: 'body-mp1', areaId: 'body-miniprint', title: 'プリント 1: 細胞と組織', minutes: 5, concepts: ['bo-cell'],
    lessons: [
      {
        id: 'body-mp1-c1',
        text: '細胞の模式図では、植物にも動物にもある**核**と**細胞膜**、植物の細胞だけにある**細胞壁**・**葉緑体**・**液胞**を見分けます。核と細胞壁をのぞいた部分を**細胞質**といいます。核は染色液によく染まります。',
        figure: PLANT_CELL_NAMES,
      },
      {
        id: 'body-mp1-c2',
        text: 'からだが多くの細胞でできている生物を**多細胞生物**といいます。多細胞生物では、形やはたらきが同じ細胞が集まって**組織**になり、いくつかの組織が組み合わさって胃や葉などの**器官**ができます。',
        // 細胞 → 組織 → 器官 → 個体
        figure: scene([
          ...['細胞', '組織', '器官', '個体'].map((t, i) => ({ type: 'rect', x: 8 + i * 80, y: 40, width: 64, height: 40, fill: i === 0 ? 'lightgreen' : 'white' })),
          ...['細胞', '組織', '器官', '個体'].map((t, i) => ({ type: 'text', x: 40 + i * 80, y: 66, text: t, size: 15, anchor: 'middle', bold: true })),
          ...[0, 1, 2].map(i => ({ type: 'arrow', x1: 73 + i * 80, y1: 60, x2: 87 + i * 80, y2: 60, width: 2 })),
          ...['筋肉の細胞', '筋肉の組織', '胃', 'ヒト'].map((t, i) => ({ type: 'text', x: 40 + i * 80, y: 104, text: t, size: 12, anchor: 'middle' })),
          { type: 'circle', x: 40, y: 150, r: 12, fill: 'pink', stroke: 'line' },
          ...[-14, 0, 14].flatMap(dx => [-14, 0, 14].map(dy => ({ type: 'circle', x: 120 + dx, y: 150 + dy, r: 7, fill: 'pink', stroke: 'line' }))),
          { type: 'ellipse', x: 200, y: 150, rx: 26, ry: 18, fill: 'pink', stroke: 'line' },
          { type: 'circle', x: 280, y: 128, r: 10, fill: 'pink', stroke: 'line' },
          { type: 'rect', x: 270, y: 140, width: 20, height: 36, rx: 6, fill: 'pink', stroke: 'line' },
          { type: 'text', x: 160, y: 222, text: '単細胞生物は、1 つの細胞がそのまま個体', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'body-mp1-w1', concept: 'bo-cell',
      prompt: '予想しよう。ミジンコとゾウリムシのうち、からだが 1 つの細胞だけでできているのはどちらだと思う？',
      options: ['ゾウリムシ', 'ミジンコ', 'どちらも多くの細胞でできている'],
      answer: 'a',
      explanation: 'ゾウリムシは 1 つの細胞でできた単細胞生物、ミジンコは小さくても多くの細胞でできた多細胞生物です。細胞のつくりと、細胞の集まり方を復習しよう。',
      hint: '大きさだけでは決められないよ。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp1-p1', concept: 'bo-cell',
        prompt: '植物の細胞の模式図です（ア: 丸い粒、イ: たくさんある小さな粒、ウ: いちばん外側のあつい囲み、エ: 中央の大きなふくろ）。酢酸カーミン液などの染色液によく染まるのはどれ？',
        figure: PLANT_CELL_Q,
        answer: 'r1',
        explanation: '染色液によく染まるのは核（ア）です。核はふつう 1 つの細胞に 1 個あります。イは葉緑体、ウは細胞壁、エは液胞です。',
        hint: '細胞に、ふつう 1 個だけある粒だよ。',
      }),
      fill({
        id: 'body-mp1-t1', concept: 'bo-cell', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '細胞のうち、核と細胞壁をのぞいた部分をまとめて[b1]という。',
        blanks: [word('b1', ['細胞質', '細胞膜', '液胞'], '細胞質')],
        explanation: '核と細胞壁をのぞいた部分を**細胞質**といいます。細胞膜や葉緑体、液胞も細胞質にふくまれます。',
        hint: '「細胞の中身」という意味の言葉だよ。',
      }),
      fill({
        id: 'body-mp1-p2', concept: 'bo-cell',
        prompt: '植物の細胞のつくりの名前を入れよう。',
        text: '緑色の小さな粒を[b1]、細胞の中の大きなふくろを[b2]、細胞膜の外側のじょうぶなしきりを[b3]という。',
        blanks: [
          word('b1', ['葉緑体', '液胞', '細胞壁'], '葉緑体'),
          word('b2', ['葉緑体', '液胞', '細胞壁'], '液胞'),
          word('b3', ['葉緑体', '液胞', '細胞壁'], '細胞壁'),
        ],
        explanation: '緑色の粒が葉緑体、大きなふくろが液胞、外側のじょうぶなしきりが細胞壁です。この 3 つは植物の細胞の特徴です（液胞は動物の細胞では小さい）。',
        hint: '光合成をするのは緑色の粒だったね。',
      }),
      choice({
        id: 'body-mp1-p3', concept: 'bo-cell',
        prompt: '次のうち、どちらも多くの細胞でできている生物の組み合わせはどれ？',
        options: ['ミジンコとオオカナダモ', 'ゾウリムシとミカヅキモ', 'ゾウリムシとミジンコ', 'ミカヅキモとオオカナダモ'],
        answer: 'a',
        explanation: 'ミジンコとオオカナダモは多細胞生物です。ゾウリムシとミカヅキモは、からだが 1 つの細胞でできた単細胞生物です。',
        hint: 'ゾウリムシとミカヅキモは、顕微鏡で 1 つの細胞が見える生物だよ。',
      }),
      fill({
        id: 'body-mp1-p4', concept: 'bo-cell',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'からだが多くの細胞でできている生物を[b1]という。形やはたらきが同じ細胞が集まった部分を[b2]、[b2]がいくつか組み合わさった部分を[b3]という。',
        blanks: [
          word('b1', ['多細胞生物', '単細胞生物'], '多細胞生物'),
          word('b2', ['組織', '器官', '個体'], '組織'),
          word('b3', ['組織', '器官', '個体'], '器官'),
        ],
        explanation: '多細胞生物のからだは、細胞 → 組織 → 器官 → 個体と組み立てられています。たとえば、胃は筋肉の組織などが組み合わさった器官です。',
        hint: '小さいほうから、細胞 → ？ → ？ → 個体 の順だよ。',
      }),
      choice({
        id: 'body-mp1-p5', concept: 'bo-cell',
        prompt: '細胞のいちばん外側をおおううすい膜で、動物の細胞にも植物の細胞にもあるものはどれ？',
        options: ['細胞膜', '細胞壁', '液胞', '葉緑体'],
        answer: 'a',
        explanation: '細胞膜はどの細胞にもあるうすい膜です。植物の細胞では、細胞膜のさらに外側に細胞壁があります。',
        hint: '「膜」はうすいもの、「壁」はじょうぶなしきりだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp1-r1', concept: 'bo-cell',
        prompt: '植物の細胞の模式図です（ア: 丸い粒、イ: たくさんある小さな粒、ウ: いちばん外側のあつい囲み、エ: 中央の大きなふくろ）。植物の細胞で大きく育っている液胞はどれ？',
        figure: PLANT_CELL_Q,
        answer: 'r4',
        explanation: '中央の大きなふくろ（エ）が液胞です。液胞の中には、不要な物質などがとけた液が入っています。',
        hint: '細胞の中で、いちばん大きな部分をさがそう。',
      }),
      choice({
        id: 'body-mp1-r2', concept: 'bo-cell',
        prompt: '胃や小腸、植物の葉のように、いくつかの組織が組み合わさって特定のはたらきをする部分を何という？',
        options: ['器官', '組織', '細胞'],
        answer: 'a',
        explanation: 'いくつかの組織が組み合わさって特定のはたらきをする部分を器官といいます。器官が集まって個体になります。',
        hint: '組織より 1 段大きなまとまりだよ。',
      }),
      choice({
        id: 'body-mp1-r3', concept: 'bo-cell',
        prompt: '細胞質にふくまれるものはどれ？',
        options: ['細胞膜', '核', '細胞壁'],
        answer: 'a',
        explanation: '細胞質は、核と細胞壁をのぞいた部分です。細胞膜は細胞質にふくまれます。',
        hint: '細胞質に入らないのは、核と細胞壁の 2 つだよ。',
      }),
    ],
  };

  // ---- ステージ body-mp2: 光合成の実験（ミニプリント「アサガオの葉（ふ入り）」「光合成の行われる場所」「光合成とＢＴＢ」） ----
  const bodyMp2 = {
    id: 'body-mp2', areaId: 'body-miniprint', title: 'プリント 2: 光合成の実験', minutes: 5, concepts: ['bo-photosynthesis'],
    lessons: [
      {
        id: 'body-mp2-c1',
        text: 'ふ入りの葉の白い部分には**葉緑体**がありません。一晩暗い所に置いた葉の一部をアルミニウムはくでおおい、光を当ててからヨウ素液で調べると、緑色で光が当たった部分だけにデンプンができています。',
        // 写真（body-2-c2 の画像）: 左の葉 (8〜150, 5〜178) はふ入りで、まん中をアルミニウムはく (8〜148, 63〜110) でおおってある。
        // 右の葉 (170〜310, 5〜178) は脱色してヨウ素液につけたもの（上と下の緑色だった部分だけ青紫色、はくの下 (240, 95) は色が変わらない）
        figure: scene([
          photo('body-2-c2'),
          pin(30, 24, 26, 50), tag(8, 18, 'ふ（白い部分）', { size: 13 }),
          tag(70, 90, 'アルミニウムはく', { size: 13, anchor: 'middle' }),
          { type: 'arrow', x1: 128, y1: 140, x2: 180, y2: 140, width: 3 },
          tag(155, 162, '脱色', { size: 13, anchor: 'middle' }),
          tag(155, 179, 'ヨウ素液', { size: 13, anchor: 'middle' }),
          pin(64, 184, 74, 150), tag(64, 198, '緑色の部分', { size: 13, anchor: 'middle' }),
          tag(244, 100, 'はくの下', { size: 13, anchor: 'middle' }),
          pin(244, 184, 244, 140), tag(244, 198, '青紫色', { size: 13, anchor: 'middle', bold: true }),
          tag(160, 228, '緑色で光が当たった部分だけ青紫色', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-mp2-c2',
        text: '青色の**BTB溶液**に息をふきこんで緑色にし、水草を入れた A と入れない B に光を当てます。A だけ青色になるのは、光合成で二酸化炭素が使われたからです。B のように条件を 1 つだけ変えてくらべる実験を**対照実験**といいます。',
        // 写真: 試験管立て (88〜258, 65〜180) の試験管 2 本に左から電灯 (0〜78, 5〜175) の光。左の A (x 150) は水草入りで青色、
        // 右の B (x 200) は何も入れず緑色（液 y 52〜162）。右上と下は白い余白
        figure: scene([
          photo('body-mp2-c2'),
          tag(150, 44, 'A', { size: 15, anchor: 'middle', bold: true }),
          tag(200, 44, 'B', { size: 15, anchor: 'middle', bold: true }),
          tag(272, 40, 'B は対照実験', { size: 13, anchor: 'middle' }),
          tag(120, 198, '水草を入れる', { size: 13, anchor: 'middle' }),
          tag(120, 216, '→ 青色', { size: 13, anchor: 'middle', bold: true }),
          tag(244, 198, '何も入れない', { size: 13, anchor: 'middle' }),
          tag(244, 216, '→ 緑色のまま', { size: 13, anchor: 'middle', bold: true }),
          tag(160, 236, 'BTB 溶液に息をふきこみ緑色にして光を当てた', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'body-mp2-w1', concept: 'bo-photosynthesis',
      prompt: '予想しよう。ふ入りの葉の白い部分（ふ）に光を当てると、デンプンはできると思う？',
      options: ['できない', 'できる', '緑色の部分より多くできる'],
      answer: 'a',
      explanation: 'ふの部分には葉緑体がないので、光が当たってもデンプンはできません。光合成に必要なものを、実験で確かめよう。',
      hint: '光合成は、細胞の中のどこで行われていたかな。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp2-p1', concept: 'bo-photosynthesis',
        prompt: 'ふ入りの葉の一部をアルミニウムはくでおおい、光を当てました（ア: ふの部分で光が当たった、イ: 緑色の部分で光が当たった、ウ: ふの部分ではくにおおわれた、エ: 緑色の部分ではくにおおわれた）。光は当たったのに、葉緑体がないためにデンプンができなかったのはどれ？',
        figure: FU_LEAF_Q,
        answer: 'r1',
        explanation: 'ア（ふの部分で光が当たった）は、光は当たっていますが葉緑体がないので、デンプンはできません。ウとエは光が当たっていません。デンプンができたのはイだけです。',
        hint: '「光あり」で「葉緑体なし」の場所をさがそう。',
      }),
      fill({
        id: 'body-mp2-t1', concept: 'bo-photosynthesis', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'ふ入りの葉のふの部分には[b1]がないので、光が当たっても[b2]が行われない。',
        blanks: [
          word('b1', ['葉緑体', '核', '気孔'], '葉緑体'),
          word('b2', ['光合成', '呼吸', '蒸散'], '光合成'),
        ],
        explanation: 'ふの部分が白く見えるのは、**葉緑体**がないからです。葉緑体がないと、**光合成**は行われません。',
        hint: '葉が緑色に見えるのは、何があるからかな。',
      }),
      choice({
        id: 'body-mp2-p2', concept: 'bo-photosynthesis',
        prompt: 'ふ入りの葉の実験で、葉の一部をアルミニウムはくでおおうのはなぜ？',
        options: ['その部分に日光が当たらないようにするため', '葉をあたためるため', '葉の水分がにげないようにするため'],
        answer: 'a',
        explanation: 'アルミニウムはくでおおった部分には日光が当たりません。光が当たった部分とくらべることで、光合成に光が必要かどうかを調べます。',
        hint: 'はくは光を通すかな。',
      }),
      choice({
        id: 'body-mp2-p3', concept: 'bo-photosynthesis',
        prompt: '十分に光を当てたオオカナダモの葉 A と、一晩暗室に置いた葉 B に、ヨウ素液をかけて顕微鏡で見ました。青紫色に染まった粒が見られたのはどれ？',
        options: ['A だけ', 'B だけ', 'A と B の両方', 'どちらも染まらない'],
        answer: 'a',
        explanation: '光を当てた A では、細胞の中の葉緑体でデンプンがつくられたので、葉緑体が青紫色に染まります。暗室に置いた B では光合成ができず、デンプンがありません。',
        hint: 'デンプンをつくるには光が必要だったね。',
      }),
      fill({
        id: 'body-mp2-p4', concept: 'bo-photosynthesis',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'ヨウ素液は[b1]があると青紫色に変わる。オオカナダモの葉では、細胞の中の[b2]が青紫色に染まった。',
        blanks: [
          word('b1', ['デンプン', 'ブドウ糖', 'タンパク質'], 'デンプン'),
          word('b2', ['葉緑体', '核', '液胞'], '葉緑体'),
        ],
        explanation: 'ヨウ素液はデンプンを調べる薬品です。青紫色に染まったのは葉緑体なので、光合成は葉緑体で行われていると分かります。',
        hint: '光合成でデンプンがつくられる場所はどこかな。',
      }),
      figureChoice({
        id: 'body-mp2-p5', concept: 'bo-photosynthesis',
        prompt: '息をふきこんで緑色にした BTB 溶液を、水草を入れた試験管（ア）と、何も入れない試験管（イ）に入れ、光を当てました。しばらくして青色に変わるのはどちら？',
        figure: BTB_Q,
        answer: 'r1',
        explanation: '水草を入れたア（A）では、光合成で水中の二酸化炭素が使われて減るので、BTB 溶液は青色（アルカリ性）になります。イ（B）は緑色のままです。',
        hint: '光合成で使われる気体を考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'body-mp2-r1', concept: 'bo-photosynthesis',
        prompt: 'BTB 溶液の実験で、何も入れない試験管 B も用意したのはなぜ？',
        options: ['色の変化が水草のはたらきによることを確かめるため', '水草を入れる場所が足りないため', 'B に光を当てないため'],
        answer: 'a',
        explanation: 'B は、水草がないと色が変わらないことを確かめるためのものです。調べたい条件だけを変えてくらべる実験を対照実験といいます。',
        hint: 'A と B でちがうのは、水草があるかないかだけだよ。',
      }),
      choice({
        id: 'body-mp2-r2', concept: 'bo-photosynthesis',
        prompt: '水草を入れた試験管 A の BTB 溶液が、緑色から青色に変わった理由はどれ？',
        options: ['二酸化炭素が減ったから', '二酸化炭素が増えたから', '酸素が減ったから', '酸素が増えたから'],
        answer: 'a',
        explanation: '二酸化炭素は水にとけると酸性を示します。光合成で二酸化炭素が使われて減ったので、溶液がアルカリ性になり青色に変わりました。酸素も増えますが、BTB 溶液の色を変えるのは二酸化炭素の量です。',
        hint: 'BTB 溶液の色は、酸性・中性・アルカリ性で変わるよ。',
      }),
      figureChoice({
        id: 'body-mp2-r3', concept: 'bo-photosynthesis',
        prompt: 'ふ入りの葉の実験です（ア: ふの部分で光が当たった、イ: 緑色の部分で光が当たった、ウ: ふの部分ではくにおおわれた、エ: 緑色の部分ではくにおおわれた）。光合成に葉緑体が必要なことを確かめるには、イの結果とどれをくらべればよい？',
        figure: FU_LEAF_Q,
        answer: 'r1',
        explanation: 'イとアは、どちらも光が当たっていて、ちがうのは葉緑体があるかないかだけです。イだけ青紫色になるので、光合成には葉緑体が必要だと分かります。',
        hint: '光の条件は同じで、葉緑体の有無だけがちがうものをさがそう。',
      }),
      choice({
        id: 'body-mp2-r4', concept: 'bo-photosynthesis',
        prompt: '光合成の実験の前に、葉を一晩暗い所に置いておくのはなぜ？',
        options: ['葉の中のデンプンをなくしておくため', '葉の緑色をぬくため', '葉をやわらかくするため'],
        answer: 'a',
        explanation: '暗い所では光合成ができず、葉にあったデンプンは別の場所へ運ばれてなくなります。こうしておくと、実験で見つかったデンプンは、光を当てた間にできたものだと分かります。',
        hint: '実験の前から葉にデンプンがあったら、どうなるかな。',
      }),
    ],
  };

  // ---- ステージ body-mp3: 光合成と呼吸（ミニプリント「光合成のまとめ」「呼吸と光合成」） ----
  const bodyMp3 = {
    id: 'body-mp3', areaId: 'body-miniprint', title: 'プリント 3: 光合成と呼吸', minutes: 5, concepts: ['bo-photosynthesis'],
    lessons: [
      {
        id: 'body-mp3-c1',
        anim: 'bo-photosynthesis-flow',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '光合成は、**光エネルギー**を使って細胞の**葉緑体**で行われます。材料は二酸化炭素と水で、デンプンなどの養分と酸素ができます。式で表すと「二酸化炭素 ＋ 水 → デンプンなど ＋ 酸素」です。',
        // 光合成の式
        figure: scene([
          { type: 'circle', x: 160, y: 36, r: 14, fill: 'yellow', stroke: 'orange' },
          { type: 'text', x: 160, y: 72, text: '光エネルギー', size: 13, anchor: 'middle' },
          { type: 'rect', x: 6, y: 92, width: 130, height: 56, fill: 'white' },
          { type: 'text', x: 71, y: 126, text: '二酸化炭素 ＋ 水', size: 14, anchor: 'middle' },
          { type: 'arrow', x1: 140, y1: 120, x2: 180, y2: 120, width: 3 },
          { type: 'rect', x: 184, y: 92, width: 130, height: 56, fill: 'white' },
          { type: 'text', x: 249, y: 116, text: 'デンプンなど', size: 14, anchor: 'middle' },
          { type: 'text', x: 249, y: 138, text: '＋ 酸素', size: 14, anchor: 'middle' },
          { type: 'text', x: 160, y: 176, text: '葉緑体で', size: 13, anchor: 'middle' },
          { type: 'ellipse', x: 160, y: 196, rx: 16, ry: 9, fill: 'green', stroke: 'none' },
          { type: 'text', x: 160, y: 232, text: '材料は気孔と根から入り、酸素は気孔から出る', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'body-mp3-c2',
        anim: 'bo-day-night-gas',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '植物は昼も夜も**呼吸**をして、酸素をとり入れ二酸化炭素を出します。光合成は光が当たる昼だけです。昼は光合成のほうがさかんなので、全体としては二酸化炭素をとり入れ、酸素を出しているように見えます。',
        figure: scene(dayNightItems().concat([
          { type: 'text', x: 4, y: 56, text: '二酸化炭素', size: 12 },
          { type: 'text', x: 156, y: 56, text: '酸素', size: 12, anchor: 'end' },
          { type: 'text', x: 4, y: 214, text: '酸素', size: 12 },
          { type: 'text', x: 156, y: 214, text: '二酸化炭素', size: 12, anchor: 'end' },
          { type: 'text', x: 166, y: 214, text: '酸素', size: 12 },
          { type: 'text', x: 316, y: 214, text: '二酸化炭素', size: 12, anchor: 'end' },
          { type: 'text', x: 240, y: 60, text: 'X: 光合成（昼だけ）', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 80, text: 'Y: 呼吸（昼も夜も）', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'body-mp3-w1', concept: 'bo-photosynthesis',
      prompt: '予想しよう。光合成でできる気体は何だと思う？',
      options: ['酸素', '二酸化炭素', '窒素'],
      answer: 'a',
      explanation: '光合成では、二酸化炭素と水からデンプンなどができ、酸素が出されます。光合成と呼吸の気体の出入りを整理しよう。',
      hint: 'わたしたちが呼吸に使う気体だよ。',
    }),
    problems: [
      fill({
        id: 'body-mp3-p1', concept: 'bo-photosynthesis',
        prompt: '光合成の式の空らんに入る言葉を選ぼう。',
        text: '[b1] ＋ 水 → デンプンなど ＋ [b2]',
        blanks: [
          word('b1', ['二酸化炭素', '酸素', '窒素'], '二酸化炭素'),
          word('b2', ['酸素', '二酸化炭素', '水素'], '酸素'),
        ],
        explanation: '光合成の材料は二酸化炭素と水で、デンプンなどの養分と酸素ができます。',
        hint: '気孔からとり入れる気体と、出す気体を考えよう。',
      }),
      fill({
        id: 'body-mp3-t1', concept: 'bo-photosynthesis', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '光合成は、細胞の中の[b1]で、[b2]を使って行われる。',
        blanks: [
          word('b1', ['葉緑体', '核', '液胞'], '葉緑体'),
          word('b2', ['光エネルギー', '熱エネルギー', '電気エネルギー'], '光エネルギー'),
        ],
        explanation: '光合成は**葉緑体**で、**光エネルギー**を使って行われます。光が当たらないと光合成はできません。',
        hint: '光合成という名前に、使うものが入っているよ。',
      }),
      figureChoice({
        id: 'body-mp3-p2', concept: 'bo-photosynthesis',
        prompt: '植物の昼と夜の気体の出入りの図です。X は昼だけ、Y は昼も夜も行うはたらきです（ア・イ: X の矢印、ウ・エ: Y の矢印）。二酸化炭素が出ていくようすを表している矢印はどれ？',
        figure: DAY_NIGHT_Q,
        answer: 'r4',
        explanation: 'Y は昼も夜も行う呼吸で、酸素をとり入れ（ウ）、二酸化炭素を出します（エ）。X は昼だけの光合成で、二酸化炭素をとり入れ（ア）、酸素を出します（イ）。',
        hint: '二酸化炭素を出すのは、光合成と呼吸のどちらかな。',
      }),
      choice({
        id: 'body-mp3-p3', concept: 'bo-photosynthesis',
        prompt: '昼だけ行うはたらき X と、昼も夜も行うはたらき Y の組み合わせとして正しいものはどれ？',
        options: ['X 光合成、Y 呼吸', 'X 呼吸、Y 光合成', 'X も Y も光合成'],
        answer: 'a',
        explanation: '光合成は光が必要なので昼だけ、呼吸は生きるためにいつも行っているので昼も夜も行います。',
        hint: '光がないとできないのはどちらかな。',
      }),
      choice({
        id: 'body-mp3-p4', concept: 'bo-photosynthesis',
        prompt: '光が十分に当たる昼に、植物がよりさかんに行っているのは X（光合成）と Y（呼吸）のどちら？',
        options: ['X（光合成）', 'Y（呼吸）', 'どちらも同じ'],
        answer: 'a',
        explanation: '光が十分な昼は、光合成のほうが呼吸よりさかんです。そのため、全体としては二酸化炭素をとり入れ、酸素を出しているように見えます。',
        hint: '昼の植物は、全体として酸素を出していたね。',
      }),
      choice({
        id: 'body-mp3-p5', concept: 'bo-photosynthesis',
        prompt: '夜の植物の気体の出入りとして正しいものはどれ？',
        options: ['酸素をとり入れ、二酸化炭素を出す', '二酸化炭素をとり入れ、酸素を出す', '気体の出入りはない'],
        answer: 'a',
        explanation: '夜は光合成ができず、呼吸だけを行うので、酸素をとり入れて二酸化炭素を出します。',
        hint: '夜に行っているはたらきは 1 つだけだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp3-r1', concept: 'bo-photosynthesis',
        prompt: '植物の昼と夜の気体の出入りの図です。X は昼だけ、Y は昼も夜も行うはたらきです（ア・イ: X の矢印、ウ・エ: Y の矢印）。酸素がとり入れられるようすを表している矢印はどれ？',
        figure: DAY_NIGHT_Q,
        answer: 'r3',
        explanation: '酸素をとり入れるのは呼吸（Y）なので、ウです。アは光合成でとり入れる二酸化炭素、イは光合成で出す酸素、エは呼吸で出す二酸化炭素です。',
        hint: '呼吸でとり入れる気体は何かな。',
      }),
      fill({
        id: 'body-mp3-r2', concept: 'bo-photosynthesis',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '光合成でできる養分は[b1]などで、このとき[b2]も発生する。',
        blanks: [
          word('b1', ['デンプン', 'タンパク質', '脂肪'], 'デンプン'),
          word('b2', ['酸素', '二酸化炭素', '窒素'], '酸素'),
        ],
        explanation: '光合成ではデンプンなどの養分がつくられ、酸素が出されます。デンプンは水にとけやすい物質に変えられて、師管を通って運ばれます。',
        hint: 'ヨウ素液で調べた養分を思い出そう。',
      }),
      choice({
        id: 'body-mp3-r3', concept: 'bo-photosynthesis',
        prompt: '植物の呼吸について正しいものはどれ？',
        options: ['昼も夜も行い、酸素をとり入れて二酸化炭素を出す', '夜だけ行う', '光が当たっているときだけ行う'],
        answer: 'a',
        explanation: '植物も動物と同じように、昼も夜も呼吸をしています。昼は光合成もしているので、呼吸が目立たないだけです。',
        hint: '呼吸は生きるためにいつも必要なはたらきだよ。',
      }),
    ],
  };

  // ---- ステージ body-mp4: 茎のはたらきと蒸散（ミニプリント「茎のはたらき」「蒸散」「気孔の役割・蒸散」） ----
  const bodyMp4 = {
    id: 'body-mp4', areaId: 'body-miniprint', title: 'プリント 4: 茎のはたらきと蒸散', minutes: 5, concepts: ['bo-transport'],
    lessons: [
      {
        id: 'body-mp4-c1',
        text: '茎の断面には、**道管**と**師管**が集まった**維管束**があります。ヒマワリやアサガオなどの**双子葉類**では維管束が輪のように並び、トウモロコシやユリなどの**単子葉類**では茎全体に散らばっています。',
        // 写真: 赤い色水を吸わせた茎の断面（丸い視野 2 つ）。左 (5〜152, 35〜182) はヒマワリで赤い点（維管束）が輪に並ぶ
        // （例 (100, 68)）。右 (167〜312, 35〜182) はトウモロコシで赤い点が全体に散らばる（例 (222, 84)）。上と下は白い余白
        figure: scene([
          photo('body-mp4-c1'),
          pin(144, 24, 102, 66), pin(176, 24, 231, 72), tag(160, 22, '維管束', { size: 14, anchor: 'middle' }),
          tag(80, 200, 'ヒマワリ（双子葉類）', { size: 13, anchor: 'middle', bold: true }),
          tag(80, 218, '輪のように並ぶ', { size: 13, anchor: 'middle' }),
          tag(240, 200, 'トウモロコシ（単子葉類）', { size: 13, anchor: 'middle', bold: true }),
          tag(240, 218, '散らばっている', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-mp4-c2',
        text: '葉の表皮には、2 つの**孔辺細胞**に囲まれたすきまの**気孔**があります。根から吸い上げた水は、気孔から水蒸気となって出ていきます。これを**蒸散**といいます。ワセリンで気孔をふさぐと、蒸散は起こりにくくなります。',
        // 写真（body-2-c3 の画像）: 葉の裏の表皮（視野の円 x 5〜195・y 20〜212）。三日月形の孔辺細胞 2 つ（左 x 70〜98、右 x 106〜130、
        // y 78〜148）が気孔（x 96〜107、y 92〜132）を囲む。右は白い余白
        figure: scene([
          photo('body-2-c3'),
          pin(222, 92, 124, 98),
          pin(222, 92, 84, 84),
          tag(226, 97, '孔辺細胞'),
          pin(222, 146, 102, 118),
          tag(226, 151, '気孔'),
          tag(262, 22, '葉の裏の表皮', { size: 13, anchor: 'middle' }),
          tag(262, 40, '（顕微鏡）', { size: 13, anchor: 'middle' }),
          tag(262, 180, '水蒸気・酸素・', { size: 13, anchor: 'middle' }),
          tag(262, 197, '二酸化炭素が出入り', { size: 13, anchor: 'middle' }),
          tag(262, 219, '蒸散: 水が水蒸気に', { size: 13, anchor: 'middle' }),
          tag(262, 236, 'なって気孔から出る', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'body-mp4-w1', concept: 'bo-transport',
      prompt: '予想しよう。葉にワセリンをぬって気孔をふさぐと、枝から出ていく水の量はどうなると思う？',
      options: ['減る', '増える', '変わらない'],
      answer: 'a',
      explanation: '水は気孔から水蒸気となって出ていくので、気孔をふさぐと出ていく水が減ります。茎の中の通り道と、蒸散のしくみを復習しよう。',
      hint: '水蒸気の出口をふさいだらどうなるかな。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp4-p1', concept: 'bo-transport',
        prompt: '2 種類の植物の茎の断面です（ア: 維管束が輪のように並ぶ、イ: 維管束が散らばっている）。ヒマワリの茎の断面はどちら？',
        figure: STEM_PAIR_Q,
        answer: 'r1',
        explanation: 'ヒマワリは双子葉類なので、維管束が輪のように並んでいます（ア）。トウモロコシやユリなどの単子葉類は、維管束が散らばっています（イ）。',
        hint: 'ヒマワリは、子葉が 2 枚のなかまだよ。',
      }),
      fill({
        id: 'body-mp4-t1', concept: 'bo-transport', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '葉の表皮にある、2 つの[b1]に囲まれたすきまを[b2]という。',
        blanks: [
          word('b1', ['孔辺細胞', '表皮細胞', '道管'], '孔辺細胞'),
          word('b2', ['気孔', '師管', '維管束'], '気孔'),
        ],
        explanation: '三日月形の 2 つの**孔辺細胞**に囲まれたすきまが**気孔**です。気孔は、孔辺細胞の形が変わることで開いたり閉じたりします。',
        hint: '「孔」は小さな穴という意味だよ。',
      }),
      fill({
        id: 'body-mp4-p2', concept: 'bo-transport',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '根から吸い上げた水や肥料分が通る管を[b1]、葉でつくられた栄養分が通る管を[b2]、2 つが集まった部分を[b3]という。',
        blanks: [
          word('b1', ['道管', '師管', '維管束'], '道管'),
          word('b2', ['道管', '師管', '維管束'], '師管'),
          word('b3', ['道管', '師管', '維管束'], '維管束'),
        ],
        explanation: '水や肥料分は道管、葉でつくられた栄養分は師管を通ります。道管と師管が集まった部分が維管束です。',
        hint: '水の「道」が道管だよ。',
      }),
      choice({
        id: 'body-mp4-p3', concept: 'bo-transport',
        prompt: '葉の数と大きさがそろった枝を水にさし、ア 何もぬらない、イ 葉の表側にワセリン、ウ 葉の裏側にワセリン、エ 葉の表と裏の両方にワセリンをぬりました。水の減った量は ア 5.5 mL、イ 3.5 mL、ウ 2.5 mL、エ 0.5 mL でした。気孔が多いのは葉のどちら側？',
        options: ['葉の裏側', '葉の表側', '表と裏で同じ'],
        answer: 'a',
        explanation: '裏側をふさいだウ（2.5 mL）のほうが、表側をふさいだイ（3.5 mL）より減り方が少ないので、裏側からの蒸散が多いと分かります。表側からは 5.5 − 3.5 ＝ 2.0 mL、裏側からは 5.5 − 2.5 ＝ 3.0 mL です。',
        hint: 'ふさいだとき、水の減り方が大きく変わったのはどちら側かな。',
      }),
      choice({
        id: 'body-mp4-p4', concept: 'bo-transport',
        prompt: '上の実験で、葉の表と裏の両方にワセリンをぬったエでも、水が 0.5 mL 減りました。ここから分かることはどれ？',
        options: ['葉以外の茎などからも、少し蒸散している', '葉の表側から最も多く蒸散している', 'ワセリンをぬると水が増える'],
        answer: 'a',
        explanation: 'エは葉の気孔をすべてふさいでいるので、減った 0.5 mL は茎などから出た水です。蒸散は、おもに葉で行われますが、茎からも少し行われます。',
        hint: 'エで、水が出ていける場所はどこが残っているかな。',
      }),
      choice({
        id: 'body-mp4-p5', concept: 'bo-transport',
        prompt: '水を入れたメスシリンダーに枝をさし、水面に油をたらして明るい所に半日置きました。水の量はどうなる？',
        options: ['減る', '増える', '変わらない'],
        answer: 'a',
        explanation: '根や茎から吸い上げた水が、葉の気孔から水蒸気となって出ていく（蒸散）ので、水は減ります。',
        hint: '植物は水を吸い上げて、どこから出していたかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp4-r1', concept: 'bo-transport',
        prompt: '2 種類の植物の茎の断面です（ア: 維管束が輪のように並ぶ、イ: 維管束が散らばっている）。トウモロコシの茎の断面はどちら？',
        figure: STEM_PAIR_Q,
        answer: 'r2',
        explanation: 'トウモロコシは単子葉類なので、維管束が茎全体に散らばっています（イ）。ユリも同じなかまです。',
        hint: 'トウモロコシは、子葉が 1 枚のなかまだよ。',
      }),
      fill({
        id: 'body-mp4-r2', concept: 'bo-transport',
        prompt: '空らんに入る数を入れよう。',
        text: '何もぬらない枝で 5.5 mL、葉の裏側にワセリンをぬった枝で 2.5 mL の水が減ったとき、葉の裏側から出た水は[b1]と考えられる。',
        blanks: [number('b1', 3.0, 0.1, 'mL')],
        explanation: '何もぬらない枝は葉の表・裏・茎から、裏にぬった枝は葉の表と茎から蒸散しています。差の 5.5 − 2.5 ＝ 3.0 mL が、葉の裏側から出た水です。',
        hint: '2 つの枝で、蒸散している場所のちがいは葉の裏側だけだよ。',
      }),
      choice({
        id: 'body-mp4-r3', concept: 'bo-transport',
        prompt: '蒸散の実験で、水面に油をたらしておくのはなぜ？',
        options: ['水面から水が直接蒸発するのを防ぐため', '植物に養分をあたえるため', '水を冷やすため'],
        answer: 'a',
        explanation: '水面から水が蒸発すると、植物から出た水の量が正しく分かりません。油でふたをして、減った水がすべて植物を通ったものになるようにします。',
        hint: '植物を通らずに水が減ることはないかな。',
      }),
      choice({
        id: 'body-mp4-r4', concept: 'bo-transport',
        prompt: '維管束の中で、葉でつくられた栄養分が通る管はどれ？',
        options: ['師管', '道管', '気孔'],
        answer: 'a',
        explanation: '葉でつくられた栄養分は師管を通って、からだのいろいろな部分へ運ばれます。道管は、根から吸い上げた水や肥料分が通る管です。',
        hint: '水が通る管ではないほうだよ。',
      }),
    ],
  };

  // ---- ステージ body-mp5: 消化器官と小腸・肝臓（ミニプリント「消化器管」「小腸」「肝臓」） ----
  const bodyMp5 = {
    id: 'body-mp5', areaId: 'body-miniprint', title: 'プリント 5: 消化器官と小腸・肝臓', minutes: 5, concepts: ['bo-digestion'],
    lessons: [
      {
        id: 'body-mp5-c1',
        text: '食物は、口 → 食道 → 胃 → 小腸 → 大腸 → 肛門と運ばれます。口では**だ液せん**からだ液が出ます。**肝臓**は**胆汁**をつくり、胆汁は**胆のう**にたくわえられてから出されます。すい臓はすい液を出します。',
        figure: GUT_NAMES,
      },
      {
        id: 'body-mp5-c2',
        text: '小腸のかべには多くのひだがあり、その表面に**柔毛**がびっしり並んでいるので、表面積が大きく養分を効率よく吸収できます。**肝臓**は、養分をたくわえたり、有害なアンモニアを**尿素**に変えたりします。',
        figure: scene(villusItems().concat([
          { type: 'text', x: 160, y: 20, text: '柔毛（小腸のかべの小さな突起）', size: 13, anchor: 'middle' },
          leader(62, 120, 152, 120),
          { type: 'text', x: 4, y: 116, text: 'リンパ管', size: 13 },
          leader(258, 150, 210, 150),
          { type: 'text', x: 260, y: 146, text: '毛細', size: 13 },
          { type: 'text', x: 260, y: 162, text: '血管', size: 13 },
          { type: 'text', x: 160, y: 226, text: 'ひだと柔毛で表面積が大きい', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'body-mp5-w1', concept: 'bo-digestion',
      prompt: '予想しよう。からだの中の内臓で、いちばん大きいのはどれだと思う？',
      options: ['肝臓', '胃', '心臓'],
      answer: 'a',
      explanation: '肝臓は、内臓の中でいちばん大きな器官です。消化管と、消化を助ける器官のはたらきを復習しよう。',
      hint: 'おなかの右上にある、大きな器官だよ。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp5-p1', concept: 'bo-digestion',
        prompt: 'ヒトの消化にかかわる器官の図です（図の左がからだの右。ア: 図の左上の大きな器官、イ: 図の右上のふくろのような器官、ウ: 中央で長く折りたたまれた管、エ: そのまわりを囲む太い管）。口から入った食物が通らない器官はどれ？',
        figure: GUT_PHOTO_Q,
        answer: 'r1',
        explanation: 'アは肝臓で、食物は通りません。食物は、イの胃、ウの小腸、エの大腸を通ります。肝臓でつくられた胆汁は、管を通って小腸へ出されます。',
        hint: '消化管（食物の通り道）ではない器官をさがそう。',
      }),
      fill({
        id: 'body-mp5-t1', concept: 'bo-digestion', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '小腸のかべの表面にある小さな突起を[b1]という。[b1]の中には、毛細血管と[b2]が通っている。',
        blanks: [
          word('b1', ['柔毛', '肺胞', '気孔'], '柔毛'),
          word('b2', ['リンパ管', '気管', '道管'], 'リンパ管'),
        ],
        explanation: '小腸のかべの突起が**柔毛**です。中には毛細血管と**リンパ管**が通っていて、吸収した養分を運びます。',
        hint: '脂肪からできた物質が入る管は何だったかな。',
      }),
      choice({
        id: 'body-mp5-p2', concept: 'bo-digestion',
        prompt: '口から入った食物が通る器官を、順にならべたものはどれ？',
        options: ['口 → 食道 → 胃 → 小腸 → 大腸 → 肛門', '口 → 食道 → 肝臓 → 胃 → 小腸 → 肛門', '口 → 胃 → 食道 → 大腸 → 小腸 → 肛門'],
        answer: 'a',
        explanation: '食物は、口 → 食道 → 胃 → 小腸 → 大腸 → 肛門の順に消化管を通ります。肝臓やすい臓は食物が通らない器官です。',
        hint: '肝臓は、食物の通り道ではなかったね。',
      }),
      choice({
        id: 'body-mp5-p3', concept: 'bo-digestion',
        prompt: 'ブドウ糖・アミノ酸・脂肪酸・モノグリセリドのうち、柔毛の毛細血管に入るものの組み合わせはどれ？',
        options: ['ブドウ糖とアミノ酸', '脂肪酸とモノグリセリド', 'ブドウ糖と脂肪酸', '4 つすべて'],
        answer: 'a',
        explanation: 'ブドウ糖とアミノ酸は毛細血管に入ります。脂肪酸とモノグリセリドは、柔毛の中で再び脂肪になってリンパ管に入ります。',
        hint: 'リンパ管に入るのは、脂肪からできた 2 つだよ。',
      }),
      choice({
        id: 'body-mp5-p4', concept: 'bo-digestion',
        prompt: '肝臓のはたらきとして、正しくないものはどれ？',
        options: ['養分をたくわえ、必要なときに送り出す', '有害なアンモニアを尿素に変える', '脂肪の消化を助ける胆汁をつくる', '血液中の尿素をこし出して尿をつくる'],
        answer: 'd',
        explanation: '尿素をこし出して尿をつくるのはじん臓です。肝臓は、養分をたくわえる、アンモニアを尿素に変える、胆汁をつくるなど、たくさんのはたらきをしています。',
        hint: '尿をつくる器官は別にあったね。',
      }),
      choice({
        id: 'body-mp5-p5', concept: 'bo-digestion',
        prompt: '口の近くにあるだ液せんから出る消化液はどれ？',
        options: ['だ液', '胃液', '胆汁', 'すい液'],
        answer: 'a',
        explanation: 'だ液せんからはだ液が出ます。だ液にはデンプンを分解するアミラーゼがふくまれています。',
        hint: '名前に答えが入っているよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp5-r1', concept: 'bo-digestion',
        prompt: 'ヒトの消化にかかわる器官の図です（図の左がからだの右。ア: 図の左上の大きな器官、イ: 図の右上のふくろのような器官、ウ: 中央で長く折りたたまれた管、エ: そのまわりを囲む太い管）。分解された養分の多くを吸収する器官はどれ？',
        figure: GUT_PHOTO_Q,
        answer: 'r3',
        explanation: '養分の多くは小腸（ウ）の柔毛から吸収されます。大腸（エ）では、おもに水分が吸収されます。',
        hint: '柔毛がたくさんある長い管だよ。',
      }),
      choice({
        id: 'body-mp5-r2', concept: 'bo-digestion',
        prompt: '肝臓について正しいものはどれ？',
        options: ['内臓の中でいちばん大きく、養分をたくわえる', '食物が通る消化管の一部である', '尿をためておく'],
        answer: 'a',
        explanation: '肝臓は内臓の中でいちばん大きな器官で、小腸で吸収された養分をたくわえます。食物は通りません。',
        hint: '肝臓は、食物の通り道ではないよ。',
      }),
      fill({
        id: 'body-mp5-r3', concept: 'bo-digestion',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '肝臓では、タンパク質が分解されてできる有害な[b1]が、害の少ない[b2]に変えられる。',
        blanks: [
          word('b1', ['アンモニア', 'ブドウ糖', '二酸化炭素'], 'アンモニア'),
          word('b2', ['尿素', '胆汁', 'アミノ酸'], '尿素'),
        ],
        explanation: 'アミノ酸が使われるとアンモニアができます。肝臓はこれを尿素に変え、尿素はじん臓でこし出されて尿として出されます。',
        hint: '尿の中にふくまれる物質の名前だよ。',
      }),
      choice({
        id: 'body-mp5-r4', concept: 'bo-digestion',
        prompt: '肝臓でつくられた胆汁が、一時たくわえられるところはどこ？',
        options: ['胆のう', 'すい臓', 'ぼうこう'],
        answer: 'a',
        explanation: '胆汁は胆のうにたくわえられ、小腸（十二指腸）へ出されて脂肪の消化を助けます。',
        hint: '胆汁の「胆」がつく器官だよ。',
      }),
    ],
  };

  // ---- ステージ body-mp6: 消化酵素とだ液の実験（ミニプリント「消化酵素」「唾液の実験１〜３」） ----
  const bodyMp6 = {
    id: 'body-mp6', areaId: 'body-miniprint', title: 'プリント 6: 消化酵素とだ液の実験', minutes: 5, concepts: ['bo-digestion'],
    lessons: [
      {
        id: 'body-mp6-c1',
        text: '食物を吸収できる形に分解することを**消化**、消化液にふくまれ養分を分解する物質を**消化酵素**といいます。デンプンは**ブドウ糖**、タンパク質は**アミノ酸**、脂肪は**脂肪酸**と**モノグリセリド**にまで分解されます。',
        // 養分と最後に分解されたもの
        figure: scene([
          ...[['デンプン', 'ブドウ糖', 'だ液・すい液など', 50], ['タンパク質', 'アミノ酸', '胃液・すい液など', 112], ['脂肪', null, 'すい液など', 176]].flatMap(([a, b, e, y]) => [
            { type: 'text', x: 8, y, text: a, size: 14, bold: true },
            { type: 'arrow', x1: 104, y1: y - 5, x2: 168, y2: y - 5, width: 2 },
            { type: 'text', x: 136, y: y - 16, text: e, size: 12, anchor: 'middle' },
          ].concat(b ? [{ type: 'text', x: 176, y, text: b, size: 14 }] : [])),
          { type: 'text', x: 176, y: 168, text: '脂肪酸', size: 13 },
          { type: 'text', x: 176, y: 186, text: '＋ モノグリセリド', size: 13 },
          { type: 'text', x: 160, y: 228, text: '最後は小腸の柔毛から吸収される', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'body-mp6-c2',
        text: 'デンプンのりに水を加えた A と、だ液を加えた B を約 40 ℃ に保ちます。**ヨウ素液**を加えると A だけ青紫色になり、**ベネジクト液**を加えて加熱すると B だけ赤褐色の沈殿ができます。だ液がデンプンを麦芽糖などに変えたのです。',
        figure: scene(salivaItems().concat([
          tag(262, 110, 'ヨウ素液', { size: 13, anchor: 'middle' }),
          tag(262, 128, '→ A だけ青紫色', { size: 13, anchor: 'middle', bold: true }),
          tag(262, 164, 'ベネジクト液で加熱', { size: 13, anchor: 'middle' }),
          tag(262, 182, '→ B だけ赤褐色', { size: 13, anchor: 'middle', bold: true }),
          tag(262, 200, 'の沈殿', { size: 13, anchor: 'middle', bold: true }),
        ])),
      },
    ],
    warmup: choice({
      id: 'body-mp6-w1', concept: 'bo-digestion',
      prompt: '予想しよう。デンプン溶液にだ液を加え、2 分おきに少しずつとり出してヨウ素液を加えていくと、色はどう変わると思う？',
      options: ['青紫色がだんだんうすくなる', 'だんだん濃い青紫色になる', 'ずっと同じ色のまま'],
      answer: 'a',
      explanation: 'だ液がデンプンを分解していくので、時間がたつほどデンプンが減り、青紫色がうすくなっていきます。消化酵素のはたらきを実験で確かめよう。',
      hint: 'だ液は、デンプンをどうするのだったかな。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp6-p1', concept: 'bo-digestion',
        prompt: 'デンプンのりに水を加えた A（ア）と、だ液を加えた B（イ）を、約 40 ℃ の湯に入れました。そのあとベネジクト液を加えて加熱したとき、赤褐色の沈殿ができるのはどちら？',
        figure: SALIVA_Q,
        answer: 'r2',
        explanation: 'ベネジクト液は、麦芽糖やブドウ糖などがあると、加熱したときに赤褐色の沈殿ができます。だ液を加えたイ（B）では、デンプンが麦芽糖などに分解されています。',
        hint: '麦芽糖などができているのは、だ液を加えたほうだね。',
      }),
      fill({
        id: 'body-mp6-t1', concept: 'bo-digestion', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '食物を吸収できる小さな物質に分解することを[b1]といい、そのはたらきをする、消化液にふくまれる物質を[b2]という。',
        blanks: [
          word('b1', ['消化', '吸収', '排出'], '消化'),
          word('b2', ['消化酵素', '消化管', '柔毛'], '消化酵素'),
        ],
        explanation: '分解することを**消化**、分解する物質を**消化酵素**といいます。だ液のアミラーゼ、胃液のペプシンは消化酵素の例です。',
        hint: 'アミラーゼやペプシンをまとめた呼び名だよ。',
      }),
      choice({
        id: 'body-mp6-p2', concept: 'bo-digestion',
        prompt: 'デンプン溶液にだ液を加え、2 分おきに少しずつとり出してヨウ素液を加えました。とり出した時間が早いものから順に、色の変化として正しいものはどれ？',
        options: ['青紫色 → 赤紫色 → ヨウ素液の色（うすい茶色）', 'ヨウ素液の色（うすい茶色） → 赤紫色 → 青紫色', '赤紫色 → 青紫色 → ヨウ素液の色（うすい茶色）'],
        answer: 'a',
        explanation: 'はじめはデンプンが多いので青紫色、分解が進むと赤紫色になり、デンプンがなくなるとヨウ素液そのもののうすい茶色（黄色っぽい色）になります。',
        hint: '時間がたつほど、デンプンは減っていくよ。',
      }),
      choice({
        id: 'body-mp6-p3', concept: 'bo-digestion',
        prompt: '上の実験で、時間がたつとヨウ素液の色が変わらなくなりました。デンプンはどうなった？',
        options: ['だ液によって、麦芽糖などに分解された', '水にとけて見えなくなった', '熱で固まった'],
        answer: 'a',
        explanation: 'だ液にふくまれるアミラーゼが、デンプンを麦芽糖などに分解したので、ヨウ素液で調べてもデンプンがなくなっていました。',
        hint: 'だ液にふくまれる消化酵素のはたらきだよ。',
      }),
      fill({
        id: 'body-mp6-p4', concept: 'bo-digestion',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'ヨウ素液は[b1]があるかを調べる薬品で、あると[b2]色になる。ベネジクト液は[b3]があるかを調べる薬品で、加熱すると[b4]色の沈殿ができる。',
        blanks: [
          word('b1', ['デンプン', '麦芽糖など', 'タンパク質'], 'デンプン'),
          word('b2', ['青紫', '赤褐', '白'], '青紫'),
          word('b3', ['デンプン', '麦芽糖など', '脂肪'], '麦芽糖など'),
          word('b4', ['青紫', '赤褐', '白'], '赤褐'),
        ],
        explanation: 'ヨウ素液はデンプンで青紫色、ベネジクト液は麦芽糖やブドウ糖などで、加熱すると赤褐色の沈殿ができます。ベネジクト液は加熱しないと色が変わりません。',
        hint: '2 つの薬品が、それぞれ何を見つけるのか整理しよう。',
      }),
      choice({
        id: 'body-mp6-p5', concept: 'bo-digestion',
        prompt: '脂肪が最後に分解されてできる 2 つの物質はどれ？',
        options: ['脂肪酸とモノグリセリド', '塩酸とワセリン', 'ブドウ糖とアミノ酸', 'アミノ酸と脂肪酸'],
        answer: 'a',
        explanation: '脂肪は、すい液のリパーゼなどのはたらきで、脂肪酸とモノグリセリドに分解されます。ブドウ糖はデンプン、アミノ酸はタンパク質が分解されたものです。',
        hint: '「脂肪」の字がつくものと、もう 1 つだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp6-r1', concept: 'bo-digestion',
        prompt: 'デンプンのりに水を加えた A（ア）と、だ液を加えた B（イ）を、約 40 ℃ の湯に入れました。そのあとヨウ素液を加えたとき、青紫色になるのはどちら？',
        figure: SALIVA_Q,
        answer: 'r1',
        explanation: '水を加えたア（A）ではデンプンがそのまま残っているので、ヨウ素液で青紫色になります。だ液を加えたイ（B）では、デンプンが分解されています。',
        hint: 'デンプンが残っているのはどちらかな。',
      }),
      choice({
        id: 'body-mp6-r2', concept: 'bo-digestion',
        prompt: 'A（デンプンのり＋水）と B（デンプンのり＋だ液）の結果から分かる、だ液のはたらきはどれ？',
        options: ['デンプンを麦芽糖などに変えるはたらき', 'デンプンをつくるはたらき', 'タンパク質を分解するはたらき'],
        answer: 'a',
        explanation: 'B ではデンプンがなくなり（ヨウ素液が反応しない）、麦芽糖などができた（ベネジクト液が反応する）ので、だ液にはデンプンを麦芽糖などに変えるはたらきがあると分かります。',
        hint: 'ヨウ素液とベネジクト液の結果を合わせて考えよう。',
      }),
      choice({
        id: 'body-mp6-r3', concept: 'bo-digestion',
        prompt: '水にヨウ素液を加えたときの色はどれ？',
        options: ['うすい茶色（ヨウ素液の色のまま）', '青紫色', '赤褐色'],
        answer: 'a',
        explanation: '水にはデンプンがないので、ヨウ素液はそのもののうすい茶色（黄色っぽい色）のままです。デンプンがあるときだけ青紫色になります。',
        hint: '水にはデンプンがふくまれているかな。',
      }),
    ],
  };

  // ---- ステージ body-mp7: 血液と心臓（ミニプリント「血液の成分」「心臓のつくり」「心臓と血管」） ----
  const bodyMp7 = {
    id: 'body-mp7', areaId: 'body-miniprint', title: 'プリント 7: 血液と心臓', minutes: 5, concepts: ['bo-circulation'],
    lessons: [
      {
        id: 'body-mp7-c1',
        text: '血液の固形の成分は、酸素を運ぶ**赤血球**、細菌などを分解する**白血球**、出血したとき血液を固める**血小板**です。液体の**血しょう**は養分や不要な物質を運び、一部は毛細血管からしみ出して細胞のまわりを満たす**組織液**になります。',
        // 写真（body-4-c3 の画像）: 染めた血液の顕微鏡写真（視野の円 x 5〜212, y 10〜228）。名前と引き出し線は body-4-c3 と同じ位置。
        // 右の白い余白に、それぞれのはたらきを書く
        figure: scene([
          photo('body-4-c3'),
          pin(220, 46, 190, 60), tag(224, 51, '赤血球'),
          tag(216, 68, '酸素を運ぶ', { size: 13 }),
          pin(220, 90, 156, 83), tag(224, 95, '血小板'),
          tag(216, 112, '血液を固める', { size: 13 }),
          pin(220, 136, 173, 146), tag(224, 141, '白血球'),
          tag(216, 158, '細菌などを分解', { size: 13 }),
          pin(220, 186, 160, 190), tag(216, 186, '血しょう（液体）', { size: 13 }),
          tag(216, 203, '養分・不要な物質', { size: 13 }),
          tag(216, 220, 'を運ぶ → 組織液', { size: 13 }),
          tag(266, 237, '染めた血液', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-mp7-c2',
        anim: 'bo-heart-flow',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '心臓は**右心房**・**右心室**・**左心房**・**左心室**の 4 つの部屋に分かれています。全身からもどった血液は、大静脈 → 右心房 → 右心室 → 肺動脈 → 肺 → 肺静脈 → 左心房 → 左心室 → 大動脈と流れます。',
        figure: scene(heartRooms(true).concat([
          { type: 'text', x: 160, y: 44, text: '正面から見た図（図の左がからだの右）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 210, text: '全身 → 右心房 → 右心室 → 肺', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 230, text: '肺 → 左心房 → 左心室 → 全身', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'body-mp7-w1', concept: 'bo-circulation',
      prompt: '予想しよう。血液が赤く見えるのは、血液のどの成分のためだと思う？',
      options: ['赤血球', '白血球', '血しょう'],
      answer: 'a',
      explanation: '赤血球にふくまれる赤い物質（ヘモグロビン）のために、血液は赤く見えます。血液の成分と、心臓のつくりを復習しよう。',
      hint: '名前に色が入っている成分だよ。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp7-p1', concept: 'bo-circulation',
        prompt: '血液を顕微鏡で見たようすの模式図です（ア: 赤い円盤形の粒、イ: とても小さな粒、ウ: 大きく核のある粒、エ: 粒のまわりの液体）。細菌などの病原体をとらえて分解するのはどれ？',
        figure: BLOOD_Q,
        answer: 'r3',
        explanation: '細菌などを分解するのは白血球（ウ）です。アは赤血球、イは血小板、エは血しょうです。',
        hint: '核があって、形を変えて動ける成分だよ。',
      }),
      fill({
        id: 'body-mp7-t1', concept: 'bo-circulation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '血しょうの一部は毛細血管からしみ出して、細胞のまわりを満たす[b1]になる。',
        blanks: [word('b1', ['組織液', '胃液', '胆汁'], '組織液')],
        explanation: 'しみ出した血しょうを**組織液**といいます。組織液を通して、細胞と血液のあいだで酸素・養分や二酸化炭素・不要な物質が受けわたされます。',
        hint: '組織（細胞の集まり）のまわりの液だよ。',
      }),
      figureChoice({
        id: 'body-mp7-p2', concept: 'bo-circulation',
        prompt: 'ヒトの心臓の 4 つの部屋を、正面から見た模式図です（図の左がからだの右。ア: 図の左上、イ: 図の左下、ウ: 図の右上、エ: 図の右下）。全身からもどった血液が、大静脈を通って最初に入る部屋はどれ？',
        figure: HEART_Q,
        answer: 'r1',
        explanation: '全身からもどった血液は、大静脈から右心房（ア）に入ります。そのあと右心室（イ）から肺動脈を通って肺へ送られます。',
        hint: '全身からの血液は、心臓の「右」の上の部屋に入るよ。',
      }),
      choice({
        id: 'body-mp7-p3', concept: 'bo-circulation',
        prompt: '大静脈から始めて、血液が流れる順として正しいものはどれ？',
        options: [
          '大静脈 → 右心房 → 右心室 → 肺動脈 → 肺 → 肺静脈 → 左心房 → 左心室 → 大動脈 → 全身',
          '大静脈 → 左心房 → 左心室 → 肺静脈 → 肺 → 肺動脈 → 右心房 → 右心室 → 大動脈 → 全身',
          '大静脈 → 右心室 → 右心房 → 肺静脈 → 肺 → 肺動脈 → 左心室 → 左心房 → 大動脈 → 全身',
        ],
        answer: 'a',
        explanation: '血液は、心房に入ってから心室へ送られます。全身からの血液は右心房 → 右心室 → 肺動脈 → 肺 → 肺静脈 → 左心房 → 左心室 → 大動脈と流れて、全身へ送られます。',
        hint: '心房（入る部屋）→ 心室（送り出す部屋）の順だよ。',
      }),
      choice({
        id: 'body-mp7-p4', concept: 'bo-circulation',
        prompt: '血管の説明として、正しくないものはどれ？',
        options: ['動脈には、心臓から送り出される血液が流れる', '静脈には、心臓へもどる血液が流れる', '毛細血管は、髪の毛より細い', '動脈のかべは、静脈のかべよりうすい'],
        answer: 'd',
        explanation: '動脈は心臓から勢いよく送り出される血液が流れるので、かべがあつく弾力があります。静脈のかべは動脈よりうすく、ところどころに弁があります。',
        hint: '勢いの強い血液が流れる血管は、じょうぶなほうがいいね。',
      }),
      fill({
        id: 'body-mp7-p5', concept: 'bo-circulation',
        prompt: '血管の名前を入れよう。',
        text: '右心室から肺へ血液を送る血管を[b1]、肺から左心房へもどる血管を[b2]、左心室から全身へ血液を送る血管を[b3]という。',
        blanks: [
          word('b1', ['肺動脈', '肺静脈', '大動脈', '大静脈'], '肺動脈'),
          word('b2', ['肺動脈', '肺静脈', '大動脈', '大静脈'], '肺静脈'),
          word('b3', ['肺動脈', '肺静脈', '大動脈', '大静脈'], '大動脈'),
        ],
        explanation: '心臓から出る血管が動脈、心臓へもどる血管が静脈です。肺へ行くのが肺動脈、肺からもどるのが肺静脈、全身へ行くのが大動脈、全身からもどるのが大静脈です。',
        hint: '心臓から「出る」か「もどる」かで、動脈と静脈を決めよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp7-r1', concept: 'bo-circulation',
        prompt: '血液を顕微鏡で見たようすの模式図です（ア: 赤い円盤形の粒、イ: とても小さな粒、ウ: 大きく核のある粒、エ: 粒のまわりの液体）。出血したときに血液を固めるはたらきをするのはどれ？',
        figure: BLOOD_Q,
        answer: 'r2',
        explanation: '血液を固めるのは血小板（イ）です。血小板は、血液の固形の成分の中でいちばん小さい成分です。',
        hint: 'いちばん小さな粒だよ。',
      }),
      figureChoice({
        id: 'body-mp7-r2', concept: 'bo-circulation',
        prompt: '血液を顕微鏡で見たようすの模式図です（ア: 赤い円盤形の粒、イ: とても小さな粒、ウ: 大きく核のある粒、エ: 粒のまわりの液体）。養分や二酸化炭素などをとかして運ぶ液体の成分はどれ？',
        figure: BLOOD_Q,
        answer: 'r4',
        explanation: '養分や二酸化炭素、不要な物質をとかして運ぶのは、液体の血しょう（エ）です。',
        hint: '粒ではなく、液体の部分だよ。',
      }),
      figureChoice({
        id: 'body-mp7-r3', concept: 'bo-circulation',
        prompt: 'ヒトの心臓の 4 つの部屋を、正面から見た模式図です（図の左がからだの右。ア: 図の左上、イ: 図の左下、ウ: 図の右上、エ: 図の右下）。肺動脈へ血液を送り出す部屋はどれ？',
        figure: HEART_Q,
        answer: 'r2',
        explanation: '肺動脈へ血液を送り出すのは右心室（イ）です。右心房から入った血液は、右心室から肺へ送られます。',
        hint: '血液を送り出すのは「心室」だよ。',
      }),
    ],
  };

  // ---- ステージ body-mp8: 呼吸と排出（ミニプリント「呼吸」「排出のしくみ」） ----
  const bodyMp8 = {
    id: 'body-mp8', areaId: 'body-miniprint', title: 'プリント 8: 呼吸と排出', minutes: 5, concepts: ['bo-circulation'],
    lessons: [
      {
        id: 'body-mp8-c1',
        anim: 'bo-breath-path',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: '鼻や口から吸った空気は、**気管** → **気管支** → **肺胞**へ入ります。肺胞のまわりの毛細血管で、酸素が血液にとりこまれ、二酸化炭素が出されます。肺胞がたくさんあるので表面積が大きく、気体の交換を効率よく行えます。',
        figure: scene(lungItems().concat([
          { type: 'text', x: 174, y: 40, text: '気管', size: 13 },
          { type: 'text', x: 198, y: 100, text: '気管支', size: 13 },
          leader(256, 146, 238, 146),
          { type: 'text', x: 260, y: 151, text: '肺胞', size: 13 },
          leader(40, 204, 76, 176),
          { type: 'text', x: 6, y: 222, text: '毛細血管', size: 13 },
        ])),
      },
      {
        id: 'body-mp8-c2',
        text: 'タンパク質が分解されてできる有害な**アンモニア**は、血液で**肝臓**に運ばれ、害の少ない**尿素**に変えられます。尿素などは**じん臓**で血液からこし出されて尿になり、**輸尿管**を通って**ぼうこう**にためられます。',
        figure: scene([
          photo('body-mp8-c2'),
          tag(160, 16, '図の左がからだの右', { size: 13, anchor: 'middle' }),
          pin(52, 62, 108, 66), tag(30, 66, 'じん臓', { anchor: 'middle' }),
          pin(268, 62, 214, 62), tag(290, 66, 'じん臓', { anchor: 'middle' }),
          pin(84, 100, 150, 104), tag(4, 104, '大静脈（青）', { size: 13 }),
          pin(238, 104, 168, 104), tag(316, 108, '大動脈（赤）', { size: 13, anchor: 'end' }),
          pin(56, 136, 136, 136), tag(30, 140, '輸尿管', { anchor: 'middle' }),
          pin(260, 190, 180, 192), tag(290, 194, 'ぼうこう', { size: 13, anchor: 'middle' }),
          tag(160, 234, 'じん臓で尿素などをこし出す', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'body-mp8-w1', concept: 'bo-circulation',
      prompt: '予想しよう。吸う息とはく息では、二酸化炭素が多くふくまれているのはどちらだと思う？',
      options: ['はく息', '吸う息', 'どちらも同じ'],
      answer: 'a',
      explanation: '肺で血液中の二酸化炭素が出されるので、はく息のほうが二酸化炭素を多くふくみます。肺のつくりと、不要な物質を出すしくみを復習しよう。',
      hint: '肺では、何をとり入れて何を出していたかな。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp8-p1', concept: 'bo-circulation',
        prompt: '肺のつくりの模式図です（ア: いちばん上の太い管、イ: 枝分かれした管、ウ: 先にある小さなふくろの集まり。赤い線は毛細血管）。酸素と二酸化炭素の交換が行われるのはどれ？',
        figure: LUNG_Q,
        answer: 'r3',
        explanation: '気体の交換は、肺胞（ウ）とそのまわりの毛細血管とのあいだで行われます。アは気管、イは気管支です。',
        hint: '毛細血管がとり囲んでいる部分をさがそう。',
      }),
      fill({
        id: 'body-mp8-t1', concept: 'bo-circulation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '気管支の先にある小さなふくろを[b1]といい、そのまわりを[b2]がとり囲んでいる。',
        blanks: [
          word('b1', ['肺胞', '柔毛', '気孔'], '肺胞'),
          word('b2', ['毛細血管', 'リンパ管', '神経'], '毛細血管'),
        ],
        explanation: '小さなふくろが**肺胞**で、まわりを**毛細血管**がとり囲んでいます。肺胞の中の空気と毛細血管の血液のあいだで、酸素と二酸化炭素が交換されます。',
        hint: '小腸の柔毛と同じように、表面積を大きくするつくりだよ。',
      }),
      choice({
        id: 'body-mp8-p2', concept: 'bo-circulation',
        prompt: '肺胞から毛細血管の血液へ移る気体と、毛細血管の血液から肺胞へ出される気体の組み合わせはどれ？',
        options: ['肺胞 → 血液: 酸素、血液 → 肺胞: 二酸化炭素', '肺胞 → 血液: 二酸化炭素、血液 → 肺胞: 酸素', 'どちらも酸素'],
        answer: 'a',
        explanation: '吸った空気の酸素は肺胞から血液にとりこまれ、全身から運ばれてきた二酸化炭素は血液から肺胞へ出されて、はく息とともに出ていきます。',
        hint: 'はく息に多くふくまれている気体を思い出そう。',
      }),
      figureChoice({
        id: 'body-mp8-p3', concept: 'bo-circulation',
        prompt: 'ヒトの排出にかかわる器官（人体模型の写真。図の左がからだの右）です（ア: 左右に 1 つずつある器官、イ: 下にあるふくろ、ウ: アとイをつなぐ管）。血液中から尿素などの不要な物質をこし出すのはどれ？',
        figure: KIDNEY_Q,
        answer: 'r1',
        explanation: '血液中から尿素などをこし出して尿をつくるのは、じん臓（ア）です。尿は輸尿管（ウ）を通ってぼうこう（イ）にためられます。',
        hint: '血管がつながっている器官だよ。',
      }),
      fill({
        id: 'body-mp8-p4', concept: 'bo-circulation',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'タンパク質が分解してできた有害な[b1]は、血液で[b2]に運ばれ、害の少ない[b3]に変えられる。',
        blanks: [
          word('b1', ['アンモニア', '二酸化炭素', 'ブドウ糖'], 'アンモニア'),
          word('b2', ['肝臓', 'じん臓', 'すい臓'], '肝臓'),
          word('b3', ['尿素', '尿', '胆汁'], '尿素'),
        ],
        explanation: 'アンモニアは肝臓で尿素に変えられます。尿素はじん臓で血液からこし出され、尿として体外へ出されます。',
        hint: '尿素をつくるのと、こし出すのは別の器官だよ。',
      }),
      choice({
        id: 'body-mp8-p5', concept: 'bo-circulation',
        prompt: 'じん臓でつくられた尿は、どこを通ってぼうこうにためられる？',
        options: ['輸尿管', '気管', '大動脈'],
        answer: 'a',
        explanation: '尿はじん臓から輸尿管を通ってぼうこうに運ばれ、ためられてから体外へ出されます。',
        hint: '尿を「輸（運）」ぶ管だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp8-r1', concept: 'bo-circulation',
        prompt: 'ヒトの排出にかかわる器官（人体模型の写真。図の左がからだの右）です（ア: 左右に 1 つずつある器官、イ: 下にあるふくろ、ウ: アとイをつなぐ管）。尿を一時ためておくのはどれ？',
        figure: KIDNEY_Q,
        answer: 'r2',
        explanation: '尿を一時ためておくのはぼうこう（イ）です。アはじん臓、ウは輸尿管です。',
        hint: 'ふくろの形をした器官だよ。',
      }),
      figureChoice({
        id: 'body-mp8-r2', concept: 'bo-circulation',
        prompt: '肺のつくりの模式図です（ア: いちばん上の太い管、イ: 枝分かれした管、ウ: 先にある小さなふくろの集まり。赤い線は毛細血管）。鼻や口から吸った空気が最初に通る太い管はどれ？',
        figure: LUNG_Q,
        answer: 'r1',
        explanation: '吸った空気は気管（ア）を通り、枝分かれした気管支（イ）を通って肺胞（ウ）に入ります。',
        hint: '枝分かれする前の管だよ。',
      }),
      choice({
        id: 'body-mp8-r3', concept: 'bo-circulation',
        prompt: '肺には筋肉がありません。肺に空気が出入りするのは、何の動きによる？',
        options: ['横隔膜とろっ骨の動き', '肺の筋肉の動き', '心臓の拍動'],
        answer: 'a',
        explanation: '横隔膜が下がり、ろっ骨が上がると胸の中が広がって空気が肺に入ります。逆に動くと空気が出ていきます。',
        hint: '胸とおなかのさかいにある膜を思い出そう。',
      }),
    ],
  };

  // ---- ステージ body-mp9: 感覚器官（ミニプリント「目のしくみ」「耳の仕組み」「鼻、舌、皮膚のしくみ」「感覚器官と動物の目」） ----
  const bodyMp9 = {
    id: 'body-mp9', areaId: 'body-miniprint', title: 'プリント 9: 感覚器官', minutes: 5, concepts: ['bo-sense'],
    lessons: [
      {
        id: 'body-mp9-c1',
        text: '目では、**レンズ**（水晶体）で光が屈折し、**網膜**に像を結びます。網膜の細胞が受けとった刺激は、視神経で脳へ伝わります。**虹彩**はひとみの大きさを変えて、目に入る光の量を調節します。',
        // 写真: 目の模型を横から半分に切った断面。左が前で、透明なふくらんだレンズ (103, 125)、そのすぐ外の茶色の虹彩 (115, 90〜170)、
        // 奥の内側を赤い網膜がおおい、右から黄色の視神経 (215〜245, 120〜150) が出る。上と下は白い余白
        figure: scene([
          photo('body-mp9-c1'),
          { type: 'arrow', x1: 4, y1: 126, x2: 58, y2: 126, color: 'orange' },
          tag(22, 112, '光', { size: 14, anchor: 'middle', bold: true }),
          pin(100, 36, 103, 110), tag(100, 30, 'レンズ（水晶体）', { size: 13, anchor: 'middle' }),
          pin(84, 196, 114, 160), tag(76, 212, '虹彩', { size: 13, anchor: 'middle' }),
          pin(214, 36, 196, 84), tag(222, 30, '網膜', { size: 13, anchor: 'middle' }),
          pin(270, 108, 240, 130), tag(286, 102, '視神経', { size: 13, anchor: 'middle' }),
          tag(160, 234, '網膜に像を結ぶ → 視神経で脳へ', { size: 13, anchor: 'middle' }),
        ]),
      },
      {
        id: 'body-mp9-c2',
        text: '耳では、音で**鼓膜**が振動し、**耳小骨**を通って**うずまき管**に伝わり、そこの細胞が音の刺激を受けとります。**半規管**はからだの傾きや回転を感じます。鼻はにおい、舌は味、皮ふは圧力・温度・痛みを受けとります。',
        // 写真: 耳の模型の断面。左に耳（耳の穴 65〜140, 105〜145）、その奥に鼓膜 (143, 125)、耳小骨 3 つ (155〜205, 95〜130)、
        // かたつむりの形のうずまき管 (255, 130)、3 つの輪の半規管 (197〜250, 50〜100)。上と下は白い余白
        figure: scene([
          photo('body-mp9-c2'),
          pin(124, 30, 143, 116), tag(120, 24, '鼓膜', { size: 13, anchor: 'middle' }),
          pin(180, 30, 172, 102), tag(180, 24, '耳小骨', { size: 13, anchor: 'middle' }),
          pin(240, 30, 222, 62), tag(244, 24, '半規管', { size: 13, anchor: 'middle' }),
          pin(268, 200, 258, 152), tag(270, 212, 'うずまき管', { size: 13, anchor: 'middle' }),
          tag(116, 216, '音 → 鼓膜が振動 → 耳小骨', { size: 13, anchor: 'middle' }),
          tag(116, 234, '→ うずまき管で受けとる', { size: 13, anchor: 'middle' }),
          tag(316, 234, '半規管: 傾き・回転', { size: 13, anchor: 'end' }),
        ]),
      },
      {
        id: 'body-mp9-c3',
        text: '外界の刺激を受けとる器官を**感覚器官**といいます。シマウマのような草食動物は目が顔の横につき、広い範囲を見わたせます。ライオンのような肉食動物は目が前向きで、立体的に見える範囲が広く、えものとの距離をつかみやすいです。',
        // 写真（animals-4-c3 の画像。ほかの単元の画像なので src を直接書く）: ライオンの顔 (0〜165, 0〜185。目 (62, 79)・(108, 79) が前に並ぶ)と
        // シマウマの顔 (195〜315, 5〜185。目 (220, 80)・(278, 80) が横につく)。下は白い余白。青い楕円と矢印は目の向き（animals-4-c3 と同じ）
        figure: scene([
          { type: 'image', src: 'assets/images/animals/animals-4-c3.jpg' },
          { type: 'ellipse', x: 86, y: 78, rx: 34, ry: 12, fill: 'none', stroke: 'blue' },
          { type: 'arrow', x1: 212, y1: 81, x2: 190, y2: 81, color: 'blue', width: 2 },
          { type: 'arrow', x1: 286, y1: 81, x2: 310, y2: 81, color: 'blue', width: 2 },
          tag(82, 201, '肉食動物（ライオン）', { size: 13, anchor: 'middle', bold: true }),
          tag(82, 218, '目が前向き', { size: 13, anchor: 'middle' }),
          tag(82, 235, '立体的に見える範囲が広い', { size: 13, anchor: 'middle' }),
          tag(252, 201, '草食動物（シマウマ）', { size: 13, anchor: 'middle', bold: true }),
          tag(252, 218, '目が横向き', { size: 13, anchor: 'middle' }),
          tag(252, 235, '広い範囲を見わたせる', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'body-mp9-w1', concept: 'bo-sense',
      prompt: '予想しよう。明るい所から暗い所に入ると、ひとみの大きさはどうなると思う？',
      options: ['大きくなる', '小さくなる', '変わらない'],
      answer: 'a',
      explanation: '暗い所では、虹彩がはたらいてひとみが大きくなり、目に入る光の量を増やします。目や耳などの感覚器官のつくりを復習しよう。',
      hint: '光を多くとり入れたいのは、明るい所と暗い所のどちらかな。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp9-p1', concept: 'bo-sense',
        prompt: 'ヒトの目の断面の模式図です（左から光が入る。ア: 光を屈折させるふくらんだ部分、イ: ひとみのまわりの茶色の部分、ウ: いちばん奥の赤い膜、エ: 奥から出る黄色の太い線）。光の刺激を受けとる細胞があるのはどれ？',
        figure: EYE_Q,
        answer: 'r3',
        explanation: '光の刺激を受けとる細胞があるのは、網膜（ウ）です。アはレンズ、イは虹彩、エは視神経です。',
        hint: 'レンズを通った光が像を結ぶところだよ。',
      }),
      fill({
        id: 'body-mp9-t1', concept: 'bo-sense', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '目・耳・鼻・舌・皮ふのように、外界からの刺激を受けとる器官を[b1]という。',
        blanks: [word('b1', ['感覚器官', '消化器官', '中枢神経'], '感覚器官')],
        explanation: '刺激を受けとる器官を**感覚器官**といいます。感覚器官には、それぞれ決まった刺激を受けとる細胞があります。',
        hint: '刺激を「感じる」器官だよ。',
      }),
      choice({
        id: 'body-mp9-p2', concept: 'bo-sense',
        prompt: '近くの物を見るとき、目はどのようにピントを合わせる？',
        options: ['レンズを厚くする', 'レンズをうすくする', '網膜を前に動かす'],
        answer: 'a',
        explanation: 'レンズのまわりの筋肉がはたらいて、近くを見るときはレンズを厚くし、遠くを見るときはレンズをうすくして、網膜に像を結ばせます。',
        hint: '近くの物ほど、光を大きく曲げる必要があるよ。',
      }),
      figureChoice({
        id: 'body-mp9-p3', concept: 'bo-sense',
        prompt: 'ヒトの耳のつくりの模式図です（ア: 耳の穴のおくのうすい膜、イ: 膜につながる小さな骨、ウ: かたつむりのようなうず巻き、エ: 輪が 3 つ組み合わさった部分）。音の刺激を受けとる細胞があるのはどれ？',
        figure: EAR_Q,
        answer: 'r3',
        explanation: '音の刺激を受けとる細胞があるのは、うずまき管（ウ）です。アは鼓膜、イは耳小骨、エは半規管です。',
        hint: '鼓膜の振動は、耳小骨を通ってどこへ伝わるかな。',
      }),
      choice({
        id: 'body-mp9-p4', concept: 'bo-sense',
        prompt: '皮ふは圧力の刺激を受けとります。圧力のほかに皮ふが受けとる刺激の組み合わせはどれ？',
        options: ['温度と痛み', '音と光', 'においと味'],
        answer: 'a',
        explanation: '皮ふには、ふれる・おす（圧力）、あたたかい・冷たい（温度）、痛みを受けとるところがあります。',
        hint: '熱いものにふれたときに感じることを思い出そう。',
      }),
      choice({
        id: 'body-mp9-p5', concept: 'bo-sense',
        prompt: 'シマウマのように目が顔の横についていると、どんな点で生きるのに有利？',
        options: ['広い範囲を見わたせて、敵を早く見つけやすい', '物を立体的に見て、距離をつかみやすい', '暗い所でもよく見える'],
        answer: 'a',
        explanation: '目が横についていると、見える範囲が広く、後ろのほうまで見わたせます。肉食動物に早く気づいてにげるのに役立ちます。',
        hint: '草食動物は、おそわれないことが大切だね。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp9-r1', concept: 'bo-sense',
        prompt: 'ヒトの目の断面の模式図です（左から光が入る。ア: 光を屈折させるふくらんだ部分、イ: ひとみのまわりの茶色の部分、ウ: いちばん奥の赤い膜、エ: 奥から出る黄色の太い線）。ひとみの大きさを変えて、目に入る光の量を調節するのはどれ？',
        figure: EYE_Q,
        answer: 'r2',
        explanation: 'ひとみの大きさを変えるのは虹彩（イ）です。明るい所ではひとみを小さく、暗い所では大きくします。',
        hint: 'ひとみのまわりにある部分だよ。',
      }),
      figureChoice({
        id: 'body-mp9-r2', concept: 'bo-sense',
        prompt: 'ヒトの耳のつくりの模式図です（ア: 耳の穴のおくのうすい膜、イ: 膜につながる小さな骨、ウ: かたつむりのようなうず巻き、エ: 輪が 3 つ組み合わさった部分）。音を受けて最初に振動するのはどれ？',
        figure: EAR_Q,
        answer: 'r1',
        explanation: '音は空気の振動で、まず鼓膜（ア）を振動させます。その振動が耳小骨（イ）からうずまき管（ウ）へ伝わります。',
        hint: '耳の穴のいちばん奥にある膜だよ。',
      }),
      choice({
        id: 'body-mp9-r3', concept: 'bo-sense',
        prompt: '耳が、音のほかに感じとっているものはどれ？',
        options: ['からだの傾きや回転', 'におい', '温度'],
        answer: 'a',
        explanation: '耳の半規管などは、からだの傾きや回転を感じとり、からだのつり合いを保つのに役立っています。',
        hint: 'くるくる回ると目が回るのは、耳と関係があるよ。',
      }),
      choice({
        id: 'body-mp9-r4', concept: 'bo-sense',
        prompt: '遠くの物を見るとき、目はどのようにピントを合わせる？',
        options: ['レンズをうすくする', 'レンズを厚くする', 'ひとみを閉じる'],
        answer: 'a',
        explanation: '遠くを見るときはレンズをうすくして、光の曲がり方を小さくし、網膜に像を結ばせます。',
        hint: '近くを見るときと、反対の動きだよ。',
      }),
      fill({
        id: 'body-mp9-r5', concept: 'bo-sense',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '鼻のおくの細胞は空気中の[b1]の刺激を、舌の細胞は[b2]の刺激を受けとる。',
        blanks: [
          word('b1', ['におい', '味', '音'], 'におい'),
          word('b2', ['味', 'におい', '光'], '味'),
        ],
        explanation: '鼻はにおい、舌は味の刺激を受けとる感覚器官です。かぜで鼻がつまると味が分かりにくくなるのは、においも味の感じ方に関係しているからです。',
        hint: '鼻と舌で感じるものを考えよう。',
      }),
      choice({
        id: 'body-mp9-r6', concept: 'bo-sense',
        prompt: 'ライオンのように目が顔の前についていると、どんな点で有利？',
        options: ['物が立体的に見えて、えものとの距離をつかみやすい', '後ろまで見わたせる', 'においがよく分かる'],
        answer: 'a',
        explanation: '両目で見える範囲が重なるところでは、物が立体的に見え、距離がつかみやすくなります。えものをとらえる肉食動物に役立ちます。',
        hint: '両目で見える範囲が重なると、何が分かりやすくなるかな。',
      }),
    ],
  };

  // ---- ステージ body-mp10: 刺激と反応・反射（ミニプリント「刺激と反応」「反射」） ----
  const bodyMp10 = {
    id: 'body-mp10', areaId: 'body-miniprint', title: 'プリント 10: 刺激と反応・反射', minutes: 5, concepts: ['bo-nerve'],
    lessons: [
      {
        id: 'body-mp10-c1',
        anim: 'bo-reflex',   // 動く図の使い回し（js/anim-bio.js）。figure は静止図として残す
        text: '脳と脊髄を**中枢神経**、そこから枝分かれして全身に広がる神経を**末しょう神経**といいます。刺激の信号は**感覚神経**で中枢神経へ、中枢神経からの命令は**運動神経**で筋肉へ伝わります。',
        figure: scene(nerveItems(true).concat([
          { type: 'text', x: 108, y: 40, text: '脳', size: 13 },
          { type: 'text', x: 76, y: 214, text: '脊髄', size: 13 },
          { type: 'text', x: 92, y: 94, text: '運動神経', size: 13 },
          { type: 'text', x: 216, y: 82, text: '筋肉', size: 13 },
          { type: 'text', x: 128, y: 200, text: '感覚神経', size: 13 },
          { type: 'text', x: 284, y: 132, text: '皮ふ', size: 13, anchor: 'middle' },
          { type: 'text', x: 316, y: 236, text: '脳と脊髄 ＝ 中枢神経', size: 12, anchor: 'end' },
        ])),
      },
      {
        id: 'body-mp10-c2',
        text: '熱いものにふれて、熱いと感じる前に手を引っこめるように、意識と関係なく起こる反応を**反射**といいます。命令が脳ではなく脊髄から出るので、刺激を受けてから反応するまでの時間が短く、からだを危険から守るのに役立ちます。',
        // 刺激を受けてから反応するまでの時間のくらべ
        figure: scene([
          { type: 'text', x: 160, y: 28, text: '刺激を受けてから反応するまでの時間', size: 13, anchor: 'middle' },
          { type: 'text', x: 8, y: 80, text: '反射', size: 14, bold: true },
          { type: 'rect', x: 90, y: 60, width: 70, height: 30, fill: 'blue', stroke: 'none' },
          { type: 'text', x: 168, y: 80, text: '短い', size: 13 },
          { type: 'text', x: 8, y: 146, text: '考えて', size: 14, bold: true },
          { type: 'text', x: 8, y: 164, text: '動く', size: 14, bold: true },
          { type: 'rect', x: 90, y: 136, width: 200, height: 30, fill: 'orange', stroke: 'none' },
          { type: 'text', x: 160, y: 200, text: '反射: 皮ふ → 脊髄 → 筋肉（脳を通らない）', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '考えて動く: 皮ふ → 脊髄 → 脳 → 脊髄 → 筋肉', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'body-mp10-w1', concept: 'bo-nerve',
      prompt: '予想しよう。目の前に急にボールが飛んできて思わず目を閉じるのは、考えてから閉じていると思う？',
      options: ['考える前に、からだが反応している', 'よく考えてから閉じている', 'わざと閉じている'],
      answer: 'a',
      explanation: '思わず目を閉じるのは、意識と関係なく起こる反応（反射）です。刺激が伝わる道すじと、反射のしくみを復習しよう。',
      hint: '「思わず」というのがヒントだよ。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp10-p1', concept: 'bo-nerve',
        prompt: '刺激が伝わる道すじの模式図です（ア: 頭の中の器官、イ: 背骨の中を通る太い神経、ウ: 手の皮ふ、エ: うでの筋肉。青い線と橙の線は神経）。意識して手を動かすとき、筋肉への命令を出すのはどこ？',
        figure: NERVE_Q,
        answer: 'r1',
        explanation: '意識して手を動かすときは、脳（ア）が判断して命令を出します。命令は脊髄（イ）から運動神経を通って筋肉（エ）へ伝わります。',
        hint: '考えたり判断したりするのはどこかな。',
      }),
      fill({
        id: 'body-mp10-t1', concept: 'bo-nerve', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '刺激に対して、意識とは関係なく決まった反応が起こることを[b1]という。',
        blanks: [word('b1', ['反射', '消化', '蒸散'], '反射')],
        explanation: '意識と関係なく起こる反応を**反射**といいます。熱いものから手を引っこめる、明るい所でひとみが小さくなる、などが反射の例です。',
        hint: '「はんしゃ」と読む言葉だよ。',
      }),
      choice({
        id: 'body-mp10-p2', concept: 'bo-nerve',
        prompt: '信号が青に変わったのを見て、歩き出しました。このときの信号の伝わり方として正しいものはどれ？',
        options: ['目 → 感覚神経 → 脳 → 脊髄 → 運動神経 → 足の筋肉', '目 → 運動神経 → 脳 → 感覚神経 → 足の筋肉', '目 → 感覚神経 → 脊髄 → 運動神経 → 足の筋肉（脳を通らない）'],
        answer: 'a',
        explanation: '目で受けとった刺激は感覚神経で脳へ伝わります。脳が「歩こう」と判断し、その命令が脊髄から運動神経を通って足の筋肉へ伝わります。',
        hint: '見て判断する反応なので、脳を通るよ。',
      }),
      choice({
        id: 'body-mp10-p3', concept: 'bo-nerve',
        prompt: '熱いものにふれて思わず手を引っこめる反射で、信号が伝わる順として正しいものはどれ？',
        options: ['皮ふ → 感覚神経 → 脊髄 → 運動神経 → 筋肉', '皮ふ → 感覚神経 → 脳 → 運動神経 → 筋肉', '皮ふ → 運動神経 → 脊髄 → 感覚神経 → 筋肉'],
        answer: 'a',
        explanation: 'この反射では、信号が脊髄に伝わると、脳を通らずに脊髄から運動神経へ命令が出ます。そのため、熱いと感じるより先に手が動きます。',
        hint: '反射の命令は、脳ではなくどこから出たかな。',
      }),
      choice({
        id: 'body-mp10-p4', concept: 'bo-nerve',
        prompt: '反射は、わたしたちにとってどんなことに役立っている？',
        options: ['危険からすばやくからだを守る', 'よく考えて正しく判断する', '筋肉を大きくする'],
        answer: 'a',
        explanation: '反射は刺激を受けてから反応するまでの時間が短いので、やけどやけがなどの危険から、からだをすばやく守るのに役立ちます。',
        hint: '反射のいちばんの特徴は、反応の速さだよ。',
      }),
      fill({
        id: 'body-mp10-p5', concept: 'bo-nerve',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '脳と脊髄をまとめて[b1]といい、そこから出て全身に広がる感覚神経や運動神経を[b2]という。',
        blanks: [
          word('b1', ['中枢神経', '末しょう神経', '運動神経'], '中枢神経'),
          word('b2', ['中枢神経', '末しょう神経', '運動神経'], '末しょう神経'),
        ],
        explanation: '脳と脊髄は中枢神経、そこから枝分かれした感覚神経や運動神経は末しょう神経です。',
        hint: '「中枢」は中心、「末しょう」は先のほうという意味だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp10-r1', concept: 'bo-nerve',
        prompt: '刺激が伝わる道すじの模式図です（ア: 頭の中の器官、イ: 背骨の中を通る太い神経、ウ: 手の皮ふ、エ: うでの筋肉。青い線と橙の線は神経）。反射のとき、感覚神経からの信号を受けて、脳を通らずに命令を出すのはどこ？',
        figure: NERVE_Q,
        answer: 'r2',
        explanation: '反射では、脊髄（イ）が直接命令を出します。信号は脊髄から脳へも伝わるので、手を引っこめたあとで「熱い」と感じます。',
        hint: '背骨の中を通る中枢神経だよ。',
      }),
      choice({
        id: 'body-mp10-r2', concept: 'bo-nerve',
        prompt: '次のうち、反射の例はどれ？',
        options: ['明るい所に出ると、ひとみが小さくなる', '友だちによばれて、ふり向く', 'ボールを見て、バットをふる'],
        answer: 'a',
        explanation: 'ひとみの大きさが変わるのは、意識と関係なく起こる反射です。よばれてふり向く、ボールを見てバットをふるのは、脳で判断してから起こる反応です。',
        hint: '自分では止められない反応をさがそう。',
      }),
      choice({
        id: 'body-mp10-r3', concept: 'bo-nerve',
        prompt: '刺激を受けてから反応するまでの時間が短いのはどちら？',
        options: ['反射', '意識して起こす反応', 'どちらも同じ'],
        answer: 'a',
        explanation: '反射は、信号が脳まで行って判断されるのを待たずに、脊髄などから命令が出るので、反応までの時間が短くなります。',
        hint: '信号の通り道が短いのはどちらかな。',
      }),
    ],
  };

  // ---- ステージ body-mp11: 骨格と筋肉・動物の分類（ミニプリント「骨格と筋肉」「セキツイ動物分類基準」） ----
  const bodyMp11 = {
    id: 'body-mp11', areaId: 'body-miniprint', title: 'プリント 11: 骨格と筋肉・動物の分類', minutes: 5, concepts: ['bo-movement', 'bo-vertebrate'],
    lessons: [
      {
        id: 'body-mp11-c1',
        anim: 'bo-arm-bend',   // 動く図（js/anim-bio.js）。figure は静止図として残す
        text: 'ヒトのからだは、約 200 個の骨が組み合わさった**骨格**で支えられています。骨と骨のつなぎ目で曲がるところを**関節**、筋肉が骨についている部分を**けん**といいます。うでを曲げるときは、内側の筋肉が縮み、外側の筋肉がゆるみます。',
        figure: scene(armItems().concat([
          { type: 'text', x: 22, y: 100, text: 'けん', size: 13 },
          { type: 'text', x: 170, y: 160, text: '関節', size: 13, anchor: 'middle' },
          { type: 'text', x: 100, y: 86, text: '縮む（内側の筋肉）', size: 12, anchor: 'middle' },
          { type: 'text', x: 100, y: 186, text: 'ゆるむ（外側の筋肉）', size: 12, anchor: 'middle' },
          { type: 'text', x: 316, y: 236, text: 'うでを曲げたとき', size: 12, anchor: 'end' },
        ])),
      },
      {
        id: 'body-mp11-c2',
        text: 'セキツイ動物は、魚類・両生類・ハチュウ類・鳥類・ホニュウ類に分けられます。分ける基準には、子のうまれ方（**胎生**か**卵生**か）、呼吸のしかた、卵に殻があるか、体温が変わるか（**恒温動物**か**変温動物**か）などがあります。',
        // 写真（animals-1-c2 の画像。ほかの単元の画像なので src を直接書く）: 上段 メダカ (52, 48)・トノサマガエル (155, 48)・
        // ニホントカゲ (262, 55)、下段 ハト (80, 160)・柴犬 (240, 155)。上と、上段と下段のあいだは白い余白
        figure: scene([
          { type: 'image', src: 'assets/images/animals/animals-1-c2.jpg' },
          tag(160, 18, '魚類〜鳥類は卵生、ホニュウ類だけ胎生', { size: 13, anchor: 'middle' }),
          tag(54, 90, '魚類', { anchor: 'middle', bold: true }),
          tag(160, 90, '両生類', { anchor: 'middle', bold: true }),
          tag(250, 90, 'ハチュウ類', { anchor: 'middle', bold: true }),
          tag(80, 218, '鳥類', { anchor: 'middle', bold: true }),
          tag(240, 218, 'ホニュウ類', { anchor: 'middle', bold: true }),
          tag(160, 237, '体温が一定 → 恒温動物（鳥類・ホニュウ類）', { size: 13, anchor: 'middle' }),
        ]),
      },
    ],
    warmup: choice({
      id: 'body-mp11-w1', concept: 'bo-movement',
      prompt: '予想しよう。うでを曲げるとき、うでの内側の筋肉はどうなると思う？',
      options: ['縮む', 'のびる', '変わらない'],
      answer: 'a',
      explanation: 'うでを曲げると、内側の筋肉が縮んで、かたくもり上がります。骨と筋肉のしくみと、動物のなかま分けを復習しよう。',
      hint: '力こぶをつくったときの筋肉を思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'body-mp11-p1', concept: 'bo-movement',
        prompt: 'ヒトのうでの骨と筋肉の模式図です（左がかた。ア: 筋肉のはしの細い部分、イ: 2 本の骨のつなぎ目、ウ: 内側の筋肉、エ: 外側の筋肉）。うでを曲げるときに縮む筋肉はどれ？',
        figure: ARM_Q,
        answer: 'r3',
        explanation: 'うでを曲げるときは、内側の筋肉（ウ）が縮み、外側の筋肉（エ）がゆるみます。筋肉は自分で縮むことはできても、のびることはできないので、2 つの筋肉が組になってはたらきます。',
        hint: '曲げる側（内側）の筋肉が、骨を引っぱるよ。',
      }),
      fill({
        id: 'body-mp11-t1', concept: 'bo-movement', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '骨と骨のつなぎ目で曲がるところを[b1]、筋肉の両はしで骨についている部分を[b2]という。',
        blanks: [
          word('b1', ['関節', 'けん', '骨格'], '関節'),
          word('b2', ['関節', 'けん', '骨格'], 'けん'),
        ],
        explanation: '曲がるつなぎ目が**関節**、筋肉が骨につく部分が**けん**です。筋肉は関節をまたいで 2 つの骨についているので、縮むと関節で曲がります。',
        hint: 'アキレスけんは、足の筋肉と骨をつないでいるよ。',
      }),
      choice({
        id: 'body-mp11-p2', concept: 'bo-movement',
        prompt: 'ヒトのからだの骨は、全部でおよそ何個ある？',
        options: ['約 20 個', '約 200 個', '約 2000 個'],
        answer: 'b',
        explanation: 'ヒトの骨は約 200 個あり、組み合わさって骨格をつくっています。骨格はからだを支え、脳や内臓を守り、筋肉とともにからだを動かします。',
        hint: '手や足の指にも、それぞれ小さな骨がたくさんあるよ。',
      }),
      choice({
        id: 'body-mp11-p3', concept: 'bo-vertebrate',
        prompt: 'セキツイ動物を「ホニュウ類」と「それ以外の 4 つのなかま」に分けました。何を基準にして分けた？',
        options: ['子のうまれ方（胎生か卵生か）', '背骨があるかどうか', 'すむ場所（水中か陸上か）'],
        answer: 'a',
        explanation: 'ホニュウ類は、子が母親の体内である程度育ってからうまれる胎生です。ほかの 4 つのなかまは、卵をうむ卵生です。背骨はどのセキツイ動物にもあります。',
        hint: 'ホニュウ類だけがもつ特徴を考えよう。',
      }),
      choice({
        id: 'body-mp11-p4', concept: 'bo-vertebrate',
        prompt: '卵をうむセキツイ動物を「魚類・両生類」と「ハチュウ類・鳥類」に分けました。何を基準にして分けた？',
        options: ['卵に殻があるかどうか', '背骨があるかどうか', '子を乳で育てるかどうか'],
        answer: 'a',
        explanation: '魚類・両生類は殻のない卵を水中にうみ、ハチュウ類・鳥類は殻のある卵を陸上にうみます。殻があると、卵がかわきにくくなります。',
        hint: 'カエルの卵とニワトリの卵のちがいを考えよう。',
      }),
      choice({
        id: 'body-mp11-p5', concept: 'bo-vertebrate',
        prompt: 'セキツイ動物を「鳥類・ホニュウ類」と「魚類・両生類・ハチュウ類」に分けました。何を基準にして分けた？',
        options: ['まわりの温度が変わっても体温がほぼ一定かどうか', 'えらで呼吸するかどうか', '卵をうむかどうか'],
        answer: 'a',
        explanation: '鳥類とホニュウ類は、体温がほぼ一定に保たれる恒温動物です。魚類・両生類・ハチュウ類は、まわりの温度によって体温が変わる変温動物です。',
        hint: '冬になると動かなくなるなかまはどれかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'body-mp11-r1', concept: 'bo-movement',
        prompt: 'ヒトのうでの骨と筋肉の模式図です（左がかた。ア: 筋肉のはしの細い部分、イ: 2 本の骨のつなぎ目、ウ: 内側の筋肉、エ: 外側の筋肉）。曲げたうでをのばすときに縮む筋肉はどれ？',
        figure: ARM_Q,
        answer: 'r4',
        explanation: 'うでをのばすときは、外側の筋肉（エ）が縮み、内側の筋肉（ウ）がゆるみます。曲げるときと反対の筋肉がはたらきます。',
        hint: '曲げるときに縮んだ筋肉とは、反対側だよ。',
      }),
      figureChoice({
        id: 'body-mp11-r2', concept: 'bo-movement',
        prompt: 'ヒトのうでの骨と筋肉の模式図です（左がかた。ア: 筋肉のはしの細い部分、イ: 2 本の骨のつなぎ目、ウ: 内側の筋肉、エ: 外側の筋肉）。筋肉が骨についている部分（けん）はどれ？',
        figure: ARM_Q,
        answer: 'r1',
        explanation: '筋肉のはしの細い部分（ア）がけんで、骨についています。イは関節です。',
        hint: '筋肉のはしをさがそう。',
      }),
      choice({
        id: 'body-mp11-r3', concept: 'bo-movement',
        prompt: 'うでを曲げるとき、外側の筋肉はどうなる？',
        options: ['ゆるむ', '縮む', 'かたくなって骨になる'],
        answer: 'a',
        explanation: 'うでを曲げるとき、内側の筋肉が縮み、外側の筋肉はゆるみます。2 つの筋肉が反対のはたらきをすることで、関節を曲げたりのばしたりできます。',
        hint: '内側と外側の筋肉は、反対のはたらきをするよ。',
      }),
      choice({
        id: 'body-mp11-r4', concept: 'bo-vertebrate',
        prompt: '一生えらで呼吸するセキツイ動物のなかまはどれ？',
        options: ['魚類', '両生類', 'ハチュウ類'],
        answer: 'a',
        explanation: '魚類は一生えらで呼吸します。両生類は、子はえらと皮ふ、親は肺と皮ふで呼吸します。ハチュウ類は肺で呼吸します。',
        hint: '水の中だけでくらすなかまだよ。',
      }),
      choice({
        id: 'body-mp11-r5', concept: 'bo-vertebrate',
        prompt: 'からだの表面が羽毛でおおわれているセキツイ動物のなかまはどれ？',
        options: ['鳥類', 'ハチュウ類', 'ホニュウ類'],
        answer: 'a',
        explanation: '鳥類のからだは羽毛でおおわれています。ハチュウ類はうろこ、ホニュウ類は毛でおおわれています。体表のようすも、なかま分けの基準になります。',
        hint: '空を飛ぶなかまだよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================
  const concepts = [
    {
      id: 'bo-cell', title: '細胞のつくり', basic: null, lessonStageId: 'body-1',
      checkPool: [
        choice({
          id: 'bo-cell-k1', concept: 'bo-cell',
          prompt: 'ゾウリムシのように、からだが 1 つの細胞でできている生物を何という？',
          options: ['単細胞生物', '多細胞生物', '器官'],
          answer: 'a',
          explanation: 'からだが 1 つの細胞でできている生物を単細胞生物といいます。ゾウリムシやミカヅキモがその例です。',
          hint: '「単」は 1 つという意味だよ。',
        }),
        fill({
          id: 'bo-cell-k2', concept: 'bo-cell',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '胃や小腸、植物の葉のように、いくつかの組織が集まって特定のはたらきをする部分を[b1]という。',
          blanks: [word('b1', ['器官', '組織', '細胞'], '器官')],
          explanation: 'いくつかの組織が集まって特定のはたらきをする部分を器官といいます。器官が集まって個体ができます。',
          hint: '細胞 → 組織 → ？ → 個体 の順だったね。',
        }),
        choice({
          id: 'bo-cell-k3', concept: 'bo-cell',
          prompt: '植物の細胞にあって、動物の細胞にはないものの組み合わせはどれ？',
          options: ['細胞壁と葉緑体', '核と細胞膜', '核と細胞壁'],
          answer: 'a',
          explanation: '細胞壁と葉緑体は植物の細胞だけにあります。核と細胞膜は、植物と動物のどちらの細胞にもあります。',
          hint: '光合成やからだを支えることに関係するものだよ。',
        }),
      ],
    },
    {
      id: 'bo-photosynthesis', title: '光合成と呼吸の実験', basic: 'bo-cell', lessonStageId: 'body-2',
      checkPool: [
        choice({
          id: 'bo-photosynthesis-k1', concept: 'bo-photosynthesis',
          prompt: '光合成が行われるのは、細胞の中のどこ？',
          options: ['葉緑体', '核', '液胞'],
          answer: 'a',
          explanation: '光合成は、細胞の中の葉緑体で行われます。葉緑体は、植物の緑色の部分の細胞にあります。',
          hint: '緑色の小さな粒だよ。',
        }),
        fill({
          id: 'bo-photosynthesis-k2', concept: 'bo-photosynthesis',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'ヨウ素液は、デンプンがあると[b1]色に変わる。',
          blanks: [word('b1', ['青紫', '赤褐', '白'], '青紫')],
          explanation: 'ヨウ素液はデンプンがあると青紫色になります。光合成でデンプンができたかを調べるのに使います。',
          hint: 'ふ入りの葉の実験で、光が当たった緑色の部分は何色になったかな。',
        }),
        choice({
          id: 'bo-photosynthesis-k3', concept: 'bo-photosynthesis',
          prompt: '葉をヨウ素液につける前に、あたためたエタノールにつけるのはなぜ？',
          options: ['葉の緑色をぬいて、色の変化を見やすくするため', '葉にデンプンをつくらせるため', '葉をかたくするため'],
          answer: 'a',
          explanation: 'エタノールで葉の緑色をぬく（脱色する）と、ヨウ素液の色の変化が見やすくなります。エタノールは火がつきやすいので、火で直接加熱せず、湯であたためます。',
          hint: '緑色の葉のままだと、青紫色に変わったかどうか分かりにくいね。',
        }),
      ],
    },
    {
      id: 'bo-transport', title: '蒸散と道管・師管', basic: 'bo-cell', lessonStageId: 'body-2',
      checkPool: [
        choice({
          id: 'bo-transport-k1', concept: 'bo-transport',
          prompt: '気孔を囲んでいる、2 つの三日月形の細胞を何という？',
          options: ['孔辺細胞', '道管', '師管'],
          answer: 'a',
          explanation: '気孔を囲む 2 つの細胞を孔辺細胞といいます。孔辺細胞の形が変わることで、気孔が開いたり閉じたりします。',
          hint: '「孔（あな）」の「辺（まわり）」の細胞だよ。',
        }),
        fill({
          id: 'bo-transport-k2', concept: 'bo-transport',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '葉でつくられた栄養分が運ばれる管を[b1]という。',
          blanks: [word('b1', ['師管', '道管', '気孔'], '師管')],
          explanation: '葉でつくられた栄養分は師管を通って運ばれます。根から吸い上げた水や肥料分が通るのは道管です。',
          hint: '水が通る管ではないほうだよ。',
        }),
        choice({
          id: 'bo-transport-k3', concept: 'bo-transport',
          prompt: '茎の維管束で、道管はどちら側にある？',
          options: ['茎の中心側（内側）', '茎の表皮側（外側）', '決まっていない'],
          answer: 'a',
          explanation: '茎の維管束では、道管が内側（茎の中心側）、師管が外側にあります。',
          hint: '水が通る管は「内側」だったね。',
        }),
      ],
    },
    {
      id: 'bo-digestion', title: '消化と吸収', basic: null, lessonStageId: 'body-3',
      checkPool: [
        choice({
          id: 'bo-digestion-k1', concept: 'bo-digestion',
          prompt: '口から入った食物が通る順として正しいものはどれ？',
          options: ['口 → 食道 → 胃 → 小腸 → 大腸 → 肛門', '口 → 胃 → 食道 → 小腸 → 大腸 → 肛門', '口 → 食道 → 胃 → 大腸 → 小腸 → 肛門'],
          answer: 'a',
          explanation: '食物は、口 → 食道 → 胃 → 小腸 → 大腸 → 肛門の順に消化管を通ります。肝臓やすい臓は、食物が通らない器官です。',
          hint: '養分を吸収する長い管は、大腸より先だよ。',
        }),
        fill({
          id: 'bo-digestion-k2', concept: 'bo-digestion',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '脂肪は、すい液にふくまれる[b1]などのはたらきで、脂肪酸とモノグリセリドに分解される。',
          blanks: [word('b1', ['リパーゼ', 'アミラーゼ', 'ペプシン'], 'リパーゼ')],
          explanation: 'すい液のリパーゼが脂肪を分解します。胆汁は消化酵素をふくみませんが、脂肪の消化を助けます。',
          hint: 'アミラーゼはデンプン、ペプシンはタンパク質を分解したね。',
        }),
        choice({
          id: 'bo-digestion-k3', concept: 'bo-digestion',
          prompt: 'だ液の実験で、ヨウ素液を加えると青紫色になるのは、何が残っているとき？',
          options: ['デンプン', '麦芽糖', 'タンパク質'],
          answer: 'a',
          explanation: 'ヨウ素液はデンプンがあると青紫色になります。だ液を加えた試験管では、デンプンが分解されているので、青紫色になりません。',
          hint: 'ヨウ素液は、何を調べる薬品だったかな。',
        }),
      ],
    },
    {
      id: 'bo-circulation', title: '呼吸・血液の循環・排出', basic: 'bo-digestion', lessonStageId: 'body-4',
      checkPool: [
        choice({
          id: 'bo-circulation-k1', concept: 'bo-circulation',
          prompt: '血液の成分のうち、出血したときに血液を固めるはたらきをするのはどれ？',
          options: ['血小板', '赤血球', '白血球'],
          answer: 'a',
          explanation: '血小板は、出血したときに血液を固めるはたらきをします。赤血球は酸素を運び、白血球は細菌などを分解します。',
          hint: 'いちばん小さな成分だよ。',
        }),
        fill({
          id: 'bo-circulation-k2', concept: 'bo-circulation',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '心臓から全身をめぐって心臓にもどる血液の道すじを[b1]という。',
          blanks: [word('b1', ['体循環', '肺循環', '反射'], '体循環')],
          explanation: '心臓 → 全身 → 心臓の道すじが体循環、心臓 → 肺 → 心臓の道すじが肺循環です。',
          hint: '「全身（からだ）」をめぐる循環だよ。',
        }),
        choice({
          id: 'bo-circulation-k3', concept: 'bo-circulation',
          prompt: '静脈のところどころにある弁は、どんなはたらきをしている？',
          options: ['血液の逆流を防ぐ', '血液を固める', '血液に酸素をとり入れる'],
          answer: 'a',
          explanation: '静脈の弁は、血液が逆向きに流れるのを防いでいます。心臓から遠い静脈では血液の勢いが弱いので、弁が役立ちます。',
          hint: '血液が流れる向きと関係があるよ。',
        }),
      ],
    },
    {
      id: 'bo-nerve', title: '刺激と反応', basic: null, lessonStageId: 'body-4',
      checkPool: [
        choice({
          id: 'bo-nerve-k1', concept: 'bo-nerve',
          prompt: '脳と脊髄をまとめて何という？',
          options: ['中枢神経', '末しょう神経', '感覚神経'],
          answer: 'a',
          explanation: '脳と脊髄を中枢神経といいます。中枢神経から枝分かれしてからだのすみずみまで広がる感覚神経や運動神経を、末しょう神経といいます。',
          hint: 'からだの「中心」で命令を出す神経だよ。',
        }),
        fill({
          id: 'bo-nerve-k2', concept: 'bo-nerve',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '感覚器官で受けとった刺激の信号を中枢神経へ伝える神経を[b1]、中枢神経からの命令を筋肉へ伝える神経を[b2]という。',
          blanks: [
            word('b1', ['感覚神経', '運動神経', '中枢神経'], '感覚神経'),
            word('b2', ['感覚神経', '運動神経', '中枢神経'], '運動神経'),
          ],
          explanation: '刺激の信号を中枢神経へ伝えるのが感覚神経、命令を筋肉へ伝えるのが運動神経です。',
          hint: '筋肉を「動かす」命令を伝えるのはどちらかな。',
        }),
        choice({
          id: 'bo-nerve-k3', concept: 'bo-nerve',
          prompt: '目で、光の刺激を受けとる細胞があるところはどこ？',
          options: ['網膜', '鼓膜', 'うずまき管'],
          answer: 'a',
          explanation: '目では、レンズ（水晶体）を通った光が網膜に像を結び、網膜の細胞が光の刺激を受けとります。耳では、鼓膜が音で振動し、うずまき管の細胞が音の刺激を受けとります。',
          hint: '鼓膜とうずまき管は、耳のつくりだよ。',
        }),
      ],
    },
    {
      id: 'bo-sense', title: '感覚器官', basic: 'bo-nerve', lessonStageId: 'body-mp9',
      checkPool: [
        choice({
          id: 'bo-sense-k1', concept: 'bo-sense',
          prompt: '目で、レンズを通った光が像を結ぶところはどこ？',
          options: ['網膜', '虹彩', '鼓膜'],
          answer: 'a',
          explanation: 'レンズで屈折した光は網膜に像を結び、網膜の細胞が光の刺激を受けとります。虹彩は光の量を調節し、鼓膜は耳のつくりです。',
          hint: '目のいちばん奥の膜だよ。',
        }),
        fill({
          id: 'bo-sense-k2', concept: 'bo-sense',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '音で振動した鼓膜の振動は、[b1]を通ってうずまき管に伝わる。',
          blanks: [word('b1', ['耳小骨', '半規管', '網膜'], '耳小骨')],
          explanation: '鼓膜の振動は、耳小骨という小さな骨を通って、うずまき管へ伝わります。',
          hint: '鼓膜につながっている小さな骨だよ。',
        }),
        choice({
          id: 'bo-sense-k3', concept: 'bo-sense',
          prompt: '皮ふが受けとる刺激でないものはどれ？',
          options: ['光', '圧力', '温度', '痛み'],
          answer: 'a',
          explanation: '皮ふは圧力・温度・痛みなどを受けとります。光の刺激を受けとるのは目です。',
          hint: '目で受けとる刺激はどれかな。',
        }),
      ],
    },
    {
      id: 'bo-movement', title: '骨格と筋肉', basic: 'bo-nerve', lessonStageId: 'body-mp11',
      checkPool: [
        choice({
          id: 'bo-movement-k1', concept: 'bo-movement',
          prompt: '筋肉の両はしで、骨についている部分を何という？',
          options: ['けん', '関節', '神経'],
          answer: 'a',
          explanation: '筋肉の両はしはけんになって骨についています。関節は骨と骨のつなぎ目です。',
          hint: 'アキレスけんの「けん」だよ。',
        }),
        fill({
          id: 'bo-movement-k2', concept: 'bo-movement',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'うでを曲げるとき、内側の筋肉は[b1]、外側の筋肉は[b2]。',
          blanks: [
            word('b1', ['縮み', 'ゆるみ'], '縮み'),
            word('b2', ['縮む', 'ゆるむ'], 'ゆるむ'),
          ],
          explanation: 'うでを曲げるとき、内側の筋肉が縮み、外側の筋肉がゆるみます。のばすときは反対になります。',
          hint: '力こぶができるのは内側の筋肉だね。',
        }),
        choice({
          id: 'bo-movement-k3', concept: 'bo-movement',
          prompt: '骨格のはたらきでないものはどれ？',
          options: ['食物を消化する', 'からだを支える', '脳や内臓を守る'],
          answer: 'a',
          explanation: '骨格は、からだを支え、脳や内臓を守り、筋肉とともにからだを動かします。食物の消化は消化器官のはたらきです。',
          hint: '頭の骨やろっ骨が何を囲んでいるか考えよう。',
        }),
      ],
    },
    {
      id: 'bo-vertebrate', title: 'セキツイ動物のなかま分け', basic: 'bo-circulation', lessonStageId: 'body-mp11',
      checkPool: [
        choice({
          id: 'bo-vertebrate-k1', concept: 'bo-vertebrate',
          prompt: '子が母親の体内である程度育ってからうまれる、うまれ方を何という？',
          options: ['胎生', '卵生', '分裂'],
          answer: 'a',
          explanation: '母親の体内で育ってからうまれるうまれ方を胎生といいます。セキツイ動物ではホニュウ類が胎生です。卵をうむうまれ方は卵生です。',
          hint: '「胎」は母親のおなかの中という意味だよ。',
        }),
        choice({
          id: 'bo-vertebrate-k2', concept: 'bo-vertebrate',
          prompt: '次のうち、まわりの温度によって体温が変わる変温動物のなかまはどれ？',
          options: ['ハチュウ類', '鳥類', 'ホニュウ類'],
          answer: 'a',
          explanation: '魚類・両生類・ハチュウ類は変温動物、鳥類とホニュウ類は体温がほぼ一定の恒温動物です。',
          hint: '冬眠するトカゲやヘビのなかまだよ。',
        }),
        choice({
          id: 'bo-vertebrate-k3', concept: 'bo-vertebrate',
          prompt: '両生類の子（オタマジャクシ）は、おもに何で呼吸する？',
          options: ['えらと皮ふ', '肺', '気門'],
          answer: 'a',
          explanation: '両生類の子は水中でくらし、えらと皮ふで呼吸します。親になると陸上にも上がり、肺と皮ふで呼吸します。',
          hint: '水の中でくらしているときの呼吸だよ。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'body',
    title: '生物のからだのつくりとはたらき',
    mascot: 'F',   // 担当の先生（まめ博士。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'cell', title: '細胞と植物のはたらき', order: 1, stages: [body1, body2] },
      { id: 'organ', title: '動物のからだ', order: 2, stages: [body3, body4] },
      { id: 'body-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [bodyMp1, bodyMp2, bodyMp3, bodyMp4, bodyMp5, bodyMp6, bodyMp7, bodyMp8, bodyMp9, bodyMp10, bodyMp11] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
