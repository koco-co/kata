// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0516",
  "title": "验证同一张表，不同任务名，不同规则，任务创建成功",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」配置「完整性校验」-「表级」-「表行数检测」-「固定值」配置如下：「校验类型」选择「单表」，「规则类型」选择「表级」，「统计函数」 选择「表行数」，「过滤条件」 输入「id < 100」，「校验方法」选择「固定值」，「期望值」选择「>0」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "再次新建监控规则，「规则名称」输入「test_rule1」，「监控规则」-配置「唯一性校验」-「字段id」-「重复值检测」-「重复数，固定值<0」-「过滤条件」 输入「id < 100」，其他内容与步骤2-4保持一致，保存规则",
      "expected": "规则保存成功"
    }
  ]
} as const;

test.describe("验证同一张表，不同任务名，不同规则，任务创建成功", () => {
  test("C0516 验证同一张表，不同任务名，不同规则，任务创建成功", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
