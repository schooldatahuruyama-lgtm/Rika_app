# 理科クエスト 試作1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 中1「光の世界」8ステージを、解説→予想→問題→結果の流れで学べ、誤答時の学び直し・経験値・理解度・端末内記録・オフライン動作まで備えた Web アプリ試作1を作る。

**Architecture:** ロジック（判定、学習の進行、経験値、理解度、おすすめ、保存）は DOM を触らない純粋なモジュールにし、`node --test` で検証する。画面（`js/ui-*.js`、`js/app.js`）はそのロジックを呼ぶだけにする。教材は `content/light.js` のデータで、図は宣言的な「場面の指定」を `js/figures.js` が SVG 文字列に変換する。

**Tech Stack:** HTML / CSS / JavaScript（ビルドなし、外部ライブラリなし、ES Modules 不使用）、`localStorage`、Service Worker、Node.js 18+ の `node --test`。開発プロセスは前回の時間割アプリと同じ（Claude Code が設計・指示書、Opus のサブエージェントが実装、Codex がレビュー）。

**Spec:** `docs/superpowers/specs/2026-11-03-rika-quest-design.md`（要件定義書 `理科クエスト_要件定義書_v0.1.md` と合わせて読む）

## Global Constraints

- 外部ライブラリ・npm 依存なし。`package.json` の `scripts.test` は `node --test "tests/*.test.js"` のみ。
- すべての `js/*.js` は前回と同じ IIFE 形式: `(function (root) { 'use strict'; ... if (typeof module === 'object' && module.exports) module.exports = api; else root.RikaQuest = Object.assign(root.RikaQuest || {}, { <name>: api }); })(typeof globalThis !== 'undefined' ? globalThis : this);`。他モジュールは `typeof require === 'function' ? require('./x.js') : root.RikaQuest.x` で取る。
- `index.html` は `<script src>` の普通のスクリプトで読み込む（`type="module"` 禁止、`fetch` で教材を読まない）。
- 暫定の数値はすべて `js/config.js` に置き、他のファイルに直接書かない。
- 文字は本文 18px 以上、ボタン高さ 56px 以上、タッチ対象 44px 以上。赤を「不正解」に使わない（正解=緑、おしい=オレンジ）。
- 教材の文章と図はすべて自作。教科書名・出版社名を書かない。実名を扱わない。
- コメントとコミットメッセージは日本語。関数名・変数名は英語。
- `localStorage` のキーは `rika-quest:v1`。退避キーは `rika-quest:corrupt:<ISO日時>`。
- 日付は端末のローカル日付 `YYYY-MM-DD` で区切る。
- コミットは Claude Code が行う（Codex は行わない）。Git のユーザー名はグローバル設定のもの。

## Review Focus

1. `localStorage` が使えない（プライベートモード、容量超過、例外）: 保存に失敗しても学習は続き、画面に「保存できません」と出る。→ Task 5 のテスト `save returns false when storage throws`。
2. 保存データが壊れている（JSON でない、version が不明、profiles が配列でない）: 消さずに退避キーへ移し、空の状態で起動して知らせる。→ Task 5 のテスト `load quarantines corrupt data`。
3. 教材データの不整合（問題の概念が未定義、類題プールが 2 問未満、確認問題が 3 問未満、操作型・図の問題がないステージ）: 起動時の検証で検出し、開発中に気づける。→ Task 2 の `validateUnit`、Task 8/9 の教材テスト。
4. 日付またぎと連続学習: 23:59 に答えて翌 0:01 に答えると日数が +1、1 日空くと 1 に戻る、同じ日の 2 回目は加算しない。→ Task 4 のテスト `streak`。
5. 操作型問題の「ドラッグしていないのに答えた」「ドラッグ量ゼロ」: 誤答扱いにせず無効（`invalid: true`）として再操作を促す。→ Task 3 のテスト `ray-draw rejects zero-length drag`。

---

## ファイル構成

```
理科アプリ/
  index.html                 画面の骨組み（section を切り替える）
  manifest.webmanifest       ホーム画面追加用
  sw.js                      Service Worker（キャッシュ優先）
  css/style.css
  js/config.js               暫定の数値すべて
  js/geometry.js             角度・直線・点の計算（判定に使う）
  js/content-registry.js     教材の登録・検索・検証
  js/judge.js                5 形式の正誤判定
  js/mastery.js              理解度の更新とラベル
  js/xp.js                   経験値・レベル・連続学習
  js/record.js               生徒ごとの記録（イベントの適用、ステージ状態、星、履歴）
  js/storage.js              localStorage の読み書き・退避・JSON 書き出し/読み込み
  js/session.js              1 回の学習（クエスト）の進行。学び直しの分岐
  js/recommend.js            今日のクエスト
  js/figures.js              場面の指定 → SVG 文字列
  js/mascot.js               マスコットの SVG と祝い演出
  js/ui-problems.js          問題形式ごとの画面部品（タッチ操作を含む）
  js/ui-screens.js           各画面の描画
  js/app.js                  画面の切り替え、保存のタイミング、起動
  content/light.js           「光の世界」教材データ
  tests/*.test.js            ロジックのテスト
  tests/fixtures/unit.js     テスト用の小さな単元
  tools/codex-review.ps1 ほか（前回から流用）
  CLAUDE.md, AGENTS.md, README.md, package.json, .gitignore
  .claude/settings.json, .claude/launch.json
  docs/requirements.md       要件定義書のコピー（原本はフォルダ直上のファイル）
```

### 共通のデータの形（全タスクで使う。ここだけが定義）

```js
// 教材（content-registry.js が検証する）
unit    = { id, title, concepts: [concept], areas: [area] }
area    = { id, title, order, stages: [stage] }
stage   = { id, areaId, title, minutes, concepts: [conceptId], lessons: [card], warmup: problem, problems: [problem], retryPool: [problem] }
card    = { id, text, figure }               // figure は null または scene
concept = { id, title, basic: conceptId|null, lessonStageId: stageId, checkPool: [problem] }
problem = { id, type, concept: conceptId, prompt, figure, explanation, hint, ...形式ごとの項目 }
//   type 'choice'        : options: [{ id, text }], answer: optionId            解答 = optionId
//   type 'fill'          : text: '光は[b1]に進む', blanks: [{ id, kind: 'word', options: [text], answer: text } | { id, kind: 'number', answer, tolerance, unit }]
//                                                                                 解答 = { [blankId]: text|number }
//   type 'figure-choice' : answer: regionId（figure.items の type 'region' の id）   解答 = regionId
//   type 'ray-draw'      : source: {x,y}, hit: {x,y}, surface: { kind:'mirror', x1,y1,x2,y2 } | { kind:'boundary', y, from:'air'|'water'|'glass', to: 'air'|'water'|'glass' } | { kind:'lens', cx, cy, f },
//                          expected: { kind:'angle' } | { kind:'direction' } | { kind:'lens', ray:'parallel'|'center'|'focus' }
//                                                                                 解答 = { out: {x,y} }（折れた先の光線上の 1 点）
//                          samples: { correct: 解答, wrong: 解答 }（手計算した正解例・不正解例。教材テストで判定を確かめる）
//                          約束: 光は常に左から右へ進む（source.x < hit.x）。レンズの問題は物体・光源をレンズの左に置く
//   type 'drag'          : draggable: { itemId, axis: 'x'|'y'|'xy' }, target: { x, y }, samples: { correct, wrong }   解答 = { x, y }
scene   = { width, height, items: [item] }   // item.type: mirror|boundary|lens|axis|object|ray|normal|point|region|label|eye|lamp|screen（Task 9 で定義）

// 記録（record.js / storage.js）
store   = { version: 1, currentProfileId: string|null, profiles: [profile], records: { [profileId]: record } }
profile = { id, nickname, avatar, createdAt }
record  = { xp, level, streak: { count, lastDate }, mastery: { [conceptId]: { value, lastAt } },
            stages: { [stageId]: { status: 'none'|'inprogress'|'cleared', stars, attempts, resume: session|null } },   // attempts = 挑戦の通し番号。復習セッションは resume に入れない（短いので再開しない）
            lessonsRead: { [stageId]: true }, reviewDone: { [conceptId]: 'YYYY-MM-DD' },
            history: [{ at, sessionId, attempt, stageId, problemId, conceptId, correct, phase }],      // phase: 'main'|'retry'|'check'|'review'|'warmup'。attempt は stages[].attempts の値（復習は 0）
            xpLog: [{ at, kind, amount, stageId }] }

// 学習の進行（session.js）。JSON にできる形にして record.stages[id].resume に保存する
session = { id, kind: 'stage'|'review', stageId|null, conceptId|null, attempt, mode: 'lesson'|'problem', startedAt,
            xpMultiplier: 1|0.5, queue: [step], index, usedProblemIds: [...], missStreak: { [conceptId]: n },
            pending: null | { problemId, correct, feedback, phase },      // 解答済みでフィードバック表示中。next() で消える
            learnback: null | { conceptId, basicId, round, results: [bool], recheck: bool },   // 学び直し中の状態
            learnbackRounds: { [basicId]: n },        // この挑戦で同じ basic へ戻った回数（learnback が null になっても残る）
            awardedProblemIds: [...],                 // このセッションで経験値を付けた問題 id（同じ問題を再出題しても 1 回だけ）
            results: { main: [{ problemId, correct }], retry: [...], check: [...], review: [...] }, lessonRead: false, ended: null|'completed'|'stopped' }
step    = { kind: 'lesson', card, lessonStageId } | { kind: 'warmup'|'problem', problem, phase } | { kind: 'offer', conceptId, basicId }
view    = current(session) が返す。{ kind: 'lesson', card, index, total } | { kind: 'problem', problem, phase } | { kind: 'feedback', problem, correct, feedback, phase } | { kind: 'offer', concept, basic } | { kind: 'ended', reason }

// セッションからの出来事（record.applyEvents が受ける）
event   = { kind: 'answer'|'correct'|'firstTry'|'retryCorrect'|'learnback'|'stageClear' } | { kind: 'lessonRead', lessonStageId }
        | { kind: 'mastery', conceptId, change: 'firstTry'|'later'|'wrong' }
        | { kind: 'history', sessionId, attempt, stageId, problemId, conceptId, correct, phase }   // session.answer が session.id / session.attempt を入れる
```

---

### Task 0: フォルダの土台と開発プロセス

**Files:**
- Create: `package.json`, `.gitignore`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `.claude/launch.json`, `docs/requirements.md`, `tools/codex-review.ps1`, `tools/codex-review-prompt.md`, `tools/codex-implement.ps1`, `tools/codex-implement-prompt.md`, `.ai-tasks/.gitkeep`, `.ai-review/.gitkeep`
- 流用元: `C:\Users\yan12\Documents\keita\AI開発\時間割アプリ\` の同名ファイル（読むだけ。変更しない）

**Interfaces:**
- Produces: `npm test` が動く土台、`tools/codex-review.ps1 -Round N`、`tools/codex-implement.ps1 -Task <file>`

- [ ] **Step 1: `git init` と `package.json`**

`package.json`: `{ "name": "rika-quest", "version": "0.1.0", "private": true, "description": "理科クエスト 中学理科 e-learning（試作1）", "scripts": { "test": "node --test \"tests/*.test.js\"" } }`

- [ ] **Step 2: `.gitignore`**

内容: `node_modules/`、`.claude/worktrees/`、`rika-quest-*.json`（アプリから書き出した記録）、`samples/`。

- [ ] **Step 3: 開発ルールとツールを前回から流用**

`CLAUDE.md`、`AGENTS.md`、`tools/*` を前回のものをもとに書く。直す点: フォルダ名を `理科アプリ`、要件定義書の場所を `docs/requirements.md` と設計書 `docs/superpowers/specs/2026-11-03-rika-quest-design.md`、役割分担の表に「コードを書くのは Claude Code のサブエージェント（Opus）。指示書は `.ai-tasks/` に残す」を追加、許可の日付を 2026-11-03 にする。`tools/*.ps1` と prompt はそのまま（フォルダに依存しない）。`.claude/settings.json` は前回と同じ allow 4 行。`.claude/launch.json` は name `rika`, `python -m http.server 8765 --bind 127.0.0.1`, port 8765。

- [ ] **Step 4: `docs/requirements.md` と `README.md`**

`docs/requirements.md` は `理科クエスト_要件定義書_v0.1.md` のコピー（先頭に「原本: ../理科クエスト_要件定義書_v0.1.md」の 1 行）。`README.md` は、使い方（`index.html` を開く / `python -m http.server` で開くとオフライン対応が効く）、資料へのリンク、`npm test`、開発の進め方へのリンク。

- [ ] **Step 5: 確認**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/codex-review.ps1 -Round 3`
Expected: 終了コード 2、`Round must be 1 or 2` のエラー（スクリプトが動く確認）。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "理科クエスト試作1の土台（開発ルール、Codex 用スクリプト、要件定義書）"
```

---

### Task 1: config.js と geometry.js

**Files:**
- Create: `js/config.js`, `js/geometry.js`
- Test: `tests/geometry.test.js`, `tests/config.test.js`

**Interfaces:**
- Produces `config`（`RikaQuest.config`）:
  ```js
  {
    xp: { answer: 10, correct: 10, firstTry: 5, retryCorrect: 15, learnback: 20, lessonRead: 10, stageClear: 50, dailyPerStreakDay: 10, dailyMax: 50 },
    repeatMultiplier: 0.5,
    levels: [0, 100, 250, 450, 700],   // Lv1..Lv5 の下限。以後 +300 ずつ（levelFor が計算）
    levelStep: 300,
    mastery: { firstTry: 0.25, later: 0.15, wrong: -0.2, labels: [[0.4, 'まだ'], [0.8, 'もう少し'], [1.01, 'できた']] },
    learnback: { missToOffer: 2, checkCount: 2, recheckCount: 1 },
    review: { problemCount: 3, minDaysSince: 1 },
    stars: [[0.5, 1], [0.8, 2], [1.01, 3]],   // 1回目正解率の上限と星
    tolerance: { reflectDeg: 5, lensPx: 12, parallelDeg: 5, dragPx: 16, snapPx: 24 },
    storageKey: 'rika-quest:v1',
  }
  ```
- Produces `geometry`: `angleDeg(from, to) → number`（x 軸基準、-180〜180）、`normalizeDeg(d) → -180<d<=180`、`angleBetweenDeg(a, b) → 0〜180`、`angleToNormalDeg(vec, normalVec) → 0〜90`（光線と法線のなす角）、`reflect(incident, normal) → vec`、`distancePointToLine(p, a, b) → number`、`isParallelDeg(vecA, vecB, tolDeg) → bool`、`sideOfLine(p, a, b) → -1|0|1`、`sub(p, q)`, `len(v)`, `normalOf(surface) → vec`（mirror は線分に垂直な単位ベクトル、boundary は (0,-1)）、`intersectLine(p, dir, a, b) → point|null`。

- [ ] **Step 1: テストを書く**

```js
// tests/geometry.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const g = require('../js/geometry.js');
test('angleToNormalDeg: 45° の入射', () => {
  assert.equal(Math.round(g.angleToNormalDeg({ x: 1, y: 1 }, { x: 0, y: -1 })), 45);
});
test('reflect: 法線 (0,-1) に対し (1,1) は (1,-1)', () => {
  const r = g.reflect({ x: 1, y: 1 }, { x: 0, y: -1 });
  assert.deepEqual({ x: Math.round(r.x), y: Math.round(r.y) }, { x: 1, y: -1 });
});
test('distancePointToLine: 点 (0,5) と x 軸は 5', () => assert.equal(g.distancePointToLine({ x: 0, y: 5 }, { x: -1, y: 0 }, { x: 1, y: 0 }), 5));
test('isParallelDeg: 4° 違いは ±5° で平行', () => assert.equal(g.isParallelDeg({ x: 100, y: 0 }, { x: 100, y: 7 }, 5), true));
test('sideOfLine: 線の左右で符号が変わり、線上は 0', () => {
  const a = { x: 0, y: 0 }, b = { x: 0, y: 10 };
  assert.equal(g.sideOfLine({ x: 1, y: 5 }, a, b) * g.sideOfLine({ x: -1, y: 5 }, a, b), -1);
  assert.equal(g.sideOfLine({ x: 0, y: 5 }, a, b), 0);
});
test('normalOf: 水平な鏡の法線は上向き', () => assert.deepEqual(g.normalOf({ kind: 'mirror', x1: 0, y1: 100, x2: 200, y2: 100 }), { x: 0, y: -1 }));
```
```js
// tests/config.test.js
test('config の暫定値は設計書どおり', () => {
  const c = require('../js/config.js');
  assert.equal(c.xp.stageClear, 50); assert.equal(c.tolerance.reflectDeg, 5); assert.deepEqual(c.levels, [0, 100, 250, 450, 700]);
});
```

- [ ] **Step 2: 失敗を確認** — Run: `npm test` Expected: `Cannot find module '../js/geometry.js'`
- [ ] **Step 3: `js/config.js` と `js/geometry.js` を実装**（上の Interfaces の値と署名どおり。`normalOf` の鏡の法線は、線分の向きに対して「y が小さい側」を向く単位ベクトルにする。設計書 5.2 の判定で、法線の向きは `surface` に対し一意であればよい）
- [ ] **Step 4: 成功を確認** — Run: `npm test` Expected: すべて pass
- [ ] **Step 5: Commit** — `git add js/config.js js/geometry.js tests/ && git commit -m "暫定の設定値と、判定に使う幾何の計算"`

---

### Task 2: content-registry.js（教材の登録・検索・検証）

**Files:**
- Create: `js/content-registry.js`, `tests/fixtures/unit.js`
- Test: `tests/content-registry.test.js`

**Interfaces:**
- Produces `contentRegistry`: `createRegistry() → reg`、`reg.register(unit)`、`reg.units() → [unit]`、`reg.unit(id)`、`reg.stage(stageId) → stage|null`、`reg.concept(conceptId) → concept|null`、`reg.problem(problemId) → problem|null`、`reg.stagesInOrder(unitId) → [stage]`（area.order 順、stage は配列順）、`reg.nextStage(stageId) → stage|null`（同じ領域の次。末尾なら null）、`validateUnit(unit) → [string]`（空なら正常）。
- ブラウザでは `root.RikaQuest.content = createRegistry()` を `content-registry.js` の末尾で作り、`content/*.js` が `RikaQuest.content.register(...)` を呼ぶ。
- `tests/fixtures/unit.js`: 2 領域・3 ステージ・3 概念（`c-a` basic なし、`c-b` basic `c-a`、`c-c` basic `c-b`）、各概念 retryPool 2 問・checkPool 3 問、問題は `choice` と `figure-choice` を混ぜる。`module.exports = { unit }`。

- [ ] **Step 1: テストを書く**

```js
test('register と検索', () => { const reg = cr.createRegistry(); reg.register(unit); assert.equal(reg.stage('s-a1').title, unit.areas[0].stages[0].title); assert.equal(reg.concept('c-b').basic, 'c-a'); assert.equal(reg.problem('p-a1-1').type, 'choice'); });
test('stagesInOrder は領域の order 順', () => assert.deepEqual(reg.stagesInOrder('u').map(s => s.id), ['s-a1', 's-a2', 's-b1']));
test('nextStage は領域内の次、末尾は null', () => { assert.equal(reg.nextStage('s-a1').id, 's-a2'); assert.equal(reg.nextStage('s-a2'), null); });
test('validateUnit: 正常な教材は空', () => assert.deepEqual(cr.validateUnit(unit), []));
test('validateUnit: 未定義の概念、類題 2 問未満、確認問題 3 問未満、図・操作型のないステージ、重複 id を検出', () => {
  // unit を deep copy して 1 か所ずつ壊し、メッセージに問題の id と理由が含まれることを assert.match で確認
});
```

- [ ] **Step 2: 失敗を確認** — Run: `npm test` Expected: `Cannot find module`
- [ ] **Step 3: 実装。** `validateUnit` の検査項目: id 重複（stage/problem/concept/card）、problem.concept が concepts にある、stage.concepts が concepts にある、concept.basic が存在する（null 可）、concept.lessonStageId が存在する、各概念の retryPool（その概念の問題）が 2 問以上、checkPool 3 問以上、各ステージに `figure-choice|ray-draw|drag` が 1 問以上、各ステージ problems 4〜5 問、lessons 2〜4 枚、warmup が choice、problem.type が 5 種のどれか、形式ごとの必須項目（Task 2 では存在チェックのみ。`ray-draw` と `drag` は `samples.correct` と `samples.wrong` が必須）。
- [ ] **Step 4: 成功を確認** — `npm test`
- [ ] **Step 5: Commit** — `git commit -m "教材の登録・検索と、教材データの検証"`

---

### Task 3: judge.js（5 形式の判定）

**Files:**
- Create: `js/judge.js`
- Test: `tests/judge.test.js`

**Interfaces:**
- Consumes: `geometry`、`config.tolerance`
- Produces `judge`: `judge(problem, answer, config) → { correct: bool, invalid?: true, reason?: string }`。形式ごと: `judgeChoice`, `judgeFill`, `judgeFigureChoice`, `judgeRayDraw`, `judgeDrag`（内部関数、api にも出す）。

- [ ] **Step 1: テストを書く**（設計書 5.2 の値）

```js
test('choice', () => assert.equal(judge.judge({ type: 'choice', options: [{ id: 'a' }, { id: 'b' }], answer: 'b' }, 'b', config).correct, true));
test('fill: 語は完全一致、数値は許容誤差', () => {
  const p = { type: 'fill', blanks: [{ id: 'b1', kind: 'word', options: ['まっすぐ', '曲がって'], answer: 'まっすぐ' }, { id: 'b2', kind: 'number', answer: 30, tolerance: 2 }] };
  assert.equal(judge.judge(p, { b1: 'まっすぐ', b2: 31.5 }, config).correct, true);
  assert.equal(judge.judge(p, { b1: 'まっすぐ', b2: 33 }, config).correct, false);
  assert.equal(judge.judge(p, { b1: 'まっすぐ' }, config).invalid, true);  // 未記入
});
test('figure-choice', () => assert.equal(judge.judge({ type: 'figure-choice', answer: 'r2' }, 'r2', config).correct, true));
test('ray-draw 反射: 入射 45° に対し反射 47° は正解、ちょうど 50° も正解、52° は不正解、光源へ戻る向きと鏡を突き抜ける向きは不正解', () => {
  const p = { type: 'ray-draw', source: { x: 0, y: 0 }, hit: { x: 100, y: 100 }, surface: { kind: 'mirror', x1: 0, y1: 100, x2: 200, y2: 100 }, expected: { kind: 'angle' } };
  const out = (deg) => ({ out: { x: 100 + 100 * Math.sin(deg * Math.PI / 180), y: 100 - 100 * Math.cos(deg * Math.PI / 180) } });
  assert.equal(judge.judge(p, out(47), config).correct, true);
  assert.equal(judge.judge(p, out(50), config).correct, true);
  assert.equal(judge.judge(p, out(52), config).correct, false);
  assert.equal(judge.judge(p, { out: { x: 0, y: 0 } }, config).correct, false);      // 来た道を戻る（法線との角は 45° だが向きが逆）
  assert.equal(judge.judge(p, { out: { x: 200, y: 200 } }, config).correct, false);  // 鏡の裏へ
});
test('ray-draw 屈折 空気→水: 法線に近づく側は正解、入射の延長より遠い側・同じ側・境界の手前は不正解', () => {
  const p = { type: 'ray-draw', source: { x: 0, y: 0 }, hit: { x: 100, y: 100 }, surface: { kind: 'boundary', y: 100, from: 'air', to: 'water' }, expected: { kind: 'direction' } };
  assert.equal(judge.judge(p, { out: { x: 150, y: 200 } }, config).correct, true);   // 延長 (200,200) より法線寄り
  assert.equal(judge.judge(p, { out: { x: 250, y: 200 } }, config).correct, false);  // 法線から遠い
  assert.equal(judge.judge(p, { out: { x: 50, y: 200 } }, config).correct, false);   // 法線の同じ側（入射側）
  assert.equal(judge.judge(p, { out: { x: 150, y: 50 } }, config).correct, false);   // 境界の手前（反射側）
});
test('ray-draw 屈折 水→空気: 法線から離れる側が正解', () => { /* from:'water', to:'air'、同じ source/hit で out (250,200) 正解、(150,200) 不正解 */ });
test('ray-draw 屈折 下から上（source が境界の下）でも同じ規則で判定', () => { /* source (0,200), hit (100,100), from:'water', to:'air'、out (250,0) 正解、(150,0) 不正解、(150,150) は境界の手前で不正解 */ });
test('ray-draw 凸レンズ: parallel は向こう側の焦点を通る、center は直進、focus は軸に平行。逆向き（レンズの左へ）は不正解', () => {
  const lens = { kind: 'lens', cx: 200, cy: 150, f: 60 };
  const par = { type: 'ray-draw', source: { x: 50, y: 110 }, hit: { x: 200, y: 110 }, surface: lens, expected: { kind: 'lens', ray: 'parallel' } };
  assert.equal(judge.judge(par, { out: { x: 260, y: 150 } }, config).correct, true);      // 焦点 (260,150) を通る
  assert.equal(judge.judge(par, { out: { x: 260, y: 170 } }, config).correct, false);     // 焦点から約 14.1px ずれ
  const par2 = { ...par, source: { x: 50, y: 130 }, hit: { x: 200, y: 130 }, surface: { kind: 'lens', cx: 200, cy: 150, f: 30 } };
  assert.equal(judge.judge(par2, { out: { x: 230, y: 170 } }, config).correct, true);     // 焦点 (230,150) と直線 (200,130)-(230,170) の距離 = 600/50 = 12.0 ちょうど → 正解
  assert.equal(judge.judge(par2, { out: { x: 230, y: 172 } }, config).correct, false);    // 12px を超える
  assert.equal(judge.judge(par, { out: { x: 140, y: 70 } }, config).correct, false);      // 直線は焦点を通るが左向き
  const ctr = { ...par, source: { x: 50, y: 100 }, hit: { x: 200, y: 150 }, expected: { kind: 'lens', ray: 'center' } };
  assert.equal(judge.judge(ctr, { out: { x: 350, y: 200 } }, config).correct, true);
  const foc = { ...par, source: { x: 140, y: 150 }, hit: { x: 200, y: 110 }, expected: { kind: 'lens', ray: 'focus' } };
  assert.equal(judge.judge(foc, { out: { x: 350, y: 112 } }, config).correct, true);
  assert.equal(judge.judge(foc, { out: { x: 300, y: 110 + 100 * Math.tan(5 * Math.PI / 180) } }, config).correct, true);   // 軸との角 5° ちょうど（y ≒ 118.7489、丸めない）。判定は浮動小数点の誤差分だけ余裕を持つ（`<= tol + 1e-9`）
  assert.equal(judge.judge(foc, { out: { x: 300, y: 122 } }, config).correct, false);    // 約 6.8°
});
test('ray-draw rejects zero-length drag', () => { const p = /* 上の反射の問題 */; assert.equal(judge.judge(p, { out: { x: 100, y: 100 } }, config).invalid, true); });
test('drag: 許容 16px（16 ちょうどは正解、17 は不正解）', () => { const p = { type: 'drag', draggable: { itemId: 'obj', axis: 'x' }, target: { x: 120, y: 150 } }; assert.equal(judge.judge(p, { x: 136, y: 150 }, config).correct, true); assert.equal(judge.judge(p, { x: 137, y: 150 }, config).correct, false); });
```

- [ ] **Step 2: 失敗を確認** — `npm test`
- [ ] **Step 3: 実装。** 共通: `inc = hit - source`、`o = out - hit`、`len(o) < 1` は `invalid`。
  - 反射: `n = normalOf(surface)`（鏡の法線のうち `source` 側を向くもの。`sideOfLine(source, 鏡の両端)` と同じ側になるよう符号を選ぶ）、`r = reflect(inc, n)`。`angleBetweenDeg(o, r) <= reflectDeg` かつ `sideOfLine(out, 鏡の両端) === sideOfLine(source, 鏡の両端)`（鏡の裏へ行かない）なら正解。来た道を戻る向きは `angleBetweenDeg` が 90° になるので自然に不正解。
  - 屈折（設計書 5.2）: 入射側は `sign(source.y - hit.y)` で決める（`from` は媒質の名前で、上下は座標で決める）。`n = (0, sign(hit.y - source.y))`（進む側を向く法線）。(a) `sign(out.y - hit.y) === sign(hit.y - source.y)`（境界の反対側）、(b) `sign(out.x - hit.x) === sign(hit.x - source.x)`（法線をはさんで反対側）、(c) `air → water|glass` なら `angleToNormalDeg(o, n) < angleToNormalDeg(inc, n)`、`water|glass → air` なら `>`。3 つとも満たせば正解。水⇄ガラスは出題しない。
  - レンズ（光は左から右。`out.x <= hit.x` は不正解）: `parallel` は `distancePointToLine({x: cx + f, y: cy}, hit, out) <= lensPx`、`center` は `isParallelDeg(inc, o, parallelDeg)` かつ `o.x > 0`、`focus` は `isParallelDeg(o, {x: 1, y: 0}, parallelDeg)` かつ `o.x > 0`。
  - drag: `len(answer - target) <= dragPx`（axis が 'x' なら x だけ、'y' なら y だけで比べる）。
- [ ] **Step 4: 成功を確認** — `npm test`
- [ ] **Step 5: Commit** — `git commit -m "5 形式の問題の正誤判定"`

---

### Task 4: mastery.js と xp.js

**Files:**
- Create: `js/mastery.js`, `js/xp.js`
- Test: `tests/mastery.test.js`, `tests/xp.test.js`

**Interfaces:**
- Produces `mastery`: `update(value, change, config) → number`（change: 'firstTry'|'later'|'wrong'、0〜1 に収める）、`label(value, config) → 'まだ'|'もう少し'|'できた'`。
- Produces `xp`: `amountFor(kind, config, ctx) → number`（kind は event.kind の xp 系。`daily` は `ctx.streak` を使い `min(dailyPerStreakDay * streak, dailyMax)`）、`levelFor(totalXp, config) → number`、`nextLevelXp(level, config) → number`、`localDate(date) → 'YYYY-MM-DD'`（端末ローカル）、`updateStreak(streak, today) → { streak: { count, lastDate }, isFirstToday: bool }`（today は 'YYYY-MM-DD'。lastDate が today なら変化なし、前日なら +1、それ以外は 1）、`daysBetween(dateA, dateB) → number`。

- [ ] **Step 1: テストを書く**

```js
test('mastery.update: 0 → firstTry 0.25 → later 0.4 → wrong 0.2、上限 1 下限 0', ...);
test('mastery.label: 0.39 まだ, 0.4 もう少し, 0.8 できた', ...);
test('xp.amountFor: answer 10, retryCorrect 15, stageClear 50, daily は 10×連続日数で上限 50', () => { assert.equal(xp.amountFor('daily', config, { streak: 3 }), 30); assert.equal(xp.amountFor('daily', config, { streak: 9 }), 50); });
test('levelFor: 0→1, 99→1, 100→2, 700→5, 1000→6, 1299→6, 1300→7', ...);
test('streak: 同じ日は変化なし、翌日は +1、1 日空くと 1', () => {
  let r = xp.updateStreak({ count: 0, lastDate: null }, '2026-11-03'); assert.deepEqual(r, { streak: { count: 1, lastDate: '2026-11-03' }, isFirstToday: true });
  r = xp.updateStreak(r.streak, '2026-11-03'); assert.equal(r.isFirstToday, false); assert.equal(r.streak.count, 1);
  r = xp.updateStreak(r.streak, '2026-11-04'); assert.equal(r.streak.count, 2);
  r = xp.updateStreak(r.streak, '2026-11-06'); assert.equal(r.streak.count, 1);
});
test('localDate は端末ローカルの日付（23:59 と翌 0:01 で日が変わる）', () => { assert.equal(xp.localDate(new Date(2026, 10, 3, 23, 59)), '2026-11-03'); assert.equal(xp.localDate(new Date(2026, 10, 4, 0, 1)), '2026-11-04'); });
```

- [ ] **Step 2: 失敗を確認** — [ ] **Step 3: 実装** — [ ] **Step 4: 成功を確認**
- [ ] **Step 5: Commit** — `git commit -m "理解度の更新と、経験値・レベル・連続学習"`

---

### Task 5: record.js と storage.js

**Files:**
- Create: `js/record.js`, `js/storage.js`
- Test: `tests/record.test.js`, `tests/storage.test.js`

**Interfaces:**
- Consumes: `xp`, `mastery`, `config`
- Produces `record`: `createStore() → store`、`createProfile(store, { nickname, avatar }, now) → profile`（id は `p-<時刻>-<乱数>`、`records[id] = createRecord()`、`currentProfileId` を設定）、`deleteProfile(store, id)`、`createRecord() → record`（xp 0, level 1, streak {0,null}, 空のオブジェクト）、`applyEvents(record, events, { now, multiplier, stageId }, config) → record`（新しいオブジェクトを返す。`answer` 系は `xp.amountFor × multiplier` を四捨五入して加算し xpLog に積む。連続学習と日次加点は `history`（phase が 'warmup' 以外）で判定する: その日の最初の `history` なら `updateStreak` と `daily` 加算（経験値の `answer` が出ない再出題でも学習日に数える）。`mastery` イベントは `mastery.update`。`history` は push（`sessionId`、`attempt` を含む）。`lessonRead` は `event.lessonStageId` のステージで初めてのときだけ加算し `lessonsRead[lessonStageId] = true`（設計書 4.5 の「解説カードを最後まで読む +10」をステージごと 1 回に限る。Claude Code の判断: 再読でのかせぎ過ぎを防ぐ。「解説を見る」モーダルは対象外）。level は `levelFor` で更新）、`finishStage(record, { stageId, stars, cleared }, now) → record`（`cleared: true` なら status 'cleared' にして stars は上がるときだけ更新。`cleared: false`（中断）なら status は 'cleared' ならそのまま、それ以外は 'inprogress'、stars は変えない。どちらも resume を null にし、`attempts` を +1）、`setResume(record, stageId, session) → record`（status が 'none' なら 'inprogress' にする）、`stageState(record, stageId) → { status, stars, resume }`、`markReviewDone(record, conceptId, date)`、`masteryOf(record, conceptId) → number`。
- Produces `storage`: `load(storageObj, config) → { store, error: null|string, quarantinedKey: null|string, originalKept: bool }`（なければ `createStore()`。JSON 不正・version 不明・profiles が配列でない → 退避キーに移して空の store と error。退避の保存に失敗したら `quarantinedKey: null, originalKept: false` で返し、元のキーは消さない）、`save(storageObj, store, config, { allowOverwrite = false } = {}) → bool`（元のキーに読めないデータが残っている間（`originalKept === false` のあと）は、`allowOverwrite` が true でない限り書かずに false を返す。判定は `load` の結果を `storage` が覚えておく）、`exportJson(store) → string`、`importJson(text) → { store, error }`（同じ検証。error のときは呼び出し側が既存の store を置き換えない。読み込んだファイルは利用者の手元に残るので退避はしない）。`load` で退避に失敗した（setItem が例外）場合も元のキーは消さない。

- [ ] **Step 1: テストを書く**

```js
test('applyEvents: answer+correct+firstTry は 25xp、multiplier 0.5 なら 13xp（四捨五入）', ...);
test('applyEvents: その日の最初の history（warmup 以外）で streak と daily が入る、2 回目は入らない、warmup だけでは入らない', ...);
test('applyEvents: answer のない history（再出題）だけでも翌日の streak と daily が更新され、問題別の XP は増えない', ...);
test('applyEvents: mastery と history が記録される', ...);
test('finishStage: stars は上がるときだけ、cleared は inprogress に戻らない', ...);
test('save returns false when storage throws', () => { const bad = { setItem() { throw new Error('quota'); }, getItem() { return null; } }; assert.equal(storage.save(bad, record.createStore(), config), false); });
test('load: 退避に失敗したら元のキーを残し、以後の save は allowOverwrite なしでは false', () => { /* setItem が退避キーのときだけ例外を投げる fakeStorage。load 後 save(...) === false、元キーの中身が変わらない、save(..., { allowOverwrite: true }) === true */ });
test('load quarantines corrupt data', () => {
  const mem = fakeStorage({ 'rika-quest:v1': '{not json' });
  const r = storage.load(mem, config);
  assert.equal(r.store.profiles.length, 0); assert.match(r.error, /読み込めません/); assert.match(r.quarantinedKey, /^rika-quest:corrupt:/); assert.equal(mem.getItem(r.quarantinedKey), '{not json');
});
test('load/save の往復で同じ store', ...);
test('importJson: version が違えば error', ...);
```

- [ ] **Step 2: 失敗を確認** — [ ] **Step 3: 実装**（`fakeStorage` は `tests/helpers.js` に置く: `getItem/setItem/removeItem` を持つ Map ラッパー） — [ ] **Step 4: 成功を確認**
- [ ] **Step 5: Commit** — `git commit -m "生徒の記録の更新と、端末内への保存・退避・書き出し"`

---

### Task 6: session.js（学習の進行と学び直し）

**Files:**
- Create: `js/session.js`
- Test: `tests/session.test.js`（fixture の unit を使う）

**Interfaces:**
- Consumes: `contentRegistry`（reg）、`judge`、`config`
- Produces `session`:
  - `startStage(reg, record, stageId, mode, now, config) → session`（mode 'lesson' なら queue = lessons → warmup → problems、'problem' なら problems のみ。`xpMultiplier` は record.stages[stageId].status が 'cleared' なら 0.5）
  - `startReview(reg, record, conceptId, now, config) → session`（retryPool から 3 問、足りなければ checkPool から。`xpMultiplier` は `record.reviewDone[conceptId] === localDate(now)` なら 0.5）
  - `current(session, reg) → view`
  - `next(session, reg, config) → { session, events }`（lesson カードを進める。`pending` を消して次の step へ。step を使い切ったらその呼び出しで `ended: 'completed'` にし、kind 'stage' なら events に `stageClear`。lesson の列の最後のカードを読み終えた呼び出しで events に `{ kind: 'lessonRead', lessonStageId }`）
  - `answer(session, reg, answerValue, config) → { session, correct, invalid, feedback: { explanation, hint }, events: [event] }`（`pending` がある間に呼ばれたら `invalid: true`、events 空、session は変えない。同じ解答を 2 回送っても加点されない）
  - `choose(session, reg, 'accept'|'later', config) → { session, events }`（offer への返答）
  - `summary(session, reg, config) → { mainCount, firstTryCount, stars, improvedConcepts: [conceptId], suggestedConcept: conceptId|null, ended }`（improved = 類題か確認問題で正解した概念）
- 分岐（設計書 4.3）を `answer` の中で実装する:
  - 解答すると `pending = { problemId, correct, feedback, phase }` になり、`current` は `{ kind: 'feedback', ... }` を返す。`next` で `pending` を消して進む。
  - main で誤答 → `missStreak[c] = 1`、retryPool から未使用の同概念の問題を phase 'retry' で queue の次に挿入。プールが尽きていれば挿入せず、feedback に explanation を入れて続行。
  - retry で誤答 → `missStreak[c] = 2`。concept.basic があれば `{ kind: 'offer', conceptId: c, basicId }` を挿入。なければ、そのステージの lessons を `kind: 'lesson'` で挿入して続行（この lessons では `lessonRead` を出さない）。
  - `choose('accept')` → `learnbackRounds[basicId] += 1`、`learnback = { conceptId: c, basicId, round: learnbackRounds[basicId], results: [], recheck: false }`。basic の checkPool から 2 問を phase 'check' で挿入。確認問題は同じ学び直しの回の中では重複させず（その回で出した id を `learnback` 内で覚える）、別の回では再使用してよい（`usedProblemIds` に入れない。`usedProblemIds` は main と retry だけに使う）。`choose('later')` → 何もしない（summary.suggestedConcept = basic）。
  - check の結果は `learnback.results` に積み、2 問終えてから判定する。2 問とも正解 → `learnback = null`、main に戻る、events に `learnback`。1 問でも誤答 → basic の `lessonStageId` の lessons（`lessonRead` は `lessonStageId` 付きで出す）を挿入し、その後に `recheck: true` で check を 1 問挿入。再確認が正解 → `learnback = null`、main に戻る、events に `learnback`。再確認も誤答 → `ended: 'stopped'`、events に `learnback`（「確認問題を終えた」の +20 は結果に関係なく 1 回）。
  - main/retry/check で正解 → `missStreak[c] = 0`。
  - warmup の解答は `history`（phase 'warmup'）だけを出し、`answer`/`correct`/`mastery` は出さない（予想の正誤は経験値・理解度に影響しない）。
  - events の対応（warmup 以外）: 解答で `history`（常に）。経験値の events（`answer`、`correct`、`firstTry`、`retryCorrect`）は `problemId` が `awardedProblemIds` にないときだけ出し、出したら追加する（設計書 4.5「1 問につき 1 回まで」。確認問題を別の回で再出題しても加点は 1 回）。`mastery` は毎回: main 正解で `firstTry`、retry/check/review 正解で `later`、誤答で `wrong`。
  - `startStage` は `attempt = record.stages[stageId].attempts + 1` を session に持ち、`id` は `s-<時刻>-<乱数>`。`startReview` は `stageId: null, attempt: 0`。

- [ ] **Step 1: テストを書く**（fixture: `s-b1` は概念 `c-b`、basic `c-a`）

```js
test('lesson モード: lessons → warmup → problems → ended completed', ...);
test('problem モード: 最初から problems', ...);
test('全問正解: events に firstTry が main の数だけ、最後に stageClear。stars は 3', ...);
test('main 誤答 → 同じ概念の類題が次に出る → 正解で retryCorrect と mastery later', ...);
test('解答後は current が feedback、next で進む。pending 中の answer は invalid で events 空', ...);
test('類題も誤答 → offer が出る → accept → check 2 問正解 → main に戻り learnback', ...);
test('check の 1 問目誤答・2 問目正解 → basic の lessons（lessonRead あり）→ 再確認 1 問 → 正解で main に戻り learnback は 1 回', ...);
test('check 2 問目誤答 → lessons → 再確認 → 誤答で ended stopped、learnback は 1 回', ...);
test('同じ basic へ 2 回戻っても確認問題が 2 問確保できる（checkPool 3 問で round 2）。再出題された確認問題の 2 回目は history と mastery だけで answer/correct を出さない', ...);
test('warmup の正誤は answer/correct/mastery を出さない', ...);
test('星: main 5 問中 2 問正解（40%）で ★、3 問（60%）で ★★、4 問（80%）と 5 問で ★★★。4 問中 2 問（50% ちょうど）は ★★。類題・確認問題の正誤は星に影響しない', ...);
test('stageClear は最後の feedback の next で出る。lessonRead は最後のカードの next で出る', ...);
test('offer を later → main に戻り、summary.suggestedConcept が basic', ...);
test('basic のない概念で 2 回誤答 → lessons が挿入されて続行', ...);
test('類題プールが尽きたら挿入せず続行', ...);
test('クリア済みステージの再挑戦は xpMultiplier 0.5', ...);
test('startReview: 3 問、retryPool 優先、同じ日の 2 回目は 0.5', ...);
test('invalid な解答は session を変えず events が空', ...);
test('session は JSON.stringify → parse しても current が同じ', ...);
```

- [ ] **Step 2: 失敗を確認** — [ ] **Step 3: 実装**（queue への挿入は `index + 1` の位置。main と retry で出した問題 id は `usedProblemIds` に入れ、同じセッションで二度出さない。確認問題は上の規則どおり回をまたいで再使用できる） — [ ] **Step 4: 成功を確認**
- [ ] **Step 5: Commit** — `git commit -m "1 回の学習の進行と、誤答時の学び直しの分岐"`

---

### Task 7: recommend.js（今日のクエスト）

**Files:**
- Create: `js/recommend.js`
- Test: `tests/recommend.test.js`

**Interfaces:**
- Consumes: `contentRegistry`, `record`, `xp.daysBetween/localDate`, `mastery.label`
- Produces `recommend`: `todayQuest(reg, record, unitId, now, config) → { kind: 'review', conceptId, title } | { kind: 'stage', stageId, resume: bool, title }`、`isUnlocked(reg, record, stageId) → bool`（領域の最初のステージは常に true、それ以外は前のステージが cleared）。

- [ ] **Step 1: テストを書く**（設計書 4.6 の順: 「まだ」かつ 1 日以上前 → 途中 → 未着手の最初 → 全クリアなら理解度最低の復習）
- [ ] **Step 2〜4** — [ ] **Step 5: Commit** — `git commit -m "今日のクエストのおすすめと、ステージの解放判定"`

---

### Task 8: content/light.js（教材: 光の直進・反射）

**Files:**
- Create: `content/light.js`（単元全体の骨組みと、直進 2 ステージ・反射 2 ステージ）
- Test: `tests/content-light.test.js`

**Interfaces:**
- Produces: `RikaQuest.content.register(unit)` を呼ぶ（Node では `module.exports = { unit }`）。unit.id `light`、area id `straight|reflect|refract|lens`、stage id `straight-1|straight-2|reflect-1|reflect-2|...`、concept id `straight|reflect-law|mirror-image|refract-dir|refract-view|total-reflect|focus|lens-image`（設計書 5.1 の表どおり。`refract-2` は concepts `['refract-view','total-reflect']`、両方 basic `refract-dir`）。
- 図の `scene` は Task 9 の item 定義に従う（Task 9 と同時に進める場合は item の type 名だけ合わせる）。

- [ ] **Step 1: テストを書く**

```js
test('validateUnit(light) は空', () => assert.deepEqual(cr.validateUnit(light.unit), []));
test('ステージ数は STAGE_COUNT（Task 8 では 4、Task 10 で 8 に変える）、概念はそのステージが使うものがすべて定義済み、各ステージに図か操作型が 1 問以上、各概念 retryPool 2 以上 checkPool 3 以上', ...);
test('ray-draw と drag の問題は samples.correct で correct、samples.wrong で不正解になる', () => { /* areas[].stages[] の warmup/problems/retryPool と、concepts[].checkPool を分けて列挙し、type が ray-draw/drag のものを全部検査 */ });
test('教科書名・出版社名を含まない', () => assert.doesNotMatch(JSON.stringify(light.unit), /東京書籍|啓林館|大日本図書|教育出版|学校図書/));
```

- [ ] **Step 2: 失敗を確認** — [ ] **Step 3: 教材を書く（4 ステージと、それが使う 3 概念 `straight`, `reflect-law`, `mirror-image` だけ。残りの概念は Task 10）。** 各ステージ: lessons 3 枚（文 60〜120 字、中1 が読める言葉、各カードに図）、warmup 1 問（選択式、予想）、problems 4〜5 問（choice / fill / figure-choice / ray-draw / drag を混ぜる）、retryPool は概念ごと 3 問。concept.checkPool 3 問。内容の要点: 直進1=光源・光の道すじ・影の形、直進2=物体からの光が目に入る・光源と物体の区別、反射1=入射角・反射角・法線、反射2=鏡の像は鏡の向こう同じ距離・見える範囲。
- [ ] **Step 4: 成功を確認** — [ ] **Step 5: Commit** — `git commit -m "教材: 光の世界（直進・反射）"`

---

### Task 9: figures.js と mascot.js（場面 → SVG）

**Files:**
- Create: `js/figures.js`, `js/mascot.js`
- Test: `tests/figures.test.js`

**Interfaces:**
- Produces `figures`: `sceneSvg(scene, opts) → string`（`<svg viewBox="0 0 w h" ...>`。各 item は `<g data-item-id="..." data-item-type="...">`。opts: `{ highlightRegion: id|null, draggableId: id|null, extraRays: [{x1,y1,x2,y2}] }`）。item の type と描き方:
  - `mirror {x1,y1,x2,y2}` 太い線＋裏側に斜線、`boundary {y, upper, lower}` 下半分を水色/薄灰で塗る、`lens {cx,cy,height,f}` 両凸の形と F・F' の点、`axis {y}` 細い一点鎖線、`object {id,x,y,height,label}` 上向き矢印、`ray {x1,y1,x2,y2,arrow,dashed}` 黄〜橙の線、`normal {x,y,angle}` 点線、`point {id,x,y,label}`、`region {id,x,y,r,label}` 半透明の丸（タップ対象、r は 22 以上）、`label {x,y,text}`、`eye {x,y}`、`lamp {x,y}`、`screen {x,y1,y2}`。
  - `escapeText(s)` で文字をエスケープ。
- Produces `mascot`: `svg(size) → string`、`celebrateMarkup(message) → string`（レベルアップ時の吹き出し付き）。名前は `mascot.NAME`（1 か所。初期値 'ピカ'）。

- [ ] **Step 1: テストを書く**（`sceneSvg` の戻り値に `data-item-id="r1"`、`viewBox="0 0 320 240"`、`<` を含む label がエスケープされる、`highlightRegion` で class `is-selected` が付く）
- [ ] **Step 2〜4** — [ ] **Step 5: Commit** — `git commit -m "図の SVG 描画とマスコット"`

---

### Task 10: content/light.js（教材: 屈折・凸レンズ）

**Files:**
- Modify: `content/light.js`
- Test: `tests/content-light.test.js`（Task 8 のテストが 8 ステージ分を検査する）

- [ ] **Step 1: `tests/content-light.test.js` の `STAGE_COUNT` を 8 に変え、失敗を確認**
- [ ] **Step 2: 教材を書く（残り 4 ステージと 5 概念 `refract-dir`, `refract-view`, `total-reflect`, `focus`, `lens-image`）。** 屈折1=空気→水で法線に近づく・水→空気で離れる（ray-draw direction）、屈折2=浮いて見える・折れて見える（refract-view）と光が出てこない（total-reflect）、凸レンズ1=平行光が焦点に集まる・焦点距離（drag で焦点に紙を動かす）、凸レンズ2=物体の位置と実像・虚像（drag で物体を動かしスクリーンに像、ray-draw lens）。
- [ ] **Step 3: 成功を確認** — [ ] **Step 4: Commit** — `git commit -m "教材: 光の世界（屈折・凸レンズ）"`

---

### Task 11: index.html・CSS・app.js・ui-screens.js（プロフィール、ホーム、学習マップ、ステージ入口、設定）

**Files:**
- Create: `index.html`, `css/style.css`, `js/app.js`, `js/ui-screens.js`

**Interfaces:**
- Consumes: すべてのロジックモジュール（`RikaQuest.*`）、`figures`, `mascot`
- Produces `app`（ブラウザのみ）: `app.state = { store, reg, screen, session }`、`app.go(screenName, params)`、`app.save(options = {})`（`storage.save(localStorage, store, config, options)` を呼び、false なら header に「保存できません」。`options.allowOverwrite` はそのまま渡す）。
- `ui-screens`: `renderProfile(root, ctx)`, `renderHome(root, ctx)`, `renderMap(root, ctx)`, `renderStageEntry(root, ctx, stageId)`, `renderSettings(root, ctx)`。`ctx = { store, record, reg, config, go, save, now }`。
- 画面の中身（設計書 4.1）: プロフィール（ニックネーム入力＋アバター 6 種から選択、「実名は入れない」「この端末のブラウザ内にだけ保存され、消えることがある」の注意、既存プロフィールの一覧と切り替え）、ホーム（今日のクエスト・Lv と XP バー（`nextLevelXp`）・連続学習の曜日 7 つ・学習マップへ・記録へ・「班の協力チャレンジ（準備中）」カード）、学習マップ（4 領域を縦に、各ステージをノードで、状態と星、`isUnlocked` で鍵）、ステージ入口（ステージ名、「約 N 分」、扱う内容（concepts の title）、「解説から学ぶ」「問題から挑戦」、`stageState.resume` があるときだけ「続きから」。途中で止めた（status 'inprogress' で resume なし）ステージは最初からやり直す）、設定（プロフィール管理、JSON 書き出し `rika-quest-<日付>.json`、読み込み（失敗したら既存の記録を変えずにエラー表示）、すべて削除（確認ダイアログ）、「記録はこの端末のブラウザ内だけに保存され、ブラウザのデータ削除や端末の変更で消えることがあります」の注意、オフライン教材の状態（Task 14 で埋める。ここでは「未対応」表示））。ホームにはマスコット（`mascot.svg`）を置く。起動時に `storage.load` が error を返したら header 下に表示する: `quarantinedKey` があれば「前回の記録が読み込めなかったため、別の場所に残してあります」、`originalKept === false` なら「読み込めない記録が残っているため、新しい記録は保存されません。設定画面から対処してください」。後者のときは設定画面に「読み込めない記録を上書きして新しく始める」ボタン（確認ダイアログつき）を出し、押したら `app.save({ allowOverwrite: true })` 以後は通常どおり保存する。
- `file://` で開いたときは header 下に「このまま使えますが、オフライン対応は http で開いたときだけ有効です」を小さく表示。

- [ ] **Step 1: `index.html` と `css/style.css`。** 配色トークン: `--blue: #1A5CFF; --bg: #EEF3FF; --card: #fff; --ok: #2E9E5B; --warn: #F08C2E; --text: #1B2430`。カード角丸 16px、ボタン高さ 56px。幅 375〜1024px で崩れない。
- [ ] **Step 2: `js/app.js`**（起動: `storage.load` → プロフィールがなければ profile 画面、あればホーム。`content-registry` の `validateUnit` を起動時に実行し、エラーがあれば console.error と画面の header に件数）
- [ ] **Step 3: `js/ui-screens.js` の 5 画面**
- [ ] **Step 4: ブラウザで確認。** `python -m http.server 8765 --bind 127.0.0.1` で開き、プロフィール作成 → ホーム → マップ → ステージ入口 → 設定の往復、書き出した JSON を読み込める、幅 375px でも横スクロールが出ない。
- [ ] **Step 5: Commit** — `git commit -m "画面: プロフィール、ホーム、学習マップ、ステージ入口、設定"`

---

### Task 12: ui-problems.js と学習画面（解説・問題・結果）

**Files:**
- Create: `js/ui-problems.js`
- Modify: `js/ui-screens.js`（`renderLesson`, `renderProblem`, `renderOffer`, `renderResult` を追加）, `js/app.js`

**Interfaces:**
- `ui-problems`: `render(root, problem, onAnswer)`（形式で分岐。`onAnswer(answerValue)` を 1 回だけ呼ぶ）。形式ごと:
  - choice: 縦並びの大きなボタン。fill: 語群はボタン、数値は `inputmode="decimal"` の入力＋「答える」。figure-choice: `sceneSvg` を `innerHTML` で入れ、`g[data-item-type="region"]` のタップで選択（選択は `is-selected`）→「答える」。
  - ray-draw: `sceneSvg` ＋ Pointer Events。1 回目のドラッグ: `source` から指を動かすと線が伸び、`hit` から `snapPx` 以内で離すと `hit` に吸着（外れたら線を消してやり直し）。2 回目: `hit` から指を動かすと折れた先の線が伸び、離した点を `out` にして「答える」を有効化。ドラッグ中は数値を表示する: 鏡は法線とのなす角、境界は角度を出さず「法線に近づく / 離れる」の文言（設計書 5.2）、レンズは軸とのなす角。`touch-action: none`。
  - drag: `draggable.itemId` の `<g>` を Pointer Events で動かす（axis に沿う）。ドラッグ中も現在位置（px のまま「位置: 120」）を表示し、「答える」で `{x,y}`。
  - `onAnswer` の戻り値が `{ invalid: true }` のときは部品の状態を保ったまま再操作・再送信できる（1 回だけ呼ぶ契約は「有効な解答につき 1 回」）。
- 学習画面の流れ: `app` が `session.current` の view で `renderLesson`（カードめくり、最後に「予想してみよう」へ）/ `renderProblem`（`ui-problems.render` → `session.answer` → フィードバック（正解=緑「正解！」、誤答=オレンジ「おしい」＋ explanation、`invalid` は「もう一度操作してね」）→「次へ」で `session.next`）/ `renderOffer`（「〇〇に戻って確かめよう」「戻る」「あとで」）/ `renderResult`（`summary`: できたこと、復習で伸びたこと（improvedConcepts）、XP の内訳（xpLog の今回分）、星、次のおすすめ、マスコット。レベルアップなら `mascot.celebrateMarkup` を 1〜2 秒表示し、タップでスキップ）。`answer`/`next`/`choose` が返す events はそのつど `record.applyEvents({ now, multiplier: session.xpMultiplier, stageId })` に渡し、kind 'stage' なら `record.setResume` も行い、`app.save()`。`ended` になったら kind 'stage' は `record.finishStage({ stageId, stars, cleared: ended === 'completed' })`、kind 'review' は `markReviewDone` → save。復習セッションは `setResume` を呼ばない（ステージの進捗・再開位置を変えない）。
- 問題画面に常に「解説を見る」ボタン（モーダルで lessons を表示。参照先: kind 'stage' の warmup・main・retry は現在のステージ `session.stageId` の lessons、check 問題と kind 'review' は表示中の問題の概念 `reg.concept(problem.concept).lessonStageId` のステージの lessons。進行は変えず、`lessonRead` も出さない）。

- [ ] **Step 1: `ui-problems.js` の 5 形式**
- [ ] **Step 2: 学習画面 4 つと app の配線**
- [ ] **Step 3: ブラウザで確認。** 反射1 を「解説から」で最後まで、わざと 2 回誤答して offer → 戻る → 復帰、を通す。ray-draw と drag がマウスで操作できる（DevTools のタッチエミュレーションでも）。解答直後にリロードしても同じ問題のフィードバックから再開し、XP が二重に入らない。直進1 と直進2 のそれぞれで「解説を見る」が自分のステージの解説を開く。リロードして「続きから」で同じ問題に戻る。結果画面の XP 内訳が設計書 4.5 と合う。レベルアップ演出がタップで消える。
- [ ] **Step 4: Commit** — `git commit -m "画面: 解説・問題（5 形式）・学び直し・結果"`

---

### Task 13: 記録画面と今日のクエスト

**Files:**
- Modify: `js/ui-screens.js`（`renderRecord`）, `js/app.js`

- [ ] **Step 1: 記録画面。** 進捗（領域ごとのクリア数 / ステージ数）、理解度の目安（概念ごとに `mastery.label`、経験値とは別カードで「これは理解のめやす。経験値とは別です」の 1 行）、履歴（日付・ステージ・正誤を新しい順に 30 件）、XP とレベル、連続学習日数。
- [ ] **Step 2: ホームの今日のクエストを `recommend.todayQuest` で決め、`review` なら `session.startReview`、`stage` なら入口へ。**
- [ ] **Step 3: ブラウザで確認。** 1 ステージを終えた後に記録画面の数字が合う。理解度が「まだ」の概念を作り、日付を進めた記録（JSON を編集して読み込む）でホームが復習クエストになる。
- [ ] **Step 4: Commit** — `git commit -m "画面: 記録と今日のクエスト"`

---

### Task 14: オフライン（Service Worker と manifest）

**Files:**
- Create: `sw.js`, `manifest.webmanifest`
- Modify: `index.html`（manifest リンク、SW 登録）, `js/ui-screens.js`（設定画面のオフライン状態）

- [ ] **Step 1: `sw.js`。** `const VERSION = '2026-11-03-1'; const CACHE_NAME = 'rika-quest-' + VERSION;`。install で `./`, `index.html`, `css/style.css`, `js/*.js`（列挙）, `content/light.js`, `manifest.webmanifest` を addAll し、`self.skipWaiting()`。activate で `rika-quest-` で始まる他のキャッシュを削除し `clients.claim()`、その後 全クライアントに `postMessage({ type: 'offline-ready', version: VERSION })`。fetch: `request.mode === 'navigate'` なら `caches.match('index.html')`、それ以外の同一オリジンはキャッシュ優先、なければネット（取れたらキャッシュに入れる）。更新の手順は README に書く: ファイルを変えたら `VERSION` を上げる。次回オンラインで開いたときに新しい SW が入り、古いキャッシュが消える（記録は localStorage なので残る）。
- [ ] **Step 2: 登録と表示。** `index.html` で `location.protocol` が http/https かつ `'serviceWorker' in navigator` のときだけ `register('sw.js')`。`navigator.serviceWorker.addEventListener('message')` で `offline-ready` を受けたら `app.offline = { state: 'ready', version, at }` に入れ、`localStorage['rika-quest:offline']` にも try/catch つきで書く（書けなくても続行）。`register` が失敗したら `app.offline = { state: 'failed' }`。設定画面は `app.offline` を優先し、なければ localStorage を try/catch つきで読み、「オフラインで使える: 光の世界（版 …、済）」「準備中」「オフライン対応を準備できませんでした」「この開き方（file://）ではオフライン対応は使えません」のいずれかを表示（`caches` API や localStorage がなくても落ちない）。
- [ ] **Step 3: 確認。** `python -m http.server 8765` で `http://127.0.0.1:8765/` を開いて一度読み込み、設定画面が「済」になる → DevTools の Network を Offline → `/` と `/index.html` の両方でリロードしてアプリと教材が動き、解答と XP が記録される → Online に戻して記録が残っている。`VERSION` を変えて再読み込みすると新しい版になり記録が残る。`file://` で開くと注意文が出て SW 登録エラーが出ない。
- [ ] **Step 4: Commit** — `git commit -m "オフライン対応（Service Worker と manifest）"`

---

### Task 15: 仕上げと全体レビュー

- [ ] **Step 1: 幅 768px と 375px で全画面を見て崩れを直す。** ray-draw と drag の対象が 44px 以上であることを DevTools で測る。
- [ ] **Step 2: `README.md` を実物に合わせて更新。** 検証項目 1〜6 の確かめ方を書く。
- [ ] **Step 3: `npm test` 全件成功を確認。**
- [ ] **Step 4: Codex レビュー（CLAUDE.md の流れ: round1 → 対応 → round2）。** `powershell -NoProfile -ExecutionPolicy Bypass -File tools/codex-review.ps1 -Round 1 -Note "試作1 全体"`
- [ ] **Step 5: Commit** — `git commit -m "試作1 仕上げ"`

---

## 実行の仕方（この計画固有）

- 実装タスクはサブエージェント（model: opus）に 1 タスクずつ渡す。各タスクの前に `.ai-tasks/YYYYMMDD-HHMMSS_<task>.md` に指示書（このタスクの節をそのまま＋共通データの形）を置く。
- 各タスクの後のレビューは Codex（`tools/codex-review.ps1 -Round 1 -Target "<files>"`）。Codex が使えないときは実装に関わっていない Claude サブエージェント（model: opus）が同じ形式で `.ai-review/..._roundN_claude.md` に書く。
- Task 8 と Task 9 は互いのデータ形に依存するため、Task 9 を先に、または同じ実装者で続けて行う。Task 10 は Task 9 の後。
- Task 11 以降（画面）はテストがないので、各タスクの Step「ブラウザで確認」を Claude Code 自身が行う（`.claude/launch.json` の `rika` で起動）。
