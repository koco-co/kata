// spec: cases/archive.md#case=唯一性重复数  intent: SR-INTENT-2026-06-DQ-SR3X-009  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 唯一性·重复数：zszq_trade_repeat（security_code '600036' 重复）。=0 校验异常 / <=10 校验通过。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_repeat";

test.describe("@serial 【P0】验证 StarRocks 3.x 数据源唯一性校验重复数单字段规则校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P0】security_code 重复数规则 =0 校验异常 / <=10 校验通过", async ({ page, step }) => {
    await step("场景①：security_code 重复数 = 0 校验异常（存在重复值 600036）", async () => {
      let monitorId = "";
      await step("建重复数规则（唯一性·重复数·=0·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `重复数异常_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: ["security_code"],
          statFunc: "重复数",
          comparator: "=",
          threshold: "0",
          weak: "强规则",
          ruleDesc: "证券代码重复数校验",
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
    await step("场景②：security_code 重复数 <= 10 校验通过（重复数在阈值内）", async () => {
      let monitorId = "";
      await step("建重复数规则（唯一性·重复数·<=10·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `重复数通过_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: ["security_code"],
          statFunc: "重复数",
          comparator: "<=",
          threshold: "10",
          weak: "弱规则",
          ruleDesc: "证券代码重复数校验",
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
