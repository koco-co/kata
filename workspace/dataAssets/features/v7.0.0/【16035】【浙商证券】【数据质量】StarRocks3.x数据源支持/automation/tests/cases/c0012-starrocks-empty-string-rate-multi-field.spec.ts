// spec: cases/archive.md#case=准确性负值比  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 准确性·负值比：zszq_trade_neg（5行，2行为负，负值比=40%）。<=0% 校验异常 / <=40% 校验通过。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../flows/rule-flow";

const TABLE = "zszq_trade_neg";

test.describe("@serial 【P1】验证 StarRocks 3.x 数据源准确性校验负值比规则校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】trade_pnl 负值比 <=0% 校验异常 / <=40% 校验通过", async ({ page, step }) => {
    await step("场景①：trade_pnl 负值比 <= 0% 校验异常（实际负值比 40%）", async () => {
      let monitorId = "";
      await step("建负值比规则（准确性·负值比·<=0·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `负值比异常_${Date.now()}`,
          table: TABLE,
          bigRule: "准确性校验",
          fields: ["trade_pnl"],
          statFunc: "负值比",
          comparator: "<=",
          threshold: "0",
          weak: "强规则",
          ruleDesc: "交易盈亏负值比校验",
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
    await step("场景②：trade_pnl 负值比 <= 40% 校验通过（实际负值比 40% 达标）", async () => {
      let monitorId = "";
      await step("建负值比规则（准确性·负值比·<=40·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `负值比通过_${Date.now()}`,
          table: TABLE,
          bigRule: "准确性校验",
          fields: ["trade_pnl"],
          statFunc: "负值比",
          comparator: "<=",
          threshold: "40",
          weak: "弱规则",
          ruleDesc: "交易盈亏负值比校验",
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
