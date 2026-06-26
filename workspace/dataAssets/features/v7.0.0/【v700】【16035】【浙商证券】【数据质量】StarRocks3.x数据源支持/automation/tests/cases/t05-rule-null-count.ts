// spec: cases/archive.md#case=完整性字段级空值数  intent: SR-INTENT-2026-06-DQ-SR3X-005  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 完整性·字段级·空值数：zszq_trade_null（security_name 含 1 个 NULL）。=0 校验异常 / <=1 校验通过。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_null";

test.setTimeout(480000);

test.describe("@serial StarRocks3.x 完整性字段级空值数校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P0】security_name 空值数规则 =0 校验异常 / <=1 校验通过", async ({ page, step }) => {
    await step("场景①：security_name 空值数 = 0 校验异常（实际 1 个空值）", async () => {
      let monitorId = "";
      await step("建空值数规则（字段级·空值数·=0·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `空值数异常_${Date.now()}`,
          table: TABLE,
          bigRule: "完整性校验",
          ruleLevel: "字段级",
          fields: ["security_name"],
          statFunc: "空值数",
          comparator: "=",
          threshold: "0",
          weak: "强规则",
          ruleDesc: "证券名称空值数校验",
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
    await step("场景②：security_name 空值数 <= 1 校验通过（实际 1 个空值达标）", async () => {
      let monitorId = "";
      await step("建空值数规则（字段级·空值数·<=1·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `空值数通过_${Date.now()}`,
          table: TABLE,
          bigRule: "完整性校验",
          ruleLevel: "字段级",
          fields: ["security_name"],
          statFunc: "空值数",
          comparator: "<=",
          threshold: "1",
          weak: "弱规则",
          ruleDesc: "证券名称空值数校验",
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
