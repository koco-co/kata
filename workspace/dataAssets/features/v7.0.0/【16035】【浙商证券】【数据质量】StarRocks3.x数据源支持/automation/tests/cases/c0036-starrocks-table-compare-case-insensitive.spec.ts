// spec: cases/archive.md#case=规则编辑重跑  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规则编辑重跑：zszq_trade_orders 建表行数>5（校验通过）→ 编辑期望值改 >10 → 重跑（校验异常，表行数 6 不满足 >10）。
// 编辑全程走 UI（不走 API）：点规则列表表名链接 → 右侧规则详情滑窗「规则管理」tab → 规则块底部「编 辑」按钮
// → 改期望值比较符+阈值 → 保 存 → 再 立即执行 重跑。详见 editRuleThreshold/openRuleDetailDrawer。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  editRuleThreshold,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../flows/rule-flow";

const TABLE = "zszq_trade_orders";

test.describe("@serial 【P2】验证 StarRocks 3.x 数据源规则任务编辑与重跑", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P2】编辑期望值 >5 改 >10 重跑由校验通过转校验异常", async ({ page, step }) => {
    // 双执行流程（建规则+执行 → 编辑+重跑）耗时长，测试预算放到 test 内部确保生效（模块级 setTimeout 不稳）。
    test.setTimeout(300000);
    let monitorId = "";
    let baselineId = 0;
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
      const first = await pollLatestInstance(page, monitorId);
      expectInstanceStatus(first, "校验通过");
      // 记下首次实例 id 作为基线：重跑必须读到 id 更大的新实例，避免误判这条旧「校验通过」实例。
      baselineId = Number(first.id);
    });

    await step("编辑期望值改为 >10 并重跑 → 校验异常（表行数 6 不满足 >10）", async () => {
      await editRuleThreshold(page, monitorId, { comparator: ">", threshold: "10" });
      await runRuleNowByApi(page, monitorId);
      const rerun = await pollLatestInstance(page, monitorId, { afterId: baselineId });
      expectInstanceStatus(rerun, "校验异常");
    });
  });
});
