// 「天気とその変化」教材データ（中学2年 理科・地学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（大気と水蒸気: 圧力・気圧・気象観測、湿度と雲のでき方 / 前線と天気の変化: 気圧配置と前線、日本の天気）と、概念 7 つ。
// 領域 3「ミニプリント」（we-miniprint）: 先生のミニプリントを書き直したステージ weather-mp1〜mp14 と、概念 3 つ（we-airmass・we-wind・we-disaster）。
// 概念 id は全単元で一意にするため、接頭辞 we- を付ける。
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

  function r1(v) { return Math.round(v * 10) / 10; }
  function rp(p) { return [r1(p[0]), r1(p[1])]; }

  // 選ぶ場所（label はア・イ・ウ）
  function region(id, x, y, label) { return { type: 'region', id, x, y, r: 22, label }; }
  // ア・イ・ウの選ぶ場所（xs は中心の x の配列、y は共通）
  function regionsAt(xs, y) { return xs.map((x, i) => region('r' + (i + 1), x, y, 'アイウ'[i])); }

  // ---- 写真ふうの画像に重ねる部品（docs/figures-guide.md「写真の上に文字を置くときの決まり」） ----
  // 画像は assets/images/weather/<カードid>.jpg（640×480。場面 320×240 いっぱいに縮めて描く。座標は画像の位置 × 0.5）

  // 画像（場面いっぱい。items のいちばん先に置く）
  function photo(name) { return { type: 'image', src: 'assets/images/weather/' + name + '.jpg' }; }

  // 写真の上の引き出し線（濃い実線）
  function pointer(x1, y1, x2, y2) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: 'ink', width: 2 };
  }

  // 写真の上の文字（白い下地つき・中央寄せ・14px）。o で size・bold・anchor を変える
  function tag(x, y, text, o) {
    return Object.assign({ type: 'text', x, y, text, size: 14, anchor: 'middle', bg: true }, o);
  }

  // 直方体を斜めから見た形（(x, yb) は前の面の左下。w 幅、h 高さ、d 奥行き）
  function box3d(x, yb, w, h, d) {
    const dx = d * 0.5, dy = d * 0.5;
    return [
      { type: 'polygon', points: [[x, yb], [x + w, yb], [x + w, yb - h], [x, yb - h]].map(rp), fill: '#D9C7A8' },
      { type: 'polygon', points: [[x, yb - h], [x + w, yb - h], [x + w + dx, yb - h - dy], [x + dx, yb - h - dy]].map(rp), fill: '#EFE4D0' },
      { type: 'polygon', points: [[x + w, yb], [x + w + dx, yb - dy], [x + w + dx, yb - h - dy], [x + w, yb - h]].map(rp), fill: '#BFA987' },
    ];
  }

  // 天気記号（kind: clear 快晴 / sunny 晴れ / cloudy くもり / rain 雨 / snow 雪）
  function weatherSymbol(cx, cy, kind, rr) {
    const r = rr || 14;
    const items = [{ type: 'circle', x: cx, y: cy, r, fill: kind === 'rain' ? 'ink' : 'white' }];
    if (kind === 'sunny') items.push({ type: 'line', points: [[cx, cy - r], [cx, cy + r]], width: 2 });
    if (kind === 'cloudy') items.push({ type: 'circle', x: cx, y: cy, r: r1(r / 2), fill: 'none' });
    if (kind === 'snow') {
      const d = r1(r / Math.SQRT2);
      items.push({ type: 'line', points: [[cx - d, cy - d], [cx + d, cy + d]], width: 2 });
      items.push({ type: 'line', points: [[cx - d, cy + d], [cx + d, cy - d]], width: 2 });
    }
    return items;
  }

  // 天気図記号（天気記号＋風向の矢＋風力の羽根）。fromDeg は風がふいてくる向き（0 北、90 東、時計回り）
  function stationModel(cx, cy, fromDeg, force, kind, len) {
    const L = len || 58;
    const a = fromDeg * Math.PI / 180;
    const u = [Math.sin(a), -Math.cos(a)];          // 矢をのばす向き（画面の上が北）
    const p = (t) => rp([cx + u[0] * t, cy + u[1] * t]);
    const perp = [-u[1], u[0]];                      // 矢の向きから時計回りに 90°
    const f = [perp[0] * 0.87 + u[0] * 0.5, perp[1] * 0.87 + u[1] * 0.5];
    const items = [{ type: 'line', points: [p(14), p(L)], width: 2 }];
    for (let k = 0; k < force; k++) {
      const b = p(L - k * 7);
      items.push({ type: 'line', points: [b, rp([b[0] + f[0] * 12, b[1] + f[1] * 12])], width: 2 });
    }
    return items.concat(weatherSymbol(cx, cy, kind));
  }

  // 北を示す矢印
  function northArrow(x, yTop) {
    return [
      { type: 'line', points: [[x, yTop + 44], [x, yTop + 8]], width: 2, arrow: true },
      { type: 'text', x, y: yTop, text: '北', size: 13, anchor: 'middle', bold: true },
    ];
  }

  // 飽和水蒸気量のグラフ（横: 気温 0〜32℃、たて: 水蒸気量 0〜34 g/m³）
  // x = 50 + 7.5 × 気温、y = 200 − 4.8 × 水蒸気量。値は 0℃ 4.8、5℃ 6.8、10℃ 9.4、15℃ 12.8、20℃ 17.3、25℃ 23.1、30℃ 30.4 g/m³
  const gx = (t) => r1(50 + 7.5 * t);
  const gy = (v) => r1(200 - 4.8 * v);
  const SAT = [[0, 4.8], [2.5, 5.8], [5, 6.8], [7.5, 7.9], [10, 9.4], [12.5, 10.9], [15, 12.8], [17.5, 14.9],
    [20, 17.3], [22.5, 20.0], [25, 23.1], [27.5, 26.5], [30, 30.4], [32, 33.8]];
  function graphItems() {
    const items = [];
    [5, 10, 15, 20, 25, 30].forEach(t => items.push({ type: 'line', points: [[gx(t), 200], [gx(t), gy(34)]], color: '#D5DBE5', width: 1 }));
    [5, 10, 15, 20, 25, 30].forEach(v => items.push({ type: 'line', points: [[50, gy(v)], [gx(32), gy(v)]], color: '#D5DBE5', width: 1 }));
    items.push(
      { type: 'line', points: [[50, 200], [50, 26]], width: 2, arrow: true },
      { type: 'line', points: [[50, 200], [306, 200]], width: 2, arrow: true },
      { type: 'line', points: SAT.map(([t, v]) => [gx(t), gy(v)]), color: 'blue', width: 3 },
    );
    [0, 10, 20, 30].forEach(t => items.push({ type: 'text', x: gx(t), y: 216, text: String(t), size: 12, anchor: 'middle' }));
    [10, 20, 30].forEach(v => items.push({ type: 'text', x: 44, y: gy(v) + 4, text: String(v), size: 12, anchor: 'end' }));
    items.push(
      { type: 'text', x: 56, y: 18, text: '水蒸気量〔g/m³〕', size: 12 },
      { type: 'text', x: 306, y: 234, text: '気温〔℃〕', size: 12, anchor: 'end' },
    );
    return items;
  }

  // ---- 前線の記号 ----

  function pathLength(pts) {
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return l;
  }
  // 折れ線 pts の、はじめから長さ s の点と、そこでの向き（単位ベクトル）
  function along(pts, s) {
    let rest = s;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l = Math.hypot(x2 - x1, y2 - y1);
      if (rest <= l || i === pts.length - 2) {
        const tx = (x2 - x1) / l, ty = (y2 - y1) / l;
        const k = Math.min(rest, l);
        return { x: x1 + tx * k, y: y1 + ty * k, tx, ty };
      }
      rest -= l;
    }
    return { x: pts[0][0], y: pts[0][1], tx: 1, ty: 0 };
  }
  // 長さ a から b までの部分の折れ線
  function subPath(pts, a, b) {
    const pa = along(pts, a), pb = along(pts, b);
    const out = [[pa.x, pa.y]];
    let acc = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc > a && acc < b) out.push(pts[i]);
    }
    out.push([pb.x, pb.y]);
    return out.map(rp);
  }
  // side: +1 は進む向き（pts の順）の左側、−1 は右側。記号は前線の進む側に付ける
  function normalOf(q, side) { return [q.ty * side, -q.tx * side]; }
  function triangle(q, side, color) {
    const [nx, ny] = normalOf(q, side);
    return {
      type: 'polygon', fill: color, stroke: 'none',
      points: [[q.x - q.tx * 7, q.y - q.ty * 7], [q.x + q.tx * 7, q.y + q.ty * 7], [q.x + nx * 10, q.y + ny * 10]].map(rp),
    };
  }
  function halfDisk(q, side, color) {
    const [nx, ny] = normalOf(q, side);
    const points = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * k / 8;
      points.push(rp([q.x + 7 * (Math.cos(a) * q.tx + Math.sin(a) * nx), q.y + 7 * (Math.cos(a) * q.ty + Math.sin(a) * ny)]));
    }
    return { type: 'polygon', fill: color, stroke: 'none', points };
  }
  // 前線（kind: cold 寒冷 / warm 温暖 / stationary 停滞 / occluded 閉そく）
  // 寒冷は青い三角、温暖は赤い半円、閉そくは紫の三角と半円（同じ側）、停滞は青い三角（side 側）と赤い半円（反対側）を交互に
  function frontItems(pts, kind, side, start) {
    const L = pathLength(pts);
    const step = 26;
    const s0 = start === undefined ? 13 : start;
    const items = [];
    if (kind === 'stationary') {
      for (let s = 0, k = 0; s < L - 2; s += step, k++) {
        const e = Math.min(L, s + step);
        items.push({ type: 'line', points: subPath(pts, s, e), color: k % 2 ? 'red' : 'blue', width: 3 });
        if (e - s >= step / 2 + 7) {
          const q = along(pts, s + step / 2);
          items.push(k % 2 ? halfDisk(q, -side, 'red') : triangle(q, side, 'blue'));
        }
      }
      return items;
    }
    const color = kind === 'cold' ? 'blue' : kind === 'warm' ? 'red' : 'purple';
    items.push({ type: 'line', points: pts.map(rp), color, width: 3 });
    for (let s = s0, k = 0; s <= L - 8; s += step, k++) {
      const q = along(pts, s);
      const tri = kind === 'cold' || (kind === 'occluded' && k % 2 === 0);
      items.push(tri ? triangle(q, side, color) : halfDisk(q, side, color));
    }
    return items;
  }

  // ---- 前線の断面（左上 (x0, y0)、幅 w、高さ 90。地面は y0 + 90。右へ進む前線） ----
  const WARM_AIR = '#FBE3EC';
  const COLD_AIR = 'sky';
  // 寒冷前線: 寒気（左）が暖気の下にもぐりこみ、暖気を急におし上げる。積乱雲
  function coldSection(x0, y0, w, title) {
    const G = y0 + 90;
    const X = (f) => r1(x0 + w * f);
    const items = [
      { type: 'rect', x: x0, y: y0, width: w, height: 90, fill: WARM_AIR, stroke: 'none' },
      { type: 'polygon', points: [[X(0), G], [X(0.5), G], [X(0.47), G - 22], [X(0.39), G - 48], [X(0), G - 62]], fill: COLD_AIR, stroke: 'none' },
      { type: 'ellipse', x: X(0.54), y: G - 52, rx: 16, ry: 34, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: X(0.08), y1: G - 18, x2: X(0.3), y2: G - 18, color: 'blue' },
      { type: 'arrow', x1: X(0.8), y1: G - 14, x2: X(0.66), y2: G - 52, color: 'orange' },
      { type: 'line', points: [[x0, G], [x0 + w, G]], color: 'brown', width: 3 },
      { type: 'text', x: X(0.12), y: G - 30, text: '寒気', size: 14, bold: true },
      { type: 'text', x: X(0.82), y: G - 56, text: '暖気', size: 14, bold: true },
    ];
    if (title) items.push({ type: 'text', x: x0 + 6, y: y0 + 16, text: title, size: 13, bold: true });
    return items;
  }
  // 温暖前線: 暖気（左）が寒気（右）の上をゆるやかにはい上がる。乱層雲
  function warmSection(x0, y0, w, title) {
    const G = y0 + 90;
    const X = (f) => r1(x0 + w * f);
    const items = [
      { type: 'rect', x: x0, y: y0, width: w, height: 90, fill: WARM_AIR, stroke: 'none' },
      { type: 'polygon', points: [[X(0.14), G], [x0 + w, G], [x0 + w, G - 50]], fill: COLD_AIR, stroke: 'none' },
      { type: 'ellipse', x: X(0.66), y: G - 50, rx: r1(w * 0.2), ry: 10, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: X(0.06), y1: G - 10, x2: X(0.38), y2: G - 34, color: 'orange' },
      { type: 'line', points: [[x0, G], [x0 + w, G]], color: 'brown', width: 3 },
      { type: 'text', x: X(0.06), y: G - 50, text: '暖気', size: 14, bold: true },
      { type: 'text', x: X(0.78), y: G - 8, text: '寒気', size: 14, bold: true },
    ];
    if (title) items.push({ type: 'text', x: x0 + 6, y: y0 + 16, text: title, size: 13, bold: true });
    return items;
  }

  // ---- 日本付近の地図（簡略） ----
  function japanItems() {
    const land = { fill: 'lightgreen', stroke: 'line' };
    return [
      Object.assign({ type: 'polygon', points: [[246, 36], [280, 30], [296, 50], [270, 66], [252, 62]] }, land),
      Object.assign({ type: 'polygon', points: [[250, 78], [262, 92], [250, 118], [228, 140], [196, 156], [160, 166], [128, 176], [112, 172], [118, 160], [150, 150], [186, 136], [214, 118], [236, 96]] }, land),
      Object.assign({ type: 'polygon', points: [[136, 182], [166, 178], [160, 192], [138, 192]] }, land),
      Object.assign({ type: 'polygon', points: [[96, 176], [116, 180], [118, 204], [100, 212], [90, 196]] }, land),
    ];
  }

  // 季節風の向きを選ぶ図。3 本の矢印は北西から・南東から・北東から（位置は固定）。labels は矢印ごとのア・イ・ウ
  // 選ぶ場所は矢印の根もと（風がふいてくる側）に置く
  const MONSOON = {
    nw: { arrow: [70, 50, 120, 100], at: [52, 32] },
    se: { arrow: [276, 196, 236, 156], at: [294, 214] },
    ne: { arrow: [196, 36, 160, 72], at: [214, 22] },
  };
  function monsoonFigure(order) {
    const items = japanItems().concat([
      { type: 'text', x: 108, y: 128, text: '日本海', size: 12 },
      { type: 'text', x: 176, y: 216, text: '太平洋', size: 12 },
    ]);
    order.forEach((key) => {
      const [x1, y1, x2, y2] = MONSOON[key].arrow;
      items.push({ type: 'arrow', x1, y1, x2, y2, color: 'blue', width: 4 });
    });
    order.forEach((key, i) => {
      const [x, y] = MONSOON[key].at;
      items.push(region('r' + (i + 1), x, y, 'アイウ'[i]));
    });
    return scene(items);
  }

  // 冬の日本付近の断面（左: 大陸、日本海、日本列島の山、右: 太平洋）
  function winterSectionBase() {
    return [
      { type: 'polygon', points: [[0, 170], [70, 170], [70, 240], [0, 240]], fill: 'sand', stroke: 'none' },
      { type: 'rect', x: 70, y: 178, width: 110, height: 62, fill: 'water', stroke: 'none' },
      { type: 'rect', x: 280, y: 178, width: 40, height: 62, fill: 'water', stroke: 'none' },
      { type: 'polygon', points: [[180, 178], [200, 170], [235, 100], [270, 170], [280, 178], [280, 240], [180, 240]], fill: 'lightgreen' },
      { type: 'arrow', x1: 10, y1: 110, x2: 60, y2: 110, color: 'blue', width: 4 },
      { type: 'arrow', x1: 80, y1: 152, x2: 150, y2: 138, color: 'blue', width: 4 },
      { type: 'text', x: 6, y: 96, text: '北西の季節風', size: 12 },
      { type: 'text', x: 100, y: 206, text: '日本海', size: 12 },
      { type: 'text', x: 318, y: 226, text: '太平洋', size: 12, anchor: 'end' },
    ];
  }

  // ================================================================
  // 領域 1: 大気と水蒸気
  // ================================================================

  // ---- ステージ weather-1: 圧力・気圧・気象観測 ----
  const weather1 = {
    id: 'weather-1', areaId: 'air', title: '圧力・気圧・気象観測', minutes: 5, concepts: ['we-pressure', 'we-observe'],
    lessons: [
      {
        id: 'weather-1-c1',
        text: '面を垂直におす力を、1 m² あたりの大きさで表したものを**圧力**といいます。単位は**パスカル**（記号 Pa）です。圧力〔Pa〕＝面を垂直におす力〔N〕÷力がはたらく面積〔m²〕。同じ力でも、面積が小さいほど圧力は大きくなります。',
        // 写真: 同じれんがをスポンジに置く。左は広い面を下に（へこみが小さい）、右はせまい面を下に立てる（へこみが大きい）
        figure: scene([
          photo('weather-1-c1'),
          tag(160, 22, '同じれんがをスポンジに置く', { bold: true }),
          tag(86, 202, '面積が大きい', { bold: true }),
          tag(86, 224, '→ へこみが小さい', { size: 13 }),
          tag(237, 202, '面積が小さい', { bold: true }),
          tag(237, 224, '→ へこみが大きい', { size: 13 }),
        ]),
      },
      {
        id: 'weather-1-c2',
        text: '空気にも重さがあり、その重さによる圧力を**大気圧**（気圧）といいます。海面での大気圧は約 1013 hPa（**ヘクトパスカル**。1 hPa＝100 Pa）です。大気圧はあらゆる向きからはたらき、上空ほど小さくなります。',
        // 写真: 同じ菓子の袋。左はふもと（ふつうのふくらみ）、右は山頂（ぱんぱんにふくらむ）
        figure: scene([
          photo('weather-1-c2'),
          tag(78, 200, 'ふもと', { size: 15, bold: true }),
          tag(80, 222, '海面 約1013hPa', { size: 13 }),
          tag(236, 200, '山頂', { size: 15, bold: true }),
          tag(240, 222, '気圧が小さい→ふくらむ', { size: 13 }),
        ]),
      },
      {
        id: 'weather-1-c3',
        text: '空全体を 10 としたとき、雲がおおっている割合を**雲量**といいます。雨や雪が降っていなければ、雲量 0〜1 は快晴、2〜8 は晴れ、9〜10 はくもりです。天気は**天気記号**で表します。',
        // 写真: 快晴・晴れ・くもりの空。下に天気記号と雲量
        figure: scene([
          photo('weather-1-c3'),
          tag(160, 20, '雲量：空全体を 10 としたときの雲の割合', { size: 13 }),
          ...weatherSymbol(56, 160, 'clear', 14),
          ...weatherSymbol(160, 160, 'sunny', 14),
          ...weatherSymbol(264, 160, 'cloudy', 14),
          tag(56, 198, '快晴', { bold: true }),
          tag(160, 198, '晴れ', { bold: true }),
          tag(264, 198, 'くもり', { bold: true }),
          tag(56, 220, '雲量 0〜1', { size: 13 }),
          tag(160, 220, '雲量 2〜8', { size: 13 }),
          tag(264, 220, '雲量 9〜10', { size: 13 }),
        ]),
      },
      {
        id: 'weather-1-c4',
        text: '**風向**は風がふいてくる向きで、16 方位で表します。北からふいてくる風は「北の風」です。風の強さは**風力**（0〜12）で表します。天気図記号では、風がふいてくる向きに矢をのばし、羽根の数で風力を表します。',
        // 天気図記号: 晴れ、北東の風、風力 3
        figure: scene([
          ...northArrow(40, 30),
          ...stationModel(150, 130, 45, 3, 'sunny'),
          { type: 'text', x: 214, y: 150, text: '風向：北東', size: 13 },
          { type: 'text', x: 214, y: 170, text: '風力：3', size: 13 },
          { type: 'text', x: 214, y: 190, text: '天気：晴れ', size: 13 },
          { type: 'text', x: 160, y: 228, text: '矢は風がふいてくる向きにのばす', size: 12, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'weather-1-w1', concept: 'we-pressure',
      prompt: '予想しよう。同じれんがをスポンジの上に置きます。スポンジが大きくへこむのは、どの置き方だと思う？',
      options: ['広い面を下にして置いたとき', 'せまい面を下にして置いたとき', 'どちらも同じ'],
      answer: 'b',
      explanation: 'れんがの重さは同じでも、せまい面を下にすると力が小さい面積に集まるので、大きくへこみます。このステージで、そのしくみを確かめよう。',
      hint: 'とがったくつのかかとで、雪にしずみやすいことを思い出そう。',
    }),
    problems: [
      choice({
        id: 'weather-1-p1', concept: 'we-pressure',
        prompt: '圧力〔Pa〕を求める式はどれ？',
        options: ['面を垂直におす力〔N〕÷力がはたらく面積〔m²〕', '力がはたらく面積〔m²〕÷面を垂直におす力〔N〕', '面を垂直におす力〔N〕×力がはたらく面積〔m²〕'],
        answer: 'a',
        explanation: '圧力は、1 m² あたりにはたらく力の大きさなので、力を面積でわります。同じ力なら、面積が小さいほど圧力は大きくなります。',
        hint: '「1 m² あたり」の大きさを出すには、何で何をわるか考えよう。',
      }),
      fill({
        id: 'weather-1-t1', concept: 'we-pressure', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '面を垂直におす力を 1 m² あたりで表したものを[b1]といい、その単位は[b2]（記号 Pa）である。',
        blanks: [
          word('b1', ['圧力', '大気圧', '重力'], '圧力'),
          word('b2', ['パスカル', 'ニュートン', 'グラム'], 'パスカル'),
        ],
        explanation: '1 m² あたりの面をおす力が**圧力**で、単位は**パスカル**（Pa）です。ニュートン（N）は力の単位なので区別しよう。',
        hint: '記号 Pa の読み方を思い出そう。',
      }),
      fill({
        id: 'weather-1-p2', concept: 'we-pressure',
        prompt: '空らんに入る数を入れよう。',
        text: '0.5 m² の板の上に、重さ 20 N の物体をのせた。板が物体からおされる圧力は[b1]である。',
        blanks: [number('b1', 40, 0.1, 'Pa')],
        explanation: '圧力＝力÷面積なので、20 N ÷ 0.5 m² ＝ 40 Pa です。面積が 1 m² より小さいので、圧力は 20 より大きくなります。',
        hint: '力〔N〕を面積〔m²〕でわろう。',
      }),
      figureChoice({
        id: 'weather-1-p3', concept: 'we-pressure',
        prompt: 'ア〜ウは、同じ直方体（5 cm × 10 cm × 20 cm）を、下になる面を変えて置いたものです（ア 下の面 20 cm × 10 cm、イ 下の面 20 cm × 5 cm、ウ 下の面 10 cm × 5 cm）。床が受ける圧力がいちばん大きいのはどれ？',
        // 3 px = 1 cm。ア w20 h5 d10、イ w20 h10 d5、ウ w10 h20 d5
        figure: scene([
          { type: 'line', points: [[10, 170], [310, 170]], color: 'line', width: 2 },
          ...box3d(22, 170, 60, 15, 30),
          ...box3d(126, 170, 60, 30, 15),
          ...box3d(241, 170, 30, 60, 15),
          { type: 'text', x: 160, y: 40, text: '下の面の大きさ', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 60, y: 86, text: '20 cm×10 cm', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 86, text: '20 cm×5 cm', size: 12, anchor: 'middle' },
          { type: 'text', x: 260, y: 86, text: '10 cm×5 cm', size: 12, anchor: 'middle' },
        ].concat(regionsAt([60, 160, 260], 204))),
        answer: 'r3',
        explanation: 'どの置き方でも、床をおす力（直方体の重さ）は同じです。力が同じなら、面積がいちばん小さいウ（50 cm²）の圧力がいちばん大きくなります。',
        hint: '力は同じなので、下の面の面積をくらべよう。',
      }),
      choice({
        id: 'weather-1-p4', concept: 'we-observe',
        prompt: '雨や雪は降っていません。空全体の 7 割ほどを雲がおおっているとき（雲量 7）、天気は何？',
        options: ['快晴', '晴れ', 'くもり'],
        answer: 'b',
        explanation: '雲量 2〜8 は晴れです。雲が多く見えても、雲量 9 になるまでは晴れとします。快晴は雲量 0〜1、くもりは 9〜10 です。',
        hint: '雲量 2〜8 の天気を思い出そう。',
      }),
      figureChoice({
        id: 'weather-1-p5', concept: 'we-observe',
        prompt: 'ア〜ウは天気図記号です（図の上が北。ア 矢が南西にのびる、イ 矢が北東にのびる、ウ 矢が北西にのびる）。「北東の風」を表しているのはどれ？',
        // 矢は風がふいてくる向きにのばす。ア 南西 225°、イ 北東 45°、ウ 北西 315°
        figure: scene([
          ...northArrow(305, 22),
          ...stationModel(60, 105, 225, 2, 'cloudy', 50),
          ...stationModel(160, 105, 45, 2, 'cloudy', 50),
          ...stationModel(260, 105, 315, 2, 'cloudy', 50),
        ].concat(regionsAt([60, 160, 260], 200))),
        answer: 'r2',
        explanation: '風向は、風がふいてくる向きです。天気図記号では、風がふいてくる向きに矢をのばすので、北東の風は矢が北東にのびたイです。アは南西の風（南西からふく風）です。',
        hint: '「北東の風」は、北東からふいてくる風だよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'weather-1-r1', concept: 'we-pressure',
        prompt: '空らんに入る数を入れよう。',
        text: '200 cm²（＝0.02 m²）の面に、60 N の力が垂直にはたらいている。このときの圧力は[b1]である。',
        blanks: [number('b1', 3000, 1, 'Pa')],
        explanation: '面積を m² になおしてから計算します。60 N ÷ 0.02 m² ＝ 3000 Pa です。1 m² は 10000 cm² なので、200 cm² は 0.02 m² です。',
        hint: '力〔N〕を、m² で表した面積でわろう。',
      }),
      choice({
        id: 'weather-1-r2', concept: 'we-pressure',
        prompt: '平地で買ったふくろ入りのおかしを高い山の上に持っていくと、ふくろがふくらみました。その理由はどれ？',
        options: ['山の上は気温が高いから', '山の上はまわりの大気圧が小さいから', '山の上はまわりの大気圧が大きいから'],
        answer: 'b',
        explanation: '大気圧は上空ほど小さくなります。山の上ではふくろを外からおす力が弱くなるので、中の空気がふくろをおし広げ、ふくらみます。',
        hint: '上空ほど、大気圧はどうなるか思い出そう。',
      }),
      choice({
        id: 'weather-1-r3', concept: 'we-observe',
        prompt: '「北の風」とは、どのような風？',
        options: ['北からふいてきて、南へ向かう風', '南からふいてきて、北へ向かう風', '北と南を行ったり来たりする風'],
        answer: 'a',
        explanation: '風向は、風がふいてくる向きで表します。北の風は、北からふいてきて南へ向かう風です。風が向かう先ではないことに注意しよう。',
        hint: '風向は「どこから」ふいてくるかで決めるよ。',
      }),
      choice({
        id: 'weather-1-t2', concept: 'we-observe', term: true,
        prompt: '次の説明に合う言葉はどれ？「空全体を 10 としたとき、雲がおおっている割合」',
        options: ['雲量', '湿度', '風力'],
        answer: 'a',
        explanation: '雲がおおっている割合を**雲量**といいます。雨や雪が降っていなければ、雲量で快晴・晴れ・くもりを決めます。',
        hint: '雲の「量」を表す言葉だよ。',
      }),
    ],
  };

  // ---- ステージ weather-2: 湿度と雲のでき方 ----
  const weather2 = {
    id: 'weather-2', areaId: 'air', title: '湿度と雲のでき方', minutes: 5, concepts: ['we-humidity', 'we-cloud'],
    lessons: [
      {
        id: 'weather-2-c1',
        text: '1 m³ の空気がふくむことのできる水蒸気の最大の量を**飽和水蒸気量**〔g/m³〕といいます。飽和水蒸気量は気温によって決まり、気温が高いほど大きくなります。',
        // 飽和水蒸気量のグラフ
        figure: scene(graphItems().concat([
          { type: 'line', points: [[198, 72], [230, 92]], color: 'blue', width: 1.5 },
          { type: 'text', x: 196, y: 70, text: '飽和水蒸気量', size: 13, anchor: 'end', bold: true },
          { type: 'text', x: 60, y: 46, text: '気温が高いほど大きい', size: 12 },
        ])),
      },
      {
        id: 'weather-2-c2',
        text: '水蒸気をふくむ空気を冷やしていくと、ある温度で水蒸気の一部が水滴に変わり始めます。この温度を**露点**といいます。金属のコップに冷たい水を少しずつ入れ、表面がくもり始めたときの水温が露点です。',
        // 写真: 氷水と温度計を入れた金属のコップ。表面が細かい水滴でくもり始めている
        figure: scene([
          photo('weather-2-c2'),
          pointer(214, 30, 144, 34), tag(244, 34, '温度計', { size: 13 }),
          pointer(206, 70, 110, 86), tag(250, 74, '冷たい水', { size: 13 }),
          pointer(206, 108, 158, 118), tag(254, 112, '金属のコップ', { size: 13 }),
          pointer(190, 150, 138, 150),
          tag(250, 154, '表面がくもり', { size: 13 }),
          tag(250, 174, '始めたときの水温', { size: 13 }),
          tag(250, 198, '＝露点', { size: 16, bold: true }),
        ]),
      },
      {
        id: 'weather-2-c3',
        text: '空気のしめりぐあいを表したものが**湿度**〔%〕です。湿度〔%〕＝空気 1 m³ にふくまれる水蒸気量〔g/m³〕÷その気温での飽和水蒸気量〔g/m³〕×100。水蒸気量が同じなら、気温が上がると湿度は下がります。',
        // 20℃ で水蒸気 13.8 g/m³ の空気（●）。飽和水蒸気量は 17.3 g/m³
        figure: scene(graphItems().concat([
          { type: 'line', points: [[gx(20), 200], [gx(20), gy(17.3)]], color: 'gray', width: 1.5, dashed: true },
          { type: 'circle', x: gx(20), y: gy(17.3), r: 4, fill: 'blue', stroke: 'none' },
          { type: 'circle', x: gx(20), y: gy(13.8), r: 5, fill: 'ink', stroke: 'none' },
          { type: 'text', x: 58, y: 44, text: '●：20℃、水蒸気 13.8 g/m³', size: 12 },
          { type: 'text', x: 58, y: 62, text: '湿度＝13.8÷17.3×100', size: 12 },
          { type: 'text', x: 58, y: 80, text: '　　≒80 %', size: 12 },
        ])),
      },
      {
        id: 'weather-2-c4',
        anim: 'we-cloud-form',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '空気が上昇すると、上空ほど気圧が低いので、空気は**膨張**して温度が下がります。温度が露点より下がると、水蒸気が水滴や氷の粒になります。これが**雲**です。地表近くで空気が冷やされて水滴ができ、うかんでいるものが**霧**です。',
        // 山の斜面にそって空気が上昇し、雲ができる
        figure: scene([
          { type: 'polygon', points: [[30, 220], [160, 80], [290, 220]], fill: 'rock' },
          { type: 'line', points: [[0, 220], [320, 220]], color: 'brown', width: 3 },
          { type: 'arrow', x1: 40, y1: 206, x2: 90, y2: 152, color: 'blue' },
          { type: 'arrow', x1: 100, y1: 140, x2: 130, y2: 106, color: 'blue' },
          { type: 'ellipse', x: 124, y: 72, rx: 22, ry: 11, fill: 'white', stroke: 'gray' },
          { type: 'ellipse', x: 150, y: 62, rx: 32, ry: 14, fill: 'white', stroke: 'gray' },
          { type: 'text', x: 196, y: 34, text: '①上昇する', size: 12 },
          { type: 'text', x: 196, y: 52, text: '②膨張する', size: 12 },
          { type: 'text', x: 196, y: 70, text: '③温度が下がる', size: 12 },
          { type: 'text', x: 196, y: 88, text: '④露点で雲になる', size: 12 },
        ]),
      },
    ],
    warmup: choice({
      id: 'weather-2-w1', concept: 'we-humidity',
      prompt: '予想しよう。冷たい飲み物を入れたコップを置いておくと、コップの外側に水滴がつきます。この水は、どこから来たと思う？',
      options: ['コップの中の飲み物が、しみ出してきた', 'まわりの空気中の水蒸気が冷やされて、水滴になった', 'コップのガラスから出てきた'],
      answer: 'b',
      explanation: '空気中にはふだん目に見えない水蒸気がふくまれています。冷たいコップのまわりで空気が冷やされると、水蒸気が水滴に変わります。このステージで、そのしくみを学ぼう。',
      hint: '空気の中に、目に見えない水があることを思い出そう。',
    }),
    problems: [
      fill({
        id: 'weather-2-t1', concept: 'we-humidity', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '1 m³ の空気がふくむことのできる水蒸気の最大の量を[b1]といい、空気を冷やしたとき水滴ができ始める温度を[b2]という。',
        blanks: [
          word('b1', ['飽和水蒸気量', '湿度', '露点'], '飽和水蒸気量'),
          word('b2', ['飽和水蒸気量', '湿度', '露点'], '露点'),
        ],
        explanation: 'ふくむことのできる最大の水蒸気量が**飽和水蒸気量**、水滴ができ始める温度が**露点**です。露点では、空気中の水蒸気量と飽和水蒸気量が等しくなっています。',
        hint: '「最大の量」と「温度」に合う言葉をさがそう。',
      }),
      fill({
        id: 'weather-2-p1', concept: 'we-humidity',
        prompt: '空らんに入る数を入れよう。',
        text: '気温 20 ℃（飽和水蒸気量 17.3 g/m³）の空気 1 m³ に、8.65 g の水蒸気がふくまれている。この空気の湿度は[b1]である。',
        blanks: [number('b1', 50, 1, '%')],
        explanation: '湿度＝水蒸気量÷飽和水蒸気量×100 なので、8.65 ÷ 17.3 × 100 ＝ 50 % です。ふくむことのできる量のちょうど半分の水蒸気がある、ということです。',
        hint: '空気中の水蒸気量を、その気温の飽和水蒸気量でわって 100 をかけよう。',
      }),
      figureChoice({
        id: 'weather-2-p2', concept: 'we-humidity',
        prompt: '飽和水蒸気量のグラフ（青い線）の上に、空気ア〜ウの気温と水蒸気量を、それぞれの丸の中心で表しています（ア 25 ℃・10 g/m³、イ 10 ℃・8 g/m³、ウ 30 ℃・20 g/m³）。湿度がいちばん高いのはどれ？',
        // 湿度: ア 10 ÷ 23.1 ≒ 43 %、イ 8 ÷ 9.4 ≒ 85 %、ウ 20 ÷ 30.4 ≒ 66 %
        figure: scene(graphItems().concat([
          region('r1', gx(25), gy(10), 'ア'),
          region('r2', gx(10), gy(8), 'イ'),
          region('r3', gx(30), gy(20), 'ウ'),
        ])),
        answer: 'r2',
        explanation: '湿度は、水蒸気量が飽和水蒸気量（青い線）にどれだけ近いかで決まります。イは水蒸気量は少ないですが、気温が低く飽和水蒸気量も小さいので、湿度は約 85 % でいちばん高くなります。水蒸気量がいちばん多いウは約 66 % です。',
        hint: 'それぞれの丸の真上にある青い線までの近さをくらべよう。',
      }),
      choice({
        id: 'weather-2-p3', concept: 'we-humidity',
        prompt: 'グラフの A は、気温 30 ℃ で、1 m³ に 12.8 g の水蒸気をふくむ空気です。この空気を冷やしていくと、何 ℃ で水滴ができ始める？',
        // A (30 ℃, 12.8 g/m³)。12.8 g/m³ が飽和水蒸気量になるのは 15 ℃
        figure: scene(graphItems().concat([
          { type: 'circle', x: gx(30), y: gy(12.8), r: 5, fill: 'ink', stroke: 'none' },
          { type: 'text', x: gx(30) + 9, y: gy(12.8) - 6, text: 'A', size: 14, bold: true },
        ])),
        options: ['10 ℃', '15 ℃', '20 ℃', '30 ℃'],
        answer: 'b',
        explanation: '冷やしても空気中の水蒸気量（12.8 g/m³）は変わらないので、A から左へまっすぐ進み、青い線にぶつかる気温が露点です。グラフでは 15 ℃ で青い線に達するので、15 ℃ で水滴ができ始めます。',
        hint: 'A から左へ水平に線をのばし、青い線と交わる気温を読もう。',
      }),
      choice({
        id: 'weather-2-p4', concept: 'we-cloud',
        prompt: '上昇した空気の温度が下がるのはなぜ？',
        options: ['上空は気圧が低く、空気が膨張するから', '上空は太陽から遠いから', '上空は気圧が高く、空気がおし縮められるから'],
        answer: 'a',
        explanation: '上空ほど気圧が低いので、上昇した空気は膨張します。空気は膨張すると温度が下がります。温度が露点より下がると、雲ができます。',
        hint: '上空の気圧は、地上とくらべて高いか低いか思い出そう。',
      }),
      figureChoice({
        id: 'weather-2-p5', concept: 'we-cloud',
        prompt: 'しめった空気が左から山にぶつかり、斜面にそって上昇し、山をこえて下りていきます。ア〜ウのうち、雲がいちばんできやすいのはどこ？（ア 山のふもと、イ 山頂近くの、空気が上がってくる側、ウ 山をこえて空気が下りていく側）',
        figure: scene([
          { type: 'rect', x: 0, y: 200, width: 320, height: 40, fill: 'sand', stroke: 'none' },
          { type: 'polygon', points: [[60, 200], [170, 70], [280, 200]], fill: 'rock' },
          { type: 'arrow', x1: 8, y1: 188, x2: 48, y2: 188, color: 'blue' },
          { type: 'arrow', x1: 72, y1: 178, x2: 108, y2: 136, color: 'blue' },
          { type: 'arrow', x1: 116, y1: 124, x2: 142, y2: 94, color: 'blue' },
          { type: 'arrow', x1: 198, y1: 96, x2: 230, y2: 134, color: 'blue' },
          { type: 'text', x: 10, y: 226, text: 'しめった空気がふいてくる', size: 12 },
          region('r1', 40, 160, 'ア'),
          region('r2', 150, 64, 'イ'),
          region('r3', 258, 146, 'ウ'),
        ]),
        answer: 'r2',
        explanation: '空気は山の斜面を上昇すると膨張して温度が下がり、露点に達すると雲ができます。だから、空気が上がってきた山頂近くのイです。山をこえて下りる空気は温度が上がるので、ウでは雲ができにくくなります。',
        hint: '空気が上昇して、いちばん冷えているところをさがそう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-2-r1', concept: 'we-humidity',
        prompt: 'グラフの B は、気温 25 ℃ で、1 m³ に 9.4 g の水蒸気をふくむ空気です。この空気の露点は何 ℃？',
        // B (25 ℃, 9.4 g/m³)。9.4 g/m³ が飽和水蒸気量になるのは 10 ℃
        figure: scene(graphItems().concat([
          { type: 'circle', x: gx(25), y: gy(9.4), r: 5, fill: 'ink', stroke: 'none' },
          { type: 'text', x: gx(25) + 9, y: gy(9.4) - 6, text: 'B', size: 14, bold: true },
        ])),
        options: ['5 ℃', '10 ℃', '15 ℃', '25 ℃'],
        answer: 'b',
        explanation: 'B から左へ水平に進むと、10 ℃ で青い線（飽和水蒸気量）にぶつかります。ここで水蒸気量と飽和水蒸気量が等しくなるので、露点は 10 ℃ です。',
        hint: '水蒸気量は変えずに、気温だけを下げていこう。',
      }),
      choice({
        id: 'weather-2-r2', concept: 'we-humidity',
        prompt: '晴れた日、空気中の水蒸気量はほとんど変わらないまま、朝から昼にかけて気温が上がりました。湿度はどうなる？',
        options: ['上がる', '下がる', '変わらない'],
        answer: 'b',
        explanation: '気温が上がると飽和水蒸気量が大きくなります。水蒸気量が同じなら、わる数が大きくなるので湿度は下がります。晴れた日は、気温と湿度が反対の変化をすることが多いです。',
        hint: '気温が上がると、飽和水蒸気量はどうなるか考えよう。',
      }),
      fill({
        id: 'weather-2-r3', concept: 'we-cloud',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '空気が上昇すると、まわりの気圧が[b1]なるので膨張し、温度が[b2]。',
        blanks: [
          word('b1', ['低く', '高く'], '低く'),
          word('b2', ['下がる', '上がる'], '下がる'),
        ],
        explanation: '上空ほど気圧が低いので、上昇した空気は膨張して温度が下がります。温度が露点まで下がると、雲ができ始めます。',
        hint: '山の上でおかしのふくろがふくらむことを思い出そう。',
      }),
      choice({
        id: 'weather-2-r4', concept: 'we-cloud',
        prompt: '地表付近の空気が冷やされて、水蒸気が小さな水滴になり、地面の近くにうかんで見えるものを何という？',
        options: ['霧', '雪', '雨'],
        answer: 'a',
        explanation: '地表付近で空気が露点より冷やされ、水滴がうかんでいるものが霧です。上空でできれば雲、地面の近くでできれば霧と考えると分かりやすいです。',
        hint: '朝、川や山のまわりが白くかすんで見えるものだよ。',
      }),
      choice({
        id: 'weather-2-t2', concept: 'we-humidity', term: true,
        prompt: '次の説明に合う言葉はどれ？「空気中の水蒸気量が、その気温の飽和水蒸気量の何 % にあたるかを表したもの」',
        options: ['露点', '湿度', '気圧'],
        answer: 'b',
        explanation: '空気のしめりぐあいを % で表したものが**湿度**です。湿度＝水蒸気量÷飽和水蒸気量×100 で求めます。',
        hint: '天気予報で「%」で表されるしめりぐあいだよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 前線と天気の変化
  // ================================================================

  // ---- ステージ weather-3: 気圧配置と前線 ----
  const weather3 = {
    id: 'weather-3', areaId: 'front', title: '気圧配置と前線', minutes: 5, concepts: ['we-system', 'we-front'],
    lessons: [
      {
        id: 'weather-3-c1',
        text: '気圧が等しい地点を結んだ線を**等圧線**といい、ふつう 4 hPa ごとに引きます。まわりより気圧が高いところを**高気圧**、低いところを**低気圧**といいます。等圧線の間隔がせまいところほど、強い風がふきます。',
        // 高気圧（等圧線の間隔が広い）と低気圧（間隔がせまい）
        figure: scene([
          { type: 'circle', x: 85, y: 115, r: 30, fill: 'none' },
          { type: 'circle', x: 85, y: 115, r: 60, fill: 'none' },
          { type: 'circle', x: 235, y: 115, r: 20, fill: 'none' },
          { type: 'circle', x: 235, y: 115, r: 32, fill: 'none' },
          { type: 'circle', x: 235, y: 115, r: 44, fill: 'none' },
          { type: 'circle', x: 235, y: 115, r: 56, fill: 'none' },
          { type: 'circle', x: 235, y: 115, r: 68, fill: 'none' },
          { type: 'text', x: 85, y: 122, text: '高', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 235, y: 122, text: '低', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 85, y: 30, text: '高気圧', size: 13, anchor: 'middle' },
          { type: 'text', x: 235, y: 30, text: '低気圧', size: 13, anchor: 'middle' },
          { type: 'text', x: 85, y: 204, text: '間隔が広い→風は弱い', size: 12, anchor: 'middle' },
          { type: 'text', x: 235, y: 204, text: '間隔がせまい→風が強い', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 230, text: '線は等圧線（4 hPa ごと）', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'weather-3-c2',
        anim: 'we-high-low',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '高気圧の中心では**下降気流**が生じ、地表付近では時計回りに風がふき出します。雲ができにくく、晴れることが多いです。低気圧の中心では**上昇気流**が生じ、反時計回りに風がふきこみます。雲ができやすく、くもりや雨になりやすいです。',
        // 北半球の地表付近の風。高気圧は時計回りにふき出す、低気圧は反時計回りにふきこむ
        figure: scene([
          { type: 'arrow', x1: 85, y1: 97, x2: 107.6, y2: 74.4, color: 'blue' },
          { type: 'arrow', x1: 103, y1: 115, x2: 125.6, y2: 137.6, color: 'blue' },
          { type: 'arrow', x1: 85, y1: 133, x2: 62.4, y2: 155.6, color: 'blue' },
          { type: 'arrow', x1: 67, y1: 115, x2: 44.4, y2: 92.4, color: 'blue' },
          { type: 'arrow', x1: 235, y1: 61, x2: 212.4, y2: 83.6, color: 'blue' },
          { type: 'arrow', x1: 289, y1: 115, x2: 266.4, y2: 92.4, color: 'blue' },
          { type: 'arrow', x1: 235, y1: 169, x2: 257.6, y2: 146.4, color: 'blue' },
          { type: 'arrow', x1: 181, y1: 115, x2: 203.6, y2: 137.6, color: 'blue' },
          { type: 'text', x: 85, y: 122, text: '高', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 235, y: 122, text: '低', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 85, y: 36, text: '高気圧', size: 13, anchor: 'middle' },
          { type: 'text', x: 235, y: 36, text: '低気圧', size: 13, anchor: 'middle' },
          { type: 'text', x: 85, y: 196, text: '時計回りにふき出す', size: 12, anchor: 'middle' },
          { type: 'text', x: 85, y: 214, text: '下降気流→晴れ', size: 12, anchor: 'middle' },
          { type: 'text', x: 235, y: 196, text: '反時計回りにふきこむ', size: 12, anchor: 'middle' },
          { type: 'text', x: 235, y: 214, text: '上昇気流→くもり・雨', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'weather-3-c3',
        anim: 'we-front-move',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '気温や湿度がほぼ一様な大きな空気のかたまりを**気団**といいます。性質のちがう気団が接すると、すぐには混じり合わず境の面（前線面）ができます。前線面が地表と交わるところが**前線**です。前線には 4 つの種類があり、記号で表します。',
        // 前線の記号（右へ進む向き）
        figure: scene([
          ...frontItems([[20, 50], [180, 50]], 'cold', 1),
          ...frontItems([[20, 100], [180, 100]], 'warm', 1),
          ...frontItems([[20, 150], [176, 150]], 'stationary', 1),
          ...frontItems([[20, 200], [180, 200]], 'occluded', 1),
          { type: 'text', x: 196, y: 50, text: '寒冷前線', size: 14, bold: true },
          { type: 'text', x: 196, y: 67, text: '寒気が強い', size: 12 },
          { type: 'text', x: 196, y: 100, text: '温暖前線', size: 14, bold: true },
          { type: 'text', x: 196, y: 117, text: '暖気が強い', size: 12 },
          { type: 'text', x: 196, y: 150, text: '停滞前線', size: 14, bold: true },
          { type: 'text', x: 196, y: 167, text: 'つり合っている', size: 12 },
          { type: 'text', x: 196, y: 200, text: '閉そく前線', size: 14, bold: true },
          { type: 'text', x: 196, y: 217, text: '寒冷前線が追いついた', size: 12 },
        ]),
      },
      {
        id: 'weather-3-c4',
        text: '**寒冷前線**では寒気が暖気をおし上げ、**積乱雲**ができて、せまい範囲に強い雨が短時間降ります。通過後は気温が下がり、風は北寄りに変わります。**温暖前線**では暖気が寒気の上をはい上がり、**乱層雲**などができて、広い範囲に弱い雨が長時間降ります。',
        // 写真: 左は積乱雲（下で強い雨）、右は空一面の乱層雲（弱い雨）。前線の断面は weather-3-c3 にある
        figure: scene([
          photo('weather-3-c4'),
          tag(80, 184, '寒冷前線 → 積乱雲', { bold: true }),
          tag(80, 206, 'せまい範囲に強い雨', { size: 13 }),
          tag(80, 226, '（短時間）', { size: 13 }),
          tag(242, 184, '温暖前線 → 乱層雲', { bold: true }),
          tag(242, 206, '広い範囲に弱い雨', { size: 13 }),
          tag(242, 226, '（長時間）', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'weather-3-w1', concept: 'we-system',
      prompt: '予想しよう。天気予報で「あすは高気圧におおわれるでしょう」と言っています。あすの天気はどうなることが多いと思う？',
      options: ['晴れることが多い', '雨が降ることが多い', '大雪になることが多い'],
      answer: 'a',
      explanation: '高気圧の中心では空気が下降していて雲ができにくいので、晴れることが多いです。なぜそうなるのかを、このステージで学ぼう。',
      hint: '「高気圧」と聞いたときの天気のイメージを思い出そう。',
    }),
    problems: [
      choice({
        id: 'weather-3-p1', concept: 'we-system',
        prompt: '低気圧の中心付近の空気の動きと、天気の組み合わせとして正しいものはどれ？',
        options: ['上昇気流が生じて、くもりや雨になりやすい', '下降気流が生じて、晴れやすい', '上昇気流が生じて、晴れやすい'],
        answer: 'a',
        explanation: '低気圧の中心では上昇気流が生じます。上昇した空気は膨張して冷え、雲ができやすいので、くもりや雨になりやすいです。高気圧はその反対で、下降気流のため晴れやすくなります。',
        hint: '空気が上昇すると雲ができやすかったね。',
      }),
      fill({
        id: 'weather-3-t1', concept: 'we-front', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '寒気が暖気をおし上げながら進む前線を[b1]、暖気が寒気の上をはい上がりながら進む前線を[b2]という。',
        blanks: [
          word('b1', ['寒冷前線', '温暖前線', '停滞前線'], '寒冷前線'),
          word('b2', ['寒冷前線', '温暖前線', '停滞前線'], '温暖前線'),
        ],
        explanation: '寒気が主役で進むのが**寒冷前線**、暖気が主役で進むのが**温暖前線**です。どちらの空気が相手をおしているかで名前が決まります。',
        hint: '進んでいく空気が「寒」か「暖」かを見よう。',
      }),
      figureChoice({
        id: 'weather-3-p2', concept: 'we-system',
        prompt: '低気圧のまわりの等圧線（4 hPa ごと）です。ア〜ウのうち、風がいちばん強くふいているのはどこ？（ア 低気圧の左側、イ 右側、ウ 上側）',
        // 等圧線 k（1〜4）は中心 (140 + 10k, 120)、半径 22k。間隔は ア 12、ウ 22、イ 32
        figure: scene([1, 2, 3, 4].map(k => ({ type: 'circle', x: 140 + 10 * k, y: 120, r: 22 * k, fill: 'none' })).concat([
          { type: 'text', x: 150, y: 127, text: '低', size: 18, anchor: 'middle', bold: true },
          region('r1', 104, 120, 'ア'),
          region('r2', 230, 120, 'イ'),
          region('r3', 165, 60, 'ウ'),
        ])),
        answer: 'r1',
        explanation: '等圧線の間隔がせまいところほど、気圧の差が大きく、風が強くふきます。アは等圧線がいちばんつまっているので、風がいちばん強いです。間隔が広いイは、風が弱くなります。',
        hint: '等圧線の間隔がいちばんせまいところをさがそう。',
      }),
      figureChoice({
        id: 'weather-3-p3', concept: 'we-front',
        prompt: 'ア・イは、右へ進む前線の断面です（水色は寒気、ピンクは暖気）。寒冷前線の断面はどちら？',
        figure: scene([
          ...warmSection(10, 10, 250),
          ...coldSection(10, 130, 250),
          region('r1', 290, 55, 'ア'),
          region('r2', 290, 175, 'イ'),
        ]),
        answer: 'r2',
        explanation: '寒冷前線では、寒気が暖気の下にもぐりこんで暖気を急におし上げるので、前線面が急になり、背の高い積乱雲ができます。イがそのようすです。アは暖気が寒気の上をゆるやかにはい上がる温暖前線です。',
        hint: '寒気（水色）が暖気の下にもぐりこんでいるほうをさがそう。',
      }),
      choice({
        id: 'weather-3-p4', concept: 'we-front',
        prompt: 'ある地点を寒冷前線が通過しました。通過したあとの天気の変化として正しいものはどれ？',
        options: ['気温が急に下がり、風向が北寄りに変わる', '気温が上がり、風向が南寄りに変わる', '気温も風向もほとんど変わらない'],
        answer: 'a',
        explanation: '寒冷前線が通過すると、その地点は寒気におおわれるので、気温が急に下がります。風向は南寄りから北寄りに変わります。温暖前線が通過したときは、気温が上がります。',
        hint: '通過したあと、その地点をおおうのは寒気か暖気か考えよう。',
      }),
      drag({
        id: 'weather-3-p5', concept: 'we-front',
        prompt: '天気図に、寒冷前線（青い線と三角）と温暖前線（赤い線と半円）がかいてあります。「低」の印を動かして、この温帯低気圧の中心の位置に置こう。',
        // 2 本の前線がつながる点 (150, 100) が低気圧の中心。寒冷前線は南西へ、温暖前線は東へのびる
        figure: scene([
          ...frontItems([[150, 100], [120, 150], [84, 196]], 'cold', 1, 18),
          ...frontItems([[150, 100], [210, 122], [272, 132]], 'warm', 1, 18),
          { type: 'text', x: 30, y: 175, text: '寒冷前線', size: 13 },
          { type: 'text', x: 210, y: 160, text: '温暖前線', size: 13 },
          { type: 'circle', id: 'low', x: 270, y: 44, r: 16, fill: 'white', label: '低' },
        ]),
        draggable: { itemId: 'low', axis: 'xy' },
        target: { x: 150, y: 100 },
        samples: { correct: { x: 150, y: 100 }, wrong: { x: 200, y: 170 } },
        explanation: '日本付近の温帯低気圧では、中心から南西へ寒冷前線、東へ温暖前線がのびます。だから、2 本の前線がつながっているところが低気圧の中心です。2 本の前線のあいだ（南東側）は暖気におおわれています。',
        hint: '2 本の前線がつながっている点をさがそう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-3-r1', concept: 'we-system',
        prompt: '北半球の高気圧のまわりでは、地表付近の風はどのようにふく？',
        options: ['時計回りにふき出す', '反時計回りにふきこむ', '時計回りにふきこむ', '反時計回りにふき出す'],
        answer: 'a',
        explanation: '高気圧からは、時計回りに風がふき出します。低気圧には、反時計回りに風がふきこみます。風は気圧の高いほうから低いほうへふくことと合わせて覚えよう。',
        hint: '高気圧は「ふき出す」、低気圧は「ふきこむ」だったね。',
      }),
      choice({
        id: 'weather-3-r2', concept: 'we-system',
        prompt: '天気図の等圧線は、ふつう何 hPa ごとに引かれている？',
        options: ['1 hPa', '4 hPa', '10 hPa'],
        answer: 'b',
        explanation: '等圧線はふつう 4 hPa ごとに引き、20 hPa ごとに太い線にします。等圧線の数をかぞえると、気圧の差が分かります。',
        hint: '1000、1004、1008…と並ぶ等圧線を思い出そう。',
      }),
      choice({
        id: 'weather-3-r3', concept: 'we-front',
        prompt: '温暖前線が近づいてくるときに降る雨のようすとして、正しいものはどれ？',
        options: ['せまい範囲に、強い雨が短時間降る', '広い範囲に、弱い雨が長時間降る', '雨はまったく降らない'],
        answer: 'b',
        explanation: '温暖前線では、暖気が寒気の上をゆるやかにはい上がるので、乱層雲などが広い範囲にでき、弱い雨が長い時間降ります。強い雨が短時間降るのは寒冷前線です。',
        hint: '前線面がゆるやかだと、雲はどんなふうに広がるか考えよう。',
      }),
      figureChoice({
        id: 'weather-3-r4', concept: 'we-front',
        prompt: 'ア・イは、右へ進む前線の断面です（水色は寒気、ピンクは暖気）。温暖前線の断面はどちら？',
        figure: scene([
          ...coldSection(10, 10, 250),
          ...warmSection(10, 130, 250),
          region('r1', 290, 55, 'ア'),
          region('r2', 290, 175, 'イ'),
        ]),
        answer: 'r2',
        explanation: '温暖前線では、暖気が寒気の上をゆるやかにはい上がるので、前線面の傾きがゆるやかで、横に広い雲ができます。イがそのようすです。アは寒気が暖気をおし上げる寒冷前線です。',
        hint: '暖気（ピンク）が寒気の上にゆるやかにのり上げているほうをさがそう。',
      }),
      choice({
        id: 'weather-3-t2', concept: 'we-system', term: true,
        prompt: '次の説明に合う言葉はどれ？「天気図で、気圧が等しい地点を結んだ曲線」',
        options: ['前線', '等圧線', '等高線'],
        answer: 'b',
        explanation: '気圧が等しい地点を結んだ線を**等圧線**といいます。等圧線の間隔がせまいところほど、風が強くふきます。',
        hint: '「等しい気圧」の線だよ。',
      }),
    ],
  };

  // ---- ステージ weather-4: 日本の天気 ----
  const weather4 = {
    id: 'weather-4', areaId: 'front', title: '日本の天気', minutes: 5, concepts: ['we-japan'],
    lessons: [
      {
        id: 'weather-4-c1',
        text: '冬は大陸で冷たく乾いた**シベリア気団**が発達し、西に高気圧、東に低気圧がある**西高東低**の気圧配置になります。北西の**季節風**が日本海で水蒸気をふくみ、山にぶつかって日本海側に雪を降らせます。太平洋側は乾いた晴れの日が多くなります。',
        // 写真（気象衛星の雲画像のようす。AI で作った画像）: 冬の日本付近。日本海に北西から南東へのびる筋状の雲
        figure: scene([
          photo('weather-4-c1'),
          tag(52, 20, 'シベリア気団', { size: 13, bold: true }),
          { type: 'arrow', x1: 62, y1: 40, x2: 110, y2: 90, color: 'blue', width: 4 },
          tag(132, 52, '北西の季節風', { size: 13 }),
          tag(92, 150, '日本海', { size: 13 }),
          tag(212, 150, '太平洋', { size: 13 }),
          pointer(270, 106, 160, 134), tag(288, 108, '雪', { size: 15, bold: true }),
          tag(284, 128, '日本海側', { size: 13 }),
          pointer(266, 190, 160, 178), tag(288, 192, '晴れ', { size: 15, bold: true }),
          tag(284, 212, '太平洋側', { size: 13 }),
        ]),
      },
      {
        id: 'weather-4-c2',
        text: '夏は太平洋で暖かくしめった**小笠原気団**が発達し、南に高気圧、北に低気圧がある南高北低の気圧配置になりやすいです。南東の季節風がふき、蒸し暑い晴れの日が多くなります。',
        // 夏の日本付近。南東の高気圧から季節風
        figure: scene(japanItems().concat([
          { type: 'arrow', x1: 250, y1: 190, x2: 214, y2: 162, color: 'blue', width: 4 },
          { type: 'arrow', x1: 292, y1: 168, x2: 264, y2: 134, color: 'blue', width: 4 },
          { type: 'text', x: 274, y: 210, text: '高', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 312, y: 232, text: '小笠原気団', size: 13, anchor: 'end' },
          { type: 'text', x: 128, y: 232, text: '季節風（南東）', size: 13 },
          { type: 'text', x: 108, y: 128, text: '日本海', size: 12 },
        ])),
      },
      {
        id: 'weather-4-c3',
        anim: 'we-westerly',   // 動く図（js/anim-earth.js）。figure は静止図として残す
        text: '春と秋は、**移動性高気圧**と低気圧が交互に日本付近を通るので、天気は数日の周期で変わります。上空には**偏西風**がふいているので、高気圧や低気圧は西から東へ動き、天気も西から東へ変わっていきます。',
        // 春・秋の日本付近。偏西風にのって高気圧・低気圧が西から東へ
        figure: scene(japanItems().concat([
          { type: 'arrow', x1: 20, y1: 22, x2: 236, y2: 22, color: 'orange', width: 5 },
          { type: 'text', x: 20, y: 44, text: '偏西風（西→東）', size: 13 },
          { type: 'text', x: 70, y: 136, text: '低', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 70, y: 112, text: '低気圧', size: 12, anchor: 'middle' },
          { type: 'arrow', x1: 88, y1: 130, x2: 112, y2: 130, color: 'blue' },
          { type: 'text', x: 190, y: 100, text: '高', size: 20, anchor: 'middle', bold: true },
          { type: 'text', x: 190, y: 76, text: '移動性高気圧', size: 12, anchor: 'middle' },
          { type: 'arrow', x1: 208, y1: 94, x2: 232, y2: 94, color: 'blue' },
          { type: 'text', x: 306, y: 228, text: '天気は西から東へ変わる', size: 12, anchor: 'end' },
        ])),
      },
      {
        id: 'weather-4-c4',
        text: '6〜7 月ごろ、北の**オホーツク海気団**と南の小笠原気団の勢力がつり合い、あいだに停滞前線（**梅雨前線**）ができて雨の日が続きます。夏から秋には、熱帯で発達した**台風**が日本付近にやってきて、大雨や強風をもたらします。',
        // 写真（気象衛星の雲画像のようす。AI で作った画像）: 2 枚組。左 (4〜158, 47〜193) は梅雨のころで、本州の南に東西にのびる雲の帯
        // (50〜150, 140〜180)。右 (162〜317, 47〜193) は夏で、雲が少ない。上下は白い余白
        figure: scene([
          photo('weather-4-c4'),
          tag(80, 22, '梅雨のころ', { size: 15, bold: true }), tag(240, 22, '夏', { size: 15, bold: true }),
          tag(94, 42, 'オホーツク海気団', { size: 13 }), pointer(146, 46, 150, 62),
          pointer(40, 199, 40, 168), tag(62, 212, '梅雨前線の雲の帯', { size: 13 }),
          pointer(140, 221, 140, 186), tag(110, 234, '小笠原気団', { size: 13 }),
          tag(240, 212, '小笠原気団におおわれる', { size: 13 }),
          tag(240, 234, '雲が少なく晴れる', { size: 13 }),
        ]),
      },
    ],
    warmup: choice({
      id: 'weather-4-w1', concept: 'we-japan',
      prompt: '予想しよう。冬に、日本海側では雪の日が多く、太平洋側では晴れの日が多くなります。日本海側に雪を降らせる水は、どこから来ていると思う？',
      options: ['大陸の冷たい空気に、はじめから多くふくまれていた', '大陸からの風が日本海の上を通るときに、海から水蒸気をもらった', '太平洋から山をこえてきた'],
      answer: 'b',
      explanation: '大陸の空気は冷たく乾いていますが、日本海の上を通るあいだに海から水蒸気をもらいます。その空気が山にぶつかって上昇し、雪雲ができます。このステージで日本の四季の天気を見ていこう。',
      hint: '大陸と日本のあいだには、何が広がっているか考えよう。',
    }),
    problems: [
      choice({
        id: 'weather-4-p1', concept: 'we-japan',
        prompt: '冬の日本付近でよく見られる気圧配置はどれ？',
        options: ['西高東低', '南高北低', '高気圧と低気圧が交互に通る'],
        answer: 'a',
        explanation: '冬は大陸にシベリア気団の高気圧、日本の東の海上に低気圧があり、西高東低の気圧配置になります。南高北低は夏、高気圧と低気圧が交互に通るのは春と秋の特ちょうです。',
        hint: '冬はどちらに高気圧があったか思い出そう。',
      }),
      fill({
        id: 'weather-4-t1', concept: 'we-japan', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '季節によってふく向きが決まっている風を[b1]、日本付近の上空を西から東へふいている風を[b2]という。',
        blanks: [
          word('b1', ['季節風', '偏西風', '海風'], '季節風'),
          word('b2', ['季節風', '偏西風', '海風'], '偏西風'),
        ],
        explanation: '冬は北西、夏は南東からふく風が**季節風**です。上空をいつも西から東へふいているのが**偏西風**で、天気が西から東へ変わる理由になっています。',
        hint: '「季節」で変わる風と、「西」からふく風だよ。',
      }),
      figureChoice({
        id: 'weather-4-p2', concept: 'we-japan',
        prompt: '日本付近の地図に、3 本の風の矢印があります（ア 北西からふく、イ 南東からふく、ウ 北東からふく）。冬の季節風を表しているのはどれ？',
        figure: monsoonFigure(['nw', 'se', 'ne']),
        answer: 'r1',
        explanation: '冬は西高東低の気圧配置になり、大陸の高気圧から日本の東の低気圧へ向かって、北西の季節風がふきます。だからアです。イの南東からの風は、夏の季節風です。',
        hint: '冬の高気圧は大陸（地図の左上のほう）にあったね。',
      }),
      choice({
        id: 'weather-4-p3', concept: 'we-japan',
        prompt: '夏の蒸し暑い晴れの天気をもたらす気団はどれ？',
        options: ['シベリア気団', '小笠原気団', 'オホーツク海気団'],
        answer: 'b',
        explanation: '夏は太平洋で、暖かくしめった小笠原気団が発達します。この気団におおわれると、蒸し暑い晴れの日が続きます。シベリア気団は冬、オホーツク海気団は梅雨のころに関係します。',
        hint: '暖かい海の上でできる気団をさがそう。',
      }),
      choice({
        id: 'weather-4-p4', concept: 'we-japan',
        prompt: '春や秋の天気が、数日ごとに晴れたり雨が降ったりと変わりやすいのはなぜ？',
        options: ['移動性高気圧と低気圧が、交互に西から東へ通っていくから', '大きな高気圧が、日本の上に何日もとどまるから', '停滞前線が、日本の上にずっととどまるから'],
        answer: 'a',
        explanation: '春や秋は、移動性高気圧と低気圧が偏西風にのって交互に西から東へ通ります。高気圧が来ると晴れ、低気圧が来るとくもりや雨になるので、天気が周期的に変わります。',
        hint: '春と秋に日本付近を通る高気圧の名前を思い出そう。',
      }),
      figureChoice({
        id: 'weather-4-p5', concept: 'we-japan',
        prompt: '冬の日本付近の断面です。北西の季節風が大陸から日本海をわたって、日本列島の山にぶつかります。ア〜ウのうち、雪がいちばん多く降りやすいのはどこ？（ア 日本海側の山の斜面、イ 山をこえた太平洋側、ウ 大陸の上）',
        figure: scene(winterSectionBase().concat([
          region('r1', 198, 136, 'ア'),
          region('r2', 264, 130, 'イ'),
          region('r3', 40, 140, 'ウ'),
        ])),
        answer: 'r1',
        explanation: '北西の季節風は日本海で水蒸気をもらい、日本列島の山にぶつかって上昇します。上昇した空気が冷えて雪雲ができ、日本海側のアに多くの雪を降らせます。山をこえたイには、水蒸気の少ない乾いた風がふき下ろすので、晴れることが多いです。',
        hint: '空気が山にぶつかって上昇するのはどこか考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-4-r1', concept: 'we-japan',
        prompt: '梅雨の時期に日本付近にできる停滞前線（梅雨前線）は、どの気団と気団のあいだにできる？',
        options: ['シベリア気団と小笠原気団', 'オホーツク海気団と小笠原気団', 'シベリア気団とオホーツク海気団'],
        answer: 'b',
        explanation: '6〜7 月ごろ、北の冷たくしめったオホーツク海気団と、南の暖かくしめった小笠原気団の勢力がつり合い、そのあいだに停滞前線ができます。これが梅雨前線です。',
        hint: '梅雨のころに、北と南から日本をはさむ 2 つの気団だよ。',
      }),
      choice({
        id: 'weather-4-r2', concept: 'we-japan',
        prompt: '日本付近まで北上してきた台風が、急に進路を東寄りに変えることが多いのは、何の影響？',
        options: ['季節風', '偏西風', '海風'],
        answer: 'b',
        explanation: '日本付近の上空には、西から東へ偏西風がふいています。北上してきた台風はこの風に流されて、進路を東寄りに変えることが多いです。',
        hint: '上空をいつも西から東へふいている風だよ。',
      }),
      figureChoice({
        id: 'weather-4-r3', concept: 'we-japan',
        prompt: '日本付近の地図に、3 本の風の矢印があります（ア 北東からふく、イ 北西からふく、ウ 南東からふく）。夏の季節風を表しているのはどれ？',
        figure: monsoonFigure(['ne', 'nw', 'se']),
        answer: 'r3',
        explanation: '夏は太平洋の小笠原気団の高気圧から、南東の季節風がふきます。だからウです。イの北西からの風は、冬の季節風です。',
        hint: '夏の高気圧は、日本の南東の太平洋にあったね。',
      }),
      choice({
        id: 'weather-4-t2', concept: 'we-japan', term: true,
        prompt: '次の説明に合う言葉はどれ？「冬によく見られる、日本の西に高気圧、東に低気圧がある気圧配置」',
        options: ['南高北低', '西高東低', '移動性高気圧'],
        answer: 'b',
        explanation: '西に高気圧、東に低気圧がある気圧配置を**西高東低**といいます。冬によく見られ、北西の季節風がふきます。',
        hint: '「西」と「高」、「東」と「低」の 4 文字だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 3: ミニプリント（先生のミニプリントの問題を、このアプリ用に書き直したもの）
  // ステージ weather-mp1〜mp14。プリントのファイル名は docs/reports/content/weather.md の「参考:」に書く。
  // ================================================================

  // ---- ミニプリント用の図の道具 ----

  // 飽和水蒸気量のグラフに置く空気の点（黒丸と名前）
  function airDot(t, v, name) {
    return [
      { type: 'circle', x: gx(t), y: gy(v), r: 5, fill: 'ink', stroke: 'none' },
      { type: 'text', x: gx(t) + 9, y: gy(v) - 6, text: name, size: 14, bold: true },
    ];
  }

  // 表（rows は文字の配列の配列。1 行目は見出し）。左上 (x, y)、列の幅 cws、行の高さ 26
  function table(x, y, cws, rows) {
    const items = [];
    rows.forEach((row, i) => {
      let cx = x;
      row.forEach((cell, j) => {
        items.push({ type: 'rect', x: cx, y: y + 26 * i, width: cws[j], height: 26, fill: i === 0 || j === 0 ? '#EEF2F8' : 'white', stroke: 'line' });
        items.push({ type: 'text', x: cx + cws[j] / 2, y: y + 26 * i + 18, text: cell, size: 13, anchor: 'middle' });
        cx += cws[j];
      });
    });
    return items;
  }

  // 飽和水蒸気量の表（5〜30 ℃。ミニプリントの表と同じ値）
  function satTable(y) {
    return table(5, y, [90, 37, 37, 37, 37, 37, 37], [
      ['気温〔℃〕', '5', '10', '15', '20', '25', '30'],
      ['飽和水蒸気量', '6.8', '9.4', '12.8', '17.3', '23.1', '30.4'],
    ]).concat([{ type: 'text', x: 5, y: y + 70, text: '飽和水蒸気量の単位は g/m³', size: 12 }]);
  }

  // 鉛筆の両はしを指ではさんで押す図（左がとがった先、右が平らなおしり）
  function pencilItems() {
    return [
      { type: 'polygon', points: [[78, 120], [110, 106], [250, 106], [250, 134], [110, 134]], fill: 'yellow' },
      { type: 'polygon', points: [[78, 120], [92, 114], [92, 126]], fill: 'ink' },
      { type: 'ellipse', x: 62, y: 120, rx: 16, ry: 22, fill: 'pink' },
      { type: 'ellipse', x: 266, y: 120, rx: 16, ry: 22, fill: 'pink' },
      { type: 'arrow', x1: 8, y1: 120, x2: 40, y2: 120, color: 'blue' },
      { type: 'arrow', x1: 316, y1: 120, x2: 288, y2: 120, color: 'blue' },
      { type: 'text', x: 180, y: 96, text: '鉛筆', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 30, text: '同じ力で両はしを指で押す', size: 13, anchor: 'middle' },
    ];
  }

  // 棒温度計（x は中心。0〜30 ℃ を y 200〜50 に。value の高さまで赤い液）。1 ℃ ごとの目盛り、10 ℃ ごとに数
  function thermometer(x, value, name) {
    const y = (t) => r1(200 - 5 * t);
    const items = [
      { type: 'rect', x: x - 7, y: 40, width: 14, height: 165, rx: 7, fill: 'white' },
      { type: 'line', points: [[x, 205], [x, y(value)]], color: 'red', width: 5 },
      { type: 'circle', x, y: 210, r: 10, fill: 'red', stroke: 'ink' },
    ];
    for (let t = 0; t <= 30; t++) {
      items.push({ type: 'line', points: [[x + 7, y(t)], [x + (t % 5 === 0 ? 15 : 11), y(t)]], width: 1 });
      if (t % 10 === 0) items.push({ type: 'text', x: x + 18, y: y(t) + 4, text: String(t), size: 12 });
    }
    items.push({ type: 'text', x, y: 236, text: name, size: 13, anchor: 'middle' });
    return items;
  }

  // 2 日分の気温・湿度・気圧の変化（目盛りの数は書かない。x = 40 + 5.5 × 時刻〔時、0〜48〕）
  // series は [{ name, color, pts: [[時刻, y], ...] }]。days は日の名前 2 つ
  function dayGraph(days, series) {
    const hx = (h) => r1(40 + 5.5 * h);
    const items = [
      { type: 'line', points: [[40, 200], [310, 200]], width: 2 },
      { type: 'line', points: [[40, 200], [40, 24]], width: 2 },
      { type: 'line', points: [[hx(24), 200], [hx(24), 24]], color: 'gray', width: 1, dashed: true },
    ];
    // 6 時間ごとの目盛り。数は 0 時（日の変わり目）にだけ書く
    for (let h = 0; h <= 48; h += 6) items.push({ type: 'line', points: [[hx(h), 200], [hx(h), 206]], width: 1 });
    [0, 24, 48].forEach(h => items.push({ type: 'text', x: hx(h), y: 220, text: '0時', size: 12, anchor: 'middle' }));
    days.forEach((d, i) => items.push({ type: 'text', x: hx(12 + 24 * i), y: 230, text: d, size: 13, anchor: 'middle', bold: true }));
    series.forEach(s => {
      items.push({ type: 'line', points: s.pts.map(([h, y]) => [hx(h), y]), color: s.color, width: 3 });
      const last = s.pts[s.pts.length - 1];
      items.push({ type: 'text', x: hx(last[0]) - 4, y: last[1] - 8, text: s.name, size: 14, anchor: 'end', bold: true });
    });
    return items;
  }

  // 15 日（晴れ）・16 日（雨）の記録。A 湿度（青）、B 気温（だいだい）、C 気圧（緑）
  const DAYS_15_16 = [
    { name: 'A', color: 'blue', pts: [[0, 80], [6, 62], [10, 100], [14, 150], [18, 125], [24, 96], [30, 56], [36, 50], [42, 54], [48, 52]] },
    { name: 'B', color: 'orange', pts: [[0, 140], [6, 160], [10, 112], [14, 70], [18, 92], [24, 128], [30, 132], [36, 126], [42, 130], [48, 134]] },
    { name: 'C', color: 'green', pts: [[0, 172], [12, 174], [24, 180], [36, 188], [48, 186]] },
  ];

  // 雲のでき方の図（上昇する空気。下から ○・●・× の印）
  function cloudRiseItems() {
    const items = [
      { type: 'rect', x: 0, y: 0, width: 320, height: 240, fill: 'sky', stroke: 'none' },
      { type: 'rect', x: 0, y: 214, width: 320, height: 26, fill: 'sand', stroke: 'none' },
      { type: 'arrow', x1: 70, y1: 206, x2: 70, y2: 40, color: 'orange' },
      { type: 'text', x: 80, y: 120, text: '上昇する空気', size: 12 },
      { type: 'ellipse', x: 210, y: 92, rx: 80, ry: 60, fill: 'white', stroke: 'gray' },
    ];
    [[180, 190], [220, 180], [250, 198], [200, 166]].forEach(([x, y]) => items.push({ type: 'circle', x, y, r: 5, fill: 'white', stroke: 'ink' }));
    [[170, 120], [205, 108], [240, 124], [225, 140], [185, 140]].forEach(([x, y]) => items.push({ type: 'circle', x, y, r: 5, fill: 'ink', stroke: 'ink' }));
    [[180, 56], [215, 46], [250, 64], [200, 74]].forEach(([x, y]) => {
      items.push({ type: 'line', points: [[x - 5, y - 5], [x + 5, y + 5]], width: 2 });
      items.push({ type: 'line', points: [[x - 5, y + 5], [x + 5, y - 5]], width: 2 });
    });
    return items;
  }

  // ---- ステージ weather-mp1: 大気圧と圧力 ----
  const weatherMp1 = {
    id: 'weather-mp1', areaId: 'we-miniprint', title: 'プリント 1: 大気圧と圧力', minutes: 5, concepts: ['we-pressure'],
    lessons: [
      {
        id: 'weather-mp1-c1',
        text: '空気にも重さがあり、その重さによって生じる圧力を**大気圧**（気圧）といいます。天気では**ヘクトパスカル**（hPa）を使い、海面での大気圧は約 1013 hPa（1 気圧）です。高い山の上ほど上にある空気が少ないので、大気圧は小さくなります。',
        // 海面と山頂の上にある空気の重さ（矢印の長さ）のちがい
        figure: scene([
          { type: 'rect', x: 0, y: 0, width: 320, height: 240, fill: 'sky', stroke: 'none' },
          { type: 'rect', x: 0, y: 200, width: 130, height: 40, fill: '#9CC3F0', stroke: 'none' },
          { type: 'polygon', points: [[130, 240], [130, 200], [230, 80], [320, 200], [320, 240]], fill: 'rock' },
          { type: 'arrow', x1: 40, y1: 60, x2: 40, y2: 194, color: 'blue' },
          { type: 'arrow', x1: 90, y1: 60, x2: 90, y2: 194, color: 'blue' },
          { type: 'arrow', x1: 230, y1: 34, x2: 230, y2: 74, color: 'blue' },
          { type: 'text', x: 65, y: 46, text: '上にある空気の重さ', size: 12, anchor: 'middle' },
          { type: 'text', x: 65, y: 226, text: '海面 約 1013 hPa', size: 12, anchor: 'middle' },
          { type: 'text', x: 236, y: 24, text: '山頂 大気圧が小さい', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'weather-mp1-c2',
        text: '**圧力**〔Pa〕＝面を垂直におす力〔N〕÷力がはたらく面積〔m²〕です。同じ力でも、面積が小さいほど圧力は大きくなります。1 m² ＝ 10000 cm² なので、cm² は m² になおして計算します。100 g の物体にはたらく重力は約 1 N です。',
        // 鉛筆の両はしを押すと、とがった先の指のほうが痛い
        figure: scene(pencilItems().concat([
          { type: 'text', x: 62, y: 166, text: '痛い', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 62, y: 184, text: '面積が小さい', size: 12, anchor: 'middle' },
          { type: 'text', x: 262, y: 166, text: '痛くない', size: 13, anchor: 'middle', bold: true },
          { type: 'text', x: 262, y: 184, text: '面積が大きい', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 222, text: '圧力〔Pa〕＝力〔N〕÷面積〔m²〕', size: 14, anchor: 'middle', bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp1-w1', concept: 'we-pressure',
      prompt: '予想しよう。わたしたちのまわりの空気には、重さがあると思う？',
      options: ['重さがある', '重さはない', '晴れの日だけ重さがある'],
      answer: 'a',
      explanation: '空気にも重さがあります。上にある空気の重さによって生じる圧力が大気圧です。このステージで大気圧と圧力の計算を確かめよう。',
      hint: '空気をつめたボールは、空気をぬいたボールより少し重いよ。',
    }),
    problems: [
      fill({
        id: 'weather-mp1-t1', concept: 'we-pressure', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '空気の重さによって生じる圧力を[b1]という。天気では、100 Pa を 1 [b2]（記号 hPa）として表す。',
        blanks: [
          word('b1', ['大気圧', '水圧', '重力'], '大気圧'),
          word('b2', ['ヘクトパスカル', 'ニュートン', 'キロパスカル'], 'ヘクトパスカル'),
        ],
        explanation: '空気の重さによる圧力を**大気圧**（気圧）といいます。単位はパスカル（Pa）で、天気では 100 倍の**ヘクトパスカル**（hPa）を使います。',
        hint: '「大気」による圧力だね。h は 100 倍を表す記号だよ。',
      }),
      fill({
        id: 'weather-mp1-p1', concept: 'we-pressure',
        prompt: '圧力を求める式です。空らんに入る言葉を選ぼう。',
        text: '圧力〔Pa〕＝[b1]〔N〕÷[b2]〔m²〕',
        blanks: [
          word('b1', ['面を垂直におす力', '力がはたらく面積', '物体の体積'], '面を垂直におす力'),
          word('b2', ['面を垂直におす力', '力がはたらく面積', '物体の体積'], '力がはたらく面積'),
        ],
        explanation: '圧力は、面を垂直におす力を、力がはたらく面積でわって求めます。1 m² あたりにはたらく力の大きさ、という意味です。',
        hint: '単位の N と m² に注目しよう。N÷m² の順だよ。',
      }),
      figureChoice({
        id: 'weather-mp1-p2', concept: 'we-pressure',
        prompt: '鉛筆の両はしを、左右の指で同じ力で押しています。ア（とがった先の指）とイ（平らなおしりの指）のうち、痛いのはどちら？',
        figure: scene(pencilItems().concat([region('r1', 62, 170, 'ア'), region('r2', 266, 170, 'イ')])),
        answer: 'r1',
        explanation: '両方の指は同じ大きさの力で押されていますが、とがった先は指にふれる面積がとても小さいので、圧力が大きくなります。だからアの指のほうが痛くなります。',
        hint: '力が同じなら、ふれる面積が小さいほうが圧力は大きいよ。',
      }),
      fill({
        id: 'weather-mp1-p3', concept: 'we-pressure',
        prompt: '空らんに入る数を入れよう。',
        text: '5 m² の板に 200 N の力が垂直にはたらいている。板が受ける圧力は[b1]である。',
        blanks: [number('b1', 40, 0, 'Pa')],
        explanation: '圧力＝力÷面積 なので、200 ÷ 5 ＝ 40 Pa です。',
        hint: '力〔N〕を面積〔m²〕でわろう。',
      }),
      fill({
        id: 'weather-mp1-p4', concept: 'we-pressure',
        prompt: '空らんに入る数を入れよう。',
        text: '200 cm² の板に 60 N の力が垂直にはたらいている。板が受ける圧力は[b1]である。',
        blanks: [number('b1', 3000, 0, 'Pa')],
        explanation: '200 cm² を m² になおすと 200 ÷ 10000 ＝ 0.02 m² です。圧力＝60 ÷ 0.02 ＝ 3000 Pa です。',
        hint: 'まず cm² を m² になおそう（1 m² ＝ 10000 cm²）。',
      }),
      choice({
        id: 'weather-mp1-p5', concept: 'we-pressure',
        prompt: '海面と、高い山の山頂とでは、大気圧が大きいのはどちら？',
        options: ['海面', '山頂', 'どちらも同じ'],
        answer: 'a',
        explanation: '大気圧は、その場所より上にある空気の重さによって生じます。海面のほうが上にある空気が多いので、大気圧は大きくなります。',
        hint: 'その場所の上に、空気がどれだけのっているかを考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-mp1-r1', concept: 'we-pressure',
        prompt: '1 気圧は、およそどれくらい？',
        options: ['約 100 hPa', '約 1000 hPa', '約 10000 hPa'],
        answer: 'b',
        explanation: '1 気圧は約 1013 hPa で、およそ 1000 hPa です。天気図の等圧線にも 1000 hPa や 1020 hPa などの数が書かれています。',
        hint: '天気図の等圧線にかかれている数を思い出そう。',
      }),
      fill({
        id: 'weather-mp1-r2', concept: 'we-pressure',
        prompt: '空らんに入る数を入れよう。',
        text: '1 m² は[b1]である。',
        blanks: [number('b1', 10000, 0, 'cm²')],
        explanation: '1 m ＝ 100 cm なので、1 m² ＝ 100 cm × 100 cm ＝ 10000 cm² です。',
        hint: '1 辺が 100 cm の正方形の面積を考えよう。',
      }),
      choice({
        id: 'weather-mp1-r3', concept: 'we-pressure',
        prompt: '鉛筆の両はしを同じ力で押すと、とがった先の指だけが痛くなります。そのわけはどれ？',
        options: ['ふれる面積が小さいほうが、圧力が大きくなるから', 'とがった先のほうが、強い力で押しているから', '平らなほうは、力がはたらいていないから'],
        answer: 'a',
        explanation: '両方の指にはたらく力の大きさは同じです。ふれる面積が小さいとがった先のほうが、圧力が大きくなるので痛くなります。',
        hint: '圧力は「力÷面積」だったね。',
      }),
      fill({
        id: 'weather-mp1-r4', concept: 'we-pressure',
        prompt: '空らんに入る数を入れよう。',
        text: '2 m² の板に 10 N の力が垂直にはたらいている。板が受ける圧力は[b1]である。',
        blanks: [number('b1', 5, 0, 'Pa')],
        explanation: '圧力＝力÷面積 なので、10 ÷ 2 ＝ 5 Pa です。',
        hint: '力〔N〕を面積〔m²〕でわろう。',
      }),
      fill({
        id: 'weather-mp1-r5', concept: 'we-pressure',
        prompt: '100 g の物体にはたらく重力を 1 N とします。空らんに入る数を入れよう。',
        text: '4 m² の板の上に、80 kg の物体をのせた。板が受ける圧力は[b1]である。',
        blanks: [number('b1', 200, 0, 'Pa')],
        explanation: '80 kg ＝ 80000 g なので、物体にはたらく重力は 800 N です。圧力＝800 ÷ 4 ＝ 200 Pa です。',
        hint: 'まず kg を N になおそう（1 kg で 10 N）。',
      }),
      choice({
        id: 'weather-mp1-r6', concept: 'we-pressure', term: true,
        prompt: '圧力の単位「Pa」の読み方はどれ？',
        options: ['パスカル', 'ニュートン', 'ジュール'],
        answer: 'a',
        explanation: '圧力の単位は**パスカル**（Pa）です。1 Pa は、1 m² あたり 1 N の力がはたらくときの圧力です。ニュートン（N）は力の単位です。',
        hint: '天気でよく使う hPa の「Pa」の部分だよ。',
      }),
    ],
  };

  // ---- ステージ weather-mp2: 気象観測と天気記号 ----
  // 天気記号 5 つ（左から 快晴・雨・くもり・雪・晴れ）。p2・r1・we-observe-k4 で使う
  function weatherSymbolsRow() {
    const kinds = ['clear', 'rain', 'cloudy', 'snow', 'sunny'];
    const items = [];
    kinds.forEach((k, i) => { items.push(...weatherSymbol(40 + 60 * i, 90, k, 18)); });
    kinds.forEach((k, i) => items.push(region('r' + (i + 1), 40 + 60 * i, 160, 'アイウエオ'[i])));
    return items;
  }

  const weatherMp2 = {
    id: 'weather-mp2', areaId: 'we-miniprint', title: 'プリント 2: 気象観測と天気記号', minutes: 5, concepts: ['we-observe'],
    lessons: [
      {
        id: 'weather-mp2-c1',
        text: '気温は、地上約 1.5 m の高さで、直射日光の当たらない風通しのよい場所ではかります。気圧の単位は hPa、湿度の単位は % です。**風向**は風がふいてくる向きで、北からふく風を「北の風」といいます。**風力**は 0〜12 の 13 段階で表します。',
        // 地上約 1.5 m の高さに置いた温度計
        figure: scene([
          { type: 'rect', x: 0, y: 200, width: 320, height: 40, fill: 'lightgreen', stroke: 'none' },
          { type: 'line', points: [[160, 200], [160, 120]], color: 'brown', width: 4 },
          { type: 'rect', x: 128, y: 76, width: 64, height: 46, fill: 'white', label: '温度計' },
          { type: 'arrow', x1: 230, y1: 160, x2: 230, y2: 100, color: 'blue' },
          { type: 'arrow', x1: 230, y1: 160, x2: 230, y2: 198, color: 'blue' },
          { type: 'line', points: [[196, 99], [240, 99]], color: 'gray', width: 1, dashed: true },
          { type: 'text', x: 240, y: 156, text: '地上 約 1.5 m', size: 13 },
          { type: 'text', x: 160, y: 40, text: '直射日光が当たらず、風通しのよい所', size: 12, anchor: 'middle' },
        ]),
      },
      {
        id: 'weather-mp2-c2',
        text: '**乾湿計**は、乾球温度計と、水でぬらしたガーゼで包んだ湿球温度計でできています。湿球は水が蒸発するときに熱をうばわれるので、ふつう乾球より低い値を示します。乾球の示度と、乾球と湿球の示度の差から、湿度表で湿度を読みとります。',
        // 乾球 18 ℃・湿球 14 ℃（差 4 ℃）
        figure: scene(thermometer(70, 18, '乾球').concat(thermometer(170, 14, '湿球'), [
          { type: 'ellipse', x: 170, y: 210, rx: 14, ry: 15, fill: 'none', stroke: 'gray' },
          { type: 'text', x: 200, y: 230, text: 'ぬれたガーゼ', size: 12 },
          { type: 'text', x: 230, y: 70, text: '差が大きいほど', size: 12 },
          { type: 'text', x: 230, y: 88, text: '湿度は低い', size: 12 },
        ])),
      },
      {
        id: 'weather-mp2-c3',
        text: '全国約 1300 か所で、降水量・気温・風向・風速などを自動で観測するしくみを**アメダス**（地域気象観測システム）といいます。集めたデータをもとに、コンピュータで大気の変化を計算して予報することを**数値予報**といいます。',
        // 日本の地図と観測所（点）
        figure: scene(japanItems().concat(
          [[262, 46], [280, 52], [240, 92], [226, 112], [200, 130], [170, 150], [140, 166], [150, 186], [104, 192], [210, 108]]
            .map(([x, y]) => ({ type: 'circle', x, y, r: 4, fill: 'blue', stroke: 'none' })),
          [{ type: 'text', x: 20, y: 40, text: '● 観測所（アメダス）', size: 13 },
            { type: 'text', x: 20, y: 222, text: 'データ → コンピュータで計算 → 数値予報', size: 12 }],
        )),
      },
    ],
    warmup: choice({
      id: 'weather-mp2-w1', concept: 'we-observe',
      prompt: '予想しよう。学校で気温をはかるとき、温度計はどんな場所に置くとよいと思う？',
      options: ['日かげで、風通しのよい所', '日なたの、地面のすぐ上', '風が当たらない、しめきった部屋の中'],
      answer: 'a',
      explanation: '直射日光が当たると、温度計そのものがあたためられて、空気の温度より高い値になってしまいます。日かげで風通しのよい所ではかります。',
      hint: '温度計がはかりたいのは、太陽の光の熱かな、空気の温度かな。',
    }),
    problems: [
      fill({
        id: 'weather-mp2-t1', concept: 'we-observe', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '全国の観測所で、降水量や気温などを自動で観測するしくみを[b1]という。集めたデータをもとに、コンピュータで計算して行う予報を[b2]という。',
        blanks: [
          word('b1', ['アメダス', 'ハザードマップ', '天気図'], 'アメダス'),
          word('b2', ['数値予報', '長期予報', '注意報'], '数値予報'),
        ],
        explanation: '自動で気象を観測するしくみが**アメダス**（地域気象観測システム）、コンピュータで大気の変化を計算する予報が**数値予報**です。',
        hint: '数を計算して行う予報、という名前だよ。',
      }),
      choice({
        id: 'weather-mp2-p1', concept: 'we-observe',
        prompt: '気温は、地上からどれくらいの高さではかる？',
        options: ['地上約 1.0 m', '地上約 1.5 m', '地上約 2.0 m'],
        answer: 'b',
        explanation: '気温は、地上約 1.5 m の高さで、直射日光の当たらない風通しのよい場所ではかります。地面に近すぎると、地面の温度の影響を受けます。',
        hint: 'おとなの胸からかたくらいの高さだよ。',
      }),
      figureChoice({
        id: 'weather-mp2-p2', concept: 'we-observe',
        prompt: 'ア〜オは天気記号です。「くもり」を表す天気記号はどれ？',
        figure: scene(weatherSymbolsRow()),
        answer: 'r3',
        explanation: 'くもりは、丸の中にもう 1 つ小さな丸をかいた◎の記号です（ウ）。アは快晴、イは雨、エは雪、オは晴れです。',
        hint: '丸の中に、もう 1 つ丸がある記号だよ。',
      }),
      choice({
        id: 'weather-mp2-p3', concept: 'we-observe',
        prompt: '雨や雪は降っていません。空を見上げると、雲が空全体の半分ほど（雲量 5）をおおっていました。天気は何？',
        options: ['快晴', '晴れ', 'くもり'],
        answer: 'b',
        explanation: '雲量 0〜1 は快晴、2〜8 は晴れ、9〜10 はくもりです。雲量 5 は晴れになります。',
        hint: '雲量 2〜8 の天気を思い出そう。',
      }),
      fill({
        id: 'weather-mp2-p4', concept: 'we-observe',
        prompt: '乾湿計の 2 本の温度計を読み、空らんに入る数を入れよう（1 目盛りは 1 ℃）。',
        figure: scene(thermometer(80, 15, '乾球').concat(thermometer(200, 12, '湿球'))),
        text: '乾球の示度は[b1]、湿球の示度は[b2]で、示度の差は[b3]である。',
        blanks: [number('b1', 15, 0, '℃'), number('b2', 12, 0, '℃'), number('b3', 3, 0, '℃')],
        explanation: '乾球は 15 ℃、湿球は 12 ℃ を示しています。差は 15 − 12 ＝ 3 ℃ です。湿球は水が蒸発して熱をうばわれるので、乾球より低くなります。',
        hint: '10 の目盛りから、小さい目盛りをいくつ上がったか数えよう。',
      }),
      choice({
        id: 'weather-mp2-p5', concept: 'we-observe',
        prompt: '風向が「南」の風とは、どのような風？',
        options: ['南からふいてきて、北へ向かう風', '北からふいてきて、南へ向かう風', '南のほうでだけふいている風'],
        answer: 'a',
        explanation: '風向は、風がふいてくる向きです。「南の風」は、南からふいてきて北へ向かう風です。',
        hint: '風向は、風が「どこから」ふいてくるかで表すよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'weather-mp2-r1', concept: 'we-observe',
        prompt: 'ア〜オは天気記号です。「快晴」を表す天気記号はどれ？',
        figure: scene(weatherSymbolsRow()),
        answer: 'r1',
        explanation: '快晴は、中に何もかかない白い丸○です（ア）。晴れは丸の中に縦の線を 1 本かいた記号（オ）です。',
        hint: '雲がほとんどない天気なので、丸の中には何もかかないよ。',
      }),
      choice({
        id: 'weather-mp2-r2', concept: 'we-observe',
        prompt: '雨や雪は降っていません。空のほとんど（雲量 9）が雲におおわれていました。天気は何？',
        options: ['快晴', '晴れ', 'くもり'],
        answer: 'c',
        explanation: '雲量 9〜10 はくもりです。雲量 9 なので、天気はくもりです。',
        hint: '雲量 9〜10 の天気を思い出そう。',
      }),
      choice({
        id: 'weather-mp2-r3', concept: 'we-observe',
        prompt: '乾球の示度が 15 ℃、湿球の示度が 12 ℃ でした。湿度表（乾球 15 ℃ の行）から、湿度はいくら？',
        figure: scene(table(20, 50, [110, 60, 60, 60], [
          ['乾球の示度', '差 2 ℃', '差 3 ℃', '差 4 ℃'],
          ['15 ℃', '78 %', '68 %', '58 %'],
        ]).concat([
          { type: 'text', x: 20, y: 150, text: '乾球 15 ℃、湿球 12 ℃', size: 14, bold: true },
        ])),
        options: ['78 %', '68 %', '58 %'],
        answer: 'b',
        explanation: '乾球と湿球の示度の差は 15 − 12 ＝ 3 ℃ です。乾球 15 ℃ の行と、差 3 ℃ の列が交わるところを読むと 68 % です。',
        hint: 'まず乾球と湿球の示度の差を計算しよう。',
      }),
      fill({
        id: 'weather-mp2-r4', concept: 'we-observe',
        prompt: '空らんに入る単位を選ぼう。',
        text: '気圧の単位は[b1]、湿度の単位は[b2]で表す。',
        blanks: [
          word('b1', ['hPa', '%', '℃'], 'hPa'),
          word('b2', ['hPa', '%', '℃'], '%'),
        ],
        explanation: '気圧はヘクトパスカル（hPa）、湿度はパーセント（%）、気温は ℃ で表します。',
        hint: '湿度は「わり合」で表すよ。',
      }),
      fill({
        id: 'weather-mp2-r5', concept: 'we-observe',
        prompt: '空らんに入る数を入れよう。',
        text: '風力は、0 から[b1]までの段階で表す。',
        blanks: [number('b1', 12, 0, '')],
        explanation: '風力は 0〜12 の 13 段階で表します。天気図記号では、矢羽根の数で風力を表します。',
        hint: '0 をふくめて 13 段階だよ。',
      }),
      choice({
        id: 'weather-mp2-r6', concept: 'we-observe',
        prompt: '「アメダス」という名前の由来として、正しいものはどれ？',
        options: ['自動で気象データを集めるしくみの英語名を略したもの', '「雨です」という言葉がなまったもの', 'アメリカからデータを送ってもらうしくみだから'],
        answer: 'a',
        explanation: 'アメダス（AMeDAS）は、自動で気象データを集めるしくみを表す英語の頭文字をつないだ名前です。日本語では地域気象観測システムといいます。',
        hint: 'アルファベットの頭文字をつないだ名前だよ。',
      }),
      choice({
        id: 'weather-mp2-r7', concept: 'we-observe',
        prompt: '新潟県のあすの天気を予想したい。参考にするなら、北海道西部と九州北部のどちらの天気がよい？',
        options: ['九州北部（日本の西のほう）', '北海道西部（日本の北のほう）', 'どちらも参考にならない'],
        answer: 'a',
        explanation: '日本付近の天気は、上空の偏西風によって西から東へ変わることが多いです。だから、新潟県より西にある九州北部の天気が参考になります。',
        hint: '日本付近の天気は、どの方角からどの方角へ変わっていくかな。',
      }),
    ],
  };

  // ---- ステージ weather-mp3: 気温・湿度・気圧の変化 ----
  // 15 日の記録の表（6 時・12 時・18 時）
  function record15Table() {
    return table(10, 40, [70, 76, 76, 76], [
      ['15 日', '気温', '湿度', '気圧'],
      ['6 時', '12 ℃', '70 %', '1018 hPa'],
      ['12 時', '24 ℃', '25 %', '1016 hPa'],
      ['18 時', '20 ℃', '30 %', '1015 hPa'],
    ]);
  }

  // 19〜21 日の 3 日間の記録（線はア・イ・ウ。ア 湿度、イ 気温、ウ 気圧。20 日はくもり）。showDays が false なら日の名前を書かない
  function threeDayItems(showDays) {
    const hx = (h) => r1(30 + 3.8 * h);   // 0〜72 時
    const items = [
      { type: 'line', points: [[30, 200], [306, 200]], width: 2 },
      { type: 'line', points: [[30, 200], [30, 24]], width: 2 },
      { type: 'line', points: [[hx(24), 200], [hx(24), 24]], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [[hx(48), 200], [hx(48), 24]], color: 'gray', width: 1, dashed: true },
    ];
    if (showDays !== false) ['19日', '20日', '21日'].forEach((d, i) => items.push({ type: 'text', x: hx(12 + 24 * i), y: 226, text: d, size: 13, anchor: 'middle', bold: true }));
    const lines = [
      { name: 'ア', color: 'blue', pts: [[0, 70], [6, 56], [14, 140], [24, 80], [30, 66], [38, 84], [48, 72], [54, 58], [62, 142], [72, 84]] },
      { name: 'イ', color: 'orange', pts: [[0, 140], [6, 158], [14, 76], [24, 132], [30, 140], [38, 124], [48, 136], [54, 156], [62, 72], [72, 130]] },
      { name: 'ウ', color: 'green', pts: [[0, 176], [24, 184], [48, 182], [72, 172]] },
    ];
    lines.forEach(s => {
      items.push({ type: 'line', points: s.pts.map(([h, y]) => [hx(h), y]), color: s.color, width: 3 });
      const last = s.pts[s.pts.length - 1];
      items.push({ type: 'text', x: hx(last[0]) + 4, y: last[1] + 5, text: s.name, size: 14, bold: true });
    });
    return items;
  }

  const weatherMp3 = {
    id: 'weather-mp3', areaId: 'we-miniprint', title: 'プリント 3: 気温・湿度・気圧の変化', minutes: 5, concepts: ['we-observe'],
    lessons: [
      {
        id: 'weather-mp3-c1',
        text: '気温・湿度・気圧・風向・風力・天気など、大気のようすを表すものを**気象要素**といいます。晴れの日は、気温が明け方に最も低く、昼すぎに最も高くなり、1 日の変化が大きくなります。湿度は気温と反対の変化をします。',
        // 15 日（晴れ）と 16 日（雨）の変化
        figure: scene(dayGraph(['15日 晴れ', '16日 雨'], DAYS_15_16).concat([
          { type: 'text', x: 50, y: 20, text: 'A 湿度　B 気温　C 気圧', size: 12 },
        ])),
      },
      {
        id: 'weather-mp3-c2',
        text: 'くもりや雨の日は、日光がさえぎられるので気温の変化が小さく、湿度は高いままになります。低気圧や前線が近づくと気圧が下がることが多く、天気がくずれやすくなります。',
        // くもり・雨の日は変化が小さい（16 日）
        figure: scene(dayGraph(['15日 晴れ', '16日 雨'], DAYS_15_16).concat([
          { type: 'rect', x: 180, y: 74, width: 112, height: 40, fill: 'white', stroke: 'gray' },
          { type: 'text', x: 236, y: 91, text: '変化が小さい', size: 12, anchor: 'middle' },
          { type: 'text', x: 236, y: 107, text: '湿度は高いまま', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp3-w1', concept: 'we-observe',
      prompt: '予想しよう。よく晴れた日、気温が最も高くなるのは何時ごろだと思う？',
      options: ['昼すぎ（午後 2 時ごろ）', '明け方（午前 5 時ごろ）', '真夜中（午前 0 時ごろ）'],
      answer: 'a',
      explanation: '太陽の高さは正午ごろ最も高くなりますが、地面があたたまり、その熱で空気があたたまるまで時間がかかるので、気温は昼すぎに最も高くなります。',
      hint: '地面があたたまってから、空気があたたまるよ。',
    }),
    problems: [
      choice({
        id: 'weather-mp3-t1', concept: 'we-observe', term: true,
        prompt: '気温・湿度・気圧・風向・風力・天気など、大気のようすを表すものをまとめて何という？',
        options: ['気象要素', '気団', '天気図'],
        answer: 'a',
        explanation: '大気のようすを表す気温・湿度・気圧・風向・風力・天気・雲量・降水量などを**気象要素**といいます。',
        hint: '「気象」を表す「要素」だよ。',
      }),
      figureChoice({
        id: 'weather-mp3-p1', concept: 'we-observe',
        prompt: 'A は湿度、B は気温、C は気圧の変化です。下のア（15 日）とイ（16 日）のうち、晴れていたのはどちら？',
        figure: scene(dayGraph([], DAYS_15_16).concat([region('r1', 106, 222, 'ア'), region('r2', 238, 222, 'イ')])),
        answer: 'r1',
        explanation: '晴れの日は、気温（B）が昼すぎに高く、明け方に低くなり、変化が大きくなります。湿度（A）は気温と反対の変化をします。15 日（ア）がこの形です。16 日は変化が小さく湿度が高いので、雨やくもりです。',
        hint: '気温の 1 日の変化が大きいのは、どちらの日かな。',
      }),
      choice({
        id: 'weather-mp3-p2', concept: 'we-observe',
        prompt: 'グラフの A・B・C のうち、山と谷が反対の形（一方が上がると、もう一方が下がる）になっている 2 つはどれ？',
        figure: scene(dayGraph(['15日', '16日'], DAYS_15_16)),
        options: ['A と B', 'A と C', 'B と C'],
        answer: 'a',
        explanation: '晴れの日は、気温（B）が上がると湿度（A）が下がり、気温が下がると湿度が上がります。だから A と B が反対の形になります。',
        hint: '15 日の昼すぎに、上がっている線と下がっている線をさがそう。',
      }),
      choice({
        id: 'weather-mp3-p3', concept: 'we-observe',
        prompt: '晴れの日に、気温が上がる昼すぎに湿度が下がるのはなぜ？',
        options: ['気温が上がって飽和水蒸気量が大きくなるから', '気温が上がって水蒸気が急になくなるから', '昼すぎは気圧が高くなるから'],
        answer: 'a',
        explanation: '空気中の水蒸気量がほぼ同じでも、気温が上がると飽和水蒸気量が大きくなります。湿度は水蒸気量÷飽和水蒸気量なので、わる数が大きくなって湿度は下がります。',
        hint: '湿度を求める式の、わる数に注目しよう。',
      }),
      fill({
        id: 'weather-mp3-p4', concept: 'we-observe',
        prompt: '15 日の記録の表を見て、空らんに入る数を入れよう。',
        figure: scene(record15Table()),
        text: '15 日 18 時の気温は[b1]、湿度は[b2]、気圧は[b3]である。',
        blanks: [number('b1', 20, 0, '℃'), number('b2', 30, 0, '%'), number('b3', 1015, 0, 'hPa')],
        explanation: '表の 18 時の行を読むと、気温 20 ℃、湿度 30 %、気圧 1015 hPa です。',
        hint: '18 時の行を、左から順に読もう。',
      }),
      fill({
        id: 'weather-mp3-p5', concept: 'we-observe',
        prompt: '15 日の記録の表を見て、空らんに入る数を入れよう。',
        figure: scene(record15Table()),
        text: '15 日 12 時の気温は[b1]、湿度は[b2]、気圧は[b3]である。',
        blanks: [number('b1', 24, 0, '℃'), number('b2', 25, 0, '%'), number('b3', 1016, 0, 'hPa')],
        explanation: '12 時の行を読むと、気温 24 ℃、湿度 25 %、気圧 1016 hPa です。気温が最も高い時刻に、湿度は最も低くなっています。',
        hint: '12 時の行を、左から順に読もう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'weather-mp3-r1', concept: 'we-observe',
        prompt: '3 日間の気温・湿度・気圧の変化です。下のア（19 日）・イ（20 日）・ウ（21 日）のうち、くもりだったのはどの日？',
        figure: scene(threeDayItems(false).concat([region('r1', 75.6, 222, 'ア'), region('r2', 166.8, 222, 'イ'), region('r3', 258, 222, 'ウ')])),
        answer: 'r2',
        explanation: '20 日は、気温と湿度の 1 日の変化が小さくなっています。日光がさえぎられて気温が上がりにくいので、くもりの日だと分かります。19 日と 21 日は変化が大きく、晴れの日です。',
        hint: '線の上下の変化がいちばん小さい日をさがそう。',
      }),
      choice({
        id: 'weather-mp3-r2', concept: 'we-observe',
        prompt: '19〜21 日の 3 日間の変化で、ア〜ウは気温・湿度・気圧のどれかです。気温を表しているのはどれ？',
        figure: scene(threeDayItems()),
        options: ['ア', 'イ', 'ウ'],
        answer: 'b',
        explanation: '気温は、晴れの日の昼すぎに最も高く、明け方に最も低くなります。イがこの形です。アはイと反対の形なので湿度、ゆるやかに変わるウが気圧です。',
        hint: '晴れの日の昼すぎに高くなる線をさがそう。',
      }),
      fill({
        id: 'weather-mp3-r3', concept: 'we-observe',
        prompt: '20 日の記録の表を見て、空らんに入る数を入れよう。',
        figure: scene(table(10, 40, [70, 76, 76, 76], [
          ['20 日', '気温', '湿度', '気圧'],
          ['6 時', '10 ℃', '85 %', '1012 hPa'],
          ['12 時', '13 ℃', '75 %', '1011 hPa'],
        ])),
        text: '20 日 6 時の気温は[b1]、湿度は[b2]、気圧は[b3]である。',
        blanks: [number('b1', 10, 0, '℃'), number('b2', 85, 0, '%'), number('b3', 1012, 0, 'hPa')],
        explanation: '6 時の行を読むと、気温 10 ℃、湿度 85 %、気圧 1012 hPa です。',
        hint: '6 時の行を、左から順に読もう。',
      }),
      choice({
        id: 'weather-mp3-r4', concept: 'we-observe',
        prompt: '雨の日の、気温と湿度の 1 日の変化として正しいものはどれ？',
        options: ['気温の変化は小さく、湿度は高いまま', '気温の変化は大きく、湿度は低いまま', '気温も湿度も、晴れの日より大きく変化する'],
        answer: 'a',
        explanation: '雨の日は日光がさえぎられるので、気温は上がりにくく、変化が小さくなります。空気がしめっているので、湿度は高いままです。',
        hint: '日光が当たらないと、気温はどうなるかな。',
      }),
    ],
  };

  // ---- ステージ weather-mp4: 露点の求め方 ----
  const weatherMp4 = {
    id: 'weather-mp4', areaId: 'we-miniprint', title: 'プリント 4: 露点の求め方', minutes: 5, concepts: ['we-humidity'],
    lessons: [
      {
        id: 'weather-mp4-c1',
        text: '金属のコップにくみ置きの水を入れ、氷水を少しずつ加えて冷やします。表面がくもり始めたときの水温が、そのときの空気の**露点**です。くもりの正体は、空気中の水蒸気が冷やされてできた水滴です。金属のコップは熱を伝えやすく、くもりも見やすいです。',
        // 金属のコップ・温度計・表面の水滴
        figure: scene([
          { type: 'beaker', x: 130, y: 210, width: 100, height: 120, level: 0.7, liquid: 'water' },
          { type: 'line', points: [[150, 70], [150, 196]], color: 'red', width: 4 },
          { type: 'rect', x: 144, y: 50, width: 12, height: 26, fill: 'white' },
          ...[[78, 120], [76, 150], [80, 180], [182, 130], [184, 165], [180, 195]].map(([x, y]) => ({ type: 'circle', x, y, r: 3, fill: 'sky', stroke: 'blue' })),
          { type: 'text', x: 166, y: 62, text: '温度計', size: 12 },
          { type: 'text', x: 200, y: 110, text: '表面に水滴', size: 12 },
          { type: 'text', x: 200, y: 128, text: '（くもり）', size: 12 },
          { type: 'text', x: 130, y: 234, text: '金属のコップ', size: 12, anchor: 'middle' },
          { type: 'text', x: 160, y: 24, text: 'くもり始めた水温 ＝ 露点', size: 14, anchor: 'middle', bold: true },
        ]),
      },
      {
        id: 'weather-mp4-c2',
        text: 'グラフでは、空気の点から左へ水平に進み、飽和水蒸気量の曲線とぶつかる気温が露点です。さらに冷やすと、その空気の水蒸気量と、下げた気温での飽和水蒸気量の差の分だけ水滴が出てきます。',
        // A（30 ℃・15 g/m³）。左へ進むと約 17 ℃ で曲線にぶつかる。5 ℃ まで冷やすと 15 − 6.8 ≒ 8 g
        figure: scene(graphItems().concat(airDot(30, 15, 'A'), [
          { type: 'line', points: [[gx(30), gy(15)], [gx(5), gy(15)]], color: 'gray', width: 2, dashed: true },
          { type: 'line', points: [[gx(5), gy(15)], [gx(5), gy(6.8)]], color: 'orange', width: 4 },
          { type: 'text', x: gx(5) + 6, y: gy(11) + 4, text: '水滴になる', size: 12 },
          { type: 'text', x: gx(17.5), y: gy(15) - 12, text: '露点', size: 13, anchor: 'middle', bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp4-w1', concept: 'we-humidity',
      prompt: '予想しよう。冷たい水を入れたコップの表面がくもりました。くもりの正体は何だと思う？',
      options: ['小さな水滴', 'コップの中の水がしみ出したもの', 'ほこり'],
      answer: 'a',
      explanation: 'くもりの正体は、空気中の水蒸気が冷やされてできた小さな水滴です。このステージで、くもり始める温度（露点）の求め方を学ぼう。',
      hint: 'コップのまわりの空気が冷やされると、何が起こるかな。',
    }),
    problems: [
      fill({
        id: 'weather-mp4-t1', concept: 'we-humidity', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '空気を冷やしていくと、ある温度で水蒸気が水滴に変わり始める。この温度を[b1]という。',
        blanks: [word('b1', ['露点', '沸点', '融点'], '露点')],
        explanation: '空気中の水蒸気が水滴に変わり始める温度を**露点**といいます。露点では、水蒸気量と飽和水蒸気量が等しく、湿度は 100 % です。',
        hint: '「露（つゆ）」ができ始める温度だよ。',
      }),
      figureChoice({
        id: 'weather-mp4-p1', concept: 'we-humidity',
        prompt: '空気 A（気温 30 ℃、1 m³ に 15 g の水蒸気）を冷やしていきます。水滴ができ始めるときのようすを表す点は、ア〜ウのどれ？',
        figure: scene(graphItems().concat(airDot(30, 15, 'A'), [region('r1', gx(30), gy(30.4), 'ア'), region('r2', gx(17.5), gy(15), 'イ'), region('r3', gx(5), gy(6.8), 'ウ')])),
        answer: 'r2',
        explanation: '冷やしても水蒸気量（15 g/m³）は変わらないので、A から左へ水平に進みます。飽和水蒸気量の曲線とぶつかるイで、水滴ができ始めます。このときの気温（約 17 ℃）が露点です。',
        hint: 'A から水平に左へ進み、曲線とぶつかるところをさがそう。',
      }),
      choice({
        id: 'weather-mp4-p2', concept: 'we-humidity',
        prompt: '空気 A（気温 30 ℃、1 m³ に 15 g の水蒸気）を 5 ℃ まで冷やすと、1 m³ あたり約何 g の水滴ができる？（5 ℃ の飽和水蒸気量は約 7 g/m³ とする）',
        figure: scene(graphItems().concat(airDot(30, 15, 'A'))),
        options: ['約 7 g', '約 8 g', '約 15 g'],
        answer: 'b',
        explanation: '5 ℃ では 1 m³ に約 7 g までしか水蒸気をふくめません。15 − 7 ＝ 8 なので、約 8 g が水滴になります。',
        hint: 'もとの水蒸気量から、5 ℃ の飽和水蒸気量をひこう。',
      }),
      choice({
        id: 'weather-mp4-p3', concept: 'we-humidity',
        prompt: '空気 a は、気温 31 ℃ で、1 m³ に 20 g の水蒸気をふくんでいます。この空気の露点は約何 ℃？',
        figure: scene(graphItems().concat(airDot(31, 20, 'a'))),
        options: ['約 13 ℃', '約 22〜23 ℃', '約 31 ℃'],
        answer: 'b',
        explanation: 'a から左へ水平に進むと、約 22〜23 ℃ で曲線（飽和水蒸気量）にぶつかります。この気温が露点です。',
        hint: '水蒸気量 20 g/m³ が飽和水蒸気量になる気温を読もう。',
      }),
      choice({
        id: 'weather-mp4-p4', concept: 'we-humidity',
        prompt: '露点を調べる実験で、金属のコップを使う理由を 2 つ合わせたものはどれ？',
        options: ['表面に光沢があってくもりが分かりやすい・熱を伝えやすく水温と表面の温度がすぐ同じになる', '重くて倒れにくい・さびにくい', '水を吸いこむ・割れにくい'],
        answer: 'a',
        explanation: '金属は熱を伝えやすいので、コップの表面の温度が中の水温とすぐ同じになり、水温で露点が分かります。また、光沢があるので、くもり始めが見やすいです。',
        hint: '温度をはかる実験と、くもりを見る実験の両方に役立つ性質だよ。',
      }),
      choice({
        id: 'weather-mp4-p5', concept: 'we-humidity',
        prompt: 'コップの表面についた水滴は、もともとどこにあった？',
        options: ['まわりの空気中に、水蒸気としてあった', 'コップの中の水がしみ出してきた', '氷水から飛んできた'],
        answer: 'a',
        explanation: 'コップのまわりの空気が冷やされて露点に達し、空気中の水蒸気が水滴になって表面についたものです。',
        hint: '目に見えない水が、空気の中にふくまれているよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-mp4-r1', concept: 'we-humidity',
        prompt: '室温 25 ℃ の部屋で、金属のコップの水を氷水で冷やしていくと、水温が 15 ℃ になったとき表面がくもり始めました。この部屋の空気の露点は約何 ℃？',
        options: ['約 5 ℃', '約 15 ℃', '約 25 ℃'],
        answer: 'b',
        explanation: '表面がくもり始めたときの水温が露点です。だから露点は約 15 ℃ です。室温の 25 ℃ ではありません。',
        hint: 'くもり始めたときの温度に注目しよう。',
      }),
      choice({
        id: 'weather-mp4-r2', concept: 'we-humidity',
        prompt: '空気 a（気温 31 ℃、1 m³ に 20 g の水蒸気）を 5 ℃ まで冷やすと、1 m³ あたり約何 g の水滴ができる？（5 ℃ の飽和水蒸気量は約 7 g/m³ とする）',
        figure: scene(graphItems().concat(airDot(31, 20, 'a'))),
        options: ['約 7 g', '約 13 g', '約 20 g'],
        answer: 'b',
        explanation: '5 ℃ では約 7 g までしか水蒸気をふくめないので、20 − 7 ＝ 13 で、約 13 g が水滴になります。',
        hint: 'もとの水蒸気量から、5 ℃ の飽和水蒸気量をひこう。',
      }),
      choice({
        id: 'weather-mp4-r3', concept: 'we-humidity',
        prompt: 'グラフの空気 A の、気温と 1 m³ にふくまれる水蒸気量はどれ？',
        figure: scene(graphItems().concat(airDot(30, 15, 'A'))),
        options: ['30 ℃・15 g/m³', '15 ℃・30 g/m³', '30 ℃・30 g/m³'],
        answer: 'a',
        explanation: '横の軸が気温、たての軸が水蒸気量です。A は横 30 ℃、たて 15 g/m³ の位置にあります。',
        hint: '横の軸とたての軸が、それぞれ何を表しているか確かめよう。',
      }),
      choice({
        id: 'weather-mp4-r4', concept: 'we-humidity',
        prompt: 'グラフの空気 a の、気温と 1 m³ にふくまれる水蒸気量はどれ？',
        figure: scene(graphItems().concat(airDot(31, 20, 'a'))),
        options: ['31 ℃・20 g/m³', '20 ℃・31 g/m³', '25 ℃・15 g/m³'],
        answer: 'a',
        explanation: 'a は横の軸（気温）で 30 ℃ より少し右の 31 ℃、たての軸（水蒸気量）で 20 g/m³ の位置にあります。',
        hint: '横の軸は気温、たての軸は水蒸気量だよ。',
      }),
    ],
  };

  // ---- ステージ weather-mp5: 飽和水蒸気量のグラフ ----
  // 湿度をくらべる 4 つの空気（ア 20 ℃・8 g ≒ 46 %、イ 10 ℃・8 g ≒ 85 %、ウ 30 ℃・6 g ≒ 20 %、エ 25 ℃・15 g ≒ 65 %）
  function fourAirFigure() {
    return scene(graphItems().concat([
      region('r1', gx(20), gy(8), 'ア'), region('r2', gx(10), gy(8), 'イ'),
      region('r3', gx(30), gy(6), 'ウ'), region('r4', gx(25), gy(15), 'エ'),
    ]));
  }

  const weatherMp5 = {
    id: 'weather-mp5', areaId: 'we-miniprint', title: 'プリント 5: 飽和水蒸気量のグラフ', minutes: 5, concepts: ['we-humidity'],
    lessons: [
      {
        id: 'weather-mp5-c1',
        text: '**飽和水蒸気量**は、気温が高いほど大きくなります。グラフの曲線より下の点は、まだ水蒸気をふくむことができる空気です。同じ気温なら、点が曲線に近いほど湿度が高く、曲線の上の点は湿度 100 % です。',
        // 同じ 25 ℃ でも、曲線に近い X は湿度が高く、遠い Y は低い
        figure: scene(graphItems().concat(airDot(25, 20, 'X'), airDot(25, 8, 'Y'), [
          { type: 'text', x: gx(25) - 10, y: gy(20) + 4, text: '湿度が高い', size: 12, anchor: 'end' },
          { type: 'text', x: gx(25) - 10, y: gy(8) + 4, text: '湿度が低い', size: 12, anchor: 'end' },
        ])),
      },
      {
        id: 'weather-mp5-c2',
        text: '水蒸気量が同じでも、気温が低い空気ほど飽和水蒸気量が小さいので、湿度は高くなります。湿度をくらべるときは、水蒸気量だけでなく、その気温の飽和水蒸気量（曲線までの高さ）とくらべます。',
        // 水蒸気量が同じ 8 g/m³ の P（10 ℃）と Q（30 ℃）
        figure: scene(graphItems().concat(airDot(10, 8, 'P'), airDot(30, 8, 'Q'), [
          { type: 'line', points: [[gx(10), gy(8)], [gx(10), gy(9.4)]], color: 'orange', width: 4 },
          { type: 'line', points: [[gx(30), gy(8)], [gx(30), gy(30.4)]], color: 'orange', width: 4 },
          { type: 'text', x: gx(10) - 4, y: gy(9.4) - 22, text: 'P 約 85 %', size: 12, anchor: 'middle' },
          { type: 'text', x: gx(30) - 6, y: gy(18), text: 'Q 約 26 %', size: 12, anchor: 'end' },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp5-w1', concept: 'we-humidity',
      prompt: '予想しよう。水蒸気量が同じ 2 つの空気があります。気温が 10 ℃ の空気と 30 ℃ の空気では、湿度が高いのはどちらだと思う？',
      options: ['10 ℃ の空気', '30 ℃ の空気', 'どちらも同じ'],
      answer: 'a',
      explanation: '気温が低いほど飽和水蒸気量が小さいので、同じ水蒸気量でも、気温が低い 10 ℃ の空気のほうが湿度は高くなります。',
      hint: '気温が低いと、ふくむことのできる水蒸気の最大の量はどうなるかな。',
    }),
    problems: [
      choice({
        id: 'weather-mp5-t1', concept: 'we-humidity', term: true,
        prompt: '次の説明に合う言葉はどれ？「1 m³ の空気がふくむことのできる水蒸気の最大の量」',
        options: ['飽和水蒸気量', '湿度', '露点'],
        answer: 'a',
        explanation: '1 m³ の空気がふくむことのできる水蒸気の最大の量を**飽和水蒸気量**〔g/m³〕といいます。気温が高いほど大きくなります。',
        hint: 'もうこれ以上ふくめない（飽和した）ときの水蒸気の量だよ。',
      }),
      figureChoice({
        id: 'weather-mp5-p1', concept: 'we-humidity',
        prompt: 'グラフのア〜エは、4 つの空気の気温と水蒸気量を表しています。湿度がいちばん高いのはどれ？',
        figure: fourAirFigure(),
        answer: 'r2',
        explanation: '湿度は、水蒸気量がその気温の飽和水蒸気量（曲線）にどれだけ近いかで決まります。イは 10 ℃（9.4 g/m³）で 8 g/m³ をふくむので約 85 % で、いちばん高くなります。',
        hint: 'それぞれの点の真上にある曲線までの近さをくらべよう。',
      }),
      figureChoice({
        id: 'weather-mp5-p2', concept: 'we-humidity',
        prompt: 'グラフのア〜エは、4 つの空気の気温と水蒸気量を表しています。湿度がいちばん低いのはどれ？',
        figure: fourAirFigure(),
        answer: 'r3',
        explanation: 'ウは 30 ℃（30.4 g/m³）で 6 g/m³ しかふくまないので、湿度は約 20 % でいちばん低くなります。曲線からいちばん遠く下にある点です。',
        hint: '点の真上にある曲線から、いちばんはなれている点をさがそう。',
      }),
      choice({
        id: 'weather-mp5-p3', concept: 'we-humidity',
        prompt: '空気 a は、気温 25 ℃ で、1 m³ に 17.3 g の水蒸気をふくんでいます。この空気の露点は約何 ℃？',
        figure: scene(graphItems().concat(airDot(25, 17.3, 'a'))),
        options: ['約 10 ℃', '約 20 ℃', '約 25 ℃'],
        answer: 'b',
        explanation: 'a から左へ水平に進むと、20 ℃ で曲線にぶつかります（20 ℃ の飽和水蒸気量は 17.3 g/m³）。だから露点は約 20 ℃ です。',
        hint: '17.3 g/m³ が飽和水蒸気量になる気温を読もう。',
      }),
      fill({
        id: 'weather-mp5-p4', concept: 'we-humidity',
        prompt: '空気 a（気温 25 ℃、水蒸気量 17.3 g/m³）を 10 ℃ まで冷やします。10 ℃ の飽和水蒸気量は 9.4 g/m³ です。空らんに入る数を入れよう。',
        text: '1 m³ あたり[b1]の水滴ができる。',
        blanks: [number('b1', 7.9, 0.1, 'g')],
        explanation: '10 ℃ では 9.4 g/m³ までしか水蒸気をふくめないので、17.3 − 9.4 ＝ 7.9 g が水滴になります。',
        hint: 'もとの水蒸気量から、10 ℃ の飽和水蒸気量をひこう。',
      }),
      choice({
        id: 'weather-mp5-p5', concept: 'we-humidity',
        prompt: '空気 b は、気温 20 ℃ で、1 m³ に 9.4 g の水蒸気をふくんでいます。この空気を冷やしていくと、約何 ℃ で水滴ができ始める？',
        figure: scene(graphItems().concat(airDot(20, 9.4, 'b'))),
        options: ['約 5 ℃', '約 10 ℃', '約 20 ℃'],
        answer: 'b',
        explanation: 'b から左へ水平に進むと、10 ℃ で曲線にぶつかります（10 ℃ の飽和水蒸気量は 9.4 g/m³）。水滴ができ始める温度（露点）は約 10 ℃ です。',
        hint: '9.4 g/m³ が飽和水蒸気量になる気温を読もう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'weather-mp5-r1', concept: 'we-humidity',
        prompt: '空気 b（気温 20 ℃、水蒸気量 9.4 g/m³）を 5 ℃ まで冷やします。5 ℃ の飽和水蒸気量は 6.8 g/m³ です。空らんに入る数を入れよう。',
        text: '1 m³ あたり[b1]の水滴ができる。',
        blanks: [number('b1', 2.6, 0.1, 'g')],
        explanation: '5 ℃ では 6.8 g/m³ までしか水蒸気をふくめないので、9.4 − 6.8 ＝ 2.6 g が水滴になります。',
        hint: 'もとの水蒸気量から、5 ℃ の飽和水蒸気量をひこう。',
      }),
      choice({
        id: 'weather-mp5-r2', concept: 'we-humidity',
        prompt: 'グラフの空気 a の、気温と 1 m³ にふくまれる水蒸気量はどれ？',
        figure: scene(graphItems().concat(airDot(25, 17.3, 'a'))),
        options: ['25 ℃・約 17 g/m³', '17 ℃・約 25 g/m³', '25 ℃・約 23 g/m³'],
        answer: 'a',
        explanation: 'a は横の軸（気温）で 25 ℃、たての軸（水蒸気量）で 17 g/m³ くらいの位置にあります。曲線の上ではないので、まだ水蒸気をふくむことができます。',
        hint: '点から下へ、左へ線をのばして目盛りを読もう。',
      }),
      choice({
        id: 'weather-mp5-r3', concept: 'we-humidity',
        prompt: 'グラフの空気 b の、気温と 1 m³ にふくまれる水蒸気量はどれ？',
        figure: scene(graphItems().concat(airDot(20, 9.4, 'b'))),
        options: ['20 ℃・約 9 g/m³', '9 ℃・約 20 g/m³', '20 ℃・約 17 g/m³'],
        answer: 'a',
        explanation: 'b は横の軸（気温）で 20 ℃、たての軸（水蒸気量）で 9 g/m³ くらいの位置にあります。',
        hint: '点から下へ、左へ線をのばして目盛りを読もう。',
      }),
      choice({
        id: 'weather-mp5-r4', concept: 'we-humidity',
        prompt: '空気 c は、気温 30 ℃ で、1 m³ に 17.3 g の水蒸気をふくんでいます。この空気の露点は約何 ℃？',
        figure: scene(graphItems().concat(airDot(30, 17.3, 'c'))),
        options: ['約 15 ℃', '約 20 ℃', '約 30 ℃'],
        answer: 'b',
        explanation: 'c から左へ水平に進むと、20 ℃ で曲線にぶつかります。露点は約 20 ℃ です。気温がちがっても、水蒸気量が同じなら露点は同じになります。',
        hint: '17.3 g/m³ が飽和水蒸気量になる気温を読もう。',
      }),
      fill({
        id: 'weather-mp5-r5', concept: 'we-humidity',
        prompt: '空気 c（気温 30 ℃、水蒸気量 17.3 g/m³）を 5 ℃ まで冷やします。5 ℃ の飽和水蒸気量は 6.8 g/m³ です。空らんに入る数を入れよう。',
        text: '1 m³ あたり[b1]の水滴ができる。',
        blanks: [number('b1', 10.5, 0.1, 'g')],
        explanation: '17.3 − 6.8 ＝ 10.5 g が水滴になります。',
        hint: 'もとの水蒸気量から、5 ℃ の飽和水蒸気量をひこう。',
      }),
    ],
  };

  // ---- ステージ weather-mp6: 湿度の計算 ----
  const weatherMp6 = {
    id: 'weather-mp6', areaId: 'we-miniprint', title: 'プリント 6: 湿度の計算', minutes: 6, concepts: ['we-humidity'],
    lessons: [
      {
        id: 'weather-mp6-c1',
        text: '**湿度**〔%〕＝空気 1 m³ 中の水蒸気量〔g/m³〕÷その気温の飽和水蒸気量〔g/m³〕×100 です。たとえば気温 20 ℃（17.3 g/m³）で水蒸気量が 8.65 g/m³ なら、8.65 ÷ 17.3 × 100 ＝ 50 % です。',
        figure: scene(satTable(40).concat([
          { type: 'text', x: 160, y: 160, text: '湿度〔%〕＝ 水蒸気量 ÷ 飽和水蒸気量 × 100', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 190, text: '例: 20 ℃ で 8.65 g/m³ → 8.65 ÷ 17.3 × 100 ＝ 50 %', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'weather-mp6-c2',
        text: '水蒸気量は、飽和水蒸気量×湿度÷100 で求めます。露点が分かっているときは、露点での飽和水蒸気量が、その空気の水蒸気量です。わり合〔%〕は、くらべる量÷もとにする量×100 で求めます。',
        // 飽和水蒸気量（わく）と水蒸気量（ぬった部分）のわり合
        figure: scene([
          { type: 'rect', x: 40, y: 60, width: 240, height: 40, fill: 'white' },
          { type: 'rect', x: 40, y: 60, width: 120, height: 40, fill: 'sky', stroke: 'none' },
          { type: 'rect', x: 40, y: 60, width: 240, height: 40, fill: 'none' },
          { type: 'text', x: 160, y: 50, text: '20 ℃ の飽和水蒸気量 17.3 g/m³', size: 13, anchor: 'middle' },
          { type: 'text', x: 100, y: 86, text: '8.65 g/m³', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 130, text: '水蒸気量は半分 → 湿度 50 %', size: 14, anchor: 'middle', bold: true },
          { type: 'text', x: 160, y: 170, text: '水蒸気量 ＝ 飽和水蒸気量 × 湿度 ÷ 100', size: 13, anchor: 'middle' },
          { type: 'text', x: 160, y: 200, text: 'わり合〔%〕＝ くらべる量 ÷ もとにする量 × 100', size: 13, anchor: 'middle' },
        ]),
      },
    ],
    warmup: choice({
      id: 'weather-mp6-w1', concept: 'we-humidity',
      prompt: '予想しよう。200 g のうちの 50 g は、何 % にあたると思う？',
      options: ['25 %', '50 %', '4 %'],
      answer: 'a',
      explanation: 'わり合〔%〕＝くらべる量÷もとにする量×100 なので、50 ÷ 200 × 100 ＝ 25 % です。湿度も同じ考え方で計算します。',
      hint: '50 は 200 の何分の 1 かな。',
    }),
    problems: [
      fill({
        id: 'weather-mp6-t1', concept: 'we-humidity', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '空気のしめりぐあいを[b1]といい、その気温の[b2]に対する、空気中の水蒸気量のわり合で表す。',
        blanks: [
          word('b1', ['湿度', '露点', '気圧'], '湿度'),
          word('b2', ['飽和水蒸気量', '降水量', '雲量'], '飽和水蒸気量'),
        ],
        explanation: '空気のしめりぐあいを**湿度**といいます。湿度〔%〕＝水蒸気量÷飽和水蒸気量×100 です。',
        hint: 'もうこれ以上ふくめない水蒸気の量を「もとにする量」にするよ。',
      }),
      figureChoice({
        id: 'weather-mp6-p1', concept: 'we-humidity',
        prompt: '気温 20 ℃ の空気の湿度を計算します。表のア（10 ℃ の値）・イ（20 ℃ の値）・ウ（30 ℃ の値）のうち、わる数に使うのはどれ？',
        figure: scene(satTable(40).concat([region('r1', 150.5, 140, 'ア'), region('r2', 224.5, 140, 'イ'), region('r3', 298.5, 140, 'ウ')])),
        answer: 'r2',
        explanation: '湿度は、その気温の飽和水蒸気量でわります。気温 20 ℃ なので、20 ℃ の飽和水蒸気量 17.3 g/m³（イ）でわります。',
        hint: 'その空気の気温と同じ列の値を使おう。',
      }),
      fill({
        id: 'weather-mp6-p2', concept: 'we-humidity',
        prompt: '気温 20 ℃（飽和水蒸気量 17.3 g/m³）の空気 1 m³ に、10.0 g の水蒸気がふくまれています。小数第 1 位を四捨五入して、整数で答えよう。',
        text: 'この空気の湿度は[b1]である。',
        blanks: [number('b1', 58, 0, '%')],
        explanation: '10.0 ÷ 17.3 × 100 ＝ 57.8… なので、四捨五入して 58 % です。',
        hint: '水蒸気量÷飽和水蒸気量×100 を計算しよう。',
      }),
      fill({
        id: 'weather-mp6-p3', concept: 'we-humidity',
        prompt: '気温 25 ℃（飽和水蒸気量 23.1 g/m³）の空気 1 m³ に、20.0 g の水蒸気がふくまれています。小数第 1 位を四捨五入して、整数で答えよう。',
        text: 'この空気の湿度は[b1]である。',
        blanks: [number('b1', 87, 0, '%')],
        explanation: '20.0 ÷ 23.1 × 100 ＝ 86.5… なので、四捨五入して 87 % です。',
        hint: '水蒸気量÷飽和水蒸気量×100 を計算しよう。',
      }),
      fill({
        id: 'weather-mp6-p4', concept: 'we-humidity',
        prompt: '気温 20 ℃（飽和水蒸気量 17.3 g/m³）で、湿度 50 % の空気があります。空らんに入る数を入れよう。',
        text: 'この空気 1 m³ にふくまれる水蒸気量は[b1]である。',
        blanks: [number('b1', 8.65, 0.1, 'g')],
        explanation: '水蒸気量＝飽和水蒸気量×湿度÷100 なので、17.3 × 50 ÷ 100 ＝ 8.65 g です。',
        hint: '17.3 g の 50 %（半分）を求めよう。',
      }),
      fill({
        id: 'weather-mp6-p5', concept: 'we-humidity',
        prompt: '気温 15 ℃（飽和水蒸気量 12.8 g/m³）で湿度 80 % の空気 1 m³ を、5 ℃（6.8 g/m³）まで冷やします。空らんに入る数を入れよう。',
        text: 'この空気の水蒸気量は[b1]で、5 ℃ まで冷やすと[b2]の水滴ができる。',
        blanks: [number('b1', 10.24, 0.1, 'g'), number('b2', 3.44, 0.1, 'g')],
        explanation: '水蒸気量は 12.8 × 80 ÷ 100 ＝ 10.24 g です。5 ℃ では 6.8 g までしかふくめないので、10.24 − 6.8 ＝ 3.44 g が水滴になります。',
        hint: 'まず水蒸気量を求め、5 ℃ の飽和水蒸気量をひこう。',
      }),
    ],
    retryPool: [
      fill({
        id: 'weather-mp6-r1', concept: 'we-humidity',
        prompt: '気温 20 ℃（飽和水蒸気量 17.3 g/m³）の空気 1 m³ に、8.0 g の水蒸気がふくまれています。小数第 1 位を四捨五入して、整数で答えよう。',
        text: 'この空気の湿度は[b1]である。',
        blanks: [number('b1', 46, 0, '%')],
        explanation: '8.0 ÷ 17.3 × 100 ＝ 46.2… なので、四捨五入して 46 % です。',
        hint: '水蒸気量÷飽和水蒸気量×100 を計算しよう。',
      }),
      fill({
        id: 'weather-mp6-r2', concept: 'we-humidity',
        prompt: '気温 30 ℃（飽和水蒸気量 30.4 g/m³）の空気 1 m³ に、10.0 g の水蒸気がふくまれています。小数第 1 位を四捨五入して、整数で答えよう。',
        text: 'この空気の湿度は[b1]である。',
        blanks: [number('b1', 33, 0, '%')],
        explanation: '10.0 ÷ 30.4 × 100 ＝ 32.8… なので、四捨五入して 33 % です。',
        hint: '水蒸気量÷飽和水蒸気量×100 を計算しよう。',
      }),
      fill({
        id: 'weather-mp6-r3', concept: 'we-humidity',
        prompt: '気温 15 ℃（飽和水蒸気量 12.8 g/m³）の空気 1 m³ に、6.0 g の水蒸気がふくまれています。小数第 1 位を四捨五入して、整数で答えよう。',
        text: 'この空気の湿度は[b1]である。',
        blanks: [number('b1', 47, 0, '%')],
        explanation: '6.0 ÷ 12.8 × 100 ＝ 46.8… なので、四捨五入して 47 % です。',
        hint: '水蒸気量÷飽和水蒸気量×100 を計算しよう。',
      }),
      fill({
        id: 'weather-mp6-r4', concept: 'we-humidity',
        prompt: '気温 30 ℃（飽和水蒸気量 30.4 g/m³）で、露点が 15 ℃（飽和水蒸気量 12.8 g/m³）の空気があります。小数第 1 位を四捨五入して、整数で答えよう。',
        text: 'この空気の湿度は[b1]である。',
        blanks: [number('b1', 42, 0, '%')],
        explanation: '露点が 15 ℃ なので、この空気の水蒸気量は 15 ℃ の飽和水蒸気量と同じ 12.8 g/m³ です。12.8 ÷ 30.4 × 100 ＝ 42.1… で、約 42 % です。',
        hint: '露点での飽和水蒸気量が、その空気の水蒸気量だよ。',
      }),
      fill({
        id: 'weather-mp6-r5', concept: 'we-humidity',
        prompt: '気温 25 ℃（飽和水蒸気量 23.1 g/m³）で、露点が 10 ℃（飽和水蒸気量 9.4 g/m³）の空気があります。小数第 1 位を四捨五入して、整数で答えよう。',
        text: 'この空気の湿度は[b1]である。',
        blanks: [number('b1', 41, 0, '%')],
        explanation: '水蒸気量は 10 ℃ の飽和水蒸気量と同じ 9.4 g/m³ です。9.4 ÷ 23.1 × 100 ＝ 40.6… で、約 41 % です。',
        hint: '露点での飽和水蒸気量が、その空気の水蒸気量だよ。',
      }),
      choice({
        id: 'weather-mp6-r6', concept: 'we-humidity',
        prompt: '気温 25 ℃（飽和水蒸気量 23.1 g/m³）の空気 1 m³ に、12 g の水蒸気がふくまれています。湿度を求める式はどれ？',
        options: ['12 ÷ 23.1 × 100', '23.1 ÷ 12 × 100', '23.1 × 12 ÷ 100'],
        answer: 'a',
        explanation: '湿度〔%〕＝水蒸気量÷飽和水蒸気量×100 なので、12 ÷ 23.1 × 100 です。計算すると約 52 % です。',
        hint: 'わられる数は、空気中に実際にある水蒸気量だよ。',
      }),
      fill({
        id: 'weather-mp6-r7', concept: 'we-humidity',
        prompt: '気温 30 ℃（飽和水蒸気量 30.4 g/m³）で、湿度 60 % の空気があります。空らんに入る数を入れよう。',
        text: 'この空気 1 m³ にふくまれる水蒸気量は[b1]である。',
        blanks: [number('b1', 18.24, 0.1, 'g')],
        explanation: '30.4 × 60 ÷ 100 ＝ 18.24 g です。',
        hint: '飽和水蒸気量×湿度÷100 を計算しよう。',
      }),
      fill({
        id: 'weather-mp6-r8', concept: 'we-humidity',
        prompt: 'コップに水が入っています。空らんに入る数を入れよう。',
        text: '200 g 入るコップに 150 g の水が入っているとき、水の量はコップいっぱいの[b1]である。',
        blanks: [number('b1', 75, 0, '%')],
        explanation: '150 ÷ 200 × 100 ＝ 75 % です。湿度も「ふくむことのできる最大の量」をもとにしたわり合です。',
        hint: 'くらべる量÷もとにする量×100 を計算しよう。',
      }),
    ],
  };

  // ---- ステージ weather-mp7: 雲のでき方と水の循環 ----
  // 地球上の水の循環（ア 蒸発、イ 降水、ウ 川の流れ）
  function waterCycleItems() {
    return [
      { type: 'rect', x: 0, y: 0, width: 320, height: 240, fill: 'sky', stroke: 'none' },
      { type: 'rect', x: 0, y: 190, width: 150, height: 50, fill: '#9CC3F0', stroke: 'none' },
      { type: 'polygon', points: [[150, 240], [150, 190], [230, 120], [320, 180], [320, 240]], fill: 'lightgreen' },
      { type: 'circle', x: 34, y: 34, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'ellipse', x: 200, y: 56, rx: 60, ry: 24, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: 70, y1: 184, x2: 130, y2: 76, color: 'blue' },
      { type: 'arrow', x1: 236, y1: 84, x2: 252, y2: 140, color: 'blue' },
      { type: 'arrow', x1: 200, y1: 196, x2: 136, y2: 214, color: 'blue' },
      { type: 'text', x: 74, y: 228, text: '海', size: 13, anchor: 'middle' },
      { type: 'text', x: 200, y: 61, text: '雲', size: 13, anchor: 'middle' },
      { type: 'text', x: 34, y: 70, text: '太陽', size: 12, anchor: 'middle' },
    ];
  }

  const weatherMp7 = {
    id: 'weather-mp7', areaId: 'we-miniprint', title: 'プリント 7: 雲のでき方と水の循環', minutes: 5, concepts: ['we-cloud'],
    lessons: [
      {
        id: 'weather-mp7-c1',
        text: '空気が上昇すると、上空ほど気圧が低いので**膨張**し、温度が下がります。温度が**露点**に達すると、水蒸気が水滴になります。さらに温度が 0 ℃ より低くなると、氷の粒もできます。これらが集まって浮かんでいるものが雲です。',
        figure: scene(cloudRiseItems().concat([
          { type: 'text', x: 6, y: 150, text: '× 氷の粒', size: 12 },
          { type: 'text', x: 6, y: 168, text: '● 水滴', size: 12 },
          { type: 'text', x: 6, y: 186, text: '○ 水蒸気', size: 12 },
          { type: 'text', x: 8, y: 20, text: '上空ほど気圧が低く、温度も低い', size: 12 },
        ])),
      },
      {
        id: 'weather-mp7-c2',
        text: '地球上の水の約 97 % は海にあります。海や陸の水は、**太陽**のエネルギーによって蒸発して水蒸気になり、雲をつくって、雨や雪（**降水**）として地上にもどります。このように水がすがたを変えながらめぐることを**水の循環**といいます。',
        figure: scene(waterCycleItems().concat([
          { type: 'text', x: 108, y: 140, text: '蒸発', size: 13, bold: true },
          { type: 'text', x: 256, y: 116, text: '降水', size: 13, bold: true },
          { type: 'text', x: 176, y: 226, text: '川', size: 13, bold: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp7-w1', concept: 'we-cloud',
      prompt: '予想しよう。雲は何でできていると思う？',
      options: ['小さな水滴や氷の粒', '水蒸気', 'けむりやほこりだけ'],
      answer: 'a',
      explanation: '雲は、空気中の水蒸気が冷やされてできた小さな水滴や氷の粒が集まったものです。水蒸気そのものは目に見えません。',
      hint: '水蒸気は目に見えるかな。',
    }),
    problems: [
      choice({
        id: 'weather-mp7-t1', concept: 'we-cloud', term: true,
        prompt: '次の説明に合う言葉はどれ？「地球上の水が、すがたを変えながら海・空・陸のあいだをめぐること」',
        options: ['水の循環', '蒸発', '降水'],
        answer: 'a',
        explanation: '水が蒸発して雲になり、降水として地上にもどり、川や地下水として海へもどることを**水の循環**といいます。',
        hint: '「めぐる」ことを漢字 2 字で何というかな。',
      }),
      figureChoice({
        id: 'weather-mp7-p1', concept: 'we-cloud',
        prompt: '上昇する空気の中で雲ができるようすです。○・●・× の印は、水蒸気・水滴・氷の粒のどれかです。氷の粒（×）が集まっているのは、ア〜ウのどこ？',
        figure: scene(cloudRiseItems().concat([region('r1', 215, 184, 'ア'), region('r2', 205, 126, 'イ'), region('r3', 215, 60, 'ウ')])),
        answer: 'r3',
        explanation: '上空ほど温度が低くなります。いちばん上のウでは温度が 0 ℃ より低いので、氷の粒（×）ができます。イには水滴（●）、アにはまだ水滴になっていない水蒸気（○）があります。',
        hint: 'いちばん温度が低いのは、いちばん上かな、下かな。',
      }),
      fill({
        id: 'weather-mp7-p2', concept: 'we-cloud',
        prompt: '雲のでき方の文です。空らんに入る言葉を選ぼう。',
        text: '空気が上昇すると、上空の気圧は[b1]ので、空気は[b2]する。すると温度が[b3]、やがて[b4]に達する。すると水蒸気が[b5]になり、白く見える。これが雲である。',
        blanks: [
          word('b1', ['低い', '高い'], '低い'),
          word('b2', ['膨張', '収縮'], '膨張'),
          word('b3', ['下がり', '上がり'], '下がり'),
          word('b4', ['露点', '沸点'], '露点'),
          word('b5', ['水滴', '空気'], '水滴'),
        ],
        explanation: '上空は気圧が低いので、上昇した空気は膨張して温度が下がります。露点に達すると、水蒸気が水滴になって雲ができます。',
        hint: '風船を高い山に持っていくとふくらむのと同じだよ。',
      }),
      figureChoice({
        id: 'weather-mp7-p3', concept: 'we-cloud',
        prompt: '地球上の水の動きを表した図です。矢印ア〜ウのうち、海の水が「蒸発」して水蒸気になる動きを表しているのはどれ？',
        figure: scene(waterCycleItems().concat([region('r1', 100, 130, 'ア'), region('r2', 270, 112, 'イ'), region('r3', 168, 222, 'ウ')])),
        answer: 'r1',
        explanation: '海の水は太陽のエネルギーで蒸発し、水蒸気として上空へ上がります（ア）。イは雲から降る雨や雪（降水）、ウは陸から海へもどる川の流れです。',
        hint: '海から空へ向かう矢印はどれかな。',
      }),
      choice({
        id: 'weather-mp7-p4', concept: 'we-cloud',
        prompt: '地球上にある水のうち、海にある水は約何 %？',
        options: ['約 97 %', '約 87 %', '約 77 %'],
        answer: 'a',
        explanation: '地球上の水の約 97 % は海水です。川や湖、地下水、氷河などの水は、残りのわずかな量です。',
        hint: 'ほとんどすべてが海にあるよ。',
      }),
      choice({
        id: 'weather-mp7-p5', concept: 'we-cloud',
        prompt: '水が地球上をめぐる（水の循環）もとになっているエネルギーは何？',
        options: ['太陽のエネルギー', '地球の内部の熱', '月の引力'],
        answer: 'a',
        explanation: '海や陸の水をあたためて蒸発させるのは、太陽のエネルギーです。水の循環は、太陽のエネルギーによって起こっています。',
        hint: '海の水をあたためているのは何かな。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'weather-mp7-r1', concept: 'we-cloud',
        prompt: '上昇する空気の中で雲ができるようすです。○・●・× の印は、水蒸気・水滴・氷の粒のどれかです。水滴（●）が集まっているのは、ア〜ウのどこ？',
        figure: scene(cloudRiseItems().concat([region('r1', 215, 184, 'ア'), region('r2', 205, 126, 'イ'), region('r3', 215, 60, 'ウ')])),
        answer: 'r2',
        explanation: '空気が上昇して露点に達すると、水蒸気が水滴（●）になります。雲の中ほどのイです。さらに上のウでは、氷の粒（×）になります。',
        hint: '水蒸気が露点に達したあとで、まだ 0 ℃ より高いところだよ。',
      }),
      choice({
        id: 'weather-mp7-r2', concept: 'we-cloud',
        prompt: '雲の下を上昇している空気の中の ○ の印は何を表している？',
        figure: scene(cloudRiseItems()),
        options: ['水蒸気', '水滴', '氷の粒'],
        answer: 'a',
        explanation: '雲の下では、空気はまだ露点に達していないので、水は目に見えない水蒸気（○）のままです。',
        hint: 'まだ雲になっていないところの水は、どんなすがたかな。',
      }),
      figureChoice({
        id: 'weather-mp7-r3', concept: 'we-cloud',
        prompt: '地球上の水の動きを表した図です。矢印ア〜ウのうち、「降水」（雨や雪）を表しているのはどれ？',
        figure: scene(waterCycleItems().concat([region('r1', 100, 130, 'ア'), region('r2', 270, 112, 'イ'), region('r3', 168, 222, 'ウ')])),
        answer: 'r2',
        explanation: '雲から地上へ向かうイが降水です。アは海からの蒸発、ウは川の流れです。',
        hint: '雲から地面へ向かう矢印はどれかな。',
      }),
      fill({
        id: 'weather-mp7-r4', concept: 'we-cloud',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '上昇した空気は[b1]して温度が下がり、[b2]に達すると水蒸気が水滴になって雲ができる。',
        blanks: [
          word('b1', ['膨張', '収縮', '蒸発'], '膨張'),
          word('b2', ['露点', '沸点', '融点'], '露点'),
        ],
        explanation: '上昇した空気は膨張して温度が下がり、露点に達すると雲ができます。',
        hint: '上空は気圧が低いことを思い出そう。',
      }),
    ],
  };

  // ---- ステージ weather-mp8: 等圧線と風のふき方 ----
  // 円に近い折れ線（等圧線）。w は線の太さ
  function ring(cx, cy, r, w) {
    const pts = [];
    for (let k = 0; k <= 48; k++) {
      const a = Math.PI * 2 * k / 48;
      pts.push(rp([cx + r * Math.cos(a), cy + r * Math.sin(a)]));
    }
    return { type: 'line', points: pts, color: 'ink', width: w || 2 };
  }

  // 高気圧のまわりの等圧線（内から 1020・1016・1012・1008 hPa。1020 は太い線）と点 P（1016 の線の上）
  function highIsobarItems() {
    return [
      ring(120, 125, 30, 4), ring(120, 125, 58), ring(120, 125, 86), ring(120, 125, 114),
      { type: 'text', x: 120, y: 132, text: '高', size: 20, anchor: 'middle', bold: true },
      { type: 'text', x: 120, y: 90, text: '1020', size: 12, anchor: 'middle', bg: true },
      { type: 'circle', x: 170.2, y: 96, r: 5, fill: 'ink', stroke: 'none' },
      { type: 'text', x: 178, y: 92, text: 'P', size: 15, bold: true },
      { type: 'text', x: 316, y: 230, text: '等圧線は 4 hPa ごと', size: 12, anchor: 'end' },
    ];
  }

  // 低気圧のまわりの等圧線（内から 1000・1004・1008・1012・1016 hPa。1000 は太い線）。X は 1008、Y は 1016 の線
  function lowIsobarItems() {
    return [
      ring(210, 120, 24, 4), ring(210, 120, 48), ring(210, 120, 72), ring(210, 120, 96), ring(210, 120, 120),
      { type: 'text', x: 210, y: 127, text: '低', size: 20, anchor: 'middle', bold: true },
      { type: 'text', x: 210, y: 92, text: '1000', size: 12, anchor: 'middle', bg: true },
      { type: 'text', x: 138, y: 125, text: 'X', size: 15, anchor: 'middle', bold: true, bg: true },
      { type: 'text', x: 90, y: 125, text: 'Y', size: 15, anchor: 'middle', bold: true, bg: true },
      { type: 'text', x: 6, y: 230, text: '等圧線は 4 hPa ごと', size: 12 },
    ];
  }

  // 高気圧（左）から低気圧（右）へふく風。地点 S からの矢印 ア 等圧線に垂直、イ 等圧線にそう、ウ 右へずれる
  function windAtItems(withRegions) {
    const items = [
      { type: 'text', x: 40, y: 128, text: '高', size: 22, anchor: 'middle', bold: true },
      { type: 'text', x: 290, y: 128, text: '低', size: 22, anchor: 'middle', bold: true },
      { type: 'line', points: [[100, 30], [96, 120], [100, 210]], color: 'ink', width: 2 },
      { type: 'line', points: [[165, 30], [161, 120], [165, 210]], color: 'ink', width: 2 },
      { type: 'line', points: [[230, 30], [226, 120], [230, 210]], color: 'ink', width: 2 },
      { type: 'text', x: 100, y: 24, text: '1012', size: 12, anchor: 'middle' },
      { type: 'text', x: 165, y: 24, text: '1008', size: 12, anchor: 'middle' },
      { type: 'text', x: 230, y: 24, text: '1004', size: 12, anchor: 'middle' },
      { type: 'circle', x: 161, y: 120, r: 5, fill: 'ink', stroke: 'none' },
      { type: 'text', x: 150, y: 140, text: 'S', size: 14, bold: true, anchor: 'end' },
      { type: 'arrow', x1: 161, y1: 120, x2: 214, y2: 120, color: 'blue' },
      { type: 'arrow', x1: 161, y1: 120, x2: 162, y2: 70, color: 'blue' },
      { type: 'arrow', x1: 161, y1: 120, x2: 204, y2: 152, color: 'blue' },
      { type: 'text', x: 316, y: 236, text: '上が北', size: 12, anchor: 'end' },
    ];
    if (withRegions) items.push(region('r1', 240, 104, 'ア'), region('r2', 186, 62, 'イ'), region('r3', 222, 172, 'ウ'));
    return items;
  }

  // 地表付近の風のふき方 4 つ（ア 時計回りにふき出す、イ 反時計回りにふき出す、ウ 反時計回りにふきこむ、エ 時計回りにふきこむ）
  function swirlItems(cx, cy, outward, clockwise) {
    const items = [];
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([ux, uy]) => {
      const vx = -uy * (clockwise ? 1 : -1), vy = ux * (clockwise ? 1 : -1);   // 回る向き（画面の上で）
      const p = outward
        ? [cx + 12 * ux, cy + 12 * uy, cx + 32 * ux + 26 * vx, cy + 32 * uy + 26 * vy]
        : [cx + 46 * ux - 6 * vx, cy + 46 * uy - 6 * vy, cx + 18 * ux + 22 * vx, cy + 18 * uy + 22 * vy];
      items.push({ type: 'arrow', x1: r1(p[0]), y1: r1(p[1]), x2: r1(p[2]), y2: r1(p[3]), color: 'blue', width: 2 });
    });
    items.push({ type: 'circle', x: cx, y: cy, r: 4, fill: 'ink', stroke: 'none' });
    return items;
  }
  function swirlFigure() {
    return scene([
      ...swirlItems(96, 62, true, true), ...swirlItems(256, 62, true, false),
      ...swirlItems(96, 178, false, false), ...swirlItems(256, 178, false, true),
      { type: 'line', points: [[160, 4], [160, 236]], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [[4, 120], [316, 120]], color: 'gray', width: 1, dashed: true },
      region('r1', 26, 26, 'ア'), region('r2', 186, 26, 'イ'), region('r3', 26, 144, 'ウ'), region('r4', 186, 144, 'エ'),
    ]);
  }

  // 高気圧と低気圧の断面（A 下降気流、B 上昇気流）
  function highLowSectionItems() {
    return [
      { type: 'rect', x: 0, y: 196, width: 320, height: 44, fill: 'lightgreen', stroke: 'none' },
      { type: 'arrow', x1: 80, y1: 50, x2: 80, y2: 170, color: 'blue' },
      { type: 'arrow', x1: 78, y1: 184, x2: 30, y2: 184, color: 'blue', width: 2 },
      { type: 'arrow', x1: 82, y1: 184, x2: 130, y2: 184, color: 'blue', width: 2 },
      { type: 'ellipse', x: 240, y: 40, rx: 50, ry: 18, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: 240, y1: 170, x2: 240, y2: 64, color: 'blue' },
      { type: 'arrow', x1: 190, y1: 184, x2: 236, y2: 184, color: 'blue', width: 2 },
      { type: 'arrow', x1: 290, y1: 184, x2: 244, y2: 184, color: 'blue', width: 2 },
      { type: 'text', x: 98, y: 110, text: 'A', size: 18, bold: true },
      { type: 'text', x: 258, y: 120, text: 'B', size: 18, bold: true },
      { type: 'text', x: 160, y: 228, text: '地表', size: 12, anchor: 'middle' },
    ];
  }

  const weatherMp8 = {
    id: 'weather-mp8', areaId: 'we-miniprint', title: 'プリント 8: 等圧線と風のふき方', minutes: 5, concepts: ['we-system'],
    lessons: [
      {
        id: 'weather-mp8-c1',
        text: '**等圧線**は 4 hPa ごとに引き、20 hPa ごとに太い線にします。線の数をたどると、ある地点の気圧が分かります。風は気圧の高いほうから低いほうへふき、北半球では地球の自転の影響で、進む向きの右にずれてふきます。',
        figure: scene(windAtItems(false).concat([
          { type: 'text', x: 208, y: 168, text: '実際の風', size: 12 },
          { type: 'text', x: 40, y: 150, text: '気圧が高い', size: 12, anchor: 'middle' },
          { type: 'text', x: 290, y: 150, text: '気圧が低い', size: 12, anchor: 'middle' },
        ])),
      },
      {
        id: 'weather-mp8-c2',
        text: '**高気圧**の中心では**下降気流**が生じ、地表付近では時計回りに風がふき出します。**低気圧**の中心では**上昇気流**が生じ、反時計回りに風がふきこみます。上昇気流のある低気圧の中心付近では、雲ができやすくなります。',
        figure: scene(highLowSectionItems().concat([
          { type: 'text', x: 80, y: 36, text: '高気圧（下降気流）', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 92, text: '低気圧（上昇気流）', size: 12, anchor: 'middle', bg: true },
          { type: 'text', x: 80, y: 214, text: 'ふき出す', size: 12, anchor: 'middle' },
          { type: 'text', x: 240, y: 214, text: 'ふきこむ', size: 12, anchor: 'middle' },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp8-w1', concept: 'we-system',
      prompt: '予想しよう。風は、気圧の高いところと低いところのあいだで、どちらからどちらへふくと思う？',
      options: ['気圧の高いほうから低いほうへ', '気圧の低いほうから高いほうへ', '気圧とは関係なくふく'],
      answer: 'a',
      explanation: '空気は、気圧の高いほうから低いほうへ向かって動きます。これが風です。このステージで、等圧線と風のふき方を確かめよう。',
      hint: 'ふくらませた風船の口を開けると、空気はどちらへ出ていくかな。',
    }),
    problems: [
      fill({
        id: 'weather-mp8-t1', concept: 'we-system', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '天気図で、気圧の等しい地点を結んだ曲線を[b1]という。中心で上昇気流が生じているのは[b2]である。',
        blanks: [
          word('b1', ['等圧線', '前線', '等高線'], '等圧線'),
          word('b2', ['低気圧', '高気圧'], '低気圧'),
        ],
        explanation: '気圧の等しい地点を結んだ曲線が**等圧線**です。**低気圧**の中心では上昇気流、高気圧の中心では下降気流が生じます。',
        hint: '「圧（気圧）」が「等しい」線だよ。',
      }),
      choice({
        id: 'weather-mp8-p1', concept: 'we-system',
        prompt: '高気圧のまわりの等圧線です（4 hPa ごと。太い線は 1020 hPa）。点 P の気圧は何 hPa？',
        figure: scene(highIsobarItems()),
        options: ['1012 hPa', '1016 hPa', '1020 hPa'],
        answer: 'b',
        explanation: '高気圧の中心から外へ行くほど気圧は低くなります。P は 1020 hPa の太い線の 1 本外側の等圧線の上なので、1020 − 4 ＝ 1016 hPa です。',
        hint: '1020 hPa の線から、外へ何本目の線の上にあるか数えよう。',
      }),
      figureChoice({
        id: 'weather-mp8-p2', concept: 'we-system',
        prompt: '左に高気圧、右に低気圧があります（北半球、上が北）。地点 S でふく風の向きとして正しいのは、矢印ア〜ウのどれ？',
        figure: scene(windAtItems(true)),
        answer: 'r3',
        explanation: '風は気圧の高いほうから低いほうへふきますが、北半球では地球の自転の影響で、進む向きの右にずれます。だから、低気圧のほうへ向かいながら右（南）へずれたウが正しい向きです。',
        hint: '高いほうから低いほうへ。そして北半球では、進む向きのどちらにずれるかな。',
      }),
      figureChoice({
        id: 'weather-mp8-p3', concept: 'we-system',
        prompt: 'ア〜エは、北半球の地表付近の風のふき方です（上から見た図）。高気圧のまわりの風のふき方はどれ？',
        figure: swirlFigure(),
        answer: 'r1',
        explanation: '高気圧の中心からは、時計回りにうずをまくように風がふき出します（ア）。低気圧には、反時計回りに風がふきこみます（ウ）。',
        hint: '高気圧は「ふき出す」。回る向きは時計の針と同じかな。',
      }),
      choice({
        id: 'weather-mp8-p4', concept: 'we-system',
        prompt: '低気圧のまわりの等圧線です（4 hPa ごと。太い線は 1000 hPa）。X の等圧線は何 hPa？',
        figure: scene(lowIsobarItems()),
        options: ['1004 hPa', '1008 hPa', '1012 hPa'],
        answer: 'b',
        explanation: '低気圧の中心から外へ行くほど気圧は高くなります。X は 1000 hPa の太い線から 2 本外側なので、1000 ＋ 4 × 2 ＝ 1008 hPa です。',
        hint: '1000 hPa の線から外へ 1 本ごとに 4 hPa ずつ高くなるよ。',
      }),
      choice({
        id: 'weather-mp8-p5', concept: 'we-system',
        prompt: '地表付近の風のふき方について、正しい組み合わせはどれ？（北半球）',
        options: ['気圧の高いほうから低いほうへふき、進む向きの右にずれる', '気圧の低いほうから高いほうへふき、進む向きの右にずれる', '気圧の高いほうから低いほうへふき、進む向きの左にずれる'],
        answer: 'a',
        explanation: '風は気圧の高いほうから低いほうへふきます。北半球では、地球の自転の影響で、進む向きの右にずれてふきます。',
        hint: '高気圧のまわりで時計回りになるのは、右にずれるからだよ。',
      }),
    ],
    retryPool: [
      fill({
        id: 'weather-mp8-r1', concept: 'we-system',
        prompt: '天気図の等圧線について、空らんに入る数を入れよう。',
        text: '等圧線はふつう[b1]ごとに引き、[b2]ごとに太い線にする。',
        blanks: [number('b1', 4, 0, 'hPa'), number('b2', 20, 0, 'hPa')],
        explanation: '等圧線は 4 hPa ごとに引き、1000 hPa・1020 hPa のように 20 hPa ごとに太い線にします。',
        hint: '1000、1004、1008…と引いていくよ。',
      }),
      figureChoice({
        id: 'weather-mp8-r2', concept: 'we-system',
        prompt: 'ア〜エは、北半球の地表付近の風のふき方です（上から見た図）。低気圧のまわりの風のふき方はどれ？',
        figure: swirlFigure(),
        answer: 'r3',
        explanation: '低気圧には、まわりから反時計回りにうずをまくように風がふきこみます（ウ）。ふきこんだ空気は、中心で上昇気流になります。',
        hint: '低気圧は「ふきこむ」。回る向きは時計の針と反対だよ。',
      }),
      choice({
        id: 'weather-mp8-r3', concept: 'we-system',
        prompt: '低気圧のまわりの等圧線です（4 hPa ごと。太い線は 1000 hPa）。Y の等圧線は何 hPa？',
        figure: scene(lowIsobarItems()),
        options: ['1012 hPa', '1016 hPa', '1020 hPa'],
        answer: 'b',
        explanation: 'Y は 1000 hPa の太い線から 4 本外側なので、1000 ＋ 4 × 4 ＝ 1016 hPa です。',
        hint: '1000 hPa の線から外へ何本目か数えよう。',
      }),
      choice({
        id: 'weather-mp8-r4', concept: 'we-system',
        prompt: '図は高気圧と低気圧の断面です。A は下向き、B は上向きの空気の流れです。高気圧を表しているのはどちら？',
        figure: scene(highLowSectionItems()),
        options: ['A（下降気流）', 'B（上昇気流）'],
        answer: 'a',
        explanation: '高気圧の中心では下降気流（A）が生じ、地表で空気がふき出します。低気圧の中心では上昇気流（B）が生じ、雲ができやすくなります。',
        hint: '雲ができにくく晴れやすいのは、空気が下りてくるほうだよ。',
      }),
      figureChoice({
        id: 'weather-mp8-r5', concept: 'we-system',
        prompt: '4 つの地点の気圧（hPa）です。1012 hPa の等圧線を引くとき、線が通るのはア〜ウのどこ？',
        figure: scene([
          ...[[40, 1016], [120, 1014], [200, 1010], [280, 1008]].flatMap(([x, p]) => [
            { type: 'circle', x, y: 100, r: 5, fill: 'ink', stroke: 'none' },
            { type: 'text', x, y: 86, text: String(p), size: 14, anchor: 'middle', bold: true },
          ]),
          region('r1', 80, 150, 'ア'), region('r2', 160, 150, 'イ'), region('r3', 240, 150, 'ウ'),
          { type: 'text', x: 160, y: 30, text: '地点の気圧〔hPa〕', size: 13, anchor: 'middle' },
        ]),
        answer: 'r2',
        explanation: '1012 hPa は、1014 hPa の地点と 1010 hPa の地点のあいだにあります。だから等圧線は、その 2 地点のあいだ（イ）を通ります。',
        hint: '1012 は、どの 2 つの数のあいだにあるかな。',
      }),
    ],
  };

  // ---- ステージ weather-mp9: 日本付近の気団と海流 ----
  // 日本の地図を 0.8 倍にして (40, 40) ずらしたもの（まわりに気団や海流をかく場所をあける）
  function japanSmall() {
    return japanItems().map(it => Object.assign({}, it, { points: it.points.map(([x, y]) => rp([40 + 0.8 * x, 40 + 0.8 * y])) }));
  }

  // 4 つの気団（ア シベリア、イ オホーツク海、ウ 揚子江、エ 小笠原）。names が true なら名前を書く
  function airMassItems(names) {
    const masses = [[80, 60, 'シベリア気団'], [285, 34, 'オホーツク海気団'], [55, 182, '揚子江気団'], [272, 206, '小笠原気団']];
    const items = japanSmall();
    masses.forEach(([x, y]) => items.push({ type: 'ellipse', x, y, rx: 36, ry: 20, fill: 'white', stroke: 'gray' }));
    if (names) masses.forEach(([x, y, n]) => items.push({ type: 'text', x: Math.min(Math.max(x, 52), 268), y: y + 5, text: n, size: 12, anchor: 'middle', bg: true }));
    else masses.forEach(([x, y], i) => items.push(region('r' + (i + 1), x, y, 'アイウエ'[i])));
    return items;
  }

  // 4 つの海流（ア 対馬海流、イ 日本海流、ウ 千島海流、エ リマン海流）。colors が true なら暖流を赤、寒流を青にする
  function currentItems(colors) {
    const paths = [
      [[[90, 228], [100, 180], [140, 150], [190, 128], [225, 98]], 'red'],
      [[[120, 238], [175, 212], [235, 180], [275, 140]], 'red'],
      [[[312, 40], [300, 90], [280, 120], [262, 150]], 'blue'],
      [[[200, 30], [150, 60], [105, 100], [80, 140]], 'blue'],
    ];
    const items = japanSmall();
    paths.forEach(([pts, c]) => items.push({ type: 'line', points: pts, color: colors ? c : 'gray', width: 4, arrow: true }));
    return items;
  }
  const CURRENT_AT = [[146, 128], [222, 212], [294, 132], [118, 66]];

  const weatherMp9 = {
    id: 'weather-mp9', areaId: 'we-miniprint', title: 'プリント 9: 日本付近の気団と海流', minutes: 5, concepts: ['we-airmass'],
    lessons: [
      {
        id: 'weather-mp9-c1',
        text: '日本のまわりには性質のちがう気団があります。北西の**シベリア気団**は冷たく乾き、北東の**オホーツク海気団**は冷たくしめり、南東の**小笠原気団**は暖かくしめっています。西の**揚子江気団**は暖かく乾いています。海の上の気団はしめっています。',
        figure: scene(airMassItems(true)),
      },
      {
        id: 'weather-mp9-c2',
        text: '日本の近くには、暖かい**暖流**と冷たい**寒流**が流れています。太平洋側の**日本海流**（黒潮）と日本海側の**対馬海流**は暖流、太平洋側の**千島海流**（親潮）と日本海側のリマン海流は寒流です。',
        figure: scene(currentItems(true).concat([
          { type: 'text', x: 146, y: 132, text: '対馬海流', size: 12, anchor: 'middle', bg: true },
          { type: 'text', x: 214, y: 220, text: '日本海流（黒潮）', size: 12, anchor: 'middle', bg: true },
          { type: 'text', x: 316, y: 176, text: '千島海流', size: 12, anchor: 'end', bg: true },
          { type: 'text', x: 316, y: 192, text: '（親潮）', size: 12, anchor: 'end', bg: true },
          { type: 'text', x: 118, y: 62, text: 'リマン海流', size: 12, anchor: 'middle', bg: true },
          { type: 'text', x: 6, y: 20, text: '赤: 暖流　青: 寒流', size: 12 },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp9-w1', concept: 'we-airmass',
      prompt: '予想しよう。海の上でできた気団と、大陸の上でできた気団では、しめっているのはどちらだと思う？',
      options: ['海の上でできた気団', '大陸の上でできた気団', 'どちらも同じ'],
      answer: 'a',
      explanation: '海の上では、海面から水が蒸発して空気に水蒸気が多くふくまれるので、気団はしめります。大陸の上の気団は乾いています。',
      hint: '水蒸気のもとになる水が多いのはどちらかな。',
    }),
    problems: [
      fill({
        id: 'weather-mp9-t1', concept: 'we-airmass', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '日本の太平洋側を流れる暖流の日本海流は[b1]、寒流の千島海流は[b2]ともよばれる。',
        blanks: [
          word('b1', ['黒潮', '親潮', '対馬海流'], '黒潮'),
          word('b2', ['黒潮', '親潮', '対馬海流'], '親潮'),
        ],
        explanation: '暖流の日本海流を**黒潮**、寒流の千島海流を**親潮**といいます。',
        hint: '栄養が多く、魚を育てる「親」のような海流はどちらかな。',
      }),
      figureChoice({
        id: 'weather-mp9-p1', concept: 'we-airmass',
        prompt: '日本のまわりの 4 つの気団ア〜エです。オホーツク海気団はどれ？',
        figure: scene(airMassItems(false)),
        answer: 'r2',
        explanation: 'オホーツク海気団は、日本の北東のオホーツク海の上にある気団です（イ）。冷たくしめっています。',
        hint: '北海道の北にある海の上だよ。',
      }),
      choice({
        id: 'weather-mp9-p2', concept: 'we-airmass',
        prompt: '図の気団ア〜エのうち、ウは揚子江気団です。暖かい気団 2 つの組み合わせはどれ？',
        figure: scene(airMassItems(false)),
        options: ['ウ と エ', 'ア と イ', 'イ と エ'],
        answer: 'a',
        explanation: '南にある気団は暖かく、北にある気団は冷たいです。南西のウ（揚子江気団）と南東のエ（小笠原気団）が暖かい気団です。',
        hint: '南にある気団をさがそう。',
      }),
      choice({
        id: 'weather-mp9-p3', concept: 'we-airmass',
        prompt: '図の気団ア〜エのうち、しめっている気団 2 つの組み合わせはどれ？',
        figure: scene(airMassItems(false)),
        options: ['イ と エ', 'ア と ウ', 'ア と エ'],
        answer: 'a',
        explanation: '海の上にあるイ（オホーツク海気団）とエ（小笠原気団）は、しめっています。大陸の上にあるア（シベリア気団）とウ（揚子江気団）は乾いています。',
        hint: '海の上にある気団をさがそう。',
      }),
      choice({
        id: 'weather-mp9-p4', concept: 'we-airmass',
        prompt: 'オホーツク海気団や小笠原気団がしめっているのはなぜ？',
        options: ['海の上にある気団だから', '大陸の上にある気団だから', '北にある気団だから'],
        answer: 'a',
        explanation: '海の上では、海面から蒸発した水蒸気が空気に多くふくまれます。だから海の上にある気団はしめっています。',
        hint: '水蒸気は、どこから空気にとりこまれるかな。',
      }),
      figureChoice({
        id: 'weather-mp9-p5', concept: 'we-airmass',
        prompt: '日本のまわりの 4 つの海流ア〜エです。太平洋側を北へ流れる暖流の日本海流（黒潮）はどれ？',
        figure: scene(currentItems(false).concat(CURRENT_AT.map(([x, y], i) => region('r' + (i + 1), x, y, 'アイウエ'[i])))),
        answer: 'r2',
        explanation: '日本海流（黒潮）は、日本の南の太平洋側を、南西から北東へ流れる暖流です（イ）。アは日本海側の暖流の対馬海流です。',
        hint: '太平洋側で、南から北へ向かう流れだよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'weather-mp9-r1', concept: 'we-airmass',
        prompt: '日本のまわりの 4 つの気団ア〜エです。シベリア気団はどれ？',
        figure: scene(airMassItems(false)),
        answer: 'r1',
        explanation: 'シベリア気団は、日本の北西の大陸の上にある気団です（ア）。冷たく乾いていて、冬に発達します。',
        hint: '北西の大陸の上だよ。',
      }),
      figureChoice({
        id: 'weather-mp9-r2', concept: 'we-airmass',
        prompt: '日本のまわりの 4 つの気団ア〜エです。小笠原気団はどれ？',
        figure: scene(airMassItems(false)),
        answer: 'r4',
        explanation: '小笠原気団は、日本の南東の太平洋の上にある気団です（エ）。暖かくしめっていて、夏に発達します。',
        hint: '南東の海の上だよ。',
      }),
      choice({
        id: 'weather-mp9-r3', concept: 'we-airmass',
        prompt: '図の海流ア〜エのうち、寒流 2 つの組み合わせはどれ？',
        figure: scene(currentItems(false).concat(CURRENT_AT.map(([x, y], i) => ({ type: 'text', x, y: y + 5, text: 'アイウエ'[i], size: 15, anchor: 'middle', bold: true, bg: true })))),
        options: ['ウ と エ', 'ア と イ', 'イ と ウ'],
        answer: 'a',
        explanation: '北から南へ流れてくるウ（千島海流）とエ（リマン海流）が寒流です。南から流れてくるア（対馬海流）とイ（日本海流）は暖流です。',
        hint: '寒流は、冷たい北の海から流れてくるよ。',
      }),
      choice({
        id: 'weather-mp9-r4', concept: 'we-airmass',
        prompt: '図の海流ア〜エのうち、暖流 2 つの組み合わせはどれ？',
        figure: scene(currentItems(false).concat(CURRENT_AT.map(([x, y], i) => ({ type: 'text', x, y: y + 5, text: 'アイウエ'[i], size: 15, anchor: 'middle', bold: true, bg: true })))),
        options: ['ア と イ', 'ウ と エ', 'ア と エ'],
        answer: 'a',
        explanation: '南から北へ流れてくるア（対馬海流）とイ（日本海流）が暖流です。',
        hint: '暖流は、暖かい南の海から流れてくるよ。',
      }),
      figureChoice({
        id: 'weather-mp9-r5', concept: 'we-airmass',
        prompt: '日本のまわりの 4 つの海流ア〜エです。日本海側を北へ流れる暖流の対馬海流はどれ？',
        figure: scene(currentItems(false).concat(CURRENT_AT.map(([x, y], i) => region('r' + (i + 1), x, y, 'アイウエ'[i])))),
        answer: 'r1',
        explanation: '対馬海流は、九州の西から日本海に入り、日本海側を北へ流れる暖流です（ア）。',
        hint: '日本海側で、南から北へ向かう流れだよ。',
      }),
    ],
  };

  // ---- ステージ weather-mp10: 前線のつくり ----
  // 前線の断面から文字（寒気・暖気・題）を除いたもの
  function noText(items) { return items.filter(it => it.type !== 'text'); }

  // 前線の記号 4 つ（上から ア 温暖、イ 閉そく、ウ 寒冷、エ 停滞）
  function frontSymbolsFigure() {
    return scene([
      ...frontItems([[30, 40], [210, 40]], 'warm', 1),
      ...frontItems([[30, 95], [210, 95]], 'occluded', 1),
      ...frontItems([[30, 150], [210, 150]], 'cold', 1),
      ...frontItems([[30, 205], [206, 205]], 'stationary', 1),
      region('r1', 262, 40, 'ア'), region('r2', 262, 95, 'イ'), region('r3', 262, 150, 'ウ'), region('r4', 262, 205, 'エ'),
    ]);
  }

  // しきりをとって 5 分後の水槽（上にぬるま湯、下に冷水）
  function tankItems() {
    return [
      { type: 'rect', x: 40, y: 60, width: 240, height: 70, fill: '#F6C1C1', stroke: 'none' },
      { type: 'rect', x: 40, y: 130, width: 240, height: 70, fill: 'sky', stroke: 'none' },
      { type: 'rect', x: 40, y: 50, width: 240, height: 150, fill: 'none' },
      { type: 'text', x: 160, y: 100, text: 'ぬるま湯（赤）', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 170, text: '冷水（青）', size: 13, anchor: 'middle' },
      { type: 'text', x: 160, y: 32, text: 'しきりをとって 5 分後', size: 13, anchor: 'middle', bold: true },
      { type: 'text', x: 160, y: 226, text: '冷たい水は重く、下にもぐりこむ', size: 12, anchor: 'middle' },
    ];
  }

  const weatherMp10 = {
    id: 'weather-mp10', areaId: 'we-miniprint', title: 'プリント 10: 前線のつくり', minutes: 6, concepts: ['we-front'],
    lessons: [
      {
        id: 'weather-mp10-c1',
        text: '寒気と暖気の境の面を**前線面**、前線面が地表と交わる線を**前線**といいます。**寒冷前線**では、寒気が暖気の下にもぐりこんで暖気を急におし上げるので、**積乱雲**ができ、せまい範囲に強い雨が短時間降ります。',
        figure: scene(coldSection(20, 40, 280, '寒冷前線').concat([
          { type: 'text', x: 170, y: 72, text: '積乱雲', size: 12, bold: true },
          { type: 'text', x: 150, y: 110, text: '前線面', size: 12, anchor: 'end', bg: true },
          { type: 'text', x: 160, y: 170, text: '前線（前線面と地表が交わる所）', size: 12, anchor: 'middle' },
          ...frontItems([[60, 210], [260, 210]], 'cold', 1),
        ])),
      },
      {
        id: 'weather-mp10-c2',
        text: '**温暖前線**では、暖気が寒気の上をゆるやかにはい上がるので、**乱層雲**などができ、広い範囲に弱い雨が長時間降ります。寒気と暖気の勢力がつり合うと**停滞前線**、寒冷前線が温暖前線に追いつくと**閉そく前線**ができます。',
        figure: scene(warmSection(20, 30, 280, '温暖前線').concat([
          { type: 'text', x: 204, y: 64, text: '乱層雲', size: 12, bold: true },
          ...frontItems([[30, 160], [200, 160]], 'stationary', 1),
          ...frontItems([[30, 210], [200, 210]], 'occluded', 1),
          { type: 'text', x: 212, y: 164, text: '停滞前線', size: 13 },
          { type: 'text', x: 212, y: 214, text: '閉そく前線', size: 13 },
        ])),
      },
      {
        id: 'weather-mp10-c3',
        text: '水槽の左にぬるま湯、右に冷水を入れてしきりをとると、冷たい水は暖かい水より重い（密度が大きい）ので下にもぐりこみ、暖かい水は上へ移ります。寒気と暖気も同じように、寒気が下に、暖気が上になります。',
        figure: scene(tankItems()),
      },
    ],
    warmup: choice({
      id: 'weather-mp10-w1', concept: 'we-front',
      prompt: '予想しよう。冷たい空気と暖かい空気がぶつかると、冷たい空気はどちらへ動くと思う？',
      options: ['暖かい空気の下にもぐりこむ', '暖かい空気の上にのり上げる', 'すぐに混ざり合う'],
      answer: 'a',
      explanation: '冷たい空気は暖かい空気より重い（密度が大きい）ので、暖かい空気の下にもぐりこみます。性質のちがう空気はすぐには混ざらず、境の面ができます。',
      hint: '冷たい空気と暖かい空気、重いのはどちらかな。',
    }),
    problems: [
      fill({
        id: 'weather-mp10-t1', concept: 'we-front', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '寒気と暖気が混ざらずにできる境の面を[b1]といい、それが地表と交わる線を[b2]という。',
        blanks: [
          word('b1', ['前線面', '等圧線', '地平線'], '前線面'),
          word('b2', ['前線', '等圧線', '地平線'], '前線'),
        ],
        explanation: '寒気と暖気の境の面が**前線面**、前線面が地表と交わる線が**前線**です。',
        hint: '「前線」の「面」だよ。',
      }),
      figureChoice({
        id: 'weather-mp10-p1', concept: 'we-front',
        prompt: '右へ進む温暖前線の断面です（雲もかいてあります）。ア・イのうち、寒気を表しているのはどちら？',
        figure: scene(noText(warmSection(20, 40, 280)).concat([region('r1', 76, 92, 'ア'), region('r2', 270, 114, 'イ')])),
        answer: 'r2',
        explanation: '温暖前線では、暖気が寒気の上をゆるやかにはい上がります。地表の近くで、前線面の下にあるイが寒気です。アは寒気の上にのり上げる暖気です。',
        hint: '重い空気は、前線面の上と下のどちらにあるかな。',
      }),
      choice({
        id: 'weather-mp10-p2', concept: 'we-front',
        prompt: '寒冷前線の断面です。前線付近にできる雲 Y の名前はどれ？',
        figure: scene(noText(coldSection(20, 40, 280)).concat([{ type: 'text', x: 186, y: 66, text: 'Y', size: 16, bold: true }])),
        options: ['積乱雲', '乱層雲', '巻雲'],
        answer: 'a',
        explanation: '寒冷前線では暖気が急におし上げられるので、上へ高くのびる積乱雲ができます。',
        hint: '縦に高くのびる雲だよ。',
      }),
      choice({
        id: 'weather-mp10-p3', concept: 'we-front',
        prompt: '寒冷前線の付近で降る雨のようすとして正しいものはどれ？',
        options: ['強い雨が短時間降る', '弱い雨が長時間降る', '強い雨が長時間降る', '弱い雨が短時間降る'],
        answer: 'a',
        explanation: '寒冷前線では積乱雲ができるので、せまい範囲に強い雨が短時間降ります。雷やとっ風をともなうこともあります。',
        hint: '積乱雲の雨は、にわか雨だよ。',
      }),
      figureChoice({
        id: 'weather-mp10-p4', concept: 'we-front',
        prompt: 'ア〜エは前線の記号です。寒冷前線が温暖前線に追いついてできる閉そく前線の記号はどれ？',
        figure: frontSymbolsFigure(),
        answer: 'r2',
        explanation: '閉そく前線は、寒冷前線の三角と温暖前線の半円を、同じ側に交互にかいた記号です（イ）。アは温暖前線、ウは寒冷前線、エは停滞前線です。',
        hint: '三角と半円が、同じ側についている記号だよ。',
      }),
      choice({
        id: 'weather-mp10-p5', concept: 'we-front',
        prompt: '寒気と暖気の勢力がほぼ等しく、あまり動かない前線はどれ？',
        options: ['停滞前線', '寒冷前線', '温暖前線'],
        answer: 'a',
        explanation: '寒気と暖気の勢力がつり合っていると、前線はほとんど動きません。これを停滞前線といいます。',
        hint: '「とどまって動かない」前線だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-mp10-r1', concept: 'we-front',
        prompt: '温暖前線の断面です。前線面にそって広がる雲 X の名前はどれ？',
        figure: scene(noText(warmSection(20, 40, 280)).concat([{ type: 'text', x: 204, y: 74, text: 'X', size: 16, bold: true }])),
        options: ['乱層雲', '積乱雲', '積雲'],
        answer: 'a',
        explanation: '温暖前線では暖気がゆるやかに上昇するので、横に広がる乱層雲などができ、広い範囲に雨を降らせます。',
        hint: '横に広く広がり、雨を降らせる雲だよ。',
      }),
      choice({
        id: 'weather-mp10-r2', concept: 'we-front',
        prompt: '温暖前線の付近で降る雨のようすとして正しいものはどれ？',
        options: ['弱い雨が長時間降る', '強い雨が短時間降る', '強い雨が長時間降る', '弱い雨が短時間降る'],
        answer: 'a',
        explanation: '温暖前線では乱層雲が広がるので、広い範囲に弱い雨が長時間降ります。',
        hint: '乱層雲の雨は、しとしと長く降るよ。',
      }),
      choice({
        id: 'weather-mp10-r3', concept: 'we-front',
        prompt: '寒気の勢力が暖気より強く、寒気が暖気をおしながら進む前線はどれ？',
        options: ['寒冷前線', '温暖前線', '停滞前線'],
        answer: 'a',
        explanation: '寒気の勢力が強く、寒気が暖気の下にもぐりこみながら進む前線が寒冷前線です。',
        hint: '強いほうの空気の名前がつくよ。',
      }),
      choice({
        id: 'weather-mp10-r4', concept: 'we-front',
        prompt: '暖気の勢力が寒気より強く、暖気が寒気をおしながら進む前線はどれ？',
        options: ['温暖前線', '寒冷前線', '閉そく前線'],
        answer: 'a',
        explanation: '暖気の勢力が強く、暖気が寒気の上をはい上がりながら進む前線が温暖前線です。',
        hint: '強いほうの空気の名前がつくよ。',
      }),
      choice({
        id: 'weather-mp10-r5', concept: 'we-front',
        prompt: '寒冷前線が温暖前線に追いついてできる前線はどれ？',
        options: ['閉そく前線', '停滞前線', '温暖前線'],
        answer: 'a',
        explanation: '寒冷前線は温暖前線より速く進むので、やがて追いつきます。こうしてできるのが閉そく前線です。',
        hint: '前線が「閉じる」という意味の名前だよ。',
      }),
      figureChoice({
        id: 'weather-mp10-r6', concept: 'we-front',
        prompt: 'ア〜エは前線の記号です。停滞前線の記号はどれ？',
        figure: frontSymbolsFigure(),
        answer: 'r4',
        explanation: '停滞前線は、三角と半円を反対側に交互にかいた記号です（エ）。',
        hint: '三角と半円が、線の反対側についている記号だよ。',
      }),
      choice({
        id: 'weather-mp10-r7', concept: 'we-front',
        prompt: '水槽の実験で、しきりをとると冷水がぬるま湯の下にもぐりこむのはなぜ？',
        options: ['冷水のほうが密度が大きく、重いから', '冷水のほうが密度が小さく、軽いから', 'ぬるま湯が冷水を引きよせるから'],
        answer: 'a',
        explanation: '同じ体積でくらべると、冷たい水のほうが重い（密度が大きい）ので、下にしずみます。空気も同じで、寒気は暖気の下にもぐりこみます。',
        hint: '同じ体積で重いほうが、下へ行くよ。',
      }),
      choice({
        id: 'weather-mp10-r8', concept: 'we-front',
        prompt: '寒気が暖気の下にもぐりこみ、暖気を急におし上げている断面です。この前線の名前はどれ？',
        figure: scene(noText(coldSection(20, 40, 280))),
        options: ['寒冷前線', '温暖前線', '停滞前線'],
        answer: 'a',
        explanation: '寒気が暖気の下にもぐりこみ、暖気をおし上げながら進むのは寒冷前線です。',
        hint: '寒気が暖気をおしているね。',
      }),
      choice({
        id: 'weather-mp10-r9', concept: 'we-front',
        prompt: '水槽をしきりで分け、左にぬるま湯（赤）、右に冷水（青）を入れました。しきりをとって 5 分たつと、どうなる？',
        options: ['上が赤、下が青に分かれる', '上が青、下が赤に分かれる', '混ざって全体が紫色になる', '左が赤、右が青のまま変わらない'],
        answer: 'a',
        explanation: '冷水はぬるま湯より重い（密度が大きい）ので、ぬるま湯の下にもぐりこみます。5 分たつと、上が赤（ぬるま湯）、下が青（冷水）に分かれます。',
        hint: '重い水は、下と上のどちらへ行くかな。',
      }),
    ],
  };

  // ---- ステージ weather-mp11: 前線の通過と天気の予想 ----
  // ある地点の 10〜19 時の気温と風向（14〜15 時に寒冷前線が通過）。withRegions なら時間帯ア〜オの選ぶ場所をつける
  function passageItems(withRegions) {
    const tx = (t) => r1(40 + 26 * (t - 10));
    const ty = (T) => r1(190 - 10 * (T - 12));
    const temps = [[10, 22], [11, 22.5], [12, 23], [13, 23], [14, 22.5], [15, 17], [16, 16], [17, 15.5], [18, 15], [19, 14.5]];
    const winds = ['南', '南', '南西', '南西', '南西', '北西', '北西', '北', '北', '北'];
    const items = [
      { type: 'line', points: [[40, 190], [290, 190]], width: 2 },
      { type: 'line', points: [[40, 190], [40, 60]], width: 2 },
      { type: 'line', points: [[40, ty(15)], [290, ty(15)]], color: 'gray', width: 1, dashed: true },
      { type: 'line', points: [[40, ty(20)], [290, ty(20)]], color: 'gray', width: 1, dashed: true },
      { type: 'text', x: 34, y: ty(15) + 4, text: '15', size: 12, anchor: 'end' },
      { type: 'text', x: 34, y: ty(20) + 4, text: '20', size: 12, anchor: 'end' },
      { type: 'text', x: 46, y: 58, text: '気温〔℃〕', size: 12 },
      { type: 'line', points: temps.map(([t, T]) => [tx(t), ty(T)]), color: 'orange', width: 3 },
      { type: 'text', x: 4, y: 30, text: '風向', size: 12 },
    ];
    winds.forEach((w, i) => items.push({ type: 'text', x: tx(10 + i), y: i % 2 ? 44 : 28, text: w, size: 12, anchor: 'middle' }));   // 重ならないよう 1 時間ごとに上下にずらす
    [10, 12, 14, 16, 18].forEach(t => items.push({ type: 'text', x: tx(t), y: 204, text: t + '時', size: 12, anchor: 'middle' }));
    if (withRegions) [10.5, 12.5, 14.5, 16.5, 18.5].forEach((t, i) => items.push(region('r' + (i + 1), tx(t), 226, 'アイウエオ'[i])));
    return items;
  }

  // 低気圧と 2 本の前線（OA 温暖前線、OB 寒冷前線）。withXY なら東西の線 X–Y をかく
  function lowFrontItems(withXY) {
    const items = [
      ...frontItems([[150, 78], [300, 150]], 'warm', 1),
      ...frontItems([[135, 82], [40, 200]], 'cold', 1),
      { type: 'text', x: 140, y: 72, text: '低', size: 20, anchor: 'middle', bold: true },
      { type: 'text', x: 124, y: 96, text: 'O', size: 14, bold: true },
      { type: 'text', x: 304, y: 168, text: 'A', size: 14, bold: true },
      { type: 'text', x: 26, y: 214, text: 'B', size: 14, bold: true },
      { type: 'text', x: 316, y: 20, text: '上が北', size: 12, anchor: 'end' },
    ];
    if (withXY) {
      items.push(
        { type: 'line', points: [[16, 125], [306, 125]], color: 'gray', width: 2, dashed: true },
        { type: 'text', x: 4, y: 130, text: 'X', size: 14, bold: true },
        { type: 'text', x: 309, y: 130, text: 'Y', size: 14, bold: true },
      );
    }
    return items;
  }

  const weatherMp11 = {
    id: 'weather-mp11', areaId: 'we-miniprint', title: 'プリント 11: 前線の通過と天気の予想', minutes: 6, concepts: ['we-front', 'we-japan'],
    lessons: [
      {
        id: 'weather-mp11-c1',
        text: '寒冷前線が通過すると、気温が急に下がり、風向は南寄りから北寄りに変わります。通過するときは、強い雨が短時間降ることが多いです。温暖前線が通過すると、気温が上がり、風向は南寄りに変わります。',
        figure: scene(passageItems(false).concat([
          { type: 'line', points: [[157, 40], [157, 186]], color: 'blue', width: 2, dashed: true },
          { type: 'text', x: 162, y: 54, text: '寒冷前線が通過', size: 12, bg: true },
          { type: 'text', x: 230, y: 120, text: '気温が急に下がる', size: 12, anchor: 'middle', bg: true },
        ])),
      },
      {
        id: 'weather-mp11-c2',
        text: '中緯度で発生し、寒冷前線と温暖前線をともなう低気圧を**温帯低気圧**といいます。中心から南西へ寒冷前線、南東へ温暖前線がのび、2 つの前線のあいだの地表は暖気におおわれます。**偏西風**によって西から東へ移動します。',
        figure: scene(lowFrontItems(false).concat([
          { type: 'text', x: 236, y: 92, text: '温暖前線', size: 12, bg: true },
          { type: 'text', x: 44, y: 150, text: '寒冷前線', size: 12, bg: true },
          { type: 'text', x: 176, y: 182, text: '暖気', size: 14, bold: true },
          { type: 'arrow', x1: 150, y1: 30, x2: 210, y2: 30, color: 'gray', label: '西から東へ移動' },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp11-w1', concept: 'we-front',
      prompt: '予想しよう。寒冷前線が通過したあと、気温はどうなると思う？',
      options: ['下がる', '上がる', '変わらない'],
      answer: 'a',
      explanation: '寒冷前線が通過すると、その地点は寒気におおわれるので、気温が下がります。このステージで、気象データから前線の通過を読みとろう。',
      hint: '寒冷前線の後ろには、どんな空気があるかな。',
    }),
    problems: [
      choice({
        id: 'weather-mp11-t1', concept: 'we-front', term: true,
        prompt: '次の説明に合う言葉はどれ？「中緯度で発生し、寒冷前線と温暖前線をともなう低気圧」',
        options: ['温帯低気圧', '熱帯低気圧', '移動性高気圧'],
        answer: 'a',
        explanation: '日本付近を通る、寒冷前線と温暖前線をともなう低気圧を**温帯低気圧**といいます。',
        hint: '中緯度は、熱帯と寒帯のあいだの「温帯」だね。',
      }),
      figureChoice({
        id: 'weather-mp11-p1', concept: 'we-front',
        prompt: 'ある地点で、10〜19 時の気温と風向を記録しました。前線が通過したのは、下のア（10〜11 時）・イ（12〜13 時）・ウ（14〜15 時）・エ（16〜17 時）・オ（18〜19 時）のどの時間帯？',
        figure: scene(passageItems(true)),
        answer: 'r3',
        explanation: '14 時から 15 時のあいだに、気温が急に下がり、風向が南西から北西に変わっています。このとき前線が通過しました（ウ）。',
        hint: '気温が急に変わったところと、風向が変わったところをさがそう。',
      }),
      choice({
        id: 'weather-mp11-p2', concept: 'we-front',
        prompt: 'グラフの地点を通過した前線は何？',
        figure: scene(passageItems(false)),
        options: ['寒冷前線', '温暖前線', '停滞前線'],
        answer: 'a',
        explanation: '気温が急に下がり、風向が南寄りから北寄りに変わっているので、寒冷前線が通過したと分かります。',
        hint: '通過のあと、気温は上がったかな、下がったかな。',
      }),
      choice({
        id: 'weather-mp11-p3', concept: 'we-front',
        prompt: 'グラフの地点を通過したのが寒冷前線だと考えられる理由を 2 つ合わせたものはどれ？',
        figure: scene(passageItems(false)),
        options: ['気温が急に下がった・風向が北寄りに変わった', '気温が急に上がった・風向が南寄りに変わった', '気温が変わらなかった・風がやんだ'],
        answer: 'a',
        explanation: '寒冷前線が通過すると、寒気におおわれるので気温が急に下がり、風向は北寄りに変わります。グラフの 14〜15 時にこの変化があります。',
        hint: '気温の変化と、風向の変化の両方を見よう。',
      }),
      figureChoice({
        id: 'weather-mp11-p4', concept: 'we-front',
        prompt: '低気圧 O から 2 本の前線 OA・OB がのびています。ア（OA）とイ（OB）のうち、温暖前線はどちら？',
        figure: scene(lowFrontItems(false).concat([region('r1', 236, 102, 'ア'), region('r2', 70, 150, 'イ')])),
        answer: 'r1',
        explanation: '赤い線に半円の記号がついた OA（ア）が温暖前線です。温帯低気圧の中心から南東へのびます。OB（イ）は青い線に三角の記号の寒冷前線です。',
        hint: '温暖前線の記号は、半円だよ。',
      }),
      choice({
        id: 'weather-mp11-p5', concept: 'we-japan',
        prompt: '4 月 1 日から 2 日にかけて、日本付近の低気圧はどの方角からどの方角へ移動することが多い？',
        options: ['西から東へ', '東から西へ', '北から南へ'],
        answer: 'a',
        explanation: '日本付近の上空には偏西風が西から東へふいているので、低気圧や高気圧は西から東へ移動します。',
        hint: '日本付近の上空にふいている風の名前を思い出そう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'weather-mp11-r1', concept: 'we-front',
        prompt: '低気圧 O から 2 本の前線 OA・OB がのびています。ア（OA）とイ（OB）のうち、寒冷前線はどちら？',
        figure: scene(lowFrontItems(false).concat([region('r1', 236, 102, 'ア'), region('r2', 70, 150, 'イ')])),
        answer: 'r2',
        explanation: '青い線に三角の記号がついた OB（イ）が寒冷前線です。温帯低気圧の中心から南西へのびます。',
        hint: '寒冷前線の記号は、三角だよ。',
      }),
      choice({
        id: 'weather-mp11-r2', concept: 'we-front',
        prompt: '図の X–Y の線にそって、地表付近の空気を西（X）から東（Y）へ調べます。寒冷前線 OB と温暖前線 OA のあいだの地表付近にある空気はどれ？',
        figure: scene(lowFrontItems(true)),
        options: ['暖気', '寒気', '寒気と暖気が混ざった空気'],
        answer: 'a',
        explanation: '温帯低気圧では、寒冷前線と温暖前線のあいだの地表付近は暖気におおわれています。寒冷前線の西側と、温暖前線の東側は寒気です。',
        hint: '寒冷前線は暖気をおし、温暖前線は暖気がおしているね。',
      }),
      choice({
        id: 'weather-mp11-r3', concept: 'we-front',
        prompt: 'ある地点を温暖前線が通過しました。通過したあとの変化として正しいものはどれ？',
        options: ['気温が上がり、風向は南寄りになる', '気温が下がり、風向は北寄りになる', '気温も風向も変わらない'],
        answer: 'a',
        explanation: '温暖前線が通過すると、その地点は暖気におおわれるので、気温が上がり、風向は南寄りになります。',
        hint: '温暖前線の後ろには、どんな空気があるかな。',
      }),
      choice({
        id: 'weather-mp11-r4', concept: 'we-japan',
        prompt: '日本付近で、低気圧が西から東へ移動していくのはなぜ？',
        options: ['上空に偏西風がふいているから', '地表で季節風がふいているから', '海流が西から東へ流れているから'],
        answer: 'a',
        explanation: '日本付近の上空には、西から東へ偏西風がふいています。低気圧や高気圧はこの風に流されて、西から東へ移動します。',
        hint: '「西」からふく風の名前だよ。',
      }),
      choice({
        id: 'weather-mp11-r5', concept: 'we-japan',
        prompt: '4 月 2 日、新潟県の西の日本海に低気圧があり、東へ進んでいます。4 月 3 日の新潟市の天気はどうなると予想できる？',
        options: ['低気圧が近づくので、くもりや雨になる', '低気圧が遠ざかるので、晴れる', '低気圧とは関係なく、晴れたままになる'],
        answer: 'a',
        explanation: '低気圧は西から東へ移動するので、新潟県に近づいてきます。低気圧の中心付近や前線の近くでは雲ができやすいので、くもりや雨になると予想できます。',
        hint: '低気圧が進む向きと、新潟県の位置を考えよう。',
      }),
      choice({
        id: 'weather-mp11-r6', concept: 'we-japan',
        prompt: 'ある日の天気図を見て、各地の天気を予想します。前線や低気圧の中心の近くにある地点の天気は、どうなっていることが多い？',
        options: ['雨やくもり', '快晴', '晴れて乾燥している'],
        answer: 'a',
        explanation: '前線の付近や低気圧の中心付近では上昇気流が生じて雲ができやすいので、雨やくもりの地点が多くなります。高気圧におおわれた地点は晴れることが多いです。',
        hint: '上昇気流が生じやすいのはどこかな。',
      }),
    ],
  };

  // ---- ステージ weather-mp12: 冬と夏の天気 ----
  // 冬の断面に、山にぶつかって上昇する気流 A と、山をこえて下降する気流 B をかく
  function winterFlowItems(withRegions) {
    const items = winterSectionBase().concat([
      { type: 'ellipse', x: 206, y: 84, rx: 36, ry: 16, fill: 'white', stroke: 'gray' },
      { type: 'arrow', x1: 186, y1: 164, x2: 218, y2: 108, color: 'orange' },
      { type: 'arrow', x1: 252, y1: 108, x2: 276, y2: 160, color: 'orange' },
    ]);
    if (withRegions) items.push(region('r1', 178, 124, 'ア'), region('r2', 290, 124, 'イ'));
    else items.push({ type: 'text', x: 182, y: 130, text: 'A', size: 15, bold: true, anchor: 'end' }, { type: 'text', x: 284, y: 130, text: 'B', size: 15, bold: true });
    return items;
  }

  const weatherMp12 = {
    id: 'weather-mp12', areaId: 'we-miniprint', title: 'プリント 12: 冬と夏の天気', minutes: 5, concepts: ['we-japan'],
    lessons: [
      {
        id: 'weather-mp12-c1',
        text: '冬は、大陸で冷たく乾いたシベリア気団が発達し、**西高東低**の気圧配置になります。北西の季節風は日本海の上で水蒸気をふくみ、山にぶつかって**上昇気流**となって日本海側に雪を降らせます。山をこえた乾いた風が下りる太平洋側は晴れます。',
        figure: scene(winterFlowItems(false).concat([
          { type: 'text', x: 160, y: 40, text: 'A 上昇気流 → 雪', size: 12, bg: true },
          { type: 'text', x: 316, y: 60, text: 'B 下降気流', size: 12, anchor: 'end', bg: true },
          { type: 'text', x: 316, y: 78, text: '→ 晴れ', size: 12, anchor: 'end', bg: true },
        ])),
      },
      {
        id: 'weather-mp12-c2',
        text: '夏は、日本の南東に**太平洋高気圧**が発達し、暖かくしめった**小笠原気団**におおわれます。南東の季節風がふき、晴れて蒸し暑い日が続きます。太平洋高気圧は、小笠原気団と同じ性質をもちます。',
        figure: scene(japanSmall().concat([
          { type: 'ellipse', x: 270, y: 210, rx: 40, ry: 28, fill: 'none' },
          { type: 'ellipse', x: 270, y: 210, rx: 72, ry: 52, fill: 'none' },
          { type: 'text', x: 270, y: 217, text: '高', size: 20, anchor: 'middle', bold: true },
          { type: 'arrow', x1: 230, y1: 176, x2: 196, y2: 148, color: 'blue', width: 4 },
          { type: 'text', x: 316, y: 20, text: '太平洋高気圧（小笠原気団）', size: 12, anchor: 'end', bg: true },
          { type: 'text', x: 6, y: 236, text: '南東の季節風・晴れて蒸し暑い', size: 12, bg: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp12-w1', concept: 'we-japan',
      prompt: '予想しよう。冬に新潟県で雪が降っている日、東京の天気はどうなっていることが多いと思う？',
      options: ['晴れ', '大雪', '雨'],
      answer: 'a',
      explanation: '日本海側に雪を降らせた空気は、山をこえると乾いた風になります。だから太平洋側の東京は晴れることが多いです。',
      hint: '山をこえた風には、水蒸気が多く残っているかな。',
    }),
    problems: [
      fill({
        id: 'weather-mp12-t1', concept: 'we-japan', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '夏には、日本の南東に[b1]が発達し、日本は暖かくしめった[b2]におおわれる。',
        blanks: [
          word('b1', ['太平洋高気圧', 'オホーツク海高気圧', '移動性高気圧'], '太平洋高気圧'),
          word('b2', ['小笠原気団', 'シベリア気団', 'オホーツク海気団'], '小笠原気団'),
        ],
        explanation: '夏は**太平洋高気圧**が発達し、同じ性質の**小笠原気団**が日本をおおうので、晴れて蒸し暑くなります。',
        hint: '日本の南東にある海の名前と島の名前だよ。',
      }),
      figureChoice({
        id: 'weather-mp12-p1', concept: 'we-japan',
        prompt: '冬の日本付近の断面です。北西の季節風が日本海をわたって山にぶつかります。上昇気流が生じているのは、ア・イのどちら？',
        figure: scene(winterFlowItems(true)),
        answer: 'r1',
        explanation: '季節風が山にぶつかって斜面を上がる日本海側のアで、上昇気流が生じます。空気は膨張して温度が下がり、雲ができて雪を降らせます。イは山をこえて下りる下降気流です。',
        hint: '風が山の斜面を上がっていくのはどちら側かな。',
      }),
      choice({
        id: 'weather-mp12-p2', concept: 'we-japan',
        prompt: '冬、新潟県で雪が降っているとき、東京の天気はどうなっていることが多い？',
        options: ['晴れ', '雪', '雨'],
        answer: 'a',
        explanation: '日本海側で雪を降らせた空気は、山をこえると水蒸気が少なくなっています。乾いた風がふき下りるので、太平洋側の東京は晴れることが多いです。',
        hint: '山をこえた空気は、乾いているかな、しめっているかな。',
      }),
      choice({
        id: 'weather-mp12-p3', concept: 'we-japan',
        prompt: 'シベリア気団は冷たく乾いています。冬に日本海側に雪を降らせる水は、どこから来た？',
        options: ['日本海', '太平洋', 'シベリアの川や湖'],
        answer: 'a',
        explanation: '冷たく乾いた北西の季節風は、比べると暖かい日本海の上をわたるときに、海面から蒸発した水蒸気をたくさんふくみます。この水蒸気が雪になります。',
        hint: '大陸から日本に来るまでに、風は何の上を通るかな。',
      }),
      choice({
        id: 'weather-mp12-p4', concept: 'we-japan',
        prompt: '夏の日本の天気の特徴として正しいものはどれ？',
        options: ['晴れて、気温も湿度も高い', 'くもりで、気温が低く乾燥している', '雪が多く、気温が低い'],
        answer: 'a',
        explanation: '夏は暖かくしめった小笠原気団におおわれるので、晴れて気温が高く、湿度も高い（蒸し暑い）日が続きます。',
        hint: '小笠原気団の性質を思い出そう。',
      }),
      choice({
        id: 'weather-mp12-p5', concept: 'we-japan',
        prompt: '夏にふく季節風の風向はどれ？',
        options: ['南東（または南）', '北西', '北東'],
        answer: 'a',
        explanation: '夏は南東の太平洋高気圧から、南東（または南）の季節風がふきます。冬は北西の季節風です。',
        hint: '夏に発達する高気圧は、日本のどちらの方角にあるかな。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-mp12-r1', concept: 'we-japan',
        prompt: '冬の天気図によく見られる、西に高気圧、東に低気圧がある気圧配置を、漢字 4 字で何という？',
        options: ['西高東低', '南高北低', '東高西低'],
        answer: 'a',
        explanation: '西（大陸）に高気圧、東（太平洋）に低気圧がある冬の気圧配置を**西高東低**といいます。',
        hint: '西が高く、東が低いよ。',
      }),
      choice({
        id: 'weather-mp12-r2', concept: 'we-japan',
        prompt: '冬の日本の天気に影響をあたえる気団はどれ？',
        options: ['シベリア気団', '小笠原気団', 'オホーツク海気団'],
        answer: 'a',
        explanation: '冬は大陸で冷たく乾いたシベリア気団が発達し、日本に北西の季節風をふかせます。',
        hint: '冬に発達する、大陸の冷たい気団だよ。',
      }),
      figureChoice({
        id: 'weather-mp12-r3', concept: 'we-japan',
        prompt: '日本付近の地図に、2 本の風の矢印があります（ア 南東からふく、イ 北西からふく）。冬の季節風を表しているのはどちら？',
        figure: monsoonFigure(['se', 'nw']),
        answer: 'r2',
        explanation: '冬は大陸のシベリア気団（高気圧）から、北西の季節風がふきます（イ）。アの南東の風は夏の季節風です。',
        hint: '冬の高気圧は、日本の北西の大陸にあるよ。',
      }),
      choice({
        id: 'weather-mp12-r4', concept: 'we-japan',
        prompt: '冬の季節風が山にぶつかって上昇すると、雲ができやすいのはなぜ？',
        options: ['空気が上昇すると膨張して温度が下がり、露点に達しやすいから', '空気が上昇すると縮んで温度が上がるから', '山の上は気圧が高いから'],
        answer: 'a',
        explanation: '上昇した空気は、まわりの気圧が低いので膨張し、温度が下がります。温度が露点まで下がると、水蒸気が水滴や氷の粒になって雲ができます。',
        hint: '雲のでき方を思い出そう。',
      }),
      figureChoice({
        id: 'weather-mp12-r5', concept: 'we-japan',
        prompt: '冬の日本付近の断面です。山をこえた空気が下りていく、下降気流が生じているのは、ア・イのどちら？',
        figure: scene(winterFlowItems(true)),
        answer: 'r2',
        explanation: '山をこえた空気は、太平洋側の斜面を下りていきます（イ）。下降する空気は温度が上がり、雲が消えるので、太平洋側は晴れます。',
        hint: '風が山の斜面を下りていくのはどちら側かな。',
      }),
    ],
  };

  // ---- ステージ weather-mp13: 春・梅雨・台風と季節の天気図 ----
  // 春の 3 日間の天気図の 1 まい（x0 は左はし）。day 1 高気圧が大陸（西）、2 日本の上、3 日本の東（西から低気圧）
  function springPanel(x0, day, title) {
    const items = [
      { type: 'rect', x: x0, y: 30, width: 100, height: 170, fill: 'white', stroke: 'line' },
      { type: 'line', points: [[x0 + 42, 180], [x0 + 58, 140], [x0 + 66, 100], [x0 + 80, 66]], color: 'green', width: 6 },
      { type: 'text', x: x0 + 50, y: 22, text: title, size: 13, anchor: 'middle', bold: true },
    ];
    const H = { 1: [x0 + 18, 120], 2: [x0 + 58, 120], 3: [x0 + 82, 124] }[day];
    items.push({ type: 'circle', x: H[0], y: H[1] - 6, r: 15, fill: 'none', stroke: 'gray' });
    items.push({ type: 'text', x: H[0], y: H[1], text: '高', size: 16, anchor: 'middle', bold: true });
    const L = { 1: [x0 + 80, 166], 2: [x0 + 88, 52], 3: [x0 + 18, 90] }[day];
    items.push({ type: 'text', x: L[0], y: L[1], text: '低', size: 16, anchor: 'middle', bold: true });
    return items;
  }
  // ア 2 日目、イ 3 日目、ウ 1 日目（日付の順はウ → ア → イ）
  function springFigure() {
    return scene([...springPanel(6, 2, 'ア'), ...springPanel(110, 3, 'イ'), ...springPanel(214, 1, 'ウ'),
      { type: 'text', x: 160, y: 226, text: '緑の線は日本列島。上が北', size: 12, anchor: 'middle' }]);
  }

  // 4 つの季節の天気図（簡略。ア 梅雨、イ 春、ウ 夏、エ 冬）
  function seasonPanel(x0, y0, kind) {
    const items = [
      { type: 'rect', x: x0, y: y0, width: 152, height: 112, fill: 'white', stroke: 'line' },
      { type: 'line', points: [[x0 + 45, y0 + 100], [x0 + 70, y0 + 72], [x0 + 85, y0 + 42], [x0 + 100, y0 + 18]], color: 'green', width: 5 },
    ];
    const t = (x, y, s) => items.push({ type: 'text', x: x0 + x, y: y0 + y, text: s, size: 16, anchor: 'middle', bold: true });
    if (kind === 'tsuyu') {
      items.push(...frontItems([[x0 + 8, y0 + 64], [x0 + 148, y0 + 44]], 'stationary', 1));
      t(122, 26, '高'); t(118, 100, '高');
    } else if (kind === 'spring') {
      items.push({ type: 'circle', x: x0 + 60, y: y0 + 54, r: 18, fill: 'none', stroke: 'gray' });
      items.push({ type: 'circle', x: x0 + 128, y: y0 + 40, r: 14, fill: 'none', stroke: 'gray' });
      t(60, 60, '高'); t(128, 46, '低');
    } else if (kind === 'summer') {
      items.push({ type: 'circle', x: x0 + 112, y: y0 + 78, r: 18, fill: 'none', stroke: 'gray' });
      items.push({ type: 'circle', x: x0 + 112, y: y0 + 78, r: 30, fill: 'none', stroke: 'gray' });
      t(112, 84, '高'); t(32, 34, '低');
    } else {
      [60, 74, 88, 102].forEach(x => items.push({ type: 'line', points: [[x0 + x, y0 + 10], [x0 + x - 6, y0 + 56], [x0 + x, y0 + 104]], color: 'gray', width: 2 }));
      t(28, 50, '高'); t(130, 50, '低');
    }
    return items;
  }
  function seasonFigure() {
    return scene([
      ...seasonPanel(4, 4, 'tsuyu'), ...seasonPanel(164, 4, 'spring'), ...seasonPanel(4, 124, 'summer'), ...seasonPanel(164, 124, 'winter'),
      region('r1', 26, 94, 'ア'), region('r2', 186, 94, 'イ'), region('r3', 26, 214, 'ウ'), region('r4', 186, 214, 'エ'),
    ]);
  }

  // 梅雨の時期の天気図（停滞前線と 2 つの高気圧 X・Y）
  function tsuyuMapItems() {
    return japanSmall().concat(frontItems([[60, 196], [150, 182], [230, 150], [312, 120]], 'stationary', 1), [
      { type: 'text', x: 280, y: 52, text: '高', size: 20, anchor: 'middle', bold: true },
      { type: 'text', x: 300, y: 34, text: 'X', size: 15, bold: true },
      { type: 'text', x: 240, y: 222, text: '高', size: 20, anchor: 'middle', bold: true },
      { type: 'text', x: 260, y: 206, text: 'Y', size: 15, bold: true },
    ]);
  }

  const weatherMp13 = {
    id: 'weather-mp13', areaId: 'we-miniprint', title: 'プリント 13: 春・梅雨・台風と季節の天気図', minutes: 6, concepts: ['we-japan'],
    lessons: [
      {
        id: 'weather-mp13-c1',
        text: '春と秋は、大陸から**移動性高気圧**と低気圧が交互にやってきて、偏西風によって西から東へ移動します。そのため天気は数日の周期で変わります。移動性高気圧は、大陸の暖かく乾いた揚子江気団の一部が移ってきたものです。',
        figure: scene([...springPanel(6, 1, '1 日目'), ...springPanel(110, 2, '2 日目'), ...springPanel(214, 3, '3 日目'),
          { type: 'text', x: 160, y: 226, text: '高気圧も低気圧も西から東へ', size: 12, anchor: 'middle' }]),
      },
      {
        id: 'weather-mp13-c2',
        text: '6〜7 月ごろ、北の**オホーツク海高気圧**と南の太平洋高気圧の勢力がつり合い、あいだに停滞前線ができます。この時期の停滞前線を**梅雨前線**といい、雨の日が何日も続きます。',
        figure: scene(tsuyuMapItems().concat([
          { type: 'text', x: 316, y: 76, text: 'オホーツク海高気圧', size: 12, anchor: 'end', bg: true },
          { type: 'text', x: 180, y: 236, text: '太平洋高気圧', size: 12, anchor: 'end', bg: true },
          { type: 'text', x: 60, y: 176, text: '梅雨前線', size: 12, bg: true },
        ])),
      },
      {
        id: 'weather-mp13-c3',
        text: '熱帯の海上で発生した**熱帯低気圧**のうち、最大風速が秒速 17.2 m 以上になったものを**台風**といいます。台風は夏から秋に日本に近づき、北上すると偏西風の影響で、進路を東寄りに変えることが多いです。',
        figure: scene(japanSmall().concat([
          { type: 'line', points: [[150, 238], [140, 208], [152, 182], [196, 150], [252, 120], [304, 100]], color: 'red', width: 3, dashed: true, arrow: true },
          { type: 'circle', x: 140, y: 208, r: 12, fill: 'white', stroke: 'red' },
          { type: 'text', x: 6, y: 236, text: '台風の進路の例', size: 12, bg: true },
          { type: 'text', x: 316, y: 70, text: '北上すると東寄りに', size: 12, anchor: 'end', bg: true },
        ])),
      },
    ],
    warmup: choice({
      id: 'weather-mp13-w1', concept: 'we-japan',
      prompt: '予想しよう。春に「晴れ → 雨 → 晴れ」と天気が数日ごとに変わりやすいのは、なぜだと思う？',
      options: ['高気圧と低気圧が交互に通るから', '1 つの高気圧がずっと動かないから', '季節風が毎日向きを変えるから'],
      answer: 'a',
      explanation: '春は移動性高気圧と低気圧が交互に西から東へ通るので、天気が数日の周期で変わります。',
      hint: '高気圧の下では晴れ、低気圧の下では雨になりやすいね。',
    }),
    problems: [
      fill({
        id: 'weather-mp13-t1', concept: 'we-japan', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '春や秋に大陸から移動してくる高気圧を[b1]という。6〜7 月ごろにできる停滞前線を、とくに[b2]という。',
        blanks: [
          word('b1', ['移動性高気圧', '太平洋高気圧', 'オホーツク海高気圧'], '移動性高気圧'),
          word('b2', ['梅雨前線', '寒冷前線', '閉そく前線'], '梅雨前線'),
        ],
        explanation: '春や秋に西から移動してくる高気圧を**移動性高気圧**、6〜7 月ごろの停滞前線を**梅雨前線**といいます。',
        hint: '「移動」する高気圧と、「梅雨」の前線だよ。',
      }),
      figureChoice({
        id: 'weather-mp13-p1', concept: 'we-japan',
        prompt: 'ア〜エは、春・夏・冬・梅雨のどれかの天気図を簡単にかいたものです（緑の線は日本列島、上が北）。冬の天気図はどれ？',
        figure: seasonFigure(),
        answer: 'r4',
        explanation: '西に高気圧、東に低気圧があり、たての等圧線がせまい間隔でならぶエが冬（西高東低）の天気図です。',
        hint: '西に「高」、東に「低」がある図をさがそう。',
      }),
      choice({
        id: 'weather-mp13-p2', concept: 'we-japan',
        prompt: '春の、連続した 3 日間の天気図ア〜ウです。日付の順にならべたものはどれ？',
        figure: springFigure(),
        options: ['ウ → ア → イ', 'ア → イ → ウ', 'イ → ア → ウ'],
        answer: 'a',
        explanation: '高気圧は西から東へ移動します。高気圧が大陸（西）にあるウ、日本の上にあるア、日本の東にあるイの順です。',
        hint: '「高」の位置が、西から東へ動いていく順を考えよう。',
      }),
      choice({
        id: 'weather-mp13-p3', concept: 'we-japan',
        prompt: '移動性高気圧のもとになる、大陸の揚子江気団の気温と湿度の性質はどれ？',
        options: ['暖かく乾いている', '冷たくしめっている', '暖かくしめっている'],
        answer: 'a',
        explanation: '揚子江気団は大陸の南のほうでできる気団なので、暖かく乾いています。',
        hint: '南の大陸の上でできる気団だよ。',
      }),
      choice({
        id: 'weather-mp13-p4', concept: 'we-japan',
        prompt: '6 月末の天気図です。停滞前線の北の高気圧 X と南の高気圧 Y の名前の組み合わせはどれ？',
        figure: scene(tsuyuMapItems()),
        options: ['X オホーツク海高気圧、Y 太平洋高気圧', 'X 太平洋高気圧、Y オホーツク海高気圧', 'X シベリア高気圧、Y 移動性高気圧'],
        answer: 'a',
        explanation: '梅雨の時期は、北のオホーツク海高気圧（X）と南の太平洋高気圧（Y）の勢力がつり合って、あいだに停滞前線ができます。',
        hint: '北の冷たい海の高気圧と、南の大きな海の高気圧だよ。',
      }),
      choice({
        id: 'weather-mp13-p5', concept: 'we-japan',
        prompt: '「台風」とはどのようなものか、正しいものはどれ？',
        options: ['熱帯低気圧のうち、最大風速が秒速 17.2 m 以上になったもの', '温帯低気圧のうち、前線をもつもの', '大陸から移動してくる、強い高気圧'],
        answer: 'a',
        explanation: '熱帯の海上で発生した熱帯低気圧のうち、最大風速が秒速 17.2 m 以上に発達したものを台風といいます。',
        hint: '熱帯の海で生まれる低気圧だよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'weather-mp13-r1', concept: 'we-japan',
        prompt: 'ア〜エは、春・夏・冬・梅雨のどれかの天気図を簡単にかいたものです（緑の線は日本列島、上が北）。夏の天気図はどれ？',
        figure: seasonFigure(),
        answer: 'r3',
        explanation: '南東に大きな高気圧（太平洋高気圧）があり、北に低気圧があるウが夏の天気図です（南高北低）。',
        hint: '南東に「高」がある図をさがそう。',
      }),
      figureChoice({
        id: 'weather-mp13-r2', concept: 'we-japan',
        prompt: 'ア〜エは、春・夏・冬・梅雨のどれかの天気図を簡単にかいたものです（緑の線は日本列島、上が北）。梅雨の天気図はどれ？',
        figure: seasonFigure(),
        answer: 'r1',
        explanation: '日本列島にそって停滞前線がのび、その北と南に高気圧があるアが梅雨の天気図です。',
        hint: '停滞前線の記号がある図をさがそう。',
      }),
      choice({
        id: 'weather-mp13-r3', concept: 'we-japan',
        prompt: '梅雨の時期の日本の天気の特徴として正しいものはどれ？',
        options: ['雨の日が何日も続く', '晴れて乾燥した日が続く', '雪の日が多い'],
        answer: 'a',
        explanation: '梅雨前線（停滞前線）がほとんど動かずに日本付近にとどまるので、雨やくもりの日が何日も続きます。',
        hint: '停滞前線は、あまり動かない前線だったね。',
      }),
      choice({
        id: 'weather-mp13-r4', concept: 'we-japan',
        prompt: '日本付近まで北上した台風が、急に進路を東寄りに変えることが多いのは、何の影響？',
        options: ['偏西風', '季節風', '海陸風'],
        answer: 'a',
        explanation: '日本付近の上空には偏西風が西から東へふいているので、北上してきた台風はこの風に流されて、進路を東寄りに変えます。',
        hint: '上空を西から東へふく風だよ。',
      }),
      choice({
        id: 'weather-mp13-r5', concept: 'we-japan',
        prompt: '新潟県に台風が近づく回数は、九州・沖縄や太平洋側とくらべてどうかな？',
        options: ['少ない', '多い', 'ほとんど同じ'],
        answer: 'a',
        explanation: '台風は南の海で発生し、北へ進みながら日本に近づくので、九州・沖縄や太平洋側に近づく回数が多くなります。日本海側の新潟県は、それとくらべると近づく回数は少ないです。ただし、台風が近づいたときは大雨や強風に注意が必要です。',
        hint: '台風はどちらの方角から日本に近づいてくるかな。',
      }),
      choice({
        id: 'weather-mp13-r6', concept: 'we-japan',
        prompt: '春の天気は、どの方角からどの方角へ変わっていくことが多い？',
        options: ['西から東へ', '東から西へ', '南から北へ'],
        answer: 'a',
        explanation: '移動性高気圧や低気圧が偏西風によって西から東へ移動するので、天気も西から東へ変わっていきます。',
        hint: '偏西風のふく向きを思い出そう。',
      }),
      choice({
        id: 'weather-mp13-r7', concept: 'we-japan',
        prompt: '6 月末の天気図で、日本列島にそってのびている前線は何前線？',
        figure: scene(tsuyuMapItems()),
        options: ['停滞前線', '寒冷前線', '温暖前線'],
        answer: 'a',
        explanation: '三角と半円が反対側に交互についた記号は停滞前線です。この時期の停滞前線を梅雨前線といいます。',
        hint: '三角と半円が線の反対側にある記号だよ。',
      }),
      choice({
        id: 'weather-mp13-r8', concept: 'we-japan',
        prompt: '台風が日本に上陸することが多い時期はどれ？',
        options: ['夏から秋', '春から夏', '秋から冬', '冬から春'],
        answer: 'a',
        explanation: '台風は夏から秋（とくに 8〜9 月）に日本に近づき、上陸することが多いです。',
        hint: '台風のニュースが多い季節を思い出そう。',
      }),
    ],
  };

  // ---- ステージ weather-mp14: 海陸風・偏西風と気象の恵み・災害 ----
  // 海に面した地域の風（左 ア: 海から陸へ、右 イ: 陸から海へ）。titles が true なら下に「昼」「夜」を書く
  function breezeItems(titles) {
    const items = [];
    [[5, true], [165, false]].forEach(([x0, seaToLand]) => {
      items.push(
        { type: 'rect', x: x0, y: 120, width: 75, height: 80, fill: '#9CC3F0', stroke: 'none' },
        { type: 'rect', x: x0 + 75, y: 110, width: 75, height: 90, fill: 'sand', stroke: 'none' },
        { type: 'text', x: x0 + 38, y: 170, text: '海', size: 14, anchor: 'middle' },
        { type: 'text', x: x0 + 112, y: 170, text: '陸', size: 14, anchor: 'middle' },
      );
      if (seaToLand) {
        items.push({ type: 'arrow', x1: x0 + 18, y1: 98, x2: x0 + 128, y2: 98, color: 'blue' });
        items.push({ type: 'arrow', x1: x0 + 128, y1: 46, x2: x0 + 18, y2: 46, color: 'gray', width: 2 });
      } else {
        items.push({ type: 'arrow', x1: x0 + 132, y1: 98, x2: x0 + 22, y2: 98, color: 'blue' });
        items.push({ type: 'arrow', x1: x0 + 22, y1: 46, x2: x0 + 132, y2: 46, color: 'gray', width: 2 });
      }
    });
    if (titles) {
      items.push({ type: 'text', x: 80, y: 224, text: '昼: 海風（海 → 陸）', size: 13, anchor: 'middle', bold: true });
      items.push({ type: 'text', x: 240, y: 224, text: '夜: 陸風（陸 → 海）', size: 13, anchor: 'middle', bold: true });
    }
    return items;
  }

  // 地球規模の大気の動き（左が赤道、右が北極側）。X は中緯度から高緯度へふく風
  function globalWindItems() {
    return [
      { type: 'line', points: [[20, 190], [304, 190]], color: 'brown', width: 3 },
      { type: 'arrow', x1: 50, y1: 180, x2: 50, y2: 60, color: 'orange' },
      { type: 'arrow', x1: 58, y1: 50, x2: 122, y2: 50, color: 'gray', width: 2 },
      { type: 'arrow', x1: 130, y1: 60, x2: 130, y2: 176, color: 'blue' },
      { type: 'arrow', x1: 122, y1: 178, x2: 60, y2: 178, color: 'gray', width: 2 },
      { type: 'arrow', x1: 140, y1: 172, x2: 270, y2: 172, color: 'blue', width: 4 },
      { type: 'text', x: 50, y: 210, text: '赤道', size: 13, anchor: 'middle' },
      { type: 'text', x: 130, y: 210, text: '中緯度', size: 13, anchor: 'middle' },
      { type: 'text', x: 290, y: 210, text: '高緯度', size: 13, anchor: 'middle' },
      { type: 'text', x: 205, y: 160, text: 'X', size: 16, anchor: 'middle', bold: true },
    ];
  }

  const weatherMp14 = {
    id: 'weather-mp14', areaId: 'we-miniprint', title: 'プリント 14: 地球規模の風と気象の恵み・災害', minutes: 6, concepts: ['we-wind', 'we-disaster'],
    lessons: [
      {
        id: 'weather-mp14-c1',
        text: '海に面した地域では、昼は陸が海よりあたたまりやすく、陸で上昇気流が生じるので、海から陸へ海風がふきます。夜は陸が冷えやすいので、陸から海へ陸風がふきます。これらを**海陸風**といいます。季節ごとにふく**季節風**も同じしくみです。',
        figure: scene(breezeItems(true)),
      },
      {
        id: 'weather-mp14-c2',
        text: '赤道付近はよくあたためられて上昇気流が生じ、気圧が低くなります。上昇した空気は中緯度で下降し、そこは気圧が高くなります。そこから高緯度へふく風は、地球の自転の影響で右にずれて西風になります。これが**偏西風**です。',
        figure: scene(globalWindItems().concat([
          { type: 'text', x: 56, y: 110, text: '上昇（気圧が低い）', size: 12, bg: true },
          { type: 'text', x: 136, y: 140, text: '下降（気圧が高い）', size: 12, bg: true },
          { type: 'text', x: 262, y: 158, text: '偏西風', size: 13, bold: true, bg: true },
        ])),
      },
      {
        id: 'weather-mp14-c3',
        text: '日本は降水量が多く、雨や雪は農業用水・工業用水・生活用水に使われます。一方で、せまい範囲の大雨（**集中豪雨**）は洪水や土砂くずれを、台風は強風や高潮を起こします。積乱雲の下では、激しいうず巻き状の風の**竜巻**が起こることもあります。',
        figure: scene([
          { type: 'rect', x: 10, y: 40, width: 145, height: 170, fill: '#E8F4FF' },
          { type: 'rect', x: 165, y: 40, width: 145, height: 170, fill: '#FFF1E6' },
          { type: 'text', x: 82, y: 66, text: '恵み', size: 16, anchor: 'middle', bold: true },
          { type: 'text', x: 237, y: 66, text: '災害', size: 16, anchor: 'middle', bold: true },
          ...['農業用水', '工業用水', '生活用水', '雪どけ水'].map((s, i) => ({ type: 'text', x: 82, y: 100 + 28 * i, text: s, size: 13, anchor: 'middle' })),
          ...['集中豪雨', '台風（強風・高潮）', '竜巻', '大雪'].map((s, i) => ({ type: 'text', x: 237, y: 100 + 28 * i, text: s, size: 13, anchor: 'middle' })),
        ]),
      },
    ],
    warmup: choice({
      id: 'weather-mp14-w1', concept: 'we-wind',
      prompt: '予想しよう。よく晴れた日の昼、砂浜の砂と海の水では、あたたまりやすいのはどちらだと思う？',
      options: ['砂浜の砂（陸）', '海の水', 'どちらも同じ'],
      answer: 'a',
      explanation: '陸（砂や土）は海の水よりあたたまりやすく、冷えやすい性質があります。このちがいで、海と陸のあいだに風がふきます。',
      hint: '夏の砂浜で、はだしで歩いたときを思い出そう。',
    }),
    problems: [
      fill({
        id: 'weather-mp14-t1', concept: 'we-wind', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '海に面した地域で、昼と夜で向きが変わってふく風をまとめて[b1]という。季節によってふく向きが決まっている風を[b2]という。',
        blanks: [
          word('b1', ['海陸風', '偏西風', '季節風'], '海陸風'),
          word('b2', ['海陸風', '偏西風', '季節風'], '季節風'),
        ],
        explanation: '昼の海風と夜の陸風をまとめて**海陸風**、季節ごとに向きが決まってふく風を**季節風**といいます。',
        hint: '「海」と「陸」の風、「季節」の風だよ。',
      }),
      figureChoice({
        id: 'weather-mp14-p1', concept: 'we-wind',
        prompt: 'ア・イは、海に面した地域の地表付近の風（青い矢印）と上空の風（灰色の矢印）です。昼のようすを表しているのはどちら？',
        figure: scene(breezeItems(false).concat([region('r1', 80, 222, 'ア'), region('r2', 240, 222, 'イ')])),
        answer: 'r1',
        explanation: '昼は陸が海よりあたたまりやすく、陸の上で上昇気流が生じて気圧が低くなります。そこへ海から風がふきこむので、地表では海から陸へふくアが昼のようすです。',
        hint: '昼は、海と陸のどちらの気圧が低くなるかな。',
      }),
      choice({
        id: 'weather-mp14-p2', concept: 'we-wind',
        prompt: '赤道付近の地表の気圧は、まわりとくらべて高い？ 低い？',
        figure: scene(globalWindItems()),
        options: ['低い', '高い', '同じ'],
        answer: 'a',
        explanation: '赤道付近は太陽の光で強くあたためられ、上昇気流が生じます。空気が上へ運ばれるので、地表の気圧は低くなります。',
        hint: '上昇気流が生じているところの気圧を考えよう。',
      }),
      choice({
        id: 'weather-mp14-p3', concept: 'we-wind',
        prompt: '中緯度から高緯度へ向かってふき、地球の自転の影響で右にずれて西風になる風 X の名前はどれ？',
        figure: scene(globalWindItems()),
        options: ['偏西風', '季節風', '海風'],
        answer: 'a',
        explanation: '中緯度から高緯度へふく風は、地球の自転の影響で右（東向き）にずれて西風になります。これが偏西風で、日本付近の上空を西から東へふいています。',
        hint: '「西」からふく風の名前だよ。',
      }),
      choice({
        id: 'weather-mp14-p4', concept: 'we-disaster',
        prompt: '洪水や土砂くずれを起こすことがある、せまい範囲に短時間に降る大雨を、漢字 4 字で何という？',
        options: ['集中豪雨', '梅雨前線', '季節風'],
        answer: 'a',
        explanation: 'せまい範囲に短時間に大量の雨が降ることを**集中豪雨**といいます。発達した積乱雲が次々にできると起こります。',
        hint: '1 か所に「集中」して降る大雨だよ。',
      }),
      choice({
        id: 'weather-mp14-p5', concept: 'we-disaster',
        prompt: '発達した積乱雲の下で起こる、激しいうず巻き状の風を何という？',
        options: ['竜巻', '海風', '偏西風'],
        answer: 'a',
        explanation: '積乱雲の下で起こる激しいうず巻き状の風を**竜巻**といいます。家をこわすほどの強い風になることがあります。',
        hint: '龍が空へのぼるように見える風だよ。',
      }),
    ],
    retryPool: [
      choice({
        id: 'weather-mp14-r1', concept: 'we-wind',
        prompt: '赤道付近で上昇した空気が、中緯度で下降してくる場所の地表の気圧は、まわりとくらべて高い？ 低い？',
        figure: scene(globalWindItems()),
        options: ['高い', '低い', '同じ'],
        answer: 'a',
        explanation: '空気が上から下りてくる（下降気流の）ところでは、地表の気圧は高くなります。',
        hint: '高気圧の中心では、上昇気流と下降気流のどちらだったかな。',
      }),
      figureChoice({
        id: 'weather-mp14-r2', concept: 'we-wind',
        prompt: '日本付近の地図に、2 本の風の矢印があります（ア 南東からふく、イ 北西からふく）。冬にふく季節風はどちら？',
        figure: monsoonFigure(['se', 'nw']),
        answer: 'r2',
        explanation: '冬は大陸が海より冷えて高気圧ができるので、大陸から海へ向かう北西の季節風（イ）がふきます。',
        hint: '冬は、大陸と海のどちらが冷えやすいかな。',
      }),
      choice({
        id: 'weather-mp14-r3', concept: 'we-wind',
        prompt: '晴れた日の昼に、海から陸へ風がふくのはなぜ？',
        options: ['陸のほうがあたたまりやすく、陸の上で上昇気流が生じて気圧が低くなるから', '海のほうがあたたまりやすく、海の上の気圧が低くなるから', '昼は太陽が海の上にあるから'],
        answer: 'a',
        explanation: '陸は海よりあたたまりやすいので、昼は陸の空気があたためられて上昇し、気圧が低くなります。気圧の高い海から陸へ風がふきこみます。',
        hint: '風は気圧の高いほうから低いほうへふくよ。',
      }),
      choice({
        id: 'weather-mp14-r4', concept: 'we-disaster',
        prompt: '川の水は、わたしたちのくらしにどのように利用されている？',
        options: ['農業用水・工業用水・生活用水などに使われる', '天気予報のデータにだけ使われる', '海の水の量を減らすために使われる'],
        answer: 'a',
        explanation: '雨や雪がもとになる川の水は、田畑の農業用水、工場の工業用水、家庭の生活用水などに使われています。',
        hint: '田んぼや工場、家の水道を思いうかべよう。',
      }),
      choice({
        id: 'weather-mp14-r5', concept: 'we-disaster',
        prompt: '「山に積もった雪も恵みである」といわれます。どのような点で恵みといえる？',
        options: ['ゆっくりとけて、雨の少ない時期にも川へ水を送り続けるから', '雪が多いほど、気温が上がるから', '雪が積もると、台風が来なくなるから'],
        answer: 'a',
        explanation: '山の雪は春から夏にかけてゆっくりとけ、川へ水を送り続けます。水が足りなくなる時期にも、田畑などに水を供給してくれます。',
        hint: '山の雪は、一度に全部とけるかな。',
      }),
      choice({
        id: 'weather-mp14-r6', concept: 'we-disaster',
        prompt: '日本の年間の降水量は、世界の平均とくらべてどうなっている？',
        options: ['多いほう', '少ないほう', 'ほぼ同じ'],
        answer: 'a',
        explanation: '日本は梅雨や台風、冬の雪などがあるので、世界の平均とくらべて降水量が多い国です。',
        hint: '梅雨・台風・雪…と、雨や雪の季節が多いね。',
      }),
    ],
  };

  // ================================================================
  // 概念（類題の不足を補う確認問題つき）
  // ================================================================

  const concepts = [
    {
      id: 'we-pressure', title: '圧力と大気圧', basic: null, lessonStageId: 'weather-1',
      checkPool: [
        choice({
          id: 'we-pressure-k1', concept: 'we-pressure',
          prompt: '1 hPa（ヘクトパスカル）は何 Pa？',
          options: ['10 Pa', '100 Pa', '1000 Pa'],
          answer: 'b',
          explanation: '「ヘクト」は 100 倍という意味で、1 hPa ＝ 100 Pa です。海面の大気圧 約 1013 hPa は、約 101300 Pa です。',
          hint: '「ヘクト」が何倍を表すか思い出そう。',
        }),
        fill({
          id: 'we-pressure-k2', concept: 'we-pressure',
          prompt: '空らんに入る数を入れよう。',
          text: '5 m² の板に、200 N の力が垂直にはたらいている。板が受ける圧力は[b1]である。',
          blanks: [number('b1', 40, 0.1, 'Pa')],
          explanation: '圧力＝力÷面積なので、200 N ÷ 5 m² ＝ 40 Pa です。',
          hint: '力〔N〕を面積〔m²〕でわろう。',
        }),
        choice({
          id: 'we-pressure-k3', concept: 'we-pressure',
          prompt: '雪の上を歩くとき、スキー板をはくと、くつだけのときよりしずみにくいのはなぜ？',
          options: ['スキー板をはくと体重が軽くなるから', '雪に接する面積が大きくなり、圧力が小さくなるから', '雪に接する面積が小さくなり、圧力が大きくなるから'],
          answer: 'b',
          explanation: '雪をおす力（体重）は同じでも、スキー板で面積が大きくなると、圧力は小さくなります。だから雪にしずみにくくなります。',
          hint: '力が同じとき、面積と圧力の関係を思い出そう。',
        }),
        // ---- ここから、ミニプリント（weather-mp1）の問題で、ステージに入りきらなかったもの ----
        fill({
          id: 'we-pressure-k4', concept: 'we-pressure',
          prompt: '空らんに入る数を入れよう。',
          text: '500 cm² の板に 60 N の力が垂直にはたらいている。板が受ける圧力は[b1]である。',
          blanks: [number('b1', 1200, 0, 'Pa')],
          explanation: '500 cm² ＝ 0.05 m² なので、圧力＝60 ÷ 0.05 ＝ 1200 Pa です。',
          hint: 'cm² を m² になおしてから計算しよう（1 m² ＝ 10000 cm²）。',
        }),
        fill({
          id: 'we-pressure-k5', concept: 'we-pressure',
          prompt: '100 g の物体にはたらく重力を 1 N とします。空らんに入る数を入れよう。',
          text: '20 cm² の面の上に、50 kg の物体をのせた。面が受ける圧力は[b1]である。',
          blanks: [number('b1', 250000, 0, 'Pa')],
          explanation: '50 kg の物体にはたらく重力は 500 N、20 cm² ＝ 0.002 m² なので、圧力＝500 ÷ 0.002 ＝ 250000 Pa です。',
          hint: 'kg を N に、cm² を m² になおしてから計算しよう。',
        }),
      ],
    },
    {
      id: 'we-observe', title: '天気記号と風向', basic: null, lessonStageId: 'weather-1',
      checkPool: [
        choice({
          id: 'we-observe-k1', concept: 'we-observe',
          prompt: '雨や雪は降っていません。空全体が雲でおおわれているとき（雲量 10）、天気は何？',
          options: ['晴れ', 'くもり', '快晴'],
          answer: 'b',
          explanation: '雲量 9〜10 はくもりです。晴れは雲量 2〜8、快晴は 0〜1 です。',
          hint: '雲量 9〜10 の天気を思い出そう。',
        }),
        choice({
          id: 'we-observe-k2', concept: 'we-observe',
          prompt: '天気記号で、中を黒くぬりつぶした丸（●）が表す天気はどれ？',
          options: ['快晴', '雨', 'くもり'],
          answer: 'b',
          explanation: '● は雨を表します。快晴は中が白い ○、くもりは二重丸 ◎ です。',
          hint: '雨つぶのように、ぬりつぶされた丸だよ。',
        }),
        fill({
          id: 'we-observe-k3', concept: 'we-observe',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '風がふいてくる向きを[b1]といい、[b2]方位で表す。',
          blanks: [
            word('b1', ['風向', '風力', '気圧'], '風向'),
            word('b2', ['4', '8', '16'], '16'),
          ],
          explanation: '風がふいてくる向きを風向といい、北・北北東・北東…のように 16 方位で表します。',
          hint: '北と北東のあいだを「北北東」とよぶ細かい方位を思い出そう。',
        }),
        // ---- ここから、ミニプリント（weather-mp2）の問題で、ステージに入りきらなかったもの ----
        figureChoice({
          id: 'we-observe-k4', concept: 'we-observe',
          prompt: 'ア〜オは天気記号です。「雪」を表す天気記号はどれ？',
          figure: scene(weatherSymbolsRow()),
          answer: 'r4',
          explanation: '雪は、丸の中に × をかいた記号です（エ）。雨は中を黒くぬった●（イ）です。',
          hint: '丸の中に × がある記号だよ。',
        }),
        choice({
          id: 'we-observe-k5', concept: 'we-observe',
          prompt: '天気を予想するために、気温と湿度のほかに観測するとよい気象要素の組み合わせはどれ？',
          options: ['気圧・風向・風力・降水量', '地震の震度・火山の高さ', '海の深さ・川の長さ'],
          answer: 'a',
          explanation: '気圧・風向・風力・降水量・雲量・天気などが気象要素です。気圧の変化や風向の変化から、天気の変化を予想できます。',
          hint: '大気のようすを表すものを選ぼう。',
        }),
        figureChoice({
          id: 'we-observe-k6', concept: 'we-observe',
          prompt: 'ア〜オは天気記号です。「晴れ」を表す天気記号はどれ？',
          figure: scene(weatherSymbolsRow()),
          answer: 'r5',
          explanation: '晴れは、丸の中に縦の線を 1 本かいた記号です（オ）。何もかかない白い丸（ア）は快晴です。',
          hint: '丸の中に線が 1 本ある記号だよ。',
        }),
      ],
    },
    {
      id: 'we-humidity', title: '飽和水蒸気量・露点・湿度', basic: null, lessonStageId: 'weather-2',
      checkPool: [
        fill({
          id: 'we-humidity-k1', concept: 'we-humidity',
          prompt: '空らんに入る数を入れよう。',
          text: '気温 25 ℃（飽和水蒸気量 23.1 g/m³）の空気 1 m³ に、18.48 g の水蒸気がふくまれている。この空気の湿度は[b1]である。',
          blanks: [number('b1', 80, 1, '%')],
          explanation: '湿度＝水蒸気量÷飽和水蒸気量×100 なので、18.48 ÷ 23.1 × 100 ＝ 80 % です。',
          hint: '水蒸気量を飽和水蒸気量でわって、100 をかけよう。',
        }),
        choice({
          id: 'we-humidity-k2', concept: 'we-humidity',
          prompt: '露点を調べる実験で、ガラスではなく金属のコップを使うのはなぜ？',
          options: ['熱を伝えやすく、コップの表面の温度が水温とすぐ同じになるから', '金属は水を吸いこむから', '金属のコップのほうが重くて倒れにくいから'],
          answer: 'a',
          explanation: '金属は熱を伝えやすいので、コップの表面の温度が中の水温とすぐ同じになります。そのため、くもり始めたときの水温が、表面の空気の温度（露点）とほぼ等しくなります。',
          hint: '表面の温度と水温を同じにしたい理由を考えよう。',
        }),
        choice({
          id: 'we-humidity-k3', concept: 'we-humidity',
          prompt: '気温と露点が同じ 15 ℃ の空気の湿度は何 %？',
          options: ['50 %', '85 %', '100 %'],
          answer: 'c',
          explanation: '露点では、空気中の水蒸気量がその気温の飽和水蒸気量と等しくなっています。気温が露点と同じなら、湿度は 100 % です。',
          hint: '露点では、水蒸気量と飽和水蒸気量の関係はどうなっているかな。',
        }),
      ],
    },
    {
      id: 'we-cloud', title: '雲のでき方', basic: 'we-humidity', lessonStageId: 'weather-2',
      checkPool: [
        choice({
          id: 'we-cloud-k1', concept: 'we-cloud',
          prompt: '雲ができるまでの順番として正しいものはどれ？',
          options: ['空気が上昇する → 膨張して温度が下がる → 露点に達して水滴ができる', '空気が下降する → 縮んで温度が上がる → 露点に達して水滴ができる', '空気が上昇する → 縮んで温度が上がる → 水蒸気がふえる'],
          answer: 'a',
          explanation: '上昇した空気は、まわりの気圧が低いので膨張し、温度が下がります。温度が露点に達すると、水蒸気が水滴や氷の粒になって雲ができます。',
          hint: '上空の気圧が低いことから順番に考えよう。',
        }),
        fill({
          id: 'we-cloud-k2', concept: 'we-cloud',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '雲は、空気中の水蒸気が冷やされてできた、小さな[b1]や氷の粒が集まったものである。',
          blanks: [word('b1', ['水滴', '水蒸気', '二酸化炭素'], '水滴')],
          explanation: '雲の正体は、小さな水滴や氷の粒です。水蒸気は目に見えない気体なので、雲が白く見えるのは水滴や氷の粒があるからです。',
          hint: '目に見える雲は、気体か液体・固体か考えよう。',
        }),
        choice({
          id: 'we-cloud-k3', concept: 'we-cloud',
          prompt: '少し水を入れたフラスコに線香のけむりを入れ、つないだ注射器のピストンを急に引くと、フラスコの中が白くくもりました。くもった理由はどれ？',
          options: ['中の空気が膨張して温度が下がり、水蒸気が水滴になったから', '中の空気が縮んで温度が上がり、水が蒸発したから', '線香のけむりがふえたから'],
          answer: 'a',
          explanation: 'ピストンを引くとフラスコの中の気圧が下がり、空気が膨張して温度が下がります。露点より下がると水蒸気が水滴になり、白くくもります。線香のけむりは、水滴ができるときの芯になります。',
          hint: '空気が膨張すると、温度はどうなるかな。',
        }),
      ],
    },
    {
      id: 'we-system', title: '高気圧と低気圧', basic: 'we-pressure', lessonStageId: 'weather-3',
      checkPool: [
        choice({
          id: 'we-system-k1', concept: 'we-system',
          prompt: '天気図で、等圧線の間隔がせまいところでは、風はどうなっている？',
          options: ['強くふいている', '弱くふいている', 'まったくふいていない'],
          answer: 'a',
          explanation: '等圧線の間隔がせまいところは、短いきょりで気圧が大きく変わるので、強い風がふきます。',
          hint: '間隔がせまいと、気圧の差はどうなるか考えよう。',
        }),
        fill({
          id: 'we-system-k2', concept: 'we-system',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '高気圧の中心付近では[b1]気流が生じ、天気は[b2]ことが多い。',
          blanks: [
            word('b1', ['下降', '上昇'], '下降'),
            word('b2', ['晴れる', 'くずれる'], '晴れる'),
          ],
          explanation: '高気圧の中心では下降気流が生じ、雲ができにくいので晴れることが多いです。低気圧では上昇気流で雲ができやすくなります。',
          hint: '空気が下りてくると、雲はできやすいかな。',
        }),
        choice({
          id: 'we-system-k3', concept: 'we-system',
          prompt: '地表付近の風は、気圧とどのような関係でふく？',
          options: ['気圧の高いほうから低いほうへふく', '気圧の低いほうから高いほうへふく', '等圧線にそって、同じ気圧のところだけをふく'],
          answer: 'a',
          explanation: '風は、気圧の高いところから低いところへ向かってふきます。だから、高気圧からは風がふき出し、低気圧には風がふきこみます。',
          hint: 'ふくらませた風船の口を開くと、空気はどちらへ出ていくか考えよう。',
        }),
        // ---- ここから、ミニプリント（weather-mp11「天気の変化を予想」）の問題 ----
        choice({
          id: 'we-system-k4', concept: 'we-system',
          prompt: '4 月 1 日と 2 日の天気図で、新潟県付近の等圧線の間隔は、1 日は広く、2 日はせまくなっていました。新潟県で風が強かったのはどちらの日？',
          options: ['2 日', '1 日', 'どちらも同じ'],
          answer: 'a',
          explanation: '等圧線の間隔がせまいところほど、気圧の差が大きいので強い風がふきます。だから等圧線の間隔がせまい 2 日のほうが風が強かったと考えられます。',
          hint: '等圧線の間隔と、風の強さの関係を思い出そう。',
        }),
      ],
    },
    {
      id: 'we-front', title: '前線の種類と通過', basic: 'we-system', lessonStageId: 'weather-3',
      checkPool: [
        choice({
          id: 'we-front-k1', concept: 'we-front',
          prompt: '寒気と暖気の勢力がほぼつり合って、ほとんど動かない前線はどれ？',
          options: ['寒冷前線', '温暖前線', '停滞前線'],
          answer: 'c',
          explanation: '寒気と暖気の勢力がつり合ってほとんど動かない前線を、停滞前線といいます。梅雨のころの梅雨前線も停滞前線です。',
          hint: '「停滞」は、とどまって動かないという意味だよ。',
        }),
        choice({
          id: 'we-front-k2', concept: 'we-front',
          prompt: '寒冷前線が温暖前線に追いついてできる前線はどれ？',
          options: ['閉そく前線', '停滞前線', '梅雨前線'],
          answer: 'a',
          explanation: '寒冷前線は温暖前線より速く進むので、やがて追いつきます。追いついてできた前線を閉そく前線といいます。',
          hint: '前線が「閉じる」ようすを表す名前だよ。',
        }),
        fill({
          id: 'we-front-k3', concept: 'we-front',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '寒冷前線の付近では[b1]が発達し、[b2]雨が短時間降ることが多い。',
          blanks: [
            word('b1', ['積乱雲', '乱層雲'], '積乱雲'),
            word('b2', ['強い', '弱い'], '強い'),
          ],
          explanation: '寒冷前線では暖気が急におし上げられるので、背の高い積乱雲が発達し、強い雨が短時間降ります。雷やとっ風をともなうこともあります。',
          hint: '縦にのびる、背の高い雲の名前を思い出そう。',
        }),
      ],
    },
    {
      id: 'we-japan', title: '日本の四季の天気', basic: 'we-front', lessonStageId: 'weather-4',
      checkPool: [
        choice({
          id: 'we-japan-k1', concept: 'we-japan',
          prompt: '冬、日本海側で雪が降っているとき、太平洋側の天気はどうなっていることが多い？',
          options: ['乾いた晴れの日が多い', '大雪になることが多い', '蒸し暑い日が多い'],
          answer: 'a',
          explanation: '日本海側で雪を降らせた空気は、山をこえると水蒸気が少なくなっています。その乾いた風がふき下ろすので、太平洋側は乾いた晴れの日が多くなります。',
          hint: '山をこえた空気には、水蒸気が多く残っているかな。',
        }),
        fill({
          id: 'we-japan-k2', concept: 'we-japan',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '日本付近の天気が西から東へ変わっていくのは、上空に[b1]がふいているからである。',
          blanks: [word('b1', ['偏西風', '季節風', '海風'], '偏西風')],
          explanation: '日本付近の上空には、偏西風が西から東へふいています。高気圧や低気圧もこの風にのって西から東へ動くので、天気も西から東へ変わります。',
          hint: '「西」からふく風だよ。',
        }),
        choice({
          id: 'we-japan-k3', concept: 'we-japan',
          prompt: 'シベリア気団の性質として正しいものはどれ？',
          options: ['冷たく乾いている', '暖かくしめっている', '冷たくしめっている'],
          answer: 'a',
          explanation: 'シベリア気団は、冬の大陸の上でできるので、冷たく乾いています。海の上でできる小笠原気団やオホーツク海気団は、しめっています。',
          hint: '大陸の上でできるか、海の上でできるかを考えよう。',
        }),
        // ---- ここから、ミニプリント（weather-mp13）の問題で、ステージに入りきらなかったもの ----
        figureChoice({
          id: 'we-japan-k4', concept: 'we-japan',
          prompt: 'ア〜エは、春・夏・冬・梅雨のどれかの天気図を簡単にかいたものです（緑の線は日本列島、上が北）。春の天気図はどれ？',
          figure: seasonFigure(),
          answer: 'r2',
          explanation: '高気圧と低気圧が東西にならび、交互に通っていくようすのイが春の天気図です。移動性高気圧が日本付近をおおっています。',
          hint: '西高東低でも、停滞前線でも、南の大きな高気圧でもない図だよ。',
        }),
      ],
    },
    // ---- ミニプリントで足した概念 ----
    {
      id: 'we-airmass', title: '日本付近の気団と海流', basic: 'we-front', lessonStageId: 'weather-mp9',
      checkPool: [
        figureChoice({
          id: 'we-airmass-k1', concept: 'we-airmass',
          prompt: '日本のまわりの 4 つの海流ア〜エです。太平洋側を南へ流れる寒流の千島海流（親潮）はどれ？',
          figure: scene(currentItems(false).concat(CURRENT_AT.map(([x, y], i) => region('r' + (i + 1), x, y, 'アイウエ'[i])))),
          answer: 'r3',
          explanation: '千島海流（親潮）は、北の海から太平洋側を南へ流れる寒流です（ウ）。',
          hint: '太平洋側で、北から南へ向かう流れだよ。',
        }),
        figureChoice({
          id: 'we-airmass-k2', concept: 'we-airmass',
          prompt: '日本のまわりの 4 つの海流ア〜エです。日本海側を大陸にそって南へ流れる寒流のリマン海流はどれ？',
          figure: scene(currentItems(false).concat(CURRENT_AT.map(([x, y], i) => region('r' + (i + 1), x, y, 'アイウエ'[i])))),
          answer: 'r4',
          explanation: 'リマン海流は、日本海の大陸側を北から南へ流れる寒流です（エ）。',
          hint: '日本海側で、北から南へ向かう流れだよ。',
        }),
        choice({
          id: 'we-airmass-k3', concept: 'we-airmass',
          prompt: '小笠原気団の性質として正しいものはどれ？',
          options: ['暖かくしめっている', '冷たく乾いている', '冷たくしめっている'],
          answer: 'a',
          explanation: '小笠原気団は南の太平洋の上でできるので、暖かくしめっています。夏に日本をおおいます。',
          hint: '南の海の上でできる気団だよ。',
        }),
        choice({
          id: 'we-airmass-k4', concept: 'we-airmass',
          prompt: 'オホーツク海気団の性質として正しいものはどれ？',
          options: ['冷たくしめっている', '暖かく乾いている', '冷たく乾いている'],
          answer: 'a',
          explanation: 'オホーツク海気団は北の海の上でできるので、冷たくしめっています。梅雨のころに勢力を強めます。',
          hint: '北の海の上でできる気団だよ。',
        }),
      ],
    },
    {
      id: 'we-wind', title: '海陸風と地球規模の風', basic: 'we-system', lessonStageId: 'weather-mp14',
      checkPool: [
        choice({
          id: 'we-wind-k1', concept: 'we-wind',
          prompt: '海に面した地域で、夜の地表付近にふく風はどれ？',
          options: ['陸から海へふく陸風', '海から陸へふく海風', '風はまったくふかない'],
          answer: 'a',
          explanation: '夜は陸が海より冷えやすく、陸の上の気圧が高くなるので、陸から海へ陸風がふきます。',
          hint: '夜は、陸と海のどちらが冷えやすいかな。',
        }),
        choice({
          id: 'we-wind-k2', concept: 'we-wind',
          prompt: '偏西風は、どの向きにふいている？',
          options: ['西から東', '東から西', '南から北'],
          answer: 'a',
          explanation: '偏西風は、中緯度の上空を西から東へふく風です。日本付近の天気が西から東へ変わるのは、この風のためです。',
          hint: '名前に「西」が入っているね。',
        }),
        choice({
          id: 'we-wind-k3', concept: 'we-wind',
          prompt: '季節風がふくのはなぜ？',
          options: ['大陸と海で、あたたまり方や冷え方がちがうから', '月の引力が季節で変わるから', '海流の向きが季節で逆になるから'],
          answer: 'a',
          explanation: '大陸は海よりあたたまりやすく冷えやすいので、夏と冬で大陸と海の気圧の高低が入れかわります。そのため、季節によって向きの決まった風がふきます。',
          hint: '海陸風と同じしくみを、大陸と海の大きさで考えよう。',
        }),
      ],
    },
    {
      id: 'we-disaster', title: '気象の恵みと災害', basic: 'we-japan', lessonStageId: 'weather-mp14',
      checkPool: [
        choice({
          id: 'we-disaster-k1', concept: 'we-disaster',
          prompt: '台風が近づいたときに起こりやすい災害の組み合わせはどれ？',
          options: ['強風・高潮・大雨による洪水', '地震・津波', '大雪・なだれ'],
          answer: 'a',
          explanation: '台風は強い風と大雨をもたらします。気圧が低いことと強い風で海面が高くなる高潮が起こることもあります。',
          hint: '台風は、強い風と雨をともなう低気圧だね。',
        }),
        choice({
          id: 'we-disaster-k2', concept: 'we-disaster',
          prompt: '集中豪雨や竜巻をもたらすことが多い雲はどれ？',
          options: ['積乱雲', '巻雲', '高層雲'],
          answer: 'a',
          explanation: '強い上昇気流で縦に高く発達する積乱雲は、短時間の大雨、雷、竜巻などを起こします。',
          hint: '寒冷前線の付近にもできる、背の高い雲だよ。',
        }),
        choice({
          id: 'we-disaster-k3', concept: 'we-disaster',
          prompt: '気象の恵みの例として正しいものはどれ？',
          options: ['梅雨や台風の雨が、ダムや川の水になって水不足を防ぐ', '集中豪雨で、土砂くずれが起こる', '台風の強風で、木がたおれる'],
          answer: 'a',
          explanation: '梅雨や台風の雨、冬の雪は、ダムや川、地下水の水になり、わたしたちのくらしをささえています。ほかの 2 つは災害の例です。',
          hint: 'くらしに役立つことを選ぼう。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'weather',
    title: '天気とその変化',
    mascot: 'D',   // 担当の先生（もくもく先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'air', title: '大気と水蒸気', order: 1, stages: [weather1, weather2] },
      { id: 'front', title: '前線と天気の変化', order: 2, stages: [weather3, weather4] },
      { id: 'we-miniprint', title: 'ミニプリント', order: 3, free: true, stages: [
        weatherMp1, weatherMp2, weatherMp3, weatherMp4, weatherMp5, weatherMp6, weatherMp7,
        weatherMp8, weatherMp9, weatherMp10, weatherMp11, weatherMp12, weatherMp13, weatherMp14,
      ] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
