// spec: cases/archive.md#case=规则任务删除  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规则任务删除：zszq_trade_null 建 1 条规则 → 在规则列表 UI 点「删除」并确认 → 断言规则行从列表移除。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  deleteRuleViaUi,
} from "../flows/rule-flow";

const TABLE = "zszq_trade_null";

test.describe("@serial 【P2】验证 StarRocks 3.x 数据源规则任务删除", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    // 兜底清理：UI 删除若已移除则 cleanup 无操作
    await deleteRuleByTable(page, TABLE);
  });

  test("【P2】规则列表 UI 删除规则后规则行从列表移除", async ({ page, step }) => {
    let monitorId = "";
    await step("建待删除规则（字段级·空值数）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `待删除规则_${Date.now()}`,
        table: TABLE,
        bigRule: "完整性校验",
        ruleLevel: "字段级",
        fields: ["security_name"],
        statFunc: "空值数",
        comparator: "=",
        threshold: "0",
        weak: "强规则",
        ruleDesc: "待删除规则",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });

    await step("在规则列表点「删除」并确认 → 规则行从列表移除", async () => {
      await deleteRuleViaUi(page, monitorId);
    });
  });
});
