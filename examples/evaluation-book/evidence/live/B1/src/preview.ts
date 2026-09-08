import { assertDate, nextDueDate, validateRecurrence } from "./recurrence.ts";
import type { Recurrence } from "./types.ts";

const MAX_LIMIT = 100;

/**
 * dueDateを1件目（occurrence 1）として、それに続く期限を最大limit件返す。
 * dueDate自身は含めない。countは1件目を含む総数、untilは当日を含む上限。
 * 月次は元の日をアンカーとして保持し、短い月をまたいでも日を復元する。
 * limitは0〜100の整数。limitが0でも入力は検証する。
 * 不正入力（dueDate・recurrence・limit、dueDateより前のuntil）は例外にする。
 * 対応日付範囲の超過はnextDueDateの例外がそのまま伝播する。
 */
export function previewDueDates(dueDate: string, recurrence: Recurrence, limit: number): string[] {
  assertDate(dueDate, "dueDate");
  const rule = validateRecurrence(recurrence);
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 0 to ${MAX_LIMIT}`);
  }
  if (rule.until !== undefined && rule.until < dueDate) {
    throw new Error("invalid recurrence until: must not be earlier than dueDate");
  }

  // countは1件目（dueDate自身）を含むため、後続として返せるのは count - 1 件。
  const wanted = rule.count === undefined ? limit : Math.min(limit, rule.count - 1);
  const anchorDay = Number(dueDate.slice(8, 10));
  const dates: string[] = [];
  let cursor = dueDate;
  while (dates.length < wanted) {
    const next = nextDueDate(dueDate, rule, anchorDay, cursor);
    if (next === undefined) break;
    dates.push(next);
    cursor = next;
  }
  return dates;
}
