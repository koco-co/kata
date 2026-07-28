// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1065",
  "title": "验证不同项目的「数据质量-总览」页面展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "选择项目test1，查看【总览】页面",
      "expected": "页面详情展示正确"
    },
    {
      "action": "切换项目为项目test2，查看【总览】页面",
      "expected": "页面详情正确更新，展示正确"
    }
  ]
} as const;

test.describe("验证不同项目的「数据质量-总览」页面展示正确", () => {
  test("C1065 验证不同项目的「数据质量-总览」页面展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
