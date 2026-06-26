// spec: cases/archive.md#case=多表比对空值与NULL等价  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 多表比对·空值与NULL等价：zszq_cmp_null_left/right（order_id=1003 security_name '' vs NULL）。
// 仅记录数差异≤0% → 校验异常（空串 vs NULL）。编辑增勾空值与NULL等价 → 校验通过（视为相等）。编辑走 UI。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createMultiTableCompareRule,
  editMatchConditionThreshold,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const LEFT = "zszq_cmp_null_left";
const RIGHT = "zszq_cmp_null_right";
const COMBINED = `${LEFT}/${RIGHT}`;

test.setTimeout(300000);

test.describe("@serial StarRocks3.x 多表比对空值与NULL等价校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });
  test.afterEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });

  test("【P1】仅记录数差异异常 → 增勾空值与NULL等价 转校验通过", async ({ page, step }) => {
    let monitorId = "";
    await step("建多表比对规则（仅记录数差异≤0%）→ 校验异常（1003 空串 vs NULL）", async () => {
      monitorId = await createMultiTableCompareRule(page, {
        ruleName: `多表空值NULL等价_${Date.now()}`,
        leftTable: LEFT,
        rightTable: RIGHT,
        primaryKey: "order_id",
        matchConditions: [{ type: "记录数差异", gap: "0" }],
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
    await step("编辑增勾空值与NULL等价 重跑 → 校验通过（空串与NULL视为相等）", async () => {
      await editMatchConditionThreshold(page, monitorId, [{ type: "空值与NULL等价" }]);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
