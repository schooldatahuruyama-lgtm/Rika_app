// 「地球と宇宙」教材データ（中学3年 理科・地学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（地球の動きと天体の見え方: 日周運動、年周運動と季節 / 太陽系: 月の満ち欠けと日食・月食、太陽と太陽系）と、概念 6 つ。
// 領域 3「ミニプリント」: 先生のミニプリントの問題を書き直した 10 ステージ（space-mp1〜10）と、概念 1 つ（sp-universe）を追加。
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
        hint: '人工的につくったものは「人工○○」とよばれるよ。',
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
  // 領域 3: ミニプリント（先生が作ったミニプリントの問題を書き直したもの）
  // ステージは「プリント 1」〜「プリント 10」。並びは文字起こしの順（学ぶ順）。参考にしたプリントは docs/reports/content/space.md
  // ================================================================

  // 文字（size 既定 12）
  function txt(x, y, text, size, anchor, bold) {
    const t = { type: 'text', x, y, text, size: size || 12 };
    if (anchor) t.anchor = anchor;
    if (bold) t.bold = true;
    return t;
  }

  // ---- 太陽系の惑星（太陽に近い順。左はしに太陽の一部） ----
  // 大きさをおよその比でかいた図（名前つき）
  const PLANETS = [['水星', 48, 3], ['金星', 64, 5], ['地球', 82, 6], ['火星', 98, 4], ['木星', 140, 22], ['土星', 200, 17], ['天王星', 252, 10], ['海王星', 292, 10]];
  function planetSizes() {
    const items = [{ type: 'circle', x: -50, y: 110, r: 80, fill: 'yellow', stroke: 'orange' }];
    PLANETS.forEach(([, x, r], i) => {
      items.push({ type: 'circle', x, y: 110, r, fill: i === 2 ? 'sky' : '#D9C9A8', stroke: 'line' });
      if (i === 5) items.push({ type: 'ellipse', x, y: 110, rx: 30, ry: 7, fill: 'none', stroke: 'line' });
    });
    return items;
  }
  // 大きさをそろえてかいた図（名前なし）。i 番目（0 から）の惑星の中心は (40 + 32 i, 100)
  function planetDots() {
    const items = [{ type: 'circle', x: -50, y: 100, r: 70, fill: 'yellow', stroke: 'orange' }];
    for (let i = 0; i < 8; i++) items.push({ type: 'circle', x: 40 + 32 * i, y: 100, r: 7, fill: '#D9C9A8', stroke: 'line' });
    items.push(txt(316, 30, '太陽に近い順（大きさは同じにかいてある）', 12, 'end'));
    return items;
  }
  // 惑星 i から下の選ぶ場所 (x, 190) へ引き出し線
  function planetPointer(i, x) {
    return { type: 'line', points: [[40 + 32 * i, 110], [x, 168]], color: 'gray', width: 2, dashed: true };
  }

  // ---- 太陽（中心 (130, 125)、半径 80。まわりにコロナ、右上にプロミネンス、黒点） ----
  function sunFigure() {
    return [
      { type: 'circle', x: 130, y: 125, r: 104, fill: '#FFF1C9', stroke: 'none' },
      { type: 'circle', x: 130, y: 125, r: 80, fill: 'yellow', stroke: 'orange' },
      { type: 'polygon', points: [[178, 76], [184, 58], [198, 50], [206, 60], [196, 72], [190, 82]], fill: 'orange', stroke: 'none' },
      { type: 'circle', x: 106, y: 108, r: 9, fill: '#5A4A2A', stroke: 'none' },
    ];
  }

  // ---- 透明半球（方位の文字なし） ----
  function hemisphereBare() {
    return hemisphereBase().filter(it => it.type !== 'text');
  }

  // ---- 南の空の星の位置（観測地点 (160, 210)、半径 150。15° ごとの印。P は真南） ----
  function skyArc() {
    const items = [
      arcLine(160, 210, 150, 0, 180, { color: 'gray', width: 1.5, dashed: true }),
      { type: 'line', points: [[6, 210], [314, 210]], color: 'brown', width: 3 },
      txt(16, 230, '東', 14, 'middle', true),
      txt(160, 230, '南', 14, 'middle', true),
      txt(304, 230, '西', 14, 'middle', true),
    ];
    for (let a = 15; a < 180; a += 15) {
      if (a === 90) continue;
      const [x, y] = onCircle(160, 210, 150, a);
      items.push({ type: 'circle', x, y, r: 3, fill: 'gray', stroke: 'none' });
    }
    items.push({ type: 'circle', x: 160, y: 60, r: 8, fill: 'yellow', stroke: 'orange' }, txt(172, 52, 'P', 14, null, true));
    return items;
  }
  // 南中（P）から角度 deg（西が正、東が負）の位置
  function skyAt(deg) { return onCircle(160, 210, 150, 90 - deg); }
  // 動かす星（左上に置く）
  function dragStar() { return { type: 'circle', id: 'star', x: 30, y: 30, r: 10, fill: 'white', stroke: 'blue', label: '星' }; }
  const SKY_NOTE = txt(316, 24, '印は 15° ごと', 12, 'end');

  // ---- 天動説・地動説 ----
  function geoHelio() {
    return [
      { type: 'circle', x: 80, y: 110, r: 50, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 80, y: 110, r: 12, fill: 'sky', stroke: 'line' },
      { type: 'circle', x: 130, y: 110, r: 10, fill: 'yellow', stroke: 'orange' },
      arcLine(80, 110, 50, 300, 340, { color: 'blue', width: 2, arrow: true }),
      { type: 'circle', x: 240, y: 110, r: 50, fill: 'none', stroke: 'gray' },
      { type: 'circle', x: 240, y: 110, r: 14, fill: 'yellow', stroke: 'orange' },
      { type: 'circle', x: 290, y: 110, r: 8, fill: 'sky', stroke: 'line' },
      arcLine(240, 110, 50, 300, 340, { color: 'blue', width: 2, arrow: true }),
      txt(80, 114, '地球', 11, 'middle'),
      txt(240, 114, '太陽', 11, 'middle'),
    ];
  }

  // ---- 北極の真上から見た地球と経線（日本は上。東経 L の経線は画面の角度 L − 45°） ----
  function longitudeFigure() {
    const items = [
      { type: 'circle', x: 160, y: 125, r: 85, fill: 'sky', stroke: 'line' },
      arcLine(160, 125, 100, 150, 190, { color: 'blue', width: 3, arrow: true }),
      txt(14, 60, '自転の向き', 12),
    ];
    [90, 315, 45, 135, 225].forEach(a => {
      const [x, y] = onCircle(160, 125, 85, a);
      items.push({ type: 'line', points: [[160, 125], [x, y]], color: 'gray', width: 1.5 });
    });
    items.push(
      { type: 'circle', x: 160, y: 125, r: 3, fill: 'ink', stroke: 'none' },
      txt(160, 145, '北極', 12, 'middle'),
      { type: 'circle', x: 160, y: 40, r: 6, fill: 'orange', stroke: 'ink' },
      txt(172, 30, '日本（東経 135°）', 12),
      txt(4, 20, '北極の真上から見た図', 12),
    );
    return items;
  }

  // ---- 金星の位置（太陽 (160, 95)、金星の軌道の半径 58、地球 (160, 210)） ----
  function venusOrbitBare() {
    return venusBase().slice(0, 9);   // 金星の 3 つの位置（VENUS）をかく前までの部品
  }
  // 太陽のほうが光った金星（角度 a の位置）
  function venusAt(a) {
    const [x, y] = onCircle(160, 95, 58, a);
    const toSun = Math.atan2(-(95 - y), 160 - x) / D;
    return litBody(x, y, 7, toSun, 'yellow', DARK);
  }
  // 望遠鏡で見た金星の形（光っている割合 f、左側が光る）
  function phase(cx, cy, r, f) {
    const pts = [];
    for (let a = 90; a <= 270; a += 15) pts.push([r1(cx + r * Math.cos(a * D)), r1(cy - r * Math.sin(a * D))]);
    for (let a = 270; a >= 90; a -= 15) pts.push([r1(cx + (1 - 2 * f) * r * Math.cos(a * D)), r1(cy - r * Math.sin(a * D))]);
    return [
      { type: 'circle', x: cx, y: cy, r, fill: 'none', stroke: 'gray' },
      { type: 'polygon', points: pts, fill: 'yellow', stroke: 'orange' },
    ];
  }

  // ---- ステージ space-mp1: プリント 1 太陽系の惑星と太陽 ----
  const spaceMp1 = {
    id: 'space-mp1', areaId: 'sp-miniprint', title: 'プリント 1: 太陽系の惑星と太陽', minutes: 5, concepts: ['sp-sun'],
    lessons: [
      {
        id: 'space-mp1-c1',
        text: '太陽系の惑星は、太陽に近い順に**水星**・**金星**・**地球**・**火星**・**木星**・**土星**・**天王星**・**海王星**の 8 つです。いちばん大きいのは木星です。太陽から遠い惑星ほど公転周期が長く、海王星は約 165 年かかります。',
        figure: scene(planetSizes().concat([
          ...PLANETS.map(([name, x], i) => txt(x, i < 4 ? (i % 2 ? 150 : 70) : (i < 6 ? 70 : 80), name.slice(0, 1), 12, 'middle')),
          txt(316, 24, '太陽に近い順（大きさはおよその比）', 12, 'end'),
          txt(160, 200, '木星がいちばん大きい', 13, 'middle'),
          txt(160, 222, '遠い惑星ほど公転周期が長い', 13, 'middle'),
        ])),
      },
      {
        id: 'space-mp1-c2',
        text: '月のように惑星のまわりを公転する天体を**衛星**、火星と木星のあいだに多い小さな天体を**小惑星**、細長いだ円の軌道で太陽のまわりを回り、太陽に近づくと尾を引く天体を**すい星**といいます。',
        // 太陽 (40,120)。地球と月、小惑星の帯、すい星の細長い軌道
        figure: scene([
          { type: 'ellipse', x: 170, y: 120, rx: 140, ry: 40, fill: 'none', stroke: 'gray' },
          arcLine(40, 120, 40, -60, 60, { color: 'gray', width: 1 }),
          ...[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((a, i) => {
            const [x, y] = onCircle(40, 120, 70 + (i % 3) * 4, a);
            return { type: 'circle', x, y, r: 2, fill: 'ink', stroke: 'none' };
          }),
          { type: 'circle', x: 40, y: 120, r: 18, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: 80, y: 120, r: 5, fill: 'sky', stroke: 'line' },
          { type: 'circle', x: 92, y: 112, r: 2.5, fill: 'gray', stroke: 'none' },
          { type: 'circle', x: 300, y: 120, r: 5, fill: 'white', stroke: 'blue' },
          { type: 'line', points: [[305, 120], [318, 116]], color: 'blue', width: 2 },
          { type: 'line', points: [[305, 122], [318, 126]], color: 'blue', width: 2 },
          txt(98, 100, '地球と衛星（月）', 12),
          txt(118, 176, '小惑星（火星と木星のあいだ）', 12),
          txt(312, 96, 'すい星', 12, 'end'),
          txt(316, 216, 'すい星の尾は太陽と反対向き', 12, 'end'),
        ]),
      },
      {
        id: 'space-mp1-c3',
        text: '太陽の表面は約 6000 ℃ で、黒く見える**黒点**はまわりより温度が低い部分です。表面から吹き出す**プロミネンス**（紅炎）や、外側の高温の大気の**コロナ**が見られます。太陽はおもに**水素**でできていて、直径は地球の約 109 倍です。',
        figure: scene(sunFigure().concat([
          { type: 'line', points: [[244, 136], [116, 110]], color: 'ink', width: 1.5 },
          txt(248, 140, '黒点', 13, null, true),
          { type: 'line', points: [[244, 40], [204, 54]], color: 'ink', width: 1.5 },
          txt(248, 44, 'プロミネンス', 12, null, true),
          { type: 'line', points: [[244, 206], [202, 186]], color: 'ink', width: 1.5 },
          txt(248, 210, 'コロナ', 13, null, true),
          txt(248, 166, '表面', 12),
          txt(248, 184, '約 6000 ℃', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp1-w1', concept: 'sp-sun',
      prompt: '予想しよう。太陽系の 8 つの惑星のうち、いちばん大きい（直径が大きい）惑星はどれだと思う？',
      options: ['木星', '地球', '海王星'],
      answer: 'a',
      explanation: 'いちばん大きいのは木星で、直径は地球の約 11 倍です。太陽系の惑星の並び方や、太陽のつくりを、このステージで確かめよう。',
      hint: '太陽から 5 番目の惑星だよ。',
    }),
    problems: [
      figureChoice({
        id: 'space-mp1-p1', concept: 'sp-sun',
        prompt: '図は、太陽系の 8 つの惑星を、太陽に近い順に同じ大きさでかいたものです。ア〜ウのうち、地球はどれ？（ア 2 番目、イ 3 番目、ウ 4 番目）',
        figure: scene(planetDots().concat([
          planetPointer(1, 60), planetPointer(2, 140), planetPointer(3, 220),
          region('r1', 60, 190, 'ア'),
          region('r2', 140, 190, 'イ'),
          region('r3', 220, 190, 'ウ'),
        ])),
        answer: 'r2',
        explanation: '惑星は太陽に近い順に、水星・金星・地球・火星…と並ぶので、地球は 3 番目のイです。アは金星、ウは火星です。',
        hint: '「水・金・地・火・木・土・天・海」と覚えよう。',
      }),
      figureChoice({
        id: 'space-mp1-p2', concept: 'sp-sun',
        prompt: '図は、太陽系の 8 つの惑星を、太陽に近い順に同じ大きさでかいたものです。ア〜ウのうち、直径がいちばん大きい惑星はどれ？（ア 4 番目、イ 5 番目、ウ 6 番目）',
        figure: scene(planetDots().concat([
          planetPointer(3, 60), planetPointer(4, 140), planetPointer(5, 220),
          region('r1', 60, 190, 'ア'),
          region('r2', 140, 190, 'イ'),
          region('r3', 220, 190, 'ウ'),
        ])),
        answer: 'r2',
        explanation: 'いちばん大きい惑星は、太陽から 5 番目の木星（イ）です。直径は地球の約 11 倍です。アは火星、ウは土星です。',
        hint: '木星は太陽から何番目かな。',
      }),
      fill({
        id: 'space-mp1-p3', concept: 'sp-sun',
        prompt: '太陽に近い順に並べた惑星の名前を完成させよう。',
        text: '水星 → 金星 → 地球 → [b1] → [b2] → 土星 → [b3] → [b4]',
        blanks: [
          word('b1', ['火星', '木星', '天王星', '海王星'], '火星'),
          word('b2', ['火星', '木星', '天王星', '海王星'], '木星'),
          word('b3', ['火星', '木星', '天王星', '海王星'], '天王星'),
          word('b4', ['火星', '木星', '天王星', '海王星'], '海王星'),
        ],
        explanation: '太陽に近い順に、水星・金星・地球・火星・木星・土星・天王星・海王星です。水星〜火星は小さい地球型惑星、木星〜海王星は大きい木星型惑星です。',
        hint: '「水・金・地・火・木・土・天・海」。',
      }),
      fill({
        id: 'space-mp1-t1', concept: 'sp-sun', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '月のように惑星のまわりを公転する天体を[b1]、火星と木星のあいだの軌道を公転する小さな天体を[b2]、細長いだ円の軌道で太陽を公転し、太陽に近づくと尾を引く天体を[b3]という。',
        blanks: [
          word('b1', ['衛星', '小惑星', 'すい星', '恒星'], '衛星'),
          word('b2', ['衛星', '小惑星', 'すい星', '恒星'], '小惑星'),
          word('b3', ['衛星', '小惑星', 'すい星', '恒星'], 'すい星'),
        ],
        explanation: '惑星のまわりを回るのが**衛星**、火星と木星のあいだに多いのが**小惑星**、尾を引くのが**すい星**です。すい星の尾は、太陽と反対の向きにのびます。',
        hint: '「尾を引く」天体は、ほうき星ともよばれるよ。',
      }),
      choice({
        id: 'space-mp1-p4', concept: 'sp-sun',
        prompt: '太陽系の惑星のうち、公転周期（太陽のまわりを 1 周する時間）がいちばん長いのはどれ？',
        options: ['海王星', '木星', '水星', '地球'],
        answer: 'a',
        explanation: '太陽から遠い惑星ほど、軌道が長く、公転の速さもおそいので、公転周期が長くなります。いちばん遠い海王星は約 165 年かかります。',
        hint: '太陽からいちばん遠い惑星だよ。',
      }),
      figureChoice({
        id: 'space-mp1-p5', concept: 'sp-sun',
        prompt: '太陽のようすを表した図です。ア〜ウのうち、まわりより温度が低いために黒く見える部分はどれ？（ア 表面の黒い点、イ ふちから吹き出す炎のようなもの、ウ 外側にうすく広がる部分）',
        figure: scene(sunFigure().concat([
          region('r1', 106, 108, 'ア'),
          region('r2', 214, 46, 'イ'),
          region('r3', 204, 196, 'ウ'),
        ])),
        answer: 'r1',
        explanation: 'アは**黒点**です。温度が約 4000 ℃ で、まわりの表面（約 6000 ℃）より低いので黒く見えます。イはプロミネンス（紅炎）、ウはコロナです。',
        hint: '表面にある「点」をさがそう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-mp1-r1', concept: 'sp-sun',
        prompt: '太陽の表面の温度はおよそどれくらい？',
        options: ['約 1000 ℃', '約 6000 ℃', '約 20000 ℃'],
        answer: 'b',
        explanation: '太陽の表面の温度は約 6000 ℃ です。黒点は約 4000 ℃、外側のコロナは 100 万 ℃ 以上あります。',
        hint: '黒点（約 4000 ℃）より少し高いよ。',
      }),
      choice({
        id: 'space-mp1-r2', concept: 'sp-sun',
        prompt: '太陽の表面にある黒点が黒く見えるのはなぜ？',
        options: ['まわりより温度が低く、暗く見えるから', '穴があいていて、中が見えるから', '月の影がうつっているから'],
        answer: 'a',
        explanation: '黒点は温度が約 4000 ℃ で、まわりの表面（約 6000 ℃）より低いので、暗く黒く見えます。',
        hint: '温度が低いと、光り方は弱くなるよ。',
      }),
      choice({
        id: 'space-mp1-r3', concept: 'sp-sun',
        prompt: '太陽は、おもに何という元素でできている？',
        options: ['水素', '酸素', '鉄'],
        answer: 'a',
        explanation: '太陽は、おもに水素（次にヘリウム）でできた、高温の気体のかたまりです。',
        hint: 'いちばん軽い元素だよ。',
      }),
      choice({
        id: 'space-mp1-r4', concept: 'sp-sun',
        prompt: '太陽の直径は、地球の直径のおよそ何倍？',
        options: ['約 20 倍', '約 100 倍', '約 5000 倍'],
        answer: 'b',
        explanation: '太陽の直径は約 140 万 km で、地球（約 1 万 3000 km）の約 109 倍です。およそ 100 倍と覚えよう。',
        hint: '地球を 100 個ほど並べた長さだよ。',
      }),
      figureChoice({
        id: 'space-mp1-r5', concept: 'sp-sun',
        prompt: '太陽のようすを表した図です。ア〜ウのうち、太陽の外側にうすく広がる高温の大気はどれ？（ア 表面の黒い点、イ ふちから吹き出す炎のようなもの、ウ 外側にうすく広がる部分）',
        figure: scene(sunFigure().concat([
          region('r1', 106, 108, 'ア'),
          region('r2', 214, 46, 'イ'),
          region('r3', 204, 196, 'ウ'),
        ])),
        answer: 'r3',
        explanation: '太陽の外側にうすく広がる高温の大気は**コロナ**（ウ）です。皆既日食のときに、黒い月のまわりに見えます。',
        hint: '皆既日食のときに見える、まわりの白い光だよ。',
      }),
    ],
  };

  // ---- ステージ space-mp2: プリント 2 銀河と地球の自転 ----
  const spaceMp2 = {
    id: 'space-mp2', areaId: 'sp-miniprint', title: 'プリント 2: 銀河と地球の自転', minutes: 5, concepts: ['sp-sun', 'sp-rotation'],
    lessons: [
      {
        id: 'space-mp2-c1',
        text: '恒星が数億〜数千億個も集まった大集団を**銀河**といいます。太陽系をふくむ銀河を**銀河系**（天の川銀河）といい、約 2000 億個の恒星が集まった、直径約 10 万光年のうすい円盤の形をしています。',
        figure: scene([
          txt(8, 24, '銀河系を横から見た図（模式図）', 12),
          { type: 'ellipse', x: 160, y: 110, rx: 140, ry: 34, fill: '#E4E1F5', stroke: 'line' },
          { type: 'ellipse', x: 160, y: 110, rx: 34, ry: 18, fill: '#FFF1C9', stroke: 'none' },
          { type: 'circle', x: 236, y: 112, r: 4, fill: 'blue', stroke: 'none' },
          { type: 'line', points: [[236, 112], [250, 150]], color: 'ink', width: 1.5 },
          txt(252, 164, '太陽系', 13, 'middle', true),
          { type: 'line', points: [[160, 186], [300, 186]], color: 'gray', width: 2, arrow: true },
          { type: 'line', points: [[160, 186], [20, 186]], color: 'gray', width: 2, arrow: true },
          txt(160, 208, '直径 約 10 万光年', 13, 'middle'),
          txt(160, 230, '恒星の数 約 2000 億個', 13, 'middle'),
        ]),
      },
      {
        id: 'space-mp2-c2',
        text: '地球は、北極と南極を結ぶ**地軸**を中心に、西から東へ 1 日 1 回**自転**し、太陽のまわりを 1 年で 1 回**公転**しています。地球 1 周は約 4 万 km なので、直径は約 1 万 3000 km です。',
        figure: scene([
          { type: 'circle', x: 150, y: 125, r: 70, fill: 'sky', stroke: 'line' },
          { type: 'line', points: [[112, 212], [188, 38]], width: 2, arrow: true },
          { type: 'line', points: [[84, 132], [110, 142], [150, 145], [190, 142], [214, 132]], color: 'blue', width: 3, arrow: true },
          txt(196, 40, '北極', 12),
          txt(104, 228, '南極', 12, 'end'),
          txt(196, 62, '地軸', 12, null, true),
          txt(220, 150, '自転（西→東）', 12),
          txt(316, 210, '1 周 約 4 万 km', 12, 'end'),
          txt(316, 230, '直径 約 1 万 3000 km', 12, 'end'),
        ]),
      },
      {
        id: 'space-mp2-c3',
        text: '北極側から見た地球では、太陽のほうを向いた地点が**正午**、反対側が**真夜中**です。自転の向きに進むと、正午→夕方→真夜中→明け方の順になります。地球の外側を向くと南で、自転で進む向きが東、その反対が西です。',
        // 明け方の地点（上）での方位: 外側（上）が南、自転で進む左が東、右が西
        figure: scene(earthFromPole().concat([
          txt(66, 126, '正午', 13, 'middle', true),
          txt(160, 196, '夕方', 13, 'middle', true),
          txt(222, 126, '真夜中', 13, null, true),
          txt(250, 30, '明け方の地点', 12),
          { type: 'arrow', x1: 160, y1: 66, x2: 160, y2: 32, color: 'green' },
          { type: 'arrow', x1: 156, y1: 70, x2: 118, y2: 70, color: 'green' },
          { type: 'arrow', x1: 164, y1: 70, x2: 202, y2: 70, color: 'green' },
          txt(168, 34, '南', 13, null, true),
          txt(112, 66, '東', 13, 'end', true),
          txt(208, 66, '西', 13, null, true),
          txt(316, 232, '北極の真上から見た図', 12, 'end'),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp2-w1', concept: 'sp-sun',
      prompt: '予想しよう。夜空に白い帯のように見える天の川は、何が集まったものだと思う？',
      options: ['たくさんの恒星', '水蒸気の雲', 'たくさんの惑星'],
      answer: 'a',
      explanation: '天の川は、わたしたちの銀河系の恒星の集まりを、内側から見たものです。宇宙の大きなつくりと、地球の自転について、このステージで学ぼう。',
      hint: '太陽のように、自ら光る星の集まりだよ。',
    }),
    problems: [
      choice({
        id: 'space-mp2-p1', concept: 'sp-sun',
        prompt: '銀河系には、およそ何個の恒星が集まっている？',
        options: ['約 2000 個', '約 2000 万個', '約 2000 億個'],
        answer: 'c',
        explanation: '銀河系には、約 2000 億個の恒星が集まっています。太陽はそのうちの 1 つです。',
        hint: 'とても大きな数。「億」の単位だよ。',
      }),
      fill({
        id: 'space-mp2-t1', concept: 'sp-rotation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地球の北極と南極を結ぶ軸を[b1]といい、地球がこれを中心に 1 日 1 回まわることを[b2]、太陽のまわりを 1 年で 1 回まわることを[b3]という。',
        blanks: [
          word('b1', ['地軸', '自転', '公転', '黄道'], '地軸'),
          word('b2', ['地軸', '自転', '公転', '黄道'], '自転'),
          word('b3', ['地軸', '自転', '公転', '黄道'], '公転'),
        ],
        explanation: '地球の回転の軸が**地軸**、地軸を中心とした 1 日 1 回の回転が**自転**、太陽のまわりを回る 1 年 1 回の動きが**公転**です。',
        hint: '「自分で回る」のが自転、「公（おおやけ）に回る」のが公転と覚えよう。',
      }),
      figureChoice({
        id: 'space-mp2-p2', concept: 'sp-rotation',
        prompt: '地球を北極の真上から見た図です（太陽の光は左から、自転は反時計回り）。ア〜エのうち、明け方の地点はどれ？（ア 左はし、イ 上はし、ウ 右はし、エ 下はし）',
        figure: scene(earthFromPole().concat([
          region('r1', 110, 120, 'ア'),
          region('r2', 160, 70, 'イ'),
          region('r3', 210, 120, 'ウ'),
          region('r4', 160, 170, 'エ'),
        ])),
        answer: 'r2',
        explanation: '太陽のほうを向いたアが正午、反対側のウが真夜中です。反時計回りに自転するので、正午のア → エ（夕方）→ ウ（真夜中）→ イ（明け方）の順に進みます。明け方はイです。',
        hint: '真夜中の地点が、自転の向きに進んだ先が明け方だよ。',
      }),
      figureChoice({
        id: 'space-mp2-p3', concept: 'sp-rotation',
        prompt: '地球を北極の真上から見た図です（太陽の光は左から、自転は反時計回り）。正午の地点（左はし）に立って南の空を見ているとき、東はア〜ウのどの向き？（ア 図の上、イ 図の下、ウ 図の左）',
        figure: scene(earthFromPole().concat([
          { type: 'arrow', x1: 110, y1: 116, x2: 110, y2: 80, color: 'green' },
          { type: 'arrow', x1: 110, y1: 124, x2: 110, y2: 160, color: 'green' },
          { type: 'arrow', x1: 106, y1: 120, x2: 70, y2: 120, color: 'green' },
          region('r1', 110, 62, 'ア'),
          region('r2', 110, 182, 'イ'),
          region('r3', 52, 120, 'ウ'),
        ])),
        answer: 'r2',
        explanation: '東は、自転によってその地点が進んでいく向きです。反時計回りの自転では、左はしの地点は図の下へ進むので、東はイです。地球の外側（ウ）が南、アが西になります。',
        hint: '自転の矢印にそって、左はしの地点がどちらへ動くか考えよう。',
      }),
      choice({
        id: 'space-mp2-p4', concept: 'sp-rotation',
        prompt: '地球 1 周の長さは約 4 万 km です。地球の直径はおよそどれくらい？',
        options: ['約 1300 km', '約 13000 km', '約 130000 km'],
        answer: 'b',
        explanation: '円周 ＝ 直径 × 3.14 なので、直径 ＝ 40000 ÷ 3.14 ≒ 12700 km、およそ 13000 km（1 万 3000 km）です。',
        hint: '円周を 3.14 でわると直径が出るよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-mp2-r1', concept: 'sp-sun',
        prompt: '銀河系の直径はおよそどれくらい？',
        options: ['約 10 光年', '約 1000 光年', '約 10 万光年'],
        answer: 'c',
        explanation: '銀河系は、直径約 10 万光年の円盤の形をしています。1 光年は、光が 1 年かかって進む距離です。',
        hint: '光でも 10 万年かかる大きさだよ。',
      }),
      fill({
        id: 'space-mp2-r2', concept: 'sp-sun',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '恒星が非常に多く集まった大集団を[b1]といい、太陽や地球がふくまれるものを[b2]という。',
        blanks: [
          word('b1', ['銀河', '星座', '太陽系'], '銀河'),
          word('b2', ['銀河系', '星座', '太陽系'], '銀河系'),
        ],
        explanation: '恒星の大集団が**銀河**で、宇宙には数多くの銀河があります。わたしたちの太陽系がふくまれる銀河が**銀河系**（天の川銀河）です。',
        hint: '「〜系」と付くのが、わたしたちの銀河だよ。',
      }),
      figureChoice({
        id: 'space-mp2-r3', concept: 'sp-rotation',
        prompt: '地球を北極の真上から見た図です（太陽の光は左から、自転は反時計回り）。ア〜エのうち、夕方の地点はどれ？（ア 上はし、イ 右はし、ウ 下はし、エ 左はし）',
        figure: scene(earthFromPole().concat([
          region('r1', 160, 70, 'ア'),
          region('r2', 210, 120, 'イ'),
          region('r3', 160, 170, 'ウ'),
          region('r4', 110, 120, 'エ'),
        ])),
        answer: 'r3',
        explanation: '太陽のほうを向いたエが正午です。反時計回りに自転するので、正午の地点は次に下はしのウへ進み、昼から夜へ移ります。夕方はウです。',
        hint: '正午の地点が、自転の向きに進んだ先が夕方だよ。',
      }),
      choice({
        id: 'space-mp2-r4', concept: 'sp-rotation',
        prompt: '北極の真上から見ると、地球はどの向きに自転している？',
        options: ['反時計回り（西から東）', '時計回り（西から東）', '反時計回り（東から西）'],
        answer: 'a',
        explanation: '地球は西から東へ自転していて、北極の真上から見ると反時計回りです。そのため、太陽や星は東から西へ動いて見えます。',
        hint: '太陽が東からのぼることから考えよう。',
      }),
      choice({
        id: 'space-mp2-r5', concept: 'sp-rotation',
        prompt: '北極の真上から見た地球の図で、地球の表面のある地点に立っているとき、北はどの向き？',
        options: ['北極（図の中心）の向き', '地球の外側の向き', '自転で進む向き'],
        answer: 'a',
        explanation: 'どの地点でも、北は北極のある向きです。北極の真上から見た図では、図の中心（北極）の向きが北、外側が南になります。',
        hint: '北極は、北のはしにあるね。',
      }),
    ],
  };

  // ---- ステージ space-mp3: プリント 3 透明半球と黄道 ----
  const SUMMER_NOON = sunAt(SUMMER, 12);
  const spaceMp3 = {
    id: 'space-mp3', areaId: 'sp-miniprint', title: 'プリント 3: 透明半球と黄道', minutes: 5, concepts: ['sp-hemisphere', 'sp-revolution'],
    lessons: [
      {
        id: 'space-mp3-c1',
        text: '透明半球に太陽の位置を記録するときは、ペン先の影が半球の中心 O に重なるようにして印をつけます。太陽が真南にくることを**南中**、そのときの地平線からの角度を**南中高度**といいます。',
        figure: scene(hemisphereBase().concat(sunPathItems(SUMMER, 8, 16)).concat([
          { type: 'circle', x: HX, y: HY, r: 4, fill: 'blue', stroke: 'none' },
          txt(170, 186, 'O（観測者）', 12),
          { type: 'circle', x: SUMMER_NOON[0], y: SUMMER_NOON[1], r: 7, fill: 'yellow', stroke: 'orange' },
          txt(176, 40, '南中（真南にくる）', 12),
          txt(4, 20, 'ペン先の影を O に合わせる', 12, null, true),
        ])),
      },
      {
        id: 'space-mp3-c2',
        text: '1 時間ごとの印の間隔は等しいので、印のあいだの長さから時間が分かります。たとえば間隔が 3 cm のとき、9 時の印から日の出の点まで 9 cm なら、9 ÷ 3 ＝ 3 時間前の午前 6 時が日の出の時刻です。',
        // 記録の曲線をまっすぐにのばして表した図（1 cm ＝ 20px）
        figure: scene([
          { type: 'line', points: [[30, 120], [290, 120]], color: 'orange', width: 2 },
          { type: 'circle', x: 30, y: 120, r: 6, fill: 'white', stroke: 'orange' },
          { type: 'circle', x: 210, y: 120, r: 5, fill: 'ink', stroke: 'none' },
          { type: 'circle', x: 270, y: 120, r: 5, fill: 'ink', stroke: 'none' },
          txt(30, 100, '日の出の点', 12, 'start'),
          txt(210, 100, '9 時', 13, 'middle'),
          txt(270, 100, '10 時', 13, 'middle'),
          { type: 'line', points: [[30, 148], [210, 148]], color: 'gray', width: 2 },
          { type: 'line', points: [[210, 148], [270, 148]], color: 'blue', width: 2 },
          txt(120, 170, '9 cm', 13, 'middle'),
          txt(240, 170, '3 cm', 13, 'middle'),
          txt(160, 206, '9 ÷ 3 ＝ 3 時間 → 9 時の 3 時間前', 13, 'middle'),
          txt(160, 228, '日の出は午前 6 時', 13, 'middle', true),
        ]),
      },
      {
        id: 'space-mp3-c3',
        text: '地球が公転すると、地球から見た太陽の方向にある星座が変わり、太陽は星座のあいだを 1 年かけて動くように見えます。この見かけの通り道を**黄道**といいます。太陽と同じ方向の星座は昼の空にあるので見えません。',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          { type: 'line', points: [[212, 120], [40, 120]], color: 'blue', width: 2, dashed: true, arrow: true },
          txt(4, 236, '地球が A のとき、太陽はさそり座の方向に見える', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp3-w1', concept: 'sp-hemisphere',
      prompt: '予想しよう。透明半球に 1 時間ごとにつけた太陽の印の間隔は、どうなっていると思う？',
      options: ['どこも等しい', '正午ごろが広い', '朝と夕方が広い'],
      answer: 'a',
      explanation: '地球は一定の速さで自転しているので、太陽も一定の速さで動いて見え、1 時間ごとの印の間隔は等しくなります。この性質を使って、日の出の時刻なども求められます。',
      hint: '地球の自転の速さは、時刻によって変わるかな。',
    }),
    problems: [
      figureChoice({
        id: 'space-mp3-p1', concept: 'sp-hemisphere',
        prompt: '夏のある日、透明半球に 1 時間ごとの太陽の位置（●）を記録しました（方位は書いていない）。ア〜エのうち、南はどれ？',
        figure: scene(hemisphereBare().concat(sunPathItems(SUMMER, 8, 16)).concat([
          region('r1', 40, 170, 'ア'),
          region('r2', 160, 130, 'イ'),
          region('r3', 280, 170, 'ウ'),
          region('r4', 160, 210, 'エ'),
        ])),
        answer: 'r2',
        explanation: '太陽は東からのぼり、南の空を通って西へしずみます。太陽の通り道がかたむいている側、つまり南中する側のイが南です。南を向いて見ると、左手（ア）が東、右手（ウ）が西、手前（エ）が北になります。',
        hint: '太陽がいちばん高くなるとき、太陽はどの方位にあるかな。',
      }),
      fill({
        id: 'space-mp3-t1', concept: 'sp-hemisphere', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '太陽が真南にくることを[b1]といい、そのときの地平線と太陽のあいだの角度を[b2]という。',
        blanks: [
          word('b1', ['南中', '南中高度', '日周運動'], '南中'),
          word('b2', ['南中', '南中高度', '日周運動'], '南中高度'),
        ],
        explanation: '太陽が真南にくることが**南中**、そのときの高度（地平線からの角度）が**南中高度**です。透明半球では、南のふち・中心 O・南中の位置がつくる角が南中高度です。',
        hint: '「高度」は角度を表す言葉だよ。',
      }),
      fill({
        id: 'space-mp3-p2', concept: 'sp-hemisphere',
        prompt: '空らんに入る数を入れよう。',
        text: '透明半球の記録で、1 時間ごとの印の間隔は 2 cm だった。午前 9 時の印から、正午（12 時）の印までの長さは[b1]である。',
        blanks: [number('b1', 6, 0, 'cm')],
        explanation: '9 時から 12 時までは 3 時間です。1 時間に 2 cm なので、2 cm × 3 ＝ 6 cm です。',
        hint: '何時間ぶんの長さかを考えよう。',
      }),
      fill({
        id: 'space-mp3-p3', concept: 'sp-hemisphere',
        prompt: '空らんに入る数を入れよう。',
        text: '透明半球の記録で、1 時間ごとの印の間隔は 2 cm だった。午前 8 時の印から、曲線を東へのばして底の円と交わる点までの長さは 8 cm だった。日の出の時刻は午前[b1]である。',
        blanks: [number('b1', 4, 0, '時')],
        explanation: '8 cm ÷ 2 cm ＝ 4 なので、日の出は 8 時の印の 4 時間前です。8 時 − 4 時間 ＝ 午前 4 時です。',
        hint: '8 cm が何時間ぶんかを考えよう。',
      }),
      figureChoice({
        id: 'space-mp3-p4', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が A の位置にあるとき、地球から見て太陽の向こう側（太陽と同じ方向）にある星座はどれ？（ア オリオン座、イ しし座、ウ さそり座、エ ペガスス座）',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          region('r1', STARS.orion[0], STARS.orion[1], 'ア'),
          region('r2', STARS.leo[0], STARS.leo[1], 'イ'),
          region('r3', STARS.scorpius[0], STARS.scorpius[1], 'ウ'),
          region('r4', STARS.pegasus[0], STARS.pegasus[1], 'エ'),
        ])),
        answer: 'r3',
        explanation: 'A の地球から太陽のほうを見ると、その先にはウのさそり座があります。このとき太陽はさそり座の方向にあるように見え、さそり座は昼の空にあるので見えません。',
        hint: 'A から太陽を通るまっすぐな線をのばしてみよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-mp3-r1', concept: 'sp-hemisphere',
        prompt: '透明半球に太陽の位置をペンで記録するとき、ペン先の影をどこに重ねる？',
        options: ['透明半球の中心 O（底の円の中心）', '透明半球のいちばん高いところ', '底の円の南のはし'],
        answer: 'a',
        explanation: '中心 O は観測者の位置を表します。ペン先の影を O に重ねると、O から見た太陽の方向が半球の上に記録されます。',
        hint: '観測者の位置を表しているのはどこかな。',
      }),
      fill({
        id: 'space-mp3-r2', concept: 'sp-hemisphere',
        prompt: '空らんに入る数を入れよう。',
        text: '別の日の記録で、1 時間ごとの印の間隔は 2 cm、午前 8 時の印から日の出の点までの長さは 7.5 cm だった。日の出の時刻は午前[b1]時[b2]分である。',
        blanks: [number('b1', 4, 0, '時'), number('b2', 15, 0, '分')],
        explanation: '7.5 cm ÷ 2 cm ＝ 3.75 時間 ＝ 3 時間 45 分です。8 時の 3 時間 45 分前なので、午前 4 時 15 分です。',
        hint: '0.75 時間は何分かな（1 時間 ＝ 60 分）。',
      }),
      figureChoice({
        id: 'space-mp3-r3', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が B の位置にあるとき、太陽と同じ方向にあって見えない星座はどれ？（ア オリオン座、イ しし座、ウ さそり座、エ ペガスス座）',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          region('r1', STARS.orion[0], STARS.orion[1], 'ア'),
          region('r2', STARS.leo[0], STARS.leo[1], 'イ'),
          region('r3', STARS.scorpius[0], STARS.scorpius[1], 'ウ'),
          region('r4', STARS.pegasus[0], STARS.pegasus[1], 'エ'),
        ])),
        answer: 'r4',
        explanation: 'B の地球から太陽のほうを見ると、その先にはエのペガスス座があります。このときペガスス座は太陽と同じ方向にあり、昼の空にあるので見えません。',
        hint: 'B から太陽を通る線をのばしてみよう。',
      }),
      choice({
        id: 'space-mp3-r4', concept: 'sp-revolution',
        prompt: '地球から見て、太陽が星座のあいだを 1 年かけて動いていくように見える通り道を、漢字 2 文字で何という？',
        options: ['黄道', '赤道', '軌道'],
        answer: 'a',
        explanation: '太陽の見かけの通り道を**黄道**といいます。地球が公転して、太陽の見える方向が変わるために起こります。',
        hint: '太陽の色を思いうかべよう。',
      }),
      figureChoice({
        id: 'space-mp3-r5', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が C の位置にあるとき、太陽の向こう側にある星座はどれ？（ア オリオン座、イ しし座、ウ さそり座、エ ペガスス座）',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          region('r1', STARS.orion[0], STARS.orion[1], 'ア'),
          region('r2', STARS.leo[0], STARS.leo[1], 'イ'),
          region('r3', STARS.scorpius[0], STARS.scorpius[1], 'ウ'),
          region('r4', STARS.pegasus[0], STARS.pegasus[1], 'エ'),
        ])),
        answer: 'r1',
        explanation: 'C の地球から太陽のほうを見ると、その先にはアのオリオン座があります。日本が夏のころなので、オリオン座は昼の空にあって見えません。',
        hint: 'C から太陽を通る線をのばしてみよう。',
      }),
    ],
  };

  // ---- ステージ space-mp4: プリント 4 季節と南中高度 ----
  const spaceMp4 = {
    id: 'space-mp4', areaId: 'sp-miniprint', title: 'プリント 4: 季節と南中高度', minutes: 5, concepts: ['sp-season'],
    lessons: [
      {
        id: 'space-mp4-c1',
        text: '東京（北緯約 35°）では、太陽の南中高度は**夏至**のころに最も高く約 78°、**冬至**のころに最も低く約 32° です。昼の長さも、夏至のころが最も長く約 14.5 時間、冬至のころが最も短く約 10 時間です。',
        figure: scene(noonBase().concat([
          { type: 'line', points: [[150, 200], NOON.summer], color: 'gray', width: 1.5 },
          { type: 'line', points: [[150, 200], NOON.winter], color: 'gray', width: 1.5 },
          { type: 'circle', x: NOON.summer[0], y: NOON.summer[1], r: 9, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: NOON.winter[0], y: NOON.winter[1], r: 9, fill: 'yellow', stroke: 'orange' },
          txt(192, 62, '夏至 約 78°', 12),
          txt(256, 112, '冬至 約 32°', 12, 'end'),
          txt(8, 20, '昼の長さ', 12, null, true),
          txt(8, 38, '夏至 約 14.5 時間', 12),
          txt(8, 54, '冬至 約 10 時間', 12),
        ])),
      },
      {
        id: 'space-mp4-c2',
        text: '北半球では、冬至の南中高度は「90° − 緯度 − 23.4°」、夏至は「90° − 緯度 ＋ 23.4°」で求められます。季節があるのは、地球が**地軸**を傾けたまま**公転**し、南中高度と昼の長さが変わるからです。',
        figure: scene(seasonSide().concat([
          txt(40, 150, '夏至', 13, 'middle', true),
          txt(280, 150, '冬至', 13, 'middle', true),
          txt(8, 22, '地軸を傾けたまま公転する', 12),
          txt(8, 206, '冬至: 90° − 緯度 − 23.4°', 12),
          txt(8, 226, '夏至: 90° − 緯度 ＋ 23.4°', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp4-w1', concept: 'sp-season',
      prompt: '予想しよう。日本で、太陽の南中高度がいちばん高くなるのはいつごろだと思う？',
      options: ['夏至のころ', '冬至のころ', '春分のころ'],
      answer: 'a',
      explanation: '夏至のころ（6 月下旬）は、北半球が太陽のほうへ傾いているので、南中高度がいちばん高くなります。季節による変化を、このステージで確かめよう。',
      hint: '夏の正午の太陽は、とても高いね。',
    }),
    problems: [
      choice({
        id: 'space-mp4-p1', concept: 'sp-season',
        prompt: '東京で、太陽の南中高度がいちばん高くなる日と、そのおよその角度の組み合わせはどれ？',
        options: ['夏至・約 78°', '冬至・約 78°', '夏至・約 55°', '春分・約 78°'],
        answer: 'a',
        explanation: '南中高度は夏至のころにいちばん高く、北緯 35° では 90° − 35° ＋ 23.4° ≒ 78° です。55° は春分・秋分のころの南中高度です。',
        hint: '夏至は、春分より 23.4° 高いよ。',
      }),
      choice({
        id: 'space-mp4-p2', concept: 'sp-season',
        prompt: '東京で、太陽の南中高度がいちばん低くなる日と、そのおよその角度の組み合わせはどれ？',
        options: ['冬至・約 32°', '夏至・約 32°', '冬至・約 55°', '秋分・約 32°'],
        answer: 'a',
        explanation: '南中高度は冬至のころにいちばん低く、北緯 35° では 90° − 35° − 23.4° ≒ 32° です。',
        hint: '冬至は、春分より 23.4° 低いよ。',
      }),
      choice({
        id: 'space-mp4-p3', concept: 'sp-season',
        prompt: '東京で、昼の時間がいちばん長い日と、そのおよその長さの組み合わせはどれ？',
        options: ['夏至・約 14.5 時間', '冬至・約 14.5 時間', '春分・約 12 時間', '夏至・約 10 時間'],
        answer: 'a',
        explanation: '昼の長さは夏至のころがいちばん長く、東京では約 14.5 時間です。冬至のころは約 10 時間、春分・秋分のころは約 12 時間です。',
        hint: '夏は日の出が早く、日の入りがおそいね。',
      }),
      figureChoice({
        id: 'space-mp4-p4', concept: 'sp-season',
        prompt: '太陽のまわりを公転する地球を横から見た図です（矢印の先が北極で、地軸の傾きの向きはいつも同じ）。ア〜ウのうち、日本が冬のときの地球の位置はどれ？（ア 左の地球、イ 右の地球、ウ 手前の地球）',
        figure: scene(seasonSide().concat([
          region('r1', 40, 168, 'ア'),
          region('r2', 280, 168, 'イ'),
          region('r3', 160, 204, 'ウ'),
        ])),
        answer: 'r2',
        explanation: '日本（北半球）が冬になるのは、北極が太陽と反対のほうへ傾いている位置です。イの地球は、北極の矢印が太陽と反対の右へ傾いているので冬至のころです。アは夏至、ウは春分か秋分のころです。',
        hint: '北極の矢印が、太陽と反対のほうへ傾いている地球をさがそう。',
      }),
      fill({
        id: 'space-mp4-p5', concept: 'sp-season',
        prompt: '空らんに入る数を入れよう。（地軸の傾きは 23.4° とする）',
        text: '北緯 36° の地点 P で、冬至の日の太陽の南中高度は[b1]である。',
        blanks: [number('b1', 30.6, 0.1, '°')],
        explanation: '冬至の南中高度 ＝ 90° − 緯度 − 23.4° ＝ 90° − 36° − 23.4° ＝ 30.6° です。',
        hint: 'まず 90° − 緯度 を出してから、23.4° をひこう。',
      }),
      fill({
        id: 'space-mp4-t1', concept: 'sp-season', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '日本に季節があるのは、地球が[b1]を傾けたまま、太陽のまわりを[b2]しているからである。',
        blanks: [
          word('b1', ['地軸', '赤道', '黄道'], '地軸'),
          word('b2', ['公転', '自転', '日周運動'], '公転'),
        ],
        explanation: '地球は**地軸**を約 23.4° 傾けたまま**公転**しています。そのため、季節によって南中高度と昼の長さが変わり、季節が生まれます。',
        hint: '傾いているのは地球の「軸」だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-mp4-r1', concept: 'sp-season',
        prompt: '日本（北緯約 35°）で、夏と冬の昼間の長さをくらべるとどうなる？',
        options: ['夏が長い', '冬が長い', '差はない'],
        answer: 'a',
        explanation: '夏は太陽の通り道が長く、昼間が長くなります。冬は通り道が短く、昼間が短くなります。',
        hint: '夏は夜 7 時ごろまで明るいね。',
      }),
      choice({
        id: 'space-mp4-r2', concept: 'sp-season',
        prompt: '日本で、夏と冬の日の出の時刻をくらべるとどうなる？',
        options: ['夏が早い', '冬が早い', '差はない'],
        answer: 'a',
        explanation: '夏は太陽が真東より北寄りから早くのぼり、冬は真東より南寄りからおそくのぼります。',
        hint: '夏の朝は早くから明るいね。',
      }),
      choice({
        id: 'space-mp4-r3', concept: 'sp-season',
        prompt: '日本で、夏と冬の太陽の南中高度をくらべるとどうなる？',
        options: ['夏が高い', '冬が高い', '差はない'],
        answer: 'a',
        explanation: '夏は北半球が太陽のほうへ傾くので、南中高度が高くなります。冬は低くなります。',
        hint: '冬の正午のかげは長いね。',
      }),
      fill({
        id: 'space-mp4-r4', concept: 'sp-season',
        prompt: '空らんに入る数を入れよう。（地軸の傾きは 23.4° とする）',
        text: '北緯 36° の地点で、夏至の日の太陽の南中高度は[b1]である。',
        blanks: [number('b1', 77.4, 0.1, '°')],
        explanation: '夏至の南中高度 ＝ 90° − 緯度 ＋ 23.4° ＝ 90° − 36° ＋ 23.4° ＝ 77.4° です。',
        hint: '90° − 緯度 に 23.4° をたそう。',
      }),
      choice({
        id: 'space-mp4-r5', concept: 'sp-season',
        prompt: '昼の長さや南中高度が季節によって変わる理由として、正しい組み合わせはどれ？',
        options: ['地球が公転していて、地軸が傾いているから', '地球が自転していて、地軸が傾いていないから', '地球が公転していて、地軸が傾いていないから'],
        answer: 'a',
        explanation: '地軸が傾いたまま公転するので、太陽の光の当たり方が季節によって変わります。地軸が傾いていなければ、季節の変化はほとんど起こりません。',
        hint: '「公転」と「地軸の傾き」の 2 つがそろうことが大切だよ。',
      }),
    ],
  };

  // ---- ステージ space-mp5: プリント 5 星の日周運動と年周運動 ----
  const spaceMp5 = {
    id: 'space-mp5', areaId: 'sp-miniprint', title: 'プリント 5: 星の日周運動と年周運動', minutes: 5, concepts: ['sp-rotation', 'sp-revolution'],
    lessons: [
      {
        id: 'space-mp5-c1',
        text: '星は、東の空では右上へのぼり、南の空では東から西へ弧をえがき、西の空では右下へしずみます。北の空では**北極星**を中心に反時計回りに回ります。これは地球の**自転**による**日周運動**です。',
        figure: scene([
          ...skyPanel(6, 6, 150, 100, 'east', '東の空'),
          ...skyPanel(164, 6, 150, 100, 'south', '南の空'),
          ...skyPanel(6, 120, 150, 100, 'west', '西の空'),
          ...skyPanel(164, 120, 150, 100, 'north', '北の空'),
          txt(160, 236, '北の空の中心: 北極星（ほとんど動かない）', 12, 'middle'),
        ]),
      },
      {
        id: 'space-mp5-c2',
        text: '同じ時刻に見える星座の位置は、1 か月に約 30° ずつ東から西へずれ、1 年でもとにもどります（**年周運動**）。季節によって、夜に南の空に見える星座が変わるのは、地球が**公転**しているからです。',
        figure: scene(orbitBase(false).concat(starDots()).concat([
          txt(4, 236, '公転につれて、真夜中に見える星座が変わる', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp5-w1', concept: 'sp-rotation',
      prompt: '予想しよう。北の空の星の中で、ほとんど動かないように見える星は何だと思う？',
      options: ['北極星', '金星', '月'],
      answer: 'a',
      explanation: '北極星は地軸をのばした先の近くにあるので、ほとんど動きません。北の空の星は北極星を中心に回って見えます。星の動きを、このステージで確かめよう。',
      hint: '方角を知るのに使われてきた星だよ。',
    }),
    problems: [
      figureChoice({
        id: 'space-mp5-p1', concept: 'sp-rotation',
        prompt: 'ア〜エは、東・西・南・北の空で、星が動いて見えるようすを表した図です（地面は茶色の線）。南の空の星の動きはどれ？',
        figure: scene([
          ...skyPanel(6, 6, 150, 100, 'west'),
          ...skyPanel(164, 6, 150, 100, 'south'),
          ...skyPanel(6, 120, 150, 100, 'north'),
          ...skyPanel(164, 120, 150, 100, 'east'),
          region('r1', 134, 30, 'ア'),
          region('r2', 292, 30, 'イ'),
          region('r3', 134, 144, 'ウ'),
          region('r4', 292, 144, 'エ'),
        ]),
        answer: 'r2',
        explanation: '南の空では、星は東（左）からのぼって、弧をえがきながら西（右）へ動きます。イです。アは西の空（右下へしずむ）、ウは北の空（北極星を中心に回る）、エは東の空（右上へのぼる）です。',
        hint: '南を向いて立つと、東は左、西は右だよ。',
      }),
      fill({
        id: 'space-mp5-t1', concept: 'sp-rotation', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '星が 1 日で天球を 1 周するように動いて見える運動を[b1]といい、地球の[b2]によって起こる。',
        blanks: [
          word('b1', ['日周運動', '年周運動', '公転'], '日周運動'),
          word('b2', ['自転', '公転', '地軸'], '自転'),
        ],
        explanation: '星の 1 日の見かけの動きが**日周運動**で、地球が 1 日 1 回**自転**するために起こります。',
        hint: '「1 日」の動きを表す言葉だよ。',
      }),
      choice({
        id: 'space-mp5-p2', concept: 'sp-rotation',
        prompt: '北の空の星が、ほとんど動かない星を中心に回っていました。中心の星の名前はどれ？',
        options: ['北極星', 'シリウス', '金星'],
        answer: 'a',
        explanation: '北の空の中心にあってほとんど動かないのは**北極星**です。地軸をのばした先の近くにあるからです。',
        hint: '「北」の字が入る星だよ。',
      }),
      figureChoice({
        id: 'space-mp5-p3', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が C の位置にあるとき、真夜中に南の空に見える星座はどれ？（ア オリオン座、イ しし座、ウ さそり座、エ ペガスス座）',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          region('r1', STARS.orion[0], STARS.orion[1], 'ア'),
          region('r2', STARS.leo[0], STARS.leo[1], 'イ'),
          region('r3', STARS.scorpius[0], STARS.scorpius[1], 'ウ'),
          region('r4', STARS.pegasus[0], STARS.pegasus[1], 'エ'),
        ])),
        answer: 'r3',
        explanation: '真夜中の地点は、地球の太陽と反対側です。C の地球から太陽と反対の方向にあるのは、ウのさそり座です（日本の夏）。',
        hint: '太陽と反対の方向にある星座をさがそう。',
      }),
      choice({
        id: 'space-mp5-p4', concept: 'sp-revolution',
        prompt: '季節によって、夜に南の空に見える星座が変わるのは、地球のどんな運動によるもの？',
        options: ['公転', '自転', '地軸の傾き'],
        answer: 'a',
        explanation: '地球が太陽のまわりを公転すると、夜の側が向く方向が変わるので、季節によって夜に見える星座が変わります。',
        hint: '1 年でひと回りする運動だよ。',
      }),
      choice({
        id: 'space-mp5-p5', concept: 'sp-revolution',
        prompt: '毎月同じ夜 9 時にオリオン座を観察すると、オリオン座の位置は 1 か月ごとにどちらへずれていく？',
        options: ['西', '東', '北'],
        answer: 'a',
        explanation: '年周運動により、同じ時刻に見える星座は 1 か月に約 30° ずつ東から西へずれていきます。',
        hint: '星の日周運動と同じ向きにずれるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-mp5-r1', concept: 'sp-rotation',
        prompt: '東の空の星は、どのように動いて見える？',
        options: ['右上へ向かってのぼっていく', '右下へ向かってしずんでいく', '北極星を中心に回る'],
        answer: 'a',
        explanation: '東の空の星は、地平線から右上（南のほう）へ向かってのぼっていきます。',
        hint: '東を向くと、南は右手だよ。',
      }),
      choice({
        id: 'space-mp5-r2', concept: 'sp-rotation',
        prompt: '星の日周運動が起こるのはなぜ？',
        options: ['地球が地軸を中心に自転しているから', '地球が太陽のまわりを公転しているから', '星が地球のまわりを回っているから'],
        answer: 'a',
        explanation: '地球が西から東へ自転しているので、星は東から西へ、1 日で 1 周するように動いて見えます。',
        hint: '1 日の動きの原因だよ。',
      }),
      figureChoice({
        id: 'space-mp5-r3', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が B の位置にあるとき、真夜中に南の空に見える星座はどれ？（ア オリオン座、イ しし座、ウ さそり座、エ ペガスス座）',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          region('r1', STARS.orion[0], STARS.orion[1], 'ア'),
          region('r2', STARS.leo[0], STARS.leo[1], 'イ'),
          region('r3', STARS.scorpius[0], STARS.scorpius[1], 'ウ'),
          region('r4', STARS.pegasus[0], STARS.pegasus[1], 'エ'),
        ])),
        answer: 'r2',
        explanation: 'B の地球から太陽と反対の方向にあるのは、イのしし座です（日本の春）。',
        hint: '太陽と反対の方向にある星座をさがそう。',
      }),
      fill({
        id: 'space-mp5-r4', concept: 'sp-revolution',
        prompt: '空らんに入る数を入れよう。',
        text: '同じ時刻に見える星座の位置は、3 か月で約[b1]西へ動く。',
        blanks: [number('b1', 90, 0, '°')],
        explanation: '年周運動では 1 か月に約 30° 動くので、3 か月では 30° × 3 ＝ 90° です。',
        hint: '1 か月に約 30° だよ。',
      }),
      choice({
        id: 'space-mp5-r5', concept: 'sp-revolution',
        prompt: '同じ時刻に見えるオリオン座の位置は、1 か月でおよそ何度ずれる？',
        options: ['約 30°', '約 15°', '約 1°'],
        answer: 'a',
        explanation: '地球は 1 年（12 か月）で 360° 公転するので、1 か月では 360° ÷ 12 ＝ 約 30° ずれます。15° は日周運動の 1 時間の角度です。',
        hint: '360° を 12 か月でわろう。',
      }),
      choice({
        id: 'space-mp5-r6', concept: 'sp-revolution',
        prompt: '同じ時刻に見える星座の位置が、1 年かけてひと回りするように動いて見える運動を何という？',
        options: ['年周運動', '日周運動', '自転'],
        answer: 'a',
        explanation: '1 年周期の星座の見かけの動きを**年周運動**といいます。地球の公転によって起こります。',
        hint: '「1 年」の動きだよ。',
      }),
    ],
  };

  // ---- ステージ space-mp6: プリント 6 夜に見える星座と方角 ----
  // 星座の方向の図（ア オリオン座、イ しし座、ウ さそり座、エ ペガスス座）
  function starChoices() {
    return orbitBase(true).concat(starDots()).concat([
      region('r1', STARS.orion[0], STARS.orion[1], 'ア'),
      region('r2', STARS.leo[0], STARS.leo[1], 'イ'),
      region('r3', STARS.scorpius[0], STARS.scorpius[1], 'ウ'),
      region('r4', STARS.pegasus[0], STARS.pegasus[1], 'エ'),
    ]);
  }
  const STAR_CHOICES = '（ア オリオン座、イ しし座、ウ さそり座、エ ペガスス座）';
  const spaceMp6 = {
    id: 'space-mp6', areaId: 'sp-miniprint', title: 'プリント 6: 夜に見える星座と方角', minutes: 5, concepts: ['sp-revolution'],
    lessons: [
      {
        id: 'space-mp6-c1',
        text: '真上から見た図では、地球の太陽と反対側が真夜中で、自転の向きに進むと 正午→夕方→真夜中→明け方 の順です。その地点で地球の外側を向いた方向が南の空、自転で進む向きが東、その反対が西です。',
        // 夕方の地点（下）: 外側（下）が南、自転で進む右が東、左が西
        figure: scene([
          { type: 'arrow', x1: 8, y1: 80, x2: 80, y2: 80, color: 'orange' },
          { type: 'arrow', x1: 8, y1: 160, x2: 80, y2: 160, color: 'orange' },
          txt(8, 66, '太陽の光', 12),
          ...litBody(160, 120, 44, 180, 'sky', NIGHT),
          arcLine(160, 120, 58, 20, 55, { color: 'blue', width: 3, arrow: true }),
          txt(108, 125, '正午', 13, 'end', true),
          txt(212, 125, '真夜中', 13, null, true),
          txt(160, 64, '明け方', 13, 'middle', true),
          { type: 'arrow', x1: 160, y1: 168, x2: 160, y2: 206, color: 'green' },
          { type: 'arrow', x1: 164, y1: 164, x2: 204, y2: 164, color: 'green' },
          { type: 'arrow', x1: 156, y1: 164, x2: 116, y2: 164, color: 'green' },
          txt(168, 206, '南', 13, null, true),
          txt(210, 170, '東', 13, null, true),
          txt(110, 170, '西', 13, 'end', true),
          txt(316, 230, '夕方の地点での方位', 12, 'end'),
        ]),
      },
      {
        id: 'space-mp6-c2',
        text: '地球が A の位置（日本の冬）にあるとき、真夜中には南の空にオリオン座が見え、東の空にはしし座がのぼり、西の空にはペガスス座がしずんでいきます。太陽と同じ方向のさそり座は見えません。',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          { type: 'arrow', x1: 234, y1: 120, x2: 274, y2: 120, color: 'green' },
          { type: 'arrow', x1: 222, y1: 108, x2: 222, y2: 70, color: 'green' },
          { type: 'arrow', x1: 222, y1: 132, x2: 222, y2: 170, color: 'green' },
          txt(256, 140, '南', 13, null, true),
          txt(228, 80, '東', 13, null, true),
          txt(228, 168, '西', 13, null, true),
          txt(4, 236, '地球が A のときの真夜中', 12),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp6-w1', concept: 'sp-revolution',
      prompt: '予想しよう。北極の真上から見たとき、地球の自転と公転の向きはどうなっていると思う？',
      options: ['どちらも反時計回り', '自転は反時計回り、公転は時計回り', 'どちらも時計回り'],
      answer: 'a',
      explanation: '地球の自転も公転も、西から東の向きで、北極の真上から見るとどちらも反時計回りです。この向きをもとに、見える星座と方角を考えよう。',
      hint: '自転も公転も、同じ向きだよ。',
    }),
    problems: [
      choice({
        id: 'space-mp6-p1', concept: 'sp-revolution',
        prompt: '北極の真上から見た地球の自転と公転の向きとして、正しいのはどれ？',
        options: ['自転も公転も反時計回り', '自転は反時計回り、公転は時計回り', '自転は時計回り、公転は反時計回り', '自転も公転も時計回り'],
        answer: 'a',
        explanation: '地球は、自転も公転も西から東の向きで、北極の真上から見ると反時計回りです。',
        hint: '自転と公転の向きは同じだよ。',
      }),
      fill({
        id: 'space-mp6-t1', concept: 'sp-revolution', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地球が地軸を中心に回ることを[b1]、太陽のまわりを回ることを[b2]という。',
        blanks: [
          word('b1', ['自転', '公転', '日周運動', '年周運動'], '自転'),
          word('b2', ['自転', '公転', '日周運動', '年周運動'], '公転'),
        ],
        explanation: '地球そのものの回転が**自転**（1 日 1 回）、太陽のまわりを回るのが**公転**（1 年 1 回）です。',
        hint: '自分で回るのが「自転」だよ。',
      }),
      figureChoice({
        id: 'space-mp6-p2', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が A の位置にあるとき、真夜中に東の空に見える星座はどれ？' + STAR_CHOICES,
        figure: scene(starChoices()),
        answer: 'r2',
        explanation: 'A の真夜中の地点は、地球の右はしです。外側（右）のオリオン座が南の空、自転で進む向き（上）が東なので、東の空にはイのしし座が見えます。',
        hint: '真夜中の地点で、自転で進む向きが東だよ。',
      }),
      figureChoice({
        id: 'space-mp6-p3', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が B の位置にあるとき、夕方に南の空に見える星座はどれ？' + STAR_CHOICES,
        figure: scene(starChoices()),
        answer: 'r1',
        explanation: 'B の地球では、太陽のほう（下）が正午です。反時計回りに自転して、次に右はしが夕方になります。夕方の地点で外側（右）を向くと南の空で、アのオリオン座が見えます。',
        hint: 'まず、B の地球の上で夕方の地点を見つけよう。',
      }),
      figureChoice({
        id: 'space-mp6-p4', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が D の位置にあるとき、明け方に西の空に見える星座はどれ？' + STAR_CHOICES,
        figure: scene(starChoices()),
        answer: 'r4',
        explanation: 'D の地球では、太陽のほう（上）が正午、左が夕方、下が真夜中、右が明け方です。明け方の地点では、外側（右）が南、自転で進む上が東、下が西です。西の空にはエのペガスス座が見えます。',
        hint: '明け方の地点を見つけて、その地点の西の向きを考えよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'space-mp6-r1', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が A の位置にあるとき、夕方に南の空に見える星座はどれ？' + STAR_CHOICES,
        figure: scene(starChoices()),
        answer: 'r4',
        explanation: 'A の地球では、太陽のほう（左）が正午で、反時計回りに自転して次に下はしが夕方になります。夕方の地点で外側（下）を向くと南の空で、エのペガスス座が見えます。',
        hint: 'まず、A の地球の上で夕方の地点を見つけよう。',
      }),
      figureChoice({
        id: 'space-mp6-r2', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球と、星座の方向を真上から見た図です。地球が C の位置にあるとき、真夜中に西の空に見える星座はどれ？' + STAR_CHOICES,
        figure: scene(starChoices()),
        answer: 'r2',
        explanation: 'C の真夜中の地点は、地球の左はしです。外側（左）のさそり座が南、自転で進む下が東、その反対の上が西なので、西の空にはイのしし座が見えます。',
        hint: '真夜中の地点で、自転で進む向きの反対が西だよ。',
      }),
      choice({
        id: 'space-mp6-r3', concept: 'sp-revolution',
        prompt: '地球が D の位置にあるとき、夕方にしし座は見える？（しし座は、D の地球から見て太陽と同じ方向にある）',
        options: ['太陽と同じ方向にあるので見えない', '夕方の東の空に見える', '夕方の南の空に見える'],
        answer: 'a',
        explanation: 'しし座が太陽と同じ方向にあるとき、しし座は太陽といっしょに昼の空にあり、夕方には太陽といっしょに西へしずんでいくので見えません。',
        hint: '太陽と同じ方向の星座は、明るい昼の空にあるよ。',
      }),
      figureChoice({
        id: 'space-mp6-r4', concept: 'sp-revolution',
        prompt: '太陽のまわりを公転する地球（A〜D は地球の位置）を真上から見た図です。ペガスス座が真夜中に東の空に見えるのは、地球がア〜エのどの位置にあるとき？（ア A、イ B、ウ C、エ D）',
        figure: scene(orbitBase(true).concat(starDots()).concat([
          region('r1', ORBIT.A[0], ORBIT.A[1], 'ア'),
          region('r2', ORBIT.B[0], ORBIT.B[1], 'イ'),
          region('r3', ORBIT.C[0], ORBIT.C[1], 'ウ'),
          region('r4', ORBIT.D[0], ORBIT.D[1], 'エ'),
        ])),
        answer: 'r3',
        explanation: '真夜中の地点で東は自転で進む向きです。C の真夜中の地点（左はし）は自転で下へ進むので、東は下で、下の方向にあるペガスス座が東の空に見えます。',
        hint: 'それぞれの位置の真夜中の地点で、自転で進む向きを調べよう。',
      }),
    ],
  };

  // ---- ステージ space-mp7: プリント 7 星の位置と時刻・月日の計算 ----
  const spaceMp7 = {
    id: 'space-mp7', areaId: 'sp-miniprint', title: 'プリント 7: 星の位置と時刻・月日の計算', minutes: 5, concepts: ['sp-rotation', 'sp-revolution'],
    lessons: [
      {
        id: 'space-mp7-c1',
        text: '星は日周運動で、1 時間に 15° 東から西へ動きます。年周運動では、同じ時刻の位置が 1 か月に 30° 西へずれます。そのため 1 か月後には、同じ位置に見える時刻が 2 時間早くなります。',
        figure: scene(skyArc().concat([
          SKY_NOTE,
          arcLine(160, 210, 166, 90, 75, { color: 'blue', width: 3, arrow: true }),
          txt(214, 62, '1 時間で 15° 西へ', 12),
          arcLine(160, 210, 130, 90, 60, { color: 'green', width: 3, arrow: true }),
          txt(160, 120, '1 か月で 30° 西へ', 12, 'middle'),
          txt(160, 140, '（同じ時刻にくらべて）', 12, 'middle'),
        ])),
      },
      {
        id: 'space-mp7-c2',
        text: '日周運動と年周運動を組み合わせるときは、ずれを角度でたし合わせます。例: 1 月 1 日 20 時に南中した星は、3 月 1 日 22 時には「60° 西 ＋ 30° 西」で、南中の位置から 90° 西に見えます。',
        figure: scene(skyArc().concat([
          SKY_NOTE,
          txt(150, 44, '1/1 20 時', 12, 'end'),
          { type: 'circle', x: skyAt(60)[0], y: skyAt(60)[1], r: 7, fill: 'yellow', stroke: 'orange' },
          txt(skyAt(60)[0] - 12, skyAt(60)[1] - 6, '3/1 20 時（60° 西）', 12, 'end'),
          { type: 'circle', x: skyAt(90)[0], y: skyAt(90)[1], r: 7, fill: 'yellow', stroke: 'orange' },
          txt(308, 190, '3/1 22 時（90° 西）', 12, 'end'),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp7-w1', concept: 'sp-rotation',
      prompt: '予想しよう。午後 8 時に南中した星は、同じ日の午後 9 時には、南中した位置からどちらへ動いて見えると思う？',
      options: ['西へ 15°', '東へ 15°', '動かない'],
      answer: 'a',
      explanation: '日周運動で、星は 1 時間に 15° 東から西へ動きます。だから 1 時間後には西へ 15° 動いて見えます。時刻と月日のずれを、このステージで計算しよう。',
      hint: '星は東から西へ動くね。',
    }),
    problems: [
      drag({
        id: 'space-mp7-p1', concept: 'sp-rotation',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。同じ日の 22 時に、この星はどこに見える？ 「星」の丸を動かして置こう。（印は 15° ごと）',
        // 22 時は 2 時間後なので 30° 西。不正解例は 30° 東
        figure: scene(skyArc().concat([dragStar()])),
        draggable: { itemId: 'star', axis: 'xy' },
        target: { x: skyAt(30)[0], y: skyAt(30)[1] },
        samples: { correct: { x: skyAt(30)[0], y: skyAt(30)[1] }, wrong: { x: skyAt(-30)[0], y: skyAt(-30)[1] } },
        explanation: '日周運動で、星は 1 時間に 15° 東から西へ動きます。2 時間後の 22 時には、15° × 2 ＝ 30° 西（P から右へ 2 目盛り）に見えます。',
        hint: '何時間たったかを数えて、15° をかけよう。',
      }),
      fill({
        id: 'space-mp7-t1', concept: 'sp-revolution', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '星が 1 時間に約 15° 動いて見えるのは[b1]、同じ時刻に見える星の位置が 1 か月に約 30° ずれるのは[b2]によるものである。',
        blanks: [
          word('b1', ['日周運動', '年周運動'], '日周運動'),
          word('b2', ['日周運動', '年周運動'], '年周運動'),
        ],
        explanation: '1 日の動き（地球の自転による）が**日周運動**、1 年の動き（地球の公転による）が**年周運動**です。',
        hint: '「1 日」と「1 年」で区別しよう。',
      }),
      fill({
        id: 'space-mp7-p2', concept: 'sp-rotation',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る言葉と数を入れよう。',
        text: '同じ日の 18 時には、この星は P から[b1]へ[b2]の位置に見える。',
        blanks: [word('b1', ['東', '西'], '東'), number('b2', 30, 0, '°')],
        explanation: '18 時は 20 時の 2 時間前です。星は 1 時間に 15° 西へ動くので、2 時間前には 15° × 2 ＝ 30° 東にあります。',
        hint: '時間をさかのぼると、星は東にもどるよ。',
      }),
      fill({
        id: 'space-mp7-p3', concept: 'sp-revolution',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る言葉と数を入れよう。',
        text: '2 月 1 日の 20 時には、この星は P から[b1]へ[b2]の位置に見える。',
        blanks: [word('b1', ['東', '西'], '西'), number('b2', 30, 0, '°')],
        explanation: '年周運動で、同じ時刻の星の位置は 1 か月に 30° 西へずれます。1 か月後の 2 月 1 日 20 時には、P から 30° 西に見えます。',
        hint: '1 か月で 30° 西へずれるよ。',
      }),
      drag({
        id: 'space-mp7-p4', concept: 'sp-revolution',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。2 月 1 日の 19 時に、この星はどこに見える？ 「星」の丸を動かして置こう。（印は 15° ごと）',
        // 1 か月で 30° 西、1 時間前なので 15° 東 → 15° 西。不正解例は 45° 西（時刻の向きを逆にした）
        figure: scene(skyArc().concat([dragStar()])),
        draggable: { itemId: 'star', axis: 'xy' },
        target: { x: skyAt(15)[0], y: skyAt(15)[1] },
        samples: { correct: { x: skyAt(15)[0], y: skyAt(15)[1] }, wrong: { x: skyAt(45)[0], y: skyAt(45)[1] } },
        explanation: '1 か月後の同じ 20 時なら 30° 西です。19 時はその 1 時間前なので、15° 東にもどります。30° 西 ＋ 15° 東 ＝ 15° 西（P から右へ 1 目盛り）です。',
        hint: '年周運動（月日）と日周運動（時刻）のずれを、順に考えよう。',
      }),
      fill({
        id: 'space-mp7-p5', concept: 'sp-revolution',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る言葉と数を入れよう。',
        text: '11 月 1 日の 23 時には、この星は P から[b1]へ[b2]の位置に見える。',
        blanks: [word('b1', ['東', '西'], '東'), number('b2', 15, 0, '°')],
        explanation: '11 月 1 日は 1 月 1 日の 2 か月前なので、同じ 20 時なら 30° × 2 ＝ 60° 東です。23 時はその 3 時間後なので、15° × 3 ＝ 45° 西へ動きます。60° 東 − 45° ＝ 15° 東です。',
        hint: 'まず 11 月 1 日 20 時の位置を出してから、3 時間ぶん動かそう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'space-mp7-r1', concept: 'sp-rotation',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る言葉と数を入れよう。',
        text: '同じ日の 24 時には、この星は P から[b1]へ[b2]の位置に見える。',
        blanks: [word('b1', ['東', '西'], '西'), number('b2', 60, 0, '°')],
        explanation: '24 時は 20 時の 4 時間後なので、15° × 4 ＝ 60° 西に見えます。',
        hint: '4 時間ぶん、15° ずつ西へ。',
      }),
      fill({
        id: 'space-mp7-r2', concept: 'sp-rotation',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る数を入れよう。',
        text: '同じ日、この星が P から 45° 西の位置に見えるのは[b1]時である。',
        blanks: [number('b1', 23, 0, '時')],
        explanation: '45° ÷ 15° ＝ 3 時間なので、20 時の 3 時間後の 23 時です。',
        hint: '45° は何時間ぶんかな。',
      }),
      fill({
        id: 'space-mp7-r3', concept: 'sp-revolution',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る数を入れよう。',
        text: '20 時に、この星が P から 90° 西の位置に見えるのは[b1]月 1 日である。',
        blanks: [number('b1', 4, 0, '月')],
        explanation: '同じ時刻の位置は 1 か月に 30° 西へずれます。90° ÷ 30° ＝ 3 か月なので、1 月の 3 か月後の 4 月 1 日です。',
        hint: '90° は何か月ぶんかな。',
      }),
      fill({
        id: 'space-mp7-r4', concept: 'sp-revolution',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る言葉と数を入れよう。',
        text: '12 月 1 日の 20 時には、この星は P から[b1]へ[b2]の位置に見える。',
        blanks: [word('b1', ['東', '西'], '東'), number('b2', 30, 0, '°')],
        explanation: '12 月 1 日は 1 月 1 日の 1 か月前です。1 か月前の同じ時刻には、30° 東にあります。',
        hint: '月日をさかのぼると、星は東にもどるよ。',
      }),
      fill({
        id: 'space-mp7-r5', concept: 'sp-revolution',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る言葉と数を入れよう。',
        text: '3 月 1 日の 20 時には、この星は P から[b1]へ[b2]の位置に見える。',
        blanks: [word('b1', ['東', '西'], '西'), number('b2', 60, 0, '°')],
        explanation: '3 月 1 日は 2 か月後なので、30° × 2 ＝ 60° 西に見えます。',
        hint: '1 か月に 30° 西へ。',
      }),
      drag({
        id: 'space-mp7-r6', concept: 'sp-revolution',
        prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。10 月 1 日の 22 時に、この星はどこに見える？ 「星」の丸を動かして置こう。（印は 15° ごと）',
        // 3 か月前なので 90° 東、2 時間後なので 30° 西 → 60° 東。不正解例は 60° 西
        figure: scene(skyArc().concat([dragStar()])),
        draggable: { itemId: 'star', axis: 'xy' },
        target: { x: skyAt(-60)[0], y: skyAt(-60)[1] },
        samples: { correct: { x: skyAt(-60)[0], y: skyAt(-60)[1] }, wrong: { x: skyAt(60)[0], y: skyAt(60)[1] } },
        explanation: '10 月 1 日は 3 か月前なので、同じ 20 時なら 30° × 3 ＝ 90° 東です。22 時はその 2 時間後で 30° 西へ動くので、90° 東 − 30° ＝ 60° 東（P から左へ 4 目盛り）です。',
        hint: 'まず 10 月 1 日 20 時の位置を出そう。',
      }),
    ],
  };

  // ---- ステージ space-mp8: プリント 8 宇宙の見方の歴史と時差 ----
  const spaceMp8 = {
    id: 'space-mp8', areaId: 'sp-miniprint', title: 'プリント 8: 宇宙の見方の歴史と時差', minutes: 5, concepts: ['sp-universe', 'sp-rotation'],
    lessons: [
      {
        id: 'space-mp8-c1',
        text: '昔は、地球のまわりを太陽や星が回るという**天動説**が信じられていました。コペルニクスは、地球が太陽のまわりを回るという**地動説**を唱え、ガリレオは望遠鏡での観測をもとに地動説を支持しました。',
        figure: scene(geoHelio().concat([
          txt(80, 196, '天動説', 14, 'middle', true),
          txt(80, 218, '地球が中心', 12, 'middle'),
          txt(240, 196, '地動説', 14, 'middle', true),
          txt(240, 218, '太陽が中心', 12, 'middle'),
        ])),
      },
      {
        id: 'space-mp8-c2',
        text: '地球は 24 時間で 360° 自転するので、経度 15° ごとに 1 時間の**時差**が生じます。経度 0° の経線を**本初子午線**といい、イギリスのグリニッジ天文台の跡を通ります。東経 30° の地点とは 2 時間の差です。',
        // 経度の目盛り（2px ＝ 1°）。0° から東経 135° まで
        figure: scene([
          { type: 'line', points: [[20, 120], [300, 120]], width: 3 },
          ...[0, 15, 30, 45, 60, 75, 90, 105, 120, 135].map(L => ({ type: 'line', points: [[20 + 2 * L, 112], [20 + 2 * L, 128]], width: 2 })),
          txt(20, 148, '0°', 12, 'middle'),
          txt(80, 148, '30°', 12, 'middle'),
          txt(290, 148, '135°', 12, 'middle'),
          txt(20, 100, '本初子午線（イギリス）', 12),
          txt(300, 80, '日本', 13, 'end', true),
          txt(160, 186, '経度 15° ごとに 1 時間の時差', 13, 'middle'),
          txt(160, 210, '東の地点ほど時刻が進んでいる', 13, 'middle'),
        ]),
      },
      {
        id: 'space-mp8-c3',
        text: '宇宙は、約 138 億年前の**ビッグバン**という大爆発から始まったと考えられています。地球に生命がいるのは、空気と水があり、生命に適した温度で、太陽からの距離がちょうどよかったからです。',
        figure: scene([
          { type: 'circle', x: 46, y: 120, r: 30, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: 230, y: 120, r: 16, fill: 'sky', stroke: 'line' },
          { type: 'line', points: [[80, 120], [210, 120]], color: 'gray', width: 2, dashed: true },
          txt(46, 170, '太陽', 12, 'middle'),
          txt(230, 160, '地球', 12, 'middle'),
          txt(145, 108, 'ちょうどよい距離', 12, 'middle'),
          txt(230, 190, '空気・水・適した温度', 12, 'middle'),
          txt(8, 30, '宇宙の始まり: 約 138 億年前のビッグバン', 12),
        ]),
      },
    ],
    warmup: choice({
      id: 'space-mp8-w1', concept: 'sp-rotation',
      prompt: '予想しよう。日本（東経 135°）が正午のとき、イギリス（経度 0°）はおよそ何時だと思う？',
      options: ['午前 3 時ごろ', '午後 9 時ごろ', '正午'],
      answer: 'a',
      explanation: '経度 15° で 1 時間の差なので、135° では 9 時間の差です。イギリスは日本より西にあり時刻がおくれているので、正午の 9 時間前の午前 3 時ごろです。時差の考え方をこのステージで学ぼう。',
      hint: '太陽は東からのぼるので、東の国ほど先に朝が来るよ。',
    }),
    problems: [
      fill({
        id: 'space-mp8-t1', concept: 'sp-universe', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地球が宇宙の中心にあり、太陽や星が地球のまわりを回るという考えを[b1]、地球が太陽のまわりを回るという考えを[b2]という。',
        blanks: [
          word('b1', ['天動説', '地動説', '進化論'], '天動説'),
          word('b2', ['天動説', '地動説', '進化論'], '地動説'),
        ],
        explanation: '天が動くと考えるのが**天動説**、地球が動くと考えるのが**地動説**です。今では地動説が正しいと分かっています。',
        hint: '「天」が動くか、「地」が動くかだよ。',
      }),
      choice({
        id: 'space-mp8-p1', concept: 'sp-universe',
        prompt: '16 世紀に、地球が太陽のまわりを回るという地動説を発表した人はだれ？',
        options: ['コペルニクス', 'ガリレオ', 'コロンブス', 'ダーウィン'],
        answer: 'a',
        explanation: '地動説を発表したのはコペルニクスです。ガリレオは望遠鏡の観測で地動説を支持しました。コロンブスは航海者、ダーウィンは進化論を唱えた人です。',
        hint: 'ポーランド出身の天文学者だよ。',
      }),
      choice({
        id: 'space-mp8-p2', concept: 'sp-universe',
        prompt: '望遠鏡で木星の衛星や金星の満ち欠けを観測して地動説を支持し、宗教裁判で考えを取り消させられた科学者はだれ？',
        options: ['ガリレオ', 'コペルニクス', 'メンデル', 'フレミング'],
        answer: 'a',
        explanation: 'ガリレオは、自作の望遠鏡で金星の満ち欠けなどを観測し、地動説を支持しました。しかし当時の教会に反対され、宗教裁判で考えを取り消させられました。',
        hint: '望遠鏡で宇宙を観測した、イタリアの科学者だよ。',
      }),
      figureChoice({
        id: 'space-mp8-p3', concept: 'sp-rotation',
        prompt: '北極の真上から見た地球に、経線をかいた図です（日本は東経 135°、自転は反時計回り）。ア〜ウのうち、経度 0° の本初子午線はどれ？',
        figure: scene(longitudeFigure().concat([
          region('r1', ...onCircle(160, 125, 85, 315), 'ア'),
          region('r2', ...onCircle(160, 125, 85, 45), 'イ'),
          region('r3', ...onCircle(160, 125, 85, 225), 'ウ'),
        ])),
        answer: 'r1',
        explanation: '北極の真上から見ると、東は反時計回りの向きです。経度 0° は日本（東経 135°）から 135° 西、つまり時計回りに 135° 回ったアの経線です。イは東経 90°、ウは西経 90° の経線です。',
        hint: '日本から西（時計回り）へ 135° 回ったところだよ。',
      }),
      fill({
        id: 'space-mp8-p4', concept: 'sp-rotation',
        prompt: '空らんに入る数を入れよう。',
        text: '東経 135° の日本と、経度 0° のイギリスの時差は[b1]である。',
        blanks: [number('b1', 9, 0, '時間')],
        explanation: '地球は 1 時間に 15° 自転するので、経度 15° で 1 時間の時差です。135° ÷ 15° ＝ 9 時間です。',
        hint: '経度の差を 15° でわろう。',
      }),
      fill({
        id: 'space-mp8-p5', concept: 'sp-rotation',
        prompt: '空らんに入る数を入れよう。',
        text: '東京（東経 135°）が 12 月 5 日の 12 時のとき、西経 105° のデンバーは 12 月[b1]日の[b2]時（24 時制）である。',
        blanks: [number('b1', 4, 0, '日'), number('b2', 20, 0, '時')],
        explanation: '経度の差は 135° ＋ 105° ＝ 240° なので、時差は 240° ÷ 15° ＝ 16 時間です。西にあるデンバーは 16 時間おくれているので、12 月 5 日 12 時の 16 時間前の 12 月 4 日 20 時です。',
        hint: '東経と西経の差は、たし算で求めるよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'space-mp8-r1', concept: 'sp-universe',
        prompt: '日本がハワイのマウナケア山に設置した、口径 8.2 m の大型の反射望遠鏡の名前はどれ？',
        options: ['すばる望遠鏡', 'ハッブル宇宙望遠鏡', 'ガリレオ望遠鏡'],
        answer: 'a',
        explanation: 'ハワイに日本が設置した大型の光学赤外線望遠鏡は**すばる望遠鏡**です。名前は、おうし座のプレアデス星団（すばる）からとられています。',
        hint: '星団の日本での呼び名がついているよ。',
      }),
      choice({
        id: 'space-mp8-r2', concept: 'sp-universe',
        prompt: '生命が生きられる環境に必要なものは「空気」「水」と、もう 1 つは何？',
        options: ['生命に適した温度', '強い放射線', '大きな磁石'],
        answer: 'a',
        explanation: '生命には、空気（大気）、液体の水、そして生命に適した温度が必要です。地球はこの 3 つがそろっています。',
        hint: '暑すぎても寒すぎても、生物は生きられないね。',
      }),
      choice({
        id: 'space-mp8-r3', concept: 'sp-universe',
        prompt: '地球の大きさのほかに、地球に生命が誕生するのに「ちょうどよかった」ものはどれ？',
        options: ['太陽からの距離', '月の色', '木星の大きさ'],
        answer: 'a',
        explanation: '地球は太陽からちょうどよい距離にあるので、水が液体で存在できる温度になっています。近すぎると水は蒸発し、遠すぎると凍ってしまいます。',
        hint: '温度に関係するものを考えよう。',
      }),
      choice({
        id: 'space-mp8-r4', concept: 'sp-universe',
        prompt: '宇宙が始まったときに起きたと考えられている大爆発を何という？',
        options: ['ビッグバン', 'フレア', 'スーパーセル'],
        answer: 'a',
        explanation: '宇宙は約 138 億年前の**ビッグバン**から始まり、今も広がり続けていると考えられています。',
        hint: '「大きな爆発」という意味の英語だよ。',
      }),
      choice({
        id: 'space-mp8-r5', concept: 'sp-rotation',
        prompt: 'イギリスのグリニッジ天文台の跡を通る、経度 0° の経線を何という？',
        options: ['本初子午線', '赤道', '日付変更線'],
        answer: 'a',
        explanation: '経度 0° の経線を**本初子午線**といい、時刻の基準になっています。赤道は緯度 0° の線です。',
        hint: '「本（もと）」になる「初め」の子午線だよ。',
      }),
      fill({
        id: 'space-mp8-r6', concept: 'sp-rotation',
        prompt: '空らんに入る数を入れよう。',
        text: '経度が 45° ちがう 2 つの地点の時差は[b1]である。',
        blanks: [number('b1', 3, 0, '時間')],
        explanation: '経度 15° で 1 時間の時差なので、45° ÷ 15° ＝ 3 時間です。',
        hint: '15° で 1 時間だよ。',
      }),
    ],
  };

  // ---- ステージ space-mp9: プリント 9 惑星の見え方と金星の満ち欠け ----
  const spaceMp9 = {
    id: 'space-mp9', areaId: 'sp-miniprint', title: 'プリント 9: 惑星の見え方と金星の満ち欠け', minutes: 5, concepts: ['sp-sun'],
    lessons: [
      {
        id: 'space-mp9-c1',
        text: '地球より内側を公転する水星・金星を**内惑星**、外側を公転する火星・木星などを**外惑星**といいます。外惑星の火星は太陽と反対の方向にくることがあり、真夜中にも見えます。火星はほとんど満ち欠けしません。',
        figure: scene([
          { type: 'circle', x: 160, y: 120, r: 40, fill: 'none', stroke: 'gray' },
          { type: 'circle', x: 160, y: 120, r: 72, fill: 'none', stroke: 'gray' },
          { type: 'circle', x: 160, y: 120, r: 104, fill: 'none', stroke: 'gray' },
          { type: 'circle', x: 160, y: 120, r: 14, fill: 'yellow', stroke: 'orange' },
          { type: 'circle', x: onCircle(160, 120, 40, 150)[0], y: onCircle(160, 120, 40, 150)[1], r: 6, fill: '#D9C9A8', stroke: 'line' },
          { type: 'circle', x: 160, y: 192, r: 7, fill: 'sky', stroke: 'line' },
          { type: 'circle', x: onCircle(160, 120, 104, 60)[0], y: onCircle(160, 120, 104, 60)[1], r: 6, fill: '#D9866A', stroke: 'line' },
          txt(118, 94, '金星（内惑星）', 12, 'end'),
          txt(172, 214, '地球', 12),
          txt(222, 26, '火星（外惑星）', 12),
        ]),
      },
      {
        id: 'space-mp9-c2',
        text: '金星は満ち欠けし、地球に近いときほど大きく細く欠けて見え、遠いときほど小さく丸に近く見えます。大きさが大きく変わるのは、金星と地球の距離が大きく変わるからです。',
        figure: scene([
          ...phase(60, 100, 36, 0.15),
          ...phase(170, 100, 22, 0.5),
          ...phase(266, 100, 12, 0.85),
          txt(60, 160, '近い', 13, 'middle', true),
          txt(60, 180, '大きく細い', 12, 'middle'),
          txt(170, 160, '中くらい', 13, 'middle', true),
          txt(170, 180, '半月の形', 12, 'middle'),
          txt(266, 160, '遠い', 13, 'middle', true),
          txt(266, 180, '小さく丸い', 12, 'middle'),
          txt(160, 30, '望遠鏡で見た金星', 13, 'middle'),
        ]),
      },
    ],
    warmup: choice({
      id: 'space-mp9-w1', concept: 'sp-sun',
      prompt: '予想しよう。金星を望遠鏡で見続けると、月のように満ち欠けして見えると思う？',
      options: ['満ち欠けして見える', 'いつも丸く見える', 'いつも半分だけ見える'],
      answer: 'a',
      explanation: '金星は地球より内側を公転しているので、太陽・金星・地球の位置関係によって、光った部分の見え方が変わり、満ち欠けします。このステージで確かめよう。',
      hint: '金星も、太陽の光を反射して光っているよ。',
    }),
    problems: [
      fill({
        id: 'space-mp9-t1', concept: 'sp-sun', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '地球より内側を公転する惑星を[b1]、外側を公転する惑星を[b2]という。',
        blanks: [
          word('b1', ['内惑星', '外惑星', '衛星'], '内惑星'),
          word('b2', ['内惑星', '外惑星', '衛星'], '外惑星'),
        ],
        explanation: '水星・金星が**内惑星**、火星・木星・土星・天王星・海王星が**外惑星**です。',
        hint: '地球の「内側」か「外側」かだよ。',
      }),
      choice({
        id: 'space-mp9-p1', concept: 'sp-sun',
        prompt: '金星と火星のうち、真夜中に見えることがあるのはどちら？',
        options: ['火星', '金星', 'どちらも見えない'],
        answer: 'a',
        explanation: '外惑星の火星は、地球から見て太陽と反対の方向にくることがあるので、真夜中にも見えます。内惑星の金星は、いつも太陽に近い方向にあるので真夜中には見えません。',
        hint: '真夜中に見えるのは、太陽と反対の方向にある天体だよ。',
      }),
      choice({
        id: 'space-mp9-p2', concept: 'sp-sun',
        prompt: '地球から望遠鏡で見た火星の見え方として、正しいのはどれ？',
        options: ['ほとんど満ち欠けしないが、見かけの大きさは変わる', '月のように大きく満ち欠けする', '形も大きさもまったく変わらない'],
        answer: 'a',
        explanation: '外惑星の火星は、地球から見ていつも光った面のほとんどがこちらを向いているので、ほとんど満ち欠けしません。ただし地球との距離が変わるので、見かけの大きさは変わります。',
        hint: '火星は地球の外側を回っているね。',
      }),
      figureChoice({
        id: 'space-mp9-p3', concept: 'sp-sun',
        prompt: '太陽・金星・地球を北極側から見た図です。金星がア〜ウの位置にあるとき、地球から望遠鏡で見て、いちばん大きく見えるのはどれ？（ア 地球にいちばん近い位置、イ 太陽の左横、ウ 地球から遠い位置）',
        figure: scene(venusOrbitBare().concat(venusAt(240)).concat(venusAt(180)).concat(venusAt(120)).concat([
          region('r1', ...onCircle(160, 95, 58, 240), 'ア'),
          region('r2', ...onCircle(160, 95, 58, 180), 'イ'),
          region('r3', ...onCircle(160, 95, 58, 120), 'ウ'),
        ])),
        answer: 'r1',
        explanation: '金星は地球に近いほど大きく見えます。いちばん近いアで最も大きく見え、そのときは光った面の大部分が地球と反対を向くので、細く欠けて見えます。',
        hint: '近くにあるものほど、大きく見えるね。',
      }),
      choice({
        id: 'space-mp9-p4', concept: 'sp-sun',
        prompt: '金星が満ち欠けするとき、見かけの大きさも大きく変わるのはなぜ？',
        options: ['金星と地球の距離が大きく変わるから', '金星そのものがふくらんだりちぢんだりするから', '太陽の光の強さが変わるから'],
        answer: 'a',
        explanation: '金星は地球に近づいたり遠ざかったりするので、地球との距離が大きく変わり、見かけの大きさも大きく変わります。',
        hint: '金星と地球のあいだの距離を考えよう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'space-mp9-r1', concept: 'sp-sun',
        prompt: '太陽・金星・地球を北極側から見た図です。金星がア〜ウの位置にあるとき、地球から望遠鏡で見て、いちばん丸に近い形に見えるのはどれ？（ア 地球にいちばん近い位置、イ 太陽の左横、ウ 地球から遠い位置）',
        figure: scene(venusOrbitBare().concat(venusAt(240)).concat(venusAt(180)).concat(venusAt(120)).concat([
          region('r1', ...onCircle(160, 95, 58, 240), 'ア'),
          region('r2', ...onCircle(160, 95, 58, 180), 'イ'),
          region('r3', ...onCircle(160, 95, 58, 120), 'ウ'),
        ])),
        answer: 'r3',
        explanation: '地球から遠いウでは、金星の光った面の大部分が地球のほうを向くので、丸に近い形に見えます。ただし遠いので小さく見えます。',
        hint: '光った面が地球のほうを向くのは、金星が太陽の向こう側に近いときだよ。',
      }),
      choice({
        id: 'space-mp9-r2', concept: 'sp-sun',
        prompt: '金星が地球に近いとき、望遠鏡で見た金星はどう見える？',
        options: ['大きく、細く欠けて見える', '小さく、丸に近く見える', '大きく、丸く見える'],
        answer: 'a',
        explanation: '地球に近いときは大きく見えますが、光った面を横や後ろから見ることになるので、細く欠けて見えます。',
        hint: '近い＝大きい。形はどうかな。',
      }),
      choice({
        id: 'space-mp9-r3', concept: 'sp-sun',
        prompt: '金星が見えるのは、いつごろの、どの方角の空？',
        options: ['夕方の西の空か、明け方の東の空', '真夜中の南の空', '正午の北の空'],
        answer: 'a',
        explanation: '内惑星の金星は太陽に近い方向にあるので、夕方の西の空（よいの明星）か、明け方の東の空（明けの明星）にしか見えません。',
        hint: '金星は、太陽から大きくはなれて見えないよ。',
      }),
    ],
  };

  // ---- ステージ space-mp10: プリント 10 月の満ち欠けと日食・月食 ----
  const spaceMp10 = {
    id: 'space-mp10', areaId: 'sp-miniprint', title: 'プリント 10: 月の満ち欠けと日食・月食', minutes: 5, concepts: ['sp-moon'],
    lessons: [
      {
        id: 'space-mp10-c1',
        text: '月が太陽と同じ方向にあるときが**新月**、そこから公転の向きに 90° 進むと**上弦の月**、太陽と反対側で**満月**、さらに 90° 進むと**下弦の月**です。三日月は、新月と上弦の月のあいだで見えます。',
        figure: scene(moonOrbit().concat([
          txt(80, 102, '新月', 12, 'middle', true),
          txt(160, 226, '上弦の月', 12, 'middle', true),
          txt(254, 124, '満月', 12, null, true),
          txt(160, 22, '下弦の月', 12, 'middle', true),
          txt(92, 198, '三日月', 12, 'end', true),
        ])),
      },
      {
        id: 'space-mp10-c2',
        text: '新月のころ、太陽・月・地球が一直線に並ぶと**日食**が、満月のころ、太陽・地球・月が一直線に並ぶと**月食**が起こります。太陽が月に完全にかくれる日食を**皆既日食**、一部がかくれる日食を**部分日食**といいます。',
        figure: scene(eclipsePanels().concat([
          txt(316, 44, '日食', 13, 'end', true),
          txt(316, 124, '月食', 13, 'end', true),
          txt(316, 209, '食は起こらない', 12, 'end'),
        ])),
      },
    ],
    warmup: choice({
      id: 'space-mp10-w1', concept: 'sp-moon',
      prompt: '予想しよう。満月は、真夜中ごろにどの方角の空に見えると思う？',
      options: ['南の空', '北の空', '東の地平線のすぐ上'],
      answer: 'a',
      explanation: '満月は太陽と反対側にあるので、夕方に東からのぼり、真夜中ごろに南の空に見え、明け方に西へしずみます。月の位置と形の関係を、このステージで確かめよう。',
      hint: '満月は、真夜中の地点の外側（南）の方向にあるよ。',
    }),
    problems: [
      figureChoice({
        id: 'space-mp10-p1', concept: 'sp-moon',
        prompt: '地球と月の公転を北極側から見た図です（太陽の光は左から、月は反時計回りに公転）。三日月に見えるときの月の位置はどれ？（ア 左下、イ 左上、ウ 右下）',
        figure: scene(moonOrbit().concat([
          region('r1', ...moonAt(225), 'ア'),
          region('r2', ...moonAt(135), 'イ'),
          region('r3', ...moonAt(315), 'ウ'),
        ])),
        answer: 'r1',
        explanation: '新月（左）から反時計回りに少し進んだアの位置で、光った部分が細く見える三日月になります。イは下弦の月を過ぎて新月に近づくころ、ウは満月を少し過ぎたころの位置です。',
        hint: '新月の位置から、公転の向きに少しだけ進んだところだよ。',
      }),
      figureChoice({
        id: 'space-mp10-p2', concept: 'sp-moon',
        prompt: '地球と月の公転を北極側から見た図です（太陽の光は左から、月は反時計回りに公転）。下弦の月（左半分が光った月）に見えるときの月の位置はどれ？（ア 右、イ 上、ウ 下）',
        figure: scene(moonOrbit().concat([
          region('r1', ...moonAt(0), 'ア'),
          region('r2', ...moonAt(90), 'イ'),
          region('r3', ...moonAt(270), 'ウ'),
        ])),
        answer: 'r2',
        explanation: '満月（右）から反時計回りに 90° 進んだイの位置が下弦の月です。ウは上弦の月、アは満月の位置です。',
        hint: '満月から、さらに 4 分の 1 公転したところだよ。',
      }),
      fill({
        id: 'space-mp10-t1', concept: 'sp-moon', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '太陽が月に完全にかくされる日食を[b1]日食、太陽の一部だけがかくされる日食を[b2]日食という。',
        blanks: [
          word('b1', ['皆既', '部分', '金環'], '皆既'),
          word('b2', ['皆既', '部分', '金環'], '部分'),
        ],
        explanation: '太陽が全部かくれるのが**皆既日食**、一部がかくれるのが**部分日食**です。月が太陽より小さく見えて、まわりがリングのように残るのが金環日食です。',
        hint: '「皆（みな）」かくれるのはどれかな。',
      }),
      figureChoice({
        id: 'space-mp10-p3', concept: 'sp-moon',
        prompt: 'ア〜ウは、太陽・地球・月の並び方を表した図です（ア 太陽・月・地球の順に一直線、イ 太陽・地球・月の順に一直線、ウ 月が太陽と地球を結ぶ線から直角の方向）。日食が起こるのはどれ？',
        figure: scene(eclipsePanels().concat([
          region('r1', 296, 40, 'ア'),
          region('r2', 296, 120, 'イ'),
          region('r3', 296, 205, 'ウ'),
        ])),
        answer: 'r1',
        explanation: '日食は、太陽・月・地球の順に一直線に並び、月が太陽をかくす現象です。アです。イは月食が起こる並び方です。',
        hint: '月が太陽をかくすには、月がどこにあればよいかな。',
      }),
      choice({
        id: 'space-mp10-p4', concept: 'sp-moon',
        prompt: '日食の説明として正しいのはどれ？',
        options: ['月が太陽の前を通り、太陽がかくされる現象', '月が地球の影に入り、月が欠けて見える現象', '地球が太陽の前を通り、太陽がかくされる現象'],
        answer: 'a',
        explanation: '日食は、太陽・月・地球の順に並んだとき、月が太陽をかくす現象です。月が地球の影に入るのは月食です。',
        hint: '欠けて見えるのは太陽だよ。',
      }),
      choice({
        id: 'space-mp10-p5', concept: 'sp-moon',
        prompt: '月食の説明として正しいのはどれ？',
        options: ['月が地球の影に入り、月が欠けて見える現象', '月が太陽の前を通り、太陽がかくされる現象', '月が太陽の影に入る現象'],
        answer: 'a',
        explanation: '月食は、太陽・地球・月の順に一直線に並んだとき、月が地球の影に入って欠けて見える現象です。',
        hint: '欠けて見えるのは月だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'space-mp10-r1', concept: 'sp-moon',
        prompt: '地球と月の公転を北極側から見た図です（太陽の光は左から、月は反時計回りに公転）。満月に見えるときの月の位置はどれ？（ア 左、イ 下、ウ 右）',
        figure: scene(moonOrbit().concat([
          region('r1', ...moonAt(180), 'ア'),
          region('r2', ...moonAt(270), 'イ'),
          region('r3', ...moonAt(0), 'ウ'),
        ])),
        answer: 'r3',
        explanation: '満月は、月が地球をはさんで太陽と反対側にあるときです。太陽の光は左から来るので、右のウが満月の位置です。アは新月、イは上弦の月です。',
        hint: '太陽・地球・月の順に並ぶ位置だよ。',
      }),
      figureChoice({
        id: 'space-mp10-r2', concept: 'sp-moon',
        prompt: '地球と月の公転を北極側から見た図です（太陽の光は左から、月は反時計回りに公転）。上弦の月（右半分が光った月）に見えるときの月の位置はどれ？（ア 上、イ 左下、ウ 下）',
        figure: scene(moonOrbit().concat([
          region('r1', ...moonAt(90), 'ア'),
          region('r2', ...moonAt(225), 'イ'),
          region('r3', ...moonAt(270), 'ウ'),
        ])),
        answer: 'r3',
        explanation: '新月（左）から反時計回りに 90° 進んだウの位置が上弦の月です。イは三日月、アは下弦の月の位置です。',
        hint: '新月から 4 分の 1 公転したところだよ。',
      }),
      choice({
        id: 'space-mp10-r3', concept: 'sp-moon',
        prompt: '月食が起こるとき、月はどの形の月？',
        options: ['満月', '新月', '三日月'],
        answer: 'a',
        explanation: '月食は太陽・地球・月の順に並ぶときに起こるので、月は太陽と反対側にあり、満月です。',
        hint: '月が太陽と反対側にあるときの形だよ。',
      }),
      choice({
        id: 'space-mp10-r4', concept: 'sp-moon',
        prompt: '皆既日食のとき、黒い月のまわりに白くかがやいて見える、太陽の外側の高温の大気を何という？',
        options: ['コロナ', '黒点', 'オーロラ'],
        answer: 'a',
        explanation: '皆既日食で太陽の表面がかくれると、ふだんは明るすぎて見えないコロナが、月のまわりに見えます。',
        hint: '太陽の外側に広がる大気だよ。',
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
        fill({
          id: 'sp-rotation-k4', concept: 'sp-rotation',
          prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る言葉と数を入れよう。',
          text: '同じ日の 21 時には、この星は P から[b1]へ[b2]の位置に見える。',
          blanks: [word('b1', ['東', '西'], '西'), number('b2', 15, 0, '°')],
          explanation: '日周運動で、星は 1 時間に 15° 東から西へ動きます。1 時間後の 21 時には、15° 西に見えます。',
          hint: '1 時間に 15° 西へ。',
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
        fill({
          id: 'sp-revolution-k4', concept: 'sp-revolution',
          prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る数を入れよう。',
          text: '深夜 1 時に、この星が P から 45° 西の位置に見えるのは[b1]月 1 日である。',
          blanks: [number('b1', 12, 0, '月')],
          explanation: '1 月 1 日なら、深夜 1 時（20 時の 5 時間後）には 15° × 5 ＝ 75° 西にあります。45° 西に見えるのは、それより 30° 東、つまり 1 か月前の 12 月 1 日です。',
          hint: 'まず 1 月 1 日の深夜 1 時の位置を出して、ずれを月にかえよう。',
        }),
        fill({
          id: 'sp-revolution-k5', concept: 'sp-revolution',
          prompt: '1 月 1 日の 20 時に、南の空の P の位置（真南）に星が見えました。空らんに入る数を入れよう。',
          text: '20 時に、この星が P から 90° 東の位置に見えるのは[b1]月 1 日である。',
          blanks: [number('b1', 10, 0, '月')],
          explanation: '同じ時刻の位置は 1 か月に 30° 西へずれます。90° 東にあるのは 3 か月前なので、10 月 1 日です。',
          hint: '東にあるのは、何か月前かな。',
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
          id: 'sp-sun-k4', concept: 'sp-sun',
          prompt: '太陽のふちから、炎のように吹き出して見える高温のガスを何という？',
          options: ['プロミネンス（紅炎）', '黒点', 'コロナ'],
          answer: 'a',
          explanation: '太陽のふちから吹き出して見えるガスを**プロミネンス**（紅炎）といいます。外側にうすく広がる大気はコロナ、表面の黒い点は黒点です。',
          hint: '「紅（べに）色の炎」とも書くよ。',
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
    {
      id: 'sp-universe', title: '宇宙の見方の歴史と宇宙の広がり', basic: 'sp-sun', lessonStageId: 'space-mp8',
      checkPool: [
        choice({
          id: 'sp-universe-k1', concept: 'sp-universe',
          prompt: '地動説の考えとして正しいのはどれ？',
          options: ['地球が太陽のまわりを回っている', '太陽が地球のまわりを回っている', '地球も太陽も動かない'],
          answer: 'a',
          explanation: '地動説は、地球が太陽のまわりを公転しているという考えです。太陽や星が地球のまわりを回ると考えるのは天動説です。',
          hint: '「地」が動くという考えだよ。',
        }),
        choice({
          id: 'sp-universe-k2', concept: 'sp-universe',
          prompt: '宇宙はいつごろ始まったと考えられている？',
          options: ['約 138 億年前', '約 46 億年前', '約 1 万年前'],
          answer: 'a',
          explanation: '宇宙は約 138 億年前のビッグバンから始まったと考えられています。約 46 億年前は、太陽系や地球ができたころです。',
          hint: '地球の年れい（約 46 億年）よりずっと古いよ。',
        }),
        choice({
          id: 'sp-universe-k3', concept: 'sp-universe',
          prompt: '地球の表面に液体の水がたくさんあるのは、おもに何のおかげ？',
          options: ['太陽からの距離がちょうどよいこと', '月が近くにあること', '地球の自転が速いこと'],
          answer: 'a',
          explanation: '地球は太陽からちょうどよい距離にあるので、水が液体のまま存在できる温度になっています。',
          hint: '太陽に近すぎても遠すぎても、水は液体でいられないね。',
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
      { id: 'sp-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [spaceMp1, spaceMp2, spaceMp3, spaceMp4, spaceMp5, spaceMp6, spaceMp7, spaceMp8, spaceMp9, spaceMp10] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
