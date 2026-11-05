// 場面の指定（scene）→ SVG 文字列
// DOM を使わず文字列だけで組み立てる（Node でテストできるように）。
// 座標は SVG と同じく、x は右向き、y は下向きに増える。
// 画面側（ui-problems.js）は戻り値を innerHTML に入れ、g[data-item-id] にタッチ操作を付ける。
(function (root) {
  'use strict';

  // 色（デザイン資料 8 節）。赤は不正解の強調には使わない（red は理科の色としてだけ使う）
  const COLOR = {
    blue: '#1A5CFF',
    ink: '#1B2430',
    gray: '#8A94A6',
    line: '#5A6B85',
    green: '#2E9E5B',
    orange: '#F08C2E',
    water: '#CFE4FF',
    glass: '#E6E8EC',
    lensFill: '#E8F0FF',
    bulb: '#FFD34D',
    bulbEdge: '#C98A00',
    shadow: '#4A4A4A',
    // 汎用の部品で使う理科の色（red は血液・リトマス紙などの色としてだけ使う。不正解の強調には使わない）
    red: '#D9534F',
    yellow: '#FFD34D',
    pink: '#F2A6C2',
    purple: '#8E6BD6',
    brown: '#A0623A',
    sky: '#CFE4FF',
    white: '#FFFFFF',
    lightgreen: '#C9EBD3',
    sand: '#E8D8B0',
    rock: '#B8B2A7',
  };

  // 色の指定（トークン名か #rrggbb / #rgb、'none'）を色コードにする。それ以外は fallback（トークン名か色コード）
  // 属性に書くのは、この関数を通した値だけ（知らない文字列は属性に出さない）
  const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  function paint(value, fallback) {
    if (value === 'none') return 'none';
    if (typeof value === 'string') {
      if (Object.prototype.hasOwnProperty.call(COLOR, value)) return COLOR[value];
      if (HEX_RE.test(value)) return value;
    }
    if (fallback === undefined || fallback === null) return null;
    return paint(fallback, null);
  }

  // 矢じりの色（ARROW_DEFS の scene-arrow-<token>）。この一覧にない色・#hex は ink の矢じり
  const ARROW_TOKENS = ['ink', 'blue', 'green', 'gray', 'orange', 'red'];
  function arrowMarker(color) {
    const token = (typeof color === 'string' && ARROW_TOKENS.indexOf(color) !== -1) ? color : 'ink';
    return 'url(#scene-arrow-' + token + ')';
  }

  // 物質の名前と塗りの色（空気は塗らない）
  const MEDIUM = {
    air: { name: '空気', fill: null },
    water: { name: '水', fill: COLOR.water },
    glass: { name: 'ガラス', fill: COLOR.glass },
  };

  const MIN_REGION_R = 22;     // タップ対象の半径の下限（直径 44px 以上）
  const HIT_R = 28;            // ドラッグ対象の当たり判定の半径（直径 56px）
  const NORMAL_LENGTH = 120;   // 法線の長さ
  const LABEL_SIZE = 16;

  // 法線の向きは判定（geometry.normalOf）と同じ決まりを使う。読み込み順に頼らないよう、使うときに取る
  function geometry() {
    return typeof require === 'function' ? require('./geometry.js') : root.RikaQuest.geometry;
  }

  // 文字を SVG / HTML に入れられる形にする
  function escapeText(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 数値を小数 2 けたまでの文字にする（数でないものは 0）
  function num(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0';
    const r = Math.round(v * 100) / 100;
    return String(r === 0 ? 0 : r);
  }

  // 属性の並びを文字にする。値が null / undefined / false のものは書かない
  function attrs(obj) {
    let out = '';
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === null || v === undefined || v === false) continue;
      out += ' ' + k + '="' + (typeof v === 'number' ? num(v) : escapeText(v)) + '"';
    }
    return out;
  }

  function tag(name, a) { return '<' + name + attrs(a) + '/>'; }

  function line(x1, y1, x2, y2, extra) {
    return tag('line', Object.assign({ x1, y1, x2, y2 }, extra || {}));
  }

  function text(x, y, s, extra) {
    if (s === null || s === undefined || s === '') return '';
    return '<text' + attrs(Object.assign({ x, y, 'font-size': LABEL_SIZE, fill: COLOR.ink, class: 'scene-label' }, extra || {})) +
      '>' + escapeText(s) + '</text>';
  }

  // 光線（ray と extraRays で共通）
  function rayLine(r, extraClass) {
    return line(r.x1, r.y1, r.x2, r.y2, {
      class: extraClass || null,
      stroke: COLOR.orange,
      'stroke-width': 4,
      'stroke-linecap': 'round',
      'stroke-dasharray': r.dashed ? '10 8' : null,
      'marker-end': r.arrow ? 'url(#scene-arrow)' : null,
    });
  }

  // ---- 汎用の部品の小道具 ----

  const n0 = (v, d) => { const x = Number(v); return Number.isFinite(x) ? x : (d === undefined ? 0 : d); };
  // 正の数でなければ既定値
  const pos = (v, d) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : d; };
  // 0〜1 にそろえる（数でなければ既定値）
  const clamp01 = (v, d) => { const x = Number(v); return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d; };

  // [[x,y],...] から数の点だけを取り出す → [{ x, y }]
  function pointsOf(list) {
    if (!Array.isArray(list)) return [];
    return list.filter((p) => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])))
      .map((p) => ({ x: Number(p[0]), y: Number(p[1]) }));
  }
  function pointsAttr(ps) { return ps.map((p) => num(p.x) + ',' + num(p.y)).join(' '); }
  function average(ps) {
    if (!ps.length) return { x: 0, y: 0 };
    return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length };
  }

  // 形の部品の文字: 中央（labelPos が 'above' なら上端の 8px 上、'below' なら下端の 20px 下）
  function shapeLabel(it, cx, cy, top, bottom) {
    if (it.labelPos === 'above') return text(cx, top - 8, it.label, { 'text-anchor': 'middle' });
    if (it.labelPos === 'below') return text(cx, bottom + 20, it.label, { 'text-anchor': 'middle' });
    return text(cx, cy, it.label, { 'text-anchor': 'middle', 'dominant-baseline': 'central' });
  }

  // 形の部品の塗りと線（fill 既定 white、stroke 既定 ink、太さ 2）
  function shapePaint(it) {
    return { fill: paint(it.fill, 'white'), stroke: paint(it.stroke, 'ink'), 'stroke-width': 2 };
  }

  // 文字の大きさ・寄せ方・色（text と label で共通）。指定のないものは書かない（text() の既定のまま）
  const ANCHORS = ['start', 'middle', 'end'];
  function textStyle(it) {
    const out = {};
    if (it.size !== undefined && it.size !== null && Number.isFinite(Number(it.size))) out['font-size'] = Math.max(12, Number(it.size));
    if (it.color !== undefined && it.color !== null) out.fill = paint(it.color, 'ink');
    if (ANCHORS.indexOf(it.anchor) !== -1) out['text-anchor'] = it.anchor;
    return out;
  }

  // 文字（text と label で共通）。bg: true なら文字の後ろに白い角丸の下地を描く（写真の上でも読めるように）
  // 下地の幅は文字数 × 文字の大きさ（全角）で概算し、左右 4px・上下 2px の余白。y は文字のベースライン
  // 下地の rect は text の直前に出す（sceneSvg が文字といっしょに文字の層へ移す）
  function styledText(x, y, s, st, bg) {
    const t = text(x, y, s, st);
    if (!bg || !t) return t;
    const size = Number(st['font-size']) || LABEL_SIZE;
    const w = Array.from(String(s)).length * size;
    const anchor = st['text-anchor'] || 'start';
    const left = n0(x) - (anchor === 'middle' ? w / 2 : anchor === 'end' ? w : 0);
    const top = n0(y) - size * 0.85;
    return tag('rect', {
      class: 'text-bg', x: left - 4, y: top - 2, width: w + 8, height: size + 4,
      rx: 4, fill: 'white', 'fill-opacity': 0.85,
    }) + t;
  }

  // 画像の src: プロジェクトの assets/ の中の画像だけ（.. や // を含むもの、ほかの場所・形式は描かない）
  const IMAGE_SRC_RE = /^assets\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|svg)$/;
  function imageSrc(src) {
    if (typeof src !== 'string' || !IMAGE_SRC_RE.test(src)) return null;
    if (src.indexOf('..') !== -1 || src.indexOf('//') !== -1) return null;
    return src;
  }

  // 容器（ビーカー・試験管）の中の液体: 左右 left〜right、底 bottom、液面 top。底の角は半径 r で丸める
  function liquidShape(left, right, bottom, top, r, color) {
    const h = bottom - top;
    if (!(h > 0)) return '';
    const rr = Math.min(r, h, (right - left) / 2);
    const d = 'M' + num(left) + ',' + num(top) +
      ' L' + num(left) + ',' + num(bottom - rr) +
      ' Q' + num(left) + ',' + num(bottom) + ' ' + num(left + rr) + ',' + num(bottom) +
      ' L' + num(right - rr) + ',' + num(bottom) +
      ' Q' + num(right) + ',' + num(bottom) + ' ' + num(right) + ',' + num(bottom - rr) +
      ' L' + num(right) + ',' + num(top) + ' Z';
    // 液面は少し波打った線
    const w = right - left;
    const wave = 'M' + num(left) + ',' + num(top) +
      ' Q' + num(left + w / 4) + ',' + num(top - 3) + ' ' + num(left + w / 2) + ',' + num(top) +
      ' T' + num(right) + ',' + num(top);
    return tag('path', { d, fill: color, class: 'liquid' }) +
      tag('path', { d: wave, fill: 'none', stroke: COLOR.line, 'stroke-width': 1.5, class: 'liquid-surface' });
  }

  const TUBE_WIDTH = 24;
  const TUBE_HEIGHT = 90;      // 試験管の高さの既定
  const BEAKER_WIDTH = 70;
  const BEAKER_HEIGHT = 80;
  const FLAME_HEIGHT = 36;

  // 回路図の記号（x, y を中心に幅 40）。導線をつなぐ端は (x ± 20, y)
  const SYMBOL = {
    // 電池: 長い線（＋）と短く太い線（−）
    battery(x, y) {
      const ink = { stroke: COLOR.ink, 'stroke-width': 2 };
      return line(x - 20, y, x - 4, y, ink) + line(x + 4, y, x + 20, y, ink) +
        line(x - 4, y - 14, x - 4, y + 14, { stroke: COLOR.ink, 'stroke-width': 2 }) +
        line(x + 4, y - 7, x + 4, y + 7, { stroke: COLOR.ink, 'stroke-width': 5 });
    },
    // 豆電球: 丸と ×
    bulb(x, y) {
      const ink = { stroke: COLOR.ink, 'stroke-width': 2 };
      const d = 12 / Math.SQRT2;
      return line(x - 20, y, x - 12, y, ink) + line(x + 12, y, x + 20, y, ink) +
        tag('circle', { cx: x, cy: y, r: 12, fill: COLOR.white, stroke: COLOR.ink, 'stroke-width': 2 }) +
        line(x - d, y - d, x + d, y + d, ink) + line(x - d, y + d, x + d, y - d, ink);
    },
    // 抵抗: 長方形 36×14
    resistor(x, y) {
      const ink = { stroke: COLOR.ink, 'stroke-width': 2 };
      return line(x - 20, y, x - 18, y, ink) + line(x + 18, y, x + 20, y, ink) +
        tag('rect', { x: x - 18, y: y - 7, width: 36, height: 14, fill: COLOR.white, stroke: COLOR.ink, 'stroke-width': 2 });
    },
    // スイッチ: 開いた斜め線
    switch(x, y) {
      const ink = { stroke: COLOR.ink, 'stroke-width': 2, 'stroke-linecap': 'round' };
      return line(x - 20, y, x - 10, y, ink) + line(x + 10, y, x + 20, y, ink) +
        tag('circle', { cx: x - 10, cy: y, r: 2.5, fill: COLOR.ink }) +
        tag('circle', { cx: x + 10, cy: y, r: 2.5, fill: COLOR.ink }) +
        line(x - 10, y, x + 10, y - 12, ink);
    },
    ammeter(x, y) { return meter(x, y, 'A'); },
    voltmeter(x, y) { return meter(x, y, 'V'); },
  };
  // 電流計・電圧計: 丸の中に文字
  function meter(x, y, letter) {
    const ink = { stroke: COLOR.ink, 'stroke-width': 2 };
    return line(x - 20, y, x - 14, y, ink) + line(x + 14, y, x + 20, y, ink) +
      tag('circle', { cx: x, cy: y, r: 14, fill: COLOR.white, stroke: COLOR.ink, 'stroke-width': 2 }) +
      text(x, y, letter, { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 'bold' });
  }

  // 回転（度、時計回り）。0 や数でないときは g で包まない
  function rotated(body, deg, x, y) {
    const a = Number(deg);
    if (!Number.isFinite(a) || a === 0) return body;
    return '<g' + attrs({ transform: 'rotate(' + num(a) + ' ' + num(x) + ' ' + num(y) + ')' }) + '>' + body + '</g>';
  }

  // item の種類ごとの描き方。ctx = { width, height, selected }
  const DRAW = {
    // 鏡: 太い線＋裏側（法線と反対の側）に短い斜線
    mirror(it) {
      let out = line(it.x1, it.y1, it.x2, it.y2, { stroke: COLOR.ink, 'stroke-width': 6, 'stroke-linecap': 'round' });
      const dx = it.x2 - it.x1, dy = it.y2 - it.y1;
      const l = Math.hypot(dx, dy);
      if (!(l > 0)) return out;
      const n = geometry().normalOf({ kind: 'mirror', x1: it.x1, y1: it.y1, x2: it.x2, y2: it.y2 });
      const back = { x: -n.x, y: -n.y };
      const u = { x: dx / l, y: dy / l };
      let hatch = '';
      for (let t = 8; t <= l - 4; t += 16) {
        const px = it.x1 + u.x * t + back.x * 3, py = it.y1 + u.y * t + back.y * 3;
        hatch += line(px, py, px + back.x * 10 - u.x * 6, py + back.y * 10 - u.y * 6,
          { stroke: COLOR.ink, 'stroke-width': 2 });
      }
      return out + '<g class="mirror-hatch">' + hatch + '</g>';
    },

    // 境界面: 下側（と、空気でなければ上側）を物質の色で塗り、境界の線と物質の名前を書く
    boundary(it, ctx) {
      const upper = MEDIUM[it.upper] || MEDIUM.air;
      const lower = MEDIUM[it.lower] || MEDIUM.water;
      const y = Number(it.y);
      let out = '';
      if (upper.fill) out += tag('rect', { x: 0, y: 0, width: ctx.width, height: Math.max(0, y), fill: upper.fill, class: 'medium medium-upper' });
      if (lower.fill) out += tag('rect', { x: 0, y, width: ctx.width, height: Math.max(0, ctx.height - y), fill: lower.fill, class: 'medium medium-lower' });
      out += line(0, y, ctx.width, y, { stroke: COLOR.line, 'stroke-width': 2 });
      out += text(ctx.width - 8, y - 8, upper.name, { 'text-anchor': 'end', fill: COLOR.line });
      out += text(ctx.width - 8, y + 22, lower.name, { 'text-anchor': 'end', fill: COLOR.line });
      return out;
    },

    // 凸レンズ: 両側にふくらんだ形、中心の縦線、焦点 F（左）・F'（右）。bulge（任意）でふくらみを指定できる
    lens(it) {
      const cx = Number(it.cx), cy = Number(it.cy);
      const half = (Number(it.height) || 120) / 2;
      // 2 次ベジエの制御点（ふくらみはこの半分）
      const bulge = (it.bulge !== undefined && it.bulge !== null) ? Number(it.bulge) * 2 : Math.max(8, half * 0.22) * 2;
      const top = num(cy - half), bottom = num(cy + half);
      const d = 'M' + num(cx) + ',' + top +
        ' Q' + num(cx + bulge) + ',' + num(cy) + ' ' + num(cx) + ',' + bottom +
        ' Q' + num(cx - bulge) + ',' + num(cy) + ' ' + num(cx) + ',' + top + ' Z';
      let out = tag('path', { d, fill: COLOR.lensFill, stroke: COLOR.blue, 'stroke-width': 3, class: 'lens-body' });
      out += line(cx, cy - half, cx, cy + half, { stroke: COLOR.blue, 'stroke-width': 1.5, 'stroke-dasharray': '4 4', class: 'lens-center' });
      const f = Number(it.f);
      if (Number.isFinite(f) && f !== 0) {
        for (const [fx, name] of [[cx - Math.abs(f), 'F'], [cx + Math.abs(f), "F'"]]) {
          out += tag('circle', { cx: fx, cy, r: 4, fill: COLOR.ink, class: 'focus' });
          out += text(fx, cy + 22, name, { 'text-anchor': 'middle' });
        }
      }
      return out;
    },

    // 光軸: 細い一点鎖線（場面の横幅いっぱい）
    axis(it, ctx) {
      return line(0, it.y, ctx.width, it.y, { stroke: COLOR.gray, 'stroke-width': 1.5, 'stroke-dasharray': '12 4 2 4' });
    },

    // 物体（または像）: (x, y) から (x, y - height) への矢印。height が負なら下向き
    object(it) {
      const x = Number(it.x), y = Number(it.y), h = Number(it.height) || 0;
      const tipY = y - h;
      const s = h >= 0 ? 1 : -1;   // 1 = 上向き
      let out = line(x, y, x, tipY + s * 10, { stroke: COLOR.green, 'stroke-width': 4, 'stroke-linecap': 'round' });
      out += tag('polygon', {
        points: num(x) + ',' + num(tipY) + ' ' + num(x - 8) + ',' + num(tipY + s * 14) + ' ' + num(x + 8) + ',' + num(tipY + s * 14),
        fill: COLOR.green,
      });
      out += text(x, s > 0 ? y + 22 : y - 10, it.label, { 'text-anchor': 'middle' });
      return out;
    },

    // 光線: 橙の線。arrow で矢じり、dashed で点線
    ray(it) { return rayLine(it); },

    // 法線: (x, y) を通る点線。angle は度で 0 が真上、正の向きは時計回り
    normal(it) {
      const a = (Number(it.angle) || 0) * Math.PI / 180;
      const hx = Math.sin(a) * NORMAL_LENGTH / 2, hy = -Math.cos(a) * NORMAL_LENGTH / 2;
      const x = Number(it.x), y = Number(it.y);
      return line(x - hx, y - hy, x + hx, y + hy, { stroke: COLOR.gray, 'stroke-width': 2, 'stroke-dasharray': '6 6' });
    },

    point(it) {
      return tag('circle', { cx: it.x, cy: it.y, r: 6, fill: COLOR.blue }) +
        text(Number(it.x) + 10, Number(it.y) - 10, it.label);
    },

    // 選ぶ場所: 半透明の丸（タップ対象）。選ばれていると濃くなる
    region(it, ctx) {
      const r = Math.max(MIN_REGION_R, Number(it.r) || 0);
      return tag('circle', {
        cx: it.x, cy: it.y, r, fill: COLOR.blue, 'fill-opacity': ctx.selected ? 0.45 : 0.15,
        stroke: COLOR.blue, 'stroke-width': 2, class: 'region-hit',
      }) + text(it.x, it.y, it.label, { 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    },

    // 文字。size・anchor・color・bg は任意（指定がなければ 16px・左寄せ・ink・下地なし）
    label(it) { return styledText(it.x, it.y, it.text, textStyle(it), it.bg); },

    // 目: 白い楕円と黒目
    eye(it) {
      return tag('ellipse', { cx: it.x, cy: it.y, rx: 16, ry: 10, fill: '#FFFFFF', stroke: COLOR.ink, 'stroke-width': 2 }) +
        tag('circle', { cx: it.x, cy: it.y, r: 5, fill: COLOR.ink });
    },

    // 電球（光源）: 丸い球、口金、まわりの短い光
    lamp(it) {
      const x = Number(it.x), y = Number(it.y);
      let out = '';
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        out += line(x + Math.cos(a) * 16, y + Math.sin(a) * 16, x + Math.cos(a) * 22, y + Math.sin(a) * 22,
          { stroke: COLOR.bulbEdge, 'stroke-width': 2, 'stroke-linecap': 'round' });
      }
      out += tag('circle', { cx: x, cy: y, r: 12, fill: COLOR.bulb, stroke: COLOR.bulbEdge, 'stroke-width': 2 });
      return out;
    },

    // スクリーン: 太い縦線と名前
    screen(it) {
      const top = Math.min(Number(it.y1), Number(it.y2));
      return line(it.x, it.y1, it.x, it.y2, { stroke: COLOR.line, 'stroke-width': 8, 'stroke-linecap': 'round' }) +
        text(it.x, top - 10, 'スクリーン', { 'text-anchor': 'middle' });
    },

    // 影: スクリーン上（x の位置）の y1〜y2 にできる影。濃い灰色の半透明の太い線
    shadow(it) {
      return line(it.x, it.y1, it.x, it.y2, { stroke: COLOR.shadow, 'stroke-width': 12, opacity: 0.55, 'stroke-linecap': 'butt' });
    },

    // ---- 汎用の部品（座標と色だけで描く。全単元で使う） ----

    // 四角: (x, y) が左上
    rect(it) {
      const x = n0(it.x), y = n0(it.y), w = Math.max(0, n0(it.width)), h = Math.max(0, n0(it.height));
      const rx = Number(it.rx);
      return tag('rect', Object.assign({ x, y, width: w, height: h, rx: Number.isFinite(rx) && rx > 0 ? rx : null }, shapePaint(it))) +
        shapeLabel(it, x + w / 2, y + h / 2, y, y + h);
    },

    // 丸: (x, y) が中心
    circle(it) {
      const x = n0(it.x), y = n0(it.y), r = Math.max(0, n0(it.r));
      return tag('circle', Object.assign({ cx: x, cy: y, r }, shapePaint(it))) + shapeLabel(it, x, y, y - r, y + r);
    },

    // 楕円: (x, y) が中心
    ellipse(it) {
      const x = n0(it.x), y = n0(it.y), rx = Math.max(0, n0(it.rx)), ry = Math.max(0, n0(it.ry));
      return tag('ellipse', Object.assign({ cx: x, cy: y, rx, ry }, shapePaint(it))) + shapeLabel(it, x, y, y - ry, y + ry);
    },

    // 閉じた多角形。文字は重心（点の平均）
    polygon(it) {
      const ps = pointsOf(it.points);
      if (ps.length < 2) return '';
      const c = average(ps);
      return tag('polygon', Object.assign({ points: pointsAttr(ps) }, shapePaint(it))) +
        text(c.x, c.y, it.label, { 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    },

    // 折れ線（点 2 つなら直線）。arrow で終点に同じ色の矢じり、dashed で点線
    line(it) {
      const ps = pointsOf(it.points);
      if (ps.length < 2) return '';
      const a = {
        fill: 'none',
        stroke: paint(it.color, 'ink'),
        'stroke-width': pos(it.width, 3),
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-dasharray': it.dashed ? '8 6' : null,
        'marker-end': it.arrow ? arrowMarker(it.color) : null,
      };
      if (ps.length === 2) {
        delete a.fill;
        return line(ps[0].x, ps[0].y, ps[1].x, ps[1].y, a);
      }
      return tag('polyline', Object.assign({ points: pointsAttr(ps) }, a));
    },

    // 文字だけ（label の拡張版）。size は下限 12、anchor は start / middle / end、bold で太字、bg で白い下地
    text(it) {
      const st = Object.assign({ 'font-size': LABEL_SIZE, 'text-anchor': 'start' }, textStyle(it));
      if (it.bold) st['font-weight'] = 'bold';
      return styledText(it.x, it.y, it.text, st, it.bg);
    },

    // 画像（写真ふうの図）: (x, y) が左上、既定は場面いっぱい。縦横比は保ったまま枠に収める
    // src は assets/ の中の画像だけ（それ以外は何も描かない）。opacity は 0〜1（任意）
    image(it, ctx) {
      const src = imageSrc(it.src);
      if (!src) return '';
      const hasOpacity = it.opacity !== undefined && it.opacity !== null && it.opacity !== '';
      return tag('image', {
        href: src,
        x: n0(it.x),
        y: n0(it.y),
        width: pos(it.width, ctx.width),
        height: pos(it.height, ctx.height),
        preserveAspectRatio: 'xMidYMid meet',
        opacity: hasOpacity ? clamp01(it.opacity, null) : null,
      });
    },

    // ビーカー: (x, y) が底の中央。上が開いた U 字の容器と、level（0〜1）の高さまでの液体
    beaker(it) {
      const x = n0(it.x), y = n0(it.y);
      const w = pos(it.width, BEAKER_WIDTH), h = pos(it.height, BEAKER_HEIGHT);
      const level = clamp01(it.level, 0.6);
      const left = x - w / 2, right = x + w / 2, top = y - h, r = 6;
      let out = level > 0 ? liquidShape(left, right, y, y - h * level, r, paint(it.liquid, 'water')) : '';
      const d = 'M' + num(left - 5) + ',' + num(top) + ' L' + num(left) + ',' + num(top + 5) +
        ' L' + num(left) + ',' + num(y - r) +
        ' Q' + num(left) + ',' + num(y) + ' ' + num(left + r) + ',' + num(y) +
        ' L' + num(right - r) + ',' + num(y) +
        ' Q' + num(right) + ',' + num(y) + ' ' + num(right) + ',' + num(y - r) +
        ' L' + num(right) + ',' + num(top);
      out += tag('path', { d, fill: 'none', stroke: COLOR.ink, 'stroke-width': 2, 'stroke-linejoin': 'round', class: 'beaker-body' });
      return out + text(x, y + 20, it.label, { 'text-anchor': 'middle' });
    },

    // 試験管: (x, y) が底の中央。幅 24、底が丸い。tilt（度、時計回り）で底の中央を中心に傾ける
    tube(it) {
      const x = n0(it.x), y = n0(it.y);
      const h = pos(it.height, TUBE_HEIGHT), half = TUBE_WIDTH / 2;
      const level = clamp01(it.level, 0.6);
      const left = x - half, right = x + half, top = y - h;
      let body = level > 0 ? liquidShape(left, right, y, y - h * level, half, paint(it.liquid, 'water')) : '';
      const d = 'M' + num(left) + ',' + num(top) + ' L' + num(left) + ',' + num(y - half) +
        ' A' + num(half) + ' ' + num(half) + ' 0 0 0 ' + num(right) + ',' + num(y - half) +
        ' L' + num(right) + ',' + num(top);
      body += tag('path', { d, fill: 'none', stroke: COLOR.ink, 'stroke-width': 2, class: 'tube-body' });
      // 文字は傾けない（文字の層へ移しても場所が変わらないよう、回転の外に置く）
      return rotated(body, it.tilt, x, y) + text(x, y + 20, it.label, { 'text-anchor': 'middle' });
    },

    // 炎: (x, y) が炎の底の中央、高さ 36。外炎（orange）と内炎（yellow）の涙型
    flame(it) {
      const x = n0(it.x), y = n0(it.y);
      const drop = (hgt, hw) => {
        const tip = y - hgt, mid = y - hgt * 0.28;
        return 'M' + num(x) + ',' + num(tip) +
          ' C' + num(x + hw * 0.3) + ',' + num(y - hgt * 0.72) + ' ' + num(x + hw) + ',' + num(y - hgt * 0.5) + ' ' + num(x + hw) + ',' + num(mid) +
          ' A' + num(hw) + ' ' + num(hgt * 0.28) + ' 0 0 1 ' + num(x - hw) + ',' + num(mid) +
          ' C' + num(x - hw) + ',' + num(y - hgt * 0.5) + ' ' + num(x - hw * 0.3) + ',' + num(y - hgt * 0.72) + ' ' + num(x) + ',' + num(tip) + ' Z';
      };
      return tag('path', { d: drop(FLAME_HEIGHT, 13), fill: COLOR.orange, class: 'flame-outer' }) +
        tag('path', { d: drop(FLAME_HEIGHT * 0.55, 6), fill: COLOR.yellow, class: 'flame-inner' }) +
        text(x, y + 20, it.label, { 'text-anchor': 'middle' });
    },

    // 回路図の記号: kind = battery | bulb | resistor | switch | ammeter | voltmeter（知らない kind は丸だけ）
    // rotate（度）で回す。導線は line で描く（記号の端は中心から ±20）
    symbol(it) {
      const x = n0(it.x), y = n0(it.y);
      const draw = (typeof it.kind === 'string' && Object.prototype.hasOwnProperty.call(SYMBOL, it.kind)) ? SYMBOL[it.kind] : null;
      const body = draw ? draw(x, y)
        : tag('circle', { cx: x, cy: y, r: 14, fill: COLOR.white, stroke: COLOR.ink, 'stroke-width': 2 });
      return rotated(body, it.rotate, x, y) + text(x, y + 24, it.label, { 'text-anchor': 'middle' });
    },

    // 矢印（力や運動）: (x1, y1) → (x2, y2)。文字は中点の 10px 上
    arrow(it) {
      const x1 = n0(it.x1), y1 = n0(it.y1), x2 = n0(it.x2), y2 = n0(it.y2);
      return line(x1, y1, x2, y2, {
        stroke: paint(it.color, 'ink'),
        'stroke-width': pos(it.width, 3),
        'stroke-linecap': 'round',
        'marker-end': arrowMarker(it.color),
      }) + text((x1 + x2) / 2, (y1 + y2) / 2 - 10, it.label, { 'text-anchor': 'middle' });
    },
  };

  // item の中心（ドラッグの当たり判定を置く場所）
  function centerOf(it, ctx) {
    const n = (v) => Number(v) || 0;
    switch (it.type) {
      case 'object': return { x: n(it.x), y: n(it.y) - n(it.height) / 2 };
      case 'screen':
      case 'shadow': return { x: n(it.x), y: (n(it.y1) + n(it.y2)) / 2 };
      case 'mirror':
      case 'ray': return { x: (n(it.x1) + n(it.x2)) / 2, y: (n(it.y1) + n(it.y2)) / 2 };
      case 'lens': return { x: n(it.cx), y: n(it.cy) };
      case 'boundary':
      case 'axis': return { x: ctx.width / 2, y: n(it.y) };
      case 'rect': return { x: n(it.x) + n(it.width) / 2, y: n(it.y) + n(it.height) / 2 };
      case 'beaker': return { x: n(it.x), y: n(it.y) - pos(it.height, BEAKER_HEIGHT) / 2 };
      case 'tube': {
        // 本体は底の中央 (x, y) を中心に tilt 度（時計回り）回っているので、中央の点も同じだけ回す
        const half = pos(it.height, TUBE_HEIGHT) / 2;
        const a = (n(it.tilt)) * Math.PI / 180;
        return { x: n(it.x) + half * Math.sin(a), y: n(it.y) - half * Math.cos(a) };
      }
      case 'flame': return { x: n(it.x), y: n(it.y) - FLAME_HEIGHT / 2 };
      case 'polygon':
      case 'line': return average(pointsOf(it.points));
      case 'arrow': return { x: (n(it.x1) + n(it.x2)) / 2, y: (n(it.y1) + n(it.y2)) / 2 };
      // 画像は矩形の中心（ドラッグ対象にすることは想定しないが、落とさない）
      case 'image': return { x: n(it.x) + pos(it.width, ctx.width) / 2, y: n(it.y) + pos(it.height, ctx.height) / 2 };
      // point / region / eye / lamp / label / normal / circle / ellipse / symbol / text
      default: return { x: n(it.x), y: n(it.y) };
    }
  }

  // ドラッグ対象の透明な当たり判定（直径 56px。タッチ対象 44px 以上の約束を守る）
  function hitArea(it, ctx) {
    const c = centerOf(it, ctx);
    return tag('circle', { class: 'hit-area', cx: c.x, cy: c.y, r: HIT_R, fill: 'transparent', 'pointer-events': 'all' });
  }

  // 矢じり。scene-arrow（橙）は光線用。scene-arrow-<token> は汎用の line / arrow 用（色ごと）
  function arrowMarkerDef(id, color) {
    return '<marker id="' + id + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="' + color + '"/></marker>';
  }
  const ARROW_DEFS = '<defs>' + arrowMarkerDef('scene-arrow', COLOR.orange) +
    ARROW_TOKENS.map((t) => arrowMarkerDef('scene-arrow-' + t, COLOR[t])).join('') + '</defs>';

  // 場面を SVG 文字列にする。items は配列の順に描く（後のものが上に重なる）。知らない type は飛ばす
  // 文字（text）は光線などに隠れないよう、最後に文字の層（scene-labels、タップは下へ通す）にまとめて描く。
  // ただしドラッグ対象の文字はいっしょに動くよう、その item の中に残す。
  // opts: { highlightRegion: id|null, draggableId: id|null, extraRays: [{x1,y1,x2,y2}] }
  function sceneSvg(scene, opts) {
    const o = opts || {};
    const width = Number(scene && scene.width) || 320;
    const height = Number(scene && scene.height) || 240;
    const items = (scene && Array.isArray(scene.items)) ? scene.items : [];
    let body = '';
    let labels = '';
    for (const it of items) {
      if (!it || !Object.prototype.hasOwnProperty.call(DRAW, it.type)) continue;
      const hasId = it.id !== undefined && it.id !== null && it.id !== '';
      const selected = it.type === 'region' && hasId && it.id === o.highlightRegion;
      const draggable = hasId && it.id === o.draggableId;
      const cls = 'item item-' + it.type + (selected ? ' is-selected' : '') + (draggable ? ' is-draggable' : '');
      let drawn = DRAW[it.type](it, { width, height, selected });
      if (!draggable) {
        // 文字の白い下地（rect.text-bg）は直後の文字といっしょに移す
        drawn = drawn.replace(/(?:<rect class="text-bg"[^>]*\/>)?<text[\s\S]*?<\/text>/g, (m) => { labels += m; return ''; });
      }
      body += '<g' + attrs({
        'data-item-id': hasId ? String(it.id) : null,
        'data-item-type': it.type,
        class: cls,
        style: draggable ? 'cursor:grab' : null,
      }) + '>' + (draggable ? hitArea(it, { width, height }) : '') + drawn + '</g>';
    }
    const extra = Array.isArray(o.extraRays) ? o.extraRays : [];
    if (extra.length) {
      body += '<g class="extra-rays">' + extra.filter(Boolean).map((r) => rayLine(Object.assign({ arrow: true }, r), 'extra-ray')).join('') + '</g>';
    }
    if (labels) body += '<g class="scene-labels" pointer-events="none">' + labels + '</g>';
    return '<svg' + attrs({
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 ' + num(width) + ' ' + num(height),
      width: '100%',
      class: 'scene',
      role: 'img',
      'font-family': 'system-ui, sans-serif',
    }) + '>' + ARROW_DEFS + body + '</svg>';
  }

  const api = { sceneSvg, escapeText, ITEM_TYPES: Object.keys(DRAW) };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { figures: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
