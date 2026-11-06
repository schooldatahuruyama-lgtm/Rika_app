// 解説カードの動く図（物理: 音・力・電流・運動）。js/anim.js の register で足す。
// 各 kind の動き・数値は docs/anim-plan.md の 5 章。静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、
// 動く部品だけを式で動かす。静止図を作る関数（fork・vibratingString・wave・fireworks・spring・bob・swingPath など）は
// content の中にあって anim から呼べないので、同じ式をここに写す（出どころは各関数のコメント）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, clamp01, ease, osc, wrap, pathLen, along, partial, growLine, onCircle, u, grow, mix, TOKEN_HEX } = anim.helpers;

  // 小数 1 けたに丸める（content の静止図の関数と同じ round1。静止図の点をそのまま写すときだけ使う）
  const round1 = (v) => Math.round(v * 10) / 10;
  // 文字（静止図の text と同じ形）
  function text(x, y, s, size, extra) { return Object.assign({ type: 'text', x, y, text: s, size: size || 13 }, extra || {}); }

  // 折れ線 points の上を、間隔 gap で流れる点（電流の向きの点）。shift は始点からずらす長さ（1 周で gap の倍数だけ進めるとつながる）。
  // 始点・終点の 2px 以内は描かない（周期のつなぎ目で、はしに出入りする点がちらつかないように）。
  // skip: [[cx, cy], ...] は記号の中心。記号（中心の ±20）と、そのはしから 1px（横向きの導線の上）には点を描かない
  // （はしちょうどの点が計算の誤差で出たり消えたりしないよう、はばを 1px 広げる）
  const FLOW_EDGE = 2;
  function flowDots(points, shift, gap, skip, color) {
    const total = pathLen(points);
    const out = [];
    for (let s = wrap(shift, 0, gap); s < total; s += gap) {
      if (s < FLOW_EDGE || s > total - FLOW_EDGE) continue;
      const p = along(points, s / total);
      if ((skip || []).some(([cx, cy]) => Math.abs(p.x - cx) < 21 && Math.abs(p.y - cy) < 1)) continue;
      out.push({ type: 'circle', x: p.x, y: p.y, r: 3, fill: color || 'blue', stroke: color || 'blue' });
    }
    return out;
  }

  // 両向きの矢印（line 2 本。静止図の両向き矢印と同じく、同じ線を向きを変えて重ねる）
  function both(x1, y1, x2, y2, color) {
    return [
      { type: 'line', points: [[x1, y1], [x2, y2]], color, width: 2, arrow: true },
      { type: 'line', points: [[x2, y2], [x1, y1]], color, width: 2, arrow: true },
    ];
  }

  // ================================================================
  // 音の世界（sound）
  // ================================================================

  // content/sound.js の fork(x, y, vib) と同じ部品。d はうでの振動のずれ（左のうでは左へ、右のうでは右へ d だけ動く）
  function fork(x, y, vib, d) {
    const items = [
      { type: 'rect', x: x - 20 - d, y, width: 10, height: 90, fill: 'glass' },
      { type: 'rect', x: x + 10 + d, y, width: 10, height: 90, fill: 'glass' },
      { type: 'rect', x: x - 20, y: y + 90, width: 40, height: 10, fill: 'glass' },
      { type: 'rect', x: x - 5, y: y + 100, width: 10, height: 50, fill: 'glass' },
    ];
    if (vib) {
      items.push({ type: 'line', points: [[x - 27, y + 6], [x - 27, y + 78]], color: 'blue', width: 2, dashed: true });
      items.push({ type: 'line', points: [[x + 27, y + 6], [x + 27, y + 78]], color: 'blue', width: 2, dashed: true });
    }
    return items;
  }

  // 折れ線グラフの値: nodes = [[x, v], ...]（x の小さい順）の x での値（はしの外は、はしの値）
  function piecewise(nodes, x) {
    if (x <= nodes[0][0]) return nodes[0][1];
    for (let i = 1; i < nodes.length; i++) {
      if (x <= nodes[i][0]) return lerp(nodes[i - 1][1], nodes[i][1], (x - nodes[i - 1][0]) / (nodes[i][0] - nodes[i - 1][0]));
    }
    return nodes[nodes.length - 1][1];
  }

  // sound-1-c3 の静止図の弧（x 110・150・190・230）の半分の高さとふくらみ。弧どうしのあいだは直線でつなぐ
  const ARC_HALF = [[110, 35], [150, 45], [190, 55], [230, 45], [270, 35]];
  const ARC_BULGE = [[110, 10], [150, 12], [190, 14], [230, 14], [270, 14]];
  const ARC_X0 = 70;     // 弧が生まれる所（おんさのうでのすぐ右）
  const ARC_X1 = 270;    // 弧が耳に吸いこまれて消える所
  const FORK_N = 4;      // 1 周のうでの振動の回数（＝ 1 周に生まれる弧の数。弧は 1 周に 160px、間隔 40px）

  // おんさの振動が空気を次々に振動させ、波面（青い弧）が耳へ進み、鼓膜がふるえる（sound-1-c3）
  function soAirWave(t) {
    const d = 3 * osc(t, FORK_N);
    const arcs = [];
    for (let k = 0; k < 5; k++) {
      const x = wrap(ARC_X0 + 40 * (k + 1) + 160 * t, ARC_X0, ARC_X1);   // t = 0 で 110・150・190・230・(70)
      // 生まれるときと耳に入るときは小さくする（周期のつなぎ目で弧が急に出たり消えたりしないように）
      const f = clamp01((x - ARC_X0) / 40) * clamp01((ARC_X1 - x) / 24);
      if (f < 0.05) continue;
      const h = piecewise(ARC_HALF, x) * f, b = piecewise(ARC_BULGE, x) * f;
      arcs.push({ type: 'line', points: [[x, 115 - h], [x + b, 115], [x, 115 + h]], color: 'blue', width: 2 });
    }
    const drum = 284 + 2 * osc(t, FORK_N);   // 耳の中の鼓膜
    return [
      ...fork(50, 40, true, d),
      ...arcs,
      { type: 'ellipse', x: 290, y: 115, rx: 14, ry: 26, fill: 'pink' },
      { type: 'line', points: [[drum, 105], [drum, 125]], color: 'ink', width: 2 },
      { type: 'text', x: 290, y: 166, text: '耳', anchor: 'middle', size: 14 },
      { type: 'text', x: 176, y: 210, text: '空気の振動が伝わる', anchor: 'middle', size: 14 },
    ];
  }

  // 花火が光った瞬間に光は人に届き、音（青い弧）はおくれて届く（sound-2-c3）。
  // 部品は content/sound.js の fireworks(note) と同じ（花火の丸の半径と人の頭の色だけ動かす）
  const SOUND_PATH = [[86, 70], [258, 160]];
  function soLightVsSound(t) {
    const open = stage(t, 0, 0.1);          // 花火が開く
    const seen = t >= 0.05;                 // 光は一瞬で届く
    const p = stage(t, 0.1, 0.8);           // 音が進む（0.8 で人に届く）
    const r = 26 * open;
    const sparks = [];
    if (open > 0) {
      for (let k = 0; k < 8; k++) {
        const a = onCircle(60, 56, r + 3, k * 45), b = onCircle(60, 56, r + 3 + 8 * open, k * 45);
        sparks.push({ type: 'line', points: [a, b], color: 'orange', width: 2 });
      }
    }
    const items = [
      { type: 'line', points: [[20, 212], [300, 212]], color: 'line', width: 2 },
      ...sparks,
      ...(r > 0 ? [{ type: 'circle', x: 60, y: 56, r, fill: 'yellow', stroke: 'orange' }] : []),
      { type: 'line', points: [[60, 82], [60, 212]], color: 'gray', width: 2, dashed: true },
      Object.assign({ type: 'circle', x: 272, y: 160, r: 10 }, seen && t < 0.15 ? { fill: 'yellow' } : {}),
      { type: 'polygon', points: [[262, 174], [282, 174], [286, 210], [258, 210]], fill: 'green' },
      { type: 'arrow', x1: 64, y1: 228, x2: 268, y2: 228, color: 'blue', width: 2 },
      { type: 'arrow', x1: 268, y1: 228, x2: 64, y2: 228, color: 'blue', width: 2 },
      { type: 'text', x: 128, y: 206, text: '距離', size: 14 },
      { type: 'text', x: 104, y: 40, text: '光が先、音があと', size: 14 },
      { type: 'text', x: 70, y: 112, text: '花火', size: 14 },
      { type: 'text', x: 250, y: 140, text: '人', size: 14 },
      { type: 'text', x: 110, y: 100, text: '光: 秒速 約30万km', size: 13 },
      { type: 'text', x: 110, y: 130, text: '音: 秒速 約340m', size: 13 },
    ];
    // 音の波面（進む向きに垂直な弧）
    if (p > 0 && p < 1) {
      const c = along(SOUND_PATH, p);
      const nx = -c.ty, ny = c.tx;   // 進む向きに垂直
      items.push({ type: 'line', points: [[c.x - 18 * nx, c.y - 18 * ny], [c.x + 7 * c.tx, c.y + 7 * c.ty], [c.x + 18 * nx, c.y + 18 * ny]], color: 'blue', width: 3 });
    }
    // 「見えた！」「聞こえた！」は人の左の空いた所に出す（計画の (226,150)・(226,186) は「人」の文字と人の形に重なるため）
    if (seen) {
      items.push(text(190, 178, '見えた！', 13, { color: 'orange' }));
      items.push(text(110, 160, '光ってから ' + (2.0 * p).toFixed(1) + ' 秒', 13));
    }
    if (p >= 1) items.push(text(190, 198, '聞こえた！', 13, { color: 'blue' }));
    return items;
  }

  // content/sound.js の vibratingString(x1, x2, y, amp) と同じ部品。弦（実線）は 9 点の折れ線にし、s（−1〜1）の割合で振らせる
  function vibratingString(x1, x2, y, amp, s) {
    const up = [], down = [], str = [];
    for (let i = 0; i <= 8; i++) {
      const x = round1(x1 + (x2 - x1) * i / 8);
      const d = round1(amp * Math.sin(Math.PI * i / 8));
      up.push([x, round1(y - d)]);
      down.push([x, round1(y + d)]);
      str.push([x, y + d * s]);
    }
    return [
      { type: 'line', points: up, color: 'blue', width: 2, dashed: true },
      { type: 'line', points: down, color: 'blue', width: 2, dashed: true },
      { type: 'line', points: str, width: 2 },
      { type: 'circle', x: x1, y, r: 4, fill: 'ink' },
      { type: 'circle', x: x2, y, r: 4, fill: 'ink' },
    ];
  }

  // 弱くはじいた弦と強くはじいた弦が、同じ速さ（同じ振動数）でちがう振れはば（振幅）で振動する（sound-3-c1）
  function soAmplitude(t) {
    const s = osc(t, 6);
    return [
      ...vibratingString(40, 260, 80, 8, s),
      ...vibratingString(40, 260, 180, 26, s),
      { type: 'arrow', x1: 290, y1: 180, x2: 290, y2: 158, color: 'blue', width: 2 },
      { type: 'text', x: 280, y: 214, text: '振幅', size: 14 },
      { type: 'text', x: 40, y: 50, text: '弱くはじく → 小さい音', size: 14 },
      { type: 'text', x: 40, y: 134, text: '強くはじく → 大きい音', size: 14 },
    ];
  }

  // content/sound.js の wave(x0, yc, w, amp, cycles, color) と同じ式。shift（1 周の中の位置 t）だけ波形を右へずらす
  // （shift = 0 で静止図と同じ点。左はしの音源の振動が右へ伝わっていく）
  function wave(x0, yc, w, amp, cycles, color, shift) {
    const n = Math.max(2, Math.round(cycles * 16));
    const points = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      points.push([round1(x0 + w * k), round1(yc - amp * Math.sin(2 * Math.PI * cycles * (k - (shift || 0))))]);
    }
    return { type: 'line', points, color: color || 'blue', width: 2 };
  }

  // 振動数の少ない波形（1 周に 2 回）と多い波形（5 回）が流れ、左の音源の丸がその回数だけ上下する（sound-3-c2）
  function soFrequency(t) {
    // 音源の丸の y は、波形の左はし（x = 40）の値（yc − 22·sin(−2π·cycles·t)）
    const source = (yc, cycles) => ({ type: 'circle', x: 30, y: yc + 22 * osc(t, cycles), r: 5, fill: 'blue', stroke: 'blue' });
    return [
      { type: 'line', points: [[30, 90], [290, 90]], color: 'gray', width: 1 },
      wave(40, 90, 240, 22, 2, null, t),
      { type: 'line', points: [[30, 190], [290, 190]], color: 'gray', width: 1 },
      wave(40, 190, 240, 22, 5, null, t),
      source(90, 2),
      source(190, 5),
      { type: 'text', x: 30, y: 46, text: '振動数が少ない → 低い音', size: 14 },
      { type: 'text', x: 30, y: 146, text: '振動数が多い → 高い音', size: 14 },
    ];
  }

  // ================================================================
  // 力のはたらき（force）
  // ================================================================

  // content/force.js の spring(x, yTop, yBottom) と同じ式
  function spring(x, yTop, yBottom) {
    const h = yBottom - yTop;
    const pts = [[x, yTop]];
    for (let i = 0; i < 8; i++) pts.push([x + (i % 2 === 0 ? -10 : 10), yTop + h * (i + 1) / 9]);
    pts.push([x, yBottom]);
    return { type: 'line', points: pts, color: 'line', width: 2 };
  }

  // 中央のばねにおもり 1 個、右のばねにおもりを 1 個ずつ 2 個つるすと、伸びが 1 個分・2 個分になる（force-3-c1）
  // 1 個で 40px 伸びる（静止図と同じ）
  function foSpringStretch(t) {
    const one = ease(stage(t, 0.05, 0.4)), two = ease(stage(t, 0.45, 0.8));
    const mid = 90 + 40 * one;               // 中央のばねの下はし
    const right = 90 + 40 * one + 40 * two;  // 右のばねの下はし
    const weight = (x, y) => ({ type: 'rect', x, y, width: 36, height: 24, fill: 'gray', label: '1個' });
    const items = [
      { type: 'rect', x: 50, y: 10, width: 240, height: 8, fill: 'gray', stroke: 'line' },   // content/force.js の ceiling(50, 240)
      { type: 'line', points: [[60, 90], [290, 90]], color: 'gray', width: 1, dashed: true },
      { type: 'text', x: 8, y: 94, text: 'もとの長さ', size: 12 },
      spring(100, 18, 90),
      { type: 'text', x: 100, y: 116, text: 'おもりなし', size: 12, anchor: 'middle' },
      spring(180, 18, mid),
      ...(t >= 0.05 ? [weight(162, mid)] : []),
      spring(260, 18, right),
      ...(t >= 0.05 ? [weight(242, right)] : []),
      ...(t >= 0.45 ? [weight(242, right + 24)] : []),
    ];
    // 伸びきったら、伸びの両向き矢印と「伸び」
    if (one >= 1) items.push(...both(202, 90, 202, mid, 'blue'), text(206, (90 + mid) / 2 + 4, '伸び', 12, { color: 'blue' }));
    if (two >= 1) items.push(...both(282, 90, 282, right, 'blue'), text(286, (90 + right) / 2 + 4, '伸び', 12, { color: 'blue' }));
    return items;
  }

  // ================================================================
  // 電流とその利用（electricity）
  // ================================================================

  // 導線（content/electricity.js の wire と同じ）・つなぎ目（dot）・回路の記号（sym）・小さな文字（note）
  function wire(points) { return { type: 'line', points, width: 2 }; }
  function junction(x, y) { return { type: 'circle', x, y, r: 3, fill: 'ink', stroke: 'ink' }; }
  function sym(kind, x, y) { return { type: 'symbol', kind, x, y }; }
  function note(x, y, s, size) { return { type: 'text', x, y, text: s, size: size || 13, anchor: 'middle' }; }

  // 電流の向きの点の道すじ（＋極 → −極）と電流 I（A）。点は 1 周に 600·I px 進む（どれも点の間隔 12 の倍数）
  const DOT_GAP = 12;
  const PX_PER_AMP = 600;
  const CIRCUIT = [
    { path: [[60, 170], [15, 170], [15, 50], [145, 50], [145, 170], [100, 170]], amp: 0.2, bulbs: [[50, 50], [110, 50]] },   // 直列
    { path: [[220, 190], [175, 190], [175, 110]], amp: 0.5, bulbs: [] },                                               // 並列の本線（＋極側）
    { path: [[175, 110], [175, 50], [305, 50], [305, 110]], amp: 0.3, bulbs: [[240, 50]] },                            // 上の枝
    { path: [[175, 110], [305, 110]], amp: 0.2, bulbs: [[240, 110]] },                                                 // 中の枝
    { path: [[305, 110], [305, 190], [260, 190]], amp: 0.5, bulbs: [] },                                               // 並列の本線（−極側）
  ];

  // 直列回路と並列回路の導線を、電流の向きに点が流れる。電流が大きい所ほど点が速い（elec-1-c4）
  function elSeriesParallel(t) {
    return [
      sym('bulb', 50, 50), sym('bulb', 110, 50), sym('battery', 80, 170),
      wire([[60, 170], [15, 170], [15, 50], [30, 50]]),
      wire([[70, 50], [90, 50]]),
      wire([[130, 50], [145, 50], [145, 170], [100, 170]]),
      note(50, 32, '0.2 A', 12), note(110, 32, '0.2 A', 12), note(80, 150, '0.2 A', 12),
      note(80, 228, '直列回路', 14),
      sym('bulb', 240, 50), sym('bulb', 240, 110), sym('battery', 240, 190),
      wire([[220, 190], [175, 190], [175, 50], [220, 50]]),
      wire([[260, 50], [305, 50], [305, 190], [260, 190]]),
      wire([[175, 110], [220, 110]]),
      wire([[260, 110], [305, 110]]),
      junction(175, 110), junction(305, 110),
      note(240, 32, '0.3 A', 12), note(240, 92, '0.2 A', 12),
      { type: 'text', x: 182, y: 160, text: '0.5 A', size: 12 },
      note(240, 228, '並列回路', 14),
      ...CIRCUIT.flatMap(c => flowDots(c.path, PX_PER_AMP * c.amp * t, DOT_GAP, c.bulbs, 'blue')),
      note(160, 14, '点は電流の向き（電子の動きではない）', 12),
    ];
  }

  // 誘導電流の点の道すじ（コイル → 検流計 → コイル）
  const COIL_WIRES = [[[140, 140], [140, 200], [159, 200]], [[191, 200], [212, 200], [212, 140]]];
  const INDUCE_SHIFT = 24;   // 点がいちばん遠くまで動く長さ（片側）
  // 磁石の動き: dx = MAGNET_MID + MAGNET_SWING·sin(2πt − MAGNET_PHASE)。t = 0 で dx = 0（静止図の位置）で、コイルへ近づく向きに動いている。
  // dx は −10〜30: 左はしで S 極の左の辺が x 0（場面の外に出ない）、右はしで N 極の右の辺が x 130（コイルの左はし 133 に当たらない）。
  // （計画の 30·sin(2πt) だと S 極が x −20 まで出て切れるため、真ん中を右へ 10 ずらし、ふれはばを 20 にした。止まるのは t = 1/3・5/6）
  const MAGNET_MID = 10, MAGNET_SWING = 20, MAGNET_PHASE = Math.PI / 6;
  const NEEDLE = [175, 213, 20];   // 検流計の針の根もと (x, y) と長さ（丸の中の下寄りから上へ。計画の (175,204)・長さ 12 では文字 G に隠れて見えにくい）

  // 棒磁石を近づけたり遠ざけたりすると、動いているあいだだけ誘導電流が流れ、検流計の針が左右にふれる（elec-4-c4）
  function elInduction(t) {
    const ph = 2 * Math.PI * t - MAGNET_PHASE;
    const dx = MAGNET_MID + MAGNET_SWING * Math.sin(ph);   // 磁石のずれ（t = 0 で 0 ＝ 静止図の位置）
    const v = Math.cos(ph);                                // 磁石の速さの割合（−1〜1。正: コイルに近づく）
    const a = 40 * v * Math.PI / 180;    // 針のかたむき（真上から、右が正）
    const shift = INDUCE_SHIFT * Math.sin(ph);   // 点のずれ（速さが v に比例する）
    const items = [
      ...[140, 152, 164, 176, 188, 200, 212].map(x => ({ type: 'ellipse', x, y: 110, rx: 7, ry: 30, fill: 'none', stroke: 'brown' })),
      note(176, 70, 'コイル'),
      { type: 'rect', x: 10 + dx, y: 95, width: 45, height: 30, fill: 'blue', label: 'S' },
      { type: 'rect', x: 55 + dx, y: 95, width: 45, height: 30, fill: 'red', label: 'N' },
      v >= 0
        ? { type: 'arrow', x1: 40, y1: 166, x2: 100, y2: 166, color: 'gray', label: '近づける' }
        : { type: 'arrow', x1: 100, y1: 166, x2: 40, y2: 166, color: 'gray', label: '遠ざける' },
      wire([[140, 140], [140, 200], [159, 200]]),
      wire([[212, 140], [212, 200], [191, 200]]),
      ...COIL_WIRES.flatMap(p => flowDots(p, shift, DOT_GAP, [], 'blue')),
      { type: 'circle', x: 175, y: 200, r: 16, fill: 'white', label: 'G' },
      { type: 'line', points: [[NEEDLE[0], NEEDLE[1]], [NEEDLE[0] + NEEDLE[2] * Math.sin(a), NEEDLE[1] - NEEDLE[2] * Math.cos(a)]], color: 'red', width: 2.5 },
      note(175, 234, '検流計'),
      { type: 'text', x: 226, y: 176, text: '誘導電流', size: 13 },
    ];
    if (Math.abs(v) < 0.15) items.push(text(316, 196, '止まると流れない', 12, { anchor: 'end' }));
    return items;
  }

  // ================================================================
  // 運動とエネルギー（motion）
  // ================================================================

  // 小さな文字（content/motion.js の note と同じ）
  function mnote(x, y, s, size, anchor) {
    const it = { type: 'text', x, y, text: s, size: size || 13 };
    if (anchor) it.anchor = anchor;
    return it;
  }

  // 力の合成（motion-1-c2）: O(60,190)、力 A は (160, 0)、力 B の長さは静止図の B（(60,190)→(100,70)）と同じ
  const RES_O = [60, 190];
  const RES_A = 160;
  const RES_B = Math.hypot(40, 120);
  const RES_PHI0 = Math.atan2(120, 40) * 180 / Math.PI;   // 静止図の角（約 71.6°）
  const RES_MID = 72.5, RES_AMP = 27.5;                   // 角は 45°〜100°
  const resPhi = (t) => RES_MID - RES_AMP * Math.cos(2 * Math.PI * t);
  const RES_REST = Math.acos((RES_MID - RES_PHI0) / RES_AMP) / (2 * Math.PI);   // 角が静止図と同じになる t（約 0.245）
  function resVectors(t) {
    const phi = resPhi(t) * Math.PI / 180;
    const b = [RES_B * Math.cos(phi), -RES_B * Math.sin(phi)];
    return { b, bTip: [RES_O[0] + b[0], RES_O[1] + b[1]], rTip: [RES_O[0] + RES_A + b[0], RES_O[1] + b[1]] };
  }
  const RES_AT_REST = resVectors(RES_REST);

  // 2 力のあいだの角を変えると、平行四辺形の対角線（合力）が変わる。角が大きいほど合力は小さい（motion-1-c2）
  function moResultant(t) {
    const deg = resPhi(t);
    const { bTip, rTip } = resVectors(t);
    const aTip = [RES_O[0] + RES_A, RES_O[1]];
    // 「力 B」「合力」の文字は矢印の中点といっしょに動く（止まった絵では静止図と同じ位置）
    const bMove = [(bTip[0] - RES_AT_REST.bTip[0]) / 2, (bTip[1] - RES_AT_REST.bTip[1]) / 2];
    const rMove = [(rTip[0] - RES_AT_REST.rTip[0]) / 2, (rTip[1] - RES_AT_REST.rTip[1]) / 2];
    const arc = [];
    for (let k = 0; k <= 12; k++) arc.push(onCircle(RES_O[0], RES_O[1], 26, deg * k / 12));
    const ratio = Math.hypot(rTip[0] - RES_O[0], rTip[1] - RES_O[1]) / RES_A;
    return [
      mnote(20, 30, '平行四辺形の対角線が合力', 14),
      { type: 'line', points: [aTip, rTip], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [bTip, rTip], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: arc, color: 'gray', width: 1.5 },
      { type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 190, color: 'blue' },
      { type: 'arrow', x1: 60, y1: 190, x2: bTip[0], y2: bTip[1], color: 'blue' },
      { type: 'arrow', x1: 60, y1: 190, x2: rTip[0], y2: rTip[1], color: 'green' },
      { type: 'circle', x: 60, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
      mnote(52, 210, 'O', 14, 'end'),
      mnote(140, 214, '力 A', 14, 'middle'),
      mnote(74 + bMove[0], 124 + bMove[1], '力 B', 14, 'end'),
      mnote(196 + rMove[0], 92 + rMove[1], '合力', 14, 'end'),
      mnote(20, 236, '角度 ' + Math.round(deg) + '°', 13),
      mnote(110, 236, '合力は力 A の ' + ratio.toFixed(2) + ' 倍', 13),
    ];
  }

  // 斜面を下る台車（motion-3-c1）: 斜面の向き（静止図の斜面 (20,70)→(160,140)）と、1 周で進む長さ
  const SLOPE_DIR = [140 / Math.hypot(140, 70), 70 / Math.hypot(140, 70)];
  const SLOPE_RUN = 72;
  const CART = [[50, 85], [85.8, 102.9], [94.7, 85], [58.9, 67.1]];   // 静止図の台車（(50,85) が後ろの車輪の所＝斜面の上）
  const TICKS = 5;   // 打点（0.1 秒ごと）の区切りの数。テープ 1 本 ＝ 1 区切り

  // 斜面を下る台車の速さが一定の割合で増え、0.1 秒ごとの打点の間隔が広がり、テープが 20px ずつ長くなる（motion-3-c1）
  function moSlopeAccel(t) {
    const tau = stage(t, 0, 0.8);
    const s = SLOPE_RUN * tau * tau;   // 進んだ長さ（等加速度）
    const mv = (p) => [p[0] + s * SLOPE_DIR[0], p[1] + s * SLOPE_DIR[1]];
    const ticks = [];
    for (let m = 0; m <= TICKS; m++) {
      if (tau < m / TICKS) break;
      const d = SLOPE_RUN * (m / TICKS) * (m / TICKS);
      ticks.push({ type: 'circle', x: 50 + d * SLOPE_DIR[0], y: 85 + d * SLOPE_DIR[1], r: 2, fill: 'ink', stroke: 'ink' });
    }
    const [ax1, ay1] = mv([96, 92]), [ax2, ay2] = mv([142, 115]);
    return [
      { type: 'polygon', points: [[20, 70], [20, 140], [160, 140]], fill: 'sand', stroke: 'line' },
      ...ticks,
      { type: 'polygon', points: CART.map(mv), fill: 'sky', stroke: 'ink' },
      { type: 'arrow', x1: ax1, y1: ay1, x2: ax2, y2: ay2, color: 'green' },
      mnote(10, 172, '斜面に平行な力が', 13),
      mnote(10, 192, 'はたらき続ける', 13),
      ...[0, 1, 2, 3, 4].filter(i => tau >= (i + 1) / TICKS)
        .map(i => ({ type: 'rect', x: 180 + 25 * i, y: 200 - 20 * (i + 1), width: 22, height: 20 * (i + 1), fill: 'white', stroke: 'line' })),
      { type: 'line', points: [[175, 200], [310, 200]], width: 2 },
      mnote(242, 224, '5 打点ごとのテープ', 12, 'middle'),
      mnote(242, 60, '同じ割合で長くなる', 13, 'middle'),
    ];
  }

  // 電車（motion-3-c3）: 1 周で枕木が流れる長さ（枕木の間隔 28 の 10 倍）と、速さが一定の時間・ブレーキの時間
  const SLEEPER_GAP = 28;
  const RUN_LEN = 280;
  const BRAKE_FROM = 0.45, BRAKE_TO = 0.65;
  const RUN_V = RUN_LEN / (BRAKE_FROM + (BRAKE_TO - BRAKE_FROM) / 2);   // 一定の速さ（1 周あたりの px）
  // 1 周の中の位置 t までに電車が進んだ長さ（一定の速さ → 一定の割合で減速 → 止まる）
  function trainRun(t) {
    if (t <= BRAKE_FROM) return RUN_V * t;
    if (t >= BRAKE_TO) return RUN_LEN;   // 止まったあと（計算の誤差で枕木が 1 本分ずれないよう、ちょうどの値にする）
    const b = t - BRAKE_FROM, len = BRAKE_TO - BRAKE_FROM;
    return RUN_V * BRAKE_FROM + RUN_V * (b - b * b / (2 * len));
  }

  // 走っている電車が急ブレーキで止まると、乗客のからだは前へかたむき、やがてもどる（motion-3-c3）
  function moInertia(t) {
    const run = trainRun(t);
    const lean = t < 0.75 ? ease(stage(t, BRAKE_FROM, BRAKE_TO)) : 1 - ease(stage(t, 0.75, 0.9));
    const braking = t >= BRAKE_FROM && t <= BRAKE_TO;   // 「急ブレーキ！」と「前へ」の矢印は電車が止まるまで
    const leaning = t >= BRAKE_FROM && t < 0.75;         // 「前へ」（静止図の文字）は、からだが前へかたむいているあいだ
    const sleepers = [];
    for (let j = 0; j < RUN_LEN / SLEEPER_GAP; j++) {
      const x = wrap(20 + SLEEPER_GAP * j - run, 20, 300);
      sleepers.push({ type: 'line', points: [[x, 198], [x, 208]], color: 'gray', width: 3 });
    }
    return [
      mnote(20, 30, '電車が急に止まると、からだは前へ', 14),
      { type: 'arrow', x1: 120, y1: 60, x2: 200, y2: 60, color: 'gray', label: '進んでいた向き' },
      { type: 'rect', x: 40, y: 80, width: 240, height: 100, fill: 'white', stroke: 'ink', rx: 8 },
      ...sleepers,
      { type: 'line', points: [[20, 200], [300, 200]], color: 'line', width: 3 },
      { type: 'circle', x: 80, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
      { type: 'circle', x: 240, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
      // からだ: まっすぐ（体 (176,178)–(176,122)、頭 (176,108)）→ 前かがみ（静止図の (168,178)–(184,122)、頭 (188,108)）
      { type: 'line', points: [[lerp(176, 168, lean), 178], [lerp(176, 184, lean), 122]], color: 'ink', width: 4 },
      { type: 'circle', x: lerp(176, 188, lean), y: 108, r: 12, fill: 'pink' },
      ...(braking ? [
        { type: 'arrow', x1: 204, y1: 120, x2: 250, y2: 120, color: 'blue' },
        mnote(56, 104, '急ブレーキ！', 14),
      ] : []),
      ...(leaning ? [mnote(212, 148, '前へ', 14)] : []),
    ];
  }

  // content/motion.js の bob(deg) と同じ式（支点 (160,20)、糸の長さ 150。0 が真下）
  function bob(deg) {
    const r = deg * Math.PI / 180;
    return [Math.round((160 + 150 * Math.sin(r)) * 10) / 10, Math.round((20 + 150 * Math.cos(r)) * 10) / 10];
  }
  // content/motion.js の swingPath() と同じ部品（-50°〜50° の点線と支点）
  function swingPath() {
    const pts = [];
    for (let d = -50; d <= 50; d += 10) pts.push(bob(d));
    return [
      { type: 'rect', x: 120, y: 10, width: 80, height: 8, fill: 'gray', stroke: 'line' },
      { type: 'line', points: pts, color: 'gray', width: 2, dashed: true },
    ];
  }
  const SWING = 50;        // ふれはば（度）
  const BAR_MAX = 60;      // エネルギーの棒のいちばん高い所（和の高さ）
  const BAR_BOTTOM = 214;
  // ふりこの角（度）。t = 0 で左はし（静止図の bob(-50)）、t = 0.25 で真下
  const pendAngle = (t) => -SWING * Math.cos(2 * Math.PI * t);
  // 位置エネルギーの棒の高さ（両はしで BAR_MAX、真下で 0）
  const potential = (deg) => BAR_MAX * (1 - Math.cos(deg * Math.PI / 180)) / (1 - Math.cos(SWING * Math.PI / 180));

  // ふりこがゆれ、位置エネルギーと運動エネルギーが移り変わる。和はいつも同じ（motion-4-c4）
  function moPendulum(t) {
    const deg = pendAngle(t);
    const p = bob(deg);
    const pe = Math.min(BAR_MAX, Math.max(0, potential(deg))), ke = BAR_MAX - pe;   // 計算の誤差で負にならないよう 0〜60 に収める
    const bar = (x, h, color) => ({ type: 'rect', x, y: BAR_BOTTOM - h, width: 16, height: h, fill: color, stroke: color });
    return [
      ...swingPath(),
      { type: 'line', points: [[160, 20], bob(0)], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[160, 20], bob(50)], color: 'gray', width: 2, dashed: true },
      { type: 'circle', x: bob(0)[0], y: bob(0)[1], r: 12, fill: 'white', stroke: 'gray' },
      { type: 'circle', x: bob(50)[0], y: bob(50)[1], r: 12, fill: 'white', stroke: 'gray' },
      { type: 'line', points: [[160, 20], p], color: 'ink', width: 2 },
      { type: 'circle', x: p[0], y: p[1], r: 12, fill: 'blue', stroke: 'ink' },
      mnote(8, 40, '位置エネルギー最大', 12),
      mnote(312, 40, '位置エネルギー最大', 12, 'end'),
      mnote(160, 204, '運動エネルギー最大', 13, 'middle'),
      mnote(160, 230, '和（力学的エネルギー）は一定', 13, 'middle'),
      bar(8, pe, 'orange'),
      bar(34, ke, 'blue'),
      bar(54, BAR_MAX, 'gray'),
      mnote(16, 232, '位置', 12, 'middle'),
      mnote(42, 232, '運動', 12, 'middle'),
      mnote(62, 232, '和', 12, 'middle'),
    ];
  }

  // ================================================================
  // 優先度 B（計画 5 章の B の 10 本）
  // ================================================================

  // figures.js の矢じりは線の太さ × 4。矢印はこれより長いときだけ描く（矢じりだけの形にならないように）
  const ARROW_HEAD = 4;
  const minArrow = (width) => ARROW_HEAD * (width || 3) + 2;

  // ---- 音の世界（sound）----

  // 糸電話の糸（静止図の (74,130)–(246,130)）を 17 点の折れ線にし、振動が左の紙コップから右へ伝わる（sound-2-c2）。
  // 両はしは y = 130 に固定（sin(π·k) を掛ける）。振れはばは u(t) で 0 → 最大 → 0（t = 0 で静止図と同じ直線）
  const PHONE_X1 = 74, PHONE_X2 = 246, PHONE_Y = 130, PHONE_AMP = 4;
  function phoneString(t) {
    const a = PHONE_AMP * u(t);
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16;
      pts.push([PHONE_X1 + (PHONE_X2 - PHONE_X1) * k, PHONE_Y + a * Math.sin(Math.PI * k) * osc(3 * k - 6 * t, 1)]);
    }
    return pts;
  }
  function soStringPhone(t) {
    return [
      { type: 'polygon', points: [[40, 100], [74, 112], [74, 148], [40, 160]], fill: 'white' },
      { type: 'line', points: phoneString(t), width: 2 },
      { type: 'polygon', points: [[246, 112], [280, 100], [280, 160], [246, 148]], fill: 'white' },
      { type: 'text', x: 160, y: 120, text: '糸', anchor: 'middle', size: 14 },
      { type: 'text', x: 160, y: 190, text: '糸が振動を伝える', anchor: 'middle', size: 14 },
      { type: 'text', x: 20, y: 40, text: '気体・液体・固体も音を伝える', size: 14 },
    ];
  }

  // ---- 力のはたらき（force）----

  // 箱が右へすべり、摩擦力でだんだん遅くなって止まる（force-1-c3）。箱は 140 → 200。
  // 「動く向き」の矢印は動かさない（箱といっしょに 60 動かすと場面の右はしから出るため）
  const FRICTION_RUN = 60;
  function frictionBoxX(t) {
    const p = stage(t, 0.05, 0.7);
    return 140 + FRICTION_RUN * (1 - (1 - p) * (1 - p));
  }
  function foFriction(t) {
    const x = frictionBoxX(t);
    const moving = t < 0.7;   // 止まったら（stage が 1）摩擦力の矢印と文字を消す
    const items = [
      { type: 'line', points: [[20, 110], [300, 110]], color: 'line', width: 3 },
      { type: 'rect', x, y: 70, width: 60, height: 40, fill: 'sand', label: '箱' },
      { type: 'arrow', x1: 210, y1: 60, x2: 280, y2: 60, color: 'gray', label: '動く向き' },
    ];
    if (moving) {
      items.push({ type: 'arrow', x1: x + 30, y1: 110, x2: x - 30, y2: 110, color: 'blue' });
      items.push({ type: 'text', x: 40, y: 134, text: '摩擦力', size: 14 });
    } else {
      items.push(text(230, 134, '摩擦力で止まった', 13, { anchor: 'middle' }));
    }
    items.push(
      { type: 'rect', x: 60, y: 160, width: 70, height: 34, fill: 'red', label: 'N' },
      { type: 'rect', x: 190, y: 160, width: 70, height: 34, fill: 'sky', label: 'S' },
      { type: 'text', x: 160, y: 222, text: '離れていても引き合う', size: 14, anchor: 'middle' },
    );
    return items;
  }

  // content/force.js の hookeGraph() と同じ部品（原点 (50,200)。横 0.1 N ＝ 45px、縦 1 cm ＝ 30px）。
  // shownUpTo: 測った点（黒丸）は x がこの値以下のものだけ描く
  const HOOKE_LINE = [[50, 200], [275, 50]];
  function hookeGraph(shownUpTo) {
    const items = [
      { type: 'line', points: [[50, 200], [305, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [50, 28]], width: 2, arrow: true },
      { type: 'text', x: 8, y: 22, text: '伸び〔cm〕', size: 12 },
      { type: 'text', x: 312, y: 236, text: '力の大きさ〔N〕', size: 12, anchor: 'end' },
      { type: 'text', x: 42, y: 216, text: '0', size: 12, anchor: 'end' },
    ];
    for (let i = 1; i <= 5; i++) {
      const gx = 50 + 45 * i, gy = 200 - 30 * i;
      items.push({ type: 'line', points: [[gx, 200], [gx, 50]], color: 'gray', width: 1, dashed: true });
      items.push({ type: 'line', points: [[50, gy], [275, gy]], color: 'gray', width: 1, dashed: true });
      items.push({ type: 'text', x: gx, y: 218, text: '0.' + i, size: 12, anchor: 'middle' });
      items.push({ type: 'text', x: 42, y: gy + 5, text: String(i), size: 12, anchor: 'end' });
    }
    items.push({ type: 'line', points: HOOKE_LINE, color: 'blue', width: 3 });
    for (let i = 1; i <= 5; i++) {
      if (50 + 45 * i <= shownUpTo + 1e-9) items.push({ type: 'circle', x: 50 + 45 * i, y: 200 - 30 * i, r: 5, fill: 'ink' });
    }
    return items;
  }
  // 動く点の位置（直線の上を原点から (275,50) まで）と、そのときの力〔N〕・伸び〔cm〕
  function hookePoint(t) {
    const p = along(HOOKE_LINE, stage(t, 0, 0.85));
    return { x: p.x, y: p.y, force: (p.x - 50) / 450, stretch: (200 - p.y) / 30 };
  }
  // ばねを引く力を大きくしていくと、伸びが比例して大きくなる。点が直線の上を進み、軸へ点線を下ろす（force-3-c2）
  // 「原点を通る直線」(100,60) の文字の範囲（横の点線はこの範囲を通らない）
  const HOOKE_TITLE = { left: 96, right: 202, top: 44, bottom: 64 };
  function foHookeGraph(t) {
    const p = hookePoint(t);
    const items = hookeGraph(p.x);
    const guide = (points) => ({ type: 'line', points, color: 'orange', width: 1.5, dashed: true });
    items.push(
      { type: 'text', x: 100, y: 60, text: '原点を通る直線', size: 14 },
      guide([[p.x, p.y], [p.x, 200]]),
    );
    // 横の点線（点 → 縦軸）。文字の高さを通るときは、文字の左と右に分けて描く
    if (p.y >= HOOKE_TITLE.top && p.y <= HOOKE_TITLE.bottom && p.x > HOOKE_TITLE.left) {
      items.push(guide([[50, p.y], [HOOKE_TITLE.left, p.y]]));
      if (p.x > HOOKE_TITLE.right) items.push(guide([[HOOKE_TITLE.right, p.y], [p.x, p.y]]));
    } else {
      items.push(guide([[p.x, p.y], [50, p.y]]));
    }
    items.push(
      { type: 'circle', x: p.x, y: p.y, r: 6, fill: 'orange', stroke: 'orange' },
      // 読み（横軸の目盛りの下。点線・方眼の線が通らない所）
      text(46, 236, '力 ' + p.force.toFixed(2) + ' N → 伸び ' + p.stretch.toFixed(1) + ' cm', 12, { color: 'orange', bold: true }),
    );
    return items;
  }

  // content/force.js の force(x1, y1, x2, y2, label) と同じ部品（力の矢印と作用点）
  function forceArrow(x1, y1, x2, y2, label) {
    const a = { type: 'arrow', x1, y1, x2, y2, color: 'blue' };
    if (label) a.label = label;
    return [a, { type: 'circle', x: x1, y: y1, r: 5, fill: 'blue', stroke: 'blue' }];
  }
  // 右の力のずれ（N）: 0〜0.2 は 0（つり合い）、0.2〜0.5 で 0 → +1（0.23〜0.47 は +1 のまま）→ 0、0.5〜0.7 は 0、
  // 0.7〜1 で 0 → −1（0.73〜0.97 は −1 のまま）→ 0。
  // （計画の osc(t, 1) だと、つり合っている時間が一瞬で「つり合っている」が読めない。また、ずれが小さい時間が長いと
  // 合力の矢印が矢じりより短くなるので、速く変えて ±1 N で止める）
  const BAL_RAMP = 0.03;
  function balancePulse(t, from, to) {
    return ease(stage(t, from, from + BAL_RAMP)) * (1 - ease(stage(t, to - BAL_RAMP, to)));
  }
  function balanceShift(t) {
    if (t < 0.2) return 0;
    if (t < 0.5) return balancePulse(t, 0.2, 0.5);
    if (t < 0.7) return 0;
    return -balancePulse(t, 0.7, 1);
  }
  const BALANCE_PX = 70 / 3;   // 1 N の矢印の長さ（静止図の 3 N ＝ 70px）
  // 右の力の大きさが変わると、2 力がつり合ったり、つり合わなくなったりする（force-4-c1）。箱は動かさない
  function foBalance(t) {
    const F = 3 + balanceShift(t);
    const net = F - 3;
    const balanced = Math.abs(net) < 0.05;
    const items = [
      { type: 'line', points: [[30, 120], [290, 120]], color: 'gray', width: 1, dashed: true },
      { type: 'rect', x: 130, y: 100, width: 60, height: 40, fill: 'sand', label: '箱' },
      ...forceArrow(130, 120, 60, 120, '3 N'),
      ...forceArrow(190, 120, 190 + BALANCE_PX * F, 120, balanced ? '3 N' : (Math.round(F * 10) / 10).toFixed(1) + ' N'),
      { type: 'text', x: 160, y: 190, text: '大きさが等しい・向きが反対', size: 14, anchor: 'middle' },
      { type: 'text', x: 160, y: 214, text: '一直線上にある', size: 14, anchor: 'middle' },
    ];
    // 合力の矢印は矢じりより長いときだけ（|F − 3| ≧ 0.6 N。ずれが小さいのは変わるときの一瞬だけ）
    if (!balanced && Math.abs(BALANCE_PX * net) >= minArrow()) {
      items.push({ type: 'arrow', x1: 160, y1: 84, x2: 160 + BALANCE_PX * net, y2: 84, color: 'green', label: '合力' });
    }
    items.push(text(160, 166, balanced ? 'つり合っている' : 'つり合っていない → 動きだす', 13,
      { anchor: 'middle', color: balanced ? 'blue' : 'red', bold: true }));
    return items;
  }

  // ---- 電流とその利用（electricity）----

  // content/electricity.js の axes・heatAxes と同じ部品（原点 (50,200)。横 1 分 ＝ 40px。縦の目盛りの数は書かない）
  function heatAxes() {
    const items = [
      { type: 'line', points: [[50, 200], [305, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [50, 28]], width: 2, arrow: true },
      { type: 'text', x: 8, y: 22, text: '上昇温度〔℃〕', size: 12 },
      { type: 'text', x: 312, y: 236, text: '時間〔分〕', size: 12, anchor: 'end' },
      { type: 'text', x: 42, y: 216, text: '0', size: 12, anchor: 'end' },
    ];
    ['1', '2', '3', '4', '5'].forEach((s, i) => {
      const gx = 50 + 40 * (i + 1);
      items.push({ type: 'line', points: [[gx, 200], [gx, 50]], color: 'gray', width: 1, dashed: true });
      items.push({ type: 'text', x: gx, y: 218, text: s, size: 12, anchor: 'middle' });
    });
    for (let i = 0; i < 6; i++) {
      const gy = 200 - 25 * (i + 1);
      items.push({ type: 'line', points: [[50, gy], [290, gy]], color: 'gray', width: 1, dashed: true });
    }
    return items;
  }
  const HEAT_6W = [[50, 200], [250, 50]];
  const HEAT_3W = [[50, 200], [250, 125]];
  const HEAT_GROW_TO = 0.7;   // 0.7 で 5 分まで伸び、そのあとは止まって見せる
  // 6 W と 3 W の電熱線の上昇温度のグラフが、時間とともに伸びる。同じ時刻の上昇温度は 2 : 1（elec-3-c3）
  function elHeatRise(t) {
    const p = stage(t, 0, HEAT_GROW_TO);
    const a = partial(HEAT_6W, p), b = partial(HEAT_3W, p);
    const items = heatAxes();
    if (a.length) items.push({ type: 'line', points: a, color: 'blue', width: 3 });
    if (b.length) items.push({ type: 'line', points: b, color: 'green', width: 3 });
    const tipA = along(HEAT_6W, p), tipB = along(HEAT_3W, p);
    if (p < 1) {
      items.push({ type: 'circle', x: tipA.x, y: tipA.y, r: 4, fill: 'blue', stroke: 'blue' });
      items.push({ type: 'circle', x: tipB.x, y: tipB.y, r: 4, fill: 'green', stroke: 'green' });
    }
    // 「6 W」「3 W」は線の先といっしょに動く（伸びきったとき静止図と同じ位置）。
    // 2 本の先が近い伸び始め（p < 0.25）は文字が重なるので出さない
    if (p >= 0.25) {
      items.push(
        { type: 'text', x: 258 + (tipA.x - 250), y: 55 + (tipA.y - 50), text: '6 W', size: 14 },
        { type: 'text', x: 258 + (tipB.x - 250), y: 130 + (tipB.y - 125), text: '3 W', size: 14 },
      );
    }
    items.push(text(60, 42, '時間 ' + (5 * p).toFixed(1) + ' 分', 13, { bold: true }));
    return items;
  }

  // 静電気（elec-4-c1）の時刻: こする 0〜0.4 → 右の 2 つを手で離す 0.4〜0.5 → 引き合って近づく 0.5〜0.62
  // → 左のストローを近づける 0.62〜0.69 → 離す（しりぞけ合う）0.69〜0.9
  const RUB_TO = 0.4, PART_TO = 0.5, ATTRACT_TO = 0.62, PUSH_TO = 0.69, REPEL_TO = 0.9;
  const RUB_X = 226;   // こすっているときのストローの x（ティッシュ 270 と半径 22 どうしで接する）
  const APART_STRAW = 190, APART_TISSUE = 286;   // 手で離したところ（そこから引き合って静止図の 205・270 へ近づく）
  // 電子 k（0〜2）がティッシュからストローへ移る時刻
  const electronStage = (t, k) => stage(t, 0.06 + 0.09 * k, 0.16 + 0.09 * k);
  // ストローとティッシュをこすり合わせると電子がティッシュからストローへ移り、ストローは −、ティッシュは ＋ になって引き合う。
  // −どうしのストローは近づけてもしりぞけ合う（elec-4-c1）
  function elStaticCharge(t) {
    const rub = t < RUB_TO;
    const charged = t >= RUB_TO;
    const part = ease(stage(t, RUB_TO, PART_TO)), pull = ease(stage(t, PART_TO, ATTRACT_TO));
    const strawX = rub ? RUB_X : lerp(lerp(RUB_X, APART_STRAW, part), 205, pull);
    const tissueX = lerp(lerp(270, APART_TISSUE, part), 270, pull);
    const strawY = 110 + (rub ? 6 * osc(stage(t, 0, RUB_TO), 3) : 0);   // こする（上下に 3 往復）
    // 左の 2 本: 0.62〜0.69 で 60・120 → 68・112（接する）に近づけ、0.69〜0.9 で離れて 60・120 にもどる
    const close = t < PUSH_TO ? ease(stage(t, ATTRACT_TO, PUSH_TO)) : 1 - ease(stage(t, PUSH_TO, REPEL_TO));
    const lx = 60 + 8 * close, rx = 120 - 8 * close;
    const items = [
      note(60, 76, 'ストロー'), note(120, 76, 'ストロー'),
      { type: 'circle', x: lx, y: 110, r: 22, fill: 'sky', label: '−' },
      { type: 'circle', x: rx, y: 110, r: 22, fill: 'sky', label: '−' },
    ];
    if (t >= PUSH_TO) {
      items.push({ type: 'arrow', x1: lx, y1: 150, x2: lx - 30, y2: 150, color: 'blue' });
      items.push({ type: 'arrow', x1: rx, y1: 150, x2: rx + 30, y2: 150, color: 'blue' });
    }
    items.push(
      note(90, 196, 'しりぞけ合う', 14),
      note(205, 76, 'ストロー'), note(270, 76, 'ティッシュ'),
      Object.assign({ type: 'circle', x: strawX, y: strawY, r: 22, fill: 'sky' }, charged ? { label: '−' } : {}),
      Object.assign({ type: 'circle', x: tissueX, y: 110, r: 22, fill: 'white' }, charged ? { label: '＋' } : {}),
    );
    // 電子（青い点）: ティッシュの中 (262, 100〜120) → ストローの中 (232, ストローの y −10〜+10)。−と＋の文字が出たら消す
    if (rub) {
      for (let k = 0; k < 3; k++) {
        const e = ease(electronStage(t, k));
        items.push({ type: 'circle', x: lerp(262, strawX + 6, e), y: lerp(100 + 10 * k, strawY - 10 + 10 * k, e), r: 4, fill: 'blue', stroke: 'blue' });
      }
    }
    // 「引き合う」の矢印は、手を離して近づき始めてから（丸といっしょに動く）
    if (t >= PART_TO) {
      items.push({ type: 'arrow', x1: strawX, y1: 150, x2: strawX + 25, y2: 150, color: 'blue' });
      items.push({ type: 'arrow', x1: tissueX, y1: 150, x2: tissueX - 25, y2: 150, color: 'blue' });
    }
    items.push(note(238, 196, '引き合う', 14), note(160, 30, 'こすり合わせたストローとティッシュ', 13));
    if (t < PART_TO) items.push(note(238, 226, '青い点: 電子（−の電気）', 12));
    return items;
  }

  // ---- 運動とエネルギー（motion）----

  // 斜面の上の物体（motion-1-c3）: 物体は下の辺の中点 SLOPE_Q（静止図の点 (120,160)・(164.7,137.6) の中点）を中心に
  // 斜面といっしょに回る（物体の位置を変えずに傾きだけを変える）。傾き θ = 26 + 9·cos(2πt) 度（17°〜35°）。
  // （計画の 15°〜35° で左下の点を中心に回すと、傾きが小さいとき重力の矢印と「重力」が場面の下から出るため）
  const SLOPE_Q = [(120 + 164.7) / 2, (160 + 137.6) / 2];
  const SLOPE_MID = 26, SLOPE_AMP = 9;
  const SLOPE_DEG0 = Math.atan(0.5) * 180 / Math.PI;   // 静止図の傾き（約 26.6°）
  const SPLIT_REST = Math.acos((SLOPE_DEG0 - SLOPE_MID) / SLOPE_AMP) / (2 * Math.PI);   // 傾きが静止図と同じになる t（約 0.24）
  const GRAVITY = 80;
  const slopeDeg = (t) => SLOPE_MID + SLOPE_AMP * Math.cos(2 * Math.PI * t);
  // 傾き deg のときの物体の形・重力と 2 つの分力の先
  function slopeForces(t) {
    const th = slopeDeg(t) * Math.PI / 180;
    const c = Math.cos(th), s = Math.sin(th);
    const dir = [c, -s];      // 斜面に沿って上へ
    const n = [-s, -c];       // 斜面から外へ（上向き）
    const [qx, qy] = SLOPE_Q;
    const p0 = [qx - 25 * dir[0], qy - 25 * dir[1]], p1 = [qx + 25 * dir[0], qy + 25 * dir[1]];
    const block = [p0, p1, [p1[0] + 50 * n[0], p1[1] + 50 * n[1]], [p0[0] + 50 * n[0], p0[1] + 50 * n[1]]];
    const o = [qx + 25 * n[0], qy + 25 * n[1]];   // 物体の中心（重力の作用点）
    const par = GRAVITY * s, per = GRAVITY * c;    // 平行な分力・垂直な分力の大きさ
    return {
      deg: slopeDeg(t), tan: s / c, block, o,
      gravity: [o[0], o[1] + GRAVITY],
      parallel: [o[0] - par * c, o[1] + par * s],    // 斜面に沿って下へ
      perpendicular: [o[0] + per * s, o[1] + per * c],   // 斜面に垂直に押す向き
    };
  }
  const SPLIT_AT_REST = slopeForces(SPLIT_REST);
  // 斜面の三角形（左下は地面 y 210 の上。x 20 より左に出るときは x 20 で切った四角形にする）
  function slopeShape(tan) {
    const [qx, qy] = SLOPE_Q;
    const yAt = (x) => qy - (x - qx) * tan;
    const left = qx - (210 - qy) / tan;
    const top = [300, yAt(300)];
    if (left >= 20) return [[left, 210], [300, 210], top];
    return [[20, yAt(20)], [20, 210], [300, 210], top];
  }
  // 斜面の傾きを変えると、重力（大きさは同じ）の斜面に平行な分力と垂直な分力の大きさが変わる（motion-1-c3）
  function moSlopeSplit(t) {
    const f = slopeForces(t);
    const mv = (p, p0) => [p[0] - p0[0], p[1] - p0[1]];   // 止まった絵からのずれ（文字を矢印の先といっしょに動かす）
    const dg = mv(f.gravity, SPLIT_AT_REST.gravity), dpa = mv(f.parallel, SPLIT_AT_REST.parallel), dpe = mv(f.perpendicular, SPLIT_AT_REST.perpendicular);
    return [
      { type: 'polygon', points: slopeShape(f.tan), fill: 'sand', stroke: 'line' },
      { type: 'polygon', points: f.block, fill: 'brown', stroke: 'ink' },
      { type: 'line', points: [f.parallel, f.gravity], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [f.perpendicular, f.gravity], color: 'gray', width: 2, dashed: true },
      { type: 'arrow', x1: f.o[0], y1: f.o[1], x2: f.gravity[0], y2: f.gravity[1], color: 'blue' },
      { type: 'arrow', x1: f.o[0], y1: f.o[1], x2: f.parallel[0], y2: f.parallel[1], color: 'green' },
      { type: 'arrow', x1: f.o[0], y1: f.o[1], x2: f.perpendicular[0], y2: f.perpendicular[1], color: 'green' },
      { type: 'circle', x: f.o[0], y: f.o[1], r: 4, fill: 'blue', stroke: 'blue' },
      mnote(131 + dg[0], 230 + dg[1], '重力', 14, 'middle'),
      mnote(92 + dpa[0], 150 + dpa[1], '平行な分力', 13, 'end'),
      mnote(172 + dpe[0], 200 + dpe[1], '垂直な分力', 13),
      mnote(20, 30, '傾き ' + Math.round(f.deg) + '°', 14),
      mnote(20, 48, '傾きが大きいほど平行な分力が大きい', 12),
    ];
  }

  // 水中の物体（motion-1-c4）: 水面 y 86（ビーカーの底 214、高さ 160、水の割合 0.8）。物体（60×44）の上の辺を 4 → 124 へ下ろす
  const WATER_TOP = 214 - 160 * 0.8;
  const BLOCK_H = 44;
  const buoyBlockY = (t) => lerp(4, 124, ease(stage(t, 0, 0.7)));
  const PRESSURE_PX = 32 / (168 - WATER_TOP);   // 水圧の矢印の長さ ÷ 深さ（約 0.39）
  // 水につかった割合（0〜1）とばねばかりの読み（N）
  function buoyancy(t) {
    const y = buoyBlockY(t);
    const s = clamp01((y + BLOCK_H - WATER_TOP) / BLOCK_H);
    return { y, s, reading: 3.0 - 0.8 * s };
  }
  // 物体を水に入れていくと、水につかった分だけ浮力がはたらき、ばねばかりの読みが 3.0 N → 2.2 N に減る。
  // 水圧の矢印は水中にある面にだけ描き、長さは深さに比例する（静止図の位置で 上 14.8・横 23.4・下 32。
  // 静止図の 上 18・横 22 は面ごとに比がちがうので、動く図では 1 つの比にそろえた）（motion-1-c4）
  function moBuoyancy(t) {
    const { y, reading } = buoyancy(t);
    const depth = (yy) => Math.max(0, yy - WATER_TOP);   // 水面からの深さ
    // 水圧の矢印の長さは深さに比例する（1 つの比。静止図の位置で下の面が静止図と同じ 32 になる比）
    const top = PRESSURE_PX * depth(y);
    const bottom = PRESSURE_PX * depth(y + BLOCK_H);
    const side = PRESSURE_PX * depth(y + 22);
    const items = [
      { type: 'beaker', x: 100, y: 214, width: 140, height: 160, level: 0.8 },
      { type: 'line', points: [[100, 0], [100, y]], color: 'ink', width: 1.5 },   // ばねばかりの糸
      { type: 'rect', x: 70, y, width: 60, height: BLOCK_H, fill: 'gray' },
    ];
    const MIN = minArrow();   // 矢じりより短い矢印は描かない
    if (top >= MIN) items.push({ type: 'arrow', x1: 100, y1: y - 2 - top, x2: 100, y2: y - 2, color: 'blue' });
    if (bottom >= MIN) items.push({ type: 'arrow', x1: 100, y1: y + BLOCK_H + 2 + bottom, x2: 100, y2: y + BLOCK_H + 2, color: 'blue' });
    if (side >= MIN) {
      items.push({ type: 'arrow', x1: 68 - side, y1: y + 22, x2: 68, y2: y + 22, color: 'blue' });
      items.push({ type: 'arrow', x1: 132 + side, y1: y + 22, x2: 132, y2: y + 22, color: 'blue' });
    }
    items.push(
      text(186, 40, 'いまの読み ' + reading.toFixed(1) + ' N', 13, { color: 'blue', bold: true }),
      mnote(186, 70, '空気中: 3.0 N', 14),
      mnote(186, 98, '水中: 2.2 N', 14),
      mnote(186, 140, '浮力 ＝', 14),
      mnote(186, 164, '3.0 N − 2.2 N', 14),
      mnote(186, 210, '下の面ほど水圧が大きい', 12),
    );
    return items;
  }

  // 作用・反作用（motion-3-c4）: 0〜0.25 は A が B を押している（腕がつながる。0.05〜0.25 は力の矢印を太く）、
  // 0.25〜0.8 で 2 人が反対向きに 36px ずつ離れ、そのあとは止まって見せる。
  // 離れると力ははたらかないので、力の矢印は押しているあいだだけ描く（離れたあとは「離れると力ははたらかない」）
  const PUSH_END = 0.25, APART = 36;
  const apart = (t) => APART * ease(stage(t, PUSH_END, 0.8));
  // A が B を押すと、A も B から同じ大きさで反対向きの力を受け、2 人とも反対向きに動きだす（motion-3-c4）
  function moActionReaction(t) {
    const d = apart(t);
    const pushing = t < PUSH_END;
    const w = t >= 0.05 && pushing ? { width: 5 } : {};
    const a = (x) => x - d, b = (x) => x + d;
    return [
      ...(pushing ? [
        Object.assign({ type: 'arrow', x1: 120, y1: 60, x2: 50, y2: 60, color: 'green', label: 'A が受ける力' }, w),
        Object.assign({ type: 'arrow', x1: 200, y1: 60, x2: 270, y2: 60, color: 'blue', label: 'B が受ける力' }, w),
      ] : [text(160, 56, '離れると力ははたらかない', 13, { anchor: 'middle', color: 'gray', bold: true })]),
      { type: 'circle', x: a(75), y: 96, r: 14, fill: 'pink' },
      { type: 'rect', x: a(62), y: 112, width: 26, height: 64, fill: 'sky', label: 'A' },
      { type: 'circle', x: b(235), y: 96, r: 14, fill: 'pink' },
      { type: 'rect', x: b(222), y: 112, width: 26, height: 64, fill: 'lightgreen', label: 'B' },
      ...(pushing
        ? [{ type: 'line', points: [[88, 130], [222, 130]], color: 'pink', width: 5 }]
        : [
          { type: 'line', points: [[a(88), 130], [a(102), 130]], color: 'pink', width: 5 },
          { type: 'line', points: [[b(208), 130], [b(222), 130]], color: 'pink', width: 5 },
        ]),
      { type: 'rect', x: a(40), y: 178, width: 70, height: 8, fill: 'brown' },
      { type: 'circle', x: a(52), y: 192, r: 6, fill: 'ink', stroke: 'ink' },
      { type: 'circle', x: a(98), y: 192, r: 6, fill: 'ink', stroke: 'ink' },
      { type: 'rect', x: b(200), y: 178, width: 70, height: 8, fill: 'brown' },
      { type: 'circle', x: b(212), y: 192, r: 6, fill: 'ink', stroke: 'ink' },
      { type: 'circle', x: b(258), y: 192, r: 6, fill: 'ink', stroke: 'ink' },
      mnote(160, 226, '同じ大きさ・反対向き・別々の物体', 14, 'middle'),
    ];
  }

  // 動滑車（motion-4-c2）: 静止図の位置から、手をゆるめておもりを PULLEY_D 下げ（0.08〜0.3）、
  // 手でひもを引いて静止図の位置へ引き上げる（0.36〜0.66）。引き上げてから 0.96 まで、引いた長さと上がった高さを見せる。
  // （計画の「静止図の位置から 20 上げる」だと、手が天井と場面の上はしから出るため、下げてから引き上げる形にした）
  const PULLEY_D = 14;
  const PULL_FROM = 0.36, PULL_TO = 0.66, SHOW_TO = 0.96;
  // おもりが静止図の位置より下にある量（0〜PULLEY_D）。手はその 2 倍下にある
  function pulleyLow(t) {
    if (t < PULL_FROM) return PULLEY_D * ease(stage(t, 0.08, 0.3));
    return PULLEY_D * (1 - ease(stage(t, PULL_FROM, PULL_TO)));
  }
  // 動滑車を使うと、手がひもを引く長さは、おもりが上がる高さの 2 倍になる（motion-4-c2）
  function moPulley(t) {
    const d = pulleyLow(t), h = 2 * d;
    // content/motion.js の pulley('おもり') と同じ部品（滑車・ひも・おもりは d、手は 2d だけ下）
    const rope = [[138, 18], [138, 120 + d], [141, 131 + d], [149, 139 + d], [160, 142 + d], [171, 139 + d], [179, 131 + d], [182, 120 + d], [182, 54 + h]];
    const items = [
      { type: 'rect', x: 40, y: 10, width: 240, height: 8, fill: 'gray', stroke: 'line' },
      { type: 'circle', x: 160, y: 120 + d, r: 22, fill: 'white', stroke: 'ink' },
      { type: 'line', points: rope, color: 'brown', width: 2 },
      { type: 'ellipse', x: 182, y: 44 + h, rx: 10, ry: 12, fill: 'pink' },
      { type: 'circle', x: 160, y: 120 + d, r: 4, fill: 'ink', stroke: 'ink' },
      { type: 'line', points: [[160, 120 + d], [160, 160 + d]], width: 2 },
      { type: 'rect', x: 132, y: 160 + d, width: 56, height: 36, fill: 'gray', label: 'おもり' },
      mnote(210, 126, '動滑車', 14),
      { type: 'arrow', x1: 200, y1: 96, x2: 200, y2: 48, color: 'blue' },
      mnote(208, 68, '引く力', 13),
      mnote(160, 226, '力は半分・ひもを引く距離は 2 倍', 14, 'middle'),
    ];
    // 引き上げているあいだと、そのあと: 引き始めの位置（点線）から、手が引いた長さ（右）と、おもりが上がった高さ（左）
    if (t >= PULL_FROM && t < SHOW_TO) {
      const pulled = 2 * PULLEY_D - h, raised = PULLEY_D - d;
      items.push(
        { type: 'line', points: [[170, 44 + 2 * PULLEY_D], [194, 44 + 2 * PULLEY_D]], color: 'gray', width: 1, dashed: true },
        { type: 'line', points: [[126, 196 + PULLEY_D], [194, 196 + PULLEY_D]], color: 'gray', width: 1, dashed: true },
      );
      // 引き始めの位置から上向きの矢印（片向き。矢じりより長くなってから描く）
      const up = (x, y1, y2, label, lx, ly, anchor) => (y1 - y2 >= minArrow(2) ? [
        { type: 'line', points: [[x, y1], [x, y2]], color: 'blue', width: 2, arrow: true },
        text(lx, ly, label, 12, { anchor, color: 'blue' }),
      ] : []);
      items.push(
        ...up(262, 44 + 2 * PULLEY_D, 44 + h, '引いた長さ', 262, 88, 'middle'),
        ...up(110, 196 + PULLEY_D, 196 + d, '上がった高さ', 104, 200, 'end'),
      );
    }
    return items;
  }

  // ================================================================
  // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md の「動く図（新規）」の物理の 6 本
  // （光の li-lens-cover も、anim.js の BUILD を変えないためここで足す）
  // ================================================================

  // ---- 光の世界（light）----

  // content/light.js の light-mp4-c3 の静止図（光軸 y 110、レンズ cx 160・f 50、物体 x 60 高さ 44、実像 x 260 高さ −44）。
  // 物体の先 (60,66) から出た光は、レンズのどこを通っても実像の先 (260,154) に集まる
  const COVER_RAYS = [66, 82, 138, 162];   // 光がレンズを通る高さ（上半分 2 本は静止図の光線、下半分 2 本は紙でさえぎられる）
  const COVER_TOP = 112, COVER_BOTTOM = 184;   // 紙（静止図の shadow の rect）の上と下
  // 実像の矢印（figures.js の object と同じ形。色だけ変える）
  function imageArrow(x, y, h, color) {
    const tipY = y - h, s = h >= 0 ? 1 : -1;
    return [
      { type: 'line', points: [[x, y], [x, tipY + s * 10]], color, width: 4 },
      { type: 'polygon', points: [[x, tipY], [x - 8, tipY + s * 14], [x + 8, tipY + s * 14]], fill: color, stroke: 'none' },
    ];
  }
  // 紙がレンズの下半分を下からおおう。上半分を通った光だけで像は全体が映るが、届く光が減ってうすくなる（light-mp4-c3）
  function liLensCover(t) {
    const p = stage(t, 0, 0.3);                  // 光が伸びる
    const c = ease(stage(t, 0.4, 0.7));          // 紙が上がる
    const top = COVER_BOTTOM - (COVER_BOTTOM - COVER_TOP) * c;
    const items = [
      { type: 'axis', y: 110 },
      { type: 'lens', cx: 160, cy: 110, height: 140, f: 50 },
    ];
    if (c > 0) items.push({ type: 'rect', x: 148, y: top, width: 24, height: COVER_BOTTOM - top, fill: 'shadow', stroke: 'none' });
    items.push({ type: 'object', x: 60, y: 110, height: 44, label: 'ろうそく' });
    let passing = 0;
    COVER_RAYS.forEach(y => {
      if (y < top) {
        passing++;
        items.push(...grow([[60, 66], [160, y], [260, 154]], p));
      } else if (t < 0.8) {
        // 紙に当たった光は紙の手前（x 148）で止まる。おおい終わったら消す（静止図は上の 2 本だけ）
        items.push(...grow([[60, 66], [148, 66 + (y - 66) * 0.88]], p));
      }
    });
    if (p >= 1) {
      items.push(...imageArrow(260, 110, -44, mix(TOKEN_HEX.green, TOKEN_HEX.white, 0.5 * (4 - passing) / 4)));
      items.push({ type: 'label', x: 186, y: 210, text: c >= 1 ? '全体が映る・暗い' : '全体が映る・明るい' });
    }
    return items;
  }

  // ---- 音の世界（sound）----

  // 鳴っているおんさのうでが振動し、手でにぎると振動が止まる。手をはなしてたたき直すと、また振動する（sound-mp1-c1）
  function forkStopAmp(t) {
    if (t < 0.5) return 1;
    if (t < 0.58) return 1 - ease(stage(t, 0.5, 0.58));
    if (t < 0.92) return 0;
    return ease(stage(t, 0.92, 1));
  }
  function soForkStop(t) {
    const amp = forkStopAmp(t);
    const items = fork(100, 40, amp > 0.05, 3 * amp * osc(t, 10));
    // 手（にぎる前に右から近づき、止めたあと右へはなれる）
    if (t >= 0.46 && t < 0.9) {
      const hx = t < 0.52 ? lerp(150, 100, ease(stage(t, 0.46, 0.52))) : lerp(100, 150, ease(stage(t, 0.84, 0.9)));
      items.push({ type: 'ellipse', x: hx, y: 86, rx: 28, ry: 13, fill: 'pink' });
    }
    items.push(
      { type: 'text', x: 100, y: 214, text: 'おんさ', anchor: 'middle', size: 14 },
      { type: 'text', x: 170, y: 70, text: '点線: うでが振動', size: 14 },
      { type: 'text', x: 170, y: 110, text: 'にぎると', size: 14 },
      { type: 'text', x: 170, y: 132, text: '振動も音も止まる', size: 14 },
      amp > 0.05 ? text(170, 166, '音: 鳴っている', 13, { color: 'blue', bold: true })
        : text(170, 166, '音: 止まった', 13, { color: 'red', bold: true }),
    );
    return items;
  }

  // A のおんさの振動が空気を伝わり（弧が A から B へ進む）、B に届くと B もおくれて振動しはじめる（sound-mp1-c2）。
  // 弧の進め方は so-air-wave と同じ（弧の半分の高さとふくらみを x で決め、生まれる所と B に着く所では小さくする）
  const RESO_X0 = 84, RESO_X1 = 224;   // 弧が生まれる所（A のうでのすぐ右）・B に着いて消える所
  const RESO_GAP = 28, RESO_SPEED = 280;   // 弧の間隔（静止図の 112・140・168）・1 周に進む量
  const RESO_HALF = [[84, 30], [112, 35], [140, 41], [168, 35], [224, 35]];
  const RESO_BULGE = [[84, 6], [112, 8], [140, 10], [168, 10], [224, 10]];
  const RESO_ARRIVE = (RESO_X1 - 168) / RESO_SPEED;   // 先頭の弧（t = 0 で x 168）が B に着く時刻（0.2）
  function soResonance(t) {
    const b = ease(stage(t, RESO_ARRIVE + 0.02, RESO_ARRIVE + 0.15));   // B の振れはば（0 → 1）
    const arcs = [];
    for (let j = 0; ; j++) {
      const x = 168 - RESO_GAP * j + RESO_SPEED * t;   // t = 0 で 168・140・112
      if (x < RESO_X0) break;
      if (x > RESO_X1) continue;
      const f = clamp01((x - RESO_X0) / RESO_GAP) * clamp01((RESO_X1 - x) / 16);
      if (f < 0.05) continue;
      const h = piecewise(RESO_HALF, x) * f, bulge = piecewise(RESO_BULGE, x) * f;
      arcs.push({ type: 'line', points: [[x, 115 - h], [x + bulge, 115], [x, 115 + h]], color: 'blue', width: 2 });
    }
    const items = [
      ...fork(70, 50, true, 3 * osc(t, 10)),
      ...fork(250, 50, b > 0.3, 3 * b * osc(t, 10)),
      ...arcs,
      { type: 'text', x: 70, y: 226, text: 'A（鳴らす）', anchor: 'middle', size: 14 },
      { type: 'text', x: 250, y: 226, text: 'B', anchor: 'middle', size: 14 },
      { type: 'text', x: 145, y: 30, text: '空気の振動', anchor: 'middle', size: 14 },
    ];
    if (b >= 0.5) items.push(text(250, 30, 'B も鳴りだす', 13, { anchor: 'middle', color: 'blue', bold: true }));
    return items;
  }

  // 波形が左へ流れ、X（振幅）の矢印の先が山に合わせて伸び縮みする。同じ時間（図のはば）の山を 1 つずつ数える（sound-mp3-c1）。
  // 波形は content/sound.js の wave(40, 120, 250, 60, 2) と同じ式（shift = −t で左へ流す）
  const AMP_K = (72 - 40) / 250;   // X の矢印の x（72）の、波形の中の位置
  function soAmpFreq(t) {
    const s = Math.sin(2 * Math.PI * 2 * (AMP_K + t));
    const len = 58 * Math.abs(s) / Math.sin(2 * Math.PI * 2 * AMP_K);   // t = 0 で静止図の 58（120 → 62）
    const counting = t >= 0.15 && t < 0.95;
    const items = [
      { type: 'line', points: [[30, 120], [300, 120]], color: 'gray', width: 1 },
      wave(40, 120, 250, 60, 2, null, -t),
    ];
    if (len >= minArrow(2)) items.push({ type: 'arrow', x1: 72, y1: 120, x2: 72, y2: 120 - len, color: 'blue', width: 2 });
    // 数えている間は、図の中の 2 つの山に丸を付ける（山は 1 周に 2 つ分左へ進む）
    if (counting) {
      const k0 = (((0.125 - t) / 0.5) - Math.floor((0.125 - t) / 0.5)) * 0.5;   // 左はしに近いほうの山の位置（0〜0.5）
      [k0, k0 + 0.5].forEach(k => items.push({ type: 'circle', x: 40 + 250 * k, y: 60, r: 4, fill: 'orange', stroke: 'orange' }));
    }
    // 数える丸（1 つ目 → 2 つ目の順に点く）
    [[140, 0.2], [180, 0.45]].forEach(([x, from], i) => {
      const on = t >= from && t < 0.95;
      items.push({ type: 'circle', x, y: 194, r: 10, fill: on ? 'orange' : 'white', stroke: on ? 'orange' : 'line', label: String(i + 1) });
    });
    items.push(
      { type: 'text', x: 96, y: 46, text: 'X（振幅）', size: 14 },
      { type: 'text', x: 160, y: 222, text: '同じ時間の波の数 → 振動数', anchor: 'middle', size: 14 },
    );
    return items;
  }

  // ---- 力のはたらき（force）----

  // 左: 手の力の矢印が下りてスポンジがつぶれる。中: 転がるボールが手の力で止まる。右: 荷物を手で支えている（force-mp1-c1）。
  // 止まった絵（0.99）が静止図（スポンジの ry 12、ボール x 150）。スポンジの下（y 152）は動かさない
  function foThreeEffects(t) {
    const fall = ease(stage(t, 0, 0.15)), press = ease(stage(t, 0.15, 0.4));
    const ry = 18 - 6 * press, top = 152 - 2 * ry;
    const tip = lerp(80, 112, fall) + (top - 116);   // 矢印の先（スポンジの上の 4px 上まで下りてから、いっしょに下がる）
    const roll = stage(t, 0.1, 0.5);
    const bx = lerp(118, 150, roll);   // スポンジ（x 17〜93）にかからない所から転がす
    const items = [
      { type: 'ellipse', x: 55, y: 152 - ry, rx: 38, ry, fill: 'yellow' },
      { type: 'arrow', x1: 55, y1: tip - 54, x2: 55, y2: tip, color: 'blue' },
      { type: 'text', x: 55, y: 176, text: 'スポンジ', size: 13, anchor: 'middle' },
      { type: 'circle', x: bx, y: 130, r: 14, fill: 'white' },
      { type: 'ellipse', x: 178, y: 130, rx: 10, ry: 18, fill: 'pink' },
    ];
    // 転がる向きの矢印（ボールの左。スポンジにかからないよう x 100 より左は描かない）
    const back = Math.max(100, bx - 40);
    if (bx - 18 - back >= minArrow(2)) items.push({ type: 'arrow', x1: back, y1: 130, x2: bx - 18, y2: 130, color: 'gray', width: 2 });
    if (roll >= 1) items.push({ type: 'arrow', x1: 196, y1: 100, x2: 166, y2: 100, color: 'blue' });   // ボールに当たってから手の力
    items.push(
      { type: 'text', x: 160, y: 176, text: '転がるボール', size: 13, anchor: 'middle' },
      { type: 'rect', x: 245, y: 96, width: 44, height: 34, fill: 'sand' },
      { type: 'ellipse', x: 267, y: 140, rx: 26, ry: 9, fill: 'pink' },
      { type: 'arrow', x1: 267, y1: 130, x2: 267, y2: 80, color: 'blue' },
      { type: 'text', x: 267, y: 176, text: '荷物', size: 13, anchor: 'middle' },
      { type: 'text', x: 55, y: 214, text: '形を変える', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 214, text: '運動を変える', size: 13, anchor: 'middle' },
      { type: 'text', x: 267, y: 214, text: '支える', size: 13, anchor: 'middle' },
    );
    return items;
  }

  // 重力と垂直抗力、「動かす向き」の印（灰色。力の大きさではないので伸ばさず、静止図と同じ長さ）はそのまま。
  // 箱を動かそうとすると、摩擦力（緑）が反対向きに伸び、箱は動かない（force-mp1-c2）
  function foNormalFriction(t) {
    const k = ease(stage(t, 0.1, 0.7));
    const items = [
      { type: 'line', points: [[20, 170], [300, 170]], color: 'line', width: 3 },
      { type: 'rect', x: 120, y: 110, width: 80, height: 60, fill: 'sand' },
      ...forceArrow(160, 140, 160, 210),
      ...forceArrow(160, 170, 160, 90),
    ];
    items.push({ type: 'arrow', x1: 200, y1: 150, x2: 260, y2: 150, color: 'gray', width: 2 });
    if (48 * k >= minArrow()) items.push({ type: 'arrow', x1: 120, y1: 166, x2: 120 - 48 * k, y2: 166, color: 'green' });
    items.push(
      { type: 'text', x: 172, y: 222, text: '重力', size: 14 },
      { type: 'text', x: 172, y: 86, text: '垂直抗力', size: 14 },
      { type: 'text', x: 214, y: 140, text: '動かす向き', size: 13 },
      { type: 'text', x: 30, y: 156, text: '摩擦力', size: 14 },
    );
    if (k >= 1) items.push(text(214, 124, '箱は動かない', 12, { color: 'green', bold: true }));
    return items;
  }

  // ================================================================
  // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」の電流の 7 本
  // 静止図は content/electricity.js の electricity-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // （計画の el-branch-current・el-heat-voltage・el-straw-charge・el-induction-needle は、既存の kind を使い回す）
  // ================================================================

  // 小数部分（0 以上 1 未満）
  function frac(x) { return x - Math.floor(x); }
  // 導線の中の印: × は表から裏、・は裏から表（静止図と同じ形。丸は半径 10）
  function wireMark(x, y, into) {
    const items = [{ type: 'circle', x, y, r: 10, fill: 'white', stroke: 'ink' }];
    if (into) items.push({ type: 'line', points: [[x - 6, y - 6], [x + 6, y + 6]], width: 2 }, { type: 'line', points: [[x - 6, y + 6], [x + 6, y - 6]], width: 2 });
    else items.push({ type: 'circle', x, y, r: 3, fill: 'ink', stroke: 'ink' });
    return items;
  }

  // ---- 陰極線（electricity-mp12-c2）----
  const CATHODE_RAY = [[30, 120], [120, 120], [200, 108], [288, 88]];   // 静止図の緑の光のすじ
  // 電子の点（sky）が A（−）から出て光のすじにそって進み、極板 C（＋）のほうへ曲がりながら B へ向かう
  // （frac(t + (k + 0.5)/6)。t = 1 と t = 0 がつながる）
  function elCathodeBend(t) {
    const electrons = [];
    for (let k = 0; k < 6; k++) {
      const q = along(CATHODE_RAY, frac(t + (k + 0.5) / 6));
      electrons.push({ type: 'circle', x: q.x, y: q.y, r: 3, fill: 'sky', stroke: 'ink' });
    }
    return [
      { type: 'ellipse', x: 160, y: 120, rx: 150, ry: 56, fill: 'glass' },
      { type: 'rect', x: 18, y: 104, width: 12, height: 32, fill: 'ink' },
      { type: 'rect', x: 290, y: 84, width: 8, height: 72, fill: '#9BE3B0' },
      { type: 'rect', x: 120, y: 92, width: 80, height: 6, fill: 'red', stroke: 'none' },
      { type: 'rect', x: 120, y: 142, width: 80, height: 6, fill: 'blue', stroke: 'none' },
      text(24, 96, 'A（−）', 12, { anchor: 'middle' }),
      text(294, 74, 'B（＋）', 12, { anchor: 'middle' }),
      text(160, 86, 'C（＋）', 12, { anchor: 'middle' }),
      text(160, 166, 'D（−）', 12, { anchor: 'middle' }),
      { type: 'line', points: CATHODE_RAY, color: 'green', width: 4 },
      ...electrons,
      text(160, 222, '光のすじは C（＋）のほうへ曲がる', 13, { anchor: 'middle' }),
    ];
  }

  // ---- 磁石のまわりの磁界（electricity-mp13-c1）----
  // 棒磁石を 2 つの点の極（N (110,120)・S (210,120)）とみた磁界の向き（N 極から出て S 極に入る）。長さ 1 にして返す
  const POLE_N = [110, 120], POLE_S = [210, 120];
  function magnetField(x, y) {
    const dn = Math.hypot(x - POLE_N[0], y - POLE_N[1]), ds = Math.hypot(x - POLE_S[0], y - POLE_S[1]);
    const bx = (x - POLE_N[0]) / (dn * dn * dn) - (x - POLE_S[0]) / (ds * ds * ds);
    const by = (y - POLE_N[1]) / (dn * dn * dn) - (y - POLE_S[1]) / (ds * ds * ds);
    const b = Math.hypot(bx, by);
    return [bx / b, by / b];
  }
  // 方位磁針（静止図と同じ形）: 中心 (x, y)、針の N 極（赤）の向き (ux, uy)
  function compass(x, y, ux, uy, stroke) {
    const nx = -uy, ny = ux;   // 針に直角の向き
    const base = [[x + 5 * nx, y + 5 * ny], [x - 5 * nx, y - 5 * ny]];
    return [
      { type: 'circle', x, y, r: 17, fill: 'white', stroke: stroke || 'gray' },
      { type: 'polygon', points: [[x + 14 * ux, y + 14 * uy]].concat(base), fill: 'red' },
      { type: 'polygon', points: [[x - 14 * ux, y - 14 * uy]].concat(base), fill: 'white' },
    ];
  }
  // 方位磁針 1 つ（青いふち）が棒磁石のまわりの楕円（中心 (160,120)、横 104・たて 60）を上 (160,60) から反時計回りに 1 周し、
  // 針がその場所の磁界の向きに回る。静止図の 4 つの方位磁針はそのまま。t = 0 で動く方位磁針は上の方位磁針と重なる
  function elCompassAround(t) {
    const a = 2 * Math.PI * (0.25 + t);
    const x = 160 + 104 * Math.cos(a), y = 120 - 60 * Math.sin(a);
    const [ux, uy] = magnetField(x, y);
    return [
      { type: 'rect', x: 100, y: 105, width: 60, height: 30, fill: 'red', label: 'N' },
      { type: 'rect', x: 160, y: 105, width: 60, height: 30, fill: 'blue', label: 'S' },
      ...compass(160, 60, 1, 0),
      ...compass(56, 120, -1, 0),
      ...compass(264, 120, -1, 0),
      ...compass(160, 180, 1, 0),
      ...compass(x, y, ux, uy, 'blue'),
      text(160, 228, '方位磁針の赤い側が N 極', 13, { anchor: 'middle' }),
    ];
  }

  // ---- まっすぐな導線のまわりの磁界（electricity-mp14-c1）----
  // 左右の導線のまわりの円（半径 36）の上を青い点が磁界の向きに回る（×（表から裏）は時計回り ＝ onCircle の角が減る向き、
  // ・（裏から表）は反時計回り）。中央の右ねじの頭は、×（ねじが表から裏へ進む）と同じ時計回りに回る
  function elWireField(t) {
    const dots = [];
    for (let k = 0; k < 4; k++) {
      const [lx, ly] = onCircle(80, 110, 36, 45 + 90 * k - 360 * t);
      const [rx, ry] = onCircle(240, 110, 36, 45 + 90 * k + 360 * t);
      dots.push({ type: 'circle', x: lx, y: ly, r: 4, fill: 'blue', stroke: 'none' }, { type: 'circle', x: rx, y: ry, r: 4, fill: 'blue', stroke: 'none' });
    }
    const [s1x, s1y] = onCircle(160, 104, 10, 45 - 360 * t), [s2x, s2y] = onCircle(160, 104, 10, 225 - 360 * t);
    return [
      { type: 'circle', x: 80, y: 110, r: 36, fill: 'none', stroke: 'gray' },
      { type: 'arrow', x1: 68, y1: 74, x2: 92, y2: 74, color: 'blue' },
      { type: 'arrow', x1: 92, y1: 146, x2: 68, y2: 146, color: 'blue' },
      ...wireMark(80, 110, true),
      { type: 'circle', x: 240, y: 110, r: 36, fill: 'none', stroke: 'gray' },
      { type: 'arrow', x1: 252, y1: 74, x2: 228, y2: 74, color: 'blue' },
      { type: 'arrow', x1: 228, y1: 146, x2: 252, y2: 146, color: 'blue' },
      ...wireMark(240, 110, false),
      ...dots,
      // 右ねじの頭（溝の線が時計回りに回る）
      { type: 'circle', x: 160, y: 104, r: 13, fill: 'glass', stroke: 'line' },
      { type: 'line', points: [[s1x, s1y], [s2x, s2y]], color: 'ink', width: 3 },
      text(160, 136, '右ねじ', 12, { anchor: 'middle' }),
      text(80, 176, '×（表から裏）', 13, { anchor: 'middle' }),
      text(80, 196, '→ 時計回り', 13, { anchor: 'middle' }),
      text(240, 176, '・（裏から表）', 13, { anchor: 'middle' }),
      text(240, 196, '→ 反時計回り', 13, { anchor: 'middle' }),
      text(160, 30, '電流の向きに右ねじを進める', 13, { anchor: 'middle' }),
    ];
  }

  // ---- コイルのまわりの磁界（electricity-mp14-c2）----
  const COIL_X = [120, 132, 144, 156, 168, 180, 192];   // 静止図のコイルの 7 つの輪（楕円 rx 7・ry 32、中心 y 120）
  // コイルの外を右から左へもどる磁界の道すじ（文字「磁界」「手前側の電流」「コイル」にかからないよう、上をまわる）
  const COIL_RETURN = [[226, 116], [250, 60], [200, 40], [110, 40], [40, 52], [30, 100], [70, 118]];
  // 手前側（輪の右半分）の導線の上をだいだいの点が下向きに流れ（電流）、コイルの内部を青いふちの点が左から右へ流れる（磁界）。
  // 外では点線にそって右から左へもどる。t = 1 と t = 0 がつながる
  function elCoilField(t) {
    const items = [{ type: 'line', points: [[60, 120], [270, 120]], color: 'gray', width: 1, dashed: true }];
    COIL_X.forEach(x => items.push({ type: 'ellipse', x, y: 120, rx: 7, ry: 32, fill: 'none', stroke: 'brown' }));
    items.push(
      { type: 'line', points: [[120, 152], [120, 200], [100, 200]], width: 2 },
      { type: 'line', points: [[192, 152], [192, 200], [212, 200]], width: 2 },
      { type: 'line', points: COIL_RETURN, color: 'gray', width: 1, dashed: true },
    );
    // 電流: 輪の右半分を上から下へ（角 φ = 90° → −90°）
    COIL_X.forEach((x, i) => {
      const phi = (90 - 180 * frac(t + 0.13 * i + 0.05)) * Math.PI / 180;
      items.push({ type: 'circle', x: x + 7 * Math.cos(phi), y: 120 - 32 * Math.sin(phi), r: 3, fill: 'orange', stroke: 'none' });
    });
    items.push(
      { type: 'arrow', x1: 90, y1: 92, x2: 90, y2: 148, color: 'orange' },
      text(84, 76, '手前側の電流', 12, { anchor: 'middle' }),
      text(156, 76, 'コイル', 12, { anchor: 'middle' }),
      { type: 'arrow', x1: 130, y1: 120, x2: 230, y2: 120, color: 'blue', width: 4 },
    );
    for (let k = 0; k < 4; k++) {
      const x = 118 + 80 * frac(t + (k + 0.5) / 4);
      items.push({ type: 'circle', x, y: 120, r: 4, fill: 'white', stroke: 'blue' });
    }
    for (let k = 0; k < 3; k++) {
      const q = along(COIL_RETURN, frac(t + (k + 0.5) / 3));
      items.push({ type: 'circle', x: q.x, y: q.y, r: 3.5, fill: 'white', stroke: 'blue' });
    }
    items.push(
      text(236, 112, '磁界', 13, { bold: true }),
      text(160, 232, '手前側の電流が下向き → 内部の磁界は右向き', 12, { anchor: 'middle' }),
    );
    return items;
  }

  // ---- 磁界の中の導線が受ける力（electricity-mp15-c1）----
  // 導線（(160,120) の丸と×）が左へ 30 動いてもどる（dx = −30·u(t)）。動いていくあいだ（t < 0.5）は「電流を流す」、
  // もどるあいだは「電流を切る」を (262,214)（S 極の磁石の右）に出す。力の矢印と「力」は導線といっしょに動き、電流を切った
  // あいだ（t ≧ 0.5）は力がないので描かない。t = 0 が静止図の位置
  function elWireForce(t) {
    const dx = -30 * u(t), on = t < 0.5;
    const items = [
      { type: 'rect', x: 110, y: 14, width: 100, height: 36, fill: 'red', label: 'N' },
      { type: 'rect', x: 110, y: 190, width: 100, height: 36, fill: 'blue', label: 'S' },
      { type: 'arrow', x1: 300, y1: 70, x2: 300, y2: 170, color: 'gray' },
      text(300, 60, '磁界', 12, { anchor: 'middle' }),
      ...wireMark(160 + dx, 120, true),
      text(56, 214, '電流は表から裏へ', 12, { anchor: 'middle' }),
    ];
    if (on) {
      items.push(
        { type: 'arrow', x1: 144 + dx, y1: 120, x2: 90 + dx, y2: 120, color: 'orange', width: 4 },
        text(90 + dx, 108, '力', 14, { bold: true }),
      );
    }
    items.push(text(262, 214, on ? '電流を流す' : '電流を切る', 12, { anchor: 'middle', color: on ? 'orange' : 'gray', bold: true }));
    return items;
  }

  // ---- モーター（electricity-mp15-c2）----
  // コイル（円 r 62 の上の 2 点を結ぶ線）が時計回りに回る（AB の角 180 − 360t、CD はその反対側）。整流子のはたらきで、
  // 左側（x < 160）にある導線はいつも「・」で上向きの力、右側はいつも「×」で下向きの力。コイルがたてになる所で入れかわる。
  // 下の「AB（・）」「CD（×）」の文字は、いま左側・右側にある導線の名前に変える。力の矢印（長さ 38）は、上の題（y 26 より上）と
  // 下の文（y 200 より下）にかからないよう先を止め、短くなりすぎたら描かない。t = 0 が静止図と同じ。t = 1 と t = 0 がつながる
  function elMotorRotate(t) {
    const pAB = onCircle(160, 120, 62, 180 - 360 * t), pCD = onCircle(160, 120, 62, -360 * t);
    const abLeft = pAB[0] < 160 || (pAB[0] === 160 && pAB[1] < 120);
    const left = abLeft ? pAB : pCD, right = abLeft ? pCD : pAB;
    return [
      { type: 'rect', x: 6, y: 80, width: 44, height: 80, fill: 'red', label: 'N' },
      { type: 'rect', x: 270, y: 80, width: 44, height: 80, fill: 'blue', label: 'S' },
      { type: 'circle', x: 160, y: 120, r: 62, fill: 'none', stroke: 'gray' },
      { type: 'line', points: [pAB, pCD], color: 'brown', width: 2 },
      ...wireMark(left[0], left[1], false),
      ...wireMark(right[0], right[1], true),
      text(98, 150, (abLeft ? 'AB' : 'CD') + '（・）', 12, { anchor: 'middle' }),
      text(222, 150, (abLeft ? 'CD' : 'AB') + '（×）', 12, { anchor: 'middle' }),
      text(160, 18, '磁界は N 極から S 極へ（→）', 12, { anchor: 'middle' }),
      text(160, 216, 'AB は上、CD は下へ → 時計回りに回る', 12, { anchor: 'middle' }),
    ].concat(motorForce(left, -1), motorForce(right, 1));
  }
  // 導線 p にはたらく力の矢印（dir = −1 で上、1 で下）
  function motorForce(p, dir) {
    const y1 = p[1] + 16 * dir, y2 = dir < 0 ? Math.max(26, p[1] - 54) : Math.min(200, p[1] + 54);
    return Math.abs(y2 - y1) >= 10 ? [{ type: 'arrow', x1: p[0], y1, x2: p[0], y2, color: 'orange', width: 3 }] : [];
  }

  // ---- 直流と交流（electricity-mp16-c2）----
  // 静止図の交流の線（content/electricity.js の electricity-mp16-c2。y = 180 − 34·sin(2π(x − 60)/96)）
  const AC_POINTS = (() => {
    const pts = [];
    for (let x = 60; x <= 300; x += 4) pts.push([x, Math.round((180 - 34 * Math.sin(2 * Math.PI * (x - 60) / 96)) * 10) / 10]);
    return pts;
  })();
  // 折れ線を x ≦ xEnd の所まで
  function clipLineX(pts, xEnd) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p[0] <= xEnd + 1e-9) { out.push([p[0], p[1]]); continue; }
      const a = pts[i - 1];
      if (a) out.push([xEnd, a[1] + (p[1] - a[1]) * (xEnd - a[0]) / (p[0] - a[0])]);
      break;
    }
    return out;
  }
  // 直流と交流のグラフの線を左から右へ同時に伸ばし（stage(t, 0, 0.8)）、交流の線の先が軸より上なら「＋の向き」、
  // 下なら「−の向き」を右に出す（直流はいつも「＋の向き」）。止まった絵（0.99）が静止図と同じ
  function elDcAc(t) {
    const k = stage(t, 0, 0.8);
    const xEnd = 60 + 240 * k;
    const ac = clipLineX(AC_POINTS, xEnd);
    const items = [
      { type: 'line', points: [[60, 70], [306, 70]], color: 'gray', width: 1, arrow: true },
      { type: 'line', points: [[60, 110], [60, 20]], color: 'gray', width: 1 },
    ];
    if (xEnd > 60.5) items.push({ type: 'line', points: [[60, 40], [xEnd, 40]], color: 'blue', width: 3 });
    items.push(
      { type: 'line', points: [[60, 180], [306, 180]], color: 'gray', width: 1, arrow: true },
      { type: 'line', points: [[60, 226], [60, 134]], color: 'gray', width: 1 },
    );
    if (ac.length >= 2) items.push({ type: 'line', points: ac, color: 'blue', width: 3 });
    items.push(
      text(306, 88, '時間', 12, { anchor: 'end' }),
      text(306, 236, '時間', 12, { anchor: 'end' }),
      text(66, 32, '直流（乾電池）', 12),
      text(66, 140, '交流（コンセント）', 12, { bg: true }),
    );
    if (k < 1) {
      const tip = ac[ac.length - 1];
      items.push(
        { type: 'circle', x: xEnd, y: 40, r: 4, fill: 'blue', stroke: 'none' },
        { type: 'circle', x: tip[0], y: tip[1], r: 4, fill: 'blue', stroke: 'none' },
        text(306, 28, '＋の向き', 12, { anchor: 'end', color: 'blue', bold: true }),
      );
      if (Math.abs(tip[1] - 180) > 0.5) {
        const plus = tip[1] < 180;
        items.push(text(306, 140, plus ? '＋の向き' : '−の向き', 12, { anchor: 'end', color: plus ? 'blue' : 'red', bold: true }));
      }
    }
    return items;
  }

  // ================================================================
  // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」の運動の 12 本
  // 静止図は content/motion.js の motion-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // （計画の「動く図（使い回し）」の 3 枚（mo-slope-split・mo-action-reaction・mo-pendulum）は、既存の kind をそのまま使う）
  // ================================================================

  // ---- 水圧（motion-mp1-c1）----
  // 静止図の 3 本のパイプ [左上の x, y, へこみ]（content/motion.js の motion-mp1-c1 と同じ。幅 60・高さ 24）
  const WP_PIPES = [[50, 68, 3], [130, 123, 7], [210, 178, 11]];
  // 水圧の矢印の長さ ＝ (6 + へこみ × 2)·k（深いほど長い。左右で同じ長さ。深いパイプの右の矢印が水そうの右はし x 300 に収まる長さ）
  const wpArrowLen = (d, k) => (6 + 2 * d) * k;
  // ゴム膜が平ら（t = 0）から深さに応じたへこみへ、ease(stage(t, 0, 0.75)) でへこむ。膜の外側に水圧の矢印（blue）が伸びる
  function moWaterPressure(t) {
    const k = ease(stage(t, 0, 0.75));
    const items = [
      { type: 'rect', x: 20, y: 46, width: 280, height: 184, fill: 'water', stroke: 'line' },
      text(24, 40, '水面', 13),
    ];
    WP_PIPES.forEach(([x, y, d]) => {
      const dent = d * k, len = wpArrowLen(d, k), my = y + 12;
      items.push(
        { type: 'rect', x, y, width: 60, height: 24, fill: 'white', stroke: 'line' },
        { type: 'line', points: [[x, y], [x + dent, my], [x, y + 24]], color: 'blue', width: 3 },
        { type: 'line', points: [[x + 60, y], [x + 60 - dent, my], [x + 60, y + 24]], color: 'blue', width: 3 },
      );
      if (len >= minArrow(2)) {
        items.push(
          { type: 'arrow', x1: x - 2 - len, y1: my, x2: x - 2, y2: my, color: 'blue', width: 2 },
          { type: 'arrow', x1: x + 62 + len, y1: my, x2: x + 62, y2: my, color: 'blue', width: 2 },
        );
      }
    });
    items.push(
      text(80, 112, '浅い: 小さくへこむ', 12, { anchor: 'middle' }),
      text(160, 167, 'まん中', 12, { anchor: 'middle' }),
      text(240, 222, '深い: 大きくへこむ', 12, { anchor: 'middle' }),
    );
    return items;
  }

  // ---- 浮力と深さ（motion-mp1-c2）----
  // 静止図の A（空気中 2.0 N）→ B（半分 1.7 N）→ C（全体 1.4 N）を順に強調し（目盛りの数字を blue）、
  // 0.6〜0.85 で C の物体だけが 30 下がってもどる（u(stage(t, 0.6, 0.85))）。読みは 1.4 N のまま。止まった絵は C を強調した 0.55
  const BD_DOWN = 30;
  const BD_REST = 0.55;
  function buoyancyDepthDy(t) { return BD_DOWN * u(stage(t, 0.6, 0.85)); }
  function moBuoyancyDepth(t) {
    const hi = t < 0.2 ? 'A' : t < 0.4 ? 'B' : 'C';
    const dy = buoyancyDepthDy(t);
    const reading = (x, s, name) => text(x, 26, s, 13, hi === name ? { color: 'blue', bold: true } : {});
    const items = [
      { type: 'rect', x: 10, y: 126, width: 300, height: 104, fill: 'water', stroke: 'line' },
      { type: 'rect', x: 48, y: 6, width: 24, height: 30, fill: 'white', stroke: hi === 'A' ? 'blue' : 'ink', rx: 4 },
      { type: 'line', points: [[60, 36], [60, 64]], width: 2 },
      { type: 'rect', x: 40, y: 64, width: 40, height: 44, fill: 'gray' },
      reading(78, '2.0 N', 'A'),
      text(60, 226, 'A', 14, { anchor: 'middle' }),
      { type: 'rect', x: 148, y: 6, width: 24, height: 30, fill: 'white', stroke: hi === 'B' ? 'blue' : 'ink', rx: 4 },
      { type: 'line', points: [[160, 36], [160, 104]], width: 2 },
      { type: 'rect', x: 140, y: 104, width: 40, height: 44, fill: 'gray' },
      reading(178, '1.7 N', 'B'),
      text(160, 226, 'B', 14, { anchor: 'middle' }),
      { type: 'rect', x: 248, y: 6, width: 24, height: 30, fill: 'white', stroke: hi === 'C' ? 'blue' : 'ink', rx: 4 },
      { type: 'line', points: [[260, 36], [260, 150 + dy]], width: 2 },
      { type: 'rect', x: 240, y: 150 + dy, width: 40, height: 44, fill: 'gray' },
      reading(278, '1.4 N', 'C'),
      text(260, 226, 'C', 14, { anchor: 'middle' }),
      text(14, 120, '水面', 12),
      text(14, 204, 'C の浮力 ＝ 2.0 − 1.4 ＝ 0.6 N', 13),
    ];
    if (t >= 0.6 && t < 0.95) {
      items.push(
        text(14, 164, '全体が水中なら', 12, { color: 'blue', bold: true }),
        text(14, 182, '深さで浮力は変わらない', 12, { color: 'blue', bold: true }),
      );
    }
    return items;
  }

  // ---- 角度のある 2 力の合力（motion-mp2-c1）----
  // 上の 2 段は静止図のまま。右上の空きに 3 N と 2 N の 2 力（1 N ＝ 16px）を足し、あいだの角を 90 − 90·cos(2πt)（0°〜180°）で
  // 変え、合力（緑）と「合力 X N」を毎回計算する（0° で 5 N、180° で 1 N）。t = 0.25 で 90°（止まった絵）。t = 1 と t = 0 がつながる
  const AR_O = [214, 104], AR_PX = 16;
  function angleResultantDeg(t) { return 90 - 90 * Math.cos(2 * Math.PI * t); }
  function angleResultant(t) {
    const th = angleResultantDeg(t) * Math.PI / 180;
    const ax = 3 * AR_PX, bx = 2 * AR_PX * Math.cos(th), by = -2 * AR_PX * Math.sin(th);
    return { a: [AR_O[0] + ax, AR_O[1]], b: [AR_O[0] + bx, AR_O[1] + by], r: [AR_O[0] + ax + bx, AR_O[1] + by],
      newton: Math.hypot(ax + bx, by) / AR_PX };
  }
  function moAngleResultant(t) {
    const g = angleResultant(t), [ox, oy] = AR_O;
    const items = [
      text(10, 26, '同じ向き → 和', 14),
      { type: 'arrow', x1: 40, y1: 56, x2: 88, y2: 56, color: 'blue', label: '2 N' },
      { type: 'arrow', x1: 88, y1: 56, x2: 160, y2: 56, color: 'blue', label: '3 N' },
      { type: 'arrow', x1: 40, y1: 92, x2: 160, y2: 92, color: 'green', label: '合力 5 N' },
      text(10, 132, '反対向き → 差', 14),
      { type: 'circle', x: 150, y: 160, r: 5, fill: 'blue', stroke: 'blue' },
      { type: 'arrow', x1: 150, y1: 160, x2: 222, y2: 160, color: 'blue', label: '3 N' },
      { type: 'arrow', x1: 150, y1: 160, x2: 126, y2: 160, color: 'blue' },
      text(120, 166, '1 N', 13, { anchor: 'end' }),
      { type: 'arrow', x1: 150, y1: 196, x2: 198, y2: 196, color: 'green' },
      text(206, 202, '合力 2 N', 13),
      text(10, 232, '角度があると: 差 ＜ 合力 ＜ 和', 13),
      // 平行四辺形の辺（点線）
      { type: 'line', points: [g.a, g.r], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [g.b, g.r], color: 'gray', width: 1, dashed: true },
      { type: 'arrow', x1: ox, y1: oy, x2: g.a[0], y2: g.a[1], color: 'blue', width: 2 },
      { type: 'arrow', x1: ox, y1: oy, x2: g.b[0], y2: g.b[1], color: 'blue', width: 2 },
    ];
    if (Math.hypot(g.r[0] - ox, g.r[1] - oy) >= minArrow(3)) items.push({ type: 'arrow', x1: ox, y1: oy, x2: g.r[0], y2: g.r[1], color: 'green' });
    items.push(
      { type: 'circle', x: ox, y: oy, r: 4, fill: 'blue', stroke: 'blue' },
      text(316, 30, '3 N と 2 N のあいだの角 ' + Math.round(angleResultantDeg(t)) + '°', 12, { anchor: 'end' }),
      text(316, 128, '合力 ' + g.newton.toFixed(1) + ' N', 12, { anchor: 'end', color: 'green', bold: true }),
    );
    return items;
  }

  // ---- 作図の手順（motion-mp2-c2 合力・motion-mp3-c1 分解）----
  // 点線 points を割合 k まで（矢じりなし）
  function dashedPart(points, k, width) {
    const ps = partial(points, k);
    return ps.length >= 2 ? [{ type: 'line', points: ps, color: 'gray', width: width || 2, dashed: true }] : [];
  }
  // 伸びる矢印（growLine）。矢じりより短いうちは描かない
  function growArrow(points, k, color) {
    const ps = partial(points, k);
    return ps.length >= 2 && pathLen(ps) >= minArrow(3) ? growLine(points, k, { color }) : [];
  }
  // 方眼（content/motion.js の motion-mp2-c2 と同じ: 40 ごと、x 20〜300・y 30〜230）
  function grid40() {
    const items = [];
    for (let x = 20; x <= 300; x += 40) items.push({ type: 'line', points: [[x, 30], [x, 230]], color: 'gray', width: 1, dashed: true });
    for (let y = 30; y <= 230; y += 40) items.push({ type: 'line', points: [[20, y], [300, y]], color: 'gray', width: 1, dashed: true });
    return items;
  }
  // 手順の番号: ① 0〜0.25、② 0.3〜0.55、③ 0.6〜0.8、④ 止まって見せる（0.8〜1）
  function stepNo(t) { return t < 0.28 ? 0 : t < 0.58 ? 1 : t < 0.8 ? 2 : 3; }

  // 合力の作図: ① 力 B を平行移動した点線が A の先から伸びる、② 力 A を平行移動した点線が B の先から伸びる、
  // ③ O から対角線の合力（緑）が伸びる、④ 止まって見せる。止まった絵（0.99）が静止図と同じ
  const COMPOSE_STEPS = ['① 力 B を、力 A の先へ平行移動', '② 力 A を、力 B の先へ平行移動', '③ O から対角線を引く ＝ 合力', '平行四辺形の対角線が合力'];
  function moComposeSteps(t) {
    const k1 = stage(t, 0, 0.25), k2 = stage(t, 0.3, 0.55), k3 = stage(t, 0.6, 0.8);
    const items = grid40().concat(
      dashedPart([[140, 190], [220, 110]], k1),
      dashedPart([[140, 110], [220, 110]], k2),
      [
        { type: 'arrow', x1: 60, y1: 190, x2: 140, y2: 190, color: 'blue' },
        { type: 'arrow', x1: 60, y1: 190, x2: 140, y2: 110, color: 'blue' },
      ],
      k3 >= 1 ? [{ type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 110, color: 'green' }] : growArrow([[60, 190], [220, 110]], k3, 'green'),
      [
        { type: 'circle', x: 60, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
        text(52, 210, 'O', 14, { anchor: 'end' }),
        text(100, 214, '力 A', 13, { anchor: 'middle' }),
        text(92, 138, '力 B', 13, { anchor: 'end' }),
      ],
    );
    if (k3 >= 1) items.push(text(228, 104, '合力', 13));
    items.push(text(316, 20, COMPOSE_STEPS[stepNo(t)], 12, { anchor: 'end', color: 'blue', bold: true, bg: true }));
    return items;
  }

  // 分解の作図: ① 力 C の先から B の向きに平行な点線が伸びて A の向きの線と交わる、② A の向きに平行な点線が B の向きの線と交わる、
  // ③ O から 2 つの分力（緑）が伸びる、④ 止まって見せる。止まった絵（0.99）が静止図と同じ
  const SPLIT_STEPS = ['① C の先から B に平行な線を引く', '② C の先から A に平行な線を引く', '③ 交わった所まで O から分力', '2 つの分力に分けられた'];
  function moSplitSteps(t) {
    const k1 = stage(t, 0, 0.25), k2 = stage(t, 0.3, 0.55), k3 = stage(t, 0.6, 0.8);
    const items = [
      { type: 'line', points: [[60, 190], [300, 190]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[60, 190], [60, 30]], color: 'gray', width: 2, dashed: true },
      ...dashedPart([[220, 90], [220, 190]], k1, 1),
      ...dashedPart([[220, 90], [60, 90]], k2, 1),
      { type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 90, color: 'blue' },
    ];
    if (k3 >= 1) {
      items.push(
        { type: 'arrow', x1: 60, y1: 190, x2: 220, y2: 190, color: 'green' },
        { type: 'arrow', x1: 60, y1: 190, x2: 60, y2: 90, color: 'green' },
      );
    } else {
      items.push(...growArrow([[60, 190], [220, 190]], k3, 'green'), ...growArrow([[60, 190], [60, 90]], k3, 'green'));
    }
    items.push(
      { type: 'circle', x: 60, y: 190, r: 5, fill: 'blue', stroke: 'blue' },
      text(52, 210, 'O', 14, { anchor: 'end' }),
      text(228, 86, '力 C', 13),
      text(306, 186, 'A', 14, { anchor: 'end' }),
      text(68, 34, 'B', 14),
    );
    if (k3 >= 1) items.push(text(140, 214, 'A の向きの分力', 12, { anchor: 'middle' }), text(70, 76, 'B の向きの分力', 12));
    items.push(text(316, 52, SPLIT_STEPS[stepNo(t)], 12, { anchor: 'end', color: 'blue', bold: true, bg: true }));
    return items;
  }

  // ---- 記録タイマー（motion-mp5-c2）----
  // 打点の時刻は 1 周の 0〜0.9 を 16 等分した 17 回（同じ時間ごと）。下のテープ（ゆっくり）は 0〜0.9 のあいだ動き続けて 17 打点、
  // 上のテープ（速く）は後半（0.45〜0.9）だけ動いて 9 打点。どちらも記録タイマー（上 x 270・下 x 254）の位置で点が付き、
  // テープといっしょに左へ流れる。0.9 で止まり、打点が静止図の位置（上 9 個・下 17 個）にそろう
  const TAPE_END = 0.9, TAPE_DT = TAPE_END / 16;
  const TAPES = [
    { y: 80, timer: 270, gap: 30, first: 8 },   // 上: 速く引いた（間隔 30）
    { y: 160, timer: 254, gap: 14, first: 0 },  // 下: ゆっくり引いた（間隔 14）
  ];
  // テープが動いた長さ（打点 1 回分の時間に gap だけ進む）
  function tapeRun(tape, t) {
    const from = tape.first * TAPE_DT;
    return tape.gap * Math.max(0, Math.min(t, TAPE_END) - from) / TAPE_DT;
  }
  // テープの上の打点（打った時刻 sj を過ぎたものだけ）。止まったあとは静止図と同じ整数の位置
  function tapeDots(tape, t) {
    const dots = [];
    for (let j = tape.first; j <= 16; j++) {
      const sj = j * TAPE_DT;
      if (t + 1e-9 < sj) break;
      const x = t >= TAPE_END ? tape.timer - tape.gap * (16 - j) : tape.timer - (tapeRun(tape, t) - tapeRun(tape, sj));
      dots.push({ type: 'circle', x, y: tape.y, r: 3, fill: 'ink', stroke: 'ink' });
    }
    return dots;
  }
  function moTimerTape(t) {
    const items = [
      text(10, 30, '同じ時間ごとの打点', 13),
      text(316, 52, '記録タイマー', 12, { anchor: 'end' }),
    ];
    TAPES.forEach(tape => {
      // 点を打った直後（打点の時刻から 1/4 回分のあいだ）はタイマーの印をだいだいにする
      const strike = t < TAPE_END + TAPE_DT / 4 && t + 1e-9 >= tape.first * TAPE_DT && frac((t + 1e-9) / TAPE_DT) < 0.25;
      items.push(
        { type: 'rect', x: 20, y: tape.y - 12, width: 280, height: 24, fill: 'white', stroke: 'line' },
        ...tapeDots(tape, t),
        { type: 'rect', x: tape.timer - 6, y: tape.y - 22, width: 12, height: 10, fill: strike ? 'orange' : 'gray', stroke: 'ink' },
      );
    });
    items.push(
      text(300, 110, '速く引いた（間隔が広い）', 12, { anchor: 'end' }),
      text(300, 190, 'ゆっくり引いた（間隔がせまい）', 12, { anchor: 'end' }),
    );
    if (t < TAPE_END) items.push(text(10, 228, '← テープを引く向き', 12, { color: 'blue' }));
    return items;
  }

  // ---- 摩擦力でだんだんおそくなる（motion-mp6-c1）----
  // 木片が x 50 から右へすべり、速さ v = v0(1 − τ) で一定の割合で減って x 210 で止まる（移動 ＝ 160·(2τ − τ²)、τ = stage(t, 0, 0.8)）。
  // 摩擦力の矢印（左向き）は動いているあいだ木片についていき、止まったら消して「止まった」を出す。
  // 止まった絵は木片が静止図の位置（x 130）にある t（2τ − τ² = 0.5 → τ = 1 − 1/√2）
  const FS_FROM = 50, FS_RUN = 160, FS_TO = 0.8;
  function frictionSlowX(t) { const k = stage(t, 0, FS_TO); return FS_FROM + FS_RUN * (2 * k - k * k); }
  const FS_REST = FS_TO * (1 - Math.SQRT1_2);
  function moFrictionSlow(t) {
    const x = frictionSlowX(t), moving = t < FS_TO;
    const items = [
      { type: 'line', points: [[10, 170], [310, 170]], color: 'line', width: 3 },
      { type: 'rect', x, y: 128, width: 60, height: 42, fill: 'brown', label: '木片' },
      { type: 'arrow', x1: 140, y1: 100, x2: 220, y2: 100, color: 'gray' },
      text(140, 88, '運動の向き', 13),
    ];
    if (moving) items.push({ type: 'arrow', x1: x + 10, y1: 166, x2: x - 50, y2: 166, color: 'blue' });
    items.push(
      text(30, 200, '摩擦力（運動と反対向き）', 13),
      text(10, 30, '手をはなしたあと → だんだんおそくなる', 13),
    );
    if (!moving) items.push(text(x + 30, 120, '止まった', 13, { anchor: 'middle', color: 'blue', bold: true }));
    return items;
  }

  // ---- 等速直線運動のグラフ（motion-mp6-c2）----
  // 2 つのグラフの線は静止図のまま、時間のカーソル（縦の点線）が左から右へ動き（k = stage(t, 0, 0.9)）、
  // 左（速さ一定）と右（距離は時間に比例）の線の上の点がいっしょに進む。右は点から横軸・縦軸へ点線。0.99 で点が線の右はし
  function uniformPoints(t) {
    const k = stage(t, 0, 0.9);
    return { left: [40 + 88 * k, 110], right: [190 + 88 * k, 170 - 108 * k] };
  }
  function moUniformGraph(t) {
    const { left, right } = uniformPoints(t);
    const items = [
      { type: 'line', points: [[40, 170], [128, 170]], width: 2, arrow: true },
      { type: 'line', points: [[40, 170], [40, 48]], width: 2, arrow: true },
      { type: 'line', points: [[190, 170], [278, 170]], width: 2, arrow: true },
      { type: 'line', points: [[190, 170], [190, 48]], width: 2, arrow: true },
      { type: 'line', points: [[40, 110], [128, 110]], color: 'blue', width: 3 },
      { type: 'line', points: [[190, 170], [278, 62]], color: 'blue', width: 3 },
    ];
    if (left[0] > 40.5) {
      items.push(
        { type: 'line', points: [[left[0], 170], [left[0], 56]], color: 'gray', width: 1, dashed: true },
        { type: 'line', points: [[right[0], 170], right, [190, right[1]]], color: 'gray', width: 1, dashed: true },
      );
    }
    items.push(
      { type: 'circle', x: left[0], y: left[1], r: 4, fill: 'orange', stroke: 'ink' },
      { type: 'circle', x: right[0], y: right[1], r: 4, fill: 'orange', stroke: 'ink' },
      text(40, 40, '速さ', 12),
      text(190, 40, '移動距離', 12),
      text(132, 190, '時間', 12, { anchor: 'end' }),
      text(282, 190, '時間', 12, { anchor: 'end' }),
      text(84, 220, '速さは一定', 13, { anchor: 'middle' }),
      text(234, 220, '距離は時間に比例', 13, { anchor: 'middle' }),
    );
    return items;
  }

  // ---- 電車が急に動き出す（motion-mp6-c3）----
  // mo-inertia（急ブレーキ）の逆。止まっていた電車が 0.2〜0.45 で一定の割合で速くなり（枕木が左へ流れ始める）、そのあとは一定の速さ。
  // 乗客のからだは後ろへかたむき（0.2〜0.45）、0.6〜0.8 でまっすぐにもどる。1 周で枕木が流れる長さは RUN_LEN（枕木の間隔の 10 倍）。
  // 止まった絵はいちばん後ろへかたむいた 0.5（静止図と同じ形）
  const IS_FROM = 0.2, IS_TO = 0.45;
  const IS_ACC = RUN_LEN / (0.5 * (IS_TO - IS_FROM) ** 2 + (IS_TO - IS_FROM) * (1 - IS_TO));   // 速くなる割合（1 周で RUN_LEN 進む）
  function startRun(t) {
    if (t <= IS_FROM) return 0;
    const a = Math.min(t, IS_TO) - IS_FROM;
    return IS_ACC * (0.5 * a * a + (IS_TO - IS_FROM) * Math.max(0, t - IS_TO));
  }
  function startLean(t) { return t < 0.6 ? ease(stage(t, IS_FROM, IS_TO)) : 1 - ease(stage(t, 0.6, 0.8)); }
  function moInertiaStart(t) {
    const run = startRun(t), lean = startLean(t);
    const sleepers = [];
    for (let j = 0; j < RUN_LEN / SLEEPER_GAP; j++) {
      const x = wrap(20 + SLEEPER_GAP * j - run, 20, 300);
      sleepers.push({ type: 'line', points: [[x, 198], [x, 208]], color: 'gray', width: 3 });
    }
    const leaning = t >= IS_FROM && t < 0.6;
    return [
      mnote(20, 30, '電車が急に動き出すと、からだは後ろへ', 14),
      { type: 'arrow', x1: 120, y1: 60, x2: 200, y2: 60, color: 'gray', label: '動き出す向き' },
      { type: 'rect', x: 40, y: 80, width: 240, height: 100, fill: 'white', stroke: 'ink', rx: 8 },
      ...sleepers,
      { type: 'line', points: [[20, 200], [300, 200]], color: 'line', width: 3 },
      { type: 'circle', x: 80, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
      { type: 'circle', x: 240, y: 190, r: 10, fill: 'ink', stroke: 'ink' },
      // からだ: まっすぐ（体 (164,178)–(164,122)、頭 (164,108)）→ 後ろへかたむく（静止図の (168,178)–(152,122)、頭 (148,108)）
      { type: 'line', points: [[lerp(164, 168, lean), 178], [lerp(164, 152, lean), 122]], color: 'ink', width: 4 },
      { type: 'circle', x: lerp(164, 148, lean), y: 108, r: 12, fill: 'pink' },
      ...(leaning ? [{ type: 'arrow', x1: 132, y1: 120, x2: 86, y2: 120, color: 'blue' }, mnote(88, 148, '後ろへ', 14)] : []),
      ...(t >= IS_FROM && t < IS_TO ? [mnote(200, 104, '動き出す！', 14)] : []),
    ];
  }

  // ---- 定滑車と動滑車（motion-mp8-c1）----
  // mo-pulley と同じ形: 静止図の位置から手をゆるめて 2 つのおもりを PC_D 下げ（0.08〜0.3）、手でひもを引いて静止図の位置へ
  // 引き上げる（0.36〜0.66）。定滑車は手が引いた長さ ＝ おもりが上がった高さ、動滑車は手が引いた長さ ＝ 上がった高さ × 2。
  // 引き上げているあいだと、そのあと 0.96 まで「引いた長さ」「上がった高さ」の矢印を見せる。t = 0 が静止図と同じ。
  // （計画の「d = 20·u(t) で引き上げる」だと動滑車の手が天井に当たるため、mo-pulley と同じく下げてから引き上げる形にした）
  const PC_D = 10;   // 動滑車のおもりが下の文字「動滑車」にかからない量
  function pulleyCompareLow(t) {
    if (t < PULL_FROM) return PC_D * ease(stage(t, 0.08, 0.3));
    return PC_D * (1 - ease(stage(t, PULL_FROM, PULL_TO)));
  }
  function moPulleyCompare(t) {
    const d = pulleyCompareLow(t);
    const items = [
      { type: 'rect', x: 20, y: 10, width: 280, height: 8, fill: 'gray', stroke: 'line' },
      // 定滑車: おもりが d 下がると、手は d 上がる
      { type: 'line', points: [[80, 18], [80, 50]], width: 2 },
      { type: 'circle', x: 80, y: 50, r: 18, fill: 'white', stroke: 'ink' },
      { type: 'line', points: [[62, 150 + d], [62, 50], [66, 38], [80, 32], [94, 38], [98, 50], [98, 118 - d]], color: 'brown', width: 2 },
      { type: 'rect', x: 42, y: 150 + d, width: 40, height: 30, fill: 'gray' },
      { type: 'ellipse', x: 98, y: 128 - d, rx: 9, ry: 11, fill: 'pink' },
      // 動滑車: おもりが d 下がると、手は 2d 下がる
      { type: 'line', points: [[212, 18], [212, 130 + d], [215, 140 + d], [230, 148 + d], [245, 140 + d], [248, 130 + d], [248, 64 + 2 * d]], color: 'brown', width: 2 },
      { type: 'circle', x: 230, y: 130 + d, r: 18, fill: 'white', stroke: 'ink' },
      { type: 'line', points: [[230, 130 + d], [230, 166 + d]], width: 2 },
      { type: 'rect', x: 210, y: 166 + d, width: 40, height: 30, fill: 'gray' },
      { type: 'ellipse', x: 248, y: 54 + 2 * d, rx: 9, ry: 11, fill: 'pink' },
      text(80, 206, '定滑車', 14, { anchor: 'middle' }),
      text(80, 226, '力も距離も同じ', 12, { anchor: 'middle' }),
      text(230, 220, '動滑車', 14, { anchor: 'middle' }),
      text(316, 178, '力は半分', 12, { anchor: 'end' }),
      text(316, 198, '距離は 2 倍', 12, { anchor: 'end' }),
    ];
    if (t >= PULL_FROM && t < SHOW_TO) {
      const raised = PC_D - d;
      // 引き始めの位置（点線）から、いまの位置までの矢印（矢じりより長くなってから描く）
      const arrowLine = (x, y1, y2) => (Math.abs(y2 - y1) >= minArrow(2) ? [{ type: 'line', points: [[x, y1], [x, y2]], color: 'blue', width: 2, arrow: true }] : []);
      items.push(
        { type: 'line', points: [[90, 128 - PC_D], [118, 128 - PC_D]], color: 'gray', width: 1, dashed: true },
        { type: 'line', points: [[26, 180 + PC_D], [82, 180 + PC_D]], color: 'gray', width: 1, dashed: true },
        { type: 'line', points: [[240, 54 + 2 * PC_D], [276, 54 + 2 * PC_D]], color: 'gray', width: 1, dashed: true },
        { type: 'line', points: [[196, 196 + PC_D], [250, 196 + PC_D]], color: 'gray', width: 1, dashed: true },
        ...arrowLine(114, 128 - PC_D, 128 - PC_D + raised),
        ...arrowLine(30, 180 + PC_D, 180 + PC_D - raised),
        ...arrowLine(270, 54 + 2 * PC_D, 54 + 2 * PC_D - 2 * raised),
        ...arrowLine(202, 196 + PC_D, 196 + PC_D - raised),
        text(108, 102, '引いた長さ', 12, { color: 'blue', bg: true }),
        text(6, 140, '上がった高さ', 12, { color: 'blue', bg: true }),
        text(316, 40, '引いた長さ', 12, { anchor: 'end', color: 'blue', bg: true }),
        text(196, 206, '上がった高さ', 12, { anchor: 'end', color: 'blue', bg: true }),
      );
    }
    return items;
  }

  // ---- てこ（motion-mp9-c1）----
  // 棒が支点 (90,150) を中心に回り（角 ＝ 8·u(t) 度。手の側が下がる）、手の側（支点から 200 ＝ 4 m）が下がる距離は、
  // 物体の側（支点から 50 ＝ 1 m）が上がる距離の 4 倍になる。両はしの動いた距離を青い線で見せる。t = 0 が静止図（棒が水平）
  const LEVER_PIVOT = [90, 150], LEVER_MAX = 8;   // 8° までなら棒の右はしが床（y 190）に当たらず、「4 m」にもほとんどかからない
  function leverAngle(t) { return LEVER_MAX * u(t); }
  // 支点から棒にそって dx（右が正）の点が、角 a 度でどこへ動くか（画面で時計回り ＝ 右側が下がる）
  function leverPoint(dx, a) {
    const r = a * Math.PI / 180;
    return [LEVER_PIVOT[0] + dx * Math.cos(r), LEVER_PIVOT[1] + dx * Math.sin(r)];
  }
  function moLever(t) {
    const a = leverAngle(t);
    const left = leverPoint(-60, a), right = leverPoint(210, a);
    const box = leverPoint(-50, a), hand = leverPoint(200, a);
    const bx = box[0] - 40, by = box[1] - 150, hx = hand[0] - 290, hy = hand[1] - 150;
    const items = [
      { type: 'line', points: [[20, 190], [300, 190]], color: 'line', width: 3 },
      { type: 'polygon', points: [[76, 190], [104, 190], [90, 154]], fill: 'gray', stroke: 'ink' },
      { type: 'line', points: [left, right], color: 'brown', width: 6 },
      { type: 'rect', x: 22 + bx, y: 116 + by, width: 36, height: 30, fill: 'sand' },
      { type: 'arrow', x1: 290 + hx, y1: 110 + hy, x2: 290 + hx, y2: 146 + hy, color: 'blue' },
    ];
    const rise = -by, drop = hy;
    if (rise > 0.5) {
      // 物体が上がった距離（左はし）と、手が押し下げた距離（右はし）
      items.push(
        { type: 'line', points: [[8, 116], [18, 116]], color: 'blue', width: 2 },
        { type: 'line', points: [[8, 116 - rise], [18, 116 - rise]], color: 'blue', width: 2 },
        { type: 'line', points: [[13, 116], [13, 116 - rise]], color: 'blue', width: 2 },
        { type: 'line', points: [[304, 150], [316, 150]], color: 'blue', width: 2 },
        { type: 'line', points: [[304, 150 + drop], [316, 150 + drop]], color: 'blue', width: 2 },
        { type: 'line', points: [[310, 150], [310, 150 + drop]], color: 'blue', width: 2 },
      );
    }
    items.push(
      text(90, 214, '支点', 13, { anchor: 'middle' }),
      text(62, 174, '1 m', 13, { anchor: 'middle' }),
      text(190, 174, '4 m', 13, { anchor: 'middle' }),
      text(10, 30, '支点から遠いほど小さい力', 13),
      text(10, 52, '力 4 分の 1 → 押す距離 4 倍', 13),
      text(276, 104, '押す', 13, { anchor: 'end' }),
      text(316, 234, '押し下げた距離 ＝ 上がった距離 × 4', 12, { anchor: 'end', color: 'blue' }),
    );
    return items;
  }

  // ---- 位置エネルギーと仕事（motion-mp10-c1）----
  // 高い所の球がレールを下り（0〜0.45、だんだん速く）、木片に当たって、木片が「動いた距離」（50）だけすべって止まる（0.45〜0.75）。
  // そのあと止めて見せる。静止図は球が高い所・木片が当たる前の位置なので t = 0 が静止図
  const BALL_PATH = [[30, 62], [64, 102], [104, 152], [140, 178], [188, 178]];   // 球の中心の道すじ（レールの上、半径 12）
  const BB_HIT = 0.45, BB_STOP = 0.75, BB_SLIDE = 50;
  function ballBlock(t) {
    const k = stage(t, 0, BB_HIT);
    const ball = along(BALL_PATH, k * k);
    const s = stage(t, BB_HIT, BB_STOP);
    return { ball: [ball.x, ball.y], blockX: 200 + BB_SLIDE * (2 * s - s * s) };
  }
  function moBallBlock(t) {
    const { ball, blockX } = ballBlock(t);
    const items = [
      { type: 'line', points: [[20, 60], [60, 110], [100, 160], [140, 190], [300, 190]], color: 'gray', width: 4 },
      { type: 'circle', x: ball[0], y: ball[1], r: 12, fill: 'gray', stroke: 'ink' },
      { type: 'line', points: [[30, 76], [30, 188]], color: 'gray', width: 2, dashed: true },
      text(38, 140, '高さ', 13),
      { type: 'rect', x: blockX, y: 166, width: 44, height: 24, fill: 'brown', label: '木片' },
      { type: 'arrow', x1: 250, y1: 150, x2: 300, y2: 150, color: 'blue' },
      text(250, 136, '動いた距離', 12),
      text(92, 30, '高い・重い → 木片を遠くまで動かす', 13),
      text(160, 226, '木片を動かす ＝ 木片に仕事をする', 13, { anchor: 'middle' }),
    ];
    if (t >= BB_HIT && t < 0.97) items.push(text(160, 206, '球が木片に仕事をした', 12, { anchor: 'middle', color: 'blue', bold: true }));
    return items;
  }

  const DEFS = [
    ['so-air-wave', soAirWave, { restT: 0 }],
    ['so-light-vs-sound', soLightVsSound, { restT: 0.99 }],
    ['so-amplitude', soAmplitude, { restT: 0 }],
    ['so-frequency', soFrequency, { restT: 0 }],
    ['fo-spring-stretch', foSpringStretch, { restT: 0.99 }],
    ['el-series-parallel', elSeriesParallel, { restT: 0 }],
    ['el-induction', elInduction, { restT: 0 }],
    ['mo-resultant', moResultant, { restT: RES_REST }],
    ['mo-slope-accel', moSlopeAccel, { restT: 0.99 }],
    ['mo-inertia', moInertia, { restT: 0.65 }],
    ['mo-pendulum', moPendulum, { restT: 0 }],
    // 優先度 B
    ['so-string-phone', soStringPhone, { restT: 0 }],
    ['fo-friction', foFriction, { restT: 0 }],
    ['fo-hooke-graph', foHookeGraph, { restT: 0.99 }],
    ['fo-balance', foBalance, { restT: 0 }],
    ['el-heat-rise', elHeatRise, { restT: 0.99 }],
    ['el-static-charge', elStaticCharge, { restT: 0.99 }],
    ['mo-slope-split', moSlopeSplit, { restT: SPLIT_REST }],
    ['mo-buoyancy', moBuoyancy, { restT: 0.99 }],
    ['mo-action-reaction', moActionReaction, { restT: 0 }],
    ['mo-pulley', moPulley, { restT: 0 }],
    // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md
    ['li-lens-cover', liLensCover, { restT: 0.99 }],
    ['so-fork-stop', soForkStop, { restT: 0 }],
    ['so-resonance', soResonance, { restT: 0 }],
    ['so-amp-freq', soAmpFreq, { restT: 0 }],
    ['fo-three-effects', foThreeEffects, { restT: 0.99 }],
    ['fo-normal-friction', foNormalFriction, { restT: 0.99 }],
    // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md
    ['el-cathode-bend', elCathodeBend, { restT: 0 }],
    ['el-compass-around', elCompassAround, { restT: 0 }],
    ['el-wire-field', elWireField, { restT: 0 }],
    ['el-coil-field', elCoilField, { restT: 0 }],
    ['el-wire-force', elWireForce, { restT: 0 }],
    ['el-motor-rotate', elMotorRotate, { restT: 0 }],
    ['el-dc-ac', elDcAc, { restT: 0.99 }],
    // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md
    ['mo-water-pressure', moWaterPressure, { restT: 0.99 }],
    ['mo-buoyancy-depth', moBuoyancyDepth, { restT: BD_REST }],
    ['mo-angle-resultant', moAngleResultant, { restT: 0.25 }],
    ['mo-compose-steps', moComposeSteps, { restT: 0.99 }],
    ['mo-split-steps', moSplitSteps, { restT: 0.99 }],
    ['mo-timer-tape', moTimerTape, { restT: 0.99 }],
    ['mo-friction-slow', moFrictionSlow, { restT: FS_REST }],
    ['mo-uniform-graph', moUniformGraph, { restT: 0.99 }],
    ['mo-inertia-start', moInertiaStart, { restT: 0.5 }],
    ['mo-pulley-compare', moPulleyCompare, { restT: 0 }],
    ['mo-lever', moLever, { restT: 0 }],
    ['mo-ball-block', moBallBlock, { restT: 0 }],
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  // このファイルで足した kind（テスト用）と、テストで使う値
  const api = { KINDS: DEFS.map(d => d[0]), phoneString, frictionBoxX, hookePoint, balanceShift, slopeForces, buoyancy, pulleyLow, PULLEY_D, PRESSURE_PX,
    // ミニプリント（3nen）
    buoyancyDepthDy, angleResultant, tapeDots, TAPES, frictionSlowX, uniformPoints, startLean, pulleyCompareLow, PC_D, leverPoint, ballBlock };
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
