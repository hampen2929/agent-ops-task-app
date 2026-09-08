import type { Recurrence } from "./types.ts";

import { assertDate, nextDueDate, validateRecurrence } from "./recurrence.ts";

const MAX_LIMIT = 100;

/**
 * dueDateより後の期限をlimit件まで先読みする。dueDate自身は含めない。
 * dueDateは1件目の発生として数えるため、countがnの場合の生成数は最大n-1件。
 * 月次では元の日をanchorDayとして毎回渡し、短い月をまたいでも元の日に戻す。
 * untilは当日を含む。limitは0〜100の整数で、limitが0でも入力は検証する。
 */
export function previewDueDates(dueDate: string, recurrence: Recurrence, limit: number): string[] {
  // 早期returnより前に、全ての入力を検証する。
  assertDate(dueDate, "dueDate");
  const rule = validateRecurrence(recurrence);
  if (rule.until !== undefined && rule.until < dueDate) throw new Error("until must not precede dueDate");
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 0 to ${MAX_LIMIT}`);
  }

  const anchorDay = Number(dueDate.slice(8, 10));
  const result: string[] = [];
  // dueDateを起点に固定し、直前の結果をafterとして進めることで周期のずれを防ぐ。
  let after = dueDate;
  let occurrence = 1;
  while (result.length < limit && (rule.count === undefined || occurrence < rule.count)) {
    const next = nextDueDate(dueDate, rule, anchorDay, after);
    if (next === undefined) break;
    result.push(next);
    after = next;
    occurrence += 1;
  }
  return result;
}
