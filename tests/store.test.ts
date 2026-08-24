import { describe, expect, it } from "vitest";
import { TaskStore } from "../src/store.ts";

describe("TaskStore", () => {
  it("adds a task with trimmed title", () => {
    const store = new TaskStore();
    const task = store.add("  牛乳を買う  ");
    expect(task.title).toBe("牛乳を買う");
    expect(task.status).toBe("open");
  });

  it("rejects an empty title", () => {
    const store = new TaskStore();
    expect(() => store.add("   ")).toThrow(/title/);
  });

  it("rejects an invalid dueDate", () => {
    const store = new TaskStore();
    expect(() => store.add("x", "2026/08/18")).toThrow(/dueDate/);
  });

  it("completes a task exactly once", () => {
    const store = new TaskStore();
    const task = store.add("レビュー返信");
    const done = store.complete(task.id);
    expect(done.status).toBe("done");
    expect(done.completedAt).toBeInstanceOf(Date);
    expect(() => store.complete(task.id)).toThrow(/already/);
  });

  it("throws for an unknown id", () => {
    const store = new TaskStore();
    expect(() => store.complete("missing")).toThrow(/not found/);
  });

  it("filters by status and due date", () => {
    const store = new TaskStore();
    store.add("a", "2026-08-01");
    const b = store.add("b", "2026-08-20");
    store.add("c");
    store.complete(b.id);

    expect(store.list({ status: "open" })).toHaveLength(2);
    expect(store.list({ dueOnOrBefore: "2026-08-19" }).map((t) => t.title)).toEqual(["a"]);
  });

  it("reports overdue open tasks only", () => {
    const store = new TaskStore();
    store.add("past-open", "2026-08-01");
    const done = store.add("past-done", "2026-08-02");
    store.add("future", "2026-12-31");
    store.add("no-due");
    store.complete(done.id);

    const overdue = store.overdue("2026-08-18");
    expect(overdue.map((t) => t.title)).toEqual(["past-open"]);
  });
});
