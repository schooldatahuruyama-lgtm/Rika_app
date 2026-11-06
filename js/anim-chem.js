// 解説カードの動く図（化学: 身のまわりの物質・状態変化・水溶液・化学変化と原子・分子・化学変化とイオン）。
// js/anim.js の register で足す（書き方は docs/anim-guide.md、各 kind の動きは docs/anim-plan.md 6 章）。
// 静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、動く部品だけを式で動かす。
// 静止図を作る関数は content の中にあって呼べないので、同じ式をこのファイルに写す（出どころはコメントに書く）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, clamp, ease, osc, tri, along, partial, pathLen, onCircle, mix, deg, TOKEN_HEX } = anim.helpers;

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

  // ---- 上方置換法・下方置換法（sub-3-c2・sub-3-c3） ----
  // 2 つは同じ作り。動く部品の座標は上方置換法（口を下に向けた試験管: 底の中央 (160, 50)、tilt 180、口は y 150）で決め、
  // 下方置換法（口を上に向けた試験管: 底の中央 (160, 210)、口は y 110）では上下を入れかえる（y → 260 − y）。
  // 静止図は content/substance.js の sub-3-c2・sub-3-c3
  const DISP = {
    up: {
      gas: 'purple', fill: '#E9DDF8',
      items: [
        { type: 'text', x: 20, y: 34, text: '上方置換法', size: 16, bold: true },
        { type: 'tube', x: 160, y: 50, height: 100, tilt: 180, level: 0 },
        { type: 'line', points: [[40, 210], [160, 210], [160, 66]], width: 3 },
      ],
      after: [
        { type: 'arrow', x1: 210, y1: 150, x2: 210, y2: 70, color: 'blue' },
        { type: 'text', x: 222, y: 104, text: '軽い気体は', size: 13 },
        { type: 'text', x: 222, y: 122, text: '上にたまる', size: 13 },
        { type: 'text', x: 40, y: 200, text: '気体', size: 13 },
        { type: 'text', x: 20, y: 236, text: '口を下に向ける', size: 13 },
      ],
    },
    down: {
      gas: 'gray', fill: '#E6E8EC',
      items: [
        { type: 'text', x: 20, y: 34, text: '下方置換法', size: 16, bold: true },
        { type: 'tube', x: 160, y: 210, height: 100, level: 0 },
        { type: 'line', points: [[40, 60], [160, 60], [160, 194]], width: 3 },
      ],
      after: [
        { type: 'arrow', x1: 210, y1: 120, x2: 210, y2: 200, color: 'blue' },
        { type: 'text', x: 222, y: 154, text: '重い気体は', size: 13 },
        { type: 'text', x: 222, y: 172, text: '下にたまる', size: 13 },
        { type: 'text', x: 40, y: 52, text: '気体', size: 13 },
        { type: 'text', x: 20, y: 236, text: '口を上に向ける', size: 13 },
      ],
    },
  };
  // 以下は上方置換法の向きの座標。試験管の内側は x 150〜170、底の丸み（中心 (160, 62)、半径 10）のいちばん奥は y 52
  const DISP_FULL = 146;    // たまった気体の先（口 y 150 の少し手前まで）
  const DISP_PUSH = 132;    // 気体の先の進む量。DISP_FULL をこえた分は、口から出ていく空気をさらにおし出す
  // たまった気体の粒（気体の先が通りすぎると、うすい色から濃くなって見えてくる）。ガラス管（x 160）をよける 2 列（x 153・167）
  const DISP_GAS_DOTS = [0, 1, 2, 3, 4, 5, 6, 7].map(j => [j % 2 ? 167 : 153, 59 + 10 * j]);
  // もとの空気の粒 [はじめの x, y, 口から出たあとに止まる x, y]。下の粒ほど先に口から出て遠くへ行く
  const DISP_AIR = [[153, 74, 130, 172], [167, 92, 190, 172], [153, 110, 116, 188], [167, 128, 204, 188]];

  // 気体の先 front（y）までの、試験管の奥からたまった所の形（底の丸みに沿う）
  function dispGasShape(front, Y, fill) {
    const pts = [[150, front], [150, Math.min(62, front)]];
    for (let a = 170; a >= 10; a -= 10) {
      const [x, y] = onCircle(160, 62, 10, a);
      pts.push([x, Math.min(y, front)]);   // 気体の先より口側は気体の先の高さにそろえる
    }
    pts.push([170, Math.min(62, front)], [170, front]);
    return { type: 'polygon', points: pts.map(([x, y]) => [x, Y(y)]), fill, stroke: 'none' };
  }

  // ガラス管の先から気体が出て、試験管の奥から順にたまり、もとの空気が口から外へおし出される
  function displacement(dir) {
    const d = DISP[dir];
    const Y = dir === 'up' ? (y => y) : (y => 260 - y);
    const pipe = d.items[2].points;
    return function (t) {
      const push = 52 + DISP_PUSH * stage(t, 0, 0.85);   // 気体の先（口の外までふくめた、おし出す位置）
      const front = Math.min(DISP_FULL, push);            // 試験管の中の気体の先
      const items = [d.items[0]];
      if (front > 52.5) items.push(dispGasShape(front, Y, d.fill));
      DISP_GAS_DOTS.forEach(([x, y]) => {
        const k = clamp((front - (y + 3)) / 10, 0, 1);
        if (k > 0) items.push({ type: 'circle', x, y: Y(y), r: 3, fill: mix(d.fill, TOKEN_HEX[d.gas], k), stroke: 'none' });
      });
      items.push(d.items[1], d.items[2]);
      // ガラス管の中を流れる気体の粒（1 周に 2 回、3 つ）。管の先で試験管の気体に加わる。0.85 のあとは流れを止める
      for (let k = 0; k < 3; k++) {
        const s = 2 * t + k / 3;
        const start = (Math.floor(s) - k / 3) / 2;   // この粒が管の入口を出た時刻
        if (start + 0.5 > 0.86) continue;
        const q = along(pipe, frac(s));
        items.push({ type: 'circle', x: q.x, y: q.y, r: 3, fill: d.gas, stroke: 'none' });
      }
      // もとの空気の粒: 気体の先におされて口へ動き、口から外へ出て止まる（粒の間は 9 以上あけて重ならない）
      DISP_AIR.forEach(([x0, y0, x1, y1], k) => {
        const path = [[x0, y0], [x0, 152], [x1, y1]];
        const q = along(path, clamp(push + 5 + 9 * k - y0, 0, pathLen(path)) / pathLen(path));
        items.push({ type: 'circle', x: q.x, y: Y(q.y), r: 3, fill: 'white', stroke: 'line' });
      });
      return items.concat(d.after);
    };
  }

  // 石灰石にうすい塩酸を加えて出た二酸化炭素が導管を通り、石灰水の中で泡になり、石灰水が白くにごる（sub-4-c2）
  // 静止図は content/substance.js の sub-4-c2（石灰水の液面は y 215 − 90 × 0.6 = 161）
  const CO2_PIPE = [[60, 108], [60, 70], [210, 70], [210, 200]];
  // にごりの白い粒（出てくる順）。ガラス管（x 210）と泡の通り道（x 216）をよける
  const CO2_CLOUD = [[188, 170], [226, 170], [198, 182], [250, 170], [186, 188], [238, 180],
    [202, 196], [254, 190], [192, 204], [230, 196], [240, 192], [244, 206]];
  function suCo2Limewater(t) {
    const items = [{ type: 'tube', x: 60, y: 190, height: 90, level: 0.35 }];
    items.push(
      { type: 'rect', x: 46, y: 94, width: 28, height: 12, rx: 3, fill: 'gray', stroke: 'ink' },
      { type: 'polygon', points: [[52, 186], [60, 178], [68, 186], [62, 190]], fill: 'rock' },
    );
    // 石灰石から出る泡（液面 y 158.5 まで上がって消える）
    [0, 1].forEach(k => items.push({ type: 'circle', x: 56 + 8 * k, y: 176 - 15 * frac(2 * t + k / 2), r: 2.5, fill: 'white', stroke: 'line' }));
    items.push({ type: 'line', points: CO2_PIPE, width: 3 });
    // 導管の中を流れる二酸化炭素（1 周に 2 回、3 つ）
    for (let k = 0; k < 3; k++) {
      const q = along(CO2_PIPE, frac(2 * t + k / 3));
      items.push({ type: 'circle', x: q.x, y: q.y, r: 3, fill: 'white', stroke: 'line' });
    }
    items.push({ type: 'beaker', x: 220, y: 215, width: 80, height: 90, level: 0.6, liquid: 'glass' });
    // にごり: 白い粒（ふちなし。ふちのある泡と見分ける）が 1 つずつ、石灰水の色から白くなって出てくる
    CO2_CLOUD.forEach(([x, y], i) => {
      const f = stage(t, 0.15 + 0.05 * i, 0.3 + 0.05 * i);
      if (f > 0) items.push({ type: 'circle', x, y, r: 3.5, fill: mix(TOKEN_HEX.glass, TOKEN_HEX.white, f), stroke: 'none' });
    });
    // ガラス管の先から出る泡（液面まで上がって消える）
    for (let k = 0; k < 3; k++) {
      const q = along([[210, 201], [216, 195], [216, 164]], frac(2 * t + k / 3));
      items.push({ type: 'circle', x: q.x, y: q.y, r: 3, fill: 'white', stroke: 'line' });
    }
    items.push(
      { type: 'text', x: 4, y: 236, text: '石灰石＋うすい塩酸', size: 12 },
      { type: 'text', x: 228, y: 236, text: '石灰水が白くにごる', size: 12, anchor: 'middle' },
      { type: 'text', x: 110, y: 60, text: '二酸化炭素', size: 14 },
    );
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

  // 蒸留で出てきた液体を、試験管 3 本に順に集める（state-4-c2）。静止図は content/state-change.js の state-4-c2
  const DISTILL_X = [60, 160, 260];
  const DISTILL_NAMES = ['1 本目', '2 本目', '3 本目'];
  // 試験管 k に液がたまる区間（0.28 ごと。3 本目は 0.82 でたまり終わり、そのあとは 3 本とも静止図と同じ level 0.3）
  function distillFill(t, k) { return stage(t, 0.28 * k, 0.28 * k + 0.26); }
  // 試験管 k の液の level（1 てき目が着く f = 0.25 から増え、0.3 になる）
  // 少ない level では液面が試験管の丸い底からはみ出して描かれるので、1 てき目が着いたら 0.06 から始める
  function distillLevel(t, k) { const f = distillFill(t, k); return f < 0.25 ? 0 : 0.06 + 0.24 * stage(f, 0.25, 1); }
  function stDistillOrder(t) {
    const items = [];
    DISTILL_X.forEach((x, k) => items.push({ type: 'tube', x, y: 170, height: 90, level: distillLevel(t, k) }));
    DISTILL_X.forEach((x, k) => {
      const f = distillFill(t, k);
      if (!(f > 0 && f < 1)) return;
      // たまっている試験管の口の上でしずくができ（大きくなる）、液面まで落ちる。1 本に 4 てき
      const s = frac(4 * f);
      const surface = 170 - 90 * distillLevel(t, k) - 3;
      if (s < 0.4) items.push({ type: 'circle', x, y: 74, r: 1 + 2 * s / 0.4, fill: 'water', stroke: 'line' });
      else {
        const q = (s - 0.4) / 0.6;
        items.push({ type: 'circle', x, y: 74 + (surface - 74) * q * q, r: 3, fill: 'water', stroke: 'line' });
      }
    });
    DISTILL_X.forEach((x, k) => {
      const f = distillFill(t, k);
      items.push(Object.assign({ type: 'text', x, y: 66, text: DISTILL_NAMES[k], size: 14, anchor: 'middle', bold: true }, f > 0 && f < 1 ? { color: 'blue' } : {}));
    });
    items.push(
      { type: 'text', x: 60, y: 196, text: 'においが強い', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 196, text: '少しにおう', size: 12, anchor: 'middle' },
      { type: 'text', x: 260, y: 196, text: 'ほとんどない', size: 12, anchor: 'middle' },
      { type: 'text', x: 60, y: 214, text: 'よく燃える', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 214, text: '少し燃える', size: 12, anchor: 'middle' },
      { type: 'text', x: 260, y: 214, text: '燃えない', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 236, text: '沸点の低いエタノールが先に多く出る', size: 13, anchor: 'middle' },
      { type: 'arrow', x1: 90, y1: 40, x2: 230, y2: 40, color: 'gray', label: '集めた順' },
    );
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

  // ---- 飽和水溶液（sol-3-c1） ----
  // ビーカー（底の中央 (140, 200)、幅 130・高さ 130、level 0.7 → 水面 y 109）。静止図は content/solution.js の sol-3-c1
  const SAT_PILE = [[100, 196], [112, 186], [126, 190], [136, 184], [150, 190], [164, 185], [178, 196]];   // とけ残り（静止図）
  const SAT_SURFACE = 109;
  const SAT_SPOON = [150, 60];   // 薬さじの先（結晶はここから落ちる）
  // 結晶 i（0〜10）を落とす時刻（0.07 ごと）。はじめの 6 つ（0.02〜0.37）はとけ、とけた粒が広がり終わってから落とす
  // あとの 5 つ（0.58〜0.86）は底にたまる（とける結晶の粒が広がっているあいだに、とけない結晶がしずんでこないように）
  function satDrop(i) { return i < SAT_DISSOLVE ? 0.02 + 0.07 * i : 0.58 + 0.07 * (i - SAT_DISSOLVE); }
  const SAT_DISSOLVE = 6;
  const SAT_AIR = 0.025, SAT_SINK = 0.05, SAT_MERGE = 0.04;   // 空気中を落ちる・水の中をしずむ・山に加わる時間
  // とける結晶は薬さじの真下（x 150）でしずみながら小さくなり、(150, 135) でとけきって粒 2 つになる
  const SAT_GONE = [SAT_SPOON[0], SAT_SURFACE + 26];
  // とけた粒の止まる所。とけきった所から、粒ごとにちがう向き（度、画面の下向きが正）に距離 d だけ進む。
  // 向きがみなちがうので、あとから広がる粒が先に止まった粒の上を通らない。真上の −135〜−45° は結晶がしずんでくる道、
  // 真下の 55〜125° のあいだは、とけない結晶が底へしずむ道なのであける。2 つずつ（左へ行く粒・右へ行く粒）が 1 つの結晶から出る
  // 距離を変えて、水の中に散らばって見えるようにする（近い向きの粒どうしは、あとの粒が通るときも 5 以上はなれる）
  const SAT_RAYS = [[-150, 40], [-30, 40], [-165, 26], [-15, 26], [180, 48], [0, 48],
    [155, 30], [25, 30], [140, 48], [40, 48], [125, 40], [55, 40]];
  const SAT_DOTS = SAT_RAYS.map(([a, d]) => [SAT_GONE[0] + d * Math.cos(deg(a)), SAT_GONE[1] + d * Math.sin(deg(a))]);
  // とけない結晶（6〜10 番目）が、とけ残りの山の上でたまる x（薬さじの真下の近く）
  const SAT_PILE_X = [138, 150, 162, 144, 156];
  function satCrystal(x, y, k) {
    return { type: 'polygon', points: [[x, y - 5 * k], [x + 4 * k, y], [x, y + 5 * k], [x - 4 * k, y]], fill: 'white' };
  }
  // とけ残りの山の高さの割合（0〜1）。とけない結晶が 1 つ着くごとに 1/5 ずつ大きくなる
  function satPileK(t) {
    let k = 0;
    for (let i = SAT_DISSOLVE; i <= 10; i++) {
      const land = satDrop(i) + SAT_AIR + SAT_SINK;
      k += stage(t, land, land + SAT_MERGE) / (11 - SAT_DISSOLVE);
    }
    return k;
  }
  // 山の上の面の y（x の位置。山の外は底 196）
  function satPileTop(x, k) {
    for (let i = 1; i < SAT_PILE.length; i++) {
      const [x0, y0] = SAT_PILE[i - 1], [x1, y1] = SAT_PILE[i];
      if (x >= x0 && x <= x1) return 196 - (196 - lerp(y0, y1, (x - x0) / (x1 - x0))) * k;
    }
    return 196;
  }

  // 結晶を 1 つずつ加えると、はじめはとけて粒が増え、やがてとけきれなくなって底にたまる（sol-3-c1）
  function slSaturate(t) {
    const saturated = t >= satDrop(SAT_DISSOLVE) + SAT_AIR + SAT_SINK;   // とけない結晶がはじめて底に着いたあと
    const pileK = satPileK(t);
    const items = [{ type: 'beaker', x: 140, y: 200, width: 130, height: 130, level: 0.7 }];
    if (pileK > 0.01) items.push({ type: 'polygon', points: SAT_PILE.map(([x, y]) => [x, 196 - (196 - y) * pileK]), fill: 'white' });
    // とけた粒（結晶が消えた所から水の中へ広がる）
    for (let i = 0; i < SAT_DISSOLVE; i++) {
      const gone = satDrop(i) + SAT_AIR + SAT_SINK;   // 結晶がとけきる時刻
      const e = ease(stage(t, gone, gone + 0.12));
      if (!(t >= gone)) continue;
      [0, 1].forEach(h => {
        const j = 2 * i + h;
        const [rx, ry] = SAT_DOTS[j];
        const sx = 1.5 * osc(t, 3, j / 12) * e, sy = 1.5 * osc(t, 3, j / 12 + 0.25) * e;
        // 結晶が消えた所の左右（3 ずつ）から出る
        items.push({ type: 'circle', x: lerp(SAT_GONE[0] + (h ? 3 : -3), rx, e) + sx, y: lerp(SAT_GONE[1], ry, e) + sy, r: 2.5, fill: 'purple', stroke: 'none' });
      });
    }
    // 落ちている結晶
    for (let i = 0; i <= 10; i++) {
      const d0 = satDrop(i);
      if (t < d0) continue;
      const a = stage(t, d0, d0 + SAT_AIR);                  // 空気中（薬さじの先 → 水面）
      const w = stage(t, d0 + SAT_AIR, d0 + SAT_AIR + SAT_SINK);   // 水の中
      let x, y, k = 1;
      if (a < 1) {
        x = SAT_SPOON[0]; y = SAT_SPOON[1] + 5 + (SAT_SURFACE - SAT_SPOON[1] - 5) * a * a;
      } else if (i < SAT_DISSOLVE) {
        if (w >= 1) continue;   // とけきった
        x = SAT_GONE[0]; y = lerp(SAT_SURFACE, SAT_GONE[1], w); k = 1 - w;   // しずみながら小さくなる
      } else {
        const m = stage(t, d0 + SAT_AIR + SAT_SINK, d0 + SAT_AIR + SAT_SINK + SAT_MERGE);   // 山に加わる
        if (m >= 1) continue;
        const px = SAT_PILE_X[i - SAT_DISSOLVE];
        x = lerp(SAT_SPOON[0], px, ease(w));
        y = lerp(SAT_SURFACE, satPileTop(px, satPileK(d0 + SAT_AIR + SAT_SINK)) - 4, w);
        k = 1 - m;
      }
      if (k > 0.05) items.push(satCrystal(x, y, k));
    }
    // 薬さじ
    items.push(
      { type: 'line', points: [[206, 48], [SAT_SPOON[0] + 6, SAT_SPOON[1] - 1]], color: 'gray', width: 4 },
      { type: 'ellipse', x: SAT_SPOON[0], y: SAT_SPOON[1], rx: 8, ry: 3, fill: 'gray', stroke: 'none' },
    );
    if (saturated) {
      items.push(
        { type: 'arrow', x1: 236, y1: 178, x2: 186, y2: 190, color: 'gray' },
        { type: 'text', x: 240, y: 172, text: 'とけ残り', size: 14 },
        { type: 'arrow', x1: 236, y1: 118, x2: 196, y2: 128, color: 'gray' },
        { type: 'text', x: 240, y: 112, text: '飽和水溶液', size: 14 },
      );
    }
    items.push(
      { type: 'text', x: 140, y: 36, text: saturated ? 'もうこれ以上とけない' : 'まだとける', size: 14, anchor: 'middle' },
      { type: 'text', x: 140, y: 228, text: '水 100 g', size: 13, anchor: 'middle' },
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

  // 反応後の容器の中で二酸化炭素の泡が上がって上の空間にたまっても、はかりの値は変わらない（chem-4-c1）
  // 静止図は content/chemical-change.js の chem-4-c1。泡 j は 0.08 + 0.1j に液の中から出て、0.1 で止まる所に着く。
  // 上にある所から順にたまるので、上がっていく泡が先にたまった泡の前を通らない。0.99 で 4・3 番目は静止図の泡 (250,88)・(230,100)
  const MASS_BUBBLES = [[262, 76], [224, 78], [250, 88], [230, 100], [258, 106], [242, 112]];
  const MASS_REST = 0.99;
  function chMassConservation(t) {
    const items = [
      { type: 'text', x: 80, y: 40, text: '反応前', size: 14, anchor: 'middle', bold: true },
      { type: 'text', x: 240, y: 40, text: '反応後', size: 14, anchor: 'middle', bold: true },
      { type: 'rect', x: 66, y: 52, width: 28, height: 12, rx: 3, fill: 'gray' },
      { type: 'rect', x: 50, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
      { type: 'rect', x: 52, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
      { type: 'rect', x: 35, y: 162, width: 90, height: 28, fill: 'glass', label: '80.0 g' },
      { type: 'arrow', x1: 138, y1: 112, x2: 182, y2: 112, color: 'gray' },
      { type: 'rect', x: 226, y: 52, width: 28, height: 12, rx: 3, fill: 'gray' },
      { type: 'rect', x: 210, y: 64, width: 60, height: 96, rx: 8, fill: 'none' },
      { type: 'rect', x: 212, y: 120, width: 56, height: 38, fill: 'water', stroke: 'none' },
    ];
    MASS_BUBBLES.forEach(([sx, sy], j) => {
      const start = 0.08 + 0.1 * j;
      if (t < start) return;
      // たまったあとは上の空間でゆっくり動く（0.99 でずれ 0）
      const ph = j / 6;
      const ex = sx + 2 * (osc(t, 1, ph) - osc(MASS_REST, 1, ph));
      const ey = sy + 1.5 * (osc(t, 1, ph + 0.25) - osc(MASS_REST, 1, ph + 0.25));
      const s = stage(t, start, start + 0.1);
      const q = along([[sx, 154], [sx, 120], [ex, ey]], s);
      items.push({ type: 'circle', x: q.x, y: q.y, r: 2 + 2 * Math.min(1, 4 * s), fill: 'white', stroke: 'line' });
    });
    items.push(
      { type: 'rect', x: 195, y: 162, width: 90, height: 28, fill: 'glass', label: '80.0 g' },
      { type: 'text', x: 160, y: 226, text: '原子の種類と数は変わらない', size: 13, anchor: 'middle' },
    );
    if (t >= 0.7) items.push({ type: 'text', x: 240, y: 206, text: '変わらない', size: 12, anchor: 'middle', color: 'blue', bold: true });
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

  // 塩酸 10 cm³ に水酸化ナトリウム水溶液を加えていったときのイオンの数（ion-4-c4）。静止図は content/ion.js の ion-4-c4。
  // 加えた量のカーソルが 0 → 20 cm³（x 60 → 290）へ動き、中性（x 175）で少し止まる。左上の小さなビーカーで BTB 溶液の色
  const BTB_YELLOW = '#FFE27A', BTB_GREEN = '#7CCB8E', BTB_BLUE = '#7FA8F5';
  function ionCountX(t) {
    return t < 0.35 ? lerp(60, 175, ease(stage(t, 0, 0.35))) : lerp(175, 290, ease(stage(t, 0.55, 0.88)));
  }
  // x の位置のイオンの数の線の y（静止図の 4 本の折れ線と同じ）
  function ionCountYs(x) {
    const acid = x <= 175;
    return {
      Na: 200 - 160 * (x - 60) / 230,
      Cl: 120,
      H: acid ? 120 + 80 * (x - 60) / 115 : 200,
      OH: acid ? 200 : 200 - 80 * (x - 175) / 115,
    };
  }
  // 交点の丸の位置。数が同じイオンの丸（中性での Na+ と Cl-、H+ と OH- など）は同じ所に重なるので、重なるときは
  // それぞれの線に沿って左右に少しずつずらし、中心の間を ION_DOT_GAP 以上あける（丸は半径 4。線の上からは出ない）
  const ION_ORDER = ['OH', 'H', 'Na', 'Cl'];   // 描く順
  const ION_DOT_GAP = 9;
  function ionCountDots(x) {
    const px = { OH: x, H: x, Na: x, Cl: x };
    const pos = k => [px[k], ionCountYs(px[k])[k]];
    for (let i = 0; i < ION_ORDER.length; i++) {
      for (let j = i + 1; j < ION_ORDER.length; j++) {
        const a = ION_ORDER[i], b = ION_ORDER[j];
        const a0 = px[a], b0 = px[b];
        for (let s = 0; s <= 12; s += 0.25) {
          let la = a0 - s, lb = b0 + s;
          if (la < 60) { lb += 60 - la; la = 60; }
          if (lb > 290) { la -= lb - 290; lb = 290; }
          px[a] = la; px[b] = lb;
          const [ax, ay] = pos(a), [bx, by] = pos(b);
          if (Math.hypot(ax - bx, ay - by) >= ION_DOT_GAP) break;
        }
      }
    }
    const out = {};
    ION_ORDER.forEach(k => { const [dx, dy] = pos(k); out[k] = { x: dx, y: dy }; });
    return out;
  }
  function ioIonCount(t) {
    const x = ionCountX(t);
    const ys = ionCountYs(x);
    // カーソル（いちばん上の交点の少し上まで。左上のビーカーと文字にかからない）。線と文字の下に描く
    const top = Math.min(ys.Na, ys.Cl, ys.H, ys.OH) - 10;
    const items = [
      { type: 'line', points: [[175, 200], [175, 40]], color: 'gray', width: 2, dashed: true },
      { type: 'text', x: 175, y: 32, text: '中性', size: 12, anchor: 'middle' },
      { type: 'line', points: [[x, 200], [x, top]], color: 'blue', width: 2, dashed: true },
      { type: 'line', points: [[60, 30], [60, 200], [300, 200]], width: 2 },
      { type: 'text', x: 8, y: 20, text: 'イオンの数', size: 12 },
      { type: 'text', x: 54, y: 218, text: '0', size: 12, anchor: 'end' },
      { type: 'text', x: 175, y: 218, text: '10', size: 12, anchor: 'middle' },
      { type: 'text', x: 290, y: 218, text: '20', size: 12, anchor: 'middle' },
      { type: 'text', x: 312, y: 236, text: '加えた水酸化ナトリウム水溶液〔cm³〕', size: 12, anchor: 'end' },
      { type: 'line', points: [[60, 120], [290, 120]], color: 'green', width: 3 },
      { type: 'line', points: [[60, 200], [290, 40]], color: 'orange', width: 3 },
      { type: 'line', points: [[60, 120], [175, 200], [290, 200]], color: 'blue', width: 3 },
      { type: 'line', points: [[175, 200], [290, 120]], color: 'purple', width: 3 },
    ];
    // 交点（線と同じ色。白いふち）。重なるときは線に沿って少しずらす
    const dots = ionCountDots(x);
    [['OH', 'purple'], ['H', 'blue'], ['Na', 'orange'], ['Cl', 'green']].forEach(([k, c]) => {
      items.push({ type: 'circle', x: dots[k].x, y: dots[k].y, r: 4, fill: c, stroke: 'white' });
    });
    items.push(
      { type: 'text', x: 284, y: 34, text: 'Na+', size: 13, anchor: 'end', color: 'orange' },
      { type: 'text', x: 232, y: 114, text: 'Cl-', size: 13, color: 'green' },
      { type: 'text', x: 64, y: 160, text: 'H+', size: 13, color: 'blue' },
      { type: 'text', x: 258, y: 172, text: 'OH-', size: 13, color: 'purple' },
    );
    // BTB 溶液の色（中性の前後で少しずつ変わる）と文字
    const color = x <= 175 ? mix(BTB_YELLOW, BTB_GREEN, stage(x, 163, 175)) : mix(BTB_GREEN, BTB_BLUE, stage(x, 175, 187));
    const name = x < 171 ? '黄色（酸性）' : x <= 179 ? '緑色（中性）' : '青色（アルカリ性）';
    items.push(
      { type: 'beaker', x: 118, y: 84, width: 40, height: 40, level: 0.6, liquid: color },
      { type: 'text', x: 118, y: 104, text: name, size: 12, anchor: 'middle', bold: true },
      { type: 'text', x: 8, y: 236, text: 'いま ' + Math.round((x - 60) / 11.5) + ' cm³', size: 12, color: 'blue', bold: true },
    );
    return items;
  }

  // ================================================================
  // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md の「動く図（新規）」の化学の 10 本
  // ================================================================

  // 文字（静止図の text と同じ形）
  function mtext(x, y, s, size, extra) { return Object.assign({ type: 'text', x, y, text: s, size }, extra || {}); }
  // 逆さに立てた試験管（底の中央 (cx, by)、tilt 180、口は y mouth）の中の水。top は水面の y。
  // tubeWater と同じ作り（内側の半径 11、丸い底の中心は (cx, by + 12)）
  function invTubeWater(cx, by, mouth, top) {
    const cy = by + 12;
    const pts = [[cx - 11, mouth]];
    if (top >= cy) {
      pts.push([cx - 11, top], [cx + 11, top]);
    } else {
      pts.push([cx - 11, cy]);
      for (let a = 170; a >= 10; a -= 10) {
        const [x, y] = onCircle(cx, cy, 11, a);
        pts.push([x, Math.max(y, top)]);
      }
      pts.push([cx + 11, cy]);
    }
    pts.push([cx + 11, mouth]);
    return { type: 'polygon', points: pts, fill: 'water', stroke: 'none' };
  }
  // ガラス管の中を流れる気体の粒（1 周に 2 回、3 つ）。from〜to の間だけ流す
  function pipeDots(pipe, t, from, to, fill) {
    const out = [];
    if (t <= from || t >= to) return out;
    for (let k = 0; k < 3; k++) {
      const q = along(pipe, frac(2 * t + k / 3));
      out.push({ type: 'circle', x: q.x, y: q.y, r: 3, fill, stroke: 'none' });
    }
    return out;
  }

  // ---- 身のまわりの物質（substance）----

  // 3 つの集め方で同時に気体を集める。ア（水上置換）は試験管の水がおし出され、イ（上方置換）は上から、
  // ウ（下方置換）は底から気体がたまる（substance-mp4-c1）。t = 0 は静止図と同じ（気体の粒なし）。
  // たまった粒の色の出し方は displacement() と同じ（気体の先が通りすぎると、うすい色から濃くなる）
  const THREE_UP = [0, 1, 2, 3, 4, 5, 6, 7].map(j => [j % 2 ? 167 : 153, 37 + 10 * j]);    // イの試験管（x 149〜171、底 y 30）
  const THREE_DOWN = [0, 1, 2, 3, 4, 5, 6, 7].map(j => [j % 2 ? 272 : 258, 183 - 10 * j]); // ウの試験管（x 254〜276、底 y 190）
  function suThreeMethods(t) {
    const p = stage(t, 0, 0.85);
    const on = t > 0.02 && p < 1;   // 気体が出ている間
    const top = 61 + 70 * p;        // アの試験管の水面
    const items = [
      { type: 'rect', x: 15, y: 110, width: 80, height: 80, fill: 'none' },
      { type: 'rect', x: 17, y: 125, width: 76, height: 63, fill: 'water', stroke: 'none' },
      invTubeWater(55, 60, 150, top),
      { type: 'tube', x: 55, y: 60, height: 90, tilt: 180, level: 0 },
      { type: 'line', points: [[25, 95], [25, 180], [55, 180], [55, 158]], width: 3 },
    ];
    if (on) {
      [0, 0.5].forEach(ph => items.push({ type: 'circle', x: 55, y: 158 - (158 - top) * frac(3 * t + ph), r: 3, fill: 'white', stroke: 'line' }));
    }
    const upFront = 32 + 80 * p, downFront = 188 - 80 * p;
    THREE_UP.forEach(([x, y]) => {
      const k = clamp((upFront - (y + 3)) / 10, 0, 1);
      if (k > 0) items.push({ type: 'circle', x, y, r: 3, fill: mix('#E9DDF8', TOKEN_HEX.purple, k), stroke: 'none' });
    });
    THREE_DOWN.forEach(([x, y]) => {
      const k = clamp(((y - 3) - downFront) / 10, 0, 1);
      if (k > 0) items.push({ type: 'circle', x, y, r: 3, fill: mix(TOKEN_HEX.glass, TOKEN_HEX.gray, k), stroke: 'none' });
    });
    items.push(
      { type: 'tube', x: 160, y: 30, height: 90, tilt: 180, level: 0 },
      { type: 'line', points: [[160, 190], [160, 45]], width: 3 },
      ...pipeDots([[160, 190], [160, 45]], t, 0.02, 0.86, 'purple'),
      { type: 'tube', x: 265, y: 190, height: 90, level: 0 },
      { type: 'line', points: [[265, 30], [265, 180]], width: 3 },
      ...pipeDots([[265, 30], [265, 180]], t, 0.02, 0.86, 'gray'),
      { type: 'text', x: 55, y: 222, text: 'ア', size: 16, anchor: 'middle', bold: true },
      { type: 'text', x: 160, y: 222, text: 'イ', size: 16, anchor: 'middle', bold: true },
      { type: 'text', x: 265, y: 222, text: 'ウ', size: 16, anchor: 'middle', bold: true },
    );
    return items;
  }

  // 水上置換法の手順: はじめの泡（空気まじり）は試験管の外で逃がし、試験管をガラス管の上にもどして気体をため、
  // 試験管を横へ動かして水の中でゴム栓をする（substance-mp4-c3）。t = 0 は静止図と同じ（水で満たした試験管）
  function discardTubeX(t) {
    if (t < 0.1) return 180 + 50 * ease(stage(t, 0, 0.1));    // 横へよける
    if (t < 0.36) return 230;
    if (t < 0.46) return 230 - 50 * ease(stage(t, 0.36, 0.46)); // ガラス管の上へもどす
    if (t < 0.76) return 180;
    return 180 + 40 * ease(stage(t, 0.76, 0.84));              // 集め終わったら横へ
  }
  function suDiscardFirst(t) {
    const tx = discardTubeX(t);
    const top = 51 + 100 * stage(t, 0.48, 0.74);   // 試験管の中の水面（底 y 50、口 y 160）
    const items = [
      { type: 'rect', x: 60, y: 110, width: 200, height: 100, fill: 'none' },
      { type: 'rect', x: 62, y: 128, width: 196, height: 80, fill: 'water', stroke: 'none' },
      invTubeWater(tx, 50, 160, top),
      { type: 'tube', x: tx, y: 50, height: 110, tilt: 180, level: 0 },
      { type: 'line', points: [[20, 80], [100, 80], [100, 190], [180, 190], [180, 166]], width: 3 },
    ];
    // はじめの泡: 白と灰色のまだら（空気まじり）。試験管の外で水面へ上がって消える
    if (t > 0.12 && t < 0.36) {
      [0, 1, 2].forEach(i => items.push({ type: 'circle', x: 180 + 3 * osc(t, 6, i / 3), y: 166 - 38 * frac(4 * t + i / 3), r: 4,
        fill: i % 2 ? 'gray' : 'white', stroke: 'line' }));
    }
    // 集める泡: 試験管の中の水面まで上がる
    if (t > 0.48 && t < 0.74) {
      [0, 1, 2].forEach(i => items.push({ type: 'circle', x: 180, y: 166 - (166 - top) * frac(3 * t + i / 3), r: 4, fill: 'white', stroke: 'line' }));
    }
    // ゴム栓（水の中で、下から口に入る）
    if (t >= 0.86) items.push({ type: 'rect', x: tx - 10, y: lerp(172, 154, ease(stage(t, 0.86, 0.92))), width: 20, height: 12, fill: 'gray' });
    items.push(
      { type: 'text', x: 200, y: 40, text: '水を満たして逆さに', size: 13 },
      { type: 'text', x: 20, y: 232, text: 'はじめの気体は集めない', size: 13 },
    );
    const step = t >= 0.1 && t < 0.38 ? '① はじめの泡は逃がす' : t >= 0.46 && t < 0.76 ? '② 試験管に気体をためる'
      : t >= 0.84 ? '③ 水の中でゴム栓をする' : null;
    if (step) items.push(mtext(20, 30, step, 13, { color: 'blue', bold: true }));
    return items;
  }

  // アンモニアを満たしたフラスコにスポイトの水を入れると、アンモニアがとけて粒が減り、ビーカーの水が吸い上げられて
  // 赤い噴水になる（substance-mp5-c2）。止まった絵（0.99）は静止図と同じ噴水
  const NH3_DOTS = [[132, 52], [186, 52], [124, 78], [196, 78], [138, 100], [182, 100], [148, 30], [172, 30], [140, 76], [180, 76]];
  const FOUNTAIN = [[[160, 76], [140, 50]], [[160, 76], [180, 50]], [[160, 76], [160, 42]]];
  function suAmmoniaFountain(t) {
    const n = Math.round(NH3_DOTS.length * (1 - stage(t, 0.2, 0.45)));   // 残っているアンモニアの粒
    const rise = stage(t, 0.42, 0.6);       // ビーカーの水がガラス管を上がる
    const f = stage(t, 0.6, 0.85);          // 噴水が伸びる
    const items = [
      { type: 'circle', x: 160, y: 70, r: 50, fill: 'white' },
    ];
    NH3_DOTS.slice(0, n).forEach(([x, y], i) => {
      items.push({ type: 'circle', x: x + 2 * osc(t, 3, i * 0.37), y: y + 2 * osc(t, 2, i * 0.21), r: 3, fill: 'lightgreen', stroke: 'green' });
    });
    if (t >= 0.08 && t < 0.2) items.push({ type: 'circle', x: 150, y: lerp(24, 70, stage(t, 0.08, 0.2)), r: 3, fill: 'water', stroke: 'blue' });
    items.push({ type: 'line', points: [[160, 76], [160, 196]], width: 3 });
    if (rise > 0) items.push({ type: 'line', points: [[160, 193], [160, lerp(193, 76, rise)]], color: 'blue', width: 2 });
    FOUNTAIN.forEach(line => {
      const ps = partial(line, f);
      if (ps.length >= 2) items.push({ type: 'line', points: ps, color: 'red', width: 3 });
    });
    if (f >= 1) {
      [[136, 44], [184, 44], [160, 34]].forEach(([x, y]) => items.push({ type: 'circle', x, y, r: 4, fill: 'red', stroke: 'red' }));
    }
    items.push(
      { type: 'beaker', x: 160, y: 228, width: 110, height: 50, level: 0.7 },
      { type: 'text', x: 220, y: 40, text: 'アンモニア', size: 13 },
      { type: 'text', x: 220, y: 110, text: '赤い噴水', size: 13 },
      { type: 'text', x: 10, y: 200, text: 'フェノール', size: 12 },
      { type: 'text', x: 10, y: 216, text: 'フタレイン入りの水', size: 12 },
    );
    if (t >= 0.05 && t < 0.3) items.push(mtext(20, 30, 'スポイトの水を入れる', 12, { color: 'blue', bold: true }));
    return items;
  }

  // ---- 水溶液（solution）----

  // 水の粒（青）はろ紙の穴を通りぬけて上から下へ流れ、泥の粒（茶色）は穴を通れずろ紙の上に残る（solution-mp1-c3）。
  // 水の粒は穴の真上・真下を通る（x 80・160・240）。t = 0 は静止図と同じ位置で、1 周で 1 回入れ直してつながる
  const FILTER_TOP = 58, FILTER_BOTTOM = 184;
  const FILTER_WATER = [[80, 150], [160, 160], [240, 146]];
  function slFilterPass(t) {
    const items = [
      { type: 'line', points: [[20, 120], [70, 120]], color: 'brown', width: 6 },
      { type: 'line', points: [[90, 120], [150, 120]], color: 'brown', width: 6 },
      { type: 'line', points: [[170, 120], [230, 120]], color: 'brown', width: 6 },
      { type: 'line', points: [[250, 120], [300, 120]], color: 'brown', width: 6 },
      // 泥の粒はろ紙の上で少しゆれるだけ（通りぬけない）
      { type: 'circle', x: 110 + 1.5 * osc(t, 4), y: 96, r: 16, fill: 'brown' },
      { type: 'circle', x: 200 - 1.5 * osc(t, 4), y: 98, r: 14, fill: 'brown' },
    ];
    FILTER_WATER.forEach(([x, y0]) => {
      items.push({ type: 'circle', x, y: wrapY(y0 + (FILTER_BOTTOM - FILTER_TOP) * t), r: 4, fill: 'blue', stroke: 'none' });
    });
    items.push(
      { type: 'text', x: 160, y: 50, text: '泥の粒は穴を通れない', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 200, text: '水の粒は穴を通りぬける', size: 13, anchor: 'middle' },
      { type: 'text', x: 316, y: 114, text: 'ろ紙', size: 12, anchor: 'end' },
    );
    return items;
  }
  function wrapY(y) { return FILTER_TOP + frac((y - FILTER_TOP) / (FILTER_BOTTOM - FILTER_TOP)) * (FILTER_BOTTOM - FILTER_TOP); }

  // 温度のカーソルが 70 ℃ から 20 ℃ へ動く。溶解度が 50 g を下回る 30〜40 ℃ の間に橙の帯が伸び、結晶が出はじめる（solution-mp4-c1）。
  // 目盛りは content/solution.js の solution-mp4-c1 と同じ（20 ℃ が x 40、10 ℃ ごとに 48px）
  const CRYSTAL_SOL = [[20, 32], [30, 46], [40, 64], [50, 85], [60, 110], [70, 138]];   // 硝酸カリウムの溶解度〔g〕
  function crystalSol(T) {
    for (let i = 1; i < CRYSTAL_SOL.length; i++) {
      if (T <= CRYSTAL_SOL[i][0]) return lerp(CRYSTAL_SOL[i - 1][1], CRYSTAL_SOL[i][1], (T - CRYSTAL_SOL[i - 1][0]) / 10);
    }
    return CRYSTAL_SOL[CRYSTAL_SOL.length - 1][1];
  }
  function crystalCursorX(t) { return 280 - 240 * ease(stage(t, 0, 0.8)); }
  const CRYSTAL_CURSOR_SEGS = [[72, 85], [105, 133], [151, 160]];
  function slCrystalStart(t) {
    const x = crystalCursorX(t);
    const T = 20 + (x - 40) / 4.8;
    const crystal = crystalSol(T) < 50;
    const items = [
      { type: 'text', x: 160, y: 30, text: '硝酸カリウム 50 g をとかした水溶液', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 62, text: '上の数: 水 100 g にとける質量〔g〕', size: 12, anchor: 'middle' },
      { type: 'line', points: [[24, 120], [300, 120]], width: 2, arrow: true },
      { type: 'text', x: 306, y: 146, text: '℃', size: 12, anchor: 'end' },
    ];
    CRYSTAL_SOL.forEach(([temp, g], i) => {
      const gx = 40 + 48 * i;
      items.push(
        { type: 'line', points: [[gx, 112], [gx, 128]], width: 2 },
        { type: 'text', x: gx, y: 146, text: String(temp), size: 12, anchor: 'middle' },
        { type: 'text', x: gx, y: 100, text: String(g), size: 13, anchor: 'middle', bold: true },
      );
    });
    // 帯は 40 ℃（x 136）から左へ、カーソルについて 30 ℃（x 88）まで伸びる
    if (x < 136) items.push({ type: 'line', points: [[Math.max(88, x), 168], [136, 168]], color: 'orange', width: 8 });
    if (crystal) items.push({ type: 'text', x: 112, y: 196, text: 'ここで結晶が出はじめる', size: 13, anchor: 'middle', bold: true });
    // カーソルの点線（y 72〜160）は、溶解度の数の行（y 100）と温度の数の行（y 146）でとぎれさせる（数字をつらぬかない）
    CRYSTAL_CURSOR_SEGS.forEach(([y1, y2]) => items.push({ type: 'line', points: [[x, y1], [x, y2]], color: 'blue', width: 2, dashed: true }));
    items.push(
      { type: 'circle', x, y: 120, r: 4, fill: 'blue', stroke: 'none' },
      mtext(160, 228, 'いま ' + Math.round(T) + ' ℃: ' + (crystal ? '結晶が出る' : 'とけたまま'), 12,
        { anchor: 'middle', color: crystal ? 'orange' : 'blue', bold: true }),
    );
    return items;
  }

  // ---- 状態変化（state-change）----

  // 状態の印（小さな丸）が矢印に沿って進み、着いた箱を矢印の色の枠で囲む。固体 → 液体 → 気体（加熱）、
  // 液体 → 固体（冷やす）、最後に固体 → 気体（ドライアイス）（state-change-mp1-c1）。t = 0 はどの箱も囲まない（静止図）
  const STATE_BOXES = [[20, 150], [220, 150], [120, 30]];   // 固体・液体・気体
  const STATE_TRIPS = [
    { from: [104, 162], to: [216, 162], color: 'orange', box: 1, note: ['とける', 160, 154, 'middle'] },
    { from: [252, 146], to: [198, 76], color: 'orange', box: 2, note: ['気体になる', 236, 104, 'start'] },
    { from: [216, 182], to: [104, 182], color: 'blue', box: 0, note: ['固まる', 160, 200, 'middle'] },
    { from: [70, 146], to: [124, 76], color: 'orange', box: 2, note: ['ドライアイス', 14, 100, 'start'] },
  ];
  const TRIP_START = 0.04, TRIP_GAP = 0.24, TRIP_MOVE = 0.14, TRIP_SHOW = 0.06;
  function stStateArrows(t) {
    const items = [
      { type: 'rect', x: 20, y: 150, width: 80, height: 40, fill: 'white', label: '固体' },
      { type: 'rect', x: 220, y: 150, width: 80, height: 40, fill: 'white', label: '液体' },
      { type: 'rect', x: 120, y: 30, width: 80, height: 40, fill: 'white', label: '気体' },
      { type: 'arrow', x1: 104, y1: 162, x2: 216, y2: 162, color: 'orange' },
      { type: 'arrow', x1: 216, y1: 182, x2: 104, y2: 182, color: 'blue' },
      { type: 'arrow', x1: 252, y1: 146, x2: 198, y2: 76, color: 'orange' },
      { type: 'arrow', x1: 70, y1: 146, x2: 124, y2: 76, color: 'orange' },
      { type: 'text', x: 160, y: 218, text: 'オレンジ: 加熱　青: 冷やす', size: 13, anchor: 'middle' },
    ];
    STATE_TRIPS.forEach((trip, i) => {
      const s = TRIP_START + TRIP_GAP * i;
      if (t < s || t >= s + TRIP_MOVE + TRIP_SHOW) return;
      const k = stage(t, s, s + TRIP_MOVE);
      if (k >= 1) {
        const [bx, by] = STATE_BOXES[trip.box];
        items.push({ type: 'rect', x: bx - 4, y: by - 4, width: 88, height: 48, fill: 'none', stroke: trip.color });
      } else {
        items.push({ type: 'circle', x: lerp(trip.from[0], trip.to[0], k), y: lerp(trip.from[1], trip.to[1], k), r: 5, fill: trip.color, stroke: trip.color });
      }
      const [s0, nx, ny, anchor] = trip.note;
      items.push(mtext(nx, ny, s0, 12, { anchor, color: trip.color, bold: true }));
    });
    return items;
  }

  // 折れ線 HEAT_CURVE の上で、先から全長の割合 k の所までに通った長さ
  function heatLen(k) { return k * pathLen(HEAT_CURVE); }
  const HEAT_MELT = Math.hypot(30, 22) + 4;                          // 1 つ目の横ばい（とけている間）に入った長さ
  const HEAT_BOIL = Math.hypot(30, 22) + 50 + Math.hypot(70, 110) + 4; // 2 つ目の横ばい（沸騰している間）に入った長さ
  // st-heating-curve と同じグラフで、横ばいの区間に入ると「融点」「沸点」が出る（state-change-mp2-c1）
  function stMeltBoil(t) {
    const k = stage(t, 0, 0.85);
    const tip = along(HEAT_CURVE, k);
    const items = heatGraphItems().filter(it => !(it.type === 'line' && it.color === 'blue'));
    const ps = partial(HEAT_CURVE, k);
    if (ps.length >= 2) items.push({ type: 'line', points: ps, color: 'blue', width: 3 });
    items.push({ type: 'circle', x: tip.x, y: tip.y, r: 4, fill: 'blue', stroke: 'none' });
    if (heatLen(k) >= HEAT_MELT) items.push({ type: 'text', x: 105, y: 150, text: '融点', size: 13, anchor: 'middle', bold: true });
    if (heatLen(k) >= HEAT_BOIL) items.push({ type: 'text', x: 245, y: 42, text: '沸点', size: 13, anchor: 'middle', bold: true });
    return items;
  }

  // エタノール（青）と、水とエタノールの混合物（橙）を加熱したときの温度の線が同時に伸びる。3 分（x 140）から先で、
  // 青は横ばい・橙は少しずつ上がる（state-change-mp3-c1）。線は content/state-change.js の state-change-mp3-c1 と同じ点
  const ETHANOL_LINE = [[50, 215.2], [80, 184.6], [110, 154], [140, 121.6], [170, 121.6], [200, 121.6], [230, 121.6], [260, 121.6], [290, 121.6]];
  const MIXTURE_LINE = [[50, 215.2], [80, 184.6], [110, 154], [140, 121.6], [170, 119.8], [200, 118], [230, 114.4], [260, 112.6], [290, 110.8]];
  function stMixtureCurve(t) {
    const k = stage(t, 0, 0.85);
    const items = [
      { type: 'line', points: [[50, 76], [50, 226], [298, 226]], width: 2 },
      { type: 'text', x: 44, y: 86, text: '100', size: 12, anchor: 'end' },
      { type: 'text', x: 44, y: 158, text: '60', size: 12, anchor: 'end' },
      { type: 'line', points: [[50, 82], [290, 82]], color: 'glass', width: 1 },
      { type: 'line', points: [[50, 154], [290, 154]], color: 'glass', width: 1 },
    ];
    // 線の x は同じなので、同じ k で伸ばすと同じ加熱時間の所まで描ける（x で切る）
    const x = 50 + 240 * k;
    [[ETHANOL_LINE, 'blue'], [MIXTURE_LINE, 'orange']].forEach(([line, color]) => {
      const ps = cutAtX(line, x);
      if (ps.length >= 2) items.push({ type: 'line', points: ps, color, width: 3 });
      const end = ps.length ? ps[ps.length - 1] : line[0];
      items.push({ type: 'circle', x: end[0], y: end[1], r: 4, fill: color, stroke: 'none' });
    });
    items.push(
      { type: 'text', x: 296, y: 136, text: 'エタノール', size: 12, color: 'blue', anchor: 'end' },
      { type: 'text', x: 296, y: 102, text: '混合物', size: 12, color: 'orange', anchor: 'end' },
      { type: 'text', x: 160, y: 22, text: 'たて: 温度　横: 加熱した時間（0〜8 分）', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 44, text: '純粋な物質: 温度が一定', size: 13, anchor: 'middle', color: 'blue' },
      { type: 'text', x: 160, y: 64, text: '混合物: 少しずつ上がる', size: 13, anchor: 'middle', color: 'orange' },
    );
    return items;
  }
  // 折れ線（x の小さい順）を x までで切った点の配列（x が始点より左なら []）
  function cutAtX(line, x) {
    if (x <= line[0][0]) return [];
    const out = [[line[0][0], line[0][1]]];
    for (let i = 1; i < line.length; i++) {
      const [x1, y1] = line[i - 1], [x2, y2] = line[i];
      if (x >= x2) { out.push([x2, y2]); continue; }
      out.push([x, lerp(y1, y2, (x - x1) / (x2 - x1))]);
      break;
    }
    return out;
  }

  // 蒸留のあと、ガラス管を集めた液から引き上げ（青い矢印に沿って）、そのあとで火を消す（state-change-mp4-c2）。
  // 止まった絵（0.99）が静止図（ガラス管の先 y 120、火はない）
  function stTubeOutFirst(t) {
    const pull = ease(stage(t, 0.1, 0.45));
    const tip = 185 - 65 * pull;   // ガラス管の先（はじめは液の中、液面 y 167）
    const items = [];
    if (t < 0.6) items.push({ type: 'flame', x: 30, y: 110, label: '火' });
    items.push(
      { type: 'tube', x: 120, y: 200, height: 110, level: 0.3 },
      { type: 'line', points: [[60, 40], [120, 60], [120, tip]], width: 3 },
    );
    if (50 * pull >= 14) items.push({ type: 'arrow', x1: 150, y1: 120, x2: 150, y2: 120 - 50 * pull, color: 'blue' });
    items.push(
      { type: 'text', x: 160, y: 92, text: 'ガラス管を液から出す', size: 13 },
      { type: 'text', x: 160, y: 120, text: '→ それから火を消す', size: 13 },
      { type: 'text', x: 160, y: 228, text: '逆流を防ぐため', size: 14, anchor: 'middle', bold: true },
    );
    return items;
  }

  // 分留の塔の下から気体の粒が上がり、沸点の低いものほど高い所の取り出し口から出ていく。重油の粒は下に残る（state-change-mp4-c3）。
  // t = 0 は粒なし（静止図）。粒はどれも 1 周の中で出て行き終わるので、t = 1 と t = 0 がつながる
  const TOWER_OUT = [50, 86, 122, 158];                       // 石油ガス・ガソリン・灯油・軽油の取り出し口の y
  const TOWER_FILL = ['sky', 'yellow', 'orange', 'brown'];
  const TOWER_X = [126, 140, 154, 168];
  const TOWER_HEAVY = [[128, 208], [146, 212], [164, 207]];  // 重油の粒
  function stFractionalTower(t) {
    const items = [{ type: 'rect', x: 110, y: 30, width: 70, height: 190, fill: 'glass' }];
    if (t >= 0.1 && t < 0.92) TOWER_HEAVY.forEach(([x, y], i) => items.push({ type: 'circle', x: x + 1.5 * osc(t, 3, i / 3), y, r: 4, fill: 'ink', stroke: 'ink' }));
    for (let i = 0; i < 8; i++) {
      const s = 0.04 + 0.09 * i;
      if (t < s || t >= s + 0.22) continue;
      const kind = i % 4;
      const path = [[TOWER_X[kind], 212], [TOWER_X[kind], TOWER_OUT[kind]], [218, TOWER_OUT[kind]]];
      const q = along(path, stage(t, s, s + 0.22));
      items.push({ type: 'circle', x: q.x, y: q.y, r: 4, fill: TOWER_FILL[kind], stroke: 'ink' });
    }
    [[50, '石油ガス'], [86, 'ガソリン'], [122, '灯油'], [158, '軽油'], [200, '重油']].forEach(([y, s]) => {
      items.push({ type: 'line', points: [[180, y], [220, y]], width: 3 }, { type: 'text', x: 226, y: y + 5, text: s, size: 13 });
    });
    items.push(
      { type: 'text', x: 100, y: 54, text: '沸点が低い', size: 12, anchor: 'end' },
      { type: 'text', x: 100, y: 204, text: '沸点が高い', size: 12, anchor: 'end' },
      { type: 'line', points: [[70, 190], [70, 66]], color: 'gray', width: 2, arrow: true },
    );
    return items;
  }

  // ================================================================
  // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」の化学変化の 3 本
  // 静止図は content/chemical-change.js の chemical-change-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // （計画の ch-copper-oxidize は既存の ch-water-formation を、ch-lid-loosen は ch-open-container を使い回す）
  // ================================================================

  // 原子の丸（静止図と同じ形。Cu は半径 16、O・C は 14）
  function atom(x, y, name) {
    const look = { Cu: [16, 'brown'], O: [14, 'sky'], C: [14, 'gray'] }[name];
    return { type: 'circle', x, y, r: look[0], fill: look[1], stroke: 'ink', label: name };
  }

  // ---- 酸化銅の還元（chemical-change-mp8-c2）----
  // 原子の複製の動き [名前, はじめ, 途中, 終わり]。O は 0.1〜0.4 で Cu から離れて C のほうへ寄り、
  // 0.45〜0.85 で全部が右の位置へ動く（O–C–O が CO₂、残った Cu 2 個が銅）
  const REDUCE_MOVES = [
    ['Cu', [24, 80], [24, 80], [176, 80]],
    ['Cu', [24, 124], [24, 124], [176, 124]],
    ['O', [54, 80], [86, 88], [234, 102]],
    ['O', [54, 124], [86, 116], [290, 102]],
    ['C', [112, 102], [112, 102], [262, 102]],
  ];
  // 左の 2CuO ＋ C は静止図のまま残し、同じ原子の複製が動く。右の位置にははじめから灰色の輪かくを描く。
  // O が離れる時に Cu の上に「還元」、O が結びつく時に C の上に「酸化」を出し、右へ動いたあとは右の Cu・CO₂ の上に出す。
  // 止まった絵（0.99）の右が静止図と同じ
  function chReductionModel(t) {
    const s1 = ease(stage(t, 0.1, 0.4)), s2 = ease(stage(t, 0.45, 0.85));
    const items = [
      atom(24, 80, 'Cu'), atom(54, 80, 'O'), atom(24, 124, 'Cu'), atom(54, 124, 'O'),
      mtext(84, 108, '＋', 16, { anchor: 'middle' }),
      atom(112, 102, 'C'),
      mtext(144, 108, '→', 16, { anchor: 'middle' }),
      mtext(206, 108, '＋', 16, { anchor: 'middle' }),
    ];
    REDUCE_MOVES.forEach(([name, , , [x, y]]) => items.push({ type: 'circle', x, y, r: name === 'Cu' ? 16 : 14, fill: 'none', stroke: 'gray' }));
    REDUCE_MOVES.forEach(([name, a, m, b]) => {
      const p = s2 > 0 ? [lerp(m[0], b[0], s2), lerp(m[1], b[1], s2)] : [lerp(a[0], m[0], s1), lerp(a[1], m[1], s1)];
      items.push(atom(p[0], p[1], name));
    });
    if (t >= 0.1 && t < 0.45) {
      items.push(mtext(24, 58, '還元', 12, { anchor: 'middle', color: 'blue', bold: true }));
      if (t >= 0.25) items.push(mtext(112, 82, '酸化', 12, { anchor: 'middle', color: 'orange', bold: true }));
    }
    if (t >= 0.85) {
      items.push(
        mtext(176, 58, '還元', 12, { anchor: 'middle', color: 'blue', bold: true }),
        mtext(262, 80, '酸化', 12, { anchor: 'middle', color: 'orange', bold: true }),
      );
    }
    items.push(
      mtext(160, 182, '2CuO ＋ C → 2Cu ＋ CO₂', 17, { anchor: 'middle', bold: true }),
      mtext(160, 208, '酸化銅は還元され、炭素は酸化される', 12, { anchor: 'middle' }),
      mtext(160, 230, 'ピンチコックで空気が入るのを防ぐ', 12, { anchor: 'middle' }),
    );
    return items;
  }

  // ---- 発熱反応と吸熱反応（chemical-change-mp8-c3）----
  // 温度計（静止図の赤い線）はそのままにして、液の先の印（横線と丸）を足し、左は y 150 → 100 へ上がり、
  // 右は 110 → 160 へ下がる（ease(stage(t, 0, 0.8))）。「上がる」「下がる」の矢印は液の動きと同時に伸ばす。
  // 止まった絵（0.99）の矢印が静止図と同じ
  function chHeatThermometer(t) {
    const k = ease(stage(t, 0, 0.8));
    const yL = lerp(150, 100, k), yR = lerp(110, 160, k);
    const items = [
      mtext(90, 50, '鉄粉＋活性炭', 12, { anchor: 'middle' }),
      mtext(90, 68, '＋食塩水', 12, { anchor: 'middle' }),
      mtext(230, 50, '水酸化バリウム', 12, { anchor: 'middle' }),
      mtext(230, 68, '＋塩化アンモニウム', 12, { anchor: 'middle' }),
      { type: 'beaker', x: 90, y: 200, width: 90, height: 90, level: 0.3, liquid: 'rock' },
      { type: 'beaker', x: 230, y: 200, width: 90, height: 90, level: 0.3, liquid: 'glass' },
      { type: 'line', points: [[110, 86], [110, 188]], color: 'red', width: 3 },
      { type: 'circle', x: 110, y: 192, r: 5, fill: 'red', stroke: 'none' },
      { type: 'line', points: [[250, 86], [250, 188]], color: 'red', width: 3 },
      { type: 'circle', x: 250, y: 192, r: 5, fill: 'red', stroke: 'none' },
      // 液の先の印
      { type: 'line', points: [[103, yL], [117, yL]], width: 2 },
      { type: 'circle', x: 110, y: yL, r: 3, fill: 'ink', stroke: 'none' },
      { type: 'line', points: [[243, yR], [257, yR]], width: 2 },
      { type: 'circle', x: 250, y: yR, r: 3, fill: 'ink', stroke: 'none' },
    ];
    if (46 * k >= 8) {
      items.push(
        { type: 'arrow', x1: 126, y1: 150, x2: 126, y2: 150 - 46 * k, color: 'red', width: 3 },
        { type: 'arrow', x1: 266, y1: 104, x2: 266, y2: 104 + 46 * k, color: 'blue', width: 3 },
      );
    }
    items.push(
      mtext(90, 224, '上がる（発熱反応）', 12, { anchor: 'middle' }),
      mtext(230, 224, '下がる（吸熱反応）', 12, { anchor: 'middle' }),
    );
    return items;
  }

  // ---- 沈殿ができても質量は変わらない（chemical-change-mp9-c1）----
  // 右の小さいビーカー（x 292、空になったほう）の口から大きいビーカー（x 230）の口へ液が流れる道すじ
  const POUR = [[276, 118], [270, 104], [258, 98], [248, 112]];
  // 0.05〜0.4: 小さいビーカーの液（level 0.5 → 0）を大きいビーカー（0.3 → 0.6）へ注ぐ（点の流れ）。
  // 0.4〜0.8: 白い沈殿の粒が液の中にでき、しずんで底にたまり、沈殿の楕円 (230,160) が広がる。
  // はかりの「100.0 g」は左右とも変わらない。止まった絵（0.99）が静止図と同じ
  function chPrecipitateMass(t) {
    const pour = stage(t, 0.05, 0.4), g = ease(stage(t, 0.4, 0.8));
    const items = [
      mtext(80, 40, '混ぜる前', 13, { anchor: 'middle' }),
      { type: 'beaker', x: 55, y: 168, width: 44, height: 60, level: 0.5 },
      { type: 'beaker', x: 105, y: 168, width: 44, height: 60, level: 0.5 },
      { type: 'rect', x: 10, y: 170, width: 140, height: 24, fill: 'glass' },
      mtext(80, 188, '100.0 g', 14, { anchor: 'middle', bold: true }),
      { type: 'arrow', x1: 152, y1: 130, x2: 172, y2: 130, width: 2 },
      mtext(244, 40, '混ぜた後', 13, { anchor: 'middle' }),
      { type: 'beaker', x: 230, y: 168, width: 60, height: 70, level: lerp(0.3, 0.6, pour) },
    ];
    if (pour > 0 && pour < 1) {
      for (let k = 0; k < 4; k++) {
        const q = along(POUR, frac(2 * t + k / 4));
        items.push({ type: 'circle', x: q.x, y: q.y, r: 2.5, fill: 'water', stroke: 'blue' });
      }
    }
    // しずんでいく沈殿の粒（底に着いたら楕円に入る）
    for (let k = 0; k < 5; k++) {
      const s = stage(t, 0.4 + 0.05 * k, 0.6 + 0.05 * k);
      if (s > 0 && s < 1) items.push({ type: 'circle', x: 214 + 8 * k, y: lerp(130, 157, s), r: 2.5, fill: 'white', stroke: 'line' });
    }
    if (g > 0) items.push({ type: 'ellipse', x: 230, y: 160, rx: 22 * g, ry: 6 * g, fill: 'white', stroke: 'line' });
    if (t >= 0.4) items.push(mtext(244, 60, '白い沈殿ができる', 12, { anchor: 'middle' }));
    items.push(
      { type: 'beaker', x: 292, y: 168, width: 36, height: 50, level: lerp(0.5, 0, pour) },
      { type: 'rect', x: 174, y: 170, width: 140, height: 24, fill: 'glass' },
      mtext(244, 188, '100.0 g', 14, { anchor: 'middle', bold: true }),
      mtext(160, 226, '全体の質量は変わらない（質量保存の法則）', 12, { anchor: 'middle' }),
    );
    return items;
  }

  // ================================================================
  // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」の化学変化とイオンの 6 本
  // 静止図は content/ion.js の ion-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // （計画の「動く図（使い回し）」の ion-mp6-c1 は、既存の io-daniell をそのまま使う）
  // ================================================================

  // 導線の上を流れる電子の点（n 個。速さは 1 周に speed 回）。skip(x, y) が真の所（記号の中）には描かない
  function wireElectrons(path, t, n, speed, skip) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const p = along(path, frac(speed * t + k / n + 1 / (2 * n)));
      if (skip && skip(p.x, p.y)) continue;
      out.push({ type: 'circle', x: p.x, y: p.y, r: 4, fill: 'sky', stroke: 'blue' });
    }
    return out;
  }
  // 1 周の中の位置 uu で現れる大きさ（0〜to で 0 → 1）
  const popIn = (uu, to) => Math.min(1, uu / to);

  // ---- 塩化銅水溶液の電気分解のイオン（ion-mp3-c2）----
  // Cu2+ が陰極（右）へ動く（1 周の中の位置 u の 0〜0.6）。陰極に着いた Cu2+ は電子を受け取って
  // 赤茶の銅になり（0.6〜0.75 で小さくなって陰極に付く）、陰極の表面の銅の層が厚くなる。
  // Cl- は 2 個が陽極（左）へ動く（1 個目は u の 0〜0.5、2 個目は 0.3〜0.8）。陽極に着いた Cl- は電子を 1 個失って
  // 塩素原子になり、1 個目は陽極の横で 2 個目を待つ。2 個目が着くと、2 個そろって塩素の泡（Cl₂）になって上へ出る（0.8〜0.98）。
  // 電子は導線を陽極 → 電源 → 陰極へ流れる。
  // t = 0 でイオンが静止図の位置（Cu2+ (150,184)・1 個目の Cl- (170,150)。2 個目はまだ出ていない）
  const CUCL_CU = [[128, 184], [181, 184]], CUCL_CL = [[200, 150], [135, 150]];
  const CUCL_MOVE = 0.6;
  const CUCL_CL_MOVE = 0.5, CUCL_CL2_START = 0.3, CUCL_CL_JOIN = CUCL_CL2_START + CUCL_CL_MOVE, CUCL_CL_END = 0.98;
  const CUCL_CU_PH = CUCL_MOVE * 22 / 53, CUCL_CL_PH = CUCL_CL_MOVE * 30 / 65;
  const CUCL_WIRE = [[110, 70], [110, 40], [140, 40], [180, 40], [210, 40], [210, 70]];
  function ioCucl2Ions(t) {
    const items = [
      { type: 'beaker', x: 160, y: 215, width: 180, height: 120, level: 0.7, liquid: 'sky' },
      { type: 'rect', x: 104, y: 70, width: 12, height: 130, fill: 'gray' },
      { type: 'rect', x: 204, y: 70, width: 12, height: 130, fill: 'gray' },
    ];
    // 陰極の左の面に付く銅の層（だんだん厚くなる。t = 0 で 0）
    const th = 3 * stage(t, 0, 0.9);
    if (th > 0.05) items.push({ type: 'rect', x: 204 - th, y: 132, width: th, height: 68, fill: COPPER_LAYER, stroke: 'none' });
    items.push(
      { type: 'line', points: [[110, 70], [110, 40], [140, 40]], width: 2 },
      { type: 'line', points: [[180, 40], [210, 40], [210, 70]], width: 2 },
      { type: 'symbol', x: 160, y: 40, kind: 'battery' },
      { type: 'text', x: 146, y: 20, text: '＋', size: 14, anchor: 'middle' },
      { type: 'text', x: 174, y: 20, text: '−', size: 14, anchor: 'middle' },
      ...wireElectrons(CUCL_WIRE, t, 4, 2, (x, y) => Math.abs(y - 40) < 0.01 && x > 136 && x < 184),
    );
    // Cu2+
    const uc = frac(t + CUCL_CU_PH);
    if (uc < CUCL_MOVE) {
      const p = along(CUCL_CU, uc / CUCL_MOVE), r = 23 * popIn(uc, 0.06);
      if (r > 0.5) items.push(r >= 22.99 ? ion(p.x, p.y, 'Cu2+') : { type: 'circle', x: p.x, y: p.y, r, fill: ION_FILL['Cu2+'], stroke: 'ink' });
    } else if (uc < 0.75) {
      const s = stage(uc, CUCL_MOVE, 0.75);
      items.push(
        { type: 'circle', x: lerp(181, 199, s), y: 184, r: lerp(23, 3, s), fill: mix(TOKEN_HEX.white, COPPER_LAYER, 0.4 + 0.6 * s), stroke: 'ink' },
        { type: 'circle', x: lerp(203, 190, s), y: lerp(160, 176, s), r: 3, fill: 'sky', stroke: 'blue' },
        { type: 'circle', x: lerp(203, 190, s), y: lerp(206, 192, s), r: 3, fill: 'sky', stroke: 'blue' },
      );
    }
    // Cl-（2 個）。uu は動き始めてからの位置
    const ul = frac(t + CUCL_CL_PH);
    const clMoving = (uu) => {
      const p = along(CUCL_CL, uu / CUCL_CL_MOVE), r = 19 * popIn(uu, 0.06);
      if (r > 0.5) items.push(r >= 18.99 ? ion(p.x, p.y, 'Cl-') : { type: 'circle', x: p.x, y: p.y, r, fill: ION_FILL['Cl-'], stroke: 'ink' });
    };
    // 陽極へわたす電子（着いてから 0.04 のあいだ）
    const handOff = (uu) => { if (uu < 0.04) items.push({ type: 'circle', x: lerp(134, 117, uu / 0.04), y: 150, r: 3, fill: 'sky', stroke: 'blue' }); };
    if (ul < CUCL_CL_MOVE) clMoving(ul);
    else if (ul < CUCL_CL_JOIN) {
      items.push({ type: 'circle', x: 122, y: 139, r: 4, fill: 'white', stroke: 'green' });   // 1 個目の塩素原子（液面のすぐ下で 2 個目を待つ）
      handOff(ul - CUCL_CL_MOVE);
    }
    if (ul >= CUCL_CL2_START && ul < CUCL_CL_JOIN) clMoving(ul - CUCL_CL2_START);
    if (ul >= CUCL_CL_JOIN && ul < CUCL_CL_END) {
      const s = stage(ul, CUCL_CL_JOIN, CUCL_CL_END);
      const by = lerp(142, 122, s);
      items.push({ type: 'circle', x: 122, y: by, r: lerp(5, 7, s), fill: 'white', stroke: 'green' });
      handOff(ul - CUCL_CL_JOIN);
      items.push({ type: 'text', x: 132, y: by + 4, text: 'Cl₂', size: 12, color: 'green' });
    }
    items.push(
      { type: 'arrow', x1: 174, y1: 184, x2: 200, y2: 184, color: 'blue', width: 2 },
      { type: 'arrow', x1: 150, y1: 150, x2: 120, y2: 150, color: 'blue', width: 2 },
      { type: 'text', x: 78, y: 100, text: '陽極', size: 13, anchor: 'middle', bold: true },
      { type: 'text', x: 242, y: 100, text: '陰極', size: 13, anchor: 'middle', bold: true },
      { type: 'text', x: 70, y: 234, text: '2Cl- → Cl₂ ＋ 2e-', size: 12, anchor: 'middle' },
      { type: 'text', x: 248, y: 234, text: 'Cu2+ ＋ 2e- → Cu', size: 12, anchor: 'middle' },
    );
    return items;
  }

  // ---- うすい塩酸の電池（ion-mp4-c2）----
  // 亜鉛板から Zn2+ がとけ出し（io-daniell と同じ粒の出し方。粒は 1 つずつ）、電子（点）が導線を亜鉛板 → 銅板へ流れ、銅板の表面で H+ 2 個が
  // 電子を受け取って H₂ の泡になる（H+ は 1 周の中の位置 u の 0〜0.5 で銅板へ動き、0.5〜0.6 で消えて泡になり、0.55〜0.95 で泡が上がる）。
  // 電流の矢印は静止図のまま（電子と逆向き）。t = 1 と t = 0 がつながる
  const HCL_ZN_PATH = [[100, 158], [128, 180]], HCL_ZN_PHASES = [0.2];   // 道すじが短いので 1 つずつ
  const HCL_H_PATHS = [[[170, 194], [193, 192]], [[166, 152], [193, 150]]];
  const HCL_H_PH = 0.3;
  const HCL_WIRE = [[102, 80], [102, 40], [140, 40], [180, 40], [218, 40], [218, 80]];
  function ioHclCell(t) {
    const items = [{ type: 'beaker', x: 160, y: 215, width: 190, height: 120, level: 0.7, liquid: 'water' }];
    // Zn2+ は亜鉛板の後ろから出てくる
    HCL_ZN_PHASES.forEach(ph => {
      const p = daniellIon(HCL_ZN_PATH, frac(t + ph));
      if (p) items.push(...daniellIonItems(p, 'Zn2+', TOKEN_HEX.glass, TOKEN_HEX.water));
    });
    items.push(
      { type: 'rect', x: 96, y: 80, width: 12, height: 125, fill: 'rock' },
      { type: 'rect', x: 212, y: 80, width: 12, height: 125, fill: 'brown' },
      { type: 'line', points: [[102, 80], [102, 40], [140, 40]], width: 2 },
      { type: 'line', points: [[180, 40], [218, 40], [218, 80]], width: 2 },
      { type: 'symbol', x: 160, y: 40, kind: 'voltmeter' },
      ...wireElectrons(HCL_WIRE, t, 4, 2, (x, y) => Math.abs(y - 40) < 0.01 && x > 136 && x < 184),
    );
    // H+ 2 個 → H₂ の泡
    const uh = frac(t + HCL_H_PH);
    if (uh < 0.6) {
      const k = Math.min(1, uh / 0.5), shrink = 1 - stage(uh, 0.5, 0.6);
      HCL_H_PATHS.forEach(path => {
        const p = along(path, k), r = 19 * popIn(uh, 0.06) * shrink;
        if (r > 0.5) items.push(r >= 18.99 ? ion(p.x, p.y, 'H+') : { type: 'circle', x: p.x, y: p.y, r, fill: ION_FILL['H+'], stroke: 'ink' });
      });
    }
    if (uh >= 0.55 && uh < 0.95) {
      const s = stage(uh, 0.55, 0.95), by = lerp(170, 134, s);
      items.push(
        { type: 'circle', x: 205, y: by, r: lerp(3, 6, s), fill: 'white', stroke: 'ink' },
        { type: 'text', x: 230, y: by + 4, text: 'H₂', size: 12 },
      );
    }
    items.push(
      { type: 'text', x: 60, y: 78, text: '亜鉛板（−極）', size: 12, anchor: 'middle' },
      { type: 'text', x: 262, y: 78, text: '銅板（＋極）', size: 12, anchor: 'middle' },
      { type: 'arrow', x1: 110, y1: 28, x2: 140, y2: 28, color: 'blue', width: 2 },
      { type: 'text', x: 90, y: 22, text: '電子', size: 12, anchor: 'middle', color: 'blue' },
      { type: 'arrow', x1: 210, y1: 54, x2: 184, y2: 54, color: 'orange', width: 2 },
      { type: 'text', x: 232, y: 60, text: '電流', size: 12, anchor: 'middle', color: 'orange' },
      { type: 'text', x: 60, y: 234, text: 'Zn → Zn2+ ＋ 2e-', size: 12, anchor: 'middle' },
      { type: 'text', x: 250, y: 234, text: '2H+ ＋ 2e- → H₂', size: 12, anchor: 'middle' },
    );
    return items;
  }

  // ---- 燃料電池（ion-mp6-c3）----
  // 水の電気分解のあとの装置で、水素側と酸素側の気体が 2 : 1 の割合で減り（水面が上がる。x = 10·ease(stage(t, 0, 0.85))、
  // 水素 70 − 2x・酸素 35 − x）、電子が導線をオルゴールを通って水素側 → 酸素側へ流れ、オルゴールのまわりに音のしるしが出る。
  // 止まった絵は t = 0（気体が静止図の量）。進む → 止まる → t = 0 にもどる
  const FUEL_WIRE = [[98, 180], [56, 180], [56, 28], [116, 28], [204, 28], [264, 28], [264, 180], [222, 180]];
  function fuelUsed(t) { return 10 * ease(stage(t, 0, 0.85)); }
  function ioFuelCell(t) {
    const x = fuelUsed(t), running = t < 0.85;
    const items = [
      { type: 'rect', x: 116, y: 12, width: 88, height: 32, rx: 4, fill: 'yellow', label: 'オルゴール' },
      { type: 'rect', x: 60, y: 196, width: 200, height: 14, fill: 'water' },
      { type: 'rect', x: 80, y: 50, width: 36, height: 150, fill: 'water' },
      { type: 'rect', x: 80, y: 50, width: 36, height: 70 - 2 * x, fill: 'white' },
      { type: 'rect', x: 204, y: 50, width: 36, height: 150, fill: 'water' },
      { type: 'rect', x: 204, y: 50, width: 36, height: 35 - x, fill: 'white' },
      { type: 'rect', x: 94, y: 166, width: 8, height: 28, fill: 'gray' },
      { type: 'rect', x: 218, y: 166, width: 8, height: 28, fill: 'gray' },
      { type: 'line', points: [[98, 180], [56, 180], [56, 28], [116, 28]], width: 2 },
      { type: 'line', points: [[222, 180], [264, 180], [264, 28], [204, 28]], width: 2 },
    ];
    if (running) {
      items.push(...wireElectrons(FUEL_WIRE, t, 6, 3, (px, py) => Math.abs(py - 28) < 0.01 && px > 112 && px < 208));
      // 音のしるし（オルゴールの左右で上下にゆれる）
      items.push(
        { type: 'text', x: 98, y: 17 + 2 * osc(t, 6), text: '♪', size: 12, color: 'orange' },
        { type: 'text', x: 212, y: 17 - 2 * osc(t, 6), text: '♪', size: 12, color: 'orange' },
      );
    }
    items.push(
      { type: 'text', x: 98, y: 92, text: '水素', size: 13, anchor: 'middle' },
      { type: 'text', x: 222, y: 74, text: '酸素', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 110, text: '2H₂ ＋ O₂', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 128, text: '→ 2H₂O', size: 12, anchor: 'middle' },
      { type: 'text', x: 98, y: 232, text: '陰極だった側', size: 12, anchor: 'middle' },
      { type: 'text', x: 222, y: 232, text: '陽極だった側', size: 12, anchor: 'middle' },
    );
    return items;
  }

  // ---- OH- が陽極へ動く（ion-mp7-c2）----
  // io-migration（H+ が陰極へ）の左右逆。青色の部分の右はしが中央（x 168）から陽極（右）へ広がり（168 + 96·stage(t, 0, 0.85)）、
  // OH- 4 つが先頭にいて右へ動く。陰極側の色は変わらない。止まった絵は右はしが静止図の 224 になる t（io-migration の restT と同じ値）
  function ohMigrationRight(t) { return 168 + 96 * stage(t, 0, 0.85); }
  const OH_MIGRATION_REST = 0.85 * 56 / 96;
  const RED_LITMUS = '#F2B8B5';   // 赤色リトマス紙の色（content/ion.js の ion-mp7-c2 の静止図と同じ）
  function ioOhMigration(t) {
    const right = ohMigrationRight(t);
    const items = [
      { type: 'text', x: 40, y: 50, text: '陰極（−）', size: 12, anchor: 'middle' },
      { type: 'text', x: 280, y: 50, text: '陽極（＋）', size: 12, anchor: 'middle' },
      { type: 'line', points: [[40, 58], [40, 112]], width: 2 },
      { type: 'line', points: [[280, 58], [280, 112]], width: 2 },
      { type: 'rect', x: 20, y: 96, width: 280, height: 48, fill: 'glass' },
      { type: 'rect', x: 40, y: 108, width: 240, height: 24, fill: RED_LITMUS, stroke: 'none' },
      { type: 'rect', x: 158, y: 108, width: right - 158, height: 24, fill: BLUE_LITMUS, stroke: 'none' },
      { type: 'line', points: [[160, 92], [160, 148]], width: 3 },
    ];
    // OH- 4 つ: 先頭は青い部分の右はし、残りは中央の近くまで並ぶ（青い部分が OH- より細い動き始めは、中央の右にそろえる）
    const head = right - 7, tail = Math.min(head, 165);
    [116, 124, 116, 124].forEach((y, k) => items.push({ type: 'circle', x: Math.max(165, lerp(head, tail, k / 3)), y, r: 7, fill: 'sky', stroke: 'blue' }));
    items.push(
      { type: 'arrow', x1: 170, y1: 84, x2: 216, y2: 84, color: 'blue', width: 2 },
      { type: 'text', x: 193, y: 74, text: 'OH-', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 168, text: '水酸化ナトリウム水溶液をつけた所', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 196, text: '青色が陽極側へ広がる', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 222, text: '→ アルカリ性を示すのは OH-（陰イオン）', size: 13, anchor: 'middle' },
    );
    return items;
  }

  // ---- BTB 溶液の色の変化（ion-mp8-c1）----
  // 左の試験管に、上のスポイトから塩酸を 1 滴ずつ 8 滴加える（j 滴目は 0.05 + 0.09j から 0.05 かけて落ちる）。加えるたびに液の色を
  // 青 → 緑（4 滴）→ 黄（8 滴）と mix で少しずつ変え、液面を 0.6 → 0.7 に上げる。いまの色に合う静止図の文字（アルカリ性・中性・酸性）を
  // blue にする。止まった絵は t = 0（青で静止図と同じ）。進む → 止まる → t = 0 にもどる
  const BTB_DROPS = 8, BTB_DROP_FALL = 0.05;
  const btbDropAt = (j) => 0.05 + 0.09 * j;
  function btbCount(t) {
    let n = 0;
    for (let j = 0; j < BTB_DROPS; j++) if (t >= btbDropAt(j) + BTB_DROP_FALL) n++;
    return n;
  }
  function btbColor(n) {
    const k = n / BTB_DROPS;
    return k <= 0.5 ? mix(TOKEN_HEX.blue, TOKEN_HEX.green, k / 0.5) : mix(TOKEN_HEX.green, TOKEN_HEX.yellow, (k - 0.5) / 0.5);
  }
  function btbState(n) { return n < BTB_DROPS / 2 ? 'アルカリ性' : n === BTB_DROPS / 2 ? '中性' : '酸性'; }
  function ioBtbNeutral(t) {
    const n = btbCount(t), level = 0.6 + 0.1 * n / BTB_DROPS;
    const state = btbState(n);
    const items = [
      { type: 'tube', x: 60, y: 170, height: 100, level, liquid: n === 0 ? 'blue' : btbColor(n) },
      { type: 'tube', x: 160, y: 170, height: 100, level: 0.65, liquid: 'green' },
      { type: 'tube', x: 260, y: 170, height: 100, level: 0.7, liquid: 'yellow' },
      // スポイト
      { type: 'rect', x: 55, y: 24, width: 10, height: 22, fill: 'glass', stroke: 'ink' },
      { type: 'polygon', points: [[56, 46], [64, 46], [60, 56]], fill: 'glass', stroke: 'ink' },
    ];
    for (let j = 0; j < BTB_DROPS; j++) {
      const s = stage(t, btbDropAt(j), btbDropAt(j) + BTB_DROP_FALL);
      if (s > 0 && s < 1) items.push({ type: 'circle', x: 60, y: lerp(60, 170 - 100 * level, s * s), r: 3, fill: 'water', stroke: 'line' });
    }
    const label = (x, s) => ({ type: 'text', x, y: 194, text: s, size: 12, anchor: 'middle', ...(s === state ? { color: 'blue', bold: true } : {}) });
    items.push(
      { type: 'arrow', x1: 82, y1: 120, x2: 136, y2: 120, color: 'gray', width: 2 },
      { type: 'arrow', x1: 182, y1: 120, x2: 236, y2: 120, color: 'gray', width: 2 },
      { type: 'text', x: 160, y: 30, text: '塩酸を少しずつ加える →', size: 13, anchor: 'middle' },
      label(60, 'アルカリ性'), label(160, '中性'), label(260, '酸性'),
      { type: 'text', x: 160, y: 228, text: 'H+ ＋ OH- → H₂O', size: 15, anchor: 'middle', bold: true },
      { type: 'text', x: 8, y: 208, text: '加えた塩酸 ' + n + ' 滴', size: 12, color: 'blue' },
    );
    return items;
  }

  // ---- 中和のイオンのモデル（ion-mp9-c1）----
  // 静止図の 3 つの箱を順に強調し（ふちを blue）、箱ごとに、水酸化ナトリウム水溶液の Na+ と OH- が下の段に現れる（s 0〜0.2）。
  // 左・中の箱では OH- と H+ が近づいて（0.2〜0.5）結びつき、2 つが消えて小さな「H₂O」に替わり（0.5〜0.65）、Na+ が H+ のいた所へ
  // 動く（0.65〜0.9）。右の箱では結びつく H+ がなく OH- が残る。Cl- はそのまま。止まった絵（0.99）が静止図と同じイオンの数と位置
  const NM_BOXES = [
    { x: 8, fill: '#FFF3C4', from: 0.03 },
    { x: 112, fill: 'lightgreen', from: 0.33 },
    { x: 216, fill: 'sky', from: 0.63 },
  ];
  const NM_LEN = 0.27;
  function nmPhase(box, t) { return stage(t, box.from, box.from + NM_LEN); }
  function ioNeutralModel(t) {
    const items = [{ type: 'text', x: 160, y: 24, text: '水酸化ナトリウム水溶液を加えていく →', size: 12, anchor: 'middle' }];
    NM_BOXES.forEach((box, b) => {
      const s = nmPhase(box, t), active = t >= box.from && t < box.from + NM_LEN;
      const L = box.x + 26, R = box.x + 70;   // 左の列・右の列の x
      items.push(Object.assign({ type: 'rect', x: box.x, y: 36, width: 96, height: 126, rx: 6, fill: box.fill }, active ? { stroke: 'blue' } : {}));
      // 上の段: 左の箱は H+、ほかは Na+。右の列はいつも Cl-
      items.push(ion(L, 60, b === 0 ? 'H+' : 'Na+'), ion(R, 60, 'Cl-'));
      const grow = 19 * stage(s, 0, 0.2);
      if (b < 2) {
        // 中の段の左: はじめは H+（OH- と結びついて消える）。そのあと Na+ が下の段から上がってくる
        const meet = [L + 22, 124];
        const k = ease(stage(s, 0.2, 0.5)), gone = stage(s, 0.5, 0.65);
        if (gone < 1) {
          const r = lerp(19, 12, k) * (1 - gone);
          const hp = [lerp(L, meet[0], k), lerp(100, meet[1], k)], op = [lerp(R, meet[0], k), lerp(140, meet[1], k)];
          if (r > 0.5) items.push(r >= 18.99 ? ion(hp[0], hp[1], 'H+') : { type: 'circle', x: hp[0], y: hp[1], r, fill: ION_FILL['H+'], stroke: 'ink' });
          if (grow > 0.5 && r > 0.5) {
            const ro = Math.min(grow, r);
            items.push(ro >= 18.99 ? ion(op[0], op[1], 'OH-') : { type: 'circle', x: op[0], y: op[1], r: ro, fill: ION_FILL['OH-'], stroke: 'ink' });
          }
        }
        if (s >= 0.55 && s < 0.97) items.push({ type: 'text', x: meet[0], y: meet[1] + 4, text: 'H₂O', size: 12, anchor: 'middle', color: 'blue', bold: true });
        const up = ease(stage(s, 0.65, 0.9));
        if (grow > 0.5) items.push(grow >= 18.99 ? ion(L, lerp(140, 100, up), 'Na+') : { type: 'circle', x: L, y: 140, r: grow, fill: ION_FILL['Na+'], stroke: 'ink' });
        items.push(ion(R, 100, 'Cl-'));
      } else {
        // 右の箱: Na+ と OH- が下の段に現れて、そのまま残る
        items.push(ion(L, 100, 'Na+'), ion(R, 100, 'Cl-'));
        if (grow > 0.5) {
          items.push(grow >= 18.99 ? ion(L, 140, 'Na+') : { type: 'circle', x: L, y: 140, r: grow, fill: ION_FILL['Na+'], stroke: 'ink' });
          items.push(grow >= 18.99 ? ion(R, 140, 'OH-') : { type: 'circle', x: R, y: 140, r: grow, fill: ION_FILL['OH-'], stroke: 'ink' });
        }
      }
    });
    items.push(
      { type: 'text', x: 56, y: 180, text: '酸性', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 180, text: '中性', size: 12, anchor: 'middle' },
      { type: 'text', x: 264, y: 180, text: 'アルカリ性', size: 12, anchor: 'middle' },
      { type: 'text', x: 160, y: 210, text: 'H+ ＋ OH- → H₂O（水）', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 232, text: '（水の分子はかいていない）', size: 12, anchor: 'middle' },
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
    // 優先度 B（docs/anim-plan.md 6 章）
    ['su-upward-displacement', displacement('up'), { restT: 0.99 }],
    ['su-downward-displacement', displacement('down'), { restT: 0.99 }],
    ['su-co2-limewater', suCo2Limewater, { restT: 0.99 }],
    ['st-distill-order', stDistillOrder, { restT: 0.99 }],
    ['sl-saturate', slSaturate, { restT: 0.99 }],
    ['ch-mass-conservation', chMassConservation, { restT: MASS_REST }],
    ['io-ion-count', ioIonCount, { restT: 0.99 }],
    // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md
    ['su-three-methods', suThreeMethods, { restT: 0 }],
    ['su-discard-first', suDiscardFirst, { restT: 0 }],
    ['su-ammonia-fountain', suAmmoniaFountain, { restT: 0.99 }],
    ['sl-filter-pass', slFilterPass, { restT: 0 }],
    ['sl-crystal-start', slCrystalStart, { restT: 0.99 }],
    ['st-state-arrows', stStateArrows, { restT: 0 }],
    ['st-melt-boil', stMeltBoil, { restT: 0.99 }],
    ['st-mixture-curve', stMixtureCurve, { restT: 0.99 }],
    ['st-tube-out-first', stTubeOutFirst, { restT: 0.99 }],
    ['st-fractional-tower', stFractionalTower, { restT: 0 }],
    // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md
    ['ch-reduction-model', chReductionModel, { restT: 0.99 }],
    ['ch-heat-thermometer', chHeatThermometer, { restT: 0.99 }],
    ['ch-precipitate-mass', chPrecipitateMass, { restT: 0.99 }],
    // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md
    ['io-cucl2-ions', ioCucl2Ions, { restT: 0 }],
    ['io-hcl-cell', ioHclCell, { restT: 0 }],
    ['io-fuel-cell', ioFuelCell, { restT: 0 }],
    ['io-oh-migration', ioOhMigration, { restT: OH_MIGRATION_REST }],
    ['io-btb-neutral', ioBtbNeutral, { restT: 0 }],
    ['io-neutral-model', ioNeutralModel, { restT: 0.99 }],
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  // このファイルで足した kind と、テストで値を確かめるための式
  const api = {
    KINDS: DEFS.map(d => d[0]), kno3At, recrystTemp, migrationLeft,
    daniell: { ion: daniellIon, ZN_PATH, ZN_PHASES, CU_PATH, CU_PHASES },
    distillFill, distillLevel, satPileK, ionCountX, ionCountYs, ionCountDots,
    // ミニプリント（3nen）
    ohMigrationRight, fuelUsed, btbCount, btbColor, nmPhase, NM_BOXES,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
