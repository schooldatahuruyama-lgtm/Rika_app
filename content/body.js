// 「生物のからだのつくりとはたらき」教材データ（中学2年 理科）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通指示 .ai-tasks/20261104-170000_単元教材の共通指示.md）。
// 2 領域 × 2 ステージ（細胞と植物のはたらき・動物のからだ）と、概念 6 つ（id は単元の接頭辞 bo- を付けて全単元で一意にする）。
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
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
