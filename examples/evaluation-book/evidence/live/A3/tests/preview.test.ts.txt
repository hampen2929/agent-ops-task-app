import { describe, expect, it } from "vitest";
import { previewDueDates } from "../src/preview.ts";
import type { Recurrence } from "../src/types.ts";

const monthly = { frequency: "monthly", interval: 1 } as const;

describe("previewDueDates", () => {
  it("returns future dates and excludes the supplied dueDate", () => {
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 2 }, 2)).toEqual(["2026-01-03", "2026-01-05"]);
  });
  it("keeps the original day of month across short months", () => {
    expect(previewDueDates("2026-01-31", monthly, 3)).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("advances weekly without drifting", () => {
    expect(previewDueDates("2026-12-25", { frequency: "weekly", interval: 2 }, 2)).toEqual(["2027-01-08", "2027-01-22"]);
  });
  it("counts the supplied dueDate as occurrence 1", () => {
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1, count: 3 }, 10)).toEqual(["2026-01-02", "2026-01-03"]);
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1, count: 1 }, 10)).toEqual([]);
  });
  it("stops at limit even when count allows more", () => {
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1, count: 50 }, 2)).toEqual(["2026-01-02", "2026-01-03"]);
  });
  it("includes the until boundary but never goes past it", () => {
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-03-31" }, 10)).toEqual(["2026-02-28", "2026-03-31"]);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-02-27" }, 10)).toEqual([]);
    expect(previewDueDates("2026-01-31", { ...monthly, until: "2026-01-31" }, 10)).toEqual([]);
  });
  it("rejects an until earlier than dueDate", () => {
    expect(() => previewDueDates("2026-01-31", { ...monthly, until: "2026-01-30" }, 1)).toThrow(/until/);
  });
  it.each([-1, 101, 1.5, Number.NaN])("rejects limit %s", (limit) => {
    expect(() => previewDueDates("2026-01-01", monthly, limit)).toThrow(/limit/);
  });
  it("accepts the limit boundaries", () => {
    expect(previewDueDates("2026-01-01", monthly, 0)).toEqual([]);
    expect(previewDueDates("2026-01-01", { frequency: "daily", interval: 1 }, 100)).toHaveLength(100);
  });
  it("validates dueDate and recurrence even when nothing is generated", () => {
    expect(() => previewDueDates("2026-02-30", monthly, 0)).toThrow(/dueDate/);
    expect(() => previewDueDates("2026-01-01", { frequency: "yearly", interval: 1 } as unknown as Recurrence, 0)).toThrow(/frequency/);
    expect(() => previewDueDates("2026-01-01", { frequency: "daily", interval: 0 } as Recurrence, 5)).toThrow(/interval/);
    expect(() => previewDueDates("2026-01-01", { frequency: "daily", interval: 1, count: 1, until: "bad" } as unknown as Recurrence, 0)).toThrow(/until/);
  });
  it("does not mutate the given recurrence", () => {
    const rule: Recurrence = { frequency: "monthly", interval: 1, count: 3, until: "2026-06-30" };
    const snapshot = { ...rule };
    previewDueDates("2026-01-31", rule, 5);
    expect(rule).toEqual(snapshot);
  });
  it("propagates calendar range errors from the recurrence helpers", () => {
    expect(() => previewDueDates("9999-12-31", monthly, 1)).toThrow(/range/);
  });
});
