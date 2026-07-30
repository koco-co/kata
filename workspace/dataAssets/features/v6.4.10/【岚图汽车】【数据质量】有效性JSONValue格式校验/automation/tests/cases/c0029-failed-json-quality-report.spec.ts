// spec: features/validity-json-value-format/archive.md#case=t29-json
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t29","priority":"P1","title":"【P1】验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验不通过场景）"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { REPORT_FAIL_SCENARIO } from "../fixtures/test-data";
import {
  getQualityReportRuleRow,
  openPreparedQualityReport,
  openQualityReportRuleDetail,
} from "../flows/rule-task-flow";
import { describeByDatasource } from "../fixtures/suite-matrix";

test.setTimeout(600000);

describeByDatasource("数据质量报告", () => {
  test("验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验不通过场景）", async ({
    page,
  }) => {
    const detail = await openPreparedQualityReport(page, REPORT_FAIL_SCENARIO);
    const ruleRow = getQualityReportRuleRow(page, "格式-json格式校验");
    const detailAction = ruleRow.locator("button, a").filter({ hasText: "查看详情" }).first();

    await expect(detail).toBeVisible({ timeout: 10000 });
    await expect(ruleRow).toBeVisible({ timeout: 10000 });
    await expect(ruleRow).toContainText("有效性校验");
    await expect(ruleRow).toContainText("格式-json格式校验");
    await expect(ruleRow).toContainText(/校验不通过|校验未通过/);
    await expect(ruleRow).toContainText(/key对应value格式校验未通过|value格式校验未通过/);
    await expect(ruleRow).toContainText(/log-level.*log-code|log-level;log-code/);
    await expect(detailAction).toBeVisible({ timeout: 5000 });

    const dataDrawer = await openQualityReportRuleDetail(page, ruleRow);
    await expect(dataDrawer.getByRole("button", { name: "下载明细" })).toBeVisible({
      timeout: 5000,
    });
  });
});
