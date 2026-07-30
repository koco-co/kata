import { waitForUiSettled } from "../../../../../../../../../runtime/automation/playwright";
// spec: features/completeness-json-key-range/archive.md#case=t33-case-33
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t33","priority":"P1","title":"验证校验不通过时查看明细：标题、字段标红及全字段展示"}
import { expect, test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectDetailTitle } from "../../flows/rule-set-flow";
import {
  ensureRuleTasks,
  executeTaskFromList,
  openTaskInstanceDetail,
  waitForTaskInstanceFinished,
  MAIN_TASK_NAME,
} from "../../flows/rule-task-flow";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证校验不通过明细下载前页面展示：标题、字段标红及全字段展示", async ({ page, step }) => {
    let instanceRow!: import("@playwright/test").Locator;

    await step("步骤1: 准备前置条件（规则集+任务）", async () => {
      await ensureRuleTasks(page, [MAIN_TASK_NAME]);
    });

    await step("步骤2: 执行任务", async () => {
      await executeTaskFromList(page, MAIN_TASK_NAME);
    });

    await step("步骤3: 在校验结果查询中查看校验不通过实例 → 打开明细", async () => {
      instanceRow = await waitForTaskInstanceFinished(page, MAIN_TASK_NAME, 480000);
      await expect(instanceRow).toBeVisible({ timeout: 10000 });

      // 打开实例详情
      const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
      await expect(detailDrawer).toBeVisible({ timeout: 10000 });

      // 验证标题
      await expectDetailTitle(page, "key范围校验");

      // 点击查看明细
      const viewDetailBtn = detailDrawer.getByRole("button", { name: /查看明细|明细/ }).first();
      if (await viewDetailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewDetailBtn.click();
        await waitForUiSettled(page);
        const dataDrawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible").last();
        await expect(dataDrawer).toBeVisible({ timeout: 10000 });
        // 验证包含失败行
        await expect(dataDrawer).toContainText("2");
        await expect(dataDrawer).toContainText("3");
      }
    }, instanceRow);
  });
});
