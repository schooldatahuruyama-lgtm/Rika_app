# 最終レビュー結果（試作1 全体）

対象: 275ab2d..1afc0ca（21 コミット、40 ファイル、+9145 / −18）。読み取り専用で確認した。
読み方: 差分パッケージ（約 460KB）は 4 回に分けて読んだ。(1) ロジック（js/config・geometry・judge・mastery・xp・record・storage・session・recommend・content-registry）、(2) 教材（content/light.js。全 99 問の文・選択肢・解説と、figure-choice / ray-draw / drag の図の座標を幾何で検算）、(3) 画面（js/app.js・ui-screens.js・ui-problems.js・figures.js・mascot.js・index.html・css/style.css）、(4) sw.js・manifest・README・docs・tests。最後のコミット 1afc0ca「試作1 仕上げ」は `git diff fceded9 1afc0ca` で、タスクレビューと同じ観点（仕様との一致・品質）で別に見た。
`npm test`: 108 件すべて成功（prompt の 106 件に、1afc0ca で足した 2 件が加わった数）。

## 良い点

- **ロジックと画面の分け方が計画どおり。** session / record / storage / judge / recommend は DOM を触らない純粋関数で、元のオブジェクトを変えずに新しいものを返す。app.js は「answer / next / choose → events を applyEvents → stage なら setResume → 終わったら finishStage / markReviewDone → save」を 1 か所（commitSession）で通していて、契約の使い方がそろっている。
- **経験値の二重計上と resume の作りがしっかりしている。** 解答直後に pending を含んだ session を resume に保存し、`awardedProblemIds` で 1 問 1 回に限っているので、解答直後の再読み込みでも XP が重複しない。`choose('later')` が最後の step のときの stageClear（Ruling）も app が events を記録に入れている。
- **学び直しの分岐（設計書 4.3）が全部ある。** 類題 → offer → 確認 2 問 → 基礎の解説 → 再確認 1 問 → 「今日はここまで」、basic のない概念での解説挿入、プール切れ、同じ basic への 2 回目（checkPool 3 問で回す）まで、テストが本物の振る舞い（events の種類・順・回数）を確かめている。
- **判定と教材の整合を自動テストで担保。** ray-draw / drag は全問に samples（正解例・不正解例）があり、教材テストで judge を通している。私の検算でも、figure-choice の正解（影の範囲、見える／見えない、像と反射点、浮き上がりの見かけの位置、全反射の入射角 54.5°・56.3°＞臨界角、凸レンズの 3 本の光線、2f の位置）はすべて幾何的に正しかった。屈折の向き・反射の法則・焦点・実像／虚像の文に理科としての誤りは見つからなかった。
- **安全性。** 利用者の文字はすべて textContent。innerHTML は figures / mascot の SVG 文字列だけで、文字は escapeText を通る。壊れたデータは退避してから消し、退避できないときは原本を残して以後の保存を止め、設定画面から明示的に上書きできる。localStorage の例外でも学習は続く。
- **オフライン。** PRECACHE と index.html の食い違いをテストで検出、install は `cache: 'reload'` で取り直し、activate で古い版を消す。file:// では登録せず manifest も足さない（Ruling）ので無害。install 失敗（redundant）も「準備できませんでした」になる。
- **見た目の約束。** 本文 18px 以上（CSS に 18px 未満の font-size なし）、ボタン 56px、赤なし（削除は濃い枠）、「おしい／ここを見直そう」で責めない表現、理解度は経験値と別カード。
- **1afc0ca（仕上げ）について:** 図の文字を最後の層にまとめて光線に隠れないようにした変更は、ドラッグ対象の文字を item の中に残し、層に `pointer-events="none"` を付けてタップを下の丸へ通しているので、選択・ドラッグを壊していない（transform を使う item がないことも確認）。光線を引く始点・当たる点の当たり判定を「画面で直径 44px 以上」に縮尺から計算する変更、region に `name` を足して画面に id を出さない変更（テスト付き）、スマホ幅で図をカードの余白まで広げる CSS（375px で縮尺 ≒1.02、横スクロールなし）、VERSION の更新、いずれも妥当。README は検証項目 1〜6 の手順が実物（ステージの形式構成、反射 2 → 反射の法則への学び直し、XP 内訳の名前）と合っている。

## 指摘事項

| # | 重要度 | ファイル:行 | 内容 | 修正案 |
|---|---|---|---|---|
| 1 | Important | js/app.js:320-328, js/app.js:266-273（js/session.js:74-78） | 復習クエストを途中で「やめる」と session を捨て、`markReviewDone` は最後まで終えたときだけ呼ばれる。そのため「1〜2 問答える → やめる → もう一度復習」をくり返すと、毎回 `xpMultiplier` 1（全額）で経験値が入る。設計書 4.5 の決めたこと「復習クエストは 1 概念につき 1 日 1 回だけ全額、2 回目からは半分」に反し、全部クリア後（優先 4 で同じ概念の復習が出続ける）に経験値をいくらでもかせげる。検証項目 5（取り組みが経験値になる）の確認で先生が気づく種類の穴。 | 復習の最初の解答を記録に入れるとき（commitSession で kind 'review' かつ events に history があるとき）に `markReviewDone(rec, conceptId, 今日)` も入れる。または startReview を始めた時点で記録する。テストは app.js にないので、手順を README の検証 5 に 1 行足すか、record 側に小さな関数を切ってテストする。 |
| 2 | Important | js/app.js:495-505, js/ui-screens.js:568-581, README.md:43 | Service Worker は https か localhost（127.0.0.1）でしか動かないが、`http://192.168.x.x:8765/` のように LAN の http で開くと `'serviceWorker' in navigator` が偽で state 'unsupported' になり、設定画面に「この開き方（file://）ではオフライン対応は使えません。http で開くと使えます。」と**事実と違う案内**が出る。README も「http(s) で開いたときだけ」と書いていて、localhost／https の条件がない（Task 14 で「Task 15 で README の http(s) の条件」と持ち越した項目が未対応）。次の段階のタブレット確認（設計書 12）でまさにこの開き方をする。 | app.js で file: と「http(s) だが SW なし」を別の state（例 'insecure'）に分け、設定画面は「この URL ではオフライン対応は使えません（https か、この PC の 127.0.0.1 / localhost で開いたときだけ使えます）」と出す。README の 43 行目と「開き方」に同じ条件を書く。 |
| 3 | Minor | js/app.js:433-447, js/app.js:107-112 | localStorage にふれるだけで例外になる環境では、メモリ上の代わりの storage に保存するので save が true になり、header に「保存済み」と出る。上のお知らせ（閉じると記録は消えます）と矛盾する。 | 代わりの storage を使っているときは setSaveStatus で「この端末に保存できません」を出す。 |
| 4 | Minor | js/app.js:206, js/record.js:118-128 | 途中でやめたステージを「解説から／問題から」で始め直すと、`finishStage` を通らないので `attempts` が増えず、前の挑戦と同じ attempt 番号が history に入る（sessionId は別）。また未クリアのステージは「1 問答える → やめる → 最初から」で全額の経験値をくり返し得られる（設計書の「再挑戦すれば数え直す」の範囲内なので保留にも記載）。 | 新しく始めるときに前の resume が残っていれば attempts を +1 する（setResume で null にするか finishStage(cleared:false) を通す）。かせぎ方は設計書 12 の暫定値の調整でユーザーに確かめる。 |
| 5 | Minor | js/ui-screens.js:900-907 | 復習クエストの結果画面の「復習で伸びたこと」は retry / check の正解だけを数えるので、復習クエストで正解しても常に「次は復習で伸ばそう」になる。 | kind 'review' のときは review の正解があれば、その概念を出す。 |
| 6 | Minor | js/figures.js:243, 90 / js/app.js:382-384 | `<marker id="scene-arrow">` が図ごとに入り、さらに app.go は表示中でない section の中身を消さないので、文書の先頭側の hidden（display:none）な section に同じ id の marker が残る。`url(#scene-arrow)` は文書で最初の要素を指すため、ブラウザによっては矢じりが消える可能性がある（推測。画面での確認はしていない）。 | sceneSvg の呼び出しごとに id に通し番号を付ける。あわせて go で前の section を空にする。 |
| 7 | Minor | content/light.js:1224 | lens-1-p2 の解説「x が 200 のところで」は、生徒に見えない座標の言い方（Task 10 の持ち越し）。 | 「レンズの右の 1 点で交わります（位置: 200 のあたり）」など生徒の言葉にする。 |
| 8 | Minor | content/light.js:1403-1420 | lens-2-p2 は f=40 に許容 16px（0.4f）で、物体 1.6f〜2.4f が「同じ大きさのはっきりした像」として正解になる（Task 10 の持ち越し）。判定と問題文が合わない。 | f を 60 にしてスクリーン 280・目標 40 にする（許容は約 0.27f）。samples と物体の初期位置も合わせる。 |
| 9 | Minor | content/light.js:1179-1190, 1286-1295 | 虫めがねで日光を集める問題（lens-1-w1・r2）は「太陽を直接見ない」だけで、集めた光で紙がこげる・やけどする注意がない（Task 10 の持ち越し）。 | 解説に「集めた光を人や服、燃えやすいものに当てない」を 1 文足す。 |
| 10 | Minor | js/ui-screens.js:822 | offer の「2 回続けておしかったね」の 2 が直書き（config.learnback.missToOffer）。 | config から文を作る。 |

Critical はなし。

## 持ち越し Minor の仕分け

| 元のタスク | 内容 | 判断（直すべき / 後でよい / 対応不要） | 理由 |
|---|---|---|---|
| Task 0 | git の LF/CRLF 警告（.gitattributes） | 後でよい | 動作に影響なし |
| Task 0 | tools/*.ps1 の英語コメント | 対応不要 | 前回からの流用物で、アプリ本体ではない |
| Task 1 | geometry の追加回帰テスト（normalizeDeg 境界、intersectLine、斜め鏡の法線） | 後でよい | 今の教材は水平・垂直の鏡だけで、judge のテストが実際の経路を通している |
| Task 2 | fill の word 空らんで answer が options に含まれるか・options が空でないかの検査 | 後でよい | 今の教材はすべて満たす（全 fill を検算）。教材を足すときに validateUnit へ |
| Task 3 | 鏡の裏の単独テスト、lens center の不正解ケース、judgeFill(p, null) の TypeError | 後でよい | judge() が null を先に弾くので画面からは起きない |
| Task 4 | amountFor('daily') の NaN、mastery の `'labels'` デッドコード、レベル境界テスト | 後でよい | NaN は normalizeRecord が streak.count を検査するので届かない |
| Task 5 | getItem 例外時の文言とテスト | 後でよい | 起きにくい環境。文言だけの問題 |
| Task 5 | load/importJson が各 profile の record を補わない | 対応不要 | app.normalizeStore（Task 11）で補完済み |
| Task 5 | ほか 5 件（stageState の attempts、lessonRead の xpLog の stageId、version の二重定義、テスト不足、削除後に別の生徒が自動選択） | 後でよい | いずれも挙動は無害か意図どおり。削除後の自動選択は先生が複数生徒を演じる試作では便利 |
| Task 6 | retryPool の範囲（session は自ステージ、validateUnit は全ステージ） | 対応不要 | 教材は全ステージで「使う概念ごとに 3 問」を満たす（検算済み）。Ruling どおり |
| Task 6 | 教材更新後の resume で進めない可能性 | 後でよい | viewIsBroken が問題・カードの消失を拾って最初からに戻す |
| Task 6 | JSON 往復で hint:undefined が消える | 対応不要 | 表示は「ヒントなし」と同じで害なし |
| Task 6 | common.md の step 形が古い、復習は毎回同じ 3 問、テストの小さな抜け | 後でよい | 文書・教材の幅の話 |
| Task 7 | 'まだ' の直書き、minDaysSince の境界テスト、優先 4 で当日復習済みの再提示 | 後でよい | 優先 4 は指摘 1 を直せば半額になる |
| Task 8 | 主な 4 件（Task 10 で修正済み）と残り 7 件（道すじの定義の言い方、図の文字位置、straight-1-p5 の許容の甘さ、像を実線で描く、reflect-law-k3 の 120° の説明など） | 後でよい | 理科の誤りではなく表現・図の改善。README のとおり先生の内容確認で見る |
| Task 9 | 1 画面に図が 2 つ以上あると marker id が重複 | 後でよい | 指摘 6 に統合（矢じりが消えるかは画面での確認待ち。消えるなら直すべきに上げる） |
| Task 9 | svg.scene{display:block} | 対応不要 | css/style.css:715 で対応済み |
| Task 9 | 図中文字 16 単位、role=img の名前、テストの薄さ、mascot の毛 path | 後でよい | 図の文字は本文ではなく、375px で縮尺 ≒1 |
| Task 9 | 長い線をドラッグ対象にするときの当たり判定 | 対応不要 | 今の drag 対象は object と screen だけ |
| Task 10 | lens-1-p2 解説の「x が 200」 | 直すべき | 生徒が読む文に内部の座標が出ている。1 行の修正（指摘 7） |
| Task 10 | lens-2-p2 の許容 16px が 0.4f | 直すべき | 判定と問題文「同じ大きさ」が合わない。図の数値だけで直せる（指摘 8） |
| Task 10 | ほか 6 件のうち、虫めがねでこげる・やけどの注意 | 直すべき | 安全にかかわる 1 文。日光を紙に集める問題を出している（指摘 9） |
| Task 10 | ほか 5 件（屈折の図に法線がない、c3 と p4 の図が同じ、lens-2-w1 のつながり、虚像の描き方、焦点距離の線に normal を流用） | 後でよい | 誤りではなく図・説明の改善。先生の内容確認で |
| Task 11 | 「すべて削除」が rika-quest:corrupt:* を消さない | 後でよい | 架空の生徒だけを扱う試作。実運用の前に直す |
| Task 11 | 設定のオフライン欄の開発用文言 | 対応不要 | Task 14 で置き換え済み（ただし指摘 2 の新しい問題がある） |
| Task 11 | ニックネーム入力が form 外（Enter で作成不可）、画面切り替え後のフォーカス | 後でよい | ボタンで作れる |
| Task 11 | mastery[id].value など入れ子の型検査、normalizeRecord の単体テスト | 後でよい | 手で壊したファイルでのみ起き、表示が崩れても renderFailure の逃げ道がある |
| Task 12 | ray-draw はキーボード操作不可 | 後でよい | 試作の完了条件はタッチ・マウス |
| Task 12 | 実機タブレットの指操作は未確認 | 対応不要 | 設計書 9 で試作1 の後のユーザー確認項目 |
| Task 12 | 6 件（段階 1 の省略、「2 回」の直書き、UI の定数、「復習で正解」の名前、role=img の子、報告の形） | 後でよい | 段階 1 は Ruling、UI の定数は Ruling、「2 回」は指摘 10 |
| Task 12 | text に出ない数値空らんは入力欄が作られない、fill 複数出現の自動テストなし | 後でよい | 今の教材はすべての空らんが text にある（検算済み）。validateUnit に検査を足すとよい |
| Task 13 | 「最近の N 件」判定、ラベル未発見時の既定、履歴整形のテストなし | 後でよい | 表示だけの話 |
| Task 14 | http でも SW なしのとき file:// 向け文言 | 直すべき | LAN の http で開くと事実と違う案内になり、次のタブレット確認で必ず出る（指摘 2） |
| Task 14 | README 冒頭の古い記述と http(s) の条件 | 直すべき | 冒頭は直ったが、localhost／https の条件がまだない（指摘 2 と一緒に） |
| Task 14 | Shift+再読み込みで準備中のまま、navigate が全 URL に index.html、skipWaiting/claim で版が混ざる可能性、SW のテストなし、新しい分岐の自動テストなし、初回 install 中の差し替えで一瞬 failed | 後でよい | 通常の使い方（普通の再読み込み）では起きないか、一時的な表示だけ。アプリは遅延読み込みをしないので版の混在の影響は小さい |

## 判断を保留したもの

- 本物のタブレットでの指の操作感（ドラッグのしやすさ、44px が実寸で足りるか）— 設計書 9 で試作1 の後のユーザー確認と決めてあるため。
- 画面の実際の描画（指摘 6 の矢じり、768px・375px での崩れ）— 読み取り専用でブラウザを動かしていないため、コードから判断できる範囲にとどめた。
- 未クリアのステージを「やめる → 最初から」で何度でも全額の経験値を得られること — 設計書 4.5「再挑戦すれば数え直す」の範囲内で、半額はクリア済みだけと決めてあるため（調整は設計書 12 の暫定値の確認で）。
- 教材の理科的な正しさの最終判断 — 設計書 10 で完成後にユーザー（理科教員）が確認すると決めてあるため（私の検算では誤りなし）。
- GitHub Pages など https での配置と SW の更新の実地確認 — 設計書 12 で試作1 の後に決める項目のため。

## 判定
**合流可否:** 修正後に可
**理由:** 設計書の「決めたこと」はほぼすべて実装され、学習の進行・記録・保存・判定の契約は画面で正しく使われていて、Critical はない。テスト 108 件は本物の振る舞いを確かめている。ただし、復習クエストの「1 日 1 回だけ全額」が途中でやめると効かず経験値をかせげる穴（指摘 1）と、LAN の http で開いたときの事実と違うオフライン案内と README の条件不足（指摘 2）は、どちらも小さな修正で直せ、検証項目 5・6 と次のタブレット確認に直接かかわるので、合流前に直すことをすすめる。あわせて持ち越しのうち「直すべき」とした教材 3 件（指摘 7〜9）も 1 回の修正でまとめて直せる。

## Claude Code の対応

| # | 分類 | 対応内容 |
|---|---|---|
| Important 1 | 対応する | 復習の最初の有効な解答時に markReviewDone を記録。 |
| Important 2 | 対応する | offline.state を file と insecure-http に分け文言を直し、README に https/localhost 条件を追記。 |
| 直すべき Minor 5 件 | 対応する | lens-1-p2 の座標の文、lens-2-p2 の f=60、日光の安全の一文、Task 14 の文言・README（Important 2 と同時）。 |
| 後でよい / 対応不要 | 対応しない | レビュー結果の仕分けどおり。試作後の課題として報告に載せる。 |
