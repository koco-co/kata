// spec: cases/archive.md#case=完整性字段级空值率多字段  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 完整性·字段级·空值率·多字段：zszq_multi_null_rate（5行，仅 order_id=1004 两字段同时 NULL，空值率=20%）。
// Fail: <=10%（20%不满足）；Pass: <=20%（20%满足）。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_multi_null_rate";
const FIELDS = ["security_name", "account_no"];

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 完整性字段级空值率多字段校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P2】多字段空值率 <= 10% 校验异常（实际空值率 20%）", async ({ page, step }) => {
    let monitorId = "";
    await step("建多字段空值率规则（字段级·空值率·多字段·<=10·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `多字段空值率异常_${Date.now()}`,
        table: TABLE,
        bigRule: "完整性校验",
        ruleLevel: "字段级",
        fields: FIELDS,
        statFunc: "空值率",
        comparator: "<=",
        threshold: "10",
        weak: "弱规则",
        ruleDesc: "多字段空值率校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });

  test("【P2】多字段空值率 <= 20% 校验通过（实际空值率 20% 达标）", async ({ page, step }) => {
    let monitorId = "";
    await step("建多字段空值率规则（字段级·空值率·多字段·<=20·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `多字段空值率通过_${Date.now()}`,
        table: TABLE,
        bigRule: "完整性校验",
        ruleLevel: "字段级",
        fields: FIELDS,
        statFunc: "空值率",
        comparator: "<=",
        threshold: "20",
        weak: "弱规则",
        ruleDesc: "多字段空值率校验",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
