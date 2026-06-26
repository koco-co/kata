// spec: cases/archive.md#case=完整性字段级空串数  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 完整性·字段级·空串数：zszq_trade_blank（security_name 含 1 个空字符串）。
// Fail: =0（1不满足）；Pass: <=1（1满足）。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_blank";

test.setTimeout(480000);

test.describe("@serial StarRocks3.x 完整性字段级空串数校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】security_name 空串数 =0 校验异常 / <=1 校验通过", async ({ page, step }) => {
    await step("场景①：security_name 空串数 = 0 校验异常（实际 1 个空串）", async () => {
      let monitorId = "";
      await step("建空串数规则（字段级·空串数·=0·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `空串数异常_${Date.now()}`,
          table: TABLE,
          bigRule: "完整性校验",
          ruleLevel: "字段级",
          fields: ["security_name"],
          statFunc: "空串数",
          comparator: "=",
          threshold: "0",
          weak: "强规则",
          ruleDesc: "证券名称空串数校验",
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
    await step("场景②：security_name 空串数 <= 1 校验通过（实际 1 个空串达标）", async () => {
      let monitorId = "";
      await step("建空串数规则（字段级·空串数·<=1·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `空串数通过_${Date.now()}`,
          table: TABLE,
          bigRule: "完整性校验",
          ruleLevel: "字段级",
          fields: ["security_name"],
          statFunc: "空串数",
          comparator: "<=",
          threshold: "1",
          weak: "弱规则",
          ruleDesc: "证券名称空串数校验",
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
