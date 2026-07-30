// spec: cases/archive.md#case=自定义SQL子查询跨表缺失  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 自定义SQL·子查询跨表缺失：zszq_order_join 含 1 条账户(ACC999)在维表 zszq_account_dim 中不存在的孤儿记录。
// 规则 SQL 用 NOT IN 子查询查孤儿明细，期望=0。运行时往维表补插 ACC999 后孤儿消失 → 由校验异常转校验通过。
// 前置数据用 runSr3xSql 直连 SR3.x 自建（自包含、可重入）；运行时数据变更亦走 DB 工具。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../flows/rule-flow";
import { runSr3xSql } from "../fixtures/db";

const TABLE = "zszq_order_join";
// 孤儿明细查询：订单表中 account_no 不在维表的记录
const SQL =
  "SELECT order_id, account_no FROM zszq_order_join WHERE account_no NOT IN (SELECT account_no FROM zszq_account_dim)";

// 前置：重建订单表（含孤儿 ACC999）与维表（仅 ACC001/ACC002），可重入
const SETUP_SQL = `
DROP TABLE IF EXISTS zszq_order_join;
CREATE TABLE zszq_order_join (
  order_id   BIGINT       COMMENT '交易订单ID',
  account_no VARCHAR(20)  COMMENT '账户号'
) ENGINE=OLAP DUPLICATE KEY(order_id)
  DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_order_join VALUES (1001,'ACC001'),(1002,'ACC002'),(1003,'ACC999');
DROP TABLE IF EXISTS zszq_account_dim;
CREATE TABLE zszq_account_dim (
  account_no   VARCHAR(20)  COMMENT '账户号',
  account_name VARCHAR(50)  COMMENT '账户名'
) ENGINE=OLAP DUPLICATE KEY(account_no)
  DISTRIBUTED BY HASH(account_no) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_dim VALUES ('ACC001','张三'),('ACC002','李四');
`;

test.describe("@serial 【P0】验证 StarRocks 3.x 数据源自定义SQL子查询跨表缺失规则校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await runSr3xSql(SETUP_SQL); // 重建前置数据：孤儿 ACC999 存在
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P0】子查询查孤儿明细 = 0：补全维表后由校验异常转校验通过", async ({ page, step }) => {
    let monitorId = "";
    await step("建自定义SQL规则（NOT IN 子查询查孤儿·期望=0·强规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `自定义SQL子查询缺失_${Date.now()}`,
        table: TABLE,
        bigRule: "自定义SQL",
        customSql: SQL,
        comparator: "=",
        threshold: "0",
        weak: "强规则",
        ruleDesc: "自定义SQL查询维表中缺失的订单账户明细",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("立即执行 → 校验异常（孤儿明细 1 行，不满足 = 0）", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
    await step("向维表补插 ACC999 后重跑 → 校验通过（孤儿明细 0 行，满足 = 0）", async () => {
      await runSr3xSql("INSERT INTO zszq_account_dim VALUES ('ACC999','王五')");
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
