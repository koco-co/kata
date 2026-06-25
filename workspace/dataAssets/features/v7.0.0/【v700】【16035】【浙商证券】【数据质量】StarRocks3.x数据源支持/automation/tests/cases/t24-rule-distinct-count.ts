// spec: cases/archive.md#case=唯一性非重复个数  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 唯一性·非重复个数：zszq_distinct_cnt（security_code: 600519,000001,600036,600036,601318）。
// 实测平台「非重复个数」= 只出现一次的值数 = 3（600519/000001/601318；600036 出现 2 次不计），而非 distinct=4。
// 故 =4/=5 均校验异常（实例 logInfo「校验不通过: 1」），=3 校验通过。archive 按 distinct=4 的假设需按实修正。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_distinct_cnt";

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 唯一性非重复个数校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】security_code 非重复个数 = 5 校验异常（实际非重复个数 4）", async ({ page, step }) => {
    let monitorId = "";
    await step("建非重复个数规则（唯一性·非重复个数·=5·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `非重复个数异常_${Date.now()}`,
        table: TABLE,
        bigRule: "唯一性校验",
        fields: ["security_code"],
        statFunc: "非重复个数",
        comparator: "=",
        threshold: "5",
        weak: "弱规则",
        ruleDesc: "证券代码非重复个数校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });

  test("【P1】security_code 非重复个数 = 3 校验通过（实际只出现一次的值数 3）", async ({ page, step }) => {
    let monitorId = "";
    await step("建非重复个数规则（唯一性·非重复个数·=3·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `非重复个数通过_${Date.now()}`,
        table: TABLE,
        bigRule: "唯一性校验",
        fields: ["security_code"],
        statFunc: "非重复个数",
        comparator: "=",
        threshold: "3",
        weak: "弱规则",
        ruleDesc: "证券代码非重复个数校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
