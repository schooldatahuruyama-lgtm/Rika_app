// 場面の指定（scene）→ SVG 文字列
// DOM を使わず文字列だけで組み立てる（Node でテストできるように）。
// 座標は SVG と同じく、x は右向き、y は下向きに増える。
// 画面側（ui-problems.js）は戻り値を innerHTML に入れ、g[data-item-id] にタッチ操作を付ける。
(function (root) {
  'use strict';

  // 色（デザイン資料 8 節）。赤は使わない
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
  };

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

    label(it) { return text(it.x, it.y, it.text); },

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
      default: return { x: n(it.x), y: n(it.y) };   // point / region / eye / lamp / label / normal
    }
  }

  // ドラッグ対象の透明な当たり判定（直径 56px。タッチ対象 44px 以上の約束を守る）
  function hitArea(it, ctx) {
    const c = centerOf(it, ctx);
    return tag('circle', { class: 'hit-area', cx: c.x, cy: c.y, r: HIT_R, fill: 'transparent', 'pointer-events': 'all' });
  }

  const ARROW_DEFS = '<defs><marker id="scene-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="' + COLOR.orange + '"/></marker></defs>';

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
        drawn = drawn.replace(/<text[\s\S]*?<\/text>/g, (m) => { labels += m; return ''; });
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
