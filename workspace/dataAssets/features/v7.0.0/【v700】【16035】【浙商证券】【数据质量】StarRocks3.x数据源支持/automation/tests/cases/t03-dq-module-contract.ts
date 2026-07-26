// spec: cases/archive.md#case=规范性校验数值-枚举范围  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// A562：规范性·数值-枚举范围。zszq_trade_enum（trade_type 1/2/3/1，order_id=1003 的 trade_type=3 不在枚举 {1,2}）。
// 枚举集合即填进「期望值」（固定值，比较符 =，阈值=「1,2」）：期望值 = 1,2 → 1003 越界，校验异常（违规 1 行）；
// 编辑期望值为 1,2,3 → 无越界，校验通过。zszq_trade_enum 表由 _db.ts 运行时建表自包含。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";
import { runSr3xSql } from "../helpers/_db";

const TABLE = "zszq_trade_enum";

test.describe("@serial 【P1】验证 StarRocks 3.x 数据源规范性校验数值-枚举范围规则校验", () => {
  test.beforeEach(async ({ page }) => {
    // 运行时建表（可重入）：trade_type 含 1003=3 越界行
    await runSr3xSql(`
      DROP TABLE IF EXISTS zszq_trade_enum;
      CREATE TABLE zszq_trade_enum (order_id BIGINT, trade_type TINYINT)
      ENGINE=OLAP DUPLICATE KEY(order_id)
      DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
      INSERT INTO zszq_trade_enum VALUES (1001,1),(1002,2),(1003,3),(1004,1);`);
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】期望值枚举 1,2 → 校验异常（1003 越界）/ 补 1,2,3 → 校验通过", async ({ page, step }) => {
    test.setTimeout(300000);

    await step("场景①：数值-枚举范围 期望值=「1,2」→ 校验异常（trade_type=3 越界，违规 1 行）", async () => {
      const monitorId = await createSingleTableRule(page, {
        ruleName: `枚举范围异常_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["trade_type"],
        statFunc: "数值-枚举范围",
        comparator: "=",
        threshold: "1,2",
        weak: "强规则",
        ruleDesc: "交易类型应在枚举 1,2 内",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });

    await cleanupRulesByTable(page, TABLE);

    await step("场景②：数值-枚举范围 期望值=「1,2,3」→ 校验通过（无越界）", async () => {
      const monitorId = await createSingleTableRule(page, {
        ruleName: `枚举范围通过_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["trade_type"],
        statFunc: "数值-枚举范围",
        comparator: "=",
        threshold: "1,2,3",
        weak: "强规则",
        ruleDesc: "交易类型应在枚举 1,2,3 内",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
