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

test('sceneSvg: 14 種類すべての item を描ける', () => {
  const items = [
    { type: 'mirror', id: 'm', x1: 40, y1: 200, x2: 280, y2: 200 },
    { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
    { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
    { type: 'axis', y: 120 },
    { type: 'object', id: 'o', x: 50, y: 120, height: 40, label: '物体' },
    { type: 'ray', x1: 10, y1: 10, x2: 160, y2: 200, arrow: true, dashed: true },
    { type: 'normal', x: 160, y: 200, angle: 0 },
    { type: 'point', id: 'p', x: 30, y: 30, label: 'P' },
    { type: 'region', id: 'r', x: 200, y: 60, r: 10, label: 'イ' },
    { type: 'label', x: 5, y: 230, text: '鏡' },
    { type: 'eye', x: 290, y: 40 },
    { type: 'lamp', x: 20, y: 60 },
    { type: 'screen', x: 300, y1: 40, y2: 200 },
    { type: 'shadow', x: 300, y1: 60, y2: 180 },
  ];
  assert.equal(items.length, figures.ITEM_TYPES.length);
  const s = figures.sceneSvg({ width: 320, height: 240, items });
  for (const it of items) assert.ok(s.includes(`data-item-type="${it.type}"`), it.type);
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
