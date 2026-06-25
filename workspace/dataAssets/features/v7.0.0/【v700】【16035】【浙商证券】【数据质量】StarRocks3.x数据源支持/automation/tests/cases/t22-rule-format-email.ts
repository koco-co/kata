// spec: cases/archive.md#case=规范性格式邮箱  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·格式-邮箱：zszq_account_email（email 含 1 条非法邮箱 invalid-email，违规行数=1）。
// Fail: =0（1不满足）；Pass: <=1（无需 DB 写入，1满足阈值<=1）。
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

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 规范性格式邮箱校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】email 格式-邮箱 = 0 校验异常（实际 1 条违规）", async ({ page, step }) => {
    let monitorId = "";
    await step("建格式-邮箱规则（规范性·格式-邮箱·=0·强规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `邮箱格式异常_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["email"],
        statFunc: "格式-邮箱",
        comparator: "=",
        threshold: "0",
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

  test("【P1】email 格式-邮箱 <= 1 校验通过（允许 1 条违规，实际 1 条达标）", async ({ page, step }) => {
    let monitorId = "";
    await step("建格式-邮箱规则（规范性·格式-邮箱·<=1·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `邮箱格式通过_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["email"],
        statFunc: "格式-邮箱",
        comparator: "<=",
        threshold: "1",
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
