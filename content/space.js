// 「地球と宇宙」教材データ（中学3年 理科・地学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（地球の動きと天体の見え方: 日周運動、年周運動と季節 / 太陽系: 月の満ち欠けと日食・月食、太陽と太陽系）と、概念 6 つ。
// 概念 id・領域 id は全単元で一意にするため、接頭辞 sp- を付ける。
// 図（scene）の item は js/figures.js の定義に従う（docs/figures-guide.md）。座標は x 右向き・y 下向き、場面は 320×240。
// drag の samples は手計算した正解例・不正解例（tests/content-all.test.js で判定を確かめる）。
// drag の位置は部品の基準点（circle は中心）で判定する（js/ui-problems.js の anchorOf）。
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

  const D = Math.PI / 180;
  const DARK = '#59606B';     // 天体の夜の側（光の当たらない側）
  const NIGHT = '#7C8796';    // 地球の夜の側
  function r1(v) { return Math.round(v * 10) / 10; }

  // 選ぶ場所（label はア・イ・ウ）
  function region(id, x, y, label) { return { type: 'region', id, x: r1(x), y: r1(y), r: 22, label }; }

  // 円周上の点。角度は度で、右が 0°、画面で見て反時計回りが正（画面の y は下向きなので sin を引く）
  function onCircle(cx, cy, r, deg) { return [r1(cx + r * Math.cos(deg * D)), r1(cy - r * Math.sin(deg * D))]; }
  // 円弧の点の列（a0 → a1。a1 > a0 なら反時計回り）
  function arc(cx, cy, r, a0, a1, n) {
    const k = n || Math.max(6, Math.round(Math.abs(a1 - a0) / 6));
    const pts = [];
    for (let i = 0; i <= k; i++) pts.push(onCircle(cx, cy, r, a0 + (a1 - a0) * i / k));
    return pts;
  }
  // 円弧の線（opts に color・width・dashed・arrow）
  function arcLine(cx, cy, r, a0, a1, opts) { return Object.assign({ type: 'line', points: arc(cx, cy, r, a0, a1) }, opts); }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/space/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/space/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }
  // 半円（dir の向きに丸い側がある）
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

  // ---- 透明半球（観測者は北側から南を向いて見下ろす。東が左、西が右、南が奥、北が手前） ----
  // 半球の中心 O (160, 170)、半径 120。底の円は横 120・たて 40 の楕円に見える
  const HX = 160, HY = 170, HR = 120, HS = 1 / 3, HCOS = Math.sqrt(8) / 3;
  function hemi(e, n, z) { return [r1(HX - HR * e), r1(HY - HR * z * HCOS + HR * n * HS)]; }
  const LAT = 35 * D;   // 北緯 35°
  // 赤緯 decl（度）、時刻 t（時。太陽が南中する時刻を 12 時とする）の太陽の位置
  function sunAt(decl, t) {
    const d = decl * D, h = 15 * (t - 12) * D;
    const z = Math.sin(LAT) * Math.sin(d) + Math.cos(LAT) * Math.cos(d) * Math.cos(h);
    const n = Math.cos(LAT) * Math.sin(d) - Math.sin(LAT) * Math.cos(d) * Math.cos(h);
    const e = -Math.cos(d) * Math.sin(h);
    return hemi(e, n, z);
  }
  // 日の出の時刻（時）
  function riseTime(decl) { return 12 - Math.acos(-Math.tan(LAT) * Math.tan(decl * D)) / D / 15; }
  function pathPts(decl, t0, t1) {
    const pts = [];
    const k = Math.max(2, Math.round((t1 - t0) * 4));
    for (let i = 0; i <= k; i++) pts.push(sunAt(decl, t0 + (t1 - t0) * i / k));
    return pts;
  }
  // 透明半球の底・ドーム・十字の線・方位
  function hemisphereBase() {
    return [
      { type: 'ellipse', x: HX, y: HY, rx: HR, ry: HR * HS, fill: '#F4F1E8', stroke: 'line' },
      { type: 'line', points: [[HX - HR, HY], [HX + HR, HY]], color: 'gray', width: 1 },
      { type: 'line', points: [[HX, HY - HR * HS], [HX, HY + HR * HS]], color: 'gray', width: 1 },
      arcLine(HX, HY, HR, 0, 180, { color: 'gray', width: 2 }),
      { type: 'text', x: 28, y: 176, text: '東', size: 14, anchor: 'end', bold: true },
      { type: 'text', x: 292, y: 176, text: '西', size: 14, bold: true },
      { type: 'text', x: 160, y: 124, text: '南', size: 14, anchor: 'middle', bold: true },
      { type: 'text', x: 160, y: 230, text: '北', size: 14, anchor: 'middle', bold: true },
    ];
  }
  // 太陽の通り道。t0〜t1 時の記録（●と実線）と、日の出・日の入りまでのばした点線
  function sunPathItems(decl, t0, t1) {
    const rise = riseTime(decl), set = 24 - rise;
    const items = [
      { type: 'line', points: pathPts(decl, rise, t0), color: 'orange', width: 2, dashed: true },
      { type: 'line', points: pathPts(decl, t1, set), color: 'orange', width: 2, dashed: true },
      { type: 'line', points: pathPts(decl, t0, t1), color: 'orange', width: 2 },
    ];
    for (let t = t0; t <= t1; t++) {
      const [x, y] = sunAt(decl, t);
      items.push({ type: 'circle', x, y, r: 4, fill: 'ink', stroke: 'none' });
    }
    return items;
  }
  const SUMMER = 23.4;   // 夏至の太陽の赤緯
  const SUMMER_RISE = sunAt(SUMMER, riseTime(SUMMER));
  const SUMMER_SET = sunAt(SUMMER, 24 - riseTime(SUMMER));
  const SUMMER_8 = sunAt(SUMMER, 8);

  // ---- 北極の真上から見た地球（中心 (160, 120)、半径 50、太陽の光は左から） ----
  function earthFromPole() {
    return [
      { type: 'arrow', x1: 8, y1: 70, x2: 92, y2: 70, color: 'orange' },
      { type: 'arrow', x1: 8, y1: 170, x2: 92, y2: 170, color: 'orange' },
      { type: 'text', x: 8, y: 56, text: '太陽の光', size: 12 },
      ...litBody(160, 120, 50, 180, 'sky', NIGHT),
      { type: 'circle', x: 160, y: 120, r: 3, fill: 'ink', stroke: 'none' },
      { type: 'text', x: 160, y: 138, text: '北極', size: 12, anchor: 'middle' },
      arcLine(160, 120, 64, 300, 340, { color: 'blue', width: 3, arrow: true }),
    ];
  }

  // ---- 空の星の動き（方角ごとの小さな図。(x0, y0) は左上、幅 w） ----
  function skyPanel(x0, y0, w, h, kind, title) {
    const items = [{ type: 'rect', x: x0, y: y0, width: w, height: h, fill: '#F3F6FB', stroke: 'line' }];
    const g = y0 + h - 12;   // 地平線
    const mid = x0 + w / 2;
    if (kind !== 'north') items.push({ type: 'line', points: [[x0 + 4, g], [x0 + w - 4, g]], color: 'brown', width: 2 });
    if (kind === 'north') {
      const cy = y0 + h / 2 + 4;
      [12, 24, 36].forEach(r => items.push(arcLine(mid, cy, r, -40, 120, { color: 'blue', width: 2, arrow: true })));
      items.push({ type: 'circle', x: mid, y: cy, r: 3.5, fill: 'ink', stroke: 'none' });
    }
    if (kind === 'east' || kind === 'west') {
      const step = (w - 52) / 2;
      for (let k = 0; k < 3; k++) {
        const xa = x0 + 8 + k * step, xb = xa + 34;
        const top = g - 50;
        const pts = kind === 'east' ? [[xa, g], [xb, top]] : [[xa, top], [xb, g]];
        items.push({ type: 'line', points: pts.map(p => [r1(p[0]), r1(p[1])]), color: 'blue', width: 2, arrow: true });
      }
    }
    if (kind === 'south') {
      [34, 50].forEach(r => items.push(arcLine(mid, g + 14, r, 155, 25, { color: 'blue', width: 2, arrow: true })));
    }
    if (title) items.push({ type: 'text', x: x0 + 6, y: y0 + 16, text: title, size: 12, bold: true });
    return items;
  }

  // ---- 太陽のまわりを公転する地球と星座（真上から見た図。太陽 (160, 120)、軌道の半径 62） ----
  // A 右（冬）、B 上（春）、C 左（夏）、D 下（秋）。地球は反時計回りに公転する
  const ORBIT = { A: [222, 120], B: [160, 58], C: [98, 120], D: [160, 182] };
  const STARS = { orion: [290, 120], leo: [160, 24], scorpius: [30, 120], pegasus: [160, 216] };
  function orbitBase(earthLabels) {
    const items = [
      { type: 'circle', x: 160, y: 120, r: 62, fill: 'none', stroke: 'gray' },
      arcLine(160, 120, 62, 300, 330, { color: 'blue', width: 3, arrow: true }),
      { type: 'circle', x: 160, y: 120, r: 16, fill: 'yellow', stroke: 'orange' },
      { type: 'text', x: 160, y: 124, text: '太陽', size: 12, anchor: 'middle' },
    ];
    Object.keys(ORBIT).forEach(k => items.push({ type: 'circle', x: ORBIT[k][0], y: ORBIT[k][1], r: 9, fill: 'sky', stroke: 'line' }));
    if (earthLabels) {
      items.push(
        { type: 'text', x: 234, y: 112, text: 'A', size: 13, bold: true },
        { type: 'text', x: 172, y: 54, text: 'B', size: 13, bold: true },
        { type: 'text', x: 86, y: 112, text: 'C', size: 13, anchor: 'end', bold: true },
        { type: 'text', x: 172, y: 196, text: 'D', size: 13, bold: true },
      );
    }
    items.push(
      { type: 'text', x: 316, y: 92, text: 'オリオン座', size: 12, anchor: 'end' },
      { type: 'text', x: 188, y: 30, text: 'しし座', size: 12 },
      { type: 'text', x: 4, y: 92, text: 'さそり座', size: 12 },
      { type: 'text', x: 188, y: 222, text: 'ペガスス座', size: 12 },
    );
    return items;
  }
  function starDots() {
    return Object.keys(STARS).map(k => ({ type: 'circle', x: STARS[k][0], y: STARS[k][1], r: 6, fill: 'yellow', stroke: 'orange' }));
  }

  // ---- 公転面を横から見た地球（地軸は公転面に垂直な向きから 23.4° 右へ傾く。矢印の先が北極） ----
  function tiltedEarth(cx, cy, night) {
    const dx = r1(26 * Math.sin(23.4 * D)), dy = r1(26 * Math.cos(23.4 * D));
    const items = night === null ? [{ type: 'circle', x: cx, y: cy, r: 14, fill: 'sky', stroke: 'line' }] : litBody(cx, cy, 14, night + 180, 'sky', NIGHT);
    items.push({ type: 'line', points: [[r1(cx - dx), r1(cy + dy)], [r1(cx + dx), r1(cy - dy)]], width: 2, arrow: true });
    return items;
  }
  function seasonSide() {
    return [
      { type: 'ellipse', x: 160, y: 110, rx: 120, ry: 30, fill: 'none', stroke: 'gray' },
      { type: 'arrow', x1: 132, y1: 110, x2: 62, y2: 110, color: 'orange' },
      { type: 'arrow', x1: 188, y1: 110, x2: 258, y2: 110, color: 'orange' },
      { type: 'circle', x: 160, y: 108, r: 20, fill: 'yellow', stroke: 'orange' },
      ...tiltedEarth(40, 110, 180),
      ...tiltedEarth(280, 110, 0),
      ...tiltedEarth(160, 156, null),   // 太陽（y 108, r 20）と重ならないよう下げる
    ];
  }

  // ---- 南中高度（北と南を結ぶ面で見た図。観測地点 O (150, 200)、半径 140） ----
  const NOON = { summer: onCircle(150, 200, 140, 78.4), equinox: onCircle(150, 200, 140, 55), winter: onCircle(150, 200, 140, 31.6) };
  function noonBase() {
    return [
      arcLine(150, 200, 140, 0, 180, { color: 'gray', width: 1.5, dashed: true }),
      { type: 'line', points: [[6, 200], [314, 200]], color: 'brown', width: 3 },
      { type: 'circle', x: 150, y: 200, r: 4, fill: 'ink', stroke: 'none' },
      { type: 'text', x: 296, y: 220, text: '南', size: 14, anchor: 'middle', bold: true },
      { type: 'text', x: 20, y: 220, text: '北', size: 14, anchor: 'middle', bold: true },
      { type: 'text', x: 150, y: 220, text: '観測地点', size: 12, anchor: 'middle' },
    ];
  }

  // ---- 月の公転（真上から見た図。地球 (160, 120)、軌道の半径 80、太陽の光は左から） ----
  // 角度 0° 右（満月）、90° 上（下弦の月）、180° 左（新月）、270° 下（上弦の月）。月は反時計回りに公転する
  const MOON_R = 80;
  function moonAt(deg) { return onCircle(160, 120, MOON_R, deg); }
  function moonOrbit() {
    const items = [
      { type: 'arrow', x1: 6, y1: 60, x2: 40, y2: 60, color: 'orange' },
      { type: 'arrow', x1: 6, y1: 120, x2: 40, y2: 120, color: 'orange' },
      { type: 'arrow', x1: 6, y1: 180, x2: 40, y2: 180, color: 'orange' },
      { type: 'text', x: 6, y: 40, text: '太陽の光', size: 12 },
      arcLine(160, 120, MOON_R, 0, 360, { color: 'gray', width: 1.5, dashed: true }),
      arcLine(160, 120, 100, 300, 330, { color: 'blue', width: 3, arrow: true }),
      ...litBody(160, 120, 14, 180, 'sky', NIGHT),
      { type: 'text', x: 160, y: 152, text: '地球', size: 12, anchor: 'middle' },
    ];
    for (let a = 0; a < 360; a += 45) { const [x, y] = moonAt(a); items.push(...litBody(x, y, 9, 180, 'yellow', DARK)); }
    return items;
  }

  // ---- 金星の位置（真上から見た図。太陽 (160, 95)、金星の軌道の半径 58、地球 (160, 210)） ----
  const VENUS = { left: onCircle(160, 95, 58, 180), right: onCircle(160, 95, 58, 0), far: onCircle(160, 95, 58, 90) };
  function venusBase() {
    const items = [
      { type: 'circle', x: 160, y: 95, r: 58, fill: 'none', stroke: 'gray' },
      arcLine(160, 95, 115, 235, 305, { color: 'gray', width: 1.5, dashed: true }),
      { type: 'circle', x: 160, y: 95, r: 16, fill: 'yellow', stroke: 'orange' },
      { type: 'text', x: 160, y: 126, text: '太陽', size: 12, anchor: 'middle' },
      ...litBody(160, 210, 12, 90, 'sky', NIGHT),
      arcLine(160, 210, 22, 200, 340, { color: 'blue', width: 2, arrow: true }),
      { type: 'text', x: 190, y: 234, text: '地球', size: 12 },
    ];
    Object.keys(VENUS).forEach(k => {
      const [x, y] = VENUS[k];
      const toSun = Math.atan2(-(95 - y), 160 - x) / D;
      items.push(...litBody(x, y, 7, toSun, 'yellow', DARK));
    });
    return items;
  }

  // ---- 日食・月食の並び方（3 つの小さな図。ア 太陽・月・地球、イ 太陽・地球・月、ウ 月が直角の位置） ----
  function eclipsePanels() {
    return [
      { type: 'line', points: [[6, 84], [314, 84]], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [[6, 160], [314, 160]], color: 'gray', width: 1, dashed: true },
      { type: 'circle', x: 36, y: 40, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: 150, y: 40, r: 7, fill: DARK, stroke: 'line' },
      { type: 'circle', x: 230, y: 40, r: 13, fill: 'sky', stroke: 'line' },
      { type: 'text', x: 36, y: 74, text: '太陽', size: 12, anchor: 'middle' },
      { type: 'text', x: 150, y: 64, text: '月', size: 12, anchor: 'middle' },
      { type: 'text', x: 230, y: 70, text: '地球', size: 12, anchor: 'middle' },
      { type: 'circle', x: 36, y: 120, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: 150, y: 120, r: 13, fill: 'sky', stroke: 'line' },
      { type: 'circle', x: 230, y: 120, r: 7, fill: DARK, stroke: 'line' },
      { type: 'text', x: 36, y: 154, text: '太陽', size: 12, anchor: 'middle' },
      { type: 'text', x: 150, y: 150, text: '地球', size: 12, anchor: 'middle' },
      { type: 'text', x: 230, y: 144, text: '月', size: 12, anchor: 'middle' },
      { type: 'circle', x: 36, y: 205, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: 150, y: 205, r: 13, fill: 'sky', stroke: 'line' },
      { type: 'circle', x: 150, y: 176, r: 7, fill: DARK, stroke: 'line' },
      { type: 'text', x: 36, y: 237, text: '太陽', size: 12, anchor: 'middle' },
      { type: 'text', x: 150, y: 234, text: '地球', size: 12, anchor: 'middle' },
      { type: 'text', x: 164, y: 181, text: '月', size: 12 },
    ];
  }

  // ================================================================
  // 領域 1: 地球の動きと天体の見え方
  // ================================================================

  // ---- ステージ space-1: 天体の日周運動 ----
  const space1 = {
    id: 'space-1', areaId: 'sp-earth', title: '天体の日周運動', minutes: 5, concepts: ['sp-rotation', 'sp-hemisphere'],
    lessons: [
      {
        id: 'space-1-c1',
        anim: 'sp-rotation',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '地球は、北極と南極を結ぶ**地軸**を中心に、西から東へ 1 日に 1 回転しています。これを**自転**といいます。そのため、太陽や星は東から西へ動いて見えます。この見かけの動きを**日周運動**といい、1 時間に約 15° 動きます。',
        // 北極の真上から見た地球。反時計回りに自転し、左から太陽の光が当たる
        figure: scene(earthFromPole().concat([
          { type: 'text', x: 66, y: 126, text: '正午', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 196, text: '夕方', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 222, y: 126, text: '真夜中', size: 13, bold: true },
          { type: 'text', x: 160, y: 62, text: '明け方', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 236, y: 176, text: '自転の向き', size: 12 },
          { type: 'text', x: 316, y: 232, text: '北極の真上から見た図', size: 12, anchor: 'end' },
        ])),
      },
      {
        id: 'space-1-c2',
        text: '**透明半球**を使うと、太陽の動きを記録できます。ペン先の影が半球の中心にくるようにして、1 時間ごとに印をつけます。印の間隔は等しく、印を結んだ曲線をのばして底の円と交わる点が、日の出・日の入りの位置です。',
        // 写真: 台の上の透明半球（南側のななめ上から見る。半球が枠いっぱい）。1 時間ごとの●が弓なりに並び、弓は手前（南）へかたむく
        // 画像の位置: ●の列 (39, 145)〜いちばん高い所 (152, 57)〜(266, 175)、半球のふちの左はし (27, 150)・右はし (295, 150)、台の中心 (160, 165)
        // 点線は●の列をふちまでのばした所（写真にはないので線で足す）
        figure: scene([
          photo('space-1-c2'),
          { type: 'line', points: [[266, 175], [272, 190]], color: 'blue', width: 2, dashed: true },
          { type: 'line', points: [[39, 145], [33, 158]], color: 'blue', width: 2, dashed: true },
          tag(4, 16, '●：1 時間ごとの印', { size: 13, anchor: 'start' }),
          tag(316, 16, '点線：曲線をのばす', { size: 13, anchor: 'end' }),
          tag(160, 234, '南', { size: 15, bold: true }),
          tag(250, 40, '北（おく）', { size: 13 }),
          tag(306, 130, '東', { size: 15, bold: true }),
          tag(14, 130, '西', { size: 15, bold: true }),
          pointer(284, 204, 273, 192), tag(290, 218, '日の出', { size: 13 }),
          pointer(32, 172, 33, 160), tag(34, 186, '日の入り', { size: 13 }),
          pointer(132, 196, 159, 176), tag(112, 208, '中心', { size: 13 }),
        ]),
      },
      {
        id: 'space-1-c3',
        text: '太陽は東の空からのぼり、南の空を通って、西の空へしずみます。太陽が真南にくることを**南中**といい、そのときの地平線からの角度を**南中高度**といいます。太陽が南中するとき、太陽の高度はその日でいちばん高くなります。',
        // 北と南を結ぶ面で見た図。真南の空の太陽と南中高度
        figure: scene(noonBase().concat([
          { type: 'line', points: [[150, 200], NOON.equinox], color: 'gray', width: 2 },
          arcLine(150, 200, 36, 0, 55, { color: 'blue', width: 2 }),
          { type: 'circle', x: NOON.equinox[0], y: NOON.equinox[1], r: 11, fill: 'yellow', stroke: 'orange' },
          { type: 'text', x: 196, y: 186, text: '南中高度', size: 13, bold: true },
          { type: 'text', x: 246, y: 80, text: '南中した太陽', size: 12 },
          { type: 'text', x: 8, y: 22, text: '太陽が真南にくる＝南中', size: 13, bold: true },
        ])),
      },
      {
        id: 'space-1-c4',
        text: '星も東から西へ動いて見えます。北の空の星は、**北極星**を中心に反時計回りに回ります。北極星は地軸をのばした先の近くにあるので、ほとんど動きません。東の空では右上へ、南の空では左から右へ、西の空では右下へ動きます。',
        // 写真: 北の空の星を長い時間写したもの。北極星 (88, 98) を中心に星が光のすじをえがく
        figure: scene([
          photo('space-1-c4'),
          tag(108, 30, '北の空の星の動き', { size: 13 }),
          pointer(226, 88, 94, 98),
          tag(260, 86, '北極星', { size: 15, bold: true }),
          tag(262, 104, 'ほとんど動かない', { size: 13 }),
          arcLine(88, 98, 34, 200, 300, { color: 'blue', width: 3, arrow: true }),
          tag(262, 138, '北極星を中心に', { size: 13 }),
          tag(262, 156, '反時計回りに回る', { size: 13, bold: true }),
          tag(260, 192, '東の空：右上へ', { size: 13 }),
          tag(254, 210, '南の空：左から右へ', { size: 13 }),
          tag(260, 228, '西の空：右下へ', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'space-1-w1', concept: 'sp-rotation',
      prompt: '予想しよう。太陽が朝に東からのぼり、夕方に西へしずむように見えるのはなぜだと思う？',
      options: ['地球が自転しているから', '太陽が 1 日で地球のまわりを 1 周しているから', '地球が太陽に近づいたり遠ざかったりするから'],
      answer: 'a',
      explanation: '動いているのは太陽ではなく、地球のほうです。地球が西から東へ自転しているので、太陽は東から西へ動いて見えます。このステージで確かめていこう。',
      hint: '走る電車の窓から見ると、外の景色が後ろへ動いて見えることを思い出そう。',
    }),
    problems: [
      choice({
        id: 'space-1-p1', concept: 'sp-rotation',
        prompt: '地球の自転の向きと、太陽が動いて見える向きの組み合わせとして、正しいものはどれ？',
        options: ['自転は西から東、太陽は東から西へ動いて見える', '自転は東から西、太陽は東から西へ動いて見える', '自転は西から東、太陽は西から東へ動いて見える'],
        answer: 'a',
        explanation: '地球は西から東へ自転しています。地球の上にいるわたしたちから見ると、太陽は反対の向きの東から西へ動いて見えます。',
        hint: '見かけの動きは、地球の動きと反対の向きになるよ。',
      }),
      fill({
        id: 'space-1-t1', concept: 'sp-rotation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地球が地軸を中心に 1 日に 1 回転することを[b1]といい、そのために天体が東から西へ動いて見えることを[b2]という。',
        blanks: [
          word('b1', ['自転', '公転', '日周運動'], '自転'),
          word('b2', ['自転', '公転', '日周運動'], '日周運動'),
        ],
        explanation: '地球そのものの回転が**自転**、それによって天体が 1 日で動いて見える見かけの動きが**日周運動**です。「動いているのは地球」と覚えておこう。',
        hint: '「1 日」の動きを表す言葉をさがそう。',
      }),
      fill({
        id: 'space-1-p2', concept: 'sp-rotation',
        prompt: '空らんに入る数を入れよう。',
        text: '太陽は 1 時間に約 15° 動いて見える。3 時間では約[b1]動いて見える。',
        blanks: [number('b1', 45, 0, '°')],
        explanation: '1 時間に約 15° なので、3 時間では 15° × 3 ＝ 45° です。地球は 24 時間で 360° 自転するので、360° ÷ 24 ＝ 15° になります。',
        hint: '15° に時間をかけよう。',
      }),
      figureChoice({
        id: 'space-1-p3', concept: 'sp-rotation',
        prompt: '地球を北極の真上から見た図です。太陽の光は左から当たり、地球は青い矢印の向き（反時計回り）に自転しています。ア〜ウのうち、夕方（日の入りのころ）の地点はどれ？（ア 太陽のほうを向いた地点、イ 図の下側の地点、ウ 太陽と反対側の地点）',
        figure: scene(earthFromPole().concat([
          region('r1', 88, 120, 'ア'),
          region('r2', 160, 192, 'イ'),
          region('r3', 232, 120, 'ウ'),
        ])),
        answer: 'r2',
        explanation: 'アは太陽の正面なので正午、ウは太陽と反対側なので真夜中です。正午のアの地点は、自転の向きに進んでイの位置に来ると、昼の側から夜の側へ入ろうとしているので夕方になります。',
        hint: '正午の地点が、矢印の向きに回るとどこへ進むか考えよう。',
      }),
      drag({
        id: 'space-1-p4', concept: 'sp-hemisphere',
        prompt: '透明半球を使って、太陽の位置を記録します。ペンの先の影（「影」の丸）を動かして、印をつけるときに影を合わせる位置に置こう。',
        // 影は透明半球の中心 O (160, 170) に合わせる
        figure: scene(hemisphereBase().concat(sunPathItems(0, 9, 14)).concat([
          { type: 'circle', id: 'shadow', x: 276, y: 218, r: 14, fill: '#B8BEC8', stroke: 'ink', label: '影' },
        ])),
        draggable: { itemId: 'shadow', axis: 'xy' },
        target: { x: HX, y: HY },
        samples: { correct: { x: 160, y: 170 }, wrong: { x: 200, y: 200 } },
        explanation: 'ペンの先の影が透明半球の中心（観測者の位置）にくるようにして印をつけます。こうすると、中心から見た太陽の方向が半球の上に記録されます。底の円の十字の線が交わる点が中心です。',
        hint: '透明半球の中心は、観測している人の位置を表しているよ。',
      }),
      figureChoice({
        id: 'space-1-p5', concept: 'sp-hemisphere',
        prompt: '夏のある日、透明半球に 1 時間ごとの太陽の位置（●）を記録し、なめらかな線で結んで、点線でのばしました。ア〜ウのうち、日の出の位置はどれ？（ア 東側の点線が底の円に達したところ、イ 最初につけた記録、ウ 西側の点線が底の円に達したところ）',
        figure: scene(hemisphereBase().concat(sunPathItems(SUMMER, 8, 16)).concat([
          region('r1', SUMMER_RISE[0], SUMMER_RISE[1], 'ア'),
          region('r2', SUMMER_8[0], SUMMER_8[1], 'イ'),
          region('r3', SUMMER_SET[0], SUMMER_SET[1], 'ウ'),
        ])),
        answer: 'r1',
        explanation: '太陽は東からのぼるので、日の出の位置は東側です。記録した曲線を東側へのばして、底の円（地平線）と交わったアが日の出の位置です。イは記録を始めた時刻の位置で、ウは日の入りの位置です。',
        hint: '太陽が地平線から出てくるところは、底の円の上にあるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-1-r1', concept: 'sp-rotation',
        prompt: '天体が 1 時間に約 15° 動いて見えるのはなぜ？',
        options: ['地球が 24 時間で 360° 自転するから', '地球が 1 年で 360° 公転するから', '太陽が 1 時間に 15° ずつ地球のまわりを回るから'],
        answer: 'a',
        explanation: '地球は 1 日（24 時間）で 1 回転（360°）自転します。360° ÷ 24 ＝ 15° なので、天体は 1 時間に約 15° 動いて見えます。',
        hint: '360° を 24 時間でわってみよう。',
      }),
      choice({
        id: 'space-1-r2', concept: 'sp-hemisphere',
        prompt: '透明半球に 1 時間ごとにつけた印の間隔が、どこでも等しくなっていました。このことから分かることはどれ？',
        options: ['太陽は一定の速さで動いて見える', '太陽は正午ごろに速く動いて見える', '太陽は朝と夕方に速く動いて見える'],
        answer: 'a',
        explanation: '1 時間ごとの間隔が等しいので、太陽は一定の速さで動いて見えます。これは、地球が一定の速さで自転しているからです。',
        hint: '同じ時間に同じ長さだけ動いていると考えよう。',
      }),
      fill({
        id: 'space-1-r3', concept: 'sp-hemisphere',
        prompt: '空らんに入る数を入れよう。',
        text: '透明半球の記録で、1 時間ごとの印の間隔は 2.4 cm だった。午前 9 時の印から、曲線を東側へのばして底の円と交わった点までの長さは 7.2 cm だった。日の出の時刻は午前[b1]ごろである。',
        blanks: [number('b1', 6, 0, '時')],
        explanation: '7.2 cm ÷ 2.4 cm ＝ 3 なので、日の出の位置は 9 時の印より 3 時間分前です。9 時 − 3 時間 ＝ 午前 6 時ごろになります。',
        hint: '7.2 cm が、何時間分の長さかを考えよう。',
      }),
      figureChoice({
        id: 'space-1-r4', concept: 'sp-rotation',
        prompt: 'ア〜ウは、ある方角の空で、星が動いて見えるようすを表した図です（ア 地平線から右上へのぼる、イ 右下へ地平線に向かう、ウ 1 つの星を中心に回る）。東の空の星の動きはどれ？',
        figure: scene([
          ...skyPanel(8, 16, 96, 150, 'east'),
          ...skyPanel(112, 16, 96, 150, 'west'),
          ...skyPanel(216, 16, 96, 150, 'north'),
          region('r1', 56, 196, 'ア'),
          region('r2', 160, 196, 'イ'),
          region('r3', 264, 196, 'ウ'),
        ]),
        answer: 'r1',
        explanation: '星は東からのぼって南の空を通り、西へしずみます。東の空を向くと南は右側なので、星は右上へのぼっていくアです。イは西の空、ウは北の空のようすです。',
        hint: '東の空を向いて立つと、南はどちらの手の側になるか考えよう。',
      }),
      choice({
        id: 'space-1-t2', concept: 'sp-hemisphere', term: true,
        prompt: '次の説明に合う言葉はどれ？「太陽などの天体が、真南にくること」',
        options: ['南中', '日の出', '自転'],
        answer: 'a',
        explanation: '天体が真南にくることを**南中**といいます。太陽が南中したときの高度を南中高度といい、その日の太陽の高度がいちばん高くなります。',
        hint: '「南」の字が入る言葉だよ。',
      }),
    ],
  };

  // ---- ステージ space-2: 年周運動と季節 ----
  const space2 = {
    id: 'space-2', areaId: 'sp-earth', title: '年周運動と季節', minutes: 5, concepts: ['sp-revolution', 'sp-season'],
    lessons: [
      {
        id: 'space-2-c1',
        anim: 'sp-annual-orion',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '地球は太陽のまわりを 1 年に 1 回、西から東へ回っています。これを**公転**といいます。そのため、同じ時刻に見える星座の位置は、1 か月に約 30° ずつ東から西へ動いて見えます。これを**年周運動**といいます。',
        // 南の空。午後 8 時に見えるオリオン座の位置が、1 か月ごとに西へ約 30° ずつ動く
        figure: scene([
          arcLine(160, 200, 140, 10, 170, { color: 'gray', width: 1.5, dashed: true }),
          arcLine(160, 200, 162, 84, 40, { color: 'blue', width: 3, arrow: true }),
          { type: 'line', points: [[6, 200], [314, 200]], color: 'brown', width: 3 },
          ...[90, 60, 30].map(a => { const [x, y] = onCircle(160, 200, 140, a); return { type: 'circle', x, y, r: 7, fill: 'yellow', stroke: 'orange' }; }),
          { type: 'text', x: 150, y: 64, text: '2月15日', size: 12, anchor: 'end' },
          { type: 'text', x: 220, y: 98, text: '3月15日', size: 12, anchor: 'end' },
          { type: 'text', x: 270, y: 150, text: '4月15日', size: 12, anchor: 'end' },
          { type: 'text', x: 24, y: 220, text: '東', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 220, text: '南', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 296, y: 220, text: '西', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 8, y: 20, text: '午後 8 時のオリオン座の位置', size: 12, bold: true },
          { type: 'text', x: 8, y: 38, text: '1 か月に約 30° 西へ', size: 12 },
        ]),
      },
      {
        id: 'space-2-c2',
        anim: 'sp-orbit-midnight',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '地球から見ると、太陽は星座のあいだを 1 年かけて動いていくように見えます。この太陽の通り道を**黄道**といいます。真夜中に南の空に見えるのは、地球から見て太陽と反対側にある星座です。',
        // 太陽のまわりを公転する地球と、季節の星座
        figure: scene(orbitBase(false).concat(starDots()).concat([
          { type: 'line', points: [[232, 120], [282, 120]], color: 'blue', width: 2, dashed: true, arrow: true },
          { type: 'text', x: 226, y: 146, text: '冬', size: 13, bold: true },
          { type: 'text', x: 176, y: 70, text: '春', size: 13, bold: true },
          { type: 'text', x: 86, y: 146, text: '夏', size: 13, anchor: 'end', bold: true },
          { type: 'text', x: 176, y: 200, text: '秋', size: 13, bold: true },
          { type: 'text', x: 4, y: 236, text: '冬の真夜中→オリオン座が南中', size: 12 },
        ])),
      },
      {
        id: 'space-2-c3',
        anim: 'sp-seasons',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '地球は、**地軸**を公転面に垂直な向きから約 23.4° 傾けたまま公転しています。そのため、**夏至**のころは南中高度が高く昼が長くなり、**冬至**のころは南中高度が低く昼が短くなります。この変化で季節が生まれます。',
        // 公転面を横から見た図。左の地球は北極が太陽のほうへ傾く（夏至）、右は反対（冬至）
        figure: scene(seasonSide().concat([
          { type: 'text', x: 40, y: 150, text: '夏至', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 280, y: 150, text: '冬至', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 198, text: '春分・秋分', size: 12, anchor: 'middle' },
          { type: 'text', x: 8, y: 22, text: '矢印の先が北極（地軸の傾き 23.4°）', size: 12 },
          { type: 'text', x: 160, y: 222, text: '北極が太陽のほうへ傾くと北半球は夏', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'space-2-c4',
        anim: 'sp-noon-altitude',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '**春分**・**秋分**の日の南中高度は、90° −（その地点の緯度）で求められます。夏至は 23.4° 高く、冬至は 23.4° 低くなります。北緯 35° の地点では、春分・秋分 55°、夏至 78.4°、冬至 31.6° です。',
        // 北緯 35° の地点の南中高度（北と南を結ぶ面で見た図）
        figure: scene(noonBase().concat([
          { type: 'line', points: [[150, 200], NOON.summer], color: 'gray', width: 1.5 },
          { type: 'line', points: [[150, 200], NOON.equinox], color: 'gray', width: 1.5 },
          { type: 'line', points: [[150, 200], NOON.winter], color: 'gray', width: 1.5 },
          { type: 'circle', x: NOON.summer[0], y: NOON.summer[1], r: 9, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: NOON.equinox[0], y: NOON.equinox[1], r: 9, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: NOON.winter[0], y: NOON.winter[1], r: 9, fill: 'yellow', stroke: 'orange' },
          { type: 'text', x: 190, y: 60, text: '夏至', size: 12 },
          { type: 'text', x: 244, y: 84, text: '春分・秋分', size: 12 },
          { type: 'text', x: 282, y: 124, text: '冬至', size: 12 },
          { type: 'text', x: 8, y: 20, text: '北緯 35° の地点', size: 12, bold: true },
          { type: 'text', x: 8, y: 38, text: '夏至 78.4°', size: 12 },
          { type: 'text', x: 8, y: 54, text: '春分・秋分 55°', size: 12 },
          { type: 'text', x: 8, y: 70, text: '冬至 31.6°', size: 12 },
        ])),
      },
    ],
    warmup: choice({
      id: 'space-2-w1', concept: 'sp-revolution',
      prompt: '予想しよう。冬の夜によく見えるオリオン座は、夏の夜には見えません。なぜだと思う？',
      options: ['地球が公転していて、夏はオリオン座が太陽と同じ方向にあるから', '夏になるとオリオン座の星が光らなくなるから', '夏は夜が短く、星がまったく見えないから'],
      answer: 'a',
      explanation: '地球が太陽のまわりを公転しているので、季節によって、夜の側に見える星座が変わります。夏はオリオン座が太陽と同じ方向にあり、昼の空にあるので見えません。このステージでそのしくみを学ぼう。',
      hint: '星座は、昼の空にも出ているけれど、明るくて見えないことを思い出そう。',
    }),
    problems: [
      choice({
        id: 'space-2-p1', concept: 'sp-revolution',
        prompt: '毎日同じ時刻に星座を観察すると、星座の位置は 1 か月でどのように変わって見える？',
        options: ['東から西へ約 30° 動く', '西から東へ約 30° 動く', '東から西へ約 15° 動く', '変わらない'],
        answer: 'a',
        explanation: '地球は 1 年（12 か月）で 360° 公転するので、1 か月では約 30° です。同じ時刻に見える星座は、1 か月に約 30° ずつ東から西へ動いて見えます。15° は 1 時間の日周運動の角度です。',
        hint: '360° を 12 か月でわってみよう。',
      }),
      fill({
        id: 'space-2-t1', concept: 'sp-revolution', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地球が太陽のまわりを 1 年に 1 回まわることを[b1]といい、そのために星座の見える位置が 1 年で 1 周するように動いて見えることを[b2]という。',
        blanks: [
          word('b1', ['公転', '自転', '年周運動'], '公転'),
          word('b2', ['公転', '自転', '年周運動'], '年周運動'),
        ],
        explanation: '太陽のまわりを回る地球の動きが**公転**、それによる星座の見かけの 1 年の動きが**年周運動**です。1 日の動きの「日周運動」と区別しよう。',
        hint: '「1 年」の動きを表す言葉をさがそう。',
      }),
      figureChoice({
        id: 'space-2-p3', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が A の位置にあるとき、日本は冬です。ア〜ウのうち、このとき真夜中に南の空に見える星座はどれ？（ア オリオン座、イ さそり座、ウ しし座）',
        figure: scene(orbitBase(true).concat([
          region('r1', STARS.orion[0], STARS.orion[1], 'ア'),
          region('r2', STARS.scorpius[0], STARS.scorpius[1], 'イ'),
          region('r3', STARS.leo[0], STARS.leo[1], 'ウ'),
        ])),
        answer: 'r1',
        explanation: '真夜中は、地球の太陽と反対側を向いた地点です。地球が A にあるとき、太陽と反対の方向にあるアのオリオン座が真夜中に南中します。イのさそり座は太陽と同じ方向にあるので見えません。',
        hint: '真夜中の地点は、太陽と反対の方向を向いているよ。',
      }),
      choice({
        id: 'space-2-p4', concept: 'sp-season',
        prompt: '日本で、夏至のころの太陽の南中高度と昼の長さとして、正しいものはどれ？',
        options: ['南中高度は高く、昼は長い', '南中高度は高く、昼は短い', '南中高度は低く、昼は長い', '南中高度は低く、昼は短い'],
        answer: 'a',
        explanation: '夏至のころは、北半球が太陽のほうへ傾いているので、南中高度が 1 年でいちばん高く、昼がいちばん長くなります。冬至のころはその反対です。',
        hint: '夏の太陽は、高いところを長い時間通っていくよ。',
      }),
      figureChoice({
        id: 'space-2-p5', concept: 'sp-season',
        prompt: '太陽のまわりを公転する地球を横から見た図です（矢印の先が北極で、地軸の傾きの向きはいつも同じ）。ア〜ウのうち、日本が夏至のときの地球の位置はどれ？（ア 左の地球、イ 右の地球、ウ 手前の地球）',
        figure: scene(seasonSide().concat([
          region('r1', 40, 168, 'ア'),
          region('r2', 280, 168, 'イ'),
          region('r3', 160, 204, 'ウ'),
        ])),
        answer: 'r1',
        explanation: '夏至は、北極側（北半球）が太陽のほうへ傾いている位置です。アの地球は北極が太陽のある右のほうへ傾いているので夏至です。イは北極が太陽と反対に傾く冬至、ウは春分か秋分のころです。',
        hint: '北極の矢印が、太陽のほうへ傾いている地球をさがそう。',
      }),
      fill({
        id: 'space-2-p6', concept: 'sp-season',
        prompt: '空らんに入る数を入れよう。',
        text: '北緯 35° の地点で、夏至の日の太陽の南中高度は[b1]である。（地軸の傾きは 23.4° とする）',
        blanks: [number('b1', 78.4, 0.1, '°')],
        explanation: '春分・秋分の南中高度は 90° − 35° ＝ 55° です。夏至はそれより 23.4° 高いので、55° ＋ 23.4° ＝ 78.4° になります。',
        hint: 'まず春分の南中高度（90° − 緯度）を出してから、23.4° をたそう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'space-2-r1', concept: 'sp-revolution',
        prompt: '空らんに入る数を入れよう。',
        text: '1 月 1 日の午後 8 時に南中した星は、2 月 1 日には午後[b1]ごろに南中する。',
        blanks: [number('b1', 6, 0, '時')],
        explanation: '1 か月たつと、同じ時刻の星の位置は約 30° 西へずれます。日周運動では 30° は 2 時間分なので、南中する時刻は 2 時間早くなり、午後 6 時ごろになります。',
        hint: '1 か月で約 30°、日周運動では 1 時間に約 15° 動くことを組み合わせよう。',
      }),
      figureChoice({
        id: 'space-2-r2', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。ア〜ウのうち、真夜中にさそり座が南の空に見えるのは、地球がどの位置にあるとき？（ア 左の位置、イ 右の位置、ウ 上の位置）',
        figure: scene(orbitBase(false).concat([
          region('r1', ORBIT.C[0], ORBIT.C[1], 'ア'),
          region('r2', ORBIT.A[0], ORBIT.A[1], 'イ'),
          region('r3', ORBIT.B[0], ORBIT.B[1], 'ウ'),
        ])),
        answer: 'r1',
        explanation: '真夜中に南中するのは、地球から見て太陽と反対の方向にある星座です。さそり座と太陽のあいだに地球がくるアの位置なら、真夜中にさそり座が南の空に見えます。イの位置では、さそり座は太陽と同じ方向になり見えません。',
        hint: '太陽・地球・さそり座がこの順に並ぶ位置をさがそう。',
      }),
      choice({
        id: 'space-2-r3', concept: 'sp-season',
        prompt: '日本に季節の変化があるのはなぜ？',
        options: ['地軸を傾けたまま公転しているから', '地球と太陽の距離が季節で大きく変わるから', '地球の自転の速さが季節で変わるから'],
        answer: 'a',
        explanation: '地球は地軸を傾けたまま公転しているので、季節によって南中高度と昼の長さが変わります。太陽の光が高い角度で長い時間当たる夏は暑くなります。',
        hint: '夏至と冬至の地球の図で、何が変わらなかったか思い出そう。',
      }),
      fill({
        id: 'space-2-r4', concept: 'sp-season',
        prompt: '空らんに入る数を入れよう。',
        text: '北緯 35° の地点で、春分の日の太陽の南中高度は[b1]である。',
        blanks: [number('b1', 55, 0.1, '°')],
        explanation: '春分・秋分の日の南中高度は、90° −（緯度）で求められます。90° − 35° ＝ 55° です。',
        hint: '90° から緯度をひこう。',
      }),
      fill({
        id: 'space-2-r5', concept: 'sp-revolution',
        prompt: '空らんに入る数を入れよう。',
        text: 'ある星座が午後 8 時に南中した。2 か月後の同じ午後 8 時には、この星座は南中した位置から西へ約[b1]動いた位置に見える。',
        blanks: [number('b1', 60, 0, '°')],
        explanation: '年周運動では、1 か月に約 30° 西へ動きます。2 か月では 30° × 2 ＝ 60° です。',
        hint: '1 か月に約 30° だったね。',
      }),
      choice({
        id: 'space-2-t2', concept: 'sp-season', term: true,
        prompt: '次の説明に合う言葉はどれ？「北半球で、太陽の南中高度が 1 年でいちばん高く、昼がいちばん長くなる日」',
        options: ['夏至', '冬至', '春分'],
        answer: 'a',
        explanation: '南中高度がいちばん高く、昼がいちばん長い日が**夏至**（6 月下旬）です。いちばん低く短いのが冬至（12 月下旬）です。',
        hint: '「夏」の字が入る言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 太陽系
  // ================================================================

  // ---- ステージ space-3: 月の満ち欠けと日食・月食 ----
  const space3 = {
    id: 'space-3', areaId: 'sp-solar', title: '月の満ち欠けと日食・月食', minutes: 5, concepts: ['sp-moon'],
    lessons: [
      {
        id: 'space-3-c1',
        anim: 'sp-moon-phase',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '月は、地球のまわりを約 1 か月で 1 回公転している**衛星**です。月は自分では光を出さず、太陽の光を反射して光っています。太陽・地球・月の位置関係が変わるので、光って見える部分の形が変わります。これを**満ち欠け**といいます。',
        // 真上から見た月の公転。どの位置でも太陽のほうの半分が光っている
        figure: scene(moonOrbit().concat([
          { type: 'text', x: 316, y: 236, text: '月の公転の向き', size: 12, anchor: 'end' },
          { type: 'text', x: 316, y: 20, text: '北極側から見た図', size: 12, anchor: 'end' },
        ])),
      },
      {
        id: 'space-3-c2',
        text: '月は、**新月** → 三日月 → **上弦の月** → **満月** → **下弦の月** → 新月 の順に満ち欠けし、約 29.5 日でもとにもどります。夕方、南の空に見える右半分が光った月が上弦の月です。',
        // 写真: 左から 新月・三日月・上弦の月・満月・下弦の月（月の中心 x = 34, 96, 160, 222, 286、y = 56）
        figure: scene([
          photo('space-3-c2'),
          tag(34, 108, '新月', { size: 13 }),
          tag(96, 108, '三日月', { size: 13 }),
          tag(160, 108, '上弦の月', { size: 13 }),
          tag(222, 108, '満月', { size: 13 }),
          tag(286, 108, '下弦の月', { size: 13 }),
          { type: 'arrow', x1: 24, y1: 130, x2: 296, y2: 130, color: 'blue' },
          tag(160, 156, '約 29.5 日でもとの形にもどる', { size: 13 }),
          tag(160, 188, '地球から見た月の形（日本で見たとき）', { size: 13 }),
        ]),
      },
      {
        id: 'space-3-c3',
        text: '太陽・月・地球の順に一直線に並び、月が太陽をかくす現象を**日食**といいます（新月のとき）。太陽・地球・月の順に並び、月が地球の影に入る現象を**月食**といいます（満月のとき）。',
        // 写真: 左は皆既日食（黒い月のまわりにコロナ）、右は皆既月食（赤銅色の月）
        figure: scene([
          photo('space-3-c3'),
          tag(84, 186, '日食（新月のころ）', { bold: true }),
          tag(84, 208, '月が太陽をかくす', { size: 13 }),
          tag(84, 228, 'まわりはコロナ', { size: 13 }),
          tag(238, 186, '月食（満月のころ）', { bold: true }),
          tag(238, 208, '月が地球の影に入る', { size: 13 }),
          tag(238, 228, '赤黒い色に見える', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'space-3-w1', concept: 'sp-moon',
      prompt: '予想しよう。月の形が日によって変わって見えるのはなぜだと思う？',
      options: ['太陽・地球・月の位置関係が変わり、光って見える部分が変わるから', '地球の影が月にうつって、欠けて見えるから', '月そのものの形が変わるから'],
      answer: 'a',
      explanation: '月はいつも太陽のほうの半分が光っています。月が公転して位置が変わると、地球から見える光った部分の形が変わります。地球の影が関係するのは月食のときです。このステージで確かめよう。',
      hint: 'ボールに横から光を当てて、まわりから見るようすを想像しよう。',
    }),
    problems: [
      choice({
        id: 'space-3-p1', concept: 'sp-moon',
        prompt: '満月のとき、太陽・地球・月はどのように並んでいる？',
        options: ['太陽・地球・月の順', '太陽・月・地球の順', '月が太陽と地球を結ぶ線から直角の方向にある'],
        answer: 'a',
        explanation: '満月は、地球から見て月が太陽と反対側にあり、光った半分が全部こちらを向いているときです。だから太陽・地球・月の順に並んでいます。太陽・月・地球の順なら新月です。',
        hint: '月の光った面が全部地球を向くのはどんなときか考えよう。',
      }),
      fill({
        id: 'space-3-t1', concept: 'sp-moon', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '太陽・月・地球の順に並び、月が太陽をかくす現象を[b1]、太陽・地球・月の順に並び、月が地球の影に入る現象を[b2]という。',
        blanks: [
          word('b1', ['日食', '月食', '満ち欠け'], '日食'),
          word('b2', ['日食', '月食', '満ち欠け'], '月食'),
        ],
        explanation: '太陽が欠けて見えるのが**日食**、月が欠けて見えるのが**月食**です。かくされるほうの天体の名前が付いていると考えると覚えやすいです。',
        hint: '欠けて見えるのは、太陽か月かで考えよう。',
      }),
      figureChoice({
        id: 'space-3-p2', concept: 'sp-moon',
        prompt: '地球と月の公転を北極側から見た図です（太陽の光は左から、月は反時計回りに公転）。夕方、南の空に右半分が光った月が見えました。ア〜ウのうち、このときの月の位置はどれ？（ア 図の下、イ 図の上、ウ 図の右）',
        figure: scene(moonOrbit().concat([
          region('r1', ...moonAt(270), 'ア'),
          region('r2', ...moonAt(90), 'イ'),
          region('r3', ...moonAt(0), 'ウ'),
        ])),
        answer: 'r1',
        explanation: '夕方に南の空に見える右半分が光った月は、上弦の月です。新月（太陽のほうの位置）から 4 分の 1 公転したアの位置にあります。イは下弦の月、ウは満月の位置です。',
        hint: '新月の位置から、月が公転の向きに 4 分の 1 回ったところをさがそう。',
      }),
      drag({
        id: 'space-3-p3', concept: 'sp-moon',
        prompt: '地球と月の公転を北極側から見た図です（太陽の光は左から）。右下の「月」の丸を動かして、満月になるときの月の位置に重ねよう。',
        // 満月は太陽と反対側の (240, 120)。となりの位置は 61 px はなれる
        figure: scene(moonOrbit().concat([
          { type: 'circle', id: 'moon', x: 292, y: 218, r: 14, fill: 'white', stroke: 'blue', label: '月' },
        ])),
        draggable: { itemId: 'moon', axis: 'xy' },
        target: { x: moonAt(0)[0], y: moonAt(0)[1] },
        samples: { correct: { x: 240, y: 120 }, wrong: { x: 217, y: 177 } },
        explanation: '満月は、地球から見て月が太陽と反対側にあるときです。太陽の光は左から来るので、地球の右側の位置が満月です。このとき、月の光った半分が全部地球のほうを向いています。',
        hint: '太陽・地球・月の順に一直線に並ぶ位置をさがそう。',
      }),
      choice({
        id: 'space-3-p4', concept: 'sp-moon',
        prompt: '日食が起こるのは、月がどの形のとき？',
        options: ['新月', '上弦の月', '満月', '下弦の月'],
        answer: 'a',
        explanation: '日食は、太陽・月・地球の順に一直線に並ぶときに起こります。このとき月は太陽のほうにあるので、新月です。ただし月の通り道が少し傾いているので、新月のたびに日食が起こるわけではありません。',
        hint: '月が太陽と地球のあいだにあるときの形を考えよう。',
      }),
      figureChoice({
        id: 'space-3-p5', concept: 'sp-moon',
        prompt: 'ア〜ウは、太陽・地球・月の並び方を表した図です（ア 太陽・月・地球の順に一直線、イ 太陽・地球・月の順に一直線、ウ 月が太陽と地球を結ぶ線から直角の方向）。月食が起こるのはどれ？',
        figure: scene(eclipsePanels().concat([
          region('r1', 296, 40, 'ア'),
          region('r2', 296, 120, 'イ'),
          region('r3', 296, 205, 'ウ'),
        ])),
        answer: 'r2',
        explanation: '月食は、太陽・地球・月の順に一直線に並び、月が地球の影に入る現象です。だからイです。アは日食が起こる並び方で、ウは上弦や下弦の月のころの並び方です。',
        hint: '月が地球の影に入るには、地球がどこにあればよいか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-3-r1', concept: 'sp-moon',
        prompt: '下弦の月（左半分が光った月）が南の空に見えるのは、いつごろ？',
        options: ['明け方', '夕方', '真夜中'],
        answer: 'a',
        explanation: '下弦の月は、真夜中ごろに東からのぼり、明け方に南の空に見えます。夕方に南の空に見えるのは上弦の月、真夜中に南の空に見えるのは満月です。',
        hint: '上弦の月の反対で考えよう。',
      }),
      choice({
        id: 'space-3-r2', concept: 'sp-moon',
        prompt: '月の満ち欠けの順として、正しいものはどれ？',
        options: ['新月 → 三日月 → 上弦の月 → 満月 → 下弦の月', '新月 → 下弦の月 → 満月 → 上弦の月 → 三日月', '満月 → 三日月 → 上弦の月 → 新月 → 下弦の月'],
        answer: 'a',
        explanation: '月は新月から右側が少しずつ光って三日月、上弦の月となり、満月になります。そのあと右側から欠けていき、下弦の月を経て新月にもどります。',
        hint: '三日月は、新月のすぐあとに見える細い月だよ。',
      }),
      figureChoice({
        id: 'space-3-r3', concept: 'sp-moon',
        prompt: '地球と月の公転を北極側から見た図です（太陽の光は左から）。ア〜ウのうち、新月になるときの月の位置はどれ？（ア 図の右、イ 図の左、ウ 図の下）',
        figure: scene(moonOrbit().concat([
          region('r1', ...moonAt(0), 'ア'),
          region('r2', ...moonAt(180), 'イ'),
          region('r3', ...moonAt(270), 'ウ'),
        ])),
        answer: 'r2',
        explanation: '新月は、月が太陽と同じ方向にあり、光っている半分が地球と反対を向いているときです。太陽の光は左から来るので、地球の左側のイが新月です。アは満月、ウは上弦の月の位置です。',
        hint: '月の光った面が地球から全く見えなくなる位置をさがそう。',
      }),
      choice({
        id: 'space-3-t2', concept: 'sp-moon', term: true,
        prompt: '次の説明に合う言葉はどれ？「月のように、惑星のまわりを公転している天体」',
        options: ['衛星', '恒星', 'すい星'],
        answer: 'a',
        explanation: '惑星のまわりを公転する天体を**衛星**といいます。月は地球の衛星です。自分で光を出す太陽のような天体は恒星です。',
        hint: '人工的につくったものは「人工〇〇」とよばれるよ。',
      }),
    ],
  };

  // ---- ステージ space-4: 太陽と太陽系 ----
  const space4 = {
    id: 'space-4', areaId: 'sp-solar', title: '太陽と太陽系', minutes: 5, concepts: ['sp-sun'],
    lessons: [
      {
        id: 'space-4-c1',
        text: '太陽は、自ら光を出す**恒星**で、高温の気体でできています。表面の温度は約 6000 ℃ です。表面に見える黒い斑点を**黒点**といい、まわりより温度が低い（約 4000 ℃）ので黒く見えます。',
        // 写真: 特別なフィルターで写した太陽。表面に黒点の集まり、ふちからプロミネンスが吹き出す
        figure: scene([
          photo('space-4-c1'),
          pointer(230, 64, 196, 94), tag(270, 60, 'プロミネンス', { size: 13, bold: true }),
          tag(270, 78, '（紅炎）', { size: 13 }),
          pointer(250, 124, 148, 92), tag(274, 128, '黒点', { size: 15, bold: true }),
          tag(274, 146, '約4000℃', { size: 13 }),
          pointer(250, 188, 162, 160), tag(274, 192, '表面', { size: 13, bold: true }),
          tag(274, 210, '約6000℃', { size: 13 }),
        ]),
      },
      {
        id: 'space-4-c2',
        anim: 'sp-sunspot',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '黒点を何日か続けて観察すると、少しずつ同じ向きに動いて見えます。これは太陽が**自転**しているからです。また、中央で円形に見える黒点が、ふちの近くでは細長いだ円形に見えることから、太陽は**球形**だと分かります。',
        // 黒点の位置の変わり方（1 日目、7 日目、13 日目）
        figure: scene([
          { type: 'circle', x: 56, y: 120, r: 46, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: 160, y: 120, r: 46, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: 264, y: 120, r: 46, fill: 'yellow', stroke: 'orange' },
          { type: 'ellipse', x: 18, y: 112, rx: 2.5, ry: 6, fill: '#5A4A2A', stroke: 'none' },
          { type: 'circle', x: 160, y: 112, r: 6, fill: '#5A4A2A', stroke: 'none' },
          { type: 'ellipse', x: 302, y: 112, rx: 2.5, ry: 6, fill: '#5A4A2A', stroke: 'none' },
          { type: 'text', x: 56, y: 60, text: '1 日目', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 60, text: '7 日目', size: 12, anchor: 'middle' },
          { type: 'text', x: 264, y: 60, text: '13 日目', size: 12, anchor: 'middle' },
          { type: 'arrow', x1: 40, y1: 190, x2: 280, y2: 190, color: 'blue' },
          { type: 'text', x: 160, y: 212, text: '黒点が同じ向きに動く → 自転', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 232, text: '中央では円形、ふちでは細長い → 球形', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'space-4-c3',
        text: '太陽と、そのまわりを公転する 8 つの**惑星**などの集まりを**太陽系**といいます。水星・金星・地球・火星は小さく密度が大きい**地球型惑星**、木星・土星・天王星・海王星は大きく密度が小さい**木星型惑星**です。',
        // 写真: 左はしに太陽、右へ 水星〜海王星（惑星の中心 x = 44, 68, 94, 120, 163, 225, 270, 300、y = 118）
        figure: scene([
          photo('space-4-c3'),
          tag(160, 20, '太陽に近い順（大きさは実際の比ではない）', { size: 13 }),
          tag(18, 202, '太陽', { size: 13 }),
          ...[['水', 44], ['金', 68], ['地', 94], ['火', 120], ['木', 163], ['土', 225], ['天', 270], ['海', 300]]
            .map(([t, x]) => tag(x, 52, t, { size: 13 })),
          { type: 'line', points: [[36, 182], [128, 182]], color: 'ink', width: 2 },
          { type: 'line', points: [[140, 182], [314, 182]], color: 'ink', width: 2 },
          tag(82, 202, '地球型惑星', { size: 13, bold: true }),
          tag(227, 202, '木星型惑星', { size: 13, bold: true }),
          tag(82, 222, '小さい・密度大', { size: 13 }),
          tag(227, 222, '大きい・密度小', { size: 13 }),
        ]),
      },
      {
        id: 'space-4-c4',
        text: '金星は地球より内側を公転する**内惑星**なので、いつも太陽に近い方向にあり、真夜中には見えません。夕方の西の空に見えるものを**よいの明星**、明け方の東の空に見えるものを**明けの明星**といいます。',
        // 写真: 日の入りのあとの西の空に明るく光る金星 (178, 156)。位置関係の図は space-4-p2・r1 にある
        figure: scene([
          photo('space-4-c4'),
          tag(160, 30, 'よいの明星（夕方・西の空）', { size: 15, bold: true }),
          tag(160, 54, '明け方の東の空に見えるときは 明けの明星', { size: 13 }),
          pointer(222, 134, 184, 153), tag(240, 128, '金星', { size: 15, bold: true }),
          tag(160, 192, '西', { size: 15, bold: true }),
        ]),
      },
    ],
    warmup: choice({
      id: 'space-4-w1', concept: 'sp-sun',
      prompt: '予想しよう。金星は夕方か明け方にしか見えず、真夜中には見えません。なぜだと思う？',
      options: ['金星は地球より内側を公転していて、いつも太陽に近い方向にあるから', '金星は夜になると光らなくなるから', '金星は地球のまわりを回っているから'],
      answer: 'a',
      explanation: '金星は地球より内側を公転しているので、地球から見るといつも太陽に近い方向にあります。真夜中は太陽と反対の方向を向いているので、金星は見えません。このステージで太陽系の天体を見ていこう。',
      hint: '真夜中の空は、太陽と反対の方向だったね。',
    }),
    problems: [
      choice({
        id: 'space-4-p1', concept: 'sp-sun',
        prompt: '太陽の表面の黒点が、黒く見えるのはなぜ？',
        options: ['まわりより温度が低いから', 'まわりより温度が高いから', '穴があいていて、中が見えているから'],
        answer: 'a',
        explanation: '黒点の温度は約 4000 ℃ で、まわりの表面（約 6000 ℃）より低いので、暗く黒っぽく見えます。黒点も実際には光を出しています。',
        hint: 'まわりと比べて、光が弱いのはどんなときか考えよう。',
      }),
      fill({
        id: 'space-4-t1', concept: 'sp-sun', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '太陽のように自ら光を出す天体を[b1]といい、そのまわりを公転する地球のような天体を[b2]という。',
        blanks: [
          word('b1', ['恒星', '惑星', '衛星'], '恒星'),
          word('b2', ['恒星', '惑星', '衛星'], '惑星'),
        ],
        explanation: '自ら光を出すのが**恒星**、恒星のまわりを公転するのが**惑星**です。惑星は太陽の光を反射して光って見えます。',
        hint: '夜空の星座の星は、太陽と同じなかまだよ。',
      }),
      figureChoice({
        id: 'space-4-p2', concept: 'sp-sun',
        prompt: '太陽・金星・地球を北極側から見た図です（地球は青い矢印の向きに自転）。ア〜ウのうち、夕方の西の空に見える金星（よいの明星）の位置はどれ？（ア 太陽の左側、イ 太陽の右側、ウ 太陽の向こう側）',
        figure: scene(venusBase().concat([
          region('r1', VENUS.left[0], VENUS.left[1], 'ア'),
          region('r2', VENUS.right[0], VENUS.right[1], 'イ'),
          region('r3', VENUS.far[0], VENUS.far[1], 'ウ'),
        ])),
        answer: 'r1',
        explanation: '地球の左はしの地点は、自転で昼から夜へ移るところなので夕方です。その地点では、しずんだ太陽のある西の空にアの金星が見えます。イは明け方の東の空に見える明けの明星、ウは太陽と同じ方向なので見えにくい位置です。',
        hint: '地球の上で夕方になっている地点を、自転の向きから先に見つけよう。',
      }),
      choice({
        id: 'space-4-p3', concept: 'sp-sun',
        prompt: '木星型惑星の組み合わせとして、正しいものはどれ？',
        options: ['木星・土星・天王星・海王星', '水星・金星・地球・火星', '木星・土星・火星・金星'],
        answer: 'a',
        explanation: '太陽から遠い木星・土星・天王星・海王星は、大きく密度が小さい木星型惑星です。水星・金星・地球・火星は小さく密度が大きい地球型惑星です。',
        hint: '火星と木星のあいだで、2 つのなかまに分かれるよ。',
      }),
      choice({
        id: 'space-4-p4', concept: 'sp-sun',
        prompt: '黒点を何日か続けて観察すると、少しずつ同じ向きに動いて見えました。このことから分かることはどれ？',
        options: ['太陽が自転していること', '太陽が地球のまわりを公転していること', '黒点がだんだん大きくなること'],
        answer: 'a',
        explanation: '黒点が太陽の表面にそって同じ向きに動いて見えるのは、太陽が自転しているからです。中央で円形の黒点がふちでは細長く見えることからは、太陽が球形だと分かります。',
        hint: '表面の模様がいっしょに動くのは、太陽そのものがどうしているときかな。',
      }),
      choice({
        id: 'space-4-p5', concept: 'sp-sun',
        prompt: '金星が地球に近づいていくと、望遠鏡で見た金星の見え方はどう変わる？',
        options: ['大きく見え、欠け方が大きくなる', '小さく見え、欠け方が大きくなる', '大きく見え、丸い形に近づく'],
        answer: 'a',
        explanation: '金星は地球に近づくほど大きく見えます。地球に近いときは光っている面を横からや後ろから見ることになるので、細く欠けて見えます。遠いときは小さく、丸い形に近くなります。',
        hint: '地球に近いとき、金星の光った面は地球のほうを向いているかな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'space-4-r1', concept: 'sp-sun',
        prompt: '太陽・金星・地球を北極側から見た図です（地球は青い矢印の向きに自転）。ア〜ウのうち、明け方の東の空に見える金星（明けの明星）の位置はどれ？（ア 太陽の向こう側、イ 太陽の左側、ウ 太陽の右側）',
        figure: scene(venusBase().concat([
          region('r1', VENUS.far[0], VENUS.far[1], 'ア'),
          region('r2', VENUS.left[0], VENUS.left[1], 'イ'),
          region('r3', VENUS.right[0], VENUS.right[1], 'ウ'),
        ])),
        answer: 'r3',
        explanation: '地球の右はしの地点は、自転で夜から昼へ移るところなので明け方です。その地点では、これからのぼる太陽のある東の空にウの金星が見えます。イは夕方に見えるよいの明星の位置です。',
        hint: '地球の上で明け方になっている地点を、自転の向きから見つけよう。',
      }),
      choice({
        id: 'space-4-r2', concept: 'sp-sun',
        prompt: '地球型惑星の特徴として、正しいものはどれ？',
        options: ['小さく、密度が大きい', '大きく、密度が小さい', '大きく、密度が大きい'],
        answer: 'a',
        explanation: '地球型惑星（水星・金星・地球・火星）は、おもに岩石でできていて、小さく密度が大きい惑星です。木星型惑星は、おもに気体などでできていて、大きく密度が小さい惑星です。',
        hint: '地球型惑星は、岩石でできた小さい惑星だよ。',
      }),
      choice({
        id: 'space-4-r3', concept: 'sp-sun',
        prompt: '太陽系をふくむ、約 2000 億個の恒星の大集団を何という？',
        options: ['銀河系', '太陽系', '星座'],
        answer: 'a',
        explanation: '太陽系は、約 2000 億個の恒星が集まった**銀河系**の中にあります。銀河系の直径は約 10 万光年です。夜空の天の川は、銀河系の恒星の集まりを内側から見たものです。',
        hint: '天の川として見えている星の集まりだよ。',
      }),
      choice({
        id: 'space-4-t2', concept: 'sp-sun', term: true,
        prompt: '次の説明に合う言葉はどれ？「水星や金星のように、地球より内側を公転する惑星」',
        options: ['内惑星', '外惑星', '衛星'],
        answer: 'a',
        explanation: '地球より内側を公転する惑星を**内惑星**といいます。内惑星は太陽からあまりはなれて見えないので、真夜中には見えません。',
        hint: '「内側」の惑星だよ。',
      }),
    ],
  };

  // ================================================================
  // 概念（類題の不足を補う確認問題つき）
  // ================================================================

  const concepts = [
    {
      id: 'sp-rotation', title: '地球の自転と日周運動', basic: null, lessonStageId: 'space-1',
      checkPool: [
        choice({
          id: 'sp-rotation-k1', concept: 'sp-rotation',
          prompt: '北の空の星は、どのように動いて見える？',
          options: ['北極星を中心に反時計回りに回る', '北極星を中心に時計回りに回る', '東から西へまっすぐ動く'],
          answer: 'a',
          explanation: '北の空の星は、北極星を中心に反時計回りに、1 時間に約 15° 回って見えます。北極星は地軸をのばした先の近くにあるので、ほとんど動きません。',
          hint: '地球の自転の向き（西から東）と反対に動いて見えるよ。',
        }),
        choice({
          id: 'sp-rotation-k2', concept: 'sp-rotation',
          prompt: '西の空に見える星は、どのように動いて見える？',
          options: ['右下へ向かってしずんでいく', '右上へ向かってのぼっていく', '左から右へ水平に動く'],
          answer: 'a',
          explanation: '星は東からのぼり、南の空を通って西へしずみます。西の空を向くと北は右側なので、星は右下へ向かってしずんでいきます。',
          hint: '西の空を向いて立つと、南と北はどちらの手の側か考えよう。',
        }),
        fill({
          id: 'sp-rotation-k3', concept: 'sp-rotation',
          prompt: '空らんに入る数を入れよう。',
          text: '午後 8 時に南中した星を、同じ日の午後 10 時に観察すると、南中した位置から西へ約[b1]動いて見える。',
          blanks: [number('b1', 30, 0, '°')],
          explanation: '日周運動では 1 時間に約 15° 動きます。2 時間では 15° × 2 ＝ 30° です。',
          hint: '何時間たったかを数えて、15° をかけよう。',
        }),
      ],
    },
    {
      id: 'sp-hemisphere', title: '透明半球と南中高度', basic: 'sp-rotation', lessonStageId: 'space-1',
      checkPool: [
        choice({
          id: 'sp-hemisphere-k1', concept: 'sp-hemisphere',
          prompt: '透明半球に太陽の位置を記録するとき、ペンの先の影をどこに合わせる？',
          options: ['透明半球の中心（底の円の中心）', '透明半球のいちばん高いところ', '透明半球の南のふち'],
          answer: 'a',
          explanation: '透明半球の中心は観測者の位置を表しています。ペンの先の影が中心にくるように印をつけると、観測者から見た太陽の方向が記録できます。',
          hint: '観測者の位置にあたるのはどこか考えよう。',
        }),
        choice({
          id: 'sp-hemisphere-k2', concept: 'sp-hemisphere',
          prompt: '太陽の南中高度とは、どの角度のこと？',
          options: ['太陽が南中したときの、地平線から太陽までの角度', '日の出のときの、真東から太陽までの角度', '太陽が南中したときの、真上から太陽までの角度'],
          answer: 'a',
          explanation: '南中高度は、太陽が真南にきたとき（南中したとき）の、地平線から太陽までの角度です。透明半球では、中心から見た南のふちと南中の位置のあいだの角度になります。',
          hint: '「高度」は、地平線からはかる角度だよ。',
        }),
        choice({
          id: 'sp-hemisphere-k3', concept: 'sp-hemisphere',
          prompt: '透明半球の記録を東側へなめらかにのばして、底の円と交わった点は何を表している？',
          options: ['日の出の位置', '南中の位置', '日の入りの位置'],
          answer: 'a',
          explanation: '底の円は地平線を表しています。東側で記録の曲線が地平線と交わる点は、太陽がのぼってきた日の出の位置です。西側で交わる点が日の入りの位置です。',
          hint: '底の円は、地平線を表しているよ。',
        }),
      ],
    },
    {
      id: 'sp-revolution', title: '地球の公転と年周運動', basic: 'sp-rotation', lessonStageId: 'space-2',
      checkPool: [
        choice({
          id: 'sp-revolution-k1', concept: 'sp-revolution',
          prompt: '黄道とは何のこと？',
          options: ['星座のあいだを動いて見える、太陽の見かけの通り道', '月が地球のまわりを回る通り道', '北極星を中心に星が回る通り道'],
          answer: 'a',
          explanation: '地球が公転すると、地球から見た太陽の方向にある星座が少しずつ変わります。この太陽の見かけの通り道が黄道です。',
          hint: '「黄」は太陽の色を思いうかべよう。',
        }),
        choice({
          id: 'sp-revolution-k2', concept: 'sp-revolution',
          prompt: '地球の公転の向きとして、正しいものはどれ？',
          options: ['西から東（北極側から見て反時計回り）', '東から西（北極側から見て反時計回り）', '西から東（北極側から見て時計回り）'],
          answer: 'a',
          explanation: '地球は、自転と同じく西から東の向きに公転しています。北極側から見ると、どちらも反時計回りです。',
          hint: '自転の向きと同じだよ。',
        }),
        fill({
          id: 'sp-revolution-k3', concept: 'sp-revolution',
          prompt: '空らんに入る数を入れよう。',
          text: '地球は 1 年で太陽のまわりを 360° 公転するので、1 か月では約[b1]公転する。',
          blanks: [number('b1', 30, 0, '°')],
          explanation: '360° ÷ 12 か月 ＝ 30° です。そのため、同じ時刻に見える星座は 1 か月に約 30° ずつ西へ動いて見えます。',
          hint: '360° を 12 でわろう。',
        }),
      ],
    },
    {
      id: 'sp-season', title: '季節の変化と南中高度', basic: 'sp-revolution', lessonStageId: 'space-2',
      checkPool: [
        fill({
          id: 'sp-season-k1', concept: 'sp-season',
          prompt: '空らんに入る数を入れよう。',
          text: '北緯 35° の地点で、冬至の日の太陽の南中高度は[b1]である。（地軸の傾きは 23.4° とする）',
          blanks: [number('b1', 31.6, 0.1, '°')],
          explanation: '春分・秋分の南中高度は 90° − 35° ＝ 55° です。冬至はそれより 23.4° 低いので、55° − 23.4° ＝ 31.6° になります。',
          hint: '春分の南中高度から 23.4° をひこう。',
        }),
        choice({
          id: 'sp-season-k2', concept: 'sp-season',
          prompt: '日本で、冬至のころの昼の長さと日の出の位置として、正しいものはどれ？',
          options: ['昼は短く、日の出は真東より南寄り', '昼は短く、日の出は真東より北寄り', '昼は長く、日の出は真東より南寄り'],
          answer: 'a',
          explanation: '冬至のころは、太陽は真東より南寄りからのぼり、低いところを通って真西より南寄りにしずみます。通り道が短いので、昼が短くなります。',
          hint: '冬の太陽は、南の低い空を短く通っていくよ。',
        }),
        choice({
          id: 'sp-season-k3', concept: 'sp-season',
          prompt: '春分・秋分の日、太陽はどこからのぼり、どこへしずむ？',
          options: ['真東からのぼり、真西へしずむ', '真東より北寄りからのぼり、真西より北寄りへしずむ', '真東より南寄りからのぼり、真西より南寄りへしずむ'],
          answer: 'a',
          explanation: '春分・秋分の日は、太陽は真東からのぼって真西へしずみ、昼と夜の長さがほぼ等しくなります。夏至のころは北寄り、冬至のころは南寄りになります。',
          hint: '昼と夜の長さがほぼ同じになる日だよ。',
        }),
      ],
    },
    {
      id: 'sp-moon', title: '月の満ち欠けと日食・月食', basic: 'sp-revolution', lessonStageId: 'space-3',
      checkPool: [
        choice({
          id: 'sp-moon-k1', concept: 'sp-moon',
          prompt: '月が満ち欠けして、満月から次の満月になるまで、約何日かかる？',
          options: ['約 7 日', '約 15 日', '約 29.5 日', '約 365 日'],
          answer: 'c',
          explanation: '月の満ち欠けは約 29.5 日でくり返します。満月から約 1 週間で下弦の月、約 2 週間で新月になります。',
          hint: '昔のこよみでは、ほぼ 1 か月だったよ。',
        }),
        choice({
          id: 'sp-moon-k2', concept: 'sp-moon',
          prompt: '月食が起こるのは、月がどの形のとき？',
          options: ['満月', '新月', '上弦の月'],
          answer: 'a',
          explanation: '月食は、太陽・地球・月の順に一直線に並び、月が地球の影に入るときに起こります。月は太陽と反対側にあるので満月です。',
          hint: '月が太陽と反対側にあるときの形を考えよう。',
        }),
        choice({
          id: 'sp-moon-k3', concept: 'sp-moon',
          prompt: '月は太陽よりずっと小さいのに、日食のとき太陽をかくすことができるのはなぜ？',
          options: ['月は太陽よりずっと地球に近く、見かけの大きさがほぼ同じだから', '月は太陽より明るいから', '日食のときは太陽が小さくなるから'],
          answer: 'a',
          explanation: '太陽の直径は月の約 400 倍ですが、地球からの距離も約 400 倍遠くにあります。そのため、地球から見た太陽と月の大きさはほぼ同じになり、月が太陽をかくせます。',
          hint: '近くの小さなものが、遠くの大きなものをかくすことを思い出そう。',
        }),
      ],
    },
    {
      id: 'sp-sun', title: '太陽と太陽系・金星の見え方', basic: 'sp-moon', lessonStageId: 'space-4',
      checkPool: [
        choice({
          id: 'sp-sun-k1', concept: 'sp-sun',
          prompt: '太陽の表面の温度は約何 ℃？',
          options: ['約 1000 ℃', '約 6000 ℃', '約 100 万 ℃'],
          answer: 'b',
          explanation: '太陽の表面の温度は約 6000 ℃ です。黒点は約 4000 ℃ で、まわりより低いので黒く見えます。',
          hint: '黒点（約 4000 ℃）より高い温度だよ。',
        }),
        choice({
          id: 'sp-sun-k2', concept: 'sp-sun',
          prompt: '火星と木星のあいだに多くあり、太陽のまわりを公転している小さな天体を何という？',
          options: ['小惑星', 'すい星', '衛星'],
          answer: 'a',
          explanation: '火星と木星のあいだには、小惑星とよばれる小さな天体が多く公転しています。すい星は、細長いだ円の軌道で公転し、太陽に近づくと尾を引くことがある天体です。',
          hint: '「小さな惑星」という意味の名前だよ。',
        }),
        choice({
          id: 'sp-sun-k3', concept: 'sp-sun',
          prompt: '火星は真夜中に見えることがありますが、金星は見えません。その理由として正しいものはどれ？',
          options: ['金星は内惑星で、地球から見て太陽から大きくはなれないから', '金星は火星より小さくて暗いから', '金星は地球のまわりを公転しているから'],
          answer: 'a',
          explanation: '金星は地球より内側を公転する内惑星なので、地球から見るといつも太陽に近い方向にあります。火星は外側を公転する外惑星なので、太陽と反対の方向にくることがあり、真夜中にも見えます。',
          hint: '真夜中に見えるのは、太陽と反対の方向にある天体だよ。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'space',
    title: '地球と宇宙',
    mascot: 'D',   // 担当の先生（もくもく先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'sp-earth', title: '地球の動きと天体の見え方', order: 1, stages: [space1, space2] },
      { id: 'sp-solar', title: '太陽系', order: 2, stages: [space3, space4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
