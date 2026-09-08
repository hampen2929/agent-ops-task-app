# AIエージェント評価教材

Node.js 24系、Python 3.10以降。開始版は公開サンプル `hampen2929/agent-ops-task-app` の `de86518900a80515794de9b04c924956c6b66f95`。

公開サンプル内では本ディレクトリを `examples/evaluation-book/` に配置する。以下はその配置でリポジトリ直下から実行する。

```bash
npm ci
npm run typecheck
npm test
npm run lint
node examples/evaluation-book/lab.mjs . evaluation-results
```

`lab.mjs` はモデルを呼ばない。故障六種と正しい実装を検査する。v1の誤合格6/6、v2の誤合格0/6・誤不合格0/2を期待する。これは既知の故障の検出実験であり、エージェントの成功率ではない。

保存したライブ成果物の再評価:

```bash
mkdir -p /tmp/evaluation-replay
cp src/recurrence.ts src/types.ts /tmp/evaluation-replay/
cp examples/evaluation-book/evidence/live/A1/src/preview.ts /tmp/evaluation-replay/
node examples/evaluation-book/grade.mjs /tmp/evaluation-replay/preview.ts
```

ライブ実行は認証済みClaude Codeが必要。次のコマンドは6回の実モデル呼び出しを行い、各180秒・CLI費用上限1米ドルを設定する。費用報告はAPI価格換算であり、購読契約の実請求額ではない。実行前に自分の契約・利用枠を確認する。ツールとホストを強く隔離するサービスではないため、信頼できない入力にはそのまま使わない。

```bash
python3 examples/evaluation-book/run-agents.py "$PWD" /tmp/my-evaluation-trials --live
```

既存の同名record.jsonはスキップする。独立した再実験には新しい出力ディレクトリを指定する。ライブ実行は共有依存を参照するローカル教材。確認用ケースへのアクセス防止を技術的に強制した隔離実験ではない。CLI既定モデルの解決結果を保存するため、将来同じモデルになる保証はない。

## 記録の区別

- `evidence/grader-report.json`: 故障注入。モデル呼び出しなし。
- `evidence/live/`: 1課題、A/B各3回、合計6回のClaude Code実装試行。モデル選択はCLI既定。生成したソース・追加テスト、CLI最終JSON、外側で実行した検査、設定ファイルの事後照合を保存。
- `evidence/live-summary.json`: 上記6回の集計。
- `evidence/judge-*`: 作者が作った4報告をツールなしでLLM評価した記録。実装試行の報告を直接評価したものではない。人間較正は別途記録がある場合のみ成立する。

最終JSONには完全なツール逐次履歴がない。試行内の修正回数やツール順の精密な分析には使えない。ケース通過率と課題成功率を区別する。公開記録のローカル一時パスは実行時の位置を示すだけで、読者の必須パスではない。
