import { describe, expect, it } from "vitest";
import { previewDueDates } from "../src/preview.ts";

const monthly = { frequency: "monthly", interval: 1 } as const;
const everyTwoDays = { frequency: "daily", interval: 2 } as const;

describe("previewDueDates", () => {
  it("returns future dates and excludes the supplied dueDate", () => {
    expect(previewDueDates("2026-01-01", everyTwoDays, 2)).toEqual(["2026-01-03", "2026-01-05"]);
  });
  it("preserves the original day of month across short months", () => {
    expect(previewDueDates("2026-01-31", monthly, 4)).toEqual([
      "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31",
    ]);
  });
  it("supports weekly intervals across a year boundary", () => {
    expect(previewDueDates("2026-12-25", { frequency: "weekly", interval: 2 }, 2)).toEqual([
      "2027-01-08", "2027-01-22",
    ]);
  });
  it("counts the supplied dueDate as occurrence 1", () => {
    expect(previewDueDates("2026-01-01", { ...everyTwoDays, count: 3 }, 10)).toEqual(["2026-01-03", "2026-01-05"]);
    expect(previewDueDates("2026-01-01", { ...everyTwoDays, count: 1 }, 10)).toEqual([]);
  });
  it("stops at limit even when count and until allow more", () => {
    expect(previewDueDates("2026-01-01", { ...everyTwoDays, count: 9, until: "2026-12-31" }, 1)).toEqual(["2026-01-03"]);
  });
  it("includes the until boundary but never goes past it", () => {
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-04-30" }, 10)).toEqual([
      "2026-02-28", "2026-03-31", "2026-04-30",
    ]);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-02-27" }, 10)).toEqual([]);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-01-31" }, 10)).toEqual([]);
  });
  it("rejects an until date earlier than dueDate", () => {
    expect(() => previewDueDates("2026-01-31", { ...monthly, until: "2026-01-30" }, 1)).toThrow(/until/);
  });
  it("validates dueDate and recurrence even when limit is zero", () => {
    expect(previewDueDates("2026-01-01", everyTwoDays, 0)).toEqual([]);
    expect(() => previewDueDates("2026-02-29", everyTwoDays, 0)).toThrow(/dueDate/);
    expect(() => previewDueDates("2026-01-01", { ...monthly, interval: 0 }, 0)).toThrow(/interval/);
    expect(() => previewDueDates("2026-01-01", { ...monthly, until: "2026-02-30" }, 0)).toThrow(/until/);
  });
  it("validates dueDate and recurrence even when count is one", () => {
    expect(() => previewDueDates("2026-02-29", { ...everyTwoDays, count: 1 }, 5)).toThrow(/dueDate/);
    expect(() => previewDueDates("2026-01-01", { frequency: "yearly", interval: 1, count: 1 } as unknown as typeof monthly, 5)).toThrow(/frequency/);
  });
  it.each([-1, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects limit %p", (limit) => {
    expect(() => previewDueDates("2026-01-01", everyTwoDays, limit)).toThrow(/limit/);
  });
  it("rejects a non-numeric limit", () => {
    expect(() => previewDueDates("2026-01-01", everyTwoDays, "2" as unknown as number)).toThrow(/limit/);
  });
  it("accepts the limit boundaries 0 and 100", () => {
    expect(previewDueDates("2026-01-01", everyTwoDays, 0)).toEqual([]);
    const dates = previewDueDates("2026-01-01", everyTwoDays, 100);
    expect(dates).toHaveLength(100);
    expect(dates[99]).toBe("2026-07-20");
  });
  it("does not mutate the supplied recurrence", () => {
    const rule = { frequency: "monthly", interval: 1, count: 3, until: "2026-12-31" } as const;
    const before = { ...rule };
    previewDueDates("2026-01-31", rule, 5);
    expect(rule).toEqual(before);
  });
  it("surfaces helper errors for dates beyond the supported range", () => {
    expect(() => previewDueDates("9999-12-31", monthly, 1)).toThrow(/range/);
    expect(previewDueDates("9999-11-30", { ...monthly, interval: 100, until: "9999-12-31" }, 1)).toEqual([]);
  });
});
