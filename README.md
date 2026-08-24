# agent-ops-task-app

AIエージェント（Claude Code）をCI/CDに組み込み、無人で運用するためのリファレンス実装です。
Zenn本『Claude Code本番運用ガイド — CI/CDに組み込む自律エージェント設計』（刊行予定: https://zenn.dev/hampen2929/books/claude-code-production-guide ）の最終章で、このリポジトリを通しで解説しています。

題材は架空のタスク管理アプリ（TypeScript・ランタイム依存ゼロ）。アプリはあえて平凡に作ってあります。主役はアプリではなく、それを取り囲むエージェント運用の仕組みです。

## 何が入っているか

| 場所 | 中身 |
| --- | --- |
| `src/` `tests/` | タスク管理アプリ本体（型チェック・テスト・lintの検出シグナル3層つき） |
| `.claude/` | エージェントの権限境界（permissions deny）とPreToolUseフック |
| `.github/prompts/` | ジョブ用プロンプト（契約書として書かれた指示） |
| `.github/schemas/` | 出力契約（JSON Schema。機械処理は `structured_output` のみ） |
| `.github/agents.json` | 役割定義（planner / fixer / reviewer） |
| `.github/workflows/` | 5本のワークフロー（下表） |
| `scripts/` | 受理率などの決定的な集計スクリプト |

| ワークフロー | 役割 | 権限 |
| --- | --- | --- |
| `nightly-triage.yml` | 夜間の一次調査（失敗ログの原因分析） | 読み取りのみ |
| `nightly-typefix.yml` | 型エラーの自律修正 → 検証 → PR | 書き込みあり（PR経由のみ） |
| `issue-triage.yml` | 新規Issueへの見立てコメント | 読み取り+コメント |
| `ai-review.yml` | PRの観点ベース一次レビュー | 読み取り+レビュー |
| `weekly-metrics.yml` | 受理率の週次集計（AI不使用） | 読み取りのみ |

## 動かすまで

1. このリポジトリをテンプレートとして自分のアカウントに作成する
2. リポジトリの Secrets に `ANTHROPIC_API_KEY` を登録する（組織ではOIDC連携を推奨。本の「企業環境への導入」の章を参照）
3. `ai-generated` ラベルを作成する
4. mainのブランチ保護（必須レビュー1名以上）と、Settings → Actions → General → 「Allow GitHub Actions to create and approve pull requests」を有効にする
5. まず読み取り専用ジョブ（`nightly-triage` / `issue-triage`）を `workflow_dispatch` で手動実行し、サマリーとコストを確認する
6. 1〜2週間、`weekly-metrics` の数字とコストを観察してから、書き込みジョブ（`nightly-typefix`）を有効化する

手順5〜6を飛ばさないでください。読み取り専用の観察期間に得られるコスト実測と出力の傾向が、書き込みを任せる判断の根拠になります（本の全体で繰り返される「信頼の階段」です）。

## 安全上の注意

- ワークフローはフォークからのPRでは動かない設計です（`ai-review.yml` の same-repo ガード）。この線を外さないでください
- エージェントのステップに不要なシークレットを渡さないでください。`GH_TOKEN` は投稿・PR作成ステップにのみ渡しています
- 権限・上限・検証ゲートの設計意図は本の各章に対応しています。変更する場合は、何の守りを外すことになるかを本で確認してから変更してください

## ライセンス

MIT
