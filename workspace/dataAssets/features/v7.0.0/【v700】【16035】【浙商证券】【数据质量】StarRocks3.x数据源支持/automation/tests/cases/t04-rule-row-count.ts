// spec: features/v7.0.0/【v700】【16035】【浙商证券】【数据质量】StarRocks3.x数据源支持/cases/archive.md#case=完整性表级表行数
// intent: SR-INTENT-2026-06-DQ-SR3X-004
// probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 完整性·表级·表行数：建规则→立即执行→任务实例校验通过/异常 双向（zszq_trade_orders 表行数=6）。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_trade_orders";

test.setTimeout(240000);

// 平台「一表一规则」约束：建规则前必须清掉该表已有规则，否则 ① 报「该规则配置已存在」。
// 用 beforeEach/afterEach 的 page fixture（带登录态）做清理；browser.newPage() 无 storageState 鉴权会失败。
test.describe("@serial StarRocks3.x 完整性表行数校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });

  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P0】表行数 > 5 校验通过（表行数 6 达标）", async ({ page, step }) => {
    const ruleName = `行数通过_${Date.now()}`;
    let monitorId = "";

    await step("建表行数规则（表级·表行数·>5·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName,
        table: TABLE,
        bigRule: "完整性校验",
        ruleLevel: "表级",
        statFunc: "表行数",
        comparator: ">",
        threshold: "5",
        weak: "弱规则",
        ruleDesc: "表行数大于5校验",
      });
      expect(Number(monitorId), "应回查到新建规则的 monitorId").toBeGreaterThan(0);
    });

    await step("详情抽屉立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      const inst = await pollLatestInstance(page, monitorId);
      expectInstanceStatus(inst, "校验通过");
    });
  });

  test("【P0】表行数 > 10 校验异常（表行数 6 不达标）", async ({ page, step }) => {
    const ruleName = `行数异常_${Date.now()}`;
    let monitorId = "";

    await step("建表行数规则（表级·表行数·>10·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName,
        table: TABLE,
        bigRule: "完整性校验",
        ruleLevel: "表级",
        statFunc: "表行数",
        comparator: ">",
        threshold: "10",
        weak: "弱规则",
        ruleDesc: "表行数大于10校验",
      });
      expect(Number(monitorId), "应回查到新建规则的 monitorId").toBeGreaterThan(0);
    });

    await step("详情抽屉立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      const inst = await pollLatestInstance(page, monitorId);
      expectInstanceStatus(inst, "校验异常");
    });
  });
});
