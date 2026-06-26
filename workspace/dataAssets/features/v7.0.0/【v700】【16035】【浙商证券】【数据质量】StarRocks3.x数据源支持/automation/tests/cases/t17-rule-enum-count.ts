// spec: cases/archive.md#case=规范性数值枚举个数  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·数值-枚举个数：zszq_enum_cnt（trade_type 去重后枚举个数=3）。=2 校验异常 / =3 校验通过。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_enum_cnt";

test.setTimeout(480000);

test.describe("@serial StarRocks3.x 规范性数值枚举个数校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】trade_type 枚举个数 =2 校验异常 / =3 校验通过", async ({ page, step }) => {
    await step("场景①：trade_type 枚举个数 = 2 校验异常（实际枚举个数 3）", async () => {
      let monitorId = "";
      await step("建枚举个数规则（规范性·枚举个数·=2·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `枚举个数异常_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["trade_type"],
          statFunc: "数值-枚举个数",
          comparator: "=",
          threshold: "2",
          weak: "弱规则",
          ruleDesc: "交易类型枚举个数应为 2",
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
    await step("场景②：trade_type 枚举个数 = 3 校验通过（实际枚举个数 3）", async () => {
      let monitorId = "";
      await step("建枚举个数规则（规范性·枚举个数·=3·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `枚举个数通过_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["trade_type"],
          statFunc: "数值-枚举个数",
          comparator: "=",
          threshold: "3",
          weak: "弱规则",
          ruleDesc: "交易类型枚举个数应为 3",
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
