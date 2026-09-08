import type { Recurrence } from "./types.ts";

import { assertDate, nextDueDate, validateRecurrence } from "./recurrence.ts";

const MAX_LIMIT = 100;

/**
 * dueDateを1回目として、それに続く期限を最大limit件返す。
 * dueDate自身は含めない。countは1回目を含む総数、untilは当日を含む上限。
 * 月次では元の日をanchorDayとして引き継ぐ。limitは0〜100の整数。
 * 日付・規則の検証はlimitが0でも行い、untilが初回期限より前なら例外にする。
 */
export function previewDueDates(dueDate: string, recurrence: Recurrence, limit: number): string[] {
  assertDate(dueDate, "dueDate");
  const rule = validateRecurrence(recurrence);
  if (rule.until !== undefined && rule.until < dueDate) {
    throw new Error("until must not precede dueDate");
  }
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 0 to ${MAX_LIMIT}`);
  }

  // countは1回目（dueDate自身）を含むため、以降に出せるのは count - 1 件まで。
  const remaining = rule.count === undefined ? limit : Math.min(limit, rule.count - 1);
  const anchorDay = Number(dueDate.slice(8, 10));
  const result: string[] = [];
  let current = dueDate;
  while (result.length < remaining) {
    const next = nextDueDate(current, rule, anchorDay);
    if (next === undefined) break; // untilに到達した。
    result.push(next);
    current = next;
  }
  return result;
}
