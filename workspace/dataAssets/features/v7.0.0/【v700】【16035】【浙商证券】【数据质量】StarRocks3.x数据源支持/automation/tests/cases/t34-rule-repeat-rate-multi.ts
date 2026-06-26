// spec: cases/archive.md#case=唯一性重复率多字段  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 唯一性·重复率·多字段：zszq_repeat_rate_multi（5行，(security_code,account_no) 联合 2 行重复，重复率=40%）。
// Fail: <=0%（40%不满足）；Pass: <=40%（40%满足）。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_repeat_rate_multi";
const FIELDS = ["security_code", "account_no"];

test.setTimeout(480000);

test.describe("@serial StarRocks3.x 唯一性重复率多字段校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P2】联合重复率规则 <=0% 校验异常 / <=40% 校验通过（实际联合重复率 40%）", async ({ page, step }) => {
    await step("场景①：联合重复率 <= 0% 校验异常（实际联合重复率 40%）", async () => {
      let monitorId = "";
      await step("建联合重复率规则（唯一性·重复率·多字段·<=0·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `联合重复率异常_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: FIELDS,
          statFunc: "重复率",
          comparator: "<=",
          threshold: "0",
          weak: "弱规则",
          ruleDesc: "证券代码与账户号联合重复率校验",
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
    await step("场景②：联合重复率 <= 40% 校验通过（实际联合重复率 40% 达标）", async () => {
      let monitorId = "";
      await step("建联合重复率规则（唯一性·重复率·多字段·<=40·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `联合重复率通过_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: FIELDS,
          statFunc: "重复率",
          comparator: "<=",
          threshold: "40",
          weak: "弱规则",
          ruleDesc: "证券代码与账户号联合重复率校验",
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
