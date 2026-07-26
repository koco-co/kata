// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C339",
  "title": "验证「数据质量」-「规则任务管理」页新增「抽样检查设置」配置项",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入「监控对象」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "UI CHECK",
      "expected": "「数据预览」下新增「抽样检查设置」配置项"
    }
  ]
} as const;

test.describe("验证「数据质量」-「规则任务管理」页新增「抽样检查设置」配置项", () => {
  test("C339 验证「数据质量」-「规则任务管理」页新增「抽样检查设置」配置项", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
