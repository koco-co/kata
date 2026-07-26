// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C284",
  "title": "验证「规则配置」-「调度属性页面」-「临时保存」功能正确",
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
      "action": "「监控规则配置」页面添加校验规则，点击「下一步」按钮",
      "expected": "校验规则添加成功，跳转到「调度属性配置」页面"
    },
    {
      "action": "「调度配置」配置如下「调度周期」选择「天」「生效日期」选择「2025-10-21~2125-10-21」「具体时间」选择「00:00」「规则拼接包」 输入「1」「资源组」选择「default」「报告配置」选择「无需生成报告」点击「临时保存」按钮",
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
      "expected": "进入「调度属性页面」，原配置保留成功"
    },
    {
      "action": "编辑 「调度配置」配置如下「调度周期」选择「天」「生效日期」选择「2025-10-21~2025-10-21」「具体时间」选择「12:00」「规则拼接包」 输入「1」「资源组」选择「default」「报告配置」选择「无需生成报告」点击「临时保存」按钮",
      "expected": "编辑规则调度属性成功"
    },
    {
      "action": "点击「临时保存」按钮后，再次编辑查看",
      "expected": "「调度属性」更新正确"
    }
  ]
} as const;

test.describe("验证「规则配置」-「调度属性页面」-「临时保存」功能正确", () => {
  test("C284 验证「规则配置」-「调度属性页面」-「临时保存」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
