// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C272",
  "title": "验证「内置规则」-「唯一性」相关规则均未开启时，「监控规则」模块展示正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入页面成功"
    },
    {
      "action": "将所有唯一性相关的规则均关闭",
      "expected": "关闭成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "鼠标hover「添加规则」按钮处",
      "expected": "不展示「唯一性校验」选项"
    }
  ]
} as const;

test.describe("验证「内置规则」-「唯一性」相关规则均未开启时，「监控规则」模块展示正确", () => {
  test("C272 验证「内置规则」-「唯一性」相关规则均未开启时，「监控规则」模块展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
