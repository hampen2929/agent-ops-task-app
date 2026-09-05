import { describe, expect, it } from "vitest";
import { addCalendarDays, isValidDate, nextDueDate, validateRecurrence } from "../src/recurrence.ts";

const monthly = { frequency: "monthly", interval: 1 } as const;

describe("calendar recurrence", () => {
  it("restores the original day after a short month", () => {
    const february = nextDueDate("2026-01-31", monthly, 31);
    expect(february).toBe("2026-02-28");
    expect(nextDueDate(february!, monthly, 31)).toBe("2026-03-31");
  });
  it.each([["2026", "28"], ["2028", "29"]])("handles January 29 in %s", (year, lastDay) => {
    const february = nextDueDate(`${year}-01-29`, monthly, 29);
    expect(february).toBe(`${year}-02-${lastDay}`);
    expect(nextDueDate(february!, monthly, 29)).toBe(`${year}-03-29`);
  });
  it("keeps ordinary monthly dates", () => {
    expect(nextDueDate("2026-01-15", monthly)).toBe("2026-02-15");
  });
  it("supports biweekly recurrence across a year", () => {
    expect(nextDueDate("2026-12-25", { frequency: "weekly", interval: 2 })).toBe("2027-01-08");
  });
  it("skips overdue cycles without drifting the original schedule", () => {
    expect(nextDueDate("2026-08-01", { frequency: "weekly", interval: 1 }, 1, "2026-08-11")).toBe("2026-08-15");
    expect(nextDueDate("2026-01-31", monthly, 31, "2026-03-31")).toBe("2026-04-30");
  });
  it("uses at least one cycle even when completed early", () => {
    expect(nextDueDate("2026-08-20", { frequency: "daily", interval: 2 }, 20, "2026-08-01")).toBe("2026-08-22");
  });
  it("includes until but never goes past it", () => {
    expect(nextDueDate("2026-01-31", { ...monthly, until: "2026-02-28" }, 31)).toBe("2026-02-28");
    expect(nextDueDate("2026-01-31", { ...monthly, until: "2026-02-27" }, 31)).toBeUndefined();
    expect(nextDueDate("2026-01-31", { ...monthly, until: "2026-02-28" }, 31, "2026-02-28")).toBeUndefined();
  });
  it.each(["daily", "weekly", "monthly"] as const)("ends at until before calendar overflow for %s", (frequency) => {
    expect(nextDueDate("9999-11-30", { frequency, interval: 100, until: "9999-12-31" }, 30, "9999-11-01")).toBeUndefined();
  });
  it("supports early calendar years and rejects overflow", () => {
    expect(addCalendarDays("0001-01-01", 1)).toBe("0001-01-02");
    expect(() => nextDueDate("9999-12-31", monthly)).toThrow(/range/);
  });
  it.each(["2026-02-29", "2026-04-31", "0000-01-01", "2026-13-01", "2026-01-00", "2026/01/01"])('rejects impossible date %s', (date) => {
    expect(isValidDate(date)).toBe(false);
    expect(() => nextDueDate(date, monthly)).toThrow(/dueDate/);
  });
  it.each([null, [], {}, { frequency: "yearly", interval: 1 }, { ...monthly, interval: 0 }, { ...monthly, interval: 1.5 }, { ...monthly, count: -1 }, { ...monthly, count: "2" }, { ...monthly, until: "2026-02-30" }, { ...monthly, extra: true }])("rejects invalid recurrence %#", (value) => {
    expect(() => validateRecurrence(value)).toThrow();
  });
});
