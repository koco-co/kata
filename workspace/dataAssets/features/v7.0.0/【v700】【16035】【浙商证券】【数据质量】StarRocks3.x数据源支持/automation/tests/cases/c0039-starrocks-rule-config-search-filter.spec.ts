// spec: cases/archive.md#case=多表比对字符不区分大小写  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 多表比对·字符不区分大小写：zszq_cmp_case_left/right（order_id=1003 security_code 'SH600519' vs 'sh600519'）。
// 仅记录数差异≤0% → 校验异常（大小写不同）。编辑增勾字符不区分大小写 → 校验通过（忽略大小写后一致）。编辑走 UI。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createMultiTableCompareRule,
  editMatchConditionThreshold,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const LEFT = "zszq_cmp_case_left";
const RIGHT = "zszq_cmp_case_right";
const COMBINED = `${LEFT}/${RIGHT}`;

test.describe("@serial 【P1】验证 StarRocks 3.x 数据源多表比对字符不区分大小写匹配条件", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });
  test.afterEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });

  test("【P1】仅记录数差异异常 → 增勾字符不区分大小写 转校验通过", async ({ page, step }) => {
    let monitorId = "";
    await step("建多表比对规则（仅记录数差异≤0%）→ 校验异常（1003 大小写不同）", async () => {
      monitorId = await createMultiTableCompareRule(page, {
        ruleName: `多表字符不区分大小写_${Date.now()}`,
        leftTable: LEFT,
        rightTable: RIGHT,
        primaryKey: "order_id",
        matchConditions: [{ type: "记录数差异", gap: "0" }],
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
    await step("编辑增勾字符不区分大小写 重跑 → 校验通过（忽略大小写后一致）", async () => {
      await editMatchConditionThreshold(page, monitorId, [{ type: "字符不区分大小写" }]);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
