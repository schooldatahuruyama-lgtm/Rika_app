# 動く図の書き方（分野ごとのファイル向け）

光以外の単元の動く図は、分野ごとのファイル（`js/anim-physics.js`・`anim-chem.js`・`anim-bio.js`・`anim-earth.js`）に書き、`js/anim.js` の登録口 `register` で足す。各 kind の動き・数値は `docs/anim-plan.md` の 5〜8 章を見る。この文書はその 3 章・4 章をまとめたもの。

## 1. 登録口

```js
anim.register(kind, frameFn, opts)
```

| 引数 | 決まり |
|---|---|
| `kind` | 英小文字・数字・ハイフンだけ（`/^[a-z]+(-[a-z0-9]+)*$/`）。単元の接頭辞で始める（下の表）。すでにある kind（光の 23 種をふくむ）と同じ名前は例外 |
| `frameFn(t)` | 1 周の中の位置 t（0 以上 1 未満）の item の配列を返す純粋関数（光の `BUILD` の関数と同じ形）。DOM・乱数・時刻を使わない |
| `opts.restT` | 止まっているときに見せる位置。0 以上 1 未満（既定 0） |
| `opts.period` | 1 周の時間 ms。正の数（既定 4000。天体の 1 周（月の公転・季節・地球の公転）は 8000） |

- 関数でない `frameFn`、範囲外の `restT`、正でない `period` も例外。
- 登録すると `anim.KINDS` の後ろに足される（先頭 23 個は光のまま）。画面側（`ui-screens.js` の `lessonFigure`）は `KINDS.includes(card.anim)` で見るので、画面のコードは変えない。
- `anim.frame(kind, t)` は `{ width: 320, height: 240, items }` を返す。`anim.restT(kind)`・`anim.periodOf(kind)` は登録の値を返す。

### ファイルの形（4 つとも同じ）

```js
// 解説カードの動く図（物理: 音・力・電流・運動）。js/anim.js の register で足す。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, u, osc, ease, growLine, along, onCircle, mix } = anim.helpers;

  // ---- 音の世界 ----
  // おんさから空気の振動が耳へ伝わる（sound-1-c3）
  function soAirWave(t) { /* ... */ return [ /* items */ ]; }

  const DEFS = [
    ['so-air-wave', soAirWave, { restT: 0 }],
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  const api = { KINDS: DEFS.map(d => d[0]) };   // このファイルで足した kind（テスト用）
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- 読み込み順: `index.html` は `js/anim.js` のすぐ後に physics → chem → bio → earth。`sw.js` の `PRECACHE` も `'js/anim.js'` の後に同じ順で足し、`VERSION` を上げる。ファイルを作る回に 1 つずつ足す。
- カードには光と同じ書き方で付ける: `anim: 'so-air-wave',   // 動く図（js/anim-physics.js）。figure は静止図として残す`
- 静止図の形をつくる関数（`spring`・`wave`・`bob` など）は content の中にあり anim から呼べない。同じ式を anim 側に写し、関数名と引数をそろえて「content/○○.js の △△ と同じ式」とコメントする。実装の直前に静止図を読み直し、計画の数値とちがえば静止図に合わせる。

### 単元の接頭辞

| 単元 | 接頭辞 | 単元 | 接頭辞 | 単元 | 接頭辞 |
|---|---|---|---|---|---|
| sound | `so-` | substance | `su-` | animals | `an-` |
| force | `fo-` | state-change | `st-` | body | `bo-` |
| electricity | `el-` | solution | `sl-` | heredity | `he-` |
| motion | `mo-` | chemical-change | `ch-` | nature | `na-` |
| volcano | `vo-` | ion | `io-` | plants | `pl-` |
| strata | `sr-` | weather | `we-` | space | `sp-` |
| basics | `ba-`（ファイルは `anim-bio.js`） | | | | |

- 光（light）の新しい kind は `li-` で始め、`anim-physics.js` の `register` で足す（`anim.js` の `BUILD` は変えない。光は接頭辞の検査の対象外）。

## 2. 道具（`anim.helpers`）

光から使っているもの: `clamp01`・`stage(t, from, to)`（区間で 0→1）・`lerp(a, b, k)`・`grow`（光線用。光以外では使わない）・`deg`・`rad2deg`・`u(t)`（0→1→0 のゆっくりした往復）・`N`（屈折率）。

| 名前 | 引数 → 戻り値 | 使いみち |
|---|---|---|
| `clamp(v, lo, hi)` | 数 → 数 | 範囲に収める |
| `ease(k)` | 0〜1 → 0〜1（`k*k*(3-2k)`。範囲の外は 0〜1 に収める） | 動き始めと止まりをなめらかに |
| `osc(t, n, phase)` | `sin(2π(n·t + phase))`（phase は省くと 0） | 振動。`n` を整数にすると t = 1 で t = 0 とつながる |
| `tri(s)` | `1 - |2·frac(s) - 1|`（0→1→0 の三角波） | 気体の粒子が壁ではね返る動き |
| `wrap(v, lo, hi)` | `lo + frac((v - lo)/(hi - lo))·(hi - lo)` | 横に流し、はしで反対側へ戻す |
| `pathLen(points)` | 折れ線 `[[x, y], ...]` → 長さ | |
| `along(points, k)` | 折れ線・割合 0〜1 → `{ x, y, tx, ty }`（tx, ty はその辺の向き、長さ 1） | 点を道すじに沿って動かす |
| `partial(points, k)` | 折れ線・割合 → 点の配列（2 点以上。k = 0 なら `[]`） | 線を途中まで描く |
| `growLine(points, k, style)` | → `[{ type: 'line', points, arrow: true, color?, width?, dashed? }]`（k = 0 なら `[]`） | 光以外の「伸びる線」 |
| `onCircle(cx, cy, r, d)` | 度 → `[x, y]`（右が 0°、画面で反時計回りが正。`content/space.js` と同じ） | 天体・回転 |
| `mix(c1, c2, k)` | `'#rrggbb'` 2 つ → `'#RRGGBB'`（形のまちがった色は例外） | 色が少しずつ変わる（石灰水・BTB・温度） |
| `TOKEN_HEX` | トークン名 → `'#RRGGBB'`（`figures-guide.md` の表と同じ） | `mix` にトークンの色を渡す: `mix(TOKEN_HEX.water, TOKEN_HEX.white, k)` |

## 3. 各 kind の決まり

- 場面は 320×240、x 右向き・y 下向き。静止図と同じ部品は同じ座標・文字・色を使い、動く部品だけを式で動かす。
- 周期の終わり（t → 1）と始まり（t = 0）がつながるようにする。振動・回転は整数回（`osc` の `n`）。一方向に進む動き（伸びる線・落下・移動）は「進む → 止まって見せる（0.1〜0.2 周）→ t = 0 で始めにもどる」の形（光の `stage(t, 0, 0.8)` と同じ）。
- 乱数は使わない。粒子のばらつきは番号 `i` からつくる位相（例 `phase = (i * 0.37) % 1`）で出す。
- 座標は丸めない（表示する文字の数だけ `Math.round` や `toFixed`）。
- 止まった絵（`restT`）は静止図にいちばん近い位置にする。線が伸びていく kind は描き終わり（0.99）、量が行き来する kind は静止図と同じ値になる t。
- 動きに合わせて変わる文字（「いま 2.4 N」など）は、静止図の文字の空いた所に足す。静止図の文字の位置は動かさない（変えるときは計画の「文字の例外」に書き、テストの `ANIM_TEXT_EXCEPTIONS` に足す）。
- 光線（橙の `ray`）は光の単元だけ。ほかの単元の矢印は `arrow`、伸びる線は `growLine`（`line`）。
- 粒子・イオン・原子の色は静止図と同じ（例: 酸素原子 `sky`、水素原子 `white`、Na+ `yellow`、Cl- `lightgreen`）。
- 点（電流の向き・炭素・信号）は半径 3〜5 の `circle`。文字を入れる丸は半径 10 以上。
- 1 枚のカードに動く図は 1 本。静止図（`figure`）は残す。写真（`image`）に替えたカードには付けない。

## 4. テストの約束

- `tests/anim.test.js`（光）は変えない（`anim.js` だけを読むので `KINDS.length === 23` のまま）。
- `tests/anim-register.test.js`: 登録口と道具（済み）。
- 分野ごとに `tests/anim-physics.test.js` などを作る（`anim.js` とそのファイルを読む）:
  - そのファイルの `KINDS` の数と名前（計画の一覧と同じ）。名前が単元の接頭辞で始まる。
  - 各 kind で t = 0, 0.25, 0.5, 0.75, 0.999 と `restT(kind)` の `frame` が、items が空でない・`type` がすべて `figures.ITEM_TYPES` にある・`x, y, x1, y1, x2, y2, cx, cy, r, rx, ry, width, height` と `points` がすべて有限で x −20〜340・y −20〜260 に収まる・`figures.sceneSvg` が `<svg` で始まる文字列を返す。
  - 「つながる」kind は `frame(kind, 0)` と `frame(kind, 0.99999)` の座標の差が 1px 以内。
  - 各 kind の欄の「テスト」に書いた値。
- `tests/content-all.test.js`（済み。分野ごとのファイルは、あれば自動で読む）: `anim` を持つカードの kind が `KINDS` にある・全単元で重ならない・接頭辞が単元に合う・静止図がある・静止図に `image` がない・静止図の `text`/`label` が例外を除いて `frame(kind, restT(kind))` に同じ `text`・`x`・`y` で入っている。光は接頭辞を見ず、光の 23 種は文字の整合を見ない（登録口より前に作ったため。あとから足した `li-` の kind は見る）。
- ミニプリントのステージ（id に `-mp` を含む）のカードは、登録済みのどの kind でも使ってよい（使い回し）。「重ならない」はミニプリント以外のカードだけで見る。登録した kind は 1 枚以上のカードが使い、ミニプリント以外のカードは 1 枚まで。ミニプリント以外のカードも使っている kind をミニプリントのカードが使うとき（使い回し）は、文字の整合を見ない（静止図の要点を変えて描いてあるため）。ミニプリントだけが使う新しい kind は見る。
