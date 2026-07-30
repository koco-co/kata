// spec: features/validity-json-value-format/archive.md#case=t15-json
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t15","priority":"P0","title":"【P0】验证格式-json格式校验校验不通过主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看失败明细"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { P0_FAIL_SCENARIO } from "../fixtures/test-data";
import {
  ensureExecutedJsonTask,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  openTaskRuleDetailDataDrawer,
  waitForVisibleTaskRow,
} from "../flows/rule-task-flow";
import { describeByDatasource } from "../fixtures/suite-matrix";
import { buildValidationKeyLabelPattern } from "../assertions/validation-key-label";
import { isFailLikeValidationStatus } from "../assertions/validation-result-status";

test.setTimeout(600000);

describeByDatasource("校验结果查询", () => {
  test("验证格式-json格式校验校验不通过主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看失败明细", async ({
    page,
  }) => {
    await ensureExecutedJsonTask(page, P0_FAIL_SCENARIO);
    const instanceRow = await waitForVisibleTaskRow(page, P0_FAIL_SCENARIO.taskName);
    expect(
      isFailLikeValidationStatus(await instanceRow.innerText()),
      "expected validation result row to show a fail-like status",
    ).toBe(true);

    const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
    const ruleCard = getTaskDetailRuleCard(detailDrawer, "格式-json格式校验");

    await expect(ruleCard).toBeVisible({ timeout: 10000 });
    await expect(ruleCard).toContainText("有效性校验");
    await expect(ruleCard).toContainText("格式-json格式校验");
    await expect(ruleCard).toContainText(buildValidationKeyLabelPattern("person-name"));
    await expect(ruleCard).toContainText(buildValidationKeyLabelPattern("person-age"));
    await expect(detailDrawer).toContainText(/校验未通过|校验不通过/);

    const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
    await expect(dataDrawer).toContainText('"name":"Tom"', { timeout: 15000 });
    await expect(dataDrawer).toContainText('"age":"1000"', { timeout: 15000 });
    await expect(dataDrawer).not.toContainText('"name":"张三","age":"25"', {
      timeout: 15000,
    });
  });
});
