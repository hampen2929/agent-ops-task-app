import { describe, expect, it } from "vitest";
import { TaskStore } from "../src/store.ts";
import { buildDailyDigest } from "../src/notify.ts";

describe("buildDailyDigest", () => {
  it("counts open, due-today and overdue tasks", () => {
    const store = new TaskStore();
    store.add("期限切れ", "2026-08-01");
    store.add("今日まで", "2026-08-18");
    store.add("先の話", "2026-12-31");
    const done = store.add("完了済み", "2026-08-01");
    store.complete(done.id);

    const digest = buildDailyDigest(store, "2026-08-18");
    expect(digest).toContain("未完了: 3件");
    expect(digest).toContain("今日が期限: 1件");
    expect(digest).toContain("期限切れ: 1件");
    expect(digest).toContain("- 期限切れ (期限: 2026-08-01)");
  });

  it("omits the overdue section when nothing is overdue", () => {
    const store = new TaskStore();
    store.add("元気なタスク", "2026-12-31");
    const digest = buildDailyDigest(store, "2026-08-18");
    expect(digest).not.toContain("## 期限切れ");
  });
});
