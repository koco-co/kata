// spec: features/validity-json-value-format/archive.md#case=t26-case-26
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t26","priority":"P1","title":"【P1】验证校验通过时不记录明细数据，查看详情入口不显示"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { REPORT_PASS_SCENARIO } from "../fixtures/test-data";
import {
  ensureExecutedJsonTask,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForVisibleTaskRow,
} from "../flows/rule-task-flow";
import { describeByDatasource } from "../fixtures/suite-matrix";

test.setTimeout(600000);

describeByDatasource("校验结果查询", () => {
  test("验证校验通过时不记录明细数据，查看详情入口不显示", async ({ page }) => {
    await ensureExecutedJsonTask(page, REPORT_PASS_SCENARIO);
    const instanceRow = await waitForVisibleTaskRow(page, REPORT_PASS_SCENARIO.taskName);
    await expect(instanceRow).toContainText(/校验通过/);

    const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
    const ruleCard = getTaskDetailRuleCard(detailDrawer, "格式-json格式校验");

    await expect(ruleCard).toBeVisible({ timeout: 10000 });
    await expect(ruleCard).toContainText(/校验通过/);
    await expect(ruleCard).toContainText("meta-version");
    await expect(ruleCard).toContainText("--");
    await expect(ruleCard.getByRole("button", { name: "查看明细" })).toHaveCount(0);
  });
});
