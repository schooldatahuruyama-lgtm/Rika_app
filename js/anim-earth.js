// 解説カードの動く図（地学: 火山と地震・天気・地球と宇宙）。js/anim.js の register で足す。
// 各 kind の動き・数値は docs/anim-plan.md の 8 章。静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、
// 動く部品だけを式で動かす。静止図を作る関数（seismoPoints・waveGraphItems・plateItems・japanItems・earthFromPole・
// orbitBase・tiltedEarth・seasonSide・moonOrbit・litBody・moonShape など）は content の中にあって anim から呼べないので、
// 同じ式をここに写す（出どころは各関数のコメント）。座標は丸めない（content は r1 で 0.1 に丸めているが、差は 0.05 以下）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, deg, wrap, along, onCircle, mix, ease, osc } = anim.helpers;

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
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  // このファイルで足した kind（テスト用）。seismoPoints はテストで静止図の線と比べる
  const api = { KINDS: DEFS.map(d => d[0]), seismoPoints, seaFloorY, frontShift, noonAltitude, sunspotPhi, NOON_NOW_R };
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
