import { randomUUID } from "node:crypto";
import type { Task, TaskFilter } from "./types.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class TaskStore {
  private readonly tasks = new Map<string, Task>();

  add(title: string, dueDate?: string): Task {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      throw new Error("title must not be empty");
    }
    if (dueDate !== undefined && !DATE_RE.test(dueDate)) {
      throw new Error(`invalid dueDate: ${dueDate} (expected YYYY-MM-DD)`);
    }
    const task: Task = {
      id: randomUUID(),
      title: trimmed,
      status: "open",
      createdAt: new Date(),
      ...(dueDate !== undefined ? { dueDate } : {}),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  get(id: string): Task {
    const task = this.tasks.get(id);
    if (task === undefined) {
      throw new Error(`task not found: ${id}`);
    }
    return task;
  }

  complete(id: string): Task {
    const task = this.get(id);
    if (task.status === "done") {
      throw new Error(`task already completed: ${id}`);
    }
    task.status = "done";
    task.completedAt = new Date();
    return task;
  }

  list(filter: TaskFilter = {}): Task[] {
    const result: Task[] = [];
    for (const task of this.tasks.values()) {
      if (filter.status !== undefined && task.status !== filter.status) {
        continue;
      }
      if (filter.dueOnOrBefore !== undefined) {
        if (task.dueDate === undefined || task.dueDate > filter.dueOnOrBefore) {
          continue;
        }
      }
      result.push(task);
    }
    return result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /** 期限切れの未完了タスク。today は YYYY-MM-DD */
  overdue(today: string): Task[] {
    return this.list({ status: "open" }).filter(
      (t) => t.dueDate !== undefined && t.dueDate < today,
    );
  }
}
