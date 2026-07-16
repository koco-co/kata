// spec: features/validity-json-value-format/archive.md#case=t14-json
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t14","priority":"P0","title":"【P0】验证格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例"}
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { P0_PASS_SCENARIO } from "../data/test-data";
import {
  ensureValueFormatMainBaseline,
  getTaskDetailRuleCard,
  openTaskInstanceDetail,
  waitForVisibleTaskRow,
} from "../../../../_shared/pages/validity-json-value-format/json-format-task-helpers";
import { describeByDatasource } from "../../../../_shared/pages/validity-json-value-format/suite-case-helpers";
import { buildValidationKeyLabelPattern } from "../../../../_shared/pages/validity-json-value-format/validation-key-label";

test.setTimeout(600000);

describeByDatasource("校验结果查询", () => {
  test("验证格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例", async ({
    page,
  }) => {
    await ensureValueFormatMainBaseline(page);
    const instanceRow = await waitForVisibleTaskRow(page, P0_PASS_SCENARIO.taskName);
    await expect(instanceRow).toContainText(/校验通过/);

    const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
    const ruleCard = getTaskDetailRuleCard(detailDrawer, "格式-json格式校验");

    await expect(ruleCard).toBeVisible({ timeout: 10000 });
    await expect(ruleCard).toContainText("有效性校验");
    await expect(ruleCard).toContainText("格式-json格式校验");
    await expect(ruleCard).toContainText(buildValidationKeyLabelPattern("person-name"));
    await expect(ruleCard).toContainText(buildValidationKeyLabelPattern("person-age"));
    await expect(detailDrawer).toContainText(/校验通过/);
    await expect(detailDrawer.getByRole("button", { name: "查看明细" })).toHaveCount(0);
  });
});
