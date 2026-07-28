// spec: cases/archive.md#case=多表比对字段一致性  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 多表比对·字段一致性：zszq_orders_left/right（order_id=1003 trade_amount 88000 vs 99999.99，差 11999.99）。
// 匹配条件 记录数差异≤0% + 数值差异绝对值≤12000 → 校验通过（差 11999.99 在容差内）。
// 编辑把数值差异绝对值容差改 10000 → 重跑校验异常（差 11999.99 超容差，差异 1 行）。编辑走 UI。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createMultiTableCompareRule,
  editMatchConditionThreshold,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const LEFT = "zszq_orders_left";
const RIGHT = "zszq_orders_right";
const COMBINED = `${LEFT}/${RIGHT}`; // 多表比对规则的 tableName 是左/右组合

test.describe("@serial 【P0】验证 StarRocks 3.x 数据源多表比对规则字段一致性校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });
  test.afterEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });

  test("【P0】金额绝对值差异容差 12000 校验通过（差 11999.99 在容差内）", async ({ page, step }) => {
    let monitorId = "";
    await step("建多表比对规则（记录数差异≤0% + 数值差异绝对值≤12000）", async () => {
      monitorId = await createMultiTableCompareRule(page, {
        ruleName: `多表金额一致性_${Date.now()}`,
        leftTable: LEFT,
        rightTable: "zszq_orders_right",
        primaryKey: "order_id",
        matchConditions: [
          { type: "记录数差异", gap: "0" },
          { type: "数值差异绝对值", gap: "12000" },
        ],
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("立即执行 → 校验通过（差 11999.99 ≤ 12000，记录数 3=3）", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
    await step("编辑数值差异绝对值容差改 10000 重跑 → 校验异常（差 11999.99 超容差）", async () => {
      await editMatchConditionThreshold(page, monitorId, [{ type: "数值差异绝对值", gap: "10000" }]);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });
});
