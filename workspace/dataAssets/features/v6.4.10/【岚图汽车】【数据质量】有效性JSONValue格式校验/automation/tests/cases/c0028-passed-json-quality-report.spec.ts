// spec: features/validity-json-value-format/archive.md#case=t28-json
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t28","priority":"P1","title":"【P1】验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验通过场景）"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { REPORT_PASS_SCENARIO } from "../fixtures/test-data";
import {
  getQualityReportRuleRow,
  openPreparedQualityReport,
} from "../flows/rule-task-flow";
import { describeByDatasource } from "../fixtures/suite-matrix";

test.setTimeout(600000);

describeByDatasource("数据质量报告", () => {
  test("验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验通过场景）", async ({
    page,
  }) => {
    const detail = await openPreparedQualityReport(page, REPORT_PASS_SCENARIO);
    const ruleRow = getQualityReportRuleRow(page, "格式-json格式校验");
    const detailAction = ruleRow.locator("button, a").filter({ hasText: "查看详情" });

    await expect(detail).toBeVisible({ timeout: 10000 });
    await expect(ruleRow).toBeVisible({ timeout: 10000 });
    await expect(ruleRow).toContainText("有效性校验");
    await expect(ruleRow).toContainText("格式-json格式校验");
    await expect(ruleRow).toContainText(/校验通过/);
    await expect(ruleRow).toContainText("--");
    await expect(ruleRow).toContainText(/meta-version/);
    await expect(ruleRow).toContainText(/value格式要求/);
    await expect(detailAction).toHaveCount(0);
  });
});
