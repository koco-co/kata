// spec: cases/archive.md#case=规范性格式手机号  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·格式-手机号：zszq_account_mobile（3 行，2 条合法 + 123456 非法）。
// 实测平台格式校验 metric =「符合格式的合法行数」(生成 SQL: count WHERE mobile REGEXP 合法手机号正则)，
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

const TABLE = "zszq_account_mobile";

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 规范性格式手机号校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】mobile 格式-手机号 >= 3 校验异常（合法数 2，有 1 条非法）", async ({ page, step }) => {
    let monitorId = "";
    await step("建格式-手机号规则（规范性·格式-手机号·>=3·强规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `手机号格式异常_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["mobile"],
        statFunc: "格式-手机号",
        comparator: ">=",
        threshold: "3",
        weak: "强规则",
        ruleDesc: "手机号格式校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });

  test("【P1】mobile 格式-手机号 >= 2 校验通过（合法数 2 达标）", async ({ page, step }) => {
    let monitorId = "";
    await step("建格式-手机号规则（规范性·格式-手机号·>=2·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `手机号格式通过_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["mobile"],
        statFunc: "格式-手机号",
        comparator: ">=",
        threshold: "2",
        weak: "弱规则",
        ruleDesc: "手机号格式校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
