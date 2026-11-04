# 図の部品の手引き（教材の書き手向け）

教材（`content/<単元>.js`）の図は、`js/figures.js` が「場面（scene）」の指定から SVG に描く。
この手引きは、場面に置ける部品（item）の一覧と、項目・色・座標の決まりをまとめたもの。

## 場面と座標の決まり

- 場面は `{ width, height, items }`。大きさは **320×240** が基本（`width`・`height` を省くと 320×240）。
- 座標は SVG と同じく、**x は右向き、y は下向き**に増える。左上が (0, 0)。
- `items` は配列の順に描く（後のものが上に重なる）。知らない `type` は黙って飛ばす。
- 部品の文字（`label`・`text` など）は、線に隠れないよう最後に「文字の層」にまとめて描く。ドラッグ対象の部品の文字だけは、その部品といっしょに動く。
- `id` を付けた部品は、figure-choice（`region`）やドラッグ（`draggable.itemId`）の対象にできる。
- 文字はすべてエスケープされる（`<` などをそのまま書いてよい）。
- 用語の記法 `**語句**` は図の文字には使えない（解説文だけ）。

## 色の指定

汎用の部品の `fill`・`stroke`・`color`・`liquid` には、次のどれかを書く。

- 下の表の**トークン名**（例: `'blue'`）
- 色コード `'#rrggbb'` または `'#rgb'`（例: `'#3366cc'`）
- `'none'`（塗らない）

これ以外（未指定・知らない名前・ほかの書き方）は、部品ごとの既定の色になる。

| トークン | 色 | 主な使いみち |
|---|---|---|
| `ink` | `#1B2430` | 文字・線の基本 |
| `blue` | `#1A5CFF` | 強調、選ぶ場所 |
| `gray` | `#8A94A6` | 補助線 |
| `line` | `#5A6B85` | 境界・目立たない線 |
| `green` | `#2E9E5B` | 物体、植物 |
| `orange` | `#F08C2E` | 光線、炎の外側 |
| `red` | `#D9534F` | 血液・リトマス紙など**理科の色としてだけ**（不正解の強調には使わない） |
| `yellow` | `#FFD34D` | 炎の内側、光 |
| `pink` | `#F2A6C2` | からだの図 |
| `purple` | `#8E6BD6` | 指示薬など |
| `brown` | `#A0623A` | 土・木 |
| `sky` | `#CFE4FF` | 空・水 |
| `water` | `#CFE4FF` | 水（液体の既定） |
| `glass` | `#E6E8EC` | ガラス |
| `white` | `#FFFFFF` | 形の部品の塗りの既定 |
| `lightgreen` | `#C9EBD3` | 葉・植物の細胞 |
| `sand` | `#E8D8B0` | 砂の層 |
| `rock` | `#B8B2A7` | 岩石・れきの層 |
| `lensFill` | `#E8F0FF` | レンズの中（光の部品用） |
| `bulb` / `bulbEdge` | `#FFD34D` / `#C98A00` | 電球（光の部品用） |
| `shadow` | `#4A4A4A` | 影（光の部品用） |

矢じりの色は `ink`・`blue`・`green`・`gray`・`orange`・`red` の 6 色。線の色がこれ以外（`#hex` やほかのトークン）のときは `ink` の矢じりになる。

## 汎用の部品（全単元で使う）

`?` の付いた項目は省いてよい。

| type | 項目 | 描くもの・決まり |
|---|---|---|
| `rect` | `x, y, width, height, fill?, stroke?, rx?, label?, labelPos?` | 四角。`(x, y)` は左上。`fill` 既定 `white`、`stroke` 既定 `ink`（太さ 2）、`rx` で角を丸める。`label` は中央（`labelPos: 'above'` で上端の 8px 上、`'below'` で下端の 20px 下） |
| `circle` | `x, y, r, fill?, stroke?, label?, labelPos?` | 丸。`(x, y)` は中心。色と `label` は `rect` と同じ |
| `ellipse` | `x, y, rx, ry, fill?, stroke?, label?, labelPos?` | 楕円。`(x, y)` は中心。色と `label` は `rect` と同じ |
| `polygon` | `points: [[x,y],...], fill?, stroke?, label?` | 閉じた多角形（点は 2 つ以上）。`label` は重心（点の平均）に中央寄せ |
| `line` | `points: [[x,y],...], color?, width?, dashed?, arrow?` | 折れ線（点 2 つなら直線）。`color` 既定 `ink`、`width` 既定 3、端は丸い。`dashed: true` で点線（8 6）、`arrow: true` で終点に同じ色の矢じり。導線・グラフの線・補助線に使う |
| `text` | `x, y, text, size?, anchor?, color?, bold?, bg?` | 文字だけ。`size` 既定 16（12 より小さくはならない）、`anchor` は `'start'`（既定）/`'middle'`/`'end'`、`bold: true` で太字。`y` は文字の下のライン（ベースライン）。`bg: true` で文字の後ろに白い角丸の下地（下の「写真の上に文字を置くときの決まり」） |
| `arrow` | `x1, y1, x2, y2, color?, width?, label?` | 矢印（`(x1, y1)` → `(x2, y2)`）。力や運動の向きに使う。`color` 既定 `ink`、`width` 既定 3。`label` は中点の 10px 上 |
| `image` | `src, x?, y?, width?, height?, opacity?` | 画像（写真ふうの図）。`src` はプロジェクトからの相対パスで、**`assets/` の中の `.png`・`.jpg`・`.jpeg`・`.webp`・`.svg` だけ**（拡張子は小文字。`.PNG` は不可。英数字と `_ . / -` だけの名前。`..`・`//`・`http:` などを含むものは何も描かない）。`(x, y)` は左上で既定 `(0, 0)`、`width`・`height` の既定は場面の大きさ（320×240 いっぱい）。縦横比は保ったまま枠に収める。`opacity` は 0〜1 |

## 写真の上に文字を置くときの決まり

生物などの図は、写真ふうの画像（`image`）の上に説明の文字や引き出し線を重ねて描く。

- `image` を `items` の**最初**に置く（後の部品が上に重なる）。文字は自動で文字の層（いちばん上）に入る。
- 写真の上の文字には `bg: true` を付ける（`text`・`label`）。白い角丸の下地（白 85%、角の半径 4）が文字の後ろに付き、写真の色に関係なく読める。下地の幅は「文字数 × 文字の大きさ」の概算で、左右 4px・上下 2px の余白が付く。`anchor` に合わせて下地もずれる。
- 引き出し線は `line`（点 2 つ以上）か `arrow` で描く。文字の下地と同じく写真の上でも見えるよう、色は `ink` か `blue` など濃い色にする。
- 使う画像は `assets/images/<単元>/` に置き、`sw.js` の `PRECACHE` にも入れる（`tests/content-all.test.js` が、ファイルがあることと `PRECACHE` に入っていることを確かめる）。

```js
// 写真ふうの画像に名前と引き出し線を重ねる
scene([
  { type: 'image', src: 'assets/images/human/lung.png' },
  { type: 'line', points: [[200, 90], [250, 60]], width: 2 },
  { type: 'text', x: 254, y: 58, text: '肺ほう', size: 14, bg: true },
])
```

## 理科の記号の部品

| type | 項目 | 描くもの・決まり |
|---|---|---|
| `beaker` | `x, y, width?, height?, level?, liquid?, label?` | ビーカー（上が開いた U 字の容器）。`(x, y)` は**底の中央**。`width` 既定 70、`height` 既定 80。`level`（0〜1、既定 0.6）の高さまで `liquid`（既定 `water`）で塗り、液面は少し波打つ。`level: 0` で空。`label` は容器の下 20px |
| `tube` | `x, y, height?, level?, liquid?, label?, tilt?` | 試験管（幅 24、底が丸い）。`(x, y)` は**底の中央**。`height` 既定 90。`tilt`（度、時計回り）で底の中央を中心に傾ける（文字は傾かない）。`level`・`liquid` は `beaker` と同じ。`label` は下 20px |
| `flame` | `x, y, label?` | 炎（アルコールランプ・ガスバーナーの火）。外炎 `orange`、内炎 `yellow` の涙型。`(x, y)` は炎の**底の中央**、高さ 36。`label` は下 20px |
| `symbol` | `x, y, kind, rotate?, label?` | 回路図の記号。`(x, y)` を中心に幅 40 の中に収まり、導線をつなぐ端は `(x - 20, y)` と `(x + 20, y)`（`rotate: 90` なら `(x, y - 20)` と `(x, y + 20)`）。導線は `line` で描く。`label` は記号の下 24px |

`symbol` の `kind`:

| kind | 記号 |
|---|---|
| `battery` | 電池（長い線が＋極、短く太い線が−極。横向きでは左が＋） |
| `bulb` | 豆電球（丸に ×） |
| `resistor` | 抵抗（長方形 36×14） |
| `switch` | スイッチ（開いた斜め線） |
| `ammeter` | 電流計（丸に A） |
| `voltmeter` | 電圧計（丸に V） |
| それ以外 | 丸だけ |

`rotate`（度、時計回り）は記号の中心で回す。縦の導線につなぐときは `rotate: 90`。

## 光の部品（「光の世界」用）

色は固定（指定できない）。

| type | 項目 | 描くもの・決まり |
|---|---|---|
| `mirror` | `x1, y1, x2, y2` | 鏡。太い線と、裏側の短い斜線 |
| `boundary` | `y, upper?, lower?` | 境界面（横幅いっぱいの線）。`upper` 既定 `'air'`、`lower` 既定 `'water'`（`'air'`・`'water'`・`'glass'`）。物質の色で塗り、名前を右はしに書く |
| `lens` | `cx, cy, height?, f?, bulge?` | 凸レンズ。`height` 既定 120。`f` で焦点 F・F' を描く。`bulge` でふくらみ |
| `axis` | `y` | 光軸（横幅いっぱいの一点鎖線） |
| `object` | `x, y, height, label?` | 物体・像の矢印（`(x, y)` から `(x, y - height)`。`height` が負なら下向き） |
| `ray` | `x1, y1, x2, y2, arrow?, dashed?` | 光線（橙）。`arrow` で矢じり、`dashed` で点線 |
| `normal` | `x, y, angle?` | 法線（長さ 120 の点線）。`angle` は度で 0 が真上、時計回りが正 |
| `point` | `x, y, label?` | 点（青い丸）。文字は右上 |
| `region` | `id, x, y, r?, label?` | 選ぶ場所（figure-choice の答え）。半径は 22 以上になる。`label`（ア・イ…）を必ず付ける |
| `label` | `x, y, text, size?, anchor?, color?, bg?` | 文字。指定がなければ 16px・左寄せ・`ink`（`size`・`anchor`・`color`・`bg` は `text` と同じ決まり） |
| `eye` | `x, y` | 目 |
| `lamp` | `x, y` | 電球（光源） |
| `screen` | `x, y1, y2` | スクリーン（太い縦線と「スクリーン」の文字） |
| `shadow` | `x, y1, y2` | スクリーン上の影 |

## ドラッグの当たり判定

ドラッグ対象（`draggable.itemId`）には、部品の中心に直径 56px の当たり判定が付く。中心は次のとおり。

| type | 中心 |
|---|---|
| `rect` | 四角の中心 |
| `image` | 画像の枠の中心（ドラッグ対象にすることは想定していない） |
| `circle`・`ellipse`・`symbol`・`text`・`point`・`region`・`label`・`eye`・`lamp`・`normal` | `(x, y)` |
| `beaker`・`tube` | 底の中央から `height / 2` 上 |
| `flame` | 底の中央から 18 上 |
| `polygon`・`line` | 点の平均 |
| `arrow`・`ray`・`mirror` | 2 点の中点 |
| `object` | `(x, y - height / 2)` |
| `screen`・`shadow` | `(x, (y1 + y2) / 2)` |
| `lens` | `(cx, cy)` |
| `boundary`・`axis` | `(場面の幅 / 2, y)` |

## 例

```js
// 試験管を加熱する図
scene([
  { type: 'tube', x: 160, y: 170, height: 90, level: 0.4, liquid: 'sky', tilt: 20, label: '試験管' },
  { type: 'flame', x: 160, y: 220 },
  { type: 'text', x: 200, y: 214, text: 'ガスバーナーの火', size: 14 },
])

// 電池と豆電球の回路
scene([
  { type: 'symbol', x: 80, y: 120, kind: 'battery', rotate: 90, label: '電池' },
  { type: 'symbol', x: 240, y: 120, kind: 'bulb', rotate: 90 },
  { type: 'line', points: [[80, 100], [80, 50], [240, 50], [240, 100]] },
  { type: 'line', points: [[80, 140], [80, 190], [240, 190], [240, 140]] },
])
```

## 検査

- `tests/content-all.test.js` が `content/` のすべての単元ファイルを検査する（図の `type` がこの一覧にあること、drag の `target` が図の中にあることなど）。
- 単元ファイルを足したら、`index.html` の `<script>` と `sw.js` の `PRECACHE` にも入れる（この検査で確かめる）。
