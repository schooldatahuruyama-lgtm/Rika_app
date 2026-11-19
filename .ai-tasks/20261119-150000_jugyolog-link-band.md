# 実装指示書: 授業ログのログインを読み、つながりの帯を出す（段階 2a）

あなた（Codex）は、この指示書に沿ってコードを書きます。進め方は `AGENTS.md` の「実装を頼まれたとき」のとおりです。

## 目的

理科クエストを、授業ログ（別のアプリ。同じ住所 `https://schooldatahuruyama-lgtm.github.io/` の `/jugyo-log/`）のアカウントとつなぐ計画の、最初の一歩（段階 2a）。先生の決定（2026-11-19）:

- アプリは別のまま、ログインと記録の置き場所だけ 1 つにする。
- ログインなしでも、今までどおり使える。そのときは「この端末だけ」と帯で知らせる。

この段階で作るのは、**授業ログのログインを読んで確かめ、画面の上に帯を出す**所まで。**記録の保存先は変えない**（今までどおり localStorage の `rika-quest:v1` だけ）。Firebase のデータベースには、まだ何も読み書きしない。

背景: 授業ログは、ログインを localStorage の `jugyolog:auth` に `{"uid":"…","refreshToken":"…","email":"…"}`（`email` は無いこともある）の JSON で保存している。2 つのアプリは同じ住所の下にあるので、理科クエストからも読める。

## 変えるファイルと内容

### 1. `js/config.js`

`api` に足す（コメントも付ける）:

```js
// 授業ログ（別のアプリ）とのつながり。apiKey は授業ログの Firebase の公開してよい値（鍵ではない）。
// 授業ログのログイン（localStorage の jugyolog:auth）は読むだけで、書きかえない
link: {
  authKey: 'jugyolog:auth',
  apiKey: 'AIzaSyCW_I68hG8F41aVs7cm673af9GnV2Hwkp0',
  tokenUrl: 'https://securetoken.googleapis.com/v1/token',
  jugyoUrl: 'https://schooldatahuruyama-lgtm.github.io/jugyo-log/',
  timeoutMs: 10000,
  recheckMs: 60000,
},
```

### 2. `js/link.js`（新しく作る。ほかの `js/*.js` と同じ形: IIFE、`module.exports` と `root.RikaQuest.link` の両方）

DOM は使わない。`fetch`・`setTimeout`・保存場所は引数で受け取る（テストで偽物を渡せるように）。

- `readSaved(storageObj, key)` → `{ uid, refreshToken }` または `null`。
  - `getItem` が例外・`null`・空・JSON でない・オブジェクトでない・`uid` や `refreshToken` が空でない文字列でない → `null`。
  - **書かない・消さない**（`setItem`・`removeItem` を呼ばない）。
- `createLink({ storage, fetch, config, now, setTimeout, clearTimeout })` → 次を持つもの:
  - `status()` → `'none' | 'checking' | 'ok' | 'unknown' | 'expired'`
    - `none`: 授業ログのログインが保存されていない
    - `checking`: 確かめている途中（まだ 1 回も結果が出ていないとき）
    - `ok`: 確かめられた
    - `unknown`: 通信できない・サーバーの不調などで、確かめられなかった
    - `expired`: ログインが無効だと分かった
  - `uid()` → `ok` のときだけ文字列。ほかは `null`。
  - `check({ force })` → Promise（必ず解決する。例外で失敗しない）。解決の値は、終わったときの `status()`。
    1. `readSaved` が `null` → `none` にして終わり（通信しない）。
    2. 保存の `uid` と `refreshToken` が、前に結果が出たときと同じで、前の結果が `ok` で、`force` でなく、前の確認から `recheckMs` たっていない → 通信せず、そのまま。
    3. それ以外 → `tokenUrl + '?key=' + encodeURIComponent(apiKey)` へ `POST`。ヘッダー `Content-Type: application/x-www-form-urlencoded`、本文 `grant_type=refresh_token&refresh_token=<encodeURIComponent した値>`。`timeoutMs` で打ち切る（`AbortController` があれば使う）。
    4. 結果の決め方:
       - 200 で、本文の JSON の `user_id` が保存の `uid` と同じ、`id_token` が空でない文字列 → `ok`。`id_token` と期限はメモリにだけ持つ（この段階では使わない。保存しない）。
       - 200 だが `user_id` がちがう・項目が足りない・JSON でない → `unknown`。
       - 400 で、本文の `error.message` が `TOKEN_EXPIRED`・`USER_DISABLED`・`USER_NOT_FOUND`・`INVALID_REFRESH_TOKEN`・`MISSING_REFRESH_TOKEN` のどれか → `expired`。
       - そのほかの HTTP の状態・通信の失敗・時間切れ → `unknown`。
    5. 通信の途中で保存の中身（`uid` か `refreshToken`）が変わっていたら、その結果は捨てて、新しい中身でもう一度確かめる（やり直しは 1 回の `check` につき 1 回まで。それでも変わっていたら `unknown`）。
    6. 同時に呼ばれたら、通信は 1 本にまとめる（進行中の Promise を返す）。
  - `onChange(fn)` → `status()` が変わるたびに `fn(status)` を呼ぶ。登録を外す関数を返す。`fn` の中の例外は握りつぶして `console.error`。
- **守ること**: `refreshToken`・`id_token` を、`console`・例外の文・URL・localStorage・画面のどこにも出さない。`tokenUrl` のほかへ送らない。返事に新しい `refresh_token` が入っていても、`jugyolog:auth` を書きかえない。

### 3. `index.html`

- `<header class="app-header">` のすぐ下（`<div class="notices">` の前）に足す:

  ```html
  <!-- 授業ログとのつながり（js/link.js が確かめ、js/app.js が出す） -->
  <div id="link-band" class="link-band" role="status" hidden></div>
  ```

- `<script src="js/live-db.js"></script>` の次の行に `<script src="js/link.js"></script>` を足す。

### 4. `sw.js`

- `PRECACHE` の `'js/live-db.js'` の次に `'js/link.js'` を足す（`index.html` と同じ並び。`tests/offline.test.js` が確かめる）。
- `VERSION` を `'2026-11-19-01'` にする。

### 5. `js/app.js`

- `start()` の中（`setupOffline()` のあと、`go(...)` の前）で `RQ.link.createLink(...)` を作り、`state.link` に入れる。`storage` は `state.storageObj`、`fetch` は `root.fetch` があれば `bind` したもの（無ければ、いつも失敗する関数）、`config` は `state.config.link`。`RQ.link` や `state.config.link` が無いときは、帯を出さずに何もしない（今までどおり動く）。
- `updateLinkBand()` を作り、`onChange` と最初の 1 回で呼ぶ。`#link-band` の中身を `replaceChildren` で作り直す。帯の箱には `data-no-ruby` を付けない（ふりがなを付けてよい）。

  | status | クラス | 文 | リンク |
  |---|---|---|---|
  | `none` | `link-band is-off` | ログインしていません。記録は、この端末の中だけに残ります。 | 「授業ログにログインする」 |
  | `checking` | `link-band is-off` | 授業ログとのつながりを確かめています… | なし |
  | `ok` | `link-band is-ok` | 授業ログのアカウントで つながっています。記録は、まだこの端末の中だけに残ります。 | 「授業ログへもどる」 |
  | `unknown` | `link-band is-wait` | 通信できないので、授業ログとのつながりを確かめられません。学習は、このまま続けられます。 | 「授業ログへもどる」 |
  | `expired` | `link-band is-off` | 授業ログのログインが切れています。記録は、この端末の中だけに残ります。 | 「授業ログでログインし直す」 |

  - リンクは `<a class="link-band-link" href="(config.link.jugyoUrl)">`。同じタブで開く（`target` なし）。
  - 文は `<span class="link-band-text">`。
  - `hidden` を外すのは、中身を入れたあと。
- 確かめ直すとき: `start()` で 1 回。`root` の `online` イベント、`document` の `visibilitychange`（`visible` になったとき）、`root` の `storage` イベント（`event.key` が `config.link.authKey` か `null` のとき）で `check()` を呼ぶ（`storage` のときは `{ force: true }`）。
- **`clearAll`（「すべて削除」）は変えない。`jugyolog:auth` を消さない。**
- 学習の進行・保存・ほかの画面は変えない。

### 6. `css/style.css`

- `.link-band`: 横並び（`display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px;`）、`padding: 6px 16px`、`font-size: 14px`、`line-height: 1.5`。中身は `.header-inner` と同じ最大幅でそろえなくてよい（帯は画面の幅いっぱい）。
- `.link-band.is-ok { background: #E3F5EA; color: #14694B; }`、`.is-wait { background: #FFF3D6; color: #6B5200; }`、`.is-off { background: #F1F2F6; color: #3A4353; }`（テーマの色では変えない）。
- `.link-band-link`: 文字の色は `inherit`、下線あり、太字。押せる所の高さを 44px 以上にする（`display: inline-flex; align-items: center; min-height: 44px;`）。
- 幅 375px でも、文とリンクが折り返して読めること（横にはみ出さない）。

### 7. `content/readings.js`

- 帯の文で、ふりがなの辞書に無い漢字の語があれば足す（`node tools/ruby-missing.js` で確かめる。README の「ふりがなの辞書を増やす」のとおり）。`tests/ruby.test.js` が通ること。

### 8. `README.md`

- 「記録について（大事）」の節の先頭に 1 段落足す:「授業ログ（別のアプリ）にログインしてから開くと、画面の上の帯に『授業ログのアカウントで つながっています』と出ます。今はつながりを確かめるだけで、記録は今までどおりこの端末のブラウザの中だけに残ります（アカウントへの保存は、次の段階で作ります）。」

## 端の場合

- 不正な入力: `jugyolog:auth` が JSON でない・配列・数字・`uid` が数字や空・`refreshToken` が無い・とても長い文字列 → `none`（長い文字列でも形が合えば、そのまま送ってよい）。返事が JSON でない・`user_id` が別の人・`id_token` が無い → `unknown`。`config.link` が無い・`apiKey` や `tokenUrl` が空 → 帯を出さない。
- 重複と境界: `check()` が同時に何回呼ばれても、通信は 1 本。`recheckMs` ちょうどのときは確かめ直す。確かめている途中でログアウトされた（保存が消えた）→ `none`。途中で別の人がログインした → 新しい人で確かめ直す。
- 違反や失敗の見せ方: 確かめられないときは黄色の帯、切れているときと未ログインは灰色の帯で、文で知らせる。確かめの失敗で学習を止めない。トースト（`message`）は出さない。帯はどの画面でも出す。

## テスト

- `tests/link.test.js`（新しく作る。ほかのテストと同じ書き方）:
  - `readSaved`: 上の不正な入力がすべて `null`。正しい形で `{ uid, refreshToken }`。`setItem`・`removeItem` が 1 回も呼ばれないこと。
  - `check`: 保存なし → `none` で `fetch` が呼ばれない。200 で一致 → `ok`、`uid()` が返る。`user_id` ちがい → `unknown`。400 の 5 つの理由 → `expired`。400 のほかの理由・500・`fetch` の例外・時間切れ → `unknown`。
  - 送る内容: URL が `tokenUrl?key=…`、`POST`、本文が `grant_type=refresh_token&refresh_token=…`（記号はエンコードされている）。URL に `refreshToken` が入っていないこと。
  - 同時に 3 回呼んで `fetch` が 1 回。`ok` のあと `recheckMs` 未満は通信しない、以上と `force` は通信する。
  - 途中で保存が変わる（別の人）→ 新しい人でやり直して `ok`。途中で保存が消える → `none`。
  - `onChange` が変わったときだけ呼ばれ、外す関数で止まること。
  - どの場合も `storage.setItem`・`removeItem` が呼ばれないこと。返事に新しい `refresh_token` があっても同じ。
- `tests/config.test.js` に、`link` の項目（文字列・正の数、`tokenUrl` と `jugyoUrl` が `https://`）の確かめを足す。
- `tests/offline.test.js`・`tests/ruby.test.js` をふくめ、`npm test` がすべて成功すること。

## 守ること

- `git add`・`git commit` はしない。パッケージを足さない。
- 上に書いたファイルのほかは変えない（とくに `js/storage.js`・`js/record.js`・`js/live*.js`・`js/teacher*.js`・`content/` の教材・`docs/`）。
- このフォルダの外（となりの `授業ログアプリ` をふくむ）は読まない・変えない。
- 既存のコードの書き方（IIFE、`'use strict'`、コメントの量と言語、`const api = {...}` の形）に合わせる。

## 報告

変更したファイル、テストの結果、指示書と違う点を、日本語の Markdown で報告する。
