// spec: cases/archive.md#case=准确性求和  intent: SR-INTENT-2026-06-DQ-SR3X-006  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 准确性·求和：zszq_trade_sum（trade_amount 合计 131000）。=131000 校验通过 / =130000 校验异常。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_sum";

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 准确性求和校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P0】trade_amount 求和 = 131000 校验通过", async ({ page, step }) => {
    let monitorId = "";
    await step("建求和规则（准确性·求和·=131000·强规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `求和通过_${Date.now()}`,
        table: TABLE,
        bigRule: "准确性校验",
        fields: ["trade_amount"],
        statFunc: "求和",
        comparator: "=",
        threshold: "131000",
        weak: "强规则",
        ruleDesc: "交易金额求和校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });

  test("【P0】trade_amount 求和 = 130000 校验异常（实际 131000）", async ({ page, step }) => {
    let monitorId = "";
    await step("建求和规则（准确性·求和·=130000·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `求和异常_${Date.now()}`,
        table: TABLE,
        bigRule: "准确性校验",
        fields: ["trade_amount"],
        statFunc: "求和",
        comparator: "=",
        threshold: "130000",
        weak: "弱规则",
        ruleDesc: "交易金额求和校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });
});
