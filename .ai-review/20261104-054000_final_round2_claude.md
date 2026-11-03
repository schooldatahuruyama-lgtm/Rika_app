# Claude 再レビュー結果（最終修正 / round 2）

対象: 1afc0ca..c0d6b48（5 ファイル）。`npm test` を読み取りのみで再実行し 108 件すべて成功を確認。

## 指摘の判定
| # | 指摘 | 判定（解消 / 未解消） | 根拠（ファイル:行） |
|---|---|---|---|
| 1 | 復習を途中で「やめる」と全額に戻る | 解消 | `js/app.js:258-262`。review セッションで events に `kind: 'history'` があれば（= `session.answer` が invalid でなく通った最初の解答。`js/session.js:187`）その場で `markReviewDone`。`startReview` は開始時に `reviewDone[conceptId] === 今日` なら `repeatMultiplier` を掛ける（`js/session.js:74-78`）ので、1 問答えて「やめる」→ 再開始は 0.5 になる。review には warmup がなく、無効な解答は `rejected`（events 空）で記録されない。今のセッションの `xpMultiplier` は開始時に固定済みなので、同じ復習の後続の問題は全額のまま（意図どおり）。stage は `kind === 'review'` で除外。結果画面側の呼び出し（`js/app.js:277`）は同じ日付を書くだけで二重でも無害。 |
| 2 | LAN の IP など http + SW なしで file:// の文言が出る | 解消 | `js/app.js:508-515`（`!web` → `unsupported-file`、web だが `serviceWorker` なし（`container` が null）→ `unsupported-insecure`）。`js/ui-screens.js:568-569`（state 未設定時の代替も同様）、`js/ui-screens.js:580-584`（file 向けは従来文、insecure は指示どおりの新文「…https か、このパソコンの http://127.0.0.1 で開くと使えます。」）。旧 `'unsupported'` はリポジトリ内に残りなし（grep 確認）。README に「Service Worker は https または localhost（127.0.0.1）でだけ動く」を追記（`README.md:17`、`README.md:44`）。 |
| 3 | lens-1-p2 の解説に「x が 200」 | 解消 | `content/light.js:1224`「レンズの右側の 1 点で集まります」。座標の記述なし。 |
| 4 | lens-2-p2 の許容 16px が 0.4f | 解消 | `content/light.js:1403-1419`。f=60、レンズ cx=160 → F (100,120)・F' (220,120)、スクリーン x=280（レンズから 120 = 2f）、target x=40（左に 120 = 2f）で幾何が整合。許容 16px は 16/60 ≒ 0.27f（旧 0.4f）で、正解の範囲は物体距離 1.73f〜2.27f（x=24〜56）。その両端でレンズの式から像を計算すると、u=104 → v≒141.8（スクリーンの 21.8px 先）、u=136 → v≒107.4（スクリーンの 12.6px 手前）、倍率 1.36〜0.79。旧設定（f=40）の許容幅 1.6f〜2.4f より狭まり、同じ大きさとみなせる範囲に収まる（これ以上はドラッグ許容 `config.js:20` の dragPx を変えない限り縮まらない）。samples: correct x=40（距離 0 → 正解）、wrong x=100（F の上。距離 60 > 16 → 不正解）。初期位置 x=76 は target から 36px はなれ、最初から正解にならない。図は 320×240（`js/figures.js:252-253`）に収まり、F/F' の文字（y=142）と物体の文字は x が離れている。samples テスト成功。 |
| 5 | lens-1-w1 と lens-1-r2 に安全の一文 | 解消 | `content/light.js:1183`（lens-1-w1）と `content/light.js:1290`（lens-1-r2）の explanation 末尾に「レンズで集めた日光は紙をこがすほど熱くなるので、目や手に向けないようにしましょう。」を追加。 |

## 修正差分が新たに壊したもの
なし。

- `sw.js` の VERSION を `2026-11-04-3` に上げ、README の更新例を `2026-11-04-4` に直した（教材と JS を変えたので VERSION 更新は妥当。`PRECACHE` の食い違いテストも通る）。
- 復習の `markReviewDone` を最初の解答で呼ぶ変更が、`reviewDone` を読む他の箇所に影響しないことを確認（読むのは `js/session.js:74` の startReview のみ）。ステージの再開位置・進捗は触らない。

## 範囲外の観察
- 実装者が書いているとおり、本物の file:// と LAN の IP（SW なし）の実地表示は未確認。state の setter 切り替えでの確認のみ。コード上の分岐（`js/app.js:509-515`）は読んで正しい。次のタブレット確認で LAN の IP から設定画面を見るとよい。
- `sw.js:4` のコメント「http(s):// で開いたときだけ…登録する」は、正確には「SW が使える http(s)（https か localhost）のとき」。動作には影響しない軽微な文言。
- 復習の `markReviewDone` は最初の解答の日付で記録するため、日付をまたいで続けた場合は開始日基準になる。小学生の授業での実害はほぼない。

## 判定
**修正ラウンド:** すべて解消・新たな Critical/Important なし

## Claude Code の対応
（空欄のままにしてください）

承認。最終レビュー完了（2026-11-04）。範囲外の観察（sw.js:4 のコメント、日付またぎの復習）は試作後の課題。
