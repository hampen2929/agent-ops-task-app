import { describe, expect, it } from "vitest";
import { TaskStore } from "../src/store.ts";
import { buildDailyDigest } from "../src/notify.ts";

describe("upcoming reminders", () => {
  it("includes only open tasks strictly after today through day N", () => {
    const store = new TaskStore();
    store.add("overdue", "2026-08-31");
    store.add("today", "2026-09-01");
    store.add("tomorrow", "2026-09-02");
    store.add("boundary", "2026-09-04");
    store.add("outside", "2026-09-05");
    store.add("undated");
    store.complete(store.add("done", "2026-09-02").id);
    const before = JSON.stringify(store.list());
    const digest = buildDailyDigest(store, "2026-09-01");
    const section = digest.split("## 今後3日以内が期限")[1]!;
    expect(section).toContain("tomorrow");
    expect(section).toContain("boundary");
    for (const excluded of ["overdue", "today", "outside", "undated", "done"]) expect(section).not.toContain(excluded);
    expect(buildDailyDigest(store, "2026-09-01")).toBe(digest);
    expect(JSON.stringify(store.list())).toBe(before);
  });
  it("handles leap day and an empty zero-day window", () => {
    const store = new TaskStore();
    store.add("leap", "2028-02-29");
    expect(buildDailyDigest(store, "2028-02-28", 1)).toContain("- leap");
    expect(buildDailyDigest(store, "2028-02-28", 0)).toContain("## 今後0日以内が期限\n- なし");
  });
  it("clamps the end of the window to the supported last day", () => {
    const store = new TaskStore();
    store.add("last", "9999-12-31");
    expect(buildDailyDigest(store, "9999-12-30", 3)).toContain("- last");
  });
  it.each([-1, 366, 1.5, NaN, Infinity])("rejects invalid window %s", (days) => {
    expect(() => buildDailyDigest(new TaskStore(), "2026-09-01", days)).toThrow(/withinDays/);
  });
  it("rejects impossible today", () => {
    expect(() => buildDailyDigest(new TaskStore(), "2026-02-30")).toThrow(/today/);
  });
});
