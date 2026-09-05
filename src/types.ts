export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** ISO 8601 (YYYY-MM-DD)。期限なしのタスクでは省略 */
  dueDate?: string;
  createdAt: Date;
  completedAt?: Date;
  recurrence?: Recurrence;
  seriesId?: string;
  anchorDay?: number;
  occurrence?: number;
}

export interface TaskFilter {
  status?: TaskStatus;
  /** この日付以前が期限のタスクに絞る (YYYY-MM-DD) */
  dueOnOrBefore?: string;
}

export interface Recurrence {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  /** 最初のインスタンスを含む生成総数 */
  count?: number;
  /** 生成する期限の上限（当日を含む） */
  until?: string;
}
