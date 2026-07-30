// spec: cases/archive.md#case=任务查询  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 任务查询：产生 1 个校验通过实例(zszq_trade_orders 行数>5) + 1 个校验异常实例(zszq_trade_null 空值数=0)，
// 进任务查询页校验列表壳层 + 两类实例状态经 monitorRecord/pageQuery 真实可查。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectTaskQueryShell } from "../pages/data-quality-page";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../flows/rule-flow";

const PASS_TABLE = "zszq_trade_orders";
const FAIL_TABLE = "zszq_trade_null";

test.describe("@serial 【P0】验证任务查询页查询 StarRocks 3.x 规则任务实例与校验通过、异常状态详情", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, PASS_TABLE);
    await cleanupRulesByTable(page, FAIL_TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, PASS_TABLE);
    await deleteRuleByTable(page, FAIL_TABLE);
  });

  test("【P0】任务查询页可查 StarRocks3.x 规则实例并区分校验通过/校验异常", async ({ page, step }) => {
    let passMonitorId = "";
    let failMonitorId = "";

    await step("产生校验通过实例（zszq_trade_orders 表行数>5）", async () => {
      passMonitorId = await createSingleTableRule(page, {
        ruleName: `任务查询通过_${Date.now()}`,
        table: PASS_TABLE,
        bigRule: "完整性校验",
        ruleLevel: "表级",
        statFunc: "表行数",
        comparator: ">",
        threshold: "5",
        weak: "弱规则",
        ruleDesc: "任务查询-表行数校验",
      });
      expect(Number(passMonitorId), "应回查到通过规则 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, passMonitorId);
      expectInstanceStatus(await pollLatestInstance(page, passMonitorId), "校验通过");
    });

    await step("产生校验异常实例（zszq_trade_null 空值数=0）", async () => {
      failMonitorId = await createSingleTableRule(page, {
        ruleName: `任务查询异常_${Date.now()}`,
        table: FAIL_TABLE,
        bigRule: "完整性校验",
        ruleLevel: "字段级",
        fields: ["security_name"],
        statFunc: "空值数",
        comparator: "=",
        threshold: "0",
        weak: "强规则",
        ruleDesc: "任务查询-空值数校验",
      });
      expect(Number(failMonitorId), "应回查到异常规则 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, failMonitorId);
      expectInstanceStatus(await pollLatestInstance(page, failMonitorId), "校验异常");
    });

    await step("进入任务查询页 → 列表壳层加载（表/任务名称/状态/数据源等列）", async () => {
      await expectTaskQueryShell(page);
    });
  });
});
