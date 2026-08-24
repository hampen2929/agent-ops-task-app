import type { Task } from "./types.ts";
import { TaskStore } from "./store.ts";

/**
 * 日次ダイジェストの本文を組み立てる。
 * 通知の送信自体は行わない（送信は呼び出し側の責務）。
 */
export function buildDailyDigest(store: TaskStore, today: string): string {
  const open = store.list({ status: "open" });
  const overdue = store.overdue(today);
  const dueToday = open.filter((t) => t.dueDate === today);

  const lines: string[] = [`# タスクダイジェスト (${today})`];
  lines.push(`- 未完了: ${open.length}件`);
  lines.push(`- 今日が期限: ${dueToday.length}件`);
  lines.push(`- 期限切れ: ${overdue.length}件`);

  if (overdue.length > 0) {
    lines.push("");
    lines.push("## 期限切れ");
    for (const task of overdue) {
      lines.push(formatLine(task));
    }
  }
  return lines.join("\n");
}

function formatLine(task: Task): string {
  const due = task.dueDate === undefined ? "" : ` (期限: ${task.dueDate})`;
  return `- ${task.title}${due}`;
}
