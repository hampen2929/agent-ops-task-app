import { describe, expect, it } from "vitest";
import { previewDueDates } from "../src/preview.ts";
import type { Recurrence } from "../src/types.ts";

const monthly: Recurrence = { frequency: "monthly", interval: 1 };
const everyOtherDay: Recurrence = { frequency: "daily", interval: 2 };

describe("previewDueDates", () => {
  it("returns future dates and excludes the supplied dueDate", () => {
    expect(previewDueDates("2026-01-01", everyOtherDay, 2)).toEqual(["2026-01-03", "2026-01-05"]);
  });
  it("returns at most limit dates", () => {
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1 }, 3))
      .toEqual(["2026-01-02", "2026-01-03", "2026-01-04"]);
  });
  it("previews weekly recurrence across a year boundary", () => {
    expect(previewDueDates("2026-12-25", { frequency: "weekly", interval: 2 }, 2)).toEqual(["2027-01-08", "2027-01-22"]);
  });

  it("keeps the original day of month across short months", () => {
    expect(previewDueDates("2026-01-31", monthly, 4))
      .toEqual(["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  });
  it("keeps the original day across a leap February", () => {
    expect(previewDueDates("2028-01-29", monthly, 2)).toEqual(["2028-02-29", "2028-03-29"]);
  });

  it("counts the supplied dueDate as the first occurrence", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 3 }, 5)).toEqual(["2026-01-03", "2026-01-05"]);
  });
  it("returns nothing when count is one", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 1 }, 5)).toEqual([]);
  });
  it("applies the smaller of limit and the remaining count", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 10 }, 2)).toEqual(["2026-01-03", "2026-01-05"]);
  });

  it("includes the until boundary date but never goes past it", () => {
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-03-31" }, 5)).toEqual(["2026-02-28", "2026-03-31"]);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-03-30" }, 5)).toEqual(["2026-02-28"]);
  });
  it("returns nothing when until equals dueDate", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, until: "2026-01-01" }, 5)).toEqual([]);
  });
  it("rejects an until earlier than dueDate", () => {
    expect(() => previewDueDates("2026-01-02", { ...everyOtherDay, until: "2026-01-01" }, 5)).toThrow(/until/);
    expect(() => previewDueDates("2026-01-02", { ...everyOtherDay, until: "2026-01-01" }, 0)).toThrow(/until/);
  });

  it("validates dueDate and recurrence even when limit is zero", () => {
    expect(previewDueDates("2026-01-01", everyOtherDay, 0)).toEqual([]);
    expect(() => previewDueDates("2026-02-29", everyOtherDay, 0)).toThrow(/dueDate/);
    expect(() => previewDueDates("2026-01-01", { frequency: "daily", interval: 0 }, 0)).toThrow(/interval/);
  });
  it("validates dueDate and recurrence even when count is one", () => {
    expect(() => previewDueDates("2026-02-29", { ...everyOtherDay, count: 1 }, 5)).toThrow(/dueDate/);
    expect(() => previewDueDates("2026-01-01", { frequency: "yearly", interval: 1, count: 1 } as unknown as Recurrence, 5))
      .toThrow(/frequency/);
  });
  it.each([{ frequency: "monthly", interval: 1, extra: true }, { ...monthly, until: "2026-02-30" }, null, []])(
    "rejects invalid recurrence %#",
    (value) => {
      expect(() => previewDueDates("2026-01-01", value as unknown as Recurrence, 1)).toThrow();
    },
  );

  it.each([-1, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects limit %s", (limit) => {
    expect(() => previewDueDates("2026-01-01", everyOtherDay, limit)).toThrow(/limit/);
  });
  it("accepts the limit boundaries", () => {
    expect(previewDueDates("2026-01-01", everyOtherDay, 0)).toEqual([]);
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1 }, 100)).toHaveLength(100);
  });

  it("does not mutate the supplied recurrence", () => {
    const rule = Object.freeze({ frequency: "monthly", interval: 1, count: 4, until: "2026-12-31" } as Recurrence);
    const before = { ...rule };
    expect(previewDueDates("2026-01-31", rule, 10)).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(rule).toEqual(before);
  });

  it("propagates the calendar range error from the recurrence helpers", () => {
    expect(() => previewDueDates("9999-12-31", monthly, 1)).toThrow(/range/);
  });
});
