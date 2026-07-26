// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C859",
  "title": "验证「规则库配置」-「内置规则」页面UI展示正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「内置规则」按钮",
      "expected": "默认进入「内置规则」页面"
    },
    {
      "action": "UI CHECK",
      "expected": "1. 展示「规则名称」搜索框2. 展示列「规则名称、规则解释、规则分类、关联范围、关联规则数、规则状态、规则描述」3. 展示按钮「导出规则库、分页器」4. 展示条件筛选框「规则分类、关联范围、规则状态」"
    }
  ]
} as const;

test.describe("验证「规则库配置」-「内置规则」页面UI展示正确", () => {
  test("C859 验证「规则库配置」-「内置规则」页面UI展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
