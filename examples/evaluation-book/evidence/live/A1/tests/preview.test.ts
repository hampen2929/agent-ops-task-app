import { describe, expect, it } from "vitest";
import type { Recurrence } from "../src/types.ts";
import { previewDueDates } from "../src/preview.ts";

const monthly = { frequency: "monthly", interval: 1 } as const;
const everyOtherDay = { frequency: "daily", interval: 2 } as const;

describe("previewDueDates", () => {
  it("returns future dates and excludes the supplied dueDate", () => {
    expect(previewDueDates("2026-01-01", everyOtherDay, 2)).toEqual(["2026-01-03", "2026-01-05"]);
  });
  it("keeps the original day of month across short months", () => {
    expect(previewDueDates("2026-01-31", monthly, 3)).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("supports weekly intervals across a year boundary", () => {
    expect(previewDueDates("2026-12-25", { frequency: "weekly", interval: 2 }, 2)).toEqual(["2027-01-08", "2027-01-22"]);
  });
  it("counts the supplied dueDate as occurrence 1", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 3 }, 10)).toEqual(["2026-01-03", "2026-01-05"]);
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 1 }, 10)).toEqual([]);
  });
  it("stops at limit before count", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 10 }, 1)).toEqual(["2026-01-03"]);
  });
  it("includes until but never goes past it", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, until: "2026-01-05" }, 10)).toEqual(["2026-01-03", "2026-01-05"]);
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, until: "2026-01-04" }, 10)).toEqual(["2026-01-03"]);
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, until: "2026-01-01" }, 10)).toEqual([]);
  });
  it("returns an empty list for limit 0", () => {
    expect(previewDueDates("2026-01-01", everyOtherDay, 0)).toEqual([]);
  });
  it("supports the maximum limit of 100", () => {
    const dates = previewDueDates("2026-01-01", { frequency: "daily", interval: 1 }, 100);
    expect(dates).toHaveLength(100);
    expect(dates.at(-1)).toBe("2026-04-11");
  });
  it.each([-1, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects limit %p", (limit) => {
    expect(() => previewDueDates("2026-01-01", everyOtherDay, limit)).toThrow(/limit/);
  });
  it("rejects a non-numeric limit", () => {
    expect(() => previewDueDates("2026-01-01", everyOtherDay, "2" as unknown as number)).toThrow(/limit/);
  });
  it.each([0, 1])("validates dueDate and recurrence even with limit %i", (limit) => {
    expect(() => previewDueDates("2026-02-29", monthly, limit)).toThrow(/dueDate/);
    expect(() => previewDueDates("2026-01-01", { ...monthly, interval: 0 }, limit)).toThrow(/interval/);
    expect(() => previewDueDates("2026-01-01", { frequency: "yearly", interval: 1 } as unknown as Recurrence, limit)).toThrow(/frequency/);
  });
  it("validates recurrence even when count is one", () => {
    expect(() => previewDueDates("2026-01-01", { ...monthly, count: 1, until: "2026-02-30" }, 5)).toThrow(/until/);
  });
  it("rejects an until earlier than dueDate", () => {
    expect(() => previewDueDates("2026-01-10", { ...monthly, until: "2026-01-09" }, 5)).toThrow(/precede/);
  });
  it("does not mutate the given recurrence", () => {
    const rule: Recurrence = { frequency: "monthly", interval: 1, count: 4, until: "2026-06-30" };
    const snapshot = { ...rule };
    previewDueDates("2026-01-31", rule, 10);
    expect(rule).toEqual(snapshot);
  });
  it("propagates calendar overflow from the recurrence helpers", () => {
    expect(() => previewDueDates("9999-12-31", monthly, 1)).toThrow(/range/);
  });
});
