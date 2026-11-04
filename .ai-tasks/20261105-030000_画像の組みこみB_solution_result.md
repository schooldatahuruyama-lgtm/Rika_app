# 結果: 画像の組みこみ B — solution（水溶液）

状態: 完了。使った画像 4 枚 / 5 枚。使わなかった画像: sol-4-c4（ろ過）。

## 変更したファイル

- `content/solution.js`: 写真用の部品 3 つを追加。sol-1-c2・sol-1-c3・sol-4-c1・sol-4-c3 の figure を写真＋文字に差しかえ。sol-4-c4 は簡略図のまま。
- `docs/reports/content/solution.md`: 4 枚のカードに「（写真）」を書き足し（sol-1-c3 は粒子のモデルの説明を写真の説明に置きかえ）。

## 使わなかった画像

- **sol-4-c4（ろ過）**: 拡大して確かめたところ、ろうとの足がビーカーのまん中に下りていて壁についていない（液の中まで入っている）。このカードの要点「ろうとの足の長いほうをビーカーの内側の壁につける」と逆のようすなので、文字で補えないと判断して使わなかった。ほかにも、ろ紙がはっきり見えない、手と白衣が写っていて左右に文字の余白がない。作り直す場合は「ろうとの足のとがった先がビーカーの内側の壁にぴったりついている」を強く指示するとよい。画像ファイル `assets/images/solution/sol-4-c4.jpg` は消さずに残してある（どの図からも参照していないので、sw.js の PRECACHE に入れるかは controller の判断）。

## 判断したこと

- sol-1-c2: 下に「硫酸銅の水溶液 / 青色でも / すきとおっている」「泥水 / にごっていて / 下にたまる」。泥への引き出し線は文字と重なるので付けなかった（底の泥は写真で見える）。
- sol-1-c3: 3 本の間に灰色の矢印（時間の順）。下に「入れた直後」「数日後」「しばらくたつと / 均一になる」、最下段に「とけた物質は全体に均一に広がる」。
- sol-4-c1: 左の余白に「60 ℃ / すべて / とけていた」→ 青い下向き矢印「冷やす」→「20 ℃ / 結晶が / 出てくる」と結晶への引き出し線。
- sol-4-c3: 黒い台紙の下に物質名と形（硝酸カリウム（針のような形）・塩化ナトリウム（立方体）・ミョウバン（正八面体））と「結晶の形は物質で決まっている」。sol-4-r2（使い回し）は今回の対象外。

## テスト

`npm test`: 512 件中 503 件成功、9 件失敗。失敗はすべて `tests/content-all.test.js` の「sw.js の PRECACHE に assets/images/... がない」（substance・state-change・solution と、ほかの担当の chemical-change・ion・space・strata・volcano・weather）。指示書で許された失敗だけで、src の実在・形式の検査は成功。

## 確認

`figures.sceneSvg` で SVG にし、headless Edge で画像にして文字の位置を目で確かめた（`C:\Users\yan12\AppData\Local\Temp\claude\C--Users-yan12-Documents-keita-AI--------\06597260-147f-4081-8b2f-691841b121f6\scratchpad\img_check_<単元id>\figs_0.png` など）。内蔵ブラウザのタブは使っていない。

## 守ったこと

- 部品名は `photo(id)`・`pointer(x1, y1, x2, y2)`・`tag(x, y, text, opts)`（content/plants.js と同じ形。各ファイルの「図の部品をまとめる道具」の先頭に追加）。
- `sw.js`・`js/*`・`index.html`・テスト・ほかの単元は触っていない。画像は加工していない。git 操作なし。
- 対象カードに `anim` の付いたものはなかった（anim は sub-3-c1〜c3・sub-4-c2・state-1-c4・state-2-c2・state-4-c2・sol-1-c1・sol-3-c1・sol-4-c2 で、どれも対象外）。
- 簡略図用の道具（cylinderItems・distillItems・needleItems など）はほかの問題で使うので残した。

