// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C287",
  "title": "验证「规则配置」-「监控规则页面」新增「临时保存」按钮",
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
      "action": "「监控规则」页面UI CHECK",
      "expected": "页面新增「临时保存」按钮"
    }
  ]
} as const;

test.describe("验证「规则配置」-「监控规则页面」新增「临时保存」按钮", () => {
  test("C287 验证「规则配置」-「监控规则页面」新增「临时保存」按钮", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
