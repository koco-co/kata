// spec: cases/archive.md#case=唯一性非重复占比  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 唯一性·非重复占比：zszq_distinct_rate（5行，只出现一次的值数=3 → 非重复占比=3/5=60%）。
// 同 t24，平台「非重复」按「只出现一次」算（非 distinct）。=100% 校验异常 / >=60% 校验通过。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_distinct_rate";

test.setTimeout(480000);

test.describe("@serial StarRocks3.x 唯一性非重复占比校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】security_code 非重复占比 =100% 校验异常 / >=60% 校验通过", async ({ page, step }) => {
    await step("场景①：security_code 非重复占比 = 100% 校验异常（实际非重复占比 80%）", async () => {
      let monitorId = "";
      await step("建非重复占比规则（唯一性·非重复占比·=100·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `非重复占比异常_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: ["security_code"],
          statFunc: "非重复占比",
          comparator: "=",
          threshold: "100",
          weak: "弱规则",
          ruleDesc: "证券代码非重复占比校验",
        });
        expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
      });
      await step("API 立即执行并轮询实例 → 校验异常", async () => {
        await runRuleNowByApi(page, monitorId);
        expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
      });
    });
    // 场景间清理：平台一表一规则，第二场景建规则前清掉第一场景留下的规则
    await cleanupRulesByTable(page, TABLE);
    await step("场景②：security_code 非重复占比 >= 60% 校验通过（实际非重复占比 60% 达标）", async () => {
      let monitorId = "";
      await step("建非重复占比规则（唯一性·非重复占比·>=60·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `非重复占比通过_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: ["security_code"],
          statFunc: "非重复占比",
          comparator: ">=",
          threshold: "60",
          weak: "弱规则",
          ruleDesc: "证券代码非重复占比校验",
        });
        expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
      });
      await step("API 立即执行并轮询实例 → 校验通过", async () => {
        await runRuleNowByApi(page, monitorId);
        expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
      });
    });
  });
});
