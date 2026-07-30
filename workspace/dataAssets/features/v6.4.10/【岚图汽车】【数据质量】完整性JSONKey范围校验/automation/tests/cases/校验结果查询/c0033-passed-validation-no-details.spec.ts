import { expect, test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  ensureRuleTasks,
  executeTaskFromList,
  gotoValidationResults,
  getTableRowByTaskName,
  waitForTaskInstanceFinished,
  MAIN_TASK_NAME,
} from "../../flows/rule-task-flow";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证校验通过时结果查询页不显示明细入口", async ({ page, step }) => {
    await step("步骤1: 准备前置条件（规则集+任务）", async () => {
      await ensureRuleTasks(page, [MAIN_TASK_NAME]);
    });

    await step("步骤2: 执行任务并等待完成", async () => {
      await executeTaskFromList(page, MAIN_TASK_NAME);
      await waitForTaskInstanceFinished(page, MAIN_TASK_NAME, 480000);
    });

    await step("步骤3: 进入校验结果查询页面，查看校验通过行 → 操作列显示--，无【查看明细】按钮", async () => {
      await gotoValidationResults(page);
      const taskRow = getTableRowByTaskName(page, MAIN_TASK_NAME);
      await expect(taskRow).toBeVisible({ timeout: 15000 });

      const passRow = page
        .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
        .filter({ hasText: /校验通过/ })
        .first();
      await expect(passRow).toBeVisible({ timeout: 10000 });
      const detailBtn = passRow.getByRole("button", { name: /查看明细|明细/ }).first();
      await expect(detailBtn).not.toBeVisible({ timeout: 3000 });
    });
  });
});
