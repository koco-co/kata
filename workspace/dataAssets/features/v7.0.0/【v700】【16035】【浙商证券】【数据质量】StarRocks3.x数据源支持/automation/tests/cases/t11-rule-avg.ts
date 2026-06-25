// spec: cases/archive.md#case=准确性求平均  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 准确性·求平均：zszq_trade_avg（trade_amount 平均值=200）。=200 校验通过 / =250 校验异常。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_avg";

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 准确性求平均校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】trade_amount 求平均 = 200 校验通过（实际均值 200）", async ({ page, step }) => {
    let monitorId = "";
    await step("建求平均规则（准确性·求平均·=200·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `求平均通过_${Date.now()}`,
        table: TABLE,
        bigRule: "准确性校验",
        fields: ["trade_amount"],
        statFunc: "求平均",
        comparator: "=",
        threshold: "200",
        weak: "弱规则",
        ruleDesc: "交易金额求平均校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });

  test("【P1】trade_amount 求平均 = 250 校验异常（实际均值 200）", async ({ page, step }) => {
    let monitorId = "";
    await step("建求平均规则（准确性·求平均·=250·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `求平均异常_${Date.now()}`,
        table: TABLE,
        bigRule: "准确性校验",
        fields: ["trade_amount"],
        statFunc: "求平均",
        comparator: "=",
        threshold: "250",
        weak: "弱规则",
        ruleDesc: "交易金额求平均校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });
});
