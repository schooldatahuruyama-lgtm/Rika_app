# 教材の内容一覧（先生の確認用）

実装時の報告から、問題の一覧を抜き出したもの。原本は `content/light.js`。理科としての正しさは先生が確認する（設計書 10）。

## 直進・反射（Task 8 の報告）

# Task 8 報告: content/light.js（教材: 光の直進・反射）

- 状態: 完了（DONE）
- コミット: `34747a4 教材: 光の世界（直進・反射）`（`content/light.js` と `tests/content-light.test.js` の 2 ファイルだけを `git add`）
- テスト: `npm test` 100 件すべて成功（93 件 → 100 件。うち content-light.test.js が 6 件、残り 1 件はほかの実装者が足したもの）

## ファイル

- `content/light.js` — IIFE。Node では `module.exports = { unit }`、ブラウザでは `root.RikaQuest.content.register(unit)` を呼ぶ（`content-registry.js` を先に読み込むこと）。
  - unit `{ id: 'light', title: '光の世界' }`。領域 4 つ: `straight`「光の直進」(order 1)、`reflect`「光の反射」(2)、`refract`「光の屈折」(3, stages [])、`lens`「凸レンズ」(4, stages [])。
  - 概念 3 つ: `straight`（basic null, lesson `straight-1`）、`reflect-law`（basic `straight`, lesson `reflect-1`）、`mirror-image`（basic `reflect-law`, lesson `reflect-2`）。各 checkPool 3 問。
  - 書くための小さな道具（`scene`、`choice`、`fill`、`figureChoice`、`rayDraw`、`drag`、`word`、`number`）をファイルの先頭に置いた。`choice` は選択肢の文の配列を `[{ id:'a', text }, …]` に直す。
- `tests/content-light.test.js` — 6 件（`const STAGE_COUNT = 4;`。Task 10 で 8 に変える）
  1. `validateUnit(light.unit)` が `[]`
  2. ステージ数 = STAGE_COUNT、ステージの概念がすべて定義済み、各ステージに図・操作型が 1 問以上、各概念の retryPool ≥ 2・checkPool ≥ 3
  3. warmup・problems・retryPool・checkPool の ray-draw / drag を全部、`judge(problem, samples.correct, config).correct === true`、`samples.wrong` で `false`（invalid でもないこと）
  4. （追加）ray-draw は `source.x < hit.x`、drag の `draggable.itemId` の item が図にある、figure-choice の answer の region が図にある
  5. 教科書名・出版社名を含まない
  6. （追加）全問題に prompt・explanation・hint があり、レッスンカードは 3 枚・各 60〜120 字・図つき

## ステージと問題の一覧（科学の内容の確認用）

形式の略: C = choice、F = fill、FC = figure-choice、RD = ray-draw、D = drag。正解を【】で示す。

### straight-1「光はまっすぐ進む」（4 分、概念 straight）

カード: c1 光源と光の道すじ（電球から四方へ矢印）／c2 影ができるわけ（物体の上下のはしを通る光とスクリーンの影）／c3 物体を光源に近づけると影が大きくなる

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| straight-1-w1 | C | straight | 予想: 電球の光は何もない部屋をどう進む？【まっすぐ】 |
| straight-1-p1 | C | straight | 光源はどれ？ 月／鏡／太陽／白い紙【太陽】（月が光源でないことに触れる） |
| straight-1-p2 | F | straight | 自分で光を出すもの＝【光源】、光は【まっすぐ】進む（語群） |
| straight-1-p3 | FC | straight | 電球・物体・スクリーン。スクリーンのア〜ウのどこに影？【イ】（光源 (40,120)、物体 y110〜140 → スクリーンで y96〜168） |
| straight-1-p4 | C | straight | 影ができるわけ【光がまっすぐ進み、後ろへ回りこまないから】 |
| straight-1-p5 | D | straight | スクリーンの 2 点（y60・y180）のあいだにちょうど影ができるよう物体を左右に動かす。物体高さ 40 → 40×240/(x−40)=120 で x=120。正解例 x=120、不正解例 x=180 |
| straight-1-r1 | C | straight | 光源でないもの【月】 |
| straight-1-r2 | FC | straight | 電球より上にある物体の影の位置【ア（上）】（スクリーンで y33〜98） |
| straight-1-r3 | C | straight | 物体を電球に近づけると影は【大きくなる】 |

### straight-2「ものが見えるしくみ」（4 分、概念 straight）

カード: c1 電球の光が目に入って見える（目から何かが出るのではない）／c2 光源でないものは、当たってはね返った光が目に入って見える／c3 真っ暗だと光が目に届かないので見えない

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| straight-2-w1 | C | straight | 予想: 真っ暗な部屋で待てば白い紙は見える？【光がまったくなければ見えない】 |
| straight-2-p1 | C | straight | 本が見えるわけ【本ではね返った光が目に入る】（「目から光が出る」の誤概念を選択肢に） |
| straight-2-p2 | FC | straight | 目と電球のあいだに板。ア〜ウのどこの電球なら直接見える？【ア】（目と板のはしを結ぶ直線より上） |
| straight-2-p3 | F | straight | 光源の光が本で【はね返って】、その光が【目】に入る（語群） |
| straight-2-p4 | C | straight | 電灯を消しても昼間に本が見えるわけ【窓からの太陽光が本ではね返り目に入る】 |
| straight-2-p5 | FC | straight | 暗い部屋で光をしぼって当てる。ア〜ウのうち見えるのは？【イ（光が当たっているもの）】 |
| straight-2-r1 | C | straight | 花が見えるとき光の向きは【花 → 目】 |
| straight-2-r2 | FC | straight | 板にさえぎられて見えない電球の位置【ア】 |
| straight-2-r3 | F | straight | ものからの光が【目】に入るから見える |

### reflect-1「反射の法則」（5 分、概念 reflect-law）

カード: c1 反射・入射光・反射光／c2 法線・入射角・反射角／c3 入射角＝反射角、角度は法線から測る（30° の図）

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| reflect-1-w1 | C | reflect-law | 予想: ななめに当てた光はどうはね返る？【同じかたむきで反対側へ】 |
| reflect-1-p1 | RD | reflect-law | 水平な鏡 y=180、光源 (60,60)、当たる点 (160,180)、法線つき。正解例 out (260,60)（入射角＝反射角≒39.8°）、不正解例 (160,60)（真上＝0°） |
| reflect-1-p2 | F | reflect-law | 入射角 30° のとき反射角は【30】°（数値、許容 ±2） |
| reflect-1-p3 | FC | reflect-law | 入射角はどこ？ ア＝入射光と法線のあいだ【正解】、イ＝入射光と鏡の面のあいだ、ウ＝反射角 |
| reflect-1-p4 | C | reflect-law | 垂直に当てる（入射角 0°）と【来た道をそのまま戻る】 |
| reflect-1-p5 | RD | reflect-law | 縦の鏡 x=240、光源 (60,60)、当たる点 (240,140)、横向きの法線つき。正解例 out (60,220)、不正解例 (60,60)（来た道を戻る、なす角 47.9°） |
| reflect-1-r1 | RD | reflect-law | 水平な鏡 y=200、光源 (40,80)、当たる点 (130,200)。正解例 (220,80)、不正解例 (250,170)（角度が 39° ずれる、鏡の手前側） |
| reflect-1-r2 | F | reflect-law | 反射角 25° のとき入射角は【25】°（±2） |
| reflect-1-r3 | C | reflect-law | 入射角は【入射光と法線】のあいだの角 |

### reflect-2「鏡に映る像」（5 分、概念 mirror-image）

カード: c1 像は鏡の向こう、同じ距離にできる（距離 a の図）／c2 ものからの光が鏡で反射して目へ、反射光を鏡の向こうへのばした先が像／c3 像と目を結ぶ直線が鏡を通れば見える（見える範囲）

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| reflect-2-w1 | C | mirror-image | 予想: 鏡から 1 歩下がると像は？【像も 1 歩遠ざかる】 |
| reflect-2-p1 | D | mirror-image | 縦の鏡 x=160、もの x=100。「像」（id img）を左右に動かして像の位置へ。正解 x=220、不正解例 x=280 |
| reflect-2-p2 | F | mirror-image | 鏡から 2 m に立つと自分と像の距離は【4】m（許容 0） |
| reflect-2-p3 | FC | mirror-image | ものの先 (120,60) からの光が鏡 x=200 で反射して目 (110,190) へ。反射点は？【イ (200,121)】（ア＝ものの真横、ウ＝目の真横） |
| reflect-2-p4 | C | mirror-image | 像について正しいもの【鏡の向こう、ものと同じ距離】 |
| reflect-2-p5 | FC | mirror-image | 小さな鏡（x=200, y90〜150）と目 (120,120)。ア〜ウのうち鏡に映って見えるのは？【イ】（像と目を結ぶ線が鏡を通るのはイだけ。ア→鏡の位置で y≒65、ウ→y≒177） |
| reflect-2-r1 | D | mirror-image | 鏡 x=180、もの x=120 → 像 x=240（不正解例 300） |
| reflect-2-r2 | C | mirror-image | 鏡から 30 cm の花の像は鏡の向こう【30 cm】 |
| reflect-2-r3 | FC | mirror-image | ものの先 (140,180)、目 (100,60)、鏡 x=200 → 反射点【イ (200,135)】 |

### 概念の確認問題（checkPool）

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| straight-k1 | C | straight | 光は空気中を【まっすぐ】進む |
| straight-k2 | F | straight | 影の形は光源と物体のはしを結ぶ【まっすぐ】な線で決まる |
| straight-k3 | C | straight | 光源はどれ【ろうそくの炎】（鏡・月と比べる） |
| reflect-law-k1 | C | reflect-law | 入射角と反射角は【いつも等しい】 |
| reflect-law-k2 | F | reflect-law | 鏡の面に垂直な線＝【法線】 |
| reflect-law-k3 | C | reflect-law | 入射角 60° → 反射角【60°】（30° は鏡の面から測った誤り） |
| mirror-image-k1 | C | mirror-image | 像は【鏡の向こう、ものと同じ距離】 |
| mirror-image-k2 | F | mirror-image | 鏡に映って見えるもの＝【像】 |
| mirror-image-k3 | F | mirror-image | 鏡から 40 cm の人形の像は鏡の向こう【40】cm（許容 0） |

数: 各ステージ lessons 3・warmup 1・problems 5・retryPool 3。類題は straight 6（2 ステージ分）、reflect-law 3、mirror-image 3。ray-draw 3 問（すべて鏡）、drag 3 問。

## TDD の記録

1. `tests/content-light.test.js` を先に書いて実行 → `Error: Cannot find module '../content/light.js'` で失敗を確認。
2. `content/light.js` を書く → 6 件すべて成功（validateUnit も空）。
3. 見た目の確認: 全 28 場面を `figures.sceneSvg` で HTML に並べ、ヘッドレス Edge で撮って目で確認。直したこと: スクリーン・鏡の上に置いた region の「ア・イ・ウ」が線に重なって読みにくい → region の文字をやめて、左に `label` を置いた（region の中心は線上のまま）。straight-2-p5 で region の文字が物体の矢印に重なる → 文字を右に出した。reflect-1 の「入射角・反射角・30°・法線」の文字が光線に重なる → 角のすき間・鏡の下へ移した。reflect-2-c1 の「同じ距離」を「a」の印にした。直した後にもう一度撮って確認。
4. `npm test` 全体 100 件成功 → コミット。

## 自己レビュー

- 共通資料の形どおり（unit/area/stage/concept/problem、形式ごとの解答の形）。光は左から右（ray-draw は 3 問とも `source.x < hit.x`）。図は 320×240、region の r は 22 以上（straight-2-p5 だけ 26）。
- ray-draw・drag の samples は手で計算し、コメントに計算を残した。テストで `judge` と一致することを確かめた（不正解例が invalid にならないことも確認）。
- 解説は 2〜3 文、正解を言ってから理由を述べる形にし、「まちがえた」「ちがう」など生徒を責める言葉を使っていない。誤概念（目から光が出る、月は光源、角度を鏡の面から測る、像は鏡の面の上）は選択肢に入れ、解説で「そう考えたくなるのは自然」と受け止めるようにした。
- 文章と図はすべて自作。教科書名・出版社名は入れていない（テストで確認）。
- 選択式の正解の位置（a〜d）は問題ごとにばらした。

## 気になる点

- 紙の上の「影」は描いていない（item に塗りの四角がないため）。影はスクリーン上の範囲と文字「影」で表した。
- 光を通さない「板」は `screen` item を使ったので、図には「スクリーン」と表示される。問題文で「光を通さない板（スクリーン）」と書いて合わせた。
- 鏡・スクリーンの上の region は、文字を region の外（左）に置いた。画面側で region の当たり判定と選択の色が分かればよいが、Task 12 で実機確認してほしい。
- drag の samples は item の (x, y)（object は根元の座標）を前提にしている。Task 12 の画面がドラッグ結果として item の x, y を返すことを前提にした。
- fill の数値の空らんは許容 0 のもの（4 m、40 cm）がある。画面が小数（4.0 など）を受けても `judge` は数として比べるので問題ない。
- straight-2-p5 は電球の図（四方へ光を出す絵）で「光をしぼって当てる」状況を表しているので、少し分かりにくいかもしれない。先生の確認で気になれば、光の線を太く・はっきりさせる。

## 屈折・凸レンズ（Task 10 の報告）

# Task 10 報告: content/light.js（教材: 屈折・凸レンズ）

- 状態: 完了（DONE）
- コミット: `08e684c 教材: 光の世界（屈折・凸レンズ）`（`content/light.js` と `tests/content-light.test.js` の 2 ファイルだけを `git add`）
- テスト: `npm test` 102 件すべて成功（content-light.test.js は 6 件 → 8 件）

## ファイル

- `content/light.js`
  - 領域 `refract` に `refract-1`・`refract-2`、領域 `lens` に `lens-1`・`lens-2` を入れた（8 ステージ）。
  - 概念を 5 つ足した（計 8）: `refract-dir`「屈折の向き」(basic `straight`, lesson `refract-1`)、`refract-view`「屈折による見え方」(basic `refract-dir`, lesson `refract-2`)、`total-reflect`「全反射」(basic `refract-dir`, lesson `refract-2`)、`focus`「焦点」(basic `refract-dir`, lesson `lens-1`)、`lens-image`「レンズの像」(basic `focus`, lesson `lens-2`)。各 checkPool 3 問。
  - 道具を 1 つ足した: `guide(x1, y1, x2, y2)` — figure-choice の候補の向きを示す点線を、region の中心の 24 px 手前で止める（ア・イ・ウの文字に線が重ならないように）。
  - Task 8 レビューの Minor 4 件を直した（下記）。
- `tests/content-light.test.js`
  - `STAGE_COUNT = 8`
  - 追加 1: 概念 8 つ（id を名指し）がそろい、`refract-2` の `concepts` が `refract-view`・`total-reflect` の 2 つで、problems に両方の概念が付き、retryPool が概念ごとに 3 問
  - 追加 2: 全カード・全問題の `figure.items[].type` が `figures.ITEM_TYPES` に含まれる（Task 8 レビュー #11。item の書きまちがいで図が黙って消えるのを防ぐ）

## ステージと問題の一覧（先生の確認用）

形式の略: C = choice、F = fill、FC = figure-choice、RD = ray-draw、D = drag。正解を【】で示す。図は 320×240、x 右向き・y 下向き。屈折の角度は図の見た目の目安で、生徒には数値を出さない。

### refract-1「屈折の向き」（5 分、概念 refract-dir）

カード: c1 空気→水でななめに入る光は法線に近づく（点線はまっすぐ進んだときの道）／c2 水・ガラス→空気は法線から離れる、光の道すじは逆にたどれる／c3 垂直に入る光はそのまま進む、ガラスも同じ向きに屈折

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| refract-1-w1 | C | refract-dir | 予想: 空気→水へななめに入る光は？【境界面で折れ曲がる】 |
| refract-1-p1 | RD | refract-dir | **空気→水**。境界 y=120（下が水）、電球 (50,40) は境界の**上**、当たる点 (150,120)。入射は法線から約 51°。正解例 out (223,220)＝約 36°（近づく）、不正解例 (300,190)＝約 65°（離れる） |
| refract-1-p2 | F | refract-dir | 境界面で折れ曲がる＝【屈折】、空気→ガラスは法線に【近づく】 |
| refract-1-p3 | RD | refract-dir | **水→空気**。境界 y=110（下が水）、点 A (60,200) は境界の**下**、当たる点 (140,110)。入射約 42°。正解例 out (290,30)＝約 62°（離れる）、不正解例 (180,20)＝約 24°（近づく） |
| refract-1-p4 | FC | refract-dir | 空気→ガラス。ア＝法線に近づく【正解】、イ＝まっすぐのばした向き、ウ＝法線から離れる |
| refract-1-p5 | C | refract-dir | 水面に垂直に当てた光は【折れ曲がらずにまっすぐ】 |
| refract-1-r1 | RD | refract-dir | 空気→ガラス。境界 y=130、電球 (40,50) は上、当たる点 (130,130)。正解例 (185,230)＝約 29°、不正解例 (240,160)＝約 75° |
| refract-1-r2 | C | refract-dir | ガラス→空気にななめに出る光は【法線から離れる】 |
| refract-1-r3 | FC | refract-dir | 水→空気（点 A は下）。ア＝近づく、イ＝まっすぐ、ウ＝離れる【正解】 |

### refract-2「水中のものの見え方と全反射」（5 分、概念 refract-view・total-reflect）

カード: c1 コインからの光が水面で法線から離れて目に届き、コインは浮いて見える（逆にのばした点線と「浮いて見える」点）／c2 水に入れた棒の先が浮いて短く見える、ななめの棒が折れて見えるのも同じ理由／c3 水→空気で入射角が大きいと空気中へ出られず全部反射する＝全反射（入射角＝反射角）

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| refract-2-w1 | C | refract-view | 予想: コップの底のコインはどう見える？【浮き上がって見える】 |
| refract-2-p1 | FC | refract-view | **コインはどこに見える？** コイン (90,210)・水面 (170,70)・目。目に届く光を逆にのばすとコインの真上 y≒161 → イ【正解】。ア＝浮きすぎ (y104)、ウ＝実際の位置 |
| refract-2-p2 | C | refract-view | プールの底は【実際より浅く見える】（水に入るとき気をつけよう、も添えた） |
| refract-2-p3 | RD | refract-view | **水→空気**。コイン (80,200) は境界 y=110 の下、当たる点 (130,110)。入射約 29°。正解例 (208,19)＝約 41°、不正解例 (150,20)＝約 13° |
| refract-2-p4 | FC | total-reflect | 水中の電球から入射角約 54° で水面へ。ア＝まっすぐ空気中へ、イ＝法線に近づいて空気中へ、ウ＝水面で反射【正解・全反射】 |
| refract-2-p5 | C | total-reflect | 全反射が起こるのは【水・ガラス→空気で入射角が大きいとき】 |
| refract-2-r1 | C | refract-view | ななめに入れたストローは【水面で折れ曲がって見える】 |
| refract-2-r2 | FC | refract-view | コイン (100,210)・水面 (188,70)。逆にのばすと y≒158 → ウ【正解】。ア＝実際、イ＝浮きすぎ |
| refract-2-r3 | F | refract-view | コインは実際より【浮き上がって】見える。光が水面で【折れ曲がる】から |
| refract-2-r4 | C | total-reflect | 光ファイバーが利用しているのは【全反射】 |
| refract-2-r5 | FC | total-reflect | ガラス→空気、入射約 56°。ア＝まっすぐ、イ＝反射【正解】、ウ＝近づく |
| refract-2-r6 | C | total-reflect | 入射角を大きくしていくと【ある大きさをこえると全部反射する】 |

### lens-1「焦点と光の集まり方」（5 分、概念 focus）

カード: c1 凸レンズ、光軸、平行な光が 1 点に集まる＝焦点（3 本の平行光が F' に集まる図）／c2 焦点距離、焦点は両側に同じ距離、ふくらみが大きいほど短い（F〜中心〜F' を点線と青い点で示す）／c3 中心を通る光は直進、焦点を通ってから入った光は光軸に平行

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| lens-1-w1 | C | focus | 予想: 虫めがねで日光を紙に集めると？【ある距離で小さな明るい点になる】（太陽を直接見ない注意つき） |
| lens-1-p1 | RD | focus | **lens parallel**。レンズ cx=160, cy=120, f=60、光 (20,80)→(160,80)。正解例 out (280,160)（F' (220,120) を通る）、不正解例 (280,80)（まっすぐ、F' から 40 px） |
| lens-1-p2 | D | focus | **スクリーンを焦点へ**（axis x）。レンズ cx=130（F は描かない）、平行光 3 本、レンズを出た光は途中まで（のばして交わる点を考える）。目標 x=200（焦点距離 70）、正解例 200、不正解例 250。スクリーンのはじめの位置 x=270 |
| lens-1-p3 | C | focus | 焦点距離は【レンズの中心から焦点まで】 |
| lens-1-p4 | FC | focus | 中心へ向かう光の進む先。ア＝光軸に平行、イ＝まっすぐ【正解】、ウ＝下へ曲がる |
| lens-1-p5 | F | focus | 平行な光は【焦点】に集まる、中心から焦点までを【焦点距離】 |
| lens-1-r1 | RD | focus | lens parallel（光軸の下）。cx=150, f=70、光 (20,170)→(150,170)。正解例 (290,70)（F' (220,120) を通る）、不正解例 (290,170) |
| lens-1-r2 | C | focus | 日光を小さな点に集めるには紙を【焦点の位置】に |
| lens-1-r3 | D | focus | スクリーンを焦点へ。cx=110、焦点距離 60 → 目標 x=170、不正解例 230 |

### lens-2「実像と虚像」（6 分、概念 lens-image）

カード: c1 焦点の外の物体 → スクリーンに上下左右が逆の実像（f=40、物体はレンズから 120 → 像は 60、半分の大きさ）／c2 焦点距離の 2 倍の位置 → 反対側の 2 倍の位置に同じ大きさの実像、遠いと小さく・焦点に近いと大きく（物体 80 → 像 80）／c3 焦点の内側 → スクリーンに像はできず、のぞくと大きく同じ向きの虚像（f=50、物体 30 → 虚像は左 75、2.5 倍。逆にのばした点線が虚像の先で交わる）

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| lens-2-w1 | C | lens-image | 予想: 虫めがねで遠くの景色をのぞくと？【上下左右が逆さまに見える】 |
| lens-2-p1 | RD | lens-image | **lens center**。cx=170, f=50、物体の先 (60,70)→中心 (170,120)。正解例 out (280,170)（同じ向き）、不正解例 (280,120)（光軸に平行、約 24° ずれ） |
| lens-2-p2 | D | lens-image | **物体を動かしてスクリーンに像**（axis x）。f=40、レンズ cx=160、スクリーン x=240（焦点距離の 2 倍）→ 物体は x=80（左の 2 倍）。正解例 80、不正解例 105（2 倍より焦点寄り＝像はスクリーンより遠く）。物体のはじめの位置 x=30 |
| lens-2-p3 | C | lens-image | 焦点の内側に置くと【スクリーンに像は映らず、のぞくと大きな虚像】 |
| lens-2-p4 | RD | lens-image | **lens focus**。cx=170, f=50、物体の先 (60,90) → F (120,120) を通ってレンズ (170,145)。正解例 out (290,145)（光軸に平行）、不正解例 (290,205)（まっすぐ） |
| lens-2-p5 | F | lens-image | 焦点の外 → スクリーンに【実像】、向きは上下左右が【逆】 |
| lens-2-r1 | RD | lens-image | lens parallel（物体の先から）。cx=160, f=50、(50,80)→(160,80)。正解例 (285,180)（F' (210,120) を通る）、不正解例 (285,80) |
| lens-2-r2 | C | lens-image | 焦点距離の 2 倍の位置 → 実像は【物体と同じ大きさ】 |
| lens-2-r3 | D | lens-image | f=50、cx=150、スクリーン x=250（2 倍）→ 物体 x=50。不正解例 80。物体のはじめの位置 x=20 |

### 概念の確認問題（checkPool）

| id | 形式 | 概念 | 内容 |
|---|---|---|---|
| refract-dir-k1 | C | refract-dir | 空気→水へななめに進む光は【法線に近づくように折れ曲がる】 |
| refract-dir-k2 | F | refract-dir | 境界面で折れ曲がる＝【屈折】 |
| refract-dir-k3 | C | refract-dir | 水面に垂直に入った光は【まっすぐ進む】 |
| refract-view-k1 | C | refract-view | コインが浮いて見えるのは光の【屈折】のため |
| refract-view-k2 | C | refract-view | 池の魚は【実際より浅いところ】に見える |
| refract-view-k3 | F | refract-view | 水中のものからの光は水面で法線から【離れる】 |
| total-reflect-k1 | C | total-reflect | 境界面ですべて反射すること＝【全反射】（乱反射・屈折と比べる） |
| total-reflect-k2 | C | total-reflect | 全反射が起こるのは【水・ガラス→空気で入射角が大きいとき】 |
| total-reflect-k3 | F | total-reflect | 入射角がある大きさをこえると境界面ですべて【反射】 |
| focus-k1 | C | focus | 平行な光が集まる点＝【焦点】 |
| focus-k2 | C | focus | 中心を通る光は【まっすぐ進む】 |
| focus-k3 | F | focus | 中心から焦点までの距離＝【焦点距離】 |
| lens-image-k1 | C | lens-image | 虫めがねで近くの文字を見たときの像＝【虚像】 |
| lens-image-k2 | C | lens-image | 実像の向きは【上下左右が逆】 |
| lens-image-k3 | F | lens-image | 焦点の【内側】に置くとスクリーンに像はできず虚像が見える |

数: 各ステージ lessons 3・warmup 1（choice）・problems 5・retryPool 3（refract-2 だけ 6 = 概念ごとに 3）。新しい ray-draw 9 問（boundary 4 = refract-1-p1/p3/r1・refract-2-p3、lens 5 = parallel 3（lens-1-p1/r1・lens-2-r1）・center 1（lens-2-p1）・focus 1（lens-2-p4））、drag 4 問（lens-1-p2/r3、lens-2-p2/r3）。

## Task 8 レビューの Minor 4 件の修正

| # | 場所 | 直したこと |
|---|---|---|
| (a) | straight-1-c1 | 「光の進む道を矢印のついた直線で表したものを、光の道すじ」→「光の進む道を光の道すじといい、図では矢印のついた直線で表します。光は同じ物質の中ではまっすぐ進みます。」（道すじ＝通り道、矢印＝表し方を分け、屈折の領域の前置きも入れた。112 字） |
| (b) | reflect-1-c2・c3・p1・p2・p3・r1・p5 | `normal` の中心を当たった点から 60 ずらし、長さ 120 の法線が鏡の表側（当たった点から光源側へ 120）だけに描かれるようにした（水平な鏡は y=120 / 140、縦の鏡 p5 は x=180）。「入射角」「反射角」「30°」の文字とア・ウの region が法線の横に来る。c2 の「法線」の文字は法線の上はし (166,54) へ移した。ステージの先頭にこの約束をコメントで書いた |
| (c) | straight-1-p5 | 電球と 2 つの青い点を結ぶ点線（dashed ray）を 2 本足した。x=120 で点線は y 100・140 を通り、物体の上下のはしと重なる。問題文に「2 本の点線のあいだに物体がちょうど入るように」を足し、解説・ヒントもその考え方に合わせた。物体のはじめの位置を 200 → 240 にした（下の点線が「物体」の文字にかからないように）。目標・samples は変えていない |
| (d) | reflect-2-p5 | イを (60,130) → (60,170) へ。像 (340,170) と目を結ぶ線は鏡で y≒138（鏡 90〜150 の中）で正解のまま。イから反射点へ向かう光は x=120 で y≒156 を通り、目の絵（y 110〜130）にかからない。コメントの計算も直した |

## TDD の記録

1. `STAGE_COUNT = 8` に変え、2 件のテストを足して実行 → `tests 8 / pass 6 / fail 2`（`assert.equal(stages.length, STAGE_COUNT)` が `actual: 4, expected: 8`、新しいテストが「概念 refract-dir がない」で失敗）を確認。
2. 4 ステージと 5 概念、Minor 4 件を書く → `node --test tests/content-light.test.js` で `tests 8 / pass 8 / fail 0`。新しい ray-draw・drag の samples もすべて judge と一致（不正解例が invalid にならないことも含む）。
3. 見た目の確認（下記）で図を直したあと、もう一度 `tests 8 / pass 8`。
4. `npm test` 全体: `tests 102 / pass 102 / fail 0` → コミット。

## 見た目の確認

全場面を `figures.sceneSvg` で HTML に並べ（ray-draw には samples.correct の光線を点線で、drag には目標の位置を印で重ねた）、ヘッドレス Edge（`msedge --headless=new --screenshot`）で撮って目で確かめた。スクリーンショットは scratchpad の `refract.png`・`lens.png`・`fixes.png`。

- 境界の問題: 空気→水・ガラス（refract-1-p1・r1・p4）は光源が境界の上（空気側、白）、水→空気（refract-1-p3・r3、refract-2-p3・p4・r5）は光源が下（水・ガラスの色の中）にあり、塗りと物質名（右端）が合っている。正解例の点線は、空気→水で法線に近づき、水→空気で離れて見える。
- レンズの図: F・F' がレンズの両側に出る。parallel の正解例は F' を通り、center はまっすぐ、focus は光軸に平行。lens-2-c1・c2 の実像は下向き（height 負）、c3 の虚像は物体より大きく上向きで、逆にのばした点線が虚像の先で交わる。
- 1 回目の撮影で直したこと: figure-choice の候補の点線が region の中心まで入り「ア・イ・ウ」の文字に重なる → `guide()` で丸の手前で止めた。点 A の文字（点の右上に出る）が光線に重なる → 文字を点の左に出した。refract-2-p1・r2 でコインの点が「ウ／ア」の文字に重なる → region の文字をやめて丸の左に label を置き、「コイン」は右下へ。lens-1-c2 の「焦点距離」の文字がレンズの下はしに重なる → 線と文字を少し下げた。lens-2-c3 の「物体」の文字がレンズにかかる → 左へずらした。straight-1-p5 の下の点線が「物体」の文字にかかる → 物体のはじめの位置を右へ。
- 直した後にもう一度撮って確認した。

## 自己レビュー

- 共通資料の形どおり。光はすべて左から右（全 ray-draw で `source.x < hit.x`、テストで確認）。レンズの物体・光源はすべてレンズの左。
- 屈折の ray-draw はすべて「ななめ」に入る光にした（judge は法線と平行な光の向きを決められないため、垂直に入る光は choice で扱った）。水→空気の問題は入射角を 29°〜42° にして、水の全反射が起こる大きさ（約 49°）より小さくした。全反射の図は 54°・56°（ガラス）にした。
- drag の目標はレンズの式で計算して置いた（lens-2-p2: f=40、スクリーン 80 → 物体 80。r3: f=50、100 → 100）が、生徒の文には式を出さず「焦点距離の 2 倍の位置に置くと同じ大きさの実像」と説明した。屈折率の値・屈折の法則・レンズの式・臨界角という言葉は使っていない。
- 解説は正解を言ってから理由を述べ、「〜できていれば大丈夫です」など責めない言い方にした。誤概念（法線から離れる向きに曲がる、まっすぐ進む、底は深く見える、中心を通る光も焦点へ、焦点の内側でも実像）を選択肢・不正解例に入れた。
- 安全: 虫めがねで太陽を直接見ない、プールは見た目より深い、を解説に入れた。
- 選択式の正解の位置は a〜c にばらした。文章と図はすべて自作で、教科書名・出版社名はない（テストで確認）。

## 気になる点

- 虚像も `object` item（実線の緑の矢印）で描いている（Task 8 レビュー #5 と同じ。点線の object が figures.js にないため）。ラベル「虚像」と逆にのばした点線で区別した。
- 「光が見える位置」の図（refract-2-c1・c2・p1・r2）は、中1 の図の慣習どおり、見える位置をコインや棒の真上に置いた（実際には少し目の側へずれる）。
- 全反射の ray-draw は作らなかった（judge の boundary は屈折だけを判定するため）。全反射は figure-choice 2 問と choice・fill で扱った。
- lens-1-p2・r3 のレンズには `f` を入れず F・F' を描いていない（F' が答えになってしまうため）。レンズを出た光を途中まで描き、のばして交わる点を探させる。画面で光の線がスクリーンの後ろ側にも描かれたままになるが、静止した図なので問題はないと考えた。
- lens-2-p2 の許容は 16 px（x 64〜96）で、その範囲の端では実際の像の位置は少しずれる（u=64 → v≒107）。「スクリーンに映る位置の近く」として許した。
- drag の samples は Task 8 と同じく item の (x, y)（object は根元、screen は y を中央の 120 とした）。どれも axis x なので y は判定に使われない。
- Task 8 レビューの残りの Minor（#5〜#10）は手を付けていない（最終レビューの deferred minor のまま）。#11（item の type の検査）はテストに足した。

## 最終修正（lens-1-p2、lens-2-p2、日光の安全の一文）

# 最終レビュー修正の報告（試作1）

- コミット: `c0d6b48` 「最終レビュー修正: 復習の 1 日 1 回、オフライン文言、教材の説明と許容」（親 1afc0ca）
- 変更ファイル: js/app.js、js/ui-screens.js、content/light.js、README.md、sw.js（5 ファイル、+36 / −18）
- `npm test`: 108 件すべて成功（修正後に 2 回実行。最後は lens-2-p2 の初期位置を直したあと）

```
✔ ray-draw と drag の問題は samples.correct で correct、samples.wrong で不正解になる (2.3ms)
ℹ tests 108
ℹ pass 108
ℹ fail 0
```

## 1. 復習の「1 概念につき 1 日 1 回だけ全額」（Important）

**変更:** `js/app.js:258-262`（commitSession）。`newSession.kind === 'review'` で、events に `kind: 'history'`（有効な解答）があるとき `RQ.record.markReviewDone(rec, newSession.conceptId, RQ.xp.localDate(now))` を入れる。結果画面での呼び出し（closeRecord、`js/app.js:277`）はそのまま。同じ日付を書くだけなので二重に呼ばれても変わらない。stage のセッションは条件に入らない。

**テスト:** app.js には自動テストがない（既存方針）。`npm test` 108 件成功で回帰なし。

**ブラウザ（http://127.0.0.1:8765/、プロフィール「テスト」）:**
- `go('problem', { review: 'focus' })`（ホームの「復習する」と同じ呼び出し）→ xpMultiplier 1。lens-1-r1 に samples.correct で解答 → その時点で `reviewDone = { focus: '2026-11-04' }`、localStorage にも保存済み。
- 画面の「やめる」をクリック → ホームへ。
- もう一度同じ復習を始める → **xpMultiplier 0.5**。3 問答えて結果画面へ → 内訳「答えた ×3 +15、正解 ×3 +15、合計 +30 XP」「もう一度の挑戦なので、経験値は半分です。」が出た。
- ステージ（straight-1 の続き）で 1 問答えても reviewDone は変わらず、resume（index・pending）は従来どおり保存された。

## 2. オフライン欄の文言（file:// と http で SW なしを分ける）（Important）

**変更:**
- `js/app.js:508-516`（setupOffline）: `!web` → `{ state: 'unsupported-file' }`、web だが `serviceWorker` なし → `{ state: 'unsupported-insecure' }`。`pending` / `ready` / `failed` の流れは変更なし。`js/app.js:10` の状態一覧のコメントも更新。
- `js/ui-screens.js:568-569`（state がまだないときの代わり）: file: → `unsupported-file`、SW なし → `unsupported-insecure`。
- `js/ui-screens.js:580-584`: `unsupported-file` は従来の文「この開き方（file://）では…http で開くと使えます。」、`unsupported-insecure` は「この開き方ではオフライン対応は使えません。https か、このパソコンの http://127.0.0.1 で開くと使えます。」。
- `README.md:17`（開き方）と `README.md:44`（オフライン対応のしくみ）に「Service Worker は https または localhost（127.0.0.1）でだけ動く」「LAN の IP を http で開いたときは使えない」を追記。

**ブラウザ:**
- http://127.0.0.1:8765/ の設定画面: 「オフラインで使える: 光の世界（版 2026-11-04-3、済）」。
- `app.offline` の setter で状態を切り替えて設定画面の箱を確認: unsupported-file → file 向けの文、unsupported-insecure → 新しい文、failed → 「オフライン対応を準備できませんでした」、pending → 「オフライン対応: 準備中（読み込み中）」。元に戻すと「済」に戻った。
- 本物の file:// は Claude のブラウザ枠では静的なスナップショット（data:、スクリプトなし）になり、アプリが動かないため確認できなかった。file:// の分岐は `protocol === 'file:'` → `!web` で従来と同じ条件のまま state 名だけ変えたので、表示はコード上で上の setter 確認と同じになる。LAN の IP（SW なし）の実地確認も、サーバーを 127.0.0.1 にだけ bind しているため行っていない（setter での表示確認のみ）。

## 3. lens-1-p2 の解説から座標を消す（Minor）

**変更:** `content/light.js:1224`「x が 200 のところで 1 点に集まります」→「レンズの右側の 1 点で集まります」。

## 4. lens-2-p2 の許容（f=60 にして図を整える）（Minor）

**変更:** `content/light.js:1405-1417`。
- レンズ cx=160 のまま、`f: 60` → F (100,120)・F' (220,120)。
- スクリーン x=280（レンズから 120 = 2f）。target x=40（左に 2f）。許容 16px は約 0.27f（物体がレンズから 1.73f〜2.27f）。
- 物体の初期位置 x=76（レンズから 84 = 1.4f、target から 36px）。最初は 1.3f（x=82）にしたが、画面で「物体」の文字が F の文字にくっついて「物体F」と読めたため、1.4f に寄せた（ドラッグの丸も F の点にかからない）。
- samples: correct = { x: 40, y: 120 }（target）、wrong = { x: 100, y: 120 }（target.x + 60。焦点 F の上で像ができない。16px の外）。
- 解説は従来どおり定性的（「焦点距離の 2 倍の位置」）。
- 320×240 に収まる（物体の丸 12〜68、スクリーンと「スクリーン」の文字は 320 以内、レンズ 50〜190）。

**テスト:** samples テスト（content-light.test.js）成功。

**ブラウザ:** 凸レンズ 2「実像と虚像」の問題 2/5 を表示。F・F'・スクリーン・物体の位置が上のとおりで、文字の重なりなし。物体を画面で左へドラッグ →「位置: 40」→「答える」で「正解！」。

## 5. 日光を集める問題に安全の一文（Minor）

**変更:** `content/light.js:1183`（lens-1-w1）と `content/light.js:1290`（lens-1-r2）の explanation の末尾に「レンズで集めた日光は紙をこがすほど熱くなるので、目や手に向けないようにしましょう。」を追加。

## そのほか

- `sw.js:7` の VERSION を `2026-11-04-2` → `2026-11-04-3`。あわせて README の更新手順の例を `2026-11-04-3` → `2026-11-04-4` に直した（今の版と例をそろえるだけの 1 語。指示の 5 件の外なので、不要なら戻してよい）。
- ブラウザ確認のため、ブラウザ枠の Service Worker の登録とキャッシュを一度消して入れ直した（最新の content/light.js を読むため）。入れ直した直後は「準備中」のままで、もう一度開くと「済」になった（レビューで「後でよい」とした既知の動き）。
- 確認に使ったプロフィール「テスト」の記録（XP、reviewDone.focus、straight-1・lens-2 の続き）が変わっている（試作の架空の生徒）。
- サーバーは確認後に止めた。

## 懸念

- file:// と LAN の http での実地表示は未確認（上記の理由）。次のタブレット確認で LAN の IP から開いたときに新しい文が出ることを見てほしい。
