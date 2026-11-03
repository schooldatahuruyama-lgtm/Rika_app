# 理科クエスト（試作1 開発中）

中学校理科の e-learning Web アプリ（試作）です。生徒がブラウザで問題に取り組み、学習の記録が手元に残ります。

**現在は試作1の開発中で、アプリ本体（`index.html` など）はまだありません。** 今あるのは開発の土台（開発ルール、Codex 用のスクリプト、資料）だけです。

## 使い方（アプリができたあと）

- `index.html` をダブルクリックして Chrome または Edge で開く（インストールもネット接続も不要）。
- オフライン対応（Service Worker）を効かせたいときは、このフォルダで次を実行し、http://127.0.0.1:8765/ を開く。
  ```
  python -m http.server 8765 --bind 127.0.0.1
  ```

## 資料

- 要件定義書: [docs/requirements.md](docs/requirements.md)（原本は `理科クエスト_要件定義書_v0.1.md`）
- 設計書: [docs/superpowers/specs/2026-11-03-rika-quest-design.md](docs/superpowers/specs/2026-11-03-rika-quest-design.md)
- 試作1 の実装計画: [docs/superpowers/plans/2026-11-03-rika-quest-prototype1.md](docs/superpowers/plans/2026-11-03-rika-quest-prototype1.md)

## 開発

- テスト: `npm test`（Node.js 18 以上。追加のインストールは不要。`tests/` にテストができたら実行できる）
- 開発の進め方（Claude Code が設計、通常はサブエージェント（Opus など）が実装、Codex がレビュー。サブエージェントが使えないときは Claude Code 本体や Codex が実装を代行）: [CLAUDE.md](CLAUDE.md)、[AGENTS.md](AGENTS.md)
- アプリから書き出した記録（`rika-quest-*.json`）や `samples/` の資料は Git に入りません。
