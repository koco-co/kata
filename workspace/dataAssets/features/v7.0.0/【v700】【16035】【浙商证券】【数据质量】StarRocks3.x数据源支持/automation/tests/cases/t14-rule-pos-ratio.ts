// spec: cases/archive.md#case=准确性正值比  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 准确性·正值比：zszq_trade_pos（5行，3行为正，正值比=60%）。>=80% 校验异常 / >=60% 校验通过。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_pos";

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 准确性正值比校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】trade_pnl 正值比 >= 80% 校验异常（实际正值比 60%）", async ({ page, step }) => {
    let monitorId = "";
    await step("建正值比规则（准确性·正值比·>=80·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `正值比异常_${Date.now()}`,
        table: TABLE,
        bigRule: "准确性校验",
        fields: ["trade_pnl"],
        statFunc: "正值比",
        comparator: ">=",
        threshold: "80",
        weak: "弱规则",
        ruleDesc: "交易盈亏正值比校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });

  test("【P1】trade_pnl 正值比 >= 60% 校验通过（实际正值比 60% 达标）", async ({ page, step }) => {
    let monitorId = "";
    await step("建正值比规则（准确性·正值比·>=60·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `正值比通过_${Date.now()}`,
        table: TABLE,
        bigRule: "准确性校验",
        fields: ["trade_pnl"],
        statFunc: "正值比",
        comparator: ">=",
        threshold: "60",
        weak: "弱规则",
        ruleDesc: "交易盈亏正值比校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
