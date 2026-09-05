import type { Recurrence } from "./types.ts";

const DAY_MS = 86_400_000;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** 0001-01-01〜9999-12-31の実在する暦日かを判定する。 */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** 暦日の契約を満たさない入力は、引数名を添えて例外にする。 */
export function assertDate(value: unknown, label: string): asserts value is string {
  if (!isValidDate(value)) throw new Error(`invalid ${label}: expected a real YYYY-MM-DD date`);
}

function epoch(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

/** UTCの暦日を指定日数進める。対応日付範囲を超えたら例外にする。 */
export function addCalendarDays(date: string, days: number): string {
  assertDate(date, "date");
  if (!Number.isSafeInteger(days)) throw new Error("days must be a safe integer");
  const next = new Date(epoch(date) + days * DAY_MS);
  if (!Number.isFinite(next.getTime())) throw new Error("date exceeds supported range");
  const result = next.toISOString().slice(0, 10);
  if (!isValidDate(result)) throw new Error("date exceeds supported range");
  return result;
}

/** 規則の型・キー・値域を検証し、呼び出し元から独立したコピーを返す。 */
export function validateRecurrence(value: unknown): Recurrence {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("recurrence must be an object");
  }
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !["frequency", "interval", "count", "until"].includes(key))) {
    throw new Error("unknown recurrence field");
  }
  const frequency = data["frequency"];
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly") {
    throw new Error("invalid recurrence frequency");
  }
  const interval = data["interval"];
  if (typeof interval !== "number" || !Number.isInteger(interval) || interval < 1 || interval > 10_000) {
    throw new Error("recurrence interval must be an integer from 1 to 10000");
  }
  const result: Recurrence = { frequency, interval };
  if ("count" in data) {
    const count = data["count"];
    if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 10_000) {
      throw new Error("recurrence count must be an integer from 1 to 10000");
    }
    result.count = count;
  }
  if ("until" in data) {
    assertDate(data["until"], "recurrence until");
    result.until = data["until"];
  }
  return result;
}

/**
 * 現在の期限より少なくとも1周期先、かつafterより後の期限を返す。
 * anchorDayは月次の元の日（1〜31、既定はdueDateの日）、afterの既定はdueDate。
 * untilを超える候補はundefined。countの判定は生成数を保持する保存層の責務。
 * 不正入力や、untilによる終了ではない対応日付範囲超過は例外にする。
 */
export function nextDueDate(
  dueDate: string,
  recurrence: Recurrence,
  anchorDay = Number(dueDate.slice(8, 10)),
  after = dueDate,
): string | undefined {
  assertDate(dueDate, "dueDate");
  assertDate(after, "today");
  const rule = validateRecurrence(recurrence);
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) {
    throw new Error("invalid anchorDay");
  }
  if (rule.until !== undefined && rule.until <= after) return undefined;

  let result: string | undefined;
  if (rule.frequency === "monthly") {
    const origin = Number(dueDate.slice(0, 4)) * 12 + Number(dueDate.slice(5, 7)) - 1;
    const target = Number(after.slice(0, 4)) * 12 + Number(after.slice(5, 7)) - 1;
    let step = Math.max(1, Math.floor((target - origin) / rule.interval));
    const at = (n: number): string | undefined => {
      const index = origin + n * rule.interval;
      if (rule.until !== undefined) {
        const limit = Number(rule.until.slice(0, 4)) * 12 + Number(rule.until.slice(5, 7)) - 1;
        if (index > limit) return undefined;
      }
      const year = Math.floor(index / 12);
      const month = index % 12 + 1;
      if (year > 9999) throw new Error("date exceeds supported range");
      const day = Math.min(anchorDay, daysInMonth(year, month));
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };
    result = at(step);
    if (result !== undefined && result <= after) result = at(++step);
  } else {
    const period = rule.interval * (rule.frequency === "weekly" ? 7 : 1);
    const elapsed = Math.floor((epoch(after) - epoch(dueDate)) / DAY_MS);
    const step = Math.max(1, Math.floor(elapsed / period) + 1);
    if (rule.until !== undefined && epoch(dueDate) + step * period * DAY_MS > epoch(rule.until)) return undefined;
    result = addCalendarDays(dueDate, step * period);
  }
  return result !== undefined && rule.until !== undefined && result > rule.until ? undefined : result;
}
