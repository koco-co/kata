// spec: cases/archive.md#case=规范性格式身份证号  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·格式-身份证号：zszq_account_idcard（3 行，2 条合法 + 12345 非法）。
// 实测平台格式校验 metric = 「符合格式的合法行数」(生成 SQL: count WHERE id_card REGEXP 合法身份证正则)，
// 即合法数=2，而非违规数。故 >=3 校验异常（期望≥3条合法、实际2，有非法行）；>=2 校验通过（实际合法2达标）。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_account_idcard";

test.describe("@serial 【P1】验证 StarRocks 3.x 数据源规范性校验格式-身份证号规则校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】id_card 格式-身份证号 >=3 校验异常 / >=2 校验通过", async ({ page, step }) => {
    await step("场景①：id_card 格式-身份证号 >= 3 校验异常（合法数 2，有 1 条非法）", async () => {
      let monitorId = "";
      await step("建格式-身份证号规则（规范性·格式-身份证号·>=3·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `身份证格式异常_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["id_card"],
          statFunc: "格式-身份证号",
          comparator: ">=",
          threshold: "3",
          weak: "强规则",
          ruleDesc: "身份证号格式校验",
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
    await step("场景②：id_card 格式-身份证号 >= 2 校验通过（合法数 2 达标）", async () => {
      let monitorId = "";
      await step("建格式-身份证号规则（规范性·格式-身份证号·>=2·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `身份证格式通过_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["id_card"],
          statFunc: "格式-身份证号",
          comparator: ">=",
          threshold: "2",
          weak: "弱规则",
          ruleDesc: "身份证号格式校验",
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
