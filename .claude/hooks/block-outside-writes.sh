#!/bin/bash
# プロジェクトディレクトリの外への書き込みをブロックするPreToolUseフック
# 『Claude Code本番運用ガイド』「ガードレール」の章を参照
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

# 絶対パスに正規化して、プロジェクト配下かを検査
abs=$(cd "$(dirname "$file_path")" 2>/dev/null && pwd)/$(basename "$file_path")
case "$abs" in
  "$CLAUDE_PROJECT_DIR"/*) exit 0 ;;
  *)
    jq -n --arg p "$abs" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("プロジェクト外への書き込みをブロック: " + $p)
      }
    }'
    ;;
esac
