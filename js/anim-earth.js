// 解説カードの動く図（地学: 火山と地震・天気・地球と宇宙）。js/anim.js の register で足す。
// 各 kind の動き・数値は docs/anim-plan.md の 8 章。静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、
// 動く部品だけを式で動かす。静止図を作る関数（seismoPoints・waveGraphItems・plateItems・japanItems・earthFromPole・
// orbitBase・tiltedEarth・seasonSide・moonOrbit・litBody・moonShape など）は content の中にあって anim から呼べないので、
// 同じ式をここに写す（出どころは各関数のコメント）。座標は丸めない（content は r1 で 0.1 に丸めているが、差は 0.05 以下）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, deg, wrap, along, onCircle, mix, ease, osc, pathLen, u, TOKEN_HEX } = anim.helpers;

  // 小数部分（0 以上 1 未満）
  function frac(x) { return x - Math.floor(x); }
  // 2 つの角（度）の差 0〜180
  function angDiff(a, b) { const d = frac((a - b) / 360) * 360; return Math.min(d, 360 - d); }

  // 文字（静止図の text と同じ形）
  function text(x, y, s, size, extra) { return Object.assign({ type: 'text', x, y, text: s, size }, extra || {}); }

  // ================================================================
  // 火山と地震（volcano）
  // ================================================================

  // 震源から波の輪が広がり、輪が地表（震源から 100）に届くと震央がゆれる（volcano-3-c1）。
  // 輪 k（0〜3）の半径 = 10 + wrap(24k + 96t, 0, 96)（10〜106。輪の間は静止図と同じ 24、t = 0 で 10・34・58・82）。
  // 描くのは 12〜100（震源の丸に隠れる所と、地表に届いたあとは描かない）。震央の丸は、輪が地表に届いた直後
  // （半径 99〜105）だけ大きくする。輪が生まれる・消える所を描かないので、t = 1 と t = 0 がつながる。
  // 輪は地層の下のはし（y 230）より下を切った弧の line（場面の下にはみ出さない）
  const QUAKE_BOTTOM = 230;
  function quakeRing(r) {
    // y = 180 − r·sin a ≦ 230 の弧。半径 50 以下は 1 周
    const cut = r <= QUAKE_BOTTOM - 180 ? 90 : Math.asin((QUAKE_BOTTOM - 180) / r) * 180 / Math.PI;
    return { type: 'line', points: arc(160, 180, r, -cut, 180 + cut, 72), color: 'gray', width: 2 };
  }
  function voQuakeSpread(t) {
    const rings = [];
    let shaking = false;
    for (let k = 0; k < 4; k++) {
      const r = 10 + wrap(24 * k + 96 * t, 0, 96);
      if (r >= 99 && r <= 105) shaking = true;   // ゆれが地表に届いた
      if (r < 12 || r > 100) continue;
      rings.push(quakeRing(r));
    }
    return [
      { type: 'rect', x: 10, y: 80, width: 300, height: 150, fill: 'sand', stroke: 'none' },
      { type: 'line', points: [[10, 80], [310, 80]], color: 'brown', width: 3 },
      ...rings,
      { type: 'line', points: [[160, 168], [160, 94]], color: 'gray', width: 2, dashed: true },
      { type: 'circle', x: 160, y: 180, r: 9, fill: 'orange' },
      { type: 'circle', x: 160, y: 80, r: shaking ? 12 : 9, fill: 'yellow' },
      text(176, 186, '震源', 14, { bold: true }),
      text(160, 60, '震央（震源の真上）', 14, { anchor: 'middle', bold: true }),
      text(14, 72, '地表', 13),
    ];
  }

  // content/volcano.js の seismoPoints と同じ式（y=120 が基準。x 70 で P 波、x 150 で S 波が着く）
  function seismoPoints() {
    const pts = [[20, 120], [70, 120]];
    for (let x = 74, k = 0; x < 150; x += 4, k++) pts.push([x, 120 + (k % 2 ? 7 : -7) * (k % 3 === 2 ? 0.6 : 1)]);
    for (let x = 152, k = 0; x <= 286; x += 4, k++) {
      const a = Math.round(42 * Math.max(0.2, 1 - (x - 150) / 170));
      pts.push([x, 120 + (k % 2 ? a : -a)]);
    }
    pts.push([290, 120], [304, 120]);
    return pts;
  }
  const SEISMO = seismoPoints();

  // 地震計のペンが記録の線を左から描いていく。P 波・S 波が着いた所で点線と文字が出る（volcano-3-c2）
  function voSeismogram(t) {
    const pen = 20 + 284 * stage(t, 0, 0.9);
    let pts, penY = 120;
    if (pen >= 304) {
      pts = SEISMO.map(p => [p[0], p[1]]);
    } else {
      pts = SEISMO.filter(p => p[0] <= pen).map(p => [p[0], p[1]]);
      const i = pts.length - 1;   // ペン先の手前の点（SEISMO は x の小さい順。pen ≧ 20 なので 1 つはある）
      const a = SEISMO[i], b = SEISMO[i + 1];
      penY = lerp(a[1], b[1], (pen - a[0]) / (b[0] - a[0]));
      pts.push([pen, penY]);
    }
    const pArrived = pen >= 70, sArrived = pen >= 150;
    const items = [];
    if (pArrived) items.push({ type: 'line', points: [[70, 64], [70, 196]], color: 'gray', width: 2, dashed: true });
    if (sArrived) items.push({ type: 'line', points: [[150, 64], [150, 196]], color: 'gray', width: 2, dashed: true });
    if (pen > 20) items.push({ type: 'line', points: pts, color: 'ink', width: 2 });
    if (pArrived) items.push(text(70, 52, 'P波が着く', 12, { anchor: 'middle' }));
    if (sArrived) items.push(text(150, 52, 'S波が着く', 12, { anchor: 'middle' }));
    if (pArrived) items.push(text(110, 152, '初期微動', 13, { anchor: 'middle', bold: true }));
    if (sArrived) items.push(text(220, 186, '主要動', 13, { anchor: 'middle', bold: true }));
    // 初期微動継続時間の帯（P 波が着いてから S 波が着くまで伸びる）
    if (pen > 70) items.push({ type: 'line', points: [[70, 208], [Math.min(pen, 150), 208]], color: 'orange', width: 4 });
    if (sArrived) items.push(text(110, 228, '初期微動継続時間', 12, { anchor: 'middle' }));
    items.push({ type: 'circle', x: pen, y: penY, r: 4, fill: 'blue', stroke: 'none' });   // ペン先
    return items;
  }

  // content/volcano.js の waveGraphItems と同じ部品（横: 時間 0〜60 秒、たて: 距離 0〜210 km）
  // x = 50 + 4 × 時間、y = 200 − 0.8 × 距離。P 波 6 km/s、S 波 3.5 km/s
  function waveGraphItems() {
    const items = [];
    [144, 88, 32].forEach(y => items.push({ type: 'line', points: [[50, y], [290, y]], color: 'gray', width: 1, dashed: true }));
    [130, 210, 290].forEach(x => items.push({ type: 'line', points: [[x, 200], [x, 32]], color: 'gray', width: 1, dashed: true }));
    items.push(
      { type: 'line', points: [[50, 200], [50, 22]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [306, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [190, 32]], color: 'blue', width: 3 },
      { type: 'line', points: [[50, 200], [290, 32]], color: 'green', width: 3 },
      text(44, 214, '0', 12, { anchor: 'end' }),
      text(130, 216, '20', 12, { anchor: 'middle' }),
      text(210, 216, '40', 12, { anchor: 'middle' }),
      text(290, 216, '60', 12, { anchor: 'middle' }),
      text(44, 148, '70', 12, { anchor: 'end' }),
      text(44, 92, '140', 12, { anchor: 'end' }),
      text(44, 36, '210', 12, { anchor: 'end' }),
      text(56, 16, '距離〔km〕', 12),
      text(306, 236, '地震発生からの時間〔秒〕', 12, { anchor: 'end' }),
      text(112, 64, 'P波', 13, { color: 'blue', bold: true }),
      text(262, 84, 'S波', 13, { color: 'green', bold: true }),
    );
    return items;
  }
  const P_SPEED = 6, S_SPEED = 3.5;   // km/s

  // 時間のカーソルが 0 → 60 秒へ動き、P 波・S 波の線との交点が進む。210 km と 140 km の地点で、
  // P 波が着いてから S 波が着くまでの帯（初期微動継続時間）が伸びる（volcano-3-c3）
  function voPsGraph(t) {
    const x = 50 + 240 * stage(t, 0, 0.9);
    const sec = (x - 50) / 4;
    const items = waveGraphItems();
    if (x > 143) items.push({ type: 'line', points: [[143, 88], [Math.min(x, 210), 88]], color: 'orange', width: 4 });
    if (x > 190) items.push({ type: 'line', points: [[190, 32], [Math.min(x, 290), 32]], color: 'orange', width: 4 });
    if (x > 190) items.push(text(240, 24, '初期微動継続時間', 12, { anchor: 'middle' }));
    items.push({ type: 'line', points: [[x, 200], [x, 28]], color: 'blue', width: 2, dashed: true });   // カーソル
    // 交点（距離 = 速さ × 時間。それぞれの線の範囲の中だけ）
    if (P_SPEED * sec <= 210) items.push({ type: 'circle', x, y: 200 - 0.8 * P_SPEED * sec, r: 5, fill: 'blue', stroke: 'none' });
    if (S_SPEED * sec <= 210) items.push({ type: 'circle', x, y: 200 - 0.8 * S_SPEED * sec, r: 5, fill: 'green', stroke: 'none' });
    // 時刻の文字（上は静止図の文字があるので、横軸のすぐ上に出す。右はしでは左に寄せる）
    const right = x > 250;
    items.push(text(right ? x - 6 : x + 6, 194, Math.round(sec) + ' 秒', 12, { anchor: right ? 'end' : 'start', color: 'blue', bold: true }));
    return items;
  }

  // content/volcano.js の plateItems（arrows: true）と同じ部品。大陸プレートの先の 2 点だけ動かす
  const PLATE_MID = [[310, 112], [232, 112], [115, 223]];   // 海洋プレートの中ほどの線（沈みこむ向き）

  // 海洋プレートの印が沈みこみ、大陸プレートの先が引きずられて下がり、はね返って地震が起こる（volcano-4-c3）
  function voPlateRebound(t) {
    const d = t < 0.7 ? stage(t, 0, 0.7) : 1 - stage(t, 0.7, 0.74);   // 引きずられる量（0〜1）
    const marks = [];
    for (let k = 0; k < 4; k++) {
      const q = along(PLATE_MID, frac(t + k / 4));
      marks.push({ type: 'rect', x: q.x - 3, y: q.y - 3, width: 6, height: 6, fill: 'line', stroke: 'none' });
    }
    const items = [
      { type: 'polygon', points: [[190, 70], [310, 70], [310, 100], [224, 100]], fill: 'water', stroke: 'none' },
      { type: 'polygon', points: [[310, 100], [224, 100], [105, 214], [124, 232], [240, 125], [310, 125]], fill: '#9FB4CC' },
      ...marks,
      { type: 'polygon', points: [[10, 78], [205 - 4 * d, 78 + 10 * d], [224 - 4 * d, 100 + 10 * d], [150, 168], [10, 168]], fill: '#D8C9A8' },
      text(100, 70, '日本列島', 13, { anchor: 'middle' }),
      text(20, 140, '大陸プレート', 13),
      text(246, 146, '海洋プレート', 12),
      text(228, 94, '海溝', 12),
      text(306, 64, '太平洋', 12, { anchor: 'end' }),
      { type: 'arrow', x1: 302, y1: 112, x2: 256, y2: 112, color: 'blue' },
      { type: 'arrow', x1: 160, y1: 180, x2: 132, y2: 207, color: 'blue' },
      text(100, 200, '沈みこむ', 13, { color: 'blue', bold: true, anchor: 'end' }),
    ];
    if (t > 0.72 && t <= 0.9) {
      items.push(
        { type: 'circle', x: 215, y: 96, r: 30 * stage(t, 0.72, 0.9), fill: 'none', stroke: 'red' },
        text(196, 40, '地震が起こる', 13, { color: 'red', bold: true }),
      );
    }
    return items;
  }

  // ================================================================
  // 地層と大地の変化（strata）
  // ================================================================

  // content/strata.js の FLOOR・LAND_TOP・riverItems と同じ部品（山から海までの断面。海面は y 138）
  const FLOOR = '#D8D2C6';
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
  // 海底の線 (200,150)→(320,196) の y
  function seaFloorY(x) { return 150 + (x - 200) * 46 / 120; }
  // かけらの道すじ: 山の上のかけら（静止図の 1 つ目、中心 (12,57)）の後ろから出て、川の線に沿って河口 (198,141) まで
  const EROSION_LAND = [[12, 57], [32, 48], [80, 98], [130, 126], [198, 141]];
  // 海の中でかけらが止まる所（河口の近くの海底に 2 段に積もる。「④」の文字（x 228〜）にかからない）。着く順
  const EROSION_REST = [[221, seaFloorY(221) - 3], [213, seaFloorY(213) - 3], [205, seaFloorY(205) - 3],
    [217, seaFloorY(217) - 10], [209, seaFloorY(209) - 10]];
  const EROSION_JAG = [0.25, 0.1, -0.2, 0.15, -0.1, 0.3, -0.25, 0.05];   // かどばった形（頂点ごとの半径のずれ）
  const EROSION_TRIP = 0.42;   // 1 つのかけらが山から海底まで行く時間（川 0.8、海 0.2 の割合）
  function erosionStart(k) { return 0.1 * k; }

  // かけらの形: 中心 (x, y)、半径 R、かどばり a（1 でかどばる、0 で丸い）、回る角 rot（度）
  function fragment(x, y, R, a, rot, k) {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const rr = R * (1 + a * EROSION_JAG[(i + 3 * k) % 8]);
      points.push(onCircle(x, y, rr, rot + 45 * i));
    }
    return { type: 'polygon', points, fill: 'rock' };
  }

  // 山の岩石のかけらが川に運ばれながら小さく丸くなり、海に出てしずみ、河口の近くに積もる（strata-1-c1）
  // 静止図は content/strata.js の strata-1-c1。かけらは静止図の山のかけらの後ろから出る
  function srErosionFlow(t) {
    const items = riverItems();
    for (let k = 0; k < EROSION_REST.length; k++) {
      const s = stage(t, erosionStart(k), erosionStart(k) + EROSION_TRIP);
      let x, y;
      if (s <= 0.8) {
        const q = along(EROSION_LAND, s / 0.8);
        x = q.x; y = q.y;
      } else {
        // 海: 海面のすぐ下（y 142.4。先に積もったかけらの上を通る）を沖へ進み、止まる所の真上からしずむ
        const [rx, ry] = EROSION_REST[k];
        const q = along([[198, 141], [203, 142.4], [rx, 142.4], [rx, ry]], (s - 0.8) / 0.2);
        x = q.x; y = q.y;
      }
      items.push(fragment(x, y, lerp(4.5, 3, s), 1 - s, 540 * s, k));
    }
    items.push(
      { type: 'polygon', points: [[6, 54], [16, 52], [18, 60], [8, 62]], fill: 'rock' },
      { type: 'polygon', points: [[22, 58], [30, 56], [30, 64]], fill: 'rock' },
      text(6, 30, '①', 16),
      text(52, 62, '②', 16),
      text(104, 100, '③', 16),
      text(228, 158, '④', 16),
      text(140, 30, '① 風化: 岩石がもろくなる', 12),
      text(140, 48, '② 侵食: 流れる水がけずる', 12),
      text(140, 66, '③ 運搬: 土砂を運ぶ', 12),
      text(140, 84, '④ 堆積: 土砂が積もる', 12),
      text(14, 120, '山', 14),
      text(130, 176, '平地', 14),
      text(290, 176, '海', 14),
    );
    return items;
  }

  // ================================================================
  // 天気とその変化（weather）
  // ================================================================

  // 山の斜面にそって空気のかたまりが上がり、膨張して冷え、雲ができる（weather-2-c4）
  const CLOUD_PATH = [[40, 206], [130, 106]];
  const CLOUD_STEPS = ['①上昇する', '②膨張する', '③温度が下がる', '④露点で雲になる'];
  function weCloudForm(t) {
    const p = stage(t, 0, 0.75);          // 空気のかたまりの進み方
    const c = stage(t, 0.6, 0.9);         // 雲の大きさ（p が 0.8 をこえてから広がる）
    const now = Math.min(3, Math.floor(p * 4));   // いまの段階（p の 4 等分）
    const items = [
      { type: 'polygon', points: [[30, 220], [160, 80], [290, 220]], fill: 'rock' },
      { type: 'line', points: [[0, 220], [320, 220]], color: 'brown', width: 3 },
      { type: 'arrow', x1: 40, y1: 206, x2: 90, y2: 152, color: 'blue' },
      { type: 'arrow', x1: 100, y1: 140, x2: 130, y2: 106, color: 'blue' },
    ];
    if (c > 0) {
      items.push(
        { type: 'ellipse', x: 124, y: 72, rx: 22 * c, ry: 11 * c, fill: 'white', stroke: 'gray' },
        { type: 'ellipse', x: 150, y: 62, rx: 32 * c, ry: 14 * c, fill: 'white', stroke: 'gray' },
      );
    }
    // 空気のかたまり（上がるほど大きく＝膨張、色は暖かい → 冷たい）。雲ができきったら消える
    if (t < 0.9) {
      const q = along(CLOUD_PATH, p);
      items.push({ type: 'circle', x: q.x, y: q.y, r: 8 + 6 * p, fill: mix('#F2B26B', '#CFE4FF', p), stroke: 'line' });
    }
    CLOUD_STEPS.forEach((s, i) => items.push(text(196, 34 + 18 * i, s, 12, i === now ? { bold: true } : {})));
    return items;
  }

  // 高気圧からは時計回りにふき出し、低気圧には反時計回りにふきこむ空気の粒（weather-3-c2）。
  // 画面の座標で x = cx + r·cos a、y = cy + r·sin a（a が増えると画面で時計回り）。
  // 粒 k の f = frac(t + k/4 + 1/8)（1/8 ずらして、t = 0 に粒が生まれ変わらないようにする。t = 1 と t = 0 がつながる）
  function weHighLow(t) {
    const dots = [];
    for (let k = 0; k < 4; k++) {
      const f = frac(t + k / 4 + 1 / 8);
      const rh = 10 + 50 * f, ah = deg(90 * k + 70 * f);
      dots.push({ type: 'circle', x: 85 + rh * Math.cos(ah), y: 115 + rh * Math.sin(ah), r: 3, fill: 'blue', stroke: 'none' });
      const rl = 60 - 50 * f, al = deg(90 * k - 70 * f);
      dots.push({ type: 'circle', x: 235 + rl * Math.cos(al), y: 115 + rl * Math.sin(al), r: 3, fill: 'blue', stroke: 'none' });
    }
    return [
      { type: 'arrow', x1: 85, y1: 97, x2: 107.6, y2: 74.4, color: 'blue' },
      { type: 'arrow', x1: 103, y1: 115, x2: 125.6, y2: 137.6, color: 'blue' },
      { type: 'arrow', x1: 85, y1: 133, x2: 62.4, y2: 155.6, color: 'blue' },
      { type: 'arrow', x1: 67, y1: 115, x2: 44.4, y2: 92.4, color: 'blue' },
      { type: 'arrow', x1: 235, y1: 61, x2: 212.4, y2: 83.6, color: 'blue' },
      { type: 'arrow', x1: 289, y1: 115, x2: 266.4, y2: 92.4, color: 'blue' },
      { type: 'arrow', x1: 235, y1: 169, x2: 257.6, y2: 146.4, color: 'blue' },
      { type: 'arrow', x1: 181, y1: 115, x2: 203.6, y2: 137.6, color: 'blue' },
      // 中心の下降気流・上昇気流
      { type: 'arrow', x1: 85, y1: 78, x2: 85, y2: 92, color: 'gray', width: 2 },
      { type: 'arrow', x1: 235, y1: 92, x2: 235, y2: 78, color: 'gray', width: 2 },
      ...dots,
      text(85, 122, '高', 20, { anchor: 'middle', bold: true }),
      text(235, 122, '低', 20, { anchor: 'middle', bold: true }),
      text(85, 36, '高気圧', 13, { anchor: 'middle' }),
      text(235, 36, '低気圧', 13, { anchor: 'middle' }),
      text(85, 196, '時計回りにふき出す', 12, { anchor: 'middle' }),
      text(85, 214, '下降気流→晴れ', 12, { anchor: 'middle' }),
      text(235, 196, '反時計回りにふきこむ', 12, { anchor: 'middle' }),
      text(235, 214, '上昇気流→くもり・雨', 12, { anchor: 'middle' }),
    ];
  }

  // content/weather.js の frontItems・triangle・halfDisk・normalOf と同じ式（前線の記号）。
  // ここで使うのは横向きの前線（pts は 2 点、左 → 右）だけなので、along は横の線の上の点で足りる
  function frontItems(pts, kind, side, start) {
    const [[x0, y0], [x1]] = pts;
    const L = x1 - x0;
    const step = 26;
    const s0 = start === undefined ? 13 : start;
    const at = s => ({ x: x0 + Math.min(s, L), y: y0, tx: 1, ty: 0 });
    const items = [];
    if (kind === 'stationary') {
      for (let s = 0, k = 0; s < L - 2; s += step, k++) {
        const e = Math.min(L, s + step);
        items.push({ type: 'line', points: [[x0 + s, y0], [x0 + e, y0]], color: k % 2 ? 'red' : 'blue', width: 3 });
        if (e - s >= step / 2 + 7) {
          const q = at(s + step / 2);
          items.push(k % 2 ? frontHalfDisk(q, -side, 'red') : frontTriangle(q, side, 'blue'));
        }
      }
      return items;
    }
    const color = kind === 'cold' ? 'blue' : kind === 'warm' ? 'red' : 'purple';
    items.push({ type: 'line', points: pts.map(p => [p[0], p[1]]), color, width: 3 });
    for (let s = s0, k = 0; s <= L - 8; s += step, k++) {
      const q = at(s);
      const tri = kind === 'cold' || (kind === 'occluded' && k % 2 === 0);
      items.push(tri ? frontTriangle(q, side, color) : frontHalfDisk(q, side, color));
    }
    return items;
  }
  function frontNormal(q, side) { return [q.ty * side, -q.tx * side]; }
  function frontTriangle(q, side, color) {
    const [nx, ny] = frontNormal(q, side);
    return {
      type: 'polygon', fill: color, stroke: 'none',
      points: [[q.x - q.tx * 7, q.y - q.ty * 7], [q.x + q.tx * 7, q.y + q.ty * 7], [q.x + nx * 10, q.y + ny * 10]],
    };
  }
  function frontHalfDisk(q, side, color) {
    const [nx, ny] = frontNormal(q, side);
    const points = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * k / 8;
      points.push([q.x + 7 * (Math.cos(a) * q.tx + Math.sin(a) * nx), q.y + 7 * (Math.cos(a) * q.ty + Math.sin(a) * ny)]);
    }
    return { type: 'polygon', fill: color, stroke: 'none', points };
  }
  // 4 本の前線: [種類, 静止図の線, 記号の向き（上）へ進む量]。停滞前線はほとんど動かない（上下に 2 ゆれる）
  const FRONTS = [
    ['cold', [[20, 50], [180, 50]], 14],
    ['warm', [[20, 100], [180, 100]], 8],
    ['stationary', [[20, 150], [176, 150]], 0],
    ['occluded', [[20, 200], [180, 200]], 6],
  ];
  // 前線の動く量（上へ）。寒冷・温暖・閉そくは 0.05〜0.75 に進み、止まって見せてから t = 0 で静止図の位置にもどる
  function frontShift(t, kind, amount) {
    if (kind === 'stationary') return 2 * osc(t, 2);
    return -amount * ease(stage(t, 0.05, 0.75));
  }

  // 前線の記号の向き（三角・半円のある側）へ前線が進む。寒冷前線は速く、温暖前線はゆっくり、停滞前線はほとんど動かない（weather-3-c3）
  // 静止図は content/weather.js の weather-3-c3。もとの位置はうすい点線で残す
  function weFrontMove(t) {
    const items = [];
    FRONTS.forEach(([kind, pts, amount]) => {
      const dy = frontShift(t, kind, amount);
      if (Math.abs(dy) > 1 && kind !== 'stationary') {
        items.push({ type: 'line', points: pts.map(p => [p[0], p[1]]), color: 'gray', width: 1.5, dashed: true });
      }
      frontItems(pts, kind, 1).forEach(it => items.push(Object.assign({}, it, { points: it.points.map(([x, y]) => [x, y + dy]) })));
    });
    items.push(
      text(196, 50, '寒冷前線', 14, { bold: true }),
      text(196, 67, '寒気が強い', 12),
      text(196, 100, '温暖前線', 14, { bold: true }),
      text(196, 117, '暖気が強い', 12),
      text(196, 150, '停滞前線', 14, { bold: true }),
      text(196, 167, 'つり合っている', 12),
      text(196, 200, '閉そく前線', 14, { bold: true }),
      text(196, 217, '寒冷前線が追いついた', 12),
    );
    return items;
  }

  // content/weather.js の japanItems と同じ式（日本付近の地図・簡略）
  function japanItems() {
    const land = { fill: 'lightgreen', stroke: 'line' };
    return [
      Object.assign({ type: 'polygon', points: [[246, 36], [280, 30], [296, 50], [270, 66], [252, 62]] }, land),
      Object.assign({ type: 'polygon', points: [[250, 78], [262, 92], [250, 118], [228, 140], [196, 156], [160, 166], [128, 176], [112, 172], [118, 160], [150, 150], [186, 136], [214, 118], [236, 96]] }, land),
      Object.assign({ type: 'polygon', points: [[136, 182], [166, 178], [160, 192], [138, 192]] }, land),
      Object.assign({ type: 'polygon', points: [[96, 176], [116, 180], [118, 204], [100, 212], [90, 196]] }, land),
    ];
  }

  // 偏西風にのって低気圧と移動性高気圧が西から東へ動き、日本の天気が 雨 ⇄ 晴れ と変わる（weather-4-c3）。
  // dx = wrap(x0 + 240t, 36, 276) − x0（右はしまで行ったら左はしから出直す。計画の 20〜260 では左はしで「移動性高気圧」が切れるので、
  // 文字と矢印が場面に収まる 36〜276 にした）
  function weWesterly(t) {
    const dl = wrap(70 + 240 * t, 36, 276) - 70;
    const dh = wrap(190 + 240 * t, 36, 276) - 190;
    // 日本の上 (150, 150) から、いちばん近い気圧の中心（「低」「高」の字の中ほど）
    const nearLow = Math.hypot(70 + dl - 150, 129 - 150) < Math.hypot(190 + dh - 150, 93 - 150);
    return japanItems().concat([
      { type: 'arrow', x1: 20, y1: 22, x2: 236, y2: 22, color: 'orange', width: 5 },
      text(20, 44, '偏西風（西→東）', 13),
      text(70 + dl, 136, '低', 20, { anchor: 'middle', bold: true }),
      text(70 + dl, 112, '低気圧', 12, { anchor: 'middle' }),
      { type: 'arrow', x1: 88 + dl, y1: 130, x2: 112 + dl, y2: 130, color: 'blue' },
      text(190 + dh, 100, '高', 20, { anchor: 'middle', bold: true }),
      text(190 + dh, 76, '移動性高気圧', 12, { anchor: 'middle' }),
      { type: 'arrow', x1: 208 + dh, y1: 94, x2: 232 + dh, y2: 94, color: 'blue' },
      text(306, 228, '天気は西から東へ変わる', 12, { anchor: 'end' }),
      // いまの日本の天気
      { type: 'circle', x: 150, y: 150, r: 8, fill: nearLow ? 'gray' : 'yellow', stroke: 'line' },
      text(162, 155, nearLow ? '雨' : '晴れ', 12, { bold: true }),
    ]);
  }

  // ================================================================
  // 地球と宇宙（space）
  // ================================================================

  const DARK = '#59606B';     // 天体の夜の側（content/space.js の DARK と同じ）
  const NIGHT = '#7C8796';    // 地球の夜の側（content/space.js の NIGHT と同じ）

  // content/space.js の arc・arcLine・halfDisk・litBody・moonShape と同じ式（丸めない）
  function pt(cx, cy, r, d) { return onCircle(cx, cy, r, d); }
  function arc(cx, cy, r, a0, a1, n) {
    const k = n || Math.max(6, Math.round(Math.abs(a1 - a0) / 6));
    const pts = [];
    for (let i = 0; i <= k; i++) pts.push(pt(cx, cy, r, a0 + (a1 - a0) * i / k));
    return pts;
  }
  function arcLine(cx, cy, r, a0, a1, opts) { return Object.assign({ type: 'line', points: arc(cx, cy, r, a0, a1) }, opts); }
  function halfDisk(cx, cy, r, dir, fill) {
    return { type: 'polygon', points: arc(cx, cy, r, dir - 90, dir + 90, 12), fill, stroke: 'none' };
  }
  // 光の当たり方をかいた天体（真上から見た図）。sunDir は太陽のある向き（度）
  function litBody(cx, cy, r, sunDir, dayFill, nightFill) {
    return [
      { type: 'circle', x: cx, y: cy, r, fill: dayFill, stroke: 'none' },
      halfDisk(cx, cy, r, sunDir + 180, nightFill),
      { type: 'circle', x: cx, y: cy, r, fill: 'none', stroke: 'line' },
    ];
  }
  // 光っている部分の形。term は明暗の境目の楕円の横の半径（r の倍率。1 で光る所なし、0 で半分、-1 で全部）。
  // side = 1 なら右側、-1 なら左側が光る（content/space.js の moonShape の中の式）
  function phaseItems(cx, cy, r, term, side, dayFill, nightFill) {
    const items = [{ type: 'circle', x: cx, y: cy, r, fill: nightFill, stroke: 'none' }];
    if (term < 0.999) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const s = Math.PI * i / 12; pts.push([cx + side * r * Math.sin(s), cy - r * Math.cos(s)]); }
      for (let i = 12; i >= 0; i--) { const s = Math.PI * i / 12; pts.push([cx + side * r * term * Math.sin(s), cy - r * Math.cos(s)]); }
      items.push({ type: 'polygon', points: pts, fill: dayFill, stroke: 'none' });
    }
    items.push({ type: 'circle', x: cx, y: cy, r, fill: 'none', stroke: 'line' });
    return items;
  }
  // content/space.js の moonShape と同じ式。k は 0（新月）〜 1（満月）。waning: true なら欠けていく月（左側が光る）
  function moonShape(cx, cy, r, k, waning) {
    if (!(k > 0)) return phaseItems(cx, cy, r, 1, 1, 'yellow', DARK);
    return phaseItems(cx, cy, r, Math.cos(Math.PI * k), waning ? -1 : 1, 'yellow', DARK);
  }

  // content/space.js の earthFromPole と同じ部品（北極の真上から見た地球。中心 (160, 120)、半径 50、太陽の光は左から）
  function earthFromPole() {
    return [
      { type: 'arrow', x1: 8, y1: 70, x2: 92, y2: 70, color: 'orange' },
      { type: 'arrow', x1: 8, y1: 170, x2: 92, y2: 170, color: 'orange' },
      text(8, 56, '太陽の光', 12),
      ...litBody(160, 120, 50, 180, 'sky', NIGHT),
      { type: 'circle', x: 160, y: 120, r: 3, fill: 'ink', stroke: 'none' },
      text(160, 138, '北極', 12, { anchor: 'middle' }),
      arcLine(160, 120, 64, 300, 340, { color: 'blue', width: 3, arrow: true }),
    ];
  }

  // 自転につれて観測者が 正午 → 夕方 → 真夜中 → 明け方 と回る（space-1-c1）。角 = 180 + 360t 度
  const DAY_TIMES = [
    { name: '正午', a: 180, x: 66, y: 126, anchor: 'middle' },
    { name: '夕方', a: 270, x: 160, y: 196, anchor: 'middle' },
    { name: '真夜中', a: 0, x: 222, y: 126 },
    { name: '明け方', a: 90, x: 160, y: 62, anchor: 'middle' },
  ];
  function nearest(list, a) {
    return list.reduce((best, e) => (angDiff(a, e.a) < angDiff(a, best.a) ? e : best), list[0]);
  }
  function spRotation(t) {
    const a = 180 + 360 * t;
    const [ox, oy] = onCircle(160, 120, 50, a);
    const now = nearest(DAY_TIMES, a);
    return earthFromPole().concat([
      { type: 'circle', x: ox, y: oy, r: 5, fill: 'red', stroke: 'none' },   // 観測者
      ...DAY_TIMES.map(e => text(e.x, e.y, e.name, 13, Object.assign(e.anchor ? { anchor: e.anchor } : {}, { bold: true },
        e === now ? { color: 'blue' } : {}))),
      text(236, 176, '自転の向き', 12),
      text(316, 232, '北極の真上から見た図', 12, { anchor: 'end' }),
      text(8, 232, 'いま: ' + now.name, 13, { color: 'blue', bold: true }),
    ]);
  }

  // 午後 8 時のオリオン座の位置が、1 か月に 30° ずつ西へ動く（space-2-c1）。角 = 90 − 60·stage(t, 0, 0.85) 度
  const ORION_DATES = [
    { name: '2月15日', a: 90, x: 150, y: 64 },
    { name: '3月15日', a: 60, x: 220, y: 98 },
    { name: '4月15日', a: 30, x: 270, y: 150 },
  ];
  function spAnnualOrion(t) {
    const a = 90 - 60 * stage(t, 0, 0.85);
    const [x, y] = onCircle(160, 200, 140, a);
    return [
      arcLine(160, 200, 140, 10, 170, { color: 'gray', width: 1.5, dashed: true }),
      arcLine(160, 200, 162, 84, 40, { color: 'blue', width: 3, arrow: true }),
      { type: 'line', points: [[6, 200], [314, 200]], color: 'brown', width: 3 },
      ...ORION_DATES.map(d => { const [cx, cy] = onCircle(160, 200, 140, d.a); return { type: 'circle', x: cx, y: cy, r: 7, fill: 'yellow', stroke: 'orange' }; }),
      { type: 'circle', x, y, r: 9, fill: 'orange', stroke: 'ink' },   // いまのオリオン座の位置
      ...ORION_DATES.map(d => text(d.x, d.y, d.name, 12, Object.assign({ anchor: 'end' }, Math.abs(a - d.a) <= 3 ? { color: 'blue', bold: true } : {}))),
      text(24, 220, '東', 14, { anchor: 'middle', bold: true }),
      text(160, 220, '南', 14, { anchor: 'middle', bold: true }),
      text(296, 220, '西', 14, { anchor: 'middle', bold: true }),
      text(8, 20, '午後 8 時のオリオン座の位置', 12, { bold: true }),
      text(8, 38, '1 か月に約 30° 西へ', 12),
      text(8, 56, '→ 1 日に約 1°', 12),
    ];
  }

  // content/space.js の ORBIT・STARS・orbitBase・starDots と同じ部品（太陽 (160, 120)、軌道の半径 62）。
  // 季節（φ: 0 冬 A、90 春 B、180 夏 C、270 秋 D）と、その真夜中に南中する星座
  const SEASONS = [
    { name: '冬', a: 0, x: 226, y: 146, star: 'オリオン座' },
    { name: '春', a: 90, x: 176, y: 70, star: 'しし座' },
    { name: '夏', a: 180, x: 86, y: 146, anchor: 'end', star: 'さそり座' },
    { name: '秋', a: 270, x: 176, y: 200, star: 'ペガスス座' },
  ];
  const STAR_LABELS = [
    { name: 'オリオン座', x: 316, y: 92, anchor: 'end' },
    { name: 'しし座', x: 188, y: 30 },
    { name: 'さそり座', x: 4, y: 92 },
    { name: 'ペガスス座', x: 188, y: 222 },
  ];
  const STAR_DOTS = [[290, 120], [160, 24], [30, 120], [160, 216]];
  const ORBIT_PTS = [[222, 120], [160, 58], [98, 120], [160, 182]];
  // 太陽から角 φ の向きに、星の位置（横 130・たて 96 の楕円の上）まで、の距離
  function starDist(phi) {
    const c = Math.cos(deg(phi)), s = Math.sin(deg(phi));
    return 130 * 96 / Math.hypot(96 * c, 130 * s);
  }

  // 地球が公転し、真夜中の側の向き（太陽と反対）にある星座が変わる（space-2-c2）。φ = 360t
  function spOrbitMidnight(t) {
    const phi = 360 * t;
    const [ex, ey] = onCircle(160, 120, 62, phi);
    const now = nearest(SEASONS, phi);
    const [x1, y1] = onCircle(160, 120, 72, phi);
    const [x2, y2] = onCircle(160, 120, starDist(phi) - 8, phi);
    return [
      { type: 'circle', x: 160, y: 120, r: 62, fill: 'none', stroke: 'gray' },
      arcLine(160, 120, 62, 300, 330, { color: 'blue', width: 3, arrow: true }),
      { type: 'circle', x: 160, y: 120, r: 16, fill: 'yellow', stroke: 'orange' },
      text(160, 124, '太陽', 12, { anchor: 'middle' }),
      ...ORBIT_PTS.map(p => ({ type: 'circle', x: p[0], y: p[1], r: 9, fill: 'none', stroke: 'gray' })),   // 静止図の地球（うすい輪かく）
      ...STAR_LABELS.map(s => text(s.x, s.y, s.name, 12, Object.assign(s.anchor ? { anchor: s.anchor } : {},
        s.name === now.star ? { color: 'blue', bold: true } : {}))),
      ...STAR_DOTS.map(p => ({ type: 'circle', x: p[0], y: p[1], r: 6, fill: 'yellow', stroke: 'orange' })),
      ...litBody(ex, ey, 11, phi + 180, 'sky', NIGHT),   // 昼の側は太陽の向き
      { type: 'line', points: [[x1, y1], [x2, y2]], color: 'blue', width: 2, dashed: true, arrow: true },   // 真夜中の側の向き
      ...SEASONS.map(s => text(s.x, s.y, s.name, 13, Object.assign(s.anchor ? { anchor: s.anchor } : {}, { bold: true },
        s === now ? { color: 'blue' } : {}))),
      text(4, 236, now.name + 'の真夜中→' + now.star + 'が南中', 12),
    ];
  }

  // content/space.js の tiltedEarth と同じ地軸（公転面に垂直な向きから 23.4° 右へ傾く。矢印の先が北極）
  const AXIS_DX = 26 * Math.sin(23.4 * Math.PI / 180), AXIS_DY = 26 * Math.cos(23.4 * Math.PI / 180);
  function axisLine(cx, cy, extra) {
    return Object.assign({ type: 'line', points: [[cx - AXIS_DX, cy + AXIS_DY], [cx + AXIS_DX, cy - AXIS_DY]], width: 2, arrow: true }, extra || {});
  }
  const SEASON_NAMES = ['夏', '秋', '冬', '春'];   // t = 0, 0.25, 0.5, 0.75 に近いとき

  // 地軸を傾けたまま、地球が楕円の軌道を回る（space-2-c3）。位置 = (160 − 120·cos 2πt, 110 + 30·sin 2πt)。
  // 横から見ているので、地球から見た太陽の向きで光って見える部分が変わる（手前では夜の側、奥では昼の側が見える）
  function spSeasons(t) {
    const c = Math.cos(2 * Math.PI * t), s = Math.sin(2 * Math.PI * t);
    const ex = 160 - 120 * c, ey = 110 + 30 * s;
    const back = s < -1 / 30;   // 奥（y が 110 より 1 以上小さい）。太陽の後ろに回る
    // 光って見える部分: 太陽の向き（横の成分 c、見る人に向かう成分 −s）。境目の楕円の倍率は s
    const earth = phaseItems(ex, ey, 14, s, c >= 0 ? 1 : -1, 'sky', NIGHT).concat([axisLine(ex, ey)]);
    const ghost = (x, y) => [
      { type: 'circle', x, y, r: 14, fill: 'glass', stroke: 'gray' },
      axisLine(x, y, { color: 'gray', width: 1.5 }),
    ];
    return [
      { type: 'ellipse', x: 160, y: 110, rx: 120, ry: 30, fill: 'none', stroke: 'gray' },
      ...ghost(40, 110), ...ghost(280, 110), ...ghost(160, 156),   // 静止図の地球（うすく）
      ...(back ? earth : []),
      { type: 'arrow', x1: 132, y1: 110, x2: 62, y2: 110, color: 'orange' },
      { type: 'arrow', x1: 188, y1: 110, x2: 258, y2: 110, color: 'orange' },
      { type: 'circle', x: 160, y: 108, r: 20, fill: 'yellow', stroke: 'orange' },
      ...(back ? [] : earth),
      text(40, 150, '夏至', 13, { anchor: 'middle', bold: true }),
      text(280, 150, '冬至', 13, { anchor: 'middle', bold: true }),
      text(160, 198, '春分・秋分', 12, { anchor: 'middle' }),
      text(8, 22, '矢印の先が北極（地軸の傾き 23.4°）', 12),
      text(160, 222, '北極が太陽のほうへ傾くと北半球は夏', 12, { anchor: 'middle' }),
      text(8, 40, '北半球は ' + SEASON_NAMES[Math.round(t * 4) % 4], 13, { color: 'blue', bold: true }),
    ];
  }

  // content/space.js の moonOrbit と同じ部品（地球 (160, 120)、軌道の半径 80、太陽の光は左から）
  function moonOrbit() {
    const items = [
      { type: 'arrow', x1: 6, y1: 60, x2: 40, y2: 60, color: 'orange' },
      { type: 'arrow', x1: 6, y1: 120, x2: 40, y2: 120, color: 'orange' },
      { type: 'arrow', x1: 6, y1: 180, x2: 40, y2: 180, color: 'orange' },
      text(6, 40, '太陽の光', 12),
      arcLine(160, 120, 80, 0, 360, { color: 'gray', width: 1.5, dashed: true }),
      arcLine(160, 120, 100, 300, 330, { color: 'blue', width: 3, arrow: true }),
      ...litBody(160, 120, 14, 180, 'sky', NIGHT),
      text(160, 152, '地球', 12, { anchor: 'middle' }),
    ];
    for (let a = 0; a < 360; a += 45) { const [x, y] = onCircle(160, 120, 80, a); items.push(...litBody(x, y, 9, 180, 'yellow', DARK)); }
    return items;
  }
  // 月の位置（角 θ）と名前。180 新月、216 三日月（約 3 日）、270 上弦、0 満月、90 下弦
  const MOON_NAMES = [
    { name: '新月', a: 180 }, { name: '三日月', a: 216 }, { name: '上弦の月', a: 270 },
    { name: '満月', a: 0 }, { name: '下弦の月', a: 90 },
  ];

  // 月が公転し、地球から見た形が満ち欠けする（space-3-c1）。θ = 180 + 360t
  function spMoonPhase(t) {
    const th = 180 + 360 * t;
    const thm = frac(th / 360) * 360;   // 0 以上 360 未満
    const [mx, my] = onCircle(160, 120, 80, th);
    let k = (1 + Math.cos(deg(th))) / 2;   // 光って見える割合（0 新月〜1 満月）
    if (k < 0.005) k = 0;                  // 新月の前後は光る所なし（t = 1 と t = 0 をつなぐ）
    const waning = thm < 180;              // 満月 → 下弦 → 新月 のあいだは欠けていく
    const name = MOON_NAMES.find(m => angDiff(thm, m.a) <= 15);
    const items = moonOrbit().concat([
      text(316, 236, '月の公転の向き', 12, { anchor: 'end' }),
      text(316, 20, '北極側から見た図', 12, { anchor: 'end' }),
      ...litBody(mx, my, 11, 180, 'yellow', DARK),   // 動く月（太陽のほうの半分が光る）
      text(284, 82, '見える形', 12, { anchor: 'middle' }),
      ...moonShape(284, 110, 18, k, waning),
    ]);
    if (name) items.push(text(284, 148, name.name, 12, { anchor: 'middle', color: 'blue', bold: true }));
    return items;
  }

  // content/space.js の NOON・noonBase と同じ部品（北緯 35° の地点の南中高度。観測地点 (150, 200)、半径 140）
  const NOON = { summer: onCircle(150, 200, 140, 78.4), equinox: onCircle(150, 200, 140, 55), winter: onCircle(150, 200, 140, 31.6) };
  function noonBase() {
    return [
      arcLine(150, 200, 140, 0, 180, { color: 'gray', width: 1.5, dashed: true }),
      { type: 'line', points: [[6, 200], [314, 200]], color: 'brown', width: 3 },
      { type: 'circle', x: 150, y: 200, r: 4, fill: 'ink', stroke: 'none' },
      text(296, 220, '南', 14, { anchor: 'middle', bold: true }),
      text(20, 220, '北', 14, { anchor: 'middle', bold: true }),
      text(150, 220, '観測地点', 12, { anchor: 'middle' }),
    ];
  }
  // 1 年の中の位置 t → 南中高度 α = 55 + 23.4·cos(2π·g(t))（t = 0 夏至 78.4°、0.25 秋分 55°、0.5 冬至 31.6°、0.75 春分）。
  // g(t) = t + 0.6·sin(4πt)/(4π) で、春分・秋分のあたりをゆっくり（速さ 0.4 倍）にする（cos だけでは春分・秋分の前後が速すぎて
  // 「春分・秋分 55°」の文字が青くなる時間が短い）。g(0) = 0、g(0.25) = 0.25、g(0.5) = 0.5、g(1) = 1 なので 1 周でつながる
  function noonAltitude(t) {
    const g = t + 0.6 * Math.sin(4 * Math.PI * t) / (4 * Math.PI);
    return 55 + 23.4 * Math.cos(2 * Math.PI * g);
  }
  // いまの太陽の道の半径と大きさ（外側のはし 122 + 9 = 131 が、静止図の太陽の内側のはし 140 − 9 と同じ。文字は 143 より外）
  const NOON_NOW_R = 122, NOON_NOW_SIZE = 9;
  // 静止図の季節の文字（左上の一覧と太陽の横の名前）と、その南中高度
  const NOON_SEASONS = [
    { a: 78.4, list: ['夏至 78.4°', 8, 38], name: ['夏至', 190, 60] },
    { a: 55, list: ['春分・秋分 55°', 8, 54], name: ['春分・秋分', 244, 84] },
    { a: 31.6, list: ['冬至 31.6°', 8, 70], name: ['冬至', 282, 124] },
  ];

  // 季節とともに南中する太陽の高さが変わる（space-2-c4）。静止図は content/space.js の space-2-c4
  function spNoonAltitude(t) {
    const a = noonAltitude(t);
    // いまの太陽は、点線の天球（半径 140）の少し内側（半径 NOON_NOW_R）を動かす。天球の上だと「夏至」「春分・秋分」の文字にかかるため
    const [sx, sy] = onCircle(150, 200, NOON_NOW_R, a);
    const items = noonBase().concat([
      { type: 'line', points: [[150, 200], NOON.summer], color: 'gray', width: 1.5 },
      { type: 'line', points: [[150, 200], NOON.equinox], color: 'gray', width: 1.5 },
      { type: 'line', points: [[150, 200], NOON.winter], color: 'gray', width: 1.5 },
      { type: 'circle', x: NOON.summer[0], y: NOON.summer[1], r: 9, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: NOON.equinox[0], y: NOON.equinox[1], r: 9, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: NOON.winter[0], y: NOON.winter[1], r: 9, fill: 'yellow', stroke: 'orange' },
      // いまの太陽: 観測地点からの線、南の地平線からの角（半径 36 の弧）
      { type: 'line', points: [[150, 200], [sx, sy]], color: 'orange', width: 2 },
      arcLine(150, 200, 36, 0, a, { color: 'blue', width: 2 }),
      { type: 'circle', x: sx, y: sy, r: NOON_NOW_SIZE, fill: 'yellow', stroke: 'orange' },
    ]);
    NOON_SEASONS.forEach(s => {
      const on = Math.abs(a - s.a) <= 2 ? { color: 'blue', bold: true } : {};
      items.push(text(s.name[1], s.name[2], s.name[0], 12, on));
    });
    items.push(text(8, 20, '北緯 35° の地点', 12, { bold: true }));
    NOON_SEASONS.forEach(s => {
      const on = Math.abs(a - s.a) <= 2 ? { color: 'blue', bold: true } : {};
      items.push(text(s.list[1], s.list[2], s.list[0], 12, on));
    });
    // いまの南中高度（観測地点の左上の空いた所。点線の弧・角の弧・観測地点からの線にかからない）
    items.push(text(24, 160, 'いまの南中高度 ' + Number(a.toFixed(1)) + '°', 12, { color: 'blue', bold: true }));
    return items;
  }

  // 太陽の黒点が、左のふちの近くから右のふちの近くへ動く（space-4-c2）。静止図は content/space.js の space-4-c2。
  // 太陽の自転の周期は約 27 日なので、1 日目 → 13 日目の 12 日で黒点は経度で約 160° 進む（1 日に 13.3°）。
  // 黒点の経度 φ = 80·(2p − 1) 度（p = stage(t, 0, 0.85)。1 日目 −80°、7 日目 0°、13 日目 +80°）。
  // 黒点は太陽の中心より 8 上（y 112）にあるので、その高さで見える円の半径 √(46² − 8²) から、ふちで黒点が円の外へ出ないよう 2 引いた
  // SPOT_HALF を使う: x = 中心 + SPOT_HALF·sin φ。
  // 横の半径 = 6·cos φ（球の表面の円をななめから見た形。ふちでは細長い）
  const SPOT_DEG_PER_DAY = 160 / 12;
  const SPOT_HALF = Math.sqrt(46 * 46 - 8 * 8) - 2;
  function sunspotPhi(t) { return 80 * (2 * stage(t, 0, 0.85) - 1); }
  function spotItem(cx, phi) {
    return { type: 'ellipse', x: cx + SPOT_HALF * Math.sin(deg(phi)), y: 112, rx: Math.max(1.2, 6 * Math.cos(deg(phi))), ry: 6, fill: SPOT_COLOR, stroke: 'none' };
  }
  const SPOT_REST = 0.425;   // φ = 0（7 日目、静止図の真ん中の黒点）
  const SPOT_COLOR = '#5A4A2A';
  function spSunspot(t) {
    const phi = sunspotPhi(t);
    const day = Math.round(7 + phi / SPOT_DEG_PER_DAY);
    return [
      { type: 'circle', x: 56, y: 120, r: 46, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: 160, y: 120, r: 46, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: 264, y: 120, r: 46, fill: 'yellow', stroke: 'orange' },
      // 左右の太陽の 1 日目・13 日目の黒点も、同じ自転の速さ（±80°）の位置に描く
      // （静止図は中心から横に 38・横の半径 2.5 で、約 ±56° にあたる。静止図もこの位置に直すとよい）
      spotItem(56, -80),
      spotItem(160, phi),
      spotItem(264, 80),
      text(56, 60, '1 日目', 12, { anchor: 'middle' }),
      // 真ん中の太陽の上: いまが何日目か（7 日目のとき静止図と同じ文字）
      text(160, 60, day + ' 日目', 12, { anchor: 'middle' }),
      text(264, 60, '13 日目', 12, { anchor: 'middle' }),
      { type: 'arrow', x1: 40, y1: 190, x2: 280, y2: 190, color: 'blue' },
      text(160, 212, '黒点が同じ向きに動く → 自転', 12, { anchor: 'middle' }),
      text(160, 232, '中央では円形、ふちでは細長い → 球形', 12, { anchor: 'middle' }),
    ];
  }

  // ================================================================
  // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md の「動く図（新規）」の地学の 6 本
  // ================================================================

  // ---- 火山と地震（volcano）----

  // 震源 (160,170) から輪が広がり、地表に届くと震央の丸、さらに観測地点 (270,70) に届くと観測地点の丸が大きくなる
  // （volcano-mp3-c1）。進め方は vo-quake-spread と同じ: 輪 k（0〜4）の半径 = 10 + wrap(30k + 150t, 0, 150)。
  // t = 0 で 10・40・70・100・130（40・70 は静止図の輪）。描くのは 12〜156。半径 72 以下は静止図と同じ circle、
  // それより大きい輪は地表（y 70）より下・地層の下のはし（y 240）より上の弧（左右 2 本の line）
  const FOCUS = [160, 170];
  const FOCUS_EPI_R = 100, FOCUS_OBS_R = Math.hypot(270 - 160, 70 - 170);   // 震央・観測地点までの距離（約 148.7）
  function focusRing(r) {
    if (r <= 72) return [{ type: 'circle', x: FOCUS[0], y: FOCUS[1], r, fill: 'none' }];
    const a0 = Math.asin(Math.min(1, 100 / r)) * 180 / Math.PI;   // 地表で切る角
    const b0 = Math.asin(Math.min(1, 70 / r)) * 180 / Math.PI;    // 下のはしで切る角
    return [
      { type: 'line', points: arc(FOCUS[0], FOCUS[1], r, -b0, a0, 24), color: 'gray', width: 2 },
      { type: 'line', points: arc(FOCUS[0], FOCUS[1], r, 180 - a0, 180 + b0, 24), color: 'gray', width: 2 },
    ];
  }
  function voFocusEpicenter(t) {
    const rings = [];
    let epi = false, obs = false;
    for (let k = 0; k < 5; k++) {
      const r = 10 + wrap(30 * k + 150 * t, 0, 150);
      if (r > FOCUS_EPI_R && r <= FOCUS_EPI_R + 6) epi = true;   // ゆれが震央に届いた直後
      if (r > FOCUS_OBS_R && r <= FOCUS_OBS_R + 6) obs = true;   // ゆれが観測地点に届いた直後
      if (r < 12 || r > 156) continue;
      rings.push(...focusRing(r));
    }
    return [
      { type: 'rect', x: 0, y: 70, width: 320, height: 170, fill: 'sand', stroke: 'none' },
      { type: 'line', points: [[0, 70], [320, 70]], color: 'line', width: 2 },
      ...rings,
      { type: 'circle', x: 160, y: 170, r: 6, fill: 'red' },
      { type: 'circle', x: 160, y: 70, r: epi ? 9 : 6, fill: 'orange' },
      { type: 'line', points: [[160, 76], [160, 164]], color: 'gray', width: 2, dashed: true },
      text(172, 190, '震源', 13),
      text(160, 56, '震央', 13, { anchor: 'middle' }),
      text(168, 124, '震源の深さ', 12),
      { type: 'circle', x: 270, y: 70, r: obs ? 9 : 5, fill: 'blue' },
      text(270, 56, '観測地点', 12, { anchor: 'middle' }),
      { type: 'line', points: [[166, 66], [264, 66]], color: 'blue', width: 1, dashed: true },
      text(216, 34, '震央距離', 12, { anchor: 'middle' }),
    ];
  }

  // 地震計のペンが記録の線を左から描き、ペン先が通った所から P 波が着く・初期微動・S 波が着く・主要動・
  // 初期微動継続時間の文字が出る（volcano-mp3-c2）。線は vo-seismogram と同じ seismoPoints。文字の位置は静止図のまま
  function seismoTrace(pen) {
    if (pen >= 304) return { pts: SEISMO.map(p => [p[0], p[1]]), penY: 120 };
    const pts = SEISMO.filter(p => p[0] <= pen).map(p => [p[0], p[1]]);
    const a = SEISMO[pts.length - 1], b = SEISMO[pts.length];
    const penY = lerp(a[1], b[1], (pen - a[0]) / (b[0] - a[0]));
    pts.push([pen, penY]);
    return { pts, penY };
  }
  function voTremorRecord(t) {
    const pen = 20 + 284 * stage(t, 0, 0.9);
    const { pts, penY } = seismoTrace(pen);
    const items = [];
    if (pen > 20) items.push({ type: 'line', points: pts, color: 'ink', width: 2 });
    // 初期微動継続時間の両向き矢印（P 波が着いてから伸び、S 波が着いたら両向きにする）
    if (pen >= 150) {
      items.push(
        { type: 'line', points: [[70, 170], [150, 170]], color: 'blue', width: 2, arrow: true },
        { type: 'line', points: [[150, 170], [70, 170]], color: 'blue', width: 2, arrow: true },
      );
    } else if (pen >= 80) {
      items.push({ type: 'line', points: [[70, 170], [pen, 170]], color: 'blue', width: 2, arrow: true });
    }
    if (pen >= 150) items.push(text(110, 192, '初期微動継続時間', 12, { anchor: 'middle' }));
    if (pen >= 110) items.push(text(110, 96, '初期微動', 13, { anchor: 'middle' }));
    if (pen >= 200) items.push(text(220, 66, '主要動', 13, { anchor: 'middle' }));
    if (pen >= 70) items.push(text(70, 220, 'P 波が着く', 12, { anchor: 'middle' }));
    if (pen >= 150) items.push(text(160, 220, 'S 波が着く', 12, { anchor: 'middle' }));
    items.push({ type: 'circle', x: pen, y: penY, r: 4, fill: 'blue', stroke: 'none' });   // ペン先
    return items;
  }

  // P 波（秒速 8 km）・S 波（秒速 4 km）のグラフで、時間のカーソルが 0 → 50 秒へ動く。80 km の高さで P 波（10 秒）から
  // S 波（20 秒）まで橙の帯が伸び、「10 秒」が出る（volcano-mp3-c3）。進め方は vo-ps-graph と同じ。
  // 目盛りは content/volcano.js の volcano-mp3-c3 と同じ（x = 50 + 4.8 × 秒、y = 200 − 0.8 × km）
  const PS80_P = 8, PS80_S = 4;
  function voPs80km(t) {
    const x = 50 + 240 * stage(t, 0, 0.9);
    const sec = (x - 50) / 4.8;
    const items = [];
    [160, 120, 80, 40].forEach(y => items.push({ type: 'line', points: [[50, y], [290, y]], color: 'glass', width: 1 }));
    [98, 146, 194, 242, 290].forEach(gx => items.push({ type: 'line', points: [[gx, 200], [gx, 40]], color: 'glass', width: 1 }));
    items.push(
      { type: 'line', points: [[50, 200], [50, 30]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [304, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 136], [98, 136]], color: 'gray', width: 1, dashed: true },   // 80 km の高さ
      { type: 'line', points: [[50, 200], [170, 40]], color: 'blue', width: 3 },
      { type: 'line', points: [[50, 200], [290, 40]], color: 'green', width: 3 },
    );
    if (x > 98) items.push({ type: 'line', points: [[98, 136], [Math.min(x, 146), 136]], color: 'orange', width: 4 });
    if (x >= 146) items.push(text(122, 130, '10 秒', 12, { anchor: 'middle', color: 'orange', bold: true }));
    items.push(
      text(128, 60, 'P波', 13, { color: 'blue', bold: true }),
      text(250, 76, 'S波', 13, { color: 'green', bold: true }),
      text(56, 22, '震源からの距離〔km〕', 12),
      text(306, 236, '地震発生からの時間〔秒〕', 12, { anchor: 'end' }),
      text(50, 216, '0', 12, { anchor: 'middle' }),
      text(98, 216, '10', 12, { anchor: 'middle' }),
      text(146, 216, '20', 12, { anchor: 'middle' }),
      text(194, 216, '30', 12, { anchor: 'middle' }),
      text(242, 216, '40', 12, { anchor: 'middle' }),
      text(290, 216, '50', 12, { anchor: 'middle' }),
      text(44, 124, '100', 12, { anchor: 'end' }),
      text(44, 44, '200', 12, { anchor: 'end' }),
      text(44, 140, '80', 12, { anchor: 'end', color: 'gray' }),
      { type: 'line', points: [[x, 200], [x, 34]], color: 'blue', width: 2, dashed: true },   // カーソル
    );
    if (PS80_P * sec <= 200) items.push({ type: 'circle', x, y: 200 - 0.8 * PS80_P * sec, r: 5, fill: 'blue', stroke: 'none' });
    if (PS80_S * sec <= 200) items.push({ type: 'circle', x, y: 200 - 0.8 * PS80_S * sec, r: 5, fill: 'green', stroke: 'none' });
    const right = x > 250;
    items.push(text(right ? x - 6 : x + 6, 194, Math.round(sec) + ' 秒', 12, { anchor: right ? 'end' : 'start', color: 'blue', bold: true }));
    return items;
  }

  // はじめは 2 つの地面が同じ高さ。断層に沿って左が上がり（隆起）、右が下がる（沈降）。動いた量だけ青い矢印が伸びる
  // （volcano-mp4-c2）。止まった絵（0.99）が静止図と同じずれ（左の上 y 120、右の上 y 140）
  function voFaultUplift(t) {
    const d = ease(stage(t, 0.1, 0.7));
    const up = 10 * (1 - d);   // 左の地面の、静止図からの下がり（右は同じだけ上）
    const shift = (pts, dy) => pts.map(([x, y]) => [x, y + dy]);
    const items = [
      { type: 'polygon', points: shift([[20, 120], [150, 120], [170, 200], [20, 200]], up), fill: 'sand' },
      { type: 'polygon', points: shift([[150, 140], [300, 140], [300, 220], [170, 220]], -up), fill: 'sand' },
      { type: 'line', points: [[140, 90], [190, 230]], width: 3 },
    ];
    if (30 * d >= 14) {
      items.push(
        { type: 'arrow', x1: 90, y1: 110 + up, x2: 90, y2: 110 + up - 30 * d, color: 'blue' },
        { type: 'arrow', x1: 240, y1: 120, x2: 240, y2: 120 + 30 * d, color: 'blue' },
      );
    }
    items.push(
      text(90, 66, '隆起', 13, { anchor: 'middle' }),
      text(240, 108, '沈降', 13, { anchor: 'middle' }),
      text(200, 52, '断層', 13),
      { type: 'line', points: [[198, 48], [152, 120]], color: 'line', width: 1 },
    );
    if (t >= 0.1 && t < 0.7) items.push(text(20, 30, '断層がずれる', 13, { color: 'red', bold: true }));
    return items;
  }

  // ---- 地層と大地の変化（strata）----

  // 川から海へ流れこんだれき（大）・砂（中）・泥（小）が、大きい粒ほど早くしずんで河口の近くに、小さい粒ほど沖に積もる
  // （strata-mp1-c2）。止まった絵（0.99）は静止図と同じ粒の位置。粒の文字は、その粒が積もってから出す
  const SORT_FROM = [64, 76];   // 河口（川の矢印の先の下）
  const SORT_GROUPS = [
    { start: 0.05, dur: 0.3, r: 6, fill: 'rock', stroke: 'ink', label: [100, 100, 'れき'], pts: [[86, 112], [100, 116], [114, 120]] },
    { start: 0.2, dur: 0.4, r: 3, fill: 'sand', stroke: 'ink', label: [178, 124, '砂'], pts: [[160, 136], [172, 140], [184, 144], [196, 148]] },
    { start: 0.35, dur: 0.5, r: 2, fill: '#C9A27E', stroke: 'none', label: [270, 160, '泥'], pts: [[250, 170], [260, 174], [270, 177], [280, 181], [290, 184]] },
  ];
  function srSortDeposit(t) {
    const items = [
      { type: 'rect', x: 60, y: 70, width: 260, height: 170, fill: 'water', stroke: 'none' },
      { type: 'polygon', points: [[60, 110], [320, 200], [320, 240], [60, 240]], fill: '#D8D2C6', stroke: 'none' },
      { type: 'polygon', points: [[0, 58], [60, 70], [60, 240], [0, 240]], fill: 'lightgreen', stroke: 'none' },
      { type: 'line', points: [[0, 58], [60, 70]], color: 'line', width: 2 },
      { type: 'line', points: [[60, 70], [320, 70]], color: 'blue', width: 2 },
      { type: 'line', points: [[60, 110], [320, 200]], color: 'line', width: 2 },
      { type: 'arrow', x1: 6, y1: 48, x2: 76, y2: 60, color: 'blue' },
      text(8, 36, '川', 14),
      text(70, 232, '河口の近く', 12),
      text(314, 232, '沖', 12, { anchor: 'end' }),
    ];
    SORT_GROUPS.forEach(g => {
      if (t < g.start) return;
      g.pts.forEach(([x, y], i) => {
        const p = stage(t, g.start + 0.02 * i, g.start + 0.02 * i + g.dur);
        // 横は流れに乗って先に進み（はじめ速く）、たては同じ速さでしずむ
        const q = 1 - (1 - p) * (1 - p);
        const it = { type: 'circle', x: lerp(SORT_FROM[0], x, q), y: lerp(SORT_FROM[1], y, p), r: g.r, fill: g.fill };
        if (g.stroke === 'none') it.stroke = 'none';
        items.push(it);
      });
      if (t >= g.start + 0.02 * (g.pts.length - 1) + g.dur) items.push(text(g.label[0], g.label[1], g.label[2], 12, { anchor: 'middle' }));
    });
    return items;
  }

  // はじめは 2 つの大陸が 1 つにくっついている。プレートの矢印の向きに少しずつ左右へ離れ、静止図の位置で止まる
  // （strata-mp2-c4）。止まった絵（0.99）が静止図と同じ
  const DRIFT = 12;   // はじめの、静止図からの寄せ（左の大陸は右へ、右の大陸は左へ）
  function srContinentDrift(t) {
    const d = ease(stage(t, 0.1, 0.8));
    const off = DRIFT * (1 - d);
    const move = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);
    const items = [
      { type: 'polygon', points: move([[90, 70], [150, 60], [170, 110], [140, 170], [100, 150], [80, 110]], off), fill: 'lightgreen' },
      { type: 'polygon', points: move([[176, 60], [240, 70], [250, 120], [210, 180], [180, 130]], -off), fill: 'lightgreen' },
    ];
    if (40 * d >= 14) {
      items.push(
        { type: 'arrow', x1: 110, y1: 200, x2: 110 - 40 * d, y2: 200, color: 'blue' },
        { type: 'arrow', x1: 210, y1: 200, x2: 210 + 40 * d, y2: 200, color: 'blue' },
      );
    }
    items.push(
      text(160, 36, '大陸は少しずつ移動している', 14, { anchor: 'middle' }),
      text(160, 228, 'プレートの動き', 13, { anchor: 'middle' }),
    );
    if (t < 0.1) items.push(text(160, 200, '1 つの大陸', 12, { anchor: 'middle', color: 'green', bold: true }));
    return items;
  }

  // ================================================================
  // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」の天気の 16 本
  // 静止図は content/weather.js の weather-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // ================================================================

  // 粒（空気・水・雪など）
  function grain(x, y, r, fill, stroke) { return { type: 'circle', x, y, r, fill, stroke: stroke || 'none' }; }
  // 道すじ pts の上に n 個の粒を流す（k 番目は frac(t·speed + (k + 0.5)/n)。t = 1 と t = 0 がつながる）
  function flowOn(pts, t, n, speed, make) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const q = along(pts, frac(speed * t + (k + 0.5) / n));
      out.push(make(q, k));
    }
    return out;
  }
  // 折れ線を x ≦ xEnd の所まで（グラフの線を左から伸ばす）
  function clipX(pts, xEnd) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p[0] <= xEnd + 1e-9) { out.push([p[0], p[1]]); continue; }
      const a = pts[i - 1];
      if (a) out.push([xEnd, lerp(a[1], p[1], (xEnd - a[0]) / (p[0] - a[0]))]);
      break;
    }
    return out;
  }
  // 日本列島（content/weather.js の weather-mp9-c2・mp13-c3 の静止図と同じ 4 つの島）
  function japanMp() {
    const land = { fill: 'lightgreen', stroke: 'line' };
    return [
      Object.assign({ type: 'polygon', points: [[236.8, 68.8], [264, 64], [276.8, 80], [256, 92.8], [241.6, 89.6]] }, land),
      Object.assign({ type: 'polygon', points: [[240, 102.4], [249.6, 113.6], [240, 134.4], [222.4, 152], [196.8, 164.8], [168, 172.8], [142.4, 180.8], [129.6, 177.6], [134.4, 168], [160, 160], [188.8, 148.8], [211.2, 134.4], [228.8, 116.8]] }, land),
      Object.assign({ type: 'polygon', points: [[148.8, 185.6], [172.8, 182.4], [168, 193.6], [150.4, 193.6]] }, land),
      Object.assign({ type: 'polygon', points: [[116.8, 180.8], [132.8, 184], [134.4, 203.2], [120, 209.6], [112, 196.8]] }, land),
    ];
  }

  // ---- 露点のグラフ（weather-mp4-c2）----
  // 横 x = 50 + 7.5 × 気温〔℃〕、たて y = 200 − 4.8 × 水蒸気量〔g/m³〕。空気 A は 30 ℃・15 g/m³ (275,128)
  const DEW_CURVE = [[50, 177], [68.8, 172.2], [87.5, 167.4], [106.3, 162.1], [125, 154.9], [143.8, 147.7], [162.5, 138.6],
    [181.3, 128.5], [200, 117], [218.8, 104], [237.5, 89.1], [256.3, 72.8], [275, 54.1], [290, 37.8]];
  // 露点 (181.3,128) から曲線にそって 5 ℃ (87.5,167.4) まで
  const DEW_DOWN = [[181.3, 128], [162.5, 138.6], [143.8, 147.7], [125, 154.9], [106.3, 162.1], [87.5, 167.4]];
  function dewGraphItems() {
    const items = [];
    [87.5, 125, 162.5, 200, 237.5, 275].forEach(x => items.push({ type: 'line', points: [[x, 200], [x, 36.8]], color: '#D5DBE5', width: 1 }));
    [176, 152, 128, 104, 80, 56].forEach(y => items.push({ type: 'line', points: [[50, y], [290, y]], color: '#D5DBE5', width: 1 }));
    items.push(
      { type: 'line', points: [[50, 200], [50, 26]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [306, 200]], width: 2, arrow: true },
      { type: 'line', points: DEW_CURVE, color: 'blue', width: 3 },
      text(50, 216, '0', 12, { anchor: 'middle' }),
      text(125, 216, '10', 12, { anchor: 'middle' }),
      text(200, 216, '20', 12, { anchor: 'middle' }),
      text(275, 216, '30', 12, { anchor: 'middle' }),
      text(44, 156, '10', 12, { anchor: 'end' }),
      text(44, 108, '20', 12, { anchor: 'end' }),
      text(44, 60, '30', 12, { anchor: 'end' }),
      text(56, 18, '水蒸気量〔g/m³〕', 12),
      text(306, 234, '気温〔℃〕', 12, { anchor: 'end' }),
    );
    return items;
  }
  // 空気 A の点が左へ動き（冷える）、曲線とぶつかる所で「露点」。さらに曲線にそって 5 ℃ まで下がり、
  // 下がった所で水滴になる量（橙の棒）が伸びる。止まった絵（0.99）が静止図と同じ（A の点は静止図の位置に残す）
  function weDewPointGraph(t) {
    const p = stage(t, 0, 0.4), q = stage(t, 0.45, 0.8);
    const items = dewGraphItems();
    let x = lerp(275, 181.3, p), y = 128;
    if (q > 0) { const a = along(DEW_DOWN, q); x = a.x; y = a.y; }
    if (x < 274.5) items.push({ type: 'line', points: [[275, 128], [x, 128]], color: 'gray', width: 2, dashed: true });
    if (q > 0) items.push({ type: 'line', points: [[x, 128], [x, y]], color: 'orange', width: 4 });
    items.push(
      { type: 'circle', x: 275, y: 128, r: 5, fill: 'ink', stroke: 'none' },
      text(284, 122, 'A', 14, { bold: true }),
    );
    if (t >= 0.8) items.push(text(93.5, 151.2, '水滴になる', 12));
    if (p >= 1) items.push(text(181.3, 116, '露点', 13, { anchor: 'middle', bold: true }));
    // 温度は四捨五入で出す。露点（曲線にぶつかって止まっているあいだ）だけは 0.5 ℃ きざみで「17.5 ℃」
    const temp = (x - 50) / 7.5;
    const shown = p >= 1 && q === 0 ? Math.round(temp * 2) / 2 : Math.round(temp);
    items.push(
      { type: 'circle', x, y, r: 5, fill: 'blue', stroke: 'none' },
      text(62, 44, '空気の温度 ' + shown + ' ℃', 12, { color: 'blue', bold: true }),
    );
    return items;
  }

  // ---- 雲のでき方（weather-mp7-c1）----
  // 雲の中の印の t = 0 の位置（静止図の ○ 水蒸気 4・● 水滴 5・× 氷の粒 4 の中心）
  const RISE_MARKS = [[180, 190], [220, 180], [250, 198], [200, 166], [170, 120], [205, 108], [240, 124], [225, 140], [185, 140],
    [180, 56], [215, 46], [250, 64], [200, 74]];
  // 高さで印を変える: y 160 より下は ○ 水蒸気、y 90 より上は × 氷の粒、そのあいだは ● 水滴
  function riseMark(x, y) {
    if (y > 160) return [{ type: 'circle', x, y, r: 5, fill: 'white', stroke: 'ink' }];
    if (y >= 90) return [{ type: 'circle', x, y, r: 5, fill: 'ink', stroke: 'ink' }];
    return [
      { type: 'line', points: [[x - 5, y - 5], [x + 5, y + 5]], width: 2 },
      { type: 'line', points: [[x - 5, y + 5], [x + 5, y - 5]], width: 2 },
    ];
  }
  // 空気のかたまりが矢印にそって上がり、上がるほど大きく（膨張）、色が冷たくなる（we-cloud-form と同じ mix）。
  // 雲の中の印は下から上へ流れ（1 周で 167 ＝ 流す範囲 y 40〜207 の長さ。t = 0 で静止図の位置）、高さで ○ → ● → × に変わる
  function weRisingAir(t) {
    const p = frac(t + 0.5);   // かたまりの進み方（t = 0 で真ん中。上で消えて下から出直すのは t = 0.5）
    const items = [
      { type: 'rect', x: 0, y: 0, width: 320, height: 240, fill: 'sky', stroke: 'none' },
      { type: 'rect', x: 0, y: 214, width: 320, height: 26, fill: 'sand', stroke: 'none' },
      { type: 'arrow', x1: 70, y1: 206, x2: 70, y2: 40, color: 'orange' },
      { type: 'circle', x: 70, y: lerp(200, 50, p), r: lerp(6, 10, p), fill: mix('#F2B26B', '#CFE4FF', p), stroke: 'line' },
      text(80, 120, '上昇する空気', 12),
      { type: 'ellipse', x: 210, y: 92, rx: 80, ry: 60, fill: 'white', stroke: 'gray' },
    ];
    RISE_MARKS.forEach(([x, y0]) => items.push(...riseMark(x, wrap(y0 - 167 * t, 40, 207))));
    items.push(
      text(6, 150, '× 氷の粒', 12),
      text(6, 168, '● 水滴', 12),
      text(6, 186, '○ 水蒸気', 12),
      text(8, 20, '上空ほど気圧が低く、温度も低い', 12),
    );
    return items;
  }

  // ---- 水の循環（weather-mp7-c2）----
  const CYCLE_UP = [[70, 184], [130, 76]], CYCLE_RAIN = [[236, 84], [252, 140]], CYCLE_RIVER = [[200, 196], [136, 214]];
  // 蒸発の矢印を水蒸気（白い小丸）が上がり、降水の矢印を雨（青い点）が落ち、川の矢印を水が海へもどる。太陽はゆっくり光る
  function weWaterCycle(t) {
    const glow = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
    return [
      { type: 'rect', x: 0, y: 0, width: 320, height: 240, fill: 'sky', stroke: 'none' },
      { type: 'rect', x: 0, y: 190, width: 150, height: 50, fill: '#9CC3F0', stroke: 'none' },
      { type: 'polygon', points: [[150, 240], [150, 190], [230, 120], [320, 180], [320, 240]], fill: 'lightgreen' },
      { type: 'circle', x: 34, y: 34, r: 21 + 3 * glow, fill: 'none', stroke: 'yellow' },
      { type: 'circle', x: 34, y: 34, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'ellipse', x: 200, y: 56, rx: 60, ry: 24, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: 70, y1: 184, x2: 130, y2: 76, color: 'blue' },
      { type: 'arrow', x1: 236, y1: 84, x2: 252, y2: 140, color: 'blue' },
      { type: 'arrow', x1: 200, y1: 196, x2: 136, y2: 214, color: 'blue' },
      ...flowOn(CYCLE_UP, t, 4, 1, q => grain(q.x, q.y, 3.5, 'white', 'line')),
      ...flowOn(CYCLE_RAIN, t, 3, 1, q => grain(q.x, q.y, 3.5, 'blue', 'white')),
      ...flowOn(CYCLE_RIVER, t, 3, 1, q => grain(q.x, q.y, 3.5, 'blue', 'white')),
      text(74, 228, '海', 13, { anchor: 'middle' }),
      text(200, 61, '雲', 13, { anchor: 'middle' }),
      text(34, 70, '太陽', 12, { anchor: 'middle' }),
      text(108, 140, '蒸発', 13, { bold: true }),
      text(256, 116, '降水', 13, { bold: true }),
      text(176, 226, '川', 13, { bold: true }),
    ];
  }

  // ---- 等圧線と風（weather-mp8-c1）----
  // 地点 S から、はじめは等圧線に直角（右）へ進み、右（南）へずれて「実際の風」(204,152) の向きになる道すじ。
  // 2 次のベジェ曲線 S (161,120) → (182,120) → (214.25,144)。終わりの向き (32.25, 24) は実際の風の矢印 (43, 32) と同じ
  const ISO_PATH = (() => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const s = i / 16;
      pts.push([(1 - s) * (1 - s) * 161 + 2 * (1 - s) * s * 182 + s * s * 214.25, (1 - s) * (1 - s) * 120 + 2 * (1 - s) * s * 120 + s * s * 144]);
    }
    return pts;
  })();
  // 空気の粒 3 つが時間をずらして S から出る（t = 0 で 1 つが S の上）
  function weIsobarWind(t) {
    const dots = [];
    for (let k = 0; k < 3; k++) {
      const q = along(ISO_PATH, frac(t + k / 3));
      dots.push(grain(q.x, q.y, 4, 'white', 'ink'));
    }
    return [
      text(40, 128, '高', 22, { anchor: 'middle', bold: true }),
      text(290, 128, '低', 22, { anchor: 'middle', bold: true }),
      { type: 'line', points: [[100, 30], [96, 120], [100, 210]], color: 'ink', width: 2 },
      { type: 'line', points: [[165, 30], [161, 120], [165, 210]], color: 'ink', width: 2 },
      { type: 'line', points: [[230, 30], [226, 120], [230, 210]], color: 'ink', width: 2 },
      text(100, 24, '1012', 12, { anchor: 'middle' }),
      text(165, 24, '1008', 12, { anchor: 'middle' }),
      text(230, 24, '1004', 12, { anchor: 'middle' }),
      { type: 'circle', x: 161, y: 120, r: 5, fill: 'ink', stroke: 'none' },
      text(150, 140, 'S', 14, { bold: true, anchor: 'end' }),
      { type: 'arrow', x1: 161, y1: 120, x2: 214, y2: 120, color: 'blue' },
      { type: 'arrow', x1: 161, y1: 120, x2: 162, y2: 70, color: 'blue' },
      { type: 'arrow', x1: 161, y1: 120, x2: 204, y2: 152, color: 'blue' },
      ...dots,
      text(316, 236, '上が北', 12, { anchor: 'end' }),
      text(208, 168, '実際の風', 12),
      text(40, 150, '気圧が高い', 12, { anchor: 'middle' }),
      text(290, 150, '気圧が低い', 12, { anchor: 'middle' }),
    ];
  }

  // ---- 高気圧と低気圧の断面（weather-mp8-c2）----
  // A（高気圧）: 上から下がり、地表で左右へふき出す。B（低気圧）: 地表で左右から集まり、上がって雲に入る。
  // 粒 k は左右の道を交互に使い、frac(t + (k + 0.5)/6) で進む（t = 1 と t = 0 がつながる）。雲は少しふくらんだりしぼんだり
  const SEC_A = [[[80, 50], [80, 184], [30, 184]], [[80, 50], [80, 184], [130, 184]]];
  const SEC_B = [[[190, 184], [240, 184], [240, 50]], [[290, 184], [240, 184], [240, 50]]];
  function wePressureSection(t) {
    const dots = [];
    for (let k = 0; k < 6; k++) {
      const f = frac(t + (k + 0.5) / 6);
      const a = along(SEC_A[k % 2], f), b = along(SEC_B[k % 2], f);
      dots.push(grain(a.x, a.y, 3.5, 'white', 'line'), grain(b.x, b.y, 3.5, 'white', 'line'));
    }
    const puff = osc(t, 1);
    return [
      { type: 'rect', x: 0, y: 196, width: 320, height: 44, fill: 'lightgreen', stroke: 'none' },
      { type: 'arrow', x1: 80, y1: 50, x2: 80, y2: 170, color: 'blue' },
      { type: 'arrow', x1: 78, y1: 184, x2: 30, y2: 184, color: 'blue', width: 2 },
      { type: 'arrow', x1: 82, y1: 184, x2: 130, y2: 184, color: 'blue', width: 2 },
      ...dots,
      { type: 'ellipse', x: 240, y: 40, rx: 50 + 4 * puff, ry: 18 + 2 * puff, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: 240, y1: 170, x2: 240, y2: 64, color: 'blue' },
      { type: 'arrow', x1: 190, y1: 184, x2: 236, y2: 184, color: 'blue', width: 2 },
      { type: 'arrow', x1: 290, y1: 184, x2: 244, y2: 184, color: 'blue', width: 2 },
      text(98, 110, 'A', 18, { bold: true }),
      text(258, 120, 'B', 18, { bold: true }),
      text(160, 228, '地表', 12, { anchor: 'middle' }),
      text(80, 36, '高気圧（下降気流）', 12, { anchor: 'middle' }),
      text(240, 92, '低気圧（上昇気流）', 12, { anchor: 'middle', bg: true }),
      text(80, 214, 'ふき出す', 12, { anchor: 'middle' }),
      text(240, 214, 'ふきこむ', 12, { anchor: 'middle' }),
    ];
  }

  // ---- 日本付近の海流（weather-mp9-c2）----
  const CURRENTS = [
    { pts: [[90, 228], [100, 180], [140, 150], [190, 128], [225, 98]], color: 'red' },     // 対馬海流（暖流）
    { pts: [[120, 238], [175, 212], [235, 180], [275, 140]], color: 'red' },              // 日本海流（暖流）
    { pts: [[312, 40], [300, 90], [280, 120], [262, 150]], color: 'blue' },               // 千島海流（寒流）
    { pts: [[200, 30], [150, 60], [105, 100], [80, 140]], color: 'blue' },                // リマン海流（寒流）
  ];
  // 4 本の海流の線の上を、矢印の向きに点が流れる（暖流は赤いふち、寒流は青いふちの白い点）
  function weOceanCurrent(t) {
    const items = japanMp();
    CURRENTS.forEach(c => items.push({ type: 'line', points: c.pts, color: c.color, width: 4, arrow: true }));
    CURRENTS.forEach(c => items.push(...flowOn(c.pts, t, 4, 1, q => grain(q.x, q.y, 3.5, 'white', c.color))));
    items.push(
      text(146, 132, '対馬海流', 12, { anchor: 'middle', bg: true }),
      text(214, 220, '日本海流（黒潮）', 12, { anchor: 'middle', bg: true }),
      text(316, 176, '千島海流', 12, { anchor: 'end', bg: true }),
      text(316, 192, '（親潮）', 12, { anchor: 'end', bg: true }),
      text(118, 62, 'リマン海流', 12, { anchor: 'middle', bg: true }),
      text(6, 20, '赤: 暖流　青: 寒流', 12),
    );
    return items;
  }

  // ---- 寒冷前線の断面（weather-mp10-c1）----
  // 寒冷前線の記号（content/weather.js の frontItems。静止図の 7 つの三角形）
  function coldFrontMarks() {
    const items = [{ type: 'line', points: [[60, 210], [260, 210]], color: 'blue', width: 3 }];
    for (let x = 66; x <= 222; x += 26) items.push({ type: 'polygon', fill: 'blue', stroke: 'none', points: [[x, 210], [x + 14, 210], [x + 7, 200]] });
    return items;
  }
  // 寒気のくさびが右へ 24 進み（t = 0 は静止図より 24 左）、暖気の粒が前線面にそって急に上へおし上げられて
  // 積乱雲に入る。積乱雲は ry 10 → 34 にたてにのびる。止まった絵（0.99）が静止図と同じ
  function weColdFrontSection(t) {
    const d = ease(stage(t, 0, 0.8));
    const dx = -24 * (1 - d);
    const warm = [[292, 124], [174 + dx, 124], [164 + dx, 96], [171, 48]];
    return [
      { type: 'rect', x: 20, y: 40, width: 280, height: 90, fill: '#FBE3EC', stroke: 'none' },
      { type: 'polygon', points: [[20, 130], [160 + dx, 130], [151.6 + dx, 108], [129.2 + dx, 82], [20, 68]], fill: 'sky', stroke: 'none' },
      ...flowOn(warm, t, 5, 1, q => grain(q.x, q.y, 3, 'orange')),
      { type: 'ellipse', x: 171.2, y: 78, rx: 16, ry: lerp(10, 34, d), fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: 42.4, y1: 112, x2: 104, y2: 112, color: 'blue' },
      { type: 'arrow', x1: 244, y1: 116, x2: 204.8, y2: 78, color: 'orange' },
      { type: 'line', points: [[20, 130], [300, 130]], color: 'brown', width: 3 },
      text(53.6, 100, '寒気', 14, { bold: true }),
      text(249.6, 74, '暖気', 14, { bold: true }),
      text(26, 56, '寒冷前線', 13, { bold: true }),
      text(170, 72, '積乱雲', 12, { bold: true }),
      text(150, 110, '前線面', 12, { anchor: 'end', bg: true }),
      text(160, 170, '前線（前線面と地表が交わる所）', 12, { anchor: 'middle' }),
      ...coldFrontMarks(),
    ];
  }

  // ---- 温暖前線の断面（weather-mp10-c2）----
  // 停滞前線・閉そく前線の記号（静止図と同じ。content/weather.js の frontItems）
  function warmSectionMarks() {
    const semi = (cx, y, up) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * i / 8;
        pts.push([Math.round((cx + 7 * Math.cos(a)) * 10) / 10, Math.round((y + (up ? -7 : 7) * Math.sin(a)) * 10) / 10]);
      }
      return pts;
    };
    const items = [];
    // 停滞前線（y 160）: 青と赤の線を 26 ずつ交互に、青い線には上向きの三角、赤い線には下向きの半円
    [[30, 'blue'], [56, 'red'], [82, 'blue'], [108, 'red'], [134, 'blue'], [160, 'red']].forEach(([x, c]) => {
      items.push({ type: 'line', points: [[x, 160], [x + 26, 160]], color: c, width: 3 });
      if (c === 'blue') items.push({ type: 'polygon', fill: 'blue', stroke: 'none', points: [[x + 6, 160], [x + 20, 160], [x + 13, 150]] });
      else items.push({ type: 'polygon', fill: 'red', stroke: 'none', points: semi(x + 13, 160, false) });
    });
    items.push({ type: 'line', points: [[186, 160], [200, 160]], color: 'blue', width: 3 });
    // 閉そく前線（y 210）: むらさきの線に三角と半円を交互に
    items.push({ type: 'line', points: [[30, 210], [200, 210]], color: 'purple', width: 3 });
    [36, 62, 88, 114, 140, 166].forEach((x, i) => {
      if (i % 2 === 0) items.push({ type: 'polygon', fill: 'purple', stroke: 'none', points: [[x, 210], [x + 14, 210], [x + 7, 200]] });
      else items.push({ type: 'polygon', fill: 'purple', stroke: 'none', points: semi(x + 7, 210, true) });
    });
    return items;
  }
  // 暖気の粒が橙の矢印の先から前線面にそってゆっくりはい上がる。乱層雲は rx 0 → 56 に横へ広がり、
  // 雲の下に弱い雨が広い範囲に落ちる。停滞前線・閉そく前線の記号は動かさない。止まった絵（0.99）が静止図と同じ
  const WARM_SLOPE = -50 / 240.8;   // 前線面 (59.2,120)→(300,70) の傾き
  const WARM_PATH = [[126, 92], [286, 92 + 160 * WARM_SLOPE]];
  function weWarmFrontSection(t) {
    const c = ease(stage(t, 0.1, 0.7));
    const items = [
      { type: 'rect', x: 20, y: 30, width: 280, height: 90, fill: '#FBE3EC', stroke: 'none' },
      { type: 'polygon', points: [[59.2, 120], [300, 120], [300, 70]], fill: 'sky', stroke: 'none' },
      ...flowOn(WARM_PATH, t, 5, 1, q => grain(q.x, q.y, 3, 'orange')),
      { type: 'ellipse', x: 204.8, y: 70, rx: 56 * c, ry: 10, fill: 'white', stroke: 'gray' },
    ];
    // 弱い雨（雲の下、x 156〜221 の 6 本。雲が半分より広がってから、雲の幅の中だけ）
    if (c > 0.5) {
      for (let k = 0; k < 6; k++) {
        const x = 156 + 13 * k;
        if (Math.abs(x - 204.8) > 56 * c - 4) continue;
        items.push(grain(x, lerp(84, 116, frac(2 * t + 0.37 * k + 0.1)), 2, 'blue'));
      }
    }
    items.push(
      { type: 'arrow', x1: 36.8, y1: 110, x2: 126.4, y2: 86, color: 'orange' },
      { type: 'line', points: [[20, 120], [300, 120]], color: 'brown', width: 3 },
      text(36.8, 70, '暖気', 14, { bold: true }),
      text(238.4, 112, '寒気', 14, { bold: true }),
      text(26, 46, '温暖前線', 13, { bold: true }),
      text(204, 64, '乱層雲', 12, { bold: true }),
      ...warmSectionMarks(),
      text(212, 164, '停滞前線', 13),
      text(212, 214, '閉そく前線', 13),
    );
    return items;
  }

  // ---- 水そうの実験（weather-mp10-c3）----
  // 0〜0.15: 左がぬるま湯（赤）、右が冷水（青）で、x 160 にしきり。0.12〜0.2 でしきりを上へぬく。
  // 0.15〜0.8: 青が底をはうように左へ広がり（先は 0.55 で左の壁に着く）、赤が上へ移って上下 2 層（境 y 130）になる。
  // 青の形は 5 つの点（上の左はし・右の壁の上・右下・先の下・先の上）。止まった絵（0.99）が静止図（5 分後）と同じ
  function weTankDensity(t) {
    const s = ease(stage(t, 0.15, 0.8)), sb = ease(stage(t, 0.15, 0.55));
    const top = lerp(60, 130, s);
    const xTop = lerp(160, 40, s), xNose = lerp(160, 40, sb), yNose = lerp(170, 130, s);
    const items = [
      { type: 'rect', x: 40, y: 60, width: 240, height: 140, fill: '#F6C1C1', stroke: 'none' },
      { type: 'polygon', points: [[xTop, top], [280, top], [280, 200], [xNose, 200], [xNose, yNose]], fill: 'sky', stroke: 'none' },
      { type: 'rect', x: 40, y: 50, width: 240, height: 150, fill: 'none' },
    ];
    if (t < 0.2) {
      const k = stage(t, 0.12, 0.2);
      items.push({ type: 'line', points: [[160, 50 - 60 * k], [160, 200 - 150 * k]], color: 'line', width: 4 });
    }
    if (t < 0.15) {
      items.push(
        text(100, 134, 'ぬるま湯', 13, { anchor: 'middle' }),
        text(220, 134, '冷水', 13, { anchor: 'middle' }),
        text(160, 32, 'しきりをとる前', 13, { anchor: 'middle', bold: true }),
      );
    } else if (t < 0.8) {
      items.push(text(160, 32, 'しきりをとると…', 13, { anchor: 'middle', bold: true }));
    } else {
      items.push(
        text(160, 100, 'ぬるま湯（赤）', 13, { anchor: 'middle' }),
        text(160, 170, '冷水（青）', 13, { anchor: 'middle' }),
        text(160, 32, 'しきりをとって 5 分後', 13, { anchor: 'middle', bold: true }),
      );
    }
    items.push(text(160, 226, '冷たい水は重く、下にもぐりこむ', 12, { anchor: 'middle' }));
    return items;
  }

  // ---- 寒冷前線の通過（weather-mp11-c1）----
  const PASS_TEMP = [[40, 90], [66, 85], [92, 80], [118, 80], [144, 85], [170, 140], [196, 150], [222, 155], [248, 160], [274, 165]];
  const PASS_WIND = [[40, 28, '南'], [66, 44, '南'], [92, 28, '南西'], [118, 44, '南西'], [144, 28, '南西'],
    [170, 44, '北西'], [196, 28, '北西'], [222, 44, '北'], [248, 28, '北'], [274, 44, '北']];
  // 気温の折れ線を 10 時から右へ伸ばし（stage(t, 0, 0.8)）、風向の文字を線の先の時刻まで出す。線が 14 時すぎ
  // （x 157）をこえると青い点線と「寒冷前線が通過」、急に下がり始める x 170 をこえると「気温が急に下がる」。
  // 止まった絵（0.99）が静止図と同じ
  function weFrontPassageGraph(t) {
    const k = stage(t, 0, 0.8);
    const xEnd = 40 + 234 * k;
    const items = [
      { type: 'line', points: [[40, 190], [290, 190]], width: 2 },
      { type: 'line', points: [[40, 190], [40, 60]], width: 2 },
      { type: 'line', points: [[40, 160], [290, 160]], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [[40, 110], [290, 110]], color: 'gray', width: 1, dashed: true },
      text(34, 164, '15', 12, { anchor: 'end' }),
      text(34, 114, '20', 12, { anchor: 'end' }),
      text(46, 58, '気温〔℃〕', 12),
    ];
    const line = clipX(PASS_TEMP, xEnd);
    if (line.length >= 2) items.push({ type: 'line', points: line, color: 'orange', width: 3 });
    items.push(text(4, 30, '風向', 12));
    PASS_WIND.forEach(([x, y, s]) => { if (x <= xEnd + 1e-9) items.push(text(x, y, s, 12, { anchor: 'middle' })); });
    [[40, '10時'], [92, '12時'], [144, '14時'], [196, '16時'], [248, '18時']].forEach(([x, s]) => items.push(text(x, 204, s, 12, { anchor: 'middle' })));
    if (xEnd >= 157) {
      items.push(
        { type: 'line', points: [[157, 40], [157, 186]], color: 'blue', width: 2, dashed: true },
        text(162, 70, '寒冷前線が通過', 12, { bg: true }),
      );
    }
    if (xEnd >= 170) items.push(text(230, 120, '気温が急に下がる', 12, { anchor: 'middle', bg: true }));
    if (k < 1) { const tip = line[line.length - 1] || PASS_TEMP[0]; items.push(grain(tip[0], tip[1], 4, 'orange')); }
    return items;
  }

  // ---- 温帯低気圧の移動（weather-mp11-c2）----
  // 温暖前線の半円（静止図と同じ 6 つ）と寒冷前線の三角（6 つ）
  const CYC_WARM_MARKS = [
    [[168, 86.7], [168.7, 84], [168.3, 81.3], [166.9, 79], [164.7, 77.3], [162.1, 76.6], [159.4, 77], [157, 78.4], [155.4, 80.6]],
    [[191.5, 97.9], [192.1, 95.3], [191.8, 92.6], [190.4, 90.2], [188.2, 88.6], [185.5, 87.9], [182.8, 88.3], [180.5, 89.7], [178.8, 91.8]],
    [[214.9, 109.2], [215.6, 106.5], [215.2, 103.8], [213.8, 101.5], [211.6, 99.8], [209, 99.1], [206.3, 99.5], [203.9, 100.9], [202.3, 103.1]],
    [[238.3, 120.4], [239, 117.8], [238.6, 115.1], [237.3, 112.7], [235.1, 111.1], [232.4, 110.4], [229.7, 110.8], [227.4, 112.2], [225.7, 114.3]],
    [[261.8, 131.7], [262.5, 129], [262.1, 126.3], [260.7, 124], [258.5, 122.3], [255.9, 121.6], [253.2, 122], [250.8, 123.4], [249.2, 125.6]],
    [[285.2, 142.9], [285.9, 140.3], [285.5, 137.6], [284.1, 135.2], [281.9, 133.6], [279.3, 132.9], [276.6, 133.3], [274.2, 134.7], [272.6, 136.9]],
  ];
  const CYC_COLD_MARKS = [
    [[131.2, 86.7], [122.5, 97.6], [134.6, 98.4]], [[114.9, 106.9], [106.2, 117.8], [118.3, 118.6]], [[98.6, 127.2], [89.8, 138.1], [102, 138.9]],
    [[82.3, 147.4], [73.5, 158.3], [85.7, 159.2]], [[66, 167.7], [57.2, 178.6], [69.4, 179.4]], [[49.7, 187.9], [40.9, 198.8], [53.1, 199.7]],
  ];
  // 低気圧の中心・2 本の前線・文字が、そろって西から東へ 24 動く（t = 0 は静止図より 24 西。ease(stage(t, 0, 0.8))）。
  // 2 本の前線のあいだ（暖気の範囲）をうすい赤でぬる。止まった絵（0.99）が静止図の位置。
  // 計画は「静止図から東へ 40」だが、A（x 304）が場面の右から出るので、西から静止図の位置まで動かす
  const CYC_SHIFT = 24;
  function weCycloneMove(t) {
    const dx = -CYC_SHIFT * (1 - ease(stage(t, 0, 0.8)));
    const mv = pts => pts.map(([x, y]) => [x + dx, y]);
    const items = [
      { type: 'polygon', points: mv([[143, 80], [300, 150], [262, 232], [60, 232], [40, 200]]), fill: '#FBE3EC', stroke: 'none' },
      { type: 'line', points: mv([[150, 78], [300, 150]]), color: 'red', width: 3 },
      ...CYC_WARM_MARKS.map(p => ({ type: 'polygon', fill: 'red', stroke: 'none', points: mv(p) })),
      { type: 'line', points: mv([[135, 82], [40, 200]]), color: 'blue', width: 3 },
      ...CYC_COLD_MARKS.map(p => ({ type: 'polygon', fill: 'blue', stroke: 'none', points: mv(p) })),
      text(140 + dx, 72, '低', 20, { anchor: 'middle', bold: true }),
      text(124 + dx, 96, 'O', 14, { bold: true }),
      text(304 + dx, 168, 'A', 14, { bold: true }),
      text(26 + dx, 214, 'B', 14, { bold: true }),
      text(316, 20, '上が北', 12, { anchor: 'end' }),
      text(236 + dx, 92, '温暖前線', 12, { bg: true }),
      text(44 + dx, 150, '寒冷前線', 12, { bg: true }),
      text(176 + dx, 182, '暖気', 14, { bold: true }),
      { type: 'arrow', x1: 150, y1: 30, x2: 210, y2: 30, color: 'gray', label: '西から東へ移動' },
    ];
    return items;
  }

  // ---- 冬の季節風（weather-mp12-c1）----
  // 季節風の粒の道すじ: 大陸 → 日本海 → A の斜面を上がり雲へ → 山をこえて B 側を下りる
  const MONSOON = [[8, 110], [62, 110], [80, 150], [150, 137], [188, 160], [214, 108], [234, 92], [254, 108], [278, 162]];
  const MONSOON_LEN = pathLen(MONSOON);
  const MONSOON_SEA = pathLen(MONSOON.slice(0, 3)) / MONSOON_LEN;    // 日本海に出る所（(80,150)）
  const MONSOON_COAST = pathLen(MONSOON.slice(0, 5)) / MONSOON_LEN;  // 日本海をわたり終える所（(188,160)）
  const MONSOON_TOP = pathLen(MONSOON.slice(0, 7)) / MONSOON_LEN;    // 山をこえる所（(234,92)）
  // 粒の色: 大陸では青（冷たく乾いた風）→ 日本海の上で水色（水蒸気をふくむ）→ 山をこえたら灰色（乾いた風）
  function monsoonColor(f) {
    if (f < MONSOON_SEA) return TOKEN_HEX.blue;
    if (f < MONSOON_COAST) return mix(TOKEN_HEX.blue, TOKEN_HEX.sky, (f - MONSOON_SEA) / (MONSOON_COAST - MONSOON_SEA));
    if (f < MONSOON_TOP) return TOKEN_HEX.sky;
    return mix(TOKEN_HEX.sky, TOKEN_HEX.gray, Math.min(1, (f - MONSOON_TOP) / 0.06));
  }
  // A の斜面 (200,170)→(235,100) の高さ（雪が積もる所）
  function slopeA(x) { return x <= 200 ? 172 : 170 - 2 * (x - 200); }
  // 季節風の粒が日本海をわたって水蒸気をふくみ、A の斜面を上がって雲に入る。雲の下の A 側に雪が降り、
  // 山をこえた粒は B 側を下りて乾いた風（灰色）になる（t = 1 と t = 0 がつながる）
  function weWinterMonsoon(t) {
    const items = [
      { type: 'polygon', points: [[0, 170], [70, 170], [70, 240], [0, 240]], fill: 'sand', stroke: 'none' },
      { type: 'rect', x: 70, y: 178, width: 110, height: 62, fill: 'water', stroke: 'none' },
      { type: 'rect', x: 280, y: 178, width: 40, height: 62, fill: 'water', stroke: 'none' },
      { type: 'polygon', points: [[180, 178], [200, 170], [235, 100], [270, 170], [280, 178], [280, 240], [180, 240]], fill: 'lightgreen' },
      { type: 'arrow', x1: 10, y1: 110, x2: 60, y2: 110, color: 'blue', width: 4 },
      { type: 'arrow', x1: 80, y1: 152, x2: 150, y2: 138, color: 'blue', width: 4 },
      text(6, 96, '北西の季節風', 12),
      text(100, 206, '日本海', 12),
      text(318, 226, '太平洋', 12, { anchor: 'end' }),
    ];
    // 雪（A 側の雲の下から斜面まで）
    for (let k = 0; k < 5; k++) {
      const x = 196 + 6 * k;
      items.push(grain(x, lerp(100, slopeA(x) - 3, frac(2 * t + 0.29 * k + 0.05)), 2.5, 'white', 'line'));
    }
    items.push(
      { type: 'ellipse', x: 206, y: 84, rx: 36, ry: 16, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: 186, y1: 164, x2: 218, y2: 108, color: 'orange' },
      { type: 'arrow', x1: 252, y1: 108, x2: 276, y2: 160, color: 'orange' },
    );
    for (let k = 0; k < 8; k++) {
      const f = frac(t + (k + 0.5) / 8);
      const q = along(MONSOON, f);
      items.push(grain(q.x, q.y, 4, monsoonColor(f), 'ink'));
    }
    items.push(
      text(182, 130, 'A', 15, { bold: true, anchor: 'end' }),
      text(284, 130, 'B', 15, { bold: true }),
      text(160, 40, 'A 上昇気流 → 雪', 12, { bg: true }),
      text(316, 60, 'B 下降気流', 12, { anchor: 'end', bg: true }),
      text(316, 78, '→ 晴れ', 12, { anchor: 'end', bg: true }),
    );
    return items;
  }

  // ---- 春の天気の 3 日間（weather-mp13-c1）----
  // こま i（0〜2）の左はし x 6・110・214。各こまの 高・低 の位置（高は丸と字、低は字）
  const SPRING = [
    { x: 6, title: [56, '1 日目'], line: [[48, 180], [64, 140], [72, 100], [86, 66]], high: [24, 114, 120], low: [86, 166] },
    { x: 110, title: [160, '2 日目'], line: [[152, 180], [168, 140], [176, 100], [190, 66]], high: [168, 114, 120], low: [198, 52] },
    { x: 214, title: [264, '3 日目'], line: [[256, 180], [272, 140], [280, 100], [294, 66]], high: [296, 118, 124], low: [232, 90] },
  ];
  // 強調したこまの 高・低 がすべり始める位置。2 日目は 1 日目の位置（こまの中の同じ座標）から、
  // 3 日目の高は 2 日目の位置から。3 日目の低は西から来た新しい低気圧なので、こまの左はしの近くから
  const SPRING_FROM = [null, { high: [128, 114, 120], low: [190, 166] }, { high: [272, 114, 120], low: [224, 92] }];
  // 1 日目 → 2 日目 → 3 日目のこまを順に太わくで強調し（各 0.3 周）、強調したこまの 高・低 をすべらせる。
  // 0.9 からあとは強調なし。止まった絵（0.99）が静止図と同じ
  function weSpring3Days(t) {
    const now = t < 0.9 ? Math.floor(t / 0.3) : -1;
    const m = now >= 0 ? ease(stage(t, 0.3 * now, 0.3 * now + 0.2)) : 1;
    const items = [];
    SPRING.forEach((f, i) => {
      let hx = f.high[0], hy = f.high[1], hty = f.high[2], lx = f.low[0], ly = f.low[1];
      const from = SPRING_FROM[i];
      if (i === now && from) {
        hx = lerp(from.high[0], hx, m); hy = lerp(from.high[1], hy, m); hty = lerp(from.high[2], hty, m);
        lx = lerp(from.low[0], lx, m); ly = lerp(from.low[1], ly, m);
      }
      items.push(
        { type: 'rect', x: f.x, y: 30, width: 100, height: 170, fill: 'white', stroke: 'line' },
        { type: 'line', points: f.line, color: 'green', width: 6 },
        text(f.title[0], 22, f.title[1], 13, { anchor: 'middle', bold: true }),
        { type: 'circle', x: hx, y: hy, r: 15, fill: 'none', stroke: 'gray' },
        text(hx, hty, '高', 16, { anchor: 'middle', bold: true }),
        text(lx, ly, '低', 16, { anchor: 'middle', bold: true }),
      );
    });
    if (now >= 0) {
      const x = SPRING[now].x;
      items.push({ type: 'line', points: [[x, 30], [x + 100, 30], [x + 100, 200], [x, 200], [x, 30]], color: 'blue', width: 4 });
    }
    items.push(text(160, 226, '高気圧も低気圧も西から東へ', 12, { anchor: 'middle' }));
    return items;
  }

  // ---- 台風の進路（weather-mp13-c3）----
  const TYPHOON = [[140, 208], [152, 182], [196, 150], [252, 120], [304, 100]];
  // 台風の丸が進路にそって (140,208) から北上し、日本付近で東寄りに曲がる（ease(stage(t, 0, 0.8))）。
  // 丸の中のうずの線 2 本は反時計回りに回る（onCircle の角が増える向き）。t = 0 が静止図の位置
  function weTyphoonPath(t) {
    const q = along(TYPHOON, ease(stage(t, 0, 0.8)));
    const a = 720 * t;
    return japanMp().concat([
      { type: 'line', points: [[150, 238], [140, 208], [152, 182], [196, 150], [252, 120], [304, 100]], color: 'red', width: 3, dashed: true, arrow: true },
      { type: 'circle', x: q.x, y: q.y, r: 12, fill: 'white', stroke: 'red' },
      { type: 'line', points: arc(q.x, q.y, 7, a, a + 110, 8), color: 'red', width: 2 },
      { type: 'line', points: arc(q.x, q.y, 7, a + 180, a + 290, 8), color: 'red', width: 2 },
      text(6, 236, '台風の進路の例', 12, { bg: true }),
      text(316, 70, '北上すると東寄りに', 12, { anchor: 'end', bg: true }),
    ]);
  }

  // ---- 海陸風（weather-mp14-c1）----
  // 昼: 地表を海 → 陸、陸の上で上がり、上空を陸 → 海、海の上で下がる輪。夜はその逆（右の絵）
  const BREEZE_DAY = [[16, 98], [140, 98], [140, 46], [16, 46], [16, 98]];
  const BREEZE_NIGHT = [[304, 98], [180, 98], [180, 46], [304, 46], [304, 98]];
  // 昼と夜の絵で、空気の粒が輪をつくって流れる。陸（昼）・海（夜）の上に小さな上向きの矢印を足す（t = 1 と t = 0 がつながる）
  function weSeaLandBreeze(t) {
    const air = q => grain(q.x, q.y, 3.5, 'white', 'line');
    return [
      { type: 'rect', x: 5, y: 120, width: 75, height: 80, fill: '#9CC3F0', stroke: 'none' },
      { type: 'rect', x: 80, y: 110, width: 75, height: 90, fill: 'sand', stroke: 'none' },
      text(43, 170, '海', 14, { anchor: 'middle' }),
      text(117, 170, '陸', 14, { anchor: 'middle' }),
      { type: 'arrow', x1: 23, y1: 98, x2: 133, y2: 98, color: 'blue' },
      { type: 'arrow', x1: 133, y1: 46, x2: 23, y2: 46, color: 'gray', width: 2 },
      { type: 'arrow', x1: 148, y1: 90, x2: 148, y2: 58, color: 'orange', width: 2 },
      ...flowOn(BREEZE_DAY, t, 6, 1, air),
      { type: 'rect', x: 165, y: 120, width: 75, height: 80, fill: '#9CC3F0', stroke: 'none' },
      { type: 'rect', x: 240, y: 110, width: 75, height: 90, fill: 'sand', stroke: 'none' },
      text(203, 170, '海', 14, { anchor: 'middle' }),
      text(277, 170, '陸', 14, { anchor: 'middle' }),
      { type: 'arrow', x1: 297, y1: 98, x2: 187, y2: 98, color: 'blue' },
      { type: 'arrow', x1: 187, y1: 46, x2: 297, y2: 46, color: 'gray', width: 2 },
      { type: 'arrow', x1: 172, y1: 90, x2: 172, y2: 58, color: 'orange', width: 2 },
      ...flowOn(BREEZE_NIGHT, t, 6, 1, air),
      text(80, 224, '昼: 海風（海 → 陸）', 13, { anchor: 'middle', bold: true }),
      text(240, 224, '夜: 陸風（陸 → 海）', 13, { anchor: 'middle', bold: true }),
    ];
  }

  // ---- 地球規模の大気の動き（weather-mp14-c2）----
  // 赤道で上がり、上空を中緯度へ進み、中緯度で下がって地表を赤道へもどる輪。中緯度から高緯度へは偏西風の矢印にそって流れる
  const GLOBAL_LOOP = [[50, 178], [50, 50], [130, 50], [130, 178], [50, 178]];
  const GLOBAL_WEST = [[140, 172], [270, 172]];
  function weGlobalWind(t) {
    return [
      { type: 'line', points: [[20, 190], [304, 190]], color: 'brown', width: 3 },
      { type: 'arrow', x1: 50, y1: 180, x2: 50, y2: 60, color: 'orange' },
      { type: 'arrow', x1: 58, y1: 50, x2: 122, y2: 50, color: 'gray', width: 2 },
      { type: 'arrow', x1: 130, y1: 60, x2: 130, y2: 176, color: 'blue' },
      { type: 'arrow', x1: 122, y1: 178, x2: 60, y2: 178, color: 'gray', width: 2 },
      { type: 'arrow', x1: 140, y1: 172, x2: 270, y2: 172, color: 'blue', width: 4 },
      ...flowOn(GLOBAL_LOOP, t, 6, 1, q => grain(q.x, q.y, 3.5, 'white', 'line')),
      ...flowOn(GLOBAL_WEST, t, 3, 1, q => grain(q.x, q.y, 3.5, 'white', 'blue')),
      text(50, 210, '赤道', 13, { anchor: 'middle' }),
      text(130, 210, '中緯度', 13, { anchor: 'middle' }),
      text(290, 210, '高緯度', 13, { anchor: 'middle' }),
      text(205, 160, 'X', 16, { anchor: 'middle', bold: true }),
      text(56, 110, '上昇（気圧が低い）', 12, { bg: true }),
      text(136, 140, '下降（気圧が高い）', 12, { bg: true }),
      text(262, 158, '偏西風', 13, { bold: true, bg: true }),
    ];
  }

  // ================================================================
  // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」の地球と宇宙の 9 本
  // 静止図は content/space.js の space-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // （計画の「動く図（使い回し）」の 5 枚（sp-rotation・sp-noon-altitude・sp-seasons・sp-orbit-midnight・sp-moon-phase）は、
  // 既存の kind をそのまま使う）
  // ================================================================

  // ---- 地球の自転（space-mp2-c2）----
  // 横から見た地球（中心 (150,125)、半径 70。地軸は北極が右上へ 23.6° かたむく）の上で、経線（45° ごと）が西 → 東（左 → 右）へ流れる。
  // 1 周で経線 1 本分（45°）ずれるので t = 1 と t = 0 がつながる。地軸・北極・南極と文字は固定
  const SPIN_C = [150, 125], SPIN_R = 70;
  const SPIN_TILT = Math.atan2(76, 174);   // 地軸 (112,212)→(188,38) のかたむき
  // 経度 lon（度。見ている正面が 0、東が正）の経線の、見えている側（手前）の点の列
  function meridian(lon) {
    const pts = [], L = lon * Math.PI / 180, ct = Math.cos(SPIN_TILT), st = Math.sin(SPIN_TILT);
    for (let lat = -90; lat <= 90; lat += 10) {
      const B = lat * Math.PI / 180;
      const x = SPIN_R * Math.cos(B) * Math.sin(L), y = -SPIN_R * Math.sin(B);   // 地軸がたてのときの位置（y は下向き）
      pts.push([SPIN_C[0] + x * ct - y * st, SPIN_C[1] + x * st + y * ct]);
    }
    return pts;
  }
  // 見えている経線の経度（小さい順。並びを変えないので t = 1 と t = 0 で同じ順になる）
  function spinMeridians(t) { return [0, 1, 2, 3].map(k => wrap(-67.5 + 45 * k + 45 * t, -90, 90)).sort((a, b) => a - b); }
  function spEarthSpin(t) {
    return [
      { type: 'circle', x: 150, y: 125, r: 70, fill: 'sky', stroke: 'line' },
      ...spinMeridians(t).map(lon => ({ type: 'line', points: meridian(lon), color: 'line', width: 1.5 })),
      { type: 'line', points: [[112, 212], [188, 38]], width: 2, arrow: true },
      { type: 'line', points: [[84, 132], [110, 142], [150, 145], [190, 142], [214, 132]], color: 'blue', width: 3, arrow: true },
      text(196, 40, '北極', 12),
      text(104, 228, '南極', 12, { anchor: 'end' }),
      text(196, 62, '地軸', 12, { bold: true }),
      text(220, 150, '自転（西→東）', 12),
      text(316, 210, '1 周 約 4 万 km', 12, { anchor: 'end' }),
      text(316, 230, '直径 約 1 万 3000 km', 12, { anchor: 'end' }),
    ];
  }

  // ---- 公転の軌道と星座（content/space.js の orbitBase・starDots と同じ部品。太陽 (160,120)、軌道の半径 62）----
  const STAR_NAMES = [   // 星座 [名前, 太陽から見た向き（度）, 星の点, 文字の位置と寄せ]
    { name: 'オリオン座', a: 0, dot: [290, 120], x: 316, y: 92, anchor: 'end' },
    { name: 'しし座', a: 90, dot: [160, 24], x: 188, y: 30 },
    { name: 'さそり座', a: 180, dot: [30, 120], x: 4, y: 92 },
    { name: 'ペガスス座', a: 270, dot: [160, 216], x: 188, y: 222 },
  ];
  const EARTH_POS = [   // 地球 A〜D [名前, 太陽から見た向き（度）]
    { name: 'A', a: 0 }, { name: 'B', a: 90 }, { name: 'C', a: 180 }, { name: 'D', a: 270 },
  ];
  // starColor: 星座の名前 → 文字の色（強調する星座だけ）
  function orbitStars(starColor) {
    const items = [
      { type: 'circle', x: 160, y: 120, r: 62, fill: 'none', stroke: 'gray' },
      arcLine(160, 120, 62, 300, 330, { color: 'blue', width: 3, arrow: true }),
      { type: 'circle', x: 160, y: 120, r: 16, fill: 'yellow', stroke: 'orange' },
      text(160, 124, '太陽', 12, { anchor: 'middle' }),
    ];
    ORBIT_PTS.forEach(([x, y]) => items.push({ type: 'circle', x, y, r: 9, fill: 'sky', stroke: 'line' }));
    items.push(
      text(234, 112, 'A', 13, { bold: true }),
      text(172, 54, 'B', 13, { bold: true }),
      text(86, 112, 'C', 13, { anchor: 'end', bold: true }),
      text(172, 196, 'D', 13, { bold: true }),
    );
    STAR_NAMES.forEach(s => {
      const c = (starColor || {})[s.name];
      items.push(text(s.x, s.y, s.name, 12, Object.assign(s.anchor ? { anchor: s.anchor } : {}, c ? { color: c, bold: true } : {})));
    });
    STAR_NAMES.forEach(s => {
      const c = (starColor || {})[s.name];
      items.push({ type: 'circle', x: s.dot[0], y: s.dot[1], r: 6, fill: c ? (c === 'blue' ? 'sky' : 'orange') : 'yellow', stroke: c || 'orange' });
    });
    return items;
  }
  const nearestBy = (list, a) => list.reduce((best, e) => (angDiff(a, e.a) < angDiff(a, best.a) ? e : best), list[0]);

  // ---- 黄道（space-mp3-c3）----
  // 地球が公転の円を反時計回りに 1 周し（角 ＝ 360t 度。t = 0 で A）、地球 → 太陽の向きの点線を星座の並び（横 130・たて 96 の楕円）の
  // 手前まで伸ばす。その先の星座（太陽と同じ方向で見えない）を orange にし、下の文を「地球が ○ のとき、太陽は ○○座の方向に見える」に
  // 変える（○ はいちばん近い A〜D）。t = 0 が静止図と同じ。t = 1 と t = 0 がつながる
  function eclipticLine(phi) {
    const c = Math.cos(deg(phi + 180)), s = -Math.sin(deg(phi + 180));
    const far = 1 / Math.hypot(c / 130, s / 96);   // 太陽から楕円までの長さ
    return [[160 - 52 * c, 120 - 52 * s], [160 + (far - 10) * c, 120 + (far - 10) * s]];
  }
  function spEcliptic(t) {
    const phi = 360 * t;
    const star = nearestBy(STAR_NAMES, phi + 180), at = nearestBy(EARTH_POS, phi);
    const [ex, ey] = onCircle(160, 120, 62, phi);
    return orbitStars({ [star.name]: 'orange' }).concat([
      { type: 'circle', x: ex, y: ey, r: 9, fill: 'sky', stroke: 'blue' },
      { type: 'line', points: eclipticLine(phi), color: 'blue', width: 2, dashed: true, arrow: true },
      text(4, 236, '地球が ' + at.name + ' のとき、太陽は' + star.name + 'の方向に見える', 12),
    ]);
  }

  // ---- 東・南・西・北の空の星の動き（space-mp5-c1）----
  // content/space.js の skyPanel と同じ部品（(x0, y0) は左上、幅 w・高さ h）。lines に星が動く線の点の列を返す
  function skyPanelMp(x0, y0, w, h, kind, title, lines) {
    const items = [{ type: 'rect', x: x0, y: y0, width: w, height: h, fill: '#F3F6FB', stroke: 'line' }];
    const g = y0 + h - 12, mid = x0 + w / 2;
    const add = (it) => { items.push(it); lines.push(it.points); };
    if (kind !== 'north') items.push({ type: 'line', points: [[x0 + 4, g], [x0 + w - 4, g]], color: 'brown', width: 2 });
    if (kind === 'north') {
      const cy = y0 + h / 2 + 4;
      [12, 24, 36].forEach(r => add(arcLine(mid, cy, r, -40, 120, { color: 'blue', width: 2, arrow: true })));
      items.push({ type: 'circle', x: mid, y: cy, r: 3.5, fill: 'ink', stroke: 'none' });
    }
    if (kind === 'east' || kind === 'west') {
      const step = (w - 52) / 2;
      for (let k = 0; k < 3; k++) {
        const xa = x0 + 8 + k * step, xb = xa + 34, top = g - 50;
        add({ type: 'line', points: kind === 'east' ? [[xa, g], [xb, top]] : [[xa, top], [xb, g]], color: 'blue', width: 2, arrow: true });
      }
    }
    if (kind === 'south') [34, 50].forEach(r => add(arcLine(mid, g + 14, r, 155, 25, { color: 'blue', width: 2, arrow: true })));
    items.push(text(x0 + 6, y0 + 16, title, 12, { bold: true }));
    return items;
  }
  // 4 つの空で、星の点が同時にそれぞれの線の上を動く（東: 右上へ、南: 東から西へ弧、西: 右下へ、北: 北極星を中心に反時計回り）。
  // 線と文字は静止図のまま。進む（0〜0.8）→ 止まる → t = 0 で線の始めにもどる。t = 0 が静止図（＋線の始めの星）
  function spFourSky(t) {
    const lines = [];
    const items = [
      ...skyPanelMp(6, 6, 150, 100, 'east', '東の空', lines),
      ...skyPanelMp(164, 6, 150, 100, 'south', '南の空', lines),
      ...skyPanelMp(6, 120, 150, 100, 'west', '西の空', lines),
      ...skyPanelMp(164, 120, 150, 100, 'north', '北の空', lines),
    ];
    const k = stage(t, 0, 0.8);
    lines.forEach(pts => { const q = along(pts, k); items.push({ type: 'circle', x: q.x, y: q.y, r: 4, fill: 'yellow', stroke: 'ink' }); });
    items.push(text(160, 236, '北の空の中心: 北極星（ほとんど動かない）', 12, { anchor: 'middle' }));
    return items;
  }

  // ---- 地点ごとの方位（space-mp6-c1）----
  // 北極の真上から見た地球（中心 (160,120)、半径 44。太陽の光は左から）の上を観測者が自転とともに反時計回りに回り（角 ＝ 270 + 360t 度。
  // t = 0 が夕方）、その点の南（地球の外向き）・東（自転で進む向き）・西の矢印と文字がいっしょに回る。観測者の近く（70° 以内）にある
  // 時刻の文字は矢印と重なるので描かない。下の文は「○○の地点での方位」（○○ はいちばん近い時刻）。t = 1 と t = 0 がつながる
  const LD_TIMES = [
    { name: '正午', a: 180, x: 108, y: 125, anchor: 'end' },
    { name: '夕方', a: 270 },
    { name: '真夜中', a: 0, x: 212, y: 125 },
    { name: '明け方', a: 90, x: 160, y: 64, anchor: 'middle' },
  ];
  // 観測者の角 a での向き: u は地球の外向き、T は自転で進む向き（どちらも長さ 1）
  // （cos・sin は 1e-12 に丸める。90° ごとの角でちょうど 0・±1 にして、静止図の文字の位置と同じ数にする）
  function localFrame(a) {
    const r = deg(a), c = Math.round(Math.cos(r) * 1e12) / 1e12, s = Math.round(Math.sin(r) * 1e12) / 1e12;
    return { u: [c, -s], T: [-s, -c] };
  }
  // 中心 c から u 方向に p、T 方向に q 進んだ点
  function inFrame(c, f, p, q) { return [c[0] + p * f.u[0] + q * f.T[0], c[1] + p * f.u[1] + q * f.T[1]]; }
  function localArrow(c, f, p1, q1, p2, q2) {
    const [x1, y1] = inFrame(c, f, p1, q1), [x2, y2] = inFrame(c, f, p2, q2);
    return { type: 'arrow', x1, y1, x2, y2, color: 'green' };
  }
  function localLabel(c, f, p, q, s, anchor) {
    const [x, y] = inFrame(c, f, p, q);
    return text(x, y, s, 13, Object.assign(anchor ? { anchor } : {}, { bold: true }));
  }
  function spLocalDirection(t) {
    const a = 270 + 360 * t, f = localFrame(a), C = [160, 120];
    const P = inFrame(C, f, 44, 0);
    const now = nearestBy(LD_TIMES, a);
    const items = [
      { type: 'arrow', x1: 8, y1: 80, x2: 80, y2: 80, color: 'orange' },
      { type: 'arrow', x1: 8, y1: 160, x2: 80, y2: 160, color: 'orange' },
      text(8, 66, '太陽の光', 12),
      ...litBody(160, 120, 44, 180, 'sky', NIGHT),
      arcLine(160, 120, 58, 20, 55, { color: 'blue', width: 3, arrow: true }),
    ];
    LD_TIMES.forEach(e => {
      if (e.x === undefined || angDiff(a, e.a) < 70) return;
      items.push(text(e.x, e.y, e.name, 13, Object.assign(e.anchor ? { anchor: e.anchor } : {}, { bold: true })));
    });
    items.push(
      { type: 'circle', x: P[0], y: P[1], r: 4, fill: 'red', stroke: 'none' },   // 観測者
      localArrow(C, f, 48, 0, 86, 0),
      localArrow(P, f, 0, 4, 0, 44),
      localArrow(P, f, 0, -4, 0, -44),
      // 文字の位置は静止図（夕方）の矢印の先からのずれを、観測者の向きに合わせて回す
      localLabel(C, f, 86, 8, '南'),
      localLabel(P, f, 6, 50, '東'),
      localLabel(P, f, 6, -50, '西', 'end'),
      text(316, 230, now.name + 'の地点での方位', 12, { anchor: 'end' }),
    );
    return items;
  }

  // ---- 地球が A のときの一晩（space-mp6-c2）----
  // 地球を A (222,120) に置いたまま自転させ、観測者が 夕方（角 270°）→ 真夜中（0°）→ 明け方（90°）と動く。
  // 夕方（0〜0.15）・真夜中（0.3〜0.5）・明け方（0.65〜1）で止まり、そのあいだ（0.15〜0.3・0.5〜0.65）で 90° ずつ回る。
  // 観測者の南・東・西の矢印がいっしょに回り、南の矢印の先にある星座を blue にして「いま南に見える: ○○座」を出す。
  // 「南」「東」「西」の文字は止まっているあいだだけ（回るあいだは星座の名前と重なるため）。
  // 止まった絵は真夜中の 0.4（静止図と同じ。南オリオン座・東しし座・西ペガスス座）。t = 0 で夕方にもどる
  const NA_TIMES = [{ name: '夕方', a: 270 }, { name: '真夜中', a: 0 }, { name: '明け方', a: 90 }];
  const NA_REST = 0.4;
  const NA_TURNS = [[0.15, 0.3], [0.5, 0.65]];
  function nightAngle(t) { return 270 + 90 * NA_TURNS.reduce((s, [a, b]) => s + ease(stage(t, a, b)), 0); }
  function nightTurning(t) { return NA_TURNS.some(([a, b]) => t > a && t < b); }
  // 止まっているときの「南」「東」「西」の文字の位置（真夜中は静止図と同じ。夕方・明け方は矢印の先の横で、太陽・星座の名前にかからない所）
  const NA_LABELS = {
    '夕方': [[228, 170], [264, 138], [184, 138]],
    '真夜中': [[256, 140], [228, 80], [228, 168]],
    '明け方': [[228, 80], [184, 138], [264, 138]],
  };
  function spNightAtA(t) {
    const a = nightAngle(t), f = localFrame(a), E = [222, 120];
    const star = nearestBy(STAR_NAMES, a), now = nearestBy(NA_TIMES, a);
    const P = inFrame(E, f, 9, 0);
    return orbitStars({ [star.name]: 'blue' }).concat([
      { type: 'circle', x: P[0], y: P[1], r: 3, fill: 'red', stroke: 'none' },   // 観測者
      localArrow(E, f, 12, 0, 52, 0),
      localArrow(E, f, 0, 12, 0, 50),
      localArrow(E, f, 0, -12, 0, -50),
      ...(nightTurning(t) ? [] : ['南', '東', '西'].map((s, i) => text(NA_LABELS[now.name][i][0], NA_LABELS[now.name][i][1], s, 13, { bold: true }))),
      text(4, 236, '地球が A のときの' + now.name, 12),
      text(316, 236, 'いま南に見える: ' + star.name, 12, { anchor: 'end', color: 'blue', bold: true }),
    ]);
  }

  // ---- 星の 1 時間ごとの動き（space-mp7-c1）----
  // content/space.js の skyArc と同じ部品（観測地点 (160,210)、半径 150。15° ごとの印。P は真南）
  function skyArcMp() {
    const items = [
      arcLine(160, 210, 150, 0, 180, { color: 'gray', width: 1.5, dashed: true }),
      { type: 'line', points: [[6, 210], [314, 210]], color: 'brown', width: 3 },
      text(16, 230, '東', 14, { anchor: 'middle', bold: true }),
      text(160, 230, '南', 14, { anchor: 'middle', bold: true }),
      text(304, 230, '西', 14, { anchor: 'middle', bold: true }),
    ];
    for (let a = 15; a < 180; a += 15) {
      if (a === 90) continue;
      const [x, y] = onCircle(160, 210, 150, a);
      items.push({ type: 'circle', x, y, r: 3, fill: 'gray', stroke: 'none' });
    }
    items.push({ type: 'circle', x: 160, y: 60, r: 8, fill: 'yellow', stroke: 'orange' }, text(172, 52, 'P', 14, { bold: true }));
    return items;
  }
  // 星の位置（P から西へ w 度）と時刻の文字。前半は今夜: 20 時に P、1 時間ごとに 15° ずつ西へ（印から印へ）。
  // 後半は 1 か月後: 18 時に P、19 時、20 時と動き、20 時には P より 30° 西（同じ位置に見える時刻が 2 時間早い）
  const HOUR_STEPS = [   // [始まり, 1 つ目の移動, 止まる, 2 つ目の移動, 止まる]
    { from: 0, label: (h) => '今夜 ' + h + ' 時', hour0: 20, moves: [[0.1, 0.16], [0.24, 0.3]], until: 0.42, color: 'blue' },
    { from: 0.42, label: (h) => '1 か月後の ' + h + ' 時', hour0: 18, moves: [[0.54, 0.6], [0.68, 0.74]], until: 0.96, color: 'green' },
  ];
  function starHour(t) {
    const ph = t < HOUR_STEPS[1].from ? HOUR_STEPS[0] : HOUR_STEPS[1];
    let steps = 0;
    ph.moves.forEach(([a, b]) => { steps += ease(stage(t, a, b)); });
    const hours = ph.moves.filter(([a, b]) => t >= (a + b) / 2).length;
    return { phase: ph, west: 15 * steps, label: ph.label(ph.hour0 + hours) };
  }
  function spStarHour(t) {
    const s = starHour(t);
    const [x, y] = onCircle(160, 210, 150, 90 - s.west);
    const items = skyArcMp().concat([
      text(316, 24, '印は 15° ごと', 12, { anchor: 'end' }),
      arcLine(160, 210, 166, 90, 75, { color: 'blue', width: 3, arrow: true }),
      text(200, 62, '1 時間で 15° 西へ', 12),
      arcLine(160, 210, 130, 90, 60, { color: 'green', width: 3, arrow: true }),
      text(160, 120, '1 か月で 30° 西へ', 12, { anchor: 'middle' }),
      text(160, 140, '（同じ時刻にくらべて）', 12, { anchor: 'middle' }),
      { type: 'circle', x, y, r: 7, fill: 'white', stroke: s.phase.color },
      text(8, 24, s.label, 13, { color: s.phase.color, bold: true }),
    ]);
    if (s.phase === HOUR_STEPS[1]) items.push(text(160, 172, 'P に見える時刻は 2 時間早くなる（18 時）', 12, { anchor: 'middle', color: 'green', bold: true }));
    return items;
  }

  // ---- 天動説と地動説（space-mp8-c1）----
  // content/space.js の geoHelio と同じ部品。左（天動説）では地球のまわりを太陽が、右（地動説）では太陽のまわりを地球が、
  // 同じ周期で反時計回りに回る（角 ＝ 360t 度）。t = 0 が静止図。t = 1 と t = 0 がつながる
  function spGeoHelio(t) {
    const [sx, sy] = onCircle(80, 110, 50, 360 * t), [ex, ey] = onCircle(240, 110, 50, 360 * t);
    return [
      { type: 'circle', x: 80, y: 110, r: 50, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 80, y: 110, r: 12, fill: 'sky', stroke: 'line' },
      { type: 'circle', x: sx, y: sy, r: 10, fill: 'yellow', stroke: 'orange' },
      arcLine(80, 110, 50, 300, 340, { color: 'blue', width: 2, arrow: true }),
      { type: 'circle', x: 240, y: 110, r: 50, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 240, y: 110, r: 14, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: ex, y: ey, r: 8, fill: 'sky', stroke: 'line' },
      arcLine(240, 110, 50, 300, 340, { color: 'blue', width: 2, arrow: true }),
      text(80, 114, '地球', 11, { anchor: 'middle' }),
      text(240, 114, '太陽', 11, { anchor: 'middle' }),
      text(80, 196, '天動説', 14, { anchor: 'middle', bold: true }),
      text(80, 218, '地球が中心', 12, { anchor: 'middle' }),
      text(240, 196, '地動説', 14, { anchor: 'middle', bold: true }),
      text(240, 218, '太陽が中心', 12, { anchor: 'middle' }),
    ];
  }

  // ---- 内惑星と外惑星（space-mp9-c1）----
  // 金星（半径 40）・地球（72）・火星（104）が太陽のまわりを 1 周に 3 回・2 回・1 回（実際の周期の比にほぼ合う整数）反時計回りに回り、
  // 地球から金星・火星へ点線を引く。左下に、地球から見た太陽と金星・火星のあいだの角を出す（金星は 34° より大きくならない）。
  // 火星が太陽と反対側（角 150° 以上）にきたら「火星は真夜中にも見える」。文字は静止図の位置のまま。t = 0 が静止図。つながる
  const PLANETS3 = { venus: { r: 40, a0: 150, n: 3 }, earth: { r: 72, a0: 270, n: 2 }, mars: { r: 104, a0: 60, n: 1 } };
  function planetAt(name, t) { const p = PLANETS3[name]; return onCircle(160, 120, p.r, p.a0 + 360 * p.n * t); }
  // 地球から見た、太陽と惑星のあいだの角（度）
  function elongation(t, name) {
    const [ex, ey] = planetAt('earth', t), [px, py] = planetAt(name, t);
    const a1 = Math.atan2(120 - ey, 160 - ex), a2 = Math.atan2(py - ey, px - ex);
    return angDiff(a1 * 180 / Math.PI, a2 * 180 / Math.PI);
  }
  function spInnerOuter(t) {
    const v = planetAt('venus', t), e = planetAt('earth', t), m = planetAt('mars', t);
    const ev = Math.round(elongation(t, 'venus')), em = Math.round(elongation(t, 'mars'));
    const items = [
      { type: 'circle', x: 160, y: 120, r: 40, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 160, y: 120, r: 72, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 160, y: 120, r: 104, fill: 'none', stroke: 'gray' },
      { type: 'line', points: [e, v], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [e, m], color: 'gray', width: 1, dashed: true },
      { type: 'circle', x: 160, y: 120, r: 14, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: v[0], y: v[1], r: 6, fill: '#D9C9A8', stroke: 'line' },
      { type: 'circle', x: e[0], y: e[1], r: 7, fill: 'sky', stroke: 'line' },
      { type: 'circle', x: m[0], y: m[1], r: 6, fill: '#D9866A', stroke: 'line' },
      text(118, 94, '金星（内惑星）', 12, { anchor: 'end' }),
      text(172, 214, '地球', 12),
      text(222, 26, '火星（外惑星）', 12),
      text(4, 218, '太陽と金星の角 ' + ev + '°', 12),
      text(4, 236, '太陽と火星の角 ' + em + '°', 12),
    ];
    if (em >= 150) items.push(text(316, 236, '火星は真夜中にも見える', 12, { anchor: 'end', color: 'blue', bold: true }));
    return items;
  }

  // ---- 日食と月食の並び（space-mp10-c2）----
  // 3 段の並びのそれぞれで、月が地球のまわりの軌道の上を動き（k = ease(stage(t, 0, 0.8))）、静止図の位置で止まる。
  // 上の段（日食）では月が太陽と地球のあいだで一直線になると月の影が地球に落ち、中の段（月食）では月が地球の影に入って暗くなる。
  // 下の段は一直線にならず影がかからない。止まった絵（0.99）が静止図の並び
  const ECL_ROWS = [
    { earth: [230, 40], r: 80, from: 165, to: 180 },    // 日食: 月は地球の左（太陽の側）
    { earth: [150, 120], r: 80, from: 15, to: 0 },      // 月食: 月は地球の右（太陽と反対側）
    { earth: [150, 205], r: 29, from: 135, to: 90 },    // 食は起こらない: 月は地球の上
  ];
  function eclipseMoon(row, t) {
    const k = ease(stage(t, 0, 0.8));
    return { k, p: onCircle(row.earth[0], row.earth[1], row.r, lerp(row.from, row.to, k)) };
  }
  function spEclipseLine(t) {
    const [r1, r2, r3] = ECL_ROWS;
    const m1 = eclipseMoon(r1, t), m2 = eclipseMoon(r2, t), m3 = eclipseMoon(r3, t);
    const items = [
      { type: 'line', points: [[6, 84], [314, 84]], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [[6, 160], [314, 160]], color: 'gray', width: 1, dashed: true },
      // 上の段: 日食
      { type: 'circle', x: 36, y: 40, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: 230, y: 40, r: 13, fill: 'sky', stroke: 'line' },
    ];
    if (Math.abs(m1.p[1] - 40) < 3) {   // 一直線: 月の影が地球に落ちる
      items.push(
        { type: 'polygon', points: [[m1.p[0], m1.p[1] - 7], [217, 38], [217, 42], [m1.p[0], m1.p[1] + 7]], fill: DARK, stroke: 'none' },
        { type: 'circle', x: 218, y: 40, r: 3, fill: DARK, stroke: 'none' },
      );
    }
    items.push(
      { type: 'circle', x: m1.p[0], y: m1.p[1], r: 7, fill: DARK, stroke: 'line' },
      text(36, 74, '太陽', 12, { anchor: 'middle' }),
      text(150, 64, '月', 12, { anchor: 'middle' }),
      text(230, 70, '地球', 12, { anchor: 'middle' }),
      // 中の段: 月食（地球の影は右へのびる）
      { type: 'circle', x: 36, y: 120, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'polygon', points: [[150, 107], [250, 114], [250, 126], [150, 133]], fill: '#B9C0CB', stroke: 'none' },
      { type: 'circle', x: 150, y: 120, r: 13, fill: 'sky', stroke: 'line' },
    );
    // 月が地球の影に入るほど暗くなる（影の中心からのずれ 12 → 0）
    const dark = 1 - Math.min(1, Math.abs(m2.p[1] - 120) / 12);
    items.push(
      { type: 'circle', x: m2.p[0], y: m2.p[1], r: 7, fill: mix(TOKEN_HEX.yellow, DARK, dark), stroke: 'line' },
      text(36, 154, '太陽', 12, { anchor: 'middle' }),
      text(150, 150, '地球', 12, { anchor: 'middle' }),
      text(230, 144, '月', 12, { anchor: 'middle' }),
      // 下の段: 一直線にならない（地球の影は右へのびるが、月にかからない）
      { type: 'circle', x: 36, y: 205, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'polygon', points: [[150, 192], [222, 197], [222, 213], [150, 218]], fill: '#B9C0CB', stroke: 'none' },
      { type: 'circle', x: 150, y: 205, r: 13, fill: 'sky', stroke: 'line' },
      { type: 'circle', x: m3.p[0], y: m3.p[1], r: 7, fill: DARK, stroke: 'line' },
      text(36, 237, '太陽', 12, { anchor: 'middle' }),
      text(150, 234, '地球', 12, { anchor: 'middle' }),
      text(164, 181, '月', 12),
      text(316, 44, '日食', 13, { anchor: 'end', bold: true }),
      text(316, 124, '月食', 13, { anchor: 'end', bold: true }),
      text(316, 209, '食は起こらない', 12, { anchor: 'end' }),
    );
    return items;
  }

  const DEFS = [
    ['vo-quake-spread', voQuakeSpread, { restT: 0 }],
    ['vo-seismogram', voSeismogram, { restT: 0.99 }],
    ['vo-ps-graph', voPsGraph, { restT: 0.99 }],
    ['vo-plate-rebound', voPlateRebound, { restT: 0 }],
    ['we-cloud-form', weCloudForm, { restT: 0.99 }],
    ['we-high-low', weHighLow, { restT: 0 }],
    ['we-westerly', weWesterly, { restT: 0 }],
    ['sp-rotation', spRotation, { restT: 0, period: 8000 }],
    ['sp-annual-orion', spAnnualOrion, { restT: 0, period: 8000 }],
    ['sp-orbit-midnight', spOrbitMidnight, { restT: 0, period: 8000 }],
    ['sp-seasons', spSeasons, { restT: 0, period: 8000 }],
    ['sp-moon-phase', spMoonPhase, { restT: 0, period: 8000 }],
    // 優先度 B（docs/anim-plan.md 8 章）
    ['sr-erosion-flow', srErosionFlow, { restT: 0.99 }],
    ['we-front-move', weFrontMove, { restT: 0 }],
    ['sp-noon-altitude', spNoonAltitude, { restT: 0, period: 8000 }],
    ['sp-sunspot', spSunspot, { restT: SPOT_REST, period: 8000 }],
    // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md
    ['vo-focus-epicenter', voFocusEpicenter, { restT: 0 }],
    ['vo-tremor-record', voTremorRecord, { restT: 0.99 }],
    ['vo-ps-80km', voPs80km, { restT: 0.99 }],
    ['vo-fault-uplift', voFaultUplift, { restT: 0.99 }],
    ['sr-sort-deposit', srSortDeposit, { restT: 0.99 }],
    ['sr-continent-drift', srContinentDrift, { restT: 0.99 }],
    // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md
    ['we-dew-point-graph', weDewPointGraph, { restT: 0.99 }],
    ['we-rising-air', weRisingAir, { restT: 0 }],
    ['we-water-cycle', weWaterCycle, { restT: 0 }],
    ['we-isobar-wind', weIsobarWind, { restT: 0 }],
    ['we-pressure-section', wePressureSection, { restT: 0 }],
    ['we-ocean-current', weOceanCurrent, { restT: 0 }],
    ['we-cold-front-section', weColdFrontSection, { restT: 0.99 }],
    ['we-warm-front-section', weWarmFrontSection, { restT: 0.99 }],
    ['we-tank-density', weTankDensity, { restT: 0.99 }],
    ['we-front-passage-graph', weFrontPassageGraph, { restT: 0.99 }],
    ['we-cyclone-move', weCycloneMove, { restT: 0.99 }],
    ['we-winter-monsoon', weWinterMonsoon, { restT: 0 }],
    ['we-spring-3days', weSpring3Days, { restT: 0.99 }],
    ['we-typhoon-path', weTyphoonPath, { restT: 0 }],
    ['we-sea-land-breeze', weSeaLandBreeze, { restT: 0 }],
    ['we-global-wind', weGlobalWind, { restT: 0 }],
    // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md
    ['sp-earth-spin', spEarthSpin, { restT: 0, period: 8000 }],
    ['sp-ecliptic', spEcliptic, { restT: 0, period: 8000 }],
    ['sp-four-sky', spFourSky, { restT: 0 }],
    ['sp-local-direction', spLocalDirection, { restT: 0, period: 8000 }],
    ['sp-night-at-a', spNightAtA, { restT: NA_REST }],
    ['sp-star-hour', spStarHour, { restT: 0 }],
    ['sp-geo-helio', spGeoHelio, { restT: 0, period: 8000 }],
    ['sp-inner-outer', spInnerOuter, { restT: 0, period: 8000 }],
    ['sp-eclipse-line', spEclipseLine, { restT: 0.99 }],
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  // このファイルで足した kind（テスト用）。seismoPoints はテストで静止図の線と比べる
  const api = { KINDS: DEFS.map(d => d[0]), seismoPoints, seaFloorY, frontShift, noonAltitude, sunspotPhi, NOON_NOW_R,
    // ミニプリント（3nen）
    spinMeridians, eclipticLine, nightAngle, starHour, elongation, planetAt, eclipseMoon, ECL_ROWS };
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
