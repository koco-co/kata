// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C286",
  "title": "验证「规则配置」-「监控规则页面」-「临时保存」功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「规则任务管理」按钮",
      "expected": "进入「新建监控规则」页面"
    },
    {
      "action": "点击「新建监控规则」按钮",
      "expected": "进入「监控对象」配置页"
    },
    {
      "action": "「规则名称」 输入 \"test\"「选择数据源」 选择 ${datasource}「选择数据库」选择${database}「选择数据表」选择${table}点击「下一步」按钮",
      "expected": "「监控对象」配置完成，跳转到「监控规则配置」页面"
    },
    {
      "action": "「监控规则配置」页面添加校验规则如下「完整性校验」-「规则类型」选择「字段级」「字段」 选择 「id」「统计函数」选择「空值数」「校验方法」选择「固定值」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「test」",
      "expected": "「监控规则」-「完整性校验规则」配置完成"
    },
    {
      "action": "点击「临时保存」按钮",
      "expected": "退出到「规则任务管理」页面"
    },
    {
      "action": "点击「规则名称-表名」查看规则详情",
      "expected": "中间态规则不支持点击查看规则详情"
    },
    {
      "action": "查看规则「执行周期」「规则状态」「是否关联任务」字段值",
      "expected": "中间态规则当前字段均展示\"--\""
    },
    {
      "action": "选择当前规则，点击「编辑」按钮",
      "expected": "进入「监控规则页面」，原配置保留成功"
    },
    {
      "action": "编辑「监控规则配置」页面已添加校验规则如下「完整性校验」-「规则类型」选择「字段级」「字段」 选择 「name」「统计函数」选择「空值率」「校验方法」选择「固定值」「期望值」选择「<=0%」「强弱规则」选择「强规则」「规则描述」输入「test_v2」",
      "expected": "编辑校验规则成功"
    },
    {
      "action": "点击「临时保存」按钮后，再次编辑查看",
      "expected": "「监控规则」更新正确"
    }
  ]
} as const;

test.describe("验证「规则配置」-「监控规则页面」-「临时保存」功能正确", () => {
  test("C286 验证「规则配置」-「监控规则页面」-「临时保存」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
