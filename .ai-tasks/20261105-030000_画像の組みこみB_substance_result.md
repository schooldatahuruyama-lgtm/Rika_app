# 結果: 画像の組みこみ B — substance（身のまわりの物質）

状態: 完了。使った画像 6 枚 / 6 枚。使わなかった画像: なし。

## 変更したファイル

- `content/substance.js`: 写真用の部品 3 つを追加。sub-1-c1・sub-1-c2・sub-1-c3・sub-2-c2・sub-2-c3・sub-2-c4 の figure を写真＋文字に差しかえ。
- `docs/reports/content/substance.md`: 6 枚のカードに「（写真）」を書き足し（sub-1-c2 は回路の図の説明を写真の説明に置きかえ）。

## 判断したこと

- sub-1-c2: 写真は金属の板 3 枚なので、文字は「鉄」「銅」「アルミニウム」「みがくと光る（金属光沢）」に加え、解説文の性質から「電気を通す・熱を伝えやすい」を下に置いた（旧図の回路はなくなる）。
- sub-1-c3: 2 つのびんの間に青い矢印。下に「ろうを燃やす」「ろう（有機物）」「石灰水を入れてふる」「→ 白くにごる」。
- sub-2-c2: 「水の密度 / 約 1.0 g/cm³」は 2 行にした（1 行だと白い下地がビーカーにかかる）。木・鉄に引き出し線と「水より密度が小さい / 大きい」。
- sub-2-c3: 画像の目盛りを画素で測り、長い線（y 37・112・188）を 50・40・30 mL、1 目盛り 1 mL とした（数字は生成画像に無いのでアプリで重ねた、計画どおり）。へこんだ平らなところ（y 約 122）に右から赤い矢印、「へこんだ平らなところを真横から読む」「1目盛りの10分の1まで目分量で読む」。log.md の「やや上から見た液面」は読み取りに支障ないと判断。
- sub-2-c4: 上に余白が少ないので「はかるもの」「分銅」は上のはしに置いて引き出し線、「針」は左から線、手前の箱に「分銅の箱」、ピンセットの下に「ピンセット」。旧図の「針が左右に等しくふれればつり合い」は置く場所がないので外した（解説文に書いてある）。

## テスト

`npm test`: 512 件中 503 件成功、9 件失敗。失敗はすべて `tests/content-all.test.js` の「sw.js の PRECACHE に assets/images/... がない」（substance・state-change・solution と、ほかの担当の chemical-change・ion・space・strata・volcano・weather）。指示書で許された失敗だけで、src の実在・形式の検査は成功。

## 確認

`figures.sceneSvg` で SVG にし、headless Edge で画像にして文字の位置を目で確かめた（`C:\Users\yan12\AppData\Local\Temp\claude\C--Users-yan12-Documents-keita-AI--------\06597260-147f-4081-8b2f-691841b121f6\scratchpad\img_check_<単元id>\figs_0.png` など）。内蔵ブラウザのタブは使っていない。

## 守ったこと

- 部品名は `photo(id)`・`pointer(x1, y1, x2, y2)`・`tag(x, y, text, opts)`（content/plants.js と同じ形。各ファイルの「図の部品をまとめる道具」の先頭に追加）。
- `sw.js`・`js/*`・`index.html`・テスト・ほかの単元は触っていない。画像は加工していない。git 操作なし。
- 対象カードに `anim` の付いたものはなかった（anim は sub-3-c1〜c3・sub-4-c2・state-1-c4・state-2-c2・state-4-c2・sol-1-c1・sol-3-c1・sol-4-c2 で、どれも対象外）。
- 簡略図用の道具（cylinderItems・distillItems・needleItems など）はほかの問題で使うので残した。

