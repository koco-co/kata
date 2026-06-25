// spec: cases/archive.md#case=多表比对异常数据五类分类统计  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 多表比对·异常数据五类分类：zszq_cmp_cat_left/right（order_id 为逻辑主键，覆盖五类异常各 1 行）。
// 记录数差异≤0% → 校验异常（存在主键匹配数据不一致/仅左有/仅右有/左右主键为空）。
// 注：五类分类明细需在详情「查看明细」逐类核对，本用例核心断言校验异常状态；五类逐行明细见 handoff 未验证范围。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createMultiTableCompareRule,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const LEFT = "zszq_cmp_cat_left";
const RIGHT = "zszq_cmp_cat_right";
const COMBINED = `${LEFT}/${RIGHT}`;

test.setTimeout(300000);

test.describe("@serial StarRocks3.x 多表比对异常数据分类统计校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });
  test.afterEach(async ({ page }) => {
    await cleanupRulesByTable(page, COMBINED);
  });

  test("【P0】记录数差异校验异常（覆盖五类异常数据）", async ({ page, step }) => {
    let monitorId = "";
    await step("建多表比对规则（记录数差异≤0%）", async () => {
      monitorId = await createMultiTableCompareRule(page, {
        ruleName: `多表异常分类统计_${Date.now()}`,
        leftTable: LEFT,
        rightTable: RIGHT,
        primaryKey: "order_id",
        matchConditions: [{ type: "记录数差异", gap: "0" }],
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("立即执行 → 校验异常（存在主键匹配但数据不一致/仅左有/仅右有/主键为空）", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });
});
