import type { Recurrence } from "./types.ts";

import { assertDate, nextDueDate, validateRecurrence } from "./recurrence.ts";

const MAX_LIMIT = 100;

/**
 * dueDateに続く将来の期限を最大limit件返す。dueDate自身は含まない。
 * dueDateを1回目として数えるため、countがある場合の生成上限はcount-1件。
 * 月次では元の日をanchorDayとして渡し、短い月をまたいでも日付を維持する。
 * untilは当日を含み、そこで打ち切る。untilがdueDateより前なら例外にする。
 * limitは0〜100の整数。入力の検証はlimitが0でも必ず行い、recurrenceは変更しない。
 */
export function previewDueDates(dueDate: string, recurrence: Recurrence, limit: number): string[] {
  assertDate(dueDate, "dueDate");
  const rule = validateRecurrence(recurrence);
  if (rule.until !== undefined && rule.until < dueDate) throw new Error("until must not precede dueDate");
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 0 to ${MAX_LIMIT}`);
  }

  const anchorDay = Number(dueDate.slice(8, 10));
  const wanted = rule.count === undefined ? limit : Math.min(limit, rule.count - 1);
  const result: string[] = [];
  let after = dueDate;
  while (result.length < wanted) {
    // 起点は常に元のdueDateにして、周期の丸め誤差が積み上がらないようにする。
    const next = nextDueDate(dueDate, rule, anchorDay, after);
    if (next === undefined) break;
    result.push(next);
    after = next;
  }
  return result;
}
