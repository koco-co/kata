import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { ensureSavedScenarioRuleSet, SCENARIOS } from "../flows/rule-set-flow";
import {
  ensureRuleTasks,
  executeTaskFromList,
  FAIL_LOG_TASK_NAME,
  openTaskLogDrawer,
  waitForTaskInstanceFinished,
} from "../flows/rule-task-flow";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证校验失败时支持查看日志", async ({ page, step }) => {
    let instanceRow!: import("@playwright/test").Locator;

    await step("步骤1: 准备前置条件（规则集+任务，含已删除的引用key）", async () => {
      await ensureSavedScenarioRuleSet(page, SCENARIOS.failLog);
      await ensureRuleTasks(page, [FAIL_LOG_TASK_NAME]);
    });

    await step("步骤2: 执行任务（预期失败）", async () => {
      await executeTaskFromList(page, FAIL_LOG_TASK_NAME);
    });

    await step("步骤3: 在校验结果查询中找到执行失败记录 → 查看日志", async () => {
      instanceRow = await waitForTaskInstanceFinished(page, FAIL_LOG_TASK_NAME, 480000);
      await expect(instanceRow).toBeVisible({ timeout: 10000 });

      const logDrawer = await openTaskLogDrawer(page, instanceRow);
      await expect(logDrawer).toBeVisible({ timeout: 10000 });
      await expect(logDrawer).toContainText(/错误|异常|fail|error/i);
    }, instanceRow);
  });
});
