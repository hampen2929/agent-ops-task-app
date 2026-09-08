import type { Recurrence } from "./types.ts";
import { assertDate, nextDueDate, validateRecurrence } from "./recurrence.ts";

const MAX_LIMIT = 100;

/**
 * dueDateに続く期限をlimit件まで先読みする。dueDate自身は1件目の発生として除外する。
 * countはdueDateを含む総数なので、返す件数は最大でcount-1件。untilは当日を含む。
 * 月次では元の日をanchorDayとして渡し、短い月をまたいでも日付が縮まないようにする。
 * limitは0〜100の整数。範囲外や不正な入力、untilがdueDateより前の場合は例外にする。
 */
export function previewDueDates(dueDate: string, recurrence: Recurrence, limit: number): string[] {
  assertDate(dueDate, "dueDate");
  const rule = validateRecurrence(recurrence);
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 0 to ${MAX_LIMIT}`);
  }
  if (rule.until !== undefined && rule.until < dueDate) {
    throw new Error("recurrence until must not be earlier than dueDate");
  }

  const anchorDay = Number(dueDate.slice(8, 10));
  // dueDateを起点に固定し、直前の結果をafterとして進めることで周期のずれを防ぐ。
  const remaining = rule.count === undefined ? limit : Math.min(limit, rule.count - 1);
  const result: string[] = [];
  let after = dueDate;
  while (result.length < remaining) {
    const next = nextDueDate(dueDate, rule, anchorDay, after);
    if (next === undefined) break;
    result.push(next);
    after = next;
  }
  return result;
}
