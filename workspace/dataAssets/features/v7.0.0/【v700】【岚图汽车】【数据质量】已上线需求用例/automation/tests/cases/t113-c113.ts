// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C113",
  "title": "验证「完整性校验」-「字段级」-字段数量限制校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "小于0时提示\"必须选择字段\"，大于10时提示\"最多选择10个字段\""
    },
    {
      "action": "配置「数据源」「数据库」「数据表」，选择【完整性校验】规则",
      "expected": "选择5个可以配置成功"
    },
    {
      "action": "「规则类型」选择「字段级」\n「字段」分别选择0/5/10/15个",
      "expected": "1. 字段数必须>0且<=10"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「字段级」-字段数量限制校验", () => {
  test("C113 验证「完整性校验」-「字段级」-字段数量限制校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
