import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { TaskStore } from "./store.ts";
import { buildDailyDigest } from "./notify.ts";

import { validateRecurrence } from "./recurrence.ts";

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw.length === 0 ? {} : JSON.parse(raw);
}

/** 渡されたストアを使うHTTPサーバー。省略時は呼び出しごとに独立したストアを作る。 */
export function handle(store = new TaskStore()): ReturnType<typeof createServer> {
  return createServer((req, res) => {
    void route(req, res, store).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "internal error";
      json(res, 400, { error: message });
    });
  });
}

async function route(req: IncomingMessage, res: ServerResponse, store: TaskStore): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const completeMatch = /^\/tasks\/([^/]+)\/complete$/.exec(url.pathname);

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true });
  } else if (req.method === "GET" && url.pathname === "/tasks") {
    json(res, 200, { tasks: store.list() });
  } else if (req.method === "GET" && url.pathname === "/digest") {
    const today = url.searchParams.get("today") ?? new Date().toISOString().slice(0, 10);
    const rawDays = url.searchParams.get("withinDays");
    if (rawDays !== null && !/^\d+$/.test(rawDays)) throw new Error("invalid withinDays");
    json(res, 200, { digest: buildDailyDigest(store, today, rawDays === null ? 3 : Number(rawDays)) });
  } else if (req.method === "POST" && url.pathname === "/tasks") {
    const value = await readBody(req);
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("body must be an object");
    const body = value as Record<string, unknown>;
    if (typeof body["title"] !== "string") {
      json(res, 400, { error: "title is required" });
      return;
    }
    if (body["dueDate"] !== undefined && typeof body["dueDate"] !== "string") throw new Error("invalid dueDate");
    const recurrence = body["recurrence"] === undefined ? undefined : validateRecurrence(body["recurrence"]);
    json(res, 201, { task: store.add(body["title"], body["dueDate"], recurrence) });
  } else if (req.method === "POST" && completeMatch !== null && completeMatch[1] !== undefined) {
    json(res, 200, { task: store.complete(completeMatch[1], url.searchParams.get("today") ?? undefined) });
  } else {
    json(res, 404, { error: "not found" });
  }
}

if (process.argv[1]?.endsWith("server.ts")) {
  const port = Number(process.env["PORT"] ?? 3000);
  handle().listen(port, () => {
    console.log(`agent-ops-task-app listening on :${port}`);
  });
}
