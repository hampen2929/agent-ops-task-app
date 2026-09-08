import { describe, expect, it } from "vitest";
import type { Recurrence } from "../src/types.ts";
import { previewDueDates } from "../src/preview.ts";

const daily2: Recurrence = { frequency: "daily", interval: 2 };
const monthly: Recurrence = { frequency: "monthly", interval: 1 };

describe("previewDueDates", () => {
  it("returns future dates and excludes the supplied dueDate", () => {
    expect(previewDueDates("2026-01-01", daily2, 2)).toEqual(["2026-01-03", "2026-01-05"]);
    expect(previewDueDates("2026-01-01", daily2, 3)).not.toContain("2026-01-01");
  });

  it("preserves the original day of month across short months", () => {
    expect(previewDueDates("2026-01-31", monthly, 3)).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(previewDueDates("2026-01-29", monthly, 2)).toEqual(["2026-02-28", "2026-03-29"]);
  });

  it("supports weekly recurrence across a year boundary", () => {
    expect(previewDueDates("2026-12-25", { frequency: "weekly", interval: 2 }, 2)).toEqual(["2027-01-08", "2027-01-22"]);
  });

  it("counts the supplied dueDate as occurrence 1", () => {
    expect(previewDueDates("2026-01-01", { ...daily2, count: 3 }, 10)).toEqual(["2026-01-03", "2026-01-05"]);
    expect(previewDueDates("2026-01-01", { ...daily2, count: 1 }, 10)).toEqual([]);
    expect(previewDueDates("2026-01-01", { ...daily2, count: 2 }, 10)).toEqual(["2026-01-03"]);
  });

  it("stops at limit when limit is smaller than count", () => {
    expect(previewDueDates("2026-01-01", { ...daily2, count: 10 }, 1)).toEqual(["2026-01-03"]);
    expect(previewDueDates("2026-01-01", daily2, 100)).toHaveLength(100);
  });

  it("includes until as an inclusive boundary", () => {
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-03-31" }, 10)).toEqual(["2026-02-28", "2026-03-31"]);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-03-30" }, 10)).toEqual(["2026-02-28"]);
    expect(previewDueDates("2026-01-01", { ...daily2, until: "2026-01-01" }, 10)).toEqual([]);
  });

  it("rejects an until earlier than dueDate", () => {
    expect(() => previewDueDates("2026-01-31", { ...monthly, until: "2026-01-30" }, 5)).toThrow(/precede/);
    expect(() => previewDueDates("2026-01-31", { ...monthly, until: "2026-01-30" }, 0)).toThrow(/precede/);
  });

  it("validates inputs before returning early on limit 0 or count 1", () => {
    expect(previewDueDates("2026-01-01", daily2, 0)).toEqual([]);
    expect(() => previewDueDates("2026-02-30", daily2, 0)).toThrow(/dueDate/);
    expect(() => previewDueDates("not-a-date", daily2, 0)).toThrow(/dueDate/);
    expect(() => previewDueDates("2026-01-01", { frequency: "yearly", interval: 1 } as unknown as Recurrence, 0))
      .toThrow(/frequency/);
    expect(() => previewDueDates("2026-01-01", { frequency: "daily", interval: 0 }, 0)).toThrow(/interval/);
    expect(previewDueDates("2026-01-01", { ...daily2, count: 1 }, 0)).toEqual([]);
    expect(() => previewDueDates("2026-02-30", { ...daily2, count: 1 }, 5)).toThrow(/dueDate/);
  });

  it("requires limit to be an integer from 0 through 100", () => {
    for (const limit of [-1, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => previewDueDates("2026-01-01", daily2, limit)).toThrow(/limit/);
    }
    expect(previewDueDates("2026-01-01", daily2, 100)).toHaveLength(100);
  });

  it("does not mutate the supplied recurrence", () => {
    const rule: Recurrence = { frequency: "monthly", interval: 1, count: 4, until: "2026-12-31" };
    const snapshot = structuredClone(rule);
    previewDueDates("2026-01-31", rule, 10);
    expect(rule).toEqual(snapshot);
  });

  it("propagates calendar range errors from the recurrence helpers", () => {
    expect(() => previewDueDates("9999-12-31", monthly, 1)).toThrow(/range/);
  });
});
