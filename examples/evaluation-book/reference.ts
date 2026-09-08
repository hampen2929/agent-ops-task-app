import type { Recurrence } from "./types.ts";
import { assertDate, validateRecurrence, nextDueDate } from "./recurrence.ts";

/** Future dates exclude the origin; count includes it, until is inclusive,
 * and the original monthly anchor survives short months. Validate before returning. */
export function previewDueDates(dueDate: string, recurrence: Recurrence, limit: number): string[] {
  assertDate(dueDate, "dueDate");
  const rule = validateRecurrence(recurrence);
  if (!Number.isInteger(limit) || limit < 0 || limit > 100) throw new Error("invalid limit");
  if (rule.until !== undefined && rule.until < dueDate) throw new Error("until precedes dueDate");
  const anchor = Number(dueDate.slice(8, 10));
  const dates: string[] = [];
  let current = dueDate;
  while (dates.length < limit && (rule.count === undefined || dates.length + 1 < rule.count)) {
    const next = nextDueDate(current, rule, anchor);
    if (next === undefined) break;
    dates.push(next);
    current = next;
  }
  return dates;
}
