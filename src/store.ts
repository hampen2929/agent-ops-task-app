import { randomUUID } from "node:crypto";
import type { Task, TaskFilter, Recurrence } from "./types.ts";

import { assertDate, nextDueDate, validateRecurrence } from "./recurrence.ts";

export class TaskStore {
  private readonly tasks = new Map<string, Task>();

  /** タスクを追加する。繰り返しではdueDate必須、untilは初回期限以上。 */
  add(title: string, dueDate?: string, recurrence?: Recurrence): Task {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      throw new Error("title must not be empty");
    }
    if (dueDate !== undefined) assertDate(dueDate, "dueDate");
    const rule = recurrence === undefined ? undefined : validateRecurrence(recurrence);
    if (rule !== undefined) {
      if (dueDate === undefined) throw new Error("recurring tasks require dueDate");
      if (rule.until !== undefined && rule.until < dueDate) throw new Error("until must not precede dueDate");
    }
    const task: Task = {
      id: randomUUID(),
      title: trimmed,
      status: "open",
      createdAt: new Date(),
      ...(dueDate !== undefined ? { dueDate } : {}),
    };
    if (rule !== undefined) {
      task.recurrence = rule;
      task.seriesId = task.id;
      task.occurrence = 1;
      if (rule.frequency === "monthly" && dueDate !== undefined) task.anchorDay = Number(dueDate.slice(8, 10));
    }
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

  /**
   * 現在タスクを完了して返し、規則があれば次回分を保存する。
   * today省略時はUTCの今日。日付計算に失敗した場合は保存状態を変えない。
   */
  complete(id: string, today = new Date().toISOString().slice(0, 10)): Task {
    const task = this.get(id);
    if (task.status === "done") {
      throw new Error(`task already completed: ${id}`);
    }
    assertDate(today, "today");
    let next: Task | undefined;
    const rule = task.recurrence;
    if (rule !== undefined && (rule.count === undefined || (task.occurrence ?? 1) < rule.count)) {
      if (task.dueDate === undefined) throw new Error("recurring tasks require dueDate");
      const dueDate = nextDueDate(task.dueDate, rule, task.anchorDay, today);
      if (dueDate !== undefined) {
        next = {
          id: randomUUID(), title: task.title, status: "open", createdAt: new Date(), dueDate,
          recurrence: { ...rule }, seriesId: task.seriesId ?? task.id, occurrence: (task.occurrence ?? 1) + 1,
          ...(task.anchorDay !== undefined ? { anchorDay: task.anchorDay } : {}),
        };
      }
    }
    // 全ての計算が成功してから完了状態と次回分を同時に反映する。
    task.status = "done";
    task.completedAt = new Date();
    if (next !== undefined) this.tasks.set(next.id, next);
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
