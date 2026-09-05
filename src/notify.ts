import { addCalendarDays, assertDate } from "./recurrence.ts";
import type { Task } from "./types.ts";
import { TaskStore } from "./store.ts";

/**
 * 日次ダイジェストの本文を組み立てる。
 * 通知の送信自体は行わない（送信は呼び出し側の責務）。
 */
export function buildDailyDigest(store: TaskStore, today: string, withinDays = 3): string {
  assertDate(today, "today");
  if (!Number.isInteger(withinDays) || withinDays < 0 || withinDays > 365) {
    throw new Error("withinDays must be an integer from 0 to 365");
  }
  // 日付上限を越える窓は、扱える最終日までに制限する。
  const remainingDays = (Date.parse("9999-12-31T00:00:00.000Z") - Date.parse(`${today}T00:00:00.000Z`)) / 86_400_000;
  const end = addCalendarDays(today, Math.min(withinDays, remainingDays));
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
  lines.push("", `## 今後${withinDays}日以内が期限`);
  const upcoming = open.filter((task) => task.dueDate !== undefined && task.dueDate > today && task.dueDate <= end);
  lines.push(...(upcoming.length > 0 ? upcoming.map(formatLine) : ["- なし"]));
  return lines.join("\n");
}

function formatLine(task: Task): string {
  const due = task.dueDate === undefined ? "" : ` (期限: ${task.dueDate})`;
  return `- ${task.title}${due}`;
}
