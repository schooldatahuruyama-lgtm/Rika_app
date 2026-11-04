// 解説カードの動く図（物理: 音・力・電流・運動）。js/anim.js の register で足す。
// 各 kind の動き・数値は docs/anim-plan.md の 5 章。静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、
// 動く部品だけを式で動かす。静止図を作る関数（fork・vibratingString・wave・fireworks・spring・bob・swingPath など）は
// content の中にあって anim から呼べないので、同じ式をここに写す（出どころは各関数のコメント）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, clamp01, ease, osc, wrap, pathLen, along, onCircle } = anim.helpers;

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
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  const api = { KINDS: DEFS.map(d => d[0]) };   // このファイルで足した kind（テスト用）
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
