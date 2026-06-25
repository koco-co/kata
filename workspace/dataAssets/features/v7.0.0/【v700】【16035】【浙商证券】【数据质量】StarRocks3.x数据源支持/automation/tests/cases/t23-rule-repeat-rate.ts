// spec: cases/archive.md#case=唯一性重复率  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 唯一性·重复率：zszq_repeat_rate（5行，security_code '600036'重复2行，重复率=40%）。<=0% 校验异常 / <=40% 校验通过。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_repeat_rate";

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 唯一性重复率校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】security_code 重复率 <= 0% 校验异常（实际重复率 40%）", async ({ page, step }) => {
    let monitorId = "";
    await step("建重复率规则（唯一性·重复率·<=0·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `重复率异常_${Date.now()}`,
        table: TABLE,
        bigRule: "唯一性校验",
        fields: ["security_code"],
        statFunc: "重复率",
        comparator: "<=",
        threshold: "0",
        weak: "弱规则",
        ruleDesc: "证券代码重复率校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });

  test("【P1】security_code 重复率 <= 40% 校验通过（实际重复率 40% 达标）", async ({ page, step }) => {
    let monitorId = "";
    await step("建重复率规则（唯一性·重复率·<=40·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `重复率通过_${Date.now()}`,
        table: TABLE,
        bigRule: "唯一性校验",
        fields: ["security_code"],
        statFunc: "重复率",
        comparator: "<=",
        threshold: "40",
        weak: "弱规则",
        ruleDesc: "证券代码重复率校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
