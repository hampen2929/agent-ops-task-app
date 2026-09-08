import { assertDate, nextDueDate, validateRecurrence } from "./recurrence.ts";
import type { Recurrence } from "./types.ts";

const MAX_LIMIT = 100;

/**
 * dueDateの次回以降の期限を最大limit件返す（dueDate自身は含まない）。
 * dueDateを1回目としてcountを数え、monthlyでは元の日をanchorDayとして保つ。
 * untilは当日を含む。limitが0やcountが1でも入力の検証は行う。
 * 不正な入力や対応日付範囲超過はrecurrenceヘルパーの例外をそのまま伝える。
 */
export function previewDueDates(dueDate: string, recurrence: Recurrence, limit: number): string[] {
  assertDate(dueDate, "dueDate");
  // 呼び出し元の規則を書き換えないよう、検証済みのコピーだけを使う。
  const rule = validateRecurrence(recurrence);
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 0 to ${MAX_LIMIT}`);
  }
  if (rule.until !== undefined && rule.until < dueDate) {
    throw new Error("recurrence until must not be earlier than dueDate");
  }

  // dueDateが1回目なので、生成できるのは残りcount-1件。
  const remaining = rule.count === undefined ? limit : Math.min(limit, rule.count - 1);
  const anchorDay = Number(dueDate.slice(8, 10));
  const dates: string[] = [];
  let current = dueDate;
  while (dates.length < remaining) {
    const next = nextDueDate(current, rule, anchorDay, current);
    if (next === undefined) break;
    dates.push(next);
    current = next;
  }
  return dates;
}
