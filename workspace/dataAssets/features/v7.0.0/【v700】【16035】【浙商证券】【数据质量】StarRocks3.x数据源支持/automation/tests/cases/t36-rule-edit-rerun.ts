// spec: cases/archive.md#case=规则编辑重跑  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规则编辑重跑：zszq_trade_orders 建表行数>5（校验通过）→ 编辑期望值改 >10 → 重跑（校验异常，表行数 6 不满足 >10）。
// 编辑全程走 UI（不走 API）：点规则列表表名链接 → 右侧规则详情滑窗「规则管理」tab → 规则块底部「编 辑」按钮
// → 改期望值比较符+阈值 → 保 存 → 再 立即执行 重跑。详见 editRuleThreshold/openRuleDetailDrawer。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  editRuleThreshold,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_orders";

test.setTimeout(300000);

test.describe("@serial StarRocks3.x 规则任务编辑与重跑", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P2】编辑期望值 >5 改 >10 重跑由校验通过转校验异常", async ({ page, step }) => {
    let monitorId = "";
    await step("建表行数规则（>5）并执行 → 校验通过", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `编辑重跑_${Date.now()}`,
        table: TABLE,
        bigRule: "完整性校验",
        ruleLevel: "表级",
        statFunc: "表行数",
        comparator: ">",
        threshold: "5",
        weak: "弱规则",
        ruleDesc: "编辑重跑-表行数校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });

    await step("编辑期望值改为 >10 并重跑 → 校验异常（表行数 6 不满足 >10）", async () => {
      await editRuleThreshold(page, monitorId, { comparator: ">", threshold: "10" });
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });
});
