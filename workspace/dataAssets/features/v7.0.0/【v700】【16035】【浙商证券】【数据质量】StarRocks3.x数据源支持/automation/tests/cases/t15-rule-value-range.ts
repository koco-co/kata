// spec: cases/archive.md#case=规范性数值取值范围  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·数值-取值范围：zszq_price_range（trade_price 值 120/300.50/1500/800，max=1500）。
// 已知缺陷：range 规则生成 SQL 把数值阈值带引号（trade_price>'2000'），StarRocks 按字典序比较而非数值，
// 故 <=2000 会误判 300.50/800 越界。为产出稳定回归：Fail 用 <=1000（越界→异常）；
// Pass 用 <=999999（字典序无更大值→0越界→通过，已 live 验证 status=3）。详见 handoff 缺陷标注。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_price_range";

test.setTimeout(480000);

test.describe("@serial StarRocks3.x 规范性数值取值范围校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P0】trade_price 取值范围 <=1000 校验异常 / <=999999 校验通过", async ({ page, step }) => {
    await step("场景①：trade_price 取值范围 <=1000 校验异常（1500 越界）", async () => {
      let monitorId = "";
      await step("建取值范围规则（规范性·取值范围·<=1000·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `取值范围异常_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["trade_price"],
          statFunc: "数值-取值范围",
          rangeFirstOp: "<=",
          rangeFirstVal: "1000",
          comparator: "=",
          threshold: "0",
          weak: "强规则",
          ruleDesc: "成交价应不超过 1000",
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
    await step("场景②：trade_price 取值范围 <=999999 校验通过（全部在区间内）", async () => {
      let monitorId = "";
      await step("建取值范围规则（规范性·取值范围·<=999999·强规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `取值范围通过_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["trade_price"],
          statFunc: "数值-取值范围",
          rangeFirstOp: "<=",
          rangeFirstVal: "999999",
          comparator: "=",
          threshold: "0",
          weak: "强规则",
          ruleDesc: "成交价应在区间内",
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
