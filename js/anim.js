// 解説カードの「動く図」
// frame(kind, t) は 1 周の中の位置 t（0 以上 1 未満）の場面（scene）を返す純粋関数（DOM を使わない。Node でテストできる）。
// 位置は数式で計算する（光線が物体のはしを通る、入射角＝反射角、スネルの法則、レンズの式）。描くのは figures.js の item と同じ部品。
// create(kind) はブラウザ専用。requestAnimationFrame で図を描き直し、要素が画面から外れたら自分で止まる。
// 画面側（ui-screens.js の lessonCardBody）が create して、動きを減らす設定でなければ start() を呼ぶ。
// 座標は x 右向き・y 下向き、場面 320×240。静止図（content/light.js の figure）と同じ item は同じ座標・文字を使う。
// 光の 23 種はこのファイルの BUILD に書く。ほかの単元の動く図は分野ごとのファイル（js/anim-physics.js など）が
// register(kind, frameFn, opts) で足す（書き方は docs/anim-guide.md）。
(function (root) {
  'use strict';

  const KINDS = [
    'shadow-size', 'reflect-law', 'rays-spread', 'shadow-forms', 'light-to-eye', 'bounce-to-eye',
    'reflect-travel', 'reflect-names', 'mirror-image-distance', 'image-behind-mirror', 'mirror-visible',
    'refract-in', 'refract-out', 'vertical-vs-oblique', 'coin-lift', 'stick-lift', 'total-reflection',
    'lens-parallel-rays', 'focal-length', 'lens-special-rays', 'real-image-forms', 'image-size-by-distance', 'virtual-image',
  ];
  const PERIOD_MS = 4000;   // 1 周の時間
  const WIDTH = 320;
  const HEIGHT = 240;

  // 屈折率
  const N = { water: 1.33, glass: 1.5 };

  // 図の描き方は figures.js を使う。読み込み順に頼らないよう、使うときに取る
  function figures() {
    return typeof require === 'function' ? require('./figures.js') : root.RikaQuest.figures;
  }

  // ---- 共通の道具 ----

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function clamp01(x) { return clamp(x, 0, 1); }
  // t が from から to の間に 0→1 に進む
  function stage(t, from, to) { return clamp01((t - from) / (to - from)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function deg(x) { return x * Math.PI / 180; }
  function rad2deg(x) { return x * 180 / Math.PI; }
  // 0→1→0 のゆっくりした往復
  function u(t) { return 0.5 - 0.5 * Math.cos(2 * Math.PI * t); }

  // ---- 分野ごとのファイル（anim-physics.js など）でも使う道具（docs/anim-plan.md 3-2） ----

  // 小数部分（負の数も 0 以上 1 未満にする）
  function frac(x) { return x - Math.floor(x); }
  // 動き始めと止まりをなめらかにする（0〜1 → 0〜1。範囲の外は 0〜1 に収めてから計算する）
  function ease(k) { const q = clamp01(k); return q * q * (3 - 2 * q); }
  // 振動 sin(2π(n·t + phase))。n を整数にすると t = 1 で t = 0 とつながる
  function osc(t, n, phase) { return Math.sin(2 * Math.PI * (n * t + (Number(phase) || 0))); }
  // 0→1→0 の三角波（気体の粒子が壁ではね返る動き）
  function tri(s) { return 1 - Math.abs(2 * frac(s) - 1); }
  // v を lo 以上 hi 未満に折り返す（はしまで行ったら反対のはしから出てくる）
  function wrap(v, lo, hi) {
    if (!(hi > lo)) return lo;   // 幅が 0 以下なら lo（0 除算で NaN を返さない）
    return lo + frac((v - lo) / (hi - lo)) * (hi - lo);
  }

  // 折れ線 points = [[x, y], ...] の長さ
  function pathLen(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }
    return total;
  }

  // 折れ線の上で、全長に対する割合 k（0〜1）の点と、その辺の向き（長さ 1 のベクトル tx, ty）。
  // 長さ 0 の辺は飛ばす。折れ線の長さが 0 のときは最初の点（向き 1, 0）
  function along(points, k) {
    const q = clamp01(Number(k) || 0);
    const total = pathLen(points);
    if (!(total > 0)) return { x: points[0][0], y: points[0][1], tx: 1, ty: 0 };
    let remain = q * total;
    let last = null;
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1], [x2, y2] = points[i];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (!(len > 0)) continue;
      last = { x1, y1, x2, y2, len };
      if (remain <= len) {
        const s = remain / len;
        return { x: lerp(x1, x2, s), y: lerp(y1, y2, s), tx: (x2 - x1) / len, ty: (y2 - y1) / len };
      }
      remain -= len;
    }
    // 計算の誤差で最後の辺を過ぎたとき: 終点
    return { x: last.x2, y: last.y2, tx: (last.x2 - last.x1) / last.len, ty: (last.y2 - last.y1) / last.len };
  }

  // 折れ線を全長の割合 k（0〜1）まで切った点の配列（2 点以上）。k = 0 や長さ 0 の折れ線は []
  function partial(points, k) {
    const q = clamp01(Number(k) || 0);
    const total = pathLen(points);
    if (!(q > 0) || !(total > 0)) return [];
    if (q >= 1) return points.map(p => [p[0], p[1]]);
    let remain = q * total;
    const out = [[points[0][0], points[0][1]]];
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1], [x2, y2] = points[i];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (!(len > 0)) continue;
      if (remain < len) {
        out.push([lerp(x1, x2, remain / len), lerp(y1, y2, remain / len)]);
        break;
      }
      out.push([x2, y2]);
      remain -= len;
      if (remain <= 1e-9) break;   // 計算の誤差で長さ 0 の点を足さない
    }
    return out;
  }

  // 光以外の「伸びる線」: partial の点を 1 本の line（矢印つき）にした配列。k = 0 なら []
  // style: { color, width, dashed }（どれも任意。figures.js の line と同じ意味）
  function growLine(points, k, style) {
    const ps = partial(points, k);
    if (ps.length < 2) return [];
    const it = { type: 'line', points: ps, arrow: true };
    const st = style || {};
    if (st.color !== undefined) it.color = st.color;
    if (st.width !== undefined) it.width = st.width;
    if (st.dashed) it.dashed = true;
    return [it];
  }

  // 中心 (cx, cy)・半径 r の円の上で、角 d 度の点 [x, y]（右が 0°、画面で反時計回りが正。content/space.js と同じ）
  function onCircle(cx, cy, r, d) {
    return [cx + r * Math.cos(deg(d)), cy - r * Math.sin(deg(d))];
  }

  // 2 つの色 '#rrggbb' を k（0〜1）で混ぜた '#RRGGBB'。形のまちがった色は例外
  const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
  function mix(c1, c2, k) {
    if (!HEX6_RE.test(c1) || !HEX6_RE.test(c2)) throw new Error('mix の色は #rrggbb: ' + c1 + ', ' + c2);
    const q = clamp01(Number(k) || 0);
    let out = '#';
    for (let i = 1; i < 7; i += 2) {
      const v = Math.round(lerp(parseInt(c1.slice(i, i + 2), 16), parseInt(c2.slice(i, i + 2), 16), q));
      out += (v < 16 ? '0' : '') + v.toString(16).toUpperCase();
    }
    return out;
  }

  // 色のトークン名 → 色コード（docs/figures-guide.md の表・js/figures.js の COLOR と同じ）。mix にトークンの色を渡すとき
  const TOKEN_HEX = Object.freeze({
    ink: '#1B2430', blue: '#1A5CFF', gray: '#8A94A6', line: '#5A6B85', green: '#2E9E5B', orange: '#F08C2E',
    red: '#D9534F', yellow: '#FFD34D', pink: '#F2A6C2', purple: '#8E6BD6', brown: '#A0623A', sky: '#CFE4FF',
    water: '#CFE4FF', glass: '#E6E8EC', white: '#FFFFFF', lightgreen: '#C9EBD3', sand: '#E8D8B0', rock: '#B8B2A7',
    lensFill: '#E8F0FF', bulb: '#FFD34D', bulbEdge: '#C98A00', shadow: '#4A4A4A',
  });

  // 折れ線 points = [[x, y], ...] を、全長に対する割合 p（0〜1）まで描いた ray の配列。
  // 各辺を 1 本の ray にし、いちばん先の（途中まで描いている）辺だけ矢印。長さ 0 の辺は飛ばす。
  function grow(points, p, opts) {
    const dashed = !!(opts && opts.dashed);
    const segs = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1], [x2, y2] = points[i];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len > 0) { segs.push({ x1, y1, x2, y2, len }); total += len; }
    }
    const q = clamp01(Number(p) || 0);
    if (!(q > 0) || !(total > 0)) return [];
    let remain = q * total;
    const out = [];
    for (const s of segs) {
      if (remain <= 1e-9) break;   // 計算の誤差で長さ 0 の辺を足さない
      const k = Math.min(1, remain / s.len);
      const r = { type: 'ray', x1: s.x1, y1: s.y1, x2: lerp(s.x1, s.x2, k), y2: lerp(s.y1, s.y2, k), arrow: false };
      if (dashed) r.dashed = true;
      out.push(r);
      remain -= s.len;
    }
    if (out.length === 0) return [];   // 進み方がごくわずかで、計算の誤差で 1 辺も足せなかったとき
    out[out.length - 1].arrow = true;
    return out;
  }

  function ray(x1, y1, x2, y2, extra) { return Object.assign({ type: 'ray', x1, y1, x2, y2 }, extra || {}); }
  function label(x, y, text) { return { type: 'label', x, y, text }; }

  // ================================================================
  // 光の直進
  // ================================================================

  // 物体を光源に近づけたり離したりすると、スクリーンの影が大きく・小さくなる（straight-1-c3）
  function shadowSize(t) {
    const c = Math.cos(2 * Math.PI * t);
    const ox = 150 - 50 * c;   // t = 0 で 100（光源に近い）、t = 0.5 で 200（遠い）
    // 光源 (40, 120) と物体の先端 (ox, 98)・根元 (ox, 143) を結ぶ直線を x = 280 までのばす
    const yTop = clamp(120 - 22 * 240 / (ox - 40), 30, 220);
    const yBot = clamp(120 + 23 * 240 / (ox - 40), 30, 220);
    return [
      { type: 'ray', x1: 40, y1: 120, x2: 280, y2: yTop, arrow: true },
      { type: 'ray', x1: 40, y1: 120, x2: 280, y2: yBot, arrow: true },
      { type: 'object', x: ox, y: 143, height: 45, label: '物体' },
      { type: 'screen', x: 280, y1: 30, y2: 220 },
      { type: 'shadow', x: 280, y1: yTop, y2: yBot },
      { type: 'lamp', x: 40, y: 120 },
      { type: 'label', x: 104, y: 232, text: ox < 150 ? '光源に近い → 影は大きい' : '光源から遠い → 影は小さい' },
    ];
  }

  // 電球から 5 本の光の道すじが同時に伸びる（straight-1-c1）
  function raysSpread(t) {
    const p = stage(t, 0, 0.7);
    const ends = [[300, 120], [280, 30], [280, 210], [20, 40], [20, 200]];
    return [
      ...ends.flatMap(([x2, y2]) => grow([[80, 120], [x2, y2]], p)),
      { type: 'lamp', x: 80, y: 120 },
      label(56, 168, '光源'),
      label(200, 112, '光の道すじ'),
    ];
  }

  // 物体の上下のはしを通る 2 本の光がスクリーンまで伸び、届いたところで影ができる（straight-1-c2）
  function shadowForms(t) {
    const p = stage(t, 0, 0.6);
    const done = p >= 1;
    return [
      ...grow([[40, 120], [280, 51]], p),
      ...grow([[40, 120], [280, 189]], p),
      { type: 'object', x: 140, y: 149, height: 58, label: '物体' },
      { type: 'screen', x: 280, y1: 30, y2: 220 },
      ...(done ? [{ type: 'shadow', x: 280, y1: 51, y2: 189 }] : []),
      { type: 'lamp', x: 40, y: 120 },
      ...(done ? [label(290, 126, '影')] : []),
    ];
  }

  // 電球の光が目に向かって進む（straight-2-c1）
  function lightToEye(t) {
    const p = stage(t, 0, 0.6);
    return [
      ...grow([[70, 120], [240, 120]], p),
      { type: 'lamp', x: 60, y: 120 },
      { type: 'eye', x: 260, y: 120 },
      label(40, 168, '光源'),
      label(246, 160, '目'),
      ...(p >= 1 ? [label(120, 90, '光が目に入る → 見える')] : []),
    ];
  }

  // 光源の光が本に当たり、はね返って目に入る（straight-2-c2）
  function bounceToEye(t) {
    const p1 = stage(t, 0, 0.4), p2 = stage(t, 0.4, 0.8);
    return [
      ...grow([[60, 60], [158, 160]], p1),
      ...grow([[162, 160], [255, 92]], p2),
      { type: 'lamp', x: 50, y: 50 },
      { type: 'object', x: 160, y: 200, height: 40, label: '本' },
      { type: 'eye', x: 270, y: 80 },
      label(28, 100, '光源'),
      ...(p2 >= 1 ? [label(236, 120, '見える！')] : []),
    ];
  }

  // ================================================================
  // 光の反射
  // ================================================================

  // 入射角が 20°〜50° で変わり、反射光がそれに合わせて動く（reflect-1-c3）
  function reflectLaw(t) {
    const theta = 20 + 30 * u(t);   // 度
    const L = 110;
    const rad = deg(theta);
    const s = Math.sin(rad), co = Math.cos(rad);
    const d = Math.round(theta);   // 表示だけ丸める（座標は丸めない）
    return [
      { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
      { type: 'normal', x: 160, y: 120, angle: 0 },
      { type: 'ray', x1: 160 - L * s, y1: 180 - L * co, x2: 160, y2: 180, arrow: true },
      { type: 'ray', x1: 160, y1: 180, x2: 160 + L * s, y2: 180 - L * co, arrow: true },
      { type: 'label', x: 20, y: 40, text: '入射角 ' + d + '°' },
      { type: 'label', x: 200, y: 40, text: '反射角 ' + d + '°' },
      { type: 'label', x: 120, y: 215, text: '入射角 ＝ 反射角' },
    ];
  }

  // 入射光が鏡に当たり、反射光として進む（reflect-1-c1）
  function reflectTravel(t) {
    const p1 = stage(t, 0, 0.45), p2 = stage(t, 0.45, 0.9);
    return [
      { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
      ...grow([[60, 60], [160, 180]], p1),
      ...grow([[160, 180], [260, 60]], p2),
      { type: 'lamp', x: 60, y: 60 },
      label(40, 140, '入射光'),
      label(230, 140, '反射光'),
      label(140, 222, '鏡'),
    ];
  }

  // 入射角が 25°〜45° でゆっくり変わる。法線・入射角・反射角の文字はそのまま（reflect-1-c2）
  function reflectNames(t) {
    const theta = deg(25 + 20 * u(t));
    const L = 110;
    const s = Math.sin(theta), co = Math.cos(theta);
    return [
      { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
      { type: 'normal', x: 160, y: 120, angle: 0 },
      ray(160 - L * s, 180 - L * co, 160, 180, { arrow: true }),
      ray(160, 180, 160 + L * s, 180 - L * co, { arrow: true }),
      label(166, 54, '法線'),
      // 角が小さい（25°）ときも光線と重ならないよう、静止図（y 95）より上の、光線の始まりより上に書く
      label(104, 72, '入射角'),
      label(168, 72, '反射角'),
    ];
  }

  // ものを鏡に近づけたり離したりすると、像も同じだけ動く（reflect-2-c1）。鏡は x = 160
  function mirrorImageDistance(t) {
    const ox = 90 + 40 * u(t);   // 90〜130
    const ix = 320 - ox;         // 鏡について対称
    return [
      { type: 'mirror', x1: 160, y1: 40, x2: 160, y2: 210 },
      { type: 'object', x: ox, y: 190, height: 60, label: 'もの' },
      { type: 'object', x: ix, y: 190, height: 60, label: '像' },
      ray(ox, 150, ix, 150, { dashed: true }),
      label((ox + 160) / 2 - 4, 144, 'a'),
      label((160 + ix) / 2 - 4, 144, 'a'),
      label(20, 30, '鏡からの距離はどちらも a'),
    ];
  }

  // ものから出た光が鏡で反射して目に入り、反射光をのばした先に像が見える（reflect-2-c2）
  function imageBehindMirror(t) {
    const p1 = stage(t, 0, 0.3), p2 = stage(t, 0.3, 0.6), p3 = stage(t, 0.6, 0.9);
    return [
      { type: 'mirror', x1: 160, y1: 30, x2: 160, y2: 220 },
      { type: 'object', x: 90, y: 200, height: 30, label: 'もの' },
      ...(p3 >= 1 ? [{ type: 'object', x: 230, y: 200, height: 30, label: '像' }] : []),
      ...grow([[90, 170], [160, 125]], p1),
      ...grow([[160, 125], [72, 67]], p2),
      ...grow([[160, 125], [230, 170]], p3, { dashed: true }),
      { type: 'eye', x: 60, y: 60 },
    ];
  }

  // 像の位置が B（見えない）から A（見える）へ動き、像と目を結ぶ直線が鏡の面を通るかで文字が変わる（reflect-2-c3）
  function mirrorVisible(t) {
    const k = u(t);
    const px = lerp(200, 210, k), py = lerp(30, 100, k);   // B (200,30) → A (210,100)
    // 目 (60,120) → P の直線が鏡の x = 160 を通る y。鏡は y 80〜160
    const yAt = 120 + (py - 120) * (100 / (px - 60));
    const visible = yAt >= 80 && yAt <= 160;
    return [
      { type: 'mirror', x1: 160, y1: 80, x2: 160, y2: 160 },
      { type: 'eye', x: 60, y: 120 },
      { type: 'point', x: 210, y: 100, label: '像A' },
      { type: 'point', x: 200, y: 30, label: '像B' },
      ray(60, 120, px, py, { dashed: true }),
      { type: 'point', x: px, y: py },
      label(30, 200, visible ? '鏡の面を通る → 見える' : '鏡の外を通る → 見えない'),
    ];
  }

  // ================================================================
  // 光の屈折（スネルの法則 sin θ2 = sin θ1 × n1 / n2）
  // ================================================================

  // 空気から水へ。入射角 20°〜50°。水の中では法線に近づく（refract-1-c1）
  function refractIn(t) {
    const theta1 = deg(20 + 30 * u(t));
    const s1 = Math.sin(theta1), c1 = Math.cos(theta1);
    const s2 = s1 / N.water, c2 = Math.sqrt(1 - s2 * s2);
    const L = 110;
    return [
      { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
      { type: 'normal', x: 140, y: 120, angle: 0 },
      ray(140, 120, 140 + 90 * s1, 120 + 90 * c1, { dashed: true }),   // まっすぐ進んだ場合
      ray(140 - L * s1, 120 - L * c1, 140, 120, { arrow: true }),
      ray(140, 120, 140 + L * s2, 120 + L * c2, { arrow: true }),
      label(146, 72, '法線'),
      label(20, 215, '法線に近づく'),   // 屈折光の矢じりと重ならないよう、水の左側に置く
    ];
  }

  // 水から空気へ。水中の入射角 15°〜35°。空気中では法線から離れる（refract-1-c2）
  function refractOut(t) {
    const theta1 = deg(15 + 20 * u(t));
    const s1 = Math.sin(theta1), c1 = Math.cos(theta1);
    const s2 = s1 * N.water, c2 = Math.sqrt(1 - s2 * s2);
    const L = 110;
    return [
      { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
      { type: 'normal', x: 140, y: 120, angle: 0 },
      ray(140, 120, 140 + 90 * s1, 120 - 90 * c1, { dashed: true }),   // まっすぐ進んだ場合
      ray(140 - L * s1, 120 + L * c1, 140, 120, { arrow: true }),
      ray(140, 120, 140 + L * s2, 120 - L * c2, { arrow: true }),
      label(100, 70, '法線'),
      label(200, 215, '法線から離れる'),
    ];
  }

  // 垂直に入る光は曲がらず、ななめの光だけ折れる。2 本が同時に進む（refract-1-c3）
  function verticalVsOblique(t) {
    const p = stage(t, 0, 0.8);
    return [
      { type: 'boundary', y: 110, upper: 'air', lower: 'glass' },
      { type: 'normal', x: 240, y: 110, angle: 0 },
      ...grow([[110, 20], [110, 220]], p),
      ...grow([[190, 30], [240, 110], [282, 220]], p),
      label(118, 70, '垂直'),
      label(196, 24, 'ななめ'),
    ];
  }

  // コインからの光が水面で折れて目に届き、のばした先にコインが浮いて見える（refract-2-c1）
  function coinLift(t) {
    const p1 = stage(t, 0, 0.35), p2 = stage(t, 0.35, 0.7), p3 = stage(t, 0.7, 0.95);
    const done = p3 >= 1;
    return [
      { type: 'boundary', y: 100, upper: 'air', lower: 'water' },
      ...grow([[160, 100], [110, 168]], p3, { dashed: true }),
      ...grow([[110, 200], [160, 100]], p1),
      ...grow([[160, 100], [205, 39]], p2),
      { type: 'eye', x: 214, y: 27 },
      { type: 'point', x: 110, y: 200 },
      ...(done ? [{ type: 'point', x: 110, y: 168 }] : []),
      label(50, 206, 'コイン'),
      ...(done ? [label(8, 172, '浮いて見える')] : []),
    ];
  }

  // 棒の先からの光が水面で折れ、見える位置が浮き上がる（refract-2-c2）
  function stickLift(t) {
    const p1 = stage(t, 0, 0.35), p2 = stage(t, 0.35, 0.7), p3 = stage(t, 0.7, 0.95);
    const done = p3 >= 1;
    return [
      { type: 'boundary', y: 100, upper: 'air', lower: 'water' },
      { type: 'object', x: 100, y: 210, height: 170, label: '棒の先' },
      ...grow([[150, 100], [100, 176]], p3, { dashed: true }),
      ...grow([[100, 210], [150, 100]], p1),
      ...grow([[150, 100], [188, 42]], p2),
      { type: 'eye', x: 196, y: 30 },
      ...(done ? [{ type: 'point', x: 100, y: 176 }, label(14, 182, '見える位置')] : []),
    ];
  }

  // 水中の入射角が 30°〜60° で変わり、臨界角（約 48.75°）を超えると全反射になる（refract-2-c3）
  function totalReflection(t) {
    const theta = 30 + 30 * u(t);   // 度
    const r = deg(theta);
    const s = Math.sin(r), co = Math.cos(r);
    const L = 110;
    const sx = 180 - L * s, sy = 100 + L * co;   // 入射光の始点（光源）
    const items = [
      { type: 'boundary', y: 100, upper: 'air', lower: 'water' },
      { type: 'normal', x: 180, y: 100, angle: 0 },
      ray(sx, sy, 180, 100, { arrow: true }),
    ];
    if (s * N.water < 1) {
      const s2 = s * N.water, c2 = Math.sqrt(1 - s2 * s2);
      items.push(
        ray(180, 100, 180 + 90 * s2, 100 - 90 * c2, { arrow: true }),
        ray(180, 100, 180 + 70 * s, 100 + 70 * co, { dashed: true, arrow: true }),   // 弱い反射光
        { type: 'lamp', x: sx, y: sy },
        label(10, 232, '空気中へ出る（一部は反射）'),   // y は光源（入射角 30° で y ≒ 195）と重ならない高さ
      );
    } else {
      items.push(
        ray(180, 100, 180 + L * s, 100 + L * co, { arrow: true }),
        { type: 'lamp', x: sx, y: sy },
        label(10, 232, '全反射！ 入射角 ＝ 反射角'),
      );
    }
    items.push(label(10, 40, '入射角 ' + Math.round(theta) + '°'));
    return items;
  }

  // ================================================================
  // 凸レンズ
  // ================================================================

  // 光軸に平行な 3 本の光がレンズに入り、焦点に集まる（lens-1-c1）
  function lensParallelRays(t) {
    const p = stage(t, 0, 0.8);
    return [
      { type: 'axis', y: 120 },
      { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
      ...grow([[20, 80], [160, 80], [280, 160]], p),
      ...grow([[20, 120], [160, 120], [290, 120]], p),
      ...grow([[20, 160], [160, 160], [280, 80]], p),
      label(10, 112, '光軸'),
      label(206, 166, '焦点'),
    ];
  }

  // ふくらみの大きいレンズほど焦点距離が短い（lens-1-c2）
  function focalLength(t) {
    const k = u(t);
    const f = 60 - 20 * k;          // 60〜40
    const bulge = 15.4 + 10 * k;    // レンズのふくらみ（figures.js の lens.bulge）
    return [
      { type: 'axis', y: 110 },
      { type: 'lens', cx: 160, cy: 110, height: 140, f, bulge },
      ray(20, 70, 160, 70, { arrow: true }),
      // (160,70) から焦点 (160+f, 110) を通る直線を x = 280 までのばす
      ray(160, 70, 280, 70 + 40 * 120 / f, { arrow: true }),
      { type: 'normal', x: 160, y: 212, angle: 90 },
      { type: 'point', x: 160 - f, y: 212 },
      { type: 'point', x: 160, y: 212 },
      { type: 'point', x: 160 + f, y: 212 },
      label(160 - f / 2 - 32, 203, '焦点距離'),
      label(160 + f / 2 - 32, 236, '焦点距離'),
    ];
  }

  // 中心を通る光はまっすぐ、焦点を通ってから入った光は光軸に平行に進む（lens-1-c3）
  function lensSpecialRays(t) {
    const p = stage(t, 0, 0.8);
    return [
      { type: 'axis', y: 120 },
      { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
      ...grow([[40, 60], [160, 120], [280, 180]], p),
      ...grow([[60, 150], [160, 75], [300, 75]], p),
      label(200, 214, 'まっすぐ'),
      label(196, 64, '光軸に平行'),
    ];
  }

  // 物体の先からの光がレンズを通って集まり、スクリーンに実像ができる（lens-2-c1）
  function realImageForms(t) {
    const p = stage(t, 0, 0.75);
    const done = p >= 1;
    return [
      { type: 'axis', y: 120 },
      { type: 'lens', cx: 160, cy: 120, height: 140, f: 40 },
      { type: 'screen', x: 220, y1: 40, y2: 200 },
      ...grow([[40, 70], [160, 70], [220, 145]], p),
      ...grow([[40, 70], [220, 145]], p),
      { type: 'object', x: 40, y: 120, height: 50, label: '物体' },
      ...(done ? [{ type: 'object', x: 220, y: 120, height: -25 }, label(232, 176, '実像')] : []),
    ];
  }

  // 物体を動かすと像の位置と大きさが変わる（lens-2-c2）。f = 40、物体の高さ 40
  function imageSizeByDistance(t) {
    const f = 40, h = 40;
    const dO = 90 - 30 * Math.cos(2 * Math.PI * t);   // 60〜120
    const dI = 1 / (1 / f - 1 / dO);                   // レンズの式
    const ox = 160 - dO, sx = 160 + dI;                 // スクリーンは像の位置に動く
    const hi = h * dI / dO;                             // 像の高さ（下向き）
    let text;
    if (Math.abs(dO - 80) < 4) text = '焦点距離の 2 倍 → 同じ大きさ';
    else if (dO < 80) text = '焦点に近づける → 像は大きい';
    else text = '遠ざける → 像は小さい';
    return [
      { type: 'axis', y: 120 },
      { type: 'lens', cx: 160, cy: 120, height: 140, f: 40 },
      { type: 'screen', x: sx, y1: 40, y2: 200 },
      ray(ox, 80, 160, 80, { arrow: true }),
      ray(160, 80, sx, 80 + dI, { arrow: true }),       // 焦点 (200,120) を通る
      ray(ox, 80, sx, 120 + hi, { arrow: true }),       // レンズの中心を通る
      { type: 'object', x: ox, y: 120, height: h },
      { type: 'object', x: sx, y: 120, height: -hi },
      label(ox - 16, 162, '物体'),   // 焦点 F の文字（y 142）と重ならないよう、1 段下に書く
      label(10, 230, text),
    ];
  }

  // 物体を焦点の内側に置くと、レンズを通った光をのばした先に大きな虚像が見える（lens-2-c3）
  function virtualImage(t) {
    const p1 = stage(t, 0, 0.4), p2 = stage(t, 0.45, 0.75);
    const done = p2 >= 1;
    return [
      { type: 'axis', y: 120 },
      { type: 'lens', cx: 170, cy: 120, height: 140, f: 50 },
      ...(done ? [{ type: 'object', x: 95, y: 120, height: 75 }] : []),
      ...grow([[170, 90], [95, 45]], p2, { dashed: true }),
      ...grow([[170, 120], [95, 45]], p2, { dashed: true }),
      ...grow([[140, 90], [170, 90], [290, 162]], p1),
      ...grow([[140, 90], [250, 200]], p1),
      { type: 'object', x: 140, y: 120, height: 30 },
      { type: 'eye', x: 300, y: 190 },
      label(112, 166, '物体'),
      ...(done ? [label(62, 166, '虚像')] : []),
    ];
  }

  const BUILD = {
    'shadow-size': shadowSize,
    'reflect-law': reflectLaw,
    'rays-spread': raysSpread,
    'shadow-forms': shadowForms,
    'light-to-eye': lightToEye,
    'bounce-to-eye': bounceToEye,
    'reflect-travel': reflectTravel,
    'reflect-names': reflectNames,
    'mirror-image-distance': mirrorImageDistance,
    'image-behind-mirror': imageBehindMirror,
    'mirror-visible': mirrorVisible,
    'refract-in': refractIn,
    'refract-out': refractOut,
    'vertical-vs-oblique': verticalVsOblique,
    'coin-lift': coinLift,
    'stick-lift': stickLift,
    'total-reflection': totalReflection,
    'lens-parallel-rays': lensParallelRays,
    'focal-length': focalLength,
    'lens-special-rays': lensSpecialRays,
    'real-image-forms': realImageForms,
    'image-size-by-distance': imageSizeByDistance,
    'virtual-image': virtualImage,
  };

  // ---- 登録口（分野ごとのファイルから動く図を足す。docs/anim-plan.md 3-1） ----

  // 登録した kind → { fn, restT, period }
  const REGISTERED = new Map();
  const KIND_RE = /^[a-z]+(-[a-z0-9]+)*$/;

  // kind の動く図を足す。frameFn(t) は item の配列を返す純粋関数（光の BUILD の関数と同じ形）
  // opts.restT: 止まっているときに見せる位置（0 以上 1 未満、既定 0）。opts.period: 1 周の時間 ms（正の数、既定 PERIOD_MS）
  // 形のまちがった名前・すでにある名前（光の 23 種をふくむ）・関数でない frameFn・範囲外の restT・正でない period は例外
  function register(kind, frameFn, opts) {
    if (typeof kind !== 'string' || !KIND_RE.test(kind)) throw new Error('動く図の名前の形がちがう: ' + kind);
    if (Object.prototype.hasOwnProperty.call(BUILD, kind) || REGISTERED.has(kind)) throw new Error('すでにある動く図: ' + kind);
    if (typeof frameFn !== 'function') throw new Error('動く図の frameFn が関数でない: ' + kind);
    const o = opts === undefined || opts === null ? {} : opts;
    if (typeof o !== 'object') throw new Error('動く図の opts がオブジェクトでない: ' + kind);
    const rest = o.restT === undefined ? 0 : o.restT;
    if (typeof rest !== 'number' || !(rest >= 0 && rest < 1)) throw new Error('動く図の restT は 0 以上 1 未満: ' + kind);
    const period = o.period === undefined ? PERIOD_MS : o.period;
    if (typeof period !== 'number' || !Number.isFinite(period) || !(period > 0)) throw new Error('動く図の period は正の数: ' + kind);
    REGISTERED.set(kind, { fn: frameFn, restT: rest, period });
    KINDS.push(kind);   // 光の 23 種の後ろに足す（画面側は KINDS.includes で見ている）
  }

  // 1 周の時間 ms（登録の opts.period、なければ PERIOD_MS）
  function periodOf(kind) {
    return REGISTERED.has(kind) ? REGISTERED.get(kind).period : PERIOD_MS;
  }

  // kind の動く図の、1 周の中の位置 t の場面。光（BUILD）→ 登録したもの の順で探す。知らない kind は例外
  function frame(kind, t) {
    let fn;
    if (Object.prototype.hasOwnProperty.call(BUILD, kind)) fn = BUILD[kind];
    else if (REGISTERED.has(kind)) fn = REGISTERED.get(kind).fn;
    else throw new Error('知らない動く図: ' + kind);
    return { width: WIDTH, height: HEIGHT, items: fn(Number(t) || 0) };
  }

  // 動きを減らす設定（matchMedia がない環境では false）
  function prefersReducedMotion() {
    try {
      return typeof root.matchMedia === 'function' && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  // ブラウザ用: div.anim-box（図の箱と、とめる／動かすボタン）を作る。最初は t = 0 の絵
  function create(kind) {
    frame(kind, 0);   // 知らない kind はここで例外
    const doc = root.document;
    const element = doc.createElement('div');
    element.className = 'anim-box';
    const box = doc.createElement('div');
    box.className = 'figure-box';
    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn-quiet anim-toggle';
    element.append(box, toggle);

    let t = restT(kind);   // いまの位置（止めたときはそこから続ける）。最初は止まった状態で意味の分かる絵
    const period = periodOf(kind);   // 1 周の時間 ms
    let t0 = 0;         // 位置 0 に当たる時刻
    let rafId = null;

    // figures が作った SVG 文字列だけを入れる（svgBox と同じ）
    function draw() { box.innerHTML = figures().sceneSvg(frame(kind, t)); }

    function tick(now) {
      if (!element.isConnected) { rafId = null; stop(); return; }   // 画面から外れたら止まる
      t = ((now - t0) % period) / period;
      draw();
      rafId = root.requestAnimationFrame(tick);
    }

    function start() {
      if (rafId !== null) return;
      toggle.textContent = 'とめる';
      rafId = root.requestAnimationFrame((now) => {
        t0 = now - t * period;   // 止めたときの t から続ける
        tick(now);
      });
    }

    function stop() {
      if (rafId !== null) root.cancelAnimationFrame(rafId);
      rafId = null;
      toggle.textContent = '動かす';
    }

    function isPlaying() { return rafId !== null; }

    toggle.addEventListener('click', () => { if (isPlaying()) stop(); else start(); });
    toggle.textContent = '動かす';
    draw();
    return { element, start, stop, isPlaying };
  }

  // helpers はテストと分野ごとのファイル（anim-physics.js など）が使う（画面側は使わない）
  const helpers = {
    clamp01, stage, lerp, grow, deg, rad2deg, u, N,
    clamp, ease, osc, tri, wrap, pathLen, along, partial, growLine, onCircle, mix, TOKEN_HEX,
  };
  // 止まっているときに見せる位置。光線が伸びていく kind は t = 0 だと光線がないので、描き終わり（0.99）を見せる
  // （「動きを減らす」設定で自動再生しないときも、光線と像が見えるようにする）
  const REST_AT_END = ['rays-spread', 'shadow-forms', 'light-to-eye', 'bounce-to-eye', 'reflect-travel',
    'image-behind-mirror', 'vertical-vs-oblique', 'coin-lift', 'stick-lift', 'lens-parallel-rays',
    'lens-special-rays', 'real-image-forms', 'virtual-image'];
  // 光の REST_AT_END → 登録の opts.restT → 0
  function restT(kind) {
    if (REST_AT_END.indexOf(kind) !== -1) return 0.99;
    if (REGISTERED.has(kind)) return REGISTERED.get(kind).restT;
    return 0;
  }

  const api = { KINDS, PERIOD_MS, frame, create, prefersReducedMotion, restT, register, periodOf, helpers };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { anim: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
