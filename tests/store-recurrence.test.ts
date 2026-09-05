import { describe, expect, it } from "vitest";
import { TaskStore } from "../src/store.ts";

const monthly = { frequency: "monthly", interval: 1 } as const;
describe("recurring task lifecycle", () => {
  it("keeps the monthly anchor and series while returning the completed task", () => {
    const store = new TaskStore();
    const first = store.add("report", "2026-01-31", monthly);
    expect(store.complete(first.id, "2026-01-31").id).toBe(first.id);
    const second = store.list({ status: "open" })[0]!;
    expect(second).toMatchObject({ dueDate: "2026-02-28", anchorDay: 31, seriesId: first.id, occurrence: 2 });
    store.complete(second.id, "2026-02-28");
    expect(store.list({ status: "open" })[0]).toMatchObject({ dueDate: "2026-03-31", anchorDay: 31, seriesId: first.id, occurrence: 3 });
  });
  it("counts generated tasks, not skipped calendar periods", () => {
    const store = new TaskStore();
    const task = store.add("daily", "2026-01-01", { frequency: "daily", interval: 1, count: 2 });
    store.complete(task.id, "2026-08-01");
    const next = store.list({ status: "open" })[0]!;
    expect(next.dueDate).toBe("2026-08-02");
    store.complete(next.id, "2026-08-02");
    expect(store.list()).toHaveLength(2);
    expect(store.list({ status: "open" })).toHaveLength(0);
  });
  it("does not create another task for count one or a repeated completion", () => {
    const store = new TaskStore();
    const task = store.add("once", "2026-01-01", { ...monthly, count: 1 });
    store.complete(task.id, "2026-01-01");
    expect(() => store.complete(task.id, "2026-01-01")).toThrow(/already completed/);
    expect(store.list()).toHaveLength(1);
  });
  it("does not duplicate the next task when the original completion is retried", () => {
    const store = new TaskStore();
    const task = store.add("repeat", "2026-01-01", monthly);
    store.complete(task.id, "2026-01-01");
    expect(() => store.complete(task.id, "2026-01-01")).toThrow();
    expect(store.list()).toHaveLength(2);
  });
  it("ends inclusively at until", () => {
    const store = new TaskStore();
    const task = store.add("report", "2026-01-31", { ...monthly, until: "2026-02-28" });
    store.complete(task.id, "2026-01-31");
    store.complete(store.list({ status: "open" })[0]!.id, "2026-02-28");
    expect(store.list()).toHaveLength(2);
    expect(store.list({ status: "open" })).toHaveLength(0);
  });
  it("leaves state unchanged when next date calculation fails", () => {
    const store = new TaskStore();
    const task = store.add("last", "9999-12-31", monthly);
    expect(() => store.complete(task.id, "9999-12-31")).toThrow(/range/);
    expect(task.status).toBe("open");
    expect(task.completedAt).toBeUndefined();
    expect(store.list()).toHaveLength(1);
  });
  it("can complete a bounded series at the upper date limit", () => {
    const store = new TaskStore();
    const task = store.add("last", "9999-11-30", { ...monthly, interval: 2, until: "9999-12-31" });
    expect(store.complete(task.id, "9999-11-01").status).toBe("done");
    expect(store.list()).toHaveLength(1);
  });
  it("validates input without inserting a task", () => {
    const store = new TaskStore();
    expect(() => store.add("x", undefined, monthly)).toThrow(/require/);
    expect(() => store.add("x", "2026-02-30")).toThrow(/dueDate/);
    expect(() => store.add("x", "2026-02-01", { ...monthly, until: "2026-01-31" })).toThrow(/until/);
    expect(store.list()).toHaveLength(0);
  });
  it("copies the caller's recurrence and rejects invalid today atomically", () => {
    const store = new TaskStore();
    const rule = { ...monthly, interval: 1 };
    const task = store.add("x", "2026-01-01", rule);
    rule.interval = 10;
    expect(task.recurrence?.interval).toBe(1);
    expect(() => store.complete(task.id, "2026-02-30")).toThrow(/today/);
    expect(task.status).toBe("open");
  });
});
