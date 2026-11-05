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

## 追加作業 2026-11-04: 全単元への展開（要件 追加予定機能 1）
Ruling: 「次のタスク」は要件定義書の追加予定機能 1「全単元への展開」と判断。ユーザーの追加指示（2026-11-04）: 一通りの単元を作る。Google ドライブの図版と「ミニプリント」の問題を参考にする — コスト: ユーザーの意図と違えば単元選択の画面が無駄になるが、単元を増やすにはどのみち必要。
Ruling: 土台を 2 つに分けた。(1) 単元をえらぶ仕組み（content/curriculum.js の表＝先生が編集してよい、js/units.js、profile.unitId、画面 units）。(2) 汎用の図の部品（rect/circle/ellipse/polygon/line/text/arrow、beaker/tube/flame/symbol）と全単元共通テスト tests/content-all.test.js — コスト: 光以外の単元は動く図（anim）なし・静止図のみ。
Ruling: 中学 1〜3 年の単元の表は学習指導要領の内容のまとまり（19 単元）を教科書でよくある単元名で並べ、先生は A〜F の対応表どおり。表にない id の単元は「その他」に出す。
Ruling: ドライブの図版（学図など出版社の図）は転載しない。「どんな場面を描くか」の参考にだけ使い、図は figures.js の部品で描き直す（設計書「失敗の条件」）。
単元をえらぶ: implemented (opus, 指示書 .ai-tasks/20261104-160000). 汎用の図の部品: implemented (opus, 指示書 .ai-tasks/20261104-161000, 176/176). 2 つをまとめて Codex round1 = 要修正 (High 2: line/polygon の anchorOf が points を読まない / tube の当たり判定に tilt 未適用, Medium 1: setUnit の保存失敗時に選択が残る) → controller fix 177/177. Codex round2 = 指摘なし → complete (VERSION 2026-11-04-12)
Ruling: 教材は 1 単元 1 ファイル（content/<id>.js）、領域 2 × ステージ 2、概念 4〜6 を目安に Opus のサブエージェントが 3〜4 単元ずつ並行して書く。index.html・sw.js の行は controller が先に足し、書き手は触らない — コスト: 執筆中は offline テストが一時的に失敗する。
Ruling: 概念 id は単元の接頭辞付き（so-/fo-/su-/sol-/sc-/pl-/an-/vo-/st-…）で全単元一意にする（理解度の記録のキー）。光（light）は公開済みで記録があるので変えない。tests/content-all.test.js が重複を検査する。
Ruling: Codex が利用上限（2026-11-04 21:05 まで）のため、レビューは実装に関わっていない Claude エージェント（.ai-review/*_claude.md）。Low のみの指摘を直したときの再確認は次の単元群の round 1 に含める — コスト: サイクルの区切りがずれる。
1 年の教材 9 単元: sound/force/substance = Codex round1 要修正(High 3: 有機物の定義、drag の許容 2 件 / Medium 1) → fix → Claude round2 指摘なし。solution/state-change/plants = Claude round1 (High 1: sol-4-p3 drag / Medium 1: 概念 id 接頭辞 / Low 4) → fix → Claude round2 Low 1 → fix (40 ℃) → 次の round1 で解消確認。animals/volcano/strata = Claude round1 Low 6 → 5 件 fix、1 件（region が接する）見送り → complete (9 単元 36 ステージ、tests 259)
2 年の教材 4 単元: chemical-change/body/electricity/weather = Claude round1 Low 5 → 4 件 fix（電熱線 b のグラフ 20 Ω、chem-4-p3 の wrong、chem-3-t2 の選択肢、body-2-r2 の解説）、1 件（心臓の図の線の交差）見送り → complete (4 単元 16 ステージ、tests 306 時点). 前サイクル（1 年 動物・火山・地層）の Low 修正 5 件は解消を確認済み。VERSION 2026-11-04-14
3 年の教材 5 単元: motion/ion/heredity/space/nature = Claude round1 Low 6（Codex は 2:05 まで上限）→ 6 件 fix（オリオン座の日付、文字のはみ出し 2、季節の図の重なり、内容一覧、電熱線 b の文字）→ complete (5 単元 20 ステージ)。これで全 19 単元 76 ステージ。
設定（アクセントカラー・ふりがな）: implemented (opus, 指示書 .ai-tasks/20261104-181000). Claude round1 Medium 4/Low 5 → fix（辞書の誤読、ニックネーム、濃い背景の rt、ファイルごとの網羅率）→ Codex round1 Medium 4/Low 2 → fix（flex の run、辞書、通知の名前、typeof 検査、文言、正規表現）→ Claude round2 = 指摘なし（Low 3 のうち 2 件対応）→ complete。辞書 2,293 語、網羅率 100%。
Ruling: ふりがなは辞書の最長一致（js/ruby.js + content/readings.js）で全漢字に付ける方式。形態素解析ライブラリは使えないため。教材を足したら `node tools/ruby-missing.js --split --single` で辞書を足す — コスト: 文脈依存の誤読（日の読みなど）が少し残る。
Ruling: 画像は ChatGPT で生成し、内蔵ブラウザで画像だけを表示して画面撮影（708×531 PNG）で取り込む。ダウンロード・クリップボード・postMessage・iframe は CSP とブラウザの制限で不可。写真に差しかえる図の計画は docs/image-plan.md（113 枚、A 48 から）。図の `image` 部品（figures.js）を追加（Claude round1 Medium 1/Low 2 → fix）。
Ruling: 各単元の動く図（SVG アニメーション）はユーザーの指示で追加する。計画 docs/anim-plan.md を先に作り、anim.register で分野別ファイルに分ける案。VERSION 2026-11-04-15
動く図 A（41 本）: 登録口（anim.register・helpers、opus、指示書 .ai-tasks/20261104-220000）→ 物理 11・地学 12・化学 12・生物 6 を 4 エージェント並行（指示は docs/anim-plan.md の章を直接参照）。Claude round1 ×2（物理・地学: Medium 1/Low 6 → 5 件 fix、2 件見送り / 化学・生物: Medium 4/Low 5 → 全件 fix）→ Claude round2 = 指摘なし → complete（KINDS 64、tests 477）。アプリ上で 7 分野の動きを確認（タブが前面のときだけ rAF が動く）。
写真 A（生物 5 単元 48 枚）: ChatGPT で生成（Sonnet の courier、1 枚 約 1.5 分）→ 3 エージェントが content に組みこみ（image 部品＋bg つき文字＋引き出し線。指示書 .ai-tasks/20261104-224000）→ Claude round1 Medium 2/Low 5: M2（合計 12.7 MB の PNG を install 時に全部キャッシュ）は 640×480 JPEG 品質 82 に変換して対応（48 枚 1.6 MB）、M1（バッタのあしの位置）は B の後に作り直し、L1 対応、L2・L3 は先生の判断、L4 は次の修正で、L5 見送り。VERSION 2026-11-04-16
Ruling: 画像は JPEG 640×480 で入れる（PNG 708×531 は 1 枚 200〜490 KB で重い）。113 枚でも約 4 MB の見込み — コスト: 細部がやや甘くなる。
動く図 B（24 本）: 物理 10・生物 3・化学 7・地学 4（2 エージェント並行）→ Claude round1 Medium 1/Low 8 → 全件 fix → round2 指摘なし（Low 1 記録）→ complete。KINDS 88（光 23＋65）。
写真 B（地学・化学 48 枚、未使用 3: ion-2-c1 導線の色が逆、sol-4-c4 ろうとの足が壁についていない、volcano-2-c4-2 枚数上限）+ C（14 枚、未使用 2: refract-2-c2 折れ方が弱い、lens-2-c3 動く図あり）: 4＋3 エージェントで組みこみ → Claude round1 Medium 1（12px の文字）/Low 4 → fix → round2 解消、C round1 Low 3 → fix → complete。写真つきカード 97 枚＋問題 5 問、画像 108 枚 3.3 MB。VERSION 2026-11-05-17
Ruling: 写真の文字は 13px 以上、白い下地つき、右はしは anchor end。写真の上では `photo`・`pointer`・`tag` の部品名に統一（A の body・heredity は `pin` のまま。後で統一）。
写真の作り直し（ユーザー指示 2026-11-05）: 確認事項に挙がった 16 枚を docs/image-redo.md の合格基準つき指示文で再生成（16 枚合格、言い直し 1 回のみ）→ 15 枚を入れ直し（weather-2-c2 は乾湿計になり解説文と合わないので前のまま、refract-2-c2 は動く図があるので不使用）。ion-2-c1・sol-4-c4 は新たに写真に。Claude round1 Low 2（記録のみ）→ complete。画像 110 枚、VERSION 2026-11-05-18

## 追加作業 2026-11-05: 先生用の確認画面（要件 追加予定機能 4）と公開
Ruling: サーバーがないので、先生画面は「この端末の記録」＋「ほかの端末で書き出した記録ファイルの読みこみ（端末の記録には混ぜない）」で生徒の進捗・理解度・苦手を一覧する。ログイン・PIN なし（読むだけの画面。必要になれば PIN を足す）— コスト: 同じ端末の生徒が他の生徒の進捗を見られる。
先生画面: implemented (opus, 指示書 .ai-tasks/20261105-090000, js/teacher.js + js/ui-teacher.js). Codex round1 High 3（__proto__ の汚染、名前の型、日時の型）→ fix → round2 High 1（phase の型）→ controller fix → 新サイクル round1 High 1（correct の型）→ controller fix → round2 指摘なし → complete（tests 522）。VERSION 2026-11-05-19
Ruling: 生徒用の公開先は GitHub Pages（ユーザー決定、リポジトリ schooldatahuruyama-lgtm/Rika_app）。アプリのファイルだけの pages ブランチ（tools/pages-branch.ps1）を push する。push は PC での GitHub 認証待ち。
先生画面のパスコード（ユーザー指示「生徒は先生画面を見れないように」）: implemented (opus, js/teacher-gate.js). Codex round1 High 1/Medium 2 → fix → round2 High 1/Medium 1 → fix → 3 サイクル目 round1 High 1/Medium 1 → fix → Claude round2（Codex 上限）= Low 1 記録のみ → complete（tests 535）。VERSION 2026-11-05-20
Ruling: パスコードは端末ごと（localStorage にハッシュ）、4〜8 桁、5 回失敗で 60 秒ロック。サーバーがないため「のぞき見を防ぐ鍵」であり、開発者ツールを使える相手には防げない — コスト: 忘れたら「すべて削除」でしか戻せない。
初期パスコード（ユーザー指示「最初から設定して生徒が切り替えられないように」）: config に salt/hash（tools/teacher-passcode.js で生成）を組みこみ、設定フォームを廃止。端末の上書きは先生画面の中からだけ。「すべて削除」で初期に戻る。Claude round1 Low 4（記録のみ）→ complete（tests 540）。VERSION 2026-11-05-21。初期パスコードの値はチャットで先生に伝え、README・報告には書かない。
公開（GitHub Pages）: ユーザーが PC で GitHub 認証 → pages（12f154d、HEAD 60965c2 のアプリ 181 ファイル）push 完了 → ユーザーが Settings → Pages を Branch pages/(root) に設定 → https://schooldatahuruyama-lgtm.github.io/Rika_app/ が 200。内蔵ブラウザ（768 幅）で確認: SW 登録済み・キャッシュ 173 = PRECACHE 173、プロフィール作成 → 単元選択 → 解説の写真カード（assets/images/plants/plants-1-c1.jpg）が表示、console エラーなし。README に公開 URL と更新手順を追記。
先生の確認シート（ユーザー指示「作って」）: Opus が .ai-tasks/20261105-190000 の指示書で docs/reports/teacher-check.md を作成（19 単元、388 項目: 自信のない点 195・写真 113・動く図 73・全体 7）。controller が形と植物・天気・宇宙の節を確認。レビューはコード変更なしのため省略（文書のみ）。
バッジ（要件 追加予定機能 2。ユーザー指示「バッジに進む＋注意書き」）: implemented (opus, 指示書 .ai-tasks/20261105-193000, js/badges.js 20 個 + record/app/ui-screens/teacher/ui-teacher/css/README/設計書 4.5.1). プロフィール画面に「同じブラウザ・同じ URL で」の注意書き。Codex round1 Medium 1（entry の形崩れが未読扱い）→ controller fix → round2 指摘なし → complete（tests 553）。VERSION 2026-11-05-22
Ruling: バッジは記録から判定できる 20 個、経験値は付けない、取った日時と seen を rec.badges に保存、ランキングは作らない（要件 3 はサーバー要） — コスト: すでに学習した生徒には次の解答でまとめて付く。
バッジの絵（ユーザー指示「ChatGPT で素案を作らせて私が選ぶ」）: 5 スタイル（フラット/光沢盾/ステッカー/ピクセル/金属ピン）をスクラッチパッド badge_drafts/ に保存し送付。ユーザーの選択待ち。選択後に 20 個を個別生成して assets/images/badges/ に入れ、badgeMedal を画像に替える。
バッジの絵（ユーザー決定: スタイル B 光沢の盾）: Sonnet courier が ChatGPT で 20 枚生成（全部 1 回で合格）→ 中央正方形 160px PNG（scratchpad/badge_crop.ps1）→ assets/images/badges/。Opus が badgeMedal を画像に差しかえ（onerror で SVG に戻す、未取得は grayscale、結果画面 64px）。Codex round1 指摘なし → complete（tests 554）。VERSION 2026-11-06-23
Ruling: 画像は白背景のまま mix-blend-mode: multiply でカードになじませる（透過 PNG を作る手段がないため） — コスト: 暗い背景には置けない（今のアプリに暗い背景はない）。

## 追加作業 2026-11-06: AI 教材作成（要件 追加予定機能 5・6）
Ruling: サーバーなしで先生の端末だけで動く形。生成は Claude API を fetch で直接呼ぶ（先生の API キーは localStorage のみ）か、指示文をコピーしてチャットに貼る道の 2 つ。計画 1 回＋ステージごと 1 回に分けて出力を小さくする。問題は choice/fill/figure-choice（枠選び）だけ。公開は先生が「確認済み」にして content/<id>.js を書き出し、Claude Code がリポジトリに入れる（自動公開なし）。設計書 13 章。 — コスト: 書き出した教材はカードに図がないので、公開時に図を足すか tests/content-all の「カードに図」検査を AI 教材だけ緩める判断が要る。
Ruling: SDK は使わず fetch（アプリに依存ライブラリを入れない方針。設計書 9）。構造化出力 output_config.format {type: json_schema, schema} と fallbacks: "default"。モデル既定 claude-opus-5-5。実 API での生成は未確認（先生のキーが要る）。
implemented (opus ×2: A ロジック js/author.js + js/author-api.js、B 画面 js/ui-author.js + app/teacher/index/sw/css/README). Codex サイクル 1: round1 High 3/Medium 2 → fix（opus）→ round2 High 1/Medium 1 → サイクル 2: fix（opus）→ round1 指摘なし → complete（tests 588）。VERSION 2026-11-06-24。controller のブラウザ確認: 先生画面 → 教材を作る → 貼り付けで計画と 2 ステージ → 照合 OK → ためす → 単元一覧「その他」に出て生徒画面で解ける（枠選びの図の重なりを修正）。
