// spec: cases/archive.md#case=自定义SQL单表  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 自定义SQL·单表：zszq_trade_custom（trade_amount 含 1 行负值，SQL 返回 1 行）。
// Fail: =0（SQL 返回 1 行不满足）；Pass: >=1（无需 DB 写入，1 行满足 >=1）。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_custom";
const SQL = "SELECT order_id, trade_amount FROM zszq_trade_custom WHERE trade_amount < 0";

test.setTimeout(240000);

test.describe("@serial StarRocks3.x 自定义SQL单表校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P0】自定义SQL 负值明细 = 0 校验异常（SQL 返回 1 行负值）", async ({ page, step }) => {
    let monitorId = "";
    await step("建自定义SQL规则（SQL 查负值·期望=0·强规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `自定义SQL异常_${Date.now()}`,
        table: TABLE,
        bigRule: "自定义SQL",
        customSql: SQL,
        comparator: "=",
        threshold: "0",
        weak: "强规则",
        ruleDesc: "自定义SQL查询交易金额负值明细",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });

  test("【P0】自定义SQL 负值明细 >= 1 校验通过（SQL 返回 1 行满足 >=1）", async ({ page, step }) => {
    let monitorId = "";
    await step("建自定义SQL规则（SQL 查负值·期望>=1·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `自定义SQL通过_${Date.now()}`,
        table: TABLE,
        bigRule: "自定义SQL",
        customSql: SQL,
        comparator: ">=",
        threshold: "1",
        weak: "弱规则",
        ruleDesc: "自定义SQL查询交易金额负值明细",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
