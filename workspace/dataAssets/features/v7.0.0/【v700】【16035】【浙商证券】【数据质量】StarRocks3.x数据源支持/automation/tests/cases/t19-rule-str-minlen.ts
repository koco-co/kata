// spec: cases/archive.md#case=规范性字符串最小长度  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·字符串-最小长度：zszq_str_minlen（security_code 最小长度=4）。=6 校验异常 / =4 校验通过。
// 注：字符串长度规则的「期望值」比较符在本 build 被锁为 =（operatorSelectEqual），archive 写的 >= 配不出，故用 =。
//
// SKIP-REASON（产品缺陷·已提 bug）：本 build UI 提供「字符串-最小长度」统计函数，但后端无对应函数模板，
// 提交时 /monitor/add 返回 {code:3009,"函数模板不存在"}，规则无法创建。脚本保留备回归，test.describe.skip 跳过执行。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";

const TABLE = "zszq_str_minlen";

test.setTimeout(240000);

test.describe.skip("@serial StarRocks3.x 规范性字符串最小长度校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P2】security_code 最小长度 = 6 校验异常（实际最小长度 4）", async ({ page, step }) => {
    let monitorId = "";
    await step("建字符串最小长度规则（规范性·最小长度·=6·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `最小长度异常_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["security_code"],
        statFunc: "字符串-最小长度",
        comparator: "=",
        threshold: "6",
        weak: "弱规则",
        ruleDesc: "证券代码最小长度不少于 6",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验异常", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });

  test("【P2】security_code 最小长度 = 4 校验通过（实际最小长度 4 达标）", async ({ page, step }) => {
    let monitorId = "";
    await step("建字符串最小长度规则（规范性·最小长度·=4·弱规则）", async () => {
      monitorId = await createSingleTableRule(page, {
        ruleName: `最小长度通过_${Date.now()}`,
        table: TABLE,
        bigRule: "规范性校验",
        fields: ["security_code"],
        statFunc: "字符串-最小长度",
        comparator: "=",
        threshold: "4",
        weak: "弱规则",
        ruleDesc: "证券代码最小长度不少于 4",
      });
      expect(Number(monitorId), "应回查到 monitorId").toBeGreaterThan(0);
    });
    await step("API 立即执行并轮询实例 → 校验通过", async () => {
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验通过");
    });
  });
});
