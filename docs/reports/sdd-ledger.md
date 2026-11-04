# SDD ledger — plan: docs/superpowers/plans/2026-11-03-rika-quest-prototype1.md

Spec: docs/superpowers/specs/2026-11-03-rika-quest-design.md（ユーザー承認済み 2026-11-03）

## Setup rulings
- Ruling: 隔離 worktree を使わず、新規リポジトリの既定ブランチ上で直接作業する — フォルダは git 未管理で Task 0 が git init を行う。ユーザーは確認なしで進めてよいと明言。前回の時間割アプリも同じ運用 — 間違っていた場合のコスト: ブランチを切り直す手間だけ。
- Ruling: Task 0 の `git init` だけはコントローラが実行した — SDD の作業ディレクトリと task-brief がリポジトリを前提にするため — コストなし。
- Ruling: 実装者は Opus（Task 0 の雛形コピーのみ Sonnet）、タスクレビューは Codex（tools の読み取り専用レビュー、.ai-review/ に保存）。Codex が失敗したときは Claude（opus/sonnet）のレビュー用サブエージェント — ユーザー指示（コードは Opus、チェック係は Codex か別エージェント、クレジット節約）— コスト: Codex のレビュー品質がテンプレートと異なる可能性。
- Model routing: implementers=opus(sonnet for Task 0), reviewers=codex→fallback opus, final review=opus.

## Pre-flight scan (plan は Codex による計画レビュー 4 回で整合確認済み: .ai-review/*_plan_*.md)
| Pair / Task | Produces vs consumes | Result |
|---|---|---|
| T1 geometry → T3 judge | normalOf/reflect/angleToNormalDeg/sideOfLine/distancePointToLine/isParallelDeg | 一致（T3 Step 3 が T1 の署名を使う） |
| T1 config → T3/T4/T5/T6/T7 | config の各キー | 一致 |
| T2 registry → T6/T7/T8/T12 | reg.stage/concept/problem/nextStage/stagesInOrder/validateUnit | 一致 |
| T3 judge → T6 session | judge(problem, answer, config) → {correct, invalid} | 一致 |
| T4 xp/mastery → T5 record | amountFor/levelFor/updateStreak/localDate、mastery.update | 一致 |
| T5 record ↔ T6 session (events) | event 形（history に sessionId/attempt、lessonRead に lessonStageId） | 一致 |
| T5 storage ↔ T11 app.save | save(..., { allowOverwrite } = {}) / app.save(options) | 一致 |
| T6 session → T12 UI | current/next/answer/choose の戻り値 { session, events } | 一致 |
| T7 recommend → T13 | todayQuest/isUnlocked | 一致 |
| T8/T10 content ↔ T9 figures | scene.items の type 名 | T9 で定義、T8 は同じ名前を使う（順序: T8 → T9 → T10。T8 の図は T9 のレンダリングなしで検証されないため T9 後に目視）|
| T9 figures → T12 ui-problems | sceneSvg(scene, opts) 文字列、data-item-id | 一致 |
| T11 index/app ↔ T14 sw | app.offline、register の条件 | 一致 |
| 各 Task 自身 | tests vs code | T3 の座標・T6 の分岐は Codex が計算確認済み |
- Ruling: Task 8 の図は Task 9 のあとに画面で目視する（Task 9 の Step 4 に含める）— コスト: 図の修正が後回しになる。

## Progress
Task 0: implemented (commit 275ab2d, DONE_WITH_CONCERNS: CLAUDE.md の役割文の併存は観察として許容、CRLF 警告は deferred minor)
Task 0: minor (deferred): git の LF/CRLF 警告 — .gitattributes で eol=lf を検討
Task 1: implemented (commits 275ab2d..067006a, 7/7 tests). Ruling: サブエージェントのコミットの Co-Authored-By は実際に書いたモデル（Claude Opus 5.5）でよい — 帰属は正確であるべき — コストなし。
Task 0: review round1 = 要修正 (Important: codex-review.ps1 -Previous の範囲検証なし; 役割ルールの競合 / Minor: 英語コメント, .gitkeep 欠落)
Task 0: Ruling: 指摘1 は plan-mandated（スクリプトをそのまま流用）だが範囲制約を守るため小修正を認める — コスト: スクリプトが前回と byte 同一でなくなる。
Task 0: Ruling: 指摘2 は役割を「通常はサブエージェント（Opus）、Claude Code 本体・Codex は代行」に統一 — コスト: なし。
Task 0: minor (deferred): tools/*.ps1 の英語コメント（流用物。最終レビューで判断）
Task 0: fix round 1/5 (3 findings fixed by implementer; commit 5c5aece) — re-review pending
Task 1: minor (deferred): geometry の追加回帰テスト（normalizeDeg 境界、intersectLine、斜め鏡の法線）
Task 1: complete (commits 275ab2d..067006a, review clean)
Task 2: implemented (commit d8bc804, 13/13 tests). Ruling: 教材構造の検査しきい値は config.js でなく content-registry.js の RULES に置く — 調整対象の暫定値（経験値など）ではなく教材の形の規則だから — コスト: 設計書 5.3 の数を変えるとき 2 か所を見る必要。
Task 3: implemented (commit 5b742e5, 23/23 tests)
Task 0: fix round 1/5 (3 addressed, 0 open; commit 5c5aece)
Task 0: complete (commits 275ab2d, 5c5aece, review clean)
Task 2: review round1 = 要修正 (Important: fill の必須項目検査の抜け)。Ruling: fill.text は必須（共通データの形どおり）— コントローラの dispatch で「任意」と書いたのが誤り — コスト: なし。
Ruling: Codex が利用上限（2026-11-04 03:13 回復）のため、以後のレビューは Claude サブエージェント（判定・進行など難しい差分は opus、機械的な差分は sonnet）が代行し .ai-review/*_roundN_claude.md に保存 — CLAUDE.md の代行規定どおり — コスト: Claude クレジットを消費。
Task 4: implemented (commit b1f1b30, 8 new tests; npm test の 1 失敗は Task 2 修正中の未コミット分)
Task 2: fix round 1/5 (1 addressed by implementer; commit 46e418d) — re-review pending
Task 2: fix round 1/5 (1 addressed, 0 open; commit 46e418d)
Task 2: minor (deferred): fill の word 空欄で answer が options に含まれるか・options が空でないかの検査
Task 2: complete (commits d8bc804, 46e418d, review clean)
Task 4: minor (deferred): xp.amountFor('daily') の ctx.streak が NaN のとき NaN; mastery.js の `change === 'labels'` デッドコード; レベル境界テストの追加
Task 4: complete (commit b1f1b30, review clean)
Task 3: minor (deferred): 鏡の裏の条件を単独で検証するテスト; lens center の不正解ケース; judgeFill(p, null) の TypeError
Task 3: complete (commit 5b742e5, review clean)
Task 5: implemented (commit 4fb62d4, 50/50 tests)
Task 6: dispatched (opus). Ruling: session.queue の step は id 参照（cardId/problemId）で持ち、current(session, reg) で解決する — resume を localStorage に保存するため小さくしたい — コスト: common.md の step 形と異なる（view 形は変えない）。Ruling: 復習セッションでは誤答時に類題・学び直しを出さない — 設計書 4.6 は復習を 3 問の短いクエストと定義 — コスト: 復習中のつまずきは次回のおすすめで拾う。
Task 5: minor (deferred): storage.load の getItem 例外時の文言とテスト; load/importJson が各 profile の record を補わない（Task 11 の読み込み処理で補完すること — dispatch に含める）; ほか 5 件は .ai-review/20261104-001500_task05_round1_claude.md
Task 5: complete (commit 4fb62d4, review clean)
Task 7: implemented (commit bc3c2fe, 60/60 tests)
Task 7: minor (deferred): 'まだ' の直書き（config.mastery.labels から取る）; minDaysSince の境界テスト; 優先 4 で当日復習済みの概念の再提示
Task 7: complete (commit bc3c2fe, review clean)
Task 6: implemented (commit 8e465d9, 79/79 tests). Ruling: choose('later') が最後の step のときは completed と stageClear を返してよい（Task 12 は choose の events も applyEvents に渡す）— クリア経験値を失わないため — コスト: choose の契約が「events 空」でなくなる。
Task 9: implemented (commit 424701d, 93/93 tests)
Task 9: minor (deferred): 1 画面に図が 2 つ以上あると <marker id="scene-arrow"> が重複; Task 12 の CSS に svg.scene{display:block} が必要（dispatch に含める）
Task 9: review round1 = 要修正 (Important: draggable の当たり判定が 44px 未満)
Task 9: minor (deferred): 図中文字 16 単位; marker id 重複; role=img の名前; テストの薄さ; mascot の毛 path
Task 6: minor (deferred): retryPool の範囲（session は自ステージのみ、validateUnit は全ステージ）→ 教材は各ステージに概念ごと 3 問置く方針で回避; 教材更新後の resume で進めない可能性; JSON 往復で hint:undefined が消える; common.md の step 形が古い; 復習は毎回同じ 3 問; テストの小さな抜け
Task 6: complete (commit 8e465d9, review clean). Task 12 dispatch に含める: 読み込み順、stopped でも feedback を先に、choose の events も applyEvents へ
Task 9: fix round 1/5 (1 addressed by implementer; commit 82171b3) — re-review pending
Task 9: fix round 1/5 (1 addressed, 0 open; commit 82171b3)
Task 9: minor (deferred): 長い線（mirror/ray/boundary/axis）をドラッグ対象にする場合は線に沿った当たり判定が必要
Task 9: complete (commits 424701d, 82171b3, review clean)
Task 8: implemented (commit 34747a4, 100/100 tests)
Task 8: complete (commit 34747a4, review clean). Ruling: Task 8 の主な Minor 4 件は Task 10（同じファイル）で直す — 別ディスパッチより安い — コスト: Task 10 の差分が少し広がる。
Task 8: minor (deferred): 残り 7 件は .ai-review/20261104-012000_task08_round1_claude.md（先生の内容確認でも見る）
Task 11: implemented (commit 5806765; browser-checked 375/768/1024 and file://)
Task 11: minor (deferred): 「すべて削除」が rika-quest:corrupt:* を消さない; 設定のオフライン欄の開発用文言（Task 14 で置き換え）
Task 11: review round1 = 要修正 (Important: record 項目の型検査なし; 保存失敗時に成功メッセージ). Ruling: Minor「app.offline 未宣言」は Task 14 の契約なので修正ラウンドに含める — コスト: なし。
Task 11: minor (deferred): ニックネーム入力が form 外（Enter で作成不可）; 画面切り替え後のフォーカス; 設定の開発用文言（Task 14 で置換）
Task 11: fix round 1/5 (3 addressed by implementer; commit 10bb90a) — re-review pending
Task 11: fix round 1/5 (3 addressed, 0 open; commit 10bb90a)
Task 11: minor (deferred): mastery[id].value など入れ子の型検査; normalizeRecord の単体テスト
Task 11: complete (commits 5806765, 10bb90a, review clean)
Task 10: implemented (commit 08e684c, 102/102 tests, 8 stages)
Task 10: complete (commit 08e684c, review clean)
Task 10: minor (deferred): lens-1-p2 解説の座標「x が 200」; lens-2-p2 の許容 16px が 0.4f 相当（f を大きくする）; ほか 6 件は .ai-review/20261104-022000_task10_round1_claude.md
Task 12: 確認事項（レビューに含める）: fill の text に同じ [b1] が 2 回出る問題（lens-1-p5）を部品が扱えるか
Task 12: implemented (commit 5b2e84f; browser-checked end to end). Ruling: 画面だけで使う定数（演出 1.5 秒、最小ドラッグ 8px）は各 UI ファイルの冒頭でよい — 学習の暫定値ではない — コスト: なし。
Task 12: minor (deferred): ray-draw はキーボード操作不可; 実機タブレットの指操作は未確認（ユーザーの検証項目）
Task 12: review round1 = 要修正 (Important: fill の重複空らん id). Ruling: ray-draw で当たった点の近くから段階 2 を始められる作りは可 — 図に入射光があり問題文と整合 — コスト: 設計書 5.2 の「光源からドラッグ」が任意になる。
Task 12: minor (deferred): 6 件は .ai-review/20261104-024000_task12_round1_claude.md
Task 12: fix round 1/5 (1 addressed by implementer; commit eeb8237) — re-review pending
Task 12: fix round 1/5 (1 addressed, 0 open; commit eeb8237)
Task 12: minor (deferred): text に出ない数値空らんは入力欄が作られない; fill 複数出現の自動テストなし
Task 12: complete (commits 5b2e84f, eeb8237, review clean)
Task 13: implemented (commit c7cf644; browser-checked). Ruling: 記録画面で履歴カードを最下段に置く並び替えは可 — 長いカードが他を押し下げないため — コスト: 設計書 4.1 の並びと異なる。
Task 13: minor (deferred): 「最近の N 件」判定; ラベル未発見時の既定; 履歴整形のテストなし
Task 13: complete (commit c7cf644, review clean)
Task 14: implemented (commit 5f0ae22, 106/106 tests; offline verified by stopping the http server). Ruling: manifest リンクは http(s) のときだけ app.js が追加する — file:// で CORS エラーが出るため — コスト: HTML だけ見ても manifest が分からない。
Task 14: review round1 = 要修正 (Important: install 失敗時に failed にならない)
Task 14: minor (deferred): http でも SW なしのとき file:// 向け文言; Shift+再読み込みで準備中のまま; navigate が全 URL に index.html; skipWaiting/claim で版が混ざる可能性; SW のテストなし. Task 15 で: README 冒頭の古い記述と http(s) の条件
Task 14: fix round 1/5 (1 addressed by implementer; commit fceded9) — re-review pending
Task 14: fix round 1/5 (1 addressed, 0 open; commit fceded9)
Task 14: minor (deferred): 新しい分岐の自動テストなし; 初回 install 中に sw.js が置き換わると一瞬 failed
Task 14: complete (commits 5f0ae22, fceded9, review clean)
Task 15: implemented (commit 1afc0ca, 108/108 tests; width/touch checks done). Ruling: Task 15 のタスク単位レビューは最終全体レビューに含める（同じ差分を 2 回見ない）— コスト: Task 15 固有の指摘が最終レビューに混ざる。
Task 15: minor (deferred): 図中文字 約 16px; 幅 360px では region が約 43px
Task 15: complete (commit 1afc0ca, reviewed in the final review)
Final review: dispatched (opus), range 275ab2d..1afc0ca
Final review: 修正後に可 (Important 2, 直すべき Minor 5) → one fix wave dispatched
Final fix wave: commit c0d6b48 (5/5 addressed by implementer) — scoped re-review pending

## 追加作業 2026-11-04: 解説の用語の強調と用語問題（指示書 .ai-tasks/20261104-120000）
Ruling: ステージの問題数の上限を 5 → 6 に（設計書 5.3 の「暫定 4〜5 問」から変更）。用語問題を main の 2 問目に 1 問足すため — コスト: 1 ステージの時間が約 20 秒のびる。
Ruling: 用語は解説文の `**語句**` 記法で示し、文そのものは変えない。許可された語が文に出ないカード 4 枚（straight-2-c1, straight-2-c3, refract-2-c1, refract-2-c2）は用語なしのままにし、テストで名前を挙げて除外 — コスト: この 4 枚には「大切な言葉」の行が出ない。
Ruling: 用語問題を間違えたら用語の類題を、ふつうの問題なら ふつうの類題を先に出す（Codex round 1 の指摘 1。並び順だけでは用語の類題に届かなかった）— コスト: 類題の選び方が概念だけでなく問題の種類にも依存する。
用語の強調: implemented (opus, commit e05c6c5, 119/119). Codex round1 = 要修正 (High 1: refract-2-t2 が出題されない / Medium 1: 虚像の説明). fix by controller (session.js insertRetry, lens-2-t1, sw VERSION -5, README) 121/121. Codex round2 = 指摘なし → complete (VERSION 2026-11-04-11)
用語の強調: Codex round2 = 指摘なし → complete (commits e05c6c5 + 修正コミット)

## 追加作業 2026-11-04: 解説の動く図の試作（指示書 .ai-tasks/20261104-130000）
Ruling: 動く図は GIF や動画生成 AI ではなく、アプリ内で SVG を数式で描き直す方式（js/anim.js の frame(kind, t) は純粋関数）。まず 2 枚（straight-1-c3 影の大きさ、reflect-1-c3 反射の法則）だけ試作してユーザーが見てから残りを決める — コスト: 写真のような映像にはならない。
Ruling: 実装者が足した後片付け（renderLesson が cleanup を返す、dialog.onclose で body を空にする）は妥当として受け入れ — 隠れた画面で rAF が動き続けるのを防ぐため。
動く図: implemented (opus, commit 42a22fa, 128/128). controller の確認: 影の図が動く・ラベルが切り替わる、反射の角度が 2 つ同じ値で動く、とめる/動かすが効く、画面を離れると anim-box が消える、コンソールエラーなし。Codex round 1 pending
動く図: Codex round1 = 指摘なし → complete (commit 42a22fa)。残り 22 枚はユーザーが試作を見てから判断
動く図（残り 21 種）: implemented (opus, commit a08665a, 140/140; 指示書の focal-length の式の誤りを実装者が訂正、label 4 か所移動). Codex round1 = 要修正 (High 2: grow の丸め誤差で例外 / 動きを減らす設定で光線が出ない) → controller fix (anim.js restT, grow 空配列) 142/142. Codex round2 = 指摘なし → complete (VERSION 2026-11-04-11)
動く図（残り 21 種）: Codex round2 = 指摘なし → complete (commits a08665a + 修正コミット, VERSION 2026-11-04-7)。straight-2-c3 だけ静止図のまま

## 追加作業 2026-11-04: アバターとマスコット
Ruling: 生徒のアバターは Codex が生成した 6 体（ポヨンなど。commit a5f8bbf）のまま。ユーザーが Google ドライブに用意した先生キャラクター 6 体（A〜F）はマスコットに使う。一度アバターに入れてしまった（commit da96686）のをユーザーの指摘で戻した（commit 9e5f891）— コスト: なし（id は変えていない）。
Ruling: マスコットの名前は「ピカ」から「キューブ先生」に（ユーザー決定）。手描きのピカは mascot.legacySvg として残す — コスト: 吹き出しの名前が変わる。
Ruling: 単元ごとに先生を変える仕組みは、教材の単元に `mascot: 'E'` を書く方式（js/mascot.js の MASCOTS / forUnit、content-registry の unitOfStage / unitOfConcept）。書いていない単元は A まる先生（同梱 unit_mascots.json の fallback と同じ）— コスト: 単元を足すとき mascot を書き忘れると まる先生になる（テストはない。validateUnit では縛らない）。
単元ごとのマスコット: implemented (controller, 146/146, 指示書 .ai-tasks/20261104-150000). Codex round1 = 要修正 (Medium 1: 継承プロパティ名で先生扱い / Low 1: legacySvg の名前) → controller fix (isKey, LEGACY_NAME) 146/146. Codex round2 = 指摘なし → complete (VERSION 2026-11-04-11)
