# agent-ops-task-app

タスク管理アプリ（TypeScript・依存ゼロ）。『Claude Code本番運用ガイド』のリファレンス実装。

## コマンド

- 型チェック: `npm run typecheck`
- テスト: `npm test`
- lint: `npm run lint`
- 起動: `npm start`（Node 20+、`--experimental-strip-types` 使用）

## 設計の前提

- ランタイム依存ゼロ（`node:http` のみ）。devDependencies は TypeScript / Vitest / ESLint だけ
- ストアはインメモリ（`src/store.ts`）。永続化は意図的に持たない
- strict TypeScript。`any`・`@ts-ignore`・`@ts-expect-error` の追加は禁止
- 通知（`src/notify.ts`）は本文の組み立てまで。送信は行わない

## 変更のルール

- 振る舞いを変える変更には、対応するテストを追加・修正する
- テストの期待値を変更してエラーを消さない
- エラーを設定変更（tsconfig / eslint）で黙らせない
