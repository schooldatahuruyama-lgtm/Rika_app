// 解説カードの動く図（化学: 身のまわりの物質・状態変化・水溶液・化学変化と原子・分子・化学変化とイオン）。
// js/anim.js の register で足す（書き方は docs/anim-guide.md、各 kind の動きは docs/anim-plan.md 6 章）。
// 静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、動く部品だけを式で動かす。
// 静止図を作る関数は content の中にあって呼べないので、同じ式をこのファイルに写す（出どころはコメントに書く）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, clamp, ease, osc, tri, along, partial, pathLen, onCircle, mix, TOKEN_HEX } = anim.helpers;

  function frac(x) { return x - Math.floor(x); }

  // ================================================================
  // 身のまわりの物質（substance）
  // ================================================================

  // 逆さに立てた試験管（底の中央 (200, 70)、tilt 180、口は y 160）の中の水。top は水面の y（74〜160）。
  // 試験管の丸い底（中心 (200, 82)、内側の半径 11）より上は、底の丸みに沿って描く
  function tubeWater(top) {
    const pts = [[189, 160]];
    if (top >= 82) {
      pts.push([189, top], [211, top]);
    } else {
      pts.push([189, 82]);
      for (let a = 170; a >= 10; a -= 10) {
        const [x, y] = onCircle(200, 82, 11, a);
        pts.push([x, Math.max(y, top)]);   // 水面より上は水面の高さにそろえる（ここは気体）
      }
      pts.push([211, 82]);
    }
    pts.push([211, 160]);
    return { type: 'polygon', points: pts, fill: 'water', stroke: 'none' };
  }

  // 水上置換法: ガラス管の先から泡が上がり、試験管に気体がたまって水がおし出される（sub-3-c1）
  // 静止図は content/substance.js の sub-3-c1
  const WD_BUBBLES = [   // [x, 半径, 位相]。t = 0 で静止図の泡 (200,140)・(202,112) と、その上の 1 つ
    [200, 4, 32 / 101], [202, 5, 60 / 101], [199, 4, 88 / 101],
  ];
  function suWaterDisplacement(t) {
    const p = stage(t, 0, 0.85);
    const g = 79 * p;            // たまった気体の高さ
    const top = 71 + g;          // 試験管の中の水面（t = 0 は丸い底の内側のいちばん上 y 71 で、満水）
    const items = [
      { type: 'text', x: 20, y: 34, text: '水上置換法', size: 16, bold: true },
      { type: 'rect', x: 60, y: 100, width: 220, height: 120, fill: 'none' },
      { type: 'rect', x: 62, y: 125, width: 216, height: 93, fill: 'water', stroke: 'none' },
      tubeWater(top),
      // 水は上の polygon で描くので、試験管は level 0（逆さの試験管に level を使うと上から満ちてしまう）
      { type: 'tube', x: 200, y: 70, height: 90, tilt: 180, level: 0 },
      { type: 'line', points: [[20, 90], [100, 90], [100, 205], [200, 205], [200, 172]], width: 3 },
    ];
    if (p < 1) {   // 気体がたまり終わったら泡は止める
      WD_BUBBLES.forEach(([x, r, ph]) => {
        items.push({ type: 'circle', x, y: 172 - (172 - top) * frac(3 * t + ph), r, fill: 'white', stroke: 'line' });
      });
    }
    items.push(
      { type: 'text', x: 20, y: 80, text: '気体', size: 13 },
      { type: 'text', x: 220, y: 64, text: '試験管', size: 13 },
      { type: 'text', x: 280, y: 236, text: '水そう', size: 13, anchor: 'end' },
    );
    if (p > 0.5) {
      items.push(
        // 試験管の左の空いた所（ガラス管と試験管のあいだ、水そうのふちより上）
        { type: 'text', x: 110, y: 62, text: '気体が水を', size: 13, color: 'blue' },
        { type: 'text', x: 110, y: 78, text: 'おし出す', size: 13, color: 'blue' },
      );
    }
    return items;
  }

  // ================================================================
  // 状態変化（state-change）
  // ================================================================

  // 粒子のモデルの点（80×80 の枠の左上からのずれ）。content/state-change.js の SOLID_DOTS・LIQUID_DOTS・GAS_DOTS と同じ
  const SOLID_DOTS = [13, 31, 49, 67].flatMap(y => [13, 31, 49, 67].map(x => [x, y]));
  const LIQUID_DOTS = [[12, 40], [28, 34], [46, 38], [64, 42], [18, 56], [36, 52], [54, 58], [71, 57],
    [12, 70], [30, 70], [48, 72], [66, 72]];
  const GAS_DOTS = [[18, 18], [58, 16], [38, 44], [64, 58], [16, 66]];
  // 液体の粒の動き: [x の振れ幅, x の位相, y の振れ幅, y の位相]（x は 1 周に 2 回、y は 3 回）。
  // となりの粒との間隔は 15〜19px（半径 7 の粒が接すると 14px）なので、となり合う粒が同じ向きに動くように係数を選んだ。
  // どの時刻でも粒の中心の距離が 14px 以上（重ならない）・枠の内側に収まることを tests/anim-chem.test.js で確かめる
  const LIQUID_MOVE = [
    [3.18, 0.06, 3.32, 0.39], [3.56, 0.11, 6, 0.28], [4.81, 0.63, 6, 0.34], [5.28, 0.6, 4.27, 0.2],
    [2.67, 0.14, 1.74, 0.29], [3, 0.17, 1.18, 0.68], [2.76, 0.48, 5.65, 0.32], [0.84, 0.49, 3.03, 0.17],
    [2.51, 0.14, 1.78, 0.53], [4.18, 0.16, 1.81, 0.38], [5.01, 0.22, 1.84, 0.21], [3.66, 0.05, 0.49, 0.21],
  ];
  // 気体の粒の往復の回数（1 周に何回往復するか。整数なので 1 周でつながる）と、t = 0 に進む向き（+1 で右・下へ）
  const GAS_FX = [2, 3, 1, 2, 3], GAS_FY = [3, 1, 2, 1, 2];
  const GAS_SX = [1, -1, 1, -1, 1], GAS_SY = [-1, 1, 1, -1, -1];

  // tri(s) = v（0〜1）となる s。dir が +1 なら tri が増えていく側（0〜0.5）、−1 なら減っていく側（0.5〜1）
  function triPhase(v, dir) { return dir > 0 ? v / 2 : 1 - v / 2; }

  // 固体・液体・気体の粒子のモデル（state-1-c4）。固体はその場でゆれ、液体は位置を変えて動き、気体は飛び回る
  // 静止図は content/state-change.js の particleBox(20, 40, 'solid')・(120, 40, 'liquid')・(220, 40, 'gas')
  function stParticles(t) {
    const items = [];
    const dot = (x, y) => ({ type: 'circle', x, y, r: 7, fill: 'sky', stroke: 'blue' });
    // 固体: 格子の位置でゆれる（t = 0 でずれ 0）
    items.push({ type: 'rect', x: 20, y: 40, width: 80, height: 80, fill: 'white' });
    SOLID_DOTS.forEach(([dx, dy], n) => {
      const i = n % 4, j = Math.floor(n / 4);
      const ph = (3 * i + 5 * j) / 16;
      const ox = 1.5 * (osc(t, 8, ph) - osc(0, 8, ph));
      const oy = 1.5 * (osc(t, 8, ph + 0.25) - osc(0, 8, ph + 0.25));
      items.push(dot(20 + dx + ox, 40 + dy + oy));
    });
    // 液体: 粒どうしが重ならずに、位置を変えて動く（t = 0 でずれ 0）
    items.push({ type: 'rect', x: 120, y: 40, width: 80, height: 80, fill: 'white' });
    LIQUID_DOTS.forEach(([dx, dy], k) => {
      const [ax, a, ay, b] = LIQUID_MOVE[k];
      const x = 120 + dx + ax * (osc(t, 2, a) - osc(0, 2, a));
      const y = 40 + dy + ay * (osc(t, 3, b) - osc(0, 3, b));
      items.push(dot(x, y));
    });
    // 気体: 枠の内側（x 227〜293・y 47〜113）を飛び回り、壁ではね返る。進む向きに短い矢印
    items.push({ type: 'rect', x: 220, y: 40, width: 80, height: 80, fill: 'white' });
    const arrows = [];
    GAS_DOTS.forEach(([dx, dy], k) => {
      const px = triPhase((220 + dx - 227) / 66, GAS_SX[k]);
      const py = triPhase((40 + dy - 47) / 66, GAS_SY[k]);
      const sx = GAS_FX[k] * t + px, sy = GAS_FY[k] * t + py;
      const x = 227 + 66 * tri(sx), y = 47 + 66 * tri(sy);
      items.push(dot(x, y));
      // 速さの向き（tri が増えている側なら +）
      const vx = (frac(sx) < 0.5 ? 1 : -1) * GAS_FX[k], vy = (frac(sy) < 0.5 ? 1 : -1) * GAS_FY[k];
      const len = Math.hypot(vx, vy);
      const ux = vx / len, uy = vy / len;
      // 矢印の先（矢じりをふくめて）が枠の内側 x 223〜297・y 43〜117 に収まる長さまで。短すぎる（壁のすぐ近く）ときは描かない
      let tip = 17;
      if (ux > 0) tip = Math.min(tip, (297 - x) / ux); else if (ux < 0) tip = Math.min(tip, (x - 223) / -ux);
      if (uy > 0) tip = Math.min(tip, (117 - y) / uy); else if (uy < 0) tip = Math.min(tip, (y - 43) / -uy);
      if (tip >= 13) arrows.push({ type: 'line', points: [[x + 9 * ux, y + 9 * uy], [x + tip * ux, y + tip * uy]], color: 'gray', width: 2, arrow: true });
    });
    items.push(...arrows);
    items.push(
      { type: 'text', x: 60, y: 144, text: '固体', size: 16, anchor: 'middle', bold: true },
      { type: 'text', x: 160, y: 144, text: '液体', size: 16, anchor: 'middle', bold: true },
      { type: 'text', x: 260, y: 144, text: '気体', size: 16, anchor: 'middle', bold: true },
      { type: 'text', x: 60, y: 166, text: '規則正しく並び', size: 12, anchor: 'middle' },
      { type: 'text', x: 60, y: 184, text: 'その場でゆれる', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 166, text: '並び方がくずれ', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 184, text: '位置を変えて動く', size: 12, anchor: 'middle' },
      { type: 'text', x: 260, y: 166, text: '間隔が広く', size: 12, anchor: 'middle' },
      { type: 'text', x: 260, y: 184, text: '自由に飛び回る', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 222, text: '加熱すると、粒子の運動が激しくなる', size: 13, anchor: 'middle' },
    );
    return items;
  }

  // 氷を加熱したときの温度変化のグラフ。content/state-change.js の heatGraphItems と同じ
  function heatGraphItems() {
    return [
      { type: 'line', points: [[50, 200], [50, 24]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [304, 200]], width: 2, arrow: true },
      { type: 'line', points: [[50, 160], [80, 160]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[50, 50], [200, 50]], color: 'gray', width: 2, dashed: true },
      { type: 'line', points: [[50, 182], [80, 160], [130, 160], [200, 50], [290, 50]], color: 'blue', width: 3 },
      { type: 'text', x: 44, y: 165, text: '0', size: 13, anchor: 'end' },
      { type: 'text', x: 44, y: 55, text: '100', size: 13, anchor: 'end' },
      { type: 'text', x: 58, y: 18, text: '温度〔℃〕', size: 13 },
      { type: 'text', x: 304, y: 224, text: '加熱した時間', size: 13, anchor: 'end' },
    ];
  }
  const HEAT_CURVE = [[50, 182], [80, 160], [130, 160], [200, 50], [290, 50]];
  const HEAT_STATES = ['固体', '固体と液体', '液体', '液体と気体'];

  // 加熱した時間とともにグラフの線が伸び、右下の小さなビーカーで今の状態を示す（state-2-c2）
  // 静止図は content/state-change.js の state-2-c2
  function stHeatingCurve(t) {
    const k = stage(t, 0, 0.85);
    // 線の先がいる区間（0〜3）と、その区間の中の進み q（0〜1）
    const total = pathLen(HEAT_CURVE);
    let d = k * total, seg = 0;
    for (let i = 1; i < HEAT_CURVE.length; i++) {
      const len = Math.hypot(HEAT_CURVE[i][0] - HEAT_CURVE[i - 1][0], HEAT_CURVE[i][1] - HEAT_CURVE[i - 1][1]);
      if (d <= len || i === HEAT_CURVE.length - 1) { seg = i - 1; d = Math.min(d, len); break; }
      d -= len;
    }
    const segLen = Math.hypot(HEAT_CURVE[seg + 1][0] - HEAT_CURVE[seg][0], HEAT_CURVE[seg + 1][1] - HEAT_CURVE[seg][1]);
    const q = d / segLen;
    const tip = along(HEAT_CURVE, k);

    const items = heatGraphItems().filter(it => !(it.type === 'line' && it.color === 'blue'));
    const ps = partial(HEAT_CURVE, k);
    if (ps.length >= 2) items.push({ type: 'line', points: ps, color: 'blue', width: 3 });
    items.push({ type: 'circle', x: tip.x, y: tip.y, r: 4, fill: 'blue', stroke: 'none' });

    // 右下の小さなビーカー（底の中央 (250, 176)、幅 44・高さ 44）。氷 → 氷と水 → 水 → 水と泡
    const level = seg === 0 ? 0 : seg === 1 ? 0.45 * q : 0.45;
    items.push({ type: 'beaker', x: 250, y: 176, width: 44, height: 44, level });
    const waterTop = 176 - 44 * level;
    const ice = seg === 0 ? 10 : seg === 1 ? 10 * (1 - q) : 0;
    if (ice > 0.5) {
      [239, 250, 261].forEach(cx => {
        // 水があれば水面に浮く（1 割ほどが水面より上）、なければ底にのる
        const y = Math.min(174 - ice, waterTop - 0.1 * ice);
        items.push({ type: 'rect', x: cx - ice / 2, y, width: ice, height: ice, fill: 'white', stroke: 'line' });
      });
    }
    if (seg === 3) {
      [240, 252, 262].forEach((x, i) => {
        items.push({ type: 'circle', x, y: 172 - (172 - waterTop - 3) * frac(3 * t + i / 3), r: 3, fill: 'white', stroke: 'line' });
      });
    }
    items.push({ type: 'text', x: 250, y: 192, text: HEAT_STATES[seg], size: 12, anchor: 'middle' });

    if (seg >= 1) {
      items.push(
        { type: 'text', x: 105, y: 150, text: '氷がとける', size: 12, anchor: 'middle' },
        { type: 'text', x: 105, y: 180, text: '0℃で一定', size: 12, anchor: 'middle' },
      );
    }
    if (seg >= 3) {
      items.push(
        { type: 'text', x: 245, y: 40, text: '水が沸とう', size: 12, anchor: 'middle' },
        { type: 'text', x: 245, y: 72, text: '100℃で一定', size: 12, anchor: 'middle' },
      );
    }
    return items;
  }

  // ================================================================
  // 水溶液（solution）
  // ================================================================

  // 粒子の並び方（ビーカーの底の中央からのずれ）。content/solution.js の DOTS の一部と同じ
  const SOL_DOTS = {
    even: [[-24, -78], [2, -84], [24, -74], [-14, -50], [12, -56], [-26, -22], [0, -18], [24, -26], [-2, -36]],
    lump: [[-6, -8], [0, -12], [6, -8], [-3, -16], [4, -17], [0, -5], [-8, -14], [8, -14], [0, -21]],
  };
  // 粒子の入ったビーカー。content/solution.js の particleBeaker と同じ式
  function particleBeaker(x, y, pattern) {
    const items = [{ type: 'beaker', x, y, width: 80, height: 110, level: 0.85 }];
    SOL_DOTS[pattern].forEach(([dx, dy]) => items.push({ type: 'circle', x: x + dx, y: y + dy, r: 4, fill: 'purple', stroke: 'none' }));
    return items;
  }
  // 左のビーカー（高さ 110・level 0.7 → 水の深さ 77）と右のビーカー（level 0.85 → 93.5）の水の深さの比。
  // 右の粒の並びを左の水の中に収めるために、縦のずれをこの比で縮める
  const DISSOLVE_DEPTH = 77 / 93.5;

  // 砂糖のかたまりが小さくなり、砂糖の粒が水全体へ広がる（sol-1-c1）
  // 静止図は content/solution.js の sol-1-c1
  function slDissolve(t) {
    const p = stage(t, 0.05, 0.75);
    const items = [{ type: 'beaker', x: 80, y: 200, width: 90, height: 110, level: 0.7 }];
    const s = 1 - p;   // かたまりの大きさの割合（底の中央 (80, 198) は動かさない）
    if (s > 0.01) items.push({ type: 'rect', x: 80 - 12 * s, y: 198 - 20 * s, width: 24 * s, height: 20 * s, fill: 'white' });
    SOL_DOTS.lump.forEach(([sx, sy], k) => {
      const q = stage(p, k * 0.04, k * 0.04 + 0.66);
      if (!(q > 0)) return;
      const [ex, ey] = SOL_DOTS.even[k];
      const e = ease(q);
      const wob = 2 * osc(t, 3, k / 9) * Math.sin(Math.PI * q);   // 途中だけ小さくゆれる（はじめと終わりは 0）
      const x = lerp(80 + sx, 80 + ex, e) + wob;
      const y = lerp(200 + sy, 200 + ey * DISSOLVE_DEPTH, e);
      items.push({ type: 'circle', x, y, r: 4, fill: 'purple', stroke: 'none' });
    });
    items.push(
      { type: 'arrow', x1: 138, y1: 150, x2: 182, y2: 150, color: 'gray' },
      ...particleBeaker(240, 200, 'even'),
      { type: 'text', x: 80, y: 56, text: '溶質（砂糖）', size: 13, anchor: 'middle' },
      { type: 'text', x: 80, y: 74, text: '溶媒（水）', size: 13, anchor: 'middle' },
      { type: 'text', x: 240, y: 74, text: '溶液（砂糖水）', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 228, text: '溶質 ＋ 溶媒 → 溶液', size: 14, anchor: 'middle' },
    );
    return items;
  }

  // 溶解度曲線のグラフ。content/solution.js の gx・gy・KNO3・NACL・graphItems・moveText と同じ式
  function gx(t) { return 50 + 4 * t; }
  function gy(m) { return 210 - 1.5 * m; }
  const KNO3 = [[0, 13], [10, 22], [20, 32], [30, 46], [40, 64], [50, 85], [60, 110]];
  const NACL = [[0, 36], [20, 36], [40, 36.3], [60, 37]];
  function graphItems(showValues) {
    const items = [
      { type: 'line', points: [[50, 60], [290, 60]], color: 'glass', width: 2 },
      { type: 'line', points: [[50, 135], [290, 135]], color: 'glass', width: 2 },
      ...[10, 20, 30, 40, 60, 70, 80, 90, 110].map(m => ({ type: 'line', points: [[50, gy(m)], [290, gy(m)]], color: 'glass', width: 1 })),
      { type: 'line', points: [[50, 26], [50, 210], [296, 210]], width: 2 },
      { type: 'text', x: 4, y: 16, text: '水 100 g にとける質量（g）', size: 12 },
      { type: 'text', x: 44, y: 214, text: '0', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: 139, text: '50', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: 64, text: '100', size: 12, anchor: 'end' },
      { type: 'text', x: 316, y: 238, text: '水の温度（℃）', size: 12, anchor: 'end' },
      { type: 'line', points: KNO3.map(([t, m]) => [gx(t), gy(m)]), color: 'blue', width: 3 },
      { type: 'line', points: NACL.map(([t, m]) => [gx(t), gy(m)]), color: 'green', width: 3 },
      { type: 'text', x: 92, y: 130, text: '硝酸カリウム', size: 12, color: 'blue' },
      { type: 'text', x: 226, y: 176, text: '塩化ナトリウム', size: 12, color: 'green' },
    ];
    [0, 20, 40, 60].forEach(t => {
      items.push({ type: 'line', points: [[gx(t), 210], [gx(t), 216]], width: 2 });
      items.push({ type: 'text', x: gx(t), y: 228, text: String(t), size: 12, anchor: 'middle' });
    });
    if (showValues) {
      [[20, 32], [40, 64], [60, 110]].forEach(([t, m]) => {
        items.push({ type: 'circle', x: gx(t), y: gy(m), r: 4, fill: 'blue', stroke: 'none' });
      });
      items.push({ type: 'text', x: gx(20) + 4, y: gy(32) + 18, text: '32', size: 12, color: 'blue' });
      items.push({ type: 'text', x: gx(40) + 8, y: gy(64) + 16, text: '64', size: 12, color: 'blue' });
      items.push({ type: 'text', x: gx(60) - 8, y: gy(110) - 4, text: '110', size: 12, color: 'blue', anchor: 'end' });
    }
    return items;
  }
  function moveText(items, text, x, y, anchor) {
    return items.map(it => (it.type === 'text' && it.text === text ? Object.assign({}, it, { x, y, anchor: anchor || it.anchor }) : it));
  }
  // 温度 T ℃ で水 100 g にとける硝酸カリウムの質量 g（表の点を直線でつなぐ。グラフの折れ線と同じ）
  function kno3At(T) {
    const c = clamp(T, 0, 60);
    for (let i = 1; i < KNO3.length; i++) {
      const [t0, m0] = KNO3[i - 1], [t1, m1] = KNO3[i];
      if (c <= t1) return lerp(m0, m1, (c - t0) / (t1 - t0));
    }
    return KNO3[KNO3.length - 1][1];
  }
  // 水温の変化（60 → 20 ℃）。テストでも使う
  function recrystTemp(t) { return 60 - 40 * ease(stage(t, 0.05, 0.85)); }

  // 60 ℃ で 110 g とかした硝酸カリウムの水溶液を冷やすと、とけきれなくなった分が結晶になる（sol-4-c2）
  // 静止図は content/solution.js の sol-4-c2
  function slRecrystallize(t) {
    const T = recrystTemp(t);
    const x = gx(T), yc = gy(kno3At(T));
    const crystal = 110 - kno3At(T);   // 結晶になった量 g（= (yc − 45) / 1.5）
    const items = moveText(graphItems(true), '硝酸カリウム', 262, 60, 'end');
    if (gx(60) - x > 0.5) items.push({ type: 'line', points: [[gx(60), gy(110)], [x, gy(110)]], color: 'gray', width: 2, dashed: true });
    if (yc - 4 - gy(110) > 6) items.push({ type: 'line', points: [[x, gy(110)], [x, yc - 4]], color: 'orange', width: 3, arrow: true });
    items.push({ type: 'circle', x, y: yc, r: 5, fill: 'orange', stroke: 'ink' });
    items.push({ type: 'text', x: gx(20) + 8, y: 40, text: '水温 ' + Math.round(T) + ' ℃', size: 13 });
    // 静止図の「78 g が」の位置に、いま結晶になっている量を出す（20 ℃ で 78 g、静止図と同じ文字）
    items.push(
      { type: 'text', x: gx(20) + 8, y: 100, text: Math.round(crystal) + ' g が', size: 13, color: 'orange', bold: true },
      { type: 'text', x: gx(20) + 8, y: 116, text: '結晶になる', size: 13, color: 'orange', bold: true },
    );
    return items;
  }

  // ================================================================
  // 化学変化と原子・分子（chemical-change）
  // ================================================================

  // 原子のモデルの塗り。content/chemical-change.js の ATOM_FILL・dot と同じ
  const ATOM_FILL = { H: 'white', O: 'sky', C: 'gray', Cu: 'brown', N: 'lightgreen', S: 'yellow', Fe: 'rock', Na: 'purple', Cl: 'green', Mg: 'glass', Ag: 'glass' };
  function dot(x, y, sym, r) {
    return { type: 'circle', x, y, r: r || 9, fill: ATOM_FILL[sym] || 'white', stroke: 'ink' };
  }
  // 2H₂ + O₂ → 2H₂O の原子: [記号, 反応前の x, y, r, 分子の中で離れる向き（−1 左・+1 右）, 反応後の x, y, r]
  const WATER_ATOMS = [
    ['H', 32, 84, 10, -1, 218, 94, 8], ['H', 52, 84, 10, 1, 246, 94, 8],
    ['H', 32, 126, 10, -1, 218, 140, 8], ['H', 52, 126, 10, 1, 246, 140, 8],
    ['O', 99, 105, 11, -1, 232, 82, 11], ['O', 121, 105, 11, 1, 232, 128, 11],
  ];

  // 水素分子 2 つと酸素分子 1 つがばらばらになり、組みかわって水分子 2 つになる（chem-3-c1）
  // 静止図は content/chemical-change.js の chem-3-c1
  function chWaterFormation(t) {
    const p1 = stage(t, 0.1, 0.3);          // 分子の中の原子が離れる
    const raw = stage(t, 0.35, 0.8);
    const p2 = ease(raw);                    // 原子が右の水分子の位置へ動く
    const items = [
      { type: 'text', x: 42, y: 44, text: '2H₂', size: 16, anchor: 'middle' },
      { type: 'text', x: 110, y: 44, text: 'O₂', size: 16, anchor: 'middle' },
      { type: 'text', x: 232, y: 44, text: '2H₂O', size: 16, anchor: 'middle' },
      { type: 'text', x: 78, y: 112, text: '＋', size: 18, anchor: 'middle' },
      { type: 'arrow', x1: 144, y1: 105, x2: 190, y2: 105 },
    ];
    // もとの位置（反応前の分子）と行き先（水分子の位置）の灰色の輪かく
    WATER_ATOMS.forEach(a => items.push({ type: 'circle', x: a[1], y: a[2], r: a[3], fill: 'none', stroke: 'gray' }));
    WATER_ATOMS.forEach(a => items.push({ type: 'circle', x: a[5], y: a[6], r: a[7], fill: 'none', stroke: 'gray' }));
    WATER_ATOMS.forEach(([sym, x0, y0, r0, side, x1, y1, r1]) => {
      const sx = x0 + 6 * side * p1;
      items.push(dot(lerp(sx, x1, p2), lerp(y0, y1, p2), sym, lerp(r0, r1, p2)));
    });
    items.push(
      { type: 'text', x: 160, y: 186, text: '左右とも H は 4 個、O は 2 個', size: 13, anchor: 'middle' },
      dot(30, 218, 'H', 8),
      { type: 'text', x: 44, y: 223, text: '水素原子', size: 12 },
      dot(170, 218, 'O', 8),
      { type: 'text', x: 184, y: 223, text: '酸素原子', size: 12 },
    );
    if (raw > 0 && raw < 1) items.push({ type: 'text', x: 160, y: 166, text: '原子の組み合わせが変わる', size: 13, anchor: 'middle', color: 'blue' });
    return items;
  }

  // 左のふたをした容器の泡: [x, 位相]。y = 118 − 48·tri(2t + 位相)。t = 0 で静止図の泡 (70,100)・(90,86)
  const CLOSED_BUBBLES = [[70, triPhase(18 / 48, 1)], [90, triPhase(32 / 48, 1)], [80, 0.75]];
  // 右のふたを開けた容器の泡: [x, 口から上で横に動く向き]（灰色の矢印 (230,70)→(222,44)・(250,70)→(258,44) に沿う）
  const OPEN_BUBBLES = [[230, -1], [250, 1], [240, 0]];

  // ふたをしたままでは二酸化炭素が容器の中にとどまり、ふたを開けると外へ出て質量が小さくなる（chem-4-c2）
  // 静止図は content/chemical-change.js の chem-4-c2。はかりの数字（80.0 → 79.6 g）は説明のための例の値
  function chOpenContainer(t) {
    const lost = 0.4 * stage(t, 0.1, 0.85);
    const items = [
      { type: 'text', x: 80, y: 30, text: 'ふたをしたまま', size: 13, anchor: 'middle' },
      { type: 'text', x: 240, y: 30, text: 'ふたを開ける', size: 13, anchor: 'middle' },
      { type: 'rect', x: 66, y: 52, width: 28, height: 12, rx: 3, fill: 'gray' },
      { type: 'rect', x: 50, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
      { type: 'rect', x: 52, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
    ];
    // 左: 泡は容器の中（y 70〜118）で上下し、外に出ない
    CLOSED_BUBBLES.forEach(([x, ph]) => items.push({ type: 'circle', x, y: 118 - 48 * tri(2 * t + ph), r: 4, fill: 'white', stroke: 'line' }));
    items.push(
      { type: 'rect', x: 35, y: 162, width: 90, height: 28, fill: 'glass', label: '80.0 g' },
      { type: 'rect', x: 210, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
      { type: 'rect', x: 212, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
      { type: 'arrow', x1: 230, y1: 70, x2: 222, y2: 44, color: 'gray' },
      { type: 'arrow', x1: 250, y1: 70, x2: 258, y2: 44, color: 'gray' },
    );
    // 右: 泡は水面から上がり、口から外へ出て y 30 まで上がる（そこで消えて、また水面から出る）
    OPEN_BUBBLES.forEach(([x0, dir], k) => {
      const y = 118 - 88 * frac(2 * t + k / 3);
      const x = x0 + dir * Math.max(0, 70 - y) * 8 / 26;
      items.push({ type: 'circle', x, y, r: 4, fill: 'white', stroke: 'line' });
    });
    items.push(
      { type: 'rect', x: 195, y: 162, width: 90, height: 28, fill: 'glass', label: (80 - lost).toFixed(1) + ' g' },
      { type: 'text', x: 80, y: 214, text: '質量は変わらない', size: 12, anchor: 'middle' },
      { type: 'text', x: 240, y: 214, text: '二酸化炭素が出て', size: 12, anchor: 'middle' },
      { type: 'text', x: 240, y: 232, text: '質量が小さくなる', size: 12, anchor: 'middle' },
    );
    return items;
  }

  // ================================================================
  // 化学変化とイオン（ion）
  // ================================================================

  // イオンのモデル。content/ion.js の ION_FILL・ion と同じ
  const ION_FILL = { 'H+': 'pink', 'Na+': 'yellow', 'Cu2+': '#F5C9A6', 'Zn2+': 'glass', 'Cl-': 'lightgreen', 'OH-': 'sky' };
  function ion(x, y, name, r) {
    return { type: 'circle', x, y, r: r || (name.length >= 4 ? 23 : 19), fill: ION_FILL[name] || 'white', stroke: 'ink', label: name };
  }
  function electronE(x, y) { return { type: 'circle', x, y, r: 10, fill: 'sky', stroke: 'blue', label: 'e-' }; }

  // ナトリウム原子が電子を 1 個失って Na+ に、塩素原子が電子を 1 個受け取って Cl- になる（ion-1-c3）
  // 静止図は content/ion.js の ion-1-c3
  function ioIonFormation(t) {
    const xa = 50 + 150 * stage(t, 0, 0.4);     // 上の段: ナトリウム原子
    const pb = stage(t, 0.5, 0.9);
    const xb = 50 + 150 * pb;                    // 下の段: 塩素原子
    const items = [
      // もとの位置の輪かく
      { type: 'circle', x: 50, y: 70, r: 20, fill: 'none', stroke: 'gray', label: 'Na' },
      { type: 'circle', x: 50, y: 170, r: 20, fill: 'none', stroke: 'gray', label: 'Cl' },
      { type: 'arrow', x1: 80, y1: 70, x2: 168, y2: 70, color: 'gray' },
      { type: 'text', x: 124, y: 50, text: '電子を 1 個失う', size: 12, anchor: 'middle' },
      { type: 'arrow', x1: 80, y1: 170, x2: 168, y2: 170, color: 'gray' },
      { type: 'text', x: 124, y: 150, text: '電子を 1 個受け取る', size: 12, anchor: 'middle' },
    ];
    // 上の段: x 124 で電子を残して離れ、Na+ になる
    items.push(xa > 124 ? ion(xa, 70, 'Na+', 20) : { type: 'circle', x: xa, y: 70, r: 20, fill: 'white', stroke: 'ink', label: 'Na' });
    items.push(electronE(Math.min(xa, 124), 88));
    // 下の段: x 124 で電子を受け取っていっしょに動き、(200, 170) に着いたら Cl- になる
    items.push(pb >= 1 ? ion(200, 170, 'Cl-', 20) : { type: 'circle', x: xb, y: 170, r: 20, fill: 'white', stroke: 'ink', label: 'Cl' });
    if (pb < 1) items.push(electronE(Math.max(xb, 124), 188));
    items.push(
      { type: 'text', x: 232, y: 76, text: '陽イオン', size: 14, bold: true },
      { type: 'text', x: 50, y: 110, text: 'ナトリウム原子', size: 12, anchor: 'middle' },
      { type: 'text', x: 200, y: 110, text: 'ナトリウムイオン', size: 12, anchor: 'middle' },
      { type: 'text', x: 232, y: 176, text: '陰イオン', size: 14, bold: true },
      { type: 'text', x: 50, y: 212, text: '塩素原子', size: 12, anchor: 'middle' },
      { type: 'text', x: 200, y: 212, text: '塩化物イオン', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 236, text: '（e- は電子）', size: 12, anchor: 'middle' },
    );
    return items;
  }

  // 塩化ナトリウム水溶液のイオン: [イオン式, 結晶の中の位置 x, y, 水の中の位置（静止図）x, y]
  // 結晶は 3 列 × 2 段に接して並ぶ（半径 19・間隔 38）。並びは静止図と同じ Na+ Cl- Na+ / Cl- Na+ Cl-
  const NACL_IONS = [
    ['Na+', 122, 140, 85, 135], ['Cl-', 160, 140, 160, 135], ['Na+', 198, 140, 235, 135],
    ['Cl-', 122, 178, 100, 185], ['Na+', 160, 178, 170, 185], ['Cl-', 198, 178, 240, 185],
  ];
  const DISSOC_REST = 0.6;

  // 塩化ナトリウムの結晶が水の中で Na+ と Cl- に分かれて広がる（ion-1-c4）
  // 静止図は content/ion.js の ion-1-c4
  function ioDissociation(t) {
    const p = ease(stage(t, 0.1, DISSOC_REST));
    const items = [
      { type: 'text', x: 160, y: 30, text: 'NaCl → Na+ ＋ Cl-', size: 16, anchor: 'middle', bold: true },
      { type: 'beaker', x: 160, y: 215, width: 220, height: 150, level: 0.75 },
    ];
    NACL_IONS.forEach(([name, cx, cy, x1, y1], k) => {
      // 分かれたあとは小さくゆれる（t = 0.6 でずれ 0。静止図と同じ位置）
      const sway = t > DISSOC_REST;
      const ox = sway ? 1.5 * (osc(t, 2, k / 6) - osc(DISSOC_REST, 2, k / 6)) : 0;
      const oy = sway ? 1.5 * (osc(t, 2, k / 6 + 0.25) - osc(DISSOC_REST, 2, k / 6 + 0.25)) : 0;
      items.push(ion(lerp(cx, x1, p) + ox, lerp(cy, y1, p) + oy, name));
    });
    items.push({ type: 'text', x: 160, y: 236, text: '塩化ナトリウム水溶液', size: 12, anchor: 'middle' });
    if (t < 0.1) items.push({ type: 'text', x: 160, y: 112, text: '結晶', size: 13, anchor: 'middle' });
    return items;
  }

  // ダニエル電池の装置。content/ion.js の daniellItems と同じ
  function daniellItems() {
    return [
      { type: 'beaker', x: 160, y: 215, width: 220, height: 110, level: 0 },
      { type: 'rect', x: 52, y: 130, width: 107, height: 83, fill: 'glass', stroke: 'none' },
      { type: 'rect', x: 161, y: 130, width: 107, height: 83, fill: 'sky', stroke: 'none' },
      { type: 'line', points: [[160, 118], [160, 212]], color: 'gray', width: 3, dashed: true },
      { type: 'rect', x: 80, y: 90, width: 12, height: 110, fill: 'rock' },
      { type: 'rect', x: 228, y: 90, width: 12, height: 110, fill: 'brown' },
      { type: 'line', points: [[86, 90], [86, 50], [140, 50]], width: 2 },
      { type: 'line', points: [[180, 50], [234, 50], [234, 90]], width: 2 },
      { type: 'symbol', x: 160, y: 50, kind: 'motor' },
      { type: 'text', x: 160, y: 26, text: 'モーター', size: 12, anchor: 'middle' },
      { type: 'text', x: 50, y: 86, text: '亜鉛板', size: 12, anchor: 'middle' },
      { type: 'text', x: 272, y: 86, text: '銅板', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 104, text: 'セロハン', size: 12, anchor: 'middle' },
      { type: 'text', x: 105, y: 234, text: '硫酸亜鉛水溶液', size: 12, anchor: 'middle' },
      { type: 'text', x: 215, y: 234, text: '硫酸銅水溶液', size: 12, anchor: 'middle' },
    ];
  }
  // 電子の道すじ（亜鉛板 → 導線 → モーター → 導線 → 銅板）
  const DANIELL_WIRE = [[86, 90], [86, 50], [140, 50], [180, 50], [234, 50], [234, 90]];
  // 銅板に付いた銅の層の色（銅板の brown より濃くして見分ける）
  const COPPER_LAYER = mix(TOKEN_HEX.brown, TOKEN_HEX.ink, 0.35);

  // ダニエル電池のイオンの動き（どちらも 1 周に 1 回、2 つの粒を半周ずらす）。
  // 粒は 1 周のうち DANIELL_LIFE の間だけ見え、はじめと終わりの 2 割で色がうすくなる（大きさは変えない）
  const DANIELL_LIFE = 0.7;
  // Zn2+: 亜鉛板の後ろから出て、水溶液の奥へ広がっていく。t = 0 で 1 つ目が静止図の位置 (122,172)（道すじの 6 割）
  const ZN_PATH = [[98, 154], [138, 184]], ZN_PHASES = [0.42, 0.92];
  // Cu2+: 水溶液の奥から銅板へ近づき、銅板に着いて銅になる。t = 0 で 1 つ目が静止図の位置 (198,172)（道すじの 5 割）
  const CU_PATH = [[184, 191], [212, 153]], CU_PHASES = [0.35, 0.85];

  // 1 周の中の位置 u の粒: { x, y, f }（f は色の濃さ 0〜1）。見えていないときは null
  function daniellIon(path, u) {
    if (u >= DANIELL_LIFE) return null;
    const s = u / DANIELL_LIFE;
    const f = Math.min(1, s / 0.2, (1 - s) / 0.2);
    if (f < 0.02) return null;
    return { x: lerp(path[0][0], path[1][0], s), y: lerp(path[0][1], path[1][1], s), f };
  }
  // 粒の item。色が濃いときは静止図と同じ ion()、うすいときは丸と文字の色を水溶液の色 bg に近づける
  function daniellIonItems(p, name, fillHex, bg) {
    if (p.f >= 0.999) return [ion(p.x, p.y, name)];
    const k = 1 - p.f;
    const ink = mix(TOKEN_HEX.ink, bg, k);
    return [
      { type: 'circle', x: p.x, y: p.y, r: 23, fill: mix(fillHex, bg, k), stroke: ink },
      { type: 'text', x: p.x, y: p.y + 6, text: name, size: 16, anchor: 'middle', color: ink },
    ];
  }

  // 亜鉛板から Zn2+ がとけ出し、電子が導線を通って銅板へ移り、Cu2+ が電子を受け取って銅板に付く（ion-2-c3）
  // 静止図は content/ion.js の ion-2-c3
  function ioDaniell(t) {
    const base = daniellItems();
    // Zn2+ は亜鉛板（base[4]）の後ろ、Cu2+ は銅板（base[5]）の後ろに描く（板から出てくる・板に着く）
    const zn = [], cu = [];
    ZN_PHASES.forEach(ph => {
      const p = daniellIon(ZN_PATH, frac(t + ph));
      if (p) zn.push(...daniellIonItems(p, 'Zn2+', TOKEN_HEX.glass, TOKEN_HEX.glass));
    });
    CU_PHASES.forEach(ph => {
      const p = daniellIon(CU_PATH, frac(t + ph));
      if (p) cu.push(...daniellIonItems(p, 'Cu2+', ION_FILL['Cu2+'], TOKEN_HEX.sky));
    });
    const items = base.slice(0, 4).concat(zn, [base[4]], cu, base.slice(5));
    // 銅板の左に付く銅の層（だんだん厚くなる）
    const th = 3 * stage(t, 0, 0.9);
    if (th > 0.05) items.push({ type: 'rect', x: 228 - th, y: 130, width: th, height: 70, fill: COPPER_LAYER, stroke: 'none' });
    // モーターの中で回る線（1 周に 2 回転）
    items.push({ type: 'line', points: [onCircle(160, 50, 8, 720 * t), onCircle(160, 50, 8, 720 * t + 180)], width: 2 });
    // 電子 4 つ（モーターの中では見せない）。t = 0 で道すじのはしにいないよう 1/8 ずらす
    for (let k = 0; k < 4; k++) {
      const pt = along(DANIELL_WIRE, frac(2 * t + k / 4 + 1 / 8));
      if (Math.abs(pt.y - 50) < 0.01 && pt.x > 145 && pt.x < 175) continue;
      items.push({ type: 'circle', x: pt.x, y: pt.y, r: 4, fill: 'sky', stroke: 'blue' });
    }
    items.push(
      { type: 'arrow', x1: 188, y1: 36, x2: 226, y2: 36, color: 'blue', width: 2 },
      { type: 'text', x: 207, y: 26, text: '電子', size: 12, anchor: 'middle' },
      { type: 'text', x: 50, y: 66, text: '−極', size: 13, anchor: 'middle' },
      { type: 'text', x: 272, y: 66, text: '＋極', size: 13, anchor: 'middle' },
    );
    return items;
  }

  // 青色・赤色のリトマス紙の色。content/ion.js の BLUE_LITMUS と同じ
  const BLUE_LITMUS = '#8FB4F0';
  // 赤い部分の左はし（糸の近く x 152 → 陰極側へ）。静止図の左はし 96 になる t を restT にする
  function migrationLeft(t) { return 152 - 96 * stage(t, 0, 0.85); }
  const MIGRATION_REST = 0.85 * 56 / 96;

  // 塩酸をしみこませた糸から、赤色（H+）が陰極側へ広がる（ion-3-c4）
  // 静止図は content/ion.js の ion-3-c4。H+ の色は ION_FILL と同じ pink
  function ioMigration(t) {
    const left = migrationLeft(t);
    const items = [
      { type: 'text', x: 40, y: 50, text: '陰極（−）', size: 12, anchor: 'middle' },
      { type: 'text', x: 280, y: 50, text: '陽極（＋）', size: 12, anchor: 'middle' },
      { type: 'line', points: [[40, 58], [40, 112]], width: 2 },
      { type: 'line', points: [[280, 58], [280, 112]], width: 2 },
      { type: 'rect', x: 20, y: 96, width: 280, height: 48, fill: 'glass' },
      { type: 'rect', x: 40, y: 108, width: 240, height: 24, fill: BLUE_LITMUS, stroke: 'none' },
      { type: 'rect', x: left, y: 108, width: 162 - left, height: 24, fill: 'red', stroke: 'none' },
      { type: 'line', points: [[160, 92], [160, 148]], width: 3 },
    ];
    // H+ 4 つ: 先頭は赤い部分の左はし、残りは糸の近くまで並ぶ（赤い部分が H+ より細い動き始めは、糸の左にそろえる）
    const head = left + 7, tail = Math.max(head, 155);
    [116, 124, 116, 124].forEach((y, k) => items.push({ type: 'circle', x: Math.min(155, lerp(head, tail, k / 3)), y, r: 7, fill: 'pink', stroke: 'ink' }));
    items.push(
      { type: 'arrow', x1: 150, y1: 84, x2: 104, y2: 84, color: 'red', width: 2 },
      { type: 'text', x: 127, y: 74, text: 'H+', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 168, text: '塩酸をしみこませた糸', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 196, text: '赤色が陰極側へ広がる', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 222, text: '→ 酸性を示すのは H+（陽イオン）', size: 13, anchor: 'middle' },
    );
    return items;
  }

  // H+ と OH- が近づいて結びつき、水になる（ion-4-c1）
  // 静止図は content/ion.js の ion-4-c1
  function ioNeutralize(t) {
    const p = ease(stage(t, 0.05, 0.5));
    const items = [
      { type: 'text', x: 160, y: 36, text: 'H+ ＋ OH- → H₂O', size: 16, anchor: 'middle', bold: true },
      { type: 'text', x: 102, y: 106, text: '＋', size: 18, anchor: 'middle' },
      { type: 'arrow', x1: 174, y1: 100, x2: 214, y2: 100, color: 'gray' },
      // もとの位置（反応前のイオン）の灰色の輪かく。止まった絵でも「＋」「酸の性質」「アルカリの性質」が何を指すか分かるように。
      // 文字は動いているイオンの文字と重ならないよう、結びつき終わってから出す
      Object.assign({ type: 'circle', x: 60, y: 100, r: 19, fill: 'none', stroke: 'gray' }, p >= 1 ? { label: 'H+' } : {}),
      Object.assign({ type: 'circle', x: 144, y: 100, r: 19, fill: 'none', stroke: 'gray' }, p >= 1 ? { label: 'OH-' } : {}),
      // 行き先（水分子）の灰色の輪かく
      { type: 'circle', x: 262, y: 96, r: 16, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 240, y: 112, r: 10, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 284, y: 112, r: 10, fill: 'none', stroke: 'gray' },
    ];
    if (p < 1) {
      items.push(
        ion(lerp(60, 240, p), lerp(100, 112, p), 'H+', lerp(19, 10, p)),
        ion(lerp(144, 268, p), lerp(100, 102, p), 'OH-', lerp(19, 16, p)),
      );
    } else {
      items.push(
        { type: 'circle', x: 262, y: 96, r: 16, fill: 'sky', stroke: 'ink', label: 'O' },
        { type: 'circle', x: 240, y: 112, r: 10, fill: 'white', stroke: 'ink' },
        { type: 'circle', x: 284, y: 112, r: 10, fill: 'white', stroke: 'ink' },
      );
    }
    items.push(
      { type: 'text', x: 262, y: 146, text: '水', size: 13, anchor: 'middle' },
      { type: 'text', x: 60, y: 140, text: '酸の性質', size: 12, anchor: 'middle' },
      { type: 'text', x: 144, y: 140, text: 'アルカリの性質', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 190, text: 'たがいの性質を打ち消し合う', size: 14, anchor: 'middle' },
      { type: 'text', x: 160, y: 218, text: '＝ 中和', size: 14, anchor: 'middle', bold: true },
    );
    return items;
  }

  const DEFS = [
    ['su-water-displacement', suWaterDisplacement, { restT: 0 }],
    ['st-particles', stParticles, { restT: 0 }],
    ['st-heating-curve', stHeatingCurve, { restT: 0.99 }],
    ['sl-dissolve', slDissolve, { restT: 0 }],
    ['sl-recrystallize', slRecrystallize, { restT: 0.99 }],
    ['ch-water-formation', chWaterFormation, { restT: 0.99 }],
    ['ch-open-container', chOpenContainer, { restT: 0.99 }],
    ['io-ion-formation', ioIonFormation, { restT: 0.99 }],
    ['io-dissociation', ioDissociation, { restT: DISSOC_REST }],
    ['io-daniell', ioDaniell, { restT: 0 }],
    ['io-migration', ioMigration, { restT: MIGRATION_REST }],
    ['io-neutralize', ioNeutralize, { restT: 0.99 }],
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  // このファイルで足した kind と、テストで値を確かめるための式
  const api = {
    KINDS: DEFS.map(d => d[0]), kno3At, recrystTemp, migrationLeft,
    daniell: { ion: daniellIon, ZN_PATH, ZN_PHASES, CU_PATH, CU_PHASES },
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
