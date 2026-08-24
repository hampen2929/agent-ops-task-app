export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** ISO 8601 (YYYY-MM-DD)。期限なしのタスクでは省略 */
  dueDate?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TaskFilter {
  status?: TaskStatus;
  /** この日付以前が期限のタスクに絞る (YYYY-MM-DD) */
  dueOnOrBefore?: string;
}
