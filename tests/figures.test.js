// tests/figures.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const figures = require('../js/figures.js');
const mascot = require('../js/mascot.js');
const fs = require('node:fs'); const path = require('node:path');

const regionScene = { width: 320, height: 240, items: [{ type: 'region', id: 'r1', x: 100, y: 100, r: 30, label: 'A' }] };

test('sceneSvg: 320×240 の場面は viewBox="0 0 320 240"', () => {
  const s = figures.sceneSvg({ width: 320, height: 240, items: [] });
  assert.ok(s.startsWith('<svg'));
  assert.ok(s.includes('viewBox="0 0 320 240"'));
  assert.ok(s.endsWith('</svg>'));
});

test('sceneSvg: region に data-item-id と data-item-type が付く', () => {
  const s = figures.sceneSvg(regionScene);
  assert.ok(s.includes('data-item-id="r1"'));
  assert.ok(s.includes('data-item-type="region"'));
});

test('sceneSvg: id のない item には data-item-id を付けない', () => {
  const s = figures.sceneSvg({ width: 100, height: 100, items: [{ type: 'axis', y: 50 }] });
  assert.ok(s.includes('data-item-type="axis"'));
  assert.ok(!s.includes('data-item-id'));
});

test('sceneSvg: < を含む label はエスケープされる', () => {
  const s = figures.sceneSvg({ width: 100, height: 100, items: [{ type: 'label', x: 10, y: 10, text: 'a<b & "c"' }] });
  assert.ok(s.includes('a&lt;b &amp; &quot;c&quot;'));
  assert.ok(!s.includes('a<b'));
});

test('escapeText: 特別な文字をすべて置きかえる', () => {
  assert.equal(figures.escapeText(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
  assert.equal(figures.escapeText(null), '');
  assert.equal(figures.escapeText(3), '3');
});

test('sceneSvg: highlightRegion の region に is-selected が付く', () => {
  const s = figures.sceneSvg(regionScene, { highlightRegion: 'r1' });
  assert.match(s, /<g [^>]*data-item-id="r1"[^>]*class="[^"]*is-selected/);
  assert.ok(!figures.sceneSvg(regionScene).includes('is-selected'));
});

test('sceneSvg: draggableId の item に is-draggable が付く', () => {
  const scene = { width: 320, height: 240, items: [{ type: 'object', id: 'obj', x: 60, y: 160, height: 50, label: '物体' }] };
  const s = figures.sceneSvg(scene, { draggableId: 'obj' });
  assert.match(s, /<g [^>]*data-item-id="obj"[^>]*class="[^"]*is-draggable/);
});

test('sceneSvg: draggableId の item だけ、先頭に透明な当たり判定（r ≥ 22）が付く', () => {
  const scene = { width: 320, height: 240, items: [
    { type: 'object', id: 'obj', x: 60, y: 160, height: 50, label: '物体' },
    { type: 'point', id: 'p', x: 200, y: 100 },
  ] };
  assert.ok(!figures.sceneSvg(scene).includes('hit-area'));
  const s = figures.sceneSvg(scene, { draggableId: 'obj' });
  const m = s.match(/<g [^>]*data-item-id="obj"[^>]*>(<circle class="hit-area" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"[^>]*\/>)/);
  assert.ok(m, '当たり判定が g の先頭にある');
  assert.equal(m[2], '60');
  assert.equal(m[3], '135');   // object は矢印の中ほど (y - height/2)
  assert.ok(Number(m[4]) >= 22);
  assert.ok(m[1].includes('fill="transparent"') && m[1].includes('pointer-events="all"'));
  assert.equal(s.split('hit-area').length - 1, 1, 'ドラッグ対象でない item には付かない');
});

test('sceneSvg: extraRays は線として描かれる', () => {
  const s = figures.sceneSvg({ width: 320, height: 240, items: [] }, { extraRays: [{ x1: 1, y1: 2, x2: 300, y2: 200 }] });
  assert.ok(s.includes('<line x1="1" y1="2" x2="300" y2="200"'));
});

// type ごとの最小の item（ITEM_TYPES のすべてを描けることを確かめる表）
const MIN_ITEMS = {
  mirror: { type: 'mirror', id: 'm', x1: 40, y1: 200, x2: 280, y2: 200 },
  boundary: { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
  lens: { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
  axis: { type: 'axis', y: 120 },
  object: { type: 'object', id: 'o', x: 50, y: 120, height: 40, label: '物体' },
  ray: { type: 'ray', x1: 10, y1: 10, x2: 160, y2: 200, arrow: true, dashed: true },
  normal: { type: 'normal', x: 160, y: 200, angle: 0 },
  point: { type: 'point', id: 'p', x: 30, y: 30, label: 'P' },
  region: { type: 'region', id: 'r', x: 200, y: 60, r: 10, label: 'イ' },
  label: { type: 'label', x: 5, y: 230, text: '鏡' },
  eye: { type: 'eye', x: 290, y: 40 },
  lamp: { type: 'lamp', x: 20, y: 60 },
  screen: { type: 'screen', x: 300, y1: 40, y2: 200 },
  shadow: { type: 'shadow', x: 300, y1: 60, y2: 180 },
  rect: { type: 'rect', x: 10, y: 10, width: 40, height: 20 },
  circle: { type: 'circle', x: 60, y: 60, r: 10 },
  ellipse: { type: 'ellipse', x: 80, y: 80, rx: 20, ry: 10 },
  polygon: { type: 'polygon', points: [[0, 0], [20, 0], [10, 20]] },
  line: { type: 'line', points: [[0, 0], [50, 50]] },
  text: { type: 'text', x: 10, y: 10, text: 'あ' },
  beaker: { type: 'beaker', x: 100, y: 200 },
  tube: { type: 'tube', x: 200, y: 200 },
  flame: { type: 'flame', x: 150, y: 230 },
  symbol: { type: 'symbol', x: 160, y: 120, kind: 'battery' },
  arrow: { type: 'arrow', x1: 10, y1: 100, x2: 80, y2: 100 },
  image: { type: 'image', src: 'assets/images/x/y.png' },
};

test('sceneSvg: ITEM_TYPES のすべての item を描ける', () => {
  assert.deepEqual([...figures.ITEM_TYPES].sort(), Object.keys(MIN_ITEMS).sort(), '表と ITEM_TYPES が同じ');
  const items = figures.ITEM_TYPES.map(t => MIN_ITEMS[t]);
  const s = figures.sceneSvg({ width: 320, height: 240, items });
  for (const it of items) assert.ok(s.includes(`data-item-type="${it.type}"`), it.type);
  // 1 つずつ描いて、何か描かれること（文字だけの部品は文字の層に入る）
  const empty = figures.sceneSvg({ width: 320, height: 240, items: [] });
  for (const it of items) {
    const one = figures.sceneSvg({ width: 320, height: 240, items: [it] });
    assert.notEqual(one.replace(/<g [^>]*data-item-type="[^"]+"[^>]*><\/g>/, ''), empty, it.type + ' が何も描かない');
  }
  assert.ok(s.includes('marker-end="url(#scene-arrow)"'));
  assert.ok(s.includes('<marker id="scene-arrow"'));
  assert.ok(s.includes('r="22"'), 'region の半径は 22 以上');
  assert.ok(s.includes('スクリーン'));
  assert.ok(s.includes('水'));
});

test('shadow: ITEM_TYPES にあり、x の位置に y1〜y2 の線として描く', () => {
  assert.ok(figures.ITEM_TYPES.includes('shadow'));
  const s = figures.sceneSvg({ width: 320, height: 240, items: [{ type: 'shadow', x: 280, y1: 32, y2: 212 }] });
  assert.ok(s.includes('data-item-type="shadow"'));
  assert.ok(s.includes('<line'));
  assert.ok(s.includes('x1="280" y1="32" x2="280" y2="212"'));
  assert.ok(s.includes('stroke-width="12"'));
  assert.ok(s.includes('opacity="0.55"'));
});

test('lens: bulge を渡すとふくらみ（path の制御点）が変わる。なければ今までどおり', () => {
  const svgOf = (extra) => figures.sceneSvg({ width: 320, height: 240, items: [Object.assign({ type: 'lens', cx: 160, cy: 110, height: 140, f: 60 }, extra)] });
  const plain = svgOf({});
  assert.ok(plain.includes('Q190.8,110'), plain);   // 既定のふくらみ max(8, 70 × 0.22) × 2 = 30.8
  assert.equal(svgOf({ bulge: 15.4 }), plain);
  const fat = svgOf({ bulge: 25.4 });
  assert.notEqual(fat, plain);
  assert.ok(fat.includes('Q210.8,110') && fat.includes('Q109.2,110'), fat);
});

test('sceneSvg: 文字は線より上の層にまとめて描く（ドラッグ対象の文字はその item の中に残す）', () => {
  const scene = { width: 320, height: 240, items: [
    { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
    { type: 'ray', x1: 10, y1: 10, x2: 300, y2: 200 },
    { type: 'object', id: 'o', x: 50, y: 120, height: 40, label: '物体' },
    { type: 'region', id: 'r', x: 200, y: 60, r: 22, label: 'イ' },
  ] };
  const s = figures.sceneSvg(scene, { draggableId: 'o' });
  const layer = s.match(/<g class="scene-labels" pointer-events="none">([\s\S]*?)<\/g>/);
  assert.ok(layer, '文字の層がある');
  assert.ok(s.indexOf('class="scene-labels"') > s.indexOf('item-ray'), '光線より後（上）に描く');
  assert.ok(layer[1].includes('>F<') && layer[1].includes('>イ<'), 'レンズの F と region の文字は文字の層へ');
  assert.ok(!layer[1].includes('物体'), 'ドラッグ対象の文字は層に入れない');
  assert.match(s, /data-item-id="o"[^>]*>[\s\S]*?物体[\s\S]*?<\/g>/);
  assert.ok(!figures.sceneSvg({ width: 100, height: 100, items: [{ type: 'axis', y: 50 }] }).includes('scene-labels'), '文字がなければ層を作らない');
});

test('sceneSvg: item は配列の順に描かれる', () => {
  const s = figures.sceneSvg({ width: 100, height: 100, items: [{ type: 'eye', x: 1, y: 1 }, { type: 'lamp', x: 2, y: 2 }] });
  assert.ok(s.indexOf('item-eye') < s.indexOf('item-lamp'));
});

test('sceneSvg: 知らない type は黙って飛ばす', () => {
  const s = figures.sceneSvg({ width: 100, height: 100, items: [{ type: 'unknown', id: 'u' }, null, { type: 'axis', y: 50 }] });
  assert.ok(!s.includes('data-item-id="u"'));
  assert.ok(s.includes('data-item-type="axis"'));
});

test('sceneSvg: 数値は小数 2 けたまで', () => {
  const s = figures.sceneSvg({ width: 100, height: 100, items: [{ type: 'ray', x1: 1 / 3, y1: 0, x2: 10, y2: 10 }] });
  assert.ok(s.includes('x1="0.33"'));
});

test('mascot.forUnit: 単元の mascot で先生が決まり、未指定・不明なら FALLBACK（まる先生）', () => {
  const e = mascot.forUnit({ mascot: 'E' });
  assert.equal(e.name, 'キューブ先生');
  assert.equal(e.image, 'assets/mascots/mascot_E.svg');
  assert.equal(mascot.FALLBACK, 'A');
  [{}, null, undefined, { mascot: 'Z' }, { mascot: 3 }, { mascot: 'toString' }, { mascot: 'constructor' }, { mascot: '__proto__' }]
    .forEach(u => assert.equal(mascot.forUnit(u).name, 'まる先生', JSON.stringify(u)));
  assert.deepEqual(Object.keys(mascot.MASCOTS), ['A', 'B', 'C', 'D', 'E', 'F']);
  Object.values(mascot.MASCOTS).forEach(m => assert.ok(fs.existsSync(path.join(__dirname, '..', m.image)), m.image + ' がある'));
});

test('mascot.svg(80, 先生) は 80px の画像で、その先生の絵と名前（alt）になる。省略時は FALLBACK', () => {
  const s = mascot.svg(80, mascot.forUnit({ mascot: 'B' }));
  assert.ok(s.startsWith('<img '));
  assert.ok(s.includes('width="80"'));
  assert.ok(s.includes('height="80"'));
  assert.ok(s.includes('src="assets/mascots/mascot_B.svg"'));
  assert.ok(s.includes('alt="しずく博士"'));
  assert.ok(mascot.svg(80).includes('alt="まる先生"'));
  assert.ok(mascot.svg(80, { id: 'nope' }).includes('alt="まる先生"'));
  assert.ok(mascot.svg(80, { id: 'toString' }).includes('alt="まる先生"'));
});

test('mascot.legacySvg(80) は以前の手描き SVG で、読み上げ名は「ピカ」', () => {
  const s = mascot.legacySvg(80);
  assert.ok(s.startsWith('<svg '));
  assert.ok(s.includes('width="80"'));
  assert.equal(mascot.LEGACY_NAME, 'ピカ');
  assert.ok(s.includes('aria-label="ピカ"'));
});

test('mascot.celebrateMarkup はメッセージをエスケープし、指定した先生のマスコットを含む', () => {
  const s = mascot.celebrateMarkup('レベル <2>', mascot.forUnit({ mascot: 'E' }));
  assert.ok(s.includes('src="assets/mascots/mascot_E.svg"'));
  assert.ok(s.includes('レベル &lt;2&gt;'));
  assert.ok(s.includes('class="mascot-celebrate"'));
  assert.ok(s.includes('class="mascot-bubble"'));
  assert.ok(s.includes('width="120"'));
});

// ---- 汎用の部品 ----

const one = (it, opts) => figures.sceneSvg({ width: 320, height: 240, items: [it] }, opts);
// その item の g の中身だけ（defs や文字の層を除く）
const bodyOf = (s, type) => {
  const m = s.match(new RegExp('<g [^>]*data-item-type="' + type + '"[^>]*>([\\s\\S]*?)</g>(?:<g class="scene-labels"|</svg>)'));
  assert.ok(m, type + ' の g がない');
  return m[1];
};

test('rect / circle / ellipse / polygon: fill・stroke はトークン名を色コードに、#abc はそのまま、知らない名前は既定、none は塗らない', () => {
  const r = bodyOf(one({ type: 'rect', x: 10, y: 20, width: 100, height: 40, fill: 'sky', stroke: 'blue', rx: 6 }), 'rect');
  assert.ok(r.includes('<rect x="10" y="20" width="100" height="40" rx="6" fill="#CFE4FF" stroke="#1A5CFF" stroke-width="2"/>'), r);
  const c = bodyOf(one({ type: 'circle', x: 50, y: 60, r: 15, fill: '#abc', stroke: 'nope' }), 'circle');
  assert.ok(c.includes('<circle cx="50" cy="60" r="15" fill="#abc" stroke="#1B2430" stroke-width="2"/>'), c);
  const e = bodyOf(one({ type: 'ellipse', x: 50, y: 60, rx: 30, ry: 10, fill: 'none' }), 'ellipse');
  assert.ok(e.includes('<ellipse cx="50" cy="60" rx="30" ry="10" fill="none" stroke="#1B2430" stroke-width="2"/>'), e);
  const p = bodyOf(one({ type: 'polygon', points: [[0, 0], [30, 0], [30, 30]], fill: 'toString' }), 'polygon');
  assert.ok(p.includes('<polygon points="0,0 30,0 30,30" fill="#FFFFFF" stroke="#1B2430" stroke-width="2"/>'), p);
  // 既定は fill white・stroke ink
  assert.ok(one({ type: 'rect', x: 0, y: 0, width: 10, height: 10 }).includes('fill="#FFFFFF" stroke="#1B2430"'));
  // 色コードでない文字列は属性に出さない
  const bad = one({ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red" onload="x', stroke: 'url(#a)' });
  assert.ok(!bad.includes('onload') && !bad.includes('url(#a)'), bad);
  assert.ok(one({ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' }).includes('fill="#D9534F"'));
});

test('rect / circle / ellipse / polygon の label: 既定は中央、above は上端の 8px 上、below は下端の 20px 下。polygon は重心', () => {
  assert.ok(one({ type: 'rect', x: 10, y: 20, width: 100, height: 40, label: '箱' }).includes('<text x="60" y="40" font-size="16" fill="#1B2430" class="scene-label" text-anchor="middle" dominant-baseline="central">箱</text>'));
  assert.ok(one({ type: 'rect', x: 10, y: 20, width: 100, height: 40, label: '箱', labelPos: 'above' }).includes('<text x="60" y="12"'));
  assert.ok(one({ type: 'rect', x: 10, y: 20, width: 100, height: 40, label: '箱', labelPos: 'below' }).includes('<text x="60" y="80"'));
  assert.ok(one({ type: 'circle', x: 50, y: 60, r: 15, label: '核', labelPos: 'below' }).includes('<text x="50" y="95"'));
  assert.ok(one({ type: 'ellipse', x: 50, y: 60, rx: 30, ry: 10, label: 'a', labelPos: 'above' }).includes('<text x="50" y="42"'));
  assert.ok(one({ type: 'polygon', points: [[0, 0], [30, 0], [30, 30]], label: '△' }).includes('<text x="20" y="10"'));
});

test('line: 3 点は polyline、2 点は line。arrow で同じ色の矢じり（#hex は ink）、dashed で点線', () => {
  const s = one({ type: 'line', points: [[10, 10], [50, 10], [50, 60]], color: 'blue', arrow: true, dashed: true });
  const b = bodyOf(s, 'line');
  assert.ok(b.startsWith('<polyline points="10,10 50,10 50,60" fill="none" stroke="#1A5CFF" stroke-width="3"'), b);
  assert.ok(b.includes('stroke-linecap="round"') && b.includes('stroke-linejoin="round"'));
  assert.ok(b.includes('marker-end="url(#scene-arrow-blue)"'));
  assert.ok(b.includes('stroke-dasharray="8 6"'));
  assert.ok(s.includes('<marker id="scene-arrow-blue"'));
  const hex = bodyOf(one({ type: 'line', points: [[0, 0], [10, 10]], color: '#123456', arrow: true, width: 5 }), 'line');
  assert.ok(hex.startsWith('<line x1="0" y1="0" x2="10" y2="10" stroke="#123456" stroke-width="5"'), hex);
  assert.ok(hex.includes('marker-end="url(#scene-arrow-ink)"'));
  const plain = bodyOf(one({ type: 'line', points: [[0, 0], [10, 10]] }), 'line');
  assert.ok(plain.includes('stroke="#1B2430"') && !plain.includes('marker-end') && !plain.includes('dasharray'), plain);
  // 点が 2 つないときは描かない
  assert.equal(bodyOf(one({ type: 'line', points: [[0, 0]] }), 'line'), '');
});

test('矢じりは色ごと（ink / blue / green / gray / orange / red）にあり、光線の scene-arrow（橙）も残る', () => {
  const s = one({ type: 'axis', y: 10 });
  ['ink', 'blue', 'green', 'gray', 'orange', 'red'].forEach(t => assert.ok(s.includes('<marker id="scene-arrow-' + t + '"'), t));
  assert.ok(s.includes('<marker id="scene-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#F08C2E"/></marker>'));
  const ray = one({ type: 'ray', x1: 0, y1: 0, x2: 100, y2: 100, arrow: true });
  assert.ok(ray.includes('marker-end="url(#scene-arrow)"'));
});

test('text: size の下限 12、anchor、bold、color。label の size・anchor・color が効き、指定なしは今までどおり', () => {
  const t = one({ type: 'text', x: 10, y: 20, text: 'H₂O', size: 8, anchor: 'end', bold: true, color: 'blue' });
  assert.ok(t.includes('<text x="10" y="20" font-size="12" fill="#1A5CFF" class="scene-label" text-anchor="end" font-weight="bold">H₂O</text>'), t);
  const t2 = one({ type: 'text', x: 10, y: 20, text: 'a' });
  assert.ok(t2.includes('<text x="10" y="20" font-size="16" fill="#1B2430" class="scene-label" text-anchor="start">a</text>'), t2);
  assert.ok(one({ type: 'text', x: 0, y: 0, text: 'a', anchor: 'evil' }).includes('text-anchor="start"'));
  assert.ok(one({ type: 'text', x: 0, y: 0, text: '<b>' }).includes('&lt;b&gt;'));
  const l = one({ type: 'label', x: 5, y: 6, text: '鏡', size: 20, anchor: 'middle', color: 'green' });
  assert.ok(l.includes('<text x="5" y="6" font-size="20" fill="#2E9E5B" class="scene-label" text-anchor="middle">鏡</text>'), l);
  const l0 = one({ type: 'label', x: 5, y: 6, text: '鏡' });
  assert.ok(l0.includes('<text x="5" y="6" font-size="16" fill="#1B2430" class="scene-label">鏡</text>'), l0);
});

test('beaker: level 0.5 で液体の高さが height の半分。既定は幅 70・高さ 80・level 0.6・液体は water。文字は下 20px', () => {
  const b = bodyOf(one({ type: 'beaker', x: 160, y: 200, width: 80, height: 100, level: 0.5, liquid: 'pink' }), 'beaker');
  // 液体の path は液面 (y - 100 × 0.5 = 150) から底 (200) まで
  assert.match(b, /<path d="M120,150 L120,[\d.]+[^"]*" fill="#F2A6C2" class="liquid"\/>/);
  assert.ok(b.includes('Q120,200'), '底は y = 200');
  assert.ok(b.includes('class="liquid-surface"'));
  assert.ok(b.includes('class="beaker-body"'));
  const d = bodyOf(one({ type: 'beaker', x: 160, y: 200 }), 'beaker');
  assert.ok(d.includes('<path d="M125,152 L125,') && d.includes('fill="#CFE4FF" class="liquid"'), d);   // 200 - 80 × 0.6 = 152
  assert.ok(!bodyOf(one({ type: 'beaker', x: 160, y: 200, level: 0 }), 'beaker').includes('class="liquid"'), 'level 0 は液体なし');
  assert.ok(one({ type: 'beaker', x: 160, y: 200, label: '水' }).includes('<text x="160" y="220"'));
});

test('tube: tilt で rotate( が入り、文字は回転の外。flame は外炎 orange・内炎 yellow', () => {
  const t = one({ type: 'tube', x: 100, y: 200, height: 80, level: 0.25, tilt: 30, label: '試験管' });
  const b = bodyOf(t, 'tube');
  assert.ok(b.includes('<g transform="rotate(30 100 200)">'), b);
  assert.ok(b.includes('<path d="M88,180 L88,'), '液面は 200 - 80 × 0.25 = 180');
  assert.ok(t.includes('<text x="100" y="220"'));
  assert.ok(!bodyOf(one({ type: 'tube', x: 100, y: 200 }), 'tube').includes('rotate('), 'tilt なしは回さない');
  const f = bodyOf(one({ type: 'flame', x: 150, y: 230 }), 'flame');
  assert.ok(f.includes('M150,194') && f.includes('fill="#F08C2E" class="flame-outer"') && f.includes('fill="#FFD34D" class="flame-inner"'), f);
});

test('symbol: 6 種がすべて描け、知らない kind は丸だけ。rotate で回す。文字は記号の下 24px', () => {
  const kinds = ['battery', 'bulb', 'resistor', 'switch', 'ammeter', 'voltmeter'];
  const svgs = kinds.map(k => one({ type: 'symbol', x: 100, y: 100, kind: k }));
  const bodies = svgs.map(s => bodyOf(s, 'symbol'));
  bodies.forEach((b, i) => assert.ok(b.length > 0, kinds[i]));
  assert.equal(new Set(svgs).size, kinds.length, '記号ごとに形がちがう');
  assert.ok(bodies[2].includes('<rect x="82" y="93" width="36" height="14"'), '抵抗は 36×14');
  assert.ok(one({ type: 'symbol', x: 100, y: 100, kind: 'ammeter' }).includes('>A</text>'));
  assert.ok(one({ type: 'symbol', x: 100, y: 100, kind: 'voltmeter' }).includes('>V</text>'));
  const unknown = bodyOf(one({ type: 'symbol', x: 100, y: 100, kind: 'nope' }), 'symbol');
  assert.equal(unknown, '<circle cx="100" cy="100" r="14" fill="#FFFFFF" stroke="#1B2430" stroke-width="2"/>');
  // どれも幅 40（x = 80〜120）の中
  bodies.forEach((b, i) => {
    const xs = [...b.matchAll(/\b(?:x|x1|x2|cx)="([\d.]+)"/g)].map(m => Number(m[1]));
    xs.forEach(x => assert.ok(x >= 80 && x <= 120, kinds[i] + ' の x = ' + x));
  });
  assert.ok(one({ type: 'symbol', x: 100, y: 100, kind: 'battery', rotate: 90 }).includes('rotate(90 100 100)'));
  assert.ok(one({ type: 'symbol', x: 100, y: 100, kind: 'bulb', label: '豆電球' }).includes('<text x="100" y="124"'));
});

test('arrow: marker-end が付き、色ごとの矢じり。文字は中点の 10px 上', () => {
  const s = one({ type: 'arrow', x1: 10, y1: 100, x2: 90, y2: 100, color: 'red', label: '力' });
  const b = bodyOf(s, 'arrow');
  assert.ok(b.includes('<line x1="10" y1="100" x2="90" y2="100" stroke="#D9534F" stroke-width="3"'), b);
  assert.ok(b.includes('marker-end="url(#scene-arrow-red)"'));
  assert.ok(s.includes('<text x="50" y="90"'));
  assert.ok(one({ type: 'arrow', x1: 0, y1: 0, x2: 10, y2: 0 }).includes('marker-end="url(#scene-arrow-ink)"'));
});

test('汎用の部品の当たり判定（centerOf）: rect は中心、polygon は点の平均、beaker は底から height/2 上', () => {
  const hit = (it) => {
    const s = one(Object.assign({ id: 'd' }, it), { draggableId: 'd' });
    const m = s.match(/<circle class="hit-area" cx="([-\d.]+)" cy="([-\d.]+)"/);
    assert.ok(m, it.type + ' に当たり判定がない');
    return [Number(m[1]), Number(m[2])];
  };
  assert.deepEqual(hit({ type: 'rect', x: 10, y: 20, width: 100, height: 40 }), [60, 40]);
  assert.deepEqual(hit({ type: 'polygon', points: [[0, 0], [30, 0], [30, 30]] }), [20, 10]);
  assert.deepEqual(hit({ type: 'beaker', x: 160, y: 200, height: 100 }), [160, 150]);
  assert.deepEqual(hit({ type: 'beaker', x: 160, y: 200 }), [160, 160]);
  assert.deepEqual(hit({ type: 'tube', x: 100, y: 200, height: 80 }), [100, 160]);
  assert.deepEqual(hit({ type: 'flame', x: 150, y: 230 }), [150, 212]);
  assert.deepEqual(hit({ type: 'line', points: [[0, 0], [30, 0], [30, 30]] }), [20, 10]);
  assert.deepEqual(hit({ type: 'arrow', x1: 10, y1: 100, x2: 90, y2: 60 }), [50, 80]);
  assert.deepEqual(hit({ type: 'circle', x: 70, y: 80, r: 10 }), [70, 80]);
  assert.deepEqual(hit({ type: 'symbol', x: 70, y: 80, kind: 'bulb' }), [70, 80]);
});

test('tube: tilt を付けると当たり判定の中心も底を中心に同じだけ回る（tilt 90 で右へ height/2）', () => {
  const svg = figures.sceneSvg({ width: 320, height: 240, items: [{ type: 'tube', id: 't', x: 100, y: 150, height: 90, tilt: 90, level: 0 }] }, { draggableId: 't' });
  const m = svg.match(/<circle class="hit-area" cx="([^"]+)" cy="([^"]+)"/);
  assert.ok(m, 'hit-area がない');
  assert.equal(Number(m[1]), 145);
  assert.equal(Number(m[2]), 150);
});

// ---- 画像の部品と文字の白い下地 ----

test('image: ITEM_TYPES にあり、既定は場面いっぱい（320×240）で縦横比を保つ。x・y・width・height・opacity の指定が効く', () => {
  assert.ok(figures.ITEM_TYPES.includes('image'));
  const d = bodyOf(one({ type: 'image', src: 'assets/images/x/y.png' }), 'image');
  assert.equal(d, '<image href="assets/images/x/y.png" x="0" y="0" width="320" height="240" preserveAspectRatio="xMidYMid meet"/>');
  assert.ok(!d.includes('xlink:href'));
  const s = bodyOf(one({ type: 'image', src: 'assets/images/a-b_c.jpg', x: 20, y: 10, width: 200, height: 150, opacity: 0.5 }), 'image');
  assert.equal(s, '<image href="assets/images/a-b_c.jpg" x="20" y="10" width="200" height="150" preserveAspectRatio="xMidYMid meet" opacity="0.5"/>');
  assert.ok(bodyOf(one({ type: 'image', src: 'assets/p.webp', opacity: 3 }), 'image').includes('opacity="1"'));
  ['assets/p.jpeg', 'assets/p.svg', 'assets/p.webp'].forEach(src => assert.ok(one({ type: 'image', src }).includes('<image href="' + src + '"'), src));
  // 場面の大きさがちがえば既定もそれに合わせる
  const big = figures.sceneSvg({ width: 400, height: 300, items: [{ type: 'image', src: 'assets/p.png' }] });
  assert.ok(big.includes('width="400" height="300" preserveAspectRatio'), big);
});

test('image: 不正な src（外部・.. ・// ・javascript: ・画像でない・文字列でない）は何も描かない', () => {
  ['http://example.com/x.png', 'https://example.com/x.png', '../x.png', 'assets/../x.png', 'assets//x.png',
    'javascript:alert(1)', 'assets/a.txt', 'assets/a.png"onload="x', 'images/x.png', '/assets/x.png', 'data:image/png;base64,AAAA', '', null, 3]
    .forEach(src => {
      const s = one({ type: 'image', src });
      assert.ok(!s.includes('<image'), String(src));
      assert.ok(!s.includes('onload') && !s.includes('javascript'), String(src));
    });
  assert.ok(!one({ type: 'image' }).includes('<image'));
});

test('image: ドラッグ対象にしても落ちず、当たり判定は矩形の中心', () => {
  const s = one({ type: 'image', id: 'img', src: 'assets/p.png', x: 20, y: 10, width: 200, height: 100 }, { draggableId: 'img' });
  assert.match(s, /<circle class="hit-area" cx="120" cy="60"/);
  assert.match(one({ type: 'image', id: 'img', src: 'assets/p.png' }, { draggableId: 'img' }), /<circle class="hit-area" cx="160" cy="120"/);
});

test('text・label の bg: true で白い角丸の下地が文字の直前に描かれ、文字といっしょに文字の層へ入る', () => {
  const s = figures.sceneSvg({ width: 320, height: 240, items: [
    { type: 'image', src: 'assets/p.png' },
    { type: 'text', x: 100, y: 50, text: '肺ほう', size: 20, bg: true },
  ] });
  const layer = s.match(/<g class="scene-labels" pointer-events="none">([\s\S]*?)<\/g>/);
  assert.ok(layer, '文字の層がある');
  // 3 文字 × 20 = 60、左右 4px。上端はベースラインから 20 × 0.85 上、さらに 2px
  assert.ok(layer[1].startsWith('<rect class="text-bg" x="96" y="31" width="68" height="24" rx="4" fill="white" fill-opacity="0.85"/><text x="100" y="50"'), layer[1]);
  assert.equal(bodyOf(s, 'text'), '', '下地も文字も item の中に残らない');
  assert.ok(s.indexOf('<image') < s.indexOf('class="text-bg"'), '下地は画像より上');
  // anchor に合わせて下地の位置をずらす
  assert.ok(one({ type: 'text', x: 100, y: 50, text: 'ab', anchor: 'middle', bg: true }).includes('<rect class="text-bg" x="80" '));
  assert.ok(one({ type: 'text', x: 100, y: 50, text: 'ab', anchor: 'end', bg: true }).includes('<rect class="text-bg" x="64" '));
  const l = one({ type: 'label', x: 10, y: 30, text: '心臓', bg: true });
  assert.ok(l.includes('<rect class="text-bg" x="6" y="14.4" width="40" height="20" rx="4" fill="white" fill-opacity="0.85"/><text x="10" y="30"'), l);
  // bg なし・空の文字には下地を付けない
  assert.ok(!one({ type: 'text', x: 0, y: 0, text: 'a' }).includes('text-bg'));
  assert.ok(!one({ type: 'label', x: 0, y: 0, text: '', bg: true }).includes('text-bg'));
  // ドラッグ対象なら下地も文字もその item の中に残る
  const dr = one({ type: 'text', id: 't', x: 0, y: 20, text: 'a', bg: true }, { draggableId: 't' });
  assert.match(dr, /data-item-id="t"[^>]*><circle class="hit-area"[^>]*\/><rect class="text-bg"[^>]*\/><text /);
  assert.ok(!dr.includes('scene-labels'));
});
