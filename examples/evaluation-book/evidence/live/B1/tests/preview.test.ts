import { describe, expect, it } from "vitest";
import { previewDueDates } from "../src/preview.ts";

const monthly = { frequency: "monthly", interval: 1 } as const;
const everyOtherDay = { frequency: "daily", interval: 2 } as const;

describe("previewDueDates", () => {
  it("returns future dates and excludes the supplied dueDate", () => {
    expect(previewDueDates("2026-01-01", everyOtherDay, 2)).toEqual(["2026-01-03", "2026-01-05"]);
    expect(previewDueDates("2026-01-01", everyOtherDay, 2)).not.toContain("2026-01-01");
  });
  it("previews weekly and monthly rules", () => {
    expect(previewDueDates("2026-08-01", { frequency: "weekly", interval: 2 }, 3))
      .toEqual(["2026-08-15", "2026-08-29", "2026-09-12"]);
    expect(previewDueDates("2026-01-15", { ...monthly, interval: 3 }, 3))
      .toEqual(["2026-04-15", "2026-07-15", "2026-10-15"]);
  });

  it("preserves the original day of month across short months", () => {
    expect(previewDueDates("2026-01-31", monthly, 4))
      .toEqual(["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
    expect(previewDueDates("2028-01-29", monthly, 2)).toEqual(["2028-02-29", "2028-03-29"]);
  });

  it("treats count as including the supplied occurrence", () => {
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 3 }, 10))
      .toEqual(["2026-01-03", "2026-01-05"]);
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 1 }, 10)).toEqual([]);
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, count: 5 }, 2))
      .toEqual(["2026-01-03", "2026-01-05"]);
  });

  it("includes the until boundary date but never goes past it", () => {
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-03-31" }, 10))
      .toEqual(["2026-02-28", "2026-03-31"]);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-03-30" }, 10))
      .toEqual(["2026-02-28"]);
    expect(previewDueDates("2026-01-01", { ...everyOtherDay, until: "2026-01-01" }, 10)).toEqual([]);
  });

  it("validates dueDate and recurrence even when limit is zero or count is one", () => {
    expect(() => previewDueDates("2026-02-30", monthly, 0)).toThrow(/invalid dueDate/);
    expect(() => previewDueDates("2026-01-01", { frequency: "yearly", interval: 1 } as never, 0))
      .toThrow(/frequency/);
    expect(() => previewDueDates("2026-01-01", { ...monthly, interval: 0 }, 0)).toThrow(/interval/);
    expect(() => previewDueDates("2026-02-30", { ...monthly, count: 1 }, 10)).toThrow(/invalid dueDate/);
    expect(() => previewDueDates("2026-01-01", { ...monthly, count: 0 }, 0)).toThrow(/count/);
    expect(() => previewDueDates("2026-01-01", { ...monthly, until: "2026-13-01" }, 0)).toThrow(/until/);
    expect(previewDueDates("2026-01-01", everyOtherDay, 0)).toEqual([]);
  });

  it("rejects an until date earlier than dueDate", () => {
    expect(() => previewDueDates("2026-01-31", { ...monthly, until: "2026-01-30" }, 3)).toThrow(/until/);
    expect(() => previewDueDates("2026-01-31", { ...monthly, until: "2026-01-30" }, 0)).toThrow(/until/);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-01-31" }, 3)).toEqual([]);
  });

  it("accepts only integer limits from 0 through 100", () => {
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1 }, 100)).toHaveLength(100);
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1 }, 1)).toEqual(["2026-01-02"]);
    for (const limit of [-1, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => previewDueDates("2026-01-01", monthly, limit)).toThrow(/limit/);
    }
    expect(() => previewDueDates("2026-01-01", monthly, "3" as never)).toThrow(/limit/);
  });

  it("does not mutate the supplied recurrence", () => {
    const rule = { frequency: "monthly", interval: 1, count: 4, until: "2026-06-30" } as const;
    const snapshot = { ...rule };
    previewDueDates("2026-01-31", rule, 10);
    expect(rule).toEqual(snapshot);
    expect(() => previewDueDates("2026-01-31", Object.freeze({ ...rule }), 10)).not.toThrow();
  });

  it("propagates recurrence errors for dates beyond the supported range", () => {
    expect(() => previewDueDates("9999-12-31", monthly, 1)).toThrow(/range/);
    expect(() => previewDueDates("9999-12-29", { frequency: "daily", interval: 1 }, 5)).toThrow(/range/);
    // untilで終わる系列は範囲超過に到達せず、静かに打ち切られる。
    expect(previewDueDates("9999-12-29", { frequency: "daily", interval: 1, until: "9999-12-31" }, 5))
      .toEqual(["9999-12-30", "9999-12-31"]);
  });
});
