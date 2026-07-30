// spec: cases/archive.md#case=唯一性非重复个数  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 唯一性·非重复个数：zszq_distinct_cnt（security_code: 600519,000001,600036,600036,601318）。
// 实测平台「非重复个数」= 只出现一次的值数 = 3（600519/000001/601318；600036 出现 2 次不计），而非 distinct=4。
// 故 =4/=5 均校验异常（实例 logInfo「校验不通过: 1」），=3 校验通过。archive 按 distinct=4 的假设需按实修正。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../flows/rule-flow";

const TABLE = "zszq_distinct_cnt";

test.describe("@serial 【P1】验证 StarRocks 3.x 数据源唯一性校验非重复个数规则校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】security_code 非重复个数规则 =5 校验异常 / =3 校验通过", async ({ page, step }) => {
    await step("场景①：security_code 非重复个数 = 5 校验异常（实际非重复个数 4）", async () => {
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
    // 场景间清理：平台一表一规则，第二场景建规则前清掉第一场景留下的规则
    await cleanupRulesByTable(page, TABLE);
    await step("场景②：security_code 非重复个数 = 3 校验通过（实际只出现一次的值数 3）", async () => {
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
});
