// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0856",
  "title": "验证「内置规则」页面分页器功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击分页器",
      "expected": "展示10/20/50/100条/页"
    },
    {
      "action": "分别选择10/20/50/100",
      "expected": "对应页面展示10/20/50/100条/页"
    },
    {
      "action": "点击<按钮",
      "expected": "跳转到上一页"
    },
    {
      "action": "点击>按钮",
      "expected": "跳转到下一页"
    },
    {
      "action": "搜索「规则」，然后分页",
      "expected": "搜索后分页跳转等功能正常"
    }
  ]
} as const;

test.describe("验证「内置规则」页面分页器功能正确", () => {
  test("C0856 验证「内置规则」页面分页器功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
