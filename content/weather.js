// 「天気とその変化」教材データ（中学2年 理科・地学）
// 文章と図はすべてこのアプリのための自作。形は content/light.js と同じ（共通資料の「共通のデータの形」を参照）。
// 2 領域 × 2 ステージ（大気と水蒸気: 圧力・気圧・気象観測、湿度と雲のでき方 / 前線と天気の変化: 気圧配置と前線、日本の天気）と、概念 7 つ。
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
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
