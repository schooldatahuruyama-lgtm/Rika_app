# 実装報告: 画像の組みこみ A — heredity（生命の連続性）

実装: Claude（Opus）2026-11-04。指示書 `.ai-tasks/20261104-224000_画像の組みこみA.md`。

## 状態

完了（`sw.js` の PRECACHE への追加は指示どおり未対応。controller が行う）。

## 使った画像（7 枚 / 計画 7 枚）

`assets/images/heredity/` にコピー（加工なし。ファイル名は計画どおりカード id の `life-…png`）し、解説カードの `figure` を「`image` ＋ 白い下地つきの文字（`bg: true`）＋ 濃い引き出し線」に差しかえた。各画像を見て座標を決め、headless Edge で描いた画像で位置を確かめた（`scratchpad/img_check_heredity/`）。

| カード | 重ねた文字 |
|---|---|
| life-1-c1 | ①分裂前・②染色体が現れる・③中央に並ぶ・④両端に分かれる・⑤2つに分かれる（各段階の細胞へ引き出し線）、「①〜⑤ 分裂の順」 |
| life-1-c3 | 根の先を守る部分・成長点（分裂がさかん）・大きくなった細胞、根もとへの矢印 |
| life-2-c1 | 分裂（ゾウリムシ）・出芽（ヒドラ）・栄養生殖（いも）、「親のからだの一部が子になる」 |
| life-2-c3 | 受精卵・2 細胞・4 細胞・多くの細胞・おたまじゃくし、順の矢印 4 本、「2細胞〜は胚」 |
| life-2-c4 | 花粉・花粉管、「この管の中を精細胞が運ばれ、胚珠の卵細胞と受精する」（6 行） |
| life-3-c1 | 丸い種子・しわのある種子、「丸 と しわ は 対立形質」「（1 つの種子には、どちらか一方が現れる）」 |
| life-4-c3 | 羽毛・つばさ（青＝鳥類の特徴）、口の歯・つばさの先のつめ・骨のある長い尾（茶＝ハチュウ類の特徴）、色の説明 |

## 使わなかった画像

なし。`anim` の付いたカード（life-1-c2、life-2-c2、life-3-c3）は計画どおり画像にしていない。

## 判断したこと

- life-1-c1: 写真の中で各段階の細胞の場所がばらばらなので、文字は右の余白に引き出し線の先の上下の順に並べ、分裂の順は丸数字 ①〜⑤ で示した。段階の形は自分の目では正しく見えるが、log.md の備考どおり先生の確認をすすめる。
- life-2-c3: 計画の「胚」の範囲は、上下 2 段の写真ではかっこで囲めないため、下段の 2 つの卵の間に「2細胞〜は胚」と書いた。
- life-4-c3: 2 色は文字の色（`blue`・`brown`）で分け、左下に「青: 鳥類の特徴」「茶: ハチュウ類の特徴」を置いた。
- 写真の文字は size 13〜15。`content/heredity.js` に `photo(id)`・`pin(x1, y1, x2, y2)`・`tag(x, y, text, o)` を足した。`divCell`・`rootItems`・`roundPea`・`wrinkled` はほかの問題・図で使うので残した。
- `docs/reports/content/heredity.md` の 7 枚のカードに「（写真）」を書き足した。

## テスト

`npm test`: 477 件中 472 件成功、5 件失敗。失敗はすべて「図の image の src は … sw.js の PRECACHE に入っている」（body・heredity・plants・animals・nature）。heredity の失敗は `sw.js の PRECACHE に assets/images/heredity/life-1-c1.png がない` だけで、指示書で許された失敗。画像 7 枚のファイルが実在することは別に確かめた。

## 変更したファイル

- `content/heredity.js`
- `assets/images/heredity/`（7 枚を追加）
- `docs/reports/content/heredity.md`
