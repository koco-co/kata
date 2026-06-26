// spec: cases/archive.md#case=规范性格式邮箱  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·格式-邮箱：zszq_account_email（3 行，2 条合法 + invalid-email 非法）。
// 实测平台格式校验 metric =「符合格式的合法行数」(生成 SQL: count WHERE email REGEXP 合法邮箱正则)，
// 即合法数=2。>=3 校验异常（期望≥3条合法、实际2，有非法行）；>=2 校验通过（实际合法2达标）。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_account_email";

test.setTimeout(480000);

test.describe("@serial StarRocks3.x 规范性格式邮箱校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】email 格式-邮箱 >=3 校验异常 / >=2 校验通过", async ({ page, step }) => {
    await step("场景①：email 格式-邮箱 >= 3 校验异常（合法数 2，有 1 条非法）", async () => {
      let monitorId = "";
      await step("建格式-邮箱规则（规范性·格式-邮箱·>=3·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `邮箱格式异常_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["email"],
          statFunc: "格式-邮箱",
          comparator: ">=",
          threshold: "3",
          weak: "强规则",
          ruleDesc: "邮箱格式校验",
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
    await step("场景②：email 格式-邮箱 >= 2 校验通过（合法数 2 达标）", async () => {
      let monitorId = "";
      await step("建格式-邮箱规则（规范性·格式-邮箱·>=2·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `邮箱格式通过_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["email"],
          statFunc: "格式-邮箱",
          comparator: ">=",
          threshold: "2",
          weak: "弱规则",
          ruleDesc: "邮箱格式校验",
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
