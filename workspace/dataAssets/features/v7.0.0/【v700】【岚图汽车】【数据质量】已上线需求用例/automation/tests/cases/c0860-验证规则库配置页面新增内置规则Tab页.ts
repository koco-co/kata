// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0860",
  "title": "验证「规则库配置」页面新增「内置规则」Tab页",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」页面",
      "expected": "进入成功"
    },
    {
      "action": "进入「规则任务管理」-「规则库配置」",
      "expected": "进入成功"
    },
    {
      "action": "查看「规则库配置」页面",
      "expected": "新增「内置规则」Tab页"
    }
  ]
} as const;

test.describe("验证「规则库配置」页面新增「内置规则」Tab页", () => {
  test("C0860 验证「规则库配置」页面新增「内置规则」Tab页", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
