# 実装報告: 画像の組みこみ B — chemical-change（化学変化と原子・分子）

実装: Claude（Opus）2026-11-05。指示書: `20261105-030000_画像の組みこみB.md`（A の指示書との差分）

## 状態

完了（`sw.js` の PRECACHE 追加だけ controller 待ち）。

## 使った画像（5 枚 → 5 枚のカード）

`assets/images/chemical-change/` の jpg（controller が置いたもの。加工なし）。

| カード | 画像 | 重ねたもの |
|---|---|---|
| chem-1-c2 | chem-1-c2.jpg | 炭酸水素ナトリウム・口を少し下げる・加熱・石灰水（引き出し線 4 本） |
| chem-1-c3 | chem-1-c3.jpg | 塩化コバルト紙、青色 → 赤色（桃色）の矢印、「水にふれると赤色（桃色）＝ 水がある」、石灰水「白くにごる ＝ 二酸化炭素」 |
| chem-1-c4 | chem-1-c4.jpg | 水素・酸素（気体のたまった所へ引き出し線）、陰極（−）・陽極（＋）（電極へ引き出し線）、「体積の比 水素：酸素 2：1」 |
| chem-3-c2 | chem-3-c2.jpg | 加熱前 → 加熱後、鉄と硫黄の混合物・磁石につく、硫化鉄（黒色）・磁石につかない、Fe ＋ S → FeS |
| chem-3-c3 | chem-3-c3.jpg | 銅（赤茶色）→ 加熱 → 酸化銅（黒色）（皿の右の余白にたての矢印）、「銅の酸化」、マグネシウムの燃焼（強い光と熱）（光へ引き出し線） |

使わなかった画像: なし。

## 変更したファイル

- `content/chemical-change.js`
  - 写真用の道具を追加: `photo(name)`・`pointer(x1, y1, x2, y2)`・`tag(x, y, text, o)`（`content/plants.js` と同じ形。パスは `assets/images/chemical-change/`）。
  - 上の 5 枚のカードの `figure` を「image＋文字・引き出し線」に差しかえ。座標は各 jpg を見て、画像の位置 × 0.5 で決めた。
  - `heatingItems()`（chem-3-c4 で使用）と `electrolysisScene()`（chem-1-p3 で使用）は残した。
- `docs/reports/content/chemical-change.md`: 5 枚のカードの説明に「（写真）」（古い図の説明は置きかえ）。

触っていない: `sw.js`、`js/*`、`index.html`、テスト、ほかの単元、問題の図、`anim` の付いたカード（chem-3-c1 など。対象 5 枚には anim なし）。

## 判断したこと

- chem-1-c2: 加熱する試験管の口が底より低いことを画像で確認（log.md のとおりやり直し済み）。石灰水の中のガラス管の先は見えにくいが、「石灰水」の引き出し線は試験管の液に向けたので支障なしと判断。
- chem-1-c4: 気体の多い左の管が黒い導線（−極）、右が赤い導線（＋極）で、計画の「気体が多い側を陰極」と導線の色が合っている。
- chem-3-c2: 計画の文字のうち、塩酸との反応（水素・硫化水素）は本文にあるので図からは外した（写真の余白に収めるため）。
- chem-3-c3: 酸化マグネシウム（白色）は写真に写っていないので図から外した（本文の「燃焼」の説明はそのまま）。

## 先生に確かめてほしい点

- chem-1-c2: 石灰水に差しこんだガラス管の先が見えにくい（log.md の備考）。
- chem-1-c3: 石灰水の試験管が上と右で切れている（支障なし）。

## 確認

- `npm test`: 503 件中 494 件成功、9 件失敗。chemical-change の失敗は「sw.js の PRECACHE に assets/images/chemical-change/… がない」だけ（指示書で許された失敗）。ほかの失敗は ion・space・substance・volcano・weather の同じ理由と、ほかの担当の作業中の動く図（io-ion-count・sp-noon-altitude・sp-sunspot。`js/anim-*.js` の変更で、この単元の変更とは関係ない）。
- 目での確認: `figures.sceneSvg` で SVG にし、画像を絶対パスにした HTML を headless Edge で画像にして 5 枚を見た（`C:\Users\yan12\AppData\Local\Temp\claude\C--Users-yan12-Documents-keita-AI--------\06597260-147f-4081-8b2f-691841b121f6\scratchpad\img_check_chemical-change\figs_0.png`・`figs_1.png`）。文字どうし・文字と大事な部分の重なりはない。
