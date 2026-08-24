#!/usr/bin/env bash
# AI生成PRの受理率を集計する（『Claude Code本番運用ガイド』「品質評価」の章）
set -euo pipefail

# GNU date (Linux/CI) と BSD date (macOS) の両対応
since="${1:-$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)}"

merged=$(gh pr list --label ai-generated --state merged \
  --search "merged:>=$since" --json number --jq 'length')
closed=$(gh pr list --label ai-generated --state closed \
  --search "closed:>=$since -is:merged" --json number --jq 'length')
total=$((merged + closed))

if [ "$total" -eq 0 ]; then
  echo "対象PRなし（過去7日・ai-generatedラベル）"
  exit 0
fi
rate=$(awk "BEGIN{printf \"%.0f\", $merged/$total*100}")
echo "受理率(過去7日): ${rate}% (${merged}/${total} マージ)"
