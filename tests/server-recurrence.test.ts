import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { handle } from "../src/server.ts";

let server: ReturnType<typeof handle>;
let base: string;
beforeEach(async () => {
  server = handle();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
const post = (path: string, value?: unknown) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}) });

describe("HTTP recurring task contract", () => {
  it("creates, completes, lists the next occurrence and builds a reminder", async () => {
    const response = await post("/tasks", { title: "report", dueDate: "2026-01-31", recurrence: { frequency: "monthly", interval: 1 } });
    expect(response.status).toBe(201);
    const { task } = await response.json() as { task: { id: string } };
    const completion = await post(`/tasks/${task.id}/complete?today=2026-01-31`);
    expect(completion.status).toBe(200);
    expect(await completion.json()).toMatchObject({ task: { id: task.id, status: "done" } });
    const list = await (await fetch(`${base}/tasks`)).json() as { tasks: { status: string; dueDate: string }[] };
    expect(list.tasks).toHaveLength(2);
    expect(list.tasks.find((item) => item.status === "open")?.dueDate).toBe("2026-02-28");
    const digest = await (await fetch(`${base}/digest?today=2026-02-25&withinDays=3`)).json() as { digest: string };
    expect(digest.digest).toContain("report (期限: 2026-02-28)");
    expect((await post(`/tasks/${task.id}/complete?today=2026-01-31`)).status).toBe(400);
    expect((await (await fetch(`${base}/tasks`)).json()).tasks).toHaveLength(2);
  });
  it.each([null, [], { title: "x", dueDate: 42 }, { title: "x", dueDate: "2026-02-30" }, { title: "x", recurrence: { frequency: "daily", interval: 1 } }, { title: "x", recurrence: null }])("rejects invalid creation %# without state changes", async (body) => {
    expect((await post("/tasks", body)).status).toBe(400);
    expect(await (await fetch(`${base}/tasks`)).json()).toEqual({ tasks: [] });
  });
  it.each(["today=2026-02-30", "withinDays=", "withinDays=-1", "withinDays=1.5", "withinDays=366", "withinDays=Infinity"])("rejects invalid digest query %s", async (query) => {
    expect((await fetch(`${base}/digest?${query}`)).status).toBe(400);
  });
  it("rejects invalid completion date without completing the task", async () => {
    const { task } = await (await post("/tasks", { title: "plain" })).json() as { task: { id: string } };
    expect((await post(`/tasks/${task.id}/complete?today=bad`)).status).toBe(400);
    expect(await (await fetch(`${base}/tasks`)).json()).toMatchObject({ tasks: [{ status: "open" }] });
  });
  it("keeps separate server instances isolated", async () => {
    await post("/tasks", { title: "private to this instance" });
    const other = handle();
    await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
    try {
      const url = `http://127.0.0.1:${(other.address() as AddressInfo).port}/tasks`;
      expect(await (await fetch(url)).json()).toEqual({ tasks: [] });
    } finally { await new Promise<void>((resolve) => other.close(() => resolve())); }
  });
});
