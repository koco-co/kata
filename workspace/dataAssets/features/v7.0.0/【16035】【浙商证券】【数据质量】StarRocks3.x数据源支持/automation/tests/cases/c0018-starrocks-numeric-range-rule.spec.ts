// spec: cases/archive.md#case=规范性字符串最大长度  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规范性·字符串-最大长度：zszq_str_maxlen（security_code 最大长度=8）。=6 校验异常 / =8 校验通过。
// 注：字符串长度规则的「期望值」比较符在本 build 被锁为 =（operatorSelectEqual），archive 写的 <= 配不出，故用 =。
//
// PRODUCT-BUG（已提 bug）：本 build UI 提供「字符串-最大长度」统计函数，但后端无对应函数模板，提交规则时
// /monitor/add 返回 {code:3009,"函数模板不存在"}，规则无法创建/保存。该用例因此**保存失败、执行不通过**
// ——失败即如实反映产品缺陷，不跳过；后端补函数模板后即应转通过。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  createSingleTableRule,
  deleteRuleByTable,
  expectInstanceStatus,
  pollLatestInstance,
  runRuleNowByApi,
} from "../flows/rule-flow";

const TABLE = "zszq_str_maxlen";

test.describe("@serial 【P1】验证 StarRocks 3.x 数据源规范性校验字符串-最大长度规则校验", () => {
  test.describe.configure({ timeout: 480000 });
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await deleteRuleByTable(page, TABLE);
  });

  test("【P1】security_code 最大长度规则 =6 校验异常 / =8 校验通过", async ({ page, step }) => {
    await step("场景①：security_code 最大长度 = 6 校验异常（实际最大长度 8）", async () => {
      let monitorId = "";
      await step("建字符串最大长度规则（规范性·最大长度·=6·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `最大长度异常_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["security_code"],
          statFunc: "字符串-最大长度",
          comparator: "=",
          threshold: "6",
          weak: "弱规则",
          ruleDesc: "证券代码最大长度不超过 6",
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
    await step("场景②：security_code 最大长度 = 8 校验通过（实际最大长度 8 达标）", async () => {
      let monitorId = "";
      await step("建字符串最大长度规则（规范性·最大长度·=8·弱规则）", async () => {
        monitorId = await createSingleTableRule(page, {
          ruleName: `最大长度通过_${Date.now()}`,
          table: TABLE,
          bigRule: "规范性校验",
          fields: ["security_code"],
          statFunc: "字符串-最大长度",
          comparator: "=",
          threshold: "8",
          weak: "弱规则",
          ruleDesc: "证券代码最大长度不超过 8",
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
