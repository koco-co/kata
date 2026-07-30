// spec: cases/archive.md#case=唯一性重复数多字段  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 唯一性·重复数·多字段：zszq_repeat_multi（(security_code,account_no) 联合 1 组重复，重复数=1）。
// Fail: =0（1不满足）；Pass: <=10（无需 DB 写入，1满足 <=10）。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../flows/rule-flow";

const TABLE = "zszq_repeat_multi";
const FIELDS = ["security_code", "account_no"];

test.describe("@serial 【P2】验证 StarRocks 3.x 数据源唯一性校验重复数多字段规则校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P2】联合重复数规则 =0 校验异常 / <=10 校验通过", async ({ page, step }) => {
    await step("场景①：联合重复数 = 0 校验异常（实际 1 组联合重复）", async () => {
      let monitorId = "";
      await step("建联合重复数规则（唯一性·重复数·多字段·=0·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `联合重复数异常_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: FIELDS,
          statFunc: "重复数",
          comparator: "=",
          threshold: "0",
          weak: "强规则",
          ruleDesc: "证券代码与账户号联合重复数校验",
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
    await step("场景②：联合重复数 <= 10 校验通过（实际 1 满足 <=10）", async () => {
      let monitorId = "";
      await step("建联合重复数规则（唯一性·重复数·多字段·<=10·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `联合重复数通过_${Date.now()}`,
          table: TABLE,
          bigRule: "唯一性校验",
          fields: FIELDS,
          statFunc: "重复数",
          comparator: "<=",
          threshold: "10",
          weak: "弱规则",
          ruleDesc: "证券代码与账户号联合重复数校验",
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
